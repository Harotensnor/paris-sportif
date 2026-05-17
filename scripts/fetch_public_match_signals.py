#!/usr/bin/env python3
"""Fetch public context signals for upcoming Winamax matches.

This script is deliberately conservative:
- Winamax remains the only odds source.
- Public web data is used only as context/evidence.
- Missing or uncertain data is marked as missing, never invented.

The output sidecar is consumed by patch_public_match_signals.py.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

try:
    from scripts._data_io import load_data_js, write_text_atomic
except ModuleNotFoundError:  # pragma: no cover - direct script execution
    from _data_io import load_data_js, write_text_atomic


ROOT = Path(__file__).resolve().parent.parent
OUT_PATH = ROOT / "public_match_signals.json"
CACHE_PATH = ROOT / "public_match_signals_cache.json"
USER_AGENT = "ParisSportifDesktop/4.1 public-signals (local Winamax assistant)"
TEAM_TTL_SECONDS = 7 * 24 * 3600
EVENT_TTL_SECONDS = 4 * 3600
MISSING_TTL_SECONDS = 3600
SOURCE_BACKOFF_UNTIL: dict[str, float] = {}
SPORT_HINTS = {
    "football": ("football club", "association football", "soccer", "football team", "sports club"),
    "soccer": ("football club", "association football", "soccer", "football team", "sports club"),
    "basketball": ("basketball team", "basketball club", "nba", "euroleague"),
    "baseball": ("baseball team", "mlb", "major league baseball"),
    "hockey": ("ice hockey team", "nhl", "hockey club"),
    "tennis": ("tennis player", "professional tennis"),
    "nfl": ("american football team", "national football league"),
    "rugby": ("rugby", "rugby union"),
}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        text = str(value).replace("Z", "+00:00")
        return datetime.fromisoformat(text).astimezone(timezone.utc)
    except Exception:
        return None


def norm(value: Any) -> str:
    text = str(value or "").lower()
    text = re.sub(r"[\u2019']", "", text)
    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"\b(fc|afc|cf|sc|club|the|women|wfc)\b", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def compact_text(value: Any, limit: int = 260) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def form_summary(value: Any) -> str:
    letters = [char.upper() for char in str(value or "") if char.upper() in {"W", "D", "L"}]
    if not letters:
        return ""
    wins = letters.count("W")
    draws = letters.count("D")
    losses = letters.count("L")
    parts = []
    if wins:
        parts.append(f"{wins} victoire{'s' if wins > 1 else ''}")
    if draws:
        parts.append(f"{draws} nul{'s' if draws > 1 else ''}")
    if losses:
        parts.append(f"{losses} défaite{'s' if losses > 1 else ''}")
    return ", ".join(parts)


def event_rows(data: dict[str, Any], horizon_days: int, include_past_minutes: int) -> list[dict[str, Any]]:
    now = utc_now()
    min_dt = now - timedelta(minutes=include_past_minutes)
    max_dt = now + timedelta(days=horizon_days)
    rows: list[dict[str, Any]] = []
    for day in (data.get("days") or {}).values():
        events = day if isinstance(day, list) else day.get("events", []) if isinstance(day, dict) else []
        for event in events:
            if not isinstance(event, dict):
                continue
            if not (event.get("winamax") or {}).get("available"):
                continue
            kickoff = parse_dt(event.get("date"))
            if not kickoff or kickoff < min_dt or kickoff > max_dt:
                continue
            if event.get("completed") or "FULL_TIME" in str(event.get("status") or ""):
                continue
            rows.append(event)
    rows.sort(key=lambda item: parse_dt(item.get("date")) or datetime.max.replace(tzinfo=timezone.utc))
    return rows


def load_cache() -> dict[str, Any]:
    if not CACHE_PATH.exists():
        return {"version": 1, "teams": {}}
    try:
        cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        if not isinstance(cache, dict):
            return {"version": 1, "teams": {}}
        cache.setdefault("version", 1)
        cache.setdefault("teams", {})
        return cache
    except Exception:
        return {"version": 1, "teams": {}}


def save_cache(cache: dict[str, Any]) -> None:
    cache["updated_at"] = iso_now()
    write_text_atomic(CACHE_PATH, json.dumps(cache, ensure_ascii=False, indent=2) + "\n")


def cached_team(cache: dict[str, Any], key: str) -> dict[str, Any] | None:
    item = (cache.get("teams") or {}).get(key)
    if not isinstance(item, dict):
        return None
    fetched_at = parse_dt(item.get("fetched_at"))
    ttl = MISSING_TTL_SECONDS if item.get("record", {}).get("status") == "missing" else TEAM_TTL_SECONDS
    if fetched_at and (utc_now() - fetched_at).total_seconds() < ttl:
        record = item.get("record")
        return record if isinstance(record, dict) else None
    return None


def set_cached_team(cache: dict[str, Any], key: str, record: dict[str, Any]) -> None:
    cache.setdefault("teams", {})[key] = {"fetched_at": iso_now(), "record": record}


def http_json(url: str, timeout: int = 12) -> dict[str, Any] | None:
    host = urllib.parse.urlparse(url).netloc
    if SOURCE_BACKOFF_UNTIL.get(host, 0) > time.time():
        return None
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            if response.status >= 400:
                return None
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 429:
            retry_after = exc.headers.get("Retry-After")
            delay = int(retry_after) if str(retry_after or "").isdigit() else 600
            SOURCE_BACKOFF_UNTIL[host] = time.time() + max(60, min(delay, 900))
        return None
    except Exception:
        return None


def wikidata_search(name: str, sport: str) -> dict[str, Any] | None:
    query = f"{name} {sport}".strip() if sport else name
    params = urllib.parse.urlencode(
        {
            "action": "wbsearchentities",
            "search": query,
            "language": "en",
            "uselang": "en",
            "format": "json",
            "limit": "6",
        }
    )
    data = http_json(f"https://www.wikidata.org/w/api.php?{params}")
    results = data.get("search") if isinstance(data, dict) else None
    if not isinstance(results, list):
        return None
    target = norm(name)
    hints = SPORT_HINTS.get(str(sport or "").lower(), ())
    best: tuple[float, dict[str, Any]] | None = None
    for result in results:
        label = result.get("label") or ""
        aliases = result.get("aliases") or []
        description = str(result.get("description") or "").lower()
        candidate_names = [label, *aliases]
        name_score = 0.35
        if any(norm(candidate) == target for candidate in candidate_names):
            name_score = 0.75
        elif target and any(target in norm(candidate) or norm(candidate) in target for candidate in candidate_names):
            name_score = 0.55
        hint_score = 0.18 if hints and any(hint in description for hint in hints) else 0.0
        score = name_score + hint_score
        if not best or score > best[0]:
            best = (score, result)
    if not best or best[0] < 0.50:
        return None
    out = dict(best[1])
    out["confidence"] = round(best[0], 2)
    return out


def entity_json(qid: str) -> dict[str, Any] | None:
    if not qid or not re.match(r"^Q\d+$", qid):
        return None
    data = http_json(f"https://www.wikidata.org/wiki/Special:EntityData/{qid}.json")
    entity = (((data or {}).get("entities") or {}).get(qid))
    return entity if isinstance(entity, dict) else None


def label_for_entity(entity: dict[str, Any] | None) -> str:
    labels = (entity or {}).get("labels") or {}
    for lang in ("fr", "en"):
        value = ((labels.get(lang) or {}).get("value"))
        if value:
            return str(value)
    return ""


def description_for_entity(entity: dict[str, Any] | None) -> str:
    descriptions = (entity or {}).get("descriptions") or {}
    for lang in ("fr", "en"):
        value = ((descriptions.get(lang) or {}).get("value"))
        if value:
            return str(value)
    return ""


def claim_value_id(claim: dict[str, Any]) -> str:
    try:
        value = claim["mainsnak"]["datavalue"]["value"]
        if isinstance(value, dict) and value.get("id"):
            return str(value["id"])
    except Exception:
        return ""
    return ""


def qualifier_time(claim: dict[str, Any], prop: str) -> str:
    qualifiers = claim.get("qualifiers") or {}
    items = qualifiers.get(prop) or []
    if not items:
        return ""
    try:
        return str(items[0]["datavalue"]["value"]["time"]).lstrip("+")
    except Exception:
        return ""


def current_head_coach(entity: dict[str, Any] | None) -> dict[str, Any] | None:
    claims = ((entity or {}).get("claims") or {}).get("P286") or []
    if not isinstance(claims, list) or not claims:
        return None
    active = []
    for claim in claims:
        if not isinstance(claim, dict):
            continue
        if qualifier_time(claim, "P582"):
            continue
        qid = claim_value_id(claim)
        if qid:
            active.append((0 if claim.get("rank") == "preferred" else 1, claim, qid))
    if not active:
        return None
    active.sort(key=lambda item: item[0])
    claim, qid = active[0][1], active[0][2]
    coach_entity = entity_json(qid)
    name = label_for_entity(coach_entity)
    if not name:
        return None
    return {
        "name": name,
        "entityId": qid,
        "source": f"https://www.wikidata.org/wiki/{qid}",
        "startDate": qualifier_time(claim, "P580")[:10],
        "confidence": "confirmed_public_property",
    }


def wiki_title_from_entity(entity: dict[str, Any] | None) -> tuple[str, str]:
    sitelinks = (entity or {}).get("sitelinks") or {}
    for key, lang in (("frwiki", "fr"), ("enwiki", "en")):
        title = ((sitelinks.get(key) or {}).get("title"))
        if title:
            return str(title), lang
    return "", ""


def wikipedia_extract(title: str, lang: str) -> dict[str, Any] | None:
    if not title:
        return None
    host = f"{lang or 'en'}.wikipedia.org"
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "prop": "extracts|pageimages|info",
            "exintro": "1",
            "explaintext": "1",
            "piprop": "thumbnail",
            "pithumbsize": "320",
            "inprop": "url",
            "redirects": "1",
            "titles": title,
            "format": "json",
        }
    )
    data = http_json(f"https://{host}/w/api.php?{params}")
    pages = (((data or {}).get("query") or {}).get("pages") or {})
    if not isinstance(pages, dict):
        return None
    page = next(iter(pages.values()), None)
    if not isinstance(page, dict) or page.get("missing") is not None:
        return None
    return {
        "title": page.get("title") or title,
        "url": page.get("fullurl") or f"https://{host}/wiki/{urllib.parse.quote(title.replace(' ', '_'))}",
        "extract": compact_text(page.get("extract") or "", 360),
        "thumbnail": ((page.get("thumbnail") or {}).get("source")),
        "source": host,
    }


def wikipedia_search_title(name: str, sport: str) -> tuple[str, str, float]:
    host = "en.wikipedia.org"
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "list": "search",
            "srsearch": f"{name} {sport}".strip(),
            "srlimit": "6",
            "format": "json",
        }
    )
    data = http_json(f"https://{host}/w/api.php?{params}")
    results = (((data or {}).get("query") or {}).get("search") or [])
    if not isinstance(results, list):
        return "", "", 0.0
    target = norm(name)
    hints = SPORT_HINTS.get(str(sport or "").lower(), ())
    best: tuple[float, str, str] | None = None
    for result in results:
        title = str(result.get("title") or "")
        snippet = re.sub(r"<.*?>", " ", str(result.get("snippet") or "")).lower()
        title_norm = norm(title)
        score = 0.35
        if title_norm == target:
            score = 0.78
        elif target and (target in title_norm or title_norm in target):
            score = 0.58
        if hints and any(hint in snippet for hint in hints):
            score += 0.12
        if not best or score > best[0]:
            best = (score, title, snippet)
    if not best or best[0] < 0.50:
        return "", "", 0.0
    return best[1], "en", round(best[0], 2)


def tactical_from_text(text: str, sport: str) -> dict[str, Any]:
    lower = text.lower()
    tags: list[str] = []
    if any(word in lower for word in ("pressing", "press", "gegenpress")):
        tags.append("pressing")
    if any(word in lower for word in ("possession", "passing", "tiki")):
        tags.append("possession")
    if any(word in lower for word in ("counter-attack", "counter attack", "transition")):
        tags.append("transition")
    if any(word in lower for word in ("defensive", "defence", "defense", "bloc", "low block")):
        tags.append("bloc défensif")
    if any(word in lower for word in ("attacking", "offensive", "goal scoring")):
        tags.append("offensif")
    if "tennis" in sport.lower():
        if any(word in lower for word in ("clay", "terre battue")):
            tags.append("terre battue")
        if any(word in lower for word in ("grass", "gazon")):
            tags.append("gazon")
        if any(word in lower for word in ("hard court", "dur")):
            tags.append("dur")
    if not tags:
        return {
            "style": "profil public vérifié",
            "read": "La source publique confirme l’identité du concurrent, mais ne donne pas assez d’éléments tactiques pour conclure.",
            "tags": [],
            "source": "public_profile",
        }
    unique = list(dict.fromkeys(tags))[:3]
    return {
        "style": " / ".join(unique),
        "read": f"Indice public détecté : {', '.join(unique)}. À croiser avec la compo et les stats locales avant de miser.",
        "tags": unique,
        "source": "wikipedia_extract",
    }


def source_record(label: str, url: str, status: str = "ok", detail: str = "") -> dict[str, Any]:
    return {"label": label, "url": url, "status": status, "detail": detail, "checkedAt": iso_now()}


def espn_public_fallback(name: str, sport: str, competitor: dict[str, Any] | None) -> dict[str, Any] | None:
    competitor = competitor or {}
    if not competitor.get("id") and not competitor.get("logo") and not competitor.get("records"):
        return None
    query = urllib.parse.quote_plus(name)
    form = form_summary(competitor.get("team_form_l5") or competitor.get("form") or competitor.get("form10"))
    record = ""
    records = competitor.get("records") if isinstance(competitor.get("records"), list) else []
    if records:
        record = str((records[0] or {}).get("summary") or "")
    bits = [part for part in [record and f"bilan {record}", form and f"forme récente {form}"] if part]
    extract = " · ".join(bits) or "Profil public issu du flux sportif déjà récupéré."
    return {
        "name": name,
        "status": "ok",
        "label": name,
        "description": compact_text(extract, 220),
        "signals": [f"Source publique ESPN: {extract}"],
        "sources": [source_record("ESPN public", f"https://www.espn.com/search/_/q/{query}", "ok", "profil public issu du snapshot internet")],
        "profile": {
            "title": name,
            "url": f"https://www.espn.com/search/_/q/{query}",
            "extract": compact_text(extract, 320),
            "thumbnail": competitor.get("logo") or "",
            "source": "espn.com",
        },
        "coach": None,
        "tactical": {
            "style": "profil public sportif",
            "read": "Le flux public confirme l'équipe et sa dynamique récente, sans coach/tactique confirmé par source ouverte.",
            "tags": [],
            "source": "espn_snapshot",
        },
        "quality": 42 if bits else 32,
        "fetchedAt": iso_now(),
    }


def enrich_entity(name: str, sport: str, cache: dict[str, Any], sleep_sec: float, competitor: dict[str, Any] | None = None) -> dict[str, Any]:
    key = f"{sport.lower()}::{norm(name)}"
    cached = cached_team(cache, key)
    if cached:
        return cached
    base: dict[str, Any] = {
        "name": name,
        "status": "missing",
        "signals": [],
        "sources": [],
        "profile": {},
        "coach": None,
        "tactical": {},
        "quality": 0,
        "fetchedAt": iso_now(),
    }
    search = wikidata_search(name, sport)
    time.sleep(sleep_sec)
    if not search:
        title, lang, confidence = wikipedia_search_title(name, sport)
        time.sleep(sleep_sec)
        wiki = wikipedia_extract(title, lang) if title else None
        if wiki:
            tactical = tactical_from_text(wiki.get("extract") or "", sport)
            base.update(
                {
                    "status": "ok",
                    "label": wiki.get("title") or name,
                    "description": compact_text(wiki.get("extract") or "", 220),
                    "profile": {
                        "title": wiki.get("title") or name,
                        "url": wiki.get("url") or "",
                        "extract": compact_text(wiki.get("extract"), 320),
                        "thumbnail": wiki.get("thumbnail"),
                        "source": wiki.get("source") or "en.wikipedia.org",
                    },
                    "tactical": tactical,
                    "sources": [
                        source_record("Wikipedia", wiki.get("url") or "https://en.wikipedia.org", "ok", f"profil public · confiance {confidence}"),
                    ],
                    "quality": 55 + (10 if tactical.get("tags") else 0),
                    "signals": [
                        f"Profil public confirmé: {wiki.get('title') or name}",
                        *( [f"Indice public: {tactical['style']}"] if tactical.get("tags") else [] ),
                    ],
                }
            )
            set_cached_team(cache, key, base)
            return base
        fallback = espn_public_fallback(name, sport, competitor)
        if fallback:
            set_cached_team(cache, key, fallback)
            return fallback
        base["sources"].append(source_record("Wikidata/Wikipedia", "https://www.wikidata.org/w/api.php", "missing", "Aucun résultat assez sûr"))
        set_cached_team(cache, key, base)
        return base
    qid = str(search.get("id") or "")
    entity = entity_json(qid)
    time.sleep(sleep_sec)
    title, lang = wiki_title_from_entity(entity)
    wiki = wikipedia_extract(title, lang) if title else None
    if title:
        time.sleep(sleep_sec)
    coach = current_head_coach(entity)
    if coach:
        time.sleep(sleep_sec)
    label = label_for_entity(entity) or str(search.get("label") or name)
    description = description_for_entity(entity) or str(search.get("description") or "")
    extract = (wiki or {}).get("extract") or description
    tactical = tactical_from_text(extract, sport)
    base.update(
        {
            "status": "ok",
            "entityId": qid,
            "label": label,
            "description": compact_text(description, 220),
            "profile": {
                "title": (wiki or {}).get("title") or title or label,
                "url": (wiki or {}).get("url") or f"https://www.wikidata.org/wiki/{qid}",
                "extract": compact_text(extract, 320),
                "thumbnail": (wiki or {}).get("thumbnail"),
                "source": (wiki or {}).get("source") or "wikidata.org",
            },
            "coach": coach,
            "tactical": tactical,
            "sources": [
                source_record("Wikidata", f"https://www.wikidata.org/wiki/{qid}", "ok", f"identité publique · confiance {search.get('confidence')}"),
            ],
            "quality": 45,
        }
    )
    if wiki:
        base["sources"].append(source_record("Wikipedia", wiki.get("url") or "", "ok", "résumé public exploité"))
        base["quality"] += 20
    if coach:
        base["sources"].append(source_record("Wikidata coach P286", coach.get("source") or "", "ok", f"entraîneur: {coach.get('name')}"))
        base["quality"] += 20
    if tactical.get("tags"):
        base["quality"] += 10
    base["quality"] = min(100, int(base["quality"]))
    base["signals"] = [
        f"Profil public confirmé: {label}",
        *( [f"Coach public confirmé: {coach['name']}"] if coach else [] ),
        *( [f"Indice tactique public: {tactical['style']}"] if tactical.get("tags") else [] ),
    ]
    set_cached_team(cache, key, base)
    return base


def event_key(event: dict[str, Any]) -> str:
    return str(
        event.get("id")
        or event.get("uid")
        or (event.get("winamax") or {}).get("match_id")
        or f"{event.get('name')}::{event.get('date')}"
    )


def build_match_record(event: dict[str, Any], cache: dict[str, Any], sleep_sec: float) -> dict[str, Any]:
    sport = str(event.get("sport") or "").lower() or "sport"
    teams: dict[str, Any] = {}
    sources: list[dict[str, Any]] = []
    signals: list[str] = []
    for competitor in event.get("competitors") or []:
        if not isinstance(competitor, dict):
            continue
        side = competitor.get("home_away") or ("home" if "home" not in teams else "away")
        name = str(competitor.get("name") or "").strip()
        if not name:
            continue
        enriched = enrich_entity(name, sport, cache, sleep_sec, competitor)
        teams[str(side)] = enriched
        sources.extend(enriched.get("sources") or [])
        signals.extend(enriched.get("signals") or [])
    source_count = len([source for source in sources if source.get("status") == "ok"])
    coach_count = len([team for team in teams.values() if team.get("coach")])
    quality = min(100, source_count * 16 + coach_count * 16)
    return {
        "version": 1,
        "eventId": event_key(event),
        "winamaxMatchId": str((event.get("winamax") or {}).get("match_id") or ""),
        "matchName": event.get("name") or "",
        "sport": event.get("sport") or "",
        "league": event.get("league_name") or event.get("league") or "",
        "kickoff": event.get("date") or "",
        "fetchedAt": iso_now(),
        "status": "ok" if source_count else "missing",
        "quality": quality,
        "teams": teams,
        "signals": list(dict.fromkeys(signals))[:10],
        "sources": sources[:12],
        "summary": {
            "sourceCount": source_count,
            "teamProfiles": len([team for team in teams.values() if team.get("status") == "ok"]),
            "coaches": coach_count,
            "tacticalReads": len([team for team in teams.values() if (team.get("tactical") or {}).get("tags")]),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=int(os.environ.get("PUBLIC_SIGNALS_LIMIT", "80")))
    parser.add_argument("--horizon-days", type=int, default=int(os.environ.get("PUBLIC_SIGNALS_HORIZON_DAYS", "7")))
    parser.add_argument("--include-past-minutes", type=int, default=30)
    parser.add_argument("--sleep", type=float, default=float(os.environ.get("PUBLIC_SIGNALS_SLEEP", "0.10")))
    args = parser.parse_args()

    data = load_data_js()
    cache = load_cache()
    rows = event_rows(data, args.horizon_days, args.include_past_minutes)
    if args.limit > 0:
        rows = rows[: args.limit]
    matches = [build_match_record(event, cache, max(0.0, args.sleep)) for event in rows]
    save_cache(cache)
    payload = {
        "version": 1,
        "generated_at": iso_now(),
        "source": "public_web_wikidata_wikipedia",
        "policy": "context_only_winamax_odds_only",
        "limits": {"matches": len(rows), "horizon_days": args.horizon_days},
        "summary": {
            "matches": len(matches),
            "ok": len([m for m in matches if m.get("status") == "ok"]),
            "teamProfiles": sum(int((m.get("summary") or {}).get("teamProfiles") or 0) for m in matches),
            "coaches": sum(int((m.get("summary") or {}).get("coaches") or 0) for m in matches),
            "sources": sum(int((m.get("summary") or {}).get("sourceCount") or 0) for m in matches),
        },
        "matches": matches,
    }
    write_text_atomic(OUT_PATH, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(
        "[public-signals] "
        f"matches={payload['summary']['matches']} ok={payload['summary']['ok']} "
        f"profiles={payload['summary']['teamProfiles']} coaches={payload['summary']['coaches']} "
        f"sources={payload['summary']['sources']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

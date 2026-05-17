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
RIVALRY_KEYWORDS = (
    "rivalry",
    "rivalries",
    "rival",
    "derby",
    "derbi",
    "clásico",
    "clasico",
    "classico",
    "classique",
    "klassiker",
    "old firm",
    "der Klassiker".lower(),
)
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

ASSOCIATION_FOOTBALL_BAD_HINTS = ("gaelic football", "american football", "australian rules", "rugby")


def search_queries_for_entity(name: str, sport: str) -> list[str]:
    clean_name = str(name or "").strip()
    sport_key = str(sport or "").lower()
    if not clean_name:
        return []
    queries = [f"{clean_name} {sport}".strip() if sport else clean_name]
    if "football" in sport_key or "soccer" in sport_key:
        queries.extend([
            f"{clean_name} football club",
            f"{clean_name} association football club",
            f"{clean_name} soccer club",
            f"{clean_name} FC",
            f"{clean_name} SC",
            f"{clean_name} OSC",
            f"{clean_name} Calcio",
        ])
    elif "basket" in sport_key:
        queries.append(f"{clean_name} basketball team")
    elif "baseball" in sport_key:
        queries.append(f"{clean_name} baseball team")
    elif "hockey" in sport_key:
        queries.append(f"{clean_name} ice hockey team")
    elif "tennis" in sport_key:
        queries.append(f"{clean_name} tennis player")
    return list(dict.fromkeys(query for query in queries if query))


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
        return {"version": 1, "teams": {}, "rivalries": {}}
    try:
        cache = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        if not isinstance(cache, dict):
            return {"version": 1, "teams": {}, "rivalries": {}}
        cache.setdefault("version", 1)
        cache.setdefault("teams", {})
        cache.setdefault("rivalries", {})
        return cache
    except Exception:
        return {"version": 1, "teams": {}, "rivalries": {}}


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


def cached_rivalry(cache: dict[str, Any], key: str) -> dict[str, Any] | None:
    item = (cache.get("rivalries") or {}).get(key)
    if not isinstance(item, dict):
        return None
    fetched_at = parse_dt(item.get("fetched_at"))
    record = item.get("record")
    if fetched_at and (utc_now() - fetched_at).total_seconds() < EVENT_TTL_SECONDS and isinstance(record, dict):
        return record
    return None


def set_cached_rivalry(cache: dict[str, Any], key: str, record: dict[str, Any]) -> None:
    cache.setdefault("rivalries", {})[key] = {"fetched_at": iso_now(), "record": record}


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
    target = norm(name)
    hints = SPORT_HINTS.get(str(sport or "").lower(), ())
    target_tokens = target.split()
    best: tuple[float, dict[str, Any]] | None = None
    for query in search_queries_for_entity(name, sport):
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
            continue
        for result in results:
            label = result.get("label") or ""
            aliases = result.get("aliases") or []
            description = str(result.get("description") or "").lower()
            label_lower = str(label).lower()
            if ("football" in str(sport or "").lower() or "soccer" in str(sport or "").lower()) and any(
                bad in f"{label_lower} {description}" for bad in ASSOCIATION_FOOTBALL_BAD_HINTS
            ):
                continue
            candidate_names = [label, *aliases]
            name_score = 0.35
            exact = any(norm(candidate) == target for candidate in candidate_names)
            partial = target and any(target in norm(candidate) or norm(candidate) in target for candidate in candidate_names)
            if exact:
                name_score = 0.75
            elif partial:
                name_score = 0.55
            hint_score = 0.18 if hints and any(hint in description for hint in hints) else 0.0
            if not exact and hint_score <= 0 and len(target_tokens) <= 2:
                continue
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


def claim_time(entity: dict[str, Any] | None, prop: str) -> str:
    claims = ((entity or {}).get("claims") or {}).get(prop) or []
    if not isinstance(claims, list) or not claims:
        return ""
    for claim in claims:
        if not isinstance(claim, dict):
            continue
        try:
            value = claim["mainsnak"]["datavalue"]["value"]
            if isinstance(value, dict) and value.get("time"):
                return str(value["time"])
        except Exception:
            continue
    return ""


def year_from_wikidata_time(value: Any) -> int | None:
    match = re.search(r"([+-]?\d{1,4})", str(value or ""))
    if not match:
        return None
    try:
        year = int(match.group(1))
    except Exception:
        return None
    if 1800 <= year <= utc_now().year:
        return year
    return None


def claim_entity_label(entity: dict[str, Any] | None, prop: str) -> str:
    claims = ((entity or {}).get("claims") or {}).get(prop) or []
    if not isinstance(claims, list):
        return ""
    for claim in claims[:3]:
        if not isinstance(claim, dict):
            continue
        qid = claim_value_id(claim)
        if not qid:
            continue
        label = label_for_entity(entity_json(qid))
        if label:
            return label
    return ""


HISTORY_KEYWORDS = (
    "founded",
    "founded in",
    "established",
    "formed",
    "created",
    "history",
    "won",
    "winner",
    "champion",
    "champions",
    "championship",
    "title",
    "titles",
    "league title",
    "cup",
    "trophy",
    "honour",
    "honor",
    "palmarès",
    "palmares",
    "final",
    "grand slam",
    "atp",
    "wta",
    "world series",
    "all-star",
    "olympic",
    "hall of fame",
    "career-high",
    "international",
)


def history_sentence_from_extract(extract: Any) -> str:
    text = re.sub(r"\s+", " ", str(extract or "")).strip()
    if not text:
        return ""
    sentences = re.split(r"(?<=[.!?])\s+", text)
    for sentence in sentences[:8]:
        lower = sentence.lower()
        if any(keyword in lower for keyword in HISTORY_KEYWORDS):
            return compact_text(sentence, 260)
    return compact_text(sentences[0] if sentences else text, 220)


def competitor_history_fallback(name: str, sport: str, competitor: dict[str, Any] | None) -> dict[str, Any]:
    competitor = competitor or {}
    record = ""
    records = competitor.get("records") if isinstance(competitor.get("records"), list) else []
    if records:
        record = str((records[0] or {}).get("summary") or "")
    form = form_summary(competitor.get("team_form_l5") or competitor.get("form") or competitor.get("form10"))
    bits = [part for part in [record and f"bilan public {record}", form and f"forme récente {form}"] if part]
    if not bits:
        return {"status": "missing"}
    return {
        "status": "partial",
        "type": "player" if "tennis" in str(sport or "").lower() else "club",
        "summary": compact_text(f"{name}: " + " · ".join(bits), 240),
        "statureScore": 35,
        "tags": ["snapshot sportif"],
        "source": "espn_snapshot",
    }


def historical_profile_from_entity(
    entity: dict[str, Any] | None,
    wiki: dict[str, Any] | None,
    sport: str,
    name: str,
    competitor: dict[str, Any] | None = None,
) -> dict[str, Any]:
    description = description_for_entity(entity)
    lower = f"{description} {sport}".lower()
    is_player = any(word in lower for word in ("player", "tennis", "boxer", "fighter", "golfer", "cyclist", "athlete"))
    profile_type = "player" if is_player else "club"
    founded_year = year_from_wikidata_time(claim_time(entity, "P571"))
    birth_year = year_from_wikidata_time(claim_time(entity, "P569"))
    current_year = utc_now().year
    age_years = None
    if profile_type == "player" and birth_year:
        age_years = current_year - birth_year
    elif profile_type == "club" and founded_year:
        age_years = current_year - founded_year
    country = claim_entity_label(entity, "P27" if profile_type == "player" else "P17")
    venue = claim_entity_label(entity, "P115") if profile_type == "club" else ""
    league = claim_entity_label(entity, "P118") if profile_type == "club" else ""
    position = claim_entity_label(entity, "P413") if profile_type == "player" else ""
    current_team = claim_entity_label(entity, "P54") if profile_type == "player" else ""
    extract = (wiki or {}).get("extract") or description
    history_sentence = history_sentence_from_extract(extract)
    lower_extract = str(extract or "").lower()
    tags: list[str] = []
    stature_score = 35
    if profile_type == "club":
        if founded_year:
            tags.append(f"fondé en {founded_year}")
            if founded_year < 1950:
                tags.append("club historique")
                stature_score += 22
            elif founded_year < 1980:
                tags.append("ancienneté notable")
                stature_score += 12
        if venue:
            tags.append("stade identifié")
        if league:
            tags.append("championnat identifié")
    else:
        if birth_year and age_years is not None:
            tags.append(f"{age_years} ans")
            if age_years >= 28:
                tags.append("expérience élevée")
                stature_score += 14
        if position:
            tags.append(position)
        if current_team:
            tags.append("club actuel identifié")
    if any(keyword in lower_extract for keyword in ("champion", "title", "cup", "trophy", "won", "grand slam", "world series", "all-star", "olympic")):
        tags.append("palmarès cité")
        stature_score += 24
    if country:
        stature_score += 5
    if venue or league or position or current_team:
        stature_score += 5
    if history_sentence:
        stature_score += 8
    summary_bits = []
    if profile_type == "club" and founded_year:
        summary_bits.append(f"club fondé en {founded_year}")
    if profile_type == "player" and age_years is not None:
        summary_bits.append(f"joueur de {age_years} ans")
    if country:
        summary_bits.append(country)
    if venue:
        summary_bits.append(f"stade: {venue}")
    if league:
        summary_bits.append(f"ligue: {league}")
    if position:
        summary_bits.append(f"poste: {position}")
    if history_sentence:
        summary_bits.append(history_sentence)
    if not summary_bits:
        return competitor_history_fallback(name, sport, competitor)
    return {
        "status": "ok" if history_sentence or founded_year or birth_year else "partial",
        "type": profile_type,
        "summary": compact_text(" · ".join(summary_bits), 360),
        "foundedYear": founded_year,
        "birthYear": birth_year,
        "ageYears": age_years,
        "country": country,
        "venue": venue,
        "league": league,
        "position": position,
        "currentTeam": current_team,
        "statureScore": max(0, min(100, int(stature_score))),
        "tags": list(dict.fromkeys(tags))[:6],
        "source": "wikidata_wikipedia" if entity else "wikipedia_extract",
    }


def historical_profile_from_wiki(name: str, sport: str, wiki: dict[str, Any] | None, competitor: dict[str, Any] | None = None) -> dict[str, Any]:
    sentence = history_sentence_from_extract((wiki or {}).get("extract") or "")
    if not sentence:
        return competitor_history_fallback(name, sport, competitor)
    lower = sentence.lower()
    score = 46 + (18 if any(keyword in lower for keyword in ("champion", "title", "cup", "won", "grand slam", "all-star")) else 0)
    return {
        "status": "partial",
        "type": "player" if "tennis" in str(sport or "").lower() else "club",
        "summary": compact_text(sentence, 320),
        "statureScore": min(85, score),
        "tags": ["historique public"] + (["palmarès cité"] if score > 46 else []),
        "source": "wikipedia_extract",
    }


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
    target = norm(name)
    hints = SPORT_HINTS.get(str(sport or "").lower(), ())
    target_tokens = target.split()
    best: tuple[float, str, str] | None = None
    for query in search_queries_for_entity(name, sport):
        params = urllib.parse.urlencode(
            {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": "6",
                "format": "json",
            }
        )
        data = http_json(f"https://{host}/w/api.php?{params}")
        results = (((data or {}).get("query") or {}).get("search") or [])
        if not isinstance(results, list):
            continue
        for result in results:
            title = str(result.get("title") or "")
            snippet = re.sub(r"<.*?>", " ", str(result.get("snippet") or "")).lower()
            title_norm = norm(title)
            if ("football" in str(sport or "").lower() or "soccer" in str(sport or "").lower()) and any(
                bad in f"{title.lower()} {snippet}" for bad in ASSOCIATION_FOOTBALL_BAD_HINTS
            ):
                continue
            exact = title_norm == target
            partial = target and (target in title_norm or title_norm in target)
            score = 0.35
            if exact:
                score = 0.78
            elif partial:
                score = 0.58
            title_hint = ("football" in str(sport or "").lower() or "soccer" in str(sport or "").lower()) and any(
                token in f" {title.lower()} " for token in (" fc ", " sc ", " afc ", " cf ", " club ", " olympique ", " osc ", " calcio ")
            )
            hint_score = 0.12 if (hints and any(hint in snippet for hint in hints)) or title_hint else 0.0
            if exact and hint_score <= 0 and len(target_tokens) <= 1:
                continue
            if not exact and hint_score <= 0 and len(target_tokens) <= 2:
                continue
            score += hint_score
            if not best or score > best[0]:
                best = (score, title, snippet)
    if not best or best[0] < 0.50:
        return "", "", 0.0
    return best[1], "en", round(best[0], 2)


def important_tokens(name: str) -> list[str]:
    stop = {
        "fc",
        "afc",
        "cf",
        "sc",
        "club",
        "city",
        "united",
        "athletic",
        "sporting",
        "real",
        "de",
        "la",
        "le",
        "les",
        "st",
        "saint",
        "team",
    }
    return [token for token in norm(name).split() if len(token) >= 4 and token not in stop][:4]


def token_hit(text: str, name: str) -> bool:
    tokens = important_tokens(name)
    haystack = norm(text)
    return bool(tokens and any(token in haystack for token in tokens))


def has_rivalry_keyword(text: str) -> bool:
    lower = str(text or "").lower()
    return any(keyword in lower for keyword in RIVALRY_KEYWORDS)


def rivalry_search(home_name: str, away_name: str, sport: str) -> dict[str, Any] | None:
    host = "en.wikipedia.org"
    search_text = f"{home_name} {away_name} rivalry derby {sport}".strip()
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "list": "search",
            "srsearch": search_text,
            "srwhat": "text",
            "srlimit": "8",
            "format": "json",
        }
    )
    data = http_json(f"https://{host}/w/api.php?{params}")
    results = (((data or {}).get("query") or {}).get("search") or [])
    if not isinstance(results, list):
        return None
    best: tuple[float, dict[str, Any]] | None = None
    for result in results:
        title = str(result.get("title") or "")
        snippet = re.sub(r"<.*?>", " ", str(result.get("snippet") or ""))
        text = f"{title} {snippet}"
        keyword = has_rivalry_keyword(text)
        home_hit = token_hit(text, home_name)
        away_hit = token_hit(text, away_name)
        score = 0.0
        if keyword:
            score += 0.35
        if home_hit:
            score += 0.25
        if away_hit:
            score += 0.25
        if re.search(r"\b(vs\.?|v|–|-)\b", title, re.I):
            score += 0.08
        if "rivalry" in title.lower() or "derby" in title.lower():
            score += 0.12
        if not best or score > best[0]:
            best = (score, result)
    if not best or best[0] < 0.65:
        return None
    title = str(best[1].get("title") or "")
    wiki = wikipedia_extract(title, "en")
    detail = compact_text((wiki or {}).get("extract") or re.sub(r"<.*?>", " ", str(best[1].get("snippet") or "")), 260)
    validation_text = f"{title} {detail}"
    title_lower = title.lower()
    if not (token_hit(validation_text, home_name) and token_hit(validation_text, away_name) and has_rivalry_keyword(validation_text)):
        return None
    if "schedule" in title_lower or "list of" in title_lower:
        return None
    intensity = 85 if re.search(r"rivalry|derby|cl[aá]sico|classique", title, re.I) else 70
    return {
        "status": "confirmed",
        "label": title or f"{home_name} - {away_name}",
        "intensity": intensity,
        "confidence": round(min(0.95, best[0]), 2),
        "summary": detail or "Rivalité publique détectée, à croiser avec les signaux du match.",
        "source": {
            "label": "Wikipedia rivalry",
            "url": (wiki or {}).get("url") or f"https://{host}/wiki/{urllib.parse.quote(title.replace(' ', '_'))}",
            "status": "ok",
            "detail": "rivalité/derby détecté par recherche publique",
            "checkedAt": iso_now(),
        },
        "signals": [
            f"Rivalité détectée: {title}",
            "Match à tension supérieure : prudence sur Vainqueur, attention rythme/cartons.",
        ],
    }


def profile_rivalry_signal(home_name: str, away_name: str, teams: dict[str, Any]) -> dict[str, Any] | None:
    home_text = " ".join(
        str((teams.get("home") or {}).get(path) or "")
        for path in ("description",)
    )
    away_text = " ".join(
        str((teams.get("away") or {}).get(path) or "")
        for path in ("description",)
    )
    home_profile = ((teams.get("home") or {}).get("profile") or {}).get("extract") or ""
    away_profile = ((teams.get("away") or {}).get("profile") or {}).get("extract") or ""
    combined_home = f"{home_text} {home_profile}"
    combined_away = f"{away_text} {away_profile}"
    home_mentions_away = has_rivalry_keyword(combined_home) and token_hit(combined_home, away_name)
    away_mentions_home = has_rivalry_keyword(combined_away) and token_hit(combined_away, home_name)
    if not (home_mentions_away or away_mentions_home):
        return None
    return {
        "status": "confirmed",
        "label": f"{home_name} - {away_name}",
        "intensity": 68 if home_mentions_away ^ away_mentions_home else 78,
        "confidence": 0.72 if home_mentions_away ^ away_mentions_home else 0.82,
        "summary": "Une source publique d’équipe mentionne une rivalité avec l’adversaire.",
        "source": source_record("Profil public rivalité", "", "ok", "rivalité détectée dans un profil public"),
        "signals": [
            f"Rivalité publique détectée entre {home_name} et {away_name}",
            "À intégrer comme facteur de pression et de prudence.",
        ],
    }


def rivalry_key(home_name: str, away_name: str, sport: str) -> str:
    pair = sorted([norm(home_name), norm(away_name)])
    return f"rivalry_v2::{sport.lower()}::{'::'.join(pair)}"


def detect_match_rivalry(event: dict[str, Any], teams: dict[str, Any], cache: dict[str, Any], sleep_sec: float) -> dict[str, Any]:
    sport = str(event.get("sport") or "").lower()
    if re.search(r"tennis|mma|boxe|boxing", sport):
        return {"status": "none", "intensity": 0, "signals": [], "sources": []}
    competitors = event.get("competitors") or []
    home_name = str(((teams.get("home") or {}).get("name")) or (competitors[0] or {}).get("name") or "").strip()
    away_name = str(((teams.get("away") or {}).get("name")) or ((competitors[1] or {}) if len(competitors) > 1 else {}).get("name") or "").strip()
    if not home_name or not away_name:
        return {"status": "missing", "intensity": 0, "signals": [], "sources": []}
    key = rivalry_key(home_name, away_name, sport)
    cached = cached_rivalry(cache, key)
    if cached:
        return cached

    profile_hit = profile_rivalry_signal(home_name, away_name, teams)
    if profile_hit:
        record = {
            **profile_hit,
            "sourceType": "profile_extract",
            "sources": [profile_hit.get("source")],
            "fetchedAt": iso_now(),
        }
        set_cached_rivalry(cache, key, record)
        return record

    search_hit = rivalry_search(home_name, away_name, sport)
    time.sleep(sleep_sec)
    if search_hit:
        record = {
            **search_hit,
            "sourceType": "wikipedia_search",
            "sources": [search_hit.get("source")],
            "fetchedAt": iso_now(),
        }
        set_cached_rivalry(cache, key, record)
        return record

    record = {
        "status": "none",
        "label": f"{home_name} - {away_name}",
        "intensity": 0,
        "confidence": 0,
        "summary": "",
        "signals": [],
        "sources": [],
        "fetchedAt": iso_now(),
    }
    set_cached_rivalry(cache, key, record)
    return record


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
    history = competitor_history_fallback(name, sport, competitor)
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
        "history": history,
        "tactical": {
            "style": "profil public sportif",
            "read": "Le flux public confirme l'équipe et sa dynamique récente, sans coach/tactique confirmé par source ouverte.",
            "tags": [],
            "source": "espn_snapshot",
        },
        "quality": (42 if bits else 32) + (6 if history.get("status") in {"ok", "partial"} else 0),
        "fetchedAt": iso_now(),
    }


def enrich_entity(name: str, sport: str, cache: dict[str, Any], sleep_sec: float, competitor: dict[str, Any] | None = None) -> dict[str, Any]:
    key = f"{sport.lower()}::history_v7::{norm(name)}"
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
        "history": {},
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
            history = historical_profile_from_wiki(name, sport, wiki, competitor)
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
                    "history": history,
                    "tactical": tactical,
                    "sources": [
                        source_record("Wikipedia", wiki.get("url") or "https://en.wikipedia.org", "ok", f"profil public · confiance {confidence}"),
                    ],
                    "quality": 55 + (10 if tactical.get("tags") else 0) + (8 if history.get("status") in {"ok", "partial"} else 0),
                    "signals": [
                        f"Profil public confirmé: {wiki.get('title') or name}",
                        *( [f"Histoire publique: {history['summary']}"] if history.get("summary") else [] ),
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
    if not wiki:
        alt_title, alt_lang, _alt_confidence = wikipedia_search_title(name, sport)
        time.sleep(sleep_sec)
        wiki = wikipedia_extract(alt_title, alt_lang) if alt_title else None
        if alt_title:
            time.sleep(sleep_sec)
    coach = current_head_coach(entity)
    if coach:
        time.sleep(sleep_sec)
    label = label_for_entity(entity) or str(search.get("label") or name)
    description = description_for_entity(entity) or str(search.get("description") or "")
    extract = (wiki or {}).get("extract") or description
    tactical = tactical_from_text(extract, sport)
    history = historical_profile_from_entity(entity, wiki, sport, name, competitor)
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
            "history": history,
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
    if history.get("status") in {"ok", "partial"}:
        base["quality"] += 10
    base["quality"] = min(100, int(base["quality"]))
    base["signals"] = [
        f"Profil public confirmé: {label}",
        *( [f"Coach public confirmé: {coach['name']}"] if coach else [] ),
        *( [f"Histoire publique: {history['summary']}"] if history.get("summary") else [] ),
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
    rivalry = detect_match_rivalry(event, teams, cache, sleep_sec)
    if rivalry.get("status") == "confirmed":
        sources.extend(rivalry.get("sources") or [])
        signals.extend(rivalry.get("signals") or [])
    source_count = len([source for source in sources if source.get("status") == "ok"])
    coach_count = len([team for team in teams.values() if team.get("coach")])
    rivalry_count = 1 if rivalry.get("status") == "confirmed" else 0
    history_count = len([team for team in teams.values() if (team.get("history") or {}).get("status") in {"ok", "partial"}])
    quality = min(100, source_count * 16 + coach_count * 16 + rivalry_count * 8 + history_count * 6)
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
        "rivalry": rivalry,
        "signals": list(dict.fromkeys(signals))[:10],
        "sources": sources[:12],
        "summary": {
            "sourceCount": source_count,
            "teamProfiles": len([team for team in teams.values() if team.get("status") == "ok"]),
            "coaches": coach_count,
            "rivalries": rivalry_count,
            "histories": history_count,
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
            "rivalries": sum(int((m.get("summary") or {}).get("rivalries") or 0) for m in matches),
            "histories": sum(int((m.get("summary") or {}).get("histories") or 0) for m in matches),
            "sources": sum(int((m.get("summary") or {}).get("sourceCount") or 0) for m in matches),
        },
        "matches": matches,
    }
    write_text_atomic(OUT_PATH, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    print(
        "[public-signals] "
        f"matches={payload['summary']['matches']} ok={payload['summary']['ok']} "
        f"profiles={payload['summary']['teamProfiles']} coaches={payload['summary']['coaches']} "
        f"rivalries={payload['summary']['rivalries']} histories={payload['summary']['histories']} "
        f"sources={payload['summary']['sources']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Build searchable team and player intelligence profiles from public sidecars.

This script does not scrape. It consolidates data already fetched by the
pipeline into two frontend-friendly files:

- public_team_profiles.json
- public_player_profiles.json
"""
from __future__ import annotations

import json
import math
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
TEAM_STATS = ROOT / "public_team_stats.json"
INJURIES = ROOT / "injuries_multisport.json"
LINEUPS = ROOT / "lineups_multisport.json"

TEAM_OUT = ROOT / "public_team_profiles.json"
PLAYER_OUT = ROOT / "public_player_profiles.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def parse_data_js() -> dict[str, Any]:
    if not DATA_JS.exists():
        return {}
    text = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$", text, re.DOTALL)
    if not m:
        m = re.search(r"=\s*(\{.*\})\s*;?\s*$", text, re.DOTALL)
    if not m:
        return {}
    try:
        return json.loads(m.group(1))
    except Exception:
        return {}


def norm(value: Any) -> str:
    if value is None:
        return ""
    raw = unicodedata.normalize("NFKD", str(value))
    ascii_s = raw.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "", ascii_s.lower())


def clean_num(value: Any, digits: int = 3) -> float | None:
    try:
        if value is None or value == "":
            return None
        out = float(value)
        if not math.isfinite(out):
            return None
        return round(out, digits)
    except (TypeError, ValueError):
        return None


def team_profile_key(sport: str, league: str, name: str) -> str:
    return f"{sport or 'unknown'}:{league or 'unknown'}:{norm(name)}"


def team_id_keys(item: dict[str, Any]) -> list[str]:
    tid = item.get("team_id")
    league = item.get("league_code") or "unknown"
    sport = item.get("sport") or "unknown"
    if not tid:
        return []
    return [
        f"{league}:{tid}",
        f"{sport}:{league}:{tid}",
    ]


def add_source(item: dict[str, Any], source: str) -> None:
    sources = item.setdefault("sources", [])
    if source and source not in sources:
        sources.append(source)


def collect_events() -> list[dict[str, Any]]:
    data = parse_data_js()
    events: list[dict[str, Any]] = []
    for day, day_events in (data.get("days") or {}).items():
        for ev in day_events or []:
            if isinstance(ev, dict):
                ev["_day"] = day
                events.append(ev)
    events.sort(key=lambda e: str(e.get("date") or ""))
    return events


def seed_team_profiles(public_stats: dict[str, Any]) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    profiles: dict[str, dict[str, Any]] = {}
    id_index: dict[str, str] = {}
    for key, raw in (public_stats.get("teams") or {}).items():
        if not isinstance(raw, dict):
            continue
        sport = raw.get("sport") or "unknown"
        league = raw.get("league_code") or "unknown"
        name = raw.get("team") or raw.get("name") or raw.get("normalized_name") or key
        pkey = team_profile_key(str(sport), str(league), str(name))
        profile = {
            "team": name,
            "normalized_name": raw.get("normalized_name") or norm(name),
            "sport": sport,
            "league_code": league,
            "team_id": raw.get("team_id"),
            "sources": list(raw.get("sources") or []),
            "form": {
                "form10": raw.get("form10"),
                "form5": raw.get("form5"),
                "games_l10": raw.get("games_l10"),
                "wins_l10": raw.get("wins_l10"),
                "losses_l10": raw.get("losses_l10"),
                "win_rate_l10": clean_num(raw.get("win_rate_l10")),
                "avg_for_l10": clean_num(raw.get("avg_for_l10")),
                "avg_against_l10": clean_num(raw.get("avg_against_l10")),
                "played5": raw.get("played5"),
                "wins5": raw.get("wins5"),
                "losses5": raw.get("losses5"),
            },
            "xg": {
                "xg_l10": clean_num(raw.get("xg_l10")),
                "xga_l10": clean_num(raw.get("xga_l10")),
                "xg_per90": clean_num(raw.get("xg_per90")),
                "xga_per90": clean_num(raw.get("xga_per90")),
                "xg_diff_l10": clean_num(raw.get("xg_diff_l10")),
                "ppda": clean_num(raw.get("ppda")),
                "ppda_allowed": clean_num(raw.get("ppda_allowed")),
            },
            "metadata": {
                "badge": raw.get("badge") or raw.get("openligadb_icon"),
                "stadium": raw.get("stadium"),
                "stadium_capacity": raw.get("stadium_capacity"),
                "formed_year": raw.get("formed_year"),
            },
            "availability": {},
            "upcoming": [],
            "style_tags": [],
            "risk_flags": list(raw.get("quality_flags") or []),
            "search_terms": [],
        }
        profiles[pkey] = profile
        for idx in team_id_keys(profile):
            id_index[idx] = pkey
    return profiles, id_index


def ensure_event_team(
    profiles: dict[str, dict[str, Any]],
    id_index: dict[str, str],
    sport: str,
    league: str,
    comp: dict[str, Any],
) -> str | None:
    name = comp.get("name") or comp.get("displayName") or comp.get("short") or comp.get("abbr")
    if not name:
        return None
    tid = comp.get("id")
    if tid:
        for idx in (f"{league}:{tid}", f"{sport}:{league}:{tid}"):
            if idx in id_index:
                return id_index[idx]
    pkey = team_profile_key(sport, league, str(name))
    if pkey not in profiles:
        profiles[pkey] = {
            "team": name,
            "normalized_name": norm(name),
            "sport": sport,
            "league_code": league,
            "team_id": tid,
            "sources": ["data_js"],
            "form": {},
            "xg": {},
            "metadata": {},
            "availability": {},
            "upcoming": [],
            "style_tags": [],
            "risk_flags": [],
            "search_terms": [],
        }
    if tid:
        id_index[f"{league}:{tid}"] = pkey
        id_index[f"{sport}:{league}:{tid}"] = pkey
    return pkey


def attach_upcoming(events: list[dict[str, Any]], profiles: dict[str, dict[str, Any]], id_index: dict[str, str]) -> None:
    now = datetime.now(timezone.utc)
    for ev in events:
        try:
            kickoff_raw = str(ev.get("date") or "").replace("Z", "+00:00")
            kickoff = datetime.fromisoformat(kickoff_raw)
        except Exception:
            kickoff = None
        if kickoff and kickoff < now:
            continue
        sport = ev.get("sport") or "unknown"
        league = ev.get("league_code") or ev.get("league_name") or "unknown"
        comps = ev.get("competitors") or []
        names = [c.get("name") or c.get("displayName") for c in comps if isinstance(c, dict)]
        match_name = ev.get("name") or " - ".join([n for n in names if n])
        for comp in comps:
            if not isinstance(comp, dict):
                continue
            pkey = ensure_event_team(profiles, id_index, str(sport), str(league), comp)
            if not pkey:
                continue
            upcoming = profiles[pkey].setdefault("upcoming", [])
            if len(upcoming) >= 6:
                continue
            upcoming.append({
                "event_id": ev.get("id"),
                "date": ev.get("date"),
                "day": ev.get("_day"),
                "match": match_name,
                "opponent": next((n for n in names if n and n != (comp.get("name") or comp.get("displayName"))), None),
                "home_away": comp.get("home_away"),
                "winamax_available": bool((ev.get("winamax") or {}).get("available")),
            })
            add_source(profiles[pkey], "data_js")


def attach_injuries(
    profiles: dict[str, dict[str, Any]],
    id_index: dict[str, str],
    injuries: dict[str, Any],
    players: dict[str, dict[str, Any]],
) -> None:
    for raw_key, raw in (injuries.get("teams") or {}).items():
        if not isinstance(raw, dict):
            continue
        sport = raw.get("sport") or "unknown"
        league = raw.get("league_code") or str(raw_key).split(":", 1)[0]
        tid = raw.get("team_id") or str(raw_key).split(":")[-1]
        pkey = id_index.get(f"{league}:{tid}") or id_index.get(f"{sport}:{league}:{tid}")
        if pkey and pkey in profiles:
            availability = profiles[pkey].setdefault("availability", {})
            availability["injuries_count"] = raw.get("injuries_count") or 0
            availability["severe_injuries_count"] = raw.get("severe_count") or 0
            availability["injuries_sample"] = (raw.get("injuries") or [])[:5]
            add_source(profiles[pkey], "injuries_multisport")
            if (raw.get("severe_count") or 0) >= 5:
                profiles[pkey].setdefault("risk_flags", []).append("blessures nombreuses")
        team_name = profiles.get(pkey or "", {}).get("team") if pkey else None
        for inj in raw.get("injuries") or []:
            name = inj.get("name")
            if not name:
                continue
            player_key = f"{norm(name)}:{league}:{tid}"
            players[player_key] = {
                "name": name,
                "team": team_name,
                "team_profile_key": pkey,
                "sport": sport,
                "league_code": league,
                "team_id": tid,
                "position": inj.get("pos"),
                "status": inj.get("status"),
                "role": "injury_report",
                "severity": "high" if str(inj.get("status") or "").lower() in {"out", "60-day-il", "injured reserve", "suspension"} else "watch",
                "sources": ["injuries_multisport"],
            }


def attach_lineups(
    profiles: dict[str, dict[str, Any]],
    id_index: dict[str, str],
    lineups: dict[str, Any],
    players: dict[str, dict[str, Any]],
) -> None:
    for match_id, raw in (lineups.get("matches") or {}).items():
        if not isinstance(raw, dict):
            continue
        sport = raw.get("sport") or "unknown"
        league = raw.get("league_code") or "unknown"
        for side in ("home", "away"):
            name = raw.get(side)
            if not name:
                continue
            pkey = team_profile_key(str(sport), str(league), str(name))
            if pkey not in profiles:
                continue
            availability = profiles[pkey].setdefault("availability", {})
            if raw.get(f"{side}_formation"):
                availability["formation"] = raw.get(f"{side}_formation")
                availability["lineup_confirmed"] = bool(raw.get("confirmed"))
            if raw.get(f"{side}_pitcher"):
                pitcher = raw.get(f"{side}_pitcher")
                availability["probable_pitcher"] = pitcher
                players[f"{norm(pitcher)}:{league}:{norm(name)}"] = {
                    "name": pitcher,
                    "team": name,
                    "team_profile_key": pkey,
                    "sport": sport,
                    "league_code": league,
                    "position": "P",
                    "status": "probable",
                    "role": "probable_pitcher",
                    "sources": ["lineups_multisport"],
                    "upcoming_match_id": match_id,
                }
            if raw.get(f"{side}_goalie"):
                goalie = raw.get(f"{side}_goalie")
                availability["projected_goalie"] = goalie
                players[f"{norm(goalie)}:{league}:{norm(name)}"] = {
                    "name": goalie,
                    "team": name,
                    "team_profile_key": pkey,
                    "sport": sport,
                    "league_code": league,
                    "position": "G",
                    "status": "projected",
                    "role": "projected_goalie",
                    "sources": ["lineups_multisport"],
                    "upcoming_match_id": match_id,
                }
            add_source(profiles[pkey], "lineups_multisport")


def enrich_profile(profile: dict[str, Any]) -> None:
    xg = profile.get("xg") or {}
    form = profile.get("form") or {}
    tags = set(profile.get("style_tags") or [])
    flags = list(dict.fromkeys(profile.get("risk_flags") or []))
    xg_diff = xg.get("xg_diff_l10")
    ppda = xg.get("ppda")
    win_rate = form.get("win_rate_l10")
    avg_for = form.get("avg_for_l10")
    avg_against = form.get("avg_against_l10")
    if xg_diff is not None:
        if xg_diff >= 0.5:
            tags.add("attaque cree plus que l'adversaire")
        elif xg_diff <= -0.5:
            flags.append("xG recent negatif")
    if ppda is not None and ppda <= 9:
        tags.add("pressing haut")
    if avg_for is not None and avg_against is not None:
        if avg_for >= avg_against + 0.8:
            tags.add("dynamique offensive")
        if avg_against >= avg_for + 0.8:
            flags.append("defense exposee")
    if win_rate is not None:
        if win_rate >= 0.7:
            tags.add("forme chaude")
        elif win_rate <= 0.3:
            flags.append("forme froide")
    injuries = (profile.get("availability") or {}).get("severe_injuries_count") or 0
    score = 50
    if win_rate is not None:
        score += (float(win_rate) - 0.5) * 35
    if xg_diff is not None:
        score += max(-15, min(15, float(xg_diff) * 12))
    score -= min(12, injuries * 1.5)
    profile["style_tags"] = sorted(tags)[:6]
    profile["risk_flags"] = list(dict.fromkeys(flags))[:6]
    profile["profile_score"] = round(max(0, min(100, score)), 1)
    profile["data_quality_score"] = sum(
        1 for block in ("form", "xg", "metadata", "availability") if any((profile.get(block) or {}).values())
    )
    profile["search_terms"] = list(dict.fromkeys([
        profile.get("team"),
        profile.get("normalized_name"),
        profile.get("sport"),
        profile.get("league_code"),
        *((profile.get("style_tags") or [])[:3]),
    ]))


def main() -> int:
    public_stats = read_json(TEAM_STATS)
    injuries = read_json(INJURIES)
    lineups = read_json(LINEUPS)
    events = collect_events()
    profiles, id_index = seed_team_profiles(public_stats)
    players: dict[str, dict[str, Any]] = {}

    attach_upcoming(events, profiles, id_index)
    attach_injuries(profiles, id_index, injuries, players)
    attach_lineups(profiles, id_index, lineups, players)

    teams_with_upcoming = 0
    teams_with_availability = 0
    teams_with_deep_context = 0
    by_sport: dict[str, int] = {}
    for profile in profiles.values():
        enrich_profile(profile)
        by_sport[profile.get("sport") or "unknown"] = by_sport.get(profile.get("sport") or "unknown", 0) + 1
        if profile.get("upcoming"):
            teams_with_upcoming += 1
        if any((profile.get("availability") or {}).values()):
            teams_with_availability += 1
        if (profile.get("data_quality_score") or 0) >= 3:
            teams_with_deep_context += 1

    player_items = sorted(
        players.items(),
        key=lambda kv: (
            0 if kv[1].get("role") in {"probable_pitcher", "projected_goalie"} else 1,
            0 if kv[1].get("severity") == "high" else 1,
            kv[1].get("name") or "",
        ),
    )[:500]
    player_profiles = dict(player_items)

    team_payload = {
        "generated_at": now_iso(),
        "source": "public_team_stats + data.js schedule + injuries_multisport + lineups_multisport",
        "teams_total": len(profiles),
        "teams_with_upcoming": teams_with_upcoming,
        "teams_with_availability": teams_with_availability,
        "teams_with_deep_context": teams_with_deep_context,
        "by_sport": dict(sorted(by_sport.items())),
        "teams": dict(sorted(profiles.items())),
    }
    player_payload = {
        "generated_at": now_iso(),
        "source": "injuries_multisport + lineups_multisport",
        "players_total": len(player_profiles),
        "players_in_source": len(players),
        "injury_profiles": sum(1 for p in player_profiles.values() if p.get("role") == "injury_report"),
        "starter_context_profiles": sum(1 for p in player_profiles.values() if p.get("role") != "injury_report"),
        "players": player_profiles,
    }
    TEAM_OUT.write_text(json.dumps(team_payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    PLAYER_OUT.write_text(json.dumps(player_payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(
        "public_profiles: "
        f"teams={len(profiles)} upcoming={teams_with_upcoming} deep={teams_with_deep_context} "
        f"players={len(player_profiles)}/{len(players)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

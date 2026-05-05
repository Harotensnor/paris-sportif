from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._data_io import ROOT, load_data_js


OUT_TRAVEL_JSON = ROOT / "team_travel.json"
OUT_TRAVEL_JS = ROOT / "team_travel.js"
OUT_SCHEDULE_JSON = ROOT / "schedule_density.json"
OUT_SCHEDULE_JS = ROOT / "schedule_density.js"


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _haversine(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(h))


def _norm(value: str | None) -> str:
    return "".join(ch.lower() for ch in str(value or "") if ch.isalnum())


def _stadium_coord(stadiums: dict[str, Any], sport: str, abbr: str | None) -> tuple[float, float] | None:
    league = {"basketball": "nba", "hockey": "nhl", "baseball": "mlb"}.get(sport)
    if not league or not abbr:
        return None
    raw = (stadiums.get(league) or {}).get(str(abbr).upper())
    if isinstance(raw, list) and len(raw) >= 2:
        return (float(raw[0]), float(raw[1]))
    return None


def _city_coord(cache: dict[str, Any], city: str | None) -> tuple[float, float] | None:
    raw = cache.get(_norm(city))
    if isinstance(raw, dict) and raw.get("ok") and raw.get("lat") is not None and raw.get("lon") is not None:
        return (float(raw["lat"]), float(raw["lon"]))
    return None


def _last_match_hours(side: dict[str, Any], kickoff: datetime | None) -> float | None:
    if not kickoff:
        return None
    prior = []
    for row in side.get("last10") or []:
        dt = _parse_dt(row.get("date"))
        if dt and dt < kickoff:
            prior.append(dt)
    if not prior:
        return None
    return (kickoff - max(prior)).total_seconds() / 3600


def _schedule_counts(side: dict[str, Any], kickoff: datetime | None) -> dict[str, int]:
    out = {"last_4d": 0, "last_5d": 0, "last_7d": 0}
    if not kickoff:
        return out
    for row in side.get("last10") or []:
        dt = _parse_dt(row.get("date"))
        if not dt or dt >= kickoff:
            continue
        days = (kickoff - dt).total_seconds() / 86400
        if days <= 4:
            out["last_4d"] += 1
        if days <= 5:
            out["last_5d"] += 1
        if days <= 7:
            out["last_7d"] += 1
    return out


def _penalties(sport: str, distance_km: float | None, time_since_h: float | None, tz_delta: float | None, counts: dict[str, int]) -> dict[str, float | str]:
    fatigue = 0.0
    label = "normal"
    if distance_km is not None and time_since_h is not None and distance_km > 2000 and time_since_h < 48:
        if sport == "basketball":
            fatigue -= 3.0
        elif sport == "hockey":
            fatigue -= 0.20
        else:
            fatigue -= 0.15
        label = "voyage_extreme"
    if sport == "football" and tz_delta is not None and tz_delta >= 3:
        fatigue -= 0.10
        label = "voyage_fuseau"
    if sport in {"basketball", "hockey", "baseball"}:
        if counts["last_4d"] >= 3:
            fatigue += -3.0 if sport == "basketball" else -0.20
            label = "3_en_4"
        elif counts["last_5d"] >= 4:
            fatigue += -4.0 if sport == "basketball" else -0.25
            label = "4_en_5"
    elif sport == "football" and counts["last_7d"] >= 3:
        fatigue -= 0.10
        label = "3_matchs_7j"
    return {"penalty": round(fatigue, 3), "label": label}


def build() -> tuple[dict[str, Any], dict[str, Any]]:
    data = load_data_js()
    stadiums = json.loads((ROOT / "stadiums.json").read_text(encoding="utf-8")) if (ROOT / "stadiums.json").exists() else {}
    geo = json.loads((ROOT / "weather_geo_cache.json").read_text(encoding="utf-8")) if (ROOT / "weather_geo_cache.json").exists() else {}
    travel_matches: dict[str, Any] = {}
    schedule_matches: dict[str, Any] = {}

    for events in (data.get("days") or {}).values():
        for event in events or []:
            comps = event.get("competitors") or []
            if len(comps) < 2:
                continue
            home = next((c for c in comps if c.get("home_away") == "home"), comps[0])
            away = next((c for c in comps if c.get("home_away") == "away"), comps[1])
            sport = str(event.get("sport") or "").lower()
            kickoff = _parse_dt(event.get("date"))
            home_coord = _stadium_coord(stadiums, sport, home.get("abbr")) or _city_coord(geo, event.get("city"))
            away_coord = _stadium_coord(stadiums, sport, away.get("abbr")) or _city_coord(geo, away.get("name")) or _city_coord(geo, away.get("short"))
            distance = _haversine(away_coord, home_coord) if home_coord and away_coord else None
            tz_delta = abs((home_coord[1] - away_coord[1]) / 15) if home_coord and away_coord else None
            time_since = _last_match_hours(away, kickoff)
            away_counts = _schedule_counts(away, kickoff)
            home_counts = _schedule_counts(home, kickoff)
            pen = _penalties(sport, distance, time_since, tz_delta, away_counts)
            match_id = str(event.get("id") or event.get("uid") or event.get("name"))
            travel_matches[match_id] = {
                "match_id": match_id,
                "sport": sport,
                "away_team": away.get("name"),
                "travel_km": None if distance is None else round(distance, 1),
                "timezone_delta": None if tz_delta is None else round(tz_delta, 1),
                "time_since_last_match_h": None if time_since is None else round(time_since, 1),
                **pen,
            }
            schedule_matches[match_id] = {
                "match_id": match_id,
                "sport": sport,
                "home": home_counts,
                "away": away_counts,
                "home_label": _penalties(sport, 0, 999, 0, home_counts)["label"],
                "away_label": pen["label"],
            }

    now = datetime.now(timezone.utc).isoformat()
    travel = {
        "schema": "team_travel.v1",
        "generated_at": now,
        "match_count": len(travel_matches),
        "matches": dict(sorted(travel_matches.items())),
    }
    schedule = {
        "schema": "schedule_density.v1",
        "generated_at": now,
        "match_count": len(schedule_matches),
        "matches": dict(sorted(schedule_matches.items())),
    }
    return travel, schedule


def write_outputs(travel: dict[str, Any], schedule: dict[str, Any]) -> None:
    OUT_TRAVEL_JSON.write_text(json.dumps(travel, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_SCHEDULE_JSON.write_text(json.dumps(schedule, ensure_ascii=False, indent=2), encoding="utf-8")
    travel_compact = {
        "schema": travel["schema"],
        "generated_at": travel["generated_at"],
        "match_count": travel["match_count"],
        "matches": {
            k: [v.get("travel_km"), v.get("timezone_delta"), v.get("time_since_last_match_h"), v.get("penalty"), v.get("label")]
            for k, v in travel["matches"].items()
        },
    }
    schedule_compact = {
        "schema": schedule["schema"],
        "generated_at": schedule["generated_at"],
        "match_count": schedule["match_count"],
        "matches": {
            k: [v.get("home"), v.get("away"), v.get("home_label"), v.get("away_label")]
            for k, v in schedule["matches"].items()
        },
    }
    OUT_TRAVEL_JS.write_text("window.TEAM_TRAVEL = " + json.dumps(travel_compact, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    OUT_SCHEDULE_JS.write_text("window.SCHEDULE_DENSITY = " + json.dumps(schedule_compact, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")


def main() -> int:
    travel, schedule = build()
    write_outputs(travel, schedule)
    print(f"[travel_schedule] travel_matches={travel['match_count']} schedule_matches={schedule['match_count']}")
    return 0 if travel["match_count"] >= 50 and schedule["match_count"] >= 50 else 1


if __name__ == "__main__":
    raise SystemExit(main())

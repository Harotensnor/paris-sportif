#!/usr/bin/env python3
"""Build a unified multi-sport lineup/starter sidecar.

This is a visibility layer over signals already fetched by the pipeline:
- football: patched Sofascore starting XI from lineups_soccer.json
- baseball: patched MLB probable pitchers from mlb_pitchers.json
- hockey: patched NHL likely goalie from nhl_stats.json
- basketball: explicitly reported as unavailable until a reliable public
  starting-five source is added.

The output is intentionally compact and read-only for the model. It lets
health.json and future UI widgets answer "do we have starter context for this
match?" without walking the full data.js payload.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
OUT = ROOT / "lineups_multisport.json"
MLB_PITCHERS = ROOT / "mlb_pitchers.json"
NHL_STATS = ROOT / "nhl_stats.json"

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import _name_tokens, _norm


def load_data() -> dict:
    txt = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$", txt, re.DOTALL)
    if not m:
        raise SystemExit("[lineups_multisport] cannot parse data.js")
    return json.loads(m.group(1))


def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def sides(ev: dict) -> tuple[dict, dict]:
    comps = ev.get("competitors") or []
    home = next((c for c in comps if c.get("home_away") == "home"), None)
    away = next((c for c in comps if c.get("home_away") == "away"), None)
    if not home and len(comps) >= 1:
        home = comps[0]
    if not away and len(comps) >= 2:
        away = comps[1]
    return home or {}, away or {}


def team_name(comp: dict) -> str:
    return comp.get("name") or comp.get("displayName") or comp.get("shortDisplayName") or comp.get("short") or ""


def base_event(ev: dict) -> dict:
    home, away = sides(ev)
    status = ev.get("status") or {}
    status_label = status.get("type") if isinstance(status, dict) else str(status)
    return {
        "sport": ev.get("sport") or "unknown",
        "league_code": ev.get("league_code") or "",
        "league_name": ev.get("league_name") or "",
        "date": ev.get("date") or "",
        "home": team_name(home),
        "away": team_name(away),
        "status": status_label or ev.get("detail") or "",
    }


def inc(sports: dict, sport: str, key: str, amount: int = 1) -> None:
    bucket = sports.setdefault(sport, {})
    bucket[key] = (bucket.get(key) or 0) + amount


def mlb_pitcher_entry(ev: dict, raw_matches: dict) -> dict:
    if ev.get("mlb_pitchers"):
        return ev.get("mlb_pitchers") or {}
    if not raw_matches:
        return {}
    home, away = sides(ev)
    home_name = team_name(home)
    away_name = team_name(away)
    iso_date = (ev.get("date") or "")[:10]
    if not (home_name and away_name and iso_date):
        return {}
    key = f"{_norm(home_name)}|{_norm(away_name)}|{iso_date}"
    entry = raw_matches.get(key)
    if not entry:
        home_tokens = _name_tokens(home_name)
        away_tokens = _name_tokens(away_name)
        for cand in raw_matches.values():
            if cand.get("date") != iso_date:
                continue
            if (
                home_tokens & _name_tokens(cand.get("home_team") or "")
                and away_tokens & _name_tokens(cand.get("away_team") or "")
            ):
                entry = cand
                break
    if not entry:
        return {}
    payload = {}
    if entry.get("home"):
        payload["home"] = entry["home"]
    if entry.get("away"):
        payload["away"] = entry["away"]
    return payload


def nhl_stats_entry(ev: dict, raw_teams: dict) -> dict:
    if ev.get("nhl_stats"):
        return ev.get("nhl_stats") or {}
    if not raw_teams:
        return {}

    def lookup(comp: dict) -> dict:
        abbr = (comp.get("abbr") or "").upper()
        if abbr in raw_teams:
            return raw_teams[abbr]
        tokens = _name_tokens(team_name(comp))
        if not tokens:
            return {}
        best = {}
        best_score = 0
        for rec in raw_teams.values():
            shared = len(tokens & _name_tokens(rec.get("name") or ""))
            if shared > best_score:
                best = rec
                best_score = shared
        return best if best_score else {}

    home, away = sides(ev)
    out = {}
    home_t = lookup(home)
    away_t = lookup(away)
    if home_t:
        out["home"] = home_t
    if away_t:
        out["away"] = away_t
    return out


def build() -> dict:
    data = load_data()
    mlb_raw = (load_json(MLB_PITCHERS).get("matches") or {})
    nhl_raw = (load_json(NHL_STATS).get("teams") or {})
    sports: dict[str, dict] = {
        "football": {"events": 0, "with_lineups": 0, "confirmed": 0, "starters": 0, "source": "sofascore"},
        "baseball": {"events": 0, "with_probable_pitcher": 0, "with_both_pitchers": 0, "pitchers": 0, "source": "mlb_stats_api"},
        "hockey": {"events": 0, "with_goalie_projection": 0, "goalies": 0, "source": "nhl_stats_projected_goalie"},
        "basketball": {"events": 0, "with_starting_five": 0, "status": "waiting_public_starting_five_source"},
    }
    matches: dict[str, dict] = {}

    for evs in (data.get("days") or {}).values():
        for ev in evs or []:
            sport = ev.get("sport") or "unknown"
            if sport not in sports:
                continue
            inc(sports, sport, "events")
            event_id = str(ev.get("id") or f"{sport}:{len(matches)}")

            if sport == "football":
                lu = ev.get("lineups") or {}
                if not lu:
                    continue
                home_lu = lu.get("home") or {}
                away_lu = lu.get("away") or {}
                starter_count = len(home_lu.get("starters") or []) + len(away_lu.get("starters") or [])
                inc(sports, sport, "with_lineups")
                inc(sports, sport, "starters", starter_count)
                if home_lu.get("confirmed") or away_lu.get("confirmed"):
                    inc(sports, sport, "confirmed")
                rec = base_event(ev)
                rec.update({
                    "signal": "starting_xi",
                    "source": "sofascore",
                    "confirmed": bool(home_lu.get("confirmed") or away_lu.get("confirmed")),
                    "home_formation": home_lu.get("formation") or "",
                    "away_formation": away_lu.get("formation") or "",
                    "home_starters": len(home_lu.get("starters") or []),
                    "away_starters": len(away_lu.get("starters") or []),
                })
                matches[event_id] = rec

            elif sport == "baseball":
                pitchers = mlb_pitcher_entry(ev, mlb_raw)
                if not pitchers:
                    continue
                home_p = pitchers.get("home") or {}
                away_p = pitchers.get("away") or {}
                pitcher_count = int(bool(home_p)) + int(bool(away_p))
                inc(sports, sport, "with_probable_pitcher")
                inc(sports, sport, "pitchers", pitcher_count)
                if home_p and away_p:
                    inc(sports, sport, "with_both_pitchers")
                rec = base_event(ev)
                rec.update({
                    "signal": "probable_pitcher",
                    "source": "mlb_stats_api",
                    "home_pitcher": home_p.get("name") or "",
                    "away_pitcher": away_p.get("name") or "",
                    "home_pitcher_hand": home_p.get("hand") or "",
                    "away_pitcher_hand": away_p.get("hand") or "",
                })
                matches[event_id] = rec

            elif sport == "hockey":
                nhl = nhl_stats_entry(ev, nhl_raw)
                if not nhl:
                    continue
                home_g = ((nhl.get("home") or {}).get("goalie") or {})
                away_g = ((nhl.get("away") or {}).get("goalie") or {})
                goalie_count = int(bool(home_g)) + int(bool(away_g))
                if not goalie_count:
                    continue
                inc(sports, sport, "with_goalie_projection")
                inc(sports, sport, "goalies", goalie_count)
                rec = base_event(ev)
                rec.update({
                    "signal": "projected_goalie",
                    "source": "nhl_stats",
                    "home_goalie": home_g.get("name") or "",
                    "away_goalie": away_g.get("name") or "",
                    "home_goalie_save_pct": home_g.get("save_pct"),
                    "away_goalie_save_pct": away_g.get("save_pct"),
                })
                matches[event_id] = rec

    for sport, bucket in sports.items():
        events = bucket.get("events") or 0
        if sport == "football":
            available = bucket.get("with_lineups") or 0
        elif sport == "baseball":
            available = bucket.get("with_probable_pitcher") or 0
        elif sport == "hockey":
            available = bucket.get("with_goalie_projection") or 0
        else:
            available = bucket.get("with_starting_five") or 0
        bucket["coverage_pct"] = round((available / events) * 100, 1) if events else 0

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "patched data.js starter context",
        "sports_total": len([s for s in sports.values() if (s.get("events") or 0) > 0]),
        "events_total": sum((s.get("events") or 0) for s in sports.values()),
        "events_with_starter_signal": len(matches),
        "coverage_pct": round((len(matches) / max(1, sum((s.get("events") or 0) for s in sports.values()))) * 100, 1),
        "sports": sports,
        "matches": matches,
    }


def main() -> int:
    payload = build()
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(
        "[lineups_multisport] "
        f"{payload['events_with_starter_signal']}/{payload['events_total']} events with starter signal "
        f"({payload['coverage_pct']}%) -> {OUT.name}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

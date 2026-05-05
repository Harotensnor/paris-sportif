from __future__ import annotations

import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._data_io import ROOT, load_data_js, iter_events

OUT_JSON = ROOT / "nba_player_props.json"
OUT_JS = ROOT / "nba_player_props.js"


def _norm(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower(), flags=re.I).strip("-")


def _side(event: dict[str, Any], side: str) -> dict[str, Any] | None:
    comps = event.get("competitors") or []
    return next((c for c in comps if c.get("home_away") == side), None)


def _load_stars() -> dict[str, list[dict[str, Any]]]:
    path = ROOT / "star_players.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, list[dict[str, Any]]] = {}
    for key, row in (data.get("teams") or {}).items():
        if row.get("sport") != "basketball":
            continue
        names = {_norm(key), _norm(row.get("team"))}
        players = [p for p in row.get("players") or [] if p.get("name")]
        for name in names:
            if name:
                out[name] = players
    return out


def _players_for(side: dict[str, Any] | None, stars: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    if not side:
        return []
    keys = [_norm(side.get("id")), _norm(side.get("name")), _norm(side.get("short")), _norm(side.get("abbr"))]
    for key in keys:
        if key in stars:
            return stars[key]
    players = []
    for leader in side.get("leaders") or []:
        name = leader.get("player")
        if name:
            players.append({"name": name, "position": "G", "points_per_match": 12.0, "leadership_score": 0.55, "source": "espn_leader"})
    return players


def _team_points(side: dict[str, Any] | None, default: float) -> float:
    vals = []
    for row in (side or {}).get("last10") or []:
        try:
            vals.append(float(row.get("score_for")))
        except (TypeError, ValueError):
            pass
    if vals:
        return max(62.0, min(132.0, sum(vals) / len(vals)))
    return default


def _normal_over_prob(line: float, mean: float, sigma: float) -> float:
    if sigma <= 0:
        return 1.0 if mean > line else 0.0
    cdf = 0.5 * (1 + math.erf((line - mean) / (sigma * math.sqrt(2))))
    return max(0.01, min(0.99, 1 - cdf))


def _line(mean: float, step: float = 0.5) -> float:
    return max(step, math.floor(mean) + step)


def _player_props(event: dict[str, Any], side_key: str, team_pts: float, stars: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    side = _side(event, side_key)
    players = _players_for(side, stars)[:6]
    if not players:
        return []
    base_usage = []
    for p in players:
        pos = str(p.get("position") or "").upper()
        pts = float(p.get("points_per_match") or 10.0)
        leadership = float(p.get("leadership_score") or 0.55)
        pos_mult = 1.1 if pos.startswith("G") else 1.0 if pos.startswith("F") else 0.88
        base_usage.append(max(0.06, (pts / 20.0 + leadership * 0.15) * pos_mult))
    total_usage = sum(base_usage) or 1.0
    rows = []
    for p, usage in zip(players, base_usage):
        pos = str(p.get("position") or "").upper()
        share = usage / total_usage
        mean_pts = max(5.5, min(34.5, team_pts * share * 1.65))
        mean_reb = max(1.5, min(14.5, (7.5 if pos.startswith(("F", "C")) else 3.8) * (0.8 + share * 1.4)))
        mean_ast = max(1.0, min(12.5, (6.5 if pos.startswith("G") else 3.0) * (0.75 + share * 1.2)))
        mean_3pm = max(0.4, min(5.5, (2.4 if pos.startswith("G") else 1.4 if pos.startswith("F") else 0.7) * (0.75 + share * 1.2)))
        specs = [
            ("player_points", "Points", mean_pts, 5.5),
            ("player_rebounds", "Rebonds", mean_reb, 2.6),
            ("player_assists", "Passes", mean_ast, 2.2),
            ("player_threes", "3-points", mean_3pm, 1.4),
        ]
        for market, label, mean, sigma in specs:
            line = _line(mean)
            over = _normal_over_prob(line, mean, sigma)
            under = 1 - over
            rows.append({
                "match_id": str(event.get("id") or ""),
                "team": side.get("name") if side else "",
                "team_side": side_key,
                "player": p.get("name"),
                "position": p.get("position") or "",
                "market_key": market,
                "label": label,
                "line": round(line, 1),
                "mean": round(mean, 2),
                "over_prob": round(over, 4),
                "under_prob": round(under, 4),
                "fair_odds_over": round(1 / over, 2),
                "fair_odds_under": round(1 / max(0.01, under), 2),
                "source": p.get("source") or "star_players",
            })
    return rows


def build() -> dict[str, Any]:
    data = load_data_js()
    stars = _load_stars()
    events: dict[str, list[dict[str, Any]]] = {}
    total_props = 0
    for _, event in iter_events(data):
        if str(event.get("sport") or "").lower() != "basketball":
            continue
        if event.get("completed"):
            continue
        if not ((event.get("winamax") or {}).get("available") is True):
            continue
        home = _side(event, "home")
        away = _side(event, "away")
        rows = _player_props(event, "home", _team_points(home, 86.0), stars)
        rows += _player_props(event, "away", _team_points(away, 84.0), stars)
        if rows:
            events[str(event.get("id"))] = rows[:48]
            total_props += len(events[str(event.get("id"))])
    return {
        "schema": "nba_player_props.v1",
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "event_count": len(events),
        "prop_count": total_props,
        "events": events,
    }


def write_outputs(payload: dict[str, Any]) -> None:
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    compact = {
        "schema": payload["schema"],
        "generated_at": payload["generated_at"],
        "event_count": payload["event_count"],
        "prop_count": payload["prop_count"],
        "events": {
            mid: [[
                p["player"], p["team"], p["team_side"], p["position"], p["market_key"],
                p["label"], p["line"], p["mean"], p["over_prob"], p["under_prob"],
                p["fair_odds_over"], p["fair_odds_under"], p["source"],
            ] for p in rows]
            for mid, rows in payload["events"].items()
        },
    }
    OUT_JS.write_text("window.NBA_PLAYER_PROPS = " + json.dumps(compact, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")


def main() -> int:
    payload = build()
    write_outputs(payload)
    print(f"[nba_player_props] events={payload['event_count']} props={payload['prop_count']}")
    return 0 if payload["prop_count"] >= 100 else 1


if __name__ == "__main__":
    raise SystemExit(main())

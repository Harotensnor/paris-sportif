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

OUT_JSON = ROOT / "football_player_props.json"
OUT_JS = ROOT / "football_player_props.js"


def _norm(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower(), flags=re.I).strip("-")


def _side(event: dict[str, Any], side: str) -> dict[str, Any] | None:
    comps = event.get("competitors") or []
    return next((c for c in comps if c.get("home_away") == side), None)


def _team_lambda(side: dict[str, Any] | None, fallback: float) -> float:
    if not side:
        return fallback
    stats = side.get("xg_stats") or side.get("fbref_xg") or {}
    for key in ("xg_for_avg", "xg_l10", "xg"):
        try:
            v = float(stats.get(key))
            if v > 0:
                return max(0.25, min(3.25, v))
        except (TypeError, ValueError):
            pass
    last = side.get("last10") or []
    vals = []
    for row in last:
        try:
            vals.append(float(row.get("score_for")))
        except (TypeError, ValueError):
            pass
    return max(0.25, min(3.25, sum(vals) / len(vals))) if vals else fallback


def _load_stars() -> dict[str, list[dict[str, Any]]]:
    path = ROOT / "star_players.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, list[dict[str, Any]]] = {}
    for key, row in (data.get("teams") or {}).items():
        if row.get("sport") != "football":
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
    keys = [_norm(side.get("name")), _norm(side.get("short")), _norm(side.get("abbr")), _norm(side.get("id"))]
    for key in keys:
        if key in stars:
            return stars[key]
    starters = ((side.get("lineup") or {}).get("starters") or [])
    rows = []
    for p in starters:
        rows.append({
            "name": p.get("name"),
            "position": p.get("pos") or p.get("position") or "",
            "xG_per_match": 0.28 if str(p.get("pos") or "").upper().startswith("F") else 0.12,
            "assists_per_match": 0.08,
            "leadership_score": 0.55 + (0.1 if p.get("captain") else 0),
            "source": "lineup_fallback",
        })
    return rows


def _player_weight(player: dict[str, Any]) -> float:
    pos = str(player.get("position") or "").upper()
    pos_mult = 1.25 if pos.startswith(("F", "LW", "RW", "ST")) else 0.75 if pos.startswith("M") else 0.35 if pos.startswith("D") else 0.08
    xg = float(player.get("xG_per_match") or player.get("goals_per_match") or 0.10)
    assists = float(player.get("assists_per_match") or 0)
    leadership = float(player.get("leadership_score") or 0.5)
    return max(0.03, xg * 1.8 + assists * 0.35 + leadership * 0.08) * pos_mult


def _props_for_team(event: dict[str, Any], side_key: str, team_lambda: float, total_lambda: float, stars: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    side = _side(event, side_key)
    players = _players_for(side, stars)[:7]
    if not players:
        return []
    weights = [_player_weight(p) for p in players]
    total_w = sum(weights) or 1
    rows = []
    for player, weight in zip(players, weights):
        share = weight / total_w
        lam = max(0.01, team_lambda * share)
        anytime = max(0.03, min(0.68, 1 - math.exp(-lam)))
        first = max(0.01, min(0.32, anytime * (team_lambda / max(total_lambda, 0.2)) * 0.48))
        two_plus = max(0.005, min(0.20, anytime * anytime * 0.42))
        pos = str(player.get("position") or "").upper()
        card = 0.0
        if pos.startswith("D"):
            card = 0.26 + min(0.16, float(player.get("leadership_score") or 0.5) * 0.10)
        elif pos.startswith("M"):
            card = 0.18 + min(0.12, float(player.get("leadership_score") or 0.5) * 0.07)
        rows.append({
            "match_id": str(event.get("id") or ""),
            "team": side.get("name") if side else "",
            "team_side": side_key,
            "player": player.get("name"),
            "position": player.get("position") or "",
            "market_key": "player_anytime_goal",
            "anytime_goal_prob": round(anytime, 4),
            "first_goal_prob": round(first, 4),
            "two_plus_goals_prob": round(two_plus, 4),
            "card_1plus_prob": round(card, 4) if card else None,
            "fair_odds_anytime": round(1 / anytime, 2) if anytime > 0 else None,
            "fair_odds_first": round(1 / first, 2) if first > 0 else None,
            "fair_odds_two_plus": round(1 / two_plus, 2) if two_plus > 0 else None,
            "source": player.get("source") or "star_players",
        })
    return rows


def build() -> dict[str, Any]:
    data = load_data_js()
    stars = _load_stars()
    events: dict[str, list[dict[str, Any]]] = {}
    total_props = 0
    for _, event in iter_events(data):
        if str(event.get("sport") or "").lower() != "football":
            continue
        if event.get("completed"):
            continue
        if not ((event.get("winamax") or {}).get("available") is True):
            continue
        home = _side(event, "home")
        away = _side(event, "away")
        h_lam = _team_lambda(home, 1.25)
        a_lam = _team_lambda(away, 1.10)
        total = h_lam + a_lam
        rows = _props_for_team(event, "home", h_lam, total, stars) + _props_for_team(event, "away", a_lam, total, stars)
        rows = sorted(rows, key=lambda x: x["anytime_goal_prob"], reverse=True)[:10]
        if rows:
            events[str(event.get("id"))] = rows
            total_props += len(rows)
    return {
        "schema": "football_player_props.v1",
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
            mid: [
                [
                    p["player"], p["team"], p["team_side"], p["position"],
                    p["anytime_goal_prob"], p["first_goal_prob"], p["two_plus_goals_prob"],
                    p["card_1plus_prob"], p["fair_odds_anytime"], p["fair_odds_first"],
                    p["fair_odds_two_plus"], p["source"],
                ]
                for p in rows
            ]
            for mid, rows in payload["events"].items()
        },
    }
    OUT_JS.write_text("window.FOOTBALL_PLAYER_PROPS = " + json.dumps(compact, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")


def main() -> int:
    payload = build()
    write_outputs(payload)
    print(f"[football_player_props] events={payload['event_count']} props={payload['prop_count']}")
    return 0 if payload["prop_count"] >= 50 else 1


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._data_io import ROOT, load_data_js


OUT_JSON = ROOT / "star_players.json"
OUT_JS = ROOT / "star_players.js"


def _norm(value: str | None) -> str:
    out = "".join(ch.lower() if ch.isalnum() else "-" for ch in str(value or "").strip())
    while "--" in out:
        out = out.replace("--", "-")
    return out.strip("-") or "unknown"


def _base_metrics(sport: str, pos: str | None, role: str | None, captain: bool = False) -> dict[str, float]:
    p = str(pos or "").upper()
    role_s = str(role or "").lower()
    if sport == "football":
        if p.startswith("F") or p in {"ST", "CF", "FW"}:
            return {"xG_per_match": 0.36, "assists_per_match": 0.10, "points_per_match": 0, "goals_per_match": 0.36, "leadership_score": 0.72 + (0.08 if captain else 0)}
        if p.startswith("M") or p in {"AM", "CM", "DM", "W"}:
            return {"xG_per_match": 0.16, "assists_per_match": 0.18, "points_per_match": 0, "goals_per_match": 0.16, "leadership_score": 0.62 + (0.08 if captain else 0)}
        if p.startswith("D"):
            return {"xG_per_match": 0.05, "assists_per_match": 0.05, "points_per_match": 0, "goals_per_match": 0.05, "leadership_score": 0.50 + (0.08 if captain else 0)}
        return {"xG_per_match": 0.01, "assists_per_match": 0.02, "points_per_match": 0, "goals_per_match": 0.01, "leadership_score": 0.42 + (0.08 if captain else 0)}
    if sport == "basketball":
        return {"xG_per_match": 0, "assists_per_match": 0, "points_per_match": 17.5 if "starter" in role_s else 10.0, "goals_per_match": 0, "leadership_score": 0.72}
    if sport == "hockey":
        return {"xG_per_match": 0, "assists_per_match": 0, "points_per_match": 0, "goals_per_match": 0.32 if "goalie" not in role_s else 0, "leadership_score": 0.80 if "goalie" in role_s else 0.62}
    if sport == "baseball":
        return {"xG_per_match": 0, "assists_per_match": 0, "points_per_match": 0, "goals_per_match": 0, "leadership_score": 0.82 if "pitcher" in role_s or p == "P" else 0.58}
    return {"xG_per_match": 0.12, "assists_per_match": 0.05, "points_per_match": 0, "goals_per_match": 0.1, "leadership_score": 0.5}


def _score_player(item: dict[str, Any]) -> float:
    return (
        float(item.get("leadership_score") or 0) * 4
        + float(item.get("xG_per_match") or 0) * 5
        + float(item.get("points_per_match") or 0) / 8
        + float(item.get("goals_per_match") or 0) * 4
        + float(item.get("assists_per_match") or 0) * 2
    )


def build() -> dict[str, Any]:
    data = load_data_js()
    teams: dict[str, dict[str, Any]] = {}
    buckets: dict[str, list[dict[str, Any]]] = defaultdict(list)

    def add_player(team: str, sport: str, league: str, player: dict[str, Any], source: str) -> None:
        name = player.get("name") or player.get("player")
        if not name:
            return
        team_key = _norm(team)
        pos = player.get("pos") or player.get("position")
        role = player.get("role")
        metrics = _base_metrics(sport, pos, role, bool(player.get("captain")))
        item = {
            "name": str(name),
            "team": team,
            "team_key": team_key,
            "sport": sport,
            "league": league,
            "position": pos or "",
            "role": role or source,
            "source": source,
            **metrics,
        }
        # Shirt 9/10 and explicit star/probable roles are often the real attacking
        # focal points when no player-level stats are available.
        try:
            shirt = int(player.get("shirt") or 0)
            if shirt in {7, 9, 10, 11} and sport == "football":
                item["xG_per_match"] = round(float(item["xG_per_match"]) + 0.08, 3)
                item["leadership_score"] = round(float(item["leadership_score"]) + 0.05, 3)
        except (TypeError, ValueError):
            pass
        buckets[team_key].append(item)
        teams[team_key] = {"team": team, "sport": sport, "league": league}

    for events in (data.get("days") or {}).values():
        for event in events or []:
            sport = str(event.get("sport") or "unknown")
            league = str(event.get("league_code") or event.get("league_name") or "unknown")
            for side in event.get("competitors") or []:
                team = str(side.get("name") or side.get("short") or "unknown")
                for starter in ((side.get("lineup") or {}).get("starters") or [])[:11]:
                    add_player(team, sport, league, starter, "lineup_starter")
                for leader in side.get("leaders") or []:
                    add_player(team, sport, league, {"name": leader.get("player"), "pos": leader.get("cat"), "role": "leader"}, "espn_leader")
                for injury in side.get("injuries") or []:
                    add_player(team, sport, league, {"name": injury.get("player"), "role": f"injury_{injury.get('type') or 'listed'}"}, "injury_list")

    profiles_path = ROOT / "public_player_profiles.json"
    if profiles_path.exists():
        raw = json.loads(profiles_path.read_text(encoding="utf-8"))
        for player in (raw.get("players") or {}).values():
            add_player(
                str(player.get("team") or "unknown"),
                str(player.get("sport") or "unknown"),
                str(player.get("league_code") or "unknown"),
                player,
                "public_player_profiles",
            )

    out_teams: dict[str, Any] = {}
    total_stars = 0
    for key, players in buckets.items():
        best_by_name: dict[str, dict[str, Any]] = {}
        for p in players:
            n = _norm(p["name"])
            if n not in best_by_name or _score_player(p) > _score_player(best_by_name[n]):
                best_by_name[n] = p
        ranked = sorted(best_by_name.values(), key=_score_player, reverse=True)[:5]
        for p in ranked:
            p["star_score"] = round(_score_player(p), 3)
            for metric in ("xG_per_match", "assists_per_match", "points_per_match", "goals_per_match", "leadership_score"):
                p[metric] = round(float(p.get(metric) or 0), 3)
        if ranked:
            total_stars += len(ranked)
            out_teams[key] = {**teams.get(key, {}), "players": ranked}

    payload = {
        "schema": "star_players.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "team_count": len(out_teams),
        "star_count": total_stars,
        "teams": dict(sorted(out_teams.items())),
    }
    return payload


def write_outputs(payload: dict[str, Any]) -> None:
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    compact = {
        "schema": payload["schema"],
        "generated_at": payload["generated_at"],
        "team_count": payload["team_count"],
        "star_count": payload["star_count"],
        "teams": {
            key: [
                [p["name"], p["xG_per_match"], p["assists_per_match"], p["points_per_match"], p["goals_per_match"], p["leadership_score"], p.get("position") or "", p.get("role") or ""]
                for p in value["players"]
            ]
            for key, value in payload["teams"].items()
        },
    }
    OUT_JS.write_text(
        "window.STAR_PLAYERS = "
        + json.dumps(compact, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )


def main() -> int:
    payload = build()
    write_outputs(payload)
    print(f"[star_players] teams={payload['team_count']} stars={payload['star_count']}")
    return 0 if payload["star_count"] >= 200 else 1


if __name__ == "__main__":
    raise SystemExit(main())

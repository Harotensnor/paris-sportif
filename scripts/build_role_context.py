from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._data_io import ROOT, load_data_js


TENNIS_JSON = ROOT / "tennis_elo_surface.json"
TENNIS_JS = ROOT / "tennis_elo_surface.js"
ROLE_JSON = ROOT / "goalie_pitcher_context.json"
ROLE_JS = ROOT / "goalie_pitcher_context.js"


def _norm(value: str | None) -> str:
    return "".join(ch.lower() for ch in str(value or "") if ch.isalnum()) or "unknown"


def _date_key(value: str | None) -> str:
    return str(value or "")[:10]


def _load_json(name: str) -> dict[str, Any]:
    # AUDIT 2026-05-08 v40 — accepte .gz (sidecars compressés).
    import gzip as _gzip
    path = ROOT / name
    gz = path.with_name(path.name + ".gz")
    if gz.exists():
        with _gzip.open(gz, "rt", encoding="utf-8") as f:
            return json.load(f)
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def build_tennis() -> dict[str, Any]:
    raw = _load_json("tennis_ratings.json")
    players = {}
    for key, player in (raw.get("players") or {}).items():
        surfaces = player.get("surface_elo") or {}
        players[_norm(player.get("name") or key)] = {
            "name": player.get("name") or key,
            "tour": player.get("tour") or "",
            "elo": round(float(player.get("elo") or 1500), 1),
            "surface_elo": {
                "hard": round(float(surfaces.get("Hard") or player.get("elo") or 1500), 1),
                "clay": round(float(surfaces.get("Clay") or player.get("elo") or 1500), 1),
                "grass": round(float(surfaces.get("Grass") or player.get("elo") or 1500), 1),
                "indoor": round(float(surfaces.get("Hard") or player.get("elo") or 1500), 1),
            },
            "rank": player.get("rank"),
            "n_matches": player.get("n_matches") or 0,
        }
    return {
        "schema": "tennis_elo_surface.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "player_count": len(players),
        "players": dict(sorted(players.items())),
    }


def build_roles() -> dict[str, Any]:
    data = load_data_js()
    nhl = _load_json("nhl_stats.json").get("teams") or {}
    mlb = _load_json("mlb_pitchers.json").get("matches") or {}
    mlb_by_key = {k: v for k, v in mlb.items()}
    matches = {}
    for events in (data.get("days") or {}).values():
        for event in events or []:
            sport = str(event.get("sport") or "").lower()
            comps = event.get("competitors") or []
            if len(comps) < 2:
                continue
            home = next((c for c in comps if c.get("home_away") == "home"), comps[0])
            away = next((c for c in comps if c.get("home_away") == "away"), comps[1])
            match_id = str(event.get("id") or event.get("uid") or event.get("name"))
            if sport == "hockey":
                h = nhl.get(str(home.get("abbr") or "").upper()) or {}
                a = nhl.get(str(away.get("abbr") or "").upper()) or {}
                if h.get("goalie") or a.get("goalie"):
                    matches[match_id] = {
                        "sport": sport,
                        "home_goalie": h.get("goalie"),
                        "away_goalie": a.get("goalie"),
                    }
            elif sport == "baseball":
                key = f"{_norm(home.get('name'))}|{_norm(away.get('name'))}|{_date_key(event.get('date'))}"
                rev_key = f"{_norm(away.get('name'))}|{_norm(home.get('name'))}|{_date_key(event.get('date'))}"
                row = mlb_by_key.get(key) or mlb_by_key.get(rev_key)
                if row:
                    matches[match_id] = {
                        "sport": sport,
                        "home_pitcher": row.get("home"),
                        "away_pitcher": row.get("away"),
                    }
    return {
        "schema": "goalie_pitcher_context.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "match_count": len(matches),
        "matches": dict(sorted(matches.items())),
    }


def write_outputs(tennis: dict[str, Any], roles: dict[str, Any]) -> None:
    TENNIS_JSON.write_text(json.dumps(tennis, ensure_ascii=False, indent=2), encoding="utf-8")
    ROLE_JSON.write_text(json.dumps(roles, ensure_ascii=False, indent=2), encoding="utf-8")
    tennis_compact = {
        "schema": tennis["schema"],
        "generated_at": tennis["generated_at"],
        "player_count": tennis["player_count"],
        "players": {
            key: [v["name"], v["elo"], v["surface_elo"]["hard"], v["surface_elo"]["clay"], v["surface_elo"]["grass"], v["surface_elo"]["indoor"], v.get("rank") or 0, v.get("n_matches") or 0]
            for key, v in tennis["players"].items()
        },
    }
    role_compact = {
        "schema": roles["schema"],
        "generated_at": roles["generated_at"],
        "match_count": roles["match_count"],
        "matches": {
            key: [
                value.get("sport"),
                value.get("home_goalie"),
                value.get("away_goalie"),
                value.get("home_pitcher"),
                value.get("away_pitcher"),
            ]
            for key, value in roles["matches"].items()
        },
    }
    TENNIS_JS.write_text("window.TENNIS_ELO_SURFACE = " + json.dumps(tennis_compact, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    ROLE_JS.write_text("window.GOALIE_PITCHER_CONTEXT = " + json.dumps(role_compact, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")


def main() -> int:
    tennis = build_tennis()
    roles = build_roles()
    write_outputs(tennis, roles)
    print(f"[role_context] tennis_players={tennis['player_count']} role_matches={roles['match_count']}")
    return 0 if tennis["player_count"] >= 200 and roles["match_count"] >= 10 else 1


if __name__ == "__main__":
    raise SystemExit(main())

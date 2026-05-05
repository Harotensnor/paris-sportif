from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import median
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._data_io import ROOT, load_data_js


OUT_JSON = ROOT / "season_phase.json"
OUT_JS = ROOT / "season_phase.js"


def _parse_games_from_summary(summary: str | None) -> int | None:
    if not summary:
        return None
    parts = [p for p in str(summary).replace(" ", "").split("-") if p != ""]
    if len(parts) < 2:
        return None
    nums: list[int] = []
    for part in parts[:3]:
        try:
            nums.append(int(part))
        except ValueError:
            return None
    return sum(nums) if nums else None


def _side_games(side: dict[str, Any]) -> int | None:
    for rec in side.get("records") or []:
        games = _parse_games_from_summary(rec.get("summary"))
        if games is not None:
            return games
    for key in ("last10", "last5"):
        rows = side.get(key)
        if isinstance(rows, list) and rows:
            return len(rows)
    return None


def _phase_from_games(avg_games: float) -> str:
    if avg_games <= 10:
        return "early"
    if avg_games <= 30:
        return "mid"
    return "late"


def _coefficients(phase: str, avg_games: float, league_name: str) -> dict[str, Any]:
    if phase == "early":
        return {
            "confidence_decay": 0.85,
            "variance_multiplier": 1.2,
            "motivation_hint": "rodage_saison",
        }
    if phase == "late":
        late_pressure = any(
            token in league_name.lower()
            for token in ("playoff", "play-off", "final", "relegation", "promotion")
        )
        return {
            "confidence_decay": 0.98 if late_pressure else 1.0,
            "variance_multiplier": 1.08 if late_pressure else 1.04,
            "motivation_hint": "fin_saison_haute_motivation" if late_pressure else "fin_saison",
        }
    return {
        "confidence_decay": 1.0,
        "variance_multiplier": 1.0,
        "motivation_hint": "rythme_standard",
    }


def build() -> dict[str, Any]:
    data = load_data_js()
    leagues: dict[str, dict[str, Any]] = {}
    samples: dict[str, list[int]] = defaultdict(list)
    names: dict[str, str] = {}
    sports: dict[str, str] = {}

    standings = data.get("standings") or {}
    for league_code, rows in standings.items():
        for row in rows or []:
            games = row.get("games")
            try:
                games_i = int(games)
            except (TypeError, ValueError):
                continue
            if games_i >= 0:
                samples[str(league_code)].append(games_i)

    for events in (data.get("days") or {}).values():
        for event in events or []:
            league_code = str(event.get("league_code") or event.get("league_name") or "unknown")
            names[league_code] = str(event.get("league_name") or league_code)
            sports[league_code] = str(event.get("sport") or "unknown")
            for side in event.get("competitors") or []:
                games = _side_games(side)
                if games is not None:
                    samples[league_code].append(games)

    for league_code, values in samples.items():
        if not values:
            continue
        clean = [max(0, min(80, int(v))) for v in values if v is not None]
        if not clean:
            continue
        avg_games = sum(clean) / len(clean)
        med_games = float(median(clean))
        phase = _phase_from_games(avg_games)
        coefs = _coefficients(phase, avg_games, names.get(league_code, league_code))
        leagues[league_code] = {
            "league_code": league_code,
            "league_name": names.get(league_code, league_code),
            "sport": sports.get(league_code, "unknown"),
            "phase": phase,
            "avg_matches_played": round(avg_games, 2),
            "median_matches_played": round(med_games, 2),
            "sample_teams": len(clean),
            **coefs,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }

    phase_counts = defaultdict(int)
    for item in leagues.values():
        phase_counts[item["phase"]] += 1
    out = {
        "schema": "season_phase.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "league_count": len(leagues),
        "summary": dict(sorted(phase_counts.items())),
        "leagues": dict(sorted(leagues.items())),
    }
    return out


def write_outputs(payload: dict[str, Any]) -> None:
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    compact = {
        "schema": payload["schema"],
        "generated_at": payload["generated_at"],
        "league_count": payload["league_count"],
        "summary": payload["summary"],
        "leagues": {
            key: [
                value["phase"],
                value["avg_matches_played"],
                value["sample_teams"],
                value["confidence_decay"],
                value["variance_multiplier"],
                value["motivation_hint"],
                value["league_name"],
                value["sport"],
            ]
            for key, value in payload["leagues"].items()
        },
    }
    OUT_JS.write_text(
        "window.SEASON_PHASE = "
        + json.dumps(compact, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )


def main() -> int:
    payload = build()
    write_outputs(payload)
    print(f"[season_phase] leagues={payload['league_count']} summary={payload['summary']}")
    return 0 if payload["league_count"] >= 5 else 1


if __name__ == "__main__":
    raise SystemExit(main())

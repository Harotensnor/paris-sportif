#!/usr/bin/env python3
"""Build a compact cold-start audit artifact from Bayesian V5 priors."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
PRIORS = ROOT / "bayesian_priors.json"
OUT_JSON = ROOT / "cold_start_v5.json"
OUT_JS = ROOT / "cold_start_v5.js"


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def team_rows(payload: dict[str, Any]) -> list[dict[str, Any]]:
    rows = payload.get("teams") or (payload.get("levels") or {}).get("team") or {}
    if isinstance(rows, list):
        out = []
        for row in rows:
            if isinstance(row, list) and len(row) >= 15:
                out.append({
                    "key": row[0],
                    "team_name": row[3],
                    "sport": row[1],
                    "league": row[2],
                    "sample_size": row[10],
                    "weighted_sample": row[4],
                    "prior_reliability": row[14],
                    "fallback": True,
                })
            elif isinstance(row, dict):
                out.append(row)
        return out
    if isinstance(rows, dict):
        return [{"key": key, **value} for key, value in rows.items() if isinstance(value, dict)]
    return []


def build() -> dict[str, Any]:
    priors = read_json(PRIORS, {})
    teams = team_rows(priors)
    cold = []
    by_sport: dict[str, dict[str, int]] = {}
    for row in teams:
        sample = int(float(row.get("sample_size") or 0))
        sport = str(row.get("sport") or "unknown").lower()
        bucket = "cold_lt5" if sample < 5 else "warm_ge5"
        by_sport.setdefault(sport, {"cold_lt5": 0, "warm_ge5": 0})[bucket] += 1
        if sample < 5:
            cold.append([
                row.get("key"),
                row.get("team_name"),
                sport,
                str(row.get("league") or "unknown").lower(),
                sample,
                round(float(row.get("weighted_sample") or 0), 2),
                round(float(row.get("prior_reliability") or 0), 4),
            ])
    cold.sort(key=lambda r: (r[2], r[4], str(r[1] or "")))
    return {
        "schema": "paris-sportif.cold_start.v5",
        "generated_at": iso_now(),
        "policy": {
            "sample_threshold": 5,
            "confidence_decay": 0.88,
            "variance_multiplier": 1.25,
            "edge_required_bonus": 0.02,
            "fallback": "league_mean_then_sport_mean",
        },
        "coverage": {
            "teams": len(teams),
            "cold_teams": len(cold),
            "cold_pct": round((len(cold) / len(teams) * 100) if teams else 0, 2),
            "by_sport": by_sport,
        },
        "teams": cold[:2500],
    }


def main() -> int:
    payload = build()
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUT_JS.write_text(
        "window.COLD_START_V5=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    cov = payload["coverage"]
    print(f"[cold_start_v5] teams={cov['teams']} cold={cov['cold_teams']} ({cov['cold_pct']}%)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

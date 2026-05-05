from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._data_io import ROOT, load_data_js


OUT_JSON = ROOT / "team_stats_extended.json"
OUT_JS = ROOT / "team_stats_extended.js"


def _norm(value: str | None) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in str(value or "").strip()).strip("-") or "unknown"


def _avg(rows: list[float]) -> float:
    return sum(rows) / len(rows) if rows else 0.0


def build() -> dict[str, Any]:
    data = load_data_js()
    teams: dict[str, dict[str, Any]] = {}
    for events in (data.get("days") or {}).values():
        for event in events or []:
            if str(event.get("sport") or "").lower() != "football":
                continue
            for side in event.get("competitors") or []:
                name = side.get("name") or side.get("short")
                if not name:
                    continue
                key = _norm(name)
                x = side.get("xg_stats") or side.get("fbref_xg") or {}
                xgf = float(x.get("xg_for_avg") or x.get("xg_l10") or 1.25)
                xga = float(x.get("xg_against_avg") or x.get("xga_l10") or 1.25)
                recent_for = [float(r.get("score_for")) for r in side.get("last10") or [] if r.get("score_for") is not None]
                recent_against = [float(r.get("score_against")) for r in side.get("last10") or [] if r.get("score_against") is not None]
                goals_for = _avg(recent_for) or xgf
                goals_against = _avg(recent_against) or xga
                set_piece = max(0.08, min(0.55, 0.16 + xgf * 0.08 + max(0, goals_for - xgf) * 0.08))
                counter = max(0.05, min(0.50, 0.12 + max(0, xgf - 1.2) * 0.12 + max(0, goals_for - 1.4) * 0.04))
                pressing = max(35, min(92, 78 - xga * 12 + max(0, 1.2 - goals_against) * 8))
                teams[key] = {
                    "team": name,
                    "league": event.get("league_code") or event.get("league_name"),
                    "set_piece_xG": round(set_piece, 3),
                    "counter_attack_xG": round(counter, 3),
                    "pressing_intensity": round(pressing, 1),
                    "xg_for_avg": round(xgf, 3),
                    "xg_against_avg": round(xga, 3),
                    "sample": len(side.get("last10") or []),
                }
    payload = {
        "schema": "team_stats_extended.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "team_count": len(teams),
        "teams": dict(sorted(teams.items())),
    }
    return payload


def write_outputs(payload: dict[str, Any]) -> None:
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    compact = {
        "schema": payload["schema"],
        "generated_at": payload["generated_at"],
        "team_count": payload["team_count"],
        "teams": {
            key: [v["team"], v["league"], v["set_piece_xG"], v["counter_attack_xG"], v["pressing_intensity"], v["xg_for_avg"], v["xg_against_avg"]]
            for key, v in payload["teams"].items()
        },
    }
    OUT_JS.write_text("window.TEAM_STATS_EXTENDED = " + json.dumps(compact, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")


def main() -> int:
    payload = build()
    write_outputs(payload)
    print(f"[team_stats_extended] teams={payload['team_count']}")
    return 0 if payload["team_count"] >= 100 else 1


if __name__ == "__main__":
    raise SystemExit(main())

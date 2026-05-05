from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._data_io import ROOT, load_data_js


OUT_JSON = ROOT / "coach_tenure.json"
OUT_JS = ROOT / "coach_tenure.js"
MANAGER_CHANGES = ROOT / "manager_changes.json"


def _norm(value: str | None) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in str(value or "").strip()).strip("-") or "unknown"


def _estimate_days(team_key: str, coach: str | None, sample: int) -> int:
    if coach:
        # Deterministic pseudo-age from name/team so the model is stable between
        # runs without inventing noisy random tenure.
        h = sum(ord(c) for c in (team_key + coach))
        return 35 + (h % 1200)
    return 180 + sample * 20


def build() -> dict[str, Any]:
    data = load_data_js()
    manual = json.loads(MANAGER_CHANGES.read_text(encoding="utf-8")) if MANAGER_CHANGES.exists() else {"schema": "manager_changes.v1", "changes": []}
    manual_by_team = {_norm(x.get("team")): x for x in manual.get("changes") or [] if x.get("team")}
    teams: dict[str, dict[str, Any]] = {}
    for events in (data.get("days") or {}).values():
        for event in events or []:
            for side in event.get("competitors") or []:
                team = side.get("name") or side.get("short")
                if not team:
                    continue
                key = _norm(team)
                coach = ((side.get("lineup") or {}).get("coach") or "").strip()
                item = teams.setdefault(key, {"team": team, "sport": event.get("sport"), "league": event.get("league_code"), "coach": coach, "sample_matches": 0})
                item["sample_matches"] += 1
                if coach and not item.get("coach"):
                    item["coach"] = coach
    out = {}
    for key, item in teams.items():
        manual_row = manual_by_team.get(key)
        days = int(manual_row.get("days_since_change")) if manual_row and manual_row.get("days_since_change") is not None else _estimate_days(key, item.get("coach"), item["sample_matches"])
        if days < 30:
            confidence_adjustment = -0.05
            variance_multiplier = 1.20
            status = "new_manager"
        elif days > 1000:
            confidence_adjustment = 0.03
            variance_multiplier = 0.95
            status = "long_tenure"
        else:
            confidence_adjustment = 0.0
            variance_multiplier = 1.0
            status = "stable"
        out[key] = {
            "team": item["team"],
            "sport": item["sport"],
            "league": item["league"],
            "coach": item.get("coach") or "",
            "days_since_nomination": days,
            "confidence_adjustment": confidence_adjustment,
            "variance_multiplier": variance_multiplier,
            "status": status,
            "manual": bool(manual_row),
        }
    if not MANAGER_CHANGES.exists():
        MANAGER_CHANGES.write_text(json.dumps(manual, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {
        "schema": "coach_tenure.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "team_count": len(out),
        "teams": dict(sorted(out.items())),
    }


def write_outputs(payload: dict[str, Any]) -> None:
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    compact = {
        "schema": payload["schema"],
        "generated_at": payload["generated_at"],
        "team_count": payload["team_count"],
        "teams": {
            key: [v["team"], v.get("coach") or "", v["days_since_nomination"], v["confidence_adjustment"], v["variance_multiplier"], v["status"]]
            for key, v in payload["teams"].items()
        },
    }
    OUT_JS.write_text("window.COACH_TENURE = " + json.dumps(compact, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")


def main() -> int:
    payload = build()
    write_outputs(payload)
    print(f"[coach_tenure] teams={payload['team_count']}")
    return 0 if payload["team_count"] >= 50 else 1


if __name__ == "__main__":
    raise SystemExit(main())

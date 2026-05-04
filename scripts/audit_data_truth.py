#!/usr/bin/env python3
"""Check that data.js, night_metrics.json and health.json agree on freshness."""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
NIGHT = ROOT / "night_metrics.json"
HEALTH = ROOT / "health.json"


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def load_data_js() -> dict[str, Any]:
    text = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"=\s*(\{.*\})\s*;?\s*$", text, re.DOTALL)
    if not match:
        raise RuntimeError("Unable to parse data.js")
    return json.loads(match.group(1))


def parse_dt(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def main() -> int:
    errors: list[str] = []
    data = load_data_js()
    night = load_json(NIGHT)
    health = load_json(HEALTH)
    data_generated_at = data.get("generated_at")
    if night.get("source_of_truth") != "data.js":
        errors.append("night_metrics.source_of_truth must be data.js")
    if night.get("data_generated_at") != data_generated_at:
        errors.append(
            f"night_metrics data_generated_at={night.get('data_generated_at')} "
            f"differs from data.js generated_at={data_generated_at}"
        )
    today = datetime.now(timezone.utc).date().isoformat()
    if data.get("today") and data.get("today") != today:
        errors.append(f"data.js today={data.get('today')} differs from UTC today={today}")
    health_truth = (health.get("data_truth") or {})
    if health_truth and health_truth.get("source_of_truth") != "data.js":
        errors.append("health.data_truth.source_of_truth must be data.js")
    health_generated = health_truth.get("data_generated_at") or health.get("data_generated_at")
    if health_generated and health_generated != data_generated_at:
        errors.append(
            f"health data_generated_at={health_generated} differs from data.js generated_at={data_generated_at}"
        )
    calculated_at = parse_dt(night.get("calculated_at") or night.get("generated_at"))
    if calculated_at:
        age_minutes = (datetime.now(timezone.utc) - calculated_at.astimezone(timezone.utc)).total_seconds() / 60
        if age_minutes > 90:
            errors.append(f"night_metrics is stale: {age_minutes:.1f} minutes old")
    else:
        errors.append("night_metrics calculated_at is missing or invalid")
    if errors:
        print("[data-truth] FAIL")
        for err in errors:
            print(f"- {err}")
        return 1
    print(f"[data-truth] OK generated_at={data_generated_at} today={data.get('today') or today}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

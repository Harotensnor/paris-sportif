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


# AUDIT 2026-05-08 — race condition tolérée (P0.5).
# `build_health.py` calcule à T0 quand data.js a generated_at=X.
# Puis `inject_data_in_html.py` re-stamp data.js avec generated_at=X+~2min.
# Sur la fenêtre du même cron tick, l'écart est < 5 min : on tolère.
TIMESTAMP_TOLERANCE_S = 300  # 5 minutes


def timestamps_close(a: Any, b: Any) -> bool:
    """Return True when a and b are equal strings or within TIMESTAMP_TOLERANCE_S."""
    if a == b:
        return True
    da = parse_dt(a)
    db = parse_dt(b)
    if da is None or db is None:
        return False
    return abs((da - db).total_seconds()) <= TIMESTAMP_TOLERANCE_S


def iter_events(data: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        ev
        for arr in (data.get("days") or {}).values()
        for ev in (arr or [])
        if isinstance(ev, dict)
    ]


def is_winamax_exact(ev: dict[str, Any]) -> bool:
    wnx = ev.get("winamax") or {}
    markets = wnx.get("markets") or {}
    one = markets.get("1n2") if isinstance(markets, dict) else {}
    return bool(
        wnx.get("available") is True
        and wnx.get("match_id")
        and isinstance(one, dict)
        and isinstance(one.get("home"), (int, float))
        and isinstance(one.get("away"), (int, float))
    )


def winamax_truth(data: dict[str, Any]) -> dict[str, Any]:
    events = iter_events(data)
    available = sum(1 for ev in events if (ev.get("winamax") or {}).get("available") is True)
    exact = sum(1 for ev in events if is_winamax_exact(ev))
    upcoming = [ev for ev in events if not ev.get("completed") and not ev.get("live")]
    upcoming_available = sum(1 for ev in upcoming if (ev.get("winamax") or {}).get("available") is True)
    upcoming_exact = sum(1 for ev in upcoming if is_winamax_exact(ev))
    return {
        "winamax_available": available,
        "winamax_exact": exact,
        "winamax_exact_ratio": round(exact / available, 4) if available else None,
        "upcoming_winamax_available": upcoming_available,
        "upcoming_winamax_exact": upcoming_exact,
        "upcoming_winamax_exact_ratio": round(upcoming_exact / upcoming_available, 4) if upcoming_available else None,
    }


def same_value(left: Any, right: Any) -> bool:
    if isinstance(left, (int, float)) and isinstance(right, (int, float)):
        return abs(float(left) - float(right)) <= 0.001
    return left == right


def data_today_error(data: dict[str, Any], now: datetime | None = None) -> str | None:
    data_today = data.get("today")
    if not data_today:
        return None
    now = now or datetime.now(timezone.utc)
    today = now.date().isoformat()
    generated_at = parse_dt(data.get("generated_at"))
    generated_today = generated_at.astimezone(timezone.utc).date().isoformat() if generated_at else None
    if data_today == today or (generated_today and data_today == generated_today):
        return None
    return f"data.js today={data_today} differs from UTC today={today}"


def main() -> int:
    errors: list[str] = []
    data = load_data_js()
    night = load_json(NIGHT)
    health = load_json(HEALTH)
    data_generated_at = data.get("generated_at")
    truth = winamax_truth(data)
    if night.get("source_of_truth") != "data.js":
        errors.append("night_metrics.source_of_truth must be data.js")
    if not timestamps_close(night.get("data_generated_at"), data_generated_at):
        errors.append(
            f"night_metrics data_generated_at={night.get('data_generated_at')} "
            f"differs from data.js generated_at={data_generated_at} (>5min)"
        )
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    today_err = data_today_error(data, now)
    if today_err:
        errors.append(today_err)
    health_truth = (health.get("data_truth") or {})
    if health_truth and health_truth.get("source_of_truth") != "data.js":
        errors.append("health.data_truth.source_of_truth must be data.js")
    health_generated = health_truth.get("data_generated_at") or health.get("data_generated_at")
    if health_generated and not timestamps_close(health_generated, data_generated_at):
        errors.append(
            f"health data_generated_at={health_generated} differs from data.js generated_at={data_generated_at} (>5min)"
        )
    night_events = night.get("events") if isinstance(night.get("events"), dict) else {}
    if timestamps_close(night.get("data_generated_at"), data_generated_at):
        for key in ("winamax_available", "winamax_exact", "winamax_exact_ratio"):
            if not same_value(night_events.get(key), truth.get(key)):
                errors.append(f"night_metrics.{key}={night_events.get(key)} differs from data.js truth={truth.get(key)}")
    if health_truth:
        for key in ("winamax_available", "winamax_exact", "winamax_exact_ratio"):
            if not same_value(health_truth.get(key), truth.get(key)):
                errors.append(f"health.data_truth.{key}={health_truth.get(key)} differs from data.js truth={truth.get(key)}")
        for key in ("upcoming_winamax_available", "upcoming_winamax_exact", "upcoming_winamax_exact_ratio"):
            if not same_value(health_truth.get(key), truth.get(key)):
                errors.append(f"health.data_truth.{key}={health_truth.get(key)} differs from data.js truth={truth.get(key)}")
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

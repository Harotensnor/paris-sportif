from __future__ import annotations

import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa-contract-report.json"
DATA_JS = ROOT / "data.js"


SIDECARS = {
    "winamax_catalog.json": {"required": ["generated_at", "matches"], "min_items": 100},
    "winamax_markets.json": {"required": ["generated_at", "matches"], "min_items": 100},
    "health.json": {"required": ["overall"], "min_items": 1},
    "night_metrics.json": {"required": ["generated_at"], "min_items": 1},
    "picks_history_summary.json": {"required": ["generated_at"], "min_items": 1},
}


def parse_data_js() -> dict[str, Any]:
    text = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$", text, re.S)
    if not match:
        raise ValueError("data.js does not expose window.PRONOSTICS_DATA")
    return json.loads(match.group(1))


def is_finite(value: Any) -> bool:
    try:
        return math.isfinite(float(value))
    except Exception:
        return False


def event_key(event: dict[str, Any]) -> str:
    return str(event.get("id") or event.get("uid") or event.get("name") or "?")


def validate_event(event: dict[str, Any], errors: list[str], warnings: list[str]) -> None:
    key = event_key(event)
    if not event.get("date"):
        errors.append(f"{key}: missing date")
    if not (event.get("name") or event.get("home") or event.get("competitors")):
        errors.append(f"{key}: missing teams/name")
    if event.get("home") and event.get("away") and event.get("home") == event.get("away"):
        errors.append(f"{key}: home == away")
    odds = event.get("odds") or []
    if odds and not isinstance(odds, list):
        errors.append(f"{key}: odds must be list")
    for market in odds[:20]:
        if not isinstance(market, dict):
            errors.append(f"{key}: odd market is not object")
            continue
        for field in ("homeML", "awayML", "drawML"):
            raw = market.get(field)
            if raw in (None, ""):
                continue
            if not is_finite(raw):
                errors.append(f"{key}: {field} is not finite")
                continue
            odd = float(raw)
            if abs(odd) > 100000:
                errors.append(f"{key}: {field} is outside moneyline range")
    winamax = event.get("winamax") or {}
    if winamax.get("available") is True and not (winamax.get("markets") or winamax.get("match_id") or event.get("winamax_markets")):
        warnings.append(f"{key}: winamax available but no market detail")


def count_items(payload: Any) -> int:
    if isinstance(payload, list):
        return len(payload)
    if isinstance(payload, dict):
        for key in ("matches", "events", "items", "sources", "days"):
            value = payload.get(key)
            if isinstance(value, (list, dict)):
                return len(value)
        return len(payload)
    return 0


def validate_sidecar(name: str, spec: dict[str, Any], errors: list[str], warnings: list[str]) -> dict[str, Any]:
    path = ROOT / name
    if not path.exists():
        errors.append(f"{name}: missing")
        return {"name": name, "status": "missing"}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        errors.append(f"{name}: invalid json: {exc}")
        return {"name": name, "status": "invalid"}
    for key in spec["required"]:
        if key not in payload:
            warnings.append(f"{name}: missing optional contract key {key}")
    items = count_items(payload)
    if items < spec["min_items"]:
        warnings.append(f"{name}: low item count {items} < {spec['min_items']}")
    return {"name": name, "status": "ok", "items": items}


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    data = parse_data_js()
    days = data.get("days")
    if not isinstance(days, dict) or not days:
        errors.append("data.days must be a non-empty object")
        days = {}
    generated_at = data.get("generated_at")
    if not generated_at:
        errors.append("data.generated_at missing")
    else:
        try:
            datetime.fromisoformat(str(generated_at).replace("Z", "+00:00"))
        except Exception:
            errors.append("data.generated_at is not ISO-8601")

    events: list[dict[str, Any]] = []
    for day_key, day in days.items():
      if isinstance(day, dict):
        bucket = day.get("events") or []
      elif isinstance(day, list):
        bucket = day
      else:
        errors.append(f"day {day_key}: invalid bucket type")
        bucket = []
      for event in bucket:
        if isinstance(event, dict):
            events.append(event)
            validate_event(event, errors, warnings)
        else:
            errors.append(f"day {day_key}: event is not object")

    if len(events) < 200:
        errors.append(f"event count too low: {len(events)} < 200")
    winamax_count = sum(1 for event in events if (event.get("winamax") or {}).get("available") is True)
    winamax_pct = (winamax_count / len(events) * 100) if events else 0
    if winamax_pct < 20:
        warnings.append(f"low winamax coverage: {winamax_pct:.1f}%")

    sidecars = [validate_sidecar(name, spec, errors, warnings) for name, spec in SIDECARS.items()]
    report = {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "status": "failed" if errors else "ok",
        "events": len(events),
        "winamax_events": winamax_count,
        "winamax_pct": round(winamax_pct, 2),
        "sidecars": sidecars,
        "errors": errors[:100],
        "warnings": warnings[:200],
    }
    OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"QA contract tests: events={len(events)} winamax={winamax_pct:.1f}% errors={len(errors)} warnings={len(warnings)}")
    if errors:
        for error in errors[:20]:
            print(f"ERROR: {error}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

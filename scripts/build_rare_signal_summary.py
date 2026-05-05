#!/usr/bin/env python3
"""Build a quality layer for rare_signals.json.

The raw rare signal feed is useful for scoring, but the UI should not surface
an abstain/conflict signal as if it was an opportunity. This summary separates
actionable signals from watch/risk rows and keeps the raw file untouched.
"""
from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
IN_PATH = ROOT / "rare_signals.json"
OUT = ROOT / "rare_signal_summary.json"

ACTIONABLE_TYPES = {
    "injury_imbalance",
    "weather_extreme",
    "strict_referee",
    "market_move",
    "travel_extreme",
    "back_to_back_travel",
}
RISK_TYPES = {"market_uncertain", "signal_conflict"}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def signal_quality(signal: dict[str, Any]) -> tuple[str, str]:
    kind = str(signal.get("type") or "")
    direction = str(signal.get("direction") or "").lower()
    strength = float(signal.get("strength") or 0)
    if kind in RISK_TYPES or direction in {"abstain", "mixed"}:
        return "risk", "Signal de prudence, pas une opportunite directe"
    if kind in ACTIONABLE_TYPES and strength >= 0.65:
        return "actionable", "Signal rare fort et directionnel"
    if kind in ACTIONABLE_TYPES:
        return "watch", "Signal rare present mais intensite moyenne"
    return "watch", "Signal inhabituel a surveiller"


def match_key(row: dict[str, Any]) -> str:
    return "|".join([
        str(row.get("sport") or ""),
        str(row.get("league_code") or row.get("league_name") or ""),
        str(row.get("date") or "")[:16],
        str(row.get("home") or ""),
        str(row.get("away") or ""),
    ]).lower()


def summarize_row(row: dict[str, Any]) -> dict[str, Any]:
    signal = row.get("signal") or {}
    quality, reason = signal_quality(signal)
    strength = float(signal.get("strength") or 0)
    return {
        "event_id": row.get("event_id"),
        "date": row.get("date"),
        "sport": row.get("sport"),
        "league_code": row.get("league_code"),
        "league_name": row.get("league_name"),
        "home": row.get("home"),
        "away": row.get("away"),
        "match": f"{row.get('home') or '?'} - {row.get('away') or '?'}",
        "quality": quality,
        "quality_reason": reason,
        "type": signal.get("type"),
        "direction": signal.get("direction"),
        "team": signal.get("team"),
        "side": signal.get("side"),
        "strength": round(strength, 3),
        "context": signal.get("context"),
    }


def main() -> int:
    data = load_json(IN_PATH, {})
    now = datetime.now(timezone.utc)
    active: list[dict[str, Any]] = []
    expired: list[dict[str, Any]] = []
    by_type = Counter()
    by_quality = Counter()
    deduped: dict[str, dict[str, Any]] = {}

    for raw in data.get("signals") or []:
        if not isinstance(raw, dict):
            continue
        row = summarize_row(raw)
        by_type.update([str(row.get("type") or "unknown")])
        kickoff = parse_dt(row.get("date"))
        if kickoff and kickoff >= now - timedelta(minutes=10):
            key = match_key(raw)
            previous = deduped.get(key)
            if not previous or float(row.get("strength") or 0) > float(previous.get("strength") or 0):
                deduped[key] = row
        elif len(expired) < 80:
            expired.append(row)

    active = list(deduped.values())
    by_quality.update(str(r.get("quality") or "unknown") for r in active)
    active.sort(key=lambda r: (
        {"actionable": 0, "watch": 1, "risk": 2}.get(str(r.get("quality")), 3),
        -float(r.get("strength") or 0),
        str(r.get("date") or ""),
    ))
    active_actionable = [r for r in active if r.get("quality") == "actionable"]
    active_watch = [r for r in active if r.get("quality") == "watch"]
    active_risk = [r for r in active if r.get("quality") == "risk"]

    out = {
        "generated_at": now_iso(),
        "schema": "rare_signal_summary_v1",
        "source": "rare_signals.json quality layer",
        "status": "ok" if active_actionable else ("watch" if active else "empty"),
        "summary": {
            "active_events": len(active),
            "actionable": len(active_actionable),
            "watch": len(active_watch),
            "risk": len(active_risk),
            "expired_sample": len(expired),
            "by_type": dict(by_type),
            "by_quality": dict(by_quality),
        },
        "active_actionable": active_actionable[:80],
        "active_watch": active_watch[:80],
        "active_risk": active_risk[:80],
        "expired_sample": expired,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    s = out["summary"]
    print(f"rare_signal_summary: actionable={s['actionable']} watch={s['watch']} risk={s['risk']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

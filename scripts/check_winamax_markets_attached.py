#!/usr/bin/env python3
"""Fail the refresh before deploy if Winamax matches lost their market odds."""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"


def _parse_data() -> dict:
    text = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"=\s*(\{.*\})\s*;?\s*$", text, re.S)
    if not match:
        raise ValueError("data.js does not expose a JSON payload")
    return json.loads(match.group(1))


def _date_key(value: str | None) -> str:
    if not value:
        return ""
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).strftime("%Y-%m-%d")
    except Exception:
        return str(value)[:10]


def main() -> int:
    if not DATA_JS.exists():
        print("[check_winamax_markets] ERROR data.js missing", file=sys.stderr)
        return 1

    data = _parse_data()
    today = data.get("today") or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    try:
        today_dt = datetime.fromisoformat(str(today)[:10]).replace(tzinfo=None)
    except Exception:
        today_dt = datetime.now(timezone.utc).replace(tzinfo=None)
    # Past dates can legitimately lose markets after settlement; the blocker
    # protects the actionable publishing window only.
    start = today_dt.strftime("%Y-%m-%d")
    end = (today_dt + timedelta(days=7)).strftime("%Y-%m-%d")

    events = []
    for day, bucket in (data.get("days") or {}).items():
        if not isinstance(bucket, list):
            continue
        for event in bucket:
            if isinstance(event, dict):
                events.append(event)

    scoped = []
    by_day: dict[str, dict[str, int]] = {}
    for event in events:
        day = _date_key(event.get("date")) or str(event.get("day") or "")[:10]
        if day < start or day > end:
            continue
        wx = event.get("winamax") or {}
        if not wx.get("match_id"):
            continue
        scoped.append(event)
        item = by_day.setdefault(day, {"match_id": 0, "markets": 0, "n12": 0})
        item["match_id"] += 1
        markets = wx.get("markets") or {}
        if markets:
            item["markets"] += 1
        if isinstance(markets, dict) and markets.get("1n2"):
            item["n12"] += 1

    match_id = len(scoped)
    with_markets = sum(1 for e in scoped if (e.get("winamax") or {}).get("markets"))
    with_n12 = sum(1 for e in scoped if ((e.get("winamax") or {}).get("markets") or {}).get("1n2"))
    ratio = (with_markets / match_id) if match_id else 0.0
    n12_ratio = (with_n12 / match_id) if match_id else 0.0

    print(
        "[check_winamax_markets] "
        f"scope={start}..{end} match_id={match_id} markets={with_markets} "
        f"1n2={with_n12} ratio={ratio:.1%} n12_ratio={n12_ratio:.1%}"
    )
    for day, counts in sorted(by_day.items()):
        print(
            "[check_winamax_markets] "
            f"{day}: match_id={counts['match_id']} markets={counts['markets']} 1n2={counts['n12']}"
        )

    errors: list[str] = []
    if match_id >= 30 and ratio < 0.70:
        errors.append(f"market attachment too low: {with_markets}/{match_id} ({ratio:.1%})")
    if match_id >= 30 and n12_ratio < 0.55:
        errors.append(f"1N2 attachment too low: {with_n12}/{match_id} ({n12_ratio:.1%})")
    for day, counts in sorted(by_day.items()):
        mid = counts["match_id"]
        if mid >= 10 and counts["markets"] / mid < 0.60:
            errors.append(f"{day}: markets too low {counts['markets']}/{mid}")

    if errors:
        for error in errors:
            print(f"[check_winamax_markets] ERROR {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

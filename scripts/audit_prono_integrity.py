#!/usr/bin/env python3
"""Audit minimal prono/Winamax integrity for actionnable UI candidates.

The browser model still decides the final pick, but every event exposed to the
UI must have a sane Winamax contract before it can become actionnable.
"""
from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_JS = ROOT / "data.js"


def _load_data() -> dict:
    text = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$", text, re.S)
    if not match:
        raise SystemExit("[prono-integrity] FAIL: cannot parse data.js")
    return json.loads(match.group(1))


def _finite_odd(value: object) -> bool:
    try:
        odd = float(value)
    except (TypeError, ValueError):
        return False
    return math.isfinite(odd) and 1.01 <= odd <= 250


def _collect_odds(markets: object) -> list[float]:
    odds: list[float] = []
    if not isinstance(markets, dict):
        return odds
    for value in markets.values():
        if isinstance(value, dict):
            for raw in value.values():
                if isinstance(raw, dict):
                    raw = raw.get("odd", raw.get("price"))
                if _finite_odd(raw):
                    odds.append(float(raw))
        elif isinstance(value, list):
            for row in value:
                if isinstance(row, dict):
                    raw = row.get("odd", row.get("price"))
                    if _finite_odd(raw):
                        odds.append(float(raw))
    return odds


def main() -> int:
    data = _load_data()
    days = data.get("days") or {}
    failures: list[str] = []
    warnings: list[str] = []
    total = 0
    bookable = 0
    with_odds = 0

    for day, events in days.items():
        if not isinstance(events, list):
            warnings.append(f"{day}: days entry is not a list")
            continue
        for event in events:
            total += 1
            event_id = str(event.get("id") or "?")
            wx = event.get("winamax") or {}
            if wx.get("available") is not True:
                failures.append(f"{event_id}: winamax.available is not true")
                continue
            bookable += 1
            if not wx.get("match_id"):
                failures.append(f"{event_id}: missing winamax.match_id")
            odds = _collect_odds(wx.get("markets"))
            if not odds:
                failures.append(f"{event_id}: no finite Winamax odd")
            else:
                with_odds += 1
            if not (wx.get("markets_validated_at") or wx.get("details_validated_at") or wx.get("markets_fetched_at")):
                warnings.append(f"{event_id}: no market validation timestamp")

    if failures:
        print("[prono-integrity] FAIL")
        for line in failures[:80]:
            print(f"- {line}")
        if len(failures) > 80:
            print(f"- ... {len(failures) - 80} more")
        return 1
    print("[prono-integrity] OK")
    print(f"- events: {total}")
    print(f"- bookable Winamax: {bookable}")
    print(f"- with finite odds: {with_odds}")
    if warnings:
        print(f"- warnings: {len(warnings)}")
        for line in warnings[:20]:
            print(f"  - {line}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

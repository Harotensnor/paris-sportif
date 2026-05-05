#!/usr/bin/env python3
"""Validate served events and write a compact quarantine report.

This guard is non-mutating: it does not remove data during refresh.  It makes
bad odds/events visible so the UI/model can ignore them and the pipeline can
alert without failing optional sources.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from _data_io import load_data_js, iter_events

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data_quarantine.jsonl"
SUMMARY = ROOT / "data_quality_report.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def num(v: Any) -> float | None:
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return x if x == x and x not in (float("inf"), float("-inf")) else None


def parse_dt(raw: Any) -> datetime | None:
    if not raw:
        return None
    try:
        d = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.astimezone(timezone.utc)
    except Exception:
        return None


def sides(ev: dict) -> tuple[str, str]:
    comps = ev.get("competitors") or []
    home = next((c for c in comps if c.get("home_away") == "home"), comps[0] if comps else {})
    away = next((c for c in comps if c.get("home_away") == "away"), comps[1] if len(comps) > 1 else {})
    hn = str((home or {}).get("name") or (home or {}).get("short") or "").strip()
    an = str((away or {}).get("name") or (away or {}).get("short") or "").strip()
    return hn, an


def iter_market_odds(ev: dict):
    markets = ((ev.get("winamax") or {}).get("markets") or {})
    for key, value in markets.items():
        if isinstance(value, dict):
            for side, odd in value.items():
                if side in ("home", "away", "draw", "over", "under", "yes", "no"):
                    yield key, side, odd
        elif isinstance(value, list):
            for row in value:
                if isinstance(row, dict) and "odd" in row:
                    yield key, row.get("side") or row.get("score") or row.get("label") or "selection", row.get("odd")


def main() -> int:
    generated = now_iso()
    data = load_data_js()
    records = []
    reason_counts: dict[str, int] = {}
    now = datetime.now(timezone.utc)
    for day, ev in iter_events(data):
        if not isinstance(ev, dict):
            continue
        eid = str(ev.get("id") or "")
        home, away = sides(ev)
        reasons = []
        if not home or not away:
            reasons.append("team_name_empty")
        if home and away and home.lower() == away.lower():
            reasons.append("home_equals_away")
        ko = parse_dt(ev.get("date"))
        if not ko:
            reasons.append("kickoff_unparseable")
        elif ko < now.replace(tzinfo=timezone.utc) and (now - ko).total_seconds() > 24 * 3600 and not ev.get("completed"):
            reasons.append("stale_unsettled_event")
        for market, side, odd_raw in iter_market_odds(ev):
            odd = num(odd_raw)
            if odd is None or odd < 1.01 or odd > 50:
                reasons.append(f"bad_odd:{market}:{side}")
        if reasons:
            for r in reasons:
                reason_counts[r.split(":", 1)[0]] = reason_counts.get(r.split(":", 1)[0], 0) + 1
            records.append({
                "ts": generated,
                "event_id": eid,
                "date_key": day,
                "kickoff_utc": ev.get("date"),
                "sport": ev.get("sport"),
                "league": ev.get("league_code") or ev.get("league_name"),
                "home": home,
                "away": away,
                "reasons": reasons[:20],
            })
    OUT.write_text("\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in records) + ("\n" if records else ""), encoding="utf-8")
    SUMMARY.write_text(json.dumps({
        "generated_at": generated,
        "status": "ok" if not records else "warning",
        "events_quarantined": len(records),
        "reason_counts": reason_counts,
        "sample": records[:20],
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"[data_quality] quarantined_events={len(records)} reasons={reason_counts}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

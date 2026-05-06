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


# Markets where odds > 50 are legitimately common (long shots, not corruption).
# Cap at LONG_SHOT_MAX (1000) to still catch obviously absurd values.
LONG_SHOT_MARKETS = frozenset({
    "exact_score_rows",
    "exact_scores",
    "htft",
    "ht_ft",
})
# Markets where odds up to ~100 are normal (high O/U lines, niche team totals,
# half-time outcomes, combined markets like result+BTTS).
ELEVATED_MARKETS = frozenset({
    "team_total",
    "basket_team_total",
    "ht_1n2_rows",
    "ht_ou",
    "ht_btts",
    "result_btts",
    "tennis_correct_score",
    "mma_method",
})
LONG_SHOT_MAX = 1000.0
ELEVATED_MAX = 100.0
DEFAULT_MAX = 50.0


def classify_odd(market: str, side: str, odd: float | None) -> tuple[str, str] | None:
    """Return (category, label) for an odd that fails the standard window,
    or None if the odd is acceptable for that market.
    """
    if odd is None:
        return ("bad_odd", f"{market}:{side}")
    if odd < 1.01:
        return ("bad_odd", f"{market}:{side}")
    if market in LONG_SHOT_MARKETS:
        if odd > LONG_SHOT_MAX:
            return ("bad_odd", f"{market}:{side}")
        if odd > DEFAULT_MAX:
            return ("long_shot_odd", f"{market}:{side}")
        return None
    if market in ELEVATED_MARKETS:
        if odd > ELEVATED_MAX:
            return ("bad_odd", f"{market}:{side}")
        if odd > DEFAULT_MAX:
            return ("long_shot_odd", f"{market}:{side}")
        return None
    if odd > DEFAULT_MAX:
        return ("bad_odd", f"{market}:{side}")
    return None


def main() -> int:
    generated = now_iso()
    data = load_data_js()
    records = []
    reason_counts: dict[str, int] = {}
    long_shot_counts: dict[str, int] = {}
    long_shot_total = 0
    events_with_long_shots = 0
    now = datetime.now(timezone.utc)
    for day, ev in iter_events(data):
        if not isinstance(ev, dict):
            continue
        eid = str(ev.get("id") or "")
        home, away = sides(ev)
        reasons = []
        long_shots = []
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
            verdict = classify_odd(market, side, num(odd_raw))
            if verdict is None:
                continue
            category, label = verdict
            tag = f"{category}:{label}"
            if category == "long_shot_odd":
                long_shots.append(tag)
            else:
                reasons.append(tag)
        if long_shots:
            events_with_long_shots += 1
            long_shot_total += len(long_shots)
            for ls in long_shots:
                # Bucket by market key, e.g. "long_shot_odd:exact_score_rows:5-0" -> "exact_score_rows"
                parts = ls.split(":", 2)
                bucket = parts[1] if len(parts) > 1 else "unknown"
                long_shot_counts[bucket] = long_shot_counts.get(bucket, 0) + 1
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
        "long_shot_odd_total": long_shot_total,
        "long_shot_events": events_with_long_shots,
        "long_shot_by_market": long_shot_counts,
        "sample": records[:20],
    }, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(
        f"[data_quality] quarantined_events={len(records)} reasons={reason_counts} "
        f"long_shot_odds={long_shot_total} (events={events_with_long_shots})"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

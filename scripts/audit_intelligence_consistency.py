#!/usr/bin/env python3
"""Fail fast when betting-intelligence sidecars overstate fragile signals."""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
MARKETS = ROOT / "market_biases_by_league.json"
LEAGUES = ROOT / "league_inefficiencies.json"
ANGLES = ROOT / "detected_angles.json"


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def audit_markets(errors: list[str]) -> None:
    report = load(MARKETS)
    rows = report.get("markets") or []
    summary = report.get("summary") or {}
    n_values = {int(r.get("n") or 0) for r in rows}
    priced_rows = int(summary.get("market_priced_rows") or 0)
    if len(rows) > 3 and len(n_values) == 1:
        fail(errors, "market rows still share one sample size; expected priced per-market samples")
    if len(rows) > 1 and len(n_values) == 1 and priced_rows == 0:
        if summary.get("market_sample_warning") != "all_market_rows_share_same_n_without_odds":
            fail(errors, "market rows share one n but warning is missing")
        if summary.get("market_sample_scope") != "directional_only":
            fail(errors, "directional market sample scope is missing")
    for row in rows:
        status = str(row.get("status") or "")
        with_odds = int(row.get("with_odds") or 0)
        scope = str(row.get("sample_scope") or "")
        key = str(row.get("market_key") or "")
        wr = float(row.get("win_rate") or 0)
        avg_odd = row.get("avg_odd")
        if with_odds < 20 and status in {"exploit", "fade"}:
            fail(errors, f"{key} is {status} without enough priced samples")
        if with_odds > 0 and scope != "priced_market_sample":
            fail(errors, f"{key} missing priced market sample scope")
        if with_odds == 0 and scope != "directional_settled_match_sample":
            fail(errors, f"{key} missing directional sample scope")
        if key == "doubleChance:12":
            priced_value = (float(avg_odd) * wr) - 1.0 if isinstance(avg_odd, (int, float)) else None
            if status not in {"low_value", "watch", "neutral"}:
                fail(errors, "doubleChance:12 must not be promoted as exploit/fade")
            if priced_value is not None and priced_value <= 0 and status != "low_value":
                fail(errors, "doubleChance:12 non-profitable WR must be low_value")


def audit_leagues(errors: list[str]) -> None:
    report = load(LEAGUES)
    rows = report.get("leagues") or []
    if not rows:
        fail(errors, "league_inefficiencies has no rows")
        return
    wr_counts = Counter(round(float(r.get("win_rate") or 0), 4) for r in rows)
    top_wr, top_count = wr_counts.most_common(1)[0]
    if top_count / max(1, len(rows)) > 0.4:
        fail(errors, f"league WR value {top_wr} appears on {top_count}/{len(rows)} rows")
    for row in rows:
        code = str(row.get("league_code") or "")
        status = str(row.get("status") or "")
        n = int(row.get("n") or 0)
        wr = float(row.get("win_rate") or 0)
        roi = float(row.get("flat_roi_pct") or 0)
        if n < 20 and status != "data_insufficient":
            fail(errors, f"{code} n={n} must be data_insufficient, got {status}")
        if status == "exploit" and n < 20:
            fail(errors, f"{code} exploit with tiny sample n={n}")
        if n >= 20 and wr >= 0.52 and roi < -8 and status != "avoid_low_roi":
            fail(errors, f"{code} WR positive but negative ROI should be avoid_low_roi")
        if wr < 0.5 and roi < -8 and status not in {"avoid_low_wr", "data_insufficient"}:
            fail(errors, f"{code} low WR negative ROI should be avoid_low_wr")


def audit_angles(errors: list[str]) -> None:
    report = load(ANGLES)
    rows = report.get("events") or []
    summary = report.get("summary") or {}
    by_type = summary.get("by_type") or {}
    if int(by_type.get("market_uncertain") or 0) <= 0:
        fail(errors, "market_uncertain angles missing")
    if int(by_type.get("signal_conflict") or 0) <= 0:
        fail(errors, "signal_conflict angles missing")
    for row in rows:
        angles = row.get("angles") or []
        has_conflict = any(str(a.get("type") or "") == "signal_conflict" for a in angles)
        if not has_conflict:
            continue
        resolution = row.get("signal_resolution") or {}
        if resolution.get("status") not in {"abstain", "mixed"}:
            fail(errors, f"{row.get('event_id')} conflict without abstain/mixed resolution")


def main() -> int:
    errors: list[str] = []
    audit_markets(errors)
    audit_leagues(errors)
    audit_angles(errors)
    if errors:
        print("[intelligence-consistency] FAIL")
        for err in errors:
            print(f"- {err}")
        return 1
    print("[intelligence-consistency] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

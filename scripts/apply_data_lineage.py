#!/usr/bin/env python3
"""Attach source lineage to each event in data.js.

The operation is idempotent and intentionally tiny per event: a sorted list of
short source names. It gives the UI and health reports a shared provenance
field without changing model math.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    from _data_io import iter_events, load_data_js, save_data_js
except Exception:  # pragma: no cover
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from _data_io import iter_events, load_data_js, save_data_js

ROOT = Path(__file__).resolve().parent.parent
SUMMARY = ROOT / "data_lineage_summary.json"
AUDIT = ROOT / "data_audit_log.jsonl"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def lineage_for_event(ev: dict) -> list[str]:
    sources = ["espn"]
    winamax = ev.get("winamax") or {}
    if winamax.get("available") or winamax.get("match_id") or winamax.get("markets"):
        sources.append("winamax")
    if ev.get("weather"):
        sources.append("weather")
    if ev.get("referee") or ev.get("referee_context"):
        sources.append("sofascore_referees")
    if ev.get("lineups"):
        sources.append("sofascore_lineups")
    if ev.get("injuries") or ev.get("injuries_source"):
        sources.append("injuries")
    if ev.get("clubelo"):
        sources.append("clubelo")
    if ev.get("smart_money"):
        sources.append("smart_money")
    if ev.get("h2h") or ev.get("h2h_extended"):
        sources.append("h2h")
    for competitor in ev.get("competitors") or []:
        if (
            competitor.get("xg_stats")
            or competitor.get("fbref_xg")
            or competitor.get("xg_for_avg") is not None
        ):
            sources.append("xg")
            break
    return sorted(set(sources))


def append_audit(records: list[dict]) -> None:
    if not records:
        return
    with AUDIT.open("a", encoding="utf-8") as fh:
        for rec in records:
            fh.write(json.dumps(rec, ensure_ascii=False, separators=(",", ":")) + "\n")


def main() -> int:
    data = load_data_js()
    changed = 0
    total = 0
    source_counts: dict[str, int] = {}
    audit_records = []
    for _, ev in iter_events(data):
        total += 1
        next_lineage = lineage_for_event(ev)
        prev_lineage = ev.get("lineage")
        if prev_lineage != next_lineage:
            ev["lineage"] = next_lineage
            changed += 1
            if len(audit_records) < 500:
                audit_records.append({
                    "ts": now_iso(),
                    "source": "data.js",
                    "event_id": ev.get("id"),
                    "field": "lineage",
                    "before": prev_lineage,
                    "after": next_lineage,
                })
        for source in next_lineage:
            source_counts[source] = source_counts.get(source, 0) + 1

    if changed:
        save_data_js(data)
        append_audit(audit_records)

    SUMMARY.write_text(json.dumps({
        "generated_at": now_iso(),
        "status": "ok",
        "events": total,
        "events_changed": changed,
        "coverage_pct": 100.0 if total else 0.0,
        "source_counts": dict(sorted(source_counts.items(), key=lambda kv: kv[1], reverse=True)),
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[lineage] events={total} changed={changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

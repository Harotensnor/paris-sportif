#!/usr/bin/env python3
"""Build a non-actionable Challenger/ITF tennis watchlist from Sofascore.

The product remains Winamax-only for actionable picks. When Winamax has no
tennis on the exact feed, this sidecar still tells us whether the upstream
coverage exists and which lower-tour matches could become bookable later.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
SOFA = ROOT / "sofascore_events.json"
DATA_JS = ROOT / "data.js"
OUT = ROOT / "tennis_challenger_watchlist.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def league_bucket(name: str, code: str) -> str:
    low = (name or "").lower()
    code_low = (code or "").lower()
    if code_low == "itf" or low.startswith("itf "):
        return "itf"
    if "challenger" in low or code_low == "atp.challenger":
        return "challenger"
    if low.startswith("atp ") or " atp " in f" {low} ":
        return "atp_main"
    if low.startswith("wta ") or " wta " in f" {low} ":
        return "wta_main"
    if low.startswith("utr "):
        return "utr"
    if "," in name and "doubles" not in low:
        return "challenger_like"
    return "other_tennis"


def event_name(event: dict[str, Any]) -> str:
    return str(event.get("name") or event.get("shortName") or "")


def main() -> int:
    sofa = load_json(SOFA, {})
    events = (sofa.get("events") or {}).get("tennis") or []
    buckets: dict[str, int] = {}
    watchlist: list[dict[str, Any]] = []
    for event in events:
        league = str(event.get("league_name") or event.get("league") or "")
        code = str(event.get("league_code") or "")
        bucket = league_bucket(league, code)
        buckets[bucket] = buckets.get(bucket, 0) + 1
        if bucket not in {"itf", "challenger", "challenger_like"}:
            continue
        if len(watchlist) < 40:
            watchlist.append({
                "event_id": event.get("id"),
                "kickoff": event.get("date"),
                "match": event_name(event),
                "league": league,
                "bucket": bucket,
                "status": "watch_not_actionable_until_winamax_exact",
            })
    bookable_tennis = 0
    try:
        import re

        text = DATA_JS.read_text(encoding="utf-8")
        match = re.search(r"=\s*(\{.*\})\s*;?\s*$", text, re.DOTALL)
        data = json.loads(match.group(1)) if match else {}
        for day_events in (data.get("days") or {}).values():
            for event in day_events or []:
                if event.get("sport") == "tennis":
                    bookable_tennis += 1
    except Exception:
        bookable_tennis = 0
    out = {
        "generated_at": now_iso(),
        "source": "sofascore_events.json",
        "status": "watch" if watchlist else "empty",
        "bookable_tennis_events": bookable_tennis,
        "counts": buckets,
        "watchlist": watchlist,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        "tennis_challenger_watchlist: "
        f"bookable={bookable_tennis} watch={len(watchlist)} buckets={buckets}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Track Section J football expansion families from local feeds.

Categories:
- J1 women football
- J5 tier-2 leagues
- J6 domestic / continental cups
- J7 Asia and LATAM football

The output separates bookable Winamax events from Sofascore-only watch events
so the product can expand coverage without recommending non-bookable matches.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
SOFA = ROOT / "sofascore_events.json"
OUT = ROOT / "football_expansion_watchlist.json"

CATEGORIES = {
    "J1_foot_feminin": "Foot féminin",
    "J5_football_tier2": "Ligues tier 2",
    "J6_coupes": "Coupes",
    "J7_asie_latam": "Asie / Amérique latine",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def parse_data() -> dict[str, Any]:
    text = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"=\s*(\{.*\})\s*;?\s*$", text, re.DOTALL)
    return json.loads(match.group(1)) if match else {}


def code(event: dict[str, Any]) -> str:
    return str(event.get("league_code") or event.get("league") or event.get("league_name") or "").lower()


def league(event: dict[str, Any]) -> str:
    return str(event.get("league_name") or event.get("league") or event.get("league_code") or "")


def categories_for(event: dict[str, Any]) -> list[str]:
    if str(event.get("sport") or "").lower() != "football":
        return []
    c = code(event)
    n = league(event).lower()
    cats: list[str] = []
    if ".w." in c or ".women" in c or any(tok in n for tok in ("women", "fémin", "feminine", "frauen", "femen")):
        cats.append("J1_foot_feminin")
    if c.endswith(".2") or c in {"ger.2", "esp.2", "ita.2", "fra.2", "ned.2", "jpn.2"}:
        cats.append("J5_football_tier2")
    if any(tok in c for tok in ("cup", "copa", "pokal", "libertadores", "sudamericana")) or any(tok in n for tok in ("cup", "copa", "pokal")):
        cats.append("J6_coupes")
    if c.split(".")[0] in {"bra", "arg", "mex", "col", "jpn", "kor", "chn", "ksa", "conmebol"}:
        cats.append("J7_asie_latam")
    return cats


def sample(event: dict[str, Any], source: str) -> dict[str, Any]:
    return {
        "event_id": event.get("id") or event.get("uid"),
        "source": source,
        "kickoff": event.get("date"),
        "match": event.get("name") or event.get("shortName"),
        "league": league(event),
        "code": event.get("league_code"),
    }


def main() -> int:
    data = parse_data()
    sofa = load_json(SOFA, {})
    buckets: dict[str, dict[str, Any]] = {
        key: {"label": label, "bookable": 0, "source": 0, "samples": []}
        for key, label in CATEGORIES.items()
    }
    for day_events in (data.get("days") or {}).values():
        for event in day_events or []:
            for cat in categories_for(event):
                bucket = buckets[cat]
                bucket["bookable"] += 1
                if len(bucket["samples"]) < 8:
                    bucket["samples"].append(sample(event, "winamax_exact"))

    for event in ((sofa.get("events") or {}).get("football") or []):
        for cat in categories_for(event):
            bucket = buckets[cat]
            bucket["source"] += 1
            if len(bucket["samples"]) < 8:
                bucket["samples"].append(sample(event, "sofascore_watch"))

    for bucket in buckets.values():
        bucket["status"] = "ok" if bucket["bookable"] else ("watch" if bucket["source"] else "empty")

    out = {
        "generated_at": now_iso(),
        "source": "data.js bookable feed + sofascore_events source feed",
        "status": "ok",
        "categories": buckets,
        "summary": {
            "bookable_total": sum(v["bookable"] for v in buckets.values()),
            "source_total": sum(v["source"] for v in buckets.values()),
            "ok_categories": sum(1 for v in buckets.values() if v["status"] == "ok"),
        },
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        "football_expansion_watchlist: "
        + " ".join(f"{k}={v['bookable']}/{v['source']}:{v['status']}" for k, v in buckets.items())
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

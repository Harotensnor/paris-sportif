#!/usr/bin/env python3
"""Build an xG coverage snapshot for the current football feed.

Understat can be healthy as a source while still covering only a subset of the
matches shown to Theo. This sidecar measures the product question directly:
for how many current football events do we have xG on both teams?
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
OUT = ROOT / "xg_coverage.json"


def load_data() -> dict:
    txt = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$", txt, re.DOTALL)
    if not m:
        raise SystemExit("[xg_coverage] cannot parse data.js")
    return json.loads(m.group(1))


def has_xg(comp: dict) -> bool:
    return bool(
        comp.get("xg_stats")
        or comp.get("fbref_xg")
        or comp.get("xg_for_avg") is not None
        or comp.get("xg_against_avg") is not None
    )


def team_name(comp: dict) -> str:
    return comp.get("name") or comp.get("displayName") or comp.get("shortDisplayName") or comp.get("short") or ""


def build() -> dict:
    data = load_data()
    by_league: dict[str, dict] = {}
    samples_missing: list[dict] = []
    total = both = one_side = none = competitors_with_xg = 0

    for evs in (data.get("days") or {}).values():
        for ev in evs or []:
            if ev.get("sport") != "football":
                continue
            comps = [c for c in (ev.get("competitors") or []) if isinstance(c, dict)]
            if len(comps) < 2:
                continue
            league = ev.get("league_code") or "unknown"
            bucket = by_league.setdefault(league, {
                "events": 0,
                "both_teams": 0,
                "one_team": 0,
                "none": 0,
                "competitors_with_xg": 0,
            })
            total += 1
            bucket["events"] += 1
            xg_count = sum(1 for c in comps[:2] if has_xg(c))
            competitors_with_xg += xg_count
            bucket["competitors_with_xg"] += xg_count
            if xg_count >= 2:
                both += 1
                bucket["both_teams"] += 1
            elif xg_count == 1:
                one_side += 1
                bucket["one_team"] += 1
            else:
                none += 1
                bucket["none"] += 1
                if len(samples_missing) < 20:
                    samples_missing.append({
                        "id": ev.get("id"),
                        "league_code": league,
                        "date": ev.get("date"),
                        "teams": [team_name(c) for c in comps[:2]],
                    })

    for bucket in by_league.values():
        events = bucket.get("events") or 0
        bucket["both_teams_pct"] = round(((bucket.get("both_teams") or 0) / events) * 100, 1) if events else 0

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": "patched data.js xG fields",
        "events_total": total,
        "events_both_teams": both,
        "events_one_team": one_side,
        "events_without_xg": none,
        "competitors_with_xg": competitors_with_xg,
        "both_teams_pct": round((both / total) * 100, 1) if total else 0,
        "by_league": dict(sorted(by_league.items(), key=lambda kv: (-kv[1].get("events", 0), kv[0]))),
        "samples_missing": samples_missing,
    }


def main() -> int:
    payload = build()
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(
        "[xg_coverage] "
        f"{payload['events_both_teams']}/{payload['events_total']} football events with both-team xG "
        f"({payload['both_teams_pct']}%) -> {OUT.name}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

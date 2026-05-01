#!/usr/bin/env python3
"""Verification autonome de qualite data pour Paris-Sportif.

Usage depuis la racine du repo :

    python 10_OUTILS_RELECTURE_CLAUDE/verify_data_quality.py
    python 10_OUTILS_RELECTURE_CLAUDE/verify_data_quality.py --data data.js --out audit-quality.json

Le script ne modifie rien. Il lit data.js, detecte les signaux suspects
documentes dans le pack, puis ecrit un JSON de synthese.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from datetime import datetime, timezone


def load_data_js(path: Path) -> dict:
    txt = path.read_text(encoding="utf-8")
    m = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$", txt, re.DOTALL)
    if not m:
        m = re.search(r"=\s*(\{.*\})\s*;?\s*$", txt, re.DOTALL)
    if not m:
        raise SystemExit(f"Impossible de parser {path}")
    return json.loads(m.group(1))


def event_source_kind(ev: dict) -> str:
    w = ev.get("winamax") or {}
    markets = w.get("markets") or {}
    has_market = bool(markets)
    if w.get("match_id") and has_market:
        return "winamax_exact"
    if w.get("available") and not w.get("match_id"):
        return "winamax_tournament_only"
    snap = ev.get("odds_snapshot") or {}
    if snap.get("provider") and snap.get("provider") != "Winamax":
        return "external_fallback"
    if w.get("available"):
        return "winamax_available_unclear"
    return "none"


def iter_events(data: dict):
    for day, evs in (data.get("days") or {}).items():
        for ev in evs or []:
            yield day, ev


def audit(data: dict) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    events = list(iter_events(data))
    suspicious_football_stats = []
    cross_sport_ids = {}
    weather_mismatch = []
    exact_wina_external_snapshot = []
    source_kind_counts = {}
    actionable_not_exact = []
    special_status = []
    missing_competitors = []

    id_map: dict[str, list[dict]] = {}

    for day, ev in events:
        kind = event_source_kind(ev)
        source_kind_counts[kind] = source_kind_counts.get(kind, 0) + 1
        if not ev.get("completed") and kind != "winamax_exact":
            actionable_not_exact.append({
                "day": day,
                "id": ev.get("id"),
                "name": ev.get("name"),
                "sport": ev.get("sport"),
                "status": ev.get("status"),
                "provider": (ev.get("odds_snapshot") or {}).get("provider"),
                "source_kind": kind,
                "winamax": ev.get("winamax"),
            })

        if re.search(r"RETIRED|WALKOVER", ev.get("status") or ""):
            special_status.append({
                "day": day,
                "id": ev.get("id"),
                "name": ev.get("name"),
                "status": ev.get("status"),
                "completed": ev.get("completed"),
            })

        comps = ev.get("competitors") or []
        if len(comps) < 2:
            missing_competitors.append({
                "day": day,
                "id": ev.get("id"),
                "name": ev.get("name"),
                "sport": ev.get("sport"),
                "status": ev.get("status"),
                "competitors": len(comps),
            })

        for c in comps:
            tid = str(c.get("id") or "")
            if tid:
                id_map.setdefault(tid, []).append({
                    "sport": ev.get("sport"),
                    "league_code": ev.get("league_code"),
                    "team": c.get("name"),
                    "event": ev.get("name"),
                    "day": day,
                })

            if ev.get("sport") == "football":
                fs = c.get("form_stats") or {}
                bad = []
                avg_gf = fs.get("avg_gf5")
                avg_ga = fs.get("avg_ga5")
                gf5 = fs.get("gf5")
                ga5 = fs.get("ga5")
                try:
                    if avg_gf is not None and float(avg_gf) > 5:
                        bad.append(f"avg_gf5={avg_gf}")
                    if avg_ga is not None and float(avg_ga) > 5:
                        bad.append(f"avg_ga5={avg_ga}")
                    if gf5 is not None and float(gf5) > 25:
                        bad.append(f"gf5={gf5}")
                    if ga5 is not None and float(ga5) > 25:
                        bad.append(f"ga5={ga5}")
                except (TypeError, ValueError):
                    pass
                last5_bad = []
                for m in c.get("last5") or []:
                    try:
                        if float(m.get("gf", 0)) > 15 or float(m.get("ga", 0)) > 15:
                            last5_bad.append(m)
                    except (TypeError, ValueError):
                        pass
                if last5_bad:
                    bad.append("last5_scores_unrealistic_for_football")
                if bad:
                    suspicious_football_stats.append({
                        "day": day,
                        "event_id": ev.get("id"),
                        "event_name": ev.get("name"),
                        "league_code": ev.get("league_code"),
                        "team_id": tid,
                        "team": c.get("name"),
                        "home_away": c.get("home_away"),
                        "reasons": bad,
                        "form_stats": fs,
                        "last5_suspicious": last5_bad,
                    })

        if ev.get("sport") == "football" and ev.get("weather"):
            venue_city = ev.get("city")
            weather_city = (ev.get("weather") or {}).get("city")
            if venue_city and weather_city and venue_city != weather_city:
                weather_mismatch.append({
                    "day": day,
                    "event_id": ev.get("id"),
                    "event_name": ev.get("name"),
                    "venue_city": venue_city,
                    "weather_city": weather_city,
                    "country": ev.get("country"),
                    "weather": ev.get("weather"),
                })

        w = ev.get("winamax") or {}
        snap = ev.get("odds_snapshot") or {}
        if (
            not ev.get("completed")
            and w.get("match_id")
            and w.get("markets")
            and snap.get("provider")
            and snap.get("provider") != "Winamax"
        ):
            exact_wina_external_snapshot.append({
                "day": day,
                "id": ev.get("id"),
                "name": ev.get("name"),
                "sport": ev.get("sport"),
                "provider": snap.get("provider"),
                "match_id": w.get("match_id"),
            })

    for tid, rows in id_map.items():
        sports = sorted({r["sport"] for r in rows if r.get("sport")})
        if len(sports) > 1:
            cross_sport_ids[tid] = {
                "sports": sports,
                "names": sorted({r["team"] for r in rows if r.get("team")}),
                "sample": rows[:8],
            }

    return {
        "generated_at": now,
        "data_generated_at": data.get("generated_at"),
        "today": data.get("today"),
        "event_count": len(events),
        "source_kind_counts": source_kind_counts,
        "actionable_not_exact_count": len(actionable_not_exact),
        "actionable_not_exact_sample": actionable_not_exact[:30],
        "suspicious_football_stats_count": len(suspicious_football_stats),
        "suspicious_football_stats": suspicious_football_stats,
        "cross_sport_competitor_ids_count": len(cross_sport_ids),
        "cross_sport_competitor_ids_sample": dict(list(cross_sport_ids.items())[:30]),
        "future_exact_winamax_but_external_snapshot_count": len(exact_wina_external_snapshot),
        "future_exact_winamax_but_external_snapshot_sample": exact_wina_external_snapshot[:50],
        "weather_city_mismatch_count": len(weather_mismatch),
        "weather_city_mismatch_sample": weather_mismatch[:50],
        "special_status_count": len(special_status),
        "special_status": special_status,
        "missing_competitors_count": len(missing_competitors),
        "missing_competitors": missing_competitors,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data.js", help="Chemin vers data.js")
    ap.add_argument("--out", default="audit-quality-output.json", help="JSON de sortie")
    args = ap.parse_args()

    data = load_data_js(Path(args.data))
    result = audit(data)
    Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"events: {result['event_count']}")
    print(f"source_kind_counts: {result['source_kind_counts']}")
    print(f"actionable_not_exact: {result['actionable_not_exact_count']}")
    print(f"suspicious_football_stats: {result['suspicious_football_stats_count']}")
    print(f"exact_wina_external_snapshot: {result['future_exact_winamax_but_external_snapshot_count']}")
    print(f"weather_city_mismatch: {result['weather_city_mismatch_count']}")
    print(f"wrote: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


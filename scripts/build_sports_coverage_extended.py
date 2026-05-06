#!/usr/bin/env python3
"""Build the extended sports coverage matrix from local data sidecars.

The product stays honest: a sport is only marked ``ready`` when there are
bookable Winamax events in the local catalog/feed. Otherwise the output keeps
the source/watch status visible without creating fake recommendations.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
SOFA = ROOT / "sofascore_events.json"
WINAMAX_CATALOG = ROOT / "winamax_catalog.json"
WINAMAX_MARKETS = ROOT / "winamax_markets.json"
RUGBY = ROOT / "rugby_markets.json"
TENNIS_CHALLENGER = ROOT / "tennis_challenger_watchlist.json"
FOOTBALL_EXPANSION = ROOT / "football_expansion_watchlist.json"
SPORTS_AUDIT = ROOT / "sports_expansion_audit.json"
OUT_JSON = ROOT / "sports_coverage_extended.json"
OUT_JS = ROOT / "sports_coverage_extended.js"
OUT_REPORT = ROOT / "SPORTS_COVERAGE_REPORT.md"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def parse_data() -> dict[str, Any]:
    if not DATA_JS.exists():
        return {}
    text = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"=\s*(\{.*\})\s*;?\s*$", text, re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group(1))
    except Exception:
        return {}


def clean(value: Any) -> str:
    return str(value or "").strip()


def lc(value: Any) -> str:
    return clean(value).lower()


def event_name(ev: dict[str, Any]) -> str:
    if ev.get("name"):
        return clean(ev.get("name"))
    if ev.get("match"):
        return clean(ev.get("match"))
    home, away = sides(ev)
    if home or away:
        return f"{home} vs {away}".strip()
    return clean(ev.get("shortName") or ev.get("title") or ev.get("event_id") or ev.get("id"))


def sides(ev: dict[str, Any]) -> tuple[str, str]:
    comps = ev.get("competitors") or []
    if isinstance(comps, list) and len(comps) >= 2:
        home = next((c for c in comps if c.get("home_away") == "home"), comps[0])
        away = next((c for c in comps if c is not home), comps[1])
        return clean(home.get("name") or home.get("displayName") or home.get("abbr")), clean(away.get("name") or away.get("displayName") or away.get("abbr"))
    return clean(ev.get("home")), clean(ev.get("away"))


def league_name(ev: dict[str, Any]) -> str:
    return clean(ev.get("league_name") or ev.get("league") or ev.get("league_code") or ev.get("tournament_name"))


def sample(source: str, ev: dict[str, Any], status: str) -> dict[str, Any]:
    return {
        "source": source,
        "status": status,
        "event_id": ev.get("id") or ev.get("uid") or ev.get("event_id") or ev.get("match_id"),
        "kickoff": ev.get("date") or ev.get("kickoff") or ev.get("start_time"),
        "match": event_name(ev),
        "league": league_name(ev),
    }


def add_sample(bucket: dict[str, Any], row: dict[str, Any], limit: int = 8) -> None:
    samples = bucket.setdefault("samples", [])
    key = (row.get("event_id"), row.get("match"), row.get("league"))
    if any((s.get("event_id"), s.get("match"), s.get("league")) == key for s in samples):
        return
    if len(samples) < limit:
        samples.append(row)


SPORTS: list[dict[str, Any]] = [
    {
        "key": "rugby",
        "route": "rugby",
        "emoji": "🏉",
        "label": "Rugby",
        "target": "6 Nations, Top 14, Premiership, Super Rugby",
        "acceptance": "50+ matches/jour pendant saison",
        "model": "Poisson points, variance haute, handicap/total points",
        "markets": ["1n2", "handicap", "total points", "first try scorer"],
        "source_plan": ["ESPN rugby", "World Rugby publics", "Winamax catalog si disponible"],
    },
    {
        "key": "handball",
        "route": "handball",
        "emoji": "🤾",
        "label": "Handball",
        "target": "LNH France, EHF Champions League",
        "acceptance": "20+ matches/jour saison",
        "model": "Poisson buts, lambda 25-35",
        "markets": ["1n2", "total buts", "handicap"],
        "source_plan": ["EHF publics", "LNH publique", "Winamax catalog si disponible"],
    },
    {
        "key": "volleyball",
        "route": "volley",
        "emoji": "🏐",
        "label": "Volleyball",
        "target": "Ligue A France, CEV",
        "acceptance": "10+ matches/jour saison",
        "model": "Sets-based BO5",
        "markets": ["1n2", "nombre de sets", "total points par set"],
        "source_plan": ["CEV publics", "Volleynet publics", "Winamax catalog si disponible"],
    },
    {
        "key": "esports",
        "route": "esport",
        "emoji": "🎮",
        "label": "E-sports",
        "target": "CS, Dota 2, LoL",
        "acceptance": "20+ matches/jour",
        "model": "ELO BO1/BO3/BO5, handicap maps",
        "markets": ["1n2", "handicap maps", "total maps", "first map winner"],
        "source_plan": ["Liquipedia publics", "HLTV publics", "Winamax catalog si disponible"],
    },
    {
        "key": "combat",
        "route": "combat",
        "emoji": "🥊",
        "label": "Boxe / MMA",
        "target": "UFC, grands events boxe, Glory",
        "acceptance": "Tous events UFC + grands events box",
        "model": "ELO + striking/grappling, méthode de victoire",
        "markets": ["vainqueur", "KO/TKO", "submission", "decision", "round betting", "O/U rounds"],
        "source_plan": ["Winamax MMA catalog", "UFC stats publics", "Sherdog publics"],
    },
    {
        "key": "cycling",
        "route": "cyclisme",
        "emoji": "🚴",
        "label": "Cyclisme",
        "target": "Grands Tours, classiques",
        "acceptance": "Tour, Giro, Vuelta, classiques",
        "model": "Profil étape sprint/montagne/TT + forme coureur",
        "markets": ["winner étape", "GC podium", "classement sprint"],
        "source_plan": ["ProCyclingStats publics", "UCI publics", "Winamax catalog si disponible"],
    },
    {
        "key": "winter_sports",
        "route": "ski",
        "emoji": "🎿",
        "label": "Sports d'hiver",
        "target": "Coupe du Monde ski, biathlon",
        "acceptance": "Weekends de course",
        "model": "ELO discipline: slalom, GS, Super-G, descente, biathlon",
        "markets": ["winner", "podium", "nationality"],
        "source_plan": ["FIS publics", "IBU publics", "Winamax catalog si disponible"],
    },
    {
        "key": "athletics",
        "route": "athle",
        "emoji": "🏃",
        "label": "Athlétisme",
        "target": "Diamond League, Mondiaux, JO",
        "acceptance": "Grands events trackés",
        "model": "Personal best + performance récente + contexte météo",
        "markets": ["winner course", "podium"],
        "source_plan": ["World Athletics publics", "Winamax catalog si disponible"],
    },
    {
        "key": "tennis_challenger_itf",
        "route": "tennis-challenger",
        "emoji": "🎾",
        "label": "Tennis Challenger / ITF",
        "target": "ATP Challenger + ITF watchlist",
        "acceptance": "30+ matches/jour Challenger pendant saison",
        "model": "ELO surface + forme récente + fatigue tournoi",
        "markets": ["vainqueur", "nombre de sets", "total games"],
        "source_plan": ["Sackmann public", "Sofascore watchlist", "Winamax tennis catalog"],
    },
    {
        "key": "football_women",
        "route": "foot-feminin",
        "emoji": "⚽",
        "label": "Foot féminin",
        "target": "NWSL, FAWSL, Liga F, UEFA Women",
        "acceptance": "Top-3 ligues féminines couvertes",
        "model": "Poisson adapté, lambdas par ligue féminine",
        "markets": ["1n2", "O/U buts", "BTTS", "handicap"],
        "source_plan": ["FBref féminin", "UEFA féminin publics", "Winamax catalog si disponible"],
    },
    {
        "key": "nfl_playoffs",
        "route": "nfl",
        "emoji": "🏈",
        "label": "NFL playoffs",
        "target": "Playoffs NFL",
        "acceptance": "Tous playoffs",
        "model": "ELO + EPA stats, spread/total points",
        "markets": ["moneyline", "spread", "total points"],
        "source_plan": ["ESPN publics", "Winamax catalog si disponible"],
    },
]


def empty_bucket(spec: dict[str, Any]) -> dict[str, Any]:
    return {
        **spec,
        "status": "missing",
        "bookable_events": 0,
        "source_events": 0,
        "derived_markets": 0,
        "status_label": "Source à brancher",
        "samples": [],
        "notes": [],
    }


def status_for(bookable: int, source: int, markets: int = 0) -> tuple[str, str]:
    if bookable > 0:
        return "ready", "Bookable Winamax"
    if markets > 0:
        return "derived", "Marchés dérivés prêts"
    if source > 0:
        return "watch", "Détecté, pas encore bookable"
    return "missing", "Source à brancher"


def enrich_from_data(buckets: dict[str, dict[str, Any]], data: dict[str, Any]) -> None:
    for day_events in (data.get("days") or {}).values():
        for ev in day_events or []:
            sport = lc(ev.get("sport"))
            league = lc(league_name(ev))
            name = lc(event_name(ev))
            hay = f"{sport} {league} {name}"
            matched: list[str] = []
            if "rugby" in hay:
                matched.append("rugby")
            if "handball" in hay:
                matched.append("handball")
            if "volleyball" in hay or "volley" in hay:
                matched.append("volleyball")
            if "esport" in hay or "counter-strike" in hay or "dota" in hay or "league of legends" in hay:
                matched.append("esports")
            if sport in {"mma", "boxing", "boxe"} or any(tok in hay for tok in ("ufc", "mma", "boxing", "boxe", "glory")):
                matched.append("combat")
            if "cycling" in hay or "cyclisme" in hay:
                matched.append("cycling")
            sport_league_hay = f"{sport} {league}"
            if re.search(r"\b(ski|skiing|biathlon|winter sports|sports d'hiver)\b", sport_league_hay):
                matched.append("winter_sports")
            if re.search(r"\b(athletics|athletisme|athlétisme|diamond league|world athletics)\b", sport_league_hay):
                matched.append("athletics")
            if sport == "tennis" and any(tok in hay for tok in ("challenger", "itf", "utr")):
                matched.append("tennis_challenger_itf")
            if sport == "football" and any(tok in hay for tok in ("women", "feminin", "féminin", "frauen", ".w.")):
                matched.append("football_women")
            if sport == "football-american" or any(tok in hay for tok in ("nfl", "american football")):
                matched.append("nfl_playoffs")
            for key in matched:
                bucket = buckets[key]
                bucket["bookable_events"] += 1
                add_sample(bucket, sample("data.js", ev, "winamax_exact"))


def enrich_from_sofa(buckets: dict[str, dict[str, Any]], sofa: dict[str, Any]) -> None:
    aliases = {
        "rugby": "rugby",
        "handball": "handball",
        "volleyball": "volleyball",
        "esports": "esports",
        "mma": "combat",
        "boxing": "combat",
        "cycling": "cycling",
        "winter-sports": "winter_sports",
        "skiing": "winter_sports",
        "biathlon": "winter_sports",
        "athletics": "athletics",
        "football-american": "nfl_playoffs",
    }
    for sport, events in (sofa.get("events") or {}).items():
        target = aliases.get(lc(sport))
        if not target:
            continue
        bucket = buckets[target]
        bucket["source_events"] += len(events or [])
        for ev in (events or [])[:8]:
            add_sample(bucket, sample("sofascore", ev, "watch_not_actionable_until_winamax_exact"))


def enrich_from_winamax(buckets: dict[str, dict[str, Any]], catalog: dict[str, Any], markets: dict[str, Any]) -> None:
    id_to_sport = {
        8: "rugby",
        13: "rugby",
        16: "handball",
        18: "volleyball",
        117: "combat",
        12: "cycling",
        40: "winter_sports",
        11: "athletics",
        6: "nfl_playoffs",
    }
    market_matches = markets.get("matches") or {}
    for tournament in catalog.get("tournaments") or []:
        sport_id = tournament.get("sport_id")
        sport_name = lc(tournament.get("sport_name"))
        target = id_to_sport.get(sport_id)
        if not target:
            if "rugby" in sport_name:
                target = "rugby"
            elif "handball" in sport_name:
                target = "handball"
            elif "volley" in sport_name:
                target = "volleyball"
            elif "mma" in sport_name or "boxe" in sport_name or "boxing" in sport_name:
                target = "combat"
            elif "football américain" in sport_name or "nfl" in sport_name:
                target = "nfl_playoffs"
        if not target or target not in buckets:
            continue
        bucket = buckets[target]
        matches = tournament.get("matches") or []
        bucket["bookable_events"] += len(matches)
        for m in matches[:8]:
            row = {
                "source": "winamax_catalog",
                "status": "winamax_catalog",
                "event_id": m.get("match_id"),
                "kickoff": None,
                "match": f"{clean(m.get('home'))} vs {clean(m.get('away'))}",
                "league": clean(tournament.get("tournament_name") or tournament.get("category_name")),
            }
            add_sample(bucket, row)
            if str(m.get("match_id")) in market_matches:
                bucket["derived_markets"] += len((market_matches[str(m.get("match_id"))].get("odds") or {}))


def enrich_from_existing_sidecars(buckets: dict[str, dict[str, Any]]) -> None:
    rugby = load_json(RUGBY, {})
    if isinstance(rugby, dict):
        bucket = buckets["rugby"]
        bucket["derived_markets"] += int(rugby.get("markets") or 0)
        for ev in rugby.get("source_watchlist") or []:
            bucket["source_events"] += 1
            add_sample(bucket, sample("rugby_markets", ev, ev.get("status") or "watch"))

    tennis = load_json(TENNIS_CHALLENGER, {})
    if isinstance(tennis, dict):
        bucket = buckets["tennis_challenger_itf"]
        bucket["bookable_events"] += int(tennis.get("bookable_tennis_events") or 0)
        counts = tennis.get("counts") or {}
        bucket["source_events"] += int(counts.get("challenger_like") or 0) + int(counts.get("itf") or 0)
        bucket["notes"].append(
            f"Watchlist tennis: Challenger {counts.get('challenger_like', 0)} · ITF {counts.get('itf', 0)} · UTR {counts.get('utr', 0)}"
        )
        for ev in tennis.get("watchlist") or []:
            add_sample(bucket, sample("tennis_challenger_watchlist", ev, ev.get("status") or "watch"))

    football = load_json(FOOTBALL_EXPANSION, {})
    women = ((football.get("categories") or {}).get("J1_foot_feminin") or {}) if isinstance(football, dict) else {}
    if women:
        bucket = buckets["football_women"]
        bucket["bookable_events"] += int(women.get("bookable") or 0)
        bucket["source_events"] += int(women.get("source") or 0)
        for ev in women.get("samples") or []:
            add_sample(bucket, {
                "source": ev.get("source") or "football_expansion_watchlist",
                "status": "winamax_exact" if ev.get("source") == "winamax_exact" else "watch_not_actionable_until_winamax_exact",
                "event_id": ev.get("event_id"),
                "kickoff": ev.get("kickoff"),
                "match": ev.get("match"),
                "league": ev.get("league"),
            })

    audit = load_json(SPORTS_AUDIT, {})
    sections = audit.get("sections") or {}
    if isinstance(sections, dict):
        j8 = sections.get("J8_rugby") or {}
        if j8:
            buckets["rugby"]["notes"].append(f"Audit J8 rugby: data {j8.get('data_events', 0)} · source {j8.get('sofascore_events', 0)}")
        j2 = sections.get("J2_tennis_challenger_itf") or {}
        if j2:
            buckets["tennis_challenger_itf"]["notes"].append(
                f"Audit J2 tennis mineur: source {j2.get('sofascore_events', 0)} · watchlist {j2.get('watchlist_events', 0)}"
            )


def finalize(buckets: dict[str, dict[str, Any]]) -> None:
    for bucket in buckets.values():
        status, label = status_for(bucket["bookable_events"], bucket["source_events"], bucket["derived_markets"])
        bucket["status"] = status
        bucket["status_label"] = label
        if bucket["status"] in {"watch", "missing"}:
            bucket["notes"].append("Aucun pick n'est généré tant que l'event n'est pas bookable Winamax.")
        if bucket["bookable_events"] > 0 and not bucket["samples"]:
            bucket["notes"].append("Événements bookables détectés, samples indisponibles.")


def summary(buckets: dict[str, dict[str, Any]]) -> dict[str, Any]:
    statuses = Counter(bucket["status"] for bucket in buckets.values())
    return {
        "sports_total": len(buckets),
        "ready": statuses.get("ready", 0),
        "derived": statuses.get("derived", 0),
        "watch": statuses.get("watch", 0),
        "missing": statuses.get("missing", 0),
        "bookable_events": sum(bucket["bookable_events"] for bucket in buckets.values()),
        "source_events": sum(bucket["source_events"] for bucket in buckets.values()),
        "derived_markets": sum(bucket["derived_markets"] for bucket in buckets.values()),
    }


def write_js(payload: dict[str, Any]) -> None:
    OUT_JS.write_text(
        "window.SPORTS_COVERAGE_EXTENDED = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )


def write_report(payload: dict[str, Any]) -> None:
    rows = []
    for item in payload["sports"]:
        rows.append(
            f"| {item['emoji']} {item['label']} | {item['status_label']} | {item['bookable_events']} | {item['source_events']} | {item['derived_markets']} | {item['acceptance']} |"
        )
    ready = [s for s in payload["sports"] if s["status"] == "ready"]
    watch = [s for s in payload["sports"] if s["status"] in {"watch", "derived"}]
    missing = [s for s in payload["sports"] if s["status"] == "missing"]
    report = [
        "# Sports Coverage Report",
        "",
        f"Generated: `{payload['generated_at']}`",
        "",
        "## Summary",
        "",
        f"- Sports indexed: **{payload['summary']['sports_total']}**",
        f"- Ready/bookable: **{payload['summary']['ready']}**",
        f"- Watch/derived: **{payload['summary']['watch'] + payload['summary']['derived']}**",
        f"- Missing source: **{payload['summary']['missing']}**",
        f"- Bookable events observed locally: **{payload['summary']['bookable_events']}**",
        "",
        "## Coverage Matrix",
        "",
        "| Sport | Status | Bookable | Source watch | Derived markets | Target |",
        "|---|---:|---:|---:|---:|---|",
        *rows,
        "",
        "## Operational Notes",
        "",
        "- No new pick is generated for watch-only sports until a Winamax-bookable event is present.",
        "- Combat is currently the most actionable new family because Winamax catalog exposes UFC/MMA events.",
        "- Tennis Challenger/ITF and women's football have source coverage, but remain non-actionable when absent from the Winamax exact feed.",
        "",
        "## Next Technical Steps",
        "",
        "- Add per-sport fetchers only for sports whose Winamax catalog exposes recurring bookable events.",
        "- Keep these pages as coverage/status surfaces, not recommendation feeds, until markets are exact.",
        "- Re-run `scripts/build_sports_coverage_extended.py` after each data refresh.",
        "",
        "## Capture Artifacts",
        "",
        "- `captures/sports-coverage-v37.015/sports-tous.png`",
        *(f"- `captures/sports-coverage-v37.015/{s['route']}.png`" for s in payload["sports"]),
        "",
        "## Ready Families",
        "",
        *(f"- {s['emoji']} **{s['label']}**: {s['bookable_events']} bookable events." for s in ready),
        "",
        "## Watch Families",
        "",
        *(f"- {s['emoji']} **{s['label']}**: {s['source_events']} source events, {s['derived_markets']} derived markets." for s in watch),
        "",
        "## Missing Families",
        "",
        *(f"- {s['emoji']} **{s['label']}**: source connector pending." for s in missing),
        "",
    ]
    OUT_REPORT.write_text("\n".join(report) + "\n", encoding="utf-8")


def main() -> int:
    data = parse_data()
    sofa = load_json(SOFA, {})
    catalog = load_json(WINAMAX_CATALOG, {})
    markets = load_json(WINAMAX_MARKETS, {})
    buckets = {spec["key"]: empty_bucket(spec) for spec in SPORTS}
    enrich_from_data(buckets, data)
    enrich_from_sofa(buckets, sofa)
    enrich_from_winamax(buckets, catalog, markets)
    enrich_from_existing_sidecars(buckets)
    finalize(buckets)
    ordered = [buckets[spec["key"]] for spec in SPORTS]
    payload = {
        "generated_at": now_iso(),
        "source": "local data.js + winamax catalog/markets + sports sidecars",
        "status": "ok",
        "summary": summary(buckets),
        "sports": ordered,
    }
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_js(payload)
    write_report(payload)
    print(
        "sports_coverage_extended: "
        + " ".join(f"{s['key']}={s['status']}:{s['bookable_events']}/{s['source_events']}" for s in ordered)
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""AUDIT 2026-05-09 v41.10 — The Odds API : agrégateur multi-bookmakers.

The Odds API (https://the-odds-api.com) — Free tier 500 requests/month,
agrège ~30 bookmakers (DraftKings, FanDuel, BetMGM, Pinnacle, Bovada, etc.).

Cette intégration est **opt-in** : elle ne tourne que si la variable
d'environnement ``THE_ODDS_API_KEY`` est définie. Sinon no-op silencieux.
Pour activer en local :

    export THE_ODDS_API_KEY=your_key_here
    python3 scripts/fetch_odds_aggregator.py

Pour activer en prod (refresh.yml), ajouter le secret au repo :

    Settings > Secrets > Actions > New repository secret
    Name: THE_ODDS_API_KEY

Output : ``odds_aggregated.json`` à la racine, schéma :

    {
      "generated_at": "2026-05-09T...Z",
      "events": [
        {
          "id": "match-id-from-odds-api",
          "sport_key": "soccer_epl",
          "commence_time": "2026-05-10T19:00:00Z",
          "home_team": "Manchester United",
          "away_team": "Chelsea",
          "bookmakers": {
            "pinnacle": { "home": 2.10, "draw": 3.50, "away": 3.40 },
            "fanduel":  { "home": 2.05, "draw": 3.60, "away": 3.45 },
            ...
          },
          "consensus": { "home": 2.07, "draw": 3.55, "away": 3.42 }
        }
      ]
    }

Consumed by : (à venir) `patch_odds_aggregated.py` qui injecte le consensus
(moyenne arithmétique) sur events ev.odds_consensus + sharp signal
(Pinnacle) sur ev.pinnacle_signal pour comparer cote modèle vs sharp money.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "odds_aggregated.json"
API_BASE = "https://api.the-odds-api.com/v4"

# Sports to fetch (matched to Winamax catalog).
SPORTS = [
    ("soccer_epl", "football"),
    ("soccer_spain_la_liga", "football"),
    ("soccer_italy_serie_a", "football"),
    ("soccer_germany_bundesliga", "football"),
    ("soccer_france_ligue_one", "football"),
    ("soccer_uefa_champs_league", "football"),
    ("baseball_mlb", "baseball"),
    ("basketball_nba", "basketball"),
    ("icehockey_nhl", "hockey"),
    ("tennis_atp", "tennis"),
]

REGIONS = "us,uk,eu"
MARKETS = "h2h"  # 1n2 only — totals/spreads add cost (1 credit per market per region)


def _log(msg: str) -> None:
    print(f"[odds-aggregator] {msg}", flush=True)


def fetch_sport(api_key: str, sport_key: str, our_sport: str) -> list[dict]:
    url = (
        f"{API_BASE}/sports/{sport_key}/odds"
        f"?apiKey={api_key}&regions={REGIONS}&markets={MARKETS}&oddsFormat=decimal"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ParisSportif/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        _log(f"HTTP {exc.code} on {sport_key}: {exc.reason}")
        return []
    except Exception as exc:
        _log(f"FAIL {sport_key}: {exc!r}")
        return []
    out = []
    for ev in data:
        bookmakers = {}
        for bk in ev.get("bookmakers", []) or []:
            bk_key = bk.get("key", "")
            mks = bk.get("markets", []) or []
            h2h = next((m for m in mks if m.get("key") == "h2h"), None)
            if not h2h:
                continue
            outcomes = h2h.get("outcomes", []) or []
            home_team = ev.get("home_team", "")
            away_team = ev.get("away_team", "")
            row = {}
            for o in outcomes:
                price = o.get("price")
                name = o.get("name", "")
                if name == home_team:
                    row["home"] = price
                elif name == away_team:
                    row["away"] = price
                elif name in ("Draw", "Tie"):
                    row["draw"] = price
            if row:
                bookmakers[bk_key] = row
        if not bookmakers:
            continue
        # Consensus = mean across bookmakers
        consensus = {}
        for side in ("home", "draw", "away"):
            vals = [bk[side] for bk in bookmakers.values() if side in bk]
            if vals:
                consensus[side] = round(sum(vals) / len(vals), 3)
        out.append({
            "id": ev.get("id", ""),
            "sport_key": sport_key,
            "our_sport": our_sport,
            "commence_time": ev.get("commence_time", ""),
            "home_team": ev.get("home_team", ""),
            "away_team": ev.get("away_team", ""),
            "bookmakers": bookmakers,
            "consensus": consensus,
        })
    _log(f"{sport_key}: {len(out)} events")
    return out


def main() -> int:
    api_key = os.environ.get("THE_ODDS_API_KEY", "").strip()
    if not api_key:
        _log("THE_ODDS_API_KEY non défini — skip silencieux")
        return 0
    all_events = []
    for sport_key, our_sport in SPORTS:
        evs = fetch_sport(api_key, sport_key, our_sport)
        all_events.extend(evs)
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": "the-odds-api.com",
        "events": all_events,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    _log(f"OK {len(all_events)} events → {OUTPUT.name} ({OUTPUT.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

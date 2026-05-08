#!/usr/bin/env python3
"""AUDIT 2026-05-09 v41.10 — Inject sharp money signals dans data.js.

Lit ``odds_aggregated.json`` (fetché par fetch_odds_aggregator.py) et
matche les events sur les Winamax events de ``data.js`` via
nom + date proche. Pour chaque match matché, ajoute :

  ev.odds_consensus = { home, draw, away }   # moyenne ~30 bookmakers
  ev.pinnacle_signal = { home, draw, away }  # cote Pinnacle (sharp)
  ev.sharp_disagree = { home, draw, away }   # bool : Pinnacle ≠ consensus de >5%

Le frontend exploite ces champs via une nouvelle section "💰 Sharp money"
dans la modal détail (cf v41.15).

No-op silencieux si ``odds_aggregated.json`` absent (pas de clé API).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
ODDS_FILE = ROOT / "odds_aggregated.json"


def _log(msg: str) -> None:
    print(f"[patch-odds-aggregator] {msg}", flush=True)


def _norm(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (name or "").lower())


def main() -> int:
    if not ODDS_FILE.exists():
        _log("odds_aggregated.json absent (THE_ODDS_API_KEY non config?) — skip")
        return 0
    if not DATA_JS.exists():
        _log("data.js absent — skip")
        return 0
    odds = json.loads(ODDS_FILE.read_text(encoding="utf-8"))
    odds_events = odds.get("events", []) or []
    if not odds_events:
        _log("odds_aggregated empty — skip")
        return 0
    text = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$", text, re.DOTALL)
    if not m:
        _log("data.js parse fail — skip")
        return 1
    data = json.loads(m.group(1))
    days = data.get("days", {}) or {}
    # Index by (norm_home, norm_away, date_yyyymmdd)
    index = {}
    for day, evs in days.items():
        for ev in evs or []:
            comps = ev.get("competitors") or []
            if len(comps) < 2:
                continue
            h = next((c for c in comps if c.get("home_away") == "home"), comps[0])
            a = next((c for c in comps if c.get("home_away") == "away"), comps[1])
            key = (_norm(h.get("name", "")), _norm(a.get("name", "")), day[:10])
            index[key] = ev
    matched = 0
    for o in odds_events:
        try:
            ts = o.get("commence_time", "")[:10]
            kh = _norm(o.get("home_team", ""))
            ka = _norm(o.get("away_team", ""))
            ev = index.get((kh, ka, ts))
            if not ev:
                continue
            cons = o.get("consensus") or {}
            ev["odds_consensus"] = cons
            bks = o.get("bookmakers") or {}
            pin = bks.get("pinnacle")
            if pin:
                ev["pinnacle_signal"] = pin
                # Sharp disagree : Pinnacle 5%+ different from consensus.
                disagree = {}
                for side in ("home", "draw", "away"):
                    p = pin.get(side)
                    c = cons.get(side)
                    if p and c and abs(p - c) / c >= 0.05:
                        disagree[side] = "pinnacle_lower" if p < c else "pinnacle_higher"
                if disagree:
                    ev["sharp_disagree"] = disagree
            matched += 1
        except Exception as exc:
            _log(f"WARN match exception: {exc!r}")
    if not matched:
        _log("0 events matched — pas de patch")
        return 0
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    DATA_JS.write_text(f"window.PRONOSTICS_DATA = {payload};\n", encoding="utf-8")
    _log(f"OK {matched}/{len(odds_events)} events enrichis (consensus + Pinnacle signals)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

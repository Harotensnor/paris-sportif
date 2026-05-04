#!/usr/bin/env python3
"""Build local pro-bettor intelligence sidecars.

No paid API, no model training at runtime. This script extracts actionable
signals already present in data.js and backtest sidecars:
- league_inefficiencies.json: where the historical model/bookmaker relation
  looks exploitable or dangerous.
- market_biases_by_league.json: which market families are hot/cold and which
  leagues deserve extra caution.
- detected_angles.json: fatigue, injuries, weather, referee and schedule spots.
- rare_signals.json: compact list of uncommon but high-signal situations.
- timing_edges.json: simple "bet now / wait" guidance from line movement and
  lineup timing.
"""
from __future__ import annotations

import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
BACKTEST = ROOT / "backtest_report_v2.json"
BACKTEST_MARKETS = ROOT / "backtest_report_markets.json"

OUT_LEAGUE = ROOT / "league_inefficiencies.json"
OUT_MARKET_BIASES = ROOT / "market_biases_by_league.json"
OUT_ANGLES = ROOT / "detected_angles.json"
OUT_RARE = ROOT / "rare_signals.json"
OUT_TIMING = ROOT / "timing_edges.json"

MARKET_LABELS = {
    "ou15": "Total buts 1,5",
    "ou25": "Total buts 2,5",
    "ou35": "Total buts 3,5",
    "btts": "Les deux equipes marquent",
    "doubleChance": "Double chance",
    "1n2": "Resultat du match",
    "dnb": "Nul rembourse",
    "handicap": "Handicap",
}

PICK_LABELS = {
    "BTTS_Y": "Oui",
    "BTTS_N": "Non",
    "O1.5": "Plus de 1,5",
    "U1.5": "Moins de 1,5",
    "O2.5": "Plus de 2,5",
    "U2.5": "Moins de 2,5",
    "O3.5": "Plus de 3,5",
    "U3.5": "Moins de 3,5",
    "1X": "Domicile ou nul",
    "X2": "Nul ou exterieur",
    "12": "Domicile ou exterieur",
}


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def load_data() -> dict[str, Any]:
    if not DATA_JS.exists():
        return {}
    txt = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$", txt, re.DOTALL)
    if not m:
        return {}
    return json.loads(m.group(1))


def iter_events(data: dict[str, Any]):
    for _day, events in (data.get("days") or {}).items():
        for ev in events or []:
            yield ev


def side_name(ev: dict[str, Any], side: str) -> str:
    for c in ev.get("competitors") or []:
        if c.get("home_away") == side:
            return c.get("name") or c.get("displayName") or c.get("shortDisplayName") or ""
    name = ev.get("name") or ""
    if " at " in name:
        away, home = name.split(" at ", 1)
        return home.strip() if side == "home" else away.strip()
    return ""


def event_ts(ev: dict[str, Any]) -> float | None:
    raw = ev.get("date") or ev.get("commence_time")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00")).timestamp()
    except Exception:
        return None


def current_1n2_odds(ev: dict[str, Any]) -> dict[str, float]:
    markets = ((ev.get("winamax") or {}).get("markets") or {})
    one = markets.get("1n2") or markets.get("winner") or {}
    if not isinstance(one, dict):
        return {}
    out: dict[str, float] = {}
    for key, aliases in {
        "home": ("home", "1", "domicile"),
        "draw": ("draw", "X", "nul"),
        "away": ("away", "2", "exterieur", "extérieur"),
    }.items():
        for alias in aliases:
            val = one.get(alias)
            if isinstance(val, (int, float)) and val > 1:
                out[key] = float(val)
                break
    return out


def snapshot_1n2_odds(ev: dict[str, Any]) -> dict[str, float]:
    snap = ev.get("odds_snapshot") or {}
    if not isinstance(snap, dict):
        return {}
    out: dict[str, float] = {}
    for key in ("home", "draw", "away"):
        val = snap.get(key)
        if isinstance(val, (int, float)) and val > 1:
            out[key] = float(val)
    return out


def build_team_schedule(events: list[dict[str, Any]]) -> dict[str, list[float]]:
    schedule: dict[str, list[float]] = defaultdict(list)
    for ev in events:
        ts = event_ts(ev)
        if ts is None:
            continue
        for side in ("home", "away"):
            name = side_name(ev, side)
            if name:
                schedule[name.lower()].append(ts)
    for arr in schedule.values():
        arr.sort()
    return schedule


def build_league_inefficiencies(data: dict[str, Any]) -> dict[str, Any]:
    bt = load_json(BACKTEST)
    by_league = bt.get("by_league") or {}
    current = Counter(str(ev.get("league_code") or "unknown") for ev in iter_events(data) if not ev.get("completed"))
    rows = []
    for code, stats in sorted(by_league.items()):
        if not isinstance(stats, dict):
            continue
        n = int(stats.get("n") or 0)
        if n < 10:
            continue
        roi = float(stats.get("flat_roi_pct") or 0)
        brier = float(stats.get("brier") or 0)
        wr = stats.get("win_rate")
        if n >= 50:
            conf = "high"
        elif n >= 25:
            conf = "medium"
        else:
            conf = "watch"
        ineff = round((roi / 100.0) + max(-0.08, min(0.08, 0.24 - brier)), 4)
        if roi >= 5 and brier <= 0.245:
            status = "exploit"
            direction = "model_edge"
        elif roi <= -8 or brier >= 0.255:
            status = "avoid"
            direction = "bookmaker_edge"
        else:
            status = "neutral"
            direction = "monitor"
        rows.append({
            "league_code": code,
            "status": status,
            "direction": direction,
            "inefficiency_score": ineff,
            "confidence": conf,
            "n": n,
            "win_rate": wr,
            "flat_roi_pct": stats.get("flat_roi_pct"),
            "brier": stats.get("brier"),
            "kelly_pnl": stats.get("kelly_pnl"),
            "current_upcoming": current.get(code, 0),
        })
    rows.sort(key=lambda r: (
        {"exploit": 0, "avoid": 1, "neutral": 2}.get(r["status"], 9),
        -abs(r["inefficiency_score"]),
        -(r.get("current_upcoming") or 0),
    ))
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "schema": "league_inefficiencies_v1",
        "source": "backtest_report_v2.by_league + current data.js slate",
        "summary": {
            "leagues": len(rows),
            "exploit": sum(1 for r in rows if r["status"] == "exploit"),
            "avoid": sum(1 for r in rows if r["status"] == "avoid"),
            "current_exploit_events": sum(r["current_upcoming"] for r in rows if r["status"] == "exploit"),
        },
        "leagues": rows[:80],
    }


def market_label(key: str) -> tuple[str, str, str]:
    family, _, pick = str(key or "").partition(":")
    return family, PICK_LABELS.get(pick, pick), MARKET_LABELS.get(family, family or "marche")


def market_status(n: int, wr: float, lo: float | None, hi: float | None) -> tuple[str, str]:
    if n < 20:
        return "watch", "sample faible"
    if lo is not None and lo > 0.52:
        return "exploit", "borne basse >52%"
    if hi is not None and hi < 0.48:
        return "fade", "borne haute <48%"
    if wr >= 0.58:
        return "exploit", "win rate fort"
    if wr <= 0.42:
        return "fade", "win rate faible"
    return "neutral", "pas de biais net"


def build_market_biases(data: dict[str, Any]) -> dict[str, Any]:
    markets = load_json(BACKTEST_MARKETS)
    current_by_league = Counter(
        str(ev.get("league_code") or "unknown")
        for ev in iter_events(data)
        if not ev.get("completed")
    )
    current_by_sport = Counter(
        str(ev.get("sport") or "unknown")
        for ev in iter_events(data)
        if not ev.get("completed")
    )

    market_rows: list[dict[str, Any]] = []
    for key, stats in sorted((markets.get("by_market_pick") or {}).items()):
        if not isinstance(stats, dict):
            continue
        n = int(stats.get("n") or 0)
        wins = int(stats.get("wins") or 0)
        losses = int(stats.get("losses") or 0)
        if n <= 0 or wins + losses <= 0:
            continue
        wr = float(stats.get("win_rate") or (wins / max(1, wins + losses)))
        lo = stats.get("wr_ci_lo")
        hi = stats.get("wr_ci_hi")
        lo = float(lo) if isinstance(lo, (int, float)) else None
        hi = float(hi) if isinstance(hi, (int, float)) else None
        status, reason = market_status(n, wr, lo, hi)
        family, pick, label = market_label(key)
        market_rows.append({
            "market_key": key,
            "family": family,
            "pick": pick,
            "label": label,
            "status": status,
            "reason": reason,
            "n": n,
            "wins": wins,
            "losses": losses,
            "win_rate": round(wr, 4),
            "wr_ci": [lo, hi],
            "edge_vs_50_pct": round((wr - 0.5) * 100, 2),
        })

    league_rows: list[dict[str, Any]] = []
    for code, stats in sorted((markets.get("by_league") or {}).items()):
        if not isinstance(stats, dict):
            continue
        n = int(stats.get("n") or 0)
        if n < 10:
            continue
        wr = float(stats.get("win_rate") or 0)
        lo = stats.get("wr_ci_lo")
        hi = stats.get("wr_ci_hi")
        lo = float(lo) if isinstance(lo, (int, float)) else None
        hi = float(hi) if isinstance(hi, (int, float)) else None
        status, reason = market_status(n, wr, lo, hi)
        league_rows.append({
            "league_code": code,
            "status": status,
            "reason": reason,
            "n": n,
            "win_rate": round(wr, 4),
            "wr_ci": [lo, hi],
            "edge_vs_50_pct": round((wr - 0.5) * 100, 2),
            "current_upcoming": current_by_league.get(code, 0),
        })

    market_rows.sort(key=lambda row: (
        {"exploit": 0, "fade": 1, "watch": 2, "neutral": 3}.get(row["status"], 9),
        -abs(row["edge_vs_50_pct"]),
        -row["n"],
    ))
    league_rows.sort(key=lambda row: (
        {"exploit": 0, "fade": 1, "watch": 2, "neutral": 3}.get(row["status"], 9),
        -row["current_upcoming"],
        -abs(row["edge_vs_50_pct"]),
    ))
    watchlist = [
        {
            "league_code": league["league_code"],
            "league_status": league["status"],
            "current_upcoming": league["current_upcoming"],
            "market": market["label"],
            "pick": market["pick"],
            "market_status": market["status"],
            "context": f"{league['league_code']} {league['reason']} · {market['label']} {market['reason']}",
        }
        for league in league_rows
        if league["current_upcoming"] > 0 and league["status"] in {"exploit", "fade"}
        for market in market_rows[:6]
        if market["status"] in {"exploit", "fade"}
    ][:40]
    if not watchlist:
        total_current = sum(current_by_sport.values())
        watchlist = [
            {
                "scope": "global",
                "current_upcoming": total_current,
                "market": row["label"],
                "pick": row["pick"],
                "market_status": row["status"],
                "context": f"{row['label']} · {row['pick']} : {row['reason']} ({row['win_rate']:.1%}, n={row['n']})",
            }
            for row in market_rows
            if row["status"] in {"exploit", "fade"}
        ][:20]

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "schema": "market_biases_by_league_v1",
        "source": "backtest_report_markets.json + current data.js slate",
        "summary": {
            "markets": len(market_rows),
            "market_exploit": sum(1 for row in market_rows if row["status"] == "exploit"),
            "market_fade": sum(1 for row in market_rows if row["status"] == "fade"),
            "league_rows": len(league_rows),
            "league_exploit": sum(1 for row in league_rows if row["status"] == "exploit"),
            "league_fade": sum(1 for row in league_rows if row["status"] == "fade"),
            "current_events_by_sport": dict(current_by_sport),
            "watchlist": len(watchlist),
        },
        "markets": market_rows[:80],
        "leagues": league_rows[:120],
        "watchlist": watchlist,
    }


def detect_event_angles(ev: dict[str, Any], schedule: dict[str, list[float]], now_ts: float) -> list[dict[str, Any]]:
    angles: list[dict[str, Any]] = []
    ts = event_ts(ev)
    if ts is None:
        return angles
    home = side_name(ev, "home")
    away = side_name(ev, "away")

    for side, team in (("home", home), ("away", away)):
        if not team:
            continue
        arr = schedule.get(team.lower()) or []
        prev_7 = [x for x in arr if ts - 7 * 86400 <= x < ts]
        next_3 = [x for x in arr if ts < x <= ts + 3 * 86400]
        if len(prev_7) >= 3:
            angles.append({
                "type": "schedule_congestion",
                "team": team,
                "side": side,
                "direction": "fade",
                "strength": min(1.0, len(prev_7) / 5),
                "context": f"{len(prev_7)} matchs sur les 7 derniers jours",
            })
        if next_3:
            angles.append({
                "type": "lookahead",
                "team": team,
                "side": side,
                "direction": "caution",
                "strength": min(0.8, len(next_3) / 3),
                "context": f"{len(next_3)} match important/proche dans les 3 jours",
            })

    inj_h = int(ev.get("injuries_home") or 0)
    inj_a = int(ev.get("injuries_away") or 0)
    if abs(inj_h - inj_a) >= 2:
        weakened = home if inj_h > inj_a else away
        angles.append({
            "type": "injury_imbalance",
            "team": weakened,
            "direction": "fade",
            "strength": min(1.0, abs(inj_h - inj_a) / 5),
            "context": f"Absences severes {inj_h}-{inj_a}",
        })

    w = ev.get("weather") or {}
    wind = float(w.get("wind_kmh") or 0)
    rain = float(w.get("precip_mm") or 0)
    if ev.get("sport") == "football" and (wind >= 35 or rain >= 8):
        angles.append({
            "type": "weather_extreme",
            "direction": "under_goals",
            "strength": min(1.0, max(wind / 60, rain / 20)),
            "context": f"Meteo dure: vent {wind:.0f} km/h, pluie {rain:.1f} mm",
        })

    ref = ev.get("referee") or {}
    ypg = ref.get("yellowPerGame") or ref.get("cardsPerGame")
    if isinstance(ypg, (int, float)) and ypg >= 5.0:
        angles.append({
            "type": "strict_referee",
            "direction": "cards_over",
            "strength": min(1.0, ypg / 7),
            "context": f"Arbitre strict: {ypg:.1f} jaunes/match",
        })

    cur = current_1n2_odds(ev)
    snap = snapshot_1n2_odds(ev)
    for side, current in cur.items():
        before = snap.get(side)
        if not before:
            continue
        move = (before - current) / before
        if abs(move) >= 0.08:
            angles.append({
                "type": "market_move",
                "side": side,
                "direction": "steam" if move > 0 else "drift",
                "strength": min(1.0, abs(move) / 0.18),
                "context": f"Cote {side}: {before:.2f} -> {current:.2f} ({move*100:+.1f}%)",
            })
    return angles


def build_angles(data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    events = list(iter_events(data))
    schedule = build_team_schedule(events)
    now_ts = datetime.now(timezone.utc).timestamp()
    angle_rows = []
    rare_rows = []
    timing_rows = []

    for ev in events:
        if ev.get("completed"):
            continue
        ts = event_ts(ev)
        if ts is None or ts < now_ts - 600:
            continue
        home = side_name(ev, "home")
        away = side_name(ev, "away")
        base = {
            "event_id": str(ev.get("id") or ""),
            "sport": ev.get("sport") or "",
            "league_code": ev.get("league_code") or "",
            "league_name": ev.get("league_name") or "",
            "date": ev.get("date") or "",
            "home": home,
            "away": away,
        }
        angles = detect_event_angles(ev, schedule, now_ts)
        if angles:
            angle_rows.append({**base, "angles": angles})
        for angle in angles:
            if angle["type"] in {"injury_imbalance", "weather_extreme", "strict_referee", "market_move"} and angle["strength"] >= 0.45:
                rare_rows.append({**base, "signal": angle})

        minutes_to_kickoff = (ts - now_ts) / 60
        cur = current_1n2_odds(ev)
        snap = snapshot_1n2_odds(ev)
        best_move = None
        for side, current in cur.items():
            before = snap.get(side)
            if not before:
                continue
            pct = (before - current) / before
            if best_move is None or abs(pct) > abs(best_move["move_pct"]):
                best_move = {"side": side, "from": before, "to": current, "move_pct": pct}
        if best_move or (0 <= minutes_to_kickoff <= 150):
            advice = "wait_lineups" if 45 < minutes_to_kickoff <= 150 and ev.get("sport") == "football" else "bet_now_if_selected"
            if best_move and best_move["move_pct"] > 0.08:
                advice = "price_shortening"
            elif best_move and best_move["move_pct"] < -0.08:
                advice = "wait_or_recheck"
            timing_rows.append({
                **base,
                "minutes_to_kickoff": round(minutes_to_kickoff, 1),
                "advice": advice,
                "best_move": best_move,
            })

    angle_type_counts = Counter(a["type"] for row in angle_rows for a in row["angles"])
    return (
        {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "schema": "detected_angles_v1",
            "summary": {
                "events_with_angles": len(angle_rows),
                "angles": sum(len(r["angles"]) for r in angle_rows),
                "by_type": dict(angle_type_counts),
            },
            "events": angle_rows[:300],
        },
        {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "schema": "rare_signals_v1",
            "summary": {
                "signals": len(rare_rows),
                "by_type": dict(Counter(r["signal"]["type"] for r in rare_rows)),
            },
            "signals": rare_rows[:120],
        },
        {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "schema": "timing_edges_v1",
            "summary": {
                "events": len(timing_rows),
                "bet_now": sum(1 for r in timing_rows if r["advice"] == "bet_now_if_selected"),
                "wait": sum(1 for r in timing_rows if r["advice"] in {"wait_lineups", "wait_or_recheck"}),
                "price_shortening": sum(1 for r in timing_rows if r["advice"] == "price_shortening"),
            },
            "events": timing_rows[:200],
        },
    )


def write(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def main() -> int:
    data = load_data()
    if not data:
        print("[betting-intel] no data.js parsed")
        return 1
    league = build_league_inefficiencies(data)
    market_biases = build_market_biases(data)
    angles, rare, timing = build_angles(data)
    write(OUT_LEAGUE, league)
    write(OUT_MARKET_BIASES, market_biases)
    write(OUT_ANGLES, angles)
    write(OUT_RARE, rare)
    write(OUT_TIMING, timing)
    print(
        "[betting-intel] "
        f"leagues={league['summary']['leagues']} "
        f"market_biases={market_biases['summary']['markets']} "
        f"watchlist={market_biases['summary']['watchlist']} "
        f"angles={angles['summary']['angles']} "
        f"rare={rare['summary']['signals']} "
        f"timing={timing['summary']['events']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

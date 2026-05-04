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
STADIUMS = ROOT / "stadiums.json"

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

SPORT_STADIUM_KEYS = {
    ("baseball", "mlb"): "mlb",
    ("basketball", "nba"): "nba",
    ("hockey", "nhl"): "nhl",
}

TEAM_ABBR_ALIASES = {
    "mlb": {
        "BO": "BAL",
        "MM": "MIA",
        "PP": "PHI",
    },
}


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def normalize_abbr(value: Any, stadium_key: str) -> str:
    raw = str(value or "").strip().upper()
    return TEAM_ABBR_ALIASES.get(stadium_key, {}).get(raw, raw)


def haversine_km(a: list[float] | tuple[float, float], b: list[float] | tuple[float, float]) -> float:
    lat1, lon1 = math.radians(float(a[0])), math.radians(float(a[1]))
    lat2, lon2 = math.radians(float(b[0])), math.radians(float(b[1]))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0 * 2 * math.asin(min(1.0, math.sqrt(h)))


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


def side_competitor(ev: dict[str, Any], side: str) -> dict[str, Any]:
    for c in ev.get("competitors") or []:
        if c.get("home_away") == side:
            return c
    return {}


def side_name(ev: dict[str, Any], side: str) -> str:
    c = side_competitor(ev, side)
    if c:
        return c.get("name") or c.get("displayName") or c.get("shortDisplayName") or ""
    name = ev.get("name") or ""
    if " at " in name:
        away, home = name.split(" at ", 1)
        return home.strip() if side == "home" else away.strip()
    return ""


def side_abbr(ev: dict[str, Any], side: str) -> str:
    c = side_competitor(ev, side)
    return c.get("abbr") or c.get("abbreviation") or c.get("shortDisplayName") or ""


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


def detect_1n2_market_anomaly(cur: dict[str, float], snap: dict[str, float]) -> dict[str, Any] | None:
    if not cur:
        return None
    sides = [side for side in ("home", "draw", "away") if cur.get(side, 0) > 1]
    if len(sides) < 2:
        return None
    implied = sum(1 / cur[side] for side in sides)
    margin = implied - 1
    high_margin_limit = 0.12 if len(sides) == 2 else 0.18
    low_implied_limit = 0.98 if len(sides) == 2 else 1.00
    reasons: list[str] = []

    home_drift = away_drift = None
    if cur.get("home") and cur.get("away") and snap.get("home") and snap.get("away"):
        home_drift = (cur["home"] - snap["home"]) / snap["home"]
        away_drift = (cur["away"] - snap["away"]) / snap["away"]
        if home_drift >= 0.06 and away_drift >= 0.06:
            reasons.append(f"home et away montent ensemble ({home_drift*100:+.1f}% / {away_drift*100:+.1f}%)")

    if margin > high_margin_limit:
        reasons.append(f"marge bookmaker anormale {margin*100:.1f}%")
    if implied < low_implied_limit:
        reasons.append(f"somme probabilites trop basse {implied*100:.1f}%")

    if not reasons:
        return None
    return {
        "reason": "; ".join(reasons),
        "implied_sum": round(implied, 4),
        "margin_pct": round(margin * 100, 2),
        "home_drift_pct": round(home_drift * 100, 2) if home_drift is not None else None,
        "away_drift_pct": round(away_drift * 100, 2) if away_drift is not None else None,
        "side_count": len(sides),
    }


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


def detect_travel_angles(
    ev: dict[str, Any],
    schedule: dict[str, list[float]],
    ts: float,
    stadiums: dict[str, Any],
) -> list[dict[str, Any]]:
    sport = str(ev.get("sport") or "").lower()
    league = str(ev.get("league_code") or "").lower()
    stadium_key = SPORT_STADIUM_KEYS.get((sport, league))
    if not stadium_key:
        return []

    coords = stadiums.get(stadium_key) or {}
    if not isinstance(coords, dict):
        return []

    home = side_name(ev, "home")
    away = side_name(ev, "away")
    home_abbr = normalize_abbr(side_abbr(ev, "home"), stadium_key)
    away_abbr = normalize_abbr(side_abbr(ev, "away"), stadium_key)
    home_xy = coords.get(home_abbr)
    away_xy = coords.get(away_abbr)
    if not home or not away or not home_xy or not away_xy:
        return []

    distance = haversine_km(away_xy, home_xy)
    timezone_delta = abs(float(away_xy[1]) - float(home_xy[1])) / 15.0
    arr = schedule.get(away.lower()) or []
    prev_48h = [x for x in arr if ts - 48 * 3600 <= x < ts]
    angles: list[dict[str, Any]] = []

    if distance >= 1800 or timezone_delta >= 2.5:
        angles.append({
            "type": "travel_extreme",
            "team": away,
            "side": "away",
            "direction": "fade",
            "strength": min(1.0, max(distance / 4300, timezone_delta / 4.5)),
            "context": f"Deplacement estime {distance:.0f} km, decalage ~{timezone_delta:.1f}h",
        })

    if prev_48h and distance >= 800:
        angles.append({
            "type": "back_to_back_travel",
            "team": away,
            "side": "away",
            "direction": "fade",
            "strength": min(1.0, 0.45 + distance / 5000 + min(0.2, len(prev_48h) * 0.08)),
            "context": f"{len(prev_48h)} match dans les 48h + {distance:.0f} km de voyage",
        })

    return angles


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
        if n < 20:
            status = "data_insufficient"
            direction = "watch_sample"
            reason = f"Sample insuffisant ({n} picks): ne pas conclure"
        elif roi >= 5 and brier <= 0.245:
            status = "exploit"
            direction = "model_edge"
            reason = f"ROI {roi:+.1f}% avec Brier {brier:.3f}"
        elif roi <= -8 and isinstance(wr, (int, float)) and wr >= 0.52:
            status = "avoid_low_roi"
            direction = "bookmaker_edge_low_value"
            reason = f"WR {wr*100:.1f}% mais ROI {roi:+.1f}%: cotes trop basses"
        elif roi <= -8 or brier >= 0.255:
            status = "avoid_low_wr"
            direction = "bookmaker_edge"
            reason = f"ROI {roi:+.1f}% ou Brier {brier:.3f} fragile"
        else:
            status = "neutral"
            direction = "monitor"
            reason = "Pas de biais exploitable confirme"
        rows.append({
            "league_code": code,
            "status": status,
            "direction": direction,
            "reason": reason,
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
        {
            "exploit": 0,
            "avoid_low_roi": 1,
            "avoid_low_wr": 1,
            "data_insufficient": 2,
            "neutral": 3,
        }.get(r["status"], 9),
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
            "avoid": sum(1 for r in rows if str(r["status"]).startswith("avoid")),
            "data_insufficient": sum(1 for r in rows if r["status"] == "data_insufficient"),
            "current_exploit_events": sum(r["current_upcoming"] for r in rows if r["status"] == "exploit"),
        },
        "leagues": rows[:80],
    }


def market_label(key: str) -> tuple[str, str, str]:
    family, _, pick = str(key or "").partition(":")
    return family, PICK_LABELS.get(pick, pick), MARKET_LABELS.get(family, family or "marche")


def _num(value: Any, default: float | None = None) -> float | None:
    if isinstance(value, (int, float)) and math.isfinite(float(value)):
        return float(value)
    return default


def _market_sample_signature(stats: dict[str, Any]) -> str:
    """Stable fingerprint for one market row's real evaluated sample.

    This is intentionally human-readable: if a future regression accidentally
    reuses one slice for every market, the audit can catch cloned rows even
    when status labels stay conservative.
    """
    fields = (
        int(stats.get("n") or 0),
        int(stats.get("wins") or 0),
        int(stats.get("losses") or 0),
        int(stats.get("voids") or 0),
        int(stats.get("with_odds") or 0),
        round(float(stats.get("roi") or 0), 4),
        round(float(stats.get("avg_odd") or 0), 4),
    )
    return "n={}:w={}:l={}:v={}:odds={}:roi={}:odd={}".format(*fields)


def market_status(
    n: int,
    wr: float,
    lo: float | None,
    hi: float | None,
    *,
    with_odds: int = 0,
    roi: float | None = None,
    avg_odd: float | None = None,
    family: str = "",
    pick: str = "",
) -> tuple[str, str, str]:
    """Classify a market bias without mistaking high WR for value.

    The historical market report only exposes rows with a real priced sample.
    Tiny samples remain watch-only: they are evidence that the market exists,
    not yet evidence that it is exploitable.
    """
    if n < 20:
        if with_odds > 0:
            return "watch", "sample de cotes faible", "sample_insufficient"
        return "watch", "sample faible sans cotes", "sample_insufficient"

    if family == "doubleChance" and pick == "12" and (avg_odd is None or avg_odd <= 1.40):
        return "low_value", "WR haut mais cote trop basse pour etre rentable", "wr_without_value"

    priced = with_odds >= 20 and roi is not None
    estimated_value = roi if priced else ((avg_odd * wr) - 1.0 if avg_odd and avg_odd > 1 else None)
    if not priced and estimated_value is None:
        if lo is not None and lo > 0.52:
            return "watch", "WR fort, mais aucune cote exploitable dans le sample", "directional_only"
        if hi is not None and hi < 0.48:
            return "watch", "WR faible, mais aucune cote exploitable dans le sample", "directional_only"
        return "watch", "sample directionnel sans cotes", "directional_only"

    if estimated_value is not None and estimated_value <= 0 and wr >= 0.58:
        return "low_value", "WR positif mais ROI/cote non rentable", "wr_without_value"
    if estimated_value is not None and estimated_value >= 0.02 and (lo is not None and lo > 0.52 or wr >= 0.58):
        return "exploit", "WR et valeur positive confirmes", "priced_value"
    if estimated_value is not None and estimated_value <= -0.03:
        return "fade", "ROI/cote negatif sur le sample", "priced_value"
    if hi is not None and hi < 0.48 and estimated_value is not None and estimated_value < 0:
        return "fade", "WR faible + valeur negative", "priced_value"
    return "neutral", "pas de biais net", "priced_value" if estimated_value is not None else "directional_only"


def build_market_biases(data: dict[str, Any]) -> dict[str, Any]:
    markets = load_json(BACKTEST_MARKETS)
    league_bt = (load_json(BACKTEST).get("by_league") or {})
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
        family, pick, label = market_label(key)
        with_odds = int(stats.get("with_odds") or 0)
        roi = _num(stats.get("roi"))
        avg_odd = _num(stats.get("avg_odd"))
        status, reason, evidence = market_status(
            n,
            wr,
            lo,
            hi,
            with_odds=with_odds,
            roi=roi,
            avg_odd=avg_odd,
            family=family,
            pick=str(key).split(":", 1)[1] if ":" in str(key) else "",
        )
        sample_scope = "priced_market_sample" if with_odds > 0 else "directional_settled_match_sample"
        confidence = "priced" if with_odds >= 20 else "priced_watch" if with_odds > 0 else "directional_watch"
        sample_signature = _market_sample_signature(stats)
        market_rows.append({
            "market_key": key,
            "family": family,
            "pick": pick,
            "label": label,
            "status": status,
            "reason": reason,
            "sample_scope": sample_scope,
            "confidence": confidence,
            "n": n,
            "wins": wins,
            "losses": losses,
            "with_odds": with_odds,
            "roi": round(roi, 4) if roi is not None else None,
            "avg_odd": round(avg_odd, 3) if avg_odd is not None else None,
            "win_rate": round(wr, 4),
            "wr_ci": [lo, hi],
            "edge_vs_50_pct": round((wr - 0.5) * 100, 2),
            "evidence": evidence,
            "sample_signature": sample_signature,
        })

    league_rows: list[dict[str, Any]] = []
    for code, stats in sorted(league_bt.items()):
        if not isinstance(stats, dict):
            continue
        n = int(stats.get("n") or 0)
        if n <= 0:
            continue
        wr = float(stats.get("win_rate") or 0)
        roi = _num(stats.get("flat_roi_pct"), 0.0) or 0.0
        brier = _num(stats.get("brier"), 0.0) or 0.0
        if n < 20:
            status = "data_insufficient"
            reason = f"Sample reel trop faible ({n} picks)"
        elif roi >= 5 and brier <= 0.245:
            status = "exploit"
            reason = f"ROI {roi:+.1f}% avec Brier {brier:.3f}"
        elif roi < -8 and wr >= 0.52:
            status = "avoid_low_roi"
            reason = f"WR {wr:.1%} mais ROI {roi:+.1f}%"
        elif wr < 0.45:
            status = "avoid_low_wr"
            reason = f"WR faible {wr:.1%}"
        elif brier >= 0.255:
            status = "watch"
            reason = f"Calibration fragile Brier {brier:.3f}"
        else:
            status = "neutral"
            reason = "pas de biais net"
        league_rows.append({
            "league_code": code,
            "status": status,
            "reason": reason,
            "n": n,
            "win_rate": round(wr, 4),
            "flat_roi_pct": stats.get("flat_roi_pct"),
            "brier": stats.get("brier"),
            "kelly_pnl": stats.get("kelly_pnl"),
            "edge_vs_50_pct": round((wr - 0.5) * 100, 2),
            "current_upcoming": current_by_league.get(code, 0),
        })

    sort_rank = {
        "exploit": 0,
        "fade": 1,
        "avoid_low_roi": 1,
        "avoid_low_wr": 1,
        "low_value": 2,
        "watch": 3,
        "data_insufficient": 4,
        "neutral": 5,
    }
    market_rows.sort(key=lambda row: (
        sort_rank.get(row["status"], 9),
        -abs(row["edge_vs_50_pct"]),
        -row["n"],
    ))
    league_rows.sort(key=lambda row: (
        sort_rank.get(row["status"], 9),
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
        if league["current_upcoming"] > 0 and league["status"] in {"exploit", "avoid_low_roi", "avoid_low_wr"}
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

    market_ns = {row["n"] for row in market_rows}
    market_signatures = {row.get("sample_signature") for row in market_rows}
    market_priced = sum(1 for row in market_rows if (row.get("with_odds") or 0) > 0)
    market_sample_warning = None
    if len(market_rows) > 1 and len(market_signatures) == 1:
        market_sample_warning = "all_market_rows_share_same_sample_signature"
    elif len(market_rows) > 1 and len(market_ns) == 1 and market_priced == 0:
        market_sample_warning = "all_market_rows_share_same_n_without_odds"

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "schema": "market_biases_by_league_v2",
        "source": "backtest_report_markets.by_market_pick + backtest_report_v2.by_league + current data.js slate",
        "summary": {
            "markets": len(market_rows),
            "market_exploit": sum(1 for row in market_rows if row["status"] == "exploit"),
            "market_fade": sum(1 for row in market_rows if row["status"] == "fade"),
            "market_low_value": sum(1 for row in market_rows if row["status"] == "low_value"),
            "market_priced_rows": market_priced,
            "market_sample_scope": "priced" if market_priced else "directional_only",
            "market_sample_warning": market_sample_warning,
            "market_sample_n_values": sorted(market_ns),
            "market_sample_signature_values": len(market_signatures),
            "market_clone_guard": "passed" if not market_sample_warning else "watch",
            "league_rows": len(league_rows),
            "league_exploit": sum(1 for row in league_rows if row["status"] == "exploit"),
            "league_avoid": sum(1 for row in league_rows if str(row["status"]).startswith("avoid")),
            "league_data_insufficient": sum(1 for row in league_rows if row["status"] == "data_insufficient"),
            "current_events_by_sport": dict(current_by_sport),
            "watchlist": len(watchlist),
        },
        "markets": market_rows[:80],
        "leagues": league_rows[:120],
        "watchlist": watchlist,
    }


def detect_event_angles(
    ev: dict[str, Any],
    schedule: dict[str, list[float]],
    now_ts: float,
    stadiums: dict[str, Any],
) -> list[dict[str, Any]]:
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

    market_uncertain = ev.get("market_uncertain") or {}
    if isinstance(market_uncertain, dict) and market_uncertain:
        angles.append({
            "type": "market_uncertain",
            "direction": "abstain",
            "strength": 0.85,
            "context": market_uncertain.get("reason") or "Mouvement de cote incoherent: verifier avant de parier",
            "open_margin_pct": market_uncertain.get("open_margin_pct"),
            "latest_margin_pct": market_uncertain.get("latest_margin_pct"),
        })

    cur = current_1n2_odds(ev)
    snap = snapshot_1n2_odds(ev)
    market_anomaly = detect_1n2_market_anomaly(cur, snap)
    if market_anomaly:
        angles.append({
            "type": "market_uncertain",
            "direction": "abstain",
            "strength": 0.85,
            "context": market_anomaly["reason"],
            "margin_pct": market_anomaly.get("margin_pct"),
            "implied_sum": market_anomaly.get("implied_sum"),
        })
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
    angles.extend(detect_travel_angles(ev, schedule, ts, stadiums))
    return angles


def _angle_side(angle: dict[str, Any], home: str, away: str) -> str | None:
    side = str(angle.get("side") or "").lower()
    if side in {"home", "away"}:
        return side
    team = str(angle.get("team") or "").strip().lower()
    if team and team == home.lower():
        return "home"
    if team and team == away.lower():
        return "away"
    return None


def resolve_contradictory_angles(
    angles: list[dict[str, Any]],
    home: str,
    away: str,
) -> dict[str, Any]:
    """Net side-level angles before the frontend turns them into confidence.

    A match can legitimately have a fade signal on both teams. In that case the
    product should not pretend there is a clear betting edge; it should say
    "prudence" and let the pick abstain/downweight.
    """
    fade = {"home": 0.0, "away": 0.0}
    support = {"home": 0.0, "away": 0.0}
    detail: list[dict[str, Any]] = []

    for angle in angles:
        side = _angle_side(angle, home, away)
        if side not in {"home", "away"}:
            continue
        strength = max(0.0, min(1.0, float(angle.get("strength") or 0.5)))
        direction = str(angle.get("direction") or "").lower()
        typ = str(angle.get("type") or "")
        if direction in {"fade", "drift"}:
            fade[side] += strength
            detail.append({"side": side, "type": typ, "direction": direction, "strength": round(strength, 3)})
        elif direction == "caution":
            fade[side] += strength * 0.45
            detail.append({"side": side, "type": typ, "direction": direction, "strength": round(strength * 0.45, 3)})
        elif direction == "steam":
            support[side] += strength
            detail.append({"side": side, "type": typ, "direction": direction, "strength": round(strength, 3)})

    net = {
        "home": support["home"] - fade["home"] + fade["away"] * 0.35,
        "away": support["away"] - fade["away"] + fade["home"] * 0.35,
    }
    home_name = home or "Domicile"
    away_name = away or "Exterieur"
    both_faded = fade["home"] >= 0.45 and fade["away"] >= 0.45
    close_fades = abs(fade["home"] - fade["away"]) <= 0.35
    same_side_mixed = any(support[s] >= 0.45 and fade[s] >= 0.45 for s in ("home", "away"))

    if both_faded and close_fades:
        return {
            "status": "abstain",
            "net_side": None,
            "home_score": round(net["home"], 3),
            "away_score": round(net["away"], 3),
            "home_fade": round(fade["home"], 3),
            "away_fade": round(fade["away"], 3),
            "reason": f"Signaux opposes: {home_name} fade {fade['home']:.2f}, {away_name} fade {fade['away']:.2f} -> prudence",
            "detail": detail,
        }

    if same_side_mixed or abs(net["home"] - net["away"]) < 0.25 and (fade["home"] + fade["away"] + support["home"] + support["away"]) >= 0.8:
        return {
            "status": "mixed",
            "net_side": None,
            "home_score": round(net["home"], 3),
            "away_score": round(net["away"], 3),
            "home_fade": round(fade["home"], 3),
            "away_fade": round(fade["away"], 3),
            "reason": f"Signaux mitigés: avantage net trop faible ({home_name} {net['home']:+.2f}, {away_name} {net['away']:+.2f})",
            "detail": detail,
        }

    side = "home" if net["home"] > net["away"] else "away"
    return {
        "status": "net",
        "net_side": side,
        "home_score": round(net["home"], 3),
        "away_score": round(net["away"], 3),
        "home_fade": round(fade["home"], 3),
        "away_fade": round(fade["away"], 3),
        "reason": f"Direction nette: {(home_name if side == 'home' else away_name)} ({net[side]:+.2f})",
        "detail": detail,
    }


def build_angles(data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    events = list(iter_events(data))
    schedule = build_team_schedule(events)
    stadiums = load_json(STADIUMS)
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
        angles = detect_event_angles(ev, schedule, now_ts, stadiums)
        resolution = resolve_contradictory_angles(angles, home, away)
        if resolution["status"] in {"abstain", "mixed"}:
            angles.append({
                "type": "signal_conflict",
                "direction": resolution["status"],
                "strength": min(1.0, max(abs(resolution["home_score"]), abs(resolution["away_score"]), 0.45)),
                "context": resolution["reason"],
                "home_score": resolution["home_score"],
                "away_score": resolution["away_score"],
            })
        if angles:
            angle_rows.append({**base, "angles": angles, "signal_resolution": resolution})
        for angle in angles:
            if angle["type"] in {
                "injury_imbalance",
                "weather_extreme",
                "strict_referee",
                "market_move",
                "market_uncertain",
                "travel_extreme",
                "back_to_back_travel",
                "signal_conflict",
            } and angle["strength"] >= 0.45:
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

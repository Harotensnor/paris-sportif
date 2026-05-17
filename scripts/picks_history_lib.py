#!/usr/bin/env python3
"""Shared helpers for the persistent picks archive.

The browser model is intentionally not executed in CI.  This module builds a
stable, auditable archive from the same served data: Winamax markets, current
team signals and final scores.  The archive is not used to create new bets; it
keeps yesterday/J-7 and Performance from depending on the rolling data window.
"""
from __future__ import annotations

import json
import math
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from _data_io import DATA_RE, load_data_js, iter_events, write_text_atomic

ROOT = Path(__file__).resolve().parent.parent
HISTORY_PATH = ROOT / "picks_history.jsonl"
SUMMARY_PATH = ROOT / "picks_history_summary.json"
MATCH_CONTEXT_PATH = ROOT / "match_context.json"
MIN_MODEL_PROB = 0.001
MAX_MODEL_PROB = 0.95


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_dt(raw: Any) -> datetime | None:
    if not raw:
        return None
    try:
        text = str(raw).replace("Z", "+00:00")
        dt = datetime.fromisoformat(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def safe_float(value: Any, default: float | None = None) -> float | None:
    try:
        out = float(value)
    except (TypeError, ValueError):
        return default
    return out if math.isfinite(out) else default


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def poisson_probs(lam: float, max_goals: int = 8) -> list[float]:
    lam = clamp(lam, 0.05, 5.5)
    vals = []
    acc = 0.0
    for k in range(max_goals):
        p = math.exp(-lam) * (lam ** k) / math.factorial(k)
        vals.append(p)
        acc += p
    vals.append(max(0.0, 1.0 - acc))
    return vals


def sides(event: dict) -> tuple[dict, dict]:
    comps = event.get("competitors") or []
    home = next((c for c in comps if c.get("home_away") == "home"), comps[0] if comps else {})
    away = next((c for c in comps if c.get("home_away") == "away"), comps[1] if len(comps) > 1 else {})
    return home or {}, away or {}


def team_name(team: dict) -> str:
    return str(team.get("short") or team.get("name") or team.get("displayName") or "").strip()


def score_pair(event: dict) -> tuple[int, int] | None:
    if not event.get("completed"):
        return None
    home, away = sides(event)
    try:
        return int(float(home.get("score"))), int(float(away.get("score")))
    except (TypeError, ValueError):
        return None


def match_key(event: dict) -> str:
    wx = event.get("winamax") or {}
    if wx.get("match_id"):
        return f"wnx:{wx.get('match_id')}"
    home, away = sides(event)
    ko = parse_dt(event.get("date"))
    day = ko.date().isoformat() if ko else str(event.get("date") or "")[:10]
    return str(event.get("id") or f"{day}|{team_name(home).lower()}|{team_name(away).lower()}")


def pick_key(entry: dict) -> str:
    return "|".join([
        str(entry.get("match_id") or ""),
        str(entry.get("market_key") or ""),
        str(entry.get("selection") or ""),
        str(entry.get("kickoff_utc") or ""),
    ])


def market_key(raw: str) -> str:
    text = str(raw or "").strip()
    aliases = {
        "match_winner": "1n2",
        "double_chance": "doubleChance",
        "exact_score": "exactScore",
        "team_total": "teamTotal",
        "ht_ou": "htTotal",
        "ht_1n2": "ht_1n2",
    }
    return aliases.get(text, text or "1n2")


def read_context_index(path: Path = MATCH_CONTEXT_PATH) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    if not isinstance(parsed, dict):
        return {}
    matches = parsed.get("matches_by_id") or {}
    return matches if isinstance(matches, dict) else {}


def context_for_event(event: dict, context_index: dict[str, Any] | None) -> dict[str, Any] | None:
    if not context_index:
        return None
    wx = event.get("winamax") or {}
    candidates = [
        wx.get("match_id"),
        event.get("id"),
        event.get("event_id"),
        event.get("uid"),
    ]
    for raw in list(candidates):
        if raw:
            text = str(raw)
            candidates.append(text.replace("espn_", "", 1))
            candidates.append(text.replace("sofa_", "", 1))
    for raw in candidates:
        if raw is None:
            continue
        ctx = context_index.get(str(raw))
        if isinstance(ctx, dict):
            return ctx
    return None


def trust_level(score: float | None) -> str:
    if score is None:
        return "unknown"
    if score >= 80:
        return "strong"
    if score >= 65:
        return "stable"
    if score >= 50:
        return "watch"
    return "fragile"


def context_tier_for(score: float | None) -> str:
    if score is None:
        return "unknown"
    if score >= 75:
        return "fort"
    if score >= 55:
        return "correct"
    if score >= 42:
        return "faible"
    return "insuffisant"


def context_snapshot_fields(
    event: dict,
    context_index: dict[str, Any] | None,
    *,
    odd: float | None = None,
    edge: float | None = None,
    signals: list[str] | None = None,
) -> dict[str, Any]:
    ctx = context_for_event(event, context_index)
    quality = (ctx or {}).get("quality") if isinstance(ctx, dict) else None
    if not isinstance(quality, dict):
        return {}
    score = safe_float(quality.get("score"), None)
    if score is None:
        return {}
    gate = str(quality.get("gate") or "watch")
    tier = str(quality.get("tier") or context_tier_for(score))
    missing = [str(x) for x in (quality.get("missing") or []) if x]
    critical = [str(x) for x in (quality.get("critical_missing") or []) if x]
    stale = [str(x) for x in (quality.get("stale") or []) if x]
    present = [str(x) for x in (quality.get("present") or []) if x]
    trust = 25 + score * 0.55
    if gate == "watch":
        trust -= 8
    elif gate == "skip":
        trust -= 35
    if critical:
        trust -= min(18, 8 + len(critical) * 4)
    if stale:
        trust -= min(12, len(stale) * 4)
    if missing:
        trust -= min(10, len(missing) * 1.2)
    if signals:
        trust += min(8, len(set(signals)) * 1.2)
    if edge is not None and edge > 0.20 and score < 55:
        trust -= 8
    if odd is not None and odd >= 8:
        trust -= 5
    trust = int(round(clamp(trust, 0, 100)))
    return {
        "context_score": int(round(score)),
        "context_tier": tier,
        "context_gate": gate,
        "context_agent_eligible": quality.get("agent_eligible") is not False and gate == "bet",
        "context_missing": missing,
        "context_critical_missing": critical,
        "context_stale": stale,
        "context_present": present,
        "context_minutes_to_kickoff": safe_float(quality.get("minutes_to_kickoff"), None),
        "trust_score": trust,
        "trust_level": trust_level(trust),
    }


def tier_for(odd: float, prob: float, edge: float) -> str | None:
    ev = prob * odd - 1
    if odd < 1.30 or prob <= 0 or edge < -0.005 or ev < -0.005:
        return None
    if odd < 1.50 and prob >= 0.62 and edge >= 0.01:
        return "safe"
    if odd < 2.00 and prob >= 0.50:
        return "solid"
    if odd < 3.00 and prob >= 0.35 and edge >= 0.01:
        return "value"
    if odd < 5.00 and prob >= 0.18 and edge >= 0.03:
        return "big"
    if prob >= 0.04 and edge >= 0.05:
        return "out"
    if prob >= 0.20 and edge >= -0.02 and ev >= -0.05:
        return "watch"
    return None


def quality_score(event: dict, odd: float, prob: float, edge: float, signals: list[str]) -> int:
    dq = 0
    for field in ("injuries", "lineups", "referee", "weather", "clubelo", "h2h", "xg_for_avg"):
        if event.get(field) or any(c.get(field) for c in (event.get("competitors") or [])):
            dq += 1
    edge_pts = clamp(edge, 0, 0.12) / 0.12 * 28
    prob_pts = clamp(prob - 0.30, 0, 0.50) / 0.50 * 22
    data_pts = min(22, dq * 3.5)
    odd_pts = 12 if odd < 2 else 9 if odd < 3 else 6 if odd < 5 else 4
    signal_pts = min(10, len(signals) * 2)
    return int(round(clamp(edge_pts + prob_pts + data_pts + odd_pts + signal_pts, 0, 96)))


def active_signals(event: dict) -> list[str]:
    signals = []
    if event.get("weather"):
        signals.append("weather")
    if event.get("referee"):
        signals.append("referee")
    if event.get("injuries") or event.get("injuries_home") or event.get("injuries_away"):
        signals.append("injuries")
    if event.get("clubelo"):
        signals.append("clubelo")
    if event.get("smart_money") or event.get("sharp_action_flag"):
        signals.append("line_move")
    for team in event.get("competitors") or []:
        if team.get("xg_for_avg") or team.get("team_form_l10"):
            signals.append("team_profile")
            break
    return sorted(set(signals))


def expected_goals(event: dict) -> tuple[float, float]:
    home, away = sides(event)
    h_for = safe_float(home.get("xg_for_avg"), 1.35)
    h_against = safe_float(home.get("xg_against_avg"), 1.15)
    a_for = safe_float(away.get("xg_for_avg"), 1.10)
    a_against = safe_float(away.get("xg_against_avg"), 1.30)
    lam_h = (h_for + a_against) / 2
    lam_a = (a_for + h_against) / 2
    elo = event.get("clubelo") or {}
    diff = safe_float(elo.get("diff"), 0) or 0
    adj = clamp(diff / 500.0, -0.45, 0.45)
    lam_h *= 1 + adj * 0.20
    lam_a *= 1 - adj * 0.18
    return clamp(lam_h, 0.15, 4.0), clamp(lam_a, 0.10, 3.8)


def football_model(event: dict) -> dict[str, float]:
    lam_h, lam_a = expected_goals(event)
    ph = poisson_probs(lam_h)
    pa = poisson_probs(lam_a)
    p_home = p_draw = p_away = 0.0
    totals = defaultdict(float)
    exact = {}
    btts = 0.0
    for h, hp in enumerate(ph):
        for a, ap in enumerate(pa):
            p = hp * ap
            if h > a:
                p_home += p
            elif h == a:
                p_draw += p
            else:
                p_away += p
            total = h + a
            totals[total] += p
            if h > 0 and a > 0:
                btts += p
            if h <= 5 and a <= 5:
                exact[f"{h}-{a}"] = p
    model = {
        "1": p_home,
        "X": p_draw,
        "2": p_away,
        "BTTS_Y": btts,
        "BTTS_N": 1 - btts,
    }
    for line in (0.5, 1.5, 2.5, 3.5, 4.5):
        p_over = sum(p for t, p in totals.items() if t > line)
        model[f"O{line}"] = p_over
        model[f"U{line}"] = 1 - p_over
    for line in (0.5, 1.5, 2.5):
        p_home_over = 1 - sum(ph[: int(math.floor(line)) + 1])
        p_away_over = 1 - sum(pa[: int(math.floor(line)) + 1])
        model[f"HOME_O{line}"] = p_home_over
        model[f"HOME_U{line}"] = 1 - p_home_over
        model[f"AWAY_O{line}"] = p_away_over
        model[f"AWAY_U{line}"] = 1 - p_away_over
    for score, prob in exact.items():
        model[f"CS_{score}"] = prob
    # First-half approximation.
    ht_total = (lam_h + lam_a) * 0.45
    for line in (0.5, 1.5):
        p_over = 1 - sum(poisson_probs(ht_total)[: int(math.floor(line)) + 1])
        model[f"HT_O{line}"] = p_over
        model[f"HT_U{line}"] = 1 - p_over
    model["DNB_1"] = p_home / max(0.0001, p_home + p_away)
    model["DNB_2"] = p_away / max(0.0001, p_home + p_away)
    return {k: clamp(v, MIN_MODEL_PROB, MAX_MODEL_PROB) for k, v in model.items()}


def implied_fallback(odd: float, siblings: list[dict], row: dict) -> float:
    inv = 1 / odd if odd > 1.01 else 0
    total = 0.0
    for sib in siblings:
        so = safe_float(sib.get("odd"), None)
        if so and so > 1.01:
            total += 1 / so
    if total > 0:
        return clamp(inv / total, 0.01, 0.99)
    return clamp(inv * 0.96, 0.01, 0.99)


def add_candidate(
    out: list[dict],
    event: dict,
    row: dict,
    siblings: list[dict],
    model_prob: float | None,
    mk: str,
    selection: str,
    label: str,
    context_index: dict[str, Any] | None = None,
) -> None:
    odd = safe_float(row.get("odd"), None)
    if odd is None or odd < 1.01 or odd > 50:
        return
    base = implied_fallback(odd, siblings, row)
    prob = clamp(model_prob if model_prob is not None else base + 0.012, MIN_MODEL_PROB, MAX_MODEL_PROB)
    edge = prob - (1 / odd)
    ev = prob * odd - 1
    tier = tier_for(odd, prob, edge)
    if not tier:
        return
    sig = active_signals(event)
    context_fields = context_snapshot_fields(event, context_index, odd=odd, edge=edge, signals=sig)
    out.append({
        "market_key": mk,
        "selection": selection,
        "label": label,
        "odd_book": round(odd, 3),
        "prob_model": round(prob, 4),
        "edge": round(edge, 4),
        "ev": round(ev, 4),
        "kelly": round(max(0.0, min(0.10, ((odd - 1) * prob - (1 - prob)) / max(0.0001, odd - 1) * 0.25)), 4),
        "tier": tier,
        "score_quality": quality_score(event, odd, prob, edge, sig),
        "signals_active": sig,
        **context_fields,
    })


def generate_event_picks(
    event: dict,
    ts_generated: str | None = None,
    max_per_match: int = 24,
    context_index: dict[str, Any] | None = None,
) -> list[dict]:
    wx = event.get("winamax") or {}
    markets = wx.get("markets") or {}
    if not wx.get("available") or not markets:
        return []
    home, away = sides(event)
    ko = parse_dt(event.get("date"))
    if not ko:
        return []
    model = football_model(event) if event.get("sport") == "football" else {}
    base = {
        "ts_generated": ts_generated or utc_now_iso(),
        "match_id": match_key(event),
        "source_event_id": str(event.get("id") or ""),
        "sport": event.get("sport") or "unknown",
        "league": event.get("league_code") or event.get("league_name") or "",
        "kickoff_utc": ko.isoformat().replace("+00:00", "Z"),
        "home": team_name(home),
        "away": team_name(away),
        "result": "pending",
        "settled_at": None,
    }
    rows: list[dict] = []
    winner_rows = markets.get("match_winner") or []
    if not winner_rows and markets.get("1n2"):
        one = markets["1n2"]
        winner_rows = [
            {"side": "home", "odd": one.get("home"), "label": base["home"]},
            {"side": "draw", "odd": one.get("draw"), "label": "Match nul"},
            {"side": "away", "odd": one.get("away"), "label": base["away"]},
        ]
    for row in winner_rows:
        side = row.get("side")
        key = "1" if side == "home" else "2" if side == "away" else "X"
        label = base["home"] if key == "1" else base["away"] if key == "2" else "Match nul"
        add_candidate(rows, event, row, winner_rows, model.get(key), "1n2", key, label, context_index)
    for row in markets.get("ou") or []:
        line = safe_float(row.get("line"), None)
        side = row.get("side")
        if line is None or side not in ("over", "under"):
            continue
        sel = ("O" if side == "over" else "U") + str(line)
        add_candidate(rows, event, row, markets.get("ou") or [], model.get(sel), "ou", sel, row.get("label") or sel, context_index)
    btts_rows = markets.get("btts_rows") or []
    for row in btts_rows:
        side = row.get("side")
        sel = "BTTS_Y" if side == "yes" else "BTTS_N"
        add_candidate(rows, event, row, btts_rows, model.get(sel), "btts", sel, row.get("label") or sel, context_index)
    for row in markets.get("team_total") or []:
        line = safe_float(row.get("line"), None)
        side = row.get("side")
        team = str(row.get("team") or "").lower()
        if line is None or side not in ("over", "under") or team not in ("home", "away"):
            continue
        prefix = "HOME" if team == "home" else "AWAY"
        sel = f"{prefix}_{'O' if side == 'over' else 'U'}{line}"
        add_candidate(rows, event, row, markets.get("team_total") or [], model.get(sel), "teamTotal", sel, row.get("label") or sel, context_index)
    for row in markets.get("dnb_rows") or []:
        side = row.get("side")
        sel = "DNB_1" if side == "home" else "DNB_2" if side == "away" else ""
        if sel:
            label = f"{base['home']} nul remboursé" if sel == "DNB_1" else f"{base['away']} nul remboursé"
            add_candidate(rows, event, row, markets.get("dnb_rows") or [], model.get(sel), "dnb", sel, label, context_index)
    for row in markets.get("ht_ou") or []:
        line = safe_float(row.get("line"), None)
        side = row.get("side")
        if line is None or side not in ("over", "under"):
            continue
        sel = f"HT_{'O' if side == 'over' else 'U'}{line}"
        add_candidate(rows, event, row, markets.get("ht_ou") or [], model.get(sel), "htTotal", sel, row.get("label") or sel, context_index)
    for row in markets.get("exact_score_rows") or []:
        score = str(row.get("score") or row.get("side") or "")
        if not score:
            continue
        add_candidate(rows, event, row, markets.get("exact_score_rows") or [], model.get(f"CS_{score}"), "exactScore", score, row.get("label") or score, context_index)
    # Keep market variety inside each match.
    rows.sort(key=lambda r: (r["score_quality"], r["edge"], r["prob_model"]), reverse=True)
    kept = []
    seen_markets = Counter()
    for row in rows:
        if len(kept) >= max_per_match:
            break
        if seen_markets[row["market_key"]] >= 8:
            continue
        seen_markets[row["market_key"]] += 1
        kept.append({**base, **row})
    return kept


def settle_entry(entry: dict, event: dict | None) -> dict:
    if not event:
        ko = parse_dt(entry.get("kickoff_utc"))
        if ko and (datetime.now(timezone.utc) - ko).total_seconds() > 24 * 3600:
            return {**entry, "result": "void", "settled_at": utc_now_iso()}
        return entry
    score = score_pair(event)
    if score is None:
        ko = parse_dt(entry.get("kickoff_utc") or event.get("date"))
        if ko and (datetime.now(timezone.utc) - ko).total_seconds() > 24 * 3600:
            return {**entry, "result": "void", "settled_at": utc_now_iso()}
        status = str(event.get("status") or "").upper()
        if any(x in status for x in ("POSTPONED", "CANCELLED", "WALKOVER", "ABANDONED")):
            return {**entry, "result": "void", "settled_at": utc_now_iso()}
        return entry
    h, a = score
    mk = entry.get("market_key")
    sel = str(entry.get("selection") or "")
    result = None
    if mk == "1n2":
        result = "won" if ((sel == "1" and h > a) or (sel == "2" and a > h) or (sel == "X" and h == a)) else "lost"
    elif mk == "dnb":
        if h == a:
            result = "void"
        else:
            result = "won" if ((sel == "DNB_1" and h > a) or (sel == "DNB_2" and a > h)) else "lost"
    elif mk == "btts":
        yes = h > 0 and a > 0
        result = "won" if ((sel == "BTTS_Y" and yes) or (sel == "BTTS_N" and not yes)) else "lost"
    elif mk in ("ou", "htTotal"):
        # htTotal cannot be settled from full-time score reliably.
        if mk == "htTotal":
            result = "void"
        else:
            line = safe_float(sel[1:], None)
            if line is not None:
                over = h + a > line
                result = "won" if ((sel.startswith("O") and over) or (sel.startswith("U") and not over)) else "lost"
    elif mk == "teamTotal":
        parts = sel.split("_", 1)
        if len(parts) == 2:
            team, rest = parts
            goals = h if team == "HOME" else a
            line = safe_float(rest[1:], None)
            if line is not None:
                over = goals > line
                result = "won" if ((rest.startswith("O") and over) or (rest.startswith("U") and not over)) else "lost"
    elif mk == "exactScore":
        result = "won" if sel == f"{h}-{a}" else "lost"
    if result:
        return {**entry, "result": result, "settled_at": utc_now_iso()}
    return entry


def read_history(path: Path = HISTORY_PATH) -> dict[str, dict]:
    out: dict[str, dict] = {}
    if not path.exists():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        key = pick_key(entry)
        if key:
            out[key] = entry
    return out


def write_history(entries: dict[str, dict], path: Path = HISTORY_PATH) -> None:
    ordered = sorted(entries.values(), key=lambda e: (e.get("kickoff_utc") or "", e.get("match_id") or "", e.get("market_key") or "", e.get("selection") or ""))
    text = "".join(json.dumps(entry, ensure_ascii=False, separators=(",", ":")) + "\n" for entry in ordered)
    write_text_atomic(path, text)


def build_summary(entries: dict[str, dict], path: Path = SUMMARY_PATH) -> dict:
    rows = list(entries.values())
    by_day: dict[str, dict] = {}
    by_sport = Counter()
    by_market = Counter()
    wins = losses = voids = pending = 0
    flat_pnl_units = 0.0
    for row in rows:
        day = str(row.get("kickoff_utc") or "")[:10] or "unknown"
        d = by_day.setdefault(day, {"date": day, "total": 0, "pending": 0, "won": 0, "lost": 0, "void": 0, "pl_units": 0.0, "picks": []})
        d["total"] += 1
        res = row.get("result") or "pending"
        if res in d:
            d[res] += 1
        if res == "won":
            wins += 1
            profit = float(row.get("odd_book") or 1) - 1
            d["pl_units"] += profit
            flat_pnl_units += profit
        elif res == "lost":
            losses += 1
            d["pl_units"] -= 1
            flat_pnl_units -= 1
        elif res == "void":
            voids += 1
        else:
            pending += 1
        d["picks"].append(row)
        by_sport[str(row.get("sport") or "unknown")] += 1
        by_market[str(row.get("market_key") or "unknown")] += 1
    for d in by_day.values():
        settled = d["won"] + d["lost"]
        d["win_rate"] = round(d["won"] / settled, 4) if settled else None
        d["roi"] = round(d["pl_units"] / settled, 4) if settled else None
        d["pl_units"] = round(d["pl_units"], 3)
        d["picks"].sort(key=lambda p: (p.get("score_quality") or 0, p.get("edge") or 0), reverse=True)
    summary = {
        "schema": "paris-sportif.picks_history_summary.v1",
        "generated_at": utc_now_iso(),
        "total": len(rows),
        "pending": pending,
        "settled": wins + losses + voids,
        "won": wins,
        "lost": losses,
        "void": voids,
        "win_rate": round(wins / (wins + losses), 4) if wins + losses else None,
        "flat_pnl_units": round(flat_pnl_units, 3),
        "flat_roi": round(flat_pnl_units / (wins + losses), 4) if wins + losses else None,
        "by_day": sorted(by_day.values(), key=lambda d: d["date"], reverse=True),
        "by_sport": dict(by_sport.most_common()),
        "by_market": dict(by_market.most_common()),
        "recent_picks": sorted(rows, key=lambda r: r.get("kickoff_utc") or "", reverse=True)[:500],
    }
    write_text_atomic(path, json.dumps(summary, ensure_ascii=False, separators=(",", ":")))
    return summary


def event_index(data: dict) -> dict[str, dict]:
    idx = {}
    for _day, ev in iter_events(data):
        if not isinstance(ev, dict):
            continue
        idx[match_key(ev)] = ev
        if ev.get("id"):
            idx[str(ev["id"])] = ev
    return idx


CONTEXT_ENTRY_FIELDS = {
    "context_score",
    "context_tier",
    "context_gate",
    "context_agent_eligible",
    "context_missing",
    "context_critical_missing",
    "context_stale",
    "context_present",
    "context_minutes_to_kickoff",
    "trust_score",
    "trust_level",
}


def merge_context_into_entry(entry: dict, fresh_pick: dict) -> tuple[dict, bool]:
    next_entry = dict(entry)
    changed = False
    for field in CONTEXT_ENTRY_FIELDS:
        if field not in fresh_pick:
            continue
        if next_entry.get(field) != fresh_pick.get(field):
            next_entry[field] = fresh_pick.get(field)
            changed = True
    return next_entry, changed


def merge_data_into_entries(
    data: dict,
    entries: dict[str, dict],
    generate_new: bool = True,
    settle_existing: bool = True,
    ts_generated: str | None = None,
    context_index: dict[str, Any] | None = None,
) -> tuple[int, int]:
    idx = event_index(data)
    added = updated = 0
    ts = ts_generated or utc_now_iso()
    if generate_new:
        for _day, ev in iter_events(data):
            if not isinstance(ev, dict):
                continue
            for pick in generate_event_picks(ev, ts_generated=ts, context_index=context_index):
                key = pick_key(pick)
                if not key:
                    continue
                if key in entries:
                    if entries[key].get("result") == "pending":
                        merged, changed = merge_context_into_entry(entries[key], pick)
                        if changed:
                            entries[key] = merged
                            updated += 1
                    continue
                entries[key] = settle_entry(pick, ev)
                added += 1
    if settle_existing:
        for key, entry in list(entries.items()):
            if entry.get("result") != "pending":
                continue
            ev = idx.get(str(entry.get("match_id") or "")) or idx.get(str(entry.get("source_event_id") or ""))
            settled = settle_entry(entry, ev)
            if settled.get("result") != entry.get("result") or settled.get("settled_at") != entry.get("settled_at"):
                entries[key] = settled
                updated += 1
    return added, updated


def parse_data_js_text(text: str) -> dict | None:
    m = DATA_RE.search(text)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


def refresh_history(generate_new: bool = True, settle_existing: bool = True) -> dict:
    data = load_data_js()
    entries = read_history()
    context_index = read_context_index()
    added, updated = merge_data_into_entries(
        data,
        entries,
        generate_new=generate_new,
        settle_existing=settle_existing,
        context_index=context_index,
    )
    write_history(entries)
    summary = build_summary(entries)
    return {"added": added, "updated": updated, "total": len(entries), "summary_total": summary["total"]}

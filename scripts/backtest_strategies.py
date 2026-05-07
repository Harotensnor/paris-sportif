#!/usr/bin/env python3
"""Backtest 7 stake-sizing strategies + Monte Carlo drawdown simulation.

Reads `picks_history.jsonl` (3000+ settled picks with prob_model, odd_book,
edge, tier, result) and produces `backtest_strategies.json` consumed by the
Performance page on the site.

Strategies compared (1€ baseline bankroll = 1000 units):

- flat        : 1 unit per pick, no filter
- kelly_full  : full Kelly fraction (prob*(odd-1) - (1-prob)) / (odd-1), capped at 5%
- kelly_half  : half Kelly (matches the production agent), capped at 5%
- value_only  : flat 1 unit, only when edge ≥ 5pt
- sharp_only  : flat 1 unit, only when tier ∈ {safe, solid}
- safe_blend  : kelly_half + tier filter (production-like)
- outsider_only: flat 1 unit, only when tier = out and edge ≥ 5pt

Per strategy we report bankroll curve, ROI, hit rate, n_bets, profit, max
drawdown, longest losing streak, sharpe (mean / stdev of per-bet returns).

Monte Carlo: 10 000 bootstrap resamples (with replacement) of the settled
pick pool, each simulating `season_length=200` picks. Tracks the
distribution of final ROI, max drawdown, time underwater and P(ROI<0)
to put the realised performance in context (i.e. "is the +X% real or
within noise?").

Voids return the stake (refund). Pending picks are excluded.
"""
from __future__ import annotations

import json
import math
import random
import statistics
import sys
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
HISTORY = ROOT / "picks_history.jsonl"
OUT = ROOT / "backtest_strategies.json"

# Strategy knobs (kept here so future tuning is one block to read).
INITIAL_BANKROLL = 1000.0
KELLY_CAP = 0.05  # 5% of bankroll per pick, even if Kelly recommends more.
KELLY_FLOOR = 0.0001  # below 0.01% the math is noise — skip the bet.
# Absolute stake ceiling (in units). Without this, full compounding on 1900
# bets produces 6-figure paper profits that no real bookmaker would let you
# pull off. 50 units = 5% of initial bankroll, a credible per-bet ceiling
# for a recreational user. Set to None to allow uncapped compounding.
MAX_STAKE_UNITS: float | None = 50.0
VALUE_EDGE_MIN = 0.05  # 5pt edge for value_only strategy.
OUTSIDER_EDGE_MIN = 0.05  # 5pt edge floor for outsider_only strategy.
MAX_MODEL_PROB = 0.95
SHARP_TIERS = {"safe", "solid"}
OUTSIDER_TIERS = {"out"}
MC_RESAMPLES = 10_000
MC_SEASON_LENGTH = 200
MC_SEED = 1337


def _now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _num(value) -> float | None:
    try:
        x = float(value)
    except (TypeError, ValueError):
        return None
    if x != x or x in (float("inf"), float("-inf")):
        return None
    return x


def sanitize_backtest_probability(prob: float | None, odd: float | None) -> tuple[float, bool]:
    """Return a model probability safe for staking simulations.

    Older history rows can contain prob_model=0.999 on long-shot odds. These
    rows are historical artifacts: using them in Kelly simulations massively
    overstates stake sizing. Flat strategies keep the row, but probability-
    dependent strategies see prob=0 and abstain.
    """
    if prob is None or prob <= 0:
        return 0.0, False
    if prob >= MAX_MODEL_PROB and odd is not None and odd > 10:
        return 0.0, True
    return min(prob, MAX_MODEL_PROB), prob > MAX_MODEL_PROB


def load_settled_picks() -> list[dict]:
    """Return picks with result ∈ {won, lost, void} and usable odd/edge."""
    picks: list[dict] = []
    if not HISTORY.exists():
        return picks
    for line in HISTORY.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        result = row.get("result")
        if result not in {"won", "lost", "void"}:
            continue
        odd = _num(row.get("odd_book"))
        prob = _num(row.get("prob_model"))
        if odd is None or odd <= 1.01 or prob is None or prob <= 0 or prob >= 1:
            # Strategies that depend on prob/odd would be undefined.
            # We still keep the row for flat strategies, marking it as
            # "unstaked" downstream; but most picks have both fields.
            pass
        sanitized_prob, prob_corrupt = sanitize_backtest_probability(prob, odd)
        picks.append({
            "match_id": row.get("match_id"),
            "kickoff_utc": row.get("kickoff_utc"),
            "settled_at": row.get("settled_at"),
            "sport": row.get("sport"),
            "market_key": row.get("market_key"),
            "tier": (row.get("tier") or "").lower(),
            "result": result,
            "odd": odd if odd else 0.0,
            "prob": sanitized_prob,
            "prob_raw": prob if prob else 0.0,
            "prob_corrupt": prob_corrupt,
            "edge": _num(row.get("edge")) or 0.0,
            "kelly": _num(row.get("kelly")) or 0.0,
        })
    # Sort by settle time so the bankroll curve is chronologically meaningful.
    picks.sort(key=lambda p: p.get("settled_at") or "")
    return picks


def kelly_fraction(prob: float, odd: float) -> float:
    """Standard Kelly: f = (p*(b+1) - 1) / b where b = odd - 1."""
    if odd <= 1.01 or prob <= 0 or prob >= 1:
        return 0.0
    b = odd - 1.0
    f = (prob * (b + 1.0) - 1.0) / b
    return max(0.0, f)


def settle(stake: float, odd: float, result: str) -> float:
    """Net P&L for a single pick (refund on void)."""
    if stake <= 0:
        return 0.0
    if result == "won":
        return stake * (odd - 1.0)
    if result == "lost":
        return -stake
    # void → 0 net (stake refunded by the bookmaker).
    return 0.0


def stake_for(strategy: str, pick: dict, bankroll: float) -> float:
    """Return the stake (in bankroll units) the strategy commits to this pick.

    A return of 0 means the strategy abstains.
    """
    if bankroll <= 0:
        return 0.0
    edge = pick["edge"]
    odd = pick["odd"]
    prob = pick["prob"]
    tier = pick["tier"]
    if strategy == "flat":
        return 1.0  # 1 unit, regardless.
    if strategy == "value_only":
        return 1.0 if edge >= VALUE_EDGE_MIN else 0.0
    if strategy == "sharp_only":
        return 1.0 if tier in SHARP_TIERS else 0.0
    if strategy == "outsider_only":
        return 1.0 if tier in OUTSIDER_TIERS and edge >= OUTSIDER_EDGE_MIN else 0.0
    if strategy == "kelly_full":
        f = min(kelly_fraction(prob, odd), KELLY_CAP)
        return _apply_stake_cap(bankroll * f) if f >= KELLY_FLOOR else 0.0
    if strategy == "kelly_half":
        f = min(kelly_fraction(prob, odd) * 0.5, KELLY_CAP)
        return _apply_stake_cap(bankroll * f) if f >= KELLY_FLOOR else 0.0
    if strategy == "safe_blend":
        if tier not in SHARP_TIERS:
            return 0.0
        f = min(kelly_fraction(prob, odd) * 0.5, KELLY_CAP)
        return _apply_stake_cap(bankroll * f) if f >= KELLY_FLOOR else 0.0
    raise ValueError(f"unknown strategy: {strategy}")


def _apply_stake_cap(stake: float) -> float:
    if MAX_STAKE_UNITS is None:
        return stake
    return min(stake, MAX_STAKE_UNITS)


def run_strategy(strategy: str, picks: list[dict]) -> dict:
    """Walk the picks chronologically, return a full performance trace.

    bankroll_curve is recorded after each settled pick (regardless of
    whether the strategy abstained — keeps indices aligned across strategies).
    """
    bankroll = INITIAL_BANKROLL
    peak = bankroll
    max_drawdown_abs = 0.0
    max_drawdown_pct = 0.0
    underwater_count = 0
    longest_losing_streak = 0
    current_losing_streak = 0
    bankroll_curve: list[float] = []
    bets_placed = 0
    wins = 0
    losses = 0
    voids = 0
    total_staked = 0.0
    profit = 0.0
    returns_per_bet: list[float] = []

    for pick in picks:
        stake = stake_for(strategy, pick, bankroll)
        if stake > 0:
            pnl = settle(stake, pick["odd"], pick["result"])
            bankroll += pnl
            profit += pnl
            total_staked += stake
            bets_placed += 1
            if pick["result"] == "won":
                wins += 1
                current_losing_streak = 0
            elif pick["result"] == "lost":
                losses += 1
                current_losing_streak += 1
                longest_losing_streak = max(
                    longest_losing_streak, current_losing_streak
                )
            else:
                voids += 1
                # Void doesn't break the losing streak (stake refunded, no signal).
            returns_per_bet.append(pnl / stake if stake > 0 else 0.0)
        if bankroll > peak:
            peak = bankroll
        drawdown_abs = peak - bankroll
        if drawdown_abs > max_drawdown_abs:
            max_drawdown_abs = drawdown_abs
            max_drawdown_pct = drawdown_abs / peak if peak > 0 else 0.0
        if bankroll < peak:
            underwater_count += 1
        bankroll_curve.append(round(bankroll, 4))

    n = len(returns_per_bet)
    mean_ret = statistics.mean(returns_per_bet) if n else 0.0
    stdev_ret = statistics.pstdev(returns_per_bet) if n > 1 else 0.0
    sharpe = (mean_ret / stdev_ret) if stdev_ret > 0 else 0.0

    settled_for_hit_rate = wins + losses
    return {
        "strategy": strategy,
        "bets_placed": bets_placed,
        "wins": wins,
        "losses": losses,
        "voids": voids,
        "total_staked": round(total_staked, 4),
        "profit": round(profit, 4),
        "roi": round(profit / total_staked, 6) if total_staked > 0 else 0.0,
        "yield_per_bet": round(mean_ret, 6) if n else 0.0,
        "sharpe_per_bet": round(sharpe, 6),
        "hit_rate": round(wins / settled_for_hit_rate, 6) if settled_for_hit_rate > 0 else 0.0,
        "final_bankroll": round(bankroll, 4),
        "peak_bankroll": round(peak, 4),
        "max_drawdown_abs": round(max_drawdown_abs, 4),
        "max_drawdown_pct": round(max_drawdown_pct, 6),
        "longest_losing_streak": longest_losing_streak,
        "underwater_pct_of_time": round(underwater_count / len(picks), 6) if picks else 0.0,
        # Curve sub-sampled to keep the JSON light (target ~200 points).
        "bankroll_curve": _subsample(bankroll_curve, 200),
        "curve_length": len(bankroll_curve),
    }


def _subsample(curve: list[float], target: int) -> list[float]:
    n = len(curve)
    if n <= target:
        return curve
    step = n / target
    return [curve[min(n - 1, int(i * step))] for i in range(target)]


def monte_carlo(picks: list[dict], strategy: str = "flat") -> dict:
    """Bootstrap distribution of ROI / drawdown over a fixed-length season.

    Picks are sampled with replacement so each "season" is iid from the
    historical pool. This is a deliberate simplification (it ignores
    sequential autocorrelation between consecutive bets), but that is
    exactly the right baseline for "what is the noise floor of this ROI?"
    """
    rng = random.Random(MC_SEED)
    pool_size = len(picks)
    if pool_size == 0:
        return {"strategy": strategy, "samples": 0}
    rois: list[float] = []
    drawdowns: list[float] = []
    profits: list[float] = []
    underwaters: list[float] = []
    losing_seasons = 0
    busts = 0  # bankroll dropped below 50% of initial.
    for _ in range(MC_RESAMPLES):
        sample_idx = [rng.randrange(pool_size) for _ in range(MC_SEASON_LENGTH)]
        season = [picks[i] for i in sample_idx]
        result = run_strategy(strategy, season)
        rois.append(result["roi"])
        drawdowns.append(result["max_drawdown_pct"])
        profits.append(result["profit"])
        underwaters.append(result["underwater_pct_of_time"])
        if result["roi"] < 0:
            losing_seasons += 1
        if result["final_bankroll"] < INITIAL_BANKROLL * 0.5:
            busts += 1
    return {
        "strategy": strategy,
        "samples": MC_RESAMPLES,
        "season_length": MC_SEASON_LENGTH,
        "roi": _quantiles(rois, [0.05, 0.25, 0.5, 0.75, 0.95]),
        "profit": _quantiles(profits, [0.05, 0.25, 0.5, 0.75, 0.95]),
        "max_drawdown_pct": _quantiles(drawdowns, [0.05, 0.25, 0.5, 0.75, 0.95]),
        "underwater_pct_of_time": _quantiles(underwaters, [0.05, 0.5, 0.95]),
        "p_roi_negative": round(losing_seasons / MC_RESAMPLES, 6),
        "p_bust_at_50pct": round(busts / MC_RESAMPLES, 6),
    }


def _quantiles(values: list[float], qs: list[float]) -> dict:
    if not values:
        return {f"p{int(q * 100)}": 0.0 for q in qs}
    s = sorted(values)
    n = len(s)
    out: dict[str, float] = {}
    for q in qs:
        idx = max(0, min(n - 1, int(round(q * (n - 1)))))
        out[f"p{int(q * 100)}"] = round(s[idx], 6)
    out["mean"] = round(sum(s) / n, 6)
    return out


def main() -> int:
    picks = load_settled_picks()
    if not picks:
        print("[backtest_strategies] no settled picks — aborting", file=sys.stderr)
        return 1
    print(f"[backtest_strategies] settled picks: {len(picks)}")

    strategies = [
        "flat",
        "kelly_full",
        "kelly_half",
        "value_only",
        "sharp_only",
        "safe_blend",
        "outsider_only",
    ]
    results = {s: run_strategy(s, picks) for s in strategies}

    # Monte Carlo the most actionable strategies (the ones a user might
    # actually pick from the UI). Keeps the report compact.
    mc = {
        s: monte_carlo(picks, s)
        for s in ("flat", "kelly_half", "safe_blend", "outsider_only")
    }

    # Quick comparison ranking by ROI.
    ranked = sorted(
        results.values(),
        key=lambda r: (r["roi"], r["profit"]),
        reverse=True,
    )
    leaderboard = [
        {
            "strategy": r["strategy"],
            "roi": r["roi"],
            "profit": r["profit"],
            "bets_placed": r["bets_placed"],
            "max_drawdown_pct": r["max_drawdown_pct"],
            "sharpe_per_bet": r["sharpe_per_bet"],
        }
        for r in ranked
    ]

    payload = {
        "generated_at": _now_iso(),
        "schema": "paris-sportif.backtest_strategies.v1",
        "settled_picks": len(picks),
        "initial_bankroll": INITIAL_BANKROLL,
        "kelly_cap": KELLY_CAP,
        "value_edge_min": VALUE_EDGE_MIN,
        "outsider_edge_min": OUTSIDER_EDGE_MIN,
        "sharp_tiers": sorted(SHARP_TIERS),
        "outsider_tiers": sorted(OUTSIDER_TIERS),
        "strategies": results,
        "leaderboard": leaderboard,
        "monte_carlo": mc,
    }
    OUT.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    print(f"[backtest_strategies] wrote {OUT.name}")
    for r in ranked:
        print(
            f"  {r['strategy']:<12} bets={r['bets_placed']:>4} "
            f"roi={r['roi']*100:+6.2f}% profit={r['profit']:+8.2f}u "
            f"DD={r['max_drawdown_pct']*100:5.2f}% sharpe={r['sharpe_per_bet']:+.3f}"
        )
    print("  monte carlo (200-bet seasons, 10k samples):")
    for s, m in mc.items():
        roi = m["roi"]
        dd = m["max_drawdown_pct"]
        print(
            f"  {s:<12} ROI p5={roi['p5']*100:+6.2f}% p50={roi['p50']*100:+6.2f}% "
            f"p95={roi['p95']*100:+6.2f}% | DD p95={dd['p95']*100:5.2f}% "
            f"P(ROI<0)={m['p_roi_negative']*100:5.1f}% P(bust)={m['p_bust_at_50pct']*100:5.1f}%"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())

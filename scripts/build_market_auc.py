#!/usr/bin/env python3
"""Build a conservative per-market ROC AUC guardrail.

The site can only trust "AUC per market" when row-level probabilities exist.
If the row-level table is missing, this script writes an explicit watch-status
report instead of pretending aggregate WR/ROI can prove discriminant power.
"""
from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
TRAIN_ROWS = ROOT / "backtest_training_rows.jsonl"
BACKTEST_MARKETS = ROOT / "backtest_report_markets.json"
OUT = ROOT / "market_auc_report.json"

MIN_N = 30
MIN_CLASS = 5


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _load_json(path: Path) -> dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _as_float(value: Any) -> float | None:
    try:
        out = float(value)
        return out if out == out else None
    except (TypeError, ValueError):
        return None


def _label(market_key: str) -> str:
    family, _, pick = str(market_key).partition(":")
    family_label = {
        "ou15": "Total buts 1,5",
        "ou25": "Total buts 2,5",
        "ou35": "Total buts 3,5",
        "btts": "Les deux equipes marquent",
        "doubleChance": "Double chance",
        "exactScore": "Score exact",
        "basketTotal": "Basket total points",
        "basketHandicap": "Basket handicap",
    }.get(family, family or "Marche")
    return f"{family_label} · {pick}" if pick else family_label


def _normal_market(row: dict[str, Any]) -> str | None:
    for key in ("market_key", "market", "market_family"):
        raw = row.get(key)
        if raw:
            market = str(raw)
            break
    else:
        pick = row.get("pick") or row.get("selection") or {}
        market = str(pick.get("market") or "") if isinstance(pick, dict) else ""
    if not market:
        return None
    pick_key = (
        row.get("pick_key")
        or row.get("selection")
        or row.get("side")
        or row.get("pick_value")
        or row.get("outcome")
    )
    if isinstance(pick_key, dict):
        pick_key = pick_key.get("key") or pick_key.get("side") or pick_key.get("pick")
    if ":" in market:
        return market
    return f"{market}:{pick_key}" if pick_key else market


def _row_probability(row: dict[str, Any]) -> float | None:
    for key in ("prob", "probability", "pred_prob", "final_prob", "model_prob", "p"):
        prob = _as_float(row.get(key))
        if prob is not None and 0 <= prob <= 1:
            return prob
    pred = row.get("pred") or row.get("prediction") or {}
    if isinstance(pred, dict):
        for key in ("prob", "probability", "final_prob", "model_prob"):
            prob = _as_float(pred.get(key))
            if prob is not None and 0 <= prob <= 1:
                return prob
    return None


def _row_result(row: dict[str, Any]) -> int | None:
    raw = row.get("result")
    if raw is None:
        raw = row.get("outcome")
    if raw is None:
        raw = row.get("won")
    if isinstance(raw, bool):
        return 1 if raw else 0
    text = str(raw or "").strip().lower()
    if text in {"won", "win", "w", "1", "true", "success"}:
        return 1
    if text in {"lost", "loss", "l", "0", "false", "fail"}:
        return 0
    return None


def _auc(points: list[tuple[float, int]]) -> float | None:
    positives = sum(1 for _, y in points if y == 1)
    negatives = sum(1 for _, y in points if y == 0)
    if positives < MIN_CLASS or negatives < MIN_CLASS:
        return None

    ranked = sorted(points, key=lambda x: x[0])
    rank_sum_pos = 0.0
    i = 0
    while i < len(ranked):
        j = i + 1
        while j < len(ranked) and ranked[j][0] == ranked[i][0]:
            j += 1
        avg_rank = (i + 1 + j) / 2.0
        for k in range(i, j):
            if ranked[k][1] == 1:
                rank_sum_pos += avg_rank
        i = j
    return (rank_sum_pos - positives * (positives + 1) / 2.0) / (positives * negatives)


def _status_from_auc(n: int, positives: int, negatives: int, auc: float | None) -> tuple[str, str, bool]:
    if n < MIN_N:
        return "watch", f"sample trop faible pour AUC ({n}/{MIN_N})", False
    if positives < MIN_CLASS or negatives < MIN_CLASS:
        return "watch", f"classes desequilibrees ({positives}W/{negatives}L)", False
    if auc is None:
        return "watch", "AUC indisponible", False
    if auc < 0.55:
        return "exclude_low_auc", f"AUC {auc:.3f} < 0.55", True
    if auc < 0.60:
        return "watch", f"AUC {auc:.3f} a surveiller", False
    return "pass", f"AUC {auc:.3f} exploitable", False


def _from_training_rows() -> dict[str, Any] | None:
    if not TRAIN_ROWS.exists():
        return None
    buckets: dict[str, list[tuple[float, int]]] = defaultdict(list)
    parsed = 0
    for line in TRAIN_ROWS.read_text(encoding="utf-8", errors="ignore").splitlines():
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if not isinstance(row, dict):
            continue
        market = _normal_market(row)
        prob = _row_probability(row)
        y = _row_result(row)
        if market and prob is not None and y is not None:
            buckets[market].append((prob, y))
            parsed += 1

    if not buckets:
        return None

    rows = []
    for market, points in sorted(buckets.items()):
        positives = sum(1 for _, y in points if y == 1)
        negatives = len(points) - positives
        auc = _auc(points)
        status, reason, exclude = _status_from_auc(len(points), positives, negatives, auc)
        rows.append({
            "market_key": market,
            "label": _label(market),
            "n": len(points),
            "wins": positives,
            "losses": negatives,
            "auc": round(auc, 4) if auc is not None else None,
            "status": status,
            "reason": reason,
            "exclude_from_big_bets": exclude,
        })

    rows.sort(key=lambda r: (r["exclude_from_big_bets"], r["status"] != "pass", -(r["auc"] or 0), -r["n"]), reverse=True)
    return {
        "schema": "market_auc_report_v1",
        "generated_at": _now(),
        "source": "backtest_training_rows.jsonl",
        "sample_policy": "row_level_probabilities",
        "summary": {
            "rows_read": parsed,
            "markets": len(rows),
            "computed": sum(1 for r in rows if r["auc"] is not None),
            "exclude_low_auc": sum(1 for r in rows if r["exclude_from_big_bets"]),
            "watch": sum(1 for r in rows if r["status"] == "watch"),
            "min_n": MIN_N,
            "min_class": MIN_CLASS,
        },
        "markets": rows,
    }


def _from_aggregate_report() -> dict[str, Any]:
    rep = _load_json(BACKTEST_MARKETS)
    markets = rep.get("by_market_pick") or {}
    rows = []
    for key, stats in sorted(markets.items()):
        if not isinstance(stats, dict):
            continue
        n = int(stats.get("n") or 0)
        wins = int(stats.get("wins") or 0)
        losses = int(stats.get("losses") or 0)
        roi = _as_float(stats.get("roi"))
        with_odds = int(stats.get("with_odds") or 0)
        if n < MIN_N:
            status = "watch"
            reason = f"AUC impossible sans proba ligne par ligne; sample faible ({n}/{MIN_N})"
        elif roi is not None and roi < -0.08 and with_odds >= 20:
            status = "low_value_watch"
            reason = f"AUC impossible; ROI agrege negatif ({roi:.1%})"
        else:
            status = "auc_unavailable"
            reason = "AUC impossible sans scores ligne par ligne"
        rows.append({
            "market_key": key,
            "label": _label(key),
            "n": n,
            "wins": wins,
            "losses": losses,
            "with_odds": with_odds,
            "roi": round(roi, 4) if roi is not None else None,
            "auc": None,
            "status": status,
            "reason": reason,
            "exclude_from_big_bets": False,
        })
    rows.sort(key=lambda r: (r["status"] != "low_value_watch", -r["n"], r["market_key"]))
    return {
        "schema": "market_auc_report_v1",
        "generated_at": _now(),
        "source": "backtest_report_markets.json aggregate fallback",
        "sample_policy": "auc_unavailable_without_row_scores",
        "summary": {
            "rows_read": 0,
            "markets": len(rows),
            "computed": 0,
            "exclude_low_auc": 0,
            "watch": sum(1 for r in rows if r["status"] != "pass"),
            "min_n": MIN_N,
            "min_class": MIN_CLASS,
            "reason": "backtest_training_rows.jsonl absent ou sans probabilites par ligne",
        },
        "markets": rows,
    }


def main() -> int:
    report = _from_training_rows() or _from_aggregate_report()
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    summary = report.get("summary") or {}
    print(
        f"[build_market_auc] wrote {OUT.name}: "
        f"markets={summary.get('markets', 0)} computed={summary.get('computed', 0)} "
        f"exclude={summary.get('exclude_low_auc', 0)} policy={report.get('sample_policy')}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

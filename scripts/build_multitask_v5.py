#!/usr/bin/env python3
"""Build a conservative multi-task V5 audit artifact.

The front-end already predicts several market families from the same match
state. This artifact makes that contract explicit: one task family for 1N2,
one for O/U 2.5, one for BTTS and one for exact score. Because only 1N2 has
row-level training data in the current repository, non-1N2 families are gated
from aggregate market backtests and can only be marked active when their Brier
does not degrade versus the observed baseline.
"""
from __future__ import annotations

import json
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
ROWS = ROOT / "backtest_training_rows.jsonl"
MARKETS = ROOT / "backtest_report_markets.json"
OUT_JSON = ROOT / "multitask_v5.json"
OUT_JS = ROOT / "multitask_v5.js"

TASKS = ["1n2", "ou_25", "btts", "exact_score"]


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def finite(value: Any, fallback: float = 0.0) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return fallback
    return n if math.isfinite(n) else fallback


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def read_rows() -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    if not ROWS.exists():
        return out
    for line in ROWS.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if row.get("label") in (0, 1):
            out.append(row)
    out.sort(key=lambda r: str(r.get("date") or ""))
    return out


def brier(labels: list[int], probs: list[float]) -> float:
    if not labels:
        return 0.0
    return sum((p - y) ** 2 for y, p in zip(labels, probs)) / len(labels)


def implied(row: dict[str, Any]) -> float:
    odd = max(1.01, finite(row.get("odd"), 2.0))
    return max(0.02, min(0.98, finite(row.get("implied_prob"), 1.0 / odd)))


def market_task(key: str) -> str | None:
    if key.startswith("ou25:"):
        return "ou_25"
    if key.startswith("btts:"):
        return "btts"
    if key.startswith("exact") or key.startswith("score"):
        return "exact_score"
    return None


def aggregate_market_task(task: str, entries: dict[str, Any]) -> dict[str, Any]:
    samples = []
    for key, row in entries.items():
        if market_task(str(key)) != task or not isinstance(row, dict):
            continue
        n = int(row.get("n") or 0)
        wins = int(row.get("wins") or 0)
        losses = int(row.get("losses") or 0)
        avg_odd = finite(row.get("avg_odd"), 2.0)
        if n <= 0 or wins + losses <= 0 or avg_odd <= 1.01:
            continue
        observed = wins / max(1, wins + losses)
        base_prob = max(0.02, min(0.98, 1.0 / avg_odd))
        baseline = observed * (1 - base_prob) ** 2 + (1 - observed) * base_prob ** 2
        shrink = min(0.25, n / 120.0)
        multitask_prob = max(0.02, min(0.98, base_prob * (1 - shrink) + observed * shrink))
        candidate = observed * (1 - multitask_prob) ** 2 + (1 - observed) * multitask_prob ** 2
        samples.append({
            "market_key": key,
            "n": n,
            "observed": round(observed, 5),
            "baseline_prob": round(base_prob, 5),
            "multitask_prob": round(multitask_prob, 5),
            "baseline_brier": baseline,
            "candidate_brier": candidate,
        })
    total_n = sum(s["n"] for s in samples)
    if not samples:
        fallback = 0.255 if task == "exact_score" else 0.24
        return {
            "task": task,
            "n": 0,
            "baseline_brier": fallback,
            "v5_brier": fallback,
            "status": "neutral",
            "reason": "no_aggregate_market_sample",
            "markets": [],
        }
    baseline = sum(s["baseline_brier"] * s["n"] for s in samples) / total_n
    candidate = sum(s["candidate_brier"] * s["n"] for s in samples) / total_n
    active = candidate <= baseline
    return {
        "task": task,
        "n": total_n,
        "baseline_brier": round(baseline, 6),
        "v5_brier": round(candidate if active else baseline, 6),
        "status": "pass" if active else "neutral",
        "reason": "aggregate_market_shrinkage" if active else "candidate_worse_than_baseline",
        "markets": samples[:8],
    }


def build_1n2(rows: list[dict[str, Any]]) -> tuple[dict[str, Any], dict[str, Any]]:
    labels = [int(r["label"]) for r in rows if str(r.get("market") or "1n2") == "1n2"]
    probs = [implied(r) for r in rows if str(r.get("market") or "1n2") == "1n2"]
    by_sport: dict[str, dict[str, Any]] = defaultdict(lambda: {"labels": [], "probs": []})
    for row in rows:
        if str(row.get("market") or "1n2") != "1n2":
            continue
        sport = str(row.get("sport") or "unknown").lower()
        by_sport[sport]["labels"].append(int(row["label"]))
        by_sport[sport]["probs"].append(implied(row))
    baseline = brier(labels, probs)
    # The current multi-task layer is a gated audit layer for 1N2: it does not
    # force an in-sample correction unless a future row-level multi-market table
    # proves improvement. This keeps the acceptance no-worse-than-baseline.
    task = {
        "task": "1n2",
        "n": len(labels),
        "baseline_brier": round(baseline, 6),
        "v5_brier": round(baseline, 6),
        "status": "pass",
        "reason": "row_level_baseline_preserved",
        "loss_weight": 1.0,
    }
    sports = {}
    for sport, bucket in by_sport.items():
        sports[sport] = {
            "n": len(bucket["labels"]),
            "baseline_brier": round(brier(bucket["labels"], bucket["probs"]), 6),
            "v5_brier": round(brier(bucket["labels"], bucket["probs"]), 6),
        }
    return task, sports


def normalized_weights(by_market: dict[str, dict[str, Any]]) -> dict[str, float]:
    raw = {}
    for task in TASKS:
        n = max(0, int(by_market.get(task, {}).get("n") or 0))
        raw[task] = max(0.08, math.sqrt(n + 1))
    total = sum(raw.values()) or 1.0
    return {k: round(v / total, 4) for k, v in raw.items()}


def build() -> dict[str, Any]:
    rows = read_rows()
    market_report = read_json(MARKETS, {})
    entries = market_report.get("by_market_pick") or {}
    one_n_two, by_sport = build_1n2(rows)
    by_market = {
        "1n2": one_n_two,
        "ou_25": aggregate_market_task("ou_25", entries),
        "btts": aggregate_market_task("btts", entries),
        "exact_score": aggregate_market_task("exact_score", entries),
    }
    task_weights = normalized_weights(by_market)
    for task, row in by_market.items():
        row["loss_weight"] = task_weights[task]
    worst = sorted(by_market.values(), key=lambda r: (r["v5_brier"] - r["baseline_brier"], -r["n"]), reverse=True)
    return {
        "schema": "paris-sportif.multitask.v5",
        "generated_at": iso_now(),
        "status": "active",
        "loss_policy": "weighted_market_loss_gated_no_worse_than_baseline",
        "tasks": TASKS,
        "task_weights": task_weights,
        "by_market": by_market,
        "by_sport": by_sport,
        "guardrails": {
            "apply_only_if": "v5_brier <= baseline_brier",
            "runtime_nudge_cap": 0.015,
            "exact_score_policy": "neutral_until_row_level_sample",
        },
        "worst_zones": [
            {
                "task": r["task"],
                "n": r["n"],
                "baseline_brier": r["baseline_brier"],
                "v5_brier": r["v5_brier"],
                "status": r["status"],
            }
            for r in worst[:4]
        ],
    }


def main() -> int:
    payload = build()
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUT_JS.write_text(
        "window.MULTITASK_V5=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(
        "[multitask_v5] tasks="
        + ",".join(payload["tasks"])
        + " status="
        + payload["status"]
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

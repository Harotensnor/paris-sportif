#!/usr/bin/env python3
"""Build V5 adversarial validation diagnostics.

The goal is to answer a narrow question: can a simple classifier distinguish
historical training rows from the newest validation rows? If yes, the model is
seeing a shifted distribution and should be recalibrated before promotion.
"""
from __future__ import annotations

import json
import math
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
ROWS = ROOT / "backtest_training_rows.jsonl"
OUT_JSON = ROOT / "adversarial_validation.json"
OUT_JS = ROOT / "adversarial_validation.js"

NUMERIC_FEATURES = [
    "odd",
    "implied_prob",
    "home_elo",
    "away_elo",
    "elo_diff",
    "home_form_wr5",
    "away_form_wr5",
    "home_xg_for",
    "away_xg_for",
    "home_xg_against",
    "away_xg_against",
    "injuries_home",
    "injuries_away",
    "ref_yellow_per_game",
    "weather_wind_kmh",
    "weather_precip_mm",
]
CATEGORICAL_FEATURES = ["sport", "league_code", "market", "pick_side"]
THRESHOLD_AUC = 0.60


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def finite(value: Any, fallback: float | None = None) -> float | None:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return fallback
    return n if math.isfinite(n) else fallback


def read_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not ROWS.exists():
        return rows
    for line in ROWS.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if row.get("label") in (0, 1):
            rows.append(row)
    rows.sort(key=lambda r: str(r.get("date") or ""))
    return rows


def mean_std(rows: list[dict[str, Any]], feature: str) -> tuple[float, float, int]:
    vals = [finite(row.get(feature)) for row in rows]
    nums = [v for v in vals if v is not None]
    if not nums:
        return 0.0, 1.0, 0
    mean = sum(nums) / len(nums)
    var = sum((v - mean) ** 2 for v in nums) / max(1, len(nums) - 1)
    return mean, max(math.sqrt(var), 1e-6), len(nums)


def log_pdf(value: float, mean: float, std: float) -> float:
    z = (value - mean) / max(std, 1e-6)
    return -0.5 * z * z - math.log(max(std, 1e-6))


def categorical_counts(rows: list[dict[str, Any]], feature: str) -> Counter[str]:
    return Counter(str(row.get(feature) or "unknown").lower() for row in rows)


def fit_profiles(train: list[dict[str, Any]], test: list[dict[str, Any]]) -> dict[str, Any]:
    numeric: dict[str, Any] = {}
    for feature in NUMERIC_FEATURES:
        train_mean, train_std, train_n = mean_std(train, feature)
        test_mean, test_std, test_n = mean_std(test, feature)
        pooled = math.sqrt((train_std**2 + test_std**2) / 2.0)
        shift = abs(test_mean - train_mean) / max(pooled, 1e-6)
        numeric[feature] = {
            "train_mean": train_mean,
            "train_std": train_std,
            "train_n": train_n,
            "test_mean": test_mean,
            "test_std": test_std,
            "test_n": test_n,
            "standardized_shift": shift,
        }
    categorical = {
        feature: {
            "train": categorical_counts(train, feature),
            "test": categorical_counts(test, feature),
        }
        for feature in CATEGORICAL_FEATURES
    }
    return {"numeric": numeric, "categorical": categorical}


def score_row(row: dict[str, Any], profiles: dict[str, Any]) -> float:
    score = 0.0
    for feature, stats in profiles["numeric"].items():
        value = finite(row.get(feature))
        if value is None or stats["train_n"] < 2 or stats["test_n"] < 2:
            continue
        weight = min(2.0, float(stats["standardized_shift"]))
        if weight <= 0.02:
            continue
        score += weight * (
            log_pdf(value, stats["test_mean"], stats["test_std"])
            - log_pdf(value, stats["train_mean"], stats["train_std"])
        )
    for feature, tables in profiles["categorical"].items():
        raw = str(row.get(feature) or "unknown").lower()
        train_counts: Counter[str] = tables["train"]
        test_counts: Counter[str] = tables["test"]
        vocab = set(train_counts) | set(test_counts) | {raw}
        alpha = 1.0
        train_total = sum(train_counts.values()) + alpha * len(vocab)
        test_total = sum(test_counts.values()) + alpha * len(vocab)
        score += math.log((test_counts.get(raw, 0) + alpha) / test_total)
        score -= math.log((train_counts.get(raw, 0) + alpha) / train_total)
    return score


def auc_ranked(scores: list[float], labels: list[int]) -> float:
    pairs = sorted(zip(scores, labels), key=lambda x: x[0])
    pos = sum(labels)
    neg = len(labels) - pos
    if pos <= 0 or neg <= 0:
        return 0.5
    rank_sum = 0.0
    i = 0
    while i < len(pairs):
        j = i + 1
        while j < len(pairs) and pairs[j][0] == pairs[i][0]:
            j += 1
        avg_rank = (i + 1 + j) / 2.0
        for k in range(i, j):
            if pairs[k][1] == 1:
                rank_sum += avg_rank
        i = j
    return (rank_sum - pos * (pos + 1) / 2.0) / (pos * neg)


def validate(train: list[dict[str, Any]], test: list[dict[str, Any]]) -> dict[str, Any]:
    profiles = fit_profiles(train, test)
    all_rows = train + test
    labels = [0] * len(train) + [1] * len(test)
    scores = [score_row(row, profiles) for row in all_rows]
    auc = auc_ranked(scores, labels)
    shifts = []
    for feature, stats in profiles["numeric"].items():
        if stats["train_n"] and stats["test_n"]:
            shifts.append(
                {
                    "feature": feature,
                    "train_mean": round(stats["train_mean"], 6),
                    "test_mean": round(stats["test_mean"], 6),
                    "standardized_shift": round(stats["standardized_shift"], 6),
                }
            )
    shifts.sort(key=lambda row: row["standardized_shift"], reverse=True)
    cat_shifts = []
    for feature, tables in profiles["categorical"].items():
        train_counts: Counter[str] = tables["train"]
        test_counts: Counter[str] = tables["test"]
        keys = set(train_counts) | set(test_counts)
        train_total = max(1, sum(train_counts.values()))
        test_total = max(1, sum(test_counts.values()))
        diffs = [
            {
                "value": key,
                "train_pct": round(train_counts.get(key, 0) / train_total, 6),
                "test_pct": round(test_counts.get(key, 0) / test_total, 6),
                "abs_delta": round(abs(train_counts.get(key, 0) / train_total - test_counts.get(key, 0) / test_total), 6),
            }
            for key in keys
        ]
        diffs.sort(key=lambda row: row["abs_delta"], reverse=True)
        cat_shifts.append({"feature": feature, "top_shift": diffs[:3]})
    return {
        "auc": round(max(0.0, min(1.0, auc)), 6),
        "status": "warning" if auc > THRESHOLD_AUC else "ok",
        "drift_detected": auc > THRESHOLD_AUC,
        "top_numeric_shifts": shifts[:8],
        "categorical_shifts": cat_shifts,
    }


def synthetic_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    shifted: list[dict[str, Any]] = []
    for row in rows:
        clone = dict(row)
        odd = finite(clone.get("odd"), 2.0) or 2.0
        implied = finite(clone.get("implied_prob"), 1.0 / max(1.01, odd)) or 0.5
        clone["odd"] = round(min(12.0, odd * 1.35), 4)
        clone["implied_prob"] = round(max(0.02, min(0.98, implied * 0.72)), 6)
        clone["weather_wind_kmh"] = (finite(clone.get("weather_wind_kmh"), 0.0) or 0.0) + 28.0
        clone["injuries_home"] = (finite(clone.get("injuries_home"), 0.0) or 0.0) + 2.0
        clone["market"] = "synthetic_shift"
        shifted.append(clone)
    return shifted


def build() -> dict[str, Any]:
    rows = read_rows()
    if len(rows) < 10:
        train = rows[: max(1, len(rows) // 2)]
        test = rows[max(1, len(rows) // 2) :]
    else:
        split = max(5, int(len(rows) * 0.65))
        train = rows[:split]
        test = rows[split:]
    validation = validate(train, test) if train and test else {
        "auc": 0.5,
        "status": "insufficient_sample",
        "drift_detected": False,
        "top_numeric_shifts": [],
        "categorical_shifts": [],
    }
    synth = validate(train, synthetic_rows(train[: max(5, min(len(train), len(test) or len(train)))])) if train else {
        "auc": 0.5,
        "status": "insufficient_sample",
        "drift_detected": False,
        "top_numeric_shifts": [],
        "categorical_shifts": [],
    }
    recommendations = []
    if validation["drift_detected"]:
        recommendations.append("Bloquer promotion V5 automatique et recalibrer sur la dernière fenêtre settled.")
    else:
        recommendations.append("Distribution train/test acceptable ; conserver le rollout prudent.")
    if rows and len(rows) < 200:
        recommendations.append("Sample local faible : enrichir picks_history avant décision ROI forte.")
    payload = {
        "schema": "paris-sportif.adversarial_validation.v5",
        "generated_at": iso_now(),
        "threshold_auc": THRESHOLD_AUC,
        "rows": len(rows),
        "train_rows": len(train),
        "test_rows": len(test),
        "split": "chronological_65_35",
        **validation,
        "synthetic_check": synth,
        "recommendations": recommendations,
    }
    return payload


def main() -> int:
    payload = build()
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUT_JS.write_text(
        "window.ADVERSARIAL_VALIDATION_V5="
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(
        "[adversarial_validation_v5] "
        f"auc={payload['auc']:.3f} status={payload['status']} "
        f"synthetic_auc={payload['synthetic_check']['auc']:.3f}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

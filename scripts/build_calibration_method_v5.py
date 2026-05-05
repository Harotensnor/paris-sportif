#!/usr/bin/env python3
"""Compare Platt scaling and isotonic calibration for Model V5."""
from __future__ import annotations

import json
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
ROWS = ROOT / "backtest_training_rows.jsonl"
OUT_JSON = ROOT / "calibration_method.json"
OUT_JS = ROOT / "calibration_method.js"


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def finite(value: Any, fallback: float = 0.0) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return fallback
    return n if math.isfinite(n) else fallback


def sigmoid(z: float) -> float:
    if z < -35:
        return 0.0
    if z > 35:
        return 1.0
    return 1.0 / (1.0 + math.exp(-z))


def logit(p: float) -> float:
    p = max(0.001, min(0.999, p))
    return math.log(p / (1 - p))


def read_rows() -> list[dict[str, Any]]:
    out = []
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
    return out


def base_prob(row: dict[str, Any]) -> float:
    return max(0.02, min(0.98, finite(row.get("implied_prob"), 1 / max(1.01, finite(row.get("odd"), 2.0)))))


def brier(labels: list[int], probs: list[float]) -> float:
    if not labels:
        return 0.0
    return sum((p - y) ** 2 for y, p in zip(labels, probs)) / len(labels)


def fit_platt(labels: list[int], probs: list[float]) -> dict[str, Any]:
    xs = [logit(p) for p in probs]
    intercept = logit(sum(labels) / len(labels)) if labels else 0.0
    slope = 1.0
    lr = 0.04
    for _ in range(800):
        gi = 0.0
        gs = 0.0
        for x, y in zip(xs, labels):
            p = sigmoid(intercept + slope * x)
            err = p - y
            gi += err
            gs += err * x
        n = max(1, len(labels))
        intercept -= lr * gi / n
        slope -= lr * (gs / n + 0.02 * (slope - 1.0))
        slope = max(0.25, min(2.5, slope))
    calibrated = [sigmoid(intercept + slope * x) for x in xs]
    return {
        "method": "platt",
        "intercept": round(intercept, 6),
        "slope": round(slope, 6),
        "brier": round(brier(labels, calibrated), 6),
    }


def fit_isotonic(labels: list[int], probs: list[float]) -> dict[str, Any]:
    pairs = sorted(zip(probs, labels), key=lambda x: x[0])
    blocks = []
    for p, y in pairs:
        blocks.append({"lo": p, "hi": p, "sum_y": float(y), "n": 1})
        while len(blocks) >= 2:
            a, b = blocks[-2], blocks[-1]
            if a["sum_y"] / a["n"] <= b["sum_y"] / b["n"]:
                break
            merged = {
                "lo": a["lo"],
                "hi": b["hi"],
                "sum_y": a["sum_y"] + b["sum_y"],
                "n": a["n"] + b["n"],
            }
            blocks[-2:] = [merged]
    knots = []
    for block in blocks:
        value = block["sum_y"] / block["n"]
        knots.append([round(block["lo"], 5), round(block["hi"], 5), round(max(0.02, min(0.98, value)), 5), int(block["n"])])
    def apply(p: float) -> float:
        for lo, hi, value, _ in knots:
            if lo <= p <= hi:
                return value
        if p < knots[0][0]:
            return knots[0][2]
        return knots[-1][2]
    calibrated = [apply(p) for p in probs]
    return {"method": "isotonic", "knots": knots, "brier": round(brier(labels, calibrated), 6)}


def choose_scope(rows: list[dict[str, Any]], scope: str) -> dict[str, Any]:
    labels = [int(r["label"]) for r in rows]
    probs = [base_prob(r) for r in rows]
    baseline = brier(labels, probs)
    if len(rows) < 20:
        return {
            "scope": scope,
            "n": len(rows),
            "method": "none",
            "active": False,
            "baseline_brier": round(baseline, 6),
            "selected_brier": round(baseline, 6),
            "improvement": 0.0,
            "reason": "sample_lt_20",
        }
    candidates = [fit_platt(labels, probs), fit_isotonic(labels, probs)]
    best = min(candidates, key=lambda x: x["brier"])
    improvement = baseline - best["brier"]
    active = improvement >= 0.005
    return {
        "scope": scope,
        "n": len(rows),
        "method": best["method"] if active else "none",
        "active": active,
        "baseline_brier": round(baseline, 6),
        "selected_brier": best["brier"] if active else round(baseline, 6),
        "improvement": round(improvement, 6),
        "platt": candidates[0],
        "isotonic": candidates[1],
        "reason": "improvement_ge_0.005" if active else "improvement_lt_0.005",
    }


def build() -> dict[str, Any]:
    rows = read_rows()
    by_sport: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        by_sport[str(row.get("sport") or "unknown").lower()].append(row)
    sports = {sport: choose_scope(items, sport) for sport, items in sorted(by_sport.items())}
    global_scope = choose_scope(rows, "global")
    return {
        "schema": "paris-sportif.calibration_method.v5",
        "generated_at": iso_now(),
        "policy": "apply_only_if_brier_improves_by_at_least_0.005",
        "global": global_scope,
        "by_sport": sports,
    }


def main() -> int:
    payload = build()
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUT_JS.write_text(
        "window.CALIBRATION_METHOD_V5=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    active = [k for k, v in payload["by_sport"].items() if v.get("active")]
    print(f"[calibration_method_v5] active={active or ['none']} global={payload['global']['method']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

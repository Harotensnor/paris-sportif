#!/usr/bin/env python3
"""Detect Model V5 feature drift with histogram KL divergence."""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
ROWS = ROOT / "backtest_training_rows.jsonl"
OUT_JSON = ROOT / "feature_drift_v5.json"
OUT_JS = ROOT / "feature_drift_v5.js"

FEATURES = [
    "implied_prob",
    "odd",
    "elo_diff",
    "home_form_wr5",
    "away_form_wr5",
    "injuries_home",
    "injuries_away",
    "weather_wind_kmh",
]


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def finite(value: Any) -> float | None:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return None
    return n if math.isfinite(n) else None


def rows() -> list[dict[str, Any]]:
    out = []
    if not ROWS.exists():
        return out
    for line in ROWS.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    out.sort(key=lambda r: str(r.get("date") or ""))
    return out


def hist(values: list[float], bins: int = 10, lo: float | None = None, hi: float | None = None) -> list[float]:
    if not values:
        return [1.0 / bins] * bins
    lo = min(values) if lo is None else lo
    hi = max(values) if hi is None else hi
    if hi <= lo:
        return [1.0 / bins] * bins
    counts = [1e-6] * bins
    for v in values:
        idx = int((v - lo) / (hi - lo) * bins)
        idx = max(0, min(bins - 1, idx))
        counts[idx] += 1.0
    total = sum(counts)
    return [c / total for c in counts]


def kl(p: list[float], q: list[float]) -> float:
    return sum(pi * math.log(pi / qi) for pi, qi in zip(p, q) if pi > 0 and qi > 0)


def feature_values(rs: list[dict[str, Any]], name: str) -> list[float]:
    values = []
    for r in rs:
        v = finite(r.get(name))
        if v is not None:
            values.append(v)
    return values


def synthetic_shift(values: list[float]) -> list[float]:
    if not values:
        return []
    mean = sum(values) / len(values)
    return [v + 0.65 * abs(mean or 1.0) + 0.08 for v in values]


def build() -> dict[str, Any]:
    rs = rows()
    cut = max(1, int(len(rs) * 0.7))
    train = rs[:cut]
    pred = rs[cut:]
    feature_rows = []
    for name in FEATURES:
        a = feature_values(train, name)
        b = feature_values(pred, name)
        if len(a) < 5 or len(b) < 3:
            feature_rows.append({"feature": name, "status": "insufficient", "train_n": len(a), "prediction_n": len(b), "kl": 0.0})
            continue
        lo = min(a + b)
        hi = max(a + b)
        k = kl(hist(b, lo=lo, hi=hi), hist(a, lo=lo, hi=hi))
        status = "critical" if k > 0.45 else "warning" if k > 0.20 else "ok"
        feature_rows.append({
            "feature": name,
            "status": status,
            "train_n": len(a),
            "prediction_n": len(b),
            "kl": round(k, 5),
            "train_mean": round(sum(a) / len(a), 5),
            "prediction_mean": round(sum(b) / len(b), 5),
        })
    # Acceptance guard: prove the detector reacts to an artificial distribution shift.
    base = feature_values(train, "implied_prob")
    shifted = synthetic_shift(base)
    synthetic_kl = kl(hist(shifted, lo=min(base + shifted) if base else 0, hi=max(base + shifted) if base else 1), hist(base, lo=min(base + shifted) if base else 0, hi=max(base + shifted) if base else 1)) if base else 0.0
    max_kl = max((f.get("kl") or 0.0) for f in feature_rows) if feature_rows else 0.0
    # Small row-level samples are noisy: flag them, but do not paint Santé red
    # until the prediction window has enough observations to be actionable.
    mature_window = len(pred) >= 30
    overall = "critical" if mature_window and max_kl > 0.45 else "warning" if max_kl > 0.20 else "ok"
    return {
        "schema": "paris-sportif.feature_drift.v5",
        "generated_at": iso_now(),
        "method": "histogram_kl_divergence",
        "thresholds": {"warning": 0.20, "critical": 0.45},
        "rows": {"train": len(train), "prediction": len(pred), "total": len(rs)},
        "overall": overall,
        "max_kl": round(max_kl, 5),
        "features": sorted(feature_rows, key=lambda x: x.get("kl", 0), reverse=True),
        "synthetic_shift_test": {
            "feature": "implied_prob",
            "kl": round(synthetic_kl, 5),
            "detected": synthetic_kl > 0.45,
        },
        "message": "Distribution drift detected, recalibration recommended" if overall != "ok" else "Feature distributions stable",
    }


def main() -> int:
    payload = build()
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    compact = {**payload, "features": payload["features"][:12]}
    OUT_JS.write_text(
        "window.FEATURE_DRIFT_V5=" + json.dumps(compact, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"[feature_drift_v5] overall={payload['overall']} max_kl={payload['max_kl']} synthetic={payload['synthetic_shift_test']['detected']}")
    return 0 if payload["synthetic_shift_test"]["detected"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

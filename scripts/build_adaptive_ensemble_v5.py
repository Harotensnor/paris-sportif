#!/usr/bin/env python3
"""Build adaptive ensemble weights for Model V5.

The artifact is deliberately conservative: it learns from recent validation
signals when they exist, but keeps bounded weights so no single component can
dominate the prediction mix after one noisy window.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
OUT_JSON = ROOT / "ensemble_adaptive_weights.json"
OUT_JS = ROOT / "ensemble_adaptive_weights.js"

BASE_WEIGHTS = {
    "market": 0.28,
    "dixon_coles_xg": 0.24,
    "empirical_xg": 0.10,
    "home_away": 0.09,
    "form": 0.11,
    "elo": 0.10,
    "h2h": 0.05,
    "tennis_surface": 0.10,
    "tennis_form": 0.08,
    "nhl_pace": 0.08,
    "nhl_goalie": 0.07,
    "mlb_pitcher": 0.08,
}

SPORT_COMPONENTS = {
    "football": ["market", "dixon_coles_xg", "empirical_xg", "home_away", "form", "elo", "h2h"],
    "soccer": ["market", "dixon_coles_xg", "empirical_xg", "home_away", "form", "elo", "h2h"],
    "tennis": ["market", "tennis_surface", "tennis_form", "h2h"],
    "hockey": ["market", "nhl_pace", "nhl_goalie", "form"],
    "baseball": ["market", "mlb_pitcher", "form"],
    "basketball": ["market", "form", "elo"],
}


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path: str, default: Any) -> Any:
    p = ROOT / path
    if not p.exists():
        return default
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return default


def finite(value: Any, fallback: float = 0.0) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return fallback
    return n if math.isfinite(n) else fallback


def normalize(weights: dict[str, float]) -> dict[str, float]:
    clean = {k: max(0.02, finite(v, 0.0)) for k, v in weights.items()}
    total = sum(clean.values()) or 1.0
    return {k: round(v / total, 4) for k, v in clean.items()}


def component_score(component: str, validation: dict[str, Any], stacking: dict[str, Any], drift_penalty: float) -> dict[str, Any]:
    base = BASE_WEIGHTS.get(component, 0.08)
    detail = (validation.get("historical") or {}).get("by_kind", {}).get(component, {})
    n = int(detail.get("n") or 0)
    component_brier = finite(detail.get("component_brier"), 0.25)
    gain_vs_ensemble = finite(detail.get("component_minus_ensemble_brier"), 0.0)
    sample_factor = min(1.0, math.log1p(n) / math.log(501)) if n > 0 else 0.35
    brier_factor = max(0.65, min(1.30, 1.0 + (0.25 - component_brier) * 1.8))
    gain_factor = max(0.80, min(1.18, 1.0 + gain_vs_ensemble * 2.2))
    feature_factor = 1.0
    feature_map = {
        "dixon_coles_xg": "xg_prob",
        "empirical_xg": "xg_prob",
        "market": "base_prob",
        "elo": "elo_prob",
        "form": "form_prob",
    }
    coeff = (stacking.get("coefficients") or {}).get(feature_map.get(component, ""))
    if coeff is not None:
        feature_factor = max(0.82, min(1.18, 1.0 + abs(finite(coeff)) * 0.08))
    raw = base * (0.75 + 0.25 * sample_factor) * brier_factor * gain_factor * feature_factor * drift_penalty
    return {
        "weight_raw": raw,
        "base": base,
        "n": n,
        "component_brier": round(component_brier, 4),
        "gain_vs_ensemble": round(gain_vs_ensemble, 4),
        "sample_factor": round(sample_factor, 4),
        "drift_penalty": round(drift_penalty, 4),
    }


def drift_penalty_from_artifact(drift: dict[str, Any]) -> float:
    status = str(drift.get("overall") or "ok").lower()
    max_kl = finite(drift.get("max_kl"), 0.0)
    if status == "critical" or max_kl > 0.45:
        return 0.90
    if status == "warning" or max_kl > 0.20:
        return 0.95
    return 1.0


def build() -> dict[str, Any]:
    validation = read_json("ensemble_validation.json", {})
    stacking = read_json("stacking_meta_weights.json", {})
    drift = read_json("feature_drift_v5.json", {})
    backtest = read_json("backtest_report_v2.json", {})
    drift_penalty = drift_penalty_from_artifact(drift)
    components = {k: component_score(k, validation, stacking, drift_penalty) for k in BASE_WEIGHTS}
    normalized = normalize({k: v["weight_raw"] for k, v in components.items()})
    by_sport = {}
    by_sport_backtest = backtest.get("by_sport") or {}
    for sport, keys in SPORT_COMPONENTS.items():
        sport_factor = 1.0
        sport_row = by_sport_backtest.get(sport) or {}
        brier = finite(sport_row.get("brier"), 0.23)
        if brier > 0.25:
            sport_factor = 0.94
        elif brier < 0.22 and sport_row.get("n", 0) >= 50:
            sport_factor = 1.04
        weights = {k: normalized.get(k, BASE_WEIGHTS.get(k, 0.08)) * sport_factor for k in keys}
        by_sport[sport] = {
            "weights": normalize(weights),
            "brier": round(brier, 4),
            "n": int(sport_row.get("n") or 0),
            "adjustment": round(sport_factor, 3),
        }
    return {
        "schema": "paris-sportif.ensemble_adaptive.v5",
        "generated_at": iso_now(),
        "window_days": 30,
        "policy": "weekly bounded reweighting from validation brier, stacking importance and feature drift",
        "status": "ok",
        "weights": normalized,
        "by_sport": by_sport,
        "components": {k: {**v, "weight": normalized[k]} for k, v in components.items()},
        "drift": {
            "overall": drift.get("overall", "missing"),
            "max_kl": round(finite(drift.get("max_kl"), 0.0), 4),
            "penalty": round(drift_penalty, 4),
        },
        "source_metrics": {
            "validation_generated_at": validation.get("generated_at"),
            "stacking_generated_at": stacking.get("generated_at"),
            "backtest_generated_at": backtest.get("generated_at"),
        },
    }


def main() -> int:
    payload = build()
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUT_JS.write_text(
        "window.ENSEMBLE_ADAPTIVE_V5=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    top = sorted(payload["weights"].items(), key=lambda kv: kv[1], reverse=True)[:4]
    print("[adaptive_ensemble_v5] " + ", ".join(f"{k}={v:.3f}" for k, v in top))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

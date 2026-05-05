#!/usr/bin/env python3
"""Build Model V5 versioning and online-learning rollout metadata."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
OUT_JSON = ROOT / "model_versions.json"
OUT_JS = ROOT / "model_versions.js"


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


def sha(path: str) -> str | None:
    p = ROOT / path
    if not p.exists():
        return None
    h = hashlib.sha256()
    h.update(p.read_bytes())
    return h.hexdigest()[:12]


def next_sunday_utc() -> str:
    now = datetime.now(timezone.utc).replace(microsecond=0)
    days = (6 - now.weekday()) % 7
    if days == 0 and now.hour >= 3:
        days = 7
    target = (now + timedelta(days=days)).replace(hour=3, minute=0, second=0)
    return target.isoformat().replace("+00:00", "Z")


def build() -> dict[str, Any]:
    stacking = read_json("stacking_meta_weights.json", {})
    priors = read_json("bayesian_priors.json", {})
    features = read_json("feature_engineering_v5.json", {})
    v4 = read_json("model_v4_benchmark.json", {})
    backtest = read_json("backtest_report_v2.json", {})
    overall = backtest.get("overall") or {}
    stack_validation = (stacking.get("training") or {}).get("rolling_origin") or {}
    return {
        "schema": "paris-sportif.model_versions.v5",
        "generated_at": iso_now(),
        "current": "v5.0",
        "online_learning": {
            "weekly_recalibration_day": "sunday",
            "weekly_recalibration_utc": "03:00",
            "next_recalibration_at": next_sunday_utc(),
            "trainer_scripts": [
                "build_bayesian_priors_v5.py",
                "build_feature_engineering_v5.py",
                "build_stacking_meta_v5.py",
                "build_adaptive_ensemble_v5.py",
                "build_cold_start_v5.py",
                "build_multitask_v5.py",
                "build_backtest_deep_v5.py",
            ],
            "settled_source": "picks_history.jsonl + backtest_training_rows.jsonl",
        },
        "rollout_policy": {
            "strategy": "deterministic_pick_hash_bucket",
            "stages": [
                {"share": 0.10, "min_days": 7, "promote_if": "ROI >= baseline and Brier <= baseline + 0.005"},
                {"share": 0.50, "min_days": 7, "promote_if": "ROI >= baseline and no critical drift"},
                {"share": 1.00, "min_days": 7, "promote_if": "health overall ok/warning"},
            ],
            "rollback_if": [
                "ROI delta <= -2pt on 100+ settled picks",
                "Brier delta >= +0.010",
                "feature KL drift critical",
            ],
        },
        "history": [
            {
                "version": "v4-contextual",
                "status": (v4.get("v4a") or {}).get("status", "baseline"),
                "promoted_at": v4.get("generated_at"),
                "roi_pct": ((v4.get("baseline") or {}).get("flat_roi_pct")),
                "brier": ((v4.get("baseline") or {}).get("brier")),
            },
            {
                "version": "v5.0",
                "status": "shadow_ab",
                "promoted_at": iso_now(),
                "share": 0.10,
                "priors_teams": (priors.get("coverage") or {}).get("teams", 0),
                "stacking_rows": (stacking.get("training") or {}).get("rows", 0),
                "feature_count": features.get("feature_count", 0),
                "rolling_origin_brier": stack_validation.get("meta_brier", 0),
                "baseline_brier": overall.get("brier", 0),
            },
        ],
        "artifacts": {
            "bayesian_priors.json": sha("bayesian_priors.json"),
            "feature_engineering_v5.json": sha("feature_engineering_v5.json"),
            "stacking_meta_weights.json": sha("stacking_meta_weights.json"),
            "calibration_method.json": sha("calibration_method.json"),
            "ensemble_adaptive_weights.json": sha("ensemble_adaptive_weights.json"),
            "cold_start_v5.json": sha("cold_start_v5.json"),
            "multitask_v5.json": sha("multitask_v5.json"),
            "backtest_deep_v5.json": sha("backtest_deep_v5.json"),
        },
    }


def main() -> int:
    payload = build()
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUT_JS.write_text(
        "window.MODEL_VERSIONS_V5=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"[model_versions_v5] current={payload['current']} next={payload['online_learning']['next_recalibration_at']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

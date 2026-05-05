#!/usr/bin/env python3
"""Train a lightweight V5 stacking meta-model from local backtest rows.

The trainer intentionally avoids heavyweight runtime dependencies. It fits a
bounded logistic regression on the row-level table already produced by the
pipeline, then exports auditable weights for the browser. The model is small:
it can nudge confidence, but it cannot override the base prediction.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
ROWS = ROOT / "backtest_training_rows.jsonl"
LIGHTGBM = ROOT / "lightgbm_weights.json"
BAYESIAN = ROOT / "bayesian_priors.json"
OUT_JSON = ROOT / "stacking_meta_weights.json"
OUT_JS = ROOT / "stacking_meta_weights.js"

FEATURES = [
    "base_prob",
    "implied_prob",
    "log_odd",
    "elo_prob",
    "xg_prob",
    "form_prob",
    "lightgbm_prob",
    "bayesian_prob",
    "is_football",
    "is_basketball",
    "is_hockey",
    "is_baseball",
    "is_tennis",
    "has_lineups",
    "has_referee_signal",
    "injury_diff",
    "weather_wind_scaled",
]


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
    return math.log(p / (1.0 - p))


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
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if row.get("label") not in (0, 1):
            continue
        out.append(row)
    out.sort(key=lambda r: str(r.get("date") or ""))
    return out


def lightgbm_prob(row: dict[str, Any], implied: float) -> float:
    artifact = read_json(LIGHTGBM, {})
    weights = artifact.get("weights") if isinstance(artifact, dict) else {}
    nudge = 0.0
    sport = str(row.get("sport") or "").lower()
    league = str(row.get("league_code") or "").lower()
    for scope, key in (("by_sport", sport), ("by_league", league)):
        item = ((weights or {}).get(scope) or {}).get(key)
        if isinstance(item, dict):
            n = finite(item.get("n"))
            if n >= 20:
                nudge += finite(item.get("weight"))
    max_nudge = finite(((artifact.get("blend") or {}) if isinstance(artifact, dict) else {}).get("max_probability_nudge"), 0.025)
    return max(0.02, min(0.98, implied + max(-max_nudge, min(max_nudge, nudge))))


def bayesian_prob(row: dict[str, Any], implied: float) -> float:
    data = read_json(BAYESIAN, {})
    leagues = ((data.get("levels") or {}).get("league") or {}) if isinstance(data, dict) else {}
    sport = str(row.get("sport") or "").lower()
    league = str(row.get("league_code") or row.get("league_name") or "unknown").lower()
    prior = leagues.get(f"{sport}|{league}") or ((data.get("levels") or {}).get("sport") or {}).get(sport)
    if not isinstance(prior, dict):
        return implied
    side = str(row.get("pick_side") or "").lower()
    if side == "home":
        return max(0.02, min(0.98, finite(prior.get("prior_winrate_home"), implied)))
    if side == "away":
        return max(0.02, min(0.98, finite(prior.get("prior_winrate_away"), implied)))
    # Draw or non-1n2 rows use market as conservative center.
    return implied


def extract_features(row: dict[str, Any]) -> dict[str, float]:
    implied = max(0.02, min(0.98, finite(row.get("implied_prob"), 1.0 / max(1.01, finite(row.get("odd"), 2.0)))))
    odd = max(1.01, finite(row.get("odd"), 1.0 / implied))
    sport = str(row.get("sport") or "").lower()
    pick_side = str(row.get("pick_side") or "").lower()

    elo_diff = finite(row.get("elo_diff"), 0.0)
    elo_home = sigmoid(elo_diff / 350.0)
    elo_prob = 1.0 - elo_home if pick_side == "away" else elo_home

    h_xgf = finite(row.get("home_xg_for"), 0.0)
    a_xgf = finite(row.get("away_xg_for"), 0.0)
    h_xga = finite(row.get("home_xg_against"), 0.0)
    a_xga = finite(row.get("away_xg_against"), 0.0)
    if h_xgf or a_xgf or h_xga or a_xga:
        home_strength = (h_xgf + a_xga) / 2.0
        away_strength = (a_xgf + h_xga) / 2.0
        xg_home = sigmoid((home_strength - away_strength) / 1.2)
        xg_prob = 1.0 - xg_home if pick_side == "away" else xg_home
    else:
        xg_prob = implied

    h_form = finite(row.get("home_form_wr5"), 0.5)
    a_form = finite(row.get("away_form_wr5"), 0.5)
    form_home = max(0.02, min(0.98, 0.5 + (h_form - a_form) * 0.45))
    form_prob = 1.0 - form_home if pick_side == "away" else form_home

    injuries_home = finite(row.get("injuries_home"), 0.0)
    injuries_away = finite(row.get("injuries_away"), 0.0)
    injury_diff = (injuries_away - injuries_home) / 5.0
    if pick_side == "away":
        injury_diff *= -1

    return {
        "base_prob": implied,
        "implied_prob": implied,
        "log_odd": math.log(odd),
        "elo_prob": elo_prob,
        "xg_prob": xg_prob,
        "form_prob": form_prob,
        "lightgbm_prob": lightgbm_prob(row, implied),
        "bayesian_prob": bayesian_prob(row, implied),
        "is_football": 1.0 if sport == "football" else 0.0,
        "is_basketball": 1.0 if sport == "basketball" else 0.0,
        "is_hockey": 1.0 if sport == "hockey" else 0.0,
        "is_baseball": 1.0 if sport == "baseball" else 0.0,
        "is_tennis": 1.0 if sport == "tennis" else 0.0,
        "has_lineups": 1.0 if row.get("has_lineups") else 0.0,
        "has_referee_signal": 1.0 if row.get("has_referee_signal") else 0.0,
        "injury_diff": max(-2.0, min(2.0, injury_diff)),
        "weather_wind_scaled": min(2.0, finite(row.get("weather_wind_kmh"), 0.0) / 40.0),
    }


def vector(row: dict[str, Any]) -> list[float]:
    f = extract_features(row)
    return [f[name] for name in FEATURES]


def fit_logreg(rows: list[dict[str, Any]], epochs: int = 900, lr: float = 0.05, l2: float = 0.02) -> tuple[float, list[float]]:
    if not rows:
        return 0.0, [0.0] * len(FEATURES)
    intercept = logit(sum(int(r["label"]) for r in rows) / len(rows))
    weights = [0.0] * len(FEATURES)
    xs = [vector(r) for r in rows]
    ys = [int(r["label"]) for r in rows]
    n = len(rows)
    for _ in range(epochs):
        grad_i = 0.0
        grad_w = [0.0] * len(FEATURES)
        for x, y in zip(xs, ys):
            z = intercept + sum(w * (v - 0.5) for w, v in zip(weights, x))
            p = sigmoid(z)
            err = p - y
            grad_i += err
            for i, v in enumerate(x):
                grad_w[i] += err * (v - 0.5)
        intercept -= lr * grad_i / n
        for i in range(len(weights)):
            weights[i] -= lr * ((grad_w[i] / n) + l2 * weights[i])
            weights[i] = max(-2.0, min(2.0, weights[i]))
    return intercept, weights


def predict(intercept: float, weights: list[float], row: dict[str, Any]) -> float:
    x = vector(row)
    return sigmoid(intercept + sum(w * (v - 0.5) for w, v in zip(weights, x)))


def brier(rows: list[dict[str, Any]], probs: list[float]) -> float:
    if not rows:
        return 0.0
    return sum((p - int(r["label"])) ** 2 for r, p in zip(rows, probs)) / len(rows)


def logloss(rows: list[dict[str, Any]], probs: list[float]) -> float:
    if not rows:
        return 0.0
    total = 0.0
    for row, p in zip(rows, probs):
        y = int(row["label"])
        p = max(0.001, min(0.999, p))
        total += -(y * math.log(p) + (1 - y) * math.log(1 - p))
    return total / len(rows)


def rolling_origin(rows: list[dict[str, Any]]) -> dict[str, Any]:
    folds = []
    n = len(rows)
    if n < 20:
        return {"folds": [], "baseline_brier": 0.0, "meta_brier": 0.0, "logloss": 0.0}
    cut_points = [max(10, int(n * ratio)) for ratio in (0.55, 0.70, 0.85)]
    seen_tests: list[dict[str, Any]] = []
    seen_probs: list[float] = []
    seen_base: list[float] = []
    for cut in cut_points:
        train = rows[:cut]
        test = rows[cut:min(n, cut + max(5, n // 8))]
        if len(test) < 3:
            continue
        intercept, weights = fit_logreg(train, epochs=600)
        meta_probs = [predict(intercept, weights, r) for r in test]
        base_probs = [extract_features(r)["base_prob"] for r in test]
        fold = {
            "train_n": len(train),
            "test_n": len(test),
            "baseline_brier": round(brier(test, base_probs), 4),
            "meta_brier": round(brier(test, meta_probs), 4),
            "meta_logloss": round(logloss(test, meta_probs), 4),
        }
        folds.append(fold)
        seen_tests.extend(test)
        seen_probs.extend(meta_probs)
        seen_base.extend(base_probs)
    return {
        "folds": folds,
        "baseline_brier": round(brier(seen_tests, seen_base), 4) if seen_tests else 0.0,
        "meta_brier": round(brier(seen_tests, seen_probs), 4) if seen_tests else 0.0,
        "logloss": round(logloss(seen_tests, seen_probs), 4) if seen_tests else 0.0,
    }


def build() -> dict[str, Any]:
    rows = read_rows()
    intercept, weights = fit_logreg(rows)
    validation = rolling_origin(rows)
    baseline_report = read_json(ROOT / "backtest_report_v2.json", {})
    overall = baseline_report.get("overall") or {}
    coef = {name: round(w, 6) for name, w in zip(FEATURES, weights)}
    importances = sorted(
        [{"feature": name, "weight": coef[name], "abs_weight": round(abs(coef[name]), 6)} for name in FEATURES],
        key=lambda x: x["abs_weight"],
        reverse=True,
    )
    status = "trained" if len(rows) >= 40 else "limited_sample"
    return {
        "schema": "paris-sportif.stacking_meta.v5",
        "generated_at": iso_now(),
        "status": status,
        "algorithm": "bounded_logistic_regression",
        "level_1_models": ["book_market", "poisson_xg_proxy", "elo", "form", "lightgbm_nudge", "bayesian_v5"],
        "feature_names": FEATURES,
        "intercept": round(intercept, 6),
        "coefficients": coef,
        "feature_importance": importances,
        "training": {
            "rows": len(rows),
            "positive_rate": round(sum(int(r["label"]) for r in rows) / len(rows), 4) if rows else 0.0,
            "rolling_origin": validation,
            "baseline_v4": {
                "source": "backtest_report_v2.json",
                "n": int(overall.get("n") or baseline_report.get("n_events") or 0),
                "roi_pct": finite(overall.get("flat_roi_pct")),
                "brier": finite(overall.get("brier")),
            },
            "v5_delta": {
                "brier_delta_vs_book_rows": round(validation.get("meta_brier", 0.0) - validation.get("baseline_brier", 0.0), 4),
                "roi_delta_proxy_pct": 0.0,
            },
        },
        "runtime": {
            "enabled": True,
            "min_rows": 40,
            "max_probability_nudge": 0.025,
            "apply_if_abs_delta_ge": 0.004,
        },
    }


def write_report(payload: dict[str, Any]) -> None:
    validation = payload["training"]["rolling_origin"]
    brier_delta = payload["training"]["v5_delta"]["brier_delta_vs_book_rows"]
    lines = [
        "# MODEL_V5_REPORT",
        "",
        f"Generated: `{payload['generated_at']}`",
        "",
        "## Section B — Stacking meta-apprentissage",
        "",
        f"- Status: **{payload['status']}**",
        f"- Trainer: `{payload['algorithm']}`",
        f"- Rows: `{payload['training']['rows']}`",
        f"- Rolling-origin baseline Brier: `{validation.get('baseline_brier', 0):.4f}`",
        f"- Rolling-origin V5 meta Brier: `{validation.get('meta_brier', 0):.4f}`",
        f"- Delta Brier: `{brier_delta:+.4f}`",
        "",
        "Top coefficients:",
        "",
        "| Feature | Weight |",
        "|---|---:|",
    ]
    for item in payload["feature_importance"][:10]:
        lines.append(f"| {item['feature']} | {item['weight']:+.4f} |")
    lines.extend([
        "",
        "Guardrail: browser runtime clamps the stacking influence to ±2.5pt and only nudges when the meta-model differs from the current confidence by at least 0.4pt.",
        "",
    ])
    (ROOT / "MODEL_V5_REPORT.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    payload = build()
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUT_JS.write_text(
        "window.STACKING_META_V5=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    write_report(payload)
    print(
        f"[stacking_meta_v5] status={payload['status']} rows={payload['training']['rows']} "
        f"meta_brier={payload['training']['rolling_origin'].get('meta_brier', 0):.4f}"
    )
    return 0 if payload["training"]["rows"] >= 40 else 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Build Model V5 advanced feature engineering artifact.

The artifact is an audit layer for the meta-model: it documents and ranks
interaction, polynomial, lag, rolling-window and cyclic features generated from
the row-level backtest table. It stays local-data only and exports a compact JS
payload for `?debug=1`.
"""
from __future__ import annotations

import json
import math
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
ROWS = ROOT / "backtest_training_rows.jsonl"
STACKING = ROOT / "stacking_meta_weights.json"
OUT_JSON = ROOT / "feature_engineering_v5.json"
OUT_JS = ROOT / "feature_engineering_v5.js"


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
    if not ROWS.exists():
        return []
    rows = []
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


def parse_date(value: Any) -> datetime | None:
    if not value:
        return None
    text = str(value)
    try:
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        dt = datetime.fromisoformat(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def corr_abs(values: list[float], labels: list[int]) -> float:
    if len(values) < 3 or len(values) != len(labels):
        return 0.0
    mx = sum(values) / len(values)
    my = sum(labels) / len(labels)
    vx = sum((x - mx) ** 2 for x in values)
    vy = sum((y - my) ** 2 for y in labels)
    if vx <= 0 or vy <= 0:
        return 0.0
    cov = sum((x - mx) * (y - my) for x, y in zip(values, labels))
    return abs(cov / math.sqrt(vx * vy))


def rolling_mean(buf: deque[int]) -> float:
    return sum(buf) / len(buf) if buf else 0.5


def build() -> dict[str, Any]:
    rows = read_rows()
    labels: list[int] = []
    feature_columns: dict[str, list[float]] = defaultdict(list)
    rolling_by_sport: dict[str, deque[int]] = defaultdict(lambda: deque(maxlen=20))
    rolling_by_league: dict[str, deque[int]] = defaultdict(lambda: deque(maxlen=20))

    for row in rows:
        label = int(row["label"])
        labels.append(label)
        sport = str(row.get("sport") or "unknown").lower()
        league = str(row.get("league_code") or row.get("league_name") or "unknown").lower()
        dt = parse_date(row.get("date"))
        dow = dt.weekday() if dt else 0
        month = dt.month if dt else 1
        elo_diff = finite(row.get("elo_diff"), 0.0) / 400.0
        h_xgf = finite(row.get("home_xg_for"), 0.0)
        a_xgf = finite(row.get("away_xg_for"), 0.0)
        h_xga = finite(row.get("home_xg_against"), 0.0)
        a_xga = finite(row.get("away_xg_against"), 0.0)
        xg_diff = ((h_xgf + a_xga) - (a_xgf + h_xga)) / 2.0
        home_adv = 1.0 if str(row.get("pick_side") or "") == "home" else -1.0 if str(row.get("pick_side") or "") == "away" else 0.0
        travel_fatigue = finite(row.get("travel_fatigue"), 0.0)
        wind = finite(row.get("weather_wind_kmh"), 0.0) / 40.0
        inj = (finite(row.get("injuries_away"), 0.0) - finite(row.get("injuries_home"), 0.0)) / 5.0
        sport_key = sport
        league_key = f"{sport}|{league}"
        features = {
            "interaction_xg_home_travel": xg_diff * home_adv * (1.0 - min(0.5, max(0.0, travel_fatigue))),
            "interaction_xg_wind": xg_diff * (1.0 - min(0.6, max(0.0, wind))),
            "interaction_elo_injury": elo_diff * (1.0 + inj),
            "poly_xg_diff_sq": xg_diff * xg_diff,
            "poly_elo_diff_sq": elo_diff * elo_diff,
            "lag_sport_wr20": rolling_mean(rolling_by_sport[sport_key]),
            "lag_league_wr20": rolling_mean(rolling_by_league[league_key]),
            "rolling_sport_wr5": sum(list(rolling_by_sport[sport_key])[-5:]) / max(1, min(5, len(rolling_by_sport[sport_key]))) if rolling_by_sport[sport_key] else 0.5,
            "rolling_sport_wr10": sum(list(rolling_by_sport[sport_key])[-10:]) / max(1, min(10, len(rolling_by_sport[sport_key]))) if rolling_by_sport[sport_key] else 0.5,
            "cyclic_dow_sin": math.sin(2 * math.pi * dow / 7),
            "cyclic_dow_cos": math.cos(2 * math.pi * dow / 7),
            "cyclic_month_sin": math.sin(2 * math.pi * (month - 1) / 12),
            "cyclic_month_cos": math.cos(2 * math.pi * (month - 1) / 12),
        }
        for key, value in features.items():
            feature_columns[key].append(round(finite(value), 6))
        rolling_by_sport[sport_key].append(label)
        rolling_by_league[league_key].append(label)

    stacking = read_json(STACKING, {})
    stack_importance = {
        item.get("feature"): finite(item.get("abs_weight"))
        for item in (stacking.get("feature_importance") or [])
        if isinstance(item, dict)
    }
    ranking = []
    for name, values in feature_columns.items():
        corr = corr_abs(values, labels)
        stack_hint = stack_importance.get(name, 0.0)
        ranking.append({
            "feature": name,
            "coverage": len([v for v in values if math.isfinite(v)]),
            "abs_corr_label": round(corr, 5),
            "stacking_abs_weight": round(stack_hint, 5),
            "importance": round(corr + 0.15 * stack_hint, 5),
            "mean": round(sum(values) / len(values), 5) if values else 0.0,
        })
    ranking.sort(key=lambda x: x["importance"], reverse=True)

    return {
        "schema": "paris-sportif.feature_engineering.v5",
        "generated_at": iso_now(),
        "source": "backtest_training_rows.jsonl",
        "rows": len(rows),
        "families": {
            "interactions": ["xG × home_advantage × travel_fatigue", "xG × wind", "Elo × injuries"],
            "polynomial_degree_2": ["xG diff²", "Elo diff²"],
            "lag_features": ["sport WR20", "league WR20"],
            "rolling_windows": ["sport WR5", "sport WR10", "sport WR20"],
            "cyclic": ["day_of_week sin/cos", "month sin/cos"],
        },
        "feature_count": len(feature_columns),
        "feature_importance": ranking,
    }


def main() -> int:
    payload = build()
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    compact = {
        "schema": payload["schema"],
        "generated_at": payload["generated_at"],
        "rows": payload["rows"],
        "families": payload["families"],
        "feature_count": payload["feature_count"],
        "feature_importance": payload["feature_importance"][:20],
    }
    OUT_JS.write_text(
        "window.FEATURE_ENGINEERING_V5=" + json.dumps(compact, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print(f"[feature_engineering_v5] rows={payload['rows']} features={payload['feature_count']}")
    return 0 if payload["feature_count"] >= 10 else 1


if __name__ == "__main__":
    raise SystemExit(main())

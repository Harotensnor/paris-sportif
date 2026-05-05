#!/usr/bin/env python3
"""Build the V5 deep backtest breakdown and markdown report."""
from __future__ import annotations

import json
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
ROWS = ROOT / "backtest_training_rows.jsonl"
OUT_JSON = ROOT / "backtest_deep_v5.json"
OUT_JS = ROOT / "backtest_deep_v5.js"
OUT_MD = ROOT / "BACKTEST_DEEP_V5.md"


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def finite(value: Any, fallback: float = 0.0) -> float:
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


def odds_bucket(odd: float) -> str:
    if odd < 1.5:
        return "1.01-1.50"
    if odd < 2.0:
        return "1.50-2.00"
    if odd < 3.0:
        return "2.00-3.00"
    if odd < 5.0:
        return "3.00-5.00"
    return "5.00+"


def weather_bucket(row: dict[str, Any]) -> str:
    wind = finite(row.get("weather_wind_kmh"), 0.0)
    precip = finite(row.get("weather_precip_mm"), 0.0)
    if wind >= 35:
        return "vent_fort_35+"
    if precip >= 5:
        return "pluie_5mm+"
    if wind > 0 or precip > 0:
        return "meteo_moderee"
    return "meteo_absente_ou_calme"


def implied(row: dict[str, Any]) -> float:
    odd = max(1.01, finite(row.get("odd"), 2.0))
    return max(0.02, min(0.98, finite(row.get("implied_prob"), 1.0 / odd)))


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    n = len(rows)
    if not n:
        return {"n": 0, "wins": 0, "losses": 0, "win_rate": 0.0, "brier": 0.0, "roi_flat": 0.0}
    wins = sum(1 for r in rows if int(r["label"]) == 1)
    stake = float(n)
    profit = 0.0
    brier = 0.0
    avg_odd = 0.0
    avg_prob = 0.0
    for row in rows:
        label = int(row["label"])
        odd = max(1.01, finite(row.get("odd"), 2.0))
        prob = implied(row)
        profit += (odd - 1.0) if label else -1.0
        brier += (prob - label) ** 2
        avg_odd += odd
        avg_prob += prob
    return {
        "n": n,
        "wins": wins,
        "losses": n - wins,
        "win_rate": round(wins / n, 6),
        "brier": round(brier / n, 6),
        "roi_flat": round(profit / stake, 6),
        "avg_odd": round(avg_odd / n, 4),
        "avg_implied_prob": round(avg_prob / n, 6),
    }


def breakdown(rows: list[dict[str, Any]], key_fn) -> dict[str, Any]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        key = str(key_fn(row) or "unknown").lower()
        groups[key].append(row)
    return {key: summarize(bucket) for key, bucket in sorted(groups.items(), key=lambda kv: (-len(kv[1]), kv[0]))}


def recommendations(worst: list[dict[str, Any]]) -> list[str]:
    recs = []
    for zone in worst[:5]:
        label = zone["zone"]
        reason = []
        if zone["roi_flat"] < -0.05:
            reason.append("ROI flat négatif")
        if zone["brier"] > 0.25:
            reason.append("Brier élevé")
        if zone["n"] < 20:
            reason.append("sample faible")
        recs.append(f"{label}: surveiller ({', '.join(reason) or 'écart modéré'}).")
    return recs


def build() -> dict[str, Any]:
    rows = read_rows()
    dates = [parse_date(r.get("date")) for r in rows]
    dates = [d for d in dates if d]
    overall = summarize(rows)
    by_sport = breakdown(rows, lambda r: r.get("sport") or "unknown")
    by_league = breakdown(rows, lambda r: r.get("league_code") or r.get("league_name") or "unknown")
    by_market = breakdown(rows, lambda r: r.get("market") or "1n2")
    by_odds = breakdown(rows, lambda r: odds_bucket(max(1.01, finite(r.get("odd"), 2.0))))
    by_month = breakdown(rows, lambda r: (parse_date(r.get("date")) or datetime(1970, 1, 1, tzinfo=timezone.utc)).strftime("%Y-%m"))
    by_weather = breakdown(rows, weather_bucket)
    zones = []
    for family, table in [
        ("sport", by_sport),
        ("league", by_league),
        ("odds", by_odds),
        ("market", by_market),
        ("month", by_month),
        ("weather", by_weather),
    ]:
        for key, stats in table.items():
            if stats["n"] < 3:
                continue
            risk = max(0.0, stats["brier"] - 0.22) + max(0.0, -stats["roi_flat"]) * 0.25
            zones.append({"family": family, "key": key, "zone": f"{family}:{key}", "risk_score": round(risk, 6), **stats})
    zones.sort(key=lambda z: (z["risk_score"], z["n"]), reverse=True)
    payload = {
        "schema": "paris-sportif.backtest_deep.v5",
        "generated_at": iso_now(),
        "requested_window_months": 24,
        "actual_date_range": {
            "start": dates[0].isoformat().replace("+00:00", "Z") if dates else None,
            "end": dates[-1].isoformat().replace("+00:00", "Z") if dates else None,
        },
        "overall": overall,
        "breakdowns": {
            "sport": by_sport,
            "league": by_league,
            "odds_bucket": by_odds,
            "market": by_market,
            "month": by_month,
            "weather": by_weather,
        },
        "worst_zones": zones[:5],
        "recommendations": recommendations(zones),
        "limitations": [
            "Le repo local contient la fenêtre disponible dans backtest_training_rows.jsonl ; la demande 24 mois est documentée même si le sample actuel est plus court.",
            "Les marchés hors 1N2 utilisent les agrégats existants tant que le row-level multi-market complet n'est pas historisé.",
        ],
    }
    return payload


def write_markdown(payload: dict[str, Any]) -> None:
    def pct(x: float) -> str:
        return f"{x * 100:+.1f}%"

    lines = [
        "# BACKTEST_DEEP_V5",
        "",
        f"Generated: `{payload['generated_at']}`",
        "",
        "## Résumé",
        "",
        f"- Fenêtre demandée: `{payload['requested_window_months']}` mois",
        f"- Fenêtre disponible: `{payload['actual_date_range']['start']}` → `{payload['actual_date_range']['end']}`",
        f"- Lignes évaluées: `{payload['overall']['n']}`",
        f"- Win rate: `{payload['overall']['win_rate'] * 100:.1f}%`",
        f"- ROI flat: `{pct(payload['overall']['roi_flat'])}`",
        f"- Brier: `{payload['overall']['brier']:.3f}`",
        "",
        "## 5 zones les plus fragiles",
        "",
        "| Zone | n | WR | ROI | Brier |",
        "|---|---:|---:|---:|---:|",
    ]
    for z in payload["worst_zones"]:
        lines.append(f"| {z['zone']} | {z['n']} | {z['win_rate'] * 100:.1f}% | {pct(z['roi_flat'])} | {z['brier']:.3f} |")
    lines += [
        "",
        "## Recommandations",
        "",
    ]
    for rec in payload["recommendations"]:
        lines.append(f"- {rec}")
    lines += [
        "",
        "## Limites assumées",
        "",
    ]
    for item in payload["limitations"]:
        lines.append(f"- {item}")
    lines.append("")
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    payload = build()
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUT_JS.write_text(
        "window.BACKTEST_DEEP_V5=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    write_markdown(payload)
    print(f"[backtest_deep_v5] rows={payload['overall']['n']} worst={len(payload['worst_zones'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

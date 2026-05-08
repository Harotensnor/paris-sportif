#!/usr/bin/env python3
"""AUDIT 2026-05-08 — Construit segment_trust.json depuis backtest_report_v2.

Le backtest mesure ROI/WR par dimension : sport, ligue, sport×ligue×marché,
cote_bucket, tier. Le frontend ne lit qu'`overall` (ROI global) et n'utilise
PAS ces segments pour décider quels picks afficher.

Constat objectif : le modèle gagne sur baseball (+7%), foot petites ligues
(+1.2%), outsiders (+4%), tier "standard" (+68%) ; mais perd sur foot top-5
(-7.7%), basket NBA (-12.9%), hockey NHL (-10.8%), heavy_fav (<1.50, -8%).

Ce script produit un fichier compact (`segment_trust.json`, ~3 KB) que
legacy-app.js peut lire pour annoter chaque pick avec la performance
historique de son segment. L'utilisateur voit alors :
  ✓ "Segment validé +7% (74 paris)" → confiance ↑
  ⚠ "Segment instable -10% (21 paris)" → mise prudente
  ⛔ "Segment perdant -13% (24 paris)" → recommandé skip

Sortie : `segment_trust.json` à la racine.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKTEST = ROOT / "backtest_report_v2.json"
OUT = ROOT / "segment_trust.json"

# Seuils trust en % (ROI flat). On ne distingue pas EV : ROI capture déjà
# la combinaison edge × calibration × variance.
TRUST_TIERS = [
    ("high", 5.0, "Segment validé"),
    ("good", 1.0, "Segment positif"),
    ("neutral", -1.0, "Segment neutre"),
    ("warn", -5.0, "Segment instable"),
    ("low", float("-inf"), "Segment perdant"),
]
MIN_N_TRUSTED = 10  # En dessous, segment marqué "uncertain"


def trust_for(roi_pct: float, n: int) -> tuple[str, str]:
    if not isinstance(n, int) or n < MIN_N_TRUSTED:
        return "uncertain", "Échantillon trop faible"
    if not isinstance(roi_pct, (int, float)):
        return "uncertain", "ROI non chiffré"
    for tier, threshold, label in TRUST_TIERS:
        if roi_pct >= threshold:
            return tier, label
    return "low", "Segment perdant"


def compact(d: dict, keys=("n", "win_rate", "flat_roi_pct")) -> dict:
    out = {}
    for k in keys:
        v = d.get(k)
        if isinstance(v, float):
            out[k] = round(v, 4)
        elif v is not None:
            out[k] = v
    tier, label = trust_for(d.get("flat_roi_pct") or 0, d.get("n") or 0)
    out["trust"] = tier
    out["trust_label"] = label
    return out


def main() -> int:
    if not BACKTEST.exists():
        print(f"[segment-trust] {BACKTEST.name} not found, skipping", file=sys.stderr)
        return 0
    data = json.loads(BACKTEST.read_text(encoding="utf-8"))

    overall = data.get("overall") or {}
    baselines = data.get("baselines") or {}
    by_sport = data.get("by_sport") or {}
    by_league = data.get("by_league") or {}
    by_cote = data.get("by_cote_bucket") or {}
    by_tier = data.get("by_tier") or {}
    by_calib = data.get("by_calibration_group") or {}
    by_calib_market = data.get("by_calibration_market_group") or {}

    out = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "backtest_generated_at": data.get("generated_at"),
        "n_events": data.get("n_events"),
        "date_range": data.get("date_range"),
        "min_n_trusted": MIN_N_TRUSTED,
        "global": {
            "n": overall.get("n"),
            "win_rate": round(overall.get("win_rate") or 0, 4),
            "flat_roi_pct": round(overall.get("flat_roi_pct") or 0, 2),
            "avg_edge_pct": round(overall.get("avg_edge_pct") or 0, 2),
            "avg_ev_pct": round(overall.get("avg_ev_pct") or 0, 2),
            "brier": round(overall.get("brier") or 0, 4),
            "baseline_always_fav_roi_pct": round(
                ((baselines.get("always_fav") or {}).get("flat_roi_pct") or 0), 2
            ),
        },
        "by_sport": {
            sport: compact(stats)
            for sport, stats in by_sport.items()
            if isinstance(stats, dict) and stats.get("n")
        },
        "by_league": {
            lg: compact(stats)
            for lg, stats in by_league.items()
            if isinstance(stats, dict) and (stats.get("n") or 0) >= 5
        },
        "by_cote_bucket": {
            bucket: compact(stats)
            for bucket, stats in by_cote.items()
            if isinstance(stats, dict) and stats.get("n")
        },
        "by_tier": {
            tier: compact(stats)
            for tier, stats in by_tier.items()
            if isinstance(stats, dict) and stats.get("n")
        },
        "by_calibration_group": {
            grp: compact(stats)
            for grp, stats in by_calib.items()
            if isinstance(stats, dict) and stats.get("n")
        },
        "by_calibration_market_group": {
            grp: compact(stats)
            for grp, stats in by_calib_market.items()
            if isinstance(stats, dict) and stats.get("n")
        },
    }

    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    n_segments = sum(
        len(out[k]) for k in (
            "by_sport", "by_league", "by_cote_bucket", "by_tier",
            "by_calibration_group", "by_calibration_market_group",
        )
    )
    size_kb = OUT.stat().st_size / 1024
    print(f"[segment-trust] OK {n_segments} segments, {size_kb:.1f} KB", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

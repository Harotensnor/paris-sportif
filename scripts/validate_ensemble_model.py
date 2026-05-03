#!/usr/bin/env python3
"""Validate the production ensemble model against historical outcomes.

This is intentionally a *measurement* script, not another model copy. It
loads the real frontend `predictMatch` through `model_loader.py`, evaluates
resolved matches, and compares the ensemble probability with the component
signals exposed in `pred.ensemble.sub_models`.

Outputs:
  - ensemble_validation.json : machine-readable audit
  - ensemble_validation.md   : short human-readable summary

The script is kept out of the 5-minute workflow because `model_loader.py`
depends on py_mini_racer, which is useful locally/backtest-side but not part
of the lightweight GitHub refresh dependency set.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from backtest_v2 import (  # noqa: E402
    brier_score,
    load_odds_history,
    load_pronostics_data,
    load_results_archive,
    resolve_outcome,
)
from model_loader import ModelLoader  # noqa: E402

OUT_JSON = ROOT / "ensemble_validation.json"
OUT_MD = ROOT / "ensemble_validation.md"


def _iter_resolved_candidates(pron_data: dict, odds_hist: dict, archive: list[dict]):
    seen_ids: set[str] = set()
    for _day, events in (pron_data.get("days") or {}).items():
        for ev in events or []:
            if not ev.get("completed"):
                continue
            outcome = resolve_outcome(ev)
            if outcome is None:
                continue
            mid = str(ev.get("id") or "")
            has_odds = bool(ev.get("odds")) or bool(ev.get("odds_snapshot")) or mid in odds_hist
            if not has_odds:
                continue
            if mid:
                seen_ids.add(mid)
            yield ev, outcome
    for ev in archive:
        mid = str(ev.get("id") or "")
        if not mid or mid in seen_ids:
            continue
        outcome = resolve_outcome(ev)
        if outcome is None:
            continue
        has_odds = bool(ev.get("odds")) or bool(ev.get("odds_snapshot")) or mid in odds_hist
        if not has_odds:
            continue
        seen_ids.add(mid)
        yield ev, outcome


def _iter_upcoming_events(pron_data: dict):
    now = datetime.now(timezone.utc)
    for _day, events in (pron_data.get("days") or {}).items():
        for ev in events or []:
            if ev.get("completed"):
                continue
            date_raw = ev.get("date") or ""
            try:
                kickoff = datetime.fromisoformat(date_raw.replace("Z", "+00:00"))
            except ValueError:
                kickoff = None
            if kickoff and kickoff < now:
                continue
            if not (ev.get("odds") or ev.get("odds_snapshot") or ev.get("winamax")):
                continue
            yield ev


def _round(v, ndigits=4):
    if v is None:
        return None
    try:
        if math.isnan(v):
            return None
    except TypeError:
        pass
    return round(float(v), ndigits)


def _summarize_numbers(values: list[float]) -> dict:
    if not values:
        return {"n": 0, "avg": None, "p95": None, "max": None}
    ordered = sorted(values)
    p95_idx = min(len(ordered) - 1, int(len(ordered) * 0.95))
    return {
        "n": len(values),
        "avg": _round(mean(values), 4),
        "p95": _round(ordered[p95_idx], 4),
        "max": _round(ordered[-1], 4),
    }


def _component_rows(pred: dict, won: bool):
    ensemble = pred.get("ensemble") or {}
    sub_models = ensemble.get("sub_models") or []
    actual = 1 if won else 0
    for sub in sub_models:
        prob = sub.get("pick_prob")
        if prob is None:
            continue
        kind = sub.get("kind") or "signal"
        yield {
            "kind": kind,
            "weight": float(sub.get("weight") or 0),
            "brier": brier_score(float(prob), actual),
        }


def _pick_odd(pred: dict) -> float | None:
    key = (pred.get("pick") or {}).get("key")
    odds = pred.get("odds") or {}
    field = {"1": "home", "X": "draw", "2": "away"}.get(key)
    if not field:
        return None
    try:
        odd = float(odds.get(field) or 0)
    except (TypeError, ValueError):
        return None
    return odd if odd > 1 else None


def _v36_tier_info(pred: dict) -> tuple[str, bool]:
    """Local audit tiering aligned with the V36 dashboard placement.

    V36 intentionally has two levels:
    - soft placement thresholds, to give Theo all-day coverage;
    - strict flags, to mark picks that fully satisfy the original confidence
      and edge promise.
    """
    odd = _pick_odd(pred)
    if not odd:
        return "unpriced", False
    conf = float(pred.get("reliability") or (pred.get("pick") or {}).get("prob") or 0)
    edge = conf - (1.0 / odd)
    if 1.30 <= odd < 1.50 and conf >= 0.66 and edge >= -0.04:
        return "tier1_sur", conf >= 0.75 and edge >= -0.015
    if 1.50 <= odd < 2.00 and conf >= 0.56 and edge >= -0.03:
        return "tier2_solide", conf >= 0.65 and edge >= -0.005
    if 2.00 <= odd < 3.00 and edge >= 0 and conf >= 0.42:
        return "tier3_valeur", edge >= 0.05
    if 3.00 <= odd < 5.00 and edge >= 0.02 and conf >= 0.28:
        return "tier4_big_odds", edge >= 0.08
    if odd >= 5.00 and edge >= 0.04 and conf >= 0.14:
        return "tier5_outsider", edge >= 0.10
    return "opportunity_other", False


def _classify_v36_tier(pred: dict) -> str:
    return _v36_tier_info(pred)[0]


def run_validation(limit: int = 0, current_limit: int = 0) -> dict:
    pron_data = load_pronostics_data()
    odds_hist = load_odds_history()
    archive = load_results_archive()
    loader = ModelLoader()
    loader.set_data(pron_data, odds_history=odds_hist)

    side_key_map = {"1": "home", "X": "draw", "2": "away"}
    historical_rows = []
    kind_rows: dict[str, list[dict]] = defaultdict(list)
    variances = []
    component_counts = []
    effective_weights: dict[str, list[float]] = defaultdict(list)
    top_disagreements = []
    missing_ensemble = 0
    historical_tiers = Counter()
    historical_strict_tiers = Counter()

    candidates = list(_iter_resolved_candidates(pron_data, odds_hist, archive))
    if limit and limit > 0:
        candidates = candidates[:limit]

    for ev, outcome in candidates:
        pred = loader.predict(ev)
        if not pred:
            continue
        pick = pred.get("pick") or {}
        pick_key = pick.get("key")
        side = side_key_map.get(pick_key)
        if not side:
            continue
        won = side == outcome
        final_prob = float((pred.get("ensemble") or {}).get("final_prob") or pick.get("prob") or 0)
        if not final_prob:
            continue
        ens = pred.get("ensemble") or {}
        sub_models = ens.get("sub_models") or []
        if not sub_models:
            missing_ensemble += 1
        variance = float(ens.get("agreement_variance") or 0)
        variances.append(variance)
        component_counts.append(len(sub_models))
        actual = 1 if won else 0
        final_brier = brier_score(final_prob, actual)
        row = {
            "id": ev.get("id"),
            "name": ev.get("name"),
            "sport": ev.get("sport"),
            "league_code": ev.get("league_code"),
            "pick": pick.get("label"),
            "pick_key": pick_key,
            "won": won,
            "final_prob": final_prob,
            "final_brier": final_brier,
            "variance": variance,
            "component_count": len(sub_models),
        }
        tier_name, tier_strict = _v36_tier_info(pred)
        historical_tiers[tier_name] += 1
        if tier_strict:
            historical_strict_tiers[tier_name] += 1
        historical_rows.append(row)
        if variance:
            top_disagreements.append({
                **{k: row[k] for k in ["id", "name", "sport", "pick", "final_prob", "variance", "component_count"]},
                "sub_models": [
                    {
                        "name": sub.get("name"),
                        "kind": sub.get("kind"),
                        "weight": sub.get("weight"),
                        "pick_prob": sub.get("pick_prob"),
                    }
                    for sub in sub_models
                ],
            })
        for comp in _component_rows(pred, won):
            comp["final_brier"] = final_brier
            kind_rows[comp["kind"]].append(comp)
            effective_weights[comp["kind"]].append(comp["weight"])

    current_events = list(_iter_upcoming_events(pron_data))
    if current_limit and current_limit > 0:
        current_events = current_events[:current_limit]
    current_variances = []
    current_components = []
    current_tiers = Counter()
    current_strict_tiers = Counter()
    current_kinds = Counter()
    current_with_ensemble = 0
    current_predictions = 0
    for ev in current_events:
        pred = loader.predict(ev)
        if not pred:
            continue
        current_predictions += 1
        ens = pred.get("ensemble") or {}
        subs = ens.get("sub_models") or []
        if subs:
            current_with_ensemble += 1
        current_variances.append(float(ens.get("agreement_variance") or 0))
        current_components.append(len(subs))
        tier_name, tier_strict = _v36_tier_info(pred)
        current_tiers[tier_name] += 1
        if tier_strict:
            current_strict_tiers[tier_name] += 1
        for sub in subs:
            current_kinds[str(sub.get("kind") or "signal")] += 1

    final_briers = [r["final_brier"] for r in historical_rows]
    by_kind = {}
    warnings = []
    for kind, rows in sorted(kind_rows.items()):
        comp_briers = [r["brier"] for r in rows]
        final_same = [r["final_brier"] for r in rows]
        comp_brier = mean(comp_briers) if comp_briers else None
        final_same_brier = mean(final_same) if final_same else None
        delta = (comp_brier - final_same_brier) if comp_brier is not None and final_same_brier is not None else None
        by_kind[kind] = {
            "n": len(rows),
            "avg_weight": _round(mean(effective_weights[kind]), 3) if effective_weights[kind] else None,
            "component_brier": _round(comp_brier, 4),
            "ensemble_brier_same_rows": _round(final_same_brier, 4),
            "component_minus_ensemble_brier": _round(delta, 4),
        }
        if len(rows) >= 30 and delta is not None and delta < -0.01:
            warnings.append({
                "type": "component_beats_ensemble",
                "kind": kind,
                "message": f"{kind} bat l'ensemble de {abs(delta):.3f} Brier sur {len(rows)} observations.",
            })

    declared_weights = {}
    for disagreement in top_disagreements:
        # The first prediction with ensemble contains the declared weights.
        pred = loader.predict(next(ev for ev, _outcome in candidates if str(ev.get("id")) == str(disagreement["id"])))
        declared_weights = (pred.get("ensemble") or {}).get("weights") or {}
        break

    top_disagreements = sorted(top_disagreements, key=lambda r: r["variance"], reverse=True)[:12]
    high_disagreement = sum(1 for v in variances if v > 0.15)

    current_tier_counts = dict(current_tiers)
    qualified_current = sum(
        n for k, n in current_tier_counts.items()
        if k not in {"opportunity_other", "unpriced"}
    )
    strict_current = sum(current_strict_tiers.values())
    coverage_warnings = []
    if current_predictions >= 50 and qualified_current < 25:
        coverage_warnings.append({
            "type": "v36_tier_coverage_low",
            "message": (
                f"Seulement {qualified_current} picks passent les seuils de placement V36 "
                f"sur {current_predictions} predictions courantes; objectif produit 25-40."
            ),
        })

    all_warnings = warnings + coverage_warnings
    result = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "schema": "ensemble_validation_v1",
        "status": "warning" if all_warnings else "ok",
        "historical": {
            "resolved_candidates": len(candidates),
            "predictions": len(historical_rows),
            "with_ensemble": len(historical_rows) - missing_ensemble,
            "missing_ensemble": missing_ensemble,
            "final_brier": _round(mean(final_briers), 4) if final_briers else None,
            "random_50_brier": 0.25,
            "final_vs_random_brier": _round((mean(final_briers) - 0.25), 4) if final_briers else None,
            "component_counts": _summarize_numbers(component_counts),
            "agreement_variance": _summarize_numbers(variances),
            "high_disagreement_gt_015": high_disagreement,
            "by_kind": by_kind,
            "v36_tier_counts": dict(historical_tiers),
            "v36_strict_tier_counts": dict(historical_strict_tiers),
            "declared_weights": declared_weights,
            "top_disagreements": top_disagreements,
        },
        "current_snapshot": {
            "upcoming_events_checked": len(current_events),
            "predictions": current_predictions,
            "with_ensemble": current_with_ensemble,
            "component_counts": _summarize_numbers(current_components),
            "agreement_variance": _summarize_numbers(current_variances),
            "v36_tier_counts": current_tier_counts,
            "v36_qualified_tier_picks": qualified_current,
            "v36_strict_tier_picks": strict_current,
            "v36_strict_tier_counts": dict(current_strict_tiers),
            "kind_counts": dict(current_kinds),
        },
        "warnings": all_warnings,
    }
    return result


def render_markdown(report: dict) -> str:
    hist = report.get("historical") or {}
    cur = report.get("current_snapshot") or {}
    lines = [
        "# Ensemble Model Validation",
        "",
        f"- Generated: `{report.get('generated_at')}`",
        f"- Status: **{report.get('status')}**",
        f"- Historical predictions: **{hist.get('predictions')} / {hist.get('resolved_candidates')}**",
        f"- Ensemble Brier: **{hist.get('final_brier')}** vs random 0.2500",
        f"- High disagreement (>0.15 variance): **{hist.get('high_disagreement_gt_015')}**",
        f"- Current upcoming checked: **{cur.get('upcoming_events_checked')}**, predictions **{cur.get('predictions')}**",
        "",
        "## Component Comparison",
        "",
        "| Kind | N | Avg weight | Component Brier | Ensemble same rows | Δ component-ensemble |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for kind, row in (hist.get("by_kind") or {}).items():
        lines.append(
            f"| {kind} | {row.get('n')} | {row.get('avg_weight')} | "
            f"{row.get('component_brier')} | {row.get('ensemble_brier_same_rows')} | "
            f"{row.get('component_minus_ensemble_brier')} |"
        )
    lines.extend(["", "## Warnings", ""])
    warnings = report.get("warnings") or []
    if warnings:
        for warning in warnings:
            lines.append(f"- `{warning.get('type')}`: {warning.get('message')}")
    else:
        lines.append("- Aucun sous-modele ne bat l'ensemble de plus de 0.010 Brier sur un sample >=30.")
    lines.extend(["", "## Current Snapshot", ""])
    lines.append(f"- Component counts: `{cur.get('component_counts')}`")
    lines.append(f"- Variance: `{cur.get('agreement_variance')}`")
    lines.append(f"- V36 tier counts: `{cur.get('v36_tier_counts')}`")
    lines.append(f"- V36 qualified tier picks: **{cur.get('v36_qualified_tier_picks')}**")
    lines.append(f"- V36 strict tier picks: **{cur.get('v36_strict_tier_picks')}**")
    return "\n".join(lines) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="Limit historical resolved candidates")
    ap.add_argument("--current-limit", type=int, default=0, help="Limit upcoming production snapshot")
    opts = ap.parse_args()

    report = run_validation(limit=opts.limit, current_limit=opts.current_limit)
    OUT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_MD.write_text(render_markdown(report), encoding="utf-8")
    hist = report.get("historical") or {}
    print(
        f"[ensemble] {report['status']} · {hist.get('predictions')} predictions · "
        f"Brier {hist.get('final_brier')} · warnings={len(report.get('warnings') or [])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

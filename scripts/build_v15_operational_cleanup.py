#!/usr/bin/env python3
"""Build V15 operational cleanup reports.

V15 is a decision-clarity layer. It does not fetch data and it does not
release bets. It turns the large V14/V13 diagnostic surface into a short
action cockpit: ready now, final T-10 required, price watch, repair source,
or reject.
"""
from __future__ import annotations

import csv
import io
import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from _data_io import write_text_atomic


ROOT = Path(__file__).resolve().parents[1]
EXPORTS = ROOT / "exports"

OUT_ACTION = ROOT / "v15_action_cockpit_report.json"
OUT_READINESS = ROOT / "v15_bet_readiness_report.json"
OUT_HEALTH = ROOT / "v15_health_noise_report.json"
OUT_SOURCE = ROOT / "v15_source_fix_plan.json"
OUT_CLEANUP = ROOT / "v15_cleanup_safety_report.json"
OUT_CONTROL = ROOT / "v15_control_room_report.json"

EXPORT_ACTION = EXPORTS / "v15_action_cockpit.csv"
EXPORT_READINESS = EXPORTS / "v15_bet_readiness.csv"
EXPORT_HEALTH = EXPORTS / "v15_health_noise.csv"
EXPORT_SOURCE = EXPORTS / "v15_source_fix_plan.csv"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def read_json(name: str, fallback: Any) -> Any:
    path = ROOT / name
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
        return parsed if parsed is not None else fallback
    except Exception:
        return fallback


def write_json(path: Path, payload: dict[str, Any]) -> None:
    write_text_atomic(path, json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def write_csv(path: Path, rows: list[dict[str, Any]], headers: list[str]) -> None:
    EXPORTS.mkdir(exist_ok=True)
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=headers, extrasaction="ignore", lineterminator="\n")
    writer.writeheader()
    for row in rows:
        writer.writerow({key: row.get(key, "") for key in headers})
    write_text_atomic(path, buf.getvalue(), encoding="utf-8")


def number(value: Any, default: float = 0.0) -> float:
    try:
        parsed = float(value)
        return parsed if math.isfinite(parsed) else default
    except Exception:
        return default


def text(value: Any) -> str:
    return str(value or "").strip()


def minutes_to_label(value: Any) -> str:
    minutes = number(value, -1)
    if minutes < 0:
        return "inconnu"
    if minutes < 60:
        return f"{int(minutes)} min"
    hours = minutes / 60
    if hours < 48:
        return f"{hours:.1f} h"
    return f"{hours / 24:.1f} j"


def parse_dt(value: Any) -> datetime | None:
    raw = text(value)
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return None


def is_expired_kickoff(kickoff: Any, generated: str) -> bool:
    ko = parse_dt(kickoff)
    now = parse_dt(generated)
    return bool(ko and now and ko <= now)


def classify_price_row(row: dict[str, Any]) -> tuple[str, str, str, int]:
    status = text(row.get("status"))
    current = number(row.get("current_odd"))
    min_odd = number(row.get("min_odd"))
    clv_status = text(row.get("clv_status")).lower()
    action = text(row.get("action"))
    reason = text(row.get("reason"))

    if status == "bettable_now":
        return "ready_now", "Jouer maintenant", reason or "Tous les gates sont verts.", 0
    if status == "one_tick_away":
        if current > 1 and min_odd > 1 and current >= min_odd:
            return "needs_t10", "Finaliser T-10", "Prix minimum atteint, validation finale requise.", 5
        return "one_tick_price", "Rechecker prix", "Encore proche du prix minimum.", 5
    if status == "wait_better_price":
        return "price_watch", "Attendre meilleure cote", reason or "Cote sous le minimum acceptable.", 15
    if status == "price_drifting_away":
        return "price_watch", "Rechecker prix", reason or "La cote s'éloigne du prix cible.", 10
    if status == "market_hostile" or clv_status == "hostile":
        return "reject_market", "Écarter", reason or "Marché ou CLV hostile.", 30
    if status in {"hard_skip", "expired_or_kickoff_too_close"}:
        return "hard_skip", "Écarter", reason or "Cote, timing ou modèle incompatible.", 30
    if action.lower().startswith("réparer"):
        return "source_repair", "Réparer contexte", reason or "Donnée locale à réparer.", 20
    return "watch", action or "Surveiller", reason or "Décision incomplète.", 20


def build_action_reports(generated: str) -> tuple[dict[str, Any], dict[str, Any]]:
    price = read_json("v14_price_action_report.json", {})
    rows = price.get("rows") if isinstance(price.get("rows"), list) else []
    out: list[dict[str, Any]] = []
    for row in rows:
        if is_expired_kickoff(row.get("kickoff"), generated):
            v15_status, action, reason, recheck = (
                "hard_skip",
                "Écarter",
                "Coup d’envoi passé : aucun ticket action/prix ne doit rester actif.",
                30,
            )
        else:
            v15_status, action, reason, recheck = classify_price_row(row)
        can_bet = v15_status == "ready_now"
        out.append({
            "match_id": row.get("match_id"),
            "match": row.get("match"),
            "sport": row.get("sport"),
            "league": row.get("league"),
            "kickoff": row.get("kickoff"),
            "market": row.get("market"),
            "pick": row.get("pick"),
            "v14_status": row.get("status"),
            "v15_status": v15_status,
            "can_bet": can_bet,
            "stake": row.get("stake") if can_bet else "0 €",
            "current_odd": row.get("current_odd"),
            "min_odd": row.get("min_odd"),
            "target_odd": row.get("target_odd"),
            "best_seen_odd": row.get("best_seen_odd"),
            "distance_to_target_pct": row.get("distance_to_target_pct"),
            "clv_status": row.get("clv_status"),
            "next_action": action,
            "recheck_in_min": recheck,
            "primary_reason": reason,
        })
    order = {
        "ready_now": 0,
        "needs_t10": 1,
        "one_tick_price": 2,
        "price_watch": 3,
        "source_repair": 4,
        "reject_market": 5,
        "hard_skip": 6,
        "watch": 7,
    }
    out.sort(key=lambda row: (
        order.get(text(row.get("v15_status")), 99),
        number(row.get("distance_to_target_pct"), 999),
        text(row.get("kickoff")),
    ))
    counts = Counter(row["v15_status"] for row in out)
    ready_now = counts.get("ready_now", 0)
    action_report = {
        "schema": "paris-sportif.v15.action_cockpit.v1",
        "generated_at": generated,
        "summary": {
            "candidates": len(out),
            "ready_now": ready_now,
            "needs_t10": counts.get("needs_t10", 0),
            "one_tick_price": counts.get("one_tick_price", 0),
            "price_watch": counts.get("price_watch", 0),
            "source_repair": counts.get("source_repair", 0),
            "reject_market": counts.get("reject_market", 0),
            "hard_skip": counts.get("hard_skip", 0),
            "watch": counts.get("watch", 0),
            "stake_zero_for_non_ready": all(row["stake"] == "0 €" for row in out if not row["can_bet"]),
            "message": "Aucun pari à jouer maintenant" if ready_now == 0 else f"{ready_now} pari(s) prêt(s)",
            "first_action": "Finaliser T-10" if counts.get("needs_t10", 0) else "Rechecker prix" if counts.get("price_watch", 0) else "Réparer contexte",
        },
        "rows": out,
    }
    readiness_rows: list[dict[str, Any]] = []
    for row in out:
        status = text(row.get("v15_status"))
        missing: list[str] = []
        if status == "needs_t10":
            missing.append("validation T-10")
        if status in {"one_tick_price", "price_watch"}:
            missing.append("cote minimum ou cible")
        if status == "source_repair":
            missing.append("source contexte")
        if status in {"reject_market", "hard_skip"}:
            missing.append("garde-fou définitif ou marché hostile")
        readiness_rows.append({
            "match_id": row.get("match_id"),
            "match": row.get("match"),
            "market": row.get("market"),
            "pick": row.get("pick"),
            "status": status,
            "can_unlock_locally": status in {"needs_t10", "source_repair", "one_tick_price", "price_watch"},
            "missing": ", ".join(missing) if missing else "aucun",
            "next_action": row.get("next_action"),
            "reason": row.get("primary_reason"),
            "stake": row.get("stake"),
        })
    readiness = {
        "schema": "paris-sportif.v15.bet_readiness.v1",
        "generated_at": generated,
        "summary": {
            "rows": len(readiness_rows),
            "unlockable_locally": sum(1 for row in readiness_rows if row["can_unlock_locally"]),
            "ready_now": ready_now,
            "message": "Chaque candidat a une action de déblocage ou d'écartement.",
        },
        "rows": readiness_rows,
    }
    return action_report, readiness


def warning_category(raw: str) -> tuple[str, str, str]:
    lower = raw.lower()
    source = raw.split(":", 1)[0] if ":" in raw else raw.split(" ", 1)[0]
    if "pipeline_drift" in lower:
        return "workflow_drift", source, "Dette pipeline locale/GitHub : à garder dans Avancé tant que le logiciel local reste cohérent."
    if any(token in lower for token in ["xg_decay_params", "goalie_pitcher_context"]):
        return "research_debt", source, "Donnée recherche ancienne : masquer du cockpit si elle ne change pas une mise."
    if any(token in lower for token in ["winamax", "weather", "lineups", "injuries", "h2h", "clubelo", "team_form", "prebet", "context"]):
        return "decision_relevant", source, "Relancer le refresh ciblé ou garder le gate bloqué."
    if any(token in lower for token in ["thesportsdb", "openligadb", "token", "optional", "unavailable", "empty"]):
        return "optional_or_external", source, "Source optionnelle ou externe : ne pas la compter comme bug logiciel."
    if any(token in lower for token in ["season_phase", "star_players", "coach", "derbies", "stadium", "player_props", "corners", "cards", "fouls", "model_", "backtest_training_rows"]):
        return "research_debt", source, "Donnée recherche ancienne : masquer du cockpit si elle ne change pas une mise."
    return "background_noise", source, "À garder dans Avancé, pas dans le cockpit principal."


def build_health_report(generated: str) -> tuple[dict[str, Any], dict[str, Any]]:
    health = read_json("health.json", {})
    warnings = health.get("warnings") if isinstance(health.get("warnings"), list) else []
    rows: list[dict[str, Any]] = []
    by_category: Counter[str] = Counter()
    for warning in warnings:
        raw = text(warning)
        category, source, action = warning_category(raw)
        by_category[category] += 1
        rows.append({
            "category": category,
            "source": source,
            "warning": raw,
            "decision_impact": "fort" if category == "decision_blocking" else "moyen" if category == "decision_relevant" else "faible",
            "action": action,
        })
    priority_rows = [row for row in rows if row["category"] in {"decision_blocking", "decision_relevant"}]
    health_report = {
        "schema": "paris-sportif.v15.health_noise.v1",
        "generated_at": generated,
        "summary": {
            "warnings": len(rows),
            "decision_blocking": by_category.get("decision_blocking", 0),
            "decision_relevant": by_category.get("decision_relevant", 0),
            "workflow_drift": by_category.get("workflow_drift", 0),
            "optional_or_external": by_category.get("optional_or_external", 0),
            "research_debt": by_category.get("research_debt", 0),
            "background_noise": by_category.get("background_noise", 0),
            "message": "Warnings séparés entre impact pari et bruit technique.",
        },
        "rows": rows,
        "priority_rows": priority_rows[:30],
    }
    source_plan_rows: list[dict[str, Any]] = []
    source_actions = {
        "clubelo": ("signals", "clubelo", "Force équipe/Elo stale"),
        "team_form": ("signals", "team_form", "Forme équipe stale"),
        "form_stats_extended": ("signals", "team_form", "Splits/forme étendue stale"),
        "injuries_soccer": ("repair_context", "injuries", "Blessures foot"),
        "injuries_multisport": ("repair_context", "injuries", "Blessures multi-sport"),
        "lineups_soccer": ("repair_context", "lineups", "Compos foot"),
        "weather": ("signals", "weather", "Météo"),
        "h2h_extended": ("signals", "h2h", "Historique H2H"),
        "footballdata": ("signals", "team_stats", "Historique résultats/cotes"),
    }
    seen: set[str] = set()
    for row in priority_rows:
        source = text(row.get("source"))
        if source in seen:
            continue
        seen.add(source)
        mode, refresh_source, label = source_actions.get(source, ("v15_audit", "all", source or "source"))
        source_plan_rows.append({
            "source": source,
            "label": label,
            "priority": "critical" if row["category"] == "decision_blocking" else "high",
            "mode": mode,
            "refresh_source": refresh_source,
            "reason": row.get("warning"),
            "expected_impact": "peut changer un gate de pari" if row["category"] != "research_debt" else "diagnostic seulement",
        })
    source_plan = {
        "schema": "paris-sportif.v15.source_fix_plan.v1",
        "generated_at": generated,
        "summary": {
            "actions": len(source_plan_rows),
            "critical": sum(1 for row in source_plan_rows if row["priority"] == "critical"),
            "high": sum(1 for row in source_plan_rows if row["priority"] == "high"),
            "first": source_plan_rows[0]["label"] if source_plan_rows else "Aucune source bloquante",
        },
        "rows": source_plan_rows,
    }
    return health_report, source_plan


def build_cleanup_report(generated: str) -> dict[str, Any]:
    file_audit = read_json("v14_file_audit_report.json", {})
    rows = file_audit.get("rows") if isinstance(file_audit.get("rows"), list) else []
    delete_safe = [row for row in rows if row.get("status") == "delete_safe"]
    uncertain = [row for row in rows if row.get("status") == "uncertain"]
    return {
        "schema": "paris-sportif.v15.cleanup_safety.v1",
        "generated_at": generated,
        "summary": {
            "delete_safe": len(delete_safe),
            "uncertain": len(uncertain),
            "safe_to_auto_delete": len(delete_safe),
            "message": "Nettoyage limité aux temporaires prouvés ; les fichiers incertains restent protégés.",
        },
        "delete_safe": delete_safe[:80],
        "uncertain_sample": uncertain[:80],
    }


def build_control(generated: str, action: dict[str, Any], health: dict[str, Any], source: dict[str, Any], cleanup: dict[str, Any]) -> dict[str, Any]:
    action_summary = action.get("summary", {})
    health_summary = health.get("summary", {})
    source_summary = source.get("summary", {})
    cleanup_summary = cleanup.get("summary", {})
    cards = [
        {
            "key": "ready",
            "tone": "ok" if action_summary.get("ready_now", 0) else "warn",
            "title": "Paris prêts",
            "value": str(action_summary.get("ready_now", 0)),
            "detail": action_summary.get("message"),
            "mode": "v15_audit",
        },
        {
            "key": "t10",
            "tone": "warn" if action_summary.get("needs_t10", 0) else "ok",
            "title": "Prix OK, T-10 requis",
            "value": str(action_summary.get("needs_t10", 0)),
            "detail": "Finaliser seulement près du coup d'envoi.",
            "mode": "v13_t10_resolve",
        },
        {
            "key": "price",
            "tone": "warn" if action_summary.get("price_watch", 0) or action_summary.get("one_tick_price", 0) else "ok",
            "title": "Prix à surveiller",
            "value": str(action_summary.get("price_watch", 0) + action_summary.get("one_tick_price", 0)),
            "detail": f"{action_summary.get('reject_market', 0)} marché(s) hostiles.",
            "mode": "v13_price_alerts",
        },
        {
            "key": "health",
            "tone": "danger" if health_summary.get("decision_blocking", 0) else "warn" if health_summary.get("decision_relevant", 0) else "ok",
            "title": "Santé utile",
            "value": f"{health_summary.get('decision_blocking', 0)} bloquant(s)",
            "detail": f"{health_summary.get('decision_relevant', 0)} pertinent(s) · {health_summary.get('research_debt', 0)} bruit avancé.",
            "mode": "v15_fix",
        },
        {
            "key": "sources",
            "tone": "warn" if source_summary.get("actions", 0) else "ok",
            "title": "Sources à corriger",
            "value": str(source_summary.get("actions", 0)),
            "detail": f"Priorité : {source_summary.get('first')}",
            "mode": "v15_fix",
        },
        {
            "key": "cleanup",
            "tone": "warn" if cleanup_summary.get("delete_safe", 0) else "ok",
            "title": "Nettoyage sûr",
            "value": str(cleanup_summary.get("delete_safe", 0)),
            "detail": f"{cleanup_summary.get('uncertain', 0)} fichier(s) protégés.",
            "mode": "v15_audit",
        },
    ]
    return {
        "schema": "paris-sportif.v15.control_room.v1",
        "generated_at": generated,
        "summary": {
            "status": "ready" if action_summary.get("ready_now", 0) else "blocked",
            "message": action_summary.get("message", "Aucun pari à jouer maintenant"),
            "cards": len(cards),
            "next_action": action_summary.get("first_action") or source_summary.get("first") or "Rechecker prix",
        },
        "cards": cards,
    }


def main() -> int:
    generated = utc_now()
    action, readiness = build_action_reports(generated)
    health, source = build_health_report(generated)
    cleanup = build_cleanup_report(generated)
    control = build_control(generated, action, health, source, cleanup)
    for path, payload in [
        (OUT_ACTION, action),
        (OUT_READINESS, readiness),
        (OUT_HEALTH, health),
        (OUT_SOURCE, source),
        (OUT_CLEANUP, cleanup),
        (OUT_CONTROL, control),
    ]:
        write_json(path, payload)
    write_csv(EXPORT_ACTION, action["rows"], ["match", "sport", "league", "kickoff", "market", "pick", "v14_status", "v15_status", "can_bet", "stake", "current_odd", "min_odd", "target_odd", "best_seen_odd", "distance_to_target_pct", "clv_status", "next_action", "recheck_in_min", "primary_reason"])
    write_csv(EXPORT_READINESS, readiness["rows"], ["match_id", "match", "market", "pick", "status", "can_unlock_locally", "missing", "next_action", "reason", "stake"])
    write_csv(EXPORT_HEALTH, health["rows"], ["category", "source", "warning", "decision_impact", "action"])
    write_csv(EXPORT_SOURCE, source["rows"], ["source", "label", "priority", "mode", "refresh_source", "reason", "expected_impact"])
    print(
        "[v15_operational_cleanup] "
        f"ready={action['summary']['ready_now']} t10={action['summary']['needs_t10']} "
        f"health_blocking={health['summary']['decision_blocking']} source_actions={source['summary']['actions']}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

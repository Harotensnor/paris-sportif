#!/usr/bin/env python3
"""Build V16 final decision reports.

V16 is the last-mile decision layer. It does not invent bets. It takes the
V15 action cockpit and turns every candidate into a final user action:
ready now, final T-10, wait price, repair source, or reject.
"""
from __future__ import annotations

import csv
import io
import json
import math
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from _data_io import write_text_atomic


ROOT = Path(__file__).resolve().parents[1]
EXPORTS = ROOT / "exports"

OUT_SOURCE_REFRESH = ROOT / "v16_source_refresh_report.json"
OUT_SOURCE_DELTA = ROOT / "v16_source_delta_report.json"
OUT_T10_DECISION = ROOT / "v16_t10_decision_report.json"
OUT_CANDIDATE_RESOLUTION = ROOT / "v16_candidate_resolution_report.json"
OUT_FINAL_TICKET = ROOT / "v16_final_ticket.json"
OUT_AGENT_GATE = ROOT / "v16_agent_gate_report.json"
OUT_CONTROL = ROOT / "v16_control_room_report.json"

EXPORT_FINAL = EXPORTS / "v16_final_ticket.csv"
EXPORT_WAIT_T10 = EXPORTS / "v16_wait_t10.csv"
EXPORT_WAIT_PRICE = EXPORTS / "v16_wait_price.csv"
EXPORT_REJECTED = EXPORTS / "v16_rejected.csv"


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


def text(value: Any) -> str:
    return str(value or "").strip()


def number(value: Any, default: float = 0.0) -> float:
    try:
        parsed = float(value)
        return parsed if math.isfinite(parsed) else default
    except Exception:
        return default


def parse_dt(value: Any) -> datetime | None:
    raw = text(value)
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return None


def minutes_until(value: Any, generated: str) -> int | None:
    kickoff = parse_dt(value)
    now = parse_dt(generated)
    if not kickoff or not now:
        return None
    return int(round((kickoff - now).total_seconds() / 60))


def iso_at(value: Any, minutes_before: int = 10) -> str:
    kickoff = parse_dt(value)
    if not kickoff:
        return ""
    return (kickoff - timedelta(minutes=minutes_before)).isoformat().replace("+00:00", "Z")


def t10_window(minutes_to_kickoff: int | None) -> str:
    if minutes_to_kickoff is None:
        return "unknown"
    if minutes_to_kickoff <= 0:
        return "expired"
    if minutes_to_kickoff <= 10:
        return "final_window"
    if minutes_to_kickoff <= 70:
        return "due_now"
    return "not_due_yet"


def price_gap_pct(row: dict[str, Any]) -> float | None:
    current = number(row.get("current_odd"), 0)
    minimum = number(row.get("min_odd"), 0)
    if current <= 0 or minimum <= 0:
        return None
    return round(((current - minimum) / minimum) * 100, 2)


def price_gate(row: dict[str, Any]) -> str:
    current = number(row.get("current_odd"), 0)
    minimum = number(row.get("min_odd"), 0)
    if current <= 1 or minimum <= 1:
        return "missing_price"
    if current >= minimum:
        return "price_ok"
    gap = abs(((current - minimum) / minimum) * 100)
    return "near_price" if gap <= 3 else "wait_price"


def source_age(source: str, health: dict[str, Any]) -> Any:
    sources = health.get("sources") if isinstance(health.get("sources"), dict) else {}
    aliases = {
        "injuries": "injuries_soccer",
        "lineups": "lineups_soccer",
        "h2h": "h2h_extended",
        "team_form": "team_form",
        "weather": "weather",
        "team_stats": "team_stats",
        "clubelo": "clubelo",
    }
    key = aliases.get(source, source)
    row = sources.get(key) if isinstance(sources, dict) else None
    return row.get("age_min") if isinstance(row, dict) else None


def build_source_reports(generated: str) -> tuple[dict[str, Any], dict[str, Any]]:
    source_plan = read_json("v15_source_fix_plan.json", {})
    health = read_json("health.json", {})
    rows = source_plan.get("rows") if isinstance(source_plan.get("rows"), list) else []
    out: list[dict[str, Any]] = []
    for row in rows:
        refresh_source = text(row.get("refresh_source") or row.get("source"))
        age = source_age(refresh_source, health)
        out.append({
            "source": row.get("source"),
            "label": row.get("label") or row.get("source"),
            "priority": row.get("priority") or "high",
            "mode": row.get("mode") or "signals",
            "refresh_source": refresh_source,
            "age_min": age if age is not None else "",
            "reason": row.get("reason") or "Source utile à rafraîchir.",
            "expected_impact": row.get("expected_impact") or "peut changer un gate de pari",
            "action": "Rafraîchir source",
        })
    report = {
        "schema": "paris-sportif.v16.source_refresh.v1",
        "generated_at": generated,
        "summary": {
            "actions": len(out),
            "critical": sum(1 for row in out if row["priority"] == "critical"),
            "high": sum(1 for row in out if row["priority"] == "high"),
            "first": out[0]["label"] if out else "Aucune source utile à corriger",
            "message": "Sources utiles séparées du bruit technique.",
        },
        "rows": out,
    }
    delta = {
        "schema": "paris-sportif.v16.source_delta.v1",
        "generated_at": generated,
        "summary": {
            "sources_checked": len(out),
            "stale_or_due": len(out),
            "fresh_after_last_run": sum(1 for row in out if isinstance(row.get("age_min"), (int, float)) and number(row.get("age_min")) <= 60),
            "message": "Delta basé sur les derniers JSON valides ; le prochain refresh V16 mettra à jour les âges.",
        },
        "rows": out,
    }
    return report, delta


def first_blocker(prebet_summary: dict[str, Any], prematch_summary: dict[str, Any], health_blocking: int, window: str) -> tuple[str, str, str, str]:
    if health_blocking:
        return "health", "Alerte décisionnelle bloquante", "v15_fix", "all"
    if not prebet_summary.get("ready_to_bet"):
        first = text(prebet_summary.get("first")) or "Checklist avant mise rouge"
        mode = "v16_source_refresh"
        source = "all"
        first_lower = first.lower()
        if "file critique" in first_lower or "contexte" in first_lower or "source" in first_lower:
            mode = "v16_source_refresh"
        elif "t-10" in first_lower or "pré-match" in first_lower:
            mode = "v16_t10_final"
        return "prebet", first, mode, source
    if window == "not_due_yet":
        return "not_due_yet", "Le match n’est pas encore dans la fenêtre T-10.", "v16_finalize", "all"
    if window == "expired":
        return "expired", "Coup d’envoi passé ou trop proche : ne pas forcer.", "v16_finalize", "all"
    if text(prematch_summary.get("final_gate")).lower() != "ready":
        first = text(prematch_summary.get("first_step")) or "Pré-match final incomplet"
        return "prematch", first, "prematch", "all"
    return "", "", "v16_finalize", "all"


def action_for_blocker(blocker: str, window: str) -> str:
    if blocker == "not_due_yet":
        return "Attendre T-10"
    if blocker == "prebet":
        return "Corriger checklist"
    if blocker == "prematch":
        return "Lancer pré-match"
    if blocker == "health":
        return "Corriger santé"
    if blocker == "expired":
        return "Écarter"
    if window in {"due_now", "final_window", "unknown"}:
        return "Finaliser T-10"
    return "Attendre T-10"


def final_status_for(row: dict[str, Any], prebet_summary: dict[str, Any], prematch_summary: dict[str, Any], health_blocking: int, window: str) -> tuple[str, str, str, str, str, str]:
    prebet_ready = bool(prebet_summary.get("ready_to_bet"))
    prematch_ready = text(prematch_summary.get("final_gate")).lower() == "ready"
    status = text(row.get("v15_status"))
    if window == "expired":
        return "hard_skip", "Écarter", "Coup d’envoi passé : ticket retiré du flux actionnable.", "expired", "v16_finalize", "all"
    if status == "ready_now":
        blocker, detail, mode, source = first_blocker(prebet_summary, prematch_summary, health_blocking, window)
        if prebet_ready and prematch_ready and health_blocking == 0 and window in {"due_now", "final_window", "unknown"}:
            return "ready_now", "Jouer maintenant", "Tous les gates V16 sont verts.", "", "v16_finalize", "all"
        action = action_for_blocker(blocker, window)
        window_note = " Fenêtre T-10 pas encore ouverte." if window == "not_due_yet" else ""
        return "wait_t10", action, f"Prix OK, mais {detail.lower()}.{window_note}", blocker, mode, source
    if status == "needs_t10":
        blocker, detail, mode, source = first_blocker(prebet_summary, prematch_summary, health_blocking, window)
        action = action_for_blocker(blocker, window)
        reason = text(row.get("primary_reason")) or "Prix minimum atteint, validation finale requise."
        if blocker:
            reason = f"{reason} Blocage actuel : {detail}."
        if window == "not_due_yet":
            reason = f"{reason} Fenêtre T-10 pas encore ouverte."
        return "wait_t10", action, reason, blocker or "t10", mode, source
    if status in {"one_tick_price", "price_watch"}:
        return "wait_price", "Rechecker prix", text(row.get("primary_reason")) or "Attendre une meilleure cote.", "price", "v13_price_alerts", "all"
    if status == "source_repair":
        return "repair_source", "Réparer source", text(row.get("primary_reason")) or "Source contexte à rafraîchir.", "source", "v16_source_refresh", "all"
    if status == "reject_market":
        return "market_hostile", "Écarter", text(row.get("primary_reason")) or "Marché ou CLV hostile.", "market", "v16_finalize", "all"
    if status == "hard_skip":
        return "hard_skip", "Écarter", text(row.get("primary_reason")) or "Cote, Kelly, edge ou modèle incompatible.", "model", "v16_finalize", "all"
    return "wait_price", "Surveiller", text(row.get("primary_reason")) or "Décision incomplète.", "unknown", "v16_finalize", "all"


def build_candidate_reports(generated: str) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any]]:
    v15 = read_json("v15_action_cockpit_report.json", {})
    prebet = read_json("prebet_checklist_report.json", {})
    prematch = read_json("prematch_execution_plan.json", {})
    health_noise = read_json("v15_health_noise_report.json", {})
    rows = v15.get("rows") if isinstance(v15.get("rows"), list) else []
    prebet_summary = prebet.get("summary") if isinstance(prebet.get("summary"), dict) else {}
    prematch_summary = prematch.get("summary") if isinstance(prematch.get("summary"), dict) else {}
    health_summary = health_noise.get("summary") if isinstance(health_noise.get("summary"), dict) else {}
    prebet_ready = bool(prebet_summary.get("ready_to_bet"))
    prematch_ready = text(prematch_summary.get("final_gate")).lower() == "ready"
    health_blocking = int(number(health_summary.get("decision_blocking"), 0))

    out: list[dict[str, Any]] = []
    for row in rows:
        mins = minutes_until(row.get("kickoff"), generated)
        window = t10_window(mins)
        status, action, reason, blocker, action_mode, action_source = final_status_for(row, prebet_summary, prematch_summary, health_blocking, window)
        can_bet = status == "ready_now"
        stake = row.get("stake") if can_bet else "0 €"
        gate = "" if can_bet else (blocker or status)
        p_gate = price_gate(row)
        gap = price_gap_pct(row)
        out.append({
            "match_id": row.get("match_id"),
            "match": row.get("match"),
            "sport": row.get("sport"),
            "league": row.get("league"),
            "kickoff": row.get("kickoff"),
            "market": row.get("market"),
            "pick": row.get("pick"),
            "v15_status": row.get("v15_status"),
            "v16_status": status,
            "can_bet": can_bet,
            "stake": stake,
            "current_odd": row.get("current_odd"),
            "min_odd": row.get("min_odd"),
            "target_odd": row.get("target_odd"),
            "clv_status": row.get("clv_status"),
            "price_gate": p_gate,
            "price_gap_pct": gap if gap is not None else "",
            "minutes_to_kickoff": mins if mins is not None else "",
            "t10_window": window,
            "next_action": action,
            "action_mode": action_mode,
            "action_source": action_source,
            "recheck_in_min": row.get("recheck_in_min") if status == "wait_price" else (max(5, min(60, (mins or 70) - 10)) if window == "not_due_yet" else 5),
            "recheck_at": iso_at(row.get("kickoff"), 10) if status == "wait_t10" else "",
            "reason": reason,
            "blocking_gate": gate,
            "blocker_detail": reason,
        })

    order = {
        "ready_now": 0,
        "wait_t10": 1,
        "wait_price": 2,
        "repair_source": 3,
        "market_hostile": 4,
        "hard_skip": 5,
    }
    out.sort(key=lambda row: (order.get(text(row.get("v16_status")), 99), text(row.get("kickoff")), text(row.get("match"))))
    counts = Counter(row["v16_status"] for row in out)
    ready = counts.get("ready_now", 0)
    t10_windows = Counter(text(row.get("t10_window")) for row in out if row.get("v16_status") == "wait_t10")
    gate_counts = Counter(text(row.get("blocking_gate")) for row in out if not row.get("can_bet"))
    primary_action = next(
        (
            text(row.get("next_action"))
            for row in out
            if text(row.get("next_action")) and text(row.get("next_action")) not in {"Jouer maintenant", "Écarter"}
        ),
        "",
    )
    summary = {
        "candidates": len(out),
        "ready_now": ready,
        "wait_t10": counts.get("wait_t10", 0),
        "wait_price": counts.get("wait_price", 0),
        "repair_source": counts.get("repair_source", 0),
        "market_hostile": counts.get("market_hostile", 0),
        "hard_skip": counts.get("hard_skip", 0),
        "stake_zero_for_non_ready": all(row["stake"] == "0 €" for row in out if not row["can_bet"]),
        "message": "Aucun pari à jouer maintenant" if ready == 0 else f"{ready} pari(s) prêt(s)",
        "next_action": primary_action or ("Finaliser T-10" if counts.get("wait_t10", 0) else "Rechecker prix" if counts.get("wait_price", 0) else "Réparer source"),
        "prebet_ready": prebet_ready,
        "prematch_ready": prematch_ready,
        "health_blocking": health_blocking,
        "t10_due_now": t10_windows.get("due_now", 0) + t10_windows.get("final_window", 0),
        "t10_not_due_yet": t10_windows.get("not_due_yet", 0),
        "blocking_gates": dict(gate_counts),
    }
    candidate_resolution = {
        "schema": "paris-sportif.v16.candidate_resolution.v1",
        "generated_at": generated,
        "summary": summary,
        "rows": out,
    }
    t10_rows = [row for row in out if row["v16_status"] in {"ready_now", "wait_t10"}]
    t10_decision = {
        "schema": "paris-sportif.v16.t10_decision.v1",
        "generated_at": generated,
        "summary": {
            "candidates": len(t10_rows),
            "ready_now": counts.get("ready_now", 0),
            "wait_t10": counts.get("wait_t10", 0),
            "due_now": t10_windows.get("due_now", 0) + t10_windows.get("final_window", 0),
            "not_due_yet": t10_windows.get("not_due_yet", 0),
            "blocked_prebet": gate_counts.get("prebet", 0),
            "blocked_prematch": gate_counts.get("prematch", 0),
            "final_gate": "ready" if ready else "blocked",
            "message": (
                "Checklist avant mise rouge : corriger avant T-10."
                if gate_counts.get("prebet", 0)
                else "T-10 pas encore dû : attendre la fenêtre finale."
                if t10_windows.get("not_due_yet", 0) and not (t10_windows.get("due_now", 0) + t10_windows.get("final_window", 0))
                else "T-10 doit encore trancher les candidats prix OK." if counts.get("wait_t10", 0) else summary["message"]
            ),
        },
        "rows": t10_rows,
    }
    final_ticket = {
        "schema": "paris-sportif.v16.final_ticket.v1",
        "generated_at": generated,
        "summary": {
            **summary,
            "ticket_status": "ready" if ready else "no_bet_now",
            "agent_allowed": ready > 0 and prebet_ready and prematch_ready and health_blocking == 0,
        },
        "rows": out,
    }
    agent_allowed = bool(final_ticket["summary"]["agent_allowed"])
    agent_gate = {
        "schema": "paris-sportif.v16.agent_gate.v1",
        "generated_at": generated,
        "summary": {
            "status": "ready" if agent_allowed else "blocked",
            "agent_allowed": agent_allowed,
            "ready_now": ready,
            "reason": "Ticket V16 prêt." if agent_allowed else summary["message"],
            "blocking_gate": "" if agent_allowed else summary["next_action"],
        },
        "rows": [row for row in out if row["v16_status"] == "ready_now"],
    }
    return candidate_resolution, t10_decision, final_ticket, agent_gate


def build_control(generated: str, ticket: dict[str, Any], source_report: dict[str, Any]) -> dict[str, Any]:
    summary = ticket.get("summary", {})
    source_summary = source_report.get("summary", {})
    cards = [
        {
            "key": "ready",
            "tone": "ok" if summary.get("ready_now", 0) else "warn",
            "title": "À jouer maintenant",
            "value": str(summary.get("ready_now", 0)),
            "detail": summary.get("message"),
            "mode": "v16_finalize",
        },
        {
            "key": "t10",
            "tone": "warn" if summary.get("wait_t10", 0) else "ok",
            "title": "T-10 utile",
            "value": str(summary.get("wait_t10", 0)),
            "detail": f"{summary.get('t10_due_now', 0)} à finaliser maintenant · {summary.get('t10_not_due_yet', 0)} à attendre.",
            "mode": "v16_t10_final",
        },
        {
            "key": "price",
            "tone": "watch" if summary.get("wait_price", 0) else "ok",
            "title": "À attendre prix",
            "value": str(summary.get("wait_price", 0)),
            "detail": f"{summary.get('market_hostile', 0)} marché(s) hostile(s).",
            "mode": "v13_price_alerts",
        },
        {
            "key": "sources",
            "tone": "warn" if source_summary.get("actions", 0) else "ok",
            "title": "Sources utiles",
            "value": str(source_summary.get("actions", 0)),
            "detail": f"Priorité : {source_summary.get('first')}",
            "mode": "v16_source_refresh",
        },
        {
            "key": "rejected",
            "tone": "danger" if summary.get("hard_skip", 0) else "warn",
            "title": "Écartés",
            "value": str(summary.get("market_hostile", 0) + summary.get("hard_skip", 0)),
            "detail": "Marché hostile ou garde-fou modèle.",
            "mode": "v16_finalize",
        },
    ]
    return {
        "schema": "paris-sportif.v16.control_room.v1",
        "generated_at": generated,
        "summary": {
            "status": "ready" if summary.get("ready_now", 0) else "blocked",
            "message": summary.get("message", "Aucun pari à jouer maintenant"),
            "next_action": summary.get("next_action", "Finaliser T-10"),
            "cards": len(cards),
        },
        "cards": cards,
    }


def main() -> int:
    generated = utc_now()
    source_report, source_delta = build_source_reports(generated)
    candidate_resolution, t10_decision, final_ticket, agent_gate = build_candidate_reports(generated)
    control = build_control(generated, final_ticket, source_report)

    for path, payload in [
        (OUT_SOURCE_REFRESH, source_report),
        (OUT_SOURCE_DELTA, source_delta),
        (OUT_T10_DECISION, t10_decision),
        (OUT_CANDIDATE_RESOLUTION, candidate_resolution),
        (OUT_FINAL_TICKET, final_ticket),
        (OUT_AGENT_GATE, agent_gate),
        (OUT_CONTROL, control),
    ]:
        write_json(path, payload)

    headers = ["match", "sport", "league", "kickoff", "market", "pick", "v16_status", "can_bet", "stake", "current_odd", "min_odd", "target_odd", "price_gate", "price_gap_pct", "clv_status", "minutes_to_kickoff", "t10_window", "next_action", "action_mode", "recheck_in_min", "recheck_at", "reason", "blocking_gate", "blocker_detail"]
    rows = final_ticket["rows"]
    write_csv(EXPORT_FINAL, rows, headers)
    write_csv(EXPORT_WAIT_T10, [row for row in rows if row["v16_status"] == "wait_t10"], headers)
    write_csv(EXPORT_WAIT_PRICE, [row for row in rows if row["v16_status"] == "wait_price"], headers)
    write_csv(EXPORT_REJECTED, [row for row in rows if row["v16_status"] in {"market_hostile", "hard_skip"}], headers)

    summary = final_ticket["summary"]
    print(
        "[v16_final_decision] "
        f"ready={summary['ready_now']} wait_t10={summary['wait_t10']} "
        f"wait_price={summary['wait_price']} rejected={summary['market_hostile'] + summary['hard_skip']} "
        f"agent={agent_gate['summary']['status']}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

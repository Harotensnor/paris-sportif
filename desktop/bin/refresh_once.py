#!/usr/bin/env python3
"""Refresh local data once for the desktop application.

This is intentionally smaller than auto_refresh.py: the desktop app needs a
predictable "refresh now" button, not an endless loop. The canonical GitHub
Actions order is still respected for the files this first desktop version
needs: live events, Winamax mapping, market patches, health, and lightweight
data exports.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path


PROJECT = Path(__file__).resolve().parents[2]
SCRIPTS = PROJECT / "scripts"
STATE_ROOT = PROJECT / "desktop" / "state"
REFRESH_HISTORY_PATH = STATE_ROOT / "refresh-history.json"
REFRESH_RUNNING_PATH = STATE_ROOT / "refresh-running.json"
CONTEXT_REPAIR_PLAN = PROJECT / "context_repair_plan.json"
SOURCE_RUNS_PATH = PROJECT / "source_runs.jsonl"
WEATHER_TIMEOUT_SEC = 180


@dataclass
class Stage:
    script: str
    timeout: int = 60
    args: list[str] = field(default_factory=list)
    env: dict[str, str] = field(default_factory=dict)
    required: bool = False


DECISION_STACK_STAGES = [
    Stage("build_v6_decision_terminal.py", 30),
    Stage("build_v7_actionability.py", 30),
    Stage("build_v8_decision_cockpit.py", 30),
    Stage("build_v9_operational_readiness.py", 30),
    Stage("build_v10_finalizer.py", 30),
    Stage("build_v11_finalizer.py", 30),
    Stage("build_v12_price_watch.py", 30),
    Stage("build_v13_price_alerts.py", 30),
    Stage("build_v14_quality_audit.py", 45),
    Stage("build_v15_operational_cleanup.py", 30),
    Stage("build_v16_final_decision.py", 30),
]

PUBLIC_CONTEXT_FETCH_STAGE = Stage(
    "fetch_public_match_signals.py",
    180,
    ["--limit", "120", "--include-past-minutes", "1440", "--player-limit", "180"],
    {"PUBLIC_SOURCE_MIN_INTERVAL": "0.18"},
)
PUBLIC_CONTEXT_PATCH_STAGE = Stage("patch_public_match_signals.py", 45)
PUBLIC_CONTEXT_STAGES = [
    PUBLIC_CONTEXT_FETCH_STAGE,
    PUBLIC_CONTEXT_PATCH_STAGE,
]


QUICK_STAGES = [
    Stage("fetch_live.py", 60),
    Stage("fetch_sofascore_events.py", 90),
    Stage("fetch_winamax_catalog.py", 90),
    Stage("patch_odds.py", 60),
    Stage("snapshot_odds.py", 45),
    Stage("snapshot_results.py", 45),
    Stage("patch_sofascore_events.py", 45),
    Stage("patch_sofascore_league_codes.py", 30),
    Stage("patch_winamax.py", 45),
    Stage("patch_winamax_markets.py", 60),
    Stage(
        "fetch_winamax_match_details.py",
        180,
        ["--limit", "250", "--ttl-hours", "0.5", "--horizon-days", "14"],
        {
            "WINAMAX_DETAILS_CAP": "250",
            "WINAMAX_DETAILS_SLEEP": "0.10",
            "WINAMAX_DETAILS_TTL_HOURS": "0.5",
            "WINAMAX_DETAILS_HORIZON_DAYS": "14",
        },
    ),
    Stage("patch_winamax_markets.py", 60),
    Stage("patch_all_quick.py", 60),
    Stage("patch_tennis_features.py", 60),
    Stage("patch_smart_money.py", 30),
    *PUBLIC_CONTEXT_STAGES,
    Stage("build_lineups_multisport.py", 45),
    Stage("build_xg_coverage.py", 30),
    Stage("fetch_match_previews.py", 60),
    Stage("build_league_bias_audit.py", 45),
    Stage("build_betting_intelligence.py", 90),
    Stage("build_market_auc.py", 60),
    Stage("build_team_priors.py", 90),
    Stage("build_match_context.py", 60),
    Stage("build_team_identity_graph.py", 30),
    Stage("build_picks_history.py", 60),
    Stage("settle_picks.py", 30),
    Stage("build_context_backtest.py", 45),
    Stage("build_decision_backtest.py", 45),
    Stage("compute_clv.py", 45),
    Stage("build_decision_tuning.py", 30),
    Stage("build_signal_conflict_backtest.py", 30),
    Stage("build_decision_shadow.py", 30),
    Stage("build_odds_guardrails.py", 30),
    Stage("build_agent_blocker_backtest.py", 30),
    Stage("build_agent_guardrail_recommendations.py", 30),
    Stage("build_stake_reduction_backtest.py", 30),
    Stage("build_scorer_quality.py", 30),
    Stage("archive_scorer_candidates.py", 30),
    Stage("settle_scorer_candidates.py", 30),
    Stage("build_scorer_pending_audit.py", 30),
    Stage("build_prematch_focus.py", 30),
    Stage("build_prematch_execution_plan.py", 30),
    Stage("build_signal_coverage_trend.py", 30),
    Stage("build_next_actions.py", 30),
    Stage("build_source_freshness_plan.py", 30),
    Stage("build_context_repair_plan.py", 30),
    Stage("build_refresh_priority_plan.py", 30),
    Stage("build_prebet_checklist.py", 30),
    Stage("build_prebet_checklist_backtest.py", 30),
    Stage("build_agent_bankroll_simulation.py", 30),
    Stage("build_match_decision_timeline.py", 30),
    Stage("build_smart_prepare_plan.py", 30),
    Stage("build_source_registry.py", 30),
    Stage("build_optional_sources_plan.py", 30),
    *DECISION_STACK_STAGES,
    Stage("build_v4_audit_reports.py", 30),
    Stage("build_decision_exports.py", 30),
    Stage("build_health.py", 30),
    Stage("build_daily_insights.py", 30),
    Stage("finalize_inline.py", 45, required=True),
    Stage("check_pipeline_freshness.py", 30),
]

FULL_EXTRA_STAGES = [
    Stage("fetch_v3.py", 360, required=True),
    Stage("fetch_clubelo.py", 90),
    Stage("fetch_weather.py", WEATHER_TIMEOUT_SEC),
    Stage("fetch_referees_soccer.py", 90),
    Stage("fetch_injuries_soccer.py", 210),
    Stage("fetch_lineups_soccer.py", 210),
    Stage("fetch_team_form.py", 150),
    Stage("fetch_understat_xg.py", 180),
    Stage("fetch_team_stats.py", 360),
    Stage("fetch_tennis_odds.py", 90),
    Stage("fetch_tennis_sackmann.py", 180),
    Stage("fetch_h2h.py", 300),
]

SIGNAL_FETCH_STAGES = [
    Stage("fetch_weather.py", WEATHER_TIMEOUT_SEC),
    Stage("fetch_referees_soccer.py", 90),
    Stage("fetch_injuries_soccer.py", 210),
    Stage("fetch_lineups_soccer.py", 210),
    Stage("fetch_team_form.py", 150),
    Stage("fetch_understat_xg.py", 180),
    Stage("fetch_team_stats.py", 360),
    Stage("fetch_tennis_sackmann.py", 180),
    Stage("fetch_h2h.py", 300),
    PUBLIC_CONTEXT_FETCH_STAGE,
]

PREMATCH_STAGES = [
    Stage("fetch_live.py", 60),
    Stage("fetch_sofascore_events.py", 90),
    Stage("fetch_winamax_catalog.py", 90),
    Stage("patch_odds.py", 60),
    Stage("snapshot_odds.py", 45),
    Stage("snapshot_results.py", 45),
    Stage("patch_sofascore_events.py", 45),
    Stage("patch_sofascore_league_codes.py", 30),
    Stage("patch_winamax.py", 45),
    Stage("patch_winamax_markets.py", 60),
    Stage(
        "fetch_winamax_match_details.py",
        150,
        ["--limit", "120", "--ttl-hours", "0", "--horizon-days", "2"],
        {
            "WINAMAX_DETAILS_CAP": "120",
            "WINAMAX_DETAILS_SLEEP": "0.08",
            "WINAMAX_DETAILS_TTL_HOURS": "0",
            "WINAMAX_DETAILS_HORIZON_DAYS": "2",
        },
    ),
    Stage("fetch_weather.py", WEATHER_TIMEOUT_SEC),
    Stage("fetch_referees_soccer.py", 90),
    Stage("fetch_injuries_soccer.py", 210),
    Stage("fetch_lineups_soccer.py", 210),
    Stage("fetch_h2h.py", 300),
    Stage("patch_winamax_markets.py", 60),
    Stage("patch_all_quick.py", 60),
    Stage("patch_tennis_features.py", 60),
    *PUBLIC_CONTEXT_STAGES,
    Stage("build_lineups_multisport.py", 45),
    Stage("build_xg_coverage.py", 30),
    Stage("fetch_match_previews.py", 60),
    Stage("build_betting_intelligence.py", 90),
    Stage("build_market_auc.py", 60),
    Stage("build_team_priors.py", 90),
    Stage("build_match_context.py", 60),
    Stage("build_team_identity_graph.py", 30),
    Stage("build_picks_history.py", 60),
    Stage("settle_picks.py", 30),
    Stage("build_context_backtest.py", 45),
    Stage("build_decision_backtest.py", 45),
    Stage("compute_clv.py", 45),
    Stage("build_decision_tuning.py", 30),
    Stage("build_signal_conflict_backtest.py", 30),
    Stage("build_decision_shadow.py", 30),
    Stage("build_odds_guardrails.py", 30),
    Stage("build_agent_blocker_backtest.py", 30),
    Stage("build_agent_guardrail_recommendations.py", 30),
    Stage("build_stake_reduction_backtest.py", 30),
    Stage("build_scorer_quality.py", 30),
    Stage("archive_scorer_candidates.py", 30),
    Stage("settle_scorer_candidates.py", 30),
    Stage("build_scorer_pending_audit.py", 30),
    Stage("build_prematch_focus.py", 30),
    Stage("build_prematch_execution_plan.py", 30),
    Stage("build_signal_coverage_trend.py", 30),
    Stage("build_next_actions.py", 30),
    Stage("build_source_freshness_plan.py", 30),
    Stage("build_context_repair_plan.py", 30),
    Stage("build_refresh_priority_plan.py", 30),
    Stage("build_prebet_checklist.py", 30),
    Stage("build_prebet_checklist_backtest.py", 30),
    Stage("build_agent_bankroll_simulation.py", 30),
    Stage("build_match_decision_timeline.py", 30),
    Stage("build_smart_prepare_plan.py", 30),
    Stage("build_source_registry.py", 30),
    Stage("build_optional_sources_plan.py", 30),
    *DECISION_STACK_STAGES,
    Stage("build_v4_audit_reports.py", 30),
    Stage("build_decision_exports.py", 30),
    Stage("build_health.py", 30),
    Stage("build_daily_insights.py", 30),
    Stage("finalize_inline.py", 45, required=True),
    Stage("check_pipeline_freshness.py", 30),
]

PREMATCH_T60_STAGES = [
    Stage("fetch_weather.py", WEATHER_TIMEOUT_SEC),
    Stage("fetch_injuries_soccer.py", 210),
    Stage("fetch_lineups_soccer.py", 210),
    Stage("fetch_h2h.py", 300),
    Stage("patch_all_quick.py", 60),
    Stage("patch_tennis_features.py", 60),
    *PUBLIC_CONTEXT_STAGES,
    Stage("build_lineups_multisport.py", 45),
    Stage("build_xg_coverage.py", 30),
    Stage("fetch_match_previews.py", 60),
    Stage("build_team_priors.py", 90),
    Stage("build_match_context.py", 60),
    Stage("build_team_identity_graph.py", 30),
    Stage("build_picks_history.py", 60),
    Stage("build_context_backtest.py", 45),
    Stage("build_decision_backtest.py", 45),
    Stage("compute_clv.py", 45),
    Stage("build_decision_tuning.py", 30),
    Stage("build_signal_conflict_backtest.py", 30),
    Stage("build_stake_reduction_backtest.py", 30),
    Stage("build_prematch_focus.py", 30),
    Stage("build_prematch_execution_plan.py", 30),
    Stage("build_source_freshness_plan.py", 30),
    Stage("build_context_repair_plan.py", 30),
    Stage("build_refresh_priority_plan.py", 30),
    Stage("build_prebet_checklist.py", 30),
    Stage("build_prebet_checklist_backtest.py", 30),
    Stage("build_agent_bankroll_simulation.py", 30),
    Stage("build_match_decision_timeline.py", 30),
    Stage("build_smart_prepare_plan.py", 30),
    Stage("build_source_registry.py", 30),
    Stage("build_optional_sources_plan.py", 30),
    *DECISION_STACK_STAGES,
    Stage("build_v4_audit_reports.py", 30),
    Stage("build_decision_exports.py", 30),
    Stage("build_health.py", 30),
    Stage("finalize_inline.py", 45, required=True),
    Stage("check_pipeline_freshness.py", 30),
]

PREMATCH_T30_STAGES = [
    Stage("fetch_live.py", 60),
    Stage("fetch_winamax_catalog.py", 90),
    Stage("patch_odds.py", 60),
    Stage("snapshot_odds.py", 45),
    Stage("snapshot_results.py", 45),
    Stage("patch_winamax.py", 45),
    Stage("patch_winamax_markets.py", 60),
    Stage(
        "fetch_winamax_match_details.py",
        120,
        ["--limit", "90", "--ttl-hours", "0", "--horizon-days", "1"],
        {
            "WINAMAX_DETAILS_CAP": "90",
            "WINAMAX_DETAILS_SLEEP": "0.08",
            "WINAMAX_DETAILS_TTL_HOURS": "0",
            "WINAMAX_DETAILS_HORIZON_DAYS": "1",
        },
    ),
    Stage("fetch_injuries_soccer.py", 210),
    Stage("fetch_lineups_soccer.py", 210),
    Stage("patch_winamax_markets.py", 60),
    Stage("patch_all_quick.py", 60),
    Stage("patch_tennis_features.py", 60),
    *PUBLIC_CONTEXT_STAGES,
    Stage("build_lineups_multisport.py", 45),
    Stage("build_xg_coverage.py", 30),
    Stage("build_match_context.py", 60),
    Stage("build_team_identity_graph.py", 30),
    Stage("build_picks_history.py", 60),
    Stage("settle_picks.py", 30),
    Stage("build_context_backtest.py", 45),
    Stage("build_decision_backtest.py", 45),
    Stage("compute_clv.py", 45),
    Stage("build_decision_tuning.py", 30),
    Stage("build_signal_conflict_backtest.py", 30),
    Stage("build_decision_shadow.py", 30),
    Stage("build_odds_guardrails.py", 30),
    Stage("build_agent_blocker_backtest.py", 30),
    Stage("build_agent_guardrail_recommendations.py", 30),
    Stage("build_stake_reduction_backtest.py", 30),
    Stage("build_prematch_focus.py", 30),
    Stage("build_prematch_execution_plan.py", 30),
    Stage("build_refresh_priority_plan.py", 30),
    Stage("build_prebet_checklist.py", 30),
    Stage("build_prebet_checklist_backtest.py", 30),
    Stage("build_agent_bankroll_simulation.py", 30),
    Stage("build_match_decision_timeline.py", 30),
    Stage("build_smart_prepare_plan.py", 30),
    Stage("build_source_registry.py", 30),
    Stage("build_optional_sources_plan.py", 30),
    *DECISION_STACK_STAGES,
    Stage("build_v4_audit_reports.py", 30),
    Stage("build_decision_exports.py", 30),
    Stage("build_health.py", 30),
    Stage("finalize_inline.py", 45, required=True),
    Stage("check_pipeline_freshness.py", 30),
]

PREMATCH_T10_STAGES = [
    Stage("fetch_live.py", 60),
    Stage("fetch_winamax_catalog.py", 90),
    Stage("patch_odds.py", 60),
    Stage("snapshot_odds.py", 45),
    Stage("snapshot_results.py", 45),
    Stage("patch_winamax.py", 45),
    Stage("patch_winamax_markets.py", 60),
    Stage(
        "fetch_winamax_match_details.py",
        90,
        ["--limit", "60", "--ttl-hours", "0", "--horizon-days", "1"],
        {
            "WINAMAX_DETAILS_CAP": "60",
            "WINAMAX_DETAILS_SLEEP": "0.06",
            "WINAMAX_DETAILS_TTL_HOURS": "0",
            "WINAMAX_DETAILS_HORIZON_DAYS": "1",
        },
    ),
    Stage("fetch_injuries_soccer.py", 210),
    Stage("fetch_lineups_soccer.py", 210),
    Stage("patch_winamax_markets.py", 60),
    Stage("patch_all_quick.py", 60),
    Stage("patch_tennis_features.py", 60),
    *PUBLIC_CONTEXT_STAGES,
    Stage("build_lineups_multisport.py", 45),
    Stage("build_xg_coverage.py", 30),
    Stage("build_match_context.py", 60),
    Stage("build_team_identity_graph.py", 30),
    Stage("build_picks_history.py", 60),
    Stage("settle_picks.py", 30),
    Stage("build_context_backtest.py", 45),
    Stage("build_decision_backtest.py", 45),
    Stage("compute_clv.py", 45),
    Stage("build_decision_tuning.py", 30),
    Stage("build_signal_conflict_backtest.py", 30),
    Stage("build_odds_guardrails.py", 30),
    Stage("build_stake_reduction_backtest.py", 30),
    Stage("build_prematch_focus.py", 30),
    Stage("build_prematch_execution_plan.py", 30),
    Stage("build_refresh_priority_plan.py", 30),
    Stage("build_prebet_checklist.py", 30),
    Stage("build_prebet_checklist_backtest.py", 30),
    Stage("build_agent_bankroll_simulation.py", 30),
    Stage("build_match_decision_timeline.py", 30),
    Stage("build_smart_prepare_plan.py", 30),
    Stage("build_source_registry.py", 30),
    Stage("build_optional_sources_plan.py", 30),
    *DECISION_STACK_STAGES,
    Stage("build_v4_audit_reports.py", 30),
    Stage("build_decision_exports.py", 30),
    Stage("build_health.py", 30),
    Stage("finalize_inline.py", 45, required=True),
    Stage("check_pipeline_freshness.py", 30),
]

SIGNAL_PATCH_STAGES = [
    Stage("patch_all_quick.py", 60),
    Stage("patch_tennis_features.py", 60),
    PUBLIC_CONTEXT_PATCH_STAGE,
    Stage("build_lineups_multisport.py", 45),
    Stage("build_xg_coverage.py", 30),
    Stage("fetch_match_previews.py", 60),
    Stage("build_league_bias_audit.py", 45),
    Stage("build_betting_intelligence.py", 90),
    Stage("build_market_auc.py", 60),
    Stage("build_team_priors.py", 90),
    Stage("build_match_context.py", 60),
    Stage("build_team_identity_graph.py", 30),
    Stage("build_picks_history.py", 60),
    Stage("build_context_backtest.py", 45),
    Stage("build_decision_backtest.py", 45),
    Stage("compute_clv.py", 45),
    Stage("build_decision_tuning.py", 30),
    Stage("build_signal_conflict_backtest.py", 30),
    Stage("build_decision_shadow.py", 30),
    Stage("build_odds_guardrails.py", 30),
    Stage("build_agent_blocker_backtest.py", 30),
    Stage("build_agent_guardrail_recommendations.py", 30),
    Stage("build_stake_reduction_backtest.py", 30),
    Stage("build_scorer_quality.py", 30),
    Stage("archive_scorer_candidates.py", 30),
    Stage("settle_scorer_candidates.py", 30),
    Stage("build_scorer_pending_audit.py", 30),
    Stage("build_prematch_focus.py", 30),
    Stage("build_prematch_execution_plan.py", 30),
    Stage("build_signal_coverage_trend.py", 30),
    Stage("build_next_actions.py", 30),
    Stage("build_source_freshness_plan.py", 30),
    Stage("build_context_repair_plan.py", 30),
    Stage("build_refresh_priority_plan.py", 30),
    Stage("build_prebet_checklist.py", 30),
    Stage("build_prebet_checklist_backtest.py", 30),
    Stage("build_agent_bankroll_simulation.py", 30),
    Stage("build_match_decision_timeline.py", 30),
    Stage("build_smart_prepare_plan.py", 30),
    Stage("build_source_registry.py", 30),
    Stage("build_optional_sources_plan.py", 30),
    *DECISION_STACK_STAGES,
    Stage("build_v4_audit_reports.py", 30),
    Stage("build_decision_exports.py", 30),
    Stage("build_health.py", 30),
    Stage("build_daily_insights.py", 30),
    Stage("finalize_inline.py", 45, required=True),
    Stage("check_pipeline_freshness.py", 30),
]

SIGNAL_SOURCE_ALIASES = {
    "all": "all",
    "weather": "weather",
    "referees": "referees",
    "referees_soccer": "referees",
    "injuries": "injuries",
    "injuries_soccer": "injuries",
    "lineups": "lineups",
    "lineups_soccer": "lineups",
    "team-form": "team_form",
    "team_form": "team_form",
    "team-stats": "team_stats",
    "team_stats": "team_stats",
    "clubelo": "clubelo",
    "xg": "team_stats",
    "xg_team_stats": "team_stats",
    "fbref_xg": "team_stats",
    "h2h": "h2h",
    "tennis": "tennis",
    "tennis_features": "tennis",
    "public": "public",
    "public_web": "public",
    "web": "public",
    "wikipedia": "public",
    "wikidata": "public",
    "context": "context",
    "match_context": "context",
}

SIGNAL_FETCH_BY_SOURCE = {
    "all": SIGNAL_FETCH_STAGES,
    "weather": [Stage("fetch_weather.py", WEATHER_TIMEOUT_SEC)],
    "referees": [Stage("fetch_referees_soccer.py", 90)],
    "injuries": [Stage("fetch_injuries_soccer.py", 210)],
    "lineups": [Stage("fetch_lineups_soccer.py", 210)],
    "team_form": [Stage("fetch_team_form.py", 150)],
    "team_stats": [Stage("fetch_understat_xg.py", 180), Stage("fetch_team_stats.py", 360)],
    "tennis": [Stage("fetch_tennis_sackmann.py", 180), Stage("fetch_tennis_odds.py", 90)],
    "clubelo": [Stage("fetch_clubelo.py", 90)],
    "h2h": [Stage("fetch_h2h.py", 300)],
    "public": [PUBLIC_CONTEXT_FETCH_STAGE],
    "context": [],
}


def signal_stages_for(source: str) -> tuple[str, list[Stage]]:
    normalized = SIGNAL_SOURCE_ALIASES.get(source, "all")
    return normalized, [*SIGNAL_FETCH_BY_SOURCE[normalized], *SIGNAL_PATCH_STAGES]


def _stage_key(stage: Stage) -> tuple[str, tuple[str, ...]]:
    return stage.script, tuple(stage.args)


def dedupe_stages(stages: list[Stage]) -> list[Stage]:
    seen: set[tuple[str, tuple[str, ...]]] = set()
    out: list[Stage] = []
    for stage in stages:
        key = _stage_key(stage)
        if key in seen:
            continue
        seen.add(key)
        out.append(stage)
    return out


TERMINAL_STAGE_SCRIPTS = {
    "build_decision_exports.py",
    "build_health.py",
    "build_daily_insights.py",
    "finalize_inline.py",
    "check_pipeline_freshness.py",
}


def context_repair_sources(limit: int = 3) -> list[str]:
    try:
        report = json.loads(CONTEXT_REPAIR_PLAN.read_text(encoding="utf-8"))
    except Exception:
        return ["context"]
    queue = report.get("queue") if isinstance(report, dict) and isinstance(report.get("queue"), list) else []
    rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    rows = sorted(queue, key=lambda row: (
        rank.get(str((row or {}).get("priority") or ""), 9),
        -int((row or {}).get("repair_score") or 0),
        -int((row or {}).get("match_count") or 0),
    ))
    sources: list[str] = []
    for row in rows:
        source = SIGNAL_SOURCE_ALIASES.get(str((row or {}).get("source") or "context"), "context")
        if source == "all":
            source = "context"
        if source not in sources:
            sources.append(source)
        if len(sources) >= limit:
            break
    return sources or ["context"]


def context_repair_stages() -> tuple[list[str], list[Stage]]:
    sources = context_repair_sources()
    fetch_stages: list[Stage] = []
    for source in sources:
        if source == "context":
            continue
        fetch_stages.extend(SIGNAL_FETCH_BY_SOURCE.get(source, []))
    stages = [
        *dedupe_stages(fetch_stages),
        *SIGNAL_PATCH_STAGES,
    ]
    return sources, dedupe_stages(stages)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def load_refresh_history() -> dict:
    if not REFRESH_HISTORY_PATH.exists():
        return {"lastByMode": {}, "history": []}
    try:
        raw = json.loads(REFRESH_HISTORY_PATH.read_text(encoding="utf-8"))
        return {
            "lastByMode": raw.get("lastByMode") if isinstance(raw.get("lastByMode"), dict) else {},
            "history": raw.get("history") if isinstance(raw.get("history"), list) else [],
        }
    except Exception:
        return {"lastByMode": {}, "history": []}


def persist_refresh_summary(summary: dict) -> None:
    try:
        STATE_ROOT.mkdir(parents=True, exist_ok=True)
        stored = load_refresh_history()
        mode = summary.get("mode") or "quick"
        source = summary.get("source")
        last_by_mode = stored.get("lastByMode") or {}
        last_by_mode[mode] = summary
        if mode == "signals" and source and source != "all":
            last_by_mode[f"signals:{source}"] = summary
        history = [summary, *(stored.get("history") or [])][:20]
        payload = {
            "updatedAt": utc_now(),
            "lastByMode": last_by_mode,
            "history": history,
        }
        tmp = REFRESH_HISTORY_PATH.with_suffix(f".json.{os.getpid()}.tmp")
        tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(REFRESH_HISTORY_PATH)
        with SOURCE_RUNS_PATH.open("a", encoding="utf-8") as fh:
            for stage in summary.get("stages") or []:
                if not isinstance(stage, dict):
                    continue
                fh.write(json.dumps({
                    "runStartedAt": summary.get("startedAt"),
                    "finishedAt": summary.get("finishedAt"),
                    "mode": summary.get("mode"),
                    "source": summary.get("source"),
                    "script": stage.get("script"),
                    "status": stage.get("status"),
                    "exitCode": stage.get("exitCode"),
                    "durationSec": stage.get("durationSec"),
                    "required": stage.get("required"),
                }, ensure_ascii=False, separators=(",", ":")) + "\n")
    except Exception as exc:
        print(f"[desktop-refresh] historique refresh non ecrit: {exc}", flush=True)


def write_refresh_running(mode: str, source: str | None, stage_count: int, started_at: str) -> None:
    try:
        STATE_ROOT.mkdir(parents=True, exist_ok=True)
        payload = {
            "schema": "paris-sportif.refresh_running.v1",
            "pid": os.getpid(),
            "mode": mode,
            "source": source,
            "startedAt": started_at,
            "stageCount": stage_count,
        }
        tmp = REFRESH_RUNNING_PATH.with_suffix(f".json.{os.getpid()}.tmp")
        tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(REFRESH_RUNNING_PATH)
    except Exception as exc:
        print(f"[desktop-refresh] verrou refresh non ecrit: {exc}", flush=True)


def clear_refresh_running() -> None:
    try:
        REFRESH_RUNNING_PATH.unlink(missing_ok=True)
    except Exception as exc:
        print(f"[desktop-refresh] verrou refresh non efface: {exc}", flush=True)


def stage_result(stage: Stage, started_at: str, elapsed: float, status: str, code: int | None, output: list[str] | None = None) -> dict:
    return {
        "script": stage.script,
        "args": stage.args,
        "timeoutSec": stage.timeout,
        "required": stage.required,
        "startedAt": started_at,
        "durationSec": round(elapsed, 2),
        "status": status,
        "exitCode": code,
        "ok": status == "ok",
        "outputTail": (output or [])[-8:],
    }


def run_stage(stage: Stage) -> tuple[int, dict]:
    started_iso = utc_now()
    started = time.time()
    path = SCRIPTS / stage.script
    if not path.exists():
        msg = f"[skip] {stage.script} absent"
        print(msg, flush=True)
        rc = 1 if stage.required else 0
        return rc, stage_result(stage, started_iso, time.time() - started, "missing", rc, [msg])

    env = os.environ.copy()
    env["PYTHONWARNINGS"] = "ignore::DeprecationWarning"
    env.update(stage.env)
    command = [sys.executable, str(path), *stage.args]
    print(f"[run] {stage.script}", flush=True)
    try:
        proc = subprocess.run(
            command,
            cwd=PROJECT,
            env=env,
            capture_output=True,
            text=True,
            timeout=stage.timeout,
        )
    except subprocess.TimeoutExpired:
        print(f"[timeout] {stage.script} > {stage.timeout}s", flush=True)
        rc = 1 if stage.required else 0
        return rc, stage_result(stage, started_iso, time.time() - started, "timeout", rc, [f"timeout > {stage.timeout}s"])

    elapsed = time.time() - started
    output = visible_output_lines((proc.stdout + proc.stderr).strip().splitlines())
    for line in output[-8:]:
        print(f"  {line}", flush=True)
    status = "ok" if proc.returncode == 0 else "warn"
    print(f"[{status}] {stage.script} code={proc.returncode} {elapsed:.1f}s", flush=True)
    result_status = "ok" if proc.returncode == 0 else ("failed" if stage.required else "warn")
    result = stage_result(stage, started_iso, elapsed, result_status, proc.returncode, output)
    if proc.returncode != 0 and stage.required:
        return proc.returncode, result
    return 0, result


def visible_output_lines(lines: list[str]) -> list[str]:
    """Hide known noisy, non-fatal provider/runtime chatter from desktop logs."""
    cleaned: list[str] = []
    for line in lines:
        text = line.strip()
        if not text:
            continue
        if "DeprecationWarning" in text:
            continue
        if text.startswith("HTTP 400 on https://site.api.espn.com/apis/site/v2/sports/"):
            continue
        if "HTTP 400 on https://sports.core.api.espn.com/" in text:
            continue
        cleaned.append(text)
    return cleaned


def print_dry_run(stages: list[Stage]) -> None:
    total_timeout = sum(stage.timeout for stage in stages)
    print(
        f"[desktop-refresh] dry-run: {len(stages)} etapes, timeout max {total_timeout}s",
        flush=True,
    )
    for index, stage in enumerate(stages, start=1):
        args = f" {' '.join(stage.args)}" if stage.args else ""
        required = "required" if stage.required else "optional"
        print(
            f"[dry-run] {index:02d}. {stage.script}{args} timeout={stage.timeout}s {required}",
            flush=True,
        )


def main() -> int:
    parser = argparse.ArgumentParser(description="Refresh Paris-Sportif desktop data once.")
    parser.add_argument("--quick", action="store_true", help="Fast refresh for the desktop app.")
    parser.add_argument("--full", action="store_true", help="Run the heavier source refresh first.")
    parser.add_argument("--prematch", action="store_true", help="Run a focused final pre-match refresh for near kickoffs.")
    parser.add_argument("--prematch-t60", action="store_true", help="Run the T-60 semi-automatic pre-match refresh.")
    parser.add_argument("--prematch-t30", action="store_true", help="Run the T-30 semi-automatic pre-match refresh.")
    parser.add_argument("--prematch-t10", action="store_true", help="Run the T-10 final pre-bet ticket refresh.")
    parser.add_argument("--critical", action="store_true", help="Run the critical pre-bet refresh queue for imminent decisions.")
    parser.add_argument("--repair-context", action="store_true", help="Run the guided weak-context repair queue.")
    parser.add_argument("--signals", action="store_true", help="Refresh slower secondary signals, then repatch desktop data.")
    parser.add_argument("--dry-run", action="store_true", help="Print the selected refresh stages without running them.")
    parser.add_argument(
        "--signal-source",
        choices=sorted(SIGNAL_SOURCE_ALIASES),
        default="all",
        help="When --signals is used, refresh only one secondary source before repatching.",
    )
    args = parser.parse_args()

    run_started = utc_now()
    run_start_time = time.time()
    stages = []
    source = None
    mode = "quick"
    if args.critical:
        mode = "critical"
        stages.extend(PREMATCH_STAGES)
    elif args.prematch_t60:
        mode = "prematch_t60"
        stages.extend(PREMATCH_T60_STAGES)
    elif args.prematch_t30:
        mode = "prematch_t30"
        stages.extend(PREMATCH_T30_STAGES)
    elif args.prematch_t10:
        mode = "prematch_t10"
        stages.extend(PREMATCH_T10_STAGES)
    elif args.repair_context:
        mode = "repair_context"
        repair_sources, repair_stages = context_repair_stages()
        source = "+".join(repair_sources)
        stages.extend(repair_stages)
    elif args.prematch:
        mode = "prematch"
        stages.extend(PREMATCH_STAGES)
    elif args.signals or args.signal_source != "all":
        mode = "signals"
        source, source_stages = signal_stages_for(args.signal_source)
        stages.extend(source_stages)
    elif args.full:
        mode = "full"
        # Terrain fix Sprint 25:
        # fetch_v3 rewrites data.js from ESPN. If slow secondary fetches run before
        # Winamax patching and the user interrupts the refresh, the app can open a
        # fresh-but-non-actionable snapshot with 0 Winamax picks today. Build an
        # actionable Winamax snapshot immediately after fetch_v3, then enrich it.
        stages.extend(FULL_EXTRA_STAGES[:1])
        stages.extend(QUICK_STAGES)
        stages.extend(FULL_EXTRA_STAGES[1:])
        stages.extend(QUICK_STAGES)
    else:
        stages.extend(QUICK_STAGES)

    print("[desktop-refresh] depart", flush=True)
    print(f"[desktop-refresh] racine: {PROJECT}", flush=True)
    if source:
        print(f"[desktop-refresh] signaux: {source}", flush=True)
    if args.dry_run:
        print_dry_run(stages)
        return 0
    failed = 0
    results = []
    write_refresh_running(mode, source if mode in {"signals", "repair_context"} else None, len(stages), run_started)
    try:
        for stage in stages:
            rc, result = run_stage(stage)
            results.append(result)
            if rc != 0:
                failed = rc
                print(f"[desktop-refresh] arret sur etape requise: {stage.script}", flush=True)
                break
    finally:
        clear_refresh_running()

    if failed == 0:
        print("[desktop-refresh] termine", flush=True)
    persist_refresh_summary({
        "mode": mode,
        "source": source if mode in {"signals", "repair_context"} else None,
        "startedAt": run_started,
        "finishedAt": utc_now(),
        "durationSec": round(time.time() - run_start_time, 2),
        "exitCode": failed,
        "error": None if failed == 0 else "required stage failed",
        "ok": failed == 0,
        "stageCount": len(results),
        "stages": results,
    })
    return failed


if __name__ == "__main__":
    raise SystemExit(main())







#!/usr/bin/env python3
"""Generate health.json — a compact status snapshot for the data pipeline.

Runs at the end of refresh.yml (after all fetch_*.py + patch_*.py scripts).
Reports per-source freshness, item counts, and overall pipeline health.
The file is committed alongside data.js so it's served from GitHub Pages
and visible at https://harotensnor.github.io/paris-sportif/health.json.

Output schema::

    {
      "generated_at": "2026-04-25T14:32:11Z",
      "data_age_min": 3,                  // age of data.js in minutes
      "sources": {
        "winamax_catalog": {"age_min": 3,  "tournaments": 158, "matches": 612},
        "winamax_markets": {"age_min": 3,  "matches_with_odds": 542},
        "injuries_soccer": {"age_min": 47, "events": 38},
        "lineups_soccer":  {"age_min": 47, "events": 22},
        "team_stats":      {"age_min": 119, "teams": 334},
        "clubelo":         {"age_min": 240, "clubs": 1234},
        "weather":         {"age_min": 8,  "events": 64},
        "referees_soccer": {"age_min": 47, "events": 38}
      },
      "warnings": []        // populated when a source is suspiciously stale
    }

Front-end can fetch this in the background to show a discreet health
indicator (green dot if everything <30min, amber if >30min, red if >2h).
"""
from __future__ import annotations
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'health.json'
DATA_INTEGRITY_REPORT = ROOT / 'data_integrity_report.json'
SOURCE_HEALTH_REPORT = ROOT / 'source_health.json'
PIPELINE_TRACES_SUMMARY = ROOT / 'pipeline_traces_summary.json'
DATA_LINEAGE_SUMMARY = ROOT / 'data_lineage_summary.json'

# Each source : (filename, count_extractor) where count_extractor returns
# a dict of useful counts when called on the parsed JSON. None on failure.
def _count_winamax_catalog(d):
    if not isinstance(d, dict): return None
    tourns = d.get('tournaments') or []
    return {
        'tournaments': len(tourns),
        'matches': sum(len(t.get('matches') or []) for t in tourns if isinstance(t, dict)),
    }

def _count_winamax_markets(d):
    if not isinstance(d, dict): return None
    matches = d.get('matches') or {}
    detailed = sum(
        1 for v in matches.values()
        if isinstance(v, dict) and len(v.get('odds') or {}) > 1
    )
    total = len(matches)
    coverage = d.get('details_coverage') or {}
    return {
        'matches_with_odds': total,
        'matches_detailed': detailed,
        'details_ratio_pct': round(100 * detailed / total, 1) if total else 0.0,
        'last_run_delta': coverage.get('delta_matches_detailed'),
        'last_run_limit': coverage.get('last_run_limit'),
    }

def _count_events(d):
    if not isinstance(d, dict): return None
    return {'events': len(d.get('events') or {})}

def _count_injuries(d):
    """Sofascore injuries : la data est par EQUIPE (clé `teams`) avec une
    liste de joueurs blessés par équipe. v31.7.5 fix : avant on comptait
    `events` qui retournait toujours 0 (mauvaise clé)."""
    if not isinstance(d, dict): return None
    teams = d.get('teams') or {}
    total_players = sum(len(v) if isinstance(v, list) else 0 for v in teams.values())
    return {'teams': len(teams), 'players': total_players}

def _count_clubelo(d):
    if not isinstance(d, dict): return None
    return {'clubs': len(d.get('ratings') or d.get('clubs') or d)}


def _count_clv(d):
    if not isinstance(d, dict):
        return None
    s = d.get('summary') or {}
    return {
        'matches': s.get('n_matches') or 0,
        'observations': s.get('n_clv_observations') or s.get('n') or 0,
        'mean_clv_pct': s.get('mean_clv_pct') or 0,
        'positive_clv_rate': s.get('positive_clv_rate') or 0,
        'sample_status': s.get('sample_status') or 'learning',
    }

def _count_footballdata(d):
    if not isinstance(d, dict):
        return None
    matches = d.get('matches')
    rows = d.get('rows')
    league_calibration = d.get('league_calibration') or {}
    seasons = d.get('seasons_loaded') or []
    if isinstance(matches, dict):
        row_count = len(matches)
    elif isinstance(rows, list):
        row_count = len(rows)
    else:
        row_count = 0
    return {
        'rows': row_count,
        'matches': len(matches) if isinstance(matches, dict) else 0,
        'leagues': len(league_calibration) if isinstance(league_calibration, dict) else 0,
        'seasons': len(seasons) if isinstance(seasons, list) else 0,
    }


def _count_xg(d):
    if not isinstance(d, dict):
        return None
    by_team = d.get('by_team') or {}
    leagues = d.get('leagues') or {}
    teams = d.get('teams')
    return {
        'teams': len(by_team) if isinstance(by_team, dict) else teams or 0,
        'leagues': len(leagues) if isinstance(leagues, dict) else 0,
        'source': d.get('source') or 'unknown',
    }

def _count_h2h_extended(d):
    if not isinstance(d, dict):
        return None
    by_sport = d.get('by_sport') or {}
    events_total = d.get('events_total') or len(d.get('events') or {})
    with_meetings = d.get('events_with_meetings_total')
    if with_meetings is None:
        with_meetings = sum(
            (v or {}).get('events_with_meetings') or 0
            for v in by_sport.values()
        )
    meetings = d.get('meetings_total')
    if meetings is None:
        meetings = sum((v or {}).get('meetings') or 0 for v in by_sport.values())
    coverage = d.get('coverage_pct')
    if coverage is None:
        coverage = round((with_meetings / events_total) * 100, 1) if events_total else 0
    return {
        'events': events_total,
        'events_with_meetings': with_meetings,
        'meetings': meetings,
        'coverage_pct': coverage,
        'empty_events': d.get('empty_events_total') if d.get('empty_events_total') is not None else max(0, events_total - with_meetings),
        'sports': len(by_sport),
        'by_sport': by_sport,
    }

def _count_lineups_multisport(d):
    if not isinstance(d, dict):
        return None
    return {
        'events': d.get('events_total') or 0,
        'with_starter_signal': d.get('events_with_starter_signal') or 0,
        'coverage_pct': d.get('coverage_pct') or 0,
        'sports': d.get('sports_total') or len(d.get('sports') or {}),
        'by_sport': d.get('sports') or {},
    }

def _count_xg_coverage(d):
    if not isinstance(d, dict):
        return None
    return {
        'events': d.get('events_total') or 0,
        'both_teams': d.get('events_both_teams') or 0,
        'one_team': d.get('events_one_team') or 0,
        'without_xg': d.get('events_without_xg') or 0,
        'both_teams_pct': d.get('both_teams_pct') or 0,
        'leagues': len(d.get('by_league') or {}),
    }

def _count_match_previews(d):
    if not isinstance(d, dict):
        return None
    previews = d.get('previews') or []
    return {
        'previews': len(previews),
        'espn_hits': d.get('espn_preview_hits') or 0,
        'local_fallbacks': d.get('local_fallbacks') or 0,
    }

def _count_match_context(d):
    if not isinstance(d, dict):
        return None
    quality = d.get('quality') or {}
    sources = d.get('sources') or {}
    return {
        'matches': d.get('matches') or len(d.get('matches_by_id') or {}),
        'strong': quality.get('fort') or 0,
        'correct': quality.get('correct') or 0,
        'weak': quality.get('faible') or 0,
        'insufficient': quality.get('insuffisant') or 0,
        'sources': len(sources),
    }

def _count_signal_gap_report(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'matches': summary.get('matches') or 0,
        'gaps': summary.get('gaps') or len(d.get('gaps') or []),
        'low_context_matches': summary.get('low_context_matches') or 0,
        'sources': len(summary.get('by_source') or {}),
    }

def _count_context_backtest(d):
    if not isinstance(d, dict):
        return None
    return {
        'settled': d.get('settled_used') or 0,
        'markets': len(d.get('by_market') or []),
        'tiers': len(d.get('by_context_tier') or []),
        'rows_skipped': d.get('rows_skipped') or 0,
    }

def _count_decision_backtest(d):
    if not isinstance(d, dict):
        return None
    return {
        'settled': d.get('settled_used') or 0,
        'decisions': len(d.get('by_decision') or []),
        'reasons': len(d.get('by_reason') or []),
        'markets': len(d.get('by_decision_market') or []),
        'rows_skipped': d.get('rows_skipped') or 0,
    }

def _count_decision_tuning(d):
    if not isinstance(d, dict):
        return None
    policy = d.get('policy') or {}
    summary = d.get('summary') or {}
    return {
        'settled': d.get('settled_used') or 0,
        'recommendations': summary.get('recommendations') or len(d.get('recommendations') or []),
        'degrade_markets': len(policy.get('degrade_markets') or []),
        'watch_markets': len(policy.get('keep_watch_markets') or []),
        'suggested_min_trust': policy.get('suggested_min_trust') or 0,
    }

def _count_decision_shadow(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'matches': summary.get('current_matches') or 0,
        'affected': summary.get('affected') or 0,
        'would_watch': summary.get('would_watch') or 0,
        'would_skip': summary.get('would_skip') or 0,
        'affected_rate_pct': round(float(summary.get('affected_rate') or 0) * 100, 1),
    }

def _count_odds_guardrails(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    policy = d.get('policy') or {}
    return {
        'settled': d.get('settled_used') or 0,
        'buckets': summary.get('buckets') or 0,
        'risky_buckets': summary.get('risky_buckets') or 0,
        'current_high_odd_matches': summary.get('current_high_odd_matches') or 0,
        'max_agent_odd': policy.get('max_agent_odd') or summary.get('max_agent_odd') or 0,
    }

def _count_agent_blocker_backtest(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'settled': d.get('settled_used') or 0,
        'active_like': summary.get('active_like_count') or 0,
        'blocked_like': summary.get('blocked_like_count') or 0,
        'outlier_like': summary.get('outlier_like_count') or 0,
        'active_roi_pct': round(float(summary.get('active_like_roi') or 0) * 100, 1),
        'blocked_roi_pct': round(float(summary.get('blocked_like_roi') or 0) * 100, 1),
        'roi_gap_pct': round(float(summary.get('roi_gap') or 0) * 100, 1),
    }

def _count_agent_guardrail_recommendations(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'recommendations': summary.get('recommendations') or 0,
        'critical': summary.get('critical') or 0,
        'high': summary.get('high') or 0,
        'medium': summary.get('medium') or 0,
        'low': summary.get('low') or 0,
    }

def _count_scorer_quality(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'football_bookable': summary.get('football_bookable') or 0,
        'ready': summary.get('ready') or 0,
        'watch': summary.get('watch') or 0,
        'fragile': summary.get('fragile') or 0,
        'ready_rate_pct': round(float(summary.get('ready_rate') or 0) * 100, 1),
    }

def _count_scorer_candidates(d):
    if not isinstance(d, dict):
        return None
    return {
        'history_rows': d.get('history_rows') or 0,
        'added_rows': d.get('added_rows') or 0,
        'matches': d.get('matches_with_candidates') or 0,
        'pending': d.get('pending_rows') or 0,
    }

def _count_scorer_settlement(d):
    if not isinstance(d, dict):
        return None
    return {
        'history_rows': d.get('history_rows') or 0,
        'settled_total': d.get('settled_total') or 0,
        'won': d.get('won') or 0,
        'lost': d.get('lost') or 0,
        'pending': d.get('pending') or 0,
        'hit_rate_pct': round(float(d.get('hit_rate') or 0) * 100, 1),
    }

def _count_scorer_pending_audit(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'history_rows': summary.get('history_rows') or 0,
        'pending': summary.get('pending') or 0,
        'pending_matches': summary.get('pending_matches') or 0,
        'settled_total': summary.get('settled_total') or 0,
        'actions': summary.get('actions') or 0,
    }

def _count_prematch_focus(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'matches': summary.get('matches') or 0,
        'critical': summary.get('critical') or 0,
        'high': summary.get('high') or 0,
        'medium': summary.get('medium') or 0,
        'source_total': summary.get('source_total') or 0,
    }

def _count_prematch_execution(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'focus_matches': summary.get('focus_matches') or 0,
        'steps': summary.get('steps') or 0,
        'blocking_steps': summary.get('blocking_steps') or 0,
        'critical': summary.get('critical') or 0,
        'high': summary.get('high') or 0,
        'estimated_total_min': summary.get('estimated_total_min') or 0,
        'final_gate': summary.get('final_gate') or 'unknown',
    }

def _count_signal_coverage_trend(d):
    if not isinstance(d, dict):
        return None
    latest = d.get('latest') or {}
    delta = d.get('delta_last') or {}
    return {
        'history_rows': d.get('history_rows') or 0,
        'matches': latest.get('matches') or 0,
        'usable_rate_pct': round(float(latest.get('usable_rate') or 0) * 100, 1),
        'strong_rate_pct': round(float(latest.get('strong_rate') or 0) * 100, 1),
        'delta_usable_rate_pct': delta.get('usable_rate_pct') if delta.get('available') else 0,
    }

def _count_next_actions(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'actions': summary.get('actions') or 0,
        'critical': summary.get('critical') or 0,
        'high': summary.get('high') or 0,
        'medium': summary.get('medium') or 0,
        'low': summary.get('low') or 0,
    }

def _count_source_freshness_plan(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'sources': summary.get('sources') or 0,
        'due': summary.get('due') or 0,
        'critical': summary.get('critical') or 0,
        'high': summary.get('high') or 0,
    }

def _count_refresh_priority_plan(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'items': summary.get('items') or 0,
        'critical': summary.get('critical') or 0,
        'high': summary.get('high') or 0,
        'medium': summary.get('medium') or 0,
        'estimated_total_sec': summary.get('estimated_total_sec') or 0,
    }

def _count_prebet_checklist(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'status': summary.get('status') or 'unknown',
        'ready_to_bet': bool(summary.get('ready_to_bet')),
        'items': summary.get('items') or 0,
        'blockers': summary.get('blockers') or 0,
        'critical': summary.get('critical') or 0,
        'high': summary.get('high') or 0,
    }

def _count_prebet_checklist_backtest(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'settled_used': summary.get('settled_used') or 0,
        'red_count': summary.get('red_count') or 0,
        'red_roi': summary.get('red_roi') or 0,
        'green_count': summary.get('green_count') or 0,
        'green_roi': summary.get('green_roi') or 0,
        'policy': summary.get('policy') or 'unknown',
    }

def _count_context_repair_plan(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'weak_matches': summary.get('weak_matches') or 0,
        'insufficient_matches': summary.get('insufficient_matches') or 0,
        'repair_actions': summary.get('repair_actions') or 0,
        'critical': summary.get('critical') or 0,
        'high': summary.get('high') or 0,
    }

def _count_stake_reduction_backtest(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'recommendations': summary.get('recommendations') or 0,
        'league_market_recommendations': summary.get('league_market_recommendations') or 0,
        'high': summary.get('high') or 0,
        'medium': summary.get('medium') or 0,
        'settled_used': summary.get('settled_used') or 0,
        'loss_saved_units': summary.get('loss_saved_units') or 0,
    }

def _count_signal_conflict_backtest(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    policy = d.get('policy') or {}
    return {
        'count': summary.get('count') or 0,
        'roi': summary.get('roi') or 0,
        'current_conflicts': summary.get('current_conflicts') or 0,
        'policy_action': policy.get('action') or summary.get('policy_action') or 'unknown',
    }

def _count_source_registry(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'sources': summary.get('sources') or len(d.get('sources') or []),
        'free_or_optional': summary.get('free_or_optional') or 0,
        'quarantine': summary.get('quarantine') or 0,
        'runs_tail': summary.get('runs_tail') or 0,
    }

def _count_source_quarantine(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'items': summary.get('items') or len(d.get('items') or []),
        'critical': summary.get('critical') or 0,
    }

def _count_decision_exports(d):
    if isinstance(d, dict):
        summary = d.get('summary') or {}
        return {
            'files': summary.get('files') or len(d.get('files') or []),
            'signal_conflicts': summary.get('signal_conflicts') or 0,
            'repairable_contexts': summary.get('repairable_contexts') or 0,
            'prebet_final': summary.get('prebet_final') or 0,
        }
    exports = ROOT / 'exports'
    return {
        'files': sum(1 for p in exports.glob('*.csv')) if exports.exists() else 0,
        'signal_conflicts': (exports / 'signal_conflicts.csv').exists(),
        'repairable_contexts': (exports / 'repairable_contexts.csv').exists(),
        'prebet_final': (exports / 'prebet_final.csv').exists(),
    }

def _count_team_identity_graph(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'teams': summary.get('teams') or len(d.get('teams') or {}),
        'matches': summary.get('matches') or len(d.get('matches') or []),
        'strict': summary.get('strict') or 0,
        'usable': summary.get('usable') or 0,
        'uncertain': summary.get('uncertain') or len(d.get('unmatched') or []),
    }

def _count_match_decision_timeline(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'matches': summary.get('matches') or len(d.get('matches') or {}),
        'weak_context': summary.get('weak_context') or 0,
        'checklist_blocked_matches': summary.get('checklist_blocked_matches') or 0,
        'signal_conflicts': summary.get('signal_conflicts') or 0,
    }

def _count_agent_bankroll_simulation(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'settled_rows': summary.get('settled_rows') or 0,
        'strategies': summary.get('strategies') or len(d.get('strategies') or []),
        'current_policy_nav': summary.get('current_policy_nav') or 0,
        'league_market_factors': summary.get('league_market_factors') or 0,
    }

def _count_smart_prepare_plan(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'actions': summary.get('actions') or len(d.get('queue') or []),
        'mode': summary.get('mode') or 'unknown',
        'priority': summary.get('priority') or 'unknown',
    }

def _count_optional_sources_plan(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    return {
        'sources': summary.get('sources') or len(d.get('sources') or []),
        'configured': summary.get('configured') or 0,
        'token_missing': summary.get('token_missing') or 0,
        'offline_ready': summary.get('offline_ready') or 0,
    }

def _count_clv_summary(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    pick = (d.get('pick_level') or {}).get('summary') or {}
    return {
        'observations': summary.get('n') or summary.get('n_clv_observations') or 0,
        'pick_observations': pick.get('n') or summary.get('n_pick_clv_observations') or 0,
        'pick_mean_clv_pct': pick.get('mean_clv_pct') or summary.get('pick_mean_clv_pct') or 0,
        'positive_clv_rate': pick.get('positive_clv_rate') or summary.get('positive_clv_rate') or 0,
    }

def _count_league_bias_audit(d):
    if not isinstance(d, dict):
        return None
    summary = d.get('summary') or {}
    status_counts = summary.get('status_counts') or {}
    current = summary.get('current_upcoming_by_status') or {}
    return {
        'leagues': summary.get('leagues_total') or len(d.get('leagues') or []),
        'deprioritize': status_counts.get('deprioritize') or 0,
        'watch': status_counts.get('watch') or 0,
        'trusted': status_counts.get('trusted') or 0,
        'risky_current_leagues': summary.get('risky_current_leagues') or 0,
        'risky_current_events': summary.get('risky_current_events') or 0,
        'current_deprioritize_events': current.get('deprioritize') or 0,
        'current_watch_events': current.get('watch') or 0,
    }

SOURCES = [
    ('winamax_catalog', 'winamax_catalog.json', _count_winamax_catalog),
    ('winamax_markets', 'winamax_markets.json', _count_winamax_markets),
    ('injuries_soccer', 'injuries_soccer.json', _count_injuries),
    ('lineups_soccer',  'lineups_soccer.json',  _count_events),
    ('team_stats',      'team_stats.json',      lambda d: {'teams': len(d.get('teams') or {}) if isinstance(d, dict) else 0}),
    ('clubelo',         'clubelo.json',         _count_clubelo),
    ('weather',         'weather.json',         lambda d: {'events': len(d.get('matches') or d.get('forecasts') or {}) if isinstance(d, dict) else 0}),
    ('referees_soccer', 'referees_soccer.json', _count_events),
    # v33.6 — Sources ajoutées pour visibility complète du pipeline.
    ('xg_team_stats',   'xg_team_stats.json',   _count_xg),
    ('fbref_xg',        'fbref_xg.json',        _count_xg),
    ('sofascore_events', 'sofascore_events.json', lambda d: {'total': d.get('total') or sum(len(v) for v in (d.get('events') or {}).values()) if isinstance(d, dict) else 0}),
    ('team_form',       'team_form.json',       lambda d: {
        'teams': (
            len(d.get('teams') or {})
            if isinstance(d, dict) and isinstance(d.get('teams'), dict)
            else len(d) if isinstance(d, dict) else 0
        ),
        'football_teams': (
            sum(1 for k in d.keys() if str(k).startswith('football:'))
            if isinstance(d, dict) else 0
        ),
    }),
    ('form_stats_extended', 'form_stats_extended.json', lambda d: {
        'teams': len(d.get('teams') or {}) if isinstance(d, dict) else 0,
        'sports': len(d.get('by_sport') or {}) if isinstance(d, dict) else 0,
    }),
    ('h2h_extended', 'h2h_extended.json', _count_h2h_extended),
    ('lineups_multisport', 'lineups_multisport.json', _count_lineups_multisport),
    ('xg_coverage', 'xg_coverage.json', _count_xg_coverage),
    ('match_previews', 'match_previews.json', _count_match_previews),
    ('match_context', 'match_context.json', _count_match_context),
    ('team_history_extended', 'team_history_extended.json', lambda d: {
        'teams': (d.get('team_count') or len(d.get('teams') or {})) if isinstance(d, dict) else 0,
    }),
    ('roster_context', 'roster_context.json', lambda d: {
        'matches': (d.get('match_count') or len(d.get('matches') or {})) if isinstance(d, dict) else 0,
    }),
    ('signal_gap_report', 'signal_gap_report.json', _count_signal_gap_report),
    ('team_identity_report', 'team_identity_report.json', lambda d: {
        'teams': (d.get('team_count') or len(d.get('teams') or {})) if isinstance(d, dict) else 0,
    }),
    ('team_identity_graph', 'team_identity_graph.json', _count_team_identity_graph),
    ('context_backtest', 'context_backtest_report.json', _count_context_backtest),
    ('decision_backtest', 'decision_backtest_report.json', _count_decision_backtest),
    ('decision_tuning', 'decision_tuning_report.json', _count_decision_tuning),
    ('decision_shadow', 'decision_shadow_report.json', _count_decision_shadow),
    ('odds_guardrails', 'odds_guardrails_report.json', _count_odds_guardrails),
    ('agent_blocker_backtest', 'agent_blocker_backtest.json', _count_agent_blocker_backtest),
    ('agent_guardrail_recommendations', 'agent_guardrail_recommendations.json', _count_agent_guardrail_recommendations),
    ('stake_reduction_backtest', 'stake_reduction_backtest.json', _count_stake_reduction_backtest),
    ('signal_conflict_backtest', 'signal_conflict_backtest.json', _count_signal_conflict_backtest),
    ('scorer_quality', 'scorer_quality_report.json', _count_scorer_quality),
    ('scorer_candidates', 'scorer_candidates_summary.json', _count_scorer_candidates),
    ('scorer_settlement', 'scorer_candidates_settlement.json', _count_scorer_settlement),
    ('scorer_pending_audit', 'scorer_pending_audit.json', _count_scorer_pending_audit),
    ('prematch_focus', 'prematch_focus_report.json', _count_prematch_focus),
    ('prematch_execution', 'prematch_execution_plan.json', _count_prematch_execution),
    ('signal_coverage_trend', 'signal_coverage_trend.json', _count_signal_coverage_trend),
    ('next_actions', 'next_actions_report.json', _count_next_actions),
    ('source_freshness_plan', 'source_freshness_plan.json', _count_source_freshness_plan),
    ('context_repair_plan', 'context_repair_plan.json', _count_context_repair_plan),
    ('refresh_priority_plan', 'refresh_priority_plan.json', _count_refresh_priority_plan),
    ('prebet_checklist', 'prebet_checklist_report.json', _count_prebet_checklist),
    ('prebet_checklist_backtest', 'prebet_checklist_backtest.json', _count_prebet_checklist_backtest),
    ('agent_bankroll_simulation', 'agent_bankroll_simulation.json', _count_agent_bankroll_simulation),
    ('match_decision_timeline', 'match_decision_timeline.json', _count_match_decision_timeline),
    ('smart_prepare_plan', 'smart_prepare_plan.json', _count_smart_prepare_plan),
    ('decision_exports', 'exports/decision_exports_manifest.json', _count_decision_exports),
    ('source_registry', 'source_registry.json', _count_source_registry),
    ('source_quarantine', 'source_quarantine.json', _count_source_quarantine),
    ('optional_sources_plan', 'optional_sources_plan.json', _count_optional_sources_plan),
    ('clv_summary', 'clv_summary.json', _count_clv_summary),
    ('league_bias_audit', 'league_bias_audit.json', _count_league_bias_audit),
    ('league_inefficiencies', 'league_inefficiencies.json', lambda d: {
        'leagues': ((d.get('summary') or {}).get('leagues') or len(d.get('leagues') or [])) if isinstance(d, dict) else 0,
        'exploit': ((d.get('summary') or {}).get('exploit') or 0) if isinstance(d, dict) else 0,
        'avoid': ((d.get('summary') or {}).get('avoid') or 0) if isinstance(d, dict) else 0,
        'current_exploit_events': ((d.get('summary') or {}).get('current_exploit_events') or 0) if isinstance(d, dict) else 0,
    }),
    ('market_biases_by_league', 'market_biases_by_league.json', lambda d: {
        'markets': ((d.get('summary') or {}).get('markets') or len(d.get('markets') or [])) if isinstance(d, dict) else 0,
        'market_exploit': ((d.get('summary') or {}).get('market_exploit') or 0) if isinstance(d, dict) else 0,
        'market_fade': ((d.get('summary') or {}).get('market_fade') or 0) if isinstance(d, dict) else 0,
        'watchlist': ((d.get('summary') or {}).get('watchlist') or len(d.get('watchlist') or [])) if isinstance(d, dict) else 0,
    }),
    ('market_auc_report', 'market_auc_report.json', lambda d: {
        'markets': ((d.get('summary') or {}).get('markets') or len(d.get('markets') or [])) if isinstance(d, dict) else 0,
        'computed': ((d.get('summary') or {}).get('computed') or 0) if isinstance(d, dict) else 0,
        'exclude_low_auc': ((d.get('summary') or {}).get('exclude_low_auc') or 0) if isinstance(d, dict) else 0,
        'policy': (d.get('sample_policy') or 'unknown') if isinstance(d, dict) else 'missing',
    }),
    ('picks_history_summary', 'picks_history_summary.json', lambda d: {
        'total': (d.get('total') or 0) if isinstance(d, dict) else 0,
        'settled': (d.get('settled') or 0) if isinstance(d, dict) else 0,
        'pending': (d.get('pending') or 0) if isinstance(d, dict) else 0,
        'days': len(d.get('by_day') or []) if isinstance(d, dict) else 0,
    }),
    ('team_priors', 'team_priors.json', lambda d: {
        'teams': (d.get('team_count') or len(d.get('teams') or {})) if isinstance(d, dict) else 0,
        'leagues': (d.get('league_count') or len(d.get('league_averages') or {})) if isinstance(d, dict) else 0,
        'decay_k': (d.get('decay_k') or 0) if isinstance(d, dict) else 0,
        'max_matches': (d.get('max_matches') or 0) if isinstance(d, dict) else 0,
    }),
    ('season_phase', 'season_phase.json', lambda d: {
        'leagues': (d.get('league_count') or len(d.get('leagues') or {})) if isinstance(d, dict) else 0,
        'early': ((d.get('summary') or {}).get('early') or 0) if isinstance(d, dict) else 0,
        'mid': ((d.get('summary') or {}).get('mid') or 0) if isinstance(d, dict) else 0,
        'late': ((d.get('summary') or {}).get('late') or 0) if isinstance(d, dict) else 0,
    }),
    ('star_players', 'star_players.json', lambda d: {
        'teams': (d.get('team_count') or len(d.get('teams') or {})) if isinstance(d, dict) else 0,
        'stars': (d.get('star_count') or sum(len(v.get('players') or []) for v in (d.get('teams') or {}).values())) if isinstance(d, dict) else 0,
    }),
    ('xg_decay_params', 'xg_decay_params.json', lambda d: {
        'leagues': (d.get('league_count') or len(d.get('leagues') or {})) if isinstance(d, dict) else 0,
    }),
    ('team_travel', 'team_travel.json', lambda d: {
        'matches': (d.get('match_count') or len(d.get('matches') or {})) if isinstance(d, dict) else 0,
    }),
    ('schedule_density', 'schedule_density.json', lambda d: {
        'matches': (d.get('match_count') or len(d.get('matches') or {})) if isinstance(d, dict) else 0,
    }),
    ('referee_stats', 'referee_stats.json', lambda d: {
        'referees': (d.get('referee_count') or len(d.get('referees') or {})) if isinstance(d, dict) else 0,
        'top5': (d.get('top5_count') or 0) if isinstance(d, dict) else 0,
    }),
    ('tennis_elo_surface', 'tennis_elo_surface.json', lambda d: {
        'players': (d.get('player_count') or len(d.get('players') or {})) if isinstance(d, dict) else 0,
    }),
    ('goalie_pitcher_context', 'goalie_pitcher_context.json', lambda d: {
        'matches': (d.get('match_count') or len(d.get('matches') or {})) if isinstance(d, dict) else 0,
    }),
    ('stadium_effects', 'stadium_effects.json', lambda d: {
        'stadiums': (d.get('stadium_count') or len(d.get('stadiums') or {})) if isinstance(d, dict) else 0,
    }),
    ('coach_tenure', 'coach_tenure.json', lambda d: {
        'teams': (d.get('team_count') or len(d.get('teams') or {})) if isinstance(d, dict) else 0,
    }),
    ('derbies', 'derbies.json', lambda d: {
        'pairs': (d.get('pair_count') or len(d.get('pairs') or [])) if isinstance(d, dict) else 0,
    }),
    ('team_stats_extended', 'team_stats_extended.json', lambda d: {
        'teams': (d.get('team_count') or len(d.get('teams') or {})) if isinstance(d, dict) else 0,
    }),
    ('football_player_props', 'football_player_props.json', lambda d: {
        'events': (d.get('event_count') or len(d.get('events') or {})) if isinstance(d, dict) else 0,
        'props': (d.get('prop_count') or 0) if isinstance(d, dict) else 0,
    }),
    ('nba_player_props', 'nba_player_props.json', lambda d: {
        'events': (d.get('event_count') or len(d.get('events') or {})) if isinstance(d, dict) else 0,
        'props': (d.get('prop_count') or 0) if isinstance(d, dict) else 0,
    }),
    ('total_corners', 'total_corners.json', lambda d: {
        'events': (d.get('event_count') or len(d.get('events') or {})) if isinstance(d, dict) else 0,
    }),
    ('total_cards', 'total_cards.json', lambda d: {
        'events': (d.get('event_count') or len(d.get('events') or {})) if isinstance(d, dict) else 0,
    }),
    ('total_fouls', 'total_fouls.json', lambda d: {
        'events': (d.get('event_count') or len(d.get('events') or {})) if isinstance(d, dict) else 0,
    }),
    ('model_v4_benchmark', 'model_v4_benchmark.json', lambda d: {
        'status': ((d.get('v4a') or {}).get('status') or 'unknown') if isinstance(d, dict) else 'missing',
        'baseline_n': ((d.get('baseline') or {}).get('n') or 0) if isinstance(d, dict) else 0,
        'roi_proxy_delta_pct': ((d.get('v4a') or {}).get('roi_proxy_delta_pct') or 0) if isinstance(d, dict) else 0,
    }),
    ('model_anomalies', 'model_anomalies_summary.json', lambda d: {
        'scanned_1n2_events': (d.get('scanned_1n2_events') or 0) if isinstance(d, dict) else 0,
        'market_overround_outliers': (d.get('market_overround_outliers') or 0) if isinstance(d, dict) else 0,
        'cap_vs_market': ((d.get('runtime_guard') or {}).get('cap_vs_market') or 0) if isinstance(d, dict) else 0,
    }),
    ('data_quality_report', 'data_quality_report.json', lambda d: {
        'events_quarantined': (d.get('events_quarantined') or 0) if isinstance(d, dict) else 0,
        'status': (d.get('status') or 'unknown') if isinstance(d, dict) else 'missing',
        # Long-shot odds are informational, not corruption — surface them
        # separately so the dashboard can stop conflating them with bad data.
        'long_shot_odd_total': (d.get('long_shot_odd_total') or 0) if isinstance(d, dict) else 0,
        'long_shot_events': (d.get('long_shot_events') or 0) if isinstance(d, dict) else 0,
    }),
    ('backtest_training_rows', 'backtest_training_rows_summary.json', lambda d: {
        'rows': (d.get('rows') or 0) if isinstance(d, dict) else 0,
        'positive_rate': (d.get('positive_rate') or 0) if isinstance(d, dict) else 0,
        'sports': len(d.get('by_sport') or {}) if isinstance(d, dict) else 0,
    }),
    ('daily_insights', 'daily_insights.json', lambda d: {
        'insights': ((d.get('summary') or {}).get('insights') or len(d.get('insights') or [])) if isinstance(d, dict) else 0,
        'events_today': ((d.get('summary') or {}).get('events_today') or 0) if isinstance(d, dict) else 0,
        'events_next_36h': ((d.get('summary') or {}).get('events_next_36h') or 0) if isinstance(d, dict) else 0,
        'sources_loaded': ((d.get('summary') or {}).get('sources_loaded') or 0) if isinstance(d, dict) else 0,
    }),
    ('detected_angles', 'detected_angles.json', lambda d: {
        'events': ((d.get('summary') or {}).get('events_with_angles') or len(d.get('events') or [])) if isinstance(d, dict) else 0,
        'angles': ((d.get('summary') or {}).get('angles') or 0) if isinstance(d, dict) else 0,
        'by_type': ((d.get('summary') or {}).get('by_type') or {}) if isinstance(d, dict) else {},
    }),
    ('schedule_spots_summary', 'schedule_spots_summary.json', lambda d: {
        'active': ((d.get('summary') or {}).get('active_events') or 0) if isinstance(d, dict) else 0,
        'abstain': ((d.get('summary') or {}).get('abstain') or 0) if isinstance(d, dict) else 0,
        'lean_home': ((d.get('summary') or {}).get('lean_home') or 0) if isinstance(d, dict) else 0,
        'lean_away': ((d.get('summary') or {}).get('lean_away') or 0) if isinstance(d, dict) else 0,
        'status': d.get('status') if isinstance(d, dict) else 'missing',
    }),
    ('rare_signals', 'rare_signals.json', lambda d: {
        'signals': ((d.get('summary') or {}).get('signals') or len(d.get('signals') or [])) if isinstance(d, dict) else 0,
        'by_type': ((d.get('summary') or {}).get('by_type') or {}) if isinstance(d, dict) else {},
    }),
    ('rare_signal_summary', 'rare_signal_summary.json', lambda d: {
        'active': ((d.get('summary') or {}).get('active_events') or 0) if isinstance(d, dict) else 0,
        'actionable': ((d.get('summary') or {}).get('actionable') or 0) if isinstance(d, dict) else 0,
        'watch': ((d.get('summary') or {}).get('watch') or 0) if isinstance(d, dict) else 0,
        'risk': ((d.get('summary') or {}).get('risk') or 0) if isinstance(d, dict) else 0,
        'status': d.get('status') if isinstance(d, dict) else 'missing',
    }),
    ('timing_edges', 'timing_edges.json', lambda d: {
        'events': ((d.get('summary') or {}).get('events') or len(d.get('events') or [])) if isinstance(d, dict) else 0,
        'bet_now': ((d.get('summary') or {}).get('bet_now') or 0) if isinstance(d, dict) else 0,
        'wait': ((d.get('summary') or {}).get('wait') or 0) if isinstance(d, dict) else 0,
        'price_shortening': ((d.get('summary') or {}).get('price_shortening') or 0) if isinstance(d, dict) else 0,
    }),
    ('injuries_multisport', 'injuries_multisport.json', lambda d: {
        'teams': len(d.get('teams') or {}) if isinstance(d, dict) else 0,
        'sports': len(d.get('by_sport') or {}) if isinstance(d, dict) else 0,
        'injuries': sum((v or {}).get('injuries_count') or 0 for v in (d.get('teams') or {}).values()) if isinstance(d, dict) else 0,
        'severe': sum((v or {}).get('severe_count') or 0 for v in (d.get('teams') or {}).values()) if isinstance(d, dict) else 0,
    }),
    ('thesportsdb_meta', 'thesportsdb_meta.json', lambda d: {
        'requested': d.get('requested') or 0 if isinstance(d, dict) else 0,
        'matched': d.get('matched') or 0 if isinstance(d, dict) else 0,
        'status': d.get('status') if isinstance(d, dict) else 'missing',
    }),
    ('openligadb_matches', 'openligadb_matches.json', lambda d: {
        'matches': len(d.get('matches') or []) if isinstance(d, dict) else 0,
        'matched_local_events': d.get('matched_local_events') or 0 if isinstance(d, dict) else 0,
        'matched_ratio_pct': round((d.get('matched_local_ratio') or 0) * 100, 1) if isinstance(d, dict) else 0,
        'leagues': len(d.get('by_league') or {}) if isinstance(d, dict) else 0,
        'upcoming': sum((v or {}).get('upcoming') or 0 for v in (d.get('by_league') or {}).values()) if isinstance(d, dict) else 0,
        'status': d.get('status') if isinstance(d, dict) else 'missing',
    }),
    ('public_team_stats', 'public_team_stats.json', lambda d: {
        'teams': d.get('teams_total') or 0 if isinstance(d, dict) else 0,
        'teams_with_xg': d.get('teams_with_xg') or 0 if isinstance(d, dict) else 0,
        'teams_with_form': d.get('teams_with_form') or 0 if isinstance(d, dict) else 0,
    }),
    ('public_team_profiles', 'public_team_profiles.json', lambda d: {
        'teams': d.get('teams_total') or 0 if isinstance(d, dict) else 0,
        'upcoming': d.get('teams_with_upcoming') or 0 if isinstance(d, dict) else 0,
        'availability': d.get('teams_with_availability') or 0 if isinstance(d, dict) else 0,
        'deep_context': d.get('teams_with_deep_context') or 0 if isinstance(d, dict) else 0,
    }),
    ('public_player_profiles', 'public_player_profiles.json', lambda d: {
        'players': d.get('players_total') or 0 if isinstance(d, dict) else 0,
        'injuries': d.get('injury_profiles') or 0 if isinstance(d, dict) else 0,
        'starter_context': d.get('starter_context_profiles') or 0 if isinstance(d, dict) else 0,
    }),
    ('rugby_markets', 'rugby_markets.json', lambda d: {
        'events': len(d.get('events') or []) if isinstance(d, dict) else 0,
        'watchlist': len(d.get('source_watchlist') or []) if isinstance(d, dict) else 0,
        'markets': d.get('markets') or 0 if isinstance(d, dict) else 0,
        'status': d.get('status') if isinstance(d, dict) else 'missing',
    }),
    ('niche_markets', 'niche_markets.json', lambda d: {
        'events': len(d.get('events') or []) if isinstance(d, dict) else 0,
        'markets': d.get('markets') or 0 if isinstance(d, dict) else 0,
        'status': d.get('status') if isinstance(d, dict) else 'missing',
    }),
    ('mlb_player_props', 'mlb_player_props.json', lambda d: {
        'events': len(d.get('events') or []) if isinstance(d, dict) else 0,
        'props': d.get('props') or 0 if isinstance(d, dict) else 0,
        'markets': len(d.get('markets') or []) if isinstance(d, dict) else 0,
        'status': d.get('status') if isinstance(d, dict) else 'missing',
    }),
    ('nhl_playoff_markets', 'nhl_playoff_markets.json', lambda d: {
        'events': len(d.get('events') or []) if isinstance(d, dict) else 0,
        'markets': d.get('markets') or 0 if isinstance(d, dict) else 0,
        'status': d.get('status') if isinstance(d, dict) else 'missing',
    }),
    ('tennis_challenger_watchlist', 'tennis_challenger_watchlist.json', lambda d: {
        'bookable': d.get('bookable_tennis_events') or 0 if isinstance(d, dict) else 0,
        'watchlist': len(d.get('watchlist') or []) if isinstance(d, dict) else 0,
        'itf': ((d.get('counts') or {}).get('itf') or 0) if isinstance(d, dict) else 0,
        'challenger_like': ((d.get('counts') or {}).get('challenger_like') or 0) if isinstance(d, dict) else 0,
        'status': d.get('status') if isinstance(d, dict) else 'missing',
    }),
    ('football_expansion_watchlist', 'football_expansion_watchlist.json', lambda d: {
        'bookable': ((d.get('summary') or {}).get('bookable_total') or 0) if isinstance(d, dict) else 0,
        'source': ((d.get('summary') or {}).get('source_total') or 0) if isinstance(d, dict) else 0,
        'ok_categories': ((d.get('summary') or {}).get('ok_categories') or 0) if isinstance(d, dict) else 0,
        'status': d.get('status') if isinstance(d, dict) else 'missing',
    }),
    ('anti_public_angles', 'anti_public_angles.json', lambda d: {
        'active': ((d.get('summary') or {}).get('active') or 0) if isinstance(d, dict) else 0,
        'expired_sample': ((d.get('summary') or {}).get('expired_sample') or 0) if isinstance(d, dict) else 0,
        'types': len(((d.get('summary') or {}).get('by_type') or {})) if isinstance(d, dict) else 0,
        'status': d.get('status') if isinstance(d, dict) else 'missing',
    }),
    ('boosted_odds', 'boosted_odds.json', lambda d: {
        'matches_scanned': d.get('matches_scanned') or 0 if isinstance(d, dict) else 0,
        'boosts': len(d.get('boosts') or []) if isinstance(d, dict) else 0,
        'status': d.get('status') if isinstance(d, dict) else 'missing',
    }),
    ('footballdata',    'footballdata.json',    _count_footballdata),
    ('clv_history',     'clv_history.json',     _count_clv),
]

# Soft thresholds (minutes) above which a source is flagged stale. These
# match the cadences in refresh.yml — a source running every 2h is allowed
# to be 3h old before warning.
STALE_AFTER_MIN = {
    'winamax_catalog': 15,
    'winamax_markets': 15,
    'injuries_soccer': 180,    # 2h cadence
    'injuries_multisport': 60,  # fast ESPN public injuries endpoint
    'lineups_soccer':  180,    # 2h cadence
    'team_stats':      300,    # 4h cadence
    'clubelo':         24*60,  # daily cadence
    'weather':         60,
    'referees_soccer': 8*60,   # 6h cadence
    'xg_team_stats':   6*60,   # 6h self-throttle
    'fbref_xg':        6*60,   # 6h self-throttle / compatibility mirror
    'sofascore_events': 30,    # cron tick chaque 5min, max 30min stale
    'team_form':       6*60,   # 6h self-throttle
    'thesportsdb_meta': 24*60,  # daily metadata cache
    'openligadb_matches': 12*60, # German football cross-check cache
    'public_team_stats': 6*60,  # merged public sidecar
    'public_team_profiles': 6*60,  # team search/intelligence profile
    'public_player_profiles': 6*60,  # player search/intelligence profile
    'lineups_multisport': 60,   # starter context built from patched data.js
    'xg_coverage': 60,          # product coverage of patched xG fields
    'match_previews': 60,       # top upcoming match explanations
    'match_context': 60,        # local dossier per bookable match
    'team_history_extended': 60, # derived local team history context
    'roster_context': 60,       # derived lineups/injuries/stars context
    'signal_gap_report': 60,    # missing signal worklist
    'team_identity_report': 60, # team alias/matching report
    'team_identity_graph': 60,  # strict team identity graph and failed matching
    'context_backtest': 60,     # settled ROI/Brier by context tier
    'decision_backtest': 60,    # settled ROI/Brier by bet/watch/skip decision
    'decision_tuning': 60,      # conservative decision thresholds from settled history
    'decision_shadow': 60,      # current-match projection of conservative thresholds
    'odds_guardrails': 60,      # high-odd and calibration guardrails
    'agent_blocker_backtest': 60, # flat ROI by active-like vs blocked-like agent guardrails
    'agent_guardrail_recommendations': 60, # cautious next guardrail actions
    'stake_reduction_backtest': 60, # reduced-stake policy diagnostic
    'signal_conflict_backtest': 60, # strong-context/cold-market guardrail diagnostic
    'scorer_quality': 60,       # current scorer readiness guardrail
    'scorer_candidates': 60,    # local scorer candidate archive summary
    'scorer_settlement': 60,    # candidate scorer settlement when post-match scorers exist
    'scorer_pending_audit': 60, # pending player-prop audit
    'prematch_focus': 60,       # T-60 source priority worklist
    'prematch_execution': 60,   # executable source plan derived from T-60 focus
    'signal_coverage_trend': 60, # local trend of signal coverage quality
    'next_actions': 60,         # compact local queue for the next useful action
    'source_freshness_plan': 60, # source-specific freshness worklist
    'context_repair_plan': 60, # weak context dossier repair queue
    'refresh_priority_plan': 60, # deduplicated local refresh queue
    'prebet_checklist': 60,     # pre-bet local go/no-go checklist
    'prebet_checklist_backtest': 60, # red/watch/green checklist diagnostic
    'agent_bankroll_simulation': 60, # simulated agent bankroll strategies
    'match_decision_timeline': 60, # per-match decision timeline for detail sheet
    'smart_prepare_plan': 60,   # one-click local refresh recommendation
    'decision_exports': 60,     # durable local CSV decision exports
    'source_registry': 24*60,   # local free-source registry
    'source_quarantine': 60,    # degraded/missing source quarantine
    'optional_sources_plan': 24*60, # optional free/free-tier source roadmap
    'clv_summary': 24*60,       # CLV/odds movement historical summary
    'league_bias_audit': 60,    # model league reliability guardrail
    'rugby_markets':   6*60,    # derived only when rugby appears in data.js
    'niche_markets':   6*60,    # darts/snooker derived sidecar
    'mlb_player_props': 60,      # derived from current probable pitchers
    'nhl_playoff_markets': 60,   # derived from patched NHL team/goalie stats
    'tennis_challenger_watchlist': 60,  # source coverage watchlist, not actionable
    'football_expansion_watchlist': 60, # bookable vs source status for J1/J5/J6/J7
    'anti_public_angles': 60,      # derived from patched smart money movements
    'schedule_spots_summary': 60,  # derived lookahead/travel/fatigue decision layer
    'rare_signal_summary': 60,     # derived rare-signal quality layer
    'boosted_odds':    60,      # follows Winamax market refresh
    'footballdata':    24*60,  # daily fetch
    'clv_history':     60,
    'total_corners':   60,
    'total_cards':     60,
    'total_fouls':     60,
}

SOURCE_SCRIPT = {
    'winamax_catalog': 'scripts/fetch_winamax_catalog.py',
    'winamax_markets': 'scripts/fetch_winamax_match_details.py',
    'injuries_soccer': 'scripts/fetch_injuries_soccer.py',
    'injuries_multisport': 'scripts/fetch_injuries.py',
    'lineups_soccer': 'scripts/fetch_lineups_soccer.py',
    'team_stats': 'scripts/fetch_team_stats.py',
    'clubelo': 'scripts/fetch_clubelo.py',
    'weather': 'scripts/fetch_weather.py',
    'referees_soccer': 'scripts/fetch_referees_soccer.py',
    'xg_team_stats': 'scripts/fetch_understat_xg.py',
    'fbref_xg': 'scripts/fetch_understat_xg.py',
    'sofascore_events': 'scripts/fetch_sofascore_events.py',
    'team_form': 'scripts/fetch_team_form.py',
    'thesportsdb_meta': 'scripts/fetch_thesportsdb_meta.py',
    'openligadb_matches': 'scripts/fetch_openligadb.py',
    'public_team_stats': 'scripts/build_public_team_stats.py',
    'public_team_profiles': 'scripts/build_public_profiles.py',
    'public_player_profiles': 'scripts/build_public_profiles.py',
    'lineups_multisport': 'scripts/build_lineups_multisport.py',
    'xg_coverage': 'scripts/build_xg_coverage.py',
    'match_previews': 'scripts/fetch_match_previews.py',
    'match_context': 'scripts/build_match_context.py',
    'team_history_extended': 'scripts/build_match_context.py',
    'roster_context': 'scripts/build_match_context.py',
    'signal_gap_report': 'scripts/build_match_context.py',
    'team_identity_report': 'scripts/build_team_identity_graph.py',
    'team_identity_graph': 'scripts/build_team_identity_graph.py',
    'context_backtest': 'scripts/build_context_backtest.py',
    'decision_backtest': 'scripts/build_decision_backtest.py',
    'decision_tuning': 'scripts/build_decision_tuning.py',
    'decision_shadow': 'scripts/build_decision_shadow.py',
    'odds_guardrails': 'scripts/build_odds_guardrails.py',
    'agent_blocker_backtest': 'scripts/build_agent_blocker_backtest.py',
    'agent_guardrail_recommendations': 'scripts/build_agent_guardrail_recommendations.py',
    'stake_reduction_backtest': 'scripts/build_stake_reduction_backtest.py',
    'signal_conflict_backtest': 'scripts/build_signal_conflict_backtest.py',
    'scorer_quality': 'scripts/build_scorer_quality.py',
    'scorer_candidates': 'scripts/archive_scorer_candidates.py',
    'scorer_settlement': 'scripts/settle_scorer_candidates.py',
    'scorer_pending_audit': 'scripts/build_scorer_pending_audit.py',
    'prematch_focus': 'scripts/build_prematch_focus.py',
    'prematch_execution': 'scripts/build_prematch_execution_plan.py',
    'signal_coverage_trend': 'scripts/build_signal_coverage_trend.py',
    'next_actions': 'scripts/build_next_actions.py',
    'source_freshness_plan': 'scripts/build_source_freshness_plan.py',
    'context_repair_plan': 'scripts/build_context_repair_plan.py',
    'refresh_priority_plan': 'scripts/build_refresh_priority_plan.py',
    'prebet_checklist': 'scripts/build_prebet_checklist.py',
    'prebet_checklist_backtest': 'scripts/build_prebet_checklist_backtest.py',
    'agent_bankroll_simulation': 'scripts/build_agent_bankroll_simulation.py',
    'match_decision_timeline': 'scripts/build_match_decision_timeline.py',
    'smart_prepare_plan': 'scripts/build_smart_prepare_plan.py',
    'decision_exports': 'scripts/build_decision_exports.py',
    'source_registry': 'scripts/build_source_registry.py',
    'source_quarantine': 'scripts/build_source_registry.py',
    'optional_sources_plan': 'scripts/build_optional_sources_plan.py',
    'clv_summary': 'scripts/compute_clv.py',
    'league_bias_audit': 'scripts/build_league_bias_audit.py',
    'rugby_markets': 'scripts/build_rugby_markets.py',
    'niche_markets': 'scripts/build_niche_markets.py',
    'mlb_player_props': 'scripts/build_mlb_player_props.py',
    'nhl_playoff_markets': 'scripts/build_nhl_playoff_markets.py',
    'tennis_challenger_watchlist': 'scripts/build_tennis_challenger_watchlist.py',
    'football_expansion_watchlist': 'scripts/build_football_expansion_watchlist.py',
    'anti_public_angles': 'scripts/build_anti_public_angles.py',
    'schedule_spots_summary': 'scripts/build_schedule_spots_summary.py',
    'rare_signal_summary': 'scripts/build_rare_signal_summary.py',
    'boosted_odds': 'scripts/detect_boosted_odds.py',
    'footballdata': 'scripts/fetch_footballdata.py',
    'clv_history': 'scripts/compute_clv.py',
    'total_corners': 'scripts/build_football_stats_markets.py',
    'total_cards': 'scripts/build_football_stats_markets.py',
    'total_fouls': 'scripts/build_football_stats_markets.py',
    'backtest_training_rows': 'scripts/build_backtest_training_rows.py',
    'daily_insights': 'scripts/build_daily_insights.py',
}

FAST_PIPELINE_SOURCES = {
    'winamax_catalog',
    'winamax_markets',
    'weather',
    'sofascore_events',
}

PIPELINE_DRIFT_EXCLUDED = {
    'model_loader.py',
    'winamax_map.py',
    '_data_io.py',
    'backtest_v2.py',
    'backtest_baselines.py',
    'check_pipeline_drift.py',
    'check_no_conflict_markers.py',
}


def _age_min(path: Path) -> int | None:
    # AUDIT 2026-05-08 v40 — fallback sur .gz si plain absent (sidecars compressés).
    if not path.exists():
        gz = path.with_name(path.name + '.gz')
        if gz.exists():
            mtime = gz.stat().st_mtime
            now = datetime.now(timezone.utc).timestamp()
            return max(0, int((now - mtime) / 60))
        return None
    mtime = path.stat().st_mtime
    now = datetime.now(timezone.utc).timestamp()
    return max(0, int((now - mtime) / 60))


def _read_source_json(path: Path):
    """AUDIT 2026-05-08 v40 — lit JSON depuis path.gz ou path plain."""
    import gzip as _gzip
    gz = path.with_name(path.name + '.gz')
    if gz.exists():
        with _gzip.open(gz, 'rt', encoding='utf-8') as f:
            return json.load(f)
    return json.loads(path.read_text(encoding='utf-8'))


def _data_generated_age_min() -> int | None:
    data_path = ROOT / 'data.js'
    if not data_path.exists():
        return None
    try:
        import re
        text = data_path.read_text(encoding='utf-8')
        m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL)
        if not m:
            return None
        generated_at = json.loads(m.group(1)).get('generated_at')
        if not generated_at:
            return None
        dt = datetime.fromisoformat(str(generated_at).replace('Z', '+00:00'))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return max(0, int((datetime.now(timezone.utc) - dt.astimezone(timezone.utc)).total_seconds() / 60))
    except Exception:
        return None


def _load_optional_json(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def _status_bucket(*statuses: str | None) -> str:
    vals = {s for s in statuses if s}
    if vals & {'critical', 'error'}:
        return 'critical'
    if vals & {'degraded', 'warning', 'warn'}:
        return 'degraded'
    if vals & {'healthy', 'ok'}:
        return 'healthy'
    return 'unknown'


WARNING_CATEGORY_KEYS = ('actuel', '7j', 'optionnel', 'bloquant')


def categorize_health_warning(message: str, data_age_min: int | None = None) -> str:
    text = str(message or '').strip().lower()
    if not text:
        return 'optionnel'
    if '7j' in text or '7 jours' in text or 'sur 7 jours' in text or 'rolling 7' in text:
        return '7j'
    if 'data.js is stale' in text:
        age = data_age_min
        marker = text.split('data.js is stale (', 1)
        if len(marker) == 2:
            raw = marker[1].split('min', 1)[0]
            try:
                age = int(float(raw))
            except ValueError:
                pass
        return 'bloquant' if age is None or age > 240 else 'actuel'
    if any(token in text for token in (
        'pipeline broken',
        'data.js is missing',
        'parse error',
        'file missing',
        'football_invalid_form_stats',
        'pipeline_drift:',
        'validation critique',
    )):
        return 'bloquant'
    if any(token in text for token in (
        'no_source_events',
        'retained_existing',
        'rare_event',
        'no_explicit_boosts',
        'optionnel',
    )):
        return 'optionnel'
    return 'actuel'


def categorize_health_warnings(warnings, data_age_min: int | None = None) -> dict:
    grouped = {key: [] for key in WARNING_CATEGORY_KEYS}
    for warning in warnings or []:
        category = categorize_health_warning(str(warning), data_age_min)
        grouped.setdefault(category, []).append(str(warning))
    return grouped


def _extract_pipeline_scripts(path: Path, pattern: str) -> set[str]:
    import re
    if not path.exists():
        return set()
    try:
        text = path.read_text(encoding='utf-8')
    except Exception:
        return set()
    return set(re.findall(pattern, text))


def _scan_pipeline_drift() -> dict:
    scripts_dir = ROOT / 'scripts'
    on_disk = {
        p.name for p in scripts_dir.iterdir()
        if p.suffix == '.py'
    } - PIPELINE_DRIFT_EXCLUDED if scripts_dir.exists() else set()
    in_local = _extract_pipeline_scripts(
        ROOT / 'auto_refresh.py',
        r"\(\s*'([\w_]+\.py)'",
    )
    in_prod = _extract_pipeline_scripts(
        ROOT / '.github' / 'workflows' / 'refresh.yml',
        r'python3?\s+([\w_]+\.py)',
    )
    only_local = sorted((in_local - in_prod) - PIPELINE_DRIFT_EXCLUDED)
    only_prod = sorted((in_prod - in_local) - PIPELINE_DRIFT_EXCLUDED)
    missing_from_disk = sorted(((in_local | in_prod) - on_disk) - PIPELINE_DRIFT_EXCLUDED)
    unused = sorted((on_disk - in_local - in_prod) - PIPELINE_DRIFT_EXCLUDED)
    drift_count = len(only_local) + len(only_prod) + len(missing_from_disk)
    return {
        'status': 'ok' if drift_count == 0 else 'warn',
        'drift_count': drift_count,
        'scripts_on_disk': len(on_disk),
        'auto_refresh_count': len(in_local),
        'refresh_yml_count': len(in_prod),
        'only_local': only_local,
        'only_prod': only_prod,
        'missing_from_disk': missing_from_disk,
        'unused_count': len(unused),
        'unused_sample': unused[:12],
    }


# AUDIT-2026-04-27 (P2) — Health sémantique : ne pas se contenter de
# vérifier l'âge des fichiers. Le pack audit a montré que health.json
# pouvait afficher un faux vert pendant que :
#   - 7 clubs argentins avaient des stats NBA (foot avg_gf5=100)
#   - 189 events avaient odds_snapshot externe alors que Winamax exact
#     existe → reco utilisée non-Winamax
#   - certains matchs "winamax.available=true" n'avaient pas de match_id
#     exact (= disponibilité tournoi seulement)
# Ces checks remontent maintenant en `quality_checks` + warnings ciblés.
def _scan_data_quality():
    """Parse data.js et retourne des compteurs de qualité sémantique.
    Retourne None si data.js absent/illisible (le caller log juste un
    warning standard d'âge dans ce cas)."""
    import re
    data_path = ROOT / 'data.js'
    if not data_path.exists():
        return None
    try:
        txt = data_path.read_text(encoding='utf-8')
        m = re.search(r'=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
        if not m:
            return None
        data = json.loads(m.group(1))
    except Exception:
        return None

    total_events = 0
    all_winamax_available = 0
    all_winamax_exact = 0
    upcoming_events = 0
    winamax_available = 0  # winamax.available=true (peut être tournoi only)
    winamax_exact = 0      # winamax.match_id + markets['1n2'] présents
    winamax_detailed = 0   # match exact + au moins un marché détaillé hors 1N2
    winamax_tournament_only = 0
    actionable_external_odds = 0  # exact existe MAIS snapshot externe
    football_invalid_form = 0  # avg_gf5 ou avg_ga5 > 5 = NBA-level
    events_with_xg = 0
    by_sport: dict[str, dict] = {}
    reason_counts: dict[str, int] = {}

    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            total_events += 1
            wnx = ev.get('winamax') or {}
            mks = wnx.get('markets') or {}
            all_has_1n2 = isinstance(mks.get('1n2'), dict) and mks['1n2'].get('home') is not None
            all_is_exact = bool(wnx.get('available') is True and wnx.get('match_id') and all_has_1n2)
            if wnx.get('available') is True:
                all_winamax_available += 1
                if all_is_exact:
                    all_winamax_exact += 1
            if ev.get('completed') or ev.get('live'):
                continue
            upcoming_events += 1

            sport = ev.get('sport') or 'unknown'
            sb = by_sport.setdefault(sport, {'upcoming': 0, 'available': 0, 'exact': 0, 'detailed': 0, 'tournament_only': 0, 'missing': 0})
            sb['upcoming'] += 1
            avail = wnx.get('available') is True
            mid = wnx.get('match_id')
            mks = wnx.get('markets') or {}
            has_1n2 = isinstance(mks.get('1n2'), dict) and mks['1n2'].get('home') is not None
            has_detail = has_1n2 and any(k != '1n2' for k in mks.keys())
            is_exact = bool(avail and mid and has_1n2)
            if avail:
                winamax_available += 1
                sb['available'] += 1
                if is_exact:
                    winamax_exact += 1
                    sb['exact'] += 1
                    if has_detail:
                        winamax_detailed += 1
                        sb['detailed'] += 1
                else:
                    winamax_tournament_only += 1
                    sb['tournament_only'] += 1
                    note = wnx.get('note') or 'tournament_only_unknown'
                    reason_counts[note] = reason_counts.get(note, 0) + 1
            else:
                sb['missing'] += 1
                note = wnx.get('note') or 'not_available'
                reason_counts[note] = reason_counts.get(note, 0) + 1

            # Snapshot externe alors qu'un match exact Winamax existe :
            # le frontend prioritise odds/snapshot avant winamax.markets
            # → la reco est faite sur cote externe, pas Winamax exact.
            snap = ev.get('odds_snapshot') or {}
            snap_provider = (snap.get('provider') or '').lower()
            external_providers = {'draftkings', 'tennisexplorer', 'betexplorer', 'fanduel', 'caesars'}
            if is_exact and snap_provider and snap_provider in external_providers:
                actionable_external_odds += 1

            # Football : stats avg_gf5 ou avg_ga5 > 5 = contamination
            # cross-sport (NBA/hockey via team_id partagé).
            if ev.get('sport') == 'football':
                ev_has_xg = False
                for c in (ev.get('competitors') or []):
                    if c.get('xg_stats') or c.get('fbref_xg') or c.get('xg_for_avg') is not None:
                        ev_has_xg = True
                    fs = c.get('form_stats') or {}
                    if (fs.get('avg_gf5') or 0) > 5 or (fs.get('avg_ga5') or 0) > 5:
                        football_invalid_form += 1
                        continue
                    # Aussi vérifier last5 — un match isolé >15 trahit
                    for l5 in (c.get('last5') or []):
                        if (l5.get('gf') or 0) > 15 or (l5.get('ga') or 0) > 15:
                            football_invalid_form += 1
                            break
                if ev_has_xg:
                    events_with_xg += 1

    winamax_exact_ratio = (
        round(winamax_exact / winamax_available, 3)
        if winamax_available else None
    )
    winamax_detailed_ratio = round(winamax_detailed / winamax_exact, 3) if winamax_exact else None
    for sb in by_sport.values():
        sb['exact_ratio'] = round(sb['exact'] / sb['available'], 3) if sb['available'] else None
        sb['detailed_ratio'] = round(sb['detailed'] / sb['exact'], 3) if sb['exact'] else None
    return {
        'data_generated_at': data.get('generated_at'),
        'truth_scope': 'all_events',
        'all_winamax_available': all_winamax_available,
        'all_winamax_exact': all_winamax_exact,
        'all_winamax_exact_ratio': round(all_winamax_exact / all_winamax_available, 4) if all_winamax_available else None,
        'quality_scope': 'upcoming_uncompleted_events',
        'total_events': total_events,
        'upcoming_events': upcoming_events,
        'winamax_available': winamax_available,
        'winamax_exact': winamax_exact,
        'winamax_detailed': winamax_detailed,
        'winamax_tournament_only': winamax_tournament_only,
        'winamax_exact_ratio': winamax_exact_ratio,
        'winamax_detailed_ratio': winamax_detailed_ratio,
        'winamax_detail_gap_to_target': round(max(0, 0.50 - (winamax_detailed_ratio or 0)), 3),
        'winamax_detail_fetch_cap_reco': 220 if (winamax_detailed_ratio or 0) < 0.25 else 150 if (winamax_detailed_ratio or 0) < 0.50 else 90,
        'winamax_detail_status': 'ok' if (winamax_detailed_ratio or 0) >= 0.50 else 'topup' if (winamax_detailed_ratio or 0) >= 0.25 else 'urgent',
        'actionable_external_odds': actionable_external_odds,
        'football_invalid_form': football_invalid_form,
        'events_with_xg': events_with_xg,
        'winamax_coverage': {
            'by_sport': by_sport,
            'reasons': dict(sorted(reason_counts.items(), key=lambda kv: kv[1], reverse=True)[:12]),
        },
    }


def main() -> int:
    now = datetime.now(timezone.utc)
    out: dict = {
        'generated_at': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'calculated_at': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'source_of_truth': 'data.js',
        'data_age_min': _data_generated_age_min(),
        'data_file_age_min': _age_min(ROOT / 'data.js'),
        'sources': {},
        'pipeline_lag_per_script': {},
        'pipeline_drift': {},
        'warnings': [],
        # Bug-hunt 2026-05-02 : avant `overall` n'était jamais set, JSON output
        # avait `overall: null` → MCP get_pipeline_status / front-end santé indicator
        # voyaient "?". Maintenant calculé en bout de fonction selon nb warnings.
        'overall': 'unknown',
    }
    for key, fname, counter in SOURCES:
        path = ROOT / fname
        age = _age_min(path)
        if age is None:
            out['sources'][key] = {'age_min': None, 'present': False}
            out['pipeline_lag_per_script'][key] = {
                'script': SOURCE_SCRIPT.get(key, f'{key}.json'),
                'output': fname,
                'age_min': None,
                'threshold_min': STALE_AFTER_MIN.get(key, 60),
                'fast_red_min': 30 if key in FAST_PIPELINE_SOURCES else None,
                'status': 'crit',
            }
            out['warnings'].append(f'{key}: file missing ({fname})')
            continue
        entry: dict = {'age_min': age}
        try:
            d = _read_source_json(path)
            counts = counter(d) or {}
            entry.update(counts)
            src_status = d.get('status') if isinstance(d, dict) else None
            if src_status:
                entry['status'] = src_status
                if src_status not in {'ok', 'watch', 'validated', 'no_explicit_boosts'}:
                    out['warnings'].append(f'{key}: status={src_status}')
            if key == 'team_form' and counts.get('teams') == 0:
                out['warnings'].append('team_form: source vide — signal forme L10 désactivé')
            if key == 'footballdata' and counts.get('rows') == 0:
                out['warnings'].append('footballdata: source vide — historique ligues foot désactivé')
            if key == 'sofascore_events' and counts.get('total') == 0:
                out['warnings'].append('sofascore_events: source vide — matching Sofascore indisponible')
        except Exception as e:
            entry['parse_error'] = str(e)[:120]
            out['warnings'].append(f'{key}: parse error')
        threshold = STALE_AFTER_MIN.get(key, 60)
        if age > threshold:
            out['warnings'].append(f'{key}: stale ({age}min > {threshold}min threshold)')
        out['sources'][key] = entry
        status = 'missing' if age is None else 'ok'
        if age is None:
            status = 'crit'
        elif key in FAST_PIPELINE_SOURCES and age > 30:
            status = 'crit'
            out['warnings'].append(f'{key}: lag pipeline rouge ({age}min > 30min)')
        elif age > threshold:
            status = 'warn'
        out['pipeline_lag_per_script'][key] = {
            'script': SOURCE_SCRIPT.get(key, f'{key}.json'),
            'output': fname,
            'age_min': age,
            'threshold_min': threshold,
            'fast_red_min': 30 if key in FAST_PIPELINE_SOURCES else None,
            'status': status,
        }

    out['pipeline_drift'] = _scan_pipeline_drift()
    if out['pipeline_drift'].get('status') != 'ok':
        out['warnings'].append(
            f'pipeline_drift: {out["pipeline_drift"].get("drift_count", 0)} divergence(s) auto_refresh/refresh.yml'
        )

    if out['data_age_min'] is None:
        out['warnings'].insert(0, 'data.js is missing — pipeline broken')
    elif out['data_age_min'] > 30:
        out['warnings'].insert(0, f'data.js is stale ({out["data_age_min"]}min)')

    # AUDIT-2026-04-27 (P2) — quality_checks sémantiques.
    q = _scan_data_quality()
    if q is not None:
        out['quality_checks'] = q
        out['data_truth'] = {
            'source_of_truth': 'data.js',
            'scope': q.get('truth_scope') or 'all_events',
            'data_generated_at': q.get('data_generated_at'),
            'winamax_available': q.get('all_winamax_available'),
            'winamax_exact': q.get('all_winamax_exact'),
            'winamax_exact_ratio': q.get('all_winamax_exact_ratio'),
            'quality_scope': q.get('quality_scope') or 'upcoming_uncompleted_events',
            'upcoming_winamax_available': q.get('winamax_available'),
            'upcoming_winamax_exact': q.get('winamax_exact'),
            'upcoming_winamax_exact_ratio': q.get('winamax_exact_ratio'),
        }
        # Warnings ciblés (seuils conservatifs, prêts à être ajustés).
        if q['football_invalid_form'] > 0:
            out['warnings'].append(
                f'football_invalid_form_stats: {q["football_invalid_form"]} '
                'competitors avec avg_gf5/ga5 > 5 (contamination cross-sport)'
            )
        # v34.11 — Non bloquant : le frontend privilégie maintenant les cotes
        # Winamax exactes pour les picks actionnables. La présence d'un ancien
        # odds_snapshot externe reste exposée dans quality_checks pour audit,
        # mais ne dégrade plus l'état santé.
        ratio = q['winamax_exact_ratio']
        if ratio is not None and ratio < 0.50:
            out['warnings'].append(
                f'winamax_exact_ratio bas: {ratio:.0%} '
                f'({q["winamax_exact"]}/{q["winamax_available"]})'
            )
        detailed_ratio = q.get('winamax_detailed_ratio')
        if detailed_ratio is not None and detailed_ratio < 0.35:
            out['warnings'].append(
                f'winamax_detailed_ratio bas: {detailed_ratio:.0%} '
                f'({q["winamax_detailed"]}/{q["winamax_exact"]}) — '
                f'top-up détails recommandé cap={q.get("winamax_detail_fetch_cap_reco", 90)}'
            )

    integrity = _load_optional_json(DATA_INTEGRITY_REPORT)
    source_health = _load_optional_json(SOURCE_HEALTH_REPORT)
    traces = _load_optional_json(PIPELINE_TRACES_SUMMARY)
    lineage = _load_optional_json(DATA_LINEAGE_SUMMARY)
    if integrity:
        out['data_integrity'] = {
            'status': integrity.get('status'),
            'schema_version': integrity.get('schema_version'),
            'sources_validated': integrity.get('sources_validated'),
            'sources_ok': integrity.get('sources_ok'),
            'sources_warning': integrity.get('sources_warning'),
            'sources_critical': integrity.get('sources_critical'),
            'quarantine_records': integrity.get('quarantine_records'),
            'anomalies_emitted': integrity.get('anomalies_emitted'),
        }
        if integrity.get('status') == 'critical':
            out['warnings'].append('data_integrity: validation critique')
        elif integrity.get('status') == 'degraded':
            out['warnings'].append('data_integrity: alertes non bloquantes')
    if source_health:
        out['source_health'] = source_health
    if traces:
        out['observability'] = {
            'pipeline_traces': traces,
        }
    if lineage:
        out['data_lineage'] = lineage

    data_section_status = _status_bucket((integrity or {}).get('status'), 'ok' if not out.get('quality_checks', {}).get('football_invalid_form') else 'warning')
    pipeline_section_status = 'healthy'
    if any(str(x).startswith('data.js is stale') for x in out['warnings']):
        pipeline_section_status = 'degraded'
    if out.get('data_age_min') is None or (out.get('data_age_min') or 0) > 240:
        pipeline_section_status = 'critical'
    if out.get('pipeline_drift', {}).get('status') not in {None, 'ok'}:
        pipeline_section_status = 'degraded'

    out['sections'] = {
        'pipeline': {
            'status': pipeline_section_status,
            'data_age_min': out.get('data_age_min'),
            'drift_status': out.get('pipeline_drift', {}).get('status'),
            'sources_red': sum(1 for row in out.get('pipeline_lag_per_script', {}).values() if row.get('status') in {'crit', 'missing'}),
        },
        'data': {
            'status': data_section_status,
            'sources_validated': (integrity or {}).get('sources_validated', 0),
            'quarantine_records': (integrity or {}).get('quarantine_records', 0),
            'lineage_coverage_pct': (lineage or {}).get('coverage_pct'),
        },
        'model': {
            'status': 'healthy' if (ROOT / 'model_versions.json').exists() else 'degraded',
            'versions_file': 'model_versions.json',
        },
        'ui': {
            'status': 'healthy' if (ROOT / 'a11y-report.json').exists() else 'unknown',
            'a11y_report': 'a11y-report.json' if (ROOT / 'a11y-report.json').exists() else None,
        },
        'tests': {
            'status': 'healthy' if (ROOT / 'performance-reports' / 'lighthouse-after' / 'summary.json').exists() else 'unknown',
            'latest_lighthouse': 'performance-reports/lighthouse-after/summary.json' if (ROOT / 'performance-reports' / 'lighthouse-after' / 'summary.json').exists() else None,
        },
    }
    out['global_status'] = _status_bucket(*(section.get('status') for section in out['sections'].values()))
    out['warning_categories'] = categorize_health_warnings(out['warnings'], out.get('data_age_min'))
    out['warning_category_counts'] = {
        key: len(out['warning_categories'].get(key, []))
        for key in WARNING_CATEGORY_KEYS
    }

    # Bug-hunt 2026-05-02 : compute `overall` selon les warnings + data freshness
    n_warnings = len(out['warnings'])
    data_age = out.get('data_age_min')
    if data_age is None or data_age > 240:
        out['overall'] = 'error'   # data > 4h = critique
    elif n_warnings >= 5 or (data_age and data_age > 60):
        out['overall'] = 'warning'
    elif n_warnings == 0 and data_age is not None and data_age <= 30:
        out['overall'] = 'ok'
    else:
        out['overall'] = 'warning'

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    n_sources = len(out['sources'])
    print(f'  health.json : overall={out["overall"]}, {n_sources} sources, {n_warnings} warnings, data {out["data_age_min"]}min old')
    return 0


if __name__ == '__main__':
    sys.exit(main())

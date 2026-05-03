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
    return {'matches_with_odds': len(matches), 'matches_detailed': detailed}

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
    ('league_bias_audit', 'league_bias_audit.json', _count_league_bias_audit),
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
    ('rugby_markets', 'rugby_markets.json', lambda d: {
        'events': len(d.get('events') or []) if isinstance(d, dict) else 0,
        'markets': d.get('markets') or 0 if isinstance(d, dict) else 0,
        'status': d.get('status') if isinstance(d, dict) else 'missing',
    }),
    ('niche_markets', 'niche_markets.json', lambda d: {
        'events': len(d.get('events') or []) if isinstance(d, dict) else 0,
        'markets': d.get('markets') or 0 if isinstance(d, dict) else 0,
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
    'lineups_multisport': 60,   # starter context built from patched data.js
    'xg_coverage': 60,          # product coverage of patched xG fields
    'match_previews': 60,       # top upcoming match explanations
    'league_bias_audit': 60,    # model league reliability guardrail
    'rugby_markets':   6*60,    # derived only when rugby appears in data.js
    'niche_markets':   6*60,    # darts/snooker derived sidecar
    'boosted_odds':    60,      # follows Winamax market refresh
    'footballdata':    24*60,  # daily fetch
    'clv_history':     60,
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
    'lineups_multisport': 'scripts/build_lineups_multisport.py',
    'xg_coverage': 'scripts/build_xg_coverage.py',
    'match_previews': 'scripts/fetch_match_previews.py',
    'league_bias_audit': 'scripts/build_league_bias_audit.py',
    'rugby_markets': 'scripts/build_rugby_markets.py',
    'niche_markets': 'scripts/build_niche_markets.py',
    'boosted_odds': 'scripts/detect_boosted_odds.py',
    'footballdata': 'scripts/fetch_footballdata.py',
    'clv_history': 'scripts/compute_clv.py',
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
    if not path.exists():
        return None
    mtime = path.stat().st_mtime
    now = datetime.now(timezone.utc).timestamp()
    return max(0, int((now - mtime) / 60))


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
            if ev.get('completed') or ev.get('live'):
                continue
            upcoming_events += 1

            wnx = ev.get('winamax') or {}
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
        'data_age_min': _age_min(ROOT / 'data.js'),
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
            d = json.loads(path.read_text(encoding='utf-8'))
            counts = counter(d) or {}
            entry.update(counts)
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

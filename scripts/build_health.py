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
    return {'matches_with_odds': len(d.get('matches') or {})}

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
    ('fbref_xg',        'fbref_xg.json',        lambda d: {'leagues': len(d.get('leagues') or {}) if isinstance(d, dict) else 0}),
    ('sofascore_events', 'sofascore_events.json', lambda d: {'total': d.get('total') or sum(len(v) for v in (d.get('events') or {}).values()) if isinstance(d, dict) else 0}),
    ('team_form',       'team_form.json',       lambda d: {'teams': len(d.get('teams') or {}) if isinstance(d, dict) else 0}),
    ('footballdata',    'footballdata.json',    lambda d: {'rows': len(d.get('rows') or []) if isinstance(d, dict) else 0}),
]

# Soft thresholds (minutes) above which a source is flagged stale. These
# match the cadences in refresh.yml — a source running every 2h is allowed
# to be 3h old before warning.
STALE_AFTER_MIN = {
    'winamax_catalog': 15,
    'winamax_markets': 15,
    'injuries_soccer': 180,    # 2h cadence
    'lineups_soccer':  180,    # 2h cadence
    'team_stats':      300,    # 4h cadence
    'clubelo':         24*60,  # daily cadence
    'weather':         60,
    'referees_soccer': 8*60,   # 6h cadence
    'fbref_xg':        6*60,   # 6h self-throttle
    'sofascore_events': 30,    # cron tick chaque 5min, max 30min stale
    'team_form':       6*60,   # 6h self-throttle
    'footballdata':    24*60,  # daily fetch
}


def _age_min(path: Path) -> int | None:
    if not path.exists():
        return None
    mtime = path.stat().st_mtime
    now = datetime.now(timezone.utc).timestamp()
    return max(0, int((now - mtime) / 60))


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
    winamax_tournament_only = 0
    actionable_external_odds = 0  # exact existe MAIS snapshot externe
    football_invalid_form = 0  # avg_gf5 ou avg_ga5 > 5 = NBA-level

    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            total_events += 1
            if ev.get('completed') or ev.get('live'):
                continue
            upcoming_events += 1

            wnx = ev.get('winamax') or {}
            avail = wnx.get('available') is True
            mid = wnx.get('match_id')
            mks = wnx.get('markets') or {}
            has_1n2 = isinstance(mks.get('1n2'), dict) and mks['1n2'].get('home') is not None
            is_exact = bool(avail and mid and has_1n2)
            if avail:
                winamax_available += 1
                if is_exact:
                    winamax_exact += 1
                else:
                    winamax_tournament_only += 1

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
                for c in (ev.get('competitors') or []):
                    fs = c.get('form_stats') or {}
                    if (fs.get('avg_gf5') or 0) > 5 or (fs.get('avg_ga5') or 0) > 5:
                        football_invalid_form += 1
                        continue
                    # Aussi vérifier last5 — un match isolé >15 trahit
                    for l5 in (c.get('last5') or []):
                        if (l5.get('gf') or 0) > 15 or (l5.get('ga') or 0) > 15:
                            football_invalid_form += 1
                            break

    winamax_exact_ratio = (
        round(winamax_exact / winamax_available, 3)
        if winamax_available else None
    )
    return {
        'total_events': total_events,
        'upcoming_events': upcoming_events,
        'winamax_available': winamax_available,
        'winamax_exact': winamax_exact,
        'winamax_tournament_only': winamax_tournament_only,
        'winamax_exact_ratio': winamax_exact_ratio,
        'actionable_external_odds': actionable_external_odds,
        'football_invalid_form': football_invalid_form,
    }


def main() -> int:
    now = datetime.now(timezone.utc)
    out: dict = {
        'generated_at': now.strftime('%Y-%m-%dT%H:%M:%SZ'),
        'data_age_min': _age_min(ROOT / 'data.js'),
        'sources': {},
        'warnings': [],
    }
    for key, fname, counter in SOURCES:
        path = ROOT / fname
        age = _age_min(path)
        if age is None:
            out['sources'][key] = {'age_min': None, 'present': False}
            out['warnings'].append(f'{key}: file missing ({fname})')
            continue
        entry: dict = {'age_min': age}
        try:
            d = json.loads(path.read_text(encoding='utf-8'))
            counts = counter(d) or {}
            entry.update(counts)
        except Exception as e:
            entry['parse_error'] = str(e)[:120]
            out['warnings'].append(f'{key}: parse error')
        threshold = STALE_AFTER_MIN.get(key, 60)
        if age > threshold:
            out['warnings'].append(f'{key}: stale ({age}min > {threshold}min threshold)')
        out['sources'][key] = entry

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
        if q['actionable_external_odds'] > 0:
            out['warnings'].append(
                f'actionable_external_odds: {q["actionable_external_odds"]} '
                'events ont odds_snapshot externe alors que Winamax exact existe'
            )
        ratio = q['winamax_exact_ratio']
        if ratio is not None and ratio < 0.50:
            out['warnings'].append(
                f'winamax_exact_ratio bas: {ratio:.0%} '
                f'({q["winamax_exact"]}/{q["winamax_available"]})'
            )

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    n_sources = len(out['sources'])
    n_warnings = len(out['warnings'])
    print(f'  health.json : {n_sources} sources, {n_warnings} warnings, data {out["data_age_min"]}min old')
    return 0


if __name__ == '__main__':
    sys.exit(main())

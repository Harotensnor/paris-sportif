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

def _count_clubelo(d):
    if not isinstance(d, dict): return None
    return {'clubs': len(d.get('ratings') or d.get('clubs') or d)}

SOURCES = [
    ('winamax_catalog', 'winamax_catalog.json', _count_winamax_catalog),
    ('winamax_markets', 'winamax_markets.json', _count_winamax_markets),
    ('injuries_soccer', 'injuries_soccer.json', _count_events),
    ('lineups_soccer',  'lineups_soccer.json',  _count_events),
    ('team_stats',      'team_stats.json',      lambda d: {'teams': len(d.get('teams') or {}) if isinstance(d, dict) else 0}),
    ('clubelo',         'clubelo.json',         _count_clubelo),
    ('weather',         'weather.json',         lambda d: {'events': len(d.get('forecasts') or {}) if isinstance(d, dict) else 0}),
    ('referees_soccer', 'referees_soccer.json', _count_events),
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
}


def _age_min(path: Path) -> int | None:
    if not path.exists():
        return None
    mtime = path.stat().st_mtime
    now = datetime.now(timezone.utc).timestamp()
    return max(0, int((now - mtime) / 60))


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

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    n_sources = len(out['sources'])
    n_warnings = len(out['warnings'])
    print(f'  health.json : {n_sources} sources, {n_warnings} warnings, data {out["data_age_min"]}min old')
    return 0


if __name__ == '__main__':
    sys.exit(main())

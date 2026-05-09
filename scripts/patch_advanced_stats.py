#!/usr/bin/env python3
"""
patch_advanced_stats.py — Inject NBA/MLB/NHL advanced team stats on competitors.

v52.5 — Reads the 3 JSONs produced by fetch_advanced_stats.py and writes
`competitor.{nba,mlb,nhl}_advanced` on each event in data.js. Frontend
legacy-app.js v51.6 already has the consumer branches wired (eFG NBA,
OPS MLB, PP%/PK%/FOW% NHL) but they were dormant since the source data
was missing.

Lookup key : competitor.abbr (uppercase). Fallback to normalized team
name if abbr missing.

Idempotent. ~0.4s.
"""
from __future__ import annotations
import json
import re
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import _norm

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
SOURCES = {
    'nba': {
        'sport_match': {'basketball'},
        'league_match': {'nba'},
        'json_path': ROOT / 'nba_advanced.json',
        'field': 'nba_advanced',
    },
    'mlb': {
        'sport_match': {'baseball'},
        'league_match': {'mlb'},
        'json_path': ROOT / 'mlb_advanced.json',
        'field': 'mlb_advanced',
    },
    'nhl': {
        'sport_match': {'hockey'},
        'league_match': {'nhl'},
        'json_path': ROOT / 'nhl_advanced.json',
        'field': 'nhl_advanced',
    },
}


def load_data() -> dict:
    txt = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[patch_advanced_stats] could not parse data.js', file=sys.stderr)
        sys.exit(1)
    return json.loads(m.group(1))


def save_data(d: dict) -> None:
    DATA_JS.write_text(
        'window.PRONOSTICS_DATA = ' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n',
        encoding='utf-8'
    )


def load_source(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        with path.open('r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}
    return data.get('teams') or {}


def main() -> int:
    sources = {}
    name_to_abbr = {}  # normalized name → abbr (for fallback lookup)
    for sport, cfg in SOURCES.items():
        teams = load_source(cfg['json_path'])
        sources[sport] = teams
        for abbr, payload in teams.items():
            n = _norm(payload.get('team_name') or '')
            if n:
                name_to_abbr.setdefault((sport, n), abbr)
    if not any(sources.values()):
        print('[patch_advanced_stats] all sources empty, skip', flush=True)
        return 0

    data = load_data()
    days = data.get('days') or {}
    stats = {sport: {'matched': 0, 'unmatched': 0} for sport in SOURCES}

    for _day, evs in days.items():
        for ev in (evs or []):
            sport = ev.get('sport') or ''
            league = (ev.get('league_code') or '').lower()
            for sport_key, cfg in SOURCES.items():
                if sport not in cfg['sport_match']:
                    continue
                if cfg['league_match'] and league not in cfg['league_match']:
                    continue
                teams_dict = sources.get(sport_key) or {}
                if not teams_dict:
                    continue
                for c in (ev.get('competitors') or []):
                    abbr = (c.get('abbr') or '').upper()
                    payload = teams_dict.get(abbr)
                    if not payload:
                        # Fallback : norm name lookup
                        n = _norm(c.get('name') or '')
                        if n:
                            alt_abbr = name_to_abbr.get((sport_key, n))
                            if alt_abbr:
                                payload = teams_dict.get(alt_abbr)
                    if payload:
                        # Strip team_name from injected payload (already on c.name)
                        c[cfg['field']] = {k: v for k, v in payload.items() if k != 'team_name'}
                        stats[sport_key]['matched'] += 1
                    else:
                        stats[sport_key]['unmatched'] += 1
                break  # only one sport per event

    save_data(data)
    parts = [f"{s}: {v['matched']}/{v['matched']+v['unmatched']} matched" for s, v in stats.items()]
    print(f"[{datetime.now():%H:%M:%S}] patch_advanced_stats: " + " · ".join(parts), flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())

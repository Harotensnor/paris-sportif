#!/usr/bin/env python3
"""Attach last-5 aggregate stats from team_stats.json to each competitor in data.js.

Adds the following fields to every `competitor` on every non-completed event
that has a matching team entry in team_stats.json::

    competitor.form_stats = {
        'played5': int, 'wins5': int, 'draws5': int, 'losses5': int,
        'gf5': int, 'ga5': int,
        'avg_gf5': float, 'avg_ga5': float,
        'cleans5': int, 'failed_to_score5': int,
    }
    competitor.last5 = [{date, ha, opp, gf, ga, result}, ...]

Existing `competitor.form` (e.g. "WWDLW") is NOT overwritten — we just add
a richer structured sibling so the JS side can surface goal differentials
and the modal can render the actual scoreline list.

Why split fetch/patch: follows the same pattern as `fetch_winamax_catalog.py +
patch_winamax.py` and `fetch_injuries_soccer.py + patch_injuries_soccer.py`.
Fetch is expensive (ESPN API, runs on cron); patch is fast and runs every tick.
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data.js'
STATS_PATH = ROOT / 'team_stats.json'


def load_data() -> dict:
    txt = DATA_PATH.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[patch_team_stats] could not parse data.js', file=sys.stderr)
        sys.exit(1)
    return json.loads(m.group(1))


def save_data(d: dict) -> None:
    DATA_PATH.write_text(
        'window.PRONOSTICS_DATA = ' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n',
        encoding='utf-8',
    )


def main() -> int:
    if not STATS_PATH.exists():
        print(f'[patch_team_stats] {STATS_PATH.name} missing — run fetch_team_stats.py first')
        return 0  # non-fatal; pipeline continues

    stats = json.loads(STATS_PATH.read_text(encoding='utf-8'))
    teams: dict[str, dict] = stats.get('teams') or {}
    if not teams:
        print('[patch_team_stats] empty stats — nothing to patch')
        return 0

    d = load_data()
    patched_events = 0
    patched_competitors = 0
    total_competitors = 0
    for day_key, evs in (d.get('days') or {}).items():
        for ev in evs:
            if ev.get('completed'):
                continue
            ev_changed = False
            for c in ev.get('competitors') or []:
                total_competitors += 1
                tid = str(c.get('id') or '')
                s = teams.get(tid)
                if not s or s.get('played5', 0) == 0:
                    continue
                c['form_stats'] = {
                    'played5': s['played5'],
                    'wins5': s['wins5'], 'draws5': s['draws5'], 'losses5': s['losses5'],
                    'gf5': s['gf5'], 'ga5': s['ga5'],
                    'avg_gf5': s['avg_gf5'], 'avg_ga5': s['avg_ga5'],
                    'cleans5': s['cleans5'], 'failed_to_score5': s['failed_to_score5'],
                }
                c['last5'] = s.get('last5') or []
                patched_competitors += 1
                ev_changed = True
            if ev_changed:
                patched_events += 1

    save_data(d)
    print(f'[patch_team_stats] patched {patched_competitors}/{total_competitors} competitors '
          f'across {patched_events} events')
    return 0


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""
snapshot_odds.py — Freeze each match's pre-kickoff odds into `ev.odds_snapshot`.

ESPN removes the odds array once a match is completed, which means our
`predictMatch()` falls back to a static 55%-home prior for every finished
match, producing a meaningless "23/26 = 47% réussite" bilan that actually
just measures the home-team win rate rather than the model's picks.

This script runs every tick (in auto_refresh.py / refresh.yml) and, for every
upcoming event, copies `ev.odds` (and `ev.moneyline_*` fields) into
`ev.odds_snapshot`. Once written, the snapshot is NEVER overwritten — so
after the match ends it still holds the pre-match number we used to price
the pick.

Output shape on each event:
    ev.odds_snapshot = {
        'captured_at': ISO8601,
        'home': 1.85, 'draw': 3.40, 'away': 4.20,
        'provider': 'DraftKings',
    }

The JS side (`predictMatch` in pronostics.html) now reads `odds_snapshot`
as a fallback when `ev.odds` is empty, which lets us compute real
retrospective picks.
"""
import json, re, sys
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data.js'


def load_data():
    txt = DATA_PATH.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[snapshot_odds] could not parse data.js', file=sys.stderr)
        sys.exit(1)
    return json.loads(m.group(1))


def save_data(d):
    DATA_PATH.write_text(
        'window.PRONOSTICS_DATA = ' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n',
        encoding='utf-8'
    )


def best_odds_from_array(odds_arr):
    """Return (home, draw, away, provider) as the highest decimal odd we have.
    Works on both the decimal-odd shape and the ESPN moneyline (American) shape."""
    if not odds_arr:
        return None, None, None, None
    best_h = best_d = best_a = None
    prov = None
    for o in odds_arr:
        # Decimal shape (set by patch_odds.py / fetch_tennis_odds.py etc.)
        h = o.get('home')
        a = o.get('away')
        dr = o.get('draw')
        # American shape (ESPN core odds)
        if h is None and o.get('homeML') is not None:
            h = _ml_to_dec(o['homeML'])
        if a is None and o.get('awayML') is not None:
            a = _ml_to_dec(o['awayML'])
        if dr is None and o.get('drawML') is not None:
            dr = _ml_to_dec(o['drawML'])
        if h is not None and (best_h is None or h > best_h):
            best_h = h; prov = o.get('provider') or prov
        if a is not None and (best_a is None or a > best_a):
            best_a = a
        if dr is not None and (best_d is None or dr > best_d):
            best_d = dr
    return best_h, best_d, best_a, prov


def _ml_to_dec(ml):
    try:
        ml = float(ml)
    except (TypeError, ValueError):
        return None
    if ml > 0:
        return 1 + ml / 100
    if ml < 0:
        return 1 + 100 / abs(ml)
    return None


def snapshot(event, now_iso):
    """Capture current odds into ev.odds_snapshot (idempotent — only writes if
    snapshot missing AND match is still upcoming AND odds are real)."""
    # Don't touch events that already have a snapshot
    if event.get('odds_snapshot') and (event['odds_snapshot'].get('home') or event['odds_snapshot'].get('away')):
        return False
    # Don't snapshot live/completed matches — their odds are stale or gone
    status = event.get('status', '') or ''
    if event.get('completed') or 'IN_PROGRESS' in status or 'HALF' in status or 'FINAL' in status:
        return False
    h, d, a, prov = best_odds_from_array(event.get('odds') or [])
    if not h and not a:
        return False
    event['odds_snapshot'] = {
        'captured_at': now_iso,
        'home': round(float(h), 3) if h else None,
        'draw': round(float(d), 3) if d else None,
        'away': round(float(a), 3) if a else None,
        'provider': prov,
    }
    return True


def main():
    d = load_data()
    now_iso = datetime.now(timezone.utc).isoformat()
    new_snaps = 0
    total = 0
    for day_key, events in d.get('days', {}).items():
        for ev in events:
            total += 1
            if snapshot(ev, now_iso):
                new_snaps += 1
    save_data(d)
    print(f'[snapshot_odds] total={total} new_snapshots={new_snaps}')


if __name__ == '__main__':
    main()

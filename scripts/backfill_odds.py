#!/usr/bin/env python3
"""
backfill_odds.py — One-shot: populate odds_snapshot on events in data.js
from the pre-match odds archive at odds_history.jsonl.

Use this when snapshot_odds.py was added after some matches had already
completed (so they never had their pre-match odds captured into data.js).
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data.js'
HIST = ROOT / 'odds_history.jsonl'


def _ml_to_dec(ml):
    try: ml = float(ml)
    except (TypeError, ValueError): return None
    if ml > 0: return 1 + ml / 100
    if ml < 0: return 1 + 100 / abs(ml)
    return None


def main():
    if not HIST.exists():
        print('[backfill] no odds_history.jsonl — nothing to do')
        return

    # Index archive by event id (keep earliest capture per id)
    by_id = {}
    for line in HIST.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line: continue
        try:
            r = json.loads(line)
        except json.JSONDecodeError as e:
            print(f"[backfill] skip malformed line: {e}", file=sys.stderr)
            continue
        eid = str(r.get('id') or '')
        if not eid: continue
        # Prefer earliest (most pre-match)
        if eid not in by_id:
            by_id[eid] = r

    # Load data.js
    txt = DATA_PATH.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[backfill] could not parse data.js'); return
    d = json.loads(m.group(1))

    filled = 0
    already = 0
    no_archive = 0
    for day, events in d.get('days', {}).items():
        for ev in events:
            if ev.get('odds_snapshot'):
                already += 1
                continue
            eid = str(ev.get('id') or '')
            rec = by_id.get(eid)
            if not rec:
                no_archive += 1
                continue
            h = _ml_to_dec(rec.get('homeML'))
            a = _ml_to_dec(rec.get('awayML'))
            dr = _ml_to_dec(rec.get('drawML'))
            if not h and not a:
                continue
            ev['odds_snapshot'] = {
                'captured_at': rec.get('captured_at'),
                'home': round(h, 3) if h else None,
                'draw': round(dr, 3) if dr else None,
                'away': round(a, 3) if a else None,
                'provider': rec.get('provider'),
            }
            filled += 1

    payload = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
    DATA_PATH.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')
    print(f'[backfill] filled={filled} already_had={already} no_archive_row={no_archive}')


if __name__ == '__main__':
    main()

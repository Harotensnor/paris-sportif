#!/usr/bin/env python3
"""Inject team_form.json (last 5 W/L) into competitors[].form for non-football
sports. Cheap (~50ms), idempotent, runs on every cron tick after patch_winamax."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
HTML = ROOT / 'pronostics.html'
FORM = ROOT / 'team_form.json'


def main():
    if not DATA_JS.exists() or not FORM.exists():
        print('[patch_team_form] missing data.js or team_form.json, skipping.')
        return
    cache = json.loads(FORM.read_text(encoding='utf-8'))
    if not cache:
        print('[patch_team_form] empty cache, nothing to patch.')
        return
    text = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL)
    if not m:
        print('[patch_team_form] could not parse data.js')
        return
    data = json.loads(m.group(1))

    patched = 0
    for day, evs in (data.get('days') or {}).items():
        for ev in evs or []:
            sport = ev.get('sport')
            if sport == 'football':  # already shipped natively by ESPN
                continue
            code = ev.get('league_code')
            for c in ev.get('competitors') or []:
                tid = str(c.get('id') or '')
                if not tid:
                    continue
                key = f'{sport}:{code}:{tid}'
                info = cache.get(key)
                if not info:
                    continue
                # Only overwrite if currently empty/null — preserve any future
                # ESPN-native form payload that might appear.
                if not c.get('form'):
                    c['form'] = info.get('form')
                    patched += 1
                # Also stash detail for tooltip / page detail.
                if not c.get('last5'):
                    c['last5'] = info.get('last5')

    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')
    # Re-inline into html so that file:// fallback (offline / first paint) sees it.
    # v33.28 — HTML rewrite déplacé dans scripts/inject_data_in_html.py
    # (1 seul appel à la fin du pipeline plutôt que 12 regex sur ~13500 lignes)
    print(f'[patch_team_form] patched {patched} competitor.form entries', flush=True)


if __name__ == '__main__':
    main()

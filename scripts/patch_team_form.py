#!/usr/bin/env python3
"""Inject team_form.json (last 10 W/L) into competitors.

Cheap (~50ms), idempotent, runs on every cron tick after patch_winamax.
Football keeps its ESPN-native L5 in ``form`` when present, but gains the
stable L10 fields used by the model and health checks.
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE)) if str(HERE) not in sys.path else None
from io_compressed import read_json as _read_json_any, exists_any as _exists_any

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
HTML = ROOT / 'pronostics.html'
FORM = ROOT / 'team_form.json'


def main():
    # AUDIT 2026-05-08 v40 — accepte .gz ou plain.
    if not DATA_JS.exists() or not _exists_any(FORM):
        print('[patch_team_form] missing data.js or team_form.json(.gz), skipping.')
        return
    cache = _read_json_any(FORM)
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
                    c['form'] = info.get('form') or info.get('form5')
                    patched += 1
                # Extension 2026-05-01 — Théo a demandé "forme sur 10 derniers
                # matchs". On expose `form10` (10 chars) en plus du `form5`
                # (5 chars) pour le frontend qui peut afficher l'un ou l'autre.
                # Si form (string) >= 6 chars c'est déjà le L10, on copy aussi.
                if info.get('form') and len(str(info['form'])) >= 6:
                    c['form10'] = info['form']
                    c['team_form_l10'] = info['form']
                if info.get('form5'):
                    c['team_form_l5'] = info['form5']
                # Also stash detail for tooltip / page detail.
                if not c.get('last5'):
                    c['last5'] = info.get('last5')
                if info.get('last10') and not c.get('last10'):
                    c['last10'] = info.get('last10')

    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')
    # Re-inline into html so that file:// fallback (offline / first paint) sees it.
    # v33.28 — HTML rewrite déplacé dans scripts/inject_data_in_html.py
    # (1 seul appel à la fin du pipeline plutôt que 12 regex sur ~13500 lignes)
    print(f'[patch_team_form] patched {patched} competitor.form entries', flush=True)


if __name__ == '__main__':
    main()

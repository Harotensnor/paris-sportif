#!/usr/bin/env python3
"""Attach Winamax multi-market odds to each event in data.js.

Runs AFTER ``patch_winamax.py`` (which sets ``ev.winamax.match_id``) and
uses ``winamax_markets.json`` (produced by ``fetch_winamax_markets.py``)
as the lookup table.

Sets ``ev.winamax.markets = {...}`` in-place for every event whose
Winamax match_id appears in the markets file. Events without a match in
the file are left unchanged (backward-compatible).

Idempotent.
"""
from __future__ import annotations
import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT     = Path(__file__).resolve().parent.parent
DATA_JS  = ROOT / 'data.js'
HTML     = ROOT / 'pronostics.html'
MARKETS  = ROOT / 'winamax_markets.json'


def main() -> int:
    if not MARKETS.exists():
        print(f'WARN: {MARKETS} absent — nothing to patch. Skip.')
        return 0
    if not DATA_JS.exists():
        print(f'ERROR: {DATA_JS} absent.')
        return 1

    markets_doc = json.loads(MARKETS.read_text(encoding='utf-8'))
    markets_by_mid = markets_doc.get('matches') or {}
    if not markets_by_mid:
        print('WARN: winamax_markets.json has no matches. Skip.')
        return 0

    text = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL)
    if not m:
        print('ERROR: could not parse data.js')
        return 1
    data = json.loads(m.group(1))
    days = data.get('days', {}) or {}

    stats = {'events': 0, 'matched': 0}
    for day, evs in days.items():
        for ev in evs:
            stats['events'] += 1
            wx = ev.get('winamax') or {}
            mid = wx.get('match_id')
            if mid is None:
                continue
            mk = markets_by_mid.get(str(mid))
            if not mk:
                continue
            # Attach only the odds subtree (clean, no redundancy)
            wx['markets'] = mk.get('odds') or {}
            wx['markets_fetched_at'] = mk.get('fetched_at')
            ev['winamax'] = wx
            stats['matched'] += 1

    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')

    # Also inline into pronostics.html (same pattern as patch_winamax.py)
    if HTML.exists():
        html_text = HTML.read_text(encoding='utf-8')
        new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload};\n</script>'
        html_text = re.sub(r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
                           new_block, html_text, count=1, flags=re.DOTALL)
        HTML.write_text(html_text, encoding='utf-8')

    print(f'[{datetime.now():%H:%M:%S}] patch_winamax_markets: '
          f'{stats["matched"]}/{stats["events"]} events enriched with Winamax markets')
    return 0


if __name__ == '__main__':
    sys.exit(main())

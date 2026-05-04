#!/usr/bin/env python3
"""Patch smart_money_signals.json into data.js events."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
SIDE = ROOT / 'smart_money_signals.json'


def load_data():
    raw = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', raw, re.DOTALL)
    if not m:
        raise RuntimeError('PRONOSTICS_DATA not found in data.js')
    return json.loads(m.group(1))


def main():
    if not SIDE.exists():
        print('[patch_smart_money] sidecar absent, skip')
        return 0
    payload = json.loads(SIDE.read_text(encoding='utf-8'))
    signals = payload.get('signals') if isinstance(payload, dict) else payload
    if not isinstance(signals, dict):
        signals = {}
    data = load_data()
    patched = 0
    cleared = 0
    for events in (data.get('days') or {}).values():
        for ev in events or []:
            if ev.pop('smart_money', None) is not None:
                cleared += 1
            ev.pop('market_uncertain', None)
            sig = signals.get(str(ev.get('id') or ''))
            if sig:
                ev['smart_money'] = sig
                if isinstance(sig.get('market_uncertain'), dict):
                    ev['market_uncertain'] = sig['market_uncertain']
                patched += 1
    DATA_JS.write_text(
        'window.PRONOSTICS_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';',
        encoding='utf-8'
    )
    print(f'[patch_smart_money] patched={patched} cleared={cleared}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

#!/usr/bin/env python3
"""Patch smart_money_signals.json into data.js events."""
import json
from pathlib import Path

try:
    from scripts._data_io import load_data_js, save_data_js
except ModuleNotFoundError:
    from _data_io import load_data_js, save_data_js

ROOT = Path(__file__).resolve().parent.parent
SIDE = ROOT / 'smart_money_signals.json'


def load_data():
    return load_data_js()


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
    save_data_js(data)
    print(f'[patch_smart_money] patched={patched} cleared={cleared}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

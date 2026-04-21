#!/usr/bin/env python3
"""Attach weather.json forecasts to each football event in data.js.

Mirrors patch_clubelo.py / patch_team_stats.py. Runs every tick; idempotent.

Writes `ev.weather` on the event:
    ev.weather = {
        'city': 'Paris', 'temp_c': 14, 'precip_mm': 0.3,
        'wind_kmh': 18, 'weather_code': 51
    }

The JS side consumes `ev.weather` to nudge Poisson O/U for heavy rain
(>3mm/h) or strong wind (>25 km/h), both empirically correlated with
lower-scoring football matches.
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data.js'
WEATHER_PATH = ROOT / 'weather.json'


def load_data() -> dict:
    txt = DATA_PATH.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[patch_weather] could not parse data.js', file=sys.stderr)
        sys.exit(1)
    return json.loads(m.group(1))


def save_data(d: dict) -> None:
    DATA_PATH.write_text(
        'window.PRONOSTICS_DATA = ' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n',
        encoding='utf-8',
    )


def main() -> int:
    if not WEATHER_PATH.exists():
        print(f'[patch_weather] {WEATHER_PATH.name} missing — run fetch_weather.py first')
        return 0
    try:
        wdata = json.loads(WEATHER_PATH.read_text(encoding='utf-8'))
    except Exception as e:
        print(f'[patch_weather] read failed: {e}', file=sys.stderr)
        return 0
    matches = wdata.get('matches') or {}
    if not matches:
        print('[patch_weather] no forecasts to apply')
        return 0

    d = load_data()
    patched = 0
    for _day, evs in (d.get('days') or {}).items():
        for ev in evs or []:
            if ev.get('sport') != 'football':
                continue
            mid = str(ev.get('id') or '')
            if not mid:
                continue
            w = matches.get(mid)
            if not w:
                continue
            ev['weather'] = {
                'city': w.get('city'),
                'temp_c': w.get('temp_c'),
                'precip_mm': w.get('precip_mm'),
                'wind_kmh': w.get('wind_kmh'),
                'weather_code': w.get('weather_code'),
            }
            patched += 1

    save_data(d)
    print(f'[patch_weather] patched {patched} football events')
    return 0


if __name__ == '__main__':
    sys.exit(main())

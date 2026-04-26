#!/usr/bin/env python3
"""
patch_mlb_pitchers.py — Inject probable pitchers into MLB events.

Reads `mlb_pitchers.json` (built by fetch_mlb_pitchers.py) and matches
each baseball event in data.js to a (home_team, away_team, date) entry.

Schema attached :

    event.mlb_pitchers = {
      "home": { "name": "Chris Sale", "era": 3.20, "whip": 1.10,
                "k9": 9.5, "bb9": 2.4, "hr9": 0.9, "ip": 75.0, "hand": "L" },
      "away": { ... }
    }

predictMatch consumes this as a non-market signal : ERA differential
+ K/9 differential drive a Bayesian-shrunk pH probability.

Idempotent. ~0.2s.
"""
from __future__ import annotations
import json
import re
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import _norm, _name_tokens

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
HTML = ROOT / 'pronostics.html'
PITCHERS = ROOT / 'mlb_pitchers.json'


def load_data():
    txt = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[patch_mlb_pitchers] could not parse data.js', file=sys.stderr)
        sys.exit(1)
    return json.loads(m.group(1))


def get_sides(ev: dict) -> tuple[str, str]:
    comps = ev.get('competitors') or []
    home = next((c for c in comps if c.get('home_away') == 'home'), None)
    away = next((c for c in comps if c.get('home_away') == 'away'), None)
    if not home and len(comps) >= 1:
        home = comps[0]
    if not away and len(comps) >= 2:
        away = comps[1]
    return (
        (home.get('name') or '') if home else '',
        (away.get('name') or '') if away else '',
    )


def main() -> int:
    if not PITCHERS.exists():
        print('[patch_mlb_pitchers] mlb_pitchers.json missing — skip.', flush=True)
        return 0
    src = json.loads(PITCHERS.read_text(encoding='utf-8'))
    matches: dict[str, dict] = src.get('matches') or {}
    if not matches:
        print('[patch_mlb_pitchers] no pitcher data, skip.', flush=True)
        return 0

    # Token reverse-index over MLB Stats API team names for soft fallback
    # (ESPN uses different team-name forms occasionally — e.g. "LA Angels"
    # vs MLB's "Los Angeles Angels").
    by_token: dict[str, set[str]] = {}
    for key, m in matches.items():
        for tok in _name_tokens(m.get('home_team', '')):
            by_token.setdefault(tok, set()).add(key)

    data = load_data()
    days = data.get('days') or {}
    stats = {'mlb_events': 0, 'attached': 0}

    for _day, evs in days.items():
        for ev in (evs or []):
            if ev.get('sport') != 'baseball':
                continue
            league_code = ev.get('league_code') or ''
            if league_code and league_code != 'mlb':
                continue
            stats['mlb_events'] += 1
            home_name, away_name = get_sides(ev)
            if not home_name or not away_name:
                continue
            iso_date = (ev.get('date') or '')[:10]
            if not iso_date:
                continue
            key = f'{_norm(home_name)}|{_norm(away_name)}|{iso_date}'
            entry = matches.get(key)
            if not entry:
                # Fallback : token match home_team + same date + away token overlap
                home_tokens = _name_tokens(home_name)
                away_tokens = _name_tokens(away_name)
                candidates = set()
                for tok in home_tokens:
                    candidates.update(by_token.get(tok, set()))
                for cand_key in candidates:
                    cand = matches[cand_key]
                    if cand.get('date') != iso_date:
                        continue
                    cand_away_tokens = _name_tokens(cand.get('away_team', ''))
                    if home_tokens & _name_tokens(cand.get('home_team', '')) and away_tokens & cand_away_tokens:
                        entry = cand
                        break
            if not entry:
                continue
            payload = {}
            if entry.get('home'):
                payload['home'] = entry['home']
            if entry.get('away'):
                payload['away'] = entry['away']
            if payload:
                ev['mlb_pitchers'] = payload
                stats['attached'] += 1

    payload_str = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload_str};\n', encoding='utf-8')
    if HTML.exists():
        html_text = HTML.read_text(encoding='utf-8')
        new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload_str};\n</script>'
        html_text = re.sub(r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
                           new_block, html_text, count=1, flags=re.DOTALL)
        HTML.write_text(html_text, encoding='utf-8')

    print(f'[{datetime.now():%H:%M:%S}] patch_mlb_pitchers: '
          f'{stats["mlb_events"]} MLB events scanned · '
          f'{stats["attached"]} with pitcher data', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())

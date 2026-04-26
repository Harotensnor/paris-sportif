#!/usr/bin/env python3
"""
patch_footballdata.py — Inject `footballdata.json` into data.js events.

Two layers of enrichment :

1. **League calibration** : every football event in a covered league gets
   `ev.fd_calibration` = { avg_goals, btts_rate, over25_rate, home_wr,
   draw_rate, away_wr } — used by the JS for league-specific shrinkage of
   the Poisson xG prior + better OU 2.5 / BTTS calibration.

2. **Closing odds** for COMPLETED matches we can match by name+date :
   `ev.fd_closing_odds` = { b365: {h,d,a}, pinnacle: {h,d,a}, avg: {h,d,a}, ou25: {o,u} }
   — fuel for Closing Line Value computation in backtest_v2.

Matching strategy : (home_norm, away_norm, date YYYY-MM-DD). Names are
normalized via `winamax_map._norm` (lowercase, strip accents, alphanum).
Soft fallback when team names differ (e.g. "Man United" vs "Manchester
United") via the existing alias dict in winamax_map. We don't try too
hard; an unmatched closing-odds entry is silently dropped.

Idempotent. ~0.5s.
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
FOOTBALLDATA = ROOT / 'footballdata.json'


def load_data():
    txt = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[patch_footballdata] could not parse data.js', file=sys.stderr)
        sys.exit(1)
    return json.loads(m.group(1))


def get_sides(ev: dict) -> tuple[str, str]:
    """Return ESPN-side (home_name, away_name) lowercased."""
    comps = ev.get('competitors') or []
    home = next((c for c in comps if c.get('home_away') == 'home'), None)
    away = next((c for c in comps if c.get('home_away') == 'away'), None)
    if not home and len(comps) >= 1:
        home = comps[0]
    if not away and len(comps) >= 2:
        away = comps[1]
    return (
        (home.get('name') or home.get('short') or '') if home else '',
        (away.get('name') or away.get('short') or '') if away else '',
    )


def main() -> int:
    if not FOOTBALLDATA.exists():
        print(f'[patch_footballdata] {FOOTBALLDATA.name} missing — run '
              f'fetch_footballdata.py first. Skip.', flush=True)
        return 0
    fd = json.loads(FOOTBALLDATA.read_text(encoding='utf-8'))
    matches: dict[str, dict] = fd.get('matches') or {}
    league_cal: dict[str, dict] = fd.get('league_calibration') or {}
    if not matches and not league_cal:
        print('[patch_footballdata] empty payload, skip.', flush=True)
        return 0

    # Build a token index over fd home names for soft matching.
    by_token: dict[str, set[str]] = {}
    for key, m in matches.items():
        for tok in _name_tokens(m.get('home', '')):
            by_token.setdefault(tok, set()).add(key)

    data = load_data()
    days = data.get('days') or {}
    stats = {'foot_events': 0, 'cal_attached': 0, 'closing_attached': 0}

    for _day, evs in days.items():
        for ev in (evs or []):
            if ev.get('sport') != 'football':
                continue
            stats['foot_events'] += 1
            espn_code = ev.get('league_code') or ''
            # 1. League calibration
            if espn_code in league_cal:
                ev['fd_calibration'] = league_cal[espn_code]
                stats['cal_attached'] += 1
            # 2. Closing odds — only for matches we can resolve by (home, away, date)
            home_name, away_name = get_sides(ev)
            if not home_name or not away_name:
                continue
            date_str = ev.get('date') or ''
            if not date_str or len(date_str) < 10:
                continue
            iso_date = date_str[:10]
            key = f'{_norm(home_name)}|{_norm(away_name)}|{iso_date}'
            entry = matches.get(key)
            if not entry:
                # Soft fallback : token-match the home name + same date,
                # then check away token overlap.
                home_tokens = _name_tokens(home_name)
                candidates = set()
                for tok in home_tokens:
                    candidates.update(by_token.get(tok, set()))
                away_tokens = _name_tokens(away_name)
                for cand_key in candidates:
                    cand = matches[cand_key]
                    if cand.get('date') != iso_date:
                        continue
                    cand_away_tokens = _name_tokens(cand.get('away', ''))
                    if home_tokens & _name_tokens(cand.get('home', '')) and away_tokens & cand_away_tokens:
                        entry = cand
                        break
            if entry:
                closing = {}
                if entry.get('closing_b365'):
                    closing['b365'] = entry['closing_b365']
                if entry.get('closing_pinnacle'):
                    closing['pinnacle'] = entry['closing_pinnacle']
                if entry.get('closing_avg'):
                    closing['avg'] = entry['closing_avg']
                if entry.get('closing_ou25_avg'):
                    closing['ou25'] = entry['closing_ou25_avg']
                if closing:
                    ev['fd_closing_odds'] = closing
                    stats['closing_attached'] += 1
                if entry.get('referee') and not ev.get('referee'):
                    ev['fd_referee'] = entry['referee']

    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')
    if HTML.exists():
        html_text = HTML.read_text(encoding='utf-8')
        new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload};\n</script>'
        html_text = re.sub(r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
                           new_block, html_text, count=1, flags=re.DOTALL)
        HTML.write_text(html_text, encoding='utf-8')

    print(f'[{datetime.now():%H:%M:%S}] patch_footballdata: '
          f'{stats["foot_events"]} foot events scanned · '
          f'{stats["cal_attached"]} with league calibration · '
          f'{stats["closing_attached"]} with closing odds', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())

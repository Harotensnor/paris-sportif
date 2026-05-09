#!/usr/bin/env python3
"""
fetch_baseball_savant.py — MLB Statcast pitcher metrics via Baseball Savant.

v53.4 — Fetch xwOBA, K%, BB%, hard-hit%, barrel%, exit velocity. C'est le
signal MLB le PLUS prédictif du modèle moderne. ERA/WHIP est rétrospectif ;
xwOBA / barrel% sont prospectifs (skill-based).

Source : Baseball Savant CSV public exports (no auth).
URL pattern : https://baseballsavant.mlb.com/leaderboard/custom?...&year=YYYY

Output : `baseball_savant.json` keyed par pitcher_id MLB.
Schéma :
  {
    "generated_at": "...",
    "pitchers": {
      "543037": {
        "name": "Gerrit Cole", "team": "NYY",
        "xwoba": 0.298, "k_pct": 28.5, "bb_pct": 6.9,
        "barrel_pct": 6.8, "hard_hit_pct": 35.4, "exit_velo": 89.1
      }
    }
  }

Cadence : 6h (saison MLB en cours, métriques évoluent lentement).
Idempotent. Skipped si cache < 5h.
"""
from __future__ import annotations
import csv
import io
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'baseball_savant.json'
MIN_INTERVAL = 5 * 3600   # 5h cache local

UA = 'paris-sportif/1.0 (educational, https://github.com/Harotensnor/paris-sportif)'

# Stats côté pitcheur (xwoba_against, k_pct, bb_pct, barrel%, hard_hit%, exit_velo)
# Endpoint custom leaderboard exporté en CSV.
LEADERBOARD_URL = (
    'https://baseballsavant.mlb.com/leaderboard/custom?'
    'year={year}&type=pitcher&filter=&sort=4&sortDir=desc&min=10&'
    'selections=p_game,p_formatted_ip,p_k_percent,p_bb_percent,'
    'xwoba,xera,xslg,xobp,'
    'barrel_batted_rate,hard_hit_percent,avg_best_speed,'
    'whiff_percent,swing_percent&'
    'chart=false&x=year&y=year&r=no&chartType=beeswarm&csv=true'
)


def _ua_request(url: str, timeout: int = 30) -> str | None:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/csv,*/*'})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            # Baseball Savant CSV starts with UTF-8 BOM (﻿). Use utf-8-sig.
            return resp.read().decode('utf-8-sig', errors='ignore')
    except Exception as e:
        print(f'  ERR {url[-60:]}: {e}', flush=True)
        return None


def _should_skip() -> bool:
    if not OUTPUT.exists():
        return False
    age = time.time() - OUTPUT.stat().st_mtime
    return age < MIN_INTERVAL


def _safe_float(s: str) -> float | None:
    try:
        v = float(str(s).strip().replace('%', '').replace(',', '.'))
        return v
    except (ValueError, TypeError):
        return None


def fetch_pitchers_year(year: int) -> dict:
    """Fetch all qualified pitchers for a given year, return dict by player_id."""
    url = LEADERBOARD_URL.format(year=year)
    raw = _ua_request(url)
    if not raw:
        return {}
    out = {}
    try:
        reader = csv.DictReader(io.StringIO(raw))
    except Exception as e:
        print(f'  CSV parse failed: {e}', flush=True)
        return {}
    for row in reader:
        pid = (row.get('player_id') or row.get('Player Id') or '').strip()
        # Savant ships nom au format "last_name, first_name" dans une seule
        # colonne quotée (header littéral 'last_name, first_name').
        raw_name = (row.get('last_name, first_name') or '').strip()
        if raw_name and ',' in raw_name:
            parts = [p.strip() for p in raw_name.split(',', 1)]
            name = f"{parts[1]} {parts[0]}" if len(parts) == 2 else raw_name
        else:
            first = (row.get('first_name') or '').strip()
            last = (row.get('last_name') or '').strip()
            name = f"{first} {last}".strip() if (first or last) else raw_name
        if not pid or not name:
            continue
        out[pid] = {
            'name': name,
            'xwoba': _safe_float(row.get('xwoba') or row.get('xwOBA')),
            'xera': _safe_float(row.get('xera') or row.get('xERA')),
            'k_pct': _safe_float(row.get('p_k_percent') or row.get('K%')),
            'bb_pct': _safe_float(row.get('p_bb_percent') or row.get('BB%')),
            'barrel_pct': _safe_float(row.get('barrel_batted_rate') or row.get('Barrel%')),
            'hard_hit_pct': _safe_float(row.get('hard_hit_percent') or row.get('HardHit%')),
            'exit_velo': _safe_float(row.get('avg_best_speed') or row.get('Best Speed')),
            'whiff_pct': _safe_float(row.get('whiff_percent') or row.get('Whiff%')),
            'swing_pct': _safe_float(row.get('swing_percent') or row.get('Swing%')),
            'ip': _safe_float(row.get('p_formatted_ip') or row.get('IP')),
        }
    return out


def main() -> int:
    if _should_skip():
        print('[fetch_baseball_savant] cache <5h, skip', flush=True)
        return 0
    year = datetime.now(timezone.utc).year
    print(f'[fetch_baseball_savant] fetching pitcher leaderboard year={year}...', flush=True)
    pitchers = fetch_pitchers_year(year)
    if not pitchers:
        # Try previous year (early season)
        print('  no current year data, fallback previous year', flush=True)
        pitchers = fetch_pitchers_year(year - 1)
    if not pitchers:
        print('[fetch_baseball_savant] no data fetched', flush=True)
        return 1
    payload = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'year': year,
        'pitchers': pitchers,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[fetch_baseball_savant] wrote {len(pitchers)} pitchers to {OUTPUT.name}', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())

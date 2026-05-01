#!/usr/bin/env python3
"""
fetch_footballdata.py — Download `football-data.co.uk` CSV files for the
top-5 European leagues + a few neighbors. Builds a small lookup keyed on
home_team|away_team|date that the patcher can use to attach :

  - closing odds (B365 / Pinnacle / market average) for 1n2 + over 2.5 + BTTS
  - referee name (already cross-checks with Sofascore patch)
  - league-level calibration baseline (avg goals/match, BTTS rate, etc.)

Free, public, plain CSV — most stable historical odds source for soccer.
URL pattern :
  https://www.football-data.co.uk/mmz4281/{SS}{EE}/{LEAGUE_CODE}.csv
where SSEE is the season (e.g. 2526 = 2025-26) and LEAGUE_CODE follows the
site's own taxonomy (E0 = Premier League, SP1 = La Liga, etc.).

Output : `footballdata.json` at repo root, with two indices :

    {
      "generated_at": "...",
      "matches": {
        "<home_norm>|<away_norm>|<date YYYY-MM-DD>": {
          "league": "E0", "date": "2025-08-15",
          "home": "Liverpool", "away": "Bournemouth",
          "fthg": 4, "ftag": 2,
          "closing_b365": {"home": 1.30, "draw": 6.0, "away": 8.5},
          "closing_pinnacle": {"home": 1.34, "draw": 6.5, "away": 9.5},
          "closing_avg":      {"home": 1.31, "draw": 5.96, "away": 8.31},
          "closing_ou25_avg": {"over": 1.30, "under": 6.0},  # if present
          "referee": "A Taylor"
        }
      },
      "league_calibration": {
        "E0": {"n": 76, "avg_goals": 2.84, "btts_rate": 0.55, "home_wr": 0.43, ...},
        ...
      }
    }

Cache : 6h on each CSV (Football-Data updates 2×/week, plenty for our use).
"""
from __future__ import annotations
import json
import re
import sys
import time
import urllib.request
import urllib.error
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import _norm

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / '.cache' / 'footballdata'
OUTPUT = ROOT / 'footballdata.json'
CACHE_TTL = 6 * 3600  # 6h

# ESPN league_code → football-data.co.uk file. Restreint au top des
# ligues européennes pour rester rapide (un fichier par ligue = ~150-200 KB).
LEAGUES: list[tuple[str, str]] = [
    ('eng.1', 'E0'),    # Premier League
    ('eng.2', 'E1'),    # Championship
    ('esp.1', 'SP1'),   # La Liga
    ('esp.2', 'SP2'),   # Segunda
    ('ita.1', 'I1'),    # Serie A
    ('ita.2', 'I2'),    # Serie B
    ('ger.1', 'D1'),    # Bundesliga
    ('ger.2', 'D2'),    # 2. Bundesliga
    ('fra.1', 'F1'),    # Ligue 1
    ('fra.2', 'F2'),    # Ligue 2
    ('ned.1', 'N1'),    # Eredivisie
    ('por.1', 'P1'),    # Primeira
    ('sco.1', 'SC0'),   # Scottish Premiership
    ('bel.1', 'B1'),    # Pro League
]


def _csv_url(league_code: str, season: str) -> str:
    return f'https://www.football-data.co.uk/mmz4281/{season}/{league_code}.csv'


def _cache_path(league_code: str, season: str) -> Path:
    return CACHE_DIR / f'{season}_{league_code}.csv'


def fetch_csv(league_code: str, season: str) -> str | None:
    path = _cache_path(league_code, season)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and (time.time() - path.stat().st_mtime) < CACHE_TTL:
        try:
            return path.read_text(encoding='utf-8', errors='ignore')
        except OSError:
            pass
    url = _csv_url(league_code, season)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'paris-sportif/1.0 (educational)'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            txt = resp.read().decode('utf-8-sig', errors='ignore')
        path.write_text(txt, encoding='utf-8')
        return txt
    except (urllib.error.URLError, urllib.error.HTTPError, OSError):
        return None


def _seasons_to_try() -> list[str]:
    """Return current + previous season codes in football-data format
    (e.g. 2025-26 → '2526'). Sept-July season."""
    now = datetime.now(timezone.utc)
    yr = now.year % 100
    nyr = (now.year + 1) % 100
    pyr = (now.year - 1) % 100
    # If we're past July, the new season has started.
    if now.month >= 8:
        current = f'{yr:02d}{nyr:02d}'
        previous = f'{pyr:02d}{yr:02d}'
    else:
        current = f'{pyr:02d}{yr:02d}'
        previous = f'{(pyr - 1) % 100:02d}{pyr:02d}'
    return [current, previous]


def _f(s: str) -> float | None:
    s = (s or '').strip()
    if not s:
        return None
    try:
        return float(s)
    except (ValueError, TypeError):
        return None


def _i(s: str) -> int | None:
    s = (s or '').strip()
    if not s:
        return None
    try:
        return int(float(s))
    except (ValueError, TypeError):
        return None


def _date_to_iso(date_str: str) -> str | None:
    """football-data uses dd/mm/yyyy."""
    s = (date_str or '').strip()
    if not s:
        return None
    parts = s.split('/')
    if len(parts) != 3:
        return None
    d, m, y = parts
    if len(y) == 2:
        y = '20' + y
    try:
        return f'{int(y):04d}-{int(m):02d}-{int(d):02d}'
    except ValueError:
        return None


def parse_csv(txt: str, league_code: str, espn_code: str) -> tuple[list[dict], dict]:
    if not txt:
        return [], {}
    lines = [l for l in txt.split('\n') if l.strip()]
    if len(lines) < 2:
        return [], {}
    header = [h.strip() for h in lines[0].split(',')]
    idx = {h: i for i, h in enumerate(header)}
    out_matches: list[dict] = []
    cal = {'n': 0, 'goals_sum': 0, 'btts_count': 0, 'home_wins': 0, 'draws': 0, 'away_wins': 0,
           'over25': 0}
    for line in lines[1:]:
        # Some football-data CSVs have stray commas — best-effort parse.
        parts = line.split(',')
        if len(parts) < len(header):
            continue
        try:
            home = parts[idx.get('HomeTeam', -1)] if 'HomeTeam' in idx else ''
            away = parts[idx.get('AwayTeam', -1)] if 'AwayTeam' in idx else ''
            date_str = parts[idx.get('Date', -1)] if 'Date' in idx else ''
        except IndexError:
            continue
        if not home or not away or not date_str:
            continue
        date_iso = _date_to_iso(date_str)
        if not date_iso:
            continue
        fthg = _i(parts[idx['FTHG']]) if 'FTHG' in idx else None
        ftag = _i(parts[idx['FTAG']]) if 'FTAG' in idx else None
        ftr = parts[idx['FTR']].strip() if 'FTR' in idx else ''
        ref = parts[idx['Referee']].strip() if 'Referee' in idx else ''

        def odd_triplet(prefix: str) -> dict | None:
            h_idx = idx.get(f'{prefix}H')
            d_idx = idx.get(f'{prefix}D')
            a_idx = idx.get(f'{prefix}A')
            if h_idx is None or d_idx is None or a_idx is None:
                return None
            try:
                h, d, a = _f(parts[h_idx]), _f(parts[d_idx]), _f(parts[a_idx])
            except IndexError:
                return None
            if not h or not d or not a:
                return None
            return {'home': h, 'draw': d, 'away': a}

        # Closing odds : C-suffix variants are CLOSING (CH/CD/CA), no-suffix
        # are OPENING. We want closing for CLV. Fall back to no-suffix if
        # closing is missing for older seasons.
        closing_b365 = odd_triplet('B365C') or odd_triplet('B365')
        closing_pin = odd_triplet('PSC') or odd_triplet('PS')
        closing_avg = odd_triplet('AvgC') or odd_triplet('Avg')

        # Over 2.5 : prefer closing avg
        ou25 = None
        for over_key, under_key in [('PC>2.5', 'PC<2.5'), ('B365C>2.5', 'B365C<2.5'),
                                     ('AvgC>2.5', 'AvgC<2.5'), ('P>2.5', 'P<2.5'),
                                     ('B365>2.5', 'B365<2.5'), ('Avg>2.5', 'Avg<2.5')]:
            if over_key in idx and under_key in idx:
                try:
                    ov, un = _f(parts[idx[over_key]]), _f(parts[idx[under_key]])
                except IndexError:
                    continue
                if ov and un:
                    ou25 = {'over': ov, 'under': un}
                    break

        entry = {
            'league': league_code, 'espn_code': espn_code, 'date': date_iso,
            'home': home, 'away': away,
            'fthg': fthg, 'ftag': ftag, 'ftr': ftr,
            'referee': ref or None,
        }
        if closing_b365:
            entry['closing_b365'] = closing_b365
        if closing_pin:
            entry['closing_pinnacle'] = closing_pin
        if closing_avg:
            entry['closing_avg'] = closing_avg
        if ou25:
            entry['closing_ou25_avg'] = ou25
        out_matches.append(entry)

        if fthg is not None and ftag is not None:
            cal['n'] += 1
            cal['goals_sum'] += fthg + ftag
            if fthg >= 1 and ftag >= 1:
                cal['btts_count'] += 1
            if (fthg + ftag) > 2:
                cal['over25'] += 1
            if ftr == 'H': cal['home_wins'] += 1
            elif ftr == 'D': cal['draws'] += 1
            elif ftr == 'A': cal['away_wins'] += 1

    cal_summary = {}
    if cal['n'] > 0:
        cal_summary = {
            'n': cal['n'],
            'avg_goals': round(cal['goals_sum'] / cal['n'], 2),
            'btts_rate': round(cal['btts_count'] / cal['n'], 3),
            'over25_rate': round(cal['over25'] / cal['n'], 3),
            'home_wr': round(cal['home_wins'] / cal['n'], 3),
            'draw_rate': round(cal['draws'] / cal['n'], 3),
            'away_wr': round(cal['away_wins'] / cal['n'], 3),
        }
    return out_matches, cal_summary


def main() -> int:
    now = datetime.now(timezone.utc)
    seasons = _seasons_to_try()
    print(f'[{now:%H:%M:%S}] footballdata: {len(LEAGUES)} leagues × {len(seasons)} seasons',
          flush=True)

    all_matches: dict[str, dict] = {}
    leagues_calibration: dict[str, dict] = {}
    league_match_counts: dict[str, int] = defaultdict(int)
    fetched = 0
    for espn_code, fd_code in LEAGUES:
        cal_accum = defaultdict(int)
        for season in seasons:
            txt = fetch_csv(fd_code, season)
            if not txt:
                continue
            matches, cal = parse_csv(txt, fd_code, espn_code)
            if not matches:
                continue
            fetched += 1
            for m in matches:
                key = f"{_norm(m['home'])}|{_norm(m['away'])}|{m['date']}"
                if key in all_matches:
                    continue
                all_matches[key] = m
                league_match_counts[espn_code] += 1
            # Aggregate league calibration across seasons
            if cal:
                for k, v in cal.items():
                    if k == 'n':
                        cal_accum['n'] += v
                    else:
                        # Re-derive raw counts from rates × n for accumulation
                        if k.endswith('_rate') or k.endswith('_wr') or k == 'avg_goals':
                            cal_accum[k + '_x_n'] += v * cal['n']
        if cal_accum.get('n', 0) > 0:
            n = cal_accum['n']
            leagues_calibration[espn_code] = {
                'n': n,
                'avg_goals': round(cal_accum.get('avg_goals_x_n', 0) / n, 2),
                'btts_rate': round(cal_accum.get('btts_rate_x_n', 0) / n, 3),
                'over25_rate': round(cal_accum.get('over25_rate_x_n', 0) / n, 3),
                'home_wr': round(cal_accum.get('home_wr_x_n', 0) / n, 3),
                'draw_rate': round(cal_accum.get('draw_rate_x_n', 0) / n, 3),
                'away_wr': round(cal_accum.get('away_wr_x_n', 0) / n, 3),
            }
        print(f'  {espn_code} ({fd_code}): {league_match_counts[espn_code]} matches', flush=True)

    payload = {
        'generated_at': now.isoformat(),
        'attribution': 'Football data from football-data.co.uk (free use)',
        'seasons_loaded': seasons,
        'matches': all_matches,
        'league_calibration': leagues_calibration,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'[{now:%H:%M:%S}] footballdata: {len(all_matches)} matches across '
          f'{len(leagues_calibration)} leagues → {OUTPUT.name} '
          f'({OUTPUT.stat().st_size // 1024} KB)', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())

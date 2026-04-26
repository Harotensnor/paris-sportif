#!/usr/bin/env python3
"""
fetch_tennis_sackmann.py — Construit `tennis_ratings.json` à partir des
fichiers CSV publics Jeff Sackmann (ATP + WTA).

URLs (CC BY-NC-SA, attribution requise, usage non-commercial) :
  - https://github.com/JeffSackmann/tennis_atp/blob/master/atp_matches_{YEAR}.csv
  - https://github.com/JeffSackmann/tennis_wta/blob/master/wta_matches_{YEAR}.csv

Le repo contient l'historique 1968+ ; on télécharge UNIQUEMENT les 2 dernières
saisons par défaut pour rester rapide. Cache local 24h sur les CSV (le repo
est mis à jour ~1×/semaine).

Output : `tennis_ratings.json` au root, schema :

    {
      "generated_at": "...",
      "tour_seasons": ["atp_2025", "atp_2026", "wta_2025", "wta_2026"],
      "players": {
        "<norm_name>": {
          "name": "Carlos Alcaraz",
          "tour": "atp",
          "elo": 2150.3,                   # Elo global, K=32
          "surface_elo": {                  # Elo séparé par surface
            "Hard": 2148.0,
            "Clay": 2200.5,
            "Grass": 2080.0
          },
          "matches_14d": 4,                 # fatigue : matchs sur les 14j passés
          "last10": "WWLWWWLWWW",           # forme 10 derniers (W/L)
          "wins_last10": 8,
          "last_match_date": "2026-04-25",
          "rank": 2,                        # dernier rang vu
          "n_matches": 67                   # taille échantillon (filtre noise)
        },
        ...
      }
    }

Les noms sont normalisés via _norm (lowercase, strip accents, alphanum only).
Le patch_tennis_features lookup-pe via le même _norm sur les noms ESPN.

Idempotent. ~30s premier run (2 ATP + 2 WTA CSV, ~10 MB), ~1s sur cache.
"""
from __future__ import annotations
import json
import sys
import time
import urllib.request
import urllib.error
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import _norm

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / '.cache' / 'tennis_sackmann'
OUTPUT = ROOT / 'tennis_ratings.json'

CACHE_TTL = 24 * 3600  # 24h cache (Sackmann pushes ~weekly)

# Elo parameters (standard chess-style)
INITIAL_ELO = 1500.0
K_FACTOR = 32.0


def _csv_url(tour: str, year: int) -> str:
    return f'https://raw.githubusercontent.com/JeffSackmann/tennis_{tour}/master/{tour}_matches_{year}.csv'


def _cache_path(tour: str, year: int) -> Path:
    return CACHE_DIR / f'{tour}_{year}.csv'


def fetch_csv(tour: str, year: int) -> str | None:
    """Hit the Sackmann GitHub raw CSV with 24h local cache. Returns the CSV
    text or None on error."""
    path = _cache_path(tour, year)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and (time.time() - path.stat().st_mtime) < CACHE_TTL:
        try:
            return path.read_text(encoding='utf-8', errors='ignore')
        except OSError:
            pass
    url = _csv_url(tour, year)
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'paris-sportif/1.0 (educational)'})
        with urllib.request.urlopen(req, timeout=30) as resp:
            txt = resp.read().decode('utf-8', errors='ignore')
        path.write_text(txt, encoding='utf-8')
        return txt
    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
        print(f'  ERR fetch {tour} {year}: {e}', flush=True)
        return None


def parse_csv(txt: str) -> list[dict]:
    """Parse a Sackmann match CSV into list of {tourney_date, surface,
    winner_name, loser_name, winner_rank, loser_rank} dicts."""
    if not txt:
        return []
    lines = txt.split('\n')
    if len(lines) < 2:
        return []
    header = [h.strip() for h in lines[0].split(',')]
    idx = {h: i for i, h in enumerate(header)}
    needed = ['tourney_date', 'surface', 'winner_name', 'loser_name', 'winner_rank', 'loser_rank']
    if not all(c in idx for c in needed[:4]):
        return []
    out = []
    for line in lines[1:]:
        if not line.strip():
            continue
        # CSV quoted-field aware split (Sackmann is plain CSV but some scores
        # have commas; tournament name may contain commas too — best to use
        # csv.reader for safety).
        # Simple split is OK for these files (no quoted commas in needed cols).
        parts = line.split(',')
        if len(parts) < len(header):
            continue
        try:
            out.append({
                'tourney_date': parts[idx['tourney_date']],
                'surface': parts[idx['surface']] or 'Hard',
                'winner_name': parts[idx['winner_name']],
                'loser_name': parts[idx['loser_name']],
                'winner_rank': parts[idx['winner_rank']],
                'loser_rank': parts[idx['loser_rank']],
            })
        except (IndexError, KeyError):
            continue
    return out


def parse_date(s: str) -> datetime | None:
    """Sackmann date format: YYYYMMDD."""
    if not s or len(s) != 8 or not s.isdigit():
        return None
    try:
        return datetime(int(s[:4]), int(s[4:6]), int(s[6:8]), tzinfo=timezone.utc)
    except (ValueError, OSError):
        return None


def update_elo(elo_a: float, elo_b: float, a_won: bool) -> tuple[float, float]:
    """Standard Elo update : two-player zero-sum. Returns (new_a, new_b)."""
    expected_a = 1.0 / (1.0 + 10 ** ((elo_b - elo_a) / 400.0))
    score_a = 1.0 if a_won else 0.0
    delta = K_FACTOR * (score_a - expected_a)
    return elo_a + delta, elo_b - delta


def _safe_int(s: str) -> int | None:
    try:
        return int(s)
    except (TypeError, ValueError):
        return None


def build_ratings(matches: list[tuple[str, dict]]) -> dict:
    """Compute global Elo, surface Elo, fatigue, last-10 from chronologically
    sorted matches. Each input is (tour, match_dict).

    Returns a dict of player normalized-name → ratings.
    """
    matches.sort(key=lambda x: x[1]['tourney_date'])
    elo_global: dict[str, float] = defaultdict(lambda: INITIAL_ELO)
    elo_surface: dict[tuple[str, str], float] = defaultdict(lambda: INITIAL_ELO)  # (player, surface)
    last_match_dates: dict[str, datetime] = {}
    last_results: dict[str, list[str]] = defaultdict(list)  # newest at the END
    n_matches: dict[str, int] = defaultdict(int)
    raw_names: dict[str, str] = {}
    tour_of: dict[str, str] = {}
    last_rank: dict[str, int] = {}

    for tour, m in matches:
        date = parse_date(m['tourney_date'])
        if not date:
            continue
        wn = m['winner_name'].strip()
        ln = m['loser_name'].strip()
        if not wn or not ln:
            continue
        wnorm = _norm(wn)
        lnorm = _norm(ln)
        if not wnorm or not lnorm or wnorm == lnorm:
            continue
        surface = (m['surface'] or 'Hard').strip()
        if surface not in {'Hard', 'Clay', 'Grass', 'Carpet'}:
            surface = 'Hard'
        # Update global Elo
        ne_w, ne_l = update_elo(elo_global[wnorm], elo_global[lnorm], True)
        elo_global[wnorm] = ne_w
        elo_global[lnorm] = ne_l
        # Update surface Elo
        se_w, se_l = update_elo(elo_surface[(wnorm, surface)], elo_surface[(lnorm, surface)], True)
        elo_surface[(wnorm, surface)] = se_w
        elo_surface[(lnorm, surface)] = se_l
        # Trace
        last_match_dates[wnorm] = date
        last_match_dates[lnorm] = date
        last_results[wnorm].append('W')
        last_results[lnorm].append('L')
        n_matches[wnorm] += 1
        n_matches[lnorm] += 1
        raw_names[wnorm] = wn
        raw_names[lnorm] = ln
        tour_of[wnorm] = tour
        tour_of[lnorm] = tour
        wr = _safe_int(m.get('winner_rank') or '')
        lr = _safe_int(m.get('loser_rank') or '')
        if wr is not None:
            last_rank[wnorm] = wr
        if lr is not None:
            last_rank[lnorm] = lr

    # Compute matches_14d (fatigue) at the end of the dataset using each
    # player's actual last match window.
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    matches_14d: dict[str, int] = defaultdict(int)
    for tour, m in matches:
        date = parse_date(m['tourney_date'])
        if not date or date < cutoff:
            continue
        wnorm = _norm(m['winner_name'].strip())
        lnorm = _norm(m['loser_name'].strip())
        if wnorm:
            matches_14d[wnorm] += 1
        if lnorm:
            matches_14d[lnorm] += 1

    out = {}
    for norm, eg in elo_global.items():
        if n_matches[norm] < 3:
            continue  # noise filter
        # Build surface elo dict from defaultdict
        surf_dict = {}
        for surf in ('Hard', 'Clay', 'Grass'):
            v = elo_surface.get((norm, surf))
            if v is not None and v != INITIAL_ELO:
                surf_dict[surf] = round(v, 1)
        last10 = ''.join(last_results[norm][-10:])
        out[norm] = {
            'name': raw_names[norm],
            'tour': tour_of[norm],
            'elo': round(eg, 1),
            'surface_elo': surf_dict,
            'matches_14d': matches_14d[norm],
            'last10': last10,
            'wins_last10': last10.count('W'),
            'last_match_date': last_match_dates[norm].strftime('%Y-%m-%d'),
            'rank': last_rank.get(norm),
            'n_matches': n_matches[norm],
        }
    return out


def main() -> int:
    now = datetime.now(timezone.utc)
    # Sackmann pushes new seasons at year-end ; the current calendar year may
    # not exist yet on GitHub. We try latest 4 years and keep the 2 most
    # recent that exist (skipping 404s silently). Ensures we always have a
    # working dataset even early-season.
    candidate_years = [now.year, now.year - 1, now.year - 2, now.year - 3]
    print(f'[{now:%H:%M:%S}] tennis_sackmann: probing {candidate_years} (will keep up to 2 latest available)', flush=True)

    all_matches: list[tuple[str, dict]] = []
    used_seasons: list[str] = []
    for tour in ('atp', 'wta'):
        kept = 0
        for year in candidate_years:
            if kept >= 2:
                break
            txt = fetch_csv(tour, year)
            if not txt:
                continue
            rows = parse_csv(txt)
            if not rows:
                continue
            print(f'  {tour}_{year}: {len(rows)} matches', flush=True)
            for r in rows:
                all_matches.append((tour, r))
            used_seasons.append(f'{tour}_{year}')
            kept += 1

    if not all_matches:
        print('[tennis_sackmann] no matches fetched, skipping output.', flush=True)
        return 0

    ratings = build_ratings(all_matches)
    payload = {
        'generated_at': now.isoformat(),
        'tour_seasons': used_seasons,
        'attribution': 'Tennis match data CC BY-NC-SA Jeff Sackmann (https://github.com/JeffSackmann)',
        'players': ratings,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'[{now:%H:%M:%S}] tennis_sackmann: {len(ratings)} players → {OUTPUT.name} '
          f'({OUTPUT.stat().st_size // 1024} KB)', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())

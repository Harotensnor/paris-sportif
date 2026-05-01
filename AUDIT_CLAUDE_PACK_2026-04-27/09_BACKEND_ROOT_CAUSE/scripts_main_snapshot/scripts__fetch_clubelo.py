#!/usr/bin/env python3
"""Fetch ClubElo ratings for all ranked clubs and write clubelo.json.

ClubElo (http://api.clubelo.com) maintains continuously-updated Elo ratings
for 700+ clubs across Europe (dating back to 1946). Their daily endpoint
returns the current top-ranked clubs as CSV:

    GET http://api.clubelo.com/YYYY-MM-DD
    Rank,Club,Country,Level,Elo,From,To

Why this matters for pronostics:
- Elo is an independent, calibrated strength signal (not derived from odds
  nor from our own Poisson). It's especially useful when the market is
  uncertain (mid-table Ligue 1, small-sample early-season), where the odds
  prior is wide and our record/form components have low weight.
- ClubElo ratings have ~55% single-game hit rate at face value (just picking
  the higher-rated team), which is actually better than the typical bookmaker
  prior on unders/overs. For 1X2 it's in the same ballpark.
- Differential (eloH - eloA) converts cleanly to a win probability via the
  standard logistic: p = 1 / (1 + 10^((eloA - eloH)/400)) + home advantage.

Cadence: Elo barely moves within a day and the API is a single lightweight
CSV (<100 KB). Script self-throttles — skips if clubelo.json is fresh
(<20h old). Refresh cron hits this every 5 min but it only pings the network
once per day in practice.
"""
from __future__ import annotations
import csv
import io
import json
import sys
import unicodedata
from datetime import datetime, timezone, timedelta
from pathlib import Path

try:
    from curl_cffi import requests as _req
    _IMPERSONATE = True
except ImportError:
    import requests as _req
    _IMPERSONATE = False

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'clubelo.json'
STALE_H = 20  # refresh at most every 20h


def normalize(name: str) -> str:
    """Lowercase ASCII alphanumeric — used as lookup key."""
    if not name:
        return ''
    n = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode()
    return ''.join(c for c in n.lower() if c.isalnum())


def is_fresh(path: Path) -> bool:
    if not path.exists():
        return False
    try:
        j = json.loads(path.read_text(encoding='utf-8'))
        ts = j.get('generated_at', '')
        dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
        age = datetime.now(timezone.utc) - dt
        return age < timedelta(hours=STALE_H)
    except Exception:
        return False


def fetch(url: str, timeout: int = 20) -> str:
    if _IMPERSONATE:
        r = _req.get(url, timeout=timeout, impersonate='chrome110')
    else:
        r = _req.get(url, timeout=timeout, headers={'User-Agent': 'Mozilla/5.0'})
    r.raise_for_status()
    return r.text


def main() -> int:
    if is_fresh(OUT):
        print(f'[fetch_clubelo] {OUT.name} is fresh (<{STALE_H}h), skipping')
        return 0

    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    url = f'http://api.clubelo.com/{today}'
    print(f'[fetch_clubelo] GET {url}')
    try:
        text = fetch(url)
    except Exception as e:
        print(f'[fetch_clubelo] fetch failed: {e}', file=sys.stderr)
        return 1

    clubs: dict[str, dict] = {}
    reader = csv.DictReader(io.StringIO(text))
    for row in reader:
        club = (row.get('Club') or '').strip()
        if not club:
            continue
        try:
            elo = float(row.get('Elo') or 0)
        except (ValueError, TypeError):
            continue
        rank_raw = (row.get('Rank') or '').strip()
        rank = int(rank_raw) if rank_raw.isdigit() else None
        try:
            level = int(row.get('Level') or 0)
        except (ValueError, TypeError):
            level = 0
        key = normalize(club)
        if not key:
            continue
        clubs[key] = {
            'club': club,
            'country': (row.get('Country') or '').strip(),
            'level': level,
            'elo': round(elo, 1),
            'rank': rank,
        }

    if not clubs:
        print('[fetch_clubelo] no clubs parsed — refusing to overwrite existing file',
              file=sys.stderr)
        return 1

    data = {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'count': len(clubs),
        'clubs': clubs,
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[fetch_clubelo] wrote {len(clubs)} club ratings to {OUT.name}')
    return 0


if __name__ == '__main__':
    sys.exit(main())

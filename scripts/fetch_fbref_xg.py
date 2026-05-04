#!/usr/bin/env python3
"""Fetch xG (Expected Goals) data from fbref.com for top European leagues.

WHY xG MATTERS :
- xG = expected goals = quality des occasions plutôt que résultat scoring.
- Un match 2-0 avec xG 0.8 vs 1.2 = chanceux ; un match 1-1 avec xG 2.5 vs 0.5 = malchanceux.
- xG est LE meilleur predictor de la performance future en foot (~0.65 corr avec next-game points).
- Notre modèle Poisson est dérivé du rythme but historique (avg goals/game), donc capte
  partiellement xG mais avec lag. Avoir xG direct améliore le calibrage Poisson.

CADENCE :
- fbref publie data après chaque match (24h delay typique).
- On refresh tous les 6h (cadence raisonnable, fbref n'aime pas être martelé).
- self-throttling : skip si fbref_xg.json <6h old.

OUTPUT : fbref_xg.json
{
  "generated_at": "2026-04-30T20:00:00Z",
  "leagues": {
    "Premier League": {
      "teams": {
        "Liverpool": {
          "xg_for_avg": 2.15,        # xG marqués / match
          "xg_against_avg": 0.85,    # xG encaissés / match
          "matches_played": 32,
          "form_xg": [2.1, 1.8, 2.9, ...],   # 5 derniers
        },
        ...
      }
    },
    ...
  }
}

USAGE downstream :
- patch_fbref_xg.py injecte ces stats dans data.js sur chaque match foot
- predictMatch JS lit match.fbref_xg.{home,away} pour ajuster le Poisson xG
"""
from __future__ import annotations
import json
import sys
import re
import unicodedata
from datetime import datetime, timezone, timedelta
from pathlib import Path

try:
    from curl_cffi import requests as _req
    _IMPERSONATE = True
except ImportError:
    try:
        import requests as _req
    except ImportError:
        import urllib.request
        _req = None
    else:
        urllib = None
    _IMPERSONATE = False

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'fbref_xg.json'
STALE_H = 6  # refresh max every 6h

# fbref.com URLs par compétition. On scrape la page "stats" qui a les xG agrégés.
LEAGUES = {
    'Premier League':   'https://fbref.com/en/comps/9/Premier-League-Stats',
    'La Liga':          'https://fbref.com/en/comps/12/La-Liga-Stats',
    'Bundesliga':       'https://fbref.com/en/comps/20/Bundesliga-Stats',
    'Serie A':          'https://fbref.com/en/comps/11/Serie-A-Stats',
    'Ligue 1':          'https://fbref.com/en/comps/13/Ligue-1-Stats',
    'Champions League': 'https://fbref.com/en/comps/8/Champions-League-Stats',
    # V35.356 — xG coverage boost for the leagues Theo actually sees in the
    # table beyond top-5: second divisions, MLS and high-volume European leagues.
    'MLS':              'https://fbref.com/en/comps/22/Major-League-Soccer-Stats',
    'Eredivisie':       'https://fbref.com/en/comps/23/Eredivisie-Stats',
    'Primeira Liga':    'https://fbref.com/en/comps/32/Primeira-Liga-Stats',
    '2. Bundesliga':    'https://fbref.com/en/comps/33/2-Bundesliga-Stats',
    'Championship':     'https://fbref.com/en/comps/10/Championship-Stats',
    'Segunda División': 'https://fbref.com/en/comps/17/Segunda-Division-Stats',
    'Serie B':          'https://fbref.com/en/comps/18/Serie-B-Stats',
    'Ligue 2':          'https://fbref.com/en/comps/60/Ligue-2-Stats',
    'Belgian Pro League': 'https://fbref.com/en/comps/37/Belgian-Pro-League-Stats',
    'Scottish Premiership': 'https://fbref.com/en/comps/40/Scottish-Premiership-Stats',
    'Austrian Bundesliga': 'https://fbref.com/en/comps/56/Austrian-Bundesliga-Stats',
}


def normalize(name: str) -> str:
    if not name:
        return ''
    n = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode()
    return ''.join(c for c in n.lower() if c.isalnum())


def is_fresh(path: Path) -> bool:
    if not path.exists():
        return False
    try:
        j = json.loads(path.read_text(encoding='utf-8'))
        gen = j.get('generated_at')
        if not gen:
            return False
        ts = datetime.fromisoformat(gen.replace('Z', '+00:00'))
        return (datetime.now(timezone.utc) - ts) < timedelta(hours=STALE_H)
    except Exception:
        return False


def fetch_url(url: str) -> str:
    """Fetch HTML with curl_cffi if available (anti-Cloudflare)."""
    try:
        if _IMPERSONATE:
            r = _req.get(url, impersonate='chrome120', timeout=15)
        elif _req is None:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
            })
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status != 200:
                    return ''
                return resp.read().decode('utf-8', errors='replace')
        else:
            r = _req.get(url, timeout=15, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            })
        if r.status_code != 200:
            return ''
        return r.text
    except Exception as e:
        print(f'  ERROR fetch {url}: {e}', file=sys.stderr)
        return ''


def parse_squad_stats(html: str) -> dict:
    """Extract per-team xG stats from fbref squad standings table.

    fbref renvoie une table HTML avec id="stats_squads_standard_for". On parse
    les lignes pour extraire : Squad name, MP (matches played), xG, xGA.
    """
    teams = {}
    if not html:
        return teams

    # fbref met les tables dans des comments HTML pour bypass certaines parsers.
    # On enlève les commentaires <!-- ... --> avant parse.
    html_clean = re.sub(r'<!--', '', html)
    html_clean = re.sub(r'-->', '', html_clean)

    # Pattern : table stats_squads_standard_for ou stats_squads_standard
    table_match = re.search(
        r'<table[^>]*id="stats_squads_standard_for"[^>]*>(.*?)</table>',
        html_clean,
        re.DOTALL
    )
    if not table_match:
        # Fallback : table générique
        table_match = re.search(
            r'<table[^>]*id="stats_squads_standard"[^>]*>(.*?)</table>',
            html_clean,
            re.DOTALL
        )
    if not table_match:
        return teams

    table_html = table_match.group(1)

    # Parse rows
    row_pattern = re.compile(r'<tr[^>]*>(.*?)</tr>', re.DOTALL)
    cell_pattern = re.compile(r'<t[hd][^>]*data-stat="([^"]+)"[^>]*>(.*?)</t[hd]>', re.DOTALL)

    for row_m in row_pattern.finditer(table_html):
        row_html = row_m.group(1)
        cells = {}
        for cell_m in cell_pattern.finditer(row_html):
            stat_name = cell_m.group(1)
            content = cell_m.group(2)
            # Strip HTML tags
            text = re.sub(r'<[^>]+>', '', content).strip()
            cells[stat_name] = text

        if not cells.get('team'):
            continue
        team_name = cells['team']
        try:
            mp = int(cells.get('games', '0') or 0)
            xg = float(cells.get('xg_for', '0') or 0)
            xga = float(cells.get('xg_against', '0') or 0)
        except (ValueError, TypeError):
            continue

        if mp <= 0:
            continue

        teams[team_name] = {
            'matches_played': mp,
            'xg_for_total': round(xg, 2),
            'xg_against_total': round(xga, 2),
            'xg_for_avg': round(xg / mp, 3),
            'xg_against_avg': round(xga / mp, 3),
            'goals_diff': xg - xga,
            'normalized_name': normalize(team_name),
        }

    return teams


def build_by_team(leagues: dict) -> dict:
    by_team = {}
    for league_name, league_data in (leagues or {}).items():
        for team_name, stats in (league_data.get('teams') or {}).items():
            if not isinstance(stats, dict):
                continue
            norm = stats.get('normalized_name') or normalize(team_name)
            if not norm:
                continue
            by_team[norm] = {
                **stats,
                'normalized_name': norm,
                'source': stats.get('source') or 'fbref',
                'league_name': stats.get('league_name') or league_name,
            }
    return by_team


def merge_existing(out: dict) -> dict:
    """Keep the proven Understat top-5 cache and append FBref-only leagues.

    fetch_understat_xg.py writes a fbref-compatible file used by the app. This
    fetcher must extend that file, not replace its better rolling xG fields.
    """
    if not OUT.exists():
        out['by_team'] = build_by_team(out.get('leagues') or {})
        return out

    try:
        existing = json.loads(OUT.read_text(encoding='utf-8'))
    except Exception:
        existing = {}

    existing_leagues = existing.get('leagues') if isinstance(existing, dict) else {}
    if isinstance(existing_leagues, dict):
        merged_leagues = dict(out.get('leagues') or {})
        # Existing Understat-compatible leagues win on overlap because they
        # contain rolling L10, PPDA and richer fields. New FBref leagues fill
        # the coverage gaps.
        merged_leagues.update(existing_leagues)
        out['leagues'] = merged_leagues

    by_team = build_by_team(out.get('leagues') or {})
    existing_by_team = existing.get('by_team') if isinstance(existing, dict) else {}
    if isinstance(existing_by_team, dict):
        # Same rule: keep richer existing rows on overlap.
        by_team.update(existing_by_team)
    out['by_team'] = by_team
    out['total_teams'] = len(by_team)
    out['merged_from_existing'] = bool(existing_by_team or existing_leagues)
    return out


def main():
    if '--force' not in sys.argv and is_fresh(OUT):
        print(f'fbref_xg.json fresh (<{STALE_H}h), skipping')
        return 0

    print('Fetching fbref xG data...')
    out = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'leagues': {},
        'source': 'fbref.com',
        'note': 'xG = expected goals (advanced shot quality metric)',
    }
    total_teams = 0
    for league_name, url in LEAGUES.items():
        print(f'  -> {league_name}')
        html = fetch_url(url)
        if not html:
            print(f'    fetch failed, skip')
            continue
        teams = parse_squad_stats(html)
        if teams:
            out['leagues'][league_name] = {'teams': teams, 'n_teams': len(teams)}
            total_teams += len(teams)
            print(f'    {len(teams)} teams')
        else:
            print(f'    no data parsed')

    if not out['leagues']:
        print('No data fetched. Aborting write.', file=sys.stderr)
        return 1

    out['total_teams'] = total_teams
    out = merge_existing(out)
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'\nWrote {OUT.name} : {len(out.get("by_team") or {})} teams across {len(out["leagues"])} leagues')
    return 0


if __name__ == '__main__':
    sys.exit(main())

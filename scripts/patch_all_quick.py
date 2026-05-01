#!/usr/bin/env python3
"""v33.30 — Mega-patcher in-process : fusionne 13 patches "légers" en
une seule lecture/écriture de data.js.

Avant : 13 invocations Python séquentielles, chacune fait :
  - subprocess startup (~200ms)
  - read data.js (~50ms)
  - parse JSON 1.5MB (~100ms)
  - apply enrichment (~variable)
  - write data.js (~100ms)
  → ~30-45s cumulés rien qu'en I/O + parsing

Maintenant : 1 invocation Python qui fait :
  - read data.js (50ms)
  - parse JSON (100ms)
  - apply 13 enrichissements en cascade in-memory (chacun ~50-200ms)
  - write data.js (100ms)
  → ~3-5s cumulés

Gain estimé : 25-40s par run cron.

Ce script implémente UNIQUEMENT les patches "légers" qui suivent ce pattern :
  side_file.json → data.js[ev] (par id ou clé team-name)

NON inclus (gardés en scripts séparés car logique complexe) :
  - patch_winamax (logique de dedup ESPN/Winamax)
  - patch_winamax_markets (lookup match_id)
  - patch_sofascore_events (merge events, pas seulement enrichment)

Idempotent. Robuste : si un side-file manque ou est invalide, skip
silently et continue avec les autres patches.

Usage : python3 scripts/patch_all_quick.py
"""
from __future__ import annotations
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'


def _norm(name: str) -> str:
    """ASCII lowercase alnum (mirror winamax_map.py + scripts patches)."""
    if not name:
        return ''
    n = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode()
    return ''.join(c for c in n.lower() if c.isalnum())


def _load_data() -> dict | None:
    if not DATA_JS.exists():
        print('[patch_all_quick] data.js missing', file=sys.stderr)
        return None
    txt = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[patch_all_quick] could not parse data.js', file=sys.stderr)
        return None
    try:
        return json.loads(m.group(1))
    except Exception as e:
        print(f'[patch_all_quick] JSON parse failed: {e}', file=sys.stderr)
        return None


def _save_data(data: dict) -> int:
    """Returns size in bytes."""
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    text = f'window.PRONOSTICS_DATA = {payload};\n'
    DATA_JS.write_text(text, encoding='utf-8')
    return DATA_JS.stat().st_size


def _load_json(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return None


# ============================================================
# PATCHES (each takes data dict + side-file dict, mutates data in place)
# ============================================================


def patch_weather(data: dict) -> int:
    """Enrich football events with weather forecast (by event ID)."""
    wdata = _load_json(ROOT / 'weather.json')
    if not wdata:
        return 0
    matches = wdata.get('matches') or {}
    if not matches:
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('sport') != 'football':
                continue
            mid = str(ev.get('id') or '')
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
            n += 1
    return n


def patch_referees(data: dict) -> int:
    """Enrich top-5 soccer events with referee stats (by home|away normalized)."""
    refs = _load_json(ROOT / 'referees_soccer.json')
    if not refs:
        return 0
    events_idx = refs.get('events') or {}
    if not events_idx:
        return 0
    SOCCER_LEAGUES = {'eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1'}
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('league_code') not in SOCCER_LEAGUES:
                continue
            if ev.get('completed'):
                continue
            ev_name = ev.get('name') or ''
            if ' at ' not in ev_name:
                continue
            away_name, home_name = ev_name.split(' at ', 1)
            key = f'{_norm(home_name.strip())}|{_norm(away_name.strip())}'
            entry = events_idx.get(key)
            if not entry:
                continue
            ref = entry.get('referee') or {}
            if not ref.get('name'):
                continue
            ev['referee'] = {
                'name': ref.get('name'),
                'yellowPerGame': ref.get('yellowPerGame'),
                'redPerGame': ref.get('redPerGame'),
                'games': ref.get('games'),
            }
            n += 1
    return n


def patch_lineups(data: dict) -> int:
    """Enrich top-5 soccer events with lineup info."""
    lu = _load_json(ROOT / 'lineups_soccer.json')
    if not lu:
        return 0
    events_idx = lu.get('events') or {}
    if not events_idx:
        return 0
    SOCCER_LEAGUES = {'eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1'}
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('league_code') not in SOCCER_LEAGUES:
                continue
            if ev.get('completed'):
                continue
            ev_name = ev.get('name') or ''
            if ' at ' not in ev_name:
                continue
            away_name, home_name = ev_name.split(' at ', 1)
            key = f'{_norm(home_name.strip())}|{_norm(away_name.strip())}'
            entry = events_idx.get(key)
            if not entry:
                continue
            ev['lineups'] = entry.get('lineups') or entry
            n += 1
    return n


def patch_injuries(data: dict) -> int:
    """Enrich US sports events with injuries from ESPN injuries.json."""
    inj = _load_json(ROOT / 'injuries.json')
    if not inj:
        return 0
    by_team = inj.get('by_team') or {}
    if not by_team:
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('completed'):
                continue
            for c in (ev.get('competitors') or []):
                team_name = c.get('name') or ''
                key = _norm(team_name)
                injuries = by_team.get(key) or []
                if injuries:
                    c['injuries'] = injuries
                    n += 1
    return n


def patch_clubelo(data: dict) -> int:
    """Enrich football events with ClubElo ratings."""
    elo = _load_json(ROOT / 'clubelo.json')
    if not elo:
        return 0
    by_team = elo.get('by_team') or elo
    if not by_team or not isinstance(by_team, dict):
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('sport') != 'football':
                continue
            home_elo = away_elo = None
            for c in (ev.get('competitors') or []):
                team_name = _norm(c.get('name') or '')
                e = by_team.get(team_name)
                if not e:
                    continue
                rating = e if isinstance(e, (int, float)) else (e.get('elo') if isinstance(e, dict) else None)
                if rating is None:
                    continue
                c['clubelo'] = {'elo': rating}
                if c.get('home_away') == 'home':
                    home_elo = rating
                elif c.get('home_away') == 'away':
                    away_elo = rating
            if home_elo and away_elo:
                ev['clubelo'] = {'home_elo': home_elo, 'away_elo': away_elo}
                n += 1
    return n


def patch_team_form(data: dict) -> int:
    """Inject team_form.json into competitor.form (NBA/NHL/MLB/NFL)."""
    tf = _load_json(ROOT / 'team_form.json')
    if not tf:
        return 0
    by_team = tf.get('by_team') or tf
    if not by_team or not isinstance(by_team, dict):
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('sport') not in ('basketball', 'hockey', 'baseball', 'football-american'):
                continue
            for c in (ev.get('competitors') or []):
                key = _norm(c.get('name') or '')
                form = by_team.get(key)
                if form:
                    f = form if isinstance(form, str) else form.get('form')
                    if f and not c.get('form'):
                        c['form'] = f
                        n += 1
    return n


def patch_fbref_xg(data: dict) -> int:
    """Enrich foot competitor with xG averages."""
    xg = _load_json(ROOT / 'fbref_xg.json')
    if not xg:
        return 0
    by_team = xg.get('by_team') or {}
    if not by_team:
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('sport') != 'football':
                continue
            for c in (ev.get('competitors') or []):
                key = _norm(c.get('name') or '')
                stats = by_team.get(key)
                if stats:
                    c['xg_for_avg'] = stats.get('xg_for_avg')
                    c['xg_against_avg'] = stats.get('xg_against_avg')
                    c['matches_played'] = stats.get('matches_played')
                    n += 1
    return n


def patch_team_stats(data: dict) -> int:
    """Enrich foot events with team_stats (last-5 form/goals)."""
    ts = _load_json(ROOT / 'team_stats.json')
    if not ts:
        return 0
    by_team = ts.get('by_team') or {}
    if not by_team:
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('sport') != 'football':
                continue
            for c in (ev.get('competitors') or []):
                key = _norm(c.get('name') or '')
                stats = by_team.get(key)
                if stats:
                    c['team_stats'] = stats
                    n += 1
    return n


def patch_footballdata(data: dict) -> int:
    """Enrich foot events with football-data.co.uk closing odds."""
    fd = _load_json(ROOT / 'footballdata.json')
    if not fd:
        return 0
    n = 0
    by_match = fd.get('by_match') or {}
    if not by_match:
        return 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('sport') != 'football':
                continue
            ev_name = ev.get('name') or ''
            day = (ev.get('date') or '')[:10]
            if not (ev_name and day):
                continue
            if ' at ' in ev_name:
                away_name, home_name = ev_name.split(' at ', 1)
                key = f'{_norm(home_name.strip())}|{_norm(away_name.strip())}|{day}'
                entry = by_match.get(key)
                if entry:
                    ev['fd_calibration'] = entry
                    n += 1
    return n


def patch_mlb_pitchers(data: dict) -> int:
    """Enrich MLB events with probable starting pitcher info."""
    mp = _load_json(ROOT / 'mlb_pitchers.json')
    if not mp:
        return 0
    by_match = mp.get('by_match') or mp
    if not by_match:
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('league_code') != 'mlb':
                continue
            mid = str(ev.get('id') or '')
            entry = by_match.get(mid)
            if entry:
                ev['mlb_pitchers'] = entry
                n += 1
    return n


def patch_nhl_stats(data: dict) -> int:
    """Enrich NHL events with team pace + starting goalie."""
    ns = _load_json(ROOT / 'nhl_stats.json')
    if not ns:
        return 0
    by_team = ns.get('by_team') or {}
    if not by_team:
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('league_code') != 'nhl':
                continue
            for c in (ev.get('competitors') or []):
                key = _norm(c.get('name') or '')
                stats = by_team.get(key)
                if stats:
                    c['nhl_stats'] = stats
                    n += 1
    return n


def patch_nba_team_stats(data: dict) -> int:
    """Enrich NBA events with team stats from ESPN."""
    ns = _load_json(ROOT / 'nba_team_stats.json')
    if not ns:
        return 0
    by_team = ns.get('by_team') or {}
    if not by_team:
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('league_code') != 'nba':
                continue
            for c in (ev.get('competitors') or []):
                key = _norm(c.get('name') or '')
                stats = by_team.get(key)
                if stats:
                    c['nba_stats'] = stats
                    n += 1
    return n


def patch_tennis_features(data: dict) -> int:
    """Enrich tennis events with Sackmann Elo features."""
    tf = _load_json(ROOT / 'tennis_features.json')
    if not tf:
        return 0
    by_match = tf.get('by_match') or {}
    if not by_match:
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('sport') != 'tennis':
                continue
            mid = str(ev.get('id') or '')
            entry = by_match.get(mid)
            if entry:
                ev['tennis_features'] = entry
                n += 1
    return n


# ============================================================
# MAIN
# ============================================================


PATCHES = [
    ('weather', patch_weather),
    ('referees', patch_referees),
    ('lineups', patch_lineups),
    ('injuries', patch_injuries),
    ('clubelo', patch_clubelo),
    ('team_form', patch_team_form),
    ('fbref_xg', patch_fbref_xg),
    ('team_stats', patch_team_stats),
    ('footballdata', patch_footballdata),
    ('mlb_pitchers', patch_mlb_pitchers),
    ('nhl_stats', patch_nhl_stats),
    ('nba_team_stats', patch_nba_team_stats),
    ('tennis_features', patch_tennis_features),
]


def main() -> int:
    t0 = datetime.now()
    data = _load_data()
    if data is None:
        return 1

    results = []
    for name, fn in PATCHES:
        try:
            n = fn(data)
            results.append((name, n, None))
        except Exception as e:
            results.append((name, 0, str(e)))

    size = _save_data(data)
    dt = (datetime.now() - t0).total_seconds()
    print(f'[patch_all_quick] done in {dt:.1f}s, data.js={size//1024}KB')
    for name, n, err in results:
        if err:
            print(f'  ! {name}: ERROR {err[:60]}')
        elif n > 0:
            print(f'  + {name}: {n} events enriched')
    return 0


if __name__ == '__main__':
    sys.exit(main())

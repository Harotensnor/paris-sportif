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

try:
    from patch_clubelo import lookup as _clubelo_lookup
except Exception:
    _clubelo_lookup = None

try:
    from _data_io import save_data_js
except Exception:
    save_data_js = None

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'

SOCCER_SIGNAL_LEAGUES = {
    'eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1',
    'ned.1', 'por.1', 'tur.1', 'bel.1', 'sco.1',
    'eng.2', 'esp.2', 'ita.2', 'ger.2', 'fra.2',
    'uefa.champions', 'uefa.europa', 'uefa.europa.conf',
    'usa.1', 'mex.1', 'arg.1', 'bra.1',
}

SOCCER_INJURY_SEVERE_REASONS = {1, 2, 10}

TEAM_ALIAS = {
    'asrome': 'roma',
    'asroma': 'roma',
    'manchesterutd': 'manchesterunited',
    'manutd': 'manchesterunited',
    'manunited': 'manchesterunited',
    'manchestercity': 'manchestercity',
    'mancity': 'manchestercity',
    'nottinghamforest': 'nottinghamforest',
    'nottmforest': 'nottinghamforest',
    'brest': 'stadebrestois',
    'lyon': 'olympiquelyonnais',
    'psg': 'parissaintgermain',
    'intermilan': 'inter',
    'acmilan': 'milan',
}

# v35.334 — Unifier le matching signaux avec le dictionnaire Winamax.
# Le pipeline avait deux mondes: Winamax matchait beaucoup de variantes FR/EN,
# mais le patch rapide des signaux foot restait sur une petite table locale.
# Résultat: sources existantes, mais lineups/referees/injuries invisibles sur
# des libellés type "Bayern Munich" vs "FC Bayern München".
try:
    from winamax_map import _TEAM_NAME_ALIASES as _WINAMAX_TEAM_ALIASES
except Exception:
    _WINAMAX_TEAM_ALIASES = {}

TEAM_ALIAS.update({k: v for k, v in _WINAMAX_TEAM_ALIASES.items() if v})
TEAM_ALIAS.update({
    # Germany / UEFA
    'atleticodemadrid': 'atleticomadrid',
    'atleticomadrid': 'atleticomadrid',
    'fcathleticbilbao': 'athleticbilbao',
    'athleticclub': 'athleticbilbao',
    'athleticbilbao': 'athleticbilbao',
    'fcbayernmunchen': 'bayern',
    'bayernmunchen': 'bayern',
    'bayernmunich': 'bayern',
    '1fcheidenheim': 'heidenheim',
    '1fcheidenheim1846': 'heidenheim',
    'heidenheim1846': 'heidenheim',
    'heidenheim': 'heidenheim',
    'eintrachtfrankfurt': 'frankfurt',
    'hamburgersv': 'hamburg',
    'hsv': 'hamburg',
    'tsghoffenheim': 'hoffenheim',
    'hoffenheim': 'hoffenheim',
    'vfbstuttgart': 'stuttgart',
    'stuttgart': 'stuttgart',
    '1fcunionberlin': 'unionberlin',
    'unionberlin': 'unionberlin',
    '1fckoln': 'koln',
    'fccoln': 'koln',
    'fckoln': 'koln',
    'bayer04leverkusen': 'leverkusen',
    'bayerleverkusen': 'leverkusen',
    'rbleipzig': 'leipzig',
    'redbullleipzig': 'leipzig',
    'fcstpauli': 'stpauli',
    'stpauli': 'stpauli',
    '1fsvmainz05': 'mainz',
    'fsvmainz': 'mainz',
    'borussiamgladbach': 'monchengladbach',
    'borussiamonchengladbach': 'monchengladbach',
    'monchengladbach': 'monchengladbach',
    'borussiadortmund': 'dortmund',
    'dortmund': 'dortmund',
    'scfreiburg': 'freiburg',
    'vflwolfsburg': 'wolfsburg',

    # France / Portugal / Netherlands / Belgium
    'olympiquedemarseille': 'marseille',
    'marseille': 'marseille',
    'rclens': 'lens',
    'lens': 'lens',
    'staderennais': 'rennes',
    'rennes': 'rennes',
    'parissaintgermain': 'parissaintgermain',
    'psg': 'parissaintgermain',
    'vitoriaguimaraes': 'vitoriasc',
    'vitoriadeguimaraes': 'vitoriasc',
    'guimaraes': 'vitoriasc',
    'vitoriasc': 'vitoriasc',
    'porto': 'fcporto',
    'fcporto': 'fcporto',
    'avs': 'avsfutebolsad',
    'avsfutebolsad': 'avsfutebolsad',
    'arouca': 'fcarouca',
    'fcarouca': 'fcarouca',
    'nacional': 'cdnacional',
    'cdnacional': 'cdnacional',
    'estrela': 'cfestrelaamadora',
    'estrelaamadora': 'cfestrelaamadora',
    'cfestrelaamadora': 'cfestrelaamadora',
    'heerenveen': 'scheerenveen',
    'scheerenveen': 'scheerenveen',
    'famalicao': 'famalicao',
    'fcfamalicao': 'famalicao',
    'afcajax': 'ajax',
    'ajaxamsterdam': 'ajax',
    'psveindhoven': 'psv',
    'rscanderlecht': 'anderlecht',
    'clubbruggekv': 'brugge',
    'clubbrugge': 'brugge',

    # MLS / Liga MX / Argentine frequent variants
    'newyorkredbulls': 'redbullnewyork',
    'redbullnewyork': 'redbullnewyork',
    'nyredbulls': 'redbullnewyork',
    'stlouiscitysc': 'stlouiscity',
    'stlouiscity': 'stlouiscity',
    'dcunited': 'dcunited',
    'dcu': 'dcunited',
    'cfmontreal': 'montreal',
    'clubdefootmontreal': 'montreal',
    'montrealimpact': 'montreal',
    'lagalaxy': 'lagalaxy',
    'losangelesgalaxy': 'lagalaxy',
    'sportingkansascity': 'sportingkc',
    'sportingkc': 'sportingkc',
    'vancouverwhitecaps': 'vancouverwhitecaps',
    'vancouverwhitecapsfc': 'vancouverwhitecaps',
    'sanjoseearthquakes': 'sanjoseearthquakes',
    'seattlesounders': 'seattlesounders',
    'seattlesoundersfc': 'seattlesounders',
    'pumasunam': 'pumas',
    'clubamerica': 'america',
    'america': 'america',
    'clubtijuana': 'tijuana',
    'xolos': 'tijuana',
    'velezsarsfield': 'velez',
    'newellsoldboys': 'newells',
    'newellsoldeboys': 'newells',
    'estudiantesdelaplata': 'estudiantes',
    'estudiantesderiocuarto': 'estudiantesriocuarto',
    'institutocordoba': 'instituto',
    'defensayjusticia': 'defensayjusticia',
})

GENERIC_TEAM_TOKENS = {
    'fc', 'cf', 'sc', 'afc', 'club', 'team',
    'united', 'city', 'town', 'county', 'real',
    'sporting', 'athletic', 'atletico', 'deportivo',
    'international', 'internacional', 'racing',
}


def _norm(name: str) -> str:
    """ASCII lowercase alnum (mirror winamax_map.py + scripts patches)."""
    if not name:
        return ''
    n = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode()
    return ''.join(c for c in n.lower() if c.isalnum())


def _parse_ts(value: object) -> float | None:
    if value is None or value == '':
        return None
    if isinstance(value, (int, float)):
        return float(value if value > 10_000_000_000 else value * 1000)
    try:
        return datetime.fromisoformat(str(value).replace('Z', '+00:00')).timestamp() * 1000
    except Exception:
        return None


def _time_compatible(entry: dict, event_date: str, max_minutes: int = 240) -> bool:
    entry_ts = _parse_ts(entry.get('date') or entry.get('start') or entry.get('startDate') or entry.get('startTimestamp'))
    event_ts = _parse_ts(event_date)
    if entry_ts is None or event_ts is None:
        return True
    return abs(entry_ts - event_ts) <= max_minutes * 60_000


def _name_tokens(name: str) -> set[str]:
    toks = {_norm(name)}
    for part in re.split(r'[\s\-.&]+', name or ''):
        token = _norm(part)
        if len(token) >= 3:
            toks.add(token)
    toks.discard('')
    return toks


def _name_match(a: str, b: str) -> bool:
    na = _norm(a)
    nb = _norm(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    if min(len(na), len(nb)) >= 5 and (na in nb or nb in na):
        return True
    return bool(_name_tokens(a) & _name_tokens(b))


def _meaningful_tokens(name: str) -> set[str]:
    return {
        t for t in _name_tokens(name)
        if len(t) >= 4 and t not in GENERIC_TEAM_TOKENS
    }


def _strong_name_match(a: str, b: str) -> bool:
    na = TEAM_ALIAS.get(_norm(a), _norm(a))
    nb = TEAM_ALIAS.get(_norm(b), _norm(b))
    if not na or not nb:
        return False
    if na == nb:
        return True
    if min(len(na), len(nb)) >= 6 and (na in nb or nb in na):
        return True
    return bool(_meaningful_tokens(a) & _meaningful_tokens(b))


def _side_name(ev: dict, side: str) -> str:
    for c in ev.get('competitors') or []:
        if c.get('home_away') == side:
            return c.get('name') or c.get('displayName') or c.get('shortDisplayName') or ''
    return ''


def _event_sides(ev: dict) -> tuple[str, str]:
    home_name = _side_name(ev, 'home')
    away_name = _side_name(ev, 'away')
    if home_name and away_name:
        return home_name.strip(), away_name.strip()
    ev_name = ev.get('name') or ''
    if ' at ' not in ev_name:
        return '', ''
    away_name, home_name = ev_name.split(' at ', 1)
    return home_name.strip(), away_name.strip()


def _split_pair_key(key: str) -> tuple[str, str]:
    if '|' not in key:
        return key, ''
    home_key, away_key = key.split('|', 1)
    return home_key, away_key


def _find_soccer_pair_entry(
    events_idx: dict[str, dict],
    league_code: str,
    home_name: str,
    away_name: str,
    event_date: str = '',
) -> dict | None:
    key = f'{_norm(home_name)}|{_norm(away_name)}'
    direct = events_idx.get(key)
    if direct and _time_compatible(direct, event_date):
        return direct

    alias_key = f'{TEAM_ALIAS.get(_norm(home_name), _norm(home_name))}|{TEAM_ALIAS.get(_norm(away_name), _norm(away_name))}'
    direct = events_idx.get(alias_key)
    if direct and _time_compatible(direct, event_date):
        return direct

    for idx_key, candidate in events_idx.items():
        cand_league = candidate.get('league_code') or ''
        if cand_league and league_code and cand_league != league_code:
            continue
        if not _time_compatible(candidate, event_date):
            continue
        key_home, key_away = _split_pair_key(idx_key)
        cand_home = (candidate.get('home') or {}).get('team') or key_home
        cand_away = (candidate.get('away') or {}).get('team') or key_away
        if _strong_name_match(home_name, cand_home) and _strong_name_match(away_name, cand_away):
            return candidate
    return None


def _league_referee_priors(events_idx: dict[str, dict]) -> dict[str, dict]:
    buckets: dict[str, dict] = {}
    for entry in events_idx.values():
        league = entry.get('league_code')
        ref = entry.get('referee') or {}
        if not league or not ref.get('name'):
            continue
        yellow = ref.get('yellowPerGame')
        cards = ref.get('cardsPerGame') or yellow
        if yellow is None and cards is None:
            continue
        bucket = buckets.setdefault(league, {
            'count': 0,
            'yellow_sum': 0.0,
            'red_sum': 0.0,
            'cards_sum': 0.0,
            'games_sum': 0,
        })
        bucket['count'] += 1
        bucket['yellow_sum'] += float(yellow or cards or 0)
        bucket['red_sum'] += float(ref.get('redPerGame') or 0)
        bucket['cards_sum'] += float(cards or yellow or 0)
        bucket['games_sum'] += int(ref.get('games') or 0)
    priors: dict[str, dict] = {}
    for league, bucket in buckets.items():
        count = int(bucket['count'])
        if count < 2:
            continue
        priors[league] = {
            'assignmentConfirmed': False,
            'source': 'league_referee_average',
            'league_code': league,
            'sampleSize': count,
            'yellowPerGame': round(bucket['yellow_sum'] / count, 2),
            'redPerGame': round(bucket['red_sum'] / count, 3),
            'cardsPerGame': round(bucket['cards_sum'] / count, 2),
            'games': int(bucket['games_sum']),
        }
    return priors


def _lineup_payload(side: dict | None) -> dict:
    side = side or {}
    return {
        'team': side.get('team') or '',
        'formation': side.get('formation') or '',
        'confirmed': bool(side.get('confirmed')),
        'coach': side.get('coach') or '',
        'starters': side.get('starters') or [],
        'subs': side.get('subs') or [],
    }


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
    if save_data_js:
        return save_data_js(data, DATA_JS)
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    text = f'window.PRONOSTICS_DATA = {payload};\n'
    DATA_JS.write_text(text, encoding='utf-8')
    return DATA_JS.stat().st_size


def _load_json(path: Path) -> dict | None:
    # AUDIT 2026-05-08 v40 — auto-fallback sur .gz pour les sidecars compressés
    # (footballdata, team_form, tennis_ratings, etc.). Le .gz est essayé en
    # priorité si présent, sinon plain.
    import gzip
    gz = path.with_name(path.name + '.gz')
    if gz.exists():
        try:
            with gzip.open(gz, 'rt', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
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
    """Enrich soccer events with referee stats (by home|away normalized)."""
    refs = _load_json(ROOT / 'referees_soccer.json')
    if not refs:
        return 0
    events_idx = refs.get('events') or {}
    if not events_idx:
        return 0
    league_priors = _league_referee_priors(events_idx)
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            league_code = ev.get('league_code') or ''
            if ev.get('sport') != 'football' or league_code not in SOCCER_SIGNAL_LEAGUES:
                continue
            home_name, away_name = _event_sides(ev)
            if not (home_name and away_name):
                continue
            entry = _find_soccer_pair_entry(
                events_idx,
                league_code,
                home_name,
                away_name,
                ev.get('date') or '',
            )
            if not entry:
                prior = league_priors.get(league_code)
                if prior:
                    ev['referee_context'] = dict(prior)
                    n += 1
                continue
            ref = entry.get('referee') or {}
            if not ref.get('name'):
                continue
            ev['referee'] = {
                'name': ref.get('name'),
                'country': ref.get('country'),
                'yellowPerGame': ref.get('yellowPerGame'),
                'redPerGame': ref.get('redPerGame'),
                'cardsPerGame': ref.get('cardsPerGame') or ref.get('yellowPerGame'),
                'games': ref.get('games'),
                'league_code': entry.get('league_code') or ev.get('league_code') or '',
                'sofa_event_id': entry.get('sofa_event_id') or '',
                'source': 'sofascore',
            }
            ev.pop('referee_context', None)
            n += 1
    return n


def patch_lineups(data: dict) -> int:
    """Enrich soccer events with lineup info."""
    lu = _load_json(ROOT / 'lineups_soccer.json')
    if not lu:
        return 0
    events_idx = lu.get('events') or {}
    if not events_idx:
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('sport') != 'football' or ev.get('league_code') not in SOCCER_SIGNAL_LEAGUES:
                continue
            home_name, away_name = _event_sides(ev)
            if not (home_name and away_name):
                continue
            entry = _find_soccer_pair_entry(
                events_idx,
                ev.get('league_code') or '',
                home_name,
                away_name,
                ev.get('date') or '',
            )
            if not entry:
                continue
            home_lineup = _lineup_payload(entry.get('home'))
            away_lineup = _lineup_payload(entry.get('away'))
            ev['lineups'] = {
                'home': home_lineup,
                'away': away_lineup,
                'league_code': entry.get('league_code') or ev.get('league_code') or '',
                'sofa_event_id': entry.get('sofa_event_id') or '',
                'date': entry.get('date') or '',
                'source': 'sofascore',
            }
            for c in ev.get('competitors') or []:
                ha = c.get('home_away')
                if ha == 'home':
                    c['lineup'] = home_lineup
                elif ha == 'away':
                    c['lineup'] = away_lineup
            n += 1
    return n


def _resolve_soccer_injury_side(
    name: str,
    teams: dict[str, list[dict]],
    scanned: dict[str, str],
    league_supported: bool = False,
) -> tuple[list[dict], bool, str]:
    key = TEAM_ALIAS.get(_norm(name), _norm(name))
    if key in teams:
        return teams.get(key) or [], True, key
    if key in scanned:
        return [], True, key

    best_key = ''
    best_score = 0
    for candidate_key in set(teams) | set(scanned):
        candidate_display = scanned.get(candidate_key) or candidate_key
        if candidate_key in teams and teams[candidate_key]:
            candidate_display = teams[candidate_key][0].get('team') or candidate_display
        candidate_norm = TEAM_ALIAS.get(_norm(candidate_display), _norm(candidate_display))
        if key == candidate_norm or key == candidate_key:
            best_key = candidate_key
            best_score = 100
            break
        if min(len(key), len(candidate_norm)) >= 6 and (key in candidate_norm or candidate_norm in key):
            score = 80 + min(len(key), len(candidate_norm))
        else:
            shared = _meaningful_tokens(name) & _meaningful_tokens(candidate_display)
            if not shared:
                continue
            score = 30 + len(shared) * 8 + max(len(t) for t in shared)
        if score > best_score:
            best_key = candidate_key
            best_score = score

    if best_key and best_score >= 42:
        return teams.get(best_key) or [], True, best_key
    if league_supported:
        return [], True, key
    return [], False, ''


def patch_soccer_injuries(data: dict) -> int:
    """Attach Sofascore soccer injuries/scanned flags from injuries_soccer.json."""
    inj = _load_json(ROOT / 'injuries_soccer.json')
    if not inj:
        return 0
    teams = inj.get('teams') or {}
    scanned = inj.get('scanned_teams') or {}
    if not (teams or scanned):
        return 0
    injury_supported_leagues = {
        str(row.get('league_code') or '').lower()
        for rows in teams.values()
        for row in (rows or [])
        if row.get('league_code')
    }

    n = 0
    unmatched: list[str] = []
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            league_code = str(ev.get('league_code') or '').lower()
            if ev.get('sport') != 'football' or league_code not in SOCCER_SIGNAL_LEAGUES:
                continue
            home_name, away_name = _event_sides(ev)
            if not (home_name and away_name):
                continue

            league_supported = league_code in injury_supported_leagues
            home_inj, home_known, home_key = _resolve_soccer_injury_side(home_name, teams, scanned, league_supported)
            away_inj, away_known, away_key = _resolve_soccer_injury_side(away_name, teams, scanned, league_supported)
            if not (home_known or away_known):
                if len(unmatched) < 300:
                    unmatched.append(f"{ev.get('league_code') or ''}\t{home_name}\t{away_name}")
                continue

            home_severe = sum(1 for x in home_inj if x.get('reason') in SOCCER_INJURY_SEVERE_REASONS)
            away_severe = sum(1 for x in away_inj if x.get('reason') in SOCCER_INJURY_SEVERE_REASONS)
            for c in ev.get('competitors') or []:
                ha = c.get('home_away')
                if ha == 'home':
                    c['injuries'] = home_inj
                    c['injuries_known'] = home_known
                    c['injuries_source'] = 'sofascore'
                    c['injuries_key'] = home_key
                elif ha == 'away':
                    c['injuries'] = away_inj
                    c['injuries_known'] = away_known
                    c['injuries_source'] = 'sofascore'
                    c['injuries_key'] = away_key

            ev['injuries'] = {
                'home': home_inj,
                'away': away_inj,
                'home_known': home_known,
                'away_known': away_known,
                'home_severe': home_severe,
                'away_severe': away_severe,
                'source': 'sofascore',
            }
            ev['injuries_home'] = home_severe
            ev['injuries_away'] = away_severe
            ev['injuries_home_known'] = home_known
            ev['injuries_away_known'] = away_known
            ev['injuries_source'] = 'sofascore'
            n += 1

    if unmatched:
        (ROOT / 'signal_unmatched.log').write_text('\n'.join(unmatched) + '\n', encoding='utf-8')
    return n


def patch_injuries(data: dict) -> int:
    """Enrich non-football events with public ESPN multi-sport injuries."""
    multi = _load_json(ROOT / 'injuries_multisport.json')
    n = 0
    if multi:
        by_team = multi.get('teams') or {}
        for evs in (data.get('days') or {}).values():
            for ev in (evs or []):
                if ev.get('sport') == 'football':
                    continue
                league_code = ev.get('league_code') or ''
                if not league_code:
                    continue
                home_payload = away_payload = None
                for c in (ev.get('competitors') or []):
                    team_id = str(c.get('id') or '')
                    if not team_id:
                        continue
                    rec = by_team.get(f'{league_code}:{team_id}')
                    if not rec:
                        continue
                    injuries = rec.get('injuries') or []
                    c['injuries'] = injuries
                    c['injuries_count'] = rec.get('injuries_count') or len(injuries)
                    c['injuries_severe'] = rec.get('severe_count') or 0
                    c['injuries_source'] = 'espn_public'
                    c['injuries_known'] = True
                    payload = {
                        'team_id': team_id,
                        'team_name': c.get('name') or c.get('displayName') or '',
                        'injuries': injuries,
                        'known': True,
                        'count': rec.get('injuries_count') or len(injuries),
                        'severe': rec.get('severe_count') or 0,
                        'source': 'espn_public',
                    }
                    if c.get('home_away') == 'home':
                        home_payload = payload
                    elif c.get('home_away') == 'away':
                        away_payload = payload
                if home_payload or away_payload:
                    ev['injuries'] = {
                        'home': (home_payload or {}).get('injuries') or [],
                        'away': (away_payload or {}).get('injuries') or [],
                        'home_known': bool(home_payload),
                        'away_known': bool(away_payload),
                        'home_severe': (home_payload or {}).get('severe') or 0,
                        'away_severe': (away_payload or {}).get('severe') or 0,
                        'home_count': (home_payload or {}).get('count') or 0,
                        'away_count': (away_payload or {}).get('count') or 0,
                        'source': 'espn_public',
                    }
                    ev['injuries_home'] = (home_payload or {}).get('severe') or 0
                    ev['injuries_away'] = (away_payload or {}).get('severe') or 0
                    ev['injuries_home_known'] = bool(home_payload)
                    ev['injuries_away_known'] = bool(away_payload)
                    ev['injuries_source'] = 'espn_public'
                    n += 1
        if n:
            return n

    # Legacy fallback kept for older snapshots that only have injuries.json.
    inj = _load_json(ROOT / 'injuries.json')
    if not inj:
        return 0
    by_team = inj.get('by_team') or {}
    if not by_team:
        return 0
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
    clubs = elo.get('clubs') or elo.get('by_team') or elo
    if not clubs or not isinstance(clubs, dict):
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('sport') != 'football':
                continue
            home_elo = away_elo = None
            for c in (ev.get('competitors') or []):
                team_name = c.get('name') or ''
                key = _norm(team_name)
                e = (_clubelo_lookup(clubs, team_name) if _clubelo_lookup else None) or clubs.get(key)
                if not e:
                    continue
                rating = e if isinstance(e, (int, float)) else (e.get('elo') if isinstance(e, dict) else None)
                if rating is None:
                    continue
                c_elo = {
                    'value': rating,
                    'rank': e.get('rank') if isinstance(e, dict) else None,
                    'country': e.get('country') if isinstance(e, dict) else None,
                    'level': e.get('level') if isinstance(e, dict) else None,
                }
                c['elo'] = c_elo
                c['clubelo'] = {'elo': rating}
                if c.get('home_away') == 'home':
                    home_elo = c_elo
                elif c.get('home_away') == 'away':
                    away_elo = c_elo
            if home_elo and away_elo:
                ev['clubelo'] = {
                    'home_elo': home_elo['value'],
                    'away_elo': away_elo['value'],
                    'diff': round(float(home_elo['value']) - float(away_elo['value']), 1),
                    'home_rank': home_elo.get('rank'),
                    'away_rank': away_elo.get('rank'),
                    'source': 'clubelo',
                }
                n += 1
    return n


def patch_team_form(data: dict) -> int:
    """Inject team_form.json into competitor form/L10 fields."""
    tf = _load_json(ROOT / 'team_form.json')
    if not tf:
        return 0
    by_team = tf.get('by_team') or tf
    if not by_team or not isinstance(by_team, dict):
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            sport = ev.get('sport')
            code = ev.get('league_code')
            for c in (ev.get('competitors') or []):
                tid = str(c.get('id') or '')
                key = f'{sport}:{code}:{tid}' if tid else _norm(c.get('name') or '')
                form = by_team.get(key)
                if form:
                    f = form if isinstance(form, str) else form.get('form')
                    if f and not c.get('form'):
                        c['form'] = f
                        n += 1
                    if isinstance(form, dict):
                        if form.get('form') and len(str(form.get('form'))) >= 6:
                            if c.get('form10') != form.get('form') or c.get('team_form_l10') != form.get('form'):
                                n += 1
                            c['form10'] = form.get('form')
                            c['team_form_l10'] = form.get('form')
                        if form.get('form5'):
                            c['team_form_l5'] = form.get('form5')
                        if form.get('last10') and not c.get('last10'):
                            c['last10'] = form.get('last10')
                        if form.get('last5') and not c.get('last5'):
                            c['last5'] = form.get('last5')
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
    """Enrich foot events with team_stats (last-5 form/goals).

    v49 — Audit point E (form_stats 0% coverage) : ce patcher utilisait
    `ts.get('by_team')` mais le fichier team_stats.json schema v2 utilise
    `teams` keyé par `lc:tid`. Le patcher dédié patch_team_stats.py utilise
    la bonne logique (composite key + cleanup contamination + cross-sport
    guard). Ici on appelle directement la fonction du patcher dédié pour
    éviter la duplication.
    """
    ts = _load_json(ROOT / 'team_stats.json')
    if not ts:
        return 0
    teams_idx = ts.get('teams') or ts.get('by_team') or {}
    if not teams_idx:
        return 0
    schema_v2 = ts.get('schema_version') == 2 or any(':' in k for k in teams_idx)
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('completed'):
                continue
            ev_lc = ev.get('league_code') or ''
            ev_sport = ev.get('sport') or ''
            for c in (ev.get('competitors') or []):
                tid = str(c.get('id') or '')
                if not tid:
                    continue
                # Composite key (schema v2) puis fallback v1.
                s = None
                if schema_v2 and ev_lc:
                    s = teams_idx.get(f'{ev_lc}:{tid}')
                if s is None:
                    s = teams_idx.get(tid)
                if not s or s.get('played5', 0) == 0:
                    continue
                # Sport guard.
                stats_sport = s.get('sport') or ''
                if stats_sport and ev_sport:
                    matches = (
                        stats_sport == ev_sport
                        or (stats_sport == 'soccer' and ev_sport == 'football')
                    )
                    if not matches:
                        continue
                c['form_stats'] = {
                    'played5': s.get('played5'),
                    'wins5': s.get('wins5'), 'draws5': s.get('draws5'), 'losses5': s.get('losses5'),
                    'gf5': s.get('gf5'), 'ga5': s.get('ga5'),
                    'avg_gf5': s.get('avg_gf5'), 'avg_ga5': s.get('avg_ga5'),
                    'cleans5': s.get('cleans5'), 'failed_to_score5': s.get('failed_to_score5'),
                }
                c['last5'] = s.get('last5') or []
                n += 1
    return n


def patch_footballdata(data: dict) -> int:
    """Enrich foot events with football-data.co.uk closing odds.

    v50.3 — Audit silent failures : le patcher lisait `fd.get('by_match')` mais
    le fichier footballdata.json.gz a clé `matches` (9518 entrées indexées
    `home|away|YYYY-MM-DD`). Schema mismatch comme team_stats v50.0. Fix :
    fallback `matches` → `by_match` pour transition.
    """
    fd = _load_json(ROOT / 'footballdata.json')
    if not fd:
        return 0
    n = 0
    by_match = fd.get('matches') or fd.get('by_match') or {}
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
    by_match = mp.get('matches') or mp.get('by_match') or mp
    if not by_match:
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('league_code') != 'mlb':
                continue
            home_name, away_name = _event_sides(ev)
            day = str(ev.get('date') or '')[:10]
            key = f'{_norm(home_name)}|{_norm(away_name)}|{day}' if home_name and away_name and day else ''
            entry = by_match.get(str(ev.get('id') or '')) or (by_match.get(key) if key else None)
            if entry:
                ev['mlb_pitchers'] = entry
                n += 1
    return n


def patch_nhl_stats(data: dict) -> int:
    """Enrich NHL events with team pace + starting goalie."""
    ns = _load_json(ROOT / 'nhl_stats.json')
    if not ns:
        return 0
    teams = ns.get('teams') or ns.get('by_team') or {}
    by_abbr = {str(k).upper(): v for k, v in teams.items() if isinstance(v, dict)}
    by_name = {
        _norm((v or {}).get('name') or str(k)): v
        for k, v in teams.items()
        if isinstance(v, dict)
    }
    if not teams:
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('league_code') != 'nhl':
                continue
            event_payload = {}
            for c in (ev.get('competitors') or []):
                stats = by_abbr.get(str(c.get('abbr') or '').upper()) or by_name.get(_norm(c.get('name') or ''))
                if stats:
                    c['nhl_stats'] = stats
                    if c.get('home_away') in ('home', 'away'):
                        event_payload[c.get('home_away')] = stats
            if event_payload:
                ev['nhl_stats'] = {
                    'home': event_payload.get('home') or {},
                    'away': event_payload.get('away') or {},
                    'source': 'nhl_stats',
                }
                n += 1
    return n


def patch_nba_team_stats(data: dict) -> int:
    """Enrich NBA events with team stats from ESPN.

    v50.3 — Audit silent failures : le patcher lisait `ns.get('by_team')` indexé
    par `_norm(name)` mais le fichier a `teams` indexé par abréviation (DET,
    BOS, etc). Schema mismatch comme team_stats v50.0 + footballdata v50.3.
    Fix : lookup par abbr d'abord, fallback _norm(name).
    """
    ns = _load_json(ROOT / 'nba_team_stats.json')
    if not ns:
        return 0
    teams_idx = ns.get('teams') or ns.get('by_team') or {}
    if not teams_idx:
        return 0
    # Build a name-based index for fallback (some sources may index by name).
    by_name = {}
    for k, v in teams_idx.items():
        if isinstance(v, dict):
            nm = v.get('name', '')
            if nm:
                by_name[_norm(nm)] = v
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('league_code') != 'nba':
                continue
            for c in (ev.get('competitors') or []):
                # Try abbr first (DET, BOS, etc.), fallback to normalized name.
                abbr = (c.get('abbr') or '').upper()
                stats = teams_idx.get(abbr) if abbr else None
                if not stats:
                    stats = by_name.get(_norm(c.get('name') or ''))
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


def patch_nba_advanced(data: dict) -> int:
    """v51.5 — Inject NBA advanced stats (ESPN team-level) sur competitors NBA."""
    adv = _load_json(ROOT / 'nba_advanced.json')
    if not adv:
        return 0
    teams_idx = adv.get('teams') or {}
    if not teams_idx:
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('sport') != 'basketball' or ev.get('league_code') != 'nba':
                continue
            for c in (ev.get('competitors') or []):
                abbr = (c.get('abbr') or '').upper()
                stats = teams_idx.get(abbr)
                if stats:
                    # Add as nested 'advanced' sub-key (don't overwrite existing nba_stats)
                    c['nba_advanced'] = {
                        'avgPoints': stats.get('avgPoints'),
                        'avgFieldGoalPct': stats.get('avgFieldGoalPct'),
                        'avg3PointPct': stats.get('avg3PointPct'),
                        'avgAssists': stats.get('avgAssists'),
                        'avgRebounds': stats.get('avgRebounds'),
                        'avgSteals': stats.get('avgSteals'),
                        'avgBlocks': stats.get('avgBlocks'),
                        'avgTurnovers': stats.get('avgTurnovers'),
                        'assistTurnoverRatio': stats.get('assistTurnoverRatio'),
                        'avgPointsAgainst': stats.get('avgPointsAgainst'),
                        'efg_approx': stats.get('efg_approx'),
                        'pace_proxy': stats.get('pace_proxy'),
                    }
                    n += 1
    return n


def patch_mlb_advanced(data: dict) -> int:
    """v51.5 — Inject MLB advanced team stats (ESPN team-level) sur competitors MLB."""
    adv = _load_json(ROOT / 'mlb_advanced.json')
    if not adv:
        return 0
    teams_idx = adv.get('teams') or {}
    if not teams_idx:
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('sport') != 'baseball' or ev.get('league_code') != 'mlb':
                continue
            for c in (ev.get('competitors') or []):
                abbr = (c.get('abbr') or '').upper()
                stats = teams_idx.get(abbr)
                if stats:
                    c['mlb_advanced'] = {
                        'team_OPS': stats.get('batting_OPS'),
                        'team_AVG': stats.get('batting_avg'),
                        'team_OBP': stats.get('batting_OBP'),
                        'team_SLG': stats.get('batting_SLG'),
                        'team_HR': stats.get('batting_HR'),
                        'team_R': stats.get('batting_R'),
                        'team_K': stats.get('batting_K'),
                        'team_ERA': stats.get('pitching_ERA'),
                        'team_WHIP': stats.get('pitching_WHIP'),
                        'team_K9': stats.get('pitching_K9'),
                        'team_FPCT': stats.get('fielding_FPCT'),
                        'team_E': stats.get('fielding_E'),
                        'runs_per_game': stats.get('runs_per_game'),
                        'runs_against_per_game': stats.get('runs_against_per_game'),
                    }
                    n += 1
    return n


def patch_nhl_advanced(data: dict) -> int:
    """v51.5 — Inject NHL advanced team stats (ESPN team-level) sur competitors NHL."""
    adv = _load_json(ROOT / 'nhl_advanced.json')
    if not adv:
        return 0
    teams_idx = adv.get('teams') or {}
    if not teams_idx:
        return 0
    n = 0
    for evs in (data.get('days') or {}).values():
        for ev in (evs or []):
            if ev.get('sport') != 'hockey' or ev.get('league_code') != 'nhl':
                continue
            for c in (ev.get('competitors') or []):
                abbr = (c.get('abbr') or '').upper()
                stats = teams_idx.get(abbr)
                if stats:
                    c['nhl_advanced'] = {
                        'goals_per_game': stats.get('goals_per_game'),
                        'goals_against_per_game': stats.get('goals_against_per_game'),
                        'shots_per_game': stats.get('shots_per_game'),
                        'shots_against_per_game': stats.get('shots_against_per_game'),
                        'power_play_pct': stats.get('power_play_pct'),
                        'penalty_kill_pct': stats.get('penalty_kill_pct'),
                        'save_pct': stats.get('save_pct'),
                        'face_off_win_pct': stats.get('face_off_win_pct'),
                    }
                    n += 1
    return n


# ============================================================
# MAIN
# ============================================================


PATCHES = [
    ('weather', patch_weather),
    ('referees', patch_referees),
    ('lineups', patch_lineups),
    ('soccer_injuries', patch_soccer_injuries),
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
    # v51.5 — advanced stats injection (Plan Pronostics Phase 2.1)
    ('nba_advanced', patch_nba_advanced),
    ('mlb_advanced', patch_mlb_advanced),
    ('nhl_advanced', patch_nhl_advanced),
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

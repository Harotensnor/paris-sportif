#!/usr/bin/env python3
"""Fetch recent W/L form for team sports (football/basket/hockey/baseball).

ESPN's scoreboard endpoint omits the `form` field for these sports —
football events often ship only a 5-game string ("WLWWL") while the others
have `form: null`. This script visits each team's `schedule` endpoint
once per cron run, extracts the last 10 completed results, and writes
them to a JSON sidecar that `patch_team_form.py` injects back into
each upcoming event.

Goal : Théo voit la forme récente sur les cards NBA / NHL / MLB comme
sur le foot, ce qui aide vraiment à prendre des décisions (un favori
qui vient de perdre 4 sur 5 mérite plus de prudence).

Self-throttling :
  * cache `team_form.json` is keyed by team ID + sport
  * a per-team entry refreshed if older than RECAPTURE_HOURS
  * concurrent.futures with 6 workers (ESPN tolerates ~10 req/s)
  * cron cadence : every 30 min (cf auto_refresh.py / refresh.yml)
"""
from __future__ import annotations
import json
import re
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
import concurrent.futures

try:
    from curl_cffi import requests as cr
except ImportError:
    import urllib.request
    cr = None  # graceful degradation, we'll use urllib

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE)) if str(HERE) not in sys.path else None
from io_compressed import write_json as _write_json_gz

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
OUT = ROOT / 'team_form.json'
EXTENDED_OUT = ROOT / 'form_stats_extended.json'

RECAPTURE_HOURS = 6.0  # team form changes ~daily, no need to spam ESPN

# ESPN team-schedule endpoint base URLs by (sport, league_code).
# Football/soccer is handled generically because ESPN league codes are already
# present in data.js (eng.1, esp.1, jpn.1, etc.).
SCHEDULE_URLS = {
    ('basketball', 'nba'): 'https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{tid}/schedule',
    ('basketball', 'wnba'): 'https://site.web.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/{tid}/schedule',
    ('basketball', 'ncaa'): 'https://site.web.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/teams/{tid}/schedule',
    ('hockey', 'nhl'): 'https://site.web.api.espn.com/apis/site/v2/sports/hockey/nhl/teams/{tid}/schedule',
    ('baseball', 'mlb'): 'https://site.web.api.espn.com/apis/site/v2/sports/baseball/mlb/teams/{tid}/schedule',
    ('american-football', 'nfl'): 'https://site.web.api.espn.com/apis/site/v2/sports/football/nfl/teams/{tid}/schedule',
}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def _utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _schedule_url(sport: str, code: str, tid: str) -> str | None:
    if sport == 'football' and code:
        return f'https://site.web.api.espn.com/apis/site/v2/sports/soccer/{code}/teams/{tid}/schedule'
    url_tpl = SCHEDULE_URLS.get((sport, code))
    return url_tpl.format(tid=tid) if url_tpl else None


def _fetch_json(url: str) -> dict | None:
    try:
        if cr is not None:
            r = cr.get(url, impersonate='chrome110', timeout=15)
            if r.status_code != 200:
                return None
            return r.json()
        else:
            import urllib.request
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status != 200:
                    return None
                return json.loads(resp.read().decode('utf-8'))
    except Exception:
        return None


def _team_form_from_schedule(payload: dict, team_id: str) -> dict | None:
    """Extract a 10-game form string + record from ESPN's schedule payload."""
    if not isinstance(payload, dict):
        return None
    events = payload.get('events') or []
    completed = []
    for e in events:
        comp = (e.get('competitions') or [{}])[0]
        status = (comp.get('status') or {}).get('type') or {}
        if not status.get('completed'):
            continue
        teams = comp.get('competitors') or []
        me = next((t for t in teams if str(t.get('id')) == str(team_id)), None)
        op = next((t for t in teams if str(t.get('id')) != str(team_id)), None)
        if not me or not op:
            continue
        winner = me.get('winner')
        ms = me.get('score') or {}
        os_ = op.get('score') or {}
        if isinstance(ms, dict):
            ms = ms.get('value')
        if isinstance(os_, dict):
            os_ = os_.get('value')
        try:
            ms = int(float(ms)) if ms is not None else None
            os_ = int(float(os_)) if os_ is not None else None
        except (TypeError, ValueError):
            ms = os_ = None
        completed.append({
            'date': e.get('date'),
            'won': bool(winner),
            'score_for': ms,
            'score_against': os_,
            'opponent_abbr': (op.get('team') or {}).get('abbreviation'),
        })
    if not completed:
        return None
    completed.sort(key=lambda r: r.get('date') or '')
    # Extension 2026-05-01 — Théo a demandé "forme sur 10 derniers matchs".
    # On capture last10 mais on garde last5 dans la sortie pour backward
    # compat (frontend lit l'un ou l'autre). Le `form` string passe à 10 chars.
    last10 = completed[-10:]
    last5 = completed[-5:]
    form10 = ''.join('W' if r['won'] else 'L' for r in last10)
    form5 = ''.join('W' if r['won'] else 'L' for r in last5)
    # Padding inversion (most recent first like ESPN football "WLWWL"
    # which is also "most recent first" — see derivedForm in pronostics.html).
    return {
        'form': form10[::-1],          # 10 chars, most recent first
        'form5': form5[::-1],          # 5 chars (backward compat)
        'last10': last10,
        'last5': last5,
        'updated_at': _utc_now_iso(),
    }


def _collect_teams(data: dict) -> list[tuple[str, str, str]]:
    """Walk data.js and return list of (sport, league_code, team_id) triples
    that we know how to look up."""
    out = set()
    for day, evs in (data.get('days') or {}).items():
        for ev in evs or []:
            sport = ev.get('sport')
            code = ev.get('league_code')
            if not _schedule_url(str(sport or ''), str(code or ''), '{tid}'):
                continue
            for c in ev.get('competitors') or []:
                tid = c.get('id')
                if tid:
                    out.add((sport, code, str(tid)))
    return sorted(out)


def _build_extended_stats(cache: dict) -> dict:
    """Build a compact multi-sport summary from the cached ESPN forms."""
    teams = {}
    by_sport = {}
    for key, info in sorted((cache or {}).items()):
        parts = str(key).split(':', 2)
        if len(parts) != 3 or not isinstance(info, dict):
            continue
        sport, league_code, team_id = parts
        last10 = info.get('last10') or []
        wins = sum(1 for r in last10 if r.get('won'))
        losses = sum(1 for r in last10 if r.get('won') is False)
        sf = [r.get('score_for') for r in last10 if isinstance(r.get('score_for'), (int, float))]
        sa = [r.get('score_against') for r in last10 if isinstance(r.get('score_against'), (int, float))]
        rec = {
            'sport': sport,
            'league_code': league_code,
            'team_id': team_id,
            'form': info.get('form') or info.get('form5') or '',
            'form5': info.get('form5') or '',
            'games_l10': len(last10),
            'wins_l10': wins,
            'losses_l10': losses,
            'win_rate_l10': round(wins / len(last10), 3) if last10 else None,
            'avg_for_l10': round(sum(sf) / len(sf), 2) if sf else None,
            'avg_against_l10': round(sum(sa) / len(sa), 2) if sa else None,
            'updated_at': info.get('updated_at'),
        }
        teams[key] = rec
        bucket = by_sport.setdefault(sport, {
            'teams': 0, 'games_l10': 0, 'wins_l10': 0, 'avg_win_rate_l10': 0.0
        })
        bucket['teams'] += 1
        bucket['games_l10'] += len(last10)
        bucket['wins_l10'] += wins
        if rec['win_rate_l10'] is not None:
            bucket['avg_win_rate_l10'] += rec['win_rate_l10']
    for bucket in by_sport.values():
        n = bucket['teams'] or 1
        bucket['avg_win_rate_l10'] = round(bucket['avg_win_rate_l10'] / n, 3)
    return {
        'generated_at': _utc_now_iso(),
        'source': 'ESPN public team schedule endpoints',
        'teams_total': len(teams),
        'sports_total': len(by_sport),
        'by_sport': by_sport,
        'teams': teams,
    }


def main():
    t0 = time.time()
    if not DATA_JS.exists():
        print('[fetch_team_form] data.js missing, skipping.')
        return

    text = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL)
    if not m:
        print('[fetch_team_form] could not parse data.js')
        return
    data = json.loads(m.group(1))

    # Load existing cache (skip recently-fetched teams)
    cache: dict = {}
    if OUT.exists():
        try:
            cache = json.loads(OUT.read_text(encoding='utf-8'))
        except json.JSONDecodeError:
            cache = {}

    cutoff = _utc_now_naive() - timedelta(hours=RECAPTURE_HOURS)
    teams = _collect_teams(data)
    todo = []
    for sport, code, tid in teams:
        key = f'{sport}:{code}:{tid}'
        prev = cache.get(key)
        if prev:
            try:
                ts = datetime.fromisoformat(str(prev.get('updated_at', '')).rstrip('Z'))
                if ts > cutoff:
                    continue  # fresh enough, skip
            except (ValueError, TypeError):
                pass
        todo.append((sport, code, tid, key))

    print(f'[fetch_team_form] {len(teams)} teams seen | {len(todo)} need refresh', flush=True)

    def work(item):
        sport, code, tid, key = item
        url = _schedule_url(sport, code, tid)
        if not url:
            return key, None
        payload = _fetch_json(url)
        return key, _team_form_from_schedule(payload, tid)

    written = 0
    if todo:
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
            for key, info in ex.map(work, todo):
                if info:
                    cache[key] = info
                    written += 1

    # AUDIT 2026-05-08 v40 — gzip OUT (~1.1 MB → ~0.3 MB) pour réduire la croissance git.
    # EXTENDED_OUT reste plain (plus petit, frontend ne le fetch pas).
    _write_json_gz(OUT, cache)
    EXTENDED_OUT.write_text(
        json.dumps(_build_extended_stats(cache), ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8'
    )
    elapsed = time.time() - t0
    print(f'[fetch_team_form] wrote {written} forms, total cache size {len(cache)} | {elapsed:.1f}s', flush=True)


if __name__ == '__main__':
    main()

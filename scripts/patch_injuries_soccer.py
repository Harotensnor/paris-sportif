#!/usr/bin/env python3
"""Attach Sofascore soccer injuries to each ESPN event in data.js.

Soccer events in data.js carry ``name`` as ``"Away at Home"`` (ESPN
convention) and competitors with ``home_away`` set but no team name.
So we parse the name, normalize, and match against
``injuries_soccer.json`` produced by ``fetch_injuries_soccer.py``.

Adds to each soccer event:
  ev['competitors'][i]['injuries']  list of {player, reason, reason_label, type}
  ev['injuries_home']  severe-absence count (reason ∈ {1,2,10} i.e.
                       injured / suspended / doubtful)
  ev['injuries_away']  same, for away side
  ev['injuries_home_known']  bool — did Sofascore publish a lineup we read?
  ev['injuries_away_known']  bool — (model should down-weight when false,
                             to avoid treating "no data" as "no absences")
  ev['injuries_source'] 'sofascore' (so the model knows where data came from)

Idempotent — safe to re-run; later runs overwrite previous attachments.

Fallbacks:
  1. Exact match on normalized name  ("Crystal Palace" == "Crystal Palace")
  2. Token-set match (handles "Tottenham Hotspur" vs "Tottenham",
     "AFC Bournemouth" vs "Bournemouth", etc.)
"""
import json
import re
import sys
import time
from pathlib import Path
from datetime import datetime

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import _norm, _name_tokens

DATA_JS = Path(__file__).resolve().parent.parent / 'data.js'
HTML = Path(__file__).resolve().parent.parent / 'pronostics.html'
INJ = Path(__file__).resolve().parent.parent / 'injuries_soccer.json'

# Only soccer leagues covered by the Sofascore scraper. Avoid touching
# events from other leagues — fetch_injuries.py (ESPN) handles those.
SOCCER_LEAGUES = {'eng.1', 'esp.1', 'ger.1', 'ita.1', 'fra.1'}

# Reason codes that count as "severe" for the injuries_{home,away} tally.
# Excludes international duty (13), coach decision (4), unknown (0).
SEVERE_REASONS = {1, 2, 10}  # injured, suspended, doubtful

# Hand-maintained alias table for the few ESPN↔Sofascore names that share
# zero tokens and can't be rescued by fuzzy matching. Keyed by _norm(espn).
# Keep this list tiny — prefer fixing fuzzy rules first.
ESPN_TO_SOFA_ALIAS = {
    'brest': 'stadebrestois',          # ESPN "Brest" vs Sofascore "Stade Brestois"
    'lyon': 'olympiquelyonnais',       # ESPN "Lyon" vs Sofascore "Olympique Lyonnais"
}


def parse_names(ev_name: str) -> tuple[str, str]:
    """'Away at Home' → (away, home). Returns ('', '') on unparseable."""
    if not ev_name or ' at ' not in ev_name:
        return ('', '')
    parts = ev_name.split(' at ', 1)
    if len(parts) != 2:
        return ('', '')
    return (parts[0].strip(), parts[1].strip())


def build_token_index(teams: dict) -> dict[frozenset, list[dict]]:
    """Map token-set → team record, for fuzzy fallback matching.
    We key by the actual set of tokens so a 2-token ESPN name can match
    a 2-token Sofascore name with shared tokens."""
    idx: dict[frozenset, list[dict]] = {}
    for norm_name, lst in teams.items():
        # Recover a display name from the first entry; _name_tokens needs spaces.
        if not lst:
            continue
        display = lst[0].get('team') or norm_name
        toks = frozenset(_name_tokens(display))
        if toks:
            idx.setdefault(toks, []).extend(lst)
    return idx


def resolve_key(name: str, exact: dict, token_idx: dict[frozenset, list[dict]],
                scanned: dict) -> tuple[list[dict], bool]:
    """Return (injury_list, was_scanned). Tries alias → exact → token-fuzzy.

    ``was_scanned`` means Sofascore gave us a lineup for this team at some
    point, so an empty ``injury_list`` means "0 absences" rather than
    "we don't know". The caller should down-weight the signal when False.
    """
    key = _norm(name)

    # 1. Alias table (ESPN short names that share no tokens with Sofascore)
    alias_key = ESPN_TO_SOFA_ALIAS.get(key)
    if alias_key:
        if alias_key in exact:
            return (exact[alias_key], alias_key in scanned)
        # aliased but no injuries — still "scanned" if alias is in scanned set
        return ([], alias_key in scanned)

    # 2. Exact match on normalized name
    if key in exact:
        return (exact[key], True)  # presence in exact implies scanned
    if key in scanned:
        return ([], True)  # scanned but no missing players

    # 3. Token fallback — require at least one shared meaningful token ≥ 4
    # chars to avoid short-token collisions ("Bayern" vs "Stuttgart": no
    # overlap, expected miss; "Tottenham Hotspur" vs "Tottenham": shares
    # the 9-char "tottenham").
    name_toks = _name_tokens(name)
    if not name_toks:
        return ([], False)
    best: list[dict] = []
    best_overlap = 0
    for toks, lst in token_idx.items():
        shared = toks & name_toks
        if not shared:
            continue
        if max(len(t) for t in shared) < 4:
            continue
        overlap = len(shared)
        if overlap > best_overlap:
            best_overlap = overlap
            best = lst
    # For token fallback, we can't reliably say "scanned" without the
    # scanned set being token-indexed too. Assume scanned == True iff we
    # found an injury record, else unknown.
    return (best, bool(best))


def main() -> int:
    t0 = time.time()
    if not INJ.exists():
        print(f'ERROR: {INJ} not found. Run fetch_injuries_soccer.py first.')
        return 1
    if not DATA_JS.exists():
        print(f'ERROR: {DATA_JS} not found.')
        return 1

    inj_data = json.loads(INJ.read_text(encoding='utf-8'))
    teams: dict = inj_data.get('teams') or {}
    scanned: dict = inj_data.get('scanned_teams') or {}
    token_idx = build_token_index(teams)
    print(f'[{datetime.now():%H:%M:%S}] soccer injuries: {len(teams)} teams w/ injuries, '
          f'{len(scanned)} scanned total ({len(token_idx)} unique token sets)',
          flush=True)

    text = DATA_JS.read_text(encoding='utf-8')
    data = json.loads(re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL).group(1))

    stats = {'events_scanned': 0, 'events_tagged': 0,
             'home_known': 0, 'away_known': 0,
             'home_with_inj': 0, 'away_with_inj': 0}
    for day, events in (data.get('days') or {}).items():
        for ev in events:
            if ev.get('league_code') not in SOCCER_LEAGUES:
                continue
            if ev.get('completed'):
                continue
            stats['events_scanned'] += 1
            away_name, home_name = parse_names(ev.get('name') or '')
            if not (home_name and away_name):
                continue

            home_inj, home_known = resolve_key(home_name, teams, token_idx, scanned)
            away_inj, away_known = resolve_key(away_name, teams, token_idx, scanned)

            # Attach per-competitor
            for c in ev.get('competitors') or []:
                ha = c.get('home_away')
                if ha == 'home':
                    c['injuries'] = home_inj
                elif ha == 'away':
                    c['injuries'] = away_inj

            ev['injuries_home'] = sum(
                1 for x in home_inj if x.get('reason') in SEVERE_REASONS
            )
            ev['injuries_away'] = sum(
                1 for x in away_inj if x.get('reason') in SEVERE_REASONS
            )
            ev['injuries_home_known'] = home_known
            ev['injuries_away_known'] = away_known
            ev['injuries_source'] = 'sofascore'
            if home_known:
                stats['home_known'] += 1
            if away_known:
                stats['away_known'] += 1
            if home_inj:
                stats['home_with_inj'] += 1
            if away_inj:
                stats['away_with_inj'] += 1
            if home_inj or away_inj:
                stats['events_tagged'] += 1

    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')

    # v33.28 — HTML rewrite déplacé dans scripts/inject_data_in_html.py
    # (1 seul appel à la fin du pipeline plutôt que 12 regex sur ~13500 lignes)
    print(f'[{datetime.now():%H:%M:%S}] soccer injuries attached in {time.time()-t0:.1f}s · '
          f'{stats["events_scanned"]} events scanned, {stats["events_tagged"]} with ≥1 injury · '
          f'coverage: home_known={stats["home_known"]}/{stats["events_scanned"]}, '
          f'away_known={stats["away_known"]}/{stats["events_scanned"]} · '
          f'home_with_inj={stats["home_with_inj"]}, away_with_inj={stats["away_with_inj"]}',
          flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())

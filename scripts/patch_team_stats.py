#!/usr/bin/env python3
"""Attach last-5 aggregate stats from team_stats.json to each competitor in data.js.

Adds the following fields to every `competitor` on every non-completed event
that has a matching team entry in team_stats.json::

    competitor.form_stats = {
        'played5': int, 'wins5': int, 'draws5': int, 'losses5': int,
        'gf5': int, 'ga5': int,
        'avg_gf5': float, 'avg_ga5': float,
        'cleans5': int, 'failed_to_score5': int,
    }
    competitor.last5 = [{date, ha, opp, gf, ga, result}, ...]

Existing `competitor.form` (e.g. "WWDLW") is NOT overwritten — we just add
a richer structured sibling so the JS side can surface goal differentials
and the modal can render the actual scoreline list.

Why split fetch/patch: follows the same pattern as `fetch_winamax_catalog.py +
patch_winamax.py` and `fetch_injuries_soccer.py + patch_injuries_soccer.py`.
Fetch is expensive (ESPN API, runs on cron); patch is fast and runs every tick.
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data.js'
STATS_PATH = ROOT / 'team_stats.json'


def load_data() -> dict:
    txt = DATA_PATH.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[patch_team_stats] could not parse data.js', file=sys.stderr)
        sys.exit(1)
    return json.loads(m.group(1))


def save_data(d: dict) -> None:
    DATA_PATH.write_text(
        'window.PRONOSTICS_DATA = ' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n',
        encoding='utf-8',
    )


# AUDIT-2026-04-27 (P1) — Garde-fou défensif : seuils impossibles par sport.
# Football : un club marque/encaisse rarement >5 buts/match en moyenne L5.
# Si une stat dépasse ce seuil, c'est qu'on lit du basket/hockey contaminé
# (ESPN partage des team_ids entre sports → tid=20 = Boston Celtics ET
# Unión Santa Fe). On rejette plutôt que de patcher faux.
_SPORT_GF_GA_MAX = {
    'football': 5.0,   # foot : très exceptionnellement ≥5 (Bayern écrase)
    'soccer':   5.0,   # alias possible selon ev.sport
    # autres sports : pas de garde-fou (le contaminant ne peut pas venir
    # d'un sport plus offensif → si NBA contamine NBA c'est un autre bug).
}


def _stats_look_invalid_for_sport(sport: str, s: dict) -> bool:
    """Retourne True si les stats agrégées dépassent les seuils plausibles
    du sport — typique d'une contamination inter-sports (NBA stats sur
    un club de foot, par ex.). Vérifie aussi last5 pour des scores
    aberrants comme 100-108 (foot impossible)."""
    cap = _SPORT_GF_GA_MAX.get(sport)
    if cap is None:
        return False
    avg_gf5 = s.get('avg_gf5') or 0
    avg_ga5 = s.get('avg_ga5') or 0
    if avg_gf5 > cap or avg_ga5 > cap:
        return True
    # Vérifie aussi les scores individuels (un seul match 100-108 trahit la
    # contamination même si la moyenne n'a pas encore passé le seuil).
    for m in s.get('last5') or []:
        gf = m.get('gf') or 0
        ga = m.get('ga') or 0
        if gf > 15 or ga > 15:
            return True
    return False


def main() -> int:
    if not STATS_PATH.exists():
        print(f'[patch_team_stats] {STATS_PATH.name} missing — run fetch_team_stats.py first')
        return 0  # non-fatal; pipeline continues

    stats = json.loads(STATS_PATH.read_text(encoding='utf-8'))
    teams: dict[str, dict] = stats.get('teams') or {}
    if not teams:
        print('[patch_team_stats] empty stats — nothing to patch')
        return 0

    # AUDIT-2026-04-27 (P1) — détecte le format de clé : v2 = `lc:tid`,
    # v1 (legacy) = `tid` seul. v1 reste accepté en fallback le temps
    # que le cron rebuilde via fetch_team_stats.py mis à jour, mais on
    # essaie toujours v2 d'abord si dispo.
    schema_v2 = stats.get('schema_version') == 2 or any(':' in k for k in teams)

    d = load_data()
    patched_events = 0
    patched_competitors = 0
    total_competitors = 0
    skipped_sport_mismatch = 0
    skipped_invalid_stats = 0
    cleaned_existing_contamination = 0
    for day_key, evs in (d.get('days') or {}).items():
        for ev in evs:
            if ev.get('completed'):
                continue
            ev_sport = ev.get('sport') or ''
            ev_lc = ev.get('league_code') or ''
            ev_changed = False
            for c in ev.get('competitors') or []:
                total_competitors += 1
                tid = str(c.get('id') or '')
                if not tid:
                    continue
                # AUDIT-2026-04-27 (P1) — Cleanup proactif : si l'event
                # a déjà des form_stats contaminés (NBA→foot) hérités de
                # l'ancienne pipeline, on les purge avant d'essayer de
                # patcher avec les nouvelles données. Sans ça la
                # contamination persiste si le nouveau patch ne trouve
                # pas de remplacement (skip cross-sport ou invalid).
                existing_fs = c.get('form_stats') or {}
                existing_l5 = c.get('last5') or []
                if existing_fs or existing_l5:
                    fake_s = {
                        'avg_gf5': existing_fs.get('avg_gf5') or 0,
                        'avg_ga5': existing_fs.get('avg_ga5') or 0,
                        'last5': existing_l5,
                    }
                    if _stats_look_invalid_for_sport(ev_sport, fake_s):
                        c.pop('form_stats', None)
                        c.pop('last5', None)
                        cleaned_existing_contamination += 1
                        ev_changed = True
                # Lookup composite key d'abord, fallback v1 si pas trouvé.
                s = None
                if schema_v2 and ev_lc:
                    s = teams.get(f'{ev_lc}:{tid}')
                if s is None:
                    s = teams.get(tid)  # legacy v1 fallback
                if not s or s.get('played5', 0) == 0:
                    continue
                # Garde-fou cross-sport : si la stat porte un `sport`
                # explicite et ne matche pas le sport de l'event, on
                # skip. Couvre le cas où legacy v1 est utilisé et un
                # tid partagé entre sports passe à travers la cle
                # composite. ESPN 'soccer' === frontend 'football'.
                stats_sport = s.get('sport') or ''
                if stats_sport and ev_sport:
                    matches = (
                        stats_sport == ev_sport
                        or (stats_sport == 'soccer' and ev_sport == 'football')
                        or (stats_sport == 'football' and ev_sport == 'american-football')
                    )
                    if not matches:
                        skipped_sport_mismatch += 1
                        continue
                # Garde-fou stats absurdes : foot avec stats NBA-level → skip
                if _stats_look_invalid_for_sport(ev_sport, s):
                    skipped_invalid_stats += 1
                    continue
                c['form_stats'] = {
                    'played5': s['played5'],
                    'wins5': s['wins5'], 'draws5': s['draws5'], 'losses5': s['losses5'],
                    'gf5': s['gf5'], 'ga5': s['ga5'],
                    'avg_gf5': s['avg_gf5'], 'avg_ga5': s['avg_ga5'],
                    'cleans5': s['cleans5'], 'failed_to_score5': s['failed_to_score5'],
                }
                c['last5'] = s.get('last5') or []
                patched_competitors += 1
                ev_changed = True
            if ev_changed:
                patched_events += 1

    save_data(d)
    msg = (f'[patch_team_stats] patched {patched_competitors}/{total_competitors} competitors '
           f'across {patched_events} events')
    if cleaned_existing_contamination:
        msg += f' · cleaned {cleaned_existing_contamination} pre-existing contaminations'
    if skipped_sport_mismatch:
        msg += f' · skipped {skipped_sport_mismatch} sport-mismatch'
    if skipped_invalid_stats:
        msg += f' · skipped {skipped_invalid_stats} invalid-stats (likely cross-sport contamination)'
    print(msg)
    return 0


if __name__ == '__main__':
    sys.exit(main())

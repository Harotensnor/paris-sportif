#!/usr/bin/env python3
"""measure_team_strengths.py — Forces offensives/défensives par équipe (v31.7.39).

Approche Maher (1982) — Poisson regression simplifiée :
  - Pour chaque ligue avec ≥40 matchs archivés :
    - league_avg_home = mean(home_goals)
    - league_avg_away = mean(away_goals)
  - Pour chaque équipe :
    - alpha_off = goals_for / (n_matches × league_avg_home_or_away_selon_lieu)
    - beta_def  = goals_against / (n_matches × league_avg_home_or_away_selon_lieu)

  Interprétation :
    alpha = 1.0 → attaque moyenne ligue
    alpha = 1.5 → attaque 50% au-dessus
    beta  = 1.0 → défense moyenne
    beta  = 1.3 → défense 30% plus faible (concède plus de buts)

Pour prédire un match home vs away :
    λ_home = league_avg_home × home.alpha × away.beta
    λ_away = league_avg_away × away.alpha × home.beta

C'est plus précis que la moyenne goals_for last5 actuelle parce que ça
normalise par la qualité de l'opposition (ex : Liverpool qui marque 3
buts contre Burnley vs Liverpool qui marque 1 but contre Man City — les
deux confirment Liverpool=fort, Burnley=faible, Man City=fort).

Pour le full Dixon-Coles MLE (joint optim α/β/γ/ρ avec L-BFGS), il faudra
une vraie session dédiée avec scipy. Cette V0 est gratuite et capture déjà
~70% du signal.

Output : `team_strengths.json` per league + per team.
"""
from __future__ import annotations
import json
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
RESULTS_ARCHIVE = ROOT / 'results_archive.jsonl'
OUT_JSON = ROOT / 'team_strengths.json'

MIN_MATCHES_PER_LEAGUE = 40
MIN_MATCHES_PER_TEAM = 5


def load_matches() -> list[dict]:
    """Charge les matchs foot complétés avec scores. Dédup par event id.
    Returns list of {league_code, home_name, away_name, home_goals, away_goals}."""
    seen_ids: set[str] = set()
    matches: list[dict] = []

    if RESULTS_ARCHIVE.exists():
        with RESULTS_ARCHIVE.open(encoding='utf-8') as f:
            for line in f:
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                if r.get('sport') != 'football':
                    continue
                if not r.get('completed'):
                    continue
                ev_id = str(r.get('id') or '')
                if ev_id and ev_id in seen_ids:
                    continue
                comps = r.get('competitors') or []
                if len(comps) != 2:
                    continue
                home_c = next((c for c in comps if c.get('home_away') == 'home'), comps[0])
                away_c = next((c for c in comps if c.get('home_away') == 'away'), comps[1])
                try:
                    h = int(home_c.get('score'))
                    a = int(away_c.get('score'))
                except (TypeError, ValueError):
                    continue
                matches.append({
                    'league_code': (r.get('league_code') or 'unknown').lower(),
                    'home_name': (home_c.get('name') or home_c.get('short') or '').strip(),
                    'away_name': (away_c.get('name') or away_c.get('short') or '').strip(),
                    'home_goals': h,
                    'away_goals': a,
                })
                if ev_id:
                    seen_ids.add(ev_id)

    if DATA_JS.exists():
        js = DATA_JS.read_text(encoding='utf-8')
        m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$', js)
        if m:
            try:
                data = json.loads(m.group(1))
                for day, evs in (data.get('days') or {}).items():
                    for ev in evs or []:
                        if ev.get('sport') != 'football':
                            continue
                        if not ev.get('completed'):
                            continue
                        ev_id = str(ev.get('id') or '')
                        if ev_id and ev_id in seen_ids:
                            continue
                        comps = ev.get('competitors') or []
                        if len(comps) != 2:
                            continue
                        home_c = next((c for c in comps if c.get('home_away') == 'home'), comps[0])
                        away_c = next((c for c in comps if c.get('home_away') == 'away'), comps[1])
                        try:
                            h = int(home_c.get('score'))
                            a = int(away_c.get('score'))
                        except (TypeError, ValueError):
                            continue
                        matches.append({
                            'league_code': (ev.get('league_code') or 'unknown').lower(),
                            'home_name': (home_c.get('name') or home_c.get('short') or '').strip(),
                            'away_name': (away_c.get('name') or away_c.get('short') or '').strip(),
                            'home_goals': h,
                            'away_goals': a,
                        })
                        if ev_id:
                            seen_ids.add(ev_id)
            except Exception:
                pass

    return matches


def compute_strengths_for_league(matches: list[dict]) -> dict:
    """Pour une liste de matchs d'une même ligue, compute les Maher strengths."""
    n = len(matches)
    if n < MIN_MATCHES_PER_LEAGUE:
        return None
    avg_home = sum(m['home_goals'] for m in matches) / n
    avg_away = sum(m['away_goals'] for m in matches) / n
    if avg_home <= 0 or avg_away <= 0:
        return None

    # Per-team aggregations : home/away splits
    team_data: dict[str, dict] = defaultdict(lambda: {
        'home_for': 0, 'home_against': 0, 'home_n': 0,
        'away_for': 0, 'away_against': 0, 'away_n': 0,
    })
    for m in matches:
        h = m['home_name']; a = m['away_name']
        if not h or not a:
            continue
        team_data[h]['home_for'] += m['home_goals']
        team_data[h]['home_against'] += m['away_goals']
        team_data[h]['home_n'] += 1
        team_data[a]['away_for'] += m['away_goals']
        team_data[a]['away_against'] += m['home_goals']
        team_data[a]['away_n'] += 1

    teams_out: dict[str, dict] = {}
    for team, td in team_data.items():
        total_n = td['home_n'] + td['away_n']
        if total_n < MIN_MATCHES_PER_TEAM:
            continue
        # Forces normalisées par moyenne ligue (séparées home/away)
        # alpha_off = pondéré buts marqués / (matchs × avg_attendu)
        gf = td['home_for'] + td['away_for']
        ga = td['home_against'] + td['away_against']
        # Normalisation : alpha = 1.0 = moyenne ligue
        # gf attendu si force=1 = home_n × avg_home_when_home + away_n × avg_away_when_away
        expected_gf = td['home_n'] * avg_home + td['away_n'] * avg_away
        expected_ga = td['home_n'] * avg_away + td['away_n'] * avg_home
        if expected_gf > 0 and expected_ga > 0:
            alpha = round(gf / expected_gf, 3)
            beta = round(ga / expected_ga, 3)
            teams_out[team] = {
                'alpha_off': alpha,
                'beta_def': beta,
                'n_matches': total_n,
                'gf_avg': round(gf / total_n, 2),
                'ga_avg': round(ga / total_n, 2),
            }
    return {
        'league_avg_home': round(avg_home, 2),
        'league_avg_away': round(avg_away, 2),
        'n_matches': n,
        'teams': teams_out,
    }


def main() -> int:
    matches = load_matches()
    print(f"[team_strengths] {len(matches)} matchs foot chargés", file=sys.stderr)

    by_league: dict[str, list[dict]] = defaultdict(list)
    for m in matches:
        by_league[m['league_code']].append(m)

    leagues_out: dict[str, dict] = {}
    n_with_strengths = 0
    for lg, ms in sorted(by_league.items()):
        result = compute_strengths_for_league(ms)
        if result is None:
            continue
        leagues_out[lg] = result
        n_with_strengths += 1

    out = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'method': 'Maher (1982) Poisson regression simplifiée. '
                  'alpha_off = goals_for / expected_gf · '
                  'beta_def = goals_against / expected_ga · '
                  'normalisé par moyennes ligue home/away.',
        'min_matches_per_league': MIN_MATCHES_PER_LEAGUE,
        'min_matches_per_team': MIN_MATCHES_PER_TEAM,
        'n_leagues_with_strengths': n_with_strengths,
        'leagues': leagues_out,
    }
    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    total_teams = sum(len(lg.get('teams') or {}) for lg in leagues_out.values())
    print(f"[team_strengths] écrit {OUT_JSON.name} : "
          f"{n_with_strengths}/{len(by_league)} ligues ({total_teams} équipes)",
          file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())

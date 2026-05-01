#!/usr/bin/env python3
"""measure_team_strengths_mle.py — Full Bivariate Poisson MLE Dixon-Coles (v31.7.63).

Différence avec measure_team_strengths.py (V0 Maher 1982) :
- Maher V0 : alpha = goals_for / expected_gf (ratio simple)
- MLE V1 : optimise JOINTEMENT alpha (force off), beta (force def),
           gamma (home advantage), rho (Dixon-Coles τ) via likelihood max

Modèle :
  λ_h = exp(α_h - β_a + γ)        # home goals expected
  λ_a = exp(α_a - β_h)             # away goals expected
  P(h, a) = Poisson(h; λ_h) × Poisson(a; λ_a) × τ(h, a; λ_h, λ_a, ρ)

Algorithme : coordinate descent (pure Python, pas de scipy).
- Init : tous à 0, γ=0.3, ρ=-0.13
- Boucle : pour chaque param 1D, golden-section search avec early stop
- Stop quand Δlog L < 0.5 entre 2 passages full

Contrainte d'identifiabilité : Σ α_i = 0 (recentrage à chaque itération).

Output `team_strengths_mle.json` :
{
  "leagues": {
    "eng.1": {
      "n_matches": 200,
      "gamma": 0.34,
      "rho": -0.08,
      "log_lik": -512.3,
      "iterations": 6,
      "teams": {
        "Liverpool": {"alpha": 0.45, "beta": 0.38, "rank_off": 1, "rank_def": 3},
        ...
      }
    }
  }
}

Tourne en CI hebdo (lent, ~30s par ligue avec ≥40 matchs).
"""
from __future__ import annotations
import json
import math
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
RESULTS_ARCHIVE = ROOT / 'results_archive.jsonl'
OUT_JSON = ROOT / 'team_strengths_mle.json'

MIN_MATCHES_PER_LEAGUE = 40
MIN_MATCHES_PER_TEAM = 5
MAX_ITERATIONS = 10
TOLERANCE = 0.5            # log-likelihood gain threshold
MAX_GOALS = 8              # bornes Poisson (au-delà négligeable)


def _factorial(n: int) -> int:
    """math.factorial wrapper for compatibility."""
    return math.factorial(n)


def _poisson_pmf(k: int, lam: float) -> float:
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    if lam > 30:
        # Stirling pour éviter overflow
        return math.exp(k * math.log(lam) - lam - math.lgamma(k + 1))
    return math.exp(-lam) * (lam ** k) / _factorial(k)


def _dc_tau(h: int, a: int, lam_h: float, lam_a: float, rho: float) -> float:
    """Correction Dixon-Coles τ pour scores nuls bas."""
    if h == 0 and a == 0:
        return max(1e-9, 1 - lam_h * lam_a * rho)
    if h == 0 and a == 1:
        return max(1e-9, 1 + lam_h * rho)
    if h == 1 and a == 0:
        return max(1e-9, 1 + lam_a * rho)
    if h == 1 and a == 1:
        return max(1e-9, 1 - rho)
    return 1.0


def _match_log_lik(h: int, a: int, alpha_h: float, alpha_a: float,
                   beta_h: float, beta_a: float, gamma: float, rho: float) -> float:
    """Log-likelihood pour un match. λ_h = exp(α_h - β_a + γ), λ_a = exp(α_a - β_h)."""
    lam_h = math.exp(alpha_h - beta_a + gamma)
    lam_a = math.exp(alpha_a - beta_h)
    p_base = _poisson_pmf(h, lam_h) * _poisson_pmf(a, lam_a)
    tau = _dc_tau(h, a, lam_h, lam_a, rho)
    p = p_base * tau
    if p <= 0:
        return -50.0  # cap pour éviter -inf
    return math.log(p)


def total_log_lik(matches: list[tuple[str, str, int, int]],
                  alpha: dict[str, float], beta: dict[str, float],
                  gamma: float, rho: float) -> float:
    total = 0.0
    for home, away, h, a in matches:
        ah = alpha.get(home, 0.0)
        aa = alpha.get(away, 0.0)
        bh = beta.get(home, 0.0)
        ba = beta.get(away, 0.0)
        total += _match_log_lik(h, a, ah, aa, bh, ba, gamma, rho)
    return total


def golden_section_1d(f, lo: float, hi: float, tol: float = 0.01,
                      max_iter: int = 30) -> tuple[float, float]:
    """Golden-section search pour MAX f(x) sur [lo, hi].
    Retourne (x_optimal, f(x_optimal))."""
    phi = (1 + math.sqrt(5)) / 2
    a, b = lo, hi
    c = b - (b - a) / phi
    d = a + (b - a) / phi
    fc, fd = f(c), f(d)
    for _ in range(max_iter):
        if abs(b - a) < tol:
            break
        if fc > fd:
            b = d
            d = c
            fd = fc
            c = b - (b - a) / phi
            fc = f(c)
        else:
            a = c
            c = d
            fc = fd
            d = a + (b - a) / phi
            fd = f(d)
    x = (a + b) / 2
    return x, f(x)


def fit_league(matches: list[tuple[str, str, int, int]]) -> dict | None:
    """Coordinate-descent MLE sur les params (alpha, beta, gamma, rho).
    Returns dict with optimized params + per-team alpha/beta or None si impossible."""
    if len(matches) < MIN_MATCHES_PER_LEAGUE:
        return None

    # Liste équipes avec ≥ MIN_MATCHES_PER_TEAM
    appearances = defaultdict(int)
    for home, away, _, _ in matches:
        appearances[home] += 1
        appearances[away] += 1
    teams = sorted([t for t, n in appearances.items() if n >= MIN_MATCHES_PER_TEAM])
    if len(teams) < 4:
        return None

    # Init
    alpha = {t: 0.0 for t in teams}
    beta = {t: 0.0 for t in teams}
    gamma = 0.3
    rho = -0.13

    prev_ll = total_log_lik(matches, alpha, beta, gamma, rho)
    iterations = 0
    for it in range(MAX_ITERATIONS):
        iterations = it + 1
        # 1. Optimiser chaque alpha (force offensive) une à une
        for team in teams:
            def f_alpha(x, t=team):
                old = alpha[t]
                alpha[t] = x
                ll = total_log_lik(matches, alpha, beta, gamma, rho)
                alpha[t] = old
                return ll
            best_x, _ = golden_section_1d(f_alpha, -1.5, 1.5, tol=0.02)
            alpha[team] = best_x

        # Recentrage : Σ α_i = 0 (identifiabilité)
        mean_a = sum(alpha.values()) / len(alpha)
        for t in alpha:
            alpha[t] -= mean_a

        # 2. Optimiser chaque beta (force défensive)
        for team in teams:
            def f_beta(x, t=team):
                old = beta[t]
                beta[t] = x
                ll = total_log_lik(matches, alpha, beta, gamma, rho)
                beta[t] = old
                return ll
            best_x, _ = golden_section_1d(f_beta, -1.5, 1.5, tol=0.02)
            beta[team] = best_x

        # Recentrage
        mean_b = sum(beta.values()) / len(beta)
        for t in beta:
            beta[t] -= mean_b

        # 3. Optimiser gamma (home advantage)
        def f_gamma(x):
            return total_log_lik(matches, alpha, beta, x, rho)
        gamma, _ = golden_section_1d(f_gamma, -0.5, 1.0, tol=0.005)

        # 4. Optimiser rho (Dixon-Coles)
        def f_rho(x):
            return total_log_lik(matches, alpha, beta, gamma, x)
        rho, _ = golden_section_1d(f_rho, -0.30, 0.10, tol=0.005)

        ll = total_log_lik(matches, alpha, beta, gamma, rho)
        gain = ll - prev_ll
        prev_ll = ll
        if gain < TOLERANCE:
            break

    # Rankings off / def
    sorted_off = sorted(teams, key=lambda t: -alpha[t])
    sorted_def = sorted(teams, key=lambda t: beta[t])  # bas beta = bonne défense
    rank_off = {t: i + 1 for i, t in enumerate(sorted_off)}
    rank_def = {t: i + 1 for i, t in enumerate(sorted_def)}

    teams_out = {}
    for t in teams:
        teams_out[t] = {
            'alpha': round(alpha[t], 4),
            'beta': round(beta[t], 4),
            'rank_off': rank_off[t],
            'rank_def': rank_def[t],
        }

    return {
        'n_matches': len(matches),
        'n_teams': len(teams),
        'gamma': round(gamma, 4),
        'rho': round(rho, 4),
        'log_lik': round(prev_ll, 2),
        'iterations': iterations,
        'teams': teams_out,
    }


def load_matches() -> dict[str, list[tuple[str, str, int, int]]]:
    """Charge tous les matchs foot complétés. Returns {league_code: [(home, away, h, a)]}."""
    seen_ids: set[str] = set()
    by_league: dict[str, list] = defaultdict(list)

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
                home_name = (home_c.get('name') or '').strip()
                away_name = (away_c.get('name') or '').strip()
                if not home_name or not away_name:
                    continue
                lg = (r.get('league_code') or 'unknown').lower()
                by_league[lg].append((home_name, away_name, h, a))
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
                        home_name = (home_c.get('name') or '').strip()
                        away_name = (away_c.get('name') or '').strip()
                        if not home_name or not away_name:
                            continue
                        lg = (ev.get('league_code') or 'unknown').lower()
                        by_league[lg].append((home_name, away_name, h, a))
                        if ev_id:
                            seen_ids.add(ev_id)
            except Exception:
                pass

    return dict(by_league)


def main() -> int:
    by_league = load_matches()
    print(f"[mle] {sum(len(v) for v in by_league.values())} matchs · "
          f"{len(by_league)} ligues", file=sys.stderr)

    leagues_out: dict[str, dict] = {}
    for lg, matches in sorted(by_league.items()):
        if len(matches) < MIN_MATCHES_PER_LEAGUE:
            continue
        print(f"[mle] {lg} : {len(matches)} matchs, fitting...", file=sys.stderr)
        fit = fit_league(matches)
        if fit:
            leagues_out[lg] = fit
            print(f"  γ={fit['gamma']:+.3f} ρ={fit['rho']:+.3f} "
                  f"logL={fit['log_lik']:.1f} iter={fit['iterations']}",
                  file=sys.stderr)

    out = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'method': 'Full Bivariate Poisson MLE Dixon-Coles. Coordinate-descent '
                  'avec golden-section search 1D. Pure Python (pas de scipy).',
        'min_matches_per_league': MIN_MATCHES_PER_LEAGUE,
        'min_matches_per_team': MIN_MATCHES_PER_TEAM,
        'n_leagues_fit': len(leagues_out),
        'leagues': leagues_out,
    }
    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    total_teams = sum(len(lg.get('teams') or {}) for lg in leagues_out.values())
    print(f"[mle] écrit {OUT_JSON.name} : {len(leagues_out)} ligues, {total_teams} équipes",
          file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())

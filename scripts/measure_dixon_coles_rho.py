#!/usr/bin/env python3
"""Measure Dixon-Coles ρ per league via maximum likelihood (v31.7.23).

Dixon-Coles (1997) corrige la sous-estimation Poisson naïve des scores bas
foot via une fonction τ paramétrée par ρ ∈ [-0.30, +0.10].

Avant : `app.js` avait `DC_RHO_BY_LEAGUE` hardcodé (litterature
Constantinou-Fenton 2017). Maintenant on **mesure** ρ depuis les matchs
réels archivés (data.js + results_archive.jsonl).

Méthode (simplifiée) :
  1. Pour chaque ligue avec ≥40 matchs avec scores, on calcule λ_h_avg
     et λ_a_avg comme moyennes empiriques home/away goals.
  2. On grid-search ρ ∈ [-0.30, +0.10] step 0.005.
  3. Pour chaque ρ, on calcule la log-likelihood totale :
       log L(ρ) = Σ_match log(P_DC(h, a; λ_h, λ_a, ρ))
     où P_DC = Poisson(h;λh) × Poisson(a;λa) × τ(h,a;λh,λa,ρ)
  4. On sélectionne argmax. CI 95% via likelihood-ratio test (Δlog L = 1.92).

Limitation : on traite λ_h, λ_a comme constants par ligue (pas de team-strength).
C'est une approximation — la vraie MLE de Dixon-Coles fait un fit joint
team-strength + ρ. Mais pour l'usage pré-match (scoreline probas), un ρ
league-level capture ~80% du signal.

Sortie : `dixon_coles_rho.json` avec, par ligue :
  - rho_measured (float ou null si n<40)
  - n (nb matchs)
  - lambda_h, lambda_a (averages observées)
  - rho_ci_lo, rho_ci_hi (95% CI par LR test)
  - rho_used = rho_measured si valide, sinon rho_literature (fallback hardcoded app.js)
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
OUT_JSON = ROOT / 'dixon_coles_rho.json'

# Fallback values from app.js DC_RHO_BY_LEAGUE (synced 2026-04-26).
# Si une ligue est absente ici, elle prendra DEFAULT_RHO.
LITERATURE_RHO = {
    'eng.1': -0.07, 'eng.2': -0.10, 'esp.1': -0.10, 'esp.2': -0.12,
    'ger.1': -0.09, 'ger.2': -0.11, 'ita.1': -0.18, 'ita.2': -0.16,
    'fra.1': -0.15, 'fra.2': -0.14, 'por.1': -0.14, 'ned.1': -0.08,
    'bel.1': -0.11, 'sco.1': -0.13, 'tur.1': -0.13, 'gre.1': -0.14,
    'rus.1': -0.13, 'aut.1': -0.11, 'swi.1': -0.12, 'nor.1': -0.11,
    'swe.1': -0.11, 'usa.1': -0.10, 'mex.1': -0.12, 'arg.1': -0.15,
    'bra.1': -0.13, 'jpn.1': -0.12, 'kor.1': -0.13, 'aus.1': -0.12,
    'col.1': -0.13, 'chi.1': -0.13, 'uefa.champions': -0.10,
    'uefa.europa': -0.12, 'uefa.europa.conf': -0.13, 'eng.fa': -0.13,
}
DEFAULT_RHO = -0.13
MIN_MATCHES = 40   # seuil sous lequel on garde le ρ littérature
RHO_GRID = [round(-0.30 + i * 0.005, 4) for i in range(81)]   # -0.30 → 0.10 step 0.005


def _poisson_pmf(k: int, lam: float) -> float:
    if lam <= 0:
        return 1.0 if k == 0 else 0.0
    return math.exp(-lam) * (lam ** k) / math.factorial(k)


def _dc_tau(h: int, a: int, lam_h: float, lam_a: float, rho: float) -> float:
    if h == 0 and a == 0:
        return 1 - lam_h * lam_a * rho
    if h == 0 and a == 1:
        return 1 + lam_h * rho
    if h == 1 and a == 0:
        return 1 + lam_a * rho
    if h == 1 and a == 1:
        return 1 - rho
    return 1.0


def log_likelihood(matches: list[tuple[int, int]], lam_h: float, lam_a: float, rho: float) -> float:
    """Log-likelihood Dixon-Coles pour une liste de (h_goals, a_goals)."""
    total = 0.0
    for h, a in matches:
        p_base = _poisson_pmf(h, lam_h) * _poisson_pmf(a, lam_a)
        tau = _dc_tau(h, a, lam_h, lam_a, rho)
        p = p_base * tau
        if p <= 0:
            return -math.inf
        total += math.log(p)
    return total


def fit_rho(matches: list[tuple[int, int]]) -> dict:
    """Grid-search MLE pour ρ + 95% CI via LR test (Δlog L = 1.92)."""
    if not matches:
        return {'rho': None, 'log_lik': None, 'ci_lo': None, 'ci_hi': None,
                'lambda_h': None, 'lambda_a': None}
    lam_h = sum(h for h, _ in matches) / len(matches)
    lam_a = sum(a for _, a in matches) / len(matches)
    if lam_h <= 0 or lam_a <= 0:
        return {'rho': None, 'log_lik': None, 'ci_lo': None, 'ci_hi': None,
                'lambda_h': lam_h, 'lambda_a': lam_a}

    best_rho = 0.0
    best_lik = -math.inf
    likelihoods: list[tuple[float, float]] = []
    for rho in RHO_GRID:
        ll = log_likelihood(matches, lam_h, lam_a, rho)
        likelihoods.append((rho, ll))
        if ll > best_lik:
            best_lik = ll
            best_rho = rho

    # 95% CI : ρ pour lesquels log L ≥ best - 1.92 (LR test à 1 df)
    threshold = best_lik - 1.92
    ci_rhos = [rho for rho, ll in likelihoods if ll >= threshold]
    ci_lo = min(ci_rhos) if ci_rhos else best_rho
    ci_hi = max(ci_rhos) if ci_rhos else best_rho

    return {
        'rho': round(best_rho, 4),
        'log_lik': round(best_lik, 2),
        'ci_lo': round(ci_lo, 4),
        'ci_hi': round(ci_hi, 4),
        'lambda_h': round(lam_h, 3),
        'lambda_a': round(lam_a, 3),
    }


def load_matches() -> dict[str, list[tuple[int, int]]]:
    """Charge les matchs foot complétés depuis results_archive.jsonl + data.js,
    déduplique par event id, retourne {league_code: [(h_goals, a_goals)]}."""
    seen_ids: set[str] = set()
    by_league: dict[str, list[tuple[int, int]]] = defaultdict(list)

    # results_archive.jsonl (historique tronçonné)
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
                try:
                    h = int(comps[0].get('score'))
                    a = int(comps[1].get('score'))
                except (TypeError, ValueError):
                    continue
                lg = (r.get('league_code') or 'unknown').lower()
                by_league[lg].append((h, a))
                if ev_id:
                    seen_ids.add(ev_id)

    # data.js (matchs récents, encore en mémoire pré-archive)
    if DATA_JS.exists():
        js = DATA_JS.read_text(encoding='utf-8')
        m = re.search(r'=\s*(\{[\s\S]*\})\s*;?\s*$', js)
        if m:
            try:
                data = json.loads(m.group(1))
            except Exception:
                data = None
            if data:
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
                        try:
                            h = int(comps[0].get('score'))
                            a = int(comps[1].get('score'))
                        except (TypeError, ValueError):
                            continue
                        lg = (ev.get('league_code') or 'unknown').lower()
                        by_league[lg].append((h, a))
                        if ev_id:
                            seen_ids.add(ev_id)

    return dict(by_league)


def main() -> int:
    by_league = load_matches()
    print(f"[measure_rho] {sum(len(v) for v in by_league.values())} matchs foot, "
          f"{len(by_league)} ligues", file=sys.stderr)

    leagues_out: dict[str, dict] = {}
    measured_count = 0
    for lg, matches in sorted(by_league.items()):
        n = len(matches)
        lit_rho = LITERATURE_RHO.get(lg, DEFAULT_RHO)
        if n < MIN_MATCHES:
            leagues_out[lg] = {
                'n': n, 'rho_measured': None, 'rho_literature': lit_rho,
                'rho_used': lit_rho, 'source': 'literature_fallback',
                'reason': f'n={n} < {MIN_MATCHES}',
            }
            continue
        fit = fit_rho(matches)
        rho_meas = fit['rho']
        ci_w = fit['ci_hi'] - fit['ci_lo'] if fit['rho'] is not None else 1.0
        # Si CI trop large (>0.20), on garde la litterature (mesure peu fiable)
        if rho_meas is None or ci_w > 0.20:
            leagues_out[lg] = {
                'n': n, 'rho_measured': rho_meas, 'rho_literature': lit_rho,
                'rho_used': lit_rho, 'source': 'literature_fallback',
                'reason': f'CI trop large ({ci_w:.3f}) ou fit nul',
                **{k: v for k, v in fit.items() if k != 'rho'},
            }
            continue
        leagues_out[lg] = {
            'n': n, 'rho_measured': rho_meas, 'rho_literature': lit_rho,
            'rho_used': rho_meas, 'source': 'measured',
            'reason': f'MLE n={n}, CI95=[{fit["ci_lo"]:.3f}, {fit["ci_hi"]:.3f}]',
            'log_lik': fit['log_lik'],
            'ci_lo': fit['ci_lo'], 'ci_hi': fit['ci_hi'],
            'lambda_h': fit['lambda_h'], 'lambda_a': fit['lambda_a'],
        }
        measured_count += 1

    out = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'method': 'Dixon-Coles MLE grid search (ρ ∈ [-0.30, 0.10] step 0.005), '
                  'λ_h, λ_a fixés à moyenne empirique par ligue. CI 95% via LR test.',
        'min_matches': MIN_MATCHES,
        'default_rho': DEFAULT_RHO,
        'n_leagues': len(leagues_out),
        'n_measured': measured_count,
        'leagues': leagues_out,
    }
    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"[measure_rho] écrit {OUT_JSON.name} : {measured_count}/{len(leagues_out)} ligues mesurées",
          file=sys.stderr)
    if measured_count > 0:
        print(f"[measure_rho] aperçu :", file=sys.stderr)
        for lg, info in leagues_out.items():
            if info['source'] == 'measured':
                lit = info['rho_literature']
                meas = info['rho_measured']
                delta = meas - lit
                print(f"  {lg:20s} n={info['n']:3d} mesuré={meas:+.3f} "
                      f"(littérature={lit:+.3f}, Δ={delta:+.3f})",
                      file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())

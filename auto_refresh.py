#!/usr/bin/env python3
"""Refresh data.js continuously for the local dev server.

Runs alongside serveur.py. Each 60s tick executes a subset of the pipeline
defined in .github/workflows/refresh.yml, honoring per-script cadences
(fast/light scripts on every tick, slow scripts throttled).

The goal is that `python serveur.py` locally produces data equivalent
to what GitHub Actions commits to prod — no more "stale local data"
surprises when iterating on pronostics.html.

Usage: python auto_refresh.py
       (or started automatically by serveur.py)
"""
import sys, time, subprocess, traceback
from pathlib import Path
from datetime import datetime

HERE = Path(__file__).resolve().parent
PROJECT = HERE                     # auto_refresh.py lives at project root
SCRIPTS = PROJECT / 'scripts'      # fetch/patch scripts moved here in v27+

INTERVAL = 60  # seconds between ticks


def run(script_name, timeout=180):
    """Run a scripts/<name>.py, return (rc, tail_of_output)."""
    path = SCRIPTS / script_name
    if not path.exists():
        return -3, f'missing: {path.name}'
    try:
        p = subprocess.run([sys.executable, str(path)], cwd=PROJECT,
                           capture_output=True, text=True, timeout=timeout)
        out = (p.stdout + p.stderr).strip().splitlines()
        return p.returncode, '\n'.join(out[-2:])
    except subprocess.TimeoutExpired:
        return -1, 'timeout'
    except Exception as ex:
        return -2, f'error: {ex!r}'


def ts():
    return datetime.now().strftime('%H:%M:%S')


# Pipeline stages — mirror refresh.yml order.
#   Each entry: (script, cadence_ticks, timeout_sec)
#   cadence_ticks = 1 → every tick (60s)
#                   5 → every 5 min, etc.
#
# Slow scripts (soccer injuries ~85s, team stats ~4min) are self-throttled
# internally too; the cadence here mostly gates how often we *try*.
FETCH_STAGES = [
    # (script, ticks, timeout)
    ('fetch_live.py',              1,   60),
    ('fetch_tennis_odds.py',       5,   60),
    ('fetch_rus_odds.py',          5,   30),
    ('fetch_injuries.py',         10,   60),   # ESPN: NBA/NHL/NFL/MLB
    ('fetch_h2h.py',              15,   60),
    ('snapshot_odds.py',           1,   30),   # freeze pre-match odds
    ('snapshot_results.py',        1,   30),   # archive completed matches (long backtest window)
    ('fetch_tennis_sackmann.py',   1,   60),   # ATP/WTA Elo + surface + fatigue, 24h cache
    ('patch_tennis_features.py',   1,   30),
    ('fetch_footballdata.py',      1,   60),   # closing odds + league calibration, 6h cache
    ('patch_footballdata.py',      1,   30),
    ('fetch_mlb_pitchers.py',      5,   60),   # MLB Stats API probable pitchers, 6h cache
    ('patch_mlb_pitchers.py',      1,   15),
    ('fetch_nhl_stats.py',        10,   60),   # NHL official API team stats + starting goalie, 10min cache
    ('patch_nhl_stats.py',         1,   15),
    ('fetch_forebet.py',           5,   60),
    ('fetch_tips.py',             15,  120),   # RdJ, respectful cadence
    ('fetch_injuries_soccer.py',  30,  180),   # Sofascore, every 30min (self-throttle interne)
    ('fetch_lineups_soccer.py',   30,  180),   # Sofascore, every 30min (self-throttle interne)
    ('fetch_winamax_catalog.py',   1,   60),   # <2s typical
    ('fetch_v3.py',               15,  300),   # full sweep
    ('fetch_team_stats.py',      240,  300),   # ~4min, 4h cadence
    ('fetch_clubelo.py',           1,   30),   # self-throttled 1/20h
    ('fetch_weather.py',           1,   30),   # self-throttled
    ('fetch_referees_soccer.py',   1,   30),   # self-throttled 1/6h
    # v30 — Recent W/L form for NBA/WNBA/NHL/MLB/NFL teams (ESPN ne fournit
    # pas .form sur ces sports, contrairement au foot). Self-throttled 6h.
    ('fetch_team_form.py',        15,  120),
]

# Patches always run after fetches (idempotent, ~0.1-1s each).
# Order matters: patch_winamax first (establishes winamax.match_id),
# then markets, then enrichers that must survive dedup/bucketing.
PATCH_STAGES = [
    ('patch_odds.py',               1,   60),
    ('patch_winamax.py',            1,   30),
    ('patch_winamax_markets.py',    1,   30),
    ('patch_injuries_soccer.py',    1,   30),
    ('patch_team_stats.py',         1,   30),
    ('patch_lineups_soccer.py',     1,   30),
    ('patch_clubelo.py',            1,   30),
    ('patch_weather.py',            1,   30),
    ('patch_referees_soccer.py',    1,   30),
    # v30 — Inject ESPN team_form.json (last 5 W/L) into competitor.form
    # for NBA/NHL/MLB/NFL events.
    ('patch_team_form.py',          1,   15),
    # Pipeline status snapshot (health.json) — runs every tick, cheap.
    ('build_health.py',             1,   15),
    # v31 — Static backtest page generator (audit ChatGPT recommandation
    # "Construire un historique public des paris"). Lit backtest_report_v2.json,
    # produit backtest.html indexable sans JS. ~0.3s.
    ('build_backtest_page.py',      1,   15),
    # v31 — RSS feed (top picks du jour). Lit data.js, produit feed.xml.
    # Discoverable par feed readers + Google News. ~0.2s.
    ('build_feed.py',               1,   15),
    # v31 — Static credibilite.html (calibration + Brier + log-loss + SVG).
    # Lit backtest_report_v2.json, produit credibilite.html. ~0.3s.
    ('build_credibilite_page.py',   1,   15),
    # Chantier #3 lazy-load — DOIT tourner en DERNIER. Lit data.js (full),
    # écrit data_today.json + data_manifest.json + ré-inline LITE blob dans
    # pronostics.html. Sans ça, le client tomberait toujours sur le fallback
    # data.js et perdrait le bénéfice du lazy-load.
    ('finalize_inline.py',          1,   15),
]


def run_stage(stages, tick):
    """Run each stage whose cadence matches the current tick."""
    for script, cadence, timeout in stages:
        if tick % cadence != 0 and tick != 1:
            continue
        rc, out = run(script, timeout=timeout)
        tag = 'OK' if rc == 0 else f'rc={rc}'
        if rc != 0 or cadence > 1:
            # Keep the log quiet for fast recurring successes
            print(f'[{ts()}]   {script:<32} {tag}  {out[:80]}', flush=True)


def main():
    print(f'[{ts()}] auto_refresh started · interval={INTERVAL}s · scripts={SCRIPTS}', flush=True)
    if not SCRIPTS.exists():
        print(f'[{ts()}] FATAL: scripts dir missing at {SCRIPTS}', flush=True)
        sys.exit(1)
    tick = 0
    while True:
        t0 = time.time()
        tick += 1
        print(f'[{ts()}] tick {tick} start', flush=True)
        try:
            run_stage(FETCH_STAGES, tick)
            run_stage(PATCH_STAGES, tick)
        except Exception:
            traceback.print_exc()
        elapsed = time.time() - t0
        print(f'[{ts()}] tick {tick} done in {elapsed:.1f}s', flush=True)
        remain = max(1, INTERVAL - elapsed)
        time.sleep(remain)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\nauto_refresh stopped.')

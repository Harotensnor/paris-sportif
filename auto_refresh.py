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
    ('fetch_sofascore_events.py',   1,   90),
    ('fetch_winamax_catalog.py',    1,   60),   # <2s typical
    ('fetch_winamax_match_details.py', 5, 120),  # v35.26 : markets étendus multi-sports, TTL 1h + quotas, patchés à chaque tick
    ('fetch_h2h.py',               15,   60),
    ('fetch_forebet.py',            5,   60),
    ('fetch_tennis_odds.py',       5,   60),
    ('fetch_rus_odds.py',          5,   30),
    ('fetch_injuries.py',         10,   60),   # ESPN: NBA/NHL/NFL/MLB
    ('fetch_clubelo.py',           60,   30),   # self-throttled 1/20h; avoid probing every local tick
    ('fetch_understat_xg.py',     240,  120),   # top-5 xG, self-throttled / slow-ish
    ('fetch_fbref_xg.py',         240,  180),   # v35.356 : xG extended leagues, self-throttled 6h
    ('snapshot_odds.py',           1,   30),   # freeze pre-match odds
    ('detect_smart_money.py',      1,   30),   # odds_history steam detector
    ('snapshot_results.py',        1,   30),   # archive completed matches (long backtest window)
    ('fetch_tips.py',             15,  120),   # RdJ, respectful cadence
    ('fetch_injuries_soccer.py',  30,  180),   # Sofascore, every 30min (self-throttle interne)
    ('fetch_lineups_soccer.py',   30,  180),   # Sofascore, every 30min (self-throttle interne)
    ('fetch_v3.py',               60,  300),   # full ESPN sweep, prod hourly
    ('fetch_team_stats.py',      240,  300),   # ~4min, 4h cadence
    ('fetch_weather.py',           1,   30),   # self-throttled
    ('fetch_referees_soccer.py',   1,   30),   # self-throttled 1/6h
    # v30 — Recent W/L form for NBA/WNBA/NHL/MLB/NFL teams (ESPN ne fournit
    # pas .form sur ces sports, contrairement au foot). Self-throttled 6h.
    ('fetch_team_form.py',        15,  120),
    ('fetch_tennis_sackmann.py',   1,   60),   # ATP/WTA Elo + surface + fatigue, 24h cache
    ('fetch_footballdata.py',     180,   60),   # closing odds + league calibration, 6h cache; local 3h probe
    ('fetch_mlb_pitchers.py',      5,   60),   # MLB Stats API probable pitchers, 6h cache
    ('fetch_nhl_stats.py',        10,   60),   # NHL official API team stats + starting goalie, 10min cache
    ('fetch_nba_team_stats.py',    5,   30),
    # v35.352 — Alignement avec le cron: sources publiques metadata/Allemagne.
    # Les scripts sont self-throttled, donc les appeler localement ne force pas
    # un hit réseau à chaque tick.
    ('fetch_thesportsdb_meta.py', 240,   60),
    ('fetch_openligadb.py',      240,   60),
    ('fetch_match_previews.py',   60,   60),
]

# Patches always run after fetches. Keep this list aligned with
# .github/workflows/refresh.yml: the cron now uses patch_all_quick.py for the
# light enrichments instead of 12 separate patch_* invocations.
PATCH_STAGES = [
    ('patch_odds.py',               1,   60),
    ('patch_sofascore_events.py',   1,   30),
    ('patch_sofascore_league_codes.py', 1, 15),
    ('patch_winamax.py',            1,   30),
    ('patch_winamax_markets.py',    1,   30),
    ('patch_all_quick.py',          1,   30),
    ('patch_understat_xg.py',       1,   30),
    ('patch_fbref_xg.py',           1,   30),
    ('patch_smart_money.py',        1,   30),
    # v35.352 — Builders cron ajoutés dans l'auto-refresh pour éviter que
    # local et prod divergent sur les insights modèle / profils / marchés.
    ('build_public_team_stats.py',  1,   30),
    ('build_lineups_multisport.py', 1,   30),
    ('build_xg_coverage.py',        1,   30),
    ('build_public_profiles.py',    1,   60),
    ('build_league_bias_audit.py',  1,   30),
    ('build_betting_intelligence.py', 1,  30),
    ('build_market_auc.py',         1,   15),
    ('build_backtest_training_rows.py', 1, 30),
    ('train_lightgbm.py',           1,   30),
    ('build_lightgbm_runtime.py',   1,   15),
    ('audit_lightgbm_runtime.py',   1,   15),
    ('build_rugby_markets.py',      1,   30),
    ('build_niche_markets.py',      1,   30),
    ('build_mlb_player_props.py',   1,   15),
    ('build_nhl_playoff_markets.py', 1,  15),
    ('build_tennis_challenger_watchlist.py', 1, 15),
    ('build_football_expansion_watchlist.py', 1, 15),
    ('build_sports_expansion_audit.py', 1, 15),
    ('detect_boosted_odds.py',      1,   30),
    ('build_signal_gap_report.py',  1,   15),
    ('build_anti_public_angles.py', 1,   15),
    ('build_schedule_spots_summary.py', 1, 15),
    ('build_rare_signal_summary.py', 1, 15),
    ('inject_data_in_html.py',      1,   15),
    ('measure_night_metrics.py',    1,   15),
    # Pipeline status snapshot (health.json) — runs every tick, cheap.
    ('build_health.py',             1,   15),
    ('audit_data_truth.py',          1,   15),
    ('validate_data_quality.py',     1,   15),
    # MCP diagnostics use a historical desktop path on Theo's machine; keep it
    # synced and smoke-tested so stale "today" values cannot silently return.
    ('sync_mcp_shadow_copy.py',      1,   15),
    ('audit_mcp_shadow_copy.py',     1,   15),
    ('test_mcp_smoke.py',            1,   30),
    ('build_picks_history.py',      1,   30),
    ('build_team_priors.py',        1,   30),
    ('build_bayesian_priors_v5.py', 1,   30),
    ('build_season_phase.py',       1,   30),
    ('build_star_players.py',       1,   30),
    ('build_xg_decay_params.py',    1,   30),
    ('build_travel_schedule_context.py', 1, 30),
    ('build_referee_stats.py',      1,   30),
    ('build_role_context.py',       1,   30),
    ('build_stadium_effects.py',    1,   30),
    ('build_coach_tenure.py',       1,   30),
    ('build_derbies.py',            1,   30),
    ('build_team_stats_extended_v4.py', 1, 30),
    ('build_football_player_props.py', 1, 30),
    ('build_nba_player_props.py',   1,   30),
    ('build_football_stats_markets.py', 1, 30),
    ('benchmark_model_v4.py',       1,   60),
    ('build_model_anomalies.py',    1,   30),
    ('snapshot_pick_odds.py',       1,   30),
    ('compute_clv.py',              1,   30),
    ('settle_picks.py',             1,   15),
    ('build_daily_insights.py',      1,   15),
    # v31.7.23 — Dixon-Coles ρ par ligue mesuré en CI (likelihood max).
    # Lent (~2-5s pour 40 ligues) ; cadence 240 ticks (~4h) en local.
    # En prod la cadence est 1×/jour (cron H=00:00 UTC) — voir refresh.yml.
    ('measure_dixon_coles_rho.py',  240, 60),
    # v31.7.39 — Forces offensives/défensives par équipe (Maher 1982).
    # Cadence 240 ticks (~4h). Activera quand ≥40 matchs/ligue.
    ('measure_team_strengths.py',   240, 60),
    # v31.7.63 — Full Bivariate Poisson MLE Dixon-Coles (joint α/β/γ/ρ).
    # Plus lent (~30s/ligue avec ≥40 matchs), donc cadence faible (480 ticks).
    ('measure_team_strengths_mle.py', 480, 120),
    # v31 — Static backtest page generator (audit ChatGPT recommandation
    # "Construire un historique public des paris"). Lit backtest_report_v2.json,
    # produit backtest.html indexable sans JS. ~0.3s.
    ('build_backtest_page.py',      1,   15),
    # v31.7.29 — Patch index.html stats-strip depuis backtest_report_v2.json.
    # Idempotent, cheap (~0.05s). Idéal pour single source of truth.
    ('patch_index_stats.py',        1,   15),
    # v31 — RSS feed (top picks du jour). Lit data.js, produit feed.xml.
    # Discoverable par feed readers + Google News. ~0.2s.
    ('build_feed.py',               1,   15),
    # v31 — Static credibilite.html (calibration + Brier + log-loss + SVG).
    # Lit backtest_report_v2.json, produit credibilite.html. ~0.3s.
    ('build_credibilite_page.py',   1,   15),
    # v31.7.4 — OG images (1200x630 PNG) pour pages statiques. ~3s.
    ('build_og_images.py',          5,   30),
    # v35.13 — Sitemap dynamique (git lastmod + routes SPA).
    ('build_sitemap.py',            1,   15),
    # Chantier #3 lazy-load — DOIT tourner en DERNIER. Lit data.js (full),
    # écrit data_today.json + data_manifest.json + ré-inline LITE blob dans
    # pronostics.html. Sans ça, le client tomberait toujours sur le fallback
    # data.js et perdrait le bénéfice du lazy-load.
    ('finalize_inline.py',          1,   15),
    ('check_pipeline_health.py',    1,   15),
    ('check_pipeline_freshness.py', 1,   15),
    ('audit_bundle_size.py',        1,   15),
    # v35.92 — No-op sans DISCORD_WEBHOOK_URL ; garde le drift CI/local aligné.
    ('notify_discord.py',           1,   20),
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

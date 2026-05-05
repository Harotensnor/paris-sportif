# MODEL_V4_BENCHMARK

Generated: `2026-05-05T21:30:16Z`

## Decision

Status: **promoted_guarded**

V4-A is promoted as a guarded contextual layer because every new signal is bounded:
it can adjust a lambda, apply a small confidence multiplier, or add a small reliability
nudge, but it cannot create unbounded picks.

## Baseline

- Source: `backtest_report_v2.json`
- V3 sample: `647` picks
- V3 flat ROI: `0.00%`
- V3 Brier: `0.2309`
- Guardrail: V4-A must stay above V3 - 1pt ROI. Current guarded proxy delta is `0.00pt`.

## Components

| Section | Component | Coverage | Guardrail |
|---|---:|---:|---|
| AA | bayesian_team_prior | 3730 | blend only when both teams have sample_size >= 10 |
| BB | season_phase | 68 | confidence decay only; no pick creation |
| CC | competition_context | runtime | cup confidence decay + edge bonus |
| DD | star_absence | 769 | injury-name exact match required |
| EE | xg_decay | 32 | league-specific rolling-weight blend |
| FF-GG | travel_schedule | 278 | small confidence penalty only |
| HH | referee_tendency | 105 | home-bias boost requires identified referee |
| II-MM | role_stadium_coach_derby_extended_stats | role_matches=49, stadiums=244, coaches=427, derbies=53, extended_teams=367 | bounded nudges, derby compresses confidence |

## Next Replay

Run six-month replay once picks_history has enough V4-tagged settled picks.

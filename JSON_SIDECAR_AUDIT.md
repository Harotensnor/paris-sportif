# JSON sidecar audit — 2026-05-04

Source of truth runtime:
- `data.js` for events and patched signals.
- `night_metrics.json` for sprint metrics generated from `data.js`.
- `health.json` for pipeline freshness and source status.

Archived as obsolete runtime files:
- `archive/obsolete_json_20260504/claude_*_snapshot.json` — April 26 handoff/debug snapshots, not read by runtime or refresh workflow.

Removed locally:
- `data.json` — untracked stale April 19 snapshot, replaced by `data.js`.

Kept intentionally:
- `backtest_report.json` — still read by `scripts/backtest_baselines.py` and `scripts/build_backtest_page.py` for baseline strategy pages.
- `ci_heartbeat.json` — maintained by `.github/workflows/refresh.yml`.
- `boosted_odds.json` — tiny but active; separate audit needed before removing the feature.

Rule going forward:
- New diagnostic JSON files must either be referenced by a script/workflow/frontend path, or live under `archive/` with a short reason.

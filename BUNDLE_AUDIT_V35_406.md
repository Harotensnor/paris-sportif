# Bundle Audit V35.406

Generated: 2026-05-05 01:15 Europe/Paris

## Current Raw Sizes

| Asset | Size | Guard |
|---|---:|---:|
| app.js | 1,585,245 bytes | 1,600,000 bytes |
| app.css | 353,361 bytes | 360,000 bytes |
| pronostics.html | 71,236 bytes | 90,000 bytes |
| data_lite.js | 167,554 bytes | 220,000 bytes |

## Decision

- The requested `app.js < 1.7 MB` target is currently met with about 115 KB of margin.
- The guard has been tightened to 1.6 MB so future UI/data-intelligence work cannot drift back toward the 1.8-1.9 MB range.
- The cron and local auto-refresh now run the bundle audit after `finalize_inline.py`, when the HTML/data-lite state is representative of production.

## Next Safe Cuts

- Modal detail extraction remains the largest future cut candidate.
- Secondary Performance/Profile panels should be lazy-loaded before adding new heavy UI.
- New sidecar-driven features should prefer JSON sidecars + compact rendering helpers over adding large inline datasets.

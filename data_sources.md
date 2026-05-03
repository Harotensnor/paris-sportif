# Data Sources Backlog

Verified: 2026-05-02

This file lists public/free data sources that can enrich the Paris-Sportif
pipeline without changing the Winamax-only product rule. These sources must
never be used for odds placement or bookmaker affiliation; they are candidates
only for metadata, schedules, lineups, results, and quality cross-checks.

## Candidate 1 — TheSportsDB

Official docs: https://www.thesportsdb.com/documentation

Fit:
- Multi-sport metadata: teams, players, venues, leagues, event details.
- Useful fallback for venue lookup, team badges, historical event metadata,
  and occasional lineup/timeline enrichment.
- Has a free V1 key (`123`) with explicit free-tier limits; premium unlocks
  larger limits and live-score features.

Endpoints worth testing:
- `searchteams.php?t={team}` for team identity + artwork fallback.
- `lookupevent.php?id={event}` for event metadata cross-checks.
- `lookuplineup.php?id={event}` and `lookuptimeline.php?id={event}` for
  richer match detail when available.
- `eventsday.php?d={YYYY-MM-DD}&s={sport}` for secondary schedule sanity checks.

Risk / constraints:
- Crowd-sourced data: treat as supplementary, not authoritative.
- Free-tier limits are low for several endpoints. Add 1h+ cache TTL and cap
  requests per run.
- Requires fuzzy mapping from ESPN/Winamax event names to TheSportsDB IDs.

Implementation:
- `scripts/fetch_thesportsdb_meta.py`
- Output: `thesportsdb_meta.json`
- Cadence: 24h TTL with strict fuzzy matching; generic demo-key fallbacks are rejected.
- Health metric: teams requested, teams matched, API errors.
- V36 guardrail: when the public demo key returns the same Arsenal payload for
  unrelated teams, the fetcher stops early and reports `status: unavailable`
  instead of accepting wrong badges/stadiums or hammering the API into 429s.

## Candidate 2 — OpenLigaDB

Official site/docs: https://www.openligadb.de/

Fit:
- German/European football schedules, tables, and results.
- Useful as a public cross-check for Bundesliga / 2. Bundesliga / 3. Liga
  kickoff/result freshness when ESPN status lags.
- The official site states JSON API access requires no authentication and data
  is available under ODbL.

Endpoints worth testing:
- `https://api.openligadb.de/getavailableleagues`
- `https://api.openligadb.de/getmatchdata/{league}/{season}/{matchday}`
- `https://api.openligadb.de/getbltable/{league}/{season}`

Risk / constraints:
- Coverage is strongest for German leagues; do not treat as global football.
- ODbL attribution/share-alike implications must be respected if we copy and
  republish substantial derived datasets.
- Community-maintained data: use as validation/fallback, not sole source.

Implementation:
- `scripts/fetch_openligadb.py`
- Output: `openligadb_matches.json`
- Cadence: 12h TTL, triggered from the refresh workflow every 4h window.
- Scope: Bundesliga / 2. Bundesliga / 3. Liga around the current match window.
- Health metric: match count, matched local Winamax-visible events, API errors.

## Guardrails

- Keep current primary sources: ESPN, Sofascore, Open-Meteo, ClubElo,
  Understat, MLB/NHL official APIs.
- Respect robots/terms, add a clear User-Agent, and cache every response.
- No live scraping loop. No odds scraping from these sources.
- Every new source needs a sidecar JSON, `build_health.py` visibility, and
  `refresh.yml` commit coverage before it can affect UI or model decisions.

## Consolidated Public Stats

Implementation:
- `scripts/build_public_team_stats.py`
- Output: `public_team_stats.json`
- Inputs: `xg_team_stats.json`, `team_stats.json`, `form_stats_extended.json`,
  `thesportsdb_meta.json`, `openligadb_matches.json`
- Purpose: one compact contract for public xG/form/metadata signals without
  adding fragile live scraping in the frontend.
- Health metric: total teams, teams with xG, teams with form, teams with
  public metadata.

## Derived Niche Markets

Implementation:
- `scripts/build_rugby_markets.py`
- Output: `rugby_markets.json`
- Scope: rugby events already present in `data.js` only.
- Markets: winner and total points lines, derived from recent team scoring
  where available with conservative priors.
- Current behavior: emits `status: "empty"` when no Winamax-visible rugby is
  present, so the pipeline is ready without adding fake picks.
- `scripts/build_niche_markets.py` follows the same empty-safe pattern for
  darts/snooker, deriving winner and total legs/frames only when those sports
  appear in the Winamax-visible feed.

## Winamax Boosted Odds

Implementation:
- `scripts/detect_boosted_odds.py`
- Output: `boosted_odds.json`
- Scope: explicit boost/super-cote/promo wording or fields already present in
  `winamax_markets.json`.
- Guardrail: no inference. If Winamax does not expose an explicit boost marker,
  the sidecar stays `status: "empty"` instead of labeling normal odds as boosted.

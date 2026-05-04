# Bundle Audit v35.371

Generated: 2026-05-04 19:59 UTC

## File sizes

| File | Size |
|---|---:|
| app.js | 1,858,613 bytes |
| data.js | 6,803,634 bytes |
| pronostics.html | 69,989 bytes |
| sw.js | 8,531 bytes |

## Largest frontend functions

| Function | Lines | Bytes | Notes |
|---|---:|---:|---|
| renderDashboardPage | 4,878 | 337,895 | Core V37 table; split candidate into `app-table.js` later. |
| openDetail | 2,553 | 176,278 | Core modal; split candidate into `app-modal.js`. |
| renderBilanPage | 1,616 | 105,070 | Performance subview; can be lazy-loaded. |
| _predictMatchImpl | 1,874 | 95,176 | Core model; keep initial for now. |
| renderTousPage | 1,226 | 85,980 | Core page; keep initial for now. |
| renderProfilPage | 1,100 | 78,313 | Hub page; contains settings + diagnostics target. |
| renderPerformancePage | 555 | 41,481 | Hub page shell. |
| renderSantePage | 469 | 32,533 | Candidate to move under Profil or lazy-load. |
| renderCombines | 399 | 26,713 | Not a standalone page after V37; candidate for Performance/Tous lazy chunk. |
| renderCredibilitePage | 328 | 25,948 | Alias now Performance; candidate lazy/remove from initial. |
| renderTopPicks | 449 | 25,827 | Legacy Top; no longer standalone. |
| renderHistoriquePage | 511 | 25,811 | Performance subview; candidate lazy-load. |
| renderMontantePage | 349 | 22,667 | Now Performance strategy; candidate lazy-load. |

## Safe next cuts

1. Move `renderSantePage`, `computeSiteHealth`, and diagnostic UI into Profile tab, or lazy-load them only when the diagnostic panel opens.
2. Remove dead standalone dispatch for `buteurs`, `alertes`, `compare`, `credibilite`, and `montantes` now that `VALID_PAGES` is five hubs.
3. Split `openDetail` into `app-modal.js` first; it is high byte impact and naturally loaded after a row click.
4. Split heavy Performance subviews (`renderBilanPage`, `renderHistoriquePage`, `renderMontantePage`) behind tab interaction.

## Guardrails

- Keep `dashboard`, `tous`, `performance`, `academie`, and `profil` synchronous.
- Keep old hashes as aliases, not pages.
- Run `new Function(app.js)` and core Playwright route tests after each cut.

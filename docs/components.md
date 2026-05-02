# Paris-Sportif Components

Version: v35.193

This document records the production UI primitives used by the single-page app. Keep changes conservative: most components are rendered from `app.js` and styled by `app.css`.

## Button

Use for explicit actions only: open a modal, export data, change a filter, track a bet.

- Variants: primary, secondary, ghost, danger, chip.
- States: default, hover, active, disabled, loading.
- Mobile target: 44 x 44 px minimum.
- Avoid native `prompt()` / `confirm()`; use `_showConfirm()`.

## Bet Card

Main prediction surface for Big Bets, Solides, Outsiders and compact rows.

- Required data: match id, sport, league, teams, market label, odd, confidence, edge.
- Primary action: open the "Pourquoi ?" detail modal.
- Secondary actions: track, share, copy, Winamax link.
- Accessibility: role button only when the entire card is clickable; keyboard activation via Enter.

## Badge Force

Unified strength indicator.

- Big Bet: `🔥🔥🔥`
- Strong: `🔥🔥`
- Standard: `🔥`
- Risky: `⚠️`

Do not hide it behind hover or modal-only content.

## Modal

Used for match detail, explanations, confirmations and compare flows.

- First view must be simple: reason, pick, odds, confidence.
- Technical tabs stay secondary.
- Esc closes when safe; destructive flows use `_showConfirm()`.

## Tabs

Used inside Mes Paris, Méthode, Montantes and modal details.

- One active tab at a time.
- Keep labels short.
- Preserve keyboard focus after switching.

## Drawer

Used for mobile navigation and secondary tools.

- Desktop should prefer visible sidebar/right rail.
- Mobile drawer must close after navigation.
- Keep depth to one submenu.

## Toast

Used for short feedback after save/export/copy.

- Success: green.
- Info: neutral.
- Error: red.
- Duration should stay short and non-blocking.

## Skeleton

Used before async render on secondary pages and long data sections.

- Match skeleton for prediction cards.
- Row skeleton for dense tables.
- Chart skeleton for performance areas.

## Bankroll Smart

Profile block for risk state and drawdown protection.

- Inputs: user bankroll, tracked bets, stop-loss settings.
- Output: current bankroll, P&L, drawdown, recommended mode.
- Copy must stay practical, not hype-driven.

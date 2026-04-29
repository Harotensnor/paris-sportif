# Changelog

Toutes les modifications notables sont documentées ici.

Le format est inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
les versions suivent [Semantic Versioning](https://semver.org/lang/fr/).

## [v31.7.197] — 2026-04-29 — Plan 1000 phase 2 (Sprint A/E/F/G/H)

### Ajouté
- **Sprint A — ROI helpers**:
  - `window._smartKelly(rel, odd, bankroll)` : Kelly modulé par confiance
    (lock 0.5×, standard 0.25×, lowconf 0.1×)
  - `window._computeIfYouHadFollowed()` : "si tu avais suivi tous les picks…"
    comparaison perfo modèle vs user actuel
  - `window._userBetsStats` étendu : maxWinStreak, maxLossStreak,
    currentStreak, bySport, byMarket, avgStake, avgPnL
- **Sprint H — Mobile UI**:
  - `window._showBottomSheet({ title, body, actions, onClose })` :
    modal slide-up sur mobile, center modal sur desktop
  - `.u-bottom-sheet` / `.u-bottom-sheet-inner` / `.u-bottom-sheet-handle`
  - `.u-mobile-cta` (sticky bottom CTA mobile)
  - `.u-swipeable` / `.u-sticky-header` (compress on scroll)
- **Sprint E — Tests**: `tests/plan-1000-helpers.spec.js` (~17 nouveaux tests)

### Modifié
- **Sprint G — Performance**: `_agentReplay()` désormais memoizé (cache
  invalidé sur ref `PRONOSTICS_DATA` ou `agentResetTs` change). Réduit
  les appels couteux de 5×/render à 1×.

### Plan 1000 status
- 🅰️ Sprint A : ✅ done (ROI tracker, smart staking, advanced stats)
- 🅱️ Sprint B : ⏸ skipped (refactor inline styles trop disruptif)
- 🅲 Sprint C : ✅ done (signaux modèle déjà intégrés via Sprint 109)
- 🅳 Sprint D : ✅ done (live odds drift Sprint 101 + notif toggle existant)
- 🅴 Sprint E : ✅ done (28 tests dans plan-1000-helpers.spec.js)
- 🅵 Sprint F : ✅ done (CHANGELOG.md créé, JSDoc partiel)
- 🅶 Sprint G : ✅ done (memoization _agentReplay)
- 🅷 Sprint H : ✅ done (bottom sheet + sticky header + mobile CTA)
- 🅸 Sprint I : ⏭ skipped (SEO/marketing — par demande user)
- 🅹 Sprint J : ⏳ ongoing (CSP review, RGPD)

## [v31.7.196] — 2026-04-29 — Plan 1000 phase 1

### Ajouté
- **CSS Utility Framework massif** (350+ classes utility-first):
  - Spacing : `.u-p-{1-8}`, `.u-px/py/pt/pb-*`, `.u-mt/mb/my/mx-*`
  - Layout : `.u-flex*`, `.u-grid-cols-{2,3,4}`, `.u-relative/absolute/fixed`
  - Typography : `.u-text-{xs-2xl}`, `.u-font-{normal-black}`, `.u-tabular`
  - Colors : `.u-text-{dim,brand,accent,danger,warn}`, `.u-bg-*`
  - Components : `.u-card-elev`, `.u-stat`, `.u-banner-*`, `.u-pill-*`
  - Animations : `u-fade-in`, `u-pop-in`, `u-slide-down`, `u-shake`
- **JS Helpers** (40+ fonctions exposées sur window):
  - DOM : `_qs`, `_qsa`, `_ce`, `_on`
  - Storage : `_safeStorage` avec QuotaExceededError handling
  - Format : `_fmt.{pct,money,odd,edge,age}`, `_fmtRelativeTime`, `_fmtNumber`
  - Async : `_safeAsync`, `_copyToClipboard`, `_debounce`, `_throttle`
  - UX : `_showConfirm`, `_haptic`, `_showHowToReadTutorial`
  - Network : `_getConnectionType`, `_onVisibilityChange`
  - System : `_resetTrustStrip`, `_resetAllTutorials`

## [v31.7.192] — 2026-04-29 — Bugfix critique

### Corrigé
- **CRITIQUE** : SyntaxError ligne 16035 dans Sprint 107 onboarding wizard.
  L'apostrophe dans `'C\\'est parti'` était sur-échappée (4 backslashes en
  bytes), ce qui faisait crasher l'IIFE entière au parse. Tous les helpers
  (`_emptyState`, `_GLOSSARY`, `predictMatch`, etc.) étaient invisibles
  depuis Sprint 107 (~3h). Fix : `"C'est parti"` (double quotes).

## [v31.7.190] — Sprints 105-130 (one night sprint marathon)

### Ajouté
- Drawer mobile collapsible + tables responsive (.tbl-scroll)
- Hero "Ce que tu dois faire MAINTENANT"
- Onboarding wizard 4 étapes
- Glossaire inline (16 termes : edge, kelly, ev, roi, brier...)
- Calibration per-sport (Sprint 109)
- Lazy load backtest_report_markets.json
- KPI tiles harmonisés + skeleton loaders
- Empty states factory unifiée
- Risk gauge inline action-focus
- Tests Playwright (28 assertions)
- Mobile compact (<390px) + animations stagger fade-in
- Notif badge dashboard counts
- ROI tracker user (bilan personnel + adhérence modèle)
- Filtres presets rapides
- Scroll-to-top FAB
- Keyboard shortcuts (V/I/F/R/`/`)
- Search highlights `<mark>`
- Data freshness chip
- Toast actionnable + Annuler pari
- Error boundaries with retry
- Mobile bottom-nav badges
- Light theme polish
- Inline tutorial "Comment lire un prono"
- Live countdown timer

## Historique avant v31.7.190

Voir l'historique git pour les versions antérieures :
```bash
git log --oneline --all
```

Versions notables :
- v31.7.180 (Sprint 91-93) : Refonte nav 5 hubs ROI-driven
- v31.7.189 (Sprint 100-104) : Calibration ±8pt + Drift + Simulator
- v27 → v28.10 : Refonte one-feed agent autonome

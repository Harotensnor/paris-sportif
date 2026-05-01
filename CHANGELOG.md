# Changelog

Toutes les modifications notables sont documentées ici.

Le format est inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
les versions suivent [Semantic Versioning](https://semver.org/lang/fr/).

## [v33.13–v33.34] — 2026-05-01 — Sprint cron + Round 7 OPR + UX fixes

### Ajouté
- **MCP server enrichi** : 3 nouveaux tools (`get_today_high_confidence`,
  `get_pipeline_status`, `list_data_gaps`), smoke test, doc à jour
- **Stats avancées Bilan** (Round 7 R) : 5 KPIs (Sharpe annualisé, Max DD,
  Win/Loss streaks, ROI 7j) + courbe NAV cumulative SVG
- **CLV tracking** (Round 7 O) : `scripts/compute_clv.py` parse `odds_history.jsonl`,
  calcule CLV par match. Tile dans Bilan : CLV moyen + % paris battant le marché
- **Notifications kickoff imminent** (Round 7 P) : `_maybeNotifyKickoffImminent()`
  alerte 15-20min avant top picks, tag séparé des notifs edge≥10%
- **Insights marchés** (Performance) : banner classifiant Edge significatif/
  faible/Anti-edge/Bruit (CI Wilson 95%). Révèle BTTS+OU2.5 = bruit
- **Tests fixture-based** : `kellyFraction` (8 cas) + `evaluateModelPick` (9 cas)

### Performance pipeline cron (~10min → ~3-4min)
- `cancel-in-progress: false` (fix critique runs qui s'annulaient)
- `pip cache` + 18 fetchers parallélisés (Group A + B)
- `scripts/inject_data_in_html.py` : 1 seul HTML rewrite à la fin (avant: 11)
- `scripts/patch_all_quick.py` : mega-patcher fusionnant 13 patches légers
  en 1 lecture/écriture data.js (0.3s vs ~30s)
- `timeout-minutes: 15` (filet)

### Corrigé
- Message "⏳ en attente de sample" auto-tuning (CLAUDE.md gap #10)
- Filter empty day arrays dans sélecteurs (CLAUDE.md gap #5)
- SW LAZY_CACHE_FIRST : ajout backtest/credibilite/404.html
- 4 bugs visibles screens utilisateur (v33.25) :
  - "Meilleur / Pire jour" affiche 2 valeurs identiques quand 1 seul jour
  - Banner stale référence un "banner rouge" inexistant
  - Wording "+N non-trackables" → "+N sans cote pré-match"
  - Empty state "Aucun pari recommandé" contextualisé (matchs en cours)

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

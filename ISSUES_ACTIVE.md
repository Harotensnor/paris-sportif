# Issues Active — Paris-Sportif

Split from ISSUES.md on 2026-05-04. Active means OPEN/PARTIAL only; resolved history lives in ISSUES_RESOLVED.md.

- Active issues: 1
- Derniere revue: v35.472 stabilite tableau + bundle.
- Regressions bloquantes detectees pendant la validation 1.1-1.7: 0.
- Prochaine priorite: assainir le run complet historique apres validation des specs critiques V37.

### P11-TEST-001 — Suite Playwright locale désynchronisée

- Sévérité : MEDIUM
- Preuve : lancement local v35.205 avec Chrome système; `a11y-axe.spec.js` bloqué par dépendance `@axe-core/playwright` absente du runtime local.
- Constat : hors axe-core, la suite exécute `358` tests : `263` passed, `79` failed, `16` skipped. Les échecs se concentrent sur specs legacy attendant des pages supprimées (`#locks`, `#matchs`, `Top du jour`), snapshots visuels Windows non initialisés et quelques assertions obsolètes de helpers/labels.
- Action : Section 2.4 phase finale doit relancer la suite complete avec runtime Playwright local, puis adapter/annoter les specs legacy restantes.
- Statut : OPEN — v35.454 a debloque la dependance axe via fallback local. v35.455-v35.456 ont remis au vert les specs critiques V37 (`critical-flows`, audit P0, helpers, modal/table sync, CLV, score, signaux modal, dashboard final). v35.470 a stabilise les specs V37 recentes (`market-candidates`, `daily-insights`, `plan-1000-helpers`, `sprint-105-113-features`, `visual-regression`, `click-everything`) avec 77 passed / 11 skips optionnels. v35.472 confirme `phase-finale-dashboard.spec.js` 6/6 apres compression CSS. Le run complet historique reste a assainir car plusieurs specs legacy pre-refonte 5 hubs/pages supprimees sont encore a realigner. Preuve : `audit-artifacts/phase-finale-playwright-regression.json`.


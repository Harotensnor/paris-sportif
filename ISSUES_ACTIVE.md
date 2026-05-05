# Issues Active — Paris-Sportif

Split from ISSUES.md on 2026-05-04. Active means OPEN/PARTIAL only; resolved history lives in ISSUES_RESOLVED.md.

- Active issues: 1
- Derniere revue: v35.452 phase finale post-mega.
- Regressions bloquantes detectees pendant la validation 1.1-1.7: 0.
- Prochaine priorite: Section 2.4, relancer et assainir la suite Playwright complete.

### P11-TEST-001 — Suite Playwright locale désynchronisée

- Sévérité : MEDIUM
- Preuve : lancement local v35.205 avec Chrome système; `a11y-axe.spec.js` bloqué par dépendance `@axe-core/playwright` absente du runtime local.
- Constat : hors axe-core, la suite exécute `358` tests : `263` passed, `79` failed, `16` skipped. Les échecs se concentrent sur specs legacy attendant des pages supprimées (`#locks`, `#matchs`, `Top du jour`), snapshots visuels Windows non initialisés et quelques assertions obsolètes de helpers/labels.
- Action : Section 2.4 phase finale doit relancer la suite complete avec runtime Playwright local, puis adapter/annoter les specs legacy restantes.
- Statut : OPEN — tests cibles récents OK (`modal-signals-balance`, `dashboard-clv-summary` 6/6 v35.448), mais la suite complete reste a revalider.


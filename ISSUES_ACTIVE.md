# Issues Active — Paris-Sportif

Split from ISSUES.md on 2026-05-04. Active means OPEN/PARTIAL only; resolved history lives in ISSUES_RESOLVED.md.

- Active issues: 1

### P11-TEST-001 — Suite Playwright locale désynchronisée

- Sévérité : MEDIUM
- Preuve : lancement local v35.205 avec Chrome système; `a11y-axe.spec.js` bloqué par dépendance `@axe-core/playwright` absente du runtime local.
- Constat : hors axe-core, la suite exécute `358` tests : `263` passed, `79` failed, `16` skipped. Les échecs se concentrent sur specs legacy attendant des pages supprimées (`#locks`, `#matchs`, `Top du jour`), snapshots visuels Windows non initialisés et quelques assertions obsolètes de helpers/labels.
- Action : prochaine passe dédiée pour adapter ou annoter les specs legacy après la refonte 8 pages, puis relancer avec dépendances complètes.
- Statut : OPEN — la config Playwright utilise maintenant `CHROME_EXECUTABLE_PATH` quand disponible; le flow Big Bet principal a été réparé v35.206 (`tests/user-flow.spec.js` 2/2).


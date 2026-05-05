# Issues Active — Paris-Sportif

Split from ISSUES.md on 2026-05-04. Active means OPEN/PARTIAL only; resolved history lives in ISSUES_RESOLVED.md.

- Active issues: 1
- Derniere revue: v35.452 phase finale post-mega.
- Regressions bloquantes detectees pendant la validation 1.1-1.7: 0.
- Prochaine priorite: assainir les 61 tests encore rouges apres le premier run complet Section 2.4.

### P11-TEST-001 — Suite Playwright locale désynchronisée

- Sévérité : MEDIUM
- Preuve : lancement local v35.205 avec Chrome système; `a11y-axe.spec.js` bloqué par dépendance `@axe-core/playwright` absente du runtime local.
- Constat : hors axe-core, la suite exécute `358` tests : `263` passed, `79` failed, `16` skipped. Les échecs se concentrent sur specs legacy attendant des pages supprimées (`#locks`, `#matchs`, `Top du jour`), snapshots visuels Windows non initialisés et quelques assertions obsolètes de helpers/labels.
- Action : Section 2.4 phase finale doit relancer la suite complete avec runtime Playwright local, puis adapter/annoter les specs legacy restantes.
- Statut : OPEN — v35.454 a debloque la dependance axe via fallback local. Suite complete lancee : 430 tests collectes; relance `--last-failed` apres fallback = 77 tests, 16 repassés, 61 encore rouges. Les rouges sont principalement specs legacy pre-refonte 5 hubs/pages supprimees + quelques contrats helpers a realigner. Preuve : `audit-artifacts/phase-finale-playwright-regression.json`.


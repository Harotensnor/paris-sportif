# Issues — Paris-Sportif

Le fichier actif est maintenant separe pour eviter de masquer les vrais problemes sous l'historique resolu.

- Voir ISSUES_ACTIVE.md pour les problemes OPEN/PARTIAL.
- Voir ISSUES_RESOLVED.md pour l'historique FIXED et les audits archives.

## Resume actif

- Active issues: 1
- Derniere revue: v35.456 phase finale validation live.
- Regressions bloquantes detectees pendant la validation 1.1-1.7: 0.
- Prochaine priorite: terminer la reduction de `P11-TEST-001` apres le run complet Section 2.4.

## Phase finale post-mega — validation factuelle v35.445-v35.451

| Bloc | Statut | Preuve | Notes |
| --- | --- | --- | --- |
| 1.1 Tableau Accueil | OK | `tests/phase-finale-dashboard.spec.js` + validation live v35.456 | 271 lignes visibles malgré anciens filtres `all`; tiers 1-5 alimentes; score tooltip et legende verifies desktop/mobile. |
| 1.2 Extensions sport | OK / WATCH | Validation live v35.456 | Tier 2 foot, Asie/LATAM, MLB, NHL, Serie B, Bundesliga 2, Ligue 2, Liga 2 visibles/bookables; foot feminin, Challenger et rugby restent `watch_not_bookable` tant que le snapshot Winamax exact ne contient pas ces evenements. |
| 1.3 Innovations genie | OK / WATCH | `audit-artifacts/phase-finale-genius-validation.json` | Timing, signaux rares, voyage/fatigue, CLV et profil Theo visibles; anti-public reste `watch` car aucun signal actif aujourd'hui. |
| 1.4 Modele I2-I9 | OK / WATCH | `audit-artifacts/phase-finale-model-validation.json` | LightGBM actif en nudge conservateur; AUC reste `watch` tant que les probabilites par ligne manquent. |
| 1.5 Features produit | OK | `audit-artifacts/phase-finale-product-features-validation.json` | CLV, score enrichi, tilt, P&L, correlation, meteo et profils equipe valides. |
| 1.6 Polish code | OK | `audit-artifacts/phase-finale-code-polish-validation.json` | innerHTML/fetch/skips/data truth OK; `backtest_report.json` et `ci_heartbeat.json` conserves car encore references. |
| 1.7 Contenu | OK | `audit-artifacts/phase-finale-content-validation.json` | Glossaire 91 termes, 5 articles >=1500 mots, 7 insights et 7 previews. |

### P11-TEST-001 — Suite Playwright locale désynchronisée

- Sévérité : MEDIUM
- Preuve : lancement local v35.205 avec Chrome système; `a11y-axe.spec.js` bloqué par dépendance `@axe-core/playwright` absente du runtime local.
- Constat : hors axe-core, la suite exécute `358` tests : `263` passed, `79` failed, `16` skipped. Les échecs se concentrent sur specs legacy attendant des pages supprimées (`#locks`, `#matchs`, `Top du jour`), snapshots visuels Windows non initialisés et quelques assertions obsolètes de helpers/labels.
- Action : Section 2.4 phase finale doit relancer la suite complete avec runtime Playwright local, puis adapter/annoter les specs legacy restantes.
- Statut : OPEN — v35.454 a debloque la dependance axe via fallback local. v35.455-v35.456 ont remis au vert les specs critiques V37 (`critical-flows`, audit P0, helpers, modal/table sync, CLV, score, signaux modal, dashboard final). Le run complet historique reste a assainir car plusieurs specs legacy pre-refonte 5 hubs/pages supprimees sont encore a realigner. Preuve : `audit-artifacts/phase-finale-playwright-regression.json`.


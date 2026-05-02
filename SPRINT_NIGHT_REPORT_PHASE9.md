# Rapport Phase 9 Finale — Polish site interne

Date: 2026-05-02  
Périmètre: sprints `v35.112` à `v35.151`  
Objectif: corriger les incohérences, visualiser/tester le site, polir les pages internes et atteindre une performance mobile solide.

## Résumé exécutif

Phase 9 a livré 40 sprints poussés sur `main`. Le bug critique signalé par Théo est corrigé: le site ne peut plus afficher ensemble des marchés contradictoires comme `score 1-0` + `BTTS Oui`. La sélection passe désormais par un filtre de cohérence inter-marchés, couvert par 50 cas de tests.

Le site a aussi été revalidé visuellement et fonctionnellement. Les 8 bugs P9-VIS détectés pendant l'audit ont été traités, les pages internes restantes ont été revues (`Académie`, `Profil`, `Santé`, `Montantes`), et les audits finaux sont propres: accessibilité fallback à 0 violation, Lighthouse-compatible min perf 85, SEO 100.

## Top 5 gains

| Sujet | Avant | Après | Impact |
|---|---:|---:|---|
| Cohérence marchés | contradictions possibles | 50 tests cohérence, 0 échec | plus de prono impossible affiché |
| Lighthouse perf min | 68 | 85 | cible 75+ dépassée |
| Perf mobile pages auditées | 68-90 selon phase | 92 sur dashboard/tous/performance/academie | UX mobile plus rapide |
| A11y fallback | 0 critical / 0 serious / 20 moderate | 0 / 0 / 0 | audit local propre |
| Click audit | 98 clics historiques | 167 clics, 0 failure | boutons et nav revalidés |

## Tests finaux

| Suite | Résultat |
|---|---|
| Smoke E2E | PASS |
| Click audit | 167 clics, 0 failure |
| Modal tabs | 5 sports testés, 0 failure |
| Market consistency | 50 cas, 0 failure |
| User flow Big Bet | 3 étapes, 0 failure |
| A11y fallback | 8 pages, 0 critical / 0 serious / 0 moderate |
| Lighthouse-compatible | min perf 85, min SEO 100 |

## Pages révisées

- `#dashboard`: hauteur mobile réduite, sections secondaires repliées, bugs P9-VIS traités.
- `#academie`: glossaire 55 termes, recherche, filtres, sommaire desktop, articles méthode.
- `#profil`: bandeau réglages actifs, raccourcis Bankroll/Cote/Thème/Sports/Données.
- `#sante`: cockpit data au-dessus de la ligne de flottaison.
- `#montantes`: progression de mise visuelle et exemple pédagogique en empty state.
- `legal.html`: thème dark cohérent, cibles tactiles statiques corrigées via CSS partagé.

## Artefacts

- `ISSUES.md`: 0 `OPEN`, 4 `PARTIAL` documentés.
- `a11y-report.json`: audit 8 pages à 0 violation.
- `lighthouse_phase9_summary.json`: scores Lighthouse-compatible finaux.
- `phase9_test_summary.json`: résumé smoke/click/modal/cohérence/flow.
- `.cache/phase9-current/`: baseline visuelle 32 captures.

## Points restants

| Priorité | Sujet | Recommandation |
|---|---|---|
| P1 | `app.js` proche cap | Supprimer réellement les vieux renderers après avoir retiré leurs routes legacy |
| P1 | `app.css` proche cap | Migrer les gros blocs rares vers CSS secondaire ou supprimer commentaires anciens |
| P2 | Lighthouse desktop a11y fallback | Le fallback pénalise les petites cibles desktop, mais l'audit a11y dédié est propre |
| P2 | Visual regression | Étendre les snapshots 8 pages × 4 viewports en CI |
| P3 | Modèle/data avancé | Reprendre ensuite ensemble model, LightGBM offline, multi-bookies/live |

## Conclusion

Phase 9 a surtout fiabilisé le site: cohérence logique, audits, accessibilité, performances, pages internes et navigation. Le site est plus stable, plus lisible, et les chemins principaux de Théo sont testés.

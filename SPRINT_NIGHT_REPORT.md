# Rapport Nuit v35 — Terminal Value Winamax

_Snapshot final : 2026-05-02 00:33 UTC via `scripts/measure_night_metrics.py`._

## Résumé exécutif

25 sprints Codex ont été livrés et poussés sur `main` pendant la session. Le site est passé d'un cockpit qui pouvait afficher trop peu d'opportunités à un Terminal Value plus dense, testé en navigateur, avec garde-fous ROI visibles et des mesures reproductibles.

Top 3 des gains :

1. **Terminal Value beaucoup plus utile** : le smoke local voit maintenant `282 marchés scorés · 57 matchs exacts sur 48h`, contre 55 marchés avant le fix de persistance et le seed de détails.
2. **ROI sports faibles assaini** : baseball `-37% -> -0.92%`, basketball `-49% -> -0.71%`; hockey reste froid à `-15.76%` mais il est désormais auto-bloqué sauf edge exceptionnel.
3. **QA et Santé exploitables** : smoke E2E autonome sur 15 pages, port dynamique, check mobile overflow, drift pipeline visible, CLV visible, garde-fou ROI visible dans Santé.

## Métriques clés

| Métrique | Baseline mission | Final v35.25 | Statut |
|---|---:|---:|---|
| Events chargés | 728 | 1040 | OK |
| Winamax exact ratio | 19% | 30.2% | En progrès |
| Matchs Winamax détaillés | 0 après cron frais | 25 préservés | Fix critique |
| Events avec marchés >1N2 | 0/fragile après cron | 26 | En progrès |
| Terminal Value 48h | vide/55 marchés | 282 marchés | Gros gain |
| Forme L10 | 0 | 384 events | En progrès |
| H2H utile | 287 | 163 snapshot courant | Fetcher amélioré, couverture à stabiliser |
| Lineups | 0 | 11 | Encore faible |
| ClubElo | 0 | 131 | En progrès |
| ROI baseball | -37% | -0.92% | Gros gain |
| ROI basketball | -49% | -0.71% | Gros gain |
| ROI global backtest | non stabilisé | +2.88% | Positif |
| Smoke E2E | fragile / port fixe | 15 pages vertes | OK |

## Livré

- `fetch_winamax_catalog.py` préserve maintenant les marchés détaillés existants au lieu de les effacer à chaque refresh catalogue.
- `fetch_winamax_match_details.py` a seedé 25 matchs détaillés, injectés dans `data.js`.
- L'agent bloque automatiquement les sports ROI<-10% avec n>=10, sauf cas value exceptionnel.
- La page Santé affiche les sports `AUTO-BLOCK`, les métriques CLV, drift pipeline et couverture data.
- `scripts/smoke_e2e.js` valide maintenant le Terminal Value, le garde-fou ROI, la page Santé et le mobile overflow.
- `scripts/measure_night_metrics.py` produit `night_metrics.json`, source de vérité du rapport.

## Tests

- `node --check app.js`
- `node --check scripts/smoke_e2e.js`
- `python -m py_compile` sur les scripts modifiés
- `python scripts/check_bundle_size.py`
- `node scripts/smoke_e2e.js` : 15 pages OK, Terminal `282 marchés scorés · 57 matchs exacts sur 48h`, Santé guard visible, overflow mobile 0px

## Reste prioritaire

1. Monter `WINAMAX_DETAILS_CAP` en production par paliers et vérifier que GitHub Actions tient le temps sans 429.
2. Réparer vraiment `fetch_lineups_soccer.py` côté Sofascore pour passer de 11 à plusieurs centaines d'events.
3. Accroître Winamax exact ratio >50% via matching tournoi/horaire/aliases.
4. Ajouter Understat/xG ou fallback robuste, puis intégrer ce signal dans `predictMatch`.
5. Construire l'historique par type de marché avec settlement complet, CLV par marché et rétrogradation automatique.

Conclusion : le site n'est pas encore au plafond du plan v35, mais il a changé de catégorie côté stabilité, mesure, scanner multi-marchés et contrôle du risque. Le prochain meilleur euro d'effort est clairement Winamax exact + lineups.

# Rapport — Analytics personnalisation locale v37.021

## Synthèse

La passe ajoute une couche d'analytics strictement locale, sans serveur, sans tracking distant et sans primitive réseau dans le module. Les données restent dans `localStorage.usage_telemetry` et `localStorage.usage_telemetry_prefs`, avec des tableaux bornés pour éviter l'accumulation infinie.

## Livré

- Behavioral analytics local : pages visitées, durée par page, clics, picks ouverts.
- Funnel local : Accueil → Tous → Modal → Profil.
- Heatmap clics locale : grille visualisable sur `#activity`.
- Popularité pages : top pages visitées, temps cumulé.
- A/B test local : variants stables par hash local, exposés via `window.__localAnalyticsAudit()`.
- Personnalisation : sports, ligues, tiers, tranches de cote déduits des picks ouverts.
- Recommandations : section "Picks que tu pourrais aimer" + badge "Match pour toi".
- Smart alerts : 5 règles locales configurables.
- Adaptive UI : raccourci "Perso" dans la nav, basé sur l'usage local.
- Usage weekly : récap hebdo local.
- Time-of-day patterns : heures observées dans la télémétrie locale.
- Ignore patterns : scoring de personnalisation centré sur les picks réellement ouverts.
- Feature discovery : suggestion locale si Combinés n'a jamais été exploré.
- Personal dashboard : `#my-dashboard`, modules réordonnables par glisser-déposer ou flèches.
- Saved views : sauvegarde locale des vues/filtres depuis Tous.
- Notification preferences : préférences granulaires locales.
- Activity timeline : `#activity`, timeline filtrable.
- Segment local : Conservatif / Équilibré / Risqué.
- Clear all data : reset de la télémétrie et préférences analytics locales.

## Privacy audit

Fichier généré : `analytics_local_privacy_audit.json`

- `server_uploads`: 0
- `tracking_calls`: 0
- `network_primitives`: 0
- Stockage : `localStorage.usage_telemetry`, `localStorage.usage_telemetry_prefs`
- Scan interdit : `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, URL HTTP(S)

Commande validée : `scripts/audit_local_analytics.py`

## Captures

- `captures/local-analytics-v37.021/my-dashboard.png`
- `captures/local-analytics-v37.021/activity.png`

## Vérifications

- JS syntax : `src/local-analytics.js`, `app.js`, `sw.js` OK.
- Audit local analytics : OK.
- Captures Edge headless : OK, deux PNG générés.
- Bundle budget : OK, tous les bundles restent dans leur budget.
- Playwright : spec ajoutée dans `tests/local-analytics.spec.js`; non exécutée dans ce clone car `npm`/`npx` ne sont pas disponibles localement.
- Pipeline freshness : non modifié par cette passe. Un refresh local rapide a été tenté, mais rejeté par `check_data_integrity.py` car il réduisait la couverture events de 1018 à 240. Les fichiers data générés ont donc été restaurés.
- Backlog : le diagnostic pipeline freshness/couverture a été ajouté dans `BACKLOG.md` en P0.

## Matrice

| Item | Cible | Status |
|---|---|---|
| Telemetry local | actif | OK |
| Funnel | visualisable | OK |
| A/B test | framework actif | OK |
| Recommendations | "Match pour toi" visible | OK |
| Smart alerts | 5+ règles configurables | OK |
| Adaptive UI | actif si pattern détecté | OK |
| Personal dashboard | drag-and-drop | OK |
| Aucun call externe | audit statique | OK |

## Notes

Le module est volontairement indépendant : il ne modifie pas le modèle de pronostics, ne change pas les sources de données et n'ajoute aucun envoi réseau. Il observe uniquement l'usage local pour rendre l'interface plus pertinente pour Théo.

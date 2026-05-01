# Top findings a arbitrer

Ce fichier donne la lecture la plus courte du pack.

## 1. Stats football contaminees par d'autres sports

Exemple : `Unión (Santa Fe)` a des derniers matchs contre `Boston Celtics`.

Probable cause : `team_stats` indexe par `team_id` seul.

Importance : tres haute si `predictMatch` utilise `form_stats`.

## 2. Winamax exact pas equivalent a `winamax.available`

`available: true` peut signifier tournoi/league/sport disponible, pas match exact.

Importance : tres haute pour la promesse Winamax-only.

## 3. Le frontend lit souvent les cotes externes avant Winamax

`getMatchOdds()` priorise odds live/snapshot avant `winamax.markets`.

Importance : tres haute pour edge, Kelly, reco user/agent.

## 4. Health est frais mais pas semantique

`health.json` controle surtout age/presence, pas qualite des signaux.

Importance : haute pour eviter faux vert.

## 5. Meteo parfois geocodee sur mauvais lieu

Exemples : `Tarma -> Ada`, `Stockholm -> Aiken`.

Importance : moyenne/haute si meteo pese dans le modele.

## 6. Modal detail reste un chantier UX/accessibilite

Pas d'onglets attendus, focus clavier limite.

Importance : moyenne/haute pour confiance utilisateur.

## 7. Navigation SPA/hash incoherente

La page visible et l'URL peuvent diverger.

Importance : moyenne pour partage/refresh/back.

## 8. Cas de scoring speciaux a clarifier

Tennis `RETIRED`, `WALKOVER`, scores null, sports sans competitors.

Importance : moyenne/haute pour bilan agent.

## 9. PWA/cache et doublons reseau

`data.js` / `data_today.json` peuvent etre charges en double ; service worker contient des variantes d'assets.

Importance : moyenne.

## 10. Dette front encore forte

`app.js` ~1MB, beaucoup de styles inline, `!important`, `nth-child`.

Importance : moyenne, mais augmente le risque de chaque patch.

## Lecture conseillee pour Claude

Si temps limite :

1. `TOP_FINDINGS_A_ARBITRER.md`
2. `ROOT_CAUSE_BACKEND.md`
3. `QUALITE_DATA_SIGNAL.md`
4. `PATCH_BLUEPRINTS_OPTIONNELS.md`
5. Rapport complet si besoin de details.


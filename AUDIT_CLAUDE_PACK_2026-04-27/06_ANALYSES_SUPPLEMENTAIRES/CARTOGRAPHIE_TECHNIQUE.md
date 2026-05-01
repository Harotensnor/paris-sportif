# Cartographie technique live

Base : snapshots live recuperes le 2026-04-27 vers 18h07 heure France.

Fichiers de preuve :

- `07_SNAPSHOTS_LIVE/pronostics.live.html`
- `07_SNAPSHOTS_LIVE/app.live.js`
- `07_SNAPSHOTS_LIVE/app.live.css`
- `07_SNAPSHOTS_LIVE/sw.live.js`
- `07_SNAPSHOTS_LIVE/data_today.live.json`
- `06_ANALYSES_SUPPLEMENTAIRES/TECH_INVENTORY_LIVE.json`
- `06_ANALYSES_SUPPLEMENTAIRES/TECH_INVENTORY_SUMMARY.json`

## Architecture live observee

Le site live n'est plus seulement un `pronostics.html` monolithique. Il est servi sous forme :

- `pronostics.html` : shell HTML.
- `app.js` : logique SPA principale, environ 1.03 MB.
- `app.css` : styles principaux, environ 164 KB.
- `data.js` : donnees completes.
- `data_today.json` : donnees du jour.
- `sw.js` : service worker PWA.

## Pages SPA connues

`VALID_PAGES` contient 21 pages :

- `dashboard`
- `tous`
- `locks`
- `buteurs`
- `combines`
- `top`
- `historique`
- `bilan`
- `backtest`
- `academie`
- `credibilite`
- `alertes`
- `profil`
- `sante`
- `legal`
- `methodologie`
- `montante-jour`
- `montante-weekend`
- `montante-semaine`
- `compare`
- `calendrier`

Point a arbitrer : certaines pages sont peut-etre des vues modernes, d'autres des restes ou des vues secondaires. Claude devrait verifier si elles doivent toutes rester publiques dans la nav, dans le manifest, ou seulement accessibles en debug.

## Stockage local

35 cles localStorage detectees :

- `agentFilter`
- `agentResetTs`
- `agentRules`
- `agentRulesIgnored`
- `bankroll`
- `bilan.maeHistory`
- `bilanCompareMode`
- `bilanSport`
- `bilanWindow`
- `compare_date_a`
- `compare_date_b`
- `currentPage`
- `discord_webhook_url`
- `notifiedPickIds`
- `paris_sportif_js_errors_v1`
- `paris_sportif_onboarded_v2`
- `paris_sportif_tracked_bets`
- `paris_sportif_user_lessons_v1`
- `paris_sportif_web_vitals_v1`
- `pwaPagesSeen`
- `pwaVisitCount`
- `reliability_history_v1`
- `seenLockIds`
- `seenLocks`
- `tousFilters`
- `tousSort`
- `tousTab`
- `trustStripHiddenUntil`
- `userBankroll`
- `userPrefs`
- `walletBacktestDate`
- `walletBacktestStart`
- `walletPicksMode`
- `walletStakeMode`
- `walletTableWindow`

SessionStorage detecte :

- `autoRefreshDoneAt`

Lecture produit : la bannière de consentement devrait parler de stockage local plus large que de simples preferences, meme si rien n'indique ici une exfiltration serveur.

## Donnees du jour dans snapshot live

`data_today.live.json` contient 50 events.

Classification locale ajoutee par l'audit :

- `winamax_exact` : 23 events.
- `winamax_tournament_only` : 27 events.

Parmi les events non termines/in progress, 6 sont problematiques pour une promesse "cote exacte Winamax" :

- `Andrea Lazaro Garcia vs Beatriz Haddad Maia`, TennisExplorer, pas de `match_id`.
- `Anastasia Zakharova vs Marina Bassols Ribera`, TennisExplorer, pas de `match_id`.
- `Storm Hunter vs Ashlyn Krueger`, TennisExplorer, pas de `match_id`.
- `Akron Tolyatti at FC Baltika Kaliningrad`, BetExplorer, pas de `match_id`.
- `Los Chankas at ADT`, DraftKings, pas de `match_id`.
- `Universidad Católica (Quito) at Manta F.C.`, DraftKings, pas de `match_id`.

Interpretation prudente : certains peuvent devenir resolus si Winamax ajoute le match plus tard, mais a l'instant du snapshot ils ne sont pas des cotes exactes Winamax.

## Dette CSS observee

Dans `app.live.css` :

- 99 occurrences de `!important`.
- 18 selectors `:nth-child`.
- 22 lignes `position: fixed` ou `position: sticky`.

Lecture prudente : ce n'est pas un bug en soi. C'est un indice de fragilite mobile/layout si les sections changent selon les donnees.

## Service worker

Assets mentionnes par le service worker :

- variantes avec slash : `/app.css`, `/app.js`, `/data.js`, `/data_today.json`, `/pronostics.html`.
- variantes sans slash : `app.css`, `app.js`, `data.js`, `data_today.json`, `pronostics.html`.
- pages statiques : `index.html`, `methodologie.html`, `academie.html`, `comment-lire-un-prono.html`, `legal.html`.
- icons et manifest.

Point a arbitrer : la duplication peut etre volontaire pour couvrir les chemins GitHub Pages, mais Claude devrait verifier si elle est necessaire ou si elle complique le cache.

## Fonctions exposees / zones sensibles

Le live expose notamment :

- `predictMatch`
- `openDetail`
- fonctions de modal detail
- fonctions agent/replay
- fonctions de debug/poll data

Zones a relire avant patch :

- route/hash/currentPage ;
- `predictMatch` et `_predictMatchImpl` ;
- `_agentBestPick`, `_agentReplay`, `_evaluateBestPick` ;
- detail modal ;
- logique Winamax/odds snapshot ;
- checks Sante/health.


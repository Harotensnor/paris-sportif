# Recette manuelle pour Claude

Cette recette sert a reproduire les constats principaux sans devoir refaire tout l'audit.

URL de base :

`https://harotensnor.github.io/paris-sportif/pronostics.html`

## 1. Verifier la promesse Winamax exacte

Objectif : distinguer `winamax.available` de `match_id + markets`.

Etapes :

1. Ouvrir le site live.
2. Aller dans les vues `Top`, `Tous`, `Dashboard`.
3. Reperer les picks actionnables avec cote affichee.
4. Pour chaque pick, verifier dans les donnees :
   - `event.winamax.available`
   - `event.winamax.match_id`
   - `event.winamax.markets`
   - `event.odds_snapshot.provider`
5. Confirmer si la cote affichee vient de `winamax.markets` ou d'un fallback externe.

Cas detectes dans le snapshot :

- `Los Chankas at ADT`
- `Universidad Católica (Quito) at Manta F.C.`
- `Akron Tolyatti at FC Baltika Kaliningrad`

## 2. Verifier la page Sante

Objectif : confirmer si Sante detecte ou non le manque de cote exacte.

Etapes :

1. Ouvrir `pronostics.html#sante`.
2. Observer les badges `Tout est vert`, `Ratio Winamax`, `Couverture cotes`.
3. Comparer avec les events sans `match_id`.
4. Decider si Sante doit rester technique pipeline ou devenir garde-fou produit.

## 3. Verifier la modal detail

Objectif : juger si la refonte est prioritaire.

Etapes :

1. Ouvrir un match via le bouton detail ou une carte.
2. Verifier si les onglets attendus existent : `Synthese`, `Signaux`, `Cotes`, `H2H`.
3. Tester `Tab` plusieurs fois.
4. Tester `Esc`.
5. Verifier si le focus revient au bouton/carte qui a ouvert la modal.

Constat audit : `Esc` fonctionne, mais le focus clavier reste surtout sur `Partager` et `Fermer`.

## 4. Verifier navigation SPA

Objectif : confirmer la desynchronisation hash/page.

Etapes :

1. Ouvrir `pronostics.html#dashboard`.
2. Cliquer vers `Top`, `Locks`, `Bilan`, `Profil`, `Sante`.
3. Observer :
   - contenu visible ;
   - `localStorage.currentPage` ;
   - `location.hash`.
4. Rafraichir la page et verifier quelle vue revient.
5. Tester le bouton retour navigateur.

## 5. Verifier mobile

Largeurs conseillees :

- 390 x 844
- 768 x 1024
- 1440 x 1000

Etapes :

1. Ouvrir dashboard mobile.
2. Ouvrir le hamburger.
3. Verifier si la bottom nav reste active/visible au-dessus du drawer.
4. Verifier la pilule `A jour / LIVE`.
5. Tester les boutons bottom nav.

Captures utiles :

- `03_CAPTURES/mobile-dashboard-clean.png`
- `03_CAPTURES/mobile-hamburger.png`
- `03_CAPTURES/tablet-dashboard-clean.png`

## 6. Verifier cas donnees speciales

Objectif : proteger le bilan agent.

Cas a tester :

- Tennis `STATUS_RETIRED`.
- Tennis `STATUS_WALKOVER`.
- Event sans competitors.
- Tennis termine avec scores competitors `null`.

Questions :

- Ces events doivent-ils etre void ?
- Sont-ils exclus de `_agentReplay` ?
- L'UI affiche-t-elle un score clair ?
- `evaluateModelPick` peut-il les compter a tort ?

## 7. Verifier PWA/cache

Etapes :

1. Ouvrir DevTools Network.
2. Hard refresh.
3. Observer si `data.js` et `data_today.json` sont charges une ou deux fois.
4. Verifier les warnings de preload.
5. Verifier `sw.js` et `CACHE_VERSION`.

Point de prudence : toute correction service worker doit bumper le cache.


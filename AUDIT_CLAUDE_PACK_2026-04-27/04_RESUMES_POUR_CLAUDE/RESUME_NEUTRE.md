# Resume neutre pour decision

Audit effectue le 2026-04-27 sur le site live :

`https://harotensnor.github.io/paris-sportif/pronostics.html`

Le site charge, les pages principales s'affichent, les donnees live sont fraiches, les assets principaux repondent et il n'y a pas d'ecran blanc observe. L'etat general visuel est solide pour une application en production personnelle.

Les points les plus sensibles ne sont pas des bugs d'affichage grossiers, mais des problemes de coherence produit et de fiabilite decisionnelle.

## Constats forts

### 1. Cotes Winamax exactes vs disponibilite Winamax

Le site affiche une logique Winamax-only. Pourtant, plusieurs events futurs ont `winamax.available: true` sans match Winamax exact detectable, et utilisent des providers comme `DraftKings`, `TennisExplorer` ou `BetExplorer`.

Chiffres observes dans les donnees live :

- 559 events futurs dans les 7 prochains jours.
- 323 avec mapping/cote Winamax exacte detectable.
- 236 avec fallback externe ou absence de cote exacte detectable.

Dans le snapshot `data_today.live.json` ajoute en passe 3 :

- 50 events du jour.
- 23 classes `winamax_exact` par l'audit.
- 27 classes `winamax_tournament_only`.
- 6 events non termines/in progress sans `match_id` ni `markets` Winamax exacts.

Interpretation prudente : `winamax.available` semble parfois signifier "competition/tournoi disponible sur Winamax", pas "match exact + marche exact + cote exacte".

### 2. Monitoring Sante potentiellement trop optimiste

La page Sante affiche `Tout est vert`, `Ratio Winamax 100%`, `Couverture cotes 100%`, mais ne semble pas detecter la difference entre cote Winamax exacte et fallback externe.

Risque : le monitoring donne un sentiment de securite alors que les recos actionnables peuvent ne pas respecter exactement la promesse Winamax-only.

### 2 bis. Contamination inter-sports dans certaines donnees football

La passe data supplementaire a trouve des formes football impossibles, avec des clubs argentins qui recuperent des matchs NBA :

- `Unión (Santa Fe)` avec des derniers matchs contre `Boston Celtics`, scores 100-108, 111-97, 91-123.
- `Huracán` avec `Los Angeles Lakers`.
- `San Lorenzo` avec `Atlanta Hawks`.
- `Boca Juniors` avec `Toronto Raptors`.

Hypothese a verifier : collision d'identifiants ESPN et jointure/caches non namespaces par sport/ligue.

Risque : certains picks peuvent etre fausses par des signaux de forme completement errones.

### 3. Modal detail match

La modal s'ouvre, se ferme avec `Esc`, et affiche du contenu. Mais elle n'a pas les onglets attendus `Synthese / Signaux / Cotes / H2H`, et le focus clavier tourne surtout sur `Partager` et `Fermer`.

Risque : dette UX/accessibilite et comprehension plus difficile des pronos.

### 4. Navigation SPA

Les pages changent visuellement et `localStorage.currentPage` bouge, mais l'URL/hash peut rester sur l'ancienne page.

Risque : liens directs, partage, retour navigateur et refresh moins fiables.

### 5. Mobile et PWA

Le mobile est globalement utilisable. Les problemes vus sont plutot de couche et de polish :

- drawer hamburger et bottom nav peuvent se superposer ;
- pilule de statut live visible au bas de l'ecran ;
- chargement potentiellement double de `data.js` / `data_today.json` ;
- service worker avec entrees shell assets redondantes.

### 6. Donnees sportives speciales

Des cas peuvent demander une regle explicite :

- tennis `STATUS_RETIRED` ou `STATUS_WALKOVER` avec `completed: true` ;
- events golf/racing sans competitors ;
- scores tennis parfois `null`.

Risque : bilan agent ou affichage historique fausse si ces cas sont evalues comme matchs normaux.

## Ce qui fonctionne bien

- Donnees live recentes.
- Assets principaux en 200.
- Pages statiques principales en 200.
- Pas de scroll horizontal global observe.
- Pas de duplicate id visible detecte.
- Pas de bouton visible sans nom accessible detecte.
- Les vues SPA principales ont un rendu coherent.
- Le site semble beaucoup plus avance que le checkout local historique.

## Ton de decision conseille

Ce rapport doit servir de base de jugement. Certains points peuvent etre critiques selon la promesse produit, d'autres peuvent attendre. Claude doit arbitrer selon l'objectif du moment : securiser les recos, ameliorer l'UX, stabiliser le deploy, ou preparer un refactor.

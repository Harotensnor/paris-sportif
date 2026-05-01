# Audit Codex - Paris-Sportif

Audit effectue le 2026-04-27 vers 17:35 Europe/Paris sur le site publie :
https://harotensnor.github.io/paris-sportif/pronostics.html

## Perimetre teste

- Site publie GitHub Pages, sans cache applicatif preexistant.
- Donnees live `data.js` chargees et parsees.
- Pages SPA testees par hash : `dashboard`, `tous`, `locks`, `buteurs`, `combines`, `top`, `historique`, `bilan`, `backtest`, `academie`, `credibilite`, `alertes`, `profil`, `sante`, `legal`, `methodologie`, `montante-jour`, `montante-weekend`, `montante-semaine`, `compare`, `calendrier`.
- Pages statiques testees en mobile : `methodologie.html`, `academie.html`, `comment-lire-un-prono.html`, `credibilite.html`, `backtest.html`, `legal.html`.
- Viewports : desktop 1440x1000, tablette 768x1024, mobile 390x844.
- Artefacts bruts : `audit-artifacts/browser-audit.json`, `audit-artifacts/deep-audit.json`, `audit-artifacts/real-interactions.json` + captures PNG.

## Etat general

Le site publie charge correctement et les donnees sont fraiches :

- `data.js` : 200, environ 2.09 MB, `generated_at=2026-04-27T15:30:52Z`, `today=2026-04-27`.
- Dataset live : 19 jours, 925 events, 50 events aujourd'hui, 0 event avec `winamax.available=false`.
- Sports presents : football, tennis, basketball, hockey, baseball, mma, golf, racing.
- Aujourd'hui : 32 tennis, 18 football ; 25 scheduled, 7 live/in-progress, 18 final.
- `sw.js` : network-first pour `pronostics.html`, `data.js`, `data_today.json`, `data_manifest.json`, `odds_history.jsonl`. Cache version live observee : `paris-sportif-20260427-153444`.
- Toutes les vues principales rendent quelque chose, pas d'ecran blanc.

Attention : le workspace local n'est pas l'etat publie. Le dossier local racine est sur `main...origin/main [behind 1541]`, avec `pronostics.html` local encore en version monolithique stale et `data.js` local genere le 2026-04-22. Le live GitHub Pages est en architecture v31 avec `pronostics.html` + `app.css` + `app.js`.

## Findings prioritaires

### P1 - Des picks actionnables utilisent des cotes non Winamax malgre la promesse Winamax-only

Symptome : le top pick du dashboard, `Universidad Catolica (Quito) at Manta F.C.`, affiche `2 - U. Catolica @1.83`, mais l'event live a :

```json
{
  "winamax": {
    "available": true,
    "url": "https://www.winamax.fr/paris-sportifs/sports/football/equateur/liga-pro",
    "match_id": null,
    "tournament": null
  },
  "odds_snapshot": {
    "home": 4.2,
    "draw": 3.4,
    "away": 1.833,
    "provider": "DraftKings"
  }
}
```

J'ai trouve 5 matchs scheduled aujourd'hui sans `winamax.match_id` ni marche Winamax exact, mais quand meme avec cote affichee via DraftKings, BetExplorer ou TennisExplorer : Zakharova/Bassols, Hunter/Krueger, Akron/Baltika, Los Chankas/ADT, Manta/U. Catolica.

Impact : c'est le plus gros risque produit. Le site dit "Winamax-only / bookable", mais certains picks utilisateur et possiblement agent sont bases sur une cote non Winamax. Meme si le tournoi est disponible sur Winamax, la cote exacte peut differer ou le match peut ne pas etre trouve.

Correctif conseille :

- Separarer `winamax.available` tournoi et `winamax.market_available` match exact.
- Pour les sections actionnables (`Top pick`, `A parier aujourd'hui`, agent autonome, combinés), exiger soit `winamax.match_id`, soit une cote issue de `winamax.markets`.
- Si seule une cote externe existe, afficher un badge clair `cote externe`, exclure de l'agent, et ne pas le presenter comme "a parier sur Winamax".
- Ajouter un check CI/data : `actionablePick => odds.provider === "Winamax" || winamax.match_id != null`.

### P1 - La navigation SPA ne met pas a jour le hash URL

Symptome : depuis `#dashboard`, cliquer dans la sidebar sur `Top du jour`, `Locks`, `Calendrier 7 jours`, `Combines`, `Bilan`, `Historique`, `Profil` change bien `localStorage.currentPage`, mais l'URL reste `#dashboard`.

Exemples observes :

- clic `Top du jour` : `currentPage=top`, heading `Top du jour`, mais `location.hash=#dashboard`.
- clic `Locks` : `currentPage=locks`, heading `Paris surs`, mais `location.hash=#dashboard`.
- clic `Bilan` : `currentPage=bilan`, heading `Bilan`, mais `location.hash=#dashboard`.

Impact :

- Partage d'URL trompeur.
- Reload/back-forward incoherent.
- PWA shortcuts et restauration d'onglet peuvent retomber sur la mauvaise vue.
- Les tests automatises et l'analytics de pages deviennent peu fiables.

Correctif conseille :

- Dans le handler `.page-btn`, appeler `history.pushState` ou `location.hash = page` quand `currentPage` change.
- Ecouter `popstate/hashchange` pour restaurer la vue sans casser `localStorage`.
- Eviter de garder une URL `#dashboard` quand la page visible est autre chose.

### P1 - Modal detail match pas encore refondue en onglets

Symptome : le bouton `Voir le detail` ouvre bien la modal, mais aucun onglet `Synthese`, `Signaux`, `Cotes`, `H2H`, `Historique` n'existe. Les tentatives de ciblage de ces onglets echouent car la modal est encore un long scroll vertical.

Capture utile : `audit-artifacts/real-detail-button.png`.

Impact :

- Lecture dense, surtout mobile.
- Les signaux, cotes et contexte sont melanges.
- La task #138 reste a faire.

Correctif conseille :

- Refondre `openDetail` en tabs : `Synthese`, `Signaux`, `Cotes`, `H2H`, `Historique`.
- Garder un resume compact en haut : pick, cote, confiance, edge, Winamax exact/externe.
- En mobile, tabs horizontales sticky ou segmented control.

### P1 - Workspace local dangereux pour patcher

Symptome :

- `git status` local : `main...origin/main [behind 1541]`.
- Fichiers locaux modifies/non suivis : `.github/workflows/refresh.yml`, `scripts/fetch_winamax_catalog.py`, `winamax_catalog.json`, `deploy-v20/`, `AGENTS.md`, `CLAUDE*.md`, `winamax_markets.json`, etc.
- Local `pronostics.html` : 2.18 MB, inline data generee le 2026-04-22.
- Live `pronostics.html` : environ 333 KB + `app.js` 1.02 MB + `app.css` 164 KB + `data.js` 2.09 MB.

Impact : Claude risque de corriger le mauvais fichier ou d'ecraser la version live si elle travaille depuis ce checkout sans update/splice.

Correctif conseille :

- Avant toute correction : fresh clone ou `git fetch` + checkout propre de `origin/main`.
- Ne pas copier le `pronostics.html` local stale.
- Respecter le splice data via `deploy-v20/splice-prono-data.js` ou workflow equivalent.
- Ideal : demander a Claude de partir de `origin/main`, pas de l'etat local racine actuel.

## Findings importants

### P2 - Incoherence des compteurs Locks

Observations le meme run :

- Dashboard : `4 LOCKS`.
- Sante : `Paris surs actifs 4`.
- Calendrier : `Aujourd'hui ... 4 locks`.
- Sidebar avant navigation : `Locks 3 NEW`.
- Apres clic sur Locks : bouton actif `Locks 47`.

Impact : l'utilisateur ne sait pas si le badge des locks represente les locks du jour, les nouveaux locks, ou tous les locks de la fenetre historique.

Correctif conseille :

- Renommer explicitement : `Locks aujourd'hui 4`, `3 nouveaux`, `47 historiques`.
- Ne pas changer le meme badge de signification selon la page.
- Ajouter une source unique de calcul pour le compteur visible.

### P2 - Onboarding tres bloquant en premiere visite

Symptome : en premiere visite, une modal "Bienvenue" couvre tout et bloque tous les clics. Sur mobile, elle occupe presque tout l'ecran et retarde la decouverte du produit.

Capture utile : `audit-artifacts/mobile-home.png`, `audit-artifacts/desktop-home.png`.

Impact : friction forte avant de voir le top pick. Ce n'est pas un bug bloquant, mais c'est un risque conversion/usage.

Correctif conseille :

- Garder l'onboarding mais proposer un CTA primaire plus direct : `Voir les pronos`.
- Mettre `Ignorer` en bouton visible, pas seulement lien discret.
- Eventuellement retarder l'onboarding apres que le top pick soit visible, ou le transformer en panneau inline.

### P2 - Console polluee par erreurs non critiques

Erreurs observees :

- `analytics.config.js` retourne 404 a chaque page. Le commentaire dit que le fichier est optionnel, mais Chrome log quand meme `Failed to load resource: 404`.
- `frame-ancestors` dans une CSP meta est ignore par Chrome : `The Content Security Policy directive 'frame-ancestors' is ignored when delivered via a <meta> element.`
- `credibilite.html` : `Error: <svg> attribute height: Expected length, "auto".`

Impact : bruit QA/monitoring. Les vraies erreurs JS deviennent plus difficiles a voir.

Correctifs conseilles :

- Creer un `analytics.config.js` vide, ou ne l'injecter qu'en build quand une config existe.
- Retirer `frame-ancestors` de la meta CSP ou accepter que seule une vraie header HTTP puisse le faire.
- Dans `credibilite.html`, remplacer `<svg width="100%" height="auto">` par CSS (`style="width:100%;height:auto"`) ou une hauteur numerique avec `viewBox`.

### P2 - Badge status/live peut masquer du contenu sur mobile

Symptome : la pilule bottom-left `A jour ... LIVE poll 30s` est visible au-dessus de la bottom nav. Sur mobile, elle chevauche visuellement le bas de la carte hero et le debut de "Tous les pronos".

Capture utile : `audit-artifacts/mobile-dashboard-clean.png`.

Impact : lisibilite reduite sur mobile, surtout avec le bottom nav.

Correctif conseille :

- Repositionner la pilule status au-dessus de la bottom nav avec `left/right` responsive et largeur max.
- La rendre dismissible ou compacte apres 3 secondes.
- Eviter le chevauchement avec les CTA principaux.

### P2 - La page Sante dit "tout est vert" mais ne detecte pas le probleme cote Winamax exacte

Symptome : `#sante` affiche `Tout est vert`, `Ratio Winamax 100%`, `Couverture cotes 100%`, alors qu'au moins 5 scheduled du jour n'ont pas de `winamax.match_id`/marche Winamax exact et utilisent une cote externe.

Impact : faux sentiment de securite. Le check actuel verifie probablement `winamax.available`, pas `cote Winamax exacte`.

Correctif conseille :

- Ajouter un check `Exact Winamax odds coverage`.
- Distinguer :
  - `Winamax tournament available`
  - `Winamax match mapped`
  - `Winamax market odds present`
  - `External fallback odds used`
- Faire remonter en warning si un pick actionnable utilise une cote externe.

## Findings moyens / polish

### P3 - Payload initial lourd

Taille live non compressee observee :

- `pronostics.html` : environ 333 KB.
- `app.js` : environ 1.02 MB.
- `app.css` : environ 164 KB.
- `data.js` : environ 2.09 MB.
- `data_today.json` : environ 124 KB.

Impact : correct sur desktop, mais couteux en mobile/PWA, surtout si le service worker et les preloads doublonnent parfois `data.js`/`data_today.json` en warning.

Pistes :

- Continuer la decomposition par chunks/pages.
- Charger `data.js` complet seulement pour historique/bilan, et `data_today.json` pour dashboard/top/tous.
- Verifier pourquoi Chrome avertit que `data.js` et `data_today.json` sont preloaded mais "not used within a few seconds".

### P3 - Pages statiques globalement OK, une erreur SVG sur Credibilite

Toutes les pages statiques principales repondent 200 et n'ont pas d'overflow mobile detecte. Seule `credibilite.html` a une erreur console SVG (`height="auto"`).

### P3 - Accessibilite perfectible

Plusieurs boutons visibles dans la navigation ont un texte visuel, donc restent utilisables. Les boutons hub (`PRONOS`, `MONTANTES`, `MA PERF`, etc.) n'ont pas toujours `aria-label` specifique, mais ce n'est pas bloquant. La modal detail utilise bien `role=dialog`, mais la navigation interne en onglets n'existe pas encore.

## Ce qui fonctionne bien

- Les donnees live sont fraiches et chargees.
- Pas d'ecran blanc sur les 21 vues SPA testees.
- Les pages statiques principales sont disponibles et responsive.
- Le service worker est maintenant network-first pour les donnees importantes.
- Mobile : hamburger et bottom nav fonctionnent.
- Dashboard, Top, Locks, Calendrier, Combines, Historique, Bilan, Profil et Sante ont un rendu coherent visuellement.
- Aucun scroll horizontal document detecte sur mobile/tablette/desktop.

## Checklist conseillee pour Claude

1. Corriger la separation `winamax.available` vs `winamax exact odds`.
2. Bloquer les picks actionnables si la cote n'est pas Winamax exacte.
3. Ajouter un warning Sante pour cotes externes utilisees.
4. Corriger la navigation pour synchroniser `location.hash` avec `currentPage`.
5. Refaire `openDetail` en onglets.
6. Clarifier tous les compteurs Locks.
7. Silencer `analytics.config.js` 404 et `frame-ancestors` meta.
8. Corriger le SVG `height="auto"` de `credibilite.html`.
9. Ajuster le status pill mobile.
10. Avant patch : repartir de `origin/main` frais, pas du checkout local actuel.

---

# Complement d'audit profond - passe 2

Cette deuxieme passe a pousse plus loin les assets, la PWA, les donnees, les interactions clavier/mobile et les incoherences internes. Les preuves brutes sont dans `audit-artifacts/surface-audit.json`, `audit-artifacts/link-audit-refined.json`, `audit-artifacts/interaction-accessibility-perf-audit.json` et `audit-artifacts/static-data-code-audit.json`.

## Nouveaux findings prioritaires

### P1 - Le probleme "Winamax exact" est systemique sur les prochains jours

Le premier audit avait trouve 5 picks du jour utilisant une cote externe alors que l'UI affiche une logique Winamax-only. La passe data etendue montre que le probleme est plus large :

- Prochains 7 jours : 559 events futurs analyses.
- Events avec mapping/cote Winamax exacte detectable : 323.
- Events avec fallback externe ou absence de cote exacte : 236.
- Providers futurs detectes : `DraftKings`, `TennisExplorer`, `BetExplorer`, `Draft Kings`, `Winamax`, et beaucoup d'events sans provider explicite.

Impact : le label produit "100% Winamax" est vrai seulement au sens "competition/tournoi trouve sur Winamax", pas au sens "match exact + marche exact + cote exacte". Pour un site de pronos actionnables, c'est une difference critique.

Correctif conseille :

- Ajouter un champ explicite, par event et par marche : `odds_source_kind = "winamax_exact" | "winamax_tournament_only" | "external_fallback" | "none"`.
- Interdire les mises agent et les reco user sur tout ce qui n'est pas `winamax_exact`, sauf affichage separé "veille / non bookable".
- Modifier la page Sante : afficher un ratio "cotes exactes Winamax", distinct du ratio "events Winamax disponibles".
- Dans les cartes, afficher le provider reel si fallback externe, ou masquer la cote.

### P1 - La page Sante valide un faux vert produit

`#sante` affiche `Tout est vert`, `Ratio Winamax 100%`, `Couverture cotes 100%`. Or les donnees prouvent que des events et picks actionnables n'ont pas de `match_id` Winamax ni de marche Winamax exact.

Impact : la page de monitoring donne un signal inverse de ce qu'il faut corriger. Claude devrait traiter ca comme un bug produit, pas comme un simple polish.

Correctif conseille :

- Ajouter un check rouge/orange si `topPicks`, `rawCandidates`, `positions agent` ou `À parier aujourd'hui` contiennent une cote non Winamax exacte.
- Ajouter un echantillon de 5 exemples fautifs dans Sante pour debug rapide.
- Faire echouer le badge "tout est vert" si le pipeline utilise un fallback externe sur une reco.

### P2 - Modal detail : focus clavier piege sur seulement 2 boutons

La modal detail s'ouvre et `Esc` la ferme correctement. En revanche, le cycle clavier dans la modal ne passe que par `Partager` et `Fermer`; le contenu detaille, les sections, les cotes et les signaux ne sont pas atteignables au clavier.

Impact : en accessibilite, la modal existe visuellement mais son contenu n'est pas vraiment navigable au clavier. C'est aussi un symptome que la refonte en onglets doit etre structurelle, pas seulement cosmetique.

Correctif conseille :

- Refaire `openDetail` avec un vrai `role="dialog"`, titre associe, focus initial sur le titre ou le premier onglet.
- Ajouter des tabs clavier : fleches gauche/droite, `Home`, `End`, `Enter`/`Space`.
- Rendre les panneaux scrollables avec un ordre DOM logique.
- Conserver `Esc` et retour du focus au bouton qui a ouvert la modal.

### P2 - Chargement reseau duplique sur les donnees

Chrome signale et les traces confirment que `data.js` et `data_today.json` sont charges/preloades puis recharges avec query string de freshness (`?t=...`). Exemple observe : `data.js` charge par `<link>`, puis `data.js?t=...` en fetch.

Impact : sur desktop ce n'est pas dramatique, mais sur mobile/PWA ca augmente le poids reel, ralentit le premier rendu et peut brouiller le cache/service worker.

Correctif conseille :

- Choisir une strategie unique : preload reutilisable sans query string, ou fetch versionne seulement.
- Si cache bust necessaire, mettre la meme URL versionnee dans le preload et dans le fetch.
- Verifier que le service worker ne transforme pas le preload en double requete.

### P2 - Consentement/confidentialite : la bannière est trop reductrice

La bannière parle surtout de preferences locales. Le code utilise aussi des cles localStorage liees a :

- Web vitals (`paris_sportif_web_vitals_v1`) avec user agent / connexion.
- Erreurs JS (`paris_sportif_js_errors_v1`).
- Paris suivis (`paris_sportif_tracked_bets`).
- Webhook Discord (`discord_webhook_url`).
- Nombreuses preferences wallet/agent/user.

Impact : meme si tout reste local, le texte de consentement ne decrit pas assez clairement les donnees conservees dans le navigateur.

Correctif conseille :

- Renommer le bandeau en "stockage local".
- Lister les categories : preferences, bankroll, paris suivis, diagnostics locaux.
- Ajouter un bouton "effacer mes donnees locales" dans Profil, avec confirmation.

### P2 - Drawer mobile : couche visuelle conflictuelle avec la bottom nav

Sur mobile, le menu hamburger s'ouvre bien, mais la bottom nav reste au-dessus visuellement. La capture `audit-artifacts/mobile-hamburger.png` montre une superposition peu propre.

Impact : risque de clics parasites et d'interface confuse, surtout quand le menu lateral est ouvert.

Correctif conseille :

- Quand le drawer est ouvert, masquer ou desactiver la bottom nav.
- Ou monter le z-index du drawer/overlay au-dessus de toute navigation mobile.
- Ajouter `aria-expanded` et `inert`/blocage focus sur le contenu derriere le drawer.

### P2 - Donnees sportives speciales a traiter explicitement

Deux events futurs n'ont aucun competitor :

- `Cadillac Championship` en golf, 2026-04-30.
- `Crypto.com Miami Grand Prix` en racing, 2026-05-01.

Six matchs tennis termines ont `completed: true` avec `STATUS_RETIRED` ou `STATUS_WALKOVER`. Beaucoup de matchs tennis termines ont aussi des scores competitor `null`.

Impact : si le scoring historique ou `evaluateModelPick` traite ces cas comme des resultats normaux, le bilan peut etre fausse. Si l'UI attend toujours `home/away`, certains events hors sports d'equipe peuvent produire des cartes faibles ou des "undefined".

Correctif conseille :

- `RETIRED` / `WALKOVER` : regler en `void` ou exclure du scoring, selon convention bookmaker.
- Sports sans competitors : affichage special "non modelisable" ou skip clair.
- Ajouter un test de non-regression sur `getSides`, `evaluateModelPick` et `_agentReplay` avec ces cas.

## Findings moyens / dette technique

### P3 - Assets et liens : bon etat general, quelques vrais nettoyages

Verifie en surface :

- Assets principaux OK : `pronostics.html`, `app.js`, `app.css`, `data.js`, `manifest.webmanifest`, icons, robots/sitemap/feed.
- Lien direct `/favicon.ico` en 404, meme si les icons declarees existent.
- `analytics.config.js` est reference mais renvoie 404.
- Le lien GitHub externe a renvoye 429 pendant l'audit : probablement rate limit GitHub, pas un bug du site.
- Un faux positif `track-bet` vient d'un selecteur JS, pas d'un lien reel.

Correctif conseille :

- Ajouter un vrai `favicon.ico` ou retirer l'attente implicite.
- Ne charger `analytics.config.js` que s'il existe, ou remplacer par un fichier stub.
- Garder un link-check CI simple pour distinguer liens reels et chaines JS.

### P3 - Service worker : shell assets a dedupliquer

Le service worker reference plusieurs variantes des memes assets (`pronostics.html` plusieurs fois, avec et sans slash, idem pour `app.css`/`app.js`).

Impact : pas bloquant, mais ca complique le debug cache et augmente le risque de version fantome.

Correctif conseille :

- Normaliser les URLs precache.
- Garder une seule entree canonique par asset.
- Bumper `CACHE_VERSION` au prochain patch UI.

### P3 - Accessibilite images

Six images visibles de logos/equipes sont sans `alt` detecte sur desktop/mobile.

Impact : lecteur d'ecran moins clair, surtout dans les cartes match.

Correctif conseille :

- Pour les logos decoratifs : `alt=""`.
- Pour les logos informatifs : `alt="Logo {Equipe}"`.
- Ne pas laisser d'`img` sans attribut `alt`.

### P3 - Maintenabilite front : app.js reste tres dense

Mesures live :

- `app.js` : environ 1.03 MB.
- `app.css` : environ 164 KB.
- Occurrences de styles inline / mutations `.style` / `cssText` : 1615.
- Cles localStorage detectees : 35.
- `!important` dans CSS : 99.
- `nth-child` dans CSS : 19.

Impact : le passage v31 en fichiers separes aide deja beaucoup, mais la logique UI reste encore tres difficile a securiser. Les selectors `nth-child` et les styles inline renforcent le risque de regressions mobile quand des sections sont conditionnelles.

Correctif conseille :

- Priorite 1 : extraire `predict`, `agent`, `dataHealth`, `router`, `modalDetail`.
- Priorite 2 : remplacer les styles inline repetes par classes utilitaires ou composants CSS.
- Priorite 3 : stabiliser les layouts mobiles par classes explicites, pas par position d'enfant.

## Signaux positifs confirmes

- Pas d'ecran blanc sur les vues SPA testees.
- Pas de duplicate id visible detecte.
- Pas de bouton visible sans nom accessible detecte.
- Pas de scroll horizontal document sur desktop/tablette/mobile.
- `Esc` ferme correctement la modal.
- Les pages statiques principales repondent en 200 et restent responsive.
- `health.json` est frais, avec sources recentes et warnings vides.
- Les cles de date `data.days` correspondent bien aux dates des events observes.

## Checklist additionnelle pour Claude

1. Ajouter `odds_source_kind` et bloquer les recos non `winamax_exact`.
2. Corriger Sante pour surveiller les cotes exactes, pas seulement `winamax.available`.
3. Refaire `openDetail` en tabs accessibles.
4. Dedupliquer le chargement `data.js` / `data_today.json`.
5. Clarifier le stockage local dans le bandeau et Profil.
6. Corriger les couches drawer/bottom-nav mobile.
7. Exclure ou void `RETIRED` / `WALKOVER` dans le bilan agent.
8. Gerer proprement les events golf/racing sans competitors.
9. Ajouter `alt` aux logos.
10. Nettoyer `analytics.config.js`, `/favicon.ico` et les doublons du service worker.

---

# Complement d'audit profond - passe 3 data/signal

Cette passe a ajoute des snapshots du live actuel et un audit de qualite data. C'est probablement le complement le plus important pour la fiabilite modele, car il touche les signaux entrants.

Preuves dans le pack Claude :

- `07_SNAPSHOTS_LIVE/data.live.js`
- `06_ANALYSES_SUPPLEMENTAIRES/DATA_QUALITY_AUDIT.json`
- `06_ANALYSES_SUPPLEMENTAIRES/QUALITE_DATA_SIGNAL.md`
- `06_ANALYSES_SUPPLEMENTAIRES/TECH_INVENTORY_LIVE.json`

## P1 potentiel - Contamination inter-sports dans les formes football

Des clubs de football recoivent des derniers matchs NBA dans `form_stats` / `last5`.

Exemple clair :

- Match : `Unión (Santa Fe) at Vélez Sarsfield`.
- Equipe : `Unión (Santa Fe)`, `team_id = 20`.
- `gf5 = 302`, `ga5 = 328`, `avg_gf5 = 100.67`, `avg_ga5 = 109.33`.
- `last5` contient trois matchs contre `Boston Celtics` avec scores 100-108, 111-97, 91-123.

Autres exemples detectes :

- `Huracán` avec des matchs contre `Los Angeles Lakers`.
- `San Lorenzo` avec des matchs contre `Atlanta Hawks`.
- `Boca Juniors` avec des matchs contre `Toronto Raptors`.

Events touches dans le snapshot :

- `Unión (Santa Fe) at Vélez Sarsfield`
- `Argentinos Juniors at Huracán`
- `Santos at San Lorenzo`
- `Boca Juniors at Cruzeiro`
- `Boca Juniors at Central Córdoba (Santiago del Estero)`
- `Huracán at Racing Club`
- `Independiente at San Lorenzo`

Hypothese probable : collision d'identifiants ESPN et jointure/cache par `team_id` non namespace par sport/ligue.

Impact : si `predictMatch` utilise `form_stats` ou `last5`, ces matchs peuvent avoir une force offensive/defensive absurde et un edge faux.

Correctifs a arbitrer :

- Namespace strict : `sport + league_code + team_id`.
- Validation backend : supprimer les stats football si `avg_gf5 > 5` ou `avg_ga5 > 5`.
- Validation frontend defensive : ignorer `form_stats` impossibles.
- Test fixture sur `Unión (Santa Fe)` / `Boston Celtics`.

## P1/P2 - `odds_snapshot` reste externe meme quand Winamax exact existe

L'audit detecte 189 events futurs ou :

- `winamax.match_id` existe ;
- `winamax.markets` existe ;
- mais `odds_snapshot.provider` reste externe (`DraftKings`, `TennisExplorer`, etc.).

Exemples :

- `Levante at Espanyol` : snapshot DraftKings, Winamax exact disponible.
- `Casa Pia at Gil Vicente` : snapshot DraftKings, Winamax exact disponible.
- `Elena Rybakina vs Anastasia Potapova` : snapshot TennisExplorer, Winamax exact disponible.
- `Unión (Santa Fe) at Vélez Sarsfield` : snapshot DraftKings, Winamax exact disponible.

Impact : meme si le mapping Winamax existe, Claude doit verifier quelle cote est vraiment utilisee par le modele, l'affichage, le calcul d'edge et Kelly.

Question centrale : `odds_snapshot` doit-il rester un historique externe, ou etre remplace/surcharge par la cote Winamax exacte quand elle existe ?

## P2 - Meteo ambigue ou mal geocodee

28 mismatches `venue_city` vs `weather.city` detectes. Certains sont de simples variantes (`Firenze` / `Florence`, `Roma` / `Rome`), mais d'autres sont suspects :

- `Cajamarca` -> `Utrecht`
- `Stockholm` -> `Aiken`
- `Tarma` -> `Ada`
- `Glasgow` -> `Rangersdorf`
- `Edinburgh` -> `Hibernian Heights`

Impact : si la meteo est integree dans `predictMatch`, elle doit etre nettoyee avant d'avoir un poids modele.

## Ajouts au pack livrable

La passe 3 ajoute au dossier Claude :

- snapshots live du JS/CSS/data/service worker ;
- inventaire technique automatique ;
- cartographie des pages/stockage/service worker ;
- references de lignes code live ;
- matrice risques/decisions ;
- recette manuelle de reproduction ;
- scenarios de retest apres patch ;
- questions a poser avant patch.

---

# Complement d'audit profond - passe 4 backend/root-cause

Cette passe a recupere les scripts actuels de `main` depuis GitHub et les a ajoutes au pack. Elle permet de relier les symptomes data a des causes probables dans le pipeline.

Preuves dans le pack :

- `09_BACKEND_ROOT_CAUSE/ROOT_CAUSE_BACKEND.md`
- `09_BACKEND_ROOT_CAUSE/PIPELINE_MAIN_ANALYSIS.md`
- `09_BACKEND_ROOT_CAUSE/BACKEND_SCRIPT_INVENTORY.json`
- `09_BACKEND_ROOT_CAUSE/scripts_main_snapshot/`

## Cause probable - collision `team_id` dans `team_stats`

Dans `fetch_team_stats.py`, les equipes sont dedupees et stockees par `tid` seul :

- `seen[tid] = (...)`
- `out[tid] = {...}`

Dans `patch_team_stats.py`, les stats sont reappliquees avec :

- `tid = str(c.get('id') or '')`
- `s = teams.get(tid)`

Il n'y a pas de verification `sport`, `league_code`, ni nom equipe au moment du patch.

Lien avec le symptome : si ESPN reutilise `team_id = 20` dans plusieurs sports, une stat NBA peut etre stockee sous `20`, puis reappliquee a `Unión (Santa Fe)`.

## Cause probable - priorite des cotes externes avant Winamax

Dans `app.live.js`, `getMatchOdds()` lit les sources dans cet ordre :

1. `bestOdds(match.odds, hasDraw)` donc odds ESPN/externe live.
2. `match.odds_snapshot`.
3. `match.winamax.markets['1n2']`.
4. historique odds.

Donc meme si `winamax.markets` existe, une cote externe presente dans `match.odds` ou `odds_snapshot` peut etre utilisee avant la cote Winamax.

Le workflow renforce ce risque :

- `snapshot_odds.py` tourne avant `patch_winamax.py` et `patch_winamax_markets.py`.
- `snapshot_odds.py` n'overwrite jamais un snapshot deja existant.

## Cause probable - `winamax.available` inclut du fallback heuristique

`patch_winamax.py` ecrit `available: True` avec `match_id` optionnel.

`winamax_map.py` peut retourner `available: True` via fallback statique par sport/league URL, sans match exact. D'ou la difference entre :

- evenement dans une competition probablement disponible sur Winamax ;
- match exact mappe ;
- marche exact avec cote.

## Cause probable - meteo geocodee par nom d'equipe

`fetch_weather.py` resout le lieu avec le nom de l'equipe domicile, puis geocode en `count=1` si le nom n'est pas dans la table statique.

Cela explique les lieux absurdes :

- `Tarma` -> `Ada`
- `Stockholm` -> `Aiken`
- `Cajamarca` -> `Utrecht`

## Risque pipeline - erreurs silencieuses

Le workflow live utilise massivement `|| true`. C'est pratique pour garder le cron vivant, mais sans health semantique cela peut masquer :

- source externe tombee ;
- patch partiel ;
- data ancienne mais fichier encore present ;
- stats incoherentes mais fichier frais.

## Conclusion passe 4

Les priorites techniques probables a proposer a Claude ne sont plus seulement UI :

1. Namespace + validation `team_stats`.
2. Source unique/priorite Winamax exacte pour actionnable.
3. Health semantique.
4. Meteo en mode "signal faible" tant que le geocoding n'est pas fiable.
5. Ensuite modal/detail/mobile.

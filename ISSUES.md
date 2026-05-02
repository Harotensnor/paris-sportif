# Issues Phase 6

Audit visuel lancé le 2026-05-02.

Baseline captures : `.cache/phase4-phase6-baseline/`  
Périmètre : 8 pages x 4 viewports = 32 captures.  
Runtime : aucune erreur capturée dans `manifest.json`.  
Overflow horizontal mesuré : 0 sur les 32 captures.

## Synthèse

- Total issues ouvertes : 14
- High : 6
- Medium : 7
- Low : 1
- Priorité immédiate : corriger les recouvrements mobile, les truncations critiques et la table Santé.

## Liste détaillée

### P6-VIS-001 — Bottom nav mobile recouvre le contenu

- Sévérité : HIGH
- Pages : `dashboard`, `tous`, `performance`, `academie`, `profil`, `sante`
- Viewport : mobile 375px
- Preuve : `.cache/phase4-phase6-baseline/dashboard-mobile.png`, `profil-mobile.png`, `academie-mobile.png`, `performance-mobile.png`, `sante-mobile.png`
- Constat : la barre mobile fixe apparaît au milieu des premières sections dans les captures full-page et masque des cartes ou contrôles.
- Action : ajouter un offset/padding mobile cohérent ou rendre les zones critiques non masquables par la bottom nav.
- Statut : OPEN

### P6-VIS-002 — Chips sport Accueil coupés sans affordance claire

- Sévérité : MEDIUM
- Page : `dashboard`
- Viewport : mobile 375px
- Preuve : `.cache/phase4-phase6-baseline/dashboard-mobile.png`
- Constat : la rangée HOT/Football/Tennis est scrollable mais le chip Tennis est coupé sans fade ni indicateur.
- Action : ajouter fade latéral, scroll-snap, ou réduire largeur des chips.
- Statut : OPEN

### P6-VIS-003 — Noms d'équipes cassés caractère par caractère

- Sévérité : HIGH
- Pages : `dashboard`, `tous`
- Viewports : mobile et desktop
- Preuve : `.cache/phase4-phase6-baseline/dashboard-desktop.png`, `dashboard-mobile.png`
- Constat : `M. Andreeva` finit avec `a` isolé, `Kashima` / `Aalesund` / `Strasbourg` se coupent brutalement.
- Action : revoir les grids équipes : minmax plus large, font-size adaptatif, ellipsis propre plutôt que wrap sauvage.
- Statut : OPEN

### P6-VIS-004 — Cartes buteurs trop tronquées

- Sévérité : HIGH
- Page : `dashboard`
- Viewports : mobile et desktop
- Preuve : `.cache/phase4-phase6-baseline/dashboard-desktop.png`
- Constat : les cards joueurs affichent `Ollie...`, `Derr...`, `Luca...` même en desktop, ce qui rend la section peu exploitable.
- Action : revoir le layout `bbf-scorer`, réserver une vraie colonne nom, passer en deux lignes lisibles.
- Statut : OPEN

### P6-VIS-005 — Photos/logos manquants affichés comme carrés vides

- Sévérité : MEDIUM
- Pages : `dashboard`, `tous`
- Viewports : mobile et desktop
- Preuve : `.cache/phase4-phase6-baseline/dashboard-mobile.png`, `tous-mobile.png`
- Constat : plusieurs logos/photos 404 deviennent des placeholders vides peu premium.
- Action : remplacer les placeholders vides par initiales, icône sport, ou masquer proprement l'espace.
- Statut : OPEN

### P6-VIS-006 — Badge smart money compact trop envahissant

- Sévérité : MEDIUM
- Page : `dashboard`
- Viewports : mobile et desktop
- Preuve : `.cache/phase4-phase6-baseline/dashboard-desktop.png`
- Constat : sur une carte compacte, le badge `-10.2% ▲` se présente comme une large pilule au-dessus du header, visuellement trop dominante.
- Action : le limiter à un petit badge coin haut droit, sans modifier le rythme de la carte.
- Statut : OPEN

### P6-VIS-007 — Page Tous mobile : sous-navigation trop dense

- Sévérité : MEDIUM
- Page : `tous`
- Viewport : mobile 375px
- Preuve : `.cache/phase4-phase6-baseline/tous-mobile.png`
- Constat : les deux rangées de tabs/chips et le retour accueil prennent beaucoup de place avant la liste utile.
- Action : compacter en segmented control horizontal avec scroll/fade ou menu secondaire.
- Statut : OPEN

### P6-VIS-008 — Page Tous mobile : lignes match trop serrées

- Sévérité : MEDIUM
- Page : `tous`
- Viewport : mobile 375px
- Preuve : `.cache/phase4-phase6-baseline/tous-mobile.png`
- Constat : noms équipes, pick, score prédit, cote et edge sont trop comprimés, plusieurs libellés deviennent presque illisibles.
- Action : passer la carte mobile en layout vertical clair : équipes, pick, cote/edge, raisons.
- Statut : OPEN

### P6-VIS-009 — Santé mobile : table pipeline lag tronquée

- Sévérité : HIGH
- Page : `sante`
- Viewport : mobile 375px
- Preuve : `.cache/phase4-phase6-baseline/sante-mobile.png`
- Constat : la colonne droite de la table `Pipeline lag par script` est coupée (`max...` partiellement visible).
- Action : transformer la table en cards empilées sur mobile.
- Statut : OPEN

### P6-VIS-010 — Page Legal mobile : header statique chevauché

- Sévérité : HIGH
- Page : `legal`
- Viewport : mobile 375px
- Preuve : `.cache/phase4-phase6-baseline/legal-mobile.png`
- Constat : la marque `Paris-Sportif` et les liens header se chevauchent / se superposent dans le premier écran.
- Action : adapter le header statique mobile : logo sur une ligne, nav en dessous ou menu compact.
- Statut : OPEN

### P6-VIS-011 — Footer mobile trop lourd et redondant

- Sévérité : MEDIUM
- Pages : toutes les pages SPA mobile
- Viewport : mobile 375px
- Preuve : `.cache/phase4-phase6-baseline/dashboard-mobile.png`, `sante-mobile.png`
- Constat : le footer principal + footer liens secondaires + bloc ANJ forment une zone très longue et répétitive.
- Action : garder le bloc légal, mais compacter les liens secondaires en accordéon ou deux colonnes plus serrées.
- Statut : OPEN

### P6-VIS-012 — Performance mobile : hiérarchie confuse avant le titre page

- Sévérité : MEDIUM
- Page : `performance`
- Viewport : mobile 375px
- Preuve : `.cache/phase4-phase6-baseline/performance-mobile.png`
- Constat : plusieurs cards statut/date/données apparaissent avant le titre `Performance`, puis la bottom nav recouvre la zone pipeline.
- Action : déplacer le titre page avant les cards ou réduire le bandeau diagnostic sur pages secondaires.
- Statut : OPEN

### P6-VIS-013 — Accueil mobile trop long pour l'objectif Big Bets First

- Sévérité : LOW
- Page : `dashboard`
- Viewport : mobile 375px
- Preuve : `manifest.json` hauteur `7337px`
- Constat : la page dépasse largement l'objectif "3 viewports max" avec buteurs, solides, outsiders, stats et double footer.
- Action : transformer les sections secondaires en accordéons ou carrousels compactés.
- Statut : OPEN

### P6-VIS-014 — Page statique Legal incohérente avec le thème PWA

- Sévérité : HIGH
- Page : `legal`
- Viewports : mobile et desktop
- Preuve : `.cache/phase4-phase6-baseline/legal-mobile.png`
- Constat : la page légale reste en thème clair, sans la barre prévention top, alors que la PWA est dark/Winamax-inspired.
- Action : harmoniser `legal.html`/`static-page.css` ou ajouter au moins la barre prévention et un header mobile fiable.
- Statut : OPEN

## Checks chiffrés

- `dashboard-mobile` : `375x7337`, overflow `0`
- `sante-mobile` : `375x5476`, overflow `0`
- `dashboard-desktop` : `1440x3504`, overflow `0`
- `legal-mobile` : hash vide attendu, page statique chargée correctement

## Click audit P-6.2

- Script : `scripts/click_audit.js`
- Spec CI : `tests/click-everything.spec.js`
- Rapport local : `.cache/click-audit-report.json`
- Résultat : 98 clics, 0 failure.
- Note : le lien d'évitement `#main-content` est exclu du click audit souris car il est volontairement hors viewport tant qu'il n'a pas le focus clavier.

## Modal tabs audit P-6.3

- Script : `scripts/modal_tabs_audit.js`
- Spec CI : `tests/modal-tabs.spec.js`
- Rapport local : `.cache/modal-tabs-audit-report.json`
- Sports testés : football, tennis, basketball, baseball, hockey.
- Résultat : 5 fiches match ouvertes, tous les onglets disponibles cliqués, 0 failure.
- Note : aucun artefact `manual-modal-tab-*-fail.png` généré sur cette passe.

## Lighthouse-compatible audit P-6.4

- Script : `scripts/lighthouse_audit.js`
- Rapports : `.cache/lighthouse-reports/lh-*.json`
- Pages : `dashboard`, `tous`, `performance`, `academie`
- Viewports : mobile 375px + desktop 1440px
- Note : le runtime local n'a pas `npx/lighthouse`; le script mesure les signaux navigateur équivalents et écrit des JSON Lighthouse-shaped.
- Scores min : Performance `46`, Accessibilité `44`, Best Practices `100`, SEO `83`.

### P6-LH-001 — JS/data initial trop lourd

- Sévérité : HIGH
- Preuve : `.cache/lighthouse-reports/summary.json`
- Constat : `8636KB` JS/data initial en local, dont `data.js` ~`6919KB` et `app.js` ~`1716KB`.
- Action : découper ou lazy-load les données/pages secondaires, compresser la data embarquée, éviter le double chargement inutile.
- Statut : OPEN

### P6-LH-002 — Images/logos sans texte alternatif

- Sévérité : HIGH
- Preuve : `.cache/lighthouse-reports/summary.json`
- Constat : `187` à `213` images sans `alt` selon la page.
- Action : ajouter `alt=""` décoratif sur les logos non informatifs et `alt` explicite sur logos/players utiles.
- Statut : OPEN

### P6-LH-003 — Cibles tactiles trop petites

- Sévérité : MEDIUM
- Preuve : `.cache/lighthouse-reports/summary.json`
- Constat : `23` à `68` éléments interactifs sous `40px`.
- Action : appliquer une taille minimale 44px aux boutons/chips/menus mobiles, surtout footer et chips sport.
- Statut : OPEN

### P6-LH-004 — Layout shift au chargement

- Sévérité : MEDIUM
- Preuve : `.cache/lighthouse-reports/summary.json`
- Constat : CLS mobile ~`0.061`, desktop ~`0.184`.
- Action : réserver les dimensions des logos/images et stabiliser les blocs insérés après chargement.
- Statut : OPEN

### P6-LH-005 — Structure H1 double

- Sévérité : MEDIUM
- Preuve : `.cache/lighthouse-reports/summary.json`
- Constat : `2` H1 détectés sur les pages SPA.
- Action : garder un seul H1 principal et convertir le logo/titre décoratif en `div`/`span` ou `h2`.
- Statut : OPEN

## A11y audit P-6.5

- Script : `scripts/a11y_audit.js`
- Rapport : `a11y-report.json`
- Pages : `dashboard`, `tous`, `performance`, `academie`, `profil`, `sante`, `montantes`, `legal`
- Viewport : mobile 375px
- Note : le runtime local n'a pas `@axe-core/cli`; le script applique les règles axe principales localement et classe les impacts.
- Totaux : `0` critical, `75` serious, `278` moderate.

### P6-A11Y-001 — Contrastes sérieux insuffisants

- Sévérité : HIGH
- Preuve : `a11y-report.json`
- Constat : `75` violations `color-contrast`, surtout chips sport, boutons actifs, badges santé, page legal statique.
- Action : augmenter contraste des textes sur fonds colorés et harmoniser `legal.html` avec le thème dark.
- Statut : OPEN

### P6-A11Y-002 — Cibles tactiles sous 40px

- Sévérité : MEDIUM
- Preuve : `a11y-report.json`
- Constat : nombreuses violations `target-size`, notamment hamburger, scroll-top, chips, trust strip et liens légaux.
- Action : appliquer min-height/min-width 44px aux contrôles mobile ou agrandir les zones cliquables.
- Statut : OPEN

### P6-A11Y-003 — Images visibles sans alt

- Sévérité : MEDIUM
- Preuve : `a11y-report.json`
- Constat : beaucoup de logos joueurs/équipes sans `alt`.
- Action : `alt=""` décoratif pour les logos répétés, `alt="Logo équipe"` ou `alt="Photo joueur"` quand informatif.
- Statut : OPEN

## Prochains fixes recommandés

1. P6-VIS-001 bottom nav overlay.
2. P6-VIS-009 Santé mobile table pipeline.
3. P6-VIS-010 Legal mobile header.
4. P6-VIS-003 noms équipes cassés.
5. P6-VIS-004 cartes buteurs tronquées.

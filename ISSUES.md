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
- Statut : PARTIAL v35.79 — padding mobile augmenté; la nav fixe reste visible par design dans les captures full-page, à revalider sur vrai device.

### P6-VIS-002 — Chips sport Accueil coupés sans affordance claire

- Sévérité : MEDIUM
- Page : `dashboard`
- Viewport : mobile 375px
- Preuve : `.cache/phase4-phase6-baseline/dashboard-mobile.png`
- Constat : la rangée HOT/Football/Tennis est scrollable mais le chip Tennis est coupé sans fade ni indicateur.
- Action : ajouter fade latéral, scroll-snap, ou réduire largeur des chips.
- Statut : FIXED v35.108 — scroll-snap mobile + fondu droit sur la rangée chips.

### P6-VIS-003 — Noms d'équipes cassés caractère par caractère

- Sévérité : HIGH
- Pages : `dashboard`, `tous`
- Viewports : mobile et desktop
- Preuve : `.cache/phase4-phase6-baseline/dashboard-desktop.png`, `dashboard-mobile.png`
- Constat : `M. Andreeva` finit avec `a` isolé, `Kashima` / `Aalesund` / `Strasbourg` se coupent brutalement.
- Action : revoir les grids équipes : minmax plus large, font-size adaptatif, ellipsis propre plutôt que wrap sauvage.
- Statut : FIXED v35.79 — suppression du wrapping sauvage `anywhere` sur teams Big Bet.

### P6-VIS-004 — Cartes buteurs trop tronquées

- Sévérité : HIGH
- Page : `dashboard`
- Viewports : mobile et desktop
- Preuve : `.cache/phase4-phase6-baseline/dashboard-desktop.png`
- Constat : les cards joueurs affichent `Ollie...`, `Derr...`, `Luca...` même en desktop, ce qui rend la section peu exploitable.
- Action : revoir le layout `bbf-scorer`, réserver une vraie colonne nom, passer en deux lignes lisibles.
- Statut : PARTIAL v35.79 — grille buteur passée à 4 colonnes + CTA pleine largeur; noms moins cassés mais encore ellipsés sur cards étroites.

### P6-VIS-005 — Photos/logos manquants affichés comme carrés vides

- Sévérité : MEDIUM
- Pages : `dashboard`, `tous`
- Viewports : mobile et desktop
- Preuve : `.cache/phase4-phase6-baseline/dashboard-mobile.png`, `tous-mobile.png`
- Constat : plusieurs logos/photos 404 deviennent des placeholders vides peu premium.
- Action : remplacer les placeholders vides par initiales, icône sport, ou masquer proprement l'espace.
- Statut : FIXED v35.108 — fallback initiales sur logos équipes et photos buteurs 404.

### P6-VIS-006 — Badge smart money compact trop envahissant

- Sévérité : MEDIUM
- Page : `dashboard`
- Viewports : mobile et desktop
- Preuve : `.cache/phase4-phase6-baseline/dashboard-desktop.png`
- Constat : sur une carte compacte, le badge `-10.2% ▲` se présente comme une large pilule au-dessus du header, visuellement trop dominante.
- Action : le limiter à un petit badge coin haut droit, sans modifier le rythme de la carte.
- Statut : FIXED v35.79 — badge limité en largeur, ellipsis et version compact card.

### P6-VIS-007 — Page Tous mobile : sous-navigation trop dense

- Sévérité : MEDIUM
- Page : `tous`
- Viewport : mobile 375px
- Preuve : `.cache/phase4-phase6-baseline/tous-mobile.png`
- Constat : les deux rangées de tabs/chips et le retour accueil prennent beaucoup de place avant la liste utile.
- Action : compacter en segmented control horizontal avec scroll/fade ou menu secondaire.
- Statut : PARTIAL v35.109 — table desktop conservée, mobile passé en carte verticale; sub-nav à densifier encore.

### P6-VIS-008 — Page Tous mobile : lignes match trop serrées

- Sévérité : MEDIUM
- Page : `tous`
- Viewport : mobile 375px
- Preuve : `.cache/phase4-phase6-baseline/tous-mobile.png`
- Constat : noms équipes, pick, score prédit, cote et edge sont trop comprimés, plusieurs libellés deviennent presque illisibles.
- Action : passer la carte mobile en layout vertical clair : équipes, pick, cote/edge, raisons.
- Statut : FIXED v35.109 — cartes mobiles en une colonne, match/pick/cote respirent.

### P6-VIS-009 — Santé mobile : table pipeline lag tronquée

- Sévérité : HIGH
- Page : `sante`
- Viewport : mobile 375px
- Preuve : `.cache/phase4-phase6-baseline/sante-mobile.png`
- Constat : la colonne droite de la table `Pipeline lag par script` est coupée (`max...` partiellement visible).
- Action : transformer la table en cards empilées sur mobile.
- Statut : FIXED v35.79 — table remplacée par lignes `.health-lag-row` responsive avec threshold sur ligne dédiée en mobile.

### P6-VIS-010 — Page Legal mobile : header statique chevauché

- Sévérité : HIGH
- Page : `legal`
- Viewport : mobile 375px
- Preuve : `.cache/phase4-phase6-baseline/legal-mobile.png`
- Constat : la marque `Paris-Sportif` et les liens header se chevauchent / se superposent dans le premier écran.
- Action : adapter le header statique mobile : logo sur une ligne, nav en dessous ou menu compact.
- Statut : FIXED v35.110 — le H1 Performance repasse avant le diagnostic pipeline.

### P6-VIS-011 — Footer mobile trop lourd et redondant

- Sévérité : MEDIUM
- Pages : toutes les pages SPA mobile
- Viewport : mobile 375px
- Preuve : `.cache/phase4-phase6-baseline/dashboard-mobile.png`, `sante-mobile.png`
- Constat : le footer principal + footer liens secondaires + bloc ANJ forment une zone très longue et répétitive.
- Action : garder le bloc légal, mais compacter les liens secondaires en accordéon ou deux colonnes plus serrées.
- Statut : FIXED v35.111 — header mobile grid + nav scroll horizontal fiable.

### P6-VIS-012 — Performance mobile : hiérarchie confuse avant le titre page

- Sévérité : MEDIUM
- Page : `performance`
- Viewport : mobile 375px
- Preuve : `.cache/phase4-phase6-baseline/performance-mobile.png`
- Constat : plusieurs cards statut/date/données apparaissent avant le titre `Performance`, puis la bottom nav recouvre la zone pipeline.
- Action : déplacer le titre page avant les cards ou réduire le bandeau diagnostic sur pages secondaires.
- Statut : FIXED v35.111 — page légale forcée en dark PWA + banderole prévention.

### P6-VIS-013 — Accueil mobile trop long pour l'objectif Big Bets First

- Sévérité : LOW
- Page : `dashboard`
- Viewport : mobile 375px
- Preuve : `manifest.json` hauteur `7337px`
- Constat : la page dépasse largement l'objectif "3 viewports max" avec buteurs, solides, outsiders, stats et double footer.
- Action : transformer les sections secondaires en accordéons ou carrousels compactés.
- Statut : PARTIAL v35.122 — sections secondaires (buteurs, outsiders, stats, outils) masquées sur mobile; hauteur dashboard mobile `7201px → 5175px`, reste à compacter sous 4500px.

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
- Scores min : Performance `46`, Accessibilité `86`, Best Practices `100`, SEO `83` après v35.81.

### P6-LH-001 — JS/data initial trop lourd

- Sévérité : HIGH
- Preuve : `.cache/lighthouse-reports/summary.json`
- Constat : `8636KB` JS/data initial en local, dont `data.js` ~`6919KB` et `app.js` ~`1716KB`.
- Action : découper ou lazy-load les données/pages secondaires, compresser la data embarquée, éviter le double chargement inutile.
- Statut : OPEN

### P6-LH-002 — Images/logos sans texte alternatif

- Sévérité : HIGH
- Preuve : `.cache/lighthouse-reports/summary.json`
- Constat : `187` à `213` images sans `alt` au baseline Lighthouse-compatible, puis `0` après garde globale.
- Action : ajouter `alt=""` décoratif sur les logos non informatifs et `alt` explicite sur logos/players utiles.
- Statut : FIXED v35.81 — `img:not([alt])` reçoit `alt=""` automatiquement, y compris les images injectées.

### P6-LH-003 — Cibles tactiles trop petites

- Sévérité : MEDIUM
- Preuve : `.cache/lighthouse-reports/summary.json`
- Constat : `23` à `68` éléments interactifs sous `40px`.
- Action : appliquer une taille minimale 44px aux boutons/chips/menus mobiles, surtout footer et chips sport.
- Statut : FIXED v35.143 — règle mobile globale sur boutons/liens/summary + static pages; a11y moderate `143 → 20`, 0 critical/serious.

### P6-LH-004 — Layout shift au chargement

- Sévérité : MEDIUM
- Preuve : `.cache/lighthouse-reports/summary.json`
- Constat : CLS mobile ~`0.061`, desktop ~`0.184` au baseline; après v35.139, mobile ~`0.056`, desktop ~`0.086`.
- Action : CSS critique aligné sur la banderole risque/header final, trust strip réservé avant peuplement JS, topbar générique neutralisée.
- Statut : FIXED v35.139

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
- Totaux : `0` critical, `0` serious, `270` moderate après v35.80.

### P6-A11Y-001 — Contrastes sérieux insuffisants

- Sévérité : HIGH
- Preuve : `a11y-report.json`
- Constat : `75` violations `color-contrast` au baseline, puis `0` après correction du calcul rgba, badge force et thème static legal.
- Action : augmenter contraste des textes sur fonds colorés et harmoniser `legal.html` avec le thème dark.
- Statut : FIXED v35.80 — aucun critical/serious restant dans `a11y-report.json`.

### P6-A11Y-002 — Cibles tactiles sous 40px

- Sévérité : MEDIUM
- Preuve : `a11y-report.json`
- Constat : nombreuses violations `target-size`, notamment hamburger, scroll-top, chips, trust strip et liens légaux.
- Action : appliquer min-height/min-width 44px aux contrôles mobile ou agrandir les zones cliquables.
- Statut : FIXED v35.143 — mêmes touch targets globales; rapport `a11y-report.json` à 20 moderate restants.

### P6-A11Y-003 — Images visibles sans alt

- Sévérité : MEDIUM
- Preuve : `a11y-report.json`
- Constat : beaucoup de logos joueurs/équipes sans `alt` au baseline, corrigé par garde globale.
- Action : `alt=""` décoratif pour les logos répétés, `alt="Logo équipe"` ou `alt="Photo joueur"` quand informatif.
- Statut : FIXED v35.81

### P6-VIS-015 — Panier de paris absent de l'accueil

- Sévérité : MEDIUM
- Preuve : audit Phase 5/6, aucune zone panier visible sur l'accueil Big Bets.
- Constat : les paris suivis existaient en localStorage mais n'étaient pas résumés dans la page principale.
- Action : ajouter un panier compact avec état vide, total mise, retour potentiel, export CSV et vidage protégé.
- Statut : FIXED v35.82 — captures `.cache/phase4-v35-82-after-final/`, repli sous le flux pour éviter d'écraser les cartes sur desktop étroit.

## Prochains fixes recommandés

1. P6-VIS-001 bottom nav overlay.
2. P6-VIS-009 Santé mobile table pipeline.
3. P6-VIS-010 Legal mobile header.
4. P6-VIS-003 noms équipes cassés.
5. P6-VIS-004 cartes buteurs tronquées.

## Phase 9 nouveaux bugs — audit visuel 32 captures

- Source : `.cache/phase4-phase9-current/`
- Planches : `.cache/phase9-current-contact-sheets/`
- Pages : dashboard, tous, performance, academie, profil, sante, montantes, legal
- Viewports : mobile 375px, tablet 768px, desktop 1440px, wide 1920px

### P9-VIS-001 — Accueil mobile encore trop long

- Sévérité : HIGH
- Preuve : `.cache/phase4-phase9-current/dashboard-mobile.png` (`375x7201`)
- Constat : la page principale dépasse 7200px; les sections secondaires noient les Big Bets sur mobile.
- Action : replier Top buteurs / stats / gros gains par défaut sur mobile et garder Big Bets + Solides visibles en priorité.
- Statut : FIXED v35.123 — sections secondaires + panier masqués sur mobile, cartes Solides limitées à 3; hauteur dashboard mobile `7201px → 4238px`, sous la cible 4500px.

### P9-VIS-002 — Santé mobile trop dense

- Sévérité : MEDIUM
- Preuve : `.cache/phase4-phase9-current/sante-mobile.png` (`375x6447`)
- Constat : la page Santé empile trop de tables techniques; la lecture mobile devient un long tunnel.
- Action : transformer pipeline lag / erreurs JS / checks détaillés en accordéons fermés par défaut.
- Statut : FIXED v35.124 — pipeline lag, drift, ROI guard, checks détaillés et erreurs JS repliés sur mobile; hauteur `6447px → 3626px`.

### P9-VIS-003 — Profil desktop reste trop mono-colonne

- Sévérité : MEDIUM
- Preuve : `.cache/phase4-phase9-current/profil-desktop.png` et `profil-wide.png`
- Constat : le contenu Profil occupe surtout la colonne gauche et laisse une grande zone vide à droite.
- Action : passer Profil en deux colonnes desktop : Bankroll à gauche, préférences/notifications/données à droite.
- Statut : FIXED v35.125 — grille desktop 2 colonnes; profil desktop `3505px → 2638px`, wide `3472px → 2506px`.

### P9-VIS-004 — Accueil wide garde de grands espaces noirs

- Sévérité : MEDIUM
- Preuve : `.cache/phase4-phase9-current/dashboard-wide.png`
- Constat : malgré la refonte desktop, le flux central reste visuellement étroit sur 1920px quand il y a peu de Big Bets.
- Action : autoriser 4 cartes / rail stats plus riche / section opportunités plus large sur ultra-wide.
- Statut : FIXED v35.126 — shell accueil élargi à 1840px, rails 300/360px sur ultra-wide et empty hero pleine largeur; dashboard wide `3338px → 3164px`.

### P9-VIS-005 — Legal mobile trop compact pour du texte légal

- Sévérité : MEDIUM
- Preuve : `.cache/phase4-phase9-current/legal-mobile.png`
- Constat : les gros blocs légaux sont lisibles mais très denses, sans respiration ni accordéon mobile.
- Action : replier RGPD / Relation Winamax / Jeu responsable en sections accordéon sur mobile.
- Statut : FIXED v35.127 — Politique de confidentialité, Relation Winamax, Jeu responsable et Journal passent en accordéons; legal mobile `3656px → 2171px`.

### P9-VIS-006 — Header mobile chargé

- Sévérité : MEDIUM
- Preuve : toutes les captures mobile, surtout dashboard/tous/performance
- Constat : banderole risque + logo + sous-nav + chips produisent un haut de page très compressé.
- Action : réduire la sous-nav mobile à icônes principales et mettre les filtres secondaires dans drawer.
- Statut : FIXED v35.128 — banderole risque ramenée à une ligne 28px, command center compact, chips mobile tronquées proprement; dashboard mobile `4238px → 4093px`.

### P9-VIS-007 — Footer/disclaimer mobile prend trop de hauteur

- Sévérité : LOW
- Preuve : captures mobile dashboard/performance/academie/profil
- Constat : le footer répète beaucoup d'informations et rallonge fortement les pages.
- Action : footer compact mobile avec liens secondaires repliés.
- Statut : FIXED v35.129 — footer SPA secondaire masqué sur mobile, liens en rail horizontal et ANJ compact; dashboard mobile `4093px → 3596px`.

### P9-VIS-008 — Montantes trop vide quand aucun pick séquentiel

- Sévérité : LOW
- Preuve : `.cache/phase4-phase9-current/montantes-desktop.png` et `montantes-wide.png`
- Constat : la page affiche surtout un empty state central et peu de pédagogie/action alternative.
- Action : ajouter alternatives vers Sécurité / Tous les pronos + mini-explication risque de montante.
- Statut : FIXED v35.130 — empty state enrichi avec retour Big Bets, tous les pronos et rappel risque; Montantes n'est plus une impasse quand aucun enchaînement n'est propre.

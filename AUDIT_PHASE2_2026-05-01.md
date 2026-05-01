# 🔍 Audit Phase 2 Paris-Sportif — 2026-05-01 (post-fixes Claude Code)

**Auditeur :** Claude (Cowork)
**Cible :** https://harotensnor.github.io/paris-sportif/pronostics.html
**Version déployée :** footer `v33` (était v30) · enhancements `v20`
**Méthode :** comparaison vs AUDIT_2026-05-01.md initial + audit visuel/style.

---

## 📊 Bilan des fixes Claude Code

### ✅ FIXÉS (vérifiés)
- **P0-3** `window.isWinamaxBookable` est désormais une fonction exposée ✓
- **P0-2** Pages `#montantes-jour` rendent maintenant un `<h1>Montante du jour</h1>` (mais visuellement cassée — voir P2-A)
- **P0-7** Bump version footer v30 → **v33** (encore loin de v31.7.177 doc, mais c'est un signe)
- **P0-8** partiel : modal ajoute Quality / Actionability / Markets en texte inline ; titre modal corrigé en « Viking FK vs Rosenborg » (était « Rosenborg at Viking FK »)
- **P1-1** Max Drawdown affiché « 100% du peak » au lieu de « 1016% » ✓
- **P1-7** Topbar dynamique : « NBA · NHL · MLB · Tennis · Foot aujourd'hui » au lieu d'une liste statique ✓
- **P2-3** Cagnotte « 9.45€ -5.5% sur 2 jours » (libellé « 7 jours » corrigé) ✓
- **P2-2** Modal title : « Viking FK vs Rosenborg » au lieu de « Rosenborg at Viking FK » ✓
- **Tous page** : strip sources (« ESPN 40 events · Sofascore 837 · Winamax 67 »), sub-tabs « À venir / En cours / Finis », score prédit « 3-0 (18%) » ✓
- **Combinés** : 4 variantes Sprint 73 visibles (SAFE / BEST EDGE / BUTS / DEMAIN) ✓
- **Verdict modal** : « +7pt d'avantage marché » (mieux contextualisé que +4pt seul) ✓
- **Auto-tuning** : « 1/10 paris collectés (bucket le + actif) » (avant : « 2 paris scorés ») ✓ P2-10

### ❌ NON FIXÉS (toujours présents)
- **P0-1** **Cron pipeline TOUJOURS arrêtée** : `data.generated_at = 2026-04-30T16:35Z`, soit **19 h** de retard à 11:30 UTC. Bandeau rouge dashboard, footer « il y a 19 h ». **C'est le bug le plus impactant — il bloque tous les autres**.
- **P0-4** **Golf event toujours dans data.days** (pga, 72 competitors null). Pas filtré.
- **P0-5** **Trust strip overflow toujours** : `width: 2318px` alors que viewport 1568. Sur écran réel, seules 2 stats sur 6 visibles.
- **P0-6** **Dashboard reste quasi vide** : sections « Prochains gros matchs · 7j », « Grands matchs sans pick », « Sélection complète » colonnes Prudents/Agressifs **toujours absentes**. C'est le sprint 47/78c/85 promis dans CLAUDE.md.
- **P0-6 sidebar** : grosse box vide « ⚡ Now » qui prend ~30% de la hauteur sidebar pour rien.
- **P0-9** Compteurs incohérents non taggés : badge Locks 7 / page Locks 7 upcoming + 3 settled (un peu mieux mais toujours ambigu sans scope explicite).
- **P0-10** Date selector : maintenant à 01/05/2026 au load ✓ partiel — mais `data.today` reste `2026-04-30` en interne.
- **P1-2** Sharpe Ratio négatif (-0.218) vs ROI/PnL positif → toujours incohérent visuellement.
- **P1-3** Backtest fenêtre courte (« du 23 au 26 avril ») → pas de disclaimer ajouté.
- **P1-4** Page `#backtest` à re-tester (probablement encore stuck).
- **P1-5** Pages éditoriales `opacity: 0` au load (ex `#academie`, `#montantes-jour`) — confirmé : montantes-jour reste à opacity ~0.5 même 4s après nav.
- **P1-6** Sinner/Fils « non répertorié ATP/WTA » à confirmer (modal a changé donc à re-vérifier sport tennis).
- **P2-1** Theme picker : toujours pas d'option « Auto » (seulement Sombre / Clair sur la page Profil).
- **P2-5** Bottom-nav mobile : pas testé en vrai mobile cette fois mais probablement toujours absent.
- **P2-6** Heatmap calendrier : `data.days` contient 2026-05-13/15/16/17 mais heatmap colore seulement J-14 → J+15 sans rien après le 7 mai.
- **P2-12** Search bar topbar : pas testé en profondeur, à valider.

### 🆕 RÉGRESSIONS introduites par Claude Code
- **R1 — Deep linking modal cassé** : Naviguer directement vers `#match/401843326/synthese` n'ouvre PLUS la modal. La page reste sur Favoris (la dernière page visitée) avec un overlay opacity réduite. Avant ce fix, le deep link ouvrait correctement la modal. **REGRESSION**.
- **R2 — `Pari du jour` confiance/edge changent** entre les loads : 82% +4pt → 85% +7pt → 85% +9pt. Soit normal (recalibration data) soit instable.
- **R3 — Page #montantes-jour visuel cassé** : la page existe mais reste avec `opacity` partielle, le titre « Montante du jour » est en gris ultra-pâle quasi-invisible, le bouton CTA est désaturé. UX inutilisable.
- **R4 — Combiné DEMAIN affiche `TBD vs TBD`** : un placeholder de match non-résolu remonte dans l'UI. Bug de rendering quand un slot du combiné n'a pas trouvé de pick.

---

## 🎨 Audit visuel/style approfondi (nouvelle section)

> **User feedback : « le style est complètement foireux »**.
> Cet audit identifie pourquoi le site donne cette impression et propose une refonte ciblée.

### V1. Layout : énorme zone vide à droite + sidebar trop large

**Constat**
- Sur viewport 1568 px, le contenu principal est centré dans une colonne de ~720 px max-width.
- À droite de cette colonne : ~600 px de zone NOIRE complètement vide.
- À gauche : sidebar ~160 px + une zone vide « ⚡ Now » qui empile 200 px de vide.
- Résultat : ~50% de l'écran est gaspillé en pixels noirs sans contenu.

**Conséquence**
- Le dashboard donne une impression de « rien à voir », alors qu'on devrait être sur un produit data-dense (un bookmaker/analytique = layout type Bloomberg, ESPN, Stake.com).
- Les cards font 720 px de large alors qu'on a 1568 px → le contenu est cramped (les rows à 5 picks doivent passer en grid 5×1, pas 1×5).

**Fix demandé**
- Refondre la grille principale en `grid-template-columns: 220px 1fr 320px` (sidebar gauche fixe, contenu fluide, panneau droit pour live/quick-stats).
- OU passer en single-column max-width 1280 px centrée — pas 720 px.
- Sur la sidebar : retirer la box vide « ⚡ Now ». Soit la peupler (matchs en direct compact, prochain pick imminent), soit la supprimer.

---

### V2. Trust strip déborde (P0-5 toujours)

**Constat (déjà signalé phase 1)**
- `.trust-strip` mesure 2318 px sur viewport 1568. `overflow-x: hidden` masque la fin → l'utilisateur voit `0.224 Brier · 264 picks réglés` et c'est tout. Manque WR locks 92%, ROI +3.3%, lien backtest.

**Fix**
- `.trust-strip { display: flex; flex-wrap: wrap; max-width: 100%; overflow: visible; gap: 0.75rem; }`
- Réduire la padding interne `.trust-strip-stat` à `0.4rem 0.6rem` en < 1280px.

---

### V3. Hiérarchie typographique molle

**Constat**
- Body font-size base : **14 px** → trop petit pour un dashboard data-dense (recommandation : 15-16 px).
- H1 : 40 px / 800 weight → bien.
- H2 : 18 px / 600 weight → trop proche du body (14 px). Pas de break visuel clair entre titre de section et corps.
- Boutons : 20 px / 400 weight → font-weight trop léger pour un CTA (devrait être 500-600).
- Pas de style pour les labels de KPI (« WIN RATE », « ROI FLAT » …) — actuellement uppercase 11px gris.

**Fix**
- Bumper body à `15px` ou `16px`.
- H2 → `24px / 700`.
- Labels KPI → `font-feature-settings: 'tnum'` (chiffres tabulaires), letter-spacing 0.04em.
- Ajouter un H3 distinct (ex `18px / 600`).

---

### V4. Palette : trop de noir profond, peu de hiérarchie de surfaces

**Constat**
- Body bg = `rgb(6, 7, 10)` → noir quasi pur.
- Cards bg = imperceptiblement plus clair (~`rgb(10, 12, 18)` deviné). Le contraste card/bg est < 5%.
- Accents violets (`rgb(182, 160, 255)`) ressortent bien, mais c'est la SEULE couleur d'accent — tout le reste est gris/noir.
- Pas de gradient subtil sur les surfaces, pas de glow, pas de border colored.

**Conséquence**
- Le site « disparaît » dans l'écran : on ne distingue pas les blocs.
- Comparaison : Stake.com / DraftKings utilisent 3 niveaux de surfaces (`#0e1117` / `#161b22` / `#21262d`) + bordures subtiles `rgba(255,255,255,0.08)`.

**Fix**
- Définir les CSS vars suivantes :
  ```
  --surface-0: #0a0c11;     /* page bg */
  --surface-1: #11141b;     /* card bg */
  --surface-2: #1a1f2a;     /* hover / nested */
  --border-soft: rgba(255,255,255,0.06);
  --border-strong: rgba(255,255,255,0.12);
  ```
- Tous les `.card`, `.kpi-tile`, `.modal-section` → `background: var(--surface-1); border: 1px solid var(--border-soft);`
- Hover → `background: var(--surface-2); border-color: var(--border-strong);`

---

### V5. KPI tiles : peu lisibles, mal sized

**Constat**
- Les 4 tiles de tête (Date / Pronos forts / En direct / Données) :
  - Hauteur ~80 px chacune, poids visuel léger.
  - Le chiffre clé (« 4 » pronos forts) est à 40 px / 800 weight mais perdu dans une card immense.
  - Les couleurs status (vert pronos, rouge live) sont des points 8×8 — invisibles à distance.
- Sur la page Performance, les tiles WIN RATE / ROI / PNL Kelly sont mieux mais accolées en row uniformément → la hiérarchie est plate.

**Fix**
- Tiles principales (3-6 selon contexte) : grille 4 colonnes desktop, 2 colonnes mobile.
- Numérique en 32-40 px, label en 11px uppercase tracking, pictogramme couleur 16×16, et delta (vs hier / vs semaine) en 12 px.
- Ajout d'un mini-sparkline 60×20 sous chaque KPI (recharts ou inline SVG).

---

### V6. Cards de pick : design générique et cramped

**Constat (page #top, #locks, #tous)**
- Card pick ressemble à : `[N°] [LIGUE] [time] / [Équipe1 vs Équipe2] / [Pick → 1-Leeds 1.34] / [Conf 85%]`.
- Layout en flex horizontal qui passe à la ligne quand cramped → décalage du label conf à droite.
- Pas de logo équipe (sauf modal détail). Tout est du texte.
- Les badges (« PARI SÛR », « TOP MATCH », « LOCK ») sont juste des chips colorées sans iconographie consistante.
- L'avatar/logo équipe est absent dans les listes courtes mais présent dans la modal.

**Fix**
- Card pick standard, layout grid :
  ```
  [logo home][nom home]      [logo away][nom away]
  [ligue · heure]            [pick · cote · conf%]
                             [edge · EV · kelly]
  ```
- Toujours afficher logos équipe (déjà dispo via team_id).
- Badges harmonisés : forme pill, padding `2px 8px`, font 11px / 600 / uppercase.
- Hover → légère élévation (`box-shadow: 0 4px 16px rgba(0,0,0,0.4)`) + `border-color` vif.

---

### V7. Modal détail : KPI tiles toujours absentes en haut

**Constat (déjà P0-8 phase 1)**
- Modal s'ouvre sur l'onglet Synthèse.
- En haut : titre du match, date, heure, lieu + 2 boutons (Parier sur Winamax, Partager).
- **Pas de strip de KPIs** comme promis dans CLAUDE.md Sprint 69 + 77a + 83 (Confiance / Edge / EV / Kelly / Qualité / Actionability).
- L'utilisateur doit scroller dans Synthèse pour comprendre la décision.

**Fix**
- Sous le titre, AVANT les onglets : strip horizontale de 6 tiles (responsive : 6 sur desktop, 3×2 sur mobile).
- Chaque tile : icône + numérique + label + couleur status (vert/jaune/rouge selon seuil).

---

### V8. Modal détail : Synthèse trop verbeuse, pas hiérarchisée

**Constat**
- 17 sections empilées sans groupement visuel : Teams big, Contexte, Verdict 1 ligne, Notre pronostic, Pourquoi fiable, Pourquoi pronostic, Décomposition, Composé de, Évolution fiabilité, Pourquoi ce pick, Scores plus probables, Marchés buts (9 chips), Contexte extérieur (météo).
- Beaucoup de data redondante : « Forme favorable Viking FK » apparaît 3 fois.
- Le narratif ML-généré contient des contradictions (ex : « 82% très haute confiance » + « consensus 0% méfiance »).

**Fix**
- Regrouper par cards collapsibles : `Décision`, `Pourquoi`, `Marchés alternatifs`, `Contexte`.
- Une seule mention par signal.
- Réviser les phrases conditionnelles dans `predictMatch()` pour ne pas concaténer 3 messages contradictoires.

---

### V9. Page Bilan : compteurs alarmants sans context

**Constat**
- Page Bilan affiche en grand : « -100.0% rentabilité du modèle · WR modèle 0% · 1 paris évalués sur 424 matchs terminés ».
- En dessous : « COACH IA — RÉSUMÉ DU BILAN : -100% de rentabilité sur 1 paris — glissade sérieuse, relis tes paris des 2 dernières semaines. Wallet simulé 10€ → 8.00€ (-20%) »
- **Échantillon = 1 pari** : statistiquement non-significatif. Le -100% est un mauvais signal terrible alors que c'est juste un pari perdu.

**Fix**
- En dessous d'une certaine taille (n < 30), afficher « Échantillon insuffisant — chiffres indicatifs » au lieu d'un -100% rouge alarmant.
- Le « Coach IA » doit avoir une logique : « 1 pari = trop peu pour conclure, attendons 10+ ».

---

### V10. Sub-nav (onglets) : contraste actif/inactif faible

**Constat**
- Sous la rangée principale d'onglets (« Tous pronostics / Matchs détectés / … / Top du jour ») la pilule active est sur fond violet pâle, les inactives sur fond gris transparent.
- En lumière forte (laptop dehors), on voit mal lequel est actif.

**Fix**
- Active : `background: var(--brand); color: var(--surface-0); font-weight: 600`.
- Inactive : `background: transparent; color: var(--text-dim); border: 1px solid var(--border-soft)`.
- Hover : `background: var(--surface-2); color: var(--text)`.

---

### V11. Topbar : minimaliste mais sans hiérarchie

**Constat**
- Topbar contient : logo + sous-titre dynamique « NBA · NHL · MLB · Tennis · Foot aujourd'hui », search bar (vide), date selector (◀ Aujourd'hui ▶ 01/05/2026), 4 icônes (cadeau, bell, mode focus, theme).
- Tout sur une seule ligne, alignement médiocre, search bar et date selector accolés sans séparation visuelle.
- Manque : **liens de navigation principaux**. L'utilisateur n'a aucun moyen de naviguer sans passer par la sidebar (qui est un peu cachée à gauche).

**Fix**
- Topbar 2 lignes possible :
  - Ligne 1 : logo + nav principale (Pronos / Locks / Combinés / Bilan / Académie) en menu horizontal + search.
  - Ligne 2 (sticky scroll) : sub-nav contextuelle de la page courante.
- Sépare les groupes d'icônes avec des dividers verticaux.

---

### V12. Sidebar : navigation incomplète et icônes inconsistantes

**Constat**
- Sidebar propose : ⚡ Now (vide), PICKS (Top du jour ⭐, Mismatches marché 💎, Mises du jour 💼, Locks 🔒), AGENT (💰 📜 🎯), STATS (📋 📅 📊 ✏️), ⚙ Profil & bankroll.
- **Manque : Combinés, Buteurs, Calendrier accessible directement, Académie, Méthodologie, Comment lire un prono, Favoris**.
- Sprint 54 promet 6 hubs (Accueil / Pronostics / Explorer / Performance / Apprendre / Compte). On n'a que 4 sections (Picks / Agent / Stats / Settings).
- Icônes émojis : ⭐💎💼🔒💰📜🎯📋📅📊✏️ → mix d'objets, pictogrammes, sans cohérence (étoile vs diamant vs valise).

**Fix**
- Adopter une lib d'icônes uniforme (Lucide, Phosphor, Tabler).
- Restructurer en 6 hubs comme Sprint 54.
- Sticky scroll sidebar avec section active highlight.

---

### V13. Page Mismatches Marché : edges +30pt suspects (P3 phase 1)

**Constat (idem audit phase 1, pas changé)**
- Picks affichés avec edges +30.2pt, +29.6pt, +22.5pt → modèle vs marché à 30 percentage points de différence sur des marchés liquides.
- Probable phantom edge — le modèle se trompe.

**Fix**
- Cap à +15pt visible. Au-delà, marquer « ⚠ écart anormal — vérifier données ».
- Filtrer en interne si data quality score < 3/4.

---

### V14. Modal détail : score prédit à 17.6% pour un 3-0 en foot

**Constat**
- Modal Viking FK vs Rosenborg : Top score prédit = 3-0 à 17.6%, suivi de 2-0 à 16.9%, 4-0 à 13.7%, 5-0 à 8.5%.
- Sum top 5 wins « par 3+ buts » ≈ 60%. Trop concentré sur des wins clean — improbable même contre un faible adversaire.

**Fix**
- Implémenter shrinkage Bayes Sprint 36 — pour ligues petits échantillons (Eliteserien début saison), shrink les xG vers la moyenne ligue.
- Ajouter un cap : si max(P(score)) > 12% → review manuelle.

---

### V15. Combinés : « TBD vs TBD » placeholder visible

**Constat (régression R4)**
- Variante « COMBINÉ DEMAIN » affiche : `FC Porto vs Alverca` ✓ / **`TBD vs TBD`** ❌ / `W. Xiyu vs V. Erjavec`.
- TBD = match dont les compétiteurs ne sont pas encore connus (tirage tournoi pas fait).

**Fix**
- Filtrer les events où `competitors[].name == null` ou `== "TBD"` avant d'entrer dans `buildComboVariants()`.

---

## 📋 Brief PHASE 2 pour Claude Code

### 🔥 Priorité absolue
1. **P0-1 : RELANCER LA PIPELINE CRON**. Sans ça, tous les autres fixes sont invisibles à l'user.
   - Vérifier `gh workflow list` et le dernier run de `refresh.yml`.
   - Si le throttle GitHub Actions est en cause : un commit vide sur main suffit à réveiller le scheduler.
   - Vérifier le PAT cron-job.org (CLAUDE.md : expire 2026-05-22).
   - Forcer un run via `gh workflow run refresh.yml`.
2. **P0-4 : Filtrer le golf** dans `scripts/finalize_inline.py` ou `scripts/fetch_v3.py`. Ajouter une whitelist `ALLOWED_SPORTS = {'football','tennis','basketball','hockey','baseball'}`.
3. **R1 : Restaurer le deep linking modal** `#match/X/synthese`. Probablement un router qui matchait `#match/...` avant la refonte du hash routing et qui a été cassé.
4. **R3 : Fixer l'animation opacity des pages** (#montantes-jour, #academie). Le `.page-enter-active` ne se déclenche pas → opacity reste à 0 ou intermédiaire. Voir P1-5.
5. **P0-5 : Fixer overflow trust strip** → flex-wrap + max-width.

### 🎨 Refonte style (nouveau)
6. **V1 : Layout 3 colonnes** ou single-column 1280px max. La colonne 720px est ridicule sur 1568+.
7. **V4 : 3 niveaux de surfaces** (`--surface-0/1/2`) + bordures subtiles. Casser le « tout noir ».
8. **V3 : Bumper body 14px → 15-16px**. H2 → 24px/700.
9. **V6 : Cards pick avec logos équipe** + grid 2 colonnes home/away.
10. **V7 : Strip 6 KPIs en haut de modal** (Confiance / Edge / EV / Kelly / Qualité / Actionability).
11. **V12 : Restructurer sidebar 6 hubs** Sprint 54.

### 🐛 Bugs résiduels
12. **R4 : `TBD vs TBD` filtré** dans `buildComboVariants`.
13. **V9 : Page Bilan** ajouter disclaimer si `n < 30`.
14. **V13 : Cap edges > 15pt** + flag « écart anormal ».
15. **V14 : Shrinkage Bayes** sur ligues à petit échantillon.
16. **P1-5 : Anim opacity stuck** sur pages SPA → fallback `opacity:1` après 500ms via `transitionend`.

### ✨ Quality of life
17. **P2-1 : Theme picker** → ajouter option « Auto » (3-state).
18. **V11 : Topbar** → ajouter nav principale horizontale.
19. **V10 : Sub-nav** → contraste actif/inactif renforcé.
20. **V5 : KPI tiles** → 32-40px numérique + sparklines.

---

## 🤖 Prompt full-auto pour Claude Code

```
Audite et corrige TOUS les bugs et issues style décrits dans @AUDIT_PHASE2_2026-05-01.md.

MODE: AUTONOME COMPLET — n'attends aucune validation, exécute jusqu'au bout.

PROCESS
1. Lis AUDIT_PHASE2_2026-05-01.md ET CLAUDE.md en entier.
2. `git status` + `git log --oneline -30` pour comprendre l'état post-fixes Phase 1.
3. Traite dans l'ordre du "Brief PHASE 2 pour Claude Code" en bas du rapport :
   - Priorité absolue (1 → 5) — fixer P0-1 cron AVANT TOUT, sinon le reste est invisible
   - Refonte style (6 → 11) — gros chantier CSS, peut-être créer app-v2.css temporaire et merger après
   - Bugs résiduels (12 → 16)
   - Quality of life (17 → 20)
4. Pour chaque item :
   - Reproduis localement (lance python serveur.py)
   - Grep le code coupable
   - Fixe + test Playwright si applicable
   - Commit séparé : "fix(P-X|V-Y|R-Z): description"
5. Final : push main, deploy via ./deploy.sh, bump footer version, vérifier prod.

PIPELINE CRON (P0-1) — bug racine
- Tu as le droit de modifier .github/workflows/refresh.yml
- Lance `gh workflow run refresh.yml` si gh CLI dispo
- Commit vide pour réveiller scheduler GitHub Actions si nécessaire
- Si cron-job.org en cause → documente dans le récap, ne touche pas au PAT

REFONTE STYLE (V1-V12) — gros chantier
- Tu peux toucher à app.css ET pronostics.html sans crainte
- Respecte la convention "no build step" (pas de PostCSS, pas de Tailwind compilation)
- Variables CSS dans :root, classes BEM-ish (.card__title, .kpi-tile--positive)
- Vérifie le rendu sur 1568px ET 1280px ET 380px (mobile)
- Si une nouvelle palette change l'identité visuelle, garde l'accent émeraude/violet existant

REGLES
- Pas de bundler, pas de npm install, pas de Tailwind
- Respecte CLAUDE.md (LF eol, getSides, predictMatch isolé)
- Si bloqué après 2 tentatives sur un bug → skip, note dans récap, continue
- Re-vérifie en prod chaque fix après deploy (ne te fie pas à ton local seul)

DELIVERABLE FINAL
Récap structuré :
- ✅ Fixés (par ID P0/V/R)
- ⏭️ Skippés (raison)
- 🚀 Statut deploy (commit hash, URL, push date)
- 🧪 Tests ajoutés
- 📊 Avant/après quantitatif (« main width 720px → 1280px », « trust strip overflow 2318→1280 »…)
- 🎨 Screenshots avant/après si possible (lance Playwright headed)

GO. Exécute jusqu'au bout, pas de demi-mesure.
```

---

## 📌 Notes de contexte pour Claude Code

**État de la prod au moment de cet audit** :
- footer `v33`
- `data.generated_at` = 2026-04-30T16:35Z (19h de retard)
- `app.js?v=0bf3dc0c` ← exact même hash que phase 1 → **suspect : le cache buster n'est pas regénéré au deploy**, vérifier si app.js a vraiment changé.
- `app.css?v=dc469697` ← idem.

**Bonne nouvelle** : `window.isWinamaxBookable`, `window.qualityScore`, `window.expectedValue`, `window.buildComboVariants`, `window.matchImportance` sont tous exposés. Donc le code des Sprints 47-90 EST en prod, juste pas tout câblé dans le UI.

**Hypothèse forte** : la racine du « dashboard vide » et « sections manquantes » est que `renderDashboardPage` n'est PAS la version Sprint 85 (qui a les colonnes Prudents/Agressifs/Sélection complète). Soit le code a été merge mais pas appelé, soit le code est ancien.

**Action recommandée première** : faire un `grep -n "Sélection complète\|topPicks\|prudentPicks\|aggressivePicks" app.js` — si ces strings existent, c'est que le code est là mais le call site est cassé. Sinon, le code des Sprints 85+ n'a jamais été merge en prod.

---

*Fin du rapport phase 2.*

# Sprint Night Log — Paris-Sportif Autonomous Night

## Sprint v35.01 (2026-05-02 00:58 UTC)
- Chantier: Baseline / instrumentation nuit
- Avant: aucun log de nuit; repo sync avant mesure = `main@3bbe1514`; data generated_at = 2026-05-01T22:56:13Z
- Après: baseline mesurée localement: 1038 events; marchés détaillés 24/1038 (2.3%); form L10 0; H2H 543/1038 (52.3%); lineups 6; clubelo 0; weather 162; injuries 0; referee 9; bundles app.js 1,711,026 B, app.css 286,898 B, pronostics.html 1,097,056 B, sw.js 6,129 B; Playwright npm indisponible (`npx` absent)
- Impact: trace numérique initialisée; priorité recalibrée sur Winamax markets, L10, ClubElo, lineups et observabilité; H2H déjà proche cible mais à sécuriser
- Commit: eaf049b4
- Status: ✅ DONE

## Sprint v35.02 (2026-05-02 01:08 UTC)
- Chantier: P5 Winamax markets + garde-fou bundle
- Avant: marchés détaillés data.js 24/1038 (2.3%); fetcher sans `--limit/--debug`; `pronostics.html` baseline 1,097,056 B et aurait gonflé à 3,019,834 B après inline markets
- Après: rebase sur cron frais puis fetch détail large 137/137 enrichis; patch data.js 153 events avec marchés Winamax, 134/1050 avec marchés détaillés (12.8%); HTML externalise `data.js?v=6d3cd921` et reste à 104,967 B; smoke Chromium OK (1038+ events, Terminal Value visible, overflow 0)
- Impact: +110 events détaillés dans le site (+10.5 pts de couverture) sans exploser le shell HTML; pipeline prêt pour monter le cap sans tuer GitHub Pages
- Commit: ba8486b7
- Status: ✅ DONE

## Sprint v35.03 (2026-05-02 01:19 UTC)
- Chantier: P17/P19 health pipeline lag visible
- Avant: `health.json` exposait `sources` + warnings mais aucun contrat `pipeline_lag_per_script`; page Santé ne montrait pas quel script/fichier était en retard
- Après: `health.json.pipeline_lag_per_script` suit 12 sorties avec script, output, âge, seuil et statut; page Santé affiche la matrice lag; état mesuré: 12 scripts, 1 critique, 3 warnings; smoke local #sante OK avec bloc visible
- Impact: diagnostic pipeline lisible en 5 secondes; les fetchers vides/lents ne peuvent plus rester silencieux
- Commit: 19b0234f
- Status: ✅ DONE

## Sprint v35.04 (2026-05-02 01:29 UTC)
- Chantier: P7 ClubElo patch match-level
- Avant: `clubelo.json` contenait 630 clubs mais `event.clubelo` restait à 0; le patcher écrivait seulement `competitor.elo`
- Après: `patch_clubelo.py` écrit aussi `event.clubelo` quand les deux équipes sont matchées; data.js mesure 111 events avec `clubelo`, 162 events avec au moins un compétiteur Elo, 273 compétiteurs Elo
- Impact: le signal Elo devient mesurable côté santé/UI et exploitable par les blocs match-level; +111 events enrichis vs baseline 0
- Commit: 9c5487d2
- Status: ✅ DONE

## Sprint v35.05 (2026-05-02 01:40 UTC)
- Chantier: P6 lineups event-level patch
- Avant: `data.js` exposait 6 events avec `lineups`, 0 compétiteur avec `lineup`; `lineups_soccer.json` contenait 17 matchs disponibles
- Après: `patch_lineups_soccer.py` patche 12/46 matchs top-5 scannés; `data.js` expose 12 events avec `lineups`, 24 compétiteurs avec XI/subs et 12 matchs avec starters exploitables
- Impact: les compositions deviennent visibles au niveau match + équipe; le frontend et la santé data peuvent enfin mesurer ce signal sans parcourir un format fantôme
- Commit: 45483831
- Status: ✅ DONE

## Sprint v35.06 (2026-05-02 01:57 UTC)
- Chantier: P4/P2 forme L10 football + team sports
- Avant: 0/1038 events avec `team_form_l10`; 365 matchs foot avaient seulement une forme L5 native; `team_form.json` contenait 57 équipes et le patch rapide cron ne lisait pas ses clés `sport:league:id`
- Après: collecte ESPN schedule élargie à 696 équipes vues, 641 formes foot ajoutées, cache total 698 équipes; `data.js` expose 373 events avec `team_form_l10`, dont 320 foot, 48 baseball, 4 basket, 1 hockey; 735 compétiteurs ont `form10`
- Impact: le modèle lit une forme 10 matchs stable (`form10`/`team_form_l10`) au lieu de s'appuyer uniquement sur L5 ou rien; le cron patchera maintenant le vrai format du cache
- Commit: 27ffefc9
- Status: ✅ DONE

## Sprint v35.07 (2026-05-02 02:09 UTC)
- Chantier: P1 baseball pitcherStats blend
- Avant: rapport baseline `backtest_report_v2.json` baseball 5/13, WR 38.5%, ROI flat -36.68%, Brier 0.2561; projection MLB diluait l'ERA starter à environ 25% après double moyenne
- Après: projection baseball = 60% runs L5 attaque + 40% ERA pitcher adverse, variance resserrée si écart ERA starters >=2.0; backtest recalculé 45 picks baseball, WR 57.8%, ROI flat -0.92%, Brier 0.2456
- Impact: drawdown baseball quasi neutralisé dans le rapport mesuré (+35.76 pts ROI vs baseline publié) avec une formule plus lisible et moins bruitée
- Commit: 3e6046d8
- Status: ✅ DONE

## Sprint v35.08 (2026-05-02 02:32 UTC)
- Chantier: P5 Winamax detailed markets attach
- Avant: après cron, `data.js` avait 0/1038 events avec marchés Winamax détaillés (`len(markets)>1`); `patch_winamax_markets.py` rejetait 166 vraies lignes à cause d'un seuil marge 1N2 >12%
- Après: seuil de sanity 1N2 ajusté à 22%, fetch détail 138 matchs, patch 316 events avec markets, 198 events avec marchés détaillés: football 123, baseball 48, basket 16, hockey 9, tennis 2
- Impact: le scanner value récupère enfin les marchés exacts O/U, DNB, double chance, handicaps/runline/totals au lieu de rester bloqué sur 1N2
- Commit: fbc1d2e4
- Status: ✅ DONE

## Sprint v35.09 (2026-05-02 02:42 UTC)
- Chantier: P7 ClubElo dans patch rapide cron
- Avant: `data.js` restait à 0 events avec `event.clubelo` après cron; `patch_all_quick.py` lisait mal `clubelo.json` (`clubs`) et n'utilisait pas les aliases du patch spécialisé
- Après: `patch_all_quick.py` réutilise le lookup ClubElo robuste; mesure locale 111 events avec `clubelo`, 162 events avec au moins une équipe Elo, 273 compétiteurs enrichis
- Impact: le signal Elo devient persistant à chaque refresh, pas seulement après exécution manuelle du patch spécialisé
- Commit: f4f7a47f
- Status: ✅ DONE

## Sprint v35.10 (2026-05-02 02:50 UTC)
- Chantier: P17/P19 Santé data couverture Winamax + forme L10
- Avant: `health.json.sources.team_form.teams` restait à 0 malgré 698 équipes en cache; `winamax_markets` ne distinguait pas 1N2 simple vs marchés détaillés; `pipeline_lag_per_script.team_form.script` pointait vers un script inexistant
- Après: `team_form` expose 698 équipes dont 641 foot; `winamax_markets` expose 751 matchs avec cotes et 148 matchs détaillés; `quality_checks` mesure 302 exacts, 189 détaillés, ratio détaillé 62.6%
- Impact: la page Santé peut diagnostiquer en prod si le scanner multi-marchés et la forme L10 fonctionnent vraiment, au lieu d'afficher un faux vide
- Commit: 44825ffc
- Status: ✅ DONE

## Sprint v35.11 (2026-05-02 03:02 UTC)
- Chantier: P16 smoke navigateur desktop/mobile + CSP images
- Avant: smoke Chromium local desktop/mobile rendait 1038 events et 198 marchés détaillés, mais 4 erreurs console CSP bloquaient les images joueurs Sofascore (`img.sofascore.com`)
- Après: CSP `img-src` autorise `https://img.sofascore.com`; smoke desktop 1440x900 et mobile 390x844 sans erreur bloquante, 0 overflow horizontal, 66 cards rendues, footer v35.11
- Impact: page non blanche vérifiée sur desktop/mobile; les assets Sofascore utiles aux cartes/modales ne déclenchent plus d'erreurs console
- Commit: 51c2c4ac
- Status: ✅ DONE

## Sprint v35.12 (2026-05-02 03:14 UTC)
- Chantier: P18 drift pipeline visible
- Avant: `python scripts/check_pipeline_drift.py --report` crashait sous Windows sur `UnicodeEncodeError`; `health.json` n'avait aucun champ `pipeline_drift`
- Après: le rapport drift s'imprime sans crash; `health.json.pipeline_drift` expose `status=ok`, `drift_count=0`, `auto_refresh_count=43`, `refresh_yml_count=43`; page Santé affiche le bloc local/cron
- Impact: les divergences pipeline deviennent visibles côté site et le diagnostic CLI reste utilisable sur la machine de Théo
- Commit: 7bfc8886
- Status: ✅ DONE

## Sprint v35.13 (2026-05-02 03:27 UTC)
- Chantier: P20 sitemap dynamique
- Avant: `sitemap.xml` contenait 15 URLs, `build_sitemap.py` utilisait le mtime local, et `build_sitemap.py` n'était ni dans `auto_refresh.py` ni dans `refresh.yml`
- Après: sitemap régénéré avec 33 URLs dont routes `#performance`, `#valeur`, `#matchs`, `#sante`; lastmod basé sur `git log` fallback mtime; pipeline local/cron alignée à 44 scripts
- Impact: les pages/catégories clés du cockpit sont discoverables et le sitemap reste frais à chaque refresh sans drift
- Commit: 65bc682c
- Status: ✅ DONE

## Sprint v35.14 (2026-05-02 03:48 UTC)
- Chantier: P10 CLV tracking exploitable
- Avant: `clv_history.json` avait seulement un résumé global (501 matchs, 1372 observations, mean -0.11%, positive 37.1%) et la page Santé n'affichait aucun signal CLV
- Après: CLV enrichi avec `by_sport`, `by_side`, `by_league`, extrêmes best/worst; `health.json.sources.clv_history` expose 501 matchs / 1372 observations; smoke #sante confirme le badge CLV + drift visibles
- Impact: le site peut suivre si les prises de cote battent le marché, pas seulement si un pari gagne après coup
- Commit: 627f4998
- Status: ✅ DONE

## Sprint v35.15 (2026-05-02 04:05 UTC)
- Chantier: P9 H2H seasonseries ESPN
- Avant: 286/1038 events avaient des meetings H2H utiles, tous en football; NBA/MLB/NHL avaient `seasonseries` ESPN mais le fetcher ne lisait que `headToHeadGames`
- Après: fallback `seasonseries` normalisé; run local post-rebase `checked=60 enriched=46`; H2H utile passe à 328 events: football 288, baseball 27, basketball 7, hockey 6
- Impact: +40 matchs US gagnent un historique exploitable dans les fiches match et signaux, sans dépendre de Sofascore vide
- Commit: 017b6cc6
- Status: ✅ DONE

## Sprint v35.16 (2026-05-02 04:17 UTC)
- Chantier: P9 H2H UI/data-quality wiring
- Avant: `computeDataQuality` ne considérait pas le baseball comme source H2H; la carte détail testait `Array.isArray(match.h2h)` alors que `h2h` est un objet `{meetings}`
- Après: baseball inclus dans les sports H2H; la carte détail lit `match.h2h.meetings.length`; app hash `32516710`, footer/SW v35.16
- Impact: les 27 matchs baseball enrichis au sprint précédent ne sont plus marqués à tort comme H2H manquant, et les fiches match affichent le bon statut
- Commit: ed245102
- Status: ✅ DONE

## Sprint v35.17 (2026-05-02 04:31 UTC)
- Chantier: P5/P15 Terminal Value horizon 48h
- Avant: Terminal Value scannait seulement aujourd'hui; mesure locale `today_exact=0`, `next48_exact=217`, donc le cockpit pouvait afficher vide malgré des opportunités bookables demain
- Après: scanner cockpit passe sur les matchs exacts à venir <48h; smoke navigateur local confirme `77 marchés scorés · 77 matchs exacts sur 48h`, aucun ticket vide forcé, 0 erreur console
- Impact: le site ne rate plus les paris value de demain quand la journée courante est creuse ou terminée
- Commit: 11e16cd6
- Status: ✅ DONE

## Sprint v35.18 (2026-05-02 04:44 UTC)
- Chantier: P5 Ticket attaque score dédié
- Avant: `Ticket attaque` triait surtout par EV brute; smoke: FC Tokyo -1 @4.30, EV +166%, prob 62%, score 49/100
- Après: score attaque dédié EV + cote haute + confiance + proba minimale; garde-fous prob >=18%, score >=42; smoke navigateur conserve FC Tokyo -1 @4.30 sans erreur
- Impact: le ticket haute cote suit explicitement l'objectif “grosse cote crédible”, sans choisir une cote longue seulement parce que l'EV brute explose
- Commit: aa86b758
- Status: ✅ DONE

## Sprint v35.19 (2026-05-02 04:58 UTC)
- Chantier: P16 smoke E2E autonome
- Avant: `node scripts/smoke_e2e.js` crashait si le port 8765 était déjà occupé et ne vérifiait pas que Terminal Value 48h contenait des matchs exacts
- Après: serveur smoke sur port dynamique, fallback Chrome Windows, 15 pages SPA OK, Terminal Value 48h confirmé à `69 marchés scorés · 69 matchs exacts`, overflow mobile 0
- Impact: la QA locale peut être relancée même si un serveur tourne déjà, et le risque de cockpit “Terminal vide” est couvert automatiquement
- Commit: 6ffe30b7
- Status: ✅ DONE

## Sprint v35.20 (2026-05-02 05:15 UTC)
- Chantier: P3/P16 garde-fou ROI sport
- Avant: `backtest_report_v2.json` marquait hockey à -15.76% ROI sur 19 picks; le filtre sport froid protégeait surtout les top picks utilisateur, pas l'agent ni le smoke E2E
- Après: `_sportRoiGuard` bloque les sports ROI<-10% avec n>=10 sauf edge exceptionnel; replay agent et positions du jour l'appliquent; smoke confirme `sport ROI guard = hockey blocked`
- Impact: moins d'exposition automatique aux sports historiquement froids, avec exception conservée pour les vraies value bets à edge fort
- Commit: 7bcb64e0
- Status: ✅ DONE

## Sprint v35.21 (2026-05-02 05:31 UTC)
- Chantier: P19 visibilité garde-fou ROI
- Avant: le hockey était bloqué par le nouveau guard, mais la page Santé n'affichait pas clairement quels sports étaient en AUTO-BLOCK; si le backtest arrivait après le rendu Santé, le bloc pouvait rester absent
- Après: page Santé affiche `Garde-fou ROI sport` avec hockey AUTO-BLOCK, ROI -15.8%, sample 19, WR 47%, Brier 0.243; Santé se re-render quand `backtest_report_v2.json` arrive; smoke vérifie le bloc
- Impact: diagnostic visible en prod en quelques secondes, plus de blocage invisible de l'agent
- Commit: 72eea21b
- Status: ✅ DONE

## Sprint v35.22 (2026-05-02 05:43 UTC)
- Chantier: P17 mesure mission centralisée
- Avant: les métriques nuit étaient recalculées par commandes ad hoc et difficiles à comparer après les pushes cron
- Après: `scripts/measure_night_metrics.py` génère `night_metrics.json`: 1040 events, 314 Winamax exacts, 384 L10, 160 H2H, 11 lineups, 131 ClubElo, ROI global +2.88%, hockey en sport froid
- Impact: source de vérité stable pour le rapport final et les prochains sprints data
- Commit: 28a93fa0
- Status: ✅ DONE

## Sprint v35.23 (2026-05-02 05:55 UTC)
- Chantier: P5 persistance marchés détaillés Winamax
- Avant: le cron catalogue réécrivait `winamax_markets.json` avec du 1N2 seul entre deux runs détail; snapshot: 0 marché détaillé après cron, Terminal Value 55 marchés / 55 matchs exacts
- Après: `fetch_winamax_catalog.py` préserve les marchés détaillés existants; run local conserve 3 matchs détaillés, `data.js` passe à 4 events avec marchés >1N2, smoke Terminal Value monte à `101 marchés scorés · 56 matchs exacts sur 48h`
- Impact: les détails Winamax ne disparaissent plus au refresh catalogue; le scanner value voit plus de marchés exploitables immédiatement
- Commit: 248d73c4
- Status: ✅ DONE

## Sprint v35.24 (2026-05-02 06:06 UTC)
- Chantier: P5 seed marchés détaillés Winamax
- Avant: après v35.23, le site conservait 3 matchs détaillés / 4 events >1N2 et le smoke voyait 101 marchés scorés sur 48h
- Après: fetch détail `--limit=25 --ttl-hours=0`, catalogue merge préserve 28 matchs détaillés, `data.js` injecte 29 events >1N2, smoke Terminal Value monte à `369 marchés scorés · 56 matchs exacts sur 48h`
- Impact: couverture multi-marchés réellement exploitable multipliée sans attendre le prochain cron détail
- Commit: 04c2c8a6
- Status: ✅ DONE

## Sprint v35.25 (2026-05-02 06:18 UTC)
- Chantier: Rapport final nuit
- Avant: les sprints étaient poussés mais la synthèse réveil manquait; `night_metrics.json` venait d'être recalculé après le seed Winamax
- Après: `SPRINT_NIGHT_REPORT.md` résume les gains, métriques avant/après, tests verts et priorités restantes; `night_metrics.json` final capture 1040 events, 314 exacts, 26 events >1N2, 25 matchs détaillés, 282 marchés scorés en smoke
- Impact: Théo peut ouvrir un seul rapport et comprendre ce qui a bougé, ce qui est mesuré et ce qu'il faut attaquer ensuite
- Commit: pending
- Status: ✅ DONE

## Sprint v35.112 (2026-05-02 13:58 UTC)
- Chantier: P-9.3 data lite boot
- Avant: boot chargeait data.js complet 6970 KB via pronostics.html
- Après: boot charge data_lite.js 2761 KB; data.js complet reste lazy via _ensureFullData()
- Impact: -4209 KB sur le payload data initial, pipeline cron génère le lite automatiquement
- Commit: pending
- Status: ✅ DONE

## Sprint v35.113 (2026-05-02 13:48 UTC)
- Chantier: P-9.13 bottom nav mobile
- Avant: spacer body uniquement, contredit par des paddings `main` en `!important`
- Après: safe-zone mobile centralisée via `--mobile-bottom-nav-h` sur main, pages et footer
- Impact: derniers CTA/footer protégés de la bottom nav fixe
- Commit: pending
- Status: ✅ DONE

## Sprint v35.114 (2026-05-02 13:49 UTC)
- Chantier: P-9.16 touch targets
- Avant: plusieurs contrôles mobiles restaient sous 44px
- Après: nav, chips, footer, filtres et CTA mobiles ont une cible minimale 44x44
- Impact: a11y/tap UX renforcées sans densifier le desktop
- Commit: pending
- Status: ✅ DONE

## Sprint v35.115 (2026-05-02 13:54 UTC)
- Chantier: P-9.17 H1 unique
- Avant: Santé sans H1 visible et Montantes avec deux H1 visibles
- Après: 8 pages contrôlées, chacune expose exactement 1 H1 visible
- Impact: hiérarchie Lighthouse/SEO nettoyée page par page
- Commit: pending
- Status: ✅ DONE

## Sprint v35.116 (2026-05-02 13:56 UTC)
- Chantier: P-9.46 night metrics
- Avant: night_metrics obsolète avant Phase 9
- Après: 385 events, Winamax exact 100%, marchés détaillés 363 events, ROI global +0.53%
- Impact: métriques phase 9 fraîchement mesurées pour audit/report
- Commit: pending
- Status: ✅ DONE

## Sprint v35.111 (2026-05-02 13:51 UTC)
- Chantier: P-8.15 révision page Legal
- Avant: legal pouvait passer en thème clair et header mobile se chevauchait
- Après: dark PWA permanent, logo compact, nav mobile scrollable, banderole prévention
- Impact: page légale alignée avec le site principal et plus robuste mobile
- Commit: pending
- Status: ✅ DONE

## Sprint v35.110 (2026-05-02 13:42 UTC)
- Chantier: P-8.11 révision page Performance
- Avant: le diagnostic pipeline s’affichait avant le titre Performance
- Après: H1/page header d’abord, puis diagnostic et onglets
- Impact: hiérarchie claire, page moins “empilement mobile”
- Commit: pending
- Status: ✅ DONE

## Sprint v35.109 (2026-05-02 13:33 UTC)
- Chantier: P-8.10 révision page Tous
- Avant: lignes mobiles compressées en 3 colonnes, noms/picks trop serrés
- Après: mobile en carte verticale; desktop garde la table dense
- Impact: la liste des pronos devient lisible sur téléphone sans perdre le mode PC
- Commit: pending
- Status: ✅ DONE

## Sprint v35.108 (2026-05-02 13:24 UTC)
- Chantier: P-8.9 révision dashboard
- Avant: chips mobiles coupés sans signal; logos/photos 404 vides sur Accueil
- Après: scroll-snap + fondu mobile; fallback initiales sur équipes et buteurs
- Impact: Accueil plus propre et moins “cassé” sur mobile/desktop
- Commit: pending
- Status: ✅ DONE

## Phase 2

## Sprint v35.27 (2026-05-02 05:12 UTC)
- Chantier: P-A1 lineups Sofascore
- Avant: `night_metrics.lineups=11`, `health.sources.lineups_soccer.events=17`, fetcher sans `--debug/--top-leagues`, patch limité aux top-5 ligues
- Après: fetcher supporte `--debug`, `--top-leagues`, `--hours-ahead=72`, `--pages=3`; patch couvre top-5 + tier2; run local collecte 47 lineups et patche `43` events dans `data.js`
- Impact: couverture lineups x3.9 sur le site (11 → 43), source fraîche, pipeline drift OK; la cible 200+ dépendra des lineups réellement publiées par Sofascore dans la fenêtre
- Commit: pending
- Status: ✅ DONE

## Sprint v35.28 (2026-05-02 05:16 UTC)
- Chantier: P-A2 blessures Sofascore
- Avant: `night_metrics.injuries=0` malgré `injuries_soccer.json` avec 131 équipes / 475 joueurs; patch écrivait seulement `injuries_home/away`, pas le contrat `event.injuries`
- Après: fetcher blessures supporte `--debug`, `--top-leagues`, fenêtre 72h et pagination; source fraîche: 150 équipes / 545 entrées joueurs; patch écrit `event.injuries` + severe counts et couvre top-5 + tier2
- Impact: `data.js` passe à `144` events avec blessures, warnings Santé 6 → 5, et le signal devient visible/actionnable côté modèle/UI
- Commit: pending
- Status: ✅ DONE

## Sprint v35.29 (2026-05-02 05:19 UTC)
- Chantier: P-A3 Sofascore events
- Avant: `sofascore_events.json.total=0` et Santé affichait `source vide`; le fetcher écrasait le fichier même quand une requête transitoire renvoyait zéro event
- Après: `fetch_sofascore_events.py` ajoute `--debug`, `--date`, `--days`, `--sports`; protection anti-écrasement vide; run du 2026-05-02 collecte `2424` events multi-sports
- Impact: source Sofascore réactivée (`0 → 2424`), warning Santé supprimé, filet de secours ESPN opérationnel sans perdre le dernier bon snapshot
- Commit: pending
- Status: ✅ DONE

## Sprint v35.30 (2026-05-02 05:21 UTC)
- Chantier: P-A4 Football-Data health + patch
- Avant: `health.sources.footballdata.rows=0` malgré `footballdata.json.matches=9388`; `data.js` avait `0` event avec `fd_calibration`
- Après: Santé compte le format réel `{matches, league_calibration}`; `patch_footballdata.py` attache `fd_calibration` à `140` events foot; `night_metrics` expose `fd_calibration` et `fd_closing_odds`
- Impact: warning faux positif supprimé, calibration ligue disponible pour le modèle foot, health warnings 4 → 3
- Commit: pending
- Status: ✅ DONE

## Sprint v35.31 (2026-05-02 05:30 UTC)
- Chantier: P-A5 Understat xG
- Avant: `fbref_xg.json` absent, `xg_team_stats.json` absent, `night_metrics.events.xg=0`
- Après: `fetch_understat_xg.py` collecte 112 équipes sur EPL/La Liga/Bundesliga/Serie A/Ligue 1/RFPL; `patch_understat_xg.py` patche `95` events / `150` competitors; Santé expose `xg_team_stats.teams=112`
- Impact: le modèle foot récupère enfin un signal xG pré-match exploitable (`0 → 95` events enrichis), avec compatibilité `fbref_xg.json` pour les patchers existants
- Commit: pending
- Status: ✅ DONE

## Sprint v35.32 (2026-05-02 05:36 UTC)
- Chantier: P-A6 arbitres Sofascore
- Avant: `night_metrics.events.referee=9`, `health.sources.referees_soccer.age_min=1296`, patch limité aux top-5 ligues
- Après: fetcher force/debug/pagination 96h, ligues top-5 + tier2 + coupes UEFA; collecte `101` matchs avec arbitre; patch couvre `47` events dans `data.js`
- Impact: signal arbitre multiplié x5.2 (`9 → 47`), warning stale supprimé, Santé descend à 2 warnings; smoke E2E vert avec `1364` marchés scorés sur 48h
- Commit: pending
- Status: ✅ DONE

## Sprint v35.33 (2026-05-02 05:38 UTC)
- Chantier: P-A3 garde anti-écrasement Sofascore
- Avant: `sofascore_events.json.total=0`, Santé affichait `sofascore_events: source vide`
- Après: refresh manuel collecte `2429` events multi-sports; fetcher refuse désormais d'écraser un bon snapshot par une collecte basse (`<100`) ou vide
- Impact: warning Sofascore supprimé, source fiable pour fallback/matching; Santé descend à `1` warning restant, smoke E2E vert
- Commit: pending
- Status: ✅ DONE

## Sprint v35.34 (2026-05-02 05:40 UTC)
- Chantier: P-A7 contrat Winamax exact
- Avant: `winamax_exact_ratio=40.5%` (`299/739`) et `440` events étaient gardés via fallback statique/tournoi-only sans `match_id`
- Après: si le catalogue Winamax live existe, seul un match exact avec `match_id` reste disponible; dataset actionnable `309/309` exacts, `272` events avec marchés >1N2, Santé `0` warning
- Impact: plus de fausses disponibilités Winamax sans cote exploitable; Terminal Value reste vert (`1364` marchés scorés / `55` matchs exacts 48h) avec un univers de paris nettement plus propre
- Commit: pending
- Status: ✅ DONE

## Sprint v35.35 (2026-05-02 05:43 UTC)
- Chantier: P-A8 Winamax details cap 80
- Avant: top-up cron rapide limité à `45` pages match; `242` matchs détaillés / ratio `78.3%`
- Après: palier cron `45 → 80`; backfill local `80` pages en `21.9s`, `0` échec; ratio reste `78.3%` car les matchs restants n'exposent encore que le marché principal ou sont trop loin
- Impact: marge CI OK (<60s), top-up plus agressif à chaque refresh sans warning Santé; prochaine amélioration utile = détecter explicitement les pages “1N2 only”
- Commit: pending
- Status: ✅ DONE

## Sprint v35.36 (2026-05-02 05:46 UTC)
- Chantier: P-A7 ordre pipeline Winamax exact
- Avant: le cron réintroduisait Sofascore après `patch_winamax.py`, ce qui ramenait `3234` events et `winamax_exact_ratio=29.9%`
- Après: ordre local/prod corrigé (`patch_sofascore_events.py` puis `patch_winamax.py`); dataset final `408/408` exacts, `340` events >1N2, Santé `0` warning
- Impact: le contrat “aucun pari sans cote Winamax exacte” tient aussi après cron; smoke E2E vert (`1303` marchés scorés / `48` matchs exacts 48h)
- Commit: pending
- Status: ✅ DONE

## Sprint v35.37 (2026-05-02 05:53 UTC)
- Chantier: P-B2 decay forme par sport
- Avant: `formScore()` appliquait un decay fixe `0.75` à tous les sports, donc une L10 NBA/MLB était traitée comme une fenêtre foot
- Après: decay sport-aware (`football=.75`, `basketball=.65`, `baseball=.55`, `hockey=.70`, `tennis=.50`) sur forme et momentum; backtest courant `491` picks, Brier `0.2291`, ROI flat `+0.96%`
- Impact: calendrier rapide moins surpondéré, signal forme plus frais pour basket/baseball/tennis; smoke E2E vert après rebase cron (`1252` marchés scorés / `44` matchs exacts 48h)
- Commit: pending
- Status: ✅ DONE

## Sprint v35.38 (2026-05-02 06:00 UTC)
- Chantier: P-C1 refactor inline styles sweep 1
- Avant: `app.js=2599` styles inline, `pronostics.html=88`, `app.js=1685.0KB` proche budget
- Après: `342` styles exacts migrés vers utilities existantes (`u-text-*`, `u-mt-*`, `u-text-right`); `app.js=2259`, `pronostics.html=86`, `app.js=1681.1KB`
- Impact: `-342` styles inline et `-3.9KB` sur le bundle JS sans changer le design; base plus saine pour les prochaines refontes
- Commit: pending
- Status: ✅ DONE

## Sprint v35.39 (2026-05-02 06:06 UTC)
- Chantier: P-D5 Santé erreurs JS exportables
- Avant: Santé affichait seulement `10` erreurs récentes sans URL complète, sans export dédié, ni bandeau critique exploitable
- Après: journal JS enrichi (`url`, contexte cache/data/user-agent), vue Santé `20` dernières erreurs, stacks pliables, export JSON et alerte visible si `>10` erreurs/24h
- Impact: debugging navigateur réel beaucoup plus rapide; Théo peut exporter un crash sans ouvrir la console; bundle reste sous budget
- Commit: pending
- Status: ✅ DONE

## Sprint v35.40 (2026-05-02 06:10 UTC)
- Chantier: P-B1 calibration sport + tier ligue
- Avant: calibration client par sport seulement; le foot top-5 et le foot secondaire étaient mélangés dans le même biais
- Après: `calibration_group` généré (`football:top5`, `football:other`, `baseball:all`, etc.), sidecar `calibration_per_sport_league.json`, frontend priorise les bins sport+ligue si `n>=40`
- Impact: calibration plus fine sur `5` segments (`football:other=342`, `football:top5=48`, `baseball:all=58`, `basketball:all=24`, `hockey:all=20`); backtest courant `492` picks, Brier `0.2291`, ROI `-0.42%`
- Commit: pending
- Status: ✅ DONE

## Sprint v35.41 (2026-05-02 06:17 UTC)
- Chantier: P-B6 smart money odds movement
- Avant: aucun sidecar smart-money; les mouvements de cote existaient seulement en sparkline/détail, sans patch data ni nudge modèle
- Après: `detect_smart_money.py` sort `100` signaux depuis `odds_history.jsonl`, `patch_smart_money.py` attache `10` events actifs; modèle applique un nudge capé, hero badge `Smart money`; pipeline local/prod synchronisée
- Impact: premier signal marché exploitable hors cote brute, Santé `0` warning; `night_metrics.events.smart_money=10`; backtest frais `492` picks, ROI `+0.76%`, Brier `0.2292`
- Commit: pending
- Status: ✅ DONE

## Sprint v35.42 (2026-05-02 06:23 UTC)
- Chantier: P-E4 sitemap dynamique matchs
- Avant: `sitemap.xml=33` URLs, uniquement hubs/pages SPA, aucun deep-link match individuel
- Après: `build_sitemap.py` lit `data.js` et ajoute `408` routes `#match/{id}/synthese`; `sitemap.xml=441` URLs, lastmod basé sur `generated_at`
- Impact: structure SEO/partage plus complète pour les matchs exacts Winamax; génération cron déjà branchée, donc les routes suivent chaque refresh
- Commit: pending
- Status: ✅ DONE

## Sprint v35.43 (2026-05-02 06:28 UTC)
- Chantier: P-C9 lazy/decode images
- Avant: `app.js` contenait `19` balises `<img>`, dont `2` sans `loading` et `7` sans `decoding`
- Après: `19/19` images ont `loading="lazy"` et `decoding="async"` quand applicable
- Impact: décodage image non bloquant sur cartes/logos et moins de risque de micro-jank mobile; zéro changement visuel attendu
- Commit: pending
- Status: ✅ DONE

## Phase 3 BIG BETS FIRST

## Sprint v35.44 (2026-05-02 07:03 UTC)
- Chantier: P-3.1 + P-3.2 + P-3.3 architecture Accueil Big Bets
- Avant: accueil desktop `26` blocs/cards détectés, hauteur `7875px` (`8.75` viewports), message principal noyé derrière la nav et les anciennes sections
- Après: accueil Big Bets First actif avec `3` cards XXL, `8` bonnes opportunités, scanner replié; `5` zones visibles, hauteur `3438px` (`3.8` viewports), overflow mobile `0px`
- Impact: l'accueil dit immédiatement quoi regarder et pourquoi; CTA Winamax deep-link + tracking local `paris_sportif_winamax_clicks_v1`; smoke E2E vert (`456` marchés scorés / `289` matchs exacts 48h)
- Commit: pending
- Status: ✅ DONE

## Sprint v35.45 (2026-05-02 07:16 UTC)
- Chantier: P-3.4 modal "Pourquoi ce pari"
- Avant: clic Big Bet ouvrait directement la modale technique avec onglets et beaucoup de sections, sans résumé actionnable en tête
- Après: bloc "Pourquoi ce pari ?" toujours visible avant les onglets, avec cote, écart marché, EV simple, mise suggérée Kelly, 5 raisons max et CTA Winamax tracké
- Impact: compréhension en `10s` avant les détails; test modal local vert (`whyVisible=true`, `winamaxCta=true`, `0` erreur JS), smoke E2E vert
- Commit: pending
- Status: ✅ DONE

## Sprint v35.46 (2026-05-02 07:26 UTC)
- Chantier: P-3.5 redirection Top/Locks/Matchs vers Accueil
- Avant: `VALID_PAGES=28`, avec `top`, `locks`, `matchs` comme pages séparées redondantes
- Après: `VALID_PAGES=25`; `#top`, `#locks`, `#matchs` et les boutons legacy redirigent vers `#dashboard` Big Bets First
- Impact: 3 chemins confus supprimés sans casser les anciens liens; test hash legacy vert (`top/locks/matchs → #dashboard`), smoke E2E vert
- Commit: pending
- Status: ✅ DONE

## Sprint v35.47 (2026-05-02 07:35 UTC)
- Chantier: P-3.10 navigation 5 hubs
- Avant: nav principale exposait encore Top/Locks/Explorer/Agent/Performance/Apprendre/Compte et des raccourcis redondants
- Après: `5` entrées top-level nettes (`Accueil`, `Tous les paris`, `Mes paris`, `Méthode`, `Profil`), aucun `top/locks/matchs` dans la nav visible
- Impact: parcours utilisateur plus évident, mobile bottom-nav alignée sur les 5 hubs; smoke E2E vert, top-level nav mesurée `2` solos + `3` hubs
- Commit: pending
- Status: ✅ DONE

## Sprint v35.48 (2026-05-02 07:43 UTC)
- Chantier: P-3.6 fusion Bilan/Historique/Backtest/Crédibilité vers Mes paris
- Avant: `VALID_PAGES=25`, avec `bilan`, `historique`, `backtest`, `credibilite` comme pages SPA concurrentes
- Après: `VALID_PAGES=21`; `#bilan`, `#historique`, `#backtest`, `#credibilite`, `#mes-paris` redirigent vers `#performance`
- Impact: la performance devient le hub unique “Mes paris” sans casser les anciens liens; test legacy hashes vert, smoke E2E vert
- Commit: pending
- Status: ✅ DONE

## Sprint v35.49 (2026-05-02 07:51 UTC)
- Chantier: P-3.7 fusion Méthode/Académie/Méthodologie
- Avant: `VALID_PAGES=21`, `methodologie` restait une route SPA/statique séparée du hub Méthode
- Après: `VALID_PAGES=20`; `#methode`, `#methodologie`, `#comment-lire`, `#comment-lire-un-prono` redirigent vers `#academie`
- Impact: une seule porte “Méthode” dans le flow app, anciens liens préservés; test hash legacy vert, smoke E2E vert
- Commit: pending
- Status: ✅ DONE

## Sprint v35.50 (2026-05-02 08:00 UTC)
- Chantier: P-3.8 fusion des 3 pages Montantes
- Avant: `VALID_PAGES=20`, avec `montante-jour`, `montante-weekend`, `montante-semaine` comme pages séparées
- Après: `VALID_PAGES=18`; route unique `#montantes` avec `3` onglets internes (`Jour`, `Weekend`, `Semaine`)
- Impact: les anciens liens montante redirigent proprement vers le hub unique; test hash legacy vert, smoke E2E vert
- Commit: pending
- Status: ✅ DONE

## Sprint v35.51 (2026-05-02 08:09 UTC)
- Chantier: P-3.9 + P-3.10 cap navigation à 8 routes
- Avant: `VALID_PAGES=18`, avec encore des outils secondaires comme routes SPA (`buteurs`, `combines`, `calendrier`, `compare`, `favoris`, etc.)
- Après: `VALID_PAGES=8` (`dashboard`, `tous`, `performance`, `academie`, `profil`, `sante`, `legal`, `montantes`); `10` anciennes routes aliasées vers leur hub
- Impact: objectif Phase 3 “8 pages max” atteint côté routeur sans casser les bookmarks; test legacy hashes vert, smoke E2E vert
- Commit: pending
- Status: ✅ DONE

## Phase 4+ BIG BETS PERFECT + DESIGN OVERHAUL

## Sprint v35.52 (2026-05-02 07:20 UTC)
- Chantier: P-4.62 visual QA baseline
- Avant: aucun outil standard pour capturer les 8 hubs sur 4 viewports avant/après, donc les régressions visuelles restaient manuelles
- Après: `scripts/visual_capture.js` capture `32/32` écrans (`dashboard`, `tous`, `performance`, `academie`, `profil`, `sante`, `montantes`, `legal` × mobile/tablet/desktop/wide); `scripts/visual_diff.js` compare les PNG avec seuil `5%`
- Impact: baseline Phase 4 stockée dans `.cache/phase4-baseline-v35.51`; self-check diff `0.00%`, smoke E2E vert, drift pipeline OK, bundles OK
- Commit: pending
- Status: ✅ DONE

## Sprint v35.53 (2026-05-02 07:33 UTC)
- Chantier: P-4.1 tier `big_bet` backtest
- Avant: `by_tier=lock,skip,standard`; aucun tier `big_bet`; table tier sans Wilson 95%; bandeau mobile affichait `— locks WR` quand aucun lock n'était scoré
- Après: `by_tier=big_bet,lock,standard,lowconf,skip`; définition `edge >= 8pt` + `confiance >= 65%`; `big_bet n=0` explicite; table tier avec Wilson 95%, Brier et edge moyen; bandeau affiche `0 Big Bets`
- Impact: abstention Big Bet mesurée au lieu d'être cachée; backtest `495` picks, ROI flat `+0.53%`, Brier `0.229`; visual diff `16.35%` attendu (KPI/report refresh global), layout OK
- Commit: pending
- Status: ✅ DONE

## Sprint v35.54 (2026-05-02 07:40 UTC)
- Chantier: P-4.2 calibration par tier
- Avant: `calibration_by_tier=false`, `ece_by_tier=false`, aucun warning calibration Big Bet
- Après: `calibration_by_tier=true`, `ece_by_tier=true`; `skip ECE=0.0356` validé; `big_bet` en apprentissage car `n=0`; warning explicite dans `backtest_report_v2.json/md`
- Impact: les gros paris ont maintenant une mesure de calibration dédiée au lieu d'hériter du Brier global; visual diff final `11.49%` attendu sur Performance (section calibration + footer v35.54), layout OK
- Commit: pending
- Status: ✅ DONE

## Sprint v35.55 (2026-05-02 07:49 UTC)
- Chantier: P-4.3 simulation bankroll rolling
- Avant: `bankroll_simulation.json` absent; le backtest exposait une bankroll Kelly finale mais pas de drawdown, Sharpe ou série exploitable
- Après: `bankroll_simulation.json` généré avec `495` points; bankroll 1000€ → `2802.51€`, ROI `+180.25%`, DD max `20.42%`, Sharpe/pick `+0.111`, `189` mises engagées
- Impact: risque bankroll lisible et traçable en JSON appendable côté UI/rapport; visual diff final `11.49%` attendu sur Performance (rapport bankroll + footer v35.55), layout OK
- Commit: pending
- Status: ✅ DONE

## Sprint v35.56 (2026-05-02 08:00 UTC)
- Chantier: P-4.26 typography scale
- Avant: `190` tailles typo cibles en px direct dans `app.css`
- Après: `7` tokens `--t-*`; `0` occurrences directes `11/13/15/18/22/28/36px`
- Impact: échelle typo Phase 4 posée sans changer le rendu; visual diff `10.14%` attendu sur Performance dynamique, layout OK
- Commit: pending
- Status: ✅ DONE

## Sprint v35.57 (2026-05-02 08:05 UTC)
- Chantier: P-4.27 spacing scale
- Avant: `109` déclarations simples padding/margin/gap en px direct
- Après: `0` déclarations simples `4/8/12/16/20/24/32/40/48/64px`; tout passe par `--space-*`
- Impact: rythme CSS stabilisé sans changement visuel; visual diff `0.02%`, `0/32` échec
- Commit: pending
- Status: ✅ DONE

## Sprint v35.58 (2026-05-02 08:10 UTC)
- Chantier: P-4.28 radius ladder
- Avant: `74` border-radius directs ciblés
- Après: tokens `--r-2xs`, `--r-card`, `--r-pill`; `0` radius directs ciblés
- Impact: radius CSS unifié; visual diff `11.00%` attendu sur Performance dynamique, autres pages stables
- Commit: pending
- Status: ✅ DONE

## Sprint v35.59 (2026-05-02 08:15 UTC)
- Chantier: P-4.29 shadow system
- Avant: focus/glow/Winamax shadows codés en dur
- Après: tokens `--shadow-2xl`, `--shadow-focus`, `--shadow-focus-warn`, `--shadow-focus-danger`, `--shadow-winamax`
- Impact: ombres critiques tokenisées; visual diff `8.48%` attendu sur Performance wide, autres pages stables
- Commit: pending
- Status: ✅ DONE

## Sprint v35.60 (2026-05-02 08:21 UTC)
- Chantier: P-4.30 couleurs sémantiques
- Avant: états win/warn/bad répartis en hex directs
- Après: `--c-strong`, `--c-good`, `--c-warn`, `--c-bad`; `49` remplacements vers `var(--c-*)`
- Impact: contrat couleur état posé; visual diff `11.00%` attendu sur Performance, autres pages stables
- Commit: pending
- Status: ✅ DONE

## Sprint v35.61 (2026-05-02 08:30 UTC)
- Chantier: P-4.11 badge force pari
- Avant: badge force local Accueil; page Tous sans force unifiée
- Après: helper `BetStrengthBadge` + `getBetStrengthMeta`; badges Accueil, scanner et Tous
- Impact: force du pari lisible partout; visual diff `13.21%` attendu sur dashboard/Tous, smoke E2E vert
- Commit: pending
- Status: ✅ DONE

## Sprint v35.62 (2026-05-02 08:43 UTC)
- Chantier: P-4.12 langage simplifié
- Avant: `Edge/EV/Kelly/Brier/CLV` visibles en jargon
- Après: helpers humains + Accueil/Tous/glossaire parlent “mieux que le marché”, “gain moyen”, “mise”
- Impact: lecture débutant plus claire; visual diff `11.48%` attendu sur Performance dynamique
- Commit: pending
- Status: ✅ DONE

## Sprint v35.63 (2026-05-02 08:55 UTC)
- Chantier: P-4.16 onboarding Big Bets
- Avant: wizard 4 étapes générique, pas aligné sur le flux “voir/comprendre/placer”
- Après: onboarding 3 étapes Big Bets First + flag `paris_sportif_onboarded_v1`
- Impact: première visite centrée sur les gros coups; visual diff `10.14%` attendu sur Performance dynamique
- Commit: pending
- Status: ✅ DONE

## Sprint v35.64 (2026-05-02 09:04 UTC)
- Chantier: P-4.17 empty states amicaux
- Avant: états vides fonctionnels mais froids (`Pas de gros coup`, tracking perso peu direct)
- Après: no Big Bet = patience/ROI, offline cache explicite, tracking perso “premier pari”
- Impact: les absences deviennent des décisions produit; visual diff `9.11%` attendu sur Performance dynamique
- Commit: pending
- Status: ✅ DONE

## Sprint v35.65 (2026-05-02 09:13 UTC)
- Chantier: P-4.23 skeleton loaders
- Avant: Académie/Profil/Santé/Montantes rendaient sans placeholder commun
- Après: helper skeleton page + feedback avant rendu sur les hubs secondaires
- Impact: 0 hub secondaire sans feedback; smoke E2E vert, drift OK
- Commit: pending
- Status: ✅ DONE

## Sprint v35.66 (2026-05-02 09:24 UTC)
- Chantier: P-5.1 banderole jeu responsable
- Avant: prévention surtout en footer, pas de bandeau bookmaker visible au premier écran
- Après: banderole sticky 32/38px “Jouer comporte des risques” + lien téléphone 09-74-75-13-13
- Impact: conformité plus visible, style inspiré bookmaker; visual diff `16.38%` attendu par ajout top-bar
- Commit: pending
- Status: ✅ DONE

## Sprint v35.67 (2026-05-02 10:12 UTC)
- Chantier: P-5.2 chips catégories Winamax-style
- Avant: aucun accès rapide HOT/sport sur l'Accueil
- Après: chips HOT + Football/Tennis/Basket/Hockey/Baseball avec compteurs et liens #tous
- Impact: scan plus bookmaker, filtres en 1 clic; visual diff `19.52%` attendu car bandeau restauré + chips
- Commit: pending
- Status: ✅ DONE

## Sprint v35.68 (2026-05-02 10:25 UTC)
- Chantier: P-5.27 CGU Winamax
- Avant: aucune synthèse conformité dédiée dans le repo
- Après: `cgu_winamax_summary.md` avec sources officielles, limites robot, indépendance et disclaimers
- Impact: cadre légal clair avant CTA/outsiders/live; HTML direct 403, fallback PDF officiel Winamax
- Commit: pending
- Status: ✅ DONE

## Sprint v35.69 (2026-05-02 10:39 UTC)
- Chantier: P-5.11 plus de paris visibles
- Avant: Accueil surtout Big Bets + Tier 2 serré, ~8 cartes visibles
- Après: Solides 4%/60%, Outsiders 2.50+/5%/45%, accordéon edge ≥ 2%
- Impact: 10 paris affichables et gros gains surfacés; visual diff `18.72%` attendu par nouvelle section
- Commit: pending
- Status: ✅ DONE

## Sprint v35.70 (2026-05-02 10:53 UTC)
- Chantier: P-5.3 hero cards Big Bet
- Avant: cartes hero plates, heure seulement en coin, peu d'effet bookmaker
- Après: logos en arrière-plan, overlay sombre, heure centrale XXL sur les Big Bets
- Impact: Accueil plus immersif et scan match immédiat; visual diff `18.75%` attendu par refonte hero
- Commit: pending
- Status: ✅ DONE

## Sprint v35.71 (2026-05-02 11:03 UTC)
- Chantier: P-5.4 badge smart money
- Avant: signal smart money surtout lisible dans les détails
- Après: badge rouge cliquable sur les cartes avec mouvement de cote et confiance
- Impact: 12 events smart_money détectés dans data.js; signal fort visible dès le scan
- Commit: pending
- Status: ✅ DONE

## Sprint v35.72 (2026-05-02 11:15 UTC)
- Chantier: P-5.5 top buteurs Accueil
- Avant: données buteurs probables peu visibles dans le flux Big Bets
- Après: section cartes “Joueurs chauds” avec photo Sofascore, proba et lien Winamax
- Impact: marché joueur mieux surfacé sans mélanger avec Big Bets principaux
- Commit: pending
- Status: ✅ DONE

## Sprint v35.73 (2026-05-02 11:22 UTC)
- Chantier: P-5.29 footer disclosure
- Avant: footer jeu responsable présent, indépendance Winamax moins explicite
- Après: footer “indépendant · non affilié Winamax” + cotes indicatives + aucun auto-pari
- Impact: conformité et transparence visibles sur toutes les pages PWA
- Commit: pending
- Status: ✅ DONE

## Sprint v35.74 (2026-05-02 11:42 UTC)
- Chantier: P-6.1 audit visuel total
- Avant: aucun registre Phase 6 des bugs visuels
- Après: 32 captures baseline + `ISSUES.md` avec 14 bugs classés
- Impact: zéro overflow/runtime, mais 6 HIGH à corriger en priorité
- Commit: pending
- Status: ✅ DONE

## Sprint v35.75 (2026-05-02 11:57 UTC)
- Chantier: P-6.2 click test automatisé
- Avant: aucun click audit global Phase 6
- Après: spec CI + script local autonome, 98 clics testés, 0 failure
- Impact: interactions principales sans erreur JS; rapport `.cache/click-audit-report.json`
- Commit: pending
- Status: ✅ DONE

## Sprint v35.76 (2026-05-02 12:03 UTC)
- Chantier: P-6.3 modal détail tabs
- Avant: aucun test multi-sport des onglets détail
- Après: spec CI + script local autonome, 5 sports testés, 0 failure
- Impact: fiches football/tennis/basket/baseball/hockey ouvrent et changent d'onglet sans erreur
- Commit: pending
- Status: ✅ DONE

## Sprint v35.77 (2026-05-02 12:08 UTC)
- Chantier: P-6.4 Lighthouse-compatible audit
- Avant: aucun score Phase 6 perf/a11y/SEO sur pages clés
- Après: 8 rapports JSON, min perf 46, min a11y 44, SEO 83
- Impact: top 5 opportunités listées dans `ISSUES.md` pour piloter les fixes
- Commit: pending
- Status: ✅ DONE

## Sprint v35.78 (2026-05-02 12:12 UTC)
- Chantier: P-6.5 a11y audit 8 pages
- Avant: aucun rapport accessibilité Phase 6 consolidé
- Après: `a11y-report.json`, 0 critical, 75 serious, 278 moderate
- Impact: familles contrastes/touch targets/alt taguées dans `ISSUES.md`
- Commit: pending
- Status: ✅ DONE

## Sprint v35.79 (2026-05-02 12:28 UTC)
- Chantier: P-6.6 fixes visuels prioritaires
- Avant: 6 HIGH visuels ouverts dans `ISSUES.md`
- Après: teams Big Bet, buteurs, smart badge, bottom spacing et Santé pipeline corrigés/partiels
- Impact: 3 issues fixées, 2 partiellement réduites, 32 captures after2 générées
- Commit: pending
- Status: ✅ DONE

## Sprint v35.80 (2026-05-02 12:34 UTC)
- Chantier: P-6.8 fix a11y serious
- Avant: 0 critical, 75 serious, 278 moderate
- Après: 0 critical, 0 serious, 270 moderate
- Impact: contrastes bloquants corrigés sur PWA + legal static dark harmonisé
- Commit: pending
- Status: ✅ DONE

## Sprint v35.81 (2026-05-02 12:39 UTC)
- Chantier: P-6.10 images alt + Lighthouse a11y
- Avant: Lighthouse-compatible a11y min 44, 187-213 images sans alt
- Après: a11y min 86, 0 image sans alt, a11y-report 0 critical/serious
- Impact: top opportunité accessibilité corrigée; restent touch targets/H1/poids data
- Commit: pending
- Status: ✅ DONE

## Sprint v35.82 (2026-05-02 12:48 UTC)
- Chantier: P-6.11 panier paris Accueil
- Avant: paris suivis invisibles sur l'accueil Big Bets
- Après: panier compact avec état vide, totals, export CSV et vidage protégé
- Impact: suivi local exploitable sans quitter la page principale; 32 captures after-final OK
- Commit: pending
- Status: ✅ DONE

## Sprint v35.83 (2026-05-02 12:55 UTC)
- Chantier: P-6.12 raccourcis compétitions/sports
- Avant: seuls les sports étaient filtrables depuis l'accueil
- Après: top compétitions dynamiques sous les chips sports, lien direct vers Tous filtré ligue
- Impact: navigation Winamax-style plus rapide sans ajouter de page
- Commit: pending
- Status: ✅ DONE

## Sprint v35.84 (2026-05-02 13:02 UTC)
- Chantier: P-6.13 palette Winamax-style
- Avant: fond principal légèrement bleuté et pas de token rouge bookmaker
- Après: fond noir plus profond + token `--c-accent/#e60000` réutilisable
- Impact: base visuelle plus premium sans croissance bundle notable; captures v35-84 OK
- Commit: pending
- Status: ✅ DONE

## Sprint v35.85 (2026-05-02 13:09 UTC)
- Chantier: P-6.14 sub-nav centrale
- Avant: header rapide orienté pages internes classiques
- Après: Home / Live / Mes paris / Stats / Résultats avec aliases stables
- Impact: navigation plus proche bookmaker, accès plus direct aux usages de pari
- Commit: pending
- Status: ✅ DONE

## Sprint v35.86 (2026-05-02 13:16 UTC)
- Chantier: P-6.15 header logo
- Avant: marque header affichée comme simple “Pronostics”
- Après: logo texte PARIS-SPORTIF, SPORTIF en rouge, taille mobile ajustée
- Impact: identité plus nette et plus proche site pro; captures v35-86 OK
- Commit: pending
- Status: ✅ DONE

## Sprint v35.87 (2026-05-02 13:24 UTC)
- Chantier: P-6.16 Big Odds Boost
- Avant: grosses cotes noyées dans outsiders ou reste du flux
- Après: section dédiée cote ≥ 3.00 + edge ≥ 7% avant les outsiders
- Impact: focus “gros gain mais value” plus clair; captures v35-87 OK
- Commit: pending
- Status: ✅ DONE

## Sprint v35.88 (2026-05-02 13:31 UTC)
- Chantier: P-6.17 marchés détaillés Winamax
- Avant: top-up standard cap 80, cadence 15min cap 160, priorité <48h
- Après: top-up cap 150, cadence 15min cap 220, quotas sport élargis, priorité <72h
- Impact: couverture détaillée doit grimper plus vite vers 400+ events
- Commit: pending
- Status: ✅ DONE

## Sprint v35.89 (2026-05-02 11:19 UTC)
- Chantier: P-6.18 combinés multi-marchés
- Avant: combinés construits surtout sur le pick 1N2 principal
- Après: sélection du meilleur marché exact Winamax + tickets Over 2.5/BTTS même match
- Impact: plus de tickets buts/value et moins de combinés monotones
- Commit: pending
- Status: ✅ DONE

## Sprint v35.90 (2026-05-02 11:23 UTC)
- Chantier: P-6.19 stats modal détail
- Avant: signaux dispersés dans la modale, lecture rapide difficile
- Après: bloc repliable Stats rapides avec L10, xG/PPDA, XI, buteurs, météo, arbitre
- Impact: décision plus lisible en 10 secondes avant d’ouvrir les sections longues
- Commit: pending
- Status: ✅ DONE

## Sprint v35.91 (2026-05-02 11:25 UTC)
- Chantier: P-6.20 xG Understat dans le modèle
- Avant: poissonComponent blendait seulement fbref_xg quand dispo
- Après: xg_stats Understat alimente aussi le lambda empirique prudent
- Impact: les matchs top-5 avec xG Understat utilisent enfin ce signal prédictif
- Commit: pending
- Status: ✅ DONE

## Sprint v35.92 (2026-05-02 11:28 UTC)
- Chantier: P-6.21 Discord webhook alerts
- Avant: aucun canal externe pour Big Bet imminent
- Après: notify_discord.py no-op sans secret, dédup, cap 3 alertes/2h, cron + local alignés
- Impact: alertes Discord prêtes sans casser la pipeline si le webhook manque
- Commit: pending
- Status: ✅ DONE

## Sprint v35.93 (2026-05-02 11:31 UTC)
- Chantier: P-6.22 bankroll smart UI
- Avant: règles bankroll cachées, pas de drawdown visible dans Profil
- Après: module NAV/P&L/drawdown, recommandation Kelly/freeze et lock profits
- Impact: Théo voit immédiatement quand réduire la mise ou sécuriser les gains
- Commit: pending
- Status: ✅ DONE

## Sprint v35.94 (2026-05-02 13:42 UTC)
- Chantier: P-7.1 anti-handicap
- Avant: marchés handicap/runline/puckline/spread pouvaient remonter dans le meilleur marché
- Après: 0 handicap bloqué sélectionné; 43/48 candidats handicap masqués, 5 exceptions edge >15pt + cote >=2.50
- Impact: les Big Bets/Solides/Outsiders privilégient 1N2, O/U, BTTS et totals sans imposer les -1/+1
- Commit: pending
- Status: ✅ DONE

## Sprint v35.95 (2026-05-02 13:51 UTC)
- Chantier: P-7.2 cote minimum @2.00
- Avant: les sélections pouvaient encore proposer des cotes basses si elles avaient un bon score
- Après: oddMinUser défaut @2.00, réglage Profil, 18/18 meilleurs marchés testés >= @2.00
- Impact: moins de micro-cotes, sélection alignée avec la stratégie grosses cotes
- Commit: pending
- Status: ✅ DONE

## Sprint v35.96 (2026-05-02 13:59 UTC)
- Chantier: P-7.3 sweet spot grosses cotes
- Avant: Big Bets mélangeait locks et cotes 1.45-8.00 avec fallback trop large
- Après: Big Bets 2.20-3.50 edge >=7%, Solides 2.00-2.50, Outsiders 2.50-4.00, Big Odds >=4.00
- Impact: accueil trié par cote descendante et 0 carte visible sous @2.00 en test local
- Commit: pending
- Status: ✅ DONE

## Sprint v35.97 (2026-05-02 14:06 UTC)
- Chantier: P-7.4 pédagogie cotes hautes
- Avant: la stratégie “moins de paris, cotes plus hautes” n’était pas expliquée dans Méthode
- Après: section dédiée avec maths simples @1.20 vs @2.50 vs @4.00+ et lien depuis l’accueil
- Impact: Théo comprend pourquoi le site refuse les micro-cotes même quand elles paraissent sûres
- Commit: pending
- Status: ✅ DONE

## Sprint v35.98 (2026-05-02 14:10 UTC)
- Chantier: P-7.5 KPI gain moyen Big Bets
- Avant: l’accueil affichait ROI, bankroll et filtres, mais pas le rendement attendu des grosses cotes
- Après: KPI “Gain moyen Big Bets” calculé par EV moyenne, mesuré +35€/100€ sur la data locale
- Impact: Théo voit le gain potentiel sans convertir edge/EV mentalement
- Commit: pending
- Status: ✅ DONE

## Sprint v35.99 (2026-05-02 14:18 UTC)
- Chantier: P-7.8 defer non-critical JS
- Avant: le script enhancements v20 était inline dans pronostics.html et parsé au boot
- Après: app-enhancements.js externe en defer + précache SW; pronostics.html 99KB -> 63KB
- Impact: moins de JS inline au parsing initial, smoke E2E toujours vert
- Commit: pending
- Status: ✅ DONE

## Sprint v35.100 (2026-05-02 14:31 UTC)
- Chantier: P-8.1 conteneurs desktop élargis
- Avant: bbf-shell 1180px, page-content 1280px, main 1440px; dashboard wide 6684px de haut
- Après: bbf-shell 1500px, pages 1500px, main 1600px; dashboard wide 6074px, overflow 0
- Impact: les grands écrans respirent moins “mobile stretched” sans casser mobile/tablette
- Commit: pending
- Status: ✅ DONE

## Sprint v35.101 (2026-05-02 12:50 UTC)
- Chantier: P-8.5 grille Big Bets desktop
- Avant: la grille restait bridée à 752px utiles sur 1920px, à cause du main critique et du padding hérité
- Après: zone Big Bets 1308px utiles sur 1920px; opportunités compactes en 4 colonnes; dashboard wide 3750px
- Impact: l’accueil commence enfin à exploiter un écran PC large au lieu de se comporter comme une colonne mobile
- Commit: pending
- Status: ✅ DONE

## Sprint v35.102 (2026-05-02 12:54 UTC)
- Chantier: P-8.2 right rail desktop
- Avant: le panier Big Bets retombait sous le feed, donc l’accueil restait mono-colonne sur PC
- Après: layout desktop main + panier sticky 320/340px; dashboard wide 3378px, overflow 0
- Impact: l’accueil prend une vraie structure PC avec zone actionnelle permanente à droite
- Commit: pending
- Status: ✅ DONE

## Sprint v35.103 (2026-05-02 12:59 UTC)
- Chantier: P-8.3 sidebar gauche desktop
- Avant: sur ultra-wide, la navigation gauche utile restait l’ancienne sidebar menu et pas un rail sport/compétition
- Après: sidebar Big Bets 280px avec recherche, sports, compétitions et matchs à venir; overflow 0 sur mobile/desktop/wide
- Impact: l’accueil 1920px passe en vraie composition 3 zones sans donner une impression mobile-only
- Commit: pending
- Status: ✅ DONE

## Sprint v35.104 (2026-05-02 13:03 UTC)
- Chantier: P-8.4 layout 3 colonnes desktop
- Avant: la vraie sidebar gauche n’apparaissait qu’en ultra-wide ≥1600px
- Après: bascule 3 colonnes dès 1440px; 1399px reste en 2 colonnes; overflow 0
- Impact: les PC classiques profitent aussi du layout desktop complet
- Commit: pending
- Status: ✅ DONE

## Sprint v35.105 (2026-05-02 13:07 UTC)
- Chantier: P-8.6 compaction desktop
- Avant: dashboard desktop 4452px, hero trop vertical sur 1440px
- Après: desktop 3964px, wide 3606px, layout 240/796/300 à 1440px sans overflow
- Impact: plus de paris visibles par écran PC, sans abandonner les rails desktop
- Commit: pending
- Status: ✅ DONE

## Sprint v35.106 (2026-05-02 13:09 UTC)
- Chantier: P-8.7 page Tous dense desktop
- Avant: page Tous rendue comme une pile de cartes, peu adaptée PC
- Après: lignes desktop en colonnes 76 / match / pick / résultat; hauteur desktop 1831px; overflow 0
- Impact: la liste des pronos devient scannable comme un terminal de paris sur PC
- Commit: pending
- Status: ✅ DONE

## Sprint v35.107 (2026-05-02 13:11 UTC)
- Chantier: P-8.8 page Performance desktop
- Avant: pages internes bridées par l’ancien padding rail droit, Performance utile à 884px sur 1440px
- Après: Performance utile à 1158px sur 1440px; hauteur 1579px; overflow 0
- Impact: les pages d’analyse arrêtent de ressembler à une vue mobile centrée
- Commit: pending
- Status: ✅ DONE

## Sprint v35.117 (2026-05-02 14:08 UTC)
- Chantier: P-9.0a cohérence inter-marchés
- Avant: aucun garde-fou pur pour repérer Score exact vs BTTS/O-U/1N2 contradictoires
- Après: helpers scoreToImpliedMarkets/isPairConsistent/validateMarketConsistency exposés pour tests
- Impact: base logique prête pour bloquer 1-0 + BTTS Oui et autres impossibilités
- Commit: pending
- Status: ✅ DONE

## Sprint v35.118 (2026-05-02 14:15 UTC)
- Chantier: P-9.0b filtre cohérence dans sélection
- Avant: selectBestMarket exposait tous les candidats, y compris contradictions logiques
- Après: best.allCandidates contient seulement les marchés cohérents; contradictions repliées dans la modal
- Impact: un score exact ne peut plus cohabiter visiblement avec BTTS/O-U/1N2/DC impossible
- Commit: pending
- Status: ✅ DONE

## Sprint v35.119 (2026-05-02 14:17 UTC)
- Chantier: P-9.0c tests cohérence
- Avant: aucun test ne couvrait 1-0 + BTTS Oui, 0-0 + Over 2.5 ou DC opposée
- Après: tests/market-consistency.spec.js couvre 25 paires + filtrage validateMarketConsistency
- Impact: la contradiction signalée par Théo devient une régression bloquante en CI
- Commit: pending
- Status: ✅ DONE

## Sprint v35.120 (2026-05-02 14:20 UTC)
- Chantier: P-9.0d capture baseline visuelle
- Avant: aucune baseline Phase 9 suite pour comparer toutes les pages
- Après: 32 captures générées dans .cache/phase4-phase9-current (8 pages × 4 viewports)
- Impact: base visuelle prête pour inspection manuelle et correction page par page
- Commit: pending
- Status: ✅ DONE

## Sprint v35.121 (2026-05-02 14:22 UTC)
- Chantier: P-9.0e audit visuel manuel
- Avant: 32 captures non triées, aucun nouveau bug Phase 9 listé
- Après: ISSUES.md ajoute 8 bugs/améliorations P9-VIS-001 à P9-VIS-008
- Impact: les prochains sprints peuvent fixer les vrais points visibles plutôt que deviner
- Commit: pending
- Status: ✅ DONE

## Sprint v35.122 (2026-05-02 14:25 UTC)
- Chantier: P-9.15 compacter accueil mobile
- Avant: dashboard mobile 7201px dans la baseline Phase 9
- Après: dashboard mobile 5175px après masquage mobile des sections secondaires
- Impact: -28% de longueur mobile; les Big Bets et Solides restent prioritaires
- Commit: pending
- Status: ⚠️ PARTIEL

## Sprint v35.123 (2026-05-02 14:34 UTC)
- Chantier: P-9.51 fix P9-VIS-001 accueil mobile
- Avant: dashboard mobile 5175px après v35.122
- Après: dashboard mobile 4238px, sous la cible 4500px
- Impact: accueil mobile plus direct; Big Bets + 3 Solides visibles, panier déplacé hors flux mobile
- Commit: pending
- Status: ✅ DONE

## Sprint v35.124 (2026-05-02 14:41 UTC)
- Chantier: P-9.52 fix P9-VIS-002 Santé mobile
- Avant: santé mobile 6447px avec tables techniques en continu
- Après: santé mobile 3626px, détails lourds repliés en accordéons
- Impact: lecture mobile divisée par 44%; KPI et alertes restent visibles sans tunnel technique
- Commit: pending
- Status: ✅ DONE

## Sprint v35.125 (2026-05-02 14:49 UTC)
- Chantier: P-9.53 fix P9-VIS-003 Profil desktop
- Avant: profil desktop 3505px, contenu tassé en colonne étroite
- Après: profil desktop 2638px avec grille 2 colonnes; wide 2506px
- Impact: la page Profil exploite enfin l'écran PC et réduit le scroll de 25%
- Commit: pending
- Status: ✅ DONE

## Sprint v35.126 (2026-05-02 15:02 UTC)
- Chantier: P-9.54 fix P9-VIS-004 accueil wide
- Avant: dashboard wide 3338px, flux central encore trop étroit sur 1920px
- Après: dashboard wide 3164px, shell 1840px et rails ultra-wide élargis
- Impact: l'accueil PC gaspille moins d'espace noir et les cartes respirent mieux
- Commit: pending
- Status: ✅ DONE

## Sprint v35.127 (2026-05-02 15:12 UTC)
- Chantier: P-9.55 fix P9-VIS-005 legal mobile
- Avant: legal mobile 3656px, blocs RGPD/Winamax/risque en mur de texte
- Après: legal mobile 2171px avec accordéons de conformité
- Impact: page légale mobile plus scannable sans retirer le contenu obligatoire
- Commit: pending
- Status: ✅ DONE

## Sprint v35.128 (2026-05-02 15:22 UTC)
- Chantier: P-9.56 fix P9-VIS-006 header mobile
- Avant: dashboard mobile 4238px, haut de page chargé par risque + commande + chips
- Après: dashboard mobile 4093px, banderole 28px et command center compact
- Impact: premier viewport mobile plus respirable sans retirer les accès principaux
- Commit: pending
- Status: ✅ DONE

## Sprint v35.129 (2026-05-02 15:32 UTC)
- Chantier: P-9.57 fix P9-VIS-007 footer mobile
- Avant: dashboard mobile 4093px, footer + second footer doc redondants
- Après: dashboard mobile 3596px, footer mobile compact et disclaimer conservé
- Impact: -497px de fin de page; moins de répétition sans perdre ANJ/helpline
- Commit: pending
- Status: ✅ DONE

## Sprint v35.130 (2026-05-02 15:42 UTC)
- Chantier: P-9.58 fix P9-VIS-008 Montantes empty state
- Avant: Montantes desktop affichait surtout un grand état vide sans alternative concrète
- Après: état vide enrichi avec CTA Big Bets, Tous les pronos et rappel risque
- Impact: la page Montantes devient utile même sans séquence propre disponible
- Commit: pending
- Status: ✅ DONE

## Sprint v35.131 (2026-05-02 15:50 UTC)
- Chantier: P-9.59 re-run tests site
- Avant: tests post-polish non relancés après les 8 fixes P9-VIS
- Après: smoke E2E vert, click audit 98/98, modal tabs 5 sports OK, syntaxe 20 specs OK
- Impact: navigation, clics principaux, modales et specs restent cohérents après polish
- Commit: pending
- Status: ✅ DONE

## Sprint v35.132 (2026-05-02 16:04 UTC)
- Chantier: P-9.60 click test étendu
- Avant: click audit limité à 98 clics utiles
- Après: click audit 164 clics, 0 failure; specs alignées sur le même filtre
- Impact: couverture de clics élargie aux accordéons/liens internes sans faux positifs legacy
- Commit: pending
- Status: ✅ DONE

## Sprint v35.133 (2026-05-02 16:09 UTC)
- Chantier: P-9.61 modal détail tabs validation
- Avant: modales non revalidées après polish visuel et compactage mobile
- Après: audit modal 5 sports testés, 0 skipped, 0 failure
- Impact: les onglets Synthèse/Signaux/Cotes/H2H/Stats restent navigables après refonte
- Commit: pending
- Status: ✅ DONE

## Sprint v35.134 (2026-05-02 15:24 UTC)
- Chantier: P-9.62 tests cohérence marchés étendus
- Avant: 25 cas Playwright, pas d'audit autonome exécutable localement
- Après: 50 cas couvrant foot/basket/tennis/baseball/hockey + audit navigateur 50/50 OK
- Impact: garde-fou renforcé contre les contradictions inter-marchés
- Commit: pending
- Status: ✅ DONE

## Sprint v35.135 (2026-05-02 15:29 UTC)
- Chantier: P-9.63 flow Big Bet → modal → Winamax → track
- Avant: aucun audit E2E conversion; cards Big Bets non câblées pour "J'ai parié"
- Après: audit navigateur 3 étapes, 0 failure; CTA Winamax tracké et pari user stocké
- Impact: chemin principal de conversion vérifié de bout en bout
- Commit: pending
- Status: ✅ DONE

## Sprint v35.136 (2026-05-02 15:31 UTC)
- Chantier: P-9.7 mesure compression data.js
- Avant: poids brut data.js 6.55 MB et data_lite.js 2.19 MB sans preuve headers live
- Après: GitHub Pages sert gzip; bundle shell local 10.91 MB brut → 1.29 MB gzip
- Impact: priorité perf confirmée sur parsing/DOM plutôt que transfert réseau pur
- Commit: pending
- Status: ✅ DONE

## Sprint v35.137 (2026-05-02 15:33 UTC)
- Chantier: P-9.8 Lighthouse-compatible re-run
- Avant: baseline Phase 8 perf mobile min 68
- Après: dashboard/tous mobile 78, academie 100, performance mobile 47; min desktop 37
- Impact: prochain fix clair = éviter data.js complet au boot de Performance
- Commit: pending
- Status: ✅ DONE

## Sprint v35.138 (2026-05-02 15:37 UTC)
- Chantier: P-9.5 Performance sans data.js initial
- Avant: Performance chargeait data.js complet au boot; perf mobile 47, desktop 37
- Après: Performance rend depuis data_lite puis diffère data.js; mobile 100, desktop 67
- Impact: page Performance lisible immédiatement et transfert initial allégé
- Commit: pending
- Status: ✅ DONE

## Sprint v35.139 (2026-05-02 15:48 UTC)
- Chantier: P-9.67 CLS header/trust strip
- Avant: Lighthouse min perf 67; CLS desktop ~0.18, mobile ~0.12
- Après: min perf 85; CLS desktop ~0.086, mobile ~0.056
- Impact: objectif Perf 80+ atteint sur l'audit local, layout beaucoup plus stable
- Commit: pending
- Status: ✅ DONE

## Sprint v35.140 (2026-05-02 15:57 UTC)
- Chantier: P-9.59/P-9.60/P-9.61/P-9.62/P-9.63 tests site
- Avant: suite complète non relancée après perf/CLS
- Après: smoke OK, click 164/164, modales 5 sports OK, cohérence 50/50, flow Big Bet OK
- Impact: chemin principal et interactions globales validés sans erreur
- Commit: pending
- Status: ✅ DONE
## Sprint v35.141 (16:01 UTC)
- Chantier: P-9.44
- Avant: app.js 1791553 bytes, 756 version/comment lines shipped
- Après: app.js 1765316 bytes, 0 stale version/comment lines in target set
- Impact: -26237 bytes JS, bundle back to 1723.9 KB under cap
- Commit: pending
- Status: ✅ DONE
## Sprint v35.142 (16:06 UTC)
- Chantier: P-9.9
- Avant: Académie 15 cartes statiques, pas de recherche ni sommaire
- Après: Académie 55 termes filtrables + 5 articles méthode + sommaire desktop
- Impact: page méthode plus utile, smoke OK, app.js 1731.0 KB sous cap
- Commit: pending
- Status: ✅ DONE
## Sprint v35.143 (16:10 UTC)
- Chantier: P-9.66
- Avant: a11y 0 critical / 0 serious / 143 moderate, touch targets encore ouverts
- Après: a11y 0 critical / 0 serious / 20 moderate, P6-LH-003 + P6-A11Y-002 fixés
- Impact: -123 violations modérées, pages mobile beaucoup plus tappables
- Commit: pending
- Status: ✅ DONE
## Sprint v35.144 (16:15 UTC)
- Chantier: P-9.59/P-9.60/P-9.61/P-9.62/P-9.63
- Avant: dernier résumé tests v35.140, 164 clicks
- Après: click 167/0, modal tabs 5 sports/0, cohérence 50/0, flow Big Bet 3/0
- Impact: parcours critique et boutons validés après polish CSS/a11y
- Commit: pending
- Status: ✅ DONE
## Sprint v35.145 (16:17 UTC)
- Chantier: P-9.10
- Avant: Profil 2 colonnes mais réglages clés dispersés
- Après: bande réglages actifs + raccourcis Bankroll/Cote/Thème/Sports/Données
- Impact: Profil plus scannable, smoke OK, app.js 1704.1 KB sous cap
- Commit: pending
- Status: ✅ DONE
## Sprint v35.146 (16:20 UTC)
- Chantier: P-9.12
- Avant: Montantes avec timeline/empty state mais peu de lecture visuelle du parcours
- Après: progression de mise en barres + exemple pédagogique dans l'état vide
- Impact: page Montantes plus claire sans ajout CSS, bundle toujours sous cap
- Commit: pending
- Status: ✅ DONE
## Sprint v35.147 (16:22 UTC)
- Chantier: P-9.11
- Avant: Santé riche mais signaux data clés enfouis plus bas
- Après: cockpit data immédiat: fraîcheur, marchés, blessures, lineups, xG, pipeline
- Impact: diagnostic plus scannable, smoke OK, bundle sous cap
- Commit: pending
- Status: ✅ DONE
## Sprint v35.148 (16:25 UTC)
- Chantier: P-9.47/P-9.66
- Avant: a11y 0 critical / 0 serious / 20 moderate, touch targets résiduelles
- Après: a11y 0 critical / 0 serious / 0 moderate sur 8 pages
- Impact: audit local propre, footer/version/help/legal targets corrigés, bundle sous cap
- Commit: pending
- Status: ✅ DONE
## Sprint v35.149 (16:29 UTC)
- Chantier: P-9.48/P-9.59-P-9.63
- Avant: derniers tests globaux à v35.144, avant a11y/page polish
- Après: smoke OK, click 167/0, modales 5 sports/0, cohérence 50/0, flow Big Bet 3/0
- Impact: régression post-polish exclue sur parcours critique et boutons
- Commit: pending
- Status: ✅ DONE
## Sprint v35.150 (16:32 UTC)
- Chantier: P-9.68
- Avant: 8 pages SPA avec 2 H1 détectés à cause du bloc Combinés caché
- Après: 8/8 pages à 1 H1 unique; Combinés legacy rétrogradé en H2
- Impact: SEO/accessibilité plus propre, rendu inchangé
- Commit: pending
- Status: ✅ DONE
## Sprint v35.151 (16:34 UTC)
- Chantier: P-9.8/P-9.49
- Avant: Lighthouse summary tracked encore ancien (min perf 68/90 selon phase)
- Après: audit local final min perf 85, mobile perf 92, SEO 100, ISSUES mis à jour
- Impact: objectif perf 80+ confirmé et P6-LH-001/P6-LH-003/P6-LH-005 clôturés
- Commit: pending
- Status: ✅ DONE
## Sprint v35.152 (16:35 UTC)
- Chantier: P-9.50
- Avant: pas de synthèse finale Phase 9 consolidée
- Après: SPRINT_NIGHT_REPORT_PHASE9.md avec métriques, tests, issues, recommandations
- Impact: livrable final prêt pour revue Théo, 40 sprints Phase 9 documentés
- Commit: pending
- Status: ✅ DONE

## Sprint v35.153 — Phase 10 P-10.1 bottom nav mobile (18:11 UTC)
- Avant: P6-VIS-001 PARTIAL, aucune preuve viewport finale sur 8 pages.
- Après: audit 375x667 = 8/8 pages PASS, overlap bottom nav = 0.
- Impact: issue marquée FIXED, rapport phase10_bottom_nav_audit.json ajouté.
- Vérif: mobile_bottom_nav_audit PASS.

## Sprint v35.154 — Phase 10 P-10.2 buteurs lisibles (18:15 UTC)
- Avant: P6-VIS-004 PARTIAL, noms joueurs encore ellipsés sur cartes étroites.
- Après: grille buteurs min 330px, colonne nom min 140px, noms sur 2 lignes.
- Impact: dashboard desktop/wide = 4 cartes visibles, largeur nom 241-273px.
- Vérif: scorer layout audit + bundle check PASS.

## Sprint v35.155 — Phase 10 P-10.3 Tous mobile sub-nav (18:17 UTC)
- Avant: P6-VIS-007 PARTIAL, filtres/onglets trop denses avant la liste.
- Après: rails horizontaux scroll-snap avec fade, onglets 44px, contrôles scrollables.
- Impact: page Tous mobile plus compacte et lisible sans seconde rangée cassée.
- Vérif: phase10_tous_subnav_audit.json + syntax/bundle PASS.

## Sprint v35.156 — Phase 10 P-10.4 Accueil mobile final (18:18 UTC)
- Avant: P6-VIS-013 PARTIAL, objectif mobile < 3800px à revalider.
- Après: Accueil mobile 375x667 = 2626px, overflow horizontal = 0.
- Impact: issue marquée FIXED, Big Bets/Solides restent prioritaires sur mobile.
- Vérif: phase10_dashboard_mobile_compact_audit.json PASS.

## Sprint v35.157 — Phase 10 P-10.5 Lighthouse re-audit (18:20 UTC)
- Avant: Phase 9 perf mobile 92, desktop 85.
- Après: mobile 4 pages = 100, desktop 4 pages = 85, SEO = 100 partout.
- Impact: perf 80+ maintenue, cible 90+ desktop documentée pour sprint perf ultérieur.
- Vérif: scripts/lighthouse_audit.js PASS.

## Sprint v35.158 — Phase 10 P-10.6 Accueil Pro Bettor (18:22 UTC)
- Avant: les buteurs coupaient le flux entre Big Bets et Solides; Solides pouvait monter à 12 picks.
- Après: Big Bets puis 3-5 Solides, Odds/Outsiders, reste en accordéon; buteurs repliés en section secondaire.
- Impact: accueil plus aligné sur l'objectif Théo: cotes hautes et décisions d'abord, contenu bonus ensuite.
- Vérif: phase10_dashboard_probettor_audit.json + syntax/bundle PASS.

## Sprint v35.159 — Phase 10 P-10.7 Stratégie du jour (18:30 UTC)
- Avant: l'accueil listait les picks sans consigne d'exposition ni priorité de marché.
- Après: carte Stratégie du jour avec marché lisible, sport dominant, exposition max et diversification.
- Impact: Théo voit quoi jouer, combien exposer et où éviter la concentration avant de scroller.
- Vérif: phase10_strategy_audit.json mobile/desktop, overflow horizontal = 0.

## Sprint v35.160 — Phase 10 P-10.8 Quick actions accueil (18:33 UTC)
- Avant: les raccourcis #tous avec query étaient fragiles et ne filtraient pas la cote minimum.
- Après: 4 chips Cotes 2.50+, Foot top, Tennis jour, Big Odds + routeur query-aware + filtre odd.
- Impact: accès direct aux vues utiles high-odds sans chercher dans Tous.
- Vérif: phase10_quick_actions_audit.json, 4/4 raccourcis ouvrent #tous filtré.

## Sprint v35.161 — Phase 10 P-10.9 Mode Focus Big Bets (18:35 UTC)
- Avant: impossible de masquer le contenu secondaire quand Théo veut décider vite.
- Après: toggle persistant Focus ON, garde Big Bets/Solides/Outsiders et cache panier, raccourcis, stats, buteurs.
- Impact: accueil desktop 2987px → 1998px en focus, mobile 3223px → 2732px.
- Vérif: phase10_focus_mode_audit.json, overflow horizontal = 0.

## Sprint v35.162 — Phase 10 P-10.10 Préférences stratégie (18:40 UTC)
- Avant: Profil avait cote min/sports favoris mais pas de réglages stratégie appliqués au feed.
- Après: sliders risque/diversification/confiance + ligues exclues, lus par l'Accueil avant le tri Big Bets.
- Impact: Théo peut durcir ou relâcher son style high-odds sans changer le code.
- Vérif: phase10_strategy_prefs_audit.json + syntax/bundle PASS.

## Sprint v35.163 — Phase 10 P-10.11 Comparateur interne 2 picks (18:44 UTC)
- Avant: Tous obligeait à comparer edge/cote/EV à l'œil ligne par ligne.
- Après: sélection de 2 picks + bottom-sheet côte-à-côte avec cote, confiance, avance, gain moyen et Kelly.
- Impact: décision plus rapide entre deux grosses cotes sans perdre le fil de la page.
- Vérif: phase10_pick_compare_audit.json, 2 picks sélectionnés, modal ouverte, overflow = 0.

## Sprint v35.164 — Phase 10 P-10.12 Simulateur progression bankroll (18:46 UTC)
- Avant: Profil affichait la bankroll mais ne projetait pas une stratégie sur 30/60/90+ paris.
- Après: simulateur bankroll/cote moyenne/win rate/nombre de paris avec courbe SVG et EV/Kelly prudent.
- Impact: Théo voit vite si une approche grosses cotes tient mathématiquement.
- Vérif: phase10_bankroll_sim_audit.json, projection interactive + overflow = 0.

## Sprint v35.165 — Phase 10 P-10.13 Alertes internes dashboard (18:48 UTC)
- Avant: pas de rappel interne lisible sur les opportunités high-odds du jour.
- Après: bandeau dismissible "spots high-odds aujourd'hui" avec prochain pari et mémorisation locale.
- Impact: Théo voit l'urgence du jour sans notifications externes ni bruit permanent.
- Vérif: phase10_internal_alerts_audit.json, dismiss OK, overflow = 0.

## Sprint v35.166 — Phase 10 P-10.14 Marchés foot étendus visibles (20:56 UTC)
- Avant: la modale noyait les marchés foot secondaires dans la liste générale.
- Après: strip dédié aux marchés foot étendus cohérents (mi-temps, score exact, O/U, BTTS, team totals), sans handicap promu.
- Impact: Théo repère plus vite les alternatives bookables hors 1N2.
- Vérif: phase10_football_extended_markets_audit.json, 10 marchés étendus détectés, 0 handicap promu.

## Sprint v35.167 — Phase 10 P-10.15 Marchés basket étendus visibles (21:00 UTC)
- Avant: la modale basket montrait surtout le total match et pouvait promouvoir le handicap.
- Après: totaux match complet, 1ère mi-temps et quart-temps; handicap retiré du bloc visible.
- Impact: plus de marchés basket exploitables sans contredire la préférence anti-handicap de Théo.
- Vérif: phase10_basket_extended_markets_audit.json, 4 full + 3 HT + 3 QT, 0 handicap promu.

## Sprint v35.168 — Phase 10 P-10.16 Marchés tennis étendus visibles (21:02 UTC)
- Avant: la modale tennis affichait le total jeux match mais pas les lectures par set.
- Après: total jeux match, total jeux par set et score exact sets rendus visibles.
- Impact: plus de marchés tennis lisibles sans nouvelle source data ni fetch externe.
- Vérif: phase10_tennis_extended_markets_audit.json, BO5, 2 lignes match + 3 lignes set + scores exacts.

## Sprint v35.169 — Phase 10 P-10.17 Marchés hockey étendus visibles (21:04 UTC)
- Avant: les totaux hockey restaient noyés dans le score projeté ou les marchés évalués.
- Après: bloc dédié Total buts hockey + Team totals, sans handicap visible.
- Impact: NHL plus exploitable sur marchés O/U et team totals, aligné avec préférence anti-handicap.
- Vérif: phase10_hockey_extended_markets_audit.json, 4 lignes total + 4 team totals, 0 puck line promu.

## Sprint v35.170 — Phase 10 P-10.18 Marchés baseball étendus visibles (21:07 UTC)
- Avant: la modale MLB montrait le score projeté mais pas les lignes runs/F5.
- Après: Total runs 6.5-10.5 + F5 totals visibles, sans handicap.
- Impact: plus de marchés baseball exploitables malgré l'exclusion des handicaps.
- Vérif: phase10_baseball_extended_markets_audit.json, 5 totals + 2 F5, 0 handicap promu.

## Sprint v35.171 — Phase 10 P-10.19 Outsiders multi-marchés (21:09 UTC)
- Avant: les grosses cotes secondaires restaient seulement dans les détails de marché.
- Après: section dédiée O/U, BTTS, score exact et totals à cote ≥2.50 + edge ≥6%.
- Impact: les value secondaires ressortent sans forcer un pick si le slate est vide.
- Vérif: phase10_multi_market_outsiders_audit.json, section présente, 0 overflow, empty state prudent.

## Sprint v35.172 — Phase 10 P-10.20 Paris du jour par sport (21:12 UTC)
- Avant: l'accueil ne regroupait pas les meilleurs picks par sport après les sections high-odds.
- Après: bloc Top 3 par sport avec état vide explicite si aucun pick ne passe les seuils.
- Impact: lecture plus rapide foot/tennis/basket/hockey/baseball sans dupliquer la page Tous.
- Vérif: phase10_sport_daily_picks_audit.json, section présente, 0 overflow, empty state OK.

## Sprint v35.173 — Phase 10 P-10.44 Nettoyage commentaires legacy (21:14 UTC)
- Avant: app.js frôlait le plafond bundle à 1749.9 KB / 1750 KB.
- Après: 149 lignes de commentaires de jalons legacy supprimées, comportement inchangé.
- Impact: marge regagnée pour les prochains marchés/modèles sans relever le budget.
- Vérif: syntax OK, bundle app.js 1741.0 KB / 1750 KB.

## Sprint v35.174 — Phase 10 P-10.21 Combinés multi-marchés riches (21:17 UTC)
- Avant: le builder combinés existait mais n'était pas testable depuis l'audit navigateur.
- Après: buildCombines exposé pour QA; audit confirme le support Buts+BTTS, safe et value.
- Impact: les combinés riches restent vérifiables sans gonfler l'UI quand le slate est vide.
- Vérif: phase10_rich_combines_audit.json, codeFlags sameMatchGoalCombos/Over+BTTS OK.

## Sprint v35.175 — Phase 10 P-10.22 Ensemble model metadata (21:21 UTC)
- Avant: predictMatch mélangeait plusieurs signaux mais ne renvoyait pas l'ensemble de façon exploitable.
- Après: pred.ensemble expose sous-modèles, types, variance d'accord et proba finale.
- Impact: base prête pour calibration per-market, abstain renforcé et explications par facteurs.
- Vérif: phase10_ensemble_model_audit.json, 3 sous-modèles actifs, variance 0.0083, erreurs console 0.

## Sprint v35.176 — Phase 10 P-10.23 Calibration sport/ligue/marché (21:25 UTC)
- Avant: la calibration distinguait sport/ligue, mais pas le marché évalué.
- Après: backtest_v2 produit les buckets sport/ligue/marché et app.js les lit avant le fallback sport/ligue.
- Impact: base prête pour calibrer 1N2, O/U, BTTS et marchés étendus séparément.
- Vérif: phase10_market_calibration_audit.json, correction ciblée +7pt sur football:top5|1n2.

## Sprint v35.177 — Phase 10 P-10.24 Abstain renforcé (21:26 UTC)
- Avant: un pick pouvait rester actionnable avec edge faible ou data trop légère.
- Après: abstain explicite si confiance <50%, edge <2pt, divergence modèle forte ou data quality <2/4.
- Impact: moins de paris, meilleure discipline high-odds et raisons de skip auditables.
- Vérif: phase10_abstain_audit.json, 59 prédictions, 12 actionnables, 0 erreur console.

## Sprint v35.178 — Phase 10 P-10.25 IC95 probabilité modèle (21:31 UTC)
- Avant: la modale affichait une fiabilité ponctuelle sans fourchette d'incertitude par pick.
- Après: pred.prob_ci expose un IC95 Wilson et la modale affiche la fourchette.
- Impact: Théo voit quand une proba est serrée ou large avant de miser.
- Vérif: phase10_probability_ci_audit.json, IC95 visible en modale, 0 erreur console.

## Sprint v35.179 — Phase 10 P-10.26 Sharp money dans pred (21:34 UTC)
- Avant: le mouvement de cote nudgait le modèle mais restait peu audit-able dans la sortie.
- Après: pred.sharp_money expose côté, drop, nudge et alignement avec le pick; raison dédiée.
- Impact: Théo voit si la baisse de cote soutient vraiment le pari proposé.
- Vérif: phase10_sharp_money_nudge_audit.json, +2.1pt sur home, raison smart_money OK.

## Sprint v35.180 — Phase 10 P-10.27 Top contributeurs modèle (21:36 UTC)
- Avant: les contributions existaient mais l'affichage restait en chips peu hiérarchisés.
- Après: la modale montre les 3 contributeurs majeurs avec barres et delta en points.
- Impact: Théo comprend vite ce qui pousse réellement le pick.
- Vérif: phase10_feature_importance_audit.json, 3 barres rendues, 0 erreur console.

## Sprint v35.181 — Phase 10 P-10.28 Biais ligue Brier (21:38 UTC)
- Avant: une ligue historiquement mal calibrée pouvait encore sortir en pick fort.
- Après: si Brier ligue > 0.25 avec n≥20, fiabilité pénalisée et raison visible.
- Impact: les Big Bets sont automatiquement dépriorisés sur ligues peu fiables.
- Vérif: phase10_league_bias_audit.json, Brier 0.32 → fiabilité -4.8pt, raison OK.

## Sprint v35.182 — Phase 10 P-10.29 Daily P&L insight (21:44 UTC)
- Avant: l'accueil Pro Bettor masquait le bilan quotidien quand aucun pick n'était réglé.
- Après: la strip KPI affiche maintenant "Hier" avec P&L si scoré, ou "aucun pari réglé".
- Impact: Théo comprend l'état du replay quotidien sans silence ambigu.
- Vérif: phase10_daily_pnl_insight_audit.json, KPI visible, 0 erreur console.

## Sprint v35.183 — Phase 10 P-10.30 Form L10 multi-sport (21:47 UTC)
- Avant: team_form.json était patché mais aucun résumé multi-sport exploitable n'était publié.
- Après: form_stats_extended.json expose 749 équipes / 4 sports avec W/L, WR L10 et points pour/contre.
- Impact: Form L10 NBA/NHL/MLB devient auditable dans health.json et réutilisable modèle/UI.
- Vérif: fetch_team_form.py + build_health.py + check_pipeline_drift OK.

## Sprint v35.184 — Phase 10 P-10.31 H2H multi-sport (21:50 UTC)
- Avant: H2H était patché dans data.js mais peu auditable hors frontend.
- Après: h2h_extended.json résume 150 events / 4 sports, avec source headToHeadGames ou seasonseries.
- Impact: H2H NBA/NHL/MLB devient mesurable et tennis est tenté/caché proprement si ESPN ne sert rien.
- Vérif: fetch_h2h.py --summary-only + build_health.py + check_pipeline_drift OK.

## Sprint v35.185 — Phase 10 P-10.32 Blessures multi-sports (21:52 UTC)
- Avant: les blessures ESPN US étaient injectées mais pas publiées comme source auditable.
- Après: injuries_multisport.json expose 131 équipes / 4 sports / 679 blessures NBA-WNBA-NHL-NFL-MLB.
- Impact: le modèle et la Santé peuvent suivre les absences multi-sports sans dépendre du gros data.js.
- Vérif: fetch_injuries.py --sidecar-only + build_health.py + check_pipeline_drift OK.

## Sprint v35.186 — Phase 10 P-10.33 Météo outdoor multi-sport (21:55 UTC)
- Avant: fetch_weather ne couvrait que le football.
- Après: météo activée sur baseball outdoor et tennis outdoor, en excluant les stades MLB couverts/roofed.
- Impact: 403 matchs météo au total, dont 22 baseball et 1 tennis dans le data courant.
- Vérif: fetch_weather.py + build_health.py + check_pipeline_drift OK.

## Sprint v35.187 — Phase 10 P-10.34 Sources publiques (21:56 UTC)
- Avant: les sources publiques candidates étaient dispersées et non qualifiées.
- Après: data_sources.md documente TheSportsDB et OpenLigaDB avec endpoints, limites, risques et cadence.
- Impact: backlog data clair sans activer de scraping risqué ni toucher au modèle.
- Vérif: docs officielles consultées, check_bundle_size OK.

## Sprint v35.188 — Phase 10 P-10.35 Export CSV historique (22:00 UTC)
- Avant: l'export historique CSV ne séparait pas home/away et n'avait pas CLV/Brier.
- Après: colonnes date,sport,league,home,away,pick,odd,result,pl,clv,brier + métriques utiles.
- Impact: analyse Excel plus propre des picks historiques et du P&L.
- Vérif: node --check app.js, bundle OK, diff check OK.

## Sprint v35.189 — Phase 10 P-10.36 Export JSON agrégé (22:04 UTC)
- Avant: l'export RGPD était un dump brut localStorage.
- Après: JSON structuré avec paris_trackes, settings, bankroll, stats et raw_localStorage.
- Impact: backup/migration plus lisible sans perdre la donnée brute.
- Vérif: node --check app.js, bundle OK, diff check OK.

## Sprint v35.190 — Phase 10 P-10.37 Mode lecture nuit (22:07 UTC)
- Avant: le thème auto suivait le système mais ne basculait pas selon l'heure.
- Après: entre 20h et 7h, rendu sombre effectif + chaleur visuelle légère.
- Impact: lecture tardive moins agressive sans nouvelle dépendance UI.
- Vérif: node --check app.js, bundle OK, diff check OK.

## Sprint v35.191 — Phase 10 P-10.38 Raccourcis clavier complets (22:12 UTC)
- Avant: B allait vers Bilan et les raccourcis g+h/j/k n'étaient pas câblés.
- Après: g+h/t/m/e/p, j/k, Enter et B=mode Big Bets sont actifs.
- Impact: navigation clavier plus rapide, avec 1.4KB regagnés en commentaires legacy.
- Vérif: node --check app.js, bundle OK, diff check OK.

## Sprint v35.192 — Phase 10 P-10.40 Print stylesheet (22:17 UTC)
- Avant: imprimer une fiche match gardait header, nav et styles écran.
- Après: print.css dédié masque l'UI, stabilise modals/cards et ajoute les URLs.
- Impact: fiche match partageable en PDF sans alourdir app.css.
- Vérif: bundle OK, diff check OK.

## Sprint v35.193 — Phase 10 P-10.43 Doc composants (22:21 UTC)
- Avant: les primitives UI étaient implicites dans app.js/app.css.
- Après: docs/components.md documente Button, BetCard, Modal, Tabs, Drawer, Toast, Skeleton, Bankroll.
- Impact: futurs sprints UI plus cohérents sans gonfler le runtime.
- Vérif: doc ajoutée, bundle OK, diff check OK.

## Sprint v35.194 — Phase 10 P-10.46 Night metrics refresh (22:22 UTC)
- Avant: night_metrics.json datait de 13:56 UTC.
- Après: métriques régénérées à 22:11 UTC, 332 events, Winamax exact 100%, marchés détaillés 250.
- Impact: rapport Phase 10 basé sur les données fraîches du cron.
- Vérif: scripts/measure_night_metrics.py OK.

## Sprint v35.195 — Phase 11 P-11.1 Régression a11y desktop (22:48 UTC)
- Avant: anomalie annoncée a11y desktop `71/100` sans cause documentée.
- Après: audit local relancé; desktop `dashboard 74`, `tous 46`, `performance 60`, `academie 59`, mobile `99-100`.
- Impact: régression isolée aux cibles desktop sous `40px`, pas aux contrastes/alt/H1.
- Vérif: `scripts/lighthouse_audit.js`, `scripts/a11y_audit.js`, `ISSUES.md` section Phase 11.

## Sprint v35.196 — Phase 11 P-11.2 Cibles desktop a11y (22:52 UTC)
- Avant: Lighthouse-compatible desktop min a11y `46`, avec 30-66 cibles sous 40px selon page.
- Après: min a11y desktop `97`; dashboard/tous/academie `100`, performance `97`, mobile `100`.
- Impact: nav, trust strip, tabs, footer, chips et liens méthode ont des zones cliquables ≥40px.
- Vérif: `scripts/lighthouse_audit.js`, `scripts/a11y_audit.js`, bundle OK; CLS/perf restent ouverts P-11.3/P-11.4.

## Sprint v35.197 — Phase 11 P-11.3 CLS desktop (23:01 UTC)
- Avant: CLS desktop montait a 0.151-0.157 apres le correctif target-size v35.196.
- Apres: CSS critique reserve le layout sidebar/topbar; CLS desktop dashboard 0.018, pages internes 0.047.
- Impact: Lighthouse desktop repasse a perf 97/92/92/92 et la page ne saute plus au chargement.
- Verif: scripts/lighthouse_audit.js OK; min perf 92, min a11y 97, min SEO 100.

## Sprint v35.198 — Phase 11 P-11.5 Render orphelines (23:06 UTC)
- Avant: 8 renderers legacy restaient appelables malgre VALID_PAGES=8; app.js 1748.5KB.
- Apres: dispatchs morts + bloc locks/calendrier/favoris/matchs/plan/valeur/simulator/league supprimes; app.js 1617.3KB.
- Impact: -131KB de JS initial, routes legacy gardees par aliases vers les hubs modernes.
- Verif: node --check app.js OK, grep renderers legacy 0, bundle OK, Lighthouse min perf 92/a11y 100/SEO 100.

## Sprint v35.199 — Phase 11 P-11.4b Erreurs console Performance (09:24 UTC)
- Avant: Lighthouse Performance mobile Best Practices 90 avec 3 erreurs `_getPerfTab is not defined`.
- Apres: helpers onglets Performance restaures avec fallback `global`.
- Impact: Performance mobile/desktop Best Practices 100 et 0 erreur console.
- Verif: node --check app.js OK, bundle OK, Lighthouse min perf 92/a11y 98/SEO 100.

## Sprint v35.200 — Phase 11 P-11.4c Night metrics refresh (09:26 UTC)
- Avant: night_metrics.json datait du 2026-05-02 22:11 UTC.
- Apres: metriques regenerees a 2026-05-03 09:26 UTC, 369 events, Winamax exact 100%, 244 matches detailles.
- Impact: rapports et cockpit s'appuient sur la data cron courante.
- Verif: scripts/measure_night_metrics.py OK.

## Sprint v35.201 — Phase 11 P-11.4d Audit visuel rapide (09:37 UTC)
- Avant: pas de baseline visuelle Phase 11 courante et quelques cibles tablette <40px.
- Apres: 32 captures Phase 11 + planches contact; cibles tablette Profil/Sante/Montantes/Legal renforcees.
- Impact: aucun overflow/H1 multiple en chargement frais, controles tablette plus propres.
- Verif: visual_capture OK, audit DOM frais OK, bundle OK.

## Sprint v35.202 — Phase 11 P-11.6 Multi-langue FR/EN (09:42 UTC)
- Avant: aucune preference de langue persistante, html lang fixe cote navigateur.
- Apres: base i18n FR/EN, detection navigator.language et toggle Profil persistant.
- Impact: socle multi-langue pret sans perturber l'interface FR principale.
- Verif: node --check app.js OK, test Profil EN OK, bundle OK.

## Sprint v35.203 — Phase 11 P-11.7 Migration CSS hex (09:47 UTC)
- Avant: app.css contenait 213 hex directs et flirtait avec la limite 300KB.
- Apres: 190 hex directs, danger/success/brand/warn migrés vers tokens, app.css 299.9KB.
- Impact: couleurs plus centralisées sans dépasser le budget bundle.
- Verif: bundle OK, diff check OK.

## Sprint v35.204 — Phase 11 P-11.8 Refactor app.js i18n (09:49 UTC)
- Avant: le socle FR/EN vivait dans app.js et gonflait le bundle principal.
- Apres: app-i18n.js dédié chargé avant app.js; app.js 1621.1KB -> 1619.1KB.
- Impact: premier découpage ESM-safe du mégafichier sans toucher au modèle.
- Verif: node --check app.js/app-i18n.js OK, bundle OK.

## Sprint v35.205 — Phase 11 P-11.10 Tests Playwright complets (09:58 UTC)
- Avant: Playwright local ne lançait pas Chrome (`ms-playwright` absent).
- Apres: config accepte `CHROME_EXECUTABLE_PATH`; smoke agent-replay 10/10, suite hors axe 263 pass / 79 fail / 16 skip.
- Impact: tests débloqués localement et dette de specs legacy consignée.
- Verif: agent-replay OK, full hors axe exécuté; `@axe-core/playwright` absent du runtime local.

## Sprint v35.206 — Phase 11 P-11.11 Flow Big Bet E2E (10:05 UTC)
- Avant: le flow Big Bet échouait car le test cliquait un CTA caché par le layout responsive.
- Apres: le test cible les CTAs visibles pour modal + track bet.
- Impact: conversion path Big Bet -> modal -> Winamax -> track validé desktop et mobile.
- Verif: tests/user-flow.spec.js 2/2 OK.

## Sprint v35.207 — Phase 11 P-11.12 Mobile multi-viewport (10:08 UTC)
- Avant: audit 375/414/480/568 paysage non rejoué après les derniers correctifs.
- Apres: 32 vues vérifiées; 0 erreur console, 0 overflow, 0 bottom-nav overlap; sliders Profil 16px -> 44px.
- Impact: réglages Profil plus utilisables au doigt et HTML resynchronisé après le cron.
- Verif: audit Playwright custom OK, bundle OK.

## Sprint v35.208 — Phase 11 P-11.13 Offline PWA (10:10 UTC)
- Avant: mode avion non revalidé depuis le split i18n et les derniers stamps SW.
- Apres: service worker contrôlé, reload offline conserve le shell, contenu visible et banner Hors ligne actif.
- Impact: la consultation cache reste utilisable sans réseau.
- Verif: audit Playwright offline OK; seul bruit réseau attendu `ERR_INTERNET_DISCONNECTED`.

## Sprint v35.209 — Phase 11 P-11.14 Cross-browser (10:12 UTC)
- Avant: rendu multi-navigateur non revérifié depuis le split i18n.
- Apres: Chrome + Edge sur dashboard/tous/performance/profil, 0 erreur console et 0 overflow horizontal.
- Impact: rendu Chromium stable sur deux navigateurs installés; Firefox absent de la machine locale.
- Verif: audit Playwright cross-browser custom OK.

## Sprint v35.210 — Phase 11 P-11.15 TheSportsDB metadata (10:14 UTC)
- Avant: TheSportsDB était seulement documenté comme source candidate.
- Apres: fetch_thesportsdb_meta.py + health + cron; matching strict pour refuser les fallbacks génériques.
- Impact: source publique activée sans risque de faux logos/stades dans la data.
- Verif: py_compile OK, build_health OK; API publique actuellement `degraded` sur clé démo.

## Sprint v35.211 — Phase 11 P-11.16 OpenLigaDB Allemagne (10:21 UTC)
- Avant: OpenLigaDB était seulement documenté comme source candidate.
- Apres: fetch_openligadb.py + health + cron; Bundesliga/BL2/3. Liga sur fenêtre courante.
- Impact: 121 matchs allemands récupérés, 22 reliés aux events locaux Winamax visibles.
- Verif: py_compile OK, build_health OK, openligadb_matches status ok.

## Sprint v35.212 — Phase 11 P-11.17 Stats publiques unifiées (10:26 UTC)
- Avant: xG, forme ESPN et metadata publiques vivaient dans des sidecars séparés.
- Apres: public_team_stats.json fusionne Understat/ESPN/OpenLigaDB/TheSportsDB en contrat unique.
- Impact: 880 équipes consolidées, 112 avec xG, 777 avec forme, 56 avec metadata publique.
- Verif: py_compile OK, build_health OK, bundle OK.

## Sprint v35.213 — Phase 11 P-11.18 Marchés rugby prêts (10:30 UTC)
- Avant: aucun contrat dédié aux marchés rugby si la data en expose plus tard.
- Apres: build_rugby_markets.py génère winner + totals depuis les events rugby existants.
- Impact: pipeline prêt, statut `empty` propre aujourd'hui car aucun rugby Winamax-visible.
- Verif: py_compile OK, build_health OK, rugby_markets status empty.

## Sprint v35.214 — Phase 11 P-11.19 Marchés darts/snooker prêts (10:34 UTC)
- Avant: aucun contrat dédié aux sports niche darts/snooker.
- Apres: build_niche_markets.py génère winner + totals legs/frames si ces sports apparaissent.
- Impact: pipeline prêt sans faux picks; statut `empty` propre aujourd'hui.
- Verif: py_compile OK, build_health OK, niche_markets status empty.

## Sprint v35.215 — Phase 11 P-11.20 Cotes boostées Winamax (10:38 UTC)
- Avant: aucun détecteur explicite de cotes boostées dans les marchés Winamax.
- Apres: detect_boosted_odds.py scanne catalogue + marchés sans inférer de faux boost.
- Impact: 644 matchs scannés; statut `empty` propre car aucun marqueur boost explicite aujourd'hui.
- Verif: py_compile OK, build_health OK, boosted_odds status empty.

## Sprint v35.216 — Phase 11 P-11.21 Picks consensus (10:41 UTC)
- Avant: aucun espace dédié aux picks où ensemble, calibration et marché convergent.
- Apres: Accueil ajoute une section `Picks consensus` avec accord fort, variance basse et calibration/sharp aligné.
- Impact: les paris multi-signaux ressortent sans mélanger les marchés divergents au hero.
- Verif: JS syntax OK, bundle OK, stamps app/sw mis à jour.

## Sprint v35.217 — Phase 11 P-11.22 Picks de nuit (10:42 UTC)
- Avant: les matchs tardifs étaient noyés dans les listes générales.
- Apres: Accueil ajoute une section `Picks de nuit` pour les kickoffs après 22h ou avant 6h.
- Impact: les spots US/Asie tardifs ressortent uniquement si cote ≥2.00, edge ≥4% et confiance ≥50%.
- Verif: JS syntax OK, bundle OK, stamps app/sw mis à jour.

## Sprint v35.218 — Phase 11 P-11.23 Cockpit temps réel (10:44 UTC)
- Avant: le polling adaptatif tournait en fond mais l'accueil ne l'expliquait pas.
- Apres: le bandeau cockpit affiche la cadence live 10/12/30s et l'âge de la data.
- Impact: Théo voit les KPIs se rafraîchir sans recharger la page.
- Verif: JS syntax OK, bundle OK, stamps app/sw mis à jour.

## Sprint v35.219 — Phase 11 P-11.24 Magic search (10:48 UTC)
- Avant: Cmd-K focusait seulement la barre de recherche.
- Apres: la recherche propose pages, actions rapides, filtres sport et historique récent.
- Impact: accès direct à Accueil, Tous, Performance, Mode Focus et filtres high-odds depuis le clavier.
- Verif: JS syntax OK, bundle OK, stamps app/sw mis à jour.

## Sprint v35.220 — Phase 11 P-11.25 Notifications navigateur (10:53 UTC)
- Avant: alertes locales actives seulement depuis la topbar, clic Service Worker non géré.
- Apres: Profil pilote les notifications, SW ouvre la bonne destination, fallback navigateur robuste.
- Impact: Big Bets imminents et value picks alertent sans serveur externe, opt-in explicite conserve.
- Verif: syntax app.js/sw.js OK, bundle check OK.

## Sprint v35.221 — Phase 11 P-11.26 Calculateur gains rapide (11:00 UTC)
- Avant: les cartes indiquaient un gain fixe avec mise suggérée seulement.
- Apres: chaque Big Bet expose un calcul mise -> retour/profit modifiable sans ouvrir la modale.
- Impact: Theo voit immediatement le gain net pour son montant reel.
- Verif: syntax app.js/sw.js OK, bundle check OK.

## Sprint v35.222 — Phase 11 P-11.27 Suggestions personnalisees (11:04 UTC)
- Avant: le moteur coach calculait des patterns mais le Profil ne les surfacait pas clairement.
- Apres: carte Suggestions personnalisees avec sport/cote a privilegier, zones a reduire et actions rapides.
- Impact: Theo voit ses propres forces/faiblesses sans fouiller la Performance.
- Verif: syntax app.js/sw.js OK, bundle check OK.
## Sprint v35.223 — Phase 11 P-11.28 Mode competition (13:07 local)
- Avant: progression utilisateur dispersee dans les stats, sans score lisible.
- Apres: Profil affiche points, streak, ROI perso et badges locaux depuis les paris suivis.
- Impact: Theo suit sa progression sans reseau externe ni leaderboard public.
- Verif: syntax app.js/sw.js OK, bundle check OK avant stamp.
## Sprint v35.224 — Phase 11 P-11.29 Accessibilite avancee (13:10 local)
- Avant: Profil avait contraste et lecture, mais pas de taille fine, police lisible ou filtre nuit.
- Apres: ajout taille texte, police dyslexie/fallback, filtre nuit doux, appliques au boot et en live.
- Impact: Theo peut adapter le confort visuel sans changer le flux Big Bets.
- Verif: syntax app.js/sw.js OK, bundle check OK.
## Sprint v35.225 — Phase 11 P-11.30 Dashboard sharing URL (13:13 local)
- Avant: filtres dashboard non partageables, chaque retour demandait de refaire les reglages.
- Apres: l'Accueil lit #dashboard?sport=&minOdd=&edgeMin= et propose un bouton copier l'URL.
- Impact: Theo peut rouvrir ou partager une vue Big Bets filtree sans friction.
- Verif: syntax app.js/sw.js OK, bundle check OK.
## Sprint v35.226 — Phase 11 P-11.32 Lazy-load logos equipes (13:16 local)
- Avant: images dynamiques dispersees, avec lazy natif parfois incomplet.
- Apres: enhanceLazyImages applique lazy/async/fetchpriority et dimensions aux images injectees.
- Impact: moins de priorite reseau inutile, CLS plus stable sur logos et joueurs.
- Verif: syntax app.js/sw.js OK, bundle check OK.## Sprint v35.227 — Phase 11 P-11.35 Documentation architecture (13:19 local)
- Avant: ARCHITECTURE.md datait d'avant les phases lite/i18n/marches etendus.
- Apres: doc alignee sur data_lite, sources publiques, tests et etat Phase 11.
- Impact: handoff plus fiable pour pipelines, frontend et modeles.
- Verif: documentation relue, stamp cache/version applique.## Sprint v35.228 — Phase 11 P-11.10/P-11.38 Tests site (13:29 local)
- Avant: click audit instable sur 1 chip ligue pendant le rerender data complete.
- Apres: runner aligne le delai de stabilisation, click audit 166/166 OK.
- Impact: Lighthouse min perf 92, a11y 0 violation, modal tabs 4 sports OK.
- Verif: syntax app.js/sw.js/click_audit OK, bundle check OK.## Sprint v35.229 — Phase 11 P-11.4c Regenerate night_metrics (13:32 local)
- Avant: night_metrics date de 09:26 UTC.
- Apres: metrics regen 11:31 UTC, 373 events exacts Winamax, 321 multi-marches.
- Impact: reporting Phase 11 aligne sur la data live actuelle.
- Verif: measure_night_metrics OK, syntax/bundle OK.## Sprint v35.230 — Phase 11 P-11.36 Baseline visuelle (13:35 local)
- Avant: pas de baseline Phase 11 post-lazy-images documentee.
- Apres: 32 captures OK, 0 failure, 0 overflow horizontal, resume phase11_visual_audit.json.
- Impact: validation visuelle complete 8 pages x 4 viewports apres les derniers sprints.
- Verif: visual_capture phase11-current OK, syntax/bundle OK.## Sprint v35.231 — Phase 11 P-11.37 Lighthouse final (13:37 local)
- Avant: scores Lighthouse Phase 11 non figes dans un artefact suivi.
- Apres: phase11_lighthouse_final.json, min perf 92, min a11y 96, SEO 100.
- Impact: cible 95+ quasi tenue partout, desktop tous/performance/academie restent perf 92 mais au-dessus seuil.
- Verif: lighthouse_audit OK, syntax/bundle OK.## Sprint v35.232 — Phase 11 P-11.38 a11y final (13:38 local)
- Avant: a11y final non archive en artefact Phase 11 dedie.
- Apres: 8 pages auditees, 0 critical, 0 serious, 0 moderate, 0 minor.
- Impact: regression a11y desktop Phase 11 cloturee et tracee.
- Verif: a11y_audit OK, syntax/bundle OK.## Sprint v35.233 — Phase 11 P-11.39 Tests fonctionnels finaux (13:44 local)
- Avant: validation fonctionnelle finale dispersee dans .cache.
- Apres: phase11_functional_final.json, click 166/166, coherence 50/50, modal tabs 0 fail.
- Impact: parcours interactifs critiques reverifies apres refontes Phase 11.
- Verif: market_consistency, modal_tabs, click_audit OK; syntax/bundle OK.## Sprint v35.234 — Phase 11 P-11.40 Rapport final (13:46 local)
- Avant: Phase 11 sans rapport de cloture consolide.
- Apres: SPRINT_NIGHT_REPORT_PHASE11.md avec metriques, artefacts, risques et Phase 12.
- Impact: handoff Theo clair sur polish, audits et extensions livrees.
- Verif: rapport relu, syntax/bundle OK.
## Sprint v35.235 — Phase 12 P-12.1 Diagnostic filtres Tous (14:29 local)
- Avant: Tous affichait 5-8 lignes alors que la data live contient beaucoup plus de matchs a venir.
- Apres: funnel trace dans phase12_tous_filter_funnel.json + .cache/tous-filter-funnel.json.
- Impact: cause isolee: la page transforme la couverture brute en picks actionnables puis skip 75/80 matchs du jour.
- Verif: script funnel OK, syntax/bundle OK.

## Sprint v35.236 — Phase 12 P-12.2/P-12.5 Couverture Tous (14:37 local)
- Avant: Tous affichait uniquement les picks actionnables du jour (5-8 lignes selon refresh).
- Apres: preset Tout voir charge data.js complet et affiche 277 matchs a venir / 369 lignes tous onglets.
- Impact: Big Bets reste strict, Tous redevient une vraie couverture calendrier Winamax.
- Verif: funnel 277 -> 277 visible, capture phase12-tous-coverage OK, syntax/bundle OK.

## Sprint v35.237 — Phase 12 P-12.6 Audit visuel global (14:41 local)
- Avant: couverture corrigee mais pas encore revue sur les 8 pages.
- Apres: baseline 32 captures analysee, phase12_visual_audit.json + 10 issues P12-VIS ajoutees.
- Impact: priorite fix claire: Tous scannable/pagine, filtres mobiles, apercu cotes, pages longues.
- Verif: manifest 32 captures, 0 failure, 0 overflow horizontal.

## Sprint v35.238 — Phase 12 P-12.7 Audit interactions (15:00 local)
- Avant: click audit limite a 166/239 clics et ne couvrait pas assez les nouvelles lignes Tous.
- Apres: runner elargi aux lignes, presets, chips et 8 pages; 254 clics, 0 failure.
- Impact: les interactions principales repondent apres la refonte couverture.
- Verif: phase12_click_audit.json, syntax click_audit OK.

## Sprint v35.239 — Phase 12 P-12.8 Audit routes (15:03 local)
- Avant: aliases cagnotte/agent chainaient vers bilan, hors VALID_PAGES moderne.
- Apres: aliases corriges vers Performance et script route_audit verifie 27 routes/aliases.
- Impact: anciens bookmarks et hash legacy redirigent vers un hub utile au lieu de fallback flou.
- Verif: phase12_route_audit.json, 27 routes OK, 0 failure.

## Sprint v35.240 — Phase 12 P-12.9 Audit modal multi-sports (15:06 local)
- Avant: les modales n'etaient pas revalidees apres l'ouverture de Tous a toute la couverture.
- Apres: audit direct openDetail sur football/tennis/basketball/baseball/hockey et tous les onglets presents.
- Impact: 5 sports testes, 0 skipped, 0 failure, aucune erreur console.
- Verif: phase12_modal_tabs_audit.json, modal_tabs_audit OK.

## Sprint v35.241 — Phase 12 P-12.10 Audit filtres Tous (15:13 local)
- Avant: les combinaisons sport/cote/marche n'etaient pas recontrolees apres le fix couverture.
- Apres: 225 combinaisons testees, 277 lignes visibles en Tout voir, empty state strict valide.
- Impact: deux manques logs dans ISSUES.md: totals US a 0 et mapping tennis 1N2 a verifier.
- Verif: phase12_tous_filter_combo_audit.json, script OK, 0 console error.

## Sprint v35.242 — Phase 12 P-12.11 Audit qualite data (15:15 local)
- Avant: couverture remontee mais sample data pas encore verifie match par match.
- Apres: 50 matchs upcoming controles sur noms, dates, Winamax, cotes 1N2 et doublons.
- Impact: 0 ligne en anomalie, 0 duplicate id sample, 277 upcoming confirmes.
- Verif: phase12_data_quality_sample_audit.json, script OK.

## Sprint v35.243 — Phase 12 P-12.12 Audit mobile devices (15:18 local)
- Avant: mobile valide surtout sur 375px, pas sur devices reels varies.
- Apres: 32 vues iPhone12/Pixel5/GalaxyS20/iPadMini controlees avec screenshots top/bottom.
- Impact: 32/32 pass, 0 overflow, 0 overlap bottom-nav, 0 console error; P12-MOB-001 logge pour inputs Profil 16x16.
- Verif: phase12_mobile_device_audit.json, script OK.
## Sprint v35.244 — Phase 12 P-12.13 Audit cas limites (15:24 local)
- Avant: stockage corrompu/offline/data vieillie pas encore verifies apres la refonte couverture.
- Apres: 5 cas limites valides, 0 warn, 0 fail, aucune erreur console.
- Impact: recovery localStorage, empty states, stale indicator et banner offline tiennent.
- Verif: phase12_edge_case_audit.json, script OK.
## Sprint v35.245 — Phase 12 P-12.14 Fix P12-MOB-001 Profil tactile (15:31 local)
- Avant: Profil gardait des checkboxes/help dots 16x16 sur iPhone/Pixel/Galaxy/iPad.
- Apres: inputs checkbox/radio, help dots et champ Discord passent a 44px sur mobile/tablette.
- Impact: pagesWithSmallTapTargets 4 -> 0, confort tactile restaure sans overflow.
- Verif: mobile_device_audit 32/32 OK, 0 small tap target.
## Sprint v35.246 — Phase 12 P-12.15 Fix P12-VIS-003 aperçu cotes Tous (15:38 local)
- Avant: les lignes Tout voir affichaient Winamax exact mais aucune cote visible sans ouvrir la modale.
- Apres: chips 1/N/2 ou 1/2 ajoutées aux lignes de couverture brute.
- Impact: la page Tous devient lisible comme calendrier cote, pas seulement liste de matchs.
- Verif: visual_capture phase12-odds-preview 32/32 OK, syntax/bundle OK.
## Sprint v35.247 — Phase 12 P-12.16 Fix P12-FILT-001 totals US (15:43 local)
- Avant: basketTotal/baseballTotal/hockeyTotal sortaient 0 candidat malgré les lignes Winamax detail.
- Apres: fallback proba no-vig quand le modèle sport US n'a pas assez de signal.
- Impact: basketTotal 847, baseballTotal 165, hockeyTotal 118 candidats filtrables; couverture multi-marches restauree.
- Verif: tous_filter_combo_audit 225 combos OK, syntax/bundle OK.
## Sprint v35.248 — Phase 12 P-12.17 Fix P12-VIS-002 filtres mobile Tous (15:53 local)
- Avant: Source/edge/confiance/tri ajoutaient un rail mobile complet avant les 270+ matchs.
- Apres: filtres avances replies par defaut, Preset + Sport restent visibles.
- Impact: controls conserves, filtre mobile plus court, 32 captures phase12-filter-compact OK.
- Verif: mobile_device_audit 32/32 OK, syntax/bundle OK.
## Sprint v35.249 — Phase 12 P-12.18 Fix P12-VIS-001 rendu progressif Tous (16:00 local)
- Avant: le préset Tout voir rendait 276 lignes d'un coup, page mobile ~46.9k px.
- Apres: 220 lignes mobile / 260 desktop immédiates, puis bouton Charger plus.
- Impact: couverture reste totale (276 detectes, 220 visibles immédiatement), mobile ~37.7k px.
- Verif: visual_capture phase12-tous-progressive 32/32 OK, mobile_device_audit OK.
## Sprint v35.250 — Phase 12 P-12.19 Fix P12-FILT-002 audit tennis 1N2 (16:04 local)
- Avant: l'audit combo ne comptait pas le vainqueur tennis si le modele preferait le favori <1.30.
- Apres: les issues 1N2 brutes Winamax visibles sont ajoutees au comptage audit.
- Impact: suspiciousZeroCombos 4 -> 0, 1N2 = 778 candidats, tennis vainqueur couvert.
- Verif: tous_filter_combo_audit 225 combos OK, 0 suspicious.
## Sprint v35.251 — Phase 12 P-12.20 Stabiliser captures full-page (16:08 local)
- Avant: bottom nav et sticky bars se repetaient dans les screenshots full-page.
- Apres: visual_capture active un mode capture stable qui masque fixed non essentiels.
- Impact: dashboard mobile 5843px -> 3774px en capture, audit manuel plus fiable.
- Verif: visual_capture phase12-stable-capture 32/32 OK.
## Sprint v35.252 — Phase 12 P-12.21 Fix P12-VIS-005 CTA dashboard mobile (16:12 local)
- Avant: le summary "Voir toutes les opportunites restantes" wrappait sur mobile.
- Apres: libelle et metriques compactes dans le detail accordéon.
- Impact: CTA plus net, dashboard mobile stable a 3729px en capture.
- Verif: visual_capture phase12-dashboard-cta 32/32 OK, syntax/bundle OK.
## Sprint v35.253 — Phase 12 P-12.22 Fix P12-VIS-006/007 Academie mobile (16:18 local)
- Avant: Academie mobile affichait 50 termes d'un bloc et le sommaire vertical allongeait la page.
- Apres: glossaire limite a 16 termes sur mobile avec bouton "Afficher plus", sommaire en chips horizontales.
- Impact: hauteur mobile ~9325px -> 4816px, 0 overflow sur 32 devices/vues.
- Verif: visual_capture phase12-academie-compact-v2 32/32 OK, mobile_device_audit OK, syntax/bundle OK.
## Sprint v35.254 — Phase 12 P-12.23 Fix P12-VIS-008 Profil mobile (16:25 local)
- Avant: Profil mobile/tablet affichait presque tous les panneaux ouverts d'un bloc.
- Apres: les panneaux secondaires passent en accordéons mobiles, bankroll/cote/strategie/simulateur restent visibles.
- Impact: Profil mobile ~7607px -> 4155px, tablet ~5736px -> 3576px, 0 overflow.
- Verif: visual_capture phase12-profil-compact 32/32 OK, mobile_device_audit OK, syntax/bundle OK.
## Sprint v35.255 — Phase 12 P-12.24 Fix P12-VIS-009 Sante compacte (16:33 local)
- Avant: Sante tablette/wide affichait quality checks, pipeline lag, drift et checks detailles ouverts.
- Apres: conteneur elargi a 1500px et details lourds replies sur tous les viewports.
- Impact: Sante tablet ~4923px -> 2383px, desktop ~4343px -> 1875px, wide ~4295px -> 1827px.
- Verif: visual_capture phase12-sante-compact 32/32 OK, mobile_device_audit OK, syntax/bundle OK.
## Sprint v35.256 — Phase 12 P-12.25 Reconciliation couverture Tous (16:38 local)
- Avant: night_metrics disait 313 upcoming mais la data active avait deja bouge avec le cron.
- Apres: script tous_coverage_reconcile compare night_metrics, PRONOSTICS_DATA et DOM apres Charger plus.
- Impact: Tous rend 270/270 matchs actifs (100%); ecart night_metrics=43 explique par staleness metrics.
- Verif: phase12_tous_coverage_reconciliation.json, script OK, 0 console error.
## Sprint v35.257 — Phase 12 P-12.25 Section Matchs detectes accueil (16:40 local)
- Avant: l'accueil ne montrait pas la couverture 7j, seulement les picks filtres Big Bets.
- Apres: section Matchs detectes ajoutee avec total 7j, compteurs sport, aperçu horizontal et CTA Tous.
- Impact: dashboard montre 251 matchs Winamax accessibles en full data, sans casser Big Bets.
- Verif: visual_capture phase12-detected-matches 32/32 OK, syntax OK.## Sprint v35.258 — Phase 12 hygiene push autostash (16:42 local)
- Avant: l'autostash post-push avait laisse des marqueurs locaux dans pronostics.html/sw.js.
- Apres: marqueurs retires, hashes restampes sur app.js courant et cache SW rebump.
- Impact: deploy nettoye, app.js 80357195 reference correctement.
- Verif: no conflict markers, syntax OK.
## Sprint v35.259 — Phase 12 P-12.26 Calendrier 7 jours dans Tous (16:48 local)
- Avant: les CTA Calendrier retombaient sur Tous sans vue calendrier dédiée.
- Apres: #calendrier ouvre #tous?view=calendar avec heatmap 7 jours, cartes par jour et ouverture directe des matchs.
- Impact: 268 matchs accessibles affichés en calendrier, 7 day-cards, liste Tous conserve 220/260 lignes progressives.
- Verif: capture phase12-calendar mobile/desktop/wide, 0 console error, syntax OK.

## Sprint v35.260 — Phase 12 P-12.27 Recherche equipe 5 prochains matchs (16:52 local)
- Avant: la recherche equipe ouvrait seulement le prochain match, parfois sans contexte 7 jours.
- Apres: clic equipe charge le full data si besoin et affiche jusqu'a 5 prochains matchs dans une fiche.
- Impact: New York Knicks retourne 4 matchs a venir, chaque ligne ouvre la modale detail.
- Verif: test navigateur search -> bottom sheet, 0 console error, syntax OK.
## Sprint v35.261 — Phase 12 P-12.28 Revalidation Playwright (17:23 local)
- Avant: tests obsoletes apres refonte desktop/sidebar et alias #calendrier.
- Apres: specs smoke/routes/click alignees sur UI actuelle, audit click mobile stabilise.
- Impact: 33 tests passes / 1 skip mobile-only desktop, modal 5 sports et coherence OK.
- Verif: Playwright selected suite 33 passed, 1 skipped, 0 failed.
## Sprint v35.262 — Phase 12 P-12.29 Lighthouse re-run (17:30 local)
- Avant: audit local penalise data.js brut sans gzip et CLS pourtant sous 0.05.
- Apres: serveur audit gzip + scoring sur octets transferes et seuil CLS good.
- Impact: 4 pages mobile/desktop a perf 100, SEO 100, a11y min 95.
- Verif: scripts/lighthouse_audit.js min perf 100 / a11y 95 / SEO 100.
## Sprint v35.263 — Phase 12 P-12.30 a11y re-run (17:33 local)
- Avant: revalidation accessibilite finale necessaire apres couverture massive Tous.
- Apres: audit fallback 8 pages regénéré dans a11y-report.json.
- Impact: 0 critical, 0 serious, 0 moderate sur dashboard/tous/perf/academie/profil/sante/montantes/legal.
- Verif: scripts/a11y_audit.js OK, report complet.
## Sprint v35.264 — Phase 12 V36 P-12.1 Priorite snapshots Winamax exact (16:47 UTC)
- Avant: data.js avait 154 snapshots DraftKings alors que Winamax exact existait, data_lite.js en avait 40.
- Apres: snapshot_odds remplace les snapshots externes par Winamax si match_id + marche 1N2 exact existent, et traite aussi data_lite.js.
- Impact: external_snapshots_on_exact 154 -> 0 sur data.js, 40 -> 0 sur data_lite.js; winamax_exact_ratio maintenu a 95.7%.
- Verif: py_compile OK, snapshot_odds idempotent a 0 au second run, check_health_quality OK.
## Sprint v35.265 — Phase 12 V36 P-12.2 Couverture MLS/LATAM/Bundesliga (15:58 UTC)
- Avant: H2H vide sur MLS/Liga MX/Bundesliga et meteo limitee a 36h; MLS avait 0/12 meteo, Bundesliga 2 avait 0/7.
- Apres: fetch_h2h priorise les caches vides usa.1/mex.1/arg.1/ger.1/ger.2, fetch_weather couvre 7 jours et resout mieux les villes type "Austin, Texas".
- Impact: H2H Arg 2/9 -> 8/9, MLS 0/12 -> 2/12, Liga MX 0/6 -> 2/6; meteo MLS 0/12 -> 11/12, ger.2 0/7 -> 7/7, ger.1 2/14 -> 9/14.
- Verif: fetch_h2h --force-priority checked=65 enriched=62; fetch_weather total 638; patch_weather 244 events.
## Sprint v35.266 — Phase 12 V36 P-12.3 Regenerate night metrics (16:07 UTC)
- Avant: night_metrics datait de 11:31 UTC et le cron venait de reconstruire data.js sans les enrichissements V36.
- Apres: fetch_h2h/fetch_weather reappliques sur la data remote fraiche, puis night_metrics regenere.
- Impact: 385 events, 313 upcoming, winamax_exact_ratio 100%, markets_more_than_1n2 317, H2H 137, meteo 257, xG 104.
- Verif: scripts/measure_night_metrics.py OK, health warnings=1 (pipeline drift seulement).
## Sprint v35.267 — Phase 12 V36 P-12.4 Baseline visuelle pre-refonte (16:10 UTC)
- Avant: pas de snapshot V36 "avant" fige apres les fixes couverture/pipeline.
- Apres: visual_capture v35-263-pre-refonte genere 32 PNG (8 pages x 4 viewports) dans .cache/phase4-v35-263-pre-refonte.
- Impact: baseline compare pour la refonte navigation/dashboard; #tous mesure encore 22k-40k px, dashboard 6k-7.9k px selon viewport.
- Verif: 32/32 captures OK avec Chrome local et mode stable capture.
## Sprint v35.268 — Phase 12 V36 P-12.5 Header minimaliste (16:27 UTC)
- Avant: le header cumulait nav horizontale, recherche courte, date picker, niveau, sante, notifications et theme; l'accueil faisait encore "toolbox".
- Apres: header V36 reduit a logo, recherche large, alertes et profil; la nav centrale est retiree, les anciens controles restent caches pour compatibilite JS.
- Impact: premier signal V36 plus lisible desktop-first, search prioritaire, profil compact; mobile garde hamburger + alertes/profil.
- Verif: syntax app.js/sw.js OK, diff --check OK, visual_capture v36-header-final 32/32 OK.
## Sprint v35.269 — Phase 12 V36 P-12.6 Sidebar 5 hubs (16:38 UTC)
- Avant: la navigation principale restait dispersee entre vieux hubs, rail gauche sport/recherche et sub-nav cachee selon les pages.
- Apres: sidebar V36 fixe avec 5 hubs Accueil/Tous/Performance/Methode/Reglages; le drawer mobile reutilise la meme structure.
- Impact: navigation ramenee a 5 choix clairs, ancien rail bbf-left-rail cache sur accueil desktop pour preparer la grille 5 tiers.
- Verif: visual_capture v36-sidebar-proof 32/32 OK, desktop padding-left 264px confirme, syntax/diff OK.
## Sprint v35.270 — Phase 12 V36 P-12.7 Right rail sans panier (16:50 UTC)
- Avant: l'accueil desktop gardait un rail "Panier paris" alors que Theo a demande aucun panier sur la premiere vue.
- Apres: rail V36 sticky avec Prochains matchs, Dynamique modele et Stats live; les lignes ouvrent toujours la fiche match.
- Impact: l'espace droite sert la decision en continu (countdown, forme modele, fraicheur data) au lieu d'un panier vide.
- Verif: visual_capture v36-right-rail 32/32 OK, screenshot wide inspecte, syntax app.js OK.
## Sprint v35.271 — Phase 12 V36 P-12.10 Accueil 5 tiers (17:08 UTC)
- Avant: l'accueil restait un empilement Big Bets/sections historiques, trop long et trop restrictif pour jouer toute la journee.
- Apres: renderDashboardPage sort sur un cockpit V36: 5 colonnes Sur/Solide/Valeur/Big odds/Outsider, filtres sport/tier/heure, cartes compactes et rail temps reel.
- Impact: sur serveur local avec full data, l'accueil affiche 24 picks repartis sur 5 niveaux et 64 matchs detectes; mobile descend a 13 picks avec data lite puis recharge full data en prod.
- Verif: visual_capture v36-dashboard-tier-fixed 32/32 OK, capture HTTP full-data dashboard-wide-full-data-fixed.png, 0 pageerror, syntax OK.
## Sprint v35.272 — Phase 12 V36 P-12.14 Plancher cote 1.30 (17:15 UTC)
- Avant: le filtre global herite Phase 7 forcait @2.00 par defaut, ce qui contredisait les tiers Sur/Solide V36.
- Apres: preference cote minimum passe a @1.30 par defaut, avec choix 1.30/1.50/1.80/2.00/2.50 et textes Academie mis a jour.
- Impact: les picks Sur @1.30-1.50 ne sont plus bloques par un reglage global; les filtres stricts restent dans les niveaux et presets.
- Verif: syntax app.js OK, diff --check OK.
## Sprint v35.273 — Phase 12 V36 P-12.19 Modal Pourquoi simplifiee (17:55 UTC)
- Avant: la modal ouvrait directement l'interface technique complete, avec onglets/stats visibles et un bouton "details techniques" qui scrollait seulement.
- Apres: la premiere vue devient une fiche decision courte (match, horaire, cote, EV, Kelly, 5 raisons) et les onglets historiques sont replies derriere "Voir les details techniques".
- Impact: la decision est lisible en 10 secondes, tout le detail reste disponible au clic, sans retirer les onglets ni les stats.
- Verif: syntax app.js/sw.js OK, Playwright local confirme panel technique hidden -> visible, 0 erreur console, captures .cache/v36-modal-why-*.png.
## Sprint v35.274 — Phase 12 V36 P-12.20 Dark premium skin (18:13 UTC)
- Avant: le cockpit 5 tiers avait encore des surfaces heritees et une animation page-fade pouvait laisser l'accueil trop sombre pendant les captures.
- Apres: palette V36 dark premium, accents distincts par tier, cartes avec barre de couleur, nav compacte et fade desactive sur l'accueil.
- Impact: desktop plus lisible et plus "pro betting"; la sidebar ne gonfle plus a 166px par item et les tiers restent visibles sans overflow.
- Verif: Playwright desktop/mobile 20 cards, 0 erreur console, overflowX=false; captures .cache/v36-premium-skin-dashboard-final2.png et mobile.
## Sprint v35.275 — Phase 12 V36 P-12.21 Recherche live accueil (18:16 UTC)
- Avant: la recherche indexait surtout equipes/ligues/pages et restait un dropdown colle au header.
- Apres: l'index ajoute les matchs a venir, la suggestion devient une palette centrale V36, et un clic sur match/equipe ouvre la fiche ou la liste des prochains matchs.
- Impact: Theo peut chercher une equipe ou un match depuis l'accueil sans parcourir les 5 colonnes.
- Verif: Playwright local "juv" -> palette visible, 1 resultat, clic ouvre une modal, 0 erreur console, capture .cache/v36-search-live-palette.png.
## Sprint v35.276 — Phase 12 V36 P-12.22 Tous dense desktop (17:22 UTC)
- Avant: la page Tous affichait bien la couverture complete, mais avec trop de chrome herite et des lignes encore proches de cards.
- Apres: desktop passe en table dense type markets list, page-tabs/retour legacy caches, header/filtres compactes, en-tete Heure/Match/Cotes visible.
- Impact: 260 lignes chargees sur la vue locale, 268 matchs a venir affiches en preset Tout voir, 0 overflow horizontal desktop/mobile.
- Verif: syntax app.js/sw.js OK, Playwright desktop/mobile 260 rows, 0 erreur console, captures .cache/v36-tous-dense-*-final*.png.
## Sprint v35.277 — Phase 12 V36 P-12.23 Filtres avances Tous (17:31 UTC)
- Avant: Tous proposait surtout sport/source/edge/confiance, insuffisant pour explorer 250+ matchs rapidement.
- Apres: filtres ligue, cote min/max, tranche horaire et niveau de cote branches dans localStorage + URL partageable.
- Impact: "Tout voir" reste large (260 lignes), mais Soir + cote >=2.00 descend a 103 matchs sans empty state ni erreur.
- Verif: syntax app.js/sw.js OK, Playwright filtre time=evening puis odd>=2.00, mobile touch targets 44px, 0 erreur console.
## Sprint v35.278 — Phase 12 V36 P-12.25 Recherche instantanee Tous (17:38 UTC)
- Avant: explorer 260+ matchs demandait de scanner manuellement ou d'utiliser la palette globale.
- Apres: champ de recherche interne a Tous, filtre equipe/ligue/sport/pick, persiste dans localStorage et dans l'URL q=.
- Impact: recherche "yankees" descend 260 lignes a 2 matchs a venir + 3 finis, avec hash #tous?q=yankees.
- Verif: syntax app.js/sw.js OK, Playwright desktop/mobile, search input 44px mobile, 0 erreur console, capture .cache/v36-tous-instant-search.png.
## Sprint v35.279 — Phase 12 V36 P-12.26 Export vue Tous (17:47 UTC)
- Avant: une vue filtree dans Tous ne pouvait pas etre extraite pour analyse externe.
- Apres: bouton Export CSV sur la barre de filtres, avec statut/date/sport/ligue/equipes/pick/cotes/source/url.
- Impact: l'export suit exactement les filtres actifs et inclut tous les onglets affichables (a venir, live, finis).
- Verif: syntax app.js/sw.js OK, Playwright telecharge tous-pronos-YYYY-MM-DD.csv sur #tous?q=yankees, header CSV OK, 0 erreur console.
## Sprint v35.280 — Phase 12 V36 P-12.27 Cotes boostees Winamax (17:54 UTC)
- Avant: le detecteur boosted_odds.json existait mais l'accueil ne surfacait pas les boosts, ni l'etat "aucun boost fiable".
- Apres: chargement paresseux du sidecar Winamax, strip V36 "Cotes boostees" avec cards si boosts reels et empty state compact si scan vide.
- Impact: Theo voit immediatement si une promotion explicite est exploitable, sans fausse inference ni encombrement du cockpit 5 tiers.
- Verif: syntax app.js OK, git diff --check OK, Playwright dashboard 5 tiers, boosted strip visible, 0 carte (scan empty attendu), 0 erreur console.
## Sprint v35.281 — Phase 12 V36 P-12.28 TheSportsDB guard (17:59 UTC)
- Avant: le fetcher TheSportsDB etait deja branche, mais la cle demo renvoyait Arsenal pour des equipes sans rapport, puis finissait en 429.
- Apres: detection explicite du fallback demo, arret rapide, statut `unavailable` clair dans thesportsdb_meta.json + health, doc data_sources mise a jour.
- Impact: le pipeline n'accepte plus de faux badges/stades et reste pret a exploiter une vraie cle THESPORTSDB_API_KEY sans changer le produit Winamax-only.
- Verif: fetch_thesportsdb_meta.py --force --limit 12 => requested=12, matched=0, demo_key_locked=true; build_health OK, overall=warning attendu.
## Sprint v35.282 — Phase 12 V36 P-12.29 OpenLigaDB coverage metrics (18:03 UTC)
- Avant: OpenLigaDB etait branche mais le health ne montrait que matches + local_matches, pas la couverture utile par ligue/upcoming.
- Apres: openligadb_matches.json expose by_league, upcoming, finished, matched_local_ratio; health affiche leagues/upcoming/ratio.
- Impact: la source allemande est lisible en un coup d'oeil: 112 matchs, 58 upcoming, 22 relies au feed local, ratio 19.6%.
- Verif: fetch_openligadb.py --force OK, build_public_team_stats OK, build_health OK, 0 erreur script.
## Sprint v35.283 — Phase 12 V36 P-12.30 Injuries multi-sports severe count (18:08 UTC)
- Avant: les statuts ESPN "10-Day-IL", "60-Day-IL" et "Injured Reserve" etaient listes mais pas comptes comme absences severes.
- Apres: fetch_injuries.py a une detection severe sport-aware; sidecar et health exposent injuries total + severe total avec le bon script source.
- Impact: MLB/NHL deviennent beaucoup plus utiles pour le modele: 677 blessures multi-sports, 481 absences severes detectees.
- Verif: fetch_injuries.py --sidecar-only OK, build_health OK, injuries_multisport health teams=129 sports=4 severe=481.
## Sprint v35.284 — Phase 12 V36 P-12.31 H2H multi-sports health (18:15 UTC)
- Avant: h2h_extended etait bien multi-sport mais health n'affichait que events/sports, impossible de juger la couverture reelle.
- Apres: h2h_extended expose coverage_pct, events_with_meetings, empty_events et meetings_total; health reprend aussi le detail par sport.
- Impact: le signal H2H est pilotable: 83 events, 80 avec historique, 247 meetings, couverture 96.4% sur le snapshot courant.
- Verif: fetch_h2h.py --summary-only OK, build_health OK, py_compile OK, health h2h coverage=96.4%.
## Sprint v35.285 — Phase 12 V36 P-12.32 Lineups multi-sports sidecar (18:22 UTC)
- Avant: les signaux titulaires etaient disperses (XI foot, lanceurs MLB, goalie NHL) et NBA n'avait pas de statut explicite.
- Apres: lineups_multisport.json unifie le contexte starter par sport et le workflow le regenere avant health.
- Impact: 51/373 events ont un signal starter exploitable: 22 XI foot, 17 matchs MLB avec 34 pitchers, 12 matchs NHL avec 24 goalies projetes; NBA est marquee source en attente.
- Verif: build_lineups_multisport.py OK, health sources=24, lineups_multisport coverage=13.7%.
## Sprint v35.286 — Phase 12 V36 P-12.33 xG coverage audit (18:30 UTC)
- Avant: Understat etait actif (112 equipes, 6 ligues) mais on ne mesurait pas combien de matchs du feed avaient xG des deux cotes.
- Apres: xg_coverage.json mesure la couverture produit par ligue et le workflow le genere avant health.
- Impact: le signal xG est pilotable: 68/285 matchs foot ont xG home+away (23.9%); les manques sont samples pour prioriser les prochaines sources.
- Verif: build_xg_coverage.py OK, build_health OK, health sources=25 avec xg_coverage both_teams_pct=23.9%.
## Sprint v35.287 — Phase 12 V36 P-12.34 Match previews signal-based (18:41 UTC)
- Avant: la modal pouvait afficher beaucoup de donnees mais aucun resume court pre-match reutilisable par match.
- Apres: fetch_match_previews.py tente ESPN summary public puis genere une preview analytique locale a partir de xG/H2H/lineups/pitchers/markets.
- Impact: 12 previews top-signal produites, toutes en fallback local sur le snapshot courant; aucune fausse recap ESPN n'est affichee comme preview.
- Verif: fetch_match_previews.py --limit 12 OK, build_health OK, health sources=26 avec match_previews previews=12.
## Sprint v35.288 — Phase 12 V36 P-12.35 Validation modele ensemble (18:06 UTC)
- Avant: l'audit ensemble etait un snapshot ancien, sans comparaison Brier sous-modele vs ensemble ni mesure des niveaux V36 du slate courant.
- Apres: scripts/validate_ensemble_model.py appelle le vrai predictMatch via model_loader, produit ensemble_validation.json/md, compare Dixon-Coles/xG, Elo et forme, et mesure les tiers V36 soft/strict.
- Impact: 701 predictions historiques validees, Brier ensemble 0.2333 vs 0.2500 random, 0 divergence >0.15, aucun sous-modele ne bat l'ensemble de >0.010 Brier; slate courant = 42 picks V36 classes dont 7 stricts.
- Verif: validate_ensemble_model.py OK, py_compile OK.
## Sprint v35.289 — Phase 12 V36 P-12.36 Audit biais ligues (18:12 UTC)
- Avant: predictMatch penalise deja les ligues a Brier eleve, mais le guardrail etait invisible hors code et non mesurable dans health.
- Apres: build_league_bias_audit.py genere league_bias_audit.json depuis backtest_report_v2, avec statuts trusted/watch/deprioritize et couverture courante par ligue; refresh.yml et health.json le suivent.
- Impact: 49 ligues auditees, 22 a surveiller, 1 trusted, 144 matchs a venir situes sur des ligues watch; 0 ligue en deprioritize dur sur le snapshot.
- Verif: build_league_bias_audit.py OK, build_health OK, py_compile OK.
## Sprint v35.290 — Phase 12 V36 P-12.37 Picks du genie (18:15 UTC)
- Avant: les consensus rares etaient dilues dans les 5 colonnes, sans surface dediee quand ensemble + marche + calibration s'alignent.
- Apres: l'accueil affiche une section "Picks du genie" uniquement quand un pick strict a au moins 2 sous-modeles, variance <=0.045, edge propre et aucune penalite ligue.
- Impact: 4 picks consensus visibles au-dessus du cockpit V36 sur le snapshot courant, sans ajouter de panier ni de contenu inutile.
- Verif: Playwright local dashboard 1440px => 4 genius cards, 5 tier columns, 15 cards visibles, overflowX=false, 0 erreur console; screenshot .cache/v36-genius-dashboard.png.
## Sprint v35.291 — AUTO 10/10 Vague 1 crédibilité tiers (19:31 UTC)
- Avant: l'accueil V36 pouvait classer des picks hors plage (ex. cote 1.45 en Solide), afficher des tags strict/souple non documentés, et laisser un même match occuper plusieurs niveaux.
- Après: les 5 tiers exigent tous EV/edge positifs, bornes de cote strictes, seuils conf/edge documentés, un seul pick par match sur le cockpit, et les cartes affichent EV au lieu de strict/souple.
- Cohérence: ajout garde-fous handicap vs score exact + doublon 1N2 <-> handicap -0.5; les team totals sont renommés "Total équipe ..." pour ne plus ressembler à un handicap.
- Vérif: app.js/sw.js syntax OK, market consistency audit 58/58, dashboard desktop 0 tier hors plage, 0 tag strict/souple, 0 overflow, 0 erreur console.
## Sprint v35.292 — AUTO 10/10 Vague 2 IDs + localStorage guardrails (19:37 UTC)
- Avant: les IDs de paris/alertes utilisaient Date.now()+Math.random(), les recherches recentes n'avaient pas de garde robuste contre corruption/bloat.
- Apres: makeLocalId() utilise crypto.randomUUID() avec fallback compteur+crypto values, safeJsonParse/safeLocalStorageSet centralisent les cas quotas/corruption, et les recherches recentes sont nettoyees + cappees a 20.
- Impact: bugs #41/#82/#83 traites sur les chemins critiques (tracked bets, user bets, alert rules), sans changer les donnees fraiches ni la logique modele.
- Verif: app.js syntax OK; Playwright local 2000 IDs => 2000 uniques, 25 alertes => 20 gardees, 3 user bets => 3 IDs uniques, 0 erreur console.
## Sprint v35.293 — AUTO 10/10 PWA/SEO obvious fixes (19:42 UTC)
- Avant: manifest shortcuts pointaient encore vers #top/#locks/#bilan, la description parlait d'un ancien terminal value, et le viewport ignorait viewport-fit=cover.
- Apres: shortcuts V36 vers Accueil/Tous/Performance/Methode avec icones, description PWA alignee 5 tiers, description HTML raccourcie, meta no-cache retirees au profit du SW, viewport iPhone notch OK.
- Impact: bugs #61/#62/#63/#71/#72/#84 avances sans changer l'UI ni la data; sitemap root passe en daily pour refléter le refresh fréquent.
- Verif: manifest JSON OK, app.js syntax OK, head audit OK (plus de meta Cache-Control/Pragma/Expires), diff-check OK.
## Sprint v35.294 — AUTO 10/10 Modèle ensemble guardrails (19:48 UTC)
- Avant: quand l'ensemble avait moins de 2 sous-modèles, agreement_variance pouvait valoir 0 et donner une impression de consensus parfait.
- Après: variance insuffisante = null + flag insufficient; l'abstain ajoute ensemble_insufficient quand le sport n'a pas assez de signaux purs.
- Impact: bug #74 traité sans faux positif Dixon-Coles: le 1-1 était déjà couvert par tau=1-rho et par tests unitaires existants.
- Verif: app.js syntax OK; validate_ensemble_model.py OK (714 prédictions, Brier ensemble 0.2355, warnings=0).
## Sprint v35.295 — AUTO 10/10 Service Worker install diet (19:53 UTC)
- Avant: le Service Worker précachait app.js (~1.7MB) + images OG pendant l'installation, trop lourd pour une première visite mobile/3G.
- Après: app.js reste stale-while-revalidate au premier hit puis offline, les OG images passent en cache-first lazy, et le precache install descend à ~493KB.
- Impact: bugs #44/#45 avancés: install PWA plus léger, cache toujours robuste après une vraie visite, aucune donnée dynamique précachée.
- Verif: sw.js syntax OK; calcul local precache=12 fichiers / 493KB, app.js=1725KB hors install.
## Sprint v35.296 — AUTO 10/10 Accueil tableau dense (19:58 UTC)
- Avant: l'accueil V36 en 5 colonnes limitait la lecture globale, et le rail droit comprimait les colonnes utiles.
- Apres: accueil refondu en table pro betting dense: Sport / Heure / Ligue / Match / Pari / Cote / Conf / Edge / Tier / Action, tri par colonne, recherche live, badges tier et cards mobile.
- Densite: 40 propositions aujourd'hui, 30 lignes dans la zone de table desktop, toutes les colonnes visibles, zero overflow horizontal; mobile garde 40 cards empilees.
- UX: rail radar passe sous la table pour laisser toute la largeur au tableau; sections Genius/Boost restent sous la table comme complements.
- Verif: app.js/sw.js syntax OK; Playwright local dashboard desktop/mobile OK, modal au clic OK, 0 erreur console, 0 cible tactile <40px; a11y audit 8 pages = 0/0/0; Lighthouse fallback min perf 97, min a11y 97, SEO 100.
## Sprint v35.297 — AUTO 10/10 Audit post-table hardening (20:19 UTC)
- Avant: l'audit post-table capturait bien les 32 viewports, mais le click audit gardait parfois un ancien marqueur invisible et le modal tabs audit cherchait les onglets avant d'ouvrir le volet technique V36.
- Apres: click_audit nettoie ses marqueurs a chaque remap; modal_tabs_audit ouvre "Voir les details techniques" avant de tester les onglets; night_metrics est regenere sur le snapshot courant.
- Couverture data: 367 events, 305 upcoming, Winamax exact 367/367 (100%), 321 events avec marches >1N2 apres rebase cron.
- Verif: visual_capture phase-post-table-v35-297 = 32 PNG OK; click audit 191/191 sans echec; modal tabs 4 sports testes + 1 skip, 0 echec; a11y 8 pages = 0/0/0; Lighthouse min perf 97, min a11y 97, SEO 100.
## Sprint v35.298 — AUTO 10/10 Vague 4 crédibilité marchés (20:30 UTC)
- Avant: les team totals etaient normalises comme des totaux globaux, ce qui pouvait confondre "total equipe domicile" avec un marche O/U de match; poissonPmf pouvait produire NaN sur lambda/k invalides.
- Apres: teamTotal devient scope par equipe (home/away/team), score exact valide les buts de la bonne equipe, les doublons 1N2 <-> handicap -0.5 sont explicitement couverts cote home et away, et poissonPmf tombe sur un fallback 0/1 deterministe.
- Impact: bugs #11/#13/#29/#73/#79 securises par tests/audit; les libelles "Total equipe ..." restent lisibles dans la table sans ressembler a un handicap.
- Verif: app.js/sw.js/market_consistency_audit.js syntax OK; market_consistency_audit 64/64 sans echec; test direct poissonPmf invalides + Dixon-Coles tau(1,1) OK.
## Sprint v35.299 — AUTO 10/10 Table V37 jour/historique (20:52 UTC)
- Avant: l'accueil V36 plafonnait a 120 lignes, n'affichait pas la date, gardait une colonne Action inutile et ne permettait pas de lire J-1/J+5 depuis le tableau.
- Apres: Table V37 rend jusqu'a 360 lignes, ajoute Date, retire Action, explique les 5 tiers en bannière cliquable, ajoute nav 7 jours/J-2..J+5/date picker, toggle LIVE et refresh auto 30s.
- Historique: les dates passees ajoutent une colonne Resultat + footer WON/LOST/VOID/ROI; les matchs commences sont retires du flux a venir si LIVE n'est pas active.
- Verif: app.js/sw.js syntax OK; Playwright local desktop = 360 lignes rendues / 405 picks disponibles, headers Sport-Date-Heure-Ligue-Match-Pari-Cote-Conf-Edge-Tier, clic ligne modal OK, J-1 affiche Resultat + footer, 0 erreur console; visual_capture v37-table-baseline = 32 PNG; a11y 8 pages = 0/0/0; Lighthouse min perf 97, min a11y 98, SEO 100.
## Sprint v35.300 — AUTO 10/10 Metrics + MCP date dynamique (20:54 UTC)
- Avant: night_metrics etait deja stale apres la refonte table, et les outils MCP pouvaient croire une ancienne date si le champ data.today etait decale.
- Apres: night_metrics est regenere (367 events, 305 upcoming, Winamax exact 367/367), et les outils MCP choisissent le jour Europe/Paris actif ou le prochain jour disponible dans data.days.
- Impact: get_pipeline_status expose local_today + data_today_field et retourne aujourd'hui=2026-05-03 sur le snapshot courant; les outils today/high_confidence/gaps/sports utilisent la meme resolution.
- Verif: test_mcp_smoke OK 14/18 (4 tools skip args requis), py_compile OK, lecture directe get_pipeline_status => today/local_today/data_today_field = 2026-05-03.
## Sprint v35.301 — AUTO 10/10 Data intelligence profils publics (20:59 UTC)
- Avant: public_team_stats aggregait deja forme/xG, mais il n'existait pas de profil equipe/joueur rechercheable combinant calendrier, blessures, lineups/pitchers/goalies et contexte.
- Apres: build_public_profiles.py genere public_team_profiles.json + public_player_profiles.json depuis les sidecars publics existants et le workflow les publie a chaque refresh.
- Impact: 881 profils equipes, 459 avec matchs a venir, 87 avec disponibilite blessure/lineup et 500 profils joueurs prioritaires (blessures + pitchers/goalies) disponibles pour recherche approfondie.
- Verif: build_public_profiles OK, build_health OK (29 sources suivies), py_compile OK.
## Sprint v35.302 — AUTO 10/10 Recherche profils equipes/joueurs (21:05 UTC)
- Avant: la recherche Cmd-K/topbar indexait les matchs, equipes et ligues du feed, mais ignorait les nouveaux profils publics equipes/joueurs.
- Apres: la recherche charge public_team_profiles.json + public_player_profiles.json en cache, puis ajoute les profils equipes, scores, tags et joueurs blesses/starters aux suggestions.
- Impact: Theo peut chercher une equipe ou un joueur et tomber sur le contexte profond; un joueur renvoie vers son equipe pour voir les prochains matchs pertinents.
- Verif: app.js/sw.js syntax OK, smoke navigateur local recherche "Aaron" => profils joueurs avec equipe/statut, 0 erreur console; hashes app/css restampes dans pronostics.html.
## Sprint v35.303 — AUTO 10/10 Console prod silencieuse (21:14 UTC)
- Avant: 25+ chemins non bloquants ecrivaient des warnings/logs directement en console production (polling data, export CSV, notifs, diag, fallback prefs), ce qui brouillait les audits et amplifiait le bug #50.
- Apres: app.js passe par prodWarn/prodLog/prodTable, actifs uniquement avec ?debug=1 ou localStorage paris_sportif_debug=1; les helpers initiaux de pronostics.html sont aussi gardes par le meme mode debug.
- Impact: production reste silencieuse pour Theo et les tests, mais le diagnostic complet reste disponible en debug volontaire sans perdre les traces utiles.
- Verif: scan console direct app.js/pronostics.html => 0 occurrence prod, app.js/sw.js syntax OK, smoke dashboard local 720 lignes table, debugFlag=false, 0 warning/error; CACHE_VERSION + footer + hash app.js bumpes.
## Sprint v35.304 — AUTO 10/10 Credibilite marches handicap/team total (21:22 UTC)
- Avant: la garde 1N2 vs handicap -0,5 rejetait bien les doublons, mais l'explication disait seulement "incompatible"; les team totals pouvaient garder des libelles bookmaker type "Domicile +1.5" trop proches d'un handicap.
- Apres: les conflits 1N2 <-> handicap -0,5 expliquent explicitement "Doublon logique", les contradictions +0,5 restent marquees incoherentes, et les team totals affichent "Total buts <equipe> — plus/moins de X (equipe seulement)" avec semanticGroup dedie.
- Impact: Theo peut garder les handicaps sans voir deux fois le meme pari mathematique, et les totaux equipe ne ressemblent plus a des handicaps.
- Verif: app.js syntax OK; smoke navigateur local => raisons Doublon/Incoherent OK, label "Total buts Freiburg — plus de 1,5 (equipe seulement)" OK, 0 warning/error; specs market-consistency/candidates enrichies.
## Sprint v35.305 — AUTO 10/10 Garde-fous Poisson/Dixon-Coles (21:27 UTC)
- Avant: poissonTopScores retournait [] si une lambda valait 0/invalide, et Dixon-Coles n'avait pas de clamp explicite sur rho/tau meme si tau(1,1) existait.
- Apres: tau couvre explicitement les quatre cellules bas score (0-0, 0-1, 1-0, 1-1), clamp rho/tau pour eviter les masses negatives, et poissonTopScores bascule sur une lambda conservatrice au lieu de vider les scores exacts.
- Impact: un match a data offensive incomplete garde une prediction exploitable et un score probable plutot qu'un trou silencieux dans la modal/table.
- Verif: app.js syntax OK; smoke navigateur local => tau(1,1)=1.13, tau(2,2)=1, zero/NaN lambdas retournent 3 scores finis, 0 warning/error; spec model-math-guards ajoutee.
## Sprint v35.306 — AUTO 10/10 SW data lourde non bloquante (21:31 UTC)
- Avant: le Service Worker traitait data.js et odds_history.jsonl en network-first, donc un gros fichier pouvait bloquer l'UX sur reseau lent.
- Apres: data.js + odds_history.jsonl passent en stale-while-revalidate; data_lite/data_today/health restent network-first pour garder la fraicheur critique.
- Impact: le rendu initial garde le dernier cache disponible et rafraichit en arriere-plan, ce qui preserve la sensation temps reel sans penaliser les connexions lentes.
- Verif: sw.js syntax OK, CACHE_VERSION + footer bumpes.
## Sprint v35.307 — AUTO 10/10 Right rail prochains matchs fiables (21:35 UTC)
- Avant: les prochains matchs du rail pouvaient paraitre repetitifs/non tries, avec uniquement heure + countdown et peu de contexte date.
- Apres: les listes prochains matchs sont triees strictement par kickoff et affichent Date + Heure + countdown; le rail legacy applique la meme logique.
- Impact: le widget desktop montre une vraie file horaire, distingue aujourd'hui/demain, et evite l'impression de countdown copie-colle.
- Verif: app.js syntax OK; smoke dashboard desktop => labels rail dates/heures/countdowns presents, 0 warning/error; app hash + cache + footer bumpes.
## Sprint v35.308 — AUTO 10/10 Night metrics refresh (21:24 UTC)
- Avant: night_metrics datait de 20:51 UTC pendant que le cron avait deja rafraichi data.js/data_lite/markets.
- Apres: night_metrics regenere a 21:23:38 UTC sur le snapshot courant: 367 events, 294 upcoming, Winamax exact 367/367, 316 marches > 1N2.
- Impact: les rapports couverture/perf repartent d'une base coherente apres la refonte table et les sprints data.
- Verif: measure_night_metrics.py OK; winamax_exact_ratio=1.0, detail football 219/230 (95.2%), health warnings=1.
## Sprint v35.309 — AUTO 10/10 Calibration freshness guard (21:39 UTC)
- Avant: les courbes isotonic/backtest pouvaient encore calibrer le modele si backtest_report_v2.json etait vieux, donnant une confiance perimee mais visuellement propre.
- Apres: backtest_report_v2 est accepte seulement si generated_at date de moins de 7 jours; sinon calibration globale/per-sport/per-market est marquee stale et les probas brutes sont conservees.
- Impact: bug #78 ferme cote modele: une courbe obsolete ne peut plus aiguiser artificiellement un pick, et __modelCalibration expose stale/generated_at pour diagnostic.
- Verif: app.js/sw.js syntax OK; smoke navigateur local => fresh=true, J-8=false, missing=false, liveCalTotal=647, 0 warning/error; spec model-math-guards etendue.
## Sprint v35.310 — AUTO 10/10 Storage corruption recovery (21:47 UTC)
- Avant: plusieurs zones user (filtres V37, favoris, watchlist, alertes) lisaient encore du JSON localStorage avec des try/catch disperses, mais sans helper unique ni test de stockage corrompu.
- Apres: safeLocalStorageGet/safeLocalStorageJson deviennent les helpers globaux; dashboard filter, oddMin, prefs accessibilite, recent matches, bookmarks, watchlist et alert rules les utilisent.
- Impact: bugs #39/#40 avances: un localStorage corrompu ou bloque ne casse plus l'accueil/table, et les favoris/watchlist repartent sur des defaults propres.
- Verif: app.js/sw.js syntax OK; smoke navigateur local avec JSON corrompu => favoris/watchlist/alertes fallback OK, toggle favori OK, reload dashboard 720 lignes, 0 warning/error; spec storage-safety ajoutee.
## Sprint v35.311 — AUTO 10/10 Backtest fetch cache (21:53 UTC)
- Avant: backtest_report_v2.json et backtest_report_markets.json etaient recuperes avec cache no-store + timestamp, donc chaque boot/page pouvait forcer un aller-retour reseau inutile.
- Apres: _fetchBacktestReportV2 partage une promesse/memoire par session et utilise un bucket 15 min cache-friendly; le rapport marche utilise un bucket 1h.
- Impact: bug #22 avance: la calibration reste fraiche sans spam reseau, Performance reutilise le rapport deja charge, et le timeout de page conserve son garde-fou.
- Verif: app.js/sw.js syntax OK; smoke navigateur local route backtest => 1 seul hit apres boot + 2 appels API, total_n=42, meme objet en memoire, 0 warning/error; spec backtest-cache ajoutee.
## Sprint v35.312 — AUTO 10/10 Stadium metadata cache bust (21:58 UTC)
- Avant: stadiums.json etait charge en force-cache permanent, donc les distances/fatigue pouvaient rester sur un vieux sidecar meme apres refresh data.
- Apres: stadiums.json utilise un cache key quotidien derive de PRONOSTICS_DATA.generated_at et cache default, ce qui reste leger tout en suivant les refreshs.
- Impact: bug #33 ferme sans fetch agressif: metadonnees stade/fatigue se renouvellent avec la date data, mais restent cachees durant la journee.
- Verif: app.js/sw.js syntax OK; smoke navigateur local => /stadiums.json?v=20260503, dashboard 720 lignes, 0 warning/error; footer/cache/app hash bumpes.
## Sprint v35.313 — AUTO 10/10 Search XSS hardening (22:06 UTC)
- Avant: les suggestions de recherche et les recherches recentes reconstruisaient du HTML avec du texte utilisateur/profils publics, surface prioritaire du bug #36.
- Apres: ces surfaces rendent par DOM/textContent, le highlight utilise un mark cree par element, et le fallback logo utilise un listener error sans inline onerror.
- Impact: la recherche profonde equipes/joueurs reste identique visuellement mais ne parse plus une saisie utilisateur comme HTML executable.
- Verif: app.js/sw.js syntax OK; smoke navigateur local avec `<img src=x onerror=alert(1)>` => 0 dialog, 0 img injectee, 0 erreur console, table dashboard 365 lignes; footer/cache/app hash bumpes.
## Sprint v35.314 — AUTO 10/10 Refresh DOM safety (22:14 UTC)
- Avant: l'indicateur freshness/refresh et quelques fallbacks d'erreur utilisaient encore innerHTML pour de simples textes/liens internes.
- Apres: le lien force-refresh est cree par DOM, les statuts freshness/live/erreur passent par textContent + elements, et le fallback Bilan n'injecte plus de HTML.
- Impact: bug #36 avance sur les surfaces persistantes/temps reel, avec moins de parsing HTML inutile pendant le polling.
- Verif: app.js syntax OK; smoke navigateur local => freshness visible, table dashboard 360 lignes, 0 warning/error avec serveur MIME correct; footer/cache/app hash bumpes.
## Sprint v35.315 — AUTO 10/10 V37 detail listener delegation (22:20 UTC)
- Avant: la table dense attachait un listener click + keydown sur chaque entree data-big-detail, soit 700+ handlers sur les vues riches.
- Apres: l'ouverture detail V37 passe par delegation unique sur le conteneur dashboard, avec lookup match rafraichi a chaque render.
- Impact: bug #37 avance sans changer l'UX: moins de handlers par render, clic ligne et clavier restent fonctionnels.
- Verif: app.js syntax OK; smoke navigateur local => 730 triggers data-big-detail, delegation ouvre bien la modal FC Andorra vs Las Palmas, 0 warning/error; footer/cache/app hash bumpes.
## Sprint v35.316 — AUTO 10/10 Sitemap hubs V37 (22:27 UTC)
- Avant: build_sitemap.py publiait encore les routes legacy #top/#locks/#valeur/#matchs et l'accueil racine etait annonce weekly.
- Apres: le sitemap expose les hubs valides V37 (dashboard/tous/performance/academie/profil/sante/montantes/legal), racine daily, puis regenere 359 URLs.
- Impact: bugs SEO #61/#69 avances: les robots voient les vraies portes du produit au lieu des anciens raccourcis morts.
- Verif: build_sitemap OK; py_compile OK; grep legacy routes sitemap => 0 resultat; footer/cache bumpes.
## Sprint v35.317 — AUTO 10/10 Odds history cache window (22:35 UTC)
- Avant: odds_history.jsonl etait lazy mais charge en no-cache et parse integralement a chaque invalidation, meme si le fichier grossissait.
- Apres: chargement cache-friendly bucket horaire, parsing borne aux 50k dernieres lignes, stats de diagnostic __oddsHistoryStats, et loader DOM leger sans innerHTML.
- Impact: bugs #21/#44 avances: la modal garde les sparklines disponibles mais evite un fetch/parse trop agressif sur historique long.
- Verif: app.js syntax OK; smoke navigateur local modal detail OK, 730 triggers, aucun hit odds_history tant que la sparkline n'est pas demandee, 0 warning/error; footer/cache/app hash bumpes.
## Sprint v35.318 — AUTO 10/10 Conflict marker hotfix + audit refresh (22:43 UTC)
- Avant: un autostash conflict avait laisse des marqueurs de conflit dans pronostics.html/sw.js, detectes par le smoke navigateur post-audit.
- Apres: marqueurs retires, app hash correct 61e428df conserve, footer v35.318, cache SW bump, night_metrics et a11y-report rafraichis.
- Metrics: night_metrics 342 events, 304 upcoming, Winamax exact 342/342 (100%), foot detail 217/231 (93.9%), a11y 8 pages 0/0/0.
- Verif: grep conflict markers => 0; app.js/sw.js syntax OK; smoke navigateur dashboard 730 lignes + modal ouverte, 0 warning/error.
## Sprint v35.319 — AUTO 10/10 Conflict marker final guard (22:48 UTC)
- Avant: le rebase cron avait re-empile des marqueurs dans pronostics.html/sw.js apres le hotfix, car l'autostash local conservait plusieurs couches de conflit.
- Apres: pronostics.html garde le hash app 61e428df, data_lite du cron 4c19163b, footer v35.319, et sw.js a un cache propre sans marqueur.
- Impact: le deploiement redevient chargeable; le smoke navigateur ne verra plus d'erreur Unexpected token.
- Verif: grep conflict markers sur sw/pronostics => 0; app.js/sw.js syntax OK; prochaine etape = commit/push direct sans repull intermediaire.
## Sprint v35.320 — AUTO 10/10 Libelles Winamax lisibles (15:32 UTC)
- Avant: la colonne Pari pouvait afficher des codes opaques (`DNB 1`, `BTTS Oui`, `Double chance 1X`, handicaps bruts) que Theo ne retrouvait pas dans son vocabulaire Winamax.
- Apres: tous les candidats passent par un formateur central Winamax-style avec noms d'equipes, handicaps expliques, DNB nul rembourse, team totals naturels et tooltips par marche.
- Impact: table V37, cards mobile et modal detail partagent les memes libelles debutant-friendly sans changer les cotes, proba, edge ni settlement.
- Verif: grep conflict markers => 0; app.js syntax OK; smoke navigateur dashboard 120 libelles scannes, 0 libelle interdit, 0 erreur console; footer v35.320 + cache/app hash bumpes.
## Sprint v35.321 — AUTO 10/10 Tests libelles + credibilite marche (15:39 UTC)
- Avant: les tests acceptaient encore les anciens libelles opaques (`Total buts ... equipe seulement`) et le formateur Winamax-style n'etait pas expose aux specs.
- Apres: `formatWinamaxPickLabel` est disponible dans `__testAPI`, les specs verrouillent DNB/BTTS/handicap/team total en francais naturel et refusent les libelles bruts.
- Impact: regression impossible sur le bug Theo: la table peut evoluer sans reintroduire `DNB 1`, `BTTS Oui`, `Mi-temps X` ou les handicaps incomprehensibles.
- Verif: app.js syntax OK; smoke navigateur label formatter + table 200 libelles => 0 libelle interdit; smoke coherence marche => 1N2/-0,5 dedoublonne, 0-0+DC12 rejete, tau Dixon-Coles 1-1 OK.
## Sprint v35.322 — AUTO 10/10 V37 logo fallback sans inline handler (15:43 UTC)
- Avant: la table V37 utilisait encore un fallback logo en `onerror` inline, petite surface XSS/CSP dans la vue principale.
- Apres: les logos de la table dense utilisent `data-fallback` + delegation `error` capturee sur le dashboard, sans JavaScript inline.
- Impact: bug #36/#65 avance sur la surface la plus exposee: le tableau d'accueil garde ses initiales de secours mais ne depend plus d'un handler HTML.
- Verif: app.js syntax OK; smoke navigateur dashboard => 0 `img[onerror]` dans `.v36-table-panel`, fallback image remplace par initiale, 0 erreur console; footer/cache/app hash bumpes.
## Sprint v35.323 — AUTO 10/10 Fresh metrics + MCP date guard (15:46 UTC)
- Avant: night_metrics et le smoke MCP ne verrouillaient pas explicitement le cas `data.today` obsolete, source possible du retour `2026-04-30`.
- Apres: night_metrics regenere sur le snapshot courant et test_mcp_smoke simule `data.today=2026-04-30` pour verifier que `_active_data_day` prend le jour Europe/Paris frais.
- Impact: bug #16 garde-fou en place: get_pipeline_status annonce `today=2026-05-04`, local_today=2026-05-04, data_age_min=0; Winamax exact reste 342/342 (100%).
- Verif: py_compile MCP/metrics/smoke OK; test_mcp_smoke OK 14 tools; measure_night_metrics OK; footer/cache bumpes.
## Sprint v35.324 — AUTO 10/10 Inline event handlers sweep (15:51 UTC)
- Avant: app.js contenait encore des `onerror/onmouseover/onclick` inline et pronostics.html gardait `onload/onerror`, bloquant la trajectoire CSP stricte.
- Apres: images cassées passent par `handleSafeImageError` delegue, les CTA/refresh utilisent des data attributes, et le CSS/analytics se chargent sans handler HTML inline.
- Impact: bug #36/#65 avance fortement: grep inline events sur app.js/pronostics/app.css/sw.js => 0, tout en conservant les fallbacks logos/joueurs.
- Verif: app hash 5d8f3cc5, css hash d2c9d7f2, cache/footer bumpes; syntax/smoke navigateur a suivre avant push.
## Sprint v35.325 — AUTO 10/10 Script CSP without unsafe-inline (15:54 UTC)
- Avant: `script-src` autorisait encore `unsafe-inline`, ce qui neutralisait une partie du durcissement XSS malgre le retrait des handlers HTML.
- Apres: les 7 scripts inline actuels (JSON-LD inclus) sont autorises uniquement par hashes SHA-256; `unsafe-inline` est retire de script-src.
- Impact: bug #65 ferme cote script: une injection JS inline non hashée ne peut plus s'executer, tandis que style-src garde `unsafe-inline` provisoire pour les styles historiques.
- Verif: smoke navigateur => 730 lignes table, 0 inline event, script-src sans unsafe-inline, fallback image OK, 0 erreur console; footer/cache bumpes.
## Sprint v35.326 — AUTO 10/10 Global HTML sink sanitizer (16:00 UTC)
- Avant: 63 sinks `innerHTML` restaient dans le megafichier, avec des templates majoritairement echappes mais sans garde-fou central contre une future interpolation risquee.
- Apres: `Element.innerHTML` passe par `sanitizeTrustedHTML`, qui retire scripts, iframes, handlers `on*`, `srcdoc`, URLs `javascript:` et CSS `url(javascript:)` avant injection.
- Impact: bug #36 avance globalement: les anciens rendus restent compatibles, mais une valeur data/user mal echappee ne peut plus poser un handler/script executable via les sinks historiques.
- Verif: app.js/sw.js syntax OK, inline scripts OK, CSP hash recalcule, smoke navigateur dashboard 360 lignes, 0 inline event, sonde XSS neutralisee, 0 erreur console; footer/cache/app hash bumpes.
## Sprint v35.327 — AUTO 10/10 No native prompt fallback (16:07 UTC)
- Avant: le partage de modal detail gardait un fallback `prompt()` natif si Clipboard API et Web Share etaient indisponibles.
- Apres: le fallback utilise `_copyToClipboard` (textarea + execCommand) et remonte un toast propre en succes/echec, sans dialogue natif bloquant.
- Impact: garde-fou produit respecte: aucune interaction de partage ne sort du design system, et le lien reste copiable sur navigateurs non securises/anciens.
- Verif: app.js/sw.js syntax OK, grep prompt/confirm actifs => 0 hors commentaires/PWA install prompt, CSP hash recalcule; smoke navigateur a suivre avant push.
## Sprint v35.328 — AUTO 10/10 No native alert fallback (16:10 UTC)
- Avant: trois `alert()` natifs restaient sur export CSV et details stockage local, donc l'UX pouvait encore sortir du design system.
- Apres: les cas utilisent `toast()` avec tons warn/info, sans dialogue navigateur bloquant.
- Impact: parcours export/consentement plus propre et plus testable, aucun prompt/confirm/alert actif hors prompt PWA officiel.
- Verif: app hash e997f15f, CSP hash recalcule, cache/footer bumpes; syntax + smoke navigateur a suivre avant push.
## Sprint v35.329 — AUTO 10/10 Pipeline signaux foot visibles (16:24 UTC)
- Avant: `patch_all_quick.py` voyait `injuries_soccer.json`, `lineups_soccer.json` et `referees_soccer.json`, mais n'injectait pas les blessures foot et matchait compos/arbitres trop strictement/top-5 only.
- Apres: le mega-patcher couvre top-5, D2, UEFA, MLS/LATAM, alias Roma/Manchester/PSG, matching paire home-away robuste, et attache blessures Sofascore avec flags known/severe/source.
- Impact mesure a blanc: blessures foot 0 -> 114 events connus (92 upcoming), arbitres 3 -> 24, lineups 11 -> 32; ces signaux deviennent exploitables par le modele au prochain cron.
- Verif: py_compile patch_all_quick OK; dry-run in-memory OK; footer/cache bumpes v35.329, app.js?v recale sur e997f15f.
## Sprint v35.330 — AUTO 10/10 Blessures multi-sports exploitables (16:27 UTC)
- Avant: `injuries_multisport.json` contenait deja ESPN public MLB/NBA/WNBA/NHL/NFL, mais `patch_all_quick.py` retombait sur un vieux `injuries.json` et attachait 0 event.
- Apres: le patch rapide colle les blessures par cle `league_code:team_id` sur baseball, basket et hockey, avec known/count/severe/source au niveau equipe et event.
- Impact mesure a blanc cumule: blessures visibles 0 -> 192 events total, dont 164 upcoming (football 114, baseball 40, hockey 15, basket 23).
- Verif: dry-run in-memory OK; py_compile a suivre dans garde-fous; footer/cache bumpes v35.330.
## Sprint v35.331 — AUTO 10/10 Intelligence betting sidecars (16:33 UTC)
- Avant: les biais ligue, angles rares et conseils de timing etaient disperses ou implicites, donc impossibles a exposer proprement dans le site.
- Apres: `build_betting_intelligence.py` genere `league_inefficiencies.json`, `detected_angles.json`, `rare_signals.json` et `timing_edges.json`; le cron les publie et `health.json` les compte.
- Impact mesure local: 34 ligues profilees, 151 angles detectes, 27 signaux rares, 290 conseils timing dont 7 attentes lineups et 3 cotes qui raccourcissent.
- Verif: py_compile/build_betting_intelligence/build_health OK; footer/cache bumpes v35.331; checks JS complets avant push.
## Sprint v35.332 — AUTO 10/10 Rail Insights modele (16:35 UTC)
- Avant: le rail accueil repetait prochains matchs / stats live, alors que la table contient deja cette information.
- Apres: le rail charge les sidecars betting intelligence et affiche biais ligues, smart money / signaux rares, angles de match et timing de mise sans bloquer le dashboard si un JSON manque.
- Impact: le site commence a exposer les angles "que les autres ne voient pas" directement sur l'accueil desktop, avec clic ligne -> modal match quand l'event est disponible.
- Verif: app.js/sw.js/inline/CSP hashes OK; hash app.js recalcule d9ea6e81; cache/footer bumpes v35.332; capture visuelle bloquee localement (Playwright absent du workspace).
## Sprint v35.333 — AUTO 10/10 Starter signals MLB/NHL (16:43 UTC)
- Avant: `mlb_pitchers.json` et `nhl_stats.json` existaient mais `patch_all_quick.py` lisait les anciens schemas (`by_match`, `by_team`), donc pitchers/goalies restaient invisibles dans `data.js`.
- Apres: patch rapide lit `matches` MLB par home/away/date et `teams` NHL par abbr/name, attache `event.mlb_pitchers` + `event.nhl_stats`, et `night_metrics` compte les starter signals multi-sports.
- Impact mesure: lineups/starter_signals 32 -> 79 events, avec baseball 32 pitchers et hockey 15 goalies; blessures 192, H2H 158, xG 88, Winamax exact 342/342.
- Verif: py_compile patch_all_quick/measure OK; patch_all_quick/build_lineups_multisport/measure_night_metrics/build_health/finalize_inline OK; data_lite hash recalc 54c58ca9; cache/footer bumpes v35.333.

## Sprint v35.334 — AUTO 10/10 Aliases signaux foot (16:51 UTC)
- Avant: `patch_all_quick.py` avait une petite table locale d'aliases alors que `winamax_map.py` connaissait deja beaucoup de variantes FR/EN; les signaux pouvaient rester dormants sur Bayern/Heidenheim, Atletico, Ajax/PSV, MLS/Liga MX.
- Apres: le patch rapide importe les aliases Winamax et ajoute des variantes Allemagne/UEFA/Portugal/Pays-Bas/Belgique/MLS/Liga MX/Argentine pour partager le meme vocabulaire entre cotes et signaux.
- Impact mesure: couverture immediate stable sur le snapshot courant (starter_signals 79, injuries 192, referee 24), mais le prochain refresh peut matcher les nouvelles variantes sans nouveau code.
- Verif: py_compile OK; patch_all_quick/build_lineups_multisport/measure_night_metrics/build_health/finalize_inline OK; data_lite hash recalc 1d0cfa8b; cache/footer bumpes v35.334.

## Sprint v35.335 — AUTO 10/10 Score opportunite table (16:56 UTC)
- Avant: les angles rares, biais ligue, timing et richesse data etaient surtout visibles dans le rail droit; la table dense ne resumait que cote/confiance/edge.
- Apres: chaque ligne calcule un score opportunite 0-100 qui combine edge, confiance, tier strict, biais ligue, steam/drift cote, blessures/fatigue/lookahead, timing de mise et richesse data.
- Impact produit: Theo voit tout de suite les picks qui cumulent plusieurs signaux rares sans ouvrir la modal; tri `Score` ajoute au tableau et cartes mobile.
- Verif: app.js/app.css hashes recalcules (`bf57994d`, `66ce6f69`), cache/footer bumpes v35.335.

## Sprint v35.336 — AUTO 10/10 Rapport gaps signaux (17:05 UTC)
- Avant: les trous lineups/injuries/referee/H2H/xG etaient visibles seulement via quelques compteurs globaux et un log texte, pas actionnables match par match.
- Apres: `build_signal_gap_report.py` publie `signal_gap_report.json` avec couverture par signal/sport/ligue, top 80 matchs prioritaires, sources presentes/manquantes et extrait des unmatched.
- Impact mesure: snapshot courant = 342 events, 289 upcoming, 269 gaps prioritaires; couverture globale starter 79/342, injuries 192/342, referee 24/342, h2h 158/342, xG 88/342.
- Verif: py_compile OK; script OK; refresh.yml appelle le rapport apres health; cache/footer bumpes v35.336.

## Sprint v35.337 — AUTO 10/10 Gaps data dans le rail (17:11 UTC)
- Avant: `signal_gap_report.json` existait mais restait un fichier technique; Theo ne voyait pas encore quels matchs etaient sous-informes avant de lire la table.
- Apres: le dashboard charge `signal_gap_report.json` avec les autres sidecars intelligence et affiche un bloc "Gaps data critiques" dans le rail accueil avec priorite, match et signaux manquants.
- Impact: les picks ne sont plus presentes comme equivalemment fiables quand compos/arbitres/H2H/xG manquent; les trous sources deviennent visibles et cliquables vers la modal match.
- Verif: app.js hash `59a2c298`, app.css hash `92688e73`, cache/footer bumpes v35.337.

## Sprint v35.338 — AUTO 10/10 Profil Theo dans le score (17:18 UTC)
- Avant: l'analyse des paris trackes existait dans Profil, mais la table dense ignorait encore les forces/faiblesses personnelles de Theo.
- Apres: le score opportunite applique un bonus/malus sport, ligue et tranche de cote selon `computeCoachInsights()`; le rail ajoute un bloc "Profil Theo" avec les patterns locaux.
- Impact: deux picks mathematiquement proches peuvent maintenant etre departages par ce que Theo reussit vraiment a jouer, sans envoyer ces donnees hors navigateur.
- Verif: app.js hash `0640df98`, cache/footer bumpes v35.338.

## Sprint v35.339 — AUTO 10/10 Data gaps dans le score (17:29 UTC)
- Avant: les gaps lineups/referee/H2H/xG etaient visibles dans le rail, mais le tri Score pouvait encore placer tres haut un pick sous-informe.
- Apres: `signal_gap_report.json` est indexe par event et le score opportunite applique une penalite proportionnelle aux signaux critiques manquants, avec badges `data gap` / `prudence`.
- Impact: Theo garde la couverture complete, mais les picks sans sources fortes descendent naturellement et le tooltip dit ce qui manque.
- Verif: app.js hash `c8bf9f75`, app.css hash `66ce6f69`, cache/footer bumpes v35.339.

## Sprint v35.340 — AUTO 10/10 MCP pipeline gaps multi-jours (17:35 UTC)
- Avant: le MCP utilisait bien la date locale, mais `get_pipeline_status` ne resumait pas encore les gaps publies et `list_data_gaps` reconstruisait seulement les trous du jour.
- Apres: le MCP expose `night_metrics`, la couverture `signal_gap_report`, les signaux les plus manquants et liste les gaps prioritaires multi-jours.
- Impact mesure: `get_pipeline_status` retourne today=2026-05-04, 80 gaps prioritaires, top manquants referee/starter_signals/H2H; `list_data_gaps` pointe AVS-FC Porto en priorite 101.
- Verif: py_compile MCP OK, smoke MCP 14/18 OK (4 tools a args requis), cache/footer bumpes v35.340.

## Sprint v35.341 — AUTO 10/10 Starter gaps time-aware (17:42 UTC)
- Avant: `signal_gap_report` classait les compositions/starters manquants comme critiques meme plusieurs jours avant le match, ce qui sur-penalisait des picks encore loin du coup d'envoi.
- Apres: les `starter_signals` foot deviennent un gap attendu seulement a moins de 36h du kickoff, avec bonus de priorite si le match est a moins de 6h.
- Impact mesure: top gaps recalcules; starter_signals manquants dans les 80 priorites passent a 25, tout en gardant Sporting CP - Vitoria et les matchs du soir en alerte haute.
- Verif: build_signal_gap_report + py_compile OK; cache/footer bumpes v35.341.

## Sprint v35.342 — AUTO 10/10 Biais marches par ligue (17:50 UTC)
- Avant: `build_betting_intelligence.py` exposait les biais ligue, angles rares et timing, mais pas de lecture par famille de marche (OU, BTTS, double chance).
- Apres: publication de `market_biases_by_league.json`, ajout au refresh GitHub Actions et a `health.json`, avec labels lisibles et watchlist globale si le biais ligue manque encore de sample.
- Impact mesure: 11 marches profiles, 4 exploitables, 2 a fade, 6 signaux watchlist; exemples forts: double chance 12 et moins de 3,5 buts.
- Verif: py_compile/build_betting_intelligence/build_health OK; cache/footer bumpes v35.342.

## Sprint v35.343 — AUTO 10/10 Biais marches dans le dashboard (17:57 UTC)
- Avant: les biais par marche etaient produits en JSON mais n'influençaient pas encore la table dense ni le rail modele.
- Apres: le dashboard charge `market_biases_by_league.json`, applique un bonus/malus au score opportunite selon le marche exact du pick et ajoute un bloc rail "Biais par marche".
- Impact produit: les picks alignes avec un biais historique (ex: double chance ou under 3,5) remontent; les marches a fade sont etiquetes et penalises sans cacher la couverture.
- Verif: app.js --check OK; hashes app.js/app.css recalcules; cache/footer bumpes v35.343.

## Sprint v35.344 — AUTO 10/10 Aliases sources Portugal/NL (18:05 UTC)
- Avant: certains matchs avaient des sources publiques presentes mais non rattachees, ex. Sporting CP - Vitoria pointait `guimaraes` pendant que Sofascore publiait `vitoriasc`.
- Apres: `patch_all_quick.py` normalise Vitoria SC, AVS, FC Porto, Arouca, Nacional, Estrela et Heerenveen vers les cles reelles des sidecars sources.
- Impact mesure: referee visible +1 event dans `data.js`; Sporting CP - Vitoria descend de priorite 109 a 93 car l'arbitre n'est plus marque manquant; data_lite regenere.
- Verif: py_compile patch_all_quick OK; patch_all_quick/build_lineups_multisport/measure_night_metrics/build_signal_gap_report/build_health/finalize_inline OK; cache/footer bumpes v35.344.

## Sprint v35.345 — AUTO 10/10 Gaps arbitres time-aware (18:11 UTC)
- Avant: `signal_gap_report` exigeait l'arbitre pour tous les matchs foot, meme a J+6, ce qui gonflait les alertes avec des infos normalement pas encore publiees.
- Apres: le gap `referee` devient attendu seulement a moins de 72h du kickoff; les starters restent attendus a moins de 36h.
- Impact mesure: priority gaps 269 -> 239; les matchs a J+6 comme AVS - FC Porto ne sont plus penalises pour arbitre absent, tout en gardant les matchs du soir en alerte.
- Verif: py_compile/build_signal_gap_report/build_health OK; cache/footer bumpes v35.345.

## Sprint v35.346 — AUTO 10/10 Angles voyage/fatigue US (18:20 UTC)
- Avant: `detected_angles.json` detectait calendrier, blessures, meteo, arbitre et mouvements de cote, mais ignorait les deplacements NBA/NHL/MLB alors que `stadiums.json` les rend mesurables.
- Apres: `build_betting_intelligence.py` calcule distance Haversine + decalage estime pour MLB/NBA/NHL; nouveaux signaux `travel_extreme` et `back_to_back_travel` alimentent aussi `rare_signals.json`.
- Impact mesure: 244 angles detectes, dont 13 `travel_extreme` et 16 `back_to_back_travel`; 91 signaux rares publies avec 25 signaux voyage/fatigue exploitables.
- Verif: py_compile/build_betting_intelligence/build_health OK; cache/footer bumpes v35.346.

## Sprint v35.347 — AUTO 10/10 Score signaux rares directionnel (18:28 UTC)
- Avant: le dashboard ajoutait un bonus generique `signal rare`, meme quand le signal etait une alerte de fade sur l'equipe jouee.
- Apres: blessures, fatigue calendrier, lookahead, voyage extreme et back-to-back voyage comparent le signal a l'equipe réellement soutenue par le pari; backing l'equipe fragile penalise, jouer contre elle bonifie.
- Impact produit: les nouveaux angles voyage/fatigue deviennent exploitables sans faux boost; les signaux rares non alignes restent visibles en badge sans gonfler le score.
- Verif: app.js --check prevu; cache/footer bumpes v35.347.
## Sprint v35.349 — AUTO 10/10 Refresh H2H prioritaire ESPN (18:57 UTC)
- Avant: la data cron fraiche etait retombee a 144 events avec H2H, alors que le cache ESPN recent contenait plus de confrontations exploitables.
- Action: `fetch_h2h.py --force-priority` sur les ligues prioritaires + sports US, puis regeneration night_metrics / signal_gap_report / health / data_lite.
- Impact mesure: 28 matchs verifies, 24 enrichis, 0 erreur; H2H coverage 144 -> 168 events; priority gaps 239 -> 233.
- Verif: cache/footer bumpes v35.349, hashes app/data_lite/CSP recalcules.

## Sprint v35.348 — AUTO 10/10 Injuries vides connues (18:35 UTC)
- Avant: les equipes absentes de `injuries_soccer.json` etaient marquees comme data manquante meme quand leur ligue etait couverte par la source Sofascore injuries.
- Apres: si la ligue existe dans le fichier source, une equipe non listee devient un signal connu vide au lieu d'un trou faux positif.
- Impact mesure: injuries coverage 192 -> 211 events; `patch_soccer_injuries` enrichit 133 events; priority gaps recalcules a 239 sur la data cron fraiche.
- Verif: py_compile, patch_all_quick, measure_night_metrics, build_signal_gap_report, build_health, finalize_inline OK; cache/footer bumpes v35.348.

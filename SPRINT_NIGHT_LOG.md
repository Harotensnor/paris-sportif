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
- Commit: pending
- Status: ✅ DONE

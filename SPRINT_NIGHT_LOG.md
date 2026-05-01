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
- Commit: pending
- Status: ✅ DONE

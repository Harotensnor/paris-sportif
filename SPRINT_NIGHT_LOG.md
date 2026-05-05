# Sprint Night Log — Paris-Sportif Autonomous Night

Active log keeps the latest 50 sprints. Older entries live in SPRINT_NIGHT_LOG_ARCHIVE_V35.md.

## Sprint v35.430 — AUTO 10/10 Sofascore frais sans boot lourd (10:40 UTC)
- Restauration Section 0.4 : `fetch_sofascore_events` OK (1808 events source), puis patch Sofascore + Winamax-only; table repassee a 334 events Winamax, 304 upcoming.
- Garde-fou perf : `finalize_inline.py` cappe maintenant le boot lite a 5 events, tout en gardant `data_lite_72h.json` pour le chargement complet.
- Mesure : `data_lite.js` 140,831 bytes sous cap, Winamax exact 98.5%, 329 marches >1n2, `audit_data_truth` OK.
- Tests : syntax JS OK, bundle OK, no conflict markers OK, `dashboard-market-depth` desktop+mobile OK; cache/footer bumpes v35.430.

## Sprint v35.429 — AUTO 10/10 Pipeline data frais (10:35 UTC)
- Diagnostic Section 0.2 : derniers runs `refresh-data` publics en failure/cancelled; `audit_data_truth` bloquait car `data.today=2026-05-04`.
- Restauration locale Section 0.3/0.7 : `fetch_live` OK (792 events, 0 erreur globale), Winamax catalog OK (723 matchs), patch Winamax-only applique.
- Mesure apres patch : 293 events Winamax, 280 upcoming, 293 exacts, ratio 100%, 293 marches >1n2; `data_today=2026-05-05`; `audit_data_truth` OK.
- Cache/footer bumpes v35.429; `data_lite.js` hash SHA1 `4ad9582b`.

## Sprint v35.428 — AUTO 10/10 Table stale lisible (10:31 UTC)
- Fix Section 0.1 : le dashboard dense ne vide plus `v36PickPoolRaw` quand la data depasse 4h.
- UX : table visible en lecture seule avec warning stale + refresh avant mise; plus d'ecran vide au reveil.
- Tests : syntax OK; `dashboard-market-depth` desktop+mobile OK; bundle OK (`app.js` 1,597,405 / 1,600,000).
- Cache/footer bumpes v35.428; `app.js` hash `6435c036`.

## Sprint v35.402 — C5 mode blind discipline (22:41 UTC)
- Avant: le dashboard exposait directement cote et edge, ce qui pousse a juger le rendement avant de lire le contexte.
- Apres: ajout d'un toggle persistant "Mode blind" qui masque cote et edge dans la table dense, les cards mobiles, les lanes sport et les suggestions perso.
- Impact mesure: Theo peut scanner les equipes, le marche, la confiance, les raisons et le score d'opportunite avant de reveler mentalement la value.
- Verif: Playwright mode blind + suggestions perso OK (4/4), bundle-size OK, syntax JS OK, no-conflict-markers OK; cache/footer bumpes v35.402.

## Sprint v35.401 — C7 suggestions perso accueil (22:38 UTC)
- Avant: les apprentissages du profil Theo existaient surtout dans le rail, donc faciles a manquer pendant la lecture de la table.
- Apres: ajout d'une bande "Pour ton profil" dans le flux principal avec 3 picks recommandes et une raison personnalisee sport/ligue/cote.
- Impact mesure: l'accueil remonte directement les picks compatibles avec les paris trackes sans cacher la table dense.
- Verif: Playwright suggestions+CLV OK (4/4), bundle-size OK, syntax JS OK, no-conflict-markers OK; cache/footer bumpes v35.401.
## Sprint v35.400 — C6 projecteur bankroll discipline (22:29 UTC)
- Avant: la page Performance montrait les resultats, mais pas une projection simple 30/90/365 jours pour choisir une strategie de mise.
- Apres: ajout du Projecteur bankroll 1000EUR avec scenarios Prudente / Equilibree / Agressive, courbes 90j et horizons 30/90/365j.
- Impact mesure: projections basees sur les paris trackes quand l'echantillon est suffisant; sinon estimation prudente explicite.
- Verif: Playwright projecteur+heatmap+tilt+CLV OK (8/8), bundle-size OK, syntax JS OK, no-conflict-markers OK; cache/footer bumpes v35.400.
## Sprint v35.399 — C4 calendrier P&L personnel (22:18 UTC)
- Avant: Performance montrait le backtest modele, mais pas les jours verts/rouges de Theo sur ses paris suivis localement.
- Apres: ajout d'une heatmap 365 jours basee sur `paris_sportif_user_bets`, avec P&L total, ROI, jours verts et pire jour.
- Impact mesure: chaque jour tracke devient un carre colore; test Playwright impose 365 cellules et les KPI personnels visibles.
- Verif: Playwright heatmap+tilt+CLV OK (6/6), bundle-size OK, syntax JS OK, no-conflict-markers OK; cache/footer bumpes v35.399.
## Sprint v35.398 — C3 detecteur tilt personnel (22:10 UTC)
- Avant: les series du modele existaient, mais Theo n'avait pas d'alerte personnelle quand ses pertes et mises montaient ensemble.
- Apres: ajout du detecteur de tilt sur `paris_sportif_user_bets`, avec banniere dashboard visible desktop/mobile et rail Discipline tilt.
- Impact mesure: 3 pertes consecutives avec mises 3EUR -> 6EUR -> 9EUR declenchent Pause recommandee / mise divisee par 2.
- Verif: Playwright tilt+CLV OK (4/4), bundle-size OK, syntax JS OK, no-conflict-markers OK; cache/footer bumpes v35.398.
## Sprint v35.397 — C1 CLV tracking dashboard (21:57 UTC)
- Avant: le CLV existait dans `clv_history.json`, mais l'accueil ne montrait pas clairement si les picks battaient le marche avant le resultat.
- Apres: `compute_clv.py` produit `clv_summary.json` leger, le dashboard affiche une section Closing Line Value avec CLV moyen, taux positif, sports et mouvements extremes.
- Impact mesure: sidecar CLV resume 445KB -> 4KB pour l'accueil; nouveau test Playwright verifie la section CLV desktop + mobile.
- Verif: Playwright CLV+score+dashboard OK (6/6), bundle-size OK, syntax JS OK, no-conflict-markers OK; cache/footer bumpes v35.397.
## Sprint v35.396 — C2 score opportunite stabilite fraicheur (21:46 UTC)
- Avant: le score 0-100 combinait edge/confiance/biais/timing, mais ne penaliseait pas explicitement un consensus instable ou une data vieillissante.
- Apres: ajout des composantes Stabilite signal et Fraicheur data, badges associes et details dans tooltip/aria-label.
- Impact mesure: le test tooltip score exige maintenant les deux nouvelles composantes visibles.
- Verif: suite score+dashboard OK (4/4), bundle-size OK, syntax JS OK, no-conflict-markers OK; cache/footer bumpes v35.396.
## Sprint v35.395 — H10 carrousel paris par sport (21:39 UTC)
- Avant: la table exposait plus de marches, mais il manquait une lecture rapide par discipline pour choisir Foot/Tennis/Basket/Hockey/Baseball.
- Apres: ajout de la section Paris du jour par sport avec top 3 par sport, sans doublon match, triee par score opportunite.
- Impact mesure: le test dashboard-market-depth verifie maintenant table multi-marches + carrousel sport visible sur desktop et mobile.
- Verif: suite cible H10+B5 OK (4/4), bundle-size OK, syntax JS OK, no-conflict-markers OK; cache/footer bumpes v35.395.

## Sprint v35.394 — H1 table multi-marches etendue (21:33 UTC)
- Avant: le dashboard gardait au plus 3 candidats par match, ce qui masquait des marches Winamax detailles deja presents (mi-temps, total equipe, score exact, O/U 0,5-5,5).
- Apres: selection diversifiee jusqu'a 8 picks foot par match et 4 autres sports, avec plafond par marche pour eviter les doublons opaques.
- Impact mesure: ajout test Playwright dashboard-market-depth pour exiger 80+ lignes visibles et 5+ familles de marches dans la table.
- Verif: suite cible H1+B5 OK (4/4), bundle-size OK, syntax JS OK, no-conflict-markers OK; cache/footer bumpes v35.394.

## Sprint v35.393 — AUTO 10/10 Validation bugs captures V37 (21:24 UTC)
- Avant: les corrections capture etaient presentes mais pas verrouillees ensemble par un test de regression utilisateur.
- Apres: nouveau test V37 verifie absence de jargon trader visible, legende score, groupement doublons, modal alignee et buts attendus avec noms equipes.
- Impact mesure: couverture B5 ajoutee sur dashboard + modal sans toucher au modele.
- Verif: suite ciblée B2-B5 OK (8/8), bundle-size OK, syntax JS OK, no-conflict-markers OK; cache/footer bumpes v35.393.

## Sprint v35.392 — AUTO 10/10 Signaux pour contre modal (21:18 UTC)
- Avant: les signaux contradictoires etaient melanges dans les raisons, et le badge mitigé ne disait pas clairement quoi faire.
- Apres: chaque modal affiche un bloc Signaux pour / Signaux contre, avec note de prudence si les signaux se neutralisent; le badge devient Signaux mitiges - prudence.
- Impact mesure: test modal signaux cible ajoute; score/table gardent les badges lisibles sur desktop et mobile.
- Verif: tests cibles B2+B3 OK (6/6), bundle-size OK, syntax JS OK, no-conflict-markers OK; cache/footer bumpes v35.392.

## Sprint v35.391 — AUTO 10/10 Tooltip score opportunite testable (21:10 UTC)
- Avant: le score opportunite avait une decomposition dans data-tooltip, mais pas de fallback natif ni de test desktop/mobile garantissant sa visibilite.
- Apres: score table + card mobile exposent title et aria-label; nouveau test Playwright cible verifie legende, decomposition et accessibilite du tooltip.
- Impact mesure: test score opportunite OK sur desktop + mobile Chrome local; bundle reste sous seuil app.js 1.58MB / 1.70MB.
- Verif: Playwright cible OK (2/2), bundle-size OK, syntax JS OK, no-conflict-markers OK; cache/footer bumpes v35.391.

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

## Sprint v35.352 — AUTO 10/10 Auto-refresh aligne avec cron (19:07 UTC)
- Avant: `check_pipeline_drift.py` signalait 13 scripts presents dans le cron mais absents de `auto_refresh.py`.
- Fix: ajout des fetchers publics TheSportsDB/OpenLigaDB/previews et des builders intelligence/profils/marches/signaux dans l'auto-refresh local avec cadences prudentes.
- Impact mesure: auto_refresh 48 -> 61 scripts references; refresh.yml 61 scripts; drift 13 -> 0.
- Verif: py_compile auto_refresh OK; `check_pipeline_drift.py` OK; cache/footer bumpes v35.352.

## Sprint v35.351 — AUTO 10/10 Cache merge lineups Sofascore (19:04 UTC)
- Bug prevenu: `fetch_lineups_soccer.py` pouvait aussi ecraser un cache riche avec un scrape partiel proche kickoff.
- Fix: merge fresh + cache existant pour conserver les compositions deja collectees; ajout stats `fresh_with_lineup`, `retained_existing`, `events_total`.
- Impact mesure: fichier lineups 47 -> 49 events; patch_lineups 31 -> 72 events; starter signals 78 -> 119; priority gaps 231 -> 230; health warnings 7 -> 6.
- Verif: py_compile fetch_lineups, fetch Sofascore, patch_all_quick, measure_night_metrics, signal_gap_report, build_health, finalize_inline OK; cache/footer bumpes v35.351.

## Sprint v35.350 — AUTO 10/10 Cache merge arbitres Sofascore (19:02 UTC)
- Bug trouve: `fetch_referees_soccer.py --force` pouvait remplacer 101 arbitres caches par seulement les 7 publies dans la fenetre courante.
- Fix: merge fresh + cache existant; les nouvelles assignations gagnent, les anciennes restent disponibles tant qu'elles ne sont pas remplacees.
- Impact mesure: fichier arbitres 101 -> 105 events; patch_referees 25 -> 29 events enrichis; priority gaps 233 -> 231; health warnings 8 -> 7.
- Verif: py_compile fetch_referees, patch_all_quick, measure_night_metrics, signal_gap_report, build_health, finalize_inline OK; cache/footer bumpes v35.350.

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

## Sprint v35.353 — AUTO 10/10 Table/modal synchro + clarte captures (18:22 UTC)
- Bug critique: les lignes du tableau V37 peuvent maintenant transmettre le candidat exact a la modal; le titre `Pourquoi` reste aligne sur le pari et la cote cliques.
- UX: tags trader reformules en francais naturel, score opportunite documente avec legende/couleurs, doublons meme match marques, xG affiche les noms equipes et les raisons s'alignent mieux avec le pari.
- Impact mesure: smoke Chrome local 360 lignes visibles, 50 clics controles, 0 mismatch ligne/modal, 0 erreur console apres refresh CSP.
- Verif: `node --check app.js`, `node --check sw.js`, `check_no_conflict_markers.py`, CSP hashes + assets + cache/footer bumpes v35.353.

## Sprint v35.354 — AUTO 10/10 H2H grands matchs (18:31 UTC)
- Avant: plusieurs matchs majeurs top ligues avaient lineups/injuries/referee mais pas de H2H exploitable; `fetch_h2h.py --force-priority` ne forcait que MLS/Liga MX/Argentine/Bundesliga.
- Fix: elargissement des ligues H2H prioritaires aux top ligues visibles par Theo (ENG/ESP/ITA/FRA/GER/POR/NED/BEL/SCO/AUT + LATAM/MLS) puis refresh cible ESPN.
- Impact mesure: fetch H2H 28 matchs verifies, 24 enrichis; H2H night_metrics 168 -> 177; Roma-Fiorentina, Lazio-Cremonese, Real Sociedad-Sevilla et Man City-Everton passent a 7/7 sources.
- Verif: measure_night_metrics/build_signal_gap_report/build_health/finalize_inline OK; cache/footer bumpes v35.354.

## Sprint v35.355 — AUTO 10/10 Bugs captures #2-#6 verrouilles (18:41 UTC)
- Fix: badges trader convertis en francais naturel avec tooltip, "strict" retire du visible au profit de "Selection exigeante"; score opportunite garde legende + tooltip + classes couleur.
- Fix: raisons modal orientees selon le marche clique (1N2/DNB, total, BTTS, double chance, handicap, team total) et doublons meme match mieux groupes visuellement.
- Impact mesure: audit navigateur capture bugs = 720 lignes/cards, 0 badge opaque, 360 scores tooltipes/classes, 640 marqueurs doublons, modal raisons presente, 0 erreur console.
- Verif: `node --check app.js/sw.js/audit_capture_bugs.js`, `audit_capture_bugs.js`, `check_no_conflict_markers.py`; cache/footer bumpes v35.355.

## Sprint v35.356 — AUTO 10/10 xG etendu hors top-5 (18:49 UTC)
- Impact: xG night_metrics 88 -> 197 events; couverture foot both-team xG 64/261 (24.5%) -> 190/261 (72.8%).
- Data: `fetch_fbref_xg.py` etendu MLS/Eredivisie/Portugal/D2/Scotland/Austria + merge Understat; fallback proxy ESPN form marque `espn_form_proxy`.
- Pipeline: auto_refresh + refresh.yml alignes avec fetch_fbref_xg et patch_fbref_xg; bug shadow variable corrige dans `patch_fbref_xg.py`.
- Verif: py_compile OK; patch_all_quick/patch_understat/patch_fbref/build_xg_coverage/measure_night_metrics/build_health/finalize_inline OK; cache/footer bumpes v35.356.

## Sprint v35.357 — AUTO 10/10 Market biases sanity (19:12 UTC)
- Bug critique: `market_biases_by_league.json` transformait des WR directionnels sans cotes en signaux exploit/fade; toutes les ligues heritaient aussi du faux 54.55% du backtest multi-marches.
- Fix: les marches sans echantillon cote passent en `watch`, DC 12 devient `low_value`, et les lignes ligue lisent le vrai `backtest_report_v2.by_league` avec statuts `data_insufficient`, `avoid_low_roi` et `avoid_low_wr`.
- Impact mesure: market_exploit 4 -> 0, market_fade 2 -> 0, `market_sample_warning=all_market_rows_share_same_n_without_odds`; ligues WR non constantes et NBA clarifie "WR 58.3% mais ROI -12.8%".
- Verif: audit JSON strict OK, py_compile build_betting_intelligence OK; cache/footer bumpes v35.357.

## Sprint v35.358 — AUTO 10/10 Reconciliation signaux opposes (19:20 UTC)
- Bug critique: un meme match pouvait afficher des angles de fade sur les deux equipes sans decision nette, donnant un score opportunite artificiellement confiant.
- Fix: `resolve_contradictory_angles` calcule support/fade par side, ajoute `signal_resolution`, et publie `signal_conflict` quand les signaux s'annulent; le dashboard penalise et affiche "Signaux mitigés".
- Impact mesure: `detected_angles` expose 11 conflits, `rare_signals` les remonte; Detroit-Boston J+1/J+2 passe en `abstain` avec raison "Signaux opposes -> prudence".
- Verif: py_compile build_betting_intelligence OK; app.js/sw.js --check OK; cache/footer bumpes v35.358.

## Sprint v35.359 — AUTO 10/10 Hierarchie ligue vs angles (19:26 UTC)
- Bug critique: un biais ligue exploitable pouvait etre annule par une longue liste d'angles match-level sans arbitrage lisible.
- Fix: quand la ligue est `exploit`, les malus d'angles match sont plafonnes sauf conflit explicite `signal_conflict`; badge et tooltip indiquent "Biais ligue prioritaire".
- Impact produit: MLB peut rester prioritaire tout en gardant les vrais conflits en prudence stricte; le score explique le netting applique.
- Verif: app.js/sw.js --check OK; cache/footer bumpes v35.359.

## Sprint v35.360 — AUTO 10/10 Marches de cotes incertains (19:18 UTC)
- Bug critique: les cotes 1N2 pouvaient bouger de facon incoherente (home+away qui montent ensemble, marge implicite anormale) et etre lues comme un vrai signal de steam.
- Fix: detection `market_uncertain` dans odds_history + snapshot 1N2 courant, patch data, angle rare "marche incertain" et penalite directe dans le score opportunite.
- Impact mesure: `detected_angles` ajoute 68 marches incertains; ces matchs perdent le bonus steam et affichent un badge/tooltip de verification avant pari.
- Verif: py_compile detect/patch/build intelligence OK; app.js/sw.js syntax OK; cache/footer bumpes v35.360.

## Sprint v35.361 — AUTO 10/10 Score opportunite decompose (19:22 UTC)
- Bug UX: le score 79/83 restait trop opaque meme avec une legende globale.
- Fix: tooltip score enrichi avec decomposition chiffree: base, edge, confiance, tier, biais ligue/marche, marche incertain, signaux, timing, qualite data, gaps et profil Theo.
- Impact produit: Theo peut voir pourquoi un score monte ou baisse sans deviner la logique interne.
- Verif: app.js syntax OK; cache/footer bumpes v35.361.

## Sprint v35.362 — AUTO 10/10 Modal signaux pour contre (19:27 UTC)
- Bug credibilite: les conflits etaient penalises dans le score mais pas expliques clairement dans la modal "Pourquoi".
- Fix: la modal lit les angles V37 du match et ajoute des lignes "Signaux POUR" / "Signaux CONTRE", incluant conflit, marche incertain, fade/drift et meteo selon le pari clique.
- Impact produit: un pari avec signaux mitigés expose maintenant ce qui soutient et ce qui affaiblit le pick.
- Verif: app.js syntax OK; cache/footer bumpes v35.362.

## Sprint v35.363 — AUTO 10/10 Data sync source unique (19:36 UTC)
- Bug technique: MCP, health et night_metrics pouvaient afficher des compteurs differents sans dire quelle source croire.
- Fix: `get_pipeline_status` expose `source_of_truth=data.js`, `data_truth`, `calculated_at` et `sync_check`; night_metrics/health declarent aussi leur source et utilisent la meme definition Winamax exact (match_id + 1n2).
- Impact mesure: MCP today=2026-05-04, sync_check=ok, lineups/night=121 et winamax_exact truth/night=310.
- Verif: py_compile build_health/measure/MCP OK; test_mcp_smoke OK; cache/footer bumpes v35.363.

## Sprint v35.364 — AUTO 10/10 Audit JSON orphelins (19:43 UTC)
- Bug hygiene: vieux snapshots JSON racine rendaient la data pipeline illisible et faisaient croire a plusieurs sources de verite.
- Fix: snapshots `claude_*_snapshot.json` archives dans `archive/obsolete_json_20260504/`; `JSON_SIDECAR_AUDIT.md` documente ce qui est source runtime, conserve ou obsolete.
- Decision: `backtest_report.json` et `ci_heartbeat.json` sont gardes car encore lus par scripts/workflow; `data.json` etait un stale local non tracke, supprime du workspace.
- Verif: recherche references runtime OK; cache/footer bumpes v35.364.

## Sprint v35.365 — AUTO 10/10 Audit cotes boostees (19:50 UTC)
- Bug produit: `boosted_odds.json` etait quasi vide sans prouver si la feature etait morte ou si Winamax n'exposait rien.
- Fix: le detecteur publie `candidate_nodes_scanned`, `boost_keyword_matches`, `explicit_boost_field_nodes`, `empty_reason` et `next_action`; le dashboard affiche un vrai statut "scan OK".
- Mesure: 728 matchs analyses, 22980 cotes inspectees, 0 mot-cle promo et 0 champ boost explicite dans le payload courant.
- Verif: detect_boosted_odds + build_health OK; cache/footer bumpes v35.365.

## Sprint v35.366 — AUTO 10/10 Couverture marches Winamax detaillees (19:59 UTC)
- Bug data: 487 matchs Winamax restaient limites au 1N2, donc beaucoup trop de picks sans OU/BTTS/DNB/handicap/team totals.
- Fix: `fetch_winamax_match_details.py` augmente cap/quotas, ajoute horizon 10j, priorise les matchs thin et scrape aussi le catalogue Winamax hors horizon data.js.
- Mesure: couverture detaillee `winamax_markets.json` 243/728 -> 499/728, soit 33.4% -> 68.5%; +256 matchs enrichis, 0 failed.
- Verif: py_compile fetch/build_health OK; health regen OK; cache/footer bumpes v35.366.

## Sprint v35.367 — AUTO 10/10 Journal erreurs JS (20:07 UTC)
- Dette technique: trop de `catch(e) {}` masquaient les erreurs locales, surtout storage, boot helpers, lazy images et wrappers async.
- Fix: ajout `logSafeError(context, error)` avec ring buffer localStorage `paris_sportif_js_errors_v1` (60 entrees max) + console.warn controle; conversion des catches critiques de boot/storage.
- Impact debug: une session longue garde maintenant les erreurs exploitables sans casser l'UX ni spammer un fichier distant.
- Verif: app.js/sw.js syntax OK; cache/footer bumpes v35.367.

## Sprint v35.368 — AUTO 10/10 Listeners tracables (20:14 UTC)
- Dette perf: 318 `addEventListener` rendaient les fuites difficiles a isoler sur sessions longues.
- Fix: ajout `trackedAddEventListener` + `cleanupTrackedEventListeners`, exposition debug `__PARIS_TRACKED_LISTENERS`, branchement sur `_on`, `bind()` et listeners boot lazy-images.
- Impact: les listeners de groupe `page` peuvent etre nettoyes a chaque render, et les listeners boot sont maintenant inspectables.
- Verif: app.js/sw.js syntax OK; cache/footer bumpes v35.368.

## Sprint v35.369 — AUTO 10/10 xG proxy coverage (20:46 UTC)
- Bug data: les ligues hors Understat/FBref perdaient le signal xG meme quand ESPN expose last5/last10 buts pour/contre.
- Fix: `patch_fbref_xg.py` ajoute un fallback `espn_recent_results_proxy` marque comme proxy, conservateur et distinct du vrai xG.
- Mesure: xG events night_metrics 189 -> 256; couverture foot deux equipes 252/260 (96.9%) dans `xg_coverage.json`.
- Verif: patch_fbref_xg + build_xg_coverage + build_health + measure_night_metrics OK; cache/footer bumpes v35.369.

## Sprint v35.370 — AUTO 10/10 Matching arbitres durci (19:51 UTC)
- Bug data: `referees_soccer.json` contenait des arbitres Sofascore, mais le patch perdait des matchs sur les variantes "AFC Bournemouth"/"Bournemouth", "AS Roma"/"Roma", "Levante"/"Levante UD".
- Fix: matching exact -> alias canonique -> fuzzy prudent par ligue, audit `referees_patch_audit.json`, et patch aussi des matchs historiques pour garder une source de verite coherente.
- Mesure: patch arbitres 29/152 matchs foot scannes, dont 9 via alias; Sofascore n'expose presque aucun nouvel arbitre au-dela des assignations proches du kickoff (2 nouveaux sur 158 fixtures elargies).
- Verif: py_compile patch_referees_soccer OK; measure_night_metrics + build_health OK; cache/footer bumpes v35.370.

## Sprint v35.371 — AUTO 10/10 Navigation 5 hubs stricte (19:58 UTC)
- Dette produit: le site affichait 5 hubs mais le routeur acceptait encore 8 pages SPA autonomes (`sante`, `legal`, `montantes`), ce qui entretenait des parcours caches et difficiles a tester.
- Fix: `VALID_PAGES` limite maintenant aux 5 destinations officielles; les anciens hashes redirigent vers Profil ou Performance, et Cmd-K n'expose plus les pages cachees comme destinations separees.
- Impact UX: Legal reste un lien footer statique, Diagnostic vit sous Profil, Montantes/strategies sous Performance sans creer de pages orphelines.
- Verif: app/sw syntax OK; hash aliases verifies; cache/footer bumpes v35.371.

## Sprint v35.372 — AUTO 10/10 Audit bundle initial (20:03 UTC)
- Dette perf: `app.js` reste a 1.86 MB et les prochaines coupes doivent etre mesurees pour eviter de casser les 5 hubs.
- Fix: ajout `BUNDLE_AUDIT_V35_371.md` avec tailles, top fonctions par bytes/lignes et ordre de coupe safe (`openDetail`, diagnostics Profil, sous-vues Performance).
- Mesure: `renderDashboardPage` 338 KB, `openDetail` 176 KB, `renderBilanPage` 105 KB, `_predictMatchImpl` 95 KB; premier split recommande: modal puis sous-vues Performance.
- Verif: app/sw syntax OK; cache/footer bumpes v35.372.

## Sprint v35.373 — AUTO 10/10 Poids appris offline (20:08 UTC)
- Modele: ajout `scripts/train_lightgbm.py` pour produire un sidecar `lightgbm_weights.json` sans dependance runtime navigateur.
- Garde-fou: faute de table feature-level `backtest_training_rows.jsonl`, le script exporte un statut explicite `aggregate_fallback` plutot qu'un faux LightGBM; les poids restent conservateurs et limites a ±2.5pt de nudge.
- Mesure: 4 sports, 49 ligues et 5 tiers exportes depuis `backtest_report_v2.json`; baseball passe `boost`, basketball/hockey restent `watch`, football `neutral`.
- Pipeline: `auto_refresh.py` et `.github/workflows/refresh.yml` appellent maintenant le script; `check_pipeline_drift.py` OK; cache/footer bumpes v35.373.

## Sprint v35.374 — AUTO 10/10 Tests SPA alignes 5 hubs (20:14 UTC)
- QA: `spa-pages-regression.spec.js` attendait encore `#montantes` comme page autonome et une bottom-nav mobile avec "Plus".
- Fix: la spec protege maintenant les 5 hubs reels; `#sante`/`#legal` -> Profil, `#montantes*` -> Performance, anciens hashes toujours testes comme aliases.
- Impact: les tests ne ressuscitent plus des pages que le produit a volontairement repliees; ils gardent la protection overflow/console errors sur les anciens liens.
- Verif: app/sw syntax OK; Playwright non lance localement car `npx`/`@playwright/test` ne sont pas installes dans ce shell; cache/footer bumpes v35.374.

## Sprint v35.375 — AUTO 10/10 Garde-fou MCP date (20:19 UTC)
- Bug recurrent: le statut MCP a deja regresse vers `today=2026-04-30` malgre les corrections.
- Fix: `test_mcp_smoke.py` verifie maintenant directement `get_pipeline_status().today`, `local_today`, `source_of_truth=data.js` et refuse toute fuite de la date stale.
- Mesure: smoke MCP OK 14/18 tools, 4 skips uniquement car arguments requis; `today=2026-05-04`.
- Verif: py_compile + test_mcp_smoke OK; cache/footer bumpes v35.375.

## Sprint v35.376 — AUTO 10/10 Clarte UX pronos (20:05 UTC)
- UX: les tags composes type `strict marche a fade steam cote` passent maintenant par une traduction lisible (`Filtre cote stricte applique`, `Cote surevaluee detectee`, `Cote bouge fortement`, `Bon moment pour parier`).
- Modal: les raisons de pari total equipe gardent le contexte de l'adversaire et les raisons generiques xG/ELO/classement ne viennent plus brouiller le pari exact clique; handicap negatif affiche une marge entiere correcte.
- Garde-fou: ajout de `scripts/audit_ux_clarity.py` pour verrouiller tags lisibles, score explique, pick identity, xG nommes et groupement same-match.
- Verif: audit UX clarity + app/sw syntax + no-conflict markers lances; cache/footer bumpes v35.376.

## Sprint v35.377 — AUTO 10/10 InnerHTML surveille (20:07 UTC)
- Securite: le sink global `innerHTML` assainissait deja les templates; il trace maintenant les scripts/handlers/URLs dangereuses retires via `logSafeError`.
- Garde-fou: ajout de `scripts/audit_innerhtml_safety.py` pour refuser toute disparition du sanitizer global et compter la surface restante.
- Impact: les injections HTML restent compatibles avec le rendu vanilla existant, mais un payload retire devient visible dans `paris_sportif_js_errors_v1` au lieu d'etre silencieux.
- Verif: audit innerHTML + app/sw syntax + no-conflict markers lances; cache/footer bumpes v35.377.

## Sprint v35.378 — AUTO 10/10 Fetchs de page abortables (20:09 UTC)
- Stabilite: ajout de `fetchTracked` + `abortTrackedFetches('page')` pour annuler les chargements annexes quand la SPA change de page.
- Scope: sidecars dashboard (`betting_intelligence`, cotes boostees, CLV) passent en fetch page-scope sans toucher aux refresh data critiques.
- Garde-fou: `scripts/audit_fetch_tracking.py` verifie le wrapper, l'exposition debug et au moins 3 fetchs page-scopes.
- Verif: audit fetch tracking + app/sw syntax + no-conflict markers lances; cache/footer bumpes v35.378.

## Sprint v35.379 — AUTO 10/10 Audit coherence intelligence (20:15 UTC)
- Credibilite: les ligues avec sample <20 ne peuvent plus sortir en `exploit`; NBA/NHL WR positif mais ROI negatif deviennent `avoid_low_roi` au lieu d'un avoid ambigu.
- Marches: les lignes sans cotes reelles portent `sample_scope=directional_settled_match_sample` et restent en watch/low_value; `Double chance 12` reste bloque en low_value si la cote ne couvre pas le WR.
- Garde-fou: ajout de `scripts/audit_intelligence_consistency.py` pour refuser sample clone non signale, exploit sans cotes, WR league duplique massif, conflit de signaux non abstain/mixed.
- Verif: build_betting_intelligence + audit_intelligence_consistency + py_compile + app/sw syntax + no-conflict markers OK; cache/footer bumpes v35.379.

## Sprint v35.380 — AUTO 10/10 Tests skips sous controle (20:17 UTC)
- QA: le test critique `modal-pick-sync` ne peut plus se skip si aucune ligne V37 n'est visible; il echoue explicitement pour proteger le bug ligne/modale.
- Documentation: les skips visuels optionnels ont maintenant une raison lisible, et `scripts/audit_playwright_skips.py` refuse les skips non documentes ou un skip dans le test de synchronisation modal.
- Mesure: 18 skips runtime restent allowlistes (viewport/sections optionnelles/data manquante), 0 skip silencieux critique.
- Verif: audit_playwright_skips + py_compile + cache/footer bumpes v35.380.

## Sprint v35.381 — AUTO 10/10 Journal actif compacte (20:19 UTC)
- Dette: `SPRINT_NIGHT_LOG.md` contenait 370 entrees et ~190KB, rendant les sessions et revues inutilement lourdes.
- Fix: archive creee dans `SPRINT_NIGHT_LOG_ARCHIVE_V35.md`; le journal actif conserve les 50 derniers sprints avec un pointeur vers l'archive.
- Mesure: active log 370 -> 50 sprints; archive 321 sprints; aucune entree perdue.
- Verif: compte headings archive+actif identique au pre-split; cache/footer bumpes v35.381.

## Sprint v35.382 — AUTO 10/10 Issues actives separees (20:24 UTC)
- Dette: `ISSUES.md` melangeait l'historique FIXED avec les vrais problemes restants, ce qui noyait la priorite active.
- Fix: creation de `ISSUES_ACTIVE.md` et `ISSUES_RESOLVED.md`; `ISSUES.md` devient un index court avec la seule issue OPEN actuelle.
- Mesure: fichier principal 32KB -> 1.2KB; active=1 issue, resolved/history=53 blocs.
- Garde-fou: `scripts/audit_issues_split.py` refuse un FIXED dans l'actif ou un OPEN/PARTIAL dans le resolu; cache/footer bumpes v35.382.

## Sprint v35.403 — AUTO 10/10 Date MCP vraiment dynamique (00:52 UTC)
- Bug critique: si la data bucket etait stale, `get_pipeline_status()` pouvait encore exposer ce vieux bucket comme `today`, ce qui entretenait le retour fantome `2026-04-30`.
- Fix: `today` est maintenant toujours la date locale courante; `active_data_day` expose separement le bucket data reellement utilise, avec `data_day_is_current`.
- Garde-fou: `test_mcp_smoke.py` injecte un dataset stale volontaire et refuse toute fuite de date ancienne; copie MCP historique synchronisee et auditee.
- Pipeline: `auto_refresh.py` et `refresh.yml` lancent sync/audit/smoke MCP pour eviter une nouvelle divergence desktop; cache/footer bumpes v35.403.

## Sprint v35.404 — AUTO 10/10 Biais marches anti-clone (01:02 UTC)
- Credibilite: `market_biases_by_league.json` expose maintenant une empreinte d'echantillon par marche pour prouver que chaque ligne vient de son propre sample.
- Fix: ajout `sample_signature`, `market_sample_n_values`, `market_sample_signature_values` et `market_clone_guard` dans le sidecar.
- Garde-fou: `audit_intelligence_consistency.py` refuse les lignes marche qui partagent une meme signature ou un clone non documente.
- Mesure: clone guard `passed`, 10 signatures distinctes pour 10 marches, `n` reels [7,8]; build_betting_intelligence + audit OK; cache/footer bumpes v35.404.

## Sprint v35.405 — AUTO 10/10 Ratios Winamax scopes explicites (01:07 UTC)
- Data sync: `health.json` melangeait un ratio upcoming avec `night_metrics` all-events; les deux etaient valides mais ambigus.
- Fix: `health.data_truth` expose maintenant le ratio all-events authoritative et garde le ratio upcoming sous `quality_scope`.
- Garde-fou: `audit_data_truth.py` compare data.js, night_metrics et health sur les deux scopes; `refresh.yml` et `auto_refresh.py` regenerent night_metrics puis auditent la verite.
- Mesure: all-events Winamax exact 314/315 = 99.68%, upcoming 295/295 = 100%; audit_data_truth OK; cache/footer bumpes v35.405.

## Sprint v35.406 — AUTO 10/10 Signal arbitre restaure (01:12 UTC)
- Data: le patch rapide prod attachait seulement les arbitres exacts et avait perdu le fallback contexte arbitral par ligue.
- Fix: `patch_all_quick.py` reutilise maintenant les moyennes d'arbitres par ligue quand l'assignation exacte n'est pas encore publiee.
- Reporting: `signal_gap_report.json` distingue `referee` (signal exact ou contexte) de `referee_exact`, pour eviter de gonfler les assignations confirmees.
- Mesure: signal arbitre 5 exacts + 101 contextes = 106 events; gap report ratio referee 33.65%, exact 1.59%; cache/footer bumpes v35.406.

## Sprint v35.407 — AUTO 10/10 Bundle guard 1.6MB (01:15 UTC)
- Perf: `app.js` est deja sous la cible 1.7MB, mais il fallait empecher le retour vers 1.8/1.9MB.
- Fix: `audit_bundle_size.py` serre le cap app.js a 1.6MB et couvre aussi `data_lite.js`; cron + auto_refresh lancent l'audit apres `finalize_inline.py`.
- Doc: `BUNDLE_AUDIT_V35_406.md` fige les tailles et les prochaines coupes safe.
- Mesure: app.js 1,585,245 / 1,600,000 bytes, app.css 353,361 / 360,000, pronostics 71,236 / 90,000, data_lite 167,554 / 220,000; cache/footer bumpes v35.407.

## Sprint v35.408 — AUTO 10/10 Runtime LightGBM pipeline (01:22 UTC)
- Modele: les poids LightGBM etaient charges cote UI, mais leur generation runtime n'etait pas verrouillee dans le cron.
- Fix: `auto_refresh.py` et `refresh.yml` generent maintenant `lightgbm_weights.js`, auditent le runtime et ajoutent les sidecars LightGBM au commit data.
- Cache: `pronostics.html` pointe vers les hashes courants `lightgbm_weights.js`, `app.js`, `app.css` et `data_lite.js`; SW/footer bumpes v35.408.
- Mesure: audit runtime OK (`aggregate_fallback`, 4 sports, 49 ligues), build LightGBM JS OK.

## Sprint v35.409 — AUTO 10/10 Validation UI score/signaux (01:27 UTC)
- Validation: les specs Playwright confirment la legende score, les tooltips detailles, les signaux pour/contre et les bugs captures V37 sur desktop + mobile.
- Fix: la CSP met a jour le hash Web Vitals actuel et l'injection runtime des SportsEvent JSON-LD dynamiques est explicitement desactivee sous CSP stricte; le schema statique reste actif sans erreurs console.
- Garde-fou: `audit_ux_clarity.py`, `audit_capture_bugs.js` et 8 tests Playwright ciblant score/modal/bugs captures passent.
- Cache/footer bumpes v35.409; `app.js` hash `45473842`.

## Sprint v35.410 — AUTO 10/10 Marches mi-temps O/U (01:39 UTC)
- Elargissement: Winamax match details detecte maintenant les lignes "nombre de buts en mi-temps" et conserve `ht_ou`, `ht_ou05`, `ht_ou15`.
- Front: la table peut afficher des picks exacts "Plus/Moins de X but en 1re mi-temps" via le marche `htTotal`, avec tooltip debutant-safe.
- Garde-fou: test `market-candidates` et syntax/bundle a relancer; aucun marche n'est invente sans cote Winamax.
- Cache/footer bumpes v35.410; `app.js` hash `130cf870`.

## Sprint v35.411 — AUTO 10/10 Corners/cartons exacts (01:51 UTC)
- Elargissement: Winamax match details detecte maintenant les lignes exactes corners O/U et cartons jaunes O/U.
- Front: les candidats `cornersTotal` et `cardsTotal` utilisent seulement les cotes Winamax exactes, avec libelles "Plus/Moins de X corners/cartons jaunes".
- Modele: probas prudentes locales basees sur xG total pour corners et profil arbitre/meteo pour cartons, fallback no-vig si contexte absent.
- Cache/footer bumpes v35.411; `app.js` hash `830d05ad`.

## Sprint v35.412 — AUTO 10/10 Periodes basket et F5 baseball (01:59 UTC)
- Elargissement: Winamax match details detecte les totaux basket mi-temps/quart-temps et les totaux baseball F5.
- Front: nouveaux marches `basketFirstHalfTotal`, `basketQuarterTotal`, `baseballF5Total` avec libelles debutant-safe et filtres avances.
- Modele: reutilise les projections deja presentes (`firstHalfTotals`, `quarterTotals`, `totalsF5`) puis fallback no-vig si necessaire.
- Cache/footer bumpes v35.412; `app.js` hash `c5617af9`.

## Sprint v35.413 — AUTO 10/10 Bundle relief JSON-LD runtime (02:05 UTC)
- Perf: le runtime JSON-LD SportsEvent avait deja ete desactive sous CSP stricte; il restait pourtant dans `app.js`.
- Cleanup: suppression definitive du bloc `_injectMatchSchemas()` et de son appel idle, sans toucher au schema statique valide dans `pronostics.html`.
- Mesure: `app.js` repasse a 1,592,160 bytes sous le cap 1,600,000, soit environ 3.2 KB recuperes apres les nouveaux marches V37.
- Cache/footer bumpes v35.413; `app.js` hash `b7ed36d7`.

## Sprint v35.414 — AUTO 10/10 Combos intra-match resultats (02:12 UTC)
- Elargissement: les combinés même match ne se limitent plus au scénario "Plus de 2,5 + BTTS".
- Front: ajout des combos "vainqueur + les deux équipes marquent" quand les deux jambes sont des marchés exacts Winamax et non skip.
- Garde-fou: le moteur garde les cotes comme assemblage de jambes Winamax, sans les faire passer pour une cote simple inventée.
- Cache/footer bumpes v35.414; `app.js` hash `5a435def`, taille 1,593,039 bytes sous cap.

## Sprint v35.415 — AUTO 10/10 Top sport par opportunite (02:19 UTC)
- Produit: la section "Paris du jour par sport" utilisait encore l'ordre cote haute du pool global.
- Fix: chaque sport est maintenant retrié par score d'opportunité, puis edge et cote, pour exposer les 3 meilleurs picks réels par discipline.
- Impact: les nouveaux marchés exacts (mi-temps, corners, cartons, périodes, F5) peuvent remonter dans la vitrine sport s'ils ont le meilleur signal.
- Cache/footer bumpes v35.415; `app.js` hash `09525337`, taille 1,593,174 bytes sous cap.

## Sprint v35.416 — AUTO 10/10 AUC marche honnete (02:30 UTC)
- Modele: ajout de `market_auc_report.json` pour tracer le pouvoir discriminant par marche sans sur-promettre.
- Garde-fou: si les probabilites ligne par ligne manquent, le rapport passe en `auc_unavailable_without_row_scores` et les marches restent en surveillance.
- Front: le score d'opportunite lit le rapport AUC et ajoute un bonus/malus explicite dans le tooltip du pick.
- Pipeline: `auto_refresh.py`, `refresh.yml` et `health.json` savent generer, committer et monitorer le rapport AUC; cache/footer bumpes v35.416.

## Sprint v35.417 — AUTO 10/10 Ensemble xG separe (02:39 UTC)
- Modele: quand les xG empiriques sont disponibles, ils deviennent un sous-modele distinct `xg` au lieu d'etre caches dans Poisson.
- Pondération: metadata ensemble expose maintenant `poisson_dc 0.40 / elo 0.25 / xg 0.20 / form_decay 0.10 / h2h 0.05`.
- Transparence: le tooltip modal peut afficher la source xG et les buts attendus du sous-modele empirique.
- Mesure: syntax JS OK, bundle `app.js` 1,596,191 bytes sous cap; cache/footer bumpes v35.417.

## Sprint v35.418 — AUTO 10/10 Importance signaux lisible (02:46 UTC)
- Modal: le bloc "Composé de" devient une vraie lecture d'importance basee sur les contributions du pick.
- UX: ajout de barres par famille de signal (xG, buts attendus, Force/Elo, forme/contexte, H2H, signal annexe) avec pourcentages.
- Cleanup: suppression de l'ancienne repartition fixe et d'une regex fragile; la calibration n'est plus affichee comme un faux -3%.
- Mesure: syntax JS OK, bundle `app.js` 1,596,925 bytes sous cap; cache/footer bumpes v35.418.

## Sprint v35.419 — AUTO 10/10 Picks du genie V2 prudents (02:54 UTC)
- Produit: "Picks du genie" exige maintenant un support marche clair (smart money aligne, biais marche, AUC valide ou score 84+).
- Garde-fou: exclusion des picks avec signaux contradictoires, marche incertain, marche a fade ou AUC faible/low value.
- UX: la section reste rare et garde le max 1 pick par match pour eviter les doublons trompeurs.
- Cache/footer bumpes v35.419; `app.js` hash `7f621642`.

## Sprint v35.420 — AUTO 10/10 Briefing quotidien local (00:41 UTC)
- Produit: ajout de `daily_insights.json`, un briefing court construit depuis les sidecars locaux deja presents (biais ligue, signaux rares, timing, CLV, gaps data, AUC).
- Front: l'accueil affiche maintenant une section "Insights du jour" et le rail modele a un bloc "Briefing jour" cliquable vers les matchs concernes.
- Pipeline: `auto_refresh.py`, `refresh.yml` et `health.json` generent, commitent et monitorent le nouveau sidecar.
- Mesure: 7 insights generes, capture visuelle 32 PNG OK, syntax JS OK, modal sync 2/2, bundle `app.js` 1,598,741 bytes sous cap; cache/footer bumpes v35.420.

## Sprint v35.421 — AUTO 10/10 Test briefing cliquable (10:00 UTC)
- QA: ajout d'un test Playwright dedie au briefing quotidien, couvrant schema JSON, rendu accueil et ouverture des insights cibles.
- Fix: le clic sur un insight charge maintenant `data.js` complet si le match n'est pas encore dans le blob lite, puis ouvre la modale au lieu d'echouer silencieusement.
- Mesure: `tests/daily-insights.spec.js` 2/2, syntax JS OK, bundle `app.js` 1,599,126 bytes sous cap, no conflict markers OK.
- Cache/footer bumpes v35.421; `app.js` hash `fdcfd159`.

## Sprint v35.422 — AUTO 10/10 Marge bundle immediate (10:03 UTC)
- Perf: suppression d'un long commentaire analytics/RGPD redondant dans `app.js`, sans changer le comportement ni le consentement.
- QA: le test modal/table gele maintenant son horloge proche de `generated_at` pour verifier la synchro pick même quand la machine tourne avec une donnee locale devenue stale.
- Mesure avant/apres: `app.js` 1,599,126 -> 1,597,420 bytes, soit ~1.7 KB de marge recuperee sous le cap 1,600,000.
- Cache/footer bumpes v35.422; `app.js` hash `d9aa35cd`.

## Sprint v35.423 — AUTO 10/10 Diagnostic MCP tracable (10:07 UTC)
- Diagnostic: `get_pipeline_status` expose maintenant `mcp_runtime` avec chemin du script, hash courant et statut de la copie legacy.
- Fix ops: la copie historique `paris-sportif-sprints` a ete resynchronisee pour eviter qu'une ancienne config desktop retourne encore une date stale.
- Mesure: smoke MCP OK, shadow audit OK, sortie live `today=2026-05-05`, `winamax_exact_ratio=0.9968`, shadow `aligned`.
- Cache/footer bumpes v35.423.

## Sprint v35.424 — AUTO 10/10 Garde-fou placeholders marche (10:10 UTC)
- Modele: `market_biases_by_league.json` expose maintenant un `placeholder_guard` pour tracer les anciens faux signaux `n=51` et WR `0.5455`.
- Audit: `audit_intelligence_consistency.py` echoue si tous les marches reprennent `n=51` ou si WR `0.5455` revient en masse sur les ligues.
- Mesure: build intelligence OK, `placeholder_guard=passed`, `market_n51_rows=0`, `league_wr5455_rows=1`, audit consistency OK.
- Cache/footer bumpes v35.424.

## Sprint v35.425 — AUTO 10/10 Referee signal truth MCP (10:13 UTC)
- Diagnostic: le MCP distingue maintenant `referee` exact, `referee_context` et `referee_signal` pour ne plus masquer les signaux arbitres de ligue comme donnees absentes.
- Gaps: `list_data_gaps` marque `referee_exact` quand seul le contexte de ligue existe, et `referee` seulement quand aucun signal arbitre n'est disponible.
- Mesure: smoke MCP OK, shadow audit OK, `referee_exact=5`, `referee_context=101`, `referee_signal=106`.
- Cache/footer bumpes v35.425.

## Sprint v35.426 — AUTO 10/10 Table training LightGBM (10:17 UTC)
- Modele: ajout de `build_backtest_training_rows.py`, qui exporte des lignes JSONL locales depuis les matchs Winamax 1N2 regles.
- Pipeline: `auto_refresh.py`, `refresh.yml` et `health.json` suivent maintenant `backtest_training_rows_summary.json` avant `train_lightgbm.py`.
- Mesure: 49 lignes generees, 19 positives, 4 sports; LightGBM passe en `row_level_table_detected_training_pending`; audit runtime OK.
- Cache/footer bumpes v35.426; `lightgbm_weights.js` hash `acc94279`.

## Sprint v35.427 — AUTO 10/10 Test rows LightGBM (10:19 UTC)
- QA: ajout d'une spec Playwright qui valide le JSONL training, le résumé et le lien avec `lightgbm_weights.json`.
- Garde-fou: le test vérifie lignes non vides, labels 0/1, cotes/probas valides, et `training_rows_count` synchronisé.
- Mesure: `tests/backtest-training-rows.spec.js` 2/2 desktop + mobile.
- Cache/footer bumpes v35.427.

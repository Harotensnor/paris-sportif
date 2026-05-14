# Changelog

Auto-généré depuis les messages de commit par `scripts/build_changelog.py`.
Les sections sont heuristiques : Features / Fixes / Performance / Docs.

## Desktop — 2026-05-14

### Sprint 6 — Polish ultime, aide intégrée, calendrier et stabilité longue durée

- Polish visuel du cockpit desktop : transitions douces entre vues, micro-interactions sur cartes/boutons, toasts unifiés, états vides plus lisibles et respect renforcé des tokens visuels.
- Ajout d'une vue `Aide` avec glossaire intégré pour les termes de décision : edge, EV, Kelly, CLV, Brier, tier, bucket d'edge, segment, sharp money, Outsider, BTTS, OU, DC, AH et DNB.
- Ajout de tooltips contextuels sur les notions techniques clés du cockpit pour éviter que les chiffres importants restent opaques.
- `Mes paris` accepte maintenant des notes privées et des tags personnels persistés localement, avec filtre par tag et export CSV enrichi.
- Nouvelle vue `Calendrier` sur 7 jours : densité de picks par jour, heatmap compacte et timeline horaire cliquable pour revenir au cockpit filtré.
- Préférences enrichies avec webhook mobile externe générique/Discord/ntfy/Telegram/Pushover, test sécurisé localement et envoi des alertes importantes depuis le process Electron, jamais depuis le renderer.
- Nouvelle vue `Pipeline` : état refresh, historique des durées, mémoire RSS, log live et annulation de refresh bloqué.
- Ajout d'un panneau logs debug accessible par `Ctrl+Shift+L`, avec filtres info/warn/error, copie et vidage local.
- Brief d'ouverture complété par `Modèle aujourd'hui` : picks affichés, segments verts/rouges, edge moyen du jour et qualité de journée de signaux.
- QA Sprint 6 : Playwright couvre le cycle complet `Je mise` → tags/notes → settlement → P&L, les écrans Aide/Calendrier/Pipeline/Logs et l'absence d'erreurs console ; stress Electron 30 minutes validé avec mémoire max 382 MB.

### Sprint 5 — Cockpit intelligent, CLV, discipline bankroll et alertes

- Ajout d'un `Brief du matin` en haut de l'accueil : nombre de picks affichés, gros edges, prochain match avec compte à rebours, performance d'hier, bankroll, CLV et accès rapides aux picks, combinés et paris suivis.
- Suivi utilisateur enrichi : chaque pari conserve cote prise, dernière cote vue, cote de clôture capturée quand le match approche, CLV, bucket d'edge, tier, marché et mode de mise.
- Vue `Historique` complétée avec CLV moyen et apprentissage depuis les paris suivis : comparaison edge moyen gagnants/perdants, warnings de segments perdants dès qu'un sample devient robuste.
- Préférences bankroll étendues : mode `Kelly plafonné` ou `Flat 1u`, flat unit, cap par mise, stop-loss journalier et take-profit journalier.
- Discipline de tracking : si stop-loss ou take-profit journalier est atteint, les boutons `Je mise` passent en pause et l'app prévient localement au lieu d'encourager un pari impulsif.
- Alertes intelligentes locales : nouveau pick prêt, gros edge proche kickoff, rappel pick <30 min non suivi, cote qui monte/baisse de 5%, signal blessure proche kickoff et notification de settlement manuel.
- Pré-kickoff plus réactif : l'auto-refresh passe à 5 minutes quand un pick démarre dans moins d'une heure, tout en gardant le mode économie si l'app reste en arrière-plan.
- Robustesse refresh : `snapshot_odds.py` écrit maintenant atomiquement avec retry, et la météo dispose d'un timeout plus réaliste sur les runs complets/signaux.
- Stabilité longue durée : monitoring mémoire Electron toutes les 5 minutes, exposé dans l'état local et journalisé si l'app dépasse 500 MB RSS.
- QA Sprint 5 : pipeline complète réelle exécutée, refresh rapide validé, captures visuelles, smoke Electron, Playwright, moteur, refresh contract et audit dépendances relancés sur données fraîches.

### Sprint 4 — Multi-marchés, combinés et crédibilité modèle

- Moteur desktop élargi aux marchés Winamax exacts au-delà du 1N2 : le cockpit exploite désormais les alternatives positives par match, avec 120 picks positifs détectés et 24 picks affichés dans la sélection principale.
- Ajout d'un filtre `Marché` et d'un résumé des marchés dominants pour basculer rapidement entre 1N2, O/U, BTTS, handicaps, totaux mi-temps, baskets/totaux et autres marchés supportés.
- Vue `Combinés` renforcée : variantes Safe, Best Edge, Buts et Outsider, cote totale, retour pour 10 euros, corrélation moyenne, edge composé et tracking `Je mise le combiné`.
- Vue `Historique` enrichie en tableau de crédibilité : ROI, win rate, Brier score, calibration par buckets et performance par sport/ligue/tier/marché à partir des rapports de backtest disponibles.
- Ajout de `Mes paris` détaillé : filtres période/statut, courbe P&L cumulée, settlement manuel, export CSV et cohérence avec la bankroll visible du cockpit.
- Nouvelle vue `Préférences` : bankroll, niveau, sports suivis, marchés autorisés, seuils personnels, mode strict et paramètres d'alerte persistés localement.
- Onboarding de première ouverture pour configurer bankroll, sports et niveau sans noyer l'utilisateur dans les réglages avancés.
- Fiche match enrichie avec une section `Pourquoi ce pick ?`, comparaison cote modèle / Winamax / consensus, signaux lisibles, forme récente et H2H quand disponibles.
- QA Sprint 4 : capture visuelle de tous les écrans principaux, smoke Electron, Playwright, moteur, refresh et audit dépendances valident 20+ boutons `Je mise`, les nouveaux filtres, les combinés, l'historique, les préférences et l'absence d'iframe.

### Sprint 3 — Design pro, robustesse et qualité de vie

- Ajout d'un socle `design-tokens.css` pour stabiliser la palette, les tailles, les espacements et les rayons de l'interface desktop.
- Démarrage accéléré du cockpit : préchauffage/cache moteur côté Electron et affichage mesuré des picks autour de 0,5s dans la capture QA.
- Cockpit enrichi avec indicateur performance, prochaine échéance d'auto-refresh et message plus clair sur les paris réellement prêts.
- Bankroll suivie améliorée : sparkline P&L des 30 derniers paris, résumé segment/streak et export CSV des paris suivis.
- Refresh intelligent : 30 min par défaut, 10 min si un pick proche démarre dans moins d'une heure, pause économie si l'app reste en arrière-plan plus d'une heure.
- Notifications desktop natives autorisées uniquement pour les opportunités importantes : nouveau pick prêt ou gros edge proche, sans fetch internet depuis le renderer.
- Robustesse données : les données anciennes mais encore présentes restent affichées avec un bandeau clair au lieu de vider l'écran ; les fiches signalent les contextes limités.
- QA renforcée : Playwright, smoke et capture visuelle vérifient design tokens, P&L enrichi, export suivis, notifications, refresh intelligent et performance cockpit.

### Suite UX / QA

- `npx playwright test` cible désormais l'application Electron locale au lieu de l'ancienne suite site trop longue : test cockpit, tracking `Je mise`, P&L, filtres, fiche match, sécurité renderer et absence d'iframe.
- Ajout des filtres rapides sur le cockpit : recherche équipe, sport, ligue, tri edge/confiance/kickoff/cote, edge min et cote min.
- Fiche match refondue en synthèse décisionnelle : verdict immédiat, ticket, cote, edge, mise, contexte, signaux clés météo/arbitre/compos/blessures/stats/xG et audit technique replié.
- Scénarios de mise repliés par défaut pour garder le premier écran centré sur les picks actionnables.
- Raccourcis clavier desktop `Ctrl+1` à `Ctrl+7` pour naviguer vite entre les vues principales.

### Fixes

- Correction du blocage critique `0 pari jouable` dans l'app Electron : le moteur exploite maintenant le pick 1N2 prédit quand la cote Winamax est valide et l'edge est positif, même si l'ancien modèle legacy marquait le match en skip prudent.
- Séparation claire entre picks utilisateur et agent autonome : les picks manuels peuvent être affichés comme jouables, tandis que l'agent reste bloqué si la checklist globale est rouge.
- Données fraîches relancées par le refresh local rapide : catalogue Winamax, marchés détaillés, contexte match, health et rapports recalculés.

### UX

- Accueil recentré sur `Paris prêts` / `À jouer maintenant`, avec 10+ picks visibles, mise uniquement sur les picks autorisés, et bouton `Je mise` pour suivre un pari en un clic.
- Ajout d'un suivi bankroll local visible en permanence : P&L total, P&L du jour, ROI et nombre de paris suivis.
- Auto-refresh de fond toutes les 30 minutes et indicateur de fraîcheur moins anxiogène : les données ne sont plus marquées bloquées avant le seuil réel de 4h.

### QA

- Tests desktop renforcés sur le critère vital : au moins 10 picks prêts, boutons `Je mise`, P&L visible, cohérence décisionnelle et agent bloqué quand les gates globaux restent rouges.

## v37.019 — 2026-05-06

### Features

- `114f8b4e` v37.019 privacy-social — local sharing badges and data controls · diff +3498/-3

## v37.018 — 2026-05-06

### Features

- `547e4032` v37.018 data-integrity — validation lineage and health monitoring · diff +4651/-431

## v37.017 — 2026-05-06

### Performance

- `827c45e8` v37.017 performance — ESM shell workers and budgets · diff +49759/-34020

## v37.016 — 2026-05-06

### Features

- `2c0b4e6b` v37.016 ux overhaul — design system v3 foundation · diff +1175/-34

## v37.015 — 2026-05-06

### Features

- `23311abc` v37.015 sports coverage — extended sports matrix · diff +1563/-210

## v37.014 — 2026-05-06

### Features

- `133ac36c` v37.014 section N — final checks V5 · diff +369/-261

## v37.013 — 2026-05-06

### Features

- `001de970` v37.013 section M — adversarial validation V5 · diff +520/-11

## v37.012 — 2026-05-06

### Features

- `40c6c7c3` v37.012 section L — self-evaluation V5 · diff +155/-4

## v37.011 — 2026-05-06

### Features

- `dae181b1` v37.011 section K — backtest deep V5 · diff +656/-10

## v37.010 — 2026-05-06

### Features

- `0d0d88ea` v37.010 section J — multi-task V5 · diff +519/-10

## v37.009 — 2026-05-06

### Features

- `c3279a49` v37.009 section I — cold start V5 · diff +22771/-17

## v37.008 — 2026-05-06

### Features

- `b2875b18` v37.008 section H — intervalles prediction V5 · diff +136/-6

## v37.007 — 2026-05-06

### Features

- `1761b08e` v37.007 section G — ensemble adaptatif V5 · diff +557/-24

## v37.006 — 2026-05-06

### Features

- `9e894aa6` v37.006 section F — calibration V5 brier gatee · diff +171/-4

## v37.005 — 2026-05-06

### Fixes

- `4d99c4ba` v37.005 section E — drift ML KL features · diff +164/-4

## v37.004 — 2026-05-06

### Features

- `cb92fc81` v37.004 section D — online learning V5 versionne · diff +146/-4

## v37.003 — 2026-05-06

### Features

- `ef3fc09b` v37.003 section C — feature engineering V5 auditable · diff +156/-5

## v37.002 — 2026-05-06

### Features

- `40e6f7a4` v37.002 section B — stacking meta V5 borne · diff +156/-5

## v37.001 — 2026-05-06

### Features

- `bf808357` v37.001 section A — priors bayesiens V5 hierarchiques · diff +178/-8

## v36.035 — 2026-05-06

### Features

- `f0a06eb7` v36.035 section LLL — mode novice expert · diff +76/-7

## v36.034 — 2026-05-06

### Features

- `a73b0aaf` v36.034 section KKK — badges tier compacts mobiles · diff +80/-11

## v36.033 — 2026-05-06

### Features

- `b6eba2ae` v36.033 section JJJ — filtres rapides mobiles · diff +102/-5

## v36.032 — 2026-05-06

### Features

- `c8786e79` v36.032 section III — partage natif deep-link match · diff +58/-9

## v36.031 — 2026-05-06

### Features

- `c1b74f35` v36.031 section HHH — menu long-press mobile · diff +165/-4

## v36.030 — 2026-05-06

### Features

- `ade432ff` v36.030 section GGG — zones tactiles mobiles · diff +27/-4

## v36.029 — 2026-05-06

### Features

- `44a0ba84` v36.029 section FFF — filtres mobiles compacts · diff +67/-10

## v36.028 — 2026-05-06

### Features

- `6e9e6157` v36.028 section EEE — modal bottom sheet mobile · diff +88/-14

## v36.027 — 2026-05-06

### Features

- `519c115e` v36.027 section DDD — pull-to-refresh haptique · diff +68/-18

## v36.026 — 2026-05-06

### Features

- `9ec743ff` v36.026 section CCC — gestes mobiles dashboard · diff +70/-5

## v36.025 — 2026-05-06

### Features

- `28402247` v36.025 section BBB — mobile cards compactes · diff +99/-2

## v36.024 — 2026-05-06

### Features

- `5a9b853c` v36.024 section AAA — same-game builders corrélés · diff +398/-221

## v36.023 — 2026-05-06

### Features

- `c1dea39c` v36.023 section ZZ — props MLB NHL · diff +2276/-197

## v36.022 — 2026-05-05

### Features

- `8c4cb0da` v36.022 section YY — tennis jeux et sets · diff +251/-191

## v36.021 — 2026-05-05

### Features

- `bbf3a511` v36.021 section XX — totaux quart-temps basket · diff +247/-189

## v36.020 — 2026-05-05

### Features

- `83720528` v36.020 section WW — BTTS deux mi-temps · diff +250/-188

## v36.019 — 2026-05-05

### Features

- `c1b382bb` v36.019 section VV — ordre des buts poisson · diff +259/-188

## v36.018 — 2026-05-05

### Features

- `a1859615` v36.018 section UU — marches stats foot · diff +328/-184

## v36.017 — 2026-05-05

### Features

- `fc9cddf3` v36.017 section TT — matrice HTFT complete · diff +205/-181

## v36.016 — 2026-05-05

### Features

- `7c60f907` v36.016 section RR-SS — marches asiatiques quart-point · diff +345/-182

## v36.015 — 2026-05-05

### Features

- `bb0318aa` v36.015 section QQ — props joueurs NBA WNBA · diff +4611/-181

## v36.014 — 2026-05-05

### Features

- `e1d9e880` v36.014 section PP — marches joueurs foot · diff +10129/-186

## v36.013 — 2026-05-05

### Features

- `d74166a7` v36.013 section phase6 — validation et rapport V4 · diff +118/-2

## v36.012 — 2026-05-05

### Features

- `14126fb1` v36.012 section NN-OO — benchmark et anomalies marche · diff +675/-171

## v36.011 — 2026-05-05

### Features

- `71f906e9` v36.011 section MM — stats equipe etendues · diff +241/-168

## v36.010 — 2026-05-05

### Features

- `f2f5551e` v36.010 section LL — derbies variance controlee · diff +230/-164

## v36.009 — 2026-05-05

### Features

- `c4c4b8a6` v36.009 section KK — tenure coach manager shock · diff +239/-162

## v36.008 — 2026-05-05

### Features

- `580babf2` v36.008 section JJ — effets stade altitude · diff +224/-160

## v36.007 — 2026-05-05

### Features

- `63662b8e` v36.007 section II — surface tennis goalies pitchers · diff +289/-155

## v36.006 — 2026-05-05

### Features

- `8984cdae` v36.006 section HH — tendances arbitres V4 · diff +233/-153

## v36.005 — 2026-05-05

### Features

- `d8914a9e` v36.005 section FF-GG — voyage et densite calendrier · diff +254/-149

## v36.004 — 2026-05-05

### Features

- `b755a7c3` v36.004 section EE — decay xg par ligue · diff +232/-148

## v36.003 — 2026-05-05

### Features

- `3b8bbbf8` v36.003 section DD — impact stars absentes · diff +281/-144

## v36.002 — 2026-05-05

### Features

- `86c0ba2a` v36.002 section BB-CC — saison et competition V4 · diff +306/-140

## v36.001 — 2026-05-05

### Features

- `ec895ebd` v36.001 section AA — priors bayesiens equipe · diff +676/-140

## v35.502 — 2026-05-05

### Features

- `987859c4` v35.502 section phase1 — fondations data persistantes · diff +6439/-182

## v35.482 — 2026-05-05

### Features

- `c7327910` v35.482 section A-E: pipeline frais et cohérence tableau

## v35.481 — 2026-05-05

### Features

- `2054df2f` v35.481 section 4.3: final stability audit · +9/-3

## v35.480 — 2026-05-05

### Features

- `0c618e32` v35.480 section 4.2: refresh night metrics · +140/-134

## v35.479 — 2026-05-05

### Features

- `127c9494` v35.479 section 3.3: clarify Methode hierarchy · +18/-12

## v35.478 — 2026-05-05

### Features

- `1f76cb09` v35.478 section 3.2: make Tous scannable · +48/-16

## v35.477 — 2026-05-05

### Features

- `1bb489a7` v35.477 section 3.1: group profile accordions · +89/-8

## v35.476 — 2026-05-05

### Features

- `cf735c8f` v35.476 section 1-2: stabilize pick coherence · +460/-188

## v35.475 — 2026-05-05

### Features

- `5b0900cd` v35.475 dashboard: calibrate pick quality

## v35.474 — 2026-05-05

### Fixes

- `db02fb7e` v35.474 dashboard: unblock stale pick table

## v35.473 — 2026-05-05

### Docs

- `71bc7620` v35.473 docs: publish stability report

## v35.472 — 2026-05-05

### Performance

- `982da6e4` v35.472 perf: compress dashboard css

## v35.471 — 2026-05-05

### Features

- `58998a21` v35.471 data: clarify signal coverage

## v35.470 — 2026-05-05

### Features

- `8399043f` v35.470 test: stabilize V37 audits

## v35.469 — 2026-05-05

### Features

- `69a1d792` v35.469 ux: clarify dashboard decisions

## v35.468 — 2026-05-05

### Docs

- `144f33c2` v35.468 docs: clarify hosting options

## v35.467 — 2026-05-05

### Features

- `3297cb9e` v35.467 audit: confirm stability scores

## v35.466 — 2026-05-05

### Features

- `d0a83837` v35.466 test: clarify dashboard history

## v35.465 — 2026-05-05

### Fixes

- `3ccbd977` v35.465 fix: widen dashboard navigation

## v35.464 — 2026-05-05

### Fixes

- `8e930fcd` v35.464 fix: stabilize Theo dashboard table

## v35.463 — 2026-05-05

### Features

- `ae94eddd` v35.463 qa: align a11y audit with five hubs

## v35.462 — 2026-05-05

### Features

- `6f7a879b` v35.462 qa: align modal tabs test with tech panel

## v35.461 — 2026-05-05

### Features

- `cd4cd868` v35.461 qa: modernise phase3 validation tests

## v35.460 — 2026-05-05

### Features

- `7bf035a7` v35.460 pipeline: rafraichir formes equipes

## v35.459 — 2026-05-05

### Features

- `2105b89e` v35.459 pipeline: restaurer donnees fraiches

## v35.458 — 2026-05-05

### Fixes

- `1c8da03d` v35.458 debug: diagnostiquer tableau Theo

## v35.457 — 2026-05-05

### Features

- `09a23cc0` v35.457 validation: recap extensions finales

## v35.456 — 2026-05-05

### Features

- `4d55af70` v35.456 validation: proteger tableau final

## v35.455 — 2026-05-05

### Features

- `cd8cc227` v35.455 test: stabiliser validation finale

## v35.454 — 2026-05-05

### Features

- `0b3854ef` v35.454 test: debloquer suite playwright

## v35.453 — 2026-05-05

### Performance

- `0f30c531` v35.453 regression: restaurer a11y lighthouse

## v35.452 — 2026-05-05

### Features

- `340c4a5c` v35.452 validation: recap issues

## v35.451 — 2026-05-05

### Features

- `0fbdf858` v35.451 validation: contenu final

## v35.450 — 2026-05-05

### Features

- `41e5327e` v35.450 validation: polish code

## v35.449 — 2026-05-05

### Features

- `1c20d85f` v35.449 validation: features produit

## v35.448 — 2026-05-05

### Features

- `80b03836` v35.448 validation: modele branche

## v35.447 — 2026-05-05

### Features

- `6d1be42a` v35.447 validation: signaux genie

## v35.446 — 2026-05-05

### Features

- `74e0dcf2` v35.446 validation: extensions sport

## v35.445 — 2026-05-05

### Features

- `4710e0d1` v35.445 validation: accueil plein

## v35.444 — 2026-05-05

### Features

- `5e10208e` v35.444 K: enrichir timing de mise

## v35.443 — 2026-05-05

### Features

- `a57333bc` v35.443 K: qualifier signaux rares

## v35.442 — 2026-05-05

### Features

- `53a4de3b` v35.442 K: synthese spots calendrier

## v35.441 — 2026-05-05

### Features

- `300e6d0a` v35.441 K: structurer anti-public

## v35.440 — 2026-05-05

### Features

- `bc167c5b` v35.440 K: enrichir inefficiences ligues

## v35.439 — 2026-05-05

### Features

- `0a436cfc` v35.439 J: clarifier rugby watch

## v35.438 — 2026-05-05

### Features

- `c6eb30da` v35.438 J: suivre expansion foot

## v35.437 — 2026-05-05

### Features

- `354d12b8` v35.437 J: suivre tennis challenger

## v35.436 — 2026-05-05

### Features

- `5f34458d` v35.436 J: renforcer marches NHL

## v35.435 — 2026-05-05

### Features

- `cadf1206` v35.435 J: deriver props lanceurs MLB

## v35.434 — 2026-05-05

### Features

- `633e1244` v35.434 J: etendre taxonomy sports

## v35.433 — 2026-05-05

### Features

- `3459e9fb` v35.433 qa: valider la Section 0 tableau

## v35.432 — 2026-05-05

### Features

- `6c6a0d06` v35.432 intel: rendre les placeholders marche non bloquants

## v35.431 — 2026-05-05

### Features

- `f38c9661` v35.431 modele: assouplir abstain multi-sport

## v35.430 — 2026-05-05

### Features

- `1cb4dc6f` v35.430 data: restaurer Sofascore sans boot lourd

## v35.429 — 2026-05-05

### Features

- `85a608fc` v35.429 data: restaurer pipeline frais

## v35.428 — 2026-05-05

### Fixes

- `ce4ea628` v35.428 fix: table stale lisible

## v35.427 — 2026-05-05

### Features

- `ea3b31f5` v35.427 QA: couvrir les lignes training

## v35.426 — 2026-05-05

### Features

- `641a08b0` v35.426 Modele: generer les lignes training

## v35.425 — 2026-05-05

### Features

- `faa4bbc0` v35.425 MCP: clarifier les signaux arbitres

## v35.424 — 2026-05-05

### Features

- `304c8b14` v35.424 Modele: verrouiller placeholders marche

## v35.423 — 2026-05-05

### Features

- `fed6e2f7` v35.423 MCP: tracer le runtime diagnostic

## v35.422 — 2026-05-05

### Performance

- `a450f97b` v35.422 QA: recuperer marge bundle

## v35.421 — 2026-05-05

### Features

- `d311b151` v35.421 QA: couvrir le briefing quotidien

## v35.420 — 2026-05-05

### Features

- `16495727` v35.420 E3: ajouter briefing quotidien local

## v35.419 — 2026-05-05

### Features

- `624d981a` v35.419 K8: durcir les picks du genie

## v35.418 — 2026-05-05

### Features

- `33e2f405` v35.418 I6: rendre les signaux modele lisibles

## v35.417 — 2026-05-05

### Features

- `ec666aa2` v35.417 I1: separer xG dans ensemble modele

## v35.416 — 2026-05-05

### Features

- `dff168f6` v35.416 I10: ajouter garde-fou AUC marche

## v35.415 — 2026-05-05

### Features

- `0137c67b` v35.415 H10: trier top sport par opportunite

## v35.414 — 2026-05-05

### Features

- `7bea2a16` v35.414 H8: etendre combos intra-match

## v35.413 — 2026-05-05

### Features

- `f5806734` v35.413 D5: retirer JSON-LD runtime mort

## v35.412 — 2026-05-05

### Features

- `73313d9e` v35.412 H4-H7: exposer basket periode et baseball F5

## v35.411 — 2026-05-05

### Features

- `14bb3079` v35.411 H2-H3: exposer corners et cartons

## v35.410 — 2026-05-05

### Features

- `99a4189a` v35.410 H1: exposer les totaux mi-temps

## v35.409 — 2026-05-05

### Fixes

- `72115fa7` v35.409 B2-B5: valider score signaux et bugs captures

## v35.408 — 2026-05-05

### Features

- `7ae0e0c1` v35.408 B1: brancher le runtime LightGBM pipeline

## v35.407 — 2026-05-05

### Performance

- `025025e8` v35.407 A4: durcir le garde-fou bundle

## v35.406 — 2026-05-05

### Features

- `f8795b02` v35.406 A3: restaurer le signal arbitre

## v35.405 — 2026-05-05

### Features

- `a02ee3f2` v35.405 A2: aligner les ratios Winamax

## v35.404 — 2026-05-05

### Features

- `fee81fdc` v35.404 A5: verrouiller les samples marche

## v35.403 — 2026-05-05

### Features

- `b8ab82f7` v35.403 A1: verrouiller la date dynamique MCP

## v35.402 — 2026-05-05

### Features

- `6c4badb6` v35.402 C5: ajouter le mode blind discipline

## v35.401 — 2026-05-05

### Features

- `a35c49a7` v35.401 C7: remonter les suggestions perso

## v35.400 — 2026-05-05

### Features

- `63a7a208` v35.400 C6: ajouter le projecteur bankroll

## v35.399 — 2026-05-05

### Features

- `603413d6` v35.399 C4: ajouter la heatmap pnl personnelle

## v35.398 — 2026-05-05

### Features

- `381b0244` v35.398 C3: ajouter le detecteur tilt

## v35.397 — 2026-05-04

### Features

- `191451c9` v35.397 C1: afficher le tracking CLV

## v35.396 — 2026-05-04

### Features

- `f270feca` v35.396 C2: enrichir score opportunite

## v35.395 — 2026-05-04

### Features

- `8f979bc7` v35.395 H10: ajouter paris du jour par sport

## v35.394 — 2026-05-04

### Features

- `d49ed1f0` v35.394 H1: etendre table multi-marches

## v35.393 — 2026-05-04

### Features

- `c107b170` v35.393 B5: verrouiller regressions captures V37

## v35.392 — 2026-05-04

### Features

- `c8a41095` v35.392 B3-B4: exposer signaux pour contre

## v35.391 — 2026-05-04

### Features

- `fbdc1c9a` v35.391 B2: rendre tooltip score opportunite testable

## v35.390 — 2026-05-04

### Features

- `538f091b` v35.390 B1: brancher poids lightgbm runtime

## v35.389 — 2026-05-04

### Performance

- `6d054537` v35.389 A4: reduire app js sous seuil bundle

## v35.388 — 2026-05-04

### Features

- `1955d2ca` v35.388 A3: ajouter contexte arbitral honnete

## v35.387 — 2026-05-04

### Features

- `4d057549` v35.387 A5: recalculer les biais marches sur cotes reelles

## v35.386 — 2026-05-04

### Fixes

- `847d454b` v35.386 A1-A2: corriger MCP date et ratio

## v35.385 — 2026-05-04

### Features

- `cf73a947` v35.385 B1: auditer verite data unique

## v35.384 — 2026-05-04

### Features

- `8327ecb2` v35.384 E5: regenerer night metrics

## v35.383 — 2026-05-04

### Features

- `08044c3e` v35.383 D2: nettoyer commentaires legacy

## v35.382 — 2026-05-04

### Features

- `b43b5ed1` v35.382 D4: separer issues actives et resolues

## v35.381 — 2026-05-04

### Features

- `c4e15742` v35.381 D3: compacter journal de sprint

## v35.380 — 2026-05-04

### Features

- `5512795e` v35.380 D6: verrouiller skips Playwright

## v35.379 — 2026-05-04

### Features

- `8b9a287e` v35.379 A1-A9: verrouiller coherence intelligence

## v35.378 — 2026-05-04

### Features

- `1637594a` v35.378 Infra: aborter fetchs de page

## v35.377 — 2026-05-04

### Features

- `c26c6f71` v35.377 Security: surveiller innerHTML

## v35.376 — 2026-05-04

### Features

- `ec67d6c7` v35.376 UX: clarifier tags et raisons de pari

## v35.375 — 2026-05-04

### Features

- `86c72695` v35.375 B4: verrouiller date MCP dynamique

## v35.374 — 2026-05-04

### Features

- `b690e5b7` v35.374 D6: aligner tests SPA sur 5 hubs

## v35.373 — 2026-05-04

### Features

- `4062a5a2` v35.373 E6: exporter poids appris offline

## v35.372 — 2026-05-04

### Performance

- `5d5c9b59` v35.372 E3: auditer bundle initial

## v35.371 — 2026-05-04

### Features

- `d133ed9e` v35.371 E1: consolider navigation en 5 hubs

## v35.370 — 2026-05-04

### Features

- `4a46f673` v35.370 E2: renforcer matching arbitres

## v35.369 — 2026-05-04

### Features

- `111afebe` v35.369 D9: etendre couverture xG proxy

## v35.368 — 2026-05-04

### Features

- `6bf56522` v35.368 D5: tracer listeners UI

## v35.367 — 2026-05-04

### Features

- `30d8abab` v35.367 D1: tracer erreurs JS silencieuses

## v35.366 — 2026-05-04

### Features

- `7376241a` v35.366 B5: etendre marches Winamax detailles

## v35.365 — 2026-05-04

### Features

- `31a1a8e2` v35.365 B3: expliciter audit cotes boostees

## v35.364 — 2026-05-04

### Features

- `f8871fb4` v35.364 B2: archiver les JSON orphelins

## v35.363 — 2026-05-04

### Features

- `61001814` v35.363 B1-B4: synchroniser les verites data

## v35.362 — 2026-05-04

### Features

- `7a5b3ec8` v35.362 A9: expliquer les signaux pour contre

## v35.361 — 2026-05-04

### Features

- `47f6dbb7` v35.361 A8: decomposer le score opportunite

## v35.360 — 2026-05-04

### Features

- `e7539ca4` v35.360 A6: detecter marches de cotes incertains

## v35.359 — 2026-05-04

### Features

- `169a35ce` v35.359 model: prioritize league edge over noisy angles

## v35.358 — 2026-05-04

### Features

- `5d30cc17` v35.358 model: reconcile contradictory angles

## v35.357 — 2026-05-04

### Features

- `b76a3611` v35.357 model: sanity-check market biases

## v35.356 — 2026-05-04

### Features

- `5185df7b` v35.356 data: etendre couverture xG hors top-5

## v35.355 — 2026-05-04

### Fixes

- `5abb7328` v35.355 ux: verrouiller bugs captures

## v35.354 — 2026-05-04

### Features

- `92c53e09` v35.354 data: enrichir H2H grands matchs

## v35.353 — 2026-05-04

### Fixes

- `4ba914f1` v35.353 fix: synchroniser table et modal

## v35.352 — 2026-05-04

### Features

- `38b51c14` v35.352 pipeline: aligner auto refresh

## v35.351 — 2026-05-04

### Performance

- `8a08bd94` v35.351 data: fusionner cache lineups

## v35.350 — 2026-05-04

### Performance

- `cdbaf45d` v35.350 data: fusionner cache arbitres

## v35.349 — 2026-05-04

### Features

- `7d665048` v35.349 data: rafraichir h2h prioritaire

## v35.348 — 2026-05-04

### Features

- `d5ddb061` v35.348 data: reconnaitre injuries vides couvertes

## v35.347 — 2026-05-04

### Features

- `13d9fd81` v35.347 ui: scorer les signaux rares par direction

## v35.346 — 2026-05-04

### Features

- `af192be4` v35.346 data: detecter angles voyage fatigue US

## v35.345 — 2026-05-04

### Features

- `c4649c1a` v35.345 data: rendre gaps arbitres time-aware

## v35.344 — 2026-05-04

### Features

- `6226016f` v35.344 data: renforcer aliases sources foot

## v35.343 — 2026-05-04

### Features

- `cc02eaf5` v35.343 ui: connecter biais marches au dashboard

## v35.342 — 2026-05-04

### Features

- `2d0ec30b` v35.342 data: publier biais marches par ligue

## v35.341 — 2026-05-04

### Features

- `ec27cd38` v35.341 data: rendre gaps lineups temporels

## v35.340 — 2026-05-04

### Features

- `8788916e` v35.340 mcp: exposer gaps data multi-jours

## v35.339 — 2026-05-04

### Features

- `ed1a6676` v35.339 ui: penaliser gaps data dans score

## v35.338 — 2026-05-04

### Features

- `8ecb3040` v35.338 ui: personnaliser score profil Theo

## v35.337 — 2026-05-04

### Features

- `b868d753` v35.337 ui: afficher gaps data critiques

## v35.336 — 2026-05-04

### Features

- `ec0f6712` v35.336 data: publier rapport gaps signaux

## v35.335 — 2026-05-04

### Features

- `0d0a21ea` v35.335 ui: ajouter score opportunite

## v35.334 — 2026-05-04

### Features

- `3d8465a8` v35.334 data: partager aliases signaux foot

## v35.333 — 2026-05-04

### Features

- `e7af06ca` v35.333 data: attacher starters MLB NHL

## v35.332 — 2026-05-04

### Features

- `a7f68e3b` v35.332 ui: afficher insights modele accueil

## v35.331 — 2026-05-04

### Features

- `a0261a8f` v35.331 data: generer intelligence betting

## v35.330 — 2026-05-04

### Features

- `3e3688e7` v35.330 data: attacher blessures multi-sports

## v35.329 — 2026-05-04

### Features

- `43b305b0` v35.329 data: injecter signaux foot dans patch rapide

## v35.328 — 2026-05-04

### Features

- `3987fdba` v35.328 ux: replace native alerts with toasts

## v35.327 — 2026-05-04

### Features

- `4eb6ccca` v35.327 ux: remove native prompt fallback

## v35.326 — 2026-05-04

### Features

- `b1dbbac9` v35.326 security: sanitize dynamic HTML sinks

## v35.325 — 2026-05-04

### Features

- `198e4b27` v35.325 security: lock script CSP hashes

## v35.324 — 2026-05-04

### Features

- `6b431383` v35.324 security: remove inline event handlers

## v35.323 — 2026-05-04

### Features

- `1158b59f` v35.323 pipeline: fresh metrics and MCP date guard

## v35.322 — 2026-05-04

### Features

- `693f7c35` v35.322 security: fallback logos table sans inline handler

## v35.321 — 2026-05-04

### Features

- `a8586f74` v35.321 tests: verrouiller libelles Winamax

## v35.320 — 2026-05-04

### Features

- `43095fe0` v35.320 labels: libelles Winamax lisibles

## v35.319 — 2026-05-04

### Fixes

- `0b896788` v35.319 hotfix: clean conflict markers finally

## v35.318 — 2026-05-04

### Fixes

- `5e14aae7` v35.318 hotfix: remove conflict markers

## v35.317 — 2026-05-04

### Performance

- `7669b2d4` v35.317 perf: bound odds history loading

## v35.316 — 2026-05-04

### Features

- `707624af` v35.316 seo: align sitemap with V37 hubs

## v35.315 — 2026-05-04

### Performance

- `502cbbd9` v35.315 perf: delegate V37 detail listeners

## v35.314 — 2026-05-04

### Features

- `ba247c38` v35.314 security: render refresh status safely

## v35.313 — 2026-05-04

### Features

- `1f37b72d` v35.313 security: harden search suggestions

## Unversioned — 2026-05-04

### Features

- `26402113` data: auto-refresh 2026-05-04 22:57 UTC
- `971a4bde` data: auto-refresh 2026-05-04 22:56 UTC
- `24b615c8` data: auto-refresh 2026-05-04 22:52 UTC
- `9e47ae6d` data: auto-refresh 2026-05-04 22:43 UTC
- `61ba97fe` data: auto-refresh 2026-05-04 22:37 UTC
- `951a6309` data: auto-refresh 2026-05-04 22:32 UTC
- `e7cec04f` data: auto-refresh 2026-05-04 22:26 UTC
- `e629cf00` data: auto-refresh 2026-05-04 22:24 UTC
- `b2a3846e` data: auto-refresh 2026-05-04 22:20 UTC
- `9acb9f16` data: auto-refresh 2026-05-04 22:12 UTC
- `886c3b28` data: auto-refresh 2026-05-04 22:03 UTC
- `0e24aa2e` data: auto-refresh 2026-05-04 21:56 UTC
- `be320933` data: auto-refresh 2026-05-04 21:52 UTC
- `0f1fcc4e` data: auto-refresh 2026-05-04 21:49 UTC
- `bd2835b2` data: auto-refresh 2026-05-04 21:46 UTC
- `0d5832e5` data: auto-refresh 2026-05-04 21:38 UTC
- `897115a1` data: auto-refresh 2026-05-04 21:32 UTC
- `e8d461b9` data: auto-refresh 2026-05-04 21:26 UTC
- `b409acb8` data: auto-refresh 2026-05-04 21:22 UTC
- `88a642aa` data: auto-refresh 2026-05-04 21:19 UTC
- `aad68b4f` data: auto-refresh 2026-05-04 21:15 UTC
- `713c7bb0` data: auto-refresh 2026-05-04 21:09 UTC
- `97119b63` data: auto-refresh 2026-05-04 21:05 UTC
- `0328ba90` data: auto-refresh 2026-05-04 20:56 UTC
- `3f408e99` data: auto-refresh 2026-05-04 20:51 UTC
- `e28ef6eb` data: auto-refresh 2026-05-04 20:48 UTC
- `5ccd6584` data: auto-refresh 2026-05-04 20:43 UTC
- `fa8d7977` data: auto-refresh 2026-05-04 20:40 UTC
- `21d829e4` data: auto-refresh 2026-05-04 20:38 UTC
- `3408b364` data: auto-refresh 2026-05-04 20:28 UTC

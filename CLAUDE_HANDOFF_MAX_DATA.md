# Claude handoff — Paris-Sportif max data

Collecte faite depuis le workspace local `C:\Users\bouln\Documents\Claude\Projects\Paris-Sportif`.

Horodatage collecte : `2026-04-26 01:04 Europe/Paris` (`2026-04-25T23:04:58Z`).

## Prompt à donner à Claude

Tu reprends le projet Paris-Sportif, site de pronostics sportifs Winamax-only. Ne pars pas du dossier local comme source de vérité sans vérifier : il est très en retard sur `origin/main`. Commence par lire `AGENTS.md`, puis ce fichier, puis les snapshots JSON générés :

- `claude_handoff_snapshot.json` : état live GitHub Pages + GitHub commits/runs + métriques data.
- `claude_local_snapshot.json` : état du dossier local.
- `claude_ci_snapshot.json` : dernier run CI en échec visible via API.
- `claude_workflows_snapshot.json` : workflows actuels récupérés depuis GitHub.
- `claude_repo_contents_snapshot.json` : inventaire actuel du repo GitHub main.

Priorité absolue : ne pas écraser la version live avec les fichiers locaux obsolètes. Récupère ou compare le `main` actuel avant toute modification. Préserve le splice `PRONOSTICS_DATA` et le cache busting du service worker.

## Résumé exécutif

Le site live est frais et fonctionnel, mais le dossier local racine est obsolète.

- Live `data.js` généré : `2026-04-25T23:02:42.267329Z`, âge au scan : `2 min`.
- Live latest commit : `3e8cd7c`, `data: auto-refresh 2026-04-25 23:03 UTC`.
- Service worker live : `paris-sportif-20260425-230329`, network-first activé.
- Repo local : `main...origin/main [behind 1009]`.
- Data locale racine : `2026-04-22T16:05:47.211616Z`, âge au scan : `4738 min`.
- `pronostics.html` local racine n’a pas les fonctions agent v27/v30 (`_agentReplay`, `_agentBestPick`, stale guard).
- `deploy-v20/pronostics.html` a v28.10, mais le live est plus récent et contient des éléments v30.

Conclusion : tout chantier doit repartir du GitHub `main` actuel, pas du fichier racine local ni de `deploy-v20` sans merge.

## Sources à fournir

URLs live :

- Site : https://harotensnor.github.io/paris-sportif/pronostics.html
- Data : https://harotensnor.github.io/paris-sportif/data.js
- Service worker : https://harotensnor.github.io/paris-sportif/sw.js
- Manifest : https://harotensnor.github.io/paris-sportif/manifest.webmanifest
- Repo : https://github.com/Harotensnor/paris-sportif

Fichiers locaux utiles :

- `AGENTS.md`
- `CLAUDE.md`
- `CHANTIER-MULTI-MARCHE.md`
- `.github/workflows/refresh.yml` local, mais attention : le workflow live est plus récent.
- `deploy-v20/DEPLOY-V20.bat`
- `deploy-v20/splice-prono-data.js`
- `claude_handoff_snapshot.json`
- `claude_local_snapshot.json`
- `claude_ci_snapshot.json`
- `claude_workflows_snapshot.json`
- `claude_repo_contents_snapshot.json`

## État live du site

Réponses live récupérées :

| Fichier | HTTP | Taille | Last-Modified | Cache |
|---|---:|---:|---|---|
| `pronostics.html` | 200 | 1,460,338 | Sat, 25 Apr 2026 23:04:02 GMT | max-age=600 |
| `data.js` | 200 | 1,734,568 | Sat, 25 Apr 2026 23:04:02 GMT | max-age=600 |
| `sw.js` | 200 | 4,414 | Sat, 25 Apr 2026 23:04:03 GMT | max-age=600 |
| `manifest.webmanifest` | 200 | 1,324 | Sat, 25 Apr 2026 23:04:03 GMT | max-age=600 |
| `odds_history.jsonl` | 200 | 424,345 | Sat, 25 Apr 2026 23:04:02 GMT | max-age=600 |

`pronostics.html` live :

- Taille : `1,460,338` octets.
- Lignes : `19,667`.
- Aucun `<script src>` externe, data inline dans le HTML.
- `window.PRONOSTICS_DATA.generated_at` inline : `2026-04-25T23:02:42.267329Z`.

Positions des fonctions live :

| Fonction / marqueur | Ligne live |
|---|---:|
| `function kellyFraction` | 3135 |
| `function predictMatch` | 3945 |
| `function openDetail` | 7021 |
| `function _agentBestPick` | 9214 |
| `function _evaluateBestPick` | 9254 |
| `function _agentReplay` | 9383 |
| `function renderDashboardPage` | 9496 |
| `_dataIsStale` | 9550 |
| `autoRefreshDoneAt` | 9829 |
| `nth-child` mobile fragile | 1102 |
| `_agentPauseStatus` | absent live |

## Métriques live `data.js`

`generated_at` : `2026-04-25T23:02:42.267329Z`.

Journée Paris au scan : `2026-04-26`.

Événements :

- Total : `865`.
- Upcoming total : `571`.
- Aujourd’hui Paris : `151`.
- Upcoming aujourd’hui : `142`.
- Winamax available : `865 / 865`.
- Winamax upcoming aujourd’hui : `142`.
- Winamax completed historique présent : `273`.

Répartition par sport :

| Sport | Total live | Aujourd’hui |
|---|---:|---:|
| football | 462 | 104 |
| tennis | 283 | 16 |
| baseball | 48 | 23 |
| basketball | 38 | 5 |
| hockey | 29 | 3 |
| golf | 2 | 0 |
| mma | 2 | 0 |
| racing | 1 | 0 |

Répartition par date clé dans `data.days` :

| Date | Events |
|---|---:|
| 2026-04-21 | 10 |
| 2026-04-22 | 38 |
| 2026-04-23 | 39 |
| 2026-04-24 | 56 |
| 2026-04-25 | 142 |
| 2026-04-26 | 151 |
| 2026-04-27 | 102 |
| 2026-04-28 | 25 |
| 2026-04-29 | 69 |
| 2026-04-30 | 24 |
| 2026-05-01 | 54 |
| 2026-05-02 | 136 |
| 2026-05-03 | 19 |

## Couverture marchés Winamax live

| Marché / champ | Count |
|---|---:|
| `winamax.match_id` | 412 |
| `winamax.tournament` | 412 |
| `winamax.markets` any | 377 |
| `winamax.markets["1n2"]` | 377 |
| `winamax.markets.ou25` | 0 |
| `winamax.markets.btts` | 0 |
| `winamax.markets.handicap` | 0 |

Interprétation :

- Le site est bien Winamax-only.
- Les vrais marchés récupérés sont encore quasi uniquement `1N2`.
- Le multi-marché `_agentBestPick` existe côté front, mais O/U 2.5 et BTTS n’ont pas de cotes live injectées, donc l’agent ne peut pas vraiment les jouer.

Exemples live avec marchés :

- `New York Knicks at Atlanta Hawks`, NBA, `match_id=70505060`, 1N2 `{home: 3.4, away: 1.17}`.
- `Buffalo Sabres at Boston Bruins`, NHL, `match_id=70558066`, 1N2 `{home: 2.15, draw: 3.75, away: 2.25}`.
- `Cleveland Cavaliers at Toronto Raptors`, NBA, `match_id=70505094`, 1N2 `{home: 2.3, away: 1.6}`.

## Couverture signaux live

Signaux sur tous les events :

| Signal | Count |
|---|---:|
| `form_stats` | 311 |
| `elo` | 193 |
| `injuries` | 40 |
| `lineups` | 7 |
| `referee` | 4 |
| `weather` | 0 |
| `h2h` | 0 |
| `tips` | 0 |
| `odds_snapshot` | 0 |
| `closing_odds` | 0 |

Signaux aujourd’hui :

| Signal | Count |
|---|---:|
| `form_stats` | 108 |
| `elo` | 50 |
| `injuries` | 15 |
| `lineups` | 4 |
| `referee` | 3 |
| `weather` | 0 |
| `h2h` | 0 |
| `tips` | 0 |
| `odds_snapshot` | 0 |

Champs intéressants détectés dans les events live :

```json
{
  "competitor.elo": 324,
  "competitor.form_stats": 567,
  "competitor.injuries": 80,
  "competitor.lineup": 14,
  "injuries_away": 40,
  "injuries_away_known": 40,
  "injuries_home": 40,
  "injuries_home_known": 40,
  "injuries_source": 40,
  "odds": 865,
  "referee": 4,
  "winamax": 865
}
```

Interprétation :

- Le modèle peut déjà exploiter forme récente, Elo, blessures sur une partie non négligeable du foot.
- La météo est complètement absente (`weather.json` a `matches=0`).
- H2H et tips sont absents du live au moment du scan alors que des fetchers/workflows existent.
- À prioriser : une page ou un bloc “qualité data du pick” qui explique combien de signaux réels sont présents avant de recommander une mise.

## Annexes live

| Fichier | generated_at | Count principal |
|---|---|---:|
| `winamax_catalog.json` | 2026-04-25T23:02:42.184449Z | 114 tournaments |
| `winamax_markets.json` | 2026-04-25T23:02:42.189013Z | 747 matches |
| `weather.json` | 2026-04-25T23:03:24.173178+00:00 | 0 matches |
| `referees_soccer.json` | 2026-04-23T11:13:28.445977+00:00 | 28 events |
| `lineups_soccer.json` | 2026-04-23T06:49:52.262367Z | 39 events |
| `injuries_soccer.json` | 2026-04-23T06:48:46.686074Z | 93 teams / 96 scanned |
| `team_stats.json` | 2026-04-25T20:48:39.401100+00:00 | 338 teams |
| `clubelo.json` | 2026-04-25T22:54:16.598254+00:00 | 630 clubs |

## GitHub actuel

Derniers commits API :

| SHA | Date UTC | Message |
|---|---|---|
| `3e8cd7c` | 2026-04-25T23:03:30Z | data: auto-refresh 2026-04-25 23:03 UTC |
| `1d2d85b` | 2026-04-25T23:02:11Z | fix(tous) + feat(archive) + refactor(mesparis): four follow-up fixes |
| `f5696b9` | 2026-04-25T22:57:22Z | data: auto-refresh 2026-04-25 22:57 UTC |

Derniers runs GitHub Actions :

| Workflow | Conclusion | Run |
|---|---|---|
| pages build and deployment | success | https://github.com/Harotensnor/paris-sportif/actions/runs/24942779230 |
| smoke-e2e | failure | https://github.com/Harotensnor/paris-sportif/actions/runs/24942757609 |
| lighthouse | success | https://github.com/Harotensnor/paris-sportif/actions/runs/24942757579 |

Échec `smoke-e2e` :

- Run : `24942757609`.
- Job : `smoke`.
- Étape échouée : `Run smoke`.
- Les logs publics ne sont pas téléchargeables sans droits admin (`403 Must have admin rights to Repository`).
- URL job : https://github.com/Harotensnor/paris-sportif/actions/runs/24942757609/job/73039061435

## Workflows GitHub actuels

Récupérés depuis le repo GitHub main :

- `backtest.yml`
- `e2e.yml`
- `lighthouse.yml`
- `refresh.yml`
- `smoke.yml`

Points notables du `refresh.yml` live :

- Schedule every 5 min de 10-23 UTC.
- Schedule every 30 min de 0-9 UTC.
- `snapshot_results.py` archive les matchs complétés dans `results_archive.jsonl`.
- `fetch_winamax_catalog.py` tourne à chaque tick.
- `fetch_v3.py` tourne à cadence horaire.
- Beaucoup d’étapes restent en `|| true`, donc une erreur fetch peut être masquée.

Point important : le workflow local `.github/workflows/refresh.yml` n’est pas la version live actuelle. Le live a des fichiers et étapes absents du dossier local.

## Inventaire repo GitHub main actuel

Root GitHub main : 45 entrées.

Fichiers live importants absents ou pas à jour localement :

- `.gitattributes`
- `data_manifest.json`
- `data_today.json`
- `health.json`
- `robots.txt`
- `sitemap.xml`
- `package.json`
- `playwright.config.js`
- `backtest_report_v2.json`
- `backtest_report_v2.md`
- `results_archive.jsonl`
- `team_form.json`
- `winamax_my_bets.json`
- `docs/`
- `tests/critical-flows.spec.js`

Scripts GitHub main actuels : 44 scripts.

Liste scripts live :

```text
backfill_odds.py, backtest_baselines.py, backtest_v2.py, build_health.py,
fetch_clubelo.py, fetch_forebet.py, fetch_h2h.py, fetch_injuries.py,
fetch_injuries_soccer.py, fetch_lineups_soccer.py, fetch_live.py,
fetch_referees_soccer.py, fetch_rus_odds.py, fetch_team_form.py,
fetch_team_stats.py, fetch_tennis_odds.py, fetch_tips.py, fetch_v3.py,
fetch_weather.py, fetch_winamax_catalog.py, fetch_winamax_markets.py,
finalize_inline.py, import_winamax_account.py, model_loader.py,
patch_clubelo.py, patch_injuries_soccer.py, patch_lineups_soccer.py,
patch_odds.py, patch_referees_soccer.py, patch_team_form.py,
patch_team_stats.py, patch_weather.py, patch_winamax.py,
patch_winamax_markets.py, push_my_bets.bat, setup_winamax_task.bat,
setup_winamax_task.ps1, smoke_e2e.js, snapshot_odds.py,
snapshot_results.py, winamax_cookie_extractor.py,
winamax_cookie_via_cdp.py, winamax_map.py, winamax_v20_decrypt.py
```

Local `scripts/` actuel : 29 scripts. Il manque notamment la nouvelle couche tests/health/archive/compte Winamax.

## État local

`git status` :

```text
## main...origin/main [behind 1009]
 M .github/workflows/refresh.yml
 M scripts/fetch_winamax_catalog.py
 M winamax_catalog.json
?? .claude/
?? AGENTS.md
?? CHANTIER-MULTI-MARCHE.md
?? CLAUDE.md
?? deploy-v20/
?? scripts/fetch_winamax_markets.py
?? scripts/patch_winamax_markets.py
?? winamax_markets.json
```

Dernier commit local :

```text
da73a27 data: auto-refresh 2026-04-22 16:07 UTC
```

Data locale :

- `data.js` generated_at : `2026-04-22T16:05:47.211616Z`.
- Âge au scan : `4738 min`.
- Total events : `843`.

HTML local racine :

- `pronostics.html` : 2,180,952 octets, 9,035 lignes.
- `function predictMatch` : ligne 2868.
- `function openDetail` : ligne 5319.
- `_agentReplay` : absent.
- `_agentBestPick` : absent.
- `_evaluateBestPick` : absent.
- `_dataIsStale` : absent.
- `autoRefreshDoneAt` : absent.

HTML `deploy-v20` :

- `deploy-v20/pronostics.html` : 2,518,005 octets, 14,742 lignes.
- `function _agentReplay` : ligne 7556.
- `function _agentBestPick` : ligne 7357.
- `function _evaluateBestPick` : ligne 7397.
- `function _agentPauseStatus` : ligne 7456.
- `_dataIsStale` : ligne 7714.
- `autoRefreshDoneAt` : absent.
- Donc `deploy-v20` est v28.10, pas v30.

Service worker local :

- Racine `sw.js` : `paris-sportif-v6-2026-04-22-rrxx`.
- `deploy-v20/sw.js` : `paris-sportif-v57-2026-04-23-v28.10-perf-stale-plus-undo-reset`.
- Live `sw.js` : `paris-sportif-20260425-230329`.

## Vérifications exécutées localement

Syntaxe JS :

- `pronostics.html` local racine : OK, 2 scripts inline.
- `deploy-v20/pronostics.html` : OK, 6 scripts inline.

Syntaxe Python :

- `scripts/*.py` local : OK, 29 fichiers compilent.

Limite : le navigateur Playwright local n’a pas pu être lancé dans ce runtime sans installer Chromium, mais GitHub main a maintenant `smoke.yml`, `e2e.yml`, `lighthouse.yml`.

## Risques techniques prioritaires

### 1. Risque de downgrade par deploy local

`deploy-v20/DEPLOY-V20.bat` pousse `deploy-v20/pronostics.html` et `deploy-v20/sw.js` vers un fresh clone.

Problème : ces fichiers sont v28.10, alors que le live est v30+.

Action recommandée : remplacer `deploy-v20/pronostics.html` et `deploy-v20/sw.js` par la version live/main actuelle avant tout nouveau deploy manuel, ou refaire la stratégie de deploy autour d’un clone propre.

### 2. Splice fail-open dangereux

`deploy-v20/splice-prono-data.js` :

- Si le bloc `PRONOSTICS_DATA` remote est introuvable, il écrit l’UI locale telle quelle.
- Si l’UI locale n’a pas de bloc data, il écrit aussi l’UI locale.

Action recommandée : fail hard (`process.exit(1)`) et ne jamais écrire `dest` si le bloc data est introuvable. Le fallback actuel peut publier de la data stale.

### 3. Workflow trop permissif

Beaucoup d’étapes `refresh.yml` sont en `|| true`.

Action recommandée : garder `|| true` sur les APIs fragiles, mais ajouter une étape finale `build_health.py` ou assertions :

- `data.generated_at` récent.
- `winamax_available > 0`.
- `markets_1n2 > seuil`.
- `today upcoming > seuil` sauf nuit creuse.
- si `weather.json matches=0`, statut warn explicite.
- si smoke échoue sur push manuel, ne pas ignorer.

### 4. Multi-marché incomplet

Le front sait choisir entre 1N2/O-U/BTTS, mais `winamax_markets.json` live ne fournit que le 1N2.

Action recommandée : finir `fetch_winamax_markets.py` page match detail avec parsing `PRELOADED_STATE` pour O/U 2.5 et BTTS, puis patcher `match.winamax.markets.ou25` et `.btts`.

### 5. Couverture data signaux à rendre visible

Aujourd’hui beaucoup de picks ont un nombre variable de signaux disponibles. Le modèle peut paraître plus sûr qu’il ne l’est.

Action recommandée : ajouter un `data_quality_score` par match et l’afficher partout où une mise est recommandée.

### 6. CI smoke en échec

Dernier run `smoke-e2e` en failure sur le commit manuel `1d2d85b`.

Action recommandée : ouvrir le job GitHub avec les droits repo et corriger l’erreur `scripts/smoke_e2e.js` avant de faire confiance au live.

## Chantiers recommandés pour Claude

Ordre recommandé :

1. Synchroniser le dossier local avec GitHub main actuel, sans perdre les notes `AGENTS.md` / `CLAUDE_HANDOFF_MAX_DATA.md`.
2. Rendre le deploy fail-safe : splice fail-hard, pas de fallback data stale, version SW live.
3. Corriger le `smoke-e2e` failure.
4. Ajouter tests unitaires purs sur `kellyFraction`, `_agentBestPick`, `_evaluateBestPick`, stale guard, kickoff guard.
5. Ajouter `data_quality_score` dans le front et/ou `health.json`.
6. Finir Winamax O/U 2.5 + BTTS.
7. Refondre `openDetail` en onglets Synthèse / Signaux / Cotes / H2H / Historique.
8. Nettoyer les sélecteurs mobiles `nth-child`.

## Notes produit / betting

Le site est déjà utile comme cockpit, mais pour maximiser l’espérance de gain il faut éviter la fausse confiance :

- Ne jamais recommander si data stale.
- Ne jamais forcer une mise minimale si Kelly <= 0.
- Ne pas mélanger bankroll agent et bankroll utilisateur.
- Afficher explicitement quand le pick repose sur peu de signaux.
- Backtester la vraie fonction `predictMatch`, pas une imitation Python.
- Séparer performance modèle, performance marché, et performance staking.

## Données brutes

Les snapshots JSON créés dans le workspace contiennent plus de détails que ce Markdown :

- `claude_handoff_snapshot.json`
- `claude_local_snapshot.json`
- `claude_ci_snapshot.json`
- `claude_workflows_snapshot.json`
- `claude_repo_contents_snapshot.json`

À fournir tels quels à Claude si possible.

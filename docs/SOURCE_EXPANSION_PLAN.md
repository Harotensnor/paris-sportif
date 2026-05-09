# Plan d'expansion des sources — 2026-05-09

## Objectif

Augmenter considérablement le nombre de sources de données sur tous les sports,
pour enrichir le modèle de prédiction et exploiter de meilleurs signaux.

## Sources actuelles (baseline)

| Sport | Sources |
|-------|---------|
| Tous | ESPN scoreboard, Winamax catalog, The Odds API |
| Football | Sofascore (lineups/refs/injuries), ClubElo, Football-Data.co.uk, Open-Meteo, Understat/FBref xG, OpenLigaDB, TheSportsDB |
| Basketball | ESPN standings, ESPN team statistics (v51.2 NEW), nba_team_stats |
| Baseball | MLB Stats API (pitchers, ERA, WHIP, K/9) |
| Hockey | NHL API (pace, goalie SV%) |
| Tennis | Jeff Sackmann (Elo + surface Elo + L10 + H2H) |

**Total : ~12 sources actives** sur tous sports.

## Sources à ajouter (par priorité)

### 🟢 NIVEAU 1 — Public, no auth, déjà testé

| Source | Sport | Endpoint | Status |
|--------|-------|----------|--------|
| ESPN team statistics | NBA | `/teams/{id}/statistics` | ✅ v51.2 fait |
| ESPN team statistics | MLB | `/teams/{id}/statistics` | ⏳ à faire |
| ESPN team statistics | NHL | `/teams/{id}/statistics` | ⏳ à faire |
| Baseball Savant | MLB | `/api/leaderboards/...` | ⏳ Statcast pitch-level data |
| MLB Stats API | MLB | extension | ⏳ park factors via `/venues/{id}` |

### 🟠 NIVEAU 2 — Public, no auth, scraping requis

| Source | Sport | URL | Notes |
|--------|-------|-----|-------|
| Basketball Reference | NBA | basketball-reference.com | BPM, VORP, advanced stats |
| Hockey Reference | NHL | hockey-reference.com | RAPM, advanced |
| NaturalStatTrick | NHL | naturalstattrick.com | Goalie advanced ratings |
| MoneyPuck | NHL | moneypuck.com | Expected goals, RAPM |
| Tennis Abstract | Tennis | tennisabstract.com | Match charting deeper data |
| FiveThirtyEight | NBA/NFL | fivethirtyeight.com (legacy) | RAPTOR, ELO ratings |

### 🟡 NIVEAU 3 — Auth/registration required (free tier)

| Source | Sport | Auth | Limit |
|--------|-------|------|-------|
| Football-data.org | Football | API key free | 10 req/min |
| TheSportsDB Premium | Multi | API key | Better limits |
| API-Sports | Multi | Free tier | 100 req/day |

### 🔴 NIVEAU 4 — Paid APIs (pour futur)

| Source | Sport | Coût | ROI |
|--------|-------|------|-----|
| Sportradar | Multi | ~$100/mois | Very high quality |
| Sportmonks | Football | ~€20/mois | Football specialised |
| Opta Sports | Football | $$$ | Industry standard |
| Stats Perform | Multi | $$$$ | Top tier |

## Ce que chaque nouvelle source apporterait au modèle

### Football
- **Transfermarkt** : valeurs marchandes équipes/joueurs → indicateur force latente
- **WhoScored** : ratings post-match → forme intrinsèque par joueur
- **Football-data.org** : meilleures données historiques (vs football-data.co.uk)
- **365scores** : alternate scoreboard pour cross-check
- **Soccerway** : statistiques deeper par compétition

### Basketball
- **Basketball Reference** : BPM/VORP par joueur (pour déduire impact)
- **Cleaning the Glass** : garbage-time excluded stats
- **NBA Stats API** : tracking data (defensive matchups, hustle)

### Baseball
- **Baseball Savant** : Statcast (pitch velocity, exit velo, spin rate, xBA)
- **Fangraphs** : ZIPS projections
- **Park factors database** : précision >> notre table statique

### Hockey
- **MoneyPuck** : expected goals, RAPM, goalie quality
- **NaturalStatTrick** : line-level matchups
- **Hockey Reference** : adj_save_pct, advanced

### Tennis
- **Match Charting Project** : point-by-point depth
- **ATP/WTA officiel** : rankings live, withdrawals
- **Tennis Abstract** : per-surface deeper metrics

## Plan d'exécution (ordonnancement)

### Sprint 1 (cette semaine)
- [x] v51.2 : fetch_nba_advanced.py (ESPN NBA team stats)
- [ ] v51.3 : patch_nba_advanced.py (inject competitor.advanced_stats)
- [ ] v51.4 : predictMatch utilise efg_approx + pace_proxy NBA
- [ ] v51.5 : fetch_mlb_advanced.py (ESPN MLB team stats)
- [ ] v51.6 : fetch_nhl_advanced.py (ESPN NHL + try MoneyPuck)

### Sprint 2 (semaine suivante)
- [ ] Baseball Savant integration (Statcast pitching)
- [ ] Park factors database (vs static map)
- [ ] Tennis ATP/WTA rankings live
- [ ] Football-data.org (registration + integration)

### Sprint 3 (long terme)
- [ ] Transfermarkt RSS scraping (foot injuries + market values)
- [ ] WhoScored ratings (foot post-match)
- [ ] FiveThirtyEight RAPTOR snapshots (NBA monthly)
- [ ] Match Charting Project tennis depth

## Architecture standardisée pour nouveaux fetchers

Pour chaque nouveau fetcher `fetch_<source>.py` :

1. **TTL self-throttle** (`MIN_INTERVAL` constant)
2. **Output schema documenté** dans le docstring (top de fichier)
3. **Fallback merge** si fetch fails (pattern v50.4 merge_existing)
4. **Contract test** entry dans `audit_patch_contracts.py`
5. **Workflow** entry dans `refresh.yml` (avec cadence appropriée)
6. **Allowlist** entry dans `Commit data updates` step

Patcher associé `patch_<source>.py` (si nécessaire) :
- Schéma d'index documenté (par team_id, par event_id, etc.)
- Sport-mismatch guards (cf. v31.7.83)
- Coverage stats dans output

## Métriques de succès

### Court terme (Sprint 1+2)
- [ ] Sources actives : 12 → 18+ (+50%)
- [ ] Signal coverage NBA : 40% → 75%
- [ ] Signal coverage MLB : 60% → 85%
- [ ] Signal coverage NHL : 50% → 75%

### Moyen terme
- [ ] Brier moyen tous sports : 0.224 → 0.210
- [ ] CLV pick-level : -2.5% → 0%
- [ ] Diversité picks (corners, cards, exact_score) : 0% → 25%

### Long terme
- [ ] Sources actives : 18 → 30+
- [ ] Brier < 0.200
- [ ] ROI flat backtest > +5% sur 1000+ picks

---

Document de référence pour planifier l'expansion des sources de données.
À actualiser à chaque ajout de source ou changement de priorité.

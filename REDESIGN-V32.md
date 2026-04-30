# Refonte v32 — Concept

**Date** : 2026-04-30  
**Objectif** : optimiser le site pour l'utilisation réelle de Théo = **gagner de l'argent via paris Winamax**.

## Audit existant (v31.7)

### Hubs et pages actuelles (25+ destinations)

```
picks       → top · valeur · plan-mise · locks · combines · buteurs (6)
agenda      → tous · calendrier · montante-jour/weekend/semaine · matchs · compare (7)
performance → performance · bilan · historique · simulator · credibilite · backtest (6)
account     → profil · favoris · alertes (3)
+ dashboard solo
```

### Points de douleur identifiés

1. **Trop de pages** (25+) qui se chevauchent (top picks ≈ valeur ≈ locks)
2. **Hubs intermédiaires** ajoutent une étape entre l'utilisateur et l'info
3. **Combines/buteurs/montantes** : faible ROI sur le marché Winamax 1N2-only actuel
4. **Calendrier/compare/simulator** : usage rare, complexité élevée
5. **Credibilite/backtest** : info pour les autres, pas pour parier
6. **L'objectif "gagner de l'argent" se perd** dans ce maillage

## Concept v32 — 3 hubs orientés intent

### Hub 1 — **NOW** (landing par défaut)

**Intent** : "Qu'est-ce que je parie *maintenant* ?"

Sections (de haut en bas) :
1. **Pari du moment** — top 1 pick par edge × confidence
   - Match · cote · edge % · stake suggéré
   - 2 raisons clés
   - CTA "Voir sur Winamax" (deep-link)
2. **Picks value** — top 5 secondaires (edge ≥ 5pt)
3. **À surveiller** — picks à kickoff < 2h (live betting heads-up)
4. **Picks de l'agent** — ce que l'agent autonome a parié (transparency)

### Hub 2 — **AGENT** (la cagnotte 10€ autonome)

**Intent** : "Comment va mon agent ?"

Sections :
1. **NAV courant** — gros chiffre + delta jour + delta 7j
2. **Graph 30j ROI** — courbe Kelly cumul
3. **État protections** — drawdown tier · streak count · pause si active
4. **Paris settled aujourd'hui** — list compacte
5. **Top streaks** — wins / loses récents
6. **Bilan complet** (collapsible) — depuis init agent

### Hub 3 — **STATS** (analytics deep-dive)

**Intent** : "Comment performe le modèle ?"

Tabs :
1. **Sports** — WR/ROI par sport (foot, tennis, MLB, NBA, NHL)
2. **Ligues** — top par Kelly cumul, Brier
3. **Calibration** — diagramme reliability + isotonic pairs
4. **Pipeline** — health.json status + freshness data sources
5. **Settings** (en bas) — favoris · alertes · profil

## Navigation

### Bottom bar (mobile + desktop)

```
[ ⚡ Now ]   [ 🤖 Agent ]   [ 📊 Stats ]
```

3 boutons stables, fixed en bas. Plus de sub-menus à tap.

### Top bar

```
[Logo] Pronostics ◯ Frais (3min)         [⟳]
```

- Titre du hub courant
- Indicateur fraîcheur data (vert si <30min, jaune <2h, rouge >2h)
- Bouton refresh manuel

### Suppressions / merges

| Avant | Après |
|---|---|
| picks/top, valeur, plan-mise, locks | → **Now** (unifié) |
| picks/combines, buteurs | → **caché par défaut** (lien depuis Stats si nécessaire) |
| agenda/tous, calendrier, matchs | → **Now > section "À surveiller"** + lien "Voir tous" |
| agenda/montante-jour/weekend/semaine | → **Stats > sub-page "Montantes"** (rarely used) |
| agenda/compare, simulator | → **supprimés** (use case marginal) |
| performance/* | → **Agent** (NAV + bilan) + **Stats** (calibration + backtest) |
| account/profil, favoris, alertes | → **Stats > Settings** |

## Design tokens

Garder l'identité existante :
- `--brand: #a78bfa` (violet)
- `--accent: #10b981` (vert)
- `--danger: #fca5a5` (rouge)
- `--bg: #06070a` (presque noir)
- `--panel: #0a0b10`

Améliorations :
- **Densité** : moins de cartes, plus d'info par carte
- **Mobile-first** : tester chaque page < 360px
- **Tabular-nums** partout sur chiffres
- **Accessibilité** : contrast ratios validés

## Plan d'implémentation

### Phase 1 (commit v31.8.0) — Navigation refactor
- HUB_PAGES réduit à 3 hubs
- Bottom-nav redesigned
- Page-tabs auto-injection adaptée

### Phase 2 (commit v31.8.1) — Page **Now** refondue
- Section "Pari du moment" mise en avant (full-width hero)
- Section "Picks value" simplifiée
- Section "À surveiller" (kickoff imminent)
- CTA Winamax direct

### Phase 3 (commit v31.8.2) — Page **Agent** refondue
- NAV + graph + protections en une vue
- History compacte
- Drilldown détails sur clic

### Phase 4 (commit v31.8.3) — Page **Stats** refondue
- Tabs structurés
- Settings en bas (favoris/alertes/profil)

### Phase 5 (commit v31.8.4) — Modal détail match (#138)
- Tabs : Synthèse / Signaux / Cotes / H2H

### Phase 6 (commit v31.8.5) — Polish
- Loading states
- Empty states
- Error states
- Mobile validation
- Accessibility audit

## Ce qui ne change PAS

- **Helpers métier** : `predictMatch`, `_agentReplay`, `_agentBestPick`, `kellyFraction`, etc.
- **Backend** : tous les scripts Python (`fetch_*`, `patch_*`, `backtest_v2.py`)
- **Workflow CI** : `.github/workflows/refresh.yml` (avec heartbeat v31.7.221)
- **MCP server** : `mcp_paris_sportif.py` + 11 tools
- **Service Worker** : `sw.js` (cache strategy network-first)
- **Convention single-HTML** : pas de bundler, pas de framework

Refonte = **couche présentation uniquement**.

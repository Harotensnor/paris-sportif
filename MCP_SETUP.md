# 🤖 Custom Paris-Sportif MCP server

Un serveur MCP qui expose les helpers du projet Paris-Sportif comme tools Claude.
Permet de demander à Claude (Desktop, Code, web) :

- "Donne-moi 5 picks foot avec edge ≥5% aujourd'hui"
- "Quelle est la performance globale du modèle ?"
- "Le modèle est-il bien calibré ?"
- "Pour le match PSG-Marseille, montre-moi tous les signaux"
- "Si je mise 50€ avec proba 60% et cote 1.85, combien Kelly suggère ?"
- "Le pipeline data fonctionne-t-il ?"

## 🚀 Installation rapide (3 étapes)

### 1. Installer le package `mcp` Python

```bash
pip install mcp
# ou avec CLI utilities
pip install "mcp[cli]"
```

### 2. Tester le serveur localement

```bash
cd C:/Users/bouln/Documents/Claude/Projects/paris-sportif-sprints
python scripts/mcp_paris_sportif.py
```

Si tu vois un message de démarrage MCP sans erreur, c'est OK.

Pour tester un tool spécifique en CLI :

```bash
python -c "
from scripts.mcp_paris_sportif import get_data_freshness
print(get_data_freshness())
"
```

### 3. Ajouter à Claude Desktop

Édite `claude_desktop_config.json` :

- **Windows** : `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS** : `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux** : `~/.config/Claude/claude_desktop_config.json`

Ajoute ou complète :

```json
{
  "mcpServers": {
    "paris-sportif": {
      "command": "python",
      "args": [
        "C:/Users/bouln/Documents/Claude/Projects/paris-sportif-sprints/scripts/mcp_paris_sportif.py"
      ]
    }
  }
}
```

⚠️ **Adapte le chemin absolu** à ton OS (Windows : forward slashes ou `\\`).

Redémarre Claude Desktop. Vérifie que le serveur apparaît dans la palette
des tools MCP (icône 🔌 selon la version).

## 🛠️ Tools exposés

| Tool | Description | Use case |
|---|---|---|
| `get_data_freshness` | Âge des données (Y a-t-il un refresh récent ?) | "Les cotes sont-elles à jour ?" |
| `get_today_matches` | Liste les matchs du jour (filtres : sport, bookable_only) | "Quels matchs ce soir en foot ?" |
| `get_top_value_picks` | Top picks value (proxy d'edge basé sur margin Winamax) | "5 picks edge ≥5% en foot" |
| `get_today_high_confidence` ⭐ | Picks avec proba implicite ≥ X% (favoris solides) | "Quels favoris solides aujourd'hui ?" |
| `get_model_performance` | KPIs globaux + par sport + par tier | "Comment performe le modèle ?" |
| `get_calibration` | Courbe de calibration 10 bins | "Le modèle est bien calibré ?" |
| `get_recent_results` | Derniers picks réglés (W/L/Pending) | "Comment ça s'est passé hier ?" |
| `get_drawdown_status` | État de la cagnotte agent (drawdown/pause) | "L'agent est en pause ?" |
| `get_league_performance` | Top/flop ligues par ROI | "Quelles ligues éviter ?" |
| `search_match` | Recherche par équipe/ligue/ville | "Prochain match du PSG" |
| `evaluate_match_signals` | Tous les signaux d'un match (cotes, blessures, lineup, météo) | "Pour PSG-OM, montre-moi tout" |
| `compute_kelly_stake` | Mise Kelly fractionnée pour un pari | "50€ proba 60% cote 1.85 = ?" |
| `simulate_bet` | Simule l'EV d'un pari donné | "Simule pari sur PSG @1.85" |
| `get_health_status` | État du pipeline (sources OK/dégradées/KO) | "Le pipeline tourne ?" |
| `get_pipeline_status` ⭐ | Détail sources + events ESPN/Sofa/Winamax | "Combien d'events fetched ?" |
| `list_data_gaps` ⭐ | Matchs avec signaux manquants (clubelo/h2h/weather/etc.) | "Pourquoi tel match a peu de confiance ?" |
| `list_sports_available` | Stats sports avec matchs aujourd'hui | "Quels sports aujourd'hui ?" |
| `get_market_calibration_summary` | Perfo par type de marché (1N2/OU/BTTS) | "Quel marché est le plus rentable ?" |

⭐ = ajouté en v33.13-v33.20.

## ⚠️ Limites importantes

**Le MCP n'execute pas le vrai `predictMatch()`** (qui tourne en JS dans le browser).
- `get_top_value_picks` utilise une **heuristique proxy** basée sur la marge bookmaker
- Pour les vrais picks calibrés, l'utilisateur doit consulter le site

**Pas d'écriture** :
- Le MCP est read-only sur les fichiers JSON
- Il NE déclenche PAS de paris (pas de bridge Winamax)
- Il NE modifie PAS la configuration localStorage du browser

## 🧪 Exemples de prompts Claude

Une fois le MCP installé, tu peux demander :

```
> Donne-moi un résumé de la performance du modèle, avec les sports
  où il est le plus rentable.

> Cherche le prochain match du PSG et liste tous les signaux disponibles.

> Compute Kelly pour : prob 0.62, cote 1.85, bankroll 100€.

> Y a-t-il des problèmes de pipeline data ?

> Quels sont les 3 meilleurs picks value en tennis aujourd'hui ?
```

## 🔧 Extension future

Tools possibles à ajouter (dans `mcp_paris_sportif.py`) :

- `run_backtest(sport, period)` : déclenche `python scripts/backtest_v2.py` et renvoie résumé
- `get_user_bets()` : lit les paris user trackés (depuis localStorage… mais MCP ne lit pas browser)
- `compute_correlation(match_a_id, match_b_id)` : check si 2 picks sont corrélés
- `simulate_kelly_growth(days, kelly_frac)` : projection bankroll Monte-Carlo

Pour ajouter un tool, copy-paste un `@mcp.tool()` existant dans le fichier
et redémarre Claude Desktop.

## 🧪 Test smoke (v33.22)

Avant de commit des changements à `mcp_paris_sportif.py`, lance le smoke test :

```bash
python scripts/test_mcp_smoke.py
```

Il appelle automatiquement les 14 tools default-callable et signale toute
régression silencieuse (helpers renommés, clés inexistantes, etc.). Tourne
en quelques secondes.

## 🐛 Troubleshooting

### "ModuleNotFoundError: No module named 'mcp'"

```bash
pip install mcp
# Si toujours en erreur, essaie :
python -m pip install mcp
```

### Tools n'apparaissent pas dans Claude Desktop

1. Vérifie le chemin absolu dans `claude_desktop_config.json`
2. Vérifie que `python` est dans le PATH (`python --version`)
3. Restart complet de Claude Desktop (quit + relaunch)
4. Check les logs Claude Desktop : `%APPDATA%\Claude\logs\` (Windows)

### Performance lente sur `get_top_value_picks`

Le tool parse `data.js` (~1.3 MB) à chaque appel. Pour optimiser :
- Réduire `limit` (default 10)
- Ajouter `sport='football'` pour filtrer

## 📚 Voir aussi

- [MCP Spec](https://modelcontextprotocol.io)
- [FastMCP docs](https://github.com/modelcontextprotocol/python-sdk)
- [Project README](./README.md)
- [Project CLAUDE.md](./CLAUDE.md)

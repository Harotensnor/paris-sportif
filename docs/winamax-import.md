# Importer ses paris Winamax dans le site

## Pourquoi

Le site affiche par défaut le bilan du **modèle** (qu'est-ce que les pronos
auraient rapporté si on les avait tous joués flat 1u). Mais ce qui t'intéresse
vraiment c'est le bilan de **TES paris réels** : combien tu as misé, combien
tu as gagné/perdu, ROI réel.

Le pipeline GitHub Actions ne peut pas accéder à ton compte Winamax (pas
authentifié), donc on importe via un script local qui tourne sur ton PC.

## Privacy

⚠️ **Les paris perso restent en LOCAL.** Le fichier `winamax_my_bets.json`
est dans `.gitignore` donc jamais committé. Conséquence : la fonctionnalité
**ne marche que sur localhost** (via `python serveur.py`), **pas** sur la
version GitHub Pages.

## Installation (one-shot, ~2 minutes)

### 1. Connecte-toi sur Winamax dans ton navigateur

Va sur [winamax.fr](https://www.winamax.fr) et connecte-toi normalement.

### 2. Récupère ton cookie de session

1. Ouvre les DevTools (F12 ou Cmd+Opt+I).
2. Onglet **Application** (Chrome) ou **Stockage** (Firefox).
3. Dans le panneau gauche, déplie **Cookies** → clique sur `https://www.winamax.fr`.
4. Cherche un cookie nommé `API_SESS` (ou `PHPSESSID` ou `sessionId`).
5. Copie sa **valeur** (longue chaîne aléatoire).

### 3. Crée le fichier `.winamax_session`

À la racine du projet (au même niveau que `pronostics.html`), crée un fichier
nommé `.winamax_session` (avec le point au début) et colle-y la valeur du
cookie sur **une seule ligne**, sans guillemets.

```
abc123def456...           # valeur du cookie
```

### 4. Installe les dépendances Python

```bash
pip install curl_cffi beautifulsoup4 --break-system-packages
```

### 5. Lance le script

```bash
python scripts/import_winamax_account.py
```

Si tout va bien, tu devrais voir :

```
[winamax_import] [15:30:00] starting (cookie len=64)
  history: 152 bets parsed from https://www.winamax.fr/account/history.php
  pending: 4 bets parsed from https://www.winamax.fr/account/pendingbets.php
[winamax_import] [15:30:03] done in 3.2s
  → 156 paris écrits dans winamax_my_bets.json
  → 89W / 67L / 4P · ROI 12.34%
```

### 6. Recharge le site

`http://localhost:8765/pronostics.html` → page **Bilan** → la section
"🎯 Mes paris Winamax · importés" affiche tes vrais paris avec :

- 🔒 barre jaune = lock du modèle (haute confiance)
- 🟢 barre verte = pick standard du modèle
- 🟡 barre rouge = low conf
- ⚪ barre grise = pari hors modèle (avant activation, ou non matché)

### 7. Définis ta date d'activation modèle

Sur la page Bilan, clique sur **⚙️ Définir date activation modèle**. Saisis
la date à partir de laquelle tu utilises mes pronos (les paris avant ne sont
pas évalués comme "perf modèle").

## Automatisation (optionnel)

### Windows : Planificateur de tâches

1. Win+R → `taskschd.msc`
2. **Créer une tâche** :
   - Nom : `Paris Sportif — Import Winamax`
   - Trigger : Quotidien à 23h00 (par exemple)
   - Action : `python.exe scripts/import_winamax_account.py`
   - Démarrer dans : `C:\Users\bouln\Documents\Claude\Projects\Paris-Sportif`
3. Le bilan sera frais le lendemain matin.

### macOS / Linux : cron

```bash
# Tous les jours à 23h
0 23 * * * cd /path/to/paris-sportif && python scripts/import_winamax_account.py
```

## Quand le cookie expire

Sessions Winamax durent ~30 jours. Quand le script te dit
`Redirigé vers login — ton cookie a expiré`, refais les étapes 1-3.

## Limitations connues

- **Combinés systèmes** : extrayés mais pas encore parfaitement décomposés
  par leg dans la UI.
- **Live bets** : capturés au moment du run, mais le statut peut bouger.
- **Structure HTML changeante** : Winamax peut casser le parser. Si le
  script extrait 0 paris, vérifie le dossier `.winamax_raw/` pour adapter
  les sélecteurs dans `import_winamax_account.py` (`_extract_bets_from_html`).

## Combinés : que fait le modèle ?

Le site génère ses propres suggestions de combinés (page **Combinés**) en
sélectionnant des picks anti-corrélés haute confiance. Une fois les paris
importés, on peut détecter :
- Combien de **TES** combinés étaient-ils alignés avec les suggestions du modèle ?
- ROI réel des combinés que tu as joués vs simples
- Lesquels auraient été couverts par un combiné modèle ?

Cette analyse est progressive : plus tu joues de combinés, plus la stat
devient pertinente (>10 combinés réglés minimum recommandé).

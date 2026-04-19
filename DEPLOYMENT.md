# Déployer le dashboard en ligne (automatique)

Objectif : transformer ton dashboard local en site web accessible partout
(iPhone inclus), rafraîchi automatiquement toutes les 10 minutes, sans avoir
à lancer quoi que ce soit sur ton Mac.

## Architecture

```
  GitHub repo (code + data.js)
        │
        │ cron toutes les 10 min
        ▼
  GitHub Actions
    ├─ lance fetch_live / patch_odds / fetch_injuries / patch_winamax
    └─ commit data.js + pronostics.html
        │
        ▼
  Cloudflare Pages (auto-déploie à chaque commit)
        │
        ▼
  https://paris-sportif.theoboulnois.pages.dev  ← ton site live
```

## Étapes

### 1. Créer le repo GitHub

Depuis le terminal, à la racine du dossier Paris-Sportif :

```bash
cd "$HOME/Paris-Sportif"   # ou le chemin réel
git init
git add .
git commit -m "initial import"
gh repo create paris-sportif --private --source=. --remote=origin --push
```

(Besoin de `gh` : `brew install gh && gh auth login`.)

### 2. Activer Cloudflare Pages

1. Compte gratuit sur [pages.cloudflare.com](https://pages.cloudflare.com)
2. **Create project → Connect to Git → sélectionne `paris-sportif`**
3. Build settings :
   - Framework : **None**
   - Build command : *(laisser vide)*
   - Output directory : `.`
4. **Save and Deploy**

Ton site est live sur `paris-sportif.pages.dev` dans ~1 min.

**Alternative plus simple** : Netlify ou GitHub Pages, même principe.

### 3. Le cron tourne tout seul

Le fichier `.github/workflows/refresh.yml` est déjà configuré :
- toutes les 10 minutes : `fetch_live + patch_odds + patch_winamax`
- toutes les 60 minutes : `fetch_v3` (full sweep) pour les jours futurs
- commit → push → Cloudflare redéploie → ton site est à jour

### 4. Vérifier

- Regarde l'onglet **Actions** de ton repo GitHub : les workflows doivent tourner toutes les 10 min
- Regarde `generated_at` dans `data.js` : il doit être récent

## Coûts

- GitHub Actions : 2 000 min/mois gratuits → largement suffisant (6 min/h × 24h × 30j = 4 320 min, mais nos jobs font ~15s chacun donc on consomme ~72 min/mois)
- Cloudflare Pages : 500 builds/mois gratuits → 10 min × 6 × 24h = 144 builds/jour × 30j = 4 320 builds/mois. **Trop**.

**Solution** : le workflow ne push que si `data.js` a changé (déjà fait). Et si besoin de réduire les builds, passer le cron à toutes les 15 ou 20 min.

OU : bascule sur Netlify (gratuit sans limite de builds statiques) ou sur
Vercel (limite 100 builds/jour hobby).

## Domaine custom (optionnel)

Si tu veux `paris.theoboulnois.com` :
1. Dans Cloudflare Pages → Custom domains → ajoute le domaine
2. Dans ton registrar DNS, ajoute un `CNAME` vers `paris-sportif.pages.dev`

## Bascule au mode online

Sur ton Mac, une fois le site déployé, tu n'as plus besoin de `LANCER.command`
pour voir les données à jour : ouvre simplement `https://...pages.dev` sur
ton iPhone ou ton Mac.

Tu peux garder `LANCER.command` pour du dev local.

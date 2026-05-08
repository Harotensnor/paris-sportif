#!/usr/bin/env bash
# AUDIT 2026-05-08 v40 — Purge winamax_markets.json de l'historique git.
#
# DESTRUCTIF — RÉÉCRIT TOUTES LES SHAS, NÉCESSITE FORCE-PUSH.
# À exécuter UNE SEULE FOIS, après que le commit "v40 externalisation"
# soit mergé sur main (cron + frontend lisent depuis Release/.gz).
#
# Pourquoi ce script :
# - winamax_markets.json (~90 MB) a été commité 5000+ fois entre v1 et v40
# - L'objet pack git pèse ~3.7 GB (mesure 2026-05-08, 4826 commits)
# - Après purge attendu : ~200-400 MB (×10 réduction)
# - Tous les clones existants doivent être re-clonés après ce script
#
# Pré-requis :
#   pip install --user git-filter-repo
#   ou
#   pip install git-filter-repo --break-system-packages
#
# Usage (depuis le repo principal, PAS un worktree) :
#   bash scripts/purge_winamax_history.sh
#
# Le script :
#   1. Vérifie qu'on n'est pas dans un worktree
#   2. Crée une tag de backup `pre-purge-v40-YYYYMMDD-HHMMSS` localement
#    (peut être pushée si voulu : git push origin pre-purge-v40-...)
#   3. Lance git filter-repo --invert-paths --path winamax_markets.json
#   4. Affiche la nouvelle taille du repo
#   5. Ajoute le remote origin (filter-repo le supprime par sécurité)
#   6. Demande confirmation avant force-push
#
# Côté GitHub Actions : le prochain run cron prendra le commit le plus
# récent du nouveau historique. Pas d'action requise si la branche `main`
# a été force-pushée correctement.

set -euo pipefail

# AUDIT — Garde-fou : ne pas tourner depuis un worktree (filter-repo peut
# laisser le worktree dans un état invalide).
if git rev-parse --git-common-dir 2>/dev/null | grep -q "worktrees"; then
  echo "ERREUR : ce script doit tourner depuis le repo principal, pas un worktree."
  echo "         (git common-dir contient 'worktrees')"
  exit 1
fi

if [ ! -d ".git" ] || [ -f ".git" ]; then
  echo "ERREUR : ce script doit tourner depuis la racine du repo principal."
  echo "         Trouvé .git=$(stat -c%F .git 2>/dev/null || echo 'inconnu')"
  exit 1
fi

REMOTE_URL=$(git config --get remote.origin.url || echo "")
if [ -z "$REMOTE_URL" ]; then
  echo "ERREUR : remote 'origin' introuvable."
  exit 1
fi

# Backup tag
BACKUP_TAG="pre-purge-v40-$(date -u +'%Y%m%d-%H%M%S')"
echo ""
echo "======================================================================="
echo "  PURGE winamax_markets.json — Historique git"
echo "======================================================================="
echo "Remote     : $REMOTE_URL"
echo "Backup tag : $BACKUP_TAG"
echo "Repo size  (avant) : $(du -sh .git 2>/dev/null | cut -f1)"
echo ""
echo "Cette opération :"
echo "  - réécrit toutes les SHAs des commits qui ont touché winamax_markets.json"
echo "  - supprime ~3.5 GB de l'historique git"
echo "  - INVALIDE tous les clones existants (chacun doit re-clone)"
echo ""
read -r -p "Continuer ? Tape 'PURGE' (majuscule) pour confirmer : " confirm
if [ "$confirm" != "PURGE" ]; then
  echo "Annulé."
  exit 0
fi

echo ""
echo "[1/5] Création du tag de backup..."
git tag "$BACKUP_TAG"
echo "      Tag local : $BACKUP_TAG"
echo "      Pour le push remote : git push origin $BACKUP_TAG"

echo ""
echo "[2/5] Lancement git filter-repo (peut prendre 1-3 min)..."
git filter-repo --invert-paths --path winamax_markets.json --force

echo ""
echo "[3/5] Garbage collection agressif..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "[4/5] Restauration du remote origin (filter-repo le retire par sécurité)..."
git remote add origin "$REMOTE_URL"

echo ""
echo "Repo size  (après) : $(du -sh .git 2>/dev/null | cut -f1)"
echo ""
read -r -p "[5/5] Force-push origin main ? Tape 'PUSH' pour confirmer : " confirm_push
if [ "$confirm_push" != "PUSH" ]; then
  echo "Force-push annulé. Tu peux le faire plus tard :"
  echo "  git push --force-with-lease origin main"
  echo "  git push origin $BACKUP_TAG  # safety tag"
  exit 0
fi

git push --force-with-lease origin main
git push origin "$BACKUP_TAG"
echo ""
echo "OK — main et backup tag pushés. Tous les clones existants doivent re-cloner."

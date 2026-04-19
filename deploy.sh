#!/usr/bin/env bash
# Déploiement one-shot vers GitHub Pages
# Usage : ./deploy.sh <GITHUB_PAT>
#
# Prérequis : générer un PAT ici → https://github.com/settings/tokens/new
#   Scopes requis : repo, workflow
#   Expiration : ce que tu veux (90 jours suffit)
#
# Ce script :
#   1. crée le repo public theoboulnois/paris-sportif sur GitHub
#   2. push tout le code
#   3. active GitHub Pages (source = branch main, dossier racine)
#   4. affiche l'URL live

set -euo pipefail

PAT="${1:?Usage: ./deploy.sh <GITHUB_PAT>}"
USER="theoboulnois"
REPO="paris-sportif"

echo "→ Création du repo GitHub ${USER}/${REPO}…"
HTTP_CODE=$(curl -s -o /tmp/gh_create.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${PAT}" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"${REPO}\",\"private\":false,\"description\":\"Dashboard paris sportifs — Winamax first\",\"has_issues\":false,\"has_wiki\":false}")

if [ "$HTTP_CODE" = "201" ]; then
  echo "  ✓ repo créé"
elif [ "$HTTP_CODE" = "422" ]; then
  echo "  ⚠ repo existe déjà — on continue"
else
  echo "  ✗ erreur HTTP $HTTP_CODE :"
  cat /tmp/gh_create.json
  exit 1
fi

echo "→ Configuration du remote…"
git remote remove origin 2>/dev/null || true
git remote add origin "https://${PAT}@github.com/${USER}/${REPO}.git"

echo "→ Push du code…"
git push -u origin main --force

echo "→ Activation de GitHub Pages…"
HTTP_CODE=$(curl -s -o /tmp/gh_pages.json -w "%{http_code}" \
  -X POST \
  -H "Authorization: Bearer ${PAT}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${USER}/${REPO}/pages" \
  -d '{"source":{"branch":"main","path":"/"}}')

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "409" ]; then
  echo "  ✓ Pages activé"
else
  echo "  ⚠ code $HTTP_CODE (peut être déjà actif) :"
  cat /tmp/gh_pages.json
fi

echo "→ Autoriser GitHub Actions à pousser des commits…"
curl -s -X PUT \
  -H "Authorization: Bearer ${PAT}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${USER}/${REPO}/actions/permissions/workflow" \
  -d '{"default_workflow_permissions":"write","can_approve_pull_request_reviews":false}' \
  > /dev/null
echo "  ✓ workflow permissions = write"

echo ""
echo "✅ DÉPLOIEMENT TERMINÉ"
echo ""
echo "   Repo        : https://github.com/${USER}/${REPO}"
echo "   Site live   : https://${USER}.github.io/${REPO}/"
echo "   Actions     : https://github.com/${USER}/${REPO}/actions"
echo ""
echo "Le premier déploiement prend ~1 min. Ensuite le cron tourne toutes"
echo "les 10 min et ton site se met à jour tout seul."
echo ""
# scrub le PAT du remote pour qu'il ne reste pas sur le disque
git remote set-url origin "https://github.com/${USER}/${REPO}.git"
echo "(PAT retiré du remote git local)"

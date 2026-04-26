#!/usr/bin/env bash
# safe-push.sh — Push to main with conflict-marker safety net.
#
# Cette session a vu 4-5 cas où un rebase a laissé des conflict markers
# (<<<<<<<, =======, >>>>>>>) dans des fichiers commités. Ce script :
#   1. Vérifie absence de markers AVANT toute opération
#   2. Tente le push direct ; si rejet (cron a avancé main) :
#   3. Fetch + rebase avec --autostash
#   4. Si conflits : applique stratégie 'theirs' uniquement sur les fichiers
#      régénérés par le cron (data.js, feed.xml, pronostics.html LITE blob,
#      data_today.json, data_manifest.json, health.json) — mais préserve
#      nos edits sur les autres
#   5. Re-vérifie absence de markers après rebase
#   6. Push (jusqu'à 3 retries)
#
# Usage : ./safe-push.sh [branch-name]
# Default branch : current branch
set -e

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"

# Step 1 : pre-flight conflict marker check
echo "[safe-push] Pre-flight conflict marker check..."
if ! python3 scripts/check_no_conflict_markers.py >/dev/null 2>&1; then
  echo "[safe-push] FAIL : conflict markers detected locally. Resolve before push."
  python3 scripts/check_no_conflict_markers.py
  exit 1
fi

# Step 2-6 : push with rebase loop
for attempt in 1 2 3; do
  echo "--- attempt $attempt ---"
  out=$(git push origin "$BRANCH:main" 2>&1)
  echo "$out" | tail -3
  if echo "$out" | grep -qE '^To '; then
    echo "[safe-push] OK pushed."
    # Final post-push sanity
    if ! python3 scripts/check_no_conflict_markers.py >/dev/null 2>&1; then
      echo "[safe-push] WARN : conflict markers found AFTER push (race?). Re-check."
      python3 scripts/check_no_conflict_markers.py
    fi
    exit 0
  fi
  if echo "$out" | grep -qE 'rejected|hint:'; then
    echo "[safe-push] Rejected (cron advanced main). Fetching + rebasing..."
    git fetch origin main 2>&1 | tail -1
    # Stash any uncommitted changes
    if ! git diff --quiet || ! git diff --cached --quiet; then
      git stash push -u -m "safe-push autostash $(date +%s)" >/dev/null 2>&1
      DID_STASH=1
    else
      DID_STASH=0
    fi
    if git rebase origin/main 2>&1 | grep -q CONFLICT; then
      # Auto-resolve : take origin (theirs in rebase mode = origin/main)
      # ONLY for cron-regenerated files. Our edits on these are bound to
      # be overwritten by the next cron tick anyway.
      for f in data.js pronostics.html feed.xml data_today.json data_manifest.json health.json; do
        if [ -f "$f" ] && git ls-files --unmerged "$f" 2>/dev/null | grep -q .; then
          git checkout --theirs "$f"
          git add "$f"
        fi
      done
      # If anything still unmerged, abort and ask for manual resolution
      if git ls-files --unmerged 2>/dev/null | grep -q .; then
        echo "[safe-push] FAIL : non-cron files still unmerged. Manual resolution needed:"
        git status --short
        git rebase --abort 2>/dev/null
        [ "$DID_STASH" = "1" ] && git stash pop >/dev/null 2>&1
        exit 1
      fi
      # Continue rebase
      GIT_EDITOR=true git rebase --continue 2>&1 | tail -2
    fi
    [ "$DID_STASH" = "1" ] && git stash pop >/dev/null 2>&1
    # Final marker check before retrying push
    if ! python3 scripts/check_no_conflict_markers.py >/dev/null 2>&1; then
      echo "[safe-push] FAIL : conflict markers after rebase resolution. Aborting."
      python3 scripts/check_no_conflict_markers.py
      exit 1
    fi
  else
    echo "[safe-push] Unknown error. Aborting."
    exit 1
  fi
done
echo "[safe-push] FAIL after 3 attempts."
exit 1

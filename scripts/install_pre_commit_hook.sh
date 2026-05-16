#!/bin/bash
# Installer le pre-commit hook qui valide JS+Python syntax avant chaque commit.
# v50.7 — Audit 2026-05-09 : v49.9 a déployé une SyntaxError pendant 30 min de
# downtime. Pre-commit hook détecte localement ce genre de bug avant push.
#
# Usage :
#   bash scripts/install_pre_commit_hook.sh
#
# Désactiver temporairement : git commit --no-verify

set -e
cd "$(git rev-parse --show-toplevel)"

HOOK_PATH=".git/hooks/pre-commit"

cat > "$HOOK_PATH" <<'EOF'
#!/bin/bash
set -e
cd "$(git rev-parse --show-toplevel)"

# Sprint 71 — Detection robuste python3 / python.
# Sur Windows, `python3` est souvent un faux raccourci Microsoft Store qui
# affiche "Python est introuvable" et bloque le commit. On detecte le binaire
# Python reel en testant `--version` (le faux raccourci fail, le vrai marche).
PY=""
for candidate in python3 python; do
  if command -v "$candidate" >/dev/null 2>&1; then
    if "$candidate" --version >/dev/null 2>&1; then
      PY="$candidate"
      break
    fi
  fi
done
if [ -z "$PY" ]; then
  echo "[pre-commit] WARNING: aucun binaire python3/python fonctionnel trouve. Python checks skipes." >&2
fi

# 1. JS syntax check sur les bundles critiques (5s)
echo "[pre-commit] node --check JS bundles..."
for f in legacy-app.js app.js sw.js app-enhancements.js app-i18n.js; do
  if [ -f "$f" ]; then
    if ! node --check "$f" 2>&1; then
      echo "[pre-commit] FAIL: $f has syntax error" >&2
      echo "[pre-commit] commit aborted. fix syntax then retry." >&2
      exit 1
    fi
  fi
done
echo "[pre-commit] OK JS syntax"

# 2. Python syntax check sur scripts modifiés (3s)
PYTHON_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '^scripts/.*\.py$' || true)
if [ -n "$PYTHON_FILES" ] && [ -n "$PY" ]; then
  echo "[pre-commit] $PY ast.parse on modified scripts..."
  for f in $PYTHON_FILES; do
    if ! "$PY" -c "import ast; ast.parse(open('$f', encoding='utf-8').read())" 2>&1; then
      echo "[pre-commit] FAIL: $f has syntax error" >&2
      exit 1
    fi
  done
  echo "[pre-commit] OK Python syntax"
fi

# 3. Audit patch contracts si patch_all_quick.py changé
if [ -n "$PY" ] && echo "$PYTHON_FILES" | grep -q 'patch_all_quick\|patch_winamax'; then
  echo "[pre-commit] contract audit (patcher modifié)..."
  "$PY" scripts/audit_patch_contracts.py 2>&1 | tail -3 || true
fi

echo "[pre-commit] OK all checks passed"
exit 0
EOF

chmod +x "$HOOK_PATH"
echo "Pre-commit hook installed at $HOOK_PATH"
echo "Test : git commit -m 'test' (will run hook)"
echo "Skip temporairement : git commit --no-verify"

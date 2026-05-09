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
if [ -n "$PYTHON_FILES" ]; then
  echo "[pre-commit] python ast.parse on modified scripts..."
  for f in $PYTHON_FILES; do
    if ! python3 -c "import ast; ast.parse(open('$f').read())" 2>&1; then
      echo "[pre-commit] FAIL: $f has syntax error" >&2
      exit 1
    fi
  done
  echo "[pre-commit] OK Python syntax"
fi

# 3. Audit patch contracts si patch_all_quick.py changé
if echo "$PYTHON_FILES" | grep -q 'patch_all_quick\|patch_winamax'; then
  echo "[pre-commit] contract audit (patcher modifié)..."
  python3 scripts/audit_patch_contracts.py 2>&1 | tail -3 || true
fi

echo "[pre-commit] OK all checks passed"
exit 0
EOF

chmod +x "$HOOK_PATH"
echo "Pre-commit hook installed at $HOOK_PATH"
echo "Test : git commit -m 'test' (will run hook)"
echo "Skip temporairement : git commit --no-verify"

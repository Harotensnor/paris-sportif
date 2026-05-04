#!/usr/bin/env python3
"""Audit Playwright skip usage so critical regressions cannot hide."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TESTS = ROOT / "tests"

# Runtime skips that depend on viewport, missing optional rows, or data volume are
# still tolerated. Critical sync tests must fail instead of silently skipping.
ALLOWLIST = {
    "audit-p0-flows.spec.js": {"Menu desktop, skip sur mobile", "No suitable football match in data"},
    "critical-flows.spec.js": {"mobile uses drawer", "No rows today", "viewport", "data volume"},
    "spa-pages-regression.spec.js": {"Mobile-only test"},
    "visual-regression.spec.js": {"optional visual section missing"},
}


def main() -> int:
    errors: list[str] = []
    total = 0
    for path in sorted(TESTS.glob("*.spec.js")):
        text = path.read_text(encoding="utf-8")
        for match in re.finditer(r"\btest\.skip\s*\(([^)]*)\)", text, flags=re.DOTALL):
            total += 1
            snippet = " ".join(match.group(1).split())
            allowed_needles = ALLOWLIST.get(path.name, set())
            if path.name == "modal-pick-sync.spec.js":
                errors.append(f"{path.name}: modal sync must not use test.skip")
            elif not any(needle in snippet for needle in allowed_needles):
                errors.append(f"{path.name}: undocumented skip -> {snippet[:120]}")
    if errors:
        print("[playwright-skips] FAIL")
        for err in errors:
            print(f"- {err}")
        return 1
    print(f"[playwright-skips] OK ({total} runtime skips allowlisted)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Audit raw frontend bundle sizes against the current V35 limits."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIMITS = {
    # BUG-007: legacy-app.js is still monolithic. AUDIT 2026-05-08 v39 :
    # bumped 1.81 → 1.82 MB pour absorber la refonte complète du tableau
    # (helper _v39FinalRec, v39RecBadge, filtre cote validée, layout
    # 5-col simplifié). Le refacto ESM (audit P1.3) reste le vrai levier
    # pour réduire ce bundle.
    "app.js": 25_000,
    "legacy-app.js": 1_820_000,
    "app.css": 360_000,
    "pronostics.html": 90_000,
    "data_lite.js": 220_000,
}


def main() -> int:
    failures: list[str] = []
    for name, limit in LIMITS.items():
        path = ROOT / name
        if not path.exists():
            continue
        size = path.stat().st_size
        status = "OK" if size <= limit else "FAIL"
        print(f"[bundle-size] {status} {name}: {size} / {limit} bytes")
        if size > limit:
            failures.append(f"{name}={size}>{limit}")
    if failures:
        print("[bundle-size] FAIL " + ", ".join(failures))
        return 1
    print("[bundle-size] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

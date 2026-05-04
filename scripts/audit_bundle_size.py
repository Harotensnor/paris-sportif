#!/usr/bin/env python3
"""Audit raw frontend bundle sizes against the current V35 limits."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIMITS = {
    "app.js": 1_700_000,
    "app.css": 360_000,
    "pronostics.html": 90_000,
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

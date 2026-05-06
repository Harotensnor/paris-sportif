#!/usr/bin/env python3
"""Keep shipped JS on LF endings so bundle budgets stay stable on Windows."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGETS = [
    ROOT / "legacy-app.js",
    ROOT / "app.js",
    ROOT / "src" / "qa-runtime.js",
    ROOT / "sw.js",
]


def main() -> int:
    offenders: list[str] = []
    for path in TARGETS:
        data = path.read_bytes()
        if b"\r\n" in data or b"\r" in data:
            offenders.append(path.relative_to(ROOT).as_posix())
    if offenders:
        print("[line-endings] FAIL")
        for item in offenders:
            print(f"- {item}: CRLF/CR detected; keep LF for deterministic bundle size")
        return 1
    print("[line-endings] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

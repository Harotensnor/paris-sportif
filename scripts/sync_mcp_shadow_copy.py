#!/usr/bin/env python3
"""Synchronize the historical MCP script path used by old desktop configs."""
from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "scripts" / "mcp_paris_sportif.py"
LEGACY = ROOT.parent / "paris-sportif-sprints" / "scripts" / "mcp_paris_sportif.py"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:12]


def main() -> int:
    if not SOURCE.exists():
        print("[mcp-shadow] FAIL source missing")
        return 1
    if not LEGACY.parent.exists():
        print("[mcp-shadow] SKIP legacy folder not present")
        return 0
    before = sha(LEGACY) if LEGACY.exists() else None
    shutil.copy2(SOURCE, LEGACY)
    after = sha(LEGACY)
    print(f"[mcp-shadow] synced {LEGACY}")
    print(f"[mcp-shadow] source={sha(SOURCE)} before={before or 'missing'} after={after}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Ensure old desktop MCP config paths use the current MCP server code."""
from __future__ import annotations

import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "scripts" / "mcp_paris_sportif.py"
LEGACY = ROOT.parent / "paris-sportif-sprints" / "scripts" / "mcp_paris_sportif.py"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    if not LEGACY.exists():
        print("[mcp-shadow-audit] SKIP legacy MCP path not present")
        return 0
    source_sha = sha(SOURCE)
    legacy_sha = sha(LEGACY)
    if source_sha != legacy_sha:
        print("[mcp-shadow-audit] FAIL legacy MCP path is stale")
        print(f"- source: {SOURCE} {source_sha[:12]}")
        print(f"- legacy: {LEGACY} {legacy_sha[:12]}")
        print("- run: py scripts/sync_mcp_shadow_copy.py")
        return 1
    print(f"[mcp-shadow-audit] OK {LEGACY}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

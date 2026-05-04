#!/usr/bin/env python3
"""Expose offline learned weights to the vanilla frontend as a tiny JS sidecar."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "lightgbm_weights.json"
OUT = ROOT / "lightgbm_weights.js"


def main() -> int:
    if not SRC.exists():
        payload = {
            "schema": "paris-sportif.learned_weights.v1",
            "status": "missing",
            "runtime_dependency": "none",
        }
    else:
        payload = json.loads(SRC.read_text(encoding="utf-8"))
    OUT.write_text(
        "window.PRONOSTICS_LIGHTGBM_WEIGHTS = "
        + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )
    print(f"[lightgbm-runtime] wrote {OUT.name} ({OUT.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

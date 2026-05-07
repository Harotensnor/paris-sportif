#!/usr/bin/env python3
"""Verify that learned weights are exported and referenced by the frontend."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEIGHTS = ROOT / "lightgbm_weights.json"
RUNTIME = ROOT / "lightgbm_weights.js"
HTML = ROOT / "pronostics.html"
# v37.017 split: predictMatch and friends now live in legacy-app.js.
APP_CANDIDATES = (ROOT / "legacy-app.js", ROOT / "app.js")


def fail(errors: list[str], msg: str) -> None:
    errors.append(msg)


def main() -> int:
    errors: list[str] = []
    if not WEIGHTS.exists():
        fail(errors, "lightgbm_weights.json missing")
        payload = {}
    else:
        payload = json.loads(WEIGHTS.read_text(encoding="utf-8"))
    if payload.get("status") not in {"aggregate_fallback", "trained", "row_level_table_detected_training_pending"}:
        fail(errors, f"unexpected weights status {payload.get('status')}")
    blend = payload.get("blend") or {}
    if float(blend.get("max_probability_nudge") or 0) > 0.03:
        fail(errors, "max_probability_nudge too aggressive")
    if not RUNTIME.exists() or "PRONOSTICS_LIGHTGBM_WEIGHTS" not in RUNTIME.read_text(encoding="utf-8"):
        fail(errors, "lightgbm runtime sidecar missing")
    html = HTML.read_text(encoding="utf-8") if HTML.exists() else ""
    if "lightgbm_weights.js?v=" not in html:
        fail(errors, "pronostics.html does not preload lightgbm_weights.js")
    app_path = next((p for p in APP_CANDIDATES if p.exists()), None)
    app = app_path.read_text(encoding="utf-8") if app_path else ""
    if "getLearnedContextNudge" not in app or "learned_context" not in app:
        label = app_path.name if app_path else "app.js"
        fail(errors, f"{label} does not consume learned weights")
    if errors:
        print("[lightgbm-runtime] FAIL")
        for err in errors:
            print(f"- {err}")
        return 1
    sports = len((payload.get("weights") or {}).get("by_sport") or {})
    leagues = len((payload.get("weights") or {}).get("by_league") or {})
    print(f"[lightgbm-runtime] OK status={payload.get('status')} sports={sports} leagues={leagues}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

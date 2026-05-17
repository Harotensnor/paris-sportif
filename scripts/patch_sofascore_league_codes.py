#!/usr/bin/env python3
"""Normalize existing Sofascore league codes after taxonomy updates.

``patch_sofascore_events.py`` only appends new events. Existing Sofascore rows
therefore keep their old fallback code until a fresh day replaces them. This
small patcher upgrades those rows in-place so Section J sports expansion is
visible immediately in ``data.js`` and downstream audits.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data.js"
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

from fetch_sofascore_events import _league_code  # noqa: E402
from _data_io import save_data_js  # noqa: E402


def load_data() -> tuple[str, re.Match[str], dict]:
    text = DATA_PATH.read_text(encoding="utf-8")
    match = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;", text, flags=re.DOTALL)
    if not match:
        raise RuntimeError("PRONOSTICS_DATA pattern not found")
    return text, match, json.loads(match.group(1))


def main() -> int:
    if not DATA_PATH.exists():
        print("data.js absent", file=sys.stderr)
        return 1
    try:
        text, match, data = load_data()
    except Exception as exc:
        print(f"parse data.js failed: {exc}", file=sys.stderr)
        return 1

    changed = 0
    touched = 0
    categories: dict[str, int] = {}
    for events in (data.get("days") or {}).values():
        for event in events or []:
            league_name = event.get("league_name") or event.get("league") or ""
            if not league_name:
                continue
            sport = event.get("sofascore_sport") or event.get("sport") or ""
            if sport == "hockey":
                sport = "ice-hockey"
            next_code = _league_code(str(league_name), str(sport))
            if not next_code:
                continue
            touched += 1
            categories[next_code] = categories.get(next_code, 0) + 1
            if event.get("league_code") != next_code:
                event["league_code"] = next_code
                changed += 1

    if changed <= 0:
        print(f"sofascore league codes: no change · checked={touched}")
        return 0

    data["generated_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    save_data_js(data, DATA_PATH)
    top = ", ".join(f"{k}:{v}" for k, v in sorted(categories.items(), key=lambda item: -item[1])[:8])
    print(f"sofascore league codes: updated={changed} checked={touched} top={top}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

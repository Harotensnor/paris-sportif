#!/usr/bin/env python3
"""Fail CI when the committed data snapshot is stale.

This guard is intentionally narrow: source sidecars may be slow or optional,
but the served `data.js` timestamp must stay fresh enough for the site not to
show a broken pipeline banner.
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"


def _parse_dt(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def _load_generated_at() -> str | None:
    if not DATA_JS.exists():
        return None
    text = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$", text, re.S)
    if not m:
        return None
    data = json.loads(m.group(1))
    return data.get("generated_at")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-age-min", type=int, default=30)
    args = parser.parse_args()

    generated_at = _load_generated_at()
    dt = _parse_dt(generated_at)
    if dt is None:
        print("[pipeline-health] FAIL data.js generated_at missing/unparseable")
        return 1
    age_min = round((datetime.now(timezone.utc) - dt).total_seconds() / 60)
    if age_min > args.max_age_min:
        print(
            f"[pipeline-health] FAIL data.js stale: {age_min}min "
            f"> {args.max_age_min}min (generated_at={generated_at})"
        )
        return 1
    print(f"[pipeline-health] OK data.js age={age_min}min generated_at={generated_at}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

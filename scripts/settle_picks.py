#!/usr/bin/env python3
"""Settle pending rows in picks_history.jsonl from the current scoreboard data."""
from __future__ import annotations

import sys

from picks_history_lib import refresh_history


def main() -> int:
    res = refresh_history(generate_new=False, settle_existing=True)
    print(f"[settle_picks] total={res['total']} settled_updates={res['updated']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

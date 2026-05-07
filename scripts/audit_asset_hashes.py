#!/usr/bin/env python3
"""CI wrapper for pronostics.html asset hash-busting references."""
from __future__ import annotations

from stamp_asset_hashes import main


if __name__ == "__main__":
    raise SystemExit(main(["--check"]))

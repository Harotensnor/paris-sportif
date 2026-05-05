#!/usr/bin/env python3
"""Compatibility wrapper for the freshness CI guard."""
from __future__ import annotations

from check_pipeline_health import main


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Measure raw and gzip transfer sizes for the static shell assets."""
from __future__ import annotations

import argparse
import gzip
import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "transfer_size_report.json"
DEFAULT_ASSETS = [
    "pronostics.html",
    "app.js",
    "app.css",
    "data_lite.js",
    "data.js",
    "sw.js",
]
LIVE_BASE = "https://harotensnor.github.io/paris-sportif"


def gzip_size(raw: bytes) -> int:
    return len(gzip.compress(raw, compresslevel=9))


def asset_row(path: str) -> dict:
    p = ROOT / path
    raw = p.read_bytes()
    gz = gzip_size(raw)
    return {
        "asset": path,
        "raw_bytes": len(raw),
        "gzip_bytes": gz,
        "gzip_ratio": round(gz / len(raw), 4) if raw else 0,
    }


def live_head(path: str) -> dict:
    req = urllib.request.Request(
        f"{LIVE_BASE}/{path}",
        method="HEAD",
        headers={"Accept-Encoding": "gzip, br", "User-Agent": "Paris-Sportif-Audit/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            return {
                "asset": path,
                "status": int(resp.status),
                "content_encoding": resp.headers.get("Content-Encoding") or "",
                "content_length": int(resp.headers.get("Content-Length") or 0),
                "cache_control": resp.headers.get("Cache-Control") or "",
            }
    except Exception as exc:
        return {"asset": path, "status": "error", "error": str(exc)}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="also query GitHub Pages response headers")
    args = parser.parse_args()
    local = [asset_row(a) for a in DEFAULT_ASSETS if (ROOT / a).exists()]
    report = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "local": local,
        "totals": {
            "raw_bytes": sum(r["raw_bytes"] for r in local),
            "gzip_bytes": sum(r["gzip_bytes"] for r in local),
        },
    }
    if args.live:
        report["live_headers"] = [live_head(a) for a in DEFAULT_ASSETS]
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT.name}")
    print(f"raw={report['totals']['raw_bytes']} gzip={report['totals']['gzip_bytes']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

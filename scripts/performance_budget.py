#!/usr/bin/env python3
"""Performance budget summary for local CI and release reports."""
from __future__ import annotations

import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "performance-budget-report.json"

BUDGETS = {
    "app.js": {"raw_kb": 20, "gzip_kb": 8},
    "legacy-app.js": {"raw_kb": 1850, "gzip_kb": 500},
    "app.css": {"raw_kb": 300, "gzip_kb": 50},
    "app-design-v3.css": {"raw_kb": 32, "gzip_kb": 8},
    "pronostics.html": {"raw_kb": 1150, "gzip_kb": 90},
    "src/perf-bootstrap.js": {"raw_kb": 20, "gzip_kb": 8},
}

TARGETS = {
    "app_js_gzip_target_kb": 350,
    "css_gzip_target_kb": 50,
}


def sizes(path: Path) -> dict[str, float | bool]:
    if not path.exists():
        return {"exists": False, "raw_kb": 0, "gzip_kb": 0}
    raw = path.read_bytes()
    gz = gzip.compress(raw, compresslevel=9)
    return {
        "exists": True,
        "raw_kb": round(len(raw) / 1024, 2),
        "gzip_kb": round(len(gz) / 1024, 2),
    }


def main() -> int:
    assets = {}
    failures = []
    warnings = []
    for name, budget in BUDGETS.items():
        info = sizes(ROOT / name)
        assets[name] = {**info, "budget": budget}
        if not info["exists"]:
            failures.append(f"{name}: missing")
            continue
        if info["raw_kb"] > budget["raw_kb"] or info["gzip_kb"] > budget["gzip_kb"]:
            failures.append(f"{name}: {info['raw_kb']}KB raw / {info['gzip_kb']}KB gzip")
    legacy_gzip = assets.get("legacy-app.js", {}).get("gzip_kb", 0)
    if legacy_gzip and legacy_gzip > TARGETS["app_js_gzip_target_kb"]:
        warnings.append(f"legacy-app.js gzip {legacy_gzip}KB above long-term target {TARGETS['app_js_gzip_target_kb']}KB")
    report = {
        "generated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat().replace("+00:00", "Z"),
        "targets": TARGETS,
        "assets": assets,
        "failures": failures,
        "warnings": warnings,
        "status": "fail" if failures else "warning" if warnings else "ok",
    }
    OUT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

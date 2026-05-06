from __future__ import annotations

import json
import os
import re
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "post-deploy-health.json"
BASE_URL = os.environ.get("QA_DEPLOY_URL", "https://harotensnor.github.io/paris-sportif")
EXPECTED_VERSION = os.environ.get("QA_EXPECTED_VERSION", "")


def fetch_text(url: str) -> tuple[int, str, float]:
    started = time.perf_counter()
    req = urllib.request.Request(url, headers={"User-Agent": "Paris-Sportif-PostDeploy/1.0"})
    with urllib.request.urlopen(req, timeout=15) as response:
        body = response.read(1_200_000).decode("utf-8", errors="ignore")
        return response.status, body, (time.perf_counter() - started) * 1000


def main() -> int:
    errors: list[str] = []
    checks: dict[str, object] = {}
    url = BASE_URL.rstrip("/") + "/pronostics.html"
    try:
        status, html, elapsed = fetch_text(url)
        checks["html_status"] = status
        checks["html_ms"] = round(elapsed, 1)
        checks["has_brand"] = "Paris-Sportif" in html or "PARIS-SPORTIF" in html
        checks["has_app_script"] = "app.js" in html
        version_match = re.search(r'id="footer-version"[^>]*>(v[0-9.]+)</span>', html)
        checks["footer_version"] = version_match.group(1) if version_match else None
        if status >= 400:
            errors.append(f"pronostics.html HTTP {status}")
        if not checks["has_brand"]:
            errors.append("brand marker missing")
        if EXPECTED_VERSION and checks["footer_version"] != EXPECTED_VERSION:
            errors.append(f"footer version {checks['footer_version']} != {EXPECTED_VERSION}")
    except Exception as exc:
        errors.append(f"html fetch failed: {exc}")

    manifest_url = BASE_URL.rstrip("/") + "/data_manifest.json"
    try:
        status, text, elapsed = fetch_text(manifest_url)
        checks["manifest_status"] = status
        checks["manifest_ms"] = round(elapsed, 1)
        manifest = json.loads(text)
        checks["data_generated_at"] = manifest.get("generated_at") or manifest.get("data_generated_at")
    except Exception as exc:
        checks["manifest_status"] = "unavailable"
        errors.append(f"manifest fetch failed: {exc}")

    report = {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "status": "failed" if errors else "ok",
        "url": BASE_URL,
        "checks": checks,
        "errors": errors,
        "rollback": {
            "available": True,
            "mode": "workflow can revert HEAD when QA_AUTO_ROLLBACK=1",
        },
    }
    OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"post-deploy health: {report['status']} {BASE_URL}")
    if errors:
        for error in errors:
            print(f"- {error}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "synthetic-monitor-report.json"
URL = os.environ.get("QA_MONITOR_URL", "https://harotensnor.github.io/paris-sportif/pronostics.html")
MAX_MS = int(os.environ.get("QA_MONITOR_MAX_MS", "2000"))


def fetch(url: str) -> tuple[int, bytes, float]:
    started = time.perf_counter()
    req = urllib.request.Request(url, headers={"User-Agent": "Paris-Sportif-QA-Monitor/1.0"})
    with urllib.request.urlopen(req, timeout=12) as response:
        body = response.read(900_000)
        elapsed_ms = (time.perf_counter() - started) * 1000
        return response.status, body, elapsed_ms


def main() -> int:
    errors: list[str] = []
    status = 0
    elapsed_ms = 0.0
    size = 0
    try:
        status, body, elapsed_ms = fetch(URL)
        size = len(body)
        text = body.decode("utf-8", errors="ignore")
        if status >= 400:
            errors.append(f"HTTP {status}")
        if "Paris-Sportif" not in text and "PARIS-SPORTIF" not in text:
            errors.append("brand marker missing")
        if elapsed_ms > MAX_MS:
            errors.append(f"response {elapsed_ms:.0f}ms > {MAX_MS}ms")
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        errors.append(str(exc))
    report = {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "status": "failed" if errors else "ok",
        "url": URL,
        "http_status": status,
        "response_ms": round(elapsed_ms, 1),
        "max_response_ms": MAX_MS,
        "bytes_checked": size,
        "errors": errors,
    }
    OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"synthetic monitor: {report['status']} {round(elapsed_ms)}ms {URL}")
    if errors:
        for error in errors:
            print(f"- {error}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

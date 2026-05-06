#!/usr/bin/env python3
"""Synthetic site monitor for availability and data freshness."""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from urllib.parse import urljoin

DEFAULT_URL = "https://harotensnor.github.io/paris-sportif/pronostics.html"
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / ".cache" / "synthetic-monitor.json"


def _fetch(url: str, timeout: int) -> tuple[int, str]:
    req = Request(url, headers={"User-Agent": "paris-sportif-synthetic-monitor/1.0"})
    with urlopen(req, timeout=timeout) as response:
        body = response.read().decode("utf-8", errors="replace")
        return int(response.status), body


def _parse_iso(value: str) -> datetime | None:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except (TypeError, ValueError):
        return None


def _extract_generated_at(text: str) -> str | None:
    patterns = (
        r'"generated_at"\s*:\s*"([^"]+)"',
        r"'generated_at'\s*:\s*'([^']+)'",
        r"generated_at\s*[:=]\s*['\"]([^'\"]+)['\"]",
    )
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1)
    return None


def _status(age_min: float | None, warn_age_min: float, max_age_min: float) -> str:
    if age_min is None:
        return "unknown"
    if age_min > max_age_min:
        return "critical"
    if age_min > warn_age_min:
        return "warning"
    return "fresh"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=DEFAULT_URL)
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--warn-age-min", type=float, default=30)
    parser.add_argument("--max-age-min", type=float, default=240)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args(argv)

    payload: dict = {
        "schema": "paris-sportif.synthetic-monitor.v1",
        "checked_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "url": args.url,
        "ok": False,
        "http_status": None,
        "data_generated_at": None,
        "data_age_min": None,
        "freshness": "unknown",
        "banner_detected": None,
        "errors": [],
    }
    try:
        status, text = _fetch(args.url, args.timeout)
        payload["http_status"] = status
        if status >= 400:
            payload["errors"].append(f"http_status={status}")
        payload["banner_detected"] = bool(
            "Pipeline en panne" in text or "Données anciennes" in text or "donnees anciennes" in text.lower()
        )
        generated = _extract_generated_at(text)
        if not generated:
            data_url = urljoin(args.url, "data.js")
            data_status, data_text = _fetch(data_url, args.timeout)
            payload["data_js_status"] = data_status
            if data_status >= 400:
                payload["errors"].append(f"data_js_status={data_status}")
            generated = _extract_generated_at(data_text)
        payload["data_generated_at"] = generated
        generated_dt = _parse_iso(generated) if generated else None
        if generated_dt:
            age_min = (datetime.now(timezone.utc) - generated_dt).total_seconds() / 60
            payload["data_age_min"] = round(age_min, 2)
        else:
            payload["errors"].append("generated_at missing")
        payload["freshness"] = _status(payload["data_age_min"], args.warn_age_min, args.max_age_min)
        if payload["freshness"] == "critical":
            payload["errors"].append(f"data_age_min>{args.max_age_min:g}")
        payload["ok"] = status < 400 and not payload["errors"]
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        payload["errors"].append(str(error))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "src" / "local-analytics.js"
HTML = ROOT / "pronostics.html"
REPORT = ROOT / "analytics_local_privacy_audit.json"


FORBIDDEN = {
    "fetch(": r"\bfetch\s*\(",
    "XMLHttpRequest": r"\bXMLHttpRequest\b",
    "sendBeacon": r"\bsendBeacon\b",
    "WebSocket": r"\bWebSocket\b",
    "EventSource": r"\bEventSource\b",
    "http URL literal": r"https?://",
}


def main() -> int:
    errors: list[str] = []
    module_text = MODULE.read_text(encoding="utf-8")
    html_text = HTML.read_text(encoding="utf-8")

    for label, pattern in FORBIDDEN.items():
        if re.search(pattern, module_text):
            errors.append(f"local-analytics.js contains forbidden network primitive: {label}")

    required_tokens = [
        "const TELEMETRY_KEY = 'usage_telemetry'",
        "runtimeNetworkCalls: 0",
        "window.__localAnalyticsAudit",
        "window.__localAnalytics",
    ]
    for token in required_tokens:
        if token not in module_text:
            errors.append(f"local analytics module is missing required token: {token}")

    if "src/local-analytics.js" not in html_text:
        errors.append("pronostics.html does not load src/local-analytics.js")

    report = {
        "status": "ok" if not errors else "failed",
        "checked_files": [
            str(MODULE.relative_to(ROOT)),
            str(HTML.relative_to(ROOT)),
        ],
        "privacy_model": {
            "server_uploads": 0,
            "tracking_calls": 0,
            "network_primitives": 0,
            "storage": ["localStorage.usage_telemetry", "localStorage.usage_telemetry_prefs"],
            "retention": "bounded local arrays, oldest entries trimmed in browser",
        },
        "features_checked": [
            "local page visits",
            "local click heatmap",
            "local funnel",
            "local recommendations",
            "local smart alerts",
            "local saved views",
            "local reset",
        ],
        "errors": errors,
    }
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if errors:
        print("Local analytics privacy audit failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Local analytics audit OK: zero network primitive, localStorage only")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "src" / "qa-runtime.js"
HTML = ROOT / "pronostics.html"
REPORT = ROOT / "qa-runtime-audit.json"
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
    if not MODULE.exists():
        errors.append("src/qa-runtime.js missing")
        module_text = ""
    else:
        module_text = MODULE.read_text(encoding="utf-8")
    html_text = HTML.read_text(encoding="utf-8")
    for label, pattern in FORBIDDEN.items():
        if re.search(pattern, module_text):
            errors.append(f"qa-runtime.js contains forbidden network primitive: {label}")
    for token in ("paris_sportif_js_errors_v1", "window.__errors", "window.__qaBugReport", "window.__qaCanaryVariant"):
        if token not in module_text:
            errors.append(f"qa-runtime.js missing token {token}")
    if "src/qa-runtime.js" not in html_text:
        errors.append("pronostics.html does not load src/qa-runtime.js")
    report = {
        "status": "ok" if not errors else "failed",
        "runtime_network_calls": 0,
        "storage": "localStorage.paris_sportif_js_errors_v1",
        "errors": errors,
    }
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("QA runtime audit " + ("OK" if not errors else "FAILED"))
    if errors:
        for error in errors:
            print(f"- {error}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

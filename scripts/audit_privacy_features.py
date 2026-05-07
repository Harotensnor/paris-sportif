from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE = ROOT / "src" / "privacy-social.js"
HTML = ROOT / "pronostics.html"
QR = ROOT / "vendor" / "qrcode-generator.js"
REPORT = ROOT / "privacy_network_audit.json"


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
    qr_text = QR.read_text(encoding="utf-8") if QR.exists() else ""

    for label, pattern in FORBIDDEN.items():
        if re.search(pattern, module_text):
            errors.append(f"privacy-social.js contains forbidden network primitive: {label}")

    required_html = [
        "vendor/qrcode-generator.js",
        "src/privacy-social.js",
    ]
    for token in required_html:
        if token not in html_text:
            errors.append(f"pronostics.html does not load local asset {token}")

    if not QR.exists():
        errors.append("vendor/qrcode-generator.js is missing")
    elif "Licensed under the MIT license" not in qr_text:
        errors.append("vendor/qrcode-generator.js license header was not detected")

    if "runtimeNetworkCalls: 0" not in module_text:
        errors.append("__privacyFeaturesNetworkAudit does not expose runtimeNetworkCalls: 0")

    report = {
        "status": "ok" if not errors else "failed",
        "checked_files": [
            MODULE.relative_to(ROOT).as_posix(),
            HTML.relative_to(ROOT).as_posix(),
            QR.relative_to(ROOT).as_posix(),
        ],
        "privacy_model": {
            "server_uploads": 0,
            "tracking_calls": 0,
            "storage": ["localStorage", "Blob downloads", "print-to-PDF"],
            "sharing": "QR code with URL hash/base64 payload only",
        },
        "errors": errors,
    }
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if errors:
        print("Privacy audit failed:")
        for error in errors:
            print(f"- {error}")
        return 1
    print("Privacy audit OK: no network primitive in src/privacy-social.js")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

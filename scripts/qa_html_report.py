from __future__ import annotations

import html
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "qa-report"
OUT = OUT_DIR / "index.html"
SOURCES = [
    ("Quality gate", "qa-gate-report.json"),
    ("Unit helpers", "qa-unit-report.json"),
    ("Mutation", "qa-mutation-report.json"),
    ("Snapshots", "qa-snapshot-report.json"),
    ("Load", "qa-load-report.json"),
    ("Contracts", "qa-contract-report.json"),
    ("Lighthouse", "qa-lighthouse-report.json"),
    ("Local analytics privacy", "analytics_local_privacy_audit.json"),
    ("Synthetic monitor", "synthetic-monitor-report.json"),
    ("Post-deploy health", "post-deploy-health.json"),
]


def load(path: str) -> dict:
    full = ROOT / path
    if not full.exists():
        return {"status": "missing"}
    try:
        return json.loads(full.read_text(encoding="utf-8"))
    except Exception as exc:
        return {"status": "invalid", "error": str(exc)}


def badge(status: str) -> str:
    cls = "ok" if status == "ok" else "warn" if status in {"warning", "missing", "skipped"} else "fail"
    return f'<span class="badge {cls}">{html.escape(status)}</span>'


def main() -> int:
    OUT_DIR.mkdir(exist_ok=True)
    sections = []
    for title, file_name in SOURCES:
        payload = load(file_name)
        status = str(payload.get("status", "unknown"))
        body = html.escape(json.dumps(payload, indent=2, ensure_ascii=False)[:12000])
        sections.append(
            f'<section class="card">\n'
            f'  <h2>{html.escape(title)} {badge(status)}</h2>\n'
            f'  <p><code>{html.escape(file_name)}</code></p>\n'
            f'  <pre>{body}</pre>\n'
            f'</section>'
        )
    generated = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    joined_sections = "\n".join(sections)
    markup = f"""<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>QA Report Paris-Sportif</title>
<style>
body{{font-family:Inter,system-ui,sans-serif;background:#09090b;color:#f8fafc;margin:0;padding:28px}}
h1{{font-size:42px;margin:0 0 6px}}p{{color:#cbd5e1}}.grid{{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}}
.card{{border:1px solid #273244;background:#111827;border-radius:14px;padding:16px;overflow:auto}}
.badge{{font-size:12px;border-radius:999px;padding:4px 9px;margin-left:8px}}.ok{{background:#064e3b;color:#d1fae5}}.warn{{background:#78350f;color:#ffedd5}}.fail{{background:#7f1d1d;color:#fee2e2}}
pre{{white-space:pre-wrap;font-size:12px;line-height:1.45;color:#d1d5db}}
</style>
<main>
  <h1>QA Report</h1>
  <p>Généré {generated}. Rapport local sans envoi externe.</p>
  <div class="grid">
    {joined_sections}
  </div>
</main>
</html>
"""
    OUT.write_text("\n".join(line.rstrip() for line in markup.splitlines()) + "\n", encoding="utf-8")
    print(f"QA HTML report: {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

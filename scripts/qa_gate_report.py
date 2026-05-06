#!/usr/bin/env python3
"""Run the fast local QA gate and write machine-readable reports.

This is intentionally dependency-light: Node syntax checks, Python unit tests,
data/runtime audits and bundle guards. Browser-heavy checks stay in smoke.yml.
"""
from __future__ import annotations

import argparse
import html
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_JSON = ROOT / ".cache" / "qa-gates-report.json"
DEFAULT_HTML = ROOT / ".cache" / "qa-gates-report.html"


def _node_bin() -> str:
    explicit = os.environ.get("NODE_BIN") or os.environ.get("NODE")
    if explicit:
        return explicit
    bundled = (
        Path.home()
        / ".cache"
        / "codex-runtimes"
        / "codex-primary-runtime"
        / "dependencies"
        / "node"
        / "bin"
        / ("node.exe" if os.name == "nt" else "node")
    )
    if bundled.exists():
        return str(bundled)
    return "node"


def _checks() -> list[tuple[str, list[str]]]:
    py = sys.executable
    node = _node_bin()
    audits = [
        "scripts/check_pipeline_drift.py",
        "scripts/check_bundle_size.py",
        "scripts/audit_orphan_renderers.py",
        "scripts/audit_localstorage_safety.py",
        "scripts/audit_csp_inline_hashes.py",
        "scripts/audit_asset_hashes.py",
        "scripts/audit_line_endings.py",
        "scripts/audit_no_unused_imports.py",
        "scripts/audit_all_probes_wired.py",
        "scripts/audit_modal_aria.py",
        "scripts/audit_no_legacy_imports.py",
        "scripts/audit_no_dead_pronos_subnav.py",
        "scripts/audit_no_dead_top_page.py",
        "scripts/audit_no_dead_sports_grid.py",
        "scripts/audit_no_prod_console_log.py",
        "scripts/audit_no_todo_markers.py",
        "scripts/audit_no_empty_catch_modules.py",
        "scripts/audit_no_empty_catch_legacy.py",
        "scripts/audit_no_direct_console_modules.py",
        "scripts/audit_smoke_workflow_triggers.py",
        "scripts/audit_workflow_self_triggers.py",
        "scripts/audit_qa_runtime_privacy.py",
        "scripts/audit_ci_critical_paths.py",
        "scripts/audit_qa_workflows.py",
        "scripts/audit_qa_matrix_versions.py",
    ]
    checks: list[tuple[str, list[str]]] = [
        ("syntax legacy-app.js", [node, "--check", "legacy-app.js"]),
        ("syntax src/qa-runtime.js", [node, "--check", "src/qa-runtime.js"]),
        ("pytest", [py, "-m", "pytest", "tests/", "-q"]),
    ]
    checks.extend((Path(audit).name, [py, audit]) for audit in audits)
    return checks


def _run(label: str, cmd: list[str]) -> dict:
    started = time.perf_counter()
    try:
        proc = subprocess.run(
            cmd,
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            errors="replace",
        )
    except OSError as error:
        elapsed_ms = round((time.perf_counter() - started) * 1000)
        return {
            "label": label,
            "cmd": cmd,
            "ok": False,
            "exit_code": 127,
            "duration_ms": elapsed_ms,
            "output_tail": f"could not start command: {error}",
        }
    elapsed_ms = round((time.perf_counter() - started) * 1000)
    output = (proc.stdout or "").strip()
    return {
        "label": label,
        "cmd": cmd,
        "ok": proc.returncode == 0,
        "exit_code": proc.returncode,
        "duration_ms": elapsed_ms,
        "output_tail": output[-4000:],
    }


def _write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _write_html(path: Path, payload: dict) -> None:
    rows = []
    for result in payload["checks"]:
        cls = "ok" if result["ok"] else "fail"
        rows.append(
            "<tr>"
            f"<td class='{cls}'>{'OK' if result['ok'] else 'FAIL'}</td>"
            f"<td>{html.escape(result['label'])}</td>"
            f"<td>{result['duration_ms']} ms</td>"
            f"<td><code>{html.escape(' '.join(result['cmd']))}</code></td>"
            f"<td><pre>{html.escape(result['output_tail'])}</pre></td>"
            "</tr>"
        )
    doc = f"""<!doctype html>
<meta charset="utf-8">
<title>Paris-Sportif QA Gate</title>
<style>
body{{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#0b0f16;color:#e5eefb;margin:24px}}
table{{border-collapse:collapse;width:100%;font-size:13px}}
td,th{{border:1px solid #223044;padding:8px;vertical-align:top}}
th{{text-align:left;background:#111827}}
pre{{white-space:pre-wrap;max-height:220px;overflow:auto;margin:0;color:#cbd5e1}}
.ok{{color:#34d399;font-weight:700}}.fail{{color:#fb7185;font-weight:700}}
</style>
<h1>QA Gate</h1>
<p>Status: <strong class="{'ok' if payload['ok'] else 'fail'}">{'OK' if payload['ok'] else 'FAIL'}</strong>
· checks: {payload['passed']}/{payload['total']} · duration: {payload['duration_ms']} ms</p>
<table><thead><tr><th>Status</th><th>Check</th><th>Time</th><th>Command</th><th>Output</th></tr></thead>
<tbody>{''.join(rows)}</tbody></table>
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(doc, encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", type=Path, default=DEFAULT_JSON)
    parser.add_argument("--html", type=Path, default=DEFAULT_HTML)
    args = parser.parse_args(argv)

    started = time.perf_counter()
    results = [_run(label, cmd) for label, cmd in _checks()]
    passed = sum(1 for item in results if item["ok"])
    payload = {
        "schema": "paris-sportif.qa-gate.v1",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "ok": passed == len(results),
        "total": len(results),
        "passed": passed,
        "duration_ms": round((time.perf_counter() - started) * 1000),
        "checks": results,
    }
    _write_json(args.json, payload)
    _write_html(args.html, payload)

    for item in results:
        print(f"[{'ok' if item['ok'] else 'FAIL'}] {item['label']} ({item['duration_ms']}ms)")
        if not item["ok"]:
            print(item["output_tail"])
    print(f"[qa-gate] {passed}/{len(results)} checks passed")
    return 0 if payload["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

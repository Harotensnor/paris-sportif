from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa-gate-report.json"


def find_node() -> str:
    candidates = [
        os.environ.get("NODE_EXE"),
        str(Path.home() / ".cache" / "codex-runtimes" / "codex-primary-runtime" / "dependencies" / "node" / "bin" / "node.exe"),
        shutil.which("node"),
    ]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return candidate
    return "node"


def run_step(name: str, cmd: list[str], required: bool = True) -> dict:
    proc = subprocess.run(
        cmd,
        cwd=ROOT,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
    )
    row = {
        "name": name,
        "cmd": " ".join(cmd),
        "returncode": proc.returncode,
        "required": required,
        "stdout": proc.stdout[-4000:],
        "stderr": proc.stderr[-4000:],
        "status": "ok" if proc.returncode == 0 else ("failed" if required else "warning"),
    }
    print(f"[qa-gate] {name}: {row['status']} rc={proc.returncode}")
    if proc.stdout:
        print(proc.stdout.strip().splitlines()[-1])
    if proc.stderr and proc.returncode != 0:
        print(proc.stderr.strip().splitlines()[-1])
    return row


def read_json(path: str) -> dict:
    full = ROOT / path
    if not full.exists():
        return {}
    try:
        return json.loads(full.read_text(encoding="utf-8"))
    except Exception:
        return {}


def main() -> int:
    node = find_node()
    py = sys.executable
    steps = [
        run_step("unit helpers", [node, "scripts/qa_unit_runner.js"]),
        run_step("mutation smoke", [node, "scripts/legacy_site/qa/qa_mutation_smoke.js"]),
        run_step("snapshots", [node, "scripts/legacy_site/qa/qa_snapshot_runner.js"]),
        run_step("load 1000 picks", [node, "scripts/legacy_site/qa/qa_load_test.js"]),
        run_step("data contracts", [py, "scripts/qa_contract_tests.py"]),
        run_step("data integrity", [py, "scripts/check_data_integrity.py"]),
        run_step("pipeline drift", [py, "scripts/check_pipeline_drift.py"]),
        run_step("bundle budget", [py, "scripts/check_bundle_size.py"]),
        run_step("qa runtime privacy", [py, "scripts/audit_qa_runtime.py"]),
        run_step("local analytics privacy", [py, "scripts/audit_local_analytics.py"]),
        run_step("privacy social", [py, "scripts/audit_privacy_features.py"]),
        run_step("pipeline freshness", [py, "scripts/check_pipeline_freshness.py"], required=os.environ.get("QA_STRICT_FRESHNESS") == "1"),
    ]
    reports = {
        "unit": read_json("qa-unit-report.json"),
        "mutation": read_json("qa-mutation-report.json"),
        "snapshot": read_json("qa-snapshot-report.json"),
        "load": read_json("qa-load-report.json"),
        "contract": read_json("qa-contract-report.json"),
        "local_analytics": read_json("analytics_local_privacy_audit.json"),
    }
    failures = [step for step in steps if step["required"] and step["returncode"] != 0]
    report = {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "status": "failed" if failures else "ok",
        "steps": steps,
        "reports": reports,
        "quality_gates": {
            "helper_coverage_min_pct": 90,
            "mutation_score_min_pct": 70,
            "visual_diff_max_pct": 1,
            "a11y_critical_serious_moderate": 0,
            "load_fps_min": 30,
        },
    }
    OUT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[qa-gate] status={report['status']} required_failures={len(failures)}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

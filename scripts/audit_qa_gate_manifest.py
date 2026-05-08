#!/usr/bin/env python3
"""Ensure qa_gate_report.py keeps the critical audit manifest wired."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GATE = ROOT / "scripts" / "qa_gate_report.py"
REQUIRED = [
    "scripts/check_pipeline_drift.py",
    "scripts/check_no_conflict_markers.py",
    "scripts/check_bundle_size.py",
    "scripts/audit_data_truth.py",
    "scripts/audit_qa_runtime.py",
    "scripts/audit_asset_hashes.py",
    "scripts/audit_site_version.py",
    "scripts/audit_line_endings.py",
    "scripts/audit_no_empty_catch_legacy.py",
    "scripts/audit_privacy_features.py",
    "scripts/audit_innerhtml_safety.py",
    "scripts/audit_legacy_dead_helpers.py",
    "scripts/audit_fetch_tracking.py",
    "scripts/audit_all_probes_wired.py",
    "scripts/audit_a11y_aria_labels.py",
    "scripts/audit_image_alts.py",
    "scripts/audit_color_contrast.py",
    "scripts/audit_qa_workflows.py",
    "scripts/audit_qa_matrix_versions.py",
]


def main() -> int:
    text = GATE.read_text(encoding="utf-8")
    missing = [item for item in REQUIRED if item not in text]
    if missing:
        print("[qa-gate-manifest] FAIL")
        for item in missing:
            print(f"- qa_gate_report.py missing {item}")
        return 1
    print(f"[qa-gate-manifest] OK ({len(REQUIRED)} critical checks wired)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

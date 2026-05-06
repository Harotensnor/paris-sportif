import json
from pathlib import Path

import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import data_integrity_monitor as dim  # noqa: E402


def test_schema_version_runtime_migration():
    payload = {"generated_at": dim.now_iso(), "matches": {"1": {}}, "schema": "legacy.v1"}
    spec = dim.SPECS[1]

    assert dim.schema_version_of(payload) == 1
    plan = dim.migration_plan(payload, spec)

    assert plan["from"] == 1
    assert plan["to"] == dim.SCHEMA_VERSION
    assert plan["mode"] == "runtime_non_mutating"


def test_validate_source_flags_missing_key(tmp_path, monkeypatch):
    bad = tmp_path / "winamax_catalog.json"
    bad.write_text(json.dumps({"generated_at": dim.now_iso(), "sports": {}}), encoding="utf-8")
    monkeypatch.setattr(dim, "ROOT", tmp_path)

    state = {"sources": {}}
    result = dim.validate_source(dim.SPECS[0], state)

    assert result["status"] == "critical"
    assert any(issue["code"] == "missing_key" for issue in result["issues"])


def test_high_odds_are_quarantined_as_warning():
    payload = {
        "generated_at": dim.now_iso(),
        "matches": {
            "m1": {"odds": {"exact_scores": {"5-4": 500.0}, "1n2": {"home": 2.0, "draw": 3.0, "away": 4.0}}}
        },
    }
    issues = dim.semantic_odds(payload, dim.SPECS[1])

    assert any(issue["code"] == "high_odd_review" and issue["level"] == "warning" for issue in issues)


def test_lineage_detects_present_sources():
    ev = {
        "id": "abc",
        "winamax": {"available": True, "match_id": "123"},
        "weather": {"temp_c": 14},
        "referee": {"name": "Test Ref"},
        "competitors": [{"xg_for_avg": 1.2}],
    }

    lineage = dim.source_lineage_for_event(ev)

    assert "espn" in lineage
    assert "winamax" in lineage
    assert "weather" in lineage
    assert "sofascore_referees" in lineage
    assert "xg" in lineage


def test_quality_kpis_score_bounds():
    kpis = dim.build_quality_kpis([
        {"source": "a", "present": True, "status": "ok", "health_score": 100, "items": 10, "age_min": 1, "sla_min": 10, "issues": []},
        {"source": "b", "present": True, "status": "warning", "health_score": 42, "items": 1, "age_min": 20, "sla_min": 10, "issues": [{"code": "x"}]},
    ])

    assert kpis["sources_total"] == 2
    assert kpis["sources_ok"] == 1
    assert kpis["sources_warning"] == 1
    assert 0 <= kpis["source_health_avg"] <= 100

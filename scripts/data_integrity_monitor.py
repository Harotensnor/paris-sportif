#!/usr/bin/env python3
"""Data integrity monitor for sidecars, lineage, health and alerts.

This script is intentionally conservative: it does not mutate source JSON files.
It validates the sidecars the model depends on, writes a quarantine stream for
bad records, produces per-source health scores, and leaves a compact audit
trail whenever source files change between runs.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import statistics
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

try:
    from _data_io import iter_events, load_data_js
except Exception:  # pragma: no cover - import path fallback for pytest
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from _data_io import iter_events, load_data_js

ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / "data_integrity_report.json"
QUARANTINE = ROOT / "data_integrity_quarantine.jsonl"
AUDIT_LOG = ROOT / "data_audit_log.jsonl"
TRACE_LOG = ROOT / "pipeline_traces.jsonl"
TRACE_SUMMARY = ROOT / "pipeline_traces_summary.json"
SOURCE_HEALTH = ROOT / "source_health.json"
LINEAGE_SUMMARY = ROOT / "data_lineage_summary.json"
QUALITY_KPIS = ROOT / "data_quality_kpis.json"
ANOMALIES = ROOT / "data_anomalies.jsonl"
STATE_PATH = ROOT / ".cache" / "data_integrity_state.json"

SCHEMA_VERSION = 2
TYPE_NAMES = {
    "dict": dict,
    "list": list,
    "str": str,
    "int": int,
    "float": (int, float),
    "number": (int, float),
    "bool": bool,
}


@dataclass(frozen=True)
class FieldRule:
    path: str
    expected: tuple[type, ...] | type
    required: bool = True


@dataclass(frozen=True)
class SourceSpec:
    name: str
    filename: str
    fields: tuple[FieldRule, ...]
    sla_min: int
    min_items: int = 1
    item_counter: Callable[[dict[str, Any]], int] | None = None
    semantic: Callable[[dict[str, Any], "SourceSpec"], list[dict[str, Any]]] | None = None
    critical: bool = False


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return utc_now().replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_dt(raw: Any) -> datetime | None:
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def get_path(data: Any, dotted: str) -> Any:
    cur = data
    for part in dotted.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def count_len(path: str) -> Callable[[dict[str, Any]], int]:
    def inner(data: dict[str, Any]) -> int:
        value = get_path(data, path)
        return len(value) if isinstance(value, (dict, list)) else 0
    return inner


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_state() -> dict[str, Any]:
    if not STATE_PATH.exists():
        return {"sources": {}}
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"sources": {}}


def save_state(state: dict[str, Any]) -> None:
    STATE_PATH.parent.mkdir(exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def append_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    if not records:
        return
    with path.open("a", encoding="utf-8") as fh:
        for rec in records:
            fh.write(json.dumps(rec, ensure_ascii=False, separators=(",", ":")) + "\n")


def issue(level: str, source: str, code: str, message: str, **extra: Any) -> dict[str, Any]:
    return {
        "ts": now_iso(),
        "level": level,
        "source": source,
        "code": code,
        "message": message,
        **{k: v for k, v in extra.items() if v is not None},
    }


def count_winamax_catalog(data: dict[str, Any]) -> int:
    tournaments = data.get("tournaments") or []
    return sum(len(t.get("matches") or []) for t in tournaments if isinstance(t, dict))


def count_winamax_markets(data: dict[str, Any]) -> int:
    return len(data.get("matches") or {})


def count_injuries(data: dict[str, Any]) -> int:
    teams = data.get("teams") or {}
    return sum(len(rows or []) for rows in teams.values()) if isinstance(teams, dict) else 0


def count_sofascore(data: dict[str, Any]) -> int:
    if isinstance(data.get("total"), int):
        return data["total"]
    events = data.get("events") or {}
    if isinstance(events, dict):
        return sum(len(v or []) for v in events.values())
    return 0


def iter_odds(value: Any, path: str = ""):
    if isinstance(value, dict):
        for key, child in value.items():
            yield from iter_odds(child, f"{path}.{key}" if path else str(key))
    elif isinstance(value, list):
        for i, child in enumerate(value[:5000]):
            yield from iter_odds(child, f"{path}[{i}]")
    elif (
        path.endswith("odd")
        or path.endswith(".home")
        or path.endswith(".away")
        or path.endswith(".draw")
        or "exact_scores" in path
    ):
        try:
            yield path, float(value)
        except (TypeError, ValueError):
            yield path, math.nan


def semantic_generated_at(data: dict[str, Any], spec: SourceSpec) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    dt = parse_dt(data.get("generated_at"))
    if not dt:
        out.append(issue("error", spec.name, "generated_at_invalid", "generated_at absent ou illisible"))
        return out
    age_min = round((utc_now() - dt).total_seconds() / 60)
    if age_min > spec.sla_min:
        out.append(issue("warning", spec.name, "freshness_sla", f"source stale: {age_min}min > {spec.sla_min}min", age_min=age_min, sla_min=spec.sla_min))
    return out


def semantic_item_floor(data: dict[str, Any], spec: SourceSpec) -> list[dict[str, Any]]:
    counter = spec.item_counter or (lambda _: 0)
    count = counter(data)
    if count < spec.min_items:
        return [issue("error" if spec.critical else "warning", spec.name, "empty_or_low_coverage", f"{count} items < cible {spec.min_items}", items=count, min_items=spec.min_items)]
    return []


def semantic_odds(data: dict[str, Any], spec: SourceSpec) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    bad = []
    high = []
    matches = data.get("matches") if isinstance(data, dict) else None
    sample_root = matches if isinstance(matches, dict) else data
    for path, odd in iter_odds(sample_root):
        if not math.isfinite(odd) or odd < 1.01:
            bad.append({"path": path, "odd": odd})
        elif odd > 50:
            high.append({"path": path, "odd": odd})
        if len(bad) >= 20 and len(high) >= 20:
            break
    if bad:
        out.append(issue("warning", spec.name, "bad_odd", f"{len(bad)} cote(s) invalides <1.01/non finies", sample=bad[:10]))
    if high:
        out.append(issue("warning", spec.name, "high_odd_review", f"{len(high)} cote(s) >50 à surveiller", sample=high[:10]))
    return out


def semantic_event_dates(data: dict[str, Any], spec: SourceSpec) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    events = data.get("events") or {}
    if not isinstance(events, dict):
        return out
    bad_dates = []
    for key, row in list(events.items())[:2000]:
        if isinstance(row, dict):
            raw = row.get("start_time") or row.get("date") or row.get("kickoff_utc")
            if raw and parse_dt(raw) is None:
                bad_dates.append({"key": key, "value": raw})
        if len(bad_dates) >= 20:
            break
    if bad_dates:
        out.append(issue("warning", spec.name, "event_date_invalid", "dates event illisibles", sample=bad_dates[:10]))
    return out


def semantic_combo(*validators: Callable[[dict[str, Any], SourceSpec], list[dict[str, Any]]]):
    def inner(data: dict[str, Any], spec: SourceSpec) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        for validator in validators:
            out.extend(validator(data, spec))
        return out
    return inner


SPECS: tuple[SourceSpec, ...] = (
    SourceSpec("winamax_catalog", "winamax_catalog.json", (
        FieldRule("generated_at", str),
        FieldRule("sports", dict),
        FieldRule("tournaments", list),
    ), sla_min=15, min_items=100, item_counter=count_winamax_catalog, semantic=semantic_combo(semantic_generated_at, semantic_item_floor), critical=True),
    SourceSpec("winamax_markets", "winamax_markets.json", (
        FieldRule("generated_at", str),
        FieldRule("matches", dict),
    ), sla_min=15, min_items=100, item_counter=count_winamax_markets, semantic=semantic_combo(semantic_generated_at, semantic_item_floor, semantic_odds), critical=True),
    SourceSpec("injuries_soccer", "injuries_soccer.json", (
        FieldRule("generated_at", str),
        FieldRule("teams", dict),
    ), sla_min=180, min_items=100, item_counter=count_injuries, semantic=semantic_combo(semantic_generated_at, semantic_item_floor)),
    SourceSpec("lineups_soccer", "lineups_soccer.json", (
        FieldRule("generated_at", str),
        FieldRule("events", dict),
    ), sla_min=180, min_items=80, item_counter=count_len("events"), semantic=semantic_combo(semantic_generated_at, semantic_item_floor, semantic_event_dates)),
    SourceSpec("referees_soccer", "referees_soccer.json", (
        FieldRule("generated_at", str),
        FieldRule("events", dict),
    ), sla_min=180, min_items=50, item_counter=count_len("events"), semantic=semantic_combo(semantic_generated_at, semantic_item_floor, semantic_event_dates)),
    SourceSpec("weather", "weather.json", (
        FieldRule("generated_at", str),
        FieldRule("matches", dict),
    ), sla_min=60, min_items=50, item_counter=count_len("matches"), semantic=semantic_combo(semantic_generated_at, semantic_item_floor)),
    SourceSpec("team_stats", "team_stats.json", (
        FieldRule("generated_at", str),
        FieldRule("teams", dict),
    ), sla_min=300, min_items=80, item_counter=count_len("teams"), semantic=semantic_combo(semantic_generated_at, semantic_item_floor)),
    SourceSpec("clubelo", "clubelo.json", (
        FieldRule("generated_at", str),
        FieldRule("clubs", dict),
    ), sla_min=1440, min_items=300, item_counter=count_len("clubs"), semantic=semantic_combo(semantic_generated_at, semantic_item_floor)),
    SourceSpec("sofascore_events", "sofascore_events.json", (
        FieldRule("generated_at", str),
        FieldRule("events", dict),
    ), sla_min=30, min_items=100, item_counter=count_sofascore, semantic=semantic_combo(semantic_generated_at, semantic_item_floor, semantic_event_dates), critical=True),
    SourceSpec("team_priors", "team_priors.json", (
        FieldRule("generated_at", str),
        FieldRule("teams", dict),
    ), sla_min=24 * 60, min_items=800, item_counter=count_len("teams"), semantic=semantic_combo(semantic_generated_at, semantic_item_floor)),
    SourceSpec("bayesian_priors", "bayesian_priors.json", (
        FieldRule("generated_at", str),
        FieldRule("levels", dict),
    ), sla_min=24 * 60, min_items=3, item_counter=count_len("levels"), semantic=semantic_combo(semantic_generated_at, semantic_item_floor)),
)


def schema_version_of(data: dict[str, Any]) -> int:
    raw = data.get("schema_version")
    if isinstance(raw, int):
        return raw
    schema = data.get("schema")
    if isinstance(schema, dict) and isinstance(schema.get("version"), int):
        return int(schema["version"])
    if isinstance(schema, str) and "v2" in schema.lower():
        return 2
    return 1


def migration_plan(data: dict[str, Any], spec: SourceSpec) -> dict[str, Any] | None:
    version = schema_version_of(data)
    if version >= SCHEMA_VERSION:
        return None
    return {
        "source": spec.name,
        "from": version,
        "to": SCHEMA_VERSION,
        "mode": "runtime_non_mutating",
        "changes": ["add schema_version=2 at root", "preserve payload keys", "validate with v2 rules"],
    }


def validate_source(spec: SourceSpec, state: dict[str, Any]) -> dict[str, Any]:
    path = ROOT / spec.filename
    started = utc_now()
    result: dict[str, Any] = {
        "source": spec.name,
        "file": spec.filename,
        "schema_version_target": SCHEMA_VERSION,
        "present": path.exists(),
        "status": "unknown",
        "items": 0,
        "issues": [],
        "migration": None,
        "health_score": 0,
    }
    trace = {"ts": now_iso(), "script": "data_integrity_monitor.py", "source": spec.name, "output": spec.filename, "status": "unknown", "duration_ms": 0}
    if not path.exists():
        result["status"] = "critical" if spec.critical else "warning"
        result["issues"].append(issue("error", spec.name, "missing_file", f"{spec.filename} absent"))
        trace["status"] = "missing"
        return result | {"trace": trace}

    try:
        raw = path.read_bytes()
        data = json.loads(raw.decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("root is not an object")
    except Exception as exc:
        result["status"] = "critical" if spec.critical else "warning"
        result["issues"].append(issue("error", spec.name, "parse_error", str(exc)[:200]))
        trace["status"] = "parse_error"
        trace["duration_ms"] = round((utc_now() - started).total_seconds() * 1000)
        return result | {"trace": trace}

    result["schema_version"] = schema_version_of(data)
    result["migration"] = migration_plan(data, spec)
    result["size_bytes"] = path.stat().st_size
    result["sha256"] = sha256_file(path)
    result["age_min"] = max(0, round((utc_now().timestamp() - path.stat().st_mtime) / 60))
    result["generated_at"] = data.get("generated_at")
    result["items"] = (spec.item_counter or (lambda _: 0))(data)

    issues: list[dict[str, Any]] = []
    if result["migration"]:
        issues.append(issue("info", spec.name, "schema_migration_available", "sidecar lu comme v1 et valide avec les règles v2"))

    for rule in spec.fields:
        value = get_path(data, rule.path)
        if value is None:
            if rule.required:
                issues.append(issue("error", spec.name, "missing_key", f"clé requise absente: {rule.path}", field=rule.path))
            continue
        expected = rule.expected if isinstance(rule.expected, tuple) else (rule.expected,)
        if not isinstance(value, expected):
            issues.append(issue("error", spec.name, "type_mismatch", f"{rule.path} a le mauvais type", field=rule.path, expected=[t.__name__ for t in expected], actual=type(value).__name__))

    if spec.semantic:
        issues.extend(spec.semantic(data, spec))

    errors = [x for x in issues if x["level"] == "error"]
    warnings = [x for x in issues if x["level"] == "warning"]
    result["issues"] = issues
    if errors and spec.critical:
        result["status"] = "critical"
    elif errors or warnings:
        result["status"] = "warning"
    else:
        result["status"] = "ok"

    age = result.get("age_min") or 0
    freshness_penalty = min(35, max(0, round((age - spec.sla_min) / max(1, spec.sla_min) * 35)))
    issue_penalty = len(errors) * 22 + len(warnings) * 8
    completeness = 100 if result["items"] >= spec.min_items else round(100 * result["items"] / max(1, spec.min_items))
    completeness_penalty = round((100 - completeness) * 0.35)
    result["health_score"] = max(0, min(100, 100 - freshness_penalty - issue_penalty - completeness_penalty))
    result["sla_min"] = spec.sla_min
    result["critical"] = spec.critical

    prev = (state.get("sources") or {}).get(spec.name) or {}
    audit_records = []
    if prev.get("sha256") and prev.get("sha256") != result["sha256"]:
        audit_records.append({
            "ts": now_iso(),
            "source": spec.name,
            "field": "file_hash",
            "before": prev.get("sha256"),
            "after": result["sha256"],
            "size_before": prev.get("size_bytes"),
            "size_after": result["size_bytes"],
        })
    if audit_records:
        append_jsonl(AUDIT_LOG, audit_records)

    state.setdefault("sources", {})[spec.name] = {
        "sha256": result["sha256"],
        "size_bytes": result["size_bytes"],
        "validated_at": now_iso(),
        "items": result["items"],
        "status": result["status"],
    }

    trace["status"] = result["status"]
    trace["duration_ms"] = round((utc_now() - started).total_seconds() * 1000)
    result["trace"] = trace
    return result


def source_lineage_for_event(ev: dict[str, Any]) -> list[str]:
    sources = ["espn"]
    wx = ev.get("winamax") or {}
    if wx.get("available") or wx.get("match_id"):
        sources.append("winamax")
    if ev.get("weather"):
        sources.append("weather")
    if ev.get("referee") or ev.get("referee_context"):
        sources.append("sofascore_referees")
    if ev.get("lineups"):
        sources.append("sofascore_lineups")
    if ev.get("injuries") or ev.get("injuries_source"):
        sources.append("injuries")
    if ev.get("clubelo"):
        sources.append("clubelo")
    if ev.get("smart_money"):
        sources.append("smart_money")
    for c in ev.get("competitors") or []:
        if c.get("xg_stats") or c.get("fbref_xg") or c.get("xg_for_avg") is not None:
            sources.append("xg")
            break
    return sorted(set(sources))


def build_lineage_summary() -> dict[str, Any]:
    try:
        data = load_data_js()
    except Exception as exc:
        return {"status": "error", "error": str(exc)[:200], "events": 0}
    counts: dict[str, int] = {}
    missing = 0
    total = 0
    samples = []
    for _, ev in iter_events(data):
        total += 1
        lineage = ev.get("lineage")
        if not lineage:
            missing += 1
            lineage = source_lineage_for_event(ev)
        for source in lineage:
            counts[source] = counts.get(source, 0) + 1
        if len(samples) < 8:
            samples.append({
                "event_id": ev.get("id"),
                "sport": ev.get("sport"),
                "league": ev.get("league_code") or ev.get("league_name"),
                "lineage": lineage,
            })
    return {
        "generated_at": now_iso(),
        "status": "ok",
        "events": total,
        "events_missing_inline_lineage": missing,
        "coverage_pct": round(100 * (total - missing) / total, 1) if total else 0,
        "source_counts": dict(sorted(counts.items(), key=lambda kv: kv[1], reverse=True)),
        "sample": samples,
    }


def build_quality_kpis(results: list[dict[str, Any]]) -> dict[str, Any]:
    scores = [r.get("health_score", 0) for r in results if r.get("present")]
    by_source = {
        r["source"]: {
            "score": r.get("health_score", 0),
            "status": r.get("status"),
            "items": r.get("items", 0),
            "age_min": r.get("age_min"),
            "sla_min": r.get("sla_min"),
            "issues": len(r.get("issues") or []),
        }
        for r in results
    }
    return {
        "generated_at": now_iso(),
        "sources_total": len(results),
        "sources_ok": sum(1 for r in results if r.get("status") == "ok"),
        "sources_warning": sum(1 for r in results if r.get("status") == "warning"),
        "sources_critical": sum(1 for r in results if r.get("status") == "critical"),
        "source_health_avg": round(statistics.mean(scores), 1) if scores else 0,
        "source_health_min": min(scores) if scores else 0,
        "by_source": by_source,
    }


def build_data_anomalies(results: list[dict[str, Any]]) -> list[dict[str, Any]]:
    anomalies = []
    for r in results:
        score = int(r.get("health_score") or 0)
        if r.get("status") == "critical" or score < 50:
            anomalies.append({
                "ts": now_iso(),
                "type": "source_health_outlier",
                "source": r["source"],
                "score": score,
                "status": r.get("status"),
                "issues": [x.get("code") for x in (r.get("issues") or [])[:6]],
            })
        for item in (r.get("issues") or []):
            if item.get("code") in {"bad_odd", "high_odd_review", "freshness_sla"}:
                anomalies.append({
                    "ts": now_iso(),
                    "type": item.get("code"),
                    "source": r["source"],
                    "level": item.get("level"),
                    "message": item.get("message"),
                    "sample": item.get("sample"),
                })
    return anomalies[:100]


def compact_trace_summary(traces: list[dict[str, Any]]) -> dict[str, Any]:
    existing = []
    if TRACE_LOG.exists():
        try:
            existing = [json.loads(line) for line in TRACE_LOG.read_text(encoding="utf-8").splitlines()[-300:] if line.strip()]
        except Exception:
            existing = []
    merged = existing + traces
    by_status: dict[str, int] = {}
    by_script: dict[str, dict[str, Any]] = {}
    for row in merged:
        status = row.get("status") or "unknown"
        by_status[status] = by_status.get(status, 0) + 1
        script = row.get("script") or "unknown"
        prev = by_script.get(script) or {"runs": 0, "errors": 0, "last_status": None, "max_duration_ms": 0}
        prev["runs"] += 1
        prev["last_status"] = status
        prev["max_duration_ms"] = max(prev["max_duration_ms"], int(row.get("duration_ms") or 0))
        if status in {"critical", "parse_error", "missing", "error"}:
            prev["errors"] += 1
        by_script[script] = prev
    return {
        "generated_at": now_iso(),
        "runs_observed": len(merged),
        "by_status": by_status,
        "by_script": by_script,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true", help="exit 1 on critical validation failure")
    args = parser.parse_args(argv)

    state = load_state()
    results = []
    traces = []
    for spec in SPECS:
        result = validate_source(spec, state)
        traces.append(result.pop("trace"))
        results.append(result)
    save_state(state)

    quarantine_records = [item for result in results for item in (result.get("issues") or []) if item.get("level") in {"error", "warning"}]
    QUARANTINE.write_text(
        "".join(json.dumps(x, ensure_ascii=False, separators=(",", ":")) + "\n" for x in quarantine_records),
        encoding="utf-8",
    )
    append_jsonl(TRACE_LOG, traces)

    lineage = build_lineage_summary()
    kpis = build_quality_kpis(results)
    anomalies = build_data_anomalies(results)
    if anomalies:
        append_jsonl(ANOMALIES, anomalies)

    status = "healthy"
    if any(r.get("status") == "critical" for r in results):
        status = "critical"
    elif any(r.get("status") == "warning" for r in results):
        status = "degraded"

    report = {
        "generated_at": now_iso(),
        "schema_version": SCHEMA_VERSION,
        "status": status,
        "sources_validated": len(results),
        "sources_ok": kpis["sources_ok"],
        "sources_warning": kpis["sources_warning"],
        "sources_critical": kpis["sources_critical"],
        "quarantine_records": len(quarantine_records),
        "anomalies_emitted": len(anomalies),
        "results": results,
        "lineage": lineage,
        "kpis": kpis,
    }

    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    SOURCE_HEALTH.write_text(json.dumps(kpis, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    LINEAGE_SUMMARY.write_text(json.dumps(lineage, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    QUALITY_KPIS.write_text(json.dumps(kpis, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    TRACE_SUMMARY.write_text(json.dumps(compact_trace_summary(traces), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        f"[data-integrity] status={status} ok={kpis['sources_ok']} "
        f"warning={kpis['sources_warning']} critical={kpis['sources_critical']} "
        f"quarantine={len(quarantine_records)}"
    )
    return 1 if args.strict and status == "critical" else 0


if __name__ == "__main__":
    raise SystemExit(main())

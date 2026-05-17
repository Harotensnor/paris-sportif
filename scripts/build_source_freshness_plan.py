#!/usr/bin/env python3
"""Build a source-specific freshness plan for the local desktop app."""
from __future__ import annotations

import gzip
import json
import os
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
HEALTH = ROOT / "health.json"
PREMATCH = ROOT / "prematch_focus_report.json"
OUT = ROOT / "source_freshness_plan.json"

SOURCE_RULES = {
    "lineups_soccer": {"label": "Compositions", "source": "lineups", "target_min": 180, "near_weight": 3},
    "injuries_soccer": {"label": "Blessures", "source": "injuries", "target_min": 180, "near_weight": 3},
    "weather": {"label": "Météo", "source": "weather", "target_min": 120, "near_weight": 2},
    "referees_soccer": {"label": "Arbitres", "source": "referees", "target_min": 480, "near_weight": 1},
    "h2h_extended": {"label": "H2H", "source": "h2h", "target_min": 720, "near_weight": 1},
    "team_stats": {"label": "Stats équipes", "source": "team_stats", "target_min": 300, "near_weight": 1},
    "match_context": {"label": "Dossiers contexte", "source": "context", "target_min": 60, "near_weight": 2},
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def read_json(path: Path, fallback: Any) -> Any:
    try:
        parsed = json.loads(path.read_text(encoding="utf-8"))
        return parsed if parsed is not None else fallback
    except Exception:
        return fallback


def source_age(row: dict[str, Any]) -> float | None:
    try:
        value = float(row.get("age_min"))
        return value if value == value else None
    except Exception:
        return None


def parse_ts(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        raw = str(value).replace("Z", "+00:00")
        parsed = datetime.fromisoformat(raw)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        return None


def source_file_age_min(key: str, now: datetime) -> tuple[float | None, str | None]:
    candidates = [ROOT / f"{key}.json", ROOT / f"{key}.json.gz"]
    for path in candidates:
        if not path.exists():
            continue
        generated_at = None
        if path.suffix == ".json":
            payload = read_json(path, {})
            if isinstance(payload, dict):
                generated_at = payload.get("generated_at") or payload.get("updated_at") or payload.get("fetched_at")
        elif path.suffixes[-2:] == [".json", ".gz"]:
            try:
                with gzip.open(path, "rt", encoding="utf-8") as fh:
                    payload = json.load(fh)
                if isinstance(payload, dict):
                    generated_at = payload.get("generated_at") or payload.get("updated_at") or payload.get("fetched_at")
            except Exception:
                generated_at = None
        parsed = parse_ts(generated_at)
        if parsed is None:
            parsed = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc)
        return max(0.0, (now - parsed).total_seconds() / 60.0), path.name
    return None, None


def write_text_atomic(path: Path, text: str, encoding: str = "utf-8") -> None:
    target = Path(path)
    fd, tmp_path = tempfile.mkstemp(prefix=f".{target.name}.", suffix=".tmp", dir=str(target.parent))
    try:
        with os.fdopen(fd, "w", encoding=encoding) as fh:
            fh.write(text)
        last_error: OSError | None = None
        for attempt in range(18):
            try:
                os.replace(tmp_path, target)
                return
            except OSError as exc:
                last_error = exc
                errno = getattr(exc, "errno", None)
                winerror = getattr(exc, "winerror", None)
                if errno not in (13, 22, 32) and winerror not in (5, 32, 33):
                    break
                time.sleep(min(0.15 * (attempt + 1), 1.5))
        if last_error is not None:
            raise last_error
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def build_report() -> dict[str, Any]:
    health = read_json(HEALTH, {})
    prematch = read_json(PREMATCH, {})
    sources = health.get("sources") if isinstance(health.get("sources"), dict) else {}
    focus_by_source = prematch.get("by_source") if isinstance(prematch.get("by_source"), dict) else {}
    rows: list[dict[str, Any]] = []
    now = datetime.now(timezone.utc)
    for key, rule in SOURCE_RULES.items():
        src = sources.get(key) or {}
        age = source_age(src)
        direct_age, age_source = source_file_age_min(key, now)
        if direct_age is not None and (age is None or direct_age < age):
            age = direct_age
        target = float(rule["target_min"])
        due_age = age is None or age > target
        near = int(focus_by_source.get(rule["source"], 0) or 0)
        score = (max(0.0, (age or 0) - target) / max(target, 1)) * 50
        score += near * float(rule.get("near_weight") or 1)
        if age is None:
            score += 80
        needs_attention = due_age or near > 0
        priority = (
            "critical"
            if rule["source"] in {"lineups", "injuries"} and due_age
            else "high"
            if score >= 40 or near >= 12
            else "medium"
            if score >= 12 or near > 0
            else "low"
        )
        rows.append({
            "key": key,
            "label": rule["label"],
            "source": rule["source"],
            "age_min": age,
            "age_source": age_source or "health",
            "target_min": target,
            "focus_matches": near,
            "priority": priority,
            "score": round(score, 1),
            "due": due_age,
            "needs_attention": needs_attention,
            "mode": "signals",
            "command": ["python", "desktop/bin/refresh_once.py", "--signals", "--signal-source", rule["source"]],
            "detail": f"{rule['label']} : âge {round(age) if age is not None else 'inconnu'} min, cible {round(target)} min, {near} matchs focus.",
        })
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    rows.sort(key=lambda row: (order.get(row["priority"], 9), -float(row["score"]), row["label"]))
    due = [row for row in rows if row.get("due")]
    attention = [row for row in rows if row.get("needs_attention")]
    counts: dict[str, int] = {}
    for row in rows:
        counts[row["priority"]] = counts.get(row["priority"], 0) + 1
    return {
        "schema": "paris-sportif.source_freshness_plan.v1",
        "generated_at": utc_now(),
        "summary": {
            "sources": len(rows),
            "due": len(due),
            "attention": len(attention),
            "critical": counts.get("critical", 0),
            "high": counts.get("high", 0),
            "first": rows[0]["label"] if rows else None,
        },
        "sources": rows,
        "limits": [
            "Priorités locales : elles guident le refresh, elles ne garantissent pas que la source gratuite publie une donnée.",
            "Lineups et blessures montent plus vite en priorité près du coup d'envoi.",
        ],
    }


def main() -> int:
    report = build_report()
    write_text_atomic(OUT, json.dumps(report, ensure_ascii=False, separators=(",", ":")) + "\n")
    s = report.get("summary") or {}
    print(f"[source_freshness] sources={s.get('sources', 0)} due={s.get('due', 0)} first={s.get('first') or '-'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

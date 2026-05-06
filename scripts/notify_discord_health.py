#!/usr/bin/env python3
"""Proactive Discord alerts for pipeline/data/model health.

No-op when DISCORD_WEBHOOK_URL is absent. Alerts are deduplicated locally so a
red source does not spam every cron tick.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEBHOOK = os.environ.get("DISCORD_WEBHOOK_URL", "").strip()
STATE = ROOT / "discord_health_alert_state.json"


def load_json(name: str) -> dict:
    path = ROOT / name
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def load_state() -> dict:
    if not STATE.exists():
        return {"sent": {}}
    try:
        return json.loads(STATE.read_text(encoding="utf-8"))
    except Exception:
        return {"sent": {}}


def save_state(state: dict) -> None:
    cutoff = time.time() - 24 * 3600
    state["sent"] = {k: v for k, v in (state.get("sent") or {}).items() if float(v) >= cutoff}
    STATE.write_text(json.dumps(state, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def candidates() -> list[dict]:
    health = load_json("health.json")
    integrity = load_json("data_integrity_report.json")
    memory = load_json("performance-memory-report.json")
    alerts = []

    pipeline = (health.get("sections") or {}).get("pipeline") or {}
    red_sources = int(pipeline.get("sources_red") or 0)
    if red_sources >= 5:
        alerts.append({"kind": "pipeline_red", "title": "Pipeline: 5+ sources rouges", "body": f"{red_sources} sources rouges, data age {health.get('data_age_min')}min"})

    if integrity.get("status") == "critical" or int(integrity.get("sources_critical") or 0) > 0:
        alerts.append({"kind": "data_integrity", "title": "Validation data critique", "body": f"{integrity.get('sources_critical')} source(s) critiques, {integrity.get('quarantine_records')} quarantaines"})

    if int(integrity.get("anomalies_emitted") or 0) > 0:
        alerts.append({"kind": "data_anomaly", "title": "Anomalies data détectées", "body": f"{integrity.get('anomalies_emitted')} anomalie(s) émises"})

    if (memory.get("status") or "").lower() == "leak":
        alerts.append({"kind": "memory_leak", "title": "Memory leak détecté", "body": json.dumps(memory.get("summary") or memory, ensure_ascii=False)[:900]})

    return alerts


def post(alert: dict) -> None:
    payload = {
        "username": "Paris-Sportif Health",
        "embeds": [{
            "title": alert["title"],
            "description": alert["body"],
            "color": 0xF59E0B,
            "footer": {"text": "Health monitor · data integrity"},
        }],
    }
    req = urllib.request.Request(
        WEBHOOK,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "paris-sportif-health/1.0"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=12) as resp:
        if resp.status >= 300:
            raise RuntimeError(f"Discord HTTP {resp.status}")


def main() -> int:
    if not WEBHOOK:
        print("[discord-health] DISCORD_WEBHOOK_URL absent, skip")
        return 0
    state = load_state()
    sent = 0
    for alert in candidates():
        key = hashlib.sha1(f"{alert['kind']}:{alert['body']}".encode("utf-8")).hexdigest()
        if key in state.get("sent", {}):
            continue
        post(alert)
        state.setdefault("sent", {})[key] = time.time()
        sent += 1
    save_state(state)
    print(f"[discord-health] sent={sent}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

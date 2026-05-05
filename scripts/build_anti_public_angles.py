#!/usr/bin/env python3
"""Build a clean anti-public / smart-money angle sidecar from local odds moves.

No external public-split dependency: this uses ``event.smart_money`` already
patched from ``odds_history.jsonl`` and explicitly separates active upcoming
angles from expired historical signals.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
OUT = ROOT / "anti_public_angles.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_data() -> dict[str, Any]:
    text = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"=\s*(\{.*\})\s*;?\s*$", text, re.DOTALL)
    if not match:
        raise RuntimeError("could not parse data.js")
    return json.loads(match.group(1))


def parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def classify(signal: dict[str, Any]) -> tuple[str, str]:
    uncertain = signal.get("market_uncertain")
    if uncertain:
        return "market_uncertain", str(uncertain.get("reason") or "Mouvement de cote incoherent")
    side = signal.get("side") or "unknown"
    open_odd = signal.get("odd_open") or 0
    drop = signal.get("odd_drop_pct") or 0
    if open_odd >= 2.5:
        return "underdog_steam", f"Cote outsider compressee de {drop:.1f}%"
    if open_odd <= 1.7:
        return "favorite_steam", f"Favori confirme par mouvement de cote {drop:.1f}%"
    return "balanced_steam", f"Mouvement cote net {drop:.1f}% sur {side}"


def event_label(event: dict[str, Any]) -> str:
    return str(event.get("name") or event.get("shortName") or "")


def main() -> int:
    data = parse_data()
    now = datetime.now(timezone.utc)
    active: list[dict[str, Any]] = []
    expired: list[dict[str, Any]] = []
    by_type: dict[str, int] = {}
    for day_events in (data.get("days") or {}).values():
        for event in day_events or []:
            signal = event.get("smart_money")
            if not isinstance(signal, dict):
                continue
            kind, reason = classify(signal)
            by_type[kind] = by_type.get(kind, 0) + 1
            kickoff = parse_dt(event.get("date"))
            row = {
                "event_id": event.get("id") or event.get("uid"),
                "kickoff": event.get("date"),
                "sport": event.get("sport"),
                "league": event.get("league_code") or event.get("league_name"),
                "match": event_label(event),
                "side": signal.get("side"),
                "pick_key": signal.get("pick_key"),
                "type": kind,
                "reason": reason,
                "odd_open": signal.get("odd_open"),
                "odd_latest": signal.get("odd_latest"),
                "odd_drop_pct": signal.get("odd_drop_pct"),
                "confidence": signal.get("confidence"),
                "snapshots": signal.get("snapshots"),
            }
            if kickoff and kickoff >= now - timedelta(minutes=10) and not event.get("completed"):
                active.append(row)
            elif len(expired) < 80:
                expired.append(row)
    out = {
        "generated_at": now_iso(),
        "source": "data.js event.smart_money derived from odds_history",
        "status": "ok" if active else ("watch" if expired else "empty"),
        "summary": {
            "active": len(active),
            "expired_sample": len(expired),
            "by_type": by_type,
        },
        "active": active[:80],
        "expired_sample": expired,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"anti_public_angles: active={len(active)} expired_sample={len(expired)} types={by_type}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

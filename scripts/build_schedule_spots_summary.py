#!/usr/bin/env python3
"""Summarize lookahead, travel and fatigue spots from detected_angles.json.

This sidecar is intentionally local-only: it does not fetch anything. It turns
the raw angle list into a compact decision layer for the UI/model:
lean home, lean away, abstain, or monitor.
"""
from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
IN_PATH = ROOT / "detected_angles.json"
OUT = ROOT / "schedule_spots_summary.json"

SCHEDULE_TYPES = {
    "lookahead",
    "back_to_back_travel",
    "travel_extreme",
    "schedule_congestion",
}
TRAVEL_TYPES = {"back_to_back_travel", "travel_extreme"}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


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


def norm(value: Any) -> str:
    return " ".join(str(value or "").lower().split())


def dedupe_key(event: dict[str, Any]) -> str:
    kickoff = str(event.get("date") or "")[:16]
    return "|".join([
        norm(event.get("sport")),
        norm(event.get("league_code") or event.get("league_name")),
        kickoff,
        norm(event.get("home")),
        norm(event.get("away")),
    ])


def angle_impact(angle: dict[str, Any]) -> float:
    strength = float(angle.get("strength") or 0)
    direction = str(angle.get("direction") or "").lower()
    if direction == "caution":
        return strength * 0.45
    if direction in {"fade", "abstain"}:
        return strength
    return strength * 0.5


def side_scores(angles: list[dict[str, Any]]) -> tuple[float, float]:
    home_fade = 0.0
    away_fade = 0.0
    for angle in angles:
        side = str(angle.get("side") or "").lower()
        impact = angle_impact(angle)
        if side == "home":
            home_fade += impact
        elif side == "away":
            away_fade += impact
    return home_fade, away_fade


def classify_decision(home: str, away: str, home_fade: float, away_fade: float) -> tuple[str, str | None, str]:
    gap = away_fade - home_fade
    if home_fade > 0 and away_fade > 0 and abs(gap) < 0.15:
        return "abstain", None, f"Fatigue/agenda des deux cotes: {home} {home_fade:.2f}, {away} {away_fade:.2f}"
    if gap >= 0.15:
        return "lean_home", home, f"{away} plus penalise par calendrier/voyage ({away_fade:.2f} vs {home_fade:.2f})"
    if gap <= -0.15:
        return "lean_away", away, f"{home} plus penalise par calendrier/voyage ({home_fade:.2f} vs {away_fade:.2f})"
    return "monitor", None, "Signal calendrier present mais direction nette insuffisante"


def summarize_event(event: dict[str, Any]) -> dict[str, Any] | None:
    angles = [a for a in event.get("angles") or [] if isinstance(a, dict) and a.get("type") in SCHEDULE_TYPES]
    if not angles:
        return None
    home = str(event.get("home") or "Domicile")
    away = str(event.get("away") or "Exterieur")
    home_fade, away_fade = side_scores(angles)
    decision, net_team, reason = classify_decision(home, away, home_fade, away_fade)
    type_counts = Counter(str(a.get("type")) for a in angles)
    pressure_score = sum(float(a.get("strength") or 0) for a in angles)
    row = {
        "event_id": event.get("event_id"),
        "source_event_ids": [event.get("event_id")],
        "kickoff": event.get("date"),
        "sport": event.get("sport"),
        "league_code": event.get("league_code"),
        "league_name": event.get("league_name"),
        "home": home,
        "away": away,
        "match": f"{home} - {away}",
        "decision": decision,
        "net_team": net_team,
        "reason": reason,
        "pressure_score": round(pressure_score, 3),
        "home_fade": round(home_fade, 3),
        "away_fade": round(away_fade, 3),
        "travel_score": round(sum(float(a.get("strength") or 0) for a in angles if a.get("type") in TRAVEL_TYPES), 3),
        "lookahead_score": round(sum(float(a.get("strength") or 0) for a in angles if a.get("type") == "lookahead"), 3),
        "congestion_score": round(sum(float(a.get("strength") or 0) for a in angles if a.get("type") == "schedule_congestion"), 3),
        "types": dict(type_counts),
        "contexts": [str(a.get("context") or "") for a in angles if a.get("context")][:4],
        "global_resolution": event.get("signal_resolution") or {},
    }
    return row


def merge_row(current: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    ids = list(dict.fromkeys((current.get("source_event_ids") or []) + (candidate.get("source_event_ids") or [])))
    if candidate.get("pressure_score", 0) > current.get("pressure_score", 0):
        candidate["source_event_ids"] = ids
        return candidate
    current["source_event_ids"] = ids
    return current


def main() -> int:
    data = load_json(IN_PATH, {})
    now = datetime.now(timezone.utc)
    active_map: dict[str, dict[str, Any]] = {}
    expired_map: dict[str, dict[str, Any]] = {}
    by_type = Counter()
    by_decision = Counter()

    for event in data.get("events") or []:
        if not isinstance(event, dict):
            continue
        row = summarize_event(event)
        if not row:
            continue
        by_type.update(row.get("types") or {})
        kickoff = parse_dt(row.get("kickoff"))
        target = active_map if kickoff and kickoff >= now - timedelta(minutes=10) else expired_map
        key = dedupe_key(event)
        target[key] = merge_row(target[key], row) if key in target else row

    active = list(active_map.values())
    expired = list(expired_map.values())
    active.sort(key=lambda r: (
        {"abstain": 0, "lean_home": 1, "lean_away": 1, "monitor": 2}.get(str(r.get("decision")), 3),
        -(float(r.get("pressure_score") or 0)),
        str(r.get("kickoff") or ""),
    ))
    expired.sort(key=lambda r: str(r.get("kickoff") or ""), reverse=True)
    by_decision.update(str(r.get("decision") or "unknown") for r in active)

    out = {
        "generated_at": now_iso(),
        "schema": "schedule_spots_summary_v1",
        "source": "detected_angles.json lookahead/travel/fatigue only",
        "status": "ok" if active else ("watch" if expired else "empty"),
        "summary": {
            "active_events": len(active),
            "expired_sample": min(len(expired), 80),
            "by_type": dict(by_type),
            "by_decision": dict(by_decision),
            "lean_home": by_decision.get("lean_home", 0),
            "lean_away": by_decision.get("lean_away", 0),
            "abstain": by_decision.get("abstain", 0),
            "monitor": by_decision.get("monitor", 0),
        },
        "active": active[:120],
        "expired_sample": expired[:80],
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    s = out["summary"]
    print(
        "schedule_spots_summary: "
        f"active={s['active_events']} abstain={s['abstain']} "
        f"lean_home={s['lean_home']} lean_away={s['lean_away']} monitor={s['monitor']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Inject public web context signals into data.js.

The patch is intentionally display/context oriented: it enriches match sheets
and explanations, but it does not add or replace any odds. All actionnable
prices remain Winamax-only.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

try:
    from scripts._data_io import load_data_js, save_data_js, write_text_atomic
except ModuleNotFoundError:  # pragma: no cover - direct script execution
    from _data_io import load_data_js, save_data_js, write_text_atomic


ROOT = Path(__file__).resolve().parent.parent
SIGNALS_PATH = ROOT / "public_match_signals.json"
REPORT_PATH = ROOT / "public_match_signals_patch_report.json"


def compact_text(value: Any, limit: int = 260) -> str:
    text = " ".join(str(value or "").split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def event_key(event: dict[str, Any]) -> str:
    return str(
        event.get("id")
        or event.get("uid")
        or (event.get("winamax") or {}).get("match_id")
        or f"{event.get('name')}::{event.get('date')}"
    )


def load_signals() -> dict[str, Any]:
    if not SIGNALS_PATH.exists():
        return {"version": 1, "matches": []}
    try:
        data = json.loads(SIGNALS_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {"version": 1, "matches": []}
    except Exception:
        return {"version": 1, "matches": []}


def compact_team(team: dict[str, Any]) -> dict[str, Any]:
    profile = team.get("profile") or {}
    coach = team.get("coach") or None
    tactical = team.get("tactical") or {}
    return {
        "name": team.get("name") or team.get("label") or "",
        "label": team.get("label") or team.get("name") or "",
        "status": team.get("status") or "missing",
        "quality": team.get("quality") or 0,
        "entityId": team.get("entityId") or "",
        "profile": {
            "title": profile.get("title") or "",
            "url": profile.get("url") or "",
            "extract": compact_text(profile.get("extract"), 300),
            "thumbnail": profile.get("thumbnail") or "",
            "source": profile.get("source") or "",
        },
        "coach": {
            "name": coach.get("name") or "",
            "entityId": coach.get("entityId") or "",
            "source": coach.get("source") or "",
            "startDate": coach.get("startDate") or "",
            "confidence": coach.get("confidence") or "",
        } if isinstance(coach, dict) and coach.get("name") else None,
        "tactical": {
            "style": tactical.get("style") or "",
            "read": compact_text(tactical.get("read"), 240),
            "tags": [str(tag) for tag in (tactical.get("tags") or [])[:4]],
            "source": tactical.get("source") or "",
        },
        "signals": [compact_text(signal, 160) for signal in (team.get("signals") or [])[:5]],
        "sources": [
            {
                "label": source.get("label") or "Source publique",
                "url": source.get("url") or "",
                "status": source.get("status") or "",
                "detail": compact_text(source.get("detail"), 160),
                "checkedAt": source.get("checkedAt") or "",
            }
            for source in (team.get("sources") or [])[:4]
        ],
    }


def compact_match(match: dict[str, Any]) -> dict[str, Any]:
    teams = match.get("teams") or {}
    return {
        "version": 1,
        "status": match.get("status") or "missing",
        "quality": match.get("quality") or 0,
        "source": "public_web_wikidata_wikipedia",
        "policy": "context_only_winamax_odds_only",
        "fetchedAt": match.get("fetchedAt") or "",
        "summary": match.get("summary") or {},
        "signals": [compact_text(signal, 180) for signal in (match.get("signals") or [])[:8]],
        "teams": {
            "home": compact_team(teams.get("home") or {}),
            "away": compact_team(teams.get("away") or {}),
        },
        "sources": [
            {
                "label": source.get("label") or "Source publique",
                "url": source.get("url") or "",
                "status": source.get("status") or "",
                "detail": compact_text(source.get("detail"), 180),
                "checkedAt": source.get("checkedAt") or "",
            }
            for source in (match.get("sources") or [])[:10]
        ],
    }


def merge_context_sources(event: dict[str, Any], match: dict[str, Any]) -> None:
    context = event.setdefault("context", {})
    sources = context.setdefault("sources", [])
    if not isinstance(sources, list):
        sources = []
        context["sources"] = sources
    sources[:] = [source for source in sources if source.get("key") != "public_web"]
    ok_count = int((match.get("summary") or {}).get("sourceCount") or 0)
    sources.append(
        {
            "key": "public_web",
            "status": "ok" if ok_count else "missing",
            "detail": f"{ok_count} preuve(s) publique(s) Wikidata/Wikipedia",
            "age_min": 0,
            "ttl_min": 240,
        }
    )


def merge_competitor(event: dict[str, Any], side: str, team: dict[str, Any]) -> bool:
    competitors = event.get("competitors") or []
    target = None
    for competitor in competitors:
        if isinstance(competitor, dict) and str(competitor.get("home_away") or "") == side:
            target = competitor
            break
    if target is None and side == "home" and competitors:
        target = competitors[0]
    if target is None and side == "away" and len(competitors) > 1:
        target = competitors[1]
    if not isinstance(target, dict):
        return False
    target["public_profile"] = team.get("profile") or {}
    target["public_signals"] = {
        "quality": team.get("quality") or 0,
        "signals": team.get("signals") or [],
        "sources": team.get("sources") or [],
    }
    coach = team.get("coach")
    if coach and coach.get("name"):
        target["coach_public"] = coach
    tactical = team.get("tactical") or {}
    if tactical.get("style") or tactical.get("read"):
        target["tactical_public"] = tactical
    return True


def main() -> int:
    signals = load_signals()
    matches = signals.get("matches") or []
    by_event: dict[str, dict[str, Any]] = {}
    by_winamax: dict[str, dict[str, Any]] = {}
    for match in matches:
        if not isinstance(match, dict):
            continue
        if match.get("eventId"):
            by_event[str(match.get("eventId"))] = match
        if match.get("winamaxMatchId"):
            by_winamax[str(match.get("winamaxMatchId"))] = match

    data = load_data_js()
    patched = 0
    competitor_patches = 0
    coach_patches = 0
    source_patches = 0
    for day in (data.get("days") or {}).values():
        events = day if isinstance(day, list) else day.get("events", []) if isinstance(day, dict) else []
        for event in events:
            if not isinstance(event, dict):
                continue
            raw_match = by_event.get(event_key(event)) or by_winamax.get(str((event.get("winamax") or {}).get("match_id") or ""))
            if not raw_match:
                continue
            compact = compact_match(raw_match)
            event["public_signals"] = compact
            context = event.setdefault("context", {})
            context["public_signals"] = compact
            merge_context_sources(event, compact)
            source_patches += 1
            for side, team in (compact.get("teams") or {}).items():
                if merge_competitor(event, side, team):
                    competitor_patches += 1
                if (team.get("coach") or {}).get("name"):
                    coach_patches += 1
            patched += 1

    size = save_data_js(data)
    report = {
        "version": 1,
        "generated_at": signals.get("generated_at"),
        "patched_matches": patched,
        "patched_competitors": competitor_patches,
        "coach_signals": coach_patches,
        "source_rows": source_patches,
        "data_js_bytes": size,
        "policy": "context_only_winamax_odds_only",
    }
    write_text_atomic(REPORT_PATH, json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(
        "[public-signals-patch] "
        f"matches={patched} competitors={competitor_patches} coaches={coach_patches} bytes={size}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

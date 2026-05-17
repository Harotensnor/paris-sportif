#!/usr/bin/env python3
"""Build a compact daily insights sidecar from existing local data.

This file intentionally uses only repository-owned artifacts. It turns the
already-built intelligence sidecars into a short briefing that can be rendered
on the dashboard without running model code in Python.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from zoneinfo import ZoneInfo
except Exception:  # pragma: no cover - old Python fallback
    ZoneInfo = None  # type: ignore

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
OUT = ROOT / "daily_insights.json"

SIDEFILES = {
    "league": ROOT / "league_inefficiencies.json",
    "market_bias": ROOT / "market_biases_by_league.json",
    "angles": ROOT / "detected_angles.json",
    "rare": ROOT / "rare_signals.json",
    "timing": ROOT / "timing_edges.json",
    "gaps": ROOT / "signal_gap_report.json",
    "clv": ROOT / "clv_summary.json",
    "market_auc": ROOT / "market_auc_report.json",
}


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def paris_tz():
    if ZoneInfo:
        try:
            return ZoneInfo("Europe/Paris")
        except Exception:
            pass
    return datetime.now().astimezone().tzinfo or timezone.utc


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


def load_data() -> dict[str, Any]:
    if not DATA_JS.exists():
        return {}
    txt = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$", txt, re.DOTALL)
    if not match:
        return {}
    try:
        data = json.loads(match.group(1))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def iter_events(data: dict[str, Any]):
    for events in (data.get("days") or {}).values():
        for ev in events or []:
            if isinstance(ev, dict):
                yield ev


def side_name(ev: dict[str, Any], side: str) -> str:
    for c in ev.get("competitors") or []:
        if isinstance(c, dict) and c.get("home_away") == side:
            return str(c.get("name") or c.get("displayName") or c.get("shortDisplayName") or "").strip()
    name = str(ev.get("name") or "")
    if " at " in name:
        away, home = name.split(" at ", 1)
        return home.strip() if side == "home" else away.strip()
    if " - " in name:
        home, away = name.split(" - ", 1)
        return home.strip() if side == "home" else away.strip()
    return ""


def event_title(ev: dict[str, Any]) -> str:
    home = side_name(ev, "home")
    away = side_name(ev, "away")
    if home and away:
        return f"{home} - {away}"
    return str(ev.get("shortName") or ev.get("name") or "Match").strip()


def league_code(ev: dict[str, Any]) -> str:
    return str(ev.get("league_code") or ev.get("league") or ev.get("league_slug") or "").strip()


def is_bookable(ev: dict[str, Any]) -> bool:
    w = ev.get("winamax") or {}
    return bool(isinstance(w, dict) and w.get("available") is True)


def fmt_pct(value: Any, digits: int = 1) -> str:
    try:
        n = float(value)
    except Exception:
        n = 0.0
    return f"{n:+.{digits}f}%"


def add_insight(out: list[dict[str, Any]], *, kind: str, kicker: str, title: str, body: str,
                tone: str = "info", priority: float = 50, event_id: Any = None,
                source: str = "") -> None:
    out.append({
        "id": f"{kind}:{len(out) + 1}",
        "kind": kind,
        "kicker": kicker[:42],
        "title": title[:92],
        "body": body[:180],
        "tone": tone,
        "priority": round(float(priority), 2),
        "event_id": str(event_id or ""),
        "source": source,
    })


def first_list(d: dict[str, Any], *keys: str) -> list[Any]:
    for key in keys:
        value = d.get(key)
        if isinstance(value, list):
            return value
    return []


def main() -> int:
    data = load_data()
    side = {name: load_json(path) for name, path in SIDEFILES.items()}
    now = now_utc()
    paris = paris_tz()
    today = now.astimezone(paris).date()

    events = [ev for ev in iter_events(data) if is_bookable(ev)]
    upcoming: list[dict[str, Any]] = []
    today_events: list[dict[str, Any]] = []
    for ev in events:
        dt = parse_dt(ev.get("date") or ev.get("commence_time"))
        if not dt:
            continue
        ev["_ts"] = dt.timestamp()
        if dt >= now:
            upcoming.append(ev)
        if dt.astimezone(paris).date() == today:
            today_events.append(ev)

    upcoming.sort(key=lambda ev: ev.get("_ts") or 0)
    today_upcoming = [ev for ev in today_events if (ev.get("_ts") or 0) >= now.timestamp()]
    next36 = [ev for ev in upcoming if (ev.get("_ts") or 0) <= now.timestamp() + 36 * 3600]
    slate = today_upcoming or next36[:80]

    insights: list[dict[str, Any]] = []

    sports = Counter(str(ev.get("sport") or "unknown") for ev in slate)
    leagues = Counter(league_code(ev) or str(ev.get("league_name") or "unknown") for ev in slate)
    if slate:
        top_sport, top_sport_n = sports.most_common(1)[0]
        top_league, top_league_n = leagues.most_common(1)[0]
        add_insight(
            insights,
            kind="slate",
            kicker="Briefing jour",
            title=f"{len(slate)} matchs Winamax a surveiller",
            body=f"Sport dominant: {top_sport} ({top_sport_n}). Ligue la plus dense: {top_league} ({top_league_n}). Priorite: trier par score, pas par volume.",
            tone="info",
            priority=76,
            source="data.js",
        )

    league_rows = first_list(side["league"], "leagues")
    league_focus = [
        row for row in league_rows
        if isinstance(row, dict)
        and row.get("status") in {"exploit", "avoid_low_roi", "avoid_low_wr", "avoid"}
        and int(row.get("current_upcoming") or 0) > 0
    ]
    league_focus.sort(key=lambda row: (row.get("status") != "exploit", -abs(float(row.get("flat_roi_pct") or 0)), -int(row.get("current_upcoming") or 0)))
    if league_focus:
        row = league_focus[0]
        status = str(row.get("status") or "")
        add_insight(
            insights,
            kind="league_bias",
            kicker="Biais ligue" if status == "exploit" else "Prudence ligue",
            title=f"{row.get('league_code') or 'ligue'} · {status.replace('_', ' ')}",
            body=f"{row.get('reason') or 'Signal historique'} · ROI {fmt_pct(row.get('flat_roi_pct'))} · {row.get('current_upcoming')} matchs dans le slate.",
            tone="good" if status == "exploit" else "warn",
            priority=92 if status == "exploit" else 78,
            source="league_inefficiencies.json",
        )

    markets = first_list(side["market_bias"], "watchlist") or [
        row for row in first_list(side["market_bias"], "markets")
        if isinstance(row, dict) and row.get("status") in {"exploit", "fade", "low_value"}
    ]
    if markets:
        row = markets[0] if isinstance(markets[0], dict) else {}
        status = str(row.get("status") or row.get("market_status") or "watch")
        add_insight(
            insights,
            kind="market_bias",
            kicker="Marche a suivre" if status == "watch" else "Biais marche",
            title=f"{row.get('label') or row.get('market') or 'Marche'} · {row.get('pick') or ''}".strip(),
            body=str(row.get("context") or row.get("reason") or "Sample encore faible: on surveille sans sur-vendre le signal."),
            tone="good" if status == "exploit" else "warn" if status in {"fade", "low_value"} else "info",
            priority=68,
            source="market_biases_by_league.json",
        )

    rare = [
        row for row in first_list(side["rare"], "signals")
        if isinstance(row, dict) and parse_dt(row.get("date")) and parse_dt(row.get("date")) >= now
    ]
    rare.sort(key=lambda row: (parse_dt(row.get("date")) or now).timestamp())
    if rare:
        row = rare[0]
        sig = row.get("signal") if isinstance(row.get("signal"), dict) else {}
        add_insight(
            insights,
            kind="rare_signal",
            kicker="Signal rare",
            title=f"{row.get('home') or '?'} - {row.get('away') or '?'}",
            body=str(sig.get("context") or f"{sig.get('type') or 'Signal'} detecte"),
            tone="warn" if sig.get("direction") in {"fade", "abstain", "mixed"} else "hot",
            priority=84,
            event_id=row.get("event_id"),
            source="rare_signals.json",
        )

    timing = [
        row for row in first_list(side["timing"], "events")
        if isinstance(row, dict) and row.get("advice") and row.get("advice") != "bet_now_if_selected"
        and parse_dt(row.get("date")) and parse_dt(row.get("date")) >= now
    ]
    timing.sort(key=lambda row: (parse_dt(row.get("date")) or now).timestamp())
    if timing:
        row = timing[0]
        move = row.get("best_move") if isinstance(row.get("best_move"), dict) else {}
        move_text = ""
        if move.get("side"):
            move_text = f" · {move.get('side')} {move.get('from')} -> {move.get('to')}"
        add_insight(
            insights,
            kind="timing",
            kicker="Timing cote",
            title=f"{row.get('home') or '?'} - {row.get('away') or '?'}",
            body=f"{row.get('advice')} dans {int(float(row.get('minutes_to_kickoff') or 0))} min{move_text}",
            tone="warn" if "wait" in str(row.get("advice")) else "good",
            priority=82,
            event_id=row.get("event_id"),
            source="timing_edges.json",
        )

    clv = side["clv"].get("summary") if isinstance(side["clv"].get("summary"), dict) else {}
    if clv:
        mean = float(clv.get("mean_clv_pct") or 0)
        positive = float(clv.get("positive_clv_rate") or 0)
        add_insight(
            insights,
            kind="clv",
            kicker="Qualite marche",
            title=f"CLV moyen {fmt_pct(mean, 2)}",
            body=f"{positive:.1f}% des lignes battent la cloture sur {clv.get('n_matches') or 0} matchs suivis.",
            tone="good" if mean > 0.3 else "warn" if mean < -0.3 else "info",
            priority=74,
            source="clv_summary.json",
        )

    gaps = first_list(side["gaps"], "priority_gaps")
    if gaps:
        g = max((row for row in gaps if isinstance(row, dict)), key=lambda row: float(row.get("priority") or 0), default=None)
        if g:
            missing = ", ".join((g.get("missing") or [])[:4]) if isinstance(g.get("missing"), list) else "source"
            add_insight(
                insights,
                kind="data_gap",
                kicker="Data a combler",
                title=str(g.get("match") or f"{g.get('home') or '?'} - {g.get('away') or '?'}"),
                body=f"Priorite {float(g.get('priority') or 0):.0f}: manque {missing}.",
                tone="warn",
                priority=62,
                event_id=g.get("event_id"),
                source="signal_gap_report.json",
            )

    auc_summary = side["market_auc"].get("summary") if isinstance(side["market_auc"].get("summary"), dict) else {}
    if auc_summary:
        watch = int(auc_summary.get("watch") or 0)
        excluded = int(auc_summary.get("exclude_low_auc") or 0)
        if watch or excluded:
            add_insight(
                insights,
                kind="auc_guard",
                kicker="Garde-fou AUC",
                title="Marches sous surveillance",
                body=f"{watch} marches en watch, {excluded} exclus Big Bets: le modele ne sur-vend pas les samples faibles.",
                tone="info",
                priority=58,
                source="market_auc_report.json",
            )

    insights.sort(key=lambda row: (-float(row.get("priority") or 0), row.get("kind") or ""))
    insights = insights[:8]

    output = {
        "schema": "daily_insights_v1",
        "generated_at": now.isoformat().replace("+00:00", "Z"),
        "source": "data.js + local intelligence sidecars",
        "summary": {
            "today": str(today),
            "events_today": len(today_events),
            "events_upcoming_today": len(today_upcoming),
            "events_next_36h": len(next36),
            "insights": len(insights),
            "top_sport": sports.most_common(1)[0][0] if sports else None,
            "top_sport_events": sports.most_common(1)[0][1] if sports else 0,
            "sources_loaded": sum(1 for value in side.values() if value),
        },
        "insights": insights,
    }
    OUT.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"daily_insights: {len(insights)} insights -> {OUT.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

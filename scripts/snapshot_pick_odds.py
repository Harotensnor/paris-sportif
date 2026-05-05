#!/usr/bin/env python3
"""Append odds snapshots for active archived picks.

Rows are appended to odds_history.jsonl with both legacy ``id`` and the richer
pick-level fields.  Existing CLV/backtest scripts keep ignoring fields they do
not know, while newer diagnostics can measure line movement per market.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from _data_io import load_data_js
from picks_history_lib import event_index, parse_dt, read_history

ROOT = Path(__file__).resolve().parent.parent
ODDS_HISTORY = ROOT / "odds_history.jsonl"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def num(v: Any) -> float | None:
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return x if x == x and 1.01 <= x <= 50 else None


def current_pick_odd(event: dict, pick: dict) -> float | None:
    markets = ((event.get("winamax") or {}).get("markets") or {})
    mk = pick.get("market_key")
    sel = str(pick.get("selection") or "")
    if mk == "1n2":
        one = markets.get("1n2") or {}
        return num(one.get("home") if sel == "1" else one.get("away") if sel == "2" else one.get("draw"))
    if mk == "btts":
        b = markets.get("btts") or {}
        return num(b.get("yes") if sel == "BTTS_Y" else b.get("no"))
    if mk == "dnb":
        for row in markets.get("dnb_rows") or []:
            if (sel == "DNB_1" and row.get("side") == "home") or (sel == "DNB_2" and row.get("side") == "away"):
                return num(row.get("odd"))
    if mk == "ou":
        wanted_side = "over" if sel.startswith("O") else "under"
        wanted_line = sel[1:]
        for row in markets.get("ou") or []:
            if str(row.get("line")) == wanted_line and row.get("side") == wanted_side:
                return num(row.get("odd"))
    if mk == "htTotal":
        wanted_side = "over" if "_O" in sel else "under"
        wanted_line = sel.split("_", 1)[1][1:] if "_" in sel else ""
        for row in markets.get("ht_ou") or []:
            if str(row.get("line")) == wanted_line and row.get("side") == wanted_side:
                return num(row.get("odd"))
    if mk == "teamTotal":
        team, rest = sel.split("_", 1) if "_" in sel else ("", "")
        wanted_team = "home" if team == "HOME" else "away"
        wanted_side = "over" if rest.startswith("O") else "under"
        wanted_line = rest[1:]
        for row in markets.get("team_total") or []:
            if str(row.get("line")) == wanted_line and row.get("team") == wanted_team and row.get("side") == wanted_side:
                return num(row.get("odd"))
    if mk == "exactScore":
        rows = markets.get("exact_score_rows") or []
        for row in rows:
            if str(row.get("score") or row.get("side")) == sel:
                return num(row.get("odd"))
        exact = markets.get("exact_scores") or {}
        return num(exact.get(sel))
    return None


def load_recent_pick_rows() -> dict[str, list[dict]]:
    rows: dict[str, list[dict]] = {}
    if not ODDS_HISTORY.exists():
        return rows
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    for line in ODDS_HISTORY.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            rec = json.loads(line)
        except json.JSONDecodeError:
            continue
        key = rec.get("pick_archive_key")
        if not key:
            continue
        ts = parse_dt(rec.get("ts") or rec.get("captured_at"))
        if ts and ts < cutoff:
            continue
        rows.setdefault(str(key), []).append(rec)
    return rows


def main() -> int:
    data = load_data_js()
    idx = event_index(data)
    history = read_history()
    existing = load_recent_pick_rows()
    now = datetime.now(timezone.utc)
    ts = now_iso()
    appended = 0
    with ODDS_HISTORY.open("a", encoding="utf-8") as handle:
        for key, pick in history.items():
            if pick.get("result") != "pending":
                continue
            ko = parse_dt(pick.get("kickoff_utc"))
            if not ko or ko < now - timedelta(minutes=30) or ko > now + timedelta(days=7):
                continue
            last_rows = sorted(existing.get(key, []), key=lambda r: r.get("ts") or r.get("captured_at") or "")
            last_dt = parse_dt(last_rows[-1].get("ts") or last_rows[-1].get("captured_at")) if last_rows else None
            if last_dt and (now - last_dt).total_seconds() < 240:
                continue
            ev = idx.get(str(pick.get("match_id") or "")) or idx.get(str(pick.get("source_event_id") or ""))
            if not ev:
                continue
            odd_now = current_pick_odd(ev, pick)
            if not odd_now:
                continue
            opening = num(last_rows[0].get("odd_now")) if last_rows else num(pick.get("odd_book"))
            one_hour_ago = [r for r in last_rows if (parse_dt(r.get("ts") or r.get("captured_at")) or now) <= now - timedelta(hours=1)]
            reference = num((one_hour_ago[-1] if one_hour_ago else last_rows[0]).get("odd_now")) if last_rows else opening
            movement = ((odd_now - opening) / opening) if opening else 0
            hourly = ((odd_now - reference) / reference) if reference else 0
            close = odd_now if now >= ko - timedelta(minutes=10) else None
            rec = {
                "ts": ts,
                "captured_at": ts,
                "id": pick.get("source_event_id") or pick.get("match_id"),
                "match_id": pick.get("match_id"),
                "pick_archive_key": key,
                "market_key": pick.get("market_key"),
                "selection": pick.get("selection"),
                "sport": pick.get("sport"),
                "league_code": pick.get("league"),
                "date": pick.get("kickoff_utc"),
                "name": f"{pick.get('home')} - {pick.get('away')}",
                "odd_open": round(opening, 3) if opening else None,
                "odd_now": round(odd_now, 3),
                "odd_close": round(close, 3) if close else None,
                "line_movement_pct": round(movement * 100, 2),
                "sharp_action_flag": abs(hourly) >= 0.08,
            }
            handle.write(json.dumps(rec, ensure_ascii=False, separators=(",", ":")) + "\n")
            appended += 1
    print(f"[snapshot_pick_odds] appended={appended}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

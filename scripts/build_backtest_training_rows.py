#!/usr/bin/env python3
"""Build row-level training rows from settled Winamax events.

The frontend cannot run a heavy ML dependency, but the offline pipeline needs
one honest row table before `train_lightgbm.py` can move beyond aggregate
fallback weights.  This file exports compact JSONL rows from data already in
the repo: settled events, Winamax 1N2 odds, result, and local signal features.
"""
from __future__ import annotations

import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
OUT_ROWS = ROOT / "backtest_training_rows.jsonl"
OUT_SUMMARY = ROOT / "backtest_training_rows_summary.json"


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _load_data() -> dict[str, Any]:
    text = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$", text, re.DOTALL)
    if not match:
        raise RuntimeError("cannot parse data.js")
    return json.loads(match.group(1))


def _float(value: Any, default: float | None = None) -> float | None:
    try:
        v = float(value)
        if math.isfinite(v):
            return v
    except Exception:
        pass
    return default


def _side(ev: dict[str, Any], name: str) -> dict[str, Any]:
    for comp in ev.get("competitors") or []:
        if comp.get("home_away") == name:
            return comp
    return {}


def _score(comp: dict[str, Any]) -> int | None:
    try:
        return int(float(comp.get("score")))
    except Exception:
        return None


def _winner(ev: dict[str, Any]) -> str | None:
    home = _side(ev, "home")
    away = _side(ev, "away")
    hs = _score(home)
    aw = _score(away)
    if hs is not None and aw is not None:
        if hs > aw:
            return "home"
        if aw > hs:
            return "away"
        return "draw"
    if home.get("winner") is True:
        return "home"
    if away.get("winner") is True:
        return "away"
    return None


def _winamax_1n2(ev: dict[str, Any]) -> dict[str, float]:
    markets = ((ev.get("winamax") or {}).get("markets") or {})
    one = markets.get("1n2") or markets.get("winner") or {}
    if not isinstance(one, dict):
        return {}
    out: dict[str, float] = {}
    aliases = {
        "home": ("home", "1", "domicile"),
        "draw": ("draw", "X", "nul"),
        "away": ("away", "2", "exterieur", "extérieur"),
    }
    for side, names in aliases.items():
        for key in names:
            odd = _float(one.get(key))
            if odd and odd > 1:
                out[side] = odd
                break
    return out


def _elo(comp: dict[str, Any]) -> float | None:
    val = comp.get("elo")
    if isinstance(val, dict):
        return _float(val.get("value"))
    return _float(val)


def _form_wins(comp: dict[str, Any]) -> float | None:
    stats = comp.get("form_stats") or {}
    wins = _float(stats.get("wins5"))
    played = _float(stats.get("played5"))
    if wins is None or not played:
        return None
    return wins / played


def _xg(comp: dict[str, Any], field: str) -> float | None:
    xg_stats = comp.get("xg_stats") or comp.get("fbref_xg") or {}
    for key in (field, f"xg_{field}", f"{field}_avg"):
        val = _float(xg_stats.get(key) if isinstance(xg_stats, dict) else None)
        if val is not None:
            return val
    return _float(comp.get(f"xg_{field}_avg"))


def _row_features(ev: dict[str, Any]) -> dict[str, Any]:
    home = _side(ev, "home")
    away = _side(ev, "away")
    home_elo = _elo(home)
    away_elo = _elo(away)
    weather = ev.get("weather") or {}
    referee = ev.get("referee") or ev.get("referee_context") or {}
    return {
        "sport": ev.get("sport") or "unknown",
        "league_code": ev.get("league_code") or "unknown",
        "league_name": ev.get("league_name") or "",
        "home_elo": home_elo,
        "away_elo": away_elo,
        "elo_diff": (home_elo - away_elo) if home_elo is not None and away_elo is not None else None,
        "home_form_wr5": _form_wins(home),
        "away_form_wr5": _form_wins(away),
        "home_xg_for": _xg(home, "for"),
        "away_xg_for": _xg(away, "for"),
        "home_xg_against": _xg(home, "against"),
        "away_xg_against": _xg(away, "against"),
        "injuries_home": len(home.get("injuries") or []) or _float(ev.get("injuries_home"), 0),
        "injuries_away": len(away.get("injuries") or []) or _float(ev.get("injuries_away"), 0),
        "has_lineups": bool(ev.get("lineups") or home.get("lineup") or away.get("lineup")),
        "has_referee_exact": bool((ev.get("referee") or {}).get("name")),
        "has_referee_signal": bool((referee or {}).get("yellowPerGame") or (referee or {}).get("cardsPerGame")),
        "ref_yellow_per_game": _float((referee or {}).get("yellowPerGame")),
        "weather_wind_kmh": _float(weather.get("wind_kmh")),
        "weather_precip_mm": _float(weather.get("precip_mm")),
    }


def build_rows(data: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for day, events in (data.get("days") or {}).items():
        for ev in events or []:
            if not ev.get("completed"):
                continue
            winner = _winner(ev)
            if winner is None:
                continue
            odds = _winamax_1n2(ev)
            if not odds:
                continue
            base = _row_features(ev)
            base.update({
                "event_id": str(ev.get("id") or ""),
                "date": ev.get("date") or "",
                "day": day,
            })
            for side, odd in odds.items():
                if side == "draw" and ev.get("sport") != "football":
                    continue
                rows.append({
                    **base,
                    "market": "1n2",
                    "pick_side": side,
                    "odd": round(float(odd), 4),
                    "implied_prob": round(1 / float(odd), 6),
                    "label": 1 if winner == side else 0,
                })
    return rows


def main() -> int:
    data = _load_data()
    rows = build_rows(data)
    OUT_ROWS.write_text(
        "".join(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n" for row in rows),
        encoding="utf-8",
    )
    by_sport: dict[str, int] = {}
    by_league: dict[str, int] = {}
    positives = sum(1 for row in rows if row.get("label") == 1)
    for row in rows:
        by_sport[row["sport"]] = by_sport.get(row["sport"], 0) + 1
        by_league[row["league_code"]] = by_league.get(row["league_code"], 0) + 1
    summary = {
        "generated_at": _now(),
        "schema": "paris-sportif.backtest_training_rows.v1",
        "source": "data.js settled Winamax 1n2 events",
        "rows": len(rows),
        "positive_rows": positives,
        "positive_rate": round(positives / len(rows), 4) if rows else 0,
        "by_sport": dict(sorted(by_sport.items())),
        "top_leagues": dict(sorted(by_league.items(), key=lambda item: (-item[1], item[0]))[:20]),
        "feature_policy": "local_features_only_no_runtime_dependency",
    }
    OUT_SUMMARY.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[training_rows] rows={len(rows)} positives={positives} sports={len(by_sport)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

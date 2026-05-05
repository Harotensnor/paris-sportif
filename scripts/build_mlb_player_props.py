#!/usr/bin/env python3
"""Derive MLB pitcher prop signals from already-patched local data.

This is Section J4 without any new service: ``patch_mlb_pitchers.py`` already
injects probable pitchers and season rates into ``data.js``. We convert those
rates into transparent player-prop projections (strikeouts and HR allowed)
for downstream UI/model work.
"""
from __future__ import annotations

import json
import math
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
OUT = ROOT / "mlb_player_props.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_data() -> dict[str, Any]:
    text = DATA_JS.read_text(encoding="utf-8")
    match = re.search(r"=\s*(\{.*\})\s*;?\s*$", text, re.DOTALL)
    if not match:
        raise RuntimeError("could not parse data.js")
    return json.loads(match.group(1))


def parse_kickoff(value: Any) -> datetime | None:
    if not value:
        return None
    raw = str(value).replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def num(value: Any, default: float | None = None) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normal_cdf(x: float, mu: float, sigma: float) -> float:
    if sigma <= 0:
        return 1.0 if x >= mu else 0.0
    return 0.5 * (1.0 + math.erf((x - mu) / (sigma * math.sqrt(2.0))))


def fair_odds(prob: float) -> float | None:
    if prob <= 0:
        return None
    return round(1.0 / max(0.01, min(0.99, prob)), 2)


def sides(event: dict[str, Any]) -> tuple[str, str]:
    comps = event.get("competitors") or []
    home = next((c for c in comps if c.get("home_away") == "home"), comps[0] if comps else {})
    away = next((c for c in comps if c.get("home_away") == "away"), comps[1] if len(comps) > 1 else {})
    return str(home.get("name") or "Domicile"), str(away.get("name") or "Extérieur")


def projected_ip(pitcher: dict[str, Any]) -> float:
    ip = num(pitcher.get("ip"))
    gs = num(pitcher.get("gs"))
    if ip is not None and gs and gs > 0:
        return max(3.0, min(6.6, ip / gs))
    return 4.8


def strikeout_prop(pitcher: dict[str, Any], team: str) -> dict[str, Any] | None:
    k9 = num(pitcher.get("k9"))
    if k9 is None or k9 <= 0:
        return None
    exp_ip = projected_ip(pitcher)
    expected_k = max(0.5, k9 * exp_ip / 9.0)
    line = max(2.5, min(9.5, math.floor(expected_k) + 0.5))
    sigma = max(1.15, math.sqrt(expected_k) * 0.78)
    p_over = 1.0 - normal_cdf(line, expected_k, sigma)
    p_under = 1.0 - p_over
    pick = "over" if p_over >= p_under else "under"
    prob = p_over if pick == "over" else p_under
    label_side = "plus de" if pick == "over" else "moins de"
    line_fr = str(line).replace(".", ",")
    return {
        "market": "pitcher_strikeouts",
        "team": team,
        "pitcher": pitcher.get("name") or "Lanceur",
        "label": f"{pitcher.get('name') or 'Lanceur'} {label_side} {line_fr} strikeouts",
        "line": line,
        "pick": pick,
        "probability": round(prob, 4),
        "fair_odds": fair_odds(prob),
        "expected_strikeouts": round(expected_k, 2),
        "projected_ip": round(exp_ip, 2),
        "inputs": {
            "k9": k9,
            "era": num(pitcher.get("era")),
            "whip": num(pitcher.get("whip")),
            "hand": pitcher.get("hand"),
        },
    }


def hr_allowed_prop(pitcher: dict[str, Any], team: str) -> dict[str, Any] | None:
    hr9 = num(pitcher.get("hr9"))
    if hr9 is None or hr9 < 0:
        return None
    exp_ip = projected_ip(pitcher)
    lam = max(0.0, hr9 * exp_ip / 9.0)
    p_yes = 1.0 - math.exp(-lam)
    p_no = 1.0 - p_yes
    pick = "yes" if p_yes >= p_no else "no"
    prob = p_yes if pick == "yes" else p_no
    suffix = "concède au moins 1 home run" if pick == "yes" else "ne concède pas de home run"
    return {
        "market": "pitcher_home_run_allowed",
        "team": team,
        "pitcher": pitcher.get("name") or "Lanceur",
        "label": f"{pitcher.get('name') or 'Lanceur'} {suffix}",
        "pick": pick,
        "probability": round(prob, 4),
        "fair_odds": fair_odds(prob),
        "expected_hr_allowed": round(lam, 3),
        "projected_ip": round(exp_ip, 2),
        "inputs": {"hr9": hr9, "era": num(pitcher.get("era")), "whip": num(pitcher.get("whip"))},
    }


def main() -> int:
    data = parse_data()
    now = datetime.now(timezone.utc)
    events: list[dict[str, Any]] = []
    for day_events in (data.get("days") or {}).values():
        for event in day_events or []:
            if str(event.get("sport") or "").lower() != "baseball":
                continue
            if event.get("completed"):
                continue
            kickoff_dt = parse_kickoff(event.get("date"))
            if kickoff_dt and kickoff_dt < now - timedelta(minutes=10):
                continue
            pitchers = event.get("mlb_pitchers") or {}
            if not isinstance(pitchers, dict):
                continue
            home_team, away_team = sides(event)
            props: list[dict[str, Any]] = []
            for slot, team in (("home", home_team), ("away", away_team)):
                pitcher = pitchers.get(slot)
                if not isinstance(pitcher, dict):
                    continue
                for builder in (strikeout_prop, hr_allowed_prop):
                    prop = builder(pitcher, team)
                    if prop:
                        prop["side"] = slot
                        props.append(prop)
            if not props:
                continue
            events.append({
                "event_id": event.get("id") or event.get("uid"),
                "kickoff": event.get("date"),
                "league": event.get("league_name") or event.get("league_code"),
                "match": event.get("name") or event.get("shortName"),
                "home": home_team,
                "away": away_team,
                "props": props,
            })
    out = {
        "generated_at": now_iso(),
        "source": "derived from mlb_pitchers already patched into data.js",
        "status": "ok" if events else "empty",
        "events": events,
        "props": sum(len(e.get("props") or []) for e in events),
        "markets": ["pitcher_strikeouts", "pitcher_home_run_allowed"],
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"mlb_player_props: events={len(events)} props={out['props']} status={out['status']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

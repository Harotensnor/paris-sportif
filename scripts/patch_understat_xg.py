#!/usr/bin/env python3
"""Patcher: inject Understat xG stats into data.js football competitors."""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
XG_JSON = ROOT / "xg_team_stats.json"

ALIASES = {
    "psg": "parissaintgermain",
    "parissg": "parissaintgermain",
    "manutd": "manchesterunited",
    "manunited": "manchesterunited",
    "manchesterutd": "manchesterunited",
    "mancity": "manchestercity",
    "newcastleutd": "newcastleunited",
    "newcastle": "newcastleunited",
    "spurs": "tottenhamhotspur",
    "tottenham": "tottenhamhotspur",
    "wolves": "wolverhamptonwanderers",
    "nottmforest": "nottinghamforest",
    "brightonhovealbion": "brighton",
    "afcbournemouth": "bournemouth",
    "inter": "internazionale",
    "intermilan": "internazionale",
    "acmilan": "milan",
    "napoli": "sscnapoli",
    "roma": "asroma",
    "lazio": "ssclazio",
    "atletico": "atleticomadrid",
    "atletimadrid": "atleticomadrid",
    "athleticbilbao": "athleticclub",
    "bayernmunich": "bayernmunchen",
    "bayernmunchen": "bayernmunchen",
    "bayern": "bayernmunchen",
    "dortmund": "borussiadortmund",
    "bayerleverkusen": "bayer04leverkusen",
    "leverkusen": "bayer04leverkusen",
    "monchengladbach": "borussiamonchengladbach",
    "gladbach": "borussiamonchengladbach",
    "rb Leipzig".lower().replace(" ", ""): "rbleipzig",
    "marseille": "olympiquedemarseille",
    "lyon": "olympiquelyonnais",
    "monaco": "asmonaco",
}


def _norm(name: str | None) -> str:
    if not name:
        return ""
    s = unicodedata.normalize("NFD", str(name)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _find(name: str, by_team: dict) -> dict | None:
    key = _norm(name)
    if key in by_team:
        return by_team[key]
    alias = ALIASES.get(key)
    if alias and alias in by_team:
        return by_team[alias]
    if len(key) >= 6:
        prefix = key[:6]
        candidates = [stats for norm, stats in by_team.items() if norm.startswith(prefix)]
        if len(candidates) == 1:
            return candidates[0]
    return None


def main() -> int:
    if not XG_JSON.exists():
        print("[understat_xg] xg_team_stats.json missing, skip")
        return 0
    raw = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$", raw, re.DOTALL)
    if not m:
        print("[understat_xg] PRONOSTICS_DATA not found", file=sys.stderr)
        return 1
    data = json.loads(m.group(1))
    xg = json.loads(XG_JSON.read_text(encoding="utf-8"))
    by_team = xg.get("by_team") or {}
    patched_competitors = 0
    patched_events = 0
    for events in (data.get("days") or {}).values():
        for ev in events or []:
            if ev.get("sport") != "football":
                continue
            event_patched = False
            for c in ev.get("competitors") or []:
                if not isinstance(c, dict):
                    continue
                stats = _find(c.get("name") or "", by_team)
                if not stats:
                    continue
                payload = {
                    "source": "understat",
                    "team": stats.get("team"),
                    "league_code": stats.get("league_code"),
                    "matches_played": stats.get("matches_played"),
                    "xg_l10": stats.get("xg_l10"),
                    "xga_l10": stats.get("xga_l10"),
                    "xg_per90": stats.get("xg_per90"),
                    "xga_per90": stats.get("xga_per90"),
                    "xg_diff_l10": stats.get("xg_diff_l10"),
                    "ppda": stats.get("ppda"),
                    "ppda_allowed": stats.get("ppda_allowed"),
                }
                c["xg_stats"] = payload
                c["fbref_xg"] = {
                    "xg_for_avg": stats.get("xg_l10"),
                    "xg_against_avg": stats.get("xga_l10"),
                    "matches_played": stats.get("matches_played"),
                    "goals_diff": stats.get("xg_diff_l10"),
                    "source": "understat",
                }
                c["xg_for_avg"] = stats.get("xg_l10")
                c["xg_against_avg"] = stats.get("xga_l10")
                patched_competitors += 1
                event_patched = True
            if event_patched:
                ev["xg_source"] = "understat"
                patched_events += 1
    DATA_JS.write_text(
        f"window.PRONOSTICS_DATA = {json.dumps(data, ensure_ascii=False, separators=(',', ':'))};",
        encoding="utf-8",
    )
    print(f"[understat_xg] patched {patched_events} events / {patched_competitors} competitors")
    return 0


if __name__ == "__main__":
    sys.exit(main())

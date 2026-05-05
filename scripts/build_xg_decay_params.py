from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._data_io import ROOT, load_data_js


OUT_JSON = ROOT / "xg_decay_params.json"
OUT_JS = ROOT / "xg_decay_params.js"


TOP5 = {"eng.1", "fra.1", "ita.1", "esp.1", "ger.1"}
SLOW_TOP = {"esp.1", "ger.1"}
VOLATILE_HINTS = ("sudamericana", "libertadores", "asia", "j.1", "jleague", "j-league", "kleague", "k-league", "saudi")


def _param_for(code: str, name: str) -> dict[str, Any]:
    c = code.lower()
    n = name.lower()
    if c in SLOW_TOP:
        return {"decay_k": 0.08, "profile": "top5_stable", "reason": "Liga/Bundesliga : forme récente importante mais plus stable."}
    if c in TOP5:
        return {"decay_k": 0.10, "profile": "top5_short_form", "reason": "Top-5 foot : forme courte pondérée."}
    if any(h in c or h in n for h in VOLATILE_HINTS):
        return {"decay_k": 0.15, "profile": "volatile_short_form", "reason": "Ligue volatile : forme très récente priorisée."}
    return {"decay_k": 0.10, "profile": "default_football", "reason": "Paramètre standard football."}


def build() -> dict[str, Any]:
    data = load_data_js()
    leagues: dict[str, dict[str, Any]] = {}
    for events in (data.get("days") or {}).values():
        for event in events or []:
            if str(event.get("sport") or "").lower() != "football":
                continue
            code = str(event.get("league_code") or event.get("league_name") or "unknown")
            name = str(event.get("league_name") or code)
            if code in leagues:
                continue
            p = _param_for(code, name)
            leagues[code] = {
                "league_code": code,
                "league_name": name,
                **p,
                "last_updated": datetime.now(timezone.utc).isoformat(),
            }
    payload = {
        "schema": "xg_decay_params.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "league_count": len(leagues),
        "leagues": dict(sorted(leagues.items())),
    }
    return payload


def write_outputs(payload: dict[str, Any]) -> None:
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    compact = {
        "schema": payload["schema"],
        "generated_at": payload["generated_at"],
        "league_count": payload["league_count"],
        "leagues": {
            key: [value["decay_k"], value["profile"], value["reason"], value["league_name"]]
            for key, value in payload["leagues"].items()
        },
    }
    OUT_JS.write_text(
        "window.XG_DECAY_PARAMS = "
        + json.dumps(compact, ensure_ascii=False, separators=(",", ":"))
        + ";\n",
        encoding="utf-8",
    )


def main() -> int:
    payload = build()
    write_outputs(payload)
    print(f"[xg_decay_params] leagues={payload['league_count']}")
    return 0 if payload["league_count"] >= 5 else 1


if __name__ == "__main__":
    raise SystemExit(main())

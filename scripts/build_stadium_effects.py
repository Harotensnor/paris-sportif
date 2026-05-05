from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._data_io import ROOT, load_data_js


OUT_JSON = ROOT / "stadium_effects.json"
OUT_JS = ROOT / "stadium_effects.js"


ALTITUDE_HINTS = {
    "la paz": 3640,
    "quito": 2850,
    "bogota": 2640,
    "mexico city": 2240,
    "toluca": 2660,
    "potosi": 3900,
    "cochabamba": 2550,
    "denver": 1609,
}


def _norm(value: str | None) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in str(value or "").strip()).strip("-") or "unknown"


def _altitude(city: str | None, country: str | None) -> int:
    raw = f"{city or ''} {country or ''}".lower()
    for key, alt in ALTITUDE_HINTS.items():
        if key in raw:
            return alt
    if "bolivia" in raw:
        return 2200
    if "mexico" in raw:
        return 1600
    return 0


def build() -> dict[str, Any]:
    data = load_data_js()
    stadiums: dict[str, dict[str, Any]] = {}
    for events in (data.get("days") or {}).values():
        for event in events or []:
            venue = event.get("venue") or event.get("site") or event.get("city") or event.get("name")
            city = event.get("city") or ""
            country = event.get("country") or ""
            key = _norm(f"{venue}-{city}-{country}")
            if key in stadiums:
                stadiums[key]["sample_matches"] += 1
                continue
            capacity = int(event.get("attendance") or 0)
            if capacity <= 0:
                capacity = 42000 if str(event.get("sport")) == "football" else 18000
            surface = "ice" if event.get("sport") == "hockey" else "hardwood" if event.get("sport") == "basketball" else "grass"
            altitude = _altitude(city, country)
            stadiums[key] = {
                "stadium_id": key,
                "name": venue,
                "city": city,
                "country": country,
                "sport": event.get("sport") or "unknown",
                "altitude_m": altitude,
                "capacity": capacity,
                "surface_type": surface,
                "dimensions": None,
                "weather_avg": None,
                "goal_adjustment": 0.10 if altitude > 1500 and event.get("sport") == "football" else 0,
                "sample_matches": 1,
            }
    payload = {
        "schema": "stadium_effects.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "stadium_count": len(stadiums),
        "stadiums": dict(sorted(stadiums.items())),
    }
    return payload


def write_outputs(payload: dict[str, Any]) -> None:
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    compact = {
        "schema": payload["schema"],
        "generated_at": payload["generated_at"],
        "stadium_count": payload["stadium_count"],
        "stadiums": {
            key: [v["name"], v["city"], v["country"], v["sport"], v["altitude_m"], v["capacity"], v["surface_type"], v["goal_adjustment"]]
            for key, v in payload["stadiums"].items()
        },
    }
    OUT_JS.write_text("window.STADIUM_EFFECTS = " + json.dumps(compact, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")


def main() -> int:
    payload = build()
    write_outputs(payload)
    print(f"[stadium_effects] stadiums={payload['stadium_count']}")
    return 0 if payload["stadium_count"] >= 150 else 1


if __name__ == "__main__":
    raise SystemExit(main())

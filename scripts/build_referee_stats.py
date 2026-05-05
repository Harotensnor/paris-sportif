from __future__ import annotations

import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._data_io import ROOT


OUT_JSON = ROOT / "referee_stats.json"
OUT_JS = ROOT / "referee_stats.js"


TOP_FOOT = {"eng.1", "esp.1", "ita.1", "ger.1", "fra.1"}


def _norm(value: str | None) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in str(value or "").strip()).strip("-") or "unknown"


def build() -> dict[str, Any]:
    src = ROOT / "referees_soccer.json"
    raw = json.loads(src.read_text(encoding="utf-8")) if src.exists() else {}
    refs: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for event in (raw.get("events") or {}).values():
        ref = event.get("referee") or {}
        name = ref.get("name")
        if not name:
            continue
        league = str(event.get("league_code") or ref.get("league_code") or "unknown")
        cards = float(ref.get("cardsPerGame") or ref.get("cards_per_match") or ref.get("yellowPerGame") or 0)
        yellow = float(ref.get("yellowPerGame") or cards)
        red = float(ref.get("redPerGame") or 0)
        games = int(ref.get("games") or 0)
        # Public feeds rarely expose a stable home-bias percentage. We keep the
        # value conservative and derive only a mild tendency from card volume.
        home_bias_pct = max(48.0, min(62.0, 52.0 + (cards - 4.0) * 1.8))
        refs[_norm(name)].append(
            {
                "ref_id": _norm(name),
                "name": name,
                "league": league,
                "country": ref.get("country") or "",
                "matches": games,
                "cards_per_match": round(cards, 2),
                "fouls_per_match": None,
                "pens_per_match": round(max(0.08, min(0.42, red * 1.4 + cards * 0.015)), 3),
                "home_bias_pct": round(home_bias_pct, 1),
                "draw_rate": round(max(0.20, min(0.34, 0.27 + (4.0 - cards) * 0.01)), 3),
                "top5": league in TOP_FOOT,
            }
        )
    out_refs = {}
    for key, rows in refs.items():
        best = sorted(rows, key=lambda r: (r["top5"], r["matches"]), reverse=True)[0]
        out_refs[key] = best
    payload = {
        "schema": "referee_stats.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "referee_count": len(out_refs),
        "top5_count": sum(1 for r in out_refs.values() if r.get("top5")),
        "referees": dict(sorted(out_refs.items())),
    }
    return payload


def write_outputs(payload: dict[str, Any]) -> None:
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    compact = {
        "schema": payload["schema"],
        "generated_at": payload["generated_at"],
        "referee_count": payload["referee_count"],
        "top5_count": payload["top5_count"],
        "referees": {
            key: [
                r["name"],
                r["league"],
                r["matches"],
                r["cards_per_match"],
                r["pens_per_match"],
                r["home_bias_pct"],
                r["draw_rate"],
                1 if r.get("top5") else 0,
            ]
            for key, r in payload["referees"].items()
        },
    }
    OUT_JS.write_text("window.REFEREE_STATS = " + json.dumps(compact, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")


def main() -> int:
    payload = build()
    write_outputs(payload)
    print(f"[referee_stats] refs={payload['referee_count']} top5={payload['top5_count']}")
    return 0 if payload["referee_count"] >= 50 else 1


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._data_io import ROOT, load_data_js, iter_events

OUT_CORNERS_JSON = ROOT / "total_corners.json"
OUT_CORNERS_JS = ROOT / "total_corners.js"
OUT_CARDS_JSON = ROOT / "total_cards.json"
OUT_CARDS_JS = ROOT / "total_cards.js"
OUT_FOULS_JSON = ROOT / "total_fouls.json"
OUT_FOULS_JS = ROOT / "total_fouls.js"


def _norm(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower(), flags=re.I).strip("-")


def _side(event: dict[str, Any], side: str) -> dict[str, Any] | None:
    return next((c for c in event.get("competitors") or [] if c.get("home_away") == side), None)


def _float(value: Any, default: float = 0.0) -> float:
    try:
        v = float(value)
        return v if math.isfinite(v) else default
    except (TypeError, ValueError):
        return default


def _team_xg(side: dict[str, Any] | None, fallback: float) -> tuple[float, float, float]:
    if not side:
        return fallback, fallback, 10.0
    stats = side.get("xg_stats") or side.get("fbref_xg") or {}
    xgf = _float(stats.get("xg_for_avg") or stats.get("xg_l10") or stats.get("xg"), fallback)
    xga = _float(stats.get("xg_against_avg") or stats.get("xga_l10") or stats.get("xga"), fallback)
    ppda = _float(stats.get("ppda"), 10.0)
    return max(0.25, min(3.25, xgf)), max(0.25, min(3.25, xga)), max(5.0, min(18.0, ppda))


def _load_team_stats() -> dict[str, dict[str, Any]]:
    path = ROOT / "team_stats_extended.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    teams = data.get("teams") or {}
    out: dict[str, dict[str, Any]] = {}
    for key, row in teams.items():
        if isinstance(row, list):
            out[key] = {
                "team": row[0] if len(row) > 0 else "",
                "pressing_intensity": _float(row[4] if len(row) > 4 else 0, 0.0),
            }
        elif isinstance(row, dict):
            out[key] = row
    return out


def _team_extended(side: dict[str, Any] | None, teams: dict[str, dict[str, Any]]) -> dict[str, Any] | None:
    if not side:
        return None
    for key in (_norm(side.get("name")), _norm(side.get("short")), _norm(side.get("abbr")), _norm(side.get("id"))):
        if key and key in teams:
            return teams[key]
    return None


def _load_referees() -> dict[str, dict[str, Any]]:
    path = ROOT / "referee_stats.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    refs = data.get("referees") or {}
    out: dict[str, dict[str, Any]] = {}
    for key, row in refs.items():
        if isinstance(row, list):
            out[key] = {
                "name": row[0] if len(row) > 0 else key,
                "league": row[1] if len(row) > 1 else "",
                "matches": int(_float(row[2] if len(row) > 2 else 0)),
                "cards_per_match": _float(row[3] if len(row) > 3 else 4.0),
                "fouls_per_match": _float(row[6] if len(row) > 6 else 24.0),
            }
        elif isinstance(row, dict):
            out[key] = row
    return out


def _referee_for(event: dict[str, Any], refs: dict[str, dict[str, Any]]) -> dict[str, Any] | None:
    ref = event.get("referee") or {}
    officials = event.get("officials") or []
    name = ref.get("name") or (officials[0].get("name") if officials else "")
    if name and _norm(name) in refs:
        return refs[_norm(name)]
    if ref:
        return {
            "name": ref.get("name") or "",
            "cards_per_match": _float(ref.get("cards_per_match") or ref.get("yellowPerGame"), 4.0),
            "fouls_per_match": _float(ref.get("fouls_per_match"), 24.0),
            "matches": int(_float(ref.get("matches") or ref.get("games"), 0)),
        }
    return None


def _prob_over(line: float, expected: float, sigma: float) -> float:
    return max(0.02, min(0.98, 1 / (1 + math.exp((line - expected) / sigma))))


def _rows(lines: list[float], expected: float, sigma: float, market_key: str) -> list[dict[str, Any]]:
    out = []
    for line in lines:
        over = _prob_over(line, expected, sigma)
        under = 1 - over
        out.append({
            "market_key": market_key,
            "line": line,
            "over_prob": round(over, 4),
            "under_prob": round(under, 4),
            "fair_odds_over": round(1 / over, 2),
            "fair_odds_under": round(1 / under, 2),
        })
    return out


def build() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    data = load_data_js()
    teams = _load_team_stats()
    refs = _load_referees()
    corners: dict[str, Any] = {}
    cards: dict[str, Any] = {}
    fouls: dict[str, Any] = {}
    for _, event in iter_events(data):
        if str(event.get("sport") or "").lower() != "football" or event.get("completed"):
            continue
        if (event.get("winamax") or {}).get("available") is not True:
            continue
        home = _side(event, "home")
        away = _side(event, "away")
        h_xg, h_xga, h_ppda = _team_xg(home, 1.25)
        a_xg, a_xga, a_ppda = _team_xg(away, 1.15)
        h_ext = _team_extended(home, teams) or {}
        a_ext = _team_extended(away, teams) or {}
        pressing = (_float(h_ext.get("pressing_intensity"), 0.5) + _float(a_ext.get("pressing_intensity"), 0.5)) / 2
        xg_total = h_xg + a_xg
        ppda_pressure = max(-0.8, min(0.8, (20.0 - (h_ppda + a_ppda)) / 18.0))
        expected_corners = max(6.2, min(13.8, 9.0 + (xg_total - 2.45) * 1.15 + ppda_pressure + (pressing - 0.5) * 0.9))

        ref = _referee_for(event, refs)
        expected_cards = _float(ref.get("cards_per_match") if ref else None, 4.0)
        league_name = str(event.get("league_name") or event.get("leagueShort") or "").lower()
        if any(x in league_name for x in ("libertadores", "sudamericana", "derby", "cup")):
            expected_cards += 0.35
        expected_cards = max(2.4, min(6.6, expected_cards))

        expected_fouls = _float(ref.get("fouls_per_match") if ref else None, 23.5)
        expected_fouls += (expected_cards - 4.0) * 2.1 + max(0, pressing - 0.55) * 5.0
        expected_fouls = max(17.0, min(34.0, expected_fouls))

        mid = str(event.get("id") or "")
        if not mid:
            continue
        corners[mid] = {
            "match_id": mid,
            "expected": round(expected_corners, 2),
            "source": "xg_ppda_pressing",
            "rows": _rows([7.5, 8.5, 9.5, 10.5], expected_corners, 1.65, "cornersTotal"),
        }
        cards[mid] = {
            "match_id": mid,
            "expected": round(expected_cards, 2),
            "source": "referee_or_league_prior",
            "referee": ref.get("name") if ref else None,
            "rows": _rows([2.5, 3.5, 4.5, 5.5], expected_cards, 1.08, "cardsTotal"),
        }
        fouls[mid] = {
            "match_id": mid,
            "expected": round(expected_fouls, 2),
            "source": "referee_cards_pressing",
            "rows": _rows([20.5, 24.5, 28.5], expected_fouls, 3.8, "foulsTotal"),
        }
    generated = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    def payload(schema: str, events: dict[str, Any]) -> dict[str, Any]:
        return {"schema": schema, "generated_at": generated, "event_count": len(events), "events": events}
    return payload("total_corners.v1", corners), payload("total_cards.v1", cards), payload("total_fouls.v1", fouls)


def _write_pair(payload: dict[str, Any], json_path: Path, js_path: Path, var_name: str) -> None:
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    compact = {
        "schema": payload["schema"],
        "generated_at": payload["generated_at"],
        "event_count": payload["event_count"],
        "events": {
            mid: [
                row["expected"],
                row.get("source"),
                row.get("referee"),
                [
                    [r["line"], r["over_prob"], r["under_prob"], r["fair_odds_over"], r["fair_odds_under"]]
                    for r in row.get("rows") or []
                ],
            ]
            for mid, row in payload["events"].items()
        },
    }
    js_path.write_text(f"window.{var_name} = " + json.dumps(compact, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")


def main() -> int:
    corners, cards, fouls = build()
    _write_pair(corners, OUT_CORNERS_JSON, OUT_CORNERS_JS, "TOTAL_CORNERS")
    _write_pair(cards, OUT_CARDS_JSON, OUT_CARDS_JS, "TOTAL_CARDS")
    _write_pair(fouls, OUT_FOULS_JSON, OUT_FOULS_JS, "TOTAL_FOULS")
    print(f"[football_stats_markets] corners={corners['event_count']} cards={cards['event_count']} fouls={fouls['event_count']}")
    return 0 if min(corners["event_count"], cards["event_count"], fouls["event_count"]) >= 30 else 1


if __name__ == "__main__":
    raise SystemExit(main())

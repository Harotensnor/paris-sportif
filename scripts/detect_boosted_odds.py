#!/usr/bin/env python3
"""Detect explicit Winamax boosted odds from the scraped market payload.

This does not infer promotions. It only surfaces boosts when the Winamax JSON
or detail scrape contains explicit wording/fields such as boost, super cote or
enhanced odds. If none are present it emits an empty sidecar.

Output: ``boosted_odds.json`` at repo root.
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parent.parent
WINAMAX_MARKETS = ROOT / "winamax_markets.json"
CATALOG = ROOT / "winamax_catalog.json"
OUT = ROOT / "boosted_odds.json"

BOOST_RE = re.compile(r"(boost|boost[ée]e?|super\s*cote|supercote|cote\s*boost|enhanced|promo)", re.I)
ODD_KEYS = {"odd", "odds", "price", "boosted_odd", "boostedOdd", "boosted_price", "cote"}
PREV_KEYS = {"old_odd", "oldOdd", "previous_odd", "previousOdd", "initial_odd", "initialOdd"}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def text_blob(value: Any) -> str:
    if isinstance(value, dict):
        return " ".join(str(k) + " " + text_blob(v) for k, v in value.items())
    if isinstance(value, list):
        return " ".join(text_blob(v) for v in value)
    return str(value or "")


def num(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def catalog_lookup() -> dict[str, dict[str, Any]]:
    data = read_json(CATALOG)
    out: dict[str, dict[str, Any]] = {}
    for tournament in data.get("tournaments") or []:
        for match in tournament.get("matches") or []:
            mid = str(match.get("match_id") or "")
            if not mid:
                continue
            out[mid] = {
                "sport": tournament.get("sport_name"),
                "category": tournament.get("category_name"),
                "tournament": tournament.get("tournament_name"),
                "home": match.get("home"),
                "away": match.get("away"),
                "url": f"https://www.winamax.fr/paris-sportifs/match/{mid}",
            }
    return out


def iter_candidates(value: Any, path: str = "") -> Iterable[tuple[str, dict[str, Any]]]:
    if isinstance(value, dict):
        if any(k in value for k in ODD_KEYS) or BOOST_RE.search(text_blob(value)):
            yield path, value
        for key, child in value.items():
            child_path = f"{path}.{key}" if path else str(key)
            yield from iter_candidates(child, child_path)
    elif isinstance(value, list):
        for idx, child in enumerate(value):
            yield from iter_candidates(child, f"{path}[{idx}]")


def extract_odd(item: dict[str, Any]) -> float | None:
    for key in ODD_KEYS:
        if key in item:
            if isinstance(item[key], dict):
                continue
            out = num(item[key])
            if out is not None:
                return out
    return None


def extract_previous_odd(item: dict[str, Any]) -> float | None:
    for key in PREV_KEYS:
        if key in item:
            out = num(item[key])
            if out is not None:
                return out
    return None


def is_boost(item: dict[str, Any], path: str) -> bool:
    if BOOST_RE.search(path) or BOOST_RE.search(text_blob(item)):
        return True
    keys = {str(k).lower() for k in item.keys()}
    return any("boost" in k or "promo" in k or "enhanced" in k for k in keys)


def main() -> int:
    markets = read_json(WINAMAX_MARKETS)
    lookup = catalog_lookup()
    boosts: list[dict[str, Any]] = []
    scanned = 0
    for match_id, match in (markets.get("matches") or {}).items():
        scanned += 1
        meta = lookup.get(str(match_id), {})
        for path, item in iter_candidates(match.get("odds") or match, ""):
            if not isinstance(item, dict) or not is_boost(item, path):
                continue
            odd = extract_odd(item)
            previous = extract_previous_odd(item)
            label = item.get("label") or item.get("name") or item.get("title") or path.split(".")[-1]
            boosts.append({
                "match_id": str(match_id),
                "sport": meta.get("sport"),
                "category": meta.get("category"),
                "tournament": meta.get("tournament"),
                "home": meta.get("home") or match.get("home") or match.get("home_name"),
                "away": meta.get("away") or match.get("away") or match.get("away_name"),
                "market_path": path,
                "title": item.get("title"),
                "label": label,
                "odd": odd,
                "previous_odd": previous,
                "boost_pct": round((odd / previous - 1) * 100, 2) if odd and previous and previous > 0 else None,
                "url": meta.get("url"),
            })
    out = {
        "generated_at": now_iso(),
        "source": "Winamax markets explicit boost detector",
        "status": "ok" if boosts else "empty",
        "matches_scanned": scanned,
        "boosts": boosts,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"boosted_odds: matches={scanned} boosts={len(boosts)} status={out['status']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

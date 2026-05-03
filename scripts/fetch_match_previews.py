#!/usr/bin/env python3
"""Build concise match previews for the highest-signal upcoming events.

The fetcher tries ESPN's public summary endpoint first for a genuine preview
snippet. When ESPN has no preview article, it falls back to an analytic preview
from our own signals (xG, H2H, lineups, pitchers, goalies, injuries, weather).

No paid service, no private API. Output is a compact sidecar for the modal and
for health visibility.
"""
from __future__ import annotations

import argparse
import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
OUT = ROOT / "match_previews.json"

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_h2h import league_espn_path


def load_data() -> dict:
    txt = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$", txt, re.DOTALL)
    if not m:
        raise SystemExit("[match_previews] cannot parse data.js")
    return json.loads(m.group(1))


def iso_dt(value: str) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def sides(ev: dict) -> tuple[dict, dict]:
    comps = ev.get("competitors") or []
    home = next((c for c in comps if c.get("home_away") == "home"), None)
    away = next((c for c in comps if c.get("home_away") == "away"), None)
    if not home and len(comps) >= 1:
        home = comps[0]
    if not away and len(comps) >= 2:
        away = comps[1]
    return home or {}, away or {}


def name(comp: dict) -> str:
    return comp.get("name") or comp.get("displayName") or comp.get("shortDisplayName") or comp.get("short") or ""


def has_xg(comp: dict) -> bool:
    return bool(comp.get("xg_stats") or comp.get("fbref_xg") or comp.get("xg_for_avg") is not None)


def signal_score(ev: dict) -> int:
    home, away = sides(ev)
    score = 0
    markets = ((ev.get("winamax") or {}).get("markets") or {})
    if isinstance(markets, dict):
        score += min(6, len(markets))
    h2h = ev.get("h2h") or {}
    if (h2h.get("meetings") or []):
        score += 3
    if has_xg(home) and has_xg(away):
        score += 4
    if ev.get("lineups"):
        score += 4
    if ev.get("mlb_pitchers"):
        score += 4
    if ev.get("nhl_stats"):
        score += 3
    if ev.get("weather"):
        score += 1
    if any(c.get("injuries") or c.get("injuries_count") for c in (ev.get("competitors") or [])):
        score += 1
    return score


def clean_text(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value or "")
    value = re.sub(r"\s+", " ", value).strip()
    return value[:320]


def fetch_espn_preview(ev: dict) -> dict:
    path = league_espn_path(ev)
    if not path:
        return {}
    url = f"https://site.api.espn.com/apis/site/v2/sports/{path}/summary?event={ev.get('id')}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        raw = urllib.request.urlopen(req, timeout=10).read()
        data = json.loads(raw)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError, OSError):
        return {}
    article = data.get("article") or {}
    article_type = str(article.get("type") or "").lower()
    # Avoid showing a recap as if it were a pre-match preview.
    if article and "recap" not in article_type:
        text = clean_text(article.get("description") or article.get("story") or "")
        if text:
            return {
                "source": "espn_summary_article",
                "headline": clean_text(article.get("headline") or ""),
                "text": text,
                "url": ((article.get("links") or {}).get("web") or {}).get("href") or "",
            }
    return {}


def analytic_preview(ev: dict) -> tuple[str, list[str]]:
    home, away = sides(ev)
    home_name, away_name = name(home), name(away)
    bullets: list[str] = []
    if has_xg(home) and has_xg(away):
        hxg = home.get("xg_for_avg") or ((home.get("xg_stats") or {}).get("xg_l10"))
        axg = away.get("xg_for_avg") or ((away.get("xg_stats") or {}).get("xg_l10"))
        bullets.append(f"xG recent: {home_name} {hxg} vs {away_name} {axg}")
    h2h = ev.get("h2h") or {}
    meetings = h2h.get("meetings") or []
    if meetings:
        bullets.append(f"H2H: {len(meetings)} confrontations recentes integrees")
    if ev.get("lineups"):
        lu = ev.get("lineups") or {}
        hform = ((lu.get("home") or {}).get("formation") or "?")
        aform = ((lu.get("away") or {}).get("formation") or "?")
        bullets.append(f"Compos probables: {hform} vs {aform}")
    if ev.get("mlb_pitchers"):
        p = ev.get("mlb_pitchers") or {}
        hp = (p.get("home") or {}).get("name") or "?"
        ap = (p.get("away") or {}).get("name") or "?"
        bullets.append(f"Lanceurs probables: {hp} vs {ap}")
    if ev.get("nhl_stats"):
        n = ev.get("nhl_stats") or {}
        hg = ((n.get("home") or {}).get("goalie") or {}).get("name") or "?"
        ag = ((n.get("away") or {}).get("goalie") or {}).get("name") or "?"
        bullets.append(f"Gardiens projetes: {hg} vs {ag}")
    markets = ((ev.get("winamax") or {}).get("markets") or {})
    if isinstance(markets, dict) and len(markets) > 1:
        bullets.append(f"{len(markets)} familles de marches Winamax disponibles")
    if not bullets:
        bullets.append("Preview prudente: peu de signaux publics forts sur ce match")
    text = f"{home_name} - {away_name}: le modele dispose de {len(bullets)} signaux utiles pour cadrer le risque avant le coup d'envoi."
    return text, bullets[:5]


def build(limit: int) -> dict:
    data = load_data()
    now = datetime.now(timezone.utc)
    candidates = []
    for evs in (data.get("days") or {}).values():
        for ev in evs or []:
            dt = iso_dt(ev.get("date") or "")
            if not dt or dt < now or ev.get("completed"):
                continue
            score = signal_score(ev)
            if score <= 0:
                continue
            candidates.append((score, dt, ev))
    candidates.sort(key=lambda row: (-row[0], row[1]))

    previews = []
    fetched = 0
    espn_hits = 0
    for score, dt, ev in candidates[:limit]:
        home, away = sides(ev)
        espn = fetch_espn_preview(ev)
        fetched += 1
        local_text, bullets = analytic_preview(ev)
        if espn:
            espn_hits += 1
        previews.append({
            "event_id": str(ev.get("id") or ""),
            "sport": ev.get("sport") or "",
            "league_code": ev.get("league_code") or "",
            "date": ev.get("date") or "",
            "home": name(home),
            "away": name(away),
            "signal_score": score,
            "headline": espn.get("headline") or f"{name(home)} - {name(away)}",
            "preview": espn.get("text") or local_text,
            "source": espn.get("source") or "local_signal_preview",
            "source_url": espn.get("url") or "",
            "bullets": bullets,
        })
        time.sleep(0.15)

    return {
        "generated_at": now.isoformat(),
        "source": "ESPN public summary + local signal fallback",
        "requested": min(limit, len(candidates)),
        "fetched": fetched,
        "espn_preview_hits": espn_hits,
        "local_fallbacks": max(0, fetched - espn_hits),
        "previews": previews,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=12)
    args = ap.parse_args()
    payload = build(max(1, min(args.limit, 30)))
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(
        f"[match_previews] {len(payload['previews'])} previews "
        f"({payload['espn_preview_hits']} ESPN, {payload['local_fallbacks']} local) -> {OUT.name}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

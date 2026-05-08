#!/usr/bin/env python3
"""Build Bayesian team priors for the V4 model.

The sidecar is intentionally local-only: it consumes the repository data we
already ship (`results_archive.jsonl` and `data.js`) and emits:

- team_priors.json: audit-friendly source sidecar
- team_priors.js: small browser bootstrap (`window.TEAM_PRIORS = ...`)

Each team prior is based on the latest 20 resolved matches with exponential
decay by recency: weight = exp(-0.05 * days_ago).
"""
from __future__ import annotations

import json
import math
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE)) if str(HERE) not in sys.path else None
from io_compressed import write_json as _write_json_gz

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
RESULTS_ARCHIVE = ROOT / "results_archive.jsonl"
OUT_JSON = ROOT / "team_priors.json"
OUT_JS = ROOT / "team_priors.js"

DECAY_K = 0.05
MAX_MATCHES = 20


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    s = str(value).strip()
    if not s:
        return None
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        dt = datetime.fromisoformat(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def norm(value: Any) -> str:
    s = str(value or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s, flags=re.I).strip("-")
    return s or "unknown"


def read_data_js() -> dict:
    if not DATA_JS.exists():
        return {}
    text = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$", text)
    if not m:
        return {}
    return json.loads(m.group(1))


def side_competitors(ev: dict) -> tuple[dict | None, dict | None]:
    comps = ev.get("competitors") or []
    if len(comps) < 2:
        return None, None
    home = next((c for c in comps if c.get("home_away") == "home"), None)
    away = next((c for c in comps if c.get("home_away") == "away"), None)
    if home is None or away is None:
        home, away = comps[0], comps[1]
    return home, away


def score_pair(home: dict, away: dict) -> tuple[float, float] | None:
    try:
        return float(home.get("score")), float(away.get("score"))
    except (TypeError, ValueError):
        pass
    # Tennis/MMA archives often only expose winner. Keep a binary prior so
    # win-rate coverage remains useful without pretending it is a goal model.
    if home.get("winner") is True and away.get("winner") is False:
        return 1.0, 0.0
    if away.get("winner") is True and home.get("winner") is False:
        return 0.0, 1.0
    return None


def append_match(matches: list[dict], ev: dict, source: str) -> None:
    if not ev.get("completed"):
        return
    sport = str(ev.get("sport") or "football").lower()
    home, away = side_competitors(ev)
    if not home or not away:
        return
    sc = score_pair(home, away)
    if sc is None:
        return
    dt = parse_dt(ev.get("date") or ev.get("kickoff_utc") or ev.get("archived_at"))
    if not dt:
        return
    h_score, a_score = sc
    home_name = home.get("name") or home.get("short") or home.get("abbr")
    away_name = away.get("name") or away.get("short") or away.get("abbr")
    if not home_name or not away_name or str(home_name).strip() == str(away_name).strip():
        return
    league = str(ev.get("league_code") or ev.get("league_name") or "unknown").lower()
    base = {
        "match_id": str(ev.get("id") or ev.get("match_id") or ""),
        "sport": sport,
        "league": league,
        "date": dt,
        "source": source,
    }
    matches.append({
        **base,
        "team_id": str(home.get("id") or norm(home_name)),
        "team_name": str(home_name),
        "opponent": str(away_name),
        "is_home": True,
        "for": h_score,
        "against": a_score,
        "won": h_score > a_score,
        "draw": h_score == a_score,
    })
    matches.append({
        **base,
        "team_id": str(away.get("id") or norm(away_name)),
        "team_name": str(away_name),
        "opponent": str(home_name),
        "is_home": False,
        "for": a_score,
        "against": h_score,
        "won": a_score > h_score,
        "draw": h_score == a_score,
    })


def append_last10(matches: list[dict], ev: dict) -> None:
    sport = str(ev.get("sport") or "football").lower()
    league = str(ev.get("league_code") or ev.get("league_name") or "unknown").lower()
    for comp in ev.get("competitors") or []:
        team_name = comp.get("name") or comp.get("short") or comp.get("abbr")
        if not team_name:
            continue
        team_id = str(comp.get("id") or norm(team_name))
        for idx, row in enumerate(comp.get("last10") or []):
            dt = parse_dt(row.get("date"))
            if not dt:
                continue
            try:
                gf = float(row.get("score_for"))
                ga = float(row.get("score_against"))
            except (TypeError, ValueError):
                continue
            matches.append({
                "match_id": f"last10:{team_id}:{dt.isoformat()}:{idx}",
                "sport": sport,
                "league": league,
                "date": dt,
                "source": "data.last10",
                "team_id": team_id,
                "team_name": str(team_name),
                "opponent": str(row.get("opponent_abbr") or row.get("opponent") or ""),
                "is_home": None,
                "for": gf,
                "against": ga,
                "won": bool(row.get("won")),
                "draw": gf == ga,
            })


def load_team_match_rows() -> list[dict]:
    rows: list[dict] = []
    seen_events: set[str] = set()
    if RESULTS_ARCHIVE.exists():
        for line in RESULTS_ARCHIVE.read_text(encoding="utf-8").splitlines():
            try:
                ev = json.loads(line)
            except Exception:
                continue
            eid = str(ev.get("id") or "")
            if eid and eid in seen_events:
                continue
            append_match(rows, ev, "results_archive")
            if eid:
                seen_events.add(eid)
    data = read_data_js()
    for evs in (data.get("days") or {}).values():
        for ev in evs or []:
            eid = str(ev.get("id") or "")
            if eid and eid not in seen_events:
                append_match(rows, ev, "data.js")
                seen_events.add(eid)
            append_last10(rows, ev)
    return rows


def weighted_avg(items: list[tuple[float, float]]) -> float | None:
    total_w = sum(w for _, w in items)
    if total_w <= 0:
        return None
    return sum(v * w for v, w in items) / total_w


def build_prior(rows: list[dict], generated_at: datetime) -> tuple[dict[str, dict], dict[str, dict]]:
    by_key: dict[str, list[dict]] = defaultdict(list)
    league_rows: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for r in rows:
        key = f"{r['sport']}|{r['league']}|{norm(r['team_name'])}"
        by_key[key].append(r)
        league_rows[(r["sport"], r["league"])].append(r)

    league_avg: dict[str, dict] = {}
    for (sport, league), arr in league_rows.items():
        latest = sorted(arr, key=lambda x: x["date"], reverse=True)[: min(500, len(arr))]
        scored = [(x["for"], math.exp(-DECAY_K * max(0.0, (generated_at - x["date"]).total_seconds() / 86400))) for x in latest]
        conceded = [(x["against"], math.exp(-DECAY_K * max(0.0, (generated_at - x["date"]).total_seconds() / 86400))) for x in latest]
        league_avg[f"{sport}|{league}"] = {
            "prior_xG": round(weighted_avg(scored) or 1.0, 3),
            "prior_xGA": round(weighted_avg(conceded) or 1.0, 3),
            "sample_size": len(latest),
        }

    teams: dict[str, dict] = {}
    for key, arr in by_key.items():
        arr = sorted(arr, key=lambda x: x["date"], reverse=True)[:MAX_MATCHES]
        sport, league, _ = key.split("|", 2)
        lg = league_avg.get(f"{sport}|{league}") or {"prior_xG": 1.0, "prior_xGA": 1.0}
        weighted_for: list[tuple[float, float]] = []
        weighted_against: list[tuple[float, float]] = []
        weighted_btts: list[tuple[float, float]] = []
        weighted_over25: list[tuple[float, float]] = []
        home_wr: list[tuple[float, float]] = []
        away_wr: list[tuple[float, float]] = []
        for r in arr:
            days_ago = max(0.0, (generated_at - r["date"]).total_seconds() / 86400)
            w = math.exp(-DECAY_K * days_ago)
            weighted_for.append((float(r["for"]), w))
            weighted_against.append((float(r["against"]), w))
            weighted_btts.append((1.0 if r["for"] > 0 and r["against"] > 0 else 0.0, w))
            weighted_over25.append((1.0 if r["for"] + r["against"] > 2.5 else 0.0, w))
            wr_value = 1.0 if r["won"] else 0.5 if r["draw"] else 0.0
            if r["is_home"] is True:
                home_wr.append((wr_value, w))
            elif r["is_home"] is False:
                away_wr.append((wr_value, w))
        first = arr[0]
        sample = len(arr)
        teams[key] = {
            "team_id": first["team_id"],
            "team_name": first["team_name"],
            "sport": sport,
            "league": league,
            "prior_xG": round(weighted_avg(weighted_for) if sample >= 5 else lg["prior_xG"], 3),
            "prior_xGA": round(weighted_avg(weighted_against) if sample >= 5 else lg["prior_xGA"], 3),
            "prior_winrate_home": round(weighted_avg(home_wr) if home_wr else 0.5, 3),
            "prior_winrate_away": round(weighted_avg(away_wr) if away_wr else 0.5, 3),
            "prior_btts_rate": round(weighted_avg(weighted_btts) or 0.0, 3),
            "prior_over25_rate": round(weighted_avg(weighted_over25) or 0.0, 3),
            "sample_size": sample,
            "weighted_sample": round(sum(w for _, w in weighted_for), 2),
            "last_updated": iso(first["date"]),
            "fallback": sample < 5,
            "source_mix": sorted(set(str(r["source"]) for r in arr)),
        }
    return teams, league_avg


def browser_payload(out: dict) -> dict:
    """Emit a compact JS payload for the browser model.

    The audit JSON intentionally keeps every field. The page only needs the
    football priors used by poissonComponent, so the JS sidecar stores dense
    tuples to protect the initial payload budget.
    """
    football_teams = []
    for key, t in (out.get("teams") or {}).items():
        if t.get("sport") != "football":
            continue
        football_teams.append([
            key,
            t.get("team_name"),
            t.get("league"),
            t.get("prior_xG"),
            t.get("prior_xGA"),
            t.get("prior_winrate_home"),
            t.get("prior_winrate_away"),
            t.get("prior_btts_rate"),
            t.get("prior_over25_rate"),
            t.get("sample_size"),
            t.get("last_updated"),
            1 if t.get("fallback") else 0,
        ])
    football_leagues = {
        key: value
        for key, value in (out.get("league_averages") or {}).items()
        if str(key).startswith("football|")
    }
    return {
        "schema": "paris-sportif.team_priors.browser.v1",
        "generated_at": out.get("generated_at"),
        "decay_k": out.get("decay_k"),
        "team_count": out.get("team_count"),
        "football_team_count": len(football_teams),
        "league_count": len(football_leagues),
        "teams": football_teams,
        "league_averages": football_leagues,
    }


def main() -> int:
    generated = now_utc()
    rows = load_team_match_rows()
    teams, league_avg = build_prior(rows, generated)
    out = {
        "schema": "paris-sportif.team_priors.v1",
        "generated_at": iso(generated),
        "decay_k": DECAY_K,
        "max_matches": MAX_MATCHES,
        "team_count": len(teams),
        "league_count": len(league_avg),
        "teams": teams,
        "league_averages": league_avg,
    }
    # AUDIT 2026-05-08 v40 — gzip team_priors.json (~1.4 MB → ~0.4 MB).
    _write_json_gz(OUT_JSON, out)
    js_payload = browser_payload(out)
    OUT_JS.write_text(
        "window.TEAM_PRIORS=" + json.dumps(js_payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    by_sport = defaultdict(int)
    for t in teams.values():
        by_sport[t["sport"]] += 1
    print(f"[team_priors] teams={len(teams)} leagues={len(league_avg)} sports={dict(sorted(by_sport.items()))}")
    return 0 if len(teams) >= 800 else 1


if __name__ == "__main__":
    raise SystemExit(main())

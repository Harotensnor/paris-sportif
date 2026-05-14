#!/usr/bin/env python3
"""Fetcher: Understat xG team priors for top-5 football leagues.

Outputs:
  - xg_team_stats.json: canonical Paris-Sportif contract
  - fbref_xg.json: compatibility contract for the existing quick patcher

Cadence: slow/self-throttled by the orchestrators (~4-6h).
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "xg_team_stats.json"
COMPAT_OUT = ROOT / "fbref_xg.json"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _data_io import write_text_atomic

LEAGUES = {
    "EPL": {"code": "eng.1", "name": "Premier League"},
    "La liga": {"code": "esp.1", "name": "La Liga"},
    "Bundesliga": {"code": "ger.1", "name": "Bundesliga"},
    "Serie A": {"code": "ita.1", "name": "Serie A"},
    "Ligue 1": {"code": "fra.1", "name": "Ligue 1"},
    "RFPL": {"code": "rus.1", "name": "Russian Premier League"},
}

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def _norm(name: str | None) -> str:
    if not name:
        return ""
    s = unicodedata.normalize("NFD", str(name)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", s.lower())


def _num(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _ratio_ppda(value) -> float | None:
    if not isinstance(value, dict):
        return None
    att = _num(value.get("att"))
    deff = _num(value.get("def"))
    if deff <= 0:
        return None
    return round(att / deff, 3)


def _fetch_json(url: str, referer: str, debug: bool = False) -> dict | None:
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": USER_AGENTS[attempt % len(USER_AGENTS)],
                    "Accept": "application/json,text/html;q=0.8,*/*;q=0.5",
                    "Accept-Encoding": "gzip,identity",
                    "Referer": referer,
                    "X-Requested-With": "XMLHttpRequest",
                },
            )
            with urllib.request.urlopen(req, timeout=25) as res:
                raw = res.read()
                if raw[:2] == b"\x1f\x8b" or (res.headers.get("Content-Encoding") or "").lower() == "gzip":
                    raw = gzip.decompress(raw)
                text = raw.decode("utf-8", "replace")
                return json.loads(text)
        except Exception as exc:
            if debug:
                print(f"[understat] attempt {attempt + 1} failed for {url}: {exc}", flush=True)
            if attempt < 2:
                time.sleep(2**attempt)
    return None


def _fetch_legacy_page(league: str, season: str, debug: bool = False) -> dict | None:
    """Fallback for the old inline teamsData contract."""
    quoted = urllib.parse.quote(league.replace(" ", "_"))
    url = f"https://understat.com/league/{quoted}/{season}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENTS[0], "Accept": "text/html"})
        with urllib.request.urlopen(req, timeout=25) as res:
            html = res.read().decode("utf-8", "replace")
        m = re.search(r"var\s+teamsData\s*=\s*JSON\.parse\('(.+?)'\)", html, re.S)
        if not m:
            return None
        payload = json.loads(m.group(1).encode("utf-8").decode("unicode_escape"))
        return {"teams": payload}
    except Exception as exc:
        if debug:
            print(f"[understat] legacy fallback failed for {league}: {exc}", flush=True)
        return None


def _fetch_league(league: str, season: str, debug: bool = False) -> dict | None:
    encoded = urllib.parse.quote(league, safe="")
    api_url = f"https://understat.com/getLeagueData/{encoded}/{season}/"
    referer = f"https://understat.com/league/{urllib.parse.quote(league.replace(' ', '_'))}/{season}"
    data = _fetch_json(api_url, referer, debug=debug)
    if data and isinstance(data.get("teams"), dict):
        return data
    return _fetch_legacy_page(league, season, debug=debug)


def _team_stats(team: dict, league: str, league_meta: dict) -> tuple[str, dict] | None:
    name = team.get("title") or team.get("team_title") or team.get("name")
    history = team.get("history") or []
    if not name or not isinstance(history, list) or not history:
        return None
    hist = [row for row in history if isinstance(row, dict)]
    if not hist:
        return None
    last10 = hist[-10:]
    xg_l10 = mean(_num(row.get("xG")) for row in last10)
    xga_l10 = mean(_num(row.get("xGA")) for row in last10)
    xg_per90 = mean(_num(row.get("xG")) for row in hist)
    xga_per90 = mean(_num(row.get("xGA")) for row in hist)
    scored_l10 = mean(_num(row.get("scored")) for row in last10)
    conceded_l10 = mean(_num(row.get("missed")) for row in last10)
    ppda_values = [_ratio_ppda(row.get("ppda")) for row in hist if _ratio_ppda(row.get("ppda")) is not None]
    oppda_values = [
        _ratio_ppda(row.get("ppda_allowed"))
        for row in hist
        if _ratio_ppda(row.get("ppda_allowed")) is not None
    ]
    norm = _norm(name)
    stats = {
        "team": name,
        "normalized_name": norm,
        "league": league_meta["name"],
        "league_code": league_meta["code"],
        "understat_league": league,
        "matches_played": len(hist),
        "xg_l10": round(xg_l10, 3),
        "xga_l10": round(xga_l10, 3),
        "xg_per90": round(xg_per90, 3),
        "xga_per90": round(xga_per90, 3),
        "gf_l10": round(scored_l10, 3),
        "ga_l10": round(conceded_l10, 3),
        "xg_diff_l10": round(xg_l10 - xga_l10, 3),
        "ppda": round(mean(ppda_values), 3) if ppda_values else None,
        "ppda_allowed": round(mean(oppda_values), 3) if oppda_values else None,
        "source": "understat",
    }
    return norm, stats


def _build_outputs(by_team: dict, by_league: dict, season: str) -> tuple[dict, dict]:
    generated_at = _now_iso()
    canonical = {
        "generated_at": generated_at,
        "source": "understat",
        "season": season,
        "teams": len(by_team),
        "by_team": by_team,
        "leagues": by_league,
    }
    compat_leagues: dict[str, dict] = {}
    compat_by_team: dict[str, dict] = {}
    for key, stats in by_team.items():
        compat_stats = {
            "normalized_name": stats["normalized_name"],
            "xg_for_avg": stats["xg_l10"],
            "xg_against_avg": stats["xga_l10"],
            "matches_played": stats["matches_played"],
            "goals_diff": stats["xg_diff_l10"],
            "xg_l10": stats["xg_l10"],
            "xga_l10": stats["xga_l10"],
            "xg_per90": stats["xg_per90"],
            "xga_per90": stats["xga_per90"],
            "ppda": stats["ppda"],
            "ppda_allowed": stats["ppda_allowed"],
            "league_code": stats["league_code"],
            "source": "understat",
        }
        compat_by_team[key] = compat_stats
        league_name = stats["league"]
        compat_leagues.setdefault(league_name, {"teams": {}})["teams"][stats["team"]] = compat_stats
    compat = {
        "generated_at": generated_at,
        "source": "understat_compat",
        "season": season,
        "by_team": compat_by_team,
        "leagues": compat_leagues,
    }
    return canonical, compat


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", default="2025")
    ap.add_argument("--debug", action="store_true")
    args = ap.parse_args()

    print(f"[understat] starting season={args.season}", flush=True)
    by_team: dict[str, dict] = {}
    by_league: dict[str, dict] = {}
    failed: list[str] = []
    for league, meta in LEAGUES.items():
        data = _fetch_league(league, args.season, debug=args.debug)
        teams = (data or {}).get("teams") if isinstance(data, dict) else {}
        if not isinstance(teams, dict) or not teams:
            failed.append(league)
            print(f"[understat] {league}: no teams", flush=True)
            continue
        league_teams: dict[str, dict] = {}
        for team in teams.values():
            if not isinstance(team, dict):
                continue
            row = _team_stats(team, league, meta)
            if not row:
                continue
            norm, stats = row
            by_team[norm] = stats
            league_teams[stats["team"]] = stats
        by_league[league] = {
            "name": meta["name"],
            "league_code": meta["code"],
            "teams": league_teams,
        }
        print(f"[understat] {league}: {len(league_teams)} teams", flush=True)

    if not by_team:
        print("[understat] no xG teams fetched; keeping previous files", flush=True)
        return 1

    canonical, compat = _build_outputs(by_team, by_league, args.season)
    write_text_atomic(OUT, json.dumps(canonical, ensure_ascii=False, separators=(",", ":")))
    write_text_atomic(COMPAT_OUT, json.dumps(compat, ensure_ascii=False, separators=(",", ":")))
    print(
        f"[understat] wrote {OUT.name} ({len(by_team)} teams, failed={len(failed)}) "
        f"+ {COMPAT_OUT.name}",
        flush=True,
    )
    if failed:
        print(f"[understat] failed leagues: {', '.join(failed)}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())

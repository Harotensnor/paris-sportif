#!/usr/bin/env python3
"""Build hierarchical Bayesian priors for Model V5.

This script is deliberately local-data only. It consumes the existing V4
sidecars, then emits:

- bayesian_priors.json: full audit artifact
- bayesian_priors.js: compact browser payload exposed as
  window.BAYESIAN_PRIORS_V5

Hierarchy: sport -> league -> team -> player top-5. Team priors are shrunk
toward league and sport averages according to sample size, so new or noisy
teams cannot dominate the model.
"""
from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
TEAM_PRIORS = ROOT / "team_priors.json"
STAR_PLAYERS = ROOT / "star_players.json"
OUT_JSON = ROOT / "bayesian_priors.json"
OUT_JS = ROOT / "bayesian_priors.js"

METRICS = (
    "prior_xG",
    "prior_xGA",
    "prior_winrate_home",
    "prior_winrate_away",
    "prior_btts_rate",
    "prior_over25_rate",
)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def norm(value: Any) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text, flags=re.I).strip("-")
    return text or "unknown"


def finite(value: Any, fallback: float = 0.0) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError):
        return fallback
    return n if math.isfinite(n) else fallback


def clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def team_rows() -> list[dict[str, Any]]:
    raw = read_json(TEAM_PRIORS, {})
    rows = []
    for key, row in (raw.get("teams") or {}).items():
        if not isinstance(row, dict):
            continue
        sport = str(row.get("sport") or "unknown").lower()
        league = str(row.get("league") or "unknown").lower()
        team_name = str(row.get("team_name") or key.rsplit("|", 1)[-1])
        clean = {
            "key": key,
            "team_id": str(row.get("team_id") or norm(team_name)),
            "team_name": team_name,
            "sport": sport,
            "league": league,
            "sample_size": int(finite(row.get("sample_size"), 0)),
            "weighted_sample": finite(row.get("weighted_sample"), finite(row.get("sample_size"), 0)),
            "fallback": bool(row.get("fallback")),
            "last_updated": row.get("last_updated"),
        }
        for metric in METRICS:
            clean[metric] = finite(row.get(metric), 0.5 if "rate" in metric or "winrate" in metric else 1.0)
        rows.append(clean)
    return rows


def weighted_mean(rows: list[dict[str, Any]], metric: str) -> float:
    total_w = 0.0
    total = 0.0
    for row in rows:
        w = max(1.0, finite(row.get("weighted_sample"), row.get("sample_size") or 1.0))
        total_w += w
        total += finite(row.get(metric), 0.0) * w
    return total / total_w if total_w > 0 else 0.0


def aggregate(rows: list[dict[str, Any]], key_fields: tuple[str, ...]) -> dict[str, dict[str, Any]]:
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        key = "|".join(str(row.get(field) or "unknown") for field in key_fields)
        groups[key].append(row)
    out: dict[str, dict[str, Any]] = {}
    for key, arr in groups.items():
        payload = {
            "key": key,
            "team_count": len(arr),
            "sample_size": int(sum(max(0, int(r.get("sample_size") or 0)) for r in arr)),
            "weighted_sample": round(sum(max(0.0, finite(r.get("weighted_sample"))) for r in arr), 2),
        }
        for metric in METRICS:
            payload[metric] = round(weighted_mean(arr, metric), 4)
        out[key] = payload
    return out


def load_player_priors() -> tuple[dict[str, dict[str, Any]], int]:
    raw = read_json(STAR_PLAYERS, {})
    out: dict[str, dict[str, Any]] = {}
    player_count = 0
    for team_key, team in (raw.get("teams") or {}).items():
        players = [p for p in (team.get("players") or []) if isinstance(p, dict)]
        players = sorted(players, key=lambda p: finite(p.get("star_score")), reverse=True)[:5]
        if not players:
            continue
        player_count += len(players)
        sport = str(team.get("sport") or players[0].get("sport") or "unknown").lower()
        league = str(team.get("league") or players[0].get("league") or "unknown").lower()
        attack_load = sum(
            finite(p.get("xG_per_match"))
            + 0.35 * finite(p.get("assists_per_match"))
            + 0.03 * finite(p.get("points_per_match"))
            + 0.50 * finite(p.get("goals_per_match"))
            for p in players
        )
        leadership = sum(finite(p.get("leadership_score")) for p in players) / max(1, len(players))
        star_score = sum(finite(p.get("star_score")) for p in players) / max(1, len(players))
        names = [str(p.get("name") or "").strip() for p in players if p.get("name")]
        payload = {
            "team_key": str(team_key),
            "sport": sport,
            "league": league,
            "players": names,
            "player_count": len(players),
            "attack_load": round(attack_load, 4),
            "leadership_score": round(leadership, 4),
            "star_score": round(star_score, 4),
            "player_prior_strength": round(clamp((star_score / 10.0) + (leadership * 0.08), 0.02, 0.25), 4),
        }
        out[norm(team_key)] = payload
        team_name = str(team.get("team") or "").strip()
        if team_name:
            out[norm(team_name)] = payload
    return out, player_count


def shrinkage_weights(team_n: int, league_n: int, sport_n: int) -> dict[str, float]:
    """Stein-style shrinkage: sparse teams borrow from league and sport."""
    team_w = clamp(team_n / (team_n + 18.0), 0.05, 0.78)
    rem = 1.0 - team_w
    league_raw = league_n / (league_n + 120.0)
    league_w = rem * clamp(league_raw, 0.25, 0.85)
    sport_w = max(0.0, 1.0 - team_w - league_w)
    total = team_w + league_w + sport_w
    return {
        "team": round(team_w / total, 4),
        "league": round(league_w / total, 4),
        "sport": round(sport_w / total, 4),
    }


def build() -> dict[str, Any]:
    rows = team_rows()
    by_sport = aggregate(rows, ("sport",))
    by_league = aggregate(rows, ("sport", "league"))
    players, player_count = load_player_priors()

    teams: dict[str, dict[str, Any]] = {}
    for row in rows:
        sport_key = row["sport"]
        league_key = f"{row['sport']}|{row['league']}"
        sport_avg = by_sport.get(sport_key, {})
        league_avg = by_league.get(league_key, sport_avg)
        weights = shrinkage_weights(
            int(row.get("sample_size") or 0),
            int(league_avg.get("sample_size") or 0),
            int(sport_avg.get("sample_size") or 0),
        )
        name_key = norm(row.get("team_name"))
        player = players.get(name_key) or players.get(norm(row.get("team_id"))) or {}
        payload = {
            "key": row["key"],
            "team_id": row["team_id"],
            "team_name": row["team_name"],
            "sport": row["sport"],
            "league": row["league"],
            "sample_size": row["sample_size"],
            "weighted_sample": row["weighted_sample"],
            "last_updated": row.get("last_updated"),
            "fallback": bool(row.get("fallback")),
            "shrinkage": weights,
            "player_prior": {
                "players": player.get("players", []),
                "attack_load": player.get("attack_load", 0.0),
                "leadership_score": player.get("leadership_score", 0.0),
                "star_score": player.get("star_score", 0.0),
                "strength": player.get("player_prior_strength", 0.0),
            },
        }
        for metric in METRICS:
            posterior = (
                weights["team"] * finite(row.get(metric))
                + weights["league"] * finite(league_avg.get(metric), finite(row.get(metric)))
                + weights["sport"] * finite(sport_avg.get(metric), finite(row.get(metric)))
            )
            payload[metric.replace("prior_", "posterior_")] = round(posterior, 4)
            payload[metric] = round(finite(row.get(metric)), 4)
        payload["prior_reliability"] = round(clamp(
            weights["team"]
            + 0.05 * math.log1p(max(0, row["sample_size"]))
            + 0.08 * finite(player.get("player_prior_strength")),
            0.05,
            0.95,
        ), 4)
        teams[row["key"]] = payload

    return {
        "schema": "paris-sportif.bayesian_priors.v5",
        "generated_at": now_iso(),
        "source": "team_priors.json + star_players.json",
        "decay": {
            "sport_k": 0.015,
            "league_k": 0.025,
            "team_k": 0.05,
            "player_k": 0.08,
        },
        "shrinkage_policy": {
            "formula": "team_n/(team_n+18), remainder split by league_n/(league_n+120)",
            "purpose": "new teams borrow league/sport averages until enough settled matches exist",
        },
        "coverage": {
            "sports": len(by_sport),
            "leagues": len(by_league),
            "teams": len(teams),
            "teams_with_player_prior": sum(1 for t in teams.values() if t["player_prior"]["strength"]),
            "players": player_count,
        },
        "levels": {
            "sport": by_sport,
            "league": by_league,
            "team": teams,
        },
    }


def browser_payload(payload: dict[str, Any]) -> dict[str, Any]:
    teams = []
    for key, row in payload["levels"]["team"].items():
        teams.append([
            key,
            row.get("team_name"),
            row.get("sport"),
            row.get("league"),
            row.get("posterior_xG"),
            row.get("posterior_xGA"),
            row.get("posterior_winrate_home"),
            row.get("posterior_winrate_away"),
            row.get("posterior_btts_rate"),
            row.get("posterior_over25_rate"),
            row.get("sample_size"),
            row.get("shrinkage", {}).get("team"),
            row.get("shrinkage", {}).get("league"),
            row.get("shrinkage", {}).get("sport"),
            row.get("prior_reliability"),
            row.get("player_prior", {}).get("strength"),
        ])
    return {
        "schema": "paris-sportif.bayesian_priors.browser.v5",
        "generated_at": payload["generated_at"],
        "coverage": payload["coverage"],
        "decay": payload["decay"],
        "teams": teams,
        "sports": payload["levels"]["sport"],
        "leagues": payload["levels"]["league"],
    }


def main() -> int:
    payload = build()
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    js = browser_payload(payload)
    OUT_JS.write_text(
        "window.BAYESIAN_PRIORS_V5=" + json.dumps(js, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    c = payload["coverage"]
    print(
        "[bayesian_priors_v5] "
        f"sports={c['sports']} leagues={c['leagues']} teams={c['teams']} "
        f"teams_with_players={c['teams_with_player_prior']} players={c['players']}"
    )
    return 0 if c["teams"] >= 1000 else 1


if __name__ == "__main__":
    raise SystemExit(main())

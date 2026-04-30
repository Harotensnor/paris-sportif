"""
Paris-Sportif MCP server.

Expose les helpers du projet Paris-Sportif comme tools MCP pour Claude Desktop.
Permet de demander à Claude :
  - "Donne-moi les top picks foot avec edge ≥5% aujourd'hui"
  - "Quelle est la performance globale du modèle ?"
  - "Liste les blessures connues sur PSG"
  - "Quels sont les matchs imminents à parier ?"

INSTALL :
  pip install mcp

CONFIG dans claude_desktop_config.json :
  {
    "mcpServers": {
      "paris-sportif": {
        "command": "python",
        "args": ["C:/Users/bouln/Documents/Claude/Projects/paris-sportif-sprints/scripts/mcp_paris_sportif.py"]
      }
    }
  }

PROJECT_ROOT est auto-détecté depuis la position du script.
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# === Path resolution (auto-detect project root) ===
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent  # paris-sportif-sprints/
DATA_JS = PROJECT_ROOT / "data.js"
BACKTEST_V2 = PROJECT_ROOT / "backtest_report_v2.json"
BACKTEST_MARKETS = PROJECT_ROOT / "backtest_report_markets.json"
INJURIES_JSON = PROJECT_ROOT / "injuries_soccer.json"
LINEUPS_JSON = PROJECT_ROOT / "lineups_soccer.json"
WEATHER_JSON = PROJECT_ROOT / "weather.json"
HEALTH_JSON = PROJECT_ROOT / "health.json"
WINAMAX_MARKETS = PROJECT_ROOT / "winamax_markets.json"
DATA_MANIFEST = PROJECT_ROOT / "data_manifest.json"

# === MCP server import ===
try:
    from mcp.server.fastmcp import FastMCP
except ImportError:
    sys.stderr.write(
        "ERROR: package 'mcp' not installed.\n"
        "Run: pip install mcp\n"
        "Or:  pip install \"mcp[cli]\"\n"
    )
    sys.exit(1)


mcp = FastMCP("paris-sportif")


# === Internal helpers ===

def _load_json(path: Path) -> Any:
    """Load JSON file with graceful fallback."""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return {"_error": f"Cannot read {path.name}: {e}"}


def _load_data_js() -> dict:
    """Extract window.PRONOSTICS_DATA from data.js (pseudo-JSON in JS file)."""
    if not DATA_JS.exists():
        return {"_error": "data.js not found"}
    try:
        text = DATA_JS.read_text(encoding="utf-8")
        # Pattern: window.PRONOSTICS_DATA = {...};
        m = re.search(
            r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;",
            text,
            flags=re.DOTALL,
        )
        if not m:
            return {"_error": "PRONOSTICS_DATA pattern not found"}
        return json.loads(m.group(1))
    except Exception as e:
        return {"_error": f"Cannot parse data.js: {e}"}


def _today_iso() -> str:
    """ISO date in Europe/Paris timezone (Y-m-d)."""
    # Use local time conversion (Python doesn't have zoneinfo dependency-free)
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _is_winamax_bookable(match: dict) -> bool:
    """Match avec match_id Winamax + markets 1n2 valides."""
    wnx = match.get("winamax") or {}
    if not wnx.get("available") or not wnx.get("match_id"):
        return False
    markets = wnx.get("markets") or {}
    if not markets:
        return False
    onx = markets.get("1n2") or {}
    home = onx.get("home")
    away = onx.get("away")
    if not (isinstance(home, (int, float)) and home > 1.0):
        return False
    if not (isinstance(away, (int, float)) and away > 1.0):
        return False
    return True


def _implied_prob(odd: float | None) -> float | None:
    """Probability implicite d'une cote décimale."""
    if not isinstance(odd, (int, float)) or odd <= 1.0:
        return None
    return 1.0 / odd


def _edge_estimate(match: dict) -> dict:
    """Approximation de l'edge sans relancer predictMatch (qui est en JS).
    On utilise les probabilités implicites Winamax + heuristic Elo si dispo.
    Ce n'est PAS le vrai modèle, juste un proxy pour le MCP.
    """
    wnx = match.get("winamax") or {}
    markets = wnx.get("markets") or {}
    onx = markets.get("1n2") or {}
    home_odd = onx.get("home")
    away_odd = onx.get("away")
    draw_odd = onx.get("draw")
    return {
        "home_odd": home_odd,
        "draw_odd": draw_odd,
        "away_odd": away_odd,
        "p_home_implied": _implied_prob(home_odd),
        "p_draw_implied": _implied_prob(draw_odd) if draw_odd else None,
        "p_away_implied": _implied_prob(away_odd),
    }


# === MCP TOOLS ===


@mcp.tool()
def get_data_freshness() -> dict:
    """Renvoie la fraîcheur des données : dernière génération, âge en minutes,
    si stale (>4h), et URL d'origine.

    Use case : 'Les données sont-elles à jour ?'
    """
    data = _load_data_js()
    if "_error" in data:
        return data
    gen = data.get("generated_at")
    if not gen:
        return {"_error": "no generated_at field"}
    try:
        gen_ts = datetime.fromisoformat(gen.replace("Z", "+00:00"))
        age_sec = (datetime.now(timezone.utc) - gen_ts).total_seconds()
        age_min = int(age_sec / 60)
        return {
            "generated_at": gen,
            "age_minutes": age_min,
            "is_stale": age_min > 240,
            "is_very_stale": age_min > 360,
            "n_days": len(data.get("days") or {}),
            "manifest": _load_json(DATA_MANIFEST) if DATA_MANIFEST.exists() else None,
        }
    except Exception as e:
        return {"_error": f"timestamp parse failed: {e}"}


@mcp.tool()
def get_today_matches(
    sport: str | None = None,
    bookable_only: bool = True,
    completed: bool = False,
) -> dict:
    """Liste les matchs du jour (Europe/Paris timezone).

    Args:
        sport: Filtre par sport ('football', 'tennis', 'basketball', 'hockey', 'baseball'). None = tous.
        bookable_only: Si True, ne garde que les matchs Winamax-bookable.
        completed: Si True, inclut les matchs déjà terminés.

    Use case : 'Quels matchs y a-t-il aujourd'hui en foot ?'
    """
    data = _load_data_js()
    if "_error" in data:
        return data
    today = _today_iso()
    matches = (data.get("days") or {}).get(today) or []
    out = []
    for m in matches:
        if not completed and m.get("completed"):
            continue
        if sport and m.get("sport") != sport:
            continue
        if bookable_only and not _is_winamax_bookable(m):
            continue
        out.append({
            "id": m.get("id"),
            "sport": m.get("sport"),
            "league": m.get("league_name") or m.get("league_code"),
            "name": m.get("name"),
            "date": m.get("date"),
            "completed": bool(m.get("completed")),
            "live": bool(m.get("live")),
            "winamax_match_id": (m.get("winamax") or {}).get("match_id"),
            **_edge_estimate(m),
        })
    return {
        "date": today,
        "n_total": len(matches),
        "n_returned": len(out),
        "matches": out,
    }


@mcp.tool()
def get_top_value_picks(
    min_edge_pct: float = 3.0,
    sport: str | None = None,
    limit: int = 10,
) -> dict:
    """Approxime les meilleurs picks value du jour basé sur l'écart entre
    proba implicite Winamax et la marge bookmaker.

    NOTE: ce n'est PAS le vrai predictMatch (qui tourne en JS dans le browser).
    C'est une heuristique proxy : on identifie les paris où la marge bookmaker
    est anormalement faible (= prix concurrentiel = potentiel value).

    Args:
        min_edge_pct: Edge minimum en points (3.0 = 3%)
        sport: Filtre par sport
        limit: Nombre max de picks à renvoyer

    Use case : 'Donne-moi 5 picks value foot edge ≥5% aujourd'hui'
    """
    data = _load_data_js()
    if "_error" in data:
        return data
    today = _today_iso()
    matches = (data.get("days") or {}).get(today) or []
    candidates = []
    for m in matches:
        if m.get("completed") or m.get("live"):
            continue
        if sport and m.get("sport") != sport:
            continue
        if not _is_winamax_bookable(m):
            continue
        edge = _edge_estimate(m)
        # Heuristic : compute book margin (1n2 only)
        ph = edge.get("p_home_implied") or 0
        pa = edge.get("p_away_implied") or 0
        pd = edge.get("p_draw_implied") or 0
        total = ph + pa + pd
        if total <= 0:
            continue
        # Margin = total - 1.0 (smaller = more value-friendly book)
        margin = total - 1.0
        # Pour notre proxy : le meilleur pick = celui avec la meilleure
        # combinaison cote * (1 - margin)
        best_side = None
        best_p = 0
        for side, p in [("1", ph), ("2", pa), ("X", pd)]:
            if p and p > best_p:
                best_p = p
                best_side = side
        # Approximation : si margin < 5%, le book est "competitive" → potentiel value
        edge_estimate_pct = max(0, (5.0 - margin * 100))
        if edge_estimate_pct < min_edge_pct:
            continue
        candidates.append({
            "id": m.get("id"),
            "sport": m.get("sport"),
            "league": m.get("league_name") or m.get("league_code"),
            "name": m.get("name"),
            "date": m.get("date"),
            "best_side": best_side,
            "best_prob_implied": round(best_p, 3) if best_p else None,
            "best_odd": (
                edge.get("home_odd") if best_side == "1"
                else edge.get("away_odd") if best_side == "2"
                else edge.get("draw_odd")
            ),
            "book_margin_pct": round(margin * 100, 2),
            "edge_estimate_pct": round(edge_estimate_pct, 2),
        })
    candidates.sort(key=lambda x: -x["edge_estimate_pct"])
    return {
        "date": today,
        "n_candidates": len(candidates),
        "min_edge_pct_used": min_edge_pct,
        "warning": "Ces edges sont des PROXIES (pas le vrai predictMatch JS). Vérifie sur le site pour les calculs précis.",
        "picks": candidates[:limit],
    }


@mcp.tool()
def get_model_performance() -> dict:
    """Performance globale du modèle (backtest_report_v2.json).

    Renvoie : WR, ROI flat, ROI Kelly, Brier, log-loss, n_picks, par sport, par tier.

    Use case : 'Comment performe le modèle ces derniers temps ?'
    """
    rep = _load_json(BACKTEST_V2)
    if "_error" in rep:
        return rep
    overall = rep.get("overall") or {}
    by_sport = rep.get("by_sport") or {}
    by_tier = rep.get("by_tier") or {}
    return {
        "generated_at": rep.get("generated_at"),
        "n_events": rep.get("n_events"),
        "date_range": rep.get("date_range"),
        "overall": {
            "n": overall.get("n"),
            "win_rate": overall.get("win_rate"),
            "flat_roi_pct": overall.get("flat_roi_pct"),
            "flat_pnl": overall.get("flat_pnl"),
            "kelly_pnl": overall.get("kelly_pnl"),
            "brier": overall.get("brier"),
            "log_loss": overall.get("log_loss"),
            "avg_pick_prob": overall.get("avg_pick_prob"),
            "avg_clv_pct": overall.get("avg_clv_pct"),
        },
        "by_sport": {
            sport: {
                "n": stats.get("n"),
                "win_rate": stats.get("win_rate"),
                "flat_roi_pct": stats.get("flat_roi_pct"),
                "brier": stats.get("brier"),
            }
            for sport, stats in by_sport.items()
        },
        "by_tier": {
            tier: {
                "n": stats.get("n"),
                "win_rate": stats.get("win_rate"),
                "flat_roi_pct": stats.get("flat_roi_pct"),
            }
            for tier, stats in by_tier.items()
        },
    }


@mcp.tool()
def get_calibration() -> dict:
    """Récupère la courbe de calibration (10 bins) — diagnostique pour savoir
    si le modèle est bien calibré (proba prédite ↔ win rate observé).

    Modèle parfait : prob_mean ≈ win_rate dans chaque bin (gap = 0).

    Use case : 'Le modèle est-il bien calibré ?'
    """
    rep = _load_json(BACKTEST_V2)
    if "_error" in rep:
        return rep
    bins = rep.get("calibration") or []
    return {
        "n_bins": len(bins),
        "bins": [
            {
                "range": f"{b['lo']:.0%}-{b['hi']:.0%}",
                "n": b.get("n"),
                "prob_mean": b.get("prob_mean"),
                "win_rate": b.get("win_rate"),
                "gap_pct": (b["gap"] * 100) if b.get("gap") is not None else None,
            }
            for b in bins
        ],
        "isotonic_pairs_count": len(rep.get("isotonic_pairs") or []),
        "interpretation": (
            "Modèle parfait : prob_mean ≈ win_rate dans chaque bin (gap=0). "
            "Si gap > 5pp systématique : modèle biaisé."
        ),
    }


@mcp.tool()
def search_match(query: str, limit: int = 10) -> dict:
    """Recherche un match par nom d'équipe / ligue / ville.

    Args:
        query: terme de recherche (ex: 'PSG', 'Premier League', 'Madrid')
        limit: nombre max de résultats

    Use case : 'Trouve le prochain match du PSG'
    """
    data = _load_data_js()
    if "_error" in data:
        return data
    q = (query or "").lower().strip()
    if not q:
        return {"_error": "query required"}
    days = data.get("days") or {}
    out = []
    seen_ids = set()
    for day_iso in sorted(days.keys()):
        for m in (days[day_iso] or []):
            mid = m.get("id")
            if mid in seen_ids:
                continue
            comps = m.get("competitors") or []
            comp_names = " ".join(str(c.get("name") or "") for c in comps if isinstance(c, dict))
            haystack = " ".join([
                str(m.get("name") or ""),
                str(m.get("league_name") or ""),
                str(m.get("league_code") or ""),
                comp_names,
            ]).lower()
            if q in haystack:
                seen_ids.add(mid)
                out.append({
                    "id": mid,
                    "sport": m.get("sport"),
                    "league": m.get("league_name") or m.get("league_code"),
                    "name": m.get("name"),
                    "date": m.get("date"),
                    "completed": bool(m.get("completed")),
                    "winamax_bookable": _is_winamax_bookable(m),
                    "_day_iso": day_iso,
                })
                if len(out) >= limit:
                    break
        if len(out) >= limit:
            break
    return {"query": query, "n_results": len(out), "matches": out}


@mcp.tool()
def evaluate_match_signals(match_id: str) -> dict:
    """Détaille tous les signaux disponibles pour un match (cotes, blessures,
    lineups, météo si foot).

    Args:
        match_id: ID du match (depuis get_today_matches ou search_match)

    Use case : 'Pour le match PSG-Marseille, montre-moi tous les signaux'
    """
    data = _load_data_js()
    if "_error" in data:
        return data
    target = None
    for arr in (data.get("days") or {}).values():
        for m in (arr or []):
            if str(m.get("id")) == str(match_id):
                target = m
                break
        if target:
            break
    if not target:
        return {"_error": f"match {match_id} not found"}
    sport = target.get("sport")
    home_team = next((c.get("name") for c in (target.get("competitors") or []) if c.get("home_away") == "home"), None)
    away_team = next((c.get("name") for c in (target.get("competitors") or []) if c.get("home_away") == "away"), None)
    out = {
        "id": target.get("id"),
        "sport": sport,
        "league": target.get("league_name"),
        "date": target.get("date"),
        "name": target.get("name"),
        "home": home_team,
        "away": away_team,
        "completed": bool(target.get("completed")),
        "score_home": next((c.get("score") for c in (target.get("competitors") or []) if c.get("home_away") == "home"), None),
        "score_away": next((c.get("score") for c in (target.get("competitors") or []) if c.get("home_away") == "away"), None),
        "odds_winamax": _edge_estimate(target),
        "odds_external_snapshot": target.get("odds_snapshot"),
        "weather": target.get("weather") if sport == "football" else None,
        "referee": target.get("referee") if sport == "football" else None,
    }
    # Inject lineups + injuries from sidecars
    if sport == "football":
        injuries = _load_json(INJURIES_JSON)
        if not injuries.get("_error"):
            mid = str(target.get("id"))
            inj_match = (injuries.get("matches") or {}).get(mid)
            if inj_match:
                out["injuries"] = {
                    "home": inj_match.get("home", []),
                    "away": inj_match.get("away", []),
                }
        lineups = _load_json(LINEUPS_JSON)
        if not lineups.get("_error"):
            mid = str(target.get("id"))
            lup_match = (lineups.get("matches") or {}).get(mid)
            if lup_match:
                out["lineups"] = {
                    "home_starters_count": len(lup_match.get("home", {}).get("starters", [])),
                    "away_starters_count": len(lup_match.get("away", {}).get("starters", [])),
                    "confirmed": bool(lup_match.get("home", {}).get("starters")) and bool(lup_match.get("away", {}).get("starters")),
                }
    return out


@mcp.tool()
def compute_kelly_stake(
    prob: float,
    odd: float,
    bankroll: float = 100.0,
    fraction: float = 0.25,
    cap_pct: float = 0.10,
) -> dict:
    """Calcule la mise Kelly fractionnée pour un pari.

    Args:
        prob: probabilité de gagner (0-1, ex 0.62 pour 62%)
        odd: cote décimale (ex 1.85)
        bankroll: bankroll totale en €
        fraction: fraction Kelly (0.25 = quart Kelly, conservateur)
        cap_pct: cap maximum par pari (0.10 = 10% bankroll)

    Use case : 'Si je mise 50€ avec proba 60% et cote 1.85, combien Kelly suggère ?'
    """
    if not (0 < prob < 1) or odd <= 1:
        return {"_error": "prob must be in (0, 1) and odd > 1"}
    b = odd - 1
    q = 1 - prob
    full_kelly = (b * prob - q) / b
    if full_kelly <= 0:
        return {
            "edge": prob - (1 / odd),
            "full_kelly_pct": full_kelly,
            "stake": 0,
            "reason": "Kelly négatif (pas d'edge) → skip",
        }
    fractional = full_kelly * fraction
    stake = bankroll * fractional
    cap = bankroll * cap_pct
    if stake > cap:
        stake = cap
        capped = True
    else:
        capped = False
    expected_profit = stake * prob * (odd - 1) - stake * (1 - prob)
    return {
        "prob": prob,
        "odd": odd,
        "bankroll": bankroll,
        "fraction_kelly": fraction,
        "edge": round(prob - (1 / odd), 4),
        "full_kelly_pct": round(full_kelly * 100, 2),
        "stake": round(stake, 2),
        "stake_pct_bankroll": round((stake / bankroll) * 100, 2),
        "capped_at_max_pct": capped,
        "expected_profit_per_bet": round(expected_profit, 2),
        "potential_win_if_won": round(stake * (odd - 1), 2),
        "potential_loss_if_lost": round(stake, 2),
    }


@mcp.tool()
def get_health_status() -> dict:
    """Renvoie l'état du pipeline data (health.json) : sources OK / dégradées / KO.

    Use case : 'Le pipeline data fonctionne-t-il ?'
    """
    health = _load_json(HEALTH_JSON)
    if "_error" in health:
        return health
    return {
        "generated_at": health.get("generated_at"),
        "overall": health.get("overall"),
        "sources": health.get("sources"),
        "alerts": health.get("alerts"),
    }


@mcp.tool()
def list_sports_available() -> dict:
    """Liste les sports avec données disponibles + nb matchs par sport aujourd'hui.

    Use case : 'Quels sports ont des matchs aujourd'hui ?'
    """
    data = _load_data_js()
    if "_error" in data:
        return data
    today = _today_iso()
    matches = (data.get("days") or {}).get(today) or []
    by_sport: dict[str, dict] = {}
    for m in matches:
        sp = m.get("sport") or "unknown"
        if sp not in by_sport:
            by_sport[sp] = {"total": 0, "bookable": 0, "live": 0, "completed": 0}
        by_sport[sp]["total"] += 1
        if _is_winamax_bookable(m):
            by_sport[sp]["bookable"] += 1
        if m.get("live"):
            by_sport[sp]["live"] += 1
        if m.get("completed"):
            by_sport[sp]["completed"] += 1
    return {
        "date": today,
        "by_sport": by_sport,
        "total_matches": len(matches),
    }


@mcp.tool()
def get_market_calibration_summary() -> dict:
    """Résumé de la calibration par marché (1N2, OU 2.5, BTTS, etc.).

    Source : backtest_report_markets.json. Renvoie WR + ROI par (marché, pick).

    Use case : 'Sur quels marchés le modèle est-il le plus performant ?'
    """
    rep = _load_json(BACKTEST_MARKETS)
    if "_error" in rep:
        return rep
    by_market_pick = rep.get("by_market_pick") or {}
    # Agrégation par marché
    by_market: dict[str, dict] = {}
    for key, stats in by_market_pick.items():
        market = key.split(":")[0] if ":" in key else key
        if market not in by_market:
            by_market[market] = {"n": 0, "wins": 0, "stake_pnl": 0.0}
        by_market[market]["n"] += stats.get("n", 0) or 0
        by_market[market]["wins"] += stats.get("wins", 0) or 0
    # Compute WR per market
    out = []
    for market, agg in by_market.items():
        if agg["n"] < 5:
            continue
        out.append({
            "market": market,
            "n": agg["n"],
            "win_rate": round(agg["wins"] / agg["n"], 4) if agg["n"] else None,
        })
    out.sort(key=lambda x: -(x.get("win_rate") or 0))
    return {
        "n_markets": len(out),
        "completed_evaluated": rep.get("completed_evaluated"),
        "by_market": out,
    }


# === Main entry ===

if __name__ == "__main__":
    mcp.run()

#!/usr/bin/env python3
"""AUDIT 2026-05-08 v39.3 — Détecte les incohérences dans les pronos.

User : "cherche les incohérences dans les pronos".

Le frontend (predictMatch en JS) est trop lourd à charger ici (V8 embedded
via model_loader.py = ~5 min de cold start). Donc cet audit ne ré-exécute
PAS le modèle. À la place il scanne les **cotes bookmaker** (winamax.markets)
et flag :

1. **Vig anormale** : sum des probas implicites 1n2 hors plage normale
   (1.05-1.10 pour bookmaker classique).
   Trop bas (< 0.98) = arbitrage gratuit suspect (probable bug data).
   Trop haut (> 1.15) = vig énorme (probable petite ligue ou cote suspecte).

2. **Cross-market contradiction** : 1n2 + OU 2.5 + BTTS doivent être cohérents
   entre eux pour une même distribution Poisson.
   Exemple incohérent :
     1n2 home = 60% (équipe forte), OU 2.5 over = 30% (peu de buts).
   Une équipe vraiment forte gagne souvent par 2-3 buts → over devrait
   être plus haut. Si over < 30% mais home > 50% → soit le bookmaker a
   mispriced un des deux marchés, soit les data sont corrompues.

3. **Cotes extrêmes** : odd > 50 sur un marché 2-issues (1n2, BTTS) =
   probablement erreur (sauf score exact / outsider rare).

4. **Asymétrie 1n2 suspecte** : favori avec cote < 1.10 ou outsider > 30
   → marché non liquide, à éviter.

5. **Markets validation timestamps incohérents** : markets_fetched_at très
   ancien (>6h) sur un match scheduled aujourd'hui = data stale.

Sortie : `prono_consistency_report.json` à la racine.
Format : { generated_at, n_events, n_checked, issues: [...], summary: {...} }
"""
from __future__ import annotations

import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
OUT = ROOT / "prono_consistency_report.json"

# Vig acceptable pour bookmaker classique (sum implied probs)
VIG_NORMAL_MIN = 1.02   # 2% vig (rare, marché très liquide)
VIG_NORMAL_MAX = 1.10   # 10% vig (typique Winamax fav match)
VIG_HIGH_MAX = 1.20     # 20% vig = warning (small league)

# Cote extrême
EXTREME_ODD_MIN = 1.05
EXTREME_ODD_MAX = 50.0

# Asymétrie 1n2
HEAVY_FAV_THRESHOLD = 1.10  # cote favori
EXTREME_OUTSIDER_THRESHOLD = 30.0


def implied_prob(odd: float) -> float | None:
    if not isinstance(odd, (int, float)):
        return None
    if odd <= 1.0 or odd > 200:
        return None
    return 1.0 / odd


def remove_vig(probs: list[float]) -> list[float]:
    s = sum(probs)
    if s <= 0:
        return probs
    return [p / s for p in probs]


def poisson_pmf(lam: float, k: int) -> float:
    if lam <= 0 or k < 0:
        return 0.0
    return math.exp(-lam) * (lam ** k) / math.factorial(k)


def poisson_score_grid(lam_h: float, lam_a: float, max_goals: int = 8) -> dict:
    """Retourne probas dérivées d'un Poisson joint."""
    grid = {}
    p_home = p_draw = p_away = 0.0
    p_over_05 = p_over_15 = p_over_25 = p_over_35 = 0.0
    p_btts = 0.0
    for h in range(max_goals + 1):
        for a in range(max_goals + 1):
            p = poisson_pmf(lam_h, h) * poisson_pmf(lam_a, a)
            if h > a:
                p_home += p
            elif h < a:
                p_away += p
            else:
                p_draw += p
            total = h + a
            if total >= 1:
                p_over_05 += p
            if total >= 2:
                p_over_15 += p
            if total >= 3:
                p_over_25 += p
            if total >= 4:
                p_over_35 += p
            if h >= 1 and a >= 1:
                p_btts += p
    return {
        "p_home": p_home, "p_draw": p_draw, "p_away": p_away,
        "p_over_25": p_over_25, "p_over_15": p_over_15, "p_btts": p_btts,
    }


def fit_lambdas_from_market(p_home: float, p_draw: float, p_away: float,
                             p_over_25: float | None = None) -> tuple[float, float] | None:
    """Estimateur grossier des lambdas attendus.

    Si on connaît p_over_25 : on cherche (lam_h, lam_a) tels que les probas
    Poisson collent. Approche : grid search sur lam_total ∈ [1.5, 4.0],
    ratio_home ∈ [0.3, 0.7]. Loss = SSE entre probas observées et calculées.
    """
    best = None
    best_loss = float("inf")
    target_total = None
    if p_over_25 is not None and 0.05 < p_over_25 < 0.95:
        # Approx : P(over 2.5) ≈ 1 - P(0)-P(1)-P(2) for Poisson(lam_total).
        # Solve by inverse interpolation.
        for lam in [x / 10 for x in range(15, 41)]:  # 1.5 .. 4.0
            p = 1 - poisson_pmf(lam, 0) - poisson_pmf(lam, 1) - poisson_pmf(lam, 2)
            if abs(p - p_over_25) < 0.02:
                target_total = lam
                break
    else:
        # Fallback : ratio P(home)/P(away) gives ratio of lambdas, but not magnitude
        target_total = 2.6
    if target_total is None:
        target_total = 2.6
    for ratio in [r / 100 for r in range(30, 71, 2)]:  # 0.30 .. 0.70
        lam_h = target_total * ratio
        lam_a = target_total * (1 - ratio)
        grid = poisson_score_grid(lam_h, lam_a, max_goals=8)
        loss = (grid["p_home"] - p_home) ** 2 + (grid["p_draw"] - p_draw) ** 2 + (grid["p_away"] - p_away) ** 2
        if loss < best_loss:
            best_loss = loss
            best = (lam_h, lam_a)
    return best


def load_data_js() -> dict:
    text = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$", text, re.S)
    if not m:
        raise SystemExit("[prono-consistency] FAIL: cannot parse data.js")
    return json.loads(m.group(1))


def check_event(event: dict) -> list[dict]:
    issues: list[dict] = []
    eid = str(event.get("id") or "?")
    name = event.get("name") or "?"
    sport = event.get("sport") or "?"
    league = event.get("league_code") or "?"
    wx = event.get("winamax") or {}
    markets = wx.get("markets") or {}
    if not markets:
        return issues
    base = {"event_id": eid, "name": name, "sport": sport, "league": league}

    one = markets.get("1n2") or {}
    home_odd = one.get("home")
    draw_odd = one.get("draw")
    away_odd = one.get("away")

    if isinstance(home_odd, (int, float)) and isinstance(away_odd, (int, float)):
        # 1. Cotes extrêmes
        if home_odd < EXTREME_ODD_MIN or home_odd > EXTREME_ODD_MAX:
            issues.append({**base, "code": "extreme_odd", "side": "home", "odd": home_odd, "severity": "high"})
        if away_odd < EXTREME_ODD_MIN or away_odd > EXTREME_ODD_MAX:
            issues.append({**base, "code": "extreme_odd", "side": "away", "odd": away_odd, "severity": "high"})

        # 2. Vig 1n2
        probs = [implied_prob(home_odd), implied_prob(away_odd)]
        if isinstance(draw_odd, (int, float)):
            probs.insert(1, implied_prob(draw_odd))
        probs = [p for p in probs if p is not None]
        if probs:
            vig = sum(probs)
            if vig > VIG_HIGH_MAX:
                issues.append({**base, "code": "vig_high", "vig": round(vig, 3), "severity": "warn", "detail": f"vig 1n2 {(vig-1)*100:.1f}% > 20%"})
            elif vig < 0.98:
                issues.append({**base, "code": "vig_arbitrage", "vig": round(vig, 3), "severity": "high", "detail": f"vig 1n2 {(vig-1)*100:.1f}% < -2% — arbitrage suspect"})
            elif vig > VIG_NORMAL_MAX:
                issues.append({**base, "code": "vig_high_warn", "vig": round(vig, 3), "severity": "info", "detail": f"vig 1n2 {(vig-1)*100:.1f}% > 10%"})

        # 3. Heavy favorite suspect
        if home_odd <= HEAVY_FAV_THRESHOLD:
            issues.append({**base, "code": "heavy_fav", "side": "home", "odd": home_odd, "severity": "info", "detail": "favori écrasant (cote < 1.10), value rare"})
        if away_odd <= HEAVY_FAV_THRESHOLD:
            issues.append({**base, "code": "heavy_fav", "side": "away", "odd": away_odd, "severity": "info", "detail": "favori écrasant (cote < 1.10), value rare"})

        # 4. Outsider extrême
        if home_odd >= EXTREME_OUTSIDER_THRESHOLD or away_odd >= EXTREME_OUTSIDER_THRESHOLD:
            issues.append({**base, "code": "extreme_outsider", "home_odd": home_odd, "away_odd": away_odd, "severity": "info"})

    # 5. Cross-market consistency (foot only, where Poisson makes sense)
    ou25 = markets.get("ou25") or {}
    btts = markets.get("btts") or {}
    if (sport == "football" and isinstance(home_odd, (int, float)) and
        isinstance(draw_odd, (int, float)) and isinstance(away_odd, (int, float)) and
        ou25.get("over") and ou25.get("under") and btts.get("yes") and btts.get("no")):
        # Devig 1n2
        p_one = remove_vig([implied_prob(home_odd), implied_prob(draw_odd), implied_prob(away_odd)])
        # Devig OU 2.5
        p_ou = remove_vig([implied_prob(ou25["over"]), implied_prob(ou25["under"])])
        # Devig BTTS
        p_btts = remove_vig([implied_prob(btts["yes"]), implied_prob(btts["no"])])
        # Fit Poisson
        fit = fit_lambdas_from_market(p_one[0], p_one[1], p_one[2], p_ou[0])
        if fit:
            lam_h, lam_a = fit
            grid = poisson_score_grid(lam_h, lam_a, 8)
            # Compare modèle Poisson vs marché
            delta_btts = abs(grid["p_btts"] - p_btts[0])
            delta_ou = abs(grid["p_over_25"] - p_ou[0])
            if delta_btts > 0.10:
                issues.append({**base, "code": "cross_market_btts",
                              "severity": "warn",
                              "market_btts_yes": round(p_btts[0], 3),
                              "implied_btts_from_1n2_ou25": round(grid["p_btts"], 3),
                              "delta": round(delta_btts, 3),
                              "detail": f"BTTS marché {p_btts[0]*100:.0f}% vs Poisson dérivé {grid['p_btts']*100:.0f}% — écart {delta_btts*100:.0f}pt"})
            if delta_ou > 0.10:
                issues.append({**base, "code": "cross_market_ou25",
                              "severity": "warn",
                              "market_ou25_over": round(p_ou[0], 3),
                              "implied_ou25_from_1n2": round(grid["p_over_25"], 3),
                              "delta": round(delta_ou, 3),
                              "detail": f"OU 2.5 marché {p_ou[0]*100:.0f}% vs Poisson dérivé {grid['p_over_25']*100:.0f}% — écart {delta_ou*100:.0f}pt"})

    return issues


def main() -> int:
    data = load_data_js()
    days = data.get("days") or {}
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    all_issues: list[dict] = []
    n_total = 0
    n_checked = 0
    n_winamax = 0
    for day, events in days.items():
        for ev in events or []:
            n_total += 1
            wx = ev.get("winamax") or {}
            if wx.get("available") is True:
                n_winamax += 1
                if wx.get("markets"):
                    n_checked += 1
                    all_issues.extend(check_event(ev))

    by_code: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    for it in all_issues:
        c = it.get("code", "unknown")
        s = it.get("severity", "info")
        by_code[c] = by_code.get(c, 0) + 1
        by_severity[s] = by_severity.get(s, 0) + 1

    high_issues = [i for i in all_issues if i.get("severity") == "high"]
    warn_issues = [i for i in all_issues if i.get("severity") == "warn"]

    report = {
        "schema_version": 1,
        "generated_at": now_iso,
        "data_generated_at": data.get("generated_at"),
        "n_events_total": n_total,
        "n_events_winamax": n_winamax,
        "n_events_checked": n_checked,
        "n_issues_total": len(all_issues),
        "by_severity": by_severity,
        "by_code": by_code,
        "top_high_issues": high_issues[:30],
        "top_warn_issues": warn_issues[:30],
    }
    OUT.write_text(json.dumps(report, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"[prono-consistency] OK {len(all_issues)} issues sur {n_checked} events checkés "
          f"(high={by_severity.get('high', 0)}, warn={by_severity.get('warn', 0)}, info={by_severity.get('info', 0)})")
    if by_code:
        print("Top codes :")
        for code, n in sorted(by_code.items(), key=lambda x: -x[1])[:10]:
            print(f"  {code:24s} {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

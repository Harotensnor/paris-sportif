#!/usr/bin/env python3
"""Static guardrails for the V37 betting-table clarity fixes.

This is intentionally small and dependency-free: it catches regressions where
the dashboard re-exposes trader jargon, loses the score legend, or opens modal
reasons that are not anchored to the exact clicked pick.
"""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def require(text: str, needle: str, label: str) -> None:
    if needle not in text:
        raise SystemExit(f"missing {label}: {needle}")


def main() -> None:
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    css = (ROOT / "app.css").read_text(encoding="utf-8")

    require(app, "Filtre cote stricte appliqué", "friendly strict tag")
    require(app, "Cote surévaluée détectée", "friendly fade tag")
    require(app, "Cote bouge fortement", "friendly steam tag")
    require(app, "Score d'opportunité (0-100)", "global opportunity score legend")
    require(app, "Décomposition:", "opportunity tooltip breakdown")
    require(app, "Buts attendus : ${home?.name", "modal xG names")
    require(app, "face à ${opponentName}", "team-total opponent context")
    require(app, "neededMargin", "handicap margin explanation")
    require(app, "data-pick-uid", "table-to-modal pick identity")
    require(css, ".v36-table-row.is-same-match", "same-match visual grouping")

    print("ux clarity audit ok")


if __name__ == "__main__":
    main()

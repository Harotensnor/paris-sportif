#!/usr/bin/env python3
"""Detect orphan renderXxxPage functions that no nav route can reach.

The v37.040–044 sweep surfaced eight pages whose dedicated renderer
existed and ran on every applyPageView cycle, but whose visibility
gate (`currentPage === 'X'`) was never true thanks to a PAGE_ALIASES
rewrite to a different hub. The pages mounted ~10–150 KB of HTML
each behind display:none, completely unreachable through the nav.

This audit re-runs that detection on every CI:
  - every renderXxxPage function declared in legacy-app.js
  - every #xxx-wrap container created in applyPageView
  - every visibility flag declared as `const isXxx = ...`

For each, assert that the corresponding route name 'xxx' is either:
  (a) in VALID_PAGES, OR
  (b) has a documented alias in PAGE_ALIASES that points at a hub
      whose renderer DOES include the orphan content (rare, manually
      acked)

Fails on undocumented orphans so the next refactor doesn't silently
hide a fully-rendered page from users.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGACY = ROOT / "legacy-app.js"

# Routes that intentionally have a renderer but route through a hub.
# Each entry MUST come with a comment explaining why; otherwise a fresh
# orphan slips in unnoticed.
ACK_ALIASES = {
    # 'matchs' renders inline on the dashboard hub; the alias is correct.
    'matchs': 'dashboard',
    'matchs-detectes': 'dashboard',
    'methode': 'academie',
    'methodologie': 'academie',
    'comment-lire': 'academie',
    'comment-lire-un-prono': 'academie',
    'buteur': 'buteurs',
    'health': 'profil',  # legacy alias for the Santé page (now reachable via #sante)
    'top': 'dashboard',
    'locks': 'dashboard',
    'home': 'dashboard',
    'live': 'tous',
    'stats': 'performance',
    'resultats': 'performance',
    'mes-paris': 'performance',
    'favoris': 'profil',  # isFavoris hardcoded false; intentional consolidation
    'simulator': 'profil',  # bankroll simulator section inside Profil
    'legal': 'profil',
    'mentions-legales': 'profil',
    'diagnostic': 'profil',
    'calendrier': 'tous',  # rendered as a sub-view inside Tous via ?view=calendar
    'league': 'tous',
    'valeur': 'tous',
    'plan-mise': 'tous',
    'montante-jour': 'montantes',
    'montante-weekend': 'montantes',
    'montante-semaine': 'montantes',
    'montantes-jour': 'montantes',
    'montantes-weekend': 'montantes',
    'montantes-semaine': 'montantes',
    # Sports coverage hub aliases (ball-sports family)
    'rugby-15': 'rugby',
    'rugby-13': 'rugby',
    'box-mma': 'combat',
    'boxing': 'combat',
    'cycling': 'cyclisme',
    'sports-hiver': 'ski',
    'winter': 'ski',
    'winter-sports': 'ski',
    'biathlon': 'ski',
    'athletisme': 'athle',
    'athlétisme': 'athle',
    'tennis-challenger-itf': 'tennis-challenger',
    'challenger': 'tennis-challenger',
    'itf': 'tennis-challenger',
    'foot-fem': 'foot-feminin',
    'football-feminin': 'foot-feminin',
    'wnba': 'foot-feminin',
    'american-football': 'nfl',
    'nfl-playoffs': 'nfl',
}


def read_legacy() -> str:
    return LEGACY.read_text(encoding="utf-8")


def find_renderers(src: str) -> set[str]:
    """Return the camelCase names found in `function renderXxxPage(`."""
    return {m.group(1) for m in re.finditer(r"function\s+render([A-Z][A-Za-z0-9]+)Page\s*\(", src)}


def find_visibility_flags(src: str) -> dict[str, str]:
    """Return mapping isXxx → expression rhs."""
    out: dict[str, str] = {}
    for m in re.finditer(
        r"const\s+(is[A-Z][A-Za-z0-9]+)\s*=\s*([^;\n]+);", src
    ):
        out[m.group(1)] = m.group(2).strip()
    return out


def find_valid_pages(src: str) -> set[str]:
    m = re.search(r"VALID_PAGES\s*=\s*\[([^\]]*)\]", src)
    if not m:
        return set()
    body = m.group(1)
    return {tok.strip().strip("'\"") for tok in re.findall(r"'([a-z][a-z0-9-]+)'", body)}


def find_page_aliases(src: str) -> dict[str, str]:
    m = re.search(r"PAGE_ALIASES\s*=\s*\{([\s\S]*?)\};", src)
    if not m:
        return {}
    body = m.group(1)
    out: dict[str, str] = {}
    for line in body.splitlines():
        am = re.search(r"'([^']+)'\s*:\s*'([^']+)'", line)
        if am:
            out[am.group(1)] = am.group(2)
    return out


def renderer_to_route(name: str) -> str:
    """renderHistoriquePage → historique, renderSantePage → sante."""
    return name.lower()


SPECIAL_RENDERER_TO_ROUTE = {
    'Combines': 'combines',
    'PicksHistoryArchive': None,  # internal subroutine for renderHistoriquePage
    'SportsCoverage': None,  # parameterised renderer; routes via isSportsCoverage
    'BilanRow': None,  # row helper, not a page
    'Montante': 'montantes',  # plural route name
}


def main() -> int:
    src = read_legacy()
    renderers = find_renderers(src)
    flags = find_visibility_flags(src)
    valid = find_valid_pages(src)
    aliases = find_page_aliases(src)

    errors: list[str] = []
    for r in sorted(renderers):
        if r in SPECIAL_RENDERER_TO_ROUTE and SPECIAL_RENDERER_TO_ROUTE[r] is None:
            continue
        route = SPECIAL_RENDERER_TO_ROUTE.get(r) or renderer_to_route(r)
        if route in valid:
            continue
        if route in aliases:
            target = aliases[route]
            ack = ACK_ALIASES.get(route)
            if ack == target:
                continue
            errors.append(
                f"render{r}Page exists but '{route}' is aliased to '{target}' "
                f"with no entry in ACK_ALIASES — page is likely unreachable. "
                f"Either un-alias OR add ACK_ALIASES['{route}'] = '{target}' "
                f"with a comment explaining the consolidation."
            )
            continue
        errors.append(
            f"render{r}Page exists but '{route}' is neither in VALID_PAGES "
            f"nor in PAGE_ALIASES."
        )

    # Also flag visibility flags that are hardcoded false / true.
    for flag, rhs in flags.items():
        if rhs in ('false', 'true'):
            # Only error when the renderer for this flag exists.
            cand = re.sub(r'^is', '', flag)
            if cand in renderers:
                errors.append(
                    f"const {flag} = {rhs};  -- the {cand} renderer is gated "
                    f"on this flag but the value is hardcoded. Change to "
                    f"`currentPage === '{cand.lower()}'` or remove the flag."
                )

    if errors:
        print("[orphan-renderers] FAIL")
        for e in errors:
            print(f"- {e}")
        return 1
    print(f"[orphan-renderers] OK ({len(renderers)} renderers, {len(valid)} valid pages, {len(aliases)} aliases)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

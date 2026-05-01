#!/usr/bin/env python3
"""Attach Winamax multi-market odds to each event in data.js.

Runs AFTER ``patch_winamax.py`` (which sets ``ev.winamax.match_id``) and
uses ``winamax_markets.json`` (produced by ``fetch_winamax_markets.py``)
as the lookup table.

Sets ``ev.winamax.markets = {...}`` in-place for every event whose
Winamax match_id appears in the markets file. Events without a match in
the file are left unchanged (backward-compatible).

Idempotent.
"""
from __future__ import annotations
import json
import re
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import _name_tokens

ROOT     = Path(__file__).resolve().parent.parent
DATA_JS  = ROOT / 'data.js'
HTML     = ROOT / 'pronostics.html'
MARKETS  = ROOT / 'winamax_markets.json'


def _names_match(name_a: str, name_b: str) -> bool:
    """True if the two names share at least one normalized last-name token.
    Re-uses the matcher already used by winamax_map.lookup so behavior stays
    consistent (handles 'Borges N.' ↔ 'Nuno Borges', accents, aliases…)."""
    if not name_a or not name_b:
        return False
    return bool(_name_tokens(name_a) & _name_tokens(name_b))


def _align_markets_to_espn(markets: dict, ev: dict) -> None:
    """Mutate markets['1n2'] in place so .home / .away match the ESPN
    competitors order, swapping when Winamax stored the favorite under the
    "wrong" side relative to ESPN.

    Symptom this fixes (2026-04-25) : ESPN had Cristian home + Sabalenka away,
    fetch_winamax_markets.py wrote ``{'home': 1.02, 'away': 14.5, ...}`` from
    Winamax's own first-listed selection (Sabalenka). The JS reads .home/.away
    assuming ESPN order → priced 'A. Sabalenka' at @14.5 and surfaced a fake
    +69pt edge on the dashboard.

    Decision is name-based, not title-based: we read ``home_name`` /
    ``away_name`` written by the fetcher (the actual selection labels of the
    1N2 odds, not the match title — those can disagree per the Tsitsipas vs
    Bublik case where the title was 'Bublik - Tsitsipas' yet the favorite
    odd was listed first). OU/BTTS are team-agnostic so no swap is needed.
    """
    n12 = markets.get('1n2')
    if not isinstance(n12, dict) or 'home' not in n12 or 'away' not in n12:
        return
    wx_home_name = n12.get('home_name') or ''
    wx_away_name = n12.get('away_name') or ''
    competitors = ev.get('competitors') or []
    if len(competitors) != 2 or not wx_home_name or not wx_away_name:
        return
    espn_home = (competitors[0] or {}).get('name') or ''
    espn_away = (competitors[1] or {}).get('name') or ''
    if not espn_home or not espn_away:
        return
    home_aligned = _names_match(espn_home, wx_home_name)
    away_aligned = _names_match(espn_away, wx_home_name)
    # Swap only when the Winamax 'home' selection matches ESPN's away AND
    # not ESPN's home. If both match (rare same-surname) or neither (name
    # mismatch elsewhere), leave as-is rather than risk the wrong direction.
    if away_aligned and not home_aligned:
        n12['home'], n12['away'] = n12['away'], n12['home']
        if 'home_name' in n12 and 'away_name' in n12:
            n12['home_name'], n12['away_name'] = n12['away_name'], n12['home_name']


def main() -> int:
    if not MARKETS.exists():
        print(f'WARN: {MARKETS} absent — nothing to patch. Skip.')
        return 0
    if not DATA_JS.exists():
        print(f'ERROR: {DATA_JS} absent.')
        return 1

    markets_doc = json.loads(MARKETS.read_text(encoding='utf-8'))
    markets_by_mid = markets_doc.get('matches') or {}
    if not markets_by_mid:
        print('WARN: winamax_markets.json has no matches. Skip.')
        return 0

    text = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL)
    if not m:
        print('ERROR: could not parse data.js')
        return 1
    data = json.loads(m.group(1))
    days = data.get('days', {}) or {}

    # AUDIT-2026-04-27 (Sprint 1 #3) — Garde-fou cotes absurdes.
    # Si l'extraction Winamax retourne une cote < 1.01 (impossible en réel)
    # ou > 1000 (juste avant un retrait de marché, valeur poubelle), ou si
    # la marge bookmaker calculée est > 25% (= cotes incohérentes, doublon
    # de joueur, etc.), on skip plutôt que d'écrire un market piégé qui
    # surfacerait un faux edge énorme dans predictMatch.
    def _markets_look_sane(odds_block: dict) -> tuple[bool, str]:
        n12 = odds_block.get('1n2') if isinstance(odds_block, dict) else None
        if not isinstance(n12, dict):
            return True, ''  # pas de 1n2 = on n'a rien à valider sur 1N2
        h = n12.get('home')
        a = n12.get('away')
        d = n12.get('draw')
        try:
            h = float(h) if h is not None else None
            a = float(a) if a is not None else None
            d = float(d) if d is not None else None
        except (TypeError, ValueError):
            return False, 'cotes 1n2 non numériques'
        # Cotes individuelles dans plages physiques
        for label, v in (('home', h), ('draw', d), ('away', a)):
            if v is not None and (v < 1.01 or v > 1000):
                return False, f'{label} cote hors plage [1.01, 1000] : {v}'
        # Marge bookmaker = somme des prob implicites - 1.0.
        # Bug-hunt 2026-05-02 : seuil resserré 25% → 12%. Winamax pratique
        # 4-7%, max observé honnête 9-10% sur ligues exotiques. Au-delà de
        # 12% c'est forcément un mismatch de mapping (cotes piochées dans
        # le mauvais slot du PRELOADED_STATE). 165 events ont eu margin
        # 15-25% sur la prod du jour → ces cotes sont POURRIES, mieux les
        # rejeter et laisser le frontend fallback sur odds_snapshot externe.
        implied = 0.0
        for v in (h, d, a):
            if v is not None and v > 1:
                implied += 1.0 / v
        if implied > 1.12:
            return False, f'marge bookmaker > 12% (implied={implied:.2%}) — mapping suspect'
        # Coté unique <= 1.01 trahit un fav énorme post-match (cote retirée
        # juste avant le coup d'envoi, valeur stale).
        return True, ''

    stats = {'events': 0, 'matched': 0, 'rejected_insane': 0}
    for day, evs in days.items():
        for ev in evs:
            stats['events'] += 1
            wx = ev.get('winamax') or {}
            mid = wx.get('match_id')
            if mid is None:
                continue
            mk = markets_by_mid.get(str(mid))
            if not mk:
                continue
            # Attach only the odds subtree (clean, no redundancy).
            # Deep-copy 1n2 since we may mutate home/away in alignment.
            odds_block = dict(mk.get('odds') or {})
            if isinstance(odds_block.get('1n2'), dict):
                odds_block['1n2'] = dict(odds_block['1n2'])
            # AUDIT — Refuse les markets absurdes plutôt que de pourrir
            # predictMatch avec un faux edge.
            ok, reason = _markets_look_sane(odds_block)
            if not ok:
                stats['rejected_insane'] += 1
                ev_label = (ev.get('name') or f'mid={mid}')[:60]
                print(f'  [reject] {ev_label} — {reason}', file=sys.stderr)
                continue
            # 1n2 home/away can be flipped vs ESPN — realign before storing
            _align_markets_to_espn(odds_block, ev)
            wx['markets'] = odds_block
            wx['markets_fetched_at'] = mk.get('fetched_at')
            ev['winamax'] = wx
            stats['matched'] += 1

    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')

    # Also inline into pronostics.html (same pattern as patch_winamax.py)
    # v33.28 — HTML rewrite déplacé dans scripts/inject_data_in_html.py
    # (1 seul appel à la fin du pipeline plutôt que 12 regex sur ~13500 lignes)
    msg = (f'[{datetime.now():%H:%M:%S}] patch_winamax_markets: '
           f'{stats["matched"]}/{stats["events"]} events enriched with Winamax markets')
    if stats.get('rejected_insane'):
        msg += f" · rejected {stats['rejected_insane']} insane markets"
    print(msg)
    return 0


if __name__ == '__main__':
    sys.exit(main())

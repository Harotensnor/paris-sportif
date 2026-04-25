#!/usr/bin/env python3
"""
snapshot_results.py — Archive long-running results for the backtest.

Le `data.js` ne garde qu'une fenêtre glissante d'environ 13 jours (les jours
qu'ESPN expose dans les scoreboards récents). Sans archivage externe, le
backtest_v2 ne peut mesurer que ces 13 jours, ce qui n'est pas assez pour
mesurer la perf du modèle dans la durée.

Ce script append-only enrichit `results_archive.jsonl` à chaque tick :
- Pour chaque event `completed` du jour courant qui a un pick scorable
  (predictMatch produit un pick + cote pre-match dispo), on ajoute UNE
  entrée minimale dans `results_archive.jsonl`.
- L'écriture est idempotente : on lit toutes les `id` déjà présentes pour
  ne pas dupliquer (un match n'apparaît qu'une seule fois dans l'archive).

Le `backtest_v2.py` peut ensuite enrichir son univers avec cette archive
quand un match n'est plus dans `data.js` (chantier de suite — pas appliqué
ici, on pose juste l'archive).

Idempotent. Run AFTER patch_winamax_markets et AFTER snapshot_odds (on
veut les odds_snapshot figées avant d'archiver).
"""
from __future__ import annotations
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data.js'
ARCHIVE_PATH = ROOT / 'results_archive.jsonl'


def load_data() -> dict:
    txt = DATA_PATH.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[snapshot_results] could not parse data.js', file=sys.stderr)
        sys.exit(1)
    return json.loads(m.group(1))


def existing_ids() -> set[str]:
    """Charge les ids déjà archivés pour rester idempotent."""
    if not ARCHIVE_PATH.exists():
        return set()
    ids: set[str] = set()
    with ARCHIVE_PATH.open('r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                ids.add(str(json.loads(line).get('id') or ''))
            except (json.JSONDecodeError, ValueError):
                continue
    ids.discard('')
    return ids


def shape_entry(ev: dict) -> dict | None:
    """Réduit un event à ses champs strictement utiles pour le backtest.

    On garde : id/sport/league/date/competitors (avec scores), odds (live
    + snapshot + history-marker), result (winner / draw), winamax markets
    si dispo. On EXCLUDE : logos, broadcasts, notes, leaders verbeux.
    """
    if not ev or not ev.get('completed'):
        return None
    competitors = []
    for c in (ev.get('competitors') or []):
        if not isinstance(c, dict):
            continue
        competitors.append({
            'id': c.get('id'),
            'name': c.get('name'),
            'short': c.get('short'),
            'home_away': c.get('home_away'),
            'score': c.get('score'),
            'winner': c.get('winner'),
        })
    if len(competitors) < 2:
        return None
    odds = ev.get('odds') or []
    odds_snap = ev.get('odds_snapshot')
    closing = ev.get('closing_odds')
    wx = ev.get('winamax') or {}
    out = {
        'archived_at': datetime.now(timezone.utc).isoformat(),
        'id': str(ev.get('id') or ''),
        'sport': ev.get('sport'),
        'league_code': ev.get('league_code'),
        'league_name': ev.get('league_name'),
        'date': ev.get('date'),
        'name': ev.get('name'),
        'competitors': competitors,
        'completed': True,
    }
    if odds:
        out['odds'] = odds
    if odds_snap:
        out['odds_snapshot'] = odds_snap
    if closing:
        out['closing_odds'] = closing
    if wx.get('available') and wx.get('markets'):
        out['winamax_markets'] = wx['markets']
    if ev.get('scorers'):
        out['scorers'] = ev['scorers']
    return out


def main() -> int:
    data = load_data()
    days = data.get('days') or {}
    archived = existing_ids()
    added = 0
    skipped = 0
    with ARCHIVE_PATH.open('a', encoding='utf-8') as f:
        for day, evs in days.items():
            for ev in (evs or []):
                if not ev or not ev.get('completed'):
                    continue
                eid = str(ev.get('id') or '')
                if not eid or eid in archived:
                    skipped += 1
                    continue
                entry = shape_entry(ev)
                if not entry:
                    continue
                f.write(json.dumps(entry, ensure_ascii=False) + '\n')
                archived.add(eid)
                added += 1
    print(f'[{datetime.now():%H:%M:%S}] snapshot_results: '
          f'+{added} archivés, {skipped} déjà présents '
          f'(total archive : {len(archived)})')
    return 0


if __name__ == '__main__':
    sys.exit(main())

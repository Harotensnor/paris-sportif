#!/usr/bin/env python3
"""Merge sofascore_events.json into data.js, deduppant par (home, away, day).

Stratégie :
- ESPN events ont la priorité (gardent leur shape original avec odds, etc.)
- Sofascore events sont ajoutés UNIQUEMENT pour combler les gaps
- Dedup par (homeTeam_norm, awayTeam_norm, date_iso_day)
- Sofascore events n'ont pas de cotes, donc winamax.available=false par
  défaut. Au prochain `patch_winamax_markets`, ils peuvent être enrichis
  si Winamax les a indexés.

Effets attendus :
- 30 → ~150 foot events affichés (catalog largement étendu)
- 100 → ~600 tennis events (qualifs WTA/Challenger, etc.)
- Le user voit BEAUCOUP plus de matchs disponibles
- Les events ESPN existants restent inchangés (priorité préservée)

Sécurité :
- Si sofascore_events.json absent ou vide, no-op (data.js intact)
- Si parse data.js fail, retourne 1 (cron skip le push)
- Idempotent : run plusieurs fois ne dégrade pas
"""
from __future__ import annotations
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data.js'
SOFA_PATH = ROOT / 'sofascore_events.json'


def _normalize(name: str) -> str:
    """ASCII lowercase pour dedup."""
    if not name:
        return ''
    n = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode()
    return ''.join(c for c in n.lower() if c.isalnum())


def _event_key(ev: dict) -> str:
    """Clé canonique pour dédoublonner : (home|away|day)."""
    comps = ev.get('competitors') or []
    home = next((c for c in comps if c.get('home_away') == 'home'), None)
    away = next((c for c in comps if c.get('home_away') == 'away'), None)
    if not (home and away):
        if len(comps) >= 2:
            home, away = comps[0], comps[1]
        else:
            return ''
    h_norm = _normalize(home.get('name') or '')
    a_norm = _normalize(away.get('name') or '')
    date = (ev.get('date') or '')[:10]  # YYYY-MM-DD
    if not (h_norm and a_norm and date):
        return ''
    # Sort home/away pour matcher même si Sofascore et ESPN inversent l'ordre
    a, b = sorted([h_norm, a_norm])
    return f'{a}|{b}|{date}'


def main() -> int:
    if not SOFA_PATH.exists():
        print('sofascore_events.json absent — skip patch', flush=True)
        return 0

    try:
        sofa = json.loads(SOFA_PATH.read_text(encoding='utf-8'))
    except Exception as e:
        print(f'parse sofascore_events.json failed: {e}', file=sys.stderr)
        return 1

    if not DATA_PATH.exists():
        print(f'data.js absent', file=sys.stderr)
        return 1

    text = DATA_PATH.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;', text, flags=re.DOTALL)
    if not m:
        print('PRONOSTICS_DATA pattern not found', file=sys.stderr)
        return 1

    try:
        data = json.loads(m.group(1))
    except Exception as e:
        print(f'parse data.js JSON failed: {e}', file=sys.stderr)
        return 1

    days = data.setdefault('days', {})

    # Collect all existing event keys grouped by day
    existing_keys: dict[str, set] = {}  # day_iso → set of event keys
    for day_iso, evs in days.items():
        existing_keys[day_iso] = set()
        for ev in (evs or []):
            k = _event_key(ev)
            if k:
                existing_keys[day_iso].add(k)

    # Merge sofascore events
    sofa_events = sofa.get('events') or {}
    added_per_sport = {}
    skipped_dup = 0
    for sport, evs in sofa_events.items():
        for ev in evs:
            k = _event_key(ev)
            if not k:
                continue
            day_iso = (ev.get('date') or '')[:10]
            if not day_iso:
                continue
            day_keys = existing_keys.setdefault(day_iso, set())
            if k in day_keys:
                skipped_dup += 1
                continue
            # Add to data.days[day_iso]
            day_list = days.setdefault(day_iso, [])
            day_list.append(ev)
            day_keys.add(k)
            added_per_sport[sport] = added_per_sport.get(sport, 0) + 1

    total_added = sum(added_per_sport.values())
    print(f'sofascore merge : +{total_added} events (skipped {skipped_dup} dup with ESPN)', flush=True)
    for sport, n in sorted(added_per_sport.items(), key=lambda x: -x[1]):
        print(f'  +{n} {sport}', flush=True)

    if total_added == 0:
        print('  no new events to add — skip rewrite', flush=True)
        return 0

    # Sort each day's events by date for consistent display
    for day_iso, evs in days.items():
        evs.sort(key=lambda e: e.get('date') or '')

    # v33.2 — Bump generated_at à NOW pour signaler activité au pipeline.
    # Si fetch_live a planté (ESPN ban GHA), data.js generated_at était
    # stuck. En patchant Sofascore events et bumpant generated_at, on
    # garantit qu'au moins une source pousse une version fraîche →
    # commit step voit le diff → push.
    from datetime import datetime as _dt, timezone as _tz
    data['generated_at'] = _dt.now(_tz.utc).isoformat().replace('+00:00', 'Z')

    # Rewrite data.js (preserve original surrounding text + minified inside)
    new_json = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    new_text = text[:m.start(1)] + new_json + text[m.end(1):]
    DATA_PATH.write_text(new_text, encoding='utf-8')
    print(f'  data.js updated ({DATA_PATH.stat().st_size/1024:.0f}KB) — generated_at bumped', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())

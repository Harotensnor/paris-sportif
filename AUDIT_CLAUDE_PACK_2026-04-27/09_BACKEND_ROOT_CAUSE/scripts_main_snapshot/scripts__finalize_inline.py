#!/usr/bin/env python3
"""Finalize the pipeline: produce a lightweight inline blob.

Pourquoi ce script existe — Chantier #3 (lazy-load).

Avant : fetch_live.py re-inlinait la totalité de data.js (~1.4 MB) dans
pronostics.html. Le navigateur devait parser 1.4 MB de JSON inline avant
le 1er paint, et chaque poll re-téléchargeait 1.4 MB.

Après : ce script tourne en DERNIER (après tous les patches), et :
  1. Lit data.js (source de vérité, on n'y touche pas).
  2. Écrit data_today.json — events du jour uniquement (~200-300 KB).
     Utilisé par pollData() pour le rafraîchissement live (cher × 30s en
     mode LIVE).
  3. Écrit data_manifest.json — {generated_at, today, days: [iso list]}.
     Permet au front de savoir quels jours sont disponibles avant fetch.
  4. Réinjecte un blob inline LITE (today only) dans pronostics.html.
     Premier paint instantané sur today, le reste arrive en async.

Le data.js full reste écrit par fetch_v3 / fetch_live et sert de source
canonique pour _ensureFullData() côté client (chargé idle après boot,
avant de naviguer vers Bilan/Backtest/Historique).

Idempotent : peut être lancé à chaque tick. ~50ms.
"""
import json
import re
from pathlib import Path
from datetime import datetime, timedelta

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
HTML = ROOT / 'pronostics.html'
DATA_TODAY = ROOT / 'data_today.json'
DATA_MANIFEST = ROOT / 'data_manifest.json'


def main():
    if not DATA_JS.exists():
        print('[finalize_inline] data.js missing, skipping.', flush=True)
        return

    txt = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[finalize_inline] could not parse data.js, skipping.', flush=True)
        return
    data = json.loads(m.group(1))

    today = data.get('today') or datetime.utcnow().strftime('%Y-%m-%d')
    days = data.get('days') or {}
    today_events = days.get(today, [])

    # 1. data_today.json — just today's events array (~200-300 KB)
    DATA_TODAY.write_text(
        json.dumps(today_events, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )

    # 2. data_manifest.json — list of available days + meta
    manifest = {
        'generated_at': data.get('generated_at') or (datetime.utcnow().isoformat() + 'Z'),
        'today': today,
        'days': sorted(days.keys()),
        'event_counts': {d: len(evs) for d, evs in days.items()},
    }
    DATA_MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )

    # 3. Inline LITE blob — today only. Le user landing dashboard voit son
    # contenu instantanément ; pour Bilan/Backtest/Historique, les autres
    # jours arrivent via _ensureFullData() (lancé idle 500ms après load).
    lite_days = {}
    if today in days:
        lite_days[today] = days[today]

    lite = {
        'generated_at': manifest['generated_at'],
        'today': today,
        'days': lite_days,
        # Marker pour que le client sache qu'il manque des jours et
        # déclenche _ensureFullData() au moment opportun.
        '_lite': True,
        '_available_days': manifest['days'],
        # Standings sont volumineux mais utilisés sur quasi toutes les pages —
        # on les garde dans le blob lite (15-30 KB).
        'standings': data.get('standings') or [],
    }
    payload = json.dumps(lite, ensure_ascii=False, separators=(',', ':'))

    if HTML.exists():
        html_text = HTML.read_text(encoding='utf-8')
        new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload};\n</script>'
        new_html, n = re.subn(
            r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
            new_block,
            html_text,
            count=1,
            flags=re.DOTALL,
        )
        if n:
            HTML.write_text(new_html, encoding='utf-8')

    full_size_kb = DATA_JS.stat().st_size / 1024
    today_size_kb = DATA_TODAY.stat().st_size / 1024
    inline_kb = len(payload) / 1024
    print(
        f'[finalize_inline] today={today} | full data.js={full_size_kb:.0f} KB '
        f'| today.json={today_size_kb:.0f} KB | inline={inline_kb:.0f} KB '
        f'| days available={len(manifest["days"])}',
        flush=True,
    )


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Finalize the pipeline: produce a lightweight inline blob.

Pourquoi ce script existe — Chantier #3 (lazy-load).

Avant : fetch_live.py re-inlinait la totalité de data.js (~1.4 MB) dans
pronostics.html. Le navigateur devait parser 1.4 MB de JSON inline avant
le 1er paint, et chaque poll re-téléchargeait 1.4 MB.

Après : ce script tourne en DERNIER (après tous les patches), et :
  1. Lit data.js (source de vérité) et bumpe generated_at.
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
# Sprint 61 (v31.7.150 — audit ChatGPT 2026-04-28 P0) — Payload LITE 72h.
# Avant : LITE blob inline avait UNIQUEMENT today → premier paint montrait
# 0 match pour demain (PSG-Bayern caché jusqu'au _ensureFullData()).
# Après : LITE blob = today + J+1 + J+2, tooltips/Calendrier/Top Demain
# instantanés. Coût : ~600 KB inline au lieu de 200 KB (acceptable, le
# data.js full reste asynchrone pour l'archive complète 14j+).
DATA_LITE_72H = ROOT / 'data_lite_72h.json'
LITE_HORIZON_DAYS = 3  # today + tomorrow + J+2


ALLOWED_SPORTS = {'football', 'tennis', 'basketball', 'hockey', 'baseball', 'football-american'}


def filter_event(ev):
    """Phase 3 #2 : whitelist sports + drop si tous competitors null."""
    if ev.get('sport') not in ALLOWED_SPORTS:
        return False
    comps = ev.get('competitors') or []
    if comps and all(c is None or (isinstance(c, dict) and not c.get('name')) for c in comps):
        return False
    return True


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
    data['generated_at'] = datetime.utcnow().replace(microsecond=0).isoformat() + 'Z'

    # Phase 3 #2 : filter golf et events sans competitors valides AVANT
    # de produire les sidecar JSONs et de réinjecter dans pronostics.html.
    days_in = data.get('days') or {}
    n_dropped = 0
    for k, evs in list(days_in.items()):
        before = len(evs)
        days_in[k] = [e for e in evs if filter_event(e)]
        n_dropped += before - len(days_in[k])
    if n_dropped:
        print(f'[finalize_inline] dropped {n_dropped} events (golf/cricket/etc. ou competitors null)', flush=True)

    # Réécriture data.js avec generated_at frais (+ events filtrés si besoin).
    # Sans ça, health.json pouvait annoncer data 0min tandis que le frontend
    # gardait un top-level generated_at stale et affichait un faux stale state.
    new_text = re.sub(
        r'=\s*\{.*\}\s*;?\s*$',
        '= ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n',
        txt,
        count=1,
        flags=re.DOTALL,
    )
    DATA_JS.write_text(new_text, encoding='utf-8')

    today = data.get('today') or datetime.utcnow().strftime('%Y-%m-%d')
    days = data.get('days') or {}
    today_events = days.get(today, [])

    # Sprint 61 — Calcul du scope LITE 72h (today + tomorrow + J+2).
    try:
        today_dt = datetime.fromisoformat(today)
    except (TypeError, ValueError):
        today_dt = datetime.utcnow()
    scope_72h_keys = [
        (today_dt + timedelta(days=i)).strftime('%Y-%m-%d')
        for i in range(LITE_HORIZON_DAYS)
    ]
    lite_72h_days = {k: days.get(k, []) for k in scope_72h_keys if k in days}

    # 1. data_today.json — just today's events array (~200-300 KB)
    DATA_TODAY.write_text(
        json.dumps(today_events, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )

    # Sprint 61 — data_lite_72h.json : flat list of events on today/J+1/J+2.
    # Permet aux clients de fetch un payload moyen (~600 KB) au lieu du
    # data.js complet (1.4 MB) pour les vues 72h sans frapper l'archive
    # complète 14j+. Utilisé en backup si le LITE inline est insuffisant.
    lite_72h_events = []
    for k in scope_72h_keys:
        lite_72h_events.extend(days.get(k, []))
    DATA_LITE_72H.write_text(
        json.dumps(lite_72h_events, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )

    # 2. data_manifest.json — list of available days + meta
    manifest = {
        'generated_at': data.get('generated_at') or (datetime.utcnow().isoformat() + 'Z'),
        'today': today,
        'days': sorted(days.keys()),
        'event_counts': {d: len(evs) for d, evs in days.items()},
        # Sprint 61 — Métadonnées du scope LITE pour traçabilité côté client.
        'lite_scope': scope_72h_keys,
        'event_counts_lite_72h': {k: len(days.get(k, [])) for k in scope_72h_keys},
    }
    DATA_MANIFEST.write_text(
        json.dumps(manifest, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )

    # 3. Inline LITE blob — Sprint 61 (v31.7.150) ÉTENDU 72h.
    # Avant : seulement today (PSG-Bayern J+1 caché au premier paint).
    # Après : today + J+1 + J+2 inline. Le user qui ouvre le site voit
    # immédiatement les "Prochains gros matchs" (Sprint 47) sans attendre
    # _ensureFullData(). Bilan/Backtest/Historique restent async (14j+).
    lite_days = lite_72h_days

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
    lite_72h_size_kb = DATA_LITE_72H.stat().st_size / 1024
    inline_kb = len(payload) / 1024
    n_lite_events = sum(len(v) for v in lite_72h_days.values())
    print(
        f'[finalize_inline] today={today} scope={scope_72h_keys[0]}..{scope_72h_keys[-1]} '
        f'| full={full_size_kb:.0f} KB | today.json={today_size_kb:.0f} KB '
        f'| 72h.json={lite_72h_size_kb:.0f} KB | inline={inline_kb:.0f} KB '
        f'| inline events={n_lite_events} on {len(lite_72h_days)}/3 days '
        f'| total days={len(manifest["days"])}',
        flush=True,
    )


if __name__ == '__main__':
    main()

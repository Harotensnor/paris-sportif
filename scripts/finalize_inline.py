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
  4. Écrit data_lite.js et le lie dans pronostics.html.
     Premier paint instantané sur le scope lite, le reste arrive en async.

Le data.js full reste écrit par fetch_v3 / fetch_live et sert de source
canonique pour _ensureFullData() côté client (chargé idle après boot,
avant de naviguer vers Bilan/Backtest/Historique).

Idempotent : peut être lancé à chaque tick. ~50ms.
"""
import json
import re
import hashlib
from pathlib import Path
from datetime import datetime, timedelta, timezone
from _data_io import save_data_js, write_text_atomic

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
HTML = ROOT / 'pronostics.html'
DATA_TODAY = ROOT / 'data_today.json'
DATA_MANIFEST = ROOT / 'data_manifest.json'
DATA_LITE_JS = ROOT / 'data_lite.js'
DATA_LITE_72H = ROOT / 'data_lite_72h.json'
# v55.2 — Boot autonome 7j + historique 7j.
# Le dashboard ne doit plus démarrer sur 5 matchs du jour puis attendre le
# chargement async pour afficher demain / la semaine. Le blob lite couvre une
# fenêtre utile (J-7 → J+7) avec cap par jour, ce qui garde le premier écran
# cohérent même si data.js full arrive quelques secondes après.
LITE_PAST_DAYS = 7
LITE_FUTURE_DAYS = 7
BOOT_EVENT_CAP = 50


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
    data['generated_at'] = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')

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
    save_data_js(data, DATA_JS)

    today = data.get('today') or datetime.utcnow().strftime('%Y-%m-%d')
    days = data.get('days') or {}
    today_events = days.get(today, [])

    # v55.2 — Calcul du scope LITE rolling (J-7 → J+7).
    try:
        today_dt = datetime.fromisoformat(today)
    except (TypeError, ValueError):
        today_dt = datetime.utcnow()
    scope_lite_keys = [
        (today_dt + timedelta(days=i)).strftime('%Y-%m-%d')
        for i in range(-LITE_PAST_DAYS, LITE_FUTURE_DAYS + 1)
    ]
    lite_scope_days = {k: days.get(k, []) for k in scope_lite_keys if k in days}

    # 1. data_today.json — just today's events array (~200-300 KB)
    write_text_atomic(DATA_TODAY, json.dumps(today_events, ensure_ascii=False, separators=(',', ':')))

    # AUDIT 2026-05-08 (P1.6) — data_lite_72h.json supprimé. Le sidecar
    # 1.9 MB était généré à chaque cron tick mais JAMAIS lu par le
    # frontend (seul `src/pages.js` ajoutait un <link rel="prefetch">,
    # qui était lui-même retiré). Le manifest garde `event_counts_lite_72h`
    # pour la traçabilité du scope LITE, mais le contenu lui-même n'a
    # plus de consommateur.
    if DATA_LITE_72H.exists():
        try:
            DATA_LITE_72H.unlink()
        except OSError:
            pass

    # 2. data_manifest.json — list of available days + meta
    manifest = {
        'generated_at': data.get('generated_at') or (datetime.utcnow().isoformat() + 'Z'),
        'today': today,
        'days': sorted(days.keys()),
        'event_counts': {d: len(evs) for d, evs in days.items()},
        # Métadonnées du scope LITE pour traçabilité côté client.
        'lite_scope': scope_lite_keys,
        'event_counts_lite_72h': {k: len(days.get(k, [])) for k in scope_lite_keys},
        'event_counts_lite': {k: len(days.get(k, [])) for k in scope_lite_keys},
        'boot_event_cap': BOOT_EVENT_CAP,
    }
    write_text_atomic(DATA_MANIFEST, json.dumps(manifest, ensure_ascii=False, separators=(',', ':')))

    # 3. LITE boot blob — J-7 → J+7, cap par jour.
    # Priorité aux matchs Winamax et à l'ordre chronologique pour que le
    # calendrier, l'historique récent et le tableau ne démarrent plus vides.
    lite_days = {}
    for key in scope_lite_keys:
        bucket = days.get(key, [])
        if not bucket:
            continue
        lite_days[key] = sorted(
            bucket,
            key=lambda m: (not ((m.get('winamax') or {}).get('available')), m.get('date') or ''),
        )[:BOOT_EVENT_CAP]

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
    write_text_atomic(DATA_LITE_JS, 'window.PRONOSTICS_DATA = ' + payload + ';\n')

    if HTML.exists():
        html_text = HTML.read_text(encoding='utf-8')
        data_lite_hash = hashlib.sha1(DATA_LITE_JS.read_bytes()).hexdigest()[:8]
        new_block = f'<script src="data_lite.js?v={data_lite_hash}"></script>'
        new_html, n = re.subn(
            r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>|<script\s+src="data(?:_lite)?\.js(?:\?v=[^"]+)?"></script>',
            new_block,
            html_text,
            count=1,
            flags=re.DOTALL,
        )
        if n:
            write_text_atomic(HTML, new_html)

    full_size_kb = DATA_JS.stat().st_size / 1024
    today_size_kb = DATA_TODAY.stat().st_size / 1024
    lite_js_kb = DATA_LITE_JS.stat().st_size / 1024
    n_boot_events = sum(len(v) for v in lite_days.values())
    n_lite_scope_events = sum(len(v) for v in lite_scope_days.values())
    print(
        f'[finalize_inline] today={today} scope={scope_lite_keys[0]}..{scope_lite_keys[-1]} '
        f'| full={full_size_kb:.0f} KB | today.json={today_size_kb:.0f} KB '
        f'| lite scope={n_lite_scope_events} events '
        f'| data_lite.js={lite_js_kb:.0f} KB ({n_boot_events} boot events) '
        f'| total days={len(manifest["days"])}',
        flush=True,
    )


if __name__ == '__main__':
    main()

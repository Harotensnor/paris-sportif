#!/usr/bin/env python3
"""AUDIT-2026-04-27 (Sprint 4 #18) — Notifie Théo via Discord webhook
quand la pipeline data dégrade au-delà des seuils.

Lit `health.json` après le cron tick. Si quality_checks dépasse les
seuils alertants, poste un message Discord. Webhook URL stockée en
GitHub secret `DISCORD_HEALTH_WEBHOOK` (à configurer côté repo).

Idempotent dans la session : ne re-notifie pas le même état dans une
fenêtre de 1h (évite le spam si le cron tourne toutes les 5min). État
persisté dans `.cache/last_health_alert.json`.

Tourne en option dans refresh.yml — pas de bloquant si le webhook
n'est pas configuré (script silencieux).
"""
from __future__ import annotations
import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HEALTH = ROOT / 'health.json'
STATE = ROOT / '.cache' / 'last_health_alert.json'
ALERT_COOLDOWN_SEC = 60 * 60  # 1h


def _load_health():
    try:
        return json.loads(HEALTH.read_text(encoding='utf-8'))
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _detect_alerts(h: dict) -> list[str]:
    alerts = []
    q = h.get('quality_checks') or {}
    fb_inv = int(q.get('football_invalid_form') or 0)
    if fb_inv > 0:
        alerts.append(f'⚠ {fb_inv} foot competitor(s) avec stats NBA-level')
    ext_odds = int(q.get('actionable_external_odds') or 0)
    if ext_odds > 50:
        alerts.append(f'⚠ {ext_odds} events Winamax exact + odds_snapshot externe')
    ratio = q.get('winamax_exact_ratio')
    if ratio is not None:
        try:
            if float(ratio) < 0.30:
                alerts.append(f'⚠ Winamax exact ratio bas : {float(ratio):.0%}')
        except (TypeError, ValueError):
            pass
    return alerts


def _last_state() -> dict | None:
    try:
        return json.loads(STATE.read_text(encoding='utf-8'))
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def _save_state(s: dict) -> None:
    STATE.parent.mkdir(parents=True, exist_ok=True)
    STATE.write_text(json.dumps(s, ensure_ascii=False), encoding='utf-8')


def _post_discord(webhook_url: str, text: str) -> bool:
    payload = json.dumps({'content': text}).encode('utf-8')
    req = urllib.request.Request(
        webhook_url, data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return 200 <= resp.status < 300
    except urllib.error.HTTPError as e:
        print(f'discord post failed: {e.code} {e.reason}', file=sys.stderr)
        return False
    except (urllib.error.URLError, TimeoutError) as e:
        print(f'discord post failed: {e}', file=sys.stderr)
        return False


def main() -> int:
    webhook = os.environ.get('DISCORD_HEALTH_WEBHOOK')
    if not webhook:
        # Pas configuré côté repo → silencieux, exit OK.
        return 0

    h = _load_health()
    if not h:
        print('no health.json or unreadable, skip', file=sys.stderr)
        return 0

    alerts = _detect_alerts(h)
    if not alerts:
        # Tout vert : on enregistre un "ok" pour permettre une alerte
        # "récupéré" lors du prochain warning.
        _save_state({'state': 'ok', 'ts': time.time()})
        return 0

    # Cooldown : ne pas spam si déjà alerté récemment.
    last = _last_state() or {}
    last_state = last.get('state')
    last_ts = float(last.get('ts') or 0)
    now_ts = time.time()
    if last_state == 'warning' and (now_ts - last_ts) < ALERT_COOLDOWN_SEC:
        # Déjà notifié dans la dernière heure — skip.
        return 0

    # Format message
    when = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    title = '⚠ Pipeline Paris-Sportif — alerte qualité data'
    body = '\n'.join(f'  • {a}' for a in alerts)
    msg = (
        f'**{title}**  ({when})\n'
        f'{body}\n'
        f'Voir : <https://harotensnor.github.io/paris-sportif/health.json>'
    )
    ok = _post_discord(webhook, msg)
    if ok:
        _save_state({'state': 'warning', 'ts': now_ts, 'alerts': alerts})
        print('alerte Discord postée')
    return 0


if __name__ == '__main__':
    sys.exit(main())

"""AUDIT-2026-04-27 (Sprint 4 #19) — Helper logs structurés JSON.

Usage dans les scripts pipeline :

    from _log import log
    log('fetch_team_stats', 'info', 'starting', {'teams': 150})
    log('fetch_team_stats', 'warn', 'cache miss', {'team_id': 20})
    log('fetch_team_stats', 'error', 'http 503', {'url': '...'})

Stdout reste lisible-humain (compat avec les anciens print()).
Si la variable d'env `STRUCTURED_LOGS=1` est set (en CI/cron),
les logs sont aussi écrits en JSON-lines vers `.cache/logs.jsonl`
pour ingestion future (Datadog, Loki, simple grep).

Format JSON-line :
    {"ts": "2026-04-27T18:00:00Z", "script": "fetch_x", "level": "info",
     "msg": "starting", "data": {...}}

Idempotent : crée `.cache/` si absent. Pas de dépendance externe.
"""
from __future__ import annotations
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
_LOG_DIR = _ROOT / '.cache'
_LOG_FILE = _LOG_DIR / 'logs.jsonl'
_STRUCTURED = os.environ.get('STRUCTURED_LOGS', '0') in ('1', 'true', 'yes')

# Niveaux supportés (ordre d'importance croissante)
_LEVELS = {'debug': 10, 'info': 20, 'warn': 30, 'error': 40}


def log(script: str, level: str, msg: str, data: dict | None = None) -> None:
    """Émet un log structuré.

    - Toujours imprime sur stdout (lisible humain) avec préfixe niveau
    - Si STRUCTURED_LOGS=1, append aussi en JSONL vers .cache/logs.jsonl
    """
    level_n = _LEVELS.get(level, 20)
    ts = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    # Format humain (toujours)
    prefix = {
        'debug': '[debug]',
        'info': '[info]',
        'warn': '[WARN]',
        'error': '[ERROR]',
    }.get(level, '[info]')
    suffix = ''
    if data:
        # Compact dict en human readable pour éviter de polluer stdout
        bits = ', '.join(f'{k}={v}' for k, v in list(data.items())[:5])
        suffix = f' ({bits})'
    out = f'{prefix} [{script}] {msg}{suffix}'
    if level_n >= 30:
        print(out, file=sys.stderr, flush=True)
    else:
        print(out, flush=True)

    # JSON line si structured
    if _STRUCTURED:
        try:
            _LOG_DIR.mkdir(parents=True, exist_ok=True)
            entry = {
                'ts': ts,
                'script': script,
                'level': level,
                'msg': msg,
            }
            if data:
                entry['data'] = data
            with _LOG_FILE.open('a', encoding='utf-8') as f:
                f.write(json.dumps(entry, ensure_ascii=False) + '\n')
        except OSError:
            pass  # log failure ne doit pas crasher le script

"""AUDIT-2026-04-27 (Sprint 8 #6) — Retry helper avec backoff exponentiel.

Permet aux scripts fetch_*.py de retry les requêtes HTTP qui foirent
ponctuellement (HTTP 429/503/timeout) avant de logguer un fail dans
health.json. Backoff : 1s, 3s, 9s = 3 tentatives max sur ~13s total.

Usage :

    from _retry import retry_http
    data = retry_http(lambda: fetch_url('https://espn.com/api/...'))
    if data is None:
        log('fetch_x', 'warn', 'unavailable after 3 retries', {'url': url})

Si tous les retries échouent, ajoute un compteur dans
.cache/source_failures.json qui peut être lu par build_health.py
pour remonter les sources mortes (Sprint 8 #16 — déjà partiel).
"""
from __future__ import annotations
import json
import time
from pathlib import Path
from typing import Callable, TypeVar

T = TypeVar('T')

_ROOT = Path(__file__).resolve().parent.parent
_FAIL_LOG = _ROOT / '.cache' / 'source_failures.json'

DEFAULT_DELAYS_SEC = (1.0, 3.0, 9.0)


def retry_http(fn: Callable[[], T], *,
               delays: tuple[float, ...] = DEFAULT_DELAYS_SEC,
               source_name: str | None = None) -> T | None:
    """Exécute fn() jusqu'à 3 fois avec backoff. Retourne None si tous
    les essais retournent None ou throw.

    Si source_name fourni, log le compteur de fails consécutifs dans
    .cache/source_failures.json (utile pour la health page).
    """
    last_err: Exception | None = None
    for i, _delay in enumerate([0.0, *delays]):
        if _delay > 0:
            time.sleep(_delay)
        try:
            result = fn()
            if result is not None:
                if source_name:
                    _record_success(source_name)
                return result
        except Exception as e:
            last_err = e
            continue
    # All retries exhausted
    if source_name:
        _record_failure(source_name, str(last_err) if last_err else 'returned None')
    return None


def _read_fails() -> dict:
    try:
        return json.loads(_FAIL_LOG.read_text(encoding='utf-8'))
    except (FileNotFoundError, json.JSONDecodeError):
        return {'sources': {}}


def _write_fails(d: dict) -> None:
    try:
        _FAIL_LOG.parent.mkdir(parents=True, exist_ok=True)
        _FAIL_LOG.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding='utf-8')
    except OSError:
        pass


def _record_failure(source_name: str, reason: str) -> None:
    d = _read_fails()
    s = d['sources'].setdefault(source_name, {'consecutive_fails': 0})
    s['consecutive_fails'] = int(s.get('consecutive_fails', 0)) + 1
    s['last_fail_reason'] = reason[:200]
    s['last_fail_ts'] = time.time()
    _write_fails(d)


def _record_success(source_name: str) -> None:
    d = _read_fails()
    s = d['sources'].setdefault(source_name, {'consecutive_fails': 0})
    if s.get('consecutive_fails'):
        s['consecutive_fails'] = 0
        s['last_recovery_ts'] = time.time()
        _write_fails(d)

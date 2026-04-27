"""AUDIT-2026-04-27 (Sprint 8 #7) — Pipeline observability.

Helper qui mesure la duration de chaque script du pipeline et persiste
les p50/p95 sur les 100 dernières exécutions. Utilisé par build_health.py
pour remonter les régressions de perf (script qui devient subitement
3× plus lent = signal qu'une dépendance externe rame ou qu'un commit
a un bug).

Usage dans un script pipeline :

    from _metrics import time_script

    @time_script('fetch_team_stats')
    def main():
        ...

Ou en context manager :

    from _metrics import script_timer
    with script_timer('fetch_team_stats'):
        ...

Le ring buffer est limité à 100 entrées par script pour borner la
taille du fichier (~50KB max).
"""
from __future__ import annotations
import functools
import json
import time
from pathlib import Path
from typing import Callable, TypeVar

T = TypeVar('T')

_ROOT = Path(__file__).resolve().parent.parent
_METRICS = _ROOT / '.cache' / 'script_metrics.json'
_RING_SIZE = 100


def _read() -> dict:
    try:
        return json.loads(_METRICS.read_text(encoding='utf-8'))
    except (FileNotFoundError, json.JSONDecodeError):
        return {'scripts': {}}


def _write(d: dict) -> None:
    try:
        _METRICS.parent.mkdir(parents=True, exist_ok=True)
        _METRICS.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding='utf-8')
    except OSError:
        pass


def record_duration(script_name: str, duration_sec: float, success: bool = True) -> None:
    d = _read()
    s = d['scripts'].setdefault(script_name, {'durations': [], 'failures': 0})
    s['durations'].append(round(duration_sec, 2))
    s['durations'] = s['durations'][-_RING_SIZE:]  # ring buffer
    if not success:
        s['failures'] = int(s.get('failures', 0)) + 1
    s['last_run_ts'] = time.time()
    s['last_duration_sec'] = round(duration_sec, 2)
    _write(d)


class script_timer:
    """Context manager pour mesurer la duration d'un bloc de code."""

    def __init__(self, name: str):
        self.name = name
        self._t0 = 0.0
        self._success = True

    def __enter__(self):
        self._t0 = time.monotonic()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.monotonic() - self._t0
        record_duration(self.name, duration, success=(exc_type is None))
        return False  # ne masque pas l'exception


def time_script(name: str) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Décorateur. Mesure la duration de la fonction (typiquement main())."""
    def deco(fn: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            with script_timer(name):
                return fn(*args, **kwargs)
        return wrapper
    return deco

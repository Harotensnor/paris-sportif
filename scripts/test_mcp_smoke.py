#!/usr/bin/env python3
"""v33.22 — Smoke test pour les outils MCP exposés par mcp_paris_sportif.py.

Approach : importe le module avec un stub `mcp.server.fastmcp` (pas besoin
du vrai MCP installé), appelle chaque tool avec ses arguments par défaut,
et vérifie qu'aucun ne crash ni ne renvoie d'erreur structurée.

Usage :
    python3 scripts/test_mcp_smoke.py

Exit code :
    0 si tous les tools passent
    1 sinon, avec liste des tools en échec sur stderr

Ce test est destiné à tourner en CI ou ad-hoc avant de commit des
changements à mcp_paris_sportif.py — détecte les régressions silencieuses
(typos sur les clés, helpers renommés, etc.) en quelques secondes.
"""
from __future__ import annotations
import importlib.util
import inspect
import sys
import types
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MCP_PATH = ROOT / 'scripts' / 'mcp_paris_sportif.py'


def _stub_mcp_module() -> None:
    """Stub `mcp.server.fastmcp.FastMCP` avant import du module testé."""
    class FakeFastMCP:
        def __init__(self, *args, **kwargs): pass
        def tool(self):
            return lambda f: f
        def run(self): pass

    mod = types.ModuleType('mcp')
    sub = types.ModuleType('mcp.server')
    fastmcp = types.ModuleType('mcp.server.fastmcp')
    fastmcp.FastMCP = FakeFastMCP
    sys.modules['mcp'] = mod
    sys.modules['mcp.server'] = sub
    sys.modules['mcp.server.fastmcp'] = fastmcp


def _load_mcp_module():
    spec = importlib.util.spec_from_file_location('mcp_paris_sportif', MCP_PATH)
    if not spec or not spec.loader:
        raise RuntimeError(f'cannot load {MCP_PATH}')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _is_mcp_tool(obj) -> bool:
    """Heuristic : public callable with docstring belonging to the module."""
    if not callable(obj):
        return False
    if not getattr(obj, '__doc__', None):
        return False
    if getattr(obj, '__module__', '') != 'mcp_paris_sportif':
        return False
    return True


def _all_args_optional(func) -> bool:
    sig = inspect.signature(func)
    return all(p.default is not inspect.Parameter.empty for p in sig.parameters.values())


def main() -> int:
    _stub_mcp_module()
    mod = _load_mcp_module()

    ok: list[str] = []
    fail: list[tuple[str, str]] = []
    skip_args: list[str] = []

    for name in sorted(dir(mod)):
        if name.startswith('_'):
            continue
        obj = getattr(mod, name)
        if not _is_mcp_tool(obj):
            continue
        if not _all_args_optional(obj):
            skip_args.append(name)
            continue
        try:
            result = obj()
        except Exception as e:
            fail.append((name, f'{type(e).__name__}: {e}'))
            continue
        # Tools may return a dict with _error key for soft failures
        if isinstance(result, dict) and '_error' in result:
            fail.append((name, f'_error: {result.get("_error", "?")}'))
            continue
        ok.append(name)

    # ASCII output — runs identically on Windows cp1252 + Unix UTF-8
    print(f'[mcp_smoke] OK ({len(ok)}/{len(ok)+len(fail)+len(skip_args)}) :')
    for n in ok:
        print(f'  [OK] {n}')
    if skip_args:
        print(f'\n[mcp_smoke] SKIPPED ({len(skip_args)}) -- required args :')
        for n in skip_args:
            print(f'  [-] {n}')
    if fail:
        print(f'\n[mcp_smoke] FAIL ({len(fail)}) :', file=sys.stderr)
        for n, err in fail:
            print(f'  [FAIL] {n}: {err}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())

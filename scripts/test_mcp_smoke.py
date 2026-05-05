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

    local_today = mod._today_iso()
    stale_today = "2026-04-30"
    synthetic_data = {
        "today": stale_today,
        "days": {
            stale_today: [{"id": "stale"}],
            local_today: [{"id": "fresh"}],
        },
    }
    active_day = mod._active_data_day(synthetic_data)
    if active_day != local_today:
        print(
            f'[mcp_smoke] FAIL active_data_day: expected {local_today}, got {active_day}',
            file=sys.stderr,
        )
        return 1
    pipeline = mod.get_pipeline_status()
    if pipeline.get("today") != local_today:
        print(
            f'[mcp_smoke] FAIL get_pipeline_status.today: expected {local_today}, got {pipeline.get("today")}',
            file=sys.stderr,
        )
        return 1
    if pipeline.get("local_today") != local_today:
        print(
            f'[mcp_smoke] FAIL get_pipeline_status.local_today: expected {local_today}, got {pipeline.get("local_today")}',
            file=sys.stderr,
        )
        return 1
    if pipeline.get("source_of_truth") != "data.js":
        print(
            f'[mcp_smoke] FAIL source_of_truth: expected data.js, got {pipeline.get("source_of_truth")}',
            file=sys.stderr,
        )
        return 1
    truth = pipeline.get("data_truth") or {}
    if pipeline.get("winamax_exact_ratio") != truth.get("winamax_exact_ratio"):
        print(
            '[mcp_smoke] FAIL winamax_exact_ratio must be the top-level data.js truth',
            file=sys.stderr,
        )
        return 1
    if pipeline.get("project_root") and "Paris-Sportif" not in pipeline.get("project_root"):
        print(
            f'[mcp_smoke] FAIL project_root should prefer the fresh Paris-Sportif repo, got {pipeline.get("project_root")}',
            file=sys.stderr,
        )
        return 1
    runtime = pipeline.get("mcp_runtime") or {}
    if not runtime.get("script_sha"):
        print('[mcp_smoke] FAIL mcp_runtime.script_sha missing', file=sys.stderr)
        return 1
    if runtime.get("legacy_shadow_status") not in {"aligned", "missing"}:
        print(
            f'[mcp_smoke] FAIL legacy MCP shadow is stale: {runtime.get("legacy_shadow_status")}',
            file=sys.stderr,
        )
        return 1
    secondary = (pipeline.get("sync_check") or {}).get("secondary_snapshots") or {}
    if "night_metrics" not in secondary:
        print('[mcp_smoke] FAIL missing night_metrics secondary snapshot status', file=sys.stderr)
        return 1
    if pipeline.get("today") == stale_today:
        print('[mcp_smoke] FAIL stale hardcoded date leaked into pipeline status', file=sys.stderr)
        return 1
    original_loader = mod._load_data_js
    try:
        mod._load_data_js = lambda: {
            "today": stale_today,
            "generated_at": "2026-04-30T08:00:00Z",
            "days": {stale_today: [{"id": "stale-only"}]},
        }
        stale_pipeline = mod.get_pipeline_status()
    finally:
        mod._load_data_js = original_loader
    if stale_pipeline.get("today") != local_today:
        print(
            f'[mcp_smoke] FAIL stale data must still report local today: expected {local_today}, got {stale_pipeline.get("today")}',
            file=sys.stderr,
        )
        return 1
    if stale_pipeline.get("active_data_day") != stale_today:
        print(
            f'[mcp_smoke] FAIL stale active_data_day should expose the stale bucket: expected {stale_today}, got {stale_pipeline.get("active_data_day")}',
            file=sys.stderr,
        )
        return 1
    if stale_pipeline.get("data_day_is_current") is not False:
        print('[mcp_smoke] FAIL stale data must set data_day_is_current=false', file=sys.stderr)
        return 1

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

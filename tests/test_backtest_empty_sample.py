import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_backtest_module():
    spec = importlib.util.spec_from_file_location(
        "backtest_v2_under_test",
        ROOT / "scripts" / "backtest_v2.py",
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_empty_backtest_writes_skip_report(tmp_path, monkeypatch):
    mod = load_backtest_module()
    monkeypatch.setattr(mod, "REPORT_JSON", tmp_path / "backtest_report_v2.json")
    monkeypatch.setattr(mod, "REPORT_MD", tmp_path / "backtest_report_v2.md")
    monkeypatch.setattr(mod, "CALIBRATION_SEGMENTS_JSON", tmp_path / "calibration_segments.json")
    monkeypatch.setattr(mod, "CALIBRATION_MARKETS_JSON", tmp_path / "calibration_markets.json")
    monkeypatch.setattr(mod, "BANKROLL_SIM_JSON", tmp_path / "bankroll_simulation.json")

    report = mod.write_empty_report("no settled picks")
    saved = json.loads((tmp_path / "backtest_report_v2.json").read_text(encoding="utf-8"))

    assert report["status"] == "skipped"
    assert saved["n_events"] == 0
    assert saved["overall"]["n"] == 0
    assert saved["overall"]["flat_roi_pct"] == 0.0
    assert "no settled picks" in saved["skip_reason"]
    assert "skipped" in (tmp_path / "backtest_report_v2.md").read_text(encoding="utf-8")

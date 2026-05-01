#!/usr/bin/env python3
"""Patch les 4 stats hardcodées de index.html depuis backtest_report_v2.json (v31.7.29).

Avant : index.html avait 4 stat-cards avec valeurs en dur (87% WR locks,
+7.2% ROI, 0.216 Brier, +78% Kelly) qui ne reflétaient plus la réalité
courante (56% WR, +5.4% ROI, +217% Kelly à date).

Maintenant : ce script lit backtest_report_v2.json + remplace les 4 cards
via un marqueur HTML <!-- INDEX_STATS_AUTO --> ... <!-- /INDEX_STATS_AUTO -->.
Tourne après chaque backtest_v2.py (cron hebdo + finalize_inline.py).

Marqueur : on utilise un commentaire HTML délimité pour identifier la zone
à régénérer sans risquer d'écraser du contenu autour. Si le marqueur
n'existe pas, on l'ajoute autour de la stats-strip existante.
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX_HTML = ROOT / 'index.html'
REPORT = ROOT / 'backtest_report_v2.json'

START_MARKER = '<!-- INDEX_STATS_AUTO -->'
END_MARKER = '<!-- /INDEX_STATS_AUTO -->'


def render_stats(report: dict) -> str:
    """Génère le HTML de la stats-strip (4 cards) à partir du report."""
    o = report.get('overall') or {}
    locks = (report.get('by_tier') or {}).get('lock') or {}
    bankroll_kelly = report.get('bankroll_final_kelly') or 100
    kelly_pct = (bankroll_kelly - 100) / 100 * 100  # +217.2%
    date_end = (report.get('date_range') or {}).get('end') or ''
    period = date_end[:7] if date_end else 'récent'

    # Color cls : pos / neutral / neg
    overall_cls = 'pos' if o.get('flat_roi_pct', 0) > 0 else 'neg' if o.get('flat_roi_pct', 0) < 0 else 'neutral'
    locks_cls = 'pos' if locks.get('win_rate', 0) > 0.6 else 'neutral'
    kelly_cls = 'pos' if kelly_pct > 0 else 'neg' if kelly_pct < 0 else 'neutral'

    return f'''  <div class="stats-strip" role="region" aria-label="Performance du modèle (backtest hebdomadaire)">
    <div class="stat-card">
      <div class="label">Win rate (locks)</div>
      <div class="value {locks_cls}">{int(round(locks.get('win_rate', 0)*100))}%</div>
      <div class="sub">{locks.get('n', 0)} picks haute confiance · backtest {period}</div>
    </div>
    <div class="stat-card">
      <div class="label">ROI flat (toutes confs)</div>
      <div class="value {overall_cls}">{o.get('flat_roi_pct', 0):+.1f}%</div>
      <div class="sub">{o.get('n', 0)} picks · mise plate 1u/pari</div>
    </div>
    <div class="stat-card">
      <div class="label">Brier score</div>
      <div class="value neutral">{o.get('brier', 0):.3f}</div>
      <div class="sub">Random = 0.25 · plus bas = mieux</div>
    </div>
    <div class="stat-card">
      <div class="label">Bankroll Kelly 0.25×</div>
      <div class="value {kelly_cls}">{kelly_pct:+.0f}%</div>
      <div class="sub">100u → {bankroll_kelly:.0f}u sur la période</div>
    </div>
  </div>'''


def main() -> int:
    if not REPORT.exists():
        print(f"[patch_index_stats] {REPORT.name} introuvable, skip.", file=sys.stderr)
        return 0
    if not INDEX_HTML.exists():
        print(f"[patch_index_stats] {INDEX_HTML.name} introuvable, skip.", file=sys.stderr)
        return 0

    report = json.loads(REPORT.read_text(encoding='utf-8'))
    new_block = f'{START_MARKER}\n{render_stats(report)}\n  {END_MARKER}'

    html = INDEX_HTML.read_text(encoding='utf-8')

    if START_MARKER in html and END_MARKER in html:
        # Replace existing block
        pattern = re.compile(
            re.escape(START_MARKER) + r'.*?' + re.escape(END_MARKER),
            re.DOTALL,
        )
        new_html = pattern.sub(new_block, html, count=1)
    else:
        # First-run : wrap the existing stats-strip with markers
        pattern = re.compile(
            r'(  <div class="stats-strip"[\s\S]*?\n  </div>\n)',
        )
        m = pattern.search(html)
        if not m:
            print("[patch_index_stats] stats-strip introuvable dans index.html, skip.",
                  file=sys.stderr)
            return 0
        new_html = html[:m.start()] + new_block + '\n' + html[m.end():]

    if new_html == html:
        print("[patch_index_stats] aucun changement.", file=sys.stderr)
        return 0
    INDEX_HTML.write_text(new_html, encoding='utf-8')
    o = report.get('overall') or {}
    locks = (report.get('by_tier') or {}).get('lock') or {}
    print(f"[patch_index_stats] index.html mis à jour : "
          f"locks WR {int(round(locks.get('win_rate', 0)*100))}% / "
          f"overall ROI {o.get('flat_roi_pct', 0):+.1f}% / "
          f"Brier {o.get('brier', 0):.3f}",
          file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""v35.02 — Link data.js from pronostics.html instead of inlining it.

Avant : 12 patches sur 18 ré-écrivaient pronostics.html en regex sur les ~13500
lignes du fichier, à chaque exécution. Coût : ~0.5-1s × 12 = ~6-12s gaspillées
par run cron, sans gain (le HTML est juste un wrapper qui contient data.js inline).

v35.02 : les marchés Winamax détaillés peuvent faire grossir data.js au-delà
de 2 MB. Garder le payload inline dans pronostics.html casse le budget HTML,
augmente le risque de conflit cron et force les navigateurs à recharger tout
le shell pour une simple mise à jour data. Le HTML référence donc data.js avec
un hash court de contenu ; le service worker le sert déjà en network-first.

Idempotent : peut tourner même si data.js n'a pas changé. Cherche soit l'ancien
bloc inline, soit un précédent <script src="data.js?v=..."></script>, puis le
remplace par un lien externe à jour.

Usage : python3 scripts/inject_data_in_html.py
"""
from __future__ import annotations
import re
import sys
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
HTML = ROOT / 'pronostics.html'


def main() -> int:
    if not DATA_JS.exists():
        print(f'[inject_html] {DATA_JS.name} missing', file=sys.stderr)
        return 1
    if not HTML.exists():
        print(f'[inject_html] {HTML.name} missing — nothing to inject', file=sys.stderr)
        return 0  # non-fatal, HTML peut être en build/dev

    # Lit data.js et vérifie qu'il expose bien window.PRONOSTICS_DATA.
    data_text = DATA_JS.read_text(encoding='utf-8').strip()
    m = re.match(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', data_text, flags=re.DOTALL)
    if not m:
        print('[inject_html] could not parse data.js — invalid format', file=sys.stderr)
        return 1
    data_hash = hashlib.sha1(data_text.encode('utf-8')).hexdigest()[:8]

    # Lit pronostics.html, remplace le bloc inline
    html_text = HTML.read_text(encoding='utf-8')
    new_block = f'<script src="data.js?v={data_hash}"></script>'
    new_html, n_subs = re.subn(
        r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>|<script\s+src="data\.js(?:\?v=[^"]+)?"></script>',
        new_block,
        html_text,
        count=1,
        flags=re.DOTALL,
    )
    if n_subs == 0:
        print('[inject_html] no inline PRONOSTICS_DATA block found in pronostics.html', file=sys.stderr)
        return 1

    if new_html == html_text:
        # Already up-to-date, skip write to avoid spurious git diff
        print('[inject_html] pronostics.html already up-to-date — skip write')
        return 0

    HTML.write_text(new_html, encoding='utf-8')
    size_kb = HTML.stat().st_size / 1024
    print(f'[inject_html] linked data.js?v={data_hash} ({len(data_text)/1024:.0f}KB data, HTML {size_kb:.0f}KB)')
    return 0


if __name__ == '__main__':
    sys.exit(main())

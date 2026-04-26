"""_data_io.py — utilities partagées pour parse/write data.js.

Pattern dupliqué dans 15+ scripts (load_data/save_data). Ce module
centralise pour éviter la divergence (ex: une regex légèrement
différente d'un script à l'autre, ou un encoding subtle).

Les scripts existants ne sont PAS forcés de migrer ; on factorise
progressivement. Tout nouveau script doit utiliser ce module.

Usage:
    from scripts._data_io import load_data_js, save_data_js

    data = load_data_js()
    # ... modify data dict ...
    save_data_js(data)

Convention :
- `data.js` est UN fichier monolithique de la racine projet
- Format: `window.PRONOSTICS_DATA = {...};\n` (single line, no pretty-print)
- Encoding UTF-8 (français + emojis)
- Idempotent : `load → save` produit un fichier byte-identical (sans
  modifications de data) modulo l'ordre des clés JSON.

Optionnellement : `update_inline_blob_in_html()` met à jour le bloc
inline LITE dans pronostics.html (utilisé par finalize_inline.py).
"""
from __future__ import annotations
import json
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA_JS_PATH = ROOT / 'data.js'
PRONOSTICS_HTML = ROOT / 'pronostics.html'

# Regex robuste pour extraire le JSON. Multi-line, captures jusqu'au `;` final.
DATA_RE = re.compile(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', re.DOTALL)


class DataIOError(Exception):
    """Raised when data.js cannot be parsed or saved."""


def load_data_js(path: Path | None = None) -> dict:
    """Parse data.js et retourne le dict PRONOSTICS_DATA.
    Raise DataIOError si fichier manquant ou JSON invalide.
    """
    p = path or DATA_JS_PATH
    if not p.exists():
        raise DataIOError(f'{p} missing — run fetch_v3.py first')
    txt = p.read_text(encoding='utf-8')
    m = DATA_RE.search(txt)
    if not m:
        raise DataIOError(f'{p} has unexpected format (regex failed)')
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError as e:
        raise DataIOError(f'{p} JSON invalid: {e}') from e


def save_data_js(data: dict, path: Path | None = None) -> int:
    """Écrit data.js. Renvoie la taille en bytes.
    Format compact (separators sans espaces) pour minimiser la taille.
    """
    p = path or DATA_JS_PATH
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    out = f'window.PRONOSTICS_DATA = {payload};\n'
    p.write_text(out, encoding='utf-8')
    return p.stat().st_size


def update_inline_blob_in_html(data: dict, html_path: Path | None = None) -> bool:
    """Optionnel : met à jour le bloc <script>window.PRONOSTICS_DATA = ...
    inline dans pronostics.html. Utilisé par finalize_inline.py.
    Renvoie True si le bloc a été remplacé, False si pas trouvé.
    """
    p = html_path or PRONOSTICS_HTML
    if not p.exists():
        return False
    html = p.read_text(encoding='utf-8')
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload};\n</script>'
    new_html, n = re.subn(
        r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
        new_block,
        html,
        count=1,
        flags=re.DOTALL,
    )
    if n == 0:
        return False
    p.write_text(new_html, encoding='utf-8')
    return True


def iter_events(data: dict):
    """Itère tous les events de tous les jours. Helper commun."""
    days = data.get('days') or {}
    for date_key, events in days.items():
        for ev in events or []:
            yield date_key, ev

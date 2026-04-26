"""Charge `predictMatch` depuis app.js (ou pronostics.html en fallback)
et l'expose à Python.

Stratégie B1 (slice à la volée, Chantier backtest v2) :
- Lire le fichier source (`app.js` depuis v31.1 split, sinon `pronostics.html`)
- Extraire le corps de la grande IIFE qui contient predictMatch +
  tous ses helpers
- Stubber window/document/localStorage/navigator/setTimeout/etc. (les
  callbacks DOMContentLoaded ne s'exécutent pas hors navigateur)
- Évaluer dans py_mini_racer (V8 embarqué, ES2020+)
- Récupérer window.predictMatch, la fonction est exposée en fin d'IIFE

Une seule vérité de terrain : app.js (anciennement pronostics.html).
Pas de duplication Python.

v31.4 — Le code source officiel est `app.js` depuis le split v31.1.
`model_loader.py` cherche d'abord app.js, et fallback sur
pronostics.html si app.js n'existe pas (utile pour les anciennes
branches / archives).

Usage :
    loader = ModelLoader()
    loader.set_data(pronostics_data)  # l'équivalent window.PRONOSTICS_DATA
    pred = loader.predict(match_dict)
"""
from __future__ import annotations
import json
import re
from pathlib import Path

try:
    import py_mini_racer
except ImportError:
    raise SystemExit(
        "py_mini_racer requis. Installer avec :\n"
        "    python -m pip install mini-racer"
    )

ROOT = Path(__file__).resolve().parent.parent
APP_JS = ROOT / 'app.js'
PRONOSTICS_HTML = ROOT / 'pronostics.html'


def _resolve_source_path() -> Path:
    """Renvoie app.js si présent (v31.1+), sinon pronostics.html (legacy)."""
    if APP_JS.exists():
        return APP_JS
    return PRONOSTICS_HTML


def _extract_model_iife_body(source_text: str, *, is_html: bool) -> str:
    """Extrait le corps (sans `(function() {` ni `})();`) de l'IIFE qui
    définit predictMatch. Renvoie la source JS prête à eval.

    - is_html=True : fichier pronostics.html (cherche dans des <script>)
    - is_html=False : fichier app.js (le tout est déjà du JS, on cherche
      l'IIFE complète au top-level)
    """
    if is_html:
        # On cherche toutes les IIFE dans des <script>, et on garde celle qui
        # contient `window.predictMatch = predictMatch`.
        script_blocks = re.findall(
            r'<script[^>]*>\s*(\(function\(\)\s*\{[\s\S]*?\n\s*\}\)\(\);)\s*</script>',
            source_text,
        )
        candidates = list(script_blocks)
    else:
        # app.js : on lit tout le fichier comme une seule source. Il peut y
        # avoir plusieurs IIFE successives ; on les capture toutes au top-level
        # (lignes commençant par `(function`) et on garde celle qui contient
        # l'export `window.predictMatch = predictMatch`.
        candidates = []
        # Scan ligne par ligne pour trouver les IIFE top-level
        lines = source_text.split('\n')
        i = 0
        while i < len(lines):
            line = lines[i].lstrip()
            if line.startswith('(function()') or line.startswith('(function ()'):
                # Trouve le `})();` correspondant en cherchant la prochaine
                # ligne qui commence (sans indentation) par `})();`
                start = i
                j = i + 1
                while j < len(lines):
                    if lines[j].rstrip() == '})();':
                        candidates.append('\n'.join(lines[start:j + 1]))
                        i = j + 1
                        break
                    j += 1
                else:
                    i += 1
            else:
                i += 1

    target = None
    for block in candidates:
        if 'window.predictMatch = predictMatch' in block:
            target = block
            break
    if target is None:
        raise RuntimeError(
            "Impossible de trouver l'IIFE contenant "
            "`window.predictMatch = predictMatch` dans la source. "
            "Le slice du modèle a probablement changé."
        )
    # Retirer le `(function() {` initial et le `})();` final
    body = target
    body = re.sub(r'^\s*\(function\(\)\s*\{', '', body)
    body = re.sub(r'\}\)\(\);\s*$', '', body)
    return body


# Stubs DOM/navigateur pour faire tourner l'IIFE en Node/V8.
# Principe : tout ce que le code appelle au chargement doit au minimum
# ne pas lever. Les fonctions de rendu (render, renderCard, etc.) sont
# déclarées mais jamais appelées à l'init (DOMContentLoaded ne fire pas).
_STUBS_JS = r"""
var __LOCALSTORE = {};
var localStorage = {
  getItem: function(k) { return __LOCALSTORE[k] == null ? null : __LOCALSTORE[k]; },
  setItem: function(k, v) { __LOCALSTORE[k] = String(v); },
  removeItem: function(k) { delete __LOCALSTORE[k]; },
  clear: function() { __LOCALSTORE = {}; },
  key: function(i) { return Object.keys(__LOCALSTORE)[i] || null; },
  get length() { return Object.keys(__LOCALSTORE).length; }
};

// Proxy paresseux : tout accès renvoie une fonction/objet utilisable.
function __makeDomProxy(tag) {
  tag = tag || 'stub';
  var node = {
    tagName: String(tag).toUpperCase(),
    style: {},
    dataset: {},
    classList: {
      add: function() {}, remove: function() {}, toggle: function() {}, contains: function() { return false; }
    },
    children: [], childNodes: [],
    parentNode: null,
    innerHTML: '', textContent: '', value: '',
    attributes: {},
    appendChild: function(c) { return c; },
    removeChild: function(c) { return c; },
    insertBefore: function(c) { return c; },
    setAttribute: function() {}, getAttribute: function() { return null; }, removeAttribute: function() {},
    addEventListener: function() {}, removeEventListener: function() {},
    querySelector: function() { return __makeDomProxy('stub'); },
    querySelectorAll: function() { return []; },
    focus: function() {}, select: function() {}, click: function() {}, blur: function() {},
    getBoundingClientRect: function() { return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; },
    dispatchEvent: function() { return true; },
    cloneNode: function() { return __makeDomProxy(tag); }
  };
  return node;
}

// document stubbé pour que le top-level de l'IIFE (qui fait quelques
// `document.getElementById(X).addEventListener(...)`) ne crashe pas. Les
// fonctions de rendu n'étant jamais appelées (render() est dans le
// DOMContentLoaded qui ne fire pas), il suffit qu'aucune chaîne DOM ne
// lève au chargement.
var document = {
  documentElement: __makeDomProxy('html'),
  body: __makeDomProxy('body'),
  head: __makeDomProxy('head'),
  readyState: 'complete',
  addEventListener: function() {},
  removeEventListener: function() {},
  createElement: function(t) { return __makeDomProxy(t); },
  createTextNode: function(t) { return { textContent: t }; },
  createDocumentFragment: function() { return __makeDomProxy('fragment'); },
  // Chantier backtest v2 : on renvoie un proxy chainable au lieu de null
  // pour que `document.getElementById('X').addEventListener(...)` passe.
  getElementById: function(id) { return __makeDomProxy(id); },
  getElementsByTagName: function() { return []; },
  getElementsByClassName: function() { return []; },
  querySelector: function(sel) { return __makeDomProxy(sel); },
  querySelectorAll: function() { return []; },
  cookie: ''
};

var navigator = {
  userAgent: 'mini-racer-backtest',
  serviceWorker: undefined,
  language: 'fr-FR',
  onLine: true
};

var location = { protocol: 'file:', href: 'file:///backtest', pathname: '/backtest' };

// setTimeout/setInterval : on récupère les callbacks mais on ne les exécute
// jamais (pas d'event loop dans V8 embarqué). Le seul impact : les usages
// genre `setTimeout(render, 800)` ne s'exécutent pas — parfait pour nous.
var __timers = [];
function setTimeout(fn, ms) { __timers.push(fn); return __timers.length; }
function clearTimeout() {}
function setInterval(fn, ms) { __timers.push(fn); return __timers.length; }
function clearInterval() {}
function requestAnimationFrame(fn) { return 0; }
function cancelAnimationFrame() {}

// Fetch : promise résolue avec un objet vide. loadOddsHistory appelle
// fetch('odds_history.jsonl') → pour le backtest on lui injecte direct
// les données via window.__oddsHistory pré-remplie avant predictMatch.
function fetch(url) {
  return Promise.resolve({
    ok: true,
    status: 404,
    text: function() { return Promise.resolve(''); },
    json: function() { return Promise.resolve({}); }
  });
}

// window est le global dans un navigateur. On le miroire sur globalThis.
var window = globalThis;
window.localStorage = localStorage;
window.document = document;
window.navigator = navigator;
window.location = location;
window.setTimeout = setTimeout;
window.setInterval = setInterval;
window.fetch = fetch;
window.addEventListener = function() {};
window.removeEventListener = function() {};
window.matchMedia = function() { return { matches: false, addListener: function(){}, removeListener: function(){} }; };
window.PRONOSTICS_DATA = null;
window.__oddsHistory = null;

// Console : V8 embarqué n'a pas console natif. On le stubbe pour que les
// éventuels console.log internes ne crashent pas.
var console = {
  log: function() {}, warn: function() {}, error: function() {},
  info: function() {}, debug: function() {}, trace: function() {}
};
"""


class ModelLoader:
    """Charge une fois la lib JS puis permet d'appeler predictMatch à la
    demande avec un contexte de données (PRONOSTICS_DATA + odds_history)."""

    def __init__(self, source_path: Path | None = None):
        # v31.4 — `source_path` peut pointer sur `app.js` (recommandé,
        # v31.1+) ou `pronostics.html` (legacy, fallback). Par défaut, on
        # résout automatiquement vers app.js si présent.
        self.source_path = source_path or _resolve_source_path()
        self.ctx = py_mini_racer.MiniRacer()
        self._load()

    # Compat legacy : certains call sites passent encore `html_path=`.
    @property
    def html_path(self) -> Path:
        return self.source_path

    def _load(self) -> None:
        text = self.source_path.read_text(encoding='utf-8')
        is_html = self.source_path.suffix.lower() == '.html'
        body = _extract_model_iife_body(text, is_html=is_html)
        # Ordre : stubs d'abord, puis l'IIFE body (qui assigne
        # window.predictMatch à la fin).
        self.ctx.eval(_STUBS_JS)
        self.ctx.eval(body)
        # Sanity : s'assurer que predictMatch est exposée
        has_fn = self.ctx.eval("typeof window.predictMatch === 'function'")
        if not has_fn:
            raise RuntimeError(
                "IIFE évaluée mais window.predictMatch non défini. "
                "Stubs DOM probablement insuffisants."
            )

    def set_data(self, pronostics_data: dict, odds_history: dict | None = None) -> None:
        """Installe le contexte pour les prochains appels predict(). Les
        caches internes de predictMatch (congestion, calibration) sont
        invalidés automatiquement car ils sont ancrés sur l'identité de
        window.PRONOSTICS_DATA."""
        self.ctx.eval(
            "window.PRONOSTICS_DATA = "
            + json.dumps(pronostics_data, ensure_ascii=False)
            + ";"
        )
        if odds_history is not None:
            self.ctx.eval(
                "window.__oddsHistory = "
                + json.dumps(odds_history, ensure_ascii=False)
                + ";"
            )
        # Invalider les caches (predictMatch les reconstruit au prochain appel)
        self.ctx.eval(
            "try { if (typeof __predCacheClear === 'function') __predCacheClear(); } catch (e) {}"
        )

    def predict(self, match: dict) -> dict | None:
        """Appelle predictMatch(match) et renvoie le dict de prédiction.
        Renvoie None si predictMatch renvoie null/undefined."""
        payload = json.dumps(match, ensure_ascii=False)
        raw = self.ctx.eval(
            f"JSON.stringify(window.predictMatch({payload}) || null)"
        )
        if raw is None or raw == 'null':
            return None
        return json.loads(raw)


if __name__ == '__main__':
    # Smoke test : charge le modèle et essaie de prédire sur un match
    # bidon. Sort avec succès si predictMatch renvoie un dict (même vide).
    import sys
    src = _resolve_source_path()
    print(f"[model_loader] Chargement de {src.name}...")
    loader = ModelLoader()
    print("[model_loader] OK, window.predictMatch exposée.")
    loader.set_data({'days': {}}, odds_history={})
    fake_match = {
        'id': 'smoke-1',
        'sport': 'football',
        'name': 'A vs B',
        'date': '2026-04-24T19:00Z',
        'competitors': [
            {'home_away': 'home', 'displayName': 'Home Team',
             'statistics': {'recentResults': 'WWWDL',
                            'summary': '10-2-3 (Ligue 1)'}},
            {'home_away': 'away', 'displayName': 'Away Team',
             'statistics': {'recentResults': 'LLDLW',
                            'summary': '5-4-6 (Ligue 1)'}},
        ],
        'odds': [{'home': 1.8, 'draw': 3.6, 'away': 4.2, 'provider': 'test'}],
    }
    pred = loader.predict(fake_match)
    if pred is None:
        print("[smoke] predictMatch a renvoyé null — input trop creux, c'est OK.")
        sys.exit(0)
    print(f"[smoke] pick={pred.get('pick', {}).get('label')!r} "
          f"prob={pred.get('pick', {}).get('prob')} "
          f"reliability={pred.get('reliability')}")
    sys.exit(0)

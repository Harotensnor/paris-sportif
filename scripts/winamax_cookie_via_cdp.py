#!/usr/bin/env python3
"""Récupère les cookies Winamax via Chrome DevTools Protocol.

Chrome 127+ chiffre les cookies en v20 (App-Bound Encryption) — DPAPI seul
ne suffit plus pour décrypter. La parade :
  1. Fermer Chrome
  2. Relancer Chrome avec --remote-debugging-port=9222 (utilise le profil
     existant, donc les cookies/session sont là)
  3. Demander les cookies via CDP (Chrome lui-même les déchiffre en mémoire)
  4. Construire le cookie header
  5. Fermer Chrome debug, relancer Chrome normalement

C'est invasif (Chrome ferme/réouvre) mais c'est la seule façon non-admin
de contourner v20.
"""
from __future__ import annotations
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_FILE = ROOT / '.winamax_session.auto'
COOKIE_FILE = ROOT / '.winamax_session'
DEBUG_PORT = 9222
CHROME_USER_DATA = Path(os.environ.get('LOCALAPPDATA', '')) / 'Google' / 'Chrome' / 'User Data'

CHROME_EXE_CANDIDATES = [
    Path(r'C:\Program Files\Google\Chrome\Application\chrome.exe'),
    Path(r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'),
]


def _find_chrome() -> Path | None:
    for p in CHROME_EXE_CANDIDATES:
        if p.exists():
            return p
    return None


def _kill_chrome():
    """Ferme Chrome (gracefully puis force après 4s)."""
    try:
        subprocess.run(
            ['powershell', '-NoProfile', '-Command',
             "Get-Process chrome -ErrorAction SilentlyContinue | "
             "ForEach-Object { if ($_.MainWindowHandle -ne 0) { $null = $_.CloseMainWindow() } }; "
             "Start-Sleep -Seconds 3; "
             "Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue; "
             "Start-Sleep -Seconds 1"],
            capture_output=True, timeout=20,
        )
    except Exception as e:
        print(f'  warn: kill_chrome err {e}', flush=True)


def _start_chrome_debug(chrome_exe: Path, port: int) -> subprocess.Popen | None:
    """Démarre Chrome en arrière-plan avec --remote-debugging-port.
    Utilise le profil par défaut (cookies/session déjà présents)."""
    args = [
        str(chrome_exe),
        f'--remote-debugging-port={port}',
        f'--user-data-dir={CHROME_USER_DATA}',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-popup-blocking',
        # Démarre minimisé pour ne pas perturber l'utilisateur
        '--window-position=0,0',
        '--window-size=400,300',
        # Page neutre (pas winamax direct, pour éviter les redirections de session)
        'about:blank',
    ]
    try:
        # CREATE_NEW_PROCESS_GROUP pour pouvoir tuer indépendamment
        return subprocess.Popen(
            args,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0,
        )
    except Exception as e:
        print(f'  ERR start chrome: {e}', flush=True)
        return None


def _wait_cdp_ready(port: int, timeout: float = 30.0) -> str | None:
    """Poll /json/version jusqu'à ce que CDP réponde. Retourne le
    webSocketDebuggerUrl du browser target."""
    deadline = time.time() + timeout
    last_err = None
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{port}/json/version', timeout=2) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                ws_url = data.get('webSocketDebuggerUrl')
                if ws_url:
                    return ws_url
        except Exception as e:
            last_err = e
        time.sleep(0.5)
    print(f'  CDP pas prêt après {timeout}s (last err: {last_err})', flush=True)
    return None


def _cdp_get_cookies(ws_url: str) -> list[dict] | None:
    """Demande TOUS les cookies via CDP Network.getAllCookies."""
    try:
        import websocket  # websocket-client
    except ImportError:
        print('  ERR websocket-client requis (pip install websocket-client)', flush=True)
        return None
    try:
        ws = websocket.create_connection(ws_url, timeout=15)
        ws.send(json.dumps({'id': 1, 'method': 'Network.getAllCookies'}))
        # Filtre les messages qui ne sont pas notre réponse (notifications)
        deadline = time.time() + 15
        while time.time() < deadline:
            raw = ws.recv()
            try:
                msg = json.loads(raw)
            except (TypeError, json.JSONDecodeError):
                continue
            if msg.get('id') == 1:
                ws.close()
                return msg.get('result', {}).get('cookies', []) or []
        ws.close()
        print('  ERR pas de réponse Network.getAllCookies dans le délai', flush=True)
        return None
    except Exception as e:
        print(f'  ERR CDP communication: {e}', flush=True)
        return None


def _build_cookie_header(cookies: list[dict]) -> str:
    """Filtre les cookies du domaine winamax.fr et construit le header."""
    pairs = []
    for c in cookies:
        domain = c.get('domain', '')
        if not domain.endswith('winamax.fr'):
            continue
        name = c.get('name', '')
        val = c.get('value', '')
        if not name:
            continue
        pairs.append(f'{name}={val}')
    return '; '.join(pairs)


def _restart_chrome_normal(chrome_exe: Path):
    """Relance Chrome normalement (sans --remote-debugging-port) pour
    rendre la main à l'utilisateur."""
    try:
        subprocess.Popen(
            [str(chrome_exe)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0,
        )
    except Exception as e:
        print(f'  warn: restart chrome err {e}', flush=True)


def main():
    chrome_exe = _find_chrome()
    if not chrome_exe:
        print('❌ Chrome introuvable.')
        sys.exit(1)

    print(f'[{datetime.now():%H:%M:%S}] Étape 1/5 : fermeture Chrome...', flush=True)
    _kill_chrome()

    print(f'[{datetime.now():%H:%M:%S}] Étape 2/5 : démarrage Chrome avec CDP port {DEBUG_PORT}...', flush=True)
    proc = _start_chrome_debug(chrome_exe, DEBUG_PORT)
    if not proc:
        print('❌ Impossible de démarrer Chrome.')
        sys.exit(2)

    try:
        print(f'[{datetime.now():%H:%M:%S}] Étape 3/5 : attente CDP ready...', flush=True)
        ws_url = _wait_cdp_ready(DEBUG_PORT)
        if not ws_url:
            print('❌ CDP n\'a pas démarré.')
            sys.exit(3)
        print(f'  CDP OK : {ws_url[:80]}...', flush=True)

        print(f'[{datetime.now():%H:%M:%S}] Étape 4/5 : récupération cookies...', flush=True)
        cookies = _cdp_get_cookies(ws_url)
        if cookies is None:
            print('❌ Échec CDP getAllCookies.')
            sys.exit(4)
        winamax = [c for c in cookies if c.get('domain', '').endswith('winamax.fr')]
        print(f'  {len(cookies)} cookies au total, {len(winamax)} sur *.winamax.fr', flush=True)

        if not winamax:
            print('❌ Aucun cookie winamax.fr — tu n\'es probablement pas connecté.')
            print('   Connecte-toi sur winamax.fr puis relance ce script.')
            sys.exit(5)

        # Vérification : a-t-on un cookie de session ?
        names = [c.get('name', '') for c in winamax]
        has_session = any(n in names for n in ('PHPSESSIONID', 'logindata', 'API_SESS', 'PHPSESSID'))
        if not has_session:
            print(f'⚠️  Pas de cookie session reconnu dans : {names}')
            print('   On exporte quand même tout au cas où.')

        header = _build_cookie_header(cookies)
        COOKIE_FILE.write_text(header, encoding='utf-8')
        # Cache aussi pour le fallback offline
        CACHE_FILE.write_text(json.dumps({
            'cookie': header,
            'source': 'cdp',
            'cached_at': datetime.utcnow().isoformat() + 'Z',
        }, ensure_ascii=False), encoding='utf-8')

        print(f'  ✓ Cookie header sauvé dans {COOKIE_FILE.name} ({len(header)} chars)', flush=True)
        print(f'  ✓ Noms des cookies : {sorted(set(names))}', flush=True)

    finally:
        print(f'[{datetime.now():%H:%M:%S}] Étape 5/5 : fermeture Chrome debug + restart normal...', flush=True)
        try:
            proc.terminate()
            time.sleep(1)
        except Exception:
            pass
        _kill_chrome()
        time.sleep(1)
        _restart_chrome_normal(chrome_exe)
        print(f'[{datetime.now():%H:%M:%S}] ✓ Chrome relancé normalement.', flush=True)


if __name__ == '__main__':
    main()

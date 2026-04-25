#!/usr/bin/env python3
"""Extrait automatiquement le cookie de session Winamax depuis le navigateur.

Plus besoin de copier-coller manuellement le cookie depuis DevTools tous
les 30 jours — ce module lit directement le store cookies de Chrome ou
Firefox sur la machine locale, le déchiffre (DPAPI sur Windows pour
Chrome, plain text pour Firefox), et retourne la valeur.

Limites
-------
- Marche UNIQUEMENT sur la même machine que celle où Théo se connecte
  à Winamax (les cookies sont chiffrés avec ses creds Windows).
- Chrome doit être installé pour la branche Chrome ; Firefox idem.
- Sur Chrome 80+, dépend de pywin32 + pycryptodome (DPAPI + AES-GCM).
- Si Chrome est en train de tourner, la DB cookies est lockée — on
  copie d'abord dans un tempdir.

Usage standalone (debug)
------------------------
    python scripts/winamax_cookie_extractor.py
    -> imprime le cookie trouvé (ou un message d'erreur clair).

Usage importé (par import_winamax_account.py)
---------------------------------------------
    from winamax_cookie_extractor import extract_winamax_cookie
    cookie = extract_winamax_cookie()  # str | None
"""
from __future__ import annotations
import json
import os
import shutil
import sqlite3
import sys
import tempfile
from pathlib import Path

# Noms de cookies à chercher (Winamax change parfois). PHPSESSIONID est
# le nom courant en 2026 (vu sur Chrome de Théo, audit 2026-04-25).
TARGET_COOKIE_NAMES = ('PHPSESSIONID', 'API_SESS', 'API_SESS_PROFILE', 'PHPSESSID', 'sessionId', 'wnxsess')


def _try_decrypt_chrome_value(encrypted: bytes, key: bytes) -> str | None:
    """Déchiffre un cookie Chrome v10/v11 (AES-GCM avec la clé maître DPAPI).

    NOTE : depuis Chrome 127+ (août 2024), les cookies sont chiffrés au format
    v20 (App-Bound Encryption). La clé v20 est doublement protégée (SYSTEM
    DPAPI puis User DPAPI) et nécessite des privilèges admin pour être
    déchiffrée. Cette fonction retourne None pour v20 → l'extraction auto
    bascule alors sur le cache, et si pas de cache, l'utilisateur doit
    coller manuellement le cookie header depuis DevTools Network tab.
    """
    if not encrypted or len(encrypted) < 32:
        return None
    try:
        from Crypto.Cipher import AES
    except ImportError:
        return None
    if encrypted[:3] in (b'v10', b'v11'):
        nonce = encrypted[3:15]
        ct_tag = encrypted[15:]
        ct, tag = ct_tag[:-16], ct_tag[-16:]
        try:
            cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
            return cipher.decrypt_and_verify(ct, tag).decode('utf-8', errors='replace')
        except Exception:
            return None
    if encrypted[:3] == b'v20':
        # App-Bound Encryption — non déchiffrable sans admin elevation.
        # Le caller verra None et basculera sur le cache / mode manuel.
        return None
    return None


def _chrome_master_key_windows() -> bytes | None:
    """Sur Windows, lit Local State et déchiffre la clé via DPAPI."""
    try:
        import win32crypt  # from pywin32
    except ImportError:
        return None
    import base64
    local_state_paths = [
        Path(os.environ.get('LOCALAPPDATA', '')) / 'Google' / 'Chrome' / 'User Data' / 'Local State',
        Path(os.environ.get('LOCALAPPDATA', '')) / 'Microsoft' / 'Edge' / 'User Data' / 'Local State',
        Path(os.environ.get('LOCALAPPDATA', '')) / 'BraveSoftware' / 'Brave-Browser' / 'User Data' / 'Local State',
    ]
    for ls_path in local_state_paths:
        if not ls_path.exists():
            continue
        try:
            ls = json.loads(ls_path.read_text(encoding='utf-8'))
            enc_b64 = ls.get('os_crypt', {}).get('encrypted_key')
            if not enc_b64:
                continue
            enc = base64.b64decode(enc_b64)
            if not enc.startswith(b'DPAPI'):
                continue
            enc = enc[5:]  # strip "DPAPI" prefix
            # CryptUnprotectData returns (description, decrypted_bytes)
            return win32crypt.CryptUnprotectData(enc, None, None, None, 0)[1]
        except Exception:
            continue
    return None


def _chrome_cookie_paths_windows() -> list[Path]:
    """Liste les fichiers Cookies de tous les profils Chrome/Edge/Brave."""
    bases = [
        Path(os.environ.get('LOCALAPPDATA', '')) / 'Google' / 'Chrome' / 'User Data',
        Path(os.environ.get('LOCALAPPDATA', '')) / 'Microsoft' / 'Edge' / 'User Data',
        Path(os.environ.get('LOCALAPPDATA', '')) / 'BraveSoftware' / 'Brave-Browser' / 'User Data',
    ]
    out = []
    for base in bases:
        if not base.exists():
            continue
        for profile in base.iterdir():
            if not profile.is_dir():
                continue
            # Chrome 96+ stores cookies under /Network/Cookies; older under /Cookies
            for sub in (profile / 'Network' / 'Cookies', profile / 'Cookies'):
                if sub.exists() and sub.is_file():
                    out.append(sub)
    return out


def _shared_copy_windows(src: Path, dst: str) -> bool:
    """Copy un fichier même s'il est lock par un autre process (Chrome).

    `shutil.copy2` utilise CopyFileW qui respecte les locks Windows et
    échoue avec WinError 32 quand Chrome tourne. On utilise CreateFileW
    avec FILE_SHARE_READ|WRITE|DELETE pour lire en parallèle.
    """
    try:
        import ctypes
        from ctypes import wintypes
        kernel32 = ctypes.windll.kernel32
        GENERIC_READ = 0x80000000
        FILE_SHARE_ALL = 0x01 | 0x02 | 0x04  # read+write+delete
        OPEN_EXISTING = 3
        FILE_ATTRIBUTE_NORMAL = 0x80
        INVALID_HANDLE_VALUE = -1

        kernel32.CreateFileW.restype = wintypes.HANDLE
        kernel32.CreateFileW.argtypes = [
            wintypes.LPCWSTR, wintypes.DWORD, wintypes.DWORD,
            ctypes.c_void_p, wintypes.DWORD, wintypes.DWORD, wintypes.HANDLE,
        ]
        h = kernel32.CreateFileW(str(src), GENERIC_READ, FILE_SHARE_ALL,
                                 None, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, None)
        if h == INVALID_HANDLE_VALUE or h == 0:
            return False
        try:
            buf = ctypes.create_string_buffer(64 * 1024)
            written = wintypes.DWORD()
            with open(dst, 'wb') as out:
                while True:
                    if not kernel32.ReadFile(h, buf, len(buf), ctypes.byref(written), None):
                        return False
                    if written.value == 0:
                        break
                    out.write(buf.raw[:written.value])
            return True
        finally:
            kernel32.CloseHandle(h)
    except Exception:
        return False


def _read_cookie_chrome_windows() -> str | None:
    """Best-effort sur Windows : lit Chrome/Edge/Brave."""
    if sys.platform != 'win32':
        return None
    key = _chrome_master_key_windows()
    if not key:
        return None
    for db_path in _chrome_cookie_paths_windows():
        try:
            with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp:
                tmp_path = tmp.name
            # Tente d'abord copy partagée (Chrome ouvert), fallback shutil
            ok = _shared_copy_windows(db_path, tmp_path)
            if not ok:
                try:
                    shutil.copy2(db_path, tmp_path)
                except OSError:
                    continue
            try:
                conn = sqlite3.connect(f'file:{tmp_path}?mode=ro', uri=True)
                cur = conn.execute(
                    "SELECT name, value, encrypted_value FROM cookies "
                    "WHERE host_key LIKE '%winamax.fr' "
                    "ORDER BY expires_utc DESC"
                )
                for name, value, encrypted in cur:
                    if name not in TARGET_COOKIE_NAMES:
                        continue
                    if encrypted:
                        decoded = _try_decrypt_chrome_value(encrypted, key)
                        if decoded:
                            return decoded
                    if value:
                        return value
                conn.close()
            finally:
                try: os.unlink(tmp_path)
                except OSError: pass
        except Exception:
            continue
    return None


def _read_cookie_firefox() -> str | None:
    """Firefox stocke les cookies en clair dans une SQLite (cookies.sqlite)."""
    if sys.platform == 'win32':
        base = Path(os.environ.get('APPDATA', '')) / 'Mozilla' / 'Firefox' / 'Profiles'
    elif sys.platform == 'darwin':
        base = Path.home() / 'Library' / 'Application Support' / 'Firefox' / 'Profiles'
    else:
        base = Path.home() / '.mozilla' / 'firefox'
    if not base.exists():
        return None
    for profile in base.iterdir():
        if not profile.is_dir():
            continue
        db_path = profile / 'cookies.sqlite'
        if not db_path.exists():
            continue
        try:
            with tempfile.NamedTemporaryFile(suffix='.sqlite', delete=False) as tmp:
                tmp_path = tmp.name
            # Firefox locke aussi sa cookies.sqlite quand il tourne — meme fix
            ok = (sys.platform == 'win32' and _shared_copy_windows(db_path, tmp_path))
            if not ok:
                try:
                    shutil.copy2(db_path, tmp_path)
                except OSError:
                    continue
            try:
                conn = sqlite3.connect(f'file:{tmp_path}?mode=ro', uri=True)
                cur = conn.execute(
                    "SELECT name, value FROM moz_cookies "
                    "WHERE host LIKE '%winamax.fr' "
                    "ORDER BY expiry DESC"
                )
                for name, value in cur:
                    if name in TARGET_COOKIE_NAMES and value:
                        return value
                conn.close()
            finally:
                try: os.unlink(tmp_path)
                except OSError: pass
        except Exception:
            continue
    return None


CACHE_FILE = Path(__file__).resolve().parent.parent / '.winamax_session.auto'
CACHE_MAX_DAYS = 25  # Le cookie Winamax dure ~30j, on garde une marge.


def _save_cache(cookie: str, source: str):
    """Sauvegarde le cookie + source pour fallback quand l'extract échoue
    (ex: Chrome ouvert qui locke la DB SQLite)."""
    try:
        import json
        from datetime import datetime
        CACHE_FILE.write_text(
            json.dumps({
                'cookie': cookie,
                'source': source,
                'cached_at': datetime.utcnow().isoformat() + 'Z',
            }, ensure_ascii=False),
            encoding='utf-8',
        )
    except Exception:
        pass


def _load_cache() -> tuple[str, str] | None:
    if not CACHE_FILE.exists():
        return None
    try:
        import json
        from datetime import datetime, timedelta
        d = json.loads(CACHE_FILE.read_text(encoding='utf-8'))
        cached_at = d.get('cached_at', '').rstrip('Z')
        try:
            ts = datetime.fromisoformat(cached_at)
            age_days = (datetime.utcnow() - ts).total_seconds() / 86400.0
            if age_days > CACHE_MAX_DAYS:
                return None
        except ValueError:
            return None
        return d.get('cookie'), 'cache'
    except Exception:
        return None


def extract_winamax_cookie() -> tuple[str, str] | None:
    """Tente Chrome/Edge/Brave puis Firefox, fallback sur cache local.

    Returns:
        (cookie_value, source) ou None si aucun cookie trouvé.
        source ∈ {'chrome', 'firefox', 'cache'} pour traçabilité.
    """
    # 1. Live extraction
    val = _read_cookie_chrome_windows()
    if val:
        _save_cache(val, 'chrome')
        return val, 'chrome'
    val = _read_cookie_firefox()
    if val:
        _save_cache(val, 'firefox')
        return val, 'firefox'
    # 2. Cache (extraction live échoue souvent quand Chrome/FF ouvert ;
    # le cache d'une exécution récente reste valide tant que le cookie
    # Winamax n'a pas expiré côté serveur ~30j).
    cached = _load_cache()
    if cached:
        return cached
    return None


def main():
    result = extract_winamax_cookie()
    if not result:
        print('[cookie_extractor] ❌ Aucun cookie Winamax trouvé.')
        print('   - Vérifie que tu es bien connecté sur winamax.fr dans Chrome ou Firefox.')
        print('   - Sur Windows, pip install pywin32 pycryptodome --break-system-packages')
        print('   - Sinon utilise le mode manuel (cf docs/winamax-import.md).')
        sys.exit(1)
    cookie, source = result
    print(f'[cookie_extractor] ✓ Cookie extrait depuis {source} (longueur {len(cookie)}).')
    # On n'imprime PAS le cookie complet (sensible). Juste les 8 premiers chars
    # pour confirmer que ça a marché.
    print(f'   Preview : {cookie[:8]}…{cookie[-4:]}')
    return cookie


if __name__ == '__main__':
    main()

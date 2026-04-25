#!/usr/bin/env python3
"""Déchiffre les cookies v20 (Chrome 127+ App-Bound Encryption).

Pourquoi c'est nécessaire
-------------------------
Depuis août 2024, Chrome chiffre les cookies au format v20 :
  v20 || nonce(12) || ciphertext || tag(16)
La clé AES utilisée est elle-même protégée par DPAPI à 2 niveaux :
  1. SYSTEM-level (intérieur)  ← accessible uniquement en impersonation SYSTEM
  2. USER-level (extérieur)    ← accessible par l'utilisateur normalement

Les exploits non-admin (COM Elevator) requièrent une injection dans
chrome.exe — malware-grade. Le seul chemin propre :
  → Élever en admin (UAC) → impersonate SYSTEM (token de winlogon)
  → décrypter la couche SYSTEM, revenir admin, décrypter la couche USER.

Cycle complet
-------------
1. Au lancement, si pas admin → se relance via PowerShell Start-Process -Verb RunAs
   (UAC popup, l'utilisateur clique Oui une fois)
2. Lit Local State, extrait app_bound_encrypted_key
3. Trouve un process SYSTEM (winlogon), duplique son token
4. Impersonate SYSTEM, CryptUnprotectData sur la couche outer
5. RevertToSelf, CryptUnprotectData sur la couche inner (USER, marche
   parce qu'on est admin mais du même user)
6. Récupère la clé AES-256
7. Déchiffre tous les cookies v20 winamax.fr
8. Construit un cookie header complet et l'écrit dans .winamax_session
"""
from __future__ import annotations
import base64
import ctypes
import json
import os
import shutil
import sqlite3
import sys
import tempfile
from ctypes import wintypes
from pathlib import Path


def _is_admin() -> bool:
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False


def _self_elevate_and_wait():
    """Relance ce script via UAC + attend la fin (ShellExecuteEx)."""
    script = os.path.abspath(__file__)
    py = sys.executable
    print('🛡️  UAC popup va s\'afficher — clique OUI pour autoriser.', flush=True)

    # SHELLEXECUTEINFOW
    class SHELLEXECUTEINFOW(ctypes.Structure):
        _fields_ = [
            ('cbSize', wintypes.DWORD),
            ('fMask', wintypes.ULONG),
            ('hwnd', wintypes.HWND),
            ('lpVerb', wintypes.LPCWSTR),
            ('lpFile', wintypes.LPCWSTR),
            ('lpParameters', wintypes.LPCWSTR),
            ('lpDirectory', wintypes.LPCWSTR),
            ('nShow', ctypes.c_int),
            ('hInstApp', wintypes.HINSTANCE),
            ('lpIDList', ctypes.c_void_p),
            ('lpClass', wintypes.LPCWSTR),
            ('hkeyClass', wintypes.HKEY),
            ('dwHotKey', wintypes.DWORD),
            ('hIconOrMonitor', wintypes.HANDLE),
            ('hProcess', wintypes.HANDLE),
        ]
    SEE_MASK_NOCLOSEPROCESS = 0x40
    SW_SHOWNORMAL = 1
    INFINITE = 0xFFFFFFFF

    info = SHELLEXECUTEINFOW()
    info.cbSize = ctypes.sizeof(info)
    info.fMask = SEE_MASK_NOCLOSEPROCESS
    info.lpVerb = 'runas'
    info.lpFile = py
    info.lpParameters = f'"{script}"'
    info.nShow = SW_SHOWNORMAL

    if not ctypes.windll.shell32.ShellExecuteExW(ctypes.byref(info)):
        err = ctypes.GetLastError()
        print(f'  ❌ ShellExecuteExW err={err} (UAC refusé ?)', flush=True)
        sys.exit(2)
    if not info.hProcess:
        print('  ❌ Pas de hProcess retourné', flush=True)
        sys.exit(2)
    print('  Élévation OK, attente fin du process admin...', flush=True)
    kernel32.WaitForSingleObject(info.hProcess, INFINITE)
    exit_code = wintypes.DWORD()
    kernel32.GetExitCodeProcess(info.hProcess, ctypes.byref(exit_code))
    kernel32.CloseHandle(info.hProcess)
    print(f'  Process admin terminé, exit={exit_code.value}', flush=True)
    sys.exit(exit_code.value)


# ----- Win32 wrappers -----

advapi32 = ctypes.windll.advapi32
crypt32 = ctypes.windll.crypt32
kernel32 = ctypes.windll.kernel32
psapi = ctypes.windll.psapi

PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
TOKEN_DUPLICATE = 0x0002
TOKEN_QUERY = 0x0008
TOKEN_IMPERSONATE = 0x0004
SecurityImpersonation = 2
TokenImpersonation = 2


class DATA_BLOB(ctypes.Structure):
    _fields_ = [('cbData', wintypes.DWORD), ('pbData', ctypes.c_void_p)]


def _bytes_to_blob(data: bytes) -> DATA_BLOB:
    buf = ctypes.create_string_buffer(data)
    blob = DATA_BLOB(len(data), ctypes.cast(buf, ctypes.c_void_p))
    blob._buf = buf  # keep alive
    return blob


def _blob_to_bytes(blob: DATA_BLOB) -> bytes:
    return ctypes.string_at(blob.pbData, blob.cbData)


def _crypt_unprotect(data: bytes) -> bytes:
    """CryptUnprotectData wrapper. Marche dans le contexte courant
    (utilisateur ou impersonated SYSTEM)."""
    inb = _bytes_to_blob(data)
    outb = DATA_BLOB()
    crypt32.CryptUnprotectData.argtypes = [
        ctypes.POINTER(DATA_BLOB), ctypes.c_void_p, ctypes.POINTER(DATA_BLOB),
        ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(DATA_BLOB),
    ]
    crypt32.CryptUnprotectData.restype = wintypes.BOOL
    if not crypt32.CryptUnprotectData(ctypes.byref(inb), None, None, None, None, 0, ctypes.byref(outb)):
        raise OSError(f'CryptUnprotectData failed err={ctypes.GetLastError()}')
    out = _blob_to_bytes(outb)
    # LocalFree avec argtypes corrects (sinon int truncation 64-bit)
    kernel32.LocalFree.argtypes = [ctypes.c_void_p]
    kernel32.LocalFree.restype = ctypes.c_void_p
    try:
        kernel32.LocalFree(outb.pbData)
    except Exception:
        pass  # leak negligeable, pas critique
    return out


def _impersonate_system() -> bool:
    """Trouve winlogon.exe, duplique son token primaire, impersonate.
    Doit être appelé depuis un process admin."""
    # Snapshot processes
    PROCESSENTRY32 = type('PROCESSENTRY32', (ctypes.Structure,), {'_fields_': [
        ('dwSize', wintypes.DWORD), ('cntUsage', wintypes.DWORD),
        ('th32ProcessID', wintypes.DWORD), ('th32DefaultHeapID', ctypes.c_void_p),
        ('th32ModuleID', wintypes.DWORD), ('cntThreads', wintypes.DWORD),
        ('th32ParentProcessID', wintypes.DWORD), ('pcPriClassBase', wintypes.LONG),
        ('dwFlags', wintypes.DWORD), ('szExeFile', ctypes.c_char * 260),
    ]})
    TH32CS_SNAPPROCESS = 0x00000002
    snap = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
    if snap == -1:
        return False
    pe = PROCESSENTRY32()
    pe.dwSize = ctypes.sizeof(pe)
    winlogon_pid = None
    if kernel32.Process32First(snap, ctypes.byref(pe)):
        while True:
            name = pe.szExeFile.decode('latin-1', errors='ignore').lower()
            if name == 'winlogon.exe':
                winlogon_pid = pe.th32ProcessID
                break
            if not kernel32.Process32Next(snap, ctypes.byref(pe)):
                break
    kernel32.CloseHandle(snap)
    if not winlogon_pid:
        print('  ❌ winlogon.exe introuvable')
        return False

    # Open winlogon process + token
    PROCESS_QUERY_INFORMATION = 0x0400
    h_proc = kernel32.OpenProcess(PROCESS_QUERY_INFORMATION, False, winlogon_pid)
    if not h_proc:
        # Try with limited info
        h_proc = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, winlogon_pid)
    if not h_proc:
        print(f'  ❌ OpenProcess winlogon failed err={ctypes.GetLastError()}')
        return False

    h_token = wintypes.HANDLE()
    if not advapi32.OpenProcessToken(h_proc, TOKEN_DUPLICATE | TOKEN_QUERY | TOKEN_IMPERSONATE, ctypes.byref(h_token)):
        print(f'  ❌ OpenProcessToken winlogon err={ctypes.GetLastError()}')
        kernel32.CloseHandle(h_proc)
        return False
    kernel32.CloseHandle(h_proc)

    # Duplicate as impersonation token
    h_dup = wintypes.HANDLE()
    if not advapi32.DuplicateTokenEx(
        h_token, TOKEN_QUERY | TOKEN_IMPERSONATE, None,
        SecurityImpersonation, TokenImpersonation, ctypes.byref(h_dup),
    ):
        print(f'  ❌ DuplicateTokenEx err={ctypes.GetLastError()}')
        kernel32.CloseHandle(h_token)
        return False
    kernel32.CloseHandle(h_token)

    if not advapi32.ImpersonateLoggedOnUser(h_dup):
        print(f'  ❌ ImpersonateLoggedOnUser err={ctypes.GetLastError()}')
        kernel32.CloseHandle(h_dup)
        return False
    kernel32.CloseHandle(h_dup)
    return True


def _revert_to_self():
    advapi32.RevertToSelf()


def _decrypt_v20_value(encrypted: bytes, master_key: bytes) -> bytes | None:
    """Décrypte un cookie v20 (Chrome 127+).
    Format : 'v20' (3 bytes) || nonce (12) || ciphertext || tag (16)"""
    if not encrypted or encrypted[:3] != b'v20' or len(encrypted) < 32:
        return None
    try:
        from Crypto.Cipher import AES
    except ImportError:
        return None
    nonce = encrypted[3:15]
    payload = encrypted[15:]
    ct, tag = payload[:-16], payload[-16:]
    try:
        cipher = AES.new(master_key, AES.MODE_GCM, nonce=nonce)
        plain = cipher.decrypt_and_verify(ct, tag)
        # v20 cookies ont 32 bytes prefix (cookie metadata) + value
        return plain[32:] if len(plain) > 32 else plain
    except Exception:
        return None


def main():
    # Quand on est admin (post-élévation), on écrit aussi dans un log
    # parce que stdout est perdu (nouveau process console).
    log_path = Path(__file__).resolve().parent.parent / 'winamax_v20_admin.log'
    if _is_admin():
        try:
            log_handle = open(log_path, 'w', encoding='utf-8', buffering=1)
            class Tee:
                def __init__(self, s, l): self.s, self.l = s, l
                def write(self, x):
                    try: self.s.write(x)
                    except Exception: pass
                    try: self.l.write(x); self.l.flush()
                    except Exception: pass
                def flush(self):
                    try: self.s.flush()
                    except Exception: pass
                    try: self.l.flush()
                    except Exception: pass
                def __getattr__(self, n): return getattr(self.s, n)
            sys.stdout = Tee(sys.stdout, log_handle)
            sys.stderr = Tee(sys.stderr, log_handle)
        except Exception: pass

    if not _is_admin():
        print('Pas admin, élévation...')
        _self_elevate_and_wait()
        return

    print('✓ Admin context')

    # 1. Read Local State
    local_state_path = Path(os.environ['LOCALAPPDATA']) / 'Google' / 'Chrome' / 'User Data' / 'Local State'
    ls = json.loads(local_state_path.read_text(encoding='utf-8'))
    abe_b64 = ls['os_crypt']['app_bound_encrypted_key']
    abe = base64.b64decode(abe_b64)
    if abe[:4] != b'APPB':
        print(f'❌ Format inattendu : {abe[:8]}')
        sys.exit(1)
    inner = abe[4:]  # Strip APPB prefix
    print(f'  app_bound_encrypted_key: {len(inner)} bytes après strip APPB')

    # 2. SYSTEM-level decrypt
    print('  impersonate SYSTEM...')
    if not _impersonate_system():
        print('❌ Impersonation SYSTEM échouée — vraiment besoin d\'admin')
        sys.exit(2)
    try:
        layer1 = _crypt_unprotect(inner)
        print(f'  ✓ couche SYSTEM décryptée : {len(layer1)} bytes')
    finally:
        _revert_to_self()

    # 3. USER-level decrypt
    layer2 = _crypt_unprotect(layer1)
    print(f'  ✓ couche USER décryptée : {len(layer2)} bytes')

    # 4. Master key — couche AES-GCM finale avec constante Chrome
    # Le blob v20 final = 1 byte flag + 12 nonce + 32 ciphertext + 16 tag = 61 bytes
    # OU plus long si suffix supplémentaire. La clé est chiffrée avec une
    # constante hardcodée dans Chrome (kCryptAppBoundKeyEntropy).
    print(f'  layer2 hex (full {len(layer2)} bytes) : {layer2.hex()}', flush=True)

    # Tentative 1 : prendre les 32 derniers bytes (cas simple sans 3e layer)
    candidate_keys = []
    if len(layer2) >= 32:
        candidate_keys.append(('last_32', layer2[-32:]))
    if len(layer2) >= 33:
        candidate_keys.append(('skip_first', layer2[1:33]))
    # Tentative 2 : AES-GCM décrypt avec la constante kCryptAppBoundKeyEntropy de Chrome
    # Source : chromium/components/os_crypt/sync/app_bound_encryption_provider.cc
    # (en tableau de 32 bytes hardcodé)
    # Hardcoded key Chrome v20 (reverse-engineered from chrome.dll)
    # Référence : github.com/runassu/chrome_v20_decryption
    chrome_const = bytes.fromhex('B31C6E241AC846728DA9C1FAC4936651CFFB944D143AB816276BCC6DA0284787')
    if len(layer2) >= 60:
        # Format attendu : flag(1) + iv(12) + ciphertext(varies) + tag(16)
        try:
            from Crypto.Cipher import AES
            flag = layer2[0]
            iv = layer2[1:13]
            ct_tag = layer2[13:]
            ct, tag = ct_tag[:-16], ct_tag[-16:]
            print(f'  attempt AES-GCM : flag=0x{flag:02x}, iv={iv.hex()}, ct_len={len(ct)}, tag={tag.hex()}', flush=True)
            for label, key in [('chrome_const', chrome_const)]:
                try:
                    cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
                    plain = cipher.decrypt_and_verify(ct, tag)
                    print(f'  ✓ AES-GCM with {label} -> {len(plain)} bytes : {plain[:8].hex()}…', flush=True)
                    candidate_keys.append((f'aes_{label}', plain[-32:] if len(plain) >= 32 else plain))
                except Exception as e:
                    print(f'  AES-GCM with {label} : {e}', flush=True)
        except Exception as e:
            print(f'  AES-GCM struct err : {e}', flush=True)

    print(f'  → {len(candidate_keys)} clés candidates : {[k[0] for k in candidate_keys]}', flush=True)
    # On stocke pour la suite — on essaiera chaque clé sur les cookies
    master_key_candidates = candidate_keys
    master_key = candidate_keys[0][1]  # Default
    print(f'  ✓ master_key v20 : {len(master_key)} bytes (preview {master_key[:4].hex()}…)')

    # 5. Lecture des cookies — ferme Chrome 5s, copie, relance.
    # Chrome restore session à l'ouverture, donc l'utilisateur ne perd rien.
    cookies_db = Path(os.environ['LOCALAPPDATA']) / 'Google' / 'Chrome' / 'User Data' / 'Default' / 'Network' / 'Cookies'
    if not cookies_db.exists():
        print(f'❌ {cookies_db} absent')
        sys.exit(4)

    def _was_chrome_running():
        try:
            import subprocess
            r = subprocess.run(
                ['powershell', '-NoProfile', '-Command',
                 '(Get-Process chrome -ErrorAction SilentlyContinue | Measure-Object).Count'],
                capture_output=True, text=True, timeout=5,
            )
            return int(r.stdout.strip() or '0') > 0
        except Exception:
            return False

    chrome_was_running = _was_chrome_running()
    print(f'  Chrome running : {chrome_was_running}')

    if chrome_was_running:
        print('  ferme Chrome temporairement pour libérer le DB lock...')
        import subprocess
        subprocess.run(['powershell', '-NoProfile', '-Command',
                       "Get-Process chrome -ErrorAction SilentlyContinue | "
                       "ForEach-Object { if ($_.MainWindowHandle -ne 0) { $null = $_.CloseMainWindow() } }; "
                       "Start-Sleep -Seconds 3; "
                       "Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue; "
                       "Start-Sleep -Seconds 1"],
                       capture_output=True, timeout=15)

    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as t: tp = t.name
    try:
        shutil.copy2(cookies_db, tp)
        print(f'  ✓ DB cookies copiée ({Path(tp).stat().st_size} bytes)')
    except OSError as e:
        print(f'❌ copy cookies DB : {e}')
        # Re-launch Chrome quoi qu'il arrive
        if chrome_was_running:
            try:
                subprocess.Popen(['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'])
            except Exception: pass
        sys.exit(5)

    # On va relancer Chrome après la lecture, peu importe le résultat
    def _restart_chrome():
        if chrome_was_running:
            try:
                subprocess.Popen(['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'])
                print('  ✓ Chrome relancé (session restore)')
            except Exception as e:
                print(f'  warn restart chrome: {e}')

    conn = sqlite3.connect(f'file:{tp}?mode=ro', uri=True)
    rows = list(conn.execute(
        "SELECT name, host_key, encrypted_value FROM cookies "
        "WHERE host_key LIKE '%winamax.fr' ORDER BY expires_utc DESC"
    ))
    conn.close()
    try: os.unlink(tp)
    except OSError: pass

    print(f'\n  {len(rows)} cookies winamax.fr trouvés')
    pairs = []
    decrypted_count = 0
    # On essaie chaque clé candidate jusqu'à ce qu'une marche
    for name, host, enc in rows:
        if not enc:
            continue
        plain = None
        winning_key_label = None
        for label, key in master_key_candidates:
            try:
                plain = _decrypt_v20_value(enc, key)
                if plain is not None:
                    winning_key_label = label
                    break
            except Exception:
                continue
        if plain is not None:
            try:
                val = plain.decode('utf-8', errors='replace')
                pairs.append(f'{name}={val}')
                decrypted_count += 1
                preview = val[:40] + ('…' if len(val) > 40 else '')
                print(f'  ✓ [{host}] {name} ({winning_key_label}) = {preview}')
            except Exception as e:
                print(f'  ✗ [{host}] {name} : decode err {e}')
        else:
            print(f'  ✗ [{host}] {name} : décryptage échoué (prefix={enc[:3]})')

    if not pairs:
        print('\n❌ Aucun cookie décrypté')
        _restart_chrome()
        sys.exit(6)

    header = '; '.join(pairs)
    out_file = Path(__file__).resolve().parent.parent / '.winamax_session'
    out_file.write_text(header, encoding='utf-8')
    print(f'\n✓ {decrypted_count} cookies écrits dans {out_file.name} ({len(header)} chars)')

    _restart_chrome()


if __name__ == '__main__':
    main()

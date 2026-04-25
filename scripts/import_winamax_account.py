#!/usr/bin/env python3
"""Importe l'historique de paris depuis ton compte Winamax.

⚠️ Ce script lit TES paris perso (montants, gains, pertes). Le fichier
de sortie ``winamax_my_bets.json`` est dans .gitignore — ne le commite
jamais sur un repo public sinon tes paris deviennent visibles par tout
internet.

CAS D'USAGE
-----------
Théo veut alimenter son bilan dans le site avec ses paris Winamax réels :
historique réglé + paris en cours + combinés. Le pipeline classique
(GitHub Actions) ne peut pas y accéder (pas authentifié), donc ce
script tourne EN LOCAL sur la machine de Théo, après qu'il ait copié
son cookie de session depuis son navigateur.

PRÉ-REQUIS
----------
1. Ouvrir winamax.fr dans Chrome/Firefox, se connecter normalement.
2. F12 → Application/Stockage → Cookies → https://www.winamax.fr
3. Trouver le cookie ``API_SESS`` (ou ``API_SESS_PROFILE`` selon la
   version), copier sa VALEUR.
4. Créer un fichier ``.winamax_session`` à la racine du projet et
   y coller la valeur (UNE SEULE LIGNE, pas de guillemets).
5. Lancer : ``python scripts/import_winamax_account.py``

Le cookie expire après ~30 jours d'inactivité, à recopier si besoin.

PRINCIPE
--------
- Hits ``/account/history`` (paginé) pour les paris réglés
- Hits ``/account/pendingbets`` pour les paris en cours
- Parse soit du HTML (BeautifulSoup), soit l'API JSON si dispo
- Output structuré dans ``winamax_my_bets.json`` :
  {
    "imported_at": "...",
    "bets": [
      {"id": "...", "date": "...", "stake": 5.0, "odds": 1.85,
       "status": "won|lost|pending", "legs": [...], "type": "single|combine|systeme",
       "potential_gain": 9.25, "actual_gain": 9.25, "sport": "...", ...},
      ...
    ],
    "summary": {"total_stake": ..., "total_gain": ..., "roi_pct": ...}
  }

LIMITATIONS
-----------
Winamax change régulièrement la structure de ses pages. Si le scraping
échoue, vérifier les URLs et adapter les sélecteurs HTML. Le script
sauvegarde toujours le HTML brut dans ``.winamax_raw/`` pour debug.
"""
from __future__ import annotations
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COOKIE_FILE = ROOT / '.winamax_session'
OUT_BETS = ROOT / 'winamax_my_bets.json'
LOG_FILE = ROOT / 'winamax_import.log'
RAW_DIR = ROOT / '.winamax_raw'
RAW_DIR.mkdir(exist_ok=True)


def _setup_logging():
    """Append stdout/stderr to winamax_import.log (en plus de la console)
    pour que la tâche planifiée Windows laisse une trace consultable.
    On garde une rotation simple : si le fichier > 1MB, on rename en
    .log.1 pour ne pas grossir indéfiniment."""
    try:
        if LOG_FILE.exists() and LOG_FILE.stat().st_size > 1_000_000:
            backup = LOG_FILE.with_suffix('.log.1')
            try: backup.unlink()
            except OSError: pass
            LOG_FILE.rename(backup)
    except OSError:
        pass

    class _Tee:
        """Duplicate stdout to console + log file."""
        def __init__(self, stream, log_handle):
            self._s = stream; self._l = log_handle
        def write(self, data):
            try: self._s.write(data)
            except Exception: pass
            try: self._l.write(data); self._l.flush()
            except Exception: pass
        def flush(self):
            try: self._s.flush()
            except Exception: pass
            try: self._l.flush()
            except Exception: pass
        def __getattr__(self, name): return getattr(self._s, name)

    try:
        log_handle = open(LOG_FILE, 'a', encoding='utf-8', buffering=1)
        log_handle.write(f'\n=== {datetime.now():%Y-%m-%d %H:%M:%S} === run start\n')
        sys.stdout = _Tee(sys.stdout, log_handle)
        sys.stderr = _Tee(sys.stderr, log_handle)
    except OSError:
        pass

# Endpoints à essayer dans l'ordre. Winamax les change parfois ; le
# script teste chacune et garde celle qui répond avec du contenu utile.
# v30 — Ajout des paramètres de filtre de date (ho_display=bettingHistory)
# parce que le formulaire history.php est inerte sans eux : sur GET sans
# params on récupère juste le shell HTML, pas les paris.
from datetime import datetime as _dt
_today = _dt.now()
_year_start = _today.replace(month=1, day=1)
_DATE_QS = (
    f'?ho_display=bettingHistory'
    f'&history_date_from_day={_year_start.day:02d}'
    f'&history_date_from_month={_year_start.month:02d}'
    f'&history_date_from_year={_year_start.year}'
    f'&history_date_to_day={_today.day:02d}'
    f'&history_date_to_month={_today.month:02d}'
    f'&history_date_to_year={_today.year}'
)
HISTORY_URLS = [
    f'https://www.winamax.fr/account/history.php{_DATE_QS}',
    'https://www.winamax.fr/account/history.php',
]
PENDING_URLS = [
    'https://www.winamax.fr/account/pendingbets.php',
    'https://www.winamax.fr/account/pendingbets',
    'https://www.winamax.fr/account/history.php?type=pending',
]

# Parser HTML — on utilise BeautifulSoup si dispo, sinon regex de secours.
try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False
    print('[winamax_import] ⚠️  beautifulsoup4 non installé, utilisation regex (moins fiable).', flush=True)
    print('[winamax_import]    pip install beautifulsoup4 --break-system-packages')

try:
    from curl_cffi import requests as cr
except ImportError:
    print('[winamax_import] ❌ curl_cffi requis. pip install curl_cffi --break-system-packages')
    sys.exit(1)


def _read_cookie() -> str:
    """Stratégie de récupération du cookie en cascade :
    1. Fichier .winamax_session (si présent et non-vide) → priorité absolue
       (Théo a explicitement collé un cookie, on l'utilise)
    2. Auto-extraction depuis Chrome/Edge/Brave/Firefox local → automatisation
       sans manipulation manuelle (cf scripts/winamax_cookie_extractor.py)
    3. Échec → message clair avec procédure manuelle.
    """
    # 1. Manuel
    if COOKIE_FILE.exists():
        raw = COOKIE_FILE.read_text(encoding='utf-8').strip()
        if raw:
            print(f'[winamax_import] cookie source: .winamax_session ({len(raw)} chars)', flush=True)
            _COOKIE_SOURCE['name'] = 'manual'
            return raw

    # 2. Auto-extract
    try:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from winamax_cookie_extractor import extract_winamax_cookie
        result = extract_winamax_cookie()
        if result:
            cookie, source = result
            print(f'[winamax_import] cookie source: auto-extract {source} ({len(cookie)} chars)', flush=True)
            _COOKIE_SOURCE['name'] = source
            return cookie
    except Exception as e:
        print(f'[winamax_import] auto-extract a échoué : {e}', flush=True)

    # 3. Échec
    print(f'[winamax_import] ❌ Aucun cookie disponible.')
    print(f'    Crée {COOKIE_FILE} (cf docs/winamax-import.md)')
    print('    OU connecte-toi à winamax.fr dans Chrome/Firefox sur cette machine.')
    sys.exit(2)


# Mutable container pour propager la source du cookie jusqu'à main()
# (pour qu'elle apparaisse dans winamax_my_bets.json → UI status pill)
_COOKIE_SOURCE: dict = {'name': 'unknown'}


def _build_session(cookie_value: str):
    """Construit une session curl_cffi avec le cookie utilisateur.

    cookie_value peut être :
      A) Un cookie header complet "name1=val1; name2=val2; ..." (recommandé,
         copié depuis DevTools Network tab → onglet Headers → Cookie:)
      B) Une simple valeur de session (genre PHPSESSIONID seule)

    Le mode A est nécessaire depuis Chrome 127+ qui chiffre les cookies en
    v20 (App-Bound Encryption) et bloque l'extraction par script. La parade :
    Théo copie le header Cookie complet depuis l'onglet Network.
    """
    sess = cr.Session(impersonate='chrome110')
    # Détection format A vs B
    has_equals = '=' in cookie_value
    has_multi = ';' in cookie_value or has_equals
    if has_multi and has_equals:
        # Format A : parse les paires nom=valeur
        for pair in cookie_value.split(';'):
            pair = pair.strip()
            if '=' not in pair:
                continue
            name, _, val = pair.partition('=')
            name = name.strip(); val = val.strip()
            if not name:
                continue
            try:
                sess.cookies.set(name, val, domain='.winamax.fr', path='/')
            except Exception:
                pass
    else:
        # Format B : simple valeur — essaie comme PHPSESSIONID puis fallback
        # sur les autres noms historiques (Winamax change parfois).
        for cookie_name in ('PHPSESSIONID', 'API_SESS', 'API_SESS_PROFILE', 'PHPSESSID', 'sessionId'):
            sess.cookies.set(cookie_name, cookie_value, domain='.winamax.fr', path='/')
    sess.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    })
    return sess


def _try_fetch(sess, urls: list[str], tag: str, post_data: dict | None = None) -> tuple[str, str] | None:
    """Tente chaque URL, garde la première qui répond avec du contenu non-trivial.
    Si post_data est fourni, fait un POST x-www-form-urlencoded au lieu de GET."""
    for url in urls:
        try:
            if post_data is not None:
                r = sess.post(url, data=post_data, timeout=20, allow_redirects=True,
                              headers={'Content-Type': 'application/x-www-form-urlencoded'})
            else:
                r = sess.get(url, timeout=20, allow_redirects=True)
        except Exception as e:
            print(f'  [{tag}] ERR {url}: {e}', flush=True)
            continue
        if r.status_code != 200:
            print(f'  [{tag}] HTTP {r.status_code} on {url}', flush=True)
            continue
        # Détection redirection vers login (cookie expiré / invalide)
        if 'connexion' in r.url.lower() or 'login' in r.url.lower():
            print(f'  [{tag}] ❌ Redirigé vers login — ton cookie a expiré, recommence la procédure.')
            return None
        body = r.text or ''
        if len(body) < 500:
            print(f'  [{tag}] body trop court ({len(body)} chars) on {url}', flush=True)
            continue
        # Sauvegarde brut pour debug
        ts = datetime.utcnow().strftime('%Y%m%d-%H%M%S')
        (RAW_DIR / f'{tag}_{ts}.html').write_text(body, encoding='utf-8')
        return url, body
    return None


def _decode_html_entities(s: str) -> str:
    """Décode les entités HTML courantes Winamax (&Eacute;, &eacute;, etc.)."""
    if not s: return s
    import html as _html
    return _html.unescape(s).strip()


def _extract_bets_from_html(html: str) -> list[dict]:
    """Parse le HTML de l'historique Paris Sportifs Winamax.

    Structure observée (audit 2026-04-25) :
      <tr><td>{REF}</td><td>{DATE_HHMMSS}</td><td>{Simple|Multiple|...}</td>
          <td>{Gagné|Perdu|...}</td><td>{stake_eur}</td><td>{gain_eur}</td></tr>
      <tr><td colspan="6" class="bet-detail">
          <div class="line {occured|not-occured}">
            <b>{Sport} - {Country} - {League} - </b>
            {Home} / {Away}
            <br/>R&eacute;sultat : {Pick}
          </div>
          [more legs...]
      </td></tr>
    """
    bets: list[dict] = []

    # Pattern : extraire chaque paire de <tr> (ligne synthèse + ligne details)
    # Le ref Winamax est ~8 chars alphanumériques majuscules (68RLU2K6, 68S8N7GJ…)
    bet_pattern = re.compile(
        r'<tr>\s*<td>([A-Z0-9]{6,12})</td>\s*'    # 1: ref
        r'<td>(\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}:\d{2})</td>\s*'  # 2: date
        r'<td>([^<]+)</td>\s*'                    # 3: type
        r'<td>([^<]+)</td>\s*'                    # 4: status (with trailing spaces)
        r'<td>([^<]+)</td>\s*'                    # 5: stake (eur)
        r'<td>([^<]+)</td>\s*</tr>\s*'            # 6: gain (eur)
        r'<tr>\s*<td\s+colspan="6"\s+class="bet-detail">(.*?)</td>\s*</tr>',  # 7: legs HTML
        re.DOTALL,
    )

    leg_pattern = re.compile(
        r'<div class="line ([^"]+)">'
        r'\s*<b>([^<]*?)</b>\s*'      # 2: "Sport - Country - League -"
        r'([^<]*?)<br/?>'              # 3: "Home / Away"
        r'\s*([^<]*?)</div>',          # 4: "Résultat : Pick" or "Vainqueur : Pick" etc.
        re.DOTALL,
    )

    def _parse_eur(s: str) -> float | None:
        if not s: return None
        s = s.strip().replace(',', '.').replace(' ', '').replace('€', '')
        try: return float(s)
        except (ValueError, TypeError): return None

    def _parse_date_fr(s: str) -> str | None:
        # "01/01/2026 12:56:09" -> ISO 8601
        m = re.match(r'(\d{2})/(\d{2})/(\d{4})\s+(\d{2}:\d{2}:\d{2})', s.strip())
        if not m: return None
        d, mo, y, t = m.groups()
        return f'{y}-{mo}-{d}T{t}'

    sport_em_map = {
        'football': 'football', 'basketball': 'basketball', 'tennis': 'tennis',
        'hockey sur glace': 'hockey', 'hockey': 'hockey', 'baseball': 'baseball',
        'rugby': 'rugby', 'volley': 'volleyball', 'football américain': 'american-football',
        'football americain': 'american-football', 'mma': 'mma', 'boxe': 'boxing',
    }

    for m in bet_pattern.finditer(html):
        ref, date_str, btype, status, stake, gain, legs_html = m.groups()
        legs = []
        for lm in leg_pattern.finditer(legs_html):
            outcome, hdr, teams, pick_line = lm.groups()
            hdr = _decode_html_entities(hdr).rstrip(' -').strip()
            teams = _decode_html_entities(teams).strip()
            pick_line = _decode_html_entities(pick_line).strip()
            # Parse "Sport - Country - League"
            parts = [p.strip() for p in hdr.split(' - ') if p.strip()]
            sport_name = parts[0] if parts else ''
            country = parts[1] if len(parts) > 1 else ''
            league = parts[2] if len(parts) > 2 else (parts[1] if len(parts) > 1 else '')
            sport_norm = sport_em_map.get(sport_name.lower(), sport_name.lower() or 'unknown')
            # Parse "Home / Away"
            home, away = '', ''
            if ' / ' in teams:
                home, _, away = teams.partition(' / ')
            event = teams or ''
            # Parse "Résultat : X" or "Vainqueur : X"
            pick = ''
            for prefix in ('Résultat :', 'Vainqueur :', 'Score exact :', 'Pari :'):
                if pick_line.startswith(prefix):
                    pick = pick_line[len(prefix):].strip()
                    break
            else:
                pick = pick_line
            legs.append({
                'event': event,
                'home': home.strip(),
                'away': away.strip(),
                'pick': pick,
                'sport': sport_norm,
                'country': country,
                'league': league,
                'won': outcome == 'occured',  # green tick = leg won
            })

        status_clean = _decode_html_entities(status).strip().lower()
        bet_status = (
            'won' if 'gagné' in status_clean or 'gagne' in status_clean
            else 'lost' if 'perdu' in status_clean
            else 'pending' if 'cours' in status_clean
            else 'void' if 'annul' in status_clean
            else 'pending'
        )
        type_clean = _decode_html_entities(btype).strip().lower()
        bet_type = (
            'combine' if 'multiple' in type_clean
            else 'systeme' if 'syst' in type_clean
            else 'single'
        )
        stake_f = _parse_eur(stake)
        gain_f = _parse_eur(gain)
        # Estimer la cote totale : gain / stake si gagné, sinon agrégat des legs
        odds = None
        if bet_status == 'won' and stake_f and gain_f and stake_f > 0:
            odds = round(gain_f / stake_f, 3)

        bets.append({
            'id': ref,
            'date': _parse_date_fr(date_str),
            'stake': stake_f,
            'odds': odds,
            'status': bet_status,
            'potential_gain': gain_f if bet_status in ('won', 'pending') else None,
            'actual_gain': gain_f if bet_status == 'won' else (0.0 if bet_status == 'lost' else None),
            'type': bet_type,
            'legs': legs,
            'currency': 'EUR',
        })

    return bets


def _normalize_bet_objects(objs: list[dict]) -> list[dict]:
    """Transforme la structure Winamax en notre format unifié."""
    out = []
    for o in objs:
        if not isinstance(o, dict):
            continue
        bet = {
            'id': str(o.get('id') or o.get('betId') or o.get('reference') or ''),
            'date': o.get('date') or o.get('placedAt') or o.get('createdAt'),
            'stake': _to_float(o.get('stake') or o.get('amount') or o.get('bet_amount')),
            'odds': _to_float(o.get('odds') or o.get('cote') or o.get('totalOdds')),
            'status': _normalize_status(o.get('status') or o.get('state') or o.get('result')),
            'potential_gain': _to_float(o.get('potentialGain') or o.get('potential_winnings')),
            'actual_gain': _to_float(o.get('gain') or o.get('winnings') or o.get('payout')),
            'type': _normalize_type(o.get('type') or o.get('betType') or ('combine' if isinstance(o.get('legs'), list) and len(o.get('legs')) > 1 else 'single')),
            'legs': _normalize_legs(o.get('legs') or o.get('selections') or []),
            'currency': o.get('currency') or 'EUR',
            'raw': o,
        }
        if bet['id'] or bet['stake']:
            out.append(bet)
    return out


def _normalize_status(s) -> str:
    if not s: return 'pending'
    s = str(s).lower()
    if any(k in s for k in ('won', 'gagn', 'win', 'paid', 'success')):
        return 'won'
    if any(k in s for k in ('lost', 'perdu', 'lose', 'losed')):
        return 'lost'
    if any(k in s for k in ('pending', 'en cours', 'open', 'live', 'placed')):
        return 'pending'
    if any(k in s for k in ('void', 'annul', 'cancel', 'refund')):
        return 'void'
    return 'pending'


def _normalize_type(s) -> str:
    if not s: return 'single'
    s = str(s).lower()
    if any(k in s for k in ('combi', 'multi', 'parlay', 'accumul')):
        return 'combine'
    if 'syst' in s: return 'systeme'
    return 'single'


def _normalize_legs(legs) -> list[dict]:
    out = []
    if not isinstance(legs, list): return out
    for l in legs:
        if not isinstance(l, dict): continue
        out.append({
            'event': l.get('event') or l.get('match') or l.get('eventName'),
            'pick': l.get('pick') or l.get('selection') or l.get('outcomeName'),
            'odds': _to_float(l.get('odds') or l.get('cote')),
            'sport': l.get('sport') or l.get('sportName'),
            'date': l.get('date') or l.get('eventDate'),
            'status': _normalize_status(l.get('status') or l.get('result')),
        })
    return out


def _to_float(v):
    if v is None: return None
    try:
        if isinstance(v, str):
            v = v.replace(',', '.').replace('€', '').replace(' ', '').strip()
        return float(v)
    except (TypeError, ValueError):
        return None


def _parse_bet_element(el):
    """Extrait un bet d'un élément HTML — best-effort, à adapter au DOM réel."""
    bet_id = el.get('data-bet-id') or el.get('id', '').replace('bet-', '')
    if not bet_id: return None
    txt = el.get_text(separator=' ', strip=True)
    # Cherche stake (montant en €)
    stake_m = re.search(r'(\d+[,.]?\d*)\s*€', txt)
    odds_m = re.search(r'(?:cote|odds?)[^\d]*(\d+[,.]?\d*)', txt, re.IGNORECASE)
    return {
        'id': bet_id,
        'stake': _to_float(stake_m.group(1)) if stake_m else None,
        'odds': _to_float(odds_m.group(1)) if odds_m else None,
        'raw_text': txt[:300],
    }


def _summarize(bets: list[dict], model_start_iso: str | None) -> dict:
    """Calcule des stats globales + filtrage 'depuis activation modèle'."""
    summary = {
        'total_bets': len(bets),
        'won': 0, 'lost': 0, 'pending': 0, 'void': 0,
        'total_stake': 0.0, 'total_gain': 0.0,
        'singles': 0, 'combines': 0, 'systemes': 0,
        'by_sport': {},
    }
    if model_start_iso:
        summary['since_model'] = {'won': 0, 'lost': 0, 'total_stake': 0.0, 'total_gain': 0.0, 'bets': 0}
    for b in bets:
        st = b.get('status', 'pending')
        summary[st] = summary.get(st, 0) + 1
        stake = _to_float(b.get('stake')) or 0
        gain = _to_float(b.get('actual_gain')) or 0
        summary['total_stake'] += stake
        if st == 'won':
            summary['total_gain'] += gain
        elif st == 'lost':
            summary['total_gain'] -= stake
        # Type
        t = b.get('type', 'single')
        summary[t + 's'] = summary.get(t + 's', 0) + 1
        # Sport
        sport = (b.get('legs') or [{}])[0].get('sport', 'unknown')
        summary['by_sport'][sport] = summary['by_sport'].get(sport, 0) + 1
        # Filtre "depuis activation modèle"
        if model_start_iso and b.get('date'):
            try:
                bd = b['date']
                if bd >= model_start_iso:
                    summary['since_model']['bets'] += 1
                    summary['since_model']['total_stake'] += stake
                    if st == 'won':
                        summary['since_model']['won'] += 1
                        summary['since_model']['total_gain'] += gain
                    elif st == 'lost':
                        summary['since_model']['lost'] += 1
                        summary['since_model']['total_gain'] -= stake
            except (TypeError, KeyError):
                pass
    if summary['total_stake'] > 0:
        summary['roi_pct'] = round(100 * summary['total_gain'] / summary['total_stake'], 2)
    if model_start_iso and summary.get('since_model', {}).get('total_stake', 0) > 0:
        sm = summary['since_model']
        sm['roi_pct'] = round(100 * sm['total_gain'] / sm['total_stake'], 2)
    return summary


def _refresh_cookie_jar(sess):
    """Apres chaque requete, le serveur Winamax renvoie de nouveaux cookies
    (Set-Cookie headers, ex AWSALB qui rotation 24h, PHPSESSIONID rafraichi
    server-side). curl_cffi met automatiquement à jour sess.cookies. On
    sérialise cet état frais dans .winamax_session pour que la prochaine
    exécution réutilise les cookies les plus à jour. Résultat : tant que
    le script tourne >= 1x par 30 jours, la session ne meurt jamais."""
    pairs = []
    seen_names = set()  # Garder le 1er trouvé par nom (le serveur peut renvoyer doublons par sous-domaine)
    # curl_cffi expose le sous-jacent http.cookiejar.CookieJar via .jar
    jar = getattr(sess.cookies, 'jar', None) or sess.cookies
    for c in jar:
        domain = getattr(c, 'domain', '') or ''
        if not domain.endswith('winamax.fr'):
            continue
        name = getattr(c, 'name', '') or ''
        value = getattr(c, 'value', '') or ''
        if not name or value is None:
            continue
        if name in seen_names:
            continue
        seen_names.add(name)
        pairs.append(f'{name}={value}')
    if pairs:
        new_header = '; '.join(pairs)
        try:
            COOKIE_FILE.write_text(new_header, encoding='utf-8')
            print(f'  cookie jar refreshed -> .winamax_session ({len(pairs)} cookies, {len(new_header)} chars)', flush=True)
        except Exception as e:
            print(f'  warn cookie persist: {e}', flush=True)


def _auto_commit_push(repo_root: Path):
    """Apres import reussi, commit + push winamax_my_bets.json sur la branche
    courante (qui est aussi la deploy branch GitHub Pages). Le serveur
    GitHub Pages se reconstruit automatiquement (~1 min) et la section
    'Mes paris Winamax' du Bilan reflete les derniers chiffres.

    Idempotent : si le fichier n'a pas change (pas de nouveaux paris depuis
    le dernier run), on skip silencieusement."""
    import subprocess
    try:
        # 1. Stage
        rc = subprocess.run(['git', '-C', str(repo_root), 'add', 'winamax_my_bets.json'],
                            capture_output=True, timeout=10).returncode
        if rc != 0:
            print('  git add failed', flush=True)
            return

        # 2. Check if there's actually a diff staged
        diff = subprocess.run(['git', '-C', str(repo_root), 'diff', '--cached', '--quiet', '--', 'winamax_my_bets.json'],
                              capture_output=True, timeout=10)
        if diff.returncode == 0:
            # Aucun changement — paris identiques au commit précédent
            print('  no change in winamax_my_bets.json, skip commit', flush=True)
            return

        # 3. Commit. On utilise --no-verify pour bypass les hooks (pas de
        # tests/lint nécessaires sur un fichier de données).
        ts = datetime.now().strftime('%Y-%m-%d %H:%M')
        msg = f'data: winamax bets auto-refresh {ts}'
        rc = subprocess.run(['git', '-C', str(repo_root), 'commit', '-m', msg],
                            capture_output=True, timeout=15).returncode
        if rc != 0:
            print(f'  git commit failed (rc={rc})', flush=True)
            return
        print(f'  ✓ committed: {msg}', flush=True)

        # 4. Push. On utilise `push origin HEAD` qui pousse vers une branche
        # remote du même nom que la branche locale (sans dépendre de l'upstream
        # config qui peut être tordue dans un worktree). Si quelqu'un d'autre
        # a push entre-temps (peu probable car seul ce script touche le
        # fichier), on tente un pull --rebase avant retry.
        push = subprocess.run(['git', '-C', str(repo_root), 'push', 'origin', 'HEAD'],
                              capture_output=True, timeout=30)
        if push.returncode == 0:
            print('  ✓ pushed to origin', flush=True)
            return
        # Retry après pull
        print(f'  push failed once ({push.stderr.decode("utf-8", errors="ignore")[:120]}), retry after pull --rebase…', flush=True)
        subprocess.run(['git', '-C', str(repo_root), 'pull', '--rebase', 'origin', 'HEAD'],
                       capture_output=True, timeout=30)
        push2 = subprocess.run(['git', '-C', str(repo_root), 'push', 'origin', 'HEAD'],
                               capture_output=True, timeout=30)
        if push2.returncode == 0:
            print('  ✓ pushed to origin (after rebase)', flush=True)
        else:
            print(f'  ✗ push still failed: {push2.stderr.decode("utf-8", errors="ignore")[:200]}', flush=True)
    except subprocess.TimeoutExpired:
        print('  auto-push timeout', flush=True)
    except Exception as e:
        print(f'  auto-push err: {e}', flush=True)


def main():
    _setup_logging()
    t0 = time.time()
    cookie = _read_cookie()
    sess = _build_session(cookie)

    # Récupérer model_start depuis localStorage si on a un sidecar — sinon None
    model_start = None
    settings_file = ROOT / 'winamax_settings.json'
    if settings_file.exists():
        try:
            ms = json.loads(settings_file.read_text(encoding='utf-8'))
            model_start = ms.get('model_start_date')
        except Exception:
            pass

    print(f'[winamax_import] [{datetime.now():%H:%M:%S}] starting (cookie len={len(cookie)})', flush=True)

    all_bets = []
    # Historique réglé — GET avec to_display=betting + range de date.
    # Le param magique pour Paris Sportifs est `to_display=betting`
    # (pas `bettingHistory` ni `sportbets` — confirmé via l'inspection des
    # tab links de la page elle-même, audit 2026-04-25).
    betting_url = (
        f'https://www.winamax.fr/account/history.php'
        f'?to_display=betting'
        f'&history_date_from_day={_year_start.day:02d}'
        f'&history_date_from_month={_year_start.month:02d}'
        f'&history_date_from_year={_year_start.year}'
        f'&history_date_to_day={_today.day:02d}'
        f'&history_date_to_month={_today.month:02d}'
        f'&history_date_to_year={_today.year}'
    )
    hist = _try_fetch(sess, [betting_url], 'history')
    if hist:
        url, html = hist
        bets = _extract_bets_from_html(html)
        print(f'  history: {len(bets)} bets parsed from {url}', flush=True)
        all_bets.extend(bets)
    else:
        print('  history: FAILED — vérifie cookie / URLs', flush=True)

    # Paris en cours
    pending = _try_fetch(sess, PENDING_URLS, 'pending')
    if pending:
        url, html = pending
        bets = _extract_bets_from_html(html)
        print(f'  pending: {len(bets)} bets parsed from {url}', flush=True)
        all_bets.extend(bets)

    # Dédup par id
    seen = set()
    deduped = []
    for b in all_bets:
        bid = b.get('id') or json.dumps(b, sort_keys=True)[:80]
        if bid in seen: continue
        seen.add(bid)
        deduped.append(b)

    summary = _summarize(deduped, model_start)
    out = {
        'imported_at': datetime.utcnow().isoformat() + 'Z',
        'model_start_date': model_start,
        'source': _COOKIE_SOURCE.get('name', 'unknown'),
        'bets': deduped,
        'summary': summary,
    }
    OUT_BETS.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')

    # v30 — Persiste les cookies frais retournés par le serveur Winamax
    # (chaque requête refresh la session côté serveur, AWSALB rotate 24h,
    # etc.). Tant que ce script tourne 6h auto, la session reste vivante
    # indéfiniment sans intervention manuelle.
    _refresh_cookie_jar(sess)

    # v30 — Auto-commit + push sur GitHub. Le site déployé reflète les
    # derniers paris dans la minute. Skip si aucun changement.
    if deduped:
        _auto_commit_push(ROOT)

    elapsed = time.time() - t0
    print(f'[winamax_import] [{datetime.now():%H:%M:%S}] done in {elapsed:.1f}s', flush=True)
    print(f'  → {len(deduped)} paris écrits dans {OUT_BETS.name}')
    print(f'  → {summary["won"]}W / {summary["lost"]}L / {summary["pending"]}P · ROI {summary.get("roi_pct", "n/a")}%')
    if not deduped:
        print('  ⚠️  AUCUN pari extrait — la structure Winamax a peut-être changé.')
        print(f'      HTML brut sauvegardé dans {RAW_DIR.name}/ pour adapter les sélecteurs.')


if __name__ == '__main__':
    main()

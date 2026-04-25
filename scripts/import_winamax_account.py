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
RAW_DIR = ROOT / '.winamax_raw'
RAW_DIR.mkdir(exist_ok=True)

# Endpoints à essayer dans l'ordre. Winamax les change parfois ; le
# script teste chacune et garde celle qui répond avec du contenu utile.
HISTORY_URLS = [
    'https://www.winamax.fr/account/history.php',
    'https://www.winamax.fr/account/history',
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
    if not COOKIE_FILE.exists():
        print(f'[winamax_import] ❌ Fichier cookie absent : {COOKIE_FILE}')
        print('[winamax_import]    Voir docstring du script pour la procédure.')
        sys.exit(2)
    raw = COOKIE_FILE.read_text(encoding='utf-8').strip()
    if not raw:
        print(f'[winamax_import] ❌ {COOKIE_FILE} est vide.')
        sys.exit(2)
    return raw


def _build_session(cookie_value: str):
    """Construit une session curl_cffi avec le cookie utilisateur."""
    sess = cr.Session(impersonate='chrome110')
    # Plusieurs noms possibles selon la version Winamax — on les met tous,
    # le serveur ignore ceux qu'il ne connaît pas.
    for cookie_name in ('API_SESS', 'API_SESS_PROFILE', 'PHPSESSID', 'sessionId'):
        sess.cookies.set(cookie_name, cookie_value, domain='.winamax.fr', path='/')
    sess.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    })
    return sess


def _try_fetch(sess, urls: list[str], tag: str) -> tuple[str, str] | None:
    """Tente chaque URL, garde la première qui répond avec du contenu non-trivial."""
    for url in urls:
        try:
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


def _extract_bets_from_html(html: str) -> list[dict]:
    """Parse le HTML d'une page d'historique Winamax pour extraire les paris.

    Comme Winamax change régulièrement sa structure, on essaie d'abord
    les sélecteurs les plus couramment vus, puis on tombe sur des
    heuristiques regex pour les champs essentiels (date, mise, gain,
    statut). Au pire on retourne une liste vide et le HTML brut sert
    pour adapter les sélecteurs."""
    bets: list[dict] = []
    if HAS_BS4:
        soup = BeautifulSoup(html, 'html.parser')
        # Stratégie 1 : Winamax embarque souvent les données dans un
        # __NEXT_DATA__ ou un JSON inline. On cherche d'abord ça.
        for script in soup.find_all('script'):
            txt = script.string or ''
            if not txt:
                continue
            # Cherche un objet "bets":[...] ou "history":[...]
            for key in ('"bets":', '"history":', '"transactions":', '"placedBets":'):
                if key in txt:
                    # Tente d'extraire l'array JSON
                    m = re.search(re.escape(key) + r'\s*(\[[\s\S]*?\])\s*[,}]', txt)
                    if m:
                        try:
                            parsed = json.loads(m.group(1))
                            if isinstance(parsed, list) and parsed:
                                bets.extend(_normalize_bet_objects(parsed))
                        except json.JSONDecodeError:
                            pass
        # Stratégie 2 : sélecteurs classiques
        if not bets:
            # Winamax utilise souvent des classes type "bet-row" / "history-row"
            for el in soup.select('.bet-row, .history-row, [data-bet-id]'):
                bet = _parse_bet_element(el)
                if bet:
                    bets.append(bet)
    if not bets:
        # Stratégie 3 : regex de secours sur les patterns connus
        for m in re.finditer(r'(?:data-bet-id|id="bet-|class="bet")\s*=\s*"([^"]+)"', html):
            bets.append({'id': m.group(1), '_raw': True})
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


def main():
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
    # Historique réglé
    hist = _try_fetch(sess, HISTORY_URLS, 'history')
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
        'bets': deduped,
        'summary': summary,
    }
    OUT_BETS.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')

    elapsed = time.time() - t0
    print(f'[winamax_import] [{datetime.now():%H:%M:%S}] done in {elapsed:.1f}s', flush=True)
    print(f'  → {len(deduped)} paris écrits dans {OUT_BETS.name}')
    print(f'  → {summary["won"]}W / {summary["lost"]}L / {summary["pending"]}P · ROI {summary.get("roi_pct", "n/a")}%')
    if not deduped:
        print('  ⚠️  AUCUN pari extrait — la structure Winamax a peut-être changé.')
        print(f'      HTML brut sauvegardé dans {RAW_DIR.name}/ pour adapter les sélecteurs.')


if __name__ == '__main__':
    main()

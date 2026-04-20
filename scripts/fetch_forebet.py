#!/usr/bin/env python3
"""Scrape forebet.com for today's football predictions + 1X2 odds.
Merges into data.js as a second tipster source."""
import json, re, urllib.request, unicodedata
from datetime import datetime, timedelta
from pathlib import Path
import html as htmllib

DATA_JS = Path(__file__).resolve().parent.parent / 'data.js'
HTML_PATH = Path(__file__).resolve().parent.parent / 'pronostics.html'
URL = 'https://www.forebet.com/en/football-tips-and-predictions-for-today'
H = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'}


def fetch(url):
    req = urllib.request.Request(url, headers=H)
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode('utf-8', errors='ignore')


def slug(s):
    if not s: return ''
    s = unicodedata.normalize('NFD', s).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]', ' ', s).strip()


ALIASES = {
    'man utd': 'manchester united', 'man united': 'manchester united',
    'man city': 'manchester city', 'tottenham': 'tottenham hotspur',
    'inter': 'inter milan', 'milan': 'ac milan', 'atalanta': 'atalanta',
    'psg': 'paris saint germain', 'paris sg': 'paris saint germain',
    'marseille': 'marseille', 'om': 'marseille',
    'leverkusen': 'bayer leverkusen', 'dortmund': 'borussia dortmund',
    'frankfurt': 'eintracht frankfurt', 'union berlin': '1 fc union berlin',
    'leipzig': 'rb leipzig', 'wolverhampton': 'wolverhampton wanderers',
    'newcastle': 'newcastle united', 'bournemouth': 'afc bournemouth',
    'brighton': 'brighton hove albion', 'roma': 'as roma',
}


def normalize(n):
    s = slug(n)
    for k, v in ALIASES.items():
        s = re.sub(r'\b' + re.escape(k) + r'\b', v, s)
    # Strip common suffixes
    s = re.sub(r'\b(fc|cf|sc|ac|hsv|fk|sk|bk|if|cd)\b', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def tokens(n):
    return set(t for t in normalize(n).split() if len(t) > 2)


def parse_forebet(html):
    """Yield prediction dicts parsed from forebet page."""
    parts = re.split(r"<div class='rcnt tr_", html)
    out = []
    for part in parts[1:]:
        # Team names
        hm = re.search(r'<span itemprop="name">([^<]+)</span></span>\s*<span class="awayTeam"', part)
        am = re.search(r'<span class="awayTeam"[^>]*>.*?<span itemprop="name">([^<]+)</span>', part, re.DOTALL)
        if not hm or not am: continue
        home = htmllib.unescape(hm.group(1).strip())
        away = htmllib.unescape(am.group(1).strip())
        # League abbrev
        lg = re.search(r"class='flsc'[^>]*?\.png'?/?>\s*<span class=\"shortTag\">([^<]+)</span>", part)
        league_tag = lg.group(1).strip() if lg else None
        # Prediction (1/X/2)
        pm = re.search(r'<div class="predict"><span class="forepr"><span>([12X])</span></span>', part)
        if not pm: continue
        pick_key = pm.group(1)
        # Confidence percentages 1, X, 2
        pcts = re.findall(r"<div class='fprc'><span>(\d+)</span><span class=\"fpr\">(\d+)</span><span>(\d+)</span>", part)
        conf = None
        if pcts:
            p1, pX, p2 = [int(x) for x in pcts[0]]
            conf = {'1': p1, 'X': pX, '2': p2}.get(pick_key)
        # Odds (home, draw, away)
        om = re.search(r'<div class="haodd">\s*<span>([\d\.]+)</span>\s*<span>([\d\.]+)</span>\s*<span>([\d\.]+)</span>', part)
        odds = None
        if om:
            try:
                odds = {'home': float(om.group(1)), 'draw': float(om.group(2)), 'away': float(om.group(3))}
            except: pass
        # Predicted score
        sm = re.search(r'<span class="scrmobpred ex_sc">(\d+)<span class="scrmobpreddash">-</span>(\d+)</span>', part)
        pred_score = None
        if sm:
            pred_score = f'{sm.group(1)}-{sm.group(2)}'
        # Start time
        tm = re.search(r'<span class="date_bah">(\d{2}/\d{2}/\d{4} \d{2}:\d{2})</span>', part)
        when = tm.group(1) if tm else None
        out.append({
            'home': home, 'away': away, 'league_tag': league_tag,
            'pick': pick_key, 'conf_pct': conf, 'odds': odds,
            'predicted_score': pred_score, 'when': when,
        })
    return out


def pick_label(home, away, pick_key):
    if pick_key == '1': return f'Victoire {home}'
    if pick_key == '2': return f'Victoire {away}'
    return 'Match nul'


def match_to_event(fb, events):
    h_tok = tokens(fb['home'])
    a_tok = tokens(fb['away'])
    best = None; best_score = 0
    for e in events:
        if e.get('sport') != 'football': continue
        comps = e.get('competitors') or []
        home = next((c for c in comps if c.get('home_away')=='home'), comps[0] if comps else {})
        away = next((c for c in comps if c.get('home_away')=='away'), comps[1] if len(comps)>1 else {})
        eh = tokens(home.get('name',''))
        ea = tokens(away.get('name',''))
        s = 0
        if h_tok & eh: s += 2
        if a_tok & ea: s += 2
        if (h_tok & eh) and (a_tok & ea): s += 3
        # Penalize if teams swapped (home<->away crossover)
        if (h_tok & ea) and (a_tok & eh) and s < 4: s = 0
        if s > best_score:
            best_score = s
            best = e
    return (best, best_score) if best_score >= 4 else (None, 0)


def main():
    text = DATA_JS.read_text(encoding='utf-8')
    data = json.loads(re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL).group(1))
    # Forebet publishes predictions for today + next ~2 days. Search the full window.
    today = data.get('today') or datetime.utcnow().strftime('%Y-%m-%d')
    try:
        base = datetime.strptime(today, '%Y-%m-%d').date()
        day_keys = [(base + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(3)]
    except Exception:
        day_keys = [today]
    events = []
    for dk in day_keys:
        events.extend(data.get('days', {}).get(dk, []))
    print(f'Searching {len(events)} events across {day_keys}')

    print('Fetching forebet...')
    html = fetch(URL)
    preds = parse_forebet(html)
    print(f'Parsed {len(preds)} forebet predictions')

    attached = 0
    for fb in preds:
        ev, score = match_to_event(fb, events)
        if not ev: continue
        # Build pick label
        comps = ev.get('competitors') or []
        home = next((c for c in comps if c.get('home_away')=='home'), comps[0] if comps else {})
        away = next((c for c in comps if c.get('home_away')=='away'), comps[1] if len(comps)>1 else {})
        tip_pick = pick_label(home.get('name','?'), away.get('name','?'), fb['pick'])
        tip_odds = None
        if fb['odds']:
            tip_odds = fb['odds']['home'] if fb['pick']=='1' else (fb['odds']['away'] if fb['pick']=='2' else fb['odds']['draw'])
        analysis = None
        if fb['predicted_score']:
            analysis = f"Score prédit {fb['predicted_score']}"
            if fb['conf_pct']:
                analysis += f" · confiance {fb['conf_pct']}% sur {fb['pick']}"
        tip = {
            'source': 'forebet',
            'url': f'https://www.forebet.com/en/football-tips-and-predictions-for-today',
            'pick': tip_pick,
            'odds': tip_odds,
            'all_picks': [{'label': tip_pick, 'odds': tip_odds}] if tip_odds else [],
            'analysis': analysis,
        }
        # Avoid duplicating a forebet tip we already attached
        existing_srcs = [t.get('source') for t in (ev.get('tips') or [])]
        if 'forebet' in existing_srcs:
            continue
        ev.setdefault('tips', []).append(tip)
        attached += 1

    print(f'Attached {attached} forebet tips')

    # Also attach odds from forebet to events lacking them
    odds_added = 0
    for fb in preds:
        if not fb['odds']: continue
        ev, _ = match_to_event(fb, events)
        if not ev: continue
        # If no ML odds yet, synthesize one from forebet decimals
        has_full = any(
            (o.get('homeML') is not None and o.get('awayML') is not None)
            for o in (ev.get('odds') or [])
        )
        if has_full: continue
        def dec_to_ml(d):
            if not d or d <= 1: return None
            return round((d-1)*100) if d >= 2 else round(-100/(d-1))
        ev.setdefault('odds', []).append({
            'provider': 'Forebet',
            'details': None,
            'overUnder': None, 'spread': None,
            'homeML': dec_to_ml(fb['odds']['home']),
            'awayML': dec_to_ml(fb['odds']['away']),
            'drawML': dec_to_ml(fb['odds']['draw']),
            'homeFav': None, 'awayFav': None,
        })
        odds_added += 1
    print(f'Added forebet odds to {odds_added} events')

    # Save back
    payload = json.dumps(data, ensure_ascii=False, separators=(',',':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')
    html_text = HTML_PATH.read_text(encoding='utf-8')
    new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload};\n</script>'
    if '<script src="data.js"></script>' in html_text:
        html_text = html_text.replace('<script src="data.js"></script>', new_block, 1)
    else:
        html_text = re.sub(r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
                           new_block, html_text, count=1, flags=re.DOTALL)
    HTML_PATH.write_text(html_text, encoding='utf-8')
    print(f'data.js: {DATA_JS.stat().st_size/1024:.1f} KB, html: {HTML_PATH.stat().st_size/1024:.1f} KB')


if __name__ == '__main__':
    main()

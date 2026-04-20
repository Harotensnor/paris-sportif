#!/usr/bin/env python3
"""Fetch tipster predictions from ruedesjoueurs and merge into data.js."""
import json
import re
import urllib.request
import html as htmllib
import unicodedata
import concurrent.futures
from datetime import datetime, timedelta
from pathlib import Path

DATA_JS = Path(__file__).resolve().parent.parent / 'data.js'
TIPS_JS = Path(__file__).resolve().parent.parent / 'tips.js'

HEADERS = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'}


def fetch(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode('utf-8', errors='ignore')


def clean(html):
    t = re.sub(r'<[^>]+>', ' ', html)
    t = htmllib.unescape(t)
    t = re.sub(r'\s+', ' ', t)
    return t.strip()


def slugify(s):
    if not s: return ''
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()
    s = s.lower()
    # common normalizations for team names
    s = re.sub(r"[\-'\.]", ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def list_rdj_matches():
    """Get today's match prediction URLs from ruedesjoueurs via the AJAX endpoint."""
    url = 'https://www.ruedesjoueurs.com/?option=com_ajax&module=menusport&format=raw&nb_matchs_une=50'
    html = fetch(url)
    pairs = re.findall(r'<a[^>]+href="(/pronostic/[^"]+-\d+\.html)"[^>]*>(.*?)</a>', html, re.DOTALL)
    result = []
    for href, inner in pairs:
        label = clean(inner)
        if not label or 'pronostic' in label.lower():
            continue
        result.append({'url': 'https://www.ruedesjoueurs.com' + href, 'label': label})
    return result


def parse_rdj_page(url):
    """Return {teams, competition, date, pick, odds, picks_all, analysis, source}."""
    try:
        raw = fetch(url)
    except Exception as e:
        return None
    text = clean(raw)

    title_m = re.search(r'<title>Pronostic\s+(.+?)\s+GRATUIT\s+-\s+(.+?)\s+(\d{2}/\d{2}/\d{4})', raw)
    if not title_m:
        return None
    teams = title_m.group(1).strip()
    comp = title_m.group(2).strip()
    date = title_m.group(3).strip()

    pick_m = re.search(r'Misez par exemple sur le pari\s*"([^"]+)"\s*\(cote\s*à\s*([\d,\.]+)', text)
    main_pick = None
    if pick_m:
        main_pick = {'label': pick_m.group(1).strip(), 'odds': float(pick_m.group(2).replace(',', '.'))}

    # All picks mentioned on the page
    all_picks = [
        {'label': lbl.strip(), 'odds': float(o.replace(',', '.'))}
        for lbl, o in re.findall(r'Misez\s+(?:par\s+exemple\s+)?sur le pari\s*"([^"]+)"\s*\(cote\s*à\s*([\d,\.]+)', text)
    ]

    # Short analysis paragraph: between "Pronostics 1N2 du match X" and "Notre pronostic gratuit"
    analysis = None
    am = re.search(r'Pronostics 1N2 du match [^\.]+?\.\s*(.{50,600}?)(?:Notre pronostic gratuit|Misez par exemple|$)', text)
    if am:
        analysis = am.group(1).strip()
        analysis = re.sub(r'\s+', ' ', analysis)
        if len(analysis) > 400:
            analysis = analysis[:400].rsplit(' ', 1)[0] + '…'

    # Try: the "Notre pronostic" sentence often contains the simplified label too
    return {
        'source': 'ruedesjoueurs',
        'source_url': url,
        'teams': teams,
        'competition': comp,
        'date': date,
        'pick': main_pick,
        'all_picks': all_picks,
        'analysis': analysis,
    }


def load_data_js():
    """Parse data.js (assignment to window.PRONOSTICS_DATA) and return the JSON object."""
    text = DATA_JS.read_text(encoding='utf-8')
    # Strip assignment prefix
    m = re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL)
    if not m:
        raise RuntimeError('Could not parse data.js')
    return json.loads(m.group(1))


def save_data_js(data):
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')
    # Also re-inline into pronostics.html so the file stays self-contained.
    html_path = Path(__file__).resolve().parent.parent / 'pronostics.html'
    if html_path.exists():
        html = html_path.read_text(encoding='utf-8')
        # Replace any inline window.PRONOSTICS_DATA block OR external src
        new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload};\n</script>'
        # Pattern 1: external <script src="data.js"></script>
        if '<script src="data.js"></script>' in html:
            html = html.replace('<script src="data.js"></script>', new_block, 1)
        else:
            # Pattern 2: replace existing inline block
            html = re.sub(
                r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
                new_block,
                html,
                count=1,
                flags=re.DOTALL,
            )
        html_path.write_text(html, encoding='utf-8')
        print(f'Re-inlined into pronostics.html ({html_path.stat().st_size/1024:.1f} KB)')


def name_tokens(n):
    return set(re.findall(r'[a-z0-9]+', slugify(n)))


# Short-form mappings for team names that often differ between ESPN and tipster sites
SHORT_MAP = {
    'om': 'marseille',
    'psg': 'paris saint germain',
    'asse': 'saint etienne',
    'mu': 'manchester united',
    'manu': 'manchester united',
    'mcu': 'manchester united',
    'united': 'manchester united',  # ambiguous, relies on other token
    'leverkusen': 'bayer leverkusen',
    'dortmund': 'borussia dortmund',
    'frankfurt': 'eintracht frankfurt',
    'union berlin': '1 fc union berlin',
    'leipzig': 'rb leipzig',
    'wolves': 'wolverhampton',
    'spurs': 'tottenham',
    'brighton': 'brighton hove albion',
    'newcastle': 'newcastle united',
    'bournemouth': 'afc bournemouth',
    'leeds': 'leeds united',
}


def normalize_name(n):
    s = slugify(n)
    # Drop common suffixes
    for suf in [' fc', ' cf', ' sc', ' ac', ' hsv', ' fk', ' sk']:
        s = re.sub(suf + r'\b', '', s)
    return s


ALIASES = {
    'om': 'marseille',
    'psg': 'paris saint germain',
    'asse': 'saint etienne',
    'st etienne': 'saint etienne',
    'mu': 'manchester united',
    'manu': 'manchester united',
    'ol': 'lyon',
    'asm': 'monaco',
    'saint-etienne': 'saint etienne',
    'atletico': 'atletico madrid',
    'atm': 'atletico madrid',
}


def expand_aliases(s):
    for k, v in ALIASES.items():
        s = re.sub(r'\b' + re.escape(k) + r'\b', v, s)
    return s


def tokens(n):
    s = normalize_name(n)
    s = expand_aliases(s)
    return set(t for t in s.split() if len(t) > 1)


def match_teams(home_name, away_name, label):
    """Return score for how well label matches these teams."""
    lab_tokens = tokens(label)
    h_tokens = tokens(home_name or '')
    a_tokens = tokens(away_name or '')
    score = 0
    if h_tokens & lab_tokens: score += 2
    if a_tokens & lab_tokens: score += 2
    # bonus: both matched
    if (h_tokens & lab_tokens) and (a_tokens & lab_tokens): score += 3
    return score


def main():
    print('Loading data.js...')
    data = load_data_js()

    print('Fetching ruedesjoueurs match list...')
    listings = list_rdj_matches()
    print(f'  -> {len(listings)} matches listed')

    print('Fetching individual predictions...')
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
        tips = list(ex.map(lambda x: (x, parse_rdj_page(x['url'])), listings))

    parsed = [t for _, t in tips if t]
    print(f'  -> {len(parsed)} tips parsed')
    for t in parsed:
        pick_str = f"{t['pick']['label']} @ {t['pick']['odds']}" if t['pick'] else 'no pick'
        print(f"    [{t['competition']}] {t['teams']}: {pick_str}")

    # Match tips to events — search today + next 2 days (RdJ publishes ahead)
    # and across ALL sports (RdJ covers football, basket, tennis, etc.)
    today = data.get('today') or datetime.utcnow().strftime('%Y-%m-%d')
    try:
        base = datetime.strptime(today, '%Y-%m-%d').date()
        day_keys = [(base + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(3)]
    except Exception:
        day_keys = [today]
    events = []
    for dk in day_keys:
        events.extend(data.get('days', {}).get(dk, []))
    print(f'\nMatching against {len(events)} events across {day_keys}...')
    attached = 0
    for tip in parsed:
        # Parse label like "Chelsea Manchester United" or "Lorient OM"
        best_score = 0
        best_event = None
        for e in events:
            comps = e.get('competitors', []) or []
            home = next((c for c in comps if c.get('home_away') == 'home'), comps[0] if comps else {})
            away = next((c for c in comps if c.get('home_away') == 'away'), comps[1] if len(comps) > 1 else {})
            hn, an = home.get('name') or '', away.get('name') or ''
            score = match_teams(hn, an, tip['teams'])
            if score > best_score:
                best_score = score
                best_event = e
        if best_event and best_score >= 5:
            new_tip = {
                'source': tip['source'],
                'url': tip['source_url'],
                'pick': tip['pick']['label'] if tip['pick'] else None,
                'odds': tip['pick']['odds'] if tip['pick'] else None,
                'all_picks': tip['all_picks'],
                'analysis': tip['analysis'],
            }
            # Dedupe: replace existing RdJ tip (same source + same url) rather than stacking
            existing = best_event.get('tips') or []
            existing = [t for t in existing if not (t.get('source') == tip['source'] and t.get('url') == tip['source_url'])]
            existing.append(new_tip)
            best_event['tips'] = existing
            attached += 1
            comps = best_event.get('competitors', [])
            names = ' vs '.join(c.get('name','?') for c in comps[:2])
            print(f"  ✓ {tip['teams']} → {names} (score {best_score})")
        else:
            print(f"  ✗ {tip['teams']} (no match, best score {best_score})")

    print(f'\nAttached {attached}/{len(parsed)} tips.')

    # Save back
    save_data_js(data)
    print(f'Saved to {DATA_JS} ({DATA_JS.stat().st_size/1024:.1f} KB)')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Scrape Russian Premier League odds from betexplorer.com.

ESPN doesn't expose moneylines for rus.1 matches. BetExplorer lists the
league fixtures with 1X2 odds embedded as <button data-odd="..."> inside
`<td class="table-main__odds">` cells.

Output: attach synthetic odds entries to rus.1 events in data.js / pronostics.html.
Usage: python3 fetch_rus_odds.py
"""
import json, re, time, unicodedata, urllib.request, ssl
from pathlib import Path
from datetime import datetime

DATA_JS = Path(__file__).resolve().parent.parent / 'data.js'
HTML = Path(__file__).resolve().parent.parent / 'pronostics.html'

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE

# BetExplorer aliases for common Russian clubs that differ from ESPN's naming
NAME_ALIASES = {
    'zenit': 'zenitstpetersburg',
    'baltika': 'fcbaltikakaliningrad',
    'parinn': 'parinizhnynovgorod',
    'krylyasovetov': 'krylyasovetovsamara',
    'sochi': 'pfcsochi',
    'akron': 'akrontogliatti',
}


def http_get(url, timeout=20):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en;q=0.9'})
    return urllib.request.urlopen(req, timeout=timeout, context=CTX).read().decode('utf-8', 'ignore')


def norm(s):
    if not s:
        return ''
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]', '', s.lower())


def dec_to_ml(dec):
    if not dec or dec <= 1:
        return None
    if dec >= 2:
        return round((dec - 1) * 100)
    return round(-100 / (dec - 1))


def fetch_rus_fixtures():
    """Return list of {home, away, odd_home, odd_draw, odd_away, time_label}."""
    html = http_get('https://www.betexplorer.com/soccer/russia/premier-league/')
    # Each fixture row:
    #   <a ... class="in-match"><span>Home</span> - <span>Away</span></a> ...
    #   three <td class="table-main__odds"><button ... data-odd="X.XX">...
    # followed by <td ... >Today HH:MM</td> or a date.
    pattern = re.compile(
        r'class="in-match"><span>([^<]+)</span>\s*-\s*<span>([^<]+)</span></a>'
        r'[\s\S]{0,2000}?'
        r'<td class="table-main__odds[^"]*"[^>]*>\s*<button[^>]*data-odd="([\d.]+)"[\s\S]*?'
        r'<td class="table-main__odds[^"]*"[^>]*>\s*<button[^>]*data-odd="([\d.]+)"[\s\S]*?'
        r'<td class="table-main__odds[^"]*"[^>]*>\s*<button[^>]*data-odd="([\d.]+)"[\s\S]*?'
        r'<td class="h-text-right"[^>]*>([^<]+)</td>'
    )
    out = []
    for m in pattern.finditer(html):
        home, away, oh, od, oa, when = m.groups()
        try:
            oh = float(oh); od = float(od); oa = float(oa)
        except ValueError:
            continue
        if oh <= 1.0 or od <= 1.0 or oa <= 1.0:
            continue
        out.append({
            'home': home.strip(),
            'away': away.strip(),
            'odd_home': oh,
            'odd_draw': od,
            'odd_away': oa,
            'time_label': when.strip(),
        })
    return out


def name_match(scraped, espn):
    """Return True if scraped team name matches ESPN team name (either direction)."""
    a = norm(scraped)
    b = norm(espn)
    if not a or not b:
        return False
    if a == b:
        return True
    # Alias lookup
    a_al = NAME_ALIASES.get(a, a)
    b_al = NAME_ALIASES.get(b, b)
    if a_al == b_al:
        return True
    # Partial: one contains the other (after stripping common suffixes)
    if a in b or b in a:
        return True
    # Strip "fc" prefix or "moscow" suffix
    a2 = re.sub(r'^fc|moscow$|kaliningrad$|stpetersburg$|samara$|grozny$|togliatti$|nizhnynovgorod$|makhachkala$|kazan$', '', a)
    b2 = re.sub(r'^fc|moscow$|kaliningrad$|stpetersburg$|samara$|grozny$|togliatti$|nizhnynovgorod$|makhachkala$|kazan$', '', b)
    if a2 and b2 and (a2 == b2 or a2 in b2 or b2 in a2):
        return True
    return False


def match_fixture(event, fixtures):
    comps = event.get('competitors') or []
    if len(comps) < 2:
        return None
    home = next((c for c in comps if c.get('home_away') == 'home'), comps[0])
    away = next((c for c in comps if c.get('home_away') == 'away'), comps[1])
    hn = home.get('name', '')
    an = away.get('name', '')
    for f in fixtures:
        if name_match(f['home'], hn) and name_match(f['away'], an):
            return (f, False)
        if name_match(f['home'], an) and name_match(f['away'], hn):
            return (f, True)
    return None


def attach_odds(events, fixtures):
    filled = 0
    for ev in events:
        if ev.get('league_code') != 'rus.1':
            continue
        if ev.get('completed') or ev.get('status') == 'STATUS_IN_PROGRESS':
            continue
        if any(o.get('homeML') and o.get('awayML') for o in ev.get('odds') or []):
            continue
        res = match_fixture(ev, fixtures)
        if not res:
            continue
        fx, flipped = res
        if flipped:
            dec_h, dec_a = fx['odd_away'], fx['odd_home']
        else:
            dec_h, dec_a = fx['odd_home'], fx['odd_away']
        dec_d = fx['odd_draw']
        ml_h = dec_to_ml(dec_h)
        ml_a = dec_to_ml(dec_a)
        ml_d = dec_to_ml(dec_d)
        if ml_h is None or ml_a is None:
            continue
        ev.setdefault('odds', []).append({
            'provider': 'BetExplorer',
            'details': None,
            'homeML': ml_h,
            'awayML': ml_a,
            'drawML': ml_d,
            'overUnder': None,
            'spread': None,
        })
        filled += 1
    return filled


def main():
    t0 = time.time()
    print(f'[{datetime.now():%H:%M:%S}] Russian football odds scrape')
    try:
        fixtures = fetch_rus_fixtures()
        print(f'  {len(fixtures)} fixtures parsed from betexplorer')
    except Exception as e:
        print(f'  ERROR: {e}')
        return 0

    if not fixtures:
        return 0

    text = DATA_JS.read_text(encoding='utf-8')
    data = json.loads(re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL).group(1))

    total_filled = 0
    for day, events in data.get('days', {}).items():
        total_filled += attach_odds(events, fixtures)
    print(f'  attached to {total_filled} rus.1 events')

    if total_filled:
        payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')
        html_text = HTML.read_text(encoding='utf-8')
        new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload};\n</script>'
        html_text = re.sub(r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
                           new_block, html_text, count=1, flags=re.DOTALL)
        HTML.write_text(html_text, encoding='utf-8')

    print(f'[{datetime.now():%H:%M:%S}] Done in {time.time()-t0:.1f}s')
    return total_filled


if __name__ == '__main__':
    main()

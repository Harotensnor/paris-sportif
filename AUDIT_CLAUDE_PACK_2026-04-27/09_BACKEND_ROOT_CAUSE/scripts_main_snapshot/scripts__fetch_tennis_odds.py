#!/usr/bin/env python3
"""Scrape tennis odds from tennisexplorer.com and attach to ESPN tennis events.

ESPN's scoreboard for ATP/WTA doesn't include moneyline. Tennis Explorer has
decimal odds for most ATP/WTA main draw + challenger matches. We parse them and
match by player name (last name + first initial).

Output: writes into data.js / pronostics.html with synthetic odds[] entries
for each matched tennis event.

Usage: python3 fetch_tennis_odds.py
"""
import json, re, time, unicodedata, urllib.request, ssl
from pathlib import Path
from datetime import datetime, date

DATA_JS = Path(__file__).resolve().parent.parent / 'data.js'
HTML = Path(__file__).resolve().parent.parent / 'pronostics.html'

UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def http_get(url, timeout=20):
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en;q=0.9'})
    return urllib.request.urlopen(req, timeout=timeout, context=CTX).read().decode('utf-8', 'ignore')


def norm(s):
    if not s:
        return ''
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z]', '', s.lower())


def player_keys(name):
    """Return a list of candidate (last, initial) keys for a player name.
    We emit several candidates because the 'last name' may be the first or
    last token (Chinese order), and ESPN sometimes includes middle names
    that TE omits.
    Examples:
      'Rublev A.' -> [('rublev','a')]
      'Lingua Lavallen A.' -> [('lingualavallen','a'), ('lavallen','a')]
      'Andrey Rublev' -> [('rublev','a'), ('andrey','r')]
      'Yuan Yue' -> [('yue','y'), ('yuan','y')]
      'Carol Young Suh Lee' -> [('youngsuhlee','c'), ('lee','c')]
      'TBD' -> []
    """
    if not name:
        return []
    s = name.strip()
    if s.upper() == 'TBD':
        return []
    # 'Rublev A.' or 'Lingua Lavallen A.' format: trailing ' X.'
    m = re.match(r'^(.*?)\s+([A-Za-z])\.$', s)
    if m:
        lastpart = m.group(1)
        init = m.group(2).lower()
        cands = [(norm(lastpart), init)]
        toks = [t for t in re.split(r'\s+', lastpart) if t]
        if len(toks) > 1:
            cands.append((norm(toks[-1]), init))
        return cands
    toks = [t for t in re.split(r'\s+', s) if t]
    if not toks:
        return []
    if len(toks) == 1:
        return [(norm(toks[0]), '')]
    # Natural Western order: First ... Last → initial=first[0], last=toks[-1]
    # Also emit: initial=last[0], last=toks[0] (Chinese/Asian order fallback)
    # Also emit: whole-tail-joined variant so 'Carol Young Suh Lee' still works as ('youngsuhlee','c')
    first_init = norm(toks[0])[:1]
    last_token = norm(toks[-1])
    first_token = norm(toks[0])
    tail_joined = norm(' '.join(toks[1:]))
    cands = [(last_token, first_init)]
    if tail_joined != last_token:
        cands.append((tail_joined, first_init))
    # reversed interpretation (for "Yuan Yue" style)
    if len(toks) >= 2:
        last_as_first = norm(toks[-1])[:1]
        cands.append((first_token, last_as_first))
    # dedup
    seen = set()
    out = []
    for k in cands:
        if k in seen: continue
        seen.add(k); out.append(k)
    return out


def fetch_tennisexplorer(feed):
    """feed: 'atp-single', 'wta-single', or 'all' (default view — combined)."""
    if feed == 'all':
        url = 'https://www.tennisexplorer.com/matches/'
    else:
        url = f'https://www.tennisexplorer.com/matches/?type={feed}'
    html = http_get(url)
    # Each match = two <tr id="rN..."> rows (first has time+odds, second has partner player)
    rows = re.findall(r'<tr id="r(\d+)(b?)"[^>]*>(.*?)</tr>', html, re.DOTALL)
    matches = {}
    for rid, suffix, body in rows:
        matches.setdefault(rid, {'a': None, 'b': None})
        matches[rid]['b' if suffix else 'a'] = body

    out = []
    for rid, sides in matches.items():
        a = sides.get('a')
        b = sides.get('b')
        if not a or not b:
            continue
        # Player names
        pa = re.search(r'/player/[^/]+/">([^<]+)</a>', a)
        pb = re.search(r'/player/[^/]+/">([^<]+)</a>', b)
        if not pa or not pb:
            continue
        # Time (HH:MM)
        tm = re.search(r'<td class="first time"[^>]*>\s*(\d{1,2}:\d{2})', a)
        # Odds: two <td class="course"> (or "coursew" for fav) with rowspan=2, numeric
        courses = re.findall(r'<td class="(?:coursew|course)"[^>]*rowspan="2"[^>]*>([\d.]+)</td>', a)
        if len(courses) < 2:
            continue
        try:
            odd_a = float(courses[0])
            odd_b = float(courses[1])
        except ValueError:
            continue
        if odd_a <= 1.0 or odd_b <= 1.0:
            continue
        out.append({
            'match_id': rid,
            'time': tm.group(1) if tm else None,
            'home_name': pa.group(1).strip(),
            'away_name': pb.group(1).strip(),
            'odd_home': odd_a,
            'odd_away': odd_b,
            'feed': feed,
        })
    return out


def dec_to_ml(dec):
    if not dec or dec <= 1:
        return None
    if dec >= 2:
        return round((dec - 1) * 100)
    return round(-100 / (dec - 1))


def _key_match(k1, k2):
    """Two (last, init) keys match if last names match and initials are compatible."""
    if not k1 or not k2:
        return False
    if k1[0] != k2[0]:
        return False
    # If either initial is empty, accept the match (benefit of the doubt for single-token names)
    if not k1[1] or not k2[1]:
        return True
    return k1[1] == k2[1]


def _any_match(keys1, keys2):
    """Return True if any candidate key in keys1 matches any candidate in keys2."""
    for a in keys1:
        for b in keys2:
            if _key_match(a, b):
                return True
    return False


def match_event_to_odds(event, odds_rows):
    """Find best row from odds_rows that matches this ESPN event."""
    comps = event.get('competitors') or []
    if len(comps) < 2:
        return None
    home = next((c for c in comps if c.get('home_away') == 'home'), comps[0])
    away = next((c for c in comps if c.get('home_away') == 'away'), comps[1])
    hks = player_keys(home.get('name'))
    aks = player_keys(away.get('name'))
    if not hks or not aks:
        return None
    for row in odds_rows:
        rhs = player_keys(row['home_name'])
        ras = player_keys(row['away_name'])
        if not rhs or not ras:
            continue
        # Direct order match
        if _any_match(rhs, hks) and _any_match(ras, aks):
            return (row, False)
        # Reversed order
        if _any_match(rhs, aks) and _any_match(ras, hks):
            return (row, True)
    return None


def attach_odds(events, odds_rows):
    """For each tennis event without ML, attach synthetic odds row."""
    filled = 0
    for ev in events:
        if ev.get('sport') != 'tennis' or ev.get('completed'):
            continue
        # Already has ML?
        odds = ev.get('odds') or []
        if any(o.get('homeML') and o.get('awayML') for o in odds):
            continue
        res = match_event_to_odds(ev, odds_rows)
        if not res:
            continue
        row, flipped = res
        if flipped:
            dec_h, dec_a = row['odd_away'], row['odd_home']
        else:
            dec_h, dec_a = row['odd_home'], row['odd_away']
        ml_h = dec_to_ml(dec_h)
        ml_a = dec_to_ml(dec_a)
        if ml_h is None or ml_a is None:
            continue
        # Inject as a new odds provider entry
        ev.setdefault('odds', []).append({
            'provider': 'TennisExplorer',
            'details': None,
            'homeML': ml_h,
            'awayML': ml_a,
            'drawML': None,
            'overUnder': None,
            'spread': None,
        })
        filled += 1
    return filled


def main():
    t0 = time.time()
    print(f'[{datetime.now():%H:%M:%S}] Tennis odds scrape')

    all_rows = []
    # TE match_ids are per-feed (wta-single and atp-single both start at 10, 11, 12…),
    # so we cannot dedup by match_id across feeds. Instead dedup by normalized player
    # pair → the first occurrence wins, subsequent duplicates are dropped.
    feeds = ['atp-single', 'wta-single', 'all']
    seen_pairs = set()
    for feed in feeds:
        try:
            rows = fetch_tennisexplorer(feed)
            new_cnt = 0
            for r in rows:
                key = tuple(sorted([norm(r['home_name']), norm(r['away_name'])]))
                if key in seen_pairs:
                    continue
                seen_pairs.add(key)
                all_rows.append(r)
                new_cnt += 1
            print(f'  {feed}: {len(rows)} total, {new_cnt} new')
        except Exception as e:
            print(f'  {feed}: ERROR {e}')

    if not all_rows:
        print('  no odds fetched, aborting')
        return 0

    text = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL)
    data = json.loads(m.group(1))

    # Attach to events across all days that are not yet completed
    total_filled = 0
    for day, events in data.get('days', {}).items():
        total_filled += attach_odds(events, all_rows)

    print(f'  attached to {total_filled} tennis events')

    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')

    html_text = HTML.read_text(encoding='utf-8')
    new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload};\n</script>'
    html_text = re.sub(r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
                       new_block, html_text, count=1, flags=re.DOTALL)
    HTML.write_text(html_text, encoding='utf-8')

    elapsed = time.time() - t0
    print(f'[{datetime.now():%H:%M:%S}] Done in {elapsed:.1f}s')
    return total_filled


if __name__ == '__main__':
    main()

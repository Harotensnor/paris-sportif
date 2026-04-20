#!/usr/bin/env python3
"""Parse ESPN 'details' field to fill in missing homeML/awayML so predictMatch
uses real odds instead of fallback probabilities.

ESPN's details is like 'CHE +110' or 'LILL -205' — the featured team and its ML.
We also have drawML. We infer the other side's ML from 1 - p(known) - p(draw)."""
import json, re, sys, unicodedata
from pathlib import Path

DATA_JS = Path(__file__).resolve().parent.parent / 'data.js'
HTML = Path(__file__).resolve().parent.parent / 'pronostics.html'

def slug(s):
    if not s: return ''
    s = unicodedata.normalize('NFD', s).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]', '', s)

def ml_to_dec(ml):
    if ml is None: return None
    n = float(ml)
    return 1 + n/100 if n > 0 else 1 + 100/abs(n)

def dec_to_ml(dec):
    if not dec or dec <= 1: return None
    if dec >= 2: return round((dec - 1) * 100)
    return round(-100 / (dec - 1))

def abbr_matches(abbr, name):
    """True if abbr is likely the prefix/initials of name."""
    if not abbr or not name: return False
    a = abbr.lower()
    # Try prefix of normalized name
    s = slug(name)
    if s.startswith(a): return True
    # Try initials (CHE = Chelsea, RBNY = RedBullNewYork, MCI = Manchester City)
    initials = ''.join(w[0] for w in re.findall(r'[A-Za-z]+', name) if w)
    if initials.lower().startswith(a): return True
    # Try word prefixes (LILL → Lille, ROMA → AS Roma)
    for w in re.findall(r'[A-Za-z]+', name):
        if w.lower().startswith(a): return True
    # Try truncated match
    if a[:3] == s[:3]: return True
    return False

def enrich_odds(event):
    """Fill homeML/awayML using details field + drawML when possible."""
    odds = event.get('odds') or []
    comps = event.get('competitors') or []
    home = next((c for c in comps if c.get('home_away')=='home'), comps[0] if comps else None)
    away = next((c for c in comps if c.get('home_away')=='away'), comps[1] if len(comps)>1 else None)
    if not home or not away: return 0
    fixed = 0
    for o in odds:
        if o.get('homeML') and o.get('awayML'):
            continue  # already complete
        det = o.get('details')
        if not det: continue
        m = re.match(r'\s*([A-Za-z]{2,6})\s+([+-]?\d+(?:\.\d+)?)', det)
        if not m: continue
        abbr, ml_str = m.group(1), m.group(2)
        try:
            ml_val = float(ml_str)
        except (TypeError, ValueError) as e:
            print(f"[patch_odds] skip: bad ml_str {ml_str!r} ({e})", file=sys.stderr)
            continue
        # Moneylines are typically |ml|>=100. Smaller values are likely point spreads, skip.
        if abs(ml_val) < 100:
            continue
        # Which side does abbr belong to?
        if abbr_matches(abbr, home.get('name','')):
            side = 'home'
        elif abbr_matches(abbr, away.get('name','')):
            side = 'away'
        else:
            continue
        known_dec = ml_to_dec(ml_val)
        if not known_dec: continue
        p_known = 1/known_dec
        draw_ml = o.get('drawML')
        p_draw = 1/ml_to_dec(draw_ml) if draw_ml else 0
        # assume 5% overround
        p_other = max(0.05, 1.05 - p_known - p_draw)
        dec_other = 1/p_other
        ml_other = dec_to_ml(dec_other)
        if side == 'home':
            o['homeML'] = int(ml_val)
            o['awayML'] = ml_other
        else:
            o['awayML'] = int(ml_val)
            o['homeML'] = ml_other
        fixed += 1
    return fixed

def main():
    text = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL)
    data = json.loads(m.group(1))
    total_fixed = 0
    total_events_fixed = 0
    for day, events in data.get('days',{}).items():
        for e in events:
            f = enrich_odds(e)
            if f:
                total_fixed += f
                total_events_fixed += 1
    print(f'Filled ML on {total_fixed} odds rows across {total_events_fixed} events')

    payload = json.dumps(data, ensure_ascii=False, separators=(',',':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')
    print(f'data.js size: {DATA_JS.stat().st_size/1024:.1f} KB')

    # Re-inline into HTML
    html = HTML.read_text(encoding='utf-8')
    new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload};\n</script>'
    if '<script src="data.js"></script>' in html:
        html = html.replace('<script src="data.js"></script>', new_block, 1)
    else:
        html = re.sub(r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
                      new_block, html, count=1, flags=re.DOTALL)
    HTML.write_text(html, encoding='utf-8')
    print(f'pronostics.html size: {HTML.stat().st_size/1024:.1f} KB')

if __name__ == '__main__':
    main()

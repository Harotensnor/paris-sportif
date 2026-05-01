#!/usr/bin/env python3
"""
build_feed.py — Generate `/feed.xml` (RSS 2.0) of today's top picks.

Reads `data.js` and emits a minimal RSS 2.0 feed listing the model's
highest-confidence picks for the current day. Re-generated each cron tick.

Why RSS ?
- Discoverable by feed readers (Feedly, NetNewsWire, browser extensions)
- Indexed by Google for News-style surfacing
- Modern web hygiene signal (audit recommendation)
- Trivial Python build, zero JS dependency

Output : `/feed.xml` (~5-15 KB depending on number of locks).

Idempotent. ~0.2s.
"""
from __future__ import annotations
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
OUTPUT = ROOT / 'feed.xml'

SITE_URL = 'https://harotensnor.github.io/paris-sportif/'
DASH_URL = SITE_URL + 'pronostics.html'

# Sport/league emoji mapping for richer titles
SPORT_EMOJI = {
    'football': '⚽',
    'tennis': '🎾',
    'basketball': '🏀',
    'hockey': '🏒',
    'baseball': '⚾',
    'mma': '🥊',
}


def load_data():
    if not DATA_JS.exists():
        return None
    txt = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


def get_sides(ev: dict) -> tuple[dict, dict]:
    comps = ev.get('competitors') or []
    home = next((c for c in comps if c.get('home_away') == 'home'), None)
    away = next((c for c in comps if c.get('home_away') == 'away'), None)
    if not home and len(comps) >= 1:
        home = comps[0]
    if not away and len(comps) >= 2:
        away = comps[1]
    return (home or {}, away or {})


def rfc822(dt: datetime) -> str:
    """Format datetime in RFC 822 / RFC 2822 (RSS standard)."""
    return dt.strftime('%a, %d %b %Y %H:%M:%S +0000')


# v31.4 — Plage de cotes utile pour le RSS. Avant : on publiait des cotes à
# 1.01 (Sinner @ favoris archi-écrasants), inutilisables en pari réel et qui
# faisaient ressembler le feed à une liste de "win rate" gonflée. Maintenant
# on cible la fenêtre où il y a un vrai marché : 1.40 ≤ cote ≤ 4.20.
# - cote < 1.40 → favori plat, edge marginal, pas d'intérêt éditorial
# - cote > 4.20 → outsider, bruit dominant sur les petits échantillons
ODD_MIN = 1.40
ODD_MAX = 4.20

# Fourchette de probabilité implicite correspondante (avec marge bookmaker
# ~5%, on tape la zone 25-70% — exactement la zone Kelly-fertile). On garde
# aussi un floor de 0.30 sur la prob pour éviter les long-shots.
PROB_MIN = 0.25
PROB_MAX = 0.72


def collect_top_picks(data: dict, limit: int = 15) -> list[dict]:
    """Return upcoming, non-completed events with Winamax 1n2 odds and a
    pick dans la fenêtre [ODD_MIN, ODD_MAX]. On ne fait PAS tourner
    predictMatch (Python pur, pas de V8 dans le runner refresh.yml) — on
    publie les meilleurs favoris marché de la journée dans la zone
    Kelly-fertile, soit la même heuristique que le tab "Top picks" du
    dashboard côté serveur. Le dashboard reste la source officielle ;
    le RSS est un teaser optimisé feed reader."""
    today = data.get('today')
    days = data.get('days') or {}
    today_evs = days.get(today, []) or []
    picks = []
    for ev in today_evs:
        if ev.get('completed'):
            continue
        if ev.get('status') in ('STATUS_IN_PROGRESS', 'STATUS_FINAL'):
            continue
        if ev.get('live'):
            continue
        wm = (ev.get('winamax') or {}).get('markets', {}).get('1n2') or {}
        h = wm.get('home')
        a = wm.get('away')
        if not h or not a:
            continue
        try:
            home_odd = float(h)
            away_odd = float(a)
            home_prob = 1.0 / home_odd
            away_prob = 1.0 / away_odd
        except (TypeError, ValueError):
            continue
        # Best side = highest implied prob
        if home_prob > away_prob:
            pick_side, pick_odd, pick_prob = 'home', home_odd, home_prob
        else:
            pick_side, pick_odd, pick_prob = 'away', away_odd, away_prob
        # v31.4 — fenêtre cote ET fenêtre prob (cohérentes mais doublement
        # filtrées au cas où une cote aberrante passerait).
        if pick_odd < ODD_MIN or pick_odd > ODD_MAX:
            continue
        if pick_prob < PROB_MIN or pick_prob > PROB_MAX:
            continue
        picks.append({
            'ev': ev,
            'pick_side': pick_side,
            'pick_odd': pick_odd,
            'pick_prob': pick_prob,
        })
    # Sort by pick_prob desc, take top N. La logique : à edge marché égal,
    # on préfère le favori (variance plus basse, plus pédagogique pour le
    # lecteur RSS qui ne trade pas activement).
    picks.sort(key=lambda x: -x['pick_prob'])
    return picks[:limit]


def render_item(p: dict) -> str:
    ev = p['ev']
    home, away = get_sides(ev)
    home_name = home.get('name') or home.get('short') or '?'
    away_name = away.get('name') or away.get('short') or '?'
    sport = ev.get('sport') or 'sport'
    league = ev.get('league_name') or ''
    emoji = SPORT_EMOJI.get(sport, '🎯')
    pick_team = home_name if p['pick_side'] == 'home' else away_name
    pick_label = f"{'1' if p['pick_side'] == 'home' else '2'} · {pick_team}"
    title = f'{emoji} {home_name} vs {away_name} · {league}'
    # v31.7.4 — Description plus narrative + heure kickoff + ROI implicite.
    # Avant : juste cote + prob. Maintenant : contexte temporel + value
    # narrative pour donner au lecteur RSS une vraie info actionnable.
    try:
        if ev.get('date'):
            kdt = datetime.fromisoformat(ev['date'].replace('Z', '+00:00'))
            kickoff_local = kdt.strftime('%d/%m à %Hh%M UTC')
        else:
            kickoff_local = ''
    except (ValueError, AttributeError):
        kickoff_local = ''
    implied_pct = int(p['pick_prob'] * 100)
    odd = p['pick_odd']
    # Narrative selon force du favori
    if implied_pct >= 65:
        narrative = f'Favori solide.'
    elif implied_pct >= 50:
        narrative = f'Match équilibré, léger avantage marché.'
    else:
        narrative = f'Outsider, value bet potentielle.'
    kickoff_note = f" · coup d'envoi {kickoff_local}" if kickoff_local else ''
    desc = (
        f'<b>{league}</b>{kickoff_note}.<br>'
        f'Favori marché : <b>{pick_label}</b> @ <b>{odd:.2f}</b> '
        f'(probabilité implicite <b>{implied_pct}%</b>). {narrative}<br>'
        f'<a href="{DASH_URL}#match-{ev.get("id", "")}">Voir le pick calibré sur le dashboard →</a>'
    )
    # ISO date → RSS pubdate
    date_str = ev.get('date') or ''
    try:
        if date_str.endswith('Z'):
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        else:
            dt = datetime.fromisoformat(date_str)
        pubdate = rfc822(dt)
    except (ValueError, AttributeError):
        pubdate = rfc822(datetime.now(timezone.utc))
    # Match guid : id-stable, link via dashboard hash to the match
    guid = f'{SITE_URL}pronostics.html#match-{ev.get("id", "?")}'
    link = guid
    return (
        '    <item>\n'
        f'      <title>{escape(title)}</title>\n'
        f'      <link>{escape(link)}</link>\n'
        f'      <guid isPermaLink="false">{escape(guid)}</guid>\n'
        f'      <pubDate>{pubdate}</pubDate>\n'
        f'      <description>{escape(desc)}</description>\n'
        f'      <category>{escape(sport)}</category>\n'
        '    </item>'
    )


FEED_TEMPLATE = '''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Paris-Sportif — Favoris marché du jour (foot, tennis, NBA, NHL, MLB)</title>
    <link>{site}</link>
    <atom:link href="{site}feed.xml" rel="self" type="application/rss+xml" />
    <description>Favoris marché du jour dans la fenêtre Kelly-fertile (cote 1.40-4.20). Foot, tennis, NBA, NHL, MLB. Mise à jour toutes les 5 minutes. Le pick calibré officiel (modèle + Kelly) est sur le dashboard. Site éducatif open-source, 18+, aucune affiliation.</description>
    <language>fr-FR</language>
    <copyright>Théo Boulnois — projet personnel non commercial</copyright>
    <managingEditor>https://github.com/Harotensnor/paris-sportif/issues (Théo Boulnois)</managingEditor>
    <pubDate>{pubdate}</pubDate>
    <lastBuildDate>{pubdate}</lastBuildDate>
    <generator>scripts/build_feed.py · paris-sportif</generator>
    <ttl>5</ttl>
    <image>
      <url>{site}og-default.png</url>
      <title>Paris-Sportif</title>
      <link>{site}</link>
      <width>1200</width>
      <height>630</height>
    </image>
{items}
  </channel>
</rss>
'''


def main() -> int:
    data = load_data()
    if data is None:
        print('[build_feed] data.js missing or unparsable, skip.', flush=True)
        return 0
    picks = collect_top_picks(data, limit=15)
    if not picks:
        items_xml = '    <!-- No picks today (early morning, no scheduled games matching threshold) -->'
        print('[build_feed] no top picks for today, generating empty feed.', flush=True)
    else:
        items_xml = '\n'.join(render_item(p) for p in picks)

    pubdate = rfc822(datetime.now(timezone.utc))
    xml = FEED_TEMPLATE.format(
        site=SITE_URL,
        pubdate=pubdate,
        items=items_xml,
    )
    OUTPUT.write_text(xml, encoding='utf-8')
    size_kb = OUTPUT.stat().st_size // 1024
    print(f'[build_feed] feed.xml · {size_kb} KB · {len(picks)} top picks for today', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())

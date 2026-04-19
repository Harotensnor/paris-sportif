#!/usr/bin/env python3
"""Winamax catalog mapping.

For each ESPN league_code (or sport+league combo), specifies:
  - available:  bool  (True if Winamax takes bets on this competition)
  - slug:       str   (URL slug for deep-link to competition page)

Used by patch_odds.py / fetch_live.py / fetch_v3.py to tag each event with
`winamax` info so the dashboard can:
  1. Hide events where Winamax doesn't offer odds
  2. Link directly to the competition page

Winamax URL pattern:
  https://www.winamax.fr/paris-sportifs/sports/{sport_slug}/{country_slug}/{league_slug}

Where we don't know the exact slug, we link to the sport root page.
"""
from __future__ import annotations

# sport_slug mapping — Winamax's sport category slugs (French)
SPORT_SLUGS = {
    'football': 'football',
    'basketball': 'basket-ball',
    'hockey': 'hockey-sur-glace',
    'tennis': 'tennis',
    'golf': 'golf',
    'mma': 'mma',
    'racing': 'formule-1',   # F1 only
    'baseball': 'baseball',
    'americanfootball': 'football-americain',
}


# ESPN league_code → (available, slug_path_after_sport/)
# slug_path is relative to /paris-sportifs/sports/{sport_slug}/
# None means link to sport landing page
FOOTBALL_LEAGUES = {
    # --- Top 5 ---
    'eng.1': (True, 'angleterre/premier-league'),
    'eng.2': (True, 'angleterre/championship'),
    'eng.3': (True, 'angleterre/league-one'),
    'eng.4': (True, 'angleterre/league-two'),
    'esp.1': (True, 'espagne/liga'),
    'esp.2': (True, 'espagne/liga-2'),
    'esp.copa_del_rey': (True, 'espagne/coupe-du-roi'),
    'ger.1': (True, 'allemagne/bundesliga'),
    'ger.2': (True, 'allemagne/bundesliga-2'),
    'ita.1': (True, 'italie/serie-a'),
    'ita.2': (True, 'italie/serie-b'),
    'fra.1': (True, 'france/ligue-1'),
    'fra.2': (True, 'france/ligue-2'),

    # --- Other European top flights ---
    'por.1': (True, 'portugal/liga-portugal'),
    'ned.1': (True, 'pays-bas/eredivisie'),
    'bel.1': (True, 'belgique/pro-league'),
    'tur.1': (True, 'turquie/super-lig'),
    'rus.1': (True, 'russie/premier-league'),
    'gre.1': (True, 'grece/super-league'),
    'aut.1': (True, 'autriche/bundesliga'),
    'sco.1': (True, 'ecosse/premiership'),
    'swe.1': (True, 'suede/allsvenskan'),
    'nor.1': (True, 'norvege/eliteserien'),

    # --- Americas ---
    'usa.1': (True, 'etats-unis/mls'),
    'mex.1': (True, 'mexique/liga-mx'),
    'bra.1': (True, 'bresil/serie-a'),
    'arg.1': (True, 'argentine/primera-division'),
    'col.1': (True, 'colombie/primera-a'),
    'chi.1': (True, 'chili/primera-division'),
    'uru.1': (True, 'uruguay/primera-division'),
    'per.1': (True, 'perou/primera-division'),
    'par.1': (True, 'paraguay/primera-division'),
    'ecu.1': (True, 'equateur/liga-pro'),
    'ven.1': (True, 'venezuela/primera-division'),

    # --- Asia/Oceania (selective) ---
    'jpn.1': (True, 'japon/j-league'),
    'chn.1': (True, 'chine/super-league'),
    'aus.1': (True, 'australie/a-league'),
    'ind.1': (False, None),   # ISL rarely covered
    'idn.1': (False, None),   # Liga 1 Indonesia usually not
    'tha.1': (False, None),   # Thai League usually not

    # --- Continental / international ---
    'uefa.champions': (True, 'europe/ligue-des-champions'),
    'uefa.europa': (True, 'europe/ligue-europa'),
    'uefa.europa.conf': (True, 'europe/conference-league'),
    'uefa.nations': (True, 'europe/ligue-des-nations'),
    'uefa.super': (True, 'europe/supercoupe-uefa'),
    'conmebol.libertadores': (True, 'amerique-sud/copa-libertadores'),
    'conmebol.sudamericana': (True, 'amerique-sud/copa-sudamericana'),
    'afc.champions': (True, 'asie/ligue-des-champions'),
    'caf.champions': (True, 'afrique/ligue-des-champions'),
    'fifa.world': (True, 'monde/coupe-du-monde'),
    'uefa.euro': (True, 'europe/euro'),

    # --- Additional European leagues ---
    'dan.1': (True, 'danemark/superliga'),
    'hun.1': (True, 'hongrie/nb1'),
    'isr.1': (True, None),
    'cro.1': (True, 'croatie/hnl'),
    'ser.1': (True, 'serbie/superliga'),
    'slo.1': (True, None),
    'fin.1': (True, None),
    'bul.1': (True, None),
    'pol.1': (True, 'pologne/ekstraklasa'),
    'cze.1': (True, 'tchequie/synot-liga'),
    'rou.1': (True, 'roumanie/liga-1'),
    'ukr.1': (True, 'ukraine/premier-league'),
    'kor.1': (True, 'coree/k-league'),
    'sui.1': (True, 'suisse/super-league'),

    # --- Cups ---
    'eng.fa': (True, 'angleterre/fa-cup'),
    'eng.league_cup': (True, 'angleterre/efl-cup'),
    'fra.coupe_de_france': (True, 'france/coupe-de-france'),
    'ita.coppa_italia': (True, 'italie/coppa-italia'),
    'ger.dfb_pokal': (True, 'allemagne/dfb-pokal'),
    'por.taca': (True, None),
    'ned.knvb_beker': (True, None),
}


# Tennis — by sport + tournament logic
# ATP 250/500/1000 Masters + Grand Slams: YES
# WTA main tour 250/500/1000 + Grand Slams: YES
# Challenger: PARTIAL (some yes)
# ITF W15/W25/W35 + M15/M25: almost always NO
def tennis_available(event):
    """event has: sport='tennis', league_code in ['atp','wta'], league_name (tournament name)."""
    league = (event.get('league_name') or event.get('league') or '').lower()
    if not league:
        return (False, None)
    # Winamax only covers ATP/WTA main tour (250/500/1000/Slams).
    # Excluded: Challenger (CETO, 'challenger' in name), ITF (W15/W25/W35/W75/M15/M25/M35, 'itf', Jamor)
    excl_markers = ['itf', 'challenger', 'ceto', 'jamor',
                    'w15', 'w25', 'w35', 'w50', 'w60', 'w75', 'w100',
                    'm15', 'm25', 'm35', 'm50', 'm75', 'm100']
    if any(m in league for m in excl_markers):
        return (False, None)
    code = event.get('league_code', 'atp')
    slug = 'atp' if code == 'atp' else 'wta'
    return (True, f'{slug}')


BASKETBALL_LEAGUES = {
    'nba': (True, 'etats-unis/nba'),
    'wnba': (False, None),  # Winamax rarely has WNBA
    'euroleague': (True, 'europe/euroleague'),
    'fra.1': (True, 'france/betclic-elite'),
    'esp.acb': (True, 'espagne/liga-acb'),
}


HOCKEY_LEAGUES = {
    'nhl': (True, 'etats-unis/nhl'),
    'khl': (True, 'russie/khl'),
    'sweden.shl': (True, 'suede/shl'),
    'finland.liiga': (True, 'finlande/liiga'),
    'switzerland.nl': (True, 'suisse/national-league'),
}


OTHER_SPORTS = {
    ('golf', 'pga'): (True, 'golf/pga-tour'),
    ('golf', 'lpga'): (False, None),   # LPGA often not covered
    ('golf', 'european'): (True, 'golf/dp-world-tour'),
    ('racing', 'f1'): (True, 'formule-1/championnat-du-monde'),
    ('mma', 'ufc'): (True, 'mma/ufc'),
    ('americanfootball', 'nfl'): (True, 'football-americain/nfl'),
    ('baseball', 'mlb'): (True, 'baseball/mlb'),
}


def lookup(event):
    """Return dict with keys: available (bool), url (str|None), note (str|None)."""
    sport = event.get('sport') or ''
    code = event.get('league_code') or ''
    sport_slug = SPORT_SLUGS.get(sport)
    base = 'https://www.winamax.fr/paris-sportifs'

    if sport == 'football':
        info = FOOTBALL_LEAGUES.get(code)
        if info is None:
            # Unknown football league — assume Winamax has it (broad coverage) but link to sport root
            return {'available': True, 'url': f'{base}/sports/football', 'note': 'unknown_league'}
        ok, slug = info
        if not ok:
            return {'available': False, 'url': None, 'note': 'not_on_winamax'}
        return {'available': True, 'url': f'{base}/sports/football/{slug}' if slug else f'{base}/sports/football', 'note': None}

    if sport == 'tennis':
        ok, slug = tennis_available(event)
        if not ok:
            return {'available': False, 'url': None, 'note': 'itf_not_on_winamax'}
        return {'available': True, 'url': f'{base}/sports/tennis/{slug}', 'note': None}

    if sport == 'basketball':
        info = BASKETBALL_LEAGUES.get(code)
        if info is None:
            return {'available': True, 'url': f'{base}/sports/basket-ball', 'note': 'unknown_league'}
        ok, slug = info
        if not ok:
            return {'available': False, 'url': None, 'note': 'not_on_winamax'}
        return {'available': True, 'url': f'{base}/sports/basket-ball/{slug}' if slug else f'{base}/sports/basket-ball', 'note': None}

    if sport == 'hockey':
        info = HOCKEY_LEAGUES.get(code)
        if info is None:
            return {'available': True, 'url': f'{base}/sports/hockey-sur-glace', 'note': 'unknown_league'}
        ok, slug = info
        if not ok:
            return {'available': False, 'url': None, 'note': 'not_on_winamax'}
        return {'available': True, 'url': f'{base}/sports/hockey-sur-glace/{slug}' if slug else f'{base}/sports/hockey-sur-glace', 'note': None}

    info = OTHER_SPORTS.get((sport, code))
    if info is None:
        return {'available': False, 'url': None, 'note': 'sport_not_mapped'}
    ok, slug = info
    if not ok:
        return {'available': False, 'url': None, 'note': 'not_on_winamax'}
    return {'available': True, 'url': f'{base}/sports/{slug}' if slug else base, 'note': None}


if __name__ == '__main__':
    # Self-test: print what would be filtered for each distinct league in data.js
    import json, re
    from pathlib import Path
    text = Path(__file__).resolve().parent.parent / 'data.js'.read_text()
    data = json.loads(re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL).group(1))
    seen = {}
    for day, events in data.get('days', {}).items():
        for ev in events:
            info = lookup(ev)
            k = (ev.get('sport'), ev.get('league_code'), ev.get('league'))
            seen.setdefault(k, [0, info])
            seen[k][0] += 1
    print(f'{"n":>4}  {"sport":<10} {"code":<24} {"league":<28} avail  url')
    for (sport, code, lg), (n, info) in sorted(seen.items(), key=lambda x: -x[1][0]):
        avail = 'YES' if info['available'] else 'no '
        u = (info['url'] or '-')[:60]
        print(f'{n:>4}  {sport:<10} {str(code):<24} {str(lg)[:28]:<28} {avail}    {u}')

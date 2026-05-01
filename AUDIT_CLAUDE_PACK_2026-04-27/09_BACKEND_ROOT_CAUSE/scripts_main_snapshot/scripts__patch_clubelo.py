#!/usr/bin/env python3
"""Attach ClubElo ratings from clubelo.json to each competitor in data.js.

Adds `competitor.elo = {value, rank, country, level}` to every football
competitor whose (normalized) name maps to a ClubElo entry, either directly
or via the ALIASES table below.

Run AFTER patch_winamax.py (competitor dedup) so the enrichment survives
the rewrite. Idempotent — safe to run on every cron tick. Very fast (<0.1s).

Match strategy (in order):
  1. Exact normalized name match.
  2. ALIAS table lookup (curated list of ESPN vs ClubElo naming mismatches
     for top-5 league clubs + major European ones).
  3. Prefix-match fallback (first 6+ chars) — only when unambiguous.

Missing matches are expected for non-top-tier leagues (MLS, J-League,
ArgFinal, Mexican LigaMX, etc.) — ClubElo covers ~700 clubs, overwhelmingly
European.
"""
from __future__ import annotations
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data.js'
ELO_PATH = ROOT / 'clubelo.json'


# Data.js name (normalized) → ClubElo name (normalized). Curated after
# running a coverage pass over the top-5 leagues. Left side is ASCII-lower,
# alphanumeric-only; right side is what ClubElo stores.
ALIASES: dict[str, str] = {
    # Ligue 1
    'parissaintgermain': 'parissg',
    'paris': 'parissg',
    'psg': 'parissg',
    'asmonaco': 'monaco',
    'olympiquedemarseille': 'marseille',
    'olympiquemarseille': 'marseille',
    'olympiquelyonnais': 'lyon',
    'olympiquelyon': 'lyon',
    'stadebrestois29': 'brest',
    'rclens': 'lens',
    'lilleosc': 'lille',
    'ogcnice': 'nice',
    'fcnantes': 'nantes',
    'stadedereims': 'reims',
    'stadederennes': 'rennes',
    'stadeederenneesfc': 'rennes',
    'stadederennesfc': 'rennes',
    'fcmetz': 'metz',
    'ajauxerre': 'auxerre',
    'anglersaintetienne': 'stetienne',
    'assaintetienne': 'stetienne',
    'asnancylorraine': 'nancy',
    'estactroyesac': 'troyes',
    'havreac': 'lehavre',
    'lehavreac': 'lehavre',
    'fcsochauxmontbeliard': 'sochaux',

    # Premier League
    'manchesterunited': 'manunited',
    'manunited': 'manunited',
    'manutd': 'manunited',
    'manchestercity': 'mancity',
    'mancity': 'mancity',
    'tottenhamhotspur': 'tottenham',
    'spurs': 'tottenham',
    'brightonhoveralbion': 'brighton',
    'brightonhovealbion': 'brighton',
    'brightonandhovealbion': 'brighton',
    'brighton': 'brighton',
    'westhamunited': 'westham',
    'wolverhamptonwanderers': 'wolves',
    'newcastleunited': 'newcastle',
    'afcbournemouth': 'bournemouth',
    'nottinghamforest': 'forest',
    'sheffieldunited': 'sheffieldunited',
    'leicestercity': 'leicester',
    'ipswichtown': 'ipswich',

    # Bundesliga
    'bayernmunich': 'bayern',
    'bayernmunchen': 'bayern',
    'fcbayernmunchen': 'bayern',
    'borussiadortmund': 'dortmund',
    'bvbdortmund': 'dortmund',
    'borussiamonchengladbach': 'gladbach',
    'bayer04leverkusen': 'leverkusen',
    'bayerleverkusen': 'leverkusen',
    'eintrachtfrankfurt': 'eintracht',
    'fcaugsburg': 'augsburg',
    'werderbremen': 'werder',
    'svwerderbremen': 'werder',
    'rbleipzig': 'rbleipzig',
    'rasenballsportleipzig': 'rbleipzig',
    '1fcunionberlin': 'unionberlin',
    'fcunionberlin': 'unionberlin',
    'unionberlin': 'unionberlin',
    'vflwolfsburg': 'wolfsburg',
    '1fcheidenheim1846': 'heidenheim',
    'fcheidenheim': 'heidenheim',
    'vflbochum': 'bochum',
    '1fsvmainz05': 'mainz',
    'fsvmainz05': 'mainz',
    'mainz05': 'mainz',
    'tsghoffenheim': 'hoffenheim',
    '1899hoffenheim': 'hoffenheim',
    'vfbstuttgart': 'stuttgart',
    'hamburgersv': 'hamburg',
    'schalke04': 'schalke',
    'fcschalke04': 'schalke',
    'fckoln': 'koeln',
    '1fckoln': 'koeln',
    'fccologne': 'koeln',
    'koln': 'koeln',
    'stpauli': 'stpauli',
    'fcstpauli': 'stpauli',

    # La Liga
    'realmadrid': 'realmadrid',
    'atleticodemadrid': 'atletico',
    'atleticomadrid': 'atletico',
    'fcbarcelona': 'barcelona',
    'barcelona': 'barcelona',
    'rayovallecano': 'rayovallecano',
    'villarrealcf': 'villarreal',
    'villarreal': 'villarreal',
    'realbetis': 'betis',
    'realbetisbalompie': 'betis',
    'realvalladolidcf': 'valladolid',
    'realvalladolid': 'valladolid',
    'valenciacf': 'valencia',
    'valencia': 'valencia',
    'realsociedad': 'sociedad',
    'realoviedo': 'oviedo',
    'athleticclub': 'bilbao',
    'athleticbilbao': 'bilbao',
    'sevillafc': 'sevilla',
    'sevilla': 'sevilla',
    'celtadevigo': 'celta',
    'celtavigo': 'celta',
    'depalaves': 'alaves',
    'deportivoalaves': 'alaves',
    'getafecf': 'getafe',
    'getafe': 'getafe',
    'realmallorca': 'mallorca',
    'rcdmallorca': 'mallorca',
    'rayovallecanodemadrid': 'rayovallecano',
    'rcdespanyolbarcelona': 'espanyol',
    'rcdespanyol': 'espanyol',
    'udlaspalmas': 'laspalmas',
    'cdleganes': 'leganes',
    'udalmeria': 'almeria',

    # Serie A
    'internazionale': 'inter',
    'intermilan': 'inter',
    'fcinternazionalemilano': 'inter',
    'acmilan': 'milan',
    'associazionecalciomilan': 'milan',
    'asroma': 'roma',
    'ssclazio': 'lazio',
    'sscnapoli': 'napoli',
    'napoli': 'napoli',
    'juventusfc': 'juventus',
    'juventus': 'juventus',
    'acfflorentinaa': 'fiorentina',
    'acffiorentina': 'fiorentina',
    'atalantabc': 'atalanta',
    'atalanta': 'atalanta',
    'bolognafc': 'bologna',
    'bolognafc1909': 'bologna',
    'bologna': 'bologna',
    'empolifc': 'empoli',
    'empoli': 'empoli',
    'hellasverona': 'verona',
    'torinofc': 'torino',
    'torino': 'torino',
    'udinese': 'udinese',
    'udinesecalcio': 'udinese',
    'uslecce': 'lecce',
    'uscremonese': 'cremonese',
    'lecce': 'lecce',
    'genoacfc': 'genoa',
    'cagliaricalcio': 'cagliari',
    'sslazio': 'lazio',
    'lazio': 'lazio',
    'comocalcio1907': 'como',
    'como1907': 'como',
    'veneziafc': 'venezia',
    'parmacalcio1913': 'parma',
    'parmacalcio': 'parma',
    'acmonza': 'monza',
    'monza': 'monza',

    # Bundesliga 2 (ger.2)
    'fortunadusseldorf': 'duesseldorf',
    'fortunadusseldorfrf': 'duesseldorf',
    'arminiabielefeld': 'bielefeld',
    'dcarminiabielefeld': 'bielefeld',
    'herthaberlin': 'hertha',
    'herthabsc': 'hertha',
    'holsteinkiel': 'holsteinkiel',
    'kscholsteinkiel': 'holsteinkiel',
    'kaiserslautern': 'kaiserslautern',
    '1fckaiserslautern': 'kaiserslautern',
    'preuenmunster': 'muenster',
    'preussenmunster': 'muenster',
    'scpreuenmunster': 'muenster',
    'spvgggreutherfurth': 'fuerth',
    'greutherfurth': 'fuerth',
    'svdarmstadt98': 'darmstadt',
    'sv07elversberg': 'elversberg',
    'svelversberg': 'elversberg',
    'scpaderborn07': 'paderborn',
    'scpaderborn': 'paderborn',
    'dynamodresden': 'dresden',
    'sgdynamodresden': 'dresden',
    'tsveintrachtbraunschweig': 'braunschweig',
    'eintrachtbraunschweig': 'braunschweig',
    'karlsruhersc': 'karlsruher',
    'hannover96': 'hannover',
    'jahnregensburg': 'regensburg',

    # Austrian Bundesliga (aut.1)
    'rapidvienna': 'rapidwien',
    'skrapidwien': 'rapidwien',
    'austriavienna': 'austriawien',
    'fkaustriavienna': 'austriawien',
    'fkaustriawien': 'austriawien',
    'sksturmgraz': 'sturmgraz',
    'sturmgraz': 'sturmgraz',
    'grazerak': 'gak',
    'wolfsberger': 'wolfsberg',
    'wolfsbergerac': 'wolfsberg',
    'lasklinz': 'lask',
    'scrheindorfaltach': 'altach',
    'svjoskoried': 'ried',
    'svried': 'ried',
    'tsvhartberg': 'hartberg',
    'wsgswarovskitirol': 'wsgtirol',
    'wsgtirol': 'wsgtirol',
    'fcblauweilinz': 'blauweisslinz',
    'blauweisslinz': 'blauweisslinz',
    'redbullsalzburg': 'salzburg',
    'fcsalzburg': 'salzburg',

    # Eredivisie (ned.1)
    'azalkmaar': 'alkmaar',
    'fortunasittard': 'sittard',
    'heraclesalmelo': 'heracles',
    'nacbreda': 'nac',
    'nec': 'nijmegen',
    'necnijmegen': 'nijmegen',
    'peczwolle': 'zwolle',
    'almeerecity': 'almerecity',
    'fortunarotterdam': 'sparta',
    'spartarotterdam': 'sparta',
    'goaheadeagles': 'goaheadeagles',

    # Belgian Pro League (bel.1)
    'cerclebruggeksv': 'cerclebrugge',
    'royalcharleroisc': 'charleroi',
    'racinggenk': 'genk',
    'krcgenk': 'genk',
    'standardliege': 'standard',
    'standarddelige': 'standard',
    'rstandarddeliege': 'standard',
    'unionstgilloise': 'stgilloise',
    'unionsaintgilloise': 'stgilloise',
    'rsaintgilloise': 'stgilloise',
    'royaleunionsaintgilloise': 'stgilloise',
    'kvcwesterlo': 'westerlo',
    'kvmechelen': 'mechelen',
    'kvoostende': 'oostende',
    'ohleuven': 'ohleuven',
    'clubbrugge': 'brugge',
    'clubbruggekv': 'brugge',
    'sintruiden': 'sinttruiden',
    'sinttruidensevv': 'sinttruiden',
    'antwerp': 'antwerp',
    'royalantwerp': 'antwerp',
    'anderlecht': 'anderlecht',
    'rscanderlecht': 'anderlecht',
    'raallalouviere': 'lalouviere',

    # Primeira Liga (por.1)
    'vitoriadeguimaraes': 'guimaraes',
    'vitoriasc': 'guimaraes',
    'cdnacional': 'nacional',
    'estrela': 'estrelaamadora',
    'estrelaadamadora': 'estrelaamadora',
    'cdsantaclara': 'santaclara',
    'moreirense': 'moreirense',
    'casapia': 'casapia',
    'famalicao': 'famalicao',
    'boavista': 'boavista',
    'aves': 'aves',
    'tondela': 'tondela',
    'estoril': 'estoril',

    # Other European
    'ajaxamsterdam': 'ajax',
    'ajax': 'ajax',
    'feyenoordrotterdam': 'feyenoord',
    'feyenoord': 'feyenoord',
    'psveindhoven': 'psv',
    'psv': 'psv',
    'azalkmaar': 'az',
    'slbenfica': 'benfica',
    'benfica': 'benfica',
    'sportingcp': 'sporting',
    'sportingclubedeportugal': 'sporting',
    'fcporto': 'porto',
    'porto': 'porto',
    'vitoriasc': 'guimaraes',
    'celticfc': 'celtic',
    'celtic': 'celtic',
    'rangersfc': 'rangers',
    'rangers': 'rangers',
    'galatasaray': 'galatasaray',
    'fenerbahce': 'fenerbahce',
    'besiktas': 'besiktas',
    'olympiakospiraeus': 'olympiakos',
    'olympiacos': 'olympiakos',
    'shakhtardonetsk': 'shakhtar',
    'dynamokyiv': 'kiev',
    'dinamokiev': 'kiev',
    'fkpartizan': 'partizan',
    'crvenazvezdabelgrade': 'crvenazvezda',
    'redstarbelgrade': 'crvenazvezda',
    'tsgsfsv1900': 'hoffenheim',
}


def normalize(name: str) -> str:
    if not name:
        return ''
    n = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode()
    return ''.join(c for c in n.lower() if c.isalnum())


def load_data() -> dict:
    txt = DATA_PATH.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('[patch_clubelo] could not parse data.js', file=sys.stderr)
        sys.exit(1)
    return json.loads(m.group(1))


def save_data(d: dict) -> None:
    DATA_PATH.write_text(
        'window.PRONOSTICS_DATA = ' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n',
        encoding='utf-8',
    )


def _strip_common(n: str) -> str:
    """Drop trailing 'city', 'united', 'fc', 'ac' and leading number-dot from a
    normalized name. ClubElo routinely stores 'Hull' vs ESPN 'Hull City', etc."""
    for suf in ('cityfc', 'unitedfc', 'townfc', 'city', 'united', 'town', 'fc', 'ac', 'cf'):
        if n.endswith(suf) and len(n) > len(suf) + 2:
            return n[:-len(suf)]
    return n


def lookup(clubs: dict[str, dict], name: str) -> dict | None:
    """Return elo entry for `name`, trying direct → alias → suffix-stripped → None."""
    n = normalize(name)
    if not n:
        return None
    if n in clubs:
        return clubs[n]
    alias = ALIASES.get(n)
    if alias and alias in clubs:
        return clubs[alias]
    # Fallback: try stripping common English suffixes ("Hull City" → "Hull").
    stripped = _strip_common(n)
    if stripped != n and stripped in clubs:
        return clubs[stripped]
    # Leading prefix strip: "1. FC Köln" → "fckoln" → "koln"
    for pre in ('1fc', '1fsv', 'fc', 'ac', 'sv', 'sc', 'vfb', 'vfl', 'tsg', 'bsc'):
        if n.startswith(pre) and len(n) > len(pre) + 2:
            cand = n[len(pre):]
            if cand in clubs:
                return clubs[cand]
    return None


def main() -> int:
    if not ELO_PATH.exists():
        print(f'[patch_clubelo] {ELO_PATH.name} missing — run fetch_clubelo.py first')
        return 0  # non-fatal

    raw = json.loads(ELO_PATH.read_text(encoding='utf-8'))
    clubs = raw.get('clubs') or {}
    if not clubs:
        print('[patch_clubelo] empty clubs — nothing to patch')
        return 0

    d = load_data()
    patched = 0
    total = 0
    missed: dict[str, int] = {}
    for day_key, evs in (d.get('days') or {}).items():
        for ev in evs:
            if ev.get('sport') != 'football':
                continue
            for c in ev.get('competitors') or []:
                total += 1
                name = c.get('name') or ''
                entry = lookup(clubs, name)
                if entry:
                    c['elo'] = {
                        'value': entry['elo'],
                        'rank': entry.get('rank'),
                        'country': entry.get('country'),
                        'level': entry.get('level'),
                    }
                    patched += 1
                else:
                    missed[name] = missed.get(name, 0) + 1

    save_data(d)
    coverage = 100 * patched / total if total else 0
    print(f'[patch_clubelo] patched {patched}/{total} football competitors '
          f'({coverage:.0f}% coverage)')
    if missed:
        top_miss = sorted(missed.items(), key=lambda kv: -kv[1])[:8]
        print(f'[patch_clubelo] top unmatched: {top_miss}')
    return 0


if __name__ == '__main__':
    sys.exit(main())

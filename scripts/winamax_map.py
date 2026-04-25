#!/usr/bin/env python3
"""Winamax catalog mapping.

Primary strategy — the dynamic catalog (``winamax_catalog.json``) — is the
ground truth: it comes straight from scraping Winamax's own pages via
``fetch_winamax_catalog.py``. Each ESPN event is matched against a real
Winamax match by sport + normalized league name + player/team names.

Fallback — the static heuristic tables below — is only used when the
catalog is unavailable (first run, scraper failure). They're broad enough
to keep the dashboard usable but produce false positives, which is why
the catalog-driven path is preferred.
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path


# ---------------------------------------------------------------------------
# Catalog-driven lookup (primary path)
# ---------------------------------------------------------------------------
_CATALOG_PATH = Path(__file__).resolve().parent.parent / 'winamax_catalog.json'
_CATALOG_CACHE: dict | None = None


# ESPN sport string → Winamax sport_id
_ESPN_TO_WINAMAX_SPORT = {
    'football': 1,
    'basketball': 2,
    'baseball': 3,
    'hockey': 4,
    'tennis': 5,
    'americanfootball': 16,
    'mma': 117,
}


# Explicit ESPN league_code → Winamax tournament_id.
# Grounded on the live catalog (see winamax_catalog.json). When the ESPN
# league is listed here and does NOT appear in the catalog, the event is
# treated as not-on-Winamax (i.e. we don't fall back to fuzzy matching,
# because we know the canonical mapping). Leagues absent from this table
# fall through to fuzzy name matching.
_ESPN_CODE_TO_WMX_TID = {
    # --- Football ---
    'eng.1': 1,           # Premier League
    'eng.2': 2,           # Championship
    'eng.fa': 16,         # FA Cup
    'esp.1': 36,          # LaLiga
    'esp.2': 37,          # LaLiga 2
    'ger.1': 42,          # Bundesliga
    'ger.2': 41,          # 2. Bundesliga
    'ita.1': 33,          # Serie A
    'ita.2': 34,          # Serie B
    'fra.1': 4,           # Ligue 1
    'fra.2': 19,          # Ligue 2
    'ned.1': 39,          # Eredivisie
    'por.1': 52,          # Liga Portugal
    'bel.1': 38,          # Jupiler Pro League
    'tur.1': 62,          # Süper Lig
    'aut.1': 29,          # Bundesliga Autriche
    'swe.1': 24,          # Allsvenskan
    'nor.1': 5,           # Eliteserien
    'gre.1': 127,         # Super League Grèce
    'arg.1': 162285,      # Primera División
    'mex.1': 16753,       # Liga MX
    'chn.1': 652,         # Super League Chine
    'usa.1': 18,          # MLS
    # --- Basketball ---
    'nba': 177,
    'fra.1': 2857,        # ⚠ collision: ESPN uses fra.1 for basket ProB too
    # (The code collision on 'fra.1' between foot+basket is resolved at
    # lookup-time by checking event.sport first.)
    # --- Hockey ---
    'nhl': 142,
    'sweden.shl': 115,
    'finland.liiga': 108,
    'switzerland.nl': 96,
    # --- Baseball ---
    'mlb': 25,
    # --- Football US ---
    'nfl': 47,
    # Tennis is handled purely by tournament name (ATP/WTA tournament
    # names align closely between ESPN and Winamax).
}


# Heuristic stopwords for fuzzy league name matching
_LEAGUE_STOPWORDS = {
    'la', 'le', 'les', 'de', 'du', 'des', 'el', 'da', 'do', 'di',
    'a', 'i', 'o', 'en', 'the', 'and', 'et', 'y', 'ey',
    'liga', 'league', 'ligue', 'cup', 'coupe', 'division',
    'primera', 'primeira', 'super',
}


def _league_tokens(name: str) -> set[str]:
    """Significant tokens for league-name matching (length >= 4, not stopwords)."""
    if not name:
        return set()
    s = unicodedata.normalize('NFD', name).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    return {t for t in s.split() if len(t) >= 4 and t not in _LEAGUE_STOPWORDS}


def _leagues_match(espn_name: str, wmx_name: str) -> bool:
    """Conservative league-name matcher. Returns True only when there's a
    strong signal they refer to the same competition.
    """
    e_norm = _norm(espn_name)
    w_norm = _norm(wmx_name)
    if not e_norm or not w_norm:
        return False
    # Exact normalized equality (best signal)
    if e_norm == w_norm:
        return True
    # Substring match where the shorter name is >= 6 chars (filters out
    # short common words but catches "LaLiga" ⊆ "La Liga 2" etc.)
    shorter, longer = sorted([e_norm, w_norm], key=len)
    if len(shorter) >= 6 and shorter in longer:
        return True
    # Significant token overlap: require all tokens of the shorter name
    # to appear in the longer one, with at least one shared token of
    # length >= 5 (so single "serie" match isn't enough but "bundesliga",
    # "allsvenskan", "eredivisie" are).
    e_t = _league_tokens(espn_name)
    w_t = _league_tokens(wmx_name)
    if not e_t or not w_t:
        return False
    shared = e_t & w_t
    if not shared:
        return False
    short_t, long_t = (e_t, w_t) if len(e_t) <= len(w_t) else (w_t, e_t)
    if not short_t.issubset(long_t):
        return False
    # At least one token must be meaningful (≥5 chars)
    return any(len(t) >= 5 for t in shared)


def _norm(s: str | None) -> str:
    """Lowercase, strip accents, keep only alphanumerics. Safe on None."""
    if not s:
        return ''
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]', '', s.lower())


def _load_catalog() -> dict | None:
    """Lazy-load winamax_catalog.json. Returns None if missing or invalid."""
    global _CATALOG_CACHE
    if _CATALOG_CACHE is not None:
        return _CATALOG_CACHE
    if not _CATALOG_PATH.exists():
        return None
    try:
        _CATALOG_CACHE = json.loads(_CATALOG_PATH.read_text(encoding='utf-8'))
        return _CATALOG_CACHE
    except (json.JSONDecodeError, OSError):
        return None


def _tournaments_for_sport(sport_id: int) -> list[dict]:
    catalog = _load_catalog()
    if not catalog:
        return []
    return [t for t in catalog.get('tournaments', []) if t.get('sport_id') == sport_id]


# Alias map for cross-language team name variants. ESPN serves names in
# English/Spanish/Italian/etc., Winamax uses French translations. Without
# this, "Barcelona" (ESPN) vs "Barcelone" (Winamax FR) would not share a
# single token and the match drops out of the catalog → user sees a hole
# in today's La Liga listing. Keep one canonical token per concept; both
# the ESPN form and the Winamax form normalize to it.
# Format: { normalized_input_token : canonical_token }
# normalized_input_token = output of _norm() (lowercase, no accents, no spaces)
_TEAM_NAME_ALIASES: dict[str, str] = {
    # Spain — La Liga
    'barcelona': 'barca', 'barcelone': 'barca', 'fcbarcelona': 'barca', 'fcbarcelone': 'barca',
    'mallorca': 'mallorca', 'majorque': 'mallorca',
    'sevilla': 'sevilla', 'seville': 'sevilla',
    'realsociedad': 'sociedad',
    'realmadrid': 'realmadrid',  # already aligned, but pin the canonical
    'realbetis': 'betis', 'betis': 'betis', 'betissevilla': 'betis',
    'espanyol': 'espanyol', 'espanyolbarcelone': 'espanyol',
    'rayovallecano': 'rayo',
    'celta': 'celta', 'celtavigo': 'celta',
    'realsaragosse': 'zaragoza', 'realzaragoza': 'zaragoza', 'saragosse': 'zaragoza', 'zaragoza': 'zaragoza',
    'corogne': 'coruna', 'lacoruna': 'coruna', 'depcoruna': 'coruna', 'deportivolacoruna': 'coruna',
    'gijon': 'gijon', 'sportinggijon': 'gijon',
    'malaga': 'malaga',
    'grenade': 'granada', 'granada': 'granada',
    # Italy
    'naples': 'napoli', 'napoli': 'napoli',
    'milan': 'milan', 'acmilan': 'milan',
    'inter': 'inter', 'intermilan': 'inter', 'internazionale': 'inter',
    'come': 'como', 'como': 'como',
    'rome': 'roma', 'roma': 'roma', 'asrome': 'roma', 'asroma': 'roma',
    'bologne': 'bologna', 'bologna': 'bologna',
    'turin': 'torino', 'torino': 'torino',
    'juventus': 'juventus', 'juve': 'juventus',
    'fiorentina': 'fiorentina', 'florence': 'fiorentina',
    'cagliari': 'cagliari',
    # Germany
    'munich': 'munchen', 'munchen': 'munchen', 'bayernmunich': 'bayern', 'bayern': 'bayern',
    'breme': 'bremen', 'bremen': 'bremen', 'werderbreme': 'werder', 'werderbremen': 'werder', 'werder': 'werder',
    'cologne': 'koln', 'koln': 'koln', 'fccologne': 'koln',
    'fribourg': 'freiburg', 'freiburg': 'freiburg',
    'mayence': 'mainz', 'mainz': 'mainz',
    'hanovre': 'hannover', 'hannover': 'hannover',
    'augsbourg': 'augsburg', 'augsburg': 'augsburg',
    'nuremberg': 'nurnberg', 'nurnberg': 'nurnberg',
    'wolfsbourg': 'wolfsburg', 'wolfsburg': 'wolfsburg',
    'francfort': 'frankfurt', 'frankfurt': 'frankfurt', 'eintrachtfrancfort': 'frankfurt',
    # Czech / Eastern Europe
    'praguesparta': 'sparta', 'sparta': 'sparta', 'spartaprague': 'sparta',
    'slaviaprague': 'slavia', 'slavia': 'slavia',
    'duklaprague': 'dukla',
    'plzen': 'plzen', 'viktoriaplzen': 'plzen',
    # Portugal
    'porto': 'porto', 'fcporto': 'porto',
    'sporting': 'sporting', 'sportingportugal': 'sporting',
    'benfica': 'benfica',
    'bragua': 'braga', 'braga': 'braga',
    # Misc European common
    'ac': '',  # noise
}


def _alias(token: str) -> str:
    """Map a normalized token through the alias table. Returns the canonical
    form (e.g. 'barcelone' → 'barca') or the input unchanged if no alias."""
    return _TEAM_NAME_ALIASES.get(token, token)


def _name_tokens(full_name: str) -> set[str]:
    """Break a player/team name into normalized last-name tokens.

    Tennis Winamax strings are full names ("Nuno Borges"), ESPN delivers
    the same ("Nuno Borges") OR initialed forms ("Borges N."). We tokenize
    and look for *any* shared token ≥ 3 chars to match across formats.
    Short tokens (de, la, van…) are filtered since they'd cause false hits.

    v30 fix: also pass each token through _alias() so cross-language variants
    (Barcelona ↔ Barcelone, Mallorca ↔ Majorque) collapse to a shared canonical
    token. Without this, ESPN→Winamax matching drops half the La Liga slate
    on French-localized Winamax catalogs.
    """
    if not full_name:
        return set()
    # Strip trailing "X." initial (ESPN tennis short form)
    s = re.sub(r'\s+[A-Za-z]\.$', '', full_name.strip())
    toks = set()
    # Also tokenize the FULL normalized name (sometimes "FC Barcelone" → 'fcbarcelone'
    # is the only form that maps cleanly via the alias table).
    full_norm = _norm(s)
    if full_norm:
        a = _alias(full_norm)
        if a and len(a) >= 3:
            toks.add(a)
    for t in re.split(r'[\s\-]+', s):
        nt = _norm(t)
        if len(nt) >= 3:
            toks.add(_alias(nt))
    # Drop any empty strings introduced by aliases that map to ''
    toks.discard('')
    return toks


def _match_by_names(home_espn: str, away_espn: str, matches: list[dict]) -> dict | None:
    """Find the Winamax match whose players overlap with the ESPN event.

    Returns the matching dict from the catalog (with match_id, home, away),
    or None if no pair scores a full home+away overlap.
    """
    h_e = _name_tokens(home_espn)
    a_e = _name_tokens(away_espn)
    if not h_e or not a_e:
        return None
    for m in matches:
        h_w = _name_tokens(m.get('home', ''))
        a_w = _name_tokens(m.get('away', ''))
        # Direct orientation: home↔home, away↔away
        if (h_e & h_w) and (a_e & a_w):
            return m
        # Reversed (Winamax sometimes flips home/away vs ESPN)
        if (h_e & a_w) and (a_e & h_w):
            return m
    return None


def lookup_catalog(event: dict) -> dict | None:
    """Return {available, url, note, match_id, tournament} if event matches a
    real Winamax match/tournament; None if catalog unavailable or no match.

    Match resolution:
      1. Sport mapping (ESPN sport → Winamax sport_id).
      2. Tournament match:
         a) Explicit ESPN-code → Winamax-tournament-id (authoritative).
         b) Otherwise, conservative league-name match (_leagues_match).
      3. Match-level: player/team name intersection on the matched tournament.
         If no individual match matches → available=False (quali, retired,
         doubles Winamax doesn't book, etc.).
    """
    sport = event.get('sport') or ''
    wmx_sport = _ESPN_TO_WINAMAX_SPORT.get(sport)
    if wmx_sport is None:
        return None

    tourns = _tournaments_for_sport(wmx_sport)
    if not tourns:
        return None

    comps = event.get('competitors') or []
    if len(comps) < 2:
        return None
    home = next((c for c in comps if c.get('home_away') == 'home'), comps[0])
    away = next((c for c in comps if c.get('home_away') == 'away'), comps[1])

    code = event.get('league_code') or ''
    # Stage 1a: explicit ESPN code → Winamax tournament_id.
    # Scoped per sport to handle ESPN code collisions (e.g. 'fra.1' can be
    # football Ligue 1 OR basketball ProA depending on the event's sport).
    candidates: list[dict] = []
    if code in _ESPN_CODE_TO_WMX_TID:
        want_tid = _ESPN_CODE_TO_WMX_TID[code]
        for t in tourns:
            if t.get('tournament_id') == want_tid:
                candidates.append(t)
        if candidates:
            # If the explicit-code tournament is in the catalog but that
            # match isn't listed → hard no (signal that Winamax stopped
            # offering this specific fixture).
            return _resolve_from_candidates(candidates, home, away,
                                            note_not_found='match_not_in_listed_tournament')

    # Stage 1b: fallback to conservative name matching.
    league_name = event.get('league_name') or ''
    for t in tourns:
        if _leagues_match(league_name, t.get('tournament_name') or ''):
            candidates.append(t)

    if not candidates:
        return {
            'available': False,
            'url': None,
            'note': 'no_catalog_tournament_match',
        }

    return _resolve_from_candidates(candidates, home, away,
                                    note_not_found='tournament_in_catalog_but_match_not_listed')


def _resolve_from_candidates(candidates: list[dict], home: dict, away: dict,
                             note_not_found: str) -> dict:
    """Try to find a player/team match in any candidate tournament. Returns
    available=True with a match-level URL if found, else available=False.
    """
    for t in candidates:
        matches = t.get('matches') or []
        matched = _match_by_names(home.get('name') or '', away.get('name') or '', matches)
        if matched:
            return {
                'available': True,
                'url': f"{t['url']}?match={matched['match_id']}",
                'note': None,
                'match_id': matched['match_id'],
                'tournament': t['tournament_name'],
            }
    return {
        'available': False,
        'url': None,
        'note': note_not_found,
    }


# ---------------------------------------------------------------------------
# Static heuristics (fallback path)
# ---------------------------------------------------------------------------

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
    """event has: sport='tennis', league_code in ['atp','wta'], league_name (tournament name).

    Winamax only covers ATP/WTA **main draw singles**. Explicitly filtered out:
      * Challenger / ITF tours (always)
      * Qualifying rounds (Winamax doesn't book them, even for Masters 1000 / Slams)
      * Doubles / mixed draws (Winamax rarely books these, and the dashboard model is
        tuned for singles — avoid surfacing them as picks)
    """
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
    # Qualifying rounds: ESPN labels them 'Qualifying 1st Round', 'Qualifying Final', etc.
    round_name = (event.get('round') or '').lower()
    if 'qualif' in round_name:
        return (False, None)
    # Doubles / mixed: ESPN's grouping slug is 'mens-doubles', 'womens-doubles', 'mixed-doubles'.
    # Keep only singles draws.
    draw = (event.get('draw') or '').lower()
    if draw and 'doubles' in draw:
        return (False, None)
    if draw and 'mixed' in draw:
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
    """Return dict with keys: available (bool), url (str|None), note (str|None).

    Primary path: the dynamic catalog (ground truth, scraped from Winamax).
    Fallback path: static heuristic tables — only used when the catalog file
    is missing (first bootstrap) or the event's sport isn't in the catalog.
    """
    # Try catalog first. It returns None if no data available for this sport.
    cat_res = lookup_catalog(event)
    if cat_res is not None:
        # v30 — Catalog gave a definitive answer? trust it. Catalog said
        # available=True OR catalog said available=False with a STRONG signal
        # ("match_not_in_listed_tournament" = explicit ESPN→Winamax tid mapping
        # exists, tournament IS in catalog, this exact match isn't booked).
        # In all other "weak" failure modes ("no_catalog_tournament_match",
        # "tournament_in_catalog_but_match_not_listed") the catalog might just
        # be partial — fall back to legacy heuristics (broad coverage so
        # Théo doesn't lose betable matches that the scraper missed).
        weak_notes = {'no_catalog_tournament_match',
                      'tournament_in_catalog_but_match_not_listed'}
        if cat_res['available'] or cat_res.get('note') not in weak_notes:
            return {
                'available': cat_res['available'],
                'url': cat_res['url'],
                'note': cat_res['note'],
                'match_id': cat_res.get('match_id'),
                'tournament': cat_res.get('tournament'),
            }
        # else: weak miss → fall through to legacy heuristics below.

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

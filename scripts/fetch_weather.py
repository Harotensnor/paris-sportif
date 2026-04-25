#!/usr/bin/env python3
"""Fetch match-time weather from Open-Meteo and write weather.json.

Open-Meteo (https://open-meteo.com) is free, requires no API key, and has
plenty of capacity. We resolve each football match's home team to a
city → lat/lon using:
  1. A static map of major clubs (kept small — top ~100 clubs).
  2. A geocoding fallback via their /v1/search endpoint (cached locally).

Then we call /v1/forecast with hourly precipitation + wind + temperature,
indexed to the hour closest to the match kickoff. Cached per match id so
repeated cron ticks don't re-hit Open-Meteo.

Why weather matters for pronostics (football):
- Heavy rain: wet ball, slow passing — typically -0.2 to -0.4 goals vs
  a dry day. Shift Poisson xG lightly toward unders.
- Strong wind (>25 km/h): degrades long-range shots + crosses.
  Historically small but measurable -0.1 to -0.2 effect on totals.
- Cold (<5°C): marginal effect, we ignore it.
- Snow/fog: very rare in our pipeline; treat like heavy rain.

Cadence: weather forecasts stabilize ~12h before kickoff, so refreshing
every 30min for matches in the next 36h is more than enough. We
self-throttle: skip if the cached entry is <30min old AND the kickoff
is >6h away. Last-6h matches get a refresh on every tick.

Output structure:
    {
      "generated_at": "...",
      "matches": {
        "<match_id>": {
          "city": "Barcelona",
          "lat": 41.39, "lon": 2.17,
          "kickoff": "2026-04-20T20:00:00Z",
          "temp_c": 14,
          "wind_kmh": 18,
          "precip_mm": 0.3,
          "weather_code": 51,
          "fetched_at": "..."
        },
        ...
      }
    }
"""
from __future__ import annotations
import json
import re
import sys
import time
import unicodedata
from datetime import datetime, timezone, timedelta
from pathlib import Path

try:
    from curl_cffi import requests as _req
    _IMPERSONATE = True
except ImportError:
    import requests as _req
    _IMPERSONATE = False

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data.js'
OUT = ROOT / 'weather.json'
GEO_CACHE = ROOT / 'weather_geo_cache.json'

# Static map: team normalized name → (city, lat, lon). Keep narrow — geocoding
# fallback handles the long tail. Focused on top-5 leagues + Russia + Portugal
# + a few MLS/LigaMX host cities.
CITIES: dict[str, tuple[str, float, float]] = {
    # Premier League
    'arsenal': ('London', 51.5550, -0.1086),
    'chelsea': ('London', 51.4816, -0.1910),
    'tottenham': ('London', 51.6043, -0.0665),
    'tottenhamhotspur': ('London', 51.6043, -0.0665),
    'westham': ('London', 51.5389, -0.0166),
    'westhamunited': ('London', 51.5389, -0.0166),
    'fulham': ('London', 51.4748, -0.2216),
    'crystalpalace': ('London', 51.3983, -0.0855),
    'brentford': ('London', 51.4906, -0.2885),
    'manchestercity': ('Manchester', 53.4831, -2.2004),
    'manchesterunited': ('Manchester', 53.4631, -2.2914),
    'liverpool': ('Liverpool', 53.4308, -2.9608),
    'everton': ('Liverpool', 53.4388, -2.9663),
    'newcastle': ('Newcastle', 54.9756, -1.6218),
    'newcastleunited': ('Newcastle', 54.9756, -1.6218),
    'astonvilla': ('Birmingham', 52.5091, -1.8849),
    'wolves': ('Wolverhampton', 52.5901, -2.1302),
    'wolverhamptonwanderers': ('Wolverhampton', 52.5901, -2.1302),
    'brighton': ('Brighton', 50.8615, -0.0837),
    'brightonhovealbion': ('Brighton', 50.8615, -0.0837),
    'bournemouth': ('Bournemouth', 50.7353, -1.8384),
    'nottinghamforest': ('Nottingham', 52.9400, -1.1320),
    'leicester': ('Leicester', 52.6204, -1.1422),
    'leicestercity': ('Leicester', 52.6204, -1.1422),
    'leeds': ('Leeds', 53.7777, -1.5722),
    'leedsunited': ('Leeds', 53.7777, -1.5722),
    'ipswich': ('Ipswich', 52.0551, 1.1440),
    'southampton': ('Southampton', 50.9058, -1.3911),
    # Ligue 1
    'parissaintgermain': ('Paris', 48.8414, 2.2530),
    'psg': ('Paris', 48.8414, 2.2530),
    'olympiquemarseille': ('Marseille', 43.2697, 5.3958),
    'marseille': ('Marseille', 43.2697, 5.3958),
    'olympiquelyonnais': ('Lyon', 45.7653, 4.9822),
    'lyon': ('Lyon', 45.7653, 4.9822),
    'monaco': ('Monaco', 43.7272, 7.4156),
    'lille': ('Lille', 50.6119, 3.1301),
    'lillosc': ('Lille', 50.6119, 3.1301),
    'rennes': ('Rennes', 48.1075, -1.7075),
    'staderennais': ('Rennes', 48.1075, -1.7075),
    'nice': ('Nice', 43.7050, 7.1925),
    'ogcnice': ('Nice', 43.7050, 7.1925),
    'nantes': ('Nantes', 47.2558, -1.5250),
    'strasbourg': ('Strasbourg', 48.5600, 7.7544),
    'toulouse': ('Toulouse', 43.5832, 1.4337),
    'montpellier': ('Montpellier', 43.6222, 3.8117),
    'lens': ('Lens', 50.4325, 2.8144),
    'rclens': ('Lens', 50.4325, 2.8144),
    'reims': ('Reims', 49.2464, 4.0253),
    'brest': ('Brest', 48.4028, -4.4617),
    'lehavre': ('Le Havre', 49.4944, 0.1079),
    'angers': ('Angers', 47.4700, -0.5306),
    'auxerre': ('Auxerre', 47.7950, 3.5685),
    'saintetienne': ('Saint-Etienne', 45.4386, 4.3919),
    # La Liga
    'realmadrid': ('Madrid', 40.4531, -3.6883),
    'atleticomadrid': ('Madrid', 40.4362, -3.5994),
    'barcelona': ('Barcelona', 41.3809, 2.1228),
    'fcbarcelona': ('Barcelona', 41.3809, 2.1228),
    'realsociedad': ('San Sebastian', 43.3014, -1.9736),
    'athleticclub': ('Bilbao', 43.2642, -2.9493),
    'sevilla': ('Seville', 37.3839, -5.9703),
    'valencia': ('Valencia', 39.4747, -0.3583),
    'villarreal': ('Villarreal', 39.9442, -0.1036),
    'betis': ('Seville', 37.3564, -5.9808),
    'realbetis': ('Seville', 37.3564, -5.9808),
    'osasuna': ('Pamplona', 42.7968, -1.6370),
    'celtavigo': ('Vigo', 42.2119, -8.7397),
    'rayovallecano': ('Madrid', 40.3917, -3.6586),
    'getafe': ('Madrid', 40.3253, -3.7147),
    'mallorca': ('Palma de Mallorca', 39.5897, 2.6511),
    'almeria': ('Almeria', 36.8386, -2.4400),
    'alaves': ('Vitoria', 42.8372, -2.6889),
    'espanyol': ('Barcelona', 41.3471, 2.0777),
    'valladolid': ('Valladolid', 41.6442, -4.7614),
    'granada': ('Granada', 37.1533, -3.5956),
    'cadiz': ('Cadiz', 36.5022, -6.2725),
    'leganes': ('Madrid', 40.3400, -3.7639),
    # Bundesliga
    'bayernmunchen': ('Munich', 48.2188, 11.6247),
    'bayern': ('Munich', 48.2188, 11.6247),
    'dortmund': ('Dortmund', 51.4925, 7.4519),
    'borussiadortmund': ('Dortmund', 51.4925, 7.4519),
    'leverkusen': ('Leverkusen', 51.0381, 7.0023),
    'bayerleverkusen': ('Leverkusen', 51.0381, 7.0023),
    'leipzig': ('Leipzig', 51.3458, 12.3481),
    'rbleipzig': ('Leipzig', 51.3458, 12.3481),
    'frankfurt': ('Frankfurt', 50.0688, 8.6453),
    'eintrachtfrankfurt': ('Frankfurt', 50.0688, 8.6453),
    'stuttgart': ('Stuttgart', 48.7928, 9.2320),
    'vfbstuttgart': ('Stuttgart', 48.7928, 9.2320),
    'hoffenheim': ('Sinsheim', 49.2389, 8.8875),
    'freiburg': ('Freiburg', 48.0211, 7.8300),
    'union': ('Berlin', 52.4572, 13.5683),
    'unionberlin': ('Berlin', 52.4572, 13.5683),
    'wolfsburg': ('Wolfsburg', 52.4336, 10.8039),
    'vflwolfsburg': ('Wolfsburg', 52.4336, 10.8039),
    'monchengladbach': ('Monchengladbach', 51.1744, 6.3856),
    'borussiamonchengladbach': ('Monchengladbach', 51.1744, 6.3856),
    'mainz': ('Mainz', 49.9844, 8.2247),
    'werder': ('Bremen', 53.0664, 8.8380),
    'werderbremen': ('Bremen', 53.0664, 8.8380),
    'augsburg': ('Augsburg', 48.3231, 10.8850),
    'bochum': ('Bochum', 51.4897, 7.2367),
    'heidenheim': ('Heidenheim', 48.6731, 10.1508),
    # Serie A
    'juventus': ('Turin', 45.1097, 7.6411),
    'intermilan': ('Milan', 45.4781, 9.1240),
    'milan': ('Milan', 45.4781, 9.1240),
    'inter': ('Milan', 45.4781, 9.1240),
    'roma': ('Rome', 41.9339, 12.4547),
    'asroma': ('Rome', 41.9339, 12.4547),
    'lazio': ('Rome', 41.9339, 12.4547),
    'napoli': ('Naples', 40.8278, 14.1930),
    'atalanta': ('Bergamo', 45.7086, 9.6806),
    'fiorentina': ('Florence', 43.7806, 11.2822),
    'bologna': ('Bologna', 44.4919, 11.3103),
    'torino': ('Turin', 45.1097, 7.6411),
    'genoa': ('Genoa', 44.4161, 8.9525),
    'udinese': ('Udine', 46.0813, 13.2000),
    'cagliari': ('Cagliari', 39.2000, 9.1375),
    'verona': ('Verona', 45.4353, 11.0378),
    'hellasverona': ('Verona', 45.4353, 11.0378),
    'como': ('Como', 45.8103, 9.0856),
    'venezia': ('Venice', 45.4281, 12.3644),
    'lecce': ('Lecce', 40.3650, 18.2081),
    'parma': ('Parma', 44.7950, 10.3381),
    'monza': ('Monza', 45.5850, 9.2811),
    'empoli': ('Empoli', 43.7264, 10.9547),
}

# Headless User-Agent for endpoints that need it
HEADERS = {'User-Agent': 'Mozilla/5.0 (paris-sportif-dashboard)'}


def normalize(name: str) -> str:
    if not name:
        return ''
    n = unicodedata.normalize('NFKD', name).encode('ASCII', 'ignore').decode()
    return ''.join(c for c in n.lower() if c.isalnum())


def load_data_js() -> dict:
    txt = DATA_PATH.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        raise RuntimeError('could not parse data.js')
    return json.loads(m.group(1))


def load_cache() -> dict:
    if OUT.exists():
        try:
            return json.loads(OUT.read_text(encoding='utf-8')) or {}
        except Exception:
            return {}
    return {}


def load_geo_cache() -> dict:
    if GEO_CACHE.exists():
        try:
            return json.loads(GEO_CACHE.read_text(encoding='utf-8')) or {}
        except Exception:
            return {}
    return {}


def save_geo_cache(c: dict) -> None:
    try:
        GEO_CACHE.write_text(json.dumps(c, ensure_ascii=False, indent=2), encoding='utf-8')
    except Exception as e:
        print(f'[fetch_weather] geo cache save failed: {e}', file=sys.stderr)


def geocode(name: str, geo_cache: dict) -> tuple[str, float, float] | None:
    key = normalize(name)
    if key in geo_cache:
        hit = geo_cache[key]
        if hit is None or hit.get('ok') is False:
            return None
        return (hit['city'], hit['lat'], hit['lon'])
    url = f'https://geocoding-api.open-meteo.com/v1/search?name={name}&count=1&language=en'
    try:
        if _IMPERSONATE:
            r = _req.get(url, timeout=8, impersonate='chrome110')
        else:
            r = _req.get(url, timeout=8, headers=HEADERS)
        r.raise_for_status()
        j = r.json() or {}
        results = j.get('results') or []
        if not results:
            geo_cache[key] = {'ok': False}
            return None
        top = results[0]
        city = top.get('name') or name
        lat = float(top.get('latitude'))
        lon = float(top.get('longitude'))
        geo_cache[key] = {'ok': True, 'city': city, 'lat': lat, 'lon': lon}
        return (city, lat, lon)
    except Exception as e:
        print(f'[fetch_weather] geocode failed for {name}: {e}', file=sys.stderr)
        geo_cache[key] = {'ok': False}
        return None


def resolve_city(team_name: str, geo_cache: dict) -> tuple[str, float, float] | None:
    key = normalize(team_name)
    if key in CITIES:
        return CITIES[key]
    # Try suffix-strip
    for suf in ('fc', 'cf', 'ac', 'sc', 'united', 'city'):
        if key.endswith(suf):
            k2 = key[:-len(suf)]
            if k2 in CITIES:
                return CITIES[k2]
    # Geocode fallback
    return geocode(team_name, geo_cache)


def fetch_forecast(lat: float, lon: float, kickoff_iso: str) -> dict | None:
    """Fetch hourly forecast and pick the hour closest to kickoff."""
    # Open-Meteo wants YYYY-MM-DD range. Use the kickoff day; if kickoff >24h
    # out, use +3 days range to cover forecast window.
    try:
        ko = datetime.fromisoformat(kickoff_iso.replace('Z', '+00:00'))
    except Exception:
        return None
    start = ko.date().isoformat()
    end = (ko.date() + timedelta(days=1)).isoformat()
    url = (f'https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}'
           f'&hourly=temperature_2m,precipitation,wind_speed_10m,weather_code'
           f'&start_date={start}&end_date={end}&timezone=UTC')
    try:
        if _IMPERSONATE:
            r = _req.get(url, timeout=8, impersonate='chrome110')
        else:
            r = _req.get(url, timeout=8, headers=HEADERS)
        r.raise_for_status()
        j = r.json() or {}
        hourly = j.get('hourly') or {}
        times = hourly.get('time') or []
        if not times:
            return None
        # Find closest hour to kickoff
        target = ko.replace(minute=0, second=0, microsecond=0, tzinfo=timezone.utc)
        best_idx = None
        best_dt = None
        for i, t in enumerate(times):
            try:
                dt = datetime.fromisoformat(t).replace(tzinfo=timezone.utc)
            except Exception:
                continue
            diff = abs((dt - target).total_seconds())
            if best_dt is None or diff < best_dt:
                best_dt = diff
                best_idx = i
        if best_idx is None:
            return None
        temp = hourly.get('temperature_2m', [])
        prec = hourly.get('precipitation', [])
        wind = hourly.get('wind_speed_10m', [])
        code = hourly.get('weather_code', [])
        def g(arr, i): return arr[i] if i < len(arr) else None
        return {
            'temp_c': g(temp, best_idx),
            'precip_mm': g(prec, best_idx),
            'wind_kmh': g(wind, best_idx),
            'weather_code': g(code, best_idx),
        }
    except Exception as e:
        print(f'[fetch_weather] forecast failed for ({lat},{lon}): {e}', file=sys.stderr)
        return None


def is_fresh(entry: dict, kickoff_iso: str, now: datetime) -> bool:
    """Skip refresh if <30min old AND kickoff is >6h away."""
    try:
        fetched = datetime.fromisoformat(entry['fetched_at'].replace('Z', '+00:00'))
        ko = datetime.fromisoformat(kickoff_iso.replace('Z', '+00:00'))
        age_min = (now - fetched).total_seconds() / 60
        to_ko_hours = (ko - now).total_seconds() / 3600
        if age_min < 30 and to_ko_hours > 6:
            return True
    except Exception:
        pass
    return False


def main() -> int:
    data = load_data_js()
    days = data.get('days') or {}

    existing = load_cache()
    geo_cache = load_geo_cache()
    matches_out = dict(existing.get('matches') or {})

    now = datetime.now(timezone.utc)
    horizon = now + timedelta(hours=36)

    n_fresh = 0
    n_fetched = 0
    n_skipped = 0

    for _day, evs in days.items():
        for ev in (evs or []):
            if ev.get('sport') != 'football':
                continue
            if ev.get('completed'):
                continue
            mid = str(ev.get('id') or '')
            if not mid:
                continue
            ko_iso = ev.get('date') or ''
            if not ko_iso:
                continue
            try:
                ko = datetime.fromisoformat(ko_iso.replace('Z', '+00:00'))
            except Exception:
                continue
            if ko < now or ko > horizon:
                continue
            # Skip if fresh cache hit
            old = matches_out.get(mid) or {}
            if old and is_fresh(old, ko_iso, now):
                n_fresh += 1
                continue
            # Resolve home team → city. ESPN field is `home_away` (string), not
            # `home` (bool) — older code looked for the bool and silently
            # skipped every match. Bug fixed v30.
            comps = ev.get('competitors') or []
            home = next((c for c in comps if c.get('home_away') == 'home'), None)
            if not home:
                # Fallback : take the first competitor (some ESPN payloads
                # don't tag home_away on tournament-style sports).
                home = comps[0] if comps else None
            if not home:
                n_skipped += 1
                continue
            hname = home.get('name') or home.get('short') or ''
            loc = resolve_city(hname, geo_cache)
            if not loc:
                n_skipped += 1
                continue
            city, lat, lon = loc
            w = fetch_forecast(lat, lon, ko_iso)
            if not w:
                n_skipped += 1
                continue
            matches_out[mid] = {
                'city': city, 'lat': lat, 'lon': lon,
                'kickoff': ko_iso,
                'temp_c': w.get('temp_c'),
                'precip_mm': w.get('precip_mm'),
                'wind_kmh': w.get('wind_kmh'),
                'weather_code': w.get('weather_code'),
                'fetched_at': now.isoformat(),
            }
            n_fetched += 1
            # Respectful cadence to Open-Meteo
            time.sleep(0.15)

    save_geo_cache(geo_cache)
    out = {
        'generated_at': now.isoformat(),
        'matches': matches_out,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[fetch_weather] fresh={n_fresh} fetched={n_fetched} skipped={n_skipped} total={len(matches_out)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())

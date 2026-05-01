# Donnees cles observees

Date de l'audit : 2026-04-27.

Site audite : `https://harotensnor.github.io/paris-sportif/pronostics.html`

## Live data

- `generated_at` observe : `2026-04-27T15:40:30.387867Z`.
- Nombre de jours dans `data.days` : 19.
- Nombre total d'events observe : 925.
- Events futurs dans les 7 jours : 559.
- Events futurs avec mapping/cote Winamax exacte detectable : 323.
- Events futurs avec fallback externe ou absence de cote exacte detectable : 236.

## Providers detectes dans les events futurs problematiques

- `DraftKings`
- `Draft Kings`
- `TennisExplorer`
- `BetExplorer`
- `Winamax`
- `none` / provider absent selon certains events

## Cas donnees a regarder

Events sans competitors :

- `Cadillac Championship`, golf, 2026-04-30.
- `Crypto.com Miami Grand Prix`, racing, 2026-05-01.

Tennis termines avec status special :

- `STATUS_RETIRED`
- `STATUS_WALKOVER`

Contamination inter-sports detectee dans `data.live.js` :

- 925 events scannes.
- 7 entrees football avec stats de forme impossibles.
- Exemple : `Unión (Santa Fe)` contient des matchs contre `Boston Celtics`, scores de NBA.
- Autres equipes touchees : `Huracán`, `San Lorenzo`, `Boca Juniors`.
- 21 competitor IDs apparaissent dans plusieurs sports, ce qui renforce le besoin de namespace des caches.

Cotes exactes vs snapshot :

- 189 events futurs ont `winamax.match_id` + `winamax.markets`, mais `odds_snapshot.provider` reste externe.
- Claude doit verifier si le modele/affichage utilise vraiment `winamax.markets` ou encore `odds_snapshot`.

Meteo :

- 28 mismatches `venue_city` vs `weather.city` detectes.
- Certains sont des variantes de noms, d'autres semblent faux (`Tarma -> Ada`, `Stockholm -> Aiken`, `Cajamarca -> Utrecht`).

## Assets live

Assets principaux OK :

- `pronostics.html`
- `app.js`
- `app.css`
- `data.js`
- `data_today.json`
- `manifest.webmanifest`
- icons PWA
- pages statiques principales

Assets/problemes mineurs :

- `analytics.config.js` renvoie 404.
- `/favicon.ico` direct renvoie 404.
- certaines entrees service worker semblent redondantes.

## Performance observee en headless desktop

Ordres de grandeur :

- DOMContentLoaded : environ 1.2 s.
- Load : environ 1.35 s.
- `app.js` compresse transfere : environ 289 KB.
- `app.css` compresse transfere : environ 37 KB.
- `data.js` compresse transfere : environ 294 KB.
- `data_today.json` compresse transfere : environ 18 KB.

Attention : `data.js` et `data_today.json` semblent parfois charges en double a cause du couple preload + fetch versionne.

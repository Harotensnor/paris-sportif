#!/usr/bin/env python3
"""Tag every event in data.js with Winamax availability + deep link, and
collapse cross-day duplicates so each event is stored exactly once under
its Paris-local day key.

Runs after fetch_live / fetch_v3 / patch_odds. Idempotent.
"""
import json, re, sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import lookup

DATA_JS = Path(__file__).resolve().parent.parent / 'data.js'
HTML = Path(__file__).resolve().parent.parent / 'pronostics.html'

# Europe/Paris is UTC+1 in winter, UTC+2 in summer (CEST). April is CEST.
# A single +2h offset is good enough here because (a) all our day keys are
# within a ±10 day window and (b) the only DST transitions in that window
# are fringe cases. We never mix Paris dates across a DST boundary for
# a single run.
_PARIS_OFFSET = timezone(timedelta(hours=2))


def _paris_day(iso_date: str | None) -> str | None:
    """Convert an ISO-8601 UTC timestamp to 'YYYY-MM-DD' in Europe/Paris.
    Returns None on parse failure.
    """
    if not iso_date:
        return None
    try:
        dt = datetime.fromisoformat(iso_date.replace('Z', '+00:00'))
        return dt.astimezone(_PARIS_OFFSET).strftime('%Y-%m-%d')
    except (ValueError, AttributeError):
        return None


def main():
    t0 = datetime.now()
    text = DATA_JS.read_text(encoding='utf-8')
    data = json.loads(re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL).group(1))

    stats = {'tagged': 0, 'available': 0, 'dropped': 0, 'dedup_saved': 0}
    days = data.get('days', {}) or {}

    # Stage 1: walk every event, tag with Winamax info, track unique IDs.
    # We stream each event into a Paris-local day bucket (not its old key)
    # so that the final data.js has each event stored exactly once.
    by_paris_day: dict[str, list[dict]] = {}
    seen_ids: dict[str, str] = {}  # id -> the day we filed it under
    for day in list(days.keys()):
        for ev in days[day]:
            stats['tagged'] += 1
            info = lookup(ev)
            # Théo only bets on Winamax — non-Winamax events are stripped entirely.
            if not info['available']:
                stats['dropped'] += 1
                continue
            ev['winamax'] = {
                'available': True,
                'url': info['url'],
                'note': info['note'],
                'match_id': info.get('match_id'),
                'tournament': info.get('tournament'),
            }
            eid = str(ev.get('id') or '')
            if eid and eid in seen_ids:
                stats['dedup_saved'] += 1
                continue
            # File event under its Paris-local day (not the ingest day key).
            target_day = _paris_day(ev.get('date')) or day
            by_paris_day.setdefault(target_day, []).append(ev)
            if eid:
                seen_ids[eid] = target_day
            stats['available'] += 1

    # Stage 2: overwrite data['days'] with the deduped Paris-bucketed map.
    # Preserve the set of day keys that existed before (so the UI can show
    # empty-state "no events" instead of the day silently disappearing).
    new_days = {d: [] for d in days.keys()}
    for d, evs in by_paris_day.items():
        new_days.setdefault(d, []).extend(evs)
        # Sort each day by kickoff time for stable rendering.
        new_days[d].sort(key=lambda e: e.get('date') or '')
    data['days'] = new_days

    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')

    # Also inline into pronostics.html
    # v33.28 — HTML rewrite déplacé dans scripts/inject_data_in_html.py
    # (1 seul appel à la fin du pipeline plutôt que 12 regex sur ~13500 lignes)
    print(f'[{t0:%H:%M:%S}] winamax filter → {stats["tagged"]} events scanned, '
          f'{stats["available"]} kept on Winamax ({100*stats["available"]//max(1,stats["tagged"])}%), '
          f'{stats["dropped"]} dropped, {stats["dedup_saved"]} cross-day duplicates collapsed')


if __name__ == '__main__':
    main()

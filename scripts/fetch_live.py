#!/usr/bin/env python3
"""Lightweight live refresh — only today's events.

Reuses fetch_v3's per-sport fetchers and odds enrichment. Updates
just today's entry in data.js + re-inlines into pronostics.html.

Typical runtime: 8–15s (vs. ~75s for fetch_v3 full).
Runs: python3 fetch_live.py
"""
import json, re, time
from pathlib import Path
from datetime import datetime, timedelta
import importlib.util, sys

HERE = Path(__file__).resolve().parent
DATA_JS = Path(__file__).resolve().parent.parent / 'data.js'
HTML = Path(__file__).resolve().parent.parent / 'pronostics.html'
ODDS_HISTORY = Path(__file__).resolve().parent.parent / 'odds_history.jsonl'

# Import fetch_v3 as a module to reuse fetchers
spec = importlib.util.spec_from_file_location('v3', HERE / 'fetch_v3.py')
v3 = importlib.util.module_from_spec(spec); spec.loader.exec_module(v3)


def _seen_ids():
    """Load set of event IDs already archived, so we only write each one once."""
    seen = set()
    if not ODDS_HISTORY.exists():
        return seen
    try:
        with ODDS_HISTORY.open('r', encoding='utf-8') as f:
            for line in f:
                try:
                    rec = json.loads(line)
                    if rec.get('id'):
                        seen.add(str(rec['id']))
                except Exception:
                    continue
    except Exception:
        pass
    return seen


def _best_ml(event):
    """Pick one set of ML (DraftKings preferred)."""
    odds = event.get('odds') or []
    if not odds:
        return None
    preferred = next((o for o in odds if (o.get('provider') or '').lower().startswith('draftking') and o.get('homeML') and o.get('awayML')), None)
    if preferred:
        return preferred
    for o in odds:
        if o.get('homeML') and o.get('awayML'):
            return o
    return None


def archive_pre_match_odds(events):
    """Append ML odds for each new pre-kickoff event to ODDS_HISTORY (jsonl).
    Only writes an event the first time we see it (idempotent)."""
    now = datetime.utcnow()
    seen = _seen_ids()
    written = 0
    with ODDS_HISTORY.open('a', encoding='utf-8') as f:
        for ev in events:
            if ev.get('completed') or ev.get('status') == 'STATUS_IN_PROGRESS':
                continue
            eid = str(ev.get('id') or '')
            if not eid or eid in seen:
                continue
            ml = _best_ml(ev)
            if not ml:
                continue
            rec = {
                'id': eid,
                'sport': ev.get('sport'),
                'league_code': ev.get('league_code'),
                'date': ev.get('date'),
                'name': ev.get('name'),
                'captured_at': now.isoformat() + 'Z',
                'provider': ml.get('provider'),
                'homeML': ml.get('homeML'),
                'awayML': ml.get('awayML'),
                'drawML': ml.get('drawML'),
                'overUnder': ml.get('overUnder'),
                'spread': ml.get('spread'),
            }
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
            seen.add(eid)
            written += 1
    if written:
        print(f'  archived {written} new pre-match odds rows → {ODDS_HISTORY.name}', flush=True)


def rotate_odds_history(keep_days: int = 180, soft_cap: int = 20000):
    """Keep odds_history.jsonl from growing unbounded.
    Drops rows whose match `date` is older than `keep_days`, and also hard-caps
    at `soft_cap` rows (keeping the most recent). Runs in-place; no-ops if the
    file is missing or small. Any row we can't parse is dropped silently —
    the archive is only informational, not a source of truth."""
    if not ODDS_HISTORY.exists():
        return
    try:
        sz = ODDS_HISTORY.stat().st_size
    except OSError:
        return
    # Cheap guard: below ~2MB it's not worth rewriting on every tick.
    if sz < 2_000_000:
        # Still do a very light "lines count" trim only if file is long.
        with ODDS_HISTORY.open('r', encoding='utf-8') as f:
            lines = f.readlines()
        if len(lines) <= soft_cap:
            return
        # Over soft_cap: keep the last soft_cap lines.
        with ODDS_HISTORY.open('w', encoding='utf-8') as f:
            f.writelines(lines[-soft_cap:])
        print(f'  rotated odds_history: trimmed to last {soft_cap} rows', flush=True)
        return
    cutoff = datetime.utcnow() - timedelta(days=keep_days)
    kept = []
    dropped = 0
    with ODDS_HISTORY.open('r', encoding='utf-8') as f:
        for line in f:
            try:
                rec = json.loads(line)
            except Exception:
                dropped += 1
                continue
            raw = rec.get('date') or rec.get('captured_at') or ''
            try:
                iso = raw.replace('Z', '+00:00')
                dt = datetime.fromisoformat(iso)
                if dt.tzinfo is not None:
                    dt = dt.replace(tzinfo=None)
            except (ValueError, TypeError):
                kept.append(line)
                continue
            if dt < cutoff:
                dropped += 1
                continue
            kept.append(line)
    if len(kept) > soft_cap:
        kept = kept[-soft_cap:]
    with ODDS_HISTORY.open('w', encoding='utf-8') as f:
        f.writelines(kept)
    print(f'  rotated odds_history: dropped {dropped}, kept {len(kept)}', flush=True)


def main():
    t0 = time.time()
    today = datetime.now().date()
    print(f'[{datetime.now():%H:%M:%S}] Live refresh for {today}', flush=True)

    events = []
    events.extend(v3.fetch_soccer_day(today))
    events.extend(v3.fetch_basket_day(today))
    events.extend(v3.fetch_other_day(today))
    events.extend(v3.fetch_tennis_day(today))
    n_en = v3.enrich_odds_batch(events)
    print(f'  {len(events)} events, {n_en} enriched', flush=True)

    # Strip helper field
    for ev in events:
        ev.pop('_sport_path', None)

    # Archive pre-match odds (first time we see ML for a not-yet-started match).
    # This lets us compute real retrospective ROI later since ESPN drops odds post-kickoff.
    archive_pre_match_odds(events)
    # Keep the jsonl archive from growing forever. 180-day window + 20k-row cap.
    rotate_odds_history()

    # Merge into existing data.js
    text = DATA_JS.read_text(encoding='utf-8')
    data = json.loads(re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL).group(1))
    key = today.strftime('%Y-%m-%d')
    data['days'][key] = events
    data['today'] = key
    data['generated_at'] = datetime.utcnow().isoformat() + 'Z'

    # Save
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')

    # Re-inline into html (so file:// still works)
    html_text = HTML.read_text(encoding='utf-8')
    new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload};\n</script>'
    html_text = re.sub(r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
                       new_block, html_text, count=1, flags=re.DOTALL)
    HTML.write_text(html_text, encoding='utf-8')

    elapsed = time.time() - t0
    print(f'[{datetime.now():%H:%M:%S}] Done in {elapsed:.1f}s · data.js={DATA_JS.stat().st_size/1024:.0f}KB', flush=True)


if __name__ == '__main__':
    main()

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


def _last_capture_per_id():
    """For each event ID, return the most recent `captured_at` timestamp (datetime UTC).
    Used to throttle re-captures so we get a real time-series (sparkline UI)
    while keeping file growth bounded (cf rotate_odds_history)."""
    last: dict[str, datetime] = {}
    if not ODDS_HISTORY.exists():
        return last
    try:
        with ODDS_HISTORY.open('r', encoding='utf-8') as f:
            for line in f:
                try:
                    rec = json.loads(line)
                except Exception:
                    continue
                eid = rec.get('id')
                ts = rec.get('captured_at')
                if not eid or not ts:
                    continue
                try:
                    # ISO 8601 with trailing 'Z'
                    dt = datetime.fromisoformat(ts.rstrip('Z'))
                except Exception:
                    continue
                eid_s = str(eid)
                prev = last.get(eid_s)
                if prev is None or dt > prev:
                    last[eid_s] = dt
    except Exception:
        pass
    return last


def _seen_ids():
    """Backwards-compat shim — preserved for any external callers that
    still expect a flat set of IDs."""
    return set(_last_capture_per_id().keys())


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
    """Append ML odds for each pre-kickoff event to ODDS_HISTORY (jsonl).

    Captures :
      • the FIRST time we see a match (opening line)
      • again every RECAPTURE_HOURS afterwards, so we build a real
        time-series for the sparkline UI ("📉 Évolution cote") in
        pronostics.html. File growth stays bounded by rotate_odds_history()
        which trims to the last 20 000 rows.
    """
    RECAPTURE_HOURS = 2.0
    now = datetime.utcnow()
    last_seen = _last_capture_per_id()
    written = 0
    with ODDS_HISTORY.open('a', encoding='utf-8') as f:
        for ev in events:
            if ev.get('completed') or ev.get('status') == 'STATUS_IN_PROGRESS':
                continue
            eid = str(ev.get('id') or '')
            if not eid:
                continue
            prev = last_seen.get(eid)
            if prev is not None:
                age_h = (now - prev).total_seconds() / 3600.0
                if age_h < RECAPTURE_HOURS:
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
            last_seen[eid] = now
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

    # v32.1 — Robust mode : si un des fetch ESPN plante (network, timeout, ban),
    # on ne casse plus le pipeline. Avant : exception → script die → data.js
    # JAMAIS réécrit → generated_at stuck → SW ne se bumpe pas → users servent
    # ancien code via cache. Maintenant : on capture chaque fetch
    # individuellement, on garde les events qui ont marché, et on bumpe quand
    # même le `generated_at` (signale activité au pipeline + heartbeat) même
    # si tous les fetch plantent. Les events de la veille restent valides en
    # data.js[days][yesterday], donc la dégradation est gracieuse.
    events = []
    fetch_errors = []
    for fetcher_name in ('fetch_soccer_day', 'fetch_basket_day', 'fetch_other_day', 'fetch_tennis_day'):
        try:
            fn = getattr(v3, fetcher_name)
            evs = fn(today) or []
            events.extend(evs)
        except Exception as e:
            fetch_errors.append(f'{fetcher_name}: {type(e).__name__}: {str(e)[:80]}')
            print(f'  WARN {fetcher_name} failed: {e}', flush=True)

    n_en = 0
    try:
        n_en = v3.enrich_odds_batch(events)
    except Exception as e:
        fetch_errors.append(f'enrich_odds_batch: {type(e).__name__}: {str(e)[:80]}')
        print(f'  WARN enrich_odds_batch failed: {e}', flush=True)

    print(f'  {len(events)} events, {n_en} enriched, {len(fetch_errors)} fetcher error(s)', flush=True)

    # Strip helper field
    for ev in events:
        ev.pop('_sport_path', None)

    # Archive pre-match odds + rotate (each in its own try)
    try:
        archive_pre_match_odds(events)
    except Exception as e:
        print(f'  WARN archive_pre_match_odds failed: {e}', flush=True)
    try:
        rotate_odds_history()
    except Exception as e:
        print(f'  WARN rotate_odds_history failed: {e}', flush=True)

    # Merge into existing data.js — even if fetch failed, we always bump
    # generated_at to signal activity. The yesterday events are preserved.
    try:
        text = DATA_JS.read_text(encoding='utf-8')
        data = json.loads(re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL).group(1))
    except Exception as e:
        print(f'  ERROR cannot parse existing data.js: {e}', flush=True)
        return  # vraiment fatal, abort

    key = today.strftime('%Y-%m-%d')
    if events:
        # Got at least some events → replace today's bucket
        data['days'][key] = events
        data['today'] = key
    elif fetch_errors:
        # Tous les fetch ont planté. On garde l'ancien data['days'][key] s'il
        # existe (pas pire qu'avant) mais on log un sentinel dans le manifest.
        print(f'  All fetchers failed — keeping previous data[days][{key}]', flush=True)
        # Mark this attempt in a sentinel field for diagnostics
        data['last_fetch_error_at'] = datetime.utcnow().isoformat() + 'Z'
        data['last_fetch_errors'] = fetch_errors[:5]
    # ALWAYS bump generated_at to signal activity (allows SW + heartbeat to track)
    data['generated_at'] = datetime.utcnow().isoformat() + 'Z'

    # Save
    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')

    # Re-inline into html (so file:// still works)
    try:
        html_text = HTML.read_text(encoding='utf-8')
        new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload};\n</script>'
        html_text = re.sub(r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
                           new_block, html_text, count=1, flags=re.DOTALL)
        HTML.write_text(html_text, encoding='utf-8')
    except Exception as e:
        print(f'  WARN re-inline pronostics.html failed: {e}', flush=True)

    elapsed = time.time() - t0
    status = 'OK' if not fetch_errors else f'PARTIAL ({len(fetch_errors)} fetcher fails)' if events else 'KEPT-PREVIOUS'
    print(f'[{datetime.now():%H:%M:%S}] Done in {elapsed:.1f}s · data.js={DATA_JS.stat().st_size/1024:.0f}KB · status={status}', flush=True)


if __name__ == '__main__':
    main()

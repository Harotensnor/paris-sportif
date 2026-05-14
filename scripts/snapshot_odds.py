#!/usr/bin/env python3
"""
snapshot_odds.py — Freeze each match's pre-kickoff odds into `ev.odds_snapshot`.

ESPN removes the odds array once a match is completed, which means our
`predictMatch()` falls back to a static 55%-home prior for every finished
match, producing a meaningless "23/26 = 47% réussite" bilan that actually
just measures the home-team win rate rather than the model's picks.

This script runs every tick (in auto_refresh.py / refresh.yml) and, for every
upcoming event, copies `ev.odds` (and `ev.moneyline_*` fields) into
`ev.odds_snapshot`. Once written, the snapshot is NEVER overwritten — so
after the match ends it still holds the pre-match number we used to price
the pick.

Output shape on each event:
    ev.odds_snapshot = {
        'captured_at': ISO8601,
        'home': 1.85, 'draw': 3.40, 'away': 4.20,
        'provider': 'DraftKings',
    }

A second field `ev.closing_odds` is also written once the match is within
10 minutes of kickoff or has already started. The closing line is the most
efficient price the market produced — and CLV (closing-line value) is the
single best leading indicator that a bettor is actually beating the market.
By freezing the closing number too, the JS bilan can later compute:
    CLV_leg = (our_price - closing_price) / closing_price
positive = we locked in a better price than the market ended up settling at.

The JS side (`predictMatch` in pronostics.html) now reads `odds_snapshot`
as a fallback when `ev.odds` is empty, which lets us compute real
retrospective picks.
"""
import json, os, re, sys, time
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'data.js'
DATA_LITE_PATH = ROOT / 'data_lite.js'
DATA_PATHS = [DATA_PATH, DATA_LITE_PATH]
EXTERNAL_ODDS_PROVIDERS = {'draftkings', 'tennisexplorer', 'betexplorer', 'fanduel', 'caesars'}


def load_data(path=DATA_PATH):
    txt = path.read_text(encoding='utf-8')
    m = re.search(r'window\.PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print(f'[snapshot_odds] could not parse {path.name}', file=sys.stderr)
        sys.exit(1)
    return json.loads(m.group(1))


def save_data(d, path=DATA_PATH):
    content = 'window.PRONOSTICS_DATA = ' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';\n'
    tmp = path.with_name(f'{path.name}.{os.getpid()}.snapshot.tmp')
    last_error = None
    for attempt in range(3):
        try:
            tmp.write_text(content, encoding='utf-8')
            tmp.replace(path)
            return
        except OSError as error:
            last_error = error
            try:
                tmp.unlink(missing_ok=True)
            except OSError:
                pass
            time.sleep(0.25 * (attempt + 1))
    raise last_error


def best_odds_from_array(odds_arr):
    """Return (home, draw, away, provider) as the highest decimal odd we have.
    Works on both the decimal-odd shape and the ESPN moneyline (American) shape."""
    if not odds_arr:
        return None, None, None, None
    best_h = best_d = best_a = None
    prov = None
    for o in odds_arr:
        # Decimal shape (set by patch_odds.py / fetch_tennis_odds.py etc.)
        h = o.get('home')
        a = o.get('away')
        dr = o.get('draw')
        # American shape (ESPN core odds)
        if h is None and o.get('homeML') is not None:
            h = _ml_to_dec(o['homeML'])
        if a is None and o.get('awayML') is not None:
            a = _ml_to_dec(o['awayML'])
        if dr is None and o.get('drawML') is not None:
            dr = _ml_to_dec(o['drawML'])
        if h is not None and (best_h is None or h > best_h):
            best_h = h; prov = o.get('provider') or prov
        if a is not None and (best_a is None or a > best_a):
            best_a = a
        if dr is not None and (best_d is None or dr > best_d):
            best_d = dr
    return best_h, best_d, best_a, prov


def _ml_to_dec(ml):
    try:
        ml = float(ml)
    except (TypeError, ValueError):
        return None
    if ml > 0:
        return 1 + ml / 100
    if ml < 0:
        return 1 + 100 / abs(ml)
    return None


def _winamax_1n2_prices(event):
    """Return exact Winamax 1N2 prices when the match mapping is reliable."""
    wnx = event.get('winamax') or {}
    mks = wnx.get('markets') or {}
    m1n2 = mks.get('1n2') or {}
    wh = m1n2.get('home')
    wa = m1n2.get('away')
    wd = m1n2.get('draw')
    if wnx.get('match_id') and (wh or wa):
        return wh, wd, wa
    return None, None, None


def _secondary_winamax_markets(event):
    """Freeze Winamax secondary markets beside 1N2 for backtests."""
    wnx = event.get('winamax') or {}
    mks = wnx.get('markets') or {}
    secondary = {}
    ou25 = mks.get('ou25') or {}
    if ou25.get('over') or ou25.get('under'):
        secondary['ou25'] = {
            'over': round(float(ou25['over']), 3) if ou25.get('over') else None,
            'under': round(float(ou25['under']), 3) if ou25.get('under') else None,
        }
    btts = mks.get('btts') or {}
    if btts.get('yes') or btts.get('no'):
        secondary['btts'] = {
            'yes': round(float(btts['yes']), 3) if btts.get('yes') else None,
            'no': round(float(btts['no']), 3) if btts.get('no') else None,
        }
    # OU 1.5, OU 3.5 si dispo (formats variables sur Winamax)
    for line in ['1.5', '3.5']:
        ou = mks.get(f'ou{line.replace(".", "")}') or {}
        if ou.get('over') or ou.get('under'):
            key = f'ou{line.replace(".", "")}'
            secondary[key] = {
                'over': round(float(ou['over']), 3) if ou.get('over') else None,
                'under': round(float(ou['under']), 3) if ou.get('under') else None,
            }
    return secondary


def _build_winamax_snapshot(event, now_iso, replaced_provider=None):
    h, d, a = _winamax_1n2_prices(event)
    if not h and not a:
        return None
    snap = {
        'captured_at': now_iso,
        'home': round(float(h), 3) if h else None,
        'draw': round(float(d), 3) if d else None,
        'away': round(float(a), 3) if a else None,
        'provider': 'winamax',
        'source_priority': 'winamax_exact',
    }
    if replaced_provider:
        snap['replaced_provider'] = replaced_provider
    secondary = _secondary_winamax_markets(event)
    if secondary:
        snap['markets'] = secondary
    return snap


def snapshot(event, now_iso):
    """Capture current odds into ev.odds_snapshot (idempotent — only writes if
    snapshot missing AND match is still upcoming AND odds are real).

    AUDIT-2026-04-27 (Sprint 1 #1) — Sources étendues. Avant : ne lisait
    QUE event.odds (ESPN). Pour les qualifs WTA / Challenger / matchs où
    ESPN ne donne pas de cote, on tombait à `[]` et le bilan ne pouvait
    jamais évaluer ces picks → 24 matchs terminés sans cote (cf v31.7.92
    "non-trackables"). Désormais on essaie aussi `event.winamax.markets`
    en fallback, ce qui couvre les cas où le mapping Winamax exact
    existe mais ESPN n'a pas de odds.
    """
    # Don't snapshot live/completed matches — their odds are stale or gone
    status = event.get('status', '') or ''
    if event.get('completed') or 'IN_PROGRESS' in status or 'HALF' in status or 'FINAL' in status:
        return False
    existing = event.get('odds_snapshot') or {}
    existing_provider = str(existing.get('provider') or '').lower()
    # Sprint v35.264 — Winamax-only product rule. If a reliable Winamax match
    # mapping exists, it must beat any previously frozen external book price.
    if existing and (existing.get('home') or existing.get('away')):
        if existing_provider in EXTERNAL_ODDS_PROVIDERS:
            winamax_snap = _build_winamax_snapshot(event, now_iso, replaced_provider=existing_provider)
            if winamax_snap:
                event['odds_snapshot'] = winamax_snap
                return True
        return False

    # Prefer exact Winamax markets over ESPN/external arrays for new snapshots.
    winamax_snap = _build_winamax_snapshot(event, now_iso)
    if winamax_snap:
        event['odds_snapshot'] = winamax_snap
        return True

    h, d, a, prov = best_odds_from_array(event.get('odds') or [])
    if not h and not a:
        return False
    snap = {
        'captured_at': now_iso,
        'home': round(float(h), 3) if h else None,
        'draw': round(float(d), 3) if d else None,
        'away': round(float(a), 3) if a else None,
        'provider': prov,
    }
    # Sprint 67 (v31.7.155 — audit ChatGPT 2026-04-28 P0) — Snapshot per-marché
    # secondaire pour ROI per-marché. Lit Winamax markets (OU 2.5 + BTTS) et
    # les freeze dans odds_snapshot.markets pour que backtest_v2 puisse calculer
    # ROI par marché secondaire (avant : seul 1X2 était snapshoté).
    secondary = _secondary_winamax_markets(event)
    if secondary:
        snap['markets'] = secondary
    event['odds_snapshot'] = snap
    return True


def mature_snapshot(event, now_dt, now_iso):
    """v52.4 — CLV optimization (CLV_INVESTIGATION 2026-05-09 finding).
    Capture a "mature" odds snapshot at T<=4h pre-kickoff (idempotent — only
    written once). The early `odds_snapshot` is captured as soon as we discover
    the match (often T-24h+) and represents the price 24-48h before kickoff.
    The 1n2 CLV is -3.23% partly because the snapshot is too early to capture
    sharp money / news-driven line moves. This `mature_snapshot` field gives
    the bilan a closer-to-closing baseline for CLV calculation while keeping
    the original `odds_snapshot` for backwards compatibility."""
    if event.get('mature_snapshot') and (event['mature_snapshot'].get('home') or event['mature_snapshot'].get('away')):
        return False
    raw = event.get('date')
    if not raw:
        return False
    try:
        iso = raw.replace('Z', '+00:00')
        ko = datetime.fromisoformat(iso)
        if ko.tzinfo is None:
            ko = ko.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return False
    delta_min = (ko - now_dt).total_seconds() / 60.0
    # Window: [kickoff-240min, kickoff+15min]. The 4h pre-window captures the
    # "decision time" price after most line moves but before the match starts.
    if delta_min > 240 or delta_min < -15:
        return False
    # Prefer Winamax exact prices when available
    winamax_snap = _build_winamax_snapshot(event, now_iso)
    if winamax_snap:
        winamax_snap['minutes_to_ko'] = round(delta_min, 1)
        event['mature_snapshot'] = winamax_snap
        return True
    h, d, a, prov = best_odds_from_array(event.get('odds') or [])
    if not h and not a:
        return False
    event['mature_snapshot'] = {
        'captured_at': now_iso,
        'minutes_to_ko': round(delta_min, 1),
        'home': round(float(h), 3) if h else None,
        'draw': round(float(d), 3) if d else None,
        'away': round(float(a), 3) if a else None,
        'provider': prov,
    }
    return True


def closing_snapshot(event, now_dt, now_iso):
    """Capture the closing odds (≤10 min to kickoff). Idempotent — once written,
    never overwritten. The JS side can use this to compute CLV against the
    price we actually took (odds_snapshot)."""
    if event.get('closing_odds') and (event['closing_odds'].get('home') or event['closing_odds'].get('away')):
        return False
    # Need a valid kickoff datetime. Accept ISO with or without timezone.
    raw = event.get('date')
    if not raw:
        return False
    try:
        iso = raw.replace('Z', '+00:00')
        ko = datetime.fromisoformat(iso)
        if ko.tzinfo is None:
            ko = ko.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return False
    # Window: [kickoff-10min, kickoff+30min]. We want the latest price possible
    # while the ESPN odds array is still populated. After kickoff ESPN typically
    # drops the array within ~30 min, so that's the outer bound we try to grab.
    delta_min = (ko - now_dt).total_seconds() / 60.0
    if delta_min > 10:          # still too early
        return False
    if delta_min < -30:         # match has been running for more than 30 min — odds gone
        return False
    h, d, a, prov = best_odds_from_array(event.get('odds') or [])
    if not h and not a:
        return False
    event['closing_odds'] = {
        'captured_at': now_iso,
        'minutes_to_ko': round(delta_min, 1),
        'home': round(float(h), 3) if h else None,
        'draw': round(float(d), 3) if d else None,
        'away': round(float(a), 3) if a else None,
        'provider': prov,
    }
    return True


def main():
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    grand_total = 0
    grand_snaps = 0
    grand_matures = 0
    grand_closes = 0
    for path in DATA_PATHS:
        if not path.exists():
            continue
        d = load_data(path)
        new_snaps = 0
        new_matures = 0
        new_closes = 0
        total = 0
        for day_key, events in d.get('days', {}).items():
            for ev in events:
                total += 1
                if snapshot(ev, now_iso):
                    new_snaps += 1
                if mature_snapshot(ev, now_dt, now_iso):
                    new_matures += 1
                if closing_snapshot(ev, now_dt, now_iso):
                    new_closes += 1
        save_data(d, path)
        grand_total += total
        grand_snaps += new_snaps
        grand_matures += new_matures
        grand_closes += new_closes
        print(f'[snapshot_odds] {path.name} total={total} new_or_reprioritized_snapshots={new_snaps} new_mature_T-4h={new_matures} new_closing={new_closes}')
    print(f'[snapshot_odds] all total={grand_total} new_or_reprioritized_snapshots={grand_snaps} new_mature_T-4h={grand_matures} new_closing={grand_closes}')


if __name__ == '__main__':
    main()

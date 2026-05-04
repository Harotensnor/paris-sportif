#!/usr/bin/env python3
"""Detect smart-money style odds moves from odds_history.jsonl.

Output: smart_money_signals.json keyed by event id. Cadence: every tick.
"""
import json
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ODDS_HISTORY = ROOT / 'odds_history.jsonl'
OUT = ROOT / 'smart_money_signals.json'


def parse_dt(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    except Exception:
        return None


def ml_to_decimal(ml):
    try:
        ml = float(ml)
    except Exception:
        return None
    if not math.isfinite(ml) or ml == 0:
        return None
    return 1 + (100 / abs(ml) if ml < 0 else ml / 100)


def side_decimal(row, side):
    key = {'home': 'homeML', 'away': 'awayML', 'draw': 'drawML'}[side]
    return ml_to_decimal(row.get(key))


def market_shape(row):
    sides = {}
    for side in ('home', 'away', 'draw'):
        odd = side_decimal(row, side)
        if odd and odd > 1:
            sides[side] = odd
    if len(sides) < 2:
        return None
    implied_sum = sum(1 / odd for odd in sides.values())
    return {
        'sides': sides,
        'side_count': len(sides),
        'implied_sum': implied_sum,
        'margin': implied_sum - 1,
    }


def detect_market_uncertainty(first, latest):
    """Catch corrupted/noisy books before they become fake sharp signals."""
    open_shape = market_shape(first)
    latest_shape = market_shape(latest)
    if not open_shape or not latest_shape:
        return None

    common = [side for side in ('home', 'away') if side in open_shape['sides'] and side in latest_shape['sides']]
    drifts = {}
    for side in common:
        old = open_shape['sides'][side]
        new = latest_shape['sides'][side]
        if old > 1 and new > 1:
            drifts[side] = (new - old) / old

    both_main_sides_drift = len(drifts) >= 2 and all(v >= 0.08 for v in drifts.values())
    margin_expansion = latest_shape['margin'] - open_shape['margin']
    side_count = latest_shape['side_count']
    high_margin_limit = 0.12 if side_count == 2 else 0.18
    low_implied_limit = 0.98 if side_count == 2 else 1.00
    high_margin = latest_shape['margin'] > high_margin_limit
    low_implied = latest_shape['implied_sum'] < low_implied_limit

    if not (both_main_sides_drift or high_margin or low_implied or margin_expansion >= 0.06):
        return None

    reasons = []
    if both_main_sides_drift:
        reasons.append(
            f"home et away montent ensemble ({drifts.get('home', 0)*100:+.1f}% / {drifts.get('away', 0)*100:+.1f}%)"
        )
    if high_margin:
        reasons.append(f"marge bookmaker anormale {latest_shape['margin']*100:.1f}%")
    if low_implied:
        reasons.append(f"somme probabilites trop basse {latest_shape['implied_sum']*100:.1f}%")
    if margin_expansion >= 0.06:
        reasons.append(f"marge en hausse de {margin_expansion*100:.1f}pt")

    return {
        'status': 'market_uncertain',
        'reason': '; '.join(reasons),
        'open_implied_sum': round(open_shape['implied_sum'], 4),
        'latest_implied_sum': round(latest_shape['implied_sum'], 4),
        'open_margin_pct': round(open_shape['margin'] * 100, 2),
        'latest_margin_pct': round(latest_shape['margin'] * 100, 2),
        'margin_expansion_pct': round(margin_expansion * 100, 2),
        'home_drift_pct': round(drifts.get('home', 0) * 100, 2) if 'home' in drifts else None,
        'away_drift_pct': round(drifts.get('away', 0) * 100, 2) if 'away' in drifts else None,
        'side_count': side_count,
    }


def main():
    grouped = defaultdict(list)
    if not ODDS_HISTORY.exists():
        OUT.write_text(json.dumps({'generated_at': datetime.now(timezone.utc).isoformat(), 'signals': {}}, separators=(',', ':')), encoding='utf-8')
        print('[smart_money] odds_history missing, wrote empty signals')
        return 0

    with ODDS_HISTORY.open('r', encoding='utf-8') as f:
        for line in f:
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except Exception:
                continue
            mid = str(row.get('id') or '')
            cap = parse_dt(row.get('captured_at'))
            kickoff = parse_dt(row.get('date'))
            if not mid or not cap:
                continue
            row['_captured_dt'] = cap
            row['_kickoff_dt'] = kickoff
            grouped[mid].append(row)

    signals = {}
    now = datetime.now(timezone.utc)
    for mid, rows in grouped.items():
        rows.sort(key=lambda r: r['_captured_dt'])
        if len(rows) < 2:
            continue
        kickoff = rows[-1].get('_kickoff_dt')
        usable = [r for r in rows if not kickoff or r['_captured_dt'] <= kickoff]
        if len(usable) < 2:
            continue
        first = usable[0]
        latest = usable[-1]
        anomaly = detect_market_uncertainty(first, latest)
        best = None
        for side in ('home', 'away', 'draw'):
            open_odd = side_decimal(first, side)
            latest_odd = side_decimal(latest, side)
            if not open_odd or not latest_odd or open_odd <= 1 or latest_odd <= 1:
                continue
            drop_pct = (open_odd - latest_odd) / open_odd * 100
            if drop_pct < 8:
                continue
            if not best or drop_pct > best['odd_drop_pct']:
                best = {
                    'side': side,
                    'pick_key': {'home': '1', 'away': '2', 'draw': 'X'}[side],
                    'odd_open': round(open_odd, 3),
                    'odd_latest': round(latest_odd, 3),
                    'odd_drop_pct': round(drop_pct, 2),
                }
        if not best and not anomaly:
            continue
        if not best:
            best = {
                'side': None,
                'pick_key': None,
                'odd_open': None,
                'odd_latest': None,
                'odd_drop_pct': 0,
            }
        hours_to_kickoff = None
        if kickoff:
            hours_to_kickoff = (kickoff - latest['_captured_dt']).total_seconds() / 3600
        confidence = min(0.95, 0.45 + best['odd_drop_pct'] / 35 + min(len(usable), 8) * 0.025)
        best.update({
            'event_id': mid,
            'sport': latest.get('sport'),
            'league_code': latest.get('league_code'),
            'name': latest.get('name'),
            'snapshots': len(usable),
            'provider': latest.get('provider') or first.get('provider'),
            'captured_at_open': first.get('captured_at'),
            'captured_at_latest': latest.get('captured_at'),
            'kickoff': latest.get('date'),
            'hours_to_kickoff': round(hours_to_kickoff, 2) if hours_to_kickoff is not None else None,
            'confidence': round(confidence, 3),
            'fresh': (now - latest['_captured_dt']).total_seconds() <= 36 * 3600,
            'source': 'odds_history',
        })
        if anomaly:
            best['market_uncertain'] = anomaly
        signals[mid] = best

    payload = {
        'generated_at': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
        'schema': 'smart_money_signals_v2',
        'threshold_drop_pct': 8,
        'market_uncertain_count': sum(1 for sig in signals.values() if sig.get('market_uncertain')),
        'signals': signals,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'[smart_money] wrote {OUT.name} ({len(signals)} signals)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

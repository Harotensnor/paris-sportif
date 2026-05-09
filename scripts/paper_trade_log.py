#!/usr/bin/env python3
"""AUDIT 2026-05-09 v45.5 — Paper trading forward log.

Chaque cron tick, snapshot tous les v40-bettable picks (Outsider+Value+Flat
selon backtest_strategies leaderboard) dans `paper_log.jsonl`. Quand des
matchs se terminent, settle les paris dans `paper_log_settled.jsonl` et
calcule le rolling forward ROI dans `paper_log_summary.json`.

Différence avec backtest_v2.py :
- backtest_v2 = HISTORIQUE (picks passés + résolus déjà)
- paper_log = FUTUR (picks future + settlement live à mesure)

L'utilité : transparence "voici ce que le modèle promet AUJOURD'HUI,
voici comment ça performe au fil du temps". Bullshit-proof.

Output:
  paper_log.jsonl       — append-only stream of every snapshot
  paper_log_summary.json — rolling stats lus par le frontend
"""
from __future__ import annotations
import json
import os
import sys
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent

# Use io_compressed if available
try:
    sys.path.insert(0, str(ROOT / 'scripts'))
    from io_compressed import smart_open  # type: ignore
except Exception:
    smart_open = None


def _now_utc() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def _load_data_js():
    """Loads PRONOSTICS_DATA from data.js."""
    data_path = ROOT / 'data.js'
    if not data_path.exists():
        print('[paper-log] data.js absent, skip')
        return None
    raw = data_path.read_text(encoding='utf-8')
    # Strip "const PRONOSTICS_DATA = " prefix and trailing ;
    idx = raw.find('=')
    if idx < 0:
        return None
    body = raw[idx + 1:].strip()
    if body.endswith(';'):
        body = body[:-1]
    try:
        return json.loads(body)
    except Exception as e:
        print(f'[paper-log] failed to parse data.js : {e}')
        return None


def _load_existing_log():
    """Loads existing paper_log.jsonl + paper_log_settled.jsonl."""
    snapshots = []
    settled = []
    log_path = ROOT / 'paper_log.jsonl'
    settled_path = ROOT / 'paper_log_settled.jsonl'
    if log_path.exists():
        try:
            for line in log_path.read_text(encoding='utf-8').splitlines():
                if not line.strip():
                    continue
                try:
                    snapshots.append(json.loads(line))
                except Exception:
                    pass
        except Exception:
            pass
    if settled_path.exists():
        try:
            for line in settled_path.read_text(encoding='utf-8').splitlines():
                if not line.strip():
                    continue
                try:
                    settled.append(json.loads(line))
                except Exception:
                    pass
        except Exception:
            pass
    return snapshots, settled


def _evaluate_pick(match: dict, market: str, key: str) -> str | None:
    """Returns 'won'/'lost'/'void'/None. Mirror evaluateMarketPick frontend."""
    if not match.get('completed'):
        return None
    status = (match.get('status') or '').upper()
    if status in ('STATUS_POSTPONED', 'STATUS_CANCELED', 'STATUS_RETIRED', 'STATUS_WALKOVER'):
        return 'void'
    competitors = match.get('competitors') or []
    home = next((c for c in competitors if c.get('home_away') == 'home'), {})
    away = next((c for c in competitors if c.get('home_away') == 'away'), {})
    score_home = home.get('score')
    score_away = away.get('score')
    if score_home is None or score_away is None:
        return None
    try:
        sh = int(score_home)
        sa = int(score_away)
    except Exception:
        return None
    # 1n2
    if market == '1n2':
        winner = '1' if sh > sa else '2' if sa > sh else 'X'
        return 'won' if str(key) == winner else 'lost'
    # OU 2.5
    if market == 'ou25':
        total = sh + sa
        return 'won' if (str(key) == 'O' and total > 2.5) or (str(key) == 'U' and total < 2.5) else 'lost'
    # BTTS
    if market == 'btts':
        both = sh > 0 and sa > 0
        return 'won' if (str(key) == 'Y' and both) or (str(key) == 'N' and not both) else 'lost'
    # Other markets — return None (un-evaluatable) for now
    return None


def main() -> int:
    data = _load_data_js()
    if not data:
        print('[paper-log] no data, abort')
        return 0
    days = data.get('days') or {}
    today = data.get('today') or _now_utc()[:10]
    snapshots, settled = _load_existing_log()
    settled_ids = {s.get('snapshot_id') for s in settled}

    # SNAPSHOT : pour les events futurs (today + tomorrow + after-tomorrow), enregistre
    # la liste des picks misables détectés AUJOURD'HUI. On ne re-snapshot pas les events
    # déjà loggés à cette même date pour éviter le bruit.
    today_iso = today
    snapshot_ts = _now_utc()
    snapshot_dates = sorted([d for d in days.keys() if d >= today])[:3]
    new_snapshots = []
    seen_today = {s.get('match_id') for s in snapshots if s.get('snapshot_date_utc', '')[:10] == today_iso}
    for d in snapshot_dates:
        for m in (days.get(d) or []):
            mid = m.get('id')
            if not mid or mid in seen_today:
                continue
            # Naive eligibility : has odds + has competitors
            wm = m.get('winamax') or {}
            mk = wm.get('markets') or {}
            n12 = mk.get('1n2') or {}
            home_odd = n12.get('home')
            away_odd = n12.get('away')
            if not home_odd or not away_odd:
                continue
            # Take fav side (max prob = min odd)
            if home_odd <= away_odd:
                key, label, odd = '1', 'home', float(home_odd)
            else:
                key, label, odd = '2', 'away', float(away_odd)
            new_snapshots.append({
                'snapshot_id': f'{mid}-{snapshot_ts}',
                'snapshot_date_utc': snapshot_ts,
                'match_id': str(mid),
                'match_date': m.get('date'),
                'sport': m.get('sport'),
                'league_code': m.get('league_code'),
                'home': (m.get('competitors') or [{}])[0].get('name') if m.get('competitors') else None,
                'away': (m.get('competitors') or [{}, {}])[1].get('name') if (m.get('competitors') or []) and len(m.get('competitors')) > 1 else None,
                'market': '1n2',
                'pick_key': key,
                'pick_side': label,
                'odd': odd,
                'stake_units': 1,
                'note': 'fav-side baseline (no model loaded)'
            })

    # Append snapshots
    if new_snapshots:
        log_path = ROOT / 'paper_log.jsonl'
        with log_path.open('a', encoding='utf-8') as fp:
            for s in new_snapshots:
                fp.write(json.dumps(s, ensure_ascii=False) + '\n')
        print(f'[paper-log] +{len(new_snapshots)} new snapshots')

    # SETTLE : pour chaque snapshot non-encore settled, check si match complete
    settle_count = 0
    settled_path = ROOT / 'paper_log_settled.jsonl'
    snap_total = snapshots + new_snapshots
    for s in snap_total:
        sid = s.get('snapshot_id')
        if sid in settled_ids:
            continue
        mid = s.get('match_id')
        if not mid:
            continue
        # Find match in data
        found = None
        for d, evs in days.items():
            for m in evs or []:
                if str(m.get('id')) == mid:
                    found = m
                    break
            if found:
                break
        if not found or not found.get('completed'):
            continue
        result = _evaluate_pick(found, s.get('market', '1n2'), s.get('pick_key'))
        if result is None:
            continue
        odd = float(s.get('odd') or 0)
        stake = float(s.get('stake_units') or 1)
        pnl = stake * (odd - 1) if result == 'won' else -stake if result == 'lost' else 0.0
        settle_entry = {
            **s,
            'settled_at_utc': _now_utc(),
            'result': result,
            'pnl_units': pnl
        }
        with settled_path.open('a', encoding='utf-8') as fp:
            fp.write(json.dumps(settle_entry, ensure_ascii=False) + '\n')
        settled.append(settle_entry)
        settled_ids.add(sid)
        settle_count += 1

    if settle_count:
        print(f'[paper-log] settled {settle_count} snapshots')

    # SUMMARY
    n_total = len(snap_total)
    n_settled = len(settled)
    won = sum(1 for s in settled if s.get('result') == 'won')
    lost = sum(1 for s in settled if s.get('result') == 'lost')
    void = sum(1 for s in settled if s.get('result') == 'void')
    pnl_sum = sum(float(s.get('pnl_units') or 0) for s in settled)
    summary = {
        'generated_at': _now_utc(),
        'snapshot_count': n_total,
        'settled_count': n_settled,
        'pending_count': n_total - n_settled,
        'won': won,
        'lost': lost,
        'void': void,
        'win_rate': (won / (won + lost)) if (won + lost) > 0 else None,
        'pnl_units': pnl_sum,
        'roi_pct': (100.0 * pnl_sum / (won + lost)) if (won + lost) > 0 else None,
        'note': 'Paper trade log v45.5 — fav-side baseline, no calibration applied. Forward proof transparent.'
    }
    out_path = ROOT / 'paper_log_summary.json'
    out_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f'[paper-log] summary : {n_total} snapshots, {n_settled} settled, won={won} lost={lost} ROI={summary["roi_pct"]}')
    return 0


if __name__ == '__main__':
    sys.exit(main())

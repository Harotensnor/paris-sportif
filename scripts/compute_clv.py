#!/usr/bin/env python3
"""v33.32 — CLV (Closing Line Value) computation.

Le CLV mesure si le modèle prend des cotes avant que le marché ne se réajuste.
Concrètement : si on pari à @2.10 et que la cote ferme à @1.80, on a battu
le marché de +30pt — la cote moyenne du marché s'est rapprochée du "vrai"
résultat (le favori s'est confirmé). CLV+ sur le long terme = skill réel
(pas juste de la chance).

Approche :
1. Lit `odds_history.jsonl` (snapshots multiples par match au fil du temps)
2. Pour chaque match completed, trouve :
   - opening odds = première cote captured pour ce match
   - closing odds = dernière cote captured AVANT kickoff
3. Pour chaque pick (1/N/2), calcule :
   - CLV % = closing_implied_prob - opening_implied_prob
   - Positif = on a battu le marché ; négatif = on l'a chassé.
4. Output : `clv_history.json` avec un record par (match_id, pick).

Usage : python3 scripts/compute_clv.py

Ce CLV sert ensuite dans l'UI (badge "✓ Beat market +5pt" sur les paris)
et dans le bilan global ("Tu as battu le marché sur 67% de tes picks").

NOTE : odds en format moneyline US (ex: -135, +220). Conversion vers
décimale puis vers proba implicite. Drawline (drawML) optionnel selon sport.
"""
from __future__ import annotations
import json
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ODDS_HISTORY = ROOT / 'odds_history.jsonl'
DATA_JS = ROOT / 'data.js'
OUT = ROOT / 'clv_history.json'
OUT_SUMMARY = ROOT / 'clv_summary.json'


def write_json_atomic(path: Path, payload: dict) -> None:
    """Write JSON safely on Windows, where files may be briefly locked by the app."""
    text = json.dumps(payload, ensure_ascii=False, separators=(',', ':'))
    tmp = path.with_name(f'{path.name}.tmp')
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            tmp.write_text(text, encoding='utf-8')
            tmp.replace(path)
            return
        except OSError as exc:
            last_error = exc
            time.sleep(0.15 * (attempt + 1))
    raise last_error or OSError(f'Could not write {path}')


def ml_to_decimal(ml) -> float | None:
    """Convert moneyline (e.g. -135, +220) to decimal odds (e.g. 1.74, 3.20)."""
    if ml is None:
        return None
    try:
        v = float(ml)
    except (ValueError, TypeError):
        return None
    if v >= 100:
        return 1 + v / 100
    elif v <= -100:
        return 1 + 100 / abs(v)
    return None


def implied_prob(decimal_odd: float | None) -> float | None:
    if decimal_odd is None or decimal_odd <= 1.0:
        return None
    return 1 / decimal_odd


def summarize_clv(values: list[float]) -> dict:
    n = len(values)
    if not n:
        return {'n': 0, 'mean_clv_pct': 0, 'positive_clv_rate': 0, 'median_clv_pct': 0}
    vals = sorted(values)
    mid = n // 2
    median = vals[mid] if n % 2 else (vals[mid - 1] + vals[mid]) / 2
    positive = sum(1 for v in values if v > 0)
    return {
        'n': n,
        'mean_clv_pct': round(sum(values) / n, 2),
        'positive_clv_rate': round(100 * positive / n, 1),
        'median_clv_pct': round(median, 2),
        'p10_clv_pct': round(vals[max(0, int(n * 0.10) - 1)], 2),
        'p90_clv_pct': round(vals[min(n - 1, int(n * 0.90))], 2),
    }


def main() -> int:
    if not ODDS_HISTORY.exists():
        print(f'[clv] {ODDS_HISTORY.name} missing — nothing to compute')
        empty = {'records': [], 'summary': {}, 'generated_at': datetime.now(timezone.utc).isoformat()}
        write_json_atomic(OUT, empty)
        write_json_atomic(OUT_SUMMARY, {'generated_at': empty['generated_at'], 'summary': {}, 'status': 'missing'})
        return 0

    # 1. Parse odds_history (group by match_id, then by captured_at)
    by_match: dict[str, list[dict]] = defaultdict(list)
    n_lines = 0
    n_skipped = 0
    with ODDS_HISTORY.open('r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            n_lines += 1
            try:
                rec = json.loads(line)
            except Exception:
                n_skipped += 1
                continue
            mid = str(rec.get('id') or '')
            if not mid:
                n_skipped += 1
                continue
            by_match[mid].append(rec)

    # 2. For each match, find opening + closing
    records = []
    for mid, snaps in by_match.items():
        if len(snaps) < 2:
            continue  # need at least 2 snapshots to compute CLV
        # Sort by captured_at
        snaps.sort(key=lambda s: s.get('captured_at') or '')
        kickoff_iso = snaps[0].get('date') or ''
        if not kickoff_iso:
            continue
        try:
            kickoff = datetime.fromisoformat(kickoff_iso.replace('Z', '+00:00'))
        except Exception:
            continue
        # Opening = first snapshot
        opening = snaps[0]
        # Closing = last snapshot BEFORE kickoff (within 1h ideally)
        closing = None
        for s in reversed(snaps):
            try:
                t = datetime.fromisoformat(s['captured_at'].replace('Z', '+00:00'))
            except Exception:
                continue
            if t < kickoff:
                closing = s
                break
        if not closing or closing is opening:
            continue
        # Compute decimal odds + implied probs for each side
        sides_data = {}
        for side in ('home', 'away', 'draw'):
            ml_key = f'{side}ML'
            opening_dec = ml_to_decimal(opening.get(ml_key))
            closing_dec = ml_to_decimal(closing.get(ml_key))
            opening_p = implied_prob(opening_dec)
            closing_p = implied_prob(closing_dec)
            if opening_p is None or closing_p is None:
                continue
            sides_data[side] = {
                'opening_odd': round(opening_dec, 3),
                'closing_odd': round(closing_dec, 3),
                'opening_prob': round(opening_p, 4),
                'closing_prob': round(closing_p, 4),
                # CLV : si on bet sur ce side au opening_dec, et que le marché
                # déplace la closing au-dessus du opening (lower implied prob)
                # = +CLV. Plus formel : CLV = closing_p - opening_p (en proba).
                'clv_pct': round((closing_p - opening_p) * 100, 2),
            }
        if not sides_data:
            continue
        records.append({
            'id': mid,
            'name': opening.get('name'),
            'sport': opening.get('sport'),
            'league_code': opening.get('league_code'),
            'date': kickoff_iso,
            'snaps_count': len(snaps),
            'opening_at': opening.get('captured_at'),
            'closing_at': closing.get('captured_at'),
            'sides': sides_data,
        })

    # 3. Summary stats : moyenne CLV par side/sport/league.
    observations = []
    pick_rows_by_key: dict[str, list[dict]] = defaultdict(list)
    with ODDS_HISTORY.open('r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except Exception:
                continue
            key = rec.get('pick_archive_key')
            if key:
                pick_rows_by_key[str(key)].append(rec)
    for r in records:
        for side, d in r['sides'].items():
            observations.append({
                'id': r['id'],
                'name': r.get('name'),
                'sport': r.get('sport') or 'unknown',
                'league_code': r.get('league_code') or 'unknown',
                'side': side,
                'clv_pct': d['clv_pct'],
                'opening_odd': d['opening_odd'],
                'closing_odd': d['closing_odd'],
            })
    all_clv = [o['clv_pct'] for o in observations]
    pick_observations = []
    for key, rows in pick_rows_by_key.items():
        rows.sort(key=lambda r: r.get('ts') or r.get('captured_at') or '')
        first = rows[0]
        last = rows[-1]
        open_odd = first.get('odd_open') or first.get('odd_now')
        close_odd = last.get('odd_close') or last.get('odd_now')
        try:
            open_odd = float(open_odd)
            close_odd = float(close_odd)
        except (TypeError, ValueError):
            continue
        if not (open_odd > 1 and close_odd > 1):
            continue
        clv_pct = ((open_odd - close_odd) / close_odd) * 100
        pick_observations.append({
            'pick_archive_key': key,
            'id': last.get('id') or last.get('match_id'),
            'name': last.get('name'),
            'sport': last.get('sport') or 'unknown',
            'league_code': last.get('league_code') or 'unknown',
            'market_key': last.get('market_key') or 'unknown',
            'selection': last.get('selection') or '',
            'opening_odd': round(open_odd, 3),
            'closing_odd': round(close_odd, 3),
            'clv_pct': round(clv_pct, 2),
            'snaps_count': len(rows),
            'sharp_action_flag': any(bool(r.get('sharp_action_flag')) for r in rows),
            'line_movement_pct': last.get('line_movement_pct'),
        })
    all_pick_clv = [o['clv_pct'] for o in pick_observations]
    summary = summarize_clv(all_clv)
    summary.update({
        'n_matches': len(records),
        'n_clv_observations': len(observations),
        'n_pick_clv_observations': len(pick_observations),
        'pick_mean_clv_pct': summarize_clv(all_pick_clv)['mean_clv_pct'] if all_pick_clv else 0,
        'sharp_action_flags': sum(1 for o in pick_observations if o.get('sharp_action_flag')),
        'sample_status': 'validated' if len(observations) >= 500 else 'learning',
    })

    def grouped(key: str, min_n: int = 1) -> dict:
        buckets: dict[str, list[float]] = defaultdict(list)
        for o in observations:
            buckets[str(o.get(key) or 'unknown')].append(o['clv_pct'])
        return {
            k: v for k, vals in sorted(buckets.items(), key=lambda kv: len(kv[1]), reverse=True)
            if (v := summarize_clv(vals))['n'] >= min_n
        }

    by_sport = grouped('sport')
    by_side = grouped('side')
    by_league = grouped('league_code', min_n=8)
    def grouped_pick(key: str, min_n: int = 1) -> dict:
        buckets: dict[str, list[float]] = defaultdict(list)
        for o in pick_observations:
            buckets[str(o.get(key) or 'unknown')].append(o['clv_pct'])
        return {
            k: v for k, vals in sorted(buckets.items(), key=lambda kv: len(kv[1]), reverse=True)
            if (v := summarize_clv(vals))['n'] >= min_n
        }
    def odd_bucket(o: dict) -> str:
        odd = o.get('opening_odd') or 0
        if odd < 1.5:
            return '1.30-1.50'
        if odd < 2.0:
            return '1.50-2.00'
        if odd < 3.0:
            return '2.00-3.00'
        if odd < 5.0:
            return '3.00-5.00'
        return '5.00+'
    by_pick_odd_bucket_vals: dict[str, list[float]] = defaultdict(list)
    for o in pick_observations:
        by_pick_odd_bucket_vals[odd_bucket(o)].append(o['clv_pct'])
    by_pick_odd_bucket = {k: summarize_clv(v) for k, v in by_pick_odd_bucket_vals.items()}
    by_pick_market = grouped_pick('market_key')
    by_pick_sport = grouped_pick('sport')
    by_pick_league = grouped_pick('league_code', min_n=5)
    movers = sorted(observations, key=lambda o: o['clv_pct'])
    extremes = {
        'worst': movers[:10],
        'best': list(reversed(movers[-10:])),
    }

    write_json_atomic(OUT, {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'parsed_lines': n_lines,
        'skipped_lines': n_skipped,
        'summary': summary,
        'by_sport': by_sport,
        'by_side': by_side,
        'by_league': by_league,
        'pick_level': {
            'summary': summarize_clv(all_pick_clv),
            'by_sport': by_pick_sport,
            'by_market': by_pick_market,
            'by_odd_bucket': by_pick_odd_bucket,
            'by_league': by_pick_league,
            'sharp_action_flags': [o for o in pick_observations if o.get('sharp_action_flag')][:50],
            'records': pick_observations[-1000:],
        },
        'extremes': extremes,
        'records': records,
    })
    generated_at = datetime.now(timezone.utc).isoformat()
    top_leagues = dict(list(by_league.items())[:12])
    write_json_atomic(OUT_SUMMARY, {
        'generated_at': generated_at,
        'parsed_lines': n_lines,
        'skipped_lines': n_skipped,
        'summary': summary,
        'by_sport': by_sport,
        'by_side': by_side,
        'pick_level': {
            'summary': summarize_clv(all_pick_clv),
            'by_sport': by_pick_sport,
            'by_market': by_pick_market,
            'by_odd_bucket': by_pick_odd_bucket,
            'sharp_action_flags': sum(1 for o in pick_observations if o.get('sharp_action_flag')),
        },
        'top_leagues': top_leagues,
        'extremes': {
            'best': extremes['best'][:5],
            'worst': extremes['worst'][:5],
        },
    })
    print(f'[clv] {len(records)} matches with CLV computed, mean={summary["mean_clv_pct"]:+.2f}%, positive_rate={summary["positive_clv_rate"]}% ({OUT.stat().st_size//1024}KB)')
    return 0


if __name__ == '__main__':
    sys.exit(main())

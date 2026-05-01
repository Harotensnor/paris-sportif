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
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ODDS_HISTORY = ROOT / 'odds_history.jsonl'
DATA_JS = ROOT / 'data.js'
OUT = ROOT / 'clv_history.json'


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


def main() -> int:
    if not ODDS_HISTORY.exists():
        print(f'[clv] {ODDS_HISTORY.name} missing — nothing to compute')
        OUT.write_text(json.dumps({'records': [], 'summary': {}, 'generated_at': datetime.now(timezone.utc).isoformat()}, ensure_ascii=False, indent=2), encoding='utf-8')
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

    # 3. Summary stats : moyenne CLV par side, count records, etc.
    if records:
        all_clv = []
        for r in records:
            for side, d in r['sides'].items():
                all_clv.append(d['clv_pct'])
        n = len(all_clv)
        mean = sum(all_clv) / n if n else 0
        positive = sum(1 for v in all_clv if v > 0)
        summary = {
            'n_matches': len(records),
            'n_clv_observations': n,
            'mean_clv_pct': round(mean, 2),
            'positive_clv_rate': round(100 * positive / n, 1) if n else 0,
        }
    else:
        summary = {'n_matches': 0, 'n_clv_observations': 0, 'mean_clv_pct': 0, 'positive_clv_rate': 0}

    OUT.write_text(json.dumps({
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'parsed_lines': n_lines,
        'skipped_lines': n_skipped,
        'summary': summary,
        'records': records,
    }, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'[clv] {len(records)} matches with CLV computed, mean={summary["mean_clv_pct"]:+.2f}%, positive_rate={summary["positive_clv_rate"]}% ({OUT.stat().st_size//1024}KB)')
    return 0


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""Retrospective ROI backtest across completed events.

Reads pre-match odds (from each event's ``odds_snapshot``, populated by
``snapshot_odds.py``) + the actual outcome (from each event's
``competitors[].winner`` / ``.score``) and plays a handful of baseline
strategies to see which buckets — sport, league, cote range — tend to
win or lose money.

Output: ``backtest_report.json`` (machine-readable) + ``backtest_report.md``
(human-readable summary at repo root). Run on demand:

    python3 scripts/backtest.py

Caveats (read this before drawing conclusions):

1. The strategies here are **market baselines**, not the production model.
   "Bet the favorite" tells you if the market is skewed in a league, not
   whether the dashboard's model would profit. For a true model backtest
   we'd need to either port ``predictMatch`` from JS → Python, or persist
   the model's pick in ``odds_history.jsonl`` going forward. Both are
   follow-ups.

2. Sample size is small (~hundred events per bucket at best). Treat
   anything below ~50 events as directional, not conclusive.

3. We only look at events still in ``data.js`` (the rolling window is
   ~10 days). Events that rolled off are counted only if they have a row
   in ``odds_history.jsonl`` AND are re-resolvable. For now we skip those
   — most archived events are still in data.js.
"""
from __future__ import annotations
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from statistics import mean

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / 'data.js'
REPORT_JSON = ROOT / 'backtest_report.json'
REPORT_MD = ROOT / 'backtest_report.md'

# Cote buckets (decimal odds). Tuned so "heavy fav" / "toss-up" / "dog"
# land in sensible ranges for football+tennis+basket+hockey alike.
COTE_BUCKETS = [
    ('heavy_fav',   0.0, 1.50),   # ~67%+ implied
    ('fav',         1.50, 2.00),  # 50-67%
    ('toss_up',     2.00, 2.80),  # 36-50%
    ('dog',         2.80, 4.50),  # 22-36%
    ('heavy_dog',   4.50, 100.0), # <22%
]


def bucket_for(cote: float) -> str:
    for name, lo, hi in COTE_BUCKETS:
        if lo < cote <= hi or (lo == 0.0 and cote <= hi):
            return name
    return 'heavy_dog'


def load_events() -> list[dict]:
    """Yield every completed event that has a pre-match odds snapshot + a
    known winner. Skips matches we can't resolve."""
    txt = DATA_JS.read_text(encoding='utf-8')
    m = re.search(r'=\s*(\{.*\})\s*;?\s*$', txt, re.DOTALL)
    if not m:
        print('ERROR: could not parse data.js', file=sys.stderr)
        return []
    data = json.loads(m.group(1))
    out = []
    for day_key, events in (data.get('days') or {}).items():
        for ev in events:
            if not ev.get('completed'):
                continue
            snap = ev.get('odds_snapshot') or {}
            if not (snap.get('home') or snap.get('away')):
                continue
            comps = ev.get('competitors') or []
            if len(comps) < 2:
                continue
            # Resolve outcome: 'home', 'away', or 'draw'
            home_c = next((c for c in comps if c.get('home_away') == 'home'), None)
            away_c = next((c for c in comps if c.get('home_away') == 'away'), None)
            if not (home_c and away_c):
                continue
            outcome = _outcome(home_c, away_c)
            if outcome is None:
                continue
            out.append({
                'id': ev.get('id'),
                'name': ev.get('name'),
                'date': ev.get('date'),
                'sport': ev.get('sport'),
                'league_code': ev.get('league_code'),
                'home_cote': snap.get('home'),
                'draw_cote': snap.get('draw'),
                'away_cote': snap.get('away'),
                'outcome': outcome,  # 'home' | 'away' | 'draw'
                'home_score': home_c.get('score'),
                'away_score': away_c.get('score'),
            })
    return out


def _outcome(home_c: dict, away_c: dict) -> str | None:
    """Return 'home', 'away', or 'draw' — or None if unresolvable."""
    hw = home_c.get('winner')
    aw = away_c.get('winner')
    if hw is True and aw is False:
        return 'home'
    if aw is True and hw is False:
        return 'away'
    if hw is False and aw is False:
        # Soccer draw: both competitors have winner=False and scores equal
        try:
            if int(home_c.get('score', 0)) == int(away_c.get('score', 0)):
                return 'draw'
        except (TypeError, ValueError):
            pass
        return None
    return None


# ═══ Strategies ═══════════════════════════════════════════════════════
# Each strategy returns (pick, cote) or None to skip. Pick ∈ {'home','draw','away'}.

def strat_favorite(ev: dict):
    """Always bet the lowest decimal odd (= the favorite)."""
    candidates = [
        ('home', ev['home_cote']),
        ('away', ev['away_cote']),
    ]
    # Ignore draw — moneyline favorite is really a 2-way ML ask in most markets
    candidates = [(p, c) for p, c in candidates if c]
    if not candidates:
        return None
    return min(candidates, key=lambda x: x[1])


def strat_dog(ev: dict):
    """Always bet the highest 2-way ML (= the underdog). Pure sanity check."""
    candidates = [('home', ev['home_cote']), ('away', ev['away_cote'])]
    candidates = [(p, c) for p, c in candidates if c]
    if not candidates:
        return None
    return max(candidates, key=lambda x: x[1])


def strat_home(ev: dict):
    """Always bet home — reveals home-advantage magnitude in each league."""
    if ev['home_cote']:
        return ('home', ev['home_cote'])
    return None


def strat_value_zone(ev: dict):
    """Bet the favorite IFF it sits in 1.50-2.50 (the model's sweet spot
    per the prior bilan analysis — avoids heavy-juice chalk and coinflips)."""
    pick = strat_favorite(ev)
    if not pick:
        return None
    side, cote = pick
    if 1.50 <= cote <= 2.50:
        return pick
    return None


def strat_low_overround(ev: dict):
    """Bet the favorite IFF the total overround is modest (<7%). Books price
    up juice on marquee/volatile matches — sharper lines in quieter ones."""
    h, a, d = ev.get('home_cote'), ev.get('away_cote'), ev.get('draw_cote')
    if not (h and a):
        return None
    implied = (1 / h) + (1 / a) + (1 / d if d else 0)
    overround = implied - 1.0
    if overround > 0.07:
        return None
    return strat_favorite(ev)


STRATEGIES = {
    'favorite':      strat_favorite,
    'dog':           strat_dog,
    'home':          strat_home,
    'value_zone':    strat_value_zone,
    'low_overround': strat_low_overround,
}


# ═══ Scoring ══════════════════════════════════════════════════════════

def play(events: list[dict], strategy) -> list[dict]:
    """Run a strategy on every event. Returns list of {pick, cote, outcome,
    won, pnl, sport, league_code, cote_bucket}."""
    results = []
    for ev in events:
        choice = strategy(ev)
        if not choice:
            continue
        side, cote = choice
        won = (side == ev['outcome'])
        pnl = (cote - 1.0) if won else -1.0
        results.append({
            'id': ev['id'],
            'name': ev['name'],
            'sport': ev['sport'],
            'league_code': ev['league_code'],
            'pick': side,
            'cote': cote,
            'cote_bucket': bucket_for(cote),
            'outcome': ev['outcome'],
            'won': won,
            'pnl': pnl,
        })
    return results


def summarize(results: list[dict]) -> dict:
    if not results:
        return {'n': 0, 'wins': 0, 'losses': 0, 'win_rate': 0.0,
                'total_pnl': 0.0, 'roi_pct': 0.0, 'avg_cote': 0.0}
    wins = sum(1 for r in results if r['won'])
    pnl = sum(r['pnl'] for r in results)
    return {
        'n': len(results),
        'wins': wins,
        'losses': len(results) - wins,
        'win_rate': wins / len(results),
        'total_pnl': round(pnl, 2),
        'roi_pct': round(100 * pnl / len(results), 2),
        'avg_cote': round(mean(r['cote'] for r in results), 2),
    }


def bucket_by(results: list[dict], key: str) -> dict[str, dict]:
    groups: dict[str, list] = defaultdict(list)
    for r in results:
        k = str(r.get(key) or 'unknown')
        groups[k].append(r)
    return {k: summarize(v) for k, v in sorted(groups.items())}


# ═══ Reporting ════════════════════════════════════════════════════════

def render_markdown(report: dict) -> str:
    lines = ['# Backtest ROI',
             '',
             f"Généré: {report['generated_at']}  ",
             f"Univers: {report['n_events']} événements résolus "
             f"({report['date_range']['start']} → {report['date_range']['end']})",
             '',
             '> ⚠️ Baselines de marché — pas le modèle de production. Voir le caveat dans `scripts/backtest.py`.',
             '']
    for strat_name, strat in report['strategies'].items():
        overall = strat['overall']
        emoji = '🟢' if overall['roi_pct'] > 0 else '🔴' if overall['roi_pct'] < 0 else '⚪'
        lines.append(f"## {emoji} `{strat_name}`")
        lines.append('')
        lines.append(f"**Vue d'ensemble** · {overall['n']} picks · "
                     f"{overall['wins']} gagnés / {overall['losses']} perdus · "
                     f"WR {overall['win_rate']*100:.1f}% · "
                     f"ROI **{overall['roi_pct']:+.2f}%** · "
                     f"cote moyenne {overall['avg_cote']:.2f}")
        lines.append('')
        # Par league
        lg = strat['by_league']
        if lg:
            lines.append('### Par ligue')
            lines.append('| Ligue | N | WR | ROI | Cote moy |')
            lines.append('|---|---:|---:|---:|---:|')
            for lcode, s in sorted(lg.items(), key=lambda x: -x[1]['n']):
                if s['n'] < 2:
                    continue
                emoji2 = '🟢' if s['roi_pct'] > 0 else '🔴' if s['roi_pct'] < 0 else '⚪'
                lines.append(f"| {lcode} | {s['n']} | {s['win_rate']*100:.0f}% | "
                             f"{emoji2} {s['roi_pct']:+.1f}% | {s['avg_cote']:.2f} |")
            lines.append('')
        # Par cote bucket
        bk = strat['by_cote_bucket']
        if bk:
            lines.append('### Par range de cote')
            lines.append('| Bucket | N | WR | ROI | Cote moy |')
            lines.append('|---|---:|---:|---:|---:|')
            for bname, _lo, _hi in COTE_BUCKETS:
                s = bk.get(bname)
                if not s or s['n'] < 1:
                    continue
                emoji2 = '🟢' if s['roi_pct'] > 0 else '🔴' if s['roi_pct'] < 0 else '⚪'
                lines.append(f"| {bname} | {s['n']} | {s['win_rate']*100:.0f}% | "
                             f"{emoji2} {s['roi_pct']:+.1f}% | {s['avg_cote']:.2f} |")
            lines.append('')
    return '\n'.join(lines)


def main() -> int:
    events = load_events()
    if not events:
        print('No resolvable completed events found — nothing to backtest.')
        return 1

    dates = sorted(e['date'] for e in events if e.get('date'))
    report = {
        'generated_at': datetime.utcnow().isoformat() + 'Z',
        'n_events': len(events),
        'date_range': {
            'start': dates[0] if dates else None,
            'end': dates[-1] if dates else None,
        },
        'strategies': {},
    }

    for name, fn in STRATEGIES.items():
        results = play(events, fn)
        report['strategies'][name] = {
            'overall':         summarize(results),
            'by_league':       bucket_by(results, 'league_code'),
            'by_sport':        bucket_by(results, 'sport'),
            'by_cote_bucket':  bucket_by(results, 'cote_bucket'),
            'by_pick':         bucket_by(results, 'pick'),
        }

    REPORT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2),
                           encoding='utf-8')
    REPORT_MD.write_text(render_markdown(report), encoding='utf-8')
    print(f'[backtest] {len(events)} events · '
          f'wrote {REPORT_JSON.name} ({REPORT_JSON.stat().st_size/1024:.1f}KB) '
          f'+ {REPORT_MD.name} ({REPORT_MD.stat().st_size/1024:.1f}KB)')

    # Quick console summary
    print()
    print('Strategy           |    N |   WR   |   ROI')
    print('-' * 50)
    for name, s in report['strategies'].items():
        o = s['overall']
        print(f"{name:18} | {o['n']:4d} | {o['win_rate']*100:5.1f}% | {o['roi_pct']:+6.2f}%")
    return 0


if __name__ == '__main__':
    sys.exit(main())

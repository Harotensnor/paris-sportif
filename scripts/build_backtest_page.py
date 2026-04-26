#!/usr/bin/env python3
"""
build_backtest_page.py — Generate `backtest.html` static page.

Reads `backtest_report_v2.json` (produced by the weekly backtest cron) and
renders a fully static, indexable HTML page exposing the model's public
performance history : WR, ROI flat, Kelly bankroll, Brier, calibration,
per-tier / per-sport / per-bucket / per-league breakdowns.

Replaces the dependency on JS to view backtest results — a crawler or a
visitor without JS gets the full picture in plain HTML.

Output : `backtest.html` (~25-50 KB depending on table size).

Idempotent. ~0.3s. Wired into refresh.yml + auto_refresh.py to regenerate
each tick (cheap because the JSON only changes once per week).
"""
from __future__ import annotations
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / 'backtest_report_v2.json'
BASELINES = ROOT / 'backtest_report.json'  # v31.7.18 — strategies marche
OUTPUT = ROOT / 'backtest.html'


def fmt_pct(v, digits=1):
    if v is None:
        return '—'
    try:
        return f'{v * 100:.{digits}f}%'
    except (TypeError, ValueError):
        return '—'


def fmt_num(v, digits=2):
    if v is None:
        return '—'
    try:
        return f'{v:.{digits}f}'
    except (TypeError, ValueError):
        return '—'


def fmt_signed(v, digits=2, suffix=''):
    if v is None:
        return '—'
    try:
        sign = '+' if v >= 0 else ''
        return f'{sign}{v:.{digits}f}{suffix}'
    except (TypeError, ValueError):
        return '—'


def color_class(v, kind='roi'):
    """Return CSS class (pos/neu/neg) based on metric and value."""
    if v is None:
        return 'neu'
    if kind == 'roi':
        return 'pos' if v >= 5 else ('neg' if v <= -5 else 'neu')
    if kind == 'wr':
        return 'pos' if v >= 0.55 else ('neg' if v <= 0.45 else 'neu')
    if kind == 'brier':
        return 'pos' if v <= 0.22 else ('neg' if v >= 0.25 else 'neu')
    return 'neu'


def render_overall_kpis(o: dict) -> str:
    n = o.get('n', 0)
    wr = o.get('win_rate')
    roi = o.get('flat_roi_pct')
    kelly = o.get('kelly_pnl')
    brier = o.get('brier')
    return f'''
    <div class="kpi-strip">
      <div class="kpi-card">
        <div class="kpi-label">Picks réglés</div>
        <div class="kpi-value">{n}</div>
        <div class="kpi-sub">{o.get('wins', 0)} gagnés · {o.get('losses', 0)} perdus</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Win rate</div>
        <div class="kpi-value {color_class(wr, 'wr')}">{fmt_pct(wr, 1)}</div>
        <div class="kpi-sub">cote moy. {fmt_num(o.get('avg_cote'))} · prob moy. {fmt_pct(o.get('avg_pick_prob'))}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">ROI flat</div>
        <div class="kpi-value {color_class(roi)}">{fmt_signed(roi, 1, '%')}</div>
        <div class="kpi-sub">P&amp;L {fmt_signed(o.get('flat_pnl'), 2, 'u')} · mise plate 1u/pick</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Kelly 0.25× (cap 10%)</div>
        <div class="kpi-value {color_class(kelly)}">{fmt_signed(kelly, 2, 'u')}</div>
        <div class="kpi-sub">Bankroll 100u → {fmt_num(o.get('kelly_pnl', 0) + 100, 2)}u</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Brier score</div>
        <div class="kpi-value {color_class(brier, 'brier')}">{fmt_num(brier, 4)}</div>
        <div class="kpi-sub">0 = parfait · 0.25 = pile/face</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Log-loss</div>
        <div class="kpi-value">{fmt_num(o.get('logloss'), 4)}</div>
        <div class="kpi-sub">Plus bas = mieux calibré</div>
      </div>
    </div>'''


def render_table(headers: list[str], rows: list[list], caption: str = '') -> str:
    head = ''.join(f'<th>{escape(h)}</th>' for h in headers)
    body = ''
    for row in rows:
        cells = ''.join(f'<td>{c}</td>' for c in row)
        body += f'<tr>{cells}</tr>'
    cap = f'<caption>{escape(caption)}</caption>' if caption else ''
    return f'<table>{cap}<thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>'


def render_by_tier(by_tier: dict) -> str:
    rows = []
    tier_label = {'lock': '🔒 Lock', 'standard': '✅ Standard', 'lowconf': '⚠️ Low conf', 'skip': '🚫 Skip'}
    tier_order = ['lock', 'standard', 'lowconf', 'skip']
    for tier in tier_order:
        d = by_tier.get(tier)
        if not d:
            continue
        wr = d.get('win_rate')
        roi = d.get('flat_roi_pct')
        rows.append([
            f'<b>{tier_label.get(tier, tier)}</b>',
            d.get('n', 0),
            f'<span class="{color_class(wr, "wr")}">{fmt_pct(wr, 0)}</span>',
            f'<span class="{color_class(roi)}">{fmt_signed(roi, 1, "%")}</span>',
            fmt_signed(d.get('flat_pnl'), 2, 'u'),
            fmt_signed(d.get('kelly_pnl'), 2, 'u'),
            fmt_num(d.get('brier'), 3),
        ])
    return render_table(['Tier', 'N', 'WR', 'ROI flat', 'P&L flat', 'P&L Kelly', 'Brier'], rows)


def render_by_sport(by_sport: dict) -> str:
    rows = []
    sport_label = {
        'football': '⚽ Foot', 'basketball': '🏀 Basket', 'tennis': '🎾 Tennis',
        'hockey': '🏒 Hockey', 'baseball': '⚾ Baseball', 'mma': '🥊 MMA',
    }
    sorted_sports = sorted(by_sport.items(), key=lambda kv: -(kv[1].get('n') or 0))
    for sport, d in sorted_sports:
        wr = d.get('win_rate')
        roi = d.get('flat_roi_pct')
        rows.append([
            f'<b>{sport_label.get(sport, sport)}</b>',
            d.get('n', 0),
            f'<span class="{color_class(wr, "wr")}">{fmt_pct(wr, 0)}</span>',
            f'<span class="{color_class(roi)}">{fmt_signed(roi, 1, "%")}</span>',
            fmt_signed(d.get('flat_pnl'), 2, 'u'),
            fmt_signed(d.get('kelly_pnl'), 2, 'u'),
            fmt_num(d.get('brier'), 3),
        ])
    return render_table(['Sport', 'N', 'WR', 'ROI flat', 'P&L flat', 'P&L Kelly', 'Brier'], rows)


def render_by_cote_bucket(by_bucket: dict) -> str:
    rows = []
    label = {
        'heavy_fav': '💎 Gros favori (cote ≤ 1.40)',
        'fav': '📊 Favori (1.40 < cote ≤ 1.85)',
        'toss_up': '⚖️ Pile/face (1.85 < cote ≤ 2.50)',
        'dog': '🎲 Outsider (cote > 2.50)',
    }
    order = ['heavy_fav', 'fav', 'toss_up', 'dog']
    for k in order:
        d = by_bucket.get(k)
        if not d:
            continue
        wr = d.get('win_rate')
        roi = d.get('flat_roi_pct')
        rows.append([
            label.get(k, k),
            d.get('n', 0),
            f'<span class="{color_class(wr, "wr")}">{fmt_pct(wr, 0)}</span>',
            f'<span class="{color_class(roi)}">{fmt_signed(roi, 1, "%")}</span>',
            fmt_num(d.get('brier'), 3),
        ])
    return render_table(['Bucket de cote', 'N', 'WR', 'ROI flat', 'Brier'], rows)


def render_calibration(cal: list[dict]) -> str:
    rows = []
    for b in cal:
        n = b.get('n') or 0
        if n == 0:
            continue
        prob = b.get('prob_mean')
        wr = b.get('win_rate')
        gap = b.get('gap')
        rows.append([
            f"[{b['lo']:.1f}–{b['hi']:.1f}]",
            n,
            fmt_pct(prob, 1),
            fmt_pct(wr, 1),
            f'<span class="{color_class(gap if gap is None else (-abs(gap)))}">{fmt_signed(gap * 100 if gap is not None else None, 1, "pp")}</span>' if gap is not None else '—',
        ])
    return render_table(['Bin probabilité', 'N', 'Prob moyenne', 'WR observé', 'Gap'], rows)


def render_benchmarks(overall: dict, baselines: dict) -> str:
    """v31.7.18 — Tableau "Vs benchmarks marché" : compare le ROI du modèle
    aux 5 strategies baselines de backtest_baselines.py (favorite, dog, home,
    value_zone, low_overround). Chaque ligne montre WR + ROI + delta vs
    modèle. Permet de répondre publiquement : "le modèle bat-il les
    heuristiques simples ?"."""
    if not baselines:
        return '<p style="color:#a3a3aa;font-size:13px;">Pas de baselines disponibles (backtest_report.json absent).</p>'

    model_roi = overall.get('flat_roi_pct') or 0
    model_n = overall.get('n') or 0

    labels = {
        'favorite': ('🥇 Favori marché', 'Toujours parier le favori (cote la plus basse)'),
        'dog': ('🐶 Outsider', 'Toujours parier l\'outsider'),
        'home': ('🏠 Domicile systématique', 'Toujours parier l\'équipe à domicile'),
        'value_zone': ('💎 Value zone (cote 1.5–3.0)', 'Favori marché dans la zone Kelly-fertile'),
        'low_overround': ('📉 Low overround', 'Match avec faible marge bookmaker'),
    }

    rows = []
    # Modele en première ligne
    delta_self = 0
    delta_str = '<span style="color:#a3a3aa;">référence</span>'
    rows.append(f'''<tr style="background:rgba(167,139,250,.08);">
      <td><b>🤖 Modèle predictMatch</b><br><span style="font-size:11px;color:#a3a3aa;">{model_n} picks réglés</span></td>
      <td style="text-align:right;">{model_n}</td>
      <td style="text-align:right;">{fmt_pct(overall.get("win_rate"), 1)}</td>
      <td style="text-align:right;color:{"#34d399" if model_roi > 0 else "#f87171" if model_roi < 0 else "#a3a3aa"};font-weight:700;">{fmt_signed(model_roi, 1, "%")}</td>
      <td style="text-align:right;">{delta_str}</td>
    </tr>''')

    for key, (lbl, sub) in labels.items():
        s = baselines.get(key, {}).get('overall', {})
        if not s or not s.get('n'):
            continue
        roi = s.get('roi_pct') or 0
        delta = model_roi - roi
        delta_color = '#34d399' if delta > 0 else '#f87171' if delta < -0.5 else '#a3a3aa'
        delta_sign = '+' if delta > 0 else ''
        rows.append(f'''<tr>
      <td><b>{lbl}</b><br><span style="font-size:11px;color:#a3a3aa;">{escape(sub)}</span></td>
      <td style="text-align:right;">{s.get("n", 0)}</td>
      <td style="text-align:right;">{(s.get("win_rate") or 0)*100:.1f}%</td>
      <td style="text-align:right;color:{"#34d399" if roi > 0 else "#f87171" if roi < 0 else "#a3a3aa"};">{roi:+.1f}%</td>
      <td style="text-align:right;color:{delta_color};font-weight:600;">{delta_sign}{delta:.1f}pt</td>
    </tr>''')

    if not rows[1:]:  # Only model row, no baselines
        return '<p style="color:#a3a3aa;font-size:13px;">Pas de strategies baselines à comparer.</p>'

    return f'''<table>
      <thead>
        <tr>
          <th>Stratégie</th>
          <th style="text-align:right;">N</th>
          <th style="text-align:right;">WR</th>
          <th style="text-align:right;">ROI flat</th>
          <th style="text-align:right;">Δ vs modèle</th>
        </tr>
      </thead>
      <tbody>{''.join(rows)}</tbody>
    </table>
    <p style="font-size:12px;color:#a3a3aa;margin-top:8px;">
      Δ positif = le modèle bat la stratégie de cette ligne. Source : <code>backtest_baselines.py</code> (cron hebdo, baselines marché vs <code>backtest_v2.py</code> qui mesure le vrai modèle).
    </p>'''


def render_top_leagues(by_league: dict, limit: int = 12) -> str:
    sorted_leagues = sorted(by_league.items(), key=lambda kv: -(kv[1].get('n') or 0))
    rows = []
    for code, d in sorted_leagues[:limit]:
        wr = d.get('win_rate')
        roi = d.get('flat_roi_pct')
        rows.append([
            f'<code>{escape(code)}</code>',
            d.get('n', 0),
            f'<span class="{color_class(wr, "wr")}">{fmt_pct(wr, 0)}</span>',
            f'<span class="{color_class(roi)}">{fmt_signed(roi, 1, "%")}</span>',
            fmt_num(d.get('brier'), 3),
        ])
    return render_table(['Ligue', 'N', 'WR', 'ROI flat', 'Brier'], rows)


PAGE_TEMPLATE = '''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Backtest — Performance vérifiable du modèle Paris-Sportif</title>
<meta name="description" content="Performance réelle du modèle Paris-Sportif sur {n} picks réglés : WR {wr_str}, ROI flat {roi_str}, Brier {brier_str}, Kelly {kelly_str}. Backtest hebdo via vrai predictMatch(). Tableaux par tier, sport, ligue, cote, calibration.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://harotensnor.github.io/paris-sportif/backtest.html">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<meta property="og:type" content="article">
<meta property="og:title" content="Backtest — Performance vérifiable du modèle Paris-Sportif">
<meta property="og:description" content="WR {wr_str} · ROI flat {roi_str} · Brier {brier_str} · {n} picks · backtest hebdo">
<meta property="og:url" content="https://harotensnor.github.io/paris-sportif/backtest.html">
<meta property="og:image" content="https://harotensnor.github.io/paris-sportif/icon-512.png">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#08080a">

<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@graph": [
    {{
      "@type": "Organization",
      "@id": "https://harotensnor.github.io/paris-sportif/#org",
      "name": "Paris-Sportif",
      "url": "https://harotensnor.github.io/paris-sportif/",
      "founder": {{ "@type": "Person", "name": "Théo Boulnois" }},
      "sameAs": ["https://github.com/Harotensnor/paris-sportif"]
    }},
    {{
      "@type": "Dataset",
      "name": "Paris-Sportif backtest model performance",
      "description": "Performance vérifiée du modèle predictMatch sur {n} picks réglés ({date_start} → {date_end}). WR {wr_str}, ROI flat {roi_str}, Brier {brier_str}.",
      "url": "https://harotensnor.github.io/paris-sportif/backtest.html",
      "creator": {{ "@id": "https://harotensnor.github.io/paris-sportif/#org" }},
      "datePublished": "{generated_iso}",
      "dateModified": "{generated_iso}",
      "license": "https://github.com/Harotensnor/paris-sportif/blob/main/LICENSE",
      "distribution": [
        {{ "@type": "DataDownload", "encodingFormat": "application/json", "contentUrl": "https://harotensnor.github.io/paris-sportif/backtest_report_v2.json" }},
        {{ "@type": "DataDownload", "encodingFormat": "text/markdown", "contentUrl": "https://harotensnor.github.io/paris-sportif/backtest_report_v2.md" }}
      ],
      "variableMeasured": ["win rate", "ROI flat", "Brier score", "log-loss", "calibration"]
    }},
    {{
      "@type": "BreadcrumbList",
      "itemListElement": [
        {{ "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://harotensnor.github.io/paris-sportif/" }},
        {{ "@type": "ListItem", "position": 2, "name": "Backtest", "item": "https://harotensnor.github.io/paris-sportif/backtest.html" }}
      ]
    }}
  ]
}}
</script>

<style>
  :root {{ color-scheme: dark light; }}
  * {{ box-sizing: border-box; }}
  html, body {{
    margin: 0; padding: 0;
    font-family: "SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #08080a; color: #e6ebf2;
    line-height: 1.6; letter-spacing: -.01em;
    font-variant-numeric: tabular-nums;
  }}
  body {{ min-height: 100vh; }}
  a {{ color: #a78bfa; text-decoration: none; }}
  a:hover, a:focus {{ text-decoration: underline; }}
  code {{ font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: .92em; background: rgba(167,139,250,.1); padding: 1px 5px; border-radius: 4px; }}
  header.topbar {{
    position: sticky; top: 0; z-index: 50;
    background: rgba(8,8,10,.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255,255,255,.06);
    padding: 12px 20px;
    display: flex; align-items: center; justify-content: space-between;
  }}
  .brand {{ display: flex; align-items: center; gap: 8px; font-weight: 800; letter-spacing: -.5px; color: inherit; }}
  .brand-logo {{ font-size: 22px; }}
  .brand-text {{ font-size: 17px; }}
  .topbar nav a {{ margin-left: 16px; font-size: 13.5px; color: #a3a3aa; font-weight: 500; min-height: 36px; display: inline-flex; align-items: center; }}
  .topbar nav a:hover {{ color: #e6ebf2; text-decoration: none; }}
  main {{ max-width: 1100px; margin: 0 auto; padding: 16px 20px 60px; }}
  .breadcrumb {{ font-size: 12px; color: #6b6b73; margin-top: 14px; }}
  .uppercase-pill {{
    display: inline-block; font-size: 11px; color: #34d399;
    text-transform: uppercase; letter-spacing: 1.4px; font-weight: 700;
    margin: 24px 0 4px;
  }}
  h1 {{ margin: 4px 0 6px; font-size: 36px; font-weight: 800; letter-spacing: -1.2px; line-height: 1.05; }}
  .lead {{ font-size: 14px; color: #a3a3aa; max-width: 640px; border-left: 3px solid #34d399; padding: 4px 0 4px 12px; margin: 0 0 28px; }}
  h2 {{ font-size: 22px; margin: 36px 0 12px; scroll-margin-top: 70px; color: #fff; }}
  h2 .subtle {{ font-size: 13px; font-weight: 500; color: #a3a3aa; margin-left: 8px; }}

  .kpi-strip {{
    display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;
    margin: 0 0 22px;
  }}
  .kpi-card {{
    padding: 16px 18px;
    background: #121215;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px;
  }}
  .kpi-label {{ font-size: 11px; color: #a3a3aa; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; margin-bottom: 4px; }}
  .kpi-value {{ font-size: 28px; font-weight: 800; letter-spacing: -.6px; color: #fff; }}
  .kpi-value.pos {{ color: #34d399; }}
  .kpi-value.neg {{ color: #f87171; }}
  .kpi-value.neu {{ color: #a78bfa; }}
  .kpi-sub {{ font-size: 11.5px; color: #a3a3aa; margin-top: 4px; }}

  .pos {{ color: #34d399; font-weight: 600; }}
  .neg {{ color: #f87171; font-weight: 600; }}
  .neu {{ color: #fbbf24; font-weight: 500; }}

  table {{
    width: 100%; border-collapse: collapse; margin: 0 0 16px;
    background: #121215; border: 1px solid rgba(255,255,255,.08);
    border-radius: 10px; overflow: hidden;
    font-size: 13.5px;
  }}
  caption {{ caption-side: top; text-align: left; font-size: 12px; color: #6b6b73; margin-bottom: 6px; }}
  thead th {{
    background: rgba(255,255,255,.03);
    color: #a3a3aa; font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .6px;
    text-align: left; padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,.08);
  }}
  tbody td {{
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,.04);
    color: #c5c5cc;
  }}
  tbody tr:last-child td {{ border-bottom: none; }}
  tbody td:nth-child(2), tbody td:nth-child(3), tbody td:nth-child(4),
  tbody td:nth-child(5), tbody td:nth-child(6), tbody td:nth-child(7) {{
    text-align: right;
  }}

  .meta-banner {{
    margin: 0 0 22px; padding: 14px 16px;
    background: rgba(167,139,250,.08);
    border: 1px solid rgba(167,139,250,.25);
    border-left: 3px solid #a78bfa;
    border-radius: 0 10px 10px 0;
    font-size: 13px; color: #c5c5cc;
  }}
  .danger-banner {{
    margin: 24px 0 0; padding: 14px 16px;
    background: rgba(248,113,113,.06);
    border: 1px solid rgba(248,113,113,.25);
    border-left: 3px solid #f87171;
    border-radius: 0 10px 10px 0;
    font-size: 13px; color: #c5c5cc;
  }}
  .danger-banner strong {{ color: #fca5a5; }}
  footer.site-footer {{
    border-top: 1px solid rgba(255,255,255,.06);
    margin-top: 40px; padding: 24px 20px;
    text-align: center; font-size: 12.5px; color: #6b6b73;
  }}
  footer.site-footer nav a {{ margin: 0 10px; color: #a3a3aa; }}
  @media (prefers-color-scheme: light) {{
    html, body {{ background: #f5f5f7; color: #08080a; }}
    .topbar {{ background: rgba(245,245,247,.85); border-bottom-color: rgba(0,0,0,.08); }}
    .topbar nav a {{ color: #444; }}
    .kpi-card, table {{ background: #fff; border-color: rgba(0,0,0,.08); color: #2a2a30; }}
    .kpi-value {{ color: #08080a; }}
    h2 {{ color: #08080a; }}
    thead th {{ background: rgba(0,0,0,.03); color: #444; border-bottom-color: rgba(0,0,0,.08); }}
    tbody td {{ color: #2a2a30; border-bottom-color: rgba(0,0,0,.04); }}
    code {{ background: rgba(167,139,250,.15); }}
  }}
  @media (max-width: 600px) {{
    h1 {{ font-size: 28px; }}
    h2 {{ font-size: 18px; }}
    .topbar nav {{ display: none; }}
    .kpi-strip {{ grid-template-columns: 1fr 1fr; }}
    table {{ font-size: 12px; }}
    table thead th, table tbody td {{ padding: 6px 8px; }}
  }}
</style>
</head>
<body>
<header class="topbar" role="banner">
  <a href="./" class="brand" aria-label="Retour à l'accueil Paris-Sportif">
    <span class="brand-logo">🎯</span>
    <span class="brand-text">Paris-Sportif</span>
  </a>
  <nav aria-label="Pages éditoriales">
    <a href="./">Accueil</a>
    <a href="methodologie.html">Méthodologie</a>
    <a href="academie.html">Académie</a>
    <a href="legal.html">Légal</a>
  </nav>
</header>

<main>
  <nav class="breadcrumb" aria-label="Fil d'ariane">
    <a href="./" style="color:#6b6b73;">Accueil</a> ›
    <span style="color:#a3a3aa;">Backtest</span>
  </nav>

  <span class="uppercase-pill">Performance vérifiable · cron hebdo</span>
  <h1>📈 Backtest du modèle</h1>
  <p class="lead">
    Performance réelle du modèle <code>predictMatch()</code> rejouée chaque dimanche sur tous les picks réglés depuis l'archivage
    (<code>results_archive.jsonl</code> + <code>data.js</code>). Vrai modèle exécuté via <code>scripts/model_loader.py</code>,
    pas une réimplémentation simplifiée.
  </p>

  <div class="meta-banner">
    📅 Période : <b>{date_start}</b> → <b>{date_end}</b><br>
    🔄 Régénéré : <b>{generated_human}</b><br>
    📦 Sources brutes : <a href="backtest_report_v2.json">backtest_report_v2.json</a> · <a href="backtest_report_v2.md">.md</a> · <a href="results_archive.jsonl">results_archive.jsonl</a>
  </div>

  <h2 id="kpis">🎯 Vue d'ensemble</h2>
  {overall_kpis}

  <h2 id="tier">🏷️ Par tier de fiabilité <span class="subtle">— ce que vaut la jauge</span></h2>
  {table_tier}

  <h2 id="sport">🏆 Par sport <span class="subtle">— où le modèle gagne, où il perd</span></h2>
  {table_sport}

  <h2 id="bucket">💸 Par bucket de cote <span class="subtle">— gros favori vs outsider</span></h2>
  {table_bucket}

  <h2 id="benchmarks">🆚 Vs benchmarks marché <span class="subtle">— le modèle bat-il les heuristiques simples ?</span></h2>
  {table_benchmarks}

  <h2 id="calibration">📊 Calibration probabiliste <span class="subtle">— quand on dit 70%, on gagne 70% ?</span></h2>
  <p style="font-size:13px;color:#a3a3aa;margin:0 0 12px;">Plus le <b>gap</b> est proche de 0, mieux le modèle est calibré.
  <code>+pp</code> = modèle sous-estime · <code>-pp</code> = modèle sur-estime.</p>
  {table_calibration}

  <h2 id="leagues">🏟️ Top ligues par volume</h2>
  {table_leagues}

  <div class="danger-banner">
    <strong>⚠️ Petite n.</strong> {n} picks restent insuffisants pour conclure définitivement
    sur les sous-segments (sport, ligue, bucket de cote). Il faut typiquement <b>≥150 paris</b> par
    catégorie pour qu'un ROI ait du sens. Avant ça, c'est de la variance. Voir <a href="methodologie.html#biais">méthodologie · biais &amp; limites</a>.
  </div>

  <p style="margin-top:32px;padding:14px 16px;background:#0c0c0f;border:1px dashed rgba(255,255,255,.1);border-radius:8px;font-size:12.5px;color:#6b6b73;text-align:center;">
    📐 Définitions des métriques (WR, ROI flat, Brier, Kelly, calibration, CLV, tier de fiabilité) :
    <a href="academie.html">Académie</a>. Protocole de backtest complet :
    <a href="methodologie.html#backtest">Méthodologie</a>.
  </p>
</main>

<footer class="site-footer" role="contentinfo">
  <nav aria-label="Liens du site">
    <a href="./">Accueil</a> ·
    <a href="methodologie.html">Méthodologie</a> ·
    <a href="academie.html">Académie</a> ·
    <a href="legal.html">Légal</a> ·
    <a href="https://github.com/Harotensnor/paris-sportif" target="_blank" rel="noopener">GitHub</a>
  </nav>
  <div style="margin-top:8px;">⚖️ Site éducatif · réservé aux 18+ · jouer comporte des risques</div>
</footer>
</body>
</html>
'''


def main() -> int:
    if not REPORT.exists():
        print(f'[build_backtest_page] {REPORT.name} missing — skip.', flush=True)
        return 0
    try:
        report = json.loads(REPORT.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError) as e:
        print(f'[build_backtest_page] failed to parse report: {e}', flush=True)
        return 1

    overall = report.get('overall') or {}
    by_tier = report.get('by_tier') or {}
    by_sport = report.get('by_sport') or {}
    by_bucket = report.get('by_cote_bucket') or {}
    by_league = report.get('by_league') or {}
    calibration = report.get('calibration') or []
    date_range = report.get('date_range') or {}
    generated_at = report.get('generated_at') or datetime.now(timezone.utc).isoformat()

    n = overall.get('n') or 0
    wr = overall.get('win_rate')
    roi = overall.get('flat_roi_pct')
    brier = overall.get('brier')
    kelly = overall.get('kelly_pnl')

    # Strings for meta description (must avoid f-string nesting issues)
    wr_str = fmt_pct(wr, 1)
    roi_str = fmt_signed(roi, 1, '%')
    brier_str = fmt_num(brier, 4) if brier is not None else '—'
    kelly_str = fmt_signed(kelly, 1, 'u')

    # Format generated_at human-readable (truncate to minute)
    try:
        gen_dt = datetime.fromisoformat(generated_at.replace('Z', '+00:00'))
        generated_human = gen_dt.strftime('%Y-%m-%d %H:%M UTC')
        generated_iso = gen_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    except (ValueError, AttributeError):
        generated_human = generated_at
        generated_iso = generated_at

    # v31.7.18 — Charge baselines marche pour comparaison (optionnel).
    baselines = {}
    if BASELINES.exists():
        try:
            baselines = json.loads(BASELINES.read_text(encoding='utf-8')).get('strategies', {})
        except (json.JSONDecodeError, OSError):
            baselines = {}

    html = PAGE_TEMPLATE.format(
        n=n,
        wr_str=wr_str,
        roi_str=roi_str,
        brier_str=brier_str,
        kelly_str=kelly_str,
        date_start=date_range.get('start', '—'),
        date_end=date_range.get('end', '—'),
        generated_human=generated_human,
        generated_iso=generated_iso,
        overall_kpis=render_overall_kpis(overall),
        table_tier=render_by_tier(by_tier),
        table_sport=render_by_sport(by_sport),
        table_bucket=render_by_cote_bucket(by_bucket),
        table_calibration=render_calibration(calibration),
        table_leagues=render_top_leagues(by_league, limit=12),
        table_benchmarks=render_benchmarks(overall, baselines),
    )

    OUTPUT.write_text(html, encoding='utf-8')
    size_kb = OUTPUT.stat().st_size // 1024
    print(f'[build_backtest_page] backtest.html · {size_kb} KB · n={n} · WR {wr_str} · ROI {roi_str}', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""
build_credibilite_page.py — Generate `credibilite.html` static page.

Reads `backtest_report_v2.json` and renders a calibration-focused page :
"how do I know the model's probabilities are honest ?". Different angle
from backtest.html (which shows ROI/WR breakdowns) — this page focuses
on **probabilistic calibration** and the SVG reliability diagram.

Output : `credibilite.html` (~15-20 KB).

Idempotent. ~0.3s. Wired into refresh.yml.
"""
from __future__ import annotations
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / 'backtest_report_v2.json'
OUTPUT = ROOT / 'credibilite.html'


def fmt_pct(v, digits=1):
    if v is None:
        return '—'
    try:
        return f'{v * 100:.{digits}f}%'
    except (TypeError, ValueError):
        return '—'


def render_calibration_svg(cal: list[dict]) -> str:
    """Pure SVG reliability diagram. Each bin = a circle scaled by N,
    plus the perfect-calibration diagonal."""
    valid = [b for b in cal if (b.get('n') or 0) > 0 and b.get('prob_mean') is not None and b.get('win_rate') is not None]
    if not valid:
        return '<p style="color:#a3a3aa;text-align:center;padding:20px;">Pas encore assez de données pour tracer la calibration.</p>'

    W, H = 480, 360
    pad = 38
    plot_w = W - 2 * pad
    plot_h = H - 2 * pad
    max_n = max((b.get('n') or 1) for b in valid)

    svg = [f'<svg viewBox="0 0 {W} {H}" width="100%" height="auto" role="img" aria-label="Diagramme de calibration">']
    # Grid + axes
    for frac in (0, 0.25, 0.5, 0.75, 1):
        y = pad + (1 - frac) * plot_h
        x = pad + frac * plot_w
        svg.append(f'<line x1="{pad}" y1="{y:.0f}" x2="{W - pad}" y2="{y:.0f}" stroke="#2a2a30" stroke-width="0.5" stroke-dasharray="2,3"/>')
        svg.append(f'<line x1="{x:.0f}" y1="{pad}" x2="{x:.0f}" y2="{H - pad}" stroke="#2a2a30" stroke-width="0.5" stroke-dasharray="2,3"/>')
    # Perfect-calibration diagonal
    svg.append(f'<line x1="{pad}" y1="{H - pad}" x2="{W - pad}" y2="{pad}" stroke="#a78bfa" stroke-width="1.5" stroke-dasharray="6,4" opacity="0.7"/>')
    # Axes labels
    svg.append(f'<text x="{W / 2:.0f}" y="{H - 8}" text-anchor="middle" fill="#a3a3aa" font-size="11">Probabilité prédite par le modèle</text>')
    svg.append(f'<text x="14" y="{H / 2:.0f}" text-anchor="middle" fill="#a3a3aa" font-size="11" transform="rotate(-90 14 {H / 2:.0f})">Win rate observé</text>')
    # Tick labels
    for frac in (0, 0.25, 0.5, 0.75, 1):
        x = pad + frac * plot_w
        y = pad + (1 - frac) * plot_h
        svg.append(f'<text x="{x:.0f}" y="{H - pad + 14}" text-anchor="middle" fill="#6b6b73" font-size="10">{int(frac * 100)}%</text>')
        svg.append(f'<text x="{pad - 6}" y="{y + 3:.0f}" text-anchor="end" fill="#6b6b73" font-size="10">{int(frac * 100)}%</text>')
    # Bins
    for b in valid:
        prob = b['prob_mean']
        wr = b['win_rate']
        n = b.get('n') or 0
        cx = pad + prob * plot_w
        cy = pad + (1 - wr) * plot_h
        r = max(4, min(20, 4 + 16 * (n / max_n)))
        gap = wr - prob
        col = '#34d399' if abs(gap) < 0.05 else ('#fbbf24' if abs(gap) < 0.10 else '#f87171')
        svg.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{col}" fill-opacity="0.25" stroke="{col}" stroke-width="2"/>')
        svg.append(f'<title>n={n} · prédit {prob * 100:.1f}% · réel {wr * 100:.1f}% (gap {gap * 100:+.1f}pp)</title>')
    svg.append('</svg>')
    return ''.join(svg)


def render_calibration_table(cal: list[dict]) -> str:
    rows = []
    for b in cal:
        n = b.get('n') or 0
        if n == 0:
            continue
        prob = b.get('prob_mean')
        wr = b.get('win_rate')
        gap = b.get('gap')
        gap_color = '#34d399' if (gap is not None and abs(gap) < 0.05) else ('#fbbf24' if (gap is not None and abs(gap) < 0.10) else '#f87171')
        gap_str = f'<span style="color:{gap_color};font-weight:600;">{gap * 100:+.1f}pp</span>' if gap is not None else '—'
        rows.append(
            f'<tr><td>[{b["lo"]:.1f}–{b["hi"]:.1f}]</td>'
            f'<td>{n}</td>'
            f'<td>{fmt_pct(prob)}</td>'
            f'<td>{fmt_pct(wr)}</td>'
            f'<td>{gap_str}</td></tr>'
        )
    if not rows:
        return '<p style="color:#a3a3aa;">Pas encore assez de données.</p>'
    return ''.join([
        '<table>',
        '<thead><tr><th>Bin probabilité</th><th>N</th><th>Prob moyenne</th><th>WR observé</th><th>Gap</th></tr></thead>',
        '<tbody>', *rows, '</tbody></table>',
    ])


PAGE_TEMPLATE = '''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>Crédibilité — Le modèle est-il honnête sur ses probabilités ?</title>
<meta name="description" content="Diagramme de calibration du modèle Paris-Sportif : quand on dit 70%, gagne-t-on vraiment 70% ? Brier {brier_str}, log-loss {logloss_str}. Test ultime de l'honnêteté d'un modèle probabiliste.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="https://harotensnor.github.io/paris-sportif/credibilite.html">
<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">
<link rel="apple-touch-icon" href="icon-192.png">
<meta property="og:type" content="article">
<meta property="og:title" content="Crédibilité — Calibration probabiliste du modèle">
<meta property="og:description" content="Quand le modèle dit 70%, gagne-t-on vraiment 70% ? Diagramme de fiabilité + Brier + log-loss.">
<meta property="og:url" content="https://harotensnor.github.io/paris-sportif/credibilite.html">
<meta property="og:image" content="https://harotensnor.github.io/paris-sportif/icon-512.png">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#08080a">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'none'; manifest-src 'self'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; media-src 'none'; upgrade-insecure-requests">
<meta name="referrer" content="strict-origin-when-cross-origin">

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
      "@type": "TechArticle",
      "headline": "Calibration probabiliste du modèle Paris-Sportif",
      "url": "https://harotensnor.github.io/paris-sportif/credibilite.html",
      "datePublished": "{generated_iso}",
      "dateModified": "{generated_iso}",
      "author": {{ "@type": "Person", "name": "Théo Boulnois" }},
      "publisher": {{ "@id": "https://harotensnor.github.io/paris-sportif/#org" }},
      "inLanguage": "fr-FR"
    }},
    {{
      "@type": "BreadcrumbList",
      "itemListElement": [
        {{ "@type": "ListItem", "position": 1, "name": "Accueil", "item": "https://harotensnor.github.io/paris-sportif/" }},
        {{ "@type": "ListItem", "position": 2, "name": "Crédibilité", "item": "https://harotensnor.github.io/paris-sportif/credibilite.html" }}
      ]
    }}
  ]
}}
</script>

<style>
  :root {{ color-scheme: dark light; }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; font-family: "SF Pro Display", "Inter", -apple-system, BlinkMacSystemFont, sans-serif; background: #08080a; color: #e6ebf2; line-height: 1.65; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }}
  body {{ min-height: 100vh; }}
  a {{ color: #a78bfa; text-decoration: none; }}
  a:hover, a:focus {{ text-decoration: underline; }}
  code {{ font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: .92em; background: rgba(167,139,250,.1); padding: 1px 5px; border-radius: 4px; }}
  header.topbar {{ position: sticky; top: 0; z-index: 50; background: rgba(8,8,10,.85); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,.06); padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; }}
  .brand {{ display: flex; align-items: center; gap: 8px; font-weight: 800; letter-spacing: -.5px; color: inherit; }}
  .brand-logo {{ font-size: 22px; }}
  .brand-text {{ font-size: 17px; }}
  .topbar nav a {{ margin-left: 16px; font-size: 13.5px; color: #a3a3aa; font-weight: 500; min-height: 36px; display: inline-flex; align-items: center; }}
  .topbar nav a:hover {{ color: #e6ebf2; text-decoration: none; }}
  main {{ max-width: 920px; margin: 0 auto; padding: 16px 20px 60px; }}
  .breadcrumb {{ font-size: 12px; color: #6b6b73; margin-top: 14px; }}
  .uppercase-pill {{ display: inline-block; font-size: 11px; color: #a78bfa; text-transform: uppercase; letter-spacing: 1.4px; font-weight: 700; margin: 24px 0 4px; }}
  h1 {{ margin: 4px 0 6px; font-size: 36px; font-weight: 800; letter-spacing: -1.2px; line-height: 1.05; }}
  .lead {{ font-size: 14px; color: #a3a3aa; max-width: 640px; border-left: 3px solid #a78bfa; padding: 4px 0 4px 12px; margin: 0 0 28px; }}
  h2 {{ font-size: 22px; margin: 36px 0 12px; color: #fff; }}
  section.card {{ padding: 18px; background: #121215; border: 1px solid rgba(255,255,255,.08); border-radius: 12px; font-size: 13.5px; color: #c5c5cc; margin-bottom: 16px; }}
  .kpi-strip {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin: 0 0 22px; }}
  .kpi-card {{ padding: 16px 18px; background: #121215; border: 1px solid rgba(255,255,255,.08); border-radius: 12px; }}
  .kpi-label {{ font-size: 11px; color: #a3a3aa; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; margin-bottom: 4px; }}
  .kpi-value {{ font-size: 28px; font-weight: 800; letter-spacing: -.6px; color: #fff; }}
  .kpi-sub {{ font-size: 11.5px; color: #a3a3aa; margin-top: 4px; }}
  table {{ width: 100%; border-collapse: collapse; margin: 0 0 16px; background: #121215; border: 1px solid rgba(255,255,255,.08); border-radius: 10px; overflow: hidden; font-size: 13.5px; }}
  thead th {{ background: rgba(255,255,255,.03); color: #a3a3aa; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; text-align: left; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.08); }}
  tbody td {{ padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,.04); color: #c5c5cc; }}
  tbody tr:last-child td {{ border-bottom: none; }}
  tbody td:nth-child(2), tbody td:nth-child(3), tbody td:nth-child(4), tbody td:nth-child(5) {{ text-align: right; }}
  .legend {{ display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: #a3a3aa; margin: 12px 0 0; padding: 10px 14px; background: rgba(255,255,255,.02); border-radius: 8px; }}
  .legend .swatch {{ display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }}
  footer.site-footer {{ border-top: 1px solid rgba(255,255,255,.06); margin-top: 40px; padding: 24px 20px; text-align: center; font-size: 12.5px; color: #6b6b73; }}
  footer.site-footer nav a {{ margin: 0 10px; color: #a3a3aa; }}
  @media (prefers-color-scheme: light) {{
    html, body {{ background: #f5f5f7; color: #08080a; }}
    .topbar {{ background: rgba(245,245,247,.85); border-bottom-color: rgba(0,0,0,.08); }}
    .topbar nav a {{ color: #444; }}
    .kpi-card, table, section.card {{ background: #fff; border-color: rgba(0,0,0,.08); color: #2a2a30; }}
    .kpi-value, h2 {{ color: #08080a; }}
    thead th {{ background: rgba(0,0,0,.03); color: #444; border-bottom-color: rgba(0,0,0,.08); }}
    code {{ background: rgba(167,139,250,.15); }}
  }}
  @media (max-width: 600px) {{
    h1 {{ font-size: 26px; }}
    h2 {{ font-size: 18px; }}
    .topbar nav {{ display: none; }}
    .kpi-strip {{ grid-template-columns: 1fr 1fr; }}
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
    <a href="backtest.html">Backtest</a>
    <a href="academie.html">Académie</a>
    <a href="legal.html">Légal</a>
  </nav>
</header>

<main>
  <nav class="breadcrumb" aria-label="Fil d'ariane">
    <a href="./">Accueil</a> ›
    <span style="color:#9ba1ac;">Crédibilité</span>
  </nav>

  <span class="uppercase-pill">Calibration probabiliste</span>
  <h1>🎚️ Le modèle est-il honnête ?</h1>
  <p class="lead">Le test ultime d'un modèle de probabilité : <strong>quand il dit "70% de chance", est-ce que 70% de ces prédictions gagnent vraiment ?</strong> Si oui, le modèle est calibré (honnête). Sinon, ses pourcentages sont du bruit.</p>

  <div class="kpi-strip">
    <div class="kpi-card">
      <div class="kpi-label">Picks évalués</div>
      <div class="kpi-value">{n}</div>
      <div class="kpi-sub">{date_start} → {date_end}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Brier score</div>
      <div class="kpi-value" style="color:{brier_color};">{brier_str}</div>
      <div class="kpi-sub">0 = parfait · 0.25 = pile/face · &lt; 0.22 = signal réel</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Log-loss</div>
      <div class="kpi-value">{logloss_str}</div>
      <div class="kpi-sub">Plus bas = mieux calibré</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Win rate</div>
      <div class="kpi-value">{wr_str}</div>
      <div class="kpi-sub">Sur cote moyenne {avg_cote_str}</div>
    </div>
  </div>

  <h2>📊 Diagramme de fiabilité</h2>
  <section class="card">
    <p>Chaque cercle est un bin de prédictions, positionné par sa probabilité moyenne (axe X) et son win rate observé (axe Y). La taille du cercle reflète le nombre de picks dans le bin. <strong>La diagonale violette est la calibration parfaite</strong> : modèle qui dit X%, gagne X%.</p>
    {svg_diagram}
    <div class="legend">
      <span><span class="swatch" style="background:#34d399;"></span>Gap &lt; 5pp (bien calibré)</span>
      <span><span class="swatch" style="background:#fbbf24;"></span>Gap 5-10pp (acceptable)</span>
      <span><span class="swatch" style="background:#f87171;"></span>Gap &gt; 10pp (à creuser)</span>
    </div>
  </section>

  <h2>📋 Données par bin</h2>
  {table_calibration}

  <h2>🧠 Comment lire ces chiffres</h2>
  <section class="card">
    <p><strong>Brier score</strong> : <code>Σ(p_modèle − résultat)² / N</code>. C'est l'erreur moyenne au carré entre la probabilité prédite et l'issue réelle (0 ou 1). Un Brier de 0.25 correspond à du pile/face. <strong>0.22 = signal honnête</strong> sur ≥150 picks. Plus bas = meilleure calibration ET meilleure résolution.</p>
    <p><strong>Log-loss</strong> : pénalise les prédictions confiantes mais fausses (un "95%" qui perd compte beaucoup). Si le modèle est plus précis sur les picks confiants, le log-loss baisse rapidement.</p>
    <p><strong>Gap par bin</strong> : différence WR observé − prob moyenne dans chaque tranche. Un gap positif = le modèle <em>sous-estime</em> ses chances (les "70% prédits" gagnent en fait 75%). Un gap négatif = il <em>sur-estime</em>. Petit n par bin = pas conclure.</p>
  </section>

  <h2>🎯 Pourquoi c'est plus important que le ROI</h2>
  <section class="card">
    <p>Un modèle peut avoir un ROI positif par <em>chance</em> sur petite série. Mais un modèle <strong>bien calibré</strong> sur ≥200 picks signifie que ses probabilités reflètent la réalité — c'est un signal beaucoup plus difficile à fabriquer. La calibration est ce qui distingue un "lucky streak" d'un vrai edge.</p>
    <p>Concrètement, si tu mises selon Kelly fractionnaire, ton espérance de croissance long-terme dépend directement de la précision de tes probabilités. Un modèle mal calibré qui produit 60% sur des matchs où la vraie prob est 50% va te faire perdre de l'argent même avec un staking parfait.</p>
  </section>

  <p class="contrib-prompt">
    📐 Métriques détaillées (WR par tier, ROI par sport, calibration sur sous-segments) :
    <a href="backtest.html">Backtest</a>. Définitions : <a href="academie.html">Académie</a>. Protocole formel : <a href="methodologie.html">Méthodologie</a>.
    <br><br>
    Régénéré : <b>{generated_human}</b>
  </p>
</main>

<footer class="site-footer" role="contentinfo">
  <nav aria-label="Liens du site">
    <a href="./">Accueil</a> ·
    <a href="methodologie.html">Méthodologie</a> ·
    <a href="backtest.html">Backtest</a> ·
    <a href="academie.html">Académie</a> ·
    <a href="legal.html">Légal</a>
  </nav>
  <div style="margin-top:8px;">⚖️ Site éducatif · réservé aux 18+ · jouer comporte des risques</div>
</footer>
</body>
</html>
'''


def main() -> int:
    if not REPORT.exists():
        print(f'[build_credibilite_page] {REPORT.name} missing — skip.', flush=True)
        return 0
    try:
        report = json.loads(REPORT.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError) as e:
        print(f'[build_credibilite_page] failed to parse report: {e}', flush=True)
        return 1

    overall = report.get('overall') or {}
    cal = report.get('calibration') or []
    date_range = report.get('date_range') or {}
    generated_at = report.get('generated_at') or datetime.now(timezone.utc).isoformat()

    n = overall.get('n') or 0
    wr = overall.get('win_rate')
    brier = overall.get('brier')
    logloss = overall.get('logloss')
    avg_cote = overall.get('avg_cote')

    brier_color = '#34d399' if (brier is not None and brier < 0.22) else ('#fbbf24' if (brier is not None and brier < 0.25) else '#f87171')

    try:
        gen_dt = datetime.fromisoformat(generated_at.replace('Z', '+00:00'))
        generated_human = gen_dt.strftime('%Y-%m-%d %H:%M UTC')
        generated_iso = gen_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
    except (ValueError, AttributeError):
        generated_human = generated_at
        generated_iso = generated_at

    html = PAGE_TEMPLATE.format(
        n=n,
        wr_str=fmt_pct(wr),
        brier_str=f'{brier:.4f}' if brier is not None else '—',
        brier_color=brier_color,
        logloss_str=f'{logloss:.4f}' if logloss is not None else '—',
        avg_cote_str=f'{avg_cote:.2f}' if avg_cote is not None else '—',
        date_start=date_range.get('start', '—')[:10],
        date_end=date_range.get('end', '—')[:10],
        generated_human=generated_human,
        generated_iso=generated_iso,
        svg_diagram=render_calibration_svg(cal),
        table_calibration=render_calibration_table(cal),
    )

    OUTPUT.write_text(html, encoding='utf-8')
    size_kb = OUTPUT.stat().st_size // 1024
    brier_log = f'{brier:.4f}' if brier is not None else 'n/a'
    print(f'[build_credibilite_page] credibilite.html · {size_kb} KB · n={n} · Brier {brier_log}', flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())

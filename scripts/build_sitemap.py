#!/usr/bin/env python3
"""AUDIT-2026-04-27 (Sprint 37 #23) — Sitemap dynamique.

Régénère sitemap.xml à chaque cron tick avec :
- Landing page (priority 1.0)
- Pages éditoriales statiques (priority 0.7-0.9)
- Pages générées (backtest, credibilite) (priority 0.7)
- Pronostics SPA (priority 0.6) — hash routes pour les SPA pages
- RSS feed (priority 0.5)

Lastmod calculé depuis git log, fallback mtime du fichier source.

Tournés en pipeline refresh.yml après build_credibilite/build_backtest.
"""
from __future__ import annotations
import sys
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'sitemap.xml'
BASE = 'https://harotensnor.github.io/paris-sportif'


def _git_lastmod(filename: str) -> str | None:
    try:
        res = subprocess.run(
            ['git', 'log', '-1', '--format=%cs', '--', filename],
            cwd=ROOT,
            text=True,
            capture_output=True,
            timeout=5,
            check=False,
        )
    except Exception:
        return None
    val = (res.stdout or '').strip()
    return val if val else None


def _file_lastmod(filename: str) -> str:
    p = ROOT / filename
    if not p.exists():
        return datetime.now(timezone.utc).strftime('%Y-%m-%d')
    return datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc).strftime('%Y-%m-%d')


def _lastmod(src) -> str:
    sources = src if isinstance(src, (list, tuple)) else [src]
    dates = []
    for filename in sources:
        dates.append(_git_lastmod(filename) or _file_lastmod(filename))
    return max(dates) if dates else datetime.now(timezone.utc).strftime('%Y-%m-%d')


STATIC_URLS = [
    {'loc': '/',                           'priority': 1.0,  'changefreq': 'weekly',  'lastmod_src': 'index.html'},
    {'loc': '/methodologie.html',          'priority': 0.9,  'changefreq': 'monthly', 'lastmod_src': 'methodologie.html'},
    {'loc': '/academie.html',              'priority': 0.85, 'changefreq': 'monthly', 'lastmod_src': 'academie.html'},
    {'loc': '/comment-lire-un-prono.html', 'priority': 0.85, 'changefreq': 'monthly', 'lastmod_src': 'comment-lire-un-prono.html'},
    {'loc': '/credibilite.html',           'priority': 0.85, 'changefreq': 'weekly',  'lastmod_src': 'credibilite.html'},
    {'loc': '/backtest.html',              'priority': 0.85, 'changefreq': 'weekly',  'lastmod_src': 'backtest.html'},
    {'loc': '/legal.html',                 'priority': 0.5,  'changefreq': 'yearly',  'lastmod_src': 'legal.html'},
    {'loc': '/feed.xml',                   'priority': 0.5,  'changefreq': 'hourly',  'lastmod_src': 'feed.xml'},
]


SPA_ROUTES = [
    ('dashboard', 0.95, 'daily'),
    ('top', 0.88, 'daily'),
    ('valeur', 0.88, 'daily'),
    ('locks', 0.84, 'daily'),
    ('matchs', 0.82, 'daily'),
    ('tous', 0.80, 'daily'),
    ('performance', 0.78, 'daily'),
    ('historique', 0.76, 'daily'),
    ('bilan', 0.74, 'daily'),
    ('calendrier', 0.72, 'daily'),
    ('combines', 0.70, 'daily'),
    ('buteurs', 0.70, 'daily'),
    ('favoris', 0.64, 'daily'),
    ('compare', 0.64, 'weekly'),
    ('plan-mise', 0.64, 'weekly'),
    ('simulator', 0.64, 'weekly'),
    ('montante-jour', 0.62, 'daily'),
    ('montante-weekend', 0.60, 'weekly'),
    ('montante-semaine', 0.60, 'weekly'),
    ('backtest', 0.58, 'weekly'),
    ('credibilite', 0.58, 'weekly'),
    ('academie', 0.52, 'monthly'),
    ('methodologie', 0.52, 'monthly'),
    ('sante', 0.45, 'daily'),
]


# Liste structurée pour facile maintenance
URLS = STATIC_URLS + [
    {'loc': '/pronostics.html', 'priority': 0.95, 'changefreq': 'daily', 'lastmod_src': ['pronostics.html', 'app.js']},
    *[
        {
            'loc': f'/pronostics.html#{route}',
            'priority': priority,
            'changefreq': changefreq,
            'lastmod_src': ['pronostics.html', 'app.js'],
        }
        for route, priority, changefreq in SPA_ROUTES
    ],
]


def main() -> int:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in URLS:
        lines.append('  <url>')
        lines.append(f'    <loc>{escape(BASE + u["loc"])}</loc>')
        lines.append(f'    <lastmod>{_lastmod(u["lastmod_src"])}</lastmod>')
        lines.append(f'    <changefreq>{u["changefreq"]}</changefreq>')
        lines.append(f'    <priority>{u["priority"]}</priority>')
        lines.append('  </url>')
    lines.append('</urlset>')
    OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'sitemap.xml regenerated : {len(URLS)} URLs')
    return 0


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""AUDIT-2026-04-27 (Sprint 37 #23) — Sitemap dynamique.

Régénère sitemap.xml à chaque cron tick avec :
- Landing page (priority 1.0)
- Pages éditoriales statiques (priority 0.7-0.9)
- Pages générées (backtest, credibilite) (priority 0.7)
- Pronostics SPA (priority 0.6) — hash routes pour les SPA pages
- RSS feed (priority 0.5)

Lastmod calculé depuis mtime du fichier source.

Tournés en pipeline refresh.yml après build_credibilite/build_backtest.
"""
from __future__ import annotations
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'sitemap.xml'
BASE = 'https://harotensnor.github.io/paris-sportif'


def _lastmod(filename: str) -> str:
    p = ROOT / filename
    if not p.exists():
        return datetime.now(timezone.utc).strftime('%Y-%m-%d')
    return datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc).strftime('%Y-%m-%d')


# Liste structurée pour facile maintenance
URLS = [
    # Landing + pages indexables sans JS (priority haute)
    {'loc': '/',                          'priority': 1.0,  'changefreq': 'weekly',  'lastmod_src': 'index.html'},
    {'loc': '/methodologie.html',         'priority': 0.9,  'changefreq': 'monthly', 'lastmod_src': 'methodologie.html'},
    {'loc': '/academie.html',             'priority': 0.85, 'changefreq': 'monthly', 'lastmod_src': 'academie.html'},
    {'loc': '/comment-lire-un-prono.html','priority': 0.85, 'changefreq': 'monthly', 'lastmod_src': 'comment-lire-un-prono.html'},
    {'loc': '/credibilite.html',          'priority': 0.85, 'changefreq': 'weekly',  'lastmod_src': 'credibilite.html'},
    {'loc': '/backtest.html',             'priority': 0.85, 'changefreq': 'weekly',  'lastmod_src': 'backtest.html'},
    {'loc': '/legal.html',                'priority': 0.5,  'changefreq': 'yearly',  'lastmod_src': 'legal.html'},
    # Dashboard SPA (le contenu est dynamique mais l'URL est canonique)
    {'loc': '/pronostics.html',           'priority': 0.95, 'changefreq': 'daily',   'lastmod_src': 'pronostics.html'},
    # Routes SPA principales (Google indexe les hash en pratique)
    {'loc': '/pronostics.html#tous',      'priority': 0.7,  'changefreq': 'daily',   'lastmod_src': 'pronostics.html'},
    {'loc': '/pronostics.html#locks',     'priority': 0.8,  'changefreq': 'daily',   'lastmod_src': 'pronostics.html'},
    {'loc': '/pronostics.html#calendrier','priority': 0.7,  'changefreq': 'daily',   'lastmod_src': 'pronostics.html'},
    {'loc': '/pronostics.html#bilan',     'priority': 0.6,  'changefreq': 'daily',   'lastmod_src': 'pronostics.html'},
    {'loc': '/pronostics.html#backtest',  'priority': 0.7,  'changefreq': 'weekly',  'lastmod_src': 'pronostics.html'},
    {'loc': '/pronostics.html#credibilite','priority': 0.7, 'changefreq': 'weekly',  'lastmod_src': 'pronostics.html'},
    # RSS feed
    {'loc': '/feed.xml',                  'priority': 0.5,  'changefreq': 'hourly',  'lastmod_src': 'feed.xml'},
]


def main() -> int:
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in URLS:
        lines.append('  <url>')
        lines.append(f'    <loc>{BASE}{u["loc"]}</loc>')
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

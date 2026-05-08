#!/usr/bin/env python3
"""AUDIT-2026-04-27 (Sprint 37 #23) — Sitemap dynamique.

Régénère sitemap.xml à chaque cron tick avec :
- Landing page (priority 1.0)
- Pages éditoriales statiques (priority 0.7-0.9)
- Pages générées (backtest, credibilite) (priority 0.85)
- Pronostics dashboard URL canonique (priority 0.95)
- RSS feed (priority 0.5)

AUDIT 2026-05-08 : retrait des 268 hash-anchors (SPA routes + match routes).
Googlebot traite les fragments comme l'URL canonique sans hash, donc lister
`/pronostics.html#dashboard` etc. = 268 doublons qui brûlent le crawl budget.
On ne garde que les URLs réellement canoniques.

Lastmod calculé depuis git log, fallback mtime du fichier source.

Tournés en pipeline refresh.yml après build_credibilite/build_backtest.
"""
from __future__ import annotations
import sys
import subprocess
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'sitemap.xml'
DATA_JS = ROOT / 'data.js'
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
    {'loc': '/',                           'priority': 1.0,  'changefreq': 'daily',   'lastmod_src': 'index.html'},
    {'loc': '/methodologie.html',          'priority': 0.9,  'changefreq': 'monthly', 'lastmod_src': 'methodologie.html'},
    {'loc': '/academie.html',              'priority': 0.85, 'changefreq': 'monthly', 'lastmod_src': 'academie.html'},
    {'loc': '/comment-lire-un-prono.html', 'priority': 0.85, 'changefreq': 'monthly', 'lastmod_src': 'comment-lire-un-prono.html'},
    {'loc': '/credibilite.html',           'priority': 0.85, 'changefreq': 'weekly',  'lastmod_src': 'credibilite.html'},
    {'loc': '/backtest.html',              'priority': 0.85, 'changefreq': 'weekly',  'lastmod_src': 'backtest.html'},
    {'loc': '/legal.html',                 'priority': 0.5,  'changefreq': 'yearly',  'lastmod_src': 'legal.html'},
    {'loc': '/feed.xml',                   'priority': 0.5,  'changefreq': 'hourly',  'lastmod_src': 'feed.xml'},
]


# AUDIT 2026-05-08 : SPA_ROUTES retirées du sitemap. Googlebot traite
# `/pronostics.html#dashboard` comme `/pronostics.html`, donc les 8 routes
# hash devenaient 8 doublons noyant les 7 URLs canoniques. La nav interne
# du site reste fonctionnelle, c'est juste le sitemap qui est nettoyé.

# Liste structurée pour facile maintenance
URLS = STATIC_URLS + [
    {'loc': '/pronostics.html', 'priority': 0.95, 'changefreq': 'daily', 'lastmod_src': ['pronostics.html', 'legacy-app.js', 'app.js']},
]


def _data_lastmod() -> str:
    try:
        raw = DATA_JS.read_text(encoding='utf-8')
        m = re.search(r'PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', raw, re.DOTALL)
        if not m:
            return _lastmod('data.js')
        data = json.loads(m.group(1))
        ga = data.get('generated_at')
        if ga:
            return str(ga)[:10]
    except Exception:
        pass
    return _lastmod('data.js')


# AUDIT 2026-05-08 : _match_urls() retiré. Les hash routes
# `/pronostics.html#match/{id}/synthese` étaient 260 doublons en plus.
# Le crawl Google ne les distingue pas de `/pronostics.html`, et la fiche
# détail est de toute façon dynamique (data fraîche cron 5 min, ID volatile).


def _url_lastmod(u: dict) -> str:
    return u.get('lastmod') or _lastmod(u['lastmod_src'])


def main() -> int:
    urls = URLS
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        lines.append('  <url>')
        lines.append(f'    <loc>{escape(BASE + u["loc"])}</loc>')
        lines.append(f'    <lastmod>{_url_lastmod(u)}</lastmod>')
        lines.append(f'    <changefreq>{u["changefreq"]}</changefreq>')
        lines.append(f'    <priority>{u["priority"]}</priority>')
        lines.append('  </url>')
    lines.append('</urlset>')
    OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'sitemap.xml regenerated : {len(urls)} URLs canoniques (hash routes retirées AUDIT 2026-05-08)')
    return 0


if __name__ == '__main__':
    sys.exit(main())

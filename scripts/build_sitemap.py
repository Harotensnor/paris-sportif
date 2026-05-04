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


SPA_ROUTES = [
    ('dashboard', 0.95, 'daily'),
    ('tous', 0.92, 'daily'),
    ('performance', 0.82, 'daily'),
    ('academie', 0.74, 'weekly'),
    ('profil', 0.62, 'weekly'),
    ('sante', 0.58, 'daily'),
    ('montantes', 0.56, 'weekly'),
    ('legal', 0.42, 'yearly'),
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


def _match_urls() -> list[dict]:
    try:
        raw = DATA_JS.read_text(encoding='utf-8')
        m = re.search(r'PRONOSTICS_DATA\s*=\s*(\{.*\})\s*;?\s*$', raw, re.DOTALL)
        if not m:
            return []
        data = json.loads(m.group(1))
    except Exception:
        return []
    seen = set()
    out = []
    lastmod = _data_lastmod()
    for events in (data.get('days') or {}).values():
        for ev in events or []:
            mid = str(ev.get('id') or '').strip()
            if not mid or mid in seen:
                continue
            w = ev.get('winamax') or {}
            if w.get('available') is not True or not w.get('match_id'):
                continue
            seen.add(mid)
            out.append({
                'loc': f'/pronostics.html#match/{mid}/synthese',
                'priority': 0.50,
                'changefreq': 'daily',
                'lastmod': lastmod,
            })
    return out


def _url_lastmod(u: dict) -> str:
    return u.get('lastmod') or _lastmod(u['lastmod_src'])


def main() -> int:
    urls = URLS + _match_urls()
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
    print(f'sitemap.xml regenerated : {len(urls)} URLs ({len(urls) - len(URLS)} match routes)')
    return 0


if __name__ == '__main__':
    sys.exit(main())

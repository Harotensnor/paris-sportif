#!/usr/bin/env python3
"""Validate Open Graph metadata + RSS feed structure.

v49 — Audit points #30 (OG validator) + #31 (RSS validator).

Smoke checks pour s'assurer que les pages produisent du markup OG/RSS
syntaxiquement correct et que les references vers les fichiers OG existent.

Sortie : audit_seo_validators.json + audit_seo_validators.md.
"""
from __future__ import annotations
import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORT_JSON = ROOT / 'audit_seo_validators.json'
REPORT_MD = ROOT / 'audit_seo_validators.md'

OG_PROPERTIES = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type']
TWITTER_PROPERTIES = ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']


def check_og(html_path: Path) -> dict:
    if not html_path.exists():
        return {'file': html_path.name, 'error': 'not found'}
    text = html_path.read_text(encoding='utf-8', errors='ignore')
    found = {}
    missing = []
    for prop in OG_PROPERTIES:
        m = re.search(r'<meta[^>]+property=["\']' + re.escape(prop) + r'["\'][^>]+content=["\']([^"\']+)["\']', text)
        if m:
            found[prop] = m.group(1)
        else:
            # Try with name= attribute
            m2 = re.search(r'<meta[^>]+name=["\']' + re.escape(prop) + r'["\'][^>]+content=["\']([^"\']+)["\']', text)
            if m2:
                found[prop] = m2.group(1)
            else:
                missing.append(prop)
    twitter_found = {}
    twitter_missing = []
    for prop in TWITTER_PROPERTIES:
        m = re.search(r'<meta[^>]+name=["\']' + re.escape(prop) + r'["\'][^>]+content=["\']([^"\']+)["\']', text)
        if m:
            twitter_found[prop] = m.group(1)
        else:
            twitter_missing.append(prop)
    # Check og:image exists on disk
    og_image_exists = None
    if 'og:image' in found:
        img = found['og:image'].split('/')[-1].split('?')[0]
        og_image_exists = (ROOT / img).exists() if img else False
    return {
        'file': html_path.name,
        'og_found': found,
        'og_missing': missing,
        'twitter_found': twitter_found,
        'twitter_missing': twitter_missing,
        'og_image_exists_locally': og_image_exists,
    }


def check_rss(rss_path: Path) -> dict:
    if not rss_path.exists():
        return {'file': rss_path.name, 'error': 'not found'}
    try:
        tree = ET.parse(rss_path)
        root = tree.getroot()
    except ET.ParseError as e:
        return {'file': rss_path.name, 'error': f'invalid XML: {e}'}
    # RSS 2.0 structure : <rss version="2.0"><channel><title/><link/><description/><item>*</channel></rss>
    if root.tag != 'rss':
        return {'file': rss_path.name, 'error': f'root is {root.tag}, expected rss'}
    version = root.get('version', '')
    channel = root.find('channel')
    if channel is None:
        return {'file': rss_path.name, 'error': 'missing <channel>'}
    items = channel.findall('item')
    issues = []
    if not channel.find('title') is not None or not channel.findtext('title', '').strip():
        issues.append('missing channel/title')
    if not channel.find('link') is not None or not channel.findtext('link', '').strip():
        issues.append('missing channel/link')
    if not channel.find('description') is not None or not channel.findtext('description', '').strip():
        issues.append('missing channel/description')
    items_with_issues = 0
    for item in items:
        if not item.findtext('title', '').strip():
            items_with_issues += 1
            continue
        if not item.findtext('link', '').strip():
            items_with_issues += 1
    return {
        'file': rss_path.name,
        'rss_version': version,
        'channel_title': channel.findtext('title', '').strip(),
        'channel_link': channel.findtext('link', '').strip(),
        'item_count': len(items),
        'items_with_issues': items_with_issues,
        'channel_issues': issues,
        'valid': len(issues) == 0 and items_with_issues == 0,
    }


def check_sitemap(sm_path: Path) -> dict:
    if not sm_path.exists():
        return {'file': sm_path.name, 'error': 'not found'}
    try:
        tree = ET.parse(sm_path)
        root = tree.getroot()
    except ET.ParseError as e:
        return {'file': sm_path.name, 'error': f'invalid XML: {e}'}
    # sitemap : <urlset xmlns="..."><url><loc/><lastmod/><priority/></url>+</urlset>
    ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    urls = root.findall('sm:url', ns) or root.findall('url')
    locs = [u.findtext('sm:loc', '', ns) or u.findtext('loc', '') for u in urls]
    lastmods = [u.findtext('sm:lastmod', '', ns) or u.findtext('lastmod', '') for u in urls]
    unique_lastmods = set(filter(None, lastmods))
    return {
        'file': sm_path.name,
        'url_count': len(urls),
        'unique_lastmods': len(unique_lastmods),
        'all_same_lastmod': len(unique_lastmods) <= 1,
        'sample_urls': locs[:5],
    }


def main() -> int:
    pages = ['index.html', 'pronostics.html', 'methodologie.html', 'academie.html', 'comment-lire-un-prono.html', 'backtest.html', 'credibilite.html', 'legal.html']
    report = {
        'generated_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'og_meta': [check_og(ROOT / p) for p in pages],
        'rss': check_rss(ROOT / 'feed.xml'),
        'sitemap': check_sitemap(ROOT / 'sitemap.xml'),
    }
    REPORT_JSON.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')

    lines = ['# Audit SEO validators', '', f"Généré : {report['generated_at']}", '']
    lines.append('## Open Graph metadata')
    lines.append('| Page | OG fields trouvés | Twitter fields | OG image existe |')
    lines.append('|------|-------------------|----------------|------------------|')
    for o in report['og_meta']:
        if 'error' in o:
            lines.append(f"| {o['file']} | ERROR: {o['error']} | — | — |")
            continue
        og_count = f"{len(o['og_found'])}/5"
        tw_count = f"{len(o['twitter_found'])}/4"
        img_ok = '✅' if o.get('og_image_exists_locally') else '❌' if o.get('og_image_exists_locally') == False else '?'
        lines.append(f"| {o['file']} | {og_count} | {tw_count} | {img_ok} |")
    missing_pages = [o for o in report['og_meta'] if not 'error' in o and o['og_missing']]
    if missing_pages:
        lines.append('')
        lines.append('### Champs OG manquants par page')
        for p in missing_pages:
            lines.append(f"- **{p['file']}** : {', '.join(p['og_missing'])}")
    lines.append('')
    lines.append('## RSS feed (feed.xml)')
    rss = report['rss']
    if 'error' in rss:
        lines.append(f"❌ ERROR: {rss['error']}")
    else:
        lines.append(f"- Version : {rss['rss_version']}")
        lines.append(f"- Channel title : {rss['channel_title']}")
        lines.append(f"- Items : {rss['item_count']}")
        lines.append(f"- Items avec problèmes : {rss['items_with_issues']}")
        lines.append(f"- Valid : {'✅' if rss['valid'] else '❌'}")
    lines.append('')
    lines.append('## Sitemap (sitemap.xml)')
    sm = report['sitemap']
    if 'error' in sm:
        lines.append(f"❌ ERROR: {sm['error']}")
    else:
        lines.append(f"- URL count : {sm['url_count']}")
        lines.append(f"- Unique lastmods : {sm['unique_lastmods']}")
        lines.append(f"- All same lastmod (BAD signal) : {'❌ OUI' if sm['all_same_lastmod'] else '✅ NON'}")
    lines.append('')
    REPORT_MD.write_text('\n'.join(lines) + '\n', encoding='utf-8')

    print(f"[audit_seo_validators] Report écrit : {REPORT_JSON.name} + {REPORT_MD.name}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

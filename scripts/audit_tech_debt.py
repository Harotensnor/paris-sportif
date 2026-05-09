#!/usr/bin/env python3
"""Audit dette technique : compte !important CSS, inline styles, CSP patterns.

v49 — Audit point #34 + #35 : auditer le code pour mesurer la dette
technique restante. Sortie : audit_tech_debt.json + audit_tech_debt.md.

Pas bloquant, juste informatif. Permet de tracker les progrès au fil du
temps via git diff.

Tourne dans refresh.yml une fois par jour (cron + minute = 0).
"""
from __future__ import annotations
import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPORT_JSON = ROOT / 'audit_tech_debt.json'
REPORT_MD = ROOT / 'audit_tech_debt.md'


def count_css_important(css_path: Path) -> dict:
    if not css_path.exists():
        return {'file': str(css_path), 'error': 'not found'}
    text = css_path.read_text(encoding='utf-8', errors='ignore')
    # Match !important occurrences
    imp_count = len(re.findall(r'!important', text))
    # Categorize : inside @media block?
    media_imp = 0
    in_media = False
    media_depth = 0
    for line in text.split('\n'):
        if '@media' in line:
            in_media = True
        if in_media:
            media_depth += line.count('{') - line.count('}')
            if '!important' in line:
                media_imp += 1
            if media_depth <= 0:
                in_media = False
                media_depth = 0
    return {
        'file': css_path.name,
        'lines': text.count('\n'),
        'bytes': len(text),
        'important_total': imp_count,
        'important_in_media': media_imp,
        'important_outside_media': imp_count - media_imp,
    }


def count_inline_styles(html_path: Path) -> dict:
    if not html_path.exists():
        return {'file': str(html_path), 'error': 'not found'}
    text = html_path.read_text(encoding='utf-8', errors='ignore')
    return {
        'file': html_path.name,
        'lines': text.count('\n'),
        'inline_style_attrs': len(re.findall(r'\sstyle="[^"]+"', text)),
        'inline_onclick': len(re.findall(r'\sonclick="', text)),
        'inline_script_tags': len(re.findall(r'<script[^>]*>(?!.*src=)', text)),
    }


def count_js_patterns(js_path: Path) -> dict:
    if not js_path.exists():
        return {'file': str(js_path), 'error': 'not found'}
    text = js_path.read_text(encoding='utf-8', errors='ignore')
    return {
        'file': js_path.name,
        'lines': text.count('\n'),
        'bytes': len(text),
        # Versioned variable naming (v37*, v40*, v45* etc.) = sprint memos
        'sprint_naming_v37': len(re.findall(r'\bv37\w+', text)),
        'sprint_naming_v40': len(re.findall(r'\bv40\w+', text)),
        'sprint_naming_v43': len(re.findall(r'\bv43\w+', text)),
        'sprint_naming_v45': len(re.findall(r'\bv45\w+', text)),
        'sprint_naming_v46': len(re.findall(r'\bv46\w+', text)),
        'sprint_naming_v47': len(re.findall(r'\bv47\w+', text)),
        'sprint_naming_v48': len(re.findall(r'\bv48\w+', text)),
        'sprint_naming_v49': len(re.findall(r'\bv49\w+', text)),
        # Inline `style="..."` patterns inside JS (template literals)
        'js_inline_styles': len(re.findall(r'style="[^"]+"', text)),
        # try { window.X = X; } catch(e) {} — module exposure pattern
        'window_exposes': len(re.findall(r'try\s*\{\s*window\.\w+\s*=', text)),
        # _v37*, _v40* etc. function names
        'private_versioned_funcs': len(re.findall(r'function\s+_v\d+\w+', text)),
        # Console.log calls (should be 0 in prod)
        'console_log': len(re.findall(r'console\.log\b', text)),
        'console_warn': len(re.findall(r'console\.warn\b', text)),
        'console_error': len(re.findall(r'console\.error\b', text)),
        # eslint-disable comments (suppressed warnings)
        'eslint_disable': len(re.findall(r'eslint-disable', text)),
        # TODO / FIXME / HACK
        'todo': len(re.findall(r'\b(TODO|FIXME|HACK|XXX)\b', text)),
    }


def main() -> int:
    css_files = [ROOT / 'app.css', ROOT / 'app-design-v3.css', ROOT / 'static-page.css', ROOT / 'print.css']
    html_files = [ROOT / 'pronostics.html', ROOT / 'index.html', ROOT / 'methodologie.html', ROOT / 'academie.html', ROOT / 'comment-lire-un-prono.html', ROOT / 'legal.html']
    js_files = [ROOT / 'app.js', ROOT / 'legacy-app.js']

    report = {
        'generated_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'css': [count_css_important(p) for p in css_files],
        'html': [count_inline_styles(p) for p in html_files],
        'js': [count_js_patterns(p) for p in js_files],
    }
    REPORT_JSON.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')

    # Markdown summary
    lines = ['# Audit dette technique', '', f"Généré : {report['generated_at']}", '']
    lines.append('## CSS — !important par fichier')
    lines.append('| Fichier | Lignes | !important total | dans @media | hors @media |')
    lines.append('|---------|--------|------------------|-------------|-------------|')
    for c in report['css']:
        if 'error' in c:
            continue
        lines.append(f"| {c['file']} | {c['lines']} | {c['important_total']} | {c['important_in_media']} | {c['important_outside_media']} |")
    lines.append('')
    lines.append('## HTML — inline styles + onclick')
    lines.append('| Fichier | Lignes | style="" | onclick | <script> inline |')
    lines.append('|---------|--------|----------|---------|------------------|')
    for h in report['html']:
        if 'error' in h:
            continue
        lines.append(f"| {h['file']} | {h['lines']} | {h['inline_style_attrs']} | {h['inline_onclick']} | {h['inline_script_tags']} |")
    lines.append('')
    lines.append('## JS — patterns dette')
    lines.append('| Fichier | Lignes | KB | window exposes | _v* funcs | console | TODO/FIXME |')
    lines.append('|---------|--------|-----|----------------|-----------|---------|------------|')
    for j in report['js']:
        if 'error' in j:
            continue
        kb = j['bytes'] // 1024
        console_total = j['console_log'] + j['console_warn'] + j['console_error']
        lines.append(f"| {j['file']} | {j['lines']} | {kb} | {j['window_exposes']} | {j['private_versioned_funcs']} | {console_total} | {j['todo']} |")
    lines.append('')
    lines.append('## Sprint naming distribution (legacy-app.js)')
    legacy = next((j for j in report['js'] if j.get('file') == 'legacy-app.js'), {})
    if legacy:
        lines.append('| Sprint | Occurrences |')
        lines.append('|--------|-------------|')
        for v in ['v37', 'v40', 'v43', 'v45', 'v46', 'v47', 'v48', 'v49']:
            n = legacy.get(f'sprint_naming_{v}', 0)
            lines.append(f'| {v} | {n} |')
    lines.append('')
    lines.append('---')
    lines.append('Rapport non bloquant. Tracker via git diff sur ce fichier au fil des sprints.')
    REPORT_MD.write_text('\n'.join(lines) + '\n', encoding='utf-8')

    print(f"[audit_tech_debt] Report écrit : {REPORT_JSON.name} + {REPORT_MD.name}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

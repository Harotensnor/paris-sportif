#!/usr/bin/env python3
"""Tag every event in data.js with Winamax availability + deep link.

Runs after fetch_live / fetch_v3 / patch_odds. Idempotent.
"""
import json, re, sys
from pathlib import Path
from datetime import datetime

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from winamax_map import lookup

DATA_JS = Path(__file__).resolve().parent.parent / 'data.js'
HTML = Path(__file__).resolve().parent.parent / 'pronostics.html'


def main():
    t0 = datetime.now()
    text = DATA_JS.read_text(encoding='utf-8')
    data = json.loads(re.search(r'=\s*(\{.*\})\s*;?\s*$', text, re.DOTALL).group(1))

    stats = {'tagged': 0, 'available': 0, 'dropped': 0}
    days = data.get('days', {}) or {}
    for day in list(days.keys()):
        kept = []
        for ev in days[day]:
            info = lookup(ev)
            stats['tagged'] += 1
            # Théo only bets on Winamax — non-Winamax events are stripped entirely so
            # they never reach the dashboard, not even hidden behind a toggle.
            if not info['available']:
                stats['dropped'] += 1
                continue
            ev['winamax'] = {
                'available': True,
                'url': info['url'],
                'note': info['note'],
            }
            stats['available'] += 1
            kept.append(ev)
        days[day] = kept

    payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    DATA_JS.write_text(f'window.PRONOSTICS_DATA = {payload};\n', encoding='utf-8')

    # Also inline into pronostics.html
    html_text = HTML.read_text(encoding='utf-8')
    new_block = f'<script>\nwindow.PRONOSTICS_DATA = {payload};\n</script>'
    html_text = re.sub(r'<script>\s*window\.PRONOSTICS_DATA\s*=.*?;?\s*</script>',
                       new_block, html_text, count=1, flags=re.DOTALL)
    HTML.write_text(html_text, encoding='utf-8')

    print(f'[{t0:%H:%M:%S}] winamax filter → {stats["tagged"]} events scanned, '
          f'{stats["available"]} kept on Winamax ({100*stats["available"]//max(1,stats["tagged"])}%), '
          f'{stats["dropped"]} dropped')


if __name__ == '__main__':
    main()

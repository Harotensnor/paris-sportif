#!/usr/bin/env python3
"""AUDIT-2026-04-27 (Sprint 8 #9) — Backup data.js snapshots quotidiens.

Crée `archives/data-YYYY-MM-DD.js.gz` à 23:59 chaque jour. Garde
les 30 derniers jours (rolling), purge les plus vieux. Permet :
- Recovery rapide : retrouver l'état exact d'un jour passé
- Analytics longitudinale : voir comment les cotes/picks bougent
  entre deux jours sans dépendre de odds_history.jsonl (qui ne
  stocke que les odds, pas les autres champs).

Tournés une fois par jour via refresh.yml (cadence 288 = 1×/24h).
Idempotent : si le fichier du jour existe déjà, ne le recrée pas.

Compression gzip : data.js fait ~1.3 MB → ~250 KB en gzip → 7.5 MB
sur 30 jours = négligeable pour un repo Git.
"""
from __future__ import annotations
import gzip
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data.js'
ARCHIVES = ROOT / 'archives'
ROLLING_DAYS = 30


def main() -> int:
    if not DATA.exists():
        print('backup: data.js absent. Skip.')
        return 0
    ARCHIVES.mkdir(exist_ok=True)
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    out_path = ARCHIVES / f'data-{today}.js.gz'
    if out_path.exists():
        print(f'backup: {out_path.name} déjà existant, skip.')
        return 0

    # Compress data.js → .gz
    raw = DATA.read_bytes()
    with gzip.open(str(out_path), 'wb', compresslevel=9) as f:
        f.write(raw)
    size_kb = out_path.stat().st_size / 1024
    print(f'backup: créé {out_path.name} ({size_kb:.0f} KB compressé)')

    # Purge les anciens (>30 jours)
    cutoff = datetime.now(timezone.utc) - timedelta(days=ROLLING_DAYS)
    purged = 0
    for f in ARCHIVES.glob('data-*.js.gz'):
        try:
            stem = f.stem.replace('data-', '').replace('.js', '')
            d = datetime.strptime(stem, '%Y-%m-%d').replace(tzinfo=timezone.utc)
            if d < cutoff:
                f.unlink()
                purged += 1
        except (ValueError, OSError):
            continue
    if purged:
        print(f'backup: purgé {purged} fichiers > {ROLLING_DAYS}j')
    return 0


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""Contract test : valide les schemas entre fetchers (writer) et patchers (reader).

Audit 2026-05-09 : v50.0/v50.3 ont trouvé 3 schema mismatches silencieux
(team_stats, footballdata, nba_team_stats) où le patcher lisait une clé qui
n'existait plus dans le fichier source. Coverage 0% pendant probablement des
semaines.

Ce script :
1. Lit chaque fichier sidecar à la racine du repo
2. Vérifie que les clés top-level attendues par patch_all_quick.py existent
3. Compte les entries dans la sub-dict pour détecter "exists but empty"
4. Sortie : rapport JSON + exit non-zero si mismatch critique

Idéal à run en CI sur push touchant scripts/patch_*.py ou les fichiers sidecars.

Usage :
    python3 scripts/audit_patch_contracts.py
    python3 scripts/audit_patch_contracts.py --strict   # exit 1 si silent failure
"""
from __future__ import annotations
import argparse
import gzip
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Contracts : pour chaque fichier sidecar, déclarer la clé top-level attendue
# par les patchers + un seuil minimum d'entries pour considérer "OK".
# Si un patcher utilise un fallback (ex: `data.get('A') or data.get('B')`),
# lister les deux dans `expected_keys` (premier match suffit).
CONTRACTS = [
    # (file, expected_keys_any_match, min_entries_threshold, reader_name)
    ('weather.json', ['matches'], 1, 'patch_weather'),
    ('referees_soccer.json', ['events'], 1, 'patch_referees'),
    ('lineups_soccer.json', ['events'], 1, 'patch_lineups'),
    ('injuries_soccer.json', ['teams', 'scanned_teams'], 0, 'patch_soccer_injuries'),
    # ↑ teams peut être vide si Sofascore renvoie no_source_events
    ('injuries_multisport.json', ['teams'], 1, 'patch_injuries'),
    ('clubelo.json', ['clubs', 'by_team'], 1, 'patch_clubelo'),
    ('team_form.json', ['by_team', 'baseball:mlb:1'], 1, 'patch_team_form'),
    # ↑ team_form indexé directement au top-level OR via by_team
    ('fbref_xg.json', ['by_team'], 1, 'patch_fbref_xg'),
    ('team_stats.json', ['teams', 'by_team'], 1, 'patch_team_stats'),
    ('footballdata.json', ['matches', 'by_match'], 1, 'patch_footballdata'),
    ('mlb_pitchers.json', ['matches', 'by_match'], 1, 'patch_mlb_pitchers'),
    ('nhl_stats.json', ['teams', 'by_team'], 1, 'patch_nhl_stats'),
    ('nba_team_stats.json', ['teams', 'by_team'], 1, 'patch_nba_team_stats'),
    # tennis_features.json — fichier optionnel, fetcher peut être absent
]


def _load_any(path: Path) -> dict | None:
    """Load JSON or gzipped JSON."""
    gz = path.with_name(path.name + '.gz')
    if gz.exists():
        try:
            with gzip.open(gz, 'rt', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        return None


def _entries_count(value) -> int:
    """Count entries in a dict or list value."""
    if isinstance(value, dict):
        return len(value)
    if isinstance(value, list):
        return len(value)
    return 0


def audit_contract(filename: str, expected_keys: list[str], min_entries: int, reader_name: str) -> dict:
    """Audit a single contract."""
    path = ROOT / filename
    data = _load_any(path)

    result = {
        'file': filename,
        'reader': reader_name,
        'expected_keys': expected_keys,
        'min_entries': min_entries,
        'status': 'ok',
        'detail': '',
    }

    if data is None:
        result['status'] = 'missing'
        result['detail'] = f'{filename} (and .gz) does not exist'
        return result

    if not isinstance(data, dict):
        result['status'] = 'malformed'
        result['detail'] = f'top-level is {type(data).__name__}, expected dict'
        return result

    # Find first matching key
    matched_key = None
    for k in expected_keys:
        if k in data:
            matched_key = k
            break

    if matched_key is None:
        result['status'] = 'schema_mismatch'
        result['detail'] = (
            f'patcher {reader_name} reads any of {expected_keys}, '
            f'but file has top-level keys: {sorted(data.keys())[:8]}'
        )
        return result

    entries = _entries_count(data[matched_key])
    result['matched_key'] = matched_key
    result['entries'] = entries

    if entries < min_entries:
        result['status'] = 'empty'
        result['detail'] = (
            f'matched key "{matched_key}" exists but has {entries} entries '
            f'(min expected: {min_entries}). Likely fetcher silent failure.'
        )
        return result

    result['detail'] = f'{matched_key}: {entries} entries OK'
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description='Audit patch source contracts')
    parser.add_argument('--strict', action='store_true', help='exit 1 if any silent failure')
    parser.add_argument('--json-only', action='store_true', help='output JSON only')
    args = parser.parse_args()

    results = []
    silent_failures = 0
    schema_mismatches = 0
    missing_files = 0

    for filename, expected_keys, min_entries, reader in CONTRACTS:
        r = audit_contract(filename, expected_keys, min_entries, reader)
        results.append(r)
        if r['status'] == 'empty':
            silent_failures += 1
        elif r['status'] == 'schema_mismatch':
            schema_mismatches += 1
        elif r['status'] == 'missing':
            missing_files += 1

    out = {
        'generated_at_unix': int(__import__('time').time()),
        'total_contracts': len(CONTRACTS),
        'ok': sum(1 for r in results if r['status'] == 'ok'),
        'empty': silent_failures,
        'schema_mismatch': schema_mismatches,
        'missing': missing_files,
        'malformed': sum(1 for r in results if r['status'] == 'malformed'),
        'results': results,
    }

    out_path = ROOT / 'audit_patch_contracts.json'
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')

    if args.json_only:
        print(json.dumps(out, ensure_ascii=False, indent=2))
    else:
        print(f'[audit_patch_contracts] {out["ok"]}/{out["total_contracts"]} contracts OK')
        for r in results:
            status_icon = {
                'ok': '[OK]',
                'empty': '[EMPTY]',
                'schema_mismatch': '[MISMATCH]',
                'missing': '[MISSING]',
                'malformed': '[MALFORMED]',
            }.get(r['status'], '[?]')
            print(f'  {status_icon} {r["file"]:30s} ({r["reader"]:24s}) -> {r["detail"]}')
        print(f'[audit_patch_contracts] sortie : {out_path.name}')

    if args.strict and (schema_mismatches > 0 or silent_failures > 0):
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())

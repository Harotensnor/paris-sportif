#!/usr/bin/env python3
"""AUDIT 2026-05-08 v40 — IO helpers transparents pour sidecars JSON gzippés.

Quelques sidecars (footballdata, bayesian_priors, team_priors,
tennis_ratings, team_form) dépassent 1 MB chacun et sont commités à
chaque tick cron. Pour réduire l'historique git on les stocke
maintenant en ``.json.gz`` (compressés ×3-5).

Ces helpers permettent aux scripts de lire/écrire sans se soucier du
format physique :

* ``read_json(path)`` essaie ``path.gz`` puis ``path``. Renvoie le dict
  parsé. Lève FileNotFoundError si ni l'un ni l'autre n'existe.
* ``write_json(path, data, *, compress=True)`` écrit ``path.gz`` (gzip
  niveau 6) si ``compress=True``, sinon ``path`` plain. Si l'ancien
  fichier non-compressé existe encore, le supprime pour éviter la
  divergence.
* ``read_jsonl(path)`` itère sur les lignes JSON (gz ou plain).

Approche progressive : seuls les writers/readers explicitement migrés
appellent ces helpers. Les autres scripts continuent de lire le fichier
plain. Idempotent : si seul ``.gz`` existe, ``.json`` plain est
recréable via ``write_json(..., compress=False)`` au besoin.
"""
from __future__ import annotations

import gzip
import json
from pathlib import Path
from typing import Any, Iterator

__all__ = ["read_json", "write_json", "read_jsonl", "exists_any"]


def _candidates(path: str | Path) -> list[Path]:
    p = Path(path)
    gz = p.with_name(p.name + ".gz")
    if p.suffix == ".gz":
        plain = p.with_name(p.name[:-3])
        return [p, plain]
    return [gz, p]


def exists_any(path: str | Path) -> bool:
    return any(p.exists() for p in _candidates(path))


def read_json(path: str | Path) -> Any:
    """Charge JSON depuis ``path.gz`` ou ``path`` (priorité au .gz)."""
    for candidate in _candidates(path):
        if not candidate.exists():
            continue
        if candidate.suffix == ".gz":
            with gzip.open(candidate, "rt", encoding="utf-8") as f:
                return json.load(f)
        return json.loads(candidate.read_text(encoding="utf-8"))
    raise FileNotFoundError(f"Ni {path}.gz ni {path} ne sont présents.")


def write_json(
    path: str | Path,
    data: Any,
    *,
    compress: bool = True,
    indent: int | None = None,
    ensure_ascii: bool = False,
) -> Path:
    """Écrit JSON à ``path.gz`` (compress=True) ou ``path`` plain.

    Quand on écrit le ``.gz`` on supprime l'éventuel ``.json`` plain
    existant (sinon on aurait deux versions divergentes côte à côte).
    """
    p = Path(path)
    if p.suffix == ".gz":
        gz_target = p
        plain_target = p.with_name(p.name[:-3])
    else:
        gz_target = p.with_name(p.name + ".gz")
        plain_target = p
    payload = json.dumps(data, ensure_ascii=ensure_ascii, indent=indent)
    if compress:
        with gzip.open(gz_target, "wt", encoding="utf-8", compresslevel=6) as f:
            f.write(payload)
        if plain_target.exists() and plain_target != gz_target:
            try:
                plain_target.unlink()
            except OSError:
                pass
        return gz_target
    plain_target.write_text(payload, encoding="utf-8")
    return plain_target


def read_jsonl(path: str | Path) -> Iterator[Any]:
    """Itère lignes JSON depuis ``.gz`` ou plain. Lignes vides ignorées."""
    for candidate in _candidates(path):
        if not candidate.exists():
            continue
        if candidate.suffix == ".gz":
            with gzip.open(candidate, "rt", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        yield json.loads(line)
            return
        with open(candidate, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    yield json.loads(line)
        return
    raise FileNotFoundError(f"Ni {path}.gz ni {path} ne sont présents.")

#!/usr/bin/env python3
"""AUDIT 2026-05-08 v40 — winamax_markets.json sync via GitHub Releases.

Le fichier ``winamax_markets.json`` (~90 MB) est trop gros pour rester
commité à chaque tick cron (288×/jour = 25 GB/jour d'historique git
gaspillés). Cette aide externalise le stockage sur un asset de
"rolling release" (tag ``data-cache``) :

* ``download`` — récupère le dernier ``winamax_markets.json.gz`` depuis
  la release, le décompresse vers ``winamax_markets.json`` racine.
  No-op silencieux si la release n'existe pas (premier run).

* ``upload`` — gzip + push de ``winamax_markets.json`` racine vers la
  release (overwrite ``--clobber``). Crée la release si absente.

Aucun consumer frontend : le file est utilisé uniquement par
``patch_winamax_markets.py`` qui l'injecte dans ``data.js`` (commité).

Usage :
    python3 sync_winamax_markets_release.py download
    python3 sync_winamax_markets_release.py upload

Requires : ``gh`` CLI authentifié (GHA fournit ``GITHUB_TOKEN`` en env).
"""
from __future__ import annotations

import argparse
import gzip
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "winamax_markets.json"
GZ_NAME = "winamax_markets.json.gz"
TAG = "data-cache"
RELEASE_TITLE = "Rolling data cache (Winamax markets)"
RELEASE_NOTES = (
    "Cache rolling pour fichiers data trop gros pour git history.\n"
    "Régénéré à chaque tick cron — l'historique des releases n'est pas garanti."
)


def _run(cmd: list[str], **kwargs) -> subprocess.CompletedProcess:
    print(f"[sync] $ {' '.join(cmd)}", flush=True)
    return subprocess.run(cmd, **kwargs)


def _release_exists() -> bool:
    res = _run(
        ["gh", "release", "view", TAG],
        capture_output=True,
        text=True,
    )
    return res.returncode == 0


def _ensure_release() -> None:
    if _release_exists():
        return
    print(f"[sync] release {TAG} absent → création", flush=True)
    res = _run(
        [
            "gh",
            "release",
            "create",
            TAG,
            "--title",
            RELEASE_TITLE,
            "--notes",
            RELEASE_NOTES,
            "--prerelease",
        ],
        capture_output=True,
        text=True,
    )
    if res.returncode != 0:
        print(
            f"[sync] WARN release create failed: {res.stderr.strip()}",
            file=sys.stderr,
        )


def cmd_download() -> int:
    """Télécharge winamax_markets.json depuis la release vers racine."""
    if not _release_exists():
        print(f"[sync] release {TAG} absente — premier run, skip download")
        return 0
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        res = _run(
            [
                "gh",
                "release",
                "download",
                TAG,
                "--pattern",
                GZ_NAME,
                "--dir",
                str(tmp),
                "--clobber",
            ],
            capture_output=True,
            text=True,
        )
        if res.returncode != 0:
            print(
                f"[sync] WARN download failed: {res.stderr.strip()} — pipeline continue avec fichier local",
                file=sys.stderr,
            )
            return 0
        gz_path = tmp / GZ_NAME
        if not gz_path.exists():
            print(f"[sync] WARN {GZ_NAME} missing in release", file=sys.stderr)
            return 0
        with gzip.open(gz_path, "rb") as src, open(TARGET, "wb") as dst:
            shutil.copyfileobj(src, dst)
        size_mb = TARGET.stat().st_size / (1024 * 1024)
        print(f"[sync] OK winamax_markets.json restauré ({size_mb:.1f} MB)")
    return 0


def cmd_upload() -> int:
    """Compresse + upload winamax_markets.json sur la release rolling."""
    if not TARGET.exists():
        print(f"[sync] {TARGET.name} absent — rien à uploader")
        return 0
    size_in = TARGET.stat().st_size
    if size_in < 1024:
        print(f"[sync] {TARGET.name} suspicieusement petit ({size_in}B) — skip upload safety")
        return 0
    _ensure_release()
    with tempfile.TemporaryDirectory() as td:
        gz_path = Path(td) / GZ_NAME
        with open(TARGET, "rb") as src, gzip.open(gz_path, "wb", compresslevel=6) as dst:
            shutil.copyfileobj(src, dst)
        size_out = gz_path.stat().st_size
        ratio = size_out / size_in if size_in else 0
        print(
            f"[sync] gzip {size_in / 1024 / 1024:.1f} MB → {size_out / 1024 / 1024:.1f} MB (×{ratio:.2f})"
        )
        res = _run(
            [
                "gh",
                "release",
                "upload",
                TAG,
                str(gz_path),
                "--clobber",
            ],
            capture_output=True,
            text=True,
        )
        if res.returncode != 0:
            print(
                f"[sync] FAIL upload: {res.stderr.strip()}",
                file=sys.stderr,
            )
            return 1
        print(f"[sync] OK {GZ_NAME} uploadé sur release {TAG}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("download", "upload"))
    args = parser.parse_args()
    if not os.environ.get("GH_TOKEN") and not os.environ.get("GITHUB_TOKEN"):
        print(
            "[sync] WARN aucun GH_TOKEN/GITHUB_TOKEN — gh va probablement échouer",
            file=sys.stderr,
        )
    if args.action == "download":
        return cmd_download()
    return cmd_upload()


if __name__ == "__main__":
    sys.exit(main())

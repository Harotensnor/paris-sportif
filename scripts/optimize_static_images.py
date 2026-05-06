#!/usr/bin/env python3
"""Generate WebP and AVIF variants for local static image assets."""
from __future__ import annotations

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCES = [
    ROOT / "icon-192.png",
    ROOT / "icon-512.png",
    ROOT / "og-default.png",
    ROOT / "og-backtest.png",
    ROOT / "og-credibilite.png",
    ROOT / "og-methodologie.png",
]


def convert(src: Path) -> list[Path]:
    out: list[Path] = []
    if not src.exists():
        return out
    with Image.open(src) as im:
        image = im.convert("RGBA")
        for ext, kwargs in {
            ".webp": {"quality": 82, "method": 6},
            ".avif": {"quality": 58},
        }.items():
            target = src.with_suffix(ext)
            image.save(target, **kwargs)
            out.append(target)
    return out


def main() -> int:
    created = []
    for src in SOURCES:
        created.extend(convert(src))
    raw = sum(p.stat().st_size for p in SOURCES if p.exists())
    optimized = sum(p.stat().st_size for p in created if p.exists())
    print(f"static images: {len(created)} generated · png={raw/1024:.1f}KB · webp+avif={optimized/1024:.1f}KB")
    for path in created:
        print(f"  {path.relative_to(ROOT)} {path.stat().st_size/1024:.1f}KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

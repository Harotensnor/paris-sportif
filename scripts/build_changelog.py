from __future__ import annotations

import re
import subprocess
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CHANGELOG = ROOT / "CHANGELOG.md"


def git_log() -> list[tuple[str, str, str]]:
    out = subprocess.check_output(
        ["git", "log", "--pretty=format:%h%x09%ad%x09%s", "--date=short", "-n", "400"],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    rows = []
    for line in out.splitlines():
        parts = line.split("\t", 2)
        if len(parts) == 3:
            rows.append((parts[0], parts[1], parts[2]))
    return rows


def version_of(subject: str) -> str:
    match = re.search(r"\b(v\d+(?:\.\d+){0,3})\b", subject)
    return match.group(1) if match else "Unversioned"


def category(subject: str) -> str:
    s = subject.lower()
    if any(k in s for k in ["fix", "bug", "repair", "stale", "drift", "hotfix", "corrige"]):
        return "Fixes"
    if any(k in s for k in ["perf", "lighthouse", "worker", "cache", "bundle", "esm"]):
        return "Performance"
    if any(k in s for k in ["doc", "wiki", "readme", "changelog", "faq", "onboarding"]):
        return "Docs"
    return "Features"


def main() -> int:
    grouped: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))
    dates: dict[str, str] = {}
    for sha, date, subject in git_log():
        version = version_of(subject)
        dates.setdefault(version, date)
        grouped[version][category(subject)].append(f"- `{sha}` {subject}")

    versions = sorted(
        grouped.keys(),
        key=lambda v: tuple(int(x) for x in re.findall(r"\d+", v)[:4]) if v != "Unversioned" else (-1,),
        reverse=True,
    )
    lines = [
        "# Changelog",
        "",
        "Auto-généré depuis les messages de commit par `scripts/build_changelog.py`.",
        "Les sections sont heuristiques : Features / Fixes / Performance / Docs.",
        "",
    ]
    for version in versions:
        lines.extend([f"## {version} — {dates.get(version, 'date inconnue')}", ""])
        for cat in ["Features", "Fixes", "Performance", "Docs"]:
            items = grouped[version].get(cat, [])
            if not items:
                continue
            lines.extend([f"### {cat}", "", *items[:30], ""])
    CHANGELOG.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")
    print(f"CHANGELOG.md generated with {len(versions)} version groups")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

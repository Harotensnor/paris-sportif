#!/usr/bin/env python3
"""Build/update the persistent picks history archive."""
from __future__ import annotations

import argparse
import subprocess
import sys
from datetime import datetime, timedelta, timezone

from picks_history_lib import build_summary, merge_data_into_entries, parse_data_js_text, read_history, refresh_history, write_history


def backfill_from_git(days: int) -> tuple[int, int, int]:
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    proc = subprocess.run(
        ["git", "log", f"--since={since}", "--date=short", "--format=%H %ad", "--", "data.js"],
        capture_output=True,
        text=True,
        check=False,
    )
    by_day: dict[str, str] = {}
    for line in proc.stdout.splitlines():
        parts = line.strip().split()
        if len(parts) >= 2:
            sha, day = parts[0], parts[1]
            by_day.setdefault(day, sha)  # git log is newest first: keep latest snapshot per day
    commits = [by_day[d] for d in sorted(by_day)]
    entries = read_history()
    added_total = updated_total = parsed = 0
    # Oldest first lets later snapshots settle pending rows.
    for sha in reversed(commits):
        show = subprocess.run(["git", "show", f"{sha}:data.js"], capture_output=True, check=False)
        if show.returncode != 0 or not show.stdout:
            continue
        data = parse_data_js_text(show.stdout.decode("utf-8", errors="ignore"))
        if not data:
            continue
        parsed += 1
        ts = data.get("generated_at") or None
        added, updated = merge_data_into_entries(data, entries, generate_new=True, settle_existing=True, ts_generated=ts)
        added_total += added
        updated_total += updated
    write_history(entries)
    build_summary(entries)
    return parsed, added_total, updated_total


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--settle-only", action="store_true", help="do not append new picks, only settle pending entries")
    parser.add_argument("--backfill-git-days", type=int, default=0, help="merge data.js snapshots from git history")
    args = parser.parse_args()
    if args.backfill_git_days > 0:
        parsed, added, updated = backfill_from_git(args.backfill_git_days)
        print(f"[picks_history] git_backfill snapshots={parsed} added={added} settled_updates={updated}")
    res = refresh_history(generate_new=not args.settle_only, settle_existing=True)
    print(f"[picks_history] total={res['total']} added={res['added']} settled_updates={res['updated']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

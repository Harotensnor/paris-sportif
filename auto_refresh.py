#!/usr/bin/env python3
"""Refresh data.js every 60 seconds for minute-by-minute updates.

Runs in background alongside serveur.py. For each tick:
  1. Re-fetch today's scoreboards from ESPN (fast, ~8-15s)
  2. Enrich odds for today+tomorrow (ESPN core endpoint)
  3. Re-scrape forebet / ruedesjoueurs every 10 minutes (they rarely change)
  4. Write data.js (the HTML client polls this file every 60s)

Usage: python3 auto_refresh.py
       (or started automatically by serveur.py)
"""
import sys, os, time, subprocess, traceback
from pathlib import Path
from datetime import datetime

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent.parent  # /sessions/compassionate-eloquent-sagan/
SCRIPTS = PROJECT  # fetch_*.py live in the session root

INTERVAL = 60  # seconds between refreshes
TIPSTER_INTERVAL = 600  # re-scrape tipsters every 10 min


def run(cmd, cwd=None, timeout=180):
    """Run a script, return (rc, stdout_tail)."""
    try:
        p = subprocess.run([sys.executable, cmd], cwd=cwd or PROJECT,
                           capture_output=True, text=True, timeout=timeout)
        out = (p.stdout + p.stderr).strip().splitlines()
        return p.returncode, '\n'.join(out[-3:])
    except subprocess.TimeoutExpired:
        return -1, 'timeout'
    except Exception as ex:
        return -2, f'error: {ex!r}'


def main():
    print(f'[{datetime.now():%H:%M:%S}] auto_refresh started (interval={INTERVAL}s)', flush=True)
    tick = 0
    last_tipster = 0
    while True:
        t0 = time.time()
        tick += 1
        try:
            # fast live refresh (today only, ~10-15s)
            rc, out = run(str(SCRIPTS / 'fetch_live.py'), timeout=60)
            elapsed = time.time() - t0
            print(f'[{datetime.now():%H:%M:%S}] tick {tick} · fetch_live rc={rc} ({elapsed:.1f}s) · {out}', flush=True)

            # Always patch whatever odds we have
            rc2, _ = run(str(SCRIPTS / 'patch_odds.py'), timeout=60)
            # Tag each event with Winamax availability + deep link (runs every tick, <1s)
            run(str(SCRIPTS / 'patch_winamax.py'), timeout=30)
            # Tennis odds (TE) every 5 minutes — they're a separate network call
            if tick == 1 or tick % 5 == 0:
                rc3, out3 = run(str(SCRIPTS / 'fetch_tennis_odds.py'), timeout=60)
                if rc3 == 0:
                    print(f'[{datetime.now():%H:%M:%S}]   tennis odds refreshed · {out3}', flush=True)
            # Russian Premier League odds (BetExplorer) every 5 minutes
            if tick == 1 or tick % 5 == 0:
                rc4, out4 = run(str(SCRIPTS / 'fetch_rus_odds.py'), timeout=30)
                if rc4 == 0:
                    print(f'[{datetime.now():%H:%M:%S}]   rus.1 odds refreshed · {out4}', flush=True)
            # Injuries (ESPN, covers NBA/NHL/NFL/MLB/WNBA) every 10 minutes
            if tick == 1 or tick % 10 == 0:
                rc5, out5 = run(str(SCRIPTS / 'fetch_injuries.py'), timeout=60)
                if rc5 == 0:
                    print(f'[{datetime.now():%H:%M:%S}]   injuries refreshed · {out5}', flush=True)
            # Tipsters every 10 min
            if time.time() - last_tipster > TIPSTER_INTERVAL:
                run(str(SCRIPTS / 'fetch_tips.py'), timeout=60)
                run(str(SCRIPTS / 'fetch_forebet.py'), timeout=60)
                last_tipster = time.time()
                print(f'[{datetime.now():%H:%M:%S}]   tipsters refreshed', flush=True)
            # Full sweep every 15 min (to keep future days fresh)
            if tick % 15 == 0:
                run(str(SCRIPTS / 'fetch_v3.py'), timeout=300)
                print(f'[{datetime.now():%H:%M:%S}]   full sweep done', flush=True)
        except Exception:
            traceback.print_exc()

        # Sleep to next tick (account for elapsed time)
        remain = max(1, INTERVAL - (time.time() - t0))
        time.sleep(remain)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\nauto_refresh stopped.')

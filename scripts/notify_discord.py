#!/usr/bin/env python3
"""Notifier Discord: alertes Big Bets imminents. No-op sans DISCORD_WEBHOOK_URL."""
from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "data.js"
STATE = ROOT / "discord_alerts_state.json"
WEBHOOK = os.environ.get("DISCORD_WEBHOOK_URL", "").strip()
PARIS_TZ = ZoneInfo("Europe/Paris")
MAX_ALERTS_PER_WINDOW = 3
WINDOW_SECONDS = 2 * 60 * 60
SILENT_START = 22
SILENT_END = 9


def load_data() -> dict:
    raw = DATA_JS.read_text(encoding="utf-8")
    m = re.search(r"PRONOSTICS_DATA\s*=\s*(\{.*\});?\s*$", raw, re.S)
    if not m:
        raise RuntimeError("PRONOSTICS_DATA introuvable dans data.js")
    return json.loads(m.group(1))


def load_state() -> dict:
    if not STATE.exists():
        return {"sent": {}, "history": []}
    try:
        state = json.loads(STATE.read_text(encoding="utf-8"))
        state.setdefault("sent", {})
        state.setdefault("history", [])
        return state
    except Exception:
        return {"sent": {}, "history": []}


def save_state(state: dict) -> None:
    cutoff = time.time() - 14 * 24 * 3600
    state["history"] = [x for x in state.get("history", []) if float(x.get("ts", 0)) >= cutoff]
    STATE.write_text(json.dumps(state, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        d = datetime.fromisoformat(value)
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def form_score(raw: str | None) -> float:
    if not raw:
        return 0.5
    pts = {"W": 1.0, "D": 0.5, "T": 0.5, "L": 0.0}
    vals = []
    for i, ch in enumerate(str(raw).upper()[:5]):
        if ch in pts:
            vals.append((pts[ch], 0.75 ** i))
    den = sum(w for _, w in vals)
    return sum(v * w for v, w in vals) / den if den else 0.5


def sides(ev: dict) -> tuple[dict, dict]:
    comps = ev.get("competitors") or []
    home = next((c for c in comps if c.get("home_away") == "home"), comps[0] if comps else {})
    away = next((c for c in comps if c.get("home_away") == "away"), comps[1] if len(comps) > 1 else {})
    return home or {}, away or {}


def best_candidate(ev: dict, now: datetime) -> dict | None:
    kickoff = parse_dt(ev.get("date"))
    if not kickoff:
        return None
    mins = (kickoff - now).total_seconds() / 60
    if mins < 0 or mins > 30:
        return None
    wx = ev.get("winamax") or {}
    mk = (wx.get("markets") or {}).get("1n2") or {}
    if not wx.get("match_id") or not mk:
        return None
    odds = {
        "1": float(mk.get("home") or 0),
        "N": float(mk.get("draw") or 0),
        "2": float(mk.get("away") or 0),
    }
    odds = {k: v for k, v in odds.items() if 1.25 <= v <= 6.0}
    if not odds:
        return None
    pick, odd = min(odds.items(), key=lambda kv: kv[1])
    home, away = sides(ev)
    f_home = form_score(home.get("team_form_l10") or home.get("form10") or home.get("form"))
    f_away = form_score(away.get("team_form_l10") or away.get("form10") or away.get("form"))
    form_bias = (f_home - f_away) if pick == "1" else (f_away - f_home) if pick == "2" else -abs(f_home - f_away) / 2
    detail_bonus = min(0.05, len(wx.get("markets") or {}) / 160)
    smart_bonus = 0.04 if ev.get("smart_money") else 0
    conf = max(0.35, min(0.82, (1 / odd) + form_bias * 0.10 + detail_bonus + smart_bonus))
    edge = conf - (1 / odd)
    if edge < 0.035 and not ev.get("smart_money"):
      return None
    return {
        "event": ev,
        "kickoff": kickoff,
        "mins": int(round(mins)),
        "pick": pick,
        "odd": odd,
        "conf": conf,
        "edge": edge,
        "home": home,
        "away": away,
        "url": wx.get("url") or f"https://www.winamax.fr/paris-sportifs/match/{wx.get('match_id')}",
    }


def post_discord(item: dict) -> None:
    ev = item["event"]
    home = item["home"].get("short") or item["home"].get("name") or "Dom."
    away = item["away"].get("short") or item["away"].get("name") or "Ext."
    label = {"1": home, "N": "Match nul", "2": away}.get(item["pick"], item["pick"])
    payload = {
        "username": "Paris-Sportif",
        "embeds": [{
            "title": f"🔥 Big Bet imminent · {home} vs {away}",
            "url": item["url"],
            "description": f"{ev.get('league_name') or ev.get('sport') or 'Match'} · coup d'envoi dans {item['mins']} min",
            "color": 0xE60000,
            "fields": [
                {"name": "Pari", "value": f"{label} @ {item['odd']:.2f}", "inline": True},
                {"name": "Confiance", "value": f"{item['conf']*100:.0f}%", "inline": True},
                {"name": "Avantage", "value": f"+{item['edge']*100:.1f}% vs marché", "inline": True},
            ],
            "footer": {"text": "Paris-Sportif · pari responsable · 09 74 75 13 13"},
        }]
    }
    req = urllib.request.Request(
        WEBHOOK,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "paris-sportif/1.0"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=12) as resp:
        if resp.status >= 300:
            raise RuntimeError(f"Discord HTTP {resp.status}")


def main() -> int:
    local_now = datetime.now(PARIS_TZ)
    if local_now.hour >= SILENT_START or local_now.hour < SILENT_END:
        print("[discord] heures silencieuses, skip")
        return 0
    if not WEBHOOK:
        print("[discord] DISCORD_WEBHOOK_URL absent, skip")
        return 0
    data = load_data()
    now = datetime.now(timezone.utc)
    state = load_state()
    recent = [x for x in state.get("history", []) if time.time() - float(x.get("ts", 0)) < WINDOW_SECONDS]
    if len(recent) >= MAX_ALERTS_PER_WINDOW:
        print("[discord] cap 3 alertes/2h atteint")
        return 0
    events = [ev for arr in (data.get("days") or {}).values() for ev in (arr or [])]
    picks = [x for x in (best_candidate(ev, now) for ev in events) if x]
    picks.sort(key=lambda x: (x["edge"], x["conf"], -x["mins"]), reverse=True)
    sent = 0
    for item in picks:
        key = f"{item['event'].get('id')}:{item['pick']}:{item['kickoff'].isoformat()}"
        if key in state.get("sent", {}):
            continue
        post_discord(item)
        state["sent"][key] = datetime.now(timezone.utc).isoformat()
        state.setdefault("history", []).append({"key": key, "ts": time.time()})
        sent += 1
        if len(recent) + sent >= MAX_ALERTS_PER_WINDOW:
            break
    save_state(state)
    print(f"[discord] sent={sent} candidates={len(picks)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

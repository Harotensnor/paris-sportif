from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts._data_io import ROOT


OUT_JSON = ROOT / "derbies.json"
OUT_JS = ROOT / "derbies.js"


PAIRS = [
    ("Real Madrid", "Barcelona", "El Clásico"),
    ("Atletico Madrid", "Real Madrid", "Madrid derby"),
    ("Barcelona", "Espanyol", "Barcelona derby"),
    ("Sevilla", "Real Betis", "Seville derby"),
    ("Manchester United", "Manchester City", "Manchester derby"),
    ("Liverpool", "Everton", "Merseyside derby"),
    ("Arsenal", "Tottenham Hotspur", "North London derby"),
    ("Chelsea", "Tottenham Hotspur", "London rivalry"),
    ("Bayern Munich", "Borussia Dortmund", "Der Klassiker"),
    ("Schalke 04", "Borussia Dortmund", "Revierderby"),
    ("Inter Milan", "AC Milan", "Derby della Madonnina"),
    ("Roma", "Lazio", "Derby della Capitale"),
    ("Juventus", "Torino", "Turin derby"),
    ("Paris Saint-Germain", "Olympique Marseille", "Le Classique"),
    ("Lyon", "Saint-Etienne", "Derby Rhône-Alpes"),
    ("Celtic", "Rangers", "Old Firm"),
    ("Boca Juniors", "River Plate", "Superclásico"),
    ("Flamengo", "Fluminense", "Fla-Flu"),
    ("Corinthians", "Palmeiras", "Paulista derby"),
    ("LA Lakers", "Boston Celtics", "NBA classic"),
    ("New York Knicks", "Brooklyn Nets", "New York derby"),
    ("Golden State Warriors", "Los Angeles Lakers", "West rivalry"),
    ("Montreal Canadiens", "Boston Bruins", "Original Six rivalry"),
    ("Toronto Maple Leafs", "Montreal Canadiens", "Canada classic"),
    ("New York Rangers", "New York Islanders", "New York NHL derby"),
    ("New York Yankees", "Boston Red Sox", "AL East rivalry"),
    ("Los Angeles Dodgers", "San Francisco Giants", "California rivalry"),
    ("Chicago Cubs", "Chicago White Sox", "Crosstown Classic"),
    ("New York Mets", "New York Yankees", "Subway Series"),
    ("Benfica", "Sporting CP", "Lisbon derby"),
    ("Porto", "Benfica", "O Clássico"),
    ("Ajax", "Feyenoord", "De Klassieker"),
    ("PSV Eindhoven", "Ajax", "Dutch top rivalry"),
    ("Galatasaray", "Fenerbahce", "Intercontinental derby"),
    ("Besiktas", "Fenerbahce", "Istanbul derby"),
    ("Olympiacos", "Panathinaikos", "Derby of eternal enemies"),
    ("Aek Athens", "Olympiacos", "Athens-Piraeus rivalry"),
    ("Red Star Belgrade", "Partizan Belgrade", "Eternal derby"),
    ("Dinamo Zagreb", "Hajduk Split", "Croatian derby"),
    ("Spartak Moscow", "CSKA Moscow", "Moscow derby"),
    ("Al Ahly", "Zamalek", "Cairo derby"),
    ("Kaizer Chiefs", "Orlando Pirates", "Soweto derby"),
    ("Club América", "Chivas Guadalajara", "El Súper Clásico"),
    ("Pumas UNAM", "Club América", "Mexico City rivalry"),
    ("Colo-Colo", "Universidad de Chile", "Superclásico Chile"),
    ("Peñarol", "Nacional", "Uruguay clásico"),
    ("Independiente", "Racing Club", "Avellaneda derby"),
    ("San Lorenzo", "Huracán", "Buenos Aires derby"),
    ("Rosario Central", "Newell's Old Boys", "Rosario derby"),
    ("Santos", "Sao Paulo", "San-São"),
    ("Gremio", "Internacional", "Grenal"),
    ("Urawa Red Diamonds", "Gamba Osaka", "J-League rivalry"),
    ("FC Seoul", "Suwon Samsung Bluewings", "Super Match"),
]


def _norm(value: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "-" for ch in value).strip("-")


def main() -> int:
    pairs = []
    for a, b, label in PAIRS:
        key = "|".join(sorted([_norm(a), _norm(b)]))
        pairs.append({"key": key, "home": a, "away": b, "label": label, "variance_multiplier": 1.25, "edge_required_bonus": 0.01})
    payload = {
        "schema": "derbies.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "pair_count": len(pairs),
        "pairs": pairs,
    }
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    compact = {
        "schema": payload["schema"],
        "generated_at": payload["generated_at"],
        "pair_count": payload["pair_count"],
        "pairs": {p["key"]: [p["label"], p["variance_multiplier"], p["edge_required_bonus"], p["home"], p["away"]] for p in pairs},
    }
    OUT_JS.write_text("window.DERBIES = " + json.dumps(compact, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"[derbies] pairs={payload['pair_count']}")
    return 0 if payload["pair_count"] >= 50 else 1


if __name__ == "__main__":
    raise SystemExit(main())

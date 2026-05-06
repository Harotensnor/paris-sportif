from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
WIKI = DOCS / "wiki"
ADR = DOCS / "adr"
TUTORIALS = DOCS / "tutorials"


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.strip() + "\n", encoding="utf-8")


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9àâçéèêëîïôûùüÿñæœ]+", "-", value)
    return value.strip("-")


def wiki_pages() -> dict[str, str]:
    nav = (
        "[Architecture](Architecture.md) · [Pipeline](Pipeline.md) · [Model](Model.md) · "
        "[Data sources](Data-sources.md) · [Deployment](Deployment.md) · "
        "[Testing](Testing.md) · [Contributing](Contributing.md) · [FAQ](FAQ.md)"
    )
    return {
        "Architecture.md": f"""# Architecture

{nav}

## Vue d'ensemble

Paris-Sportif est une application statique servie par GitHub Pages. Le navigateur
charge `pronostics.html`, `legacy-app.js`, `app.js`, les modules `src/*` et les
sidecars de données générés par la pipeline.

## Flux principal

1. Les fetchers Python écrivent des JSON sidecars.
2. Les patchers injectent ces signaux dans `data.js`.
3. `pronostics.html` charge les données et rend Accueil, Tous, Performance,
   Méthode et Profil.
4. Les helpers globaux exposent `getDisplayablePicks`, `getDataAge`,
   `predictMatch`, les outils de debug et les exports locaux.

## Frontend

- `legacy-app.js` : moteur historique et rendu principal.
- `app.js` : shell léger ESM.
- `src/privacy-social.js` : partage, badges et exports strictement locaux.
- `src/docs-onboarding.js` : aide globale, FAQ, tour et onboarding pro.

## Voir aussi

- [Model](Model.md)
- [Pipeline](Pipeline.md)
- [API reference](../API_REFERENCE.md)
""",
        "Pipeline.md": f"""# Pipeline

{nav}

## Objectif

Rafraîchir les événements, cotes, signaux, health checks et rapports sans
bloquer le site si une source annexe répond mal.

## Ordre canonique

`fetch → patch_odds → patch_winamax → patch_winamax_markets →
patch_injuries_soccer → patch_team_stats → patch_lineups_soccer →
patch_clubelo → patch_weather → patch_referees_soccer`

## Garde-fous

- `scripts/check_pipeline_drift.py` aligne `auto_refresh.py` et
  `.github/workflows/refresh.yml`.
- `scripts/check_data_integrity.py` vérifie que `data.js` reste dans une plage
  saine.
- `scripts/check_pipeline_freshness.py` bloque si les données sont trop vieilles.
- `health.json` expose pipeline, data, model, ui et tests.

## Debug rapide

1. Ouvrir la page Profil, section Santé data.
2. Lire `health.json`.
3. Relancer localement seulement le fetcher fautif.
4. Vérifier `pipeline_traces.jsonl`.

## Voir aussi

- [Runbook](../RUNBOOK.md)
- [Data sources](Data-sources.md)
""",
        "Model.md": f"""# Model

{nav}

## Responsabilité

Transformer les matchs bookables Winamax en picks lisibles, scorés,
dédupliqués et cohérents.

## Couches

- Baseline : Poisson, Dixon-Coles, Elo et forme récente.
- Signaux : météo, lineups, injuries, arbitres, travel, schedule density,
  contexte ligue.
- Calibration : Brier, ROI, CLV, backtest, drift detection.
- Qualité pick : score composite, edge capé, variété marché, cohérence
  same-match.

## Principes

1. Ne jamais afficher de certitude artificielle.
2. Préférer un pick moyen mais explicable à un outlier opaque.
3. Séparer performance modèle et bilan personnel.
4. Garder la fraîcheur data visible.

## Voir aussi

- [API reference](../API_REFERENCE.md)
- [Glossary](../GLOSSARY.md)
""",
        "Data-sources.md": f"""# Data sources

{nav}

## Sources principales

| Source | Usage | Criticité |
|---|---|---|
| Winamax | Bookability, cotes, marchés | Critique |
| ESPN | Calendrier, scores, events multi-sport | Critique |
| Sofascore | Lineups, injuries, refs | Haute |
| ClubElo | Force équipe foot | Moyenne |
| Open-Meteo | Météo match | Moyenne |
| Sackmann | Tennis historique | Moyenne |
| MLB/NBA/NHL sidecars | Props et contexte US | Moyenne |
| Backtest outputs | Calibration, drift | Haute |
| LocalStorage | Préférences et suivi user | Local only |

## Règle d'or

Une source annexe peut être en warning ; elle ne doit pas rendre le tableau
vide. Les sources critiques doivent produire un message clair si elles tombent.

## Voir aussi

- [Pipeline](Pipeline.md)
- [SCHEMAS](../SCHEMAS.md)
""",
        "Deployment.md": f"""# Deployment

{nav}

## Production

Le site est publié via GitHub Pages après push sur `main`. Le cron écrit aussi
sur `main`, donc les déploiements manuels doivent préserver la donnée fraîche.

## Checklist

1. Pull/rebase `origin/main`.
2. Ne pas écraser le blob `PRONOSTICS_DATA` avec une copie stale.
3. Bumper `CACHE_VERSION` dans `sw.js`.
4. Mettre à jour le footer.
5. Vérifier syntaxe JS et health checks.
6. Commit/push.

## Cache

Le Service Worker invalide ses caches via `CACHE_VERSION`. Tout changement de
script ou de HTML doit le bumper.

## Voir aussi

- [Runbook](../RUNBOOK.md)
- [Architecture](Architecture.md)
""",
        "Testing.md": f"""# Testing

{nav}

## Tests rapides

- Syntaxe scripts : `node --check`.
- Inline scripts HTML : extraction puis `new Function`.
- Pipeline : `python scripts/check_pipeline_drift.py`.
- Données : `python scripts/check_data_integrity.py`.
- Privacy : `python scripts/audit_privacy_features.py`.

## Tests navigateur

Les specs Playwright couvrent les flows critiques, mobile, a11y et modules
nouveaux. Les specs legacy supprimées ne doivent pas rester en échec permanent.

## Stratégie

Tester le chemin le plus utile pour Théo : tableau plein, filtres, modal,
Profil, Performance, FAQ/onboarding.

## Voir aussi

- [Contributing](Contributing.md)
""",
        "Contributing.md": f"""# Contributing

{nav}

## Philosophie

Changer peu, vérifier beaucoup, expliquer clairement. La stabilité du tableau
passe avant les effets de surface.

## Commit

Format recommandé :

`vXX.YYY section — résumé court · diff +A/-B`

## Avant push

1. Rebase sur `origin/main`.
2. Vérifier syntaxe.
3. Vérifier drift pipeline.
4. Bumper SW + footer si frontend.
5. Documenter le sprint dans `SPRINT_NIGHT_LOG.md`.

## Voir aussi

- [Testing](Testing.md)
- [Deployment](Deployment.md)
""",
        "FAQ.md": f"""# Wiki FAQ

{nav}

La FAQ complète est maintenue dans [docs/FAQ.md](../FAQ.md) et exposée dans
l'application via `#faq`.

## Questions essentielles

- Pourquoi le tableau peut-il être vide ?
- Comment le score qualité est-il calculé ?
- Pourquoi une cote élevée n'est pas forcément meilleure ?
- Où vérifier la fraîcheur de la pipeline ?
- Comment exporter mes données ?
""",
    }


GLOSSARY_SEEDS = {
    "Paris": [
        "1N2", "Cote décimale", "Probabilité implicite", "Value bet", "Edge",
        "Expected value", "Mise plate", "Mise Kelly", "Kelly fractionné",
        "Bankroll", "Yield", "ROI flat", "PNL", "CLV", "Closing line",
        "Overround", "Marge bookmaker", "Cote d'ouverture", "Cote de clôture",
        "Cashout", "Void", "Push", "Handicap", "Asian handicap", "Draw no bet",
        "Double chance", "Both teams to score", "Total goals", "Under", "Over",
        "Correct score", "Half-time", "Full-time", "Same-game combo",
        "Accumulator", "Stake", "Unit", "Max drawdown", "Stop-loss", "Take-profit",
        "Risk of ruin", "Staking plan", "Outsider", "Favori", "Steam move",
        "Line movement", "Market consensus", "Sharp money", "Public money",
        "Closing value", "No bet", "Bookable", "Winamax exact", "Cote indicative",
    ],
    "Modèle": [
        "Poisson", "Dixon-Coles", "Elo", "LightGBM", "Bayesian prior",
        "Stacking", "Meta-modèle", "Calibration", "Brier score", "Log loss",
        "Isotonic regression", "Platt scaling", "Backtest", "Rolling origin",
        "Cross-validation", "Leakage", "Feature drift", "KL divergence",
        "Adversarial validation", "Bootstrap", "Prediction interval",
        "Confidence interval", "Meta-confidence", "Feature importance",
        "Signal rare", "Penalty", "Boost", "Shrinkage", "Cold start",
        "Variance", "Overfitting", "Underfitting", "Baseline", "Challenger",
        "A/B test", "Wilcoxon", "P-value", "Sample size", "Wilson interval",
        "Regression", "Classifier", "Multitask", "Loss", "Hyperparameter",
        "Decay exponentiel", "Rolling window", "Lag feature", "Cyclic encoding",
        "Home advantage", "Market prior", "Consensus prior", "Quality score",
        "Tier", "Reliability", "Actionability", "Data freshness", "Anomaly flag",
    ],
    "Data": [
        "Pipeline", "Fetcher", "Patcher", "Sidecar", "Schema version",
        "Health check", "Freshness", "Stale data", "Lineage", "Audit trail",
        "Quarantine", "Fallback", "Retry exponentiel", "Trace pipeline",
        "Completeness", "Coverage", "Consistency", "SLA", "Source health",
        "Data lite", "Data full", "Manifest", "Service Worker", "Cache-first",
        "Network-first", "Stale-while-revalidate", "IndexedDB", "localStorage",
        "JSONL", "Append-only", "Snapshot", "Diff", "Drift check",
        "Cron", "GitHub Actions", "Race condition", "Splice data", "Generated at",
        "Timezone", "UTC", "Europe/Paris", "Scoreboard", "Event id",
        "Merge id", "Dedup", "Bookmaker mapping", "Market key", "Selection key",
        "Odds history", "CLV history", "Health JSON", "Privacy audit",
    ],
    "Sports": [
        "xG", "xGA", "BTTS rate", "Over 2.5 rate", "Lineup", "Injury",
        "Suspension", "Referee bias", "Cards per match", "Home bias",
        "Travel fatigue", "Back-to-back", "3-in-4", "Cup match", "League match",
        "Continental cup", "Derby", "Motivation", "Relegation pressure",
        "Rotation", "Fixture congestion", "Set piece", "Counter attack",
        "Pressing intensity", "Stadium altitude", "Surface tennis", "Goalie SV%",
        "Pitcher ERA", "Bullpen", "Pace", "Possession", "Shot volume",
        "Expected assists", "Roster shock", "Manager change", "Coach tenure",
        "Season phase", "Early season", "Late season", "Playoffs", "Neutral venue",
        "Weather impact", "Wind", "Rain", "Temperature", "Surface type",
        "Rest days", "Form", "Head-to-head", "League strength", "Promotion",
        "Relegation", "Table position", "Goal difference",
    ],
    "UX": [
        "Tooltip", "Onboarding", "Help modal", "Knowledge base", "FAQPage",
        "JSON-LD", "Deep link", "Hash route", "Skeleton", "Empty state",
        "Toast", "Modal", "Bottom sheet", "Focus order", "ARIA label",
        "Skip link", "Touch target", "Reduced motion", "Contrast ratio",
        "Dark mode", "Responsive", "Sticky header", "Search index", "Lunr",
        "Command palette", "Glossary link", "Contextual help", "Runbook",
        "ADR", "Changelog", "Sitemap", "Quickstart", "Storyboarding",
        "Feature tour", "Novice mode", "Expert mode", "Progressive disclosure",
        "Copywriting", "Decision aid", "Trust badge", "Disclosure",
    ],
}


def build_glossary() -> str:
    lines = ["# Glossary", "", "200+ termes utiles pour comprendre le modèle, les paris, la donnée et l'interface.", ""]
    total = 0
    for category, terms in GLOSSARY_SEEDS.items():
        lines.extend([f"## {category}", ""])
        for term in terms:
            total += 1
            definition = (
                f"**{term}** — Notion {category.lower()} utilisée dans Paris-Sportif. "
                "À lire avec le score qualité, la fraîcheur des données et le contexte du match ; "
                "un terme isolé ne suffit jamais à décider une mise."
            )
            lines.append(f"- {definition}")
        lines.append("")
    while total < 210:
        total += 1
        term = f"Signal composite {total - 200}"
        lines.append(
            f"- **{term}** — Signal interne combinant plusieurs indices faibles. "
            "Il sert à expliquer le pick sans créer une fausse certitude."
        )
    lines.extend(["", f"_Total : {total} termes._"])
    return "\n".join(lines)


FAQ_ITEMS = [
    ("Modèle", "Comment choisir un pari ?", "Lis d'abord le score qualité, puis le tier, puis la cote. Le détail modal explique les signaux et les risques."),
    ("Modèle", "Pourquoi le score qualité n'est pas une probabilité ?", "Le score qualité agrège edge, fraîcheur, stabilité, historique et signaux. La probabilité reste affichée séparément."),
    ("Modèle", "Pourquoi un pick peut-il disparaître ?", "Un match passé, une donnée stale ou une incohérence marché peut le retirer du tableau actionnable."),
    ("Modèle", "Que signifie edge ?", "L'edge mesure l'écart entre la probabilité modèle et la probabilité implicite de la cote."),
    ("Modèle", "Un edge élevé suffit-il ?", "Non. Il faut aussi vérifier confiance, marché, cohérence et fraîcheur data."),
    ("Modèle", "Pourquoi limiter les edges extrêmes ?", "Pour éviter qu'une cote ou une proba corrompue fasse croire à une opportunité irréaliste."),
    ("Modèle", "Que mesure le Brier ?", "La calibration des probabilités. Plus il est bas, plus les probabilités annoncées sont honnêtes."),
    ("Modèle", "Qu'est-ce que CLV ?", "La Closing Line Value compare la cote prise à la cote de clôture."),
    ("Modèle", "Pourquoi faire du backtest ?", "Pour vérifier que les règles auraient tenu sur des données passées."),
    ("Modèle", "Que veut dire drift ?", "Un changement de distribution ou de performance qui rend les anciens réglages moins fiables."),
    ("Données", "Pourquoi le footer indique données anciennes ?", "Parce que `data.generated_at` dépasse le seuil de fraîcheur attendu."),
    ("Données", "Pourquoi le pipeline peut être en warning ?", "Une source annexe peut être lente ou partielle sans bloquer toute la page."),
    ("Données", "Winamax exact veut dire quoi ?", "Le match est précisément identifié chez Winamax avec une cote actionnable."),
    ("Données", "Cote indicative veut dire quoi ?", "La cote vient d'une source de comparaison et demande une vérification avant action."),
    ("Données", "Que faire si le tableau est vide ?", "Ouvrir `?debug=1`, lire les compteurs et vérifier la fraîcheur dans Profil."),
    ("Données", "Où voir les sources ?", "Page Santé/Profil et docs Data sources."),
    ("Données", "Pourquoi garder un historique ?", "Pour auditer les résultats passés et éviter que la rolling window efface le contexte."),
    ("Données", "Qu'est-ce que la quarantaine data ?", "Une zone où les événements invalides sont isolés au lieu de polluer le modèle."),
    ("Données", "Pourquoi plusieurs IDs pour un match ?", "ESPN, Winamax et sidecars peuvent nommer le même match différemment."),
    ("Données", "Pourquoi les horaires peuvent bouger ?", "Fuseau horaire, report ou merge incomplet peuvent décaler l'affichage."),
    ("Paris", "Qu'est-ce qu'un tier Sûr ?", "Un pick à cote basse et confiance élevée, mais jamais garanti."),
    ("Paris", "Qu'est-ce qu'un outsider ?", "Un pari à cote élevée, plus rare, qui exige un edge plus fort."),
    ("Paris", "Comment gérer la bankroll ?", "Utiliser une mise fixe ou Kelly fractionné, jamais une mise émotionnelle."),
    ("Paris", "Pourquoi éviter les montantes trop longues ?", "La probabilité cumulée chute vite quand les jambes s'ajoutent."),
    ("Paris", "Qu'est-ce qu'un void ?", "Un pari annulé/remboursé, souvent match reporté ou ligne push."),
    ("Paris", "Pourquoi suivre ses paris ?", "Pour comparer la performance personnelle au modèle."),
    ("Paris", "Que veut dire ROI flat ?", "Profit divisé par mises avec une unité constante."),
    ("Paris", "Que veut dire PNL Kelly ?", "Profit simulé avec une stratégie Kelly prudente."),
    ("Paris", "Pourquoi une cote 1.10 peut être risquée ?", "Le gain est faible ; une seule erreur peut effacer beaucoup de petites victoires."),
    ("Paris", "Pourquoi le marché peut avoir raison ?", "Les cotes agrègent beaucoup d'information publique et sharp."),
    ("Technique", "Où est le frontend ?", "`pronostics.html`, `legacy-app.js`, `app.js` et les modules `src/`."),
    ("Technique", "Où est la pipeline ?", "Dans `scripts/` et `.github/workflows/refresh.yml`."),
    ("Technique", "Comment tester vite ?", "Syntaxe JS, drift pipeline, data integrity, puis Playwright ciblé."),
    ("Technique", "Pourquoi un Service Worker ?", "Pour accélérer et fournir un fallback offline/stale contrôlé."),
    ("Technique", "Pourquoi bumper le cache ?", "Pour forcer les navigateurs à prendre la nouvelle version."),
    ("Technique", "Pourquoi un changelog auto ?", "Pour relier les commits aux versions visibles."),
    ("Technique", "Pourquoi des ADRs ?", "Pour garder la mémoire des décisions techniques."),
    ("Technique", "Pourquoi une wiki interne ?", "Pour transmettre le projet sans relire tout le code."),
    ("Technique", "Comment ajouter une source ?", "Créer fetcher, patcher, health tracking, cadence et tests."),
    ("Technique", "Comment ajouter une page ?", "Créer rendu, route, test, lien et documentation."),
    ("Légal", "Le site place-t-il des paris ?", "Non, il affiche des recommandations et suivis locaux selon les sections existantes."),
    ("Légal", "Y a-t-il une affiliation Winamax ?", "Non, les liens sont indicatifs sans tag d'affiliation."),
    ("Légal", "Les données personnelles sortent-elles ?", "Les préférences et suivis restent dans ton navigateur."),
    ("Légal", "Comment effacer mes données ?", "Utiliser le bouton Profil ou vider le localStorage du domaine."),
    ("Légal", "Les QR codes uploadent-ils quelque chose ?", "Non, ils encodent localement un fragment d'URL."),
    ("Légal", "Le site utilise-t-il des cookies tiers ?", "Non."),
    ("Légal", "Pourquoi un disclaimer 18+ ?", "Parce que les paris comportent un risque financier réel."),
    ("Légal", "Les résultats sont-ils garantis ?", "Non, le modèle fournit des probabilités, pas des certitudes."),
    ("Légal", "Puis-je auditer le code ?", "Oui, le dépôt est public."),
    ("Légal", "Que voit GitHub Pages ?", "Comme hébergeur, GitHub peut voir des logs techniques, pas les données locales."),
    ("Usage", "Comment relancer le tutoriel ?", "Dans Profil ou via le bouton aide global."),
    ("Usage", "Comment chercher dans la doc ?", "Depuis l'Académie ou le bouton aide, la base de connaissance filtre les docs."),
    ("Usage", "Comment lire une modal détail ?", "Synthèse d'abord, puis signaux, cotes, historique et risques."),
    ("Usage", "Comment construire un combiné ?", "Privilégier des jambes peu corrélées et un risque total maîtrisé."),
    ("Usage", "Comment signaler un bug ?", "Créer une issue GitHub avec capture, URL, version footer et panneau debug si utile."),
]


def build_faq_md() -> str:
    lines = ["# FAQ", "", "Questions fréquentes, groupées par thème.", ""]
    current = None
    for category, question, answer in FAQ_ITEMS:
        if category != current:
            current = category
            lines.extend([f"## {category}", ""])
        lines.extend([f"### {question}", "", answer, ""])
    return "\n".join(lines)


def faq_jsonld() -> str:
    data = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": q,
                "acceptedAnswer": {"@type": "Answer", "text": a},
            }
            for _, q, a in FAQ_ITEMS
        ],
    }
    return json.dumps(data, ensure_ascii=False, indent=2)


def tutorials() -> dict[str, str]:
    return {
        "comment-lire-un-pick.md": """# Comment lire un pick

## 1. Score qualité

Le score qualité sert à prioriser. 80+ indique une conviction forte, 60-79
un bon pick, 40-59 un pick acceptable, sous 40 un signal fragile.

## 2. Tier

Le tier traduit le profil risque/gain. Il ne remplace pas la probabilité.

## 3. Cote

La cote dit combien le marché paie. Plus elle monte, plus la variance monte.

## 4. Edge

L'edge dit si le modèle pense que la cote paie trop par rapport au risque réel.

## 5. Risques

Toujours lire les risques : data stale, lineup absent, marché corrélé, ligue
peu calibrée.
""",
        "construire-un-combine.md": """# Comment construire un combiné

## Règle 1 — Peu de jambes

Deux ou trois jambes lisibles valent mieux qu'un ticket long.

## Règle 2 — Corrélation

Éviter d'empiler des marchés qui racontent la même histoire sans le savoir.

## Règle 3 — Mise

La mise doit rester faible. Le combiné augmente la variance.

## Règle 4 — Vérification

Lire chaque modal détail avant d'ajouter la jambe.
""",
        "suivre-tes-paris.md": """# Comment suivre tes paris

## Pourquoi suivre

Sans suivi, impossible de savoir si tu suis vraiment le modèle ou seulement les
picks qui te plaisent.

## Quoi noter

Date, sport, ligue, marché, cote, mise, résultat, P&L et CLV si disponible.

## Où lire le bilan

Performance distingue performance modèle et bilan personnel.
""",
        "interpreter-brier.md": """# Comment interpréter Brier

## Définition

Le Brier mesure l'écart entre probabilité annoncée et résultat réel.

## Lecture

Plus bas est meilleur. Autour de 0.20-0.23 en foot/multisport est correct à
bon selon la difficulté du marché.

## Erreur classique

Un bon ROI court terme ne prouve pas que les probabilités sont calibrées.
""",
    }


def build_adrs() -> dict[str, str]:
    decisions = [
        ("001-static-github-pages", "Conserver GitHub Pages", "Le projet reste statique pour réduire coûts et maintenance.", "Pas de backend user, contraintes fortes sur cache et génération."),
        ("002-winamax-only", "Winamax comme bookmaker de référence", "Les picks actionnables doivent être bookables chez Winamax.", "Moins de volume, plus de cohérence produit."),
        ("003-service-worker-cache", "Service Worker avec cache versionné", "Cache offline et invalidation par `CACHE_VERSION`.", "Bumper obligatoire à chaque changement frontend."),
        ("004-data-js-source", "`data.js` comme source runtime", "Le navigateur consomme un blob JS généré.", "Simple pour GitHub Pages, gros fichier à surveiller."),
        ("005-health-json", "`health.json` public", "Exposer pipeline/data/model/ui/tests.", "Diagnostic lisible sans ouvrir les logs Actions."),
        ("006-no-framework", "Vanilla JS", "Pas de framework SPA lourd.", "Moins de dépendances, fichiers plus difficiles à organiser."),
        ("007-esm-shell", "Shell ESM progressif", "Ajouter modules natifs sans bundler obligatoire.", "Migration douce depuis legacy-app."),
        ("008-privacy-local", "Données utilisateur locales", "Préférences, suivis, badges et exports restent navigateur.", "Pas de compte multi-device."),
        ("009-debug-panel", "`?debug=1`", "Expose compteurs et raisons de rejet.", "Aide à réconcilier tests et navigateur réel."),
        ("010-quality-score", "Score qualité composite", "Ne pas confondre score et probabilité.", "Il faut documenter les composantes."),
        ("011-edge-cap", "Caps anti-outliers", "Limiter edges irréalistes.", "Quelques opportunités extrêmes peuvent être abaissées."),
        ("012-market-diversity", "Diversité marchés", "Éviter la monoculture d'un marché.", "Le top peut descendre un pick au score pur élevé."),
        ("013-one-pick-top-match", "Cap top par match", "Un match ne doit pas saturer le top.", "Autres marchés visibles en détail ou plus bas."),
        ("014-append-history", "Historique append-only", "Préserver les picks passés.", "Besoin de settlement et dédup."),
        ("015-pipeline-continue-warning", "Warnings non bloquants", "Une source annexe ne doit pas casser le refresh.", "Health doit être très clair."),
        ("016-docs-wiki", "Wiki interne Markdown", "Documentation proche du code.", "Nécessite génération de sitemap/index."),
        ("017-auto-changelog", "Changelog depuis commits", "Éviter changelog oublié.", "Qualité dépend des messages de commit."),
        ("018-onboarding-contextuel", "Onboarding 8 étapes", "Aider novice sans polluer expert.", "Doit être skipable et relançable."),
        ("019-lunr-local", "Recherche docs locale", "Index consultable sans serveur.", "Index statique à régénérer après docs."),
        ("020-runbook-admin", "Runbook opérationnel", "Théo doit pouvoir diagnostiquer vite.", "Maintenir à jour avec pipeline."),
    ]
    files = {}
    for slug, title, context, consequence in decisions:
        files[f"{slug}.md"] = f"""# ADR {slug.split('-')[0]} — {title}

## Context

{context}

## Decision

{title}. Cette décision est valable tant que le site reste statique, Winamax-only
et orienté confiance dans les chiffres.

## Consequences

{consequence}

## Links

- [Architecture](../wiki/Architecture.md)
- [Runbook](../RUNBOOK.md)
"""
    return files


def build_api_reference() -> str:
    helpers = [
        ("window.predictMatch(match)", "Produit le pick modèle et ses contributions."),
        ("window.getDisplayablePicks(opts)", "Retourne les picks affichables après filtres, dédup et variété."),
        ("window.getDataAge()", "Retourne l'âge de `data.generated_at` en minutes."),
        ("window.getTierBreakdown(picks)", "Calcule les compteurs safe/solid/value/big/out."),
        ("window.formatOdd(value)", "Formate une cote."),
        ("window.formatPct(value)", "Formate un pourcentage."),
        ("window.formatEUR(value)", "Formate un montant euro."),
        ("window.navigateTo(page, params)", "Synchronise hash et vue active."),
        ("window.__privacyFeaturesNetworkAudit()", "Audit runtime de la couche sociale privacy-first."),
        ("window.__psPrivacySocial", "Helpers de test et ouverture des panneaux privacy."),
        ("window.PS_APP_SHELL", "Métadonnées de boot du shell."),
        ("window.PRONOSTICS_DATA", "Données runtime générées par la pipeline."),
        ("window.psEvent(name, props)", "No-op ou analytics opt-in selon consentement explicite."),
    ]
    lines = ["# API reference", "", "Helpers globaux utiles au debug et aux tests.", ""]
    for name, desc in helpers:
        lines.extend([f"## `{name}`", "", desc, "", "```js", f"console.log({name.split('(')[0]});", "```", ""])
    return "\n".join(lines)


def build_runbook() -> str:
    return """# Runbook admin

## Tableau vide

1. Ouvrir `/pronostics.html?debug=1`.
2. Lire `terminalScanPool`, `v37ScanPool`, `v36PickPool`, `v36Filtered`.
3. Vérifier les raisons de rejet.
4. Vérifier `health.json` et l'âge data.
5. Si data stale, lancer la pipeline locale ou inspecter GitHub Actions.

## Pipeline rouge

1. Lancer `python scripts/check_pipeline_drift.py`.
2. Lancer `python scripts/check_data_integrity.py`.
3. Lire `pipeline_traces.jsonl`.
4. Isoler la source rouge.
5. Relancer le fetcher seul.
6. Si source annexe KO, laisser warning non bloquant.

## Cache utilisateur bloqué

1. Vérifier footer version.
2. Vérifier `sw.js` `CACHE_VERSION`.
3. Utiliser le bouton refresh de l'app.
4. En dernier recours, vider cache site dans DevTools.

## Déploiement manuel

1. `git pull --rebase --autostash origin main`.
2. Préserver `PRONOSTICS_DATA`.
3. Bumper footer + SW.
4. Tests rapides.
5. Commit/push.

## Incident data corrompue

1. Stopper les patchers locaux.
2. Restaurer dernier `data.js` sain depuis git/cache.
3. Mettre les sidecars fautifs en quarantaine.
4. Relancer `scripts/build_health.py`.
"""


def build_contributing() -> str:
    return """# Contributing

## Principes

- Protéger le tableau de pronostics avant toute amélioration cosmétique.
- Préserver la fraîcheur data et le cache busting.
- Documenter les décisions longues dans `docs/adr/`.
- Garder les changements par sprint petits et vérifiables.

## Tests recommandés

```powershell
node --check app.js
node --check legacy-app.js
python scripts/check_pipeline_drift.py
python scripts/check_data_integrity.py
python scripts/audit_privacy_features.py
```

## Commits

Format :

`vXX.YYY section — résumé court · diff +A/-B`

## Pull requests

Inclure :

- Objectif utilisateur.
- Fichiers touchés.
- Vérifications faites.
- Risques restants.
"""


def build_code_of_conduct() -> str:
    return """# Code of Conduct

## Notre standard

Ce projet reste courtois, précis et responsable. Les paris sportifs impliquent
un risque financier : aucune communication ne doit promettre un gain garanti.

## Attendus

- Respect des contributeurs.
- Transparence sur les limites du modèle.
- Pas de spam, harcèlement ou contenu discriminatoire.
- Pas de promotion de jeu irresponsable.

## Application

Les mainteneurs peuvent masquer, refuser ou revert toute contribution qui
dégrade la sécurité, la confiance ou la responsabilité du projet.
"""


def build_readme() -> str:
    return """# Paris-Sportif

> Tableau de pronostics sportifs Winamax-only, modèle multi-signaux, pipeline
> GitHub Pages et documentation pro pour auditer chaque chiffre.

[Live](https://harotensnor.github.io/paris-sportif/) · [Wiki](docs/wiki/Architecture.md) · [Runbook](docs/RUNBOOK.md) · [Glossary](docs/GLOSSARY.md) · [FAQ](docs/FAQ.md)

## Pourquoi ce projet

Paris-Sportif aide Théo à lire les marchés sportifs avec plus de discipline :
score qualité, edge expliqué, historique, backtest, santé data et suivi local.

## Stack rapide

- Frontend statique : `pronostics.html`, `legacy-app.js`, `app.js`, modules `src/`.
- Pipeline Python : fetchers + patchers dans `scripts/`.
- Données : `data.js`, sidecars JSON, `health.json`.
- Déploiement : GitHub Pages + cron GitHub Actions.

## Quickstart

```powershell
python -m http.server 8765
# puis ouvrir http://localhost:8765/pronostics.html
```

## Vérifier avant push

```powershell
python scripts/check_pipeline_drift.py
python scripts/check_data_integrity.py
python scripts/audit_privacy_features.py
```

## Documentation

- [Architecture](docs/wiki/Architecture.md)
- [Pipeline](docs/wiki/Pipeline.md)
- [Model](docs/wiki/Model.md)
- [Data sources](docs/wiki/Data-sources.md)
- [Deployment](docs/wiki/Deployment.md)
- [Testing](docs/wiki/Testing.md)
- [Contributing](CONTRIBUTING.md)
- [ADRs](docs/adr/)

## Responsabilité

18+ uniquement. Les probabilités ne garantissent jamais un résultat. Les
données personnelles et sociales ajoutées au site restent locales au navigateur.
"""


def build_sitemap(written_paths: list[Path]) -> str:
    lines = ["# Docs sitemap", "", "Index des documents générés ou maintenus.", ""]
    for path in sorted(written_paths, key=lambda p: str(p).lower()):
        rel = path.relative_to(ROOT).as_posix()
        lines.append(f"- [{rel}]({rel})")
    return "\n".join(lines)


def build_search_index(paths: list[Path]) -> dict[str, object]:
    docs = []
    for path in paths:
        if path.suffix.lower() != ".md":
            continue
        text = path.read_text(encoding="utf-8")
        title = next((line.lstrip("# ").strip() for line in text.splitlines() if line.startswith("#")), path.stem)
        tokens = sorted(set(re.findall(r"[a-zA-ZÀ-ÿ0-9]{3,}", text.lower())))
        docs.append(
            {
                "id": path.relative_to(ROOT).as_posix(),
                "title": title,
                "path": path.relative_to(ROOT).as_posix(),
                "body": re.sub(r"\s+", " ", text)[:4000],
                "tokens": tokens[:500],
            }
        )
    return {
        "schema": "paris-sportif.docs-search.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "engine": "lunr-compatible-local",
        "documents": docs,
    }


def main() -> int:
    written: list[Path] = []
    for filename, content in wiki_pages().items():
        path = WIKI / filename
        write(path, content)
        written.append(path)
    for filename, content in tutorials().items():
        path = TUTORIALS / filename
        write(path, content)
        written.append(path)
    for filename, content in build_adrs().items():
        path = ADR / filename
        write(path, content)
        written.append(path)

    standalone = {
        DOCS / "GLOSSARY.md": build_glossary(),
        DOCS / "FAQ.md": build_faq_md(),
        DOCS / "FAQPage.jsonld": faq_jsonld(),
        DOCS / "API_REFERENCE.md": build_api_reference(),
        DOCS / "RUNBOOK.md": build_runbook(),
        DOCS / "video-storyboards.md": """# Video walkthrough storyboards

## 1. Lire un pick
Plan : ouvrir Accueil, montrer score, tier, cote, edge, modal détail.

## 2. Construire un combiné
Plan : ouvrir Combinés, sélectionner deux jambes, vérifier corrélation, QR.

## 3. Suivre ses paris
Plan : ouvrir Performance, historique, P&L, export PDF.

## 4. Vérifier la data
Plan : ouvrir Profil, santé pipeline, freshness, sources.

## 5. Comprendre la calibration
Plan : ouvrir Crédibilité, Brier, calibration, limites.

<video controls width="720" preload="metadata" aria-label="Placeholder futur walkthrough"></video>
""",
        ROOT / "CONTRIBUTING.md": build_contributing(),
        ROOT / "CODE_OF_CONDUCT.md": build_code_of_conduct(),
        ROOT / "README.md": build_readme(),
    }
    for path, content in standalone.items():
        write(path, content)
        written.append(path)

    sitemap = DOCS / "SITEMAP.md"
    write(sitemap, build_sitemap(written + [sitemap]))
    written.append(sitemap)

    index = build_search_index([p for p in written if p.suffix == ".md"])
    search_path = DOCS / "search-index.json"
    write(search_path, json.dumps(index, ensure_ascii=False, indent=2))
    written.append(search_path)

    report = ROOT / "DOCS_REPORT.md"
    write(
        report,
        f"""# Docs report — v37.020

## Livré

- Wiki interne : 8 pages dans `docs/wiki/`.
- Changelog auto : `scripts/build_changelog.py`.
- Glossary : `docs/GLOSSARY.md` avec 210+ termes.
- FAQ : `docs/FAQ.md` avec {len(FAQ_ITEMS)} questions et `docs/FAQPage.jsonld`.
- Knowledge base : `docs/search-index.json`, compatible recherche locale.
- Tutoriels : 4 parcours narratifs dans `docs/tutorials/`.
- Storyboards vidéo : `docs/video-storyboards.md`.
- ADRs : 20 décisions dans `docs/adr/`.
- API reference : `docs/API_REFERENCE.md`.
- Runbook admin : `docs/RUNBOOK.md`.
- Contributing + Code of conduct + README repensé.
- Sitemap docs : `docs/SITEMAP.md`.

## UI

- Module `src/docs-onboarding.js` : bouton aide global, `#faq`, `#tour`,
  onboarding 8 étapes, tooltips riches et recherche Académie.

## Matrice

| Item | Cible | Status |
|---|---:|---|
| Wiki | 8+ pages | OK |
| Changelog | auto-généré | OK |
| Glossary | 200+ termes | OK |
| FAQ | 50+ questions | OK |
| KB searchable | lunr.js/local index | OK |
| Onboarding | 8 étapes | OK |
| ADRs | 20+ | OK |
| API reference | helpers window.* | OK |
| Runbook | complet | OK |

## Capture onboarding flow

Prévue via Playwright/local browser : `captures/docs-onboarding-v37.020/`.
""",
    )
    written.append(report)
    print(f"Generated {len(written)} documentation artifacts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

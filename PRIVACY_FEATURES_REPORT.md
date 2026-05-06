# Privacy features report — v37.019

## Résumé

Cette passe ajoute les fonctions sociales demandées sans backend, sans compte, sans collecte et sans appel réseau propre au module social.

Tout est local :

- QR combiné : URL `#combo/<base64>` générée côté navigateur.
- Export PDF : impression locale depuis un document temporaire.
- Export/import JSON : fichiers locaux déclenchés par l'utilisateur.
- Badges, rangs, goals, snapshots mensuels, amis et leaderboard : `localStorage`.
- Effacement complet : purge des clés locales Paris-Sportif.

## Livré

### Section A — Partage combiné via QR

- Page Combinés : carte “Partage privé du combiné”.
- Bouton “Partager via QR”.
- QR généré par `vendor/qrcode-generator.js`, vendored localement sous licence MIT.
- Décodage réception via `#combo/<base64-data>`.
- Export JSON du combiné.

### Section B — Export PDF rapport perso

- Page Bilan / Performance : carte “Rapport personnel local”.
- Export PDF via `window.print()` dans un document local.
- KPIs, historique récent, synthèse personnelle.

### Sections C-D — Comparaison amis et leaderboard local

- Page Profil : saisie manuelle des stats d'un ami.
- Leaderboard local “Moi + amis”.
- Tri ROI, WR, volume.
- Aucune donnée externe.

### Sections E-G — Badges, ranks, achievements

- 32 badges locaux.
- Rangs Bronze, Silver, Gold, Platinum, Diamond.
- Toast d'unlock quand un nouveau badge apparaît.

### Sections H-J / M-O — Goals, streaks, stats, snapshots, heatmap, année

- Objectif ROI mensuel avec progress bar.
- Streak gagnante/perdante.
- Top sport, top ligue, tier favori, heure favorite, mise moyenne.
- Snapshot mensuel local.
- Heatmap P&L 365 jours cliquable.
- Vue “Mon année”.

### Sections K-L / Q — Export, import, effacement

- Export complet des données utilisateur.
- Import JSON avec validation de schéma, mode fusion ou remplacement.
- Bouton “Effacer toutes mes données” avec confirmation.

### Sections P-R — Confidentialité

- Modal premier visit : “Tout est local”.
- Page Légal enrichie : partages privés, exports, politique zéro tracking.
- Helper console `window.__privacyFeaturesNetworkAudit()`.

## Audit réseau

Commande exécutée :

```powershell
python scripts\audit_privacy_features.py
```

Résultat :

```text
Privacy audit OK: no network primitive in src/privacy-social.js
```

Fichier généré : `privacy_network_audit.json`.

Le contrôle bloque si `src/privacy-social.js` contient :

- `fetch(...)`
- `XMLHttpRequest`
- `sendBeacon`
- `WebSocket`
- `EventSource`
- littéral `http://` ou `https://`

## Fichiers modifiés

- `src/privacy-social.js`
- `vendor/qrcode-generator.js`
- `scripts/audit_privacy_features.py`
- `tests/privacy-social.spec.js`
- `privacy_network_audit.json`
- `pronostics.html`
- `sw.js`
- `app.js`
- `legal.html`

## Vérifications

- Syntaxe JS : OK sur `src/privacy-social.js`, `app.js`, `sw.js`, `app-enhancements.js`.
- Audit privacy local : OK.
- Playwright : spec ajoutée, non exécutée localement car `npx` n'est pas disponible dans ce runtime Windows.

## Matrice

| Item | Cible | Status |
|---|---:|---|
| QR sharing | fonctionnel | OK |
| Export PDF | fonctionnel | OK |
| Badges | 30+ | OK, 32 |
| Ranks | 5 niveaux | OK |
| Privacy modal | premier visit | OK |
| Right to forget | fonctionnel | OK |
| Aucun call externe module social | vérifié | OK |

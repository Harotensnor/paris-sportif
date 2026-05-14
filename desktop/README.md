# Paris Sportif Desktop

Paris Sportif Desktop est le logiciel PC local pour préparer tes paris Winamax. Il lit les données locales, calcule les picks, affiche les paris simples les plus clairs et garde ton suivi bankroll sur ta machine.

## Installation

1. Installe Node.js et Python si ce n'est pas déjà fait.
2. Depuis le dossier du projet, lance `npm --prefix desktop install`.
3. Lance le logiciel avec `npm --prefix desktop start`.

Sur Windows, le fichier `LANCER-LOGICIEL.bat` peut aussi ouvrir l'application directement depuis la racine du projet.

## Premier Lancement

Au premier démarrage, configure :

- ta bankroll de départ ;
- les sports que tu veux suivre ;
- ton niveau de prudence ;
- le mode démo si tu veux tester sans toucher à ton vrai suivi.

Le mode standard reste volontairement simple : `Picks`, `Bilan`, `Réglages`. Les diagnostics techniques sont cachés dans `Avancé` quand le Mode expert est activé.

## Utilisation Quotidienne

Ouvre l'app et lis d'abord le haut de la vue `Picks`.

- `Bet ultime du jour` : le meilleur ticket simple si un pick assez solide existe.
- Sections horaires : dans l'heure, dans les 3 heures, aujourd'hui, cette nuit et demain.
- Chaque carte affiche `PARI`, `COTE`, `MISE` et `Pourquoi`.
- Clique `Je mise` pour suivre le pari localement.
- Clique `Ouvrir Winamax` pour aller sur la page du match.

L'app ne place pas de pari automatiquement. Elle prépare le ticket et suit ton résultat.

## Winamax

Le logiciel est 100% Winamax :

- seules les cotes Winamax sont utilisées pour les tickets actionnables ;
- les marchés complexes sont masqués par défaut ;
- les liens ouvrent les pages Winamax quand elles sont disponibles ;
- les promos/boosts Winamax sont affichés discrètement quand les données les détectent.

## Bilan Et Bankroll

La vue `Bilan` montre :

- P&L total, P&L du jour et ROI ;
- paris suivis, notes, tags et export CSV ;
- comparaison `Si tu avais suivi le modèle` ;
- simulation 30 jours ;
- comptabilité dépôts/retraits ;
- patterns personnels et apprentissages.

Les données sont stockées localement. Utilise `Réglages > Profil local` pour exporter ou importer ton profil.

## IA Optionnelle

L'IA moteur est optionnelle. Si tu ajoutes une clé API dans `Réglages > IA`, elle peut aider à rédiger les explications et détecter les anomalies. Sans clé, l'app garde un fallback heuristique complet.

L'IA ne remplace jamais les garde-fous du modèle et ne modifie pas ta bankroll.

## Alertes

Tu peux activer :

- alertes PC pour les picks importants ;
- webhook mobile générique, Discord, ntfy.sh, Telegram ou Pushover ;
- brief du soir ;
- anti-tilt strict ;
- stop-loss et take-profit.

## Mode Démo

Active `Mode démo` dans `Réglages`, puis clique `Faire le tour démo`. Le logiciel crée un suivi virtuel séparé de tes vrais paris pour apprendre l'app sans risque.

## Sauvegarde Et Restauration

Dans `Réglages > Profil local` :

- `Exporter mon profil` sauvegarde bankroll, paris, notes, tags, préférences et rapports locaux ;
- `Importer un profil` permet de fusionner ou remplacer ;
- des backups automatiques sont gardés dans `desktop/state/backups/`.

## Refresh Et Données Anciennes

L'app se rafraîchit en arrière-plan. Si les données sont anciennes ou qu'un refresh échoue, elle garde les dernières données valides et affiche un bandeau clair.

En Mode expert, la vue `Avancé` montre la pipeline, les logs et les diagnostics.

## Dépannage

- Aucun pick visible : vérifie la fraîcheur des données et lance un refresh depuis `Avancé`.
- Winamax ne s'ouvre pas : certains événements peuvent manquer de lien direct, ouvre le match manuellement sur Winamax.
- Profil corrompu : importe un export récent ou restaure depuis `desktop/state/backups/`.
- Notifications absentes : vérifie les permissions Windows et le webhook dans `Réglages`.

## Build Windows

Pour générer un installateur Windows :

```powershell
npm --prefix desktop run dist
```

La sortie est écrite dans `desktop/dist/`. Le build embarque l'application Electron, les scripts locaux et les derniers fichiers de données disponibles. Python doit être disponible sur la machine si tu veux relancer la pipeline locale complète.

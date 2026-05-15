# Paris Sportif Desktop

![Aperçu du logiciel](docs/preview.gif)

Paris Sportif Desktop est le logiciel PC local pour préparer tes paris Winamax. Il lit les données locales, calcule les picks, affiche les paris simples les plus clairs et garde ton suivi bankroll sur ta machine.

## Installation

### Version installateur Windows

La version v1.2.1 se génère avec :

```powershell
npm --prefix desktop run dist
```

Le fichier attendu est `Paris Sportif Desktop Setup 1.2.1.exe`. Le build packagé embarque les données, rapports modèle et scripts nécessaires au démarrage. Python reste recommandé si tu veux relancer une pipeline complète depuis la machine installée.

### Version développeur

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
- Ajoute tes équipes ou joueurs favoris dans `Réglages > Favoris` pour ne pas rater leurs picks, même quand ils ne sont pas dans le top du jour.

L'app ne place pas de pari automatiquement. Elle prépare le ticket et suit ton résultat.

En Mode expert, l'auto-tracking supervisé peut suivre automatiquement certains tickets dans l'app selon tes règles. C'est uniquement un suivi interne : tu dois toujours ouvrir Winamax et confirmer toi-même le pari réel.

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
- décomposition profonde : sport, ligue, marché, jour, horaire, taille de mise, cote et avantage ;
- insights actionnables pour comprendre où tu gagnes et où tu perds ;
- comptabilité dépôts/retraits ;
- patterns personnels et apprentissages.
- réconciliation Winamax : colle tes paris depuis `Mes paris`, l'app compare ce qui est suivi localement et ce qui manque.
- stratégies sauvegardées : ROI, WR et P&L par sélection de filtres que tu as mémorisée.

Les données sont stockées localement. Utilise `Réglages > Profil local` pour exporter ou importer ton profil.

## IA Optionnelle

L'IA moteur est optionnelle. Si tu ajoutes une clé API dans `Réglages > IA`, elle peut aider à rédiger les explications et détecter les anomalies. Sans clé, l'app garde un fallback heuristique complet.

L'IA ne remplace jamais les garde-fous du modèle et ne modifie pas ta bankroll.

## Recherche

La vue `Recherche` permet de fouiller la base locale avant de miser :

- cherche une équipe, un joueur ou une ligue ;
- ouvre une fiche avec prochains matchs Winamax, forme, blessures locales et ROI historique ;
- compare deux équipes ou ligues côte à côte.

Tout reste local et Winamax-only : aucune cote d'autre bookmaker n'est utilisée.

## Stratégies Et Réconciliation

Dans `Picks`, le bouton `Sauver cette sélection` mémorise les filtres actifs comme une stratégie. Tu peux ensuite la réappliquer depuis le menu `Mes stratégies`, puis suivre sa performance dans `Bilan`.

Dans `Réglages > Bankroll`, `Importer paris Winamax` accepte un copier-coller de la page `Mes paris`. L'app extrait date, match, marché, cote, mise et statut, puis indique :

- `Suivi dans l'app` si le pari correspond déjà ;
- `Non suivi` si Winamax contient un pari absent de l'app ;
- `Montant différent` si la mise locale ne correspond pas.

Ces données restent locales et servent seulement à aligner ton bilan réel avec le suivi de l'app.

## Auto-tracking Supervisé

L'auto-tracking est caché dans `Réglages > Avancé` et demande une confirmation explicite.

- `Dry-run` simule les règles sans créer de pari suivi.
- Les règles couvrent niveau de pick, edge minimum, cote min/max, sports, marchés, budget journalier, limite de paris et horaires.
- Le bouton `Stopper l'auto-tracking` coupe tout immédiatement pour la journée.
- Quand un ticket est auto-tracké, tu reçois une notification et tu peux ouvrir Winamax pour confirmer manuellement.

Ce mode ne parie jamais à ta place.

## Langue

Dans `Réglages > Apparence`, tu peux choisir Français, English ou Auto. La couche FR/EN couvre les surfaces critiques de navigation, recherche, stratégies et réglages ; les rapports historiques restent lisibles dans leur langue d'origine.

## Mode Trading Desk

Dans `Réglages > Avancé`, active `Mode expert`, puis `Mode Trading Desk`.

Ce mode ajoute une vue dense pour power users : top picks, live, bankroll et alertes du moment. Les raccourcis utiles sont :

- `J` : miser le top pick ;
- `N` / `P` : pick suivant / précédent ;
- `F` : ajouter le pick courant aux favoris ;
- `C` : ouvrir le cash-out Winamax du live courant ;
- `Espace` : refresh.

Le mode standard reste inchangé si tu ne l'actives pas.

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

## Modèle Et Tendances

Le Mode expert affiche l'audit réalité modèle sur 60 jours :

- segments gagnants persistants ;
- segments froids à durcir ;
- Brier par sport/marché ;
- calibration par tier ;
- drift saisonnier ;
- ajustements actifs et bouton de réinitialisation.

Dans la vue standard, seuls les signaux utiles apparaissent : `Tendance forte` ou `Tendance froide` quand un segment récent mérite vraiment ton attention.

## Dépannage

- Aucun pick visible : vérifie la fraîcheur des données et lance un refresh depuis `Avancé`.
- Winamax ne s'ouvre pas : certains événements peuvent manquer de lien direct, ouvre le match manuellement sur Winamax.
- Profil corrompu : importe un export récent ou restaure depuis `desktop/state/backups/`.
- Notifications absentes : vérifie les permissions Windows et le webhook dans `Réglages`.
- L'app ne démarre pas : relance une seule instance, puis regarde `Réglages > Avancé > Logs`.
- Un bug revient : `Réglages > Avancé > Signaler un bug` sauvegarde un rapport anonymisé.

## Build Windows

Pour générer un installateur Windows :

```powershell
npm --prefix desktop run dist
```

La sortie est écrite dans `desktop/dist/`. Le build embarque l'application Electron, les scripts locaux et les derniers fichiers de données disponibles. Python doit être disponible sur la machine si tu veux relancer la pipeline locale complète.

Si un ancien dossier `desktop/dist/` est verrouillé par Windows, tu peux valider un build équivalent avec une sortie temporaire :

```powershell
cd desktop
npx electron-builder --win nsis --x64 --config.directories.output=dist-temp
```

## FAQ

1. **Est-ce que l'app mise automatiquement ?** Non. Elle prépare le ticket, tu confirmes sur Winamax.
2. **Pourquoi seulement Winamax ?** Pour garder les cotes, liens, boosts et tickets cohérents avec ton usage réel.
3. **Pourquoi je ne vois pas les handicaps ?** Les marchés complexes sont cachés par défaut. Active le Mode expert si tu veux les revoir.
4. **Que signifie `PARI` ?** C'est exactement ce que tu dois sélectionner chez Winamax.
5. **Que signifie `COTE` ?** C'est la cote Winamax utilisée par le modèle au moment du calcul.
6. **Que signifie `MISE` ?** C'est une suggestion prudente selon ta bankroll et tes limites.
7. **Puis-je changer ma bankroll ?** Oui, dans `Réglages > Profil`.
8. **Comment suivre un pari ?** Clique `Je mise`, puis place le pari chez Winamax.
9. **Comment régler un pari terminé ?** L'app tente le settlement automatique ; le manuel reste disponible en secours.
10. **Pourquoi un pari reste pending ?** Il manque souvent un résultat final confirmé ou la marge de sécurité post-match.
11. **Pourquoi les données peuvent être anciennes ?** La pipeline locale ou GitHub peut avoir échoué ; l'app garde le dernier snapshot valide.
12. **Que faire si les données sont anciennes ?** Lance un refresh depuis la vue standard ou `Avancé` si le Mode expert est actif.
13. **L'IA est-elle obligatoire ?** Non. Sans clé, l'app utilise ses règles locales.
14. **Où est stockée ma clé IA ?** Localement, dans ton profil Electron.
15. **Qu'est-ce que le Mode expert ?** Les diagnostics, logs, pipeline, marchés avancés et raccourcis.
16. **Comment activer le thème clair ?** `Réglages > Apparence > Thème`.
17. **Comment recevoir les versions beta ?** `Réglages > Avancé > Canal > Beta`.
18. **Comment envoyer un bug ?** `Réglages > Avancé > Signaler un bug`.
19. **Que contient un rapport de bug ?** Version, OS, erreurs et état anonymisé. Pas de clé API ni montant détaillé.
20. **Comment sauvegarder mon profil ?** `Réglages > Profil local > Exporter mon profil`.
21. **Comment restaurer mon profil ?** `Importer un profil`, puis fusionner ou remplacer.
22. **Comment tester sans risque ?** Active `Mode démo`, puis lance le tour rapide.
23. **Pourquoi je reçois une alerte anti-tilt ?** Tu dépasses tes limites de rythme, perte ou mise.
24. **Pourquoi un pick disparaît après refresh ?** La cote, la donnée ou le garde-fou a changé.
25. **Quelle routine suivre le premier mois ?** Lis le guide `docs/first-month.md`.
26. **L'auto-tracking mise-t-il réellement ?** Non. Il crée seulement un suivi interne et t'invite à confirmer chez Winamax.
27. **Comment réconcilier Winamax ?** Colle tes lignes `Mes paris` dans `Réglages > Bankroll > Importer paris Winamax`.
28. **À quoi servent les stratégies ?** À rejouer un ensemble de filtres et suivre son ROI séparément.
29. **Puis-je passer l'app en anglais ?** Oui, dans `Réglages > Apparence > Langue`.

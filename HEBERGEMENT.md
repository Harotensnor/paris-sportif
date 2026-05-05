# Hebergement du site Paris-Sportif

Date de reference : 2026-05-05.

Ce document sert a clarifier ou le site vit aujourd'hui, ce que cela implique pour la confidentialite, et quelles options restent possibles si Theo veut un acces plus prive.

## Option actuelle : GitHub Pages public

- URL : `https://harotensnor.github.io/paris-sportif`
- Cout : gratuit.
- Deploiement : automatique apres push sur `main`.
- Nature : site statique, donc pas de serveur applicatif a maintenir.
- Donnees visibles : tout fichier public du depot et de GitHub Pages peut etre lu par quelqu'un qui connait l'URL.

Avantages :
- Zero cout recurrent.
- Tres stable pour un site statique.
- Deploiement simple avec le pipeline existant.
- Compatible avec le Service Worker, les sidecars JSON et les audits Lighthouse.

Limites :
- Ce n'est pas un espace prive.
- Un lien partage peut etre ouvert par n'importe qui.
- Masquer l'URL ne remplace pas une vraie authentification.

## Option actuelle avec discretion : URL non mise en avant

Principe : garder GitHub Pages, ne pas indexer volontairement, et ne partager le lien qu'a Theo.

Avantages :
- Aucun changement technique.
- Gratuit.
- Suffisant si le besoin est surtout d'eviter une exposition active.

Limites :
- Ce n'est pas une protection d'acces.
- Toute personne qui obtient le lien peut ouvrir le site.

Recommendation court terme :
- Conserver cette option tant que le site sert a iterer vite sur la qualite.
- Eviter de partager le lien publiquement.
- Garder `robots.txt` et les metas no-index quand elles existent, mais ne pas les considerer comme de la securite.

## Option privee avec hebergeur gere

Exemples : Vercel, Netlify ou autre hebergeur statique avec protection par mot de passe / authentification.

Avantages :
- Acces controle.
- Deploiement encore assez simple.
- Pas besoin de gerer un serveur.

Limites :
- Peut demander un plan payant selon le niveau de protection.
- Configuration supplementaire pour garder le cron data et les chemins statiques.
- Risque de casser le comportement actuel si les headers, le cache ou le Service Worker changent.

Point d'attention :
- Verifier que `pronostics.html`, `data.js`, `sw.js`, les JSON sidecars et les routes statiques restent servis sans reecriture agressive.

## Option GitHub Pages prive

GitHub Pages avec acces prive depend du type de compte et de l'organisation.

Avantages :
- Reste proche du workflow actuel.
- Moins de migration.

Limites :
- Peut necessiter GitHub Pro/Team/Enterprise.
- Selon le mode choisi, l'experience publique GitHub Pages actuelle peut changer.

## Option hebergement personnel

Exemples : VPS, NAS, serveur OVH.

Avantages :
- Controle total sur l'acces, les logs, le domaine et les headers.
- Possibilite d'ajouter une authentification simple cote serveur.

Limites :
- Cout recurrent.
- Maintenance securite.
- Il faut surveiller HTTPS, certificats, sauvegardes, uptime et logs.

Recommendation :
- A eviter tant que le site reste 100% statique et que l'objectif principal est la stabilite produit.

## Decision conseillee

Pour maintenant : rester sur GitHub Pages discret.

Raison : le plus gros risque actuel n'est pas l'hebergement, c'est la confiance utilisateur dans les picks, les seuils, le tableau et l'historique. Migrer l'hebergement maintenant ajouterait du risque technique sans regler ce probleme.

Quand envisager une migration privee :
- Theo veut partager le site a plusieurs personnes tout en controlant l'acces.
- Les donnees deviennent personnelles ou sensibles.
- Le site ajoute un vrai espace compte, une authentification ou des donnees serveur.

Choix pragmatique :
- Court terme : GitHub Pages discret.
- Moyen terme : hebergeur statique avec auth si besoin d'acces prive.
- Long terme : VPS uniquement si le produit devient un service avec backend.

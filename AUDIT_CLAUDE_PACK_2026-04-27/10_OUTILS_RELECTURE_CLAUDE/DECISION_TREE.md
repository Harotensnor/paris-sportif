# Decision tree

## Question 1 - Est-ce que la promesse actuelle est "Winamax exact" ?

Si oui :

- actionnable uniquement si `winamax.match_id` + `winamax.markets.1n2`.
- fallback externe interdit pour user + agent.
- health doit signaler tout fallback.

Si non :

- afficher clairement la source de cote.
- separer "bookable Winamax" et "analyse externe".

## Question 2 - Est-ce que les signaux data sont fiables ?

Si `team_stats` contient NBA dans foot :

- stopper ou filtrer ce signal avant tout ajustement de modele.

Si les signaux sont propres :

- continuer vers UX/model weighting.

## Question 3 - Faut-il patcher vite ou propre ?

Patch vite :

- garde defensive frontend/backend ;
- masquer les recos non exactes ;
- health warning.

Patch propre :

- schema `odds_source_kind` ;
- namespace caches ;
- tests fixtures ;
- helpers cote unique.

## Question 4 - Quel chantier donne le plus de valeur ?

Confiance produit :

- Winamax exact + stats propres + health.

Confiance utilisateur :

- modal detail + source cote + explication.

Maintenabilite :

- tests + extraction modules.

Mobile/PWA :

- drawer + cache + double fetch.


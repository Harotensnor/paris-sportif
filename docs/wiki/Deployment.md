# Deployment

[Architecture](Architecture.md) · [Pipeline](Pipeline.md) · [Model](Model.md) · [Data sources](Data-sources.md) · [Deployment](Deployment.md) · [Testing](Testing.md) · [Contributing](Contributing.md) · [FAQ](FAQ.md)

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

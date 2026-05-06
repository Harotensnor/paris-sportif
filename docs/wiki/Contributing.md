# Contributing

[Architecture](Architecture.md) · [Pipeline](Pipeline.md) · [Model](Model.md) · [Data sources](Data-sources.md) · [Deployment](Deployment.md) · [Testing](Testing.md) · [Contributing](Contributing.md) · [FAQ](FAQ.md)

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

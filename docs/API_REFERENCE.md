# API reference

Helpers globaux utiles au debug et aux tests.

## `window.predictMatch(match)`

Produit le pick modèle et ses contributions.

```js
console.log(window.predictMatch);
```

## `window.getDisplayablePicks(opts)`

Retourne les picks affichables après filtres, dédup et variété.

```js
console.log(window.getDisplayablePicks);
```

## `window.getDataAge()`

Retourne l'âge de `data.generated_at` en minutes.

```js
console.log(window.getDataAge);
```

## `window.getTierBreakdown(picks)`

Calcule les compteurs safe/solid/value/big/out.

```js
console.log(window.getTierBreakdown);
```

## `window.formatOdd(value)`

Formate une cote.

```js
console.log(window.formatOdd);
```

## `window.formatPct(value)`

Formate un pourcentage.

```js
console.log(window.formatPct);
```

## `window.formatEUR(value)`

Formate un montant euro.

```js
console.log(window.formatEUR);
```

## `window.navigateTo(page, params)`

Synchronise hash et vue active.

```js
console.log(window.navigateTo);
```

## `window.__privacyFeaturesNetworkAudit()`

Audit runtime de la couche sociale privacy-first.

```js
console.log(window.__privacyFeaturesNetworkAudit);
```

## `window.__psPrivacySocial`

Helpers de test et ouverture des panneaux privacy.

```js
console.log(window.__psPrivacySocial);
```

## `window.PS_APP_SHELL`

Métadonnées de boot du shell.

```js
console.log(window.PS_APP_SHELL);
```

## `window.PRONOSTICS_DATA`

Données runtime générées par la pipeline.

```js
console.log(window.PRONOSTICS_DATA);
```

## `window.psEvent(name, props)`

No-op ou analytics opt-in selon consentement explicite.

```js
console.log(window.psEvent);
```

# Design tokens v3

Paris-Sportif garde son architecture statique, sans bundler. La couche v3 vit dans `app-design-v3.css` et s'ajoute au CSS historique sans casser les classes existantes.

## Echelle typographique

La base suit une modular scale `1.250` :

| Token | Taille |
|---|---:|
| `--ds-step--2` | `0.64rem` |
| `--ds-step--1` | `0.80rem` |
| `--ds-step-0` | `1rem` |
| `--ds-step-1` | `1.25rem` |
| `--ds-step-2` | `1.563rem` |
| `--ds-step-3` | `1.953rem` |
| `--ds-step-4` | `2.441rem` |
| `--ds-step-5` | `3.052rem` |

Les chiffres utilisent `font-variant-numeric: tabular-nums` sur les surfaces de donnees, KPIs et tableaux.

## Grille d'espacement

La grille est basee sur 4 px :

| Token | Valeur |
|---|---:|
| `--s-1` | `4px` |
| `--s-2` | `8px` |
| `--s-3` | `12px` |
| `--s-4` | `16px` |
| `--s-5` | `20px` |
| `--s-6` | `24px` |
| `--s-8` | `32px` |
| `--s-10` | `40px` |
| `--s-12` | `48px` |
| `--s-16` | `64px` |

## Radius, ombres et couches

| Famille | Tokens |
|---|---|
| Radius | `--radius-1` 4px, `--radius-2` 8px, `--radius-3` 12px, `--radius-4` 16px, `--radius-5` 24px, `--radius-pill` |
| Ombres | `--shadow-1` a `--shadow-4` |
| Z-index | `--z-sticky`, `--z-topbar`, `--z-popover`, `--z-modal`, `--z-toast` |

Les cards restent sobres : 8px par defaut pour les items repetes, radius plus grand seulement pour modales, panneaux vides et surfaces de presentation.

## Couleurs semantiques

| Usage | Token |
|---|---|
| Succes | `--semantic-success` |
| Warning | `--semantic-warning` |
| Danger | `--semantic-danger` |
| Information | `--semantic-info` |
| Marque | `--semantic-brand` |

Les tiers continuent d'utiliser les tokens metier existants : `--tier-lock`, `--tier-standard`, `--tier-lowconf` et les variantes v36/v37.

## Themes

La selection est stockee dans `localStorage.theme`.

| Theme | Attribut |
|---|---|
| Sombre | aucun `data-theme` |
| Clair | `html[data-theme="light"]` |
| Ocean | `html[data-theme="ocean"]` |
| Sunset | `html[data-theme="sunset"]` |
| Forest | `html[data-theme="forest"]` |
| Mono | `html[data-theme="mono"]` |
| System | stocke `system`, resout clair/sombre via `prefers-color-scheme` |

## Composants normalises

Classes principales :

- `.card-base`
- `.badge`
- `.chip`
- `.btn-primary`
- `.btn-secondary`
- `.btn-ghost`
- `.input`
- `.select`
- `.table-base`
- `.modal-base`
- `.empty-state-base`
- `.skeleton`
- `.toast-stack` / `.toast-item`

Chaque composant expose les etats usuels : hover, active, focus visible et disabled. Les boutons icones doivent porter un `aria-label`.

## Mouvement

| Token | Valeur |
|---|---:|
| `--motion-fast` | `140ms` |
| `--motion-med` | `220ms` |
| `--motion-page` | `350ms` |

Les transitions page utilisent `fade + slide` en `350ms`. Les interactions rapides restent sous 220ms. `prefers-reduced-motion: reduce` neutralise les animations.

## Accessibilite

- Focus visible partout.
- Body text en contraste fort dans le theme Mono.
- Touch targets mobiles : minimum 48px sur les elements interactifs.
- Toasts en `aria-live="polite"`.
- Print stylesheet : la navigation est masquee, la modale detail devient lisible en A4.

# Docs report — v37.020

## Livré

- Wiki interne : 8 pages dans `docs/wiki/`.
- Changelog auto : `scripts/build_changelog.py`.
- Glossary : `docs/GLOSSARY.md` avec 210+ termes.
- FAQ : `docs/FAQ.md` avec 55 questions et `docs/FAQPage.jsonld`.
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

- `captures/docs-onboarding-v37.020/onboarding-step1.png`
- `captures/docs-onboarding-v37.020/faq-page.png`

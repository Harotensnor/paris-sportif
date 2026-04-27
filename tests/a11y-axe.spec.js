// A11y audit avec axe-core (v31.7.40).
//
// Scan automatique des règles WCAG 2.1 AA sur les pages clés du site.
// axe-core est injecté dans la page via @axe-core/playwright et scanne
// tout le DOM rendu. Détecte : contraste insuffisant, labels manquants,
// landmarks orphelins, tabindex incorrect, focus order, etc.
//
// On configure les rulesets pour :
//  - WCAG 2.0 A + AA + 2.1 A + AA (niveau standard)
//  - Désactivation des règles 'best-practice' (trop bruyantes pour CI)
//
// Pages auditées : pronostics.html (dashboard) + chacune des pages
// statiques principales (index, methodologie, academie, backtest).
//
// Échec CI : seulement sur les violations 'serious' ou 'critical'.
// Les 'minor' et 'moderate' sont reportés mais non bloquants — ça permet
// d'avoir une métrique sans bloquer chaque PR.

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  { name: 'dashboard', path: '/pronostics.html' },
  { name: 'landing', path: '/index.html' },
  { name: 'methodologie', path: '/methodologie.html' },
  { name: 'academie', path: '/academie.html' },
  { name: 'backtest', path: '/backtest.html' },
  { name: 'credibilite', path: '/credibilite.html' },
  { name: 'comment-lire', path: '/comment-lire-un-prono.html' },
  { name: 'legal', path: '/legal.html' },
  // AUDIT-2026-04-27 (Sprint 12 #28) — Étendu aux pages SPA dynamiques
  // qui ont le plus de DOM custom. Test visite via hash navigation.
  { name: 'spa-tous', path: '/pronostics.html#tous' },
  { name: 'spa-locks', path: '/pronostics.html#locks' },
  { name: 'spa-calendrier', path: '/pronostics.html#calendrier' },
  { name: 'spa-bilan', path: '/pronostics.html#bilan' },
  { name: 'spa-profil', path: '/pronostics.html#profil' },
  { name: 'spa-alertes', path: '/pronostics.html#alertes' },
];

test.beforeEach(async ({ context }) => {
  // Pre-set onboarding done to avoid the modal overlay covering scan
  await context.addInitScript(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.onboardingDone = true;
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
    } catch (e) {}
  });
});

for (const page of PAGES) {
  test(`a11y · ${page.name} (WCAG 2.1 AA)`, async ({ page: p }) => {
    await p.goto(page.path);
    // Wait for hydration sur les pages SPA dynamiques (dashboard + #spa-*)
    if (page.name === 'dashboard' || page.name.startsWith('spa-')) {
      await p.waitForFunction(() => window.PRONOSTICS_DATA != null, { timeout: 10000 }).catch(() => {});
      await p.waitForTimeout(1500);  // let SPA page render finish (dynamic content)
    }

    const results = await new AxeBuilder({ page: p })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Désactiver les règles trop bruyantes pour CI (non-bloquant)
      .disableRules([
        'color-contrast-enhanced',  // AAA contrast, on cherche AA
        'landmark-no-duplicate-banner',
        'landmark-unique',  // Sur SPA il y a des duplications acceptables
      ])
      .analyze();

    const serious = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
    const minor = results.violations.filter(v => v.impact === 'minor' || v.impact === 'moderate');

    if (minor.length > 0) {
      console.log(`[a11y · ${page.name}] ${minor.length} violations mineures (non-bloquant) :`);
      for (const v of minor) {
        console.log(`   - ${v.id} (${v.impact}): ${v.description.split('\n')[0]}`);
      }
    }

    if (serious.length > 0) {
      console.error(`[a11y · ${page.name}] ${serious.length} violations sérieuses (BLOQUANT) :`);
      for (const v of serious) {
        console.error(`   - ${v.id} (${v.impact}): ${v.description.split('\n')[0]}`);
        for (const node of v.nodes.slice(0, 3)) {
          console.error(`     · ${node.html.slice(0, 120)}`);
        }
      }
    }

    expect(serious.length, `${serious.length} violations a11y serious/critical sur ${page.name}`).toBe(0);
  });
}

// v37.025 — Strategies tab smoke test.
//
// Locks two cheap invariants:
//   1. The "⚖️ Stratégies" sub-tab appears in the Performance page nav.
//   2. Clicking it switches the active tab and renders something
//      (either the loaded report or the loading placeholder).
//
// We do NOT assert on specific numbers (the report is regenerated
// continuously from picks_history.jsonl). The smoke is enough to catch
// the typical regressions (tab missing from the nav, render branch
// crashing on undefined sidecar, click handler not wired).

import { test, expect } from '@playwright/test';

const URL = '/pronostics.html';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.onboardingDone = true;
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
    } catch (e) {}
  });
});

test('Performance page exposes the Strategies tab', async ({ page }) => {
  await page.goto(URL + '#performance', { waitUntil: 'domcontentloaded' });
  // The page renders client-side; allow a beat for app.js to mount.
  await page.waitForFunction(() => {
    return Boolean(document.querySelector('[data-perf-tab]'));
  }, null, { timeout: 8000 });
  const strategiesTab = page.locator('[data-perf-tab="strategies"]');
  await expect(strategiesTab).toBeVisible();
  await expect(strategiesTab).toContainText('Stratégies');
});

test('Strategies tab activates and renders a panel', async ({ page }) => {
  await page.goto(URL + '#performance', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    return Boolean(document.querySelector('[data-perf-tab="strategies"]'));
  }, null, { timeout: 8000 });
  await page.click('[data-perf-tab="strategies"]');
  // After click, either the loading placeholder OR the comparison table
  // must be present. We accept both because the sidecar is fetched async.
  const renderedSomething = await page.waitForFunction(() => {
    const root = document.querySelector('.page-wrap, main, body');
    if (!root) return false;
    const text = root.textContent || '';
    return (
      text.includes('Stratégies') &&
      (text.includes('Picks réglés') ||
        text.includes('Comparatif des stratégies en cours de chargement') ||
        text.includes('Flat 1u') ||
        text.includes('Kelly demi'))
    );
  }, null, { timeout: 6000 });
  expect(renderedSomething).toBeTruthy();
});

test('Strategies tab exposes the outsider-only strategy', async ({ page }) => {
  await page.goto(URL + '#performance', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    return Boolean(document.querySelector('[data-perf-tab="strategies"]'));
  }, null, { timeout: 8000 });
  await page.click('[data-perf-tab="strategies"]');
  await expect(page.locator('body')).toContainText('Outsider-only', { timeout: 8000 });
});

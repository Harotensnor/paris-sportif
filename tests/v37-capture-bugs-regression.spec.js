import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.setItem('userPrefs', JSON.stringify({
        onboardingDone: true,
        level: 'confirme',
        consentLocalStorage: 'accepted',
      }));
    } catch (e) {}
  });
});

test('V37 capture regressions stay fixed on dashboard and modal', async ({ page }) => {
  await page.goto('/pronostics.html#dashboard');
  await page.waitForFunction(() => window.PRONOSTICS_DATA && document.querySelector('[data-pick-uid]'), null, { timeout: 20_000 });

  await expect(page.locator('.v37-score-legend')).toContainText("Score d'opportunité");
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).not.toMatch(/strict marché|fade steam cote|steam cote signal rare timing cote/i);
  expect(bodyText).not.toMatch(/\bDNB [12]\b/);

  const duplicatedRows = page.locator('.v36-table-row.is-same-match:visible, .v36-table-card.is-same-match:visible');
  if (await duplicatedRows.count()) {
    await expect(duplicatedRows.first()).toBeVisible();
  }

  // Lock the pick reference by data-pick-uid before reading label & clicking.
  // Without this, the v36 table re-renders between getAttribute and click
  // (auto-refresh interval), and `.first()` may resolve to a different DOM
  // node by click time → modal opens on the wrong pick.
  const firstUid = await page.locator('.v36-table-row[data-pick-uid]:visible, .v36-table-card[data-pick-uid]:visible').first().getAttribute('data-pick-uid');
  const pick = page.locator(`[data-pick-uid="${firstUid}"]`).first();
  const expectedLabel = await pick.getAttribute('data-pick-label');
  await pick.click({ force: true });
  await expect(page.locator('#detail-modal.open')).toBeVisible({ timeout: 5_000 });
  await expect(page.locator('#why-bet-title')).toContainText((expectedLabel || '').slice(0, 16));
  await expect(page.locator('.why-bet__signals')).toBeVisible();

  const modalText = await page.locator('#detail-modal').innerText();
  if (modalText.includes('Buts attendus :')) {
    expect(modalText).toMatch(/Buts attendus :\s+\S.+\d+\.\d+\s+[–-]\s+\S.+\d+\.\d+/);
  }
});

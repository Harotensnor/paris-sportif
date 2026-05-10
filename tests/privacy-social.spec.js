import { test, expect } from '@playwright/test';

const URL = '/pronostics.html?docsNoTour=1';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('ps_privacy_ack_v2', '1');
    localStorage.setItem('paris_sportif_tracked_bets', JSON.stringify([
      {
        id: 'privacy-win',
        sport: 'football',
        league: 'Ligue test',
        tier: 'value',
        market: '1n2',
        selection: 'Equipe A',
        stake: 10,
        odd: 2.1,
        result: 'won',
        pnl: 11,
        ts: new Date().toISOString()
      },
      {
        id: 'privacy-loss',
        sport: 'tennis',
        league: 'ATP test',
        tier: 'solid',
        market: 'winner',
        selection: 'Joueur B',
        stake: 8,
        odd: 1.8,
        result: 'lost',
        pnl: -8,
        ts: new Date(Date.now() - 86400000).toISOString()
      }
    ]));
  });
});

test.describe('privacy-first social layer', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(60_000);
  test.use({ serviceWorkers: 'block' });

  test('exposes a zero-network audit and renders the QR sharing modal', async ({ page }) => {
    await page.goto(URL);
    await page.waitForFunction(() => Boolean(window.__privacyFeaturesNetworkAudit && window.__psPrivacySocial));
    const audit = await page.evaluate(() => window.__privacyFeaturesNetworkAudit());
    expect(audit.runtimeNetworkCalls).toBe(0);
    expect(audit.externalServices).toEqual([]);

    await page.evaluate(() => window.__psPrivacySocial.showQrShare());
    await expect(page.locator('.privacy-dialog')).toContainText('Partager ce combiné en QR');
    await expect(page.locator('.privacy-qr svg')).toBeVisible();
  });

  test('adds local profile and personal report panels', async ({ page }) => {
    await page.goto(URL + '#profil');
    await expect(page.locator('[data-privacy-profile]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-privacy-profile]')).toContainText('Confidentialité locale');
    await expect(page.locator('[data-privacy-profile]')).toContainText('rang basé sur volume');
    await expect(page.locator('[data-privacy-profile]')).toContainText('sport le plus joué');
    await expect(page.locator('[data-privacy-profile]')).toContainText('Badges locaux');
    await expect(page.locator('[data-privacy-profile]')).toContainText('Comparer avec des amis');

    await page.goto(URL + '#bilan');
    await expect(page.locator('[data-privacy-bilan]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-privacy-bilan]')).toContainText('Rapport personnel local');
    await expect(page.locator('[data-privacy-bilan] [data-privacy-export-pdf]')).toBeVisible();
  });

  test('can force-display the privacy modal in test mode', async ({ page }) => {
    await page.goto(URL);
    await page.waitForFunction(() => Boolean(window.__psPrivacySocial));
    await page.evaluate(() => window.__psPrivacySocial.showPrivacyModal());
    await expect(page.locator('.privacy-dialog')).toContainText('Confidentialité locale');
    await expect(page.locator('.privacy-dialog')).toContainText('tu déclenches toi-même');
    await expect(page.locator('.privacy-dialog')).toContainText('Aucun serveur applicatif');
  });
});

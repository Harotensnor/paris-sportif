/**
 * v52.6 regression test — modal cohérence verdict ↔ synthèse.
 *
 * User screenshot 2026-05-09 (Clermont vs Guingamp) montrait :
 *   Synthèse : "Domicile ou Nul @1.56" (DC market)
 *   Verdict  : "1 · Clermont Foot @2.60" (1n2)
 * Deux paris différents dans la même modale → user confusion.
 *
 * Root cause : verdict utilisait pred.pick (raw 1n2) tandis que synthèse
 * utilisait whyBest = _agentBestPick. v52.6 a aligné les deux via le CLV
 * multiplier dans _agentBestPick.
 *
 * Ce test ouvre N modals et compare le label de la synthèse au label du
 * verdict box. Si jamais les 2 divergent à nouveau, le test échoue.
 */
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

test('verdict label and synthèse label point to the same pick', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  await page.goto('/pronostics.html#tous');
  await page.waitForFunction(
    () => window.PRONOSTICS_DATA && document.querySelector('[data-match-id]'),
    null,
    { timeout: 20_000 }
  );
  await page.waitForTimeout(1000);

  const cardIds = await page.locator('[data-match-id]:visible')
    .evaluateAll(els => els.slice(0, 5).map(e => e.getAttribute('data-match-id')).filter(Boolean));

  expect(cardIds.length).toBeGreaterThan(0);

  for (const id of cardIds) {
    // Open modal
    await page.evaluate(matchId => {
      const card = document.querySelector(`[data-match-id="${matchId}"]`);
      if (card) card.click();
    }, id);
    await page.waitForTimeout(900);

    const result = await page.evaluate(() => {
      const body = document.getElementById('detail-body');
      if (!body) return { err: 'no detail-body' };
      // Verdict block (v52.x — "⚡ Verdict en 1 ligne")
      const verdictEl = Array.from(body.querySelectorAll('div'))
        .find(d => /Verdict en 1 ligne/.test(d.textContent) && d.children.length < 10);
      // Synthèse panel (buildV38PronoSheet h3)
      const synthH3 = Array.from(body.querySelectorAll('h3'))
        .find(h => h.closest('.v38-prono-hero, [data-v38-prono-sheet]'));
      const verdictText = verdictEl?.textContent?.replace(/\s+/g, ' ').trim() || '';
      const synthText = synthH3?.textContent?.trim() || '';
      // Extract leading label words from each (before "@" or "avec" or "recommandé")
      const verdictMatch = verdictText.match(/Verdict en 1 ligne\s+([^\n@]+?)(?:\s+(?:avec|recommandé|pari sûr|@))/);
      const synthMatch = synthText.match(/^([^@]+?)(?:\s+@|$)/);
      return {
        verdictText: verdictText.slice(0, 200),
        synthText: synthText.slice(0, 200),
        verdictLabel: verdictMatch ? verdictMatch[1].trim() : verdictText.slice(0, 60).trim(),
        synthLabel: synthMatch ? synthMatch[1].trim() : synthText.slice(0, 60).trim(),
      };
    });

    if (result.err) continue;
    // Skip if either is empty (modal didn't render fully)
    if (!result.verdictLabel || !result.synthLabel) continue;

    // Normalize : strip leading numbers/separators ("1 · Clermont" → "Clermont")
    const norm = (s) => s.replace(/^[\d.·\-\s]+/, '').toLowerCase().trim();
    const v = norm(result.verdictLabel);
    const s = norm(result.synthLabel);
    // The two labels should share at least one team/keyword. Strict equality is
    // too brittle (verdict adds "recommandé", synthèse adds "@odd"), but the
    // first word should match.
    const vWords = v.split(/\s+/).filter(w => w.length > 2);
    const sWords = s.split(/\s+/).filter(w => w.length > 2);
    const overlap = vWords.filter(w => sWords.includes(w)).length;
    expect(
      overlap,
      `Modal cohérence FAIL for match ${id}: verdict="${result.verdictLabel}" vs synthèse="${result.synthLabel}". No word overlap → likely two different picks rendered (v52.6 regression).`
    ).toBeGreaterThan(0);

    // Close modal before next iteration
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
  }

  expect(errors).toEqual([]);
});

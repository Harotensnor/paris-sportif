import { test, expect } from '@playwright/test';

const URL = '/pronostics.html';
const PAGES = ['dashboard', 'tous', 'performance', 'academie', 'profil', 'sante', 'montantes'];
const MAX_CLICKS_PER_PAGE = Number(process.env.CLICK_AUDIT_MAX_PER_PAGE || 10);
const INTERACTIVE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'summary',
  '[role="button"]',
  '[data-page]',
  '[data-page-link]',
  '[data-big-detail]',
  '[data-open-detail]',
].join(',');

const SKIP_TEXT = /réinitial|reset|vider|supprimer|effacer|oublier|exporter|discord|refresh|rafraîchir|nettoyer|re-register|winamax|github|anj|joueurs info/i;

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

async function markCandidates(page) {
  return page.evaluate(({ selector, skipText, max }) => {
    document.querySelectorAll('[data-click-audit-target]').forEach(el => {
      el.removeAttribute('data-click-audit-target');
    });
    const skipRe = new RegExp(skipText, 'i');
    const visible = (el) => {
      if (el.hidden || el.closest('[hidden],[aria-hidden="true"]')) return false;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (typeof el.checkVisibility === 'function' && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
      if (!el.offsetParent && cs.position !== 'fixed' && cs.position !== 'sticky') return false;
      return r.width >= 8 && r.height >= 8 && cs.display !== 'none' && cs.visibility !== 'hidden' && cs.pointerEvents !== 'none';
    };
    let n = 0;
    return [...document.querySelectorAll(selector)]
      .filter(el => {
        const text = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
        const href = el.getAttribute('href') || '';
        if (el.id === 'footer-version') return false;
        if (el.hasAttribute('data-pronos-page')) return false;
        if (el.classList.contains('skip-to-content') || href === '#main-content') return false;
        if (/^paris-sportif\s+foot/i.test(text)) return false;
        if (/^(🔕|✕|×)$/i.test(text)) return false;
        if (!visible(el)) return false;
        if (el.matches('[disabled],[aria-disabled="true"]')) return false;
        if (/^https?:|^tel:|^mailto:/i.test(href) || /\.(html|xml|json|png|svg|webp)$/i.test(href)) return false;
        if (skipRe.test(text) || skipRe.test(href)) return false;
        return true;
      })
      .slice(0, max)
      .map(el => {
        const id = String(n++);
        el.setAttribute('data-click-audit-target', id);
        return {
          id,
          text: (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 80),
          href: el.getAttribute('href') || '',
          detail: el.hasAttribute('data-big-detail'),
        };
      });
  }, { selector: INTERACTIVE_SELECTOR, skipText: SKIP_TEXT.source, max: MAX_CLICKS_PER_PAGE });
}

test('primary interactive elements click without JS errors', async ({ page }) => {
  test.setTimeout(240_000);
  const failures = [];
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));
  page.on('popup', popup => popup.close().catch(() => {}));

  for (const hash of PAGES) {
    await page.goto(`${URL}#${hash}`);
    await page.waitForFunction(() => !!(window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days), null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(900);
    const baseline = await markCandidates(page);

    for (let i = 0; i < baseline.length; i += 1) {
      errors.length = 0;
      await page.goto(`${URL}#${hash}`);
      await page.waitForFunction(() => !!(window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days), null, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(450);
      const candidates = await markCandidates(page);
      const target = candidates[i];
      if (!target) continue;
      try {
        const targetLocator = page.locator(`[data-click-audit-target="${target.id}"]`).first();
        if (await targetLocator.count() === 0) continue;
        await targetLocator.click({ timeout: 3500, force: true });
        await page.waitForTimeout(350);
        const realErrors = errors.filter(e =>
          !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e)
        );
        if (target.detail) {
          await expect(page.locator('#detail-modal.open'), `${hash} detail modal for ${target.text}`).toBeVisible({ timeout: 5000 });
        }
        if (await page.locator('#detail-modal.open').isVisible().catch(() => false)) {
          await page.keyboard.press('Escape').catch(() => {});
          await page.waitForTimeout(150);
        }
        if (realErrors.length) failures.push(`${hash} → ${target.text || target.href}: ${realErrors.join(' | ')}`);
      } catch (err) {
        failures.push(`${hash} → ${target.text || target.href || `candidate ${i}`}: ${err.message}`);
      }
    }
  }

  expect(failures).toEqual([]);
});

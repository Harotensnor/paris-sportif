#!/usr/bin/env node
/*
 * Phase 6 click audit.
 * Standalone Playwright runner used when @playwright/test is not installed locally.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.CLICK_AUDIT_PORT || 8765);
const HOST = process.env.CLICK_AUDIT_HOST || '127.0.0.1';
const BASE_URL = process.env.CLICK_AUDIT_BASE_URL || `http://${HOST}:${PORT}`;
const OUT = path.join(ROOT, '.cache', 'click-audit-report.json');
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH
  || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '');
const PAGES = ['dashboard', 'tous', 'performance', 'academie', 'profil', 'sante', 'montantes'];
const MAX_CLICKS_PER_PAGE = 24;
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

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.jsonl')) return 'application/x-ndjson; charset=utf-8';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.webmanifest')) return 'application/manifest+json';
  return 'application/octet-stream';
}

function startServerIfNeeded() {
  if (process.env.CLICK_AUDIT_BASE_URL) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let url = (req.url || '/').split('?')[0];
      if (url === '/') url = '/pronostics.html';
      const filePath = path.join(ROOT, decodeURIComponent(url));
      if (!filePath.startsWith(ROOT)) {
        res.statusCode = 403;
        return res.end('forbidden');
      }
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
          res.statusCode = 404;
          return res.end('not found');
        }
        res.setHeader('Content-Type', contentType(filePath));
        res.setHeader('Cache-Control', 'no-store');
        fs.createReadStream(filePath).pipe(res);
      });
    });
    server.on('error', err => {
      if (err && err.code === 'EADDRINUSE') return resolve(null);
      reject(err);
    });
    server.listen(PORT, HOST, () => resolve(server));
  });
}

async function markCandidates(page) {
  return page.evaluate(({ selector, skipText, max }) => {
    const skipRe = new RegExp(skipText, 'i');
    const visible = (el) => {
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

(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const server = await startServerIfNeeded();
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const report = { generated_at: new Date().toISOString(), base_url: BASE_URL, pages: [], failures: [] };
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  page.on('popup', popup => popup.close().catch(() => {}));
  await page.addInitScript(() => {
    try {
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.setItem('userPrefs', JSON.stringify({ onboardingDone: true, level: 'confirme', consentLocalStorage: 'accepted' }));
    } catch (e) {}
  });

  for (const hash of PAGES) {
    await page.goto(`${BASE_URL}/pronostics.html#${hash}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(700);
    const baseline = await markCandidates(page);
    const pageRow = { hash, candidates: baseline.length, clicked: 0 };
    report.pages.push(pageRow);
    for (let i = 0; i < baseline.length; i += 1) {
      errors.length = 0;
      await page.goto(`${BASE_URL}/pronostics.html#${hash}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(700);
      const candidates = await markCandidates(page);
      const target = candidates[i];
      if (!target) continue;
      try {
        await page.locator(`[data-click-audit-target="${target.id}"]`).first().click({ timeout: 3500 });
        await page.waitForTimeout(300);
        const realErrors = errors.filter(e => !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e));
        if (target.detail) {
          const opened = await page.locator('#detail-modal.open').isVisible({ timeout: 3000 }).catch(() => false);
          if (!opened) report.failures.push({ hash, target, error: 'detail modal did not open' });
          await page.keyboard.press('Escape').catch(() => {});
        }
        if (realErrors.length) report.failures.push({ hash, target, error: realErrors.join(' | ') });
        pageRow.clicked += 1;
      } catch (err) {
        report.failures.push({ hash, target, error: err.message });
      }
    }
  }

  await browser.close();
  if (server) server.close();
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`Click audit: ${report.pages.reduce((sum, p) => sum + p.clicked, 0)} clicks · ${report.failures.length} failure(s)`);
  console.log(path.relative(ROOT, OUT));
  process.exit(report.failures.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
/*
 * Phase 10 mobile bottom-nav audit.
 * Checks that the fixed mobile nav does not cover actionable page content.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.MOBILE_NAV_AUDIT_PORT || 8765);
const HOST = process.env.MOBILE_NAV_AUDIT_HOST || '127.0.0.1';
const BASE_URL = process.env.MOBILE_NAV_AUDIT_BASE_URL || `http://${HOST}:${PORT}`;
const TAG = process.argv[2] || 'phase10-bottom-nav';
const OUT_DIR = path.join(ROOT, '.cache', TAG);
const OUT_JSON = path.join(ROOT, 'phase10_bottom_nav_audit.json');
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH
  || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '');

const PAGES = [
  'dashboard',
  'tous',
  'performance',
  'academie',
  'profil',
  'sante',
  'montantes',
  'legal',
];

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
  if (process.env.MOBILE_NAV_AUDIT_BASE_URL) return Promise.resolve(null);
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

async function auditPage(page, hash) {
  await page.goto(`${BASE_URL}/pronostics.html#${hash}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForFunction(() => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    return window.scrollY >= maxScroll - 4;
  }, { timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(150);

  const screenshot = path.join(OUT_DIR, `${hash}-mobile-bottom.png`);
  await page.screenshot({ path: screenshot, fullPage: false });

  const metrics = await page.evaluate(() => {
    const nav = document.querySelector('.mobile-bottom-nav');
    const navRect = nav ? nav.getBoundingClientRect() : null;
    const navVisible = !!(navRect && navRect.width > 0 && navRect.height > 0 && getComputedStyle(nav).display !== 'none');
    const ignored = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE']);
    const offenders = [];

    if (navVisible) {
      const nodes = Array.from(document.body.querySelectorAll('*'));
      for (const el of nodes) {
        if (ignored.has(el.tagName)) continue;
        if (el.closest('.mobile-bottom-nav, .toast-stack, .scroll-top-fab, .sidebar, .topbar')) continue;
        if (el.closest('details:not([open])')) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
        if (cs.position === 'fixed' || cs.position === 'sticky') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 16 || r.height < 8) continue;
        if (r.height > innerHeight * 0.55 && !/^(A|BUTTON|SUMMARY|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) continue;
        if (r.bottom > navRect.top + 2 && r.top < navRect.bottom - 2) {
          const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
          offenders.push({
            tag: el.tagName.toLowerCase(),
            className: String(el.className || '').slice(0, 80),
            text,
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
          });
        }
      }
    }

    return {
      url: location.href,
      viewport: { width: innerWidth, height: innerHeight },
      scrollHeight: document.documentElement.scrollHeight,
      scrollY: Math.round(window.scrollY),
      bodyPaddingBottom: getComputedStyle(document.body).paddingBottom,
      nav: navRect ? {
        top: Math.round(navRect.top),
        bottom: Math.round(navRect.bottom),
        height: Math.round(navRect.height),
        visible: navVisible,
      } : null,
      overlapCount: offenders.length,
      offenders: offenders.slice(0, 12),
    };
  });

  return {
    page: hash,
    status: !metrics.nav || !metrics.nav.visible || metrics.overlapCount === 0 ? 'pass' : 'fail',
    screenshot: path.relative(ROOT, screenshot).replace(/\\/g, '/'),
    metrics,
  };
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startServerIfNeeded();
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, isMobile: true });
  const page = await ctx.newPage();
  const report = {
    tag: TAG,
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    viewport: '375x667',
    pages: [],
  };

  for (const hash of PAGES) {
    try {
      const result = await auditPage(page, hash);
      report.pages.push(result);
      console.log(`${result.status === 'pass' ? 'PASS' : 'FAIL'} ${hash} overlaps=${result.metrics.overlapCount}`);
    } catch (err) {
      report.pages.push({ page: hash, status: 'error', error: err.message });
      console.error(`ERROR ${hash}: ${err.message}`);
    }
  }

  await ctx.close();
  await browser.close();
  if (server) server.close();
  report.summary = {
    total: report.pages.length,
    passed: report.pages.filter(p => p.status === 'pass').length,
    failed: report.pages.filter(p => p.status === 'fail').length,
    errors: report.pages.filter(p => p.status === 'error').length,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  if (report.summary.failed || report.summary.errors) process.exitCode = 1;
})();

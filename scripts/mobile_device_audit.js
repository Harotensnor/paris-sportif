#!/usr/bin/env node
/*
 * Phase 12 audit: exercise the 8 hubs on common mobile/tablet devices.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.MOBILE_DEVICE_AUDIT_PORT || 8774);
const HOST = process.env.MOBILE_DEVICE_AUDIT_HOST || '127.0.0.1';
const BASE_URL = process.env.MOBILE_DEVICE_AUDIT_BASE_URL || `http://${HOST}:${PORT}`;
const TAG = process.argv[2] || 'phase12-mobile-devices';
const OUT_DIR = path.join(ROOT, '.cache', TAG);
const OUT_JSON = path.join(ROOT, 'phase12_mobile_device_audit.json');
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH
  || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '');

const PAGES = ['dashboard', 'tous', 'performance', 'academie', 'profil', 'sante', 'montantes', 'legal'];
const DEVICES = [
  { name: 'iphone12', width: 390, height: 844, isMobile: true },
  { name: 'pixel5', width: 393, height: 851, isMobile: true },
  { name: 'galaxyS20', width: 360, height: 800, isMobile: true },
  { name: 'ipadMini', width: 768, height: 1024, isMobile: true },
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
  if (process.env.MOBILE_DEVICE_AUDIT_BASE_URL) return Promise.resolve(null);
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

function cleanErrors(errors) {
  return errors.filter(e => !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e));
}

async function auditPage(page, hash, device) {
  const errors = [];
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  await page.goto(`${BASE_URL}/pronostics.html#${hash}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(900);
  const topShot = path.join(OUT_DIR, `${hash}-${device.name}-top.png`);
  await page.screenshot({ path: topShot, fullPage: false });
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    document.body.style.scrollBehavior = 'auto';
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForTimeout(150);
  const bottomShot = path.join(OUT_DIR, `${hash}-${device.name}-bottom.png`);
  await page.screenshot({ path: bottomShot, fullPage: false });
  const metrics = await page.evaluate(() => {
    const nav = document.querySelector('.mobile-bottom-nav');
    const navRect = nav ? nav.getBoundingClientRect() : null;
    const navVisible = !!(navRect && navRect.width > 0 && navRect.height > 0 && getComputedStyle(nav).display !== 'none');
    const offenders = [];
    if (navVisible) {
      for (const el of Array.from(document.body.querySelectorAll('button,a,input,select,textarea,[role="button"]'))) {
        if (el.closest('.mobile-bottom-nav,.toast-stack,.scroll-top-fab,.topbar')) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') continue;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        if (r.bottom > navRect.top + 2 && r.top < navRect.bottom - 2) {
          offenders.push({
            tag: el.tagName.toLowerCase(),
            text: (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 80),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
          });
        }
      }
    }
    const tapTargets = Array.from(document.body.querySelectorAll('button,a,input,select,textarea,[role="button"]'))
      .filter(el => {
        if (el.closest('.mobile-bottom-nav')) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.width < 40 || r.height < 40);
      })
      .slice(0, 20)
      .map(el => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60),
          width: Math.round(r.width),
          height: Math.round(r.height),
        };
      });
    return {
      hash: location.hash,
      width: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      height: document.documentElement.scrollHeight,
      overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      nav: navRect ? { visible: navVisible, height: Math.round(navRect.height), top: Math.round(navRect.top) } : null,
      navOverlapCount: offenders.length,
      navOverlapSample: offenders.slice(0, 8),
      smallTapTargets: tapTargets,
    };
  });
  return {
    page: hash,
    device: device.name,
    status: metrics.overflowX > 2 || metrics.navOverlapCount > 0 || cleanErrors(errors).length ? 'fail' : 'pass',
    screenshots: {
      top: path.relative(ROOT, topShot).replace(/\\/g, '/'),
      bottom: path.relative(ROOT, bottomShot).replace(/\\/g, '/'),
    },
    metrics,
    consoleErrors: cleanErrors(errors),
  };
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startServerIfNeeded();
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const report = {
    tag: TAG,
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    devices: DEVICES,
    pages: PAGES,
    results: [],
  };
  for (const device of DEVICES) {
    const ctx = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      isMobile: device.isMobile,
      hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      try {
        localStorage.setItem('cookieConsent', 'accepted');
        localStorage.setItem('paris_sportif_onboarded_v1', '1');
        localStorage.setItem('paris_sportif_onboarded_v2', '1');
      } catch (e) {}
    });
    for (const hash of PAGES) {
      try {
        const result = await auditPage(page, hash, device);
        report.results.push(result);
        console.log(`${result.status.toUpperCase()} ${device.name} ${hash} overflow=${result.metrics.overflowX} overlap=${result.metrics.navOverlapCount}`);
      } catch (err) {
        report.results.push({ page: hash, device: device.name, status: 'error', error: err.message });
        console.error(`ERROR ${device.name} ${hash}: ${err.message}`);
      }
    }
    await ctx.close();
  }
  await browser.close();
  if (server) server.close();
  report.summary = {
    total: report.results.length,
    passed: report.results.filter(r => r.status === 'pass').length,
    failed: report.results.filter(r => r.status === 'fail').length,
    errors: report.results.filter(r => r.status === 'error').length,
    maxHeight: Math.max(...report.results.map(r => r.metrics?.height || 0)),
    maxOverflowX: Math.max(...report.results.map(r => r.metrics?.overflowX || 0)),
    pagesWithSmallTapTargets: report.results.filter(r => (r.metrics?.smallTapTargets || []).length > 0).length,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  if (report.summary.failed || report.summary.errors) process.exitCode = 1;
})().catch(err => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env node
/*
 * Phase 6 Lighthouse-compatible audit fallback.
 * The desktop runtime does not ship npm/npx, so this script records local
 * browser performance, SEO and basic a11y signals into Lighthouse-shaped JSON.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.LH_AUDIT_PORT || 8765);
const HOST = process.env.LH_AUDIT_HOST || '127.0.0.1';
const BASE_URL = process.env.LH_AUDIT_BASE_URL || `http://${HOST}:${PORT}`;
const OUT_DIR = path.join(ROOT, '.cache', 'lighthouse-reports');
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH
  || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '');

const PAGES = ['dashboard', 'tous', 'performance', 'academie'];
const PROFILES = [
  { name: 'mobile', viewport: { width: 375, height: 667 }, isMobile: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false },
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
  if (process.env.LH_AUDIT_BASE_URL) return Promise.resolve(null);
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

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function perfScore(metrics) {
  let score = 100;
  score -= Math.max(0, metrics.fcp - 1800) / 35;
  score -= Math.max(0, metrics.load - 3500) / 60;
  score -= metrics.cls * 180;
  score -= Math.max(0, metrics.jsBytes - 5_000_000) / 180_000;
  return Math.round(clamp(score, 0, 100));
}

function ratioScore(total, failures) {
  if (!total) return failures ? 80 : 100;
  return Math.round(clamp(100 - (failures / total) * 100, 0, 100));
}

async function collect(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const paints = Object.fromEntries(performance.getEntriesByType('paint').map(p => [p.name, p.startTime]));
    const resources = performance.getEntriesByType('resource');
    const jsResources = resources
      .filter(r => /\.js(\?|$)/.test(r.name || ''))
      .map(r => ({
        name: (r.name || '').split('/').pop(),
        bytes: Math.round(r.transferSize || r.encodedBodySize || 0),
      }))
      .sort((a, b) => b.bytes - a.bytes);
    const jsBytes = jsResources.reduce((sum, r) => sum + r.bytes, 0);
    const imgs = [...document.images];
    const links = [...document.querySelectorAll('a[href]')];
    const buttons = [...document.querySelectorAll('button,[role="button"]')];
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')].length;
    const h1 = document.querySelectorAll('h1').length;
    const missingAlt = imgs.filter(img => !img.getAttribute('alt')).length;
    const unnamedButtons = buttons.filter(btn => !(btn.textContent || btn.getAttribute('aria-label') || btn.getAttribute('title') || '').trim()).length;
    const badLinks = links.filter(a => !(a.textContent || a.getAttribute('aria-label') || a.getAttribute('title') || '').trim()).length;
    const focusableTiny = [...document.querySelectorAll('button,a,[role="button"],input,select,textarea')]
      .filter(el => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && (r.width < 40 || r.height < 40);
      }).length;
    return {
      title: document.title || '',
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') || '',
      lang: document.documentElement.lang || '',
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
      h1,
      jsonLd,
      images: imgs.length,
      missingAlt,
      buttons: buttons.length,
      unnamedButtons,
      links: links.length,
      badLinks,
      focusableTiny,
      metrics: {
        fcp: Math.round(paints['first-contentful-paint'] || 0),
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd || 0),
        load: Math.round(nav.loadEventEnd || 0),
        transfer: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
        jsBytes,
        jsResources,
        cls: Number(window.__lhCls || 0),
      },
    };
  });
}

async function auditPage(browser, profile, hash) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.isMobile,
    deviceScaleFactor: profile.isMobile ? 2 : 1,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));
  await page.addInitScript(() => {
    window.__lhCls = 0;
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__lhCls += entry.value || 0;
        }
      }).observe({ type: 'layout-shift', buffered: true });
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
    } catch (e) {}
  });
  await page.goto(`${BASE_URL}/pronostics.html#${hash}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const data = await collect(page);
  await context.close();

  const a11yFailures = data.missingAlt + data.unnamedButtons + data.badLinks + data.focusableTiny;
  const seoFailures = [
    data.title.length < 10,
    data.description.length < 50,
    !data.viewport,
    !data.lang,
    data.h1 !== 1,
    data.jsonLd < 1,
  ].filter(Boolean).length;
  const report = {
    lighthouse_compatible: true,
    generated_at: new Date().toISOString(),
    url: `${BASE_URL}/pronostics.html#${hash}`,
    profile: profile.name,
    categories: {
      performance: { score: perfScore(data.metrics) },
      accessibility: { score: ratioScore(data.images + data.buttons + data.links + 1, a11yFailures) },
      'best-practices': { score: consoleErrors.length ? 90 : 100 },
      seo: { score: ratioScore(6, seoFailures) },
    },
    audits: {
      metrics: data.metrics,
      seo: {
        title: data.title,
        description_length: data.description.length,
        viewport: !!data.viewport,
        lang: data.lang,
        canonical: !!data.canonical,
        h1_count: data.h1,
        json_ld_count: data.jsonLd,
      },
      accessibility: {
        images: data.images,
        missing_alt: data.missingAlt,
        buttons: data.buttons,
        unnamed_buttons: data.unnamedButtons,
        links: data.links,
        unnamed_links: data.badLinks,
        small_touch_targets: data.focusableTiny,
      },
      console_errors: consoleErrors.filter(e => !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e)),
    },
    opportunities: [],
  };
  if (data.metrics.load > 3500) report.opportunities.push(`Réduire le temps de chargement (${data.metrics.load}ms).`);
  if (data.metrics.jsBytes > 5_000_000) {
    const top = data.metrics.jsResources.slice(0, 2).map(r => `${r.name} ${Math.round(r.bytes / 1024)}KB`).join(', ');
    report.opportunities.push(`Réduire le JS/data initial (${Math.round(data.metrics.jsBytes / 1024)}KB ; top: ${top}).`);
  }
  if (data.metrics.cls > 0.05) report.opportunities.push(`Stabiliser le layout shift (CLS ${data.metrics.cls.toFixed(3)}).`);
  if (data.focusableTiny) report.opportunities.push(`${data.focusableTiny} cible(s) tactiles sous 40px.`);
  if (data.missingAlt) report.opportunities.push(`${data.missingAlt} image(s) sans alt.`);
  if (data.h1 !== 1) report.opportunities.push(`Corriger le nombre de H1 (${data.h1}).`);
  if (report.audits.console_errors.length) report.opportunities.push(`${report.audits.console_errors.length} erreur(s) console.`);
  return report;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startServerIfNeeded();
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const summary = [];
  for (const profile of PROFILES) {
    for (const hash of PAGES) {
      const report = await auditPage(browser, profile, hash);
      const out = path.join(OUT_DIR, `lh-${profile.name}-${hash}.json`);
      fs.writeFileSync(out, JSON.stringify(report, null, 2));
      summary.push({
        page: hash,
        profile: profile.name,
        performance: report.categories.performance.score,
        accessibility: report.categories.accessibility.score,
        best_practices: report.categories['best-practices'].score,
        seo: report.categories.seo.score,
        opportunities: report.opportunities,
      });
      console.log(`${profile.name}/${hash}: perf ${report.categories.performance.score} · a11y ${report.categories.accessibility.score} · SEO ${report.categories.seo.score}`);
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify({
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    note: 'Fallback Lighthouse-compatible audit because npm/npx lighthouse is unavailable in the desktop runtime.',
    results: summary,
  }, null, 2));
  await browser.close();
  if (server) server.close();
  const minPerf = Math.min(...summary.map(r => r.performance));
  const minA11y = Math.min(...summary.map(r => r.accessibility));
  const minSeo = Math.min(...summary.map(r => r.seo));
  console.log(`Summary: min perf ${minPerf} · min a11y ${minA11y} · min SEO ${minSeo}`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});

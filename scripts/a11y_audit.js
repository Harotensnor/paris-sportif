#!/usr/bin/env node
/*
 * Phase 6 a11y audit.
 * Axe-compatible local runner for the desktop runtime where @axe-core/cli is
 * unavailable. Produces a11y-report.json with critical/serious/moderate items.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'a11y-report.json');
const PORT = Number(process.env.A11Y_AUDIT_PORT || 8765);
const HOST = process.env.A11Y_AUDIT_HOST || '127.0.0.1';
const BASE_URL = process.env.A11Y_AUDIT_BASE_URL || `http://${HOST}:${PORT}`;
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH
  || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '');
const PAGES = ['dashboard', 'tous', 'performance', 'academie', 'profil', 'sante', 'montantes', 'legal'];
const VIEWPORT = { width: 375, height: 667 };

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
  if (process.env.A11Y_AUDIT_BASE_URL) return Promise.resolve(null);
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

async function auditPage(page) {
  return page.evaluate(() => {
    const violations = [];
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
    };
    const nodeLabel = (el) => {
      const id = el.id ? `#${el.id}` : '';
      const cls = String(el.className || '').split(/\s+/).filter(Boolean).slice(0, 2).map(c => `.${c}`).join('');
      return `${el.tagName.toLowerCase()}${id}${cls}`;
    };
    const push = (impact, rule, message, el) => {
      violations.push({
        impact,
        rule,
        message,
        target: el ? nodeLabel(el) : 'document',
        text: el ? (el.textContent || el.getAttribute('aria-label') || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 120) : '',
      });
    };
    const rgb = (value) => {
      const m = String(value || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?\)/);
      if (!m) return null;
      if (m[4] !== undefined && Number(m[4]) < 0.1) return null;
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    };
    const luminance = ([r, g, b]) => {
      const f = v => {
        const n = v / 255;
        return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const contrast = (a, b) => {
      const l1 = luminance(a);
      const l2 = luminance(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    const bgColor = (el) => {
      let cur = el;
      while (cur && cur !== document.documentElement) {
        const c = rgb(getComputedStyle(cur).backgroundColor);
        if (c) return c;
        cur = cur.parentElement;
      }
      return rgb(getComputedStyle(document.body).backgroundColor) || [10, 10, 10];
    };

    if (!document.documentElement.lang) push('serious', 'html-has-lang', 'Le document doit déclarer une langue.', document.documentElement);
    if (!document.title || document.title.trim().length < 8) push('serious', 'document-title', 'Le titre de page est absent ou trop court.', document.querySelector('title'));
    const h1s = [...document.querySelectorAll('h1')].filter(visible);
    if (h1s.length !== 1) push('moderate', 'page-has-heading-one', `La page expose ${h1s.length} H1 visibles.`, h1s[0] || document.body);

    [...document.images].filter(visible).forEach(img => {
      if (!img.hasAttribute('alt')) push('moderate', 'image-alt', 'Image visible sans attribut alt.', img);
    });
    [...document.querySelectorAll('button,[role="button"],a[href]')].filter(visible).forEach(el => {
      const name = (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
      if (!name) push('serious', 'interactive-name', 'Élément interactif sans nom accessible.', el);
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) push('moderate', 'target-size', `Cible tactile ${Math.round(r.width)}x${Math.round(r.height)}px.`, el);
      if (el.getAttribute('role') === 'button' && !el.hasAttribute('tabindex') && el.tagName.toLowerCase() !== 'button') {
        push('serious', 'button-focusable', 'Élément role=button non focusable au clavier.', el);
      }
    });

    const directTextEls = [...document.querySelectorAll('body *')].filter(el => {
      if (!visible(el)) return false;
      const text = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim();
      return text.length >= 2;
    }).slice(0, 800);
    let contrastCount = 0;
    directTextEls.forEach(el => {
      if (contrastCount >= 30) return;
      const cs = getComputedStyle(el);
      const fg = rgb(cs.color);
      const bg = bgColor(el);
      if (!fg || !bg) return;
      const ratio = contrast(fg, bg);
      const fontSize = parseFloat(cs.fontSize) || 14;
      const required = fontSize >= 18 || Number(cs.fontWeight) >= 700 ? 3 : 4.5;
      if (ratio < required) {
        contrastCount += 1;
        push('serious', 'color-contrast', `Contraste ${ratio.toFixed(2)}:1 sous ${required}:1.`, el);
      }
    });
    return violations;
  });
}

(async () => {
  const server = await startServerIfNeeded();
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const report = {
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    note: 'Axe-compatible fallback because @axe-core/cli is unavailable in the desktop runtime.',
    pages: [],
    totals: { critical: 0, serious: 0, moderate: 0, minor: 0 },
  };
  for (const hash of PAGES) {
    const context = await browser.newContext({ viewport: VIEWPORT, isMobile: true, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.addInitScript(() => {
      try {
        localStorage.setItem('cookieConsent', 'accepted');
        localStorage.setItem('paris_sportif_onboarded_v1', '1');
        localStorage.setItem('paris_sportif_onboarded_v2', '1');
      } catch (e) {}
    });
    await page.goto(`${BASE_URL}/pronostics.html#${hash}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 9000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const violations = await auditPage(page);
    const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    violations.forEach(v => { counts[v.impact] = (counts[v.impact] || 0) + 1; });
    Object.keys(report.totals).forEach(k => { report.totals[k] += counts[k] || 0; });
    report.pages.push({ hash, url: `${BASE_URL}/pronostics.html#${hash}`, counts, violations: violations.slice(0, 80) });
    console.log(`${hash}: critical ${counts.critical} · serious ${counts.serious} · moderate ${counts.moderate}`);
    await context.close();
  }
  await browser.close();
  if (server) server.close();
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`a11y report: ${path.relative(ROOT, OUT)} · critical ${report.totals.critical} · serious ${report.totals.serious} · moderate ${report.totals.moderate}`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});

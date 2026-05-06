#!/usr/bin/env node
/*
 * Smoke test E2E pour pronostics.html.
 *
 * Ouvre chaque page principale, clique toutes les nav buttons, capte
 * les `window.error` + `unhandledrejection` + console.error. Fait échouer
 * si la moindre erreur JS est remontée. Le but : bloquer les régressions
 * type TDZ (cf. bug accueil v28.10 où _dataIsStale était utilisé avant
 * sa déclaration) AVANT qu'elles n'arrivent en prod.
 *
 * Dépendances : playwright (installé par le workflow).
 * Usage local : `npx playwright install chromium && node scripts/smoke_e2e.js`.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.SMOKE_PORT || 0);
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH
  || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '');

const PAGES = [
  'dashboard', 'top', 'locks', 'combines', 'buteurs',
  'matchs', 'performance', 'valeur', 'favoris', 'sante',
  'academie', 'profil', 'backtest', 'alertes', 'historique',
];

// --- Minimal static server ---
function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js'))   return 'text/javascript; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.jsonl')) return 'application/x-ndjson; charset=utf-8';
  if (file.endsWith('.css'))  return 'text/css; charset=utf-8';
  if (file.endsWith('.svg'))  return 'image/svg+xml';
  if (file.endsWith('.png'))  return 'image/png';
  if (file.endsWith('.webmanifest')) return 'application/manifest+json';
  return 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let url = req.url.split('?')[0];
      if (url === '/') url = '/index.html';
      const filePath = path.join(ROOT, decodeURIComponent(url));
      if (!filePath.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) { res.statusCode = 404; return res.end('not found'); }
        res.setHeader('Content-Type', contentType(filePath));
        res.setHeader('Cache-Control', 'no-store');
        fs.createReadStream(filePath).pipe(res);
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

(async () => {
  const server = await startServer();
  const actualPort = server.address().port;
  console.log(`[smoke] server on http://127.0.0.1:${actualPort}`);
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const failures = [];
  page.on('pageerror', err => failures.push({ phase: 'pageerror', msg: err.message, stack: err.stack }));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore harmless "Failed to load resource" when a sidecar is missing locally.
      if (/Failed to load resource/i.test(text) && /404/.test(text)) return;
      // Ignore network-layer cert/dns errors from external domains (ESPN logos,
      // ClubElo, Sofascore) — these depend on the runner's outbound network,
      // not on the app under test.
      if (/Failed to load resource/i.test(text) && /ERR_(CERT|NAME_NOT_RESOLVED|TIMED_OUT|CONNECTION_(REFUSED|RESET|CLOSED)|FAILED|EMPTY_RESPONSE)/i.test(text)) return;
      failures.push({ phase: 'console.error', msg: text });
    }
  });
  page.on('crash', () => failures.push({ phase: 'crash', msg: 'page crashed' }));

  await page.goto(`http://127.0.0.1:${actualPort}/pronostics.html`, { waitUntil: 'domcontentloaded' });
  // Dismiss onboarding modal if present
  await page.evaluate(() => {
    const ign = Array.from(document.querySelectorAll('button,a')).find(b => /ignorer/i.test(b.textContent || ''));
    if (ign) ign.click();
  });
  await page.waitForTimeout(300);

  // Click each page and wait a tick
  for (const p of PAGES) {
    const before = failures.length;
    const found = await page.evaluate(pageName => {
      const btn = document.querySelector(`.page-btn[data-page="${pageName}"]`);
      if (!btn) return 'no-btn';
      btn.click();
      return 'clicked';
    }, p);
    if (found === 'no-btn') {
      console.log(`[skip] ${p} — nav button not found`);
      continue;
    }
    await page.waitForTimeout(250);
    const newErrs = failures.slice(before);
    const tag = newErrs.length ? `FAIL (${newErrs.length} errs)` : 'ok';
    console.log(`[${tag}] ${p}`);
  }

  await page.evaluate(() => {
    const btn = document.querySelector('.page-btn[data-page="dashboard"]');
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);
  // Data freshness gate: when running on a feature branch, the checked-out
  // data.js can be hours old. Several downstream UI sections (Terminal Value,
  // Sante guard) only render with current-day data. Detect stale data and
  // soft-skip the data-dependent checks instead of producing flake.
  const dataAgeMin = await page.evaluate(() => {
    try {
      const ts = window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.generated_at;
      if (!ts) return Infinity;
      return Math.round((Date.now() - new Date(ts).getTime()) / 60000);
    } catch (e) { return Infinity; }
  });
  const dataIsFresh = dataAgeMin <= 240; // 4h budget
  console.log(`[info] data age = ${Number.isFinite(dataAgeMin) ? dataAgeMin + 'min' : 'unknown'} (${dataIsFresh ? 'fresh' : 'stale, data-dependent checks skipped'})`);
  const terminalText = await page.evaluate(() => document.querySelector('.terminal-market')?.innerText || '');
  const terminalMatch = terminalText.match(/(\d+)\s+marchés scorés\s+·\s+(\d+)\s+matchs exacts sur 48h/i);
  if (!terminalMatch) {
    if (dataIsFresh) {
      failures.push({ phase: 'terminal-value', msg: 'Terminal Value 48h summary missing' });
    }
  } else if (Number(terminalMatch[2]) <= 0 && dataIsFresh) {
    failures.push({ phase: 'terminal-value', msg: `Terminal Value sees ${terminalMatch[2]} exact matches on 48h` });
  }
  console.log(`[${terminalMatch ? 'ok' : (dataIsFresh ? 'FAIL' : 'skip')}] terminal value 48h = ${terminalMatch ? terminalMatch[0] : 'missing'}`);

  await page.waitForFunction(() => !!window.__backtestReportV2, null, { timeout: 5000 }).catch(() => {});
  const sportGuard = await page.evaluate(() => {
    const cold = Object.entries(window.__backtestReportV2?.by_sport || {})
      .find(([, d]) => d && d.n >= 10 && d.flat_roi_pct < -10);
    if (!cold) return { checked: false };
    const [sport] = cold;
    const guard = window._sportRoiGuard?.(
      { sport },
      { rel: 0.55, odd: 2.00, ev: 0.10, investment: { score: 60 } }
    );
    return { checked: true, sport, blocked: !!guard?.blocked, note: guard?.note || '' };
  });
  if (sportGuard.checked && !sportGuard.blocked) {
    failures.push({ phase: 'sport-roi-guard', msg: `Cold sport ${sportGuard.sport} was not blocked` });
  }
  console.log(`[${!sportGuard.checked || sportGuard.blocked ? 'ok' : 'FAIL'}] sport ROI guard = ${sportGuard.checked ? `${sportGuard.sport} blocked` : 'no cold sport'}`);

  await page.evaluate(() => document.querySelector('.page-btn[data-page="sante"]')?.click());
  await page.waitForTimeout(300);
  const santeGuardVisible = await page.evaluate(() => {
    const wrap = document.querySelector('#sante-wrap');
    const txt = (wrap?.innerText || '').toLowerCase();
    const html = wrap?.innerHTML || '';
    return txt.includes('garde-fou roi sport') || html.includes('Garde-fou ROI sport');
  });
  if (!santeGuardVisible && dataIsFresh) {
    failures.push({ phase: 'sante', msg: 'Sport ROI guard section missing on Sante page' });
  }
  console.log(`[${santeGuardVisible ? 'ok' : (dataIsFresh ? 'FAIL' : 'skip')}] sante sport ROI guard visible`);

  // Responsive smoke at 375×812
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(200);
  const overflow = await page.evaluate(() => {
    document.querySelector('.page-btn[data-page="dashboard"]').click();
    return document.documentElement.scrollWidth - document.documentElement.clientWidth;
  });
  if (overflow > 2) {
    failures.push({ phase: 'responsive', msg: `dashboard overflows by ${overflow}px on 375 viewport` });
  }
  console.log(`[${overflow > 2 ? 'FAIL' : 'ok'}] mobile overflow = ${overflow}px`);

  await browser.close();
  server.close();

  if (failures.length) {
    console.error(`\n[smoke] ${failures.length} failure(s):`);
    for (const f of failures) {
      console.error(` - [${f.phase}] ${f.msg}${f.stack ? '\n     ' + f.stack.split('\n').slice(0, 3).join('\n     ') : ''}`);
    }
    process.exit(1);
  }
  console.log('\n[smoke] all green');
})().catch(err => {
  console.error('[smoke] runner crashed:', err);
  process.exit(2);
});

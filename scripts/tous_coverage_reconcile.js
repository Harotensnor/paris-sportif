#!/usr/bin/env node
/*
 * Phase 12 coverage reconciliation.
 * Compares night_metrics.json, active PRONOSTICS_DATA and the #tous UI.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.TOUS_RECONCILE_PORT || 8782);
const HOST = process.env.TOUS_RECONCILE_HOST || '127.0.0.1';
const BASE_URL = process.env.TOUS_RECONCILE_BASE_URL || `http://${HOST}:${PORT}`;
const OUT_CACHE = path.join(ROOT, '.cache', 'tous-coverage-reconciliation.json');
const OUT_TRACKED = path.join(ROOT, 'phase12_tous_coverage_reconciliation.json');
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH
  || (fs.existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '');

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.jsonl')) return 'application/x-ndjson; charset=utf-8';
  if (file.endsWith('.webmanifest')) return 'application/manifest+json';
  return 'application/octet-stream';
}

function startServerIfNeeded() {
  if (process.env.TOUS_RECONCILE_BASE_URL) return Promise.resolve(null);
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

function readJsonSafe(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return null; }
}

(async () => {
  fs.mkdirSync(path.dirname(OUT_CACHE), { recursive: true });
  const server = await startServerIfNeeded();
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));
  await page.addInitScript(() => {
    try {
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.setItem('tousPreset', 'all');
      localStorage.removeItem('tousVisibleLimit');
      localStorage.setItem('userPrefs', JSON.stringify({ onboardingDone: true, level: 'confirme', consentLocalStorage: 'accepted' }));
    } catch (e) {}
  });

  await page.goto(`${BASE_URL}/pronostics.html#tous`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(() => window.PRONOSTICS_DATA && !window.PRONOSTICS_DATA._lite, { timeout: 14000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const beforeLoadMore = await page.evaluate(() => ({
    visibleRows: document.querySelectorAll('#tous-wrap .tous-row').length,
    loadMore: document.querySelector('[data-tous-load-more]')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    counter: document.querySelector('#tous-wrap [aria-live="polite"]')?.textContent?.replace(/\s+/g, ' ').trim() || '',
  }));

  for (let i = 0; i < 8; i += 1) {
    const btn = await page.$('[data-tous-load-more]');
    if (!btn) break;
    await btn.click();
    await page.waitForTimeout(120);
  }

  const ui = await page.evaluate(() => {
    const data = window.PRONOSTICS_DATA || {};
    const now = Date.now();
    const days = data.days || {};
    const all = Object.values(days).flatMap(arr => Array.isArray(arr) ? arr : []);
    const isFinal = m => Boolean(m && (m.completed || /FINAL|STATUS_FINAL|FT/i.test(String(m.status || ''))));
    const tsOf = m => new Date(m && m.date).getTime();
    const isUpcoming = m => {
      const ts = tsOf(m);
      return Number.isFinite(ts) && ts > now - 60000 && !isFinal(m);
    };
    const isWinamax = m => Boolean(m && m.winamax && m.winamax.available === true);
    const idOf = m => String(m?.id || m?.event_id || m?.match_id || `${m?.home_team || ''}-${m?.away_team || ''}-${m?.date || ''}`);
    const upcoming = all.filter(isUpcoming);
    const upcomingWinamax = upcoming.filter(isWinamax);
    const rows = [...document.querySelectorAll('#tous-wrap .tous-row')];
    const rowIds = rows.map(row => row.getAttribute('data-event-id') || row.getAttribute('data-match-id') || row.dataset.eventId || '').filter(Boolean);
    const rowText = rows.map(row => (row.textContent || '').replace(/\s+/g, ' ').trim());
    const missing = upcomingWinamax.filter(m => !rowText.some(txt => {
      const home = String(m.home_team || m.home || m.team_home || '').trim();
      const away = String(m.away_team || m.away || m.team_away || '').trim();
      return home && away && txt.includes(home) && txt.includes(away);
    })).slice(0, 20).map(m => ({
      id: idOf(m),
      sport: m.sport || 'unknown',
      league: m.league_name || m.league || '',
      home: m.home_team || m.home || '',
      away: m.away_team || m.away || '',
      date: m.date || '',
    }));
    return {
      data_generated_at: data.generated_at || null,
      data_counts: {
        events_all_days: all.length,
        upcoming_all_days: upcoming.length,
        upcoming_winamax: upcomingWinamax.length,
      },
      ui_counts: {
        rendered_rows_after_load_more: rows.length,
        row_ids_detected: rowIds.length,
        counter: document.querySelector('#tous-wrap [aria-live="polite"]')?.textContent?.replace(/\s+/g, ' ').trim() || '',
        load_more_remaining: document.querySelector('[data-tous-load-more]')?.textContent?.replace(/\s+/g, ' ').trim() || '',
      },
      missing_sample: missing,
      sample_rows: rowText.slice(0, 8),
    };
  });

  const nightMetrics = readJsonSafe(path.join(ROOT, 'night_metrics.json')) || {};
  const nightUpcoming = Number(nightMetrics?.events?.upcoming || 0);
  const dataUpcoming = Number(ui.data_counts.upcoming_winamax || 0);
  const rendered = Number(ui.ui_counts.rendered_rows_after_load_more || 0);
  const activeDelta = dataUpcoming - rendered;
  const report = {
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    night_metrics: {
      generated_at: nightMetrics.generated_at || null,
      events_total: nightMetrics?.events?.total ?? null,
      events_upcoming: nightUpcoming || null,
      winamax_exact_ratio: nightMetrics?.events?.winamax_exact_ratio ?? null,
    },
    page_tous: {
      before_load_more: beforeLoadMore,
      after_load_more: ui.ui_counts,
    },
    active_data: ui.data_counts,
    reconciliation: {
      night_vs_active_upcoming_delta: nightUpcoming ? nightUpcoming - dataUpcoming : null,
      active_upcoming_vs_rendered_delta: activeDelta,
      coverage_ratio_rendered_vs_active: dataUpcoming ? Number((rendered / dataUpcoming).toFixed(4)) : null,
      status: dataUpcoming > 0 && rendered >= Math.min(200, dataUpcoming) && activeDelta <= 1 ? 'ok' : 'warn',
      explanation: nightUpcoming && Math.abs(nightUpcoming - dataUpcoming) > 10
        ? 'night_metrics est plus ancien que la data active; la validation doit se faire contre window.PRONOSTICS_DATA chargée.'
        : 'night_metrics et la data active sont proches.',
    },
    missing_sample: activeDelta <= 1 ? [] : ui.missing_sample,
    sample_rows: ui.sample_rows,
    console_errors: consoleErrors.filter(e => !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e)),
  };
  fs.writeFileSync(OUT_CACHE, JSON.stringify(report, null, 2));
  fs.writeFileSync(OUT_TRACKED, JSON.stringify(report, null, 2));
  console.log(`coverage=${rendered}/${dataUpcoming} status=${report.reconciliation.status} night_delta=${report.reconciliation.night_vs_active_upcoming_delta}`);
  await browser.close();
  if (server) server.close();
  if (report.reconciliation.status !== 'ok' || report.console_errors.length) process.exitCode = 1;
})().catch(err => {
  console.error(err);
  process.exit(1);
});

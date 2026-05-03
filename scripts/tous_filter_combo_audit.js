#!/usr/bin/env node
/*
 * Phase 12 audit: verify Page Tous filter combinations keep healthy coverage.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.TOUS_FILTER_AUDIT_PORT || 8772);
const HOST = process.env.TOUS_FILTER_AUDIT_HOST || '127.0.0.1';
const BASE_URL = process.env.TOUS_FILTER_AUDIT_BASE_URL || `http://${HOST}:${PORT}`;
const OUT = path.join(ROOT, '.cache', 'tous-filter-combo-audit.json');
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
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  if (file.endsWith('.webmanifest')) return 'application/manifest+json';
  return 'application/octet-stream';
}

function startServerIfNeeded() {
  if (process.env.TOUS_FILTER_AUDIT_BASE_URL) return Promise.resolve(null);
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

(async () => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const server = await startServerIfNeeded();
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  await page.addInitScript(() => {
    try {
      localStorage.setItem('cookieConsent', 'accepted');
      localStorage.setItem('paris_sportif_onboarded_v1', '1');
      localStorage.setItem('paris_sportif_onboarded_v2', '1');
      localStorage.removeItem('tousFilters');
      localStorage.removeItem('tousPreset');
      localStorage.removeItem('tousSort');
      localStorage.setItem('tousFilterMode', 'winamax');
    } catch (e) {}
  });
  await page.goto(`${BASE_URL}/pronostics.html#tous`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => !!(window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days), null, { timeout: 10000 });
  await page.waitForFunction(() => !!(window.PRONOSTICS_DATA && !window.PRONOSTICS_DATA._lite), null, { timeout: 12000 }).catch(() => {});
  await page.waitForSelector('#tous-wrap .tous-row', { timeout: 10000 }).catch(() => {});

  const summary = await page.evaluate(() => {
    const now = Date.now();
    const days = window.PRONOSTICS_DATA?.days || {};
    const events = Object.values(days).flat().filter(Boolean);
    const isSettled = (m) => Boolean(m && (m.completed || (typeof window._isMatchEffectivelyDone === 'function' && window._isMatchEffectivelyDone(m))));
    const isUpcoming = (m) => {
      const ts = new Date(m && m.date).getTime();
      return Number.isFinite(ts) && ts >= now - 60000 && !isSettled(m);
    };
    const winamax = events.filter(m => m?.winamax?.available === true);
    const upcoming = winamax.filter(isUpcoming);
    const sports = [...new Set(upcoming.map(m => m.sport || 'other'))].sort();
    const sportsToTest = sports.filter(s => ['football', 'tennis', 'basketball', 'baseball', 'hockey'].includes(s)).concat(
      sports.filter(s => !['football', 'tennis', 'basketball', 'baseball', 'hockey'].includes(s)).slice(0, 3)
    );
    const oddMins = [1.30, 1.50, 2.00, 2.50, 3.00];
    const markets = ['all', '1n2', 'ou25', 'btts', 'exactScore', 'basketTotal', 'hockeyTotal', 'baseballTotal', 'tennisGames'];
    const marketLabels = {
      all: 'Tous marches', '1n2': 'Vainqueur', ou25: 'Over/Under 2.5', btts: 'BTTS',
      exactScore: 'Score exact', basketTotal: 'Basket total', hockeyTotal: 'Hockey total',
      baseballTotal: 'Baseball total', tennisGames: 'Tennis jeux',
    };
    const normMarket = (value) => String(value || '').trim();
    const candidateRows = [];
    const seen = new Set();
    for (const match of upcoming) {
      let pred = null;
      try { pred = typeof window.predictMatch === 'function' ? window.predictMatch(match) : null; } catch (e) {}
      const candidates = [];
      const oneNtwo = match?.winamax?.markets?.['1n2'];
      if (oneNtwo) {
        [
          ['home', oneNtwo.home],
          ['draw', oneNtwo.draw],
          ['away', oneNtwo.away],
        ].forEach(([side, odd]) => {
          if (Number(odd) > 1) candidates.push({ market: '1n2', side, odd: Number(odd) });
        });
      }
      try {
        if (typeof window.buildMarketCandidates === 'function') {
          candidates.push(...(window.buildMarketCandidates(match, pred, { requireExact: false }) || []));
        }
      } catch (e) {}
      if (!candidates.length && pred?.pick) {
        candidates.push({
          market: '1n2',
          odd: Number(pred.odds?.[pred.pick.key === '1' ? 'home' : pred.pick.key === '2' ? 'away' : 'draw'] || 0),
        });
      }
      for (const c of candidates) {
        const odd = Number(c.odd || c.odds || 0);
        const market = normMarket(c.market || c.type || 'unknown');
        const key = `${match.id}|${market}|${odd}`;
        if (!seen.has(key)) {
          seen.add(key);
          candidateRows.push({ sport: match.sport || 'other', market, odd });
        }
      }
    }
    const combos = [];
    const zeroCombos = [];
    for (const sport of sportsToTest) {
      for (const oddMin of oddMins) {
        for (const market of markets) {
          const eventCount = upcoming.filter(m => (m.sport || 'other') === sport).length;
          const candidateCount = market === 'all'
            ? candidateRows.filter(c => c.sport === sport && c.odd >= oddMin).length
            : candidateRows.filter(c => c.sport === sport && c.market === market && c.odd >= oddMin).length;
          const count = market === 'all' && oddMin <= 1.30 ? eventCount : candidateCount;
          const row = { sport, oddMin, market, marketLabel: marketLabels[market] || market, eventCount, candidateCount, count };
          combos.push(row);
          if (count === 0) zeroCombos.push(row);
        }
      }
    }
    const wrapText = document.querySelector('#tous-wrap')?.innerText || '';
    const ui = {
      visibleRows: document.querySelectorAll('#tous-wrap .tous-row').length,
      counterText: wrapText.split(/\n+/).find(t => /matchs?.*(détectés|detectes)/i.test(t)) || '',
      emptyStateVisible: !!document.querySelector('#tous-wrap .empty-state-v2'),
    };
    const validMarketsBySport = {
      football: ['all', '1n2', 'ou25', 'btts', 'exactScore'],
      tennis: ['all', '1n2', 'tennisGames'],
      basketball: ['all', '1n2', 'basketTotal'],
      hockey: ['all', '1n2', 'hockeyTotal'],
      baseball: ['all', '1n2', 'baseballTotal'],
    };
    const suspiciousZeroCombos = zeroCombos.filter(row => (
      (validMarketsBySport[row.sport] || ['all', '1n2']).includes(row.market)
      && row.oddMin <= 2
      && row.eventCount > 0
    ));
    const marketCoverage = markets.map(market => ({
      market,
      label: marketLabels[market] || market,
      candidates: market === 'all' ? candidateRows.length : candidateRows.filter(c => c.market === market).length,
    }));
    return {
      generated_at: new Date().toISOString(),
      totalEvents: events.length,
      winamaxEvents: winamax.length,
      upcomingWinamax: upcoming.length,
      sportsTested: sportsToTest,
      oddMins,
      markets,
      ui,
      combosTotal: combos.length,
      zeroCombosTotal: zeroCombos.length,
      zeroCombosSample: zeroCombos.slice(0, 40),
      suspiciousZeroCombos,
      marketCoverage,
      worstSports: sportsToTest.map(sport => ({
        sport,
        events: upcoming.filter(m => (m.sport || 'other') === sport).length,
        candidateRows: candidateRows.filter(c => c.sport === sport).length,
      })),
    };
  });

  await page.goto(`${BASE_URL}/pronostics.html?zero_state=1#tous?sport=football&edge=0.99&conf=0.99&odd=99&preset=bigbets`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.waitForFunction(() => !!(window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.days), null, { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(() => !!(window.PRONOSTICS_DATA && !window.PRONOSTICS_DATA._lite), null, { timeout: 12000 }).catch(() => {});
  await page.waitForSelector('#tous-wrap .empty-state-v2', { timeout: 10000 }).catch(() => {});
  const uiZeroState = await page.evaluate(() => {
    const txt = document.querySelector('#tous-wrap .empty-state-v2')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    return { friendly: /Aucun match|Aucun pari|Vider les filtres|Voir demain/i.test(txt), text: txt.slice(0, 240) };
  });
  summary.uiZeroState = uiZeroState;
  summary.consoleErrors = errors.filter(e => !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e));

  await browser.close();
  if (server) server.close();
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log(`Tous filter combo audit: ${summary.combosTotal} combos · ${summary.zeroCombosTotal} zero combos · ${summary.ui.visibleRows} visible rows`);
  console.log(path.relative(ROOT, OUT));
  process.exit(summary.consoleErrors.length ? 1 : 0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});

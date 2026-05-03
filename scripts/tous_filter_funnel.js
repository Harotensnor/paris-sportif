#!/usr/bin/env node
/*
 * Phase 12 funnel diagnostic for #tous.
 * Quantifies where upcoming matches disappear before reaching the UI.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.TOUS_FUNNEL_PORT || 8765);
const HOST = process.env.TOUS_FUNNEL_HOST || '127.0.0.1';
const BASE_URL = process.env.TOUS_FUNNEL_BASE_URL || `http://${HOST}:${PORT}`;
const OUT_CACHE = path.join(ROOT, '.cache', 'tous-filter-funnel.json');
const OUT_TRACKED = path.join(ROOT, 'phase12_tous_filter_funnel.json');
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
  if (process.env.TOUS_FUNNEL_BASE_URL) return Promise.resolve(null);
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
  fs.mkdirSync(path.dirname(OUT_CACHE), { recursive: true });
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
      localStorage.setItem('userPrefs', JSON.stringify({ onboardingDone: true, level: 'confirme', consentLocalStorage: 'accepted' }));
      localStorage.removeItem('tousFilters');
      localStorage.removeItem('tousFilterMode');
      localStorage.removeItem('tousSort');
      localStorage.removeItem('tousTab');
    } catch (e) {}
  });

  await page.goto(`${BASE_URL}/pronostics.html#tous`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const report = await page.evaluate(() => {
    const data = window.PRONOSTICS_DATA || {};
    const now = Date.now();
    const todayIso = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const days = data.days || {};
    const flatten = Object.values(days).flatMap(arr => Array.isArray(arr) ? arr : []);
    const getTs = m => new Date(m && m.date).getTime();
    const isUpcoming = m => {
      const ts = getTs(m);
      if (!Number.isFinite(ts)) return false;
      if (m && (m.completed || /FINAL|STATUS_FINAL|FT/i.test(String(m.status || '')))) return false;
      return ts > now - 60000;
    };
    const isStarted = m => {
      const ts = getTs(m);
      return Number.isFinite(ts) && ts < now - 60000 && !(m && m.completed);
    };
    const isWinamax = m => Boolean(m && m.winamax && m.winamax.available === true);
    const hasOddsLike = m => Boolean(
      (m && m.odds && Object.keys(m.odds || {}).length)
      || (m && m.odds_snapshot)
      || (m && m.winamax && (m.winamax.home || m.winamax.draw || m.winamax.away || m.winamax.odds))
    );
    const sportCounts = (items) => items.reduce((acc, m) => {
      const sport = (m && m.sport) || 'other';
      acc[sport] = (acc[sport] || 0) + 1;
      return acc;
    }, {});
    const today = Array.isArray(days[todayIso]) ? days[todayIso] : [];
    const todayWinamax = today.filter(isWinamax);
    const allUpcoming = flatten.filter(isUpcoming);
    const allUpcomingWinamax = allUpcoming.filter(isWinamax);
    const todayUpcomingWinamax = todayWinamax.filter(isUpcoming);

    const predicted = {
      input_today_winamax: todayWinamax.length,
      no_pred: 0,
      no_pick: 0,
      skip: 0,
      no_odd_non_settled: 0,
      completed_no_odd: 0,
      kept_all_picks: 0,
      kept_pending_before_value: 0,
      kept_pending_after_value_edge_gte_minus_2pt: 0,
      kept_inprogress_after_value_edge_gte_minus_2pt: 0,
      kept_finished: 0,
    };
    const pickRows = [];
    todayWinamax.forEach(m => {
      let pred = null;
      try { pred = typeof window.predictMatch === 'function' ? window.predictMatch(m) : null; } catch (e) {}
      if (!pred) { predicted.no_pred += 1; return; }
      if (!pred.pick) { predicted.no_pick += 1; return; }
      if (pred.skip) { predicted.skip += 1; return; }
      const pk = pred.pick.key;
      const odd = pred.odds && (pk === '1' ? pred.odds.home : pk === '2' ? pred.odds.away : pred.odds.draw);
      const settled = Boolean(m.completed || /FINAL|STATUS_FINAL|FT/i.test(String(m.status || '')));
      if (!odd) {
        if (settled) predicted.completed_no_odd += 1;
        else predicted.no_odd_non_settled += 1;
        return;
      }
      const rel = pred.reliability ?? pred.pick.prob;
      const edge = rel - 1 / odd;
      const startedAndNotSettled = isStarted(m);
      predicted.kept_all_picks += 1;
      if (!settled && !startedAndNotSettled) predicted.kept_pending_before_value += 1;
      if (!settled && !startedAndNotSettled && edge >= -0.02) predicted.kept_pending_after_value_edge_gte_minus_2pt += 1;
      if (startedAndNotSettled && edge >= -0.02) predicted.kept_inprogress_after_value_edge_gte_minus_2pt += 1;
      if (settled) predicted.kept_finished += 1;
      pickRows.push({
        id: String(m.id || ''),
        sport: m.sport || 'other',
        league: m.league_name || '',
        kickoff: m.date || '',
        odd: Number(odd.toFixed ? odd.toFixed(3) : odd),
        rel: Number(rel.toFixed ? rel.toFixed(4) : rel),
        edge: Number(edge.toFixed ? edge.toFixed(4) : edge),
        pick: pred.pick.label || pred.pick.key || '',
      });
    });

    const dom = {
      header_text: (document.querySelector('#tous-wrap h1')?.textContent || '').trim(),
      subheader_text: (document.querySelector('#tous-wrap h1 + div')?.textContent || '').replace(/\s+/g, ' ').trim(),
      visible_rows: document.querySelectorAll('#tous-wrap .tous-row').length,
      active_tab_text: [...document.querySelectorAll('#tous-wrap [data-tous-tab]')]
        .map(btn => (btn.textContent || '').replace(/\s+/g, ' ').trim()),
      result_chip_text: (document.querySelector('#tous-wrap .tous-filter-bar [aria-live="polite"]')?.textContent || '').trim(),
      source_select_value: document.querySelector('#tous-wrap [data-tous-mode]')?.value || null,
      stray_comment_text_visible: Boolean((document.querySelector('#tous-wrap')?.textContent || '').includes('immédiatement combien')),
    };

    const steps = [
      { step: 'events_all_days', count: flatten.length },
      { step: 'upcoming_all_days', count: allUpcoming.length },
      { step: 'upcoming_all_days_winamax_available', count: allUpcomingWinamax.length },
      { step: 'today_events_only', count: today.length },
      { step: 'today_winamax_available', count: todayWinamax.length },
      { step: 'today_winamax_upcoming', count: todayUpcomingWinamax.length },
      { step: 'predictMatch_kept_actionable_rows', count: predicted.kept_all_picks },
      { step: 'pending_before_value_filter', count: predicted.kept_pending_before_value },
      { step: 'pending_after_edge_gte_minus_2pt', count: predicted.kept_pending_after_value_edge_gte_minus_2pt },
      { step: 'dom_visible_rows_active_tab', count: dom.visible_rows },
    ];
    const drops = [];
    for (let i = 1; i < steps.length; i += 1) {
      drops.push({
        from: steps[i - 1].step,
        to: steps[i].step,
        lost: steps[i - 1].count - steps[i].count,
        remaining: steps[i].count,
      });
    }
    drops.sort((a, b) => b.lost - a.lost);

    return {
      generated_at: new Date().toISOString(),
      page: '#tous',
      data_generated_at: data.generated_at || null,
      todayIso,
      counts: {
        all_events_all_days: flatten.length,
        upcoming_all_days: allUpcoming.length,
        upcoming_all_days_with_any_odds: allUpcoming.filter(hasOddsLike).length,
        upcoming_all_days_winamax_available: allUpcomingWinamax.length,
        today_events: today.length,
        today_winamax_available: todayWinamax.length,
        today_winamax_upcoming: todayUpcomingWinamax.length,
      },
      sport_counts: {
        upcoming_all_days: sportCounts(allUpcoming),
        today_winamax: sportCounts(todayWinamax),
      },
      predicted,
      funnel_steps: steps,
      largest_drops: drops,
      dom,
      sample_rows: pickRows.slice(0, 12),
      diagnosis: [
        "La page Tous ne lit que data.days[todayIso], pas les 7 jours à venir.",
        "La page Tous transforme les matchs en picks via predictMatch puis cache pred.skip, no_pick et les matchs sans cote exploitable.",
        "La liste À venir applique ensuite un filtre value edge >= -2pt, donc elle ne représente pas la couverture brute.",
        "Pour corriger la couverture, le preset Tout voir doit afficher des lignes de matchs bruts all-days sans filtre edge/confiance.",
      ],
    };
  });

  report.console_errors = errors.filter(e => !/favicon|sourcemap|Failed to load resource|net::ERR_ABORTED|40\d/i.test(e));
  report.base_url = BASE_URL;
  await browser.close();
  if (server) server.close();
  fs.writeFileSync(OUT_CACHE, JSON.stringify(report, null, 2));
  fs.writeFileSync(OUT_TRACKED, JSON.stringify(report, null, 2));
  const finalCount = report.dom && report.dom.visible_rows;
  console.log(`Tous funnel: ${report.counts.upcoming_all_days} upcoming all-days → ${finalCount} visible row(s)`);
  console.log(path.relative(ROOT, OUT_CACHE));
  console.log(path.relative(ROOT, OUT_TRACKED));
})().catch(err => {
  console.error(err);
  process.exit(1);
});

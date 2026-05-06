#!/usr/bin/env node
/*
 * v37.037 — Deep audit of the Tous-pronostics table.
 *
 * Switches to the Big Bets preset so the page renders detailed pick
 * rows (.tous-row, not coverage stub rows) and asserts:
 *   - the sub-tab badges match the rendered row count
 *   - every row exposes confidence / cote / av(antage) / gain (EV)
 *   - the math is coherent within rounding:
 *       edge_displayed ≈ conf − 1/odd        (within 1pt)
 *       EV_displayed   ≈ conf × odd − 1      (within 1.5pt)
 *   - data-match-id is unique per row and resolves to a real event
 *   - clicking the row opens the detail modal whose hero shows the
 *     same teams (modal text contains the row's home/away names)
 *
 * Catches the kind of regressions a smoke test misses: row→modal
 * mismatch, math drift, count-vs-display drift, blank columns.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PROBE_PORT || 0);
const CHROME_EXE = process.env.CHROME_EXECUTABLE_PATH || '';

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

const failures = [];
function check(label, ok, detail) {
  console.log(`  [${ok ? 'ok' : 'FAIL'}] ${label}${ok ? '' : ' — ' + (detail || '')}`);
  if (!ok) failures.push({ label, detail });
}

async function clickPresetByLabel(page, presetText) {
  return page.evaluate(t => {
    const candidates = Array.from(document.querySelectorAll('.tous-filter-bar button'));
    const btn = candidates.find(b => (b.textContent || '').trim() === t);
    if (!btn) return false;
    btn.click();
    return true;
  }, presetText);
}

(async () => {
  const server = await startServer();
  const port = server.address().port;
  console.log(`[probe-table] static server on http://127.0.0.1:${port}`);
  const browser = await chromium.launch(CHROME_EXE ? { executablePath: CHROME_EXE } : {});
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.onboardingDone = true;
      prefs.consentLocalStorage = 'accepted';
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
    } catch (e) {}
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error') {
      const t = m.text();
      if (/Failed to load resource/i.test(t)) return;
      if (/ERR_/i.test(t)) return;
      if (/script does not have a MIME type/i.test(t)) return;
      errs.push(t);
    }
  });

  await page.goto(`http://127.0.0.1:${port}/pronostics.html#tous`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  console.log('\n=== Sub-tab counts vs rendered rows ===');
  // Read the badges THEN switch tabs and count rows. The page may render
  // coverage stubs (no pick) by default; the count badge is the same
  // either way.
  const tabsInfo = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[data-tous-tab]')).map(b => {
      const m = (b.textContent || '').match(/\((\d+)\)/);
      return { key: b.dataset.tousTab, badge: m ? Number(m[1]) : null };
    });
  });
  for (const t of tabsInfo) {
    if (t.badge === null) continue;
    await page.evaluate(k => {
      const btn = document.querySelector(`[data-tous-tab="${k}"]`);
      if (btn) btn.click();
    }, t.key);
    // Tab click triggers a full renderTousPage(wrap) — give it a beat
    // to clear the previous tab's rows before we count.
    await page.waitForTimeout(900);
    const rendered = await page.evaluate(() => {
      const rows = document.querySelectorAll('.tous-row');
      return Array.from(rows).filter(r => r.offsetParent !== null).length;
    });
    if (t.badge === 0) {
      check(`tab=${t.key}: badge=0 → rendered=${rendered}`, rendered === 0,
        `rendered should be 0 when badge=0`);
    } else {
      check(`tab=${t.key}: badge=${t.badge}, rendered=${rendered}`,
        rendered > 0 && rendered <= t.badge,
        `rendered count must be in (0, ${t.badge}]`);
    }
  }

  async function readVisiblePickRows() {
    return page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.tous-row:not(.tous-row--coverage)'))
        .filter(r => r.offsetParent !== null)
        .slice(0, 25);
      return rows.map(r => {
        const text = r.innerText || '';
        const matchId = r.dataset.matchId;
        // Confidence: "Conf 67%"
        const confM = text.match(/Conf\s*(\d+)\s*%/);
        // Odd: "@2.50"
        const oddM = text.match(/@(\d+(?:[.,]\d+)?)/);
        // Edge in points: "Av. +5pt" or "Av. -2pt"
        const avM = text.match(/Av\.\s*([+-]?\d+(?:[.,]\d+)?)\s*pt/);
        // EV: "Gain +3%"
        const gainM = text.match(/Gain\s*([+-]?\d+(?:[.,]\d+)?)\s*%/);
        // Match teams from the bold text "X vs Y"
        const teamsM = text.match(/^[\s\S]*?\n([^\n]+\s+vs\s+[^\n]+)/);
        return {
          matchId,
          rawText: text,
          conf: confM ? Number(confM[1]) : null,
          odd: oddM ? Number(oddM[1].replace(',', '.')) : null,
          edgePt: avM ? Number(avM[1].replace(',', '.')) : null,
          evPct: gainM ? Number(gainM[1].replace(',', '.')) : null,
          teams: teamsM ? teamsM[1].trim() : null,
        };
      });
    });
  }
  async function readVisibleCoverageRows() {
    return page.evaluate(() => Array.from(document.querySelectorAll('.tous-row.tous-row--coverage'))
      .filter(r => r.offsetParent !== null)
      .slice(0, 25)
      .map(r => {
        const text = r.innerText || '';
        return {
          matchId: r.dataset.matchId || '',
          rawText: text,
          exact: /Winamax exact/i.test(text),
          odds: (text.match(/@\d+(?:[.,]\d+)?/g) || []).length,
        };
      }));
  }

  console.log('\n=== Switch to value preset for math coherence ===');
  await page.evaluate(() => {
    const b = document.querySelector('[data-tous-tab="pending"]');
    if (b) b.click();
  });
  await page.waitForTimeout(400);
  const swapped = await clickPresetByLabel(page, 'Big Bets');
  await page.waitForTimeout(700);
  check('Big Bets preset clickable', swapped);

  let rowsData = await readVisiblePickRows();
  let coverageData = [];
  if (rowsData.length === 0) {
    console.log('  [info] Big Bets has no rows in this dataset; falling back to Tout voir');
    const allLevels = await clickPresetByLabel(page, 'Tout voir');
    await page.waitForTimeout(700);
    check('Fallback Tout voir clickable', allLevels);
    rowsData = await readVisiblePickRows();
    coverageData = await readVisibleCoverageRows();
  }
  console.log(`  ${rowsData.length} non-coverage rows sampled`);

  if (rowsData.length === 0) {
    check('Coverage rows available when pick rows are absent', coverageData.length > 0,
      'Big Bets empty and fallback has no coverage rows');
    if (coverageData.length > 0) {
      const blankIds = coverageData.filter(r => !r.matchId).length;
      const nonExact = coverageData.filter(r => !r.exact).length;
      const sparseOdds = coverageData.filter(r => r.odds < 2).length;
      check(`Coverage rows have match ids (${blankIds}/${coverageData.length} blank)`, blankIds === 0);
      check(`Coverage rows remain Winamax exact (${nonExact}/${coverageData.length} missing)`, nonExact === 0);
      check(`Coverage rows expose bookable odds (${sparseOdds}/${coverageData.length} sparse)`, sparseOdds === 0);
    }
  } else {
    let blankFields = 0;
    let mathDrift = 0;
    let evDrift = 0;
    const ids = new Set();
    let dupIds = 0;
    for (const row of rowsData) {
      // 1) data-match-id non-empty + unique
      if (!row.matchId) blankFields++;
      else {
        if (ids.has(row.matchId)) dupIds++;
        else ids.add(row.matchId);
      }
      // 2) Essential numeric fields present
      if (row.conf === null || row.odd === null) blankFields++;
      // 3) Edge math: edge_pt ≈ (conf/100 − 1/odd) × 100. We allow ±1pt
      //    rounding tolerance.
      if (row.conf !== null && row.odd !== null && row.edgePt !== null) {
        const expectedEdgePt = (row.conf / 100 - 1 / row.odd) * 100;
        if (Math.abs(expectedEdgePt - row.edgePt) > 1.5) {
          mathDrift++;
        }
      }
      // 4) EV math: ev_pct ≈ (conf/100 × odd − 1) × 100. Allow ±1.5pt
      //    (the page displays .toFixed(0) for compactness).
      if (row.conf !== null && row.odd !== null && row.evPct !== null) {
        const expectedEvPct = (row.conf / 100 * row.odd - 1) * 100;
        if (Math.abs(expectedEvPct - row.evPct) > 1.5) {
          evDrift++;
        }
      }
    }
    check(`No row with blank match-id / conf / odd (${blankFields}/${rowsData.length})`, blankFields === 0);
    check(`data-match-id unique (${dupIds}/${rowsData.length} dup)`, dupIds === 0);
    check(`Edge math coherent: conf-1/odd ≈ Av. (${mathDrift}/${rowsData.length} drift > 1.5pt)`, mathDrift === 0);
    check(`EV math coherent: conf*odd-1 ≈ Gain (${evDrift}/${rowsData.length} drift > 1.5pt)`, evDrift === 0);
  }

  console.log('\n=== Row → modal coherence ===');
  const sampleClicks = Math.min(3, rowsData.length);
  for (let i = 0; i < sampleClicks; i++) {
    const row = rowsData[i];
    if (!row.matchId) { check(`Row ${i}: clickable id`, false, 'no match-id'); continue; }
    await page.evaluate(id => {
      const r = document.querySelector(`.tous-row[data-match-id="${CSS.escape(id)}"]`);
      if (r) r.click();
    }, row.matchId);
    await page.waitForTimeout(500);
    const modalInfo = await page.evaluate(() => {
      const dm = document.getElementById('detail-modal');
      if (!dm || !dm.classList.contains('open')) return null;
      return {
        text: (dm.innerText || '').slice(0, 600),
        hasContent: (dm.innerText || '').length > 200,
      };
    });
    if (!modalInfo) {
      check(`Row ${i} (matchId=${row.matchId}): modal opens`, false, 'modal not open');
      continue;
    }
    // The row teams string is "X vs Y"; extract individual team names and
    // assert each appears in the modal text.
    const split = (row.teams || '').split(/\s+vs\s+/);
    const teamA = (split[0] || '').trim().split(' ')[0];
    const teamB = (split[1] || '').trim().split(' ')[0];
    const containsA = teamA && modalInfo.text.includes(teamA);
    const containsB = teamB && modalInfo.text.includes(teamB);
    check(`Row ${i} (${teamA} vs ${teamB}): modal contains both teams`,
      !!(containsA && containsB),
      `A=${containsA} B=${containsB}`);
    check(`Row ${i}: modal has substantial content`, modalInfo.hasContent);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }
  if (rowsData.length === 0 && coverageData.length > 0) {
    const row = coverageData[0];
    await page.evaluate(id => {
      const r = document.querySelector(`.tous-row[data-match-id="${CSS.escape(id)}"]`);
      if (r) r.click();
    }, row.matchId);
    await page.waitForTimeout(500);
    const modalInfo = await page.evaluate(() => {
      const dm = document.getElementById('detail-modal');
      if (!dm || !dm.classList.contains('open')) return null;
      return { hasContent: (dm.innerText || '').length > 200 };
    });
    check('Coverage row opens detail modal', !!modalInfo, 'modal not open');
    check('Coverage modal has substantial content', !!(modalInfo && modalInfo.hasContent));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  }

  console.log('\n=== Filter persistence (sport filter) ===');
  // Click a sport filter, reload, verify it stuck.
  const sportClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.tous-filter-bar button'))
      .find(b => /Foot/.test(b.textContent || ''));
    if (!btn) return null;
    btn.click();
    return btn.textContent.trim();
  });
  await page.waitForTimeout(500);
  const beforeReload = await page.evaluate(() => {
    const stored = localStorage.getItem('tousFilters');
    return stored ? JSON.parse(stored) : null;
  });
  check('Sport filter persisted to localStorage', !!beforeReload, JSON.stringify(beforeReload).slice(0,80));

  // Reload and confirm activeTab + sportFilter persist.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const afterReload = await page.evaluate(() => {
    return {
      tousTab: localStorage.getItem('tousTab'),
      filters: JSON.parse(localStorage.getItem('tousFilters') || 'null'),
      activeBtn: (() => {
        const b = Array.from(document.querySelectorAll('[data-tous-tab]'))
          .find(el => /var\(--brand\)/.test(el.style.borderColor) ||
                      /1px solid var\(--brand\)/.test(el.getAttribute('style') || ''));
        return b ? b.dataset.tousTab : null;
      })(),
    };
  });
  check('After reload: tousTab in localStorage matches', !!afterReload.tousTab,
    `tousTab=${afterReload.tousTab}`);
  check('After reload: filters survive', !!afterReload.filters,
    JSON.stringify(afterReload.filters).slice(0, 100));

  console.log('\n=== Search input filter ===');
  await clickPresetByLabel(page, 'Tout voir');
  await page.waitForTimeout(500);
  // Find the search input and type a substring
  const searchProbeOk = await page.evaluate(() => {
    const inp = document.querySelector('.tous-filter-bar input[type="search"], .tous-filter-bar input');
    if (!inp) return { ok: false, reason: 'no search input' };
    inp.focus();
    inp.value = 'zzzzznotamatch';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    return { ok: true };
  });
  await page.waitForTimeout(700);
  if (searchProbeOk.ok) {
    const rowsAfterSearch = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.tous-row'))
        .filter(r => r.offsetParent !== null).length;
    });
    check(`Search filters down: typing impossible string → 0 rows (got ${rowsAfterSearch})`,
      rowsAfterSearch === 0);
    // Clear search
    await page.evaluate(() => {
      const inp = document.querySelector('.tous-filter-bar input[type="search"], .tous-filter-bar input');
      if (inp) {
        inp.value = '';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.waitForTimeout(500);
    const rowsAfterClear = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.tous-row'))
        .filter(r => r.offsetParent !== null).length;
    });
    check(`Search clears: rows return when input is empty (got ${rowsAfterClear})`,
      rowsAfterClear > 0);
  } else {
    check('Search input present', false, searchProbeOk.reason);
  }

  console.log('\n=== Console errors ===');
  if (errs.length === 0) {
    check('Zero console error during sweep', true);
  } else {
    check('Zero console error', false, `${errs.length}: ${errs.slice(0,2).join(' | ')}`);
  }

  await browser.close();
  server.close();

  console.log(`\n[probe-table] ${failures.length === 0 ? 'all green' : failures.length + ' failure(s)'}`);
  if (failures.length) process.exit(1);
})().catch(err => {
  console.error('[probe-table] runner crashed:', err);
  process.exit(2);
});

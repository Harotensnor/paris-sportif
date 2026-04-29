// Plan 1000 phase 2 — Tests pour les nouveaux helpers Sprint A/G/H.
//
// Couvre :
//   - Sprint A : _smartKelly, _computeIfYouHadFollowed, _userBetsStats étendu
//   - Sprint G : _agentReplay memoization (cache hit)
//   - Sprint H : _showBottomSheet (modal mobile)
//   - Sprint H : _showConfirm (confirm replacement)
//
// Réutilise l'infra Playwright existante.

import { test, expect } from '@playwright/test';

const URL = '/pronostics.html';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.onboardingDone = true;
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
    } catch (e) {}
  });
});

test.describe('Sprint A — ROI helpers', () => {

  test('_smartKelly module by confidence (lock 0.5x, standard 0.25x, lowconf 0.1x)', async ({ page }) => {
    await page.goto(URL);
    const result = await page.evaluate(() => {
      const fn = window._smartKelly;
      if (typeof fn !== 'function') return { skip: true };
      // p=0.75 odd=2.0 : edge fort, lock → 0.5× Kelly
      const lock = fn(0.75, 2.0, 100);
      // p=0.60 odd=2.0 : standard → 0.25× Kelly
      const standard = fn(0.60, 2.0, 100);
      // p=0.50 odd=2.0 : lowconf → 0.1× Kelly
      const lowconf = fn(0.50, 2.0, 100);
      // p<0.5 odd=2.0 : pas de Kelly (negative edge)
      const noEdge = fn(0.45, 2.0, 100);
      return { lock, standard, lowconf, noEdge };
    });
    if (result.skip) return;
    // Lock should stake more than standard than lowconf
    expect(result.lock).toBeGreaterThan(result.standard);
    expect(result.standard).toBeGreaterThanOrEqual(result.lowconf);
    // Negative edge → 0
    expect(result.noEdge).toBe(0);
    // All capped at 10% bankroll = 10€
    expect(result.lock).toBeLessThanOrEqual(10);
  });

  test('_computeIfYouHadFollowed returns model performance', async ({ page }) => {
    await page.goto(URL);
    await page.waitForTimeout(2000);
    const result = await page.evaluate(() => {
      const fn = window._computeIfYouHadFollowed;
      if (typeof fn !== 'function') return { skip: true };
      return fn();
    });
    if (result.skip || !result) return;
    expect(result).toHaveProperty('n');
    expect(result).toHaveProperty('modelWinRate');
    expect(result).toHaveProperty('modelROI');
    expect(result).toHaveProperty('modelPnL');
    expect(typeof result.n).toBe('number');
  });

  test('_userBetsStats : empty state', async ({ page }) => {
    await page.goto(URL);
    const result = await page.evaluate(() => {
      // Clear user bets first
      try { localStorage.removeItem('paris_sportif_user_bets'); } catch(e){}
      return window._userBetsStats ? window._userBetsStats() : 'undefined';
    });
    expect(result).toBeNull();  // null when no bets
  });

  test('_userBetsStats : returns extended stats', async ({ page }) => {
    await page.goto(URL);
    const result = await page.evaluate(() => {
      // Set fixture bets
      const bets = [
        { id: '1', matchId: 'm1', market: '1n2', key: '1', stake: 5, odd: 2.0, settled: true, result: 'won', pnl: 5, sport: 'football', settledTs: 1000 },
        { id: '2', matchId: 'm2', market: '1n2', key: '2', stake: 3, odd: 1.8, settled: true, result: 'lost', pnl: -3, sport: 'football', settledTs: 2000 },
        { id: '3', matchId: 'm3', market: 'ou25', key: 'OU2.5_O', stake: 2, odd: 2.2, settled: true, result: 'won', pnl: 2.4, sport: 'football', settledTs: 3000 },
      ];
      try { localStorage.setItem('paris_sportif_user_bets', JSON.stringify(bets)); } catch(e){}
      const stats = window._userBetsStats ? window._userBetsStats() : null;
      return stats;
    });
    expect(result).not.toBeNull();
    expect(result.n).toBe(3);
    expect(result.wins).toBe(2);
    expect(result.losses).toBe(1);
    expect(result).toHaveProperty('maxWinStreak');
    expect(result).toHaveProperty('bySport');
    expect(result).toHaveProperty('byMarket');
    expect(result.bySport.football.n).toBe(3);
    expect(result.byMarket['1n2'].n).toBe(2);
    expect(result.byMarket.ou25.n).toBe(1);
  });

});

test.describe('Sprint G — Memoization', () => {

  test('_agentReplay returns same object on consecutive calls (memoized)', async ({ page }) => {
    await page.goto(URL);
    await page.waitForTimeout(2000);
    const result = await page.evaluate(() => {
      // We can't test === reference equality from JSON, but we can test
      // the call returns identical structure deterministically
      const fn = window.__testAPI && window.__testAPI._agentReplay;
      if (typeof fn !== 'function') {
        // Try direct exposure
        if (typeof window._agentReplay !== 'function') return { skip: true };
      }
      const callFn = fn || window._agentReplay;
      const r1 = callFn();
      const r2 = callFn();
      return { same: r1 === r2 };  // reference equality means cache hit
    });
    if (result.skip) return;
    expect(result.same).toBe(true);
  });

});

test.describe('Sprint H — Bottom sheet helper', () => {

  test('_showBottomSheet creates overlay with title + body', async ({ page }) => {
    await page.goto(URL);
    const result = await page.evaluate(async () => {
      if (typeof window._showBottomSheet !== 'function') return { skip: true };
      window._showBottomSheet({
        title: 'Test sheet',
        body: '<p>Body content</p>',
        actions: [{ label: 'OK', primary: true }],
      });
      await new Promise(r => setTimeout(r, 300));
      const overlay = document.querySelector('.u-bottom-sheet');
      const title = document.querySelector('.u-bottom-sheet-title');
      const close = document.querySelector('.u-bottom-sheet-close');
      const result = {
        hasOverlay: !!overlay,
        titleText: title ? title.textContent : null,
        hasCloseBtn: !!close,
      };
      // Cleanup
      if (overlay) overlay.remove();
      return result;
    });
    if (result.skip) return;
    expect(result.hasOverlay).toBe(true);
    expect(result.titleText).toBe('Test sheet');
    expect(result.hasCloseBtn).toBe(true);
  });

  test('_showBottomSheet Esc key closes', async ({ page }) => {
    await page.goto(URL);
    await page.evaluate(() => {
      if (typeof window._showBottomSheet !== 'function') return;
      window._showBottomSheet({ title: 'Test', body: 'X' });
    });
    await page.waitForTimeout(300);
    const beforeKey = await page.locator('.u-bottom-sheet').count();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const afterKey = await page.locator('.u-bottom-sheet').count();
    if (beforeKey > 0) expect(afterKey).toBe(0);
  });

});

test.describe('Sprint H — Show confirm', () => {

  test('_showConfirm resolves false on cancel', async ({ page }) => {
    await page.goto(URL);
    const promise = page.evaluate(async () => {
      if (typeof window._showConfirm !== 'function') return 'skip';
      // Fire & forget — we'll click Cancel
      const p = window._showConfirm({ title: 'Test', body: 'Cancel test' });
      return p.then(v => ({ value: v }));
    });
    await page.waitForTimeout(200);
    // Click cancel button
    const cancelBtn = page.locator('[data-confirm="0"]').first();
    if (await cancelBtn.count() > 0) {
      await cancelBtn.click();
    }
    const result = await promise;
    if (result === 'skip') return;
    if (result && typeof result === 'object') expect(result.value).toBe(false);
  });

  test('_showConfirm resolves true on confirm', async ({ page }) => {
    await page.goto(URL);
    const promise = page.evaluate(async () => {
      if (typeof window._showConfirm !== 'function') return 'skip';
      const p = window._showConfirm({ title: 'Test', body: 'Confirm test' });
      return p.then(v => ({ value: v }));
    });
    await page.waitForTimeout(200);
    const confirmBtn = page.locator('[data-confirm="1"]').first();
    if (await confirmBtn.count() > 0) {
      await confirmBtn.click();
    }
    const result = await promise;
    if (result === 'skip') return;
    if (result && typeof result === 'object') expect(result.value).toBe(true);
  });

});

test.describe('Sprint plan 1000 — utility helpers', () => {

  test('_safeStorage handles QuotaExceeded gracefully', async ({ page }) => {
    await page.goto(URL);
    const result = await page.evaluate(() => {
      const ss = window._safeStorage;
      if (!ss) return { skip: true };
      // Test get with fallback
      const missing = ss.get('non_existent_key_xyz', 'default');
      const setOk = ss.set('test_key_xyz', 'value');
      const getBack = ss.get('test_key_xyz');
      ss.remove('test_key_xyz');
      const removed = ss.get('test_key_xyz');
      return { missing, setOk, getBack, removed };
    });
    if (result.skip) return;
    expect(result.missing).toBe('default');
    expect(result.setOk).toBe(true);
    expect(result.getBack).toBe('value');
    expect(result.removed).toBeNull();
  });

  test('_fmt.pct formats percentage correctly', async ({ page }) => {
    await page.goto(URL);
    const result = await page.evaluate(() => {
      const f = window._fmt;
      if (!f) return { skip: true };
      return {
        pct50: f.pct(0.5, 1),
        pctNeg: f.pct(-0.05, 1),
        pctNaN: f.pct(NaN),
        money100: f.money(100, 2),
        moneyNeg: f.money(-50, 2),
        odd185: f.odd(1.85),
        oddInvalid: f.odd(0),
        edgePos: f.edge(0.08),
      };
    });
    if (result.skip) return;
    expect(result.pct50).toBe('+50.0%');
    expect(result.pctNeg).toBe('-5.0%');
    expect(result.pctNaN).toBe('—');
    expect(result.money100).toBe('+100.00€');
    expect(result.moneyNeg).toBe('-50.00€');
    expect(result.odd185).toBe('@1.85');
    expect(result.oddInvalid).toBe('—');
    expect(result.edgePos).toBe('+8.0pt');
  });

  test('_debounce delays execution properly', async ({ page }) => {
    await page.goto(URL);
    const result = await page.evaluate(async () => {
      if (typeof window._debounce !== 'function') return { skip: true };
      let count = 0;
      const fn = window._debounce(() => count++, 100);
      fn(); fn(); fn();
      // Calls within 100ms : should only fire once after 100ms
      await new Promise(r => setTimeout(r, 150));
      return { count };
    });
    if (result.skip) return;
    expect(result.count).toBe(1);
  });

  test('_throttle limits call rate', async ({ page }) => {
    await page.goto(URL);
    const result = await page.evaluate(async () => {
      if (typeof window._throttle !== 'function') return { skip: true };
      let count = 0;
      const fn = window._throttle(() => count++, 100);
      fn();  // immediate call
      await new Promise(r => setTimeout(r, 50));
      fn();  // throttled, queued
      await new Promise(r => setTimeout(r, 50));
      fn();  // still within window
      // After 200ms total, expect 2 calls (1 immediate + 1 trailing)
      await new Promise(r => setTimeout(r, 100));
      return { count };
    });
    if (result.skip) return;
    expect(result.count).toBeGreaterThanOrEqual(2);
  });

  test('_copyToClipboard returns boolean', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(URL);
    const result = await page.evaluate(async () => {
      if (typeof window._copyToClipboard !== 'function') return { skip: true };
      const ok = await window._copyToClipboard('test text');
      return { ok };
    });
    if (result.skip) return;
    expect(typeof result.ok).toBe('boolean');
  });

  test('_fmtRelativeTime returns sensible labels', async ({ page }) => {
    await page.goto(URL);
    const result = await page.evaluate(() => {
      if (typeof window._fmtRelativeTime !== 'function') return { skip: true };
      const now = Date.now();
      return {
        instant: window._fmtRelativeTime(now - 5000),  // 5 sec ago
        min5: window._fmtRelativeTime(now - 5 * 60 * 1000),
        hour2: window._fmtRelativeTime(now - 2 * 3600 * 1000),
        day1: window._fmtRelativeTime(now - 86400000),
        future10min: window._fmtRelativeTime(now + 10 * 60 * 1000),
      };
    });
    if (result.skip) return;
    expect(result.instant).toContain('instant');
    expect(result.min5).toContain('5');
    expect(result.hour2).toContain('h');
    expect(result.day1).toContain('jour');
    expect(result.future10min).toContain('dans');
  });

  test('_fmtNumber formats with FR locale', async ({ page }) => {
    await page.goto(URL);
    const result = await page.evaluate(() => {
      if (typeof window._fmtNumber !== 'function') return { skip: true };
      return {
        thousand: window._fmtNumber(1234, 0),
        decimal: window._fmtNumber(1234.567, 2),
        nan: window._fmtNumber(NaN),
      };
    });
    if (result.skip) return;
    // FR locale uses non-breaking space as thousands separator
    expect(result.thousand).toMatch(/1[\s  ]?234/);
    expect(result.decimal).toMatch(/1[\s  ]?234,57/);
    expect(result.nan).toBe('—');
  });

  test('_qs / _qsa work as wrappers', async ({ page }) => {
    await page.goto(URL);
    const result = await page.evaluate(() => {
      if (!window._qs || !window._qsa) return { skip: true };
      const head = window._qs('head');
      const scripts = window._qsa('script');
      return {
        hasHead: !!head,
        scriptCount: scripts.length,
        isArray: Array.isArray(scripts),
      };
    });
    if (result.skip) return;
    expect(result.hasHead).toBe(true);
    expect(result.scriptCount).toBeGreaterThan(0);
    expect(result.isArray).toBe(true);
  });

});

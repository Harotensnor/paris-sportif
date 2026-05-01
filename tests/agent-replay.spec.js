// Tier 2 #3 (2026-05-01) — Tests _agentReplay invariants.
//
// _agentReplay() rejoue l'historique des paris scorables avec Kelly 0.25×
// cap 10% plancher 0.10€, et renvoie : { nav, series, scorableRaw, ydayStats,
// perSport7d, start, delta7, deltaPct7 }.
//
// Tests ici vérifient les INVARIANTS structurels (le retour est cohérent),
// pas les valeurs exactes (qui dépendent de la data live).
import { test, expect } from '@playwright/test';

const URL = '/pronostics.html';

test.describe('_agentReplay — invariants structurels', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    await page.waitForFunction(
      () => window.__testAPI && typeof window.__testAPI._agentReplay === 'function',
      { timeout: 15000 }
    );
  });

  test('returns object with required keys', async ({ page }) => {
    const result = await page.evaluate(() => {
      const r = window.__testAPI._agentReplay();
      if (!r) return { ok: false, reason: 'null' };
      return {
        ok: true,
        keys: Object.keys(r).sort(),
        nav: typeof r.nav,
        series: Array.isArray(r.series),
        start: typeof r.start,
        delta7: typeof r.delta7,
      };
    });
    expect(result.ok).toBe(true);
    expect(result.keys).toEqual(expect.arrayContaining(['nav', 'series', 'start']));
    expect(result.nav).toBe('number');
    expect(result.series).toBe(true);
    expect(result.start).toBe('number');
  });

  test('nav is finite and >= 0', async ({ page }) => {
    const result = await page.evaluate(() => {
      const r = window.__testAPI._agentReplay();
      return { nav: r?.nav, finite: isFinite(r?.nav) };
    });
    expect(result.finite).toBe(true);
    expect(result.nav).toBeGreaterThanOrEqual(0);
  });

  test('series array contains valid {t, nav} entries', async ({ page }) => {
    const result = await page.evaluate(() => {
      const r = window.__testAPI._agentReplay();
      const series = r?.series || [];
      const allValid = series.every(p => typeof p.t !== 'undefined' && typeof p.nav === 'number' && isFinite(p.nav));
      return { count: series.length, allValid };
    });
    expect(result.allValid).toBe(true);
  });

  test('idempotent (same call → same result)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const a = window.__testAPI._agentReplay();
      const b = window.__testAPI._agentReplay();
      const sameNav = Math.abs((a?.nav || 0) - (b?.nav || 0)) < 0.001;
      const sameSeriesLen = (a?.series?.length || 0) === (b?.series?.length || 0);
      return { sameNav, sameSeriesLen };
    });
    expect(result.sameNav).toBe(true);
    expect(result.sameSeriesLen).toBe(true);
  });

  test('start is reasonable (1-100€ range)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const r = window.__testAPI._agentReplay();
      return { start: r?.start };
    });
    expect(result.start).toBeGreaterThanOrEqual(1);
    expect(result.start).toBeLessThanOrEqual(100);
  });
});

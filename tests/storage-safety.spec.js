import { test, expect } from '@playwright/test';

test.describe('storage safety', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pronostics.html#dashboard');
    await page.waitForFunction(
      () => window.__testAPI
        && typeof window.__testAPI.safeLocalStorageJson === 'function'
        && typeof window._toggleBookmark === 'function'
        && typeof window._loadWatchlist === 'function'
        && typeof window._loadAlertRules === 'function',
      undefined,
      { timeout: 15000 }
    );
  });

  test('corrupted user storage falls back without crashing', async ({ page }) => {
    const out = await page.evaluate(() => {
      localStorage.setItem('paris_sportif_bookmarks', '{bad');
      localStorage.setItem('paris_sportif_watchlist', '{bad');
      localStorage.setItem('paris_sportif_alert_rules', '{bad');
      localStorage.setItem('paris_sportif_v36_home_filter', '{bad');
      return {
        safeFallback: window.__testAPI.safeLocalStorageJson('paris_sportif_bookmarks', ['fallback']),
        bookmarksBefore: window._loadBookmarks(),
        toggled: window._toggleBookmark('match-1'),
        bookmarksAfter: window._loadBookmarks(),
        watchlist: window._loadWatchlist(),
        alertRules: window._loadAlertRules(),
      };
    });

    expect(out.safeFallback).toEqual(['fallback']);
    expect(out.bookmarksBefore).toEqual([]);
    expect(out.toggled).toBe(true);
    expect(out.bookmarksAfter).toEqual(['match-1']);
    expect(out.watchlist).toEqual({ teams: [], leagues: [], sports: [], markets: [] });
    expect(out.alertRules).toEqual([]);
  });
});

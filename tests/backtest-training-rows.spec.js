import { test, expect } from '@playwright/test';

test('backtest training rows are coherent and visible to learned weights', async ({ page }) => {
  const summaryResponse = await page.request.get('/backtest_training_rows_summary.json');
  expect(summaryResponse.ok()).toBe(true);
  const summary = await summaryResponse.json();
  expect(summary.schema).toBe('paris-sportif.backtest_training_rows.v1');
  expect(summary.rows).toBeGreaterThan(0);
  expect(summary.positive_rows).toBeGreaterThan(0);
  expect(summary.positive_rows).toBeLessThan(summary.rows);

  const rowsResponse = await page.request.get('/backtest_training_rows.jsonl');
  expect(rowsResponse.ok()).toBe(true);
  const lines = (await rowsResponse.text()).trim().split('\n').filter(Boolean);
  expect(lines.length).toBe(summary.rows);

  for (const line of lines.slice(0, 20)) {
    const row = JSON.parse(line);
    expect(row.market).toBe('1n2');
    expect(['home', 'draw', 'away']).toContain(row.pick_side);
    expect(row.odd).toBeGreaterThan(1);
    expect(row.implied_prob).toBeGreaterThan(0);
    expect(row.implied_prob).toBeLessThan(1);
    expect([0, 1]).toContain(row.label);
    expect(row.event_id).toBeTruthy();
    expect(row.league_code).toBeTruthy();
  }

  const weightsResponse = await page.request.get('/lightgbm_weights.json');
  expect(weightsResponse.ok()).toBe(true);
  const weights = await weightsResponse.json();
  expect(weights.status).toBe('row_level_table_detected_training_pending');
  expect(weights.source.training_rows_found).toBe(true);
  expect(weights.source.training_rows_count).toBe(summary.rows);
});

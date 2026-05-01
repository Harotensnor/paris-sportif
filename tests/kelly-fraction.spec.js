// v33.21 — Tests unitaires fixture-based pour kellyFraction.
//
// Approach : 8 cas synthétiques avec p / odds / multiplier connus,
// vérifie que kellyFraction respecte ses invariants :
//   - retourne 0 si edge négatif (p*odds < 1)
//   - retourne 0 si inputs invalides
//   - applique le cap (default 10%)
//   - applique le multiplier (default 0.25 = quarter Kelly)
//   - le résultat est dans [0, capPct]
//
// kellyFraction(p, decimalOdds, kellyMultiplier = 0.25, capPct = 0.10)
//
// Formule de Kelly : f = (p*b - q) / b   où b = odds-1, q = 1-p
// Puis : output = min(capPct, f * multiplier)

import { test, expect } from '@playwright/test';

const URL = '/pronostics.html';

const CASES = [
  // Cas favorables
  {
    name: 'p=0.6 odds=2.0 → edge positif, applique 0.25× cap 10%',
    p: 0.6, odds: 2.0, mul: 0.25, cap: 0.10,
    // f = (0.6*1 - 0.4)/1 = 0.2 → 0.2 * 0.25 = 0.05 → < 0.10 → 0.05
    expected_min: 0.04, expected_max: 0.06,
  },
  {
    name: 'p=0.7 odds=2.0 → cap atteint',
    p: 0.7, odds: 2.0, mul: 0.25, cap: 0.10,
    // f = (0.7*1 - 0.3)/1 = 0.4 → 0.4 * 0.25 = 0.10 → exactement cap
    expected_min: 0.099, expected_max: 0.101,
  },
  {
    name: 'p=0.8 odds=2.0 → cap dépassé naturellement',
    p: 0.8, odds: 2.0, mul: 0.25, cap: 0.10,
    // f = (0.8 - 0.2)/1 = 0.6 → 0.6 * 0.25 = 0.15 → cap à 0.10
    expected_min: 0.099, expected_max: 0.101,
  },
  {
    name: 'p=0.5 odds=2.5 → edge fort',
    p: 0.5, odds: 2.5, mul: 0.25, cap: 0.10,
    // f = (0.5*1.5 - 0.5)/1.5 = 0.25/1.5 ≈ 0.167 → 0.167*0.25 ≈ 0.0417
    expected_min: 0.04, expected_max: 0.045,
  },
  // Cas non favorables (edge négatif → 0)
  {
    name: 'p=0.4 odds=2.0 → edge négatif, retourne 0',
    p: 0.4, odds: 2.0, mul: 0.25, cap: 0.10,
    // f = (0.4 - 0.6)/1 = -0.2 → < 0 → 0
    expected_min: 0, expected_max: 0,
  },
  {
    name: 'p=0.5 odds=2.0 → edge nul, retourne 0',
    p: 0.5, odds: 2.0, mul: 0.25, cap: 0.10,
    // f = (0.5 - 0.5)/1 = 0 → 0
    expected_min: 0, expected_max: 0,
  },
  // Cas invalides
  {
    name: 'p=0 → invalid, retourne 0',
    p: 0, odds: 2.0, mul: 0.25, cap: 0.10,
    expected_min: 0, expected_max: 0,
  },
  {
    name: 'odds=1 → invalid (pas de payout), retourne 0',
    p: 0.7, odds: 1.0, mul: 0.25, cap: 0.10,
    expected_min: 0, expected_max: 0,
  },
];

test.describe('kellyFraction — fixture-based smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    await page.waitForFunction(
      () => window.__testAPI && typeof window.__testAPI.kellyFraction === 'function',
      { timeout: 15000 }
    );
  });

  for (const c of CASES) {
    test(`kellyFraction "${c.name}"`, async ({ page }) => {
      const result = await page.evaluate(({ p, odds, mul, cap }) => {
        const f = window.__testAPI.kellyFraction(p, odds, mul, cap);
        return { ok: typeof f === 'number', value: f };
      }, c);
      expect(result.ok).toBe(true);
      expect(result.value).toBeGreaterThanOrEqual(c.expected_min);
      expect(result.value).toBeLessThanOrEqual(c.expected_max);
      // Invariant universel : ne dépasse jamais le cap
      expect(result.value).toBeLessThanOrEqual(c.cap);
      // Invariant universel : >= 0
      expect(result.value).toBeGreaterThanOrEqual(0);
    });
  }

  test('kellyFraction est idempotent', async ({ page }) => {
    const result = await page.evaluate(() => {
      const a = window.__testAPI.kellyFraction(0.65, 2.10, 0.25, 0.10);
      const b = window.__testAPI.kellyFraction(0.65, 2.10, 0.25, 0.10);
      return { a, b, equal: Math.abs(a - b) < 1e-9 };
    });
    expect(result.equal).toBe(true);
  });

  test('kellyFraction respecte le multiplier (0.5 vs 0.25)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const half = window.__testAPI.kellyFraction(0.6, 2.0, 0.5, 0.10);
      const quarter = window.__testAPI.kellyFraction(0.6, 2.0, 0.25, 0.10);
      return { half, quarter, ratio: half > 0 ? half / quarter : null };
    });
    // 0.5 mult devrait donner ~2× le 0.25 mult (sauf si capped)
    // Pour p=0.6 odds=2 : f=0.2, 0.5*f=0.10 (cap !), 0.25*f=0.05
    // → ratio = 0.10/0.05 = 2.0 (cap-limited de toute façon)
    expect(result.half).toBeGreaterThan(result.quarter);
  });
});

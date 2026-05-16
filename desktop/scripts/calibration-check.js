#!/usr/bin/env node
// Sprint 70 — Test calibration per-market (Sprint 68).
// Verifie que prob_calibration.json contient bien des bins par marche
// avec des sample sizes suffisants pour les marches principaux.

const fs = require('fs');
const path = require('path');

function fail(msg, ctx) {
  const suffix = ctx ? ` ${JSON.stringify(ctx).slice(0, 600)}` : '';
  throw new Error(`${msg}${suffix}`);
}

function assert(condition, msg, ctx) {
  if (!condition) fail(msg, ctx);
}

try {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const calPath = path.join(projectRoot, 'prob_calibration.json');
  assert(fs.existsSync(calPath), 'prob_calibration.json absent');
  const cal = JSON.parse(fs.readFileSync(calPath, 'utf8'));

  // Test 1 : schema v3 (avec bins_by_market)
  assert(cal.schema === 'paris-sportif.prob_calibration.v3',
    `Schema obsolete (attendu v3, got ${cal.schema})`, { schema: cal.schema });
  console.log(`[calibration] OK schema v3`);

  // Test 2 : bins globaux et by_sport presents
  assert(Array.isArray(cal.bins) && cal.bins.length === 10, `bins global manquant/incomplet`);
  assert(cal.bins_by_sport && typeof cal.bins_by_sport === 'object', `bins_by_sport manquant`);
  console.log(`[calibration] OK bins global + ${Object.keys(cal.bins_by_sport).length} sports`);

  // Test 3 : bins_by_market present avec marches cles
  assert(cal.bins_by_market && typeof cal.bins_by_market === 'object', `bins_by_market manquant (Sprint 68)`);
  const requiredMarkets = ['1n2', 'ou'];
  for (const mk of requiredMarkets) {
    assert(cal.bins_by_market[mk], `Sprint 68: bins_by_market[${mk}] manquant`, {
      keys: Object.keys(cal.bins_by_market)
    });
    const mkRep = cal.bins_by_market[mk];
    assert(mkRep.n_settled >= 30, `Sprint 68: ${mk} sample trop petit (n=${mkRep.n_settled})`);
    assert(Array.isArray(mkRep.bins) && mkRep.bins.length === 10,
      `Sprint 68: ${mk} bins incomplets`, { len: mkRep.bins?.length });
    assert(Number.isFinite(mkRep.brier_calibrated), `Sprint 68: ${mk} brier_calibrated manquant`);
  }
  console.log(`[calibration] OK bins_by_market : ${Object.keys(cal.bins_by_market).join(', ')}`);

  // Test 4 : brier_calibrated < brier_raw pour les marches calibres (gain reel)
  for (const [mk, rep] of Object.entries(cal.bins_by_market)) {
    const gain = rep.brier_raw - rep.brier_calibrated;
    assert(gain > -0.005, `Sprint 68: ${mk} brier degrade par calibration (gain=${gain})`, {
      raw: rep.brier_raw, cal: rep.brier_calibrated, gain
    });
    console.log(`[calibration]   ${mk}: n=${rep.n_settled} brier ${rep.brier_raw.toFixed(3)} -> ${rep.brier_calibrated.toFixed(3)} (gain ${(gain * 100).toFixed(1)}pt)`);
  }

  // Test 5 : applies_at_runtime = true (sinon le client n'utilise pas la map)
  assert(cal.applies_at_runtime === true, `applies_at_runtime doit etre true`);
  console.log(`[calibration] OK applies_at_runtime`);

  console.log(`[calibration] All checks PASSED.`);
} catch (err) {
  console.error(`[calibration] FAIL: ${err.message}`);
  process.exit(1);
}

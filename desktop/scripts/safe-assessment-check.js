#!/usr/bin/env node
// Sprint 70 — Test discipline modele (Sprint 66 fix).
// Verifie que safeAssessmentForRow rejette correctement les picks aberrants
// (edge brut >= 22pt 1n2, >= 15pt derive) et les marches derives avec
// segment court perdant (sample 5-14, ROI<0).
//
// Approche : on appelle getAnalysis et on inspecte les dashboardPicks pour
// verifier qu'aucun pick aberrant n'apparait dans les "Fiable".

const path = require('path');
const { createLegacyEngineService } = require('../src/engine/legacy-engine');

function fail(msg, ctx) {
  const suffix = ctx ? ` ${JSON.stringify(ctx).slice(0, 600)}` : '';
  throw new Error(`${msg}${suffix}`);
}

function assert(condition, msg, ctx) {
  if (!condition) fail(msg, ctx);
}

(async () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const svc = createLegacyEngineService({ projectRoot });
  const analysis = await svc.getAnalysis({ bankroll: 100 });
  const all = analysis.dashboardPicks || [];

  // Test 1 : Aucun Fiable avec edge brut > 22pt sur 1n2
  // Aucun Fiable avec edge brut > 15pt sur marche derive
  const reliable = all.filter((p) => p?.safeAssessment?.reliable === true);
  console.log(`[safe-assessment] ${reliable.length} pick(s) Fiable`);

  for (const pick of reliable) {
    const rawEdge = Number(pick.edge || 0);
    const marketKey = String(pick.marketKey || pick.market || '').toLowerCase();
    const isOneN2 = ['1n2', 'matchwinner', 'winner', 'moneyline'].includes(marketKey);
    const threshold = isOneN2 ? 0.22 : 0.15;
    assert(rawEdge < threshold, `Sprint 66: pick Fiable avec edge brut aberrant`, {
      title: pick.title, market: marketKey, rawEdge, threshold, isOneN2
    });
  }
  console.log(`[safe-assessment] OK : aucun Fiable aberrant (seuil 22pt 1n2, 15pt derive)`);

  // Test 2 : Aucun Fiable derive avec segment court perdant (sample 5-14, ROI<0)
  for (const pick of reliable) {
    const marketKey = String(pick.marketKey || pick.market || '').toLowerCase();
    const isOneN2 = ['1n2', 'matchwinner', 'winner', 'moneyline'].includes(marketKey);
    if (isOneN2) continue;
    const sample = Number(pick.segmentValidation?.sample || pick.calibration?.sample || 0);
    const roi = Number(pick.segmentValidation?.roi ?? pick.calibration?.roi ?? 0);
    if (sample >= 5 && sample < 15 && Number.isFinite(roi) && roi < 0) {
      fail(`Sprint 66: pick derive Fiable avec segment court perdant`, {
        title: pick.title, market: marketKey, sample, roi
      });
    }
  }
  console.log(`[safe-assessment] OK : aucun derive avec segment court perdant`);

  // Test 3 : oddsBasedFallback retourne 'watch' (limitedConfidence)
  // Ces picks ne doivent JAMAIS etre Fiable.
  const fallbacks = all.filter((p) => p?.pickSource === 'winamax_odds_fallback');
  for (const pick of fallbacks) {
    assert(!pick.safeAssessment?.reliable, `Sprint 66: oddsBasedFallback Fiable interdit`, {
      title: pick.title, pickSource: pick.pickSource
    });
  }
  console.log(`[safe-assessment] OK : ${fallbacks.length} fallback non-reliable`);

  // Test 4 : engine sane (au moins 1 Fiable, < 20 Fiables)
  assert(reliable.length >= 1, `Engine trop strict (0 Fiable)`, { total: all.length });
  assert(reliable.length <= 20, `Engine trop laxe (${reliable.length} Fiables)`, { total: all.length });
  console.log(`[safe-assessment] OK : profil sain (${reliable.length} Fiables sur ${all.length})`);

  console.log(`[safe-assessment] All checks PASSED.`);
})().catch((err) => {
  console.error(`[safe-assessment] FAIL: ${err.message}`);
  process.exit(1);
});

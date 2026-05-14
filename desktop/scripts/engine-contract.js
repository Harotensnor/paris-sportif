#!/usr/bin/env node
const { createLegacyEngineService } = require('../src/engine/legacy-engine');
const modelUtils = require('../src/engine/model-utils');
const bettingUtils = require('../src/engine/betting-utils');
const contentUtils = require('../src/engine/content-utils');
const historyUtils = require('../src/engine/history-utils');
const qualityUtils = require('../src/engine/quality-utils');
const calibrationUtils = require('../src/engine/calibration-utils');
const contextUtils = require('../src/engine/context-utils');

function fail(message, details) {
  const suffix = details ? ` ${JSON.stringify(details).slice(0, 2000)}` : '';
  throw new Error(`${message}${suffix}`);
}

function assert(condition, message, details) {
  if (!condition) fail(message, details);
}

function testUtils() {
  assert(typeof modelUtils.buildSignalCoverage === 'function', 'model-utils incomplet');
  assert(Number.isFinite(Number(bettingUtils.kellyFraction(0.55, 2.1, 0.25))), 'Kelly invalide');
  assert(typeof contentUtils.buildNativeCombines === 'function', 'content-utils incomplet');
  assert(typeof historyUtils.agentBalance === 'function', 'history-utils incomplet');
  assert(Array.isArray(qualityUtils.buildQualityAlerts({ warnings: [] })), 'alertes qualité invalides');
  assert(typeof contextUtils.contextQuality === 'function', 'context-utils incomplet');

  const calibration = calibrationUtils.buildCalibration([
    { result: 'won', sport: 'football', league: 'A', market_key: '1n2', odd_book: 2, prob_model: 0.6, edge: 0.1, context_tier: 'fort', context_score: 75 },
    { result: 'lost', sport: 'football', league: 'A', market_key: '1n2', odd_book: 2, prob_model: 0.6, edge: 0.1, context_tier: 'fort', context_score: 75 }
  ], { minSamples: 2 });
  assert(calibration.byMarket['1n2'].count === 2, 'calibration marché invalide', calibration);
}

function testAnalysis() {
  const engine = createLegacyEngineService({ projectRoot: process.cwd() });
  const analysis = engine.getAnalysis({ bankroll: 50 });
  assert(analysis && analysis.ok, 'Analyse moteur absente');
  assert(Number(analysis.counts?.matches || 0) > 0, 'Aucun match analysé', analysis.counts);
  assert(Array.isArray(analysis.matches), 'Matches absents');
  assert(Array.isArray(analysis.picks), 'Picks absents');
  assert(Array.isArray(analysis.dashboardPicks), 'Dashboard picks absent');
  assert(Array.isArray(analysis.watchlist), 'Watchlist absente');
  assert(Array.isArray(analysis.combines), 'Combinés absents');
  assert(Array.isArray(analysis.scorers), 'Buteurs absents');
  assert(analysis.decisionCenter && analysis.decisionCenter.schema, 'DecisionCenter absent', analysis.decisionCenter);
  assert(analysis.modelRealityAudit && analysis.modelRealityAudit.schema === 'paris-sportif.model_reality_audit.v1', 'Audit réalité modèle absent', analysis.modelRealityAudit);
  assert(Number(analysis.modelRealityAudit.sampleSize || 0) > 0, 'Audit réalité sans sample', analysis.modelRealityAudit);
  assert(analysis.todayFunnel && analysis.todayFunnel.schema === 'paris-sportif.today_funnel.v1', 'Funnel aujourd’hui absent', analysis.todayFunnel);
  assert(analysis.coverage24h && analysis.coverage24h.schema === 'paris-sportif.coverage_24h.v1', 'Couverture 24h absente', analysis.coverage24h);
  assert(Number(analysis.coverage24h.summary?.displayed || 0) >= 15, 'Moins de 15 picks affichés sur 24h glissantes', analysis.coverage24h.summary);
  assert(Number(analysis.coverage24h.summary?.nightDisplayed || 0) >= 3 || Number(analysis.coverage24h.buckets?.find((bucket) => bucket.key === '00-06')?.bookable || 0) < 8, 'Couverture nuit insuffisante', analysis.coverage24h);
  assert(Number(analysis.coverage24h.summary?.ready || 0) >= 10, 'Moins de 10 picks prêts sur 24h glissantes', analysis.coverage24h.summary);
  assert(analysis.winamaxMarketAudit && analysis.winamaxMarketAudit.schema === 'paris-sportif.winamax_market_audit.v1', 'Audit marchés Winamax absent', analysis.winamaxMarketAudit);
  assert(Number(analysis.winamaxMarketAudit.summary?.availableFamilies || 0) >= 8, 'Pas assez de familles de marchés Winamax détectées', analysis.winamaxMarketAudit.summary);
  assert(Number(analysis.winamaxMarketAudit.summary?.exploitedFamilies || 0) >= 8, 'Pas assez de familles de marchés exploitées', analysis.winamaxMarketAudit.summary);
  assert(Object.keys(analysis).filter((key) => /^v(?:[5-9]|1[0-6])/.test(key)).length === 0, 'Anciennes propriétés V5-V16 encore exposées');

  const seen = new Set();
  for (const pick of analysis.picks) {
    assert(Number(pick.odd) > 1, 'Pick avec cote invalide', pick);
    assert(Number(pick.probability) > 0 && Number(pick.probability) <= 1, 'Pick avec probabilité invalide', pick);
    assert(Number(pick.edge) > 0, 'Pick sans edge positif', pick);
    assert(pick.decisionCenter && typeof pick.decisionCenter.canBet === 'boolean', 'Pick sans décision centrale', pick);
    assert(pick.segmentValidation && Number(pick.segmentValidation.realConfidence || 0) > 0, 'Pick sans validation historique réelle', pick);
    assert(Number(pick.adjustedConfidence || 0) > 0, 'Pick sans confiance ajustée', pick);
    assert(pick.winamaxBetType && pick.winamaxBetType.label, 'Pick sans type de pari Winamax conseillé', pick);
    assert(pick.safeAssessment && pick.safeAssessment.status, 'Pick sans filtre fiable et safe', pick);
    assert(Number(pick.safeEdge || pick.edge || 0) >= 0.01, 'Pick sans edge prudent positif', pick);
    assert(Number.isFinite(Number(pick.priorityScore)) && Number(pick.priorityScore) >= 0, 'Pick sans score de priorité', pick);
    if (pick.decisionCenter.canBet) {
      assert(Number(pick.stake) > 0, 'Pick prêt sans mise positive', pick);
    } else {
      assert(Number(pick.stake || 0) === 0, 'Pick bloqué avec mise positive', pick);
    }
    assert(pick.contextGate && pick.contextQuality, 'Pick sans diagnostic contexte', pick);
    assert(pick.contextGate.gate !== 'skip', 'Pick exposé malgré contexte skip', pick);
    const key = `${pick.id}:${pick.market}:${pick.label}`;
    assert(!seen.has(key), 'Pick dupliqué', { key });
    seen.add(key);
  }

  for (const reportName of [
    'contextBacktest',
    'decisionBacktest',
    'decisionTuning',
    'decisionShadow',
    'oddsGuardrails',
    'agentBlockerBacktest',
    'agentGuardrailRecommendations',
    'stakeReductionBacktest',
    'signalConflictBacktest',
    'prebetChecklist',
    'prebetChecklistBacktest',
    'prematchExecution',
    'refreshPriorityPlan',
    'sourceRegistry',
    'optionalSourcesPlan',
    'criticalIssueReport',
    'dataConsistencyReport',
    'pickIntegrityReport',
    'coverageRepairEngine',
    'modelLab',
    'sourceHealth'
  ]) {
    assert(analysis[reportName] && typeof analysis[reportName] === 'object', `Rapport cœur absent: ${reportName}`, analysis[reportName]);
  }

  const prebetBlocked = Boolean(analysis.prebetChecklist?.summary?.blockers);
  const criticalBlocked = Boolean(analysis.criticalIssueReport?.summary?.blocks_bet);
  if (prebetBlocked || criticalBlocked) {
    assert((analysis.agent?.positions || []).length === 0, 'Checklist/critique actuelle doit bloquer agent', {
      prebet: analysis.prebetChecklist?.summary,
      critical: analysis.criticalIssueReport?.summary,
      agent: analysis.agent?.guard
    });
    assert((analysis.agent?.blockedPositions || []).every((pos) => Number(pos.stake || 0) === 0), 'Positions agent bloquées avec mise positive', analysis.agent?.blockedPositions);
  }

  const readyUserPicks = (analysis.picks || []).filter((pick) => pick.decisionCenter?.canBet === true);
  const perMatch = new Map();
  for (const pick of analysis.dashboardPicks || []) {
    perMatch.set(pick.id, (perMatch.get(pick.id) || 0) + 1);
  }
  const topRanks = (analysis.dashboardPicks || []).filter((pick) => Number(pick.priorityRank || 0) >= 1 && Number(pick.priorityRank || 0) <= 5);
  assert(topRanks.length >= 5, 'Top 5 prioritaire absent du cockpit', topRanks);
  assert(Number(analysis.dashboardPicks?.[0]?.priorityRank || 0) === 1, 'Le premier pick dashboard doit être le #1 prioritaire', analysis.dashboardPicks?.[0]);
  assert(String(analysis.dashboardPicks?.[0]?.priorityLabel || '').includes('TOP'), 'Le #1 doit porter le badge TOP PICK', analysis.dashboardPicks?.[0]);
  assert(Array.from(perMatch.values()).every((count) => count <= 2), 'Dashboard expose plus de 2 picks sur un même match', Array.from(perMatch.entries()).filter(([, count]) => count > 2));
  assert(Number(analysis.decisionCenter?.summary?.ready || 0) >= 15, 'Moins de 15 paris utilisateurs prêts', analysis.decisionCenter?.summary);
  assert(readyUserPicks.length >= 15, 'Moins de 15 paris prêts visibles dans la sélection', readyUserPicks);

  assert(analysis.agent && analysis.agent.guard, 'Snapshot agent absent', analysis.agent);
  assert(!Object.keys(analysis.agent).some((key) => /^v(?:[5-9]|1[0-6])/.test(key)), 'Anciennes gates versionnées ne doivent plus bloquer l’agent', analysis.agent);

  return analysis;
}

testUtils();
const analysis = testAnalysis();
console.log(`Desktop engine contract OK: ${analysis.matches.length} matchs, ${analysis.picks.length} picks, ${analysis.dashboardPicks.length} dashboard, ${(analysis.agent?.positions || []).length} positions agent.`);

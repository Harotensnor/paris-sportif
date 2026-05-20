#!/usr/bin/env node
const { createLegacyEngineService } = require('../src/engine/legacy-engine');
const fs = require('fs');
const path = require('path');
const modelUtils = require('../src/engine/model-utils');
const bettingUtils = require('../src/engine/betting-utils');
const contentUtils = require('../src/engine/content-utils');
const historyUtils = require('../src/engine/history-utils');
const qualityUtils = require('../src/engine/quality-utils');
const calibrationUtils = require('../src/engine/calibration-utils');
const contextUtils = require('../src/engine/context-utils');
const dataSource = require('../src/engine/data-source');

function fail(message, details) {
  const suffix = details ? ` ${JSON.stringify(details).slice(0, 2000)}` : '';
  throw new Error(`${message}${suffix}`);
}

function assert(condition, message, details) {
  if (!condition) fail(message, details);
}

function compactMarketKey(value) {
  return calibrationUtils.normalizeMarketKey(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isSimpleDashboardMarket(pick) {
  const key = compactMarketKey(pick?.marketKey || pick?.market);
  return /^(1n2|matchwinner|winner|moneyline|ou|ou15|ou25|ou35|btts|scorer|buteur|goalscorer)$/.test(key);
}

function isDrawDashboardPick(pick) {
  const key = compactMarketKey(pick?.marketKey || pick?.market);
  if (!/^(1n2|matchwinner|winner|moneyline)$/.test(key)) return false;
  const text = String([pick?.label, pick?.pickLabel, pick?.pick, pick?.selection, pick?.side].filter(Boolean).join(' ')).toLowerCase();
  const compact = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
  return /(^|[^a-z])(?:nul|draw|match\s*nul|egalite)(?:[^a-z]|$)/i.test(text)
    || ['x', 'n', 'nul', 'draw', 'matchnul', 'egalite'].includes(compact);
}

function dashboardMarketGroup(pick) {
  return marketGroupFromValue(pick?.marketKey || pick?.market);
}

function marketGroupFromValue(value) {
  const key = compactMarketKey(value);
  if (/^(1n2|matchwinner|winner|moneyline)$/.test(key)) return 'winner';
  if (/^(scorer|buteur|goalscorer)$/.test(key)) return 'scorer';
  if (/btts|les2equipes|lesdeuxequipes|lesdeuxquipes/.test(key)) return 'btts';
  if (/^(ou|ou15|ou25|ou35)$/.test(key)) return 'goals';
  return 'other';
}

function isActionableSimpleAlternative(pick) {
  if (!pick?.isMarketAlternative) return false;
  const group = dashboardMarketGroup(pick);
  if (!['winner', 'goals', 'btts'].includes(group)) return false;
  if (marketGroupFromValue(pick.primaryMarket || '') === group) return false;
  const source = String(pick?.marketCandidate?.source || pick?.pickSource || '').toLowerCase();
  if (!/winamax_exact|winamax_detail|winamax_market/.test(source)) return false;
  const odd = Number(pick?.odd || 0);
  const edge = Number(pick?.safeEdge ?? pick?.edge ?? 0);
  const confidence = Number(pick?.safeConfidence ?? pick?.probability ?? 0);
  const contextScore = Number(pick?.contextQuality?.score ?? pick?.match?.context?.quality?.score ?? 0);
  const sample = Number(pick?.safeAssessment?.sample ?? pick?.segmentValidation?.sample ?? 0) || 0;
  const roi = Number(pick?.safeAssessment?.roi ?? pick?.segmentValidation?.roi);
  return isSimpleDashboardMarket(pick) &&
    !isDrawDashboardPick(pick) &&
    pick?.safeAssessment?.reliable === true &&
    odd >= 1.35 &&
    odd <= 2.20 &&
    edge >= 0.05 &&
    confidence >= 0.70 &&
    contextScore >= 65 &&
    sample >= 50 &&
    Number.isFinite(roi) &&
    roi >= 0.05;
}

function isFuturePick(pick) {
  const ts = Date.parse(pick?.start || pick?.date || pick?.kickoff || '');
  return Number.isFinite(ts) && ts > Date.now();
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
  const runtimeData = dataSource.loadRuntimeDataStable(process.cwd(), { allowFallback: false });
  const fallbackTodayWinamax = dataSource.fallbackTodayWinamax(runtimeData.truth);
  assert(
    !dataSource.hasPrimaryTodayWinamaxLoss(runtimeData.truth),
    'data.js a perdu les événements Winamax du jour alors que les snapshots légers en ont',
    {
      truth: runtimeData.truth,
      refreshRunning: runtimeData.refreshRunning,
      waitedMs: runtimeData.waitedMs,
      fallbackTodayWinamax
    }
  );

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
  assert(analysis.modelRealityAudit && analysis.modelRealityAudit.schema === 'paris-sportif.model_reality_audit.v2', 'Audit réalité modèle absent', analysis.modelRealityAudit);
  assert(Number(analysis.modelRealityAudit.sampleSize || 0) > 0, 'Audit réalité sans sample', analysis.modelRealityAudit);
  assert(Number(analysis.modelRealityAudit.windowDays || 0) === 60, 'Audit réalité modèle doit couvrir 60 jours', analysis.modelRealityAudit);
  assert(Array.isArray(analysis.modelRealityAudit.segmentAdjustments), 'Ajustements segment 60j absents', analysis.modelRealityAudit);
  assert(Array.isArray(analysis.modelRealityAudit.tierCalibration), 'Calibration par tier absente', analysis.modelRealityAudit);
  assert(Array.isArray(analysis.modelRealityAudit.seasonalDrift), 'Drift saisonnier absent', analysis.modelRealityAudit);
  assert(analysis.todayFunnel && analysis.todayFunnel.schema === 'paris-sportif.today_funnel.v1', 'Funnel aujourd’hui absent', analysis.todayFunnel);
  assert(analysis.coverage24h && analysis.coverage24h.schema === 'paris-sportif.coverage_24h.v1', 'Couverture 24h absente', analysis.coverage24h);
  assert(analysis.winamaxMarketAudit && analysis.winamaxMarketAudit.schema === 'paris-sportif.winamax_market_audit.v1', 'Audit marchés Winamax absent', analysis.winamaxMarketAudit);
  assert(analysis.sourceHealthV5 && analysis.sourceHealthV5.schema === 'paris-sportif.source_health.v5', 'SourceHealth v5 absent', analysis.sourceHealthV5);
  assert(analysis.sourceHealthV6 && analysis.sourceHealthV6.schema === 'paris-sportif.source_health.v6', 'SourceHealth v6 absent', analysis.sourceHealthV6);
  assert(analysis.sourceHealthV7 && analysis.sourceHealthV7.schema === 'paris-sportif.source_health.v7', 'SourceHealth v7 absent', analysis.sourceHealthV7);
  assert(analysis.sourceHealthV8 && analysis.sourceHealthV8.schema === 'paris-sportif.source_health.v8', 'SourceHealth v8 absent', analysis.sourceHealthV8);
  assert(analysis.sourceHealthV9 && analysis.sourceHealthV9.schema === 'paris-sportif.source_health.v9', 'SourceHealth v9 absent', analysis.sourceHealthV9);
  assert(analysis.marketCoverageV2 && analysis.marketCoverageV2.schema === 'paris-sportif.market_coverage.v2', 'MarketCoverage v2 absent', analysis.marketCoverageV2);
  assert(analysis.terrainReportV2 && analysis.terrainReportV2.schema === 'paris-sportif.terrain_report.v2', 'TerrainReport v2 absent', analysis.terrainReportV2);
  assert(analysis.terrainReportV3 && analysis.terrainReportV3.schema === 'paris-sportif.terrain_report.v3', 'TerrainReport v3 absent', analysis.terrainReportV3);
  assert(analysis.terrainReportV4 && analysis.terrainReportV4.schema === 'paris-sportif.terrain_report.v4', 'TerrainReport v4 absent', analysis.terrainReportV4);
  assert(analysis.terrainReportV5 && analysis.terrainReportV5.schema === 'paris-sportif.terrain_report.v5', 'TerrainReport v5 absent', analysis.terrainReportV5);
  assert(analysis.terrainReportV8 && analysis.terrainReportV8.schema === 'paris-sportif.terrain_report.v8', 'TerrainReport v8 absent', analysis.terrainReportV8);
  assert(analysis.modelBacktestV4 && analysis.modelBacktestV4.schema === 'paris-sportif.model_backtest.v4', 'ModelBacktest v4 absent', analysis.modelBacktestV4);
  assert(analysis.modelBacktestV5 && analysis.modelBacktestV5.schema === 'paris-sportif.model_backtest.v5', 'ModelBacktest v5 absent', analysis.modelBacktestV5);
  assert(analysis.modelBacktestV6 && analysis.modelBacktestV6.schema === 'paris-sportif.model_backtest.v6', 'ModelBacktest v6 absent', analysis.modelBacktestV6);
  assert(Array.isArray(analysis.sourceHealthV5.sources) && analysis.sourceHealthV5.sources.length >= 5 && analysis.sourceHealthV5.sources.length <= 25, 'SourceHealth v5 incohérent', analysis.sourceHealthV5.summary);
  assert(Array.isArray(analysis.sourceHealthV6.sources) && analysis.sourceHealthV6.sources.length >= 5, 'SourceHealth v6 incohérent', analysis.sourceHealthV6.summary);
  assert(Array.isArray(analysis.sourceHealthV7.sources) && analysis.sourceHealthV7.sources.length >= analysis.sourceHealthV6.sources.length, 'SourceHealth v7 incohérent', analysis.sourceHealthV7.summary);
  assert(Array.isArray(analysis.sourceHealthV8.sources) && analysis.sourceHealthV8.sources.length >= analysis.sourceHealthV7.sources.length, 'SourceHealth v8 incohérent', analysis.sourceHealthV8.summary);
  assert(Array.isArray(analysis.sourceHealthV9.sources) && analysis.sourceHealthV9.sources.length === analysis.sourceHealthV8.sources.length, 'SourceHealth v9 incohérent', analysis.sourceHealthV9.summary);
  assert(Number.isFinite(Number(analysis.sourceHealthV6.summary?.estimatedPickGain || 0)), 'SourceHealth v6 sans gain estimé', analysis.sourceHealthV6.summary);
  assert(Number.isFinite(Number(analysis.sourceHealthV7.summary?.estimatedPickGain || 0)), 'SourceHealth v7 sans gain estimé', analysis.sourceHealthV7.summary);
  assert(Number.isFinite(Number(analysis.sourceHealthV8.summary?.estimatedReadyGain || 0)), 'SourceHealth v8 sans gain prêt estimé', analysis.sourceHealthV8.summary);
  assert(Number.isFinite(Number(analysis.sourceHealthV8.summary?.blockedReadyCount || 0)), 'SourceHealth v8 sans prêts bloqués', analysis.sourceHealthV8.summary);
  assert(Number.isFinite(Number(analysis.sourceHealthV9.summary?.estimatedReadyGain || 0)), 'SourceHealth v9 sans gain prêt estimé', analysis.sourceHealthV9.summary);
  assert(typeof analysis.sourceHealthV9.summary?.userMessage === 'string', 'SourceHealth v9 sans message utilisateur', analysis.sourceHealthV9.summary);
  assert(Array.isArray(analysis.marketCoverageV2.families) && analysis.marketCoverageV2.families.length >= 8, 'MarketCoverage v2 sans familles', analysis.marketCoverageV2);
  assert(Number(analysis.terrainReportV2.counts?.dashboardRows || 0) === analysis.dashboardPicks.length, 'TerrainReport v2 ne reflète pas le cockpit', analysis.terrainReportV2.counts);
  assert(Number(analysis.terrainReportV3.counts?.dashboardRows || 0) === analysis.dashboardPicks.length, 'TerrainReport v3 ne reflète pas le cockpit', analysis.terrainReportV3.counts);
  assert(Number(analysis.terrainReportV4.counts?.dashboardRows || 0) === analysis.dashboardPicks.length, 'TerrainReport v4 ne reflète pas le cockpit', analysis.terrainReportV4.counts);
  assert(Number(analysis.terrainReportV5.counts?.dashboardRows || 0) === analysis.dashboardPicks.length, 'TerrainReport v5 ne reflète pas le cockpit', analysis.terrainReportV5.counts);
  assert(Number(analysis.terrainReportV8.quickBetSummary?.cockpitRows || 0) === analysis.dashboardPicks.length, 'TerrainReport v8 ne reflète pas le cockpit', analysis.terrainReportV8.quickBetSummary);
  assert(analysis.terrainReportV3.uxChecks?.actionCopyRequired === 'PARI / COTE / MISE', 'TerrainReport v3 sans promesse UX rapide', analysis.terrainReportV3.uxChecks);
  assert(analysis.terrainReportV4.quickBetSummary && Array.isArray(analysis.terrainReportV4.actionableNextRepairs), 'TerrainReport v4 incomplet', analysis.terrainReportV4);
  assert(analysis.terrainReportV5.quickBetSummary && analysis.terrainReportV5.nightAudit && analysis.terrainReportV5.varietyAudit, 'TerrainReport v5 incomplet', analysis.terrainReportV5);
  assert(analysis.terrainReportV8.quickBetSummary && analysis.terrainReportV8.speedSummary && analysis.terrainReportV8.sourceSummary, 'TerrainReport v8 incomplet', analysis.terrainReportV8);
  assert(analysis.modelBacktestV6.dimensions && analysis.modelBacktestV6.dimensions.byDecisionStatus, 'ModelBacktest v6 sans dimensions', analysis.modelBacktestV6);
  const matchContext = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'match_context.json'), 'utf8'));
  const contextRows = matchContext.matches_by_id && typeof matchContext.matches_by_id === 'object'
    ? Object.values(matchContext.matches_by_id)
    : Array.isArray(matchContext.matches) ? matchContext.matches : [];
  const tennisContextRows = contextRows.filter((row) => String(row?.sport || '').toLowerCase() === 'tennis');
  if (tennisContextRows.length) {
    const footOnlySources = new Set(['lineups', 'injuries', 'referees', 'weather', 'xg', 'roster']);
    const polluted = tennisContextRows.filter((row) => {
      const quality = row.quality || {};
      const missing = [...(quality.missing || []), ...(quality.stale || []), ...(quality.critical_missing || [])].map(String);
      return missing.some((source) => footOnlySources.has(source) || /lineup|injur|referee|weather|xg|roster/i.test(source));
    });
    assert(polluted.length === 0, 'Les dossiers tennis ne doivent pas être bloqués par des sources foot', polluted.slice(0, 5));
  }
  const readJson = (name) => JSON.parse(fs.readFileSync(path.join(process.cwd(), name), 'utf8'));
  const parseTime = (value) => {
    const date = new Date(String(value || '').replace('Z', '+00:00'));
    return Number.isFinite(date.getTime()) ? date.getTime() : 0;
  };
  const v10 = readJson('v10_decision_feed.json');
  const v15 = readJson('v15_action_cockpit_report.json');
  const v16 = readJson('v16_final_ticket.json');
  const staleV10 = (v10.decisions || []).filter((row) => row.time_bucket === 'expired' && row.v10_status === 'wait_t10');
  assert(staleV10.length === 0, 'V10 ne doit pas demander T-10 sur un match expiré', staleV10.slice(0, 5));
  const v15Generated = parseTime(v15.generated_at);
  const staleV15 = (v15.rows || []).filter((row) => parseTime(row.kickoff) <= v15Generated && ['ready_now', 'needs_t10', 'one_tick_price', 'price_watch'].includes(row.v15_status));
  assert(staleV15.length === 0, 'V15 ne doit pas proposer action/prix sur un match expiré', staleV15.slice(0, 5));
  const staleV16 = (v16.rows || []).filter((row) => parseTime(row.kickoff) <= parseTime(v16.generated_at) && ['ready_now', 'wait_t10', 'wait_price'].includes(row.v16_status));
  assert(staleV16.length === 0, 'V16 ne doit pas garder un match expiré dans le ticket actif', staleV16.slice(0, 5));
  assert(Number(analysis.winamaxMarketAudit.summary?.availableFamilies || 0) >= 8, 'Pas assez de familles de marchés Winamax détectées', analysis.winamaxMarketAudit.summary);
  const availableFamilies = Number(analysis.winamaxMarketAudit.summary?.availableFamilies || 0);
  const exploitedFamilies = Number(analysis.winamaxMarketAudit.summary?.exploitedFamilies || 0);
  const exploitedFamilyFloor = Math.max(7, Math.min(8, Math.ceil(availableFamilies * 0.50)));
  assert(exploitedFamilies >= exploitedFamilyFloor, 'Pas assez de familles de marchés exploitées', {
    ...analysis.winamaxMarketAudit.summary,
    expectedFloor: exploitedFamilyFloor
  });
  assert(Object.keys(analysis).filter((key) => /^v(?:[5-9]|1[0-6])/.test(key)).length === 0, 'Anciennes propriétés V5-V16 encore exposées');

  const seen = new Set();
  for (const pick of analysis.picks) {
    assert(Number(pick.odd) > 1, 'Pick avec cote invalide', pick);
    assert(Number(pick.probability) > 0 && Number(pick.probability) <= 1, 'Pick avec probabilité invalide', pick);
    assert(Number(pick.edge) > 0, 'Pick sans edge positif', pick);
    assert(pick.decisionCenter && typeof pick.decisionCenter.canBet === 'boolean', 'Pick sans décision centrale', pick);
    assert(pick.pickDecisionV3 && pick.pickDecisionV3.schema === 'paris-sportif.pick_decision.v3', 'PickDecision v3 absent', pick);
    assert(typeof pick.pickDecisionV3.canBet === 'boolean' && typeof pick.pickDecisionV3.why === 'string' && pick.pickDecisionV3.why.length >= 20, 'PickDecision v3 incomplet', pick.pickDecisionV3);
    assert(pick.pickDecisionV4 && pick.pickDecisionV4.schema === 'paris-sportif.pick_decision.v4', 'PickDecision v4 absent', pick);
    assert(typeof pick.pickDecisionV4.canBet === 'boolean' && Array.isArray(pick.pickDecisionV4.decisionReasonCodes) && typeof pick.pickDecisionV4.whyShort === 'string', 'PickDecision v4 incomplet', pick.pickDecisionV4);
    assert(pick.pickDecisionV5 && pick.pickDecisionV5.schema === 'paris-sportif.pick_decision.v5', 'PickDecision v5 absent', pick);
    assert(Number.isFinite(Number(pick.pickDecisionV5.modelScore)) && typeof pick.pickDecisionV5.sourceBlocksBet === 'boolean', 'PickDecision v5 incomplet', pick.pickDecisionV5);
    assert(pick.pickDecisionV6 && pick.pickDecisionV6.schema === 'paris-sportif.pick_decision.v6', 'PickDecision v6 absent', pick);
    assert(Number.isFinite(Number(pick.pickDecisionV6.betReadinessScore)) && Array.isArray(pick.pickDecisionV6.sourceRepairPlan), 'PickDecision v6 incomplet', pick.pickDecisionV6);
    if (pick.profitGuardV5?.blocked) {
      assert(pick.decisionCenter?.canBet !== true && Number(pick.stake || 0) === 0, 'Garde-fou profit réel contourné par un bouton Je mise', pick);
      assert(pick.pickDecisionV6.profitGuardTrace?.blocked === true, 'PickDecision v6 ne trace pas le garde-fou profit réel', pick.pickDecisionV6);
      assert((pick.pickDecisionV4.decisionReasonCodes || []).includes('profit_guard_v5'), 'Code décision profit_guard_v5 absent', pick.pickDecisionV4);
    }
    if (pick.capitalProtectionV1?.blocked) {
      assert(pick.decisionCenter?.canBet !== true && Number(pick.stake || 0) === 0, 'Protection bankroll contournée par un bouton Je mise', pick);
      assert(pick.pickDecisionV6.capitalProtectionTrace?.blocked === true, 'PickDecision v6 ne trace pas la protection bankroll', pick.pickDecisionV6);
      assert((pick.pickDecisionV4.decisionReasonCodes || []).includes('capital_protection'), 'Code décision capital_protection absent', pick.pickDecisionV4);
    }
    if (pick.decisionCenter?.canBet === true) {
      assert(Number(pick.decisionCenter.stake || pick.stake || 0) <= 1.0001, 'Mise supérieure au plafond de récupération', pick);
    }
    assert(pick.matchSheetV3 && pick.matchSheetV3.schema === 'paris-sportif.match_sheet.v3', 'MatchSheet v3 absente', pick);
    assert(pick.matchSheetV3.summary && Array.isArray(pick.matchSheetV3.missingData), 'MatchSheet v3 incomplète', pick.matchSheetV3);
    assert(pick.matchSheetV4 && pick.matchSheetV4.schema === 'paris-sportif.match_sheet.v4', 'MatchSheet v4 absente', pick);
    assert(Array.isArray(pick.matchSheetV4.visibleSections) && Array.isArray(pick.matchSheetV4.hiddenSections), 'MatchSheet v4 sans sections visibles/cachées', pick.matchSheetV4);
    assert(pick.matchSheetV5 && pick.matchSheetV5.schema === 'paris-sportif.match_sheet.v5', 'MatchSheet v5 absente', pick);
    assert(Array.isArray(pick.matchSheetV5.requiredSections) && pick.matchSheetV5.sectionQuality, 'MatchSheet v5 incomplète', pick.matchSheetV5);
    assert(pick.matchSheetV6 && pick.matchSheetV6.schema === 'paris-sportif.match_sheet.v6', 'MatchSheet v6 absente', pick);
    assert(pick.matchSheetV6.sportTemplate && Array.isArray(pick.matchSheetV6.sectionCompleteness), 'MatchSheet v6 incomplète', pick.matchSheetV6);
    assert(pick.segmentValidation && Number(pick.segmentValidation.realConfidence || 0) > 0, 'Pick sans validation historique réelle', pick);
    assert(Number(pick.adjustedConfidence || 0) > 0, 'Pick sans confiance ajustée', pick);
    assert(pick.winamaxBetType && pick.winamaxBetType.label, 'Pick sans type de pari Winamax conseillé', pick);
    assert(pick.safeAssessment && pick.safeAssessment.status, 'Pick sans filtre fiable et safe', pick);
    if (pick.limitedConfidence) {
      const isTwoGoalWinamaxPromotion = String(pick.safeAssessment?.reliableRule || '').startsWith('2-0')
        && pick.winamaxTwoGoalRule?.eligible
        && Number(pick.winamaxTwoGoalRule?.leadTwoProbability || 0) >= 0.35
        && Number(pick.contextQuality?.score ?? pick.match?.context?.quality?.score ?? 0) >= 75;
      assert(isTwoGoalWinamaxPromotion || (!pick.decisionCenter.canBet && Number(pick.stake || 0) === 0), 'Confiance limitée actionnable hors filet 2-0 Winamax', pick);
      assert(isTwoGoalWinamaxPromotion || (pick.safeAssessment.status !== 'reliable' && !pick.safeAssessment.reliable), 'Confiance limitée fiable hors filet 2-0 Winamax', pick);
    }
    assert(Number(pick.safeEdge || pick.edge || 0) >= 0.01, 'Pick sans edge prudent positif', pick);
    const safeSample = Number(pick.safeAssessment?.sample ?? pick.segmentValidation?.sample ?? 0) || 0;
    const safeRoi = Number(pick.safeAssessment?.roi ?? pick.segmentValidation?.roi ?? 0);
    const twoGoalSafetyOverride = String(pick.safeAssessment?.reliableRule || '').startsWith('2-0')
      && pick.winamaxTwoGoalRule?.eligible
      && Number(pick.winamaxTwoGoalRule?.leadTwoProbability || 0) >= 0.35
      && Number(pick.contextQuality?.score ?? pick.match?.context?.quality?.score ?? 0) >= 75
      && safeSample >= 15
      && Number.isFinite(safeRoi)
      && safeRoi > -0.16;
    assert(!(pick.safeAssessment?.reliable && safeSample >= 15 && Number.isFinite(safeRoi) && safeRoi < 0 && !twoGoalSafetyOverride), 'Pick fiable malgré segment historique négatif', {
      id: pick.id,
      label: pick.label,
      market: pick.market,
      sample: safeSample,
      roi: safeRoi,
      safeAssessment: pick.safeAssessment
    });
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
  const complexDashboard = (analysis.dashboardPicks || []).filter((pick) => !isSimpleDashboardMarket(pick));
  const drawDashboard = (analysis.dashboardPicks || []).filter(isDrawDashboardPick);
  const pastDashboard = (analysis.dashboardPicks || []).filter((pick) => !isFuturePick(pick));
  const exposedAlternatives = [...(analysis.picks || []), ...(analysis.dashboardPicks || [])]
    .filter((pick) => pick?.isMarketAlternative);
  const complexAlternatives = exposedAlternatives.filter((pick) => !isSimpleDashboardMarket(pick) || isDrawDashboardPick(pick));
  const actionableAlternatives = exposedAlternatives.filter((pick) => pick?.decisionCenter?.canBet === true || Number(pick?.stake || 0) > 0);
  const unsafeActionableAlternatives = actionableAlternatives.filter((pick) => !isActionableSimpleAlternative(pick));
  assert(analysis.dashboardPicks.length >= 10, 'Moins de 10 paris simples dans le cockpit', analysis.dashboardPicks);
  assert(analysis.dashboardPicks.length <= 30, 'Le cockpit standard dépasse la limite simple de 30 paris', analysis.dashboardPicks.length);
  assert(complexDashboard.length === 0, 'Marché complexe exposé dans le cockpit standard', complexDashboard);
  assert(drawDashboard.length === 0, 'Match nul exposé dans le cockpit standard', drawDashboard.map((pick) => ({ title: pick.title, market: pick.market, label: pick.label })));
  assert(pastDashboard.length === 0, 'Le cockpit expose un match déjà commencé', pastDashboard.map((pick) => ({ title: pick.title, market: pick.market, start: pick.start })));
  assert(complexAlternatives.length === 0, 'Alternative complexe exposée en mode standard', complexAlternatives.map((pick) => ({ title: pick.title, market: pick.market, label: pick.label })));
  assert(unsafeActionableAlternatives.length === 0, 'Alternative marché dangereuse avec bouton Je mise ou mise positive', unsafeActionableAlternatives.map((pick) => ({ title: pick.title, market: pick.market, label: pick.label, stake: pick.stake, canBet: pick.decisionCenter?.canBet, source: pick.marketCandidate?.source, primaryMarket: pick.primaryMarket })));
  assert(Number(analysis.dashboardMeta?.qualityPolicy?.maxDashboardRows || 0) === 30, 'Limite cockpit v2.1.8 absente', analysis.dashboardMeta?.qualityPolicy);
  assert(topRanks.length >= 5, 'Top 5 prioritaire absent du cockpit', topRanks);
  assert(Number(analysis.dashboardPicks?.[0]?.priorityRank || 0) === 1, 'Le premier pick dashboard doit être le #1 prioritaire', analysis.dashboardPicks?.[0]);
  assert(String(analysis.dashboardPicks?.[0]?.priorityLabel || '').includes('TOP'), 'Le #1 doit porter le badge TOP PICK', analysis.dashboardPicks?.[0]);
  const sourceWinnerPicks = (analysis.picks || []).filter((pick) => dashboardMarketGroup(pick) === 'winner' && isSimpleDashboardMarket(pick) && isFuturePick(pick));
  const dashboardWinners = (analysis.dashboardPicks || []).filter((pick) => dashboardMarketGroup(pick) === 'winner');
  const readyDashboardWinners = dashboardWinners.filter((pick) => pick.decisionCenter?.canBet === true);
  if (sourceWinnerPicks.length >= 8) {
    assert(dashboardWinners.length >= Math.min(12, Math.ceil(analysis.dashboardPicks.length * 0.35)), 'Pas assez de Vainqueurs dans le cockpit malgré le stock disponible', {
      available: sourceWinnerPicks.length,
      dashboardWinners: dashboardWinners.length,
      total: analysis.dashboardPicks.length,
      marketCounts: analysis.dashboardMeta?.qualityPolicy?.marketCounts
    });
    if (readyDashboardWinners.length < 2) {
      const blockedForQuality = dashboardWinners.filter((pick) => pick.decisionCenter?.canBet !== true).every((pick) => {
        const reason = String([
          pick.decisionCenter?.mainReason,
          pick.prebetGate?.first,
          pick.safeAssessment?.status,
          pick.segmentValidation?.tone,
          pick.segmentValidation?.label
        ].filter(Boolean).join(' ')).toLowerCase();
        return Number(pick.edge || 0) <= 0
          || pick.safeAssessment?.reliable !== true
          || /contexte|froid|cold|historique|confiance limit|nuit|robuste|roi -|garde-fou/.test(reason);
      });
      assert(blockedForQuality, 'Vainqueurs non misables sans raison qualité claire', {
        available: sourceWinnerPicks.length,
        readyDashboardWinners: readyDashboardWinners.length,
        blocked: dashboardWinners.filter((pick) => pick.decisionCenter?.canBet !== true).slice(0, 8).map((pick) => ({
          title: pick.title,
          label: pick.label,
          edge: pick.edge,
          safe: pick.safeAssessment?.status,
          reliable: pick.safeAssessment?.reliable,
          reason: pick.decisionCenter?.mainReason,
          segment: pick.segmentValidation?.label
        }))
      });
    }
  }
  assert(!(analysis.dashboardPicks || []).some((pick) => pick.status === 'bet' && pick.decisionCenter?.canBet !== true), 'Pick non misable encore marqué bet', (analysis.dashboardPicks || []).filter((pick) => pick.status === 'bet' && pick.decisionCenter?.canBet !== true).slice(0, 5));
  const relaxedTodayCoverage = Boolean(analysis.dashboardMeta?.qualityPolicy?.todayCapRelaxed);
  assert(Array.from(perMatch.values()).every((count) => count <= (relaxedTodayCoverage ? 3 : 2)), 'Dashboard expose trop de picks sur un même match', Array.from(perMatch.entries()).filter(([, count]) => count > (relaxedTodayCoverage ? 3 : 2)));
  const today = analysis.todayFunnel?.today || {};
  if (Number(today.bookableEvents || 0) >= 20 && Number(today.simpleReady || 0) >= 5) {
    assert(Number(today.displayed || 0) >= 5, 'Moins de 5 paris simples affichés aujourd’hui malgré une offre Winamax suffisante', today);
  }
  if (Number(today.bookableEvents || 0) >= 20 && Number(today.positiveSimplePassingFilters || 0) >= 10) {
    assert(Number(today.displayed || 0) >= 10, 'Moins de 10 opportunités simples affichées aujourd’hui malgré 10+ signaux simples positifs', today);
  }
  // Sprint 92 — le terrain du 17/05 montre un snapshot tres riche mais strict :
  // 30 lignes cockpit, beaucoup d'observation, seulement 2-3 vrais boutons
  // "Je mise". C'est sain si la watchlist reste visible et si le diagnostic
  // apparait quand il n'y a plus aucun pick prêt.
  const capitalProtectionActive = Number(analysis.decisionCenter?.summary?.capital_protection || 0) > 0;
  const requiredReady = capitalProtectionActive ? 0 : analysis.decisionCenter?.summary?.agent_blocked || prebetBlocked || criticalBlocked ? 1 : 3;
  assert(Number(analysis.decisionCenter?.summary?.ready || 0) >= requiredReady, 'Trop peu de paris utilisateurs prêts pour l’état de garde-fou', analysis.decisionCenter?.summary);
  assert(readyUserPicks.length >= requiredReady, 'Trop peu de paris prêts visibles dans la sélection', readyUserPicks);

  assert(analysis.agent && analysis.agent.guard, 'Snapshot agent absent', analysis.agent);
  assert(!Object.keys(analysis.agent).some((key) => /^v(?:[5-9]|1[0-6])/.test(key)), 'Anciennes gates versionnées ne doivent plus bloquer l’agent', analysis.agent);

  return analysis;
}

testUtils();
const analysis = testAnalysis();
console.log(`Desktop engine contract OK: ${analysis.matches.length} matchs, ${analysis.picks.length} picks, ${analysis.dashboardPicks.length} paris simples dashboard, ${(analysis.agent?.positions || []).length} positions agent.`);

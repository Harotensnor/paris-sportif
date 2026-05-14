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
  const suffix = details ? ` ${JSON.stringify(details)}` : '';
  throw new Error(`${message}${suffix}`);
}

function assert(condition, message, details) {
  if (!condition) fail(message, details);
}

function daySums(rows) {
  const sums = new Map();
  for (const row of rows) {
    sums.set(row.day, (sums.get(row.day) || 0) + Number(row.stake || 0));
  }
  return sums;
}

function testModelUtils() {
  const lineups = {
    'fcbarcelona|realbetis': {
      league_code: 'esp.1',
      date: '2026-05-12T18:00Z',
      home: {
        team: 'FC Barcelona',
        confirmed: false,
        starters: [{ name: 'Avant Centre', position: 'F' }]
      },
      away: {
        team: 'Real Betis',
        confirmed: false,
        starters: [{ name: 'Milieu', position: 'M' }]
      }
    }
  };
  lineups['fcbarcelona|realbetis'].sofa_event_id = 12345;

  const exactMatch = {
    sport: 'football',
    league_code: 'esp.1',
    date: '2026-05-12T18:05Z',
    competitors: [
      { home_away: 'home', name: 'Barcelona' },
      { home_away: 'away', name: 'Real Betis' }
    ]
  };
  const exact = modelUtils.findLineupForMatch(lineups, exactMatch);
  assert(exact && exact.lineupMatchType === 'exact_time', 'Lineup exact non détecté par alias/date');
  const exactAttached = modelUtils.matchWithLineups(exactMatch, exact);
  assert(modelUtils.hasExactLineup(exactAttached), 'Lineup exact non attaché au match');

  const exactById = modelUtils.findLineupForMatch(lineups, {
    sport: 'football',
    league_code: 'esp.1',
    id: 'sofa_12345',
    date: '2026-05-20T18:00Z',
    competitors: [
      { home_away: 'home', name: 'Barcelona' },
      { home_away: 'away', name: 'Real Betis' }
    ]
  });
  assert(exactById && exactById.lineupMatchType === 'exact_id', 'Lineup exact_id non détecté par id Sofascore');

  const stalePair = modelUtils.findLineupForMatch(lineups, {
    sport: 'football',
    league_code: 'esp.1',
    date: '2026-05-20T18:00Z',
    competitors: [
      { home_away: 'home', name: 'Barcelona' },
      { home_away: 'away', name: 'Real Betis' }
    ]
  });
  assert(stalePair && stalePair.lineupMatchType === 'team_projection', 'Lineup trop éloignée ne doit pas être exact_time');

  const projectionMatch = {
    sport: 'football',
    league_code: 'esp.1',
    date: '2026-05-12T20:00Z',
    competitors: [
      { home_away: 'home', name: 'Barcelona' },
      { home_away: 'away', name: 'Osasuna' }
    ]
  };
  const projected = modelUtils.findLineupForMatch(lineups, projectionMatch);
  assert(projected && projected.lineupMatchType === 'team_projection', 'Projection lineup non détectée');
  const projectedAttached = modelUtils.matchWithLineups(projectionMatch, projected);
  assert(modelUtils.hasProjectedLineup(projectedAttached), 'Projection lineup non attachée au match');

  const referee = modelUtils.normalizeRefereeForModel({
    league_code: 'esp.1',
    referee_context: { cards_per_match: 5.4, sample_size: 18, assignmentConfirmed: false }
  });
  assert(referee && referee.leagueAverage && referee.cardsPerGame === 5.4, 'Contexte arbitre non normalisé', referee);

  const coverage = modelUtils.buildSignalCoverage([
    { sport: 'football', weather: { temperature: 12 }, h2h: { total: 3 }, context: { quality: { score: 82 } }, competitors: [{ lineup: { exactMatch: true }, xg_for_avg: 1.6 }] },
    { sport: 'football', referee_context: { cards_per_match: 4.8 }, context: { quality: { score: 48 } }, competitors: [{ lineup: { projected: true }, xg_stats: { xg_l10: 1.2 } }] }
  ]);
  assert(coverage.football === 2, 'Coverage football invalide', coverage);
  assert(coverage.lineupsExact === 1 && coverage.lineupProfiles === 1, 'Coverage lineups détaillée invalide', coverage);
  assert(coverage.refereeUsable === 1 && coverage.weather === 1, 'Coverage signaux invalide', coverage);
  assert(coverage.h2h === 1 && coverage.xg === 2, 'Coverage H2H/xG invalide', coverage);
  assert(coverage.context === 2 && coverage.contextStrong === 1 && coverage.contextWeak === 1, 'Coverage contexte invalide', coverage);
}

function testBettingUtils() {
  const kelly = bettingUtils.kellyFraction(0.60, 2.10, 0.25, 0.10);
  assert(kelly > 0 && kelly <= 0.10, 'Kelly fractionné invalide', { kelly });
  assert(bettingUtils.kellyFraction(0.40, 2.00, 0.25, 0.10) === 0, 'Kelly négatif non bloqué');

  const stake = bettingUtils.stakeFor(0.60, 2.10, 50);
  assert(stake > 0 && stake <= 5, 'Mise user hors cap 10%', { stake });

  const positions = bettingUtils.buildAgentPositions([
    { id: 'a', title: 'A - B', status: 'bet', edge: 0.20, probability: 0.65, odd: 2.20, start: '2026-05-12T18:00Z', market: '1N2', label: 'A', contextGate: { gate: 'bet', agentEligible: true }, stakeAdjustment: { applied: true, factor: 0.5, reasons: ['test prudence'] } },
    { id: 'b', title: 'C - D', status: 'bet', edge: 0.18, probability: 0.64, odd: 2.15, start: '2026-05-12T19:00Z', market: '1N2', label: 'C', contextGate: { gate: 'bet', agentEligible: true } },
    { id: 'c', title: 'E - F', status: 'bet', edge: 0.16, probability: 0.63, odd: 2.10, start: '2026-05-12T20:00Z', market: '1N2', label: 'E', contextGate: { gate: 'bet', agentEligible: true } },
    { id: 'd', title: 'G - H', status: 'bet', edge: 0.30, probability: 0.70, odd: 2.30, start: '2026-05-12T21:00Z', market: '1N2', label: 'G', contextGate: { gate: 'watch', agentEligible: false } }
  ]);
  assert(positions.length > 0, 'Positions agent non générées');
  assert(!positions.some((pos) => pos.id === 'd'), 'Position agent avec contexte bloqué non filtrée', positions);
  for (const pos of positions) assert(pos.stake >= 0.10 && pos.stake <= 1.0001, 'Cap agent invalide', pos);
  const reduced = positions.find((pos) => pos.id === 'a');
  assert(reduced && reduced.stake < 0.55 && reduced.stakeAdjustment?.applied, 'Réduction de mise agent non appliquée', positions);
  const exposure = bettingUtils.summarizeExposure(positions, 10);
  assert(exposure.totalStake > 0 && exposure.maxDailyPct <= 0.2001, 'Exposition agent invalide', exposure);
  const drawdown = bettingUtils.computeDrawdown([10, 12, 9, 11]);
  assert(drawdown.amount === 3 && drawdown.pct === 0.25, 'Drawdown agent invalide', drawdown);

  const snapshot = bettingUtils.agentSnapshotFromReplay(
    { nav: 8, deltaPct7: -0.35, scorableRaw: [1, 2], series: [10, 8], ydayStats: {} },
    positions,
    () => ({ status: 'paused', label: 'Pause test' })
  );
  assert(snapshot.positions.length === 0 && snapshot.blockedPositions.length === positions.length, 'Garde-fou agent non appliqué', snapshot);
  assert(snapshot.blockedExposure.count === positions.length && snapshot.exposure.count === 0, 'Exposition bloquée non remontée', snapshot);
  assert(snapshot.drawdown.amount === 2, 'Drawdown snapshot non remonté', snapshot);
}

function testContextUtils() {
  const baseRow = {
    id: 'ctx1',
    title: 'A - B',
    status: 'bet',
    statusLabel: 'Priorité',
    stake: 1,
    edge: 0.12,
    probability: 0.6,
    odd: 2.1,
    marketKey: '1n2',
    match: {
      context: {
        quality: {
          score: 78,
          gate: 'bet',
          agent_eligible: true,
          missing: [],
          stale: [],
          critical_missing: []
        }
      }
    }
  };
  const strong = contextUtils.applyContextGate(baseRow);
  assert(strong.status === 'bet' && strong.contextGate.agentEligible === true, 'Contexte fort ne doit pas bloquer le bet', strong);
  assert(strong.confidenceTrust && strong.confidenceTrust.score >= 50, 'Confiance de confiance absente', strong);

  const watch = contextUtils.applyContextGate({
    ...baseRow,
    match: { context: { quality: { score: 58, gate: 'watch', missing: ['lineups'], stale: [], critical_missing: [] } } }
  });
  assert(watch.status === 'watch' && watch.contextGate.agentEligible === false, 'Lineup proche manquante doit dégrader en watch', watch);

  const skip = contextUtils.applyContextGate({
    ...baseRow,
    match: { context: { quality: { score: 35, gate: 'skip', missing: ['odds'], stale: [], critical_missing: ['odds_missing'] } } }
  });
  assert(skip.status === 'skip' && skip.stake === 0, 'Contexte critique doit bloquer la mise', skip);

  const missing = contextUtils.applyContextGate({ ...baseRow, match: {} });
  assert(missing.status === 'watch' && missing.contextGate.agentEligible === false, 'Contexte absent doit bloquer agent et passer watch', missing);

  const annotated = contextUtils.annotateConfidence(strong, {
    by_market: [{ key: '1n2', count: 80, roi: 0.08, brier: 0.21, sample_level: 'moyen' }]
  });
  assert(annotated.confidenceTrust.marketBacktest && annotated.confidenceTrust.score >= strong.confidenceTrust.score, 'Backtest marché non intégré à la confiance', annotated);
}

function testContentUtils() {
  const adapters = {
    cleanTitle: (value, fallback) => String(value || fallback).trim(),
    cleanLabel: (value, fallback = '') => String(value || fallback).trim(),
    getTeamNames: (match) => ({ home: match.home || 'Home', away: match.away || 'Away' }),
    formatMarketName: (value) => String(value || '1N2').toUpperCase(),
    normalizePickLabel: (_match, _market, value, fallback) => String(value || fallback)
  };
  const combines = contentUtils.normalizeCombines([{
    title: ' Ticket test ',
    legs: [{
      m: { id: 'm1', home: 'A', away: 'B', sport: 'football', league_code: 'test', date: '2026-05-12T18:00Z' },
      marketPick: { market: '1n2', label: 'A', odd: 2.1, prob: 0.6, edge: 0.12 },
      rel: 0.6
    }]
  }], adapters);
  assert(combines.length === 1 && combines[0].legs.length === 1, 'Normalisation combinés invalide', combines);
  assert(combines[0].totalOdd > 2, 'Cote combiné recalculée invalide', combines[0]);

  const fakeWin = {
    predictMatch: () => ({ reliability: 0.58 }),
    predictLikelyScorers: () => [{ name: 'Avant Centre', pos: 'F', prob: 0.24, teamName: 'A' }]
  };
  const scorers = contentUtils.buildNativeScorers(fakeWin, [{
    id: 'm1',
    sport: 'football',
    completed: false,
    home: 'A',
    away: 'B',
    date: new Date(Date.now() + 24 * 60 * 60000).toISOString(),
    context: { quality: { score: 82 } },
    winamax: { url: 'https://www.winamax.fr/', full_market_keys: ['buteur'] }
  }], {
    lineupsIndex: {},
    starPlayersIndex: {},
    findLineupForMatch: () => null,
    matchWithLineups: (match) => match,
    fallbackScorersFromStars: () => [],
    getTeamNames: adapters.getTeamNames,
    cleanLabel: adapters.cleanLabel
  });
  assert(scorers.length === 1 && Math.abs(scorers[0].probability - 0.24) < 0.0001, 'Normalisation buteurs invalide', scorers);
  assert(scorers[0].playerQuality && Number(scorers[0].playerQuality.score) >= 70, 'Qualité buteur absente ou trop faible', scorers);
}

function testHistoryUtils() {
  const history = historyUtils.normalizeHistorySummary({
    generated_at: '2026-05-12T18:00:00Z',
    total: 3,
    pending: 1,
    settled: 2,
    won: 1,
    lost: 1,
    void: 0,
    win_rate: 0.5,
    flat_pnl_units: 0.2,
    flat_roi: 0.1,
    by_day: [{
      date: '2026-05-12',
      total: 3,
      pending: 1,
      won: 1,
      lost: 1,
      picks: [
        { result: 'pending', score_quality: 65, edge: 0.04, home: 'A', away: 'B' },
        { result: 'won', kickoff_utc: '2026-05-12T17:00:00Z', home: 'C', away: 'D', market_key: '1n2', odd_book: 2.1, prob_model: 0.56 },
        { result: 'lost', kickoff_utc: '2026-05-12T15:00:00Z', home: 'E', away: 'F', market_key: 'ou', odd_book: 1.9, prob_model: 0.54 }
      ]
    }]
  });
  assert(history.total === 3 && history.pendingTop.length === 1 && history.recentSettled.length === 2, 'Historique normalisé invalide', history);
  assert(history.calibration && history.calibration.settled === 2, 'Calibration historique absente', history.calibration);

  const balance = historyUtils.agentBalance({
    nav: 11.2,
    delta7: 1.2,
    deltaPct7: 0.12,
    guard: { status: 'active', label: 'Actif' },
    positions: [{ id: 'x' }],
    exposure: { maxDailyStake: 0.5 },
    drawdown: { amount: 1 }
  });
  assert(balance.status === 'active' && balance.positions === 1 && balance.drawdown.amount === 1, 'Bilan agent invalide', balance);
}

function testQualityUtils() {
  const alerts = qualityUtils.buildQualityAlerts({
    status: 'stale',
    ageMinutes: 260,
    warnings: ['lineup source retained'],
    health: {
      qualityChecks: { winamax_detailed_ratio: 0.72 },
      sources: {
        weather: { age_min: 310 },
        lineups_soccer: { age_min: 95 }
      }
    }
  });
  assert(alerts.some((alert) => alert.title === 'Données à rafraîchir'), 'Alerte fraîcheur absente', alerts);
  assert(alerts.some((alert) => alert.title === 'Marchés détaillés faibles'), 'Alerte marchés absente', alerts);
  assert(alerts.some((alert) => alert.title === 'Météo ancien'), 'Alerte source météo absente', alerts);

  const ok = qualityUtils.buildQualityAlerts({ status: 'fresh', ageMinutes: 12, health: { qualityChecks: {}, sources: {} } });
  assert(ok.length === 1 && ok[0].tone === 'ok', 'Fallback qualité OK invalide', ok);
}

function testCalibrationUtils() {
  const rows = [
    { result: 'won', sport: 'football', league: 'Cold League', market_key: '1n2', odd_book: 2.0, prob_model: 0.6, edge: 0.1, context_tier: 'faible', context_score: 48 },
    { result: 'lost', sport: 'football', league: 'Cold League', market_key: '1n2', odd_book: 2.0, prob_model: 0.6, edge: 0.1, context_tier: 'faible', context_score: 48 },
    { result: 'lost', sport: 'football', league: 'Cold League', market_key: '1n2', odd_book: 2.0, prob_model: 0.6, edge: 0.1, context_tier: 'faible', context_score: 48 },
    { result: 'lost', sport: 'football', league: 'Cold League', market_key: 'ou', odd_book: 2.0, prob_model: 0.6, edge: 0.1, context_tier: 'fort', context_score: 84 }
  ];
  const calibration = calibrationUtils.buildCalibration(rows, { minSamples: 2 });
  assert(calibration.byMarket['1n2'].count === 3, 'Bucket marché calibration invalide', calibration);
  assert(calibration.byContextTier.faible.count === 3, 'Bucket contexte calibration invalide', calibration);
  assert(calibration.byMarketContext['1n2:faible'].count === 3, 'Bucket marché+contexte invalide', calibration);
  assert(calibration.byEdgeBucket.edge_10_20.count === 4, 'Bucket edge calibration invalide', calibration);
  const assessed = calibrationUtils.assessPick({ market: '1N2', sport: 'football', league: 'Cold League', edge: 0.03, contextQuality: { tier: 'faible', score: 48 } }, calibration);
  assert(assessed.marketKey === '1n2' && assessed.sample === 3, 'Assessment calibration invalide', assessed);
  assert(assessed.marketContext && assessed.marketContext.sample === 3 && assessed.minEdge > 0.03, 'Assessment contexte/marché invalide', assessed);
  assert(assessed.blocked && assessed.mode === 'reinforced_caution', 'Prudence renforcée calibration absente', assessed);
  const annotated = calibrationUtils.annotateMatches([{ market: '1N2', sport: 'football', edge: 0.03, stake: 1, status: 'bet', statusLabel: 'Priorité', contextQuality: { tier: 'faible', score: 48 } }], calibration);
  assert(annotated[0].calibration && annotated[0].calibration.sample === 3, 'Annotation calibration absente', annotated);
}

function main() {
  testModelUtils();
  testBettingUtils();
  testContentUtils();
  testHistoryUtils();
  testQualityUtils();
  testCalibrationUtils();
  testContextUtils();
  const engine = createLegacyEngineService({ projectRoot: process.cwd() });
  try {
    const analysis = engine.getAnalysis({ bankroll: 50 });
    assert(analysis && analysis.ok, 'Analyse moteur absente');
    assert(analysis.counts.matches > 0, 'Aucun match analysé');
    assert(Array.isArray(analysis.matches), 'Liste matchs absente');
    assert(Array.isArray(analysis.picks), 'Liste picks absente');
    assert(Array.isArray(analysis.dashboardPicks), 'Dashboard picks absent');
    assert(analysis.calibration && analysis.calibration.settled >= 0, 'Calibration analyse absente', analysis.calibration);
    assert(analysis.calibration.byMarketContext && Array.isArray(analysis.calibration.marketContexts), 'Calibration marché+contexte absente', analysis.calibration);
    assert(Array.isArray(analysis.watchlist), 'Watchlist absente', analysis.watchlist);
    assert(analysis.prematchPlan && Number(analysis.prematchPlan.autoDue || 0) >= 0, 'Plan pré-match absent', analysis.prematchPlan);

    const seen = new Set();
    for (const pick of analysis.picks) {
      assert(Number(pick.odd) > 1, 'Pick avec cote invalide', pick);
      assert(Number(pick.probability) > 0 && Number(pick.probability) <= 1, 'Pick avec probabilité invalide', pick);
      assert(Number(pick.edge) > 0, 'Pick sans edge positif', pick);
      assert(Number(pick.stake) > 0, 'Pick sans mise positive', pick);
      assert(pick.calibration && pick.calibration.label, 'Pick sans diagnostic calibration', pick);
      assert(pick.contextGate && pick.contextQuality, 'Pick sans diagnostic contexte', pick);
      assert(pick.confidenceTrust && Number.isFinite(Number(pick.confidenceTrust.score)), 'Pick sans confiance de confiance', pick);
      assert(pick.marketProfile && Number.isFinite(Number(pick.marketProfile.familyCount || 0)), 'Pick sans profil marchés', pick);
      assert(pick.contextGate.gate !== 'skip', 'Pick exposé malgré contexte skip', pick);
      const key = `${pick.id}:${pick.market}:${pick.label}`;
      assert(!seen.has(key), 'Pick dupliqué', { key });
      seen.add(key);
    }

    if (analysis.dashboardMeta?.mode === 'next30h') {
      const now = Date.now();
      const horizon = now + 30 * 60 * 60000;
      for (const pick of analysis.dashboardPicks) {
        const ts = Date.parse(pick.start || '');
        assert(Number.isFinite(ts) && ts >= now - 30 * 60000 && ts <= horizon, 'Dashboard hors fenêtre 30h', pick);
      }
    }

    const coverage = analysis.coverage || {};
    assert(Number(coverage.football || 0) >= 0, 'Coverage signaux invalide', coverage);
    if (Number(coverage.refereeContext || 0) > 0) {
      assert(Number(coverage.refereeUsable || 0) >= Number(coverage.refereeContext || 0), 'Contexte arbitre non rendu utilisable', coverage);
    }
    for (const key of ['weather', 'h2h', 'xg']) {
      assert(Number.isFinite(Number(coverage[key] || 0)), `Coverage ${key} non numérique`, coverage);
      assert(Number(coverage[key] || 0) <= Number(coverage.football || 0), `Coverage ${key} dépasse le football`, coverage);
    }
    assert(Number.isFinite(Number(coverage.context || 0)), 'Coverage contexte non numérique', coverage);
    if (analysis.counts.matches > 0) {
      assert(analysis.context && Number(analysis.context.matches || 0) > 0, 'Résumé contexte absent', analysis.context);
      assert(Array.isArray(analysis.signalGaps), 'Signal gaps absents', analysis.signalGaps);
      assert(analysis.contextBacktest && Number(analysis.contextBacktest.settledUsed || 0) > 0, 'Backtest contexte absent', analysis.contextBacktest);
      assert(analysis.decisionBacktest && Number(analysis.decisionBacktest.settledUsed || 0) > 0, 'Backtest décision absent', analysis.decisionBacktest);
      assert(analysis.decisionTuning && analysis.decisionTuning.policy, 'Réglage décision absent', analysis.decisionTuning);
      assert(analysis.decisionShadow && analysis.decisionShadow.summary, 'Shadow décision absent', analysis.decisionShadow);
      assert(analysis.oddsGuardrails && analysis.oddsGuardrails.policy, 'Garde-fous cotes absents', analysis.oddsGuardrails);
      assert(analysis.agentBlockerBacktest && analysis.agentBlockerBacktest.summary, 'Backtest blocages agent absent', analysis.agentBlockerBacktest);
      assert(analysis.agentGuardrailRecommendations && analysis.agentGuardrailRecommendations.summary, 'Conseils garde-fous agent absents', analysis.agentGuardrailRecommendations);
      assert(analysis.stakeReductionBacktest && analysis.stakeReductionBacktest.summary, 'Backtest réduction de mise absent', analysis.stakeReductionBacktest);
      assert(analysis.signalConflictBacktest && analysis.signalConflictBacktest.summary, 'Backtest conflits signaux absent', analysis.signalConflictBacktest);
      assert(analysis.prebetChecklist && analysis.prebetChecklist.summary, 'Checklist avant mise absente', analysis.prebetChecklist);
      assert(analysis.scorerQuality && analysis.scorerQuality.summary, 'Rapport qualité buteurs absent', analysis.scorerQuality);
      assert(analysis.scorerCandidates && Number(analysis.scorerCandidates.history_rows || 0) >= 0, 'Archive candidats buteurs absente', analysis.scorerCandidates);
      assert(analysis.scorerSettlement && Number(analysis.scorerSettlement.history_rows || 0) >= 0, 'Settlement candidats buteurs absent', analysis.scorerSettlement);
      assert(analysis.scorerPendingAudit && analysis.scorerPendingAudit.summary, 'Audit pending buteurs absent', analysis.scorerPendingAudit);
      assert(analysis.prematchFocus && analysis.prematchFocus.summary, 'Focus pré-match absent', analysis.prematchFocus);
      assert(analysis.prematchExecution && analysis.prematchExecution.summary, 'Plan exécution pré-match absent', analysis.prematchExecution);
      assert(typeof analysis.prematchExecution.summary.final_gate === 'string', 'Gate final pré-match absent', analysis.prematchExecution.summary);
      assert(Number.isFinite(Number(analysis.prematchExecution.summary.blocking_steps || 0)), 'Étapes bloquantes pré-match invalides', analysis.prematchExecution.summary);
      assert(analysis.signalCoverageTrend && analysis.signalCoverageTrend.latest, 'Tendance couverture absente', analysis.signalCoverageTrend);
      assert(analysis.nextActions && analysis.nextActions.summary, 'Prochaines actions absentes', analysis.nextActions);
      assert(analysis.sourceFreshnessPlan && analysis.sourceFreshnessPlan.summary, 'Plan fraîcheur sources absent', analysis.sourceFreshnessPlan);
      assert(analysis.contextRepairPlan && analysis.contextRepairPlan.summary, 'Plan réparation contexte absent', analysis.contextRepairPlan);
      assert(analysis.refreshPriorityPlan && analysis.refreshPriorityPlan.summary, 'File refresh prioritaire absente', analysis.refreshPriorityPlan);
      assert(analysis.prebetChecklistBacktest && analysis.prebetChecklistBacktest.summary, 'Backtest checklist avant mise absent', analysis.prebetChecklistBacktest);
      assert(analysis.teamIdentityGraph && analysis.teamIdentityGraph.summary, 'Identity graph équipes absent', analysis.teamIdentityGraph);
      assert(analysis.matchDecisionTimeline && analysis.matchDecisionTimeline.summary, 'Timeline décision absente', analysis.matchDecisionTimeline);
      assert(analysis.agentBankrollSimulation && analysis.agentBankrollSimulation.summary, 'Simulation bankroll agent absente', analysis.agentBankrollSimulation);
      assert(analysis.smartPreparePlan && analysis.smartPreparePlan.summary, 'Plan préparation intelligent absent', analysis.smartPreparePlan);
      assert(analysis.sourceRegistry && analysis.sourceRegistry.summary, 'Registre sources absent', analysis.sourceRegistry);
      assert(analysis.sourceQuarantine && analysis.sourceQuarantine.summary, 'Quarantaine sources absente', analysis.sourceQuarantine);
      assert(analysis.optionalSourcesPlan && analysis.optionalSourcesPlan.summary, 'Plan sources optionnelles absent', analysis.optionalSourcesPlan);
      assert(analysis.criticalIssueReport && analysis.criticalIssueReport.summary, 'Rapport problèmes critiques absent', analysis.criticalIssueReport);
      assert(analysis.dataConsistencyReport && analysis.dataConsistencyReport.summary, 'Rapport cohérence données absent', analysis.dataConsistencyReport);
      assert(analysis.uiIntegrityReport && analysis.uiIntegrityReport.summary, 'Rapport intégrité UI absent', analysis.uiIntegrityReport);
      assert(analysis.pickIntegrityReport && analysis.pickIntegrityReport.summary, 'Rapport intégrité picks absent', analysis.pickIntegrityReport);
      assert(analysis.coverageRepairEngine && analysis.coverageRepairEngine.summary, 'Coverage Repair Engine absent', analysis.coverageRepairEngine);
      assert(analysis.sourceCoverageTargets && analysis.sourceCoverageTargets.summary, 'Objectifs couverture sources absents', analysis.sourceCoverageTargets);
      assert(analysis.leagueSignalQuality && analysis.leagueSignalQuality.summary, 'Qualité signaux par ligue absente', analysis.leagueSignalQuality);
      assert(analysis.modelLab && analysis.modelLab.summary, 'Model Lab absent', analysis.modelLab);
      assert(analysis.probabilityCalibration && analysis.probabilityCalibration.summary, 'Calibration probabilités absente', analysis.probabilityCalibration);
      assert(analysis.policyCandidates && analysis.policyCandidates.summary, 'Registre politiques candidates absent', analysis.policyCandidates);
      assert(analysis.sourceHealth && analysis.sourceHealth.summary, 'Source Health V4 absent', analysis.sourceHealth);
      assert(analysis.v5FixCampaign && analysis.v5FixCampaign.summary, 'Campagne correction V5 absente', analysis.v5FixCampaign);
      assert(analysis.v5DeadFileManifest && analysis.v5DeadFileManifest.summary, 'Manifeste fichiers morts V5 absent', analysis.v5DeadFileManifest);
      assert(analysis.v5PickReconciliation && analysis.v5PickReconciliation.summary, 'Réconciliation picks V5 absente', analysis.v5PickReconciliation);
      assert(analysis.v5UiBugReport && analysis.v5UiBugReport.summary, 'Rapport bugs UI V5 absent', analysis.v5UiBugReport);
      assert(analysis.v5RefreshRepairReport && analysis.v5RefreshRepairReport.summary, 'Rapport refresh V5 absent', analysis.v5RefreshRepairReport);
      assert(analysis.v5BacktestSanity && analysis.v5BacktestSanity.summary, 'Backtest sanity V5 absent', analysis.v5BacktestSanity);
      assert(analysis.v6CoverageBoost && analysis.v6CoverageBoost.summary, 'Coverage Boost V6 absent', analysis.v6CoverageBoost);
      assert(analysis.v6TeamMatchingFailures && analysis.v6TeamMatchingFailures.summary, 'Matching failures V6 absent', analysis.v6TeamMatchingFailures);
      assert(analysis.v6SourceGain && analysis.v6SourceGain.summary, 'Source gain V6 absent', analysis.v6SourceGain);
      assert(analysis.v6ProfitEngine && analysis.v6ProfitEngine.summary, 'Profit Engine V6 absent', analysis.v6ProfitEngine);
      assert(analysis.v6BacktestCleanRoom && analysis.v6BacktestCleanRoom.summary, 'Backtest Clean Room V6 absent', analysis.v6BacktestCleanRoom);
      assert(analysis.v6FinalBetTicket && analysis.v6FinalBetTicket.summary, 'Ticket final V6 absent', analysis.v6FinalBetTicket);
      assert(analysis.v6ControlRoom && analysis.v6ControlRoom.summary, 'Control Room V6 absent', analysis.v6ControlRoom);
      assert(analysis.v7RedToGreen && analysis.v7RedToGreen.summary, 'Red-To-Green V7 absent', analysis.v7RedToGreen);
      assert(analysis.v7ActionQueue && analysis.v7ActionQueue.summary, 'Action queue V7 absente', analysis.v7ActionQueue);
      assert(analysis.v7ActualCoverage && analysis.v7ActualCoverage.summary, 'Coverage réelle V7 absente', analysis.v7ActualCoverage);
      assert(analysis.v7SourceAbsence && analysis.v7SourceAbsence.summary, 'Absences sources V7 absentes', analysis.v7SourceAbsence);
      assert(analysis.v7EdgeRelease && analysis.v7EdgeRelease.summary, 'Edge Release V7 absent', analysis.v7EdgeRelease);
      assert(analysis.v7StakingPolicy && analysis.v7StakingPolicy.summary, 'Staking Policy V7 absente', analysis.v7StakingPolicy);
      assert(analysis.v8DecisionFeed && analysis.v8DecisionFeed.summary, 'Decision Feed V8 absent', analysis.v8DecisionFeed);
      assert(analysis.v8NowNextTicket && analysis.v8NowNextTicket.summary, 'Ticket now/next V8 absent', analysis.v8NowNextTicket);
      assert(analysis.v8CoverageRescue && analysis.v8CoverageRescue.summary, 'Coverage Rescue V8 absent', analysis.v8CoverageRescue);
      assert(analysis.v8ProxyStrength && analysis.v8ProxyStrength.summary, 'Proxy Strength V8 absent', analysis.v8ProxyStrength);
      assert(analysis.v8UiConsistency && analysis.v8UiConsistency.summary, 'Cohérence UI V8 absente', analysis.v8UiConsistency);
      assert(analysis.v8MatchSheet && analysis.v8MatchSheet.summary, 'Fiche match V8 absente', analysis.v8MatchSheet);
      assert(analysis.v8ControlRoom && analysis.v8ControlRoom.summary, 'Control Room V8 absente', analysis.v8ControlRoom);
      assert(analysis.v9ReadyUnlock && analysis.v9ReadyUnlock.summary, 'Ready Unlock V9 absent', analysis.v9ReadyUnlock);
      assert(analysis.v9BlockerMatrix && analysis.v9BlockerMatrix.summary, 'Blocker Matrix V9 absente', analysis.v9BlockerMatrix);
      assert(analysis.v9RepairExecution && analysis.v9RepairExecution.summary, 'Repair Execution V9 absent', analysis.v9RepairExecution);
      assert(analysis.v9CoverageAfterRepair && analysis.v9CoverageAfterRepair.summary, 'Coverage After Repair V9 absente', analysis.v9CoverageAfterRepair);
      assert(analysis.v9SourceBlockers && analysis.v9SourceBlockers.summary, 'Source Blockers V9 absents', analysis.v9SourceBlockers);
      assert(analysis.v9Finalizer && analysis.v9Finalizer.summary, 'Finalizer V9 absent', analysis.v9Finalizer);
      assert(analysis.v9FinalTicket && analysis.v9FinalTicket.summary, 'Final Ticket V9 absent', analysis.v9FinalTicket);
      assert(analysis.v9ProfitGate && analysis.v9ProfitGate.summary, 'Profit Gate V9 absent', analysis.v9ProfitGate);
      assert(analysis.v9ClvMarketPressure && analysis.v9ClvMarketPressure.summary, 'CLV Market Pressure V9 absent', analysis.v9ClvMarketPressure);
      assert(analysis.v10DecisionFeed && analysis.v10DecisionFeed.summary, 'Decision Feed V10 absent', analysis.v10DecisionFeed);
      assert(analysis.v10FinalBetTicket && analysis.v10FinalBetTicket.summary, 'Ticket final V10 absent', analysis.v10FinalBetTicket);
      assert(analysis.v10T10Gate && analysis.v10T10Gate.summary, 'Gate T-10 V10 absent', analysis.v10T10Gate);
      assert(analysis.v10BlockerResolution && analysis.v10BlockerResolution.summary, 'Résolution blocages V10 absente', analysis.v10BlockerResolution);
      assert(analysis.v10SignalRescue && analysis.v10SignalRescue.summary, 'Signal Rescue V10 absent', analysis.v10SignalRescue);
      assert(analysis.v10ExternalSourceLimits && analysis.v10ExternalSourceLimits.summary, 'Limites sources V10 absentes', analysis.v10ExternalSourceLimits);
      assert(analysis.v10RefreshObserver && analysis.v10RefreshObserver.summary, 'Refresh Observer V10 absent', analysis.v10RefreshObserver);
      assert(analysis.v10RefreshStageTimings && analysis.v10RefreshStageTimings.summary, 'Refresh timings V10 absents', analysis.v10RefreshStageTimings);
      assert(analysis.v10ProfitGuard && analysis.v10ProfitGuard.summary, 'Profit Guard V10 absent', analysis.v10ProfitGuard);
      assert(analysis.v10StakePolicy && analysis.v10StakePolicy.summary, 'Stake Policy V10 absente', analysis.v10StakePolicy);
      assert(analysis.v11ReadyUnlock && analysis.v11ReadyUnlock.summary, 'Ready Unlock V11 absent', analysis.v11ReadyUnlock);
      assert(analysis.v11T10Fast && analysis.v11T10Fast.summary, 'T-10 rapide V11 absent', analysis.v11T10Fast);
      assert(analysis.v11T10Blockers && analysis.v11T10Blockers.summary, 'Blocages T-10 V11 absents', analysis.v11T10Blockers);
      assert(analysis.v11NowTicket && analysis.v11NowTicket.summary, 'Ticket maintenant V11 absent', analysis.v11NowTicket);
      assert(analysis.v11RepairExecution && analysis.v11RepairExecution.summary, 'Réparation V11 absente', analysis.v11RepairExecution);
      assert(analysis.v11HealthReconciliation && analysis.v11HealthReconciliation.summary, 'Health reconciliation V11 absente', analysis.v11HealthReconciliation);
      assert(analysis.v11ProfitGuard && analysis.v11ProfitGuard.summary, 'Profit Guard V11 absent', analysis.v11ProfitGuard);
      assert(analysis.v11ControlRoom && analysis.v11ControlRoom.summary, 'Control Room V11 absente', analysis.v11ControlRoom);
      assert(analysis.v12PriceTargets && analysis.v12PriceTargets.summary, 'Price Targets V12 absents', analysis.v12PriceTargets);
      assert(analysis.v12MarketTiming && analysis.v12MarketTiming.summary, 'Market Timing V12 absent', analysis.v12MarketTiming);
      assert(analysis.v12ClvWatch && analysis.v12ClvWatch.summary, 'CLV Watch V12 absent', analysis.v12ClvWatch);
      assert(analysis.v12ValueRelease && analysis.v12ValueRelease.summary, 'Value Release V12 absent', analysis.v12ValueRelease);
      assert(analysis.v12NowTicket && analysis.v12NowTicket.summary, 'Ticket maintenant V12 absent', analysis.v12NowTicket);
      assert(analysis.v12ControlRoom && analysis.v12ControlRoom.summary, 'Control Room V12 absente', analysis.v12ControlRoom);
      assert(analysis.v13OddsIdentity && analysis.v13OddsIdentity.summary, 'Identity map V13 absent', analysis.v13OddsIdentity);
      assert(analysis.v13PriceMemory && analysis.v13PriceMemory.summary, 'Price Memory V13 absente', analysis.v13PriceMemory);
      assert(analysis.v13LineMovement && analysis.v13LineMovement.summary, 'Line Movement V13 absent', analysis.v13LineMovement);
      assert(analysis.v13PriceAlerts && analysis.v13PriceAlerts.summary, 'Alertes prix V13 absentes', analysis.v13PriceAlerts);
      assert(analysis.v13AlertQueue && analysis.v13AlertQueue.summary, 'Queue alertes V13 absente', analysis.v13AlertQueue);
      assert(analysis.v13T10Resolution && analysis.v13T10Resolution.summary, 'Résolution T-10 V13 absente', analysis.v13T10Resolution);
      assert(analysis.v13T10GateMatrix && analysis.v13T10GateMatrix.summary, 'Matrice T-10 V13 absente', analysis.v13T10GateMatrix);
      assert(analysis.v13FinalGate && analysis.v13FinalGate.summary, 'Gate final V13 absent', analysis.v13FinalGate);
      assert(analysis.v13ProfitGuard && analysis.v13ProfitGuard.summary, 'Profit Guard V13 absent', analysis.v13ProfitGuard);
      assert(analysis.v13EdgeExplainability && analysis.v13EdgeExplainability.summary, 'Explainability V13 absente', analysis.v13EdgeExplainability);
      assert(analysis.v13NowTicket && analysis.v13NowTicket.summary, 'Ticket maintenant V13 absent', analysis.v13NowTicket);
      assert(analysis.v13AgentGate && analysis.v13AgentGate.summary, 'Gate agent V13 absent', analysis.v13AgentGate);
      assert(analysis.v13ControlRoom && analysis.v13ControlRoom.summary, 'Control Room V13 absente', analysis.v13ControlRoom);
      assert(analysis.v13RefreshPerformance && analysis.v13RefreshPerformance.summary, 'Performance refresh V13 absente', analysis.v13RefreshPerformance);
      assert(analysis.v14FileAudit && analysis.v14FileAudit.summary, 'Audit fichiers V14 absent', analysis.v14FileAudit);
      assert(analysis.v14DeadReferences && analysis.v14DeadReferences.summary, 'Références mortes V14 absentes', analysis.v14DeadReferences);
      assert(analysis.v14ContentInventory && analysis.v14ContentInventory.summary, 'Inventaire contenu V14 absent', analysis.v14ContentInventory);
      assert(analysis.v14MathIntegrity && analysis.v14MathIntegrity.summary, 'Intégrité calculs V14 absente', analysis.v14MathIntegrity);
      assert(analysis.v14PickStateReconciliation && analysis.v14PickStateReconciliation.summary, 'Réconciliation picks V14 absente', analysis.v14PickStateReconciliation);
      assert(analysis.v14CrossViewConsistency && analysis.v14CrossViewConsistency.summary, 'Cohérence vues V14 absente', analysis.v14CrossViewConsistency);
      assert(analysis.v14CriticalResolution && analysis.v14CriticalResolution.summary, 'Résolution critiques V14 absente', analysis.v14CriticalResolution);
      assert(analysis.v14PrebetGate && analysis.v14PrebetGate.summary, 'Gate pré-bet V14 absent', analysis.v14PrebetGate);
      assert(analysis.v14SourceRepair && analysis.v14SourceRepair.summary, 'Réparation sources V14 absente', analysis.v14SourceRepair);
      assert(analysis.v14SignalTruth && analysis.v14SignalTruth.summary, 'Vérité signaux V14 absente', analysis.v14SignalTruth);
      assert(analysis.v14MatchingQuality && analysis.v14MatchingQuality.summary, 'Matching V14 absent', analysis.v14MatchingQuality);
      assert(analysis.v14SourceGapByMatch && analysis.v14SourceGapByMatch.summary, 'Source gaps V14 absents', analysis.v14SourceGapByMatch);
      assert(analysis.v14PriceAction && analysis.v14PriceAction.summary, 'Prix actionnables V14 absents', analysis.v14PriceAction);
      assert(analysis.v14RecheckSchedule && analysis.v14RecheckSchedule.summary, 'Recheck schedule V14 absent', analysis.v14RecheckSchedule);
      assert(analysis.v14ControlRoom && analysis.v14ControlRoom.summary, 'Control Room V14 absente', analysis.v14ControlRoom);
      assert(analysis.v15ActionCockpit && analysis.v15ActionCockpit.summary, 'Cockpit action V15 absent', analysis.v15ActionCockpit);
      assert(analysis.v15BetReadiness && analysis.v15BetReadiness.summary, 'Readiness V15 absente', analysis.v15BetReadiness);
      assert(analysis.v15HealthNoise && analysis.v15HealthNoise.summary, 'Santé V15 absente', analysis.v15HealthNoise);
      assert(analysis.v15SourceFixPlan && analysis.v15SourceFixPlan.summary, 'Plan sources V15 absent', analysis.v15SourceFixPlan);
      assert(analysis.v15CleanupSafety && analysis.v15CleanupSafety.summary, 'Nettoyage V15 absent', analysis.v15CleanupSafety);
      assert(analysis.v15ControlRoom && analysis.v15ControlRoom.summary, 'Control Room V15 absente', analysis.v15ControlRoom);
      assert(analysis.agentBlockers && analysis.agentBlockers.summary, 'Diagnostic blocages agent absent', analysis.agentBlockers);
      assert(Array.isArray(analysis.criticalIssueReport.issues), 'Issues critiques invalides', analysis.criticalIssueReport);
      assert(Array.isArray(analysis.coverageRepairEngine.actions), 'Actions coverage invalides', analysis.coverageRepairEngine);
      assert(Array.isArray(analysis.sourceCoverageTargets.targets), 'Targets coverage invalides', analysis.sourceCoverageTargets);
      assert(Array.isArray(analysis.modelLab.by_market), 'Segments Model Lab invalides', analysis.modelLab);
      assert(Array.isArray(analysis.v5FixCampaign.findings), 'Findings V5 invalides', analysis.v5FixCampaign);
      assert(Array.isArray(analysis.v5DeadFileManifest.items), 'Manifest fichiers morts V5 invalide', analysis.v5DeadFileManifest);
      assert(Array.isArray(analysis.v5PickReconciliation.issues), 'Réconciliation picks V5 invalide', analysis.v5PickReconciliation);
      assert(Array.isArray(analysis.v6CoverageBoost.sources), 'Sources Coverage Boost V6 invalides', analysis.v6CoverageBoost);
      assert(Array.isArray(analysis.v6TeamMatchingFailures.failures), 'Matching failures V6 invalides', analysis.v6TeamMatchingFailures);
      assert(Array.isArray(analysis.v6ProfitEngine.candidates), 'Candidats Profit Engine V6 invalides', analysis.v6ProfitEngine);
      assert(Array.isArray(analysis.v6BacktestCleanRoom.segments), 'Segments Clean Room V6 invalides', analysis.v6BacktestCleanRoom);
      assert(Array.isArray(analysis.v6FinalBetTicket.steps), 'Étapes T-10 V6 invalides', analysis.v6FinalBetTicket);
      assert(Array.isArray(analysis.v6ControlRoom.panels), 'Panneaux Control Room V6 invalides', analysis.v6ControlRoom);
      assert(Array.isArray(analysis.v7RedToGreen.findings), 'Findings Red-To-Green V7 invalides', analysis.v7RedToGreen);
      assert(Array.isArray(analysis.v7ActionQueue.queue), 'Queue V7 invalide', analysis.v7ActionQueue);
      assert(Array.isArray(analysis.v7ActualCoverage.sources), 'Sources coverage V7 invalides', analysis.v7ActualCoverage);
      assert(Array.isArray(analysis.v7SourceAbsence.absences), 'Absences sources V7 invalides', analysis.v7SourceAbsence);
      assert(Array.isArray(analysis.v7EdgeRelease.candidates), 'Candidats Edge Release V7 invalides', analysis.v7EdgeRelease);
      assert(Array.isArray(analysis.v7StakingPolicy.markets), 'Marchés Staking V7 invalides', analysis.v7StakingPolicy);
      assert(Array.isArray(analysis.v8DecisionFeed.decisions), 'Décisions V8 invalides', analysis.v8DecisionFeed);
      assert(Array.isArray(analysis.v8NowNextTicket.now), 'Ticket now V8 invalide', analysis.v8NowNextTicket);
      assert(Array.isArray(analysis.v8NowNextTicket.next), 'Ticket next V8 invalide', analysis.v8NowNextTicket);
      assert(Array.isArray(analysis.v8CoverageRescue.matches), 'Coverage rescue V8 invalide', analysis.v8CoverageRescue);
      assert(Array.isArray(analysis.v8ProxyStrength.proxies), 'Proxy strength V8 invalide', analysis.v8ProxyStrength);
      assert(Array.isArray(analysis.v8ControlRoom.cards), 'Cartes Control Room V8 invalides', analysis.v8ControlRoom);
      assert(Array.isArray(analysis.v9ReadyUnlock.rows), 'Rows V9 ready unlock invalides', analysis.v9ReadyUnlock);
      assert(Array.isArray(analysis.v9BlockerMatrix.matrix), 'Matrice V9 invalide', analysis.v9BlockerMatrix);
      assert(Array.isArray(analysis.v9RepairExecution.actions), 'Actions repair V9 invalides', analysis.v9RepairExecution);
      assert(Array.isArray(analysis.v9CoverageAfterRepair.sources), 'Sources coverage V9 invalides', analysis.v9CoverageAfterRepair);
      assert(Array.isArray(analysis.v9SourceBlockers.matches), 'Source blockers V9 invalides', analysis.v9SourceBlockers);
      assert(Array.isArray(analysis.v9Finalizer.steps), 'Étapes finalizer V9 invalides', analysis.v9Finalizer);
      assert(Array.isArray(analysis.v9FinalTicket.ready), 'Ready ticket V9 invalide', analysis.v9FinalTicket);
      assert(Array.isArray(analysis.v9ProfitGate.rows), 'Profit gate rows V9 invalides', analysis.v9ProfitGate);
      assert(Array.isArray(analysis.v9ClvMarketPressure.rows), 'CLV rows V9 invalides', analysis.v9ClvMarketPressure);
      assert(Array.isArray(analysis.v10DecisionFeed.decisions), 'Décisions V10 invalides', analysis.v10DecisionFeed);
      assert(Array.isArray(analysis.v10FinalBetTicket.ready), 'Ready ticket V10 invalide', analysis.v10FinalBetTicket);
      assert(Array.isArray(analysis.v10T10Gate.checks), 'Checks T-10 V10 invalides', analysis.v10T10Gate);
      assert(Array.isArray(analysis.v10BlockerResolution.matches), 'Blocages V10 invalides', analysis.v10BlockerResolution);
      assert(Array.isArray(analysis.v10SignalRescue.actions), 'Actions rescue V10 invalides', analysis.v10SignalRescue);
      assert(Array.isArray(analysis.v10ExternalSourceLimits.limits), 'Limites sources V10 invalides', analysis.v10ExternalSourceLimits);
      assert(Array.isArray(analysis.v10ProfitGuard.rows), 'Profit Guard rows V10 invalides', analysis.v10ProfitGuard);
      assert(Array.isArray(analysis.v10StakePolicy.rows), 'Stake Policy rows V10 invalides', analysis.v10StakePolicy);
      assert(Array.isArray(analysis.v11ReadyUnlock.rows), 'Rows V11 ready unlock invalides', analysis.v11ReadyUnlock);
      assert(Array.isArray(analysis.v11T10Fast.steps), 'Étapes T-10 V11 invalides', analysis.v11T10Fast);
      assert(Array.isArray(analysis.v11T10Blockers.blockers), 'Blocages V11 invalides', analysis.v11T10Blockers);
      assert(Array.isArray(analysis.v11NowTicket.ready), 'Ready ticket V11 invalide', analysis.v11NowTicket);
      assert(Array.isArray(analysis.v11RepairExecution.actions), 'Actions réparation V11 invalides', analysis.v11RepairExecution);
      assert(Array.isArray(analysis.v11ProfitGuard.rows), 'Profit Guard rows V11 invalides', analysis.v11ProfitGuard);
      assert(Array.isArray(analysis.v11ControlRoom.cards), 'Cartes Control Room V11 invalides', analysis.v11ControlRoom);
      assert(Array.isArray(analysis.v12PriceTargets.rows), 'Rows Price Targets V12 invalides', analysis.v12PriceTargets);
      assert(Array.isArray(analysis.v12MarketTiming.rows), 'Rows Market Timing V12 invalides', analysis.v12MarketTiming);
      assert(Array.isArray(analysis.v12ClvWatch.rows), 'Rows CLV Watch V12 invalides', analysis.v12ClvWatch);
      assert(Array.isArray(analysis.v12ValueRelease.rows), 'Rows Value Release V12 invalides', analysis.v12ValueRelease);
      assert(Array.isArray(analysis.v12NowTicket.ready), 'Ready ticket V12 invalide', analysis.v12NowTicket);
      assert(Array.isArray(analysis.v12ControlRoom.cards), 'Cartes Control Room V12 invalides', analysis.v12ControlRoom);
      assert(Array.isArray(analysis.v13OddsIdentity.rows), 'Rows Identity map V13 invalides', analysis.v13OddsIdentity);
      assert(Array.isArray(analysis.v13PriceMemory.rows), 'Rows Price Memory V13 invalides', analysis.v13PriceMemory);
      assert(Array.isArray(analysis.v13LineMovement.rows), 'Rows Line Movement V13 invalides', analysis.v13LineMovement);
      assert(Array.isArray(analysis.v13PriceAlerts.rows), 'Rows alertes V13 invalides', analysis.v13PriceAlerts);
      assert(Array.isArray(analysis.v13AlertQueue.queue), 'Alert queue V13 invalide', analysis.v13AlertQueue);
      assert(Array.isArray(analysis.v13T10Resolution.blockers), 'Blocages T-10 V13 invalides', analysis.v13T10Resolution);
      assert(Array.isArray(analysis.v13T10GateMatrix.rows), 'Matrice T-10 V13 invalide', analysis.v13T10GateMatrix);
      assert(Array.isArray(analysis.v13ProfitGuard.rows), 'Profit Guard rows V13 invalides', analysis.v13ProfitGuard);
      assert(Array.isArray(analysis.v13EdgeExplainability.rows), 'Explainability rows V13 invalides', analysis.v13EdgeExplainability);
      assert(Array.isArray(analysis.v13NowTicket.ready), 'Ready ticket V13 invalide', analysis.v13NowTicket);
      assert(Array.isArray(analysis.v13ControlRoom.cards), 'Cartes Control Room V13 invalides', analysis.v13ControlRoom);
      assert(Array.isArray(analysis.v14FileAudit.rows), 'Fichiers V14 invalides', analysis.v14FileAudit);
      assert(Array.isArray(analysis.v14DeadReferences.rows), 'Références V14 invalides', analysis.v14DeadReferences);
      assert(Array.isArray(analysis.v14ContentInventory.largest_files), 'Inventaire V14 invalide', analysis.v14ContentInventory);
      assert(Array.isArray(analysis.v14MathIntegrity.issues), 'Issues calculs V14 invalides', analysis.v14MathIntegrity);
      assert(analysis.v14PickStateReconciliation.summaries && typeof analysis.v14PickStateReconciliation.summaries === 'object', 'Réconciliation V14 invalide', analysis.v14PickStateReconciliation);
      assert(Array.isArray(analysis.v14CrossViewConsistency.rows), 'Cohérence vues V14 invalide', analysis.v14CrossViewConsistency);
      assert(Array.isArray(analysis.v14CriticalResolution.rows), 'Critiques V14 invalides', analysis.v14CriticalResolution);
      assert(Array.isArray(analysis.v14SourceRepair.rows), 'Sources V14 invalides', analysis.v14SourceRepair);
      assert(analysis.v14SignalTruth.by_source && typeof analysis.v14SignalTruth.by_source === 'object', 'Vérité signaux V14 invalide', analysis.v14SignalTruth);
      assert(Array.isArray(analysis.v14MatchingQuality.unmatched), 'Matching V14 invalide', analysis.v14MatchingQuality);
      assert(Array.isArray(analysis.v14SourceGapByMatch.rows), 'Gaps match V14 invalides', analysis.v14SourceGapByMatch);
      assert(Array.isArray(analysis.v14PriceAction.rows), 'Prix V14 invalides', analysis.v14PriceAction);
      assert(Array.isArray(analysis.v14RecheckSchedule.rows), 'Queue recheck V14 invalide', analysis.v14RecheckSchedule);
      assert(Array.isArray(analysis.v14ControlRoom.cards), 'Cartes Control Room V14 invalides', analysis.v14ControlRoom);
      assert(Array.isArray(analysis.v15ActionCockpit.rows), 'Rows V15 actions invalides', analysis.v15ActionCockpit);
      assert(Array.isArray(analysis.v15BetReadiness.rows), 'Rows V15 readiness invalides', analysis.v15BetReadiness);
      assert(Array.isArray(analysis.v15HealthNoise.rows), 'Rows V15 santé invalides', analysis.v15HealthNoise);
      assert(Array.isArray(analysis.v15SourceFixPlan.rows), 'Rows V15 sources invalides', analysis.v15SourceFixPlan);
      assert(Array.isArray(analysis.v15CleanupSafety.delete_safe), 'Rows V15 cleanup invalides', analysis.v15CleanupSafety);
      assert(Array.isArray(analysis.v15ControlRoom.cards), 'Cartes Control Room V15 invalides', analysis.v15ControlRoom);
      assert(Array.isArray(analysis.v16SourceRefresh.rows), 'Rows V16 sources invalides', analysis.v16SourceRefresh);
      assert(Array.isArray(analysis.v16SourceDelta.rows), 'Rows V16 delta invalides', analysis.v16SourceDelta);
      assert(Array.isArray(analysis.v16T10Decision.rows), 'Rows V16 T-10 invalides', analysis.v16T10Decision);
      assert(Array.isArray(analysis.v16CandidateResolution.rows), 'Rows V16 résolution invalides', analysis.v16CandidateResolution);
      assert(Array.isArray(analysis.v16FinalTicket.rows), 'Rows V16 ticket invalides', analysis.v16FinalTicket);
      assert(Array.isArray(analysis.v16AgentGate.rows), 'Rows agent V16 invalides', analysis.v16AgentGate);
      assert(Array.isArray(analysis.v16ControlRoom.cards), 'Cartes Control Room V16 invalides', analysis.v16ControlRoom);
      assert(Number(analysis.v5DeadFileManifest.summary.blocked_by_reference || 0) === 0, 'Un fichier delete_safe V5 est encore référencé', analysis.v5DeadFileManifest.summary);
      for (const item of analysis.v5DeadFileManifest.items || []) {
        if (item.category === 'delete_safe' && item.deleted) {
          assert(Number(item.references || 0) === 0, 'Fichier supprimé encore référencé', item);
        }
      }
      if (analysis.criticalIssueReport.summary.blocks_bet) {
        assert(analysis.agent?.guard?.reason === 'prebet_checklist' || Number(analysis.prebetChecklist?.summary?.blockers || 0) > 0 || analysis.agent?.positions?.length === 0, 'État critique doit empêcher une mise agent non expliquée', {
          critical: analysis.criticalIssueReport.summary,
          guard: analysis.agent?.guard,
          positions: analysis.agent?.positions?.length
        });
      }
      if (analysis.v5FixCampaign.summary.blocks_bet) {
        assert(analysis.agent?.positions?.length === 0, 'Gate V5 rouge doit bloquer les positions agent', {
          v5: analysis.v5FixCampaign.summary,
          guard: analysis.agent?.guard,
          positions: analysis.agent?.positions?.length
        });
      }
      if (analysis.v6FinalBetTicket.summary.final_gate !== 'ready' || analysis.v6ProfitEngine.summary.blocks_agent) {
        assert(analysis.agent?.positions?.length === 0, 'Gate V6 rouge doit bloquer les positions agent', {
          v6Ticket: analysis.v6FinalBetTicket.summary,
          v6Profit: analysis.v6ProfitEngine.summary,
          guard: analysis.agent?.guard,
          positions: analysis.agent?.positions?.length
        });
      }
      if (analysis.v7EdgeRelease.summary.blocks_agent || analysis.v7RedToGreen.summary.blocks_agent) {
        assert(analysis.agent?.positions?.length === 0, 'Gate V7 rouge doit bloquer les positions agent', {
          v7Edge: analysis.v7EdgeRelease.summary,
          v7Red: analysis.v7RedToGreen.summary,
          guard: analysis.agent?.guard,
          positions: analysis.agent?.positions?.length
        });
      }
      if (Number(analysis.v8DecisionFeed.summary.ready || 0) <= 0) {
        assert(analysis.agent?.positions?.length === 0, 'Gate V8 à zéro ready doit bloquer les positions agent', {
          v8: analysis.v8DecisionFeed.summary,
          guard: analysis.agent?.guard,
          positions: analysis.agent?.positions?.length
        });
        assert(analysis.v8DecisionFeed.summary.message === 'Aucun pari à jouer maintenant', 'Message V8 zéro ready ambigu', analysis.v8DecisionFeed.summary);
      }
      if (analysis.v9FinalTicket.summary.final_gate !== 'ready') {
        assert(analysis.agent?.positions?.length === 0, 'Gate V9 non ready doit bloquer les positions agent', {
          v9: analysis.v9FinalTicket.summary,
          guard: analysis.agent?.guard,
          positions: analysis.agent?.positions?.length
        });
        assert(analysis.v9FinalTicket.summary.message === 'Aucun pari à jouer maintenant', 'Message V9 zéro ready ambigu', analysis.v9FinalTicket.summary);
      }
      if (analysis.v10FinalBetTicket.summary.final_gate !== 'ready') {
        assert(analysis.agent?.positions?.length === 0, 'Gate V10 non ready doit bloquer les positions agent', {
          v10: analysis.v10FinalBetTicket.summary,
          guard: analysis.agent?.guard,
          positions: analysis.agent?.positions?.length
        });
        assert(analysis.v10FinalBetTicket.summary.message === 'Aucun pari à jouer maintenant', 'Message V10 zéro ready ambigu', analysis.v10FinalBetTicket.summary);
      }
      if (analysis.v11NowTicket.summary.final_gate !== 'ready') {
        assert(analysis.agent?.positions?.length === 0, 'Gate V11 non ready doit bloquer les positions agent', {
          v11: analysis.v11NowTicket.summary,
          guard: analysis.agent?.guard,
          positions: analysis.agent?.positions?.length
        });
        assert(analysis.v11NowTicket.summary.message === 'Aucun pari à jouer maintenant', 'Message V11 zéro ready ambigu', analysis.v11NowTicket.summary);
      }
      if (analysis.v12NowTicket.summary.final_gate !== 'ready') {
        assert(analysis.agent?.positions?.length === 0, 'Gate V12 non ready doit bloquer les positions agent', {
          v12: analysis.v12NowTicket.summary,
          guard: analysis.agent?.guard,
          positions: analysis.agent?.positions?.length
        });
        assert(analysis.v12NowTicket.summary.message === 'Aucun pari à jouer maintenant', 'Message V12 zéro ready ambigu', analysis.v12NowTicket.summary);
      }
      if (analysis.v13NowTicket.summary.final_gate !== 'ready') {
        assert(analysis.agent?.positions?.length === 0, 'Gate V13 non ready doit bloquer les positions agent', {
          v13: analysis.v13NowTicket.summary,
          guard: analysis.agent?.guard,
          positions: analysis.agent?.positions?.length
        });
        assert(analysis.v13NowTicket.summary.message === 'Aucun pari à jouer maintenant', 'Message V13 zéro ready ambigu', analysis.v13NowTicket.summary);
      }
      if (analysis.v16FinalTicket.summary.ticket_status !== 'ready') {
        assert(analysis.v16AgentGate.summary.status === 'blocked', 'Gate agent V16 doit rester bloqué hors ticket ready', analysis.v16AgentGate.summary);
        assert(analysis.v16FinalTicket.summary.message === 'Aucun pari à jouer maintenant', 'Message V16 zéro ready ambigu', analysis.v16FinalTicket.summary);
      }
      for (const row of analysis.v16FinalTicket.rows || []) {
        assert(typeof row.price_gate === 'string' && row.price_gate.length > 0, 'V16 doit exposer le gate prix', row);
        assert(typeof row.t10_window === 'string' && row.t10_window.length > 0, 'V16 doit exposer la fenêtre T-10', row);
        assert(typeof row.next_action === 'string' && row.next_action.length > 0, 'V16 doit exposer une action claire', row);
        assert(typeof row.blocking_gate === 'string', 'V16 doit exposer le blocage principal', row);
        if (row.v16_status !== 'ready_now') {
          assert(row.stake === '0 €' && row.can_bet === false, 'V16 interdit toute mise positive hors ready_now', row);
        }
        if (row.next_action === 'Corriger checklist') {
          assert(row.action_mode === 'v16_source_refresh' || row.action_mode === 'v15_fix', 'Correction checklist V16 doit pointer vers une action locale', row);
        }
      }
      for (const candidate of analysis.v6ProfitEngine.candidates || []) {
        if (candidate.final_status !== 'bet') {
          assert(candidate.no_bet_reason, 'Candidat V6 hors bet sans No Bet Reason', candidate);
        }
        assert(Number(candidate.edge || 0) > 0 || candidate.final_status === 'skip', 'Candidat V6 sans edge positif non skip', candidate);
      }
      if (!analysis.v7EdgeRelease.summary.ticket_ready) {
        assert(Number(analysis.v7EdgeRelease.summary.ready || 0) === 0, 'Ticket T-10 bloqué mais pick V7 ready', analysis.v7EdgeRelease.summary);
      }
      assert(Number(analysis.v7RedToGreen.summary.software_critical || 0) >= 0, 'Compteur logiciel V7 invalide', analysis.v7RedToGreen.summary);
      for (const source of analysis.v7ActualCoverage.sources || []) {
        if (source.status === 'fresh_data_absent') {
          assert(!String(source.actual_message || '').toLowerCase().includes('périmée'), 'Source fraîche classée stale en V7', source);
        }
      }
      for (const candidate of analysis.v7EdgeRelease.candidates || []) {
        if (candidate.v7_status === 'ready') {
          assert(Number(candidate.edge || 0) > 0, 'Pick V7 ready sans edge positif', candidate);
          assert(Number(candidate.kelly || 0) > 0, 'Pick V7 ready sans Kelly positif', candidate);
          assert(Number(candidate.odd || 0) > 1, 'Pick V7 ready sans cote Winamax valide', candidate);
        } else {
          assert(candidate.release_reason, 'Pick V7 non-ready sans raison', candidate);
        }
      }
      for (const decision of analysis.v8DecisionFeed.decisions || []) {
        assert(['ready', 'wait', 'repair', 'skip'].includes(decision.decision_status), 'Statut décision V8 invalide', decision);
        assert(decision.primary_reason, 'Décision V8 sans raison principale', decision);
        assert(decision.next_action, 'Décision V8 sans action suivante', decision);
        if (decision.can_bet) {
          assert(decision.decision_status === 'ready', 'Décision V8 can_bet hors ready', decision);
          assert(Number(decision.edge || 0) > 0, 'Décision V8 ready sans edge positif', decision);
          assert(Number(decision.kelly || 0) > 0, 'Décision V8 ready sans Kelly positif', decision);
          assert(Number(decision.odd || 0) > 1, 'Décision V8 ready sans cote Winamax valide', decision);
          assert(Number(decision.stake_display_eur || 0) > 0, 'Décision V8 ready sans mise affichable', decision);
        } else {
          assert(Number(decision.stake_display_eur || 0) === 0, 'Décision V8 non-ready avec mise positive', decision);
          assert(String(decision.stake_display || '') === '0 €', 'Décision V8 non-ready avec texte mise trompeur', decision);
        }
      }
      for (const row of analysis.v9ReadyUnlock.rows || []) {
        assert(row.primary_blocker, 'V9 row sans blocage principal', row);
        assert(row.unlock_probability, 'V9 row sans probabilité de déblocage', row);
        assert(row.recommended_action, 'V9 row sans action recommandée', row);
        if (!row.can_bet) {
          assert(String(row.stake_display || '') === '0 €', 'V9 non-ready avec mise positive', row);
        }
      }
      for (const row of analysis.v9FinalTicket.ready || []) {
        assert(row.can_bet === true, 'Ticket V9 ready sans can_bet', row);
        assert(Number(row.edge || 0) > 0, 'Ticket V9 ready sans edge positif', row);
        assert(Number(row.kelly || 0) > 0, 'Ticket V9 ready sans Kelly positif', row);
        assert(Number(row.odd || 0) > 1, 'Ticket V9 ready sans cote valide', row);
      }
      for (const decision of analysis.v10DecisionFeed.decisions || []) {
        assert(['ready_now', 'wait_t10', 'repair_source', 'skip_risk', 'skip_value'].includes(decision.v10_status), 'Statut décision V10 invalide', decision);
        assert(decision.primary_reason, 'Décision V10 sans raison principale', decision);
        assert(decision.next_action, 'Décision V10 sans action suivante', decision);
        if (decision.can_bet) {
          assert(decision.v10_status === 'ready_now', 'Décision V10 can_bet hors ready_now', decision);
          assert(Number(decision.edge || 0) > 0, 'Décision V10 ready sans edge positif', decision);
          assert(Number(decision.kelly || 0) > 0, 'Décision V10 ready sans Kelly positif', decision);
          assert(Number(decision.odd || 0) > 1, 'Décision V10 ready sans cote Winamax valide', decision);
          assert(String(decision.stake_display || '') !== '0 €', 'Décision V10 ready avec mise zéro', decision);
        } else {
          assert(String(decision.stake_display || '') === '0 €', 'Décision V10 non-ready avec mise positive', decision);
        }
      }
      for (const row of analysis.v10FinalBetTicket.ready || []) {
        assert(row.can_bet === true, 'Ticket V10 ready sans can_bet', row);
        assert(row.v10_status === 'ready_now', 'Ticket V10 ready hors ready_now', row);
        assert(Number(row.edge || 0) > 0, 'Ticket V10 ready sans edge positif', row);
        assert(Number(row.kelly || 0) > 0, 'Ticket V10 ready sans Kelly positif', row);
        assert(Number(row.odd || 0) > 1, 'Ticket V10 ready sans cote valide', row);
      }
      assert(analysis.v10DecisionFeed.summary.stake_zero_for_non_ready === true, 'V10 doit garder les mises non-ready à zéro', analysis.v10DecisionFeed.summary);
      for (const decision of analysis.v11ReadyUnlock.rows || []) {
        assert(['ready_now', 'ready_if_price', 'ready_if_t10', 'repairable', 'blocked_external', 'hard_skip'].includes(decision.v11_status), 'Statut décision V11 invalide', decision);
        assert(decision.primary_reason, 'Décision V11 sans raison principale', decision);
        assert(decision.next_action, 'Décision V11 sans action suivante', decision);
        if (decision.can_bet) {
          assert(decision.v11_status === 'ready_now', 'Décision V11 can_bet hors ready_now', decision);
          assert(Number(decision.edge || 0) > 0, 'Décision V11 ready sans edge positif', decision);
          assert(Number(decision.kelly || 0) > 0, 'Décision V11 ready sans Kelly positif', decision);
          assert(Number(decision.odd || 0) > 1, 'Décision V11 ready sans cote Winamax valide', decision);
          assert(String(decision.stake_display || '') !== '0 €', 'Décision V11 ready avec mise zéro', decision);
        } else {
          assert(String(decision.stake_display || '') === '0 €', 'Décision V11 non-ready avec mise positive', decision);
        }
      }
      for (const row of analysis.v11NowTicket.ready || []) {
        assert(row.can_bet === true, 'Ticket V11 ready sans can_bet', row);
        assert(row.v11_status === 'ready_now', 'Ticket V11 ready hors ready_now', row);
        assert(Number(row.edge || 0) > 0, 'Ticket V11 ready sans edge positif', row);
        assert(Number(row.kelly || 0) > 0, 'Ticket V11 ready sans Kelly positif', row);
        assert(Number(row.odd || 0) > 1, 'Ticket V11 ready sans cote valide', row);
      }
      assert(analysis.v11ReadyUnlock.summary.stake_zero_for_non_ready === true, 'V11 doit garder les mises non-ready à zéro', analysis.v11ReadyUnlock.summary);
      assert(Number(analysis.v11RepairExecution.summary.vague_repair_source || 0) === 0, 'V11 ne doit pas laisser de réparation vague', analysis.v11RepairExecution.summary);
      for (const row of analysis.v12PriceTargets.rows || []) {
        assert(['price_ready', 'near_target', 'wait_price', 'market_hostile', 'hard_skip'].includes(row.v12_status), 'Statut V12 invalide', row);
        assert(row.primary_reason, 'V12 sans raison principale', row);
        assert(row.next_action, 'V12 sans action suivante', row);
        if (row.v12_status !== 'hard_skip') {
          assert(Number(row.current_odd || 0) > 1, 'V12 sans cote actuelle valide', row);
          assert(Number(row.min_odd || 0) > 1, 'V12 sans cote minimum valide', row);
          assert(Number(row.target_odd || 0) >= Number(row.min_odd || 0), 'V12 cible sous minimum', row);
        }
        if (row.can_bet) {
          assert(row.v12_status === 'price_ready', 'V12 can_bet hors price_ready', row);
          assert(Number(row.edge || 0) > 0, 'V12 ready sans edge positif', row);
          assert(Number(row.kelly || 0) > 0, 'V12 ready sans Kelly positif', row);
          assert(Number(row.current_odd || 0) >= Number(row.min_odd || 0), 'V12 ready sous cote minimum', row);
          assert(row.clv_status !== 'hostile', 'V12 ready avec CLV hostile', row);
          assert(String(row.stake_display || '') !== '0 €', 'V12 ready avec mise zéro', row);
        } else {
          assert(String(row.stake_display || '') === '0 €', 'V12 non-ready avec mise positive', row);
        }
        if (row.clv_status === 'hostile') {
          assert(row.v12_status === 'market_hostile' || row.v12_status === 'hard_skip', 'CLV hostile non bloquée en V12', row);
        }
      }
      for (const row of analysis.v12NowTicket.ready || []) {
        assert(row.can_bet === true, 'Ticket V12 ready sans can_bet', row);
        assert(row.v12_status === 'price_ready', 'Ticket V12 ready hors price_ready', row);
        assert(Number(row.edge || 0) > 0, 'Ticket V12 ready sans edge positif', row);
        assert(Number(row.kelly || 0) > 0, 'Ticket V12 ready sans Kelly positif', row);
        assert(Number(row.current_odd || 0) >= Number(row.min_odd || 0), 'Ticket V12 ready sous prix minimum', row);
      }
      assert(analysis.v12PriceTargets.summary.stake_zero_for_non_ready === true, 'V12 doit garder les mises non-ready à zéro', analysis.v12PriceTargets.summary);
      const allowedV13Statuses = ['bettable_now', 'one_tick_away', 'wait_better_price', 'price_drifting_away', 'market_hostile', 'expired_or_kickoff_too_close', 'hard_skip'];
      assert(Number(analysis.v13PriceMemory.summary.history_unknown || 0) === 0, 'V13 ne doit plus garder un history_unknown générique', analysis.v13PriceMemory.summary);
      for (const row of analysis.v13PriceAlerts.rows || []) {
        assert(allowedV13Statuses.includes(row.v13_status), 'Statut V13 invalide', row);
        assert(row.primary_reason, 'V13 sans raison principale', row);
        assert(row.next_action, 'V13 sans action suivante', row);
        assert(row.history_status && row.history_status !== 'history_unknown', 'V13 history status vague', row);
        if (row.history_status === 'unmatched_key') {
          assert(row.expected_key && row.nearest_available_key != null, 'V13 matching échoué sans clé attendue/proche', row);
        }
        if (row.v13_status !== 'hard_skip') {
          assert(Number(row.current_odd || 0) > 1, 'V13 sans cote actuelle valide', row);
          assert(Number(row.min_odd || 0) > 1, 'V13 sans cote minimum valide', row);
          assert(Number(row.target_odd || 0) >= Number(row.min_odd || 0), 'V13 cible sous minimum', row);
        }
        if (row.can_bet) {
          assert(row.v13_status === 'bettable_now', 'V13 can_bet hors bettable_now', row);
          assert(Number(row.edge || 0) > 0, 'V13 ready sans edge positif', row);
          assert(Number(row.kelly || 0) > 0, 'V13 ready sans Kelly positif', row);
          assert(Number(row.current_odd || 0) >= Number(row.min_odd || 0), 'V13 ready sous cote minimum', row);
          assert(row.clv_status !== 'hostile', 'V13 ready avec CLV hostile', row);
          assert(String(row.stake_display || '') !== '0 €', 'V13 ready avec mise zéro', row);
        } else {
          assert(String(row.stake_display || '') === '0 €', 'V13 non-ready avec mise positive', row);
        }
        if (row.clv_status === 'hostile') {
          assert(['market_hostile', 'hard_skip', 'expired_or_kickoff_too_close'].includes(row.v13_status), 'CLV hostile non bloquée en V13', row);
        }
        if (row.v13_status === 'one_tick_away') {
          assert(String(row.stake_display || '') === '0 €', 'V13 one_tick avec mise positive', row);
          assert(/T-10|Rechecker|Finaliser|prix/i.test(String(row.next_action || '')), 'V13 one_tick sans action utile', row);
        }
      }
      for (const row of analysis.v13NowTicket.ready || []) {
        assert(row.can_bet === true, 'Ticket V13 ready sans can_bet', row);
        assert(row.v13_status === 'bettable_now', 'Ticket V13 ready hors bettable_now', row);
        assert(Number(row.edge || 0) > 0, 'Ticket V13 ready sans edge positif', row);
        assert(Number(row.kelly || 0) > 0, 'Ticket V13 ready sans Kelly positif', row);
        assert(Number(row.current_odd || 0) >= Number(row.min_odd || 0), 'Ticket V13 ready sous prix minimum', row);
      }
      assert(analysis.v13PriceAlerts.summary.stake_zero_for_non_ready === true, 'V13 doit garder les mises non-ready à zéro', analysis.v13PriceAlerts.summary);
      assert(Number(analysis.v13T10Resolution.summary.vague || 0) === 0, 'V13 ne doit pas laisser de blocage T-10 vague', analysis.v13T10Resolution.summary);
      assert(Number(analysis.v14MathIntegrity.summary.issues || 0) === 0, 'V14 détecte une incohérence calcul/mise', analysis.v14MathIntegrity.summary);
      assert(analysis.v15ActionCockpit.summary.stake_zero_for_non_ready === true, 'V15 doit garder les mises non-ready à zéro', analysis.v15ActionCockpit.summary);
      const allowedV15Statuses = ['ready_now', 'needs_t10', 'one_tick_price', 'price_watch', 'source_repair', 'reject_market', 'hard_skip', 'watch'];
      for (const row of analysis.v15ActionCockpit.rows || []) {
        assert(allowedV15Statuses.includes(row.v15_status), 'Statut V15 invalide', row);
        assert(row.next_action, 'V15 action manquante', row);
        assert(row.primary_reason, 'V15 raison manquante', row);
        if (row.v15_status !== 'ready_now') {
          assert(String(row.stake || '') === '0 €', 'V15 non-ready avec mise positive', row);
        }
      }
      assert(analysis.v14PriceAction.summary.stake_zero_for_non_ready === true, 'V14 doit garder les mises non-ready à zéro', analysis.v14PriceAction.summary);
      assert(analysis.v14PriceAction.summary.stake_zero_for_non_bettable === true, 'V14 doit garder les mises non-bettable à zéro', analysis.v14PriceAction.summary);
      for (const row of analysis.v14PriceAction.rows || []) {
        assert(allowedV13Statuses.includes(row.status), 'Statut V14 prix invalide', row);
        assert(row.action, 'V14 prix sans action', row);
        assert(row.reason, 'V14 prix sans raison', row);
        if (row.status !== 'bettable_now') {
          assert(String(row.stake || '') === '0 €', 'V14 non-bettable avec mise positive', row);
        }
        if (row.status !== 'hard_skip') {
          assert(Number(row.current_odd || 0) > 1, 'V14 sans cote actuelle valide', row);
          assert(Number(row.min_odd || 0) > 1, 'V14 sans cote minimum valide', row);
        }
      }
      if (Number(analysis.v14CriticalResolution.summary.unresolved_software || 0) > 0) {
        assert(analysis.agent?.positions?.length === 0, 'Critique logiciel V14 doit bloquer l’agent', {
          v14: analysis.v14CriticalResolution.summary,
          guard: analysis.agent?.guard,
          positions: analysis.agent?.positions?.length
        });
      }
      const v10RepairCount = Number(analysis.v10FinalBetTicket.summary.repair_source || 0);
      if (v10RepairCount > 0) {
        assert(Number(analysis.v11RepairExecution.summary.matches || 0) >= v10RepairCount, 'V11 doit expliquer tous les dossiers repair_source V10', {
          v10: analysis.v10FinalBetTicket.summary,
          v11: analysis.v11RepairExecution.summary
        });
      }
      assert(Number.isFinite(Number(analysis.stakeReductionBacktest.summary.league_market_recommendations || 0)), 'Réductions ligue+marché invalides', analysis.stakeReductionBacktest.summary);
      assert(Number(coverage.context || 0) > 0, 'Aucun contexte attaché malgré des matchs', coverage);
      for (const scorer of analysis.scorers || []) {
        assert(scorer.playerQuality && Number.isFinite(Number(scorer.playerQuality.score)), 'Buteur sans qualité joueur', scorer);
      }
      const watch = analysis.watchlist[0];
      if (watch) {
        assert(Array.isArray(watch.reasons) && watch.reasons.length > 0, 'Watchlist sans raison', watch);
        assert(watch.action && watch.nextRefreshMode, 'Watchlist sans action', watch);
      }
    }
    if (Number(coverage.football || 0) >= 10) {
      assert(Number(coverage.weather || 0) > 0, 'Aucune météo attachée malgré des matchs foot', coverage);
      assert(Number(coverage.h2h || 0) > 0, 'Aucun H2H attaché malgré des matchs foot', coverage);
      assert(Number(coverage.xg || 0) > 0, 'Aucun xG attaché malgré des matchs foot', coverage);
    }

    const positions = Array.isArray(analysis.agent?.positions) ? analysis.agent.positions : [];
    if (Number(analysis.prebetChecklist?.summary?.blockers || 0) > 0) {
      assert(positions.length === 0, 'Checklist rouge doit bloquer les positions agent', {
        guard: analysis.agent?.guard,
        prebet: analysis.prebetChecklist?.summary,
        positions: positions.length
      });
      assert(analysis.agent?.guard?.reason === 'prebet_checklist', 'Garde agent doit exposer la checklist rouge', analysis.agent?.guard);
    }
    for (const pos of positions) {
      assert(Number(pos.edge) > 0, 'Position agent sans edge positif', pos);
      assert(Number(pos.stake) >= 0.10, 'Position agent sous plancher', pos);
      assert(Number(pos.stake) <= 1.0001, 'Position agent au-dessus du cap 10%', pos);
      assert(Number(pos.kelly) > 0, 'Position agent avec Kelly nul', pos);
      assert(pos.contextGate && pos.contextGate.agentEligible !== false, 'Position agent sans contexte éligible', pos);
      assert(pos.confidenceTrust && Number(pos.confidenceTrust.score) >= 45, 'Position agent avec confiance trop faible', pos);
    }
    for (const row of analysis.matches.slice(0, 30)) {
      assert(row.marketTiming && row.marketTiming.marketKey, 'Signal CLV/marché absent sur un match analysé', row);
      assert(row.oddsGuardrail && row.oddsGuardrail.tone, 'Garde-fou cote absent sur un match analysé', row);
      assert(row.signalConflict && typeof row.signalConflict.active === 'boolean', 'Conflit signaux absent sur un match analysé', row);
    }
    for (const [day, total] of daySums(positions)) {
      assert(total <= 2.0001, 'Cap journalier agent dépassé', { day, total });
    }

    console.log(
      `Desktop engine contract OK: ${analysis.counts.matches} matchs, ${analysis.counts.picks} picks, ` +
      `${analysis.counts.dashboardPicks} dashboard, ${positions.length} positions agent.`
    );
  } finally {
    engine.close();
  }
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}

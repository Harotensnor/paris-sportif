function contextForMatch(index, match, fallbackId) {
  const matches = index && index.matches_by_id && typeof index.matches_by_id === 'object'
    ? index.matches_by_id
    : {};
  const ids = [
    fallbackId,
    match?.winamax?.match_id,
    match?.id,
    match?.event_id,
    match?.uid,
    String(match?.id || '').replace(/^espn_/, ''),
    String(match?.id || '').replace(/^sofa_/, '')
  ].filter(Boolean).map(String);
  return ids.map((id) => matches[id]).find(Boolean) || null;
}

function contextSummary(index) {
  if (!index || typeof index !== 'object') return null;
  return {
    generatedAt: index.generated_at || null,
    matches: Number(index.matches || 0),
    quality: index.quality || {},
    sources: index.sources || {},
    leagues: index.leagues || {}
  };
}

function signalGaps(report, limit = 80) {
  if (!report || typeof report !== 'object') return [];
  return (Array.isArray(report.gaps) ? report.gaps : []).slice(0, limit);
}

function contextBacktestSummary(report) {
  if (!report || typeof report !== 'object') return null;
  return {
    generatedAt: report.generated_at || null,
    settledUsed: Number(report.settled_used || 0),
    rowsSkipped: Number(report.rows_skipped || 0),
    sourceNote: report.source_note || '',
    contextSourceCounts: report.context_source_counts || {},
    currentContext: report.current_context || null,
    byContextTier: Array.isArray(report.by_context_tier) ? report.by_context_tier : [],
    byMarket: Array.isArray(report.by_market) ? report.by_market : [],
    bySport: Array.isArray(report.by_sport) ? report.by_sport : [],
    byContextAndMarket: Array.isArray(report.by_context_and_market) ? report.by_context_and_market : []
  };
}

function decisionBacktestSummary(report) {
  if (!report || typeof report !== 'object') return null;
  return {
    generatedAt: report.generated_at || null,
    settledUsed: Number(report.settled_used || 0),
    rowsSkipped: Number(report.rows_skipped || 0),
    sourceNote: report.source_note || '',
    sourceCounts: report.source_counts || {},
    byDecision: Array.isArray(report.by_decision) ? report.by_decision : [],
    byReason: Array.isArray(report.by_reason) ? report.by_reason : [],
    byDecisionMarket: Array.isArray(report.by_decision_market) ? report.by_decision_market : []
  };
}

function contextQuality(match) {
  const context = match?.context || match?.match_context || null;
  const quality = context?.quality || null;
  const score = Number(quality?.score);
  return {
    context,
    quality,
    score: Number.isFinite(score) ? score : null,
    gate: quality?.gate || null,
    agentEligible: quality?.agent_eligible !== false,
    criticalMissing: Array.isArray(quality?.critical_missing) ? quality.critical_missing : [],
    missing: Array.isArray(quality?.missing) ? quality.missing : [],
    stale: Array.isArray(quality?.stale) ? quality.stale : []
  };
}

function contextGateLabel(gate) {
  if (gate === 'skip') return 'Contexte insuffisant';
  if (gate === 'watch') return 'À surveiller · contexte incomplet';
  return 'Contexte exploitable';
}

function contextWarnings(quality) {
  const warnings = [];
  if (!quality) return warnings;
  if (quality.score != null && quality.score < 55) warnings.push('score_context_lt_55');
  if (quality.gate === 'skip') warnings.push('context_gate_skip');
  if (quality.gate === 'watch') warnings.push('context_gate_watch');
  const critical = Array.isArray(quality.criticalMissing)
    ? quality.criticalMissing
    : Array.isArray(quality.critical_missing)
      ? quality.critical_missing
      : [];
  for (const reason of critical) warnings.push(reason);
  if ((quality.missing || []).includes('lineups')) warnings.push('lineups_missing');
  if ((quality.missing || []).includes('injuries')) warnings.push('availability_missing');
  if ((quality.missing || []).includes('h2h')) warnings.push('h2h_missing');
  if ((quality.missing || []).includes('xg')) warnings.push('xg_missing');
  return [...new Set(warnings)];
}

function sampleBonus(sample) {
  const n = Number(sample);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(20, Math.log10(n + 1) * 9);
}

function confidenceLabel(score) {
  if (score >= 80) return 'Confiance de confiance forte';
  if (score >= 65) return 'Confiance stable';
  if (score >= 50) return 'À vérifier';
  return 'Confiance fragile';
}

function confidenceLevel(score) {
  if (score >= 80) return 'strong';
  if (score >= 65) return 'stable';
  if (score >= 50) return 'watch';
  return 'fragile';
}

function marketBacktestForRow(report, row) {
  if (!report || typeof report !== 'object' || !row) return null;
  const marketKey = String(row.marketKey || row.calibration?.marketKey || row.market || '').toLowerCase();
  const tier = String(row.contextQuality?.tier || row.match?.context?.quality?.tier || '').toLowerCase();
  const byContextAndMarket = Array.isArray(report.by_context_and_market) ? report.by_context_and_market : [];
  const exact = tier && marketKey
    ? byContextAndMarket.find((bucket) => String(bucket?.key || '').toLowerCase() === `${tier}:${marketKey}`)
    : null;
  const byMarket = Array.isArray(report.by_market) ? report.by_market : [];
  const market = marketKey ? byMarket.find((bucket) => String(bucket?.key || '').toLowerCase() === marketKey) : null;
  return exact || market || null;
}

function confidenceTrust(row, backtestReport = null) {
  const quality = row?.contextQuality || row?.match?.context?.quality || null;
  const score = Number(quality?.score);
  const calibration = row?.calibration || {};
  const marketBacktest = marketBacktestForRow(backtestReport, row);
  const calibrationSample = Number(calibration.sample || calibration.count || 0);
  const marketSample = Number(marketBacktest?.count || 0);
  let trust = Number.isFinite(score) ? 25 + score * 0.48 : 32;
  trust += sampleBonus(Math.max(calibrationSample, marketSample));
  if (calibration.level === 'cold' || calibration.blocked) trust -= 15;
  if (calibration.level === 'unknown') trust -= 5;
  if (quality?.gate === 'watch') trust -= 10;
  if (quality?.gate === 'skip') trust -= 35;
  if (Array.isArray(quality?.critical_missing) && quality.critical_missing.length) trust -= 16;
  if (Array.isArray(quality?.stale) && quality.stale.length) trust -= Math.min(12, quality.stale.length * 4);
  if (Number(row?.edge) > 0.2 && marketSample < 20) trust -= 6;
  if (marketBacktest && marketBacktest.sample_level === 'trop_faible') trust -= 5;
  trust = Math.max(0, Math.min(100, Math.round(trust)));
  const drivers = [];
  if (Number.isFinite(score)) drivers.push(`contexte ${Math.round(score)}/100`);
  if (calibrationSample > 0) drivers.push(`calibration ${calibrationSample}`);
  if (marketSample > 0) drivers.push(`marché ${marketSample}`);
  if (quality?.gate && quality.gate !== 'bet') drivers.push(`gate ${quality.gate}`);
  if (calibration.blocked) drivers.push('calibration freinée');
  return {
    score: trust,
    label: confidenceLabel(trust),
    level: confidenceLevel(trust),
    drivers,
    marketBacktest: marketBacktest || null
  };
}

function applyContextGate(row) {
  const details = contextQuality(row?.match);
  const quality = details.quality;
  if (!quality) {
    return {
      ...row,
      contextQuality: null,
      contextGate: {
        gate: 'watch',
        agentEligible: false,
        label: 'Contexte non généré',
        warnings: ['context_missing']
      },
      confidenceTrust: confidenceTrust(row),
      status: row.status === 'bet' ? 'watch' : row.status,
      statusLabel: row.status === 'bet' ? 'À surveiller · contexte non généré' : row.statusLabel
    };
  }

  const gate = quality.gate || 'watch';
  const score = Number(quality.score);
  const warnings = contextWarnings(quality);
  let next = {
    ...row,
    contextQuality: quality,
    contextGate: {
      gate,
      agentEligible: quality.agent_eligible !== false && gate === 'bet',
      label: contextGateLabel(gate),
      warnings
    }
  };

  if (gate === 'skip' || (Number.isFinite(score) && score < 42)) {
    next.status = 'skip';
    next.statusLabel = 'Contexte insuffisant';
    next.stake = 0;
    next.contextGate.agentEligible = false;
    next.confidenceTrust = confidenceTrust(next);
    return next;
  }

  const blockingWarning = warnings.some((w) => /near_kickoff|critical|odds|team_strength_context_missing/.test(w));
  if (gate === 'watch' || (Number.isFinite(score) && score < 62) || blockingWarning) {
    if (next.status === 'bet') next.status = 'watch';
    if (next.statusLabel === 'Priorité') next.statusLabel = 'À surveiller · contexte';
    next.contextGate.agentEligible = false;
  }

  next.confidenceTrust = confidenceTrust(next);
  return next;
}

function annotateConfidence(row, backtestReport = null) {
  const next = { ...row };
  next.confidenceTrust = confidenceTrust(next, backtestReport);
  if (next.confidenceTrust.score < 45 && next.contextGate) {
    next.contextGate = { ...next.contextGate, agentEligible: false };
  }
  return next;
}

function hasStrongContext(row) {
  const gate = row?.contextGate || {};
  return gate.agentEligible !== false && gate.gate !== 'skip';
}

module.exports = {
  contextForMatch,
  contextSummary,
  signalGaps,
  contextBacktestSummary,
  contextQuality,
  contextWarnings,
  confidenceTrust,
  annotateConfidence,
  marketBacktestForRow,
  decisionBacktestSummary,
  applyContextGate,
  hasStrongContext
};

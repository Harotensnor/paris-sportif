const fs = require('fs');
const path = require('path');
const calibrationUtils = require('./calibration-utils');

function sortByKickoffDesc(a, b) {
  return Date.parse(b.kickoff_utc || b.ts_generated || '') - Date.parse(a.kickoff_utc || a.ts_generated || '');
}

function sortByQuality(a, b) {
  return (Number(b.score_quality) || 0) - (Number(a.score_quality) || 0) || (Number(b.edge) || 0) - (Number(a.edge) || 0);
}

function readHistorySummary(projectRoot) {
  const summaryPath = path.join(projectRoot, 'picks_history_summary.json');
  if (!fs.existsSync(summaryPath)) return null;
  try {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    return normalizeHistorySummary(summary);
  } catch {
    return null;
  }
}

function normalizeHistorySummary(summary) {
  const days = Array.isArray(summary?.by_day) ? summary.by_day : [];
  const allPicks = [];
  for (const day of days) {
    const picks = Array.isArray(day.picks) ? day.picks : [];
    for (const pick of picks) allPicks.push({ day: day.date, ...pick });
  }
  return {
    generatedAt: summary?.generated_at || null,
    total: Number(summary?.total) || 0,
    pending: Number(summary?.pending) || 0,
    settled: Number(summary?.settled) || 0,
    won: Number(summary?.won) || 0,
    lost: Number(summary?.lost) || 0,
    void: Number(summary?.void) || 0,
    winRate: Number(summary?.win_rate) || 0,
    flatPnlUnits: Number(summary?.flat_pnl_units) || 0,
    flatRoi: Number(summary?.flat_roi) || 0,
    byDay: days.slice(0, 14).map((day) => ({
      date: day.date,
      total: Number(day.total) || 0,
      pending: Number(day.pending) || 0,
      won: Number(day.won) || 0,
      lost: Number(day.lost) || 0,
      void: Number(day.void) || 0,
      plUnits: Number(day.pl_units) || 0
    })),
    calibration: calibrationUtils.buildCalibration(allPicks),
    pendingTop: allPicks.filter((pick) => pick.result === 'pending').sort(sortByQuality).slice(0, 25),
    recentSettled: allPicks.filter((pick) => pick.result && pick.result !== 'pending').sort(sortByKickoffDesc).slice(0, 25)
  };
}

function agentBalance(agent) {
  if (!agent) return { status: 'unknown', nav: 0, delta7: 0, deltaPct7: 0, positions: 0, exposure: null, drawdown: null };
  return {
    status: agent.guard?.status || 'unknown',
    label: agent.guard?.label || 'Agent non disponible',
    nav: Number(agent.nav) || 0,
    delta7: Number(agent.delta7) || 0,
    deltaPct7: Number(agent.deltaPct7) || 0,
    positions: Array.isArray(agent.positions) ? agent.positions.length : 0,
    blockedPositions: Array.isArray(agent.blockedPositions) ? agent.blockedPositions.length : 0,
    exposure: agent.exposure || null,
    blockedExposure: agent.blockedExposure || null,
    drawdown: agent.drawdown || null
  };
}

module.exports = {
  normalizeHistorySummary,
  readHistorySummary,
  agentBalance
};

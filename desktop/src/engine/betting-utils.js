function kellyFraction(probability, decimalOdd, multiplier = 0.25, capPct = 0.10) {
  const p = Number(probability);
  const odd = Number(decimalOdd);
  if (!(p > 0) || !(p < 1) || !(odd > 1)) return 0;
  const b = odd - 1;
  const q = 1 - p;
  const fullKelly = (p * b - q) / b;
  if (!(fullKelly > 0)) return 0;
  return Math.min(capPct, fullKelly * multiplier);
}

function stakeFor(probability, odd, bankroll, options = {}) {
  const bank = Number(bankroll);
  const decimalOdd = Number(odd);
  const p = Number(probability);
  if (!(p > 0) || !(decimalOdd > 1) || !(bank > 0)) return 0;
  const kellyFn = typeof options.kellyFn === 'function' ? options.kellyFn : kellyFraction;
  let fraction = 0;
  try {
    fraction = Number(kellyFn(p, decimalOdd, options.multiplier ?? 0.25, options.capPct ?? 0.10)) || 0;
  } catch {
    fraction = 0;
  }
  if (!(fraction > 0)) return 0;
  return Math.max(0, Math.min(bank * fraction, bank * (options.capPct ?? 0.10)));
}

function dayKeyParis(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'date-inconnue';
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function runtimeBestPick(win, match, pred) {
  const api = win && win.__testAPI ? win.__testAPI : {};
  try {
    return typeof api._agentBestPick === 'function' ? api._agentBestPick(match, pred) : null;
  } catch {
    return null;
  }
}

function bestFromPrediction(win, match, pred, adapters) {
  const best = runtimeBestPick(win, match, pred);
  if (!best && (!pred || pred.skip)) return null;
  const odd = Number(best && (best.odd ?? best.odds)) || Number(pred && pred.odds) || 0;
  const prob = Number(best && (best.prob ?? best.reliability ?? best.rel)) ||
    Number(pred && (pred.reliability ?? pred.prob)) || 0;
  const edge = Number(best && best.edge);
  const computedEdge = Number.isFinite(edge) ? edge : (odd > 1 && prob > 0 ? prob - (1 / odd) : 0);
  const cleanLabel = adapters.cleanLabel;
  const formatMarketName = adapters.formatMarketName;
  const normalizePickLabel = adapters.normalizePickLabel;
  const rawMarket = cleanLabel((best && (best.marketLabel || best.market || best.key)) || (pred && pred.market), '1N2');
  const market = formatMarketName(rawMarket);
  const rawLabel = (best && (best.label || best.pickLabel || best.pick || best.pickKey || best.key || best.side)) ||
    (pred && (pred.pick || pred.pickKey || pred.key || pred.side));
  const label = normalizePickLabel(match, market, rawLabel, 'Pick');
  return { best, odd, prob, edge: computedEdge, market, label };
}

function buildAgentPositions(matches, options = {}) {
  const bankroll = Number(options.bankroll ?? 10);
  const floor = Number(options.floor ?? 0.10);
  const perBetCap = bankroll * Number(options.perBetCapPct ?? 0.10);
  const dailyCap = bankroll * Number(options.dailyCapPct ?? 0.20);
  const kellyFn = typeof options.kellyFn === 'function' ? options.kellyFn : kellyFraction;
  const dayExposure = new Map();
  const rows = [];
  const candidates = (Array.isArray(matches) ? matches : [])
    .filter((row) => row && row.status !== 'skip' && row.edge > 0 && row.odd > 1 && row.probability > 0)
    .filter((row) => !row.contextGate || row.contextGate.agentEligible !== false)
    .sort((a, b) => (b.edge - a.edge) || (b.probability - a.probability));

  for (const row of candidates) {
    let kelly = 0;
    try {
      kelly = Number(kellyFn(row.probability, row.odd, 0.25, 0.10)) || 0;
    } catch {
      kelly = 0;
    }
    if (!(kelly > 0)) continue;
    const day = dayKeyParis(row.start);
    const used = dayExposure.get(day) || 0;
    const remaining = Math.max(0, dailyCap - used);
    if (remaining < floor) continue;
    const adjustmentFactor = Number(row.stakeAdjustment && row.stakeAdjustment.factor);
    const safeFactor = adjustmentFactor > 0 && adjustmentFactor < 1 ? adjustmentFactor : 1;
    const baseStake = Math.max(floor, Math.min(bankroll * kelly, perBetCap));
    const rawStake = Math.max(floor, baseStake * safeFactor);
    const stake = Math.min(rawStake, remaining);
    if (stake < floor) continue;
    dayExposure.set(day, used + stake);
    rows.push({
      id: row.id,
      title: row.title,
      sport: row.sport,
      league: row.league,
      start: row.start,
      day,
      market: row.market,
      label: row.label,
      odd: row.odd,
      probability: row.probability,
      edge: row.edge,
      stake,
      kelly,
      capHit: stake + 0.0001 < rawStake || used + stake >= dailyCap - 0.0001,
      contextGate: row.contextGate || null,
      contextQuality: row.contextQuality || null,
      confidenceTrust: row.confidenceTrust || null,
      stakeAdjustment: row.stakeAdjustment || null,
      winamaxUrl: row.winamaxUrl || null
    });
  }
  return rows.slice(0, Number(options.limit ?? 40));
}

function seriesValue(point) {
  if (typeof point === 'number') return Number.isFinite(point) ? point : null;
  if (!point || typeof point !== 'object') return null;
  for (const key of ['nav', 'value', 'bankroll', 'y', 'balance']) {
    const value = Number(point[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function computeDrawdown(series, fallbackNav = 0) {
  const values = (Array.isArray(series) ? series : [])
    .map(seriesValue)
    .filter((value) => Number.isFinite(value) && value >= 0);
  const fallback = Number(fallbackNav);
  if (!values.length && Number.isFinite(fallback) && fallback > 0) values.push(fallback);
  if (!values.length) {
    return { current: 0, peak: 0, amount: 0, pct: 0, points: 0 };
  }

  let peak = values[0];
  let maxAmount = 0;
  let maxPct = 0;
  for (const value of values) {
    if (value > peak) peak = value;
    const amount = Math.max(0, peak - value);
    const pct = peak > 0 ? amount / peak : 0;
    if (pct > maxPct || (pct === maxPct && amount > maxAmount)) {
      maxAmount = amount;
      maxPct = pct;
    }
  }

  return {
    current: values[values.length - 1],
    peak,
    amount: maxAmount,
    pct: maxPct,
    points: values.length
  };
}

function summarizeExposure(positions, bankroll = 10) {
  const bank = Number(bankroll) > 0 ? Number(bankroll) : 10;
  const daySums = new Map();
  let totalStake = 0;
  for (const pos of Array.isArray(positions) ? positions : []) {
    const stake = Number(pos && pos.stake);
    if (!(stake > 0)) continue;
    const day = pos.day || dayKeyParis(pos.start);
    totalStake += stake;
    daySums.set(day, (daySums.get(day) || 0) + stake);
  }

  let maxDailyStake = 0;
  let maxDailyDay = null;
  for (const [day, stake] of daySums.entries()) {
    if (stake > maxDailyStake) {
      maxDailyStake = stake;
      maxDailyDay = day;
    }
  }

  return {
    count: Array.isArray(positions) ? positions.length : 0,
    days: daySums.size,
    totalStake,
    totalPct: bank > 0 ? totalStake / bank : 0,
    maxDailyStake,
    maxDailyPct: bank > 0 ? maxDailyStake / bank : 0,
    maxDailyDay
  };
}

function agentSnapshotFromReplay(agent, positions, guardFn) {
  const activePositions = Array.isArray(positions) ? positions : [];
  const nav = Number(agent && agent.nav) || 0;
  const bankroll = nav > 0 ? nav : 10;
  const snapshot = {
    nav,
    delta7: Number(agent && agent.delta7) || 0,
    deltaPct7: Number(agent && agent.deltaPct7) || 0,
    scorableRaw: Array.isArray(agent && agent.scorableRaw) ? agent.scorableRaw.length : Number(agent && agent.scorableRaw) || 0,
    scorable: Array.isArray(agent && agent.scorable) ? agent.scorable.length : Number(agent && agent.scorable) || 0,
    series: Array.isArray(agent && agent.series) ? agent.series.length : 0,
    drawdown: computeDrawdown(agent && agent.series, nav),
    ydayStats: agent && agent.ydayStats ? JSON.parse(JSON.stringify(agent.ydayStats)) : null,
    positions: activePositions,
    exposure: summarizeExposure(activePositions, bankroll),
    blockedExposure: summarizeExposure([], bankroll)
  };
  snapshot.guard = typeof guardFn === 'function' ? guardFn(snapshot) : { status: 'unknown', label: 'Agent non disponible' };
  if (snapshot.guard.status !== 'active') {
    snapshot.blockedPositions = snapshot.positions;
    snapshot.blockedExposure = summarizeExposure(snapshot.blockedPositions, bankroll);
    snapshot.positions = [];
    snapshot.exposure = summarizeExposure([], bankroll);
  }
  return snapshot;
}

module.exports = {
  kellyFraction,
  stakeFor,
  dayKeyParis,
  bestFromPrediction,
  buildAgentPositions,
  computeDrawdown,
  summarizeExposure,
  agentSnapshotFromReplay
};

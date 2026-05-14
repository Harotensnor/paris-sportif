function normalizeMarketKey(value) {
  const raw = String(value || '').trim().toLowerCase();
  const compact = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
  const map = {
    '1n2': '1n2',
    vainqueur: '1n2',
    matchwinner: '1n2',
    btts: 'btts',
    doublechance: 'doublechance',
    remboursesinul: 'dnb',
    dnb: 'dnb',
    teamtotal: 'teamTotal',
    totalequipe: 'teamTotal',
    httotal: 'htTotal',
    totalmitemps: 'htTotal',
    overunder: 'ou',
    ou: 'ou',
    ou15: 'ou15',
    ou25: 'ou25',
    ou35: 'ou35'
  };
  return map[compact] || raw || 'unknown';
}

function normalizeBucketKey(value, fallback = 'unknown') {
  const text = String(value || '').trim().toLowerCase();
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]+/g, '_')
    .replace(/^_+|_+$/g, '') || fallback;
}

function edgeBucketKey(value) {
  const edge = Number(value);
  if (!Number.isFinite(edge)) return 'edge_unknown';
  if (edge < 0.05) return 'edge_00_05';
  if (edge < 0.10) return 'edge_05_10';
  if (edge < 0.20) return 'edge_10_20';
  return 'edge_20_plus';
}

function contextTierFromPick(pick) {
  const raw = pick?.context_tier || pick?.contextTier || pick?.contextQuality?.tier || pick?.match?.context?.quality?.tier || '';
  const key = normalizeBucketKey(raw, 'unknown');
  if (['fort', 'strong'].includes(key)) return 'fort';
  if (['correct', 'medium'].includes(key)) return 'correct';
  if (['faible', 'weak'].includes(key)) return 'faible';
  if (['insuffisant', 'poor'].includes(key)) return 'insuffisant';
  const score = Number(pick?.context_score ?? pick?.contextScore ?? pick?.contextQuality?.score ?? pick?.match?.context?.quality?.score);
  if (!Number.isFinite(score)) return 'unknown';
  if (score >= 75) return 'fort';
  if (score >= 55) return 'correct';
  if (score >= 42) return 'faible';
  return 'insuffisant';
}

function flatSettledPicks(summaryOrRows) {
  if (Array.isArray(summaryOrRows)) {
    return summaryOrRows.filter((pick) => pick && (pick.result === 'won' || pick.result === 'lost'));
  }
  const days = Array.isArray(summaryOrRows?.by_day) ? summaryOrRows.by_day : [];
  const rows = [];
  for (const day of days) {
    for (const pick of Array.isArray(day.picks) ? day.picks : []) {
      if (pick && (pick.result === 'won' || pick.result === 'lost')) rows.push(pick);
    }
  }
  return rows;
}

function emptyBucket(key) {
  return {
    key,
    count: 0,
    won: 0,
    lost: 0,
    winRate: 0,
    avgOdd: 0,
    avgProb: 0,
    avgImplied: 0,
    avgEdge: 0,
    roi: 0,
    level: 'sample_wait'
  };
}

function finalizeBucket(bucket, minSamples) {
  if (!bucket.count) return bucket;
  bucket.winRate = bucket.won / bucket.count;
  bucket.avgOdd /= bucket.count;
  bucket.avgProb /= bucket.count;
  bucket.avgImplied /= bucket.count;
  bucket.avgEdge /= bucket.count;
  bucket.roi /= bucket.count;
  if (bucket.count < minSamples) {
    bucket.level = 'sample_wait';
  } else if (bucket.roi < -0.20 && bucket.winRate < bucket.avgImplied - 0.05) {
    bucket.level = 'cold';
  } else if (bucket.roi > 0.08 && bucket.winRate > bucket.avgImplied + 0.03) {
    bucket.level = 'warm';
  } else {
    bucket.level = 'tracked';
  }
  return bucket;
}

function updateBucket(bucket, pick) {
  const odd = Number(pick.odd_book || pick.odd || 0);
  const prob = Number(pick.prob_model || pick.probability || 0);
  const edge = Number(pick.edge || 0);
  if (!(odd > 1)) return;
  bucket.count += 1;
  if (pick.result === 'won') {
    bucket.won += 1;
    bucket.roi += odd - 1;
  } else {
    bucket.lost += 1;
    bucket.roi -= 1;
  }
  bucket.avgOdd += odd;
  bucket.avgProb += prob > 0 ? prob : 0;
  bucket.avgImplied += 1 / odd;
  bucket.avgEdge += edge;
}

function buildCalibration(summaryOrRows, options = {}) {
  const minSamples = Number(options.minSamples ?? 20);
  const rows = flatSettledPicks(summaryOrRows);
  const byMarket = {};
  const byContextTier = {};
  const byMarketContext = {};
  const bySport = {};
  const byLeague = {};
  const byEdgeBucket = {};
  const overall = emptyBucket('overall');

  for (const pick of rows) {
    const marketKey = normalizeMarketKey(pick.market_key || pick.market || '');
    const sportKey = String(pick.sport || 'sport').toLowerCase();
    const leagueKey = normalizeBucketKey(pick.league || pick.league_code || pick.competition || '', 'league_unknown');
    const edgeKey = edgeBucketKey(pick.edge);
    const contextTier = contextTierFromPick(pick);
    const marketContextKey = `${marketKey}:${contextTier}`;
    byMarket[marketKey] ||= emptyBucket(marketKey);
    byContextTier[contextTier] ||= emptyBucket(contextTier);
    byMarketContext[marketContextKey] ||= emptyBucket(marketContextKey);
    bySport[sportKey] ||= emptyBucket(sportKey);
    byLeague[leagueKey] ||= emptyBucket(leagueKey);
    byEdgeBucket[edgeKey] ||= emptyBucket(edgeKey);
    updateBucket(byMarket[marketKey], pick);
    updateBucket(byContextTier[contextTier], pick);
    updateBucket(byMarketContext[marketContextKey], pick);
    updateBucket(bySport[sportKey], pick);
    updateBucket(byLeague[leagueKey], pick);
    updateBucket(byEdgeBucket[edgeKey], pick);
    updateBucket(overall, pick);
  }

  Object.values(byMarket).forEach((bucket) => finalizeBucket(bucket, minSamples));
  Object.values(byContextTier).forEach((bucket) => finalizeBucket(bucket, minSamples));
  Object.values(byMarketContext).forEach((bucket) => finalizeBucket(bucket, minSamples));
  Object.values(bySport).forEach((bucket) => finalizeBucket(bucket, minSamples));
  Object.values(byLeague).forEach((bucket) => finalizeBucket(bucket, minSamples));
  Object.values(byEdgeBucket).forEach((bucket) => finalizeBucket(bucket, minSamples));
  finalizeBucket(overall, minSamples);

  return {
    minSamples,
    settled: overall.count,
    overall,
    byMarket,
    byContextTier,
    byMarketContext,
    bySport,
    byLeague,
    byEdgeBucket,
    markets: Object.values(byMarket).sort((a, b) => b.count - a.count),
    contextTiers: Object.values(byContextTier).sort((a, b) => b.count - a.count),
    marketContexts: Object.values(byMarketContext).sort((a, b) => b.count - a.count),
    leagues: Object.values(byLeague).sort((a, b) => b.count - a.count),
    edgeBuckets: Object.values(byEdgeBucket).sort((a, b) => b.count - a.count)
  };
}

function formatPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `${(n * 100).toFixed(0)}%`;
}

function contextThresholds(contextTier, buckets, edge) {
  let minEdge = 0.03;
  let minTrust = 50;
  if (contextTier === 'insuffisant') {
    minEdge += 0.05;
    minTrust += 15;
  } else if (contextTier === 'faible') {
    minEdge += 0.025;
    minTrust += 8;
  } else if (contextTier === 'fort') {
    minEdge -= 0.005;
  }
  for (const bucket of buckets) {
    if (!bucket || !bucket.count) continue;
    if (bucket.level === 'cold') {
      minEdge += bucket.key && String(bucket.key).includes(':') ? 0.04 : 0.025;
      minTrust += 5;
    } else if (bucket.level === 'warm' && edge >= 0.05) {
      minEdge -= 0.005;
    }
  }
  return {
    minEdge: Math.max(0.02, Math.min(0.16, minEdge)),
    minTrust: Math.max(45, Math.min(75, minTrust))
  };
}

function assessPick(row, calibration) {
  const minSamples = Number(calibration?.minSamples || 20);
  const marketKey = normalizeMarketKey(row?.marketKey || row?.market || '');
  const sportKey = String(row?.sport || '').toLowerCase();
  const leagueKey = normalizeBucketKey(row?.league || row?.leagueCode || row?.league_code || '', 'league_unknown');
  const edgeKey = edgeBucketKey(row?.edge);
  const contextTier = contextTierFromPick(row);
  const marketContextKey = `${marketKey}:${contextTier}`;
  const exactBucket = calibration?.byMarketContext?.[marketContextKey] || null;
  const marketBucket = calibration?.byMarket?.[marketKey] || null;
  const contextBucket = calibration?.byContextTier?.[contextTier] || null;
  const bucket = (exactBucket && exactBucket.count >= minSamples ? exactBucket : null) ||
    marketBucket ||
    calibration?.bySport?.[sportKey] ||
    calibration?.overall ||
    null;
  const leagueBucket = calibration?.byLeague?.[leagueKey] || null;
  const edgeBucket = calibration?.byEdgeBucket?.[edgeKey] || null;
  if (!bucket || !bucket.count) {
    return { marketKey, leagueKey, edgeKey, contextTier, marketContextKey, level: 'unknown', blocked: false, label: 'Historique indisponible' };
  }
  const edge = Number(row?.edge || 0);
  const thresholds = contextThresholds(contextTier, [exactBucket, marketBucket, contextBucket, leagueBucket, edgeBucket], edge);
  const trustScore = Number(row?.confidenceTrust?.score ?? row?.trustScore ?? row?.trust_score);
  const marketCold = bucket.level === 'cold' && bucket.count >= minSamples;
  const exactCold = exactBucket?.level === 'cold' && exactBucket.count >= minSamples;
  const contextCold = contextBucket?.level === 'cold' && contextBucket.count >= minSamples;
  const leagueCold = leagueBucket?.level === 'cold' && leagueBucket.count >= minSamples * 2;
  const reinforced = (marketCold || exactCold) && leagueCold && edge < Math.max(0.12, thresholds.minEdge);
  const marketBlock = marketCold && edge < Math.max(0.06, thresholds.minEdge);
  const exactBlock = exactCold && edge < Math.max(0.07, thresholds.minEdge);
  const contextBlock = contextCold && edge < Math.max(0.08, thresholds.minEdge);
  const leagueBlock = leagueCold && edge < Math.max(0.04, thresholds.minEdge - 0.015);
  const thresholdBlock = edge > 0 && edge < thresholds.minEdge && contextTier !== 'fort';
  const trustBlock = Number.isFinite(trustScore) && trustScore < thresholds.minTrust && edge < Math.max(0.10, thresholds.minEdge);
  const blocked = reinforced || marketBlock || exactBlock || contextBlock || leagueBlock || thresholdBlock || trustBlock;
  const blockReason = reinforced
    ? 'prudence renforcée : marché et ligue froids'
    : exactBlock
      ? 'marché froid dans ce niveau de contexte'
    : marketBlock
      ? 'marché froid'
      : contextBlock
        ? 'niveau de contexte historiquement froid'
      : leagueBlock
        ? 'ligue froide'
        : thresholdBlock
          ? `edge trop faible pour contexte ${contextTier}`
          : trustBlock
            ? 'confiance insuffisante pour ce contexte'
        : null;
  const label = bucket.count < calibration.minSamples
    ? `Historique en attente (${bucket.count}/${minSamples})`
    : `Historique ${bucket.count} réglés · ROI ${formatPct(bucket.roi)}`;
  return {
    marketKey,
    leagueKey,
    edgeKey,
    contextTier,
    marketContextKey,
    level: bucket.level,
    blocked,
    mode: reinforced ? 'reinforced_caution' : 'standard',
    blockReason,
    label,
    sample: bucket.count,
    minEdge: thresholds.minEdge,
    minTrust: thresholds.minTrust,
    roi: bucket.roi,
    winRate: bucket.winRate,
    avgImplied: bucket.avgImplied,
    marketContext: exactBucket ? {
      level: exactBucket.level,
      sample: exactBucket.count,
      roi: exactBucket.roi,
      winRate: exactBucket.winRate,
      avgImplied: exactBucket.avgImplied
    } : null,
    context: contextBucket ? {
      level: contextBucket.level,
      sample: contextBucket.count,
      roi: contextBucket.roi,
      winRate: contextBucket.winRate,
      avgImplied: contextBucket.avgImplied
    } : null,
    league: leagueBucket ? {
      level: leagueBucket.level,
      sample: leagueBucket.count,
      roi: leagueBucket.roi,
      winRate: leagueBucket.winRate,
      avgImplied: leagueBucket.avgImplied
    } : null,
    edgeBucket: edgeBucket ? {
      level: edgeBucket.level,
      sample: edgeBucket.count,
      roi: edgeBucket.roi,
      winRate: edgeBucket.winRate,
      avgImplied: edgeBucket.avgImplied
    } : null
  };
}

function annotateMatches(rows, calibration) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const assessment = assessPick(row, calibration);
    if (!assessment.blocked) return { ...row, calibration: assessment };
    return {
      ...row,
      stake: 0,
      status: 'watch',
      statusLabel: assessment.mode === 'reinforced_caution' ? 'Prudence renforcée' : 'Freiné par historique',
      calibration: assessment
    };
  });
}

module.exports = {
  normalizeMarketKey,
  normalizeBucketKey,
  edgeBucketKey,
  contextTierFromPick,
  buildCalibration,
  assessPick,
  annotateMatches
};

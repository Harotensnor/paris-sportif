function normalizeCombines(rawCombines, adapters) {
  const {
    cleanTitle,
    cleanLabel,
    getTeamNames,
    formatMarketName,
    normalizePickLabel
  } = adapters;
  return (Array.isArray(rawCombines) ? rawCombines : []).slice(0, 12).map((combo) => {
    const legs = Array.isArray(combo.legs) ? combo.legs : [];
    return {
      type: combo.type || 'combine',
      title: cleanTitle(combo.title, 'Combiné'),
      desc: cleanLabel(combo.desc, ''),
      totalOdd: Number(combo.totalOdd) || legs.reduce((acc, leg) => acc * (Number(leg.odd) || Number(leg.marketPick?.odd) || 1), 1),
      avgProb: Number(combo.avgProb) || 0,
      combinedProb: Number(combo.combinedProb) || 0,
      rawCombinedProb: Number(combo.rawCombinedProb) || 0,
      correlationAvg: Number(combo.correlationAvg) || 0,
      correlationNote: cleanLabel(combo.correlationNote, ''),
      sameGame: Boolean(combo.sameGame),
      nextKickoff: Number.isFinite(Number(combo.nextKickoff)) ? Number(combo.nextKickoff) : null,
      legs: legs.map((leg) => {
        const match = leg.m || {};
        const teams = getTeamNames(match);
        const marketPick = leg.marketPick || {};
        const pred = leg.pred || {};
        const rawMarket = marketPick.market || pred.market || '1n2';
        const market = formatMarketName(rawMarket);
        return {
          id: String(match.winamax?.match_id || match.id || match.uid || `${match.date}-${teams.home}-${teams.away}`),
          title: `${teams.home} - ${teams.away}`,
          sport: match.sport || 'sport',
          league: match.league_name || match.league_code || '',
          start: match.date || '',
          market,
          label: normalizePickLabel(match, market, marketPick.label || pred.pick || pred.pick?.label, 'Pick'),
          odd: Number(leg.odd) || Number(marketPick.odd) || 0,
          probability: Number(leg.rel ?? marketPick.prob ?? pred.pick?.prob ?? pred.reliability) || 0,
          edge: Number(marketPick.edge) || 0
        };
      })
    };
  });
}

function buildNativeCombines(win, matches, adapters) {
  const api = win.__testAPI || {};
  const fn = typeof api.buildCombines === 'function'
    ? api.buildCombines
    : typeof win.buildCombines === 'function'
      ? win.buildCombines
      : null;
  if (!fn) return [];
  let combines = [];
  try {
    combines = fn(matches, { minMinutes: 0, safeTarget: 3, balancedTarget: 4, boldTarget: 3 }) || [];
  } catch {
    combines = [];
  }
  return normalizeCombines(combines, adapters);
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function nameMatches(a, b) {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;
  const leftTokens = new Set(left.split(/\s+/).filter((x) => x.length >= 3));
  const rightTokens = new Set(right.split(/\s+/).filter((x) => x.length >= 3));
  let shared = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) shared += 1;
  }
  return shared >= Math.min(2, Math.max(1, Math.min(leftTokens.size, rightTokens.size)));
}

function scorerSide(scorer, match, teams) {
  const competitors = Array.isArray(match?.competitors) ? match.competitors : [];
  const home = competitors.find((c) => c && c.home_away === 'home') || competitors[0] || {};
  const away = competitors.find((c) => c && c.home_away === 'away') || competitors[1] || {};
  if (scorer?.isHome === true) return { key: 'home', team: home, name: teams.home };
  if (scorer?.isHome === false) return { key: 'away', team: away, name: teams.away };
  const teamText = normalizeName(`${scorer?.teamName || ''} ${scorer?.teamShort || ''} ${scorer?.teamAbbr || ''}`);
  if (teamText && nameMatches(teamText, teams.home)) return { key: 'home', team: home, name: teams.home };
  if (teamText && nameMatches(teamText, teams.away)) return { key: 'away', team: away, name: teams.away };
  return { key: 'unknown', team: {}, name: scorer?.teamName || '' };
}

function lineupForSide(match, side) {
  const direct = side.team?.lineup || null;
  if (direct) return direct;
  const lineups = match?.lineups || {};
  return lineups[side.key] || null;
}

function lineupStatusForScorer(scorer, match, side) {
  const lineup = lineupForSide(match, side);
  const starters = Array.isArray(lineup?.starters) ? lineup.starters : [];
  const starter = starters.find((player) => nameMatches(player?.name || player, scorer?.name));
  if (starter) {
    return {
      status: lineup?.confirmed ? 'starter_confirmed' : 'starter_projected',
      confirmed: Boolean(lineup?.confirmed),
      starter: true,
      formation: lineup?.formation || null
    };
  }
  if (lineup?.confirmed && starters.length) {
    return { status: 'not_starter_confirmed', confirmed: true, starter: false, formation: lineup?.formation || null };
  }
  if (starters.length) {
    return { status: 'not_in_projected_lineup', confirmed: false, starter: false, formation: lineup?.formation || null };
  }
  return { status: 'lineup_unknown', confirmed: false, starter: false, formation: null };
}

function availabilityForSide(match, side) {
  const availability = match?.context?.availability || {};
  return availability[side.key] || {};
}

function isScorerInjured(scorer, match, side) {
  const availability = availabilityForSide(match, side);
  const injuries = availability?.injuries || {};
  const names = Array.isArray(injuries.names) ? injuries.names : [];
  if (names.some((name) => nameMatches(name, scorer?.name))) return true;
  const sideTeam = side.team || {};
  const raw = [
    ...(Array.isArray(sideTeam.injuries) ? sideTeam.injuries : []),
    ...(Array.isArray(match?.injuries) ? match.injuries : [])
  ];
  return raw.some((item) => nameMatches(item?.name || item?.athlete?.displayName || item, scorer?.name));
}

function hasPlayerMarket(match) {
  const wx = match?.winamax || {};
  const keys = Array.isArray(wx.full_market_keys) ? wx.full_market_keys : [];
  if (keys.some((key) => /buteur|joueur|player|marque/i.test(String(key)))) return true;
  const markets = wx.markets || {};
  return Boolean(markets.buteur || markets.scorer || markets.player_goals || markets.anytime_scorer);
}

function playerMarketOddForScorer(match, scorer, oddsIndex) {
  const matchId = String(match?.winamax?.match_id || match?.id || match?.uid || '');
  const rows = oddsIndex?.[matchId]?.odds?.all_markets || [];
  if (!Array.isArray(rows) || !rows.length) return null;
  // Sprint 43 (P2 audit) : matching buteurs élargi.
  // Avant : market_key === 'buteur' uniquement, cote 1.30-4.00.
  // Après : tout marché buteur "anytime" simple (buteur, premier_buteur,
  // anytime_scorer, goalscorer, scorer). Cote 1.30-5.00.
  const buteurMarketRegex = /^(buteur|anytime_scorer|goalscorer|scorer|premier_buteur)$/i;
  const buteurTitleRegex = /^(buteur|premier buteur|anytime scorer|goalscorer)$/i;
  const candidates = rows
    .filter((row) => buteurMarketRegex.test(String(row?.market_key || '')) || buteurTitleRegex.test(String(row?.title || '')))
    .filter((row) => Number(row?.odd) >= 1.30 && Number(row?.odd) <= 5.00)
    .filter((row) => nameMatches(row?.label || row?.side || '', scorer?.name));
  candidates.sort((a, b) => Number(a.odd || 99) - Number(b.odd || 99));
  const best = candidates[0];
  if (!best) return null;
  return {
    odd: Number(best.odd),
    label: best.label || best.side || scorer?.name || 'Joueur',
    marketKey: best.market_key || 'buteur',
    title: best.title || 'Buteur',
    source: best.source || 'winamax_detail'
  };
}

function minutesToKickoff(match) {
  const ts = Date.parse(match?.date || match?.start || '');
  if (!Number.isFinite(ts)) return null;
  return Math.round((ts - Date.now()) / 60000);
}

function scorerQuality(scorer, match, teams, probability) {
  const side = scorerSide(scorer, match, teams);
  const lineup = lineupStatusForScorer(scorer, match, side);
  const injured = isScorerInjured(scorer, match, side);
  const playerMarket = hasPlayerMarket(match);
  const contextScore = Number(match?.context?.quality?.score);
  const minutes = minutesToKickoff(match);
  const source = String(scorer?.source || 'lineups');
  const reasons = [];
  let score = 30 + clamp(probability, 0, 0.65) * 95;
  let factor = 1;

  if (source === 'lineups') {
    score += 10;
    reasons.push('source lineup');
  } else {
    score -= 7;
    factor *= 0.9;
    reasons.push('profil joueur');
  }

  if (lineup.status === 'starter_confirmed') {
    score += 18;
    reasons.push('titulaire confirmé');
  } else if (lineup.status === 'starter_projected') {
    score += 10;
    reasons.push('titulaire probable');
  } else if (lineup.status === 'not_starter_confirmed') {
    score -= 55;
    factor *= 0.25;
    reasons.push('absent du XI confirmé');
  } else if (lineup.status === 'not_in_projected_lineup') {
    score -= 20;
    factor *= 0.65;
    reasons.push('absent du XI probable');
  } else if (minutes != null && minutes <= 120) {
    score -= 10;
    factor *= 0.82;
    reasons.push('compo inconnue proche kickoff');
  } else {
    reasons.push('compo non confirmée');
  }

  if (injured) {
    score -= 45;
    factor *= 0.2;
    reasons.push('signal blessure');
  }
  if (playerMarket) {
    score += 9;
    reasons.push('marché joueur détecté');
  } else {
    score -= 6;
    factor *= 0.92;
    reasons.push('marché joueur non confirmé');
  }
  if (Number.isFinite(contextScore)) {
    if (contextScore >= 75) score += 6;
    else if (contextScore < 55) {
      score -= 8;
      factor *= 0.9;
    }
    reasons.push(`contexte ${Math.round(contextScore)}/100`);
  }

  score = Math.round(clamp(score, 0, 100));
  const adjustedProbability = clamp(probability * factor, 0, 0.75);
  const gate = injured || lineup.status === 'not_starter_confirmed'
    ? 'skip'
    : score >= 70 && playerMarket
      ? 'strong'
      : score >= 52
        ? 'watch'
        : 'fragile';
  const label = gate === 'strong'
    ? 'Buteur solide'
    : gate === 'watch'
      ? 'Buteur à vérifier'
      : gate === 'skip'
        ? 'Buteur bloqué'
        : 'Profil fragile';
  return {
    score,
    gate,
    label,
    reasons: [...new Set(reasons)].slice(0, 6),
    lineupStatus: lineup.status,
    lineupConfirmed: lineup.confirmed,
    playerMarket,
    injured,
    contextScore: Number.isFinite(contextScore) ? contextScore : null,
    adjustedProbability
  };
}

function normalizeScorer(scorer, matchForScorers, teams, adapters) {
  const { cleanLabel } = adapters;
  const matchId = String(matchForScorers.winamax?.match_id || matchForScorers.id || matchForScorers.uid || `${matchForScorers.date}-${teams.home}-${teams.away}`);
  const prob = Number(scorer && scorer.prob) || 0;
  if (prob < 0.18) return null;
  const playerOdd = playerMarketOddForScorer(matchForScorers, scorer, adapters.playerOddsIndex);
  const quality = scorerQuality(scorer, matchForScorers, teams, prob);
  if (quality.gate === 'skip') return null;
  const adjustedProb = quality.adjustedProbability;
  if (adjustedProb < 0.16 || quality.score < 38) return null;
  const playerOddValue = Number(playerOdd?.odd || 0);
  const playerEdge = playerOddValue > 1 ? adjustedProb - (1 / playerOddValue) : 0;
  return {
    id: `${matchId}:${cleanLabel(scorer.name, 'joueur')}`,
    matchId,
    name: cleanLabel(scorer.name, 'Joueur'),
    position: cleanLabel(scorer.pos, ''),
    captain: Boolean(scorer.captain),
    teamName: cleanLabel(scorer.teamName || scorer.teamShort || scorer.teamAbbr, ''),
    probability: adjustedProb,
    rawProbability: prob,
    odd: playerOddValue || 0,
    impliedOdd: adjustedProb > 0 ? 1 / adjustedProb : Number(scorer.impliedOdd) || 0,
    edge: playerEdge,
    winamaxPlayerMarket: playerOdd,
    playerId: scorer.pid || null,
    source: scorer.source || 'lineups',
    starScore: Number(scorer.starScore || scorer.star_score || 0),
    playerQuality: quality,
    title: `${teams.home} - ${teams.away}`,
    home: teams.home,
    away: teams.away,
    league: matchForScorers.league_name || matchForScorers.league_code || '',
    start: matchForScorers.date || '',
    winamaxUrl: matchForScorers.winamax && matchForScorers.winamax.url
  };
}

function buildNativeScorers(win, matches, options) {
  if (typeof win.predictLikelyScorers !== 'function' || typeof win.predictMatch !== 'function') return [];
  const rows = [];
  for (const match of Array.isArray(matches) ? matches : []) {
    if (!match || match.sport !== 'football' || match.completed) continue;
    const matchForScorers = options.matchWithLineups(match, options.findLineupForMatch(options.lineupsIndex, match));
    let pred = null;
    let scorers = [];
    try {
      pred = win.predictMatch(matchForScorers);
      if (pred) scorers = win.predictLikelyScorers(matchForScorers, pred) || [];
    } catch {
      scorers = [];
    }
    if (!Array.isArray(scorers) || !scorers.length) {
      scorers = options.fallbackScorersFromStars(matchForScorers, pred, options.starPlayersIndex);
    }
    if (!Array.isArray(scorers) || !scorers.length) continue;
    const teams = options.getTeamNames(matchForScorers);
    scorers.slice(0, 2).forEach((scorer) => {
      const row = normalizeScorer(scorer, matchForScorers, teams, options);
      if (row) rows.push(row);
    });
  }
  return rows
    .sort((a, b) => (b.probability - a.probability) || (Date.parse(a.start || '') - Date.parse(b.start || '')))
    .slice(0, 30);
}

module.exports = {
  normalizeCombines,
  buildNativeCombines,
  normalizeScorer,
  buildNativeScorers
};

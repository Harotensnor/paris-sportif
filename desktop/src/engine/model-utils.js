function normalizeTeamKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}

function looseTeamKey(value) {
  const tokens = String(value || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((token) => !['fc', 'cf', 'sc', 'afc', 'ud', 'club', 'the', 'de', 'la'].includes(token));
  return tokens.join('');
}

function teamNameVariants(team) {
  const values = [team?.name, team?.short, team?.abbr, team?.displayName]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  const out = new Set();
  for (const value of values) {
    const strict = normalizeTeamKey(value);
    const loose = looseTeamKey(value);
    if (strict) out.add(strict);
    if (loose) out.add(loose);
  }
  return [...out];
}

function variantSetFromName(name) {
  return new Set(teamNameVariants({ name }));
}

function teamMatches(entryName, variants) {
  if (!entryName || !variants || !variants.length) return false;
  const entryVariants = variantSetFromName(entryName);
  return variants.some((variant) => entryVariants.has(variant));
}

function getMatchSides(match) {
  const competitors = Array.isArray(match && match.competitors) ? match.competitors : [];
  return {
    home: competitors.find((c) => c && c.home_away === 'home') || competitors[0] || {},
    away: competitors.find((c) => c && c.home_away === 'away') || competitors[1] || {}
  };
}

function sofaEventId(value) {
  const raw = String(value?.sofa_event_id || value?.sofascore_id || value?.id || value?.uid || '');
  const match = raw.match(/(?:sofa_)?(\d{5,})/);
  return match ? match[1] : '';
}

function timestampMs(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 10_000_000_000 ? value : value * 1000;
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function entryTimestamp(entry) {
  return timestampMs(entry?.date || entry?.start || entry?.startDate || entry?.kickoff || entry?.startTimestamp);
}

function matchTimestamp(match) {
  return timestampMs(match?.date || match?.startDate || match?.start || match?.kickoff);
}

function minutesBetween(a, b) {
  if (a == null || b == null) return null;
  return Math.abs(a - b) / 60000;
}

function isTimeCompatible(item, match, maxMinutes = 240) {
  const entryTs = entryTimestamp(item.entry);
  const matchTs = matchTimestamp(match);
  const delta = minutesBetween(entryTs, matchTs);
  return delta == null || delta <= maxMinutes;
}

function cloneLineup(lineup, meta = {}) {
  if (!lineup || typeof lineup !== 'object') return null;
  return {
    ...lineup,
    starters: Array.isArray(lineup.starters) ? lineup.starters.map((player) => ({ ...player })) : [],
    subs: Array.isArray(lineup.subs) ? lineup.subs.map((player) => ({ ...player })) : [],
    ...meta
  };
}

function lineupEntries(lineupsIndex) {
  return Object.entries(lineupsIndex || {}).map(([key, entry]) => ({
    key,
    entry,
    league: entry?.league_code || '',
    date: entry?.date || entry?.start || entry?.startDate || null,
    homeTeam: entry?.home?.team || '',
    awayTeam: entry?.away?.team || ''
  }));
}

function findBySofaId(entries, match) {
  const id = sofaEventId(match);
  if (!id) return null;
  return entries.find((item) => sofaEventId(item.entry) === id) || null;
}

function findExactLineup(entries, homeVariants, awayVariants, match) {
  return entries.find((item) => (
    teamMatches(item.homeTeam, homeVariants) &&
    teamMatches(item.awayTeam, awayVariants) &&
    isTimeCompatible(item, match)
  )) || null;
}

function findSideProjection(entries, team, leagueCode) {
  const variants = teamNameVariants(team);
  if (!variants.length) return null;
  const leagueMatches = entries.filter((item) => !leagueCode || !item.league || item.league === leagueCode);
  const pool = leagueMatches.length ? leagueMatches : entries;
  const sorted = pool.slice().sort((a, b) => {
    const aDelta = minutesBetween(entryTimestamp(a.entry), Date.now());
    const bDelta = minutesBetween(entryTimestamp(b.entry), Date.now());
    if (aDelta == null && bDelta == null) return 0;
    if (aDelta == null) return 1;
    if (bDelta == null) return -1;
    return aDelta - bDelta;
  });
  for (const item of sorted) {
    if (teamMatches(item.homeTeam, variants) && item.entry?.home) {
      return {
        lineup: cloneLineup(item.entry.home, {
          confirmed: Boolean(item.entry.home.confirmed),
          projected: true,
          projectionSource: item.key,
          projectionMatchTeam: item.homeTeam,
          projectionLeague: item.league || null,
          projectionDate: item.date || null
        }),
        sourceKey: item.key
      };
    }
    if (teamMatches(item.awayTeam, variants) && item.entry?.away) {
      return {
        lineup: cloneLineup(item.entry.away, {
          confirmed: Boolean(item.entry.away.confirmed),
          projected: true,
          projectionSource: item.key,
          projectionMatchTeam: item.awayTeam,
          projectionLeague: item.league || null,
          projectionDate: item.date || null
        }),
        sourceKey: item.key
      };
    }
  }
  return null;
}

function findLineupForMatch(lineupsIndex, match) {
  const entries = lineupEntries(lineupsIndex);
  if (!entries.length || !match || match.sport !== 'football') return null;
  const { home, away } = getMatchSides(match);
  const homeVariants = teamNameVariants(home);
  const awayVariants = teamNameVariants(away);
  const byId = findBySofaId(entries, match);
  const exact = byId || findExactLineup(entries, homeVariants, awayVariants, match);
  if (exact) {
    return {
      ...exact.entry,
      home: cloneLineup(exact.entry.home, { exactMatch: true, projected: false, sourceDate: exact.date || null }),
      away: cloneLineup(exact.entry.away, { exactMatch: true, projected: false, sourceDate: exact.date || null }),
      lineupMatchType: byId ? 'exact_id' : 'exact_time'
    };
  }

  const homeProjection = findSideProjection(entries, home, match.league_code);
  const awayProjection = findSideProjection(entries, away, match.league_code);
  if (!homeProjection && !awayProjection) return null;
  return {
    home: homeProjection ? homeProjection.lineup : null,
    away: awayProjection ? awayProjection.lineup : null,
    league_code: match.league_code || null,
    lineupMatchType: 'team_projection',
    projectionSources: {
      home: homeProjection?.sourceKey || null,
      away: awayProjection?.sourceKey || null
    }
  };
}

function matchWithLineups(match, lineupEntry) {
  if (!lineupEntry) return match;
  const competitors = Array.isArray(match && match.competitors) ? match.competitors : [];
  const next = {
    ...match,
    competitors: competitors.map((team) => ({ ...team })),
    lineup_match_type: lineupEntry.lineupMatchType || 'exact',
    lineup_projection_sources: lineupEntry.projectionSources || null
  };
  const home = next.competitors.find((c) => c && c.home_away === 'home') || next.competitors[0];
  const away = next.competitors.find((c) => c && c.home_away === 'away') || next.competitors[1];
  if (home && lineupEntry.home) home.lineup = cloneLineup(lineupEntry.home);
  if (away && lineupEntry.away) away.lineup = cloneLineup(lineupEntry.away);
  return next;
}

function normalizeRefereeForModel(match) {
  const raw = (match && (match.referee || match.referee_context)) || null;
  if (!raw || typeof raw !== 'object') return null;
  const cards = Number(raw.cardsPerGame ?? raw.cards_per_match ?? raw.yellowPerGame);
  const yellow = Number(raw.yellowPerGame ?? cards);
  const red = Number(raw.redPerGame ?? raw.red_per_game);
  const games = Number(raw.games ?? raw.sampleSize ?? raw.sample_size);
  const league = match?.league_code || match?.league_name || '';
  const fallbackName = raw.assignmentConfirmed === false
    ? `Moyenne ligue${league ? ` ${league}` : ''}`
    : 'Arbitre';
  return {
    ...raw,
    name: raw.name || fallbackName,
    yellowPerGame: Number.isFinite(yellow) ? yellow : null,
    redPerGame: Number.isFinite(red) ? red : null,
    cardsPerGame: Number.isFinite(cards) ? cards : null,
    games: Number.isFinite(games) ? games : 0,
    assignmentConfirmed: raw.assignmentConfirmed !== false,
    source: raw.source || (match?.referee ? 'referee' : 'referee_context'),
    leagueAverage: !match?.referee && Boolean(match?.referee_context)
  };
}

function hasLineup(match) {
  return Boolean(
    match?.lineups ||
    match?.lineup ||
    (Array.isArray(match?.competitors) && match.competitors.some((team) => team && team.lineup))
  );
}

function hasExactLineup(match) {
  return Boolean(Array.isArray(match?.competitors) && match.competitors.some((team) => team?.lineup?.exactMatch));
}

function hasProjectedLineup(match) {
  return Boolean(Array.isArray(match?.competitors) && match.competitors.some((team) => team?.lineup?.projected));
}

function hasUsableReferee(match) {
  const ref = match?.referee || match?.referee_context;
  return Boolean(ref && (
    Number.isFinite(Number(ref.cardsPerGame)) ||
    Number.isFinite(Number(ref.yellowPerGame)) ||
    Number.isFinite(Number(ref.cards_per_match))
  ));
}

function hasXgSignal(match) {
  return Boolean(
    match?.xg_source ||
    match?.xg ||
    (Array.isArray(match?.competitors) && match.competitors.some((team) => (
      team?.xg_stats ||
      team?.fbref_xg ||
      team?.xg_for_avg != null ||
      team?.xg_against_avg != null
    )))
  );
}

function hasH2hSignal(match) {
  const h2h = match?.h2h || match?.h2h_extended || match?.head_to_head;
  return Boolean(
    (h2h && typeof h2h === 'object' && (
      Number(h2h.total || h2h.matches || h2h.count || 0) > 0 ||
      Number(h2h.meetings_count || 0) > 0 ||
      Array.isArray(h2h.meetings) && h2h.meetings.length > 0 ||
      Array.isArray(h2h.recent) && h2h.recent.length > 0 ||
      Array.isArray(h2h.matches) && h2h.matches.length > 0
    )) ||
    Array.isArray(match?.h2h_matches) && match.h2h_matches.length > 0
  );
}

function hasMatchContext(match) {
  return Boolean(match?.context?.quality && Number.isFinite(Number(match.context.quality.score)));
}

function buildSignalCoverage(events) {
  const football = events.filter((match) => match && match.sport === 'football');
  const count = (fn) => football.filter(fn).length;
  return {
    football: football.length,
    lineups: count(hasLineup),
    lineupsExact: count(hasExactLineup),
    lineupProfiles: count(hasProjectedLineup),
    referee: count((match) => Boolean(match.referee)),
    refereeContext: count((match) => Boolean(match.referee_context)),
    refereeUsable: count(hasUsableReferee),
    weather: count((match) => Boolean(match.weather)),
    injuries: count((match) => Boolean(
      match.injuries ||
      match.injuries_home != null ||
      match.injuries_away != null ||
      (Array.isArray(match.competitors) && match.competitors.some((team) => Array.isArray(team?.injuries) && team.injuries.length))
    )),
    clubelo: count((match) => Boolean(
      match.clubelo ||
      (Array.isArray(match.competitors) && match.competitors.some((team) => team?.clubelo || team?.elo))
    )),
    xg: count(hasXgSignal),
    h2h: count(hasH2hSignal),
    context: count(hasMatchContext),
    contextStrong: count((match) => Number(match?.context?.quality?.score || 0) >= 75),
    contextWeak: count((match) => {
      const score = Number(match?.context?.quality?.score);
      return Number.isFinite(score) && score < 55;
    })
  };
}

function agentGuard(agent) {
  if (!agent) return { status: 'unknown', label: 'Agent non disponible' };
  if (Number(agent.deltaPct7) <= -0.30) {
    return { status: 'paused', label: 'Pause stop-loss 7 jours' };
  }
  const yday = agent.ydayStats || {};
  const ydayDelta = Number(yday.deltaPct ?? yday.delta_pct ?? yday.roi ?? 0);
  if (ydayDelta >= 0.10) return { status: 'locked', label: 'Take-profit journalier atteint' };
  return { status: 'active', label: 'Actif, Kelly strict' };
}

module.exports = {
  normalizeTeamKey,
  looseTeamKey,
  teamNameVariants,
  findLineupForMatch,
  matchWithLineups,
  normalizeRefereeForModel,
  hasLineup,
  hasExactLineup,
  hasProjectedLineup,
  hasUsableReferee,
  hasXgSignal,
  hasH2hSignal,
  hasMatchContext,
  buildSignalCoverage,
  agentGuard
};

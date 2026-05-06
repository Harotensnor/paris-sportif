self.onmessage = (event) => {
  const { id, type, matches = [] } = event.data || {};
  if (type !== 'team-priors') return;
  const started = Date.now();
  const teams = new Map();
  const touch = (name) => {
    const key = String(name || '').trim();
    if (!key) return null;
    if (!teams.has(key)) teams.set(key, { team: key, sample: 0, goalsFor: 0, goalsAgainst: 0, wins: 0 });
    return teams.get(key);
  };
  for (const match of matches) {
    const home = touch(match?.home || match?.homeName || match?.competitors?.[0]?.team?.displayName);
    const away = touch(match?.away || match?.awayName || match?.competitors?.[1]?.team?.displayName);
    const hs = Number(match?.home_score ?? match?.homeScore ?? match?.score?.home);
    const as = Number(match?.away_score ?? match?.awayScore ?? match?.score?.away);
    if (!home || !away || !Number.isFinite(hs) || !Number.isFinite(as)) continue;
    home.sample += 1; away.sample += 1;
    home.goalsFor += hs; home.goalsAgainst += as;
    away.goalsFor += as; away.goalsAgainst += hs;
    if (hs > as) home.wins += 1;
    if (as > hs) away.wins += 1;
  }
  const priors = Array.from(teams.values()).map((team) => ({
    team: team.team,
    sample: team.sample,
    prior_for: team.sample ? Number((team.goalsFor / team.sample).toFixed(3)) : 0,
    prior_against: team.sample ? Number((team.goalsAgainst / team.sample).toFixed(3)) : 0,
    winrate: team.sample ? Number((team.wins / team.sample).toFixed(3)) : 0,
  }));
  self.postMessage({ id, ok: true, teams: priors.length, priors: priors.slice(0, 200), durationMs: Date.now() - started });
};

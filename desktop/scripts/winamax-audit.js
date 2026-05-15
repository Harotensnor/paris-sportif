#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createLegacyEngineService } = require('../src/engine/legacy-engine');

const root = path.resolve(__dirname, '..', '..');

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  } catch {
    return fallback;
  }
}

function loadDataJs() {
  const text = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
  const match = text.match(/window\.PRONOSTICS_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) throw new Error('data.js ne contient pas window.PRONOSTICS_DATA');
  return Function(`"use strict"; return (${match[1]});`)();
}

function parisDay(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(value));
}

function eventListFromDays(days) {
  const rows = [];
  Object.entries(days || {}).forEach(([dayKey, value]) => {
    const events = Array.isArray(value) ? value : Array.isArray(value?.events) ? value.events : [];
    events.forEach((event) => rows.push({ ...event, __dayKey: dayKey }));
  });
  return rows;
}

function compact(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function familyFor(value) {
  const key = compact(value);
  if (/1n2|vainqueur|matchwinner|resultatfinal/.test(key)) return '1n2';
  if (/doublechance|dc/.test(key)) return 'doublechance';
  if (/btts|les2equipes|bothteamstoscore/.test(key)) return 'btts';
  if (/corner/.test(key)) return 'corners';
  if (/carton|card/.test(key)) return 'cards';
  if (/mitemps|halftime|1ereperiode|ht/.test(key)) return 'halftime';
  if (/dnb|remboursesinul|drawnobet/.test(key)) return 'dnb';
  if (/handicap|asian|spread/.test(key)) return 'handicap';
  if (/exact|scorecorrect|scoreexact/.test(key)) return 'exactscore';
  if (/buteur|passeur|joueur|player|scorer|goalscorer|marqueur|tir|shot/.test(key)) return 'players';
  if (/teamtotal|totalequipe|totalquipe/.test(key)) return 'teamtotal';
  if (/basket|baskettotal|points/.test(key)) return 'basket';
  if (/tennis|jeu|set/.test(key)) return 'tennis';
  if (/hockey|runs|baseball/.test(key)) return 'sporttotal';
  if (/over|under|plus|moins|total|ou[0-9]/.test(key)) return 'ou';
  return key ? 'other' : 'unknown';
}

const labels = {
  '1n2': 'Vainqueur',
  ou: 'Plus / Moins',
  btts: 'Les deux équipes marquent',
  halftime: 'Mi-temps',
  players: 'Buteurs / joueurs',
  doublechance: 'Double chance',
  dnb: 'Remboursé si nul',
  handicap: 'Handicap',
  teamtotal: 'Total équipe',
  basket: 'Total basket',
  tennis: 'Jeux / sets tennis',
  sporttotal: 'Totals sport',
  exactscore: 'Score exact',
  cards: 'Cartons',
  corners: 'Corners',
  other: 'Autres'
};

function bump(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function mapRows(map, mapper = (key, count) => ({ key, count })) {
  return Array.from(map.entries()).map(([key, count]) => mapper(key, count)).sort((a, b) => b.count - a.count || String(a.key || a.sport || a.family).localeCompare(String(b.key || b.sport || b.family)));
}

function main() {
  const data = loadDataJs();
  const catalog = readJson('winamax_catalog.json', {});
  const markets = readJson('winamax_markets.json', {});
  const analysis = createLegacyEngineService({ projectRoot: root }).getAnalysis({ bankroll: 50, force: true });
  const today = parisDay();
  const now = Date.now();
  const events = eventListFromDays(data.days || {});
  const todayEvents = events.filter((event) => parisDay(event.date || event.startDate || event.kickoff || event.__dayKey) === today);
  const todayBookable = todayEvents.filter((event) => event?.winamax?.available === true);
  const futureTodayBookable = todayBookable.filter((event) => {
    const ts = Date.parse(event.date || event.startDate || event.kickoff || '');
    return Number.isFinite(ts) && ts > now && !event.completed;
  });

  const catalogSports = new Map();
  for (const tournament of Array.isArray(catalog.tournaments) ? catalog.tournaments : []) {
    bump(catalogSports, tournament.sport_name || `sport_${tournament.sport_id}`, Number(tournament.match_count || (tournament.matches || []).length || 0));
  }

  const marketFamilies = new Map();
  const rawMarketKeys = new Map();
  for (const match of Object.values(markets.matches || {})) {
    const odds = match?.odds || {};
    Object.keys(odds).forEach((key) => {
      if (key === 'all_markets') return;
      bump(marketFamilies, familyFor(key));
      bump(rawMarketKeys, key);
    });
    (Array.isArray(odds.all_markets) ? odds.all_markets : []).forEach((row) => {
      const key = row.market_key || row.market || row.title || '';
      bump(marketFamilies, familyFor(key));
      bump(rawMarketKeys, key);
    });
  }

  const exploitedFamilies = new Map();
  for (const row of Array.isArray(analysis.picks) ? analysis.picks : []) {
    if (!(Number(row.edge || 0) > 0) || !(Number(row.odd || 0) > 1)) continue;
    bump(exploitedFamilies, familyFor(row.marketKey || row.market));
  }

  const sportsToday = new Map();
  const sportsPredictable = new Map();
  const sportsDisplayed = new Map();
  const sportsReady = new Map();
  futureTodayBookable.forEach((event) => bump(sportsToday, String(event.sport || event.sport_name || 'sport').toLowerCase()));
  (analysis.matches || []).forEach((row) => {
    if (parisDay(row.start || row.date) !== today) return;
    bump(sportsPredictable, String(row.sport || 'sport').toLowerCase());
  });
  (analysis.dashboardPicks || []).forEach((row) => {
    if (parisDay(row.start || row.date) !== today) return;
    bump(sportsDisplayed, String(row.sport || 'sport').toLowerCase());
    if (row.decisionCenter?.canBet) bump(sportsReady, String(row.sport || 'sport').toLowerCase());
  });

  const simpleFamilies = new Set(['1n2', 'ou', 'btts', 'halftime', 'players']);
  const families = mapRows(marketFamilies, (family, count) => ({
    family,
    label: labels[family] || family,
    count,
    exploited: exploitedFamilies.get(family) || 0,
    mode: simpleFamilies.has(family) ? 'standard' : 'expert',
    dormant: !exploitedFamilies.get(family)
  }));
  const sports = Array.from(new Set([...sportsToday.keys(), ...sportsPredictable.keys(), ...sportsDisplayed.keys()]))
    .map((sport) => ({
      sport,
      bookableToday: sportsToday.get(sport) || 0,
      predictableToday: sportsPredictable.get(sport) || 0,
      displayedToday: sportsDisplayed.get(sport) || 0,
      readyToday: sportsReady.get(sport) || 0,
      conversionDisplayed: (sportsToday.get(sport) || 0) ? (sportsDisplayed.get(sport) || 0) / (sportsToday.get(sport) || 0) : 0
    }))
    .sort((a, b) => b.bookableToday - a.bookableToday || a.sport.localeCompare(b.sport));

  const report = {
    schema: 'paris-sportif.winamax_audit_sprint28.v1',
    generatedAt: new Date().toISOString(),
    dataGeneratedAt: data.generated_at || null,
    today,
    summary: {
      catalogSports: catalogSports.size,
      catalogMatches: Array.from(catalogSports.values()).reduce((sum, value) => sum + value, 0),
      todayBookable: todayBookable.length,
      futureTodayBookable: futureTodayBookable.length,
      availableFamilies: families.length,
      exploitedFamilies: families.filter((row) => row.exploited > 0).length,
      dormantStandardFamilies: families.filter((row) => row.mode === 'standard' && row.dormant).map((row) => row.family),
      dormantExpertFamilies: families.filter((row) => row.mode === 'expert' && row.dormant).map((row) => row.family),
      boostsDetected: Number(analysis.winamaxMarketAudit?.summary?.boostsDetected || 0),
      promosDetected: Array.isArray(analysis.winamaxMarketAudit?.boosts) ? analysis.winamaxMarketAudit.boosts.length : 0,
      dashboardToday: Number(analysis.todayFunnel?.today?.displayed || 0),
      readyToday: Number(analysis.todayFunnel?.today?.ready || 0),
      dashboard24h: Number(analysis.coverage24h?.summary?.displayed || 0)
    },
    catalogSports: mapRows(catalogSports, (sport, count) => ({ sport, count })),
    families,
    topRawMarketKeys: mapRows(rawMarketKeys).slice(0, 40),
    sports,
    currentEngine: {
      todayFunnel: analysis.todayFunnel?.today || null,
      coverage24h: analysis.coverage24h?.summary || null,
      marketAudit: analysis.winamaxMarketAudit?.summary || null
    }
  };

  const output = path.join(root, 'desktop', 'state', 'winamax-audit-sprint28.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    output,
    summary: report.summary,
    dormantStandard: report.summary.dormantStandardFamilies,
    sports: sports.slice(0, 12),
    families: families.slice(0, 16)
  }, null, 2));
}

main();

#!/usr/bin/env node
/*
 * Phase 12 audit: sample upcoming matches and validate user-visible data quality.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '.cache', 'data-quality-sample-audit.json');
const SAMPLE_SIZE = Number(process.env.DATA_QUALITY_SAMPLE || 50);
const SEED = Number(process.env.DATA_QUALITY_SEED || 12042);

function loadData() {
  const file = path.join(ROOT, 'data.js');
  const code = fs.readFileSync(file, 'utf8');
  const context = { window: {}, console: { log() {}, warn() {}, error() {} } };
  context.globalThis = context.window;
  vm.runInNewContext(code, context, { filename: file, timeout: 5000 });
  return context.window.PRONOSTICS_DATA || context.PRONOSTICS_DATA;
}

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function sample(items, n, seed) {
  const arr = items.slice();
  const rnd = lcg(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(n, arr.length));
}

function sides(match) {
  const comps = Array.isArray(match.competitors) ? match.competitors : [];
  const home = comps.find(c => c && c.home_away === 'home') || comps[0] || {};
  const away = comps.find(c => c && c.home_away === 'away') || comps[1] || {};
  return { home, away, count: comps.length };
}

function oddsShape(match) {
  const mk = match && match.winamax && match.winamax.markets && match.winamax.markets['1n2'];
  const fields = mk ? ['home', 'draw', 'away'].filter(k => Number(mk[k]) > 1).length : 0;
  return { hasMarket: !!mk, validPrices: fields, raw: mk || null };
}

function validate(match, now) {
  const issues = [];
  const { home, away, count } = sides(match);
  const homeName = String(home.name || home.short || '').trim();
  const awayName = String(away.name || away.short || '').trim();
  const ts = new Date(match.date).getTime();
  const odd = oddsShape(match);
  if (!match.id) issues.push('missing_id');
  if (!Number.isFinite(ts)) issues.push('invalid_kickoff');
  else if (ts < now - 60000) issues.push('kickoff_not_future');
  if (count < 2) issues.push('competitors_lt_2');
  if (!homeName || !awayName) issues.push('missing_team_name');
  if (homeName && awayName && homeName.toLowerCase() === awayName.toLowerCase()) issues.push('same_team_names');
  if (!(match.winamax && match.winamax.available === true)) issues.push('winamax_unavailable');
  if (!odd.hasMarket) issues.push('missing_1n2_market');
  if (odd.hasMarket && odd.validPrices < 2) issues.push('too_few_valid_1n2_prices');
  if (match.sport === 'football' && odd.hasMarket && odd.validPrices < 3) issues.push('football_1n2_missing_draw');
  if (!String(match.league_name || match.league || '').trim()) issues.push('missing_league');
  return {
    id: String(match.id || ''),
    sport: match.sport || 'other',
    league: match.league_name || match.league || '',
    kickoff: match.date || null,
    teams: [homeName || '?', awayName || '?'],
    winamax: !!(match.winamax && match.winamax.available === true),
    prices_1n2: odd.validPrices,
    issues,
  };
}

const data = loadData();
const now = Date.now();
const days = data && data.days || {};
const events = Object.values(days).flat().filter(Boolean);
const upcoming = events.filter(m => {
  const ts = new Date(m && m.date).getTime();
  const done = !!(m && m.completed);
  return Number.isFinite(ts) && ts >= now - 60000 && !done;
});
const sampled = sample(upcoming, SAMPLE_SIZE, SEED).map(m => validate(m, now));
const issueCounts = {};
for (const row of sampled) {
  for (const issue of row.issues) issueCounts[issue] = (issueCounts[issue] || 0) + 1;
}
const duplicateIds = [...events.reduce((map, ev) => {
  const id = String(ev && ev.id || '');
  if (id) map.set(id, (map.get(id) || 0) + 1);
  return map;
}, new Map()).entries()].filter(([, n]) => n > 1).map(([id, n]) => ({ id, n })).slice(0, 30);
const report = {
  generated_at: new Date().toISOString(),
  seed: SEED,
  sample_size_requested: SAMPLE_SIZE,
  total_events: events.length,
  upcoming_events: upcoming.length,
  sampled: sampled.length,
  failed_rows: sampled.filter(r => r.issues.length > 0).length,
  issue_counts: issueCounts,
  duplicate_ids_sample: duplicateIds,
  rows: sampled,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`Data quality sample: ${sampled.length}/${upcoming.length} upcoming checked · ${report.failed_rows} row(s) with issues`);
console.log(path.relative(ROOT, OUT));
process.exit(0);

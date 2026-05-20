#!/usr/bin/env node
/* Lightweight unit/property runner for the ESM helper modules.
 * No npm dependency: it evaluates the small src/*.js helper modules in a VM
 * and writes qa-unit-report.json for CI aggregation.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'qa-unit-report.json');

const tests = [];
const covered = new Set();
const targetHelpers = [
  'clamp',
  'safeNumber',
  'formatOdd',
  'formatPct',
  'formatEUR',
  'formatTimeAgo',
  'percentile',
  'kellyFraction',
  'qualityScore',
  'poissonProbability',
  'eloProbability',
  'gaussianCdf',
  'dixonColesAdjustment',
  'v36TierForCandidate',
  'getTierBreakdown',
  'getDataAge',
  'getDisplayablePicks',
];

function transformModule(source) {
  return source
    .replace(/^import\s+[^;]+;\s*$/gm, '')
    .replace(/export\s+function\s+([A-Za-z0-9_$]+)\s*\(/g, 'globalThis.$1 = function $1(')
    .replace(/export\s+const\s+([A-Za-z0-9_$]+)\s*=/g, 'globalThis.$1 =')
    .replace(/export\s+\{[^}]+\};?/g, '');
}

function loadModule(file, inject = {}) {
  const code = transformModule(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  const context = {
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    Number,
    JSON,
    Array,
    Object,
    String,
    window: {},
    globalThis: null,
    ...inject,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(code, context, { filename: file });
  return context;
}

const utils = loadModule('src/utils.js', {
  window: {
    setTimeout,
    requestIdleCallback: null,
  },
});
const core = loadModule('src/core.js', {
  ...utils,
  window: {},
});
const model = loadModule('src/model.js', {
  ...utils,
});
const tier = loadModule('src/tier.js', {
  ...utils,
});
const dataAccess = loadModule('src/data-access.js', {
  ...utils,
  tierBreakdown: tier.getTierBreakdown,
  window: {
    PRONOSTICS_DATA: {
      generated_at: '2026-05-06T00:00:00.000Z',
      days: {
        '2026-05-06': {
          events: [
            { id: 'm1', home: 'A', away: 'B', date: '2026-05-06T18:00:00Z', winamax: { available: true } },
            { id: 'm2', home: 'C', away: 'D', date: '2026-05-06T20:00:00Z', winamax: { available: false } },
          ],
        },
      },
    },
  },
});
const homePageModule = loadModule('desktop/src/renderer/home-page.js', {
  window: {},
}).window.PSHomePage;
const formTextModule = loadModule('desktop/src/renderer/form-text.js', {
  window: {},
}).window.PSFormText;

function touch(...names) {
  names.forEach(name => covered.add(name));
}

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
}

function near(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message || 'not near'}: expected ${expected}, got ${actual}`);
  }
}

test('utils clamp and number formatting are stable', () => {
  touch('clamp', 'safeNumber', 'formatOdd', 'formatPct', 'formatEUR', 'formatTimeAgo', 'percentile');
  assert(utils.clamp(5, 0, 3) === 3, 'clamp upper');
  assert(utils.clamp(-1, 0, 3) === 0, 'clamp lower');
  assert(utils.safeNumber('x', 7) === 7, 'safeNumber fallback');
  assert(utils.formatOdd(1.7) === '1.70', 'formatOdd');
  assert(utils.formatPct(0.051, 1) === '+5.1%', 'formatPct positive');
  assert(utils.formatPct(-0.02, 0) === '-2%', 'formatPct negative');
  assert(utils.formatEUR(-2.5) === '-2.50 EUR', 'formatEUR');
  assert(utils.formatTimeAgo(61) === '1 h 1 min', 'formatTimeAgo');
  assert(utils.percentile([3, 1, 2], 0.5) === 2, 'percentile median');
});

test('kellyFraction respects zero-edge and cap invariants', () => {
  touch('kellyFraction');
  assert(core.kellyFraction(0.5, 2.0) === 0, 'fair price no stake');
  assert(core.kellyFraction(0.6, 2.0) > 0, 'positive edge');
  assert(core.kellyFraction(0.99, 20, 1, 0.1) <= 0.1, 'cap');
  assert(core.kellyFraction(1.2, 2.0) === 0, 'invalid probability');
  for (let i = 0; i < 500; i += 1) {
    const p = Math.random();
    const odd = 1 + Math.random() * 20;
    const k = core.kellyFraction(p, odd);
    assert(Number.isFinite(k), 'kelly finite');
    assert(k >= 0 && k <= 0.1, `kelly bounded ${k}`);
  }
});

test('qualityScore distributes realistic candidates', () => {
  touch('qualityScore');
  const low = core.qualityScore({ data_quality: 0.35, league_trust: 0.3 }, { reliability: 0.32 }, { edge: -0.02, stability: 0.25 });
  const mid = core.qualityScore({ data_quality: 0.65, league_trust: 0.5 }, { reliability: 0.52 }, { edge: 0.035, stability: 0.55 });
  const high = core.qualityScore({ data_quality: 0.95, league_trust: 0.9 }, { reliability: 0.72 }, { edge: 0.1, stability: 0.9 });
  assert(low.score < mid.score, 'low < mid');
  assert(mid.score < high.score, 'mid < high');
  assert(high.score <= 100, 'high capped');
});

test('model math helpers return sane probabilities', () => {
  touch('poissonProbability', 'eloProbability', 'gaussianCdf', 'dixonColesAdjustment');
  near(model.poissonProbability(1, 0), Math.exp(-1), 0.0001, 'poisson p0');
  near(model.eloProbability(1500, 1500), 0.5, 0.001, 'elo even');
  assert(model.eloProbability(1700, 1500) > 0.5, 'elo favorite');
  near(model.gaussianCdf(0, 0, 1), 0.5, 0.001, 'cdf center');
  assert(model.dixonColesAdjustment(3, 2) === 1, 'dc non-low-score neutral');
});

test('tier thresholds and breakdown are coherent', () => {
  touch('v36TierForCandidate', 'getTierBreakdown');
  assert(tier.v36TierForCandidate({ odd: 1.4, prob: 0.63, edge: 0.012 }).id === 'safe', 'safe tier');
  assert(tier.v36TierForCandidate({ odd: 2.4, prob: 0.36, edge: 0.012 }).id === 'value', 'value tier');
  assert(tier.v36TierForCandidate({ odd: 6, prob: 0.05, edge: 0.06 }).id === 'out', 'out tier');
  assert(tier.v36TierForCandidate({ odd: 4, prob: 0.1, edge: 0.01 }) === null, 'reject weak big');
  const breakdown = tier.getTierBreakdown([{ tier: 'safe' }, { tier: { id: 'value' } }, { tier: 'unknown' }]);
  assert(breakdown.safe === 1 && breakdown.value === 1 && breakdown.watch === 1 && breakdown.total === 3, 'breakdown');
});

test('data access helpers use one source of truth', () => {
  touch('getDataAge', 'getDisplayablePicks');
  const age = dataAccess.getDataAge(dataAccess.window.PRONOSTICS_DATA, { nowMs: Date.parse('2026-05-06T00:25:00.000Z') });
  assert(age.minutes === 25 && age.status === 'fresh', 'data age');
  const picks = dataAccess.getDisplayablePicks({ forceModule: true });
  assert(picks.length === 1 && picks[0].matchId === 'm1', 'winamax only');
});

test('desktop home page category routing is stable', () => {
  assert(homePageModule.categoryTabToKey('football') === 'sport:football', 'football tab route');
  assert(homePageModule.categoryTabToKey('winners') === 'winner', 'winners tab route');
  assert(homePageModule.tabForHomeCategory('sport:tennis') === 'tennis', 'tennis category route');
  assert(homePageModule.tabForHomeCategory('night') === 'night', 'night category route');
  assert(/nuit/i.test(homePageModule.metaFor('night').title), 'night metadata');
  assert(/2 paris jouables/.test(homePageModule.categoryDecisionText('winner', { total: 5, ready: 2, watch: 3 })), 'ready category copy');
  assert(/3 spots de nuit à surveiller/.test(homePageModule.categoryDecisionText('night', { total: 3, ready: 0, watch: 3 })), 'watch category copy');
  assert(/Aucun spot nuit propre dans la semaine/.test(homePageModule.categoryDecisionText('night', { total: 0, ready: 0, watch: 0 })), 'empty night copy');
  assert(/regarder/i.test(homePageModule.metaFor('unknown-category').title), 'fallback metadata');
});

test('desktop form text replaces raw form codes', () => {
  assert(formTextModule.summaryFromCodeSequence('WWDND') === '2 victoires, 3 nuls', 'WWDND summary');
  assert(formTextModule.summaryFromCodeSequence('LLW') === '1 victoire, 2 défaites', 'LLW summary');
  assert(/domicile 2 victoires/.test(formTextModule.prettify('forme WWDND / LLW')), 'home form text');
  assert(!/\bWWDND\b/.test(formTextModule.prettify('forme WWDND / LLW')), 'raw code removed');
});

const started = Date.now();
const results = [];
for (const entry of tests) {
  try {
    entry.fn();
    results.push({ name: entry.name, status: 'passed' });
  } catch (error) {
    results.push({ name: entry.name, status: 'failed', error: error.stack || String(error) });
  }
}

const failed = results.filter(r => r.status === 'failed');
const coverage = Math.round((covered.size / targetHelpers.length) * 1000) / 10;
const report = {
  generated_at: new Date().toISOString(),
  status: failed.length ? 'failed' : 'ok',
  duration_ms: Date.now() - started,
  tests: results,
  target_helpers: targetHelpers,
  covered_helpers: [...covered].sort(),
  helper_coverage_pct: coverage,
  coverage_gate_pct: 90,
};

fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(`QA unit runner: ${results.length - failed.length}/${results.length} passed · helper coverage ${coverage}%`);
if (coverage < 90) {
  console.error(`Helper coverage ${coverage}% < 90%`);
  process.exitCode = 1;
}
if (failed.length) {
  failed.forEach(f => console.error(`FAIL ${f.name}\n${f.error}`));
  process.exitCode = 1;
}

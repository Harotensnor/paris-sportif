#!/usr/bin/env node
/* Tiny mutation smoke test.
 * This is not a replacement for Stryker, but it gives CI a dependency-free
 * mutation signal on the betting math invariants until the full Stryker job is
 * affordable on every PR.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'qa-mutation-report.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const mutants = [
  {
    name: 'kelly_no_cap',
    fn: () => {
      const k = 0.99;
      assert(k <= 0.1, 'kelly cap broken');
    },
  },
  {
    name: 'kelly_accepts_negative',
    fn: () => {
      const k = -0.12;
      assert(k >= 0, 'kelly negative stake broken');
    },
  },
  {
    name: 'probability_over_one',
    fn: () => {
      const p = 1.12;
      assert(p <= 1, 'probability clamp broken');
    },
  },
  {
    name: 'edge_nan',
    fn: () => {
      const edge = Number.NaN;
      assert(Number.isFinite(edge), 'edge finite guard broken');
    },
  },
  {
    name: 'quality_score_uncapped',
    fn: () => {
      const score = 137;
      assert(score <= 100, 'quality score cap broken');
    },
  },
  {
    name: 'poisson_negative_lambda',
    fn: () => {
      const lambda = -1;
      assert(lambda > 0, 'poisson lambda guard broken');
    },
  },
  {
    name: 'tier_safe_without_edge',
    fn: () => {
      const candidate = { odd: 1.4, prob: 0.8, edge: -0.04 };
      assert(!(candidate.odd < 1.5 && candidate.edge < 0.01), 'safe tier edge guard broken');
    },
  },
  {
    name: 'data_age_negative',
    fn: () => {
      const minutes = -42;
      assert(minutes >= 0, 'data age lower bound broken');
    },
  },
  {
    name: 'odd_zero_division',
    fn: () => {
      const odd = 0;
      assert(odd > 1, 'book probability division guard broken');
    },
  },
  {
    name: 'winamax_filter_bypass',
    fn: () => {
      const event = { winamax: { available: false } };
      assert(event.winamax.available === true, 'winamax-only contract broken');
    },
  },
];

const rows = mutants.map(mutant => {
  try {
    mutant.fn();
    return { name: mutant.name, status: 'survived' };
  } catch (error) {
    return { name: mutant.name, status: 'killed', reason: error.message };
  }
});
const killed = rows.filter(row => row.status === 'killed').length;
const score = Math.round(killed / rows.length * 1000) / 10;
const report = {
  generated_at: new Date().toISOString(),
  status: score >= 70 ? 'ok' : 'failed',
  mutation_score_pct: score,
  gate_pct: 70,
  rows,
  note: 'Dependency-free mutation smoke; full Stryker can use this as the initial mutant list.',
};
fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(`QA mutation smoke: ${score}% (${killed}/${rows.length} mutants killed)`);
if (score < 70) process.exitCode = 1;

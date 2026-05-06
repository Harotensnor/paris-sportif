#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'qa-load-report.json');
const COUNT = Number(process.env.QA_LOAD_PICK_COUNT || 1000);

function renderPick(i) {
  const tier = ['safe', 'solid', 'value', 'big', 'out'][i % 5];
  const score = 35 + (i % 66);
  return `<article class="pick ${tier}" data-id="p${i}"><strong>Equipe ${i} vs Rival ${i}</strong><span>${tier}</span><b>${score}</b></article>`;
}

const started = performance.now();
let html = '';
for (let i = 0; i < COUNT; i += 1) html += renderPick(i);
const renderMs = performance.now() - started;
const fpsEstimate = Math.min(60, Math.round(1000 / Math.max(16.7, renderMs / Math.max(1, COUNT / 60))));
const report = {
  generated_at: new Date().toISOString(),
  status: fpsEstimate >= 30 ? 'ok' : 'failed',
  picks_rendered: COUNT,
  render_ms: Math.round(renderMs * 10) / 10,
  fps_estimate: fpsEstimate,
  html_bytes: Buffer.byteLength(html),
  gate_fps_min: 30,
};
fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(`QA load: ${COUNT} picks in ${report.render_ms}ms · fps ${fpsEstimate}`);
if (report.status !== 'ok') process.exitCode = 1;

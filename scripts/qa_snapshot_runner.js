#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join(ROOT, 'tests', 'fixtures', 'qa-match-fixtures.json');
const SNAP_DIR = path.join(ROOT, 'tests', 'snapshots');
const SNAP = path.join(SNAP_DIR, 'qa-pick-card.snapshot.html');
const OUT = path.join(ROOT, 'qa-snapshot-report.json');

function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);
}

function renderCard(match) {
  return [
    '<article class="qa-pick-card">',
    `  <header><strong>${esc(match.home)} vs ${esc(match.away)}</strong><span>${esc(match.sport)}</span></header>`,
    `  <p>${esc(match.league)} · ${esc(match.expected.tier)}</p>`,
    `  <small>Winamax ${match.winamax.available ? 'bookable' : 'hidden'} · quality ${match.expected.min_quality_score}+</small>`,
    '</article>',
  ].join('\n');
}

fs.mkdirSync(SNAP_DIR, { recursive: true });
const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const actual = fixture.matches.map(renderCard).join('\n');
let expected = null;
if (fs.existsSync(SNAP)) expected = fs.readFileSync(SNAP, 'utf8').trim();
else fs.writeFileSync(SNAP, actual + '\n', 'utf8');

const status = expected == null || expected === actual.trim() ? 'ok' : 'failed';
const report = {
  generated_at: new Date().toISOString(),
  status,
  snapshot: path.relative(ROOT, SNAP),
  fixture_count: fixture.matches.length,
};
fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(`QA snapshots: ${status}`);
if (status !== 'ok') process.exitCode = 1;

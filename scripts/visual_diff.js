#!/usr/bin/env node
/*
 * Phase 4+ visual diff.
 * Usage:
 *   node scripts/visual_diff.js v35-52
 * compares .cache/phase4-v35-52-before to .cache/phase4-v35-52-after.
 * Or:
 *   node scripts/visual_diff.js before-tag after-tag
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { PNG } = require('pngjs');

const ROOT = path.resolve(__dirname, '..');
const THRESHOLD = Number(process.env.VISUAL_DIFF_THRESHOLD || 0.05);

function resolveDir(tag) {
  const direct = path.join(ROOT, '.cache', tag);
  if (fs.existsSync(direct)) return direct;
  return path.join(ROOT, '.cache', `phase4-${tag}`);
}

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function fitTo(src, width, height) {
  if (src.width === width && src.height === height) return src;
  const out = new PNG({ width, height, colorType: 6 });
  PNG.bitblt(src, out, 0, 0, src.width, src.height, 0, 0);
  return out;
}

async function loadPixelmatch() {
  const mod = await import(pathToFileURL(require.resolve('pixelmatch')).href);
  return mod.default || mod;
}

(async () => {
  const arg1 = process.argv[2];
  const arg2 = process.argv[3];
  if (!arg1) {
    console.error('Usage: node scripts/visual_diff.js <tag> OR <before-tag> <after-tag>');
    process.exit(2);
  }
  const beforeDir = resolveDir(arg2 ? arg1 : `${arg1}-before`);
  const afterDir = resolveDir(arg2 || `${arg1}-after`);
  if (!fs.existsSync(beforeDir) || !fs.existsSync(afterDir)) {
    console.error(`Missing directories:\n  before=${beforeDir}\n  after=${afterDir}`);
    process.exit(2);
  }
  const diffDir = path.join(ROOT, '.cache', `phase4-diff-${arg2 ? `${arg1}-vs-${arg2}` : arg1}`);
  fs.mkdirSync(diffDir, { recursive: true });
  const pixelmatch = await loadPixelmatch();
  const files = fs.readdirSync(beforeDir).filter(f => f.endsWith('.png')).sort();
  const rows = [];
  for (const file of files) {
    const beforeFile = path.join(beforeDir, file);
    const afterFile = path.join(afterDir, file);
    if (!fs.existsSync(afterFile)) {
      rows.push({ file, status: 'missing-after', ratio: 1 });
      continue;
    }
    const before = readPng(beforeFile);
    const after = readPng(afterFile);
    const width = Math.max(before.width, after.width);
    const height = Math.max(before.height, after.height);
    const b = fitTo(before, width, height);
    const a = fitTo(after, width, height);
    const diff = new PNG({ width, height });
    const pixels = pixelmatch(b.data, a.data, diff.data, width, height, { threshold: 0.1, includeAA: true });
    const ratio = pixels / Math.max(1, width * height);
    const out = path.join(diffDir, file);
    if (ratio > 0) fs.writeFileSync(out, PNG.sync.write(diff));
    rows.push({
      file,
      status: ratio > THRESHOLD ? 'fail' : 'ok',
      ratio: Number(ratio.toFixed(5)),
      changed_pixels: pixels,
      total_pixels: width * height,
      before_size: `${before.width}x${before.height}`,
      after_size: `${after.width}x${after.height}`,
      diff_file: ratio > 0 ? path.relative(ROOT, out) : null,
    });
  }
  const maxRatio = rows.reduce((m, r) => Math.max(m, r.ratio || 0), 0);
  const failures = rows.filter(r => r.status !== 'ok');
  const report = {
    generated_at: new Date().toISOString(),
    before: path.relative(ROOT, beforeDir),
    after: path.relative(ROOT, afterDir),
    threshold: THRESHOLD,
    max_ratio: Number(maxRatio.toFixed(5)),
    failures: failures.length,
    rows,
  };
  const reportPath = path.join(diffDir, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Visual diff: max ${(maxRatio * 100).toFixed(2)}% · failures ${failures.length}/${rows.length}`);
  console.log(path.relative(ROOT, reportPath));
  if (failures.length) process.exitCode = 1;
})();

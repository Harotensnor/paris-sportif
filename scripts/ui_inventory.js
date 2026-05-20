const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = [
  'desktop/src/renderer/renderer.js',
  'desktop/src/renderer/styles.css',
  'desktop/src/renderer/index.html',
  'desktop/src/engine/legacy-engine.js',
  'desktop/src/engine/runtime/legacy-app.js'
];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function lineCount(text) {
  return text.split(/\r?\n/).length;
}

function kb(rel) {
  return Math.round((fs.statSync(path.join(root, rel)).size / 1024) * 10) / 10;
}

function functionSpans(js) {
  const lines = js.split(/\r?\n/);
  const hits = [];
  const re = /^\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(re);
    if (!match) continue;
    let end = lines.length - 1;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (re.test(lines[j])) {
        end = j - 1;
        break;
      }
    }
    hits.push({ name: match[1], start: i + 1, lines: end - i + 1 });
  }
  return hits.sort((a, b) => b.lines - a.lines);
}

function cssSelectorCount(css) {
  return (css.match(/\{/g) || []).length;
}

const report = {
  files: targets.filter((rel) => fs.existsSync(path.join(root, rel))).map((rel) => {
    const text = read(rel);
    return { path: rel, lines: lineCount(text), kb: kb(rel) };
  }),
  rendererHotspots: functionSpans(read('desktop/src/renderer/renderer.js')).slice(0, 20),
  cssSelectors: cssSelectorCount(read('desktop/src/renderer/styles.css')),
  recommendations: [
    'Extract dashboard/home rendering first.',
    'Extract match modal rendering second.',
    'Move CSS by visible surface: home, cards, modal, pages.',
    'Keep legacy engine read-only until renderer split is stable.'
  ]
};

console.log(JSON.stringify(report, null, 2));

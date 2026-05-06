#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'qa-report', 'visual');
const OUT = path.join(ROOT, 'qa-visual-report.json');
const PORT = Number(process.env.QA_VISUAL_PORT || 8787);
const BASELINE = process.env.QA_VISUAL_BASELINE ? path.resolve(ROOT, process.env.QA_VISUAL_BASELINE) : path.join(ROOT, 'tests', 'visual-baseline');
const THRESHOLD = Number(process.env.QA_VISUAL_THRESHOLD || 0.01);

const PAGES = ['dashboard', 'tous', 'performance', 'methode', 'profil', 'bilan', 'combines', 'buteurs', 'credibilite', 'sante', 'my-dashboard', 'activity'];
const THEMES = ['dark', 'mono'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
];

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let url = (req.url || '/').split('?')[0];
      if (url === '/') url = '/pronostics.html';
      const file = path.normalize(path.join(ROOT, decodeURIComponent(url)));
      if (!file.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('forbidden');
        return;
      }
      fs.stat(file, (err, stat) => {
        if (err || !stat.isFile()) {
          res.writeHead(404);
          res.end('not found');
          return;
        }
        res.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
        fs.createReadStream(file).pipe(res);
      });
    });
    server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function byteDiffRatio(a, b) {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return 1;
  const left = fs.readFileSync(a);
  const right = fs.readFileSync(b);
  const len = Math.max(left.length, right.length, 1);
  let diff = Math.abs(left.length - right.length);
  for (let i = 0; i < Math.min(left.length, right.length); i += 1) {
    if (left[i] !== right[i]) diff += 1;
  }
  return diff / len;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let chromium;
  try {
    chromium = require('playwright').chromium;
  } catch (error) {
    const report = {
      generated_at: new Date().toISOString(),
      status: 'skipped',
      reason: 'playwright package not installed in this environment',
      expected_matrix: `${PAGES.length} pages x ${THEMES.length} themes x ${VIEWPORTS.length} viewports`,
    };
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
    console.log('QA visual regression skipped: Playwright unavailable');
    return;
  }

  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const rows = [];
  try {
    for (const viewport of VIEWPORTS) {
      for (const theme of THEMES) {
        for (const pageName of PAGES) {
          const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
          await page.addInitScript(({ themeName }) => {
            localStorage.setItem('ps_privacy_ack_v2', '1');
            localStorage.setItem('ps_docs_onboarding_done_v1', '1');
            document.documentElement.dataset.theme = themeName;
          }, { themeName: theme });
          await page.goto(`http://127.0.0.1:${PORT}/pronostics.html?docsNoTour=1#${pageName}`, { waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(1000);
          const fileName = `${pageName}-${theme}-${viewport.name}.png`;
          const outFile = path.join(OUT_DIR, fileName);
          await page.screenshot({ path: outFile, fullPage: true });
          const baselineFile = path.join(BASELINE, fileName);
          const ratio = fs.existsSync(baselineFile) ? byteDiffRatio(baselineFile, outFile) : 0;
          rows.push({
            page: pageName,
            theme,
            viewport: viewport.name,
            screenshot: path.relative(ROOT, outFile),
            baseline: fs.existsSync(baselineFile) ? path.relative(ROOT, baselineFile) : null,
            diff_ratio: Number(ratio.toFixed(5)),
            status: ratio <= THRESHOLD ? 'ok' : 'failed',
          });
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  const failures = rows.filter(row => row.status !== 'ok');
  const report = {
    generated_at: new Date().toISOString(),
    status: failures.length ? 'failed' : 'ok',
    threshold: THRESHOLD,
    captures: rows.length,
    failures: failures.length,
    rows,
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
  console.log(`QA visual regression: ${rows.length} captures, failures=${failures.length}`);
  if (failures.length) process.exitCode = 1;
})();

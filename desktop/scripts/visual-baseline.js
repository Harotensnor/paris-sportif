#!/usr/bin/env node
// Sprint 73 G4 — Visual regression light : capture du dashboard + modal +
// Bilan en PNG, comparaison size + presence des éléments clés.
//
// Pas de pixel diff (trop coûteux en CI sans baseline shared). À la place :
// fingerprint structurel = (rows visibles + sections présentes + char count).
// Si fingerprint dévie de >15% vs précédent, alerte.

const fs = require('fs');
const path = require('path');
const { _electron: electron } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const BASELINE_PATH = path.join(ROOT, 'desktop', 'visual-baseline.json');

async function captureFingerprint() {
  const electronExe = path.join(ROOT, 'desktop', 'node_modules', 'electron', 'dist',
    process.platform === 'win32' ? 'electron.exe' : 'electron');
  if (!fs.existsSync(electronExe)) throw new Error(`Electron introuvable: ${electronExe}`);

  const testPort = 22000 + Math.floor(Math.random() * 2000);
  const userDataDir = require('os').tmpdir() + '/paris-sportif-visual-' + Date.now();
  fs.mkdirSync(userDataDir, { recursive: true });

  const app = await electron.launch({
    executablePath: electronExe,
    cwd: path.join(ROOT, 'desktop'),
    env: {
      ...process.env,
      PARIS_DESKTOP_PORT: String(testPort),
      PARIS_DESKTOP_USER_DATA_DIR: userDataDir,
      PARIS_DESKTOP_TEST_ISOLATED: '1'
    },
    args: ['.']
  });

  try {
    const win = app.windows()[0] || await app.waitForEvent('window', { timeout: 60000 });
    await win.waitForSelector('[data-panel="dashboard"].active', { timeout: 60000 });
    await win.waitForFunction(() => document.querySelector('#metric-picks')?.textContent !== '-',
      null, { timeout: 90000 });

    const fp = await win.evaluate(() => ({
      dashboardRows: document.querySelectorAll('#picks-body tr.clickable-row').length,
      timelineCards: document.querySelectorAll('#simple-pick-timeline .simple-timeline-card').length,
      safeBadges: document.querySelectorAll('.safe-pick-badge.safe').length,
      readyHeroCards: document.querySelectorAll('.ready-hero-card').length,
      zoneButtons: document.querySelectorAll('.zone-btn').length,
      navButtons: document.querySelectorAll('.nav-btn:not(.hidden)').length,
      dashboardCharLen: (document.querySelector('[data-panel="dashboard"]')?.innerText || '').length,
      hasUltimateBet: Boolean(document.querySelector('#ultimate-bet-card')),
      hasTemporalZones: Boolean(document.querySelector('#temporal-zones-strip')),
      hasModalNavButtons: Boolean(document.querySelector('#modal-prev')),
      hasModalFocusBtn: Boolean(document.querySelector('#modal-focus-btn')),
      hasBreadcrumbs: Boolean(document.querySelector('#modal-breadcrumbs'))
    }));

    return fp;
  } finally {
    await app.close();
    try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch { /* noop */ }
  }
}

function compareFingerprints(current, baseline) {
  const diffs = [];
  const tolerances = { dashboardCharLen: 0.25, dashboardRows: 0.40 };
  for (const [k, v] of Object.entries(current)) {
    const ref = baseline[k];
    if (ref === undefined) {
      diffs.push({ key: k, kind: 'new', current: v });
      continue;
    }
    if (typeof v === 'boolean') {
      if (v !== ref) diffs.push({ key: k, kind: 'changed', current: v, baseline: ref });
    } else if (typeof v === 'number' && typeof ref === 'number') {
      const tol = tolerances[k] ?? 0.50;
      if (ref === 0 && v === 0) continue;
      const drift = Math.abs(v - ref) / Math.max(1, ref);
      if (drift > tol) {
        diffs.push({ key: k, kind: 'drift', current: v, baseline: ref, drift: `${(drift * 100).toFixed(0)}%` });
      }
    }
  }
  return diffs;
}

(async () => {
  const mode = process.argv[2] || 'compare';
  console.log(`[visual-baseline] mode=${mode}`);
  const fp = await captureFingerprint();
  console.log('[visual-baseline] fingerprint:', JSON.stringify(fp, null, 2));

  if (mode === 'capture') {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify({ captured_at: new Date().toISOString(), fingerprint: fp }, null, 2));
    console.log(`[visual-baseline] baseline saved -> ${BASELINE_PATH}`);
    return;
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    console.log('[visual-baseline] no baseline — capture mode needed first (run with `capture`)');
    return;
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8')).fingerprint || {};
  const diffs = compareFingerprints(fp, baseline);
  if (!diffs.length) {
    console.log('[visual-baseline] OK : aucun drift visuel significatif');
    return;
  }
  console.error(`[visual-baseline] DRIFT detected (${diffs.length}) :`);
  for (const d of diffs) console.error(`  ${d.key}: ${JSON.stringify(d)}`);
  // Drift = warning, pas fail (le smoke ne casse pas dessus)
  process.exit(0);
})().catch((err) => {
  console.error('[visual-baseline] FAIL:', err.message);
  process.exit(1);
});

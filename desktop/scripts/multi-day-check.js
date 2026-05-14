#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _electron: electron } = require('playwright');

async function firstWindow(app) {
  return app.windows()[0] || app.waitForEvent('window', { timeout: 60_000 });
}

function isIgnorableConsoleMessage(message) {
  return /Failed to load resource:\s*net::ERR_(EMPTY_RESPONSE|ABORTED)/i.test(String(message || ''));
}

async function main() {
  const root = path.resolve(__dirname, '..', '..');
  const electronExe = path.join(root, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paris-sportif-multiday-'));
  const messages = [];
  const app = await electron.launch({
    executablePath: electronExe,
    cwd: path.join(root, 'desktop'),
    args: [`--user-data-dir=${userDataDir}`, '.']
  });
  try {
    const win = await firstWindow(app);
    win.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type())) messages.push(`${msg.type()}: ${msg.text()}`);
    });
    win.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));
    await win.waitForSelector('[data-panel="dashboard"].active', { timeout: 60_000 });
    await win.waitForFunction(() => Number(document.querySelector('#metric-picks')?.textContent || 0) >= 10, null, { timeout: 90_000 });

    await win.evaluate(async () => {
      const archiveText = await fetch('/results_archive.jsonl', { cache: 'no-store' }).then((response) => response.text());
      const result = archiveText.split(/\r?\n/)
        .map((line) => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter((row) => row && row.completed && Array.isArray(row.competitors) && row.competitors.some((team) => team && team.name && team.winner === true))[0];
      const winner = result.competitors.find((team) => team.winner === true);
      const older = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const bets = [
        {
          id: 'multiday-j1',
          key: `multi:${result.id}:j1`,
          matchId: result.id,
          sourceEventId: result.id,
          title: result.name,
          sport: result.sport,
          league: result.league_name,
          start: result.date,
          market: '1N2',
          marketKey: '1n2',
          label: winner.name,
          odd: 2,
          openingOdd: 2,
          lastSeenOdd: 2,
          stake: 5,
          probability: 0.6,
          edge: 0.1,
          status: 'pending',
          pnl: 0,
          day: older.slice(0, 10),
          createdAt: older,
          tags: ['multi-day'],
          note: 'Simulation J+3'
        }
      ];
      localStorage.setItem('parisSportifUserBets', JSON.stringify(bets));
      const profile = {
        version: 1,
        preferences: JSON.parse(localStorage.getItem('parisSportifPreferences') || '{}'),
        bets,
        demoBets: []
      };
      await fetch('/api/profile/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile })
      });
      location.reload();
    });

    await win.waitForSelector('[data-panel="dashboard"].active', { timeout: 60_000 });
    await win.click('[data-tab="history"]');
    await win.waitForSelector('#auto-settlement-grid', { timeout: 30_000 });
    const settled = await win.locator('#auto-settlement-grid').textContent();
    if (!/Résolus auto|1/.test(settled || '')) throw new Error(`Settlement multi-jours absent: ${settled}`);
    await win.click('[data-tab="preferences"]');
    const latest = await win.evaluate(() => fetch('/api/profile/latest').then((response) => response.json()));
    if (!latest.ok || !latest.backup?.profile) throw new Error('Backup profil J+3 absent');
    const severe = messages.filter((message) => (
      message.startsWith('error:') || message.startsWith('pageerror:')
    ) && !isIgnorableConsoleMessage(message));
    if (severe.length) throw new Error(`Erreurs console multi-jours: ${severe.join(' | ')}`);
    console.log('Multi-day desktop OK: auto-settlement J+3 + backup profil validés.');
  } finally {
    await app.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

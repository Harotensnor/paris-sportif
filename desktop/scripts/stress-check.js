#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _electron: electron } = require('playwright');

function argMinutes() {
  const raw = process.argv.find((arg) => arg.startsWith('--minutes='));
  const value = raw ? Number(raw.split('=')[1]) : 5;
  return Number.isFinite(value) && value > 0 ? value : 5;
}

async function firstWindow(app) {
  return app.windows()[0] || app.waitForEvent('window', { timeout: 60_000 });
}

function isIgnorableConsoleMessage(message) {
  return /Failed to load resource:\s*net::ERR_(EMPTY_RESPONSE|ABORTED)/i.test(String(message || ''));
}

async function main() {
  const root = path.resolve(__dirname, '..', '..');
  const electronExe = path.join(root, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paris-sportif-stress-'));
  const minutes = argMinutes();
  const deadline = Date.now() + minutes * 60_000;
  const messages = [];
  const memory = [];
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
    await win.waitForFunction(() => Number(document.querySelector('#metric-picks')?.textContent || 0) >= 20, null, { timeout: 90_000 });
    const tabs = ['history', 'calendar', 'pipeline', 'help', 'preferences', 'dashboard'];
    let index = 0;
    while (Date.now() < deadline) {
      await win.click(`[data-tab="${tabs[index % tabs.length]}"]`);
      index += 1;
      const sample = await win.evaluate(async () => {
        const status = await fetch('/api/data-status', { cache: 'no-store' }).then((response) => response.json());
        return status.memory || {};
      });
      if (sample.rssMb) memory.push(sample.rssMb);
      await win.waitForTimeout(15_000);
    }
    const severe = messages.filter((message) => (
      message.startsWith('error:') || message.startsWith('pageerror:')
    ) && !isIgnorableConsoleMessage(message));
    if (severe.length) throw new Error(`Erreurs console pendant stress: ${severe.join(' | ')}`);
    const maxMemory = memory.length ? Math.max(...memory) : 0;
    if (maxMemory > 500) throw new Error(`Mémoire trop haute: ${maxMemory} MB RSS`);
    console.log(`Stress desktop OK: ${minutes} min, mémoire max ${maxMemory || 'n/a'} MB, ${memory.length} samples.`);
  } finally {
    await app.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

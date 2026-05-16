#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { _electron: electron } = require('playwright');

async function firstWindow(app) {
  return app.windows()[0] || app.waitForEvent('window', { timeout: 60000 });
}

async function main() {
  const root = path.resolve(__dirname, '..', '..');
  const electronExe = path.join(root, 'desktop', 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
  if (!fs.existsSync(electronExe)) throw new Error(`Electron introuvable: ${electronExe}`);

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paris-sportif-a11y-'));
  const testPort = 23000 + Math.floor(Math.random() * 2000);
  const app = await electron.launch({
    executablePath: electronExe,
    cwd: path.join(root, 'desktop'),
    env: { ...process.env, PARIS_DESKTOP_PORT: String(testPort), PARIS_DESKTOP_USER_DATA_DIR: userDataDir, PARIS_DESKTOP_TEST_ISOLATED: '1' },
    args: [`--user-data-dir=${userDataDir}`, '.']
  });

  try {
    const win = await firstWindow(app);
    await win.waitForSelector('[data-panel="dashboard"].active', { timeout: 60000 });
    await win.waitForFunction(() => document.querySelector('#metric-picks')?.textContent !== '-', null, { timeout: 90000 });

    const result = await win.evaluate(() => {
      const visible = (node) => {
        if (!node || !node.getClientRects().length) return false;
        const style = getComputedStyle(node);
        return style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || 1) > 0.01;
      };
      const rgb = (value) => {
        const match = String(value || '').match(/rgba?\(([^)]+)\)/);
        if (!match) return null;
        const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
        if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) return null;
        return { r: parts[0], g: parts[1], b: parts[2], a: Number.isFinite(parts[3]) ? parts[3] : 1 };
      };
      const luminance = ({ r, g, b }) => {
        const channel = (v) => {
          const x = v / 255;
          return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      const contrast = (fg, bg) => {
        const l1 = luminance(fg);
        const l2 = luminance(bg);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      };
      const backgroundFor = (node) => {
        let current = node;
        while (current) {
          const bg = rgb(getComputedStyle(current).backgroundColor);
          if (bg && bg.a > 0.2) return bg;
          current = current.parentElement;
        }
        return rgb(getComputedStyle(document.body).backgroundColor) || { r: 15, g: 23, b: 42, a: 1 };
      };

      const iconButtons = Array.from(document.querySelectorAll('button'))
        .filter(visible)
        .filter((button) => (button.textContent || '').trim().length <= 1)
        .filter((button) => !button.getAttribute('aria-label') && !button.getAttribute('title'))
        .map((button) => button.id || button.className || button.outerHTML.slice(0, 80));

      const modalIssues = Array.from(document.querySelectorAll('.modal-backdrop, [role="dialog"]'))
        .filter((node) => node.id)
        .filter((node) => node.getAttribute('role') !== 'dialog' || node.getAttribute('aria-modal') !== 'true')
        .map((node) => node.id);

      const focusable = Array.from(document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(visible);
      const missingFocusLabels = focusable
        .filter((node) => node.tagName === 'BUTTON' && !(node.textContent || '').trim() && !node.getAttribute('aria-label') && !node.getAttribute('title'))
        .map((node) => node.id || node.outerHTML.slice(0, 80));

      const contrastIssues = [];
      const textNodes = Array.from(document.querySelectorAll('h1,h2,h3,h4,p,span,strong,small,em,label,button,td,th,input,select,textarea'))
        .filter(visible)
        .filter((node) => (node.innerText || node.value || node.textContent || '').trim().length >= 2)
        .slice(0, 700);
      for (const node of textNodes) {
        const style = getComputedStyle(node);
        const fg = rgb(style.color);
        const bg = backgroundFor(node);
        if (!fg || !bg) continue;
        const ratio = contrast(fg, bg);
        const size = Number.parseFloat(style.fontSize || '14');
        const weight = Number.parseInt(style.fontWeight || '400', 10);
        const large = size >= 18 || (size >= 14 && weight >= 700);
        const target = large ? 3 : 4.5;
        if (ratio + 0.01 < target) {
          contrastIssues.push({
            text: (node.innerText || node.value || node.textContent || '').trim().slice(0, 60),
            ratio: Number(ratio.toFixed(2)),
            target,
            selector: node.id ? `#${node.id}` : node.className ? `.${String(node.className).split(' ')[0]}` : node.tagName.toLowerCase()
          });
          if (contrastIssues.length >= 20) break;
        }
      }

      return {
        focusableCount: focusable.length,
        iconButtons,
        modalIssues,
        missingFocusLabels,
        contrastIssues
      };
    });

    if (result.focusableCount < 20) throw new Error(`Trop peu d'actions clavier detectees: ${result.focusableCount}`);
    if (result.iconButtons.length) throw new Error(`Boutons icones sans label: ${JSON.stringify(result.iconButtons)}`);
    if (result.modalIssues.length) throw new Error(`Modales sans role/aria-modal corrects: ${JSON.stringify(result.modalIssues)}`);
    if (result.missingFocusLabels.length) throw new Error(`Actions focus sans label: ${JSON.stringify(result.missingFocusLabels)}`);
    if (result.contrastIssues.length) throw new Error(`Contraste insuffisant: ${JSON.stringify(result.contrastIssues)}`);

    await win.keyboard.press('Tab');
    const activeAfterTab = await win.evaluate(() => document.activeElement && document.activeElement !== document.body);
    if (!activeAfterTab) throw new Error('Navigation clavier Tab inactive');
    console.log(`A11y desktop OK: ${result.focusableCount} actions clavier, contrastes AA, ARIA modales OK.`);
  } finally {
    await app.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const os = require('os');
const { _electron: electron } = require('playwright');

async function firstWindow(app) {
  const existing = app.windows()[0];
  if (existing) return existing;
  return app.waitForEvent('window', { timeout: 60000 });
}

async function expectDownload(page, selector, expectedPrefix) {
  await page.evaluate(() => {
    document.querySelector('#export-toast')?.classList.add('hidden');
  });
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.evaluate((targetSelector) => {
      const button = document.querySelector(targetSelector);
      if (!button) throw new Error(`Bouton export introuvable: ${targetSelector}`);
      button.click();
    }, selector)
  ]);
  const filename = download.suggestedFilename();
  if (!filename.startsWith(expectedPrefix)) {
    throw new Error(`Export inattendu pour ${selector}: ${filename}`);
  }
  const failure = await download.failure();
  if (failure) {
    throw new Error(`Téléchargement échoué pour ${selector}: ${failure}`);
  }
  await page.waitForFunction((expected) => {
    const toast = document.querySelector('#export-toast:not(.hidden)');
    return Boolean(toast && toast.textContent.includes(expected));
  }, filename, { timeout: 5000 });
  return filename;
}

async function expectStaticCsv(page, pathname, expectedHeader) {
  const result = await page.evaluate(async ({ pathname, expectedHeader }) => {
    const response = await fetch(pathname, { cache: 'no-store' });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      length: text.length,
      firstLine: text.split(/\r?\n/)[0] || '',
      hasHeader: text.includes(expectedHeader)
    };
  }, { pathname, expectedHeader });
  if (!result.ok || !result.hasHeader || result.length <= 0) {
    throw new Error(`CSV statique invalide ${pathname}: ${JSON.stringify(result)}`);
  }
  return pathname;
}

async function main() {
  const root = path.resolve(__dirname, '..', '..');
  const electronExe = path.join(
    root,
    'desktop',
    'node_modules',
    'electron',
    'dist',
    process.platform === 'win32' ? 'electron.exe' : 'electron'
  );
  if (!fs.existsSync(electronExe)) {
    throw new Error(`Electron introuvable: ${electronExe}`);
  }
  const rendererText = fs.readFileSync(path.join(root, 'desktop', 'src', 'renderer', 'renderer.js'), 'utf8');
  const htmlText = fs.readFileSync(path.join(root, 'desktop', 'src', 'renderer', 'index.html'), 'utf8');
  const mainText = fs.readFileSync(path.join(root, 'desktop', 'src', 'main.js'), 'utf8');
  if (/fetch\(\s*['"]https?:\/\//i.test(rendererText)) {
    throw new Error('Fetch internet direct détecté dans le renderer Electron');
  }
  if (/<\s*(iframe|webview)\b/i.test(htmlText)) {
    throw new Error('iframe/webview détecté dans l’interface Electron');
  }
  if (!mainText.includes('contextIsolation: true') || !mainText.includes('sandbox: true') || !mainText.includes('setWindowOpenHandler')) {
    throw new Error('Durcissement Electron incomplet');
  }
  for (const mode of [
    'v12_price_watch',
    'v12_finalize',
    'v12_ticket_now',
    'v13_price_alerts',
    'v13_t10_resolve',
    'v13_finalize_now',
    'v13_ticket_offline',
    'v14_audit',
    'v14_fix',
    'v16_source_refresh',
    'v16_t10_final',
    'v16_finalize'
  ]) {
    if (!mainText.includes(`requestedMode === '${mode}'`)) {
      throw new Error(`Mode refresh Electron non autorisé par l'API: ${mode}`);
    }
  }

  const messages = [];
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paris-sportif-smoke-'));
  const app = await electron.launch({
    executablePath: electronExe,
    cwd: path.join(root, 'desktop'),
    acceptDownloads: true,
    args: [`--user-data-dir=${userDataDir}`, '.']
  });
  const proc = app.process();
  if (proc) {
    proc.stderr.on('data', (chunk) => {
      String(chunk).split(/\r?\n/).filter(Boolean).forEach((line) => messages.push(`stderr: ${line}`));
    });
  }

  try {
    const win = await firstWindow(app);
    win.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type())) messages.push(`${msg.type()}: ${msg.text()}`);
    });
    win.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));

    await win.waitForSelector('[data-panel="dashboard"].active', { timeout: 60000 });
    await win.waitForFunction(() => document.querySelector('#metric-picks')?.textContent !== '-', null, { timeout: 90000 });
    await win.waitForFunction(() => (
      document.querySelectorAll('#v8-columns .v8-decision-card, #v8-columns .empty').length > 0
      && document.querySelectorAll('#v16-cockpit-grid .quality-report-card, #v16-cockpit-grid .empty').length > 0
      && document.querySelectorAll('#v14-cockpit-grid .quality-report-card, #v14-cockpit-grid .empty').length > 0
      && document.querySelectorAll('#v13-cockpit-grid .quality-report-card, #v13-cockpit-grid .empty').length > 0
      && document.querySelectorAll('#v12-cockpit-grid .quality-report-card, #v12-cockpit-grid .empty').length > 0
    ), null, { timeout: 90000 });

    const dashboard = await win.evaluate(() => ({
      title: document.querySelector('#page-title')?.textContent,
      picks: Number(document.querySelector('#metric-picks')?.textContent || 0),
      analyzed: Number(document.querySelector('#metric-upcoming')?.textContent || 0),
      reasonCount: document.querySelectorAll('#picks-body .selection-reason').length,
      scenarioCards: document.querySelectorAll('#stake-scenario-grid .scenario-card').length,
      scenarioRows: document.querySelectorAll('#stake-scenario-body tr.clickable-row').length,
      watchCards: document.querySelectorAll('#watchlist-grid .watch-card').length,
      watchEmpty: Boolean(document.querySelector('#watchlist-grid .empty')),
      prematchCards: document.querySelectorAll('#prematch-final-grid .prematch-card').length,
      prematchEmpty: Boolean(document.querySelector('#prematch-final-grid .empty')),
      prematchPlanCards: document.querySelectorAll('#prematch-execution-grid .quality-report-card, #prematch-execution-grid .empty').length,
      prematchPlanButtons: document.querySelectorAll('#prematch-execution-grid .prematch-plan-btn').length,
      prebetCards: document.querySelectorAll('#prebet-checklist-grid .quality-report-card, #prebet-checklist-grid .empty').length,
      v5DashboardCards: document.querySelectorAll('#v5-dashboard-grid .quality-report-card, #v5-dashboard-grid .empty').length,
      finalDecisionCards: document.querySelectorAll('#final-decision-grid .quality-report-card, #final-decision-grid .empty').length,
      prebetBacktestCards: document.querySelectorAll('#prebet-backtest-grid .quality-report-card, #prebet-backtest-grid .empty').length,
      prebetExportButton: Boolean(document.querySelector('#export-prebet-csv-btn')),
      smartPrepareButton: Boolean(document.querySelector('#prepare-smart-btn')),
      smartPrepareRunButton: Boolean(document.querySelector('#smart-prepare-run-btn')),
      smartPrepareCards: document.querySelectorAll('#smart-prepare-grid .quality-report-card, #smart-prepare-grid .empty').length,
      refreshEtaExists: Boolean(document.querySelector('#refresh-eta')),
      refreshEtaHidden: document.querySelector('#refresh-eta')?.classList.contains('hidden') || false,
      autoCriticalToggle: Boolean(document.querySelector('#auto-critical-toggle')),
      prematchRunButton: Boolean(document.querySelector('#prematch-final-run-btn')),
      autoPrematchToggle: Boolean(document.querySelector('#auto-prematch-toggle')),
      prematchButton: Boolean(document.querySelector('#refresh-prematch-btn')),
      prematchT60Button: Boolean(document.querySelector('#refresh-prematch-t60-btn')),
      prematchT30Button: Boolean(document.querySelector('#refresh-prematch-t30-btn')),
      prematchT10Button: Boolean(document.querySelector('#refresh-prematch-t10-btn')),
      v7FinalizeButton: Boolean(document.querySelector('#refresh-v7-finalize-btn')),
      v6CommandCards: document.querySelectorAll('#v6-command-grid .terminal-card, #v6-command-grid .empty').length,
      v6TicketRows: document.querySelectorAll('#v6-ticket-strip .ticket-pill, #v6-ticket-strip .empty').length,
      v6TicketButton: Boolean(document.querySelector('#prematch-t10-run-btn')),
      v7ActionCards: document.querySelectorAll('#v7-action-grid .terminal-card, #v7-action-grid .empty').length,
      v7ReadyRows: document.querySelectorAll('#v7-ready-strip .ticket-pill, #v7-ready-strip .empty').length,
      v7FinalizeRunButton: Boolean(document.querySelector('#v7-finalize-run-btn')),
      v8PrepareButton: Boolean(document.querySelector('#refresh-v8-prepare-btn')),
      v8PrepareRunButton: Boolean(document.querySelector('#v8-prepare-run-btn')),
      v8TicketExportButton: Boolean(document.querySelector('#v8-ticket-export-btn')),
      v8Message: document.querySelector('#v8-main-message')?.textContent || '',
      v8Columns: document.querySelectorAll('#v8-columns .v8-column').length,
      v8CardsOrEmpty: document.querySelectorAll('#v8-columns .v8-decision-card, #v8-columns .empty').length,
      v8ReadyCards: document.querySelectorAll('#v8-columns .v8-ready').length,
      v8NonReadyPositiveStake: Array.from(document.querySelectorAll('#picks-body tr.v8-selection-row:not(.v8-ready)')).some((row) => {
        const stake = row.querySelector('td[data-label="Mise"]')?.textContent || '';
        return !/^0\s*€$/.test(stake.trim());
      }),
      v9FinalizeButton: Boolean(document.querySelector('#refresh-v9-finalize-btn')),
      v9FinalizeRunButton: Boolean(document.querySelector('#v9-finalize-run-btn')),
      v9TicketExportButton: Boolean(document.querySelector('#v9-ticket-export-btn')),
      v9Message: document.querySelector('#v9-main-message')?.textContent || '',
      v9UnlockNodes: document.querySelectorAll('#v9-unlock-grid .quality-report-card, #v9-unlock-grid .empty').length,
      v10FinalizeButton: Boolean(document.querySelector('#refresh-v10-finalize-btn')),
      v10FinalizeRunButton: Boolean(document.querySelector('#v10-finalize-run-btn')),
      v10TicketExportButton: Boolean(document.querySelector('#v10-ticket-export-btn')),
      v10Message: document.querySelector('#v10-main-message')?.textContent || '',
      v10Nodes: document.querySelectorAll('#v10-finalizer-grid .quality-report-card, #v10-finalizer-grid .empty').length,
      v11T10Button: Boolean(document.querySelector('#refresh-v11-t10-btn')),
      v11FinalizeButton: Boolean(document.querySelector('#refresh-v11-finalize-btn')),
      v11RepairButton: Boolean(document.querySelector('#refresh-v11-repair-btn')),
      v11T10RunButton: Boolean(document.querySelector('#v11-t10-run-btn')),
      v11FinalizeRunButton: Boolean(document.querySelector('#v11-finalize-run-btn')),
      v11TicketExportButton: Boolean(document.querySelector('#v11-ticket-export-btn')),
      v11Message: document.querySelector('#v11-main-message')?.textContent || '',
      v11Nodes: document.querySelectorAll('#v11-cockpit-grid .quality-report-card, #v11-cockpit-grid .empty').length,
      v12PriceButton: Boolean(document.querySelector('#refresh-v12-price-btn')),
      v12FinalizeButton: Boolean(document.querySelector('#refresh-v12-finalize-btn')),
      v12TicketButton: Boolean(document.querySelector('#refresh-v12-ticket-btn')),
      v12PriceRunButton: Boolean(document.querySelector('#v12-price-run-btn')),
      v12FinalizeRunButton: Boolean(document.querySelector('#v12-finalize-run-btn')),
      v12TicketExportButton: Boolean(document.querySelector('#v12-ticket-export-btn')),
      v12Message: document.querySelector('#v12-main-message')?.textContent || '',
      v12Nodes: document.querySelectorAll('#v12-cockpit-grid .quality-report-card, #v12-cockpit-grid .empty').length,
      v12ReadyCards: document.querySelectorAll('#v12-cockpit-grid .quality-ok').length,
      v13PriceButton: Boolean(document.querySelector('#refresh-v13-price-btn')),
      v13T10Button: Boolean(document.querySelector('#refresh-v13-t10-btn')),
      v13FinalizeButton: Boolean(document.querySelector('#refresh-v13-finalize-btn')),
      v13TicketButton: Boolean(document.querySelector('#refresh-v13-ticket-btn')),
      v13PriceRunButton: Boolean(document.querySelector('#v13-price-run-btn')),
      v13T10RunButton: Boolean(document.querySelector('#v13-t10-run-btn')),
      v13FinalizeRunButton: Boolean(document.querySelector('#v13-finalize-run-btn')),
      v13TicketExportButton: Boolean(document.querySelector('#v13-ticket-export-btn')),
      v13Message: document.querySelector('#v13-main-message')?.textContent || '',
      v13Nodes: document.querySelectorAll('#v13-cockpit-grid .quality-report-card, #v13-cockpit-grid .empty').length,
      v13ReadyCards: document.querySelectorAll('#v13-cockpit-grid .quality-ok').length,
      v14AuditButton: Boolean(document.querySelector('#refresh-v14-audit-btn')),
      v14FixButton: Boolean(document.querySelector('#refresh-v14-fix-btn')),
      v14AuditRunButton: Boolean(document.querySelector('#v14-audit-run-btn')),
      v14FixRunButton: Boolean(document.querySelector('#v14-fix-run-btn')),
      v14PriceExportButton: Boolean(document.querySelector('#v14-price-export-btn')),
      v14Message: document.querySelector('#v14-main-message')?.textContent || '',
      v14Nodes: document.querySelectorAll('#v14-cockpit-grid .quality-report-card, #v14-cockpit-grid .empty').length,
      v14ReadyCards: document.querySelectorAll('#v14-cockpit-grid .quality-ok').length,
      v16SourceButton: Boolean(document.querySelector('#refresh-v16-source-btn')),
      v16T10Button: Boolean(document.querySelector('#refresh-v16-t10-btn')),
      v16FinalizeButton: Boolean(document.querySelector('#refresh-v16-finalize-btn')),
      v16SourceRunButton: Boolean(document.querySelector('#v16-source-run-btn')),
      v16T10RunButton: Boolean(document.querySelector('#v16-t10-run-btn')),
      v16FinalizeRunButton: Boolean(document.querySelector('#v16-finalize-run-btn')),
      v16TicketExportButton: Boolean(document.querySelector('#v16-ticket-export-btn')),
      v16Message: document.querySelector('#v16-main-message')?.textContent || '',
      v16Nodes: document.querySelectorAll('#v16-cockpit-grid .quality-report-card, #v16-cockpit-grid .empty').length,
      v16ReadyCards: document.querySelectorAll('#v16-cockpit-grid .quality-ok').length,
      metricPicksLabel: document.querySelector('#metric-picks-label')?.textContent || '',
      picksCaption: document.querySelector('#picks-caption')?.textContent || '',
      repairContextButton: Boolean(document.querySelector('#refresh-repair-context-btn')),
      criticalButton: Boolean(document.querySelector('#refresh-critical-btn')),
      hasFrame: Boolean(document.querySelector('iframe')),
      hasSiteRoots: Boolean(document.querySelector('#detail-modal, #page-nav, #boot-shell'))
    }));
    const downloads = [];
    downloads.push(await expectDownload(win, '#export-btn', 'paris-sportif-desktop-'));
    downloads.push(await expectDownload(win, '#export-prebet-csv-btn', 'paris-sportif-checklist-'));
    downloads.push(await expectDownload(win, '#export-scenarios-csv-btn', 'paris-sportif-scenarios-'));
    if (dashboard.watchCards > 0) {
      downloads.push(await expectDownload(win, '#export-watchlist-csv-btn', 'paris-sportif-watchlist-'));
    }

    await win.click('[data-tab="matches"]');
    await win.waitForSelector('#matches-body tr.clickable-row', { timeout: 90000 });
    const matchRows = await win.locator('#matches-body tr.clickable-row').count();
    const advancedFilters = await win.locator('#calibration-filter, #edge-filter, #league-filter').count();
    const backtestCards = await win.locator('#matches-backtest-grid .backtest-card').count();
    const backtestExportButtons = await win.locator('#export-filter-backtest-csv-btn').count();
    downloads.push(await expectDownload(win, '#export-filter-backtest-csv-btn', 'paris-sportif-backtest-filtre-'));

    await win.click('[data-tab="combines"]');
    await win.waitForSelector('#combines-list .combo-card', { timeout: 30000 });
    const comboCards = await win.locator('#combines-list .combo-card').count();

    await win.click('[data-tab="scorers"]');
    await win.waitForSelector('#scorers-list .scorer-card', { timeout: 30000 });
    const scorerCards = await win.locator('#scorers-list .scorer-card').count();
    const scorerQualityNodes = await win.locator('#scorers-list .scorer-quality-line').count();
    const scorerReportCards = await win.locator('#scorer-report-grid .quality-report-card, #scorer-report-grid .empty').count();
    const scorerPendingCards = await win.locator('#scorer-pending-grid .quality-report-card, #scorer-pending-grid .empty').count();
    downloads.push(await expectDownload(win, '#export-scorers-csv-btn', 'paris-sportif-buteurs-'));

    await win.click('[data-tab="history"]');
    await win.waitForSelector('#history-pending-body tr', { timeout: 30000 });
    const historyTotal = await win.locator('#hist-total').textContent();
    const calibrationCards = await win.locator('#calibration-market-grid .calibration-card').count();
    const calibrationLeagueCards = await win.locator('#calibration-league-grid .calibration-card').count();
    const calibrationEdgeCards = await win.locator('#calibration-edge-grid .calibration-card').count();
    const calibrationExportButtons = await win.locator('#export-calibration-json-btn, #export-calibration-csv-btn').count();
    const contextBacktestCards = await win.locator('#context-backtest-grid .backtest-card, #context-backtest-grid .empty').count();
    const decisionBacktestCards = await win.locator('#decision-backtest-grid .backtest-card, #decision-backtest-grid .empty').count();
    const decisionBacktestReasons = await win.locator('#decision-reason-grid .backtest-card, #decision-reason-grid .empty').count();
    const decisionTuningCards = await win.locator('#decision-tuning-grid .backtest-card, #decision-tuning-grid .empty').count();
    const decisionBacktestExportButtons = await win.locator('#export-decision-backtest-csv-btn').count();
    downloads.push(await expectDownload(win, '#export-calibration-json-btn', 'paris-sportif-calibration-'));
    downloads.push(await expectDownload(win, '#export-calibration-csv-btn', 'paris-sportif-calibration-'));
    downloads.push(await expectDownload(win, '#export-context-backtest-csv-btn', 'paris-sportif-backtest-contexte-'));
    downloads.push(await expectDownload(win, '#export-decision-backtest-csv-btn', 'paris-sportif-backtest-decision-'));

    await win.click('[data-tab="data"]');
    await win.waitForSelector('#v14-control-room-grid .quality-report-card, #v14-control-room-grid .empty', { timeout: 30000 });
    const v14ControlNodes = await win.locator('#v14-control-room-grid .quality-report-card, #v14-control-room-grid .empty').count();
    const v14FileExportButtons = await win.locator('#export-v14-critical-file-btn, #export-v14-files-file-btn, #export-v14-math-file-btn, #export-v14-price-file-btn, #export-v14-gaps-file-btn').count();
    const v16ControlNodes = await win.locator('#v16-control-room-grid .quality-report-card, #v16-control-room-grid .empty').count();
    const v16FileExportButtons = await win.locator('#export-v16-final-file-btn, #export-v16-wait-t10-file-btn, #export-v16-wait-price-file-btn, #export-v16-rejected-file-btn').count();
    await win.waitForSelector('#v8-control-room-grid .quality-report-card, #v8-control-room-grid .empty', { timeout: 30000 });
    const v8ControlNodes = await win.locator('#v8-control-room-grid .quality-report-card, #v8-control-room-grid .empty').count();
    const v8FileExportButtons = await win.locator('#export-v8-now-next-file-btn, #export-v8-ready-file-btn, #export-v8-repair-file-btn').count();
    await win.waitForSelector('#v9-control-room-grid .quality-report-card, #v9-control-room-grid .empty', { timeout: 30000 });
    const v9ControlNodes = await win.locator('#v9-control-room-grid .quality-report-card, #v9-control-room-grid .empty').count();
    const v9FileExportButtons = await win.locator('#export-v9-unlock-file-btn, #export-v9-final-file-btn').count();
    await win.waitForSelector('#v10-control-room-grid .quality-report-card, #v10-control-room-grid .empty', { timeout: 30000 });
    const v10ControlNodes = await win.locator('#v10-control-room-grid .quality-report-card, #v10-control-room-grid .empty').count();
    const v10FileExportButtons = await win.locator('#export-v10-decision-file-btn, #export-v10-final-file-btn').count();
    await win.waitForSelector('#v11-control-room-grid .quality-report-card, #v11-control-room-grid .empty', { timeout: 30000 });
    const v11ControlNodes = await win.locator('#v11-control-room-grid .quality-report-card, #v11-control-room-grid .empty').count();
    const v11FileExportButtons = await win.locator('#export-v11-ticket-file-btn, #export-v11-unlock-file-btn, #export-v11-repair-file-btn, #export-v11-blockers-file-btn').count();
    await win.waitForSelector('#v12-control-room-grid .quality-report-card, #v12-control-room-grid .empty', { timeout: 30000 });
    const v12ControlNodes = await win.locator('#v12-control-room-grid .quality-report-card, #v12-control-room-grid .empty').count();
    const v12FileExportButtons = await win.locator('#export-v12-targets-file-btn, #export-v12-watchlist-file-btn, #export-v12-ticket-file-btn, #export-v12-alerts-file-btn').count();
    await win.waitForSelector('#v13-control-room-grid .quality-report-card, #v13-control-room-grid .empty', { timeout: 30000 });
    const v13ControlNodes = await win.locator('#v13-control-room-grid .quality-report-card, #v13-control-room-grid .empty').count();
    const v13FileExportButtons = await win.locator('#export-v13-alerts-file-btn, #export-v13-bettable-file-btn, #export-v13-one-tick-file-btn, #export-v13-movement-file-btn, #export-v13-t10-file-btn').count();
    await win.evaluate(() => {
      document.querySelector('details.data-advanced')?.setAttribute('open', '');
    });
    await win.waitForSelector('#source-health-grid .source-card', { timeout: 30000 });
    const sourceRefreshButtons = await win.locator('#source-health-grid .source-refresh-btn').count();
    const reportExportButtons = await win.locator('#export-report-json-btn').count();
    const contextExportButtons = await win.locator('#export-context-json-btn, #export-context-csv-btn, #export-context-backtest-json-btn, #export-decision-backtest-json-btn, #export-gaps-csv-btn').count();
    const decisionFileExportButtons = await win.locator('#export-signal-conflicts-file-btn, #export-repairable-contexts-file-btn, #export-prebet-final-file-btn').count();
    const v4FileExportButtons = await win.locator('#export-critical-issues-file-btn, #export-pick-integrity-file-btn, #export-source-health-file-btn, #export-coverage-repair-file-btn, #export-model-lab-file-btn').count();
    const v5FileExportButtons = await win.locator('#export-v5-critical-fixes-file-btn, #export-v5-dead-files-file-btn, #export-v5-pick-reconciliation-file-btn, #export-v5-test-matrix-file-btn').count();
    const v6FileExportButtons = await win.locator('#export-v6-prebet-ticket-file-btn, #export-v6-profit-engine-file-btn, #export-v6-matching-file-btn, #export-v6-clean-backtest-file-btn').count();
    const v7FileExportButtons = await win.locator('#export-v7-ready-file-btn, #export-v7-edge-file-btn').count();
    const v6ControlNodes = await win.locator('#v6-control-room-grid .quality-report-card, #v6-control-room-grid .empty').count();
    const v6ProfitNodes = await win.locator('#v6-profit-engine-grid .quality-report-card, #v6-profit-engine-grid .empty').count();
    const v6CoverageNodes = await win.locator('#v6-coverage-grid .quality-report-card, #v6-coverage-grid .empty').count();
    const v6BacktestNodes = await win.locator('#v6-backtest-grid .quality-report-card, #v6-backtest-grid .empty').count();
    const v7RedNodes = await win.locator('#v7-red-grid .quality-report-card, #v7-red-grid .empty').count();
    const v7EdgeNodes = await win.locator('#v7-edge-grid .quality-report-card, #v7-edge-grid .empty').count();
    const v7CoverageNodes = await win.locator('#v7-coverage-grid .quality-report-card, #v7-coverage-grid .empty').count();
    const qualityReportCards = await win.locator('#quality-report-grid .quality-report-card').count();
    const criticalIssueNodes = await win.locator('#critical-issues-grid .quality-report-card, #critical-issues-grid .empty').count();
    const integrityNodes = await win.locator('#integrity-grid .quality-report-card, #integrity-grid .empty').count();
    const coverageRepairEngineNodes = await win.locator('#coverage-repair-engine-grid .quality-report-card, #coverage-repair-engine-grid .empty').count();
    const modelLabNodes = await win.locator('#model-lab-grid .quality-report-card, #model-lab-grid .empty').count();
    const sourceHealthV4Nodes = await win.locator('#source-health-v4-grid .quality-report-card, #source-health-v4-grid .empty').count();
    const v5CorrectionNodes = await win.locator('#v5-correction-grid .quality-report-card, #v5-correction-grid .empty').count();
    const signalConflictNodes = await win.locator('#signal-conflict-grid .quality-report-card, #signal-conflict-grid .empty').count();
    const leagueMarketNodes = await win.locator('#league-market-reduction-grid .quality-report-card, #league-market-reduction-grid .empty').count();
    const sourceRegistryNodes = await win.locator('#source-registry-grid .quality-report-card, #source-registry-grid .empty').count();
    const sourceQuarantineNodes = await win.locator('#source-quarantine-grid .quality-report-card, #source-quarantine-grid .empty').count();
    const optionalSourcesNodes = await win.locator('#optional-sources-grid .quality-report-card, #optional-sources-grid .empty').count();
    const teamIdentityNodes = await win.locator('#team-identity-grid .quality-report-card, #team-identity-grid .empty').count();
    const smartPrepareDataNodes = await win.locator('#smart-prepare-data-grid .quality-report-card, #smart-prepare-data-grid .empty').count();
    const coverageTrendCards = await win.locator('#coverage-trend-grid .quality-report-card, #coverage-trend-grid .empty').count();
    const coverageMiniChart = await win.locator('#coverage-trend-grid .coverage-mini-chart, #coverage-trend-grid .empty').count();
    const nextActionNodes = await win.locator('#next-actions-grid .quality-alert-card, #next-actions-grid .empty').count();
    const nextActionButtons = await win.locator('#next-actions-grid .quality-action-btn').count();
    const firstActionButtons = await win.locator('#run-first-action-btn').count();
    const actionHistoryNodes = await win.locator('#action-history-grid .quality-report-card, #action-history-grid .empty').count();
    const sourceFreshnessNodes = await win.locator('#source-freshness-grid .quality-report-card, #source-freshness-grid .empty').count();
    const sourceFreshnessButtons = await win.locator('#source-freshness-grid .quality-action-btn').count();
    const refreshPriorityNodes = await win.locator('#refresh-priority-grid .quality-report-card, #refresh-priority-grid .empty').count();
    const refreshPriorityButtons = await win.locator('#refresh-priority-grid .quality-action-btn').count();
    const contextRepairNodes = await win.locator('#context-repair-grid .quality-report-card, #context-repair-grid .empty').count();
    const contextRepairCards = await win.locator('#context-repair-grid .quality-report-card').count();
    const contextRepairButtons = await win.locator('#context-repair-grid .quality-action-btn').count();
    const signalGapNodes = await win.locator('#signal-gap-grid .signal-gap-card, #signal-gap-grid .empty').count();
    const signalGapCards = await win.locator('#signal-gap-grid .signal-gap-card').count();
    const signalGapButtons = await win.locator('#signal-gap-grid [data-gap-source]').count();
    const refreshStageNodes = await win.locator('#refresh-stage-grid .refresh-stage-card, #refresh-stage-grid .empty').count();
    const qualityControls = await win.locator('#quality-alert-filter, #quality-alert-sort').count();
    const qualityAlertInfo = await win.evaluate(() => ({
      actionable: document.querySelectorAll('#quality-alert-grid .quality-alert:not(.quality-ok)').length,
      buttons: document.querySelectorAll('#quality-alert-grid .quality-action-btn').length
    }));
    await win.selectOption('#quality-alert-sort', 'category');
    await win.waitForFunction(() => document.querySelectorAll('#quality-alert-grid .quality-alert, #quality-alert-grid .empty').length > 0, null, { timeout: 5000 });
    await win.selectOption('#quality-alert-filter', 'pipeline');
    await win.waitForFunction(() => document.querySelectorAll('#quality-alert-grid .quality-alert, #quality-alert-grid .empty').length > 0, null, { timeout: 5000 });
    await win.selectOption('#quality-alert-filter', 'all');
    await win.selectOption('#signal-gap-filter', 'critical');
    await win.waitForFunction(() => document.querySelectorAll('#signal-gap-grid .signal-gap-card, #signal-gap-grid .empty').length > 0, null, { timeout: 5000 });
    await win.selectOption('#signal-gap-filter', 'all');
    downloads.push(await expectDownload(win, '#export-report-json-btn', 'paris-sportif-rapport-'));
    downloads.push(await expectDownload(win, '#export-context-json-btn', 'paris-sportif-contextes-'));
    downloads.push(await expectDownload(win, '#export-context-csv-btn', 'paris-sportif-picks-contexte-'));
    downloads.push(await expectDownload(win, '#export-context-backtest-json-btn', 'paris-sportif-backtest-contexte-'));
    downloads.push(await expectDownload(win, '#export-decision-backtest-json-btn', 'paris-sportif-backtest-decision-'));
    downloads.push(await expectDownload(win, '#export-gaps-csv-btn', 'paris-sportif-signaux-manquants-'));
    downloads.push(await expectDownload(win, '#export-signal-conflicts-file-btn', 'signal_conflicts'));
    downloads.push(await expectDownload(win, '#export-repairable-contexts-file-btn', 'repairable_contexts'));
    downloads.push(await expectDownload(win, '#export-prebet-final-file-btn', 'prebet_final'));
    await expectStaticCsv(win, '/exports/critical_issues.csv', 'severity,category,title');
    await expectStaticCsv(win, '/exports/pick_integrity.csv', 'severity,key,title');
    await expectStaticCsv(win, '/exports/source_health.csv', 'source,kind,status');
    await expectStaticCsv(win, '/exports/coverage_repair.csv', 'priority,source,raw_source');
    await expectStaticCsv(win, '/exports/model_lab.csv', 'section,key,count');
    await expectStaticCsv(win, '/exports/v5_critical_fixes.csv', 'status,severity,category');
    await expectStaticCsv(win, '/exports/v5_dead_files.csv', 'path,category,status');
    await expectStaticCsv(win, '/exports/v5_pick_reconciliation.csv', 'key,count,severity');
    await expectStaticCsv(win, '/exports/v5_test_matrix.csv', 'test,status,detail');
    await expectStaticCsv(win, '/exports/v6_prebet_ticket.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v6_profit_engine.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v6_matching_failures.csv', 'team,sport,status');
    await expectStaticCsv(win, '/exports/v6_clean_backtest.csv', 'scope,key,count');
    await expectStaticCsv(win, '/exports/v7_ready_picks.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v7_edge_audit.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v8_now_next_ticket.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v8_ready_picks.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v8_repair_queue.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v9_ready_unlock.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v9_final_ticket.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v10_decision_feed.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v10_final_bet_ticket.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v11_now_ticket.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v11_ready_unlock.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v11_repair_queue.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v11_blockers.csv', 'type,key,status');
    await expectStaticCsv(win, '/exports/v12_price_targets.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v12_watchlist.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v12_now_ticket.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v12_price_alerts.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v13_price_alerts.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v13_bettable_now.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v13_one_tick_away.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v13_line_movement.csv', 'match,market,pick');
    await expectStaticCsv(win, '/exports/v13_t10_blockers.csv', 'type,key,status');
    await expectStaticCsv(win, '/exports/v14_critical_resolution.csv', 'id,severity,category');
    await expectStaticCsv(win, '/exports/v14_file_audit.csv', 'path,status,kind');
    await expectStaticCsv(win, '/exports/v14_math_integrity.csv', 'severity,type,match');
    await expectStaticCsv(win, '/exports/v14_price_watch.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v14_source_gaps.csv', 'match_id,title,sport');
    await expectStaticCsv(win, '/exports/v16_final_ticket.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v16_wait_t10.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v16_wait_price.csv', 'match,sport,league');
    await expectStaticCsv(win, '/exports/v16_rejected.csv', 'match,sport,league');

    await win.click('[data-tab="matches"]');
    await win.click('#matches-body tr.clickable-row');
    await win.waitForSelector('#match-modal:not(.hidden)', { timeout: 10000 });
    const modalTabs = await win.$$eval('#modal-tabs .modal-tab', (nodes) => nodes.map((node) => node.textContent));
    for (const tab of ['decision', 'context', 'teams', 'availability', 'signals', 'odds', 'h2h', 'timeline', 'sources', 'model', 'v16', 'v15']) {
      await win.click(`[data-detail-tab="${tab}"]`);
      await win.waitForSelector(`[data-detail-panel="${tab}"].active`, { timeout: 5000 });
    }
    const modalOverflow = await win.evaluate(() => {
      const modal = document.querySelector('#match-modal .modal');
      const content = document.querySelector('#modal-content');
      const tabs = document.querySelector('#modal-tabs');
      return {
        modal: modal ? modal.scrollWidth > modal.clientWidth + 2 : true,
        content: content ? content.scrollWidth > content.clientWidth + 2 : true,
        tabs: tabs ? tabs.scrollWidth > tabs.clientWidth + 2 : true
      };
    });
    const modalSections = await win.$$eval('#modal-content h4', (nodes) => nodes.map((node) => node.textContent));
    const calibrationDetail = await win.locator('.calibration-detail-card').count();
    const blockReasonDetail = await win.locator('.block-reason-card').count();
    const repairDetail = await win.locator('.context-repair-card').count();
    await win.click('#modal-close');
    await win.waitForFunction(() => document.querySelector('#match-modal')?.classList.contains('hidden'), null, { timeout: 5000 });

    await win.click('[data-tab="agent"]');
    await win.waitForSelector('#agent-positions-body tr', { timeout: 30000 });
    const agentGuard = await win.locator('#agent-guard').textContent();
    const agentBlockerCards = await win.locator('#agent-blockers-grid .quality-report-card, #agent-blockers-grid .empty').count();
    const agentGuardrailCards = await win.locator('#agent-guardrail-grid .quality-report-card, #agent-guardrail-grid .empty').count();
    const stakeReductionCards = await win.locator('#stake-reduction-grid .quality-report-card, #stake-reduction-grid .empty').count();
    const agentSimulationCards = await win.locator('#agent-simulation-grid .quality-report-card, #agent-simulation-grid .empty').count();
    const agentBlockerRows = await win.locator('#agent-blockers-body tr').count();
    const agentExportButtons = await win.locator('#export-agent-json-btn, #export-agent-csv-btn').count();
    downloads.push(await expectDownload(win, '#export-agent-json-btn', 'paris-sportif-agent-'));
    downloads.push(await expectDownload(win, '#export-agent-csv-btn', 'paris-sportif-agent-'));

    if (dashboard.hasFrame) throw new Error('Un iframe est encore présent');
    if (dashboard.hasSiteRoots) throw new Error('Des éléments du site sont présents dans le logiciel');
    if (!dashboard.prematchButton) throw new Error('Bouton pré-match final absent');
    if (!dashboard.smartPrepareButton || !dashboard.smartPrepareRunButton || !dashboard.smartPrepareCards) throw new Error('Préparation intelligente absente');
    if (!dashboard.refreshEtaExists || !dashboard.refreshEtaHidden) throw new Error('Indicateur temps restant refresh absent ou visible au repos');
    if (!dashboard.prematchT60Button || !dashboard.prematchT30Button || !dashboard.prematchT10Button) throw new Error('Boutons pré-match T-60/T-30/T-10 absents');
    if (!dashboard.v7FinalizeButton || !dashboard.v7ActionCards || !dashboard.v7ReadyRows || !dashboard.v7FinalizeRunButton) throw new Error('Bloc V7 dashboard absent');
    if (!dashboard.v8PrepareButton || !dashboard.v8PrepareRunButton || !dashboard.v8TicketExportButton || dashboard.v8Columns !== 4 || dashboard.v8CardsOrEmpty <= 0) throw new Error('Cockpit V8 dashboard absent');
    if (!dashboard.v9FinalizeButton || !dashboard.v9FinalizeRunButton || !dashboard.v9TicketExportButton || dashboard.v9UnlockNodes <= 0) throw new Error('Bloc V9 opérationnel absent');
    if (!dashboard.v10FinalizeButton || !dashboard.v10FinalizeRunButton || !dashboard.v10TicketExportButton || dashboard.v10Nodes <= 0) throw new Error('Bloc V10 finalizer absent');
    if (!dashboard.v11T10Button || !dashboard.v11FinalizeButton || !dashboard.v11RepairButton || !dashboard.v11T10RunButton || !dashboard.v11FinalizeRunButton || !dashboard.v11TicketExportButton || dashboard.v11Nodes <= 0) throw new Error('Cockpit V11 absent');
    if (!dashboard.v12PriceButton || !dashboard.v12FinalizeButton || !dashboard.v12TicketButton || !dashboard.v12PriceRunButton || !dashboard.v12FinalizeRunButton || !dashboard.v12TicketExportButton || dashboard.v12Nodes <= 0) throw new Error('Cockpit V12 Price Watch absent');
    if (!dashboard.v13PriceButton || !dashboard.v13T10Button || !dashboard.v13FinalizeButton || !dashboard.v13TicketButton || !dashboard.v13PriceRunButton || !dashboard.v13T10RunButton || !dashboard.v13FinalizeRunButton || !dashboard.v13TicketExportButton || dashboard.v13Nodes <= 0) throw new Error('Cockpit V13 Alertes prix absent');
    if (!dashboard.v14AuditButton || !dashboard.v14FixButton || !dashboard.v14AuditRunButton || !dashboard.v14FixRunButton || !dashboard.v14PriceExportButton || dashboard.v14Nodes <= 0) throw new Error('Cockpit V14 Correction totale absent');
    if (!dashboard.v16SourceButton || !dashboard.v16T10Button || !dashboard.v16FinalizeButton || !dashboard.v16SourceRunButton || !dashboard.v16T10RunButton || !dashboard.v16FinalizeRunButton || !dashboard.v16TicketExportButton || dashboard.v16Nodes <= 0) throw new Error('Cockpit V16 Décision finale absent');
    if (dashboard.v8ReadyCards === 0 && !dashboard.v8Message.includes('Aucun pari à jouer maintenant')) throw new Error('Message V8 zéro ready ambigu');
    if (dashboard.v8ReadyCards === 0 && !dashboard.v9Message.includes('Aucun pari à jouer maintenant')) throw new Error('Message V9 zéro ready ambigu');
    if (dashboard.v8ReadyCards === 0 && !dashboard.v10Message.includes('Aucun pari à jouer maintenant')) throw new Error('Message V10 zéro ready ambigu');
    if (dashboard.v8ReadyCards === 0 && !dashboard.v11Message.includes('Aucun pari à jouer maintenant')) throw new Error('Message V11 zéro ready ambigu');
    if (dashboard.v12ReadyCards === 0 && !dashboard.v12Message.includes('Aucun pari à jouer maintenant')) throw new Error('Message V12 zéro ready ambigu');
    if (dashboard.v13ReadyCards === 0 && !dashboard.v13Message.includes('Aucun pari à jouer maintenant')) throw new Error('Message V13 zéro ready ambigu');
    if (dashboard.v16ReadyCards === 0 && !dashboard.v16Message.includes('Aucun pari à jouer maintenant')) throw new Error('Message V16 zéro ready ambigu');
    if (dashboard.v8NonReadyPositiveStake) throw new Error('Une ligne V8 non-ready affiche une mise positive');
    if (dashboard.v8ReadyCards === 0 && !['Candidats détectés', 'Candidats surveillés'].includes(dashboard.metricPicksLabel)) throw new Error('Libellé métrique picks trompeur quand aucun ready');
    if (dashboard.v8ReadyCards === 0 && !dashboard.picksCaption.includes('Sélection surveillée') && !dashboard.picksCaption.includes('Aucun pari à jouer maintenant')) throw new Error('Caption sélection trompeuse quand aucun ready');
    if (!dashboard.v6CommandCards || !dashboard.v6TicketRows || !dashboard.v6TicketButton) throw new Error('Terminal V6 dashboard absent');
    if (!dashboard.repairContextButton) throw new Error('Bouton réparation contexte absent');
    if (!dashboard.criticalButton) throw new Error('Bouton file critique absent');
    if (!dashboard.prematchRunButton) throw new Error('Bouton pré-match final dashboard absent');
    if (!dashboard.autoPrematchToggle) throw new Error('Toggle auto pré-match absent');
    if (!dashboard.autoCriticalToggle) throw new Error('Toggle auto file critique absent');
    if (!dashboard.prebetCards || !dashboard.prebetExportButton) throw new Error('Checklist avant mise absente');
    if (!dashboard.finalDecisionCards) throw new Error('Décision finale dashboard absente');
    if (!dashboard.prebetBacktestCards) throw new Error('Backtest checklist dashboard absent');
    if (!dashboard.watchCards && !dashboard.watchEmpty) throw new Error('Watchlist automatique absente');
    if (!dashboard.prematchCards && !dashboard.prematchEmpty) throw new Error('Panneau pré-match final absent');
    if (dashboard.prematchPlanCards <= 0) throw new Error('Plan pré-match absent');
    if (dashboard.v8ReadyCards > 0 && dashboard.scenarioCards !== 3) throw new Error('Scénarios de mise user absents');
    if (dashboard.v8ReadyCards > 0 && dashboard.scenarioRows <= 0) throw new Error('Détail des mises par scénario absent');
    if (dashboard.v8ReadyCards === 0 && dashboard.scenarioCards > 0) throw new Error('Scénarios de mise affichés malgré aucun ready V8');
    if (dashboard.picks > 0 && dashboard.reasonCount <= 0) throw new Error('Explication des picks dashboard absente');
    if (dashboard.analyzed <= 0 || matchRows <= 0) throw new Error('Aucun match analysé');
    if (advancedFilters !== 3) throw new Error('Filtres avancés Tous les matchs absents');
    if (backtestCards !== 4) throw new Error('Mini backtest des filtres absent');
    if (backtestExportButtons !== 1) throw new Error('Export CSV du backtest filtré absent');
    if (comboCards <= 0) throw new Error('Aucun combiné affiché');
    if (scorerCards <= 0) throw new Error('Aucun buteur affiché');
    if (scorerQualityNodes <= 0) throw new Error('Qualité buteur non affichée');
    if (scorerReportCards <= 0) throw new Error('Rapport qualité buteurs absent');
    if (scorerPendingCards <= 0) throw new Error('Audit pending buteurs absent');
    if (!historyTotal || historyTotal === '-') throw new Error('Historique non affiché');
    if (calibrationCards <= 0) throw new Error('Calibration marchés non affichée');
    if (calibrationLeagueCards <= 0) throw new Error('Calibration ligues non affichée');
    if (calibrationEdgeCards <= 0) throw new Error('Calibration edge non affichée');
    if (calibrationExportButtons !== 2) throw new Error('Exports calibration non affichés');
    if (contextBacktestCards <= 0) throw new Error('Backtest contexte non affiché');
    if (decisionBacktestCards <= 0 || decisionBacktestReasons <= 0) throw new Error('Backtest décision non affiché');
    if (decisionTuningCards <= 0) throw new Error('Réglage décision non affiché');
    if (decisionBacktestExportButtons !== 1) throw new Error('Export CSV du backtest décision absent');
    for (const label of ['Synthèse', 'Décision', 'Contexte', 'Équipes', 'Effectif', 'Signaux', 'Cotes', 'H2H', 'Timeline', 'Sources', 'Modèle', 'Action']) {
      if (!modalTabs.includes(label)) throw new Error(`Onglet fiche détail absent: ${label}`);
    }
    if (modalOverflow.modal || modalOverflow.content || modalOverflow.tabs) {
      throw new Error(`La fiche match a encore un overflow horizontal: ${JSON.stringify(modalOverflow)}`);
    }
    if (!modalTabs.includes('Synthèse') || !modalTabs.includes('Signaux') || !modalTabs.includes('Cotes') || !modalTabs.includes('H2H')) {
      throw new Error('La fiche détail n expose pas tous les onglets');
    }
    if (!modalSections.includes('Synthèse') || !modalSections.includes('Marchés détaillés') || !modalSections.includes('Qualité contexte') || !modalSections.includes('Sources utilisées')) {
      throw new Error('La fiche détail est incomplète');
    }
    if (!modalSections.includes('Calibration risque') || calibrationDetail <= 0) {
      throw new Error('La calibration risque est absente de la fiche détail');
    }
    if (!modalSections.includes('Pourquoi bloqué') || blockReasonDetail <= 0) {
      throw new Error('La fiche détail n explique pas les blocages');
    }
    if (!modalSections.includes('Blocage V5')) {
      throw new Error('La fiche détail n expose pas le blocage V5');
    }
    if (!modalSections.includes('Réparation conseillée') || repairDetail <= 0) {
      throw new Error('La fiche détail n expose pas la réparation contexte');
    }
    if (!modalSections.includes('Model Lab')) {
      throw new Error('La fiche détail n expose pas le Model Lab');
    }
    if (!modalSections.includes('Action V15') && !modalSections.includes('Décision V15')) {
      throw new Error('La fiche détail n expose pas la décision V15');
    }
    if (!modalSections.includes('Profit Engine V6') || !modalSections.includes('Ticket T-10')) {
      throw new Error('La fiche détail n expose pas V6');
    }
    if (!modalSections.includes('Décision V7') || !modalSections.includes('Release Edge')) {
      throw new Error('La fiche détail n expose pas V7');
    }
    if (!modalSections.includes('Décision V8') || !modalSections.includes('Réponse immédiate')) {
      throw new Error('La fiche détail n expose pas la décision V8');
    }
    if (!modalSections.includes('Décision V9') || !modalSections.includes('Verdict V9') || !modalSections.includes('Profit Gate')) {
      throw new Error('La fiche détail n expose pas la décision V9');
    }
    if (!modalSections.includes('Décision V10') || !modalSections.includes('Gate T-10') || !modalSections.includes('Profit Guard V10')) {
      throw new Error('La fiche détail n expose pas la décision V10');
    }
    if (!modalSections.includes('Décision V11') || (!modalSections.includes('T-10 rapide') && !modalSections.includes('Blocages T-10')) || !modalSections.includes('Profit Guard V11')) {
      throw new Error('La fiche détail n expose pas la décision V11');
    }
    if (!modalSections.includes('Décision V12 Prix') || !modalSections.includes('Prix cible') || !modalSections.includes('CLV')) {
      throw new Error('La fiche détail n expose pas la décision prix V12');
    }
    if (!modalSections.includes('Prix & timing V13') || !modalSections.includes('Timeline cote compacte') || !modalSections.includes('T-10 gate')) {
      throw new Error('La fiche détail n expose pas la décision prix V13');
    }
    if (!modalSections.includes('Audit V14 du match') && !modalSections.includes('Audit V14')) {
      throw new Error('La fiche détail n expose pas l audit V14');
    }
    if (!agentGuard || agentGuard === '-') throw new Error('Garde-fou agent non affiché');
    if (sourceRefreshButtons < 7) throw new Error('Les refresh par source ne sont pas affichés');
    if (reportExportButtons !== 1) throw new Error('Export rapport complet non affiché');
    if (contextExportButtons !== 5) throw new Error('Exports contexte non affichés');
    if (decisionFileExportButtons !== 3) throw new Error('Exports CSV décision absents');
    if (v4FileExportButtons !== 5) throw new Error('Exports CSV V4 absents');
    if (v5FileExportButtons !== 4) throw new Error('Exports CSV V5 absents');
    if (v6FileExportButtons !== 4) throw new Error('Exports CSV V6 absents');
    if (v7FileExportButtons !== 2) throw new Error('Exports CSV V7 absents');
    if (v8FileExportButtons !== 3) throw new Error('Exports CSV V8 absents');
    if (v8ControlNodes <= 0) throw new Error('Control Room V8 incomplet');
    if (v9FileExportButtons !== 2) throw new Error('Exports CSV V9 absents');
    if (v9ControlNodes <= 0) throw new Error('Control Room V9 incomplet');
    if (v10FileExportButtons !== 2) throw new Error('Exports CSV V10 absents');
    if (v10ControlNodes <= 0) throw new Error('Control Room V10 incomplet');
    if (v11FileExportButtons !== 4) throw new Error('Exports CSV V11 absents');
    if (v11ControlNodes <= 0) throw new Error('Control Room V11 incomplet');
    if (v12FileExportButtons !== 4) throw new Error('Exports CSV V12 absents');
    if (v12ControlNodes <= 0) throw new Error('Control Room V12 incomplet');
    if (v13FileExportButtons !== 5) throw new Error('Exports CSV V13 absents');
    if (v13ControlNodes <= 0) throw new Error('Control Room V13 incomplet');
    if (v14FileExportButtons !== 5) throw new Error('Exports CSV V14 absents');
    if (v14ControlNodes <= 0) throw new Error('Control Room V14 incomplet');
    if (v16FileExportButtons !== 4) throw new Error('Exports CSV V16 absents');
    if (v16ControlNodes <= 0) throw new Error('Control Room V16 incomplet');
    if (v6ControlNodes <= 0 || v6ProfitNodes <= 0 || v6CoverageNodes <= 0 || v6BacktestNodes <= 0) throw new Error('Control Room V6 incomplet');
    if (v7RedNodes <= 0 || v7EdgeNodes <= 0 || v7CoverageNodes <= 0) throw new Error('V7 Actionability incomplet');
    if (dashboard.v5DashboardCards <= 0) throw new Error('Bloc V5 accueil absent');
    if (qualityReportCards < 5) throw new Error('Rapport qualité incomplet');
    if (criticalIssueNodes <= 0) throw new Error('Critical Issues V4 absent');
    if (integrityNodes <= 0) throw new Error('Intégrité V4 absente');
    if (coverageRepairEngineNodes <= 0) throw new Error('Coverage Repair Engine V4 absent');
    if (modelLabNodes <= 0) throw new Error('Model Lab V4 absent');
    if (sourceHealthV4Nodes <= 0) throw new Error('Source Health V4 absent');
    if (v5CorrectionNodes <= 0) throw new Error('V5 Correction Center absent');
    if (signalConflictNodes <= 0) throw new Error('Panneau conflits signaux absent');
    if (leagueMarketNodes <= 0) throw new Error('Panneau réductions ligue+marché absent');
    if (sourceRegistryNodes <= 0 || sourceQuarantineNodes <= 0 || optionalSourcesNodes <= 0) throw new Error('Source Health Center V3 absent');
    if (teamIdentityNodes <= 0) throw new Error('Identity graph équipes absent');
    if (smartPrepareDataNodes <= 0) throw new Error('Préparation intelligente données absente');
    if (coverageTrendCards <= 0) throw new Error('Tendance couverture absente');
    if (coverageMiniChart <= 0) throw new Error('Mini graphe couverture absent');
    if (nextActionNodes <= 0) throw new Error('Prochaines actions absentes');
    if (nextActionButtons <= 0) throw new Error('Prochaines actions non actionnables');
    if (firstActionButtons !== 1) throw new Error('Bouton première action absent');
    if (actionHistoryNodes <= 0) throw new Error('Mémoire locale des actions absente');
    if (sourceFreshnessNodes <= 0 || sourceFreshnessButtons <= 0) throw new Error('Plan fraîcheur sources absent ou non actionnable');
    if (refreshPriorityNodes <= 0 || refreshPriorityButtons <= 0) throw new Error('File refresh prioritaire absente ou non actionnable');
    if (contextRepairNodes <= 0) throw new Error('Plan réparation contexte absent');
    if (contextRepairCards > 0 && contextRepairButtons <= 0) throw new Error('Plan réparation contexte non actionnable');
    if (signalGapNodes <= 0) throw new Error('Signal Gap Center absent');
    if (signalGapCards > 0 && signalGapButtons <= 0) throw new Error('Signal Gap Center non actionnable');
    if (refreshStageNodes <= 0) throw new Error('Journal détaillé des étapes refresh absent');
    if (qualityControls !== 2) throw new Error('Filtres alertes qualité absents');
    if (qualityAlertInfo.actionable > 0 && qualityAlertInfo.buttons <= 0) throw new Error('Alertes qualité non actionnables');
    if (agentExportButtons !== 2) throw new Error('Les exports agent ne sont pas affichés');
    if (agentBlockerCards <= 0 || agentBlockerRows <= 0) throw new Error('Détail des blocages agent absent');
    if (agentGuardrailCards <= 0) throw new Error('Conseils garde-fous agent absents');
    if (stakeReductionCards <= 0) throw new Error('Backtest réduction de mise absent');
    if (agentSimulationCards <= 0) throw new Error('Simulation bankroll agent absente');
    if (downloads.length < 15) throw new Error('Tous les exports attendus ne sont pas testés');

    const severe = messages.filter((message) => message.startsWith('error:') || message.startsWith('pageerror:'));
    if (severe.length) throw new Error(`Erreurs console: ${severe.join(' | ')}`);

    console.log(`Desktop smoke OK: ${dashboard.analyzed} matchs analysés, ${dashboard.picks} picks, ${comboCards} combinés, ${scorerCards} buteurs, ${matchRows} lignes visibles, ${downloads.length} exports testés.`);
  } finally {
    await app.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

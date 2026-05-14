const { app, BrowserWindow, shell, session } = require('electron');
const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { URL } = require('url');
const { createLegacyEngineService } = require('./engine/legacy-engine');
const qualityUtils = require('./engine/quality-utils');

const DESKTOP_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(DESKTOP_ROOT, '..');
const HOST = '127.0.0.1';
const STATE_ROOT = path.join(DESKTOP_ROOT, 'state');
const REFRESH_HISTORY_PATH = path.join(STATE_ROOT, 'refresh-history.json');
const PROFILE_BACKUP_ROOT = path.join(STATE_ROOT, 'backups');
const DATA_BACKUP_ROOT = path.join(STATE_ROOT, 'data-backups');
const DATA_BACKUP_PATH = path.join(DATA_BACKUP_ROOT, 'data-latest.js');
const SIGNAL_SOURCES = new Set(['all', 'weather', 'referees', 'injuries', 'lineups', 'team_form', 'team_stats', 'h2h', 'context']);
const REFRESH_MODES = new Set([
  'quick',
  'full',
  'signals',
  'prematch',
  'prematch_t60',
  'prematch_t30',
  'prematch_t10',
  'critical',
  'repair_context'
]);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon'
};

const RENDERER_ROOT = path.resolve(DESKTOP_ROOT, 'src', 'renderer');
const HTML_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: https://img.sofascore.com",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "worker-src 'none'"
].join('; ');

const refreshState = {
  running: false,
  mode: null,
  source: null,
  startedAt: null,
  finishedAt: null,
  exitCode: null,
  error: null,
  lastByMode: {},
  history: [],
  lines: []
};

let localServer = null;
let mainWindow = null;
let refreshChild = null;
const engineService = createLegacyEngineService({ projectRoot: PROJECT_ROOT });
const memoryState = {
  rssMb: null,
  heapUsedMb: null,
  updatedAt: null,
  warning: null
};

app.commandLine.appendSwitch('disable-http-cache');

function isWithin(basePath, targetPath) {
  const rel = path.relative(path.resolve(basePath), path.resolve(targetPath));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function baseHeaders(contentType) {
  const headers = {
    'Content-Type': contentType,
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin'
  };
  if (String(contentType).startsWith('text/html')) {
    headers['Content-Security-Policy'] = HTML_CSP;
  }
  return headers;
}

function jsonResponse(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, baseHeaders('application/json; charset=utf-8'));
  res.end(body);
}

function readRequestBody(req, maxBytes = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function readJsonBody(req) {
  const body = await readRequestBody(req);
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`JSON invalide: ${error.message}`);
  }
}

function atomicWriteJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

function webhookPayload(config, alert) {
  const title = String(alert.title || 'Paris-Sportif').slice(0, 160);
  const message = String(alert.message || alert.body || '').slice(0, 4000);
  const type = String(config.type || 'generic').toLowerCase();
  const text = `${title}\n${message}`.trim();
  if (type === 'discord') {
    return {
      contentType: 'application/json',
      body: JSON.stringify({ content: `**${title}**\n${message}`.trim() })
    };
  }
  if (type === 'ntfy') {
    return {
      contentType: 'text/plain; charset=utf-8',
      headers: { Title: title },
      body: message || title
    };
  }
  if (type === 'telegram') {
    return {
      contentType: 'application/json',
      body: JSON.stringify({ text, parse_mode: 'HTML' })
    };
  }
  if (type === 'pushover') {
    const targetUrl = new URL(config.url);
    const params = new URLSearchParams();
    for (const [key, value] of targetUrl.searchParams.entries()) {
      if (['token', 'user', 'device', 'priority', 'sound'].includes(key)) params.set(key, value);
    }
    params.set('title', title);
    params.set('message', message || title);
    return {
      contentType: 'application/x-www-form-urlencoded; charset=utf-8',
      body: params.toString()
    };
  }
  return {
    contentType: 'application/json',
    body: JSON.stringify({
      app: 'Paris-Sportif Desktop',
      title,
      message,
      match: alert.match || null,
      sentAt: new Date().toISOString()
    })
  };
}

function postWebhook(config, alert) {
  return new Promise((resolve, reject) => {
    const target = new URL(config.url);
    if (!['https:', 'http:'].includes(target.protocol)) {
      reject(new Error('URL webhook invalide'));
      return;
    }
    const payload = webhookPayload(config, alert);
    const client = target.protocol === 'https:' ? https : http;
    const options = {
      method: 'POST',
      hostname: target.hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      timeout: 15000,
      headers: {
        'Content-Type': payload.contentType,
        'Content-Length': Buffer.byteLength(payload.body),
        ...(payload.headers || {})
      }
    };
    const request = client.request(options, (response) => {
      let responseBody = '';
      response.on('data', (chunk) => { responseBody += chunk; });
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve({ ok: true, statusCode: response.statusCode, body: responseBody.slice(0, 500) });
        } else {
          reject(new Error(`Webhook HTTP ${response.statusCode}: ${responseBody.slice(0, 200)}`));
        }
      });
    });
    request.on('timeout', () => {
      request.destroy(new Error('Webhook timeout'));
    });
    request.on('error', reject);
    request.write(payload.body);
    request.end();
  });
}

function isSelfWebhookTarget(value, hostHeader) {
  try {
    const target = new URL(value);
    const host = String(hostHeader || '').toLowerCase();
    const targetHost = `${target.hostname}${target.port ? `:${target.port}` : ''}`.toLowerCase();
    const isLocal = ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(target.hostname.toLowerCase());
    return isLocal && host === targetHost && target.pathname.startsWith('/api/webhook/');
  } catch {
    return false;
  }
}

function textResponse(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, baseHeaders(contentType));
  res.end(body);
}

function safeJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return { __error: error.message };
  }
}

function loadRefreshHistory() {
  const stored = safeJsonFile(REFRESH_HISTORY_PATH);
  if (!stored || stored.__error) return;
  refreshState.lastByMode = stored.lastByMode && typeof stored.lastByMode === 'object' ? stored.lastByMode : {};
  refreshState.history = Array.isArray(stored.history) ? stored.history.slice(0, 20) : [];
}

function persistRefreshHistory() {
  try {
    fs.mkdirSync(STATE_ROOT, { recursive: true });
    const payload = {
      updatedAt: new Date().toISOString(),
      lastByMode: refreshState.lastByMode,
      history: refreshState.history.slice(0, 20)
    };
    const tmp = `${REFRESH_HISTORY_PATH}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, REFRESH_HISTORY_PATH);
  } catch (error) {
    appendRefreshLine(`[desktop] historique refresh non écrit: ${error.message}`);
  }
}

loadRefreshHistory();
sampleMemoryUsage();
setInterval(sampleMemoryUsage, 5 * 60 * 1000);

function sampleMemoryUsage() {
  const usage = process.memoryUsage();
  memoryState.rssMb = Number((usage.rss / 1024 / 1024).toFixed(1));
  memoryState.heapUsedMb = Number((usage.heapUsed / 1024 / 1024).toFixed(1));
  memoryState.updatedAt = new Date().toISOString();
  memoryState.warning = memoryState.rssMb > 500 ? `Mémoire haute: ${memoryState.rssMb} MB RSS` : null;
  if (memoryState.warning) appendRefreshLine(`[desktop] ${memoryState.warning}`);
  return memoryState;
}

function extractDataJsFrom(filePath, source = 'data.js') {
  try {
    if (!fs.existsSync(filePath)) return { exists: false };
    const text = fs.readFileSync(filePath, 'utf8');
    const match = text.match(/window\.PRONOSTICS_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
    if (!match) {
      const generated = text.match(/"generated_at"\s*:\s*"([^"]+)"/);
      return {
        exists: true,
        parseable: false,
        generatedAt: generated ? generated[1] : null,
        sizeBytes: Buffer.byteLength(text),
        source
      };
    }
    const data = JSON.parse(match[1]);
    return {
      exists: true,
      parseable: true,
      source,
      generatedAt: data.generated_at || null,
      today: data.today || null,
      days: data.days || {},
      sizeBytes: Buffer.byteLength(text)
    };
  } catch (error) {
    return { exists: true, parseable: false, source, error: error.message };
  }
}

function persistDataBackupIfHealthy(dataInfo) {
  if (!dataInfo || !dataInfo.parseable || dataInfo.source !== 'data.js') return null;
  try {
    const sourcePath = path.join(PROJECT_ROOT, 'data.js');
    fs.mkdirSync(DATA_BACKUP_ROOT, { recursive: true });
    const sourceStat = fs.statSync(sourcePath);
    const backupStat = fs.existsSync(DATA_BACKUP_PATH) ? fs.statSync(DATA_BACKUP_PATH) : null;
    if (!backupStat || backupStat.size !== sourceStat.size || backupStat.mtimeMs < sourceStat.mtimeMs) {
      fs.copyFileSync(sourcePath, DATA_BACKUP_PATH);
    }
    return { ok: true, path: DATA_BACKUP_PATH };
  } catch (error) {
    appendRefreshLine(`[desktop] backup data ignoré: ${error.message}`);
    return { ok: false, error: error.message };
  }
}

function extractDataJs() {
  const primary = extractDataJsFrom(path.join(PROJECT_ROOT, 'data.js'), 'data.js');
  if (primary.parseable) {
    persistDataBackupIfHealthy(primary);
    return primary;
  }
  const backup = extractDataJsFrom(DATA_BACKUP_PATH, 'desktop/state/data-backups/data-latest.js');
  if (backup.parseable) {
    return {
      ...backup,
      recoveredFromBackup: true,
      primaryError: primary.error || 'data.js illisible'
    };
  }
  return primary;
}

function backupProfile(profile) {
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const payload = {
    version: 1,
    backedUpAt: now.toISOString(),
    profile: profile && typeof profile === 'object' ? profile : {}
  };
  const filePath = path.join(PROFILE_BACKUP_ROOT, `profile-${stamp}.json`);
  const latestPath = path.join(PROFILE_BACKUP_ROOT, 'latest.json');
  atomicWriteJson(filePath, payload);
  atomicWriteJson(latestPath, payload);
  const files = fs.readdirSync(PROFILE_BACKUP_ROOT)
    .filter((name) => /^profile-.*\.json$/.test(name))
    .map((name) => ({ name, path: path.join(PROFILE_BACKUP_ROOT, name), stat: fs.statSync(path.join(PROFILE_BACKUP_ROOT, name)) }))
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
  for (const file of files.slice(30)) {
    try { fs.unlinkSync(file.path); } catch {}
  }
  return { ok: true, backedUpAt: payload.backedUpAt, file: filePath, kept: Math.min(files.length, 30) };
}

function readLatestProfileBackup() {
  const latestPath = path.join(PROFILE_BACKUP_ROOT, 'latest.json');
  if (!fs.existsSync(latestPath)) return { ok: false, missing: true };
  try {
    return { ok: true, backup: JSON.parse(fs.readFileSync(latestPath, 'utf8')) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function eventListFromDays(days) {
  const rows = [];
  if (!days || typeof days !== 'object') return rows;
  for (const [dayKey, dayValue] of Object.entries(days)) {
    const events = Array.isArray(dayValue)
      ? dayValue
      : Array.isArray(dayValue && dayValue.events)
        ? dayValue.events
        : [];
    for (const event of events) rows.push({ dayKey, event });
  }
  return rows;
}

function computeAgeMinutes(iso) {
  const ts = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.round((Date.now() - ts) / 60000));
}

function fileMeta(name) {
  const filePath = path.join(PROJECT_ROOT, name);
  try {
    const stat = fs.statSync(filePath);
    return {
      name,
      exists: true,
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString()
    };
  } catch {
    return { name, exists: false };
  }
}

function getDataStatus() {
  if (!refreshState.running) loadRefreshHistory();
  const dataJs = extractDataJs();
  const manifest = safeJsonFile(path.join(PROJECT_ROOT, 'data_manifest.json'));
  const health = safeJsonFile(path.join(PROJECT_ROOT, 'health.json'));
  const today = safeJsonFile(path.join(PROJECT_ROOT, 'data_today.json'));
  const generatedAt =
    dataJs.generatedAt ||
    (manifest && !manifest.__error ? manifest.generated_at : null) ||
    (health && !health.__error ? health.generated_at : null);
  const ageMinutes = computeAgeMinutes(generatedAt);
  const allRows = eventListFromDays(dataJs.days);
  const allEvents = allRows.map((row) => row.event).filter(Boolean);
  const todayEvents = Array.isArray(today) ? today : [];
  const now = Date.now();
  const upcoming = allEvents.filter((event) => {
    const ts = Date.parse(event.date || event.startDate || '');
    return !event.completed && Number.isFinite(ts) && ts > now - 30 * 60000;
  });
  const bookable = upcoming.filter((event) => {
    const winamax = event && event.winamax;
    return Boolean(winamax && winamax.available === true && winamax.match_id && winamax.markets && winamax.markets['1n2']);
  });
  const status =
    ageMinutes == null ? 'unknown' :
      ageMinutes <= 240 ? 'fresh' :
        ageMinutes <= 360 ? 'stale' :
          'blocked';

  const payload = {
    generatedAt,
    ageMinutes,
    status,
    source: dataJs.parseable ? 'data.js' : 'metadata',
    recovery: dataJs.recoveredFromBackup ? {
      recoveredFromBackup: true,
      source: dataJs.source,
      primaryError: dataJs.primaryError || null
    } : null,
    counts: {
      days: dataJs.days ? Object.keys(dataJs.days).length : 0,
      events: allEvents.length,
      upcoming: upcoming.length,
      bookable: bookable.length,
      today: todayEvents.length
    },
    warnings: Array.isArray(health && health.warnings) ? health.warnings.slice(0, 12) : [],
    refresh: {
      running: refreshState.running,
      mode: refreshState.mode,
      startedAt: refreshState.startedAt,
      finishedAt: refreshState.finishedAt,
      exitCode: refreshState.exitCode,
      error: refreshState.error,
      lastByMode: refreshState.lastByMode,
      history: refreshState.history.slice(0, 12)
    },
    health: health && !health.__error ? {
      generatedAt: health.generated_at || null,
      dataAgeMin: health.data_age_min ?? null,
      qualityChecks: health.quality_checks || null,
      sources: health.sources || null
    } : null,
    memory: sampleMemoryUsage(),
    files: [
      fileMeta('data.js'),
      fileMeta('data_today.json'),
      fileMeta('health.json'),
      fileMeta('winamax_catalog.json'),
      fileMeta('clv_summary.json'),
      fileMeta('backtest_report_v2.json'),
      fileMeta('match_context.json'),
      fileMeta('signal_gap_report.json')
    ]
  };
  payload.qualityAlerts = qualityUtils.buildQualityAlerts(payload);
  return payload;
}

function appendRefreshLine(line) {
  const clean = String(line || '').trim();
  if (!clean) return;
  refreshState.lines.push(clean.slice(-1600));
  while (refreshState.lines.length > 300) refreshState.lines.shift();
}

function finishRefresh(exitCode, errorMessage = null) {
  if (!refreshState.running && !refreshChild && refreshState.finishedAt) return;
  refreshState.running = false;
  refreshChild = null;
  refreshState.finishedAt = new Date().toISOString();
  refreshState.exitCode = exitCode;
  refreshState.error = errorMessage;
  const stored = safeJsonFile(REFRESH_HISTORY_PATH);
  const mode = refreshState.mode || 'quick';
  const source = refreshState.mode === 'signals' ? (refreshState.source || 'all') : null;
  const key = mode === 'signals' && source && source !== 'all' ? `signals:${source}` : mode;
  const persisted = stored && !stored.__error && stored.lastByMode
    ? (stored.lastByMode[key] || stored.lastByMode[mode])
    : null;
  const persistedStarted = Date.parse(persisted?.startedAt || '');
  const currentStarted = Date.parse(refreshState.startedAt || '');
  const sameRun = persisted && Number.isFinite(persistedStarted) && Number.isFinite(currentStarted) && persistedStarted >= currentStarted - 2000;
  const summary = {
    ...(sameRun ? persisted : {}),
    mode,
    source,
    startedAt: refreshState.startedAt,
    finishedAt: refreshState.finishedAt,
    exitCode,
    error: errorMessage,
    ok: exitCode === 0 && !errorMessage
  };
  refreshState.lastByMode[summary.mode] = summary;
  if (summary.mode === 'signals' && summary.source && summary.source !== 'all') {
    refreshState.lastByMode[`signals:${summary.source}`] = summary;
  }
  refreshState.history.unshift(summary);
  refreshState.history = refreshState.history.slice(0, 20);
  persistRefreshHistory();
}

function spawnPythonRefresh(mode, source = 'all') {
  const script = path.join(DESKTOP_ROOT, 'bin', 'refresh_once.py');
  const modeArgs = {
    full: '--full',
    signals: '--signals',
    prematch: '--prematch',
    prematch_t60: '--prematch-t60',
    prematch_t30: '--prematch-t30',
    prematch_t10: '--prematch-t10',
    repair_context: '--repair-context',
    critical: '--critical'
  };
  const modeArg = modeArgs[mode] || '--quick';
  const args = [script, modeArg];
  if (mode === 'signals') {
    args.push('--signal-source', source || 'all');
  }
  const candidates = process.platform === 'win32'
    ? [
      { command: 'python', args },
      { command: 'py', args: ['-3', ...args] }
    ]
    : [
      { command: 'python3', args },
      { command: 'python', args }
    ];

  let index = 0;
  const trySpawn = () => {
    const candidate = candidates[index];
    refreshState.lines = [];
    appendRefreshLine(`[desktop] lancement ${candidate.command} ${candidate.args.join(' ')}`);
    const child = childProcess.spawn(candidate.command, candidate.args, {
      cwd: PROJECT_ROOT,
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        PYTHONUTF8: '1'
      }
    });
    refreshChild = child;

    let failedBeforeStart = true;
    child.stdout.on('data', (chunk) => {
      failedBeforeStart = false;
      String(chunk).split(/\r?\n/).forEach(appendRefreshLine);
    });
    child.stderr.on('data', (chunk) => {
      failedBeforeStart = false;
      String(chunk).split(/\r?\n/).forEach(appendRefreshLine);
    });
    child.on('error', (error) => {
      if (failedBeforeStart && index + 1 < candidates.length) {
        index += 1;
        trySpawn();
        return;
      }
      finishRefresh(null, error.message);
      appendRefreshLine(`[desktop] erreur: ${error.message}`);
    });
    child.on('close', (code) => {
      finishRefresh(code, null);
      appendRefreshLine(`[desktop] refresh terminé avec code ${code}`);
    });
  };
  trySpawn();
}

function startRefresh(mode = 'quick', source = 'all') {
  if (refreshState.running) return false;
  const normalizedMode = REFRESH_MODES.has(mode) ? mode : 'quick';
  const normalizedSource = SIGNAL_SOURCES.has(source) ? source : 'all';
  refreshState.running = true;
  refreshState.mode = normalizedMode;
  refreshState.source = normalizedMode === 'signals' ? normalizedSource : null;
  refreshState.startedAt = new Date().toISOString();
  refreshState.finishedAt = null;
  refreshState.exitCode = null;
  refreshState.error = null;
  spawnPythonRefresh(refreshState.mode, refreshState.source || 'all');
  return true;
}

function cancelRefresh() {
  if (!refreshState.running || !refreshChild) return false;
  appendRefreshLine('[desktop] annulation demandée depuis le cockpit');
  try {
    if (process.platform === 'win32') {
      childProcess.spawn('taskkill', ['/pid', String(refreshChild.pid), '/T', '/F'], { windowsHide: true });
    } else {
      refreshChild.kill('SIGTERM');
    }
  } catch (error) {
    appendRefreshLine(`[desktop] annulation impossible: ${error.message}`);
    return false;
  }
  finishRefresh(null, 'Refresh annulé par l’utilisateur');
  return true;
}

function isBlockedPath(absPath) {
  if (!isWithin(PROJECT_ROOT, absPath)) return true;
  const rel = path.relative(PROJECT_ROOT, absPath).replace(/\\/g, '/');
  const parts = rel.split('/');
  if (parts.includes('.git')) return true;
  if (parts.includes('node_modules')) return true;
  if (rel.startsWith('.winamax_session')) return true;
  if (rel.includes('/.winamax_session')) return true;
  if (parts.some((part) => part.startsWith('.env'))) return true;
  if (parts.some((part) => part.endsWith('.sqlite') || part.endsWith('.db'))) return true;
  return false;
}

function serveStaticFile(res, absPath) {
  if (isBlockedPath(absPath)) {
    textResponse(res, 403, 'Forbidden');
    return;
  }
  fs.stat(absPath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      textResponse(res, 404, 'Not found');
      return;
    }
    const ext = path.extname(absPath).toLowerCase();
    res.writeHead(200, baseHeaders(MIME_TYPES[ext] || 'application/octet-stream'));
    fs.createReadStream(absPath).pipe(res);
  });
}

function routeStatic(pathname, res) {
  if (pathname === '/') {
    res.writeHead(302, { Location: '/desktop/' });
    res.end();
    return;
  }
  if (pathname === '/desktop/' || pathname === '/desktop/index.html') {
    serveStaticFile(res, path.join(DESKTOP_ROOT, 'src', 'renderer', 'index.html'));
    return;
  }
  if (pathname.startsWith('/desktop/')) {
    let rel;
    try {
      rel = decodeURIComponent(pathname.replace(/^\/desktop\//, ''));
    } catch {
      textResponse(res, 400, 'Bad request');
      return;
    }
    const abs = path.resolve(RENDERER_ROOT, rel);
    if (!isWithin(RENDERER_ROOT, abs)) {
      textResponse(res, 403, 'Forbidden');
      return;
    }
    serveStaticFile(res, abs);
    return;
  }

  let rel;
  try {
    rel = decodeURIComponent(pathname.replace(/^\/+/, ''));
  } catch {
    textResponse(res, 400, 'Bad request');
    return;
  }
  const abs = path.resolve(PROJECT_ROOT, rel);
  serveStaticFile(res, abs);
}

async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (url.pathname === '/api/app-info') {
    jsonResponse(res, 200, {
      app: 'Paris-Sportif Desktop',
      version: '0.1.0',
      projectRoot: PROJECT_ROOT,
      desktopRoot: DESKTOP_ROOT,
      calculationMode: 'desktop-jsdom',
      memory: sampleMemoryUsage()
    });
    return;
  }
  if (url.pathname === '/api/engine/analysis') {
    const bankroll = Number(url.searchParams.get('bankroll') || 50);
    jsonResponse(res, 200, engineService.getAnalysis({ bankroll }));
    return;
  }
  if (url.pathname === '/api/engine/reload') {
    if (req.method !== 'POST') {
      jsonResponse(res, 405, { ok: false, error: 'POST required' });
      return;
    }
    engineService.reload();
    jsonResponse(res, 200, { ok: true });
    return;
  }
  if (url.pathname === '/api/data-status') {
    jsonResponse(res, 200, getDataStatus());
    return;
  }
  if (url.pathname === '/api/refresh/status') {
    if (!refreshState.running) loadRefreshHistory();
    jsonResponse(res, 200, refreshState);
    return;
  }
  if (url.pathname === '/api/refresh/start') {
    if (req.method !== 'POST') {
      jsonResponse(res, 405, { ok: false, error: 'POST required' });
      return;
    }
    const requestedMode = url.searchParams.get('mode');
    const mode = REFRESH_MODES.has(requestedMode) ? requestedMode : 'quick';
    const requestedSource = url.searchParams.get('source') || 'all';
    const source = SIGNAL_SOURCES.has(requestedSource) ? requestedSource : 'all';
    const started = startRefresh(mode, source);
    jsonResponse(res, started ? 202 : 200, { ok: true, started, refresh: refreshState });
    return;
  }
  if (url.pathname === '/api/profile/backup') {
    if (req.method !== 'POST') {
      jsonResponse(res, 405, { ok: false, error: 'POST required' });
      return;
    }
    const payload = await readJsonBody(req);
    jsonResponse(res, 200, backupProfile(payload.profile || payload));
    return;
  }
  if (url.pathname === '/api/profile/latest') {
    jsonResponse(res, 200, readLatestProfileBackup());
    return;
  }
  if (url.pathname === '/api/refresh/cancel') {
    if (req.method !== 'POST') {
      jsonResponse(res, 405, { ok: false, error: 'POST required' });
      return;
    }
    const cancelled = cancelRefresh();
    jsonResponse(res, cancelled ? 202 : 200, { ok: true, cancelled, refresh: refreshState });
    return;
  }
  if (url.pathname === '/api/webhook/send' || url.pathname === '/api/webhook/test') {
    if (req.method !== 'POST') {
      jsonResponse(res, 405, { ok: false, error: 'POST required' });
      return;
    }
    const payload = await readJsonBody(req);
    const config = payload.config || {};
    const alert = payload.alert || {};
    if (!config.url) {
      jsonResponse(res, 400, { ok: false, error: 'URL webhook manquante' });
      return;
    }
    if (payload.dryRun || url.pathname === '/api/webhook/test' || isSelfWebhookTarget(config.url, req.headers.host)) {
      jsonResponse(res, 200, { ok: true, dryRun: true, preview: webhookPayload(config, alert) });
      return;
    }
    const result = await postWebhook(config, alert);
    jsonResponse(res, 200, result);
    return;
  }
  jsonResponse(res, 404, { ok: false, error: 'Unknown API route' });
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let url;
      try {
        url = new URL(req.url, `http://${HOST}`);
      } catch {
        textResponse(res, 400, 'Bad request');
        return;
      }
      if (url.pathname.startsWith('/api/')) {
        handleApi(req, res, url).catch((error) => {
          jsonResponse(res, 500, { ok: false, error: error.message || String(error) });
        });
        return;
      }
      routeStatic(url.pathname, res);
    });
    server.on('error', reject);
    server.listen(0, HOST, () => {
      const address = server.address();
      localServer = server;
      resolve({ server, port: address.port });
    });
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#0f172a',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://${HOST}:`)) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.loadURL(`http://${HOST}:${port}/desktop/`);
}

function warmEngineAnalysis() {
  return Promise.resolve().then(() => {
    engineService.getAnalysis({ bankroll: 50 });
  }).catch((error) => {
    appendRefreshLine(`[desktop] préchauffage moteur ignoré: ${error.message}`);
  });
}

app.whenReady().then(async () => {
  const warmup = warmEngineAnalysis();
  const { port } = await startLocalServer();
  await warmup;
  await session.defaultSession.clearCache().catch(() => {});
  await session.defaultSession.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] }).catch(() => {});
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'notifications');
  });
  createWindow(port);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && localServer && localServer.address()) {
    createWindow(localServer.address().port);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  engineService.close();
  if (localServer) localServer.close();
});

const { app, BrowserWindow, shell, session } = require('electron');
const childProcess = require('child_process');
const fs = require('fs');
const http = require('http');
const https = require('https');
const os = require('os');
const path = require('path');
const { URL } = require('url');
const { createLegacyEngineService } = require('./engine/legacy-engine');
const qualityUtils = require('./engine/quality-utils');
const desktopPackage = require('../package.json');

const DESKTOP_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = app.isPackaged ? process.resourcesPath : path.resolve(DESKTOP_ROOT, '..');
const HOST = '127.0.0.1';
const DEFAULT_LOCAL_PORT = 17654;
const LOCAL_PORT = Number(process.env.PARIS_DESKTOP_PORT || DEFAULT_LOCAL_PORT);
const STATE_ROOT = app.isPackaged ? path.join(app.getPath('userData'), 'state') : path.join(DESKTOP_ROOT, 'state');
const REFRESH_HISTORY_PATH = path.join(STATE_ROOT, 'refresh-history.json');
const PROFILE_BACKUP_ROOT = path.join(STATE_ROOT, 'backups');
const DATA_BACKUP_ROOT = path.join(STATE_ROOT, 'data-backups');
const DATA_BACKUP_PATH = path.join(DATA_BACKUP_ROOT, 'data-latest.js');
const AI_WEB_ENRICHMENT_PATH = path.join(STATE_ROOT, 'ai-web-enrichment.json');
const WINAMAX_PROMOS_PATH = path.join(STATE_ROOT, 'winamax-promos.json');
const WEBHOOK_LOG_PATH = path.join(STATE_ROOT, 'webhook-log.jsonl');
const UPDATE_STATUS_PATH = path.join(STATE_ROOT, 'update-status.json');
const BUG_REPORT_ROOT = path.join(STATE_ROOT, 'bug-reports');
const STRESS_REPORT_PATH = path.join(STATE_ROOT, 'stress-report.json');
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
  "img-src 'self' data:",
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
const gotSingleInstanceLock = app.requestSingleInstanceLock();
const engineService = createLegacyEngineService({ projectRoot: PROJECT_ROOT });
const memoryState = {
  rssMb: null,
  heapUsedMb: null,
  updatedAt: null,
  warning: null,
  samples: [],
  startedAt: new Date().toISOString(),
  lastGcAt: null
};
const aiRuntime = {
  day: new Date().toISOString().slice(0, 10),
  calls: 0,
  cache: new Map()
};
const webhookBackoff = new Map();
const webEnrichmentRuntime = {
  fetchTimestamps: []
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

async function readJsonBody(req, maxBytes) {
  const body = await readRequestBody(req, maxBytes);
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

function appendJsonLine(filePath, payload) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
  } catch (error) {
    appendRefreshLine(`[desktop] journal non écrit: ${error.message}`);
  }
}

function readJsonFileDefault(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function cleanupChromiumEphemeralStorage() {
  const userDataRoot = app.getPath('userData');
  const disposableDirs = [
    'Service Worker',
    'Cache',
    'Code Cache',
    'GPUCache',
    'DawnCache',
    'GrShaderCache',
    'ShaderCache'
  ];
  for (const dirName of disposableDirs) {
    const target = path.join(userDataRoot, dirName);
    if (!isWithin(userDataRoot, target) || !fs.existsSync(target)) continue;
    try {
      fs.rmSync(target, { recursive: true, force: true });
    } catch (error) {
      appendRefreshLine(`[desktop] cache Chromium conservé (${dirName}): ${error.message}`);
    }
  }
}

function pdfSafeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/[()\\]/g, '\\$&')
    .slice(0, 120);
}

function makeSimplePdf(title, lines) {
  const safeLines = [title || 'Paris-Sportif', ...(Array.isArray(lines) ? lines : [])]
    .map(pdfSafeText)
    .filter(Boolean)
    .slice(0, 45);
  const content = [
    'BT',
    '/F1 12 Tf',
    '50 790 Td',
    ...safeLines.map((line, index) => `${index === 0 ? '' : '0 -17 Td'}(${line}) Tj`),
    'ET'
  ].join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(content, 'ascii')} >>\nstream\n${content}\nendstream\nendobj\n`
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(body, 'ascii'));
    body += object;
  });
  const xrefAt = Buffer.byteLength(body, 'ascii');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.from(body, 'ascii');
}

function pdfResponse(res, filename, buffer) {
  res.writeHead(200, {
    ...baseHeaders('application/pdf'),
    'Content-Disposition': `attachment; filename="${String(filename || 'rapport.pdf').replace(/"/g, '')}"`
  });
  res.end(buffer);
}

function compactKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]+/g, ':')
    .replace(/^:+|:+$/g, '');
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function cleanPublicUrl(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function compactAiPick(row) {
  return {
    key: row.key || row.trackKey || row.id || `${row.title}:${row.market}:${row.label}`,
    title: row.title,
    sport: row.sport,
    league: row.league,
    market: row.market,
    label: row.label,
    odd: row.odd,
    probability: row.probability,
    edge: row.edge,
    confidence: row.confidence,
    kickoff: row.start,
    reason: row.reason
  };
}

function heuristicAiAssist(task, payload) {
  if (task === 'curate_ultimate') {
    const picks = Array.isArray(payload?.picks) ? payload.picks.map(compactAiPick) : [];
    const sorted = picks.slice().sort((a, b) => Number(b.edge || 0) - Number(a.edge || 0));
    const selected = sorted.find((row) => Number(row.edge || 0) >= 0.07 && Number(row.probability || row.confidence || 0) >= 0.60) || sorted[0] || null;
    return selected
      ? {
          selectedKey: selected.key,
          accepted: true,
          reason: `${selected.market} ${selected.label} ressort comme le meilleur compromis edge, cote et horaire. À garder discipliné : pas de promesse, seulement une value mesurée.`,
          advice: `Focus sur ${selected.title} si la cote reste disponible.`
        }
      : {
          selectedKey: null,
          accepted: false,
          reason: 'Aucun pick ne ressort assez proprement pour devenir le bet ultime.',
          advice: 'Attendre une fenêtre plus nette ou relancer les données.'
        };
  }
  if (task === 'explain_pick') {
    const pick = compactAiPick(payload?.pick || {});
    return {
      text: `${pick.market || 'Marché'} ${pick.label || ''} est retenu parce que l’edge modèle reste positif, la cote est exploitable et le contexte ne signale pas de blocage majeur. La mise doit rester proportionnée au niveau de confiance et à la fraîcheur des données.`
    };
  }
  if (task === 'detect_anomalies') {
    const picks = Array.isArray(payload?.picks) ? payload.picks : [];
    const warnings = picks
      .filter((row) => Number(row.edge || 0) > 0.20 || Number(row.odd || 0) < 1.01)
      .slice(0, 8)
      .map((row) => ({
        key: row.key || row.id || row.title,
        severity: 'warn',
        reason: Number(row.edge || 0) > 0.20 ? 'edge très élevé à revoir' : 'cote impossible'
      }));
    return { warnings };
  }
  return { ok: true, text: 'Analyse heuristique locale disponible.' };
}

async function callAiProvider(config, task, payload) {
  const provider = String(config.provider || '').toLowerCase();
  const apiKey = String(config.apiKey || '').trim();
  const model = String(config.model || '').trim();
  if (!apiKey || !global.fetch) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (aiRuntime.day !== today) {
    aiRuntime.day = today;
    aiRuntime.calls = 0;
  }
  if (aiRuntime.calls >= 50) return { rateLimited: true };
  aiRuntime.calls += 1;
  const system = 'Tu es le moteur discret d’un logiciel de pronostics. Réponds uniquement en JSON valide, factuel, prudent, sans garantie de gain.';
  const user = JSON.stringify({ task, payload }, null, 2).slice(0, 12000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-latest',
          max_tokens: 800,
          system,
          messages: [{ role: 'user', content: user }]
        })
      });
      if (!response.ok) throw new Error(`Anthropic HTTP ${response.status}`);
      const json = await response.json();
      const text = json.content?.map((part) => part.text || '').join('\n') || '{}';
      return JSON.parse(text);
    }
    const endpoint = provider === 'mistral'
      ? 'https://api.mistral.ai/v1/chat/completions'
      : provider === 'ollama'
        ? 'http://127.0.0.1:11434/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(provider === 'ollama' ? {} : { Authorization: `Bearer ${apiKey}` })
      },
      body: JSON.stringify({
        model: model || (provider === 'mistral' ? 'mistral-small-latest' : provider === 'ollama' ? 'llama3.1' : 'gpt-4o-mini'),
        temperature: 0.2,
        response_format: provider === 'ollama' ? undefined : { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });
    if (!response.ok) throw new Error(`AI HTTP ${response.status}`);
    const json = await response.json();
    const text = json.choices?.[0]?.message?.content || '{}';
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

async function aiAssist(config, task, payload) {
  const cacheKey = `${task}:${JSON.stringify(payload || {}).slice(0, 3000)}`;
  const cached = aiRuntime.cache.get(cacheKey);
  if (cached && Date.now() - cached.at < 2 * 60 * 60 * 1000) return { ok: true, cached: true, mode: cached.mode, result: cached.result };
  let result = null;
  let mode = 'heuristic';
  if (config?.enabled && config?.apiKey) {
    try {
      result = await callAiProvider(config, task, payload);
      if (result && !result.rateLimited) mode = 'provider';
    } catch (error) {
      appendRefreshLine(`[ai] fallback heuristique: ${error.message}`);
      result = null;
    }
  }
  if (!result || result.rateLimited) result = heuristicAiAssist(task, payload);
  aiRuntime.cache.set(cacheKey, { at: Date.now(), mode, result });
  return { ok: true, mode, callsToday: aiRuntime.calls, result };
}

function enrichmentStore() {
  const base = readJsonFileDefault(AI_WEB_ENRICHMENT_PATH, {
    version: 1,
    updatedAt: null,
    byKey: {},
    runs: [],
    summary: { today: todayKey(), success: 0, failed: 0 }
  });
  base.byKey = base.byKey && typeof base.byKey === 'object' ? base.byKey : {};
  base.runs = Array.isArray(base.runs) ? base.runs : [];
  const summary = base.summary && typeof base.summary === 'object' ? base.summary : {};
  if (summary.today !== todayKey()) {
    base.summary = { today: todayKey(), success: 0, failed: 0 };
  } else {
    base.summary = {
      today: summary.today,
      success: Number(summary.success || 0),
      failed: Number(summary.failed || 0)
    };
  }
  return base;
}

function enrichmentKeyForPick(pick) {
  return compactKey([
    pick?.key,
    pick?.id,
    pick?.title,
    pick?.market,
    pick?.label,
    pick?.kickoff || pick?.start
  ].filter(Boolean).join(':')) || `pick:${Date.now()}`;
}

function splitMatchTitle(title) {
  const parts = String(title || '').split(/\s+(?:-|vs|v)\s+/i).map((item) => item.trim()).filter(Boolean);
  return {
    home: parts[0] || '',
    away: parts[1] || '',
    query: parts.length >= 2 ? `${parts[0]} ${parts[1]}` : String(title || '').trim()
  };
}

function enrichmentSourcePlan(pick) {
  const teams = splitMatchTitle(pick?.title || pick?.match || '');
  const query = encodeURIComponent([teams.query, pick?.league, pick?.sport].filter(Boolean).join(' '));
  const sources = [
    {
      key: 'espn_search',
      label: 'ESPN',
      url: query ? `https://site.web.api.espn.com/apis/search/v2?query=${query}&region=fr&lang=fr` : null,
      kind: 'news-search'
    },
    {
      key: 'thesportsdb_home',
      label: 'TheSportsDB',
      url: teams.home ? `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teams.home)}` : null,
      kind: 'team-profile'
    },
    {
      key: 'official_winamax',
      label: 'Winamax',
      url: cleanPublicUrl(pick?.winamaxUrl || pick?.match?.winamax?.url),
      kind: 'bookmaker-check'
    }
  ];
  return sources.filter((source) => source.url);
}

async function fetchEnrichmentSource(source, timeoutMs = 10000, rateLimitPerMinute = 5) {
  const started = Date.now();
  if (!global.fetch) {
    return { ...source, status: 'failed', error: 'fetch indisponible', durationMs: 0, checkedAt: new Date().toISOString() };
  }
  const now = Date.now();
  webEnrichmentRuntime.fetchTimestamps = webEnrichmentRuntime.fetchTimestamps.filter((ts) => now - ts < 60 * 1000);
  const limit = Math.max(1, Math.min(10, Number(rateLimitPerMinute || 5) || 5));
  if (webEnrichmentRuntime.fetchTimestamps.length >= limit) {
    return { ...source, status: 'failed', error: `rate limit ${limit} fetches/min`, durationMs: 0, checkedAt: new Date().toISOString() };
  }
  webEnrichmentRuntime.fetchTimestamps.push(now);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(source.url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Paris-Sportif-Desktop/0.1 (+local-user-agent)',
        Accept: source.kind === 'bookmaker-check' ? 'text/html,application/json;q=0.8,*/*;q=0.5' : 'application/json,text/plain,*/*'
      }
    });
    const text = await response.text().catch(() => '');
    const ok = response.ok;
    return {
      ...source,
      status: ok ? 'ok' : 'failed',
      httpStatus: response.status,
      durationMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
      summary: ok
        ? `${source.label} répond et confirme une source consultable.`
        : `${source.label} répond HTTP ${response.status}.`,
      sample: text.slice(0, 240)
    };
  } catch (error) {
    return {
      ...source,
      status: 'failed',
      error: error.name === 'AbortError' ? 'timeout 10s' : error.message,
      durationMs: Date.now() - started,
      checkedAt: new Date().toISOString()
    };
  } finally {
    clearTimeout(timer);
  }
}

function parseWinamaxPromosFromText(text, sourceUrl) {
  const clean = String(text || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const keywords = [
    ['Cotes boostées', /cotes?\s+boost|boost[eé]e/i],
    ['Combo Booster', /combo\s+booster|multibet|multi\s*bet/i],
    ['Bet+', /\bbet\+\b|bet\s+plus/i],
    ['Freebet', /freebet|pari\s+gratuit/i],
    ['Challenge', /challenge|d[eé]fi/i]
  ];
  const promos = [];
  keywords.forEach(([label, pattern]) => {
    const match = clean.match(pattern);
    if (!match) return;
    const index = Math.max(0, match.index || 0);
    promos.push({
      label,
      title: label,
      detail: clean.slice(index, index + 220),
      source: sourceUrl,
      detectedAt: new Date().toISOString()
    });
  });
  return promos.slice(0, 8);
}

async function fetchWinamaxPromos({ force = false } = {}) {
  const cached = readJsonFileDefault(WINAMAX_PROMOS_PATH, null);
  if (!force && cached?.fetchedAt && Date.now() - Date.parse(cached.fetchedAt) < 6 * 60 * 60 * 1000) {
    return { ...cached, cached: true };
  }
  const urls = [
    'https://www.winamax.fr/paris-sportifs/promotions',
    'https://www.winamax.fr/paris-sportifs',
    'https://www.winamax.fr/'
  ];
  const attempts = [];
  let promos = [];
  for (const target of urls) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      if (!global.fetch) throw new Error('fetch indisponible');
      const response = await fetch(target, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Paris-Sportif-Desktop/0.1 (+local-user-agent)',
          Accept: 'text/html,application/json;q=0.8,*/*;q=0.5'
        }
      });
      const text = await response.text();
      attempts.push({
        url: target,
        status: response.ok ? 'ok' : 'failed',
        httpStatus: response.status,
        durationMs: Date.now() - started,
        error: response.ok ? null : `HTTP ${response.status}`
      });
      if (!response.ok) continue;
      promos = parseWinamaxPromosFromText(text.slice(0, 300000), target);
      if (promos.length) break;
    } catch (error) {
      attempts.push({
        url: target,
        status: 'failed',
        httpStatus: null,
        durationMs: Date.now() - started,
        error: error.name === 'AbortError' ? 'timeout 10s' : error.message
      });
    } finally {
      clearTimeout(timer);
    }
  }
  const payload = {
    schema: 'paris-sportif.winamax_promos.v1',
    fetchedAt: new Date().toISOString(),
    source: attempts.find((attempt) => attempt.status === 'ok')?.url || urls[0],
    promos,
    attempts,
    summary: {
      count: promos.length,
      ok: attempts.some((attempt) => attempt.status === 'ok'),
      message: promos.length
        ? `${promos.length} promo(s) Winamax détectée(s)`
        : 'Aucune promo Winamax structurée détectée dans les pages publiques'
    }
  };
  atomicWriteJson(WINAMAX_PROMOS_PATH, payload);
  appendRefreshLine(`[winamax-promos] ${payload.summary.message}`);
  return payload;
}

function sourceValidationFromPick(pick) {
  const validations = [];
  if (pick?.odd > 1) validations.push({ label: 'Cote Winamax', status: 'ok', detail: `@${Number(pick.odd).toFixed(2)}` });
  if (pick?.contextScore != null) validations.push({ label: 'Contexte local', status: 'ok', detail: `${Math.round(Number(pick.contextScore))}/100` });
  if (pick?.kickoff || pick?.start) validations.push({ label: 'Horaire', status: 'ok', detail: String(pick.kickoff || pick.start) });
  if (pick?.market) validations.push({ label: 'Marché', status: 'ok', detail: String(pick.market) });
  return validations;
}

async function webEnrichPick(config, pick, options = {}) {
  const store = enrichmentStore();
  const key = enrichmentKeyForPick(pick);
  const cached = store.byKey[key];
  const ttlMs = Math.max(15, Number(config.cacheMinutes || 120) || 120) * 60 * 1000;
  if (!options.force && cached?.enrichedAt && Date.now() - Date.parse(cached.enrichedAt) < ttlMs) {
    return { ok: true, cached: true, record: cached, summary: store.summary };
  }
  if (config.enabled === false) {
    return { ok: false, skipped: true, reason: 'enrichissement web désactivé', summary: store.summary };
  }
  const plan = enrichmentSourcePlan(pick).slice(0, Math.max(1, Math.min(4, Number(config.maxSources || 3) || 3)));
  const startedAt = new Date().toISOString();
  const sources = options.dryRun
    ? plan.map((source) => ({
        ...source,
        status: 'ok',
        httpStatus: 200,
        checkedAt: startedAt,
        durationMs: 0,
        summary: `${source.label} simulé pour test local.`
      }))
    : await Promise.all(plan.map((source) => fetchEnrichmentSource(source, 10000, config.rateLimitPerMinute)));
  const success = sources.filter((source) => source.status === 'ok').length;
  const failed = sources.length - success;
  const record = {
    key,
    title: pick?.title || pick?.match || '',
    market: pick?.market || '',
    label: pick?.label || '',
    enrichedAt: new Date().toISOString(),
    mode: options.dryRun ? 'dry-run' : 'web',
    status: success ? 'enriched' : 'attempted',
    successfulSources: success,
    failedSources: failed,
    majorChange: false,
    validations: sourceValidationFromPick(pick),
    sources: sources.map((source) => ({
      key: source.key,
      label: source.label,
      kind: source.kind,
      url: source.url,
      status: source.status,
      httpStatus: source.httpStatus || null,
      checkedAt: source.checkedAt,
      durationMs: source.durationMs,
      summary: source.summary || source.error || '-'
    }))
  };
  store.byKey[key] = record;
  store.updatedAt = record.enrichedAt;
  store.runs = [{ at: record.enrichedAt, key, success, failed, title: record.title }, ...store.runs].slice(0, 80);
  store.summary.success += success ? 1 : 0;
  store.summary.failed += success ? 0 : 1;
  atomicWriteJson(AI_WEB_ENRICHMENT_PATH, store);
  appendRefreshLine(`[ai-web] ${record.title || key}: ${success}/${sources.length} source(s) enrichies`);
  return { ok: true, cached: false, record, summary: store.summary };
}

async function checkForUpdates(config = {}) {
  const channel = String(config.channel || 'stable').toLowerCase() === 'beta' ? 'beta' : 'stable';
  const status = {
    checkedAt: new Date().toISOString(),
    channel,
    currentVersion: String(desktopPackage.version || '1.0.0'),
    available: false,
    latestVersion: null,
    releaseName: null,
    releaseNotes: null,
    releaseUrl: null,
    assetName: null,
    assetUrl: null,
    downloadProgress: null,
    readyToInstall: false,
    error: null
  };
  try {
    const pkg = safeJsonFile(path.join(DESKTOP_ROOT, 'package.json')) || {};
    status.currentVersion = String(pkg.version || status.currentVersion);
    if (!global.fetch) throw new Error('fetch indisponible');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const response = await fetch('https://api.github.com/repos/harotensnor/paris-sportif/releases?per_page=20', {
      signal: controller.signal,
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Paris-Sportif-Desktop/0.1'
      }
    });
    clearTimeout(timer);
    if (!response.ok) throw new Error(`GitHub Releases HTTP ${response.status}`);
    const releases = await response.json();
    const release = (Array.isArray(releases) ? releases : []).find((item) => (
      !item.draft &&
      (channel === 'beta' || !item.prerelease)
    ));
    if (release) {
      status.latestVersion = String(release.tag_name || release.name || '').replace(/^v/i, '');
      status.releaseName = release.name || release.tag_name || null;
      status.releaseNotes = String(release.body || '').slice(0, 2000);
      status.releaseUrl = release.html_url || null;
      const assets = Array.isArray(release.assets) ? release.assets : [];
      const installer = assets.find((asset) => /\.exe$/i.test(asset.name || '')) || assets[0] || null;
      status.assetName = installer?.name || null;
      status.assetUrl = installer?.browser_download_url || null;
      status.downloadProgress = status.assetName ? 0 : null;
      status.available = Boolean(status.latestVersion && compareVersions(status.latestVersion, status.currentVersion) > 0);
    }
  } catch (error) {
    status.error = error.name === 'AbortError' ? 'timeout GitHub Releases' : error.message;
  }
  atomicWriteJson(UPDATE_STATUS_PATH, status);
  return status;
}

function compareVersions(a, b) {
  const left = String(a || '').split(/[.-]/).map((part) => Number.parseInt(part, 10)).map((value) => Number.isFinite(value) ? value : 0);
  const right = String(b || '').split(/[.-]/).map((part) => Number.parseInt(part, 10)).map((value) => Number.isFinite(value) ? value : 0);
  const len = Math.max(left.length, right.length, 3);
  for (let index = 0; index < len; index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff) return diff > 0 ? 1 : -1;
  }
  return 0;
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
    const backoffKey = `${target.protocol}//${target.host}`;
    const backoff = webhookBackoff.get(backoffKey);
    if (backoff && Date.now() < backoff.nextAt) {
      reject(new Error(`Webhook en pause ${Math.ceil((backoff.nextAt - Date.now()) / 1000)}s après erreur précédente`));
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
          webhookBackoff.delete(backoffKey);
          const result = { ok: true, statusCode: response.statusCode, body: responseBody.slice(0, 500) };
          appendJsonLine(WEBHOOK_LOG_PATH, {
            at: new Date().toISOString(),
            ok: true,
            type: config.type || 'generic',
            host: target.host,
            statusCode: response.statusCode,
            title: alert.title || 'Paris-Sportif'
          });
          resolve(result);
        } else {
          const previous = webhookBackoff.get(backoffKey) || { failures: 0 };
          const failures = Math.min(6, Number(previous.failures || 0) + 1);
          webhookBackoff.set(backoffKey, { failures, nextAt: Date.now() + (2 ** failures) * 1000 });
          appendJsonLine(WEBHOOK_LOG_PATH, {
            at: new Date().toISOString(),
            ok: false,
            type: config.type || 'generic',
            host: target.host,
            statusCode: response.statusCode,
            title: alert.title || 'Paris-Sportif',
            error: responseBody.slice(0, 200)
          });
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

function webhookRecentLog() {
  try {
    if (!fs.existsSync(WEBHOOK_LOG_PATH)) return [];
    return fs.readFileSync(WEBHOOK_LOG_PATH, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-80)
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function redactBugValue(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.slice(0, 40).map(redactBugValue);
  if (typeof value === 'object') {
    const output = {};
    for (const [key, raw] of Object.entries(value)) {
      if (/api.?key|token|secret|password|webhook|url/i.test(key)) {
        output[key] = raw ? '[redacted]' : raw;
      } else if (/bankroll|stake|pnl|amount|montant/i.test(key)) {
        output[key] = raw == null || raw === '' ? raw : '[present]';
      } else {
        output[key] = redactBugValue(raw);
      }
    }
    return output;
  }
  if (typeof value === 'string') {
    return value
      .replace(/sk-[A-Za-z0-9_-]{12,}/g, '[api-key]')
      .replace(/https?:\/\/[^\s)]+/g, '[url]')
      .slice(0, 5000);
  }
  return value;
}

function bugReportFileName(id) {
  return `${String(id || Date.now()).replace(/[^a-zA-Z0-9_.-]/g, '-')}.json`;
}

function localBugReports(limit = 30) {
  try {
    if (!fs.existsSync(BUG_REPORT_ROOT)) return [];
    return fs.readdirSync(BUG_REPORT_ROOT)
      .filter((name) => name.endsWith('.json'))
      .map((name) => {
        const filePath = path.join(BUG_REPORT_ROOT, name);
        const parsed = readJsonFileDefault(filePath, {});
        return {
          id: parsed.id || name.replace(/\.json$/i, ''),
          createdAt: parsed.createdAt || fs.statSync(filePath).mtime.toISOString(),
          type: parsed.type || 'manual',
          description: parsed.description || parsed.error?.message || '-',
          sent: Boolean(parsed.sent),
          file: name
        };
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, limit);
  } catch {
    return [];
  }
}

async function saveBugReport(payload = {}) {
  const now = new Date().toISOString();
  const report = {
    id: `bug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    app: 'Paris-Sportif Desktop',
    version: String(desktopPackage.version || '1.0.0'),
    platform: {
      os: os.platform(),
      release: os.release(),
      arch: os.arch()
    },
    type: String(payload.type || 'manual').slice(0, 60),
    description: String(payload.description || '').slice(0, 2000),
    error: redactBugValue(payload.error || {}),
    actions: redactBugValue(Array.isArray(payload.actions) ? payload.actions.slice(-25) : []),
    appState: redactBugValue(payload.appState || {}),
    sent: false,
    delivery: null
  };
  fs.mkdirSync(BUG_REPORT_ROOT, { recursive: true });
  const config = payload.config && typeof payload.config === 'object' ? payload.config : {};
  if (config.url) {
    try {
      const sent = await postWebhook(config, {
        title: 'Rapport bug Paris-Sportif',
        message: `${report.type} · ${report.description || report.error?.message || 'Sans description'}\nVersion ${report.version} · ${report.platform.os} ${report.platform.release}`
      });
      report.sent = Boolean(sent.ok);
      report.delivery = redactBugValue(sent);
    } catch (error) {
      report.delivery = { ok: false, error: error.message };
    }
  }
  const file = bugReportFileName(report.id);
  atomicWriteJson(path.join(BUG_REPORT_ROOT, file), report);
  appendRefreshLine(`[bug-report] ${report.type}: ${report.description || report.error?.message || 'rapport local'}`);
  return { ok: true, report: { id: report.id, createdAt: report.createdAt, sent: report.sent, delivery: report.delivery }, reports: localBugReports() };
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
  const now = Date.now();
  if (typeof global.gc === 'function' && (!memoryState.lastGcAt || now - Date.parse(memoryState.lastGcAt) > 60 * 60 * 1000)) {
    try {
      global.gc();
      memoryState.lastGcAt = new Date(now).toISOString();
    } catch {
      // GC explicite facultatif, seulement si Electron est lancé avec --expose-gc.
    }
  }
  memoryState.rssMb = Number((usage.rss / 1024 / 1024).toFixed(1));
  memoryState.heapUsedMb = Number((usage.heapUsed / 1024 / 1024).toFixed(1));
  memoryState.updatedAt = new Date().toISOString();
  memoryState.samples.push({ at: memoryState.updatedAt, rssMb: memoryState.rssMb, heapUsedMb: memoryState.heapUsedMb });
  while (memoryState.samples.length > 24 * 60) memoryState.samples.shift();
  const avg = memoryState.samples.reduce((sum, row) => sum + Number(row.rssMb || 0), 0) / Math.max(1, memoryState.samples.length);
  memoryState.avgRssMb = Number(avg.toFixed(1));
  memoryState.maxRssMb = Number(Math.max(...memoryState.samples.map((row) => Number(row.rssMb || 0)), memoryState.rssMb).toFixed(1));
  memoryState.uptimeMinutes = Number(((Date.now() - Date.parse(memoryState.startedAt)) / 60000).toFixed(1));
  memoryState.warning = memoryState.rssMb > 600 ? `Mémoire haute: ${memoryState.rssMb} MB RSS` : null;
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
    stressReport: readJsonFileDefault(STRESS_REPORT_PATH, null),
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
      version: String(desktopPackage.version || '1.0.0'),
      os: `${os.platform()} ${os.release()} ${os.arch()}`,
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
  if (url.pathname === '/api/winamax/promos') {
    try {
      const force = url.searchParams.get('force') === '1';
      const payload = await fetchWinamaxPromos({ force });
      jsonResponse(res, 200, { ok: true, ...payload });
    } catch (error) {
      jsonResponse(res, 200, {
        ok: false,
        fetchedAt: new Date().toISOString(),
        promos: [],
        summary: { count: 0, ok: false, message: error.message }
      });
    }
    return;
  }
  if (url.pathname === '/api/report/pdf') {
    if (req.method !== 'POST') {
      jsonResponse(res, 405, { ok: false, error: 'POST required' });
      return;
    }
    try {
      const payload = await readJsonBody(req, 128 * 1024);
      const title = String(payload.title || 'Rapport Paris-Sportif');
      const lines = Array.isArray(payload.lines) ? payload.lines : [];
      pdfResponse(res, payload.filename || 'rapport-paris-sportif.pdf', makeSimplePdf(title, lines));
    } catch (error) {
      jsonResponse(res, 400, { ok: false, error: error.message });
    }
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
  if (url.pathname === '/api/ai/assist') {
    if (req.method !== 'POST') {
      jsonResponse(res, 405, { ok: false, error: 'POST required' });
      return;
    }
    try {
      const payload = await readJsonBody(req, 512 * 1024);
      const config = payload.config && typeof payload.config === 'object' ? payload.config : {};
      const task = String(payload.task || 'curate_ultimate');
      const result = await aiAssist(config, task, payload.payload || {});
      jsonResponse(res, 200, result);
    } catch (error) {
      jsonResponse(res, 200, { ok: true, mode: 'heuristic', result: heuristicAiAssist('fallback', {}), error: error.message });
    }
    return;
  }
  if (url.pathname === '/api/ai/enrichment-state') {
    jsonResponse(res, 200, enrichmentStore());
    return;
  }
  if (url.pathname === '/api/ai/enrich') {
    if (req.method !== 'POST') {
      jsonResponse(res, 405, { ok: false, error: 'POST required' });
      return;
    }
    try {
      const payload = await readJsonBody(req, 256 * 1024);
      const config = payload.config && typeof payload.config === 'object' ? payload.config : {};
      const pick = payload.pick && typeof payload.pick === 'object' ? payload.pick : {};
      const result = await webEnrichPick(config, pick, {
        force: Boolean(payload.force),
        dryRun: Boolean(payload.dryRun)
      });
      jsonResponse(res, 200, result);
    } catch (error) {
      jsonResponse(res, 200, { ok: false, error: error.message, summary: enrichmentStore().summary });
    }
    return;
  }
  if (url.pathname === '/api/update/status') {
    jsonResponse(res, 200, readJsonFileDefault(UPDATE_STATUS_PATH, { checkedAt: null, available: false, currentVersion: String(desktopPackage.version || '1.0.0') }));
    return;
  }
  if (url.pathname === '/api/update/check') {
    if (req.method !== 'POST') {
      jsonResponse(res, 405, { ok: false, error: 'POST required' });
      return;
    }
    const payload = await readJsonBody(req).catch(() => ({}));
    const status = await checkForUpdates(payload.config || {});
    jsonResponse(res, 200, { ok: true, status });
    return;
  }
  if (url.pathname === '/api/update/install-next-restart') {
    if (req.method !== 'POST') {
      jsonResponse(res, 405, { ok: false, error: 'POST required' });
      return;
    }
    const previous = readJsonFileDefault(UPDATE_STATUS_PATH, { checkedAt: null, available: false });
    const status = {
      ...previous,
      installOnQuit: Boolean(previous.available),
      installRequestedAt: new Date().toISOString()
    };
    atomicWriteJson(UPDATE_STATUS_PATH, status);
    jsonResponse(res, 200, { ok: true, status });
    return;
  }
  if (url.pathname === '/api/bug-report/list') {
    jsonResponse(res, 200, { ok: true, reports: localBugReports() });
    return;
  }
  if (url.pathname === '/api/bug-report/save') {
    if (req.method !== 'POST') {
      jsonResponse(res, 405, { ok: false, error: 'POST required' });
      return;
    }
    const payload = await readJsonBody(req, 256 * 1024);
    const result = await saveBugReport(payload);
    jsonResponse(res, 200, result);
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
      appendJsonLine(WEBHOOK_LOG_PATH, {
        at: new Date().toISOString(),
        ok: true,
        dryRun: true,
        type: config.type || 'generic',
        title: alert.title || 'Paris-Sportif'
      });
      jsonResponse(res, 200, { ok: true, dryRun: true, preview: webhookPayload(config, alert) });
      return;
    }
    const result = await postWebhook(config, alert);
    jsonResponse(res, 200, result);
    return;
  }
  if (url.pathname === '/api/webhook/log') {
    jsonResponse(res, 200, { ok: true, rows: webhookRecentLog() });
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
    server.listen(LOCAL_PORT, HOST, () => {
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

  const showMainWindow = (reason) => {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isVisible()) return;
    appendRefreshLine(`[desktop] fenêtre affichée (${reason})`);
    mainWindow.show();
    mainWindow.focus();
  };
  const showFallback = setTimeout(() => showMainWindow('fallback démarrage'), 2500);
  mainWindow.once('ready-to-show', () => {
    clearTimeout(showFallback);
    showMainWindow('ready-to-show');
  });
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => showMainWindow('page chargée'), 250);
  });
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    appendRefreshLine(`[desktop] chargement refusé ${errorCode}: ${errorDescription} ${validatedURL || ''}`);
    if (isMainFrame) showMainWindow('erreur chargement visible');
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    appendRefreshLine(`[desktop] renderer arrêté: ${details.reason || 'inconnu'} ${details.exitCode ?? ''}`);
    showMainWindow('renderer arrêté');
  });
  mainWindow.on('unresponsive', () => appendRefreshLine('[desktop] fenêtre non réactive'));
  mainWindow.on('closed', () => {
    clearTimeout(showFallback);
    mainWindow = null;
  });
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
  mainWindow.loadURL(`http://${HOST}:${port}/desktop/`).catch((error) => {
    appendRefreshLine(`[desktop] ouverture écran impossible: ${error.message}`);
    showMainWindow('erreur ouverture visible');
  });
}

function warmEngineAnalysis() {
  return Promise.resolve().then(() => {
    engineService.getAnalysis({ bankroll: 50 });
  }).catch((error) => {
    appendRefreshLine(`[desktop] préchauffage moteur ignoré: ${error.message}`);
  });
}

if (!gotSingleInstanceLock) {
  app.exit(0);
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    cleanupChromiumEphemeralStorage();
    const warmup = warmEngineAnalysis();
    const { port } = await startLocalServer();
    await warmup;
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
    const updateStatus = readJsonFileDefault(UPDATE_STATUS_PATH, null);
    if (updateStatus?.installOnQuit && updateStatus.releaseUrl) {
      shell.openExternal(updateStatus.releaseUrl).catch(() => {});
    }
    engineService.close();
    if (localServer) localServer.close();
  });
}

const fs = require('fs');
const path = require('path');

function parseDataAssignment(text, label = 'data.js') {
  const match = String(text || '').match(/window\.PRONOSTICS_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) throw new Error(`${label} ne contient pas window.PRONOSTICS_DATA`);
  return Function(`"use strict"; return (${match[1]});`)();
}

function readDataAssignment(filePath, label = path.basename(filePath)) {
  return parseDataAssignment(fs.readFileSync(filePath, 'utf8'), label);
}

function readJsonFile(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function sleepSync(ms) {
  const delay = Math.max(0, Number(ms || 0));
  if (!delay) return;
  const signal = new Int32Array(new SharedArrayBuffer(4));
  Atomics.wait(signal, 0, 0, delay);
}

function parisDay(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function rowsForDay(data, day) {
  const days = data && data.days && typeof data.days === 'object' ? data.days : {};
  const raw = days[day];
  return Array.isArray(raw) ? raw : Array.isArray(raw && raw.events) ? raw.events : [];
}

function eventListFromDays(days) {
  const events = [];
  if (!days || typeof days !== 'object') return events;
  Object.entries(days).forEach(([dayKey, value]) => {
    const rows = Array.isArray(value) ? value : Array.isArray(value && value.events) ? value.events : [];
    rows.forEach((event) => events.push({ ...event, __dayKey: dayKey }));
  });
  return events;
}

function winamaxAvailable(event) {
  return Boolean(event && event.winamax && event.winamax.available === true);
}

function winamaxCount(rows) {
  return (Array.isArray(rows) ? rows : []).filter(winamaxAvailable).length;
}

function fallbackTodayWinamax(truth) {
  return Math.max(
    Number(truth && truth.liteTodayWinamax || 0),
    Number(truth && truth.dataTodayWinamax || 0)
  );
}

function hasPrimaryTodayWinamaxLoss(truth) {
  return Number(truth && truth.primaryTodayWinamax || 0) === 0 && fallbackTodayWinamax(truth) > 0;
}

function processAlive(pid) {
  const value = Number(pid);
  if (!Number.isFinite(value) || value <= 0) return false;
  try {
    process.kill(value, 0);
    return true;
  } catch (error) {
    return error && error.code === 'EPERM';
  }
}

function refreshRunningInfo(root) {
  const filePath = path.join(path.resolve(root), 'desktop', 'state', 'refresh-running.json');
  const payload = readJsonFile(filePath, null);
  if (!payload || typeof payload !== 'object') return null;
  const startedMs = Date.parse(payload.startedAt || '');
  const ageMs = Number.isFinite(startedMs) ? Date.now() - startedMs : Infinity;
  const alive = processAlive(payload.pid);
  return {
    ...payload,
    ageMs,
    processAlive: alive,
    stale: !alive || !Number.isFinite(ageMs) || ageMs > 2 * 60 * 60 * 1000
  };
}

function normalizeTodayJson(payload, today) {
  if (Array.isArray(payload)) return { generated_at: null, today, events: payload };
  if (payload && typeof payload === 'object') {
    const events = Array.isArray(payload.events) ? payload.events : [];
    return {
      generated_at: payload.generated_at || null,
      today: payload.today || today,
      events
    };
  }
  return { generated_at: null, today, events: [] };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadRuntimeData(root, { allowFallback = true } = {}) {
  const projectRoot = path.resolve(root);
  const dataPath = path.join(projectRoot, 'data.js');
  const litePath = path.join(projectRoot, 'data_lite.js');
  const todayPath = path.join(projectRoot, 'data_today.json');
  const manifestPath = path.join(projectRoot, 'data_manifest.json');
  const primary = readDataAssignment(dataPath, 'data.js');
  const manifest = readJsonFile(manifestPath, {});
  const lite = fs.existsSync(litePath) ? readDataAssignment(litePath, 'data_lite.js') : null;
  const todayJson = normalizeTodayJson(readJsonFile(todayPath, null), manifest.today || primary.today || parisDay());
  const today = manifest.today || primary.today || todayJson.today || parisDay();
  const fallbackTodayRows = todayJson.events.length ? todayJson.events : rowsForDay(lite, today);
  const truth = {
    today,
    primaryGeneratedAt: primary.generated_at || null,
    liteGeneratedAt: lite && lite.generated_at || null,
    manifestGeneratedAt: manifest.generated_at || null,
    primaryTodayEvents: rowsForDay(primary, today).length,
    primaryTodayWinamax: winamaxCount(rowsForDay(primary, today)),
    liteTodayEvents: rowsForDay(lite, today).length,
    liteTodayWinamax: winamaxCount(rowsForDay(lite, today)),
    dataTodayEvents: todayJson.events.length,
    dataTodayWinamax: winamaxCount(todayJson.events),
    repaired: false,
    repairDays: []
  };

  if (!allowFallback) return { data: primary, primary, lite, todayJson, manifest, truth };

  const repaired = cloneJson(primary);
  repaired.days = repaired.days && typeof repaired.days === 'object' ? repaired.days : {};
  const candidateDays = new Set([
    today,
    ...Object.keys(lite && lite.days || {})
  ]);

  for (const day of candidateDays) {
    const primaryRows = rowsForDay(repaired, day);
    const liteRows = rowsForDay(lite, day);
    const fallbackRows = day === today && todayJson.events.length ? todayJson.events : liteRows;
    if (!fallbackRows.length) continue;
    const primaryWx = winamaxCount(primaryRows);
    const fallbackWx = winamaxCount(fallbackRows);
    if (primaryWx === 0 && fallbackWx > 0) {
      repaired.days[day] = cloneJson(fallbackRows);
      truth.repaired = true;
      truth.repairDays.push({
        day,
        source: day === today && todayJson.events.length ? 'data_today.json' : 'data_lite.js',
        primaryEvents: primaryRows.length,
        fallbackEvents: fallbackRows.length,
        fallbackWinamax: fallbackWx
      });
    }
  }

  if (truth.repaired) {
    repaired._runtime_repair = {
      reason: 'data.js sans Winamax sur un jour disponible dans les snapshots légers',
      today,
      repairDays: truth.repairDays,
      primaryGeneratedAt: truth.primaryGeneratedAt,
      liteGeneratedAt: truth.liteGeneratedAt,
      manifestGeneratedAt: truth.manifestGeneratedAt
    };
  }

  return { data: repaired, primary, lite, todayJson, manifest, truth };
}

function loadRuntimeDataStable(root, options = {}) {
  const {
    waitMs = 90_000,
    delayMs = 1_000,
    ...runtimeOptions
  } = options || {};
  const started = Date.now();
  let runtime = null;
  let running = null;
  do {
    runtime = loadRuntimeData(root, runtimeOptions);
    running = refreshRunningInfo(root);
    if (!hasPrimaryTodayWinamaxLoss(runtime.truth) || !running || running.stale) break;
    sleepSync(delayMs);
  } while (Date.now() - started < waitMs);
  return {
    ...runtime,
    refreshRunning: running,
    waitedMs: Date.now() - started
  };
}

module.exports = {
  eventListFromDays,
  fallbackTodayWinamax,
  hasPrimaryTodayWinamaxLoss,
  loadRuntimeData,
  loadRuntimeDataStable,
  normalizeTodayJson,
  parisDay,
  parseDataAssignment,
  readDataAssignment,
  refreshRunningInfo,
  rowsForDay,
  winamaxAvailable,
  winamaxCount
};

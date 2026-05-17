// Image service for Paris-Sportif Desktop.
// Resolves real player/team/coach images from Wikipedia Commons and caches them
// locally. All HTTP requests live in the main process; the renderer never
// fetches anything from the internet. Failures degrade gracefully and the
// renderer keeps showing the existing SVG initials avatar.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WIKI_API_BASE = 'https://en.wikipedia.org/w/api.php';
const COMMONS_API_BASE = 'https://commons.wikimedia.org/w/api.php';
const WIKIDATA_API_BASE = 'https://www.wikidata.org/w/api.php';
const WIKIDATA_ENTITY_BASE = 'https://www.wikidata.org/wiki/Special:EntityData';
const USER_AGENT = 'ParisSportifDesktop/1.0 (https://github.com/harotensnor/paris-sportif; private use)';
const RATE_LIMIT_PER_MINUTE = 30;

// TTLs (ms)
const LOGO_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PLAYER_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COACH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COACH_LOOKUP_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MISS_TTL_MS = 24 * 60 * 60 * 1000; // 1 day (re-try misses every 24h)

const STATE = {
  cache: new Map(), // in-memory layer (key -> { url, expiresAt, miss })
  inflight: new Map(), // key -> Promise (dedup parallel requests)
  rateWindow: [], // sliding window of fetch timestamps
  cacheDir: null,
};

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    // ignore — fall back to memory-only cache
  }
}

function cacheKey(kind, name, hints = {}) {
  const norm = String(name || '').trim().toLowerCase();
  const hintBits = Object.keys(hints || {})
    .sort()
    .map((k) => `${k}=${String(hints[k] || '').toLowerCase()}`)
    .join('|');
  const raw = `${kind}|${norm}|${hintBits}`;
  return crypto.createHash('sha1').update(raw).digest('hex');
}

function diskPathFor(key) {
  if (!STATE.cacheDir) return null;
  return path.join(STATE.cacheDir, `${key}.json`);
}

function coachDiskPathFor(key) {
  if (!STATE.cacheDir) return null;
  return path.join(STATE.cacheDir, `coach-${key}.json`);
}

function isLocalImageUrl(url) {
  return !url || String(url).startsWith('/api/images/cache/');
}

function trustedRemoteImageUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(String(url));
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase();
    const allowed = host.endsWith('wikimedia.org')
      || host.endsWith('wikipedia.org')
      || host.endsWith('espncdn.com')
      || host.endsWith('espn.com');
    return allowed ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function readDiskCache(key) {
  const fp = diskPathFor(key);
  if (!fp) return null;
  try {
    if (!fs.existsSync(fp)) return null;
    const raw = fs.readFileSync(fp, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.expiresAt === 'number' && parsed.expiresAt > Date.now()) {
      if (!parsed.miss && !isLocalImageUrl(parsed.url)) return null;
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeDiskCache(key, payload) {
  const fp = diskPathFor(key);
  if (!fp) return;
  try {
    const tmp = `${fp}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload), 'utf8');
    fs.renameSync(tmp, fp);
  } catch {
    // ignore: cache write is best-effort
  }
}

function readCoachCache(key) {
  const fp = coachDiskPathFor(key);
  if (!fp) return null;
  try {
    if (!fs.existsSync(fp)) return null;
    const payload = JSON.parse(fs.readFileSync(fp, 'utf8'));
    if (!payload || payload.expiresAt <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function writeCoachCache(key, payload) {
  const fp = coachDiskPathFor(key);
  if (!fp) return;
  try {
    ensureDir(path.dirname(fp));
    const tmp = `${fp}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(payload), 'utf8');
    fs.renameSync(tmp, fp);
  } catch {
    // ignore: coach cache is best-effort
  }
}

function rememberCache(key, url, ttlMs, miss = false) {
  const expiresAt = Date.now() + ttlMs;
  const payload = { url: url || null, expiresAt, miss: Boolean(miss) };
  STATE.cache.set(key, payload);
  // Sprint 44 (P3 audit) : limite mémoire — garde 500 entrées max,
  // évince les plus anciennes (FIFO) pour ne pas grossir indéfiniment.
  if (STATE.cache.size > 500) {
    const firstKey = STATE.cache.keys().next().value;
    if (firstKey) STATE.cache.delete(firstKey);
  }
  writeDiskCache(key, payload);
  return payload;
}

function extensionFromContentType(contentType = '') {
  const ct = String(contentType || '').toLowerCase();
  if (ct.includes('png')) return '.png';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('jpeg') || ct.includes('jpg')) return '.jpg';
  if (ct.includes('gif')) return '.gif';
  return '.jpg';
}

async function fetchImageBuffer(url, { timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (!/^image\//i.test(contentType)) throw new Error(`Content-Type invalide: ${contentType || 'inconnu'}`);
    const arrayBuffer = await response.arrayBuffer();
    return { buffer: Buffer.from(arrayBuffer), contentType };
  } finally {
    clearTimeout(tid);
  }
}

async function cacheRemoteImage(key, remoteUrl) {
  if (!STATE.cacheDir || !remoteUrl) return null;
  try {
    const { buffer, contentType } = await fetchImageBuffer(remoteUrl);
    if (!buffer.length || buffer.length > 3 * 1024 * 1024) return null;
    const ext = extensionFromContentType(contentType);
    const fileName = `${key}${ext}`;
    const filePath = path.join(STATE.cacheDir, fileName);
    const tmp = `${filePath}.${process.pid}.tmp`;
    ensureDir(STATE.cacheDir);
    fs.writeFileSync(tmp, buffer);
    fs.renameSync(tmp, filePath);
    return `/api/images/cache/${fileName}`;
  } catch {
    return null;
  }
}

function rateLimitWait() {
  const now = Date.now();
  STATE.rateWindow = STATE.rateWindow.filter((t) => now - t < 60_000);
  if (STATE.rateWindow.length < RATE_LIMIT_PER_MINUTE) {
    STATE.rateWindow.push(now);
    return Promise.resolve();
  }
  const oldest = STATE.rateWindow[0];
  const waitMs = Math.max(60_000 - (now - oldest), 250);
  return new Promise((resolve) => setTimeout(resolve, waitMs)).then(() => rateLimitWait());
}

async function fetchJson(url, { timeoutMs = 6000 } = {}) {
  await rateLimitWait();
  if (typeof fetch !== 'function') {
    // Node 16-17 fallback — use https module
    return new Promise((resolve, reject) => {
      const https = require('https');
      const req = https.get(
        url,
        { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, timeout: timeoutMs },
        (resp) => {
          let body = '';
          resp.on('data', (chunk) => {
            body += chunk;
          });
          resp.on('end', () => {
            if (resp.statusCode && resp.statusCode >= 400) {
              reject(new Error(`HTTP ${resp.statusCode}`));
              return;
            }
            try {
              resolve(JSON.parse(body));
            } catch (err) {
              reject(err);
            }
          });
        }
      );
      req.on('error', reject);
      req.on('timeout', () => req.destroy(new Error('timeout')));
    });
  }
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(tid);
  }
}

// Use the Wikipedia API to look up a page thumbnail.
async function wikipediaThumbnail(title, { pixelSize = 200 } = {}) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'pageimages|pageprops',
    redirects: '1',
    titles: title,
    piprop: 'thumbnail',
    pithumbsize: String(pixelSize),
  });
  const data = await fetchJson(`${WIKI_API_BASE}?${params.toString()}`);
  const pages = data?.query?.pages;
  if (!Array.isArray(pages) || pages.length === 0) return null;
  const page = pages[0];
  if (page.missing) return null;
  const thumb = page?.thumbnail?.source;
  if (!thumb) return null;
  return thumb;
}

// Wikipedia search for the best matching title given a query.
async function wikipediaSearch(query, options = {}) {
  const params = new URLSearchParams({
    action: 'opensearch',
    format: 'json',
    formatversion: '2',
    limit: '5',
    search: query,
    profile: 'engine_autoselect',
  });
  try {
    const data = await fetchJson(`${WIKI_API_BASE}?${params.toString()}`);
    if (!Array.isArray(data) || data.length < 4) return null;
    const titles = data[1] || [];
    if (!titles.length) return null;
    const filter = typeof options.filter === 'function' ? options.filter : null;
    if (filter) {
      const filtered = titles.find((title) => filter(title));
      if (filtered) return filtered;
    }
    return titles[0];
  } catch {
    return null;
  }
}

function trimWord(word) {
  return String(word || '').trim();
}

function buildTeamQueries(name, hints = {}) {
  const base = trimWord(name);
  if (!base) return [];
  const sport = String(hints.sport || '').toLowerCase();
  const variants = [base];
  if (sport.includes('football') || sport.includes('soccer') || sport.includes('foot')) {
    variants.push(`${base} F.C.`);
    variants.push(`${base} FC`);
    variants.push(`${base} (football)`);
  }
  if (sport.includes('basket')) {
    variants.push(`${base} (basketball)`);
  }
  if (sport.includes('baseball')) {
    variants.push(`${base} (MLB)`);
  }
  if (sport.includes('hockey')) {
    variants.push(`${base} (NHL)`);
  }
  if (sport.includes('tennis')) {
    variants.push(`${base} (tennis)`);
  }
  // Deduplicate while preserving order
  return [...new Set(variants.map(trimWord).filter(Boolean))];
}

function buildPlayerQueries(name, hints = {}) {
  const base = trimWord(name);
  if (!base) return [];
  const variants = [base];
  if (hints.team) variants.push(`${base} ${hints.team}`);
  if (hints.sport) variants.push(`${base} ${hints.sport}`);
  return [...new Set(variants.map(trimWord).filter(Boolean))];
}

function buildCoachQueries(name, hints = {}) {
  const base = trimWord(name);
  if (!base) return [];
  const sport = String(hints.sport || '').toLowerCase();
  const team = trimWord(hints.team || '');
  const variants = [base];
  if (team) variants.push(`${base} ${team}`);
  if (sport) variants.push(`${base} ${sport} coach`);
  if (sport.includes('football') || sport.includes('soccer') || sport.includes('foot')) {
    variants.push(`${base} football manager`);
    variants.push(`${base} football coach`);
  }
  if (sport.includes('basket')) variants.push(`${base} basketball coach`);
  if (sport.includes('baseball')) variants.push(`${base} baseball manager`);
  if (sport.includes('hockey')) variants.push(`${base} ice hockey coach`);
  variants.push(`${base} manager`);
  variants.push(`${base} coach`);
  return [...new Set(variants.map(trimWord).filter(Boolean))];
}

async function resolveImage(kind, name, hints = {}, { pixelSize, ttlMs }) {
  const hinted = trustedRemoteImageUrl(hints.thumbnail || hints.image || hints.photo);
  if (hinted) return hinted;
  const queries = kind === 'team'
    ? buildTeamQueries(name, hints)
    : kind === 'coach'
      ? buildCoachQueries(name, hints)
      : buildPlayerQueries(name, hints);
  for (const query of queries) {
    let title = query;
    try {
      const thumb = await wikipediaThumbnail(title, { pixelSize });
      if (thumb) return thumb;
    } catch {
      // continue to search fallback
    }
    try {
      const searched = await wikipediaSearch(query);
      if (searched && searched !== query) {
        const thumb = await wikipediaThumbnail(searched, { pixelSize });
        if (thumb) return thumb;
      }
    } catch {
      // ignore — next query variant
    }
  }
  return null;
}

async function lookupImage(kind, name, hints = {}) {
  const safeKind = kind === 'team' || kind === 'player' || kind === 'coach' ? kind : 'team';
  const safeName = trimWord(name);
  if (!safeName) return { ok: false, url: null, miss: true };
  const key = cacheKey(safeKind, safeName, hints);

  // 1) In-memory cache
  const mem = STATE.cache.get(key);
  if (mem && mem.expiresAt > Date.now() && (mem.miss || isLocalImageUrl(mem.url))) {
    return { ok: !mem.miss, url: mem.url, miss: Boolean(mem.miss), cached: 'memory' };
  }

  // 2) On-disk cache
  const disk = readDiskCache(key);
  if (disk) {
    STATE.cache.set(key, disk);
    return { ok: !disk.miss, url: disk.url, miss: Boolean(disk.miss), cached: 'disk' };
  }

  // 3) Dedup in-flight requests
  if (STATE.inflight.has(key)) {
    return STATE.inflight.get(key);
  }

  const promise = (async () => {
    try {
      const pixelSize = safeKind === 'team' ? 200 : 160;
      const ttlMs = safeKind === 'team' ? LOGO_TTL_MS : safeKind === 'coach' ? COACH_TTL_MS : PLAYER_TTL_MS;
      const remoteUrl = await resolveImage(safeKind, safeName, hints, { pixelSize, ttlMs });
      const url = await cacheRemoteImage(key, remoteUrl);
      const payload = rememberCache(key, url, url ? ttlMs : MISS_TTL_MS, !url);
      return { ok: Boolean(url), url: payload.url, miss: !url, cached: 'fresh' };
    } catch (err) {
      const payload = rememberCache(key, null, MISS_TTL_MS, true);
      return { ok: false, url: payload.url, miss: true, cached: 'fresh', error: err && err.message };
    } finally {
      STATE.inflight.delete(key);
    }
  })();
  STATE.inflight.set(key, promise);
  return promise;
}

async function lookupBatch(items = []) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const limited = items.slice(0, 30);
  const results = await Promise.all(
    limited.map(async (item) => {
      try {
        const r = await lookupImage(item.kind || 'team', item.name, item.hints || {});
        return { kind: item.kind || 'team', name: item.name, ...r };
      } catch (err) {
        return { kind: item.kind || 'team', name: item.name, ok: false, miss: true, url: null, error: err && err.message };
      }
    })
  );
  return results;
}

function normalizeWikidataTime(value) {
  const raw = String(value || '').replace(/^\+/, '');
  const year = Number(raw.slice(0, 4));
  if (!Number.isFinite(year) || year <= 0) return '';
  return raw.slice(0, 10);
}

function claimRankScore(claim) {
  if (claim?.rank === 'preferred') return 3;
  if (!claim?.qualifiers?.P582) return 2;
  return 1;
}

function claimStartTime(claim) {
  return normalizeWikidataTime(claim?.qualifiers?.P580?.[0]?.datavalue?.value?.time);
}

function pickCurrentCoachClaim(claims = []) {
  const list = Array.isArray(claims) ? claims.filter((claim) => claim?.mainsnak?.datavalue?.value?.id) : [];
  if (!list.length) return null;
  return [...list].sort((a, b) => {
    const rankDelta = claimRankScore(b) - claimRankScore(a);
    if (rankDelta) return rankDelta;
    return String(claimStartTime(b)).localeCompare(String(claimStartTime(a)));
  })[0] || null;
}

async function wikidataSearchEntity(query) {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    format: 'json',
    language: 'en',
    uselang: 'en',
    limit: '5',
    search: query
  });
  const data = await fetchJson(`${WIKIDATA_API_BASE}?${params.toString()}`, { timeoutMs: 7000 });
  const rows = Array.isArray(data?.search) ? data.search : [];
  return rows.find((row) => {
    const text = `${row.label || ''} ${row.description || ''}`.toLowerCase();
    return /club|team|basketball|baseball|hockey|football|soccer|tennis/.test(text);
  }) || rows[0] || null;
}

async function wikidataEntity(id) {
  if (!id) return null;
  const data = await fetchJson(`${WIKIDATA_ENTITY_BASE}/${encodeURIComponent(id)}.json`, { timeoutMs: 7000 });
  return data?.entities?.[id] || null;
}

function wikidataLabel(entity) {
  return entity?.labels?.fr?.value || entity?.labels?.en?.value || entity?.labels?.es?.value || entity?.labels?.it?.value || '';
}

async function lookupCoach(teamName, hints = {}) {
  const safeTeam = trimWord(teamName);
  if (!safeTeam) return { ok: false, miss: true, coach: null };
  const key = cacheKey('coachLookup', safeTeam, hints);
  const disk = readCoachCache(key);
  if (disk) return { ok: !disk.miss, miss: Boolean(disk.miss), coach: disk.coach || null, cached: 'disk' };

  const sport = String(hints.sport || '').toLowerCase();
  const variants = buildTeamQueries(safeTeam, hints);
  if (sport.includes('football') || sport.includes('soccer') || sport.includes('foot')) variants.push(`${safeTeam} football club`);
  variants.push(`${safeTeam} sports team`);
  const queries = [...new Set(variants.map(trimWord).filter(Boolean))].slice(0, 5);

  try {
    for (const query of queries) {
      const team = await wikidataSearchEntity(query);
      if (!team?.id) continue;
      const teamEntity = await wikidataEntity(team.id);
      const coachClaim = pickCurrentCoachClaim(teamEntity?.claims?.P286 || []);
      const coachId = coachClaim?.mainsnak?.datavalue?.value?.id;
      if (!coachId) continue;
      const coachEntity = await wikidataEntity(coachId);
      const coachName = wikidataLabel(coachEntity);
      if (!coachName) continue;
      const coach = {
        name: coachName,
        source: 'Wikidata',
        teamEntityId: team.id,
        coachEntityId: coachId,
        startDate: claimStartTime(coachClaim),
        rank: coachClaim.rank || 'normal'
      };
      const payload = { coach, miss: false, expiresAt: Date.now() + COACH_LOOKUP_TTL_MS };
      writeCoachCache(key, payload);
      return { ok: true, miss: false, coach, cached: 'fresh' };
    }
  } catch (err) {
    const payload = { coach: null, miss: true, expiresAt: Date.now() + MISS_TTL_MS, error: err && err.message };
    writeCoachCache(key, payload);
    return { ok: false, miss: true, coach: null, cached: 'fresh', error: err && err.message };
  }

  const payload = { coach: null, miss: true, expiresAt: Date.now() + MISS_TTL_MS };
  writeCoachCache(key, payload);
  return { ok: false, miss: true, coach: null, cached: 'fresh' };
}

function init({ cacheDir } = {}) {
  if (cacheDir) {
    STATE.cacheDir = cacheDir;
    ensureDir(cacheDir);
  }
}

function statsSnapshot() {
  return {
    memoryEntries: STATE.cache.size,
    inflight: STATE.inflight.size,
    rateWindow: STATE.rateWindow.length,
    cacheDir: STATE.cacheDir,
  };
}

module.exports = {
  init,
  lookupImage,
  lookupBatch,
  lookupCoach,
  statsSnapshot,
};

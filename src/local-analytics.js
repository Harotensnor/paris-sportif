(function localAnalyticsModule() {
  'use strict';

  const VERSION = 'v38.0';
  const TELEMETRY_KEY = 'usage_telemetry';
  const PREFS_KEY = 'usage_telemetry_prefs';
  const USER_KEY = 'usage_telemetry_user_id';
  const MAX_EVENTS = 900;
  const MAX_PICK_OPENS = 500;
  const MAX_VISITS = 300;
  const HEATMAP_COLS = 24;
  const HEATMAP_ROWS = 16;
  const DASHBOARD_MODULES = ['recommendations', 'funnel', 'weekly', 'alerts', 'pages', 'views'];

  const DEFAULT_PREFS = {
    enabled: true,
    dnd: false,
    sports: {},
    tiers: {},
    hours: { from: 7, to: 23 },
    minConfidence: 60,
    smartAlerts: {
      favoriteKickoff: true,
      oddDrop: true,
      highConfidenceLeague: true,
      weeklySummary: true,
      featureDiscovery: true,
    },
    savedViews: [],
    modules: ['recommendations', 'funnel', 'weekly', 'alerts', 'pages'],
  };

  function $(sel, root = document) { return root.querySelector(sel); }
  function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function now() { return Date.now(); }
  function iso(ts = now()) { return new Date(ts).toISOString(); }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function pct(n) {
    const value = Number(n);
    if (!Number.isFinite(value)) return '0%';
    return `${value.toFixed(0)}%`;
  }
  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }
  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  function mergePrefs() {
    const current = readJson(PREFS_KEY, {});
    return {
      ...DEFAULT_PREFS,
      ...current,
      smartAlerts: { ...DEFAULT_PREFS.smartAlerts, ...(current.smartAlerts || {}) },
      hours: { ...DEFAULT_PREFS.hours, ...(current.hours || {}) },
      savedViews: Array.isArray(current.savedViews) ? current.savedViews : [],
      modules: Array.isArray(current.modules) && current.modules.length ? current.modules.filter(m => DASHBOARD_MODULES.includes(m)) : DEFAULT_PREFS.modules,
    };
  }
  function savePrefs(prefs) {
    writeJson(PREFS_KEY, prefs);
  }
  function emptyTelemetry() {
    return {
      schema: 'paris-sportif.usage-telemetry.v1',
      version: VERSION,
      created_at: iso(),
      updated_at: iso(),
      visits: [],
      pageStats: {},
      clicks: [],
      pickOpens: [],
      heatmap: {},
      funnel: {},
      features: {},
      alertsSeen: {},
      ab: {},
      events: [],
    };
  }
  function loadTelemetry() {
    const telemetry = readJson(TELEMETRY_KEY, emptyTelemetry());
    return {
      ...emptyTelemetry(),
      ...telemetry,
      visits: Array.isArray(telemetry.visits) ? telemetry.visits : [],
      clicks: Array.isArray(telemetry.clicks) ? telemetry.clicks : [],
      pickOpens: Array.isArray(telemetry.pickOpens) ? telemetry.pickOpens : [],
      heatmap: telemetry.heatmap && typeof telemetry.heatmap === 'object' ? telemetry.heatmap : {},
      pageStats: telemetry.pageStats && typeof telemetry.pageStats === 'object' ? telemetry.pageStats : {},
      funnel: telemetry.funnel && typeof telemetry.funnel === 'object' ? telemetry.funnel : {},
      features: telemetry.features && typeof telemetry.features === 'object' ? telemetry.features : {},
      alertsSeen: telemetry.alertsSeen && typeof telemetry.alertsSeen === 'object' ? telemetry.alertsSeen : {},
      ab: telemetry.ab && typeof telemetry.ab === 'object' ? telemetry.ab : {},
      events: Array.isArray(telemetry.events) ? telemetry.events : [],
    };
  }
  function saveTelemetry(telemetry) {
    telemetry.updated_at = iso();
    telemetry.version = VERSION;
    telemetry.visits = telemetry.visits.slice(-MAX_VISITS);
    telemetry.clicks = telemetry.clicks.slice(-MAX_EVENTS);
    telemetry.pickOpens = telemetry.pickOpens.slice(-MAX_PICK_OPENS);
    telemetry.events = telemetry.events.slice(-MAX_EVENTS);
    writeJson(TELEMETRY_KEY, telemetry);
  }
  function mutateTelemetry(fn) {
    const prefs = mergePrefs();
    if (!prefs.enabled) return loadTelemetry();
    const telemetry = loadTelemetry();
    fn(telemetry);
    saveTelemetry(telemetry);
    return telemetry;
  }
  function pageSlug() {
    return (location.hash || '#dashboard').slice(1).split('?')[0].split('/')[0] || 'dashboard';
  }
  function userId() {
    let id = localStorage.getItem(USER_KEY);
    if (!id) {
      id = `local-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
      localStorage.setItem(USER_KEY, id);
    }
    return id;
  }
  function hashString(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function abVariant(name) {
    const telemetry = loadTelemetry();
    if (!telemetry.ab[name]) {
      telemetry.ab[name] = hashString(`${userId()}|${name}`) % 2 === 0 ? 'A' : 'B';
      saveTelemetry(telemetry);
    }
    return telemetry.ab[name];
  }
  function recordEvent(type, detail) {
    mutateTelemetry(t => {
      t.events.push({ ts: now(), type, page: pageSlug(), detail: detail || {} });
    });
  }

  let currentPage = pageSlug();
  let pageEnteredAt = now();
  function enterPage(page) {
    currentPage = page;
    pageEnteredAt = now();
    mutateTelemetry(t => {
      t.visits.push({ page, ts: pageEnteredAt });
      t.pageStats[page] = t.pageStats[page] || { visits: 0, ms: 0 };
      t.pageStats[page].visits += 1;
      t.funnel[page] = (t.funnel[page] || 0) + 1;
    });
    renderSoon();
  }
  function leavePage() {
    const elapsed = Math.max(0, now() - pageEnteredAt);
    mutateTelemetry(t => {
      t.pageStats[currentPage] = t.pageStats[currentPage] || { visits: 0, ms: 0 };
      t.pageStats[currentPage].ms += elapsed;
    });
  }
  function labelForElement(el) {
    const text = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim().replace(/\s+/g, ' ');
    return text.slice(0, 64) || el.tagName.toLowerCase();
  }
  function targetKind(el) {
    if (el.closest('.dash-pick-card, .interactive[data-match-id], [data-pick-id]')) return 'pick';
    if (el.closest('.page-btn')) return 'nav';
    if (el.closest('button')) return 'button';
    if (el.closest('a')) return 'link';
    if (el.closest('input,select,textarea')) return 'form';
    return 'other';
  }
  function normalizeTier(text) {
    const s = String(text || '').toLowerCase();
    if (s.includes('sûr') || s.includes('sur') || s.includes('safe') || s.includes('lock')) return 'safe';
    if (s.includes('solide') || s.includes('solid')) return 'solid';
    if (s.includes('value') || s.includes('valeur')) return 'value';
    if (s.includes('big')) return 'big';
    if (s.includes('out')) return 'out';
    return 'standard';
  }
  function inferSport(text, el) {
    const data = el.closest('[data-sport]')?.getAttribute('data-sport');
    if (data) return data.toLowerCase();
    const s = String(text || '').toLowerCase();
    if (s.includes('tennis') || s.includes('atp') || s.includes('wta')) return 'tennis';
    if (s.includes('nba') || s.includes('basket')) return 'basketball';
    if (s.includes('nhl') || s.includes('hockey')) return 'hockey';
    if (s.includes('mlb') || s.includes('baseball')) return 'baseball';
    if (s.includes('rugby')) return 'rugby';
    return 'football';
  }
  function oddRange(odd) {
    if (!Number.isFinite(odd) || odd <= 0) return 'unknown';
    if (odd < 1.5) return '1.30-1.50';
    if (odd < 2) return '1.50-2.00';
    if (odd < 3) return '2.00-3.00';
    if (odd < 5) return '3.00-5.00';
    return '5.00+';
  }
  function extractPickFeatures(el) {
    const card = el.closest('.dash-pick-card, .interactive[data-match-id], [data-pick-id]') || el;
    const text = card.innerText || card.textContent || '';
    const oddMatch = text.match(/(?:@|cote\s*)\s*([1-9]\d?(?:[,.]\d{1,2})?)/i) || text.match(/\b([1-9]\d?[,.]\d{2})\b/);
    const odd = oddMatch ? Number(String(oddMatch[1]).replace(',', '.')) : 0;
    const confMatch = text.match(/(?:conf|confiance|proba)[^\d]{0,10}(\d{1,3})\s*%/i);
    const scoreMatch = text.match(/(?:score)[^\d]{0,10}(\d{1,3})/i);
    const league = card.getAttribute('data-league') || card.querySelector('[data-league]')?.getAttribute('data-league') || '';
    return {
      matchId: card.getAttribute('data-match-id') || card.getAttribute('data-pick-id') || '',
      sport: inferSport(text, card),
      league: league || (text.split('\n').find(line => /ligue|league|nba|nhl|mlb|atp|wta/i.test(line)) || '').slice(0, 48),
      tier: normalizeTier(text),
      odd,
      oddRange: oddRange(odd),
      confidence: confMatch ? Number(confMatch[1]) : 0,
      quality: scoreMatch ? Number(scoreMatch[1]) : 0,
      text: text.replace(/\s+/g, ' ').slice(0, 180),
    };
  }
  function recordClick(event) {
    const prefs = mergePrefs();
    if (!prefs.enabled) return;
    const el = event.target.closest('button,a,input,select,textarea,.dash-pick-card,.interactive,[data-pick-id]');
    if (!el) return;
    const page = pageSlug();
    const x = clamp(Math.floor((event.clientX / Math.max(1, window.innerWidth)) * HEATMAP_COLS), 0, HEATMAP_COLS - 1);
    const y = clamp(Math.floor((event.clientY / Math.max(1, window.innerHeight)) * HEATMAP_ROWS), 0, HEATMAP_ROWS - 1);
    const kind = targetKind(el);
    mutateTelemetry(t => {
      t.clicks.push({ ts: now(), page, kind, label: labelForElement(el), x, y });
      t.heatmap[page] = t.heatmap[page] || {};
      const cell = `${x},${y}`;
      t.heatmap[page][cell] = (t.heatmap[page][cell] || 0) + 1;
    });
    if (kind === 'pick') {
      const features = extractPickFeatures(el);
      mutateTelemetry(t => {
        t.pickOpens.push({ ts: now(), page, ...features });
        t.funnel.modal = (t.funnel.modal || 0) + 1;
      });
      renderSoon();
    }
  }

  function aggregatePrefs(t = loadTelemetry()) {
    const sports = {}, leagues = {}, tiers = {}, odds = {}, hours = {};
    t.pickOpens.forEach(p => {
      sports[p.sport] = (sports[p.sport] || 0) + 1;
      if (p.league) leagues[p.league] = (leagues[p.league] || 0) + 1;
      tiers[p.tier] = (tiers[p.tier] || 0) + 1;
      odds[p.oddRange] = (odds[p.oddRange] || 0) + 1;
      const h = new Date(p.ts).getHours();
      hours[h] = (hours[h] || 0) + 1;
    });
    return { sports, leagues, tiers, odds, hours };
  }
  function topEntries(map, limit = 5) {
    return Object.entries(map || {}).sort((a, b) => b[1] - a[1]).slice(0, limit);
  }
  function topKey(map, fallback = 'aucun') {
    const top = topEntries(map, 1)[0];
    return top ? top[0] : fallback;
  }
  function userSegment(prefs) {
    const risky = (prefs.tiers.big || 0) + (prefs.tiers.out || 0) + (prefs.odds['3.00-5.00'] || 0) + (prefs.odds['5.00+'] || 0);
    const safe = (prefs.tiers.safe || 0) + (prefs.tiers.solid || 0) + (prefs.odds['1.30-1.50'] || 0) + (prefs.odds['1.50-2.00'] || 0);
    if (risky > safe * 1.25) return 'Risqué';
    if (safe > risky * 1.5) return 'Conservatif';
    return 'Équilibré';
  }
  function personalScore(features, prefs) {
    let score = 35;
    score += Math.min(25, (prefs.sports[features.sport] || 0) * 4);
    score += Math.min(15, (prefs.tiers[features.tier] || 0) * 3);
    score += Math.min(15, (prefs.odds[features.oddRange] || 0) * 3);
    if (features.league && prefs.leagues[features.league]) score += Math.min(10, prefs.leagues[features.league] * 2);
    return clamp(Math.round(score), 0, 100);
  }
  function pageRecommendations(t = loadTelemetry()) {
    const stats = Object.entries(t.pageStats || {}).map(([page, data]) => ({
      page,
      visits: data.visits || 0,
      minutes: Math.round((data.ms || 0) / 60000),
    }));
    return stats.sort((a, b) => b.visits - a.visits || b.minutes - a.minutes).slice(0, 10);
  }
  function collectVisiblePicks() {
    return $all('.dash-pick-card, .interactive[data-match-id], [data-pick-id]')
      .slice(0, 80)
      .map(card => ({ card, features: extractPickFeatures(card) }));
  }
  function injectPersonalBadges() {
    const prefs = aggregatePrefs();
    collectVisiblePicks().forEach(({ card, features }) => {
      if (card.querySelector('[data-local-personal-badge]')) return;
      const score = personalScore(features, prefs);
      if (score < 65) return;
      card.setAttribute('data-personal-match', String(score));
      const badge = document.createElement('span');
      badge.setAttribute('data-local-personal-badge', '1');
      badge.textContent = `Match pour toi ${score}%`;
      badge.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin:4px 0;padding:4px 8px;border-radius:999px;background:rgba(16,185,129,.13);border:1px solid rgba(16,185,129,.35);color:var(--accent,#10b981);font-size:11px;font-weight:800;';
      const target = card.querySelector('.dpc-meta,.dash-pick-card__meta,.pick-meta') || card.firstElementChild || card;
      target.prepend(badge);
    });
  }
  function bestPersonalPicks(limit = 4) {
    const prefs = aggregatePrefs();
    return collectVisiblePicks()
      .map(item => ({ ...item, score: personalScore(item.features, prefs) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  function injectStyle() {
    if ($('#local-analytics-style')) return;
    const style = document.createElement('style');
    style.id = 'local-analytics-style';
    style.textContent = `
      .la-card{border:1px solid var(--border,rgba(148,163,184,.25));background:linear-gradient(135deg,rgba(59,130,246,.08),rgba(16,185,129,.08));border-radius:16px;padding:16px;color:var(--text,#e5e7eb);box-shadow:0 14px 36px rgba(0,0,0,.08)}
      .la-card h2,.la-card h3{margin:0 0 8px;letter-spacing:0}.la-card p{margin:0;color:var(--text-dim,#9ca3af);line-height:1.55}
      .la-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:12px}
      .la-mini{border:1px solid var(--border,rgba(148,163,184,.22));background:var(--panel-2,rgba(15,23,42,.66));border-radius:14px;padding:12px}
      .la-hint{margin:14px 0 6px!important;font-size:13px;color:var(--text-dim,#9ca3af)}
      .la-dashboard-modules{display:grid;gap:14px;margin-top:10px}
      .la-module{cursor:grab}.la-module.is-dragging{opacity:.58;outline:2px dashed var(--accent,#10b981)}
      .la-module-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:8px}
      .la-module-actions{display:flex;gap:6px}.la-chip-btn{min-width:36px;min-height:36px;border-radius:999px;border:1px solid var(--border,rgba(148,163,184,.32));background:transparent;color:var(--text,#e5e7eb);cursor:pointer}.la-chip-btn:disabled{opacity:.35;cursor:not-allowed}
      .la-btn{border:1px solid var(--border,rgba(148,163,184,.35));background:var(--brand,#a78bfa);color:#08080a;border-radius:12px;min-height:44px;padding:10px 14px;font-weight:800;cursor:pointer}
      .la-btn.secondary{background:transparent;color:var(--text,#e5e7eb)}.la-btn.danger{background:var(--danger,#fca5a5);color:#16090a}
      .la-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}.la-input{width:100%;min-height:42px;border:1px solid var(--border,rgba(148,163,184,.32));border-radius:10px;background:var(--panel,#111827);color:var(--text,#e5e7eb);padding:9px 10px}
      .la-route{max-width:1180px;margin:0 auto;padding:24px 18px 56px;color:var(--text,#e5e7eb)}.la-route h1{font-size:clamp(30px,4vw,52px);margin:0 0 10px}.la-lead{color:var(--text-dim,#9ca3af);max-width:780px;line-height:1.6}
      .la-funnel{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;align-items:stretch}.la-funnel-step{border:1px solid var(--border,rgba(148,163,184,.22));border-radius:12px;padding:12px;background:var(--panel-2,rgba(15,23,42,.66));position:relative}
      .la-heatmap{display:grid;grid-template-columns:repeat(24,1fr);gap:3px;margin-top:10px}.la-cell{aspect-ratio:1;border-radius:3px;background:#1f2937}.la-cell[data-level="1"]{background:#164e63}.la-cell[data-level="2"]{background:#0f766e}.la-cell[data-level="3"]{background:#10b981}
      .la-table{width:100%;border-collapse:collapse;margin-top:8px}.la-table th,.la-table td{border-bottom:1px solid var(--border,rgba(148,163,184,.2));padding:9px;text-align:left}.la-table th{font-size:12px;color:var(--text-dim,#9ca3af);text-transform:uppercase}
      .la-modal{position:fixed;inset:0;z-index:100002;background:rgba(3,7,18,.72);display:flex;align-items:center;justify-content:center;padding:20px}.la-dialog{width:min(760px,100%);max-height:90vh;overflow:auto;border:1px solid var(--border,rgba(148,163,184,.28));border-radius:18px;background:var(--panel,#0f172a);color:var(--text,#e5e7eb);box-shadow:0 24px 70px rgba(0,0,0,.42)}
      .la-dialog header{position:sticky;top:0;background:inherit;border-bottom:1px solid var(--border,rgba(148,163,184,.22));padding:16px 18px;display:flex;justify-content:space-between;align-items:center}.la-dialog main{padding:18px}.la-dialog footer{padding:14px 18px;border-top:1px solid var(--border,rgba(148,163,184,.22));display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
      .la-close{border:0;background:transparent;color:inherit;font-size:24px;min-width:44px;min-height:44px;cursor:pointer}.la-alert{border-left:4px solid var(--accent,#10b981)}
      .la-discovery{position:fixed;right:18px;bottom:146px;z-index:9997;max-width:280px}.la-quick-nav{display:inline-flex;margin-left:6px}
      @media(max-width:720px){.la-route{padding:18px 12px 48px}.la-funnel{grid-template-columns:1fr}.la-modal{align-items:flex-end;padding:0}.la-dialog{border-radius:18px 18px 0 0;max-height:92vh}.la-heatmap{grid-template-columns:repeat(12,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function closeModal() { $('.la-modal')?.remove(); }
  function showModal(title, body, footer) {
    closeModal();
    const modal = document.createElement('div');
    modal.className = 'la-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <section class="la-dialog" tabindex="-1">
        <header><h2>${esc(title)}</h2><button type="button" class="la-close" data-la-close aria-label="Fermer">×</button></header>
        <div class="la-dialog-body">${body}</div>
        <footer>${footer || '<button type="button" class="la-btn" data-la-close>OK</button>'}</footer>
      </section>
    `;
    modal.addEventListener('click', event => {
      if (event.target === modal || event.target.closest('[data-la-close]')) closeModal();
    });
    document.body.appendChild(modal);
    $('.la-dialog', modal)?.focus();
  }

  function ensureWrap() {
    const main = $('#main-content') || document.body;
    let wrap = $('#local-analytics-route');
    if (!wrap) {
      wrap = document.createElement('section');
      wrap.id = 'local-analytics-route';
      wrap.className = 'la-route';
      main.appendChild(wrap);
    }
    return wrap;
  }
  function setRoute(active) {
    const main = $('#main-content');
    const wrap = ensureWrap();
    if (!main) return;
    Array.from(main.children).forEach(child => {
      if (child === wrap) return;
      if (active) {
        if (!child.dataset.laPrevDisplay) child.dataset.laPrevDisplay = child.style.display || '__empty__';
        child.style.display = 'none';
      } else if (child.dataset.laPrevDisplay) {
        child.style.display = child.dataset.laPrevDisplay === '__empty__' ? '' : child.dataset.laPrevDisplay;
        delete child.dataset.laPrevDisplay;
      }
    });
    wrap.style.display = active ? '' : 'none';
  }
  function funnelHtml(t) {
    const f = t.funnel || {};
    const steps = [
      ['Accueil', f.dashboard || 0],
      ['Tous', f.tous || 0],
      ['Modal', f.modal || 0],
      ['Profil', f.profil || 0],
    ];
    const max = Math.max(1, steps[0][1]);
    return `<div class="la-funnel">${steps.map(([label, count], index) => {
      const rate = index === 0 ? 100 : count / max * 100;
      return `<div class="la-funnel-step"><strong>${esc(label)}</strong><p>${count} passages</p><div style="height:8px;background:rgba(148,163,184,.18);border-radius:99px;overflow:hidden"><i style="display:block;height:100%;width:${clamp(rate, 0, 100)}%;background:var(--accent,#10b981)"></i></div><small>${pct(rate)} du départ</small></div>`;
    }).join('')}</div>`;
  }
  function heatmapHtml(page = pageSlug()) {
    const t = loadTelemetry();
    const map = t.heatmap[page] || {};
    const max = Math.max(1, ...Object.values(map));
    const cells = [];
    for (let y = 0; y < HEATMAP_ROWS; y += 1) {
      for (let x = 0; x < HEATMAP_COLS; x += 1) {
        const count = map[`${x},${y}`] || 0;
        const level = count === 0 ? 0 : count > max * 0.66 ? 3 : count > max * 0.33 ? 2 : 1;
        cells.push(`<span class="la-cell" data-level="${level}" title="${x},${y}: ${count} clics"></span>`);
      }
    }
    return `<div class="la-heatmap" aria-label="Heatmap clics ${esc(page)}">${cells.join('')}</div>`;
  }
  function weeklySummary(t = loadTelemetry()) {
    const since = now() - 7 * 86400000;
    const visits = t.visits.filter(v => v.ts >= since);
    const clicks = t.clicks.filter(c => c.ts >= since);
    const opens = t.pickOpens.filter(p => p.ts >= since);
    const prefs = aggregatePrefs({ ...t, pickOpens: opens });
    return {
      visits: visits.length,
      clicks: clicks.length,
      opens: opens.length,
      topSport: topKey(prefs.sports),
      minutes: Math.round(Object.values(t.pageStats).reduce((sum, p) => sum + (p.ms || 0), 0) / 60000),
    };
  }
  function smartAlerts() {
    const t = loadTelemetry();
    const prefs = aggregatePrefs(t);
    const settings = mergePrefs();
    const alerts = [];
    const topSport = topKey(prefs.sports, '');
    const topLeague = topKey(prefs.leagues, '');
    if (settings.smartAlerts.highConfidenceLeague && topLeague) alerts.push(['Pick haute confiance ligue préférée', `Surveille les picks ${topLeague} avec score 70+.`]);
    if (settings.smartAlerts.favoriteKickoff && topSport) alerts.push(['Match favori dans 30 min', `Alerte locale prête pour les prochains matchs ${topSport}.`]);
    if (settings.smartAlerts.oddDrop) alerts.push(['Cote en mouvement', 'Si une cote chute de 15% sur une équipe souvent ouverte, le badge alerte s’active.']);
    if (settings.smartAlerts.weeklySummary) {
      const week = weeklySummary(t);
      alerts.push(['Récap hebdo', `${week.opens} picks ouverts, top sport ${week.topSport}, ${week.minutes} min cumulées.`]);
    }
    if (settings.smartAlerts.featureDiscovery) alerts.push(['Découverte', 'Combinés et Activity restent proposés si peu utilisés.']);
    return alerts.slice(0, 5);
  }
  function dashboardModuleOrder() {
    const prefs = mergePrefs();
    const seen = new Set();
    const ordered = prefs.modules
      .filter(id => DASHBOARD_MODULES.includes(id) && (id !== 'views' || prefs.savedViews.length > 0) && !seen.has(id) && seen.add(id));
    DASHBOARD_MODULES.forEach(id => {
      if (id === 'views' && prefs.savedViews.length === 0) return;
      if (!seen.has(id)) ordered.push(id);
    });
    return ordered;
  }
  function moduleTitle(id) {
    return ({
      recommendations: 'Picks que tu pourrais aimer',
      funnel: 'Funnel local',
      weekly: 'Récap hebdo',
      alerts: 'Alertes intelligentes',
      pages: 'Pages populaires',
      views: 'Vues sauvegardées',
    })[id] || id;
  }
  function dashboardModuleHtml(id, ctx) {
    if (id === 'recommendations') {
      return `<div class="la-grid">${ctx.picks.length ? ctx.picks.map(p => `<div class="la-mini"><strong>${p.score}% match pour toi</strong><p>${esc(p.features.text)}</p></div>`).join('') : '<div class="la-mini">Ouvre quelques picks pour entraîner les préférences locales.</div>'}</div>`;
    }
    if (id === 'funnel') return funnelHtml(ctx.telemetry);
    if (id === 'weekly') {
      return `<div class="la-grid"><div class="la-mini"><strong>${ctx.week.opens}</strong><p>picks ouverts cette semaine</p></div><div class="la-mini"><strong>${ctx.week.minutes}</strong><p>minutes d'usage</p></div><div class="la-mini"><strong>${esc(ctx.week.topSport)}</strong><p>sport dominant</p></div></div>`;
    }
    if (id === 'alerts') {
      return `<div class="la-grid">${ctx.alerts.map(([title, body]) => `<div class="la-mini la-alert"><strong>${esc(title)}</strong><p>${esc(body)}</p></div>`).join('')}</div><div class="la-actions"><button class="la-btn secondary" data-la-open-prefs>Préférences notifications</button></div>`;
    }
    if (id === 'pages') {
      return `<table class="la-table"><tbody>${ctx.pages.map(p => `<tr><td>${esc(p.page)}</td><td>${p.visits} visites</td><td>${p.minutes} min</td></tr>`).join('')}</tbody></table>`;
    }
    if (id === 'views') {
      const prefs = mergePrefs();
      return `<p>Accès rapide aux filtres sauvegardés localement.</p><div class="la-actions"><button class="la-btn secondary" data-la-save-view>Sauver vue courante</button>${prefs.savedViews.map(v => `<a class="la-btn secondary" href="${esc(v.hash)}">${esc(v.name)}</a>`).join('')}</div>`;
    }
    return '';
  }
  function dashboardModuleCard(id, ctx, index, total) {
    return `
      <section class="la-card la-module" draggable="true" data-la-module="${esc(id)}">
        <div class="la-module-head">
          <h2>${esc(moduleTitle(id))}</h2>
          <div class="la-module-actions">
            <button class="la-chip-btn" data-la-module-move="-1" ${index === 0 ? 'disabled' : ''} aria-label="Monter ${esc(moduleTitle(id))}">↑</button>
            <button class="la-chip-btn" data-la-module-move="1" ${index === total - 1 ? 'disabled' : ''} aria-label="Descendre ${esc(moduleTitle(id))}">↓</button>
          </div>
        </div>
        ${dashboardModuleHtml(id, ctx)}
      </section>
    `;
  }
  function reorderModule(sourceId, targetId) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const prefs = mergePrefs();
    const order = dashboardModuleOrder().filter(id => id !== sourceId);
    const targetIndex = order.indexOf(targetId);
    order.splice(targetIndex < 0 ? order.length : targetIndex, 0, sourceId);
    prefs.modules = order;
    savePrefs(prefs);
    recordEvent('dashboard_modules_reordered', { order });
    renderSoon();
  }
  function moveModule(sourceId, step) {
    const prefs = mergePrefs();
    const order = dashboardModuleOrder();
    const index = order.indexOf(sourceId);
    const next = clamp(index + step, 0, order.length - 1);
    if (index < 0 || next === index) return;
    const [item] = order.splice(index, 1);
    order.splice(next, 0, item);
    prefs.modules = order;
    savePrefs(prefs);
    recordEvent('dashboard_modules_moved', { order });
    renderSoon();
  }
  function renderMyDashboard() {
    setRoute(true);
    const wrap = ensureWrap();
    const t = loadTelemetry();
    const prefs = aggregatePrefs(t);
    const segment = userSegment(prefs);
    const pages = pageRecommendations(t);
    const week = weeklySummary(t);
    const alerts = smartAlerts();
    const picks = bestPersonalPicks(4);
    const order = dashboardModuleOrder();
    const ctx = { telemetry: t, prefs, segment, pages, week, alerts, picks };
    wrap.innerHTML = `
      <h1>Mon dashboard</h1>
      <p class="la-lead">Tableau local basé sur tes visites, clics et picks ouverts. Rien ne sort du navigateur.</p>
      <div class="la-grid">
        <div class="la-mini"><strong>${esc(segment)}</strong><p>segment local</p></div>
        <div class="la-mini"><strong>${week.opens}</strong><p>picks ouverts cette semaine</p></div>
        <div class="la-mini"><strong>${esc(topKey(prefs.sports))}</strong><p>sport favori</p></div>
        <div class="la-mini"><strong>${esc(topKey(prefs.tiers))}</strong><p>tier préféré</p></div>
      </div>
      <p class="la-hint">Modules personnalisables : glisse-dépose, ou utilise les flèches.</p>
      <div class="la-dashboard-modules" data-la-dashboard-modules>
        ${order.map((id, index) => dashboardModuleCard(id, ctx, index, order.length)).join('')}
      </div>
      <section class="la-card" style="margin-top:16px"><h2>Actions</h2><div class="la-actions"><button class="la-btn secondary" data-la-open-prefs>Préférences notifications</button><button class="la-btn secondary" data-la-save-view>Sauver vue Tous</button><button class="la-btn danger" data-la-reset>Reset tout</button></div></section>
    `;
  }
  function renderActivity() {
    setRoute(true);
    const wrap = ensureWrap();
    const t = loadTelemetry();
    const events = [
      ...t.events.map(e => ({ ...e, label: e.type, detailText: JSON.stringify(e.detail || {}) })),
      ...t.clicks.map(c => ({ ts: c.ts, page: c.page, label: `click:${c.kind}`, detailText: c.label })),
      ...t.pickOpens.map(p => ({ ts: p.ts, page: p.page, label: 'pick_open', detailText: p.text })),
    ].sort((a, b) => b.ts - a.ts).slice(0, 200);
    wrap.innerHTML = `
      <h1>Activity</h1>
      <p class="la-lead">Timeline locale des actions. Filtrable, sans collecte distante.</p>
      <input class="la-input" data-la-activity-filter placeholder="Filtrer la timeline">
      <section class="la-card" style="margin-top:16px"><h2>Heatmap clics · ${esc(pageSlug())}</h2>${heatmapHtml(pageSlug())}</section>
      <table class="la-table" data-la-activity-table><tbody>${events.map(e => `<tr><td>${new Date(e.ts).toLocaleString('fr-FR')}</td><td>${esc(e.page || '')}</td><td>${esc(e.label)}</td><td>${esc(e.detailText || '')}</td></tr>`).join('')}</tbody></table>
    `;
  }
  function routeLocal() {
    const slug = pageSlug();
    if (slug === 'my-dashboard') renderMyDashboard();
    else if (slug === 'activity') renderActivity();
    else setRoute(false);
  }

  function injectDashboardPanel() {
    $('[data-la-dashboard-panel]')?.remove();
  }
  function injectAdaptiveNav() {
    const nav = $('#page-nav');
    if (!nav || $('[data-la-adaptive-nav]', nav)) return;
    const t = loadTelemetry();
    const pages = pageRecommendations(t);
    const top = pages.find(p => ['combines', 'buteurs', 'my-dashboard', 'activity'].includes(p.page));
    const btn = document.createElement('a');
    btn.className = 'v36-nav-item la-quick-nav';
    btn.setAttribute('data-la-adaptive-nav', '1');
    btn.href = top ? `#${top.page}` : '#my-dashboard';
    btn.innerHTML = `<span class="v36-nav-ico" aria-hidden="true">◎</span><span class="v36-nav-copy"><strong>Perso</strong><em>${esc(top ? top.page : 'Dashboard local')}</em></span>`;
    nav.appendChild(btn);
  }
  function detailModalOpen() {
    return Boolean(document.getElementById('detail-modal')?.classList.contains('open'));
  }
  function removeDiscoveryCard() {
    $('[data-la-discovery]')?.remove();
  }
  function maybeFeatureDiscovery() {
    if (pageSlug() === 'dashboard') {
      removeDiscoveryCard();
      return;
    }
    if (detailModalOpen() || $('.la-modal')) {
      removeDiscoveryCard();
      return;
    }
    if ($('[data-la-discovery]')) return;
    const t = loadTelemetry();
    const settings = mergePrefs();
    if (!settings.smartAlerts.featureDiscovery) return;
    const combinesSeen = (t.pageStats.combines || {}).visits || 0;
    if (combinesSeen > 0 || (t.alertsSeen.discovery || 0) > now() - 7 * 86400000) return;
    const card = document.createElement('div');
    card.className = 'la-card la-discovery';
    card.setAttribute('data-la-discovery', '1');
    card.innerHTML = `<h3>Découverte</h3><p>Tu n’as pas encore exploré les combinés. Le module peut t’aider à comparer le risque.</p><div class="la-actions"><a class="la-btn" href="#combines">Voir</a><button class="la-btn secondary" data-la-dismiss-discovery>Plus tard</button></div>`;
    document.body.appendChild(card);
    mutateTelemetry(x => { x.alertsSeen.discovery = now(); });
  }
  function watchDetailModal() {
    const detail = document.getElementById('detail-modal');
    if (!detail || detail.dataset.laDiscoveryWatch === '1') return;
    detail.dataset.laDiscoveryWatch = '1';
    new MutationObserver(() => {
      if (detailModalOpen()) removeDiscoveryCard();
    }).observe(detail, { attributes: true, attributeFilter: ['class'] });
  }
  function saveCurrentView() {
    const prefs = mergePrefs();
    const view = {
      id: `view-${Date.now()}`,
      name: `Vue ${new Date().toLocaleDateString('fr-FR')}`,
      page: pageSlug(),
      hash: location.hash || '#dashboard',
      created_at: iso(),
    };
    prefs.savedViews = [view, ...prefs.savedViews.filter(v => v.hash !== view.hash)].slice(0, 8);
    savePrefs(prefs);
    recordEvent('saved_view', view);
    showModal('Vue sauvegardée', `<p>${esc(view.name)} est disponible dans ton dashboard local.</p>`);
  }
  function injectSavedViews() {
    const existing = $all('[data-la-saved-views]');
    if (pageSlug() !== 'tous') {
      existing.forEach(node => node.remove());
      return;
    }
    const wrap = $('#filters');
    if (!wrap) return;
    existing.forEach(node => {
      if (!wrap.contains(node)) node.remove();
    });
    if ($('[data-la-saved-views]', wrap)) return;
    const prefs = mergePrefs();
    if (!prefs.savedViews.length) {
      existing.forEach(node => node.remove());
      return;
    }
    const box = document.createElement('div');
    box.className = 'la-card';
    box.setAttribute('data-la-saved-views', '1');
    box.innerHTML = `<h3>Vues sauvegardées</h3><p>Retrouve vite tes filtres favoris.</p><div class="la-actions"><button class="la-btn secondary" data-la-save-view>Sauver cette vue</button>${prefs.savedViews.map(v => `<a class="la-btn secondary" href="${esc(v.hash)}">${esc(v.name)}</a>`).join('')}</div>`;
    wrap.prepend(box);
  }
  function showPrefs() {
    const prefs = mergePrefs();
    showModal(
      'Préférences notifications locales',
      `
        <div class="la-grid">
          ${Object.entries(prefs.smartAlerts).map(([key, value]) => `<label class="la-mini"><input type="checkbox" data-la-pref-alert="${esc(key)}" ${value ? 'checked' : ''}> ${esc(key)}</label>`).join('')}
          <label class="la-mini">DND <input type="checkbox" data-la-pref-dnd ${prefs.dnd ? 'checked' : ''}></label>
          <label class="la-mini">Heure début <input class="la-input" type="number" min="0" max="23" data-la-pref-from value="${prefs.hours.from}"></label>
          <label class="la-mini">Heure fin <input class="la-input" type="number" min="0" max="23" data-la-pref-to value="${prefs.hours.to}"></label>
        </div>
      `,
      '<button type="button" class="la-btn" data-la-save-prefs>Enregistrer</button><button type="button" class="la-btn secondary" data-la-close>Fermer</button>'
    );
  }
  function savePrefsFromModal(root) {
    const prefs = mergePrefs();
    root.querySelectorAll('[data-la-pref-alert]').forEach(input => {
      prefs.smartAlerts[input.getAttribute('data-la-pref-alert')] = input.checked;
    });
    prefs.dnd = Boolean($('[data-la-pref-dnd]', root)?.checked);
    prefs.hours.from = Number($('[data-la-pref-from]', root)?.value || prefs.hours.from);
    prefs.hours.to = Number($('[data-la-pref-to]', root)?.value || prefs.hours.to);
    savePrefs(prefs);
    closeModal();
    renderSoon();
  }
  function resetAll() {
    showModal(
      'Reset analytics local ?',
      '<p>Supprime usage_telemetry, préférences analytics, vues sauvegardées, alertes et segment local. Les paris suivis restent intacts.</p>',
      '<button type="button" class="la-btn danger" data-la-reset-now>Reset</button><button type="button" class="la-btn secondary" data-la-close>Annuler</button>'
    );
  }
  function doReset() {
    localStorage.removeItem(TELEMETRY_KEY);
    localStorage.removeItem(PREFS_KEY);
    localStorage.removeItem(USER_KEY);
    closeModal();
    enterPage(pageSlug());
    renderSoon();
  }
  function bindEvents() {
    document.addEventListener('click', recordClick, true);
    document.addEventListener('click', event => {
      const el = event.target.closest('button,a,input');
      if (!el) return;
      if (el.matches('[data-la-close]')) closeModal();
      else if (el.matches('[data-la-open-prefs]')) showPrefs();
      else if (el.matches('[data-la-save-prefs]')) savePrefsFromModal(el.closest('.la-modal') || document);
      else if (el.matches('[data-la-save-view]')) saveCurrentView();
      else if (el.matches('[data-la-module-move]')) moveModule(el.closest('[data-la-module]')?.getAttribute('data-la-module'), Number(el.getAttribute('data-la-module-move')));
      else if (el.matches('[data-la-reset]')) resetAll();
      else if (el.matches('[data-la-reset-now]')) doReset();
      else if (el.matches('[data-la-dismiss-discovery]')) el.closest('[data-la-discovery]')?.remove();
    });
    document.addEventListener('dragstart', event => {
      const card = event.target.closest('[data-la-module]');
      if (!card) return;
      event.dataTransfer.setData('text/plain', card.getAttribute('data-la-module'));
      event.dataTransfer.effectAllowed = 'move';
      card.classList.add('is-dragging');
    });
    document.addEventListener('dragend', event => {
      event.target.closest('[data-la-module]')?.classList.remove('is-dragging');
    });
    document.addEventListener('dragover', event => {
      if (event.target.closest('[data-la-module]')) event.preventDefault();
    });
    document.addEventListener('drop', event => {
      const target = event.target.closest('[data-la-module]');
      if (!target) return;
      event.preventDefault();
      reorderModule(event.dataTransfer.getData('text/plain'), target.getAttribute('data-la-module'));
    });
    document.addEventListener('input', event => {
      const input = event.target.closest('[data-la-activity-filter]');
      if (!input) return;
      const needle = input.value.toLowerCase();
      $all('[data-la-activity-table] tr').forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(needle) ? '' : 'none';
      });
    });
    window.addEventListener('hashchange', () => {
      leavePage();
      enterPage(pageSlug());
      routeLocal();
    });
    window.addEventListener('beforeunload', leavePage);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) leavePage();
      else enterPage(pageSlug());
    });
  }
  let renderTimer = null;
  function renderSoon() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderAll, 140);
  }
  function renderAll() {
    injectStyle();
    watchDetailModal();
    routeLocal();
    injectPersonalBadges();
    injectDashboardPanel();
    injectAdaptiveNav();
    injectSavedViews();
    maybeFeatureDiscovery();
  }
  function initAudit() {
    window.__localAnalyticsAudit = function localAnalyticsAudit() {
      return {
        version: VERSION,
        runtimeNetworkCalls: 0,
        storageKey: TELEMETRY_KEY,
        telemetry: loadTelemetry(),
        prefs: mergePrefs(),
        variants: {
          recommendations: abVariant('recommendations'),
          alerts: abVariant('alerts'),
          dashboard: abVariant('dashboard'),
        },
      };
    };
    window.__localAnalytics = {
      version: VERSION,
      recordEvent,
      getTelemetry: loadTelemetry,
      getPreferences: () => aggregatePrefs(loadTelemetry()),
      personalScore,
      showPrefs,
      reset: doReset,
    };
  }
  function init() {
    injectStyle();
    initAudit();
    bindEvents();
    enterPage(pageSlug());
    renderAll();
    const root = $('#main-content') || document.body;
    new MutationObserver(renderSoon).observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

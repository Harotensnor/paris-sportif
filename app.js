
(function() {
  'use strict';

  // ======= State =======
  let currentSport = 'football';
  let currentDate;
  let searchTerm = '';
  let activeFilter = 'all';
  // Advanced filters — persisted across sessions. Applied on top of activeFilter.
  // kellyMin=0 disables. oddMax=0 disables. league=''|code filters by ESPN league_code.
  const ADV_FILTER_KEY = 'advFilters';
  let advFilters = (() => {
    try {
      const raw = JSON.parse(localStorage.getItem(ADV_FILTER_KEY) || '{}');
      return {
        kellyMin: parseFloat(raw.kellyMin) || 0,   // e.g. 0.02 = 2%
        oddMin: parseFloat(raw.oddMin) || 0,        // min decimal odd
        oddMax: parseFloat(raw.oddMax) || 0,        // max decimal odd (0 = no cap)
        league: raw.league || '',                   // league_code or ''
      };
    } catch (e) { return { kellyMin: 0, oddMin: 0, oddMax: 0, league: '' }; }
  })();
  function saveAdvFilters() {
    try { localStorage.setItem(ADV_FILTER_KEY, JSON.stringify(advFilters)); } catch (e) {}
  }
  function advFiltersActive() {
    return advFilters.kellyMin > 0 || advFilters.oddMin > 0 || advFilters.oddMax > 0 || !!advFilters.league;
  }
  let advFiltersOpen = advFiltersActive();
  // Théo only bets on Winamax, so hide everything else by default.
  // Always on: non-Winamax events are stripped at the pipeline level (scripts/patch_winamax.py)
  // so the toggle is moot. Kept as a constant so existing filter gates stay readable.
  const winamaxOnly = true;
  // Current page view: simples (default) | combines | bilan
  // v30 fix Bug 1 : si l'utilisateur arrive via PWA shortcut (manifest)
  // ex pronostics.html#locks → on lit location.hash pour set la bonne page.
  // Sans ce guard, le manifest shortcuts (#locks #bilan #combines) ne
  // marchaient pas — l'utilisateur arrivait toujours sur dashboard.
  const VALID_PAGES = ['dashboard','tous','locks','buteurs','combines','simples','top','historique','bilan','backtest','academie','credibilite','alertes','profil','sante','legal','methodologie','montante-jour','montante-weekend','montante-semaine'];
  // v30 — 'mesparis' retiré : Théo n'enregistre pas ses paris sur le site.
  // v31 — 'legal' + 'methodologie' ajoutés (transparence + dictionnaire des
  // métriques, en réponse à l'audit ChatGPT 2026-04-26).
  function _pageFromHash() {
    try {
      const h = (location.hash || '').replace(/^#/, '').trim();
      return VALID_PAGES.includes(h) ? h : null;
    } catch(e) { return null; }
  }
  let currentPage = _pageFromHash() || localStorage.getItem('currentPage') || 'dashboard';
  // PWA shortcuts arrive via #hash (no hashchange event fires), so sync the
  // hash-derived page to localStorage at boot. Without this, opening
  // /pronostics.html#locks lands on Locks but `currentPage` in localStorage
  // still points to wherever the user was last (or 'dashboard'), so any tab
  // restored from session after the shortcut would jump back.
  try {
    if (_pageFromHash() && localStorage.getItem('currentPage') !== currentPage) {
      localStorage.setItem('currentPage', currentPage);
    }
  } catch(e){}
  // Sync hash → currentPage quand le user revient via back/forward navigation
  window.addEventListener('hashchange', () => {
    const p = _pageFromHash();
    if (p && p !== currentPage) {
      currentPage = p;
      try { localStorage.setItem('currentPage', currentPage); } catch(e){}
      if (typeof applyPageView === 'function') applyPageView();
    }
  });
  // Bankroll for Kelly-criterion stake suggestions. Persists across sessions.
  let bankroll = (() => {
    const v = parseFloat(localStorage.getItem('bankroll'));
    return isFinite(v) && v > 0 ? v : 100;
  })();
  // Clamp to a reasonable range. Returns a sanitized float or null if the input
  // is clearly broken (0, negative, NaN, absurdly large). Applies an `invalid`
  // CSS class to the input and fires a toast with the reason when rejected.
  const BANKROLL_MIN = 1, BANKROLL_MAX = 1_000_000;
  function validateBankroll(raw, inputEl) {
    const v = parseFloat(raw);
    if (!isFinite(v) || v < BANKROLL_MIN) {
      if (inputEl) {
        inputEl.classList.add('invalid');
        inputEl.value = bankroll; // revert
        setTimeout(() => inputEl.classList.remove('invalid'), 1500);
      }
      toast(`Cagnotte invalide — doit être ≥ ${BANKROLL_MIN} €`, 'error');
      return null;
    }
    if (v > BANKROLL_MAX) {
      if (inputEl) {
        inputEl.classList.add('invalid');
        inputEl.value = BANKROLL_MAX;
        setTimeout(() => inputEl.classList.remove('invalid'), 1500);
      }
      toast(`Cagnotte plafonnée à ${BANKROLL_MAX} €`, 'warn');
      return BANKROLL_MAX;
    }
    return v;
  }
  // Minimalist toast. Stacks up to 3, auto-dismisses. Used for validation
  // errors + "pari ajouté" feedback + any action confirmation.
  function toast(msg, kind = 'info') {
    let host = document.getElementById('toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toast-host';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = msg;
    host.appendChild(el);
    // Keep at most 3 toasts
    while (host.children.length > 3) host.removeChild(host.firstChild);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    }, 2800);
  }

  // ======= Personal bets storage (client-only, localStorage) =======
  // Keyed by matchId::pickKey. Each entry:
  //   { matchId, pickLabel, pickKey, odds, stake, placedAt, result: null|'won'|'lost' }
  // Result is computed lazily from the current match state at render time — we
  // don't freeze it, so if data fixes update a final score the bilan corrects
  // itself automatically.
  const MY_BETS_KEY = 'myBets';
  function loadMyBets() {
    try { return JSON.parse(localStorage.getItem(MY_BETS_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }
  function saveMyBets(obj) {
    try { localStorage.setItem(MY_BETS_KEY, JSON.stringify(obj)); } catch (e) {}
  }
  function myBetKey(matchId, pickKey) { return `${matchId}::${pickKey || '1X2'}`; }
  function getMyBet(matchId, pickKey) { return loadMyBets()[myBetKey(matchId, pickKey)] || null; }
  function upsertMyBet(bet) {
    const all = loadMyBets();
    all[myBetKey(bet.matchId, bet.pickKey)] = bet;
    saveMyBets(all);
  }
  function removeMyBet(matchId, pickKey) {
    const all = loadMyBets();
    delete all[myBetKey(matchId, pickKey)];
    saveMyBets(all);
  }

  // ======= Chantier Q — Tracking "nouveaux locks" =======
  // On garde en localStorage la liste des matchId pour lesquels l'utilisateur
  // a déjà été exposé à un lock. Sur la prochaine visite, si un lock apparaît
  // avec un matchId absent du set, on l'étiquette 🆕. Nettoyage : on ne stocke
  // que les matchId qui sont encore actifs (évite l'inflation du set).
  const SEEN_LOCKS_KEY = 'seenLocks';
  function loadSeenLocks() {
    try {
      const raw = JSON.parse(localStorage.getItem(SEEN_LOCKS_KEY) || '[]');
      return new Set(Array.isArray(raw) ? raw.map(String) : []);
    } catch (e) { return new Set(); }
  }
  function saveSeenLocks(set) {
    try { localStorage.setItem(SEEN_LOCKS_KEY, JSON.stringify([...set])); } catch (e) {}
  }
  let _seenLocks = loadSeenLocks();
  function isNewLock(matchId) {
    if (matchId == null) return false;
    return !_seenLocks.has(String(matchId));
  }
  function markLockSeen(matchId) {
    if (matchId == null) return;
    const s = String(matchId);
    if (_seenLocks.has(s)) return;
    _seenLocks.add(s);
    saveSeenLocks(_seenLocks);
  }
  function markAllLocksSeen(matchIds) {
    let changed = false;
    matchIds.forEach(id => {
      const s = String(id);
      if (!_seenLocks.has(s)) { _seenLocks.add(s); changed = true; }
    });
    if (changed) saveSeenLocks(_seenLocks);
    return changed;
  }
  // ======= Chantier X — Historique fiabilité 12h =======
  // On snapshotte la fiabilité de chaque match à chaque refresh dans le
  // localStorage. Sur la fiche détail, on dessine une sparkline de
  // l'évolution 12h. Ça permet à Théo de voir si la fiabilité grimpe
  // (= compos/blessures confirmées dans le bon sens) ou chute (= signal
  // négatif arrivé). Budget : 12h × une obs par refresh ≈ 48 points max.
  const RELIABILITY_HIST_KEY = 'reliability_history_v1';
  const RELIABILITY_HIST_WINDOW_MS = 12 * 60 * 60 * 1000;  // 12h
  const RELIABILITY_HIST_MIN_INTERVAL_MS = 10 * 60 * 1000; // 10 min entre 2 samples
  function loadReliabilityHist() {
    try {
      const raw = JSON.parse(localStorage.getItem(RELIABILITY_HIST_KEY) || '{}');
      return (raw && typeof raw === 'object') ? raw : {};
    } catch (e) { return {}; }
  }
  function saveReliabilityHist(obj) {
    try { localStorage.setItem(RELIABILITY_HIST_KEY, JSON.stringify(obj)); } catch (e) {}
  }
  let _reliabilityHist = loadReliabilityHist();
  function snapshotReliability(matchId, reliability) {
    if (matchId == null || !Number.isFinite(reliability)) return;
    const key = String(matchId);
    const now = Date.now();
    const arr = _reliabilityHist[key] || [];
    // Déduplique : si le dernier sample est < 10min et même valeur à 0.01 près, skip.
    const last = arr[arr.length - 1];
    if (last && (now - last.t) < RELIABILITY_HIST_MIN_INTERVAL_MS
              && Math.abs(last.r - reliability) < 0.01) return;
    arr.push({ t: now, r: Math.round(reliability * 1000) / 1000 });
    // Purge les points > 12h
    const cutoff = now - RELIABILITY_HIST_WINDOW_MS;
    _reliabilityHist[key] = arr.filter(p => p.t >= cutoff);
    saveReliabilityHist(_reliabilityHist);
  }
  function getReliabilityHist(matchId) {
    if (matchId == null) return [];
    return (_reliabilityHist[String(matchId)] || []).slice();
  }
  // GC : purge les matchs qui ne sont plus dans data.js.
  function gcReliabilityHist() {
    try {
      const data = window.PRONOSTICS_DATA;
      if (!data || !data.days) return;
      const liveIds = new Set();
      Object.values(data.days).forEach(arr => (arr || []).forEach(m => { if (m.id != null) liveIds.add(String(m.id)); }));
      let changed = false;
      Object.keys(_reliabilityHist).forEach(id => {
        if (!liveIds.has(id)) { delete _reliabilityHist[id]; changed = true; }
      });
      if (changed) saveReliabilityHist(_reliabilityHist);
    } catch (e) {}
  }

  // GC : on purge les entrées qui ne correspondent plus à un match dans data.js
  // pour que le set ne grossisse pas sans fin au fil des mois.
  function gcSeenLocks() {
    try {
      const data = window.PRONOSTICS_DATA;
      if (!data || !data.days) return;
      const liveIds = new Set();
      Object.values(data.days).forEach(arr => (arr || []).forEach(m => { if (m.id != null) liveIds.add(String(m.id)); }));
      const before = _seenLocks.size;
      _seenLocks = new Set([..._seenLocks].filter(id => liveIds.has(id)));
      if (_seenLocks.size !== before) saveSeenLocks(_seenLocks);
    } catch (e) {}
  }

  // ======= Date helpers =======
  // Extract YYYY-MM-DD from whatever the caller passes us: an ISO string
  // ("2026-04-20T14:30:00Z"), a Date object, or already-short "2026-04-20".
  // Returns '' for anything we can't parse rather than a garbage substring —
  // `.slice(0,10)` on a malformed input silently returned half-garbage which
  // then broke downstream date maths. isoDate() surfaces the problem early.
  function isoDate(d) {
    if (!d) return '';
    if (d instanceof Date) {
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
    const s = String(d);
    // Fast path: already a YYYY-MM-DD prefix
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    // Otherwise try to parse. Invalid → ''.
    const parsed = new Date(s);
    return isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
  }
  function todayISO() {
    const g = window.PRONOSTICS_DATA?.today;
    if (g) return g;
    return isoDate(new Date());
  }
  function addDays(iso, n) {
    const [y,m,d] = iso.split('-').map(Number);
    const dt = new Date(y, m-1, d);
    dt.setDate(dt.getDate() + n);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  }
  function fmtDate(iso) { return new Date(iso + 'T12:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' }); }
  function fmtFullDate(iso) { return new Date(iso + 'T12:00').toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); }
  function fmtTime(d) { if (!d) return '—'; try { return new Date(d).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}); } catch(e) { return '—'; } }
  function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  // Display money in whole euros — no centimes (user request). Keeps internals
  // (stake math, bilan totals) at full precision; only the UI rounds to €.
  // Accepts number or numeric-string; returns "12€" / "-3€" / "0€".
  function fmtEur(v) {
    const n = typeof v === 'number' ? v : parseFloat(v);
    if (!isFinite(n)) return '—';
    return Math.round(n) + '€';
  }
  window.fmtEur = fmtEur;
  function norm(s) { return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
  // HTML-escape a string, then wrap any substring that matches the current
  // `searchTerm` with <mark class="srch-hi">. Operates on the escaped string
  // so we don't have to re-escape the marked output. Accent-insensitive:
  // we scan the normalised text but emit spans pointing into the original.
  function escWithHighlight(s) {
    const str = String(s ?? '');
    const q = (typeof searchTerm === 'string') ? searchTerm.trim() : '';
    if (!q) return esc(str);
    const nStr = norm(str);
    const nQ = norm(q);
    if (!nQ || !nStr.includes(nQ)) return esc(str);
    // Walk the normalised string and emit escaped slices of the ORIGINAL
    // using the same indices — works because NFD + diacritic strip preserves
    // index alignment per base character for Latin scripts.
    let out = '';
    let i = 0;
    while (i < str.length) {
      const idx = nStr.indexOf(nQ, i);
      if (idx < 0) { out += esc(str.slice(i)); break; }
      out += esc(str.slice(i, idx));
      out += `<mark class="srch-hi">${esc(str.slice(idx, idx + nQ.length))}</mark>`;
      i = idx + nQ.length;
    }
    return out;
  }

  // ======= Odds helpers =======
  function mlToDecimal(ml) {
    if (ml === null || ml === undefined || ml === '') return null;
    const n = parseFloat(ml);
    if (isNaN(n)) return null;
    if (n > 0) return +(1 + n/100).toFixed(3);
    return +(1 + 100/Math.abs(n)).toFixed(3);
  }
  function impliedProb(dec) { return dec ? 1/dec : null; }

  // ======= Chantier BB — Kelly criterion =======
  // Fraction of bankroll to stake, given our probability p and decimal odds.
  // Kelly formula: f* = (p*b - q) / b where b = odds - 1, q = 1 - p.
  // Returns 0 if the bet is −EV (f* <= 0). We apply a fractional Kelly
  // multiplier (0.25 by default) because:
  //   - full Kelly maximizes geometric growth BUT is extremely volatile,
  //   - our p is a model estimate, not ground truth — fractional absorbs
  //     the estimation error,
  //   - most pro bettors use 0.25× to 0.5× Kelly in practice.
  // Capped at 10% of bankroll per single bet (safety).
  function kellyFraction(p, decimalOdds, kellyMultiplier = 0.25, capPct = 0.10) {
    if (!(p > 0) || !(p < 1) || !(decimalOdds > 1)) return 0;
    const b = decimalOdds - 1;
    const q = 1 - p;
    const f = (p * b - q) / b;
    if (f <= 0) return 0;
    return Math.min(capPct, f * kellyMultiplier);
  }
  function kellyStake(p, decimalOdds, bankrollValue, multiplier = 0.25) {
    const frac = kellyFraction(p, decimalOdds, multiplier);
    return Math.round(bankrollValue * frac * 100) / 100;
  }

  // ======= Chantier HH — Value bet detector =======
  // Compare our (calibrated) model reliability to what the market implies.
  // edge = reliability − implied(odds).  >= 5pt → value bet.
  // Caveat: reliability is EXCLUDING market in its blend (cf. Chantier F),
  // so this comparison is meaningful (not circular).
  function valueBetEdge(reliability, decimalOdds) {
    if (!(reliability > 0) || !(decimalOdds > 1)) return null;
    const implied = 1 / decimalOdds;
    return reliability - implied;
  }

  /** Parse "BAL -140" style details into favorite moneyline */
  function parseDetailsForFavorite(details) {
    if (!details) return null;
    const m = String(details).match(/([A-Z]{2,4})\s+([+-]\d+(?:\.\d+)?)/);
    if (!m) return null;
    return { abbr: m[1], value: parseFloat(m[2]) };
  }

  /** Return best (highest) decimal odds from multiple providers for each outcome.
   *  Accepts both American-odds shape (homeML/awayML/drawML) and decimal shape
   *  (home/away/draw). */
  function bestOdds(oddsArr, hasDraw) {
    if (!oddsArr || !oddsArr.length) return null;
    let bestH = null, bestD = null, bestA = null;
    let bestSpread = null, bestOU = null;
    oddsArr.forEach(o => {
      // Prefer already-decimal fields if present
      let h = (typeof o.home === 'number') ? o.home : mlToDecimal(o.homeML);
      let d = hasDraw ? ((typeof o.draw === 'number') ? o.draw : mlToDecimal(o.drawML)) : null;
      let a = (typeof o.away === 'number') ? o.away : mlToDecimal(o.awayML);
      if (h && (!bestH || h > bestH)) bestH = h;
      if (d && (!bestD || d > bestD)) bestD = d;
      if (a && (!bestA || a > bestA)) bestA = a;
      if (o.spread != null && bestSpread == null) bestSpread = o.spread;
      if (o.overUnder != null && bestOU == null) bestOU = o.overUnder;
    });
    return { home: bestH, draw: bestD, away: bestA, spread: bestSpread, overUnder: bestOU };
  }

  /** Returns the best available odds for a match, falling back to the
   *  pre-match snapshot when the live odds array is empty (i.e. match is
   *  completed and ESPN has purged its odds). Without this fallback the
   *  model's bilan becomes meaningless — every finished match defaults to
   *  a flat "home 55%" prior, turning the bilan into a home-WR measurement. */
  function getMatchOdds(match, hasDraw) {
    const live = bestOdds(match.odds, hasDraw);
    if (live && (live.home || live.away)) return live;
    const snap = match.odds_snapshot;
    if (snap && (snap.home || snap.away)) {
      return {
        home: snap.home || null,
        draw: hasDraw ? (snap.draw || null) : null,
        away: snap.away || null,
        spread: null,
        overUnder: null,
        _fromSnapshot: true,
      };
    }
    // v30 — Winamax 1N2 markets fallback. ESPN ne fournit pas dodds pour
    // tennis / MMA / certains matchs basket. patch_winamax_markets.py
    // remplit ev.winamax.markets.1n2 = {home, draw?, away}. Sans cette
    // source, tous ces events tombaient sur "no odds" -> predictMatch
    // les filtrait et la page Tous nen affichait aucun (24 tennis = 0
    // dans Tous au lieu detre listes).
    const wxOdds = match.winamax && match.winamax.markets && match.winamax.markets['1n2'];
    if (wxOdds && (wxOdds.home || wxOdds.away)) {
      return {
        home: wxOdds.home || null,
        draw: hasDraw ? (wxOdds.draw || null) : null,
        away: wxOdds.away || null,
        spread: null,
        overUnder: null,
        _fromWinamax: true,
      };
    }
    // Chantier PP — Historical odds fallback.
    // ESPN purges odds once a match is completed, leaving bilan entries without
    // prior data (observed 2026-04-22 : 88 finished matches, 0 with odds → bilan
    // vide). On charge odds_history.jsonl côté client et on indexe par matchId
    // la dernière capture disponible pour que evaluateModelPick ait de quoi
    // travailler sur les matchs historiques.
    const hist = window.__oddsHistory && window.__oddsHistory[match.id];
    if (hist && (hist.home || hist.away)) {
      return {
        home: hist.home || null,
        draw: hasDraw ? (hist.draw || null) : null,
        away: hist.away || null,
        spread: null,
        overUnder: null,
        _fromHistory: true,
      };
    }
    return live;
  }

  // ======= Line movement =======
  // Compare the pre-match odds snapshot to the currently-live odds on the same
  // side. Significant drop (>=4%) = money piling in on our pick (sharp signal).
  // Significant rise = market moving against us (reason to think twice).
  // Returns null if either side is missing or the move is too small to care about.
  //
  // Severity tiers (magnitude-based, direction-agnostic):
  //   soft     4-7%   — noise-adjacent, take as weak hint
  //   notable  7-12%  — meaningful, money or news on one side
  //   sharp    12%+   — strong signal (steam, injury, sharp action)
  function lineMovement(match, pickKey) {
    const snap = match.odds_snapshot;
    if (!snap) return null;
    const live = bestOdds(match.odds, match.sport === 'football');
    if (!live) return null;
    const sideKey = pickKey === '1' ? 'home' : pickKey === '2' ? 'away' : 'draw';
    const before = Number(snap[sideKey]);
    const after = Number(live[sideKey]);
    // Decimal odds are always > 1.0 — anything ≤ 1 means data corruption
    // (ESPN sometimes returns 0, null, or a string like "N/A" we can't parse).
    // Bail rather than produce "Sharp ∞%" badges.
    if (!isFinite(before) || !isFinite(after) || before <= 1 || after <= 1) return null;
    const deltaPct = ((after - before) / before) * 100;
    const abs = Math.abs(deltaPct);
    if (abs < 4) return null;
    const severity = abs >= 12 ? 'sharp' : abs >= 7 ? 'notable' : 'soft';
    return { before, after, deltaPct, severity };
  }

  // NB : l'ancienne fonction `kellyStake` retournant un objet
  // {fraction, stake10, stake100} a été supprimée — elle entrait en conflit
  // avec celle du Chantier BB (ligne 2320) qui renvoie un nombre. Les seuls
  // call sites (hero top-picks, détail match) attendent bien un nombre.
  // ======= Competitor helpers =======
  function getSides(match) {
    const comps = match.competitors || [];
    let home, away;
    for (const c of comps) {
      if (c.home_away === 'home') home = c;
      else if (c.home_away === 'away') away = c;
    }
    if (!home && !away && comps.length >= 2) { home = comps[0]; away = comps[1]; }
    if (!home) home = comps[0];
    if (!away) away = comps[1];
    return { home, away };
  }

  function getRecord(competitor) {
    if (!competitor?.records) return null;
    const pref = competitor.records.find(r => /overall|total/i.test((r.type || r.name || ''))) || competitor.records[0];
    return pref?.summary || null;
  }

  function parseRecord(summary) {
    if (!summary) return null;
    const parts = summary.split('-').map(n => parseInt(n,10)).filter(n => !isNaN(n));
    if (parts.length === 2) return { w: parts[0], d: 0, l: parts[1], games: parts[0]+parts[1] };
    if (parts.length === 3) return { w: parts[0], d: parts[1], l: parts[2], games: parts[0]+parts[1]+parts[2] };
    return null;
  }

  /** Get standings entry for team in league */
  function getStandingsEntry(match, sideCompetitor) {
    if (!sideCompetitor || !match.league_code) return null;
    const std = window.PRONOSTICS_DATA?.standings?.[match.league_code];
    if (!std) return null;
    return std.find(e => String(e.team_id) === String(sideCompetitor.id));
  }

  // ======= Poisson model =======
  function poissonPmf(k, lam) {
    if (lam <= 0) return k === 0 ? 1 : 0;
    // P(X=k) = e^-λ λ^k / k!
    let logp = -lam + k * Math.log(lam);
    for (let i = 2; i <= k; i++) logp -= Math.log(i);
    return Math.exp(logp);
  }
  function poissonProbs(lamH, lamA, maxGoals = 8) {
    let pH = 0, pD = 0, pA = 0;
    for (let h = 0; h <= maxGoals; h++) {
      for (let a = 0; a <= maxGoals; a++) {
        const p = poissonPmf(h, lamH) * poissonPmf(a, lamA);
        if (h > a) pH += p; else if (h === a) pD += p; else pA += p;
      }
    }
    const t = pH + pD + pA;
    return t > 0 ? { pH: pH/t, pD: pD/t, pA: pA/t } : null;
  }

  // v31.7.5 — Dixon-Coles correction τ pour les scores bas nuls/serres.
  // Le Poisson naif independant sous-estime systematiquement les scores
  // 0-0, 1-0, 0-1, 1-1 (corrélation negative empirique en foot).
  // Référence : Dixon & Coles (1997) "Modelling Association Football Scores".
  function _dixonColesTau(h, a, lamH, lamA, rho) {
    if (h === 0 && a === 0) return 1 - lamH * lamA * rho;
    if (h === 0 && a === 1) return 1 + lamH * rho;
    if (h === 1 && a === 0) return 1 + lamA * rho;
    if (h === 1 && a === 1) return 1 - rho;
    return 1;
  }

  // v31.7.16 — ρ Dixon-Coles par ligue. Valeurs empiriques basees sur
  // recalibration sur saisons 2014-2024 (litterature : Constantinou & Fenton
  // 2017, Egidi & Torelli 2021 et al). Avant : ρ=-0.13 hardcoded (moyenne
  // top-5). Maintenant : table par league_code. Fallback -0.13 si ligue
  // inconnue.
  // Plus la ligue est offensive (England, Espagne) → ρ moins negatif.
  // Plus elle est defensive (Italie, France) → ρ plus negatif.
  const DC_RHO_BY_LEAGUE = {
    'eng.1': -0.07,   // Premier League — offensive
    'eng.2': -0.10,   // Championship
    'esp.1': -0.10,   // La Liga
    'esp.2': -0.12,
    'ger.1': -0.09,   // Bundesliga — offensive
    'ger.2': -0.11,
    'ita.1': -0.18,   // Serie A — tactique, defensive
    'ita.2': -0.16,   // Serie B
    'fra.1': -0.15,   // Ligue 1 — moyenne
    'fra.2': -0.14,
    'por.1': -0.14,   // Liga Portugal
    'ned.1': -0.08,   // Eredivisie — tres offensive
    'bel.1': -0.11,
    'sco.1': -0.13,
    'tur.1': -0.13,
    'gre.1': -0.14,
    'rus.1': -0.13,
    'aut.1': -0.11,
    'swi.1': -0.12,
    'nor.1': -0.11,
    'swe.1': -0.11,
    'usa.1': -0.10,   // MLS — moderément offensive
    'mex.1': -0.12,
    'arg.1': -0.15,
    'bra.1': -0.13,
    'jpn.1': -0.12,   // J1 — assez offensive
    'kor.1': -0.13,
    'aus.1': -0.12,
    'col.1': -0.13,
    'chi.1': -0.13,
    'uefa.champions': -0.10,  // Champions League — niveau elite, plus offensif
    'uefa.europa': -0.12,
    'uefa.europa.conf': -0.13,
    'eng.fa': -0.13,  // FA Cup — varie selon teams
  };
  const DC_RHO_DEFAULT = -0.13;
  // v31.7.23 — Override par mesure CI (likelihood max). Quand
  // dixon_coles_rho.json a `source: 'measured'` pour une ligue, on l'utilise
  // au lieu du litterature value. Loader async, fallback gracieux.
  let __dcRhoMeasured = null;
  if (typeof window !== 'undefined') {
    fetch('dixon_coles_rho.json', { cache: 'force-cache' })
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if (j && j.leagues) {
          const map = {};
          for (const [lg, info] of Object.entries(j.leagues)) {
            if (info && info.source === 'measured' && typeof info.rho_used === 'number') {
              map[lg] = info.rho_used;
            }
          }
          __dcRhoMeasured = map;
        }
      })
      .catch(() => { __dcRhoMeasured = {}; });
  }
  function _dixonColesRho(leagueCode) {
    if (!leagueCode) return DC_RHO_DEFAULT;
    const code = String(leagueCode).toLowerCase();
    if (__dcRhoMeasured && __dcRhoMeasured[code] != null) return __dcRhoMeasured[code];
    return DC_RHO_BY_LEAGUE[code] != null ? DC_RHO_BY_LEAGUE[code] : DC_RHO_DEFAULT;
  }

  // Top-k most likely exact scores under (Dixon-Coles ajustement)
  // Poisson(lamH) × Poisson(lamA) × τ(h,a,ρ).
  // Returns [{ home, away, prob }], sorted desc by prob.
  // Used for the "Score exact probable" widget — Chantier 6 + v31.7.5.
  // v31.7.16 — accepte un argument optionnel `leagueCode` pour utiliser
  // ρ specifique. Backward-compatible : appel sans 5e arg utilise default.
  function poissonTopScores(lamH, lamA, k = 3, maxGoals = 6, leagueCode = null) {
    if (!(lamH > 0) || !(lamA > 0)) return [];
    const RHO = _dixonColesRho(leagueCode);
    const scores = [];
    let totalMass = 0;
    for (let h = 0; h <= maxGoals; h++) {
      const pH = poissonPmf(h, lamH);
      for (let a = 0; a <= maxGoals; a++) {
        const pBase = pH * poissonPmf(a, lamA);
        const tau = _dixonColesTau(h, a, lamH, lamA, RHO);
        const p = pBase * tau;
        scores.push({ home: h, away: a, prob: p });
        totalMass += p;
      }
    }
    // Renormalise pour conserver une distribution de prob valide
    // (la correction tau ne preserve pas exactement la masse).
    if (totalMass > 0 && Math.abs(totalMass - 1) > 0.001) {
      for (const s of scores) s.prob /= totalMass;
    }
    scores.sort((a, b) => b.prob - a.prob);
    return scores.slice(0, k);
  }

  // ======= Sport-specific score predictions (Chantier K) =======
  // Expose un champ `pred.scores` aussi pour basket / hockey / tennis.
  // Shape renvoyée : { kind, items: [{label, prob, home, away}], caption }
  //   - kind 'exact'  : foot / hockey (scores exacts X-Y)
  //   - kind 'basket' : 1 seul item {home, away, prob=1, label} = score médian projeté
  //   - kind 'tennis' : scores en sets (2-0 / 2-1 / 3-1 etc.)

  // Avg goals-for / goals-against sur les N derniers matchs (si dispo).
  // Seuil minimum : 2 matchs. On descend à 2 (plutôt que 3) parce qu'en
  // saison régulière finissante / début de playoffs, ESPN ne remonte parfois
  // que 1-2 matchs dans last5 — mieux qu'aucune projection.
  function last5Rates(side) {
    const l5 = side?.last5;
    if (!Array.isArray(l5) || l5.length < 2) return null;
    let gf = 0, ga = 0, n = 0;
    for (const r of l5) {
      const f = Number(r?.gf), a = Number(r?.ga);
      if (!isFinite(f) || !isFinite(a)) continue;
      gf += f; ga += a; n++;
    }
    if (n < 2) return null;
    return { scored: gf / n, conceded: ga / n, sample: n };
  }

  // Hockey : Poisson sur les buts avec petit home advantage.
  function hockeyScorePrediction(match) {
    if (match.sport !== 'hockey') return null;
    const { home, away } = getSides(match);
    const h = last5Rates(home), a = last5Rates(away);
    if (!h || !a) return null;
    // Moyenne de l'attaque d'un côté et de la défense de l'autre, pondéré par un
    // léger home-ice advantage (~1.05x en NHL d'après la littérature).
    const HOME_ADV = 1.05;
    let hScored = h.scored, hConceded = h.conceded;
    let aScored = a.scored, aConceded = a.conceded;
    let captionExtras = [];
    // v31.7.25 — Sport-specific NHL : si nhl_stats dispo, blend last5 (form
    // récente, variance haute) avec season averages (signal stable) à 60/40.
    // Réduit la variance des prédictions sur les derniers matchs.
    if (match.nhl_stats && match.nhl_stats.home_pace != null && match.nhl_stats.away_pace != null) {
      const seasonHomeGf = match.nhl_stats.home_pace;   // fields nommés "pace" mais c'est GF/G
      const seasonAwayGf = match.nhl_stats.away_pace;
      // Pas de season GA exposé directement — on utilise pace de l'adversaire
      // comme proxy (les équipes vs adversaire moyen). Approximation : season GA
      // ≈ ligue average (~2.95 GF/game) ; on blend simplement les GF.
      hScored = 0.6 * h.scored + 0.4 * seasonHomeGf;
      aScored = 0.6 * a.scored + 0.4 * seasonAwayGf;
      captionExtras.push('moyenne saison NHL pondérée');
    }
    // v31.7.25 — Goalie save_pct correction. Si goalie titulaire dispo et
    // sv% différent de la moyenne ligue (~0.905), corriger le lambda adverse.
    // Élite (sv% ≥ 0.92) : réduit lambda adverse de ~12%.
    // Faible (sv% ≤ 0.89) : augmente lambda adverse de ~10%.
    const NHL_AVG_SVPCT = 0.905;
    const tweakByGoalie = (svPct) => {
      if (!isFinite(svPct) || svPct <= 0 || svPct >= 1) return 1;
      // Effective shots faced ≈ 30/game. lambda adverse ≈ 30 * (1 - sv%).
      // Ratio = (1 - sv%) / (1 - avg). Inverse car goalie ↑ = adverse ↓.
      const ratio = (1 - svPct) / (1 - NHL_AVG_SVPCT);
      // Clamp à [0.85, 1.15] pour éviter overcorrection.
      return Math.max(0.85, Math.min(1.15, ratio));
    };
    const homeGoalieFactor = tweakByGoalie(match.nhl_stats?.home_goalie?.save_pct);
    const awayGoalieFactor = tweakByGoalie(match.nhl_stats?.away_goalie?.save_pct);
    if (homeGoalieFactor !== 1 || awayGoalieFactor !== 1) {
      captionExtras.push('correction goalie sv%');
    }
    const lamH = Math.max(0.4, ((hScored + aConceded * awayGoalieFactor) / 2) * HOME_ADV);
    const lamA = Math.max(0.4, ((aScored + hConceded * homeGoalieFactor) / 2) / HOME_ADV);
    const top = poissonTopScores(lamH, lamA, 3, 8);
    if (!top.length) return null;
    const baseCap = `Calculé à partir des buts marqués / encaissés sur les ${Math.min(h.sample, a.sample)} derniers matchs`;
    const extras = captionExtras.length ? ` + ${captionExtras.join(', ')}` : '';
    return {
      kind: 'exact',
      items: top.map(s => ({ home: s.home, away: s.away, prob: s.prob, label: `${s.home}-${s.away}` })),
      caption: `${baseCap}${extras} (modèle statistique).`,
    };
  }

  // Basket : scores exacts sont trop dispersés (variance naturelle ~10 pts par
  // équipe) pour être affichés comme "top-3". On expose plutôt la médiane du
  // score projeté et l'écart estimé, ce qui est bien plus lisible et utilisable
  // pour les paris spread/total.
  function basketScoreProjection(match) {
    if (match.sport !== 'basketball') return null;
    const { home, away } = getSides(match);
    const h = last5Rates(home), a = last5Rates(away);
    if (!h || !a) return null;
    const HOME_ADV = 2.5; // ~2.5 pts d'home-court, consensus NBA.
    const projH = Math.round((h.scored + a.conceded) / 2 + HOME_ADV / 2);
    const projA = Math.round((a.scored + h.conceded) / 2 - HOME_ADV / 2);
    const total = projH + projA;
    const margin = projH - projA;
    return {
      kind: 'basket',
      items: [{ home: projH, away: projA, prob: 1, label: `${projH}-${projA}` }],
      total,
      margin,
      caption: `Projection lissée sur les ${Math.min(h.sample, a.sample)} derniers matchs (± ~8 pts par équipe en NBA).`,
    };
  }

  // Tennis : depuis la proba de victoire de match, on résout la proba set par
  // set (BO3 par défaut, BO5 si tournoi du Grand Chelem masculin) puis on
  // calcule chaque score de sets possible.
  function tennisScorePrediction(match, pMatchHome) {
    if (match.sport !== 'tennis') return null;
    if (!(pMatchHome > 0.02 && pMatchHome < 0.98)) return null;
    const ln = (match.league_name || '').toLowerCase();
    const isSlam = /grand slam|australian open|roland|french open|wimbledon|us open/.test(ln);
    const isATP = /^atp/i.test(match.league_code || '') || /\batp\b/i.test(match.league_name || '');
    const bestOf = (isSlam && isATP) ? 5 : 3;
    // Résolution numérique : trouver p_set tel que P(winMatch | p_set) = pMatchHome.
    // BO3 : p^2 + 2*p^2*(1-p)  = p^2 * (3 - 2p)
    // BO5 : p^3 + 3*p^3*(1-p) + 6*p^3*(1-p)^2 = p^3 * (10 - 15p + 6p^2)
    const matchProbFromSet = (p, bo) => {
      if (bo === 5) return p*p*p * (10 - 15*p + 6*p*p);
      return p*p * (3 - 2*p);
    };
    // Bisection sur [0.02, 0.98].
    let lo = 0.02, hi = 0.98;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const v = matchProbFromSet(mid, bestOf);
      if (v < pMatchHome) lo = mid; else hi = mid;
    }
    const pSetH = (lo + hi) / 2;
    const q = 1 - pSetH;
    let items;
    if (bestOf === 3) {
      items = [
        { home: 2, away: 0, prob: pSetH * pSetH,          label: '2-0' },
        { home: 2, away: 1, prob: 2 * pSetH * pSetH * q,  label: '2-1' },
        { home: 1, away: 2, prob: 2 * q * q * pSetH,      label: '1-2' },
        { home: 0, away: 2, prob: q * q,                  label: '0-2' },
      ];
    } else {
      // BO5 probabilities (order matters: last set is decisive).
      items = [
        { home: 3, away: 0, prob: Math.pow(pSetH, 3),                          label: '3-0' },
        { home: 3, away: 1, prob: 3 * Math.pow(pSetH, 3) * q,                  label: '3-1' },
        { home: 3, away: 2, prob: 6 * Math.pow(pSetH, 3) * q * q,              label: '3-2' },
        { home: 2, away: 3, prob: 6 * Math.pow(q, 3) * pSetH * pSetH,          label: '2-3' },
        { home: 1, away: 3, prob: 3 * Math.pow(q, 3) * pSetH,                  label: '1-3' },
        { home: 0, away: 3, prob: Math.pow(q, 3),                              label: '0-3' },
      ];
    }
    items.sort((a, b) => b.prob - a.prob);
    return {
      kind: 'tennis',
      bestOf,
      items: items.slice(0, bestOf === 3 ? 3 : 4),
      caption: `Probabilités par nombre de sets (best-of-${bestOf}) dérivées de la proba de victoire.`,
    };
  }

  // Secondary markets from the same Poisson model:
  //   Over/Under N.5  —  P(H+A > N) (default line 2.5, Winamax's most-liquid football total)
  //   BTTS            —  P(both teams score ≥ 1) — Poisson independence approximation
  // Returns probabilities in [0,1].
  function poissonMarkets(lamH, lamA, line = 2.5, maxGoals = 10) {
    if (!(lamH > 0) || !(lamA > 0)) return null;
    // P(total <= floor(line)) for Over/Under
    const cutoff = Math.floor(line);
    let pUnder = 0;
    for (let h = 0; h <= maxGoals; h++) {
      for (let a = 0; a <= maxGoals; a++) {
        if (h + a <= cutoff) pUnder += poissonPmf(h, lamH) * poissonPmf(a, lamA);
      }
    }
    pUnder = Math.min(1, Math.max(0, pUnder));
    const pOver = 1 - pUnder;
    // BTTS: independence assumption. In practice correlation is slight; good enough
    // for a directional read and matches industry convention.
    const pBTTSyes = (1 - Math.exp(-lamH)) * (1 - Math.exp(-lamA));
    const pBTTSno = 1 - pBTTSyes;
    return { line, pOver, pUnder, pBTTSyes, pBTTSno };
  }

  // Derive expected goals from standings stats: per-game scoring & conceding rates
  function standingsXG(match, side, league) {
    const s = getStandingsEntry(match, side);
    if (!s) return null;
    const gp = parseInt(s.games, 10);
    const gf = parseFloat(s.gf);
    const ga = parseFloat(s.ga);
    if (!gp || gp < 3 || isNaN(gf) || isNaN(ga)) return null;
    return { scored: gf/gp, conceded: ga/gp };
  }

  function leagueAvgGoals(leagueCode) {
    const std = window.PRONOSTICS_DATA?.standings?.[leagueCode];
    if (!std || !std.length) return null;
    let gf = 0, games = 0;
    std.forEach(s => {
      const gp = parseInt(s.games, 10);
      const sgf = parseFloat(s.gf);
      if (gp && !isNaN(sgf)) { gf += sgf; games += gp; }
    });
    return games > 0 ? gf / games : null;  // avg goals scored per team per match
  }

  // For basket/hockey/other 2-way sports: use the Home vs Road record split.
  // Home team win% from its home record, away team win% from its road record.
  // This is a "Poisson-equivalent" — statistical signal beyond pure odds.
  function homeRoadComponent(match) {
    if (match.sport === 'football') return null; // football uses poissonComponent (w/ GF/GA)
    const { home, away } = getSides(match);
    if (!home || !away) return null;
    const findRec = (comp, type) => {
      if (!comp?.records) return null;
      const rec = comp.records.find(r => {
        const s = (r.type || r.name || '').toLowerCase();
        return type === 'home' ? (s === 'home') : (s === 'road' || s === 'away');
      });
      return rec ? parseRecord(rec.summary) : null;
    };
    const hHome = findRec(home, 'home');
    const aRoad = findRec(away, 'road');
    if (!hHome || !aRoad || hHome.games < 5 || aRoad.games < 5) {
      // fall back to overall × HOME_ADV if split unavailable
      const hOverall = parseRecord(getRecord(home));
      const aOverall = parseRecord(getRecord(away));
      if (!hOverall || !aOverall || hOverall.games < 5 || aOverall.games < 5) return null;
      const wr = r => (r.w + r.d * 0.5) / Math.max(r.games, 1);
      const hWR = wr(hOverall), aWR = wr(aOverall);
      const HOME_ADV = match.sport === 'hockey' ? 1.08 : 1.12; // mild bump
      const hAdj = Math.min(0.95, hWR * HOME_ADV);
      const aAdj = aWR;
      const sum = hAdj + aAdj;
      if (sum <= 0) return null;
      return { pH: hAdj / sum, pD: 0, pA: aAdj / sum };
    }
    const wr = r => (r.w + r.d * 0.5) / Math.max(r.games, 1);
    const hSplit = wr(hHome);
    const aSplit = wr(aRoad);
    const sum = hSplit + aSplit;
    if (sum <= 0) return null;
    return { pH: hSplit / sum, pD: 0, pA: aSplit / sum };
  }

  function poissonComponent(match) {
    if (match.sport !== 'football') return null;
    const { home, away } = getSides(match);
    if (!home || !away) return null;
    const hX = standingsXG(match, home);
    const aX = standingsXG(match, away);
    if (!hX || !aX) return null;
    const lgAvg = leagueAvgGoals(match.league_code);
    if (!lgAvg || lgAvg <= 0) return null;
    // Attack/defense strengths relative to league average
    const HOME_ADV = 1.25;
    const hAtt = hX.scored / lgAvg;
    const aAtt = aX.scored / lgAvg;
    const hDef = hX.conceded / lgAvg;
    const aDef = aX.conceded / lgAvg;
    const lamH = Math.max(0.2, hAtt * aDef * lgAvg * HOME_ADV);
    const lamA = Math.max(0.2, aAtt * hDef * lgAvg / HOME_ADV);
    const probs = poissonProbs(lamH, lamA);
    if (!probs) return null;
    return { ...probs, lamH, lamA };
  }

  // ======= Fixture congestion (Chantier 10) =======
  // Builds a team_name → sorted[match_timestamps_utc] map over the entire
  // data.js window (~3d past + ~10d future). Used by predictMatch to detect
  // teams playing 3+ games in the 7 days before a match and apply a small
  // probability penalty. All client-side — no new data source needed.
  //
  // Empirical football research: a team playing their 3rd match in 7 days
  // scores ~0.10-0.15 fewer goals per game and has ~3-5% lower win probability
  // vs a rested opponent (UEFA Champions League + Premier League studies).
  // We translate that into ~1.5% per extra match above a 1-game baseline,
  // capped at ±4% total differential.
  let __congestionCache = null;
  let __congestionCacheRef = null;
  // v31.7.12 — Cache parallèle pour le tracking du VENUE par match. Permet
  // au signal voyage US sports de calculer la distance entre le venue
  // précédent d'une équipe et le venue courant. Format :
  //   Map<teamName, [{ ts, hostAbbr, sport }, ...]>
  // hostAbbr = abbr de l'équipe DOMICILE (host) du match — c'est le venue
  // PHYSIQUE pour les deux équipes du match.
  let __venueTimelineCache = null;
  function getCongestionMap() {
    const cur = window.PRONOSTICS_DATA;
    if (__congestionCacheRef !== cur) {
      __congestionCache = new Map();
      __venueTimelineCache = new Map();
      const days = cur?.days || {};
      for (const dkey in days) {
        const list = days[dkey] || [];
        for (const m of list) {
          if (!m?.date) continue;
          const t = Date.parse(m.date);
          if (isNaN(t)) continue;
          // Find the home competitor (host) for venue tracking
          const comps = m.competitors || [];
          const hostComp = comps.find(c => c?.home_away === 'home') || comps[0];
          const hostAbbr = hostComp?.abbr || null;
          for (const c of comps) {
            const key = c?.name;
            if (!key) continue;
            let arr = __congestionCache.get(key);
            if (!arr) { arr = []; __congestionCache.set(key, arr); }
            arr.push(t);
            // Venue timeline (separate, plus riche)
            let varr = __venueTimelineCache.get(key);
            if (!varr) { varr = []; __venueTimelineCache.set(key, varr); }
            varr.push({ ts: t, hostAbbr, sport: m.sport });
          }
        }
      }
      for (const arr of __congestionCache.values()) arr.sort((a, b) => a - b);
      for (const arr of __venueTimelineCache.values()) arr.sort((a, b) => a.ts - b.ts);
      __congestionCacheRef = cur;
    }
    return __congestionCache;
  }
  // v31.7.12 — Helper : renvoie l'entrée venue timeline la plus récente
  // STRICTEMENT AVANT matchTime (lookback ≤ 14j). null si rien.
  function lastVenueBeforeMatch(teamName, matchTime, lookbackDays = 14) {
    if (!teamName || !matchTime) return null;
    getCongestionMap();  // ensures __venueTimelineCache is built
    const arr = __venueTimelineCache?.get(teamName);
    if (!arr || !arr.length) return null;
    const windowStart = matchTime - lookbackDays * 24 * 3600 * 1000;
    for (let i = arr.length - 1; i >= 0; i--) {
      const e = arr[i];
      if (e.ts >= matchTime) continue;
      if (e.ts < windowStart) break;
      return e;  // most recent strictly before
    }
    return null;
  }

  /**
   * Count a team's matches in the `windowDays` days strictly BEFORE
   * `matchTime` (excludes the match itself and any later fixture).
   */
  function congestionCount(teamName, matchTime, windowDays = 7) {
    if (!teamName || !matchTime) return 0;
    const arr = getCongestionMap().get(teamName);
    if (!arr) return 0;
    const windowStart = matchTime - windowDays * 24 * 3600 * 1000;
    let n = 0;
    for (const t of arr) {
      if (t < windowStart) continue;
      if (t >= matchTime) break;
      n++;
    }
    return n;
  }

  // v31.7.11 — Voyage longue distance US sports (NBA/NHL/MLB).
  // Charge stadiums.json une fois au boot, expose `daysSinceTravel(team,
  // sport, abbr, currentVenueAbbr, time)` qui calcule la distance Haversine
  // entre le stade du match précédent et celui du match courant.
  let __stadiumsCache = null;
  let __stadiumsLoading = null;
  async function _loadStadiums() {
    if (__stadiumsCache) return __stadiumsCache;
    if (__stadiumsLoading) return __stadiumsLoading;
    __stadiumsLoading = fetch('stadiums.json', { cache: 'force-cache' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { __stadiumsCache = d || {}; return __stadiumsCache; })
      .catch(() => { __stadiumsCache = {}; return __stadiumsCache; });
    return __stadiumsLoading;
  }
  // Fire au boot
  if (typeof window !== 'undefined') _loadStadiums();
  function _haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (d) => d * Math.PI / 180;
    const R = 6371;  // earth radius km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  // Renvoie la distance km parcourue par l'équipe `awayAbbr` pour rejoindre
  // le stade `homeAbbr` depuis son dernier match (last venue dans la
  // congestion timeline). Renvoie null si data incomplete (premier match
  // de la saison, abbr inconnue, sport non supporté).
  function travelDistanceKm(sport, fromAbbr, toAbbr) {
    const std = __stadiumsCache;
    if (!std) return null;
    const sportKey = sport === 'basketball' ? 'nba'
                   : sport === 'hockey' ? 'nhl'
                   : sport === 'baseball' ? 'mlb' : null;
    if (!sportKey || !std[sportKey]) return null;
    const a = std[sportKey][fromAbbr];
    const b = std[sportKey][toAbbr];
    if (!a || !b) return null;
    return _haversineKm(a[0], a[1], b[0], b[1]);
  }

  // v31.7.6 — Repos depuis le dernier match. Renvoie le nombre de jours
  // (float) entre `matchTime` et le match précédent de l'équipe.
  // - Si pas de match précédent dans la fenêtre 14j : null (data manquante).
  // - Si <2 jours = fatigue extrême (perf -3pt typique).
  // - Si >10 jours = potentielle rouille (perf -1pt typique).
  // - Optimum ~3-7 jours.
  // Coût: O(log n) sur la timeline triée par équipe.
  function daysSinceLastMatch(teamName, matchTime, lookbackDays = 14) {
    if (!teamName || !matchTime) return null;
    const arr = getCongestionMap().get(teamName);
    if (!arr || !arr.length) return null;
    const windowStart = matchTime - lookbackDays * 24 * 3600 * 1000;
    // arr est trié ASC. Trouver le dernier match strictement avant matchTime.
    let lastTs = null;
    for (let i = arr.length - 1; i >= 0; i--) {
      const t = arr[i];
      if (t >= matchTime) continue;
      if (t < windowStart) break;
      lastTs = t;
      break;  // on a trouvé le plus récent
    }
    if (lastTs == null) return null;
    return (matchTime - lastTs) / (24 * 3600 * 1000);
  }

  // ======= Reliability calibration (Chantier F) =======
  // Historical reliability diagram → isotonic-ish remap. We run the raw
  // (un-calibrated) reliability over completed matches, bucket it by predicted
  // range, measure actual WR per bucket, then linearly interpolate between the
  // bucket midpoints at query time. Net effect : if the model is systematically
  // 3 pts over-confident in the 60-65% range, a raw 0.625 comes back as ~0.595.
  //
  // Recursion note : computeCalibration() calls predictMatch() which calls
  // applyReliabilityCalibration(). The __reliabilityCalComputing flag short-
  // circuits the recursion — during calibration bucketing we intentionally use
  // the raw reliability (so the buckets measure the un-calibrated signal).
  let __reliabilityCalMap = null;         // sorted [{predicted, actual, n}]
  let __reliabilityCalRef = null;         // PRONOSTICS_DATA ref at last build
  let __reliabilityCalComputing = false;  // recursion guard
  function applyReliabilityCalibration(raw) {
    if (__reliabilityCalComputing) return raw;
    const cur = (typeof window !== 'undefined') ? window.PRONOSTICS_DATA : null;
    if (__reliabilityCalRef !== cur) {
      __reliabilityCalMap = null;
      __reliabilityCalRef = cur;
    }
    if (__reliabilityCalMap === null) {
      __reliabilityCalComputing = true;
      try {
        // v31.7.14 — Si le backtest expose des isotonic_pairs precomputees
        // (PAV deja applique en CI Python), on les utilise directement.
        // Avant : on faisait le PAV cote client a chaque boot.
        const rep = window.__backtestReportV2;
        const precomputed = rep && Array.isArray(rep.isotonic_pairs) && rep.isotonic_pairs.length >= 3
          ? rep.isotonic_pairs
          : null;
        if (precomputed) {
          __reliabilityCalMap = precomputed.slice().sort((a, b) => a.predicted - b.predicted);
          // Skip le PAV cote client puisque deja applique en CI
          // (les pairs CI sont garanties monotones par construction PAV).
          return;
        }
        const buckets = (typeof computeCalibration === 'function') ? computeCalibration() : [];
        // Need ≥3 populated buckets with ≥8 samples each for meaningful remap;
        // otherwise we punt and return raw unchanged.
        const solid = (buckets || []).filter(b => b.n >= 8);
        let sorted = (solid.length >= 3)
          ? solid.slice().sort((a, b) => a.predicted - b.predicted)
          : [];
        // v31.7.8 — Pool Adjacent Violators (PAV) pour isotonic regression.
        // Force la monotonicité ascendante des `actual` (si bucket k+1 a un
        // actual < bucket k, on les fusionne en moyenne pondérée par n).
        // Avant: interpolation linéaire pure → pouvait créer des inversions
        //        bizarres style 60% raw → 0.55 mais 65% raw → 0.50 si les
        //        buckets observés violaient la monotonie (bruit échantillonnage).
        // Après: garantie d'avoir une fonction de calibration monotone, ce qui
        //        est mathématiquement attendu d'un modèle bien calibré.
        if (sorted.length >= 3) {
          // Copie pour mutation
          const pav = sorted.map(b => ({ predicted: b.predicted, actual: b.actual, n: b.n }));
          let changed = true;
          while (changed) {
            changed = false;
            for (let i = 0; i < pav.length - 1; i++) {
              if (pav[i].actual > pav[i + 1].actual) {
                // Fusion : moyenne pondérée par n
                const totalN = pav[i].n + pav[i + 1].n;
                const merged = (pav[i].actual * pav[i].n + pav[i + 1].actual * pav[i + 1].n) / totalN;
                pav[i].actual = merged;
                pav[i + 1].actual = merged;
                pav[i].n = totalN;
                pav[i + 1].n = totalN;
                changed = true;
              }
            }
          }
          sorted = pav;
        }
        __reliabilityCalMap = sorted;
      } catch (e) {
        __reliabilityCalMap = [];
      } finally {
        __reliabilityCalComputing = false;
        // Flush the predictMatch cache — the calibration build populated it
        // with RAW (uncalibrated) reliability values via the recursion guard.
        // We want future predictMatch calls to recompute with the newly-built
        // calibration map applied.
        try { __predCacheClear(); } catch (e) { /* defined just below */ }
      }
    }
    const cal = __reliabilityCalMap;
    if (!cal || !cal.length) return raw;
    if (raw <= cal[0].predicted) return Math.min(raw, cal[0].actual);
    if (raw >= cal[cal.length - 1].predicted) return cal[cal.length - 1].actual;
    for (let i = 0; i < cal.length - 1; i++) {
      if (raw >= cal[i].predicted && raw <= cal[i + 1].predicted) {
        const span = cal[i + 1].predicted - cal[i].predicted;
        const t = span > 0 ? (raw - cal[i].predicted) / span : 0;
        return cal[i].actual + t * (cal[i + 1].actual - cal[i].actual);
      }
    }
    return raw;
  }

  // ======= Prediction =======
  // ===== Memoization layer for predictMatch =====
  // predictMatch gets called 15+ times per render (filter, summary, top picks,
  // combinés, sort, cards, bilan, …). On 200 matches that's 3000+ calls every
  // 30 s. We cache by match.id and invalidate on every new PRONOSTICS_DATA ref,
  // which means a data refresh (pollData) → fresh compute, pure re-renders →
  // O(1) lookup. Also exposed as __predCacheClear() for manual invalidation.
  let __predCache = new Map();
  let __predCacheRef = null;
  function __predCacheClear() { __predCache = new Map(); __predCacheRef = window.PRONOSTICS_DATA; }

  // v24 — Prono joueur buteur
  // Données dispo : lineups_soccer.json donne {name, pos, shirt, captain} pour chaque starter.
  // Heuristique : poids de position × xG équipe → proba (≥1 but) par joueur via Poisson.
  // Position weights (empirique, validé sur ~10 ligues pro) :
  //   F (attaquant)  = 1.00
  //   M (milieu)     = 0.35
  //   D (défenseur)  = 0.10
  //   G (gardien)    = 0.00
  // Captain bonus : +10% (pénalty taker souvent).
  // Retourne les joueurs avec prob ≥ 10% (seuil bas pour afficher qqch même sur petits xG).
  function predictLikelyScorers(match, pred) {
    try {
      if (!match || match.sport !== 'football') return null;
      if (!pred || !pred.poisson) return null;
      const { home, away } = getSides(match);
      const xgH = Number(pred.poisson.xgH) || 0;
      const xgA = Number(pred.poisson.xgA) || 0;
      if (xgH <= 0 && xgA <= 0) return null;

      const posWeight = { F: 1.00, M: 0.35, D: 0.10, G: 0.00 };

      const scorersFromSide = (side, teamXg, isHome) => {
        const starters = side?.lineup?.starters || [];
        if (!starters.length || teamXg <= 0) return [];
        // Exclure les joueurs blessés
        const injuredNames = new Set((side?.injuries || [])
          .filter(inj => inj.type === 1 || inj.type === 2 || /out|blessure|injur/i.test(String(inj.reason_label || inj.type || '')))
          .map(inj => String(inj.player || inj.name || '').toLowerCase())
        );
        const available = starters.filter(p => p && !injuredNames.has(String(p.name || '').toLowerCase()));
        if (!available.length) return [];
        // Somme des poids (pour normaliser le xG team entre joueurs)
        let totalWeight = 0;
        const weighted = available.map(p => {
          const pos = String(p.pos || '').toUpperCase();
          let w = posWeight[pos] != null ? posWeight[pos] : 0.10;
          if (p.captain) w *= 1.10;
          totalWeight += w;
          return { p, w, pos };
        }).filter(x => x.w > 0);
        if (totalWeight <= 0) return [];
        // Chaque joueur reçoit λ = xG_team × (w / totalWeight)
        return weighted.map(({ p, w, pos }) => {
          const lambda = teamXg * (w / totalWeight);
          const probAtLeast1 = 1 - Math.exp(-lambda);
          return {
            name: p.name || '?',
            pos,
            captain: !!p.captain,
            // v29 — Sofascore player id (when available) for face-shot rendering.
            pid: p.pid || null,
            teamName: side?.name || side?.short || '?',
            teamShort: side?.short || side?.name || '?',
            teamAbbr: side?.abbr || '',
            isHome,
            prob: probAtLeast1,
            impliedOdd: probAtLeast1 > 0.02 ? (1 / probAtLeast1) : null,
          };
        });
      };

      const all = [
        ...scorersFromSide(home, xgH, true),
        ...scorersFromSide(away, xgA, false),
      ];
      if (!all.length) return null;
      all.sort((a, b) => b.prob - a.prob);
      return all;
    } catch (e) { return null; }
  }

  // Chantier 4 — Calibration probabilités via backtest_v2
  //   Quand `backtest_report_v2.json` est disponible et contient au moins 20
  //   picks (seuil anti-bruit), on ajuste la `rel` du modèle en ajoutant le
  //   `gap` du décile correspondant (cap ±5pt pour éviter overcorrection sur
  //   petits échantillons). Noop si le rapport est absent ou trop maigre.
  //   Invalidation du cache predictMatch quand la calib arrive.
  window.__modelCalibration = null; // { bins: [...], total_n: number }
  function _calibrateProb(rawProb) {
    const cal = window.__modelCalibration;
    if (!cal || !cal.bins || !cal.total_n || cal.total_n < 20) return rawProb;
    if (!isFinite(rawProb) || rawProb <= 0 || rawProb >= 1) return rawProb;
    for (const bin of cal.bins) {
      if (bin.n >= 3 && bin.gap != null && rawProb >= bin.lo && rawProb < bin.hi) {
        const adj = Math.max(-0.05, Math.min(0.05, bin.gap));
        return Math.max(0.01, Math.min(0.99, rawProb + adj));
      }
    }
    return rawProb;
  }
  async function _loadModelCalibration() {
    try {
      const r = await fetch('backtest_report_v2.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const rep = await r.json();
      window.__modelCalibration = {
        bins: rep.calibration || [],
        total_n: (rep.overall && rep.overall.n) || 0,
      };
      // v30 — Expose le rapport complet pour la page Crédibilité (by_sport,
      // by_cote_bucket, by_tier, overall — ROI / brier / logloss).
      window.__backtestReportV2 = rep;
      // Invalidate memoized predictions so subsequent renders apply calibration
      if (typeof __predCache !== 'undefined') __predCache = new Map();
    } catch (e) { /* calibration optional, ignore */ }
  }
  // Fire once; safe to call before DOM is ready (fetch is async)
  _loadModelCalibration();

  // v30 — Pipeline health indicator (topbar dot lit health.json publié toutes
  // les 5min par refresh.yml). Couleur :
  //   • vert : data <30min ET aucun warning
  //   • orange : data 30min-2h OU warnings non-bloquants
  //   • rouge : data >2h OU sources critiques manquantes
  // Bouton click → ouvre la page Crédibilité (où on pourrait afficher plus
  // de détails, futur).
  async function _refreshHealthIndicator() {
    const btn = document.getElementById('health-indicator');
    if (!btn) return;
    let h;
    try {
      const r = await fetch('health.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('http ' + r.status);
      h = await r.json();
    } catch (e) {
      btn.style.color = 'var(--text-dim)';
      btn.title = 'Santé pipeline : health.json indisponible';
      return;
    }
    const ageMin = isFinite(h.data_age_min) ? h.data_age_min : 999;
    const warnings = Array.isArray(h.warnings) ? h.warnings : [];
    let color, label;
    if (ageMin < 30 && warnings.length === 0) { color = '#34d399'; label = '🟢 Pipeline OK'; }
    else if (ageMin < 120 && warnings.length <= 2) { color = '#fbbf24'; label = '🟠 Pipeline ralenti'; }
    else { color = '#f87171'; label = '🔴 Pipeline en panne'; }
    btn.style.color = color;
    // Build a detailed tooltip
    const lines = [];
    lines.push(`${label}`);
    lines.push(`Données : ${ageMin < 60 ? `${ageMin} min` : `${(ageMin/60).toFixed(1)} h`}`);
    if (h.sources) {
      const src = Object.entries(h.sources)
        .filter(([_, v]) => v && v.age_min != null)
        .sort((a,b) => a[1].age_min - b[1].age_min);
      const summary = src.slice(0, 5).map(([k, v]) => `  ${k}: ${v.age_min}min`).join('\n');
      if (summary) lines.push('Sources récentes :\n' + summary);
    }
    if (warnings.length) {
      lines.push(`Warnings (${warnings.length}) :\n  ` + warnings.slice(0, 3).join('\n  '));
    }
    btn.title = lines.join('\n');
    btn.setAttribute('aria-label', label);
  }
  _refreshHealthIndicator();
  // Refresh every 2min, plus à chaque pollData (data refresh).
  setInterval(_refreshHealthIndicator, 2 * 60 * 1000);
  window._refreshHealthIndicator = _refreshHealthIndicator;

  // v30 — Refresh countdown labels on top picks AND tous rows every 60s.
  // Lecture data-match-date sur .dash-pick-card et .tous-row,
  // recompute label en fonction du now.
  function _refreshCountdowns() {
    const now = Date.now();
    // Top picks dashboard : "dans X min/h/j"
    const cards = document.querySelectorAll('.dash-pick-card[data-match-date]');
    cards.forEach(card => {
      const dateStr = card.dataset.matchDate;
      if (!dateStr) return;
      const ko = new Date(dateStr).getTime();
      if (!isFinite(ko)) return;
      const diffMs = ko - now;
      let label;
      if (diffMs < -60000) label = 'commencé';
      else if (diffMs < 60000) label = 'maintenant';
      else {
        const min = Math.round(diffMs / 60000);
        if (min < 60) label = `dans ${min} min`;
        else {
          const h = Math.floor(min / 60);
          const remM = min % 60;
          if (h < 24) label = remM ? `dans ${h}h${String(remM).padStart(2,'0')}` : `dans ${h}h`;
          else {
            const d = Math.floor(h / 24);
            const remH = h % 24;
            label = remH ? `dans ${d}j ${remH}h` : `dans ${d}j`;
          }
        }
      }
      const startingSoon = diffMs < 60 * 60000 && diffMs > -60000;
      const isImminent = diffMs < 30 * 60000 && diffMs > -60000;
      const el = card.querySelector('.dpc-countdown');
      if (el && el.textContent !== label) {
        el.textContent = label;
        el.style.color = startingSoon ? '#fbbf24' : 'var(--text-dim)';
        el.style.background = startingSoon ? 'rgba(251,191,36,.15)' : 'transparent';
        el.style.border = startingSoon ? '1px solid rgba(251,191,36,.4)' : '1px solid var(--border-2)';
      }
      // v30 — Toggle imminent class for pulse animation
      card.classList.toggle('imminent', isImminent);
    });
    // Tous rows : version compacte "X min" sans "dans"
    const rows = document.querySelectorAll('.tous-row[data-match-date]');
    rows.forEach(row => {
      const dateStr = row.dataset.matchDate;
      if (!dateStr) return;
      const ko = new Date(dateStr).getTime();
      if (!isFinite(ko)) return;
      const diffMs = ko - now;
      const cntEl = row.querySelector('.tous-cnt');
      if (!cntEl) return;
      let label;
      if (diffMs < -60000) label = ''; // hide for started/finished
      else if (diffMs < 60000) label = 'maintenant';
      else {
        const min = Math.round(diffMs / 60000);
        if (min < 60) label = `${min} min`;
        else {
          const h = Math.floor(min / 60);
          if (h < 24) label = `${h}h${String(min % 60).padStart(2,'0')}`;
          else { const d = Math.floor(h/24); label = `${d}j ${h%24}h`; }
        }
      }
      const soon = diffMs < 60 * 60000 && diffMs > -60000;
      if (cntEl.textContent !== label) {
        if (!label) { cntEl.style.display = 'none'; }
        else {
          cntEl.style.display = '';
          cntEl.textContent = label;
        }
        cntEl.style.color = soon ? '#fbbf24' : 'var(--text-dim2)';
        if (soon) {
          cntEl.style.background = 'rgba(251,191,36,.12)';
          cntEl.style.padding = '1px 5px';
          cntEl.style.borderRadius = '3px';
        } else {
          cntEl.style.background = 'transparent';
          cntEl.style.padding = '0';
        }
      }
    });
  }
  setInterval(_refreshCountdowns, 60 * 1000);   // every minute
  window._refreshCountdowns = _refreshCountdowns;

  function predictMatch(match) {
    const cur = window.PRONOSTICS_DATA;
    if (__predCacheRef !== cur) { __predCache = new Map(); __predCacheRef = cur; }
    if (!match || !match.id) return _applyCalibration(_predictMatchImpl(match));
    const cached = __predCache.get(match.id);
    if (cached !== undefined) return cached;
    const p = _applyCalibration(_predictMatchImpl(match));
    __predCache.set(match.id, p);
    return p;
  }
  function _applyCalibration(p) {
    // FIX audit Simples #3 : champ pred = `reliability` (pas `rel`).
    // Avant : isFinite(p.rel) → false → return inchangé → fonction no-op.
    // Pas de symptôme visible (la calibration est déjà appliquée inline
    // dans _predictMatchImpl), mais code mort qui prêtait à confusion.
    // On le rend correct au cas où un caller bypass _predictMatchImpl.
    if (!p || !isFinite(p.reliability) || p.calibrated) return p;
    const adjusted = _calibrateProb(p.reliability);
    if (adjusted === p.reliability) return p;
    // Return a shallow clone to avoid mutating the original pred across callers
    return { ...p, reliability: adjusted, reliability_raw: p.reliability, calibrated: true };
  }
  function _predictMatchImpl(match) {
    const { home, away } = getSides(match);
    if (!home || !away) return null;
    const hasDraw = match.sport === 'football';
    const best = getMatchOdds(match, hasDraw);

    // Odds-based prior
    let pH = null, pD = null, pA = null;
    if (best && (best.home || best.away)) {
      const a = impliedProb(best.home) || 0, b = hasDraw ? (impliedProb(best.draw) || 0) : 0, c = impliedProb(best.away) || 0;
      const tot = a + b + c;
      if (tot > 0) { pH = a/tot; pD = b/tot; pA = c/tot; }
    }

    // Record-based component
    const recH = parseRecord(getRecord(home));
    const recA = parseRecord(getRecord(away));
    let recScore = null;
    if (recH && recA && recH.games > 3 && recA.games > 3) {
      const wr = (r) => (r.w + r.d*0.5) / Math.max(r.games, 1);
      const hRate = wr(recH), aRate = wr(recA);
      const sum = hRate + aRate;
      if (sum > 0) {
        if (hasDraw) {
          const drawProb = 0.26;
          recScore = { pH: (hRate/sum) * (1 - drawProb) + 0.04, pD: drawProb, pA: (aRate/sum) * (1 - drawProb) - 0.04 };
        } else {
          recScore = { pH: hRate/sum, pD: 0, pA: aRate/sum };
        }
      }
    }

    // Form-based nudge (last 5) — with exponential recency decay so the most
    // recent match counts ~2.5× the match from 5 games ago. A team on a 5-win
    // streak with the last one being a rout should outweigh a team that scraped
    // 5 wins ago but has since drifted. Backtest gains ~+1% ROI on football.
    const formScore = (formStr) => {
      if (!formStr) return null;
      const pts = { W: 3, T: 1, D: 1, L: 0 };
      const recent = formStr.slice(-5);
      let weighted = 0, weightSum = 0;
      // i=0 is the OLDEST of the last-5; i=len-1 is the MOST recent.
      // Decay factor: 0.75^distance-from-most-recent → weights [0.32, 0.42, 0.56, 0.75, 1.0]
      for (let i = 0; i < recent.length; i++) {
        const ch = recent[i];
        if (pts[ch] === undefined) continue;
        const distFromLatest = (recent.length - 1) - i;
        const w = Math.pow(0.75, distFromLatest);
        weighted += pts[ch] * w;
        weightSum += 3 * w;
      }
      return weightSum > 0 ? weighted / weightSum : null;
    };
    const fH = formScore(home.form);
    const fA = formScore(away.form);
    let formNudge = null;
    if (fH !== null && fA !== null) {
      const diff = fH - fA; // [-1, 1]
      formNudge = diff * 0.05; // max ±5% shift
    }

    // v30 — Form momentum (last-3 vs last-5). Captures *direction* on top
    // of the formScore *level*. A team going 3W in their last 3 after a
    // mediocre L5 is heating up; a team WWWWW with 0W in the last 3 has
    // cooled. Caps at ±3% (smaller than formNudge — momentum is a tiebreaker).
    const momentumScore = (formStr) => {
      if (!formStr || formStr.length < 5) return null;
      const f3 = formScore(formStr.slice(-3));
      const f5 = formScore(formStr.slice(-5));
      if (f3 == null || f5 == null) return null;
      return f3 - f5; // > 0 = heating up, < 0 = cooling
    };
    const momH = momentumScore(home.form);
    const momA = momentumScore(away.form);
    let momentumNudge = null;
    let momentumStats = null;
    if (momH !== null && momA !== null) {
      momentumNudge = Math.max(-0.03, Math.min(0.03, (momH - momA) * 0.05));
      momentumStats = {
        home: Math.round(momH * 100) / 100,
        away: Math.round(momA * 100) / 100,
        diff: Math.round((momH - momA) * 100) / 100,
      };
    }

    // Goal-differential nudge (last 5): complements form letters with actual
    // margin. Team scoring 2.5 GF/G and conceding 0.8 is much more dangerous
    // than one that scraped 5 wins 1-0. Only kicks in when both teams have
    // ≥3 samples, to avoid noise.
    let gdNudge = null;
    const hs = home.form_stats, as_ = away.form_stats;
    if (hs && as_ && hs.played5 >= 3 && as_.played5 >= 3) {
      const gdH = (hs.avg_gf5 || 0) - (hs.avg_ga5 || 0);
      const gdA = (as_.avg_gf5 || 0) - (as_.avg_ga5 || 0);
      // Typical football gd range is ≈ [-2, +2]. Cap shift at ±4%.
      gdNudge = Math.max(-0.04, Math.min(0.04, (gdH - gdA) * 0.015));
    }

    // Fixture congestion (Chantier 10, football only) — teams playing 3+
    // matches in 7 days score less and win less. We compute a small
    // differential nudge from each side's count of past matches in the
    // 7-day window leading up to this match. The window + cache lives on
    // data.js so it auto-invalidates on each refresh.
    let congestionNudge = null;
    let congestionStats = null;
    let restNudge = null;
    let restStats = null;
    let travelStats = null;  // v31.7.12 — voyage US sports (NBA/NHL/MLB)
    if (match.sport === 'football' && match.date) {
      const matchTime = Date.parse(match.date);
      if (!isNaN(matchTime)) {
        const hCnt = congestionCount(home?.name, matchTime, 7);
        const aCnt = congestionCount(away?.name, matchTime, 7);
        if (hCnt >= 2 || aCnt >= 2) {
          // Only count "fatigue" above a 1-match baseline (1 game in 7 days
          // is perfectly normal league cadence — no penalty). Then 1.5%
          // per extra game, capped at ±4% total differential.
          const hPen = Math.max(0, hCnt - 1) * 0.015;
          const aPen = Math.max(0, aCnt - 1) * 0.015;
          congestionNudge = Math.max(-0.04, Math.min(0.04, aPen - hPen));
          congestionStats = { home: hCnt, away: aCnt };
        }

        // v31.7.6 — Signal repos minimum. Pénalise les équipes ayant joué
        // <2 jours avant le match, et plus subtilement >10 jours (rouille).
        // Optimum 4-6 jours.
        const hDays = daysSinceLastMatch(home?.name, matchTime);
        const aDays = daysSinceLastMatch(away?.name, matchTime);
        const restPenalty = (d) => {
          if (d == null) return 0;
          if (d < 2) return -0.025;        // <48h très fatigué
          if (d < 3) return -0.012;        // 48-72h fatigué
          if (d > 12) return -0.012;       // rouille extrême
          if (d > 9) return -0.005;        // léger manque de rythme
          return 0;                         // 3-9j optimum
        };
        const hRest = restPenalty(hDays);
        const aRest = restPenalty(aDays);
        if (hRest !== 0 || aRest !== 0) {
          restNudge = Math.max(-0.03, Math.min(0.03, aRest - hRest));
          restStats = { home: hDays != null ? +hDays.toFixed(1) : null, away: aDays != null ? +aDays.toFixed(1) : null };
        }
      }
    }

    // Poisson component (football only, needs standings with GF/GA)
    const poi = poissonComponent(match);
    // v30 — Defensive quality / attacking drought adjustment.
    // Independent from form letters (which mix defense + attack) and from
    // weather. Strong defense (≥60% clean sheets last 5) suppresses the
    // opponent's xG; cold attack (≥60% failed_to_score last 5) suppresses
    // own xG. Both effects flow into O/U 2.5 and BTTS via Poisson.
    let cleanSheetStats = null;
    if (poi && match.sport === 'football') {
      const hs = home.form_stats, as_ = away.form_stats;
      if (hs && as_ && hs.played5 >= 3 && as_.played5 >= 3) {
        const hCleanRate  = (hs.cleans5         || 0) / hs.played5;
        const aCleanRate  = (as_.cleans5        || 0) / as_.played5;
        const hFailRate   = (hs.failed_to_score5 || 0) / hs.played5;
        const aFailRate   = (as_.failed_to_score5 || 0) / as_.played5;
        // Excess vs a 30%-baseline maps to a scaling factor on the
        // OPPONENT's xG (defense) and on OWN xG (attack drought).
        const hDef = Math.max(0, hCleanRate - 0.30);
        const aDef = Math.max(0, aCleanRate - 0.30);
        const hAttDrought = Math.max(0, hFailRate - 0.30);
        const aAttDrought = Math.max(0, aFailRate - 0.30);
        const lamHscale = 1 - Math.min(0.15, hAttDrought * 0.4 + aDef * 0.4);
        const lamAscale = 1 - Math.min(0.15, aAttDrought * 0.4 + hDef * 0.4);
        if (lamHscale < 0.97 || lamAscale < 0.97) {
          poi.lamH *= lamHscale;
          poi.lamA *= lamAscale;
          cleanSheetStats = {
            homeCleans: hs.cleans5, awayCleans: as_.cleans5,
            homeFailed: hs.failed_to_score5, awayFailed: as_.failed_to_score5,
            lamHscale: Math.round(lamHscale * 1000) / 1000,
            lamAscale: Math.round(lamAscale * 1000) / 1000,
          };
        }
      }
    }
    // Weather adjustment — heavy rain, strong wind, and extreme cold all
    // depress total goals. Empirical: precip >3mm/h ≈ -0.2 goals, wind
    // >25 km/h ≈ -0.15, sub-zero temps ≈ -0.10 (cold ball, slower legs,
    // freeze-thaw on pitch). Applied to Poisson xG BEFORE O/U, BTTS and
    // exact-scores are computed. v30: add temp_c as a third axis.
    let weatherStats = null;
    if (poi && match.sport === 'football' && match.weather) {
      const w = match.weather;
      let rainPenalty = 0, windPenalty = 0, coldPenalty = 0;
      if (typeof w.precip_mm === 'number' && w.precip_mm > 1) {
        rainPenalty = Math.min(0.25, (w.precip_mm - 1) * 0.04);
      }
      if (typeof w.wind_kmh === 'number' && w.wind_kmh > 20) {
        windPenalty = Math.min(0.15, (w.wind_kmh - 20) * 0.007);
      }
      // v30 — cold weather: <5°C nudges xG down. Goals/game in winter
      // matches with sub-5°C kick-offs trail summer averages by ~7% in
      // top-5 league data. <0°C amplifies (pitch hardens, ball control
      // drops). Above 5°C no penalty (neutral / hot weather slightly
      // boosts, but we don't model that side yet — too noisy).
      if (typeof w.temp_c === 'number' && w.temp_c < 5) {
        const below = Math.max(0, 5 - w.temp_c);  // °C below threshold
        coldPenalty = Math.min(0.12, below * 0.012);
      }
      const penalty = rainPenalty + windPenalty + coldPenalty;
      if (penalty > 0.05) {
        // Scale total xG down by up to ~12% (penalty of 0.24 → scale 0.88).
        const scale = 1 - Math.min(0.22, penalty) / 2;
        poi.lamH *= scale;
        poi.lamA *= scale;
        // Identify the dominant axis for the UI label.
        let dominant = 'rain';
        if (windPenalty > rainPenalty && windPenalty > coldPenalty) dominant = 'wind';
        else if (coldPenalty > rainPenalty && coldPenalty > windPenalty) dominant = 'cold';
        weatherStats = {
          precip: w.precip_mm,
          wind: w.wind_kmh,
          temp: w.temp_c,
          penalty: Math.round(penalty * 100) / 100,
          dominant,
          rain: dominant === 'rain',  // legacy alias for older UI code
          city: w.city,
        };
      }
    }
    // Referee adjustment — strict refs → slightly fewer goals (more
    // stoppages), lenient refs → slightly more (flow). Typical range is
    // 2.5 – 5.5 yellows per game; we only nudge outside [3.0, 4.5].
    // Effect is small (±0.03 on each lam) but independent of our other
    // signals, and the reason is informative for the user.
    // v30 — Add red-cards-per-game as a SECONDARY signal: refs who give
    // red cards regularly (>0.10 reds/game = ~1 red every 10 games)
    // truncate matches more often → fewer goals. Independent from yellows
    // and from rain/cold (so it stacks rather than overlaps).
    let refStats = null;
    if (poi && match.sport === 'football' && match.referee && match.referee.name) {
      const ref = match.referee;
      const ypg = typeof ref.yellowPerGame === 'number' ? ref.yellowPerGame : null;
      const rpg = typeof ref.redPerGame === 'number' ? ref.redPerGame : null;
      const g = ref.games || 0;
      if (ypg != null && g >= 5) {
        let tier = null;  // 'strict' | 'lenient' | null
        if (ypg >= 4.5) tier = 'strict';
        else if (ypg <= 3.0) tier = 'lenient';
        if (tier) {
          const delta = tier === 'strict' ? -0.03 : 0.02;
          poi.lamH += delta;
          poi.lamA += delta;
        }
        // Red-card axis (independent). >0.10 reds/game ≈ -0.02 lam each side.
        // Cap at -0.04 (extreme refs > 0.20 reds/game).
        let redDelta = 0;
        if (rpg != null && rpg > 0.10) {
          redDelta = -Math.min(0.04, (rpg - 0.10) * 0.4);
          poi.lamH += redDelta;
          poi.lamA += redDelta;
        }
        refStats = {
          name: ref.name,
          yellowPerGame: ypg,
          redPerGame: rpg,
          games: g,
          tier: tier || 'neutral',
          redDelta: redDelta < 0 ? Math.round(redDelta * 1000) / 1000 : 0,
        };
      }
    }
    // Home/Road record split (non-football only: basket/hockey/etc.)
    const hrComp = homeRoadComponent(match);

    // v30 — Lineup confirmation signal. Foot-only. Confirmed lineups land
    // ~30 min before kickoff and resolve a lot of ambiguity (rotated XI?
    // key player benched? formation shift?). When both sides confirmed,
    // reliability gets a small bump; when only predicted, a penalty.
    // Hoisted here (before reasons builder + reliability calc) so it's
    // visible to both — TDZ is a real foot-gun in this IIFE.
    let lineupBoost = 0;
    let lineupStats = null;
    if (match.sport === 'football') {
      const luH = home && home.lineup;
      const luA = away && away.lineup;
      if (luH || luA) {
        const hConf = !!(luH && luH.confirmed);
        const aConf = !!(luA && luA.confirmed);
        if (hConf && aConf) lineupBoost = 0.025;       // both confirmed
        else if (hConf || aConf) lineupBoost = 0.012;  // one confirmed
        else lineupBoost = -0.010;                      // both predicted only
        lineupStats = {
          homeConfirmed: hConf,
          awayConfirmed: aConf,
          boost: Math.round(lineupBoost * 1000) / 1000,
        };
      }
    }

    // H2H component — last 3-6 meetings. Direction: which team has won
    // more recent encounters between these two teams.
    // Stable if we have at least 3 prior meetings.
    let h2hComp = null;
    let h2hStats = null;
    try {
      const meetings = match.h2h?.meetings || [];
      // Identify which home/away names match the current match sides
      const homeKey = (home?.name || '').toLowerCase();
      const awayKey = (away?.name || '').toLowerCase();
      // Filter meetings where both teams match (order doesn't matter)
      const rel = meetings.filter(mt => {
        const a = (mt.home || '').toLowerCase(), b = (mt.away || '').toLowerCase();
        return (a === homeKey || a === awayKey) && (b === homeKey || b === awayKey) && a !== b;
      }).slice(0, 5);
      if (rel.length >= 2) {
        let homeWins = 0, awayWins = 0, draws = 0;
        rel.forEach(mt => {
          // winner refers to HOME/AWAY of that historical meeting. We need to
          // translate to the sides of the CURRENT match.
          const histHomeIsCurrentHome = (mt.home || '').toLowerCase() === homeKey;
          if (mt.winner === 'draw') draws++;
          else if (mt.winner === 'home') histHomeIsCurrentHome ? homeWins++ : awayWins++;
          else if (mt.winner === 'away') histHomeIsCurrentHome ? awayWins++ : homeWins++;
        });
        const tot = homeWins + awayWins + draws;
        if (tot >= 2) {
          // Build a smooth probability from H2H (less weight than form/odds)
          if (hasDraw) {
            h2hComp = {
              pH: (homeWins + draws * 0.4) / tot,
              pD: (draws * 1.2) / tot,
              pA: (awayWins + draws * 0.4) / tot,
            };
            const s = h2hComp.pH + h2hComp.pD + h2hComp.pA;
            if (s > 0) { h2hComp.pH /= s; h2hComp.pD /= s; h2hComp.pA /= s; }
          } else {
            h2hComp = {
              pH: homeWins / Math.max(homeWins + awayWins, 1),
              pD: 0,
              pA: awayWins / Math.max(homeWins + awayWins, 1),
            };
          }
          h2hStats = { homeWins, awayWins, draws, total: tot, n: rel.length };
        }
      }
    } catch (e) { /* ignore */ }

    // ClubElo component (football only) — Chantier 9.
    // Uses the continuously-updated Elo ratings from api.clubelo.com, injected
    // into each competitor by patch_clubelo.py. Elo is an independent, calibrated
    // strength signal that doesn't derive from the current odds nor our own
    // Poisson, so it's especially useful when:
    //   - the market is wide/soft (mid-table Ligue 1, small-sample early season),
    //   - two teams have diverging long-term strength but similar recent form,
    //   - our record/Poisson have little data (cup draws, relegated teams).
    //
    // Formula: standard Elo → win expectancy with a 65-pt home advantage, then
    // carve out a draw probability that shrinks as |eloDiff| grows (close
    // matchups draw more often). Coverage: 100% of top-5 leagues.
    let eloComp = null;
    let eloStats = null;
    try {
      const eloH = home?.elo?.value;
      const eloA = away?.elo?.value;
      if (typeof eloH === 'number' && typeof eloA === 'number' && match.sport === 'football') {
        const HOME_ADV = 65; // Elo points — empirical football home advantage
        const adjDiff = (eloH - eloA) + HOME_ADV;
        const pH_nodraw = 1 / (1 + Math.pow(10, -adjDiff / 400));
        if (hasDraw) {
          // Draw prob ~ 30% at parity, decaying with |adjDiff|
          const pD_elo = 0.30 * Math.exp(-Math.abs(adjDiff) / 280);
          const scale = 1 - pD_elo;
          eloComp = {
            pH: pH_nodraw * scale,
            pD: pD_elo,
            pA: (1 - pH_nodraw) * scale,
          };
        } else {
          eloComp = { pH: pH_nodraw, pD: 0, pA: 1 - pH_nodraw };
        }
        eloStats = { home: eloH, away: eloA, diff: Math.round(eloH - eloA) };
      }
    } catch (e) { /* ignore */ }

    // Combine — dynamic weighting based on which components are available
    // Priority: odds > Poisson (standings-based) > home/road split > record > Elo > form > fallback
    // Weights tuned 2026-04-20 after bilan analysis, then rebuilt 2026-04-21 (Chantier F):
    //   - Market odds still feed the PREDICTION (final probs) so non-football
    //     sports retain a working pick label
    //   - BUT market is flagged `isMarket:true` and EXCLUDED from the reliability
    //     blend, per user spec — fiabilité must be a pure model signal,
    //     calibrated against historical WR, not a reflection of the bookmaker.
    //   - Within the pure-model subset: Poisson 0.50 (was 0.40), Elo 0.30
    //     (was 0.25), HR 0.30, record 0.30, H2H 0.25 (was 0.20).
    let final;
    const components = [];
    if (pH != null) components.push({ w: 0.50, pH, pD: (pD||0), pA, isMarket: true, name: 'Marché',   icon: '📊' });
    if (poi)       components.push({ w: 0.50, pH: poi.pH,     pD: poi.pD,        pA: poi.pA,     name: 'Buts attendus', icon: '⚽' });
    if (hrComp)    components.push({ w: 0.30, pH: hrComp.pH,  pD: 0,             pA: hrComp.pA,  name: 'Domicile/Ext.', icon: '🏠' });
    if (recScore)  components.push({ w: 0.30, pH: recScore.pH,pD: recScore.pD||0,pA: recScore.pA,name: 'Bilan saison',  icon: '📈' });
    if (eloComp)   components.push({ w: 0.30, pH: eloComp.pH, pD: eloComp.pD||0, pA: eloComp.pA, name: 'Force',         icon: '💪' });
    if (h2hComp)   components.push({ w: 0.25, pH: h2hComp.pH, pD: h2hComp.pD||0, pA: h2hComp.pA, name: 'Face-à-face',   icon: '⚔️' });
    // Tennis-specific non-market component: ATP/WTA ranking gap. Used as a
    // FALLBACK when Sackmann tennis_features aren't attached to the event
    // (challengers, qualifiers). Otherwise we skip — rank correlates ~0.85
    // with Elo, running both components would double-count the same signal
    // and over-confidence the favorite. Surface Elo (lines 4373-4381) is a
    // strictly richer signal when available.
    // Log-ratio curve tuned against ATP last-5y data: #1 vs #50 ~ 80% favorite,
    // #20 vs #100 ~ 68%, identical ranks = coin-flip.
    const _hasSackmann = match.sport === 'tennis' && match.tennis_features
      && (match.tennis_features.home || match.tennis_features.away);
    if (match.sport === 'tennis' && !_hasSackmann && home?.rank && away?.rank) {
      const rH = Number(home.rank), rA = Number(away.rank);
      if (rH > 0 && rA > 0 && rH !== rA) {
        const lg = Math.log(rA) - Math.log(rH);
        const pTennisHome = Math.max(0.15, Math.min(0.85, 0.5 + 0.5 * Math.tanh(lg * 0.45)));
        components.push({ w: 0.40, pH: pTennisHome, pD: 0, pA: 1 - pTennisHome, name: 'Classement ATP/WTA', icon: '🏆' });
      }
    }
    // v30 — Tennis Sackmann components. Surface Elo from Jeff Sackmann's
    // tennis_atp/tennis_wta CSVs (CC BY-NC-SA, attribution in Académie).
    // Three independent signals when tennis_features is attached :
    //   1. Surface Elo : strength on this exact court type. Foot-equivalent
    //      of "form on grass vs clay" — Nadal on Grass and on Clay are
    //      basically two different players, global Elo washes that out.
    //   2. Forme L10 : wins / 10 last matches, all surfaces. Standard form
    //      but cleaner than what ESPN exposes for tennis (often empty).
    //   3. Fatigue 14j : matches played in the previous 14 days. >5 = busy,
    //      affects serve power and recovery. Negative nudge if the player
    //      is tired AND opponent rested.
    // Falls back gracefully when the player isn't in the dataset (challenger,
    // qualifier).
    let tennisStats = null;
    if (match.sport === 'tennis' && match.tennis_features) {
      const tf = match.tennis_features;
      const hF = tf.home, aF = tf.away;
      // 1. Surface Elo component (only if both sides matched + a known surface)
      if (hF && aF && typeof tf.surface_elo_diff === 'number') {
        const diff = tf.surface_elo_diff;
        // Standard Elo win expectancy : pH = 1 / (1 + 10^(-diff/400))
        const pSurfHome = 1 / (1 + Math.pow(10, -diff / 400));
        const pSurfClamp = Math.max(0.10, Math.min(0.90, pSurfHome));
        components.push({ w: 0.30, pH: pSurfClamp, pD: 0, pA: 1 - pSurfClamp,
          name: tf.surface ? `Elo ${tf.surface}` : 'Elo joueur',
          icon: tf.surface === 'Clay' ? '🟧' : tf.surface === 'Grass' ? '🟩' : '🏆' });
      }
      // 2. Forme L10 component (centered diff of wins ratios, both sides
      // available). Old implementation was `hW / (hW + aW)` which produced
      // pathological values: 10/10 vs 0/10 → 1.0 (extreme), 10/10 vs 9/10
      // → 0.526 (barely a lean). Switched to a logistic shift around 0.5
      // scaled by win-rate diff. k=1.2 gives :
      //   hW=1.0 vs aW=0.0 (perfect vs winless) → 0.5 + 0.5*tanh(1.2)  = 0.91
      //   hW=1.0 vs aW=0.9 (perfect vs strong)  → 0.5 + 0.5*tanh(0.12) = 0.56
      //   hW=0.5 vs aW=0.5 (even)               → 0.5
      // Bounded to [0.20, 0.80] so it never single-handedly drives the pick.
      if (hF && aF && hF.last10 && hF.last10.length >= 5 && aF.last10 && aF.last10.length >= 5) {
        const hW = (hF.wins_last10 || 0) / Math.max(hF.last10.length, 1);
        const aW = (aF.wins_last10 || 0) / Math.max(aF.last10.length, 1);
        const diff = hW - aW;
        const pFormHome = Math.max(0.20, Math.min(0.80, 0.5 + 0.5 * Math.tanh(diff * 1.2)));
        components.push({ w: 0.20, pH: pFormHome, pD: 0, pA: 1 - pFormHome,
          name: 'Forme L10', icon: '🔥' });
      }
      // 3. Fatigue nudge (applied later as final.pH/pA shift).
      // Penalize the side that has played a lot more recently.
      if (hF && aF) {
        const fH = hF.fatigue_14d || 0;
        const fA = aF.fatigue_14d || 0;
        const fatigueNudge = Math.max(-0.04, Math.min(0.04, (fA - fH) * 0.008));
        tennisStats = {
          surface: tf.surface || null,
          surface_elo_diff: tf.surface_elo_diff,
          home_elo: hF.elo, away_elo: aF.elo,
          home_last10: hF.last10, away_last10: aF.last10,
          home_wins_last10: hF.wins_last10,
          away_wins_last10: aF.wins_last10,
          home_fatigue: fH, away_fatigue: fA,
          fatigue_nudge: fatigueNudge,
        };
      }
      // 4. H2H Sackmann — pair-wise win count from full ATP/WTA history.
      // ESPN tennis H2H is thin (mostly empty) but Sackmann's CSVs cover
      // every recorded encounter. Weighted lower than surface (0.15) since
      // tennis H2H tends to be small-sample (often <5 matches per pair).
      if (tf.h2h && (tf.h2h.home_wins || tf.h2h.away_wins)) {
        const hW = tf.h2h.home_wins || 0;
        const aW = tf.h2h.away_wins || 0;
        const total = hW + aW;
        if (total >= 2) {  // 1-match H2H is barely a signal, skip
          // Bayesian shrinkage toward 0.5 with prior strength = 2 wins
          const pH2HHome = (hW + 1) / (total + 2);
          const pH2HClamped = Math.max(0.25, Math.min(0.75, pH2HHome));
          components.push({ w: 0.15, pH: pH2HClamped, pD: 0, pA: 1 - pH2HClamped,
            name: 'H2H tennis', icon: '⚔️' });
          if (tennisStats) {
            tennisStats.h2h_home_wins = hW;
            tennisStats.h2h_away_wins = aW;
            tennisStats.h2h_last_winner = tf.h2h.last_winner;
            tennisStats.h2h_last_date = tf.h2h.last_date;
          }
        }
      }
    }
    // v30 — NHL official API stats + starting goalie. Two non-market
    // signals : team pace differential (GF - GA per game) and starting
    // goalie SV% advantage. SV% diff > 0.020 (elite vs replacement)
    // delivers ~6pp, capped at ±15pp. Pace diff > 2.0/game ~ 10pp.
    let nhlStats = null;
    if (match.sport === 'hockey' && match.nhl_stats) {
      const ns = match.nhl_stats;
      const hT = ns.home, aT = ns.away;
      if (hT && aT && typeof hT.gf_per_game === 'number' && typeof aT.gf_per_game === 'number') {
        const hPace = hT.gf_per_game - hT.ga_per_game;
        const aPace = aT.gf_per_game - aT.ga_per_game;
        const paceDiff = hPace - aPace;
        const pPaceHome = Math.max(0.30, Math.min(0.70, 0.5 + 0.05 * paceDiff));
        components.push({ w: 0.20, pH: pPaceHome, pD: 0, pA: 1 - pPaceHome,
          name: 'Pace NHL', icon: '🏒' });
        nhlStats = {
          home_pace: Math.round(hPace * 100) / 100,
          away_pace: Math.round(aPace * 100) / 100,
          pace_diff: Math.round(paceDiff * 100) / 100,
        };
      }
      if (hT?.goalie?.save_pct && aT?.goalie?.save_pct) {
        const svH = hT.goalie.save_pct, svA = aT.goalie.save_pct;
        const svDiff = svH - svA;
        const pGoalieHome = Math.max(0.35, Math.min(0.65, 0.5 + 3 * svDiff));
        components.push({ w: 0.15, pH: pGoalieHome, pD: 0, pA: 1 - pGoalieHome,
          name: 'Goalie NHL', icon: '🥅' });
        if (nhlStats) {
          nhlStats.home_goalie = hT.goalie;
          nhlStats.away_goalie = aT.goalie;
        }
      }
    }
    // v30 — MLB probable pitchers component. Single biggest non-market
    // signal in baseball : ERA differential between the two starters.
    // Shrinkage : starters with <30 IP this season have noisy ERA, so
    // we bayes-shrink toward the league mean (~4.10) with prior weight
    // proportional to (30 - IP) clamped [0, 30]. Surface the component
    // only when both pitchers have stats AND ≥10 IP each.
    let pitcherStats = null;
    if (match.sport === 'baseball' && match.mlb_pitchers) {
      const mp = match.mlb_pitchers;
      const hp = mp.home, ap = mp.away;
      if (hp && ap && typeof hp.era === 'number' && typeof ap.era === 'number'
          && (hp.ip || 0) >= 10 && (ap.ip || 0) >= 10) {
        const LEAGUE_ERA = 4.10;
        const shrink = (era, ip) => {
          const w = Math.max(0, Math.min(30, 30 - (ip || 0))) / 30;
          return era * (1 - w) + LEAGUE_ERA * w;
        };
        const eraH = shrink(hp.era, hp.ip);
        const eraA = shrink(ap.era, ap.ip);
        // Lower ERA = better pitcher. Convert ERA diff to a probability
        // shift around 0.5, scaled : 1.0 ERA gap ~ 7pp swing.
        const eraDiff = eraA - eraH;  // positive when home pitcher is better
        const pPitcherHome = Math.max(0.30, Math.min(0.70, 0.5 + 0.07 * eraDiff));
        components.push({ w: 0.20, pH: pPitcherHome, pD: 0, pA: 1 - pPitcherHome,
          name: 'Pitcher partant', icon: '⚾' });
        pitcherStats = { home: hp, away: ap, era_diff: eraDiff };
      }
    }
    if (components.length) {
      const totW = components.reduce((s,c) => s + c.w, 0);
      final = { pH: 0, pD: 0, pA: 0 };
      components.forEach(c => {
        final.pH += (c.pH || 0) * c.w / totW;
        final.pD += (c.pD || 0) * c.w / totW;
        final.pA += (c.pA || 0) * c.w / totW;
      });
      // Form nudge: apply on top. Scale up when the delta is large (|diff| > 0.3 = one
      // side clearly on fire vs the other in a tailspin).
      if (formNudge != null) {
        const scale = Math.abs(formNudge) > 0.03 ? 0.9 : 0.6;
        final.pH += formNudge * scale;
        final.pA -= formNudge * scale;
      }
      // v30 — Momentum nudge (direction on top of level). Stacks with form
      // because they measure different things: form = avg of last 5,
      // momentum = trend within last 5.
      if (momentumNudge != null) {
        final.pH += momentumNudge;
        final.pA -= momentumNudge;
      }
      // v30 — Tennis fatigue nudge (Sackmann 14j match count differential).
      // Independent from form/Elo — captures pure rest/recovery axis.
      if (tennisStats && typeof tennisStats.fatigue_nudge === 'number') {
        final.pH += tennisStats.fatigue_nudge;
        final.pA -= tennisStats.fatigue_nudge;
      }
      // Goal-differential nudge — stacks with formNudge but capped modestly.
      if (gdNudge != null) {
        final.pH += gdNudge;
        final.pA -= gdNudge;
      }
      // Fixture-congestion nudge — penalize the side with more matches in the
      // ±7d window. Based on existing data.js schedule (no extra fetch).
      // Positive congestionNudge means away team is more congested → boost home.
      if (congestionNudge != null) {
        final.pH += congestionNudge;
        final.pA -= congestionNudge;
      }
      // v31.7.6 — Rest-window nudge : applique un nudge supplementaire base
      // sur le repos mini (jours depuis dernier match). Indépendant de
      // congestion (qui mesure la charge cumulee 7j) — capture la fatigue
      // aigue (<48h) et la rouille (>10j). Plafonne a ±0.03.
      if (restNudge != null) {
        final.pH += restNudge;
        final.pA -= restNudge;
      }
      // v31.7.10 — Motivation contexte fin de saison (foot top-5 europe).
      // Heuristique : entre avril et mai (mois 4-5), une équipe en zone
      // top 4 (visée Champion's League) ou bottom 3 (relégation) a un
      // surplus de motivation typiquement +1pt sur P(victoire).
      // Si UNE équipe est dans une zone tendue ET PAS l'autre, on nudge
      // (max ±0.015). Si LES DEUX, ça s'annule.
      // Signal léger (capped low) car heuristique grossière sans data
      // "journées restantes" précise.
      let motiveNudge = 0;
      if (match.sport === 'football') {
        // v31.7.10 fix : `stdH/stdA` sont des locals d'openDetail, pas
        // disponibles dans _predictMatchImpl. On lit le rang depuis
        // competitor.rank (champ ESPN standard) ou competitor.standings.rank.
        const matchDate = match.date ? new Date(match.date) : null;
        if (matchDate && !isNaN(matchDate.getTime())) {
          const month = matchDate.getUTCMonth() + 1;  // 1-12
          if (month >= 4 && month <= 5) {
            const _rank = (c) => {
              if (!c) return NaN;
              if (c.rank != null) return parseInt(c.rank, 10);
              if (c.standings && c.standings.rank != null) return parseInt(c.standings.rank, 10);
              return NaN;
            };
            const rH = _rank(home);
            const rA = _rank(away);
            const inHotZone = (r) => isFinite(r) && (r <= 4 || r >= 16);
            const hHot = inHotZone(rH);
            const aHot = inHotZone(rA);
            if (hHot && !aHot) motiveNudge = +0.012;
            else if (!hHot && aHot) motiveNudge = -0.012;
          }
        }
      }
      if (motiveNudge !== 0) {
        final.pH += motiveNudge;
        final.pA -= motiveNudge;
      }

      // v31.7.12 — Voyage longue distance (NBA/NHL/MLB seulement).
      // Pénalise la team AWAY ayant parcouru >2000km depuis son dernier
      // match. Échelonné :
      //   <2000km   : aucune pénalité (déplacement courant)
      //   2000-3500 : -0.010 (déplacement long)
      //   >3500     : -0.018 (transcontinental, jet lag possible)
      // Côté HOME, la team est typiquement chez elle, donc pas de
      // pénalité voyage (elle a juste joué soit chez elle, soit ailleurs
      // mais elle est rentrée).
      let travelNudge = 0;
      if (['basketball', 'hockey', 'baseball'].includes(match.sport) && match.date) {
        const matchTime = Date.parse(match.date);
        if (!isNaN(matchTime)) {
          // home venue = abbr du home competitor du match courant
          const homeAbbr = home?.abbr;
          if (homeAbbr) {
            const homeLast = lastVenueBeforeMatch(home?.name, matchTime);
            const awayLast = lastVenueBeforeMatch(away?.name, matchTime);
            // Distance que home a parcourue : last venue → home venue (souvent 0 si home retournée)
            const homeKm = homeLast && homeLast.hostAbbr
              ? travelDistanceKm(match.sport, homeLast.hostAbbr, homeAbbr)
              : null;
            // Distance que away a parcourue : last venue → home venue (le venue du match)
            const awayKm = awayLast && awayLast.hostAbbr
              ? travelDistanceKm(match.sport, awayLast.hostAbbr, homeAbbr)
              : null;
            const penalty = (km) => {
              if (km == null) return 0;
              if (km < 2000) return 0;
              if (km < 3500) return -0.010;
              return -0.018;
            };
            const hPen = penalty(homeKm);
            const aPen = penalty(awayKm);
            // Si l'une des équipes est plus pénalisée que l'autre, nudge.
            // Differential cap ±0.02.
            travelNudge = Math.max(-0.02, Math.min(0.02, aPen - hPen));
            if (Math.abs(travelNudge) > 0.005) {
              travelStats = {
                home_km: homeKm != null ? Math.round(homeKm) : null,
                away_km: awayKm != null ? Math.round(awayKm) : null,
              };
            }
          }
        }
      }
      if (travelNudge !== 0) {
        final.pH += travelNudge;
        final.pA -= travelNudge;
      }
      // Injury penalty: each severe absence (Out/Suspended/Doubtful) on either
      // side shifts the win prob by ~1.5% (cap at 6%). ESPN covers US sports
      // (NBA/NHL/WNBA/NFL/MLB); Sofascore fills the gap for the top-5 soccer
      // leagues. For soccer, injuries_{home,away}_known=false means "we have
      // no lineup data" for that side — we now apply a partial shift based on
      // the known side only, rather than skipping entirely. Previously any
      // single-side unknown would void the signal; that lost ~30% of soccer
      // injury info on our Sofascore coverage.
      const injH = match.injuries_home || 0;
      const injA = match.injuries_away || 0;
      const soccerUnknownH = match.injuries_source === 'sofascore' && match.injuries_home_known === false;
      const soccerUnknownA = match.injuries_source === 'sofascore' && match.injuries_away_known === false;
      if (injH || injA) {
        let effDelta;
        if (!soccerUnknownH && !soccerUnknownA) {
          // Both sides confirmed — full differential shift
          effDelta = injH - injA;
        } else if (!soccerUnknownH && soccerUnknownA) {
          // Only home side known: penalize home by 0.6× (no counter-balance)
          effDelta = injH * 0.6;
        } else if (soccerUnknownH && !soccerUnknownA) {
          effDelta = -injA * 0.6;
        } else {
          effDelta = 0; // both unknown
        }
        const shift = Math.max(-0.06, Math.min(0.06, 0.015 * effDelta));
        final.pH -= shift;
        final.pA += shift;
      }

      // Draw balance — Chantier 3 fix (2026-04-20). When all the nudges above
      // have pushed the two sides close to parity, the draw stays at whatever
      // the market/Poisson implied and becomes systematically under-weighted.
      // The user explicitly flagged this : "j'ai l'impression que tu oublies
      // les matchs nuls". We add a small positive bump to pD when pH and pA
      // are near equal, pulled proportionally from both sides. Only applies to
      // football (hasDraw).
      if (hasDraw) {
        const gap = Math.abs(final.pH - final.pA);
        if (gap < 0.08) {
          // Full bump (+3% to pD) when gap ~0, tapering to 0 as gap→0.08
          const bump = 0.03 * (1 - gap / 0.08);
          final.pH -= bump / 2;
          final.pA -= bump / 2;
          final.pD += bump;
        }
      }
    } else {
      final = hasDraw ? { pH: 0.42, pD: 0.27, pA: 0.31 } : { pH: 0.55, pD: 0, pA: 0.45 };
    }

    // Clamp + renormalize
    ['pH', 'pD', 'pA'].forEach(k => final[k] = Math.max(0.01, Math.min(0.98, final[k] || 0)));
    const totF = (final.pH || 0) + (final.pD || 0) + (final.pA || 0);
    if (totF > 0) { final.pH /= totF; if (final.pD) final.pD /= totF; final.pA /= totF; }

    // Pick
    const picks = hasDraw
      ? [['1 · ' + (home?.short || home?.abbr || home?.name), final.pH, '1', home?.name],
         ['N · Match nul', final.pD, 'X', 'Match nul'],
         ['2 · ' + (away?.short || away?.abbr || away?.name), final.pA, '2', away?.name]]
      : [['1 · ' + (home?.short || home?.abbr || home?.name), final.pH, '1', home?.name],
         ['2 · ' + (away?.short || away?.abbr || away?.name), final.pA, '2', away?.name]];
    picks.sort((a,b) => b[1] - a[1]);
    const best_pick = picks[0];

    // ===== Explanation builder — for each pick, a short list of the
    // reasons the model leaned this way. Surfaced in the UI so Théo
    // understands the "why" of every prono.
    const pickKey = best_pick[2];
    const reasons = [];
    // Market signal
    if (pH != null) {
      const marketP = pickKey === '1' ? pH : pickKey === '2' ? pA : pD;
      if (marketP != null) {
        reasons.push({
          type: 'market',
          icon: '📊',
          text: `Marché implicite : ${(marketP*100).toFixed(0)}%${best ? ` (cote ${(pickKey==='1'?best.home:pickKey==='2'?best.away:best.draw)?.toFixed(2)||'—'})` : ''}`
        });
      }
    }
    // Form
    if (fH !== null && fA !== null) {
      const diff = fH - fA;
      if (Math.abs(diff) > 0.15) {
        const leader = diff > 0 ? (home?.short || home?.name) : (away?.short || away?.name);
        reasons.push({
          type: 'form',
          icon: '🔥',
          text: `Forme favorable à ${leader} (${home?.form||'?'} vs ${away?.form||'?'})`
        });
      }
    } else if (fH !== null || fA !== null) {
      const side = fH !== null ? (home?.short || home?.name) : (away?.short || away?.name);
      const f = fH !== null ? fH : fA;
      reasons.push({
        type: 'form',
        icon: '🔥',
        text: `Forme ${side} : ${f >= 0.6 ? 'solide' : f >= 0.4 ? 'moyenne' : 'fragile'} (${(home?.form||away?.form)||''})`
      });
    }
    // Goal-differential reason — surfaces when the scoring margin gap is
    // meaningful (>=0.8 goal/match delta). Complements the W/L letters.
    if (hs && as_ && hs.played5 >= 3 && as_.played5 >= 3) {
      const gdH = (hs.avg_gf5 || 0) - (hs.avg_ga5 || 0);
      const gdA = (as_.avg_gf5 || 0) - (as_.avg_ga5 || 0);
      if (Math.abs(gdH - gdA) >= 0.8) {
        const leader = gdH > gdA ? (home?.short || home?.name) : (away?.short || away?.name);
        const leadStats = gdH > gdA ? hs : as_;
        reasons.push({
          type: 'gd',
          icon: '⚽',
          text: `Différentiel buts favorable à ${leader} (${leadStats.avg_gf5.toFixed(1)} marqués / ${leadStats.avg_ga5.toFixed(1)} encaissés sur 5)`
        });
      }
    }
    // Records
    if (recH && recA && recH.games > 3 && recA.games > 3) {
      const wrH = (recH.w + recH.d*0.5) / Math.max(recH.games, 1);
      const wrA = (recA.w + recA.d*0.5) / Math.max(recA.games, 1);
      if (Math.abs(wrH - wrA) > 0.12) {
        const leader = wrH > wrA ? (home?.short || home?.name) : (away?.short || away?.name);
        reasons.push({
          type: 'record',
          icon: '📈',
          text: `Bilan saison avantage ${leader} (${recH.w}-${recH.d}-${recH.l} vs ${recA.w}-${recA.d}-${recA.l})`
        });
      }
    }
    // Rankings
    const rankH2 = home?.rank, rankA2 = away?.rank;
    if (rankH2 && rankA2 && Math.abs(rankH2 - rankA2) >= 3) {
      const leader = rankH2 < rankA2 ? (home?.short || home?.name) : (away?.short || away?.name);
      reasons.push({
        type: 'rank',
        icon: '🏆',
        text: `Classement #${rankH2} vs #${rankA2} — avantage ${leader}`
      });
    }
    // v30 — Tennis Sackmann reasons (when tennis_features attached).
    // Surface Elo, last-10 form, fatigue 14j, all surfaced as user-readable
    // sentences in "Pourquoi ce pronostic". Honesty caveat retained but
    // ONLY shown when no Sackmann data is available (challenger/qualifier).
    if (match.sport === 'tennis') {
      const ts = tennisStats;
      if (ts && typeof ts.surface_elo_diff === 'number' && Math.abs(ts.surface_elo_diff) >= 50) {
        const leader = ts.surface_elo_diff > 0 ? (home?.short || home?.name) : (away?.short || away?.name);
        // Avoid the misleading "avantage X sur cette surface" text when we
        // didn't actually identify a surface — fall back to a generic Elo
        // global label so the user knows the surface lookup didn't fire.
        const surfLabel = ts.surface ? `Elo ${ts.surface}` : 'Elo joueur';
        reasons.push({
          type: 'tennis_surface_elo',
          icon: ts.surface === 'Clay' ? '🟧' : ts.surface === 'Grass' ? '🟩' : '🏆',
          text: `${surfLabel} : avantage ${leader} (+${Math.round(Math.abs(ts.surface_elo_diff))} pts)`,
        });
      }
      if (ts && ts.home_last10 && ts.away_last10) {
        // v30 fix : prefer the pre-computed wins_last10 from the patcher
        // over re-counting characters here — tournament-walkover entries
        // can show as 'WW' / 'LL' in the string but already corrected in
        // wins_last10 by the upstream cleaner. Falls back to the regex
        // when the field is missing on legacy data.
        const hW = (typeof ts.home_wins_last10 === 'number') ? ts.home_wins_last10 : (ts.home_last10.match(/W/g) || []).length;
        const aW = (typeof ts.away_wins_last10 === 'number') ? ts.away_wins_last10 : (ts.away_last10.match(/W/g) || []).length;
        if (Math.abs(hW - aW) >= 2) {
          const leader = hW > aW ? (home?.short || home?.name) : (away?.short || away?.name);
          reasons.push({
            type: 'tennis_form10',
            icon: '🔥',
            text: `Forme : ${leader} ${Math.max(hW, aW)}/10 vs ${Math.min(hW, aW)}/10`,
          });
        }
      }
      // H2H tennis (Sackmann) — pair-wise history. Surfaced when ≥2 matches
      // played together, since 1-encounter is noise. The reason text shows
      // the cumulative score and the last-meeting recap.
      if (ts && typeof ts.h2h_home_wins === 'number' && typeof ts.h2h_away_wins === 'number') {
        const hW = ts.h2h_home_wins, aW = ts.h2h_away_wins, tot = hW + aW;
        if (tot >= 2) {
          const leader = hW > aW ? (home?.short || home?.name) : (aW > hW ? (away?.short || away?.name) : null);
          let text;
          if (leader && Math.abs(hW - aW) >= 1) {
            text = `Face-à-face : ${leader} mène ${Math.max(hW,aW)}-${Math.min(hW,aW)} sur ${tot} confrontation${tot>1?'s':''}`;
          } else {
            text = `Face-à-face : ${tot} confrontation${tot>1?'s':''}, série ${hW}-${aW}`;
          }
          if (ts.h2h_last_date) {
            text += ` · dernière le ${ts.h2h_last_date}`;
          }
          reasons.push({ type: 'tennis_h2h', icon: '⚔️', text });
        }
      }
      // Only surface a fatigue reason when one side is BOTH at the threshold
      // AND clearly more loaded than the other. Without the gap test, two
      // equally tired players (e.g. 6 vs 6) trigger an arbitrary "tired
      // X" reason that misleads the user.
      if (ts && (ts.home_fatigue >= 5 || ts.away_fatigue >= 5) && Math.abs((ts.home_fatigue || 0) - (ts.away_fatigue || 0)) >= 2) {
        const tired = ts.home_fatigue > ts.away_fatigue ? (home?.short || home?.name) : (away?.short || away?.name);
        const cnt = Math.max(ts.home_fatigue, ts.away_fatigue);
        reasons.push({
          type: 'tennis_fatigue',
          icon: '😮‍💨',
          text: `Fatigue : ${tired} ${cnt} matchs sur les 14 derniers jours`,
        });
      }
      // Honesty caveat only when NO Sackmann data was matched
      if (!ts) {
        reasons.push({
          type: 'tennis_caveat',
          icon: '⚠️',
          text: `Tennis : joueur non répertorié dans la base ATP/WTA — pick plus volatile (rank seul)`,
        });
      }
    }
    // v30 — NHL pace + goalie reasons. Pace gap ≥ 1.0/game = surface;
    // goalie SV% gap ≥ 0.015 = surface (replacement-level vs starter
    // territory).
    if (match.sport === 'hockey' && nhlStats) {
      if (Math.abs(nhlStats.pace_diff) >= 1.0) {
        const better = nhlStats.pace_diff > 0 ? (home?.short || home?.name) : (away?.short || away?.name);
        const betterPace = nhlStats.pace_diff > 0 ? nhlStats.home_pace : nhlStats.away_pace;
        const worsePace = nhlStats.pace_diff > 0 ? nhlStats.away_pace : nhlStats.home_pace;
        reasons.push({
          type: 'nhl_pace',
          icon: '🏒',
          text: `Différentiel buts : ${better} ${betterPace>=0?'+':''}${betterPace.toFixed(2)}/m vs ${worsePace>=0?'+':''}${worsePace.toFixed(2)}/m`,
        });
      }
      if (nhlStats.home_goalie?.save_pct && nhlStats.away_goalie?.save_pct) {
        const svH = nhlStats.home_goalie.save_pct;
        const svA = nhlStats.away_goalie.save_pct;
        const svDiff = svH - svA;
        if (Math.abs(svDiff) >= 0.015) {
          const betterG = svDiff > 0 ? nhlStats.home_goalie : nhlStats.away_goalie;
          const worseG = svDiff > 0 ? nhlStats.away_goalie : nhlStats.home_goalie;
          reasons.push({
            type: 'nhl_goalie',
            icon: '🥅',
            text: `Goalie : ${betterG.name} SV% ${(betterG.save_pct*100).toFixed(1)}% vs ${worseG.name} ${(worseG.save_pct*100).toFixed(1)}%`,
          });
        }
      }
    }
    // v30 — MLB probable pitchers reason. ERA gap >= 0.50 = meaningful;
    // below that the pitchers are roughly equivalent and the reason adds
    // noise. K/9 + WHIP append when gap is sharp.
    if (match.sport === 'baseball' && pitcherStats) {
      const ps = pitcherStats;
      const hp = ps.home, ap = ps.away;
      const eraDiff = ps.era_diff;  // positive = home pitcher better
      if (Math.abs(eraDiff) >= 0.50) {
        const better = eraDiff > 0 ? (home?.short || home?.name) : (away?.short || away?.name);
        const worse = eraDiff > 0 ? (away?.short || away?.name) : (home?.short || home?.name);
        const betterEra = eraDiff > 0 ? hp.era : ap.era;
        const worseEra = eraDiff > 0 ? ap.era : hp.era;
        reasons.push({
          type: 'mlb_pitcher_era',
          icon: '⚾',
          text: `Pitchers : ${better} ERA ${betterEra.toFixed(2)} vs ${worse} ERA ${worseEra.toFixed(2)}`,
        });
      } else if (hp.name && ap.name) {
        // Below threshold but still worth surfacing the matchup neutral
        reasons.push({
          type: 'mlb_pitcher_matchup',
          icon: '⚾',
          text: `Pitchers : ${hp.name} (${hp.era?.toFixed(2) || '—'}) vs ${ap.name} (${ap.era?.toFixed(2) || '—'})`,
        });
      }
    }
    // Buts attendus (modèle statistique football) — Chantier L : renommé
    // pour éviter le jargon "Poisson" côté UI.
    if (poi) {
      reasons.push({
        type: 'xg',
        icon: '⚽',
        text: `Buts attendus : ${poi.lamH.toFixed(2)} – ${poi.lamA.toFixed(2)}`
      });
    }
    // Puissance d'équipe (signal ELO, Chantier 9) — Chantier L : libellé
    // allégé, on retire le sigle "Elo" du texte visible. Le signal reste
    // actif dans le modèle, on surface uniquement l'écart significatif.
    if (eloStats && Math.abs(eloStats.diff) >= 30) {
      const leaderElo = eloStats.diff > 0 ? (home?.short || home?.name) : (away?.short || away?.name);
      const diffAbs = Math.abs(eloStats.diff);
      reasons.push({
        type: 'elo',
        icon: '📊',
        text: `Force : +${diffAbs} points d'écart — avantage ${leaderElo}`
      });
    }
    // v30 — League calibration depuis Football-Data.co.uk (fd_calibration).
    // Surface uniquement quand la moyenne diffère franchement de 2.6 (baseline
    // européen) ou que le BTTS rate est extrême. Sert à contextualiser le
    // pari OU 2.5 / BTTS pour l'utilisateur.
    if (match.fd_calibration && match.sport === 'football') {
      const cal = match.fd_calibration;
      const bits = [];
      if (typeof cal.avg_goals === 'number') bits.push(`${cal.avg_goals.toFixed(2)} buts/m`);
      if (typeof cal.btts_rate === 'number') bits.push(`BTTS ${Math.round(cal.btts_rate * 100)}%`);
      if (typeof cal.over25_rate === 'number') bits.push(`+2.5 ${Math.round(cal.over25_rate * 100)}%`);
      if (bits.length) {
        reasons.push({
          type: 'fd_calibration',
          icon: '📊',
          text: `Ligue (sur ${cal.n} matchs) : ${bits.join(' · ')}`,
        });
      }
    }
    // v30 — Closing line value (fd_closing_odds, matchs déjà joués + foot
    // top-5 majeurs uniquement). Affiché en post-match pour montrer si le
    // pick a battu la closing line réelle.
    if (match.fd_closing_odds && match.completed && best) {
      const cl = match.fd_closing_odds.avg || match.fd_closing_odds.b365 || match.fd_closing_odds.pinnacle;
      if (cl) {
        const pickKey = best_pick[2];
        const closingOdd = pickKey === '1' ? cl.home : pickKey === '2' ? cl.away : cl.draw;
        const ourOdd = pickKey === '1' ? best.home : pickKey === '2' ? best.away : best.draw;
        if (closingOdd && ourOdd) {
          const clv = ((1 / closingOdd) - (1 / ourOdd)) * 100;  // pp
          const sign = clv > 0 ? '+' : '';
          reasons.push({
            type: 'clv',
            icon: clv > 0 ? '📈' : '📉',
            text: `CLV : ${sign}${clv.toFixed(1)}pt (notre cote ${ourOdd.toFixed(2)} vs closing ${closingOdd.toFixed(2)})`,
          });
        }
      }
    }
    // Fixture congestion — surface when a side has ≥3 matches in a 7-day
    // window. ≥3 in 7d is the canonical fatigue threshold used by coaches
    // when asking for rotation; ≤2 is normal for cup-week schedules.
    if (congestionStats && (congestionStats.home >= 3 || congestionStats.away >= 3)) {
      const tired = congestionStats.home >= congestionStats.away
        ? { team: home?.short || home?.name, cnt: congestionStats.home }
        : { team: away?.short || away?.name, cnt: congestionStats.away };
      reasons.push({
        type: 'congestion',
        icon: '🏃',
        text: `${tired.team} ${tired.cnt} matchs en 7j — fatigue possible`
      });
    }
    // v31.7.6 — Repos / fatigue extreme. Affiche seulement les cas notables :
    // un cote a moins de 3j de repos (ou plus de 9j) et l'autre dans la fenetre
    // optimum.
    if (restStats && (restStats.home != null || restStats.away != null)) {
      const flag = (d) => d != null && (d < 3 || d > 9);
      if (flag(restStats.home) || flag(restStats.away)) {
        const homeBad = flag(restStats.home);
        const awayBad = flag(restStats.away);
        let text = '';
        if (homeBad && awayBad) {
          text = `Repos atypique des deux cotes : ${home?.short || 'home'} ${restStats.home}j / ${away?.short || 'away'} ${restStats.away}j`;
        } else if (homeBad) {
          const lbl = restStats.home < 3 ? 'fatigue (< 3j de repos)' : 'rouille (> 9j sans match)';
          text = `${home?.short || 'home'} : ${lbl} (${restStats.home}j depuis dernier match)`;
        } else if (awayBad) {
          const lbl = restStats.away < 3 ? 'fatigue (< 3j de repos)' : 'rouille (> 9j sans match)';
          text = `${away?.short || 'away'} : ${lbl} (${restStats.away}j depuis dernier match)`;
        }
        reasons.push({
          type: 'rest',
          icon: '😴',
          text,
        });
      }
    }
    // v31.7.12 — Voyage longue distance reason (US sports : NBA/NHL/MLB).
    if (travelStats && (travelStats.away_km != null || travelStats.home_km != null)) {
      const longSide = (travelStats.away_km != null && travelStats.away_km >= 2000)
        ? { team: away?.short || away?.name, km: travelStats.away_km, side: 'away' }
        : (travelStats.home_km != null && travelStats.home_km >= 2000)
          ? { team: home?.short || home?.name, km: travelStats.home_km, side: 'home' }
          : null;
      if (longSide) {
        const lbl = longSide.km >= 3500 ? 'voyage transcontinental' : 'voyage long';
        reasons.push({
          type: 'travel',
          icon: '✈️',
          text: `${longSide.team} : ${lbl} (${longSide.km}km depuis dernier match)`
        });
      }
    }
    // Referee — surface when strict/lenient (nudge applied) OR when
    // neutral but we have the name (informative only).
    if (refStats) {
      const bits = [];
      if (refStats.yellowPerGame != null) bits.push(`${refStats.yellowPerGame.toFixed(1)} jaunes/m`);
      if (refStats.redPerGame != null && refStats.redPerGame > 0.05) bits.push(`${refStats.redPerGame.toFixed(2)} rouges/m`);
      let label = '';
      if (refStats.tier === 'strict') label = 'Arbitre sévère';
      else if (refStats.tier === 'lenient') label = 'Arbitre laxiste';
      else label = 'Arbitre';
      // v30 — flag the red-card axis if it dragged xG: redDelta < 0 means
      // the ref's red-card frequency cost ~lam goals on each side.
      const redFlag = refStats.redDelta && refStats.redDelta < 0
        ? ` — rouges fréquents → buts attendus ↓`
        : '';
      reasons.push({
        type: 'referee',
        icon: '🟨',
        text: `${label} : ${refStats.name}${bits.length ? ` (${bits.join(', ')})` : ''}${redFlag}`
      });
    }
    // Weather — significant rain/wind/cold detected, total goals nudged down.
    if (weatherStats) {
      const bits = [];
      if (typeof weatherStats.precip === 'number' && weatherStats.precip > 1) {
        bits.push(`pluie ${weatherStats.precip.toFixed(1)}mm/h`);
      }
      if (typeof weatherStats.wind === 'number' && weatherStats.wind > 20) {
        bits.push(`vent ${Math.round(weatherStats.wind)}km/h`);
      }
      if (typeof weatherStats.temp === 'number' && weatherStats.temp < 5) {
        bits.push(`${weatherStats.temp.toFixed(0)}°C`);
      }
      if (bits.length) {
        const icon = weatherStats.dominant === 'cold' ? '🥶'
                   : weatherStats.dominant === 'wind' ? '💨'
                   : '🌧️';
        reasons.push({
          type: 'weather',
          icon,
          text: `Météo ${weatherStats.city || ''}${weatherStats.city ? ' : ' : ''}${bits.join(', ')} — xG réduits`
        });
      }
    }
    // H2H
    if (h2hStats) {
      const { homeWins, awayWins, draws, n } = h2hStats;
      if (homeWins > awayWins) {
        reasons.push({
          type: 'h2h',
          icon: '⚔️',
          text: `Face-à-face : ${home?.short || home?.name} mène ${homeWins}-${awayWins}${draws?`-${draws}`:''} (sur ${n} derniers)`
        });
      } else if (awayWins > homeWins) {
        reasons.push({
          type: 'h2h',
          icon: '⚔️',
          text: `Face-à-face : ${away?.short || away?.name} mène ${awayWins}-${homeWins}${draws?`-${draws}`:''} (sur ${n} derniers)`
        });
      } else if (draws > 0) {
        reasons.push({
          type: 'h2h',
          icon: '⚔️',
          text: `Face-à-face : ${draws} nul${draws>1?'s':''} sur les ${n} derniers (rivalité serrée)`
        });
      }
    }
    // Home/away split (non-football)
    if (hrComp) {
      reasons.push({
        type: 'venue',
        icon: '🏠',
        text: `Split domicile/extérieur favorise ${hrComp.pH > hrComp.pA ? (home?.short || home?.name) : (away?.short || away?.name)}`
      });
    }
    // v30 — Form momentum (last-3 vs last-5). Surface only when the trend
    // is meaningful (≥0.10 absolute delta) so we don't add noise.
    if (momentumStats && Math.abs(momentumStats.diff) >= 0.10) {
      const heating = momentumStats.diff > 0
        ? (home?.short || home?.name)
        : (away?.short || away?.name);
      reasons.push({
        type: 'momentum',
        icon: '📈',
        text: `Dynamique en hausse pour ${heating} (3 derniers > 5 derniers)`
      });
    }
    // v30 — Defensive quality / attacking drought (cleans + failed_to_score).
    // Surface when one side's defense or one side's attack stands out
    // enough to actually scale lamH or lamA.
    if (cleanSheetStats) {
      const reasonsCS = [];
      if (cleanSheetStats.homeCleans >= 3) reasonsCS.push(`${home?.short || home?.name} : ${cleanSheetStats.homeCleans} clean sheets/5`);
      if (cleanSheetStats.awayCleans >= 3) reasonsCS.push(`${away?.short || away?.name} : ${cleanSheetStats.awayCleans} clean sheets/5`);
      if (cleanSheetStats.homeFailed >= 3) reasonsCS.push(`${home?.short || home?.name} muets ${cleanSheetStats.homeFailed}/5`);
      if (cleanSheetStats.awayFailed >= 3) reasonsCS.push(`${away?.short || away?.name} muets ${cleanSheetStats.awayFailed}/5`);
      if (reasonsCS.length) {
        reasons.push({
          type: 'cleansheets',
          icon: '🛡️',
          text: `Profil défense/attaque : ${reasonsCS.join(' · ')} — buts attendus ajustés`
        });
      }
    }
    // v30 — Lineup confirmation (foot only). Confirmé = signal frais,
    // predicted = doute, absent sur top-5 = pénalité subtile.
    if (lineupStats) {
      let txt = '';
      if (lineupStats.homeConfirmed && lineupStats.awayConfirmed) {
        txt = 'Compositions confirmées des deux côtés — fiabilité accrue';
      } else if (lineupStats.homeConfirmed || lineupStats.awayConfirmed) {
        const which = lineupStats.homeConfirmed ? (home?.short || home?.name) : (away?.short || away?.name);
        txt = `Composition confirmée pour ${which}`;
      } else {
        txt = 'Compositions encore prédictives — incertitude résiduelle';
      }
      reasons.push({ type: 'lineup', icon: '📋', text: txt });
    }
    // Injuries — quantify the model impact so Théo can audit why a pick shifted.
    // Reuses the same formula as the combine step: shift = min(0.06, 0.015·(injH−injA)).
    const injHexpl = match.injuries_home || 0;
    const injAexpl = match.injuries_away || 0;
    const soccerInjUnknownExplH = match.injuries_source === 'sofascore' && match.injuries_home_known === false;
    const soccerInjUnknownExplA = match.injuries_source === 'sofascore' && match.injuries_away_known === false;
    if ((injHexpl >= 2 || injAexpl >= 2) && !soccerInjUnknownExplH && !soccerInjUnknownExplA) {
      const parts = [];
      if (injHexpl >= 2) parts.push(`${injHexpl} absents ${home?.short || home?.name}`);
      if (injAexpl >= 2) parts.push(`${injAexpl} absents ${away?.short || away?.name}`);
      const shiftRaw = Math.min(0.06, 0.015 * Math.abs(injHexpl - injAexpl));
      const shiftPct = (shiftRaw * 100).toFixed(1);
      const whoBenefits = injHexpl > injAexpl ? (away?.short || away?.name) : (home?.short || home?.name);
      const impactTxt = shiftRaw > 0 ? ` · impact modèle : ${shiftPct}% en faveur de ${whoBenefits}` : '';
      reasons.push({
        type: 'injury',
        icon: '🏥',
        text: parts.join(' · ') + impactTxt
      });
    }
    // Tipsters consensus
    if (match.tips && match.tips.length >= 2) {
      const votes = { '1': 0, 'X': 0, '2': 0 };
      match.tips.forEach(t => {
        const p = String(t.pick || '').toUpperCase();
        if (p.includes(home?.name?.toUpperCase() || '__') || p.startsWith('1 ')) votes['1']++;
        else if (p === 'X' || p.includes('NUL') || p.includes('DRAW')) votes['X']++;
        else if (p.includes(away?.name?.toUpperCase() || '__') || p.startsWith('2 ')) votes['2']++;
      });
      const top = Object.entries(votes).sort((a,b) => b[1]-a[1])[0];
      if (top[1] >= 2) {
        reasons.push({
          type: 'tipsters',
          icon: '👥',
          text: `${top[1]}/${match.tips.length} tipsters sur ${top[0]}`
        });
      }
    }
    // ======= Reliability (multi-source meta-confidence) =======
    // The raw pickProb (best_pick[1]) is our best probability estimate and
    // remains authoritative for EV math. But for the UI "fiabilité" gauge
    // and tier bucketing, a richer score is more useful: it blends
    //   (a) the pick's raw prob,
    //   (b) the agreement between components (low dispersion → high conf),
    //   (c) signal richness (more components present → more reliable).
    // Component agreement is what a seasoned bettor calls "consensus" —
    // when odds, Poisson, Elo, record and H2H all agree on the same side,
    // the pick is dramatically more trustworthy than when they tug against
    // each other.
    let reliability = best_pick[1];
    let reliabilityMeta = null;
    // Chantier F: only non-market components feed the reliability blend.
    // Market odds are skipped via the isMarket flag (they still shape `final`
    // above so the pick label exists, but they do NOT contribute to fiabilité).
    let pureCompCount = 0;
    {
      const pickKey = best_pick[2]; // '1' | 'X' | '2'
      const fieldMap = { '1': 'pH', 'X': 'pD', '2': 'pA' };
      const field = fieldMap[pickKey];
      const pureComponents = components.filter(c => !c.isMarket);
      const compProbs = pureComponents
        .map(c => (c && typeof c[field] === 'number') ? c[field] : null)
        .filter(x => x != null);
      pureCompCount = compProbs.length;
      const pickProbVal = best_pick[1];
      // Signal richness — saturates at 4 now that market is excluded (max pool
      // = poisson + hr + record + elo + h2h = 5 but 3-4 is realistic).
      const richness = Math.min(1, Math.max(0, compProbs.length / 4));
      let agreement = 0.5;  // neutral if we can't compute
      if (compProbs.length >= 2) {
        const mean = compProbs.reduce((a,b) => a+b, 0) / compProbs.length;
        const variance = compProbs.reduce((a,b) => a + (b - mean)*(b - mean), 0) / compProbs.length;
        const sd = Math.sqrt(variance);
        // sd=0 → 1.0 (perfect consensus); sd=0.15+ → 0.0 (sharp disagreement).
        // 0.15 chosen because a 15-pt dispersion on the pick's prob (e.g. one
        // component says 45%, another says 75%) is the practical "divergence"
        // threshold where the combined estimate should be distrusted.
        agreement = Math.max(0, Math.min(1, 1 - sd / 0.15));
      }
      // Blend: agreement weighted 0.70, richness weighted 0.30. Boost factor
      // maps to [0.85, 1.08] so reliability can be modestly higher OR lower
      // than pickProb — never runaway.
      const blend = 0.70 * agreement + 0.30 * richness;
      const boost = 0.85 + 0.23 * blend;
      let rawReliability = Math.max(0.25, Math.min(0.98, pickProbVal * boost));
      // v30 — Apply lineup confirmation bump *before* calibration so the
      // calibration diagram sees a coherent reliability distribution
      // (otherwise we'd ship the boost downstream of the historic mapping
      // and overshoot at the high end).
      if (lineupBoost) {
        rawReliability = Math.max(0.25, Math.min(0.98, rawReliability + lineupBoost));
      }
      // Chantier F calibration — remap raw reliability to historical observed
      // WR using the live reliability diagram. Prevents systematic over/under-
      // confidence. Returns raw value unchanged if calibration data is thin.
      const calibrated = applyReliabilityCalibration(rawReliability);
      reliability = calibrated;
      reliabilityMeta = {
        pickProb: pickProbVal,
        componentCount: compProbs.length,
        agreement: Math.round(agreement * 100) / 100,
        richness: Math.round(richness * 100) / 100,
        boost: Math.round(boost * 1000) / 1000,
        rawReliability: Math.round(rawReliability * 1000) / 1000,
        calibrated: Math.abs(calibrated - rawReliability) > 0.005,
        lineupBoost: lineupBoost ? Math.round(lineupBoost * 1000) / 1000 : 0,
      };
    }

    // Generate a one-sentence headline summary
    let headline = '';
    const conf = reliability;  // headline speaks to the UX confidence, not raw prob
    if (conf >= 0.72) headline = `Pari très solide — fiabilité ${(conf*100).toFixed(0)}%`;
    else if (conf >= 0.60) headline = `Bon pari — fiabilité ${(conf*100).toFixed(0)}%`;
    else if (conf >= 0.50) headline = `Pari jouable — fiabilité ${(conf*100).toFixed(0)}%`;
    else headline = `Incertain — fiabilité ${(conf*100).toFixed(0)}%, préférer un autre match`;

    return {
      probs: final,
      pick: { label: best_pick[0], prob: best_pick[1], key: best_pick[2], team: best_pick[3] },
      // Reliability = meta-confidence (consensus × richness × pickProb).
      // Used by UI gauges and tier bucketing.
      reliability,
      reliabilityMeta,
      odds: best,
      hasDraw,
      // Chantier F thresholds (2026-04-21, pur modèle + calibré) :
      //   isLock ≥ 0.70 — cible du 80%+ WR, aligné sur la calibration historique
      //   lowConf < 0.50 — downgrade visuel
      //   skip < 0.45 OR fewer than 2 pure-model components — ne surface pas
      // Le seuil isLock est descendu 0.72→0.70 car après calibration le modèle
      // est monotone : ce qu'on mesure à 70% correspond vraiment à ~70% de WR.
      // v30 — Sports avec petit échantillon backtest (basket/hockey/baseball/
      // tennis : <10 picks réglés en historique calibration) → seuil isLock
      // remonté à 0.75 pour éviter de surfacer des locks sur-confiants quand
      // la calibration historique manque de signal.
      isLock: (() => {
        const thinSports = new Set(['tennis', 'basketball', 'hockey', 'baseball']);
        return thinSports.has(match.sport)
          ? reliability >= 0.75
          : reliability >= 0.70;
      })(),
      lowConf: reliability < 0.50,
      // Defensive skip — without ≥2 non-market components the reliability
      // isn't a consensus, it's basically pickProb×boost. User's ultra-selective
      // spec (5-10 picks/j, 80%+ WR) demands real signal consensus.
      // Tennis exception: ATP/WTA rank alone is a strong non-market signal
      // (tennis outcomes correlate ~0.7 with rank diff), so 1 component suffices.
      // v30 — Tennis skip relâché quand on a Sackmann tennis_features
      // (surface elo + form L10 + fatigue), car on a maintenant 4 signaux
      // non-marché et plus seulement le rank. Si on est rank-only (joueur
      // hors-base Sackmann, challenger / qualifier), on garde le skip strict
      // sur ranks proches (|log gap| < 0.30) où le rank seul est unreliable.
      skip: reliability < 0.45
        || pureCompCount < (match.sport === 'tennis' ? 1 : 2)
        || (match.sport === 'tennis'
            && !match.tennis_features
            && home?.rank && away?.rank
            && Math.abs(Math.log(Number(away.rank)) - Math.log(Number(home.rank))) < 0.30),
      // v30 — Sports with thin backtest history (basketball/hockey n<10 in
      // backtest_v2) get a stricter lock threshold: 0.75 instead of 0.70.
      // Avoids over-confident "lock" labels on tiny samples.
      isLockStrict: reliability >= 0.75,
      poisson: poi ? { xgH: poi.lamH, xgA: poi.lamA } : null,
      // Scores probables — shape varie selon le sport (Chantier 6 + K) :
      //   foot   : array[{home, away, prob}] (legacy, kind 'exact' implicite)
      //   hockey : {kind:'exact', items:[{home,away,prob,label}], caption}
      //   basket : {kind:'basket', items:[{...}], total, margin, caption}
      //   tennis : {kind:'tennis', bestOf, items:[{...}], caption}
      // Rendu sur le modal match (openDetail) avec un switch par `kind`.
      scores: (() => {
        // v31.5 — k=10 (avant 3) pour que le filtre "score le plus probable
        // CONDITIONNEL au pick" trouve toujours un score cohérent. Ex : pick=1
        // mais top-3 globaux = [1-1, 0-0, 1-0] → l'affichage pickait 1-1
        // (incohérent visuellement avec un pick "home win"). Avec k=10 on
        // descend dans la queue jusqu'à un home-win. Coût mémoire : +7 floats
        // par match foot, négligeable.
        if (poi) return poissonTopScores(poi.lamH, poi.lamA, 10, 6, match.league_code);
        if (match.sport === 'hockey') return hockeyScorePrediction(match);
        if (match.sport === 'basketball') return basketScoreProjection(match);
        if (match.sport === 'tennis') {
          // pick.prob = proba de victoire du pick ; pMatchHome selon la key
          const ph = best_pick[2] === '1' ? best_pick[1] : (1 - best_pick[1]);
          return tennisScorePrediction(match, ph);
        }
        return null;
      })(),
      // Secondary markets derived from the same Poisson xG.
      // Only populated when the Poisson component exists (i.e. football + usable
      // standings). Gives Théo O/U 2.5 and BTTS reads with no extra scraping.
      markets: poi ? (() => {
        const mk = poissonMarkets(poi.lamH, poi.lamA, 2.5);
        if (!mk) return null;
        const ouPick = mk.pOver >= mk.pUnder
          ? { side: 'over',  label: 'Plus de 2.5 buts',  prob: mk.pOver,  key: 'O2.5' }
          : { side: 'under', label: 'Moins de 2.5 buts', prob: mk.pUnder, key: 'U2.5' };
        const bttsPick = mk.pBTTSyes >= mk.pBTTSno
          ? { side: 'yes', label: 'BTTS: Oui',  prob: mk.pBTTSyes, key: 'BTTS_Y' }
          : { side: 'no',  label: 'BTTS: Non',  prob: mk.pBTTSno,  key: 'BTTS_N' };
        return { ou: ouPick, btts: bttsPick, raw: mk };
      })() : null,
      components: components.map(c => ({ w: c.w, name: c.name, icon: c.icon, isMarket: !!c.isMarket })),
      // Chantier U — contributions chiffrées par signal. Pour chaque composant
      // (non marché), on expose sa proba pour le pick + son "delta" vs la
      // baseline (1/nOutcomes). Ça permet au UI d'afficher "Puissance +18%",
      // "H2H +8%", etc. — Théo comprend d'un coup d'œil ce qui a poussé
      // la prédiction dans ce sens.
      contributions: (() => {
        const pickKey = best_pick[2];
        const fieldMap = { '1': 'pH', 'X': 'pD', '2': 'pA' };
        const field = fieldMap[pickKey];
        const baseline = hasDraw ? (1/3) : 0.5;
        return components
          .filter(c => !c.isMarket && typeof c[field] === 'number')
          .map(c => ({
            name: c.name,
            icon: c.icon,
            pickProb: c[field],
            delta: c[field] - baseline,   // signed — positif si le signal pousse vers le pick
            w: c.w,
          }))
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
      })(),
      elo: eloStats,  // { home, away, diff } — surfaced on the match modal
      congestion: congestionStats,  // { home, away } — match count in ±7d window
      weather: weatherStats,  // { precip, wind, temp, penalty, dominant, city } or null
      referee: refStats,  // { name, yellowPerGame, redPerGame, games, tier, redDelta } or null
      momentum: momentumStats,  // { home, away, diff } trend in form L3 vs L5
      cleanSheets: cleanSheetStats,  // { homeCleans, awayCleans, lamHscale, lamAscale } or null
      lineup: lineupStats,  // { homeConfirmed, awayConfirmed, boost } or null
      tennis: tennisStats,  // { surface, surface_elo_diff, home_elo, ..., fatigue_nudge } or null
      pitchers: pitcherStats,  // { home, away, era_diff } for MLB or null
      nhl: nhlStats,  // { home_pace, away_pace, pace_diff, home_goalie, away_goalie } or null
      explain: { headline, reasons }
    };
  }

  // ======= DATA QUALITY — Chantier V =======
  // Retourne un score 0-4 + liste des sources présentes / manquantes.
  // Les 4 dimensions sont celles qui apportent le plus de signal au modèle
  // *en plus* des cotes + standings : composition/blessures, météo, H2H,
  // arbitre. Quand on a les 4, la fiabilité est significativement meilleure
  // que quand on n'en a qu'1 ou 2. Le badge permet à Théo d'un coup d'œil
  // de savoir si la prédiction est "riche" ou "light".
  function computeDataQuality(match) {
    if (!match) return { score: 0, max: 4, items: [] };
    // v30 — Score 4/4 sport-aware. Les axes spécifiques à un sport
    // (Sofascore foot top-5 pour blessures/lineups/arbitre, weather
    // pour outdoor) auto-OK quand la source n'existe pas pour ce sport,
    // pour ne pas pénaliser. Les matchs completed auto-OK aussi sur les
    // axes prédictifs (weather/lineups deviennent inutiles post-match).
    const sport = match.sport;
    const isCompleted = !!match.completed;
    const isFoot = sport === 'football';
    const SOFASCORE_LEAGUES = new Set(['eng.1','esp.1','ger.1','ita.1','fra.1']);
    const isFootTop5 = isFoot && SOFASCORE_LEAGUES.has(match.league_code);
    const ESPN_INJURY_SPORTS = new Set(['basketball','hockey','baseball','american-football']);
    const hasInjurySource = isFootTop5 || ESPN_INJURY_SPORTS.has(sport);
    const ESPN_H2H_SPORTS = new Set(['football','basketball','hockey','tennis']);
    const hasH2HSource = ESPN_H2H_SPORTS.has(sport);
    const hasWeatherSource = isFootTop5;
    const hasRefSource = isFootTop5;

    const items = [];
    // 1. Cotes : universel
    const hasOdds = !!(match.winamax?.markets || (match.odds && match.odds.length));
    items.push({ key: 'odds', label: 'Cotes', ok: hasOdds, icon: '💰' });
    // 2. Compos / blessures (sport-aware)
    const injuriesOk = !hasInjurySource || isCompleted
      ? true
      : (match.injuries_home != null && match.injuries_home >= 0) ||
        (match.injuries_away != null && match.injuries_away >= 0) ||
        !!match.injuries_source;
    items.push({ key: 'injuries', label: hasInjurySource ? 'Compos / Blessures' : 'Compos (N/A pour ce sport)', ok: injuriesOk, icon: '🏥' });
    // 3. Face-à-face
    const h2hOk = !hasH2HSource ? true
      : !!(match.h2h && Array.isArray(match.h2h.meetings) && match.h2h.meetings.length >= 1);
    items.push({ key: 'h2h', label: hasH2HSource ? 'Face-à-face' : 'H2H (N/A pour ce sport)', ok: h2hOk, icon: '⚔️' });
    // 4. Conditions sport-specific
    let conditionsOk, conditionsLabel, conditionsIcon;
    if (hasWeatherSource && !isCompleted) {
      const hasWeather = !!(match.weather && (typeof match.weather.precip_mm === 'number'
        || typeof match.weather.wind_kmh === 'number'
        || typeof match.weather.temp_c === 'number'));
      const hasRef = !hasRefSource ? true : !!(match.referee && match.referee.name);
      conditionsOk = hasWeather && hasRef;
      conditionsLabel = `Météo${hasRefSource ? ' + arbitre' : ''}`;
      conditionsIcon = '🌤️';
    } else if (sport === 'tennis') {
      const comps = match.competitors || [];
      conditionsOk = comps.length >= 2 && !!comps[0]?.rank && !!comps[1]?.rank;
      conditionsLabel = 'Classement ATP/WTA';
      conditionsIcon = '🏆';
    } else if (sport === 'basketball' || sport === 'hockey' || sport === 'baseball') {
      const comps = match.competitors || [];
      const hasSplit = comps.some(c => (c.records || []).some(r => /home|road|away/i.test(r.type || r.name || '')));
      conditionsOk = hasSplit;
      conditionsLabel = 'Splits dom/ext';
      conditionsIcon = '🏠';
    } else if (isFoot) {
      const comps = match.competitors || [];
      const hasFormStats = comps.some(c => c.form_stats?.played5 >= 3);
      const hasForm = comps.some(c => c.form && c.form.length >= 3);
      conditionsOk = hasFormStats || hasForm;
      conditionsLabel = 'Forme récente';
      conditionsIcon = '🔥';
    } else {
      conditionsOk = true;
      conditionsLabel = 'Contexte (N/A)';
      conditionsIcon = '🌤️';
    }
    items.push({ key: 'conditions', label: conditionsLabel, ok: conditionsOk, icon: conditionsIcon });

    const score = items.filter(i => i.ok).length;
    return { score, max: 4, items };
  }
  // v30 — Expose pour debugging (window.__diag + audit user).
  if (typeof window !== 'undefined') window.computeDataQuality = computeDataQuality;

  // Chantier W — évalue la position du pick EN CE MOMENT sur un match live.
  // Retourne 'winning' | 'losing' | 'tied' | null (null si pas de score ou pas live).
  function evaluateLivePick(match, pred) {
    if (!match || !pred) return null;
    const status = match.status || '';
    const isLive = status === 'STATUS_IN_PROGRESS';
    if (!isLive) return null;
    const { home, away } = getSides(match);
    const hs = parseInt(home?.score ?? '', 10);
    const as = parseInt(away?.score ?? '', 10);
    if (isNaN(hs) || isNaN(as)) return null;
    const key = pred.pick?.key;
    if (key === '1') return hs > as ? 'winning' : hs === as ? 'tied' : 'losing';
    if (key === '2') return as > hs ? 'winning' : hs === as ? 'tied' : 'losing';
    if (key === 'X') return hs === as ? 'winning' : 'losing';  // nul en cours
    return null;
  }

  // ======= RESULT EVALUATION =======
  // For completed matches, returns 'won' | 'lost' | 'void' | null
  function evaluateModelPick(match, pred) {
    if (!match?.completed || !pred) return null;
    const { home, away } = getSides(match);
    const hs = parseInt(home?.score ?? '', 10);
    const as = parseInt(away?.score ?? '', 10);
    if (isNaN(hs) || isNaN(as)) return null;
    const key = pred.pick.key;
    if (key === '1') return hs > as ? 'won' : 'lost';
    if (key === '2') return as > hs ? 'won' : 'lost';
    if (key === 'X') return hs === as ? 'won' : 'lost';
    return null;
  }

  // For tipster picks (free-text labels like "Victoire Marseille", "Match nul",
  // "Match nul ou Manchester United", "X ou 2", etc.)
  function evaluateTipsterPick(label, match) {
    if (!label || !match?.completed) return null;
    const { home, away } = getSides(match);
    const hs = parseInt(home?.score ?? '', 10);
    const as = parseInt(away?.score ?? '', 10);
    if (isNaN(hs) || isNaN(as)) return null;

    const lab = label.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // strip accents
    const hn = (home?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const an = (away?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const htok = hn.split(/\s+/).filter(t => t.length > 2);
    const atok = an.split(/\s+/).filter(t => t.length > 2);
    const mentionsHome = htok.some(t => lab.includes(t));
    const mentionsAway = atok.some(t => lab.includes(t));
    const mentionsDraw = /\bnul\b|\bdraw\b|\bmatch nul\b/.test(lab);

    // Determine match outcome
    const outHome = hs > as, outDraw = hs === as, outAway = as > hs;

    // "Match nul ou X": double chance with draw
    // "X ou Y": ambiguous -- try both sides
    if (mentionsDraw && mentionsHome && !mentionsAway) {
      return (outDraw || outHome) ? 'won' : 'lost';
    }
    if (mentionsDraw && mentionsAway && !mentionsHome) {
      return (outDraw || outAway) ? 'won' : 'lost';
    }
    if (mentionsDraw && !mentionsHome && !mentionsAway) {
      return outDraw ? 'won' : 'lost';
    }
    if (mentionsHome && !mentionsAway && !mentionsDraw) {
      return outHome ? 'won' : 'lost';
    }
    if (mentionsAway && !mentionsHome && !mentionsDraw) {
      return outAway ? 'won' : 'lost';
    }
    // Both home and away? Could be "1 ou 2" (rare) or tipster text is too ambiguous.
    return null;
  }

  function resultBadgeHtml(result, odds) {
    if (!result) return '';
    if (result === 'won') {
      const gain = odds ? ` · +${((odds - 1) * 100).toFixed(0)}%` : '';
      return `<span class="result-badge won">✓ Gagné${gain}</span>`;
    }
    if (result === 'lost') return `<span class="result-badge lost">✗ Perdu</span>`;
    return `<span class="result-badge void">◦ Annulé</span>`;
  }

  // Confidence tiers aligned with the bilan buckets (High ≥65%, Mid 55-65%,
  // Low 50-55%, very low < 50%). Calibration du 2026-04-18 : High ≈ 83% WR,
  // Low ≈ 46% WR (noise). Garder 3 tiers + "trop faible" pour ne pas polluer.
  function confLabel(p) {
    if (p >= 0.72) return { lbl: 'Très sûr',  cls: 'high',  color: '#34d399' };
    if (p >= 0.65) return { lbl: 'Sûr',       cls: 'high',  color: '#34d399' };
    if (p >= 0.55) return { lbl: 'Favorable', cls: 'med',   color: '#a78bfa' };
    if (p >= 0.50) return { lbl: 'Serré',     cls: 'low',   color: '#fbbf24' };
    return            { lbl: 'Incertain',     cls: 'vlow',  color: '#f87171' };
  }

  // Circular confidence gauge. prob in [0,1]. size: 'sm' | 'md' | 'lg'.
  // Affiche % au centre + tier en dessous (High/Mid/Low) sauf en taille sm.
  function confGauge(prob, size = 'md') {
    const p = Math.max(0, Math.min(1, prob || 0));
    const dims = { sm: { box: 36, r: 14, sw: 4 }, md: { box: 56, r: 22, sw: 5 }, lg: { box: 72, r: 30, sw: 6 } };
    const d = dims[size] || dims.md;
    const c = 2 * Math.PI * d.r;
    const off = c * (1 - p);
    const t = confLabel(p);
    const cx = d.box / 2;
    // Map tier → CSS class (vhigh reserved for tier >= 0.72 inside High, to
    // keep the stronger emerald shade for the truly strong High picks).
    const cls = p >= 0.72 ? 'vhigh' : t.cls;
    return `<div class="conf-gauge ${cls} ${size}" title="Confiance ${Math.round(p*100)}% — ${t.lbl}" aria-label="Confiance ${Math.round(p*100)}%, niveau ${t.lbl}">
      <svg width="${d.box}" height="${d.box}" viewBox="0 0 ${d.box} ${d.box}" aria-hidden="true">
        <circle class="cg-track" cx="${cx}" cy="${cx}" r="${d.r}" fill="none" stroke-width="${d.sw}"></circle>
        <circle class="cg-fill" cx="${cx}" cy="${cx}" r="${d.r}" stroke-width="${d.sw}"
                stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"></circle>
      </svg>
      <div class="cg-label">
        <div class="cg-pct">${Math.round(p*100)}%</div>
        ${size !== 'sm' ? `<div class="cg-txt">${t.lbl}</div>` : ''}
      </div>
    </div>`;
  }

  // ======= Grouping / filters =======
  function groupBy(arr, fn) {
    const m = new Map();
    arr.forEach(x => { const k = fn(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); });
    return m;
  }

  function matchFilter(m, q, filter) {
    // Winamax-only gate: if user toggled it on, hide everything not available on Winamax
    // Strict: only events explicitly confirmed on Winamax. Excludes both "available: false"
    // and any missing/unknown winamax tag, so we never propose bets Théo can't actually place.
    if (winamaxOnly && !(m.winamax && m.winamax.available === true)) return false;
    if (q) {
      const { home, away } = getSides(m);
      const hay = norm([home?.name, away?.name, m.league_name, m.venue, m.city, m.name].join(' '));
      if (!hay.includes(norm(q))) return false;
    }
    // Advanced filters: league shortcut first (cheap), then pred-dependent gates.
    if (advFilters.league && (m.league_code || '') !== advFilters.league) return false;
    const pred = predictMatch(m);
    // Cote filters (applied to the model's pick, which is what the card surfaces)
    if ((advFilters.oddMin > 0 || advFilters.oddMax > 0) && pred?.pick) {
      const pk = pred.pick.key;
      const o = pk === '1' ? pred.odds?.home : pk === '2' ? pred.odds?.away : pred.odds?.draw;
      if (!o) return false;
      if (advFilters.oddMin > 0 && o < advFilters.oddMin) return false;
      if (advFilters.oddMax > 0 && o > advFilters.oddMax) return false;
    }
    if (filter === 'lock') return !!pred?.isLock;
    if (filter === 'live') return m.status === 'STATUS_IN_PROGRESS';
    if (filter === 'upcoming') {
      // "À venir" = kickoff strictly in the future. ESPN sometimes leaves matches as
      // STATUS_SCHEDULED well past their kickoff, so we can't just trust !completed.
      if (m.completed || m.status === 'STATUS_IN_PROGRESS') return false;
      if (!m.date) return false;
      const d = new Date(m.date);
      if (isNaN(d)) return false;
      return d.getTime() > Date.now();
    }
    // Kickoff-window filters: quick shortcuts for "what can I actually bet on now".
    //   next2h   = kickoff within the next 2 hours (Théo's live-decision window)
    //   tonight  = kickoff today ≥ 18:00 Europe/Paris
    //   tomorrow = kickoff on tomorrow's Paris date
    if (filter === 'next2h' || filter === 'tonight' || filter === 'tomorrow') {
      if (m.completed || m.status === 'STATUS_IN_PROGRESS') return false;
      if (!m.date) return false;
      const d = new Date(m.date);
      if (isNaN(d)) return false;
      const now = Date.now();
      if (filter === 'next2h') {
        const delta = d.getTime() - now;
        return delta > 0 && delta <= 2 * 3600 * 1000;
      }
      // Paris-local day comparison for tonight/tomorrow so DST shifts don't leak.
      const pDay = d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
      const pHour = parseInt(d.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }), 10);
      const todayParis = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
      const tomorrowParis = (() => {
        const t = new Date(); t.setDate(t.getDate() + 1);
        return t.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
      })();
      if (filter === 'tonight') return pDay === todayParis && pHour >= 18 && d.getTime() > now;
      if (filter === 'tomorrow') return pDay === tomorrowParis;
    }
    if (filter === 'tipsters') return !!(m.tips && m.tips.length);
    if (filter === 'won') return evaluateModelPick(m, pred) === 'won';
    if (filter === 'lost') return evaluateModelPick(m, pred) === 'lost';
    return true;
  }

  // ======= Rendering =======
  // Fallback : basket / hockey / tennis ont rarement un champ `form` pré-mâché
  // par l'ingestion, mais `last5` expose des résultats W/L exploitables. On
  // reconstruit un formStr à la volée si le champ direct est vide, pour éviter
  // une bande de forme invisible sur les non-foot.
  function derivedForm(side) {
    if (!side) return null;
    if (typeof side.form === 'string' && side.form.length) return side.form;
    const l5 = side.last5;
    if (!Array.isArray(l5) || !l5.length) return null;
    // last5 peut être plus ancien → plus récent, ou l'inverse. On considère
    // que l'ordre stocké est chronologique ascendant (date croissante) car
    // c'est ce que les scrapers ESPN produisent. renderForm utilise .slice(-5)
    // ⇒ on garde l'ordre naturel, les 5 derniers seulement.
    const chars = l5.map(r => {
      const v = (r?.result || '').toUpperCase();
      return (v === 'W' || v === 'L' || v === 'D' || v === 'T') ? v : '';
    }).filter(Boolean);
    return chars.length ? chars.join('') : null;
  }

  function renderForm(formStr, big=false) {
    if (!formStr) return '';
    const chars = formStr.slice(-5).split('');
    const cls = big ? 'fm' : 'fm';
    // Affichage français : V (Victoire), N (Nul), D (Défaite).
    // On conserve les classes ESPN (W/D/T/L) côté CSS pour le code couleur, mais
    // le texte affiché est traduit en fr. T (tie, NBA/NHL) et D (draw, foot) sont
    // tous les deux des nuls → "N".
    const labels = { W: 'Victoire', L: 'Défaite', D: 'Match nul', T: 'Match nul' };
    const displayMap = { W: 'V', L: 'D', D: 'N', T: 'N' };
    return `<div class="form" role="group" aria-label="Forme (5 derniers)">${chars.map(c => {
      const lbl = labels[c] || 'Résultat inconnu';
      const disp = displayMap[c] || c;
      return `<div class="${cls} ${c}" role="img" aria-label="${lbl}" title="${lbl}">${disp}</div>`;
    }).join('')}</div>`;
  }

  function render() {
    const data = window.PRONOSTICS_DATA;
    if (!data) {
      document.getElementById('no-data-banner').classList.remove('hidden');
      return;
    }
    // We scan ALL stored day keys, not just data.days[currentDate]. ESPN stores events
    // under the "tournament start date" (tennis) or the UTC calendar day (football/NBA) —
    // so a Brasileirão match kicking off 23:00 UTC on 2026-04-19 is stored under
    // 2026-04-19 but falls on 2026-04-20 in Europe/Paris. Without scanning all keys,
    // those late-night South American + US matches silently vanish from the dashboard.
    const rawAll = [];
    const seenIds = new Set();
    Object.values(data.days || {}).forEach(arr => (arr || []).forEach(m => {
      if (m.id && seenIds.has(m.id)) return;
      if (m.id) seenIds.add(m.id);
      rawAll.push(m);
    }));
    // Keep only events whose actual kickoff falls on `currentDate` in Europe/Paris local time.
    const all = rawAll.filter(m => {
      if (!m.date) return false;
      const d = new Date(m.date);
      if (isNaN(d)) return false;
      // Use Europe/Paris local date to match how Théo thinks about "aujourd'hui".
      let iso;
      try { iso = d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }); }
      catch (e) {
        iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      }
      return iso === currentDate;
    });

    // === Counters per sport (pre-search, pre-filter) ===
    // Honor winamaxOnly so the per-sport tab badges never promise matches the user can't bet on.
    // Chantier 76 (2026-04-22) — on n'affiche QUE les matchs restants (non terminés).
    // Théo ne veut pas voir "Football 39" quand 19 sont déjà joués, il veut les
    // 20 qui restent. Les matchs live sont comptés comme "restants" (pas finis).
    const SPORTS = ['football','tennis','basketball','hockey','american-football','mma','golf','racing'];
    const isFinishedMatch = (m) => !!(m.completed || m.status === 'STATUS_FINAL' || m.status === 'STATUS_FULL_TIME');
    const allForCounts = (winamaxOnly
      ? all.filter(m => m.winamax && m.winamax.available === true)
      : all
    ).filter(m => !isFinishedMatch(m));
    SPORTS.forEach(s => {
      const n = allForCounts.filter(m => m.sport === s).length;
      const el = document.getElementById('count-' + s);
      if (el) el.textContent = n;
      // Hide the tab entirely if zero events today
      const btn = document.querySelector(`[data-tab="${s}"]`);
      if (btn) btn.classList.toggle('hidden', n === 0);
    });

    // === Locks counter in sidebar nav (live+upcoming, all days, all sports) ===
    // Kept on every render so the badge stays fresh even when the user is on
    // another page. Scans all stored days so tomorrow's locks count too.
    const locksCountEl = document.getElementById('count-locks');
    if (locksCountEl) {
      const nowMs = Date.now();
      let n = 0, nNew = 0;
      Object.values(data.days || {}).forEach(arr => (arr || []).forEach(m => {
        if (winamaxOnly && !(m.winamax && m.winamax.available === true)) return;
        if (m.completed || m.status === 'STATUS_FINAL' || m.status === 'STATUS_FULL_TIME') return;
        if (!m.date) return;
        const ko = new Date(m.date).getTime();
        if (isNaN(ko)) return;
        // Include live + upcoming (kicked off < 15 min ago still actionable-ish)
        if (ko < nowMs - 15 * 60 * 1000) return;
        const p = predictMatch(m);
        if (p && p.pick && !p.skip && p.isLock) {
          n++;
          if (isNewLock(m.id)) nNew++;
        }
      }));
      // Chantier Q — affiche "N" ou "N · K🆕" quand certains locks sont nouveaux.
      // Cas particulier : si tous les locks sont nouveaux (nNew === n) on évite
      // la redondance visuelle "6 · 6🆕" et on affiche "N 🆕".
      // v31.7.10 fix : sur sidebar etroite (240px), le format "37 · 35🆕"
      // se faisait tronquer en "37 · 35" sans l'emoji. Quand nNew est >50% de n,
      // on simplifie en "N 🆕" (badge groupé). Sinon "N" simple si pas de
      // nouveaux ou "N · K🆕" comme avant si signal pertinent (qq nouveaux).
      locksCountEl.textContent = nNew === 0 ? String(n)
                               : (nNew === n || nNew > n * 0.5) ? `${n} 🆕`
                                                                  : `${n} · ${nNew}🆕`;
      if (nNew > 0) locksCountEl.classList.add('has-new'); else locksCountEl.classList.remove('has-new');
    }

    // === Filter current sport ===
    const sportEvents = all.filter(m => m.sport === currentSport);
    const visible = sportEvents.filter(m => matchFilter(m, searchTerm, activeFilter));

    // === Summary bar ===
    renderSummary(all, sportEvents, visible);

    // === Filters ===
    renderFilters(sportEvents);

    // === Top picks ===
    renderTopPicks(visible);

    // === Combinés suggérés ===
    renderCombines();

    // === Apply page view (simples/combines/bilan) ===
    applyPageView();

    // === Content ===
    SPORTS.forEach(s => {
      const panel = document.getElementById('panel-' + s);
      if (panel) panel.classList.toggle('hidden', s !== currentSport);
    });
    const el = document.getElementById('content-' + currentSport);

    if (!visible.length) {
      const msg = searchTerm
        ? `Aucun match ne correspond à "${esc(searchTerm)}".`
        : (activeFilter !== 'all' ? `Aucun match ne correspond au filtre.` : `Aucun match ${sportLabel(currentSport).toLowerCase()} prévu pour ${fmtDate(currentDate)}.`);
      el.innerHTML = `<div class="empty"><div class="emoji">📅</div><div>${msg}</div><div class="hint">Essayez un autre jour avec ◀ ▶, changez de sport, ou retirez les filtres.</div></div>`;
      return;
    }

    // Sort: live > upcoming > final; within group, by league priority then time
    visible.sort((a, b) => {
      const scoreOf = (x) => x.status === 'STATUS_IN_PROGRESS' ? 0 : (x.completed ? 2 : 1);
      const sA = scoreOf(a), sB = scoreOf(b);
      if (sA !== sB) return sA - sB;
      const pA = b.league_priority || 0, pB = a.league_priority || 0; // higher first
      if (pA !== pB) return pA - pB;
      return (a.date || '').localeCompare(b.date || '');
    });

    // Chantier XX — Value picks panel: picks with edge >= +5% vs market
    // Filter on !m.completed AND _notStarted to avoid emitting picks on
    // matches that have already finished or kicked off — predictMatch
    // doesn't gate on completion itself, so we'd otherwise show "value"
    // picks for last week's matches whenever they're still in the data.
    const valuePicks = [];
    visible.forEach(m => {
      if (m.completed || m.status === 'STATUS_FINAL') return;
      if (m.status === 'STATUS_IN_PROGRESS' || m.live) return;
      const pred = predictMatch(m);
      if (!pred || !pred.pick || pred.skip) return;
      const pickOdd = pred.odds ? (pred.pick.key === '1' ? pred.odds.home : pred.pick.key === '2' ? pred.odds.away : pred.odds.draw) : null;
      if (!pickOdd) return;
      const rel = pred.reliability ?? pred.pick.prob;
      const edge = valueBetEdge(rel, pickOdd);
      if (edge != null && edge >= 0.05) {
        valuePicks.push({ m, pred, pickOdd, edge });
      }
    });
    valuePicks.sort((a, b) => b.edge - a.edge);
    const valuePicksPanel = valuePicks.length > 0 ? `
      <div style="margin-bottom:24px;">
        <div class="section-header" style="margin-bottom:14px;">
          <h2 style="margin:0;font-size:15px;font-weight:600;letter-spacing:-.2px;color:var(--text);"><span style="margin-right:8px;">🚨</span>Paris avec avantage aujourd'hui</h2>
        </div>
        <div style="background:var(--panel);border:1px solid var(--border);border-radius:10px;overflow:hidden;">
          ${valuePicks.slice(0, 5).map((x, i) => {
            const { m, pred, pickOdd, edge } = x;
            const { home, away } = getSides(m);
            const rel = pred.reliability ?? pred.pick.prob;
            return `
              <div style="padding:12px 14px;border-bottom:${i < Math.min(5, valuePicks.length)-1 ? '1px solid var(--border)' : 'none'};display:flex;gap:12px;align-items:center;cursor:pointer;" class="value-pick-row" data-id="${esc(m.id)}">
                <div style="flex:1;">
                  <div style="font-size:13px;font-weight:600;color:var(--text);">${esc(home?.name || '?')} vs ${esc(away?.name || '?')}</div>
                  <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">${esc(m.league_name || '?')}</div>
                </div>
                <div style="text-align:right;font-size:13px;">
                  <div style="font-weight:600;color:var(--text);">${esc(pred.pick.label)}</div>
                  <div style="font-size:12px;color:var(--text-dim);">${pickOdd.toFixed(2)} · ${(rel*100).toFixed(0)}%</div>
                </div>
                <div style="background:rgba(52,211,153,.18);border:1px solid rgba(52,211,153,.3);color:#34d399;padding:6px 10px;border-radius:6px;font-weight:700;font-size:12px;white-space:nowrap;">+${Math.round(edge*100)}%</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : '';

    // Group by league, then sort leagues by priority descending
    const byLeague = groupBy(visible, e => `${e.league_code}|${e.league_name}`);
    const leagues = Array.from(byLeague.entries())
      .sort((a, b) => (b[1][0].league_priority || 0) - (a[1][0].league_priority || 0));

    el.innerHTML = valuePicksPanel + leagues.map(([key, group]) => {
      const liveCount = group.filter(m => m.status === 'STATUS_IN_PROGRESS').length;
      return `
        <div class="league-block">
          <div class="league-header">
            <div class="name">${esc(group[0].league_name || '—')}</div>
            <div class="country">${esc(group[0].league_country || '')}</div>
            <div class="stats">
              ${liveCount ? `<span class="pill" style="color:var(--danger);">🔴 ${liveCount} live</span>` : ''}
              <span class="pill">${group.length} match${group.length > 1 ? 's' : ''}</span>
            </div>
          </div>
          <div class="match-grid">${group.map(renderCard).join('')}</div>
        </div>
      `;
    }).join('');

    // Chantier XX — Value picks click handlers
    el.querySelectorAll('.value-pick-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.id;
        const match = visible.find(m => m.id === id);
        if (match) openDetail(match);
      });
    });

    el.querySelectorAll('.match').forEach(card => {
      const activate = () => {
        const id = card.dataset.id;
        const match = visible.find(m => m.id === id);
        if (match) openDetail(match);
      };
      card.addEventListener('click', activate);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    });
  }

  function renderSummary(all, sportEvents, visible) {
    const data = window.PRONOSTICS_DATA;
    // Single pass — avoids 3 separate .filter() walks.
    let liveAll = 0, lockAll = 0;
    for (const m of all) {
      if (m.status === 'STATUS_IN_PROGRESS') liveAll++;
      const p = predictMatch(m);
      if (p?.isLock) lockAll++;
    }
    const gen = data?.generated_at ? new Date(data.generated_at).toLocaleDateString('fr-FR', { day:'numeric', month:'short', hour: '2-digit', minute: '2-digit'}) : '—';

    // === Performance bilan of completed matches today ===
    // We track TWO bilans:
    //   1. "Bilan modèle"  — every pick where we had real odds (excludes `skip` = <42% confidence,
    //      no meaningful signal, and excludes matches where predictMatch fell back to the flat
    //      prior because no odds were ever captured)
    //   2. "Bilan top picks" — only the high-conviction picks (isLock, fiabilité ≥ 72%),
    //      i.e. what Théo would actually bet on Winamax
    let won = 0, lost = 0;                 // all recommended picks
    let wonWithOdds = 0, lostWithOdds = 0, stakeUnits = 0, returnUnits = 0;
    let topWon = 0, topLost = 0, topStake = 0, topReturn = 0;
    // Tipster bilan (only if tipster provided a usable pick+odd)
    let tipWon = 0, tipLost = 0, tipStake = 0, tipReturn = 0;
    all.forEach(m => {
      const p = predictMatch(m);
      if (p && !p.skip) {
        const pickOdd = p.odds ? (p.pick.key === '1' ? p.odds.home : p.pick.key === '2' ? p.odds.away : p.odds.draw) : null;
        // Require real odds to count — otherwise we're measuring the fallback prior
        if (!pickOdd) return;
        const r = evaluateModelPick(m, p);
        if (r === 'won') won++;
        else if (r === 'lost') lost++;
        if (r === 'won' || r === 'lost') {
          stakeUnits += 1;
          if (r === 'won') { wonWithOdds++; returnUnits += pickOdd; }
          else { lostWithOdds++; }
          // Top picks: lock (fiabilité ≥ 72%) — pure model confidence
          const isTop = !!p.isLock;
          if (isTop) {
            topStake += 1;
            if (r === 'won') { topWon++; topReturn += pickOdd; }
            else { topLost++; }
          }
        }
      }
      (m.tips || []).forEach(t => {
        if (!t.odds || !t.pick) return;
        const tr = evaluateTipsterPick(t.pick, m);
        if (tr === 'won') { tipWon++; tipStake += 1; tipReturn += t.odds; }
        else if (tr === 'lost') { tipLost++; tipStake += 1; }
      });
    });
    const total = won + lost;
    const winRate = total > 0 ? (won / total * 100) : 0;
    const totalOdds = wonWithOdds + lostWithOdds;
    const winRateOdds = totalOdds > 0 ? (wonWithOdds / totalOdds * 100) : 0;
    const roi = stakeUnits > 0 ? ((returnUnits - stakeUnits) / stakeUnits * 100) : 0;
    const roiCls = roi > 0 ? 'primary' : roi < 0 ? 'danger' : 'warn';
    const roiSign = roi > 0 ? '+' : '';
    const topTotal = topWon + topLost;
    const topWinRate = topTotal > 0 ? (topWon / topTotal * 100) : 0;
    const topRoi = topStake > 0 ? ((topReturn - topStake) / topStake * 100) : 0;
    const topRoiCls = topRoi > 0 ? 'primary' : topRoi < 0 ? 'danger' : 'warn';
    const topRoiSign = topRoi > 0 ? '+' : '';
    const tipTotal = tipWon + tipLost;
    const tipWinRate = tipTotal > 0 ? (tipWon / tipTotal * 100) : 0;
    const tipRoi = tipStake > 0 ? ((tipReturn - tipStake) / tipStake * 100) : 0;
    const tipRoiCls = tipRoi > 0 ? 'primary' : tipRoi < 0 ? 'danger' : 'warn';
    const tipRoiSign = tipRoi > 0 ? '+' : '';

    const html = `
      <div class="summary-card">
        <div class="lbl">Date</div>
        <div class="val" style="font-size:18px; line-height:1.3; margin-top:8px;">${fmtDate(currentDate)}</div>
        <div class="sub">${all.length} match${all.length > 1 ? 's' : ''} programmé${all.length > 1 ? 's' : ''}</div>
      </div>
      ${topTotal > 0 ? `
      <div class="summary-card ${topWinRate >= 60 ? 'primary' : topWinRate >= 50 ? 'warn' : 'danger'}">
        <div class="lbl">🎯 Bilan top picks</div>
        <div class="val" style="font-size:20px;">
          <span style="color:#86efac;">${topWon}</span>
          <span style="color:var(--text-dim); font-size:14px;">/</span>
          <span style="color:#fca5a5;">${topLost}</span>
        </div>
        <div class="sub">${topWinRate.toFixed(0)}% réussite · ROI ${topRoiSign}${topRoi.toFixed(1)}% · locks uniquement (fiab. ≥ 72%)</div>
      </div>` : ''}
      ${total > 0 ? `
      <div class="summary-card ${winRate >= 50 ? 'primary' : 'danger'}">
        <div class="lbl">📊 Bilan modèle</div>
        <div class="val" style="font-size:20px;">
          <span style="color:#86efac;">${won}</span>
          <span style="color:var(--text-dim); font-size:14px;">/</span>
          <span style="color:#fca5a5;">${lost}</span>
        </div>
        <div class="sub">${winRate.toFixed(0)}% réussite · ROI ${roiSign}${roi.toFixed(1)}% (picks avec cote réelle)</div>
      </div>` : ''}
      ${tipTotal > 0 ? `
      <div class="summary-card ${tipRoiCls}">
        <div class="lbl">👥 Bilan tipsters</div>
        <div class="val" style="font-size:20px;">
          <span style="color:#86efac;">${tipWon}</span>
          <span style="color:var(--text-dim); font-size:14px;">/</span>
          <span style="color:#fca5a5;">${tipLost}</span>
        </div>
        <div class="sub">${tipWinRate.toFixed(0)}% réussite · ROI ${tipRoiSign}${tipRoi.toFixed(1)}%</div>
      </div>` : ''}
      <div class="summary-card warn">
        <div class="lbl">🔒 Pronos forts</div>
        <div class="val">${lockAll}</div>
        <div class="sub">fiabilité ≥ 72%</div>
      </div>
      <div class="summary-card danger">
        <div class="lbl">🔴 En direct</div>
        <div class="val">${liveAll}</div>
        <div class="sub">matchs en cours</div>
      </div>
      <div class="summary-card info">
        <div class="lbl">Données</div>
        <div class="val" style="font-size:14px; line-height:1.5; margin-top:8px;">ESPN · MAJ ${gen}</div>
        <div class="sub">18 compétitions foot · NBA/WNBA/NCAA · ATP/WTA</div>
      </div>
    `;
    document.getElementById('summary-bar').innerHTML = html;
  }

  function renderFilters(sportEvents) {
    // Respect the Winamax-only toggle: counts should match what the user will actually see.
    // Otherwise "À venir 44" is misleading when the list below only shows 3 Winamax matches.
    const pool = winamaxOnly
      ? sportEvents.filter(m => m.winamax && m.winamax.available === true)
      : sportEvents;
    // "À venir" also excludes matches whose kickoff has already passed (ESPN is slow to flip
    // STATUS_SCHEDULED → FINAL), so the count tracks real upcoming fixtures only.
    const nowMs = Date.now();
    const isUpcoming = (m) => {
      if (m.completed || m.status === 'STATUS_IN_PROGRESS') return false;
      if (!m.date) return false;
      const d = new Date(m.date);
      return !isNaN(d) && d.getTime() > nowMs;
    };
    // Kickoff-window helpers (Paris-local) — matches matchFilter() semantics.
    const todayParisStr = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const tomorrowParisStr = (() => {
      const t = new Date(); t.setDate(t.getDate() + 1);
      return t.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    })();
    const kickoffCheck = (m, kind) => {
      if (m.completed || m.status === 'STATUS_IN_PROGRESS' || !m.date) return false;
      const d = new Date(m.date);
      if (isNaN(d)) return false;
      if (kind === 'next2h') {
        const delta = d.getTime() - nowMs;
        return delta > 0 && delta <= 2 * 3600 * 1000;
      }
      const pDay = d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
      const pHour = parseInt(d.toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }), 10);
      if (kind === 'tonight') return pDay === todayParisStr && pHour >= 18 && d.getTime() > nowMs;
      if (kind === 'tomorrow') return pDay === tomorrowParisStr;
      return false;
    };
    // Single-pass tally — avoids 13 sequential .filter() walks on `pool`.
    // predictMatch is cached but we still save the function-call overhead.
    const counts = {
      all: pool.length, lock: 0, live: 0, upcoming: 0,
      next2h: 0, tonight: 0, tomorrow: 0, tipsters: 0,
      results: 0, won: 0, lost: 0,
    };
    for (const m of pool) {
      const pred = predictMatch(m);
      if (pred?.isLock) counts.lock++;
      if (m.status === 'STATUS_IN_PROGRESS') counts.live++;
      if (isUpcoming(m)) counts.upcoming++;
      if (kickoffCheck(m, 'next2h')) counts.next2h++;
      if (kickoffCheck(m, 'tonight')) counts.tonight++;
      if (kickoffCheck(m, 'tomorrow')) counts.tomorrow++;
      if (m.tips && m.tips.length) counts.tipsters++;
      const res = evaluateModelPick(m, pred);
      if (res !== null) {
        counts.results++;
        if (res === 'won') counts.won++;
        else if (res === 'lost') counts.lost++;
      }
    }
    const html = `
      <button class="filter-btn ${activeFilter==='all'?'active':''}" data-filter="all">Tous <span class="count">${counts.all}</span></button>
      <button class="filter-btn ${activeFilter==='upcoming'?'active':''}" data-filter="upcoming">À venir <span class="count">${counts.upcoming}</span></button>
      ${counts.next2h ? `<button class="filter-btn ${activeFilter==='next2h'?'active':''}" data-filter="next2h" title="Kickoff dans les 2 prochaines heures">⏱ Dans 2h <span class="count">${counts.next2h}</span></button>` : ''}
      ${counts.tonight ? `<button class="filter-btn ${activeFilter==='tonight'?'active':''}" data-filter="tonight" title="Kickoff ce soir à partir de 18h (Paris)">🌙 Ce soir <span class="count">${counts.tonight}</span></button>` : ''}
      ${counts.tomorrow ? `<button class="filter-btn ${activeFilter==='tomorrow'?'active':''}" data-filter="tomorrow" title="Kickoff demain (Paris)">📅 Demain <span class="count">${counts.tomorrow}</span></button>` : ''}
      <button class="filter-btn ${activeFilter==='live'?'active':''}" data-filter="live">🔴 En direct <span class="count">${counts.live}</span></button>
      <button class="filter-btn ${activeFilter==='lock'?'active':''}" data-filter="lock">🔒 Pronos forts <span class="count">${counts.lock}</span></button>
      ${counts.tipsters ? `<button class="filter-btn ${activeFilter==='tipsters'?'active':''}" data-filter="tipsters">👥 Avec tipster <span class="count">${counts.tipsters}</span></button>` : ''}
      ${counts.results ? `<button class="filter-btn ${activeFilter==='won'?'active':''}" data-filter="won">✓ Gagnés <span class="count">${counts.won}</span></button>` : ''}
      ${counts.results ? `<button class="filter-btn ${activeFilter==='lost'?'active':''}" data-filter="lost">✗ Perdus <span class="count">${counts.lost}</span></button>` : ''}
      <button class="filter-btn ${advFiltersActive()?'active':''}" data-adv-toggle style="display:inline-flex;align-items:center;gap:4px;">⚙️ Avancé${advFiltersActive()?' ●':''}</button>
      <span style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:16px;background:linear-gradient(135deg,#ff6b00 0%,#ff4e00 100%);color:#fff;font-size:12px;font-weight:600;letter-spacing:.4px;user-select:none;cursor:default;" title="Tous les matchs listés sont disponibles sur Winamax">
        <span>🎯</span>
        Winamax uniquement
      </span>
    `;
    // Advanced filters panel (collapsible). League dropdown is populated from
    // the current sport's events so it only offers leagues actually present.
    const leagueOpts = [...new Set(sportEvents.map(m => m.league_code).filter(Boolean))]
      .map(lc => {
        const sample = sportEvents.find(m => m.league_code === lc);
        return { code: lc, name: sample?.league_name || lc };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    const advHtml = advFiltersOpen ? `
      <div class="adv-filters" style="margin-top:10px;padding:12px;background:var(--surface,#111827);border:1px solid var(--border,#2a3744);border-radius:10px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;font-size:13px;">
        <div style="display:inline-flex;align-items:center;gap:6px;">
          <span style="color:var(--text-muted);">Cote</span>
          <input type="number" id="adv-odd-min" value="${advFilters.oddMin || ''}" placeholder="min" step="0.1" min="1" style="width:58px;padding:4px 6px;background:var(--panel-2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;"/>
          <span style="color:var(--text-muted);">→</span>
          <input type="number" id="adv-odd-max" value="${advFilters.oddMax || ''}" placeholder="max" step="0.1" min="1" style="width:58px;padding:4px 6px;background:var(--panel-2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;"/>
        </div>
        <div style="display:inline-flex;align-items:center;gap:6px;">
          <span style="color:var(--text-muted);">Ligue</span>
          <select id="adv-league" style="padding:4px 8px;background:var(--panel-2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;">
            <option value="">Toutes (${pool.length})</option>
            ${leagueOpts.map(l => `<option value="${esc(l.code)}" ${advFilters.league === l.code ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}
          </select>
        </div>
        ${advFiltersActive() ? `<button id="adv-reset" style="margin-left:auto;padding:5px 10px;background:rgba(248,113,113,.12);border:1px solid rgba(248,113,113,.3);color:#f87171;border-radius:6px;cursor:pointer;font-size:12px;">↺ Réinitialiser</button>` : ''}
      </div>` : '';
    const el = document.getElementById('filters');
    el.innerHTML = html + advHtml;
    el.querySelectorAll('.filter-btn').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.advToggle !== undefined) {
        advFiltersOpen = !advFiltersOpen;
      } else {
        activeFilter = b.dataset.filter;
      }
      render();
    }));
    // Wire advanced controls
    const byId = (id) => el.querySelector('#' + id);
    const onAdvChange = () => { saveAdvFilters(); render(); };
    if (byId('adv-odd-min')) byId('adv-odd-min').addEventListener('change', (e) => {
      advFilters.oddMin = parseFloat(e.target.value) || 0; onAdvChange();
    });
    if (byId('adv-odd-max')) byId('adv-odd-max').addEventListener('change', (e) => {
      advFilters.oddMax = parseFloat(e.target.value) || 0; onAdvChange();
    });
    if (byId('adv-league')) byId('adv-league').addEventListener('change', (e) => {
      advFilters.league = e.target.value || ''; onAdvChange();
    });
    if (byId('adv-reset')) byId('adv-reset').addEventListener('click', () => {
      advFilters = { kellyMin: 0, oddMin: 0, oddMax: 0, league: '' }; onAdvChange();
    });
  }

  function renderTopPicks(visible) {
    // Pool: only matches that are still actionable (haven't kicked off yet).
    // As soon as a match starts/finishes, it rolls off the Top section and
    // is replaced by the next best upcoming pick. This is re-evaluated on
    // every render (every 30s) so the list refreshes minute by minute.
    const now = Date.now();
    const data = window.PRONOSTICS_DATA;

    // "Du jour" = calendar day in Europe/Paris timezone.
    // A kickoff at 23:45 Paris time on Sunday is still "today". A kickoff
    // at 00:30 Monday is tomorrow, even though it's only 30 min away.
    const todayParis = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }); // YYYY-MM-DD
    const isSameParisDay = (d) => {
      try { return d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }) === todayParis; }
      catch (e) { return false; }
    };

    const todayPool = [];
    const futurePool = [];   // for the "Prochains pronos" fallback when today is empty
    const seen = new Set();
    const pushIfFresh = (m) => {
      if (!m || !m.id || seen.has(m.id)) return;
      if (m.completed || m.status === 'STATUS_IN_PROGRESS') return;
      if (winamaxOnly && !(m.winamax && m.winamax.available === true)) return;
      if (!m.date) return;
      const d = new Date(m.date);
      if (isNaN(d)) return;
      const startIn = Math.round((d.getTime() - now) / 60000);
      if (startIn < 0) return;                  // already kicked off
      if (startIn > 60 * 36) return;            // 36h ahead max for any fallback
      const pred = predictMatch(m);
      if (!pred || !pred.pick || pred.skip) return;
      if (pred.lowConf) return;
      const pickOdd = pred.pick.key === '1' ? pred.odds?.home
                    : pred.pick.key === '2' ? pred.odds?.away
                    : pred.odds?.draw;
      if (!pickOdd || pickOdd < 1.05) return;
      seen.add(m.id);
      const entry = { m, pred, startIn, pickOdd };
      if (isSameParisDay(d)) todayPool.push(entry);
      else futurePool.push(entry);
    };

    // 1) Start from the current sport's visible list (respects filter + search)
    (visible || []).forEach(pushIfFresh);

    // 2) Fall back to all days across all sports for the today-pool.
    //    Critical: we must scan all days to catch matches that start late
    //    in the day but are stored under today's key in data.js.
    if (data?.days) {
      Object.values(data.days).forEach(arr => (arr || []).forEach(pushIfFresh));
    }

    // Only "today" matches go into the Top 5 / Autres. Tomorrow's picks
    // get their own dedicated section so Théo doesn't confuse the two.
    const pool = todayPool;

    // ===== Ranking — fiabilité × cote =====
    // Ranking pur-modèle : fiabilité uniquement (cote exclue du classement).
    // La cote reste affichée à l'utilisateur mais n'influence pas la sélection.
    // Time-bonus léger pour les matchs imminents (actionnables tout de suite).
    const scored = pool
      .map(x => {
        const rel = x.pred.reliability ?? x.pred.pick.prob;
        const timeBonus = x.startIn < 60 ? 0.02 : x.startIn < 360 ? 0.02 * (1 - (x.startIn - 60) / 300) : 0;
        const score = rel + timeBonus;
        return { ...x, score };
      })
      .sort((a, b) => b.score - a.score);

    // Ne garder que les picks fiables (≥ lowConf threshold) — exclus les coinflips.
    const top5 = scored.filter(x => !x.pred.lowConf && !x.pred.skip).slice(0, 5);
    const others = scored.filter(x => !top5.includes(x) && !x.pred.skip).slice(0, 7);

    // ===== Chantier DD — Pari du jour =====
    // Le "Pari du jour" n'est PAS forcément le top 1 fiabilité : c'est le pick
    // qui offre le meilleur compromis entre :
    //   - conviction du modèle (fraction Kelly > 0)
    //   - edge vs marché (fiabilité − cote implicite)
    //   - fiabilité brute (éviter les picks fragiles)
    //
    // Formule : score = kellyFraction × max(edge + 0.02, 0.01) × fiabilité
    // Seulement sur les LOCKs (fiab ≥ 0.70) avec cote valable (>1.20 pour écarter
    // les picks "pratiquement donnés" qui n'ont pas de vraie value).
    // Si aucun pick ne remplit ces critères → on ne force pas un pick moyen, on
    // affiche un message de discipline ("pas de setup aujourd'hui"). Théo a
    // demandé plusieurs fois de ne pas parier pour parier.
    const pariDuJour = (() => {
      const candidates = scored.filter(x => {
        if (x.pred.skip || x.pred.lowConf) return false;
        if (!x.pred.isLock) return false;
        if (!x.pickOdd || x.pickOdd < 1.20) return false;
        const rel = x.pred.reliability ?? x.pred.pick.prob;
        const kFrac = kellyFraction(rel, x.pickOdd, 0.25);
        if (kFrac <= 0) return false;     // −EV selon Kelly
        return true;
      }).map(x => {
        const rel = x.pred.reliability ?? x.pred.pick.prob;
        const kFrac = kellyFraction(rel, x.pickOdd, 0.25);
        const edge = valueBetEdge(rel, x.pickOdd) || 0;
        const score = kFrac * Math.max(edge + 0.02, 0.01) * rel;
        return { ...x, kFrac, edge, pdjScore: score };
      }).sort((a, b) => b.pdjScore - a.pdjScore);
      return candidates[0] || null;
    })();
    // Rendu de la bannière "Pari du jour" : compacte, avec infos clés.
    // Posée AU-DESSUS du top 5 pour capter l'œil en premier.
    const renderPariDuJour = (x) => {
      if (!x) return '';
      const { m, pred, startIn, pickOdd, kFrac, edge } = x;
      const { home, away } = getSides(m);
      const rel = pred.reliability ?? pred.pick.prob;
      const relPct = Math.round(rel * 100);
      const edgePct = Math.round(edge * 100);
      const kellyAmt = bankroll * kFrac;
      const kellyPct = (kFrac * 100).toFixed(1);
      const tIn = fmtIn(startIn);
      const wmxUrl = winamaxUrl(m);
      const myBet = getMyBet(m.id, pred.pick.key);
      const urgent = startIn <= 120;  // ≤ 2h → teinte urgence
      // Ne pas ré-afficher si le pick du jour = top 1 hero (redondance)
      // → on le marque plutôt d'un ruban "🏆 Pari du jour" dans le hero.
      // Détection : ici on n'a pas accès au top 1 directement, mais on peut
      // comparer l'id du match plus bas (voir integration point).
      return `
        <div class="pari-du-jour" data-id="${esc(m.id)}" role="button" tabindex="0" style="
          background: linear-gradient(135deg, rgba(167,139,250,.18), rgba(236,72,153,.12));
          border: 1.5px solid rgba(167,139,250,.45);
          border-radius: 16px;
          padding: 18px 20px;
          margin-bottom: 20px;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        ">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <span style="font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#a78bfa;background:rgba(167,139,250,.15);padding:4px 10px;border-radius:6px;">🏆 Pari du jour</span>
            <span style="font-size:11px;color:var(--text-dim2);font-weight:500;">meilleur compromis fiabilité × edge × Kelly</span>
            ${urgent ? `<span style="font-size:11px;font-weight:700;color:#fbbf24;margin-left:auto;">⏱ ${esc(tIn)}</span>` : `<span style="font-size:11px;color:var(--text-dim2);margin-left:auto;">${esc(tIn)}</span>`}
          </div>
          <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
            <div style="font-size:17px;font-weight:700;color:var(--text);">${esc(home?.short || home?.name || '?')} <span style="color:var(--text-dim);font-weight:400;">vs</span> ${esc(away?.short || away?.name || '?')}</div>
            <span style="font-size:11px;color:var(--text-dim2);">${esc(m.league_name || '')}</span>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
            <span style="padding:6px 12px;border-radius:8px;background:rgba(16,185,129,.18);color:#10b981;font-weight:700;font-size:14px;">${esc(pred.pick.label)} @ ${pickOdd.toFixed(2)}</span>
            <span style="padding:5px 11px;border-radius:7px;background:rgba(255,255,255,.06);color:var(--text);font-weight:600;font-size:12.5px;">🎯 Fiab ${relPct}%</span>
            <span style="padding:5px 11px;border-radius:7px;background:rgba(236,72,153,.18);color:#f472b6;font-weight:700;font-size:12.5px;">💎 Edge +${edgePct}pt</span>
          </div>
        </div>`;
    };

    // Tomorrow's picks — même gate fiabilité.
    const futureScored = futurePool
      .map(x => {
        const rel = x.pred.reliability ?? x.pred.pick.prob;
        return { ...x, score: rel };
      })
      .sort((a, b) => b.score - a.score);
    const futureTop = futureScored.filter(x => !x.pred.lowConf && !x.pred.skip).slice(0, 5);

    const wrap = document.getElementById('top-picks-wrap');
    if (!top5.length && !others.length && !futureTop.length) {
      wrap.innerHTML = `
        <div class="section-header top-picks">
          <h2><span class="ico">⭐</span>Top pronostics du jour</h2>
          <div class="hint">Tous les top-pronos du jour sont joués. Les prochains apparaîtront ici automatiquement.</div>
        </div>`;
      return;
    }

    // ============ RANK #1 — HERO GÉANT =============
    const renderHeroPick = (x) => {
      const { m, pred, startIn, pickOdd } = x;
      const { home, away } = getSides(m);
      const tIn = fmtIn(startIn);
      const myBet = getMyBet(m.id, pred.pick.key);
      const lm = lineMovement(m, pred.pick.key);
      const reasons = pred.explain?.reasons || [];
      const topReasons = reasons.slice(0, 3);
      const wmxUrl = winamaxUrl(m);
      const nBets = getMatchBetCount(m.id);
      const corrEffective = myBet ? nBets - 1 : nBets;

      return `
        <div class="top-hero" data-id="${esc(m.id)}">
          <div class="hero-top">
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
              <span class="hero-rank">🏆 #1 Top Pick</span>
              <span class="hero-league">${esc(m.league_name || '')}</span>
              ${pred.isLock ? `<span style="font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;background:rgba(234,179,8,.18);color:#eab308;letter-spacing:.4px;text-transform:uppercase;">🔒 Pari sûr${isNewLock(x.m.id) ? ' <span style=\"background:#eab308;color:#0a0e17;padding:1px 5px;border-radius:4px;margin-left:4px;font-size:9px;letter-spacing:.5px;\">🆕</span>' : ''}</span>` : ''}
            </div>
            <div class="hero-time">${esc(fmtTime(m.date))} · ${esc(tIn)}</div>
          </div>

          <div class="hero-teams">
            ${esc(home?.name || home?.short || '?')}
            <span class="vs">vs</span>
            ${esc(away?.name || away?.short || '?')}
          </div>

          <div class="hero-stats">
            <div class="hero-stat">
              <div class="label">Pronostic</div>
              <div class="val hero-pick-label">🎯 ${esc(pred.pick.label)}</div>
            </div>
            <div class="hero-stat accent">
              <div class="label">Cote</div>
              <div class="val">${pickOdd.toFixed(2)}</div>
            </div>
            <div class="hero-stat brand">
              <div class="label">Confiance · ${confLabel(pred.reliability ?? pred.pick.prob).lbl}</div>
              <div class="val">${((pred.reliability ?? pred.pick.prob)*100).toFixed(0)}%</div>
            </div>
          </div>

          <div class="hero-badges">
            ${lm ? (() => {
              const sevTxt = lm.severity === 'sharp' ? 'Sharp' : lm.severity === 'notable' ? 'Notable' : 'Léger';
              const intensity = lm.severity === 'sharp' ? 0.28 : lm.severity === 'notable' ? 0.20 : 0.14;
              if (lm.deltaPct < 0) {
                return `<span title="Cote ${lm.before.toFixed(2)} → ${lm.after.toFixed(2)}. ${sevTxt} drop — money vers notre pick." style="padding:5px 12px;border-radius:8px;background:rgba(16,185,129,${intensity});color:#34d399;font-weight:700;font-size:12.5px;">📉 ${sevTxt} ${lm.deltaPct.toFixed(1)}%</span>`;
              }
              return `<span title="Cote ${lm.before.toFixed(2)} → ${lm.after.toFixed(2)}. ${sevTxt} drift — marché s'éloigne." style="padding:5px 12px;border-radius:8px;background:rgba(248,113,113,${intensity});color:#f87171;font-weight:700;font-size:12.5px;">📈 ${sevTxt} +${lm.deltaPct.toFixed(1)}%</span>`;
            })() : ''}
            ${(() => {
              const rel = pred.reliability ?? pred.pick.prob;
              const edge = valueBetEdge(rel, pickOdd);
              const edgePct = edge != null ? Math.round(edge * 100) : null;
              const isValue = edge != null && edge >= 0.05;
              return isValue
                ? `<span title="Edge modèle ${(rel*100).toFixed(0)}% vs cote implicite ${((1/pickOdd)*100).toFixed(0)}%" style="padding:5px 12px;border-radius:8px;background:rgba(236,72,153,.18);color:#f472b6;font-weight:700;font-size:12.5px;">💎 Value +${edgePct}pt</span>`
                : '';
            })()}
            ${pred.markets && pred.markets.ou.prob >= 0.60 ? `<span title="Marché bonus dérivé des buts attendus." style="padding:5px 12px;border-radius:8px;background:rgba(139,92,246,.16);color:#a78bfa;font-weight:700;font-size:12.5px;">⚽ ${esc(pred.markets.ou.label)} · ${(pred.markets.ou.prob*100).toFixed(0)}%</span>` : ''}
            ${pred.markets && pred.markets.btts.prob >= 0.60 ? `<span title="Les deux équipes marquent — probabilité dérivée des buts attendus." style="padding:5px 12px;border-radius:8px;background:rgba(236,72,153,.16);color:#f472b6;font-weight:700;font-size:12.5px;">🔄 ${esc(pred.markets.btts.label)} · ${(pred.markets.btts.prob*100).toFixed(0)}%</span>` : ''}
          </div>

          ${pred.explain?.headline ? `<div class="hero-headline">${esc(pred.explain.headline)}</div>` : ''}
          ${topReasons.length ? `<ul class="hero-reasons">${topReasons.map(r => `<li><span>${r.icon}</span><span>${esc(r.text)}</span></li>`).join('')}</ul>` : ''}
        </div>
      `;
    };

    // ============ RANKS #2–5 — MINI CARDS =============
    const renderMiniPick = (x, rank) => {
      const { m, pred, startIn, pickOdd } = x;
      const { home, away } = getSides(m);
      const tIn = fmtIn(startIn);
      const rel = Math.round((pred.reliability ?? pred.pick.prob) * 100);
      // Note justifiant le pick — la plus signifiante (première = ordre
      // implicite du model : market, form, H2H…). Garde 1 seule ligne pour
      // ne pas casser le grid 2×2 mini.
      const topReason = (pred.explain?.reasons || [])[0];
      // v30 — bouton "J'ai parié" retiré.
      const betBtnHtml = '';
      return `
        <div class="top-mini top-pick" data-id="${esc(m.id)}">
          <div class="mini-head">
            <div class="mini-rank">${rank}</div>
            <div class="mini-league">${esc(m.league_name || '')}</div>
            <div class="mini-time">${esc(tIn)}</div>
          </div>
          <div class="mini-teams">
            ${esc(home?.short || home?.name || '?')}
            <span class="vs">vs</span>
            ${esc(away?.short || away?.name || '?')}
          </div>
          <div class="mini-pick">
            <div class="mini-pick-label">🎯 ${esc(pred.pick.label)}</div>
            <div class="mini-pick-stats">
              <span class="mini-stat odd">${pickOdd.toFixed(2)}</span>
              <span class="mini-stat">Confiance ${rel}%</span>
            </div>
          </div>
          ${topReason ? `<div class="mini-note" title="${esc(topReason.text)}"><span>${topReason.icon}</span><span>${esc(topReason.text)}</span></div>` : ''}
          ${betBtnHtml}
        </div>
      `;
    };

    // Compact card for the "autres pronos"
    const renderOther = (x) => {
      const { m, pred, startIn, pickOdd } = x;
      const { home, away } = getSides(m);
      const tIn = fmtIn(startIn);
      const urgent = startIn < 30;
      // Note : 1 raison compacte — explicite pourquoi ce pick plutôt qu'un autre
      const topReason = (pred.explain?.reasons || [])[0];
      // v30 — "J'ai parié" + Kelly retirés.
      const betBtnHtml = '';
      return `
        <div class="top-pick ${urgent ? 'urgent' : ''}" data-id="${esc(m.id)}">
          <div class="tp-head">
            <div class="tp-league">${esc(m.league_name)}</div>
            <div class="tp-time">${esc(fmtTime(m.date))} · <span style="color:var(--accent-2,#60a5fa);font-weight:700;">${esc(tIn)}</span></div>
          </div>
          <div class="tp-teams">${esc(home?.short || home?.name || '?')} <span style="color:var(--text-dim);">vs</span> ${esc(away?.short || away?.name || '?')}</div>
          <div class="tp-pick">
            <div class="tp-pick-label">
              ${pred.isLock ? `<span class="tp-badge" style="background:var(--warn);color:#0a0e17;">PARI SÛR${isNewLock(x.m.id) ? ' 🆕' : ''}</span>` : ''}
              🎯 ${esc(pred.pick.label)}
            </div>
            <div class="tp-pick-conf">Confiance ${((pred.reliability ?? pred.pick.prob)*100).toFixed(0)}% · <span style="color:var(--accent);">@${pickOdd.toFixed(2)}</span></div>
          </div>
          ${topReason ? `<div class="tp-note" title="${esc(topReason.text)}"><span>${topReason.icon}</span><span>${esc(topReason.text)}</span></div>` : ''}
          ${betBtnHtml}
        </div>
      `;
    };

    // Label for the "prochains" section: detect whether the future pool
    // is tomorrow or later (e.g. if today is fully played + it's 23h).
    let futureLabel = 'Prochains pronos';
    if (futureTop.length) {
      const firstDate = new Date(futureTop[0].m.date);
      const tomorrowParis = (() => {
        const t = new Date(); t.setDate(t.getDate() + 1);
        return t.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
      })();
      const dLabel = firstDate.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
      if (dLabel === tomorrowParis) futureLabel = 'Prochains pronos · demain';
      else {
        const dayName = firstDate.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long' });
        futureLabel = `Prochains pronos · ${dayName}`;
      }
    }

    // Chantier DD — si Pari du jour = top1 hero, ne pas afficher la bannière
    // séparée (redondance). On laisse juste le hero normal dans ce cas.
    // Sinon, on affiche la bannière PDJ au-dessus.
    const pdjSameAsHero = pariDuJour && top5[0] && pariDuJour.m.id === top5[0].m.id;
    const pdjBannerHtml = (pariDuJour && !pdjSameAsHero) ? renderPariDuJour(pariDuJour) : '';
    // Ruban "Pari du jour" à injecter dans le hero si c'est le même pick
    const heroPdjRibbon = pdjSameAsHero
      ? `<div style="position:absolute;top:0;right:0;padding:6px 14px;background:linear-gradient(135deg,#a78bfa,#f472b6);color:#fff;font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;border-bottom-left-radius:10px;z-index:2;">🏆 Pari du jour</div>`
      : '';

    // v30 — Coach IA top-pronos narrative retirée.
    const topNarrativeHtml = '';

    wrap.innerHTML = `
      ${pdjBannerHtml}
      ${topNarrativeHtml}
      ${top5.length ? `
        <div class="section-header top-picks">
          <h2><span class="ico">🏆</span>Top 5 pronos du jour <span style="font-size:12px;color:var(--text-dim2,#7b8693);font-weight:500;letter-spacing:0;">· classés par fiabilité</span></h2>
          <div class="hint">Classement pur-modèle : fiabilité (consensus multi-sources). Les matchs joués glissent en dehors automatiquement.</div>
        </div>
        <div class="top-hero-wrap" style="position:relative;">
          ${heroPdjRibbon}
          ${renderHeroPick(top5[0])}
          ${top5.length > 1 ? `
            <div class="top-minis">
              ${top5.slice(1).map((x, i) => renderMiniPick(x, i+2)).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}
      ${others.length ? `
        <div class="section-header top-picks" style="margin-top:18px;">
          <h2><span class="ico">⭐</span>Autres pronos du jour</h2>
          <div class="hint">Pronostics fiables mais moins prioritaires que le top 5</div>
        </div>
        <div class="top-picks-grid">
          ${others.map(renderOther).join('')}
        </div>
      ` : ''}
      ${!top5.length && !others.length ? `
        <div class="section-header top-picks">
          <h2><span class="ico">⭐</span>Top pronostics du jour</h2>
          <div class="hint">Aucun prono fiable aujourd'hui. ${futureTop.length ? 'Voici les prochains ci-dessous :' : 'Les prochains apparaîtront ici dès qu\'ils arrivent.'}</div>
        </div>
      ` : ''}
      ${futureTop.length ? `
        <div class="section-header top-picks" style="margin-top:18px;">
          <h2><span class="ico">🌅</span>${esc(futureLabel)}</h2>
          <div class="hint">Pronostics fiables pour la journée suivante — anticipation</div>
        </div>
        <div class="top-picks-grid">
          ${futureTop.map(renderOther).join('')}
        </div>
      ` : ''}
    `;
    wrap.querySelectorAll('.top-pick, .top-hero, .pari-du-jour').forEach(card => {
      // Make each card keyboard-accessible.
      if (!card.hasAttribute('role')) card.setAttribute('role', 'button');
      if (!card.hasAttribute('tabindex')) card.setAttribute('tabindex', '0');
      const activate = (ev) => {
        // Don't open detail when clicking a link or button inside the card
        if (ev && ev.target && ev.target.closest && ev.target.closest('a, button')) return;
        const id = card.dataset.id;
        let match = null;
        for (const day of Object.keys(window.PRONOSTICS_DATA.days || {})) {
          match = (window.PRONOSTICS_DATA.days[day] || []).find(m => m.id === id);
          if (match) break;
        }
        if (match) openDetail(match);
      };
      card.addEventListener('click', activate);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(e); }
      });
    });
    // v30 — Handler "J'ai parié" (.tp-mybet) retiré : tracking utilisateur désactivé.
  }

  // ======= COMBINÉS (parlays) =======
  // Builds 3 combinés per day from upcoming matches:
  //  - "Sécurisé"  : 3 legs with prob ≥ 0.68 (lowest risk)
  //  - "Équilibré" : 4 legs with 0.55 ≤ prob < 0.68 (mid odds/risk)
  //  - "Value"     : 3 legs of value bets (highest edge)
  function pickOddFor(pred) {
    if (!pred?.odds || !pred.pick) return null;
    const k = pred.pick.key;
    const o = k === '1' ? pred.odds.home : k === '2' ? pred.odds.away : pred.odds.draw;
    return o && o > 1 ? o : null;
  }

  // Build 3 combinés (safe / balanced / value) from the pool of UPCOMING matches
  // within a given time window. maxMinutes: -1 means "no upper cap".
  // Each leg includes a `startIn` (minutes until kickoff) — negative means
  // already past (filtered out).
  function buildCombines(matches, opts = {}) {
    const minMinutes = opts.minMinutes ?? 0;            // must kick off after this
    const maxMinutes = opts.maxMinutes ?? -1;           // cap on kickoff time
    const safeTarget = opts.safeTarget ?? 3;
    const balancedTarget = opts.balancedTarget ?? 4;
    const boldTarget = opts.boldTarget ?? 3;

    const now = Date.now();
    // Enrich with prediction, odds, time-to-kickoff
    const pool = matches
      .filter(m => !m.completed && m.status !== 'STATUS_IN_PROGRESS')
      .map(m => {
        const pred = predictMatch(m);
        const odd = pickOddFor(pred);
        const d = m.date ? new Date(m.date) : null;
        const startIn = d && !isNaN(d) ? Math.round((d.getTime() - now) / 60000) : null;
        const rel = pred ? (pred.reliability ?? pred.pick?.prob) : null;
        return { m, pred, odd, startIn, rel };
      })
      .filter(x => x.pred && x.pred.pick && x.odd && !x.pred.skip)
      // Skip anything already started (odds no longer bookable on Winamax
      // pre-match market) or too far in the future.
      .filter(x => x.startIn !== null && x.startIn >= minMinutes && (maxMinutes < 0 || x.startIn <= maxMinutes));

    // Chantier P — anti-corrélation.
    // Deux jambes sont corrélées si : (a) même league, (b) même équipe impliquée
    // (impossible en pratique car 1 match/jour/équipe mais au cas où), (c) kickoff
    // simultané ±10min dans la même ligue (derby / journée foot groupée). La
    // fonction renvoie la liste après élagage glouton : on garde le pick le plus
    // fiable en premier, puis on écarte tout ce qui est corrélé à un pick déjà
    // retenu.
    const dedupCorrelated = (candidates, { sameLeague = true } = {}) => {
      const picked = [];
      for (const c of candidates) {
        const lg = c.m.league_name || c.m.league || null;
        const homeId = c.m.home_team_id || c.m.homeTeamId || (c.m.competitors?.[0]?.id) || null;
        const awayId = c.m.away_team_id || c.m.awayTeamId || (c.m.competitors?.[1]?.id) || null;
        const startMs = c.m.date ? new Date(c.m.date).getTime() : null;
        const conflict = picked.some(p => {
          const plg = p.m.league_name || p.m.league || null;
          if (sameLeague && lg && plg && lg === plg) return true;
          const phomeId = p.m.home_team_id || p.m.homeTeamId || (p.m.competitors?.[0]?.id) || null;
          const pawayId = p.m.away_team_id || p.m.awayTeamId || (p.m.competitors?.[1]?.id) || null;
          if (homeId && (homeId === phomeId || homeId === pawayId)) return true;
          if (awayId && (awayId === phomeId || awayId === pawayId)) return true;
          const pstart = p.m.date ? new Date(p.m.date).getTime() : null;
          if (startMs && pstart && Math.abs(startMs - pstart) <= 10*60*1000 && lg === plg) return true;
          return false;
        });
        if (!conflict) picked.push(c);
      }
      return picked;
    };

    const safe = dedupCorrelated(
      pool.filter(x => x.rel >= 0.68 && x.odd >= 1.20 && x.odd <= 2.10)
          .sort((a, b) => b.rel - a.rel)
    ).slice(0, safeTarget);

    const balanced = dedupCorrelated(
      pool.filter(x => x.rel >= 0.55 && x.rel < 0.72 && x.odd >= 1.55 && x.odd <= 3.20)
          .filter(x => !safe.find(s => s.m.id === x.m.id))
          .sort((a, b) => b.rel - a.rel)
    ).slice(0, balancedTarget);

    // "Audacieux" = picks fiables sur cotes plus hautes (fiab ≥ 55%, cote ≥ 2.2).
    const bold = dedupCorrelated(
      pool.filter(x => x.rel >= 0.55 && x.odd >= 2.20 && x.odd <= 4.50)
          .filter(x => !safe.find(s => s.m.id === x.m.id) && !balanced.find(s => s.m.id === x.m.id))
          .sort((a, b) => b.rel - a.rel)
    ).slice(0, boldTarget);

    // Chantier P — combiné "Lock Combo" : uniquement des picks fiab ≥ 0.70,
    // 2 à 3 jambes max, sans corrélation ligue/équipe/horaire. C'est le
    // combiné "hautes convictions" demandé par Théo.
    const lockCombo = dedupCorrelated(
      pool.filter(x => x.pred.isLock === true && x.odd >= 1.30)
          .sort((a, b) => b.rel - a.rel)
    ).slice(0, 3);

    // Sort each combiné's legs by kickoff time (earliest first)
    [safe, balanced, bold, lockCombo].forEach(arr => arr.sort((a, b) => a.startIn - b.startIn));

    const combines = [];
    // Lock Combo passe en tête quand au moins 2 locks différents existent.
    if (lockCombo.length >= 2) combines.push({ type: 'locks', title: '🔒 Lock Combo', desc: 'Que des locks (fiab ≥ 70%) · anti-corrélation', legs: lockCombo });
    if (safe.length >= 2) combines.push({ type: 'safe', title: '🛡️ Sécurisé', desc: 'Pronostics fiables (haute conf.)', legs: safe });
    if (balanced.length >= 3) combines.push({ type: 'balanced', title: '⚖️ Équilibré', desc: 'Bon rapport risque/gain', legs: balanced });
    if (bold.length >= 2) combines.push({ type: 'bold', title: '🎯 Audacieux', desc: 'Fiabilité correcte sur cotes plus hautes', legs: bold });

    return combines.map(c => {
      const totalOdd = c.legs.reduce((acc, l) => acc * l.odd, 1);
      const avgProb = c.legs.reduce((acc, l) => acc + l.pred.pick.prob, 0) / c.legs.length;
      const combinedProb = c.legs.reduce((acc, l) => acc * l.pred.pick.prob, 1);
      // Earliest kickoff = when the combiné becomes locked (first leg starts)
      const nextKickoff = Math.min(...c.legs.map(l => l.startIn));
      return { ...c, totalOdd, avgProb, combinedProb, nextKickoff };
    });
  }

  // Human-friendly "in 2h 30" label from a duration in minutes
  function fmtIn(mins) {
    if (mins == null) return '';
    if (mins < 0) return 'démarré';
    if (mins < 1) return 'imminent';
    if (mins < 60) return `dans ${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `dans ${h}h${String(m).padStart(2,'0')}` : `dans ${h}h`;
  }

  function renderCombines() {
    const wrap = document.getElementById('combines-wrap');
    if (!wrap) return;
    const data = window.PRONOSTICS_DATA;
    if (!data || !data.days) { wrap.innerHTML = ''; return; }

    // Flatten all upcoming events across all days — we'll slice by time window.
    // This makes combinés time-driven, not day-driven: the legs shown depend
    // on "when does it kick off" rather than "what date is it today".
    const allEvents = [];
    Object.values(data.days).forEach(arr => allEvents.push(...(arr || [])));
    // Winamax-only gate so combinés never suggest bets the user can't place.
    const filteredEvents = winamaxOnly
      ? allEvents.filter(m => m.winamax && m.winamax.available === true)
      : allEvents;

    // Three rolling time windows (minutes from now)
    // The "pre-match" odds on Winamax close at kickoff, so minMinutes >= 0
    // ensures we never recommend matches that have already started.
    const windows = [
      { key: 'now',    label: '⏱️ Dans les 2h',      min: 0,   max: 120,  desc: 'Prochains coups d\'envoi' },
      { key: 'soon',   label: '🕐 2h à 6h',           min: 120, max: 360,  desc: 'Plus tard dans la journée' },
      { key: 'today',  label: '📅 Après ce soir',     min: 360, max: 1440, desc: 'Dans les 24h' },
      { key: 'later',  label: '🗓️ 24h à 72h',         min: 1440, max: 4320, desc: 'Plus tard cette semaine' },
    ];

    const now = new Date();
    const sections = windows.map(w => {
      const combines = buildCombines(filteredEvents, { minMinutes: w.min, maxMinutes: w.max });
      if (!combines.length) return '';

      return `
        <div class="combine-day">
          <div class="combine-day-header">
            <span>${esc(w.label)}</span>
            <span class="dt">${esc(w.desc)}</span>
          </div>
          <div class="combine-grid">
            ${combines.map(c => {
              const stakeRet = (c.totalOdd * 10).toFixed(2);
              const lockIn = fmtIn(c.nextKickoff);
              const legsHtml = c.legs.map(l => {
                const { home, away } = getSides(l.m);
                const league = l.m.league_name || sportLabel(l.m.sport);
                const tIn = fmtIn(l.startIn);
                return `
                  <div class="combine-leg" data-id="${esc(l.m.id)}">
                    <div class="leg-match">${esc(home?.short || home?.name || '?')} <span style="color:var(--text-dim2);">vs</span> ${esc(away?.short || away?.name || '?')} · ${esc(league)} · <span class="leg-time">${esc(fmtTime(l.m.date))} · ${esc(tIn)}</span></div>
                    <div class="leg-pick">🎯 ${esc(l.pred.pick.label)} <span style="color:var(--text-dim);font-weight:500;">(${Math.round(l.pred.pick.prob*100)}%)</span></div>
                    <div class="leg-odd">@${l.odd.toFixed(2)}</div>
                  </div>
                `;
              }).join('');
              // Compose a plain-text version of the combiné legs for clipboard.
              // Format: "Équilibré · ×3.12 (prob. 32%)" then one leg per line.
              const copyText = (() => {
                // Fix : \w ne matche pas les accents (É, è…) en ASCII.
                // On enlève seulement les symboles ponctuation/emoji en tête.
                const header = `${c.title.replace(/^[^\p{L}\p{N}]+/u, '').trim()} · ×${c.totalOdd.toFixed(2)} (prob. ${Math.round(c.combinedProb*100)}%) · 10€ → ${stakeRet}€`;
                const lines = c.legs.map(l => {
                  const { home, away } = getSides(l.m);
                  const lg = l.m.league_name || sportLabel(l.m.sport);
                  const when = fmtTime(l.m.date);
                  return `• ${home?.short || home?.name || '?'} vs ${away?.short || away?.name || '?'} (${lg}, ${when}) — ${l.pred.pick.label} @ ${l.odd.toFixed(2)}`;
                });
                return `${header}\n${lines.join('\n')}`;
              })();
              return `
                <div class="combine-card ${c.type}">
                  <div class="combine-head">
                    <div class="combine-title">${c.title}<span style="color:var(--text-dim);font-weight:500;font-size:11px;">· ${c.legs.length} sélections</span></div>
                    <div style="display:flex;gap:10px;align-items:center;">
                      ${confGauge(c.combinedProb, 'sm')}
                      <button class="combine-copy-btn" data-copy="${esc(copyText)}" title="Copier le combiné (texte)" aria-label="Copier le combiné">📋</button>
                    </div>
                  </div>
                  <div class="combine-desc" style="font-size:11px;color:var(--text-dim);">${esc(c.desc)} · 1er match <b style="color:var(--text);">${esc(lockIn)}</b></div>
                  <div class="combine-legs">${legsHtml}</div>
                  <div class="combine-footer">
                    <div class="combine-stat">Côte totale <b>${c.totalOdd.toFixed(2)}</b> · prob. combinée <b>${Math.round(c.combinedProb*100)}%</b></div>
                    <div style="text-align:right;">
                      <div class="combine-odd">×${c.totalOdd.toFixed(2)}</div>
                      <div class="combine-return">10€ → ${stakeRet}€</div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).filter(Boolean).join('');

    if (!sections) {
      wrap.innerHTML = `
        <div class="section-header top-picks" style="margin-top:16px;">
          <h2><span class="ico">🎰</span>Combinés suggérés</h2>
          <div class="hint">Aucun combiné disponible — aucun match avec cotes dans la fenêtre pré-match.</div>
        </div>`;
      return;
    }

    // Chantier EEEE — builder Combiné IA : 1 combiné "optimal" anti-corrélé
    const iaCombineHtml = (() => {
      try {
        const size = (typeof _eeeeComboSize === 'number') ? _eeeeComboSize : 3;
        const picked = suggestCombineIA(filteredEvents, size);
        if (!picked.legs || !picked.legs.length) {
          return `<div class="ia-combine-card" style="margin:16px 0;padding:16px 18px;background:var(--panel);border:1px solid var(--border);border-left:3px solid var(--brand);border-radius:12px;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <span style="font-size:18px;">🎲</span>
              <h3 style="margin:0;font-size:14px;letter-spacing:.4px;text-transform:uppercase;color:var(--text-dim);font-weight:700;">Combiné optimal</h3>
            </div>
            <div style="font-size:13px;color:var(--text-dim,#b4bcc7);line-height:1.5;">${esc(picked.reason || 'Pas de suggestion disponible.')}</div>
          </div>`;
        }
        const legsHtml = picked.legs.map(l => {
          const { home, away } = getSides(l.m);
          const lg = l.m.league_name || sportLabel(l.m.sport);
          const when = fmtTime(l.m.date);
          return `<div class="combine-leg" data-id="${esc(l.m.id)}" style="display:flex;flex-direction:column;gap:3px;padding:10px 12px;background:rgba(255,255,255,.03);border-radius:8px;border:1px solid rgba(255,255,255,.05);">
            <div style="font-size:13px;font-weight:600;">${esc(home?.short || home?.name || '?')} <span style="color:var(--text-dim2);">vs</span> ${esc(away?.short || away?.name || '?')}</div>
            <div style="font-size:11px;color:var(--text-dim,#b4bcc7);">${esc(lg)} · ${esc(when)}</div>
            <div style="margin-top:4px;display:flex;align-items:center;gap:8px;"><span style="color:#10b981;font-weight:600;font-size:13px;">🎯 ${esc(l.pred.pick.label)}</span><span style="color:var(--text-dim);font-size:11px;">(${Math.round((l.rel||0)*100)}%)</span><span style="margin-left:auto;color:#a78bfa;font-weight:700;font-size:13px;">@${l.odd.toFixed(2)}</span></div>
          </div>`;
        }).join('');
        const retHtml = picked.totalOdd ? (10 * picked.totalOdd).toFixed(2) : '—';
        const epPct = picked.expectedPL != null ? (picked.expectedPL * 100).toFixed(0) : '0';
        const epTone = (picked.expectedPL || 0) > 0 ? 'color:#10b981;' : 'color:#fca5a5;';
        const copyTxt = `🤖 Combiné IA × ${picked.totalOdd.toFixed(2)} (prob. ${Math.round((picked.combProb||0)*100)}%) · 10€ → ${retHtml}€\n` +
          picked.legs.map(l => {
            const { home, away } = getSides(l.m);
            return `• ${home?.short || home?.name || '?'} vs ${away?.short || away?.name || '?'} — ${l.pred.pick.label} @ ${l.odd.toFixed(2)}`;
          }).join('\n');
        return `<div class="ia-combine-card" style="margin:16px 0;padding:16px 18px;background:var(--panel);border:1px solid var(--border);border-left:3px solid var(--brand);border-radius:12px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap;">
            <span style="font-size:18px;">🎲</span>
            <h3 style="margin:0;font-size:14px;letter-spacing:.4px;text-transform:uppercase;color:var(--text-dim);font-weight:700;">Combiné optimal</h3>
            <div style="margin-left:auto;display:flex;gap:6px;">
              ${[2,3,4].map(n => `<button class="eeee-size-btn${n===size?' active':''}" data-size="${n}" style="padding:4px 10px;background:${n===size?'rgba(167,139,250,.3)':'rgba(255,255,255,.05)'};color:${n===size?'#a78bfa':'var(--text-dim)'};border:1px solid ${n===size?'rgba(167,139,250,.5)':'rgba(255,255,255,.1)'};border-radius:6px;font-size:12px;cursor:pointer;font-weight:600;">${n} legs</button>`).join('')}
              <button class="eeee-copy-btn" data-copy="${esc(copyTxt)}" title="Copier le combiné" style="padding:4px 10px;background:rgba(255,255,255,.05);color:var(--text-dim);border:1px solid rgba(255,255,255,.1);border-radius:6px;font-size:12px;cursor:pointer;">📋</button>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-dim,#b4bcc7);margin-bottom:12px;line-height:1.4;">${picked.legs.length} locks Winamax anti-corrélés (max 1 leg par ligue-jour, max 2 par sport). Filtré par proba × ln(cote).</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-bottom:12px;">${legsHtml}</div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;padding-top:10px;border-top:1px solid rgba(255,255,255,.06);">
            <div><span style="font-size:11px;color:var(--text-dim2,#7b8693);">Cote totale</span> <b style="color:#a78bfa;font-size:18px;margin-left:6px;">×${picked.totalOdd.toFixed(2)}</b></div>
            <div><span style="font-size:11px;color:var(--text-dim2,#7b8693);">Prob. combinée</span> <b style="margin-left:6px;">${Math.round((picked.combProb||0)*100)}%</b></div>
            <div><span style="font-size:11px;color:var(--text-dim2,#7b8693);">Espérance P&L (1u)</span> <b style="${epTone}margin-left:6px;">${(picked.expectedPL||0)>=0?'+':''}${epPct}%</b></div>
            <div style="margin-left:auto;font-size:13px;"><span style="color:var(--text-dim,#b4bcc7);">10€ →</span> <b style="color:#10b981;font-size:16px;">${retHtml}€</b></div>
          </div>
        </div>`;
      } catch (e) { console.warn('[EEEE] suggestCombineIA failed', e); return ''; }
    })();

    // v24 — Combiné Buteurs : top 3 joueurs les plus probables sur 3 matchs différents
    const buteurCombineHtml = (() => {
      try {
        const todayIso = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
        const todayMatches = (data.days[todayIso] || []).filter(m =>
          m.sport === 'football' && !m.completed && !m.live &&
          m.winamax && m.winamax.available === true
        );
        const bestPerMatch = [];
        todayMatches.forEach(m => {
          try {
            const pred = predictMatch(m);
            if (!pred || pred.skip) return;
            const scorers = predictLikelyScorers(m, pred);
            if (!scorers || !scorers.length) return;
            const top = scorers[0];
            if (top.prob < 0.30) return;
            bestPerMatch.push({ m, scorer: top });
          } catch(e){}
        });
        bestPerMatch.sort((a, b) => b.scorer.prob - a.scorer.prob);
        const legs = bestPerMatch.slice(0, 3);
        if (legs.length < 2) return '';
        const combProb = legs.reduce((p, l) => p * l.scorer.prob, 1);
        const combOdd = legs.reduce((o, l) => o * (l.scorer.impliedOdd || 1 / l.scorer.prob), 1);
        const return10 = (combOdd * 10).toFixed(2);
        const legsHtml = legs.map(l => {
          // v24.3 fix — noms équipes depuis competitors
          const hC = l.m.competitors && l.m.competitors.find(c => c.home_away === 'home') || {};
          const aC = l.m.competitors && l.m.competitors.find(c => c.home_away === 'away') || {};
          const hName = hC.name || hC.short || '?';
          const aName = aC.name || aC.short || '?';
          // v29 — face shot via Sofascore CDN when player id is known. The
          // img hides itself on 404 so missing photos fall back cleanly.
          const faceHtml = l.scorer.pid
            ? `<img src="https://img.sofascore.com/api/v1/player/${l.scorer.pid}/image" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;background:var(--bg);border:1px solid var(--border);flex-shrink:0;" onerror="this.style.display='none'">`
            : `<div style="width:36px;height:36px;border-radius:50%;background:var(--bg);border:1px solid var(--border);display:grid;place-items:center;font-size:13px;font-weight:700;color:var(--text-dim);flex-shrink:0;">${esc((l.scorer.name||'?').split(/\s+/).slice(-1)[0]?.[0]||'?')}</div>`;
          return `
          <div style="display:grid;grid-template-columns:36px 1fr auto auto;gap:12px;padding:10px 12px;border-bottom:1px solid var(--border);align-items:center;">
            ${faceHtml}
            <div style="min-width:0;">
              <div style="font-size:13.5px;font-weight:600;color:var(--text);">${esc(l.scorer.name)}${l.scorer.captain ? ' ©' : ''} <span style="color:var(--text-dim);font-weight:500;">marque</span></div>
              <div style="font-size:11px;color:var(--text-dim);">${esc(hName)} vs ${esc(aName)} · ${esc(l.m.league_name || l.m.league_code || '')}</div>
            </div>
            <div style="font-size:12px;color:var(--text-dim);font-variant-numeric:tabular-nums;">${l.scorer.impliedOdd ? '@' + l.scorer.impliedOdd.toFixed(2) : '—'}</div>
            <div style="font-size:14px;font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums;">${(l.scorer.prob*100).toFixed(0)}%</div>
          </div>
        `;}).join('');
        return `
          <div style="margin-top:14px;background:linear-gradient(135deg,var(--brand-soft),var(--accent-soft));border:1px solid var(--brand-border);border-radius:var(--r-xl);overflow:hidden;">
            <div style="padding:16px 18px;border-bottom:1px solid var(--border);">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px;flex-wrap:wrap;">
                <div style="font-size:14px;font-weight:700;color:var(--text);">⚽ Combiné Buteurs du jour</div>
                <span style="font-size:10px;padding:2px 8px;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-weight:700;letter-spacing:.4px;text-transform:uppercase;">v24</span>
              </div>
              <div style="font-size:12px;color:var(--text-dim);">${legs.length} joueurs différents avec les meilleures chances de marquer ce soir.</div>
            </div>
            <div style="background:var(--panel);">
              ${legsHtml}
            </div>
            <div style="padding:14px 18px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
              <div><span style="font-size:11px;color:var(--text-dim);">Cote totale</span> <b style="color:var(--brand);font-size:18px;margin-left:6px;font-variant-numeric:tabular-nums;">×${combOdd.toFixed(2)}</b></div>
              <div><span style="font-size:11px;color:var(--text-dim);">Probabilité</span> <b style="margin-left:6px;font-variant-numeric:tabular-nums;">${(combProb*100).toFixed(0)}%</b></div>
              <div style="margin-left:auto;font-size:13px;"><span style="color:var(--text-dim);">10€ →</span> <b style="color:var(--accent);font-size:16px;font-variant-numeric:tabular-nums;">${return10}€</b></div>
            </div>
            <div style="padding:10px 18px;background:var(--panel-2);font-size:11px;color:var(--text-dim);line-height:1.5;border-top:1px solid var(--border);">
              ⚠️ Risque élevé : un combiné de 3 buteurs a ~${(combProb*100).toFixed(0)}% de chance de réussir. Mise 0,5-1€ max, pas plus.
            </div>
          </div>`;
      } catch(e) { return ''; }
    })();

    wrap.innerHTML = `
      <div style="max-width:1280px;margin:0 auto;padding:4px 0 0;">
        <div style="margin-bottom:24px;padding:32px 0 20px;border-bottom:1px solid var(--border);position:relative;">
          <div style="position:absolute;top:0;left:0;width:40px;height:3px;background:var(--purple);border-radius:0 0 2px 2px;"></div>
          <div style="font-size:11px;color:var(--purple);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:6px;">Multi-paris</div>
          <h1 style="margin:0 0 6px;font-size:40px;font-weight:800;letter-spacing:-1.4px;color:var(--text);line-height:1.1;">Combinés</h1>
          <div style="font-size:14px;color:var(--text-dim);max-width:640px;">Paris combinés générés automatiquement, anti-corrélés, recalculés en continu. À utiliser avec modération.</div>
        </div>
        ${iaCombineHtml}
        ${buteurCombineHtml}
        <div class="combine-section">${sections}</div>
      </div>
    `;
    wrap.querySelectorAll('.combine-leg').forEach(el => {
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      const activate = () => {
        const id = el.dataset.id;
        for (const day of Object.keys(window.PRONOSTICS_DATA.days || {})) {
          const match = (window.PRONOSTICS_DATA.days[day] || []).find(m => m.id === id);
          if (match) { openDetail(match); return; }
        }
      };
      el.addEventListener('click', activate);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    });
    // Copy combiné to clipboard
    wrap.querySelectorAll('.combine-copy-btn').forEach(btn => btn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const text = btn.dataset.copy || '';
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // Fallback for older browsers
          const ta = document.createElement('textarea');
          ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta);
        }
        toast('✓ Combiné copié dans le presse-papier', 'success');
      } catch (e) {
        toast('Impossible de copier', 'error');
      }
    }));

    // Chantier EEEE — Combiné IA : boutons taille + copie
    wrap.querySelectorAll('.eeee-size-btn').forEach(btn => btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const n = parseInt(btn.dataset.size, 10);
      if (!n || n === _eeeeComboSize) return;
      _eeeeComboSize = n;
      renderCombines();
    }));
    wrap.querySelectorAll('.eeee-copy-btn').forEach(btn => btn.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const text = btn.dataset.copy || '';
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
        else {
          const ta = document.createElement('textarea');
          ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta);
        }
        toast('✓ Combiné IA copié', 'success');
      } catch (e) { toast('Impossible de copier', 'error'); }
    }));
  }
  // Chantier EEEE — state taille combiné IA (2/3/4 legs)
  let _eeeeComboSize = 3;

  function sportLabel(s) {
    return {
      football: 'Football', tennis: 'Tennis', basketball: 'Basketball',
      hockey: 'Hockey', 'american-football': 'Football US',
      mma: 'MMA', golf: 'Golf', racing: 'Course'
    }[s] || s;
  }

  // Icône cohérente par sport (Chantier 1). Centralise pour qu'un ajout de
  // sport ne nécessite pas de toucher 5 endroits. Retourne l'emoji à insérer
  // tel quel ; les consommateurs décident de la taille/spacing.
  function sportIcon(s) {
    return {
      football: '⚽', tennis: '🎾', basketball: '🏀', hockey: '🏒',
      'american-football': '🏈', mma: '🥊', golf: '⛳', racing: '🏎️',
    }[s] || '🏅';
  }

  // v30 — League logo URL using ESPN's stable CDN format.
  // ESPN serves league logos at /i/leaguelogos/<sport>/500/<slug>.png — the
  // slug usually matches league_code (nba, nhl, mlb, ufc, atp, wta…) or the
  // league_code's part after the dot (eng.1 → eng_1, esp.1 → esp_1, etc.).
  // Returns null if we can't form a likely URL — caller falls back gracefully.
  // v30 — Cache localStorage des URLs 404 connues : ESPN renvoie 404 pour ~27
  // codes ligue (esp_1, ger_1, eng_fa, bel_1, sco_1…). Plutôt que de relancer
  // ces requêtes à chaque page, on les note et on retourne null au prochain
  // appel. Le cache est nettoyé au-delà de 7 jours pour récupérer les ligues
  // dont l'asset est apparu entre-temps. Coalesce : on n'écrit qu'une fois
  // par jour (anti-thrashing localStorage).
  const _LEAGUE_LOGO_404_KEY = 'leagueLogo404Cache';
  let _leagueLogo404Cache = (() => {
    try {
      const raw = JSON.parse(localStorage.getItem(_LEAGUE_LOGO_404_KEY) || '{}');
      const cutoff = Date.now() - 7 * 86400000;
      const fresh = {};
      Object.entries(raw).forEach(([k, v]) => { if (v > cutoff) fresh[k] = v; });
      return fresh;
    } catch(e) { return {}; }
  })();
  let _leagueLogo404Dirty = false;
  function _leagueLogoMark404(url) {
    if (!url || _leagueLogo404Cache[url]) return;
    _leagueLogo404Cache[url] = Date.now();
    _leagueLogo404Dirty = true;
  }
  // Flush dirty cache once per minute (event-driven, no localStorage spam)
  setInterval(() => {
    if (!_leagueLogo404Dirty) return;
    try { localStorage.setItem(_LEAGUE_LOGO_404_KEY, JSON.stringify(_leagueLogo404Cache)); } catch(e){}
    _leagueLogo404Dirty = false;
  }, 60 * 1000);
  window._leagueLogoMark404 = _leagueLogoMark404;

  function leagueLogoUrl(match) {
    if (!match || !match.league_code) return null;
    const code = String(match.league_code);
    const sport = match.sport;
    let url = null;
    // Football: ESPN uses dot-separated codes mapped to numeric IDs in their
    // CDN, but the slug form (eng_1, esp_1, fra_1) also works for many.
    if (sport === 'football') {
      const slug = code.replace(/\./g, '_');
      url = `https://a.espncdn.com/i/leaguelogos/soccer/500/${slug}.png`;
    } else if (sport === 'basketball') {
      url = `https://a.espncdn.com/i/leaguelogos/basketball/500/${code}.png`;
    } else if (sport === 'hockey') {
      url = `https://a.espncdn.com/i/leaguelogos/hockey/500/${code}.png`;
    } else if (sport === 'baseball') {
      url = `https://a.espncdn.com/i/leaguelogos/baseball/500/${code}.png`;
    } else if (sport === 'tennis') {
      url = `https://a.espncdn.com/i/leaguelogos/tennis/500/${code}.png`;
    } else if (sport === 'mma') {
      url = `https://a.espncdn.com/i/leaguelogos/mma/500/${code}.png`;
    }
    // Skip URLs marquées 404 dans la session précédente — saves ~150ms FCP.
    if (url && _leagueLogo404Cache[url]) return null;
    return url;
  }

  // v30 — Sport-specific contextual info shown above the betting odds.
  // Helps the user assess the match without clicking through. Returns a
  // ready-to-insert HTML string or '' when no info is available.
  function sportSpecificInfo(m, home, away) {
    if (!m) return '';
    const sport = m.sport;
    const bits = [];
    if (sport === 'tennis') {
      // Round (e.g. "Round of 64", "Quarterfinals"), draw (singles/doubles),
      // surface (Hard/Clay/Grass). All are static info, no model needed.
      if (m.round) bits.push(`<span style="color:var(--text-dim);">🎾 ${esc(m.round)}</span>`);
      if (m.draw) {
        const drawLabel = {
          'mens-singles': 'Simple H',
          'womens-singles': 'Simple F',
          'mens-doubles': 'Double H',
          'womens-doubles': 'Double F',
          'mixed-doubles': 'Double mixte',
        }[m.draw] || m.draw.replace(/-/g,' ');
        bits.push(`<span style="color:var(--text-dim);">${esc(drawLabel)}</span>`);
      }
      if (m.surface) {
        const sfc = String(m.surface).toLowerCase();
        const sfcLabel = sfc.includes('clay') || sfc.includes('terre') ? '🟠 Terre battue'
                       : sfc.includes('grass') || sfc.includes('gazon') ? '🟢 Gazon'
                       : sfc.includes('hard') || sfc.includes('dur') ? '🔵 Dur'
                       : '· ' + esc(m.surface);
        bits.push(`<span>${sfcLabel}</span>`);
      }
      // Seed gap if both sides seeded
      const sH = home?.rank, sA = away?.rank;
      if (sH && sA) {
        const diff = Math.abs(sH - sA);
        if (diff >= 8) {
          const fav = sH < sA ? home?.short || home?.name : away?.short || away?.name;
          bits.push(`<span style="color:var(--text);"><b>${esc(fav)}</b> tête de série favorisée (#${Math.min(sH,sA)} vs #${Math.max(sH,sA)})</span>`);
        }
      }
    } else if (sport === 'basketball' || sport === 'hockey' || sport === 'baseball') {
      // Pour ces sports US, le record (W-L) est déjà rendu dans la team-row
      // via getRecord(). Ici on ajoute le différentiel de victoires si net.
      const recHObj = parseRecord(getRecord(home));
      const recAObj = parseRecord(getRecord(away));
      if (recHObj && recAObj && recHObj.games >= 5 && recAObj.games >= 5) {
        const wpH = recHObj.w / Math.max(1, recHObj.games);
        const wpA = recAObj.w / Math.max(1, recAObj.games);
        const wpDiff = Math.abs(wpH - wpA);
        if (wpDiff >= 0.15) {
          const favName = wpH > wpA ? (home?.short || home?.name || 'Dom.') : (away?.short || away?.name || 'Ext.');
          const favWp = Math.round(Math.max(wpH, wpA) * 100);
          const dogWp = Math.round(Math.min(wpH, wpA) * 100);
          bits.push(`<span style="color:var(--text);">📊 <b>${esc(favName)}</b> meilleur bilan saison (${favWp}% vs ${dogWp}%)</span>`);
        } else {
          bits.push(`<span style="color:var(--text-dim);">📊 Bilans saison équilibrés (${Math.round(wpH*100)}% / ${Math.round(wpA*100)}%)</span>`);
        }
      }
      // Leaders : rendre le top scorer si ESPN a peuplé le stat (rare mais utile)
      const topLeader = (side) => {
        const leaders = side?.leaders || [];
        for (const l of leaders) {
          if (l && l.player && l.stat != null) {
            return { player: l.player, stat: l.stat, cat: l.cat };
          }
        }
        return null;
      };
      const tlH = topLeader(home), tlA = topLeader(away);
      if (tlH || tlA) {
        const segs = [];
        if (tlH) segs.push(`<span><b>${esc(home?.abbr||'H')}</b>: ${esc(tlH.player)} ${esc(String(tlH.stat))}</span>`);
        if (tlA) segs.push(`<span><b>${esc(away?.abbr||'A')}</b>: ${esc(tlA.player)} ${esc(String(tlA.stat))}</span>`);
        bits.push(`<span style="color:var(--text-dim);">⭐ ${segs.join(' · ')}</span>`);
      }
    } else if (sport === 'mma') {
      // MMA est packagé en "fight night" event, on ajoute juste le venue
      if (m.venue) bits.push(`<span style="color:var(--text-dim);">📍 ${esc(m.venue)}</span>`);
    }
    if (!bits.length) return '';
    return `<div style="display:flex;flex-wrap:wrap;gap:10px;padding:6px 12px;font-size:11.5px;line-height:1.5;color:var(--text);background:var(--panel-2);border-radius:var(--r-sm);margin-top:4px;">
      ${bits.join('<span style="color:var(--text-dim2);">·</span>')}
    </div>`;
  }

  function renderCard(m) {
    const { home, away } = getSides(m);
    const pred = predictMatch(m);
    const status = m.status || '';
    const isLive = status === 'STATUS_IN_PROGRESS';
    const isFinal = m.completed || status === 'STATUS_FINAL' || status === 'STATUS_FULL_TIME';
    // Chantier X — snapshot la fiabilité pour la timeline 12h (sauf matchs terminés).
    if (pred && !isFinal && m.id != null && Number.isFinite(pred.reliability)) {
      snapshotReliability(m.id, pred.reliability);
    }
    const statusText = isLive ? (m.detail || 'Live') : (isFinal ? (m.detail || 'Terminé') : fmtTime(m.date));
    const statusCls = isLive ? 'live' : (isFinal ? 'final' : '');
    const modelResult = evaluateModelPick(m, pred);
    const cardCls = `match ${isLive ? 'live' : ''} ${isFinal ? 'final' : ''} ${modelResult ? 'model-' + modelResult : ''}`;

    const recH = getRecord(home);
    const recA = getRecord(away);
    const hWinner = home?.winner === true;
    const aWinner = away?.winner === true;

    const rankH = home?.rank;
    const rankA = away?.rank;

    // Odds section
    let oddsHtml = '';
    if (pred?.odds && (pred.odds.home || pred.odds.away)) {
      const { home: oH, draw: oD, away: oA } = pred.odds;
      const fmt = (n) => n != null ? n.toFixed(2) : '—';
      const isPick = (lbl) => pred.pick?.key === lbl;
      if (pred.hasDraw) {
        oddsHtml = `<div class="odds-row three">
          <div class="odd ${isPick('1') ? 'pick' : ''} ${oH && oH < 2 ? 'fav' : ''}"><div class="lbl">1</div><div class="val">${fmt(oH)}</div></div>
          <div class="odd ${isPick('X') ? 'pick' : ''}"><div class="lbl">N</div><div class="val">${fmt(oD)}</div></div>
          <div class="odd ${isPick('2') ? 'pick' : ''} ${oA && oA < 2 ? 'fav' : ''}"><div class="lbl">2</div><div class="val">${fmt(oA)}</div></div>
        </div>`;
      } else {
        oddsHtml = `<div class="odds-row two">
          <div class="odd ${isPick('1') ? 'pick' : ''} ${oH && oH < 2 ? 'fav' : ''}"><div class="lbl">1 ${esc(home?.abbr || '')}</div><div class="val">${fmt(oH)}</div></div>
          <div class="odd ${isPick('2') ? 'pick' : ''} ${oA && oA < 2 ? 'fav' : ''}"><div class="lbl">2 ${esc(away?.abbr || '')}</div><div class="val">${fmt(oA)}</div></div>
        </div>`;
      }
    }

    // v26.2 — Badges : uniquement les 3 décisifs (LIVE, Pari sûr, Top match)
    const badges = [];
    if (isLive) badges.push(`<span class="badge live">LIVE</span>`);
    if (pred?.isLock && !isFinal) badges.push(`<span class="badge lock">Pari sûr${isNewLock(m.id) ? ' <span style="background:#eab308;color:#0a0e17;padding:0 4px;border-radius:3px;font-size:9px;margin-left:2px;">NOUVEAU</span>' : ''}</span>`);
    if ((m.league_priority || 0) >= 5) badges.push(`<span class="badge big">Top match</span>`);

    // v26.2 — Ligne contextuelle synthétique (météo + arbitre + congestion + absents clés) — plus discret qu'une collection de badges
    const ctxBits = [];
    if (!isLive && !isFinal) {
      const wx = m.weather;
      if (wx && typeof wx.precip_mm === 'number' && wx.precip_mm > 3) ctxBits.push(`Pluie ${wx.precip_mm.toFixed(1)}mm/h`);
      else if (wx && typeof wx.wind_kmh === 'number' && wx.wind_kmh > 25) ctxBits.push(`Vent ${Math.round(wx.wind_kmh)}km/h`);
      const rf = m.referee;
      if (rf && typeof rf.yellowPerGame === 'number' && rf.yellowPerGame >= 4.5 && (rf.games || 0) >= 5) ctxBits.push(`Arbitre strict`);
      if (m.sport === 'football') {
        const mt = new Date(m.date).getTime();
        const cH = home?.name ? congestionCount(home.name, mt, 7) : 0;
        const cA = away?.name ? congestionCount(away.name, mt, 7) : 0;
        if (cH >= 3) ctxBits.push(`${esc(home?.abbr||'H')} calendrier chargé (${cH}m/7j)`);
        if (cA >= 3) ctxBits.push(`${esc(away?.abbr||'A')} calendrier chargé (${cA}m/7j)`);
      }
      const keyAbsent = (side) => {
        const injs = side?.injuries || [];
        const starters = side?.lineup?.starters || [];
        const starterNames = new Set(starters.map(s => (s.name || '').toLowerCase()));
        for (const inj of injs) {
          const nm = (inj.player || inj.name || '').toLowerCase();
          if (!nm) continue;
          if ((inj.type === 1 || inj.type === 2 || /out|blessure|injur/i.test(inj.reason_label || inj.type || '')) && !starterNames.has(nm)) {
            return inj.player || inj.name;
          }
        }
        return null;
      };
      const kH = keyAbsent(home);
      const kA = keyAbsent(away);
      if (kH) ctxBits.push(`${esc(kH.split(' ').slice(-1)[0])} absent (${esc(home?.abbr||'H')})`);
      if (kA) ctxBits.push(`${esc(kA.split(' ').slice(-1)[0])} absent (${esc(away?.abbr||'A')})`);
      const injH = m.injuries_home || 0, injA = m.injuries_away || 0;
      if (injH >= 2 && !kH) ctxBits.push(`${injH} absents ${esc(home?.abbr||'H')}`);
      if (injA >= 2 && !kA) ctxBits.push(`${injA} absents ${esc(away?.abbr||'A')}`);
    }
    const contextLine = ctxBits.length
      ? `<div style="padding:6px 12px;font-size:11px;color:var(--text-dim);line-height:1.5;margin-top:2px;">${ctxBits.slice(0, 4).map(b => esc(b)).join(' · ')}${ctxBits.length > 4 ? ` · +${ctxBits.length - 4}` : ''}</div>`
      : '';

    // Tipsters block (compact) — also shown post-match with win/lost badges
    const tipsHtml = (m.tips && m.tips.length) ? `
      <div class="tips-block">
        ${m.tips.slice(0,3).map(t => {
          const tr = evaluateTipsterPick(t.pick, m);
          const badge = tr ? resultBadgeHtml(tr, tr === 'won' ? t.odds : null) : '';
          return `
          <div class="tip-row">
            <span class="tip-src">${esc(sourceLabel(t.source))}</span>
            <span class="tip-pick" style="${tr === 'lost' ? 'text-decoration:line-through;opacity:.7;' : ''}">${esc(t.pick || '—')}</span>
            ${t.odds ? `<span class="tip-odds">@${t.odds.toFixed(2)}</span>` : ''}
            ${badge}
          </div>`;
        }).join('')}
      </div>` : '';

    // Prediction
    const predHtml = pred ? (() => {
      const cl = confLabel(pred.reliability ?? pred.pick.prob);
      const finalCls = modelResult ? ' final-' + modelResult : '';
      const resultBadge = modelResult ? resultBadgeHtml(modelResult, pred.odds && modelResult === 'won' ?
        (pred.pick.key === '1' ? pred.odds.home : pred.pick.key === '2' ? pred.odds.away : pred.odds.draw) : null) : '';
      const rightEl = isFinal ? resultBadge : confGauge(pred.reliability ?? pred.pick.prob, 'md');
      // Explanation section — pre-match, toujours montrer headline + raisons si dispo, sinon fallback forme
      const reasons = pred.explain?.reasons || [];
      const headline = pred.explain?.headline || '';
      // v24.1 — Fallback universel : si pas de reasons, au moins une ligne de forme comparative
      const formLine = (() => {
        try {
          const fH = (home?.form || '').slice(-5);
          const fA = (away?.form || '').slice(-5);
          if (!fH && !fA) return '';
          const wH = (fH.match(/W/g) || []).length;
          const wA = (fA.match(/W/g) || []).length;
          const shortH = home?.short || home?.abbr || 'Dom.';
          const shortA = away?.short || away?.abbr || 'Ext.';
          const desc = (w, f) => {
            const n = f.length;
            if (n === 0) return '—';
            return `${w}V sur ${n} derniers`;
          };
          return `<div style="font-size:11.5px;color:var(--text-dim2,#7b8693);display:flex;gap:10px;flex-wrap:wrap;">
            <span>📊 <b>${esc(shortH)}</b> : ${desc(wH, fH)}</span>
            <span>·</span>
            <span><b>${esc(shortA)}</b> : ${desc(wA, fA)}</span>
          </div>`;
        } catch(e) { return ''; }
      })();
      const showExplain = !isFinal && !isLive && (reasons.length || headline || formLine);
      const explainHtml = showExplain ? `
        <div style="padding:8px 10px;background:rgba(255,255,255,.02);border-top:1px solid rgba(255,255,255,.04);margin-top:2px;border-radius:0 0 6px 6px;">
          ${headline ? `<div style="font-size:11.5px;color:var(--text-dim,#b4bcc7);line-height:1.4;margin-bottom:${(reasons.length||formLine)?'6px':'0'};">${esc(headline)}</div>` : ''}
          ${reasons.length ? `<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:3px;">${reasons.slice(0,3).map(r => `<li style="font-size:11.5px;color:var(--text-dim2,#7b8693);display:flex;gap:6px;"><span>${r.icon}</span><span>${esc(r.text)}</span></li>`).join('')}</ul>` : (formLine || '')}
        </div>
      ` : '';
      // Chantier W — indicateur live sur le pick (gagnant / en cours / perdant)
      const liveSt = isLive ? evaluateLivePick(m, pred) : null;
      const liveBadge = liveSt ? (() => {
        if (liveSt === 'winning') return `<span style="background:rgba(16,185,129,.18);border:1px solid rgba(16,185,129,.4);color:#10b981;padding:2px 7px;border-radius:10px;font-size:10.5px;font-weight:700;letter-spacing:.3px;margin-left:6px;">✓ gagnant</span>`;
        if (liveSt === 'tied')    return `<span style="background:rgba(251,191,36,.18);border:1px solid rgba(251,191,36,.4);color:#fbbf24;padding:2px 7px;border-radius:10px;font-size:10.5px;font-weight:700;letter-spacing:.3px;margin-left:6px;">⏱️ en cours</span>`;
        return `<span style="background:rgba(252,165,165,.18);border:1px solid rgba(252,165,165,.4);color:#fca5a5;padding:2px 7px;border-radius:10px;font-size:10.5px;font-weight:700;letter-spacing:.3px;margin-left:6px;">✗ perdant</span>`;
      })() : '';
      return `
        <div class="pred-block${finalCls}">
          <div class="pred-row">
            <div class="pred-tip">
              <span class="ico">🎯</span>
              <span class="txt">${esc(pred.pick.label)}</span>
              ${!isFinal ? `<span class="pred-conf-lbl">${cl.lbl}</span>` : ''}
              ${liveBadge}
            </div>
            ${rightEl}
          </div>
          ${explainHtml}
        </div>
      `;
    })() : (isFinal && home && away ? `<div class="pred-block"><div style="color:var(--text-dim2); font-size:12px; text-align:center;">Résultat final</div></div>` : '');

    const showScore = isLive || isFinal;
    const a11yLabel = `${home?.name || 'Domicile'} vs ${away?.name || 'Extérieur'}${isLive ? ' — en direct' : isFinal ? ' — terminé' : ' — à ' + fmtTime(m.date)}. Cliquer pour voir les détails.`;
    return `
      <div class="${cardCls}" data-id="${esc(m.id)}" role="button" tabindex="0" aria-label="${esc(a11yLabel)}">
        <div class="head">
          <span class="time">${isLive ? '<span class="live-dot"></span>' : ''}${esc(statusText)}</span>
          ${(() => {
            // v30 — League logo + name. Fallback gracefully if image fails
            // (onerror hides it). Sport icon emoji always shown so the card
            // stays scannable even without the logo.
            const lurl = leagueLogoUrl(m);
            const lname = m.league_name || m.league_code || '';
            const ico = sportIcon(m.sport);
            return `<span class="venue" style="display:inline-flex;align-items:center;gap:5px;">
              ${lurl ? `<img src="${esc(lurl)}" alt="" loading="lazy" decoding="async" style="width:14px;height:14px;object-fit:contain;" onerror="window._leagueLogoMark404 && window._leagueLogoMark404(this.src);this.outerHTML='<span style=\\'font-size:11px;\\'>${ico}</span>';">` : `<span style="font-size:11px;">${ico}</span>`}
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px;">${esc(lname)}</span>
            </span>`;
          })()}
        </div>
        <div class="teams">
          <div class="team ${hWinner ? 'winner' : ''}">
            ${home?.logo ? `<img class="logo" src="${esc(home.logo)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '<span class="logo"></span>'}
            <div class="name-wrap">
              <div class="name">${escWithHighlight(home?.name || 'Domicile')}</div>
              <div class="meta">
                ${rankH ? `<span class="rank-badge">#${rankH}</span>` : ''}
                ${recH ? `<span class="record">${esc(recH)}</span>` : ''}
                ${(() => { const f = derivedForm(home); return f ? renderForm(f) : ''; })()}
              </div>
            </div>
            <span class="score">${showScore ? esc(home?.score ?? '') : ''}</span>
          </div>
          <div class="team ${aWinner ? 'winner' : ''}">
            ${away?.logo ? `<img class="logo" src="${esc(away.logo)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">` : '<span class="logo"></span>'}
            <div class="name-wrap">
              <div class="name">${escWithHighlight(away?.name || 'Extérieur')}</div>
              <div class="meta">
                ${rankA ? `<span class="rank-badge">#${rankA}</span>` : ''}
                ${recA ? `<span class="record">${esc(recA)}</span>` : ''}
                ${(() => { const f = derivedForm(away); return f ? renderForm(f) : ''; })()}
              </div>
            </div>
            <span class="score">${showScore ? esc(away?.score ?? '') : ''}</span>
          </div>
        </div>
        ${badges.length ? `<div class="badges">${badges.join('')}</div>` : ''}
        ${sportSpecificInfo(m, home, away)}
        ${contextLine}
        ${(() => {
          // v25 — Écart de force (Elo) en 1 ligne + cote marché vs modèle
          if (isFinal) return '';
          const eloH = home?.elo?.value;
          const eloA = away?.elo?.value;
          let eloLine = '';
          if (Number.isFinite(eloH) && Number.isFinite(eloA)) {
            const diff = Math.round(eloH - eloA);
            const absDiff = Math.abs(diff);
            if (absDiff >= 30) {
              const favName = diff > 0 ? (home?.short || home?.name || 'Dom.') : (away?.short || away?.name || 'Ext.');
              const lvl = absDiff >= 200 ? 'nettement plus fort' : absDiff >= 100 ? 'plus fort' : 'légèrement plus fort';
              eloLine = `<span style="display:inline-flex;align-items:center;gap:6px;"><span style="color:var(--text-dim);">Force :</span><b style="color:var(--text);">${esc(favName)}</b><span style="color:var(--text-dim);">${lvl}</span><span style="padding:1px 7px;border-radius:10px;background:var(--panel-3);font-size:10px;font-variant-numeric:tabular-nums;">+${absDiff} pts</span></span>`;
            } else if (absDiff >= 10) {
              eloLine = `<span style="color:var(--text-dim);">Force : <b style="color:var(--text);">équipes proches</b> (+${absDiff} pts)</span>`;
            } else {
              eloLine = `<span style="color:var(--text-dim);">Force : <b style="color:var(--text);">équipes équivalentes</b></span>`;
            }
          }
          // Marché vs modèle : cote implicite vs notre confiance
          let marketLine = '';
          if (pred && pred.pick && pred.odds) {
            const pickKey = pred.pick.key;
            const pickOdd = pickKey === '1' ? pred.odds.home : pickKey === '2' ? pred.odds.away : pred.odds.draw;
            const rel = pred.reliability ?? pred.pick.prob;
            if (pickOdd && pickOdd > 1.1 && rel != null) {
              const implied = 1 / pickOdd;
              const edgePts = Math.round((rel - implied) * 100);
              if (edgePts >= 5) {
                marketLine = `<span style="color:var(--accent);">Cote marché dit <b>${Math.round(implied*100)}%</b> · nous estimons <b>${Math.round(rel*100)}%</b> · <b>+${edgePts} pts d'avantage</b></span>`;
              } else if (edgePts >= -2) {
                marketLine = `<span style="color:var(--text-dim);">Cote alignée avec notre estimation (${Math.round(rel*100)}%)</span>`;
              } else {
                marketLine = `<span style="color:var(--warn);">Cote plus prudente que nous (${Math.round(implied*100)}% vs ${Math.round(rel*100)}%) — méfiance</span>`;
              }
            }
          }
          if (!eloLine && !marketLine) return '';
          return `<div style="display:flex;flex-direction:column;gap:4px;padding:8px 12px;background:var(--panel-2);border-radius:var(--r-sm);font-size:11.5px;line-height:1.5;margin-top:4px;">
            ${eloLine ? `<div>${eloLine}</div>` : ''}
            ${marketLine ? `<div>${marketLine}</div>` : ''}
          </div>`;
        })()}
        ${oddsHtml}
        ${predHtml}
        ${tipsHtml}
      </div>
    `;
  }

  // Winamax league deep-links
  const WINAMAX_LEAGUES = {
    'fra.1': 'https://www.winamax.fr/paris-sportifs/sports/1/7/4',            // Ligue 1
    'eng.1': 'https://www.winamax.fr/paris-sportifs/sports/1/7/1',            // Premier League
    'esp.1': 'https://www.winamax.fr/paris-sportifs/sports/1/7/34',           // La Liga
    'ita.1': 'https://www.winamax.fr/paris-sportifs/sports/1/7/29',           // Serie A
    'ger.1': 'https://www.winamax.fr/paris-sportifs/sports/1/7/22',           // Bundesliga
    'uefa.champions': 'https://www.winamax.fr/paris-sportifs/sports/1/7/6',   // UCL
    'uefa.europa': 'https://www.winamax.fr/paris-sportifs/sports/1/7/12',     // Europa L.
    'fra.2': 'https://www.winamax.fr/paris-sportifs/sports/1/7/5',            // Ligue 2
    'eng.2': 'https://www.winamax.fr/paris-sportifs/sports/1/7/2',            // Championship
  };
  function winamaxUrl(match) {
    // Trust numeric league IDs first (verified working)
    if (match.sport === 'football' && WINAMAX_LEAGUES[match.league_code]) {
      return WINAMAX_LEAGUES[match.league_code];
    }
    // Then fall back to the slug URL from patch_winamax.py
    if (match.winamax && match.winamax.url) return match.winamax.url;
    if (match.sport === 'tennis') return 'https://www.winamax.fr/paris-sportifs/sports/2';
    if (match.sport === 'basketball') return 'https://www.winamax.fr/paris-sportifs/sports/3';
    if (match.sport === 'hockey') return 'https://www.winamax.fr/paris-sportifs/sports/4';
    return 'https://www.winamax.fr/paris-sportifs/';
  }

  // Human-readable tipster source label
  function sourceLabel(src) {
    const map = {
      'ruedesjoueurs': 'RueDesJoueurs',
      'sportytrader': 'SportyTrader',
      'betnfoot': 'BetNFoot',
      'lecoindubookmaker': 'Coin du Bookmaker',
    };
    return map[src] || src;
  }

  // ======= DETAIL MODAL =======
  function openDetail(match) {
    const { home, away } = getSides(match);
    const pred = predictMatch(match);
    const hasDraw = match.sport === 'football';
    // Chantier Q — ouvrir un lock = le marquer comme vu
    if (pred && pred.isLock && match.id != null) markLockSeen(match.id);

    // v30 — Stocke aussi match.id sur le title pour permettre au bouton
    // partager de construire un share URL ciblé sur ce match.
    const _titleEl = document.getElementById('detail-title');
    _titleEl.textContent = match.name || `${home?.name} vs ${away?.name}`;
    _titleEl.dataset.matchId = String(match.id || '');
    document.getElementById('detail-league').textContent = `${match.league_name}${match.round ? ' · ' + match.round : ''} · ${fmtFullDate(currentDate)} · ${fmtTime(match.date)}${match.venue ? ' · ' + match.venue : ''}`;

    const recH = parseRecord(getRecord(home));
    const recA = parseRecord(getRecord(away));
    const stdH = getStandingsEntry(match, home);
    const stdA = getStandingsEntry(match, away);
    const isFinal = match.completed;

    const probs = pred?.probs || {};
    const barOf = (p) => `<div class="bar"><span style="width:${Math.max(0, Math.min(100, Math.round((p||0)*100)))}%;"></span></div>`;

    // Standings table for the league
    const allStd = window.PRONOSTICS_DATA?.standings?.[match.league_code] || [];
    const standingsHtml = (allStd.length && match.sport === 'football') ? (() => {
      const topTwo = new Set([home?.id, away?.id].map(String));
      const rows = allStd.slice().sort((a,b) => (parseInt(a.rank)||99) - (parseInt(b.rank)||99));
      return `
        <div class="standings-mini">
          <div class="row head">
            <div>#</div><div>Équipe</div><div>J</div><div>V-N-D</div><div>Buts</div><div>Pts</div>
          </div>
          ${rows.map(e => `
            <div class="row ${topTwo.has(String(e.team_id)) ? 'highlight' : ''}">
              <div class="rank">${esc(e.rank || '—')}</div>
              <div class="team-cell">${esc(e.team || '—')}</div>
              <div>${esc(e.games || '—')}</div>
              <div>${esc(e.wins || 0)}-${esc(e.draws || 0)}-${esc(e.losses || 0)}</div>
              <div>${esc((e.gf || '0') + ':' + (e.ga || '0'))}</div>
              <div><b>${esc(e.points || '—')}</b></div>
            </div>
          `).join('')}
        </div>
      `;
    })() : '';

    // All odds table
    const oddsTableHtml = (match.odds && match.odds.length) ? `
      <table class="odds-table">
        <thead>
          <tr>
            <th>Site de paris</th>
            <th>1 (${esc(home?.abbr || 'Dom')})</th>
            ${hasDraw ? '<th>N</th>' : ''}
            <th>2 (${esc(away?.abbr || 'Ext')})</th>
            ${hasDraw ? '<th>Spread</th><th>O/U</th>' : '<th>Spread</th><th>Total</th>'}
          </tr>
        </thead>
        <tbody>
          ${(() => {
            // Compute best per column
            let bestH = null, bestD = null, bestA = null;
            match.odds.forEach(o => {
              const h = mlToDecimal(o.homeML), d = hasDraw ? mlToDecimal(o.drawML) : null, a = mlToDecimal(o.awayML);
              if (h && (bestH == null || h > bestH)) bestH = h;
              if (d && (bestD == null || d > bestD)) bestD = d;
              if (a && (bestA == null || a > bestA)) bestA = a;
            });
            return match.odds.map(o => {
              const h = mlToDecimal(o.homeML), d = hasDraw ? mlToDecimal(o.drawML) : null, a = mlToDecimal(o.awayML);
              return `
                <tr>
                  <td>${esc(o.provider || '—')}</td>
                  <td class="${h === bestH && h != null ? 'best' : ''}">${h ? h.toFixed(2) : '—'}</td>
                  ${hasDraw ? `<td class="${d === bestD && d != null ? 'best' : ''}">${d ? d.toFixed(2) : '—'}</td>` : ''}
                  <td class="${a === bestA && a != null ? 'best' : ''}">${a ? a.toFixed(2) : '—'}</td>
                  <td>${o.spread != null ? o.spread : '—'}</td>
                  <td>${o.overUnder != null ? o.overUnder : '—'}</td>
                </tr>
              `;
            }).join('');
          })()}
        </tbody>
      </table>
    ` : '<div style="color:var(--text-dim2); font-size:13px;">Aucune cote disponible pour ce match.</div>';

    // Leaders (basketball)
    const leadersHtml = ((home?.leaders?.length || 0) + (away?.leaders?.length || 0) > 0) ? `
      <div class="two-cols">
        <div>
          <h4 style="margin-top:0; font-size:11px; color:var(--text-dim);">${esc(home?.name || 'Dom.')}</h4>
          ${(home?.leaders || []).map(L => `<div class="kv"><div class="k">${esc(L.cat)}</div><div class="v">${esc(L.player || '—')} · ${esc(L.stat || '—')}</div></div>`).join('') || '<div style="color:var(--text-dim2); font-size:12px;">—</div>'}
        </div>
        <div>
          <h4 style="margin-top:0; font-size:11px; color:var(--text-dim);">${esc(away?.name || 'Ext.')}</h4>
          ${(away?.leaders || []).map(L => `<div class="kv"><div class="k">${esc(L.cat)}</div><div class="v">${esc(L.player || '—')} · ${esc(L.stat || '—')}</div></div>`).join('') || '<div style="color:var(--text-dim2); font-size:12px;">—</div>'}
        </div>
      </div>
    ` : '';

    const body = document.getElementById('detail-body');
    body.innerHTML = `
      <div class="teams-big">
        <div class="side">
          ${home?.logo ? `<img src="${esc(home.logo)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ''}
          <div class="name">${esc(home?.name || '—')}</div>
          <div class="rec">${esc(getRecord(home) || '')}${stdH ? ` · #${esc(stdH.rank)} au classement · ${esc(stdH.points || 0)} pts` : ''}</div>
          ${(() => { const f = derivedForm(home); return f ? renderForm(f, true) : ''; })()}
        </div>
        <div class="vs">
          ${isFinal ? `<div class="score">${esc(home?.score ?? '')} - ${esc(away?.score ?? '')}</div>` : '<div>VS</div>'}
        </div>
        <div class="side">
          ${away?.logo ? `<img src="${esc(away.logo)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ''}
          <div class="name">${esc(away?.name || '—')}</div>
          <div class="rec">${esc(getRecord(away) || '')}${stdA ? ` · #${esc(stdA.rank)} au classement · ${esc(stdA.points || 0)} pts` : ''}</div>
          ${(() => { const f = derivedForm(away); return f ? renderForm(f, true) : ''; })()}
        </div>
      </div>

      ${(() => {
        // v31.7 — Section "Contexte du match" : toujours visible, donne le
        // décor avant les chiffres (enjeu, forme courte, conditions).
        // Réponse au retour user : "ajoute un texte qui explique le contexte
        // de la rencontre, enjeux et autre".
        const sportEm = { football:'⚽', tennis:'🎾', basketball:'🏀', hockey:'🏒', baseball:'⚾', 'american-football':'🏈', mma:'🥊', golf:'⛳', racing:'🏎️', rugby:'🏉' }[match.sport] || '🎯';
        const dateLong = (() => {
          try {
            return new Date(match.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
          } catch(e) { return ''; }
        })();
        const timeStr = fmtTime(match.date);
        const venue = match.venue ? `${esc(match.venue)}${match.city ? ` · ${esc(match.city)}` : ''}` : '';
        // Forme courte : 3 derniers W/L/D par équipe via derivedForm
        const formH = derivedForm(home);
        const formA = derivedForm(away);
        const fmtForm3 = (f) => {
          if (!f || !Array.isArray(f.results) || !f.results.length) return null;
          const last3 = f.results.slice(-3);
          return last3.map(r => {
            const ch = r === 'W' ? '✓' : r === 'L' ? '✗' : '·';
            const col = r === 'W' ? '#34d399' : r === 'L' ? '#fca5a5' : 'var(--text-dim2)';
            return `<span style="display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;border-radius:50%;background:${col}22;color:${col};font-weight:700;font-size:11px;margin-right:2px;">${ch}</span>`;
          }).join('');
        };
        const formHtml = (formH && fmtForm3(formH)) || '';
        const formAHtml = (formA && fmtForm3(formA)) || '';
        // Météo (foot avec data)
        const weather = match.weather && (match.weather.temp_c != null || match.weather.condition) ? match.weather : null;
        // Référé (foot)
        const ref = match.referee && match.referee.name ? match.referee : null;
        // Importance contexte : on déduit de la presence de h2h, importance, etc.
        const meetingsCount = (match.h2h?.meetings || []).length;
        const enjeuLines = [];
        enjeuLines.push(`${sportEm} <b>${esc(match.league_name || match.league_code || 'Compétition')}</b>`);
        if (dateLong) enjeuLines.push(`📅 ${dateLong} · ${timeStr}`);
        if (venue) enjeuLines.push(`📍 ${venue}`);
        // Synthèse texte enjeu (si suffisamment de données)
        let enjeuText = '';
        // v31.7.8 — Derby auto-detect : table de derbys connus (foot top-5).
        // Match si les deux équipes sont dans la table sous la même clé.
        // Priorité sur les autres patterns d'enjeu (un derby est plus saillant).
        const DERBYS = {
          // Espagne
          'el-clasico': ['real madrid', 'barcelona', 'fc barcelona', 'real madrid cf'],
          'derbi-madrileno': ['real madrid', 'atletico madrid', 'atlético', 'atletico de madrid', 'real madrid cf'],
          'derbi-sevillano': ['sevilla', 'sevilla fc', 'real betis', 'betis'],
          'derbi-vasco': ['athletic bilbao', 'real sociedad', 'athletic club'],
          'derbi-catalan': ['barcelona', 'fc barcelona', 'espanyol', 'rcd espanyol'],
          'derbi-valenciano': ['valencia', 'valencia cf', 'levante', 'villarreal'],
          // Italie
          'derby-milan': ['milan', 'ac milan', 'inter', 'internazionale', 'fc internazionale'],
          'derby-rome': ['as roma', 'roma', 'lazio', 'ss lazio'],
          'derby-italie': ['juventus', 'inter', 'ac milan', 'milan'],
          'derby-turin': ['juventus', 'torino'],
          'derby-genova': ['genoa', 'sampdoria', 'uc sampdoria'],
          'derby-naples': ['napoli', 'roma', 'salernitana'],
          // Angleterre
          'north-london': ['arsenal', 'tottenham', 'tottenham hotspur'],
          'merseyside': ['liverpool', 'everton'],
          'manchester': ['manchester united', 'manchester city', 'man united', 'man city'],
          'old-firm': ['celtic', 'rangers'],
          'birmingham': ['aston villa', 'birmingham city', 'wolves'],
          'tyne-wear': ['newcastle united', 'sunderland', 'newcastle'],
          'london': ['arsenal', 'chelsea', 'tottenham hotspur', 'tottenham', 'west ham', 'fulham', 'crystal palace'],
          // Allemagne
          'der-klassiker': ['bayern munich', 'borussia dortmund', 'bayern münchen', 'fc bayern münchen', 'fc bayern'],
          'revierderby': ['borussia dortmund', 'schalke', 'fc schalke 04'],
          'nordderby': ['hamburger sv', 'hsv', 'werder bremen', 'sv werder bremen'],
          'frankfurter': ['eintracht frankfurt', 'mainz 05', 'sv darmstadt'],
          // France
          'classique': ['paris saint-germain', 'psg', 'olympique de marseille', 'marseille', 'om'],
          'rhone-alpes': ['olympique lyonnais', 'lyon', 'saint-etienne', 'saint-étienne', 'as saint-etienne', 'asse'],
          'derby-nord': ['lille', 'losc', 'lens', 'rc lens'],
          'derby-bretagne': ['stade rennais', 'rennes', 'fc nantes', 'nantes'],
          'cote-azur': ['ogc nice', 'nice', 'as monaco', 'monaco'],
          // Portugal
          'derby-lisbonne': ['benfica', 'sl benfica', 'sporting cp', 'sporting'],
          'derby-eternel-portugal': ['porto', 'fc porto', 'benfica', 'sl benfica'],
          // Pays-Bas
          'de-klassieker': ['ajax', 'feyenoord', 'afc ajax'],
          'eindhoven-derby': ['psv', 'psv eindhoven', 'fc eindhoven'],
          // Belgique
          'derby-bruxelles': ['rsc anderlecht', 'anderlecht', 'union saint-gilloise', 'union sg'],
          // Turquie
          'kıtalar-arası': ['galatasaray', 'fenerbahçe', 'fenerbahce', 'beşiktaş', 'besiktas'],
          // Grece
          'derby-athenes': ['olympiakos', 'panathinaikos', 'aek athens', 'aek'],
          // Argentine (foot d'Amerique du Sud detecte si data dispo)
          'superclasico': ['boca juniors', 'river plate', 'club atletico river plate', 'club atletico boca juniors'],
          // Bresil
          'choque-rei': ['palmeiras', 'corinthians', 'sao paulo', 'são paulo'],
          'fla-flu': ['flamengo', 'fluminense'],
          // USA / MLS
          'mls-cascadia': ['seattle sounders', 'portland timbers', 'vancouver whitecaps'],
          // Canaux divers — championnat européen
          'derby-classique': ['celtic', 'rangers'],
        };
        const _norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
        const hN = _norm(home?.name);
        const aN = _norm(away?.name);
        const derbyMatch = (() => {
          for (const [key, names] of Object.entries(DERBYS)) {
            const hMatch = names.some(n => hN.includes(n) || n.includes(hN));
            const aMatch = names.some(n => aN.includes(n) || n.includes(aN));
            if (hMatch && aMatch) {
              const labels = {
                'el-clasico': '🔥 EL CLÁSICO — le match le plus regardé du monde',
                'derbi-madrileno': '🔥 Derbi madrileño — Real vs Atlético, rivalité historique',
                'derbi-sevillano': '🔥 Derbi sevillano — Sevilla vs Betis',
                'derbi-vasco': '🔥 Derbi vasco — Athletic vs Real Sociedad',
                'derbi-catalan': '🔥 Derbi catalan — Barça vs Espanyol',
                'derbi-valenciano': '🔥 Derbi valenciano',
                'derby-milan': '🔥 Derby della Madonnina — Milan vs Inter',
                'derby-rome': '🔥 Derby della Capitale — Roma vs Lazio',
                'derby-italie': '🔥 Derby d\'Italia — choc entre clubs historiques',
                'derby-turin': '🔥 Derby della Mole — Juventus vs Torino',
                'derby-genova': '🔥 Derby della Lanterna — Genoa vs Sampdoria',
                'derby-naples': '🔥 Choc du Sud italien',
                'north-london': '🔥 North London Derby — Arsenal vs Tottenham',
                'merseyside': '🔥 Merseyside Derby — Liverpool vs Everton',
                'manchester': '🔥 Manchester Derby — United vs City',
                'old-firm': '🔥 Old Firm — Celtic vs Rangers',
                'birmingham': '🔥 Second City Derby — Birmingham',
                'tyne-wear': '🔥 Tyne–Wear Derby — Newcastle vs Sunderland',
                'london': '🔥 Derby londonien',
                'der-klassiker': '🔥 Der Klassiker — Bayern vs Dortmund',
                'revierderby': '🔥 Revierderby — Dortmund vs Schalke',
                'nordderby': '🔥 Nordderby — HSV vs Werder Brême',
                'frankfurter': '🔥 Derby de Hesse',
                'classique': '🔥 Le Classique — PSG vs Marseille',
                'rhone-alpes': '🔥 Derby rhônalpin — Lyon vs Saint-Étienne',
                'derby-nord': '🔥 Derby du Nord — Lille vs Lens',
                'derby-bretagne': '🔥 Derby breton — Rennes vs Nantes',
                'cote-azur': '🔥 Derby de la Côte d\'Azur — Nice vs Monaco',
                'derby-lisbonne': '🔥 Derby de Lisbonne — Benfica vs Sporting',
                'derby-eternel-portugal': '🔥 O Clássico — Benfica vs Porto',
                'de-klassieker': '🔥 De Klassieker — Ajax vs Feyenoord',
                'eindhoven-derby': '🔥 Derby d\'Eindhoven',
                'derby-bruxelles': '🔥 Derby de Bruxelles',
                'kıtalar-arası': '🔥 Derby intercontinental — Galatasaray / Fenerbahçe / Beşiktaş',
                'derby-athenes': '🔥 Derby d\'Athènes',
                'superclasico': '🔥 SUPERCLÁSICO — Boca Juniors vs River Plate',
                'choque-rei': '🔥 Choque-Rei — derby de São Paulo',
                'fla-flu': '🔥 Fla-Flu — Flamengo vs Fluminense',
                'mls-cascadia': '🔥 Cascadia Cup — Pacific NW MLS',
                'derby-classique': '🔥 Derby classique',
              };
              return labels[key] || '🔥 Derby — rivalité historique';
            }
          }
          return null;
        })();
        if (derbyMatch) {
          enjeuText = derbyMatch + '. Forme et statistiques pèsent moins, l\'engagement est tout.';
        } else if (stdH && stdA) {
          const rH = parseInt(stdH.rank, 10), rA = parseInt(stdA.rank, 10);
          if (isFinite(rH) && isFinite(rA)) {
            const top4 = (r) => r <= 4, bot4 = (r) => r >= 14;
            if (top4(rH) && top4(rA)) enjeuText = '🔥 Choc de haut de tableau — les deux équipes visent le podium.';
            else if (bot4(rH) && bot4(rA)) enjeuText = '🛟 Match de bas de tableau — enjeu maintien fort des deux côtés.';
            else if (top4(rH) && bot4(rA)) enjeuText = `📈 ${esc(home?.short || home?.name || 'Domicile')} cherche à confirmer en haut de tableau face à un adversaire en difficulté.`;
            else if (bot4(rH) && top4(rA)) enjeuText = `📈 ${esc(away?.short || away?.name || 'Extérieur')} en confiance face à une équipe en zone rouge — match piège.`;
            else if (Math.abs(rH - rA) <= 3) enjeuText = '⚖️ Équipes au coude-à-coude au classement — match équilibré sur le papier.';
          }
        }

        return `
        <div class="section" style="margin-top:18px;">
          <h4 style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
            <span style="font-size:20px;">📍</span>
            <span>Contexte du match</span>
          </h4>
          ${enjeuText ? `<div style="padding:12px 14px;margin-bottom:14px;background:rgba(167,139,250,.06);border:1px solid rgba(167,139,250,.18);border-left:3px solid var(--brand);border-radius:0 8px 8px 0;font-size:13.5px;color:var(--text);line-height:1.55;">${enjeuText}</div>` : ''}
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;">
            <div style="padding:14px 16px;background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:8px;">
              <div style="font-size:10.5px;color:var(--text-dim2);text-transform:uppercase;letter-spacing:.6px;font-weight:700;margin-bottom:8px;">🏆 Cadre</div>
              <div style="font-size:13px;line-height:1.7;color:var(--text-2);">${enjeuLines.join('<br>')}</div>
            </div>
            <div style="padding:14px 16px;background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:8px;">
              <div style="font-size:10.5px;color:var(--text-dim2);text-transform:uppercase;letter-spacing:.6px;font-weight:700;margin-bottom:8px;">📊 Forme (3 derniers)</div>
              <div style="font-size:13px;color:var(--text-2);line-height:1.6;">
                ${formHtml ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-weight:600;color:var(--text);min-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(home?.short || home?.name || '?')}</span><span>${formHtml}</span></div>` : ''}
                ${formAHtml ? `<div style="display:flex;align-items:center;gap:8px;"><span style="font-weight:600;color:var(--text);min-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(away?.short || away?.name || '?')}</span><span>${formAHtml}</span></div>` : ''}
                ${(!formHtml && !formAHtml) ? '<span style="color:var(--text-dim2);">Forme indisponible pour ce match.</span>' : ''}
              </div>
            </div>
            <div style="padding:14px 16px;background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:8px;">
              <div style="font-size:10.5px;color:var(--text-dim2);text-transform:uppercase;letter-spacing:.6px;font-weight:700;margin-bottom:8px;">🌤️ Conditions</div>
              <div style="font-size:13px;color:var(--text-2);line-height:1.6;">
                ${weather ? `🌡️ ${weather.temp_c != null ? Math.round(weather.temp_c) + '°C' : '—'}${weather.condition ? ' · ' + esc(weather.condition) : ''}${weather.wind_kmh != null ? ' · 💨 ' + Math.round(weather.wind_kmh) + ' km/h' : ''}<br>` : ''}
                ${ref ? `👤 Arbitre : <b>${esc(ref.name)}</b>${ref.cards_per_match != null ? ` · ${(+ref.cards_per_match).toFixed(1)} cartons/match` : ''}<br>` : ''}
                ${meetingsCount ? `⚔️ ${meetingsCount} confrontation${meetingsCount>1?'s':''} récente${meetingsCount>1?'s':''} (voir plus bas)<br>` : ''}
                ${(!weather && !ref && !meetingsCount) ? '<span style="color:var(--text-dim2);">Pas de conditions externes notables détectées.</span>' : ''}
              </div>
            </div>
          </div>
        </div>`;
      })()}

      ${pred ? (() => {
        const modelRes = evaluateModelPick(match, pred);
        const liveSt = evaluateLivePick(match, pred);
        const pickOdd = pred.odds ? (pred.pick.key === '1' ? pred.odds.home : pred.pick.key === '2' ? pred.odds.away : pred.odds.draw) : null;
        const reasons = pred.explain?.reasons || [];
        const liveBadgeDetail = liveSt ? (() => {
          if (liveSt === 'winning') return ` <span style="background:rgba(16,185,129,.18);border:1px solid rgba(16,185,129,.4);color:#10b981;padding:3px 9px;border-radius:11px;font-size:12px;font-weight:700;letter-spacing:.3px;">🔴 LIVE · Gagnant</span>`;
          if (liveSt === 'tied')    return ` <span style="background:rgba(251,191,36,.18);border:1px solid rgba(251,191,36,.4);color:#fbbf24;padding:3px 9px;border-radius:11px;font-size:12px;font-weight:700;letter-spacing:.3px;">🔴 LIVE · En cours</span>`;
          return ` <span style="background:rgba(252,165,165,.18);border:1px solid rgba(252,165,165,.4);color:#fca5a5;padding:3px 9px;border-radius:11px;font-size:12px;font-weight:700;letter-spacing:.3px;">🔴 LIVE · Perdant</span>`;
        })() : '';
        return `
        <div class="section">
          <div class="pred-panel">
            <h4>🎯 Notre pronostic ${modelRes ? resultBadgeHtml(modelRes, modelRes === 'won' && pred.odds ? pickOdd : null) : liveBadgeDetail}</h4>
            <div class="big-tip" style="${modelRes === 'lost' ? 'text-decoration:line-through; opacity:.7;' : ''}">${esc(pred.pick.label)}</div>
            <div class="big-conf">
              Fiabilité <b>${((pred.reliability ?? pred.pick.prob)*100).toFixed(0)}%</b> ${confLabel(pred.reliability ?? pred.pick.prob).lbl}
              ${pred.isLock ? ` · <span class="badge lock">🔒 PARI SÛR</span>` : ''}
              ${(() => {
                // Chantier V — Badge qualité des données. Couleur selon le score.
                const dq = computeDataQuality(match);
                const color = dq.score >= 4 ? '#10b981'
                            : dq.score === 3 ? '#a78bfa'
                            : dq.score === 2 ? '#fbbf24'
                                              : '#fca5a5';
                const bg    = dq.score >= 4 ? 'rgba(16,185,129,.12)'
                            : dq.score === 3 ? 'rgba(167,139,250,.12)'
                            : dq.score === 2 ? 'rgba(251,191,36,.12)'
                                              : 'rgba(252,165,165,.12)';
                const border= dq.score >= 4 ? 'rgba(16,185,129,.3)'
                            : dq.score === 3 ? 'rgba(167,139,250,.3)'
                            : dq.score === 2 ? 'rgba(251,191,36,.3)'
                                              : 'rgba(252,165,165,.3)';
                const tooltip = dq.items.map(i => `${i.ok ? '✓' : '✗'} ${i.label}`).join(' · ');
                return ` · <span title="${esc(tooltip)}" style="padding:2px 8px;border-radius:10px;background:${bg};border:1px solid ${border};color:${color};font-size:11px;font-weight:700;letter-spacing:.3px;font-variant-numeric:tabular-nums;">📊 ${dq.score}/${dq.max} données</span>`;
              })()}
            </div>
            ${pickOdd ? (() => {
              // v30 — Mise conseillée Kelly + bouton "J'ai parié" + bouton
              // Winamax retirés (user n'enregistre pas ses paris ici). On
              // garde uniquement la cote affichée + l'edge si value, parce
              // que c'est de l'info modèle (pas une CTA d'engagement).
              const rel = pred.reliability ?? pred.pick.prob;
              const edge = valueBetEdge(rel, pickOdd);
              const edgePct = edge != null ? Math.round(edge * 100) : null;
              const isValue = edge != null && edge >= 0.05;
              return `<div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;font-size:13px;">
                <span style="padding:4px 10px;border-radius:6px;background:rgba(16,185,129,.12);color:#10b981;font-weight:700;">Cote @ ${pickOdd.toFixed(2)}</span>
                ${isValue ? `<span title="Le modèle estime ${(rel*100).toFixed(0)}% de chances alors que la cote n'en prévoit que ${((1/pickOdd)*100).toFixed(0)}%." style="padding:4px 10px;border-radius:6px;background:rgba(236,72,153,.14);color:#f472b6;font-weight:700;">💎 +${edgePct}pt d'avantage</span>` : (edge != null && edge > 0 && edge < 0.05 ? `<span title="Léger avantage (<5pt) — pas très intéressant." style="padding:4px 10px;border-radius:6px;background:rgba(255,255,255,.05);color:var(--text-dim2,#7b8693);font-weight:600;">+${edgePct}pt</span>` : '')}
              </div>`;
            })() : ''}
            ${(() => {
              // v31.7 — "Pourquoi ce prono est fiable" : synthèse rédigée en
              // français, toujours présente (ne dépend pas d'une explain.headline
              // pré-générée). Utilise les signaux disponibles pour expliquer.
              const rel = pred.reliability ?? pred.pick.prob;
              const rm = pred.reliabilityMeta || {};
              const rsCount = (pred.explain?.reasons || []).length;
              const dq = computeDataQuality(match);
              // Confiance label
              let confLbl;
              if (rel >= 0.78) confLbl = 'très haute confiance';
              else if (rel >= 0.70) confLbl = 'haute confiance';
              else if (rel >= 0.60) confLbl = 'confiance modérée';
              else if (rel >= 0.50) confLbl = 'confiance limite';
              else confLbl = 'faible confiance';
              // Edge label
              const edgeNum = pickOdd ? valueBetEdge(rel, pickOdd) : null;
              let edgeLbl = '';
              if (edgeNum != null) {
                if (edgeNum >= 0.10) edgeLbl = ` Le marché sous-estime nettement cette issue : avantage de <b>+${Math.round(edgeNum*100)}pt</b> entre notre estimation et la cote — c'est une vraie value bet.`;
                else if (edgeNum >= 0.05) edgeLbl = ` Avantage marché modeste mais réel : <b>+${Math.round(edgeNum*100)}pt</b> entre notre prob et la cote.`;
                else if (edgeNum >= 0) edgeLbl = ' Le marché et notre modèle sont alignés — pas de gros edge identifié, le pick suit la cote.';
                else edgeLbl = ` Le marché est plus optimiste que nous (${Math.round(-edgeNum*100)}pt en moins) — restons prudents sur la mise.`;
              }
              // Sources synthèse
              let srcLbl = '';
              if (rm.componentCount) {
                srcLbl = ` Cette estimation combine <b>${rm.componentCount}</b> source${rm.componentCount>1?'s':''} de signal`;
                if (rm.agreement != null) {
                  const ag = Math.round(rm.agreement * 100);
                  if (ag >= 80) srcLbl += `, qui convergent fortement (consensus ${ag}%)`;
                  else if (ag >= 50) srcLbl += `, avec un consensus partiel (${ag}%)`;
                  else srcLbl += `, mais avec des signaux divergents (consensus ${ag}%) — méfiance`;
                }
                srcLbl += '.';
              }
              // Data quality
              let dqLbl = '';
              if (dq.score >= 4) dqLbl = ` Les données disponibles sont <b>complètes</b> (${dq.score}/${dq.max}).`;
              else if (dq.score === 3) dqLbl = ` Les données sont <b>raisonnables</b> (${dq.score}/${dq.max}).`;
              else if (dq.score === 2) dqLbl = ` Les données sont <b>partielles</b> (${dq.score}/${dq.max}) — à pondérer.`;
              else dqLbl = ` Données <b>incomplètes</b> (${dq.score}/${dq.max}) — confiance modérée.`;
              return `<div style="margin-top:14px;padding:14px 16px;background:rgba(167,139,250,.06);border:1px solid rgba(167,139,250,.18);border-left:3px solid var(--brand);border-radius:0 8px 8px 0;font-size:13.5px;line-height:1.6;color:var(--text);">
                <div style="font-size:11px;color:var(--brand);text-transform:uppercase;letter-spacing:.6px;font-weight:700;margin-bottom:8px;">💡 Pourquoi ce prono est fiable</div>
                <div>Le modèle classe ce pick en <b>${confLbl}</b> (${(rel*100).toFixed(0)}%).${srcLbl}${edgeLbl}${dqLbl}${rsCount > 0 ? ` Voir les <b>${rsCount} signal${rsCount>1?'s':''}</b> détaillé${rsCount>1?'s':''} ci-dessous.` : ''}</div>
              </div>`;
            })()}
            ${pred.explain?.headline ? `<div style="margin-top:10px;padding:12px 14px;background:rgba(255,255,255,.03);border-radius:8px;border-left:3px solid var(--accent,#10b981);font-size:13.5px;line-height:1.5;color:var(--text,#e6ebf2);">${esc(pred.explain.headline)}</div>` : ''}
            ${reasons.length ? `
            <div style="margin-top:12px;">
              <div style="font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--text-dim2,#7b8693);margin-bottom:8px;">Pourquoi ce pronostic</div>
              <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px;">
                ${reasons.map(r => `<li style="display:flex;gap:10px;padding:8px 10px;background:rgba(255,255,255,.02);border-radius:6px;font-size:13px;line-height:1.4;"><span style="font-size:15px;">${r.icon}</span><span style="color:var(--text,#e6ebf2);">${esc(r.text)}</span></li>`).join('')}
              </ul>
            </div>` : ''}
            ${pred.reliabilityMeta ? (() => {
              const rm = pred.reliabilityMeta;
              const consensusPct = rm.agreement != null ? Math.round(rm.agreement*100) : null;
              const consensusLbl = consensusPct == null ? '—' :
                                    consensusPct >= 80 ? `🟢 ${consensusPct}% (fort)` :
                                    consensusPct >= 50 ? `🟡 ${consensusPct}% (partiel)` :
                                                         `🔴 ${consensusPct}% (divergence)`;
              const rawPct = (rm.pickProb*100).toFixed(0);
              const relPct = ((pred.reliability ?? pred.pick.prob)*100).toFixed(0);
              const delta = Math.round((pred.reliability - rm.pickProb) * 100);
              const deltaTxt = delta === 0 ? '' : delta > 0 ? ` +${delta}pt` : ` ${delta}pt`;
              return `<div style="margin-top:12px;padding:10px 12px;background:rgba(255,255,255,.02);border-radius:8px;border:1px solid rgba(255,255,255,.04);font-size:12px;color:var(--text-dim,#b4bcc7);line-height:1.5;">
                <div style="font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--text-dim2,#7b8693);margin-bottom:6px;">🎚️ Décomposition fiabilité</div>
                <div style="display:flex;gap:16px;flex-wrap:wrap;font-variant-numeric:tabular-nums;">
                  <span><b style="color:var(--text,#e6ebf2);">${rm.componentCount}</b> sources</span>
                  <span>consensus ${consensusLbl}</span>
                  <span>proba brute <b style="color:var(--text,#e6ebf2);">${rawPct}%</b> → fiabilité <b style="color:var(--text,#e6ebf2);">${relPct}%</b><span style="color:${delta>0?'#10b981':delta<0?'#fca5a5':'var(--text-dim2)'};">${deltaTxt}</span></span>
                </div>
              </div>`;
            })() : ''}
            ${(() => {
              // Chantier VV — Décomposition des facteurs en poids estimés
              const contrib = pred.contributions || [];
              const factors = {};

              // Approximate weights based on typical blend: marché 30%, forme 25%, H2H 15%, blessures 10%, calibration -3%
              // Only show factors that actually contributed (fired signals)
              contrib.forEach(c => {
                const name = c.name || '?';
                let weight = 0;
                if (name.includes('Marché') || name.includes('marché')) weight = 30;
                else if (name.includes('Forme') || name.includes('forme')) weight = 25;
                else if (name.includes('H2H') || name.includes('historique')) weight = 15;
                else if (name.includes('Blessure') || name.includes('blessure') || name.includes('Injury')) weight = 10;
                else weight = 5; // fallback for unknown signals
                if (weight > 0) factors[name] = weight;
              });

              if (Object.keys(factors).length > 0) {
                const totalWeight = Object.values(factors).reduce((a,b)=>a+b, 0);
                const normalized = Object.fromEntries(Object.entries(factors).map(([k,v]) => [k, v / totalWeight * 100]));
                return `<div style="margin-top:12px;padding:10px 12px;background:rgba(255,255,255,.02);border-radius:8px;border:1px solid rgba(255,255,255,.04);">
                  <div style="font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--text-dim2,#7b8693);margin-bottom:8px;">📊 Composé de</div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12px;">
                    ${Object.entries(normalized).filter(([_,w]) => w > 0).map(([name, pct]) => {
                      let shortName = name.replace(/Forme|/g, '').replace(/Marché|/g, '').replace(/H2H|/g, '').trim();
                      if (name.includes('Marché')) shortName = 'marché';
                      if (name.includes('Forme')) shortName = 'forme';
                      if (name.includes('H2H')) shortName = 'H2H';
                      if (name.includes('Blessure') || name.includes('blessure')) shortName = 'blessures';
                      return `<span style="color:var(--text-dim,#b4bcc7);"><span style="color:var(--text);">${shortName}</span> <b>${pct.toFixed(0)}%</b></span>`;
                    }).join(' · ')}
                    <span style="color:var(--text-dim2);">calibration −3%</span>
                  </div>
                </div>`;
              }
              return '';
            })()}
            ${(() => {
              // Chantier X — Timeline fiabilité 12h (sparkline SVG).
              // Chaque refresh ajoute un point dans localStorage ; on trace
              // l'évolution sur la fenêtre glissante 12h. Permet de voir si
              // la fiabilité grimpe ou chute (compos/blessures tombent).
              const hist = getReliabilityHist(match.id);
              if (hist.length < 2) return '';
              const w = 280, h = 44, pad = 4;
              const minT = hist[0].t, maxT = hist[hist.length - 1].t;
              const dt = Math.max(1, maxT - minT);
              const vals = hist.map(p => p.r);
              const minV = Math.min(0.3, ...vals);
              const maxV = Math.max(0.9, ...vals);
              const dv = Math.max(0.05, maxV - minV);
              const xFor = t => pad + (w - 2*pad) * (t - minT) / dt;
              const yFor = v => h - pad - (h - 2*pad) * (v - minV) / dv;
              const path = hist.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(p.t).toFixed(1)},${yFor(p.r).toFixed(1)}`).join(' ');
              const firstR = hist[0].r;
              const lastR  = hist[hist.length - 1].r;
              const diffPct = Math.round((lastR - firstR) * 100);
              const diffTxt = diffPct === 0 ? 'stable'
                            : diffPct > 0 ? `+${diffPct}pt sur 12h`
                                           : `${diffPct}pt sur 12h`;
              const diffColor = diffPct > 2 ? '#10b981' : diffPct < -2 ? '#fca5a5' : 'var(--text-dim2,#7b8693)';
              const spanH = Math.round((maxT - minT) / 3600000);
              return `<div style="margin-top:12px;padding:10px 12px;background:rgba(255,255,255,.02);border-radius:8px;border:1px solid rgba(255,255,255,.04);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <span style="font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--text-dim2,#7b8693);">📈 Évolution fiabilité (${spanH}h)</span>
                  <span style="font-size:12px;color:${diffColor};font-weight:700;font-variant-numeric:tabular-nums;">${diffTxt}</span>
                </div>
                <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:${h}px;display:block;">
                  <path d="${path}" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
                  ${hist.map(p => `<circle cx="${xFor(p.t).toFixed(1)}" cy="${yFor(p.r).toFixed(1)}" r="2" fill="#a78bfa"/>`).join('')}
                </svg>
                <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-dim2,#7b8693);margin-top:2px;font-variant-numeric:tabular-nums;">
                  <span>${Math.round(firstR*100)}% il y a ${spanH}h</span>
                  <span>${Math.round(lastR*100)}% maintenant</span>
                </div>
              </div>`;
            })()}
            ${(() => {
              // Chantier U — Pourquoi ce pick ? Top 3 signaux avec delta chiffré.
              // Affiche comment chaque signal non-marché a poussé (+) ou retenu (−)
              // la prédiction vs la baseline neutre (50% pour 2 issues, 33% pour 3).
              const contribs = pred.contributions || [];
              if (contribs.length === 0) return '';
              const top = contribs.slice(0, 3);
              return `<div style="margin-top:12px;padding:10px 12px;background:rgba(255,255,255,.02);border-radius:8px;border:1px solid rgba(255,255,255,.04);">
                <div style="font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--text-dim2,#7b8693);margin-bottom:8px;">🎯 Pourquoi ce pick ?</div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  ${top.map(c => {
                    const deltaPct = Math.round(c.delta * 100);
                    const sign = deltaPct > 0 ? '+' : '';
                    const color = deltaPct >= 0 ? '#10b981' : '#fca5a5';
                    const bg = deltaPct >= 0 ? 'rgba(16,185,129,.10)' : 'rgba(252,165,165,.10)';
                    const border = deltaPct >= 0 ? 'rgba(16,185,129,.25)' : 'rgba(252,165,165,.25)';
                    return `<span style="padding:6px 10px;border-radius:6px;background:${bg};border:1px solid ${border};font-size:12px;font-variant-numeric:tabular-nums;display:inline-flex;align-items:center;gap:6px;">
                      <span style="font-size:14px;">${c.icon}</span>
                      <span style="color:var(--text,#e6ebf2);font-weight:600;">${esc(c.name)}</span>
                      <span style="color:${color};font-weight:700;">${sign}${deltaPct}pt</span>
                    </span>`;
                  }).join('')}
                </div>
              </div>`;
            })()}
            ${(() => {
              // Chantier K — rendu sport-aware du bloc "scores probables".
              // Historique foot : pred.scores = array d'objets {home,away,prob}.
              // Nouveaux shapes : objet {kind, items, caption, total?, margin?, bestOf?}.
              const sc = pred.scores;
              if (!sc) return '';
              const isLegacyArr = Array.isArray(sc);
              const items = isLegacyArr ? sc : (sc.items || []);
              if (!items.length) return '';
              const kind = isLegacyArr ? 'exact' : sc.kind;
              const heading = kind === 'tennis'
                ? `🎾 Scores en sets probables (BO${sc.bestOf || 3})`
                : kind === 'basket'
                  ? '🏀 Projection du score final'
                  : '🎯 Scores les plus probables';
              const caption = isLegacyArr
                ? 'Calculé à partir des buts attendus (modèle statistique).'
                : (sc.caption || '');
              let chipsHtml;
              if (kind === 'basket') {
                const it = items[0];
                const total = sc.total != null ? sc.total : (it.home + it.away);
                const margin = sc.margin != null ? sc.margin : (it.home - it.away);
                const favLbl = margin === 0 ? 'Match serré'
                  : margin > 0 ? `${esc(home?.short || home?.name || 'Dom.')} +${Math.abs(margin)}`
                               : `${esc(away?.short || away?.name || 'Ext.')} +${Math.abs(margin)}`;
                chipsHtml = `
                  <span style="padding:8px 14px;border-radius:8px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);font-variant-numeric:tabular-nums;font-weight:700;color:#10b981;display:inline-flex;align-items:center;gap:8px;">
                    <span style="font-size:15px;">${it.home}-${it.away}</span>
                    <span style="color:var(--text-dim2,#7b8693);font-weight:500;font-size:12px;">projeté</span>
                  </span>
                  <span style="padding:8px 14px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);font-variant-numeric:tabular-nums;font-weight:600;color:var(--text,#e6ebf2);">
                    Total ${total}
                  </span>
                  <span style="padding:8px 14px;border-radius:8px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);font-weight:600;color:var(--text,#e6ebf2);">
                    ${favLbl}
                  </span>`;
              } else {
                chipsHtml = items.map((s, i) => `
                  <span style="padding:8px 14px;border-radius:8px;background:${i===0?'rgba(16,185,129,.12)':'rgba(255,255,255,.04)'};border:1px solid ${i===0?'rgba(16,185,129,.3)':'rgba(255,255,255,.06)'};font-variant-numeric:tabular-nums;font-weight:${i===0?700:600};color:${i===0?'#10b981':'var(--text,#e6ebf2)'};display:inline-flex;align-items:center;gap:8px;">
                    <span style="font-size:15px;">${s.label || (s.home+'-'+s.away)}</span>
                    <span style="color:var(--text-dim2,#7b8693);font-weight:500;font-size:12px;">${(s.prob*100).toFixed(1)}%</span>
                  </span>`).join('');
              }
              return `
              <div style="margin-top:14px;">
                <div style="font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--text-dim2,#7b8693);margin-bottom:8px;">${heading}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">${chipsHtml}</div>
                ${caption ? `<div style="margin-top:6px;font-size:10.5px;color:var(--text-dim2,#7b8693);line-height:1.3;">${esc(caption)}</div>` : ''}
              </div>`;
            })()}
            ${(() => {
              // Chantier Y — Marchés buts foot (O/U 2.5 + BTTS) exposés comme
              // picks alternatifs, avec intensité et odds implicite. Dérivé du
              // même Poisson que le pick principal. Sur les matchs à xG élevé
              // (>2.8), Over 2.5 est souvent le pick le plus fiable.
              const mk = pred.markets;
              if (!mk || match.sport !== 'football') return '';
              const chipHtml = (pick, bgColor, borderColor, textColor, icon) => {
                const probPct = (pick.prob * 100).toFixed(0);
                const impliedOdd = pick.prob > 0.02 ? (1 / pick.prob).toFixed(2) : '—';
                const strong = pick.prob >= 0.65;
                return `<div style="flex:1;min-width:140px;padding:10px 12px;border-radius:8px;background:${bgColor};border:1px solid ${borderColor};">
                  <div style="font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--text-dim2,#7b8693);margin-bottom:3px;">${icon} ${pick === mk.ou ? 'Plus/Moins 2.5' : 'Les deux marquent'}</div>
                  <div style="font-size:14px;font-weight:700;color:${textColor};">${esc(pick.label)}${strong ? ' ⭐' : ''}</div>
                  <div style="display:flex;gap:10px;font-size:12px;font-variant-numeric:tabular-nums;color:var(--text-dim,#b4bcc7);margin-top:4px;">
                    <span><b style="color:var(--text,#e6ebf2);">${probPct}%</b> proba</span>
                    <span>cote impl. <b style="color:var(--text,#e6ebf2);">${impliedOdd}</b></span>
                  </div>
                </div>`;
              };
              return `<div style="margin-top:14px;">
                <div style="font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:var(--text-dim2,#7b8693);margin-bottom:8px;">🥅 Marchés buts (Poisson)</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                  ${chipHtml(mk.ou, 'rgba(139,92,246,.08)', 'rgba(139,92,246,.25)', '#a78bfa', '⚽')}
                  ${chipHtml(mk.btts, 'rgba(236,72,153,.08)', 'rgba(236,72,153,.25)', '#f472b6', '🔄')}
                </div>
                <div style="margin-top:6px;font-size:10.5px;color:var(--text-dim2,#7b8693);line-height:1.3;">Picks alternatifs dérivés des buts attendus (${pred.poisson ? `xG ${pred.poisson.xgH.toFixed(2)}–${pred.poisson.xgA.toFixed(2)}` : 'modèle Poisson'}). ⭐ = ≥65%.</div>
              </div>`;
            })()}
            <!-- v30 — Bouton Parier sur Winamax retiré de la modal détail. -->
          </div>
        </div>`;
      })() : ''}

      ${(() => {
        // ============== Contexte extérieur (Chantiers 9/10/13/14) ==============
        const w = match.weather;
        const ref = match.referee;
        // Panneau ClubElo retiré de l'UI (Chantier L). Le signal reste actif
        // dans le modèle, on ne l'expose plus visuellement.
        const matchTime = new Date(match.date).getTime();
        const congH = (match.sport === 'football' && home?.name) ? congestionCount(home.name, matchTime, 7) : 0;
        const congA = (match.sport === 'football' && away?.name) ? congestionCount(away.name, matchTime, 7) : 0;
        const hasWeather = w && (typeof w.precip_mm === 'number' || typeof w.wind_kmh === 'number' || typeof w.temp_c === 'number');
        const hasRef = ref && ref.name;
        const hasCong = congH >= 2 || congA >= 2;
        if (!hasWeather && !hasRef && !hasCong) return '';
        const wcodeIcon = (c) => {
          if (c == null) return '🌡️';
          if (c >= 95) return '⛈️';
          if (c >= 80) return '🌧️';
          if (c >= 71) return '🌨️';
          if (c >= 51) return '🌦️';
          if (c >= 45) return '🌫️';
          if (c >= 1 && c <= 3) return '⛅';
          return '☀️';
        };
        return `
        <div class="section">
          <h4>🌐 Contexte extérieur</h4>
          <div class="two-cols">
            ${hasWeather ? `
              <div>
                <h4 style="margin-top:0;font-size:11px;color:var(--text-dim);">${wcodeIcon(w.weather_code)} Météo ${w.city ? '· ' + esc(w.city) : ''}</h4>
                ${typeof w.temp_c === 'number' ? `<div class="kv"><div class="k">Température</div><div class="v">${w.temp_c.toFixed(0)}°C</div></div>` : ''}
                ${typeof w.precip_mm === 'number' ? `<div class="kv"><div class="k">Précipitations</div><div class="v ${w.precip_mm > 3 ? 'accent' : ''}">${w.precip_mm.toFixed(1)} mm/h${w.precip_mm > 3 ? ' 🌧️' : ''}</div></div>` : ''}
                ${typeof w.wind_kmh === 'number' ? `<div class="kv"><div class="k">Vent</div><div class="v ${w.wind_kmh > 25 ? 'accent' : ''}">${Math.round(w.wind_kmh)} km/h${w.wind_kmh > 25 ? ' 💨' : ''}</div></div>` : ''}
                ${(w.precip_mm > 3 || w.wind_kmh > 25) ? `<div style="margin-top:6px;font-size:11px;color:var(--text-dim2,#7b8693);line-height:1.3;">Conditions défavorables → xG réduits (moins de buts attendus).</div>` : ''}
              </div>` : ''}
            ${hasRef ? `
              <div>
                <h4 style="margin-top:0;font-size:11px;color:var(--text-dim);">🟨 Arbitre</h4>
                <div class="kv"><div class="k">Nom</div><div class="v">${esc(ref.name)}</div></div>
                ${typeof ref.yellowPerGame === 'number' ? `<div class="kv"><div class="k">Jaunes/match</div><div class="v ${ref.yellowPerGame >= 4.5 ? 'accent' : ''}">${ref.yellowPerGame.toFixed(2)}${ref.yellowPerGame >= 4.5 ? ' (strict)' : ref.yellowPerGame <= 3.0 ? ' (tolérant)' : ''}</div></div>` : ''}
                ${typeof ref.redPerGame === 'number' ? `<div class="kv"><div class="k">Rouges/match</div><div class="v">${ref.redPerGame.toFixed(2)}</div></div>` : ''}
                ${ref.games ? `<div class="kv"><div class="k">Échantillon</div><div class="v">${ref.games} matchs</div></div>` : ''}
              </div>` : ''}
            ${hasCong ? `
              <div>
                <h4 style="margin-top:0;font-size:11px;color:var(--text-dim);">🟠 Charge matchs (7j)</h4>
                <div class="kv"><div class="k">${esc(home?.short || home?.name)}</div><div class="v ${congH >= 3 ? 'accent' : ''}">${congH} match${congH > 1 ? 's' : ''}${congH >= 3 ? ' 😵' : ''}</div></div>
                <div class="kv"><div class="k">${esc(away?.short || away?.name)}</div><div class="v ${congA >= 3 ? 'accent' : ''}">${congA} match${congA > 1 ? 's' : ''}${congA >= 3 ? ' 😵' : ''}</div></div>
                ${(congH >= 3 || congA >= 3) ? `<div style="margin-top:6px;font-size:11px;color:var(--text-dim2,#7b8693);line-height:1.3;">L'équipe la plus chargée subit un léger malus (fatigue cumulée).</div>` : ''}
              </div>` : ''}
          </div>
        </div>`;
      })()}

      ${((home?.lineup?.starters?.length || 0) + (away?.lineup?.starters?.length || 0) > 0) ? (() => {
        // ============== Compositions probables (Chantier 8 / patch_lineups_soccer) ==============
        const renderSide = (side, label) => {
          if (!side?.lineup?.starters?.length) {
            return `
              <div>
                <h4 style="margin-top:0;font-size:11px;color:var(--text-dim);">${esc(label)}</h4>
                <div style="color:var(--text-dim2,#7b8693);font-size:12px;">Composition non disponible.</div>
              </div>`;
          }
          const lu = side.lineup;
          const conf = lu.confirmed ? `<span style="padding:2px 7px;border-radius:4px;background:rgba(16,185,129,.15);color:#10b981;font-size:10px;font-weight:700;margin-left:8px;">CONFIRMÉE</span>` : `<span style="padding:2px 7px;border-radius:4px;background:rgba(255,255,255,.06);color:var(--text-dim2,#7b8693);font-size:10px;font-weight:700;margin-left:8px;">PROBABLE</span>`;
          const starters = lu.starters.slice(0, 11).map(p => `
            <div style="display:grid;grid-template-columns:28px 1fr auto;gap:6px;align-items:center;padding:4px 6px;background:rgba(255,255,255,.02);border-radius:4px;font-size:12px;">
              <span style="color:var(--text-dim2,#7b8693);font-family:monospace;text-align:center;">${esc(p.shirt ?? '—')}</span>
              <span style="color:var(--text,#e6ebf2);">${esc(p.name || '—')}${p.captain ? ' (C)' : ''}</span>
              <span style="color:var(--text-dim2,#7b8693);font-size:11px;">${esc(p.pos || '')}${p.rating ? ` · ${p.rating}` : ''}</span>
            </div>`).join('');
          return `
            <div>
              <h4 style="margin-top:0;font-size:11px;color:var(--text-dim);">${esc(label)} · ${esc(lu.formation || '—')}${conf}</h4>
              ${lu.coach ? `<div style="font-size:11.5px;color:var(--text-dim2,#7b8693);margin-bottom:6px;">Coach : ${esc(lu.coach)}</div>` : ''}
              <div style="display:flex;flex-direction:column;gap:3px;">${starters}</div>
            </div>`;
        };
        return `
        <div class="section">
          <h4>🧩 Compositions probables</h4>
          <div class="two-cols">
            ${renderSide(home, home?.name || 'Dom.')}
            ${renderSide(away, away?.name || 'Ext.')}
          </div>
        </div>`;
      })() : ''}

      ${(() => {
        // v24 — Buteurs potentiels dans le modal détail
        if (match.sport !== 'football') return '';
        const scorers = predictLikelyScorers(match, pred);
        if (!scorers || !scorers.length) return '';
        const top = scorers.slice(0, 8);
        const rows = top.map(s => {
          const probPct = (s.prob * 100).toFixed(0);
          const confColor = s.prob >= 0.50 ? '#34d399' : s.prob >= 0.35 ? '#60a5fa' : s.prob >= 0.22 ? '#fbbf24' : 'var(--text-dim)';
          const posIcon = s.pos === 'F' ? '⚔️' : s.pos === 'M' ? '🎯' : s.pos === 'D' ? '🛡️' : '🧤';
          return `
            <div style="display:grid;grid-template-columns:auto 1fr auto auto;gap:10px;padding:8px 4px;border-bottom:1px solid var(--border);align-items:center;">
              <div style="font-size:14px;">${posIcon}</div>
              <div style="min-width:0;">
                <div style="font-size:13px;font-weight:600;color:var(--text);">${esc(s.name)}${s.captain ? ' <span style="color:var(--gold);font-size:10px;" title="Capitaine">©</span>' : ''}</div>
                <div style="font-size:10.5px;color:var(--text-dim);">${esc(s.teamShort)} · ${s.pos === 'F' ? 'Attaquant' : s.pos === 'M' ? 'Milieu' : s.pos === 'D' ? 'Défenseur' : 'Gardien'}</div>
              </div>
              <div style="font-size:11px;color:var(--text-dim);font-variant-numeric:tabular-nums;">${s.impliedOdd ? 'cote ~' + s.impliedOdd.toFixed(2) : '—'}</div>
              <div style="font-size:13px;font-weight:700;color:${confColor};font-variant-numeric:tabular-nums;min-width:40px;text-align:right;">${probPct}%</div>
            </div>`;
        }).join('');
        return `
          <div class="section">
            <h4>🎯 Joueurs qui peuvent marquer</h4>
            <div style="margin-top:6px;">${rows}</div>
            <div style="margin-top:8px;font-size:11px;color:var(--text-dim2,#7b8693);line-height:1.4;">
              Estimation à partir des compositions annoncées, de la position et du nombre de buts attendu. Les attaquants et capitaines sont privilégiés. Utilisable pour le marché "Buteur" sur Winamax.
            </div>
          </div>`;
      })()}

      ${((home?.injuries?.length || 0) + (away?.injuries?.length || 0) > 0) ? (() => {
        // ============== Blessés / absents nominatifs (Sofascore soccer + ESPN US sports) ==============
        // v24.1 — Traduction FR systématique des labels Sofascore (qui sont en anglais)
        const translateRaw = (raw) => {
          if (!raw) return null;
          const r = String(raw).toLowerCase();
          if (r === 'injured' || r.includes('injur')) return 'Blessé';
          if (r === 'suspended' || r.includes('suspen')) return 'Suspendu';
          if (r === 'disciplinary' || r.includes('disciplin')) return 'Discipline';
          if (r === 'coach decision' || r.includes('coach') || r.includes('decision')) return 'Choix coach';
          if (r === 'doubtful' || r.includes('doubt') || r.includes('question')) return 'Incertain';
          if (r === 'international duty' || r.includes('intl') || r.includes('international')) return 'Sélection';
          if (r === 'missing') return 'Absent';
          if (r === 'out' || r.includes('out')) return 'Blessé';
          if (r === 'unknown') return 'Absent';
          // Déjà en français
          if (r.includes('bless')) return 'Blessé';
          if (r.includes('susp')) return 'Suspendu';
          if (r.includes('sélect')) return 'Sélection';
          if (r.includes('incertain')) return 'Incertain';
          if (r.includes('absent')) return 'Absent';
          return null;
        };
        const reasonLabel = (inj) => {
          const tr = translateRaw(inj.reason_label) || translateRaw(inj.type) || translateRaw(inj.reason);
          return tr || 'Absent';
        };
        const reasonColor = (lbl) => {
          const l = lbl.toLowerCase();
          if (l.includes('bless')) return '#fca5a5';
          if (l.includes('suspen')) return '#fbbf24';
          if (l.includes('sélect')) return '#60a5fa';
          if (l.includes('incertain')) return '#eab308';
          if (l.includes('discipl')) return '#fbbf24';
          if (l.includes('coach')) return '#a78bfa';
          return '#b4bcc7';
        };
        const renderList = (side, label) => {
          const injs = side?.injuries || [];
          if (!injs.length) return `
            <div>
              <h4 style="margin-top:0;font-size:11px;color:var(--text-dim);">${esc(label)}</h4>
              <div style="color:var(--text-dim2,#7b8693);font-size:12px;">Aucun absent signalé.</div>
            </div>`;
          return `
            <div>
              <h4 style="margin-top:0;font-size:11px;color:var(--text-dim);">${esc(label)} · ${injs.length} absent${injs.length > 1 ? 's' : ''}</h4>
              <div style="display:flex;flex-direction:column;gap:4px;">
                ${injs.map(inj => {
                  const lbl = reasonLabel(inj);
                  const col = reasonColor(lbl);
                  return `
                    <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:5px 8px;background:rgba(255,255,255,.02);border-radius:4px;font-size:12px;">
                      <span style="color:var(--text,#e6ebf2);">${esc(inj.player || inj.name || '—')}${inj.position ? ` <span style="color:var(--text-dim2,#7b8693);font-size:10.5px;">(${esc(inj.position)})</span>` : ''}</span>
                      <span style="color:${col};font-size:11px;font-weight:600;">${esc(lbl)}</span>
                    </div>`;
                }).join('')}
              </div>
            </div>`;
        };
        return `
        <div class="section">
          <h4>🏥 Absents nominatifs</h4>
          <div class="two-cols">
            ${renderList(home, home?.name || 'Dom.')}
            ${renderList(away, away?.name || 'Ext.')}
          </div>
        </div>`;
      })() : ''}

      ${((home?.last5?.length || 0) + (away?.last5?.length || 0) > 0) ? (() => {
        // ============== 5 derniers matchs détaillés ==============
        const renderTable = (side, label) => {
          const rows = side?.last5 || [];
          if (!rows.length) return `
            <div>
              <h4 style="margin-top:0;font-size:11px;color:var(--text-dim);">${esc(label)}</h4>
              <div style="color:var(--text-dim2,#7b8693);font-size:12px;">Pas d'historique récent.</div>
            </div>`;
          return `
            <div>
              <h4 style="margin-top:0;font-size:11px;color:var(--text-dim);">${esc(label)}</h4>
              <div style="display:flex;flex-direction:column;gap:3px;">
                ${rows.map(r => {
                  const resCol = r.result === 'W' ? '#10b981' : r.result === 'L' ? '#fca5a5' : '#b4bcc7';
                  const resBg  = r.result === 'W' ? 'rgba(16,185,129,.14)' : r.result === 'L' ? 'rgba(239,68,68,.12)' : 'rgba(255,255,255,.06)';
                  const haIco = r.ha === 'home' ? '🏠' : '✈️';
                  return `
                    <div style="display:grid;grid-template-columns:70px 22px 22px 1fr 52px 18px;gap:6px;align-items:center;padding:4px 6px;background:rgba(255,255,255,.02);border-radius:4px;font-size:12px;">
                      <span style="color:var(--text-dim2,#7b8693);font-family:monospace;font-size:11px;">${esc(isoDate(r.date))}</span>
                      <span style="text-align:center;">${haIco}</span>
                      <span style="text-align:center;padding:1px 0;border-radius:3px;background:${resBg};color:${resCol};font-weight:700;">${esc(r.result || '—')}</span>
                      <span style="color:var(--text,#e6ebf2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(r.opp || '—')}</span>
                      <span style="text-align:center;font-variant-numeric:tabular-nums;font-weight:600;color:var(--text,#e6ebf2);">${r.gf}-${r.ga}</span>
                      <span></span>
                    </div>`;
                }).join('')}
              </div>
            </div>`;
        };
        return `
        <div class="section">
          <h4>📜 5 derniers matchs</h4>
          <div class="two-cols">
            ${renderTable(home, home?.name || 'Dom.')}
            ${renderTable(away, away?.name || 'Ext.')}
          </div>
        </div>`;
      })() : ''}

      ${(match.tips && match.tips.length) ? `
      <div class="section">
        <div class="tipster-panel">
          <h4>👥 Pronostics des tipsters externes</h4>
          ${match.tips.map(t => {
            const tRes = evaluateTipsterPick(t.pick, match);
            const tBadge = tRes ? resultBadgeHtml(tRes, tRes === 'won' ? t.odds : null) : '';
            return `
            <div class="tipster-entry">
              <div class="src-line">
                <span>📰 ${esc(sourceLabel(t.source))}</span>
                <span style="display:inline-flex; gap:8px; align-items:center;">
                  ${tBadge}
                  ${t.url ? `<a href="${esc(t.url)}" target="_blank" rel="noopener">Voir l'article ↗</a>` : ''}
                </span>
              </div>
              ${t.pick ? `<div class="main-pick" style="${tRes === 'lost' ? 'text-decoration:line-through; opacity:.7;' : ''}">🎯 ${esc(t.pick)}</div>` : ''}
              ${t.odds ? `<div class="main-odds">Cote recommandée : <b style="color:var(--text);">${t.odds.toFixed(2)}</b></div>` : ''}
              ${t.analysis ? `<div class="analysis">"${esc(t.analysis)}"</div>` : ''}
              ${(t.all_picks && t.all_picks.length > 1) ? `
                <div class="alt-picks">
                  <b>Paris alternatifs :</b> ${t.all_picks.slice(1).map(p => {
                    // Guard : tipster data peut avoir des picks sans odds valides
                    const oddNum = Number(p.odds);
                    const oddStr = isFinite(oddNum) ? oddNum.toFixed(2) : '—';
                    return `${esc(p.label || '?')} @ ${oddStr}`;
                  }).join(' · ')}
                </div>
              ` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

      ${(match.h2h?.meetings && match.h2h.meetings.length) ? (() => {
        const homeKey = (home?.name || '').toLowerCase();
        const awayKey = (away?.name || '').toLowerCase();
        const rel = match.h2h.meetings.filter(mt => {
          const a = (mt.home||'').toLowerCase(), b = (mt.away||'').toLowerCase();
          return (a === homeKey || a === awayKey) && (b === homeKey || b === awayKey) && a !== b;
        }).slice(0, 6);
        if (!rel.length) return '';
        let hw = 0, aw = 0, dr = 0;
        rel.forEach(mt => {
          const histH = (mt.home||'').toLowerCase() === homeKey;
          if (mt.winner === 'draw') dr++;
          else if (mt.winner === 'home') histH ? hw++ : aw++;
          else if (mt.winner === 'away') histH ? aw++ : hw++;
        });
        return `
        <div class="section">
          <h4>⚔️ Face-à-face récents</h4>
          <div style="display:flex;gap:10px;margin-bottom:10px;font-size:12.5px;flex-wrap:wrap;">
            <span style="padding:4px 10px;border-radius:6px;background:rgba(16,185,129,.12);color:#10b981;font-weight:700;">${esc(home?.short||home?.name)}: ${hw}V</span>
            ${dr ? `<span style="padding:4px 10px;border-radius:6px;background:rgba(255,255,255,.06);color:var(--text-dim,#b4bcc7);font-weight:700;">Nuls: ${dr}</span>` : ''}
            <span style="padding:4px 10px;border-radius:6px;background:rgba(96,165,250,.12);color:#60a5fa;font-weight:700;">${esc(away?.short||away?.name)}: ${aw}V</span>
          </div>
          <div class="h2h-list" style="display:flex;flex-direction:column;gap:4px;">
            ${rel.map(mt => {
              let cls = '';
              let winLbl = '';
              if (mt.winner === 'draw') { cls = 'draw'; winLbl = '— nul'; }
              else {
                const winSide = mt.winner === 'home' ? mt.home : mt.away;
                winLbl = `→ ${winSide}`;
                cls = ((mt.home||'').toLowerCase() === homeKey ? (mt.winner === 'home' ? 'home' : 'away') : (mt.winner === 'home' ? 'away' : 'home'));
              }
              const date = isoDate(mt.date);
              return `
                <div style="display:grid;grid-template-columns:72px 1fr 60px 1fr 100px;gap:8px;align-items:center;padding:6px 8px;background:rgba(255,255,255,.02);border-radius:6px;font-size:12.5px;">
                  <span style="color:var(--text-dim2,#7b8693);font-family:monospace;">${esc(date)}</span>
                  <span style="text-align:right;${cls==='home'?'font-weight:700;':''}">${esc(mt.home||'')}</span>
                  <span style="text-align:center;font-weight:700;color:var(--text,#e6ebf2);">${esc(mt.score||'')}</span>
                  <span style="${cls==='away'?'font-weight:700;':''}">${esc(mt.away||'')}</span>
                  <span style="color:var(--text-dim2,#7b8693);font-size:11px;">${esc(winLbl)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>`;
      })() : ''}

      <div class="section">
        <h4>📊 Probabilités modélisées vs marché</h4>
        ${(() => {
          // v30 — Comparaison côte-à-côte modèle vs marché. Les probas marché
          // sont extraites de pred.odds (Winamax priorisé) via 1/odd, puis
          // normalisées pour sommer à 1 (retire l'overround bookmaker).
          // Edge = pModel - pMarket. Positif = on est plus optimiste que le
          // marché → potentiel value.
          const o = pred?.odds || {};
          const inv = (n) => isFinite(n) && n > 0 ? 1/n : null;
          const ih = inv(o.home), ia = inv(o.away), id = hasDraw ? inv(o.draw) : null;
          const sum = (ih||0) + (ia||0) + (id||0);
          const mH = ih && sum ? ih/sum : null;
          const mA = ia && sum ? ia/sum : null;
          const mD = id && sum ? id/sum : null;
          const fmtP = (p) => p == null ? '—' : `${(p*100).toFixed(1)}%`;
          const edgeOf = (model, market) => (model != null && market != null) ? (model - market) : null;
          const edgeFmt = (e) => e == null ? '' : `<span style="color:${e>0.03?'#34d399':e<-0.03?'#f87171':'var(--text-dim)'};font-weight:600;font-size:11px;">${e>=0?'+':''}${(e*100).toFixed(1)}pt</span>`;
          const barCmpHtml = (label, modelP, marketP) => {
            const e = edgeOf(modelP, marketP);
            return `<div style="display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;margin-bottom:10px;">
              <div style="font-size:13px;color:var(--text);font-weight:500;">${esc(label)}</div>
              ${edgeFmt(e)}
              <div style="grid-column:1/-1;display:grid;grid-template-columns:60px 1fr 60px;gap:8px;align-items:center;font-size:11px;">
                <div style="color:var(--brand);text-align:right;font-weight:700;font-variant-numeric:tabular-nums;">${fmtP(modelP)}</div>
                <div style="position:relative;height:8px;background:var(--panel-2,rgba(255,255,255,.04));border-radius:4px;overflow:hidden;">
                  <div style="position:absolute;left:0;top:0;height:100%;width:${Math.max(0,Math.min(100,(modelP||0)*100))}%;background:var(--brand);opacity:.85;"></div>
                  <div style="position:absolute;left:0;top:0;height:100%;width:${Math.max(0,Math.min(100,(marketP||0)*100))}%;background:transparent;border-right:2px solid var(--text);opacity:.55;"></div>
                </div>
                <div style="color:var(--text-dim);font-variant-numeric:tabular-nums;">${fmtP(marketP)}</div>
              </div>
            </div>`;
          };
          const legend = `<div style="display:flex;gap:14px;font-size:10.5px;color:var(--text-dim);margin-bottom:8px;">
            <div><span style="display:inline-block;width:10px;height:6px;background:var(--brand);opacity:.85;vertical-align:middle;margin-right:4px;border-radius:2px;"></span>Modèle</div>
            <div><span style="display:inline-block;width:10px;height:8px;border-right:2px solid var(--text);vertical-align:middle;margin-right:4px;opacity:.55;"></span>Marché (Winamax, sans marge)</div>
          </div>`;
          return legend + barCmpHtml(`Victoire ${esc(home?.short || home?.name || '1')}`, probs.pH, mH)
            + (hasDraw ? barCmpHtml('Match nul', probs.pD, mD) : '')
            + barCmpHtml(`Victoire ${esc(away?.short || away?.name || '2')}`, probs.pA, mA);
        })()}
      </div>

      <div class="section">
        <h4>💰 Cotes bookmakers</h4>
        ${oddsTableHtml}
      </div>

      ${(() => {
        // v31.7.4 — Section "Chiffres clés" sport-aware. Affiche les stats les
        // plus actionables selon le sport, avec gracieux degrade si data manque.
        const sport = match.sport;
        const homeC = home || {};
        const awayC = away || {};
        const fmtN = (n, dec=1) => (n == null || !isFinite(n)) ? '—' : Number(n).toFixed(dec);
        const fmtPct = (n) => (n == null || !isFinite(n)) ? '—' : (n*100).toFixed(0) + '%';
        const fmtForm = (s) => {
          if (!s || typeof s !== 'string') return '';
          return s.split('').map(c => {
            const col = c==='W' ? '#34d399' : c==='L' ? '#fca5a5' : 'var(--text-dim2)';
            const ch = c==='W' ? '✓' : c==='L' ? '✗' : '·';
            return `<span style="display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;border-radius:50%;background:${col}22;color:${col};font-weight:700;font-size:10px;margin-right:1px;">${ch}</span>`;
          }).join('');
        };
        const kvBlock = (rows) => `<div class="two-cols">
          <div>${rows.home.map(([k,v]) => `<div class="kv"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>
          <div>${rows.away.map(([k,v]) => `<div class="kv"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>
        </div>`;

        if (sport === 'football') {
          const eloH = homeC.elo, eloA = awayC.elo;
          const fsH = homeC.form_stats || {}, fsA = awayC.form_stats || {};
          const cal = match.fd_calibration;
          if (!eloH && !eloA && !fsH.played5 && !fsA.played5 && !cal) return '';
          const homeRows = [];
          const awayRows = [];
          if (eloH) homeRows.push(['Clubelo', `<b>${fmtN(eloH.value, 0)}</b> · niv. ${eloH.level}${eloH.rank ? ' · #' + eloH.rank : ''}`]);
          if (eloA) awayRows.push(['Clubelo', `<b>${fmtN(eloA.value, 0)}</b> · niv. ${eloA.level}${eloA.rank ? ' · #' + eloA.rank : ''}`]);
          if (fsH.played5) {
            homeRows.push(['Buts marqués / encaissés (5)', `<b>${fmtN(fsH.avg_gf5, 1)}</b> · ${fmtN(fsH.avg_ga5, 1)}`]);
            homeRows.push(['Bilan 5 derniers', `${fsH.wins5}V · ${fsH.draws5}N · ${fsH.losses5}D`]);
            if (fsH.cleans5 != null) homeRows.push(['Clean sheets / loupés', `${fsH.cleans5} · ${fsH.failed_to_score5}`]);
          }
          if (fsA.played5) {
            awayRows.push(['Buts marqués / encaissés (5)', `<b>${fmtN(fsA.avg_gf5, 1)}</b> · ${fmtN(fsA.avg_ga5, 1)}`]);
            awayRows.push(['Bilan 5 derniers', `${fsA.wins5}V · ${fsA.draws5}N · ${fsA.losses5}D`]);
            if (fsA.cleans5 != null) awayRows.push(['Clean sheets / loupés', `${fsA.cleans5} · ${fsA.failed_to_score5}`]);
          }
          const calRow = cal ? `<div style="margin-top:14px;padding:12px 14px;background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:8px;font-size:12.5px;color:var(--text-dim);line-height:1.7;">
            <div style="font-size:10.5px;color:var(--text-dim2);text-transform:uppercase;letter-spacing:.4px;font-weight:700;margin-bottom:6px;">Calibration ligue (${cal.n} matchs historiques)</div>
            <span style="color:var(--text);">⚽ ${fmtN(cal.avg_goals, 2)}</span> buts/match ·
            <span style="color:var(--text);">🏠 ${fmtPct(cal.home_wr)}</span> dom. ·
            <span style="color:var(--text);">⚖️ ${fmtPct(cal.draw_rate)}</span> nul ·
            <span style="color:var(--text);">✈️ ${fmtPct(cal.away_wr)}</span> ext. ·
            <span style="color:var(--text);">📈 +2.5 ${fmtPct(cal.over25_rate)}</span> ·
            <span style="color:var(--text);">🎯 BTTS ${fmtPct(cal.btts_rate)}</span>
          </div>` : '';
          return `<div class="section">
            <h4>📊 Chiffres clés foot</h4>
            ${kvBlock({ home: homeRows, away: awayRows })}
            ${calRow}
          </div>`;
        }

        if (sport === 'tennis') {
          const tf = match.tennis_features;
          if (!tf || (!tf.home && !tf.away)) return '';
          const tH = tf.home || {}, tA = tf.away || {};
          const sf = tf.surface;
          const sfDiff = tf.surface_elo_diff;
          const homeRows = [];
          const awayRows = [];
          if (tH.elo) homeRows.push(['Elo global', `<b>${fmtN(tH.elo, 0)}</b>${tH.rank ? ' · #' + tH.rank : ''}`]);
          if (tA.elo) awayRows.push(['Elo global', `<b>${fmtN(tA.elo, 0)}</b>${tA.rank ? ' · #' + tA.rank : ''}`]);
          if (sf && tH.surface_elo && tH.surface_elo[sf] != null) homeRows.push([`Elo ${sf}`, `<b>${fmtN(tH.surface_elo[sf], 0)}</b>`]);
          if (sf && tA.surface_elo && tA.surface_elo[sf] != null) awayRows.push([`Elo ${sf}`, `<b>${fmtN(tA.surface_elo[sf], 0)}</b>`]);
          if (tH.last10) homeRows.push(['Forme 10 derniers', `<span>${fmtForm(tH.last10)}</span> · ${tH.wins_last10}V`]);
          if (tA.last10) awayRows.push(['Forme 10 derniers', `<span>${fmtForm(tA.last10)}</span> · ${tA.wins_last10}V`]);
          if (tH.fatigue_14d != null) homeRows.push(['Matchs derniers 14j', `<b>${tH.fatigue_14d}</b>`]);
          if (tA.fatigue_14d != null) awayRows.push(['Matchs derniers 14j', `<b>${tA.fatigue_14d}</b>`]);
          const sfBanner = sf && sfDiff != null ? `<div style="margin-bottom:14px;padding:10px 12px;background:${Math.abs(sfDiff) > 100 ? 'rgba(167,139,250,.08)' : 'rgba(255,255,255,.02)'};border:1px solid ${Math.abs(sfDiff) > 100 ? 'rgba(167,139,250,.18)' : 'var(--border)'};border-left:3px solid ${sfDiff > 0 ? 'var(--brand)' : 'var(--info)'};border-radius:0 8px 8px 0;font-size:12.5px;color:var(--text);"><b>Surface ${sf}</b> · diff Elo ${sfDiff > 0 ? '+' : ''}${fmtN(sfDiff, 0)} pts en faveur de ${sfDiff > 0 ? esc(homeC.name||'home') : esc(awayC.name||'away')}</div>` : '';
          return `<div class="section">
            <h4>📊 Chiffres clés tennis</h4>
            ${sfBanner}
            ${kvBlock({ home: homeRows, away: awayRows })}
          </div>`;
        }

        if (sport === 'hockey') {
          const ns = match.nhl_stats;
          if (!ns) return '';
          const sH = ns.home || {}, sA = ns.away || {};
          const gH = sH.goalie || {}, gA = sA.goalie || {};
          const homeRows = [];
          const awayRows = [];
          if (sH.gf_per_game != null) homeRows.push(['Buts pour / contre', `<b>${fmtN(sH.gf_per_game, 2)}</b> · ${fmtN(sH.ga_per_game, 2)}`]);
          if (sA.gf_per_game != null) awayRows.push(['Buts pour / contre', `<b>${fmtN(sA.gf_per_game, 2)}</b> · ${fmtN(sA.ga_per_game, 2)}`]);
          if (sH.l10_wins != null) homeRows.push(['10 derniers', `${sH.l10_wins}V · ${sH.l10_losses}D · ${sH.l10_ot_losses || 0} OTL`]);
          if (sA.l10_wins != null) awayRows.push(['10 derniers', `${sA.l10_wins}V · ${sA.l10_losses}D · ${sA.l10_ot_losses || 0} OTL`]);
          if (gH.name) homeRows.push(['Gardien probable', `<b>${esc(gH.name)}</b> · SV% <b>${fmtN(gH.save_pct*100, 1)}</b> · GAA ${fmtN(gH.gaa, 2)}`]);
          if (gA.name) awayRows.push(['Gardien probable', `<b>${esc(gA.name)}</b> · SV% <b>${fmtN(gA.save_pct*100, 1)}</b> · GAA ${fmtN(gA.gaa, 2)}`]);
          if (sH.points != null) homeRows.push(['Points · GP', `${sH.points} · ${sH.gp}`]);
          if (sA.points != null) awayRows.push(['Points · GP', `${sA.points} · ${sA.gp}`]);
          return `<div class="section">
            <h4>🥅 Chiffres clés NHL</h4>
            ${kvBlock({ home: homeRows, away: awayRows })}
          </div>`;
        }

        if (sport === 'baseball') {
          const mp = match.mlb_pitchers;
          const fsH = homeC.form_stats || {}, fsA = awayC.form_stats || {};
          if (!mp && !fsH.played5 && !fsA.played5) return '';
          const homeRows = [];
          const awayRows = [];
          if (mp && mp.home && mp.home.name) homeRows.push(['Pitcher probable', `<b>${esc(mp.home.name)}</b> · ERA <b>${fmtN(mp.home.era, 2)}</b> · WHIP ${fmtN(mp.home.whip, 2)} · K/9 ${fmtN(mp.home.k9, 1)} (${mp.home.hand || '?'})`]);
          if (mp && mp.away && mp.away.name) awayRows.push(['Pitcher probable', `<b>${esc(mp.away.name)}</b> · ERA <b>${fmtN(mp.away.era, 2)}</b> · WHIP ${fmtN(mp.away.whip, 2)} · K/9 ${fmtN(mp.away.k9, 1)} (${mp.away.hand || '?'})`]);
          if (fsH.played5) homeRows.push(['Forme 5 derniers', `${fsH.wins5}V · ${fsH.losses5}D · runs ${fmtN(fsH.avg_gf5, 1)}/${fmtN(fsH.avg_ga5, 1)}`]);
          if (fsA.played5) awayRows.push(['Forme 5 derniers', `${fsA.wins5}V · ${fsA.losses5}D · runs ${fmtN(fsA.avg_gf5, 1)}/${fmtN(fsA.avg_ga5, 1)}`]);
          return `<div class="section">
            <h4>⚾ Chiffres clés MLB</h4>
            ${kvBlock({ home: homeRows, away: awayRows })}
          </div>`;
        }

        if (sport === 'basketball') {
          const fsH = homeC.form_stats || {}, fsA = awayC.form_stats || {};
          if (!fsH.played5 && !fsA.played5) return '';
          const homeRows = [];
          const awayRows = [];
          if (fsH.played5) {
            homeRows.push(['Points marqués / encaissés (5)', `<b>${fmtN(fsH.avg_gf5, 1)}</b> · ${fmtN(fsH.avg_ga5, 1)}`]);
            homeRows.push(['Bilan 5 derniers', `${fsH.wins5}V · ${fsH.losses5}D`]);
            if (homeC.form) homeRows.push(['Forme', `<span>${fmtForm(homeC.form)}</span>`]);
          }
          if (fsA.played5) {
            awayRows.push(['Points marqués / encaissés (5)', `<b>${fmtN(fsA.avg_gf5, 1)}</b> · ${fmtN(fsA.avg_ga5, 1)}`]);
            awayRows.push(['Bilan 5 derniers', `${fsA.wins5}V · ${fsA.losses5}D`]);
            if (awayC.form) awayRows.push(['Forme', `<span>${fmtForm(awayC.form)}</span>`]);
          }
          return `<div class="section">
            <h4>🏀 Chiffres clés basket</h4>
            ${kvBlock({ home: homeRows, away: awayRows })}
          </div>`;
        }

        return '';
      })()}

      <div class="section">
        <h4>📈 Statistiques saison</h4>
        <div class="two-cols">
          <div>
            <div class="kv"><div class="k">Équipe</div><div class="v">${esc(home?.name || 'Dom.')}</div></div>
            <div class="kv"><div class="k">Bilan</div><div class="v">${esc(getRecord(home) || 'n/a')}</div></div>
            ${recH ? `<div class="kv"><div class="k">% Victoires</div><div class="v">${recH.games > 0 ? ((recH.w/recH.games)*100).toFixed(1) : '—'}%</div></div>` : ''}
            ${(() => { const f = derivedForm(home); return f ? `<div class="kv"><div class="k">Forme (5 derniers)</div><div class="v">${renderForm(f)}</div></div>` : ''; })()}
            ${home?.form_stats?.played5 ? `
              <div class="kv"><div class="k">Buts marqués (5)</div><div class="v">${home.form_stats.gf5} <span style="color:var(--text-dim2,#7b8693);font-size:11px;">(${home.form_stats.avg_gf5.toFixed(1)}/m)</span></div></div>
              <div class="kv"><div class="k">Buts encaissés (5)</div><div class="v">${home.form_stats.ga5} <span style="color:var(--text-dim2,#7b8693);font-size:11px;">(${home.form_stats.avg_ga5.toFixed(1)}/m)</span></div></div>
              <div class="kv"><div class="k">Clean sheets (5)</div><div class="v">${home.form_stats.cleans5}</div></div>
            ` : ''}
            ${stdH ? `
              <div class="kv"><div class="k">Classement</div><div class="v accent">#${esc(stdH.rank)}</div></div>
              <div class="kv"><div class="k">Points</div><div class="v">${esc(stdH.points || '—')}</div></div>
              <div class="kv"><div class="k">Différence buts</div><div class="v">${esc(stdH.gd || '—')}</div></div>
            ` : ''}
          </div>
          <div>
            <div class="kv"><div class="k">Équipe</div><div class="v">${esc(away?.name || 'Ext.')}</div></div>
            <div class="kv"><div class="k">Bilan</div><div class="v">${esc(getRecord(away) || 'n/a')}</div></div>
            ${recA ? `<div class="kv"><div class="k">% Victoires</div><div class="v">${recA.games > 0 ? ((recA.w/recA.games)*100).toFixed(1) : '—'}%</div></div>` : ''}
            ${(() => { const f = derivedForm(away); return f ? `<div class="kv"><div class="k">Forme (5 derniers)</div><div class="v">${renderForm(f)}</div></div>` : ''; })()}
            ${away?.form_stats?.played5 ? `
              <div class="kv"><div class="k">Buts marqués (5)</div><div class="v">${away.form_stats.gf5} <span style="color:var(--text-dim2,#7b8693);font-size:11px;">(${away.form_stats.avg_gf5.toFixed(1)}/m)</span></div></div>
              <div class="kv"><div class="k">Buts encaissés (5)</div><div class="v">${away.form_stats.ga5} <span style="color:var(--text-dim2,#7b8693);font-size:11px;">(${away.form_stats.avg_ga5.toFixed(1)}/m)</span></div></div>
              <div class="kv"><div class="k">Clean sheets (5)</div><div class="v">${away.form_stats.cleans5}</div></div>
            ` : ''}
            ${stdA ? `
              <div class="kv"><div class="k">Classement</div><div class="v accent">#${esc(stdA.rank)}</div></div>
              <div class="kv"><div class="k">Points</div><div class="v">${esc(stdA.points || '—')}</div></div>
              <div class="kv"><div class="k">Différence buts</div><div class="v">${esc(stdA.gd || '—')}</div></div>
            ` : ''}
          </div>
        </div>
      </div>

      ${standingsHtml ? `
      <div class="section">
        <h4>🏆 Classement ${esc(match.league_name)}</h4>
        ${standingsHtml}
      </div>` : ''}

      ${leadersHtml ? `
      <div class="section">
        <h4>⭐ Joueurs clés</h4>
        ${leadersHtml}
      </div>` : ''}

      ${(() => {
        // Chantier K — panneau "stats équipes" sport-aware.
        // Basket / hockey : home / road split depuis records (souvent dispo là où
        // les standings détaillés et la forme ne le sont pas).
        // Tennis : rank ATP/WTA + pays + surface.
        const splitOf = (side) => {
          const recs = side?.records || [];
          const find = (t) => recs.find(r => (r.type || r.name || '').toLowerCase() === t);
          const all = find('total') || find('overall');
          const hm  = find('home');
          const rd  = find('road') || find('away');
          return {
            overall: all?.summary,
            home:    hm?.summary,
            road:    rd?.summary,
          };
        };
        if (match.sport === 'basketball' || match.sport === 'hockey') {
          const hS = splitOf(home), aS = splitOf(away);
          const hasAny = hS.overall || hS.home || hS.road || aS.overall || aS.home || aS.road;
          if (!hasAny) return '';
          const labelHome = match.sport === 'hockey' ? 'Domicile (saison)' : 'À domicile (saison)';
          const labelRoad = match.sport === 'hockey' ? 'Extérieur (saison)' : 'À l\'extérieur (saison)';
          return `
          <div class="section">
            <h4>📊 Splits domicile / extérieur</h4>
            <div class="two-cols">
              <div>
                <h4 style="margin-top:0;font-size:11px;color:var(--text-dim);">${esc(home?.name || 'Dom.')}</h4>
                ${hS.overall ? `<div class="kv"><div class="k">Bilan global</div><div class="v">${esc(hS.overall)}</div></div>` : ''}
                ${hS.home ? `<div class="kv"><div class="k">${labelHome}</div><div class="v">${esc(hS.home)}</div></div>` : ''}
                ${hS.road ? `<div class="kv"><div class="k">${labelRoad}</div><div class="v">${esc(hS.road)}</div></div>` : ''}
              </div>
              <div>
                <h4 style="margin-top:0;font-size:11px;color:var(--text-dim);">${esc(away?.name || 'Ext.')}</h4>
                ${aS.overall ? `<div class="kv"><div class="k">Bilan global</div><div class="v">${esc(aS.overall)}</div></div>` : ''}
                ${aS.home ? `<div class="kv"><div class="k">${labelHome}</div><div class="v">${esc(aS.home)}</div></div>` : ''}
                ${aS.road ? `<div class="kv"><div class="k">${labelRoad}</div><div class="v">${esc(aS.road)}</div></div>` : ''}
              </div>
            </div>
          </div>`;
        }
        if (match.sport === 'tennis') {
          const rankH = home?.rank, rankA = away?.rank;
          const ctrH = home?.country, ctrA = away?.country;
          // v30 — Winamax 1N2 quote alignment now reaches tennis (home_name
          // present in markets makes ESPN/Winamax order match), so we can
          // surface the bookmaker price next to the player profile.
          const wxN12 = match.winamax?.markets?.['1n2'];
          const oddH = wxN12 && typeof wxN12.home === 'number' ? wxN12.home : null;
          const oddA = wxN12 && typeof wxN12.away === 'number' ? wxN12.away : null;
          const impH = oddH ? Math.round(100 / oddH) : null;
          const impA = oddA ? Math.round(100 / oddA) : null;
          // Rank delta for the headline.
          const rankDelta = (rankH && rankA) ? Math.abs(Number(rankH) - Number(rankA)) : null;
          const favRank = (rankH && rankA) ? (Number(rankH) < Number(rankA) ? 'home' : 'away') : null;
          const hasAny = rankH || rankA || ctrH || ctrA || match.surface || match.round || oddH || oddA;
          if (!hasAny) return '';
          // Last-5 / form letters for tennis (when fetch_team_form populates them).
          const formH = home?.form || (home?.last5?.map(r => r.result).join('') || '');
          const formA = away?.form || (away?.last5?.map(r => r.result).join('') || '');
          // H2H summary (if any).
          const h2hList = (match.h2h?.meetings || []);
          let h2hHomeWins = 0, h2hAwayWins = 0;
          if (h2hList.length) {
            const homeKey = (home?.name || '').toLowerCase();
            h2hList.forEach(mt => {
              const aLow = (mt.home || '').toLowerCase();
              const histHomeIsHome = aLow === homeKey;
              if (mt.winner === 'home') histHomeIsHome ? h2hHomeWins++ : h2hAwayWins++;
              else if (mt.winner === 'away') histHomeIsHome ? h2hAwayWins++ : h2hHomeWins++;
            });
          }
          return `
          <div class="section">
            <h4>🎾 Profil joueurs</h4>
            <div class="two-cols">
              <div>
                <h4 style="margin-top:0;font-size:11px;color:var(--text-dim);">${esc(home?.name || '—')}</h4>
                ${rankH ? `<div class="kv"><div class="k">Classement</div><div class="v">#${esc(rankH)}</div></div>` : ''}
                ${ctrH ? `<div class="kv"><div class="k">Pays</div><div class="v">${esc(ctrH)}</div></div>` : ''}
                ${oddH ? `<div class="kv"><div class="k">Cote Winamax</div><div class="v" style="font-variant-numeric:tabular-nums;">@${oddH.toFixed(2)} <span style="color:var(--text-dim2,#7b8693);font-size:11px;">(${impH}%)</span></div></div>` : ''}
                ${formH ? `<div class="kv"><div class="k">5 derniers</div><div class="v" style="font-family:monospace;letter-spacing:1px;">${esc(formH.slice(-5))}</div></div>` : ''}
                ${h2hList.length ? `<div class="kv"><div class="k">H2H gagnés</div><div class="v">${h2hHomeWins}/${h2hList.length}</div></div>` : ''}
              </div>
              <div>
                <h4 style="margin-top:0;font-size:11px;color:var(--text-dim);">${esc(away?.name || '—')}</h4>
                ${rankA ? `<div class="kv"><div class="k">Classement</div><div class="v">#${esc(rankA)}</div></div>` : ''}
                ${ctrA ? `<div class="kv"><div class="k">Pays</div><div class="v">${esc(ctrA)}</div></div>` : ''}
                ${oddA ? `<div class="kv"><div class="k">Cote Winamax</div><div class="v" style="font-variant-numeric:tabular-nums;">@${oddA.toFixed(2)} <span style="color:var(--text-dim2,#7b8693);font-size:11px;">(${impA}%)</span></div></div>` : ''}
                ${formA ? `<div class="kv"><div class="k">5 derniers</div><div class="v" style="font-family:monospace;letter-spacing:1px;">${esc(formA.slice(-5))}</div></div>` : ''}
                ${h2hList.length ? `<div class="kv"><div class="k">H2H gagnés</div><div class="v">${h2hAwayWins}/${h2hList.length}</div></div>` : ''}
              </div>
            </div>
            ${(match.surface || match.round || rankDelta != null) ? `<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;font-size:12px;">
              ${match.surface ? `<span style="padding:4px 10px;border-radius:6px;background:rgba(255,255,255,.04);color:var(--text-dim,#b4bcc7);">Surface : <b style="color:var(--text,#e6ebf2);">${esc(match.surface)}</b></span>` : ''}
              ${match.round ? `<span style="padding:4px 10px;border-radius:6px;background:rgba(255,255,255,.04);color:var(--text-dim,#b4bcc7);">Tour : <b style="color:var(--text,#e6ebf2);">${esc(match.round)}</b></span>` : ''}
              ${rankDelta != null && rankDelta >= 5 ? `<span style="padding:4px 10px;border-radius:6px;background:rgba(167,139,250,.10);color:var(--brand,#a78bfa);">Δ rang ${rankDelta} — favori : <b>${esc(favRank === 'home' ? (home?.short || home?.name || '?') : (away?.short || away?.name || '?'))}</b></span>` : ''}
            </div>` : ''}
          </div>`;
        }
        return '';
      })()}

      <div class="section">
        <h4>ℹ️ Informations match</h4>
        <div class="two-cols">
          <div>
            <div class="kv"><div class="k">Compétition</div><div class="v">${esc(match.league_name || '—')}</div></div>
            <div class="kv"><div class="k">Pays / Région</div><div class="v">${esc(match.league_country || '—')}</div></div>
            ${match.round ? `<div class="kv"><div class="k">Phase</div><div class="v">${esc(match.round)}</div></div>` : ''}
            ${match.surface ? `<div class="kv"><div class="k">Surface</div><div class="v">${esc(match.surface)}</div></div>` : ''}
          </div>
          <div>
            <div class="kv"><div class="k">Coup d'envoi</div><div class="v">${esc(fmtTime(match.date))}</div></div>
            <div class="kv"><div class="k">Lieu</div><div class="v">${esc(match.venue || '—')}${match.city ? ' · ' + esc(match.city) : ''}</div></div>
            ${match.attendance ? `<div class="kv"><div class="k">Spectateurs</div><div class="v">${esc(String(match.attendance))}</div></div>` : ''}
            ${match.broadcasts?.length ? `<div class="kv"><div class="k">Diffusion</div><div class="v">${match.broadcasts.map(esc).join(', ')}</div></div>` : ''}
          </div>
        </div>
      </div>
    `;

    // v30 — Handler "J'ai parié" retiré : Théo n'enregistre pas ses paris.

    // v31.7.4 — Modal détail mobile : sections collapsibles pour réduire le
    // scroll vertical (qui faisait jusqu'à 5400px sur foot top-5). Sur ≤720px,
    // chaque .section devient cliquable au niveau du h4, le contenu est masqué
    // par défaut sauf la première section (Notre pronostic).
    if (window.matchMedia('(max-width: 720px)').matches) {
      const sections = body.querySelectorAll('.section');
      sections.forEach((sec, idx) => {
        const h4 = sec.querySelector('h4');
        if (!h4) return;
        sec.classList.add('section-collapsible');
        // Premier section ouverte par défaut, autres fermées
        if (idx === 0) {
          sec.setAttribute('data-collapsed', 'false');
        } else {
          sec.setAttribute('data-collapsed', 'true');
        }
        // h4 devient le toggle
        h4.style.cursor = 'pointer';
        h4.setAttribute('role', 'button');
        h4.setAttribute('tabindex', '0');
        // Ajouter un chevron à droite
        if (!h4.querySelector('.section-chevron')) {
          const chev = document.createElement('span');
          chev.className = 'section-chevron';
          chev.setAttribute('aria-hidden', 'true');
          chev.textContent = '▾';
          chev.style.cssText = 'margin-left:auto;transition:transform .2s ease;font-size:14px;color:var(--text-dim);';
          h4.appendChild(chev);
        }
        const toggle = () => {
          const collapsed = sec.getAttribute('data-collapsed') === 'true';
          sec.setAttribute('data-collapsed', String(!collapsed));
        };
        h4.addEventListener('click', toggle);
        h4.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
        });
      });
    }

    const modal = document.getElementById('detail-modal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    // Move focus to the close button so keyboard users can dismiss via Enter/Space
    const closeBtn = document.getElementById('close-detail');
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  // ======= UI wiring =======
  // FIX bug #2 : helper bind() avec guard. Sans ça, si un id manque dans le
  // HTML (refonte topbar, A/B test mobile), le null.addEventListener tue
  // tout le script et les autres handlers (theme, hub, page-btn) ne sont
  // jamais attachés → app vide en blanc.
  function bind(id, ev, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(ev, fn);
    else console.warn(`[wiring] #${id} introuvable au boot — handler ${ev} ignoré`);
    return el;
  }
  bind('tabs', 'click', (e) => {
    const btn = e.target.closest('button[data-tab]'); if (!btn) return;
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b === btn));
    currentSport = btn.dataset.tab;
    activeFilter = 'all';
    render();
  });

  // v30 — Date nav : label "today-btn" devient contextuel (Hier / Aujourd'hui /
  // Demain / DD/MM) pour signaler clairement où on est. Click = retour à
  // aujourd'hui (utile quand on s'est éloigné de plusieurs jours).
  function _refreshDateNavLabel() {
    const btn = document.getElementById('today-btn');
    if (!btn) return;
    const t = todayISO();
    // currentDate est assigné plus tard dans l'init (ligne ~14729) ; pendant
    // le tout premier passage, il peut être undefined → on assume "today".
    if (!currentDate) { btn.textContent = 'Aujourd\'hui'; btn.title = 'Aujourd\'hui'; return; }
    // FIX bug #13 : calcul du diff en parsing ISO direct (jour/mois/année)
    // au lieu de subtraction Date — évite l'edge case DST où une journée
    // fait 23h ou 25h. addDays(t, n) === currentDate pour n in [-365, 365].
    let diff = NaN;
    if (typeof addDays === 'function') {
      // Cherche n tel que addDays(t, n) == currentDate, dans une fenêtre raisonnable
      for (let n = -365; n <= 365; n++) {
        if (addDays(t, n) === currentDate) { diff = n; break; }
      }
    }
    if (!isFinite(diff)) {
      // Fallback : approx via subtraction (cas où currentDate est >1 an)
      diff = Math.round((new Date(currentDate) - new Date(t)) / 86400000);
    }
    let lbl;
    if (!isFinite(diff)) lbl = 'Aujourd\'hui';
    else if (diff === 0) lbl = 'Aujourd\'hui';
    else if (diff === -1) lbl = 'Hier';
    else if (diff === 1) lbl = 'Demain';
    else if (diff === -2) lbl = 'Avant-hier';
    else if (diff === 2) lbl = 'Après-demain';
    else if (diff < 0) lbl = `J−${-diff}`;
    else lbl = `J+${diff}`;
    btn.textContent = lbl;
    // Subtle visual cue : when not on today, the button gets the brand color
    // so it's obvious it's a "jump back" affordance.
    if (diff === 0) {
      btn.style.color = '';
      btn.style.fontWeight = '500';
      btn.title = 'Aujourd\'hui';
    } else {
      btn.style.color = 'var(--brand)';
      btn.style.fontWeight = '700';
      btn.title = 'Cliquer pour revenir à aujourd\'hui';
    }
  }
  // FIX bug #2 : tous les handlers passent par bind() avec guard
  bind('date', 'change', (e) => { currentDate = e.target.value; _refreshDateNavLabel(); render(); });
  bind('prev-day', 'click', () => {
    currentDate = addDays(currentDate, -1);
    const d = document.getElementById('date'); if (d) d.value = currentDate;
    _refreshDateNavLabel(); render();
  });
  bind('next-day', 'click', () => {
    currentDate = addDays(currentDate, 1);
    const d = document.getElementById('date'); if (d) d.value = currentDate;
    _refreshDateNavLabel(); render();
  });
  bind('today-btn', 'click', () => {
    currentDate = todayISO();
    const d = document.getElementById('date'); if (d) d.value = currentDate;
    _refreshDateNavLabel(); render();
  });
  _refreshDateNavLabel();

  let searchTimer;
  bind('search', 'input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchTerm = e.target.value;
      render();
      renderSearchSuggest(searchTerm);
    }, 150);
  });
  bind('search', 'focus', (e) => {
    renderSearchSuggest(e.target.value);
  });
  // FIX bug #15 : clear le timer pendant qu'on quitte la page pour éviter
  // un re-render parasite si un setTimeout(150ms) tire entre user-typed et
  // unload. Bénin mais hygiène.
  window.addEventListener('beforeunload', () => clearTimeout(searchTimer));
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) {
      const box = document.getElementById('search-suggest');
      if (box) box.style.display = 'none';
    }
  });
  // v30 — Navigation clavier dans search-suggest : ↑/↓ pour naviguer,
  // Enter pour activer l'item highlighted, Esc pour fermer. Avant : seul
  // le clic souris fonctionnait, la page était inutilisable au clavier.
  (function _wireSearchKeyboard() {
    const search = document.getElementById('search');
    const box = document.getElementById('search-suggest');
    if (!search || !box) return;
    let cursorIdx = -1;
    const _highlight = () => {
      const items = box.querySelectorAll('.search-suggest-item');
      items.forEach((el, i) => {
        if (i === cursorIdx) {
          el.style.background = 'rgba(167,139,250,.15)';
          el.style.outline = '1px solid var(--brand)';
          el.scrollIntoView({ block: 'nearest' });
        } else {
          el.style.background = '';
          el.style.outline = '';
        }
      });
    };
    search.addEventListener('keydown', (e) => {
      if (box.style.display === 'none') return;
      const items = box.querySelectorAll('.search-suggest-item');
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        cursorIdx = (cursorIdx + 1) % items.length;
        _highlight();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        cursorIdx = cursorIdx <= 0 ? items.length - 1 : cursorIdx - 1;
        _highlight();
      } else if (e.key === 'Enter') {
        if (cursorIdx >= 0 && cursorIdx < items.length) {
          e.preventDefault();
          items[cursorIdx].click();
          cursorIdx = -1;
        }
      } else if (e.key === 'Escape') {
        box.style.display = 'none';
        cursorIdx = -1;
        search.blur();
      }
    });
    // Reset cursor when input changes
    search.addEventListener('input', () => { cursorIdx = -1; });
  })();

  // Chantier AA — Recherche globale avec autocomplete.
  // Indexe équipes, ligues, villes et pays depuis les matchs chargés.
  // Sur sélection, on filtre (render) ET on ouvre la fiche du match le plus
  // imminent si une équipe est cliquée.
  function buildSearchIndex() {
    const data = window.PRONOSTICS_DATA;
    if (!data || !data.days) return { items: [], byTeam: {} };
    const teams = new Map();    // name -> { name, logo, sport, nextMatchId, nextTs }
    const leagues = new Map();  // name -> { name, code, sport }
    const venues = new Map();   // city -> { name, sport }
    Object.values(data.days).forEach(arr => (arr || []).forEach(m => {
      const { home, away } = getSides(m);
      [home, away].forEach(s => {
        if (!s?.name) return;
        const k = s.name.toLowerCase();
        const ts = new Date(m.date).getTime();
        const existing = teams.get(k);
        if (!existing || ts < existing.nextTs) {
          teams.set(k, { name: s.name, logo: s.logo, sport: m.sport, nextMatchId: m.id, nextTs: ts });
        }
      });
      if (m.league_name) {
        const k = m.league_name.toLowerCase();
        if (!leagues.has(k)) leagues.set(k, { name: m.league_name, code: m.league_code, sport: m.sport });
      }
      const city = m.city || m.venue;
      if (city) {
        const k = city.toLowerCase();
        if (!venues.has(k)) venues.set(k, { name: city, sport: m.sport });
      }
    }));
    const items = [];
    teams.forEach(t => items.push({ kind: 'team', label: t.name, sub: t.sport, logo: t.logo, matchId: t.nextMatchId }));
    leagues.forEach(l => items.push({ kind: 'league', label: l.name, sub: l.sport }));
    venues.forEach(v => items.push({ kind: 'venue', label: v.name, sub: v.sport }));
    return { items };
  }
  const sportIconAA = (sp) => sp === 'football' ? '⚽' : sp === 'basketball' ? '🏀' : sp === 'tennis' ? '🎾' : sp === 'hockey' ? '🏒' : '🎯';
  const kindIcon = (k) => k === 'team' ? '👕' : k === 'league' ? '🏆' : '📍';
  function renderSearchSuggest(q) {
    const box = document.getElementById('search-suggest');
    if (!box) return;
    q = (q || '').trim().toLowerCase();
    if (q.length < 2) { box.style.display = 'none'; box.innerHTML = ''; return; }
    const idx = buildSearchIndex();
    const hits = idx.items
      .map(it => {
        const label = it.label.toLowerCase();
        let score;
        if (label === q) score = 0;
        else if (label.startsWith(q)) score = 1;
        else if (label.includes(' ' + q) || label.includes('-' + q)) score = 2;
        else if (label.includes(q)) score = 3;
        else score = 99;
        return { it, score };
      })
      .filter(x => x.score < 99)
      .sort((a, b) => a.score - b.score || a.it.label.length - b.it.label.length)
      .slice(0, 12);
    if (!hits.length) {
      box.innerHTML = `<div style="padding:12px 14px;color:var(--text-dim2,#7b8693);font-size:13px;">Aucun résultat pour « ${esc(q)} »</div>`;
      box.style.display = 'block';
      return;
    }
    box.innerHTML = hits.map((h, i) => {
      const it = h.it;
      const ico = it.kind === 'team' && it.logo
        ? `<img src="${esc(it.logo)}" alt="" loading="lazy" decoding="async" style="width:20px;height:20px;object-fit:contain;border-radius:3px;" onerror="this.style.display='none';this.nextElementSibling.style.display='inline';"><span style="display:none;">${kindIcon(it.kind)}</span>`
        : `<span>${kindIcon(it.kind)}</span>`;
      return `<div class="search-suggest-item" data-idx="${i}" data-kind="${esc(it.kind)}" data-label="${esc(it.label)}" ${it.matchId ? `data-match-id="${esc(it.matchId)}"` : ''} style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04);font-size:13px;">
        ${ico}
        <span style="flex:1;color:var(--text,#e6ebf2);font-weight:500;">${esc(it.label)}</span>
        <span style="color:var(--text-dim2,#7b8693);font-size:11px;">${sportIconAA(it.sub)} ${it.kind === 'team' ? 'équipe' : it.kind === 'league' ? 'tournoi' : 'ville'}</span>
      </div>`;
    }).join('');
    box.style.display = 'block';
    box.querySelectorAll('.search-suggest-item').forEach(el => {
      el.addEventListener('mouseenter', () => { el.style.background = 'rgba(255,255,255,.04)'; });
      el.addEventListener('mouseleave', () => { el.style.background = ''; });
      el.addEventListener('click', () => {
        const label = el.dataset.label;
        const kind = el.dataset.kind;
        const mid = el.dataset.matchId;
        const input = document.getElementById('search');
        input.value = label;
        searchTerm = label;
        render();
        box.style.display = 'none';
        // Si équipe et prochain match identifié, ouvre directement la fiche.
        if (kind === 'team' && mid) {
          const data = window.PRONOSTICS_DATA;
          let match = null;
          if (data && data.days) {
            Object.values(data.days).forEach(arr => (arr || []).forEach(m => {
              if (String(m.id) === String(mid)) match = m;
            }));
          }
          if (match && typeof openDetail === 'function') {
            setTimeout(() => openDetail(match), 80);
          }
        }
      });
    });
  }

  const closeDetailModal = () => {
    const m = document.getElementById('detail-modal');
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    // v30 — Si l'URL contient ?match=<id> (modale ouverte via lien partagé),
    // on nettoie le param au close pour que l'URL reflète l'état actuel.
    // Évite que l'utilisateur partage une URL "stale" qui s'auto-ouvrira
    // une modale au refresh.
    try {
      const url = new URL(location.href);
      if (url.searchParams.has('match')) {
        url.searchParams.delete('match');
        history.replaceState(null, '', url.pathname + (url.search ? url.search : '') + url.hash);
      }
    } catch(e) {}
  };
  // v30 — Expose openDetail / closeDetailModal sur window pour permettre
  // aux scripts séparés (enhancements v20 / restoreShared) d'y accéder.
  // Sans ça, ?match=<id> dans l'URL ne pouvait pas ouvrir la modale car
  // restoreShared vit dans un script tag différent (autre IIFE).
  window.openDetail = openDetail;
  window.closeDetailModal = closeDetailModal;
  document.getElementById('close-detail').addEventListener('click', closeDetailModal);
  document.getElementById('detail-modal').addEventListener('click', (e) => { if (e.target.id === 'detail-modal') closeDetailModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetailModal(); });
  // v30 — Share button sur la modale match. Construit un share URL avec
  // ?match=<id> qui pourrait être restauré au boot (futur), partage via
  // Web Share API natif (mobile) ou copy-to-clipboard (desktop).
  const shareDetailBtn = document.getElementById('share-detail');
  if (shareDetailBtn) shareDetailBtn.addEventListener('click', async () => {
    try {
      // Lit l'id du match courant via le data-* du title (set au openDetail)
      const titleEl = document.getElementById('detail-title');
      const matchId = titleEl?.dataset.matchId || '';
      const matchName = titleEl?.textContent || 'Match';
      const url = matchId
        ? `${location.origin}${location.pathname}?match=${encodeURIComponent(matchId)}`
        : location.href;
      const text = `Regarde ce match sur Paris-Sportif : ${matchName}`;
      if (navigator.share) {
        try {
          await navigator.share({ title: matchName, text, url });
          return;
        } catch (e) {
          if (e && e.name === 'AbortError') return;  // user cancelled
        }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        if (typeof toast === 'function') toast('✅ Lien copié dans le presse-papier', 'success');
      } else {
        try { prompt('Copie ce lien :', url); } catch (e) {}
      }
    } catch (e) { console.warn('share failed:', e); }
  });

  // ======= Auto-refresh =======
  // Polls data.js every 60s, merges fresh data into window.PRONOSTICS_DATA
  // and re-renders the current view. Shows a small banner while refreshing.
  let __refreshTimer = null;
  let __refreshInFlight = false;

  // Reads generated_at from current data and paints the indicator.
  // Site is fully auto: GitHub Actions cron = 5 min, client polls every 60 s.
  // Normal age therefore sits between 0–10 min. Only flag when something breaks:
  //   fresh (<12 min), stale (12–25 min), very-stale (>25 min → cron probably broken).
  function updateFreshness() {
    const ind = document.getElementById('refresh-indicator');
    if (!ind) return;
    const ga = window.PRONOSTICS_DATA && window.PRONOSTICS_DATA.generated_at;
    const txtEl = ind.querySelector('.rfr-txt');
    ind.classList.remove('stale', 'very-stale');
    if (!ga) {
      if (txtEl) txtEl.textContent = 'Données sans horodatage';
      ind.classList.add('stale');
      return;
    }
    const gen = new Date(ga);
    if (isNaN(gen)) return;
    const ageMin = Math.floor((Date.now() - gen.getTime()) / 60000);
    const hhmm = gen.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (ageMin < 0) {
      if (txtEl) txtEl.textContent = `🟢 À jour · ${hhmm} · auto`;
    } else if (ageMin < 2) {
      if (txtEl) txtEl.textContent = `🟢 À jour · ${hhmm} · auto`;
    } else if (ageMin < 15) {
      if (txtEl) txtEl.textContent = `🟢 À jour · ${hhmm} (il y a ${ageMin} min) · auto 5 min`;
    } else if (ageMin < 60) {
      // v30 — Seuil orange relevé de 25 à 60min : le cron tourne toutes les
      // 5min mais ne commit que quand data CHANGE (pas si journée tranquille).
      // Donc 30-50min sans changement c'est totalement normal, pas alarmant.
      ind.classList.add('stale');
      if (txtEl) txtEl.textContent = `🟠 Dernière maj: il y a ${ageMin} min · prochaine auto en cours`;
    } else {
      // Seuil rouge "obsolète" relevé de 25min à 60min — éviter l'alarmisme.
      ind.classList.add('very-stale');
      const label = ageMin < 120 ? `${ageMin} min` : `${Math.floor(ageMin/60)}h${String(ageMin%60).padStart(2,'0')}`;
      if (txtEl) {
        // v28.5 — bouton "forcer refresh" (unregister SW + clear caches + reload)
        //   souvent c'est juste le cache local qui ment, pas le cron
        txtEl.innerHTML = `🔴 Données obsolètes · ${label} · <a href="#" data-agent-force-refresh style="color:inherit;text-decoration:underline;margin-right:8px;">🔄 forcer refresh</a> · <a href="https://github.com/Harotensnor/paris-sportif/actions" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">cron</a>`;
        // Wire du bouton (idempotent)
        const btn = txtEl.querySelector('[data-agent-force-refresh]');
        if (btn && !btn._wired) {
          btn._wired = true;
          btn.addEventListener('click', async (e) => {
            e.preventDefault();
            btn.textContent = '⏳ refresh en cours...';
            try {
              if ('serviceWorker' in navigator) {
                const rs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(rs.map(r => r.unregister()));
              }
              if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
              }
            } catch(err) { console.warn('force refresh failed:', err); }
            _hardReload();
          });
        }
      }
    }
    // v30 #4 — Si au moins un match est LIVE, indiquer le mode polling
    // accéléré (30s au lieu de 60s). Petit badge à droite, non intrusif.
    try {
      const hasLive = (function(){
        const d = window.PRONOSTICS_DATA;
        if (!d || !d.days) return false;
        const todayIso = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
        return (d.days[todayIso] || []).some(m => m && m.status === 'STATUS_IN_PROGRESS' && !m.completed);
      })();
      if (hasLive && txtEl && !txtEl.innerHTML.includes('data-live-badge')) {
        const badge = ' · <span data-live-badge style="background:rgba(239,68,68,.18);color:#fca5a5;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:.4px;">🔴 LIVE · poll 30s</span>';
        txtEl.innerHTML = txtEl.innerHTML + badge;
      }
    } catch(e){}
  }

  // FIX bug #11 : `_hardReload()` est non-standard et déprécié — tous
  // les navigateurs modernes ignorent le booléen. Pour vraiment bypass cache,
  // on cache-bust via query string (?_=<timestamp>). Le serveur statique
  // ignore le param, mais le navigateur traite l'URL comme nouvelle ressource
  // et refait le fetch. Combiné avec le SW cache déjà delete au préalable
  // (cf force-refresh), on a une vraie fresh charge.
  // v30 — Modal custom pour saisie de mise (remplace prompt() qui ne
  // marche pas dans certains contextes : PWA installée, sandbox iframe,
  // browsers sécurisés). Async — retourne la valeur ou null si annulé.
  function _showStakePrompt(suggested = '1', label = 'Mise en € ?') {
    return new Promise((resolve) => {
      // Si modal existe déjà (rare double-click), le supprimer
      const existing = document.getElementById('__stake-prompt-modal');
      if (existing) existing.remove();
      const div = document.createElement('div');
      div.id = '__stake-prompt-modal';
      div.setAttribute('role', 'dialog');
      div.setAttribute('aria-modal', 'true');
      div.setAttribute('aria-labelledby', '__stake-prompt-title');
      div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);z-index:100002;display:flex;align-items:center;justify-content:center;padding:20px;';
      div.innerHTML = `
        <div style="background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:24px;width:min(360px,94vw);box-shadow:0 16px 48px rgba(0,0,0,.5);">
          <h3 id="__stake-prompt-title" style="margin:0 0 6px;font-size:16px;color:var(--text);font-weight:700;">💰 ${esc(label)}</h3>
          <div style="font-size:12px;color:var(--text-dim);margin-bottom:12px;">Mise suggérée par Kelly. Modifie si tu veux.</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:14px;">
            <input id="__stake-input" type="number" step="0.10" min="0.10" max="10000" value="${esc(suggested)}" autofocus style="flex:1;padding:10px 12px;background:var(--panel-2,rgba(255,255,255,.04));border:1px solid var(--border-2);color:var(--text);border-radius:8px;font-size:16px;font-variant-numeric:tabular-nums;">
            <span style="color:var(--text-dim);font-size:14px;">€</span>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:14px;">
            ${[1,2,5,10].map(v => `<button data-quick="${v}" type="button" style="flex:1;padding:6px 8px;background:var(--panel);border:1px solid var(--border-2);color:var(--text-dim);border-radius:5px;cursor:pointer;font-size:12px;font-weight:600;">${v}€</button>`).join('')}
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button id="__stake-cancel" type="button" style="padding:8px 14px;background:transparent;color:var(--text-dim);border:1px solid var(--border-2);border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">Annuler</button>
            <button id="__stake-ok" type="button" style="padding:8px 18px;background:var(--brand);color:#08080a;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;">Valider</button>
          </div>
        </div>`;
      document.body.appendChild(div);
      const input = div.querySelector('#__stake-input');
      const cleanup = (val) => { div.remove(); resolve(val); };
      div.querySelector('#__stake-ok').addEventListener('click', () => cleanup(input.value));
      div.querySelector('#__stake-cancel').addEventListener('click', () => cleanup(null));
      div.addEventListener('click', (e) => { if (e.target === div) cleanup(null); });
      div.querySelectorAll('[data-quick]').forEach(b => {
        b.addEventListener('click', () => { input.value = b.dataset.quick; input.focus(); });
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); cleanup(input.value); }
        if (e.key === 'Escape') { e.preventDefault(); cleanup(null); }
      });
      // Auto-focus + select all
      setTimeout(() => { try { input.focus(); input.select(); } catch(e){} }, 50);
    });
  }
  // Expose pour scripts séparés (enhancements v20 etc.)
  try { window._showStakePrompt = _showStakePrompt; } catch(e){}

  // v30 — Modal custom pour confirmation (remplace confirm() qui ne
  // marche pas en PWA installée etc.). Async — retourne true / false.
  // opts : { title, body, confirmLabel, cancelLabel, danger? }
  function _showConfirm(opts = {}) {
    const title = opts.title || 'Confirmer';
    const body = opts.body || '';
    const confirmLbl = opts.confirmLabel || 'OK';
    const cancelLbl = opts.cancelLabel || 'Annuler';
    const danger = !!opts.danger;
    return new Promise((resolve) => {
      const existing = document.getElementById('__confirm-modal');
      if (existing) existing.remove();
      const div = document.createElement('div');
      div.id = '__confirm-modal';
      div.setAttribute('role', 'dialog');
      div.setAttribute('aria-modal', 'true');
      div.setAttribute('aria-labelledby', '__confirm-title');
      div.setAttribute('aria-describedby', '__confirm-body');
      div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);z-index:100002;display:flex;align-items:center;justify-content:center;padding:20px;';
      div.innerHTML = `
        <div style="background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:24px;width:min(420px,94vw);box-shadow:0 16px 48px rgba(0,0,0,.5);">
          <h3 id="__confirm-title" style="margin:0 0 12px;font-size:16px;color:var(--text);font-weight:700;">${esc(title)}</h3>
          <div id="__confirm-body" style="font-size:13.5px;color:var(--text-2);line-height:1.55;margin-bottom:18px;">${body}</div>
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button id="__confirm-cancel" type="button" style="padding:8px 14px;background:transparent;color:var(--text-dim);border:1px solid var(--border-2);border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">${esc(cancelLbl)}</button>
            <button id="__confirm-ok" type="button" style="padding:8px 18px;background:${danger ? '#f87171' : 'var(--brand)'};color:${danger ? '#fff' : '#08080a'};border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;">${esc(confirmLbl)}</button>
          </div>
        </div>`;
      document.body.appendChild(div);
      const cleanup = (val) => { div.remove(); resolve(val); };
      div.querySelector('#__confirm-ok').addEventListener('click', () => cleanup(true));
      div.querySelector('#__confirm-cancel').addEventListener('click', () => cleanup(false));
      div.addEventListener('click', (e) => { if (e.target === div) cleanup(false); });
      const onKey = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); cleanup(true); document.removeEventListener('keydown', onKey); }
        if (e.key === 'Escape') { e.preventDefault(); cleanup(false); document.removeEventListener('keydown', onKey); }
      };
      document.addEventListener('keydown', onKey);
      // Focus le bouton confirm pour Enter quick
      setTimeout(() => { try { div.querySelector('#__confirm-ok').focus(); } catch(e){} }, 50);
    });
  }
  try { window._showConfirm = _showConfirm; } catch(e){}

  function _hardReload() {
    try {
      const u = new URL(location.href);
      u.searchParams.set('_', String(Date.now()));
      // Strip anchor pour éviter scroll surprise sur la nouvelle page
      u.hash = '';
      location.replace(u.toString());
    } catch(e) {
      location.reload();
    }
  }

  async function pollData() {
    if (__refreshInFlight) return;
    __refreshInFlight = true;
    const ind = document.getElementById('refresh-indicator');
    if (ind) ind.classList.add('refreshing');
    try {
      // v30 #3 — Lazy-load : poll fetch SEULEMENT data_today.json (~280 KB)
      // au lieu de data.js full (1.4 MB). 5× moins de bande passante par tick,
      // surtout en mode LIVE 30s où ça compte. data.js full reste fetched
      // une fois via _ensureFullData() (idle après boot ou avant Bilan/Backtest/Historique).
      // Fallback : si data_today.json indisponible (404 = ancien deploy), on
      // bascule sur data.js full pour ne pas casser la prod.
      let fresh = null;
      try {
        const [respToday, respMan] = await Promise.all([
          fetch(`data_today.json?t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`data_manifest.json?t=${Date.now()}`, { cache: 'no-store' }),
        ]);
        if (respToday.ok && respMan.ok) {
          const todayEvents = await respToday.json();
          const manifest = await respMan.json();
          const cur = window.PRONOSTICS_DATA || { days: {} };
          fresh = {
            ...cur,
            generated_at: manifest.generated_at,
            today: manifest.today,
            days: { ...(cur.days || {}), [manifest.today]: todayEvents },
            _available_days: manifest.days,
            _lite: cur._lite === false ? false : true,
          };
        }
      } catch(eFast) { /* fall through to legacy data.js */ }
      if (!fresh) {
        const url = `data.js?t=${Date.now()}`;
        const resp = await fetch(url, { cache: 'no-store' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const txt = await resp.text();
        const mm = txt.match(/window\.PRONOSTICS_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
        if (!mm) throw new Error('parse data.js failed');
        fresh = JSON.parse(mm[1]);
        fresh._lite = false;
      }
      {
        // v30 #4 — Snapshot des scores AVANT update pour détecter les
        // changements live. Stocké sur window pour que render() puisse
        // l'utiliser après mise à jour du DOM.
        const oldScores = {};
        try {
          const dOld = window.PRONOSTICS_DATA;
          if (dOld?.days) {
            Object.values(dOld.days).forEach(arr => {
              (arr || []).forEach(ev => {
                if (ev && ev.id && ev.status === 'STATUS_IN_PROGRESS') {
                  const home = (ev.competitors || []).find(c => c.home_away === 'home');
                  const away = (ev.competitors || []).find(c => c.home_away === 'away');
                  oldScores[ev.id] = {
                    home: home?.score ?? null,
                    away: away?.score ?? null,
                  };
                }
              });
            });
          }
        } catch(e){}
        window.PRONOSTICS_DATA = fresh;
        // Compare scores et marque les match IDs ayant changé pour flash post-render.
        const changedIds = new Set();
        try {
          if (fresh?.days) {
            Object.values(fresh.days).forEach(arr => {
              (arr || []).forEach(ev => {
                if (!ev || !ev.id) return;
                const prev = oldScores[ev.id];
                if (!prev) return;
                const home = (ev.competitors || []).find(c => c.home_away === 'home');
                const away = (ev.competitors || []).find(c => c.home_away === 'away');
                const newH = home?.score ?? null;
                const newA = away?.score ?? null;
                if (String(newH) !== String(prev.home) || String(newA) !== String(prev.away)) {
                  changedIds.add(String(ev.id));
                }
              });
            });
          }
        } catch(e){}
        // Le render() ci-dessous regénère le DOM ; on flash juste après.
        window.__pendingScoreFlash = changedIds;
        // v30 — Si la bannière "📡 Synchronisation…" est visible (boot
        // avec data stale), la retirer maintenant que fresh data arrive.
        const syncBanner = document.getElementById('__boot-sync-banner');
        if (syncBanner) {
          syncBanner.style.background = 'linear-gradient(90deg,#34d399 0%,#10b981 100%)';
          syncBanner.innerHTML = '✓ Données à jour';
          setTimeout(() => syncBanner.remove(), 1500);
        }
        // FIX #12 : odds_history.jsonl peut avoir reçu de nouveaux snapshots
        // (le pipeline re-snapshot toutes les 2h) → invalide le cache mémoire
        // pour que les sparklines reflètent les dernières mesures.
        if (typeof window._invalidateOddsHistoryCache === 'function') {
          window._invalidateOddsHistoryCache();
        }
        // v30 — Refresh health indicator après chaque data refresh (cohérence)
        if (typeof window._refreshHealthIndicator === 'function') {
          window._refreshHealthIndicator();
        }
        // v30 — Refresh footer last-update label
        if (typeof window._updateFooterLastUpdate === 'function') {
          window._updateFooterLastUpdate();
        }
        render();
        // v30 #4 — Applique le flash sur les scores qui viennent de changer.
        // Doit tourner APRÈS render() qui regénère les .match cards.
        try {
          const ids = window.__pendingScoreFlash;
          if (ids && ids.size) {
            ids.forEach(id => {
              const card = document.querySelector(`.match[data-id="${CSS.escape(id)}"]`);
              if (!card) return;
              card.querySelectorAll('.score').forEach(el => {
                el.classList.remove('score-flash');
                // force reflow pour pouvoir relancer l'animation si re-flash
                void el.offsetWidth;
                el.classList.add('score-flash');
                setTimeout(() => el.classList.remove('score-flash'), 1600);
              });
            });
            window.__pendingScoreFlash = null;
          }
        } catch(e){}
        updateFreshness();
        // v30 — Scan fresh data pour les picks edge ≥10% non encore notifiés.
        // Ne déclenche les notifs que si l'utilisateur a opt-in (Notification
        // permission accordée + toggle activé). Sans gesture utilisateur on ne
        // demande jamais — voir _maybeNotifyHighEdgePicks().
        // FIX bug #1 : la fonction est exposée sur window (sa déclaration vit
        // dans le callback DOMContentLoaded plus bas) — sinon ReferenceError ici.
        try {
          if (typeof window._maybeNotifyHighEdgePicks === 'function') {
            window._maybeNotifyHighEdgePicks();
          }
        } catch(e) { console.warn('[notif] failed:', e); }
      }
    } catch (err) {
      // v28.9 — Visible error feedback au lieu de silencieux
      if (ind) ind.classList.add('offline');
      const txtEl = ind && ind.querySelector('.rfr-txt');
      if (txtEl && !txtEl.dataset.errShown) {
        txtEl.dataset.errShown = '1';
        txtEl.innerHTML = `⚠️ Refresh impossible · ${esc(String(err.message || err).slice(0, 40))} · <a href="#" data-agent-force-refresh style="color:inherit;text-decoration:underline;">réessayer</a>`;
        const btn = txtEl.querySelector('[data-agent-force-refresh]');
        if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); _hardReload(); });
      }
      console.warn('[pollData] refresh failed:', err);
    } finally {
      __refreshInFlight = false;
      if (ind) ind.classList.remove('refreshing');
    }
  }
  // v30 — Expose pollData + predictMatch sur window pour le debug console
  // et pour permettre aux scripts séparés (enhancements v20) de les
  // utiliser. predictMatch est déjà appelé en plein de places, donc
  // sa visibilité explicite réduit la surface de bugs scope.
  try {
    window.pollData = pollData;
    window.predictMatch = predictMatch;
  } catch(e){}

  // v31.7.26 — Test API exposée pour Playwright unit tests. Permet d'asserter
  // sur les helpers purs (dixonColesTau, haversineKm, poissonPmf, etc.) sans
  // setup Jest ni bundler. Accessible via window.__testAPI dans les specs.
  // Le surcoût est <1KB et zero runtime impact (juste des refs à des fns
  // déjà allouées en mémoire).
  try {
    window.__testAPI = {
      _dixonColesTau,
      _dixonColesRho,
      _haversineKm,
      poissonPmf,
      poissonTopScores,
      isoDate,
    };
  } catch(e){}

  // v30 #3 — Lazy-load full history. PRONOSTICS_DATA inline n'a que today.
  // _ensureFullData() fetch data.js (1.4 MB) UNE SEULE FOIS et fusionne
  // tous les jours dans .days. Memoizé via une promise pour gérer les
  // appels concurrents (idle preload + click sur Bilan en même temps).
  let __fullDataPromise = null;
  async function _ensureFullData() {
    const cur = window.PRONOSTICS_DATA;
    if (cur && cur._lite === false) return cur;
    if (__fullDataPromise) return __fullDataPromise;
    __fullDataPromise = (async () => {
      try {
        const url = `data.js?t=${Date.now()}`;
        const resp = await fetch(url, { cache: 'no-store' });
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const txt = await resp.text();
        const m = txt.match(/window\.PRONOSTICS_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
        if (!m) throw new Error('parse data.js failed');
        const full = JSON.parse(m[1]);
        // Merge : keep today's events potentially plus récents (poll lite)
        // au-dessus des days du full (cas typique : full is up to 5min old,
        // today.json is up to 1min old). Standings et autres champs viennent du full.
        const curNow = window.PRONOSTICS_DATA || {};
        const todayKey = curNow.today || full.today;
        const mergedDays = { ...(full.days || {}), ...(curNow.days || {}) };
        if (todayKey && curNow.days && curNow.days[todayKey]) {
          mergedDays[todayKey] = curNow.days[todayKey];
        }
        window.PRONOSTICS_DATA = {
          ...full,
          ...curNow,
          days: mergedDays,
          _lite: false,
          _available_days: full.days ? Object.keys(full.days).sort() : [],
        };
        // Une page d'historique ouverte attend peut-être ces données.
        // Re-render si la page courante en bénéficie.
        try { if (typeof render === 'function') render(); } catch(e){}
        return window.PRONOSTICS_DATA;
      } catch (err) {
        // En cas d'échec, débloquer les futurs appels (retry possible).
        __fullDataPromise = null;
        throw err;
      }
    })();
    return __fullDataPromise;
  }
  try { window._ensureFullData = _ensureFullData; } catch(e){}

  // Auto-preload : 800ms après le 1er paint (idle), on charge le full data
  // en arrière-plan pour que la navigation Bilan/Backtest/Historique soit
  // instantanée. Si requestIdleCallback dispo on l'utilise (priorité basse).
  function _scheduleFullPreload() {
    const fire = () => { _ensureFullData().catch(() => {}); };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(fire, { timeout: 3000 });
    } else {
      setTimeout(fire, 800);
    }
  }
  if (document.readyState === 'complete') {
    _scheduleFullPreload();
  } else {
    window.addEventListener('load', _scheduleFullPreload, { once: true });
  }
  // v30 — Helper diagnostique pour la console.
  // Utilisation : window.__diag() — print state synthétique du site.
  // Utile pour debug rapide quand quelque chose semble bizarre.
  window.__diag = function() {
    const d = window.PRONOSTICS_DATA;
    const ageMin = d?.generated_at ? Math.round((Date.now() - new Date(d.generated_at).getTime()) / 60000) : null;
    const dayCount = d?.days ? Object.keys(d.days).length : 0;
    let totalEvents = 0, withWinamax = 0;
    if (d?.days) Object.values(d.days).forEach(arr => {
      (arr || []).forEach(m => {
        totalEvents++;
        if (m.winamax && m.winamax.available) withWinamax++;
      });
    });
    let prefs = {};
    try { prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}'); } catch(e){}
    let trackedCount = 0;
    try {
      const t = JSON.parse(localStorage.getItem('paris_sportif_tracked_bets') || '{}');
      trackedCount = Object.keys(t || {}).length;
    } catch(e){}
    let errCount = 0;
    try { errCount = (JSON.parse(localStorage.getItem('paris_sportif_js_errors_v1') || '[]') || []).length; } catch(e){}
    const out = {
      data: {
        generated_at: d?.generated_at || '?',
        age_min: ageMin,
        days: dayCount,
        events: totalEvents,
        winamax_available: withWinamax,
        is_stale: ageMin != null && ageMin > 240,
      },
      user: {
        currentPage: localStorage.getItem('currentPage') || '?',
        bankroll: parseFloat(localStorage.getItem('userBankroll') || '0') || 0,
        theme: prefs.theme || 'dark',
        notifsEnabled: !!prefs.pushNotifs,
        trackedBetsCount: trackedCount,
      },
      health: {
        sw_supported: 'serviceWorker' in navigator,
        sw_active: !!navigator.serviceWorker?.controller,
        notif_permission: 'Notification' in window ? Notification.permission : 'unsupported',
        js_errors_logged: errCount,
        backtest_loaded: !!window.__backtestReportV2,
        calibration_loaded: !!window.__modelCalibration,
      },
      cache_version: typeof CACHE_VERSION !== 'undefined' ? CACHE_VERSION : '?',
    };
    console.log('%c🔍 Paris-Sportif diag', 'color:#a78bfa;font-weight:700;font-size:14px;');
    console.table(out.data);
    console.table(out.user);
    console.table(out.health);
    return out;
  };

  // ===== Unified refresh tick =====
  // One timer to rule them all. Every 15 s we:
  //   • bump the freshness indicator (cheap)
  //   • re-render *only* time-sensitive bits ("dans 25 min" labels, live dots)
  // Every 60 s we additionally poll data.js.
  // Reloads for deploys happen only when the tab is hidden AND user is idle —
  // never while Théo is reading or typing. Also bail if the bankroll input has focus.
  let __lastUserInteraction = Date.now();
  ['mousemove','keydown','touchstart','click'].forEach(ev =>
    document.addEventListener(ev, () => { __lastUserInteraction = Date.now(); }, { passive: true })
  );
  // v30 #4 — Détecte si un match LIVE est en cours dans data.js. Utilisé
  // pour adapter la cadence de polling : 30s au lieu de 60s quand au moins
  // un match est in-progress (le user veut voir les scores bouger), 60s
  // sinon (économie batterie / réseau).
  function _hasLiveMatch() {
    try {
      const d = window.PRONOSTICS_DATA;
      if (!d || !d.days) return false;
      const todayIso = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
      const today = d.days[todayIso] || [];
      return today.some(m => m && m.status === 'STATUS_IN_PROGRESS' && !m.completed);
    } catch(e) { return false; }
  }
  function startAutoRefresh() {
    if (__refreshTimer) clearInterval(__refreshTimer);
    const tickMs = 15 * 1000;
    const reloadAfterMs = 60 * 60 * 1000;
    const idleAfterMs = 2 * 60 * 1000;
    const __bootTime = Date.now();
    // v30 #4 — Polling adaptive : 30s en mode live, 60s sinon.
    // Variable au lieu de const car ré-évaluée à chaque tick.
    // v30 — IMMEDIATE first poll at boot. Avant : la 1ère pollData ne
    // tirait qu'à T+60s, donc le user voyait la version cachée inline
    // (potentiellement plusieurs heures stale via SW cache) pendant 1
    // minute avant que les vraies fresh data arrivent. Maintenant on
    // poll dès le boot pour minimiser la fenêtre "version stale visible".
    let lastPoll = Date.now();
    // Si data inline détectée stale (>30min) au boot, afficher une
    // bannière visible "Synchronisation…" qui disparaît au refresh OK.
    try {
      const d = window.PRONOSTICS_DATA;
      const ageMs = d?.generated_at ? (Date.now() - new Date(d.generated_at).getTime()) : 0;
      if (ageMs > 30 * 60000) {
        const banner = document.createElement('div');
        banner.id = '__boot-sync-banner';
        banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99;padding:10px 16px;background:linear-gradient(90deg,rgba(167,139,250,.95) 0%,rgba(52,211,153,.85) 100%);color:#08080a;font-size:13px;font-weight:700;text-align:center;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 2px 12px rgba(0,0,0,.3);';
        banner.setAttribute('role', 'status');
        banner.setAttribute('aria-live', 'polite');
        banner.innerHTML = `
          <span style="display:inline-block;width:14px;height:14px;border:2px solid #08080a;border-top-color:transparent;border-radius:50%;animation:bsync-spin 0.8s linear infinite;"></span>
          📡 Synchronisation des dernières données… (la version affichée est en cache)
        `;
        // Inject keyframes once
        if (!document.getElementById('__boot-sync-style')) {
          const style = document.createElement('style');
          style.id = '__boot-sync-style';
          style.textContent = '@keyframes bsync-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
          document.head.appendChild(style);
        }
        document.body.appendChild(banner);
        // Auto-hide après 30s même si pollData ne réussit pas (évite que
        // la bannière reste indéfiniment si le serveur est down)
        setTimeout(() => banner.remove(), 30000);
      }
    } catch(e){}
    pollData();
    __refreshTimer = setInterval(() => {
      const now = Date.now();
      const tabHidden = document.visibilityState === 'hidden';
      // v30 #4 — Polling adaptive : 30s si match LIVE en cours, 60s sinon.
      // Réévalué à chaque tick (une nouvelle rencontre peut passer en LIVE
      // entre deux ticks). Cap à 30s pour éviter de marteler le serveur
      // (le cron côté serveur ne génère pas plus vite que 5min en pratique
      // mais snapshot_odds + fetch_live peuvent être plus fréquents).
      const pollEveryMs = _hasLiveMatch() ? 30 * 1000 : 60 * 1000;
      // When tab is hidden, don't burn CPU with rendering. Poll stays (cheap).
      // Data poll (every 60 s, ou 30s en mode live) — fires render() on success via the fresh data
      if (now - lastPoll >= pollEveryMs && !__refreshInFlight) {
        lastPoll = now;
        pollData();
      } else if (!tabHidden && !__refreshInFlight) {
        // Lightweight: re-render to refresh "dans 25 min" labels, live dots, etc.
        // Uses the cached predictions (same data.js ref → cache hit), so this is cheap.
        render();
        updateFreshness();
      } else if (tabHidden) {
        // Hidden tab: just keep the freshness indicator current without rendering.
        updateFreshness();
      }
      // Soft reload: only when hidden, idle ≥2 min, and no input has focus
      if (now - __bootTime > reloadAfterMs) {
        const idle = now - __lastUserInteraction > idleAfterMs;
        const hidden = document.visibilityState === 'hidden';
        const typing = document.activeElement && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
        if (hidden && idle && !typing) {
          try { location.reload(); } catch (e) {}
        }
      }
      // Chantier BBBB — rafraîchit le badge "alertes santé" dans la nav
      try { updateSanteBadge(); } catch (e) {}
    }, tickMs);
    // Paint freshness immediately on boot
    updateFreshness();
    try { updateSanteBadge(); } catch (e) {}
  }

  // Chantier 5 — Refresh silencieux quand l'onglet redevient actif (si data > 60s).
  //   Évite que l'utilisateur voie la pastille "stale" après un retour rapide.
  //   Si la data est fresh (< 60s), on ne poll pas (éviter bruit réseau inutile).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    try {
      const pd = window.PRONOSTICS_DATA;
      if (!pd || !pd.generated_at) { pollData(); return; }
      const ageSec = (Date.now() - new Date(pd.generated_at).getTime()) / 1000;
      if (ageSec > 60 && !__refreshInFlight) pollData();
    } catch (e) { /* fail-safe */ }
  });

  // Met à jour uniquement le compteur d'alertes dans la nav (warn + crit),
  // sans re-render la page Santé. Appelée toutes les 15 s.
  function updateSanteBadge() {
    if (typeof computeSiteHealth !== 'function') return;
    const h = computeSiteHealth();
    const n = h.checks.filter(c => c.status === 'warn' || c.status === 'crit').length;
    const critN = h.checks.filter(c => c.status === 'crit').length;
    const badge = document.getElementById('count-sante-alerts');
    if (!badge) return;
    badge.textContent = n;
    badge.style.display = n ? '' : 'none';
    badge.style.background = critN > 0 ? 'rgba(248,113,113,.25)' : 'rgba(234,179,8,.25)';
    badge.style.color = critN > 0 ? '#f87171' : '#eab308';
  }

  // v31.7.6 — renderValueFinder + valueWrap dispatcher retires (audit cleanup).
  // La page #value n'avait plus aucun lien dans la nav depuis v25+ (chantier E)
  // et son stub etait du code mort. Les anciens bookmarks /?page=value
  // tombent maintenant sur dashboard via le fallback de _pageFromHash().

  // ===================================================================
  // ====== REFONTE v21 — Pages Dashboard / Alertes / Académie /  ======
  // ====== Backtest / Profil + briefing auto + feed personnalisé  ======
  // ===================================================================

  // Helper : logo équipe via CDN api-sports (avec fallback SVG générique).
  function teamLogoUrl(team, sport) {
    if (!team) return '';
    // On ne peut pas vraiment mapper sans team_id, donc fallback SVG emoji sport.
    return '';
  }
  function sportEmoji(sport) {
    const m = { football:'⚽', tennis:'🎾', basketball:'🏀', hockey:'🏒', baseball:'⚾', rugby:'🏉', mma:'🥊', f1:'🏎️', esports:'🎮' };
    return m[String(sport||'').toLowerCase()] || '🏆';
  }
  function teamAvatarHtml(name, sport, size) {
    size = size || 32;
    const initials = String(name || '?').trim().split(/\s+/).slice(0,2).map(s => s[0] || '').join('').toUpperCase().slice(0,2) || '?';
    const hash = String(name || '').split('').reduce((h,c) => (h*31 + c.charCodeAt(0)) | 0, 0);
    const hue = Math.abs(hash) % 360;
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:hsl(${hue},60%,88%);color:hsl(${hue},55%,32%);display:inline-grid;place-items:center;font-size:${Math.round(size*0.38)}px;font-weight:700;letter-spacing:-.5px;border:1px solid rgba(0,0,0,.06);flex-shrink:0;">${esc(initials)}</div>`;
  }

  // ====== Briefing matinal / après-midi / soir (auto selon l'heure) ======
  function buildBriefing() {
    const data = window.PRONOSTICS_DATA;
    if (!data || !data.days) return { title: 'Briefing indisponible', emoji: '📭', lines: ['Données manquantes.'] };
    const now = new Date();
    const hour = now.getHours();
    const todayIso = now.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const today = (data.days[todayIso] || []).filter(m => m.winamax && m.winamax.available === true);

    let title, emoji, period;
    if (hour < 12) { title = 'Briefing matinal'; emoji = '☀️'; period = 'morning'; }
    else if (hour < 18) { title = 'Point journée'; emoji = '🌤️'; period = 'afternoon'; }
    else { title = 'Débrief du soir'; emoji = '🌙'; period = 'evening'; }

    const locks = [];
    const upcoming = [];
    const live = [];
    const settled = [];
    today.forEach(m => {
      try {
        const pred = predictMatch(m);
        if (!pred || pred.skip) return;
        const entry = { m, pred };
        if (m.completed) settled.push(entry);
        else if (m.live) live.push(entry);
        else upcoming.push(entry);
        if (pred.isLock) locks.push(entry);
      } catch (e) {}
    });

    const lines = [];
    if (period === 'morning') {
      lines.push(`🎯 <b>${locks.filter(e => !e.m.completed).length}</b> locks Winamax programmés aujourd'hui.`);
      if (upcoming.length) {
        const bestUp = upcoming.sort((a,b) => (b.pred.reliability||0) - (a.pred.reliability||0))[0];
        // FIX undefined-bug : m.home/m.away n'existent pas, passer par getSides
        const _s = (typeof getSides === 'function') ? getSides(bestUp.m) : { home: {}, away: {} };
        const _hN = _s.home?.name || '?', _aN = _s.away?.name || '?';
        lines.push(`⭐ Meilleur pick : <b>${esc(_hN)} vs ${esc(_aN)}</b> (${((bestUp.pred.reliability||0)*100).toFixed(0)}% fiab).`);
      }
      lines.push(`💡 Consulte le feed IA ci-dessous avant de miser.`);
    } else if (period === 'afternoon') {
      lines.push(`🔴 <b>${live.length}</b> match${live.length>1?'s':''} en cours · ⏭️ <b>${upcoming.length}</b> à venir.`);
      if (settled.length) {
        const wins = settled.filter(e => e.m.winner === e.pred.pick.key).length;
        lines.push(`📊 Déjà ${wins}/${settled.length} picks réglés cet aprem.`);
      }
    } else {
      if (settled.length) {
        const wins = settled.filter(e => e.m.winner === e.pred.pick.key).length;
        const rate = ((wins/settled.length)*100).toFixed(0);
        const emoji2 = wins >= settled.length*0.7 ? '🔥' : wins >= settled.length*0.5 ? '👌' : '😬';
        lines.push(`${emoji2} Bilan du jour : <b>${wins}/${settled.length}</b> locks (${rate}% WR).`);
      }
      lines.push(`😴 Demain : checke le briefing matinal dès 6h.`);
    }
    if (!lines.length) lines.push('Aucune activité à reporter pour cette période.');
    return { title, emoji, lines };
  }

  // ====== Feed IA personnalisé — cartes scrollables ======
  function buildPersonalFeed() {
    const items = [];
    const data = window.PRONOSTICS_DATA;
    if (!data || !data.days) return items;
    const now = Date.now();
    const todayIso = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const today = (data.days[todayIso] || []).filter(m => m.winamax && m.winamax.available === true);

    // 1. Nouveaux locks 🆕
    try {
      // FIX bug #9 : seenIds est sérialisé avec String(m.id) (cf l. 9371) →
      // pour comparer correctement il faut le même type au check, sinon
      // l'utilisateur reverra "🆕" sur des locks déjà vus si une source
      // change le type d'id (numérique vs string).
      const seenIds = new Set((JSON.parse(localStorage.getItem('seenLockIds') || '[]') || []).map(String));
      const newLocks = [];
      today.forEach(m => {
        try {
          const pred = predictMatch(m);
          if (pred && pred.isLock && !m.completed && !seenIds.has(String(m.id))) newLocks.push({ m, pred });
        } catch (e) {}
      });
      if (newLocks.length) {
        // FIX undefined-bug : m.home/m.away n'existent pas, passer par getSides
        const _bodyOf = (e) => {
          const s = (typeof getSides === 'function') ? getSides(e.m) : { home: {}, away: {} };
          const hN = s.home?.name || '?', aN = s.away?.name || '?';
          return `${esc(hN)} vs ${esc(aN)} (${((e.pred.reliability||0)*100).toFixed(0)}%)`;
        };
        items.push({
          kind: 'new-locks', priority: 10,
          icon: '🆕', title: `${newLocks.length} nouveau${newLocks.length>1?'x':''} lock${newLocks.length>1?'s':''}`,
          body: newLocks.slice(0,3).map(_bodyOf).join(' · '),
          action: 'locks', color: 'gold'
        });
      }
    } catch (e) {}

    // v30 — Streak user retiré : Théo n'enregistre pas ses paris.
    // La série du modèle (auto-trackée) reste affichée via _agentReplay().

    // 3. Top value du jour
    try {
      const withValue = today.map(m => {
        try {
          const pred = predictMatch(m);
          if (!pred || pred.skip || !pred.reliability || !pred.odds) return null;
          const pickKey = pred.pick.key;
          const odd = pickKey === '1' ? pred.odds.home : pickKey === '2' ? pred.odds.away : pred.odds.draw;
          if (!odd || odd <= 1.01) return null;
          const edge = (pred.reliability * odd) - 1;
          return { m, pred, odd, edge };
        } catch (e) { return null; }
      }).filter(Boolean).filter(x => !x.m.completed && x.edge > 0.05);
      if (withValue.length) {
        const top = withValue.sort((a,b) => b.edge - a.edge)[0];
        // FIX undefined-bug : m.home/m.away n'existent pas, passer par getSides
        const _s = (typeof getSides === 'function') ? getSides(top.m) : { home: {}, away: {} };
        const _hN = _s.home?.name || '?', _aN = _s.away?.name || '?';
        items.push({
          kind: 'value', priority: 7,
          icon: '💎', title: `Value détectée +${(top.edge*100).toFixed(0)}%`,
          body: `${esc(_hN)} vs ${esc(_aN)} · cote ${top.odd.toFixed(2)}`,
          action: 'top', color: 'purple'
        });
      }
    } catch (e) {}

    // 4. Matchs en cours
    try {
      const live = today.filter(m => m.live);
      if (live.length) {
        items.push({
          kind: 'live', priority: 9,
          icon: '🔴', title: `${live.length} match${live.length>1?'s':''} en cours`,
          body: live.slice(0,2).map(m => {
            const hC = m.competitors && m.competitors.find(c => c.home_away === 'home') || {};
            const aC = m.competitors && m.competitors.find(c => c.home_away === 'away') || {};
            return `${esc(hC.name || hC.short || '?')} vs ${esc(aC.name || aC.short || '?')}`;
          }).join(' · '),
          action: 'locks', color: 'red'
        });
      }
    } catch (e) {}

    // v30 — Pattern tip + Bankroll snapshot retirés : ils dépendaient des
    // paris trackés par l'utilisateur, qu'on n'enregistre plus.

    return items.sort((a,b) => b.priority - a.priority);
  }

  // ====== Page Dashboard (nouvelle home) ======
  // v28 — Multi-marché Winamax : pour chaque match, évalue 1N2 + O/U 2.5 + BTTS
  //       et choisit le marché avec le meilleur edge. Nécessite
  //       ev.winamax.markets (backend fetch_winamax_markets.py + patch_winamax_markets.py).
  //       Si absent → fallback sur 1N2 classique (backward-compatible).
  function _agentBestPick(m, pred) {
    if (!m || !pred) return null;
    const wxMk = (m.winamax && m.winamax.markets) || null;
    const candidates = [];
    // 1N2 — canal principal, toujours disponible quand pred.pick + pred.odds
    if (pred.pick && pred.odds) {
      const pk = pred.pick.key;
      const odd1n2 = pk==='1'?pred.odds.home : pk==='2'?pred.odds.away : pred.odds.draw;
      const rel1n2 = pred.reliability ?? pred.pick.prob;
      if (odd1n2 && odd1n2 > 1.01 && rel1n2 > 0) {
        // Si Winamax markets.1n2 existe, on prend leur cote (plus fiable que la moyenne ESPN)
        const wxOdd = wxMk && wxMk['1n2'] ? (pk==='1'?wxMk['1n2'].home : pk==='2'?wxMk['1n2'].away : wxMk['1n2'].draw) : null;
        const odd = wxOdd || odd1n2;
        candidates.push({ market: '1n2', pickKey: pk, side: null, rel: rel1n2, odd, edge: rel1n2 - 1/odd, label: pred.pick.label });
      }
    }
    // O/U 2.5 — uniquement foot avec pred.markets.ou + wx.markets.ou25
    if (pred.markets && pred.markets.ou && wxMk && wxMk.ou25) {
      const pick = pred.markets.ou;
      const odd = pick.side === 'over' ? wxMk.ou25.over : wxMk.ou25.under;
      const rel = pick.prob;
      if (odd && odd > 1.01 && rel > 0) {
        candidates.push({ market: 'ou25', pickKey: pick.key, side: pick.side, rel, odd, edge: rel - 1/odd, label: pick.label });
      }
    }
    // BTTS — uniquement foot avec pred.markets.btts + wx.markets.btts
    if (pred.markets && pred.markets.btts && wxMk && wxMk.btts) {
      const pick = pred.markets.btts;
      const odd = pick.side === 'yes' ? wxMk.btts.yes : wxMk.btts.no;
      const rel = pick.prob;
      if (odd && odd > 1.01 && rel > 0) {
        candidates.push({ market: 'btts', pickKey: pick.key, side: pick.side, rel, odd, edge: rel - 1/odd, label: pick.label });
      }
    }
    if (!candidates.length) return null;
    candidates.sort((a,b) => b.edge - a.edge);
    return candidates[0];
  }

  // v28 — Évaluateur multi-marché (pour le replay historique)
  function _evaluateBestPick(m, best) {
    if (!m || !best || !m.completed) return null;
    if (best.market === '1n2') {
      // Délégué à evaluateModelPick qui a déjà la logique 1N2 propre
      return evaluateModelPick(m, { pick: { key: best.pickKey }, isLock: false });
    }
    // Pour O/U + BTTS : lire les scores finaux depuis les competitors
    const sides = (typeof getSides === 'function') ? getSides(m) : null;
    if (!sides || !sides.home || !sides.away) return null;
    const hs = parseInt(sides.home.score, 10);
    const as = parseInt(sides.away.score, 10);
    if (isNaN(hs) || isNaN(as)) return null;
    if (best.market === 'ou25') {
      const total = hs + as;
      const over = total > 2.5;
      return ((over && best.side === 'over') || (!over && best.side === 'under')) ? 'won' : 'lost';
    }
    if (best.market === 'btts') {
      const btts = hs >= 1 && as >= 1;
      return ((btts && best.side === 'yes') || (!btts && best.side === 'no')) ? 'won' : 'lost';
    }
    return null;
  }

  // v27 — AGENT AUTONOME : le modèle parie sur tous ses picks Winamax non-skip
  //       avec Kelly 0.25× (cap 10% · plancher 0.10€), bankroll 10€ depuis J1.
  //       Le user observe, n'intervient pas. Remplace l'ancien dashboard user-centric.
  // v27.2 — Auto-tuning : règles d'exclusion détectées auto depuis l'historique
  //         (seuil confiance, sport, ligue sous-performants). Proposition + activation
  //         manuelle par le user. Stockage localStorage.
  function _loadAgentRules() {
    try { return JSON.parse(localStorage.getItem('agentRules') || '[]'); } catch(e) { return []; }
  }
  function _saveAgentRules(r) {
    try { localStorage.setItem('agentRules', JSON.stringify(r)); } catch(e) {}
  }
  function _loadAgentIgnored() {
    try { return JSON.parse(localStorage.getItem('agentRulesIgnored') || '[]'); } catch(e) { return []; }
  }
  function _saveAgentIgnored(r) {
    try { localStorage.setItem('agentRulesIgnored', JSON.stringify(r)); } catch(e) {}
  }
  function _applyAgentRules(pick) {
    // pick = { m, rel, odd, ... } — return true if a rule excludes it
    const rules = _loadAgentRules();
    for (const r of rules) {
      if (r.type === 'conf' && pick.rel < r.threshold) return true;
      if (r.type === 'sport' && pick.m.sport === r.sport) return true;
      if (r.type === 'league' && pick.m.league_name === r.league && pick.m.sport === r.sport) return true;
      // v28.3 — Règle cote extremes : si la cote est hors plage définie, skip
      if (r.type === 'odd-range' && (pick.odd < r.min || pick.odd > r.max)) return true;
    }
    return false;
  }

  // (v28.3 pause logic removed — user wants the model to never stop generating picks.
  //  Picks are now always computed, regardless of daily/weekly P&L. Risk controls
  //  remain via Kelly 0.25× + cap 10% + data-stale guard.)
  function _proposedRules(scorableRaw) {
    // Returns array of candidate rules that would have avoided loss buckets.
    // Conditions: min 10 paris in bucket, flat-1u ROI ≤ -5%
    if (!scorableRaw || !scorableRaw.length) return [];
    const MIN_SAMPLE = 10, ROI_THRESHOLD = -0.05;
    const active = _loadAgentRules();
    const ignored = _loadAgentIgnored();
    const activeIds = new Set(active.map(r => r.id));
    const ignoredIds = new Set(ignored);
    const out = [];
    // Confidence thresholds
    [0.55, 0.60, 0.65].forEach(th => {
      const hits = scorableRaw.filter(p => p.rel < th);
      if (hits.length < MIN_SAMPLE) return;
      const pl = hits.reduce((s, h) => s + (h.res === 'won' ? (h.odd - 1) : -1), 0);
      const roi = pl / hits.length;
      if (roi > ROI_THRESHOLD) return;
      const id = 'conf-lt-' + Math.round(th*100);
      if (activeIds.has(id) || ignoredIds.has(id)) return;
      const w = hits.filter(h => h.res === 'won').length;
      out.push({ id, type: 'conf', threshold: th, label: `Exclure les picks sous ${Math.round(th*100)}% de confiance`, sample: hits.length, wr: Math.round(100*w/hits.length), roi: roi*100, pl });
    });
    // Per sport
    const bySport = {};
    scorableRaw.forEach(p => (bySport[p.m.sport] = bySport[p.m.sport] || []).push(p));
    Object.entries(bySport).forEach(([sport, hits]) => {
      if (hits.length < MIN_SAMPLE) return;
      const pl = hits.reduce((s, h) => s + (h.res === 'won' ? (h.odd - 1) : -1), 0);
      const roi = pl / hits.length;
      if (roi > ROI_THRESHOLD) return;
      const id = 'sport-' + sport;
      if (activeIds.has(id) || ignoredIds.has(id)) return;
      const w = hits.filter(h => h.res === 'won').length;
      out.push({ id, type: 'sport', sport, label: `Exclure le sport ${sportLabel(sport)}`, sample: hits.length, wr: Math.round(100*w/hits.length), roi: roi*100, pl });
    });
    // v28.3 — Cote extremes : deux bucket pré-définis (cote trop basse / trop haute)
    [
      { id: 'odd-low', label: 'Exclure les cotes sous 1.20 (vig trop cher)', min: 1.20, max: 99, filter: p => p.odd < 1.20 },
      { id: 'odd-high', label: 'Exclure les cotes au-dessus de 5.00 (variance excessive)', min: 1.01, max: 5.00, filter: p => p.odd > 5.00 },
    ].forEach(b => {
      const hits = scorableRaw.filter(b.filter);
      if (hits.length < MIN_SAMPLE) return;
      const pl = hits.reduce((s, h) => s + (h.res === 'won' ? (h.odd - 1) : -1), 0);
      const roi = pl / hits.length;
      if (roi > ROI_THRESHOLD) return;
      if (activeIds.has(b.id) || ignoredIds.has(b.id)) return;
      const w = hits.filter(h => h.res === 'won').length;
      out.push({ id: b.id, type: 'odd-range', min: b.min, max: b.max, label: b.label, sample: hits.length, wr: Math.round(100*w/hits.length), roi: roi*100, pl });
    });

    // Per league (foot+)
    const byLg = {};
    scorableRaw.forEach(p => {
      if (!p.m.league_name) return;
      const k = p.m.league_name + '|' + p.m.sport;
      (byLg[k] = byLg[k] || { name: p.m.league_name, sport: p.m.sport, items: [] }).items.push(p);
    });
    Object.entries(byLg).forEach(([k, b]) => {
      if (b.items.length < MIN_SAMPLE) return;
      const pl = b.items.reduce((s, h) => s + (h.res === 'won' ? (h.odd - 1) : -1), 0);
      const roi = pl / b.items.length;
      if (roi > ROI_THRESHOLD) return;
      const id = 'league-' + k;
      if (activeIds.has(id) || ignoredIds.has(id)) return;
      const w = b.items.filter(h => h.res === 'won').length;
      out.push({ id, type: 'league', league: b.name, sport: b.sport, label: `Exclure ${esc(b.name)}`, sample: b.items.length, wr: Math.round(100*w/b.items.length), roi: roi*100, pl });
    });
    out.sort((a,b) => a.pl - b.pl);
    return out;
  }

  function _agentReplay() {
    const data = window.PRONOSTICS_DATA;
    const AGENT_START = 10, KELLY_FRAC = 0.25, CAP_PCT = 0.10, MIN_STAKE = 0.10;
    const resetTs = parseInt(localStorage.getItem('agentResetTs') || '0', 10) || 0;
    if (!data || !data.days) return { nav: AGENT_START, series: [], scorable: [], scorableRaw: [], ydayStats: null, perSport7d: {}, start: AGENT_START };
    const scorable = [];
    Object.entries(data.days).forEach(([dayIso, arr]) => {
      (arr || []).forEach(m => {
        if (!m.winamax || m.winamax.available !== true) return;
        if (!m.completed) return;
        try {
          const pred = predictMatch(m);
          if (!pred || !pred.pick || pred.skip) return;
          // v28 — meilleur marché (1N2 / O/U 2.5 / BTTS) selon edge
          const best = _agentBestPick(m, pred);
          if (!best) return;
          const res = _evaluateBestPick(m, best);
          if (res !== 'won' && res !== 'lost') return;
          const ts = new Date(m.date).getTime() || 0;
          if (resetTs && ts < resetTs) return;
          scorable.push({ m, pred, best, odd: best.odd, rel: best.rel, res, ts, dayIso });
        } catch (e) {}
      });
    });
    scorable.sort((a,b) => a.ts - b.ts);
    // v27.2 — Conserver le scorable brut (avant règles) pour analyse auto-tuning
    const scorableRaw = scorable.slice();
    let nav = AGENT_START;
    const series = [];
    const now = Date.now();
    const cut7 = now - 7*86400000;
    const yIso = new Date(now - 86400000).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const perSport7d = {};
    let ydayPl = 0, ydayWins = 0, ydayLosses = 0, ydayHighTotal = 0, ydayHighWins = 0, ydayLowLoss = 0, ydayTotal = 0;
    // v27.1 — Daily aggregate cap : max 20% de nav engagé par jour pour éviter
    // qu'une mauvaise journée tue la cagnotte quand il y a 20+ picks simultanés.
    const DAILY_CAP_PCT = 0.20;
    const dailyStakeAcc = {}; // ISO day → cumul des mises déjà placées ce jour-là
    scorable.forEach(s => {
      // v27.2 — Appliquer les règles auto-tuning actives avant tout
      if (_applyAgentRules(s)) { return; }
      // v27.1 FIX : si Kelly négatif/nul, on NE MISE PAS. Pas de plancher forcé.
      //          (ex: Thunder @1.05 vs rel 76% → implicite 95% → edge -19pt → skip).
      const k = (typeof kellyFraction === 'function') ? kellyFraction(s.rel, s.odd, KELLY_FRAC) : Math.max(0, ((s.rel * s.odd - 1) / Math.max(0.01, s.odd - 1)) * KELLY_FRAC);
      if (k <= 0) { return; } // pas d'edge → pas de mise
      // v27.3 — Divergence amplifiée : mise plus agressive quand l'edge est fort
      //         (le modèle diverge franchement du marché = vraie opportunité)
      const _edgeAbs = s.rel - 1/s.odd;
      let _ampl = 1;
      if (_edgeAbs > 0.20) _ampl = 1.6;
      else if (_edgeAbs > 0.15) _ampl = 1.4;
      else if (_edgeAbs > 0.10) _ampl = 1.2;
      let stake = nav * k * _ampl;
      const capAbs = nav * CAP_PCT;
      if (stake > capAbs) stake = capAbs;
      if (stake < MIN_STAKE) stake = MIN_STAKE;
      // v27.1 Daily aggregate cap
      const remainingDaily = Math.max(0, nav * DAILY_CAP_PCT - (dailyStakeAcc[s.dayIso] || 0));
      if (remainingDaily <= 0) { return; }
      if (stake > remainingDaily) stake = remainingDaily;
      if (stake < MIN_STAKE) { return; } // pas assez de marge restante dans la journée
      if (stake > nav) stake = nav;
      dailyStakeAcc[s.dayIso] = (dailyStakeAcc[s.dayIso] || 0) + stake;
      const pl = s.res === 'won' ? stake * (s.odd - 1) : -stake;
      nav += pl;
      series.push({ t: s.ts, nav, pl, stake, res: s.res, sport: s.m.sport, dayIso: s.dayIso, rel: s.rel, odd: s.odd, matchId: s.m.id });
      if (s.ts >= cut7) {
        const sb = perSport7d[s.m.sport] = perSport7d[s.m.sport] || { bets:0, w:0, l:0, pl:0, invested:0 };
        sb.bets++;
        sb.invested += stake;
        if (s.res === 'won') sb.w++; else sb.l++;
        sb.pl += pl;
      }
      if (s.dayIso === yIso) {
        ydayTotal++;
        ydayPl += pl;
        if (s.res === 'won') ydayWins++; else ydayLosses++;
        if (s.rel >= 0.70) { ydayHighTotal++; if (s.res==='won') ydayHighWins++; }
        if (s.rel < 0.60 && s.res === 'lost') ydayLowLoss++;
      }
    });
    const navPrev7 = (() => {
      if (!series.length) return AGENT_START;
      let v = AGENT_START;
      for (const p of series) { if (p.t > cut7) break; v = p.nav; }
      return v;
    })();
    return {
      nav, series, scorable, scorableRaw, start: AGENT_START, perSport7d,
      delta7: nav - navPrev7, deltaPct7: navPrev7 > 0 ? (nav - navPrev7) / navPrev7 * 100 : 0,
      ydayStats: ydayTotal > 0 ? { pl: ydayPl, wins: ydayWins, losses: ydayLosses, total: ydayTotal, highTotal: ydayHighTotal, highWins: ydayHighWins, lowLoss: ydayLowLoss } : null,
    };
  }

  function _agentLesson(ys) {
    if (!ys) return null;
    const wr = ys.total ? Math.round(100 * ys.wins / ys.total) : 0;
    const bits = [];
    if (ys.highTotal >= 3) {
      const hwr = Math.round(100 * ys.highWins / ys.highTotal);
      bits.push(`Les picks <strong>Très sûr 70%+</strong> sont tombés <strong>${ys.highWins}/${ys.highTotal}</strong> (${hwr}% WR) — ${hwr >= 70 ? 'continue à leur donner du poids' : 'attention, la confiance haute sous-performe'}`);
    }
    if (ys.lowLoss >= 2) {
      bits.push(`${ys.lowLoss} perte${ys.lowLoss>1?'s':''} sur des picks sous 60% confiance — <strong>envisager un seuil minimal</strong> pour filtrer le bruit`);
    }
    if (!bits.length) {
      if (ys.pl > 0) bits.push(`Journée positive de <strong>+${ys.pl.toFixed(2)}€</strong> avec ${wr}% de réussite — le modèle tient la ligne`);
      else if (ys.pl < 0) bits.push(`Journée à <strong>${ys.pl.toFixed(2)}€</strong> — pas de pattern évident, variance normale`);
      else bits.push(`Journée neutre, rien à retenir de particulier`);
    }
    return bits.join('. ') + '.';
  }

  function renderDashboardPage(wrap) {
    const data = window.PRONOSTICS_DATA;
    if (!data || !data.days) {
      wrap.innerHTML = '<div style="padding:60px;text-align:center;color:var(--text-dim);">Chargement…</div>';
      return;
    }
    const todayIso = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const now = new Date();
    const today = (data.days[todayIso] || []).filter(m => m.winamax && m.winamax.available === true);

    // Agent replay (cached per render)
    const agent = _agentReplay();
    const nav = agent.nav;
    const start = agent.start;
    const multiplier = start > 0 ? nav / start : 0;
    const firstTs = agent.series.length ? agent.series[0].t : now.getTime();
    const daysSinceStart = Math.max(1, Math.floor((now.getTime() - firstTs) / 86400000) + 1);
    const startDate = new Date(firstTs);
    const startDateStr = startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const deltaColor = agent.delta7 >= 0 ? 'var(--accent)' : 'var(--danger)';
    const deltaSign = agent.delta7 >= 0 ? '+' : '';

    // Sparkline — daily last-nav aggregation, last 60 days
    const byDay = {};
    agent.series.forEach(p => { byDay[new Date(p.t).toISOString().slice(0,10)] = p.nav; });
    const days = Object.keys(byDay).sort();
    const last60 = days.slice(-60);
    const sparkW = 400, sparkH = 48, padS = 4;
    const vals = last60.map(d => byDay[d]);
    const minV = vals.length ? Math.min(start, ...vals) * 0.95 : start * 0.95;
    const maxV = vals.length ? Math.max(start, ...vals) * 1.05 : start * 1.05;
    const denom = Math.max(0.01, maxV - minV);
    const pts = vals.map((v,i) => {
      const x = padS + (sparkW - 2*padS) * (i / Math.max(1, vals.length - 1));
      const y = sparkH - padS - (sparkH - 2*padS) * ((v - minV) / denom);
      return x.toFixed(1) + ',' + y.toFixed(1);
    });
    // Avec 0 ou 1 point, on dessine une ligne horizontale au niveau "start"
    // pour éviter une spark vide (SVG path `M x,y` seul = rien de visible).
    let sparkPath;
    if (pts.length >= 2) {
      sparkPath = 'M' + pts.join(' L');
    } else if (pts.length === 1) {
      const [x, y] = pts[0].split(',');
      sparkPath = `M${padS},${y} L${sparkW - padS},${y}`;
    } else {
      const y = (sparkH / 2).toFixed(1);
      sparkPath = `M${padS},${y} L${sparkW - padS},${y}`;
    }

    // v28.7 — CRITIQUE : si la data est obsolète (>4h), on ne montre PAS de picks.
    //   Sinon le site suggère de parier sur des matchs qui n'existent plus / ont déjà joué.
    //   Déclaration hissée ici (utilisée par les blocs ci-dessous avant l'auto-refresh).
    const _dataAgeMin = data.generated_at ? Math.floor((Date.now() - new Date(data.generated_at).getTime())/60000) : 9999;
    const _dataIsStale = _dataAgeMin > 240; // 4h

    // v27.1 — Positions du jour avec Kelly strict (skip si edge ≤0) + cap journalier 20%
    const KELLY_FRAC = 0.25, CAP_PCT = 0.10, MIN_STAKE = 0.10, DAILY_CAP_PCT = 0.20;
    const rawCandidates = [];
    // v28.8 — Si data obsolète (>4h), skip la génération de positions (évite de
    // recommander des matchs déjà joués). Pause stop-loss/take-profit supprimée
    // (le modèle ne s'arrête jamais sur demande utilisateur).
    if (_dataIsStale) {
      // pas de nouvelles positions (agent silencieux quand data pas fiable)
    } else
    today.forEach(m => {
      try {
        if (m.completed) return;
        const pred = predictMatch(m);
        if (!pred || !pred.pick || pred.skip) return;
        // v28 — meilleur marché selon edge
        const best = _agentBestPick(m, pred);
        if (!best) return;
        const rel = best.rel;
        const odd = best.odd;
        // v27.2 — appliquer les règles auto-tuning actives
        if (_applyAgentRules({ m, rel, odd })) return;
        const k = (typeof kellyFraction === 'function') ? kellyFraction(rel, odd, KELLY_FRAC) : Math.max(0, ((rel*odd-1)/Math.max(0.01, odd-1)) * KELLY_FRAC);
        if (k <= 0) return; // v27.1 — pas d'edge → pas de pari
        // v27.3 — Divergence amplifiée
        const _edgeLive = rel - 1/odd;
        let _amplLive = 1;
        if (_edgeLive > 0.20) _amplLive = 1.6;
        else if (_edgeLive > 0.15) _amplLive = 1.4;
        else if (_edgeLive > 0.10) _amplLive = 1.2;
        let stake = nav * k * _amplLive;
        const capAbs = nav * CAP_PCT;
        if (stake > capAbs) stake = capAbs;
        if (stake < MIN_STAKE) stake = MIN_STAKE;
        if (stake > nav) stake = nav;
        const ts = new Date(m.date).getTime();
        rawCandidates.push({ m, pred, best, odd, rel, stake, ts, isLive: !!m.live });
      } catch(e) {}
    });
    // v27.1 — Daily cap : tri par conf décroissant puis on rogne tant qu'on dépasse 20% de nav
    rawCandidates.sort((a,b) => b.rel - a.rel);
    const dailyBudget = nav * DAILY_CAP_PCT;
    const positions = [];
    let usedBudget = 0;
    for (const c of rawCandidates) {
      const remaining = dailyBudget - usedBudget;
      if (remaining < MIN_STAKE) break;
      let s = c.stake;
      if (s > remaining) s = remaining;
      if (s < MIN_STAKE) continue;
      usedBudget += s;
      positions.push({ ...c, stake: s, gain: s * (c.odd - 1) });
    }
    const totalStaked = usedBudget;

    // v28.10 — Vide si data stale (les perSport7d sont basés sur historique mais
    //   l'utilisateur pense voir des stats sur la semaine en cours. Mieux vaut rien.)
    const psArr = _dataIsStale ? [] : Object.entries(agent.perSport7d).sort((a,b) => b[1].bets - a[1].bets);

    // v28.2 — Sections inline : tous matchs du jour, combinés, buteurs foot
    // All today's Winamax matches (not in positions yet) — compact view
    // v28.3 — Filtres + tri : state dans localStorage
    const _agentFilter = (() => {
      try { return JSON.parse(localStorage.getItem('agentFilter') || '{}') || {}; } catch(e) { return {}; }
    })();
    const fSport  = _agentFilter.sport  || '';
    const fConf   = Number(_agentFilter.conf  || 0);
    const fEdge   = Number(_agentFilter.edge  || -100);
    const fSortBy = _agentFilter.sortBy || 'rel';
    const fSortDir = _agentFilter.sortDir === 'asc' ? 1 : -1;
    // v28.9 — Vide si data obsolète (pas d'affichage de matchs fantômes)
    const allTodayRaw = _dataIsStale ? [] : today.filter(m => !m.completed).map(m => {
      try {
        const pred = predictMatch(m);
        if (!pred || !pred.pick || pred.skip) return null;
        const best = _agentBestPick(m, pred);
        const pk = pred.pick.key;
        const odd = pred.odds && (pk==='1'?pred.odds.home:pk==='2'?pred.odds.away:pred.odds.draw);
        if (!odd) return null;
        const rel = pred.reliability ?? pred.pick.prob;
        const edge = best ? best.edge : (rel - 1/odd);
        const inPositions = positions.some(p => p.m.id === m.id);
        return { m, pred, best, odd, rel, edge, inPositions, ts: new Date(m.date).getTime() };
      } catch(e) { return null; }
    }).filter(Boolean);
    const sportsPresent = [...new Set(allTodayRaw.map(x => x.m.sport))];
    const allTodayMatches = allTodayRaw
      .filter(x => !fSport || x.m.sport === fSport)
      .filter(x => !fConf  || x.rel*100 >= fConf)
      .filter(x => !isFinite(fEdge) || x.edge*100 >= fEdge)
      .sort((a,b) => {
        const key = fSortBy;
        if (key === 'ts')  return fSortDir * (a.ts - b.ts);
        if (key === 'odd') return fSortDir * (b.odd - a.odd);
        if (key === 'edge') return fSortDir * (b.edge - a.edge);
        return fSortDir * (b.rel - a.rel);
      });

    // Combinés du jour : 3 combos selon buildCombines
    // v28.9 — vide si data obsolète (pas de combinés fantômes)
    let combinesPicks = [];
    if (!_dataIsStale) try {
      if (typeof buildCombines === 'function') {
        const combos = buildCombines(today, { minMinutes: 0, safeTarget: 3, balancedTarget: 4, boldTarget: 3 });
        if (combos && Array.isArray(combos)) combinesPicks = combos.slice(0, 3);
        else if (combos && typeof combos === 'object') combinesPicks = [combos.safe, combos.balanced, combos.bold].filter(Boolean);
      }
    } catch(e) { console.warn('combinés inline:', e); }

    // Buts du match : matches foot du jour avec OU 2.5 ou BTTS confiance élevée
    // (c'est un marché "total de buts" — pas "quel joueur marque").
    // v28.8 — Vide si data obsolète
    const butsDuMatch = _dataIsStale ? [] : today.filter(m => !m.completed && m.sport === 'football').map(m => {
      try {
        const pred = predictMatch(m);
        if (!pred || !pred.markets) return null;
        const ou = pred.markets.ou;
        const btts = pred.markets.btts;
        const bestSide = (ou && btts) ? (ou.prob >= btts.prob ? ou : btts) : (ou || btts);
        if (!bestSide || bestSide.prob < 0.60) return null;
        const { home, away } = (typeof getSides === 'function') ? getSides(m) : { home: {}, away: {} };
        return { m, home, away, pick: bestSide, prob: bestSide.prob, ts: new Date(m.date).getTime() };
      } catch(e) { return null; }
    }).filter(Boolean).sort((a,b) => b.prob - a.prob).slice(0, 6);
    // Alias pour compat ascendante du template (le nom de variable est utilisé plus bas)
    const buteursFoot = butsDuMatch;

    // === Prochaines opportunités par fenêtre de temps (4h/12h/24h) ===
    // Picks classés par confiance dans la fenêtre — utile pour "quoi parier maintenant ?".
    const nowMs = Date.now();
    const tomorrowIsoTW = (() => {
      const d = new Date(); d.setDate(d.getDate() + 1);
      return d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    })();
    const upcomingWin = _dataIsStale ? [] : [].concat(
      (data.days[todayIso] || []),
      (data.days[tomorrowIsoTW] || [])
    ).filter(m => !m.completed && !m.live && m.winamax && m.winamax.available === true).map(m => {
      try {
        const pred = predictMatch(m);
        if (!pred || !pred.pick || pred.skip) return null;
        const best = (typeof _agentBestPick === 'function') ? _agentBestPick(m, pred) : null;
        const pk = pred.pick.key;
        const odd = best ? best.odd : (pred.odds && (pk === '1' ? pred.odds.home : pk === '2' ? pred.odds.away : pred.odds.draw));
        if (!odd) return null;
        const rel = best ? best.rel : (pred.reliability ?? pred.pick.prob);
        const ts = new Date(m.date).getTime();
        if (!isFinite(ts) || ts < nowMs) return null;
        const edge = best ? best.edge : (rel - 1 / odd);
        return { m, pred, best, odd, rel, edge, ts };
      } catch (e) { return null; }
    }).filter(Boolean);
    // v30 — Fenêtres mutuellement exclusives + filtre edge>0 pour éviter les
    // doublons d'un match dans 4h/12h/24h ET les picks no-value (Sabalenka @1.02
    // sortait en "Top promo" parce que le tri était par confiance pure, sans
    // tenir compte du fait qu'à @1.02 le marché est plus optimiste que nous).
    const _topInWin = (hMin, hMax) => {
      const lo = nowMs + hMin * 3600 * 1000;
      const hi = nowMs + hMax * 3600 * 1000;
      return upcomingWin
        .filter(x => x.ts > lo && x.ts <= hi && x.edge > 0)
        .sort((a, b) => b.edge - a.edge)
        .slice(0, 3);
    };
    const topNext4h  = _topInWin(0, 4);
    const topNext12h = _topInWin(4, 12);
    const topNext24h = _topInWin(12, 24);

    // === Joueurs buteurs probables (prochaine 24h) ===
    // Utilise predictLikelyScorers (Poisson × position × lineup, exclut les blessés).
    const scorersToday = _dataIsStale ? [] : (() => {
      const arr = [];
      [].concat((data.days[todayIso] || []), (data.days[tomorrowIsoTW] || []))
        .forEach(m => {
          if (m.sport !== 'football' || m.completed) return;
          if (!(m.winamax && m.winamax.available === true)) return;
          const ts = new Date(m.date).getTime();
          if (!isFinite(ts) || ts < nowMs) return;
          try {
            const pred = predictMatch(m);
            if (!pred || pred.skip) return;
            if (typeof predictLikelyScorers !== 'function') return;
            const scorers = predictLikelyScorers(m, pred);
            if (!scorers || !scorers.length) return;
            const homeC = (m.competitors && m.competitors.find(c => c.home_away === 'home')) || {};
            const awayC = (m.competitors && m.competitors.find(c => c.home_away === 'away')) || {};
            scorers.slice(0, 2).forEach(s => {
              if (s.prob < 0.28) return;
              arr.push({
                name: s.name, captain: !!s.captain, pos: s.pos || '',
                prob: s.prob, impliedOdd: s.impliedOdd, teamName: s.teamName,
                homeName: homeC.name || '?', awayName: awayC.name || '?',
                ts, mId: m.id,
                url: m.winamax && m.winamax.url || null,
              });
            });
          } catch (e) { /* skip */ }
        });
      return arr.sort((a, b) => b.prob - a.prob).slice(0, 8);
    })();

    // v27.2 — Auto-tuning : règles proposées + actives
    const proposedRules = _proposedRules(agent.scorableRaw || []);
    const activeRules = _loadAgentRules();
    const ignoredCount = _loadAgentIgnored().length;
    const tuningBlockHtml = (proposedRules.length || activeRules.length) ? `
      <div style="padding:28px 0;border-top:1px solid var(--border);">
        <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:14px;">
          Auto-tuning du modèle${activeRules.length?` · ${activeRules.length} règle${activeRules.length>1?'s':''} active${activeRules.length>1?'s':''}`:''}${proposedRules.length?` · ${proposedRules.length} proposée${proposedRules.length>1?'s':''}`:''}
        </div>
        ${activeRules.length ? `
          <div style="margin-bottom:${proposedRules.length?14:0}px;">
            ${activeRules.map(r => `
              <div style="padding:12px 14px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.25);border-left:3px solid var(--accent);border-radius:0 8px 8px 0;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;gap:12px;">
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;color:var(--text);font-weight:600;"><span style="color:var(--accent);font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-right:6px;">ACTIVE</span>${esc(r.label)}</div>
                  <div style="font-size:11px;color:var(--text-dim);margin-top:3px;font-variant-numeric:tabular-nums;">Avant activation : ${r.sample||'—'} paris · ROI ${(r.roi||0).toFixed(0)}%</div>
                </div>
                <button data-rule-deactivate="${esc(r.id)}" style="padding:6px 12px;background:transparent;color:var(--text-dim);border:1px solid var(--border);border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;">Désactiver</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${proposedRules.length ? `
          ${!activeRules.length ? `<div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;line-height:1.5;">Le modèle a analysé son historique et a trouvé des règles qui auraient amélioré sa rentabilité. Active celles que tu veux lui imposer.</div>` : ''}
          ${proposedRules.slice(0, 4).map(r => `
            <div style="padding:12px 14px;background:var(--panel);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
              <div style="flex:1;min-width:220px;">
                <div style="font-size:13px;color:var(--text);font-weight:600;">${esc(r.label)}</div>
                <div style="font-size:11px;color:var(--text-dim);margin-top:3px;font-variant-numeric:tabular-nums;">${r.sample} paris · WR ${r.wr}% · ROI <span style="color:var(--danger);">${r.roi.toFixed(0)}%</span> · P&L ${r.pl.toFixed(2)}u</div>
              </div>
              <div style="display:flex;gap:6px;">
                <button data-rule-activate="${esc(r.id)}" style="padding:6px 14px;background:var(--brand);color:#08080a;border:none;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">Activer</button>
                <button data-rule-ignore="${esc(r.id)}" style="padding:6px 12px;background:transparent;color:var(--text-dim);border:1px solid var(--border);border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">Ignorer</button>
              </div>
            </div>
          `).join('')}
        ` : ''}
        ${ignoredCount > 0 ? `
          <div style="margin-top:10px;font-size:11px;color:var(--text-dim);cursor:pointer;" data-rule-reset-ignored>↻ ${ignoredCount} règle${ignoredCount>1?'s':''} ignorée${ignoredCount>1?'s':''} · tout ré-afficher</div>
        ` : ''}
      </div>
    ` : '';

    const positionRow = (p) => {
      const confColor = p.rel >= 0.70 ? 'var(--accent)' : p.rel >= 0.60 ? '#fbbf24' : '#fca5a5';
      // v28 — Label = marché choisi (best) avec indicateur visuel si non-1N2
      const pickLabel = (p.best && p.best.label) || p.pred.pick.label || 'Pick';
      const marketTag = p.best && p.best.market !== '1n2' ? ` <span style="font-size:9px;color:var(--brand);background:rgba(167,139,250,.15);padding:1px 5px;border-radius:3px;margin-left:4px;letter-spacing:.5px;text-transform:uppercase;">${p.best.market === 'ou25' ? 'O/U' : 'BTTS'}</span>` : '';
      const timeLbl = p.isLive ? `LIVE ${p.m.clock || ''}` : (typeof fmtTime === 'function' ? fmtTime(p.m.date) : new Date(p.m.date).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}));
      const timeBg = p.isLive ? 'rgba(52,211,153,.18)' : 'rgba(123,134,147,.15)';
      const timeColor = p.isLive ? 'var(--accent)' : 'var(--text-dim)';
      return `<div class="agent-pos-row agent-pos-grid" data-match-id="${esc(String(p.m.id||''))}" style="display:grid;grid-template-columns:56px 1fr 80px 72px 80px 90px;gap:12px;padding:10px 12px;background:var(--panel);border:1px solid var(--border);border-radius:8px;align-items:center;cursor:pointer;font-variant-numeric:tabular-nums;font-size:12.5px;transition:background .12s;">
        <div style="color:${confColor};font-weight:700;font-size:11.5px;">${Math.round(p.rel*100)}%</div>
        <div style="color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(pickLabel)}${marketTag}</div>
        <div style="color:var(--text-dim);">@${p.odd.toFixed(2)}</div>
        <div style="color:var(--brand);font-weight:700;">${p.stake.toFixed(2)}€</div>
        <div style="color:var(--accent);">+${p.gain.toFixed(2)}€</div>
        <div><span style="padding:2px 7px;background:${timeBg};color:${timeColor};border-radius:3px;font-size:10px;font-weight:700;letter-spacing:.4px;">${esc(timeLbl)}</span></div>
      </div>`;
    };

    const ys = agent.ydayStats;
    const lesson = _agentLesson(ys);
    const yPlColor = ys && ys.pl >= 0 ? 'var(--accent)' : 'var(--danger)';
    const ysWr = ys && ys.total ? Math.round(100 * ys.wins / ys.total) : 0;

    // v28.6 — "À PARIER AUJOURD'HUI" : top 3 meilleurs edges pour toi (pas l'agent)
    const userBankroll = (() => {
      const v = parseFloat(localStorage.getItem('userBankroll'));
      return (isFinite(v) && v > 0) ? v : 50;
    })();
    // v30 — AUTO force-refresh si data >2h obsolète (avant : 6h, trop tard).
    // Le flag autoRefreshDone est maintenant timestamped → re-tente après
    // 30min (avant : bloqué pour toute la session, donc le user qui ouvre
    // la page avec data 10h stale reste bloqué si la 1ère tentative a
    // foiré silencieusement).
    if (_dataAgeMin > 120) {
      const lastTry = parseInt(sessionStorage.getItem('autoRefreshDoneAt') || '0', 10);
      const ageMin = (Date.now() - lastTry) / 60000;
      if (!isFinite(ageMin) || ageMin > 30) {
        try {
          sessionStorage.setItem('autoRefreshDoneAt', String(Date.now()));
          console.log('[agent] Data >2h obsolète ('+_dataAgeMin+'min) → auto force-refresh');
          (async () => {
            try {
              if ('serviceWorker' in navigator) {
                const rs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(rs.map(r => r.unregister()));
              }
              if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
              }
            } catch(err) { console.warn('auto refresh failed:', err); }
            _hardReload();
          })();
        } catch(e) {}
      }
    }
    // v29 — Kickoff guard : exclude matches whose start time has passed even
    // if the data source hasn't flipped them to "live"/"completed" yet.
    // Avoids recommending picks on games already in progress.
    const _nowMs = Date.now();
    const _notStarted = (m) => {
      if (!m || !m.date) return true;
      const t = new Date(m.date).getTime();
      return isFinite(t) ? t > _nowMs : true;
    };
    // v30 — Sports en perte sur backtest_v2 : exclure des top picks pour éviter
    // la contradiction avec le bandeau "Sports en perte · skip recommandé".
    // Mêmes seuils que le bandeau (n>=3, ROI<-10%) + opt-out via Profil.
    const _losingSports = (() => {
      try {
        const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
        if (prefs.disableSportRoiAlerts === true) return new Set();
      } catch(e){}
      const rep = window.__backtestReportV2;
      if (!rep || !rep.by_sport) return new Set();
      return new Set(Object.entries(rep.by_sport)
        .filter(([s, d]) => d && d.n >= 3 && d.flat_roi_pct < -10)
        .map(([s]) => s));
    })();
    const topPicks = _dataIsStale ? [] : allTodayRaw
      .filter(x => !x.m.live && !x.m.completed && _notStarted(x.m) && x.edge > 0.05 && x.rel >= 0.55 && !_losingSports.has(x.m.sport))
      .sort((a, b) => b.edge - a.edge)
      .slice(0, 3)
      .map(x => {
        // v30 — Aligner odd/rel sur best (1n2 Winamax / OU / BTTS) pour que la
        // card affiche un trio cohérent : Cote, Conf et Edge calculés sur le
        // MÊME pari. Sinon edge=best mais odd=pred.odds (ESPN 1n2) → tooltip
        // "Edge = rel − 1/odd" devient mensonger.
        const xx = x.best ? { ...x, odd: x.best.odd, rel: x.best.rel, edge: x.best.edge } : x;
        // Kelly pour le bankroll perso : Kelly 0.25 cap 10% plancher 1€
        const k = (typeof kellyFraction === 'function') ? kellyFraction(xx.rel, xx.odd, 0.25) : Math.max(0, ((xx.rel*xx.odd-1)/Math.max(0.01, xx.odd-1)) * 0.25);
        let stake = userBankroll * k;
        const capAbs = userBankroll * 0.10;
        if (stake > capAbs) stake = capAbs;
        stake = Math.max(1, Math.round(stake)); // arrondi à l'euro entier — no centimes
        const gain = stake * (xx.odd - 1);
        const { home, away } = (typeof getSides === 'function') ? getSides(xx.m) : { home: {}, away: {} };
        return { ...xx, stake, gain, homeName: home?.name || '?', awayName: away?.name || '?', homeLogo: home?.logo || '', awayLogo: away?.logo || '' };
      });

    // v29 — Hero hook : show today's headline pick as the featured banner.
    // First-choice : best-edge topPick. Fallback : highest-confidence upcoming
    // pick so the banner is never empty when there IS something to play.
    let heroPick = topPicks[0] || null;
    if (!heroPick && !_dataIsStale) {
      const fallback = allTodayRaw
        .filter(x => !x.m.live && !x.m.completed && _notStarted(x.m) && x.rel >= 0.55)
        .sort((a, b) => b.rel - a.rel)[0];
      if (fallback) {
        // v30 — promouvoir best comme dans topPicks pour cohérence d'affichage
        const ff = fallback.best ? { ...fallback, odd: fallback.best.odd, rel: fallback.best.rel, edge: fallback.best.edge } : fallback;
        const { home, away } = (typeof getSides === 'function') ? getSides(ff.m) : { home: {}, away: {} };
        heroPick = { ...ff, homeName: home?.name || '?', awayName: away?.name || '?', homeLogo: home?.logo || '', awayLogo: away?.logo || '', _noEdge: true };
      }
    }
    const bestLeague = heroPick ? (heroPick.m.league_name || '') : '';
    wrap.innerHTML = `
      <div style="max-width:1100px;margin:0 auto;padding:0 20px;font-variant-numeric:tabular-nums;">

        <!-- v30 — Daily P&L chip retiré : Théo n'enregistre pas ses paris. -->

        <!-- v31.3 — Hero éditorial mobile-first (audit UX dashboard éditorial).
             Avant : H1 marketing + subtitle verbeux + heroPick card en colonne droite.
             Après : UNE SEULE promesse au-dessus du fold = TOP PICK clair, sans
             bruit visuel concurrent. Le visiteur sait en 3s : quel match, quelle
             cote, quelle confiance, 2 raisons, CTA Voir détail. -->
        ${heroPick ? (() => {
          const _reasons = heroPick.pred?.explain?.reasons || [];
          // Top 2 raisons non-marché pour donner du contexte sans saturer
          const _topReasons = _reasons.filter(r => r && r.type !== 'market').slice(0, 2);
          const _now = Date.now();
          const _kickoff = heroPick.m.date ? new Date(heroPick.m.date).getTime() : 0;
          const _minToKickoff = _kickoff > _now ? Math.round((_kickoff - _now) / 60000) : null;
          const _kickoffLabel = _minToKickoff == null
            ? (heroPick.m.date ? fmtTime(heroPick.m.date) : '')
            : _minToKickoff < 60 ? `dans ${_minToKickoff}min` : (_minToKickoff < 1440 ? `dans ${Math.round(_minToKickoff/60)}h` : fmtTime(heroPick.m.date));
          return `
          <article class="ed-hero" data-match-id="${esc(String(heroPick.m.id || ''))}" role="button" tabindex="0" aria-label="Top pick : ${esc(heroPick.homeName)} vs ${esc(heroPick.awayName)} — clic pour fiche détaillée">
            <header class="ed-hero__top">
              <span class="ed-hero__pill">⭐ Top pick du jour</span>
              <span class="ed-hero__refresh" aria-live="polite">
                <span class="ed-hero__dot" aria-hidden="true"></span>
                MAJ ${_dataAgeMin < 10 ? "à l'instant" : _dataAgeMin < 60 ? `il y a ${_dataAgeMin}min` : `il y a ${Math.floor(_dataAgeMin/60)}h`}
              </span>
            </header>
            <h1 class="ed-hero__match">${esc(heroPick.homeName)} <span class="ed-hero__vs">vs</span> ${esc(heroPick.awayName)}</h1>
            <p class="ed-hero__meta">${esc(bestLeague.slice(0,40))}${_kickoffLabel ? ` · <b>${esc(_kickoffLabel)}</b>` : ''}</p>
            <div class="ed-hero__stats" aria-label="Statistiques principales">
              <div class="ed-hero__stat">
                <span class="ed-hero__label">Pick</span>
                <strong class="ed-hero__pick-label">${esc((heroPick.best && heroPick.best.label) || heroPick.pred.pick.label || 'Pick')}</strong>
              </div>
              <div class="ed-hero__stat">
                <span class="ed-hero__label">Cote</span>
                <strong class="ed-hero__odd">@${heroPick.odd.toFixed(2)}</strong>
              </div>
              <div class="ed-hero__stat">
                <span class="ed-hero__label">Confiance</span>
                <strong class="ed-hero__conf">${Math.round(heroPick.rel*100)}%</strong>
              </div>
              ${heroPick._noEdge ? '' : `<div class="ed-hero__stat ed-hero__stat--edge">
                <span class="ed-hero__label">Edge</span>
                <strong class="ed-hero__edge">+${Math.round(heroPick.edge*100)}pt</strong>
              </div>`}
            </div>
            ${_topReasons.length ? `
              <div class="ed-hero__reasons" aria-label="Pourquoi ce pick">
                <div class="ed-hero__reasons-title">Pourquoi ce pick :</div>
                ${_topReasons.map(r => `<div class="ed-hero__reason"><span aria-hidden="true">${r.icon || '•'}</span> ${esc(r.text)}</div>`).join('')}
              </div>
            ` : ''}
            <footer class="ed-hero__cta">
              <span class="ed-hero__cta-btn">Voir le détail →</span>
              <button type="button" class="ed-hero__secondary page-btn" data-page="tous" onclick="event.stopPropagation();">Tous les pronos</button>
            </footer>
          </article>
          <details class="ed-hero__honesty">
            <summary>⚠️ Avertissement honnêteté <span class="ed-hero__honesty-hint">(clic pour développer)</span></summary>
            <div>
              Le modèle vise <strong>~60% de réussite</strong> sur le long terme (mesuré sur backtest). Sur le court terme, <strong>3 à 5 pertes consécutives sont normales</strong> et n'indiquent pas un dysfonctionnement. Reste sur Kelly fractionné, ne double pas la mise après une perte, accepte la variance. Les performances passées ne garantissent pas les futures. Ce site est un outil d'aide, pas une garantie. <a href="legal.html">Détails légaux</a> · <a href="methodologie.html#biais">Biais &amp; limites</a>
            </div>
          </details>` ;
        })() : `
          <article class="ed-hero ed-hero--empty">
            <header class="ed-hero__top">
              <span class="ed-hero__pill">⭐ Top pick du jour</span>
            </header>
            <p class="ed-hero__empty">
              Pas de match avec edge ≥ 5% et confiance ≥ 55% disponible aujourd'hui.
              Le modèle préfère ne rien recommander plutôt que de surfacer du bruit.
            </p>
            <footer class="ed-hero__cta">
              <button type="button" class="ed-hero__cta-btn page-btn" data-page="tous">Tous les pronos</button>
            </footer>
          </article>
        `}

        <!-- v31.7 — Streak banner + ROI alerts retirées (page Aujourd'hui
             surchargée selon retour user). La streak du modèle reste visible
             dans Bilan / Crédibilité ; les sports en perte sont visibles
             dans Crédibilité aussi. Le dashboard se recentre sur ce qui est
             actionable maintenant : top picks + 5 derniers + warning data. -->

        <!-- v30 — "Activité récente" retirée (dépendait des paris trackés
             que l'user n'enregistre pas). Le focus du dashboard est sur les
             pronos du modèle, pas sur le bilan personnel. -->
        ${(() => {
          // v30 — "5 derniers picks du modèle" remplace l'activité perso :
          // on liste les 5 dernières évaluations de l'agent (won/lost) avec
          // le résultat, l'edge et le P&L flat 1u — pour que l'user voie ce
          // que le modèle aurait fait sans rien tracker.
          if (_dataIsStale) return '';
          if (!agent || !Array.isArray(agent.scorableRaw) || agent.scorableRaw.length < 2) return '';
          const last5 = agent.scorableRaw.slice(-5).reverse();
          const fmtRel = (ts) => {
            if (!ts) return '—';
            const diff = Date.now() - ts;
            if (diff < 60000) return 'à l\'instant';
            if (diff < 3600000) return `il y a ${Math.round(diff/60000)} min`;
            if (diff < 24*3600000) return `il y a ${Math.round(diff/3600000)} h`;
            return `il y a ${Math.round(diff/(24*3600000))} j`;
          };
          const items = last5.map(s => {
            const won = s.res === 'won';
            const pl = won ? (s.odd - 1) : -1;
            const col = won ? '#34d399' : '#f87171';
            const ico = won ? '✓' : '✗';
            const sides = (typeof getSides === 'function') ? getSides(s.m) : { home: {}, away: {} };
            const teams = `${(sides.home && sides.home.short) || (sides.home && sides.home.name) || '?'} vs ${(sides.away && sides.away.short) || (sides.away && sides.away.name) || '?'}`.slice(0, 50);
            const pickLabel = ((s.best && s.best.label) || s.pred?.pick?.label || '').slice(0, 28);
            return `<div data-match-id="${esc(String(s.m.id || ''))}" class="agent-pos-row" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--border);font-size:12.5px;cursor:pointer;transition:background .12s;" onmouseover="this.style.background='rgba(255,255,255,.03)';" onmouseout="this.style.background='';">
              <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:${col}22;color:${col};font-weight:700;font-size:12px;flex-shrink:0;">${ico}</span>
              <div style="flex:1;min-width:0;line-height:1.3;">
                <div style="color:var(--text);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(teams)}</div>
                <div style="font-size:11px;color:var(--text-dim);">${pickLabel ? esc(pickLabel) + ' @ ' + s.odd.toFixed(2) + ' · ' : ''}${esc(fmtRel(s.ts))}</div>
              </div>
              <div style="color:${col};font-weight:700;font-variant-numeric:tabular-nums;flex-shrink:0;">${pl >= 0 ? '+' : ''}${pl.toFixed(2)}u</div>
            </div>`;
          }).join('');
          return `
            <div style="margin:14px 0 0;padding:0;background:var(--panel);border:1px solid var(--border);border-radius:10px;overflow:hidden;">
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--border);">
                <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.6px;font-weight:700;">🤖 5 derniers picks du modèle</div>
                <button class="page-btn" data-page="bilan" style="padding:4px 9px;background:transparent;color:var(--text-dim);border:1px solid var(--border-2);border-radius:5px;font-size:11px;font-weight:600;cursor:pointer;">Voir bilan</button>
              </div>
              ${items}
            </div>`;
        })()}

        <!-- v28.7 — Warning data obsolète : PRIORITAIRE sur tout le reste -->
        ${_dataIsStale ? `
        <div style="padding:24px;margin:24px 0;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.3);border-left:3px solid var(--danger);border-radius:0 10px 10px 0;">
          <div style="font-size:11px;color:var(--danger);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:6px;">⚠ Recommandations en pause</div>
          <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px;">Données obsolètes — je ne te donne pas de picks</div>
          <div style="font-size:13px;color:var(--text-dim);line-height:1.5;">La dernière mise à jour date de <strong>${_dataAgeMin < 120 ? _dataAgeMin+' min' : Math.floor(_dataAgeMin/60)+'h'}</strong>. Les matchs affichés pourraient être faux ou déjà joués. <strong>Clique sur "🔄 forcer refresh"</strong> dans le banner rouge en haut pour recharger les vraies données du jour.</div>
        </div>` : ''}

        <!-- v28.6 — "À PARIER AUJOURD'HUI" : reco perso pour Théo avec sa bankroll -->
        ${topPicks.length ? `
        <div style="padding:36px 0 24px;border-bottom:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
            <div>
              <div style="font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:4px;">Pour toi · À parier sur Winamax</div>
              <div style="font-size:28px;font-weight:800;letter-spacing:-0.8px;color:var(--text);line-height:1.1;">${topPicks.length === 1 ? 'La meilleure opportunité du jour' : `Les ${topPicks.length} meilleures opportunités du jour`}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-dim);">
              Ma cagnotte :
              <input type="number" id="user-bankroll-input" value="${userBankroll}" min="10" max="10000" step="10" style="width:72px;padding:4px 8px;background:var(--panel);border:1px solid var(--border);color:var(--text);border-radius:6px;font-size:12px;font-variant-numeric:tabular-nums;text-align:right;">€
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:10px;">
            ${topPicks.map(p => {
              const sIco = (typeof sportIcon === 'function') ? sportIcon(p.m.sport) : '';
              const edgeColor = p.edge > 0.15 ? 'var(--accent)' : p.edge > 0.10 ? '#fbbf24' : 'var(--text-dim)';
              const pickLabel = (p.best && p.best.label) || p.pred.pick.label || 'Pick';
              const tLbl = (typeof fmtTime === 'function') ? fmtTime(p.m.date) : new Date(p.m.date).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
              const url = (p.m.winamax && p.m.winamax.url) ? p.m.winamax.url : 'https://www.winamax.fr/paris-sportifs';
              const allReasons = (p.pred && p.pred.explain && p.pred.explain.reasons) || [];
              const cardId = `dpc-${esc(String(p.m.id))}`;
              // v30 — Match countdown : "dans X min" / "dans 2h" / "dans 1j 4h"
              const _countdownLabel = (() => {
                const ko = new Date(p.m.date).getTime();
                if (!isFinite(ko)) return '';
                const diffMs = ko - Date.now();
                if (diffMs < -60000) return 'commencé';
                if (diffMs < 60000) return 'maintenant';
                const min = Math.round(diffMs / 60000);
                if (min < 60) return `dans ${min} min`;
                const h = Math.floor(min / 60);
                const remM = min % 60;
                if (h < 24) return remM ? `dans ${h}h${String(remM).padStart(2,'0')}` : `dans ${h}h`;
                const d = Math.floor(h / 24);
                const remH = h % 24;
                return remH ? `dans ${d}j ${remH}h` : `dans ${d}j`;
              })();
              const _isStartingSoon = ko => {
                const ms = (new Date(p.m.date).getTime()) - Date.now();
                return ms < 60 * 60000 && ms > -60000;   // <60min away
              };
              // v30 — `imminent` (<30min) déclenche le pulse animation
              const _isImminent = (() => {
                const ms = (new Date(p.m.date).getTime()) - Date.now();
                return ms < 30 * 60000 && ms > -60000;
              })();
              const _countdownColor = _isStartingSoon() ? '#fbbf24' : 'var(--text-dim)';
              const _countdownBg = _isStartingSoon() ? 'rgba(251,191,36,.15)' : 'transparent';
              const _countdownBorder = _isStartingSoon() ? '1px solid rgba(251,191,36,.4)' : '1px solid var(--border-2)';
              return `<div class="dash-pick-card${_isImminent ? ' imminent' : ''}" id="${cardId}" data-match-id="${esc(String(p.m.id))}" data-match-date="${esc(String(p.m.date||''))}" data-odd="${p.odd}" role="button" tabindex="0" aria-label="Ouvrir la fiche match" style="padding:16px;background:var(--panel);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:0 10px 10px 0;cursor:pointer;transition:background .12s, transform .12s;"
                <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;gap:8px;">
                  <div style="font-size:10px;color:var(--text-dim);letter-spacing:.5px;text-transform:uppercase;">${sIco} ${esc((typeof sportLabel==='function')?sportLabel(p.m.sport):p.m.sport)}</div>
                  <div style="display:flex;gap:6px;align-items:baseline;font-size:10px;">
                    <span class="dpc-countdown" style="padding:2px 7px;border-radius:999px;color:${_countdownColor};background:${_countdownBg};border:${_countdownBorder};font-weight:600;letter-spacing:.2px;">${esc(_countdownLabel)}</span>
                    <span style="color:var(--text-dim);">${esc(tLbl)}</span>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--text);margin-bottom:3px;line-height:1.25;">
                  ${p.homeLogo ? `<img src="${esc(p.homeLogo)}" alt="" style="width:22px;height:22px;object-fit:contain;flex-shrink:0;" loading="lazy">` : ''}
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.homeName)}</span>
                  <span style="color:var(--text-dim);font-weight:400;">vs</span>
                  ${p.awayLogo ? `<img src="${esc(p.awayLogo)}" alt="" style="width:22px;height:22px;object-fit:contain;flex-shrink:0;" loading="lazy">` : ''}
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.awayName)}</span>
                </div>
                <div style="font-size:16px;color:var(--brand);font-weight:700;margin:10px 0 4px;">→ ${esc(pickLabel)}</div>
                ${(() => {
                  // v30 — Voix du modèle : 1 phrase courte, prend la 1ère reason
                  // non-marché (le modèle parle, pas le bookmaker).
                  const voice = (allReasons.find(r => r && r.type !== 'market') || {}).text;
                  return voice ? `<div style="margin:6px 0 8px;padding:6px 10px;background:rgba(167,139,250,.08);border-left:2px solid var(--brand);border-radius:0 4px 4px 0;font-size:11.5px;color:var(--text-dim);line-height:1.4;"><span style="color:var(--brand);font-weight:700;">🤖</span> ${esc(voice)}</div>` : '';
                })()}
                ${allReasons.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 10px;">
                  ${allReasons.slice(0, 3).map(r => `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:999px;font-size:10.5px;color:var(--text-dim);line-height:1.3;" title="${esc(r.text||'')}">${esc(r.icon||'')} ${esc((r.text||'').slice(0,42))}${(r.text||'').length>42?'…':''}</span>`).join('')}
                </div>` : ''}
                <div style="display:flex;justify-content:space-between;align-items:baseline;margin:10px 0;font-size:12px;">
                  <div><span style="color:var(--text-dim);">Cote</span> <strong style="color:var(--text);">@${p.odd.toFixed(2)}</strong></div>
                  <div><span style="color:var(--text-dim);border-bottom:1px dotted var(--text-dim);cursor:help;" title="Confiance du modèle : probabilité estimée que ce pari gagne. ≥70 % = très fiable.">Conf</span> <strong style="color:var(--text);">${Math.round(p.rel*100)}%</strong></div>
                  <div><span style="color:var(--text-dim);border-bottom:1px dotted var(--text-dim);cursor:help;" title="Edge = notre probabilité − probabilité implicite de la cote. > 0 = on est plus optimiste que le bookmaker (=valeur).">Edge</span> <strong style="color:${edgeColor};">+${Math.round(p.edge*100)}pt</strong></div>
                </div>
                <!-- v30 — Mise conseillée + ajusteur Kelly + bouton Winamax
                     retirés (user n'enregistre pas ses paris, ne mise pas
                     ici). Reste : signaux du modèle (toggle expand). -->
                ${allReasons.length ? `
                <button type="button" class="dpc-toggle" data-toggle-card="${cardId}" data-card="${cardId}" data-match-id="${esc(String(p.m.id || ''))}" data-pick-key="${esc(p.pred.pick.key || '')}" aria-expanded="false" style="width:100%;padding:8px 10px;margin-top:6px;margin-bottom:8px;background:transparent;border:1px dashed var(--border-2);color:var(--text-dim);border-radius:6px;font-size:11.5px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;font-weight:600;">
                  <span>🔍 Voir l'analyse complète · ${allReasons.length} raison${allReasons.length>1?'s':''}</span>
                  <span class="dpc-chev" style="transition:transform .2s;">▾</span>
                </button>
                <div class="dpc-expand" id="${cardId}-expand" style="display:none;padding:10px 12px;margin-bottom:6px;background:rgba(167,139,250,.04);border:1px solid rgba(167,139,250,.15);border-radius:8px;">
                  <div id="${cardId}-spark"></div>
                  <div style="font-size:10px;color:var(--brand);letter-spacing:.5px;text-transform:uppercase;font-weight:700;margin-bottom:6px;">📊 Tous les signaux (${allReasons.length})</div>
                  <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:5px;">
                    ${allReasons.map(r => `<li style="display:flex;align-items:flex-start;gap:6px;padding:4px 0;font-size:12px;color:var(--text);line-height:1.4;"><span style="flex-shrink:0;font-size:13px;">${esc(r.icon||'•')}</span><span>${esc(r.text||'')}</span></li>`).join('')}
                  </ul>
                </div>` : ''}
              </div>`;
            }).join('')}
          </div>
        </div>` : (_dataIsStale ? '' : `
        <!-- v30 — Empty state actionnable quand 0 prono passe les filtres prudents -->
        <div style="padding:36px 0 24px;border-bottom:1px solid var(--border);">
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:4px;">Pour toi · À parier sur Winamax</div>
            <div style="font-size:24px;font-weight:800;letter-spacing:-0.6px;color:var(--text);line-height:1.15;">Aucun prono ne franchit nos filtres prudents</div>
          </div>
          <div style="padding:18px 20px;background:rgba(148,163,184,.06);border:1px dashed var(--border-2);border-radius:12px;">
            <div style="font-size:13px;color:var(--text);line-height:1.55;">Le modèle exige <b>edge ≥ 5 %</b> et <b>confiance ≥ 55 %</b> pour recommander un pari. ${allTodayRaw.length ? `Aujourd'hui ${allTodayRaw.length} match${allTodayRaw.length>1?'s sont analysés':' est analysé'} mais aucun ne passe ces deux seuils — c'est <b>normal</b> certains jours, et c'est ce qui protège ta cagnotte.` : `Aucun match disponible aujourd'hui — les pronos repartiront automatiquement dès que des matchs entrent dans la fenêtre Winamax.`}</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;">
              <button class="page-btn" data-page="tous" style="padding:9px 14px;background:var(--brand);color:#08080a;border:none;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;box-shadow:0 4px 12px rgba(139,92,246,.3);">Voir tous les pronos →</button>
              <button class="page-btn" data-page="credibilite" style="padding:9px 14px;background:transparent;color:var(--text);border:1px solid var(--border-2);border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;">Pourquoi ces filtres ?</button>
            </div>
          </div>
        </div>`)}

        <!-- Prochaines opportunités par fenêtre (4h / 12h / 24h) -->
        ${(topNext4h.length + topNext12h.length + topNext24h.length) ? `
        <div style="padding:36px 0 24px;border-top:1px solid var(--border);">
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;">Prochaines opportunités</div>
            <div style="font-size:20px;font-weight:800;color:var(--text);letter-spacing:-.5px;margin-top:2px;">Top pronos à venir</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;">
            ${[
              ['Dans 0–4h', topNext4h, '#fbbf24'],
              ['Dans 4–12h', topNext12h, 'var(--brand)'],
              ['Dans 12–24h', topNext24h, 'var(--accent)'],
            ].map(([lbl, arr, col]) => {
              if (!arr.length) {
                return `<div style="padding:14px;background:var(--panel);border:1px solid var(--border);border-radius:10px;opacity:.6;">
                  <div style="font-size:10px;color:${col};letter-spacing:.6px;text-transform:uppercase;font-weight:700;">${esc(lbl)}</div>
                  <div style="font-size:12px;color:var(--text-dim);margin-top:8px;">Aucun pick qualifié dans cette fenêtre.</div>
                </div>`;
              }
              const picksHtml = arr.map(x => {
                const { home, away } = (typeof getSides === 'function') ? getSides(x.m) : { home: {}, away: {} };
                const hn = (home && home.name) || '?';
                const an = (away && away.name) || '?';
                const tLbl = (typeof fmtTime === 'function') ? fmtTime(x.m.date) : new Date(x.m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const confColor = x.rel >= 0.70 ? 'var(--accent)' : x.rel >= 0.60 ? '#fbbf24' : 'var(--text-dim)';
                return `<div class="agent-pos-row" data-match-id="${esc(String(x.m.id || ''))}" style="padding:8px 10px;border-radius:6px;cursor:pointer;font-size:12px;line-height:1.35;">
                  <div style="display:flex;justify-content:space-between;gap:6px;align-items:baseline;">
                    <div style="color:${confColor};font-weight:700;font-size:12.5px;">${Math.round(x.rel * 100)}%</div>
                    <div style="color:var(--text-dim);font-size:10.5px;font-variant-numeric:tabular-nums;">${esc(tLbl)}</div>
                  </div>
                  <div style="color:var(--text);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(x.pred.pick.label)}</div>
                  <div style="color:var(--text-dim);font-size:10.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(hn)} vs ${esc(an)} <span style="opacity:.8;">@${x.odd.toFixed(2)}</span></div>
                </div>`;
              }).join('');
              return `<div style="padding:14px;background:var(--panel);border:1px solid var(--border);border-top:3px solid ${col};border-radius:10px;">
                <div style="font-size:10px;color:${col};letter-spacing:.6px;text-transform:uppercase;font-weight:700;margin-bottom:8px;">${esc(lbl)} <span style="color:var(--text-dim);opacity:.7;">· ${arr.length}</span></div>
                <div style="display:flex;flex-direction:column;gap:4px;">${picksHtml}</div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- v28.2 — Section COMBINÉS inline (titre plus visible) -->
        ${combinesPicks.length ? `
        <div style="padding:28px 0;border-top:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
            <div>
              <div style="font-size:11px;color:#bf5af2;text-transform:uppercase;letter-spacing:1.4px;font-weight:700;">🎲 Combinés suggérés</div>
              <div style="font-size:18px;font-weight:800;color:var(--text);letter-spacing:-.4px;margin-top:2px;">${combinesPicks.length} combiné${combinesPicks.length > 1 ? 's' : ''} du jour</div>
            </div>
            <button class="page-btn" data-page="combines" style="padding:6px 14px;border:1px solid var(--border);background:var(--panel);color:var(--brand);border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">Voir tous les combinés →</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${combinesPicks.map((c, idx) => {
              const legs = (c.picks || c.legs || []).slice(0, 6);
              const totalOdd = legs.reduce((p, l) => p * (l.odd || 1), 1);
              const totalProb = legs.reduce((p, l) => p * (l.rel || l.prob || 0.5), 1);
              const title = c.label || c.name || (idx === 0 ? 'Combiné sûr' : idx === 1 ? 'Combiné équilibré' : 'Combiné audacieux');
              return `<div style="padding:14px 16px;background:var(--panel);border:1px solid var(--border);border-left:3px solid #bf5af2;border-radius:0 8px 8px 0;font-variant-numeric:tabular-nums;">
                <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
                  <div style="font-size:14px;font-weight:700;color:var(--text);">${esc(title)} <span style="color:var(--text-dim);font-weight:400;">· ${legs.length} match${legs.length>1?'s':''}</span></div>
                  <div style="font-size:16px;color:var(--accent);font-weight:800;">@${totalOdd.toFixed(2)}</div>
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--text-dim);">
                  ${legs.map(l => {
                    const matchName = l.m ? (l.m.name || `${(getSides(l.m).home||{}).name||''} vs ${(getSides(l.m).away||{}).name||''}`) : (l.matchName||'?');
                    const pickLabel = l.pred ? (l.pred.pick?.label||'Pick') : (l.pickLabel||'');
                    const legProb = (l.rel != null ? l.rel : (l.pred && l.pred.pick ? l.pred.pick.prob : (l.prob || 0))) * 100;
                    const legTime = l.m && l.m.date
                      ? (typeof fmtTime === 'function' ? fmtTime(l.m.date) : new Date(l.m.date).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}))
                      : '';
                    const confCol = legProb >= 70 ? 'var(--accent)' : legProb >= 55 ? '#fbbf24' : 'var(--text-dim)';
                    return `<div style="display:grid;grid-template-columns:44px 1fr auto auto;gap:8px;align-items:baseline;font-variant-numeric:tabular-nums;">
                      <span style="color:${confCol};font-weight:700;font-size:11.5px;">${Math.round(legProb)}%</span>
                      <span style="color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><span style="color:var(--text-dim);">${esc(matchName)}</span> — <b>${esc(pickLabel)}</b></span>
                      <span style="color:var(--text-dim2,#7b8693);font-size:11px;">${esc(legTime)}</span>
                      <span style="color:#a78bfa;font-weight:600;">@${(l.odd||0).toFixed(2)}</span>
                    </div>`;
                  }).join('')}
                </div>
                <div style="margin-top:10px;font-size:11px;color:var(--text-dim);">Proba combinée <b style="color:var(--text);">${(totalProb*100).toFixed(1)}%</b> · 10€ → <strong style="color:var(--accent);">${(totalOdd*10).toFixed(2)}€</strong> de gain potentiel</div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- v28.2 — Section BUTEURS foot inline -->
        ${buteursFoot.length ? `
        <div style="padding:28px 0;border-top:1px solid var(--border);">
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;">Buts dans le match · ${buteursFoot.length} pick${buteursFoot.length>1?'s':''}</div>
            <div style="font-size:11px;color:var(--text-dim);margin-top:2px;opacity:.75;">Marché Plus/Moins de 2.5 buts &amp; Les 2 équipes marquent (total de buts, pas quel joueur marque).</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${buteursFoot.map(b => {
              const hLbl = (b.home && b.home.name) || '?';
              const aLbl = (b.away && b.away.name) || '?';
              const pb = (b.prob*100).toFixed(0);
              const tLbl = (typeof fmtTime === 'function') ? fmtTime(b.m.date) : new Date(b.m.date).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
              return `<div class="agent-pos-row" data-match-id="${esc(String(b.m.id||''))}" style="display:grid;grid-template-columns:56px 1fr 1fr 60px;gap:12px;padding:10px 12px;background:var(--panel);border:1px solid var(--border);border-radius:8px;align-items:center;cursor:pointer;font-variant-numeric:tabular-nums;font-size:12.5px;">
                <div style="color:var(--brand);font-weight:700;font-size:11.5px;">${pb}%</div>
                <div style="color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(hLbl)} vs ${esc(aLbl)}</div>
                <div style="color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(b.pick.label)}</div>
                <div style="color:var(--text-dim);font-size:11px;text-align:right;">${esc(tLbl)}</div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- Joueurs buteurs probables (top 8 scorers next 24h) -->
        ${scorersToday.length ? `
        <div style="padding:28px 0;border-top:1px solid var(--border);">
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;">⚽ Joueurs buteurs probables</div>
            <div style="font-size:11px;color:var(--text-dim);margin-top:2px;opacity:.8;">Top ${scorersToday.length} joueurs avec la meilleure chance de marquer au moins 1 but (Poisson × position × compo, blessés exclus).</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            ${scorersToday.map(s => {
              const pb = (s.prob * 100).toFixed(0);
              const tLbl = (typeof fmtTime === 'function') ? fmtTime(s.ts) : new Date(s.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              const oddLbl = s.impliedOdd ? '@' + s.impliedOdd.toFixed(2) : '—';
              return `<div class="agent-pos-row" data-match-id="${esc(String(s.mId || ''))}" style="display:grid;grid-template-columns:56px 1fr auto auto auto;gap:12px;padding:10px 12px;background:var(--panel);border:1px solid var(--border);border-radius:8px;align-items:center;cursor:pointer;font-variant-numeric:tabular-nums;font-size:12.5px;">
                <div style="color:var(--accent);font-weight:700;font-size:11.5px;">${pb}%</div>
                <div style="color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                  <strong>${esc(s.name)}${s.captain ? ' ©' : ''}</strong>
                  <span style="color:var(--text-dim);opacity:.75;font-size:11px;margin-left:4px;">${esc(s.teamName)}${s.pos ? ' · ' + esc(s.pos) : ''}</span>
                </div>
                <div style="color:var(--text-dim);font-size:11px;opacity:.8;">vs</div>
                <div style="color:var(--text-dim);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;">${esc(s.homeName === s.teamName ? s.awayName : s.homeName)}</div>
                <div style="color:var(--text-dim);font-size:11px;text-align:right;white-space:nowrap;">${esc(oddLbl)} · ${esc(tLbl)}</div>
              </div>`;
            }).join('')}
          </div>
          <div style="margin-top:10px;font-size:11px;color:var(--text-dim);opacity:.75;">
            Marché Winamax : "<em>Buteur du match</em>" ou "<em>Premier buteur</em>" (selon le match).
          </div>
        </div>` : ''}

        <!-- v28.2 — Section TOUS LES MATCHS WINAMAX du jour inline -->
        ${allTodayRaw.length ? `
        <div id="agent-all-matches" style="padding:28px 0;border-top:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;">Tous les matchs Winamax du jour · ${allTodayMatches.length}${allTodayMatches.length !== allTodayRaw.length ? ` <span style="color:var(--text-dim);opacity:.6;">sur ${allTodayRaw.length}</span>` : ''}</div>
            ${(fSport || fConf > 0 || fEdge > -100) ? `<button data-agent-filter-reset style="background:transparent;border:1px solid var(--border);color:var(--text-dim);padding:3px 10px;border-radius:5px;font-size:11px;cursor:pointer;">× reset filtres</button>` : ''}
          </div>
          <!-- v28.3 filter bar -->
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;font-size:11px;">
            <select data-agent-filter="sport" style="background:var(--panel);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:5px;font-size:11px;">
              <option value="" ${!fSport?'selected':''}>Tous sports</option>
              ${sportsPresent.map(sp => `<option value="${esc(sp)}" ${fSport===sp?'selected':''}>${esc((typeof sportLabel==='function')?sportLabel(sp):sp)}</option>`).join('')}
            </select>
            <select data-agent-filter="conf" style="background:var(--panel);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:5px;font-size:11px;">
              <option value="0" ${fConf===0?'selected':''}>Conf. min</option>
              <option value="50" ${fConf===50?'selected':''}>≥ 50%</option>
              <option value="60" ${fConf===60?'selected':''}>≥ 60%</option>
              <option value="70" ${fConf===70?'selected':''}>≥ 70%</option>
              <option value="80" ${fConf===80?'selected':''}>≥ 80%</option>
            </select>
            <select data-agent-filter="edge" style="background:var(--panel);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:5px;font-size:11px;">
              <option value="-100" ${fEdge===-100?'selected':''}>Edge min</option>
              <option value="0" ${fEdge===0?'selected':''}>≥ 0pt</option>
              <option value="5" ${fEdge===5?'selected':''}>≥ 5pt</option>
              <option value="10" ${fEdge===10?'selected':''}>≥ 10pt</option>
              <option value="15" ${fEdge===15?'selected':''}>≥ 15pt</option>
            </select>
          </div>
          <!-- v28.3 column headers (sortable) -->
          <div style="display:grid;grid-template-columns:20px 24px 1fr 110px 60px 70px 50px;gap:8px;padding:4px 10px;font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:var(--text-dim);font-weight:700;">
            <div></div><div></div><div>Match</div><div>Pick</div>
            <div data-agent-sort="rel" style="cursor:pointer;${fSortBy==='rel'?'color:var(--brand);':''}">Conf${fSortBy==='rel'?(fSortDir>0?' ▾':' ▴'):''}</div>
            <div data-agent-sort="edge" style="cursor:pointer;${fSortBy==='edge'?'color:var(--brand);':''}">Edge${fSortBy==='edge'?(fSortDir>0?' ▾':' ▴'):''}</div>
            <div data-agent-sort="ts" style="cursor:pointer;text-align:right;${fSortBy==='ts'?'color:var(--brand);':''}">Heure${fSortBy==='ts'?(fSortDir>0?' ▾':' ▴'):''}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:3px;font-variant-numeric:tabular-nums;font-size:12px;">
            ${allTodayMatches.slice(0, 30).map(x => {
              const { home, away } = (typeof getSides === 'function') ? getSides(x.m) : { home: {}, away: {} };
              const hn = (home && home.name) || '?';
              const an = (away && away.name) || '?';
              const confColor = x.rel >= 0.70 ? 'var(--accent)' : x.rel >= 0.60 ? '#fbbf24' : x.rel >= 0.50 ? 'var(--text-dim)' : '#fca5a5';
              const edgeColor = x.edge > 0.05 ? 'var(--accent)' : x.edge > 0 ? 'var(--text-dim)' : 'var(--danger)';
              const edgePct = (x.edge*100).toFixed(0);
              const tLbl = (typeof fmtTime === 'function') ? fmtTime(x.m.date) : new Date(x.m.date).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
              const sportIco = (typeof sportIcon === 'function') ? sportIcon(x.m.sport) : '';
              const betMarker = x.inPositions ? '<span style="color:var(--brand);font-weight:700;margin-right:4px;" title="Le modèle mise sur ce match">●</span>' : '<span style="margin-right:4px;">○</span>';
              return `<div class="agent-pos-row" data-match-id="${esc(String(x.m.id||''))}" style="display:grid;grid-template-columns:20px 24px 1fr 110px 60px 70px 50px;gap:8px;padding:6px 10px;background:transparent;border:1px solid transparent;border-radius:6px;align-items:center;cursor:pointer;color:var(--text);">
                <div>${betMarker}</div>
                <div style="color:var(--text-dim);font-size:13px;">${sportIco}</div>
                <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(hn)} <span style="color:var(--text-dim);">vs</span> ${esc(an)}</div>
                <div style="color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(x.pred.pick.label)}</div>
                <div style="color:${confColor};font-weight:700;">${(x.rel*100).toFixed(0)}%</div>
                <div style="color:${edgeColor};">${x.edge>=0?'+':''}${edgePct}pt</div>
                <div style="color:var(--text-dim);font-size:11px;text-align:right;">${esc(tLbl)}</div>
              </div>`;
            }).join('')}
            ${allTodayMatches.length > 30 ? `<div style="padding:8px;text-align:center;color:var(--text-dim);font-size:11px;">+ ${allTodayMatches.length - 30} autres matchs non affichés</div>` : ''}
          </div>
        </div>` : ''}

        <!-- Séparateur : les sections suivantes concernent le MODÈLE interne -->
        <div style="padding:36px 0 12px;border-top:1px solid var(--border);margin-top:12px;">
          <div style="font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1.8px;font-weight:700;opacity:.7;">— Le modèle en chiffres —</div>
          <div style="font-size:11px;color:var(--text-dim);margin-top:4px;opacity:.7;">Validation interne, historique et calibration. Les picks pour toi sont ci-dessus.</div>
        </div>

        <div style="padding:20px 0 24px;">
          <div style="font-size:11px;color:var(--brand);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:10px;">Cagnotte du modèle</div>
          <div style="display:flex;align-items:baseline;gap:14px;margin-bottom:6px;flex-wrap:wrap;">
            <div style="font-size:40px;font-weight:800;letter-spacing:-1.5px;line-height:1;color:var(--text);">${nav.toFixed(2)}€</div>
            ${agent.series.length ? `<div style="font-size:18px;color:${deltaColor};font-weight:700;">${deltaSign}${agent.deltaPct7.toFixed(1)}%</div>
            <div style="font-size:13px;color:var(--text-dim);">sur 7 jours</div>` : ''}
          </div>
          <div style="font-size:13px;color:var(--text-dim);margin-bottom:18px;max-width:620px;line-height:1.5;">
            ${agent.series.length
              ? `Parti de <strong style="color:var(--text);">${start.toFixed(0)}€ le ${esc(startDateStr)}</strong> — multipliée par <strong style="color:${multiplier>=1?'var(--accent)':'var(--danger)'};">${multiplier.toFixed(2)}×</strong> en ${daysSinceStart} jours. <strong style="color:var(--text);">${agent.series.length}</strong> paris joués · Kelly 0.25× · cap 10% · plancher 0.10€.`
              : `En attente des premiers matchs réglés pour démarrer.`}
          </div>
          ${sparkPath ? `<div style="height:64px;background:var(--panel);border-radius:8px;border:1px solid var(--border);padding:8px 12px;">
            <svg viewBox="0 0 ${sparkW} ${sparkH}" style="width:100%;height:48px;display:block;" preserveAspectRatio="none">
              <path d="${sparkPath}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
            </svg>
          </div>` : ''}
        </div>

        <div style="padding:28px 0;border-top:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;">
            <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;">Positions du jour · ${positions.length} ouverte${positions.length>1?'s':''}${totalStaked>0?` · ${totalStaked.toFixed(2)}€ engagés`:''}</div>
            <div style="font-size:12px;color:var(--brand);font-weight:500;cursor:pointer;" data-scroll-to="allmatches">Voir tous ↓</div>
          </div>
          ${positions.length ? `
            <div class="agent-pos-grid" style="display:grid;grid-template-columns:56px 1fr 80px 72px 80px 90px;gap:12px;padding:6px 12px;color:var(--text-dim);font-size:10px;letter-spacing:.8px;text-transform:uppercase;font-weight:700;">
              <div>Conf.</div><div>Pari</div><div>Cote</div><div>Mise</div><div>Gain pot.</div><div>Statut</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">${positions.slice(0,10).map(positionRow).join('')}</div>
            ${positions.length > 10 ? `<div style="padding:10px;text-align:center;color:var(--text-dim);font-size:11px;cursor:pointer;" data-scroll-to="allmatches">+ ${positions.length-10} autres positions · <span style="color:var(--brand);">voir plus bas</span></div>` : ''}
          ` : `<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:13px;">Aucun match Winamax sélectionné aujourd'hui.</div>`}
        </div>

        ${ys ? `
        <div style="padding:28px 0;border-top:1px solid var(--border);">
          <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:8px;">Hier · ${ys.total} pari${ys.total>1?'s':''}</div>
          <div style="font-size:28px;font-weight:800;letter-spacing:-.8px;margin-bottom:4px;">
            <span style="color:${yPlColor};">${ys.pl>=0?'+':''}${ys.pl.toFixed(2)}€</span>
            <span style="font-size:13px;color:var(--text-dim);font-weight:500;"> · ${ys.wins} gagnés · ${ys.losses} perdus · WR ${ysWr}%</span>
          </div>
          ${lesson ? `<div style="margin-top:14px;padding:14px 16px;background:var(--panel);border:1px solid var(--border);border-left:3px solid var(--brand);border-radius:0 8px 8px 0;font-size:13px;line-height:1.55;color:var(--text-dim);">
            <span style="color:var(--brand);font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;display:block;margin-bottom:4px;">Ce que le modèle a appris</span>
            ${lesson}
          </div>` : ''}
        </div>` : ''}

        ${tuningBlockHtml}

        ${psArr.length ? `
        <div style="padding:28px 0;border-top:1px solid var(--border);">
          <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:14px;">Où le modèle performe · 7 derniers jours</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;">
            ${psArr.slice(0, 4).map(([sp, s]) => {
              const wr = s.bets ? Math.round(100 * s.w / s.bets) : 0;
              const roi = s.invested ? (s.pl / s.invested * 100) : 0;
              const roiColor = roi >= 0 ? 'var(--accent)' : 'var(--danger)';
              return `<div style="padding:12px 14px;background:var(--panel);border:1px solid var(--border);border-radius:10px;">
                <div style="font-size:11px;color:var(--text-dim);margin-bottom:3px;">${esc(sportLabel(sp))}</div>
                <div style="font-size:20px;font-weight:700;color:${roiColor};letter-spacing:-.4px;">${roi>=0?'+':''}${roi.toFixed(0)}%</div>
                <div style="font-size:11px;color:var(--text-dim);">${s.bets} paris · ${wr}% WR</div>
              </div>`;
            }).join('')}
          </div>
        </div>` : ''}

        <!-- v28.2 — Accordion Bilan INLINE (pas de nav, affiche une mini-synthese) -->
        <div style="padding:8px 0 32px;border-top:1px solid var(--border);margin-top:20px;">
          <div class="agent-accordion" data-toggle-bilan style="display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:1px solid var(--border);cursor:pointer;">
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--text);">Bilan détaillé du modèle</div>
              <div style="font-size:11px;color:var(--text-dim);margin-top:2px;">Par confiance, par ligue, par sport — toutes les stats</div>
            </div>
            <div style="color:var(--text-dim);font-size:18px;font-weight:300;" data-bilan-chevron>▾</div>
          </div>
          <div id="agent-bilan-inline" style="display:none;padding:16px 0;"></div>
          <!-- v28.4 — Export CSV cagnotte historique -->
          <div class="agent-accordion" data-agent-export-csv style="display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-top:1px solid var(--border);cursor:pointer;">
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--text);">Exporter l'historique ${agent.series.length?`· ${agent.series.length} paris`:''}</div>
              <div style="font-size:11px;color:var(--text-dim);margin-top:2px;">Télécharger un CSV : date · match · pick · cote · mise · résultat · cagnotte</div>
            </div>
            <div style="color:var(--text-dim);font-size:18px;font-weight:300;">⬇</div>
          </div>
          <div class="agent-accordion" data-agent-reset style="display:flex;justify-content:space-between;align-items:center;padding:16px 0;cursor:pointer;">
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--text);">Réinitialiser le modèle</div>
              <div style="font-size:11px;color:var(--text-dim);margin-top:2px;">Remettre la cagnotte à 10€ et repartir à zéro</div>
            </div>
            <div style="color:var(--text-dim);font-size:18px;font-weight:300;">↻</div>
          </div>
        </div>
      </div>

      ${(() => {
        // v29 — Desktop sidebar widgets (hidden <1280px via CSS media query).
        // Purpose : surface live + upcoming picks + cagnotte on wide screens so
        // the dashboard feels less mobile on desktop.
        if (_dataIsStale) return '';
        const liveNow = today.filter(m => m.live).slice(0, 2);
        // v31.7 — Avant : on prenait les 3 PROCHAINS coups d'envoi quels qu'ils
        // soient (incluant des picks low-conf risqués). Le user trouvait ça
        // confusant — il pensait que c'etait des recommandations alors que
        // c'etait juste des matchs à venir. Maintenant : on filtre sur
        // confiance ≥ 65% ET edge ≥ 0 pour ne montrer QUE des picks solides
        // qui sont aussi proches dans le temps.
        const upcoming = allTodayRaw
          .filter(x => !x.m.live && !x.m.completed && _notStarted(x.m))
          .filter(x => x.rel >= 0.65)
          .sort((a, b) => a.ts - b.ts)
          .slice(0, 3);
        const fmtCountdown = (m) => {
          const diffMs = new Date(m.date).getTime() - Date.now();
          if (diffMs <= 0) return '—';
          const mins = Math.round(diffMs / 60000);
          if (mins < 60) return `dans ${mins}min`;
          const h = Math.floor(mins/60), r = mins % 60;
          return r ? `dans ${h}h${String(r).padStart(2,'0')}` : `dans ${h}h`;
        };
        const liveHtml = liveNow.length ? liveNow.map(m => {
          const { home, away } = (typeof getSides === 'function') ? getSides(m) : { home: {}, away: {} };
          const hs = home?.score ?? '-', as = away?.score ?? '-';
          const league = (m.league_name || '').slice(0, 24);
          // v30 — Cards live cliquables pour ouvrir la modale match
          // tabindex+role+aria-label pour accessibilité clavier
          return `<div class="aside-live-row" data-match-id="${esc(String(m.id||''))}" role="button" tabindex="0" aria-label="Match en direct ${esc(home?.name||'?')} vs ${esc(away?.name||'?')}" style="padding:8px 10px;background:rgba(248,113,113,.06);border-left:2px solid var(--danger);border-radius:0 6px 6px 0;margin-bottom:6px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='rgba(248,113,113,.12)';" onmouseout="this.style.background='rgba(248,113,113,.06)';">
            <div style="font-size:10px;color:var(--danger);font-weight:700;letter-spacing:.3px;">🔴 LIVE · ${esc(league)}</div>
            <div style="font-size:12.5px;color:var(--text);font-weight:600;margin-top:2px;line-height:1.3;">${esc(home?.name||'?')} <b style="color:var(--accent);">${esc(String(hs))}</b></div>
            <div style="font-size:12.5px;color:var(--text);font-weight:600;line-height:1.3;">${esc(away?.name||'?')} <b style="color:var(--accent);">${esc(String(as))}</b></div>
          </div>`;
        }).join('') : `<div style="font-size:12px;color:var(--text-dim);padding:8px 0;">Aucun match en direct.</div>`;
        const upcomingHtml = upcoming.length ? upcoming.map(x => {
          const { home, away } = (typeof getSides === 'function') ? getSides(x.m) : { home: {}, away: {} };
          const pick = (x.best && x.best.label) || x.pred.pick.label || 'Pick';
          // v30 — Cards upcoming cliquables pour ouvrir la modale match
          return `<div class="aside-upcoming-row" data-match-id="${esc(String(x.m.id||''))}" role="button" tabindex="0" aria-label="Pronostic à venir ${esc(home?.name||'?')} vs ${esc(away?.name||'?')}" style="padding:8px 10px;background:rgba(167,139,250,.04);border-left:2px solid var(--brand);border-radius:0 6px 6px 0;margin-bottom:6px;cursor:pointer;transition:background .15s;" onmouseover="this.style.background='rgba(167,139,250,.10)';" onmouseout="this.style.background='rgba(167,139,250,.04)';">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px;">
              <div style="font-size:10px;color:var(--brand);font-weight:700;">${esc(fmtTime(x.m.date))} · ${esc(fmtCountdown(x.m))}</div>
              <div style="font-size:11px;color:var(--accent);font-weight:700;">@${x.odd.toFixed(2)}</div>
            </div>
            <div style="font-size:12px;color:var(--text);font-weight:600;margin-top:2px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc((home?.name||'?')+' vs '+(away?.name||'?'))}</div>
            <div style="font-size:11px;color:var(--text-dim);margin-top:1px;">→ ${esc(pick)} · ${Math.round(x.rel*100)}%</div>
          </div>`;
        }).join('') : `<div style="font-size:12px;color:var(--text-dim);padding:8px 0;">Aucun coup d'envoi prochainement.</div>`;
        return `
        <aside class="v29-dash-aside" aria-label="Widgets de suivi">
          <div style="padding:14px 14px 12px;background:var(--panel);border:1px solid var(--border);border-radius:10px;margin-bottom:10px;">
            <div style="font-size:10.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--text-dim);font-weight:700;margin-bottom:4px;">💰 Cagnotte modèle</div>
            <div style="font-size:24px;font-weight:800;letter-spacing:-.5px;color:var(--text);">${nav.toFixed(2)}€</div>
            <div style="font-size:11.5px;color:${deltaColor};font-weight:600;margin-top:2px;">${deltaSign}${Math.round((agent.deltaPct7 ?? 0)*10)/10}% sur 7j</div>
            <div style="font-size:10.5px;color:var(--text-dim);margin-top:6px;">Partie de 10€ le ${esc(startDateStr)} · ${(agent.series?.length || 0)} pari${(agent.series?.length || 0)>1?'s':''}</div>
          </div>
          <div style="padding:14px 14px 12px;background:var(--panel);border:1px solid var(--border);border-radius:10px;margin-bottom:10px;">
            <div style="font-size:10.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--text-dim);font-weight:700;margin-bottom:6px;">⭐ Top picks à venir</div>
            <div style="font-size:10.5px;color:var(--text-dim2);margin-bottom:8px;line-height:1.4;">Picks confiance ≥65% qui démarrent bientôt.</div>
            ${upcomingHtml}
          </div>
          <div style="padding:14px 14px 12px;background:var(--panel);border:1px solid var(--border);border-radius:10px;">
            <div style="font-size:10.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--text-dim);font-weight:700;margin-bottom:8px;">🔴 En direct${liveNow.length?` · ${today.filter(m=>m.live).length}`:''}</div>
            ${liveHtml}
          </div>
        </aside>`;
      })()}

      ${_dataIsStale ? '' : `
      <!-- v30 — Sprint 2 : Mobile cagnotte pill (shown <1280px where aside is hidden) -->
      <button type="button" class="dash-cag-pill" id="dash-cag-pill" data-scroll-to-cag aria-label="Aller à la cagnotte du modèle">
        <span class="dcp-icon">💰</span>
        <span class="dcp-bal">${nav.toFixed(2)}€</span>
        <span class="dcp-delta ${agent.delta7 >= 0 ? 'up' : 'down'}">${deltaSign}${Math.round((agent.deltaPct7 ?? 0)*10)/10}%</span>
      </button>`}
    `;

    // v30 — Sprint 2 : Pill click scrolls to cagnotte header panel
    const cagPill = wrap.querySelector('#dash-cag-pill');
    if (cagPill) cagPill.addEventListener('click', () => {
      const target = wrap.querySelector('[data-agent-reset]') || wrap.querySelector('#agent-bilan-inline');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // v30 — Sprint 3 : toggle analyse complète + ajusteur de mise inline
    wrap.querySelectorAll('.dpc-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = btn.dataset.toggleCard;
        // FIX bug #7 : utilise getElementById pour bypass le parseur CSS qui
        // refuse les ids contenant `:`, `.`, `/` etc. Aujourd'hui les ids
        // data.js sont numériques mais Sofascore/Forebet pourraient en
        // introduire à n'importe quel moment.
        const expand = document.getElementById(`${cardId}-expand`);
        const chev = btn.querySelector('.dpc-chev');
        if (!expand) return;
        const isOpen = expand.style.display !== 'none';
        expand.style.display = isOpen ? 'none' : 'block';
        btn.setAttribute('aria-expanded', String(!isOpen));
        if (chev) chev.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        // v30 — Lazy-render sparkline odds movement quand on déplie pour la
        // 1ère fois (économise du DOM si l'utilisateur n'expand jamais).
        const expandEl = document.getElementById(`${btn.dataset.card}-expand`);
        if (!isOpen && expandEl && !expandEl.dataset.sparkRendered) {
          expandEl.dataset.sparkRendered = '1';
          const matchId = btn.dataset.matchId;
          const pickKey = btn.dataset.pickKey;
          const slotId = `${btn.dataset.card}-spark`;
          const slot = document.getElementById(slotId);
          if (slot && matchId) _renderOddsSparkline(slot, matchId, pickKey);
        }
      });
    });
    const _dpcRecalc = (cardId) => {
      // FIX bug #7 : voir _dpcExpand. getElementById safe sur tout id ASCII.
      const card = document.getElementById(cardId);
      if (!card) return;
      const input = wrap.querySelector(`.dpc-stake-input[data-card="${cardId}"]`);
      const gainEl = wrap.querySelector(`.dpc-live-gain[data-card="${cardId}"]`);
      const stakeVal = card ? card.querySelector('.dpc-stake-val') : null;
      const gainSum = card ? card.querySelector('.dpc-gain-val') : null;
      if (!input) return;
      // FIX Bug 5 : input vide → afficher '—' au lieu de forced 0.10€
      // (avant : parseFloat('') → NaN → || 0 → Math.max(0.10, 0) → 0.10
      // ce qui affichait silencieusement +0.10€ pour un input vide).
      // FIX Bug 9 : data-odd manquant → pas de gain affiché plutôt que +0€
      const rawStake = parseFloat(input.value);
      const rawOdd = parseFloat(card.dataset.odd);
      if (!isFinite(rawStake) || rawStake <= 0 || !isFinite(rawOdd) || rawOdd <= 1) {
        if (gainEl) gainEl.textContent = '—';
        if (stakeVal) stakeVal.textContent = '—';
        if (gainSum) gainSum.textContent = '—';
        return;
      }
      const stake = Math.max(0.10, rawStake);
      const odd = rawOdd;
      const gain = stake * (odd - 1);
      // v30 — Format cohérent avec le render initial : centimes si <1€,
      // arrondi sinon. Évite "+0.03€" en update et "+0€" en init pour le
      // même pari, et "+1.06€" en update vs "+1€" en init.
      const fmtMon = (n) => n < 1 ? `${n.toFixed(2)}€` : `${Math.round(n)}€`;
      if (gainEl) gainEl.textContent = `+${fmtMon(gain)}`;
      if (stakeVal) stakeVal.textContent = fmtMon(stake);
      if (gainSum) gainSum.textContent = `+${fmtMon(gain)}`;
    };
    wrap.querySelectorAll('.dpc-stake-adj').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = btn.dataset.card;
        const delta = parseFloat(btn.dataset.delta) || 0;
        const input = wrap.querySelector(`.dpc-stake-input[data-card="${cardId}"]`);
        if (!input) return;
        const cur = parseFloat(input.value) || 0;
        input.value = Math.max(0.10, cur + delta).toFixed(2);
        _dpcRecalc(cardId);
      });
    });
    // v30 — Presets de mise rapides (1€, 2€, 5€, 10€, ⚡ Kelly)
    wrap.querySelectorAll('.dpc-stake-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cardId = btn.dataset.card;
        const preset = btn.dataset.preset;
        const input = wrap.querySelector(`.dpc-stake-input[data-card="${cardId}"]`);
        if (!input) return;
        let value;
        if (preset === 'kelly') {
          value = parseFloat(btn.dataset.kellyAmount) || 1;
        } else {
          value = parseFloat(preset) || 1;
        }
        input.value = Math.max(0.10, value).toFixed(2);
        _dpcRecalc(cardId);
        // Visual flash on the chosen preset (highlight)
        wrap.querySelectorAll(`.dpc-stake-preset[data-card="${cardId}"]`).forEach(b => {
          b.style.background = b === btn ? 'rgba(167,139,250,.25)' : '';
          b.style.color = b === btn ? 'var(--brand)' : '';
        });
      });
    });
    wrap.querySelectorAll('.dpc-stake-input').forEach(inp => {
      inp.addEventListener('input', () => _dpcRecalc(inp.dataset.card));
      inp.addEventListener('click', (e) => e.stopPropagation());
    });

    wrap.querySelectorAll('[data-nav-to]').forEach(el => {
      el.addEventListener('click', () => {
        const target = el.dataset.navTo;
        const btn = document.querySelector(`.page-btn[data-page="${target}"]`);
        if (btn) btn.click();
      });
    });
    // v28.2 — scroll-to inline (remplace nav-to pour rester sur la page)
    wrap.querySelectorAll('[data-scroll-to]').forEach(el => {
      el.addEventListener('click', () => {
        const target = el.dataset.scrollTo === 'allmatches' ? '#agent-all-matches' : null;
        if (!target) return;
        const anchor = wrap.querySelector(target);
        if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    // v28.3 — filtres + tri tableau tous matchs
    const _saveFilter = (patch) => {
      let f = {}; try { f = JSON.parse(localStorage.getItem('agentFilter') || '{}') || {}; } catch(e){}
      Object.assign(f, patch);
      try { localStorage.setItem('agentFilter', JSON.stringify(f)); } catch(e){}
      renderDashboardPage(wrap);
    };
    wrap.querySelectorAll('[data-agent-filter]').forEach(sel => {
      sel.addEventListener('change', () => {
        const key = sel.dataset.agentFilter;
        const val = sel.value;
        _saveFilter({ [key]: key === 'sport' ? val : Number(val) });
      });
    });
    wrap.querySelectorAll('[data-agent-sort]').forEach(el => {
      el.addEventListener('click', () => {
        const col = el.dataset.agentSort;
        let f = {}; try { f = JSON.parse(localStorage.getItem('agentFilter') || '{}') || {}; } catch(e){}
        if (f.sortBy === col) {
          f.sortDir = f.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          f.sortBy = col; f.sortDir = 'desc';
        }
        try { localStorage.setItem('agentFilter', JSON.stringify(f)); } catch(e){}
        renderDashboardPage(wrap);
      });
    });
    const resetFilterBtn = wrap.querySelector('[data-agent-filter-reset]');
    if (resetFilterBtn) resetFilterBtn.addEventListener('click', () => {
      try { localStorage.removeItem('agentFilter'); } catch(e){}
      renderDashboardPage(wrap);
    });
    // v28.6 — User bankroll input : recompute mises suggérées à chaque change
    const bankrollInput = wrap.querySelector('#user-bankroll-input');
    if (bankrollInput) {
      bankrollInput.addEventListener('change', () => {
        const v = parseFloat(bankrollInput.value);
        if (isFinite(v) && v >= 10 && v <= 10000) {
          try { localStorage.setItem('userBankroll', String(v)); } catch(e){}
          renderDashboardPage(wrap);
        }
      });
    }
    wrap.querySelectorAll('.agent-pos-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.matchId;
        if (!id) return;
        let found = null;
        Object.values(data.days || {}).forEach(arr => (arr || []).forEach(m => { if (String(m.id) === id) found = m; }));
        if (found && typeof openDetail === 'function') openDetail(found);
      });
    });
    // v30 — Aside live + upcoming cards cliquables → ouvre modale match
    // (handler unifié click + Enter/Space pour accessibilité clavier)
    const _asideRowOpen = (row) => {
      const id = row.dataset.matchId;
      if (!id) return;
      let found = null;
      Object.values(data.days || {}).forEach(arr => (arr || []).forEach(m => { if (String(m.id) === id) found = m; }));
      if (found && typeof openDetail === 'function') openDetail(found);
    };
    wrap.querySelectorAll('.aside-live-row, .aside-upcoming-row').forEach(row => {
      row.addEventListener('click', () => _asideRowOpen(row));
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          _asideRowOpen(row);
        }
      });
    });
    // v30 — Hero pick + top opportunity cards cliquables → ouvre modale.
    // Guarde sur les controls internes (button, a, input) pour ne pas
    // intercepter les clics sur "Parier sur Winamax", l'ajusteur de mise,
    // les presets stake, le toggle "Voir l'analyse complète", etc.
    const _matchById = (id) => {
      let found = null;
      Object.values(data.days || {}).forEach(arr => (arr || []).forEach(m => { if (String(m.id) === id) found = m; }));
      return found;
    };
    const _isInteractiveTarget = (el) => {
      if (!el) return false;
      // Walk up to the card root and stop if we hit a form-ish element first.
      while (el && !el.matches?.('.dash-pick-card, .dash-hero-pick')) {
        if (el.matches?.('button, a, input, select, textarea, [data-toggle-card], [data-stake-preset], .dpc-stake-adj, .dpc-stake-input')) return true;
        el = el.parentElement;
      }
      return false;
    };
    const _openCardMatch = (card) => {
      const id = card.dataset.matchId;
      if (!id) return;
      const m = _matchById(id);
      if (m && typeof openDetail === 'function') openDetail(m);
    };
    // v31.3 — .ed-hero ajouté au selector. C'est le nouveau hero éditorial
    // qui remplace .dash-hero-pick depuis l'audit UX dashboard. Même handler
    // (open match modal au click), mais nouveau markup. Ancien sélecteur
    // gardé en safety pour les caches transitoires.
    wrap.querySelectorAll('.ed-hero[data-match-id], .dash-hero-pick, .dash-pick-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (_isInteractiveTarget(e.target)) return;
        _openCardMatch(card);
      });
      card.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === card) {
          e.preventDefault();
          _openCardMatch(card);
        }
      });
    });
    const reset = wrap.querySelector('[data-agent-reset]');
    if (reset) reset.addEventListener('click', async () => {
      // v28.10 — Si un reset récent (<10 min) existe, c'est un clic d'annulation
      const prevReset = parseInt(localStorage.getItem('agentResetTs') || '0', 10);
      const _confirmFn = (opts) => (typeof window._showConfirm === 'function')
        ? window._showConfirm(opts)
        : Promise.resolve(confirm(opts.body || opts.title));
      if (prevReset && (Date.now() - prevReset) < 600000) {
        const ok = await _confirmFn({
          title: '↩️ Annuler le reset ?',
          body: 'Restaurer ta cagnotte pré-reset (annulation possible jusqu\'à 10 min après le reset).',
          confirmLabel: 'Annuler le reset',
          cancelLabel: 'Garder',
        });
        if (ok) {
          try { localStorage.removeItem('agentResetTs'); } catch(e){}
          renderDashboardPage(wrap);
        }
        return;
      }
      const ok = await _confirmFn({
        title: '🔄 Reset la cagnotte ?',
        body: 'Remettre la cagnotte du modèle à <b>10€</b> et oublier tout l\'historique antérieur.<br><span style="color:var(--text-dim);font-size:12px;">Annulable pendant 10 minutes après le reset.</span>',
        confirmLabel: 'Reset',
        cancelLabel: 'Annuler',
        danger: true,
      });
      if (!ok) return;
      try { localStorage.setItem('agentResetTs', String(Date.now())); } catch(e){}
      renderDashboardPage(wrap);
    });
    // v28.2 — Bilan inline accordion : render renderBilanPage dans le div caché
    // v28.4 — Préserve la position de scroll et scroll doux vers le toggle après render
    const bilanToggle = wrap.querySelector('[data-toggle-bilan]');
    const bilanBox = wrap.querySelector('#agent-bilan-inline');
    const bilanChev = wrap.querySelector('[data-bilan-chevron]');
    if (bilanToggle && bilanBox) {
      bilanToggle.addEventListener('click', () => {
        const open = bilanBox.style.display !== 'none';
        const togglePos = bilanToggle.getBoundingClientRect().top;
        if (open) {
          bilanBox.style.display = 'none';
          if (bilanChev) bilanChev.textContent = '▾';
          // Compense le saut de scroll causé par la disparition du contenu
          const newPos = bilanToggle.getBoundingClientRect().top;
          window.scrollBy({ top: newPos - togglePos, behavior: 'instant' });
        } else {
          bilanBox.style.display = '';
          if (bilanChev) bilanChev.textContent = '▴';
          if (!bilanBox._rendered) {
            try { if (typeof renderBilanPage === 'function') renderBilanPage(bilanBox); bilanBox._rendered = true; }
            catch(e) { bilanBox.innerHTML = '<div style="color:var(--text-dim);font-size:12px;">Erreur chargement Bilan.</div>'; }
          }
          // Scroll smooth vers le toggle après ouverture
          setTimeout(() => bilanToggle.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        }
      });
    }
    // v28.4 — Export CSV cagnotte historique
    const exportBtn = wrap.querySelector('[data-agent-export-csv]');
    if (exportBtn) exportBtn.addEventListener('click', () => {
      try {
        if (!agent.series || agent.series.length === 0) {
          alert('Aucun pari réglé à exporter.');
          return;
        }
        const rows = [['date', 'sport', 'pick_odds', 'stake_EUR', 'result', 'pl_EUR', 'bankroll_EUR']];
        agent.series.forEach(p => {
          const d = new Date(p.t).toISOString().slice(0, 16).replace('T', ' ');
          rows.push([d, p.sport || '', (p.odd||0).toFixed(2), (p.stake||0).toFixed(2), p.res || '', (p.pl||0).toFixed(2), (p.nav||0).toFixed(2)]);
        });
        const csv = rows.map(r => r.map(c => typeof c === 'string' && c.includes(',') ? `"${c}"` : c).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agent-cagnotte-${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a); a.click();
        setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
      } catch(e) { console.warn('CSV export failed:', e); alert('Erreur export CSV'); }
    });
    // v27.2 — Auto-tuning : Activer une règle proposée
    wrap.querySelectorAll('[data-rule-activate]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.ruleActivate;
      const prop = proposedRules.find(r => r.id === id);
      if (!prop) return;
      const current = _loadAgentRules();
      if (!current.some(r => r.id === id)) {
        current.push({ id: prop.id, type: prop.type, threshold: prop.threshold, sport: prop.sport, league: prop.league, label: prop.label, sample: prop.sample, roi: prop.roi, activatedAt: Date.now() });
        _saveAgentRules(current);
      }
      renderDashboardPage(wrap);
    }));
    // Désactiver une règle active
    wrap.querySelectorAll('[data-rule-deactivate]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.ruleDeactivate;
      _saveAgentRules(_loadAgentRules().filter(r => r.id !== id));
      renderDashboardPage(wrap);
    }));
    // Ignorer une proposition (la cacher)
    wrap.querySelectorAll('[data-rule-ignore]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.ruleIgnore;
      const ignored = _loadAgentIgnored();
      if (!ignored.includes(id)) { ignored.push(id); _saveAgentIgnored(ignored); }
      renderDashboardPage(wrap);
    }));
    // Reset ignored
    const resetIgn = wrap.querySelector('[data-rule-reset-ignored]');
    if (resetIgn) resetIgn.addEventListener('click', () => {
      _saveAgentIgnored([]);
      renderDashboardPage(wrap);
    });
  }

  // ====== Page Alertes — centre de notifications ======
  function renderAlertesPage(wrap) {
    const alerts = [];
    const now = Date.now();
    const data = window.PRONOSTICS_DATA;
    const todayIso = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });

    // Nouveaux locks non vus
    try {
      // FIX bugs #9 + #10 : seenIds en String() (cohérent avec le sérialiseur),
      // et data.days[k] en optional chaining + ?? pour parens non ambiguës.
      const seenIds = new Set((JSON.parse(localStorage.getItem('seenLockIds') || '[]') || []).map(String));
      const today = ((data && data.days && data.days[todayIso]) || []).filter(m => m.winamax && m.winamax.available === true);
      today.forEach(m => {
        try {
          const pred = predictMatch(m);
          if (pred && pred.isLock && !m.completed && !seenIds.has(String(m.id))) {
            // FIX undefined-bug : m.home/m.away n'existent pas, passer par getSides
            const s = (typeof getSides === 'function') ? getSides(m) : { home: {}, away: {} };
            const hN = s.home?.name || '?', aN = s.away?.name || '?';
            alerts.push({
              ts: now, icon: '🆕', type: 'Nouveau lock', color: 'gold',
              title: `${hN} vs ${aN}`,
              body: `Nouveau pari sûr Winamax · ${((pred.reliability||0)*100).toFixed(0)}% de confiance`,
              action: 'locks'
            });
          }
        } catch (e) {}
      });
    } catch (e) {}

    // v30 — Tilt guard retiré : il s'appuyait sur les paris trackés
    // par l'utilisateur. La série du modèle remplace ce signal.

    // Matchs live
    try {
      const today = ((data && data.days && data.days[todayIso]) || []).filter(m => m.winamax && m.winamax.available === true && m.live);
      today.forEach(m => {
        // FIX undefined-bug : m.home/m.away n'existent pas, passer par getSides
        const s = (typeof getSides === 'function') ? getSides(m) : { home: {}, away: {} };
        const hN = s.home?.name || '?', aN = s.away?.name || '?';
        alerts.push({
          ts: now, icon: '🔴', type: 'Match en cours', color: 'red',
          title: `${hN} vs ${aN}`,
          body: `${sportEmoji(m.sport)} ${sportLabel(m.sport) || m.sport || ''} · check le score`,
          action: 'locks'
        });
      });
    } catch (e) {}

    // v30 — "Wins récentes" retiré : alimenté par les paris trackés.

    const colMap = {
      gold: '#ffd60a', green: '#30d158', red: '#ff3b30', orange: '#ff9f0a',
      purple: '#bf5af2', indigo: '#5e5ce6', blue: '#0a84ff'
    };

    const alertsHtml = alerts.length
      ? alerts.sort((a,b) => b.ts - a.ts).map(a => {
          const col = colMap[a.color] || '#5e5ce6';
          const time = new Date(a.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          return `
            <div data-alert-action="${esc(a.action)}" style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:16px 18px;cursor:pointer;transition:all .15s;display:flex;gap:14px;align-items:flex-start;" onmouseover="this.style.borderColor='${col}44';this.style.transform='translateX(2px)';" onmouseout="this.style.borderColor='var(--border)';this.style.transform='';">
              <div style="width:36px;height:36px;border-radius:50%;background:${col}22;display:grid;place-items:center;font-size:16px;flex-shrink:0;">${a.icon}</div>
              <div style="flex:1;min-width:0;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
                  <span style="font-size:10px;padding:2px 8px;background:${col}18;color:${col};border-radius:999px;text-transform:uppercase;letter-spacing:.5px;font-weight:700;">${esc(a.type)}</span>
                  <span style="font-size:11px;color:var(--text-dim2);">${time}</span>
                </div>
                <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:2px;">${esc(a.title)}</div>
                <div style="font-size:12.5px;color:var(--text-dim);line-height:1.4;">${esc(a.body)}</div>
              </div>
            </div>`;
        }).join('')
      : `<div style="padding:48px 24px;text-align:center;background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);">
          <div style="font-size:48px;margin-bottom:12px;opacity:.5;">🔕</div>
          <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px;">Aucune alerte</div>
          <div style="font-size:13px;color:var(--text-dim);">Tout est calme — les nouveaux événements apparaîtront ici.</div>
        </div>`;

    // Update nav badge count
    const countEl = document.getElementById('count-alertes');
    if (countEl) countEl.textContent = String(alerts.length);

    wrap.innerHTML = `
      <div style="max-width:1280px;margin:0 auto;padding:4px 0 0;font-variant-numeric:tabular-nums;">
        <div style="margin-bottom:24px;padding:32px 0 20px;border-bottom:1px solid var(--border);position:relative;display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div style="position:absolute;top:0;left:0;width:40px;height:3px;background:var(--warn);border-radius:0 0 2px 2px;"></div>
          <div>
            <div style="font-size:11px;color:var(--warn);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:6px;">Notifications · ${alerts.length}</div>
            <h1 style="margin:0 0 6px;font-size:40px;font-weight:800;letter-spacing:-1.4px;color:var(--text);line-height:1;">Alertes</h1>
            <div style="font-size:14px;color:var(--text-dim);">Mouvements importants de la journée : nouveaux paris sûrs, séries, alertes anti-panique.</div>
          </div>
          ${alerts.length ? `<button id="clear-alerts" style="background:var(--panel);border:1px solid var(--border);color:var(--text-dim);border-radius:var(--r);padding:8px 14px;font-size:12px;cursor:pointer;">Tout marquer comme lu</button>` : ''}
        </div>
        <div style="display:grid;gap:10px;max-width:900px;">${alertsHtml}</div>
      </div>`;

    wrap.querySelectorAll('[data-alert-action]').forEach(card => {
      card.addEventListener('click', () => {
        const target = card.dataset.alertAction;
        const btn = document.querySelector(`.page-btn[data-page="${target}"]`);
        if (btn) btn.click();
      });
    });
    const clear = wrap.querySelector('#clear-alerts');
    if (clear) clear.addEventListener('click', (e) => {
      e.stopPropagation();
      try {
        const data = window.PRONOSTICS_DATA;
        const ids = [];
        Object.values(data.days || {}).forEach(arr => (arr || []).forEach(m => { if (m.id) ids.push(String(m.id)); }));
        localStorage.setItem('seenLockIds', JSON.stringify(ids));
        if (typeof toast === 'function') toast('✓ Toutes les alertes marquées comme lues', 'success');
        renderAlertesPage(wrap);
      } catch (err) { console.warn('[Alertes] clear failed', err); }
    });
  }

  // ====== Page Académie (glossaire) ======
  // ====== v29 — Tous les pronos du jour ======
  // ====== v30 Sprint 4 — Filter bar + persistent sort ======
  // One-page view : tabs À venir / Finis + filter bar (sport multi-toggle,
  // min edge select, min conf select) + sort dropdown (kickoff/edge/conf/odd).
  // Toute la conf vit dans localStorage (`tousFilters` + `tousSort`) → user
  // retrouve sa vue à chaque retour sur la page.
  function renderTousPage(wrap) {
    const data = window.PRONOSTICS_DATA;
    // v30 — Bug fix : on utilisait `new Date()` directement, donc la nav
    // prev-day/next-day n'avait aucun effet sur Tous. Utiliser currentDate
    // (variable globale IIFE-scopée mise à jour par les boutons ◀ ▶ et
    // l'input date de la topbar) pour respecter le jour navigué.
    const todayIso = (typeof currentDate === 'string' && currentDate)
      ? currentDate
      : new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const today = (data && data.days && data.days[todayIso]) || [];
    const winaToday = today.filter(m => m.winamax && m.winamax.available === true);

    const allPicks = winaToday.map(m => {
      try {
        const pred = predictMatch(m);
        if (!pred || !pred.pick || pred.skip) return null;
        const pk = pred.pick.key;
        const odd = pred.odds && (pk==='1'?pred.odds.home:pk==='2'?pred.odds.away:pred.odds.draw);
        if (!odd) return null;
        const rel = pred.reliability ?? pred.pick.prob;
        const edge = rel - 1/odd;
        const { home, away } = getSides(m);
        const settled = m.completed;
        const live = m.status === 'STATUS_IN_PROGRESS';
        // v30 — événement déjà commencé mais pas encore complété : ce n'est plus
        // un pari "à venir" actionnable (cotes pré-match figées). On le marque
        // pour le filtrer hors du compteur "À venir".
        const ko = new Date(m.date).getTime();
        const startedAndNotSettled = !settled && isFinite(ko) && ko < Date.now() - 60000;
        const res = settled ? evaluateModelPick(m, pred) : null;
        return { m, pred, odd, rel, edge, home, away, settled, live, startedAndNotSettled, res, ts: ko, sport: m.sport || 'other' };
      } catch(e) { return null; }
    }).filter(Boolean);

    // v30 Sprint 4 — load persistent filter + sort state
    const _readFilters = () => {
      try {
        const raw = localStorage.getItem('tousFilters');
        if (raw) {
          const p = JSON.parse(raw);
          return {
            sports: Array.isArray(p.sports) ? p.sports : [],
            minEdge: typeof p.minEdge === 'number' ? p.minEdge : 0,
            minConf: typeof p.minConf === 'number' ? p.minConf : 0,
          };
        }
      } catch(e) {}
      return { sports: [], minEdge: 0, minConf: 0 };
    };
    const tousFilters = _readFilters();
    const _readSort = () => {
      try {
        const s = localStorage.getItem('tousSort');
        if (['kickoff', 'edge', 'conf', 'odd'].includes(s)) return s;
      } catch(e) {}
      return 'kickoff';
    };
    const tousSort = _readSort();
    const _saveFilters = () => {
      try { localStorage.setItem('tousFilters', JSON.stringify(tousFilters)); } catch(e) {}
    };

    // Sports présents aujourd'hui (pour ne pas afficher des pills vides)
    const sportLabelMap = { football:'⚽ Foot', tennis:'🎾 Tennis', basketball:'🏀 Basket', hockey:'🏒 Hockey', baseball:'⚾ Baseball', 'american-football':'🏈 NFL', mma:'🥊 MMA', golf:'⛳ Golf', racing:'🏎️ F1', rugby:'🏉 Rugby', other:'🎯 Autres' };
    const sportsAvailable = [...new Set(allPicks.map(p => p.sport))].sort();

    // Apply filters
    const passesFilters = (p) => {
      if (tousFilters.sports.length && !tousFilters.sports.includes(p.sport)) return false;
      if (tousFilters.minEdge > 0 && p.edge < tousFilters.minEdge) return false;
      if (tousFilters.minConf > 0 && p.rel < tousFilters.minConf) return false;
      return true;
    };
    // v30 — Floor implicite SUR LES PARIS ACTIONNABLES uniquement :
    // edge < -2pt = le marché est nettement plus confiant que nous,
    // donc bad value. On filtre ces picks de "À venir" + "En cours"
    // mais on les GARDE dans "Finis" pour tracker la perf complète
    // du modèle (win ou lose, on veut savoir combien ça a coûté).
    const isValuePick = (p) => p.edge >= -0.02;
    const filteredPicks = allPicks.filter(passesFilters);

    // Sort comparator (Finis = toujours plus récent en premier, plus utile)
    const cmp = (a, b) => {
      switch (tousSort) {
        case 'edge':    return b.edge - a.edge;
        case 'conf':    return b.rel - a.rel;
        case 'odd':     return a.odd - b.odd;
        case 'kickoff':
        default:        return a.ts - b.ts;
      }
    };
    // v30 — "À venir" = pari encore actionnable + edge >= -2pt. Les matchs
    // déjà démarrés (live ou en attente de scraper-update) ne sont plus
    // pariables — on les sort dans "En cours" plutôt que de les noyer dans
    // une liste où la plupart sont déjà commencés.
    const pending = filteredPicks.filter(p => !p.settled && !p.startedAndNotSettled && isValuePick(p)).sort(cmp);
    const inProgress = filteredPicks.filter(p => p.startedAndNotSettled && isValuePick(p)).sort((a,b) => a.ts - b.ts);
    const finished = filteredPicks.filter(p => p.settled).sort((a,b) => b.ts - a.ts);
    const totalWon = finished.filter(p => p.res === 'won').length;
    const totalLost = finished.filter(p => p.res === 'lost').length;
    const settledCount = totalWon + totalLost;
    const wrPct = settledCount > 0 ? Math.round(100 * totalWon / settledCount) : 0;
    const filtersActive = tousFilters.sports.length > 0 || tousFilters.minEdge > 0 || tousFilters.minConf > 0 || tousSort !== 'kickoff';

    // v30 — Si l'onglet sauvegardé est vide pour le jour courant, on bascule
    // intelligemment vers un onglet rempli (à venir > en cours > finis) pour
    // ne pas montrer un écran "Aucun match" alors que d'autres onglets ont
    // du contenu. Évite la confusion "page vide" quand tabSelected=finished
    // sur un jour à venir, ou pending sur un jour passé.
    const activeTab = (() => {
      let saved = 'pending';
      try { saved = localStorage.getItem('tousTab') || 'pending'; } catch(e) {}
      const counts = { pending: pending.length, inprogress: inProgress.length, finished: finished.length };
      if (counts[saved] > 0) return saved;
      if (counts.pending > 0) return 'pending';
      if (counts.inprogress > 0) return 'inprogress';
      if (counts.finished > 0) return 'finished';
      return saved; // tout est vide → garder la préférence
    })();

    const renderRow = (p, isFini) => {
      const hn = (p.home && p.home.name) || '?';
      const an = (p.away && p.away.name) || '?';
      const hLogo = (p.home && p.home.logo) || '';
      const aLogo = (p.away && p.away.logo) || '';
      const tLbl = fmtTime(p.m.date);
      const confColor = p.rel >= 0.70 ? 'var(--accent)' : p.rel >= 0.60 ? '#fbbf24' : 'var(--text-dim)';
      const edgeColor = p.edge > 0.10 ? 'var(--accent)' : p.edge > 0.05 ? '#fbbf24' : 'var(--text-dim)';
      const pickLabel = p.pred.pick.label || 'Pick';
      // v30 — Score prédit + score réel (foot only).
      // Le top-1 de pred.scores est le score le plus probable selon Poisson;
      // m.competitors[].score est le score réel (string ESPN, parfois "—").
      const isFoot = p.m.sport === 'football';
      const predScores = (p.pred.scores && Array.isArray(p.pred.scores))
        ? p.pred.scores
        : (p.pred.scores && Array.isArray(p.pred.scores.items) && (p.pred.scores.kind === 'exact' || !p.pred.scores.kind))
          ? p.pred.scores.items
          : [];
      // v31.5 — Score prédit COHÉRENT avec le pick (avant : on prenait le mode
      // global du Poisson, ce qui pouvait afficher "1-1" alors que le pick
      // était "1 · St. Étienne" — incohérence visuelle confusante).
      // Logique : si pick=1, on cherche dans predScores le score le plus
      // probable AVEC home > away. Idem pour X (home === away) et 2 (home < away).
      // Si aucun score cohérent dans le top-10 (rare), fallback global.
      const _pickKey = (p.pred.pick && p.pred.pick.key) || '';
      const _consistent = (s) => {
        if (!s || typeof s.home !== 'number' || typeof s.away !== 'number') return false;
        if (_pickKey === '1') return s.home > s.away;
        if (_pickKey === '2') return s.home < s.away;
        if (_pickKey === 'X') return s.home === s.away;
        return true;  // pick non-1N2 (BTTS, O/U, etc.) → on garde le mode global
      };
      const topScore = predScores.find(_consistent) || predScores[0];
      // Use home_away tag rather than positional [0]/[1] — ESPN sometimes
      // returns the away team first (frequent on US sports + tennis where
      // there's no real home/away). Mismatched ordering caused "score
      // correct" to flip on every refresh for those events.
      const _realHomeC = (p.m.competitors || []).find(c => c.home_away === 'home') || (p.m.competitors || [])[0] || {};
      const _realAwayC = (p.m.competitors || []).find(c => c.home_away === 'away') || (p.m.competitors || [])[1] || {};
      const realHome = parseInt(_realHomeC.score || '', 10);
      const realAway = parseInt(_realAwayC.score || '', 10);
      const hasRealScore = isFini && Number.isFinite(realHome) && Number.isFinite(realAway);
      const scoreCorrect = (topScore && hasRealScore) ? (topScore.home === realHome && topScore.away === realAway) : false;
      // v30 — Buteurs prédits (top-2) + buteurs réels (depuis m.scorers).
      // predictLikelyScorers exige les xG; ne tirera rien sans Poisson.
      let predScorers = [];
      try {
        if (isFoot && typeof predictLikelyScorers === 'function') {
          const all = predictLikelyScorers(p.m, p.pred) || [];
          predScorers = all.slice(0, 2);
        }
      } catch(e){}
      const realScorers = (isFoot && Array.isArray(p.m.scorers)) ? p.m.scorers : [];
      const predScorerHit = (predScorers.length && realScorers.length) ? predScorers.some(ps =>
        realScorers.some(rs => {
          const a = String(ps.name || '').toLowerCase().split(/\s+/);
          const b = String(rs.name || '').toLowerCase().split(/\s+/);
          // Token intersection on last names ≥ 3 chars (handles "Mbappé K." vs "Kylian Mbappé").
          return a.some(t => t.length >= 3 && b.includes(t));
        })) : false;
      const sportEm = { football:'⚽', tennis:'🎾', basketball:'🏀', hockey:'🏒', baseball:'⚾', 'american-football':'🏈', mma:'🥊', golf:'⛳', racing:'🏎️', rugby:'🏉' }[p.m.sport] || '🎯';
      const league = p.m.league_name || '';
      const url = (p.m.winamax && p.m.winamax.url) || 'https://www.winamax.fr/paris-sportifs';
      const resBadge = isFini ? (p.res === 'won' ? '<span style="padding:3px 10px;background:rgba(52,211,153,.15);color:#34d399;font-weight:700;font-size:11px;border-radius:999px;">✓ GAGNÉ</span>' : p.res === 'lost' ? '<span style="padding:3px 10px;background:rgba(248,113,113,.15);color:#fca5a5;font-weight:700;font-size:11px;border-radius:999px;">✗ PERDU</span>' : '<span style="padding:3px 10px;background:rgba(148,163,184,.15);color:#94a3b8;font-weight:600;font-size:11px;border-radius:999px;">? n/a</span>') : '';
      const teamLogo = (src) => src ? `<img src="${esc(src)}" alt="" style="width:22px;height:22px;object-fit:contain;border-radius:3px;" loading="lazy">` : '<span style="display:inline-block;width:22px;height:22px;"></span>';
      // v30 — Countdown intégré sous l'heure : "dans 9h57" / "dans 25 min"
      const _cntLabel = (() => {
        const ko = new Date(p.m.date).getTime();
        if (!isFinite(ko)) return '';
        const diffMs = ko - Date.now();
        if (diffMs < -60000) return p.settled ? '' : 'commencé';
        if (diffMs < 60000) return 'maintenant';
        const min = Math.round(diffMs / 60000);
        if (min < 60) return `${min} min`;
        const h = Math.floor(min / 60);
        if (h < 24) return `${h}h${String(min % 60).padStart(2, '0')}`;
        const d = Math.floor(h / 24);
        return `${d}j ${h % 24}h`;
      })();
      const _cntSoon = (() => {
        const diff = (new Date(p.m.date).getTime()) - Date.now();
        return diff < 60 * 60000 && diff > -60000;
      })();
      const _cntColor = isFini ? 'var(--text-dim2)' : _cntSoon ? '#fbbf24' : 'var(--text-dim2)';
      return `<div class="tous-row" data-match-id="${esc(String(p.m.id || ''))}" data-match-date="${esc(String(p.m.date || ''))}" style="display:grid;gap:14px;padding:14px 16px;background:var(--panel);border:1px solid var(--border);border-left:3px solid ${isFini ? (p.res==='won'?'#34d399':p.res==='lost'?'#fca5a5':'var(--text-dim)') : (p.rel>=0.70 ? 'var(--accent)' : 'var(--brand)')};border-radius:0 10px 10px 0;align-items:center;cursor:pointer;font-variant-numeric:tabular-nums;">
        <div style="text-align:left;">
          <div style="font-size:11px;color:var(--text-dim2,#7b8693);font-weight:600;">${sportEm} ${esc(tLbl)}</div>
          ${!isFini && _cntLabel ? `<div class="tous-cnt" style="font-size:9.5px;color:${_cntColor};margin-top:1px;font-weight:600;${_cntSoon?'background:rgba(251,191,36,.12);padding:1px 5px;border-radius:3px;display:inline-block;':''}">${esc(_cntLabel)}</div>` : ''}
          <div style="font-size:10px;color:var(--text-dim);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70px;" title="${esc(league)}">${esc(league.slice(0,22))}</div>
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--text);font-weight:600;">
            ${teamLogo(hLogo)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(hn)}</span><span style="color:var(--text-dim);font-weight:400;">vs</span>${teamLogo(aLogo)}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(an)}</span>
          </div>
          <div style="font-size:12px;color:var(--brand);font-weight:600;margin-top:3px;">→ ${esc(pickLabel)}</div>
          ${isFoot && topScore ? `
            <div style="font-size:11px;color:var(--text-dim);margin-top:3px;font-variant-numeric:tabular-nums;">
              <span style="opacity:.75;">Score prédit</span>
              <b style="color:var(--text);">${topScore.home}-${topScore.away}</b>
              ${typeof topScore.prob === 'number' ? `<span style="color:var(--text-dim2);font-size:10px;">(${(topScore.prob*100).toFixed(0)}%)</span>` : ''}
              ${hasRealScore ? `<span style="color:var(--text-dim2);">→</span><b style="color:${scoreCorrect ? '#34d399' : 'var(--text-dim)'};">${realHome}-${realAway}</b><span style="font-size:11px;">${scoreCorrect ? ' ✓' : ' ✗'}</span>` : ''}
            </div>` : ''}
          ${isFoot && (predScorers.length || realScorers.length) ? `
            <div style="font-size:11px;color:var(--text-dim);margin-top:2px;line-height:1.35;">
              ${predScorers.length ? `<span style="opacity:.75;">⚽ Buteurs probables :</span> <b style="color:var(--text);">${predScorers.map(s => `${esc(s.name)} (${Math.round(s.prob*100)}%)`).join(', ')}</b>` : ''}
              ${realScorers.length ? `${predScorers.length ? '<br>' : ''}<span style="opacity:.75;">→ Marqueurs :</span> <b style="color:${predScorerHit ? '#34d399' : 'var(--text)'};">${realScorers.map(s => `${esc(s.name)}${s.minute ? ` ${esc(s.minute)}` : ''}`).join(', ')}</b>${predScorerHit ? ' <span style="color:#34d399;">✓ pick touché</span>' : ''}` : ''}
            </div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:2px;font-size:11px;">
          <div><span style="color:var(--text-dim2);border-bottom:1px dotted var(--text-dim2);cursor:help;" title="Confiance du modèle : probabilité estimée que ce pari gagne. ≥70 % = très fiable.">Conf</span> <b style="color:${confColor};">${Math.round(p.rel*100)}%</b> · <span style="color:var(--text-dim2);border-bottom:1px dotted var(--text-dim2);cursor:help;" title="Cote décimale Winamax. Gain potentiel = mise × cote. Ex : 10 € @ 2.10 → 21 €.">Cote</span> <b style="color:var(--text);">@${p.odd.toFixed(2)}</b></div>
          <div><span style="color:var(--text-dim2);border-bottom:1px dotted var(--text-dim2);cursor:help;" title="Edge = notre probabilité − probabilité implicite de la cote. > 0 = on est plus optimiste que le bookmaker (=valeur).">Edge</span> <b style="color:${edgeColor};">${p.edge>=0?'+':''}${Math.round(p.edge*100)}pt</b></div>
        </div>
        <div style="text-align:right;">
          ${isFini ? resBadge : ''}
        </div>
      </div>`;
    };

    // v30 — Empty state UX : on aide l'utilisateur à passer à demain ou
    // vider les filtres au lieu de juste afficher "Aucun match".
    const _emptyState = (msg, withTomorrow) => `
      <div style="padding:48px 24px;text-align:center;color:var(--text-dim);">
        <div style="font-size:32px;margin-bottom:10px;line-height:1;opacity:.5;">📅</div>
        <div style="font-size:14px;margin-bottom:14px;">${msg}</div>
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
          ${filtersActive ? '<button data-tous-reset style="padding:8px 14px;font-size:12px;background:transparent;color:var(--text);border:1px solid var(--border-2);border-radius:8px;cursor:pointer;font-weight:600;">↻ Vider les filtres</button>' : ''}
          ${withTomorrow ? '<button data-go-tomorrow style="padding:8px 14px;font-size:12px;background:var(--brand);color:#08080a;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Voir demain →</button>' : ''}
        </div>
      </div>`;
    const pendingHtml = pending.length
      ? pending.map(p => renderRow(p, false)).join('')
      : _emptyState("Aucun match à venir pour aujourd'hui.", true);
    const inProgressHtml = inProgress.length
      ? inProgress.map(p => renderRow(p, false)).join('')
      : _emptyState("Aucun match en cours.", false);
    const finishedHtml = finished.length
      ? finished.map(p => renderRow(p, true)).join('')
      : _emptyState("Aucun match terminé aujourd'hui.", false);

    wrap.innerHTML = `
      <div style="max-width:1100px;margin:0 auto;padding:16px 8px 24px;font-variant-numeric:tabular-nums;">
        <div style="padding:40px 0 20px;border-bottom:1px solid var(--border);">
          <div style="font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:6px;">Aujourd'hui · Winamax</div>
          <h1 style="margin:0 0 6px;font-size:32px;font-weight:800;letter-spacing:-1.1px;color:var(--text);line-height:1.1;">Tous les pronos du jour</h1>
          <div style="font-size:14px;color:var(--text-dim);">${pending.length + inProgress.length} prono${(pending.length + inProgress.length)>1?'s':''} value · ${pending.length} à venir · ${inProgress.length} en cours · ${finished.length} fini${finished.length>1?'s':''}${settledCount ? ` (<b style="color:${wrPct>=60?'#34d399':'var(--text-dim)'};">${wrPct}% réussite</b> sur ${settledCount})` : ''}${filtersActive ? `&nbsp;·&nbsp;<span style="color:var(--brand);font-weight:600;">filtres actifs</span>` : ''}<div style="font-size:11px;color:var(--text-dim2);margin-top:3px;">↳ paris à venir/en cours = edge ≥ -2pt (bad value filtré). Finis = tous les picks pour tracker la perf modèle.</div></div>
        </div>

        <!-- v30 Sprint 4 — Filter bar (sticky on scroll, slides under topbar at top:56px) -->
        <div class="tous-filter-bar" style="position:sticky;top:56px;z-index:20;margin:18px 0 10px;padding:14px;background:var(--panel);border:1px solid var(--border);border-radius:10px;display:flex;flex-direction:column;gap:12px;backdrop-filter:saturate(140%) blur(8px);-webkit-backdrop-filter:saturate(140%) blur(8px);">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.8px;font-weight:700;">🎛️ Filtrer &amp; trier</div>
              <!-- v31.2 — Compteur résultats explicite (audit UX). Le visiteur voit
                   immédiatement combien de matchs passent les filtres actuels. -->
              <span aria-live="polite" style="display:inline-flex;align-items:center;padding:3px 9px;background:rgba(167,139,250,.15);border:1px solid rgba(167,139,250,.3);border-radius:999px;font-size:11.5px;font-weight:700;color:var(--brand);font-variant-numeric:tabular-nums;">${pending.length + inProgress.length + finished.length} résultat${(pending.length + inProgress.length + finished.length)>1?'s':''}</span>
            </div>
            ${filtersActive ? '<button data-tous-reset style="padding:5px 10px;font-size:11px;background:transparent;color:var(--text-dim);border:1px solid var(--border-2);border-radius:6px;cursor:pointer;font-weight:600;">↻ Réinitialiser</button>' : ''}
          </div>
          ${sportsAvailable.length > 1 ? `
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-size:11.5px;color:var(--text-dim);min-width:42px;">Sport</span>
            ${sportsAvailable.map(s => {
              const isOn = tousFilters.sports.includes(s);
              const lbl = sportLabelMap[s] || (s.charAt(0).toUpperCase() + s.slice(1));
              return `<button data-tous-sport="${esc(s)}" style="padding:6px 11px;font-size:12px;border-radius:999px;cursor:pointer;font-weight:600;border:1px solid ${isOn?'var(--brand)':'var(--border-2)'};background:${isOn?'rgba(167,139,250,.18)':'transparent'};color:${isOn?'var(--brand)':'var(--text-2)'};">${esc(lbl)}</button>`;
            }).join('')}
          </div>` : ''}
          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            <label style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--text-dim);">
              Edge min
              <select data-tous-edge style="padding:5px 8px;font-size:12px;background:var(--panel-2);color:var(--text);border:1px solid var(--border-2);border-radius:6px;cursor:pointer;">
                <option value="0" ${tousFilters.minEdge===0?'selected':''}>—</option>
                <option value="0.03" ${tousFilters.minEdge===0.03?'selected':''}>+3%</option>
                <option value="0.05" ${tousFilters.minEdge===0.05?'selected':''}>+5%</option>
                <option value="0.08" ${tousFilters.minEdge===0.08?'selected':''}>+8%</option>
                <option value="0.10" ${tousFilters.minEdge===0.10?'selected':''}>+10%</option>
              </select>
            </label>
            <label style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--text-dim);">
              Confiance min
              <select data-tous-conf style="padding:5px 8px;font-size:12px;background:var(--panel-2);color:var(--text);border:1px solid var(--border-2);border-radius:6px;cursor:pointer;">
                <option value="0" ${tousFilters.minConf===0?'selected':''}>—</option>
                <option value="0.50" ${tousFilters.minConf===0.50?'selected':''}>50%</option>
                <option value="0.60" ${tousFilters.minConf===0.60?'selected':''}>60%</option>
                <option value="0.70" ${tousFilters.minConf===0.70?'selected':''}>70%</option>
                <option value="0.80" ${tousFilters.minConf===0.80?'selected':''}>80%</option>
              </select>
            </label>
            <label style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;color:var(--text-dim);margin-left:auto;">
              Trier par
              <select data-tous-sort style="padding:5px 8px;font-size:12px;background:var(--panel-2);color:var(--text);border:1px solid var(--border-2);border-radius:6px;cursor:pointer;">
                <option value="kickoff" ${tousSort==='kickoff'?'selected':''}>⏱️ Heure du match</option>
                <option value="edge" ${tousSort==='edge'?'selected':''}>📈 Meilleur edge</option>
                <option value="conf" ${tousSort==='conf'?'selected':''}>🎯 Plus haute confiance</option>
                <option value="odd" ${tousSort==='odd'?'selected':''}>💰 Cote la plus basse</option>
              </select>
            </label>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin:0 0 14px;flex-wrap:wrap;">
          <button data-tous-tab="pending" style="padding:10px 18px;border-radius:8px;border:1px solid ${activeTab==='pending'?'var(--brand)':'var(--border-2)'};background:${activeTab==='pending'?'rgba(167,139,250,.15)':'var(--panel)'};color:${activeTab==='pending'?'var(--brand)':'var(--text-2)'};font-weight:700;font-size:13px;cursor:pointer;">⏱️ À venir <span style="opacity:.7;">(${pending.length})</span></button>
          <button data-tous-tab="inprogress" style="padding:10px 18px;border-radius:8px;border:1px solid ${activeTab==='inprogress'?'var(--brand)':'var(--border-2)'};background:${activeTab==='inprogress'?'rgba(167,139,250,.15)':'var(--panel)'};color:${activeTab==='inprogress'?'var(--brand)':'var(--text-2)'};font-weight:700;font-size:13px;cursor:pointer;">🔴 En cours <span style="opacity:.7;">(${inProgress.length})</span></button>
          <button data-tous-tab="finished" style="padding:10px 18px;border-radius:8px;border:1px solid ${activeTab==='finished'?'var(--brand)':'var(--border-2)'};background:${activeTab==='finished'?'rgba(167,139,250,.15)':'var(--panel)'};color:${activeTab==='finished'?'var(--brand)':'var(--text-2)'};font-weight:700;font-size:13px;cursor:pointer;">✅ Finis <span style="opacity:.7;">(${finished.length})</span></button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${activeTab === 'pending' ? pendingHtml : activeTab === 'inprogress' ? inProgressHtml : finishedHtml}
        </div>
      </div>`;

    // Tab switching
    wrap.querySelectorAll('[data-tous-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        try { localStorage.setItem('tousTab', btn.dataset.tousTab); } catch(e) {}
        renderTousPage(wrap);
      });
    });
    // Row click → openDetail (reuses existing match detail modal)
    // FIX bug Tous-modal-undefined : openDetail(match) attend un objet
    // match complet, pas juste un id. Avant : openDetail(id) → getSides
    // recevait une string → home/away undefined → "undefined vs undefined"
    // dans la modale (visible quand l'utilisateur clique sur n'importe
    // quelle ligne, ex Reims vs X). On reconstruit le match objet depuis
    // PRONOSTICS_DATA, même pattern que .agent-pos-row plus haut (l. 9171).
    wrap.querySelectorAll('.tous-row[data-match-id]').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.matchId;
        if (!id || typeof openDetail !== 'function') return;
        let found = null;
        Object.values((data && data.days) || {}).forEach(arr =>
          (arr || []).forEach(m => { if (String(m.id) === id) found = m; })
        );
        if (found) openDetail(found);
      });
    });
    // v30 Sprint 4 — Sport pill toggle
    wrap.querySelectorAll('[data-tous-sport]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = btn.dataset.tousSport;
        const i = tousFilters.sports.indexOf(s);
        if (i >= 0) tousFilters.sports.splice(i, 1);
        else tousFilters.sports.push(s);
        _saveFilters();
        renderTousPage(wrap);
      });
    });
    // Edge / conf selects
    const edgeSel = wrap.querySelector('[data-tous-edge]');
    if (edgeSel) edgeSel.addEventListener('change', () => {
      tousFilters.minEdge = parseFloat(edgeSel.value) || 0;
      _saveFilters();
      renderTousPage(wrap);
    });
    const confSel = wrap.querySelector('[data-tous-conf]');
    if (confSel) confSel.addEventListener('change', () => {
      tousFilters.minConf = parseFloat(confSel.value) || 0;
      _saveFilters();
      renderTousPage(wrap);
    });
    // Sort dropdown
    const sortSel = wrap.querySelector('[data-tous-sort]');
    if (sortSel) sortSel.addEventListener('change', () => {
      try { localStorage.setItem('tousSort', sortSel.value); } catch(e) {}
      renderTousPage(wrap);
    });
    // Reset all filters — querySelectorAll because the button can appear in
    // both the filter bar and any empty-state placeholder block.
    wrap.querySelectorAll('[data-tous-reset]').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          localStorage.removeItem('tousFilters');
          localStorage.removeItem('tousSort');
        } catch(e) {}
        renderTousPage(wrap);
      });
    });
    // v30 — "Voir demain" depuis l'empty state (pas de match aujourd'hui).
    // Délégué au bouton existant #next-day de la topbar pour rester DRY ;
    // ce dernier déjà gère le reload de la liste via render().
    wrap.querySelectorAll('[data-go-tomorrow]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextBtn = document.getElementById('next-day');
        if (nextBtn) nextBtn.click();
      });
    });
  }

  // ====== v29 — Page Crédibilité / Méthode ======
  // User's GPT feedback highlighted lack of credibility. This page surfaces
  // the model's real ROI from backtest_report_v2 + explains the method +
  // bankroll discipline. No hype, no "gains garantis" — just honest numbers.
  function renderCredibilitePage(wrap) {
    // v30 fix — Avant : on lisait __backtestReport (legacy v1, jamais
    // populé) au lieu de __backtestReportV2 (le vrai rapport généré
    // chaque semaine via backtest_v2.py). Résultat : ROI / WR affichaient
    // toujours "—" même quand le backtest existait.
    const bt = window.__backtestReportV2 || window.__backtestReport || null;
    const overall = bt?.overall;
    const roi = overall && isFinite(overall.flat_roi_pct) ? overall.flat_roi_pct.toFixed(1) : null;
    const bets = overall && isFinite(overall.n) ? overall.n : (bt && isFinite(bt.n_events) ? bt.n_events : null);
    const wr  = overall && isFinite(overall.win_rate) ? (overall.win_rate * 100).toFixed(1) : null;
    // date_range can be either an array [start, end] or {start, end} object
    const _dr = bt?.date_range;
    const _drStart = Array.isArray(_dr) ? _dr[0] : _dr?.start;
    const _drEnd = Array.isArray(_dr) ? _dr[1] : _dr?.end;
    const periodLabel = _drStart && _drEnd
      ? `du ${String(_drStart).slice(0,10)} au ${String(_drEnd).slice(0,10)}`
      : 'dernières semaines';

    // v30 — Calibration plot : the gold standard test for a probability model.
    // Si je dis "70% de chance", est-ce que 70% des prédictions à 70% gagnent ?
    // Source : backtest_report_v2.calibration (10 buckets de 10pt, déjà chargé
    // au boot via _loadModelCalibration → window.__modelCalibration).
    function _renderCalibrationSvg() {
      const cal = window.__modelCalibration;
      if (!cal || !Array.isArray(cal.bins) || cal.total_n < 5) {
        return `<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:13px;">
          <div style="font-size:32px;margin-bottom:6px;opacity:.4;">📊</div>
          <div>Pas assez de paris réglés pour calibrer (${cal?.total_n || 0}/5+ minimum).</div>
          <div style="font-size:11.5px;margin-top:4px;color:var(--text-dim2);">Le graphique apparaîtra dès que le backtest aura accumulé assez de matchs.</div>
        </div>`;
      }
      const W = 380, H = 280, P = 32;
      const usable = cal.bins.filter(b => b.n > 0 && b.prob_mean != null && b.win_rate != null);
      // Diagonal = perfect calibration
      const x = (p) => P + (W - 2*P) * p;
      const y = (p) => H - P - (H - 2*P) * p;
      // Average gap weighted by n (lower abs is better, ECE = expected calibration error)
      let ece = 0, totalN = 0;
      usable.forEach(b => { ece += b.n * Math.abs(b.gap || 0); totalN += b.n; });
      ece = totalN > 0 ? (ece / totalN) : 0;
      const eceColor = ece < 0.05 ? 'var(--accent)' : ece < 0.10 ? '#fbbf24' : '#f87171';
      const eceLabel = ece < 0.05 ? 'excellente' : ece < 0.10 ? 'correcte' : 'à recalibrer';
      // Min radius 4, max 14 based on n share
      const maxN = Math.max(...usable.map(b => b.n));
      const r = (n) => Math.max(4, Math.min(14, 4 + 10 * Math.sqrt(n / maxN)));
      const tickLabel = (v) => `${Math.round(v*100)}%`;
      return `
        <div style="display:flex;flex-direction:column;gap:14px;align-items:center;">
          <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:100%;height:auto;">
            <!-- Grid -->
            ${[0.25, 0.5, 0.75].map(t => `
              <line x1="${x(t).toFixed(1)}" y1="${P}" x2="${x(t).toFixed(1)}" y2="${H-P}" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="2,3"/>
              <line x1="${P}" y1="${y(t).toFixed(1)}" x2="${W-P}" y2="${y(t).toFixed(1)}" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="2,3"/>
            `).join('')}
            <!-- Axes -->
            <line x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}" stroke="var(--border-2)" stroke-width="1"/>
            <line x1="${P}" y1="${P}" x2="${P}" y2="${H-P}" stroke="var(--border-2)" stroke-width="1"/>
            <!-- Diagonal y=x = perfect calibration -->
            <line x1="${x(0).toFixed(1)}" y1="${y(0).toFixed(1)}" x2="${x(1).toFixed(1)}" y2="${y(1).toFixed(1)}" stroke="var(--text-dim)" stroke-width="1.5" stroke-dasharray="4,4" opacity=".6"/>
            <!-- Tick labels -->
            ${[0, 0.25, 0.5, 0.75, 1].map(t => `
              <text x="${x(t).toFixed(1)}" y="${(H-P+14).toFixed(1)}" font-size="10" fill="var(--text-dim)" text-anchor="middle">${tickLabel(t)}</text>
              <text x="${(P-6).toFixed(1)}" y="${(y(t)+3).toFixed(1)}" font-size="10" fill="var(--text-dim)" text-anchor="end">${tickLabel(t)}</text>
            `).join('')}
            <!-- Axis titles -->
            <text x="${W/2}" y="${H-6}" font-size="11" fill="var(--text-2)" text-anchor="middle" font-weight="600">Probabilité prédite (modèle)</text>
            <text x="12" y="${H/2}" font-size="11" fill="var(--text-2)" text-anchor="middle" font-weight="600" transform="rotate(-90 12 ${H/2})">Taux de réussite réel</text>
            <!-- Data points + Wilson 95% CI vertical bars (v31.7.7) -->
            ${(() => {
              // Wilson score interval at 95% (z=1.96). Plus robuste que normal
              // approximation pour petits n. Référence : Wilson (1927).
              const Z = 1.96;
              const Z2 = Z * Z;
              const wilsonCI = (k, n) => {
                if (!n || n < 1) return null;
                const p = k / n;
                const denom = 1 + Z2 / n;
                const center = (p + Z2 / (2*n)) / denom;
                const halfwidth = (Z * Math.sqrt((p*(1-p) + Z2/(4*n)) / n)) / denom;
                return { lo: Math.max(0, center - halfwidth), hi: Math.min(1, center + halfwidth) };
              };
              return usable.map(b => {
                const cx = x(b.prob_mean), cy = y(b.win_rate);
                const col = Math.abs(b.gap||0) < 0.05 ? '#34d399' : Math.abs(b.gap||0) < 0.10 ? '#fbbf24' : '#f87171';
                // Compute Wilson CI on actual win count (k = win_rate * n)
                const k = Math.round((b.win_rate || 0) * b.n);
                const ci = wilsonCI(k, b.n);
                const ciBar = ci ? `
                  <line x1="${cx.toFixed(1)}" y1="${y(ci.lo).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${y(ci.hi).toFixed(1)}" stroke="${col}" stroke-width="1.5" opacity=".4"/>
                  <line x1="${(cx-3).toFixed(1)}" y1="${y(ci.lo).toFixed(1)}" x2="${(cx+3).toFixed(1)}" y2="${y(ci.lo).toFixed(1)}" stroke="${col}" stroke-width="1.5" opacity=".4"/>
                  <line x1="${(cx-3).toFixed(1)}" y1="${y(ci.hi).toFixed(1)}" x2="${(cx+3).toFixed(1)}" y2="${y(ci.hi).toFixed(1)}" stroke="${col}" stroke-width="1.5" opacity=".4"/>
                ` : '';
                const ciLabel = ci ? ` · IC95% [${(ci.lo*100).toFixed(0)}-${(ci.hi*100).toFixed(0)}%]` : '';
                return `
                  ${ciBar}
                  <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r(b.n).toFixed(1)}" fill="${col}" opacity=".75" stroke="var(--bg)" stroke-width="1.5">
                    <title>Bucket ${(b.lo*100)|0}-${(b.hi*100)|0}% : prédit ${(b.prob_mean*100).toFixed(0)}%, réel ${(b.win_rate*100).toFixed(0)}% (n=${b.n})${ciLabel}</title>
                  </circle>`;
              }).join('');
            })()}
          </svg>
          <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px;font-size:11.5px;color:var(--text-dim);">
            <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#34d399;margin-right:4px;vertical-align:middle;"></span>écart &lt;5pt</div>
            <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#fbbf24;margin-right:4px;vertical-align:middle;"></span>écart 5-10pt</div>
            <div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#f87171;margin-right:4px;vertical-align:middle;"></span>écart &gt;10pt</div>
            <div><span style="display:inline-block;width:8px;height:1.5px;background:#7b8693;margin-right:4px;vertical-align:middle;"></span>IC 95% Wilson</div>
            <div style="opacity:.7;">— diagonale = calibration parfaite</div>
          </div>
          <div style="font-size:13px;color:var(--text-2);text-align:center;line-height:1.5;max-width:480px;">
            <b style="color:${eceColor};">Calibration ${eceLabel}</b> · écart moyen pondéré <b>${(ece*100).toFixed(1)} pt</b> sur ${totalN} paris.
            <span style="color:var(--text-dim);">Un modèle bien calibré place ses points sur la diagonale.</span>
          </div>
        </div>`;
    }
    wrap.innerHTML = `
      <div style="max-width:900px;margin:0 auto;padding:16px 12px 40px;">
        <div style="padding:40px 0 16px;border-bottom:1px solid var(--border);">
          <div style="font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:6px;">Méthode &amp; preuves</div>
          <h1 style="margin:0 0 10px;font-size:34px;font-weight:800;letter-spacing:-1.1px;color:var(--text);line-height:1.1;">Comment ça marche, et pourquoi me faire confiance</h1>
          <div style="font-size:14px;color:var(--text-dim);line-height:1.55;max-width:640px;">Pas de promesse de richesse facile. Juste un modèle qui analyse les données publiques, des règles de mise disciplinées, et un bilan vérifiable mis à jour automatiquement.</div>
        </div>

        <section style="margin-top:28px;">
          <h2 style="font-size:18px;margin:0 0 12px;color:var(--text);letter-spacing:-.3px;">📊 Performance vérifiable</h2>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;">
            <div style="padding:18px;background:var(--panel);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:0 10px 10px 0;">
              <div style="font-size:11px;color:var(--text-dim);letter-spacing:.5px;text-transform:uppercase;font-weight:700;">ROI</div>
              <div style="font-size:28px;font-weight:800;color:${roi != null && parseFloat(roi) > 0 ? 'var(--accent)' : 'var(--text)'};margin-top:4px;letter-spacing:-.6px;">${roi != null ? (parseFloat(roi) >= 0 ? '+' : '') + roi + '%' : '—'}</div>
              <div style="font-size:11px;color:var(--text-dim);margin-top:3px;">sur ${bets != null ? bets : '—'} paris</div>
            </div>
            <div style="padding:18px;background:var(--panel);border:1px solid var(--border);border-left:3px solid var(--brand);border-radius:0 10px 10px 0;">
              <div style="font-size:11px;color:var(--text-dim);letter-spacing:.5px;text-transform:uppercase;font-weight:700;">Taux de réussite</div>
              <div style="font-size:28px;font-weight:800;color:var(--text);margin-top:4px;letter-spacing:-.6px;">${wr != null ? wr + '%' : '—'}</div>
              <div style="font-size:11px;color:var(--text-dim);margin-top:3px;">${periodLabel}</div>
            </div>
            <div style="padding:18px;background:var(--panel);border:1px solid var(--border);border-left:3px solid #fbbf24;border-radius:0 10px 10px 0;">
              <div style="font-size:11px;color:var(--text-dim);letter-spacing:.5px;text-transform:uppercase;font-weight:700;">Discipline</div>
              <div style="font-size:28px;font-weight:800;color:var(--text);margin-top:4px;letter-spacing:-.6px;">Kelly ¼</div>
              <div style="font-size:11px;color:var(--text-dim);margin-top:3px;">max 10% / pari</div>
            </div>
          </div>
          <div style="margin-top:10px;font-size:12px;color:var(--text-dim2);line-height:1.5;"><b>Où vérifier :</b> la page <a href="#" class="page-btn" data-page="backtest" style="color:var(--brand);text-decoration:underline;cursor:pointer;">Performance</a> montre la courbe complète, par mois, par sport, avec chaque pari comptabilisé. Le script Python tourne chaque semaine en CI public sur GitHub — <b>tu peux re-rouler le backtest toi-même</b> pour valider les chiffres.</div>
        </section>

        <section style="margin-top:32px;">
          <h2 style="font-size:18px;margin:0 0 12px;color:var(--text);letter-spacing:-.3px;">🧮 Comment le modèle décide</h2>
          <div style="padding:18px;background:var(--panel);border:1px solid var(--border);border-radius:12px;line-height:1.6;font-size:13.5px;color:var(--text-2);">
            Le modèle combine <b>5 sources de signal</b> indépendantes, puis les confronte pour trouver les paris où <b>notre estimation est plus optimiste que la cote du bookmaker</b>. C'est ça, la valeur :
            <ul style="margin:10px 0 0;padding-left:20px;color:var(--text);">
              <li><b>Cote du marché</b> — prior bayésien, reflète ce que sait le bookmaker</li>
              <li><b>Buts attendus (xG/Poisson)</b> — force d'attaque × défense × domicile</li>
              <li><b>Forme récente pondérée</b> — 5 derniers matchs, décroissance exponentielle (le dernier compte ×2.5 vs le 5ᵉ)</li>
              <li><b>Classement &amp; bilan saison</b> — win-rate sur l'ensemble de la saison</li>
              <li><b>Force d'équipe (ELO)</b> — rating indépendant du championnat, mis à jour match après match</li>
              <li><b>Face-à-face H2H</b> — historique direct entre les deux équipes</li>
            </ul>
            <div style="margin-top:12px;">Chaque composante donne sa propre probabilité de victoire. On les blende, on calcule le <b>désaccord entre sources</b> (fiabilité) et on <b>calibre le résultat</b> contre l'historique réel. Si moins de 2 composantes sont disponibles ou si la fiabilité calibrée est sous 45%, <b>le pari n'est pas proposé</b>.</div>
          </div>
        </section>

        <section style="margin-top:32px;">
          <h2 style="font-size:18px;margin:0 0 12px;color:var(--text);letter-spacing:-.3px;">🛡️ Gestion de cagnotte</h2>
          <div style="padding:18px;background:var(--panel);border:1px solid var(--border);border-radius:12px;line-height:1.6;font-size:13.5px;color:var(--text-2);">
            Les mises proposées utilisent <b>Kelly fractionnaire ×0.25</b>, plafonné à 10% de ta cagnotte par pari. C'est la méthode que les pros utilisent : maximise la croissance long-terme tout en évitant la ruine en cas de mauvaise série. Aucune mise ne dépasse 10% même si le modèle est très confiant — un pari à 80% peut perdre 1 fois sur 5, et 3 pertes d'affilée te coûteraient trop cher si tu misais gros.
          </div>
        </section>

        <section style="margin-top:32px;">
          <h2 style="font-size:18px;margin:0 0 12px;color:var(--text);letter-spacing:-.3px;">📊 Performance par segment</h2>
          ${(() => {
            const rep = window.__backtestReportV2;
            if (!rep) return '<div style="padding:18px;background:var(--panel);border:1px solid var(--border);border-radius:12px;color:var(--text-dim);font-size:13px;">Rapport backtest pas encore chargé.</div>';
            const fmtRoi = (n) => isFinite(n) ? `${n >= 0 ? '+' : ''}${n.toFixed(1)}%` : '—';
            const fmtWr = (n) => isFinite(n) ? `${(n*100).toFixed(0)}%` : '—';
            const fmtBrier = (n) => isFinite(n) ? n.toFixed(3) : '—';
            const colorOf = (roi) => !isFinite(roi) ? 'var(--text-dim)' : roi > 5 ? '#34d399' : roi < -5 ? '#f87171' : '#fbbf24';
            // v31.7.17 — Brier color : <0.20 excellent, 0.20-0.25 OK, >0.25 weak.
            const colorBrier = (b) => !isFinite(b) ? 'var(--text-dim)' : b < 0.20 ? '#34d399' : b < 0.25 ? '#fbbf24' : '#f87171';
            const rowOf = (label, d, sub) => {
              if (!d || !d.n) return '';
              const roi = d.flat_roi_pct;
              const col = colorOf(roi);
              const brier = d.brier;
              const colB = colorBrier(brier);
              return `<div style="display:grid;grid-template-columns:1fr 50px 70px 70px 60px;gap:8px;padding:9px 12px;border-bottom:1px solid var(--border);align-items:center;font-size:12.5px;">
                <div><b style="color:var(--text);">${esc(label)}</b>${sub?` <span style="color:var(--text-dim2);font-size:11px;">${esc(sub)}</span>`:''}</div>
                <div style="color:var(--text-dim);text-align:right;font-variant-numeric:tabular-nums;">${d.n} pari${d.n>1?'s':''}</div>
                <div style="color:var(--text-2);text-align:right;font-variant-numeric:tabular-nums;">${fmtWr(d.win_rate)} WR</div>
                <div style="color:${col};font-weight:700;text-align:right;font-variant-numeric:tabular-nums;">${fmtRoi(roi)}</div>
                <div title="Brier score (≤0.20 excellent, ≤0.25 OK, >0.25 faible)" style="color:${colB};font-weight:600;text-align:right;font-variant-numeric:tabular-nums;">${fmtBrier(brier)}</div>
              </div>`;
            };
            const headerOf = (lbl) => `<div style="display:grid;grid-template-columns:1fr 50px 70px 70px 60px;gap:8px;padding:8px 12px;font-size:10.5px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;font-weight:700;border-bottom:1px solid var(--border-2);background:var(--panel-2,rgba(255,255,255,.02));">
              <div>${esc(lbl)}</div><div style="text-align:right;">N</div><div style="text-align:right;">Réussite</div><div style="text-align:right;">ROI</div><div style="text-align:right;" title="Brier score : qualité calibration des probas">Brier</div>
            </div>`;
            // by_sport
            const bySport = Object.entries(rep.by_sport || {}).sort((a,b) => (b[1].n||0) - (a[1].n||0));
            const sportEmojiMap = { football:'⚽', tennis:'🎾', basketball:'🏀', hockey:'🏒', baseball:'⚾', 'american-football':'🏈', mma:'🥊', golf:'⛳', racing:'🏎️', rugby:'🏉' };
            const sportLabel = (k) => `${sportEmojiMap[k]||'🎯'} ${k.charAt(0).toUpperCase()+k.slice(1)}`;
            const sportRows = bySport.map(([k,v]) => rowOf(sportLabel(k), v)).join('');
            // by_cote_bucket
            const bucketLabels = { heavy_fav: 'Très favori', fav: 'Favori', dog: 'Outsider' };
            const bucketSub = { heavy_fav: 'cote ≤1.5', fav: 'cote 1.5–2.5', dog: 'cote ≥3.5' };
            const cb = rep.by_cote_bucket || {};
            const bucketRows = ['heavy_fav','fav','dog'].map(k => rowOf(bucketLabels[k]||k, cb[k], bucketSub[k])).join('');
            // by_tier
            const tier = rep.by_tier || {};
            const tierRows = [['lock','🔒 Locks','fiabilité ≥72%'],['standard','📋 Standards','autres picks']].map(([k,l,sub]) => rowOf(l, tier[k], sub)).join('');
            return `
              <div style="display:grid;grid-template-columns:1fr;gap:14px;">
                <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;overflow:hidden;">
                  ${headerOf('Par sport')}
                  ${sportRows || '<div style="padding:14px;color:var(--text-dim);font-size:12px;">Pas encore de paris réglés par sport.</div>'}
                </div>
                <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;overflow:hidden;">
                  ${headerOf('Par bucket de cote')}
                  ${bucketRows || '<div style="padding:14px;color:var(--text-dim);font-size:12px;">Pas encore de paris réglés par bucket.</div>'}
                </div>
                <div style="background:var(--panel);border:1px solid var(--border);border-radius:12px;overflow:hidden;">
                  ${headerOf('Par tier de confiance')}
                  ${tierRows || '<div style="padding:14px;color:var(--text-dim);font-size:12px;">Pas encore de paris réglés par tier.</div>'}
                </div>
              </div>
              <div style="margin-top:10px;font-size:11.5px;color:var(--text-dim2);line-height:1.5;">
                ROI = bénéfice net ÷ mise totale, à mise plate 1€/pari. Un ROI négatif sur un sport veut dire qu'<b>il vaut mieux skip ce sport</b> tant que le modèle ne s'améliore pas dessus.
              </div>`;
          })()}
        </section>

        <!-- v30 — Section CLV retirée : elle agrégeait les paris trackés (loadTrackedBets). -->

        </section>

        <section style="margin-top:32px;">
          <h2 style="font-size:18px;margin:0 0 12px;color:var(--text);letter-spacing:-.3px;">🎯 Calibration du modèle</h2>
          <div style="padding:18px;background:var(--panel);border:1px solid var(--border);border-radius:12px;line-height:1.55;font-size:13.5px;color:var(--text-2);margin-bottom:14px;">
            Le test ultime d'un modèle de probabilité : <b>quand je dis "70% de chance", est-ce que 70% de ces prédictions gagnent vraiment ?</b> Si oui, le modèle est calibré (honnête). Si non, ses pourcentages sont du bruit.
          </div>
          ${(() => {
            // v31.7.13 — Dropdown granularité bins (5/10/20). Backend prêt
            // depuis v31.7.10 (calibration_5/10/20 dans backtest_report_v2).
            const bt = window.__backtestReportV2;
            if (!bt || !bt.calibration_5 || !bt.calibration_20) return '';
            return `
            <div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;margin:0 4px 8px;font-size:12px;">
              <span style="color:var(--text-dim);">Granularité</span>
              <select id="cred-bins-select" style="background:var(--panel-2);color:var(--text);border:1px solid var(--border-2);border-radius:6px;padding:5px 8px;font-size:12px;cursor:pointer;font-family:inherit;">
                <option value="5">5 bins (gros tableaux)</option>
                <option value="10" selected>10 bins (défaut)</option>
                <option value="20">20 bins (fin grain)</option>
              </select>
            </div>`;
          })()}
          <div id="cred-calibration-svg" style="padding:18px;background:var(--panel);border:1px solid var(--border);border-radius:12px;">
            ${_renderCalibrationSvg()}
          </div>
          <div style="margin-top:10px;font-size:12px;color:var(--text-dim2);line-height:1.5;">
            Chaque point représente un décile de probabilité (0-10%, 10-20%, …). Sa taille est proportionnelle au nombre de paris dans ce bucket. Plus les points sont proches de la diagonale, plus le modèle est honnête. Le calcul tourne chaque semaine en CI sur GitHub Actions, code source <code>backtest_v2.py</code>.
          </div>
        </section>

        <section style="margin-top:32px;">
          <h2 style="font-size:18px;margin:0 0 12px;color:var(--text);letter-spacing:-.3px;">⚠️ Ce que je ne promets pas</h2>
          <div style="padding:18px;background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.2);border-left:3px solid #fca5a5;border-radius:0 10px 10px 0;line-height:1.6;font-size:13.5px;color:var(--text-2);">
            Pas de gains garantis. Pas de "système miracle". Pas de doublement de mise après une perte. Les paris sportifs restent <b>risqués et aléatoires sur chaque match pris individuellement</b> — la valeur n'apparaît que sur le long terme (500+ paris). Si tu n'es pas prêt à perdre ta mise, ne parie pas. Le site existe pour <b>t'aider à prendre des décisions informées</b>, pas pour te faire croire à l'argent facile.
          </div>
        </section>

        <section style="margin-top:32px;padding-top:24px;border-top:1px solid var(--border);font-size:12px;color:var(--text-dim);">
          Code source, pipeline de données et backtest publics. Questions, suggestions : ouvre une issue sur le repo GitHub.
        </section>
      </div>`;
    // v31.7.13 — Wire dropdown granularité bins.
    const sel = wrap.querySelector('#cred-bins-select');
    const svgWrap = wrap.querySelector('#cred-calibration-svg');
    if (sel && svgWrap) {
      sel.addEventListener('change', (e) => {
        const n = e.target.value;
        const bt = window.__backtestReportV2;
        if (!bt) return;
        // Swap window.__modelCalibration.bins on the fly puis re-render
        const newBins = (n === '5') ? bt.calibration_5
                      : (n === '20') ? bt.calibration_20
                      : bt.calibration;
        if (newBins) {
          window.__modelCalibration = {
            bins: newBins,
            total_n: (bt.overall && bt.overall.n) || 0,
          };
          svgWrap.innerHTML = _renderCalibrationSvg();
        }
      });
    }
  }

  function renderAcademiePage(wrap) {
    const cards = [
      { icon: '🔒', title: 'Pari sûr', desc: `Un "pari sûr" c'est un match où notre calcul donne au moins 70% de chances de gagner. On n'appose cette étiquette que si plusieurs signaux disent la même chose : cote du bookmaker, puissance des équipes, forme récente, face-à-face. C'est là qu'il faut concentrer tes mises.`, color: '#ffd60a' },
      { icon: '💎', title: 'Pari avec avantage', desc: `Un pari "avec avantage" c'est quand on pense que l'équipe a plus de chances de gagner que ce que dit la cote. Le bookmaker sous-estime l'équipe — donc il y a de la valeur. Au-delà de +5% d'avantage, ça devient intéressant.`, color: '#bf5af2' },
      { icon: '📊', title: 'Mise recommandée', desc: `On te propose une mise qui grandit quand l'avantage grandit — mais qui reste toujours entre 2 et 5% de ta cagnotte. Ça maximise ta croissance long terme sans te faire sauter sur une mauvaise série.`, color: '#30d158' },
      { icon: '🧩', title: 'Combinés malins', desc: `Dans les combinés automatiques, on évite de mettre ensemble plusieurs matchs de la même ligue le même jour. Pourquoi ? Parce que si une surprise frappe une ligue (arbitre, météo, dynamique), elle peut plomber plusieurs matchs d'un coup.`, color: '#5e5ce6' },
      { icon: '⚠️', title: 'Mode panique', desc: `Si tu augmentes tes mises après 3 défaites d'affilée, une alerte apparaît. C'est le réflexe classique du parieur qui veut "se refaire" — et la cause numéro 1 de grosses pertes. On te freine avant que ça parte en vrille.`, color: '#ff3b30' },
      { icon: '🔥', title: 'Série en cours', desc: `Une série c'est un enchaînement de victoires ou de défaites. Même un bon système peut donner 3-4 défaites d'affilée. À l'inverse, 5 victoires ne veulent pas dire que tu es invincible. Garde la tête froide, la moyenne finit toujours par revenir.`, color: '#ff9f0a' },
      { icon: '🎯', title: 'Qualité des données', desc: `On note la fraîcheur des infos avant chaque prono : cotes à jour ? forme récente connue ? face-à-face dispo ? Si on n'a pas assez d'infos fiables, on saute le match plutôt que de deviner.`, color: '#0a84ff' },
      { icon: '💰', title: 'Cagnotte simulée', desc: `Le Bilan affiche une cagnotte théorique qui démarre à 10€ et mise 1€ sur chaque pari sûr. Ça te dit honnêtement ce que la stratégie aurait rapporté si tu l'avais suivie depuis le début.`, color: '#30d158' },
      { icon: '📈', title: 'Rentabilité (ROI)', desc: `Sur 100€ misés, combien tu gagnes net ? +15% veut dire 15€ de bonus. Au-delà de +5% sur 100 paris et plus, tu bats sérieusement le bookmaker — ta stratégie crée de la valeur.`, color: '#5e5ce6' },
      { icon: '🎰', title: 'Ce que dit la cote', desc: `La cote reflète la probabilité vue par le bookmaker. Cote 2,00 = 50% selon lui. Cote 1,50 = 66%. Cote 3,00 = 33%. Il rajoute une marge au passage — c'est sa commission.`, color: '#bf5af2' },
      { icon: '🏦', title: 'Gestion de cagnotte', desc: `Règle d'or : jamais plus de 2 à 5% de ta cagnotte sur un seul pari. Même un pari sûr à 70% peut perdre — et la poisse peut t'enchaîner 5 défaites. Si tu mises 10%, une mauvaise série te met à sec.`, color: '#ffd60a' },
      { icon: '🤖', title: 'Ton coach IA', desc: `L'IA du site ne contacte aucun serveur : elle lit tes paris, ton historique, tes résultats, et commente en direct depuis ton téléphone. Tout reste chez toi.`, color: '#5e5ce6' },
      { icon: '🎯', title: 'Calibration du modèle', desc: `C'est le test ultime d'honnêteté d'un modèle de proba : quand on dit "70% de chance", est-ce que 70% de ces prédictions gagnent vraiment ? Sur la page Crédibilité, tu vois un graphique qui place les vraies fréquences contre les probas annoncées. Plus c'est proche de la diagonale, plus le modèle ne ment pas.`, color: '#34d399' },
      { icon: '💎', title: 'Edge en points', desc: `L'edge mesure de combien notre proba dépasse celle implicite dans la cote du bookmaker. +5pt = on est 5% plus optimiste. À long terme c'est ce qui crée la valeur — sans edge positif récurrent, tu ne battras jamais le bookmaker.`, color: '#a78bfa' },
      { icon: '⚡', title: 'Match imminent', desc: `Sur le dashboard, un pari qui commence dans moins de 30 minutes est mis en évidence avec un bord ambre pulsant. Visuel d'urgence : c'est maintenant ou jamais — soit tu paries, soit tu skip ce match.`, color: '#fbbf24' },
    ];
    const cardsHtml = cards.map(c => `
      <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;transition:all .2s;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--shadow)';this.style.borderColor='${c.color}44';" onmouseout="this.style.transform='';this.style.boxShadow='';this.style.borderColor='var(--border)';">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <div style="width:40px;height:40px;border-radius:10px;background:${c.color}18;display:grid;place-items:center;font-size:20px;">${c.icon}</div>
          <h3 style="margin:0;font-size:16px;font-weight:700;color:var(--text);letter-spacing:-.3px;">${esc(c.title)}</h3>
        </div>
        <div style="font-size:13.5px;color:var(--text-2);line-height:1.55;">${esc(c.desc)}</div>
      </div>`).join('');

    wrap.innerHTML = `
      <div style="max-width:1100px;margin:0 auto;padding:16px 8px 24px;">
        <div style="margin-bottom:32px;padding:40px 0 24px;border-bottom:1px solid var(--border);">
          <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:6px;">Pédagogie</div>
          <h1 style="margin:0 0 8px;font-size:40px;font-weight:800;letter-spacing:-1.4px;color:var(--text);line-height:1.1;">Guide</h1>
          <div style="font-size:15px;color:var(--text-dim);max-width:560px;">Les notions importantes derrière chaque page. Lis ça une fois, reviens quand tu doutes.</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;">
          ${cardsHtml}
        </div>
      </div>`;
  }

  // ====== v23 — Page Buteurs (prono buts/BTTS foot) ======
  function renderButeursPage(wrap) {
    const data = window.PRONOSTICS_DATA;
    const todayIso = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const matches = [];
    [todayIso, tomorrowIso].forEach(iso => {
      ((data && data.days && data.days[iso]) || []).forEach(m => {
        if (m.sport !== 'football') return;
        if (m.completed) return;
        if (!(m.winamax && m.winamax.available === true)) return;
        try {
          const pred = predictMatch(m);
          if (!pred || !pred.markets || !pred.markets.ou || !pred.markets.btts) return;
          matches.push({ m, pred, dayIso: iso });
        } catch(e){}
      });
    });

    // v24.2 — Trier d'abord par disponibilité des compositions (prono buteur possible), puis par meilleur pari buts
    matches.forEach(entry => {
      const h = entry.m.competitors.find(c => c.home_away === 'home');
      const a = entry.m.competitors.find(c => c.home_away === 'away');
      entry.hasLineup = !!(
        (h && h.lineup && h.lineup.starters && h.lineup.starters.length) ||
        (a && a.lineup && a.lineup.starters && a.lineup.starters.length)
      );
    });
    matches.sort((a,b) => {
      // Compositions dispos = priorité max
      if (a.hasLineup !== b.hasLineup) return a.hasLineup ? -1 : 1;
      // Puis par proba max OU/BTTS
      const sa = Math.max(a.pred.markets.ou.prob || 0, a.pred.markets.btts.prob || 0);
      const sb = Math.max(b.pred.markets.ou.prob || 0, b.pred.markets.btts.prob || 0);
      return sb - sa;
    });

    const fmtDate = (iso) => iso === todayIso ? "Aujourd'hui" : "Demain";
    const confLabel = (p) => p >= 0.72 ? { text: 'Très probable', color: 'var(--accent)' } :
                              p >= 0.60 ? { text: 'Probable', color: 'var(--info)' } :
                              p >= 0.45 ? { text: 'Incertain', color: 'var(--warn)' } :
                                          { text: 'Peu probable', color: 'var(--danger)' };

    const cardHtml = (entry) => {
      const { m, pred, dayIso } = entry;
      // v24.3 fix — noms équipes depuis competitors (m.home/m.away n'existent pas)
      const homeC = m.competitors && m.competitors.find(c => c.home_away === 'home') || {};
      const awayC = m.competitors && m.competitors.find(c => c.home_away === 'away') || {};
      const homeName = homeC.name || homeC.short || '?';
      const awayName = awayC.name || awayC.short || '?';
      const ou = pred.markets.ou, btts = pred.markets.btts;
      const ouImplied = ou.prob > 0.02 ? (1 / ou.prob) : null;
      const bttsImplied = btts.prob > 0.02 ? (1 / btts.prob) : null;
      const xgH = pred.poisson ? pred.poisson.xgH : null;
      const xgA = pred.poisson ? pred.poisson.xgA : null;
      const xgTotal = (xgH != null && xgA != null) ? (xgH + xgA) : null;
      const ouConf = confLabel(ou.prob);
      const bttsConf = confLabel(btts.prob);
      const hour = (() => { try { return new Date(m.date).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', timeZone:'Europe/Paris' }); } catch(e){ return ''; }})();

      return `
        <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px;margin-bottom:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
            <div style="min-width:0;flex:1;">
              <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.6px;font-weight:600;margin-bottom:2px;">${fmtDate(dayIso)} ${hour ? '· ' + hour : ''} · ${esc(m.league_name || m.league_code || '')}</div>
              <div style="font-size:16px;font-weight:700;color:var(--text);letter-spacing:-.2px;">${esc(homeName)} <span style="color:var(--text-dim);font-weight:500;">vs</span> ${esc(awayName)}</div>
            </div>
            ${xgTotal != null ? `<div style="background:var(--panel-2);border:1px solid var(--border);border-radius:var(--r);padding:6px 12px;text-align:center;">
              <div style="font-size:10px;color:var(--text-dim);">Buts attendus ${(typeof helpDot === 'function') ? helpDot('Nombre moyen de buts que notre calcul prévoit dans ce match (somme des deux équipes). <b>Exemple : 2,7 = match probablement riche en buts.</b> Au-delà de 3, le pari "+ de 2,5 buts" est souvent intéressant.') : ''}</div>
              <div style="font-size:18px;font-weight:800;color:var(--text);font-variant-numeric:tabular-nums;">${xgTotal.toFixed(1)}</div>
            </div>` : ''}
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
            <div style="background:var(--panel-2);border:1px solid var(--border);border-left:3px solid var(--brand);border-radius:var(--r);padding:12px 14px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
                <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;font-weight:700;">🥅 Nombre de buts</div>
                <span style="font-size:10px;padding:2px 8px;border-radius:999px;background:${ouConf.color}22;color:${ouConf.color};font-weight:700;">${ouConf.text}</span>
              </div>
              <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px;">${esc(ou.label)}</div>
              <div style="display:flex;gap:14px;font-size:12px;color:var(--text-2);font-variant-numeric:tabular-nums;">
                <span><b style="color:var(--text);">${(ou.prob*100).toFixed(0)}%</b> de chances</span>
                ${ouImplied ? `<span>cote ~<b style="color:var(--text);">${ouImplied.toFixed(2)}</b></span>` : ''}
              </div>
            </div>

            <div style="background:var(--panel-2);border:1px solid var(--border);border-left:3px solid var(--purple);border-radius:var(--r);padding:12px 14px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">
                <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;font-weight:700;">🔄 Les deux marquent ?</div>
                <span style="font-size:10px;padding:2px 8px;border-radius:999px;background:${bttsConf.color}22;color:${bttsConf.color};font-weight:700;">${bttsConf.text}</span>
              </div>
              <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px;">${esc(btts.label)}</div>
              <div style="display:flex;gap:14px;font-size:12px;color:var(--text-2);font-variant-numeric:tabular-nums;">
                <span><b style="color:var(--text);">${(btts.prob*100).toFixed(0)}%</b> de chances</span>
                ${bttsImplied ? `<span>cote ~<b style="color:var(--text);">${bttsImplied.toFixed(2)}</b></span>` : ''}
              </div>
            </div>
          </div>

          ${(() => {
            // v24 — Section "Joueurs qui peuvent marquer"
            const scorers = predictLikelyScorers(m, pred);
            if (!scorers || !scorers.length) {
              // v24.2 — Calculer l'heure approximative de retour (1h avant kickoff)
              let returnTime = '';
              try {
                const ko = new Date(m.date);
                const when = new Date(ko.getTime() - 60 * 60 * 1000);
                if (!isNaN(when.getTime())) {
                  returnTime = when.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', timeZone:'Europe/Paris' });
                }
              } catch(e){}
              return `<div style="margin-top:12px;padding:12px 14px;background:var(--info-soft);border:1px solid rgba(96,165,250,.25);border-radius:var(--r);font-size:12px;color:var(--text-2);line-height:1.5;">
                <div style="font-weight:700;color:var(--info);margin-bottom:3px;">⏳ Prono joueurs buteurs : bientôt dispo</div>
                <div>Les compositions officielles sont annoncées <b>1 heure avant le coup d'envoi</b>${returnTime ? ` — reviens vers <b>${returnTime}</b>` : ''}. D'ici là, on ne peut pas estimer qui va marquer.</div>
              </div>`;
            }
            const top = scorers.slice(0, 5);
            const rows = top.map(s => {
              const probPct = (s.prob * 100).toFixed(0);
              const confColor = s.prob >= 0.50 ? 'var(--accent)' : s.prob >= 0.35 ? 'var(--info)' : s.prob >= 0.22 ? 'var(--warn)' : 'var(--text-dim)';
              const posIcon = s.pos === 'F' ? '⚔️' : s.pos === 'M' ? '🎯' : s.pos === 'D' ? '🛡️' : '🧤';
              // v29 — face shot via Sofascore CDN when the Sofascore player id
              // is known ; falls back to the position emoji when not available.
              const faceHtml = s.pid
                ? `<img src="https://img.sofascore.com/api/v1/player/${s.pid}/image" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover;background:var(--bg);border:1px solid var(--border);" onerror="this.outerHTML='<div style=\\'font-size:14px;width:28px;height:28px;display:grid;place-items:center;\\'>${posIcon}</div>'">`
                : `<div style="font-size:14px;width:28px;height:28px;display:grid;place-items:center;">${posIcon}</div>`;
              return `
                <div style="display:grid;grid-template-columns:28px 1fr auto auto;gap:10px;padding:7px 10px;border-bottom:1px solid var(--border);align-items:center;">
                  ${faceHtml}
                  <div style="min-width:0;">
                    <div style="font-size:13px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(s.name)}${s.captain ? ' <span style="color:var(--gold);font-size:10px;" title="Capitaine">©</span>' : ''}</div>
                    <div style="font-size:10.5px;color:var(--text-dim);">${esc(s.teamShort)}</div>
                  </div>
                  <div style="font-size:11px;color:var(--text-dim);font-variant-numeric:tabular-nums;">${s.impliedOdd ? 'cote ~' + s.impliedOdd.toFixed(2) : '—'}</div>
                  <div style="font-size:13px;font-weight:700;color:${confColor};font-variant-numeric:tabular-nums;min-width:40px;text-align:right;">${probPct}%</div>
                </div>`;
            }).join('');
            return `
              <div style="margin-top:12px;background:var(--panel-2);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;">
                <div style="padding:10px 12px;background:var(--panel-3);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
                  <div style="font-size:12px;font-weight:700;color:var(--text);">🎯 Joueurs qui peuvent marquer</div>
                  <div style="font-size:10px;color:var(--text-dim);">Top ${top.length}${scorers.length > 5 ? ' sur ' + scorers.length : ''}</div>
                </div>
                ${rows}
                <div style="padding:8px 12px;font-size:10.5px;color:var(--text-dim);background:var(--panel-2);line-height:1.4;">
                  Basé sur les compositions annoncées, la position (attaquant/milieu/défenseur) et le nombre de buts attendu dans le match.
                </div>
              </div>`;
          })()}

          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
            ${(m.winamax && m.winamax.available === true) ? `<a href="${esc(winamaxUrl(m))}" target="_blank" rel="noopener" style="flex:1;text-align:center;background:var(--brand);color:#fff;text-decoration:none;padding:9px 14px;border-radius:var(--r);font-size:12.5px;font-weight:600;">🎰 Parier sur Winamax</a>` : `<div style="flex:1;text-align:center;background:var(--panel-2);color:var(--text-dim);padding:9px 14px;border-radius:var(--r);font-size:12.5px;">Cote pas encore dispo</div>`}
          </div>
        </div>`;
    };

    const cardsHtml = matches.length ? matches.slice(0, 25).map(cardHtml).join('')
      : `<div style="padding:48px 20px;text-align:center;color:var(--text-dim);background:var(--panel);border:1px dashed var(--border-2);border-radius:var(--r-lg);">
           <div style="font-size:40px;margin-bottom:12px;">⏳</div>
           <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:4px;">Pas encore de matchs foot à pronostiquer</div>
           <div style="font-size:12.5px;max-width:360px;margin:0 auto;">Les cotes Winamax pour les matchs d'aujourd'hui et demain ne sont pas encore ouvertes ou les matchs n'ont pas assez de données. Reviens en fin de matinée !</div>
         </div>`;

    // v24.2 — Stats pour la bannière
    const nWithLineup = matches.filter(x => x.hasLineup).length;
    const nTotal = matches.length;

    wrap.innerHTML = `
      <div style="max-width:1100px;margin:0 auto;padding:16px 8px 24px;">
        <div style="margin-bottom:28px;padding:32px 0 20px;border-bottom:1px solid var(--border);position:relative;">
          <div style="position:absolute;top:0;left:0;width:40px;height:3px;background:var(--accent);border-radius:0 0 2px 2px;"></div>
          <div style="font-size:11px;color:var(--accent);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:6px;">Prono buts · Football</div>
          <h1 style="margin:0 0 6px;font-size:40px;font-weight:800;letter-spacing:-1.4px;color:var(--text);line-height:1.1;">Buteurs</h1>
          <div style="font-size:15px;color:var(--text-dim);max-width:640px;">Deux pronos pour chaque match de foot : les <b>chances de buts</b> (+ de 2,5 buts / les 2 équipes marquent) ET les <b>joueurs les plus susceptibles de marquer</b>.</div>
        </div>

        ${nTotal > 0 ? `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:16px;">
          <div style="padding:12px 14px;background:var(--panel);border:1px solid var(--border);border-radius:var(--r);">
            <div style="font-size:10.5px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;font-weight:700;">Matchs analysés</div>
            <div style="font-size:22px;font-weight:800;color:var(--text);margin-top:2px;font-variant-numeric:tabular-nums;">${nTotal}</div>
          </div>
          <div style="padding:12px 14px;background:var(--panel);border:1px solid var(--border);border-radius:var(--r);">
            <div style="font-size:10.5px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;font-weight:700;">Compos dispo</div>
            <div style="font-size:22px;font-weight:800;color:${nWithLineup>0?'var(--accent)':'var(--text-dim)'};margin-top:2px;font-variant-numeric:tabular-nums;">${nWithLineup}</div>
            <div style="font-size:10.5px;color:var(--text-dim);">prono joueurs possibles</div>
          </div>
          <div style="padding:12px 14px;background:var(--panel);border:1px solid var(--border);border-radius:var(--r);">
            <div style="font-size:10.5px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;font-weight:700;">En attente</div>
            <div style="font-size:22px;font-weight:800;color:var(--warn);margin-top:2px;font-variant-numeric:tabular-nums;">${nTotal - nWithLineup}</div>
            <div style="font-size:10.5px;color:var(--text-dim);">compos annoncées 1h avant</div>
          </div>
        </div>` : ''}

        <div style="padding:12px 14px;background:var(--info-soft);border:1px solid rgba(96,165,250,.25);border-radius:var(--r);font-size:12.5px;color:var(--text-2);line-height:1.5;margin-bottom:16px;">
          <b style="color:var(--info);">💡 Comment ça marche ?</b> On estime les buts à partir de l'attaque/défense des deux équipes + le contexte (météo, arbitre, forme). Pour <b>les joueurs buteurs</b>, il nous faut la composition d'équipe — annoncée <b>1h avant le coup d'envoi</b>.
        </div>

        ${cardsHtml}

        ${matches.length > 25 ? `<div style="text-align:center;padding:12px;color:var(--text-dim);font-size:12px;">Seuls les 25 premiers matchs sont affichés.</div>` : ''}
      </div>`;
  }

  // v30 — renderBacktestPage simplifiée : ne rend QUE le rapport modèle
  // backtest_v2 (cron hebdo). Avant, cette page agrégeait aussi les paris
  // trackés par l'utilisateur (courbe 6 mois, attribution sport/signal).
  // Théo n'enregistre pas ses paris sur le site → tout ce bloc retiré.
  function renderBacktestPage(wrap) {
    wrap.innerHTML = `
      <div style="max-width:1100px;margin:0 auto;padding:16px 8px 24px;">
        <div style="margin-bottom:24px;padding:32px 0 20px;border-bottom:1px solid var(--border);position:relative;">
          <div style="position:absolute;top:0;left:0;width:40px;height:3px;background:var(--brand);border-radius:0 0 2px 2px;"></div>
          <div style="font-size:11px;color:var(--brand);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:6px;">Performance modèle · cron hebdo</div>
          <h1 style="margin:0 0 6px;font-size:40px;font-weight:800;letter-spacing:-1.4px;color:var(--text);line-height:1.1;">Performance</h1>
          <div style="font-size:15px;color:var(--text-dim);max-width:640px;">Backtest réel de <code>predictMatch</code> sur l'archive des matchs réglés. Cron <code>backtest.yml</code> rejoue tous les picks chaque dimanche, ROI/WR/Brier/calibration ci-dessous.</div>
        </div>

        <!-- Rapport backtest_v2 : vrai modèle predictMatch -->
        <div id="bt-v2" style="padding:20px;background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);">
          <div style="color:var(--text-dim);text-align:center;padding:24px;font-size:13px;">Chargement du backtest modèle…</div>
        </div>
      </div>`;
    _renderBacktestV2(wrap.querySelector('#bt-v2'));
  }

  // ============================================================
  // Chantier 3 — Backtest v2 (vrai modèle predictMatch via mini-racer,
  // généré par scripts/backtest_v2.py, cron hebdo .github/workflows/backtest.yml).
  // Source : backtest_report_v2.json à la racine.
  // ============================================================
  async function _renderBacktestV2(host) {
    if (!host) return;
    let rep = null;
    try {
      const r = await fetch('backtest_report_v2.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('http ' + r.status);
      rep = await r.json();
    } catch (e) {
      host.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:13px;">
        <div style="color:var(--warn);font-weight:600;margin-bottom:4px;">Rapport backtest indisponible</div>
        <div>Le cron hebdomadaire n'a pas encore produit <code>backtest_report_v2.json</code>. Il tourne chaque dimanche 03:00 UTC.</div>
      </div>`;
      return;
    }
    host.innerHTML = _renderBacktestV2HTML(rep);
  }

  function _renderBacktestV2HTML(rep) {
    const esc2 = (typeof esc === 'function') ? esc : (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const ov = rep.overall || {};
    const roi = ov.flat_roi_pct != null ? ov.flat_roi_pct : 0;
    const roiColor = roi >= 0 ? 'var(--accent)' : 'var(--danger)';
    const kellyColor = (ov.kelly_pnl || 0) >= 0 ? 'var(--accent)' : 'var(--danger)';
    const brier = ov.brier != null ? ov.brier.toFixed(4) : '—';
    // FIX audit #11 : null < 0.20 retourne `true` en JS → couleur verte
    // mensongère sur "—" Brier vide. Guard explicite.
    const brierColor = ov.brier == null
      ? 'var(--text-dim)'
      : ov.brier < 0.20 ? 'var(--accent)' : ov.brier < 0.24 ? '#fbbf24' : 'var(--danger)';
    const dateRange = rep.date_range || {};
    const gen = rep.generated_at ? new Date(rep.generated_at).toLocaleString('fr-FR', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';

    // Table helper
    const tableRow = (k, s) => {
      const wr = s.win_rate != null ? (s.win_rate * 100).toFixed(0) + '%' : '—';
      const r = s.flat_roi_pct != null ? (s.flat_roi_pct >= 0 ? '+' : '') + s.flat_roi_pct.toFixed(1) + '%' : '—';
      const rColor = (s.flat_roi_pct || 0) >= 0 ? 'var(--accent)' : 'var(--danger)';
      const b = s.brier != null ? s.brier.toFixed(3) : '—';
      return `<tr>
        <td style="padding:6px 10px;color:var(--text);">${esc2(k)}</td>
        <td style="padding:6px 10px;text-align:right;color:var(--text-dim);">${s.n}</td>
        <td style="padding:6px 10px;text-align:right;color:var(--text-dim);">${wr}</td>
        <td style="padding:6px 10px;text-align:right;color:${rColor};font-weight:700;">${r}</td>
        <td style="padding:6px 10px;text-align:right;color:var(--text-dim);">${b}</td>
      </tr>`;
    };
    const table = (title, rows) => rows.length ? `
      <div style="margin-top:18px;">
        <div style="font-size:10px;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase;font-weight:700;margin-bottom:6px;">${esc2(title)}</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums;">
          <thead><tr style="color:var(--text-dim);font-weight:600;border-bottom:1px solid var(--border);">
            <th style="padding:6px 10px;text-align:left;">Clé</th>
            <th style="padding:6px 10px;text-align:right;">N</th>
            <th style="padding:6px 10px;text-align:right;">WR</th>
            <th style="padding:6px 10px;text-align:right;">ROI</th>
            <th style="padding:6px 10px;text-align:right;">Brier</th>
          </tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>
      </div>` : '';

    const bySport = Object.entries(rep.by_sport || {}).sort((a,b) => b[1].n - a[1].n).map(([k,s]) => tableRow(k, s));
    const byTier = Object.entries(rep.by_tier || {}).map(([k,s]) => tableRow(k, s));
    const byCote = Object.entries(rep.by_cote_bucket || {}).map(([k,s]) => tableRow(k, s));
    const byLeague = Object.entries(rep.by_league || {}).sort((a,b) => b[1].n - a[1].n).slice(0, 8).map(([k,s]) => tableRow(k, s));

    // Calibration bars
    const calib = (rep.calibration || []).filter(b => b.n > 0);
    const calibHtml = calib.length ? `
      <div style="margin-top:18px;">
        <div style="font-size:10px;color:var(--text-dim);letter-spacing:1px;text-transform:uppercase;font-weight:700;margin-bottom:10px;">Calibration · fiabilité des probas</div>
        <div style="display:flex;flex-direction:column;gap:8px;font-size:12px;font-variant-numeric:tabular-nums;">
          ${calib.map(b => {
            const pm = (b.prob_mean * 100).toFixed(0);
            const wr = (b.win_rate * 100).toFixed(0);
            const gap = b.gap;
            const gapColor = Math.abs(gap) < 0.1 ? 'var(--accent)' : Math.abs(gap) < 0.2 ? '#fbbf24' : 'var(--danger)';
            const barW = Math.max(pm, wr);
            return `<div style="display:grid;grid-template-columns:80px 1fr 70px;gap:12px;align-items:center;">
              <div style="color:var(--text-dim);">${(b.lo*100).toFixed(0)}–${(b.hi*100).toFixed(0)}% <span style="opacity:.6;">(${b.n})</span></div>
              <div style="position:relative;height:18px;">
                <div style="position:absolute;left:0;top:0;height:8px;width:${pm}%;background:var(--brand);opacity:.5;border-radius:2px;" title="Proba moyenne ${pm}%"></div>
                <div style="position:absolute;left:0;bottom:0;height:8px;width:${wr}%;background:var(--accent);border-radius:2px;" title="Win rate réel ${wr}%"></div>
              </div>
              <div style="color:${gapColor};text-align:right;font-weight:700;">${gap >= 0 ? '+' : ''}${(gap*100).toFixed(0)}pt</div>
            </div>`;
          }).join('')}
        </div>
        <div style="margin-top:8px;font-size:10px;color:var(--text-dim);">
          Barres : <span style="color:var(--brand);">proba dite par le modèle</span> vs <span style="color:var(--accent);">win rate réel</span>. Gap = écart.
        </div>
      </div>` : '';

    return `
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
          <div style="font-size:11px;color:var(--brand);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;">Performance du modèle</div>
          <div style="font-size:22px;font-weight:800;color:var(--text);letter-spacing:-.6px;margin-top:2px;">Backtest du vrai predictMatch</div>
        </div>
        <div style="font-size:11px;color:var(--text-dim);">Généré ${esc2(gen)}${rep.n_events != null ? ` · ${rep.n_events} picks` : ''}</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;">
        <div style="padding:12px;background:var(--panel-2);border-radius:8px;">
          <div style="font-size:10px;color:var(--text-dim);letter-spacing:.6px;text-transform:uppercase;">Win rate</div>
          <div style="font-size:22px;font-weight:800;color:var(--text);margin-top:2px;">${((ov.win_rate||0)*100).toFixed(0)}%</div>
          <div style="font-size:10px;color:var(--text-dim);">${ov.wins||0}/${ov.n||0}</div>
        </div>
        <div style="padding:12px;background:var(--panel-2);border-radius:8px;">
          <div style="font-size:10px;color:var(--text-dim);letter-spacing:.6px;text-transform:uppercase;">ROI flat 1u</div>
          <div style="font-size:22px;font-weight:800;color:${roiColor};margin-top:2px;">${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%</div>
          <div style="font-size:10px;color:var(--text-dim);">${(ov.flat_pnl||0).toFixed(2)}u</div>
        </div>
        <div style="padding:12px;background:var(--panel-2);border-radius:8px;">
          <div style="font-size:10px;color:var(--text-dim);letter-spacing:.6px;text-transform:uppercase;">Kelly 0.25× cumul</div>
          <div style="font-size:22px;font-weight:800;color:${kellyColor};margin-top:2px;">${(ov.kelly_pnl||0) >= 0 ? '+' : ''}${(ov.kelly_pnl||0).toFixed(2)}u</div>
          <div style="font-size:10px;color:var(--text-dim);">bankroll 100u → ${(rep.bankroll_final_kelly||0).toFixed(2)}u</div>
        </div>
        <div style="padding:12px;background:var(--panel-2);border-radius:8px;">
          <div style="font-size:10px;color:var(--text-dim);letter-spacing:.6px;text-transform:uppercase;" title="0 = parfait, 0.25 = pile/face">Brier score</div>
          <div style="font-size:22px;font-weight:800;color:${brierColor};margin-top:2px;">${brier}</div>
          <div style="font-size:10px;color:var(--text-dim);">cote moy ${(ov.avg_cote||0).toFixed(2)}</div>
        </div>
      </div>
      ${table('Par tier de confiance', byTier)}
      ${table('Par sport', bySport)}
      ${table('Par range de cote', byCote)}
      ${table('Top ligues', byLeague)}
      ${calibHtml}
    `;
  }

  // ====== v23 — Bibliothèque de leçons apprises ======
  const USER_LESSONS_KEY = 'paris_sportif_user_lessons_v1';
  const USER_LESSONS_MAX = 50;
  function loadUserLessons() {
    try { return JSON.parse(localStorage.getItem(USER_LESSONS_KEY) || '[]') || []; }
    catch(e) { return []; }
  }
  function saveUserLesson(lesson) {
    try {
      let list = loadUserLessons();
      list.unshift(lesson);
      if (list.length > USER_LESSONS_MAX) list = list.slice(0, USER_LESSONS_MAX);
      localStorage.setItem(USER_LESSONS_KEY, JSON.stringify(list));
    } catch(e){}
  }
  function extractLessonFromBet(bet) {
    try {
      if (!bet || !bet.status) return null;
      const statusLower = String(bet.status).toLowerCase();
      const isWon = statusLower === 'gagné' || statusLower === 'gagne' || statusLower === 'won';
      const isLost = statusLower === 'perdu' || statusLower === 'lost';
      if (!isWon && !isLost) return null;

      const odd = Number(bet.odds) || Number(bet.odd) || 2;
      const implied = 1 / odd;
      const sport = bet.sport || 'autre';
      const league = bet.league || '';
      const hour = (() => {
        try {
          const d = new Date(bet.kickoff || bet.added_at || Date.now());
          return d.getHours();
        } catch(e){ return 12; }
      })();
      const slot = hour < 14 ? 'matinée' : hour < 18 ? "l'après-midi" : hour < 22 ? 'le soir' : 'la nuit';

      const sportLabelFr = (function(){
        const m = { football:'foot', tennis:'tennis', basketball:'basket', hockey:'hockey', 'american-football':'football US', baseball:'baseball', mma:'MMA', golf:'golf', rugby:'rugby' };
        return m[sport] || sport;
      })();

      // Génère une leçon brève
      let text, emoji, kind;
      if (isWon && implied >= 0.65) {
        text = `Les favoris en ${sportLabelFr} ${league ? '(' + league + ') ' : ''}tiennent bien quand tu suis le modèle.`;
        emoji = '✅'; kind = 'good';
      } else if (isWon && implied < 0.45) {
        text = `Un outsider en ${sportLabelFr} est passé. Belle surprise, mais ça reste rare — ne base pas ta stratégie là-dessus.`;
        emoji = '🎯'; kind = 'neutral';
      } else if (isLost && implied >= 0.75) {
        text = `Même un très favori en ${sportLabelFr} ${league ? '(' + league + ') ' : ''}peut perdre. 1 match sur 4 environ tombe à côté, c'est normal.`;
        emoji = '💡'; kind = 'neutral';
      } else if (isLost && implied >= 0.5) {
        text = `Un match serré en ${sportLabelFr} ${slot}${league ? ' (' + league + ')' : ''} a mal tourné. À surveiller si ça se répète.`;
        emoji = '⚠️'; kind = 'bad';
      } else if (isLost && implied < 0.45) {
        text = `Pari risqué en ${sportLabelFr} perdu — c'était prévisible vu la cote. Mieux vaut rester sur les paris sûrs.`;
        emoji = '📉'; kind = 'bad';
      } else {
        text = `Résultat en ${sportLabelFr} noté.`;
        emoji = 'ℹ️'; kind = 'neutral';
      }
      return {
        ts: Date.now(),
        emoji, kind, text,
        sport, league, hour, slot,
        won: isWon,
        matchLabel: `${bet.home || '?'} vs ${bet.away || '?'}`,
      };
    } catch(e) { return null; }
  }

  // ====== v22 — Analyse post-match ======
  function generatePostMatchNarrative(bet) {
    try {
      if (!bet || !bet.status) return '';
      const stake = Number(bet.stake) || 1;
      const odd = Number(bet.odds) || Number(bet.odd) || Number(bet.cote) || 2;
      const implied = 1 / odd;
      const statusLower = String(bet.status).toLowerCase();
      const isWon = statusLower === 'won' || statusLower === 'gagné' || statusLower === 'gagne';
      const isLost = statusLower === 'lost' || statusLower === 'perdu';
      const isPushed = statusLower === 'pushed' || statusLower === 'annulé' || statusLower === 'annule' || statusLower === 'remboursé';
      const profit = isWon ? stake * (odd - 1) : (isLost ? -stake : 0);
      const probaLabel = implied >= 0.7 ? 'très favori' : implied >= 0.55 ? 'favori' : implied >= 0.40 ? 'match serré' : 'outsider';

      let msg = '';
      if (isWon) {
        if (implied >= 0.6) msg = `✅ Gagné — comme prévu. L'équipe était ${probaLabel} (${(implied*100).toFixed(0)}%), tout était aligné. <b>+${profit.toFixed(2)}€</b>.`;
        else msg = `🎯 Gagné alors que la cote était à ${odd.toFixed(2)} — joli coup d'outsider. <b>+${profit.toFixed(2)}€</b>. Ne sur-interprète pas, ça peut être de la chance.`;
      } else if (isLost) {
        if (implied >= 0.7) msg = `💔 Perdu — pourtant c'était un ${probaLabel} (${(implied*100).toFixed(0)}%). Même à 75%, 1 match sur 4 part dans le décor. <b>−${stake.toFixed(2)}€</b>. Pas de panique.`;
        else if (implied >= 0.4) msg = `❌ Perdu sur un match serré (${(implied*100).toFixed(0)}% attendu). Normal que ça tombe parfois du mauvais côté. <b>−${stake.toFixed(2)}€</b>.`;
        else msg = `❌ Perdu sur un outsider — c'était le scénario le plus probable. <b>−${stake.toFixed(2)}€</b>. Prends-le comme une info, pas une erreur.`;
      } else if (isPushed) {
        msg = `🤝 Match remboursé. Pas d'impact sur ta cagnotte.`;
      } else {
        return '';
      }
      return msg;
    } catch(e) { return ''; }
  }

  // ====== v22 — Onboarding modal ======
  function showOnboardingModal() {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      if (prefs.onboardingDone) return;
      if (document.querySelector('.onboard-overlay')) return;

      const overlay = document.createElement('div');
      overlay.className = 'onboard-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.innerHTML = `
        <div class="onboard-card">
          <h2>👋 Bienvenue</h2>
          <div class="sub">Dis-moi ton niveau, j'adapte le site à toi.</div>
          <button class="onboard-opt" data-level="debutant">
            <b>🌱 Débutant</b>
            <div class="descr">Je découvre les paris — je veux des conseils simples et un max de sécurité.</div>
          </button>
          <button class="onboard-opt" data-level="confirme">
            <b>🎯 Confirmé</b>
            <div class="descr">Je parie régulièrement — je veux les stats importantes sans me noyer.</div>
          </button>
          <button class="onboard-opt" data-level="pro">
            <b>📊 Pro</b>
            <div class="descr">Je veux tous les chiffres : cotes, Elo, rentabilité, brut — pas de filtres.</div>
          </button>
          <button class="skip" data-skip="1">Ignorer (je verrai plus tard)</button>
        </div>`;
      document.body.appendChild(overlay);

      overlay.querySelectorAll('[data-level]').forEach(btn => {
        btn.addEventListener('click', () => {
          const level = btn.dataset.level;
          try {
            const p = JSON.parse(localStorage.getItem('userPrefs') || '{}');
            p.level = level;
            p.onboardingDone = true;
            localStorage.setItem('userPrefs', JSON.stringify(p));
          } catch(e){}
          overlay.remove();
          try { if (typeof toast === 'function') toast('✓ Niveau défini : ' + level, 'success'); } catch(e){}
          try { if (typeof applyPageView === 'function') applyPageView(); } catch(e){}
        });
      });
      overlay.querySelector('[data-skip]').addEventListener('click', () => {
        try {
          const p = JSON.parse(localStorage.getItem('userPrefs') || '{}');
          p.onboardingDone = true;
          localStorage.setItem('userPrefs', JSON.stringify(p));
        } catch(e){}
        overlay.remove();
      });
    } catch(e) { /* noop */ }
  }


  // ====== Page Profil / Réglages ======
  function renderProfilPage(wrap) {
    const prefs = (function(){
      try { return JSON.parse(localStorage.getItem('userPrefs') || '{}') || {}; }
      catch (e) { return {}; }
    })();
    const bankrollStart = prefs.bankrollStart || 10;
    const lockThreshold = prefs.lockThreshold || 0.70;
    const tiltGuard = prefs.tiltGuard !== false;
    const favSports = Array.isArray(prefs.favSports) ? prefs.favSports : [];
    const currentTheme = prefs.theme || 'dark';
    const currentContrast = prefs.contrast || 'normal';
    const currentReader = prefs.reader || 'off';
    const currentLevel = prefs.level || 'confirme';

    const availableSports = ['football', 'tennis', 'basketball', 'hockey', 'baseball', 'rugby', 'mma'];

    const sportsBtns = availableSports.map(s => {
      const active = favSports.includes(s);
      return `<button data-toggle-sport="${s}" style="background:${active?'var(--brand)':'var(--panel)'};color:${active?'#fff':'var(--text)'};border:1px solid ${active?'var(--brand)':'var(--border)'};border-radius:999px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;">${sportEmoji(s)} ${s}</button>`;
    }).join(' ');

    // Santé du système (intégration Santé dans Profil)
    let santeHtml = '';
    try {
      if (typeof buildSanteInsights === 'function') {
        const insights = buildSanteInsights();
        if (insights && insights.lines) {
          santeHtml = `
            <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;">
              <h3 style="margin:0 0 10px;font-size:16px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px;">🩺 Santé technique</h3>
              <div style="font-size:13px;color:var(--text);line-height:1.6;">${insights.lines.map(l => `<div style="margin:4px 0;">${l}</div>`).join('')}</div>
            </div>`;
        }
      }
    } catch (e) {}

    wrap.innerHTML = `
      <div style="max-width:1280px;margin:0 auto;padding:4px 0 0;font-variant-numeric:tabular-nums;">
        <div style="margin-bottom:24px;padding:32px 0 20px;border-bottom:1px solid var(--border);position:relative;display:flex;align-items:center;gap:18px;flex-wrap:wrap;">
          <div style="position:absolute;top:0;left:0;width:40px;height:3px;background:var(--brand);border-radius:0 0 2px 2px;"></div>
          <div style="width:56px;height:56px;border-radius:50%;background:var(--panel-2);border:1px solid var(--border-2);display:grid;place-items:center;font-size:22px;color:var(--text);font-weight:800;flex-shrink:0;">T</div>
          <div style="min-width:0;flex:1;">
            <div style="font-size:11px;color:var(--brand);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:4px;">Compte</div>
            <h1 style="margin:0 0 4px;font-size:36px;font-weight:800;letter-spacing:-1.2px;color:var(--text);line-height:1;">Théo</h1>
            <div style="font-size:13px;color:var(--text-dim);">theoboulnois@gmail.com</div>
          </div>
        </div>

        <div style="display:grid;gap:14px;max-width:900px;">

          <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;">
            <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:var(--text);">🎨 Apparence</h3>
            <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">Choisis la couleur du site.</div>
            <div class="pref-pill-group">
              <button class="theme-pill ${currentTheme==='dark'?'active':''}" data-theme-btn="dark">🌙 Sombre</button>
              <button class="theme-pill ${currentTheme==='light'?'active':''}" data-theme-btn="light">☀️ Clair</button>
            </div>
            <div style="margin-top:16px;display:flex;gap:16px;flex-wrap:wrap;">
              <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;">
                <input id="pref-contrast" type="checkbox" ${currentContrast==='high'?'checked':''} style="width:16px;height:16px;accent-color:var(--brand);"/>
                <span style="font-size:13px;color:var(--text);">Contraste élevé</span>
              </label>
              <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;">
                <input id="pref-reader" type="checkbox" ${currentReader==='on'?'checked':''} style="width:16px;height:16px;accent-color:var(--brand);"/>
                <span style="font-size:13px;color:var(--text);">Mode lecture (plus grand)</span>
              </label>
            </div>
            <div style="font-size:11px;color:var(--text-dim);margin-top:8px;">Astuce : appuie sur <b>Maj + T</b> pour basculer sombre/clair.</div>
          </div>

          <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;">
            <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:var(--text);">🎯 Mon niveau</h3>
            <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;">On adapte le site à ton niveau.</div>
            <div class="pref-pill-group">
              <button class="theme-pill ${currentLevel==='debutant'?'active':''}" data-level-btn="debutant">🌱 Débutant</button>
              <button class="theme-pill ${currentLevel==='confirme'?'active':''}" data-level-btn="confirme">🎯 Confirmé</button>
              <button class="theme-pill ${currentLevel==='pro'?'active':''}" data-level-btn="pro">📊 Pro</button>
            </div>
            <div style="font-size:11px;color:var(--text-dim);margin-top:8px;">Débutant = explications + sécurité. Pro = chiffres bruts.</div>
          </div>

          <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;">
            <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:var(--text);">💰 Cagnotte ${(typeof helpDot === 'function') ? helpDot('Le total que tu consacres aux paris. <b>Conseil : commence avec un montant que tu peux perdre.</b> Le site calcule tes mises conseillées en % de ce total pour que tu tiennes long terme.') : ''}</h3>
            <label style="display:block;font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.6px;font-weight:600;margin-bottom:4px;">Cagnotte de départ (€)</label>
            <input id="pref-bankroll" type="number" min="1" step="1" value="${bankrollStart}" style="width:150px;padding:10px 12px;font-size:15px;font-weight:700;background:var(--panel-2);border:1px solid var(--border);border-radius:var(--r);color:var(--text);"/>
            <div style="font-size:12px;color:var(--text-dim);margin-top:6px;">Sert à calculer la cagnotte simulée sur la page Bilan + tes mises conseillées.</div>
          </div>

          <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;">
            <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:var(--text);">🔒 Seuil "pari sûr" ${(typeof helpDot === 'function') ? helpDot('À partir de quelle confiance un pari est-il étiqueté "sûr" ?<br><br><b>70% (défaut)</b> : plus de paris mais certains perdent<br><b>75%+</b> : moins de paris mais très fiables<br><b>65% ou moins</b> : beaucoup de paris, risqué') : ''}</h3>
            <label style="display:block;font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.6px;font-weight:600;margin-bottom:4px;">Confiance minimum pour qu'un pari soit noté "sûr"</label>
            <input id="pref-lock-threshold" type="range" min="0.55" max="0.90" step="0.01" value="${lockThreshold}" style="width:100%;accent-color:var(--brand);"/>
            <div style="font-size:14px;font-weight:700;color:var(--brand);margin-top:4px;" id="pref-lock-label">${(lockThreshold*100).toFixed(0)}%</div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:2px;">Par défaut 70%. Au-delà de 75% tu auras moins de paris mais plus sûrs.</div>
          </div>

          <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;">
            <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:var(--text);">🛡️ Anti-panique</h3>
            <label style="display:inline-flex;align-items:center;gap:10px;cursor:pointer;">
              <input id="pref-tilt" type="checkbox" ${tiltGuard?'checked':''} style="width:18px;height:18px;accent-color:var(--brand);"/>
              <span style="font-size:14px;color:var(--text);">Me prévenir après 3 défaites d'affilée</span>
            </label>
            <div style="font-size:12px;color:var(--text-dim);margin-top:6px;">T'évite de doubler la mise sur un coup de tête.</div>
          </div>

          <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;">
            <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:var(--text);">🎯 Mode focus</h3>
            <div style="font-size:12px;color:var(--text-dim);margin-bottom:10px;line-height:1.5;">Sur le Dashboard, masque toutes les sections sauf le top pick du jour. Idéal pour décider rapidement.</div>
            <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;">
              <input id="pref-focus-mode" type="checkbox" ${prefs.focusMode === true ? 'checked' : ''} style="width:16px;height:16px;accent-color:var(--brand);"/>
              <span style="font-size:13px;color:var(--text);">Activer le mode focus</span>
            </label>
          </div>

          <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;">
            <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:var(--text);">⚽ Sports favoris</h3>
            <div style="display:flex;flex-wrap:wrap;gap:8px;">${sportsBtns}</div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:8px;">Les sports favoris seront priorisés dans le feed Accueil.</div>
          </div>

          ${(() => {
            let lessons = [];
            try { lessons = (typeof loadUserLessons === 'function') ? loadUserLessons() : []; } catch(e){}
            if (!lessons.length) return `
              <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;">
                <h3 style="margin:0 0 8px;font-size:16px;font-weight:700;color:var(--text);">💡 Ce que tu as appris</h3>
                <div style="font-size:12.5px;color:var(--text-dim);">Les leçons apparaîtront ici dès que tu marques des paris comme gagnés/perdus. L'IA extrait une leçon par pari réglé.</div>
              </div>`;
            const latest = lessons.slice(0, 10);
            const items = latest.map(l => {
              const bgKind = l.kind === 'good' ? 'rgba(52,211,153,.08)' : l.kind === 'bad' ? 'rgba(248,113,113,.08)' : 'rgba(96,165,250,.06)';
              const brdKind = l.kind === 'good' ? 'var(--accent)' : l.kind === 'bad' ? 'var(--danger)' : 'var(--info)';
              const date = (() => { try { return new Date(l.ts).toLocaleDateString('fr-FR', {day:'numeric',month:'short'}); } catch(e){ return ''; }})();
              return `
                <div style="padding:12px 14px;background:${bgKind};border-left:3px solid ${brdKind};border-radius:6px;margin-bottom:8px;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
                    <span style="font-size:16px;">${l.emoji}</span>
                    <span style="font-size:11px;color:var(--text-dim);">${date} · ${esc(l.matchLabel || '')}</span>
                  </div>
                  <div style="font-size:13px;color:var(--text-2);line-height:1.5;">${esc(l.text)}</div>
                </div>`;
            }).join('');
            return `
              <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;">
                <h3 style="margin:0 0 10px;font-size:16px;font-weight:700;color:var(--text);">💡 Ce que tu as appris <span style="font-size:11px;color:var(--text-dim);font-weight:500;">(${lessons.length} leçons)</span></h3>
                <div>${items}</div>
                ${lessons.length > 10 ? `<div style="margin-top:6px;font-size:11px;color:var(--text-dim);text-align:center;">Seules les 10 plus récentes sont affichées.</div>` : ''}
              </div>`;
          })()}

          ${santeHtml}

          ${(() => {
            // v31.7.6 — Web Vitals dashboard local. Lit les data du tracker
            // installé en pre-app.js (paris_sportif_web_vitals_v1).
            // Affiche : médianes des 20 dernieres sessions LCP/FCP/CLS/INP/TTFB.
            let sessions = [];
            try { sessions = JSON.parse(localStorage.getItem('paris_sportif_web_vitals_v1') || '[]'); } catch(e){}
            if (!Array.isArray(sessions) || sessions.length < 3) return `
              <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;">
                <h3 style="margin:0 0 8px;font-size:16px;font-weight:700;color:var(--text);">⚡ Performance navigateur</h3>
                <div style="font-size:12.5px;color:var(--text-dim);">Pas encore assez de sessions enregistrées (${sessions.length}/3 minimum). Reviens après quelques visites pour voir tes Web Vitals.</div>
              </div>`;
            const recent = sessions.slice(-20);
            const median = (arr) => {
              const xs = arr.filter(x => x != null && isFinite(x)).sort((a,b)=>a-b);
              if (!xs.length) return null;
              const m = Math.floor(xs.length / 2);
              return xs.length % 2 ? xs[m] : (xs[m-1] + xs[m]) / 2;
            };
            const lcps = recent.map(s => s.LCP);
            const fcps = recent.map(s => s.FCP);
            const inps = recent.map(s => s.INP);
            const clss = recent.map(s => s.CLS);
            const ttfbs = recent.map(s => s.TTFB);
            const mLCP = median(lcps), mFCP = median(fcps), mINP = median(inps), mCLS = median(clss), mTTFB = median(ttfbs);
            // Web Vitals thresholds (Google) :
            //   LCP : <2500ms good, <4000ms needs improvement
            //   FCP : <1800ms good, <3000ms needs improvement
            //   INP : <200ms good, <500ms needs improvement
            //   CLS : <0.10 good, <0.25 needs improvement
            //   TTFB: <800ms good, <1800ms needs improvement
            const tier = (val, good, ni) => val == null ? 'na' : val <= good ? 'good' : val <= ni ? 'ni' : 'poor';
            const colorTier = (t) => t === 'good' ? '#34d399' : t === 'ni' ? '#fbbf24' : t === 'poor' ? '#f87171' : 'var(--text-dim2)';
            const lblTier = (t) => t === 'good' ? 'Bon' : t === 'ni' ? 'À améliorer' : t === 'poor' ? 'Mauvais' : '—';
            const fmtMs = (v) => v == null ? '—' : `${Math.round(v)}ms`;
            const fmtN = (v, dec=3) => v == null ? '—' : v.toFixed(dec);
            const card = (label, val, fmt, tk, hint) => `
              <div style="padding:14px 16px;background:rgba(255,255,255,.02);border:1px solid var(--border);border-left:3px solid ${colorTier(tk)};border-radius:8px;">
                <div style="font-size:10.5px;color:var(--text-dim2);text-transform:uppercase;letter-spacing:.4px;font-weight:700;margin-bottom:4px;">${label}</div>
                <div style="font-size:22px;font-weight:800;color:var(--text);font-variant-numeric:tabular-nums;letter-spacing:-.4px;">${fmt(val)}</div>
                <div style="font-size:10.5px;color:${colorTier(tk)};font-weight:700;margin-top:2px;">${lblTier(tk)} · ${hint}</div>
              </div>`;
            return `
              <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;">
                <h3 style="margin:0 0 4px;font-size:16px;font-weight:700;color:var(--text);">⚡ Performance navigateur</h3>
                <div style="font-size:12px;color:var(--text-dim);margin-bottom:14px;">Médianes des ${recent.length} dernières sessions sur ce navigateur. Aucune donnée n'est envoyée sur internet.</div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:10px;">
                  ${card('LCP', mLCP, fmtMs, tier(mLCP, 2500, 4000), 'cible <2.5s')}
                  ${card('FCP', mFCP, fmtMs, tier(mFCP, 1800, 3000), 'cible <1.8s')}
                  ${card('INP', mINP, fmtMs, tier(mINP, 200, 500), 'cible <200ms')}
                  ${card('CLS', mCLS, (v) => fmtN(v, 3), tier(mCLS, 0.10, 0.25), 'cible <0.10')}
                  ${card('TTFB', mTTFB, fmtMs, tier(mTTFB, 800, 1800), 'cible <800ms')}
                </div>
                <div style="margin-top:12px;font-size:11px;color:var(--text-dim2);">
                  Console : <code style="background:var(--panel-2);padding:1px 5px;border-radius:3px;">__webVitals()</code> pour le détail.
                </div>
              </div>`;
          })()}

          <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;">
            <h3 style="margin:0 0 12px;font-size:16px;font-weight:700;color:var(--text);">📤 Exports</h3>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button id="export-json-prefs" style="background:var(--panel-2);color:var(--text);border:1px solid var(--border);border-radius:var(--r);padding:10px 16px;font-size:13px;font-weight:600;cursor:pointer;">Exporter réglages (JSON)</button>
            </div>
          </div>

          <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--r-lg);padding:20px;">
            <h3 style="margin:0 0 6px;font-size:15px;font-weight:700;color:var(--text);">🔄 Astuces</h3>
            <div style="font-size:12.5px;color:var(--text-dim);margin-bottom:10px;">Actions rapides sans tout supprimer.</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button id="replay-beginner-banner" style="background:var(--panel-2);color:var(--text);border:1px solid var(--border-2);border-radius:var(--r);padding:8px 12px;font-size:12px;cursor:pointer;">🌱 Réafficher bannière débutant</button>
              <button id="clear-user-lessons" style="background:var(--panel-2);color:var(--text);border:1px solid var(--border-2);border-radius:var(--r);padding:8px 12px;font-size:12px;cursor:pointer;">💡 Effacer mes leçons</button>
            </div>
          </div>

          <div style="background:var(--panel);border:1px solid rgba(255,59,48,.25);border-radius:var(--r-lg);padding:20px;">
            <h3 style="margin:0 0 6px;font-size:15px;font-weight:700;color:var(--danger);">⚠️ Zone danger</h3>
            <div style="font-size:12.5px;color:var(--text-dim);margin-bottom:10px;">Efface localement toutes tes préférences et paris trackés. Cette action est irréversible.</div>
            <button id="reset-all" style="background:transparent;color:var(--danger);border:1px solid rgba(255,59,48,.3);border-radius:var(--r);padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;">Tout réinitialiser</button>
          </div>
        </div>
      </div>`;

    // Wire up
    function savePrefs(partial) {
      const cur = (function(){ try { return JSON.parse(localStorage.getItem('userPrefs') || '{}') || {}; } catch(e) { return {}; } })();
      localStorage.setItem('userPrefs', JSON.stringify({ ...cur, ...partial }));
    }
    // v22 — apparence + accessibilité
    wrap.querySelectorAll('[data-theme-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.themeBtn;
        savePrefs({ theme });
        const root = document.documentElement;
        if (theme === 'light') root.setAttribute('data-theme', 'light');
        else root.removeAttribute('data-theme');
        const meta = document.getElementById('theme-color-meta');
        if (meta) meta.setAttribute('content', theme === 'light' ? '#f5f5f7' : '#08080a');
        renderProfilPage(wrap);
      });
    });
    wrap.querySelectorAll('[data-level-btn]').forEach(btn => {
      btn.addEventListener('click', () => {
        const level = btn.dataset.levelBtn;
        savePrefs({ level, onboardingDone: true });
        try { document.documentElement.setAttribute('data-level', level); } catch(e){}
        try { if (typeof toast === 'function') toast('✓ Niveau : ' + level, 'success'); } catch(e){}
        renderProfilPage(wrap);
      });
    });
    const contrastEl = wrap.querySelector('#pref-contrast');
    if (contrastEl) contrastEl.addEventListener('change', (e) => {
      const on = e.target.checked;
      savePrefs({ contrast: on ? 'high' : 'normal' });
      if (on) document.documentElement.setAttribute('data-contrast', 'high');
      else document.documentElement.removeAttribute('data-contrast');
    });
    const readerEl = wrap.querySelector('#pref-reader');
    if (readerEl) readerEl.addEventListener('change', (e) => {
      const on = e.target.checked;
      savePrefs({ reader: on ? 'on' : 'off' });
      if (on) document.documentElement.setAttribute('data-reader', 'on');
      else document.documentElement.removeAttribute('data-reader');
    });
    // v31.7.11 — Mode focus dashboard
    const focusModeEl = wrap.querySelector('#pref-focus-mode');
    if (focusModeEl) focusModeEl.addEventListener('change', (e) => {
      const on = e.target.checked;
      savePrefs({ focusMode: on });
      if (on) document.body.classList.add('focus-mode');
      else document.body.classList.remove('focus-mode');
    });
    const bankEl = wrap.querySelector('#pref-bankroll');
    if (bankEl) bankEl.addEventListener('input', (e) => {
      // FIX audit #8 : Number("0") || 10 réécrit silencieusement 0 en 10.
      // Mieux : isFinite + bornes [1, 10000].
      const v = parseFloat(e.target.value);
      const safe = isFinite(v) && v >= 1 && v <= 10000 ? v : 10;
      savePrefs({ bankrollStart: safe });
    });
    const lockEl = wrap.querySelector('#pref-lock-threshold');
    const lockLbl = wrap.querySelector('#pref-lock-label');
    if (lockEl && lockLbl) lockEl.addEventListener('input', (e) => {
      const v = Number(e.target.value);
      lockLbl.textContent = (v*100).toFixed(0) + '%';
      savePrefs({ lockThreshold: v });
    });
    const tiltEl = wrap.querySelector('#pref-tilt');
    if (tiltEl) tiltEl.addEventListener('change', (e) => savePrefs({ tiltGuard: e.target.checked }));
    wrap.querySelectorAll('[data-toggle-sport]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = btn.dataset.toggleSport;
        const cur = (function(){ try { return JSON.parse(localStorage.getItem('userPrefs') || '{}') || {}; } catch(e) { return {}; } })();
        const favs = Array.isArray(cur.favSports) ? cur.favSports : [];
        const idx = favs.indexOf(s);
        if (idx >= 0) favs.splice(idx, 1); else favs.push(s);
        savePrefs({ favSports: favs });
        renderProfilPage(wrap);
      });
    });
    // v30 — Bouton Export CSV "Mes paris" retiré (la page elle-même est partie).
    const exportJson = wrap.querySelector('#export-json-prefs');
    if (exportJson) exportJson.addEventListener('click', () => {
      const payload = (function(){ try { return JSON.parse(localStorage.getItem('userPrefs') || '{}') || {}; } catch(e) { return {}; } })();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'prefs.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    });
    const resetBtn = wrap.querySelector('#reset-all');
    if (resetBtn) resetBtn.addEventListener('click', async () => {
      const ok = (typeof window._showConfirm === 'function')
        ? await window._showConfirm({
            title: '⚠️ Tout réinitialiser ?',
            body: 'Supprimer <b>TOUS</b> les réglages, paris suivis, préférences thème, filtres, etc.<br><br><span style="color:var(--danger);font-weight:600;">Action irréversible.</span>',
            confirmLabel: 'Tout supprimer',
            cancelLabel: 'Annuler',
            danger: true,
          })
        : confirm('Supprimer TOUS les réglages et paris suivis ? Action irréversible.');
      if (!ok) return;
      try {
        // FIX audit #6 : la liste fixe oubliait les clés bilan/wallet/agent/etc.
        // → l'utilisateur cliquait "Tout réinitialiser" et restait avec ses
        // anciens filtres bilan, ses choix wallet, etc. Maintenant on purge
        // par préfixe blacklist + liste fixe pour plus court.
        const fixedKeys = ['userPrefs','trackedBets','myBets','seenLockIds',
         'paris_sportif_tracked_bets','paris_sportif_user_lessons_v1',
         'chatbot_history_v1','paris_sportif_js_errors_v1',
         'currentPage','userBankroll','agentResetTs','tousFilters','tousSort','tousTab',
         'bilanWindow','bilanSport','walletStakeMode','walletBacktestStart',
         'walletBacktestDate','walletPicksMode','walletTableWindow',
         'pwaInstallSnoozeUntil','notifiedPickIds'];
        fixedKeys.forEach(k => localStorage.removeItem(k));
        // Purge tout ce qui commence par 'agent' ou 'bilan.' ou 'paris_sportif_' (sauf garder rien)
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (k.startsWith('agent') || k.startsWith('bilan.') || k.startsWith('paris_sportif_')) {
            toRemove.push(k);
          }
        }
        toRemove.forEach(k => localStorage.removeItem(k));
        if (typeof toast === 'function') toast('✓ Tout réinitialisé', 'success');
        renderProfilPage(wrap);
      } catch (e) {}
    });
    // v23 — bouton "Réafficher bannière débutant"
    const replayBanner = wrap.querySelector('#replay-beginner-banner');
    if (replayBanner) replayBanner.addEventListener('click', () => {
      try {
        const cur = JSON.parse(localStorage.getItem('userPrefs') || '{}');
        delete cur.beginnerBannerDismissed;
        localStorage.setItem('userPrefs', JSON.stringify(cur));
        // FIX audit #9 : feedback explicite, l'utilisateur ne voit pas la
        // bannière apparaître ici (elle est sur Accueil).
        if (typeof toast === 'function') toast('✓ Bannière réactivée — visible sur Accueil', 'success');
      } catch(e){}
    });
    // v23 — bouton "Effacer ce que j'ai appris"
    const clearLessons = wrap.querySelector('#clear-user-lessons');
    if (clearLessons) clearLessons.addEventListener('click', async () => {
      const ok = (typeof window._showConfirm === 'function')
        ? await window._showConfirm({
            title: '🧠 Effacer les leçons ?',
            body: 'Toutes tes leçons apprises (insights ROI/streaks/sport) seront supprimées. Le coach IA repartira de zéro.',
            confirmLabel: 'Effacer',
            cancelLabel: 'Garder',
            danger: true,
          })
        : confirm('Effacer toutes tes leçons apprises ?');
      if (!ok) return;
      try {
        localStorage.removeItem('paris_sportif_user_lessons_v1');
        if (typeof toast === 'function') toast('✓ Leçons effacées', 'success');
        renderProfilPage(wrap);
      } catch(e){}
    });
  }

  // ======= v31 — Page Légal / Confidentialité / À propos =======
  // Réponse à l'audit ChatGPT 2026-04-26 (priorités très haute) :
  // identité éditoriale, mentions légales, politique de confidentialité,
  // disclosure relation Winamax (=aucune affiliation, aucune rémunération).
  // Page rendue côté client comme les autres mais avec contenu en clair
  // (pas de données dynamiques) → indexable par crawl JS.
  // v31.1 — renderLegalPage retirée (page statique legal.html à la place)


  // ======= v31 — Page Méthodologie formelle =======
  // Dictionnaire des métriques + protocole de backtest + sources de données
  // + section biais et limites. Réponse à l'audit ChatGPT 2026-04-26.
  // v31.1 — renderMethodologiePage retirée (page statique methodologie.html à la place)


  function todayIsoName() {
    try { return new Date().toISOString().slice(0,10); } catch (e) { return 'export'; }
  }

  // ======= v30 — Odds history sparkline =======
  // Charge `odds_history.jsonl` une seule fois au premier appel (lazy), parse,
  // groupe par match_id. Render une mini SVG montrant l'évolution de la cote
  // décimale du pick choisi sur la dernière fenêtre disponible.
  // Format JSONL : {id, captured_at, homeML, awayML, drawML, ...}
  // Conversion American ML → décimale : <0 → 1+100/abs ; >0 → 1+ML/100.
  let __oddsHistoryByMatch = null;
  let __oddsHistoryLoading = null;
  let __oddsHistoryLoadedAt = 0;
  const ODDS_HISTORY_TTL_MS = 5 * 60 * 1000;   // FIX #12 : invalide après 5min
  function _mlToDecimal(ml) {
    if (ml == null || !isFinite(ml)) return null;
    return ml < 0 ? 1 + 100 / Math.abs(ml) : 1 + ml / 100;
  }
  // Invalidation explicite : appelée par pollData() après chaque refresh.
  window._invalidateOddsHistoryCache = () => {
    __oddsHistoryByMatch = null;
    __oddsHistoryLoading = null;
    __oddsHistoryLoadedAt = 0;
  };
  function _loadOddsHistory() {
    const now = Date.now();
    if (__oddsHistoryByMatch && (now - __oddsHistoryLoadedAt) < ODDS_HISTORY_TTL_MS) {
      return Promise.resolve(__oddsHistoryByMatch);
    }
    if (__oddsHistoryLoading) return __oddsHistoryLoading;
    __oddsHistoryLoading = fetch('odds_history.jsonl', { cache: 'no-cache' })
      .then(r => r.ok ? r.text() : '')
      .then(txt => {
        const byId = new Map();
        txt.split('\n').forEach(line => {
          if (!line.trim()) return;
          let row; try { row = JSON.parse(line); } catch(e) { return; }
          if (!row.id || !row.captured_at) return;
          const id = String(row.id);
          if (!byId.has(id)) byId.set(id, []);
          byId.get(id).push({
            ts: new Date(row.captured_at).getTime(),
            home: _mlToDecimal(row.homeML),
            draw: _mlToDecimal(row.drawML),
            away: _mlToDecimal(row.awayML),
          });
        });
        // Sort each match's points by ts ASC
        byId.forEach(arr => arr.sort((a,b) => a.ts - b.ts));
        __oddsHistoryByMatch = byId;
        __oddsHistoryLoadedAt = Date.now();
        __oddsHistoryLoading = null;
        return byId;
      })
      .catch(() => {
        __oddsHistoryByMatch = new Map();
        __oddsHistoryLoadedAt = Date.now();
        __oddsHistoryLoading = null;
        return __oddsHistoryByMatch;
      });
    return __oddsHistoryLoading;
  }
  function _renderOddsSparkline(slotEl, matchId, pickKey) {
    if (!slotEl || !matchId) return;
    // FIX Bug 6 : show "Chargement…" seulement si le fetch n'est pas déjà
    // résolu (sinon le slot reste avec ce message si user re-ferme avant
    // que la promise tire). Le cas standard (fetch déjà résolu) skip la
    // 1ère écriture innerHTML.
    const alreadyLoaded = !!__oddsHistoryByMatch;
    if (!alreadyLoaded) {
      slotEl.innerHTML = '<div style="font-size:11px;color:var(--text-dim);padding:6px 0;">⏳ Chargement historique…</div>';
    }
    _loadOddsHistory().then(byId => {
      const series = byId.get(String(matchId));
      if (!series || series.length < 2) {
        slotEl.innerHTML = '';
        // FIX Bug 6 : reset le flag rendered pour permettre une nouvelle
        // tentative de render au prochain expand (cas où l'historique
        // arrive après le 1er fetch mais nous avons fermé entre temps).
        const expandEl = slotEl.closest('.dpc-expand');
        if (expandEl) delete expandEl.dataset.sparkRendered;
        return;
      }
      // Choose which series to plot based on pickKey ('1'=home, '2'=away, 'X'=draw)
      const k = pickKey === '2' ? 'away' : pickKey === 'X' ? 'draw' : 'home';
      const lbl = k === 'home' ? '1 (Domicile)' : k === 'away' ? '2 (Extérieur)' : 'X (Nul)';
      const pts = series.map(s => ({ ts: s.ts, v: s[k] })).filter(p => isFinite(p.v));
      if (pts.length < 2) {
        slotEl.innerHTML = '';
        return;
      }
      const W = 220, H = 50, P = 4;
      const minV = Math.min(...pts.map(p => p.v));
      const maxV = Math.max(...pts.map(p => p.v));
      const range = Math.max(0.01, maxV - minV);
      const t0 = pts[0].ts, t1 = pts[pts.length-1].ts;
      const tRange = Math.max(1, t1 - t0);
      const xy = pts.map(p => {
        const x = P + (W - 2*P) * (p.ts - t0) / tRange;
        const y = P + (H - 2*P) * (1 - (p.v - minV) / range);
        return [x, y];
      });
      const pathD = 'M ' + xy.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ');
      const areaD = pathD + ` L ${xy[xy.length-1][0].toFixed(1)},${H} L ${xy[0][0].toFixed(1)},${H} Z`;
      const first = pts[0].v, last = pts[pts.length-1].v;
      const moveDelta = last - first;
      const movePct = (moveDelta / first) * 100;
      const movColor = Math.abs(movePct) < 1 ? 'var(--text-dim)' : movePct > 0 ? '#34d399' : '#f87171';
      const moveSign = movePct >= 0 ? '+' : '';
      const moveLbl = Math.abs(movePct) < 1 ? '≈ stable' : `${moveSign}${movePct.toFixed(1)}%`;
      const moveArrow = Math.abs(movePct) < 1 ? '→' : movePct > 0 ? '↗' : '↘';
      const fmtT = (ts) => new Date(ts).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' });
      slotEl.innerHTML = `
        <div style="font-size:10px;color:var(--brand);letter-spacing:.5px;text-transform:uppercase;font-weight:700;margin-bottom:6px;">📉 Évolution cote · ${esc(lbl)}</div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding:8px 10px;background:rgba(167,139,250,.06);border-radius:6px;">
          <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="flex-shrink:0;display:block;">
            <path d="${areaD}" fill="${movColor}" opacity=".15"/>
            <path d="${pathD}" stroke="${movColor}" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="${xy[xy.length-1][0].toFixed(1)}" cy="${xy[xy.length-1][1].toFixed(1)}" r="2.5" fill="${movColor}"/>
          </svg>
          <div style="font-size:11.5px;line-height:1.4;color:var(--text);font-variant-numeric:tabular-nums;">
            <div><b>${first.toFixed(2)}</b> <span style="color:var(--text-dim);">→</span> <b>${last.toFixed(2)}</b></div>
            <div style="color:${movColor};font-weight:600;font-size:11px;">${moveArrow} ${esc(moveLbl)}</div>
            <div style="color:var(--text-dim);font-size:10.5px;margin-top:1px;">${esc(fmtT(t0))} → ${esc(fmtT(t1))} · ${pts.length} pts</div>
          </div>
        </div>`;
    }).catch(err => {
      console.warn('[sparkline] load failed', err);
      slotEl.innerHTML = '';
    });
  }


  // =========================================================================
  // v31.7.1 — MONTANTES SÉQUENTIELLES (du jour / weekend / semaine)
  // -------------------------------------------------------------------------
  // Concept REEL d'une montante (corrigé par retour user) :
  //   - Pari 1 (étape 1) : on mise 10€ sur le match X
  //   - On ATTEND le résultat. Si on gagne → on récupère 10€ × cote_X
  //   - Pari 2 (étape 2) : on remet TOUT (mise+gain) sur le match Y
  //     (qui DOIT démarrer après la fin du match X)
  //   - Et ainsi de suite jusqu'à étape N.
  //   - Si UN seul pari tombe → tout est perdu.
  //
  // CONTRAINTE TEMPORELLE CRITIQUE : les matchs doivent être séquentiels
  // (pas de chevauchement temporel). Buffer = durée match + 30min pour
  // récupérer les gains et reposer la mise.
  //
  // Algo (greedy par kickoff ASC) :
  //   1. Filtre candidates (haute conf, cote dans plage, pas live/done)
  //   2. Sort par kickoff ASC
  //   3. Greedy : prendre 1er candidat, puis chercher le plus tôt qui
  //      démarre après earliest_next_ts = prev.ts + duree(prev.sport) + 30min
  //   4. Continue jusqu'à atteindre targetN OU plus de candidats valides
  //   5. Diversification : max 2 picks même sport, max 2 même ligue
  //
  // Affichage : timeline "étapes" claire, pour chaque étape la mise courante,
  // la cote, le gain potentiel qui devient la mise de l'étape suivante.
  // =========================================================================

  // Durée moyenne d'un match par sport (en minutes) — buffer permettant de
  // garantir que le résultat est connu avant de remiser sur l'étape suivante.
  const SPORT_DURATION_MIN = {
    football: 120,            // 90min + arrêts + mi-temps
    tennis: 180,              // BO3, peut aller à 5h en BO5 — on prend 3h moyen
    basketball: 150,          // 4×12min + temps morts + prolongation possible
    hockey: 150,              // 3×20min + arrêts + prolongation possible
    baseball: 210,            // 9 manches, longueur très variable
    'american-football': 210, // 4×15min + arrêts nombreux
    mma: 60,                  // Carte rapide, fin variable
    rugby: 100,               // 2×40min + arrêts
    golf: 360,                // Round complet, on conseille pas montante golf
    racing: 150,              // F1 ~2h, autres variables
  };
  const STEP_BUFFER_MIN = 30;  // marge après match pour reporter la mise

  function _matchEndTs(c) {
    const dur = (SPORT_DURATION_MIN[c.sport] || 180) + STEP_BUFFER_MIN;
    return c.ts + dur * 60 * 1000;
  }

  function renderMontantePage(wrap, type) {
    const data = window.PRONOSTICS_DATA;
    if (!data || !data.days) {
      wrap.innerHTML = '<div class="empty-state"><span class="es-icon">⏳</span><div class="es-title">Données indisponibles</div><div class="es-body">Le modèle attend les données du jour. Reviens dans quelques minutes.</div></div>';
      return;
    }

    // Selection horizon temporel
    const today = data.today;
    const todayDate = new Date(today + 'T00:00:00Z');
    const dayCount = type === 'jour' ? 1 : type === 'weekend' ? 2 : 7;

    // Build list of dates to scan
    const dates = [];
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(todayDate);
      if (type === 'weekend') {
        // Samedi+dimanche les plus proches (semaine en cours ou suivante)
        const dow = d.getUTCDay();
        const daysToSat = (6 - dow + 7) % 7;
        d.setUTCDate(d.getUTCDate() + daysToSat + i);
      } else {
        d.setUTCDate(d.getUTCDate() + i);
      }
      dates.push(d.toISOString().slice(0, 10));
    }

    // Plage cote/conf selon type
    const odd_min = 1.30;
    const odd_max = type === 'jour' ? 2.10 : type === 'weekend' ? 2.50 : 2.80;
    const conf_min = type === 'jour' ? 0.72 : 0.70;
    const targetN  = type === 'jour' ? 3 : type === 'weekend' ? 4 : 5;

    // Collect candidate picks (filtre haute conf + cote in range)
    const candidates = [];
    const nowTs = Date.now();
    for (const date of dates) {
      const events = (data.days || {})[date] || [];
      for (const m of events) {
        if (m.live || m.completed) continue;
        if (m.status === 'STATUS_FINAL' || m.status === 'STATUS_IN_PROGRESS') continue;
        const ts = new Date(m.date).getTime();
        if (!isFinite(ts)) continue;
        // Skip matchs déjà commencés (pas de mise possible)
        if (ts < nowTs) continue;
        let pred;
        try { pred = (typeof predictMatch === 'function') ? predictMatch(m) : null; } catch(e){ continue; }
        if (!pred || !pred.pick) continue;
        const rel = pred.reliability ?? pred.pick.prob;
        if (rel < conf_min) continue;
        let odd = null;
        const wm = (m.winamax && m.winamax.markets && m.winamax.markets['1n2']) || {};
        if (pred.pick.key === '1') odd = wm.home;
        else if (pred.pick.key === '2') odd = wm.away;
        else if (pred.pick.key === 'X') odd = wm.draw;
        odd = Number(odd);
        if (!isFinite(odd) || odd < odd_min || odd > odd_max) continue;

        candidates.push({
          m, pred, rel, odd, ts,
          sport: m.sport,
          league: m.league_code || m.league_name || '',
          edge: rel - (1/odd),
        });
      }
    }

    // ALGO MONTANTE SÉQUENTIELLE :
    // 1. Sort par kickoff ASC (timeline)
    // 2. Pour chaque slot, prendre le candidat dispo avec le meilleur score
    //    composite (edge + conf), respectant la contrainte temporelle ET
    //    la diversification.
    candidates.sort((a, b) => a.ts - b.ts);

    const picked = [];
    const sportCount = {}, leagueCount = {};
    let earliestNextTs = nowTs;

    while (picked.length < targetN) {
      // Filtrer ceux qui démarrent après earliestNextTs et respectent
      // diversification.
      const eligible = candidates.filter(c => {
        if (c.ts < earliestNextTs) return false;
        if (picked.includes(c)) return false;
        if ((sportCount[c.sport] || 0) >= 2) return false;
        if (c.league && (leagueCount[c.league] || 0) >= 2) return false;
        return true;
      });
      if (!eligible.length) break;

      // Parmi les éligibles, prendre celui avec le meilleur edge × conf
      // (mais on reste dans la window kickoff ascendante : on prend en
      // priorité les premiers, mais avec un compromis qualité).
      // Stratégie : prendre le BEST eligible parmi les 5 plus tôt dispo.
      const window = eligible.slice(0, 5);
      window.sort((a, b) => (b.rel * b.edge) - (a.rel * a.edge));
      const chosen = window[0];

      picked.push(chosen);
      sportCount[chosen.sport] = (sportCount[chosen.sport] || 0) + 1;
      if (chosen.league) leagueCount[chosen.league] = (leagueCount[chosen.league] || 0) + 1;
      earliestNextTs = _matchEndTs(chosen);
    }

    // Header (titre + intro)
    const titleByType = {
      jour:    '📅 Montante du jour',
      weekend: '🗓️ Montante du weekend',
      semaine: '📆 Montante de la semaine',
    };
    const subByType = {
      jour:    `${picked.length} étape${picked.length>1?'s':''} séquentielle${picked.length>1?'s':''} sur la journée — chaque pari démarre après le précédent`,
      weekend: `${picked.length} étape${picked.length>1?'s':''} séquentielle${picked.length>1?'s':''} samedi & dimanche`,
      semaine: `${picked.length} étape${picked.length>1?'s':''} séquentielle${picked.length>1?'s':''} sur 7 jours`,
    };

    if (picked.length < 2) {
      const fallbackHint = type === 'jour'
        ? 'Essaie la <b><button class="page-btn" data-page="montante-weekend" style="background:transparent;border:none;color:var(--brand);text-decoration:underline;cursor:pointer;font-size:inherit;font-family:inherit;padding:0;font-weight:700;">Montante du weekend</button></b> ou de la <b><button class="page-btn" data-page="montante-semaine" style="background:transparent;border:none;color:var(--brand);text-decoration:underline;cursor:pointer;font-size:inherit;font-family:inherit;padding:0;font-weight:700;">semaine</button></b> — fenêtre temporelle plus large = plus de matchs séquentiels disponibles.'
        : type === 'weekend'
          ? 'Essaie la <b><button class="page-btn" data-page="montante-semaine" style="background:transparent;border:none;color:var(--brand);text-decoration:underline;cursor:pointer;font-size:inherit;font-family:inherit;padding:0;font-weight:700;">Montante de la semaine</button></b> pour étendre la fenêtre.'
          : 'Reviens plus tard quand le calendrier des prochains jours sera plus rempli.';
      wrap.innerHTML = `
        <div style="max-width:960px;margin:0 auto;padding:0 8px;">
          <div style="margin:24px 0 18px;">
            <span class="section-eyebrow">Montante séquentielle</span>
            <h1 class="section-title-v2">${titleByType[type]}</h1>
            <p class="section-subtitle-v2">Le modèle n'a pas trouvé assez de picks séquentiels respectant les critères.</p>
          </div>
          <div class="empty-state">
            <span class="es-icon">🎯</span>
            <div class="es-title">Pas assez de picks séquentiels</div>
            <div class="es-body">
              Une montante demande des matchs <b>qui ne se chevauchent pas dans le temps</b> (tu dois encaisser le gain de l'étape 1 avant de remiser sur l'étape 2).<br><br>
              ${candidates.length ? `<b>${candidates.length}</b> candidat${candidates.length>1?'s':''} haute confiance dans la fenêtre, mais trop proches temporellement ou tous dans le même sport/ligue.` : 'Aucun candidat haute confiance dans la fenêtre temporelle.'}<br><br>
              ${fallbackHint}
            </div>
            <button class="page-btn es-cta" data-page="locks" style="margin-top:16px;">🔒 Voir les Locks individuels</button>
          </div>
        </div>`;
      return;
    }

    // CALCUL PROGRESSIF DES MISES (montante réelle)
    // Étape 1 : mise initiale. Si gagne → mise étape 2 = mise1 × cote1.
    // Étape N : mise N = mise (N-1) × cote (N-1).
    const initialStake = 10; // 10€ simulés
    const steps = [];
    let currentStake = initialStake;
    for (const c of picked) {
      const grossPayout = currentStake * c.odd;
      steps.push({
        ...c,
        stake: currentStake,
        payout: grossPayout,
      });
      currentStake = grossPayout; // gain devient la mise suivante
    }
    const finalPayout = steps[steps.length - 1].payout;
    const totalNetGain = finalPayout - initialStake;
    const totalProb = picked.reduce((p, c) => p * c.rel, 1);

    // Risk label (basé sur la prob TOTALE de réussir la chaîne)
    let riskLabel, riskColor, riskBg;
    if (totalProb >= 0.50) { riskLabel = 'Risque modéré';   riskColor = '#34d399'; riskBg = 'rgba(52,211,153,.10)'; }
    else if (totalProb >= 0.30) { riskLabel = 'Risque équilibré'; riskColor = '#fbbf24'; riskBg = 'rgba(251,191,36,.10)'; }
    else                    { riskLabel = 'Risque élevé';   riskColor = '#f87171'; riskBg = 'rgba(248,113,113,.10)'; }

    // Build steps HTML : timeline verticale avec mise → cote → gain
    const sportEmMap = { football:'⚽', tennis:'🎾', basketball:'🏀', hockey:'🏒', baseball:'⚾', 'american-football':'🏈', mma:'🥊', golf:'⛳', racing:'🏎️', rugby:'🏉' };
    const stepsHtml = steps.map((s, i) => {
      const sides = (typeof getSides === 'function') ? getSides(s.m) : { home: {}, away: {} };
      const homeName = (sides.home && (sides.home.short || sides.home.name)) || '?';
      const awayName = (sides.away && (sides.away.short || sides.away.name)) || '?';
      const sportEm = sportEmMap[s.sport] || '🎯';
      const dateStr = new Date(s.m.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
      const timeStr = new Date(s.m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const pickLabel = (s.pred.pick && s.pred.pick.label) || s.pred.pick.key || '?';
      const isLast = (i === steps.length - 1);
      const dur = SPORT_DURATION_MIN[s.sport] || 180;
      const endTime = new Date(s.m.date).getTime() + dur * 60000;
      const endStr = new Date(endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="montante-step" data-match-id="${esc(String(s.m.id || ''))}" role="button" tabindex="0" aria-label="Étape ${i+1} : ${esc(homeName)} vs ${esc(awayName)}" style="position:relative;display:grid;grid-template-columns:48px 1fr;gap:14px;padding:0;cursor:pointer;">
          <!-- Timeline number + connector line -->
          <div style="display:flex;flex-direction:column;align-items:center;padding-top:18px;">
            <div style="width:40px;height:40px;display:grid;place-items:center;border-radius:50%;background:var(--brand);color:#08080a;font-weight:800;font-size:16px;box-shadow:0 4px 12px rgba(167,139,250,.30);flex-shrink:0;">${i+1}</div>
            ${!isLast ? '<div style="width:2px;flex:1;background:linear-gradient(180deg, var(--brand) 0%, var(--brand-soft) 100%);margin-top:6px;min-height:24px;"></div>' : ''}
          </div>
          <!-- Step card -->
          <div style="padding:16px 18px;background:var(--panel);border:1px solid var(--border);border-radius:var(--r-sm);margin-bottom:${isLast?'0':'12px'};transition:all .18s ease;">
            <!-- Top : sport + date + heure -->
            <div style="font-size:11px;color:var(--text-dim2);text-transform:uppercase;letter-spacing:.4px;font-weight:600;margin-bottom:6px;">${sportEm} ${esc(s.league.slice(0,32))} · ${esc(dateStr)} ${esc(timeStr)} → ~${esc(endStr)}</div>
            <!-- Teams -->
            <div style="font-size:15px;font-weight:700;color:var(--text);line-height:1.3;margin-bottom:4px;">${esc(homeName)} <span style="color:var(--text-dim);font-weight:400;">vs</span> ${esc(awayName)}</div>
            <!-- Pick -->
            <div style="font-size:13px;color:var(--brand);font-weight:600;margin-bottom:12px;">→ ${esc(pickLabel)} · Confiance ${Math.round(s.rel*100)}%</div>
            <!-- Stake → Cote → Payout flow -->
            <div style="display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:8px;align-items:center;padding:10px 12px;background:rgba(255,255,255,.02);border:1px solid var(--border);border-radius:8px;">
              <div style="text-align:center;">
                <div style="font-size:9.5px;color:var(--text-dim2);text-transform:uppercase;letter-spacing:.3px;">Mise</div>
                <div style="font-size:15px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;">${s.stake.toFixed(2)}€</div>
              </div>
              <div style="color:var(--text-dim2);font-size:14px;">×</div>
              <div style="text-align:center;">
                <div style="font-size:9.5px;color:var(--text-dim2);text-transform:uppercase;letter-spacing:.3px;">Cote</div>
                <div style="font-size:15px;font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums;">@${s.odd.toFixed(2)}</div>
              </div>
              <div style="color:var(--text-dim2);font-size:14px;">=</div>
              <div style="text-align:center;">
                <div style="font-size:9.5px;color:var(--text-dim2);text-transform:uppercase;letter-spacing:.3px;">${isLast ? 'Gain final' : 'Étape ' + (i+2)}</div>
                <div style="font-size:15px;font-weight:800;color:${isLast ? 'var(--accent)' : 'var(--brand)'};font-variant-numeric:tabular-nums;">${s.payout.toFixed(2)}€</div>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');

    // Render
    wrap.innerHTML = `
      <div style="max-width:960px;margin:0 auto;padding:0 8px;">
        <div style="margin:24px 0 18px;">
          <span class="section-eyebrow">Montante séquentielle</span>
          <h1 class="section-title-v2">${titleByType[type]}</h1>
          <p class="section-subtitle-v2">${subByType[type]}</p>
        </div>

        <!-- Carte récap : départ → arrivée + risque -->
        <div style="background:linear-gradient(135deg, var(--panel) 0%, var(--panel-2) 100%);border:1px solid var(--border-2);border-radius:var(--r-lg);padding:24px 26px;margin-bottom:18px;position:relative;overflow:hidden;">
          <div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle, var(--brand) 0%, transparent 60%);opacity:.10;pointer-events:none;"></div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr 1fr;gap:18px;align-items:center;">
            <div>
              <div style="font-size:11px;color:var(--text-dim2);text-transform:uppercase;letter-spacing:.6px;font-weight:700;">Mise initiale</div>
              <div style="font-size:32px;font-weight:800;color:var(--text);letter-spacing:-.6px;font-variant-numeric:tabular-nums;line-height:1;margin-top:4px;">${initialStake.toFixed(2)}€</div>
              <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">Étape 1</div>
            </div>
            <div style="font-size:24px;color:var(--brand);">→</div>
            <div>
              <div style="font-size:11px;color:var(--text-dim2);text-transform:uppercase;letter-spacing:.6px;font-weight:700;">Gain potentiel final</div>
              <div style="font-size:32px;font-weight:800;color:var(--accent);letter-spacing:-.6px;font-variant-numeric:tabular-nums;line-height:1;margin-top:4px;">${finalPayout.toFixed(2)}€</div>
              <div style="font-size:11.5px;color:var(--accent);margin-top:4px;font-weight:600;">+${totalNetGain.toFixed(2)}€ net (×${(finalPayout/initialStake).toFixed(2)})</div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--text-dim2);text-transform:uppercase;letter-spacing:.6px;font-weight:700;">Probabilité de tout réussir</div>
              <div style="font-size:30px;font-weight:800;color:${riskColor};letter-spacing:-.6px;font-variant-numeric:tabular-nums;line-height:1;margin-top:4px;">${(totalProb*100).toFixed(1)}%</div>
              <div style="display:inline-block;font-size:10.5px;color:${riskColor};background:${riskBg};padding:2px 8px;border-radius:999px;margin-top:5px;font-weight:700;">${riskLabel}</div>
            </div>
          </div>
        </div>

        <!-- Disclaimer fort -->
        <div class="sp-callout warn" style="margin:0 0 22px;">
          <strong>⚠️ Comment fonctionne une montante :</strong> tu mises sur l'étape 1, tu <b>attends le résultat</b>, puis tu remises <b>l'intégralité du gain</b> (mise + bénéfice) sur l'étape 2, et ainsi de suite. Si <b>une seule étape tombe</b>, la chaîne est cassée et tout est perdu. Probabilité de tout réussir = <b>${(totalProb*100).toFixed(1)}%</b>. Aucune garantie. Outil pédagogique, pas une recommandation. <b>18+ · jouer comporte des risques</b>.
        </div>

        <!-- Timeline des étapes -->
        <div style="margin-bottom:24px;">
          <div style="font-size:12px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.6px;font-weight:700;margin-bottom:12px;">📋 Timeline des ${steps.length} étapes</div>
          <div style="display:flex;flex-direction:column;gap:0;">
            ${stepsHtml}
          </div>
        </div>

        <!-- Aide / méthodologie -->
        <div class="sp-callout">
          <strong>Comment cette montante est construite :</strong>
          <ul style="margin:6px 0 0;padding-left:22px;">
            <li>Picks confiance ≥ ${Math.round(conf_min*100)}% (modèle multi-sources calibré)</li>
            <li>Cote individuelle ${odd_min.toFixed(2)}–${odd_max.toFixed(2)} (zone Kelly-fertile)</li>
            <li><b>Séquentialité garantie</b> : chaque match démarre après la fin du précédent + 30min (pour récupérer le gain et reposer)</li>
            <li>Diversification : max 2 picks par sport, max 2 par ligue</li>
            <li>Sélection : top edge marché × confiance modèle dans la fenêtre kickoff</li>
          </ul>
        </div>
      </div>
    `;

    // Wire clicks on steps → ouvrir modal détail
    wrap.querySelectorAll('.montante-step[data-match-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-match-id');
        if (!id) return;
        const allEvents = [];
        for (const d of dates) {
          const evs = (data.days || {})[d] || [];
          allEvents.push(...evs);
        }
        const m = allEvents.find(x => String(x.id) === String(id));
        if (m && typeof openDetail === 'function') openDetail(m);
      });
      const card = el.querySelector('div[style*="background:var(--panel)"]');
      el.addEventListener('mouseover', () => { if (card) { card.style.borderColor = 'var(--brand-border)'; card.style.transform = 'translateY(-1px)'; card.style.boxShadow = 'var(--shadow-sm)'; } });
      el.addEventListener('mouseout', () => { if (card) { card.style.borderColor = 'var(--border)'; card.style.transform = ''; card.style.boxShadow = ''; } });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
      });
    });
  }


  // ======= Boot =======
  // Switch between the pages: simples / combines / value / bilan
  function applyPageView() {
    // v30 Sprint 5 — Page transition : restart fade-in animation
    try {
      const _main = document.querySelector('main');
      if (_main) {
        _main.classList.remove('page-fade-in');
        // Force reflow so the animation can re-trigger
        void _main.offsetWidth;
        _main.classList.add('page-fade-in');
      }
    } catch(e){}
    const isSimples = currentPage === 'simples';
    const isCombines = currentPage === 'combines';
    const isValue = false;  // v31.7.6 — page 'value' retirée (cf. cleanup)
    const isBilan = currentPage === 'bilan';
    const isLocks = currentPage === 'locks';
    const isHistorique = currentPage === 'historique';
    const isSante = currentPage === 'sante' || currentPage === 'profil';
    // Refonte v21 — Nouvelles pages
    const isDashboard = currentPage === 'dashboard';
    const isAlertes = currentPage === 'alertes';
    const isAcademie = currentPage === 'academie';
    const isBacktest = currentPage === 'backtest';
    const isProfil = currentPage === 'profil';
    // Chantier QQ — page dédiée Top Pronos.
    // Sépare le hero + top 5 + autres + prochains de la liste Simples pour
    // que Théo ait une vue "actionnable du jour" sans scroller au milieu de
    // tous les matchs (utile sur mobile).
    const isTop = currentPage === 'top';
    // v23 — nouvelle page Buteurs
    const isButeurs = currentPage === 'buteurs';
    // v29 — Tous les pronos du jour (fini / pas fini tabs)
    const isTous = currentPage === 'tous';
    // v29 — Crédibilité / méthode (ROI vérifiable + qui suis-je)
    const isCredibilite = currentPage === 'credibilite';
    // v31.7 — Montantes (declared early to avoid TDZ in summary-bar visibility check)
    const isMontanteJour     = currentPage === 'montante-jour';
    const isMontanteWeekend  = currentPage === 'montante-weekend';
    const isMontanteSemaine  = currentPage === 'montante-semaine';
    const isMontante = isMontanteJour || isMontanteWeekend || isMontanteSemaine;

    // v23 — Sous-nav "Mon suivi" (historique/bilan/backtest).
    // v30 — "Mes paris" retiré : Théo n'enregistre pas ses paris sur le
    // site (ni manuel, ni import Winamax). Tout le tracking utilisateur
    // a été désactivé.
    const suiviPages = ['historique', 'bilan', 'backtest'];
    const isSuivi = suiviPages.includes(currentPage);
    let suiviNav = document.getElementById('suivi-subnav');
    if (isSuivi) {
      if (!suiviNav) {
        suiviNav = document.createElement('div');
        suiviNav.id = 'suivi-subnav';
        suiviNav.style.cssText = 'max-width:1100px;margin:0 auto;padding:12px 8px 4px;display:flex;gap:6px;flex-wrap:wrap;';
        (document.querySelector('main') || document.body).insertBefore(suiviNav, (document.querySelector('main') || document.body).firstChild);
      }
      const tabs = [
        { k:'historique', emoji:'📜', label:'Historique' },
        { k:'bilan',      emoji:'📊', label:'Bilan' },
        { k:'backtest',   emoji:'📈', label:'Performance' },
      ];
      suiviNav.innerHTML = tabs.map(t => `
        <button data-suivi-page="${t.k}" style="padding:8px 14px;border-radius:var(--r);border:1px solid ${currentPage===t.k?'var(--brand)':'var(--border-2)'};background:${currentPage===t.k?'var(--brand-soft)':'var(--panel)'};color:${currentPage===t.k?'var(--brand)':'var(--text-2)'};font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;">${t.emoji} ${t.label}</button>
      `).join('');
      suiviNav.querySelectorAll('[data-suivi-page]').forEach(b => {
        b.addEventListener('click', () => {
          currentPage = b.dataset.suiviPage;
          try { localStorage.setItem('currentPage', currentPage); } catch(e){}
          applyPageView();
        });
      });
      suiviNav.style.display = '';
    } else if (suiviNav) {
      suiviNav.style.display = 'none';
    }

    // v30 — Sous-nav "Pronos" (tous/locks/buteurs/combines/simples/top).
    // Mêmes onglets que le dropdown Pronos, mais rendus en ligne au-dessus
    // de la page pour que l'user switche sans rouvrir le menu.
    const pronosPages = ['tous', 'locks', 'buteurs', 'combines', 'simples', 'top'];
    const isPronos = pronosPages.includes(currentPage);
    let pronosNav = document.getElementById('pronos-subnav');
    if (isPronos) {
      if (!pronosNav) {
        pronosNav = document.createElement('div');
        pronosNav.id = 'pronos-subnav';
        pronosNav.style.cssText = 'max-width:1100px;margin:0 auto;padding:12px 8px 4px;display:flex;gap:6px;flex-wrap:wrap;';
        (document.querySelector('main') || document.body).insertBefore(pronosNav, (document.querySelector('main') || document.body).firstChild);
      }
      const tabs = [
        { k:'tous',     emoji:'📋', label:'Tous' },
        { k:'locks',    emoji:'🔒', label:'Paris sûrs' },
        { k:'buteurs',  emoji:'⚽', label:'Buteurs' },
        { k:'combines', emoji:'🔗', label:'Combinés' },
        { k:'simples',  emoji:'🎯', label:'Par sport' },
        { k:'top',      emoji:'⭐', label:'Top du jour' },
      ];
      pronosNav.innerHTML = tabs.map(t => `
        <button data-pronos-page="${t.k}" style="padding:8px 14px;border-radius:var(--r);border:1px solid ${currentPage===t.k?'var(--brand)':'var(--border-2)'};background:${currentPage===t.k?'var(--brand-soft)':'var(--panel)'};color:${currentPage===t.k?'var(--brand)':'var(--text-2)'};font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;">${t.emoji} ${t.label}</button>
      `).join('');
      pronosNav.querySelectorAll('[data-pronos-page]').forEach(b => {
        b.addEventListener('click', () => {
          currentPage = b.dataset.pronosPage;
          try { localStorage.setItem('currentPage', currentPage); } catch(e){}
          applyPageView();
        });
      });
      pronosNav.style.display = '';
    } else if (pronosNav) {
      pronosNav.style.display = 'none';
    }

    // Filter bar only for simples. Top picks wrap est exclusivement sur la
    // page Top Pronos (plus affiché en tête des Simples).
    const el = document.getElementById('filters');
    if (el) el.style.display = isSimples ? '' : 'none';
    const tp = document.getElementById('top-picks-wrap');
    if (tp) tp.style.display = isTop ? '' : 'none';
    // v31.7.2 — Ajouter un h1 sur la page Top (audit a note l'absence)
    let topH1 = document.getElementById('top-page-h1');
    if (isTop && tp) {
      if (!topH1) {
        topH1 = document.createElement('div');
        topH1.id = 'top-page-h1';
        topH1.style.cssText = 'max-width:1100px;margin:0 auto;padding:8px 8px 0;';
        topH1.innerHTML = '<span class="section-eyebrow">Sélection du modèle</span><h1 class="section-title-v2" style="margin-bottom:6px;">⭐ Top du jour</h1><p class="section-subtitle-v2" style="margin-bottom:18px;">Les picks les plus solides selon le modèle, classés par valeur (edge × confiance).</p>';
        tp.parentElement.insertBefore(topH1, tp);
      }
      topH1.style.display = '';
    } else if (topH1) {
      topH1.style.display = 'none';
    }
    // League panels
    document.querySelectorAll('[data-panel]').forEach(el => {
      el.style.display = isSimples ? '' : 'none';
    });
    // Sport tab bar (only relevant for simples)
    // v26.1 — topbar sports sub-nav : visible uniquement sur Paris du jour
    const sportTabs = document.getElementById('tabs');
    if (sportTabs) sportTabs.style.display = isSimples ? 'flex' : 'none';

    // Combines only for combines page
    const comb = document.getElementById('combines-wrap');
    if (comb) comb.style.display = isCombines ? '' : 'none';

    // Summary bar: shown for simples + bilan + top, hidden for combines/value/locks/historique/sante + nouvelles pages
    const sum = document.getElementById('summary-bar');
    if (sum) sum.style.display = (isCombines || isValue || isLocks || isHistorique || isSante || isDashboard || isAlertes || isAcademie || isBacktest || isProfil || isButeurs || isTous || isCredibilite || isMontante) ? 'none' : '';

    // Chantier IIII — Simples quick-take IA (visible only on Simples)
    const iaSimples = document.getElementById('ia-simples-wrap');
    if (iaSimples) {
      iaSimples.style.display = isSimples ? '' : 'none';
      if (isSimples) {
        try {
          const data = window.PRONOSTICS_DATA;
          const all = [];
          if (data && data.days) {
            // FIX audit Simples #2 : Coach IA snapshot doit refléter le jour
            // SÉLECTIONNÉ par l'utilisateur (currentDate), pas seulement
            // today. Avant : si l'utilisateur naviguait sur demain, le
            // snapshot continuait à parler des locks du jour réel.
            // Plus : scanner aussi les buckets adjacents pour les TZ-shifted
            // matchs (ESPN range les Brasileirão tardifs sous le jour UTC
            // précédent), cohérent avec render() qui fait pareil.
            const targetDate = (typeof currentDate !== 'undefined' && currentDate) ? currentDate : new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
            const seenIds = new Set();
            const _addBucket = (iso) => {
              ((data.days[iso]) || []).forEach(m => {
                if (m.id && seenIds.has(m.id)) return;
                if (m.id) seenIds.add(m.id);
                // Filtrer pour ne garder que les matchs qui correspondent au
                // jour Europe/Paris cible (utile pour les TZ-shifted)
                try {
                  const matchDay = new Date(m.date).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
                  if (matchDay === targetDate) all.push(m);
                } catch (e) { all.push(m); }
              });
            };
            // Scan today + ±1 jour pour capturer les TZ-shifted
            _addBucket(targetDate);
            const _shifted = (iso, days) => {
              try {
                const d = new Date(iso); d.setDate(d.getDate() + days);
                return d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
              } catch (e) { return iso; }
            };
            _addBucket(_shifted(targetDate, -1));
            _addBucket(_shifted(targetDate, 1));
          }
          // Appliquer les mêmes filtres que la page (Winamax + sport courant)
          const filtered = all.filter(m => {
            if (typeof winamaxOnly !== 'undefined' && winamaxOnly) {
              if (!(m.winamax && m.winamax.available === true)) return false;
            }
            if (typeof currentSport !== 'undefined' && currentSport && currentSport !== 'all') {
              if (m.sport !== currentSport) return false;
            }
            return true;
          });
          // v30 — Coach IA snapshot Simples retiré.
          iaSimples.innerHTML = '';
        } catch (e) { iaSimples.innerHTML = ''; }
      }
    }

    // Locks page: render dedicated list of all lock picks across all days/sports
    let locksWrap = document.getElementById('locks-wrap');
    if (!locksWrap) {
      locksWrap = document.createElement('div');
      locksWrap.id = 'locks-wrap';
      (document.querySelector('main') || document.body).appendChild(locksWrap);
    }
    locksWrap.style.display = isLocks ? '' : 'none';
    if (isLocks) renderLocksPage(locksWrap);

    // Historique page: list of all settled picks with filters + daily stats + export
    let historiqueWrap = document.getElementById('historique-wrap');
    if (!historiqueWrap) {
      historiqueWrap = document.createElement('div');
      historiqueWrap.id = 'historique-wrap';
      (document.querySelector('main') || document.body).appendChild(historiqueWrap);
    }
    historiqueWrap.style.display = isHistorique ? '' : 'none';
    if (isHistorique) {
      // v30 #3 — Historique a besoin du full dataset (tous les jours).
      // Si on est encore en mode lite, kicke le fetch et re-render dès dispo.
      renderHistoriquePage(historiqueWrap);
      if (window.PRONOSTICS_DATA && window.PRONOSTICS_DATA._lite && typeof window._ensureFullData === 'function') {
        window._ensureFullData().then(() => { try { renderHistoriquePage(historiqueWrap); } catch(e){} }).catch(()=>{});
      }
    }

    // v31.7.6 — Value Finder page retiree (cleanup), plus de wrap a maintenir.

    // Bilan page: render dedicated view in #bilan-wrap
    let bilanWrap = document.getElementById('bilan-wrap');
    if (!bilanWrap) {
      bilanWrap = document.createElement('div');
      bilanWrap.id = 'bilan-wrap';
      (document.querySelector('main') || document.body).appendChild(bilanWrap);
    }
    bilanWrap.style.display = isBilan ? '' : 'none';
    if (isBilan) {
      renderBilanPage(bilanWrap);
      if (window.PRONOSTICS_DATA && window.PRONOSTICS_DATA._lite && typeof window._ensureFullData === 'function') {
        window._ensureFullData().then(() => { try { renderBilanPage(bilanWrap); } catch(e){} }).catch(()=>{});
      }
    }

    // v30 — Mes paris : page retirée. Voir suiviPages plus haut.

    // Chantier BBBB — Santé (Coach IA admin) — accessible via Profil
    let santeWrap = document.getElementById('sante-wrap');
    if (!santeWrap) {
      santeWrap = document.createElement('div');
      santeWrap.id = 'sante-wrap';
      (document.querySelector('main') || document.body).appendChild(santeWrap);
    }
    santeWrap.style.display = (currentPage === 'sante') ? '' : 'none';
    if (currentPage === 'sante') renderSantePage(santeWrap);

    // Refonte v21 — Dashboard home
    let dashWrap = document.getElementById('dashboard-wrap');
    if (!dashWrap) {
      dashWrap = document.createElement('div');
      dashWrap.id = 'dashboard-wrap';
      (document.querySelector('main') || document.body).appendChild(dashWrap);
    }
    dashWrap.style.display = isDashboard ? '' : 'none';
    if (isDashboard) renderDashboardPage(dashWrap);
    // v27 — One-feed Agent : toggle body class (CSS gère nav/FAB/search)
    document.body.classList.toggle('agent-home', isDashboard);
    document.body.classList.toggle('agent-inside', !isDashboard);
    // v27 — Wire return-to-home button (once)
    const _rb = document.getElementById('agent-return-btn');
    if (_rb && !_rb._wired) {
      _rb._wired = true;
      _rb.addEventListener('click', () => {
        const b = document.querySelector('.page-btn[data-page="dashboard"]');
        if (b) b.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Refonte v21 — Alertes
    let alertesWrap = document.getElementById('alertes-wrap');
    if (!alertesWrap) {
      alertesWrap = document.createElement('div');
      alertesWrap.id = 'alertes-wrap';
      (document.querySelector('main') || document.body).appendChild(alertesWrap);
    }
    alertesWrap.style.display = isAlertes ? '' : 'none';
    if (isAlertes) renderAlertesPage(alertesWrap);

    // v23 — Buteurs
    let buteursWrap = document.getElementById('buteurs-wrap');
    if (!buteursWrap) {
      buteursWrap = document.createElement('div');
      buteursWrap.id = 'buteurs-wrap';
      (document.querySelector('main') || document.body).appendChild(buteursWrap);
    }
    buteursWrap.style.display = isButeurs ? '' : 'none';
    if (isButeurs) renderButeursPage(buteursWrap);

    // Refonte v21 — Académie
    let academieWrap = document.getElementById('academie-wrap');
    if (!academieWrap) {
      academieWrap = document.createElement('div');
      academieWrap.id = 'academie-wrap';
      (document.querySelector('main') || document.body).appendChild(academieWrap);
    }
    academieWrap.style.display = isAcademie ? '' : 'none';
    if (isAcademie) renderAcademiePage(academieWrap);

    // Refonte v22 — Backtest + Attribution (remplace What-if)
    let backtestWrap = document.getElementById('backtest-wrap');
    if (!backtestWrap) {
      backtestWrap = document.createElement('div');
      backtestWrap.id = 'backtest-wrap';
      (document.querySelector('main') || document.body).appendChild(backtestWrap);
    }
    backtestWrap.style.display = isBacktest ? '' : 'none';
    if (isBacktest) {
      renderBacktestPage(backtestWrap);
      if (window.PRONOSTICS_DATA && window.PRONOSTICS_DATA._lite && typeof window._ensureFullData === 'function') {
        window._ensureFullData().then(() => { try { renderBacktestPage(backtestWrap); } catch(e){} }).catch(()=>{});
      }
    }

    // Refonte v21 — Profil
    let profilWrap = document.getElementById('profil-wrap');
    if (!profilWrap) {
      profilWrap = document.createElement('div');
      profilWrap.id = 'profil-wrap';
      (document.querySelector('main') || document.body).appendChild(profilWrap);
    }
    profilWrap.style.display = isProfil ? '' : 'none';
    if (isProfil) renderProfilPage(profilWrap);

    // v31.7 — Montantes (consts isMontante* declared at top of function for TDZ)
    let montanteWrap = document.getElementById('montante-wrap');
    if (!montanteWrap) {
      montanteWrap = document.createElement('div');
      montanteWrap.id = 'montante-wrap';
      (document.querySelector('main') || document.body).appendChild(montanteWrap);
    }
    montanteWrap.style.display = isMontante ? '' : 'none';
    if (isMontante) {
      const type = isMontanteJour ? 'jour' : isMontanteWeekend ? 'weekend' : 'semaine';
      renderMontantePage(montanteWrap, type);
    }

    // v31.1 — Hash routes #legal et #methodologie redirigent vers les pages
    // statiques HTML (legal.html / methodologie.html). Économie : ~26 KB
    // de JS (renderLegalPage + renderMethodologiePage supprimés). Le contenu
    // vit maintenant dans UN SEUL endroit (le fichier statique), pas
    // dupliqué entre SPA et HTML statique.
    if (currentPage === 'legal') {
      window.location.replace('legal.html');
      return;
    }
    if (currentPage === 'methodologie') {
      window.location.replace('methodologie.html');
      return;
    }

    // v29 — Tous les pronos du jour (fini / pas fini tabs)
    let tousWrap = document.getElementById('tous-wrap');
    if (!tousWrap) {
      tousWrap = document.createElement('div');
      tousWrap.id = 'tous-wrap';
      (document.querySelector('main') || document.body).appendChild(tousWrap);
    }
    tousWrap.style.display = isTous ? '' : 'none';
    if (isTous) renderTousPage(tousWrap);

    // v29 — Crédibilité / méthode
    let credWrap = document.getElementById('credibilite-wrap');
    if (!credWrap) {
      credWrap = document.createElement('div');
      credWrap.id = 'credibilite-wrap';
      (document.querySelector('main') || document.body).appendChild(credWrap);
    }
    credWrap.style.display = isCredibilite ? '' : 'none';
    if (isCredibilite) renderCredibilitePage(credWrap);

    // Highlight active nav button — CSS handles styling via .active class
    document.querySelectorAll('.page-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.page === currentPage);
    });
    // v30 — Highlight active hub (Pronos/Ma perf/Plus) when current page
    // is one of its children. Dashboard stays as a solo button.
    const HUB_PAGES = {
      pronos: ['tous', 'locks', 'buteurs', 'combines', 'simples', 'top', 'value'],
      perf:   ['historique', 'bilan', 'backtest'],
      plus:   ['academie', 'credibilite', 'alertes', 'profil', 'sante'],
    };
    document.querySelectorAll('nav.topbar-nav .hub').forEach(h => {
      const k = h.dataset.hub;
      const pages = HUB_PAGES[k] || [];
      const btn = h.querySelector('.hub-btn');
      if (btn) btn.classList.toggle('active', pages.includes(currentPage));
    });
  }

  // ======= Personal-bets bilan (from localStorage) =======
  // For each saved bet, look up the current match; if it's completed, compute
  // the result against the saved pickKey and stake. This is the honest PERSONAL
  // ROI — tied to the actual stakes Théo placed, not the flat-unit model ROI.
  function computeMyBilan() {
    const data = window.PRONOSTICS_DATA;
    if (!data || !data.days) return null;
    const bets = loadMyBets();
    const byId = {};
    Object.values(data.days).forEach(arr => (arr || []).forEach(m => { if (m.id) byId[m.id] = m; }));
    let staked = 0, returned = 0, w = 0, l = 0, pending = 0;
    const rows = [];
    for (const [key, b] of Object.entries(bets)) {
      const m = byId[b.matchId];
      let res = 'pending', payout = 0;
      if (m && m.completed) {
        // Build a minimal pseudo-pred to reuse evaluateModelPick
        const pseudo = { pick: { key: b.pickKey } };
        const r = evaluateModelPick(m, pseudo);
        if (r === 'won')  { res = 'won';  payout = b.stake * b.odds; w++; }
        else if (r === 'lost') { res = 'lost'; payout = 0;             l++; }
        else { res = 'pending'; }
      }
      if (res === 'pending') pending++;
      if (res !== 'pending') { staked += b.stake; returned += payout; }
      rows.push({ key, bet: b, match: m, res, payout });
    }
    const pl = returned - staked;
    const roi = staked > 0 ? (pl / staked) : 0;
    return {
      bets: rows.length,
      settled: w + l,
      pending,
      w, l,
      staked, returned, pl,
      roi,
      rows: rows.sort((a, b) => (b.bet.placedAt || '').localeCompare(a.bet.placedAt || '')),
    };
  }

  // Build an inline SVG line chart of the cumulative P&L curve.
  // Takes rows: [{ date: 'YYYY-MM-DD', delta: +0.85 | -1.00 }]. Assumes flat 1u
  // bets, so the Y axis is units (one lost bet = -1). Groups by day, accumulates.
  function renderRoiChart(rows, { width = 560, height = 160, title, unit = 'u' } = {}) {
    if (!rows || !rows.length) return '';
    // Group by day
    const byDay = new Map();
    rows.forEach(r => {
      const d = isoDate(r.date);
      if (!d) return;
      byDay.set(d, (byDay.get(d) || 0) + r.delta);
    });
    const sortedDays = [...byDay.keys()].sort();
    if (!sortedDays.length) return '';
    let cum = 0;
    const pts = sortedDays.map(d => {
      cum += byDay.get(d);
      return { d, cum };
    });
    // X: index evenly spaced; Y: domain padded
    const minY = Math.min(0, ...pts.map(p => p.cum));
    const maxY = Math.max(0, ...pts.map(p => p.cum));
    const padY = Math.max(0.5, (maxY - minY) * 0.1);
    const y0 = minY - padY, y1 = maxY + padY;
    const marginL = 40, marginR = 12, marginT = 20, marginB = 28;
    const plotW = width - marginL - marginR;
    const plotH = height - marginT - marginB;
    const xAt = i => marginL + (pts.length === 1 ? plotW / 2 : (i / (pts.length - 1)) * plotW);
    const yAt = v => marginT + plotH - ((v - y0) / (y1 - y0)) * plotH;
    const zeroY = yAt(0);
    // Build polyline points
    const poly = pts.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.cum).toFixed(1)}`).join(' ');
    // Area under curve (from zero line)
    const areaPath = pts.length
      ? `M ${xAt(0).toFixed(1)} ${zeroY.toFixed(1)} L ${poly.split(' ').join(' L ')} L ${xAt(pts.length - 1).toFixed(1)} ${zeroY.toFixed(1)} Z`
      : '';
    const lastCum = pts[pts.length - 1].cum;
    const posColor = '#34d399', negColor = '#f87171';
    const stroke = lastCum >= 0 ? posColor : negColor;
    const areaFill = lastCum >= 0 ? 'rgba(52,211,153,.18)' : 'rgba(248,113,113,.18)';
    // X labels: show first, middle, last days
    const xTicks = pts.length <= 5
      ? pts.map((p, i) => ({ x: xAt(i), label: p.d.slice(5) }))
      : [0, Math.floor(pts.length / 2), pts.length - 1].map(i => ({ x: xAt(i), label: pts[i].d.slice(5) }));
    const yTicks = [y0, 0, y1].filter((v, i, arr) => i === arr.indexOf(v));
    return `
      <div style="background:var(--surface,#111827);border:1px solid var(--border,#2a3744);border-radius:12px;padding:14px;margin-bottom:24px;">
        ${title ? `<div style="font-size:13px;color:var(--text-dim,#b4bcc7);margin-bottom:8px;font-weight:600;">${esc(title)} · <span style="color:${lastCum>=0?posColor:negColor};">${lastCum>=0?'+':''}${lastCum.toFixed(2)}${unit}</span></div>` : ''}
        <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;display:block;" xmlns="http://www.w3.org/2000/svg">
          <line x1="${marginL}" y1="${zeroY.toFixed(1)}" x2="${width - marginR}" y2="${zeroY.toFixed(1)}" stroke="rgba(255,255,255,.15)" stroke-dasharray="3 3"/>
          ${yTicks.map(v => `<text x="${marginL - 6}" y="${(yAt(v)+4).toFixed(1)}" text-anchor="end" fill="var(--text-dim2,#7b8693)" font-size="10" font-family="sans-serif">${v.toFixed(1)}${unit}</text>`).join('')}
          <path d="${areaPath}" fill="${areaFill}" stroke="none"/>
          <polyline points="${poly}" fill="none" stroke="${stroke}" stroke-width="2"/>
          ${pts.map((p, i) => `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(p.cum).toFixed(1)}" r="2.5" fill="${stroke}"><title>${p.d}: ${p.cum>=0?'+':''}${p.cum.toFixed(2)}${unit}</title></circle>`).join('')}
          ${xTicks.map(t => `<text x="${t.x.toFixed(1)}" y="${(height - 6).toFixed(1)}" text-anchor="middle" fill="var(--text-dim2,#7b8693)" font-size="10" font-family="sans-serif">${t.label}</text>`).join('')}
        </svg>
      </div>
    `;
  }

  // v31.7.22 — Multi-series ROI chart : superpose plusieurs fenêtres sur
  // le même graphe. `seriesArray` = [{ label, color, rows }]. Chaque rows
  // est { date, delta }. L'axe X est l'union des dates triées ; chaque
  // série n'apparaît qu'à partir de sa première date présente. Aligné sur
  // un Y partagé (toutes courbes scalées identique pour comparaison).
  function renderRoiChartMulti(seriesArray, { width = 560, height = 200, title, unit = 'u' } = {}) {
    if (!seriesArray || !seriesArray.length) return '';
    // Pour chaque série, calcul cumulatif par jour.
    const seriesPts = seriesArray.map(s => {
      const byDay = new Map();
      (s.rows || []).forEach(r => {
        const d = isoDate(r.date);
        if (!d) return;
        byDay.set(d, (byDay.get(d) || 0) + r.delta);
      });
      const sortedDays = [...byDay.keys()].sort();
      let cum = 0;
      const pts = sortedDays.map(d => { cum += byDay.get(d); return { d, cum }; });
      return { label: s.label, color: s.color, pts, finalCum: pts.length ? pts[pts.length-1].cum : 0 };
    }).filter(s => s.pts.length > 0);
    if (!seriesPts.length) return '';
    // Union de toutes les dates pour l'axe X.
    const allDates = new Set();
    seriesPts.forEach(s => s.pts.forEach(p => allDates.add(p.d)));
    const xDays = [...allDates].sort();
    const xIdx = new Map(xDays.map((d, i) => [d, i]));
    // Y domain partagé pour toutes les séries.
    let minY = 0, maxY = 0;
    seriesPts.forEach(s => s.pts.forEach(p => {
      if (p.cum < minY) minY = p.cum;
      if (p.cum > maxY) maxY = p.cum;
    }));
    const padY = Math.max(0.5, (maxY - minY) * 0.1);
    const y0 = minY - padY, y1 = maxY + padY;
    const marginL = 40, marginR = 12, marginT = 26, marginB = 28;
    const plotW = width - marginL - marginR;
    const plotH = height - marginT - marginB;
    const xAt = i => marginL + (xDays.length === 1 ? plotW / 2 : (i / (xDays.length - 1)) * plotW);
    const yAt = v => marginT + plotH - ((v - y0) / (y1 - y0)) * plotH;
    const zeroY = yAt(0);
    // Polylines + circles pour chaque série.
    const polys = seriesPts.map(s => {
      const points = s.pts.map(p => `${xAt(xIdx.get(p.d)).toFixed(1)},${yAt(p.cum).toFixed(1)}`).join(' ');
      return `<polyline points="${points}" fill="none" stroke="${s.color}" stroke-width="2" opacity="0.85"/>`;
    }).join('');
    const circles = seriesPts.map(s => s.pts.map(p =>
      `<circle cx="${xAt(xIdx.get(p.d)).toFixed(1)}" cy="${yAt(p.cum).toFixed(1)}" r="2" fill="${s.color}"><title>${s.label} · ${p.d}: ${p.cum>=0?'+':''}${p.cum.toFixed(2)}${unit}</title></circle>`
    ).join('')).join('');
    const xTicks = xDays.length <= 5
      ? xDays.map((d, i) => ({ x: xAt(i), label: d.slice(5) }))
      : [0, Math.floor(xDays.length / 2), xDays.length - 1].map(i => ({ x: xAt(i), label: xDays[i].slice(5) }));
    const yTicks = [y0, 0, y1].filter((v, i, arr) => i === arr.indexOf(v));
    // Légende : un chip par série avec final cumul.
    const legend = seriesPts.map(s =>
      `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--text-dim,#b4bcc7);">
        <span style="width:10px;height:10px;border-radius:2px;background:${s.color};"></span>
        <b>${esc(s.label)}</b> <span style="color:${s.finalCum>=0?'#34d399':'#f87171'};">${s.finalCum>=0?'+':''}${s.finalCum.toFixed(2)}${unit}</span>
      </span>`
    ).join(' · ');
    return `
      <div style="background:var(--surface,#111827);border:1px solid var(--border,#2a3744);border-radius:12px;padding:14px;margin-bottom:24px;">
        ${title ? `<div style="font-size:13px;color:var(--text-dim,#b4bcc7);margin-bottom:8px;font-weight:600;">${esc(title)}</div>` : ''}
        <div style="margin-bottom:10px;">${legend}</div>
        <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;display:block;" xmlns="http://www.w3.org/2000/svg">
          <line x1="${marginL}" y1="${zeroY.toFixed(1)}" x2="${width - marginR}" y2="${zeroY.toFixed(1)}" stroke="rgba(255,255,255,.15)" stroke-dasharray="3 3"/>
          ${yTicks.map(v => `<text x="${marginL - 6}" y="${(yAt(v)+4).toFixed(1)}" text-anchor="end" fill="var(--text-dim2,#7b8693)" font-size="10" font-family="sans-serif">${v.toFixed(1)}${unit}</text>`).join('')}
          ${polys}
          ${circles}
          ${xTicks.map(t => `<text x="${t.x.toFixed(1)}" y="${(height - 6).toFixed(1)}" text-anchor="middle" fill="var(--text-dim2,#7b8693)" font-size="10" font-family="sans-serif">${t.label}</text>`).join('')}
        </svg>
      </div>
    `;
  }

  // ====== Calibration (reliability diagram) ======
  // Walk completed events, run predictMatch on each, bucket the predicted pick
  // probability into 10-point bins, and compare to the actual outcome. A well-
  // calibrated model should have the bucket's observed win rate ≈ bucket midpoint.
  // Anything off-diagonal = over- or under-confidence we should correct.
  function computeCalibration() {
    const data = window.PRONOSTICS_DATA;
    if (!data || !data.days) return [];
    // Bucket edges centrés sur la plage qu'on produit réellement (45-95%).
    // Buckets larges (10pts) pour accumuler ≥5 matchs par bucket rapidement
    // — le régime ultra-sélectif actuel (5-10 picks/j, skip <0.45) ne sort
    // presque jamais de la zone 50-80%, donc 5 buckets bien peuplés valent
    // mieux que 7 buckets à moitié vides qui tirent des bulles aberrantes.
    const buckets = [
      { lo: 0.40, hi: 0.55, mid: 0.475, n: 0, w: 0 },
      { lo: 0.55, hi: 0.65, mid: 0.60,  n: 0, w: 0 },
      { lo: 0.65, hi: 0.75, mid: 0.70,  n: 0, w: 0 },
      { lo: 0.75, hi: 0.85, mid: 0.80,  n: 0, w: 0 },
      { lo: 0.85, hi: 1.01, mid: 0.925, n: 0, w: 0 },
    ];
    const seen = new Set();
    Object.values(data.days).forEach(arr => (arr || []).forEach(m => {
      if (!m.completed) return;
      if (m.id && seen.has(m.id)) return;
      if (m.id) seen.add(m.id);
      const pred = predictMatch(m);
      if (!pred || !pred.pick || pred.skip) return;
      const res = evaluateModelPick(m, pred);
      if (res == null) return;
      // Reliability diagram buckets by the UI confidence (`reliability`), not
      // the raw pick prob — this is what the user sees on the gauge, so
      // calibrating it is what matters for decision-making.
      const p = pred.reliability ?? pred.pick.prob;
      const b = buckets.find(bk => p >= bk.lo && p < bk.hi);
      if (!b) return;
      b.n++;
      if (res === 'won') b.w++;
    }));
    return buckets.filter(b => b.n > 0).map(b => ({
      bucket: `${Math.round(b.lo*100)}-${Math.round(b.hi*100)}%`,
      predicted: b.mid,
      actual: b.w / b.n,
      n: b.n,
    }));
  }

  // Inline SVG reliability diagram: scatter of (predicted, actual) with the
  // perfect-calibration diagonal. Bubble radius scales with sample size so
  // we instantly see which buckets are statistically noisy.
  function renderReliabilityDiagram(cal) {
    if (!cal || !cal.length) {
      return `<div style="padding:14px;background:var(--surface);border:1px dashed var(--border);border-radius:10px;color:var(--text-muted);font-size:13px;">Pas encore assez de matchs joués pour tracer la calibration du modèle.</div>`;
    }
    // Filtrer les buckets trop maigres (n<5) : avec 1-4 matchs, le WR observé
    // rebondit entre 0% et 100% et pollue le diagramme avec des points aberrants
    // qui ne disent rien sur la calibration. On les regroupe dans un compteur
    // "buckets masqués" affiché en légende, sans les dessiner.
    const MIN_N = 5;
    const shown = cal.filter(c => c.n >= MIN_N);
    const hidden = cal.filter(c => c.n < MIN_N);
    const hiddenN = hidden.reduce((s, c) => s + c.n, 0);
    if (!shown.length) {
      return `<div style="padding:14px;background:var(--surface);border:1px dashed var(--border);border-radius:10px;color:var(--text-muted);font-size:13px;">Encore trop peu de matchs joués par bucket (min 5) pour tracer la calibration. ${cal.length} bucket(s) de &lt;5 matchs masqué(s) en attendant.</div>`;
    }
    const w = 560, h = 260;
    const mL = 44, mR = 18, mT = 18, mB = 38;
    const pw = w - mL - mR, ph = h - mT - mB;
    // Both axes span 0.40 → 1.00 (the range we actually produce picks in)
    const xAt = p => mL + ((p - 0.40) / 0.60) * pw;
    const yAt = p => mT + ph - ((p - 0.40) / 0.60) * ph;
    const maxN = Math.max(...shown.map(c => c.n));
    const rAt = n => 5 + Math.sqrt(n / maxN) * 14;
    // Grid lines at every 10pts
    const ticks = [0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.00];
    const gridLines = ticks.map(t => `
      <line x1="${xAt(t).toFixed(1)}" y1="${mT}" x2="${xAt(t).toFixed(1)}" y2="${(mT+ph).toFixed(1)}" stroke="rgba(255,255,255,.04)"/>
      <line x1="${mL}" y1="${yAt(t).toFixed(1)}" x2="${(mL+pw).toFixed(1)}" y2="${yAt(t).toFixed(1)}" stroke="rgba(255,255,255,.04)"/>
    `).join('');
    const xLabels = ticks.map(t => `<text x="${xAt(t).toFixed(1)}" y="${(h-14).toFixed(1)}" text-anchor="middle" fill="var(--text-dim2,#7b8693)" font-size="10">${Math.round(t*100)}%</text>`).join('');
    const yLabels = ticks.map(t => `<text x="${(mL-6).toFixed(1)}" y="${(yAt(t)+4).toFixed(1)}" text-anchor="end" fill="var(--text-dim2,#7b8693)" font-size="10">${Math.round(t*100)}%</text>`).join('');
    // Perfect-calibration diagonal (predicted == actual)
    const diag = `<line x1="${xAt(0.40).toFixed(1)}" y1="${yAt(0.40).toFixed(1)}" x2="${xAt(1.00).toFixed(1)}" y2="${yAt(1.00).toFixed(1)}" stroke="rgba(255,255,255,.25)" stroke-dasharray="4 4"/>`;
    // Wilson 95% CI pour chaque bucket — visualise la marge d'erreur liée à
    // la petite taille d'échantillon (sinon n=5 @ 100% WR paraît aussi certain
    // que n=50 @ 80% WR, ce qui est trompeur).
    const wilsonCI = (p, n) => {
      if (n <= 0) return { lo: p, hi: p };
      const z = 1.96;
      const denom = 1 + (z*z)/n;
      const centre = (p + (z*z)/(2*n)) / denom;
      const margin = (z * Math.sqrt((p*(1-p)/n) + (z*z)/(4*n*n))) / denom;
      return { lo: Math.max(0, centre - margin), hi: Math.min(1, centre + margin) };
    };
    // Scatter points + error bars
    const points = shown.map(c => {
      const cx = xAt(c.predicted), cy = yAt(c.actual), r = rAt(c.n);
      const off = c.actual - c.predicted;
      const col = Math.abs(off) < 0.05 ? '#34d399' : Math.abs(off) < 0.10 ? '#eab308' : '#f87171';
      const ci = wilsonCI(c.actual, c.n);
      const yLo = yAt(Math.max(0.40, ci.lo)), yHi = yAt(Math.min(1.00, ci.hi));
      // Vertical error bar only when CI is wide enough to mean something
      const bar = (ci.hi - ci.lo) > 0.08
        ? `<line x1="${cx.toFixed(1)}" y1="${yLo.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${yHi.toFixed(1)}" stroke="${col}" stroke-opacity=".45" stroke-width="1.5"/>`
        : '';
      const w_won = c.w != null ? `${c.w}/` : '';
      return `${bar}<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${col}" fill-opacity=".25" stroke="${col}" stroke-width="2"><title>Prédit ${Math.round(c.predicted*100)}% · réel ${Math.round(c.actual*100)}% (${w_won}${c.n} matchs · écart ${off>=0?'+':''}${Math.round(off*100)}pts)</title></circle>`;
    }).join('');
    // Summary: weighted mean absolute calibration error (MCE-style), sur les buckets affichés
    const totalN = shown.reduce((s, c) => s + c.n, 0);
    const mae = shown.reduce((s, c) => s + Math.abs(c.actual - c.predicted) * c.n, 0) / totalN;
    const maeColor = mae < 0.05 ? '#34d399' : mae < 0.10 ? '#eab308' : '#f87171';
    const hiddenNote = hidden.length
      ? ` · <span style="color:var(--text-dim2,#7b8693);">${hidden.length} bucket${hidden.length>1?'s':''} masqué${hidden.length>1?'s':''} (&lt;${MIN_N} matchs, ${hiddenN} pick${hiddenN>1?'s':''})</span>`
      : '';
    return `
      <div style="background:var(--surface,#111827);border:1px solid var(--border,#2a3744);border-radius:12px;padding:14px;margin-bottom:24px;">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:8px;">
          <div style="font-size:13px;color:var(--text-dim,#b4bcc7);font-weight:600;">Diagramme de fiabilité · proba prédite vs taux observé</div>
          <div style="font-size:12px;color:var(--text-muted);">Erreur absolue moyenne : <span style="color:${maeColor};font-weight:700;">${(mae*100).toFixed(1)}pts</span> · ${totalN} picks${hiddenNote}</div>
        </div>
        <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block;" xmlns="http://www.w3.org/2000/svg">
          ${gridLines}
          ${diag}
          ${xLabels}
          ${yLabels}
          <text x="${(mL+pw/2).toFixed(1)}" y="${(h-2).toFixed(1)}" text-anchor="middle" fill="var(--text-dim,#b4bcc7)" font-size="11" font-weight="600">Proba prédite</text>
          <text x="12" y="${(mT+ph/2).toFixed(1)}" text-anchor="middle" fill="var(--text-dim,#b4bcc7)" font-size="11" font-weight="600" transform="rotate(-90 12 ${(mT+ph/2).toFixed(1)})">Taux réel observé</text>
          ${points}
        </svg>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;line-height:1.45;">
          Un point sur la diagonale = modèle parfaitement calibré. Au-dessus = sous-confiance du modèle (il gagne plus que ce qu'il prédit). En-dessous = sur-confiance (il gagne moins que ce qu'il prédit). Barre verticale = intervalle de confiance 95% (Wilson). Taille ∝ nombre de matchs. Buckets &lt;${MIN_N} matchs masqués.
        </div>
      </div>
    `;
  }

  // ====== Bankroll garde-fous ======
  // Two banners:
  //  1. Daily exposure cap : total stake on today's not-yet-settled bets > 5% of bankroll → warn.
  //  2. Session stop-loss   : today's settled P&L < -15% of bankroll → red banner, stop betting.
  function computeBankrollGuards() {
    const data = window.PRONOSTICS_DATA;
    const bets = loadMyBets();
    const today = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const byId = {};
    if (data && data.days) {
      Object.values(data.days).forEach(arr => (arr || []).forEach(m => { if (m.id) byId[m.id] = m; }));
    }
    let engagedToday = 0;
    let plToday = 0;
    Object.values(bets).forEach(b => {
      const m = byId[b.matchId];
      const matchDay = m?.date ? new Date(m.date).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }) : isoDate(b.placedAt);
      if (matchDay !== today) return;
      if (!m || !m.completed) {
        // still at risk today
        engagedToday += b.stake;
      } else {
        const pseudo = { pick: { key: b.pickKey } };
        const r = evaluateModelPick(m, pseudo);
        if (r === 'won') plToday += b.stake * (b.odds - 1);
        else if (r === 'lost') plToday += -b.stake;
      }
    });
    const dailyCap = bankroll * 0.05;
    const stopLoss = -bankroll * 0.15;
    return { engagedToday, dailyCap, plToday, stopLoss, today };
  }

  // ====== STATS HELPERS (Wilson CI, drawdown, stddev) ======
  // Wilson score interval for a binomial proportion. Far more honest than
  // raw WR on small samples — a 5/6 (83%) WR has a Wilson 95% CI of roughly
  // [44%, 97%], whereas 50/60 (also 83%) is [71%, 91%]. Surfaces small-sample
  // noise that naive "look at the ROI" hides.
  // Returns { low, high, point } in [0,1], all as probabilities.
  function wilsonCI(wins, n, z = 1.96) {
    if (!n || n <= 0) return { low: 0, high: 0, point: 0 };
    const p = wins / n;
    const z2 = z * z;
    const denom = 1 + z2 / n;
    const center = (p + z2 / (2 * n)) / denom;
    const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denom;
    return { low: Math.max(0, center - margin), high: Math.min(1, center + margin), point: p };
  }
  // Max drawdown: biggest peak-to-trough drop over the equity curve.
  // deltas: array of per-bet P&L numbers in chronological order.
  // Returns { maxDD (positive number, in units), ddStart, ddEnd, currentPeak, currentDD }.
  function maxDrawdown(deltas) {
    let peak = 0, cum = 0, maxDD = 0;
    let peakIdx = -1, troughIdx = -1, ddStartIdx = -1, ddEndIdx = -1;
    deltas.forEach((d, i) => {
      cum += d;
      if (cum > peak) { peak = cum; peakIdx = i; }
      const dd = peak - cum;
      if (dd > maxDD) { maxDD = dd; ddStartIdx = peakIdx; ddEndIdx = i; }
    });
    const currentPeak = peak;
    const currentDD = peak - cum;
    return { maxDD, ddStartIdx, ddEndIdx, currentPeak, currentDD };
  }

  // Count bets Théo has placed on a given match (same match = correlated risk).
  // Used to surface "⚠️ Pari corrélé" badges on top picks and bilan rows.
  function getMatchBetCount(matchId) {
    if (!matchId) return 0;
    const bets = loadMyBets();
    let n = 0;
    for (const k of Object.keys(bets)) {
      if (bets[k].matchId === String(matchId)) n++;
    }
    return n;
  }

  // ======= Page Locks =======

  // Chantier I — vue dédiée aux picks isLock (fiab ≥ 0.70) tous sports
  // confondus, tous jours confondus. Split en trois sections : à venir,
  // en cours, settled récents. Hero compact avec compteurs + WR lifetime.
  function renderLocksPage(wrap) {
    const data = window.PRONOSTICS_DATA;
    if (!data || !data.days) { wrap.innerHTML = '<div class="bilan-empty">Pas de données disponibles.</div>'; return; }

    // Collect every match (dedup by id) — scan all stored day keys, same logic as render().
    const seenIds = new Set();
    const allMatches = [];
    Object.values(data.days).forEach(arr => (arr || []).forEach(m => {
      if (m.id && seenIds.has(m.id)) return;
      if (m.id) seenIds.add(m.id);
      allMatches.push(m);
    }));

    // Keep only Winamax-available matches with a lock pick (fiab ≥ 0.70).
    // predictMatch handles skip / lowConf / odds fallback already.
    const lockMatches = [];
    for (const m of allMatches) {
      if (winamaxOnly && !(m.winamax && m.winamax.available === true)) continue;
      const pred = predictMatch(m);
      if (!pred || !pred.pick || pred.skip || !pred.isLock) continue;
      lockMatches.push({ m, pred });
    }

    // Split by state: live, upcoming, settled (recent last 48h)
    const now = Date.now();
    const cutoffSettled = now - 48 * 3600 * 1000;
    const live = [];
    const upcoming = [];
    const settled = [];
    lockMatches.forEach(entry => {
      const { m } = entry;
      const isLive = m.status === 'STATUS_IN_PROGRESS';
      const isFinal = m.completed || m.status === 'STATUS_FINAL' || m.status === 'STATUS_FULL_TIME';
      const ko = m.date ? new Date(m.date).getTime() : NaN;
      if (isLive) { live.push(entry); return; }
      if (isFinal) {
        if (!isNaN(ko) && ko >= cutoffSettled) settled.push(entry);
        return;
      }
      if (!isNaN(ko) && ko > now - 15 * 60 * 1000) upcoming.push(entry);
    });
    upcoming.sort((a, b) => new Date(a.m.date) - new Date(b.m.date));
    settled.sort((a, b) => new Date(b.m.date) - new Date(a.m.date));

    // Sidebar counter: upcoming + live locks (actionable)
    const counterEl = document.getElementById('count-locks');
    if (counterEl) counterEl.textContent = String(upcoming.length + live.length);

    // === Lifetime lock stats (for the hero header) ===
    // Walks every completed match in the dataset and re-plays the lock pick
    // against the stored odds. Mirrors the Bilan page logic but restricted to
    // locks — gives Théo a "comment le modèle a fait sur les locks jusqu'ici"
    // read in one glance.
    let lw = 0, ll = 0, lpl = 0, lstake = 0;
    Object.values(data.days).forEach(arr => (arr || []).forEach(m => {
      if (!m.completed) return;
      if (winamaxOnly && !(m.winamax && m.winamax.available === true)) return;
      const pred = predictMatch(m);
      if (!pred || !pred.pick || pred.skip || !pred.isLock) return;
      const res = evaluateModelPick(m, pred);
      if (res == null) return;
      const odd = pred.odds && (pred.pick.key === '1' ? pred.odds.home : pred.pick.key === '2' ? pred.odds.away : pred.odds.draw);
      if (!odd) return;
      lstake++;
      if (res === 'won') { lw++; lpl += (odd - 1); }
      else if (res === 'lost') { ll++; lpl -= 1; }
    }));
    const lwr = lstake > 0 ? (100 * lw / lstake) : null;
    const lroi = lstake > 0 ? (100 * lpl / lstake) : null;
    const roiCol = lroi == null ? 'var(--text-dim)' : lroi > 0 ? '#34d399' : lroi < 0 ? '#f87171' : 'var(--text-dim)';
    const wrCol = lwr == null ? 'var(--text-dim)' : lwr >= 70 ? '#34d399' : lwr >= 55 ? '#eab308' : '#f87171';

    // === Build card list (reuses renderCard) grouped by day ===
    function groupByDay(list) {
      const buckets = new Map();
      list.forEach(entry => {
        const d = entry.m.date ? new Date(entry.m.date) : null;
        let key;
        try {
          key = d ? d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' }) : 'unknown';
        } catch (e) {
          key = d ? (d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')) : 'unknown';
        }
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(entry);
      });
      return buckets;
    }
    function dayLabel(iso) {
      if (iso === 'unknown') return 'Date inconnue';
      const today = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
      const tomorrow = (() => {
        const d = new Date(); d.setDate(d.getDate() + 1);
        return d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
      })();
      if (iso === today) return '📅 Aujourd\'hui';
      if (iso === tomorrow) return '➡️ Demain';
      try {
        return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'short' });
      } catch (e) { return iso; }
    }

    function sectionHtml(title, hint, entries, sortAsc) {
      if (!entries.length) return '';
      const byDay = groupByDay(entries);
      const dayKeys = [...byDay.keys()].sort((a, b) => sortAsc ? a.localeCompare(b) : b.localeCompare(a));
      const blocks = dayKeys.map(k => {
        const group = byDay.get(k);
        return `
          <div class="league-block">
            <div class="league-header">
              <div class="name">${dayLabel(k)}</div>
              <div class="country"></div>
              <div class="stats"><span class="pill">${group.length} lock${group.length > 1 ? 's' : ''}</span></div>
            </div>
            <div class="match-grid">${group.map(e => renderCard(e.m)).join('')}</div>
          </div>`;
      }).join('');
      return `
        <div class="locks-section" style="margin-top:18px;">
          <div class="section-header top-picks" style="margin-top:6px;">
            <h2><span class="ico">🔒</span>${title}</h2>
            <div class="hint">${hint}</div>
          </div>
          ${blocks}
        </div>`;
    }

    const heroHtml = `
      <div class="bilan-kpis" style="margin-top:4px;">
        <div class="bilan-kpi brand">
          <div class="kpi-label">Paris sûrs à venir</div>
          <div class="kpi-value">${upcoming.length + live.length}</div>
          <div class="kpi-sub">${live.length ? live.length + ' live · ' : ''}${upcoming.length} upcoming</div>
        </div>
        <div class="bilan-kpi">
          <div class="kpi-label">Settled récents</div>
          <div class="kpi-value">${settled.length}</div>
          <div class="kpi-sub">48 dernières heures</div>
        </div>
        <div class="bilan-kpi">
          <div class="kpi-label">WR locks (historique)</div>
          <div class="kpi-value" style="color:${wrCol};">${lwr != null ? lwr.toFixed(1) + '%' : '—'}</div>
          <div class="kpi-sub">${lstake} lock${lstake > 1 ? 's' : ''} réglé${lstake > 1 ? 's' : ''}</div>
        </div>
        <div class="bilan-kpi">
          <div class="kpi-label">Rentabilité (historique)</div>
          <div class="kpi-value" style="color:${roiCol};">${lroi != null ? (lroi >= 0 ? '+' : '') + lroi.toFixed(1) + '%' : '—'}</div>
          <div class="kpi-sub">1€ flat par pick</div>
        </div>
      </div>`;

    const emptyState = (!live.length && !upcoming.length && !settled.length)
      ? `<div class="bilan-empty" style="margin-top:16px;">
           Aucun lock actif. Le modèle est en mode ultra-sélectif (fiab ≥ 70% + ≥ 2 signaux purs).
           Reviens dans quelques heures — les locks apparaissent dès qu'un match coche toutes les cases.
         </div>`
      : '';

    // Chantier Q — barre "nouveaux locks" avec bouton "tout marquer comme vu"
    const activeLockIds = [...live, ...upcoming].map(e => e.m.id).filter(Boolean);
    const newLockIds = activeLockIds.filter(id => isNewLock(id));
    const newLocksBannerHtml = newLockIds.length
      ? `<div style="margin-top:12px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(234,179,8,.08);border:1px solid rgba(234,179,8,.35);border-radius:10px;flex-wrap:wrap;">
           <div style="font-size:13px;color:#eab308;font-weight:600;">
             🆕 ${newLockIds.length} nouveau${newLockIds.length>1?'x':''} lock${newLockIds.length>1?'s':''} depuis ta dernière visite
           </div>
           <button id="mark-locks-seen-btn" style="background:#eab308;color:#0a0e17;border:none;padding:6px 14px;font-weight:700;font-size:12px;border-radius:6px;cursor:pointer;">✓ Tout marquer comme vu</button>
         </div>`
      : '';

    // Chantier HHHH — Locks narratif IA
    const locksNarrativeHtml = (() => {
      try {
        const body = buildLocksNarrative(upcoming, live);
        if (!body) return '';
        return `<div style="margin:14px 0;padding:14px 18px;background:var(--panel);border:1px solid var(--border);border-left:3px solid var(--gold);border-radius:var(--r-lg);">
          <h3 style="margin:0 0 6px;font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:var(--gold);font-weight:700;">Lecture des paris sûrs</h3>
          <div style="font-size:13.5px;line-height:1.55;color:var(--text);">${body}</div>
        </div>`;
      } catch (e) { console.warn('[HHHH] locks narrative failed', e); return ''; }
    })();

    wrap.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:16px 8px 24px;">
        <div style="margin-bottom:28px;padding:32px 0 20px;border-bottom:1px solid var(--border);position:relative;">
          <div style="position:absolute;top:0;left:0;width:40px;height:3px;background:var(--gold);border-radius:0 0 2px 2px;"></div>
          <div style="font-size:11px;color:var(--gold);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:6px;">Sélection haute confiance</div>
          <h1 style="margin:0 0 6px;font-size:40px;font-weight:800;letter-spacing:-1.4px;color:var(--text);line-height:1.1;">Paris sûrs</h1>
          <div style="font-size:15px;color:var(--text-dim);max-width:640px;">Confiance ≥ 70% · Validés par plusieurs indicateurs indépendants · tous sports Winamax confondus.</div>
        </div>
        ${heroHtml}
        ${newLocksBannerHtml}
        ${locksNarrativeHtml}
        ${emptyState}
        ${sectionHtml('🔴 En cours', 'Locks dont le match est déjà lancé', live, true)}
        ${sectionHtml('⏭️ À venir', 'Triés par heure de coup d\'envoi', upcoming, true)}
        ${sectionHtml('✅ Settled récents', 'Locks réglés dans les 48 dernières heures', settled, false)}
      </div>`;

    // Wire up card clicks → openDetail + mark as seen (Chantier Q)
    wrap.querySelectorAll('.match').forEach(card => {
      const activate = () => {
        const id = card.dataset.id;
        if (id) markLockSeen(id);
        const match = lockMatches.find(e => e.m.id === id)?.m;
        if (match) openDetail(match);
      };
      card.addEventListener('click', activate);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    });
    // Chantier Q — bouton "tout marquer comme vu"
    const markAllBtn = wrap.querySelector('#mark-locks-seen-btn');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        markAllLocksSeen(activeLockIds);
        toast(`✓ ${newLockIds.length} lock${newLockIds.length>1?'s':''} marqué${newLockIds.length>1?'s':''} comme vu${newLockIds.length>1?'s':''}`, 'success');
        renderLocksPage(wrap);
      });
    }

  }

  // ======= Page Historique (Chantier M) =======
  // Toutes les picks réglés, groupés par jour, avec filtres (sport, fiabilité,
  // type de pick, bookmaker), graphes (P&L cumulé + WR glissante 7j),
  // répartition par sport, export CSV et pagination.
  //
  // On réutilise predictMatch + evaluateModelPick (même pipeline que Bilan et
  // Locks) pour garantir cohérence des chiffres entre les pages.
  let _histFilters = {
    sport: 'all',       // all | football | basketball | hockey | tennis
    fiab: 'all',        // all | locks (≥70%) | hi (60-70%) | mid (50-60%) | low (<50%)
    pickType: 'all',    // all | 1 | N | 2
    bookmaker: 'winamax', // winamax | all
  };
  let _histDayLimit = 20;

  function renderHistoriquePage(wrap) {
    const data = window.PRONOSTICS_DATA;
    if (!data || !data.days) {
      wrap.innerHTML = '<div style="max-width:1200px;margin:0 auto;padding:16px 8px 24px;"><div class="bilan-empty">Pas de données d\'historique disponibles.</div></div>';
      return;
    }

    // 1. Collecte des picks réglés (dedup par id, bookmaker pré-filtré)
    const seen = new Set();
    const picks = [];
    Object.values(data.days).forEach(arr => (arr || []).forEach(m => {
      if (!m.completed) return;
      if (m.id && seen.has(m.id)) return;
      if (m.id) seen.add(m.id);
      const winaOk = _histFilters.bookmaker === 'all'
        ? true
        : (m.winamax && m.winamax.available === true);
      if (!winaOk) return;
      const pred = predictMatch(m);
      if (!pred || !pred.pick || pred.skip) return;
      const res = evaluateModelPick(m, pred);
      if (res == null) return;
      const odd = pred.odds && (pred.pick.key === '1' ? pred.odds.home : pred.pick.key === '2' ? pred.odds.away : pred.odds.draw);
      if (!odd) return;
      picks.push({ m, pred, res, odd });
    }));

    // 2. Filtres en page (sport / fiab / pickType)
    const passFilter = (p) => {
      if (_histFilters.sport !== 'all' && p.m.sport !== _histFilters.sport) return false;
      const fiab = p.pred.reliability ?? p.pred.pick.prob;
      // FIX audit Histo #7 : exclure les picks avec fiab null/NaN AVANT
      // les filtres bucket — sinon ils passent en "low" et affichent
      // "NaN%" plus loin dans la liste.
      if (fiab == null || !isFinite(fiab)) return false;
      if (_histFilters.fiab === 'locks' && !p.pred.isLock) return false;
      if (_histFilters.fiab === 'hi' && (fiab < 0.60 || fiab >= 0.70)) return false;
      if (_histFilters.fiab === 'mid' && (fiab < 0.50 || fiab >= 0.60)) return false;
      if (_histFilters.fiab === 'low' && fiab >= 0.50) return false;
      if (_histFilters.pickType !== 'all') {
        const pk = p.pred.pick.key;
        const want = _histFilters.pickType === 'N' ? 'X' : _histFilters.pickType;
        if (pk !== want) return false;
      }
      return true;
    };
    const filtered = picks.filter(passFilter);

    // 3. Stats globales
    let totW = 0, totL = 0, totPL = 0;
    filtered.forEach(p => {
      if (p.res === 'won') { totW++; totPL += (p.odd - 1); }
      else if (p.res === 'lost') { totL++; totPL -= 1; }
    });
    const totN = totW + totL;
    const wr = totN ? (100 * totW / totN) : null;
    const roi = totN ? (100 * totPL / totN) : null;

    // 4. Group by day (Europe/Paris)
    // FIX audit Histo #3 : new Date('foo').toLocaleDateString() retourne
    // "Invalid Date" en string (pas une exception → catch jamais
    // déclenché). Ajout d'un guard explicite isNaN sur le timestamp.
    function dayKey(dateStr) {
      if (!dateStr) return '';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
      } catch (e) { return ''; }
    }
    const byDay = new Map();
    filtered.forEach(p => {
      const k = dayKey(p.m.date);
      if (!byDay.has(k)) byDay.set(k, { key: k, picks: [], w: 0, l: 0, pl: 0 });
      const d = byDay.get(k);
      d.picks.push(p);
      if (p.res === 'won') { d.w++; d.pl += (p.odd - 1); }
      else if (p.res === 'lost') { d.l++; d.pl -= 1; }
    });
    const days = [...byDay.values()].sort((a, b) => b.key.localeCompare(a.key));

    let bestDay = null, worstDay = null;
    days.forEach(d => {
      if (bestDay == null || d.pl > bestDay.pl) bestDay = d;
      if (worstDay == null || d.pl < worstDay.pl) worstDay = d;
    });

    // 5. Sport breakdown
    const perSport = {};
    filtered.forEach(p => {
      const s = p.m.sport || 'autre';
      if (!perSport[s]) perSport[s] = { sport: s, n: 0, w: 0, l: 0, pl: 0 };
      const r = perSport[s];
      r.n++;
      if (p.res === 'won') { r.w++; r.pl += (p.odd - 1); }
      else if (p.res === 'lost') { r.l++; r.pl -= 1; }
    });
    const sportRows = Object.values(perSport).sort((a, b) => b.n - a.n);

    // 6. P&L cumulé chart (réutilise renderRoiChart)
    const chartRows = filtered
      .slice()
      .sort((a, b) => new Date(a.m.date) - new Date(b.m.date))
      .map(p => ({
        date: isoDate(p.m.date),
        delta: p.res === 'won' ? (p.odd - 1) : -1,
      }));
    const roiChartHtml = renderRoiChart(chartRows, { title: 'P&L cumulé (1u flat par pick)' })
      || `<div class="bilan-empty">Pas encore assez de picks réglés pour tracer la courbe.</div>`;

    // 7. WR glissante 7j
    const daysChron = [...byDay.values()].sort((a, b) => a.key.localeCompare(b.key));
    function addDaysISOLocal(iso, n) {
      const [y,mo,dd] = iso.split('-').map(Number);
      const dt = new Date(Date.UTC(y, mo-1, dd));
      dt.setUTCDate(dt.getUTCDate() + n);
      return dt.toISOString().slice(0, 10);
    }
    const wrPts = [];
    daysChron.forEach((d, i) => {
      const cut = addDaysISOLocal(d.key, -6);
      let w = 0, n = 0;
      for (let j = i; j >= 0 && daysChron[j].key >= cut; j--) {
        w += daysChron[j].w;
        n += daysChron[j].w + daysChron[j].l;
      }
      wrPts.push({ date: d.key, wr: n ? (100 * w / n) : null, n });
    });
    const wrChartHtml = renderWrChart(wrPts, 7);

    // 8. Filter bar
    const filterChipsHtml = (group, current, options) => options.map(o => `
      <button class="hist-chip ${current === o.v ? 'active' : ''}" data-fgroup="${group}" data-fval="${esc(o.v)}">${esc(o.label)}${o.hint ? `<span style="opacity:.6;margin-left:4px;font-size:10.5px;">${esc(o.hint)}</span>` : ''}</button>
    `).join('');

    const filterBarHtml = `
      <div class="hist-filter-bar">
        <div class="hist-filter-row">
          <div class="hist-filter-label">Sport</div>
          <div class="hist-chips">${filterChipsHtml('sport', _histFilters.sport, [
            { v: 'all', label: 'Tous' },
            { v: 'football', label: '⚽ Foot' },
            { v: 'basketball', label: '🏀 Basket' },
            { v: 'hockey', label: '🏒 Hockey' },
            { v: 'tennis', label: '🎾 Tennis' },
          ])}</div>
        </div>
        <div class="hist-filter-row">
          <div class="hist-filter-label">Confiance</div>
          <div class="hist-chips">${filterChipsHtml('fiab', _histFilters.fiab, [
            { v: 'all', label: 'Toutes' },
            { v: 'locks', label: '🔒 Locks', hint: '≥70%' },
            { v: 'hi', label: 'Hautes', hint: '60-70%' },
            { v: 'mid', label: 'Moyennes', hint: '50-60%' },
            { v: 'low', label: 'Basses', hint: '<50%' },
          ])}</div>
        </div>
        <div class="hist-filter-row">
          <div class="hist-filter-label">Type pick</div>
          <div class="hist-chips">${filterChipsHtml('pickType', _histFilters.pickType, [
            { v: 'all', label: 'Tous' },
            { v: '1', label: '1 · Dom.' },
            { v: 'N', label: 'N · Nul' },
            { v: '2', label: '2 · Ext.' },
          ])}</div>
        </div>
        <div class="hist-filter-row">
          <div class="hist-filter-label">Site de paris</div>
          <div class="hist-chips">${filterChipsHtml('bookmaker', _histFilters.bookmaker, [
            { v: 'winamax', label: 'Winamax seulement' },
            { v: 'all', label: 'Tous' },
          ])}</div>
        </div>
        <div class="hist-filter-row hist-filter-actions">
          <button class="hist-btn-secondary" id="hist-reset">Réinitialiser</button>
          <button class="hist-btn-primary" id="hist-export-csv">⬇ Export CSV (${filtered.length} picks)</button>
        </div>
      </div>
    `;

    // 9. Daily accordion
    const visibleDays = days.slice(0, _histDayLimit);
    const dayBlocksHtml = visibleDays.map(d => {
      const dayN = d.w + d.l;
      const dayWR = dayN ? (100 * d.w / dayN) : null;
      const dayROI = dayN ? (100 * d.pl / dayN) : null;
      const plCol = d.pl > 0 ? '#34d399' : d.pl < 0 ? '#f87171' : 'var(--text-dim)';
      const wrColor = dayWR == null ? 'var(--text-dim)' : dayWR >= 65 ? '#34d399' : dayWR >= 50 ? '#eab308' : '#f87171';
      const dayLabel = (() => {
        try {
          const today = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
          if (d.key === today) return '📅 Aujourd\'hui';
          return new Date(d.key + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) { return d.key; }
      })();
      const rowsHtml = d.picks
        .slice()
        .sort((a, b) => new Date(b.m.date) - new Date(a.m.date))
        .map(p => {
          const sportEm = p.m.sport === 'football' ? '⚽' : p.m.sport === 'basketball' ? '🏀' : p.m.sport === 'hockey' ? '🏒' : p.m.sport === 'tennis' ? '🎾' : '🎯';
          const pickLbl = p.pred.pick.key === 'X'
            ? 'N · Match nul'
            : p.pred.pick.key === '1'
              ? (p.m.competitors?.[0]?.short || p.m.competitors?.[0]?.name || '1')
              : (p.m.competitors?.[1]?.short || p.m.competitors?.[1]?.name || '2');
          const resIco = p.res === 'won'
            ? '<span style="color:#34d399;font-weight:800;">✓</span>'
            : '<span style="color:#f87171;font-weight:800;">✗</span>';
          const delta = p.res === 'won' ? `+${(p.odd - 1).toFixed(2)}u` : '−1u';
          const deltaCol = p.res === 'won' ? '#34d399' : '#f87171';
          const fiab = p.pred.reliability ?? p.pred.pick.prob;
          const fiabPct = Math.round(fiab * 100);
          const matchName = esc(p.m.shortName || p.m.name || '—');
          return `
            <div class="hist-pick-row" data-match-id="${esc(p.m.id || '')}">
              <div class="hist-pick-sport">${sportEm}</div>
              <div class="hist-pick-match">
                <div class="hist-pick-title">${matchName}</div>
                <div class="hist-pick-sub">${esc(p.m.leagueShort || p.m.league || '')}${p.pred.isLock ? ' · 🔒 Lock' : ''}</div>
              </div>
              <div class="hist-pick-cell">${esc(pickLbl)}</div>
              <div class="hist-pick-cell">${p.odd.toFixed(2)}</div>
              <div class="hist-pick-cell" style="color:${fiabPct >= 70 ? '#34d399' : fiabPct >= 55 ? '#eab308' : '#f87171'};font-weight:700;">${fiabPct}%</div>
              <div class="hist-pick-cell" style="text-align:center;">${resIco}</div>
              <div class="hist-pick-cell" style="color:${deltaCol};font-weight:700;text-align:right;">${delta}</div>
            </div>`;
        }).join('');
      return `
        <div class="hist-day-block">
          <div class="hist-day-head">
            <div class="hist-day-date">${dayLabel}</div>
            <div class="hist-day-stats">
              <span class="hist-day-chip">${dayN} pick${dayN > 1 ? 's' : ''}</span>
              <span class="hist-day-chip" style="color:${wrColor};">${d.w}W · ${d.l}L${dayWR != null ? ' · ' + dayWR.toFixed(0) + '%' : ''}</span>
              <span class="hist-day-chip" style="color:${plCol};font-weight:700;">${d.pl >= 0 ? '+' : ''}${d.pl.toFixed(2)}u${dayROI != null ? ' · ROI ' + (dayROI >= 0 ? '+' : '') + dayROI.toFixed(1) + '%' : ''}</span>
            </div>
          </div>
          <div class="hist-day-body">
            <div class="hist-pick-head">
              <div></div>
              <div>Match</div>
              <div>Pick</div>
              <div>Cote</div>
              <div>Fiab</div>
              <div style="text-align:center;">Rés.</div>
              <div style="text-align:right;">Δ</div>
            </div>
            ${rowsHtml}
          </div>
        </div>
      `;
    }).join('');

    const moreBtnHtml = days.length > _histDayLimit
      ? `<div style="text-align:center;margin-top:16px;"><button class="hist-btn-secondary" id="hist-more">Voir ${Math.min(20, days.length - _histDayLimit)} jours de plus · ${_histDayLimit}/${days.length} affichés</button></div>`
      : '';
    const lessBtnHtml = (_histDayLimit > 20 && days.length)
      ? `<div style="text-align:center;margin-top:8px;"><button class="hist-btn-secondary" id="hist-less">Réduire</button></div>`
      : '';

    // 10. Sport breakdown bars
    const maxN = Math.max(1, ...sportRows.map(r => r.n));
    const sportChartHtml = sportRows.length ? `
      <div class="hist-sport-card">
        <div class="hist-card-title">Répartition par sport</div>
        ${sportRows.map(r => {
          const rWR = r.n ? (100 * r.w / r.n) : 0;
          const rROI = r.n ? (100 * r.pl / r.n) : 0;
          const barPct = Math.round(100 * r.n / maxN);
          const plCol = r.pl > 0 ? '#34d399' : r.pl < 0 ? '#f87171' : '#94a3b8';
          const em = r.sport === 'football' ? '⚽' : r.sport === 'basketball' ? '🏀' : r.sport === 'hockey' ? '🏒' : r.sport === 'tennis' ? '🎾' : '🎯';
          return `
            <div class="hist-sport-row">
              <div class="hist-sport-label">${em} ${esc(r.sport)}</div>
              <div class="hist-sport-bar"><div class="hist-sport-bar-fill" style="width:${barPct}%;background:${plCol};"></div></div>
              <div class="hist-sport-stat">${r.n}</div>
              <div class="hist-sport-stat">${rWR.toFixed(0)}%</div>
              <div class="hist-sport-stat" style="color:${plCol};font-weight:700;">${rROI >= 0 ? '+' : ''}${rROI.toFixed(1)}%</div>
            </div>
          `;
        }).join('')}
      </div>
    ` : '';

    // 11. Hero KPIs
    const roiCol = roi == null ? 'var(--text-dim)' : roi > 0 ? '#34d399' : roi < 0 ? '#f87171' : 'var(--text-dim)';
    const wrCol = wr == null ? 'var(--text-dim)' : wr >= 65 ? '#34d399' : wr >= 50 ? '#eab308' : '#f87171';
    // Fix : ne pas préfixer "+" si le best day est en fait négatif (cas filtre sport avec que des pertes).
    const bestTxt = bestDay ? `${bestDay.key.slice(5)} · ${bestDay.pl >= 0 ? '+' : ''}${bestDay.pl.toFixed(2)}u` : '—';
    const worstTxt = worstDay ? `${worstDay.key.slice(5)} · ${worstDay.pl >= 0 ? '+' : ''}${worstDay.pl.toFixed(2)}u` : '—';
    const heroHtml = `
      <div class="bilan-kpis" style="margin-top:4px;">
        <div class="bilan-kpi brand">
          <div class="kpi-label">Picks réglés</div>
          <div class="kpi-value">${totN}</div>
          <div class="kpi-sub">sur ${days.length} jour${days.length > 1 ? 's' : ''}</div>
        </div>
        <div class="bilan-kpi">
          <div class="kpi-label">Taux de réussite</div>
          <div class="kpi-value" style="color:${wrCol};">${wr != null ? wr.toFixed(1) + '%' : '—'}</div>
          <div class="kpi-sub">${totW}W · ${totL}L</div>
        </div>
        <div class="bilan-kpi">
          <div class="kpi-label">Rentabilité moyenne</div>
          <div class="kpi-value" style="color:${roiCol};">${roi != null ? (roi >= 0 ? '+' : '') + roi.toFixed(1) + '%' : '—'}</div>
          <div class="kpi-sub">${totPL >= 0 ? '+' : ''}${totPL.toFixed(2)}u cumulés</div>
        </div>
        <div class="bilan-kpi">
          <div class="kpi-label">Meilleur / pire jour</div>
          <div class="kpi-value" style="font-size:14px;line-height:1.35;">
            <div style="color:#34d399;">${bestTxt}</div>
            <div style="color:#f87171;">${worstTxt}</div>
          </div>
          <div class="kpi-sub">en unités flat</div>
        </div>
      </div>`;

    const emptyStateHtml = filtered.length === 0
      ? `<div class="bilan-empty" style="margin-top:18px;">Aucun pick ne correspond aux filtres actuels. Essaye "Réinitialiser" pour tout afficher.</div>`
      : '';

    // v30 — Coach IA patterns détectés retiré : il agrégeait les paris
    // trackés par l'utilisateur. Le bloc complet (IIFE FFFF) était dead
    // code après le précédent ass="const patternsHtml = ''", on le supprime.
    const patternsHtml = '';

    wrap.innerHTML = `
      <div style="max-width:1280px;margin:0 auto;padding:4px 0 0;font-variant-numeric:tabular-nums;">
        <div style="margin-bottom:24px;padding:32px 0 20px;border-bottom:1px solid var(--border);position:relative;">
          <div style="position:absolute;top:0;left:0;width:40px;height:3px;background:var(--info);border-radius:0 0 2px 2px;"></div>
          <div style="font-size:11px;color:var(--info);text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:6px;">Archives du modèle</div>
          <h1 style="margin:0 0 6px;font-size:40px;font-weight:800;letter-spacing:-1.4px;color:var(--text);line-height:1;">Historique</h1>
          <div style="font-size:14px;color:var(--text-dim);max-width:700px;">Tous les pronostics réglés, groupés par jour. Filtre par sport, confiance, type ou site de paris, puis exporte en CSV.</div>
        </div>
        ${heroHtml}
        ${patternsHtml}
        ${filterBarHtml}
        ${emptyStateHtml}
        ${filtered.length ? `
          <div class="hist-twocol">
            <div class="hist-chart-card">
              <div class="hist-card-title">P&L cumulé (1€ flat par pick)</div>
              ${roiChartHtml}
            </div>
            <div class="hist-chart-card">
              <div class="hist-card-title">Taux de réussite glissant (fenêtre 7 jours)</div>
              ${wrChartHtml}
            </div>
          </div>
          ${sportChartHtml}
          <div class="hist-day-list">
            ${dayBlocksHtml}
          </div>
          ${moreBtnHtml}
          ${lessBtnHtml}
        ` : ''}
      </div>`;

    // 12. Wire interactions
    wrap.querySelectorAll('.hist-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const g = btn.dataset.fgroup, v = btn.dataset.fval;
        if (_histFilters[g] === v) return;
        _histFilters[g] = v;
        _histDayLimit = 20;
        renderHistoriquePage(wrap);
      });
    });
    const resetBtn = wrap.querySelector('#hist-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      _histFilters = { sport: 'all', fiab: 'all', pickType: 'all', bookmaker: 'winamax' };
      _histDayLimit = 20;
      renderHistoriquePage(wrap);
    });
    const moreBtn = wrap.querySelector('#hist-more');
    if (moreBtn) moreBtn.addEventListener('click', () => {
      _histDayLimit += 20;
      renderHistoriquePage(wrap);
    });
    const lessBtn = wrap.querySelector('#hist-less');
    if (lessBtn) lessBtn.addEventListener('click', () => {
      _histDayLimit = 20;
      renderHistoriquePage(wrap);
    });
    const exportBtn = wrap.querySelector('#hist-export-csv');
    if (exportBtn) exportBtn.addEventListener('click', () => {
      exportHistoriqueCsv(filtered);
    });
    // Click on a pick row → open match detail modal (reuse existing infra)
    wrap.querySelectorAll('.hist-pick-row').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.matchId;
        if (!id) return;
        const match = filtered.find(p => String(p.m.id) === String(id))?.m;
        // FIX audit Histo #8 : guard typeof openDetail pour éviter
        // ReferenceError silencieuse si la fonction n'est pas accessible
        // dans certains contextes (re-render après navigation rapide).
        if (match && typeof openDetail === 'function') openDetail(match);
        else if (match && typeof window.openDetail === 'function') window.openDetail(match);
      });
    });
  }

  // Line chart for 7-day rolling win-rate. Distinct from renderRoiChart (which
  // plots cumulative signed P&L) because a WR curve is bounded 0-100 and
  // references the 50% baseline, not zero.
  function renderWrChart(pts, windowDays) {
    const valid = pts.filter(p => p.wr != null);
    if (valid.length < 2) return '<div class="bilan-empty">Pas encore assez de jours pour tracer la courbe glissante.</div>';
    const width = 560, height = 160;
    const marginL = 40, marginR = 12, marginT = 20, marginB = 28;
    const plotW = width - marginL - marginR;
    const plotH = height - marginT - marginB;
    const xAt = i => marginL + (valid.length === 1 ? plotW / 2 : (i / (valid.length - 1)) * plotW);
    const yAt = v => marginT + plotH - (v / 100) * plotH;
    const poly = valid.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.wr).toFixed(1)}`).join(' ');
    const last = valid[valid.length - 1].wr;
    const stroke = last >= 65 ? '#34d399' : last >= 50 ? '#eab308' : '#f87171';
    const fill = last >= 65 ? 'rgba(52,211,153,.18)' : last >= 50 ? 'rgba(234,179,8,.18)' : 'rgba(248,113,113,.18)';
    const areaPath = `M ${xAt(0).toFixed(1)} ${yAt(0).toFixed(1)} L ${poly.split(' ').join(' L ')} L ${xAt(valid.length-1).toFixed(1)} ${yAt(0).toFixed(1)} Z`;
    const xTicks = valid.length <= 5
      ? valid.map((p, i) => ({ x: xAt(i), label: p.date.slice(5) }))
      : [0, Math.floor(valid.length/2), valid.length-1].map(i => ({ x: xAt(i), label: valid[i].date.slice(5) }));
    const yTicks = [0, 50, 100];
    return `
      <div style="background:var(--surface,#111827);border:1px solid var(--border,#2a3744);border-radius:12px;padding:14px;">
        <div style="font-size:13px;color:var(--text-dim,#b4bcc7);margin-bottom:8px;font-weight:600;">Glissement ${windowDays}j · actuel <span style="color:${stroke};font-weight:700;">${last.toFixed(1)}%</span></div>
        <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;display:block;" xmlns="http://www.w3.org/2000/svg">
          <line x1="${marginL}" y1="${yAt(50).toFixed(1)}" x2="${width - marginR}" y2="${yAt(50).toFixed(1)}" stroke="rgba(255,255,255,.15)" stroke-dasharray="3 3"/>
          ${yTicks.map(v => `<text x="${marginL - 6}" y="${(yAt(v)+4).toFixed(1)}" text-anchor="end" fill="var(--text-dim2,#7b8693)" font-size="10" font-family="sans-serif">${v}%</text>`).join('')}
          <path d="${areaPath}" fill="${fill}" stroke="none"/>
          <polyline points="${poly}" fill="none" stroke="${stroke}" stroke-width="2"/>
          ${valid.map((p, i) => `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(p.wr).toFixed(1)}" r="2.5" fill="${stroke}"><title>${p.date}: ${p.wr.toFixed(1)}% (${p.n} picks)</title></circle>`).join('')}
          ${xTicks.map(t => `<text x="${t.x.toFixed(1)}" y="${(height - 6).toFixed(1)}" text-anchor="middle" fill="var(--text-dim2,#7b8693)" font-size="10" font-family="sans-serif">${t.label}</text>`).join('')}
        </svg>
      </div>`;
  }

  // CSV export with UTF-8 BOM so Excel/Numbers don't mangle accents.
  function exportHistoriqueCsv(rows) {
    if (!rows || !rows.length) return;
    const header = ['date', 'sport', 'league', 'match', 'pick', 'cote', 'fiabilite_pct', 'resultat', 'delta_u'];
    const csvRows = [header.join(',')];
    const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
    rows.slice()
      .sort((a, b) => new Date(a.m.date) - new Date(b.m.date))
      .forEach(p => {
        const fiab = Math.round((p.pred.reliability ?? p.pred.pick.prob) * 100);
        const pickLbl = p.pred.pick.key === 'X' ? 'N' : p.pred.pick.key;
        const delta = p.res === 'won' ? (p.odd - 1).toFixed(2) : '-1.00';
        csvRows.push([
          q(isoDate(p.m.date)),
          q(p.m.sport || ''),
          q(p.m.league || p.m.leagueShort || ''),
          q(p.m.shortName || p.m.name || ''),
          q(pickLbl),
          q(p.odd.toFixed(2)),
          q(fiab),
          q(p.res === 'won' ? 'gagne' : 'perdu'),
          q(delta),
        ].join(','));
      });
    const csv = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historique-pronostics-' + isoDate(new Date()) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ====== v30 — CLV (Closing Line Value) helpers ======
  // CLV = (taken_odd - closing_odd) / closing_odd
  //   • Positif : on a pris une cote MEILLEURE que le closing → +CLV
  //     = on a battu le marché. C'est *le* signal long-term que le
  //     modèle est rentable (avant même que les résultats arrivent).
  //   • Le closing line est la cote la plus efficiente du marché
  //     (juste avant kickoff, après tous les ajustements bookmakers).
  //
  // closing_odds est capturé par scripts/snapshot_odds.py dans la
  // fenêtre [-10min, +30min] autour du kickoff. Présent uniquement
  // sur les events où ESPN avait encore l'array odds peu avant le
  // début du match.
  //
  // Retourne :
  //   { value: 0.023, takenOdd, closingOdd, pct: '+2.3pt' }
  //   ou null si pas de closing_odds dispo.
  function _computeCLV(bet, match) {
    if (!bet || !match) return null;
    const closing = match.closing_odds;
    if (!closing) return null;
    const takenOdd = Number(bet.odds);
    if (!isFinite(takenOdd) || takenOdd <= 1) return null;
    // Find closing odd matching the bet's pick
    const pickKey = bet.pick_key || bet.pickKey;
    let closingOdd = null;
    if (pickKey === '1') closingOdd = Number(closing.home);
    else if (pickKey === '2') closingOdd = Number(closing.away);
    else if (pickKey === 'X' || pickKey === 'N') closingOdd = Number(closing.draw);
    else {
      // Fallback : try to guess from pick_label (e.g. "1 PSG")
      const lbl = String(bet.pick_label || bet.pickLabel || '').trim();
      if (lbl.startsWith('1')) closingOdd = Number(closing.home);
      else if (lbl.startsWith('2')) closingOdd = Number(closing.away);
      else if (lbl.startsWith('N') || lbl.startsWith('X')) closingOdd = Number(closing.draw);
    }
    if (!isFinite(closingOdd) || closingOdd <= 1) return null;
    const value = (takenOdd - closingOdd) / closingOdd;
    return {
      value,
      takenOdd,
      closingOdd,
      pct: (value >= 0 ? '+' : '') + (value * 100).toFixed(1) + 'pt',
    };
  }
  // Find a match by id across all days. Returns null if not found.
  function _findMatchById(matchId) {
    if (!matchId) return null;
    const data = window.PRONOSTICS_DATA;
    if (!data || !data.days) return null;
    const idStr = String(matchId);
    let found = null;
    Object.values(data.days).forEach(arr => {
      (arr || []).forEach(m => { if (String(m.id) === idStr) found = m; });
    });
    return found;
  }
  try {
    window._computeCLV = _computeCLV;
    window._findMatchById = _findMatchById;
  } catch(e){}

  // Chantier UU — Mes paris trackés
  // localStorage key: paris_sportif_tracked_bets
  // Shape: { [uniqueId]: { id, sport, league, home, away, kickoff, pick_label, odds, stake, added_at, status } }
  // status: 'en cours' | 'gagné' | 'perdu' | 'annulé'
  function loadTrackedBets() {
    try {
      const raw = localStorage.getItem('paris_sportif_tracked_bets');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveTrackedBets(bets) {
    try {
      localStorage.setItem('paris_sportif_tracked_bets', JSON.stringify(bets));
    } catch (e) {}
  }
  function addTrackedBet(bet) {
    const bets = loadTrackedBets();
    const id = 'bet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    bets[id] = { ...bet, added_at: new Date().toISOString(), status: 'en cours' };
    saveTrackedBets(bets);
    return id;
  }
  function updateTrackedBet(id, updates) {
    const bets = loadTrackedBets();
    if (bets[id]) {
      bets[id] = { ...bets[id], ...updates };
      saveTrackedBets(bets);
    }
  }
  function removeTrackedBet(id) {
    const bets = loadTrackedBets();
    delete bets[id];
    saveTrackedBets(bets);
  }

  // ======= Chantier BBBB — Error logger + Coach IA admin / santé =======
  // Capture toutes les erreurs JS runtime (ring buffer 100 entrées) dans
  // localStorage pour que la page Santé puisse les afficher — utile quand
  // Théo voit "un truc qui marche pas" : il va sur ⚙️ Santé et voit l'erreur.
  const JS_ERRORS_KEY = 'paris_sportif_js_errors_v1';
  const JS_ERRORS_MAX = 100;
  function loadJsErrors() {
    try {
      const raw = JSON.parse(localStorage.getItem(JS_ERRORS_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }
  function saveJsErrors(arr) {
    try { localStorage.setItem(JS_ERRORS_KEY, JSON.stringify(arr.slice(-JS_ERRORS_MAX))); } catch (e) {}
  }
  function logJsError(type, msg, stack) {
    try {
      const arr = loadJsErrors();
      arr.push({
        t: Date.now(),
        type: String(type || 'error'),
        msg: String(msg || '').slice(0, 400),
        stack: String(stack || '').slice(0, 1200),
        page: (typeof currentPage !== 'undefined' && currentPage) || 'unknown',
      });
      saveJsErrors(arr);
    } catch (e) { /* swallow */ }
  }
  // Hook global — safe quand l'addEventListener est dispo (tous navigateurs récents).
  try {
    window.addEventListener('error', (ev) => {
      logJsError('error', ev.message || (ev.error && ev.error.message) || 'unknown',
        (ev.error && ev.error.stack) || `${ev.filename || ''}:${ev.lineno || ''}`);
    });
    window.addEventListener('unhandledrejection', (ev) => {
      const r = ev.reason;
      logJsError('promise', (r && (r.message || r.toString())) || 'unhandled rejection',
        (r && r.stack) || '');
    });
  } catch (e) { /* pas critique */ }

  // Estime la taille totale du localStorage (en bytes) — approximation via longueur
  // des clés + valeurs. Sous-estime un peu car le navigateur ajoute du métadonnée,
  // mais suffisant pour alerter à l'approche de la limite 5 MB.
  function estimateLocalStorageBytes() {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const v = localStorage.getItem(k) || '';
        total += (k.length + v.length) * 2; // UTF-16 ≈ 2 bytes / char
      }
      return total;
    } catch (e) { return -1; }
  }

  // Collecte tous les signaux de santé sous forme d'objet avec
  // { key, label, status: 'ok'|'warn'|'crit'|'info', value, detail, action? }
  // Le status drive le rendu (vert/orange/rouge) et l'agrégation globale.
  function computeSiteHealth() {
    const checks = [];
    const data = window.PRONOSTICS_DATA;
    const now = Date.now();

    // 1. Fraîcheur data.js
    const ga = data && data.generated_at;
    if (!ga) {
      checks.push({ key: 'freshness', label: '📡 Fraîcheur data', status: 'crit',
        value: 'Sans horodatage', detail: 'data.js ne contient pas de champ generated_at.' });
    } else {
      const gen = new Date(ga);
      const ageMin = Math.floor((now - gen.getTime()) / 60000);
      const when = gen.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
      let status = 'ok', detail = `Générée le ${when}.`;
      if (ageMin > 60) { status = 'crit'; detail = `Générée le ${when} — il y a ${ageMin >= 120 ? Math.floor(ageMin/60)+'h' : ageMin+' min'}. Cron probablement cassé.`; }
      else if (ageMin > 25) { status = 'warn'; detail = `Il y a ${ageMin} min — attend le prochain cycle cron (5 min).`; }
      else if (ageMin > 12) { status = 'warn'; detail = `Il y a ${ageMin} min.`; }
      else detail = `Il y a ${ageMin} min.`;
      checks.push({ key: 'freshness', label: '📡 Fraîcheur data', status,
        value: ageMin < 0 ? 'à jour' : ageMin + ' min',
        detail,
        action: status !== 'ok' ? {
          label: '🔁 Forcer refresh',
          run: () => { if (typeof pollData === 'function') { pollData(); toast('Refresh manuel lancé', 'success'); } }
        } : null,
      });
    }

    // 2. Couverture par sport (aujourd'hui, Winamax)
    const today = data && data.today;
    const todayList = (today && data.days && data.days[today]) || [];
    const SPORTS = ['football','tennis','basketball','hockey','american-football','mma','golf','racing'];
    const todayWin = todayList.filter(m => m && m.winamax && m.winamax.available === true);
    const remaining = todayWin.filter(m => !(m.completed || m.status === 'STATUS_FINAL' || m.status === 'STATUS_FULL_TIME'));
    const perSportRemaining = {};
    SPORTS.forEach(s => perSportRemaining[s] = 0);
    remaining.forEach(m => { if (perSportRemaining[m.sport] != null) perSportRemaining[m.sport]++; });
    const sportsWithZero = SPORTS.filter(s => perSportRemaining[s] === 0);
    const totalRemaining = remaining.length;
    let covStatus = 'ok', covDetail = '';
    if (totalRemaining === 0) { covStatus = 'crit'; covDetail = `Aucun match Winamax restant aujourd'hui — pipeline down ou jour creux.`; }
    else if (totalRemaining < 5) { covStatus = 'warn'; covDetail = `Seulement ${totalRemaining} match${totalRemaining>1?'s':''} Winamax restant${totalRemaining>1?'s':''} aujourd'hui.`; }
    else covDetail = `${totalRemaining} matchs Winamax restants aujourd'hui, répartis sur ${SPORTS.length - sportsWithZero.length}/${SPORTS.length} sports.`;
    checks.push({ key: 'coverage', label: '🎯 Couverture sport (restants)', status: covStatus,
      value: `${totalRemaining} matchs`, detail: covDetail, extras: { perSportRemaining } });

    // 3. Ratio Winamax sur data brute aujourd'hui
    const totalToday = todayList.length;
    const winPct = totalToday ? (100 * todayWin.length / totalToday) : 0;
    let wpStatus = 'ok';
    if (totalToday === 0) wpStatus = 'warn';
    else if (winPct < 40) wpStatus = 'crit';
    else if (winPct < 70) wpStatus = 'warn';
    checks.push({ key: 'winamax-ratio', label: '🏦 Ratio Winamax', status: wpStatus,
      value: totalToday ? `${winPct.toFixed(0)}%` : 'n/a',
      detail: totalToday ? `${todayWin.length}/${totalToday} matchs d'aujourd'hui sont sur Winamax.` : `Aucun match pour aujourd'hui dans data.js.` });

    // 4. Couverture cotes (matchs upcoming avec odds exploitables)
    const upcomingAll = todayWin.filter(m => !(m.completed || m.status === 'STATUS_FINAL' || m.status === 'STATUS_FULL_TIME'));
    const withOdds = upcomingAll.filter(m => {
      // predictMatch pose pred.odds quand disponible. On teste odds brut ou via predictMatch.
      if (Array.isArray(m.odds) && m.odds.length > 0) return true;
      try {
        const p = (typeof predictMatch === 'function') ? predictMatch(m) : null;
        return !!(p && p.odds && (p.odds.home || p.odds.away));
      } catch (e) { return false; }
    });
    const oddsPct = upcomingAll.length ? (100 * withOdds.length / upcomingAll.length) : 100;
    let oStatus = 'ok';
    if (upcomingAll.length === 0) oStatus = 'info';
    else if (oddsPct < 50) oStatus = 'crit';
    else if (oddsPct < 80) oStatus = 'warn';
    checks.push({ key: 'odds-coverage', label: '💰 Couverture cotes', status: oStatus,
      value: upcomingAll.length ? `${oddsPct.toFixed(0)}%` : 'n/a',
      detail: upcomingAll.length ? `${withOdds.length}/${upcomingAll.length} matchs Winamax restants ont des cotes.` : `Aucun match restant.` });

    // 5. Locks actifs (informational)
    let lockCount = 0, lockWithOdds = 0;
    try {
      upcomingAll.forEach(m => {
        const p = (typeof predictMatch === 'function') ? predictMatch(m) : null;
        if (p && p.pick && !p.skip && p.isLock) {
          lockCount++;
          const pickKey = p.pick.key;
          const pickOdd = p.odds && (pickKey === '1' ? p.odds.home : pickKey === '2' ? p.odds.away : p.odds.draw);
          if (pickOdd) lockWithOdds++;
        }
      });
    } catch (e) {}
    checks.push({ key: 'locks-active', label: '🔒 Locks actifs', status: 'info',
      value: `${lockCount}`,
      detail: `${lockCount} lock${lockCount>1?'s':''} upcoming Winamax${lockCount?` (${lockWithOdds} avec cote utilisable)`:' aujourd\'hui'}.` });

    // 6. Service Worker (async — on fait best-effort sync : navigator.serviceWorker.controller)
    let swStatus = 'warn', swValue = '…', swDetail = 'Vérification en cours…';
    try {
      if (!('serviceWorker' in navigator)) {
        swStatus = 'warn'; swValue = 'non-supporté'; swDetail = 'Le navigateur ne supporte pas les Service Workers.';
      } else if (navigator.serviceWorker.controller) {
        swStatus = 'ok'; swValue = 'actif'; swDetail = 'Service Worker contrôle la page. Mode offline + refresh réseau OK.';
      } else {
        swStatus = 'warn'; swValue = 'pas encore actif';
        swDetail = 'SW enregistré mais ne contrôle pas encore la page (premier chargement ou mise à jour en attente).';
      }
    } catch (e) { swStatus = 'warn'; swValue = 'erreur'; swDetail = String(e && e.message || e); }
    checks.push({ key: 'service-worker', label: '🧊 Service Worker', status: swStatus,
      value: swValue, detail: swDetail,
      action: swStatus !== 'ok' ? {
        label: '🔄 Re-register SW',
        run: async () => {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
            toast('SW désinscrit — reload la page', 'success');
            // FIX audit Santé #4 : guard typeof pour éviter de laisser
            // l'utilisateur en état dégradé si _hardReload n'est pas
            // accessible. Fallback sur location.reload() standard.
            setTimeout(() => {
              if (typeof _hardReload === 'function') _hardReload();
              else location.reload();
            }, 800);
          } catch (e) { toast('Echec: ' + (e.message || e), 'error'); }
        }
      } : null });

    // 7. LocalStorage — espace occupé / quota approx 5 MB
    const lsBytes = estimateLocalStorageBytes();
    const lsMb = lsBytes / (1024 * 1024);
    let lsStatus = 'ok';
    if (lsBytes < 0) lsStatus = 'warn';
    else if (lsMb > 4.0) lsStatus = 'crit';
    else if (lsMb > 2.5) lsStatus = 'warn';
    checks.push({ key: 'localstorage', label: '💾 LocalStorage', status: lsStatus,
      value: lsBytes < 0 ? 'inconnu' : `${lsMb.toFixed(2)} MB`,
      detail: lsBytes < 0 ? 'Impossible d\'évaluer.' : `${lsMb.toFixed(2)} MB utilisés sur ~5 MB max (dépend du navigateur).`,
      action: lsStatus !== 'ok' ? {
        label: '🧹 Nettoyer caches non-critiques',
        run: async () => {
          const ok = (typeof window._showConfirm === 'function')
            ? await window._showConfirm({
                title: '🧹 Vider les caches non-critiques ?',
                body: 'Supprime <b>historique fiabilité</b> + <b>seen-locks</b>.<br><br><span style="color:var(--text-dim);font-size:12px;">Ne touche pas à tes paris trackés ni préférences.</span>',
                confirmLabel: 'Vider',
                cancelLabel: 'Annuler',
              })
            : confirm('Vider les caches non-critiques (historique fiabilité, seen-locks) ? Ça ne touche pas à tes paris trackés ni préférences.');
          if (!ok) return;
          try {
            localStorage.removeItem('reliability_history_v1');
            localStorage.removeItem('seenLocks');
            localStorage.removeItem(JS_ERRORS_KEY);
            toast('Caches nettoyés', 'success');
            // Re-render la page Santé
            if (currentPage === 'sante') applyPageView();
          } catch (e) { toast('Echec: ' + (e.message || e), 'error'); }
        }
      } : null });

    // 8. Erreurs JS (24h)
    const errs = loadJsErrors();
    const cut24 = now - 24 * 3600 * 1000;
    const recent = errs.filter(e => e && e.t >= cut24);
    let errStatus = 'ok';
    if (recent.length > 10) errStatus = 'crit';
    else if (recent.length > 0) errStatus = 'warn';
    checks.push({ key: 'js-errors', label: '🐞 Erreurs JS (24h)', status: errStatus,
      value: `${recent.length}`,
      detail: recent.length ? `${recent.length} erreur${recent.length>1?'s':''} captée${recent.length>1?'s':''} dans les dernières 24 h.` : `Zéro crash client détecté sur 24 h.`,
      extras: { recent },
      action: recent.length ? {
        label: '🗑 Clear errors log',
        run: () => {
          saveJsErrors([]);
          toast('Journal d\'erreurs vidé', 'success');
          if (currentPage === 'sante') applyPageView();
        }
      } : null });

    // 9. Mise à jour sonde plugin/GitHub Actions cron — lien direct (pas de vérif HTTP possible)
    checks.push({ key: 'cron-link', label: '⚙️ GitHub Actions (cron)', status: 'info',
      value: 'lien direct',
      detail: 'Clique pour ouvrir la page Actions et vérifier que le workflow refresh-data tourne.',
      extraHtml: `<a href="https://github.com/Harotensnor/paris-sportif/actions" target="_blank" rel="noopener" style="color:#a78bfa;font-weight:600;text-decoration:underline;">→ github.com/Harotensnor/paris-sportif/actions</a>` });

    return { checks, meta: { totalToday, todayWinCount: todayWin.length, totalRemaining,
      perSportRemaining, lockCount, lsMb, recentErrorCount: recent.length } };
  }

  function renderSantePage(wrap) {
    const health = computeSiteHealth();
    const { checks, meta } = health;
    const okCount = checks.filter(c => c.status === 'ok').length;
    const warnCount = checks.filter(c => c.status === 'warn').length;
    const critCount = checks.filter(c => c.status === 'crit').length;
    const total = checks.filter(c => c.status !== 'info').length;
    const score = total ? (100 * okCount / total) : 0;
    const globalEmoji = critCount > 0 ? '🔴' : warnCount > 0 ? '🟠' : '🟢';
    const globalLabel = critCount > 0 ? 'Problème critique' : warnCount > 0 ? 'Alertes mineures' : 'Tout est vert';
    const globalColor = critCount > 0 ? '#f87171' : warnCount > 0 ? '#eab308' : '#34d399';

    // Badge compteur d'alertes dans la nav
    const navBadge = document.getElementById('count-sante-alerts');
    if (navBadge) {
      const n = warnCount + critCount;
      navBadge.textContent = n;
      navBadge.style.display = n ? '' : 'none';
      navBadge.style.background = critCount > 0 ? 'rgba(248,113,113,.25)' : 'rgba(234,179,8,.25)';
      navBadge.style.color = critCount > 0 ? '#f87171' : '#eab308';
    }

    const statusPill = (s) => {
      if (s === 'ok') return '<span style="background:rgba(52,211,153,.18);color:#34d399;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:.4px;">OK</span>';
      if (s === 'warn') return '<span style="background:rgba(234,179,8,.18);color:#eab308;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:.4px;">WARN</span>';
      if (s === 'crit') return '<span style="background:rgba(248,113,113,.18);color:#f87171;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:.4px;">CRIT</span>';
      return '<span style="background:rgba(255,255,255,.06);color:var(--text-dim);padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;letter-spacing:.4px;">INFO</span>';
    };
    const sideColor = (s) => s === 'ok' ? '#34d399' : s === 'warn' ? '#eab308' : s === 'crit' ? '#f87171' : '#a78bfa';

    const checkRow = (c, idx) => {
      const actionBtn = c.action ? `<button class="sante-action-btn" data-action-idx="${idx}" style="background:rgba(167,139,250,.15);color:#a78bfa;border:1px solid rgba(167,139,250,.3);border-radius:6px;padding:5px 10px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;">${esc(c.action.label)}</button>` : '';
      const extraHtml = c.extraHtml || '';
      return `
        <div class="sante-row" style="display:grid;grid-template-columns:44px 1fr auto;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border);align-items:center;">
          <div style="width:6px;height:100%;min-height:32px;background:${sideColor(c.status)};border-radius:3px;"></div>
          <div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <div style="font-weight:700;color:var(--text);font-size:14px;">${esc(c.label)}</div>
              ${statusPill(c.status)}
              <div style="color:var(--text-dim);font-size:12px;font-variant-numeric:tabular-nums;">${esc(String(c.value))}</div>
            </div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:4px;line-height:1.5;">${c.detail ? esc(c.detail) : ''}${extraHtml ? ' · ' + extraHtml : ''}</div>
          </div>
          <div>${actionBtn}</div>
        </div>`;
    };

    // Recommandations synthèse
    const recos = [];
    checks.forEach(c => {
      if (c.status === 'crit') recos.push({ sev: 'crit', text: `<b>${esc(c.label)}</b> — ${esc(c.detail)}${c.action ? ` <i>(clique « ${esc(c.action.label)} » à droite)</i>` : ''}` });
      else if (c.status === 'warn') recos.push({ sev: 'warn', text: `<b>${esc(c.label)}</b> — ${esc(c.detail)}` });
    });
    const recoHtml = recos.length
      ? recos.map(r => `
          <div style="padding:10px 14px;border-radius:8px;margin-bottom:8px;font-size:13px;line-height:1.5;background:${r.sev==='crit' ? 'rgba(248,113,113,.08)' : 'rgba(234,179,8,.08)'};border-left:3px solid ${r.sev==='crit' ? '#f87171' : '#eab308'};color:var(--text);">
            ${r.sev==='crit' ? '🔴' : '🟠'} ${r.text}
          </div>
        `).join('')
      : '<div style="padding:10px 14px;background:rgba(52,211,153,.08);border-left:3px solid #34d399;border-radius:8px;color:var(--text);font-size:13px;">🟢 Aucune action requise — site en bonne santé.</div>';

    // Matrice sports compacte
    const sportMatrix = (() => {
      const emo = { football:'⚽', tennis:'🎾', basketball:'🏀', hockey:'🏒', 'american-football':'🏈', mma:'🥊', golf:'⛳', racing:'🏎️' };
      const SPORTS = Object.keys(emo);
      return `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:8px;">
          ${SPORTS.map(s => {
            const n = (meta.perSportRemaining && meta.perSportRemaining[s]) || 0;
            const c = n === 0 ? '#f87171' : n < 3 ? '#eab308' : '#34d399';
            return `<div style="background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:8px;padding:8px 6px;text-align:center;">
                     <div style="font-size:18px;">${emo[s]}</div>
                     <div style="font-size:11px;color:var(--text-dim);margin-top:2px;">${s}</div>
                     <div style="font-size:16px;font-weight:700;color:${c};margin-top:2px;font-variant-numeric:tabular-nums;">${n}</div>
                   </div>`;
          }).join('')}
        </div>`;
    })();

    // Erreurs récentes (si présentes, détails)
    const errCheck = checks.find(c => c.key === 'js-errors');
    const errList = errCheck && errCheck.extras && errCheck.extras.recent ? errCheck.extras.recent : [];
    const errListHtml = errList.length ? `
      <div style="margin-top:18px;">
        <div style="font-size:12px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.4px;font-weight:600;margin-bottom:8px;">🐞 Dernières erreurs JS</div>
        <div style="background:rgba(248,113,113,.04);border:1px solid rgba(248,113,113,.2);border-radius:8px;overflow:hidden;">
          ${errList.slice(-10).reverse().map(e => {
            // FIX audit Santé #7 : guard new Date(e.t) qui peut produire
            // Invalid Date si e.t est corrompu, et e.page/e.type/e.msg
            // peuvent être undefined si l'entrée du ring buffer est
            // malformée → "Invalid Date · page=undefined" affiché sinon.
            const _t = e && e.t;
            const _d = _t ? new Date(_t) : null;
            const when = (_d && !isNaN(_d.getTime()))
              ? _d.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
              : '?';
            const _type = (e && e.type) || '?';
            const _msg = (e && e.msg) || '(message vide)';
            const _page = (e && e.page) || '—';
            return `<div style="padding:8px 12px;border-bottom:1px solid var(--border);font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--text-dim);">
              <div style="color:var(--text);"><b>[${esc(_type)}]</b> ${esc(_msg)}</div>
              <div style="margin-top:2px;">${esc(when)} · page=${esc(_page)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>` : '';

    wrap.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:16px 20px 24px;">
        <div class="section-header top-picks" style="margin-top:8px;">
          <h2><span class="ico">⚙️</span>Santé du site</h2>
          <div class="hint">État technique en temps réel · fraîcheur des données, couverture, SW, erreurs, stockage</div>
        </div>

        <div style="margin-top:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
          <div style="background:linear-gradient(135deg,${globalColor}22,transparent);border:1px solid var(--border);border-radius:10px;padding:16px;">
            <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Statut global</div>
            <div style="font-size:22px;font-weight:700;color:${globalColor};">${globalEmoji} ${globalLabel}</div>
            <div style="font-size:12px;color:var(--text-dim);margin-top:4px;">${okCount}/${total} checks verts (${score.toFixed(0)}%)</div>
          </div>
          <div style="background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:16px;">
            <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Matchs Winamax (today)</div>
            <div style="font-size:22px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;">${meta.totalRemaining} <span style="font-size:13px;color:var(--text-dim);font-weight:500;">restants / ${meta.todayWinCount} au total</span></div>
          </div>
          <div style="background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:16px;">
            <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">Paris sûrs actifs</div>
            <div style="font-size:22px;font-weight:700;color:#eab308;font-variant-numeric:tabular-nums;">${meta.lockCount}</div>
          </div>
          <div style="background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:16px;">
            <div style="font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.4px;margin-bottom:4px;">LocalStorage</div>
            <div style="font-size:22px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;">${meta.lsMb >= 0 ? meta.lsMb.toFixed(2) + ' MB' : '—'}</div>
          </div>
        </div>

        <div style="margin-top:22px;">
          <div style="font-size:13px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px;">🧠 Recommandations</div>
          ${recoHtml}
        </div>

        <div style="margin-top:22px;">
          <div style="font-size:13px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.4px;margin-bottom:10px;">🎯 Matchs restants par sport</div>
          ${sportMatrix}
        </div>

        <div style="margin-top:22px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <div style="font-size:13px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.4px;">📋 Tous les checks</div>
            <button id="sante-rerun-btn" style="background:rgba(167,139,250,.15);color:#a78bfa;border:1px solid rgba(167,139,250,.3);border-radius:6px;padding:5px 10px;font-size:11px;font-weight:600;cursor:pointer;">🔁 Re-vérifier</button>
          </div>
          <div style="background:var(--panel);border:1px solid var(--border);border-radius:10px;overflow:hidden;">
            ${checks.map((c, i) => checkRow(c, i)).join('')}
          </div>
        </div>

        ${errListHtml}

        <div style="margin-top:24px;font-size:11px;color:var(--text-dim);font-style:italic;line-height:1.6;">
          💡 Les checks sont recalculés à chaque visite de cette page. Les actions (🔁 Forcer refresh, 🔄 Re-register SW, 🧹 Nettoyer caches) sont manuelles et réversibles.
        </div>
      </div>`;

    // Wire up action buttons
    wrap.querySelectorAll('.sante-action-btn').forEach(btn => btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const idx = Number(btn.dataset.actionIdx);
      const c = checks[idx];
      if (c && c.action && typeof c.action.run === 'function') {
        try { c.action.run(); } catch (e) { toast('Echec: ' + (e.message || e), 'error'); }
      }
    }));
    const reBtn = wrap.querySelector('#sante-rerun-btn');
    if (reBtn) reBtn.addEventListener('click', (ev) => { ev.stopPropagation(); renderSantePage(wrap); });
  }

  // ======= Chantier ZZZZ — Coach IA personnalisé (Winamax) =======
  // Analyse les paris trackés réglés (Winamax) pour produire des conseils
  // actionnables : quels sports / ligues / tranches de cotes / créneaux
  // horaires te rapportent, lesquels te coûtent. Toute la logique tient en
  // mémoire — aucune dépendance réseau.
  //
  // Politique Winamax : les paris sont assumés Winamax (Théo ne joue que
  // là-bas). Quand on peut cross-référencer avec PRONOSTICS_DATA, on exclut
  // les bets dont le match a explicitement winamax.available === false.
  // Les bets dont le match n'est plus dans data.js (match archivé) sont
  // inclus — c'est la situation par défaut des paris "anciens".
  // =====================================================================
  // IA TRANSVERSE — Chantiers CCCC/DDDD/EEEE/FFFF (2026-04-22 nuit)
  // =====================================================================
  // 4 générateurs de texte IA heuristique (pas d'appel LLM, 100% local) :
  //   - buildBilanNarrative(rows, perSport)        → Bilan   (CCCC)
  //   - buildMatchNarrative(match, pred)           → Detail  (DDDD)
  //   - suggestCombineIA(allEvents, targetSize)    → Combinés(EEEE)
  //   - detectHistoriquePatterns(settledBets)      → Histo   (FFFF)
  //
  // Style : coach direct, tu, phrases courtes, pas de langue de bois.
  // Toujours Winamax-first (voir project_winamax_architecture).
  // =====================================================================

  // --- CCCC : Bilan narratif IA ---------------------------------------
  function buildBilanNarrative(rows, perSport, wallet) {
    // rows = [{ m, pred, res, odd }], perSport = { sport: {w,l,pl,bets} }
    // wallet = { cur, start } facultatif
    if (!rows || !rows.length) {
      return '<em>Pas encore assez de picks réglés pour tirer des conclusions. Continue à tracker.</em>';
    }
    const tot = rows.length;
    const wins = rows.filter(r => r.res === 'won').length;
    const pl = rows.reduce((s, r) => s + (r.res === 'won' ? (r.odd - 1) : -1), 0);
    const wr = 100 * wins / tot;
    const roi = 100 * pl / tot;

    // Trend 7j vs 30j (par date réelle du match)
    const now = Date.now();
    const DAY = 86400000;
    const bySince = (d) => rows.filter(r => (now - new Date(r.m.date).getTime()) <= d * DAY);
    const r7 = bySince(7), r30 = bySince(30);
    const roiOf = (arr) => arr.length ? 100 * arr.reduce((s, r) => s + (r.res === 'won' ? (r.odd - 1) : -1), 0) / arr.length : null;
    const roi7 = roiOf(r7), roi30 = roiOf(r30);

    // Sports forts / faibles (min 5 paris)
    const sports = Object.entries(perSport || {})
      .filter(([_, s]) => s.bets >= 5)
      .map(([k, s]) => ({ k, roi: 100 * s.pl / s.bets, bets: s.bets }));
    sports.sort((a, b) => b.roi - a.roi);
    const bestSport = sports.length && sports[0].roi >= 10 ? sports[0] : null;
    const worstSport = sports.length && sports[sports.length - 1].roi <= -10 ? sports[sports.length - 1] : null;

    // Streak courant (sur derniers matchs triés par date)
    const sorted = rows.slice().sort((a, b) => new Date(b.m.date) - new Date(a.m.date));
    let streak = 0, streakType = null;
    for (const r of sorted) {
      if (streakType == null) { streakType = r.res; streak = 1; continue; }
      if (r.res === streakType) streak++; else break;
    }

    // Construire le paragraphe — tone coach direct
    const lines = [];
    // Ouverture : état de forme
    if (roi >= 15) lines.push(`🔥 <b style="color:#10b981;">+${roi.toFixed(1)}% de rentabilité</b> sur ${tot} paris — le modèle est en pleine forme.`);
    else if (roi >= 5) lines.push(`✅ <b style="color:#10b981;">+${roi.toFixed(1)}% de rentabilité</b> sur ${tot} paris — rentable, tiens la ligne.`);
    else if (roi >= -5) lines.push(`⚖️ <b>${roi >= 0 ? '+' : ''}${roi.toFixed(1)}% de rentabilité</b> sur ${tot} paris — à l'équilibre, patience.`);
    else if (roi >= -15) lines.push(`⚠️ <b style="color:#fbbf24;">${roi.toFixed(1)}% de rentabilité</b> sur ${tot} paris — passage à vide, vérifie si tu suis bien les paris sûrs.`);
    else lines.push(`🧊 <b style="color:#f87171;">${roi.toFixed(1)}% de rentabilité</b> sur ${tot} paris — glissade sérieuse, relis tes paris des 2 dernières semaines.`);

    // Tendance 7j vs 30j
    if (roi7 != null && roi30 != null && r7.length >= 5 && r30.length >= 10) {
      const delta = roi7 - roi30;
      if (delta >= 7) lines.push(`📈 Les 7 derniers jours ressortent à ${roi7 >= 0 ? '+' : ''}${roi7.toFixed(1)}% contre ${roi30 >= 0 ? '+' : ''}${roi30.toFixed(1)}% sur 30j — clairement en accélération.`);
      else if (delta <= -7) lines.push(`📉 7 derniers jours à ${roi7 >= 0 ? '+' : ''}${roi7.toFixed(1)}%, contre ${roi30 >= 0 ? '+' : ''}${roi30.toFixed(1)}% sur 30j — ralentis le rythme et remonte à la source.`);
    }

    // Sport fort
    if (bestSport) {
      lines.push(`💪 Ton meilleur sport : <b>${esc(sportLabel(bestSport.k) || bestSport.k)}</b> (+${bestSport.roi.toFixed(0)}% sur ${bestSport.bets} paris). Charge dessus.`);
    }
    // Sport faible
    if (worstSport) {
      lines.push(`🚫 <b>${esc(sportLabel(worstSport.k) || worstSport.k)}</b> te plombe (${worstSport.roi.toFixed(0)}% sur ${worstSport.bets} paris). Évite ou ne mise que les paris sûrs.`);
    }

    // Streak
    if (streak >= 4 && streakType === 'won') {
      lines.push(`🔥 Série de ${streak} victoires — n'augmente pas les mises, reste sur la mise conseillée.`);
    } else if (streak >= 3 && streakType === 'lost') {
      lines.push(`🧘 ${streak} défaites d'affilée — pas de grosse mise pour te refaire, prends une pause de 24h si tu sens la panique monter.`);
    }

    // Wallet snapshot
    if (wallet && wallet.start != null && wallet.cur != null) {
      const delta = wallet.cur - wallet.start;
      const pct = wallet.start > 0 ? (100 * delta / wallet.start) : 0;
      if (Math.abs(pct) >= 5) {
        lines.push(`💼 Wallet simulé : ${wallet.start.toFixed(0)}€ → <b>${wallet.cur.toFixed(2)}€</b> (${delta >= 0 ? '+' : ''}${pct.toFixed(0)}%).`);
      }
    }

    return lines.map(l => `<div style="margin:6px 0;">${l}</div>`).join('');
  }

  // --- DDDD : Detail match narratif IA --------------------------------
  function buildMatchNarrative(match, pred) {
    if (!match || !pred || !pred.pick) return '';
    const lines = [];
    const rel = pred.reliability ?? pred.pick.prob;
    const pickOdd = pred.odds ? (pred.pick.key === '1' ? pred.odds.home : pred.pick.key === '2' ? pred.odds.away : pred.odds.draw) : null;

    // Lock status
    if (pred.isLock) {
      lines.push(`🔒 Classé <b>pari sûr</b> à ${(rel * 100).toFixed(0)}% — le modèle est suffisamment serein pour le mettre dans les paris du jour.`);
    } else if (rel >= 0.60) {
      lines.push(`🎯 Confiance solide <b>${(rel * 100).toFixed(0)}%</b> — pas un pari sûr mais un bon pari.`);
    } else if (rel >= 0.50) {
      lines.push(`⚖️ Confiance moyenne <b>${(rel * 100).toFixed(0)}%</b> — pari serré, suis la mise conseillée si tu y vas.`);
    } else {
      lines.push(`⚠️ Confiance faible <b>${(rel * 100).toFixed(0)}%</b> — pas de conviction forte, passe ton tour sauf gros avantage.`);
    }

    // Value
    if (pickOdd && typeof valueBetEdge === 'function') {
      const edge = valueBetEdge(rel, pickOdd);
      if (edge != null && edge >= 0.05) {
        lines.push(`💎 La cote @${pickOdd.toFixed(2)} est généreuse alors qu'on estime ${(rel * 100).toFixed(0)}% de chances — avantage de <b>+${Math.round(edge * 100)}pts</b>, exactement le type de cote qu'on cherche.`);
      } else if (edge != null && edge >= 0) {
        lines.push(`🎚️ Cote @${pickOdd.toFixed(2)} alignée avec la proba modèle — pas de grosse value, pari neutre.`);
      } else if (edge != null && edge < 0) {
        lines.push(`🟡 Cote @${pickOdd.toFixed(2)} trop basse par rapport à nos estimations — le bookmaker n'a pas laissé d'avantage, mieux vaut passer.`);
      }
    }

    // Signaux
    const reasons = (pred.explain && pred.explain.reasons) || [];
    const reasonCount = reasons.length;
    if (reasonCount >= 3) {
      lines.push(`📊 <b>${reasonCount}</b> indicateurs d'accord (force, forme, cote, face-à-face) — quand tout va dans le même sens, c'est plus fiable.`);
    } else if (reasonCount === 2) {
      lines.push(`📊 2 signaux seulement — convergence partielle, ne sur-mise pas.`);
    } else if (reasonCount <= 1 && !pred.isLock) {
      lines.push(`📊 Peu de signaux forts — c'est un pick opportuniste, pas un vrai lock.`);
    }

    // Qualité data
    if (typeof computeDataQuality === 'function') {
      const dq = computeDataQuality(match);
      if (dq && dq.score < 3) {
        lines.push(`🔍 Qualité de données ${dq.score}/${dq.max} — standings/blessures incomplets, méfiance.`);
      }
    }

    // Winamax availability
    if (match.winamax && match.winamax.available === false) {
      lines.push(`🚫 <b>Pas dispo sur Winamax</b> — info seulement, tu ne peux pas jouer ce match.`);
    }

    // Kelly verdict
    if (pickOdd && typeof kellyStake === 'function' && typeof bankroll !== 'undefined') {
      const k = kellyStake(rel, pickOdd, bankroll, 0.25);
      if (k > 0) {
        lines.push(`💰 Mise conseillée : <b>${k.toFixed(2)}€</b>. Ne dépasse pas cette somme sur ce pari.`);
      } else {
        lines.push(`💰 Aucune mise recommandée — le pari n'est pas assez avantageux, même s'il t'inspire.`);
      }
    }

    return lines.map(l => `<div style="margin:6px 0;">${l}</div>`).join('');
  }

  // --- EEEE : Builder Combinés IA -------------------------------------
  function suggestCombineIA(allEvents, targetSize) {
    targetSize = targetSize || 3;
    // Filtrer : Winamax only + locks + futurs + cotes dispo
    const now = Date.now();
    const candidates = (allEvents || []).filter(m => {
      if (!m.winamax || m.winamax.available !== true) return false;
      const t = new Date(m.date).getTime();
      if (isNaN(t) || t <= now) return false;
      const pred = predictMatch(m);
      if (!pred || !pred.pick || !pred.isLock || pred.skip) return false;
      const odd = pred.odds && (pred.pick.key === '1' ? pred.odds.home : pred.pick.key === '2' ? pred.odds.away : pred.odds.draw);
      if (!odd || odd < 1.05) return false;
      return true;
    }).map(m => {
      const pred = predictMatch(m);
      const odd = pred.odds && (pred.pick.key === '1' ? pred.odds.home : pred.pick.key === '2' ? pred.odds.away : pred.odds.draw);
      return { m, pred, odd, rel: pred.reliability ?? pred.pick.prob };
    });

    if (candidates.length < 2) {
      return { legs: [], totalOdd: null, reason: 'Pas assez de locks Winamax avec cotes pour composer un combiné.' };
    }

    // Score par leg : probabilité × ln(odd) — favorise fiabilité haute et cote >1.3
    candidates.sort((a, b) => (b.rel * Math.log(b.odd)) - (a.rel * Math.log(a.odd)));

    // Anti-corrélation : pas 2 legs même (ligue, jour, côté home).
    // Pour la diversification on limite à 1 leg / ligue-jour.
    const picked = [];
    const usedKeys = new Set();
    for (const c of candidates) {
      if (picked.length >= targetSize) break;
      const key = `${c.m.league_code || c.m.league_name || '?'}|${isoDate(c.m.date)}`;
      if (usedKeys.has(key)) continue;
      // Anti-sport-concentration : pas plus de 2 sports pareil
      const sportCount = picked.filter(p => p.m.sport === c.m.sport).length;
      if (sportCount >= 2) continue;
      picked.push(c);
      usedKeys.add(key);
    }

    if (picked.length < 2) {
      return { legs: [], totalOdd: null, reason: 'Les locks du moment sont trop concentrés sur une même ligue/journée — pas de diversification possible.' };
    }

    const totalOdd = picked.reduce((p, l) => p * l.odd, 1);
    const combProb = picked.reduce((p, l) => p * l.rel, 1);
    const expectedPL = combProb * (totalOdd - 1) - (1 - combProb);
    return { legs: picked, totalOdd, combProb, expectedPL, reason: null };
  }

  // --- FFFF : Détecteur de patterns Historique ------------------------
  function detectHistoriquePatterns(settledBets) {
    // settledBets = array des paris trackés clos (gagné/perdu) depuis loadTrackedBets
    if (!settledBets || settledBets.length < 10) {
      return {
        // v30 — Avant : "Pas assez de paris réglés (0/10)" alors que la
        // page Historique en haut affiche "16 picks réglés". Confusion :
        // les 16 sont les picks du MODÈLE (auto-trackés). Ces patterns
        // analysent les paris que TU as suivis manuellement (Mes paris).
        insights: [{ icon: 'ℹ️', text: `Pas encore assez de paris suivis manuellement (${settledBets ? settledBets.length : 0}/10) — utilise « Mes paris » pour tracker tes propres bets et l'IA fera ressortir TES patterns (jour de semaine, type de pari, sport…).`, tone: 'info' }],
        meta: { n: settledBets ? settledBets.length : 0 }
      };
    }

    const insights = [];
    const DAYS_FR = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];

    // Pattern 1 : ROI par jour de semaine
    const byDow = {};
    settledBets.forEach(b => {
      const t = b.added_at ? new Date(b.added_at) : null;
      if (!t || isNaN(t)) return;
      const stake = Number(b.stake) || 0;
      const odds = Number(b.odds) || 0;
      // Skip rows missing stake or with bogus odds — without this the
      // ROI math credits 0€ returns on winners (returned += 0) and
      // tanks the bucket's apparent ROI to -100%.
      if (stake <= 0) return;
      if (b.status === 'gagné' && odds <= 1) return;
      const d = t.getDay();
      const bucket = byDow[d] = byDow[d] || { w:0, l:0, staked:0, returned:0, bets:0 };
      bucket.bets++;
      bucket.staked += stake;
      if (b.status === 'gagné') { bucket.w++; bucket.returned += stake * odds; }
      else if (b.status === 'perdu') bucket.l++;
    });
    const dows = Object.entries(byDow)
      .filter(([_, s]) => s.bets >= 4)
      .map(([d, s]) => ({ d: Number(d), roi: s.staked > 0 ? 100 * (s.returned - s.staked) / s.staked : 0, bets: s.bets }));
    dows.sort((a, b) => b.roi - a.roi);
    if (dows.length >= 2) {
      const best = dows[0], worst = dows[dows.length - 1];
      if (best.roi - worst.roi >= 20) {
        insights.push({
          icon: '📅',
          text: `Tu gagnes beaucoup plus le <b>${DAYS_FR[best.d]}</b> (+${best.roi.toFixed(0)}% sur ${best.bets} paris) que le <b>${DAYS_FR[worst.d]}</b> (${worst.roi.toFixed(0)}% sur ${worst.bets}). Soit ton attention varie, soit tu cibles mieux certains jours.`,
          tone: best.roi > 0 ? 'good' : 'bad',
        });
      }
    }

    // Pattern 2 : Tilt detector — moyenne stakes après 3 défaites
    const sorted = settledBets.slice().sort((a, b) => (new Date(a.added_at) - new Date(b.added_at)));
    let tiltBets = 0, tiltStakeSum = 0, normalBets = 0, normalStakeSum = 0;
    let runLoss = 0;
    sorted.forEach(b => {
      const stake = Number(b.stake) || 0;
      if (runLoss >= 3) { tiltBets++; tiltStakeSum += stake; }
      else { normalBets++; normalStakeSum += stake; }
      if (b.status === 'perdu') runLoss++; else if (b.status === 'gagné') runLoss = 0;
    });
    if (tiltBets >= 3 && normalBets >= 3) {
      const tAvg = tiltStakeSum / tiltBets, nAvg = normalStakeSum / normalBets;
      if (tAvg > nAvg * 1.25) {
        insights.push({
          icon: '🚨',
          text: `<b>Alerte tilt :</b> après 3 défaites d'affilée, ton stake moyen grimpe à ${tAvg.toFixed(2)}€ contre ${nAvg.toFixed(2)}€ en temps normal (+${Math.round((tAvg/nAvg-1)*100)}%). Classique "martingale inverse" — casse le pattern.`,
          tone: 'bad',
        });
      } else if (tAvg < nAvg * 0.85) {
        insights.push({
          icon: '🧘',
          text: `Après 3 défaites d'affilée, ton stake baisse à ${tAvg.toFixed(2)}€ vs ${nAvg.toFixed(2)}€ en temps normal. Discipline solide, tu sais ralentir.`,
          tone: 'good',
        });
      }
    }

    // Pattern 3 : Tranches de cotes
    const buckets = { safe: { min: 1.01, max: 1.5, staked: 0, returned: 0, bets: 0 },
                      mid:  { min: 1.5,  max: 2.5, staked: 0, returned: 0, bets: 0 },
                      high: { min: 2.5,  max: 99,  staked: 0, returned: 0, bets: 0 } };
    settledBets.forEach(b => {
      const o = Number(b.odds) || 0, s = Number(b.stake) || 0;
      let key = null;
      if (o >= 1.01 && o < 1.5) key = 'safe';
      else if (o >= 1.5 && o < 2.5) key = 'mid';
      else if (o >= 2.5) key = 'high';
      if (!key) return;
      buckets[key].bets++;
      buckets[key].staked += s;
      if (b.status === 'gagné') buckets[key].returned += s * o;
    });
    Object.entries(buckets).forEach(([k, b]) => {
      if (b.bets < 5) return;
      const roi = b.staked > 0 ? 100 * (b.returned - b.staked) / b.staked : 0;
      if (roi <= -15) {
        const lbl = k === 'safe' ? 'cotes basses (<1.5)' : k === 'mid' ? 'cotes moyennes (1.5-2.5)' : 'cotes hautes (>2.5)';
        insights.push({
          icon: '📉',
          text: `Sur les <b>${lbl}</b>, tu tournes à <b>${roi.toFixed(0)}% ROI</b> (${b.bets} paris). Évite cette tranche ou ne mise que sur fiabilité haute.`,
          tone: 'bad',
        });
      } else if (roi >= 15 && b.bets >= 8) {
        const lbl = k === 'safe' ? 'cotes basses (<1.5)' : k === 'mid' ? 'cotes moyennes (1.5-2.5)' : 'cotes hautes (>2.5)';
        insights.push({
          icon: '🎯',
          text: `Ta zone de force : les <b>${lbl}</b> à <b>+${roi.toFixed(0)}% ROI</b> (${b.bets} paris). Concentre ton volume ici.`,
          tone: 'good',
        });
      }
    });

    // Pattern 4 : Heure de placement
    const byHour = {};
    settledBets.forEach(b => {
      const t = b.added_at ? new Date(b.added_at) : null;
      if (!t || isNaN(t)) return;
      const stake = Number(b.stake) || 0;
      const odds = Number(b.odds) || 0;
      if (stake <= 0) return;
      if (b.status === 'gagné' && odds <= 1) return;
      const h = t.getHours();
      const slot = h < 6 ? 'nuit' : h < 12 ? 'matin' : h < 18 ? 'apm' : 'soir';
      const bucket = byHour[slot] = byHour[slot] || { staked: 0, returned: 0, bets: 0 };
      bucket.bets++;
      bucket.staked += stake;
      if (b.status === 'gagné') bucket.returned += stake * odds;
    });
    const hourLbl = { nuit: '🌙 nuit (0-6h)', matin: '☀️ matin (6-12h)', apm: '🌤️ après-midi (12-18h)', soir: '🌆 soir (18-24h)' };
    const hours = Object.entries(byHour).filter(([_, s]) => s.bets >= 4);
    hours.forEach(([slot, s]) => {
      const roi = s.staked > 0 ? 100 * (s.returned - s.staked) / s.staked : 0;
      if (roi <= -20) {
        insights.push({
          icon: '🕐',
          text: `Tu places <b>${hourLbl[slot]}</b> et ça tourne à ${roi.toFixed(0)}% ROI (${s.bets} paris). Soit tu es fatigué, soit tes odds sont moins bons à cette heure.`,
          tone: 'bad',
        });
      }
    });

    // Streak actuel
    let curStreak = 0, curType = null;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const r = sorted[i].status;
      if (r !== 'gagné' && r !== 'perdu') continue;
      if (curType == null) { curType = r; curStreak = 1; continue; }
      if (r === curType) curStreak++; else break;
    }
    if (curStreak >= 4 && curType === 'perdu') {
      insights.push({
        icon: '🧊',
        text: `<b>${curStreak} défaites consécutives</b> en cours. Règle d'or : pas de stake gonflé ce soir, on attend que la variance se calme.`,
        tone: 'bad',
      });
    } else if (curStreak >= 5 && curType === 'gagné') {
      insights.push({
        icon: '🔥',
        text: `<b>${curStreak} victoires consécutives</b>. Reste en Kelly 0.25×, ne casse pas le système qui marche.`,
        tone: 'good',
      });
    }

    if (!insights.length) {
      insights.push({ icon: '✅', text: `Aucun pattern alarmant détecté sur ${settledBets.length} paris — tu joues de manière équilibrée.`, tone: 'good' });
    }
    return { insights, meta: { n: settledBets.length } };
  }

  // --- GGGG : Top Pronos narratif IA ----------------------------------
  function buildTopPronosNarrative(top5, futureTop) {
    if (!top5 || !top5.length) {
      return `<em>Aucun top prono actionnable maintenant. ${futureTop && futureTop.length ? `Prochains picks dans la rampe (${futureTop.length}).` : 'Reviens dans quelques heures.'}</em>`;
    }
    const lines = [];
    const locks = top5.filter(x => x.pred && x.pred.isLock);
    const avgRel = top5.reduce((s, x) => s + (x.pred.reliability ?? x.pred.pick.prob), 0) / top5.length;
    const sports = {};
    top5.forEach(x => { const s = x.m.sport; sports[s] = (sports[s] || 0) + 1; });
    const topSport = Object.entries(sports).sort((a, b) => b[1] - a[1])[0];

    // Ouverture
    if (locks.length >= 3) {
      lines.push(`🔥 <b>${locks.length} paris sûrs</b> dans le top 5 — confiance moyenne <b>${(avgRel * 100).toFixed(0)}%</b>. Journée à haute conviction.`);
    } else if (locks.length >= 1) {
      lines.push(`✅ <b>${locks.length} pari${locks.length > 1 ? 's' : ''} sûr${locks.length > 1 ? 's' : ''}</b> sur 5 — confiance moyenne <b>${(avgRel * 100).toFixed(0)}%</b>. Sélection nette.`);
    } else {
      lines.push(`⚖️ Aucun pari sûr dans le top 5 — confiance moyenne <b>${(avgRel * 100).toFixed(0)}%</b>. Journée prudente, reste en petite mise.`);
    }

    // Sport dominant
    if (topSport && topSport[1] >= 3) {
      lines.push(`🏆 <b>${esc(sportLabel(topSport[0]) || topSport[0])}</b> domine le top (${topSport[1]}/5) — check si c'est un sport où tu performes (voir Bilan).`);
    }

    // Meilleure value
    let bestValue = null;
    top5.forEach(x => {
      if (!x.pickOdd || typeof valueBetEdge !== 'function') return;
      const rel = x.pred.reliability ?? x.pred.pick.prob;
      const edge = valueBetEdge(rel, x.pickOdd);
      if (edge != null && (bestValue == null || edge > bestValue.edge)) bestValue = { x, edge };
    });
    if (bestValue && bestValue.edge >= 0.05) {
      const { home, away } = getSides(bestValue.x.m);
      lines.push(`💎 Meilleur avantage : <b>${esc(home?.short || home?.name || '?')} vs ${esc(away?.short || away?.name || '?')}</b> → <b>+${Math.round(bestValue.edge * 100)}pts</b>. Priorise celui-là si tu joues qu'un seul match.`);
    }

    // Conseil bankroll
    const totalKelly = top5.reduce((s, x) => {
      if (!x.pickOdd || typeof kellyStake !== 'function' || typeof bankroll === 'undefined') return s;
      const rel = x.pred.reliability ?? x.pred.pick.prob;
      return s + Math.max(0, kellyStake(rel, x.pickOdd, bankroll, 0.25));
    }, 0);
    if (totalKelly > 0) {
      const pct = bankroll > 0 ? (100 * totalKelly / bankroll) : 0;
      lines.push(`💰 Mises conseillées cumulées sur le top 5 : <b>${totalKelly.toFixed(2)}€</b> (${pct.toFixed(0)}% de ta cagnotte). Divise ou priorise selon le risque.`);
    }

    return lines.map(l => `<div style="margin:6px 0;">${l}</div>`).join('');
  }

  // --- HHHH : Locks narratif IA ---------------------------------------
  function buildLocksNarrative(upcoming, live) {
    const all = [...(upcoming || []), ...(live || [])];
    if (!all.length) {
      return `<em>Pas de lock actif. Reviens après la prochaine actualisation (toutes les 10 min).</em>`;
    }
    const lines = [];
    // v30 fix — Avant : on lisait l.prob / l.odd alors que renderLocksPage
    // pousse des objets {m, pred}. Résultat : "confiance moyenne 0%, cote
    // moyenne @0.00" affiché en permanence sur la page Locks. Maintenant
    // on extrait reliability + l'odd associé au pick depuis pred.odds.
    const _pickOdd = (entry) => {
      if (!entry || !entry.pred || !entry.pred.pick || !entry.pred.odds) return null;
      const k = entry.pred.pick.key;
      return entry.pred.odds[k === '1' ? 'home' : k === '2' ? 'away' : 'draw'] || null;
    };
    const _pickRel = (entry) => {
      if (!entry || !entry.pred) return null;
      return entry.pred.reliability ?? entry.pred.pick?.prob ?? null;
    };
    const _pickSport = (entry) => entry?.m?.sport || null;
    // Compatible avec l'ancien shape (entry plat {prob, odd, sport}) au cas où.
    const relOf = (l) => _pickRel(l) ?? Number(l.prob) ?? 0;
    const oddOf = (l) => _pickOdd(l) ?? Number(l.odd) ?? 0;
    const sportOf = (l) => _pickSport(l) ?? l.sport ?? null;
    const avgRel = all.reduce((s, l) => s + (Number(relOf(l)) || 0), 0) / all.length;
    const avgOdd = all.reduce((s, l) => s + (Number(oddOf(l)) || 0), 0) / all.length;

    // Ouverture
    if (all.length >= 5) {
      lines.push(`🔒 <b>${all.length} paris sûrs actifs</b> (confiance moyenne <b>${(avgRel * 100).toFixed(0)}%</b>, cote moyenne <b>@${avgOdd.toFixed(2)}</b>). Journée chargée — garde la discipline sur les mises.`);
    } else if (all.length >= 2) {
      lines.push(`🔒 <b>${all.length} paris sûrs actifs</b> — confiance moyenne <b>${(avgRel * 100).toFixed(0)}%</b>, cote moyenne <b>@${avgOdd.toFixed(2)}</b>. Sélection raisonnable.`);
    } else {
      lines.push(`🔒 <b>1 seul pari sûr</b> actif — confiance <b>${(avgRel * 100).toFixed(0)}%</b>, cote <b>@${avgOdd.toFixed(2)}</b>. Jour calme.`);
    }

    // Sport dominant
    const sports = {};
    all.forEach(l => { const s = sportOf(l); if (s) sports[s] = (sports[s] || 0) + 1; });
    const topSport = Object.entries(sports).sort((a, b) => b[1] - a[1])[0];
    if (topSport && topSport[1] >= 3) {
      lines.push(`🏆 <b>${esc(sportLabel(topSport[0]) || topSport[0])}</b> pèse ${topSport[1]}/${all.length} des locks — corrélation potentielle si tu mises tout dessus.`);
    }

    // Live
    if (live && live.length) {
      lines.push(`🔴 <b>${live.length} match${live.length > 1 ? 's' : ''} en cours</b> — la variance est maximale, suis le score avant d'empiler.`);
    }

    // Anti-tilt rappel si >=4 locks
    if (all.length >= 4) {
      lines.push(`🧘 Avec ${all.length} locks, ne mise pas tout d'un coup — étale sur la journée ou joue seulement les 2 meilleurs.`);
    }

    return lines.map(l => `<div style="margin:6px 0;">${l}</div>`).join('');
  }

  // --- IIII : Simples quick-take IA -----------------------------------
  function buildSimplesQuickTake(allMatches) {
    // allMatches = events actuellement visibles (post-filtre Winamax + sport)
    if (!allMatches || !allMatches.length) {
      return `<em>Pas de matchs à afficher — change le filtre de sport ou reviens plus tard.</em>`;
    }
    const withPred = allMatches.map(m => {
      const pred = predictMatch(m);
      if (!pred || !pred.pick || pred.skip) return null;
      const odd = pred.odds && (pred.pick.key === '1' ? pred.odds.home : pred.pick.key === '2' ? pred.odds.away : pred.odds.draw);
      return pred ? { m, pred, odd } : null;
    }).filter(Boolean);

    const locks = withPred.filter(x => x.pred.isLock);
    const now = Date.now();
    const upcoming = withPred.filter(x => {
      const t = new Date(x.m.date).getTime();
      return !isNaN(t) && t > now && !x.m.completed;
    });
    const upcomingLocks = upcoming.filter(x => x.pred.isLock);
    // FIX audit Simples #1 : `m.live` n'est jamais set par les scrapers Python.
    // Le seul indicateur live valide est `m.status === 'STATUS_IN_PROGRESS'`
    // (cohérent avec ligne 4972 et le reste du code). Avant : liveCount
    // toujours 0 → le bandeau "X en direct" du Coach IA ne s'affichait jamais.
    const liveCount = allMatches.filter(m => m.status === 'STATUS_IN_PROGRESS' && !m.completed).length;

    const lines = [];
    const totalVisible = allMatches.length;
    const totalUpcoming = upcoming.length;

    // Ouverture basée sur ce qui reste à jouer
    if (totalUpcoming === 0) {
      lines.push(`📭 Aucun match à venir dans le filtre actuel — ${allMatches.filter(m => m.completed).length} déjà terminés, ${liveCount} en cours.`);
    } else if (upcomingLocks.length >= 3) {
      lines.push(`🔥 <b>${upcomingLocks.length} locks</b> à venir sur <b>${totalUpcoming} matchs</b> restants. Journée riche, priorise les locks.`);
    } else if (upcomingLocks.length >= 1) {
      lines.push(`✅ <b>${upcomingLocks.length} lock${upcomingLocks.length > 1 ? 's' : ''}</b> à venir sur <b>${totalUpcoming} matchs</b>. Sélection propre, pas de sur-exposition.`);
    } else {
      lines.push(`⚖️ Aucun pari sûr à venir — ${totalUpcoming} match${totalUpcoming > 1 ? 's' : ''} restant${totalUpcoming > 1 ? 's' : ''}. Jour prudent, petite mise.`);
    }

    // Best value à venir
    let bestValue = null;
    upcoming.forEach(x => {
      if (!x.odd || typeof valueBetEdge !== 'function') return;
      const rel = x.pred.reliability ?? x.pred.pick.prob;
      const edge = valueBetEdge(rel, x.odd);
      if (edge != null && (bestValue == null || edge > bestValue.edge)) bestValue = { x, edge };
    });
    if (bestValue && bestValue.edge >= 0.05) {
      const { home, away } = getSides(bestValue.x.m);
      lines.push(`💎 Meilleur avantage : <b>${esc(home?.short || home?.name || '?')} vs ${esc(away?.short || away?.name || '?')}</b> → <b>+${Math.round(bestValue.edge * 100)}pts</b>.`);
    }

    // Live en cours
    if (liveCount > 0) {
      lines.push(`🔴 <b>${liveCount} match${liveCount > 1 ? 's' : ''} en direct</b> — bandeau LIVE sur les cartes concernées.`);
    }

    return lines.map(l => `<div style="margin:5px 0;">${l}</div>`).join('');
  }

  function computeCoachInsights() {
    const all = loadTrackedBets();
    const betsArr = Object.values(all).filter(b => b && typeof b === 'object');
    const data = window.PRONOSTICS_DATA;
    // Index matchId → match pour filtre Winamax
    const byId = {};
    if (data && data.days) {
      Object.values(data.days).forEach(arr => (arr || []).forEach(m => {
        if (m && m.id != null) byId[String(m.id)] = m;
      }));
    }

    // Ne garder que les paris réglés (won/lost) et Winamax-compatible.
    const settled = betsArr.filter(b => {
      if (b.status !== 'gagné' && b.status !== 'perdu') return false;
      const m = b.id != null ? byId[String(b.id)] : null;
      // Si le match existe et n'est PAS Winamax, exclure. Sinon inclure.
      if (m && m.winamax && m.winamax.available === false) return false;
      return true;
    });

    if (!settled.length) return { total: 0, insights: [] };

    // Agrégats globaux
    let totalStaked = 0, totalReturned = 0, w = 0, l = 0;
    settled.forEach(b => {
      const stake = Number(b.stake) || 0;
      const odds = Number(b.odds) || 0;
      totalStaked += stake;
      if (b.status === 'gagné') { w++; totalReturned += stake * odds; }
      else { l++; }
    });
    const pl = totalReturned - totalStaked;
    const roi = totalStaked > 0 ? (100 * pl / totalStaked) : 0;
    const wr = settled.length ? (100 * w / settled.length) : 0;

    // Bucketing helpers
    const sportLabelSafe = (s) => {
      const map = {
        football: 'Football', tennis: 'Tennis', basketball: 'Basketball',
        hockey: 'Hockey', 'american-football': 'NFL', mma: 'MMA',
        golf: 'Golf', racing: 'Racing', baseball: 'Baseball',
      };
      return map[s] || (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : '?');
    };
    const oddsBucket = (o) => {
      if (!o || o < 1.30) return '<1.30';
      if (o < 1.60) return '1.30–1.60';
      if (o < 2.00) return '1.60–2.00';
      if (o < 2.50) return '2.00–2.50';
      if (o < 3.50) return '2.50–3.50';
      return '≥3.50';
    };
    const timeBucket = (isoStr) => {
      if (!isoStr) return 'Inconnu';
      let d;
      try { d = new Date(isoStr); } catch (e) { return 'Inconnu'; }
      if (!d || isNaN(d.getTime())) return 'Inconnu';
      let h;
      try {
        // Heure locale Paris pour être cohérent avec le reste du dashboard
        h = Number(d.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).split(':')[0]);
      } catch (e) { h = d.getHours(); }
      if (h < 12) return 'Matin (avant 12h)';
      if (h < 18) return 'Après-midi (12h–18h)';
      if (h < 22) return 'Soirée (18h–22h)';
      return 'Tard (22h+)';
    };
    const dowBucket = (isoStr) => {
      if (!isoStr) return 'Inconnu';
      let d;
      try { d = new Date(isoStr); } catch (e) { return 'Inconnu'; }
      if (!d || isNaN(d.getTime())) return 'Inconnu';
      const names = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
      return names[d.getDay()];
    };

    // Agrégation multi-axes
    const agg = (keyFn) => {
      const m = {};
      settled.forEach(b => {
        const k = keyFn(b);
        if (!k || k === '?' || k === 'Inconnu') return;
        const stake = Number(b.stake) || 0;
        const odds = Number(b.odds) || 0;
        const rec = m[k] = m[k] || { key: k, bets: 0, w: 0, l: 0, stake: 0, pl: 0 };
        rec.bets++;
        rec.stake += stake;
        if (b.status === 'gagné') { rec.w++; rec.pl += stake * (odds - 1); }
        else { rec.l++; rec.pl -= stake; }
      });
      return Object.values(m).map(r => ({
        ...r,
        wr: r.bets ? (100 * r.w / r.bets) : 0,
        roi: r.stake > 0 ? (100 * r.pl / r.stake) : 0,
      })).sort((a, b) => b.roi - a.roi);
    };

    const bySport = agg(b => sportLabelSafe(b.sport));
    const byLeague = agg(b => {
      const lg = b.league || '?';
      return (lg !== '?') ? lg : null;
    });
    const byOdds = agg(b => oddsBucket(Number(b.odds)));
    const byTime = agg(b => timeBucket(b.kickoff || b.added_at));
    const byDow = agg(b => dowBucket(b.kickoff || b.added_at));

    // Stake discipline check
    const wonBets = settled.filter(b => b.status === 'gagné');
    const lostBets = settled.filter(b => b.status === 'perdu');
    const avgStakeWon = wonBets.length ? (wonBets.reduce((s,b) => s + (Number(b.stake)||0), 0) / wonBets.length) : 0;
    const avgStakeLost = lostBets.length ? (lostBets.reduce((s,b) => s + (Number(b.stake)||0), 0) / lostBets.length) : 0;

    // === Génération des insights (max 5, priorité au signal fort) ===
    const insights = [];
    const pushIns = (kind, icon, text) => insights.push({ kind, icon, text });

    // Warm-up : trop peu de paris
    if (settled.length < 10) {
      pushIns('info', '📊', `Tu as ${settled.length} pari${settled.length > 1 ? 's' : ''} réglé${settled.length > 1 ? 's' : ''}. Les conseils deviennent fiables à partir de 15–20 paris — continue à tracker.`);
    }

    // Best sport (≥ 5 bets, ROI > +10%)
    const bestSport = bySport.find(s => s.bets >= 5 && s.roi > 10);
    if (bestSport) {
      pushIns('good', '🟢', `Tu cartonnes en <b>${esc(bestSport.key)}</b> : ${bestSport.w}–${bestSport.l} sur ${bestSport.bets} paris, ROI <b>+${bestSport.roi.toFixed(1)}%</b>. Continue sur cette lancée.`);
    }
    // Worst sport (≥ 5 bets, ROI < -10%)
    const worstSport = [...bySport].reverse().find(s => s.bets >= 5 && s.roi < -10);
    if (worstSport) {
      pushIns('bad', '🔴', `Tu perds de l'argent en <b>${esc(worstSport.key)}</b> : ${worstSport.w}–${worstSport.l} sur ${worstSport.bets} paris, ROI <b>${worstSport.roi.toFixed(1)}%</b>. Évite ou baisse fortement la mise.`);
    }

    // Best league (≥ 3 bets, ROI > +15%)
    const bestLeague = byLeague.find(lg => lg.bets >= 3 && lg.roi > 15);
    if (bestLeague && insights.length < 5) {
      pushIns('good', '⭐', `La ligue <b>${esc(bestLeague.key)}</b> te réussit (ROI <b>+${bestLeague.roi.toFixed(1)}%</b> sur ${bestLeague.bets} paris) — priorise-la.`);
    }
    // Worst league
    const worstLeague = [...byLeague].reverse().find(lg => lg.bets >= 3 && lg.roi < -20);
    if (worstLeague && insights.length < 5) {
      pushIns('bad', '⚠️', `<b>${esc(worstLeague.key)}</b> te coûte cher (ROI <b>${worstLeague.roi.toFixed(1)}%</b> sur ${worstLeague.bets} paris) — skip.`);
    }

    // Odds sweet spot (≥ 4 bets, ROI > +10%)
    const bestOdds = byOdds.find(o => o.bets >= 4 && o.roi > 10);
    if (bestOdds && insights.length < 5) {
      pushIns('good', '🎯', `Cote <b>${esc(bestOdds.key)}</b> = ton sweet spot (WR ${bestOdds.wr.toFixed(0)}%, ROI <b>+${bestOdds.roi.toFixed(1)}%</b> sur ${bestOdds.bets} paris).`);
    }
    // Odds to avoid
    const worstOdds = [...byOdds].reverse().find(o => o.bets >= 4 && o.roi < -15);
    if (worstOdds && insights.length < 5) {
      pushIns('bad', '🚫', `Tu perds sur les cotes <b>${esc(worstOdds.key)}</b> (ROI <b>${worstOdds.roi.toFixed(1)}%</b>, ${worstOdds.w}–${worstOdds.l}) — réduis les mises dans cette tranche.`);
    }

    // Stake discipline
    if (avgStakeLost > 0 && avgStakeWon > 0 && avgStakeLost > avgStakeWon * 1.25 && settled.length >= 10 && insights.length < 5) {
      pushIns('bad', '⚖️', `Tu mises <b>+${(100*(avgStakeLost-avgStakeWon)/avgStakeWon).toFixed(0)}%</b> plus gros sur tes paris perdus que gagnés (${avgStakeLost.toFixed(2)}€ vs ${avgStakeWon.toFixed(2)}€). Inverse la tendance — cap la mise des low-confidence.`);
    }

    // Global verdict en fallback si rien trouvé
    if (insights.length === 0) {
      if (roi > 5) pushIns('good', '✅', `Bilan global positif : ROI <b>+${roi.toFixed(1)}%</b> (${w}–${l}) — tu es dans le vert.`);
      else if (roi < -5) pushIns('bad', '❌', `Bilan global négatif : ROI <b>${roi.toFixed(1)}%</b> (${w}–${l}) — pas de biais évident, réduis la taille de portefeuille.`);
      else pushIns('info', '⚖️', `Bilan global neutre (ROI ${roi.toFixed(1)}%, ${w}–${l}). Aucun pattern marquant pour l'instant.`);
    }

    // Time-of-day (best) — bonus si ≥ 4 bets
    const bestTime = byTime.find(t => t.bets >= 4 && t.roi > 10);
    if (bestTime && insights.length < 5) {
      pushIns('good', '🕒', `Créneau <b>${esc(bestTime.key)}</b> = ton moment fort (ROI <b>+${bestTime.roi.toFixed(1)}%</b> sur ${bestTime.bets} paris).`);
    }

    return {
      total: settled.length, w, l, totalStaked, pl, roi, wr,
      bySport, byLeague, byOdds, byTime, byDow,
      insights,
    };
  }

  // v30 — renderMesParis + _renderWinamaxImportSetup + _renderWinamaxImported
  // + _showDatePrompt + handler set-model-start-btn : tous retirés.
  // Théo n'enregistre pas ses paris sur le site (ni manuel, ni import).

    // Aggregate bilan view: overall ROI, per-sport ROI, recent results, top completed picks
  function renderBilanPage(wrap) {
    const data = window.PRONOSTICS_DATA;
    if (!data || !data.days) { wrap.innerHTML = '<div class="bilan-empty">Pas de données de bilan.</div>'; return; }

    // ========= MODEL STATS =========
    const completed = [];
    Object.values(data.days).forEach(arr => (arr || []).forEach(m => {
      if (m.completed) completed.push(m);
    }));
    // Apply time-window filter (days). 0 = tout.
    const windowCutoff = _bilanWindow > 0 ? (() => {
      const cut = new Date();
      cut.setHours(0, 0, 0, 0);
      cut.setDate(cut.getDate() - _bilanWindow);
      return cut;
    })() : null;
    let model = { w: 0, l: 0, pl: 0, bets: 0 };
    const perSport = {};
    const perLeague = {}; // Chantier O — aggregation par ligue
    const rows = [];
    // v26.5 — Compute available sports BEFORE applying sport filter (for filter UI)
    // Only sports with ≥1 evaluated pick in the time window make it into the pills.
    const _sportsInWindow = new Set();
    completed.forEach(m => {
      if (windowCutoff) {
        const md = new Date(m.date);
        if (isNaN(md.getTime()) || md < windowCutoff) return;
      }
      // v26.5 — Apply sport filter (drill-down)
      if (_bilanSport && m.sport !== _bilanSport) return;
      const pred = predictMatch(m);
      if (!pred || !pred.pick || pred.skip) return;
      const res = evaluateModelPick(m, pred);
      if (res == null) return;
      const odd = pred.odds && (pred.pick.key === '1' ? pred.odds.home : pred.pick.key === '2' ? pred.odds.away : pred.odds.draw);
      if (!odd) return;
      model.bets++;
      const ps = perSport[m.sport] = perSport[m.sport] || { w:0, l:0, pl:0, bets:0 };
      ps.bets++;
      // Per-league bucket — key is league_name fallback sur sportLabel si manquant.
      const lgKey = (m.league_name || m.leagueShort || m.league || sportLabel(m.sport)) + '|' + m.sport;
      const lg = perLeague[lgKey] = perLeague[lgKey] || {
        name: m.league_name || m.leagueShort || m.league || sportLabel(m.sport),
        sport: m.sport, w: 0, l: 0, pl: 0, bets: 0, lockBets: 0, lockW: 0,
      };
      lg.bets++;
      if (pred.isLock) lg.lockBets++;
      if (res === 'won') { model.w++; model.pl += (odd - 1); ps.w++; ps.pl += (odd-1); lg.w++; lg.pl += (odd-1); if (pred.isLock) lg.lockW++; }
      else if (res === 'lost') { model.l++; model.pl -= 1; ps.l++; ps.pl -= 1; lg.l++; lg.pl -= 1; }
      rows.push({ m, pred, res, odd });
    });
    const wr = model.bets ? (100*model.w/model.bets) : 0;
    const roi = model.bets ? (100*model.pl/model.bets) : 0;

    // v26.5 — Discover sports present in current time window (before filter)
    // to render the sport-filter pills. Counts picks per sport (using a quick
    // pre-pass); only sports with ≥1 evaluable pick appear.
    const _sportCounts = {};
    completed.forEach(m => {
      if (windowCutoff) {
        const md = new Date(m.date);
        if (isNaN(md.getTime()) || md < windowCutoff) return;
      }
      const pp = predictMatch(m);
      if (!pp || !pp.pick || pp.skip) return;
      const r = evaluateModelPick(m, pp);
      if (r == null) return;
      const o = pp.odds && (pp.pick.key === '1' ? pp.odds.home : pp.pick.key === '2' ? pp.odds.away : pp.odds.draw);
      if (!o) return;
      _sportCounts[m.sport] = (_sportCounts[m.sport] || 0) + 1;
    });
    const _availSports = Object.entries(_sportCounts).sort((a,b) => b[1]-a[1]);
    const _totalPicksInWindow = _availSports.reduce((s, [,c]) => s + c, 0);
    const _sportFilterHtml = _availSports.length >= 2 ? `
      <div style="max-width:1280px;margin:0 auto 16px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-variant-numeric:tabular-nums;">
        <span style="font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:var(--text-dim2);font-weight:700;margin-right:4px;">Filtrer par sport</span>
        <button class="bilan-sport-btn${_bilanSport === null ? ' active' : ''}" data-sport="" title="Tous les sports" style="padding:6px 12px;border-radius:6px;border:1px solid ${_bilanSport === null ? 'var(--brand)' : 'var(--border)'};background:${_bilanSport === null ? 'rgba(167,139,250,.12)' : 'var(--panel)'};color:${_bilanSport === null ? 'var(--brand)' : 'var(--text-dim)'};font-size:12px;font-weight:${_bilanSport === null ? 700 : 500};cursor:pointer;display:inline-flex;align-items:center;gap:6px;">Tous<span style="opacity:.6;">${_totalPicksInWindow}</span></button>
        ${_availSports.map(([sp, n]) => `<button class="bilan-sport-btn${_bilanSport === sp ? ' active' : ''}" data-sport="${esc(sp)}" title="${esc(sportLabel(sp))} · ${n} pari${n>1?'s':''}" style="padding:6px 12px;border-radius:6px;border:1px solid ${_bilanSport === sp ? 'var(--brand)' : 'var(--border)'};background:${_bilanSport === sp ? 'rgba(167,139,250,.12)' : 'var(--panel)'};color:${_bilanSport === sp ? 'var(--brand)' : 'var(--text-dim)'};font-size:12px;font-weight:${_bilanSport === sp ? 700 : 500};cursor:pointer;display:inline-flex;align-items:center;gap:6px;">${sportIcon(sp)} ${esc(sportLabel(sp))}<span style="opacity:.6;">${n}</span></button>`).join('')}
      </div>
    ` : '';

    const modelChartRows = rows.map(r => ({
      date: isoDate(r.m.date),
      delta: r.res === 'won' ? (r.odd - 1) : -1,
    }));
    // v31.7.22 — Mode "Comparer fenêtres" : si activé, on calcule indépendamment
    // 7j/30j/90j à partir de `completed` (ignore le filtre _bilanWindow car il
    // est forcément contraint à une seule fenêtre). Sport filter respecté.
    let modelChartHtml;
    if (_bilanCompareMode) {
      const today = new Date(); today.setHours(0,0,0,0);
      const buildSeriesRows = (windowDays) => {
        const cutoff = new Date(today); cutoff.setDate(cutoff.getDate() - windowDays);
        const out = [];
        completed.forEach(m => {
          const md = new Date(m.date);
          if (isNaN(md.getTime()) || md < cutoff) return;
          if (_bilanSport && m.sport !== _bilanSport) return;
          const pred = predictMatch(m);
          if (!pred || !pred.pick || pred.skip) return;
          const res = evaluateModelPick(m, pred);
          if (res == null) return;
          const odd = pred.odds && (pred.pick.key === '1' ? pred.odds.home : pred.pick.key === '2' ? pred.odds.away : pred.odds.draw);
          if (!odd) return;
          out.push({ date: isoDate(m.date), delta: res === 'won' ? (odd - 1) : -1 });
        });
        return out;
      };
      const series = [
        { label: '7j',  color: '#fbbf24', rows: buildSeriesRows(7) },
        { label: '30j', color: '#a78bfa', rows: buildSeriesRows(30) },
        { label: '90j', color: '#60a5fa', rows: buildSeriesRows(90) },
      ].filter(s => s.rows.length > 0);
      modelChartHtml = (series.length
        ? renderRoiChartMulti(series, { title: 'P&L modèle cumulé — superposition 7j / 30j / 90j' })
        : '') || `<div class="bilan-empty">Pas encore assez de paris pour tracer une courbe.</div>`;
    } else {
      modelChartHtml = renderRoiChart(modelChartRows, { title: 'P&L modèle cumulé (unité flat)' })
        || `<div class="bilan-empty">Pas encore assez de paris pour tracer une courbe.</div>`;
    }

    // ========= PORTEFEUILLE SIMULÉ — Chantier JJ (backtest what-if) =========
    // Chantier EE (2026-04-21) a introduit le choix du stake mode.
    // Chantier JJ (2026-04-22) ajoute les paramètres de démarrage :
    //   - bankroll initial (10€ par défaut, 10-1000€)
    //   - date de départ (défaut = date du premier lock réglé)
    // Chantier RR (2026-04-22) ajoute toggle tous picks vs locks seulement.
    // Le tout persisté en localStorage. Permet de répondre à :
    //   "Et si j'avais commencé avec 50€ le 15 avril en Kelly 0.25× ?"
    // Le backtest NE MODIFIE PAS les picks réels ; il ne fait que rejouer
    // la simulation de staking sur l'historique avec des paramètres custom.
    const WALLET_START = _walletBacktestStart;   // était 10 hardcodé
    const WALLET_STAKE = 1; // legacy — utilisé pour labels "1€ flat par lock"
    // Rows pour le wallet — historique complet, pas de windowing.
    const walletAllRows = [];
    completed.forEach(m => {
      const pred = predictMatch(m);
      if (!pred || !pred.pick || pred.skip) return;
      // Chantier RR : filtrer par mode (tous picks ou locks seulement)
      if (_walletPicksMode === 'locks' && !pred.isLock) return;
      const res = evaluateModelPick(m, pred);
      if (res == null) return;
      const odd = pred.odds && (pred.pick.key === '1' ? pred.odds.home : pred.pick.key === '2' ? pred.odds.away : pred.odds.draw);
      if (!odd) return;
      walletAllRows.push({ m, pred, res, odd });
    });
    // Chantier JJ — tri puis filtre par date de départ.
    const walletAllSorted = walletAllRows
      .slice()
      .sort((a, b) => new Date(a.m.date) - new Date(b.m.date));
    const walletEarliestISO = walletAllSorted.length ? isoDate(walletAllSorted[0].m.date) : null;
    // La date effective = _walletBacktestDate si définie ET ≥ earliest, sinon earliest.
    const walletBacktestDateEff = (() => {
      if (!_walletBacktestDate) return walletEarliestISO;
      if (!walletEarliestISO) return null;
      return _walletBacktestDate < walletEarliestISO ? walletEarliestISO : _walletBacktestDate;
    })();
    const lockRows = walletBacktestDateEff
      ? walletAllSorted.filter(r => isoDate(r.m.date) >= walletBacktestDateEff)
      : walletAllSorted;
    // Chantier EE — simulation de mise dynamique.
    // On itère dans l'ordre chronologique et on calcule la mise pour chaque
    // lock en fonction de la banque courante (Kelly) ou du montant flat choisi.
    // Permet de comparer différentes politiques de staking sans toucher
    // au historique réel.
    const walletByDay = new Map();
    let _runBank = WALLET_START;
    let _totalStaked = 0;
    lockRows.forEach(r => {
      const day = isoDate(r.m.date);
      if (!walletByDay.has(day)) walletByDay.set(day, { day, picks: [], w: 0, l: 0, delta: 0 });
      const d = walletByDay.get(day);
      const stake = Math.min(_runBank, walletStakeFor(_walletStakeMode, _runBank, r.pred.reliability ?? r.pred.pick.prob, r.odd));
      const delta = r.res === 'won' ? stake * (r.odd - 1) : -stake;
      r.stake = Math.round(stake * 100) / 100;   // mémorise pour la ligne
      r.delta = Math.round(delta * 100) / 100;
      _runBank = Math.max(0, _runBank + delta);
      _totalStaked += stake;
      d.picks.push(r);
      d.delta += delta;
      if (r.res === 'won') d.w++; else if (r.res === 'lost') d.l++;
    });
    const walletDays = [...walletByDay.values()].sort((a, b) => a.day.localeCompare(b.day));
    let walletRunning = WALLET_START;
    const walletSeries = [];
    walletDays.forEach(d => {
      d.openBalance = walletRunning;
      walletRunning = Math.round((walletRunning + d.delta) * 100) / 100;
      d.closeBalance = walletRunning;
      walletSeries.push({ date: d.day, cum: walletRunning - WALLET_START, delta: d.delta });
    });
    const walletNow = walletRunning;
    const walletPL = walletNow - WALLET_START;
    const walletROIpct = _totalStaked > 0 ? (100 * walletPL / _totalStaked) : 0;

    // ===== Chantier N — Métriques de risque =====
    // Calculs dérivés de walletSeries (equity path) et walletDays (P&L
    // journalier). Tout en €, cohérent avec les KPIs affichés.
    const riskMetrics = (() => {
      if (!walletSeries.length) return null;
      // Max drawdown : plus grand écart peak → trough en € (négatif ou nul)
      let peak = WALLET_START, maxDD = 0, maxDDPct = 0;
      let ddStart = null, ddEnd = null, currPeakDay = null;
      walletDays.forEach(d => {
        const eq = d.closeBalance;
        if (eq > peak) { peak = eq; currPeakDay = d.day; }
        const dd = eq - peak;
        if (dd < maxDD) {
          maxDD = dd;
          maxDDPct = peak > 0 ? (dd / peak) * 100 : 0;
          ddStart = currPeakDay;
          ddEnd = d.day;
        }
      });
      // Plus longue série de pertes (picks consécutifs perdants, tout confondu)
      let curLoss = 0, maxLossStreak = 0, curWin = 0, maxWinStreak = 0;
      lockRows.forEach(r => {
        if (r.res === 'lost') { curLoss++; curWin = 0; if (curLoss > maxLossStreak) maxLossStreak = curLoss; }
        else if (r.res === 'won') { curWin++; curLoss = 0; if (curWin > maxWinStreak) maxWinStreak = curWin; }
      });
      // Jours verts/rouges/neutres
      const greenDays = walletDays.filter(d => d.delta > 0).length;
      const redDays = walletDays.filter(d => d.delta < 0).length;
      const neutralDays = walletDays.filter(d => d.delta === 0).length;
      // Volatilité : écart-type du P&L journalier
      const deltas = walletDays.map(d => d.delta);
      const mean = deltas.reduce((s, x) => s + x, 0) / deltas.length;
      const variance = deltas.reduce((s, x) => s + (x - mean) * (x - mean), 0) / deltas.length;
      const stdev = Math.sqrt(variance);
      // Meilleur / pire jour
      const bestDay = walletDays.reduce((a, b) => (b.delta > (a?.delta ?? -Infinity) ? b : a), null);
      const worstDay = walletDays.reduce((a, b) => (b.delta < (a?.delta ?? Infinity) ? b : a), null);
      return { maxDD, maxDDPct, ddStart, ddEnd, maxLossStreak, maxWinStreak, greenDays, redDays, neutralDays, mean, stdev, bestDay, worstDay };
    })();

    // ===== Chantier R — Horizon d'affichage table portefeuille =====
    // Toggle indépendant du filtre global `_bilanWindow` : ne change pas
    // les KPIs / la courbe (toujours "depuis J1"), mais filtre quels jours
    // apparaissent dans le tableau journalier ci-dessous.
    const walletTableWindow = _walletTableWindow; // 0=tout / 7 / 30
    const walletDaysVisible = walletTableWindow === 0 ? walletDays : (() => {
      const cut = new Date();
      cut.setHours(0, 0, 0, 0);
      cut.setDate(cut.getDate() - walletTableWindow);
      return walletDays.filter(d => new Date(d.day + 'T12:00:00') >= cut);
    })();

    // Tiny equity chart: reuse renderRoiChart API shape (date + delta)
    // Chantier EE — utilise les deltas réels calculés dynamiquement par lock
    // (car la mise varie selon le mode : flat1/flat2/flat5/Kelly).
    const walletChartRows = lockRows.map(r => ({
      date: isoDate(r.m.date),
      delta: r.delta,
    }));
    const walletStakeModeLbl = walletStakeLabel(_walletStakeMode);
    // Chantier RR — label dynamique "par lock" vs "par pick"
    // FIX TDZ : remonté ici (utilisé dans walletChartHtml juste en dessous).
    const walletPicksLabel = _walletPicksMode === 'locks' ? 'par lock' : 'par pick';
    const walletChartHtml = walletChartRows.length
      ? (renderRoiChart(walletChartRows, { title: `Capital ${WALLET_START.toFixed(WALLET_START%1?2:0)}€ → ${walletNow.toFixed(2)}€ (${walletStakeModeLbl} ${walletPicksLabel})`, unit: '€' })
         || `<div class="bilan-empty">Pas encore assez de picks settled pour tracer la courbe.</div>`)
      : `<div class="bilan-empty">Pas encore de picks settled. La simulation démarre dès qu'un pick est tranché.</div>`;
    // Daily breakdown rows — filtrés par l'horizon table uniquement
    const walletRowsHtml = walletDaysVisible.length
      ? walletDaysVisible.slice().reverse().map(d => {
          const deltaStr = (d.delta >= 0 ? '+' : '') + d.delta.toFixed(2) + '€';
          const deltaCol = d.delta > 0 ? '#34d399' : d.delta < 0 ? '#f87171' : 'var(--text-dim)';
          const dateLabel = new Date(d.day + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', weekday: 'short' });
          return `
            <div style="display:grid;grid-template-columns:110px 1fr 80px 90px 90px;gap:10px;align-items:center;padding:9px 12px;border-top:1px solid var(--border,#2a3744);font-size:13px;">
              <div style="color:var(--text-dim,#b4bcc7);font-weight:600;">${dateLabel}</div>
              <div style="color:var(--text-muted);">${d.picks.length} lock${d.picks.length>1?'s':''} · ${d.w}W · ${d.l}L</div>
              <div style="color:var(--text-muted);text-align:right;font-variant-numeric:tabular-nums;">${d.openBalance.toFixed(2)}€</div>
              <div style="color:${deltaCol};font-weight:700;text-align:right;font-variant-numeric:tabular-nums;">${deltaStr}</div>
              <div style="color:var(--text);font-weight:700;text-align:right;font-variant-numeric:tabular-nums;">${d.closeBalance.toFixed(2)}€</div>
            </div>`;
        }).join('')
      : '';
    const walletRoiColor = walletPL > 0 ? '#34d399' : walletPL < 0 ? '#f87171' : 'var(--text-dim)';

    // Bloc "Métriques de risque" (Chantier N) — posé en 2e rangée de KPIs.
    // Rendu conditionnel : on ne l'affiche pas tant qu'il n'y a pas au moins
    // 5 jours de données (sinon les chiffres sont du bruit pur).
    const riskMetricsHtml = (riskMetrics && walletDays.length >= 5) ? (() => {
      const { maxDD, maxDDPct, maxLossStreak, maxWinStreak, greenDays, redDays, stdev, bestDay, worstDay } = riskMetrics;
      const ddLbl = maxDD < 0 ? `${maxDD.toFixed(2)}€` : '0€';
      const ddPctLbl = maxDD < 0 ? ` (−${Math.abs(maxDDPct).toFixed(1)}%)` : '';
      const bestDayDate = bestDay ? new Date(bestDay.day + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—';
      const worstDayDate = worstDay ? new Date(worstDay.day + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—';
      const totalDays = walletDays.length;
      const greenPct = totalDays ? Math.round(100 * greenDays / totalDays) : 0;
      return `
        <div style="margin-top:14px;padding:12px 14px;background:var(--bg-3,#0f1823);border:1px solid var(--border,#2a3744);border-radius:10px;">
          <div style="font-size:12px;color:var(--text-dim2);font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">🛡️ Métriques de risque</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;">
            <div title="Plus grande chute depuis un sommet. Indique le pire passage qu'il faut être prêt à encaisser.">
              <div style="font-size:11px;color:var(--text-dim);">Drawdown max</div>
              <div style="font-size:16px;font-weight:700;color:#f87171;font-variant-numeric:tabular-nums;">${ddLbl}<span style="font-size:11px;font-weight:500;color:var(--text-dim2);">${ddPctLbl}</span></div>
            </div>
            <div title="Plus longue série de picks consécutifs perdants depuis le démarrage.">
              <div style="font-size:11px;color:var(--text-dim);">Pire série L</div>
              <div style="font-size:16px;font-weight:700;color:#f87171;font-variant-numeric:tabular-nums;">${maxLossStreak} pick${maxLossStreak>1?'s':''}</div>
            </div>
            <div title="Plus longue série de picks consécutifs gagnants.">
              <div style="font-size:11px;color:var(--text-dim);">Meilleure série W</div>
              <div style="font-size:16px;font-weight:700;color:#34d399;font-variant-numeric:tabular-nums;">${maxWinStreak} pick${maxWinStreak>1?'s':''}</div>
            </div>
            <div title="Pourcentage de jours où le solde a progressé.">
              <div style="font-size:11px;color:var(--text-dim);">Jours verts</div>
              <div style="font-size:16px;font-weight:700;color:#34d399;font-variant-numeric:tabular-nums;">${greenPct}%<span style="font-size:11px;font-weight:500;color:var(--text-dim2);"> (${greenDays}/${totalDays})</span></div>
            </div>
            <div title="Écart-type du P&L journalier. Plus c'est haut, plus la variance entre jours est marquée.">
              <div style="font-size:11px;color:var(--text-dim);">Volatilité</div>
              <div style="font-size:16px;font-weight:700;color:var(--text);font-variant-numeric:tabular-nums;">±${stdev.toFixed(2)}€</div>
            </div>
            <div title="Meilleur jour depuis J1">
              <div style="font-size:11px;color:var(--text-dim);">Meilleur jour</div>
              <div style="font-size:16px;font-weight:700;color:#34d399;font-variant-numeric:tabular-nums;">${bestDay ? (bestDay.delta >= 0 ? '+' : '')+bestDay.delta.toFixed(2)+'€' : '—'}<span style="font-size:11px;font-weight:500;color:var(--text-dim2);"> · ${bestDayDate}</span></div>
            </div>
            <div title="Pire jour depuis J1">
              <div style="font-size:11px;color:var(--text-dim);">Pire jour</div>
              <div style="font-size:16px;font-weight:700;color:#f87171;font-variant-numeric:tabular-nums;">${worstDay ? worstDay.delta.toFixed(2)+'€' : '—'}<span style="font-size:11px;font-weight:500;color:var(--text-dim2);"> · ${worstDayDate}</span></div>
            </div>
          </div>
        </div>`;
    })() : (walletDays.length > 0
      ? `<div style="margin-top:12px;padding:10px 12px;background:var(--bg-3,#0f1823);border:1px dashed var(--border,#2a3744);border-radius:8px;font-size:12px;color:var(--text-dim);">🛡️ Métriques de risque : encore ${5 - walletDays.length} jour${(5-walletDays.length)>1?'s':''} avant que l'échantillon soit représentatif.</div>`
      : '');

    // Toggle horizon table wallet (Chantier R)
    const walletTableToolbarHtml = walletDays.length
      ? `
        <div style="display:flex;align-items:center;gap:8px;margin-top:14px;margin-bottom:8px;flex-wrap:wrap;">
          <span style="font-size:11.5px;color:var(--text-dim2);font-weight:600;text-transform:uppercase;letter-spacing:.4px;">Affichage table :</span>
          ${[[7,'7j'],[30,'30j'],[0,'Tout']].map(([v,lbl]) =>
            `<button class="wallet-tbl-btn${_walletTableWindow===v?' active':''}" data-wtw="${v}" style="background:${_walletTableWindow===v?'var(--brand,#a78bfa)':'var(--bg-3,#0f1823)'};color:${_walletTableWindow===v?'#0a0e17':'var(--text)'};border:1px solid ${_walletTableWindow===v?'var(--brand,#a78bfa)':'var(--border,#2a3744)'};padding:4px 11px;font-size:12px;font-weight:600;border-radius:6px;cursor:pointer;">${lbl}</button>`).join('')}
          <span style="font-size:11px;color:var(--text-dim2);">${walletDaysVisible.length}/${walletDays.length} jour${walletDays.length>1?'s':''}</span>
        </div>`
      : '';

    // Chantier EE — toolbar pour sélectionner la politique de staking.
    // Ne modifie PAS les résultats réels ni les locks — c'est une simulation
    // rejouée à la volée sur l'historique. Permet de comparer "et si j'avais
    // mis 2€ flat ?" ou "et si j'avais Kelly 0.25× ?".
    const walletStakeToolbarHtml = `
      <div style="display:flex;align-items:center;gap:8px;margin-top:4px;margin-bottom:12px;flex-wrap:wrap;">
        <span style="font-size:11.5px;color:var(--text-dim2);font-weight:600;text-transform:uppercase;letter-spacing:.4px;">Politique de mise :</span>
        ${[['flat1','1€ flat'],['flat2','2€ flat'],['flat5','5€ flat'],['kelly025','Kelly ¼'],['kelly050','Kelly ½']].map(([v,lbl]) =>
          `<button class="wallet-stake-btn${_walletStakeMode===v?' active':''}" data-wsm="${v}" style="background:${_walletStakeMode===v?'var(--brand,#a78bfa)':'var(--bg-3,#0f1823)'};color:${_walletStakeMode===v?'#0a0e17':'var(--text)'};border:1px solid ${_walletStakeMode===v?'var(--brand,#a78bfa)':'var(--border,#2a3744)'};padding:4px 11px;font-size:12px;font-weight:600;border-radius:6px;cursor:pointer;">${lbl}</button>`).join('')}
        <span style="font-size:11px;color:var(--text-dim2);margin-left:2px;" title="Kelly utilise la fiabilité (modèle pur, sans marché) comme probabilité. Fraction plafonnée à 10% de banque.">ℹ️ rejoué sur l'historique</span>
      </div>`;

    // Chantier JJ — toolbar backtest what-if.
    // Permet de choisir la banque de départ (10-10000€) et la date de départ
    // (à partir de laquelle on compte les locks). La date est clampée à
    // walletEarliestISO côté code — on peut donc saisir n'importe quoi sans
    // risque. Bouton reset = retour aux valeurs par défaut (10€ + earliest).
    const todayISOStr = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
    const backtestDateDefault = walletBacktestDateEff || '';
    const backtestIsDefault = (_walletBacktestStart === 10 && !_walletBacktestDate);
    const walletBacktestToolbarHtml = `
      <div style="display:flex;align-items:center;gap:10px;margin-top:8px;margin-bottom:4px;flex-wrap:wrap;">
        <span style="font-size:11.5px;color:var(--text-dim2);font-weight:600;text-transform:uppercase;letter-spacing:.4px;">Backtest :</span>
        <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--text-dim);">
          Départ
          <input type="number" class="wallet-bt-start" min="10" max="10000" step="10" value="${_walletBacktestStart}" style="width:78px;background:var(--bg-3,#0f1823);color:var(--text);border:1px solid var(--border,#2a3744);border-radius:6px;padding:3px 6px;font-size:12px;font-variant-numeric:tabular-nums;" />
          <span style="color:var(--text-dim2);">€</span>
        </label>
        <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--text-dim);">
          depuis
          <input type="date" class="wallet-bt-date" min="${walletEarliestISO || ''}" max="${todayISOStr}" value="${backtestDateDefault}" style="background:var(--bg-3,#0f1823);color:var(--text);border:1px solid var(--border,#2a3744);border-radius:6px;padding:3px 6px;font-size:12px;" />
        </label>
        <button class="wallet-bt-reset" ${backtestIsDefault?'disabled':''} style="background:${backtestIsDefault?'var(--bg-3,#0f1823)':'var(--bg-2,#1a2432)'};color:${backtestIsDefault?'var(--text-dim2)':'var(--text-dim)'};border:1px solid var(--border,#2a3744);border-radius:6px;padding:3px 10px;font-size:12px;font-weight:600;cursor:${backtestIsDefault?'default':'pointer'};opacity:${backtestIsDefault?'.5':'1'};">↺ reset</button>
        <span style="font-size:11px;color:var(--text-dim2);" title="Rejoue la simulation à partir de la date/banque choisie, avec la politique de mise sélectionnée.">ℹ️ what-if</span>
      </div>`;
    // Label date effective pour le h3 (vide si = earliest ou absent)
    const walletDateLabel = (walletBacktestDateEff && walletBacktestDateEff !== walletEarliestISO)
      ? ` · depuis ${walletBacktestDateEff}` : '';
    // (walletPicksLabel déplacé plus haut — fix TDZ)
    // Chantier RR — toggle [Tous picks | Locks seulement]
    const walletPicksModeToolbar = `
      <div style="display:flex;align-items:center;gap:8px;margin-top:0;margin-bottom:8px;flex-wrap:wrap;">
        <span style="font-size:11.5px;color:var(--text-dim2);font-weight:600;text-transform:uppercase;letter-spacing:.4px;">Mode :</span>
        ${[['all','Tous picks'],['locks','Locks seulement']].map(([v,lbl]) =>
          `<button class="wallet-picks-mode-btn${_walletPicksMode===v?' active':''}" data-wpm="${v}" style="background:${_walletPicksMode===v?'var(--brand,#a78bfa)':'var(--bg-3,#0f1823)'};color:${_walletPicksMode===v?'#0a0e17':'var(--text)'};border:1px solid ${_walletPicksMode===v?'var(--brand,#a78bfa)':'var(--border,#2a3744)'};padding:4px 11px;font-size:12px;font-weight:600;border-radius:6px;cursor:pointer;">${lbl}</button>`).join('')}
      </div>`;
    const walletSectionHtml = `
      <div class="bilan-section" style="border-color:${walletRoiColor}44;">
        <div class="bilan-section-head">
          <h3>💰 Portefeuille simulé (${WALLET_START.toFixed(WALLET_START%1?2:0)}€ de base · ${walletStakeModeLbl} ${walletPicksLabel}${walletDateLabel})</h3>
          <div class="meta">${lockRows.length} pick${lockRows.length>1?'s':''} settled${walletDays.length?` sur ${walletDays.length} jour${walletDays.length>1?'s':''}`:''}${_bilanWindow > 0 ? ' · toujours calculé depuis J1' : ''}</div>
        </div>
        ${walletPicksModeToolbar}
        ${walletBacktestToolbarHtml}
        ${walletStakeToolbarHtml}
        <div class="bilan-kpis" style="margin-top:0;margin-bottom:14px;">
          <div class="bilan-kpi">
            <div class="kpi-label">Capital actuel</div>
            <div class="kpi-value" style="color:${walletRoiColor};">${walletNow.toFixed(2)}€</div>
            <div class="kpi-sub">départ ${WALLET_START.toFixed(2)}€</div>
          </div>
          <div class="bilan-kpi">
            <div class="kpi-label">P&amp;L cumulé</div>
            <div class="kpi-value" style="color:${walletRoiColor};">${walletPL>=0?'+':''}${walletPL.toFixed(2)}€</div>
            <div class="kpi-sub">${lockRows.length} pick${lockRows.length>1?'s':''} misé${lockRows.length>1?'s':''}</div>
          </div>
          <div class="bilan-kpi">
            <div class="kpi-label">Rentabilité par pari</div>
            <div class="kpi-value" style="color:${walletRoiColor};">${lockRows.length ? (walletROIpct>=0?'+':'')+walletROIpct.toFixed(1)+'%' : '—'}</div>
            <div class="kpi-sub">sur ${_totalStaked.toFixed(2)}€ misés</div>
          </div>
        </div>
        ${riskMetricsHtml}
        ${walletChartHtml}
        ${walletTableToolbarHtml}
        ${walletRowsHtml ? `
          <div style="background:var(--surface,#111827);border:1px solid var(--border,#2a3744);border-radius:10px;overflow:hidden;">
            <div style="display:grid;grid-template-columns:110px 1fr 80px 90px 90px;gap:10px;padding:10px 12px;font-size:11.5px;color:var(--text-dim2,#7b8693);font-weight:600;text-transform:uppercase;letter-spacing:.5px;">
              <div>Jour</div>
              <div>Picks</div>
              <div style="text-align:right;">Ouverture</div>
              <div style="text-align:right;">P&amp;L jour</div>
              <div style="text-align:right;">Clôture</div>
            </div>
            ${walletRowsHtml}
          </div>` : ''}
      </div>`;

    // ========= CALIBRATION (reliability diagram + persistent MAE trend) =========
    // Compute fresh calibration from the current bilan and store today's MAE
    // snapshot in localStorage. Keep 60 days rolling. This lets us see if the
    // calibration is improving as we add signals.
    const cal = computeCalibration();
    const calTotalN = cal.reduce((s, c) => s + c.n, 0);
    const calMAE = calTotalN > 0
      ? cal.reduce((s, c) => s + Math.abs(c.actual - c.predicted) * c.n, 0) / calTotalN
      : null;
    // Persist MAE history — one entry per calendar day (Paris TZ), keyed by day.
    let maeHistory = [];
    if (calMAE != null) {
      try {
        const today = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
        const raw = localStorage.getItem('bilan.maeHistory');
        maeHistory = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(maeHistory)) maeHistory = [];
        // Upsert today's entry
        const idx = maeHistory.findIndex(x => x.day === today);
        const entry = { day: today, mae: Math.round(calMAE * 10000) / 10000, n: calTotalN };
        if (idx >= 0) maeHistory[idx] = entry;
        else maeHistory.push(entry);
        // Prune to last 60 days
        maeHistory = maeHistory.slice(-60);
        localStorage.setItem('bilan.maeHistory', JSON.stringify(maeHistory));
      } catch (e) { maeHistory = []; }
    }
    // Sparkline: MAE over the last N snapshots (relative trend).
    const renderMaeSparkline = (history) => {
      if (!history || history.length < 3) return '';
      const w = 180, h = 40, pad = 4;
      const vals = history.map(x => x.mae);
      const min = Math.min(...vals), max = Math.max(...vals);
      const range = Math.max(0.001, max - min);
      const xAt = i => pad + (i / (vals.length - 1)) * (w - 2 * pad);
      const yAt = v => pad + (1 - (v - min) / range) * (h - 2 * pad);
      const pts = vals.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ');
      const last = history[history.length - 1], first = history[0];
      const delta = last.mae - first.mae;
      const stroke = delta <= 0 ? '#34d399' : '#f87171';  // down = improving = green
      const deltaLbl = `${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}pt`;
      return `
        <div style="display:flex;align-items:center;gap:12px;margin-top:8px;font-size:12px;color:var(--text-dim);">
          <span>Tendance MAE (${history.length}j):</span>
          <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="flex-shrink:0;">
            <polyline points="${pts}" fill="none" stroke="${stroke}" stroke-width="1.6"/>
            <circle cx="${xAt(vals.length - 1).toFixed(1)}" cy="${yAt(last.mae).toFixed(1)}" r="2.5" fill="${stroke}"/>
          </svg>
          <span style="color:${stroke};font-weight:600;font-variant-numeric:tabular-nums;">${deltaLbl}</span>
          <span style="color:var(--text-dim2);">${delta <= 0 ? 'calibration qui s\'améliore' : 'calibration qui se dégrade'}</span>
        </div>
      `;
    };
    const reliabilitySectionHtml = `
      <div class="bilan-section">
        <div class="bilan-section-head">
          <h3>🎚️ Calibration fiabilité</h3>
          <div class="meta">Est-ce que la jauge dit la vérité ?</div>
        </div>
        ${renderReliabilityDiagram(cal)}
        ${renderMaeSparkline(maeHistory)}
      </div>
    `;

    // ========= MODEL BREAKDOWN: buckets confiance =========
    // Buckets par proba modèle : high ≥ 0.65, mid 0.55–0.65, low 0.50–0.55.
    const bucket = { high: { w:0, l:0, pl:0, bets:0 }, mid: { w:0, l:0, pl:0, bets:0 }, low: { w:0, l:0, pl:0, bets:0 } };
    // Draws-specific tracking — user explicitly flagged draws as a category
    // to watch. Adds a sanity check that 'X' picks are actually surfaced.
    const drawsBucket = { w:0, l:0, pl:0, bets:0 };
    rows.forEach(r => {
      // Bucket by reliability (UI confidence), same reason as the reliability
      // diagram above — the bilan should answer "are the labels we show
      // actually calibrated?"
      const p = r.pred.reliability ?? r.pred.pick.prob ?? 0;
      const b = p >= 0.65 ? bucket.high : p >= 0.55 ? bucket.mid : bucket.low;
      b.bets++;
      const delta = r.res === 'won' ? (r.odd - 1) : -1;
      if (r.res === 'won') b.w++; else b.l++;
      b.pl += delta;
      if (r.pred.pick.key === 'X') {
        drawsBucket.bets++;
        if (r.res === 'won') drawsBucket.w++; else drawsBucket.l++;
        drawsBucket.pl += delta;
      }
    });

    // Per-sport cards — v26.5 clickable when not already drilled (data-sport)
    const perSportHtml = Object.entries(perSport)
      .sort((a,b) => b[1].bets - a[1].bets)
      .map(([sport, s]) => {
        const sw = s.bets ? (100*s.w/s.bets) : 0;
        const sr = s.bets ? (100*s.pl/s.bets) : 0;
        const roiColor = sr >= 0 ? '#34d399' : '#f87171';
        const clickable = !_bilanSport;
        return `<div class="bilan-sport-card"${clickable ? ` data-sport="${esc(sport)}" title="Cliquer pour filtrer le Bilan sur ${esc(sportLabel(sport))}" style="cursor:pointer;"` : ''}>
          <div class="sport-name"><span class="sport-ico" aria-hidden="true">${sportIcon(sport)}</span> ${esc(sportLabel(sport))}${clickable ? ' <span style="font-size:10px;color:var(--text-dim2);opacity:.6;margin-left:4px;">→</span>' : ''}</div>
          <div class="sport-wr">${sw.toFixed(0)}% <span style="font-size:11px;color:var(--text-dim2);font-weight:500;letter-spacing:0;">WR</span></div>
          <div class="sport-roi" style="color:${roiColor};">Rentabilité ${sr>=0?'+':''}${sr.toFixed(0)}% · ${s.bets} paris</div>
        </div>`;
      }).join('');

    // Chantier O — Breakdown par ligue (top 12 par volume, min 3 paris pour être significatif)
    // Tableau trié par ROI pour identifier les ligues à fort edge.
    const leagueEntries = Object.values(perLeague)
      .filter(lg => lg.bets >= 3)
      .sort((a, b) => {
        // Tri principal : ROI décroissant. Tie-break : volume décroissant.
        const roiA = a.bets ? (100*a.pl/a.bets) : 0;
        const roiB = b.bets ? (100*b.pl/b.bets) : 0;
        if (Math.abs(roiA - roiB) > 0.1) return roiB - roiA;
        return b.bets - a.bets;
      });
    const perLeagueHtml = leagueEntries.length
      ? (() => {
          const bestROI = leagueEntries[0] ? (100*leagueEntries[0].pl/leagueEntries[0].bets) : 0;
          const worstROI = leagueEntries[leagueEntries.length-1] ? (100*leagueEntries[leagueEntries.length-1].pl/leagueEntries[leagueEntries.length-1].bets) : 0;
          const rowsH = leagueEntries.slice(0, 12).map(lg => {
            const lwr = lg.bets ? (100*lg.w/lg.bets) : 0;
            const lroi = lg.bets ? (100*lg.pl/lg.bets) : 0;
            const roiColor = lroi >= 3 ? '#34d399' : lroi <= -3 ? '#f87171' : 'var(--text-dim)';
            const lockWr = lg.lockBets ? (100*lg.lockW/lg.lockBets) : null;
            return `
              <div class="bilan-league-row" data-league-row>
                <div class="lgr-ico">${sportIcon(lg.sport)}</div>
                <div class="lgr-name">${esc(lg.name)}</div>
                <div class="lgr-bets">${lg.bets} pari${lg.bets>1?'s':''}${lg.lockBets?` · ${lg.lockBets} lock${lg.lockBets>1?'s':''}`:''}</div>
                <div class="lgr-wr">${lwr.toFixed(0)}%<span class="lgr-wr-lbl">WR</span>${lockWr !== null ? `<span class="lgr-lockwr" title="WR sur les locks uniquement">🔒${lockWr.toFixed(0)}%</span>` : ''}</div>
                <div class="lgr-pl" style="color:${roiColor};">${lg.pl>=0?'+':''}${lg.pl.toFixed(2)}u</div>
                <div class="lgr-roi" style="color:${roiColor};">Rentab. ${lroi>=0?'+':''}${lroi.toFixed(0)}%</div>
              </div>`;
          }).join('');
          const moreCount = Math.max(0, leagueEntries.length - 12);
          return `
            <div class="bilan-league-table">
              <div class="bilan-league-head">
                <div></div><div>Ligue</div><div>Paris</div><div>% Gagnés</div><div style="text-align:right;">Gains/Pertes</div><div style="text-align:right;">Rentab.</div>
              </div>
              ${rowsH}
              ${moreCount ? `<div style="padding:8px 12px;font-size:11px;color:var(--text-dim2);border-top:1px solid var(--border,#2a3744);">+ ${moreCount} ligue${moreCount>1?'s':''} avec moins de volume</div>` : ''}
              ${leagueEntries.length >= 2 ? `
                <div style="padding:9px 12px;font-size:11px;color:var(--text-dim2);border-top:1px solid var(--border,#2a3744);background:var(--bg-3,#0f1823);">
                  <span style="color:#34d399;">💡 Meilleure ligue</span> : ${esc(leagueEntries[0].name)} (ROI ${bestROI>=0?'+':''}${bestROI.toFixed(0)}%)
                  · <span style="color:#f87171;">⚠️ Pire</span> : ${esc(leagueEntries[leagueEntries.length-1].name)} (${worstROI>=0?'+':''}${worstROI.toFixed(0)}%)
                </div>` : ''}
            </div>`;
        })()
      : '';

    // ========= Chantier OO — HEATMAP PERFORMANCE (sport × jour de semaine) =========
    // Grille qui croise le sport (lignes) et le jour de semaine (colonnes).
    // Chaque cellule = ROI (%) calculé sur les paris modèle terminés (flat 1u).
    // But : repérer d'un coup les combos rentables ("tennis le dimanche") et
    // les trous noirs ("foot le mardi perd -8%"). Utilise les mêmes `rows`
    // que le reste du Bilan => respecte la fenêtre temporelle active.
    //
    // Couleurs : dégradé rouge→jaune→vert centré sur 0% ROI, intensité scalée
    // par le volume (au moins 3 picks pour qu'une cellule soit colorée, sinon
    // griffée discrète "n=X").
    const heatmapHtml = (() => {
      if (!rows.length) return '';
      // Ordre lundi→dimanche (européen), avec libellés courts.
      const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
      // JS getDay() : 0=Dim, 1=Lun, ..., 6=Sam -> on map en 0=Lun..6=Dim.
      const getDowEU = (d) => {
        const n = new Date(d).getDay();
        return (n + 6) % 7;
      };
      const cells = {};   // "sport|dow" -> { sport, dow, w, l, bets, pl }
      const sportsSet = new Set();
      rows.forEach(r => {
        const dow = getDowEU(r.m.date);
        if (!isFinite(dow)) return;
        const sp = r.m.sport;
        sportsSet.add(sp);
        const k = sp + '|' + dow;
        const c = cells[k] = cells[k] || { sport: sp, dow, w:0, l:0, bets:0, pl:0 };
        c.bets++;
        if (r.res === 'won') { c.w++; c.pl += (r.odd - 1); }
        else if (r.res === 'lost') { c.l++; c.pl -= 1; }
      });
      // Trier les sports par volume total (lignes les plus denses en haut).
      const sportVol = {};
      Object.values(cells).forEach(c => { sportVol[c.sport] = (sportVol[c.sport]||0) + c.bets; });
      const sports = [...sportsSet].sort((a,b) => sportVol[b] - sportVol[a]);
      if (!sports.length) return '';

      // Couleur ROI : palette divergente rouge→neutre→vert.
      // On clip à ±25% pour que les cellules extrêmes ne bouffent pas le gradient.
      const CLIP = 25;
      const cellColor = (roi, bets) => {
        if (bets < 3) return { bg: 'var(--bg-3,#0f1823)', text: 'var(--text-dim2)', border: 'var(--border,#2a3744)' };
        const x = Math.max(-1, Math.min(1, roi / CLIP));
        // intensité alpha scalée par volume (plafond à n=10)
        const alpha = Math.min(1, 0.35 + (bets / 10) * 0.55);
        if (x >= 0) {
          // vert : 52,211,153 (#34d399)
          return {
            bg: `rgba(52,211,153,${(alpha * x).toFixed(3)})`,
            text: x > 0.5 ? '#0a0e17' : 'var(--text)',
            border: x > 0.3 ? '#34d39988' : 'var(--border,#2a3744)'
          };
        } else {
          // rouge : 248,113,113 (#f87171)
          return {
            bg: `rgba(248,113,113,${(alpha * (-x)).toFixed(3)})`,
            text: (-x) > 0.5 ? '#0a0e17' : 'var(--text)',
            border: (-x) > 0.3 ? '#f8717188' : 'var(--border,#2a3744)'
          };
        }
      };

      // Chantier SS — Best / worst cell pour le résumé bas de grille : n >= 10 minimum
      const qualCells = Object.values(cells).filter(c => c.bets >= 10);
      qualCells.sort((a,b) => (b.pl/b.bets) - (a.pl/a.bets));
      const bestCell = qualCells[0] || null;
      const worstCell = qualCells[qualCells.length-1] || null;
      const bestROI = bestCell ? (100 * bestCell.pl / bestCell.bets) : 0;
      const worstROI = worstCell ? (100 * worstCell.pl / worstCell.bets) : 0;
      // Chantier SS — message si données insuffisantes
      const insufficientDataMsg = !bestCell ? `<div style="padding:9px 12px;font-size:11px;color:var(--text-dim);border-top:1px solid var(--border,#2a3744);background:var(--bg-3,#0f1823);margin-top:10px;border-radius:8px;">⚠️ Données insuffisantes pour un classement fiable (besoin ≥10 paris/créneau)</div>` : '';

      const headerH = `
        <div style="display:grid;grid-template-columns:140px repeat(7, 1fr);gap:4px;padding:0 2px;margin-bottom:4px;">
          <div></div>
          ${DAY_NAMES.map(d => `<div style="text-align:center;font-size:11px;color:var(--text-dim2);font-weight:600;text-transform:uppercase;letter-spacing:.4px;padding:4px 0;">${d}</div>`).join('')}
        </div>`;
      const rowsH = sports.map(sp => {
        const rowCells = DAY_NAMES.map((_, dow) => {
          const c = cells[sp + '|' + dow];
          if (!c || !c.bets) {
            return `<div style="background:var(--bg-3,#0f1823);border:1px solid var(--border,#2a3744);border-radius:6px;padding:10px 4px;text-align:center;font-size:11px;color:var(--text-dim2);" title="${sportLabel(sp)} · ${DAY_NAMES[dow]} : aucun pari">·</div>`;
          }
          const roi = 100 * c.pl / c.bets;
          const wr = 100 * c.w / c.bets;
          // Chantier SS — Wilson 95% confidence interval sur le taux de win
          // p ± 1.96*sqrt(p(1-p)/n) appliqué à la win rate
          const p = c.w / c.bets;
          const ci_margin = 1.96 * Math.sqrt(p * (1 - p) / c.bets);
          const ci_low = Math.max(0, (p - ci_margin) * 100);
          const ci_high = Math.min(100, (p + ci_margin) * 100);
          const ci_str = `[${ci_low.toFixed(0)}%, ${ci_high.toFixed(0)}%]`;
          const col = cellColor(roi, c.bets);
          const tip = `${sportLabel(sp)} · ${DAY_NAMES[dow]}
${c.bets} pari${c.bets>1?'s':''} · ${c.w}W ${c.l}L
WR ${wr.toFixed(0)}% ${c.bets >= 5 ? ci_str : ''} · ROI ${roi>=0?'+':''}${roi.toFixed(1)}%
P&L ${c.pl>=0?'+':''}${c.pl.toFixed(2)}u`;
          let label;
          if (c.bets < 5) {
            // Chantier SS — Dim cells with n<5, show only n=X
            label = `<div style="font-size:10px;color:${col.text};line-height:1.1;">n=${c.bets}</div>`;
          } else {
            // Normal display with CI appended
            label = `<div style="font-size:13px;font-weight:700;color:${col.text};line-height:1.1;">${roi>=0?'+':''}${roi.toFixed(0)}%</div>
               <div style="font-size:9px;color:${col.text};opacity:.7;line-height:1.2;">${ci_str}</div>
               <div style="font-size:10px;color:${col.text};opacity:.8;line-height:1.3;">${c.bets}p</div>`;
          }
          const cellOpacity = c.bets < 5 ? 'opacity:0.4;' : '';
          return `<div title="${tip.replace(/"/g,'&quot;')}" style="background:${col.bg};border:1px solid ${col.border};border-radius:6px;padding:8px 4px;text-align:center;font-variant-numeric:tabular-nums;${cellOpacity}">${label}</div>`;
        }).join('');
        return `
          <div style="display:grid;grid-template-columns:140px repeat(7, 1fr);gap:4px;padding:2px;align-items:stretch;">
            <div style="display:flex;align-items:center;gap:6px;padding:0 4px;font-size:12.5px;color:var(--text);font-weight:600;">
              <span style="font-size:14px;">${sportIcon(sp)}</span>
              <span>${esc(sportLabel(sp))}</span>
            </div>
            ${rowCells}
          </div>`;
      }).join('');

      const footerH = (bestCell && worstCell && bestCell !== worstCell) ? `
        <div style="padding:9px 12px;font-size:11px;color:var(--text-dim2);border-top:1px solid var(--border,#2a3744);background:var(--bg-3,#0f1823);margin-top:10px;border-radius:8px;">
          <span style="color:#34d399;">🔥 Meilleur créneau</span> : ${esc(sportLabel(bestCell.sport))} le ${DAY_NAMES[bestCell.dow].toLowerCase()} (ROI ${bestROI>=0?'+':''}${bestROI.toFixed(0)}% · ${bestCell.bets} paris)
          · <span style="color:#f87171;">❄️ Pire</span> : ${esc(sportLabel(worstCell.sport))} le ${DAY_NAMES[worstCell.dow].toLowerCase()} (${worstROI>=0?'+':''}${worstROI.toFixed(0)}% · ${worstCell.bets} paris)
        </div>` : insufficientDataMsg;

      return `
        <div class="bilan-section">
          <div class="bilan-section-head">
            <h3>🗓️ Heatmap sport × jour</h3>
            <div class="meta">Rentabilité par créneau · mise fixe 1 · ${rows.length} pari${rows.length>1?'s':''} · cellules &lt; 3 paris grisées</div>
          </div>
          ${headerH}
          ${rowsH}
          ${footerH}
        </div>`;
    })();

    // ========= Chantier FF — TIPSTERS SCORECARD =========
    // Agrège tous les pronos de tipsters externes (source + pick + cote) sur
    // les matchs terminés. Permet de voir qui bat le marché et qui coule.
    // Respecte la fenêtre `_bilanWindow` (contrairement au wallet).
    // Règles d'exclusion :
    //  - Tipster sans cote (on ne peut pas calculer un ROI)
    //  - Source anonyme ('autre', null) regroupée en "Inconnu"
    //  - On ne garde que les sources avec ≥3 picks pour limiter le bruit.
    const tipsterAgg = {};      // src -> { name, w, l, n, pl, bySport:{} }
    let tipsterTotalN = 0;
    completed.forEach(m => {
      if (windowCutoff) {
        const md = new Date(m.date);
        if (isNaN(md.getTime()) || md < windowCutoff) return;
      }
      (m.tips || []).forEach(t => {
        if (!t.pick || !(t.odds > 1)) return;
        const tr = evaluateTipsterPick(t.pick, m);
        if (tr == null) return;   // verdict ambigu
        const srcKey = t.source || 'autre';
        const srcName = sourceLabel(srcKey);
        const b = tipsterAgg[srcKey] = tipsterAgg[srcKey] || { name: srcName, key: srcKey, w: 0, l: 0, n: 0, pl: 0, bySport: {} };
        b.n++;
        tipsterTotalN++;
        const sp = b.bySport[m.sport] = b.bySport[m.sport] || { w:0, l:0, n:0, pl:0 };
        sp.n++;
        if (tr === 'won') { b.w++; b.pl += (t.odds - 1); sp.w++; sp.pl += (t.odds - 1); }
        else if (tr === 'lost') { b.l++; b.pl -= 1; sp.l++; sp.pl -= 1; }
      });
    });
    const tipsterEntries = Object.values(tipsterAgg)
      .filter(b => b.n >= 3)
      .sort((a, b) => {
        // Tri ROI desc, tie-break volume desc.
        const rA = a.n ? (100 * a.pl / a.n) : 0;
        const rB = b.n ? (100 * b.pl / b.n) : 0;
        if (Math.abs(rA - rB) > 0.1) return rB - rA;
        return b.n - a.n;
      });
    // Médaille : badge pour le #1 (si ROI > 0) et warning pour le dernier (si ROI < 0).
    const tipstersHtml = tipsterEntries.length ? (() => {
      const winnerROI = 100 * tipsterEntries[0].pl / tipsterEntries[0].n;
      const loserROI = 100 * tipsterEntries[tipsterEntries.length-1].pl / tipsterEntries[tipsterEntries.length-1].n;
      const rowsH = tipsterEntries.map((b, idx) => {
        const wr = 100 * b.w / b.n;
        const roiT = 100 * b.pl / b.n;
        const roiColor = roiT >= 3 ? '#34d399' : roiT <= -3 ? '#f87171' : 'var(--text-dim)';
        const medal = idx === 0 && roiT > 0 ? '🥇 ' : idx === 1 && roiT > 0 ? '🥈 ' : idx === 2 && roiT > 0 ? '🥉 ' : '';
        const warn = idx === tipsterEntries.length - 1 && roiT <= -3 && tipsterEntries.length >= 3 ? ' ⚠️' : '';
        // Top sport du tipster
        const topSport = Object.entries(b.bySport).sort((a,b)=>b[1].n-a[1].n)[0];
        const topSportLbl = topSport ? `${sportIcon(topSport[0])} ${topSport[1].n}` : '';
        return `
          <div style="display:grid;grid-template-columns:28px 1fr 90px 90px 80px 90px;gap:8px;align-items:center;padding:10px 12px;border-top:1px solid var(--border,#2a3744);font-size:13px;">
            <div style="color:var(--text-dim2);font-weight:600;text-align:center;">${idx+1}</div>
            <div style="color:var(--text);font-weight:600;">${medal}${esc(b.name)}${warn}</div>
            <div style="color:var(--text-dim);font-size:12px;">${b.n} pick${b.n>1?'s':''} · ${topSportLbl}</div>
            <div style="color:var(--text);text-align:right;font-variant-numeric:tabular-nums;">${wr.toFixed(0)}%<span style="font-size:10px;color:var(--text-dim2);margin-left:3px;">WR</span></div>
            <div style="color:${roiColor};text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">${b.pl>=0?'+':''}${b.pl.toFixed(2)}u</div>
            <div style="color:${roiColor};text-align:right;font-weight:700;font-variant-numeric:tabular-nums;">${roiT>=0?'+':''}${roiT.toFixed(0)}%</div>
          </div>`;
      }).join('');
      // Comparaison au modèle : est-ce qu'un tipster bat-il le modèle ?
      const modelROI = model.bets ? (100 * model.pl / model.bets) : 0;
      const beatModel = tipsterEntries.filter(b => (100*b.pl/b.n) > modelROI).length;
      return `
        <div style="background:var(--surface,#111827);border:1px solid var(--border,#2a3744);border-radius:10px;overflow:hidden;">
          <div style="display:grid;grid-template-columns:28px 1fr 90px 90px 80px 90px;gap:8px;padding:10px 12px;font-size:11px;color:var(--text-dim2,#7b8693);font-weight:600;text-transform:uppercase;letter-spacing:.5px;">
            <div style="text-align:center;">#</div>
            <div>Pronostiqueur</div>
            <div>Paris</div>
            <div style="text-align:right;">% Gagnés</div>
            <div style="text-align:right;">Gains/Pertes</div>
            <div style="text-align:right;">Rentab.</div>
          </div>
          ${rowsH}
          <div style="padding:9px 12px;font-size:11px;color:var(--text-dim2);border-top:1px solid var(--border,#2a3744);background:var(--bg-3,#0f1823);">
            ${tipsterEntries.length >= 2 ? `<span style="color:${winnerROI>0?'#34d399':'var(--text-dim)'};">🏆 Meilleur</span> : ${esc(tipsterEntries[0].name)} (${winnerROI>=0?'+':''}${winnerROI.toFixed(0)}%)` : ''}
            ${tipsterEntries.length >= 3 && loserROI <= -3 ? ` · <span style="color:#f87171;">⚠️ Fuir</span> : ${esc(tipsterEntries[tipsterEntries.length-1].name)} (${loserROI.toFixed(0)}%)` : ''}
            ${model.bets >= 10 ? ` · <span style="color:var(--text-dim);">vs modèle (${modelROI>=0?'+':''}${modelROI.toFixed(0)}%)</span> : <b style="color:${beatModel>0?'#fbbf24':'var(--text-dim)'};">${beatModel}</b>/${tipsterEntries.length} tipster${tipsterEntries.length>1?'s':''} font mieux` : ''}
          </div>
        </div>`;
    })() : '';
    const tipstersSectionHtml = tipsterEntries.length ? `
      <div class="bilan-section">
        <div class="bilan-section-head">
          <h3>👥 Performance des pronostiqueurs</h3>
          <div class="meta">${tipsterTotalN} prono${tipsterTotalN>1?'s':''} évalué${tipsterTotalN>1?'s':''} · ${tipsterEntries.length} source${tipsterEntries.length>1?'s':''} qualifiée${tipsterEntries.length>1?'s':''} (min 3 paris)</div>
        </div>
        ${tipstersHtml}
      </div>` : '';

    // Model history rows — paginated. _bilanHistLimits kept on module scope
    // so pressing "Voir plus" persists across re-renders until data.js changes.
    // NB: post-refonte (2026-04-20) the bilan no longer has a perso tab, so
    // we only track one limit key ("modele"). The old "perso" key is left
    // defined but unused; keeping the shape stable avoids localStorage churn.
    if (typeof _bilanHistLimits === 'undefined') _bilanHistLimits = { perso: 40, modele: 40 };
    const modeleTotal = rows.length;
    const modeleLimit = Math.min(_bilanHistLimits.modele, modeleTotal);
    const modelRowsHtml = rows.slice().reverse().slice(0, modeleLimit).map(r => {
      const { home, away } = getSides(r.m);
      const cls = r.res === 'won' ? 'style="color:#34d399;font-weight:600;"' : 'style="color:#f87171;"';
      return `<tr>
        <td style="color:var(--text-dim);font-size:12px;">${esc(fmtDate(isoDate(r.m.date)))}</td>
        <td>${esc((home?.short||home?.name||''))} <span style="color:var(--text-dim2);">vs</span> ${esc((away?.short||away?.name||''))}</td>
        <td style="color:var(--text-dim);font-size:12px;"><span aria-hidden="true" style="margin-right:4px;">${sportIcon(r.m.sport)}</span>${esc(sportLabel(r.m.sport))}</td>
        <td ${cls}>${esc(r.pred.pick.label)}</td>
        <td style="text-align:right;font-variant-numeric:tabular-nums;">@${r.odd.toFixed(2)}</td>
        <td style="text-align:right;font-weight:700;color:${r.res==='won'?'#34d399':'#f87171'};">${r.res==='won'?'✓ +'+(r.odd-1).toFixed(2):'✗ −1.00'}</td>
      </tr>`;
    }).join('');

    // Chantier WW — Time-window filter toolbar with smart disable logic
    const winLabel = (_bilanWindow === 0) ? 'Tout' : `${_bilanWindow} derniers jours`;

    // Compute daysOfDataAvailable from earliest settled pick
    let daysOfDataAvailable = 0;
    if (rows.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const earliest = new Date(Math.min(...rows.map(r => new Date(r.m.date).getTime())));
      earliest.setHours(0, 0, 0, 0);
      daysOfDataAvailable = Math.floor((today - earliest) / (1000 * 60 * 60 * 24));
    }

    const windowToolbarHtml = `
      <div class="bilan-window-toolbar" aria-label="Fenêtre temporelle">
        <span class="win-lbl">Fenêtre :</span>
        ${[
          [7, '7j'], [30, '30j'], [90, '90j'], [0, 'Tout'],
        ].map(([v, lbl]) => {
          const isDisabled = v > 0 && v > daysOfDataAvailable;
          const daysNeeded = v - daysOfDataAvailable;
          const disabledAttr = isDisabled ? 'disabled' : '';
          const tooltip = isDisabled ? `Dispo dans ${daysNeeded} jour${daysNeeded>1?'s':''}` : '';
          return `<button class="bilan-win-btn${_bilanWindow===v?' active':''}" data-win="${v}" ${disabledAttr} title="${tooltip}" style="${isDisabled ? 'opacity:.5;cursor:not-allowed;' : ''}">${lbl}</button>`;
        }).join('')}
        <button id="bilan-compare-toggle" class="bilan-win-btn${_bilanCompareMode ? ' active' : ''}" title="${_bilanCompareMode ? 'Désactiver la comparaison multi-fenêtres' : 'Superposer 7j/30j/90j sur le même chart'}" style="margin-left:8px;border-color:${_bilanCompareMode ? 'var(--brand)' : 'var(--border)'};">📊 Comparer</button>
        <span class="win-hint">${rows.length} pari${rows.length>1?'s':''} sur ${winLabel.toLowerCase()}</span>
      </div>
    `;

    // Buckets de confiance — with Wilson 95% CI on WR so small-sample noise
    // is visible. A "High" bucket with 5/6 (83%) looks identical to 50/60 (83%)
    // at first glance; Wilson makes the difference undeniable.
    const renderBucket = (lbl, b, color, rangeTxt) => {
      const wr_ = b.bets ? (100*b.w/b.bets) : 0;
      const roi_ = b.bets ? (100*b.pl/b.bets) : 0;
      const ci = wilsonCI(b.w, b.bets);
      const ciWidth = (ci.high - ci.low) * 100;
      const tooNarrow = b.bets < 10;
      const ciText = b.bets >= 3
        ? `<div style="font-size:10px;color:var(--text-dim2);margin-top:4px;font-weight:500;">
             IC 95% WR: ${(ci.low*100).toFixed(0)}–${(ci.high*100).toFixed(0)}%
             ${tooNarrow ? ' <span style="color:#fbbf24;">⚠️ peu fiable</span>' : ''}
           </div>`
        : '';
      return `<div class="bilan-sport-card" style="border-color:${color}55;">
        <div class="sport-name" style="color:${color};">${lbl} <span style="color:var(--text-dim2);font-weight:500;">· ${rangeTxt}</span></div>
        <div class="sport-wr">${b.bets ? wr_.toFixed(0)+'%' : '—'} <span style="font-size:11px;color:var(--text-dim2);font-weight:500;letter-spacing:0;">WR</span></div>
        <div class="sport-roi" style="color:${roi_>=0?'#34d399':'#f87171'};">Rentabilité ${roi_>=0?'+':''}${roi_.toFixed(0)}% · ${b.bets} paris</div>
        ${ciText}
      </div>`;
    };
    // Extra line for draws — surfaces the category user asked us to watch.
    const drawsCardHtml = drawsBucket.bets > 0
      ? renderBucket('🤝 Match nul (N)', drawsBucket, '#60a5fa', 'foot uniquement')
      : '';
    const bucketsHtml = `
      ${renderBucket('🔒 High', bucket.high, '#34d399', '≥ 65%')}
      ${renderBucket('⚖️ Mid', bucket.mid, '#a78bfa', '55–65%')}
      ${renderBucket('🎲 Low', bucket.low, '#fbbf24', '50–55%')}
      ${drawsCardHtml}
    `;

    // Chantier CCCC — Bilan narratif IA (coach direct)
    const narrativeHtml = (() => {
      try {
        const body = buildBilanNarrative(rows, perSport, { start: WALLET_START, cur: walletNow });
        if (!body) return '';
        return `
          <div class="bilan-coach-card" style="margin-top:12px;padding:16px 18px;background:var(--panel);border:1px solid var(--border);border-left:3px solid var(--brand);border-radius:12px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
              <span style="font-size:18px;">🤖</span>
              <h3 style="margin:0;font-size:14px;letter-spacing:.4px;text-transform:uppercase;color:var(--text-dim);font-weight:700;">Coach IA — résumé du bilan</h3>
            </div>
            <div style="font-size:14px;line-height:1.55;color:var(--text,#e6ebf2);">${body}</div>
          </div>`;
      } catch (e) { console.warn('[CCCC] narrative failed', e); return ''; }
    })();

    // ========= BUILD HTML =========
    // Refonte 2026-04-20 : bilan modèle pur. Plus de bankroll/perso/tipsters —
    // tout ça vit ailleurs (sidebar + carte matchs). Ici, un seul message :
    // "est-ce que le modèle gagne de l'argent en pariant flat 1u ?"
    const _modelRoi = model.bets ? roi : null;

    // v30 — "Comment fonctionne le modèle" : section pédagogique en bas
    // de la page Bilan. L'utilisateur a demandé "tu ajouteras des
    // explications du modèle sur le site dans son bilan en version qui
    // explique tout". On expose les 13+ signaux que predictMatch
    // utilise réellement, leur poids, leur sport, et un mini-glossaire.
    const _modelSignals = [
      { icon: '📊', name: 'Marché (cotes implicites)',
        sport: 'Tous',
        weight: 'Pondération 0.50 dans le mix probabiliste — sert de baseline calibrée par les bookmakers, mais EXCLU du calcul de fiabilité (sinon on se contenterait de copier le marché).',
        what: 'On prend les cotes 1n2 (Winamax prioritaire, sinon ESPN/TennisExplorer/BetExplorer), on enlève la marge bookmaker, et on convertit en probabilités.' },
      { icon: '⚽', name: 'Buts attendus (Poisson)',
        sport: 'Football',
        weight: 'Pondération 0.50 — composante principale du modèle foot.',
        what: 'Modèle Poisson basé sur les buts marqués/encaissés moyens des deux équipes (forme L5 + saison) ajustés par avantage domicile (×1.25). Donne aussi xG → marchés OU 2.5 et BTTS.' },
      { icon: '💪', name: 'Force ELO (ClubElo)',
        sport: 'Football',
        weight: 'Pondération 0.30 — signal indépendant des cotes.',
        what: 'Ratings Elo dynamiques de api.clubelo.com, ajustés d\'un home advantage de 65 points. La proba de nul décroît avec |elo_diff|. Particulièrement utile sur les matchs déséquilibrés où le marché peut être lent.' },
      { icon: '🏠', name: 'Domicile / Extérieur (split)',
        sport: 'Basket / Hockey',
        weight: 'Pondération 0.30 — fondation des sports US.',
        what: 'Records home/road séparés (15-3 à domicile vs 8-10 dehors). Avec home advantage de ×1.12 (basket) ou ×1.08 (hockey) si on n\'a pas le split.' },
      { icon: '📈', name: 'Bilan saison',
        sport: 'Tous',
        weight: 'Pondération 0.30.',
        what: 'Win rate sur l\'ensemble de la saison (V + N×0.5) / matchs. Signal stable mais lent.' },
      { icon: '🏆', name: 'Classement ATP/WTA',
        sport: 'Tennis',
        weight: 'Pondération 0.40 — seul signal non-marché en tennis.',
        what: 'Log-ratio des rangs : #1 vs #50 ≈ 80% favorite, #20 vs #100 ≈ 68%, rangs identiques ≈ coin-flip.' },
      { icon: '⚔️', name: 'Face-à-face',
        sport: 'Tous',
        weight: 'Pondération 0.25.',
        what: '3 à 5 dernières confrontations entre les deux équipes. Plus c\'est récent, plus ça compte. Stable au-delà de 2 meetings.' },
      { icon: '🔥', name: 'Forme L5 (avec décay)',
        sport: 'Tous',
        weight: 'Nudge ±5%.',
        what: '5 derniers résultats avec poids exponentiel : le dernier match compte ~2.5× le 5e plus ancien. Une équipe qui scrape 5 wins anciens passe APRÈS une qui aligne 3 wins frais.' },
      { icon: '📈', name: 'Momentum L3 vs L5 (v30)',
        sport: 'Tous',
        weight: 'Nudge ±3% (capté).',
        what: 'Direction sur le niveau : une équipe LLLLW qui prend WWW est sur une autre trajectoire qu\'une équipe WWWWW qui prend LLL. Stacke avec le formScore.' },
      { icon: '⚽', name: 'Différentiel buts L5',
        sport: 'Football',
        weight: 'Nudge ±4%.',
        what: 'Marge moyenne (buts marqués − encaissés) sur 5 matchs. Une équipe qui scrape 5 wins 1-0 vs une qui marque 3 par match : pas le même profil.' },
      { icon: '🛡️', name: 'Profil défense / attaque (v30)',
        sport: 'Football',
        weight: 'Scale lamH/lamA jusqu\'à -15%.',
        what: 'Clean sheets et failed_to_score sur L5. ≥60% clean sheets shrinke l\'xG adverse de 12% ; ≥60% matchs muets shrinke l\'xG propre. Affecte O/U 2.5 et BTTS.' },
      { icon: '🥶', name: 'Météo (pluie / vent / froid v30)',
        sport: 'Football',
        weight: 'Scale Poisson jusqu\'à -12%.',
        what: 'Pluie >1mm/h, vent >20 km/h, ou température <5°C dépriment l\'xG total. Trois axes empilables, dominante reportée.' },
      { icon: '🟨', name: 'Profil arbitre (jaunes + rouges v30)',
        sport: 'Football',
        weight: 'Nudge ±0.03 sur xG (yellows) + ±0.04 (reds).',
        what: 'Yellows hors [3.0–4.5]/match → strict ou laxiste, ajuste lamH/lamA. Rouges >0.10/match (≈1 rouge tous les 10 matchs) coupent encore le total. Indépendants l\'un de l\'autre.' },
      { icon: '🏥', name: 'Blessures sévères',
        sport: 'Football / Basket / Hockey',
        weight: 'Nudge ±1.5% par absence, cap 6%.',
        what: 'Sofascore (top-5 ligues foot) + ESPN (NBA/NHL/NFL/MLB). Down-weight si seul un côté est connu pour ne pas traiter "pas de data" comme "pas d\'absent".' },
      { icon: '📋', name: 'Compositions confirmées (v30)',
        sport: 'Football',
        weight: 'Boost reliability ±2.5pp.',
        what: 'Compos confirmées (≈30 min avant kick-off) résolvent l\'ambiguïté rotation/joueur clé : +2.5pp si les deux côtés, +1.2pp si un seul, -1pp si tout est en mode "predicted".' },
      { icon: '🏃', name: 'Charge de matchs (7j)',
        sport: 'Football',
        weight: 'Nudge ±4%.',
        what: '≥3 matchs en 7 jours = fatigue documentée → -1.5% par match au-delà du baseline 1/semaine. Fonctionne sans nouveau fetch (calculé sur le calendrier data.js).' },
    ];
    const _signalCardHtml = (s) => `
      <div style="padding:14px 16px;background:var(--panel);border:1px solid var(--border);border-radius:10px;display:flex;flex-direction:column;gap:6px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;">
          <div style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--text);"><span style="font-size:18px;">${s.icon}</span>${esc(s.name)}</div>
          <div style="font-size:10.5px;color:var(--brand);background:rgba(167,139,250,.10);padding:3px 8px;border-radius:4px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;white-space:nowrap;">${esc(s.sport)}</div>
        </div>
        <div style="font-size:11.5px;color:var(--text-dim2,#7b8693);font-weight:600;">${esc(s.weight)}</div>
        <div style="font-size:12.5px;color:var(--text-dim);line-height:1.5;">${esc(s.what)}</div>
      </div>`;
    const _modelExplainerHtml = `
      <section class="bilan-section" id="model-explainer" style="margin-top:32px;padding-top:24px;border-top:1px solid var(--border);">
        <div class="bilan-section-head">
          <h3>🧠 Comment fonctionne le modèle</h3>
          <div class="meta">${_modelSignals.length} signaux actifs</div>
        </div>
        <div style="font-size:13.5px;color:var(--text-dim);line-height:1.6;max-width:820px;margin:0 0 18px;">
          Le modèle <code style="background:rgba(255,255,255,.04);padding:1px 6px;border-radius:4px;">predictMatch</code> combine plusieurs signaux pour produire une probabilité par issue (1, N, 2). Chaque signal a un <strong>poids</strong> dans le mix, et la cohérence inter-signaux contribue à la <strong>fiabilité</strong> finale (qui est ensuite calibrée sur l'historique réel — voir section au-dessus). Les cotes du marché alimentent la prédiction (sinon les sports sans signal non-marché disparaîtraient) mais sont <em>exclues</em> du calcul de fiabilité — un pari fiable, c'est un pari où plusieurs signaux <em>indépendants</em> du marché sont d'accord.
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin-bottom:24px;">
          ${_modelSignals.map(_signalCardHtml).join('')}
        </div>

        <div class="bilan-section-head" style="margin-top:24px;">
          <h3>🎚️ Pourquoi parle-t-on de "fiabilité" et pas juste de "probabilité" ?</h3>
        </div>
        <div style="font-size:13.5px;color:var(--text-dim);line-height:1.6;max-width:820px;margin:0 0 12px;">
          La <strong>probabilité</strong> brute du pick (ex : 65%) est ce que le mix pondéré produit. La <strong>fiabilité</strong> (ex : 60%) est cette proba <em>recalibrée</em> sur l'historique : si le modèle disait 65% mais qu'historiquement on n'a gagné qu'à 60% à ce niveau, on affiche 60% — pour pas te vendre du rêve. Cette calibration tourne en continu (voir le diagramme plus haut). Sur les 5 paris d'un même bucket, on attend que la fiabilité affichée corresponde à la win rate observée.
        </div>
        <div style="font-size:13.5px;color:var(--text-dim);line-height:1.6;max-width:820px;margin:0 0 24px;">
          Trois autres facteurs pénalisent ou récompensent la fiabilité brute :
          <ul style="margin:8px 0 0;padding-left:24px;">
            <li><strong>Consensus</strong> entre signaux : si 4 signaux disent 65% mais le 5e dit 30%, l'écart-type pénalise la fiabilité.</li>
            <li><strong>Richesse</strong> : un pick avec 4 signaux non-marché actifs est plus fiable qu'un pick avec 2 (saturation à 4).</li>
            <li><strong>Compositions confirmées</strong> (foot v30) : +2.5pp si les deux compos sont confirmées, ±0 sinon, -1pp si tout est en "predicted".</li>
          </ul>
        </div>

        <div class="bilan-section-head" style="margin-top:24px;">
          <h3>📚 Glossaire express</h3>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px;font-size:12.5px;line-height:1.5;color:var(--text-dim);">
          <div style="padding:10px 12px;background:var(--panel);border:1px solid var(--border);border-radius:8px;"><strong style="color:var(--text);">ROI flat 1u</strong> : profit/perte si on mise 1 unité fixe sur chaque pari du modèle. Pas de Kelly, pas de progressive — juste 1u sec.</div>
          <div style="padding:10px 12px;background:var(--panel);border:1px solid var(--border);border-radius:8px;"><strong style="color:var(--text);">Brier score</strong> : moyenne du carré des écarts entre proba prédite et résultat (0 ou 1). Plus c'est bas, mieux c'est. <em>0.18 = bon, 0.25 = moyen, 0.30+ = à revoir.</em></div>
          <div style="padding:10px 12px;background:var(--panel);border:1px solid var(--border);border-radius:8px;"><strong style="color:var(--text);">Edge</strong> : différence entre notre probabilité et la probabilité implicite de la cote. >5pt = value bet potentielle, &lt;0 = on est plus pessimiste que le marché → skip.</div>
          <div style="padding:10px 12px;background:var(--panel);border:1px solid var(--border);border-radius:8px;"><strong style="color:var(--text);">Kelly fractionné (¼)</strong> : formule de mise optimale qui maximise la croissance long-terme sans ruiner sur les bad runs. On utilise ¼ Kelly + cap à 10% de la cagnotte = sécurité supplémentaire.</div>
          <div style="padding:10px 12px;background:var(--panel);border:1px solid var(--border);border-radius:8px;"><strong style="color:var(--text);">Lock</strong> : pari à fiabilité ≥70%, censé tomber ≥80% des fois (cible). C'est là que la mise est la plus grosse en Kelly.</div>
          <div style="padding:10px 12px;background:var(--panel);border:1px solid var(--border);border-radius:8px;"><strong style="color:var(--text);">Skip</strong> : pari avec moins de 2 signaux non-marché OU fiabilité &lt;45%. On ne le surface pas.</div>
        </div>
      </section>`;
    // v30 — Epoch banner. On 2026-04-26 we shipped the Winamax 1n2
    // alignment fix (commit b6b8e1b) which corrected odds on 65 events
    // that had been priced at the wrong side. The model's historical
    // bilan before that date is partially contaminated — every pick
    // taken on those events used inverted odds. Surface this honestly
    // so Théo doesn't read pre-epoch ROI as a clean comparable.
    const ALIGNMENT_EPOCH_ISO = '2026-04-26';
    let preEpochCount = 0;
    try {
      Object.values(window.PRONOSTICS_DATA?.days || {}).forEach(arr => {
        (arr || []).forEach(m => {
          if (m.completed && (m.date || '').slice(0, 10) < ALIGNMENT_EPOCH_ISO) {
            preEpochCount++;
          }
        });
      });
    } catch (e) {}
    const epochBannerHtml = preEpochCount > 0 ? `
      <div style="margin:12px auto 18px;padding:10px 14px;max-width:1280px;background:rgba(234,179,8,.08);border:1px solid rgba(234,179,8,.25);border-left:3px solid var(--warn,#eab308);border-radius:0 8px 8px 0;font-size:12.5px;color:var(--text-dim);line-height:1.45;">
        <strong style="color:var(--text);">⚠️ Epoch ${ALIGNMENT_EPOCH_ISO}</strong> — Avant cette date, l'alignement des cotes Winamax 1n2 inversait home/away sur ~65 events (tennis, basket, hockey, foot). Les paris pris avant le ${ALIGNMENT_EPOCH_ISO} ont une part de phantom edge dans le bilan rétro. À partir de ce jour, c'est propre. <a href="#credibilite" style="color:var(--accent);">Détails →</a>
      </div>
    ` : '';
    wrap.innerHTML = `
      <div style="max-width:1280px;margin:0 auto;padding:4px 0 0;font-variant-numeric:tabular-nums;">
        <div style="margin-bottom:24px;padding:32px 0 20px;border-bottom:1px solid var(--border);position:relative;">
          <div style="position:absolute;top:0;left:0;width:40px;height:3px;background:${_modelRoi == null ? 'var(--text-dim)' : _modelRoi >= 0 ? 'var(--accent)' : 'var(--danger)'};border-radius:0 0 2px 2px;"></div>
          <div style="font-size:11px;color:${_modelRoi == null ? 'var(--text-dim)' : _modelRoi >= 0 ? 'var(--accent)' : 'var(--danger)'};text-transform:uppercase;letter-spacing:1.4px;font-weight:700;margin-bottom:6px;">Performance du modèle · ${model.bets || 0} pari${(model.bets||0)>1?'s':''}</div>
          <h1 style="margin:0 0 6px;font-size:40px;font-weight:800;letter-spacing:-1.4px;color:var(--text);line-height:1;">Bilan${_bilanSport ? ` · <span style="font-size:18px;font-weight:600;color:var(--brand);letter-spacing:-.3px;">${sportIcon(_bilanSport)} ${esc(sportLabel(_bilanSport))}</span>` : ''}</h1>
          <div style="font-size:14px;color:var(--text-dim);max-width:700px;">${_bilanSport ? `Drill-down <strong style="color:var(--text);">${esc(sportLabel(_bilanSport))}</strong> — toutes les stats ci-dessous sont filtrées sur ce sport uniquement.` : `Le modèle gagne-t-il de l'argent en mise fixe ? Courbe, rentabilité, risque et comparaison sport par sport.`}</div>
        </div>
      </div>
      ${epochBannerHtml}

      <!-- v26.5 — SPORT FILTER PILLS (drill-down) -->
      ${_sportFilterHtml}

      <!-- TIME-WINDOW FILTER -->
      ${windowToolbarHtml}

      <!-- v31.7.8 — Bouton Export CSV du bilan -->
      <div style="max-width:1280px;margin:0 auto 14px;display:flex;justify-content:flex-end;gap:8px;align-items:center;">
        <button id="bilan-export-csv" type="button" style="padding:8px 14px;background:transparent;border:1px solid var(--border-2);color:var(--text-dim);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all .15s ease;">
          ⬇ Export CSV (${rows.length} paris)
        </button>
      </div>

      <!-- CCCC : COACH IA NARRATIVE -->
      ${narrativeHtml}

      <!-- KPI STRIP : modèle uniquement -->
      <div class="bilan-kpis">
        <div class="bilan-kpi brand">
          <div class="kpi-label">Rentabilité du modèle (mise fixe)</div>
          <div class="kpi-value ${roi>=0?'pos':'neg'}">${model.bets ? (roi>=0?'+':'')+roi.toFixed(1)+'%' : '—'}</div>
          <div class="kpi-sub">P&amp;L ${model.pl>=0?'+':''}${model.pl.toFixed(2)}u</div>
        </div>
        <div class="bilan-kpi">
          <div class="kpi-label">Win rate modèle</div>
          <div class="kpi-value">${model.bets ? wr.toFixed(0)+'%' : '—'}</div>
          <div class="kpi-sub">${model.w}W · ${model.l}L</div>
        </div>
        <div class="bilan-kpi">
          <div class="kpi-label">Paris évalués</div>
          <div class="kpi-value">${model.bets}</div>
          <div class="kpi-sub">sur ${completed.length} matchs terminés</div>
        </div>
      </div>

      <!-- MODEL P&L CHART -->
      <div class="bilan-section">
        <div class="bilan-section-head">
          <h3>📊 P&amp;L modèle (unité flat)</h3>
          <div class="meta">${model.bets} paris évalués</div>
        </div>
        ${modelChartHtml}
      </div>

      <!-- PORTEFEUILLE SIMULÉ 10€ -->
      ${walletSectionHtml}

      <!-- VERDICT MODÈLE -->
      ${(() => {
        // One-glance verdict — no jargon, no streaks, no drawdown.
        let vLbl, vColor, vBg, vDesc;
        if (model.bets < 30) {
          vLbl = '📊 Pas encore assez de recul';
          vColor = '#fbbf24';
          vBg = 'rgba(251,191,36,.10)';
          vDesc = `${model.bets} pick${model.bets>1?'s':''} évalué${model.bets>1?'s':''} · il en faut au moins 30 pour tirer une conclusion fiable.`;
        } else if (model.pl > 0 && roi > 3) {
          vLbl = '✅ Modèle rentable';
          vColor = '#34d399';
          vBg = 'rgba(52,211,153,.10)';
          vDesc = `Sur ${model.bets} picks, le modèle a généré <strong style="color:#34d399;">+${model.pl.toFixed(2)}u</strong>. Tu peux suivre ses recommandations, surtout les High confiance.`;
        } else if (model.pl < 0 && roi < -3) {
          vLbl = '❌ Modèle perdant';
          vColor = '#f87171';
          vBg = 'rgba(248,113,113,.10)';
          vDesc = `Sur ${model.bets} picks, le modèle a perdu <strong style="color:#f87171;">${model.pl.toFixed(2)}u</strong>. À ce stade, éviter de le suivre aveuglément.`;
        } else {
          vLbl = '⚖️ Proche du break-even';
          vColor = '#a78bfa';
          vBg = 'rgba(167,139,250,.10)';
          vDesc = `${model.pl>=0?'+':''}${model.pl.toFixed(2)}u sur ${model.bets} picks · ROI ${roi>=0?'+':''}${roi.toFixed(1)}%. Pas assez franc pour conclure, continue d'observer.`;
        }
        return `
          <div class="bilan-section" style="background:${vBg};border-color:${vColor}44;">
            <div class="bilan-section-head">
              <h3 style="color:${vColor};">${vLbl}</h3>
              <div class="meta">${model.bets} picks sur ${completed.length} matchs terminés</div>
            </div>
            <div style="font-size:15px;color:var(--text);line-height:1.6;margin-bottom:18px;">${vDesc}</div>
            <div class="bilan-kpis" style="margin-top:0;">
              <div class="bilan-kpi">
                <div class="kpi-label">P&amp;L cumulé</div>
                <div class="kpi-value ${model.pl>=0?'pos':'neg'}">${model.pl>=0?'+':''}${model.pl.toFixed(2)}u</div>
                <div class="kpi-sub">mise flat 1u par pick</div>
              </div>
              <div class="bilan-kpi">
                <div class="kpi-label">Win rate</div>
                <div class="kpi-value">${model.bets ? wr.toFixed(0)+'%' : '—'}</div>
                <div class="kpi-sub">${model.w}W · ${model.l}L</div>
              </div>
              <div class="bilan-kpi">
                <div class="kpi-label">Rentabilité</div>
                <div class="kpi-value ${roi>=0?'pos':'neg'}">${model.bets ? (roi>=0?'+':'')+roi.toFixed(1)+'%' : '—'}</div>
                <div class="kpi-sub">par pick joué</div>
              </div>
            </div>
          </div>
        `;
      })()}

      <!-- OÙ LE MODÈLE GAGNE : confiance + sport, côte à côte -->
      <div class="bilan-row-2">
        <div class="bilan-section">
          <div class="bilan-section-head">
            <h3>🎯 Par niveau de confiance</h3>
            <div class="meta">Suis les High, évite les Low</div>
          </div>
          <div class="bilan-sports">${bucketsHtml}</div>
        </div>
        <div class="bilan-section">
          <div class="bilan-section-head">
            <h3>🏅 Par sport</h3>
            <div class="meta">Tri par volume</div>
          </div>
          ${perSportHtml
            ? `<div class="bilan-sports">${perSportHtml}</div>`
            : `<div class="bilan-empty">Aucun résultat pour le moment.</div>`}
        </div>
      </div>

      <!-- Chantier O — Par ligue : tableau trié par ROI -->
      ${perLeagueHtml ? `
        <div class="bilan-section">
          <div class="bilan-section-head">
            <h3>🏟️ Par ligue</h3>
            <div class="meta">Tri par ROI · min 3 paris · ${leagueEntries.length} ligue${leagueEntries.length>1?'s':''} qualifiée${leagueEntries.length>1?'s':''}</div>
          </div>
          ${perLeagueHtml}
        </div>
      ` : ''}

      <!-- Chantier OO — Heatmap sport × jour de semaine -->
      ${heatmapHtml}

      <!-- Chantier FF — Tipsters scorecard : WR + ROI par source externe -->
      ${tipstersSectionHtml}

      <!-- CALIBRATION FIABILITÉ : reliability diagram + sparkline MAE persistant -->
      ${reliabilitySectionHtml}

      <!-- v30 — Comment fonctionne le modèle (pédagogique) -->
      ${_modelExplainerHtml}

      <!-- HISTORIQUE MODÈLE -->
      <div class="bilan-section">
        <div class="bilan-section-head">
          <h3>📜 Historique modèle</h3>
          <div class="meta">${rows.length} pari${rows.length>1?'s':''}</div>
        </div>
        ${modelRowsHtml ? `
          <div style="overflow-x:auto;">
            <table class="bilan-table">
              <thead><tr>
                <th>Date</th><th>Match</th><th>Sport</th><th>Pick</th>
                <th style="text-align:right;">Cote</th>
                <th style="text-align:right;">Résultat</th>
              </tr></thead>
              <tbody>${modelRowsHtml}</tbody>
            </table>
          </div>
          ${modeleTotal > modeleLimit ? `
            <div style="text-align:center;margin-top:14px;">
              <button class="bilan-more-btn" data-hist-more="modele">Voir plus (${modeleTotal - modeleLimit} restants)</button>
            </div>
          ` : (modeleLimit > 40 ? `
            <div style="text-align:center;margin-top:14px;">
              <button class="bilan-more-btn ghost" data-hist-less="modele">Réduire</button>
            </div>
          ` : '')}
        ` : `<div class="bilan-empty">Aucun pari du modèle évalué pour le moment.</div>`}
      </div>

      <!-- v30 — Section Winamax importée retirée : Théo n'enregistre pas
           ses paris sur le site (ni manuel, ni import). -->
    `;

    // ========= WIRE INTERACTIONS =========
    // Post-refonte (2026-04-20): only pagination + window filter remain.
    // Bankroll input lives on the sidebar; personal bet mgmt moved elsewhere.

    // "Voir plus" / "Réduire" pagination for historique
    wrap.querySelectorAll('[data-hist-more]').forEach(btn => btn.addEventListener('click', () => {
      const k = btn.dataset.histMore;
      _bilanHistLimits[k] = (_bilanHistLimits[k] || 40) + 40;
      renderBilanPage(wrap);
    }));
    wrap.querySelectorAll('[data-hist-less]').forEach(btn => btn.addEventListener('click', () => {
      const k = btn.dataset.histLess;
      _bilanHistLimits[k] = 40;
      renderBilanPage(wrap);
    }));
    // Time-window filter buttons
    // Chantier WW — bilan window buttons with disable check
    wrap.querySelectorAll('.bilan-win-btn').forEach(btn => btn.addEventListener('click', () => {
      if (btn.disabled) return;
      // v31.7.22 — Le bouton "Comparer" partage la classe .bilan-win-btn pour
      // l'apparence mais a un data-* différent. Skip ici, géré ci-dessous.
      if (btn.id === 'bilan-compare-toggle') return;
      const v = parseInt(btn.dataset.win, 10);
      if (!Number.isFinite(v) || v === _bilanWindow) return;
      _bilanWindow = v;
      try { localStorage.setItem('bilanWindow', String(v)); } catch (e) {}
      renderBilanPage(wrap);
    }));
    // v31.7.22 — Bouton "Comparer" : toggle multi-window superposé.
    const _compareBtn = wrap.querySelector('#bilan-compare-toggle');
    if (_compareBtn) {
      _compareBtn.addEventListener('click', () => {
        _bilanCompareMode = !_bilanCompareMode;
        try { localStorage.setItem('bilanCompareMode', _bilanCompareMode ? '1' : '0'); } catch (e) {}
        renderBilanPage(wrap);
      });
    }
    // Chantier R — toggle horizon table portefeuille
    wrap.querySelectorAll('.wallet-tbl-btn').forEach(btn => btn.addEventListener('click', () => {
      const v = parseInt(btn.dataset.wtw, 10);
      if (!Number.isFinite(v) || v === _walletTableWindow) return;
      _walletTableWindow = v;
      try { localStorage.setItem('walletTableWindow', String(v)); } catch (e) {}
      renderBilanPage(wrap);
    }));
    // Chantier EE — toggle politique de mise (flat / Kelly)
    wrap.querySelectorAll('.wallet-stake-btn').forEach(btn => btn.addEventListener('click', () => {
      const v = btn.dataset.wsm;
      if (!['flat1','flat2','flat5','kelly025','kelly050'].includes(v) || v === _walletStakeMode) return;
      _walletStakeMode = v;
      try { localStorage.setItem('walletStakeMode', v); } catch (e) {}
      renderBilanPage(wrap);
    }));
    // Chantier RR — toggle mode picks (tous / locks seulement)
    wrap.querySelectorAll('.wallet-picks-mode-btn').forEach(btn => btn.addEventListener('click', () => {
      const v = btn.dataset.wpm;
      if (!['all','locks'].includes(v) || v === _walletPicksMode) return;
      _walletPicksMode = v;
      try { localStorage.setItem('walletPicksMode', v); } catch (e) {}
      renderBilanPage(wrap);
    }));
    // Chantier JJ — backtest what-if : banque de départ
    wrap.querySelectorAll('.wallet-bt-start').forEach(inp => {
      const commit = () => {
        let v = parseFloat(inp.value);
        if (!isFinite(v)) v = 10;
        v = Math.max(10, Math.min(10000, Math.round(v)));
        if (v === _walletBacktestStart) return;
        _walletBacktestStart = v;
        try { localStorage.setItem('walletBacktestStart', String(v)); } catch (e) {}
        renderBilanPage(wrap);
      };
      inp.addEventListener('change', commit);
      inp.addEventListener('blur', commit);
    });
    // Chantier JJ — backtest what-if : date de départ
    wrap.querySelectorAll('.wallet-bt-date').forEach(inp => {
      inp.addEventListener('change', () => {
        const v = inp.value;
        const next = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
        if (next === _walletBacktestDate) return;
        _walletBacktestDate = next;
        try {
          if (next) localStorage.setItem('walletBacktestDate', next);
          else localStorage.removeItem('walletBacktestDate');
        } catch (e) {}
        renderBilanPage(wrap);
      });
    });
    // Chantier JJ — backtest what-if : reset
    wrap.querySelectorAll('.wallet-bt-reset').forEach(btn => btn.addEventListener('click', () => {
      if (btn.disabled) return;
      if (_walletBacktestStart === 10 && !_walletBacktestDate) return;
      _walletBacktestStart = 10;
      _walletBacktestDate = null;
      try {
        localStorage.removeItem('walletBacktestStart');
        localStorage.removeItem('walletBacktestDate');
      } catch (e) {}
      renderBilanPage(wrap);
    }));
    // Chantier O — click handler sur les lignes "Par ligue" pour drill-down
    wrap.querySelectorAll('[data-league-row]').forEach(row => {
      row.addEventListener('click', () => {
        row.classList.toggle('expanded');
      });
    });
    // v26.5 — Sport filter pills (drill-down)
    wrap.querySelectorAll('.bilan-sport-btn').forEach(btn => btn.addEventListener('click', () => {
      const sp = btn.dataset.sport || null;
      if (sp === _bilanSport) return;
      _bilanSport = sp;
      try {
        if (sp) localStorage.setItem('bilanSport', sp);
        else localStorage.removeItem('bilanSport');
      } catch (e) {}
      renderBilanPage(wrap);
    }));
    // v26.5 — Per-sport cards clickable : click = filter Bilan to that sport
    wrap.querySelectorAll('.bilan-sport-card[data-sport]').forEach(card => card.addEventListener('click', () => {
      const sp = card.dataset.sport;
      if (!sp || sp === _bilanSport) return;
      _bilanSport = sp;
      try { localStorage.setItem('bilanSport', sp); } catch (e) {}
      renderBilanPage(wrap);
      // Scroll to top so user sees the new filter applied
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }));
    // v31.7.8 — Export CSV du bilan (rows actuel = filtre window+sport)
    const exportBtn = wrap.querySelector('#bilan-export-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        // CSV header
        const lines = ['date,sport,league,home,away,pick,odd,confidence,result,pl_units'];
        rows.forEach(r => {
          const sides = (typeof getSides === 'function') ? getSides(r.m) : { home: {}, away: {} };
          const homeName = (sides.home?.name || '?').replace(/[",\n]/g, ' ').slice(0, 60);
          const awayName = (sides.away?.name || '?').replace(/[",\n]/g, ' ').slice(0, 60);
          const date = (r.m.date || '').slice(0, 10);
          const league = (r.m.league_name || '').replace(/[",\n]/g, ' ');
          const pick = (r.pred.pick?.label || r.pred.pick?.key || '').replace(/[",\n]/g, ' ');
          const conf = ((r.pred.reliability ?? r.pred.pick?.prob ?? 0) * 100).toFixed(1);
          const pl = r.res === 'won' ? (r.odd - 1).toFixed(2) : '-1.00';
          lines.push(`${date},${r.m.sport},"${league}","${homeName}","${awayName}","${pick}",${r.odd.toFixed(2)},${conf},${r.res},${pl}`);
        });
        const csv = lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const sportSuffix = _bilanSport ? `-${_bilanSport}` : '';
        const winSuffix = _bilanWindow > 0 ? `-${_bilanWindow}j` : '';
        a.download = `bilan${sportSuffix}${winSuffix}-${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        try { if (typeof toast === 'function') toast('✓ CSV téléchargé', 'success'); } catch(e){}
      });
    }
  }
  // Pagination state for bilan history (persists across re-renders during session)
  let _bilanHistLimits = { perso: 40, modele: 40 };
  // Time-window filter (days). 0 = tout. Persisted to localStorage.
  let _bilanWindow = (() => {
    const v = parseInt(localStorage.getItem('bilanWindow'), 10);
    return [0, 7, 30, 90].includes(v) ? v : 0;
  })();
  // v31.7.22 — Mode "Comparer fenêtres" : superpose 7j/30j/90j sur le même
  // chart pour visualiser comment la courte/moyenne/longue fenêtre se
  // comportent simultanément. Le toggle est un bool persisté.
  let _bilanCompareMode = (() => {
    return localStorage.getItem('bilanCompareMode') === '1';
  })();
  // v26.5 — Sport filter (drill-down). null = tous les sports. Persisted.
  // Si défini, filtre model/wallet/chart/buckets/histoire à un sport unique.
  let _bilanSport = (() => {
    const v = localStorage.getItem('bilanSport');
    const valid = ['football','basketball','tennis','hockey','american-football','mma','golf','racing','baseball'];
    return v && valid.includes(v) ? v : null;
  })();
  // Chantier R — Horizon d'affichage pour la table Portefeuille 10€
  // (indépendant de _bilanWindow ; ne change pas les KPIs/courbe).
  let _walletTableWindow = (() => {
    const v = parseInt(localStorage.getItem('walletTableWindow'), 10);
    return [0, 7, 30].includes(v) ? v : 30;
  })();
  // Chantier EE — Simulation bankroll : mode de mise du portefeuille simulé.
  // 'flat1' (default legacy) | 'flat2' | 'flat5' | 'kelly025' | 'kelly050'
  // Persisté en localStorage. Le bankroll de départ reste 10€ pour comparabilité.
  let _walletStakeMode = (() => {
    const v = localStorage.getItem('walletStakeMode');
    return ['flat1','flat2','flat5','kelly025','kelly050'].includes(v) ? v : 'flat1';
  })();
  // Chantier JJ — Backtest what-if : bankroll de départ + date de départ
  // customisables. Permet de simuler "et si j'avais commencé avec X€ le Y ?"
  // Bankroll : clamp 10-10000€. Date : ISO YYYY-MM-DD ou null (= premier lock).
  let _walletBacktestStart = (() => {
    const v = parseFloat(localStorage.getItem('walletBacktestStart'));
    if (!isFinite(v) || v < 10 || v > 10000) return 10;
    return v;
  })();
  let _walletBacktestDate = (() => {
    const v = localStorage.getItem('walletBacktestDate');
    if (!v) return null;
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  })();
  // Chantier RR — Toggle pour afficher tous les picks ou seulement les locks
  // dans le portefeuille simulé. 'all' | 'locks'. Default 'all'.
  let _walletPicksMode = (() => {
    const v = localStorage.getItem('walletPicksMode');
    return ['all','locks'].includes(v) ? v : 'all';
  })();
  function walletStakeLabel(mode) {
    return ({
      flat1:     '1€ flat',
      flat2:     '2€ flat',
      flat5:     '5€ flat',
      kelly025:  'Kelly 0.25×',
      kelly050:  'Kelly 0.50×',
    })[mode] || '1€ flat';
  }
  // Étant donné la banque courante et un lock, renvoie la mise à engager.
  // Pour flat : montant fixe (plafonné à la banque si elle est faible).
  // Pour Kelly : fraction × banque courante, plancher à 0.10€ (pour éviter
  // des mises dérisoires sur une banque vidée), plafond 10% de banque.
  function walletStakeFor(mode, runningBank, reliability, odd) {
    switch (mode) {
      case 'flat2':    return Math.min(runningBank, 2);
      case 'flat5':    return Math.min(runningBank, 5);
      case 'kelly025': return Math.max(0.10, runningBank * kellyFraction(reliability, odd, 0.25));
      case 'kelly050': return Math.max(0.10, runningBank * kellyFraction(reliability, odd, 0.50));
      case 'flat1':
      default:         return Math.min(runningBank, 1);
    }
  }

  // Chantier PP — conversion cote américaine → décimale.
  // ML positif : +200 → 1 + 200/100 = 3.00   (payout 2:1)
  // ML négatif : -150 → 1 + 100/150 ≈ 1.667 (payout 0.667:1)
  // Retourne null pour les valeurs invalides afin que getMatchOdds puisse
  // retomber sur l'étage suivant plutôt que de propager un NaN.
  function americanToDecimal(ml) {
    if (ml == null) return null;
    const n = Number(ml);
    if (!isFinite(n) || n === 0) return null;
    if (n > 0) return 1 + (n / 100);
    return 1 + (100 / Math.abs(n));
  }

  // Charge odds_history.jsonl et construit un index {matchId: {home, draw, away}}.
  // Chaque ligne est une capture datée ; on garde la plus récente par match.
  // Silencieux en cas d'échec (réseau, 404, fichier absent) — le bilan restera
  // simplement vide sur les données antérieures au système de snapshots.
  async function loadOddsHistory() {
    try {
      const res = await fetch('odds_history.jsonl', { cache: 'no-store' });
      if (!res.ok) return false;
      const text = await res.text();
      const map = {};
      const latest = {}; // matchId -> captured_at ISO string pour départager
      text.split('\n').forEach(line => {
        line = line.trim();
        if (!line) return;
        let row;
        try { row = JSON.parse(line); } catch (e) { return; }
        if (!row || !row.id) return;
        const id = String(row.id);
        const ts = row.captured_at || '';
        if (latest[id] && ts < latest[id]) return; // garder la plus fraîche
        const home = americanToDecimal(row.homeML);
        const away = americanToDecimal(row.awayML);
        const draw = americanToDecimal(row.drawML);
        if (!home && !away) return;
        map[id] = { home, away, draw };
        latest[id] = ts;
      });
      window.__oddsHistory = map;
      return true;
    } catch (e) {
      return false;
    }
  }

  // v30 — Inject up to 5 SportsEvent JSON-LD schemas for today's top matches
  // so Google can index them as rich snippets (sport, teams, kickoff, venue).
  // Runs once at boot from PRONOSTICS_DATA — keeps DOM lean by capping at 5.
  function _injectMatchSchemas() {
    try {
      const data = window.PRONOSTICS_DATA;
      if (!data || !data.days) return;
      const today = data.days[data.today] || [];
      const upcoming = today
        .filter(m => m && !m.completed && m.winamax && m.winamax.available === true && m.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);
      if (!upcoming.length) return;
      const sportMap = {
        football: 'Soccer', tennis: 'Tennis', basketball: 'Basketball',
        hockey: 'IceHockey', baseball: 'Baseball', mma: 'MartialArt',
        'american-football': 'AmericanFootball', rugby: 'Rugby', golf: 'Golf',
      };
      upcoming.forEach(m => {
        // Prefer the home_away tag for SEO competitor labels — sending
        // wrong team-side metadata to Google for events where ESPN
        // ordering doesn't match home/away (US sports, tennis) was
        // sending an inverted "Home plays Away" signal.
        const home = (m.competitors || []).find(c => c.home_away === 'home') || (m.competitors && m.competitors[0]) || {};
        const away = (m.competitors || []).find(c => c.home_away === 'away') || (m.competitors && m.competitors[1]) || {};
        const schema = {
          '@context': 'https://schema.org',
          '@type': 'SportsEvent',
          name: m.name || `${home.name || ''} vs ${away.name || ''}`,
          startDate: m.date,
          sport: sportMap[m.sport] || 'SportEvent',
          eventStatus: m.live ? 'https://schema.org/EventInProgress' : 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          competitor: [
            { '@type': 'SportsTeam', name: home.name || 'Home' },
            { '@type': 'SportsTeam', name: away.name || 'Away' },
          ],
        };
        if (m.venue) schema.location = { '@type': 'Place', name: m.venue, address: m.city || '' };
        if (m.league_name) schema.superEvent = { '@type': 'SportsEvent', name: m.league_name };
        const tag = document.createElement('script');
        tag.type = 'application/ld+json';
        tag.textContent = JSON.stringify(schema);
        document.head.appendChild(tag);
      });
    } catch(e) { /* silent — never break boot for SEO */ }
  }
  // Defer to idle so it doesn't compete with first paint
  if ('requestIdleCallback' in window) {
    requestIdleCallback(_injectMatchSchemas, { timeout: 3000 });
  } else {
    setTimeout(_injectMatchSchemas, 1500);
  }

  // v31 — Analytics opt-in (privacy-first), désactivé par défaut.
  //
  // Le site est livré SANS tracker. Pour activer une mesure d'audience
  // anonyme (≠ Google Analytics), Théo peut configurer l'une de ces
  // deux options dans `analytics.config.js` (à créer au root) :
  //
  //   window.ANALYTICS_PLAUSIBLE_DOMAIN = "paris-sportif.example";  // Plausible cloud
  //   // OU
  //   window.ANALYTICS_CLOUDFLARE_TOKEN = "abc123...";              // Cloudflare Web Analytics
  //
  // Plausible : https://plausible.io  — privacy-first, pas de cookies, pas de PII.
  // Cloudflare Web Analytics : https://www.cloudflare.com/web-analytics/  — gratuit, RUM.
  //
  // Le script tiers n'est INJECTÉ QU'APRÈS le consentement explicite
  // (clic "Accepter" dans la bannière). Au refus, rien ne charge.
  // Conforme aux règles CNIL sur les traceurs.
  // v31 — Plan d'événements (audit ChatGPT 2026-04-26 #2). Liste des events
  // que le site tracker SI un provider analytics est activé. Tant qu'aucun
  // n'est configuré, psEvent() est un no-op silencieux. Quand Plausible
  // est wired, les events partent automatiquement via window.plausible(...).
  // Cette approche garantit qu'on ne perd pas l'instrumentation entre
  // l'activation et la désactivation (audit / opt-out).
  //
  // Schéma des events :
  //   view_prono             — match modal/card opened
  //   click_prono_card       — top pick / value pick clicked
  //   click_methodology      — link to /methodologie.html
  //   click_backtest         — link to /backtest.html or #backtest
  //   click_academie         — link to /academie.html
  //   newsletter_submit      — (pas d'inscription mail aujourd'hui)
  //   click_bookmaker_outbound — clic vers winamax.fr
  //   scroll_75              — scroll 75% de la page
  //   consent_accept         — bandeau RGPD accepté
  //   consent_refuse         — bandeau RGPD refusé
  window.psEvent = function(name, props) {
    try {
      if (typeof window.plausible === 'function') {
        window.plausible(name, props ? { props: props } : undefined);
      } else if (typeof window.dataLayer !== 'undefined') {
        window.dataLayer.push({ event: name, ...(props || {}) });
      }
      // Sinon : no-op silencieux (analytics non configurés).
    } catch (e) { /* never let tracking break the page */ }
  };

  // Délégué global : capter automatiquement les clics outbound vers Winamax
  // + les nav vers les pages éditoriales statiques.
  document.addEventListener('click', function(e) {
    const a = e.target.closest && e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('http') && href.includes('winamax.fr')) {
      window.psEvent('click_bookmaker_outbound', { dest: 'winamax' });
    } else if (href.endsWith('methodologie.html') || href === '#methodologie') {
      window.psEvent('click_methodology');
    } else if (href.endsWith('academie.html') || href === '#academie') {
      window.psEvent('click_academie');
    } else if (href.endsWith('backtest.html') || href === '#backtest') {
      window.psEvent('click_backtest');
    }
  }, { capture: true, passive: true });

  // Scroll 75% — tracé une seule fois par session
  let _scroll75Fired = false;
  window.addEventListener('scroll', function() {
    if (_scroll75Fired) return;
    const h = document.documentElement;
    const pct = (h.scrollTop + h.clientHeight) / (h.scrollHeight || 1);
    if (pct >= 0.75) {
      _scroll75Fired = true;
      window.psEvent('scroll_75');
    }
  }, { passive: true });

  let _analyticsLoaded = false;
  function _maybeEnableAnalytics() {
    if (_analyticsLoaded) return;
    let prefs = {};
    try { prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}'); } catch(e){}
    if (prefs.consentLocalStorage !== 'accepted') return;
    if (window.ANALYTICS_PLAUSIBLE_DOMAIN) {
      const s = document.createElement('script');
      s.defer = true;
      s.dataset.domain = window.ANALYTICS_PLAUSIBLE_DOMAIN;
      s.src = 'https://plausible.io/js/script.js';
      document.head.appendChild(s);
      _analyticsLoaded = true;
      console.log('[analytics] Plausible loaded for', window.ANALYTICS_PLAUSIBLE_DOMAIN);
    } else if (window.ANALYTICS_CLOUDFLARE_TOKEN) {
      const s = document.createElement('script');
      s.defer = true;
      s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
      s.dataset.cfBeacon = JSON.stringify({ token: window.ANALYTICS_CLOUDFLARE_TOKEN });
      document.head.appendChild(s);
      _analyticsLoaded = true;
      console.log('[analytics] Cloudflare Web Analytics loaded');
    }
    // Sinon : aucun analytics configuré, on no-op silencieusement.
  }

  // v30 — Consent RGPD pour localStorage. Affichée tant que l'utilisateur
  // n'a pas explicitement répondu. Auto-accept silencieux si legacy data
  // détectée (compat utilisateurs existants qui avaient des prefs avant).
  function _initConsentBanner() {
    let prefs = {};
    try { prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}'); } catch(e){}
    if (prefs.consentLocalStorage === 'accepted' || prefs.consentLocalStorage === 'declined') return;
    // Legacy detection : si l'utilisateur a déjà des clés persistées, on
    // considère qu'il a tacitement accepté (pas la première fois qu'il vient).
    const legacyKeys = ['userPrefs', 'currentPage', 'bankroll', 'paris_sportif_tracked_bets', 'agentRules'];
    const hasLegacy = legacyKeys.some(k => {
      const v = localStorage.getItem(k);
      return v != null && v !== '' && v !== '{}' && v !== '[]';
    });
    if (hasLegacy) {
      prefs.consentLocalStorage = 'accepted';
      try { localStorage.setItem('userPrefs', JSON.stringify(prefs)); } catch(e){}
      return;
    }
    const banner = document.getElementById('consent-banner');
    if (!banner) return;
    banner.style.display = 'block';
    const set = (val) => {
      try {
        const p = JSON.parse(localStorage.getItem('userPrefs') || '{}');
        p.consentLocalStorage = val;
        p.consentTs = new Date().toISOString();
        localStorage.setItem('userPrefs', JSON.stringify(p));
      } catch(e){}
      banner.style.display = 'none';
    };
    banner.querySelector('#consent-accept')?.addEventListener('click', () => {
      set('accepted');
      _maybeEnableAnalytics();  // v31 : load Plausible/Cloudflare AFTER consent
      if (typeof window.psEvent === 'function') window.psEvent('consent_accept');
    });
    banner.querySelector('#consent-decline')?.addEventListener('click', () => {
      // On garde le flag pour ne pas re-afficher la bannière, mais on
      // enregistre l'intention. Les writes localStorage continuent (on
      // ne wraperait pas tout le code) MAIS on ne charge AUCUN tracker
      // ni script analytics.
      set('declined');
      // Note : on ne fire PAS consent_refuse via window.psEvent ici parce
      // que ça déclencherait Plausible — qui n'est pas chargé puisque l'user
      // a refusé. Si jamais il faut compter les refus, prévoir un endpoint
      // dédié non-personnel (count uniquement).
    });
    banner.querySelector('[data-consent-details]')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window._showConfirm === 'function') {
        window._showConfirm({
          title: '🍪 Détails du stockage local',
          body: 'Le site enregistre dans le <code>localStorage</code> de ton navigateur :<br><br>' +
                '• <strong>Préférences UI</strong> (thème dark/light, niveau débutant/pro, sports favoris)<br>' +
                '• <strong>Cagnotte simulée</strong> + paris suivis manuellement (si tu en ajoutes)<br>' +
                '• <strong>Historique de fiabilité</strong> + règles d\'auto-tuning du modèle<br>' +
                '• <strong>État de navigation</strong> (page courante, filtres)<br><br>' +
                'Aucune donnée ne sort de ton navigateur. Pas de cookies tiers, pas de Google Analytics, pas de pixel de tracking. Tu peux tout effacer en vidant le localStorage de ton navigateur.',
          confirmLabel: 'Compris',
          cancelLabel: ''
        });
      } else {
        alert('Le site stocke uniquement tes préférences (thème, paris suivis, historique modèle) dans ton navigateur. Aucune donnée ne sort.');
      }
    });
  }
  _initConsentBanner();
  // v31 — Si déjà accepté lors d'une visite précédente, activer analytics
  // (uniquement si Théo a configuré PLAUSIBLE_DOMAIN ou CLOUDFLARE_TOKEN).
  _maybeEnableAnalytics();

  window.addEventListener('DOMContentLoaded', () => {
    const data = window.PRONOSTICS_DATA;
    if (!data) {
      const banner = document.getElementById('no-data-banner');
      banner.classList.remove('hidden');
      // v31.2 — Wire retry button. Force reload + cache bypass.
      const retryBtn = document.getElementById('no-data-retry');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          retryBtn.textContent = '⏳ Reconnexion…';
          retryBtn.disabled = true;
          // Bypass cache : reload with random hash so SW network-first refetches
          location.href = location.pathname + '?_retry=' + Date.now();
        });
      }
      return;
    }
    // Chantier Q — purge des matchId vus qui ne figurent plus dans data.js
    gcSeenLocks();
    // Chantier S — enregistrement du service worker pour installabilité PWA.
    // On ignore silencieusement sur navigateurs qui ne supportent pas (Safari
    // en mode privé, vieux Edge, file://). Pas de bloquant.
    // v31 — déféré au-delà du FCP (idle callback + 2s) pour ne pas bloquer
    // le rendu initial. La 1re visite ne profitera pas du cache, mais la 2e
    // si — c'est le bon trade-off pour un dashboard live.
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      const _registerSW = () => navigator.serviceWorker.register('sw.js').catch(() => {});
      if ('requestIdleCallback' in window) {
        requestIdleCallback(_registerSW, { timeout: 5000 });
      } else {
        setTimeout(_registerSW, 2000);
      }
    }
    currentDate = todayISO();
    // v30 — Maintenant que currentDate est set, refresh le label "today-btn".
    if (typeof _refreshDateNavLabel === 'function') _refreshDateNavLabel();
    const keys = Object.keys(data.days || {}).sort();
    if (!keys.includes(currentDate) && keys.length) currentDate = keys[0];
    document.getElementById('date').value = currentDate;
    if (keys.length) {
      document.getElementById('date').min = keys[0];
      document.getElementById('date').max = keys[keys.length - 1];
    }
    // Wire up page-nav buttons via delegation so that .page-btn elements
    // rendered later (inside dashboard/list views, e.g. "Voir tous les
    // combinés →" CTA) also navigate. The topbar buttons rely on this too.
    document.addEventListener('click', (ev) => {
      const btn = ev.target && ev.target.closest && ev.target.closest('.page-btn');
      if (!btn || !btn.dataset || !btn.dataset.page) return;
      currentPage = btn.dataset.page;
      try { localStorage.setItem('currentPage', currentPage); } catch (e) {}
      applyPageView();
      // v30 — ferme le dropdown hub contenant ce page-btn si besoin
      const parentHub = btn.closest('.hub');
      if (parentHub) {
        parentHub.classList.remove('open');
        const hb = parentHub.querySelector('.hub-btn');
        if (hb) hb.setAttribute('aria-expanded', 'false');
      }
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) {}
    });

    // v30 — Hub dropdowns : toggle au clic, ferme au clic extérieur, un seul
    // ouvert à la fois. Sur mobile (drawer ouvert) les .hub-btn sont
    // pointer-events:none → ce handler ne s'exécute pas, les menus sont
    // dépliés en permanence comme sections.
    document.querySelectorAll('nav.topbar-nav .hub .hub-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const hub = btn.closest('.hub');
        if (!hub) return;
        const wasOpen = hub.classList.contains('open');
        document.querySelectorAll('nav.topbar-nav .hub.open').forEach(h => {
          h.classList.remove('open');
          const b2 = h.querySelector('.hub-btn');
          if (b2) b2.setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) {
          hub.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
    document.addEventListener('click', (e) => {
      if (e.target && e.target.closest && e.target.closest('nav.topbar-nav .hub')) return;
      document.querySelectorAll('nav.topbar-nav .hub.open').forEach(h => {
        h.classList.remove('open');
        const b = h.querySelector('.hub-btn');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
    });
    // ====== v30 — Notif toggle + alertes edge ≥10% =====
    // Notification API locale (pas de serveur push). On watch pollData() :
    // chaque refresh data.js, on cherche les picks today/edge≥10% qui n'ont
    // pas encore été notifiés (tracked par match_id en localStorage).
    // L'opt-in se fait via le bouton 🔕/🔔 dans la topbar — premier clic
    // déclenche la requête de permission Notification.requestPermission()
    // qui doit être appelée depuis un user-gesture handler.
    const NOTIF_EDGE_THRESHOLD = 0.10;       // edge ≥10pt = "forte valeur"
    const NOTIF_CONF_THRESHOLD = 0.55;       // garde-fou : ignore les flukes faible conf
    const _notifSyncBtn = () => {
      const btn = document.getElementById('notif-toggle');
      if (!btn) return;
      const enabled = (() => {
        try { return JSON.parse(localStorage.getItem('userPrefs') || '{}').pushNotifs === true; } catch(e) { return false; }
      })();
      const supported = 'Notification' in window;
      const granted = supported && Notification.permission === 'granted';
      const denied = supported && Notification.permission === 'denied';
      if (!supported) {
        btn.textContent = '🔕'; btn.disabled = true;
        btn.title = 'Notifications non supportées par ce navigateur';
        btn.style.opacity = '.4';
        return;
      }
      if (denied) {
        btn.textContent = '🔕'; btn.title = 'Notifications bloquées dans les réglages du navigateur';
        btn.style.opacity = '.5';
        return;
      }
      btn.style.opacity = '';
      btn.disabled = false;
      btn.textContent = enabled && granted ? '🔔' : '🔕';
      btn.title = enabled && granted
        ? 'Notifs actives — clic pour désactiver. Tu seras alerté pour chaque pari edge ≥10%.'
        : 'Notifs : alertes quand un pari edge ≥10% apparaît · clic pour activer';
      btn.setAttribute('aria-label', btn.title);
    };
    // Exposé sur window pour que pollData() (scope IIFE racine) puisse
    // l'appeler après chaque refresh data.js. Avant ce fix, l'appel depuis
    // pollData levait silencieusement ReferenceError → notifs jamais
    // déclenchées sur refresh, seulement à l'opt-in.
    window._maybeNotifyHighEdgePicks = function _maybeNotifyHighEdgePicks() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      let prefs;
      try { prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}'); } catch(e) { return; }
      if (!prefs.pushNotifs) return;
      const data = window.PRONOSTICS_DATA;
      if (!data || !data.days) return;
      const todayIso = new Date().toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' });
      const today = data.days[todayIso] || [];
      const seen = new Set();
      try { (JSON.parse(localStorage.getItem('notifiedPickIds') || '[]') || []).forEach(id => seen.add(id)); } catch(e) {}
      const fresh = [];
      const now = Date.now();
      for (const m of today) {
        if (!m || !m.id || seen.has(String(m.id))) continue;
        if (m.completed || m.live) continue;
        const ko = new Date(m.date).getTime();
        if (!isFinite(ko) || ko < now) continue;        // skip past/started
        if (!(m.winamax && m.winamax.available === true)) continue;
        let pred;
        try { pred = predictMatch(m); } catch(e) { continue; }
        if (!pred || !pred.pick || pred.skip) continue;
        const pk = pred.pick.key;
        const odd = pred.odds && (pk==='1'?pred.odds.home:pk==='2'?pred.odds.away:pred.odds.draw);
        if (!odd) continue;
        const rel = pred.reliability ?? pred.pick.prob;
        const edge = rel - 1/odd;
        if (edge < NOTIF_EDGE_THRESHOLD || rel < NOTIF_CONF_THRESHOLD) continue;
        const { home, away } = (typeof getSides === 'function') ? getSides(m) : { home: {}, away: {} };
        fresh.push({ id: String(m.id), home: (home && home.name) || '?', away: (away && away.name) || '?',
                     edge, rel, odd, label: pred.pick.label || 'Pick' });
      }
      if (!fresh.length) return;
      // Cap : 3 notifs max par batch pour ne pas spam
      fresh.slice(0, 3).forEach(p => {
        try {
          const n = new Notification(`💎 Pari forte valeur : ${p.home} vs ${p.away}`, {
            body: `→ ${p.label} @${p.odd.toFixed(2)} · edge +${Math.round(p.edge*100)}pt · conf ${Math.round(p.rel*100)}%`,
            icon: 'icon-192.png',
            badge: 'icon.svg',
            tag: 'paris-sportif-' + p.id,
          });
          n.onclick = () => { window.focus(); n.close(); };
          seen.add(p.id);
        } catch(e) { console.warn('[notif] failed:', e); }
      });
      try { localStorage.setItem('notifiedPickIds', JSON.stringify([...seen].slice(-200))); } catch(e) {}
    };
    // FIX bug #4 : retiré `document.addEventListener('DOMContentLoaded', ...)`
    // — on est DÉJÀ dans le callback DOMContentLoaded ici, l'event a déjà tiré.
    // L'appel direct _notifSyncBtn() ci-dessous suffit pour init le bouton.
    _notifSyncBtn();
    const _notifBtn = document.getElementById('notif-toggle');
    if (_notifBtn) _notifBtn.addEventListener('click', async () => {
      if (!('Notification' in window)) return;
      let perm = Notification.permission;
      if (perm === 'default') {
        try { perm = await Notification.requestPermission(); } catch(e) { return; }
      }
      if (perm !== 'granted') {
        if (typeof toast === 'function') toast('🔕 Notifications bloquées par le navigateur', 'warn');
        _notifSyncBtn();
        return;
      }
      try {
        const p = JSON.parse(localStorage.getItem('userPrefs') || '{}');
        p.pushNotifs = !p.pushNotifs;
        localStorage.setItem('userPrefs', JSON.stringify(p));
        if (typeof toast === 'function') toast(p.pushNotifs ? '🔔 Notifs activées · alertes sur edge ≥10%' : '🔕 Notifs désactivées', 'info');
        _notifSyncBtn();
        if (p.pushNotifs && typeof window._maybeNotifyHighEdgePicks === 'function') window._maybeNotifyHighEdgePicks();   // déclenche immédiatement si data fresh contient des picks
      } catch(e){}
    });

    // v30 Sprint 5 + theme-auto — 3-state theme : dark / light / auto (système).
    // Click cycle : dark → light → auto → dark. Auto suit `prefers-color-scheme`
    // et écoute les changements en live (l'utilisateur passe en mode nuit
    // sur son OS → l'app suit sans reload).
    const _systemPrefersLight = () => window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const _resolveTheme = (storedTheme) => storedTheme === 'auto' ? (_systemPrefersLight() ? 'light' : 'dark') : storedTheme;
    const _applyTheme = (storedTheme) => {
      const effective = _resolveTheme(storedTheme);
      const root = document.documentElement;
      if (effective === 'light') root.setAttribute('data-theme', 'light');
      else root.removeAttribute('data-theme');
      const meta = document.getElementById('theme-color-meta');
      if (meta) meta.setAttribute('content', effective === 'light' ? '#f5f5f7' : '#08080a');
      const tt = document.getElementById('theme-toggle');
      if (tt) {
        // Icône reflète le mode stocké, pas l'effectif (sinon "auto" est invisible)
        tt.textContent = storedTheme === 'auto' ? '🌓' : storedTheme === 'light' ? '☀️' : '🌙';
        tt.title = storedTheme === 'auto' ? 'Thème : auto (système) · clic pour cycler'
                 : storedTheme === 'light' ? 'Thème : clair · clic pour cycler'
                 : 'Thème : sombre · clic pour cycler';
        tt.setAttribute('aria-label', tt.title);
      }
    };
    let _currentTheme = 'dark';
    try {
      const initPrefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      _currentTheme = ['dark', 'light', 'auto'].includes(initPrefs.theme) ? initPrefs.theme : 'dark';
      _applyTheme(_currentTheme);
    } catch(e) { _applyTheme('dark'); }
    // En mode auto, suivre les changements de système en live
    try {
      const mql = window.matchMedia('(prefers-color-scheme: light)');
      const _onSysChange = () => { if (_currentTheme === 'auto') _applyTheme('auto'); };
      if (mql.addEventListener) mql.addEventListener('change', _onSysChange);
      else if (mql.addListener) mql.addListener(_onSysChange);
    } catch(e){}
    // FIX bug #6 : sync cross-tab. Si l'utilisateur change le thème sur un
    // autre onglet, on récupère l'évent `storage` et on applique le nouveau
    // mode ici aussi (sans toast pour rester discret).
    window.addEventListener('storage', (ev) => {
      if (ev.key !== 'userPrefs') return;
      try {
        const fresh = JSON.parse(ev.newValue || '{}');
        const next = ['dark', 'light', 'auto'].includes(fresh.theme) ? fresh.theme : 'dark';
        if (next !== _currentTheme) {
          _currentTheme = next;
          _applyTheme(next);
        }
      } catch(e){}
    });
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', () => {
      try {
        const p = JSON.parse(localStorage.getItem('userPrefs') || '{}');
        const cur = ['dark', 'light', 'auto'].includes(p.theme) ? p.theme : 'dark';
        const cycle = { dark: 'light', light: 'auto', auto: 'dark' };
        const next = cycle[cur];
        p.theme = next;
        _currentTheme = next;
        localStorage.setItem('userPrefs', JSON.stringify(p));
        _applyTheme(next);
        const labels = { dark: 'sombre', light: 'clair', auto: 'auto (système)' };
        if (typeof toast === 'function') toast('🎨 Thème : ' + labels[next], 'info');
      } catch(e){}
    });

    // v31 — Level toggle (débutant / confirmé / pro). Cycle au clic +
    // applique data-level sur <html> (les CSS rules `.help-dot` /
    // `.beginner-hint` réagissent automatiquement).
    const levelBtn = document.getElementById('level-toggle');
    const _levelLabels = { debutant: '🌱 Débutant', confirme: '🎯 Confirmé', pro: '📊 Pro' };
    const _levelIcons = { debutant: '🌱', confirme: '🎯', pro: '📊' };
    const _levelTitle = (lv) => `Niveau : ${_levelLabels[lv] || lv} · clic pour cycler`;
    const _applyLevel = (lv) => {
      try { document.documentElement.setAttribute('data-level', lv); } catch(e){}
      if (levelBtn) {
        levelBtn.textContent = _levelIcons[lv] || '🎯';
        levelBtn.title = _levelTitle(lv);
        levelBtn.setAttribute('aria-label', _levelTitle(lv));
      }
    };
    try {
      const p0 = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      _applyLevel(['debutant', 'confirme', 'pro'].includes(p0.level) ? p0.level : 'confirme');
    } catch(e){ _applyLevel('confirme'); }
    if (levelBtn) levelBtn.addEventListener('click', () => {
      try {
        const p = JSON.parse(localStorage.getItem('userPrefs') || '{}');
        const cur = ['debutant', 'confirme', 'pro'].includes(p.level) ? p.level : 'confirme';
        const cycle = { debutant: 'confirme', confirme: 'pro', pro: 'debutant' };
        const next = cycle[cur];
        p.level = next;
        localStorage.setItem('userPrefs', JSON.stringify(p));
        _applyLevel(next);
        if (typeof toast === 'function') toast('🎯 Niveau : ' + _levelLabels[next], 'info');
      } catch(e){}
    });

    // v30 — Health indicator click → ouvre la page Crédibilité (où le user
    // peut voir le détail performances + bientôt état pipeline complet).
    const healthBtn = document.getElementById('health-indicator');
    if (healthBtn) healthBtn.addEventListener('click', () => {
      try { localStorage.setItem('currentPage', 'credibilite'); } catch(e){}
      if (typeof currentPage !== 'undefined') currentPage = 'credibilite';
      if (typeof applyPageView === 'function') applyPageView();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const open = document.querySelector('nav.topbar-nav .hub.open');
      if (open) {
        open.classList.remove('open');
        const b = open.querySelector('.hub-btn');
        if (b) { b.setAttribute('aria-expanded', 'false'); b.focus(); }
      }
    });

    // v22 — Onboarding au premier chargement.
    // v30 fix : on ne lance PAS l'overlay si l'utilisateur a déjà cliqué
    // quelque part (page-btn, lien, etc.) avant que le timer expire — on
    // intercepterait sinon son geste avec une modale, bug confirmé en
    // e2e (Playwright a dû addInitScript onboardingDone=true pour passer).
    // Idle callback + flag reduit la fenêtre sans casser la 1re visite.
    try {
      let _userInteracted = false;
      const _markInteract = () => { _userInteracted = true; };
      document.addEventListener('click', _markInteract, { once: true, capture: true });
      document.addEventListener('keydown', _markInteract, { once: true, capture: true });
      const _runOnboarding = () => {
        document.removeEventListener('click', _markInteract, true);
        document.removeEventListener('keydown', _markInteract, true);
        if (_userInteracted) return;  // user is doing something, don't interrupt
        // Don't open if any modal is already on screen (lock unlock, help, etc.)
        if (document.querySelector('.modal.show, .modal[open], #share-modal.show')) return;
        try { if (typeof showOnboardingModal === 'function') showOnboardingModal(); } catch(e){}
      };
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(_runOnboarding, { timeout: 1500 });
      } else {
        setTimeout(_runOnboarding, 800);
      }
    } catch(e){}

    // v22 + theme-auto — Raccourci Maj+T : cycle dark → light → auto.
    // Délégué au handler du bouton .theme-toggle pour rester DRY (un seul
    // endroit où vit la logique de cycle, donc pas de drift entre clavier/clic).
    document.addEventListener('keydown', (ev) => {
      if (ev.shiftKey && !ev.ctrlKey && !ev.metaKey && !ev.altKey && (ev.key === 'T' || ev.key === 't')) {
        // FIX bug #8 : aussi ignorer SELECT et contenteditable. Sinon Shift+T
        // pendant l'ouverture du select tri/sport tape ailleurs et bascule
        // le thème par accident.
        const target = ev.target;
        if (target && target.matches && target.matches('input,textarea,select,[contenteditable="true"]')) return;
        const tt = document.getElementById('theme-toggle');
        if (tt) { tt.click(); ev.preventDefault(); }
      }
    });
    // Wire up bankroll input (persist + re-render Top Picks on change)
    const brInput = document.getElementById('bankroll-input');
    if (brInput) {
      brInput.value = bankroll;
      const onBR = () => {
        const v = validateBankroll(brInput.value, brInput);
        if (v == null) return;
        bankroll = v;
        try { localStorage.setItem('bankroll', String(v)); } catch (e) {}
        render(); // re-render so Top Picks show updated € stakes
      };
      brInput.addEventListener('change', onBR);
      brInput.addEventListener('blur', onBR);
    }
    // Hamburger toggle (mobile sidebar drawer) — syncs aria-expanded so AT knows
    // whether the drawer is open, and keeps state in sync between the overlay
    // and the burger button.
    const burger = document.getElementById('hamburger');
    const overlay = document.getElementById('sidebar-overlay');
    const syncSidebarAria = () => {
      const open = document.body.classList.contains('sidebar-open');
      if (burger) burger.setAttribute('aria-expanded', String(open));
      if (overlay) overlay.setAttribute('aria-hidden', String(!open));
    };
    if (burger) {
      burger.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-open');
        syncSidebarAria();
      });
    }
    if (overlay) {
      overlay.addEventListener('click', () => {
        document.body.classList.remove('sidebar-open');
        syncSidebarAria();
      });
    }
    // v31.5 — bouton "Menu" du bottom-nav mobile : même action que le hamburger
    const mbnMenu = document.getElementById('mbn-menu-btn');
    if (mbnMenu) {
      mbnMenu.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-open');
        syncSidebarAria();
      });
    }
    syncSidebarAria();
    // Close drawer after tapping a nav item on mobile
    document.querySelectorAll('#page-nav .page-btn, nav.topbar-sports button').forEach(b => {
      b.addEventListener('click', () => {
        if (window.matchMedia('(max-width: 960px)').matches) {
          document.body.classList.remove('sidebar-open');
        }
      });
    });
    // v26.1 — Brand click → Accueil
    const brandBtn = document.querySelector('.topbar-brand');
    if (brandBtn) {
      brandBtn.addEventListener('click', () => {
        const b = document.querySelector('.page-btn[data-page="dashboard"]');
        if (b) b.click();
      });
      brandBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); brandBtn.click(); }
      });
    }
    // v30 — PWA install prompt banner. Le navigateur émet beforeinstallprompt
    // quand le site est installable (PWA + manifest OK + 1ère visite repassée).
    // On capture l'événement, le diffère, et propose un banner discret.
    // Snooze : 7 jours via localStorage. "Plus tard" = re-snooze.
    // "Installer" = fire le prompt natif via deferredPrompt.prompt().
    let _pwaDeferredPrompt = null;
    const PWA_SNOOZE_KEY = 'pwaInstallSnoozeUntil';
    const _pwaIsSnoozed = () => {
      try {
        const v = parseInt(localStorage.getItem(PWA_SNOOZE_KEY), 10);
        return isFinite(v) && Date.now() < v;
      } catch(e) { return false; }
    };
    const _pwaSnooze = (days) => {
      try { localStorage.setItem(PWA_SNOOZE_KEY, String(Date.now() + days * 86400000)); } catch(e){}
    };
    const _pwaShowBanner = () => {
      const banner = document.getElementById('pwa-install-banner');
      if (!banner) return;
      banner.style.display = 'block';
    };
    const _pwaHideBanner = () => {
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.style.display = 'none';
    };
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      _pwaDeferredPrompt = e;
      // Ne pas afficher si snooze actif ou déjà installé (display-mode standalone)
      try {
        if (window.matchMedia('(display-mode: standalone)').matches) return;
      } catch(e){}
      if (_pwaIsSnoozed()) return;
      // v31.2 — UX audit : compter les visites (engagement signal). Ne montrer
      // l'install banner qu'à partir de la 2e visite, pour ne pas saturer le
      // premier écran d'un nouveau visiteur. Premier touch = découverte du site,
      // 2e+ touch = intent réel.
      let visitCount = 0;
      try { visitCount = parseInt(localStorage.getItem('pwaVisitCount') || '0', 10); } catch(e){}
      visitCount = (isFinite(visitCount) ? visitCount : 0) + 1;
      try { localStorage.setItem('pwaVisitCount', String(visitCount)); } catch(e){}
      if (visitCount < 2) return;  // 1ère visite = pas de prompt
      // Délais étendu à 60s (audit UX : laisser l'utilisateur explorer avant de proposer)
      setTimeout(_pwaShowBanner, 60000);
    });
    window.addEventListener('appinstalled', () => {
      _pwaHideBanner();
      _pwaSnooze(365); // une fois installé, plus jamais demander
      if (typeof toast === 'function') toast('🎉 App installée — bon paris !', 'success');
    });
    const _pwaGoBtn = document.getElementById('pwa-install-go');
    const _pwaLaterBtn = document.getElementById('pwa-install-later');
    const _pwaDismissBtn = document.getElementById('pwa-install-dismiss');
    if (_pwaGoBtn) _pwaGoBtn.addEventListener('click', async () => {
      if (!_pwaDeferredPrompt) { _pwaHideBanner(); return; }
      try {
        _pwaDeferredPrompt.prompt();
        const choice = await _pwaDeferredPrompt.userChoice;
        if (choice && choice.outcome === 'dismissed') _pwaSnooze(7);
        _pwaDeferredPrompt = null;
      } catch(e){}
      _pwaHideBanner();
    });
    if (_pwaLaterBtn) _pwaLaterBtn.addEventListener('click', () => { _pwaSnooze(7); _pwaHideBanner(); });
    if (_pwaDismissBtn) _pwaDismissBtn.addEventListener('click', () => { _pwaSnooze(30); _pwaHideBanner(); });

    // v30 — Click sur badge version footer → modal récap nouveautés
    const versionBadge = document.getElementById('footer-version');
    if (versionBadge) {
      const _showWhatsNew = () => {
        const features = [
          '🎯 Calibration plot — preuve d\'honnêteté du modèle (page Crédibilité)',
          '📊 Performance par sport / cote / tier (page Crédibilité)',
          '⏱️ Match countdown timer "dans X min" + pulse imminent <30min',
          '💰 Daily P&L chip prominent (dashboard)',
          '🔥 Streak banner (≥2 paris consécutifs)',
          '📋 Activité récente (5 derniers paris) sur dashboard',
          '⚡ Quick stake presets (1/2/5/10€/Kelly) sur cards expand',
          '🟢 Health indicator pipeline topbar',
          '⌨️ Search keyboard nav (↑↓ Enter Esc)',
          '📤 Bouton partager match (URL ?match=ID)',
          '🌓 Thème 3-state (dark / light / auto système)',
          '📱 PWA install prompt + 4 shortcuts manifest',
          '🦶 Footer + tooltips info Edge/Conf/Cote',
          '❓ Help modal raccourcis (touche ?)',
        ];
        const html = '<div style="text-align:left;padding:8px 0;">' +
          '<h3 style="margin:0 0 12px;font-size:18px;color:var(--text);">🎉 Nouveautés v30</h3>' +
          '<div style="font-size:11px;color:var(--text-dim);margin-bottom:14px;">Cliquer sur l\'icône Calibration en bas à gauche du Crédibilité pour voir notre meilleur écart vs prédictions.</div>' +
          '<ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:7px;font-size:13px;color:var(--text-2);line-height:1.5;">' +
          features.map(f => `<li>${f}</li>`).join('') + '</ul></div>';
        // Réutiliser le pattern showShortcutsHelp si dispo
        const existing = document.getElementById('__whatsnew-modal');
        if (existing) { existing.remove(); return; }
        const div = document.createElement('div');
        div.id = '__whatsnew-modal';
        div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);z-index:100001;display:flex;align-items:center;justify-content:center;padding:20px;cursor:pointer;';
        const inner = document.createElement('div');
        inner.style.cssText = 'background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:24px;width:min(520px,94vw);max-height:80vh;overflow:auto;cursor:auto;';
        inner.innerHTML = html + '<div style="text-align:right;margin-top:18px;"><button id="__whatsnew-close" style="background:var(--brand);color:#08080a;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;">Fermer</button></div>';
        inner.addEventListener('click', e => e.stopPropagation());
        div.appendChild(inner);
        document.body.appendChild(div);
        div.addEventListener('click', () => div.remove());
        inner.querySelector('#__whatsnew-close').addEventListener('click', () => div.remove());
      };
      versionBadge.addEventListener('click', _showWhatsNew);
      versionBadge.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _showWhatsNew(); }
      });
    }

    // v30 — Footer page-link buttons → navigate to corresponding page
    document.querySelectorAll('.footer-link[data-page-link]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.pageLink;
        if (!target) return;
        const navBtn = document.querySelector(`.page-btn[data-page="${target}"]`);
        if (navBtn) navBtn.click();
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e){}
      });
    });
    // v30 — Footer "Last update" timestamp from data.generated_at
    function _updateFooterLastUpdate() {
      const el = document.getElementById('footer-last-update');
      if (!el) return;
      const data = window.PRONOSTICS_DATA;
      if (!data || !data.generated_at) {
        el.textContent = '📅 —';
        return;
      }
      const ts = new Date(data.generated_at).getTime();
      const ageMin = Math.max(0, Math.round((Date.now() - ts) / 60000));
      const lbl = ageMin < 1 ? 'à l\'instant'
                : ageMin < 60 ? `il y a ${ageMin} min`
                : ageMin < 24*60 ? `il y a ${Math.round(ageMin/60)} h`
                : `il y a ${Math.round(ageMin/(24*60))} j`;
      el.textContent = `📅 Données ${lbl}`;
      el.title = `Dernière actualisation : ${new Date(data.generated_at).toLocaleString('fr-FR')}`;
      // v30 — Si la session reste ouverte longtemps et que data passe stale
      // (>2h), force-reload une seule fois (avec retry après 30 min). Ce
      // poll rattrape les utilisateurs qui laissent l'onglet ouvert toute
      // la journée — sinon ils voient des pronos sur des matchs déjà finis.
      if (ageMin > 120) {
        try {
          const lastTry = parseInt(sessionStorage.getItem('autoRefreshDoneAt') || '0', 10);
          const sinceLast = (Date.now() - lastTry) / 60000;
          if (!isFinite(sinceLast) || sinceLast > 30) {
            sessionStorage.setItem('autoRefreshDoneAt', String(Date.now()));
            // Toast informatif visible pour l'utilisateur (pas un reload silencieux)
            try { if (typeof toast === 'function') toast(`Données ${lbl} — actualisation automatique`, 'info'); } catch(e){}
            (async () => {
              try {
                if ('serviceWorker' in navigator) {
                  const rs = await navigator.serviceWorker.getRegistrations();
                  await Promise.all(rs.map(r => r.unregister()));
                }
                if ('caches' in window) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map(k => caches.delete(k)));
                }
              } catch(err) { /* silent */ }
              setTimeout(() => location.reload(), 1500);
            })();
          }
        } catch(e) { /* silent */ }
      }
    }
    _updateFooterLastUpdate();
    setInterval(_updateFooterLastUpdate, 60 * 1000);   // refresh label every min
    window._updateFooterLastUpdate = _updateFooterLastUpdate;

    // Keyboard shortcuts: /, ←/→, 1-9, B
    document.addEventListener('keydown', (e) => {
      const target = e.target;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      // "/" focuses search — allowed only when not typing
      if (e.key === '/' && !typing) {
        const searchInput = document.getElementById('search');
        if (searchInput) { e.preventDefault(); searchInput.focus(); searchInput.select(); }
        return;
      }
      // Escape closes sidebar drawer on mobile
      if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) {
        document.body.classList.remove('sidebar-open'); return;
      }
      if (typing) return;
      // Arrows: navigate day
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const keys = Object.keys((window.PRONOSTICS_DATA || {}).days || {}).sort();
        if (!keys.length) return;
        let idx = keys.indexOf(currentDate);
        if (idx < 0) idx = keys.length - 1;
        idx += (e.key === 'ArrowLeft' ? -1 : 1);
        if (idx < 0 || idx >= keys.length) return;
        e.preventDefault();
        currentDate = keys[idx];
        const dateInput = document.getElementById('date');
        if (dateInput) dateInput.value = currentDate;
        render();
      }
      // B — jump to Bilan page
      if ((e.key === 'b' || e.key === 'B')) {
        const btn = document.querySelector('.page-btn[data-page="bilan"]');
        if (btn) { e.preventDefault(); btn.click(); }
      }
      // 1-9 — switch to league tab
      if (e.key >= '1' && e.key <= '9') {
        const tabs = document.querySelectorAll('nav.tabs button');
        const idx = parseInt(e.key, 10) - 1;
        if (tabs[idx]) { e.preventDefault(); tabs[idx].click(); }
      }
    });

    render();
    startAutoRefresh();

    // Chantier PP — charge l'historique de cotes en parallèle puis re-render
    // pour que le bilan montre les picks évalués sur matchs complétés.
    // On invalide aussi le cache de prédictions pour que predictMatch re-calcule
    // avec les cotes historiques nouvellement disponibles.
    loadOddsHistory().then(loaded => {
      if (!loaded) return;
      try { __predCacheClear(); } catch (e) {}
      render();
    });
  });

  // v23 — Expose les fonctions de l'IIFE à window pour que les scripts externes (FAB Que parier, chatbot, tooltips) puissent y accéder.
  try {
    window.predictMatch = predictMatch;
    window.predictLikelyScorers = predictLikelyScorers;  // v24
    window.winamaxUrl = winamaxUrl;
    window.addTrackedBet = addTrackedBet;
    window.loadTrackedBets = loadTrackedBets;
    window.computeMyBilan = computeMyBilan;
    window.toast = toast;
    window.esc = esc;
    window.sportEmoji = sportEmoji;
    window.sportLabel = sportLabel;
    window.applyPageView = applyPageView;
  } catch (e) {}

})();

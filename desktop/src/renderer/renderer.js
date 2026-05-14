(function () {
  'use strict';

  const state = {
    status: null,
    picks: [],
    allPicks: [],
    matches: [],
    combines: [],
    scorers: [],
    watchlist: [],
    history: null,
    coverage: null,
    agent: null,
    calibration: null,
    contextSummary: null,
    signalGaps: [],
    contextBacktest: null,
    decisionBacktest: null,
    decisionTuning: null,
    decisionShadow: null,
    oddsGuardrails: null,
    agentBlockerBacktest: null,
    agentGuardrailRecommendations: null,
    stakeReductionBacktest: null,
    signalConflictBacktest: null,
    scorerQuality: null,
    scorerCandidates: null,
    scorerSettlement: null,
    scorerPendingAudit: null,
    prematchFocus: null,
    prematchExecution: null,
    signalCoverageTrend: null,
    nextActions: null,
    sourceFreshnessPlan: null,
    contextRepairPlan: null,
    refreshPriorityPlan: null,
    prebetChecklist: null,
    prebetChecklistBacktest: null,
    teamIdentityGraph: null,
    matchDecisionTimeline: null,
    agentBankrollSimulation: null,
    smartPreparePlan: null,
    sourceRegistry: null,
    sourceQuarantine: null,
    optionalSourcesPlan: null,
    criticalIssueReport: null,
    dataConsistencyReport: null,
    uiIntegrityReport: null,
    pickIntegrityReport: null,
    coverageRepairEngine: null,
    sourceCoverageTargets: null,
    leagueSignalQuality: null,
    modelLab: null,
    probabilityCalibration: null,
    policyCandidates: null,
    sourceHealth: null,
    decisionCenter: null,
    agentBlockers: null,
    clvSummary: null,
    dashboardMeta: null,
    prematchPlan: null,
    engineReady: false,
    bootStartedAt: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    windowLoadedAt: null,
    firstPickRenderedAt: null,
    hiddenSince: document.hidden ? Date.now() : null,
    refreshTimer: null,
    backgroundRefreshTimer: null,
    backgroundRefreshNextAt: null,
    exportTimer: null,
    actionHistory: [],
    calendarDayFilter: null,
    selectedCalendarDay: null,
    debugLogs: [],
    coachOverride: null,
    profileImportPreview: null,
    crashRecovered: false,
    safeMode: false,
    didScrollToNow: false,
    aiAssist: null,
    webEnrichments: null,
    webEnrichmentPending: new Set(),
    focusRow: null,
    feedbackBetId: null,
    updateStatus: null
  };

  const ACTION_HISTORY_KEY = 'parisSportifActionHistory';
  const USER_BETS_KEY = 'parisSportifUserBets';
  const USER_BETS_DEMO_KEY = 'parisSportifDemoUserBets';
  const USER_PREFS_KEY = 'parisSportifPreferences';
  const USER_PREFS_SEEN_KEY = 'parisSportifPreferencesSeen';
  const USER_AUDIT_KEY = 'parisSportifUserLearningAudit';
  const AUTO_SETTLEMENT_KEY = 'parisSportifAutoSettlementAudit';
  const MODEL_AUDIT_KEY = 'parisSportifModelSelfAudit';
  const INSIGHTS_KEY = 'parisSportifPersonalInsights';
  const ODDS_MEMORY_KEY = 'parisSportifOddsMemory';
  const SMART_ALERT_KEY = 'parisSportifSmartAlertKeys';
  const NOTIFIED_PICK_KEY = 'parisSportifNotifiedPickKeys';
  const READY_COUNT_KEY = 'parisSportifLastReadyCount';
  const PROFILE_BACKUP_KEY = 'parisSportifLastProfileBackupDay';
  const APP_SESSION_KEY = 'parisSportifDesktopSession';
  const AI_ENGINE_KEY = 'parisSportifAiEngineState';
  const WEB_ENRICHMENT_KEY = 'parisSportifWebEnrichmentState';
  const MODEL_ADJUSTMENTS_KEY = 'parisSportifModelAdjustments';
  const LOSS_FEEDBACK_KEY = 'parisSportifLossFeedbacks';
  const UPDATE_STATUS_KEY = 'parisSportifUpdateStatus';
  const SPORTS_PREFS = ['football', 'tennis', 'basketball', 'hockey', 'baseball'];
  const MARKET_PREFS = [
    { key: '1n2', label: '1N2' },
    { key: 'ht1n2', label: '1N2 mi-temps' },
    { key: 'httotal', label: 'Total mi-temps' },
    { key: 'ou35', label: 'O/U 3.5' },
    { key: 'ou25', label: 'O/U 2.5' },
    { key: 'btts', label: 'BTTS' },
    { key: 'teamtotal', label: 'Total équipe' },
    { key: 'dnb', label: 'DNB' },
    { key: 'doublechance', label: 'Double chance' },
    { key: 'resultbtts', label: 'Résultat + BTTS' },
    { key: 'baseballtotal', label: 'Total runs' },
    { key: 'basketballtotal', label: 'Total basket' },
    { key: 'baskettotal', label: 'Total basket' },
    { key: 'hockeytotal', label: 'Total buts' },
    { key: 'tennisgames', label: 'Jeux tennis' },
    { key: 'tennissets', label: 'Sets tennis' },
    { key: 'handicap', label: 'Handicap' },
    { key: 'exactscore', label: 'Score exact' }
  ];
  const DEFAULT_PREFERENCES = {
    bankroll: 50,
    level: 'intermediate',
    sports: SPORTS_PREFS,
    markets: MARKET_PREFS.map((item) => item.key),
    edgeMin: 0,
    oddMin: 1,
    oddMax: 50,
    confidenceMin: 0,
    alertEdge: 10,
    alertWindowHours: 2,
    stakeMode: 'kelly',
    flatUnitPct: 1,
    maxStakePct: 5,
    stopLossPct: 5,
    takeProfitPct: 8,
    webhookType: 'generic',
    webhookUrl: '',
    coachEnabled: true,
    dailyBetLimit: 8,
    dailyStakeCapPct: 20,
    coachLossStreakConfirm: 3,
    demoMode: false,
    aiEnabled: false,
    aiProvider: 'openai',
    aiApiKey: '',
    aiModel: 'gpt-4o-mini',
    webEnrichmentEnabled: true,
    webEnrichmentCacheMinutes: 120,
    webEnrichmentRateLimit: 5,
    autoUpdateEnabled: true,
    updateChannel: 'stable',
    strict: false
  };
  const REFRESH_DEFAULT_INTERVAL_MS = 30 * 60 * 1000;
  const REFRESH_URGENT_INTERVAL_MS = 5 * 60 * 1000;
  const REFRESH_ECONOMY_AFTER_MS = 60 * 60 * 1000;
  const REFRESH_ESTIMATE_SECONDS = {
    quick: 150,
    signals: 520,
    full: 900,
    prematch: 420,
    prematch_t60: 280,
    prematch_t30: 260,
    prematch_t10: 210,
    critical: 260,
    repair_context: 340
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function normalizeUiKey(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9.]+/g, '');
  }

  function marketKeyFromRow(row) {
    return normalizeUiKey(row?.marketKey || row?.market || 'market_unknown') || 'market_unknown';
  }

  function loadPreferences() {
    try {
      const parsed = JSON.parse(localStorage.getItem(USER_PREFS_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_PREFERENCES };
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        sports: Array.isArray(parsed.sports) && parsed.sports.length ? parsed.sports : DEFAULT_PREFERENCES.sports,
        markets: Array.isArray(parsed.markets) && parsed.markets.length ? parsed.markets : DEFAULT_PREFERENCES.markets
      };
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  function savePreferences(preferences) {
    const next = {
      ...DEFAULT_PREFERENCES,
      ...(preferences || {}),
      sports: Array.isArray(preferences?.sports) ? preferences.sports : DEFAULT_PREFERENCES.sports,
      markets: Array.isArray(preferences?.markets) ? preferences.markets : DEFAULT_PREFERENCES.markets
    };
    try {
      localStorage.setItem(USER_PREFS_KEY, JSON.stringify(next));
      localStorage.setItem(USER_PREFS_SEEN_KEY, '1');
      scheduleProfileBackup();
    } catch {
      setSideStatus('Préférences non enregistrées', 'warn');
    }
    return next;
  }

  function userBetsStorageKey(preferences = loadPreferences()) {
    return preferences.demoMode ? USER_BETS_DEMO_KEY : USER_BETS_KEY;
  }

  function allUserBetKeys() {
    return [USER_BETS_KEY, USER_BETS_DEMO_KEY];
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatAge(minutes) {
    if (minutes == null) return '-';
    if (minutes < 1) return '<1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
  }

  function formatMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return `${n.toFixed(2)} €`;
  }

  function formatLoss(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return n > 0 ? `-${n.toFixed(2)} €` : '0.00 €';
  }

  function formatPct(value, digits = 1) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return `${(n * 100).toFixed(digits)}%`;
  }

  function loadUserBets() {
    try {
      const rows = JSON.parse(localStorage.getItem(userBetsStorageKey()) || '[]');
      return Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : [];
    } catch (error) {
      pushLog('error', `Paris suivis illisibles: ${error.message}`);
      attemptProfileRestoreFromBackup('Paris suivis corrompus').catch(() => {});
      return [];
    }
  }

  function saveUserBets(rows) {
    try {
      localStorage.setItem(userBetsStorageKey(), JSON.stringify(Array.isArray(rows) ? rows : []));
      scheduleProfileBackup();
    } catch {
      setSideStatus('Suivi pari indisponible', 'warn');
    }
  }

  function readStorageJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed == null ? fallback : parsed;
    } catch {
      return fallback;
    }
  }

  function writeStorageJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Donnée de confort : l'app reste utilisable même si le profil bloque l'écriture.
    }
  }

  function currentProfileSnapshot() {
    const readRawJson = (key, fallback) => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    };
    const prefs = loadPreferences();
    const exportedPrefs = { ...prefs, aiApiKey: prefs.aiApiKey ? 'stored-locally-not-exported' : '' };
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      preferences: exportedPrefs,
      bankroll: localStorage.getItem('userBankroll') || null,
      bets: readRawJson(USER_BETS_KEY, []),
      demoBets: readRawJson(USER_BETS_DEMO_KEY, []),
      learningAudit: readStorageJson(USER_AUDIT_KEY, null),
      autoSettlementAudit: readStorageJson(AUTO_SETTLEMENT_KEY, null),
      modelAudit: readStorageJson(MODEL_AUDIT_KEY, null),
      insights: readStorageJson(INSIGHTS_KEY, null),
      oddsMemory: readStorageJson(ODDS_MEMORY_KEY, {}),
      smartAlerts: readStorageJson(SMART_ALERT_KEY, []),
      notifiedPicks: readStorageJson(NOTIFIED_PICK_KEY, []),
      webEnrichment: readStorageJson(WEB_ENRICHMENT_KEY, null),
      modelAdjustments: readStorageJson(MODEL_ADJUSTMENTS_KEY, null),
      lossFeedbacks: readStorageJson(LOSS_FEEDBACK_KEY, [])
    };
  }

  function mergeBets(existing, incoming) {
    const map = new Map();
    [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])].forEach((bet) => {
      if (!bet || typeof bet !== 'object') return;
      const key = bet.id || `${bet.key || ''}:${bet.createdAt || ''}:${bet.title || ''}`;
      if (!key) return;
      map.set(String(key), { ...(map.get(String(key)) || {}), ...bet });
    });
    return Array.from(map.values());
  }

  function applyImportedProfile(profile, mode = 'merge') {
    if (!profile || typeof profile !== 'object') throw new Error('Profil invalide');
    const replace = mode === 'replace';
    if (profile.preferences) {
      const importedPrefs = { ...profile.preferences };
      if (importedPrefs.aiApiKey === 'stored-locally-not-exported') delete importedPrefs.aiApiKey;
      const prefs = replace ? { ...DEFAULT_PREFERENCES, ...importedPrefs } : { ...loadPreferences(), ...importedPrefs };
      savePreferences(prefs);
      localStorage.setItem('userBankroll', String(prefs.bankroll || profile.bankroll || 50));
    }
    if (profile.bankroll && !profile.preferences) localStorage.setItem('userBankroll', String(profile.bankroll));
    if (Array.isArray(profile.bets)) {
      const current = readStorageJson(USER_BETS_KEY, []);
      localStorage.setItem(USER_BETS_KEY, JSON.stringify(replace ? profile.bets : mergeBets(current, profile.bets)));
    }
    if (Array.isArray(profile.demoBets)) {
      const currentDemo = readStorageJson(USER_BETS_DEMO_KEY, []);
      localStorage.setItem(USER_BETS_DEMO_KEY, JSON.stringify(replace ? profile.demoBets : mergeBets(currentDemo, profile.demoBets)));
    }
    [
      [USER_AUDIT_KEY, profile.learningAudit],
      [AUTO_SETTLEMENT_KEY, profile.autoSettlementAudit],
      [MODEL_AUDIT_KEY, profile.modelAudit],
      [INSIGHTS_KEY, profile.insights],
      [ODDS_MEMORY_KEY, profile.oddsMemory],
      [SMART_ALERT_KEY, profile.smartAlerts],
      [NOTIFIED_PICK_KEY, profile.notifiedPicks],
      [WEB_ENRICHMENT_KEY, profile.webEnrichment],
      [MODEL_ADJUSTMENTS_KEY, profile.modelAdjustments],
      [LOSS_FEEDBACK_KEY, profile.lossFeedbacks]
    ].forEach(([key, value]) => {
      if (value != null) writeStorageJson(key, value);
    });
    state.profileImportPreview = null;
    renderPreferences();
    renderUserPnl();
    renderHistory();
    renderPicks();
    scheduleProfileBackup({ force: true });
    return true;
  }

  function exportProfile() {
    const profile = currentProfileSnapshot();
    downloadText(`paris-sportif-profil-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(profile, null, 2), 'application/json;charset=utf-8');
    scheduleProfileBackup({ force: true });
  }

  function renderProfileImportPreview() {
    const box = $('#profile-import-preview');
    const merge = $('#merge-profile-btn');
    const replace = $('#replace-profile-btn');
    const profile = state.profileImportPreview;
    if (!box) return;
    if (!profile) {
      box.textContent = 'Aucun profil importé.';
      merge?.classList.add('hidden');
      replace?.classList.add('hidden');
      return;
    }
    const bets = Array.isArray(profile.bets) ? profile.bets.length : 0;
    const demo = Array.isArray(profile.demoBets) ? profile.demoBets.length : 0;
    box.textContent = `Profil du ${profile.exportedAt ? formatDateLabel(profile.exportedAt) : '-'} · ${formatCount(bets)} pari(s) réel(s) · ${formatCount(demo)} démo · bankroll ${profile.preferences?.bankroll || profile.bankroll || '-'}`;
    merge?.classList.remove('hidden');
    replace?.classList.remove('hidden');
  }

  let profileBackupTimer = null;
  function scheduleProfileBackup({ force = false } = {}) {
    const day = parisDayKey();
    if (!force && localStorage.getItem(PROFILE_BACKUP_KEY) === day) return;
    clearTimeout(profileBackupTimer);
    profileBackupTimer = setTimeout(async () => {
      try {
        const response = await fetchJson('/api/profile/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: currentProfileSnapshot() })
        });
        if (response.ok) {
          localStorage.setItem(PROFILE_BACKUP_KEY, day);
          pushLog('info', `Backup profil écrit: ${response.backedUpAt || day}`);
        }
      } catch (error) {
        pushLog('warn', `Backup profil indisponible: ${error.message}`);
      }
    }, force ? 50 : 1200);
  }

  async function attemptProfileRestoreFromBackup(reason = 'Recovery') {
    try {
      const response = await fetchJson('/api/profile/latest');
      const profile = response?.backup?.profile;
      if (!response.ok || !profile) return false;
      applyImportedProfile(profile, 'merge');
      setSideStatus(`${reason} : backup restauré`, 'warn');
      pushLog('warn', `${reason}: dernier backup profil fusionné`);
      return true;
    } catch (error) {
      pushLog('error', `Restore backup impossible: ${error.message}`);
      return false;
    }
  }

  function pushLog(level, message, meta) {
    const entry = {
      at: new Date().toISOString(),
      level: ['info', 'warn', 'error'].includes(level) ? level : 'info',
      message: String(message || ''),
      meta: meta || null
    };
    state.debugLogs.push(entry);
    state.debugLogs = state.debugLogs.slice(-250);
    renderDebugLogs();
  }

  function installDebugLogHooks() {
    ['warn', 'error'].forEach((level) => {
      const original = console[level];
      console[level] = (...args) => {
        try {
          pushLog(level, args.map((arg) => {
            if (arg instanceof Error) return arg.stack || arg.message;
            if (typeof arg === 'object') return JSON.stringify(arg);
            return String(arg);
          }).join(' '));
        } catch {
          // Le journal debug ne doit jamais casser l'app.
        }
        original.apply(console, args);
      };
    });
  }

  function termTip(label, detail) {
    return `<span class="term-tip" tabindex="0" title="${escapeHtml(detail)}">${escapeHtml(label)}<span aria-hidden="true">?</span></span>`;
  }

  function parisDayKey(date = new Date()) {
    return new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }

  function pickDayKey(row) {
    const date = row?.start ? new Date(row.start) : null;
    if (!date || Number.isNaN(date.getTime())) return null;
    return parisDayKey(date);
  }

  function userBetKey(row) {
    return `${row?.id || ''}:${row?.market || ''}:${row?.label || ''}`;
  }

  function findPickByTrackKey(key) {
    const rows = [...(state.picks || []), ...(state.allPicks || []), ...(state.matches || [])];
    return rows.find((row) => userBetKey(row) === key) || null;
  }

  function userBetStats() {
    const bets = loadUserBets();
    const today = parisDayKey();
    const yesterday = parisDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    let totalStake = 0;
    let settledStake = 0;
    let pnlTotal = 0;
    let pnlToday = 0;
    let pnlYesterday = 0;
    let pending = 0;
    let won = 0;
    let lost = 0;
    let wonYesterday = 0;
    let lostYesterday = 0;
    let clvSamples = 0;
    let clvSum = 0;
    let clvPositive = 0;
    const segments = new Map();
    const dayPnl = new Map();
    const settled = [];
    for (const bet of bets) {
      const stake = Math.max(0, Number(bet.stake || 0) || 0);
      const pnl = Number(bet.pnl || 0) || 0;
      const segmentKey = `${bet.sport || 'Sport'}|||${bet.league || 'Ligue'}`;
      const segment = segments.get(segmentKey) || {
        sport: bet.sport || 'Sport',
        league: bet.league || 'Ligue',
        bets: 0,
        pending: 0,
        stake: 0,
        pnl: 0,
        settledStake: 0
      };
      segment.bets += 1;
      segment.stake += stake;
      totalStake += stake;
      if (bet.status === 'pending') {
        pending += 1;
        segment.pending += 1;
      }
      if (bet.status === 'won' || bet.status === 'lost' || bet.status === 'void') {
        settledStake += stake;
        pnlTotal += pnl;
        segment.pnl += pnl;
        segment.settledStake += stake;
        settled.push(bet);
        if (bet.status === 'won') won += 1;
        if (bet.status === 'lost') lost += 1;
        const day = String(bet.day || parisDayKey(new Date(bet.settledAt || bet.createdAt || Date.now()))).slice(0, 10);
        dayPnl.set(day, (dayPnl.get(day) || 0) + pnl);
        if (day === yesterday) {
          pnlYesterday += pnl;
          if (bet.status === 'won') wonYesterday += 1;
          if (bet.status === 'lost') lostYesterday += 1;
        }
        const clv = Number(bet.clvPct);
        if (Number.isFinite(clv)) {
          clvSamples += 1;
          clvSum += clv;
          if (clv > 0) clvPositive += 1;
        }
      }
      segments.set(segmentKey, segment);
      if (String(bet.day || '').slice(0, 10) === today) pnlToday += pnl;
    }
    const orderedSettled = settled
      .slice()
      .sort((a, b) => Date.parse(a.createdAt || a.day || 0) - Date.parse(b.createdAt || b.day || 0))
      .slice(-30);
    let running = 0;
    const sparkline = orderedSettled.map((bet) => {
      running += Number(bet.pnl || 0) || 0;
      return running;
    });
    const meaningfulSegments = Array.from(segments.values())
      .filter((row) => row.bets > 0)
      .sort((a, b) => b.pnl - a.pnl);
    const bestSegment = meaningfulSegments.find((row) => row.settledStake > 0) || meaningfulSegments[0] || null;
    const worstSegment = meaningfulSegments.slice().reverse().find((row) => row.settledStake > 0) || meaningfulSegments[meaningfulSegments.length - 1] || null;
    const streakRows = orderedSettled.slice().reverse().filter((bet) => bet.status === 'won' || bet.status === 'lost');
    let streak = { status: 'none', count: 0 };
    if (streakRows[0]) {
      const status = streakRows[0].status;
      streak = {
        status,
        count: streakRows.findIndex((bet) => bet.status !== status) === -1
          ? streakRows.length
          : streakRows.findIndex((bet) => bet.status !== status)
      };
    }
    const last7Series = Array.from({ length: 7 }, (_unused, index) => {
      const day = parisDayKey(new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000));
      return dayPnl.get(day) || 0;
    });
    const last7Pnl = last7Series.reduce((sum, value) => sum + value, 0);
    return {
      bets: bets.length,
      pending,
      won,
      lost,
      totalStake,
      settledStake,
      pnlTotal,
      pnlToday,
      pnlYesterday,
      wonYesterday,
      lostYesterday,
      last7Pnl,
      last7Series,
      roi: settledStake > 0 ? pnlTotal / settledStake : 0,
      clvSamples,
      clvMeanPct: clvSamples ? clvSum / clvSamples : null,
      clvPositiveRate: clvSamples ? clvPositive / clvSamples : null,
      sparkline,
      bestSegment,
      worstSegment,
      streak
    };
  }

  function sparklineSvg(points) {
    const values = Array.isArray(points) && points.length ? points : [0, 0];
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const range = Math.max(1, max - min);
    const coords = values.map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 28 - ((value - min) / range) * 22;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    const last = values[values.length - 1] || 0;
    const color = last >= 0 ? 'var(--accent)' : 'var(--danger)';
    return `<svg viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="${escapeHtml(coords)}" fill="none" stroke="${color}" stroke-width="2.4" vector-effect="non-scaling-stroke" />
      <line x1="0" y1="28" x2="100" y2="28" stroke="rgba(148,163,184,.22)" stroke-width="1" vector-effect="non-scaling-stroke" />
    </svg>`;
  }

  function segmentSummaryText(stats) {
    const best = stats.bestSegment;
    const worst = stats.worstSegment;
    const streak = stats.streak?.count
      ? `${stats.streak.count} ${stats.streak.status === 'won' ? 'wins' : 'losses'}`
      : 'streak neutre';
    if (!best && !worst) return `Aucun pari suivi · ${streak}`;
    const bestText = best ? `Meilleur ${best.sport}: ${formatMoney(best.pnl)}` : 'Meilleur -';
    const worstText = worst && worst !== best ? `Pire ${worst.sport}: ${formatMoney(worst.pnl)}` : '';
    return [bestText, worstText, streak].filter(Boolean).join(' · ');
  }

  function renderUserPnl() {
    const stats = userBetStats();
    const totalNode = $('#user-pnl-total');
    const subNode = $('#user-pnl-sub');
    const sparklineNode = $('#user-pnl-sparkline');
    const segmentsNode = $('#user-pnl-segments');
    if (totalNode) totalNode.textContent = formatMoney(stats.pnlTotal);
    if (subNode) {
      const demo = loadPreferences().demoMode ? 'DÉMO · ' : '';
      subNode.textContent = `${demo}Jour ${formatMoney(stats.pnlToday)} · ROI ${formatPct(stats.roi, 1)} · ${formatCount(stats.pending)} en cours`;
    }
    if (sparklineNode) sparklineNode.innerHTML = sparklineSvg(stats.sparkline);
    if (segmentsNode) segmentsNode.textContent = segmentSummaryText(stats);
  }

  function countdownLabel(value) {
    const ts = Date.parse(value || '');
    if (!Number.isFinite(ts)) return '-';
    const diff = ts - Date.now();
    if (diff <= -30 * 60 * 1000) return 'en cours';
    if (diff <= 0) return 'maintenant';
    const minutes = Math.round(diff / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
  }

  function renderMorningDashboard() {
    const title = $('#morning-title');
    const subtitle = $('#morning-subtitle');
    const grid = $('#morning-grid');
    const strip = $('#imminent-strip');
    if (!grid) return;
    const rows = (state.picks || []).filter((row) => pickHasCoreData(row) && canDisplayStake(row));
    const bigRows = rows.filter((row) => Number(row.edge || 0) >= 0.10);
    const ultimate = ultimateBetCandidate(rows);
    const nextPick = rows
      .filter((row) => Number.isFinite(Date.parse(row.start || '')))
      .sort((a, b) => Date.parse(a.start || '') - Date.parse(b.start || ''))[0] || rows[0] || null;
    const stats = userBetStats();
    const bankroll = getBankroll();
    const discipline = bankrollDisciplineStatus(stats);
    const clvText = stats.clvSamples
      ? `CLV suivis ${formatPct(stats.clvMeanPct, 1)}`
      : state.clvSummary?.summary?.mean_clv_pct != null
        ? `CLV marché ${Number(state.clvSummary.summary.mean_clv_pct).toFixed(2)}%`
        : 'CLV en apprentissage';
    if (title) {
      title.textContent = rows.length
        ? ultimate
          ? `Bet ultime : ${ultimate.title}`
          : `Bonjour, ${formatCount(rows.length)} picks aujourd'hui, dont ${formatCount(bigRows.length)} gros`
        : 'Bonjour, aucun pari prêt pour l’instant';
    }
    if (subtitle) {
      subtitle.textContent = ultimate
        ? `${ultimate.market} · ${ultimate.label} ${formatOdd(ultimate.odd)} · ${formatPct(ultimate.edge, 1)} edge · départ ${countdownLabel(ultimate.start)}.`
        : nextPick
        ? `Prochain match dans ${countdownLabel(nextPick.start)} : ${nextPick.title}, ${nextPick.label} (${formatPct(nextPick.edge, 1)} edge).`
        : 'Le cockpit reste utile : surveille les données, prépare les combinés ou relance un refresh.';
    }
    grid.innerHTML = [
      ['Picks du jour', formatCount(rows.length), `${formatCount(bigRows.length)} edge ≥ 10pt · ${formatCount(state.allPicks.length || 0)} détectés`],
      ['Prochain match', nextPick ? countdownLabel(nextPick.start) : '-', nextPick ? `${nextPick.title} · ${nextPick.market}` : 'Aucun départ proche'],
      ['Performance hier', formatMoney(stats.pnlYesterday), `${formatCount(stats.wonYesterday)}W / ${formatCount(stats.lostYesterday)}L · 7j ${formatMoney(stats.last7Pnl)}`],
      ['Bankroll', formatMoney(bankroll), `${discipline.label} · ${clvText}`]
    ].map(([label, value, detail]) => `
      <article class="morning-card ${discipline.blocked && label === 'Bankroll' ? 'danger' : ''}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <p>${escapeHtml(detail)}</p>
      </article>
    `).join('');
    if (strip) {
      const imminent = rows
        .filter((row) => {
          const ts = Date.parse(row.start || '');
          return Number.isFinite(ts) && ts - Date.now() <= 30 * 60 * 1000 && ts > Date.now() - 30 * 60 * 1000;
        })
        .slice(0, 4);
      strip.innerHTML = imminent.length
        ? `<strong>À jouer maintenant</strong>${imminent.map((row) => `<button type="button" data-match-id="${escapeHtml(row.id)}">${escapeHtml(row.title)} · ${escapeHtml(row.label)} ${escapeHtml(formatOdd(row.odd))}</button>`).join('')}`
        : '<span>Aucun pick dans les 30 prochaines minutes.</span>';
    }
  }

  function renderCoachAdvice() {
    const grid = $('#coach-advice-grid');
    if (!grid) return;
    const prefs = loadPreferences();
    const stats = userBetStats();
    const audit = trackedLearningAudit();
    const todayBets = todayTrackedBets();
    const bankroll = Math.max(1, Number(prefs.bankroll || getBankroll() || 50));
    const cap = bankroll * Math.max(1, Number(prefs.dailyStakeCapPct || 20)) / 100;
    const stakedToday = todayBets.reduce((sum, bet) => sum + (Number(bet.stake || 0) || 0), 0);
    const lossStreak = currentLossStreak(stats);
    const warnings = audit.warnings || [];
    const cards = [
      {
        tone: prefs.coachEnabled === false ? 'warn' : 'ok',
        label: 'Coach',
        value: prefs.coachEnabled === false ? 'OFF' : 'ON',
        detail: prefs.coachEnabled === false ? 'Les clics ne sont plus filtrés par discipline personnelle.' : 'Contrôle avant chaque “Je mise”.'
      },
      {
        tone: todayBets.length >= Number(prefs.dailyBetLimit || 8) ? 'danger' : 'ok',
        label: 'Rythme du jour',
        value: `${formatCount(todayBets.length)}/${formatCount(prefs.dailyBetLimit || 8)}`,
        detail: 'Nombre de paris suivis aujourd’hui.'
      },
      {
        tone: stakedToday > cap ? 'danger' : stakedToday > cap * 0.75 ? 'warn' : 'ok',
        label: 'Mise jour',
        value: formatMoney(stakedToday),
        detail: `Cap coach ${formatMoney(cap)}.`
      },
      {
        tone: lossStreak >= Number(prefs.coachLossStreakConfirm || 3) ? 'warn' : 'ok',
        label: 'Streak',
        value: lossStreak ? `${formatCount(lossStreak)} pertes` : 'Calme',
        detail: lossStreak ? 'Confirmation demandée si tu continues.' : 'Pas de dérive émotionnelle détectée.'
      },
      {
        tone: warnings.length ? 'danger' : 'ok',
        label: 'Segment à éviter',
        value: warnings.length ? formatCount(warnings.length) : 'Aucun',
        detail: warnings[0]?.label || 'Aucun segment perdant robuste.'
      }
    ];
    grid.innerHTML = cards.map((card) => `
      <article class="morning-card coach-${escapeHtml(card.tone)}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `).join('');
  }

  function edgeBucketFor(edge) {
    const n = Number(edge || 0);
    if (n >= 0.15) return 'edge_15_plus';
    if (n >= 0.10) return 'edge_10_15';
    if (n >= 0.05) return 'edge_5_10';
    if (n > 0) return 'edge_0_5';
    return 'edge_none';
  }

  function displayStakeAmount(row) {
    if (!canDisplayStake(row)) return 0;
    const prefs = loadPreferences();
    const bankroll = getBankroll();
    const maxStake = bankroll * Math.max(0.1, Number(prefs.maxStakePct || 5)) / 100;
    if (prefs.stakeMode === 'flat') {
      return Math.max(0, Number((bankroll * Math.max(0.1, Number(prefs.flatUnitPct || 1)) / 100).toFixed(2)));
    }
    const modelStake = Math.max(0, Number(row?.stake || row?.decisionCenter?.stake || 0) || 0);
    return Math.max(0, Number(Math.min(modelStake, maxStake).toFixed(2)));
  }

  function bankrollDisciplineStatus(stats = userBetStats(), prefs = loadPreferences()) {
    const bankroll = Math.max(1, Number(prefs.bankroll || getBankroll() || 50));
    const stopLoss = bankroll * Math.max(0, Number(prefs.stopLossPct || 0)) / 100;
    const takeProfit = bankroll * Math.max(0, Number(prefs.takeProfitPct || 0)) / 100;
    if (stopLoss > 0 && stats.pnlToday <= -stopLoss) {
      return {
        blocked: true,
        tone: 'danger',
        label: 'Stop-loss actif',
        detail: `Perte jour ${formatMoney(stats.pnlToday)} · limite ${formatMoney(-stopLoss)}. Pause recommandée jusqu'à demain.`
      };
    }
    if (takeProfit > 0 && stats.pnlToday >= takeProfit) {
      return {
        blocked: true,
        tone: 'ok',
        label: 'Take-profit atteint',
        detail: `Gain jour ${formatMoney(stats.pnlToday)} · objectif ${formatMoney(takeProfit)}. Verrouillage discipline.`
      };
    }
    return {
      blocked: false,
      tone: 'ok',
      label: 'Discipline OK',
      detail: `${prefs.stakeMode === 'flat' ? 'Flat 1u' : 'Kelly plafonné'} · cap ${Number(prefs.maxStakePct || 5).toFixed(1)}% bankroll.`
    };
  }

  function todayTrackedBets() {
    const today = parisDayKey();
    return loadUserBets().filter((bet) => String(bet.day || bet.createdAt || '').slice(0, 10) === today);
  }

  function currentLossStreak(stats = userBetStats()) {
    return stats.streak?.status === 'lost' ? Number(stats.streak.count || 0) : 0;
  }

  function losingSegmentWarningsFor(row) {
    const audit = trackedLearningAudit();
    const sportKey = `sport:${row?.sport || 'inconnu'}`;
    const leagueKey = `league:${row?.league || 'inconnue'}`;
    const marketKey = `market:${marketKeyFromRow(row)}`;
    return (audit.warnings || []).filter((warning) => [sportKey, leagueKey, marketKey].includes(warning.key));
  }

  function displayedOddMemory(row) {
    const memory = readStorageJson(ODDS_MEMORY_KEY, {});
    return memory[userBetKey(row)] || null;
  }

  function rememberDisplayedOdds(rows) {
    const memory = readStorageJson(ODDS_MEMORY_KEY, {});
    const now = new Date().toISOString();
    (rows || []).slice(0, 80).forEach((row) => {
      const key = userBetKey(row);
      const odd = Number(row.odd || 0);
      if (!key || !(odd > 1)) return;
      const existing = memory[key] || {};
      memory[key] = {
        firstOdd: Number(existing.firstOdd || odd),
        lastOdd: odd,
        bestOdd: Math.max(Number(existing.bestOdd || odd), odd),
        seenAt: now
      };
    });
    writeStorageJson(ODDS_MEMORY_KEY, memory);
  }

  function coachDecisionForBet(row, stake) {
    const prefs = loadPreferences();
    if (!prefs.coachEnabled) return { allow: true, label: 'Coach désactivé', detail: '', warnings: [] };
    const stats = userBetStats();
    const todayBets = todayTrackedBets();
    const trackedToday = todayBets.length;
    const stakedToday = todayBets.reduce((sum, bet) => sum + (Number(bet.stake || 0) || 0), 0);
    const bankroll = Math.max(1, Number(prefs.bankroll || getBankroll() || 50));
    const dailyLimit = Math.max(1, Number(prefs.dailyBetLimit || 8) || 8);
    const dailyStakeCap = bankroll * Math.max(1, Number(prefs.dailyStakeCapPct || 20) || 20) / 100;
    if (trackedToday >= dailyLimit) {
      return {
        allow: false,
        tone: 'danger',
        label: 'Coach : limite jour atteinte',
        detail: `${formatCount(trackedToday)} pari(s) déjà suivis aujourd'hui · limite ${formatCount(dailyLimit)}.`,
        warnings: ['daily_limit']
      };
    }
    if (stakedToday + Number(stake || 0) > dailyStakeCap) {
      return {
        allow: false,
        tone: 'danger',
        label: 'Coach : cap mise jour dépassé',
        detail: `Mises jour ${formatMoney(stakedToday)} + ${formatMoney(stake)} > cap ${formatMoney(dailyStakeCap)}.`,
        warnings: ['daily_stake_cap']
      };
    }
    const memory = displayedOddMemory(row);
    if (memory && Number(memory.bestOdd || memory.firstOdd || 0) > 1 && Number(row.odd || 0) > 1) {
      const referenceOdd = Number(memory.bestOdd || memory.firstOdd);
      const drift = (Number(row.odd) - referenceOdd) / referenceOdd;
      if (drift <= -0.05) {
        return {
          allow: false,
          tone: 'warn',
          label: 'Coach : cote à rechecker',
          detail: `La cote a baissé de ${(Math.abs(drift) * 100).toFixed(1)}% depuis l'affichage. Relance le prix avant de suivre.`,
          warnings: ['price_moved_against']
        };
      }
    }
    const segmentWarnings = losingSegmentWarningsFor(row);
    if (segmentWarnings.length) {
      return {
        allow: false,
        tone: 'danger',
        label: 'Coach : segment perdant',
        detail: `${segmentWarnings[0].label} est négatif sur ton historique robuste.`,
        warnings: ['losing_segment', ...segmentWarnings.map((item) => item.key)]
      };
    }
    const lossStreak = currentLossStreak(stats);
    const threshold = Math.max(2, Number(prefs.coachLossStreakConfirm || 3) || 3);
    if (lossStreak >= threshold) {
      const key = userBetKey(row);
      const override = state.coachOverride;
      if (!override || override.key !== key || Date.now() - Number(override.at || 0) > 120000) {
        state.coachOverride = { key, at: Date.now() };
        return {
          allow: false,
          tone: 'warn',
          label: 'Coach : confirme le pari',
          detail: `${formatCount(lossStreak)} défaites de suite. Reclique sur “Je mise” dans les 2 minutes si tu confirmes.`,
          warnings: ['loss_streak_confirm']
        };
      }
    }
    const warnings = [];
    if (Number(row.edge || 0) < 0.05) warnings.push('edge_modere');
    return { allow: true, label: 'Coach OK', detail: 'Garde-fous personnels respectés.', warnings };
  }

  function clvPct(openOdd, closeOdd) {
    const open = Number(openOdd);
    const close = Number(closeOdd);
    if (!Number.isFinite(open) || !Number.isFinite(close) || open <= 1 || close <= 1) return null;
    return (open - close) / close;
  }

  function trackUserBet(row) {
    if (!row || !canDisplayStake(row)) return;
    const discipline = bankrollDisciplineStatus();
    if (discipline.blocked) {
      setSideStatus(discipline.label, discipline.tone === 'danger' ? 'danger' : 'warn');
      notifyUser(discipline.label, discipline.detail, row);
      return;
    }
    const key = userBetKey(row);
    const bets = loadUserBets();
    const existing = bets.find((bet) => bet.key === key && bet.status === 'pending');
    if (existing) {
      setSideStatus('Pari déjà suivi', 'warn');
      return;
    }
    const now = new Date();
    const stake = displayStakeAmount(row);
    const coach = coachDecisionForBet(row, stake);
    if (!coach.allow) {
      setSideStatus(coach.label, coach.tone === 'danger' ? 'danger' : 'warn');
      notifyUser(coach.label, coach.detail, row);
      return;
    }
    const prefs = loadPreferences();
    bets.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      key,
      matchId: row.id,
      sourceEventId: row.match?.id || row.match?.uid || null,
      winamaxMatchId: row.match?.winamax?.match_id || row.id || null,
      title: row.title,
      sport: row.sport,
      league: row.league,
      start: row.start,
      market: row.market,
      label: row.label,
      odd: Number(row.odd || 0),
      openingOdd: Number(row.odd || 0),
      lastSeenOdd: Number(row.odd || 0),
      lastSeenAt: now.toISOString(),
      closingOdd: null,
      clvPct: null,
      probability: Number(row.probability || 0),
      edge: Number(row.edge || 0),
      edgeBucket: edgeBucketFor(row.edge),
      tier: row.calibration?.level || row.contextQuality?.tier || row.status || 'standard',
      marketKey: marketKeyFromRow(row),
      stakeMode: prefs.stakeMode || 'kelly',
      stake,
      status: 'pending',
      pnl: 0,
      tags: [],
      note: '',
      coachWarnings: coach.warnings || [],
      day: parisDayKey(now),
      createdAt: now.toISOString()
    });
    saveUserBets(bets);
    renderUserPnl();
    renderPicks();
    renderStakeScenarios();
    renderHistory();
    setSideStatus('Pari ajouté au suivi', 'ok');
  }

  function comboKey(combo) {
    const legs = Array.isArray(combo?.legs) ? combo.legs : [];
    return `combo:${combo?.type || 'combine'}:${combo?.title || ''}:${legs.map((leg) => `${leg.id}:${leg.market}:${leg.label}`).join('|')}`;
  }

  function findComboByTrackKey(key) {
    return (state.combines || []).find((combo) => comboKey(combo) === key) || null;
  }

  function trackUserCombo(combo) {
    if (!combo || !Array.isArray(combo.legs) || !combo.legs.length) return;
    const discipline = bankrollDisciplineStatus();
    if (discipline.blocked) {
      setSideStatus(discipline.label, discipline.tone === 'danger' ? 'danger' : 'warn');
      notifyUser(discipline.label, discipline.detail);
      return;
    }
    const key = comboKey(combo);
    const bets = loadUserBets();
    const existing = bets.find((bet) => bet.key === key && bet.status === 'pending');
    if (existing) {
      setSideStatus('Combiné déjà suivi', 'warn');
      return;
    }
    const now = new Date();
    const stake = 10;
    const coach = coachDecisionForBet({ ...combo, id: key, market: 'Combiné', label: combo.title, odd: combo.totalOdd, edge: combo.edge, sport: 'multi', league: combo.sameGame ? 'Same-game' : 'Multi-match' }, stake);
    if (!coach.allow) {
      setSideStatus(coach.label, coach.tone === 'danger' ? 'danger' : 'warn');
      notifyUser(coach.label, coach.detail);
      return;
    }
    bets.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      key,
      matchId: key,
      title: combo.title || 'Combiné',
      sport: 'multi',
      league: combo.sameGame ? 'Same-game' : 'Multi-match',
      start: combo.legs[0]?.start || '',
      market: 'Combiné',
      label: combo.legs.map((leg) => leg.label).join(' + '),
      odd: Number(combo.totalOdd || 0),
      probability: Number(combo.combinedProb || combo.avgProb || 0),
      edge: Number(combo.edge || 0),
      edgeBucket: edgeBucketFor(combo.edge),
      tier: combo.type || 'combine',
      marketKey: 'combine',
      openingOdd: Number(combo.totalOdd || 0),
      lastSeenOdd: Number(combo.totalOdd || 0),
      lastSeenAt: now.toISOString(),
      closingOdd: null,
      clvPct: null,
      stake,
      status: 'pending',
      pnl: 0,
      tags: [],
      note: '',
      coachWarnings: coach.warnings || [],
      legs: combo.legs,
      day: parisDayKey(now),
      createdAt: now.toISOString()
    });
    saveUserBets(bets);
    renderUserPnl();
    renderCombines();
    renderHistory();
    setSideStatus('Combiné ajouté au suivi', 'ok');
  }

  function formatOdd(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 1 ? `@${n.toFixed(2)}` : '-';
  }

  function formatSignedUnits(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return `${n >= 0 ? '+' : ''}${n.toFixed(2)}u`;
  }

  function formatDateLabel(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('fr-FR', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  }

  function formatDayKey(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    });
  }

  function formatCount(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString('fr-FR') : '-';
  }

  function sourceTone(source) {
    const age = Number(source && source.age_min);
    const status = String(source && source.status || '').toLowerCase();
    if (status.includes('retained') || (Number.isFinite(age) && age > 1440)) return 'danger';
    if (Number.isFinite(age) && age > 240) return 'warn';
    if (Number.isFinite(age)) return 'ok';
    return 'idle';
  }

  function sourceToneLabel(tone) {
    if (tone === 'ok') return 'Frais';
    if (tone === 'warn') return 'Vieillit';
    if (tone === 'danger') return 'Ancien';
    return 'Inconnu';
  }

  function refreshModeLabel(mode) {
    if (mode === 'signals') return 'Signaux lents';
    if (mode === 'full') return 'Refresh complet';
    if (mode === 'prematch') return 'Pré-match final';
    if (mode === 'prematch_t60') return 'Pré-match T-60';
    if (mode === 'prematch_t30') return 'Pré-match T-30';
    if (mode === 'prematch_t10') return 'Pré-match T-10';
    if (mode === 'critical') return 'File critique';
    if (mode === 'repair_context') return 'Réparer contexte';
    return 'Refresh rapide';
  }

  function signalSourceLabel(source) {
    const labels = {
      all: 'Tous signaux',
      weather: 'Météo',
      referees: 'Arbitres',
      referees_soccer: 'Arbitres foot',
      injuries: 'Blessures',
      injuries_soccer: 'Blessures foot',
      injuries_multisport: 'Blessures multi-sport',
      lineups: 'Lineups',
      lineups_soccer: 'Compos foot',
      lineups_multisport: 'Compos multi-sport',
      team_form: 'Forme équipes',
      form_stats_extended: 'Forme étendue',
      team_stats: 'Stats équipes',
      clubelo: 'Force équipe/Elo',
      h2h: 'H2H',
      h2h_extended: 'Historique H2H',
      context: 'Contexte match',
      match_context: 'Contexte match',
      odds: 'Cotes',
      xg_team_stats: 'xG équipes',
      fbref_xg: 'xG football',
      scorer_quality: 'Buteurs'
    };
    return labels[source] || labels.all;
  }

  function sourceRefreshSummary(status, source) {
    if (!source) return '';
    const lastByMode = status.refresh?.lastByMode || {};
    const direct = lastByMode[`signals:${source}`] || null;
    const all = lastByMode.signals?.source === 'all' ? lastByMode.signals : null;
    const summary = direct || all;
    if (!summary) return 'Dernier refresh source : jamais lancé ici';
    const ok = summary.exitCode === 0 && !summary.error;
    const sourceLabel = direct ? signalSourceLabel(source) : 'Tous signaux';
    return `${sourceLabel} : ${ok ? 'OK' : 'erreur'} · ${formatDateTime(summary.finishedAt || summary.startedAt)}`;
  }

  function medianDuration(values) {
    const numbers = values.map(Number).filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
    if (!numbers.length) return null;
    const mid = Math.floor(numbers.length / 2);
    return numbers.length % 2 ? numbers[mid] : (numbers[mid - 1] + numbers[mid]) / 2;
  }

  function estimateRefreshTotalSeconds(refresh) {
    const mode = refresh?.mode || 'quick';
    const source = refresh?.source || 'all';
    const lastByMode = refresh?.lastByMode || {};
    const history = Array.isArray(refresh?.history) ? refresh.history : [];
    const historyDurations = history
      .filter((entry) => entry && entry.mode === mode && (mode !== 'signals' || !source || source === 'all' || entry.source === source))
      .slice(0, 6)
      .map((entry) => entry.durationSec);
    const directKey = mode === 'signals' && source && source !== 'all' ? `signals:${source}` : mode;
    const summaryDuration = Number(lastByMode[directKey]?.durationSec || lastByMode[mode]?.durationSec || 0);
    const learned = medianDuration([summaryDuration, ...historyDurations]);
    const fallback = REFRESH_ESTIMATE_SECONDS[mode] || REFRESH_ESTIMATE_SECONDS.quick;
    if (learned) return Math.max(30, Math.round(learned * 1.18));
    return fallback;
  }

  function refreshEtaInfo(refresh) {
    if (!refresh?.running) return { running: false };
    const startedMs = Date.parse(refresh.startedAt || '');
    const elapsedSec = Number.isFinite(startedMs) ? Math.max(0, (Date.now() - startedMs) / 1000) : 0;
    const totalSec = estimateRefreshTotalSeconds(refresh);
    const remainingSec = Math.max(0, totalSec - elapsedSec);
    const overdue = elapsedSec > totalSec + 5;
    const progressPct = overdue ? 96 : Math.max(4, Math.min(94, (elapsedSec / Math.max(1, totalSec)) * 100));
    const source = refresh.mode === 'signals' && refresh.source ? ` · ${signalSourceLabel(refresh.source)}` : '';
    return {
      running: true,
      mode: refresh.mode || 'quick',
      title: `${refreshModeLabel(refresh.mode || 'quick')}${source}`,
      elapsedSec,
      totalSec,
      remainingSec,
      overdue,
      progressPct
    };
  }

  function renderRefreshEta(refresh) {
    const wrap = $('#refresh-eta');
    if (!wrap) return;
    const info = refreshEtaInfo(refresh);
    if (!info.running) {
      wrap.classList.add('hidden');
      const bar = $('#refresh-eta-bar');
      if (bar) bar.style.width = '0%';
      return;
    }
    wrap.classList.remove('hidden');
    const remainingLabel = info.overdue
      ? 'Estimation dépassée, refresh toujours actif'
      : `Temps restant estimé : ${formatDurationSeconds(info.remainingSec)}`;
    const detail = info.overdue
      ? `Écoulé ${formatDurationSeconds(info.elapsedSec)} · prévu ${formatDurationSeconds(info.totalSec)} · certains signaux réseau peuvent être lents.`
      : `Écoulé ${formatDurationSeconds(info.elapsedSec)} · durée prévue ${formatDurationSeconds(info.totalSec)} · estimation ajustée avec l'historique local.`;
    const title = $('#refresh-eta-title');
    const remaining = $('#refresh-eta-remaining');
    const detailNode = $('#refresh-eta-detail');
    const bar = $('#refresh-eta-bar');
    if (title) title.textContent = `${info.title} en cours`;
    if (remaining) remaining.textContent = remainingLabel;
    if (detailNode) detailNode.textContent = detail;
    if (bar) bar.style.width = `${info.progressPct.toFixed(0)}%`;
  }

  function markFirstPickVisible(rowCount) {
    if (!rowCount || state.firstPickRenderedAt) {
      renderBootPerformance();
      return;
    }
    state.firstPickRenderedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    renderBootPerformance();
  }

  function renderBootPerformance() {
    const totalNode = $('#metric-boot-time');
    const subNode = $('#metric-boot-sub');
    if (!totalNode || !subNode) return;
    if (!state.firstPickRenderedAt) {
      totalNode.textContent = '...';
      subNode.textContent = 'Premier pick en cours';
      return;
    }
    const base = state.windowLoadedAt && state.windowLoadedAt <= state.firstPickRenderedAt
      ? state.windowLoadedAt
      : state.bootStartedAt;
    const elapsedMs = Math.max(0, state.firstPickRenderedAt - base);
    totalNode.textContent = `${(elapsedMs / 1000).toFixed(2)}s`;
    subNode.textContent = elapsedMs <= 2000
      ? 'Picks visibles sous 2s'
      : 'Picks visibles, cache local conseillé';
  }

  function upcomingPickWithin(ms) {
    const now = Date.now();
    const rows = [...(state.picks || []), ...(state.allPicks || []), ...(state.watchlist || [])];
    return rows.some((row) => {
      const ts = Date.parse(row?.start || row?.date || '');
      return Number.isFinite(ts) && ts > now && ts - now <= ms;
    });
  }

  function nextRefreshPlan() {
    if (document.hidden && state.hiddenSince && Date.now() - state.hiddenSince > REFRESH_ECONOMY_AFTER_MS) {
      return {
        delayMs: null,
        mode: 'pause',
        label: 'Mode économie : reprise quand la fenêtre revient au premier plan.'
      };
    }
    if (upcomingPickWithin(60 * 60 * 1000)) {
      return {
        delayMs: REFRESH_URGENT_INTERVAL_MS,
        mode: 'quick',
        label: 'Auto-refresh boost 5 min : match proche.'
      };
    }
    return {
      delayMs: REFRESH_DEFAULT_INTERVAL_MS,
      mode: 'quick',
      label: 'Auto-refresh 30 min.'
    };
  }

  function renderRefreshPolicy() {
    const plan = nextRefreshPlan();
    const policyNode = $('#refresh-policy');
    const nextNode = $('#metric-refresh-next');
    if (policyNode) policyNode.textContent = plan.label;
    if (nextNode) {
      if (!plan.delayMs) {
        nextNode.textContent = 'Prochain refresh : pause économie';
      } else if (state.backgroundRefreshNextAt) {
        const remaining = Math.max(0, Math.round((state.backgroundRefreshNextAt - Date.now()) / 1000));
        nextNode.textContent = `Prochain refresh : ${formatDurationSeconds(remaining)}`;
      } else {
        nextNode.textContent = `Prochain refresh : ${formatDurationSeconds(plan.delayMs / 1000)}`;
      }
    }
  }

  function readActionHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(ACTION_HISTORY_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter((row) => row && row.id).slice(0, 30) : [];
    } catch {
      return [];
    }
  }

  function writeActionHistory(rows) {
    const next = Array.isArray(rows) ? rows.slice(0, 30) : [];
    state.actionHistory = next;
    try {
      localStorage.setItem(ACTION_HISTORY_KEY, JSON.stringify(next));
    } catch {
      // localStorage peut être indisponible sur certains profils Electron durcis.
    }
  }

  function actionLaunchLabel(mode, source, title) {
    if (title) return title;
    if (mode === 'signals') return `Rafraîchir ${signalSourceLabel(source)}`;
    return refreshModeLabel(mode);
  }

  function recordActionHistory(record) {
    const rows = readActionHistory().filter((row) => row.id !== record.id);
    writeActionHistory([record, ...rows]);
    renderActionHistory();
  }

  function updateActionHistory(id, patch) {
    const rows = readActionHistory();
    const index = rows.findIndex((row) => row.id === id);
    if (index < 0) return;
    rows[index] = { ...rows[index], ...patch };
    writeActionHistory(rows);
    renderActionHistory();
  }

  function firstNextAction() {
    const ready = Number(state.decisionCenter?.summary?.ready || 0);
    if (ready > 0) {
      return { mode: 'prematch_t10', source: 'all', priority: 'ready', title: 'Finaliser T-10' };
    }
    const blockers = Number(state.prebetChecklist?.summary?.blockers || 0);
    const critical = Number(state.criticalIssueReport?.summary?.critical || 0);
    if (blockers > 0 || critical > 0 || state.criticalIssueReport?.summary?.blocks_bet) {
      return { mode: 'critical', source: 'all', priority: 'critical', title: 'File critique' };
    }
    const repair = state.contextRepairPlan?.summary || {};
    if (Number(repair.repair_actions || 0) > 0 || Number(repair.weak_matches || 0) > 0) {
      return { mode: 'repair_context', source: 'all', priority: 'high', title: 'Réparer contexte' };
    }
    const nearPrematch = Number(state.prematchPlan?.autoDue || 0);
    if (nearPrematch > 0) {
      return { mode: 'prematch_t10', source: 'all', priority: 'medium', title: 'Pré-match T-10' };
    }
    const queue = Array.isArray(state.refreshPriorityPlan?.queue) ? state.refreshPriorityPlan.queue : [];
    if (queue[0]) return queue[0];
    const actions = Array.isArray(state.nextActions?.actions) ? state.nextActions.actions : [];
    return actions[0] || { mode: 'quick', source: 'all', priority: 'low', title: 'Refresh rapide' };
  }

  function compactMatchKey(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');
  }

  function matchRowKeys(row) {
    const values = [
      row?.id,
      row?.match_id,
      row?.match?.id,
      row?.match?.event_id,
      row?.match?.winamax?.match_id,
      String(row?.match_id || '').replace(/^wnx:/, '')
    ];
    const out = new Set(values.map((value) => String(value || '').replace(/^wnx:/, '')).filter(Boolean));
    const title = row?.title || row?.match;
    if (title) out.add(`title:${compactMatchKey(title)}`);
    return out;
  }

  function findMatchRow(idOrTitle) {
    const wanted = new Set([String(idOrTitle || ''), String(idOrTitle || '').replace(/^wnx:/, '')]);
    if (idOrTitle) wanted.add(`title:${compactMatchKey(idOrTitle)}`);
    const rows = [...state.picks, ...state.allPicks, ...state.matches];
    return rows.find((row) => {
      const keys = matchRowKeys(row);
      return [...wanted].some((key) => keys.has(key));
    }) || null;
  }


  function calibrationNote(row) {
    const calibration = row && row.calibration;
    if (!calibration || !calibration.label || calibration.level === 'unknown') return '';
    const cls = calibration.level === 'cold' ? 'calibration-cold' : calibration.level === 'warm' ? 'calibration-warm' : 'calibration-neutral';
    return `<div class="match-sub calibration-note ${cls}">${escapeHtml(calibration.label)}</div>`;
  }

  function pickReason(row) {
    const reasons = [];
    if (row?.decisionCenter?.mainReason && !row.decisionCenter.canBet) reasons.push(row.decisionCenter.mainReason);
    if (Number(row?.edge) > 0) reasons.push(`edge ${formatPct(row.edge, 1)}`);
    if (Number(row?.probability) > 0) reasons.push(`proba ${formatPct(row.probability, 1)}`);
    if (Number(row?.stake) > 0) reasons.push(`Kelly ${formatMoney(row.stake)}`);
    if (row?.contextQuality?.score != null) reasons.push(`contexte ${Math.round(Number(row.contextQuality.score))}/100`);
    if (row?.confidenceTrust?.score != null) reasons.push(`confiance ${Math.round(Number(row.confidenceTrust.score))}/100`);
    if (row?.calibration?.level && row.calibration.level !== 'unknown') {
      reasons.push(`${calibrationLevelLabel(row.calibration.level).toLowerCase()} ${formatCount(row.calibration.sample || 0)}`);
    }
    if (row?.calibration?.edgeBucket?.level === 'warm') reasons.push('edge bucket chaud');
    if (row?.marketTiming?.tone === 'cold') reasons.push('marché à surveiller');
    if (row?.marketTiming?.tone === 'warm') reasons.push('CLV favorable');
    if (row?.stakeAdjustment?.applied) reasons.push(`mise réduite x${Number(row.stakeAdjustment.factor || 1).toFixed(2)}`);
    return reasons.length ? `Pourquoi : ${reasons.slice(0, 4).join(' · ')}` : 'Pourquoi : lecture modèle disponible dans la fiche.';
  }

  function calibrationRiskClass(level) {
    if (level === 'cold') return 'cold';
    if (level === 'warm') return 'warm';
    if (level === 'tracked') return 'tracked';
    return 'sample';
  }

  function formatDateTime(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDurationSeconds(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    if (n < 60) return `${n.toFixed(n < 10 ? 1 : 0)}s`;
    const minutes = Math.floor(n / 60);
    const seconds = Math.round(n % 60);
    return `${minutes}m${String(seconds).padStart(2, '0')}s`;
  }

  function safeExternalUrl(value, expectedHost) {
    try {
      const url = new URL(String(value || ''));
      if (url.protocol !== 'https:') return '';
      if (expectedHost && url.hostname !== expectedHost) return '';
      return url.href;
    } catch {
      return '';
    }
  }

  function getSides(match) {
    const competitors = Array.isArray(match && match.competitors) ? match.competitors : [];
    return {
      home: competitors.find((c) => c && c.home_away === 'home') || competitors[0] || {},
      away: competitors.find((c) => c && c.home_away === 'away') || competitors[1] || {}
    };
  }

  function getBankroll() {
    const prefs = loadPreferences();
    const raw = Number($('#bankroll-input')?.value || localStorage.getItem('userBankroll') || prefs.bankroll || 50);
    return Number.isFinite(raw) && raw > 0 ? raw : 50;
  }

  function setSideStatus(label, tone) {
    const dotClass = tone === 'ok' ? 'dot-ok' : tone === 'warn' ? 'dot-warn' : tone === 'danger' ? 'dot-danger' : 'dot-idle';
    $('#side-status').innerHTML = `<span class="dot ${dotClass}"></span><span>${escapeHtml(label)}</span>`;
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, { cache: 'no-store', ...options });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function eventListFromDays(days) {
    const events = [];
    if (!days || typeof days !== 'object') return events;
    Object.entries(days).forEach(([dayKey, dayValue]) => {
      const rows = Array.isArray(dayValue)
        ? dayValue
        : Array.isArray(dayValue && dayValue.events)
          ? dayValue.events
          : [];
      rows.forEach((event) => events.push({ ...event, __dayKey: dayKey }));
    });
    return events;
  }

  function getTeamNames(match) {
    const { home, away } = getSides(match);
    return {
      home: home.name || match.home || match.homeTeam || 'Domicile',
      away: away.name || match.away || match.awayTeam || 'Extérieur'
    };
  }

  function cleanLabel(value, fallback = '-') {
    if (value == null || value === '') return fallback;
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (Array.isArray(value)) return value.map((item) => cleanLabel(item, '')).filter(Boolean).join(', ') || fallback;
    if (typeof value === 'object') {
      return cleanLabel(
        value.label ?? value.name ?? value.title ?? value.pick ?? value.side ?? value.key ?? value.market,
        fallback
      );
    }
    return fallback;
  }

  function cleanExplanation(value) {
    if (!value) return 'Le moteur ne fournit pas encore de texte détaillé pour ce match.';
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map((item) => cleanLabel(item, '')).filter(Boolean).join(' · ') || 'Lecture structurée disponible.';
    if (typeof value === 'object') {
      const parts = Object.entries(value)
        .slice(0, 5)
        .map(([key, val]) => `${key}: ${cleanLabel(val, '')}`)
        .filter((part) => !part.endsWith(': '));
      return parts.join(' · ') || 'Lecture structurée disponible.';
    }
    return String(value);
  }

  function formLetters(side) {
    const last = Array.isArray(side?.last5) ? side.last5 : [];
    if (last.length) {
      return last.map((row) => {
        if (typeof row?.result === 'string') return row.result.slice(0, 1).toUpperCase();
        if (row?.won === true) return 'W';
        if (row?.won === false && Number(row?.score_for) === Number(row?.score_against)) return 'D';
        if (row?.won === false) return 'L';
        return '';
      }).filter(Boolean).slice(-5);
    }
    return String(side?.team_form_l5 || side?.form || '').slice(0, 5).split('').filter(Boolean);
  }

  function formStripHtml(match) {
    const { home, away } = getSides(match || {});
    const render = (label, letters) => `
      <div class="form-strip-row">
        <span>${escapeHtml(label)}</span>
        <div>${letters.map((letter) => `<strong class="form-${escapeHtml(letter.toLowerCase())}">${escapeHtml(letter === 'W' ? 'V' : letter === 'D' ? 'N' : letter === 'L' ? 'D' : letter)}</strong>`).join('') || '<em>Forme indisponible</em>'}</div>
      </div>
    `;
    return `<div class="form-strip">${render(home.name || 'Domicile', formLetters(home))}${render(away.name || 'Extérieur', formLetters(away))}</div>`;
  }

  function pickNarrative(row, signalPreview, fallback) {
    const parts = [];
    const context = row?.contextQuality?.score ?? row?.match?.context?.quality?.score;
    parts.push(`${row.market || 'Marché'} : ${row.label || 'pick'} ${formatOdd(row.odd)} avec ${formatPct(row.edge || 0, 1)} d'edge modèle.`);
    if (Number.isFinite(Number(context))) {
      parts.push(`Le contexte est noté ${Math.round(Number(context))}/100, donc la mise reste proportionnée à la qualité réelle des signaux.`);
    }
    const okSignals = (signalPreview || []).filter((signal) => signal.ok).map((signal) => signal.label).slice(0, 3);
    const missing = (signalPreview || []).filter((signal) => !signal.ok).map((signal) => signal.label).slice(0, 2);
    if (okSignals.length) parts.push(`Signaux utiles présents : ${okSignals.join(', ')}.`);
    if (missing.length) parts.push(`À vérifier avant de miser : ${missing.join(', ')}.`);
    if (parts.length < 3 && fallback) parts.push(fallback);
    return parts.slice(0, 4).join(' ');
  }

  function normalizePickLabel(match, market, value, fallback = 'Pick') {
    const raw = cleanLabel(value, fallback);
    const compact = raw.trim();
    const teams = getTeamNames(match);
    const sidePrefix = compact.match(/^(1|2|n|x)\s*[-:]\s*(.+)$/i);
    if (sidePrefix && sidePrefix[2]) return sidePrefix[2].trim();

    const key = compact.toLowerCase();
    const marketKey = String(market || '').toLowerCase();
    if (marketKey === '1n2' || marketKey === 'vainqueur' || marketKey === 'matchwinner') {
      if (key === '1' || key === 'home' || key === 'domicile') return teams.home;
      if (key === '2' || key === 'away' || key === 'exterieur' || key === 'extérieur') return teams.away;
      if (key === 'n' || key === 'x' || key === 'draw' || key === 'nul') return 'Nul';
    }

    if (key === 'over') return 'Plus';
    if (key === 'under') return 'Moins';
    if (key === 'yes') return 'Oui';
    if (key === 'no') return 'Non';
    return compact || fallback;
  }

  function isUpcoming(match) {
    if (!match || match.completed) return false;
    const ts = Date.parse(match.date || match.startDate || '');
    return Number.isFinite(ts) && ts > Date.now() - 30 * 60000;
  }

  function isBookable(match) {
    const winamax = match && match.winamax;
    return Boolean(winamax && winamax.available === true && winamax.match_id && winamax.markets && winamax.markets['1n2']);
  }

  function bestFromPrediction(win, match, pred) {
    const api = win.__testAPI || {};
    let best = null;
    try {
      if (typeof api._agentBestPick === 'function') best = api._agentBestPick(match, pred);
    } catch {
      best = null;
    }
    const odd = Number(best && (best.odd ?? best.odds)) || Number(pred && pred.odds) || 0;
    const prob = Number(best && (best.prob ?? best.reliability)) || Number(pred && (pred.reliability ?? pred.prob)) || 0;
    const edge = Number(best && best.edge);
    const computedEdge = Number.isFinite(edge) ? edge : (odd > 1 && prob > 0 ? prob - (1 / odd) : 0);
    const rawMarket = cleanLabel((best && (best.marketLabel || best.market || best.key)) || (pred && pred.market), '1N2');
    const market = formatMarketName(rawMarket);
    const rawLabel = (best && (best.label || best.pickLabel || best.pick || best.pickKey || best.key || best.side)) ||
      (pred && (pred.pick || pred.pickKey || pred.key || pred.side));
    const label = normalizePickLabel(match, market, rawLabel, 'Pick');
    return { best, odd, prob, edge: computedEdge, market, label };
  }

  function formatMarketName(value) {
    const key = String(value || '').trim();
    const normalized = key.toLowerCase().replace(/[\s_-]+/g, '');
    const labels = {
      '1n2': '1N2',
      'matchwinner': 'Vainqueur',
      'teamtotal': 'Total équipe',
      'basketballtotal': 'Total basket',
      'baskettotal': 'Total basket',
      'hockeytotal': 'Total buts',
      'baseballtotal': 'Total runs',
      'httotal': 'Total mi-temps',
      'htou': 'Total mi-temps',
      'halftimetotal': 'Total mi-temps',
      'ht1n2': '1N2 mi-temps',
      'btts': 'BTTS',
      'resultbtts': 'Résultat + BTTS',
      'doublechance': 'Double chance',
      'handicap': 'Handicap',
      'dnb': 'Remboursé si nul',
      'exactscore': 'Score exact',
      'ou': 'Over/Under',
      'ou15': 'O/U 1.5',
      'ou25': 'O/U 2.5',
      'ou35': 'O/U 3.5',
      'tennisgames': 'Jeux tennis',
      'tennissets': 'Sets tennis'
    };
    if (labels[normalized]) return labels[normalized];
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\bou(\d)(\d)\b/i, 'O/U $1.$2')
      .replace(/\bht\b/i, 'MT')
      .trim() || 'Marché';
  }

  function stakeFor(win, probability, odd, bankroll) {
    if (!(probability > 0) || !(odd > 1) || !(bankroll > 0)) return 0;
    let fraction = 0;
    try {
      if (typeof win.kellyFraction === 'function') {
        fraction = Number(win.kellyFraction(probability, odd, 0.25, 0.10)) || 0;
      }
    } catch {
      fraction = 0;
    }
    if (!(fraction > 0)) return 0;
    return Math.max(0, Math.min(bankroll * fraction, bankroll * 0.10));
  }

  function dedupeUpcomingBookable(events) {
    const seenMatches = new Set();
    return events
      .filter(isUpcoming)
      .filter(isBookable)
      .filter((match) => {
        const key = match?.winamax?.match_id
          ? `wnx:${match.winamax.match_id}`
          : `raw:${match?.id || match?.uid || match?.date || ''}:${match?.name || match?.shortName || ''}`;
        if (seenMatches.has(key)) return false;
        seenMatches.add(key);
        return true;
      });
  }

  function analyzeMatch(win, match, bankroll) {
    const teams = getTeamNames(match);
    let pred = null;
    let best = null;
    let stake = 0;
    let status = 'skip';
    let statusLabel = 'Aucune mise';
    let marketLabel = 'Analyse';
    let pickLabel = 'Aucune mise';
    try {
      pred = win.predictMatch(match);
      if (pred && !pred.skip) {
        best = bestFromPrediction(win, match, pred);
        if (best) {
          marketLabel = best.market;
          pickLabel = best.label;
          stake = stakeFor(win, best.prob, best.odd, bankroll);
        } else {
          marketLabel = formatMarketName(pred.market || '1n2');
          pickLabel = normalizePickLabel(match, marketLabel, pred.pick, 'À surveiller');
        }
        if (best && best.edge > 0 && stake > 0) {
          status = best.edge >= 0.08 ? 'bet' : 'watch';
          statusLabel = best.edge >= 0.08 ? 'Priorité' : 'Jouable';
        } else {
          statusLabel = 'À surveiller';
        }
      }
    } catch {
      status = 'skip';
      statusLabel = 'Erreur modèle';
      marketLabel = 'Analyse';
      pickLabel = 'Erreur modèle';
    }
    return {
      id: String(match.winamax?.match_id || match.id || match.uid || `${match.date}-${teams.home}-${teams.away}`),
      match,
      pred,
      title: `${teams.home} - ${teams.away}`,
      sport: match.sport || 'sport',
      league: match.league_name || match.league_code || '',
      start: match.date || '',
      market: marketLabel,
      label: pickLabel,
      odd: best ? best.odd : 0,
      probability: best ? best.prob : Number(pred && (pred.reliability ?? pred.prob)) || 0,
      edge: best ? best.edge : 0,
      stake,
      status,
      statusLabel,
      winamaxUrl: match.winamax && match.winamax.url
    };
  }

  async function computePicks() {
    const status = state.status;
    if (status && status.ageMinutes > 240 && !Number(status.counts?.bookable || 0)) {
      state.picks = [];
      state.allPicks = [];
      state.matches = [];
      state.combines = [];
      state.scorers = [];
      state.watchlist = [];
      state.history = null;
      state.coverage = null;
      state.agent = null;
      state.contextSummary = null;
      state.signalGaps = [];
      state.contextBacktest = null;
      state.decisionBacktest = null;
      state.decisionTuning = null;
      state.decisionShadow = null;
      state.oddsGuardrails = null;
      state.agentBlockerBacktest = null;
      state.agentGuardrailRecommendations = null;
      state.stakeReductionBacktest = null;
      state.signalConflictBacktest = null;
      state.scorerQuality = null;
      state.scorerCandidates = null;
      state.scorerSettlement = null;
      state.scorerPendingAudit = null;
      state.prematchFocus = null;
      state.prematchExecution = null;
      state.signalCoverageTrend = null;
      state.nextActions = null;
      state.sourceFreshnessPlan = null;
      state.contextRepairPlan = null;
      state.refreshPriorityPlan = null;
      state.prebetChecklist = null;
      state.prebetChecklistBacktest = null;
      state.teamIdentityGraph = null;
      state.matchDecisionTimeline = null;
      state.agentBankrollSimulation = null;
      state.smartPreparePlan = null;
      state.sourceRegistry = null;
      state.sourceQuarantine = null;
      state.optionalSourcesPlan = null;
      state.criticalIssueReport = null;
      state.dataConsistencyReport = null;
      state.uiIntegrityReport = null;
      state.pickIntegrityReport = null;
      state.coverageRepairEngine = null;
      state.sourceCoverageTargets = null;
      state.leagueSignalQuality = null;
      state.modelLab = null;
      state.probabilityCalibration = null;
      state.policyCandidates = null;
      state.sourceHealth = null;
      state.decisionCenter = null;
      state.agentBlockers = null;
      state.clvSummary = null;
      state.dashboardMeta = null;
      state.prematchPlan = null;
      renderPicks('Données trop anciennes : le logiciel bloque les recommandations actionnables.');
      renderStakeScenarios('Scénarios bloqués : données trop anciennes.');
      renderCombines();
      renderPreferences();
      renderScorers();
      renderScorerReport();
      renderScorerPendingAudit();
      renderWatchlist();
      renderPrematchFinal();
      renderPrematchExecution();
      renderMatches();
      renderHistory();
      renderAgent(null);
      renderAgentGuardrailRecommendations();
      renderStakeReductionBacktest();
      renderLeagueMarketReductions();
      renderSignalConflictBacktest();
      renderContextBacktest();
      renderDecisionBacktest();
      renderDecisionTuning();
      renderPrebetChecklist();
      renderSourceFreshnessPlan();
      renderRefreshPriorityPlan();
      renderContextRepairPlan();
      renderSmartPreparePlan();
      renderAgentSimulation();
      renderSourceRegistryCenter();
      renderTeamIdentityGraph();
      renderOptionalSourcesPlan();
      renderSmartPreparePlanData();
      renderCriticalIssues();
      renderIntegrityReports();
      renderCoverageRepairEngine();
      renderModelLabV4();
      renderSourceHealthV4();
      renderActionHistory();
      renderPrebetChecklistBacktest();
      renderFinalDecisionPanel();
      renderCalendar();
      renderHelp();
      updateWebEnrichmentSummary();
      renderActiveModelAdjustments();
      renderLearningFeedback();
      if (state.status) renderPipelinePanel(state.status);
      return;
    }
    const bankroll = getBankroll();
    const analysis = await fetchJson(`/api/engine/analysis?bankroll=${encodeURIComponent(bankroll)}`);
    state.engineReady = true;
    state.matches = Array.isArray(analysis.matches) ? analysis.matches : [];
    state.allPicks = Array.isArray(analysis.picks) ? analysis.picks : [];
    state.picks = Array.isArray(analysis.dashboardPicks) ? analysis.dashboardPicks : state.allPicks;
    state.combines = Array.isArray(analysis.combines) ? analysis.combines : [];
    state.scorers = Array.isArray(analysis.scorers) ? analysis.scorers : [];
    state.watchlist = Array.isArray(analysis.watchlist) ? analysis.watchlist : [];
    state.history = analysis.history || null;
    state.coverage = analysis.coverage || null;
    state.agent = analysis.agent || null;
    state.calibration = analysis.calibration || null;
    state.contextSummary = analysis.context || null;
    state.signalGaps = Array.isArray(analysis.signalGaps) ? analysis.signalGaps : [];
    state.contextBacktest = analysis.contextBacktest || null;
    state.decisionBacktest = analysis.decisionBacktest || null;
    state.decisionTuning = analysis.decisionTuning || null;
    state.decisionShadow = analysis.decisionShadow || null;
    state.oddsGuardrails = analysis.oddsGuardrails || null;
    state.agentBlockerBacktest = analysis.agentBlockerBacktest || null;
    state.agentGuardrailRecommendations = analysis.agentGuardrailRecommendations || null;
    state.stakeReductionBacktest = analysis.stakeReductionBacktest || null;
    state.signalConflictBacktest = analysis.signalConflictBacktest || null;
    state.scorerQuality = analysis.scorerQuality || null;
    state.scorerCandidates = analysis.scorerCandidates || null;
    state.scorerSettlement = analysis.scorerSettlement || null;
    state.scorerPendingAudit = analysis.scorerPendingAudit || null;
    state.prematchFocus = analysis.prematchFocus || null;
    state.prematchExecution = analysis.prematchExecution || null;
    state.signalCoverageTrend = analysis.signalCoverageTrend || null;
    state.nextActions = analysis.nextActions || null;
    state.sourceFreshnessPlan = analysis.sourceFreshnessPlan || null;
    state.contextRepairPlan = analysis.contextRepairPlan || null;
    state.refreshPriorityPlan = analysis.refreshPriorityPlan || null;
    state.prebetChecklist = analysis.prebetChecklist || null;
    state.prebetChecklistBacktest = analysis.prebetChecklistBacktest || null;
    state.teamIdentityGraph = analysis.teamIdentityGraph || null;
    state.matchDecisionTimeline = analysis.matchDecisionTimeline || null;
    state.agentBankrollSimulation = analysis.agentBankrollSimulation || null;
    state.smartPreparePlan = analysis.smartPreparePlan || null;
    state.sourceRegistry = analysis.sourceRegistry || null;
    state.sourceQuarantine = analysis.sourceQuarantine || null;
    state.optionalSourcesPlan = analysis.optionalSourcesPlan || null;
    state.criticalIssueReport = analysis.criticalIssueReport || null;
    state.dataConsistencyReport = analysis.dataConsistencyReport || null;
    state.uiIntegrityReport = analysis.uiIntegrityReport || null;
    state.pickIntegrityReport = analysis.pickIntegrityReport || null;
    state.coverageRepairEngine = analysis.coverageRepairEngine || null;
    state.sourceCoverageTargets = analysis.sourceCoverageTargets || null;
    state.leagueSignalQuality = analysis.leagueSignalQuality || null;
    state.modelLab = analysis.modelLab || null;
    state.probabilityCalibration = analysis.probabilityCalibration || null;
    state.policyCandidates = analysis.policyCandidates || null;
    state.sourceHealth = analysis.sourceHealth || null;
    state.decisionCenter = analysis.decisionCenter || null;
    state.agentBlockers = analysis.agentBlockers || null;
    state.clvSummary = analysis.clvSummary || null;
    state.dashboardMeta = analysis.dashboardMeta || null;
    state.prematchPlan = analysis.prematchPlan || null;
    refreshTrackedBetMarketData();
    await autoSettleUserBets('engine_refresh');
    $('#metric-upcoming').textContent = String(state.matches.length);
    $('#metric-bookable').textContent = `${state.matches.length} analysés par le logiciel`;
    renderPicks();
    renderStakeScenarios();
    renderCombines();
    renderPreferences();
    renderScorers();
    renderScorerReport();
    renderScorerPendingAudit();
    renderWatchlist();
    renderPrematchFinal();
    renderPrematchExecution();
    renderMatches();
    renderHistory();
    renderContextBacktest();
    renderDecisionBacktest();
    renderDecisionTuning();
    renderAgent(state.agent);
    renderAgentGuardrailRecommendations();
    renderStakeReductionBacktest();
    renderLeagueMarketReductions();
    renderSignalConflictBacktest();
    renderPrebetChecklist();
    renderPrebetChecklistBacktest();
    renderFinalDecisionPanel();
    renderSmartPreparePlan();
    renderAgentSimulation();
    renderCalendar();
    renderHelp();
    updateWebEnrichmentSummary();
    renderActiveModelAdjustments();
    renderLearningFeedback();
    if (state.status) {
      renderQualityReport(state.status);
      renderSourceHealth(state.status);
      renderCoverageTrend();
      renderNextActions();
      renderActionHistory();
      renderSourceFreshnessPlan();
      renderRefreshPriorityPlan();
      renderContextRepairPlan();
      renderSourceRegistryCenter();
      renderTeamIdentityGraph();
      renderOptionalSourcesPlan();
      renderSmartPreparePlanData();
      renderCriticalIssues();
      renderIntegrityReports();
      renderCoverageRepairEngine();
      renderModelLabV4();
      renderSourceHealthV4();
      renderSignalGapCenter();
      renderQualityAlerts(state.status);
      renderWarnings(state.status);
      renderPipelinePanel(state.status);
    }
    maybeAutoCriticalRefresh();
    maybeAutoPrematchRefresh();
    maybeNotifyPickChanges();
    scheduleBackgroundRefresh();
  }

  function updatePickFilters() {
    const pool = state.allPicks.length ? state.allPicks : state.picks;
    const sportSelect = $('#pick-sport-filter');
    const leagueSelect = $('#pick-league-filter');
    const marketSelect = $('#pick-market-filter');
    if (sportSelect) {
      const current = sportSelect.value || 'all';
      const sports = Array.from(new Set(pool.map((row) => row.sport).filter(Boolean))).sort();
      const html = ['<option value="all">Tous sports</option>', ...sports.map((sport) => `<option value="${escapeHtml(sport)}">${escapeHtml(sport)}</option>`)].join('');
      if (sportSelect.dataset.optionsHtml !== html) {
        sportSelect.innerHTML = html;
        sportSelect.dataset.optionsHtml = html;
        sportSelect.value = sports.includes(current) ? current : 'all';
      }
    }
    if (leagueSelect) {
      const current = leagueSelect.value || 'all';
      const leagues = Array.from(new Map(pool.map((row) => {
        const key = leagueKeyFromRow(row);
        const label = row.league || key.toUpperCase();
        return [key, label];
      })).entries()).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
      const html = ['<option value="all">Toutes ligues</option>', ...leagues.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`)].join('');
      if (leagueSelect.dataset.optionsHtml !== html) {
        leagueSelect.innerHTML = html;
        leagueSelect.dataset.optionsHtml = html;
        leagueSelect.value = leagues.some(([key]) => key === current) ? current : 'all';
      }
    }
    if (marketSelect) {
      const current = marketSelect.value || 'all';
      const markets = Array.from(new Map(pool.map((row) => {
        const key = marketKeyFromRow(row);
        const label = row.market || formatMarketName(key);
        return [key, label];
      })).entries()).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
      const html = ['<option value="all">Tous marchés</option>', ...markets.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`)].join('');
      if (marketSelect.dataset.optionsHtml !== html) {
        marketSelect.innerHTML = html;
        marketSelect.dataset.optionsHtml = html;
        marketSelect.value = markets.some(([key]) => key === current) ? current : 'all';
      }
    }
  }

  function readPickFilters() {
    const edgeValue = Number(($('#pick-edge-min')?.value || '').replace(',', '.'));
    const oddValue = Number(($('#pick-odd-min')?.value || '').replace(',', '.'));
    return {
      query: ($('#pick-search')?.value || '').trim().toLowerCase(),
      sport: $('#pick-sport-filter')?.value || 'all',
      league: $('#pick-league-filter')?.value || 'all',
      market: $('#pick-market-filter')?.value || 'all',
      sort: $('#pick-sort')?.value || 'edge',
      edgeMin: Number.isFinite(edgeValue) && edgeValue > 0 ? edgeValue / 100 : 0,
      oddMin: Number.isFinite(oddValue) && oddValue > 1 ? oddValue : 0
    };
  }

  function pickSearchText(row) {
    return [
      row.title,
      row.sport,
      row.league,
      row.market,
      row.label,
      row.match?.home,
      row.match?.away
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function pickFiltersActive(filters) {
    return Boolean(filters.query || filters.sport !== 'all' || filters.league !== 'all' || filters.market !== 'all' || filters.edgeMin || filters.oddMin || filters.sort !== 'edge');
  }

  function pickHasCoreData(row) {
    if (!row || typeof row !== 'object') return false;
    const hasWinamax = Boolean(row.winamaxUrl || row.match?.winamax?.available === true || row.match?.winamax?.match_id);
    return Boolean(
      row.title &&
      row.start &&
      row.market &&
      row.label &&
      hasWinamax &&
      Number(row.odd || 0) > 1 &&
      Number(row.probability || 0) > 0 &&
      Number(row.edge || 0) > 0
    );
  }

  function dashboardPickRows(filters) {
    const active = pickFiltersActive(filters);
    const base = active && state.allPicks.length ? state.allPicks : state.picks;
    const prefs = loadPreferences();
    const allowedSports = new Set((prefs.sports || []).map((item) => String(item).toLowerCase()));
    const allowedMarkets = new Set((prefs.markets || []).map(normalizeUiKey));
    const prefEdgeMin = Math.max(0, Number(prefs.edgeMin || 0) / 100);
    const prefOddMin = Math.max(0, Number(prefs.oddMin || 0));
    const prefOddMax = Math.max(0, Number(prefs.oddMax || 0));
    const prefConfidenceMin = Math.max(0, Number(prefs.confidenceMin || 0) / 100);
    const rows = base.filter((row) => {
      if (!pickHasCoreData(row)) return false;
      if (!canDisplayStake(row)) return false;
      if (allowedSports.size && !allowedSports.has(String(row.sport || '').toLowerCase())) return false;
      if (allowedMarkets.size && !allowedMarkets.has(marketKeyFromRow(row))) return false;
      if (prefEdgeMin && Number(row.edge || 0) < prefEdgeMin) return false;
      if (prefOddMin > 1 && Number(row.odd || 0) < prefOddMin) return false;
      if (prefOddMax > 1 && Number(row.odd || 0) > prefOddMax) return false;
      if ((prefs.strict || prefConfidenceMin > 0) && Number(row.probability || 0) < prefConfidenceMin) return false;
      const adjustment = adjustmentForRow(row);
      if (adjustment?.direction === 'harden') {
        const adjustedEdge = Math.max(prefEdgeMin, 0) + Math.max(0, Number(adjustment.edgeDelta || 0));
        const adjustedConfidence = Math.max(prefConfidenceMin, 0) + Math.max(0, Number(adjustment.confidenceDelta || 0));
        if (Number(row.edge || 0) < adjustedEdge) return false;
        if (Number(row.probability || 0) < adjustedConfidence) return false;
      }
      if (filters.query && !pickSearchText(row).includes(filters.query)) return false;
      if (filters.sport !== 'all' && row.sport !== filters.sport) return false;
      if (filters.league !== 'all' && leagueKeyFromRow(row) !== filters.league) return false;
      if (filters.market !== 'all' && marketKeyFromRow(row) !== filters.market) return false;
      if (filters.edgeMin && Number(row.edge || 0) < filters.edgeMin) return false;
      if (filters.oddMin && Number(row.odd || 0) < filters.oddMin) return false;
      if (state.calendarDayFilter && pickDayKey(row) !== state.calendarDayFilter) return false;
      return true;
    });
    rows.sort((a, b) => {
      if (filters.sort === 'kickoff') return new Date(a.start || 0) - new Date(b.start || 0);
      if (filters.sort === 'confidence') return Number(b.confidenceTrust?.score || b.probability || 0) - Number(a.confidenceTrust?.score || a.probability || 0);
      if (filters.sort === 'odd') return Number(b.odd || 0) - Number(a.odd || 0);
      return Number(b.edge || 0) - Number(a.edge || 0);
    });
    return active ? rows.slice(0, 40) : rows;
  }

  function renderMarketSnapshot(rows) {
    const wrap = $('#market-snapshot');
    if (!wrap) return;
    const sourceRows = Array.isArray(rows) && rows.length ? rows : (state.allPicks.length ? state.allPicks : state.picks);
    const byMarket = new Map();
    sourceRows.forEach((row) => {
      if (!pickHasCoreData(row) || !canDisplayStake(row)) return;
      const key = marketKeyFromRow(row);
      const bucket = byMarket.get(key) || {
        key,
        label: row.market || formatMarketName(key),
        count: 0,
        edge: 0,
        bestOdd: 0
      };
      bucket.count += 1;
      bucket.edge += Number(row.edge || 0);
      bucket.bestOdd = Math.max(bucket.bestOdd, Number(row.odd || 0));
      byMarket.set(key, bucket);
    });
    const rowsOut = Array.from(byMarket.values())
      .sort((a, b) => b.count - a.count || (b.edge / Math.max(1, b.count)) - (a.edge / Math.max(1, a.count)))
      .slice(0, 6);
    if (!rowsOut.length) {
      wrap.innerHTML = '<div class="empty compact-empty">Aucun marché prêt avec les préférences actuelles.</div>';
      return;
    }
    wrap.innerHTML = rowsOut.map((item) => `
      <button class="market-chip" type="button" data-market-chip="${escapeHtml(item.key)}">
        <span>${escapeHtml(item.label)}</span>
        <strong>${formatCount(item.count)}</strong>
        <em>edge moy. ${escapeHtml(formatPct(item.edge / Math.max(1, item.count), 1))} · max ${escapeHtml(formatOdd(item.bestOdd))}</em>
      </button>
    `).join('');
  }

  function readNotifiedPickKeys() {
    try {
      const rows = JSON.parse(localStorage.getItem(NOTIFIED_PICK_KEY) || '[]');
      return new Set(Array.isArray(rows) ? rows.filter(Boolean).slice(-80) : []);
    } catch {
      return new Set();
    }
  }

  function writeNotifiedPickKeys(keys) {
    try {
      localStorage.setItem(NOTIFIED_PICK_KEY, JSON.stringify(Array.from(keys).slice(-80)));
    } catch {
      // Les notifications restent optionnelles.
    }
  }

  function notifyUser(title, body, row) {
    sendExternalAlert(title, body, row).catch((error) => {
      pushLog('warn', `Webhook mobile non envoyé: ${error.message}`);
    });
    if (!('Notification' in window)) return;
    const show = () => {
      try {
        const notification = new Notification(title, { body, silent: true });
        notification.onclick = () => {
          window.focus();
          if (row?.id) openMatchDetail(row.id);
        };
      } catch {
        // Les notifications natives peuvent être bloquées par le système.
      }
    };
    try {
      if (Notification.permission === 'granted') show();
      else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') show();
        }).catch(() => {});
      }
    } catch {
      // Permission API non disponible dans certains profils Electron.
    }
  }

  function externalAlertPayload(title, body, row) {
    const prefs = loadPreferences();
    if (!prefs.webhookUrl) return null;
    return {
      config: {
        type: prefs.webhookType || 'generic',
        url: prefs.webhookUrl
      },
      alert: {
        title,
        message: body,
        match: row ? {
          id: row.id || null,
          title: row.title || row.match || null,
          market: row.market || null,
          pick: row.label || row.pick || null,
          odd: row.odd || null,
          start: row.start || null
        } : null
      }
    };
  }

  async function sendExternalAlert(title, body, row, options = {}) {
    const payload = externalAlertPayload(title, body, row);
    if (!payload) return { ok: false, skipped: true };
    const result = await fetchJson(options.test ? '/api/webhook/test' : '/api/webhook/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, dryRun: Boolean(options.dryRun) })
    });
    pushLog('info', `Webhook mobile ${options.test ? 'testé' : 'envoyé'}: ${title}`);
    return result;
  }

  async function sendWebhookTestSuite() {
    const status = $('#webhook-status');
    const prefs = collectPreferencesFromForm();
    savePreferences(prefs);
    if (!prefs.webhookUrl) {
      if (status) status.textContent = 'Ajoute une URL webhook avant le test.';
      return;
    }
    const events = [
      ['Nouveau Bet ultime', 'Simulation : le bet ultime du jour est disponible.'],
      ['Pick imminent', 'Simulation : un pick démarre dans moins de 30 minutes.'],
      ['Cote en mouvement', 'Simulation : la cote a bougé de 5%.'],
      ['Pari settle', 'Simulation : settlement terminé, P&L mis à jour.'],
      ['Stop-loss atteint', 'Simulation : pause recommandée pour protéger la bankroll.']
    ];
    try {
      for (const [title, body] of events) {
        await sendExternalAlert(title, body, null, { test: true, dryRun: true });
      }
      if (status) status.textContent = `${formatCount(events.length)} notifications critiques simulées et journalisées.`;
    } catch (error) {
      if (status) status.textContent = `Webhook en erreur : ${error.message}`;
    }
  }

  function alertOnce(key, title, body, row) {
    const keys = new Set(readStorageJson(SMART_ALERT_KEY, []));
    if (keys.has(key)) return false;
    keys.add(key);
    writeStorageJson(SMART_ALERT_KEY, Array.from(keys).slice(-160));
    notifyUser(title, body, row);
    return true;
  }

  function hasKeyInjurySignal(row) {
    const injuries = row?.match?.injuries || {};
    const all = [
      ...(Array.isArray(injuries.home) ? injuries.home : []),
      ...(Array.isArray(injuries.away) ? injuries.away : [])
    ];
    return all.some((injury) => String(injury.type || '').toLowerCase() === 'missing' || String(injury.reason_label || '').toLowerCase().includes('suspend'));
  }

  function updatePriceMoveAlerts(readyRows) {
    const memory = readStorageJson(ODDS_MEMORY_KEY, {});
    const next = { ...memory };
    const nowIso = new Date().toISOString();
    readyRows.slice(0, 80).forEach((row) => {
      const key = userBetKey(row);
      const odd = Number(row.odd || 0);
      if (!key || !Number.isFinite(odd) || odd <= 1) return;
      const previous = Number(memory[key]?.odd || 0);
      if (Number.isFinite(previous) && previous > 1) {
        const move = (odd - previous) / previous;
        if (move >= 0.05) {
          alertOnce(`price-up:${key}:${odd.toFixed(2)}`, 'Cote meilleure maintenant', `${row.title} · ${row.label} passe de ${formatOdd(previous)} à ${formatOdd(odd)}.`, row);
        } else if (move <= -0.05) {
          alertOnce(`price-down:${key}:${odd.toFixed(2)}`, 'Cote en baisse', `${row.title} · ${row.label} passe de ${formatOdd(previous)} à ${formatOdd(odd)}. Décide vite.`, row);
        }
      }
      next[key] = { odd, at: nowIso };
    });
    writeStorageJson(ODDS_MEMORY_KEY, next);
  }

  function maybeNotifyPickChanges() {
    const readyRows = (state.picks || []).filter((row) => pickHasCoreData(row) && canDisplayStake(row));
    const readyCount = readyRows.length;
    const previousRaw = localStorage.getItem(READY_COUNT_KEY);
    const previous = previousRaw == null ? null : Number(previousRaw);
    try {
      localStorage.setItem(READY_COUNT_KEY, String(readyCount));
    } catch {
      // Compteur purement confort.
    }
    if (previous != null && Number.isFinite(previous) && readyCount > previous) {
      notifyUser('Nouveaux picks prêts', `+${readyCount - previous} pick(s) jouable(s) depuis le dernier calcul.`, readyRows[0]);
    }
    updatePriceMoveAlerts(readyRows);
    const notified = readNotifiedPickKeys();
    const now = Date.now();
    const tracked = new Set(loadUserBets().filter((bet) => bet.status === 'pending').map((bet) => bet.key));
    const reminder = readyRows.find((row) => {
      const ts = Date.parse(row.start || '');
      return Number.isFinite(ts)
        && ts > now
        && ts - now <= 30 * 60 * 1000
        && !tracked.has(userBetKey(row));
    });
    if (reminder) {
      alertOnce(`kickoff:${userBetKey(reminder)}`, 'Pick proche du coup d’envoi', `${reminder.title} · ${reminder.label} ${formatOdd(reminder.odd)} démarre dans ${countdownLabel(reminder.start)}.`, reminder);
    }
    const injuryPick = readyRows.find((row) => {
      const ts = Date.parse(row.start || '');
      return Number.isFinite(ts) && ts > now && ts - now <= 2 * 60 * 60 * 1000 && hasKeyInjurySignal(row);
    });
    if (injuryPick) {
      alertOnce(`injury:${userBetKey(injuryPick)}`, 'Re-check blessure clé', `${injuryPick.title} a un signal absence proche kickoff. Ouvre la fiche avant de miser.`, injuryPick);
    }
    const bigPick = readyRows.find((row) => {
      const ts = Date.parse(row.start || '');
      const key = userBetKey(row);
      return !notified.has(key)
        && Number(row.edge || 0) >= 0.10
        && Number(row.odd || 0) >= 2
        && Number.isFinite(ts)
        && ts > now
        && ts - now <= 2 * 60 * 60 * 1000;
    });
    if (!bigPick) return;
    notified.add(userBetKey(bigPick));
    writeNotifiedPickKeys(notified);
    notifyUser(
      'Gros pick proche',
      `${bigPick.title} · ${bigPick.label} ${formatOdd(bigPick.odd)} · edge ${formatPct(bigPick.edge, 1)}`,
      bigPick
    );
  }

  function pickConfidenceValue(row) {
    const trust = Number(row?.confidenceTrust?.score);
    if (Number.isFinite(trust) && trust > 0) return trust / 100;
    const quality = Number(row?.contextQuality?.score);
    if (Number.isFinite(quality) && quality > 0 && Number(row?.probability || 0) > 0) {
      return (Number(row.probability || 0) + quality / 100) / 2;
    }
    return Number(row?.probability || 0) || 0;
  }

  function hasPositiveHistoricalSegment(row) {
    const level = String(row?.calibration?.level || '').toLowerCase();
    const tier = String(row?.tier || '').toLowerCase();
    if (['warm', 'tracked'].includes(level)) return true;
    if (row?.calibration?.edgeBucket?.level === 'warm') return true;
    if (tier.includes('lock') || tier.includes('premium') || tier.includes('value')) return true;
    return Number(row?.edge || 0) >= 0.10 && Number(row?.calibration?.sample || 0) === 0;
  }

  function ultimateBetCandidate(rows) {
    const now = Date.now();
    const horizon = now + 24 * 60 * 60 * 1000;
    return (Array.isArray(rows) ? rows : [])
      .filter((row) => canDisplayStake(row))
      .filter((row) => {
        const ts = Date.parse(row.start || '');
        return Number.isFinite(ts) && ts >= now - 30 * 60 * 1000 && ts <= horizon;
      })
      .filter((row) => Number(row.edge || 0) >= 0.07)
      .filter((row) => pickConfidenceValue(row) >= 0.65)
      .filter(hasPositiveHistoricalSegment)
      .sort((a, b) => (
        Number(b.edge || 0) - Number(a.edge || 0)
        || pickConfidenceValue(b) - pickConfidenceValue(a)
        || Date.parse(a.start || '') - Date.parse(b.start || '')
      ))[0] || null;
  }

  function trackButtonHtml(row, label = 'Je mise') {
    const tracked = new Set(loadUserBets().filter((bet) => bet.status === 'pending').map((bet) => bet.key));
    const discipline = bankrollDisciplineStatus();
    const trackKey = userBetKey(row);
    const isTracked = tracked.has(trackKey);
    if (!canDisplayStake(row)) return '<span class="match-sub">0 €</span>';
    if (discipline.blocked) {
      return `<button type="button" class="track-bet-btn tracked" disabled title="${escapeHtml(discipline.detail)}">${escapeHtml(discipline.label)}</button>`;
    }
    return `<button type="button" class="track-bet-btn${isTracked ? ' tracked' : ''}" data-track-bet-key="${escapeHtml(trackKey)}">${isTracked ? 'Suivi' : escapeHtml(label)}</button>`;
  }

  function ultimateBetReason(row) {
    if (!row) return 'Aucun pick ne réunit edge ≥ 7pt, confiance ≥ 65%, segment positif et départ dans les 24h.';
    const bits = [
      `${formatPct(row.edge || 0, 1)} d’edge`,
      `${formatPct(pickConfidenceValue(row), 0)} confiance`,
      `${formatOdd(row.odd)} Winamax`,
      countdownLabel(row.start)
    ];
    return `${row.market} · ${row.label} : ${bits.join(' · ')}. ${pickReason(row).replace(/^Pourquoi\s*:\s*/i, '')}`;
  }

  function renderUltimateBet(rows) {
    const wrap = $('#ultimate-bet-card');
    if (!wrap) return;
    const row = aiSelectedUltimate(rows) || ultimateBetCandidate(rows);
    const aiReason = row && state.aiAssist?.ultimate?.selectedKey === userBetKey(row) ? state.aiAssist?.ultimate?.reason : null;
    if (!row) {
      const refusal = state.aiAssist?.ultimate?.accepted === false ? state.aiAssist.ultimate.reason : ultimateBetReason(null);
      wrap.innerHTML = `
        <div class="ultimate-copy">
          <span class="eyebrow">Bet ultime du jour</span>
          <h3>Aucun bet ultime validé</h3>
          <p>${escapeHtml(refusal)}</p>
        </div>
        <div class="ultimate-side"><strong>Patience</strong><span>Les candidats restent classés par horaire.</span></div>
      `;
      return;
    }
    wrap.innerHTML = `
      <div class="ultimate-copy">
        <span class="eyebrow">Bet ultime du jour</span>
        <h3>${escapeHtml(row.title)}</h3>
        <p>${escapeHtml(aiReason || ultimateBetReason(row))}</p>
        <div class="ultimate-tags">
          <span>${escapeHtml(row.market)}</span>
          <span>${escapeHtml(row.label)}</span>
          <span>${escapeHtml(formatOdd(row.odd))}</span>
          <span>mise ${escapeHtml(visibleStakeText(row))}</span>
          ${enrichmentBadgeHtml(row)}
        </div>
      </div>
      <div class="ultimate-side">
        <strong>${escapeHtml(countdownLabel(row.start))}</strong>
        <span>${escapeHtml(formatDateLabel(row.start))}</span>
        <button type="button" class="ghost-btn focus-mode-btn" data-focus-pick-key="${escapeHtml(userBetKey(row))}">Mode focus</button>
        ${trackButtonHtml(row, 'Je mise ce bet')}
      </div>
    `;
  }

  function temporalBucketForPick(row) {
    const ts = Date.parse(row?.start || '');
    const now = Date.now();
    if (!Number.isFinite(ts)) return 'later';
    const diff = ts - now;
    if (diff < -30 * 60 * 1000) return 'later';
    if (diff < 2 * 60 * 60 * 1000) return 'now';
    if (diff < 6 * 60 * 60 * 1000) return 'soon';
    const today = parisDayKey(new Date());
    const tomorrow = parisDayKey(new Date(now + 24 * 60 * 60 * 1000));
    const day = parisDayKey(new Date(ts));
    if (day === today) return 'today';
    if (day === tomorrow) return 'tomorrow';
    return 'later';
  }

  function timePickCard(row) {
    return `
      <article class="time-pick-card clickable-row" data-match-id="${escapeHtml(row.id)}" tabindex="0" role="button">
        <div>
          <strong>${escapeHtml(row.title)}</strong>
          <span>${escapeHtml(row.league || row.sport || '')} · ${escapeHtml(formatDateLabel(row.start))}</span>
        </div>
        <div class="time-pick-meta">
          <span>${escapeHtml(row.market)}</span>
          <span>${escapeHtml(row.label)}</span>
          <span>${escapeHtml(formatOdd(row.odd))}</span>
          <span>edge ${escapeHtml(formatPct(row.edge || 0, 1))}</span>
          <span>${escapeHtml(countdownLabel(row.start))}</span>
          ${enrichmentBadgeHtml(row)}
        </div>
        <p>${escapeHtml(pickReason(row).replace(/^Pourquoi\s*:\s*/i, ''))}</p>
        <div class="time-pick-action">
          <button type="button" class="ghost-btn focus-mode-btn" data-focus-pick-key="${escapeHtml(userBetKey(row))}">Mode focus</button>
          ${trackButtonHtml(row)}
        </div>
      </article>
    `;
  }

  function renderTemporalCockpit(rows) {
    const wrap = $('#time-cockpit');
    if (!wrap) return;
    const buckets = [
      { key: 'now', title: 'À jouer maintenant', detail: '< 2h', open: true },
      { key: 'soon', title: 'Bientôt', detail: '2h - 6h', open: true },
      { key: 'today', title: 'Plus tard aujourd’hui', detail: '6h - fin de journée', open: true },
      { key: 'tomorrow', title: 'Demain', detail: 'J+1', open: false },
      { key: 'later', title: 'Prochains jours', detail: 'J+2 à J+7', open: false }
    ];
    const grouped = new Map(buckets.map((bucket) => [bucket.key, []]));
    (Array.isArray(rows) ? rows : [])
      .filter((row) => pickHasCoreData(row) && canDisplayStake(row))
      .forEach((row) => grouped.get(temporalBucketForPick(row))?.push(row));
    grouped.forEach((bucketRows) => bucketRows.sort((a, b) => Number(b.edge || 0) - Number(a.edge || 0) || Date.parse(a.start || '') - Date.parse(b.start || '')));
    wrap.innerHTML = buckets.map((bucket) => {
      const bucketRows = grouped.get(bucket.key) || [];
      const rowsHtml = bucketRows.length
        ? bucketRows.slice(0, bucket.key === 'later' ? 12 : 8).map(timePickCard).join('')
        : '<div class="empty compact-empty">Aucun pick dans cette fenêtre.</div>';
      return `
        <details class="time-section ${bucket.key === 'now' && bucketRows.length ? 'hot' : ''}" data-time-bucket="${escapeHtml(bucket.key)}"${bucket.open ? ' open' : ''}>
          <summary>
            <span>${escapeHtml(bucket.title)}</span>
            <strong>${formatCount(bucketRows.length)}</strong>
            <em>${escapeHtml(bucket.detail)}</em>
          </summary>
          <div class="time-section-grid">${rowsHtml}</div>
        </details>
      `;
    }).join('');
    const nowSection = wrap.querySelector('[data-time-bucket="now"].hot');
    if (nowSection && !state.didScrollToNow) {
      state.didScrollToNow = true;
      setTimeout(() => nowSection.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 200);
    }
  }

  function aiConfigFromPreferences() {
    const prefs = loadPreferences();
    return {
      enabled: Boolean(prefs.aiEnabled && prefs.aiApiKey),
      provider: prefs.aiProvider || 'openai',
      apiKey: prefs.aiApiKey || '',
      model: prefs.aiModel || 'gpt-4o-mini'
    };
  }

  function aiPickPayload(row) {
    return {
      key: userBetKey(row),
      id: row.id,
      title: row.title,
      sport: row.sport,
      league: row.league,
      market: row.market,
      label: row.label,
      odd: row.odd,
      probability: row.probability,
      edge: row.edge,
      confidence: pickConfidenceValue(row),
      start: row.start,
      reason: pickReason(row),
      contextScore: row.contextQuality?.score ?? null,
      calibrationLevel: row.calibration?.level || null,
      calibrationSample: row.calibration?.sample || null
    };
  }

  function webEnrichmentConfig() {
    const prefs = loadPreferences();
    const legacyCache = Number(prefs.webEnrichmentRateLimit || 0) > 10 ? Number(prefs.webEnrichmentRateLimit) : 120;
    return {
      enabled: prefs.webEnrichmentEnabled !== false,
      cacheMinutes: Math.max(15, Number(prefs.webEnrichmentCacheMinutes || legacyCache) || 120),
      rateLimitPerMinute: Math.max(1, Math.min(10, Number(prefs.webEnrichmentRateLimit || 5) || 5)),
      maxSources: 3
    };
  }

  function rowEnrichmentKey(row) {
    return String([
      userBetKey(row),
      row?.id,
      row?.title,
      row?.market,
      row?.label,
      row?.start
    ].filter(Boolean).join(':'))
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9.]+/g, ':')
      .replace(/^:+|:+$/g, '') || userBetKey(row);
  }

  function enrichmentForRow(row) {
    const store = state.webEnrichments || readStorageJson(WEB_ENRICHMENT_KEY, null);
    const key = rowEnrichmentKey(row);
    return store?.byKey?.[key] || store?.byKey?.[userBetKey(row)] || null;
  }

  function enrichmentBadgeHtml(row) {
    const item = enrichmentForRow(row);
    if (!item || item.status !== 'enriched') return '';
    const time = item.enrichedAt ? new Date(item.enrichedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
    return `<span class="enrichment-badge" title="Sources web vérifiées côté moteur local">Enrichi à ${escapeHtml(time)}</span>`;
  }

  function updateWebEnrichmentSummary() {
    const node = $('#web-enrichment-summary');
    if (!node) return;
    const store = state.webEnrichments || readStorageJson(WEB_ENRICHMENT_KEY, null);
    const summary = store?.summary || {};
    node.innerHTML = `
      <article class="refresh-card refresh-${Number(summary.failed || 0) ? 'warn' : 'ok'}">
        <span>Enrichissement web</span>
        <strong>${formatCount(summary.success || 0)} réussis / ${formatCount(summary.failed || 0)} échoués</strong>
        <p>Aujourd'hui · cache local ${formatCount(webEnrichmentConfig().cacheMinutes)} min · sources consultées par le moteur.</p>
        <small>${escapeHtml(store?.updatedAt ? formatDateTime(store.updatedAt) : 'Aucun enrichissement lancé')}</small>
      </article>
    `;
  }

  function storeWebEnrichment(record, summary) {
    const store = state.webEnrichments || readStorageJson(WEB_ENRICHMENT_KEY, { byKey: {}, runs: [], summary: {} }) || { byKey: {}, runs: [], summary: {} };
    store.byKey = store.byKey && typeof store.byKey === 'object' ? store.byKey : {};
    if (record?.key) store.byKey[record.key] = record;
    store.updatedAt = record?.enrichedAt || new Date().toISOString();
    if (summary) store.summary = summary;
    state.webEnrichments = store;
    writeStorageJson(WEB_ENRICHMENT_KEY, store);
    updateWebEnrichmentSummary();
  }

  async function loadWebEnrichmentState() {
    try {
      const store = await fetchJson('/api/ai/enrichment-state');
      if (store && typeof store === 'object') {
        state.webEnrichments = store;
        writeStorageJson(WEB_ENRICHMENT_KEY, store);
        updateWebEnrichmentSummary();
      }
    } catch (error) {
      pushLog('warn', `État enrichissement web indisponible: ${error.message}`);
      updateWebEnrichmentSummary();
    }
  }

  async function enrichPick(row, { force = false, dryRun = false, manual = false } = {}) {
    if (!row || !pickHasCoreData(row)) return null;
    const response = await fetchJson('/api/ai/enrich', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: webEnrichmentConfig(),
        pick: { ...aiPickPayload(row), winamaxUrl: row.winamaxUrl || row.match?.winamax?.url || '' },
        force,
        dryRun
      })
    });
    if (response?.record) {
      storeWebEnrichment(response.record, response.summary);
      if (manual) setSideStatus(response.record.status === 'enriched' ? 'Enrichissement web terminé' : 'Enrichissement tenté', response.record.status === 'enriched' ? 'ok' : 'warn');
      if (response.record.majorChange) notifyUser('Pick mis à jour après enrichissement', `${row.title} · ouvre la fiche avant de miser.`, row);
      renderUltimateBet(dashboardPickRows(readPickFilters()));
      renderTemporalCockpit(dashboardPickRows(readPickFilters()));
      return response.record;
    }
    if (manual) setSideStatus(response?.reason || response?.error || 'Enrichissement non lancé', 'warn');
    return null;
  }

  function scheduleVisibleWebEnrichment(rows) {
    const prefs = loadPreferences();
    if (prefs.webEnrichmentEnabled === false) return;
    const top = [
      aiSelectedUltimate(rows) || ultimateBetCandidate(rows),
      ...(Array.isArray(rows) ? rows.filter((row) => temporalBucketForPick(row) === 'now').slice(0, 2) : [])
    ].filter(Boolean);
    const unique = Array.from(new Map(top.map((row) => [userBetKey(row), row])).values()).slice(0, 3);
    unique.forEach((row, index) => {
      if (enrichmentForRow(row)?.status === 'enriched') return;
      const key = rowEnrichmentKey(row);
      if (state.webEnrichmentPending.has(key)) return;
      state.webEnrichmentPending.add(key);
      setTimeout(() => {
        enrichPick(row)
          .catch((error) => pushLog('warn', `Enrichissement web indisponible: ${error.message}`))
          .finally(() => state.webEnrichmentPending.delete(key));
      }, 900 + index * 700);
    });
  }

  async function aiAssist(task, payload) {
    const response = await fetchJson('/api/ai/assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: aiConfigFromPreferences(), task, payload })
    });
    return response?.result || null;
  }

  function aiSelectedUltimate(rows) {
    const selectedKey = state.aiAssist?.ultimate?.selectedKey;
    if (!selectedKey) return null;
    return (Array.isArray(rows) ? rows : []).find((row) => userBetKey(row) === selectedKey) || null;
  }

  async function runBackgroundAi(rows) {
    const topRows = (Array.isArray(rows) ? rows : [])
      .filter((row) => pickHasCoreData(row) && canDisplayStake(row))
      .slice()
      .sort((a, b) => Number(b.edge || 0) - Number(a.edge || 0))
      .slice(0, 10);
    if (!topRows.length) return;
    try {
      const [ultimate, anomalies] = await Promise.all([
        aiAssist('curate_ultimate', { picks: topRows.map(aiPickPayload) }),
        aiAssist('detect_anomalies', { picks: topRows.map(aiPickPayload), status: state.status })
      ]);
      state.aiAssist = {
        generatedAt: new Date().toISOString(),
        ultimate,
        anomalies,
        provider: aiConfigFromPreferences().enabled ? aiConfigFromPreferences().provider : 'heuristic'
      };
      writeStorageJson(AI_ENGINE_KEY, state.aiAssist);
      const warnings = Array.isArray(anomalies?.warnings) ? anomalies.warnings : [];
      warnings.forEach((warning) => pushLog('warn', `IA moteur: ${warning.reason || 'anomalie'} (${warning.key || '-'})`));
      renderUltimateBet(topRows);
      renderPipelinePanel(state.status);
    } catch (error) {
      pushLog('warn', `IA moteur indisponible: ${error.message}`);
    }
  }

  function renderPicks(emptyMessage) {
    const body = $('#picks-body');
    const metricLabel = $('#metric-picks-label');
    renderUserPnl();
    renderMorningDashboard();
    renderCoachAdvice();
    renderTodayModelPulse();
    updatePickFilters();
    const filters = readPickFilters();
    const displayRows = dashboardPickRows(filters);
    rememberDisplayedOdds(displayRows);
    renderMarketSnapshot(displayRows);
    renderUltimateBet(displayRows);
    renderTemporalCockpit(displayRows);
    updateWebEnrichmentSummary();
    scheduleVisibleWebEnrichment(displayRows);
    clearTimeout(state.aiTimer);
    state.aiTimer = setTimeout(() => runBackgroundAi(displayRows), 600);
    const total = state.allPicks.length || state.picks.length || 0;
    const meta = state.dashboardMeta || {};
    const ready = Number(state.decisionCenter?.summary?.ready || meta.readyPicks || 0);
    if (metricLabel) metricLabel.textContent = ready > 0 ? 'Paris prêts' : 'Candidats surveillés';
    $('#metric-picks').textContent = String(ready > 0 ? ready : (state.picks.length || 0));
    const globalBlocked = Boolean(state.decisionCenter?.summary?.blocked);
    const caption = pickFiltersActive(filters)
      ? `${formatCount(displayRows.length)} pick(s) filtré(s) sur ${formatCount(total)} lignes prêtes.`
      : ready > 0
        ? `${formatCount(ready)} pick(s) prêt(s) : seules ces lignes affichent une mise.`
        : meta.mode === 'bestAvailable'
          ? 'Aucun pari prêt dans la fenêtre courte : affichage des meilleurs candidats à surveiller.'
          : 'Aucun pari à jouer maintenant : candidats surveillés sans mise.';
    const sectionTitle = $('#picks-section-title');
    if (sectionTitle) sectionTitle.textContent = ready > 0 ? 'À jouer maintenant' : 'Sélection surveillée';
    $('#picks-caption').textContent = caption;
    $('#metric-picks-sub').textContent = total > state.picks.length
      ? `${state.picks.length} affichés · ${total} picks positifs au total`
      : globalBlocked
        ? '0 mise tant qu’un gate est rouge'
        : `${formatCount(ready)} prêt(s)`;
    if (!displayRows.length) {
      body.innerHTML = `<tr><td colspan="8" class="empty">${escapeHtml(emptyMessage || 'Aucun pick jouable avec les règles actuelles.')}</td></tr>`;
      markFirstPickVisible(0);
      return;
    }
    const tracked = new Set(loadUserBets().filter((bet) => bet.status === 'pending').map((bet) => bet.key));
    const discipline = bankrollDisciplineStatus();
    body.innerHTML = displayRows.map((pick) => {
      const startLabel = `${formatDateLabel(pick.start)} · ${countdownLabel(pick.start)}`;
      const edgeClass = pick.edge >= 0.08 ? 'edge-pos' : 'edge-warn';
      const decision = pick.decisionCenter || {};
      const statusText = decision.canBet ? 'Prêt' : decision.status === 'repair' ? 'À réparer' : decision.status === 'skip' ? 'À éviter' : 'À surveiller';
      const trackKey = userBetKey(pick);
      const isTracked = tracked.has(trackKey);
      const action = canDisplayStake(pick)
        ? discipline.blocked
          ? `<button type="button" class="track-bet-btn tracked" disabled title="${escapeHtml(discipline.detail)}">${escapeHtml(discipline.label)}</button>`
          : `<button type="button" class="track-bet-btn${isTracked ? ' tracked' : ''}" data-track-bet-key="${escapeHtml(trackKey)}">${isTracked ? 'Suivi' : 'Je mise'}</button>`
        : '<span class="match-sub">-</span>';
      return `
        <tr class="clickable-row" data-match-id="${escapeHtml(pick.id)}" tabindex="0" role="button" aria-label="Ouvrir ${escapeHtml(pick.title)}">
          <td data-label="Match">
            <div class="match-title">${escapeHtml(pick.title)}</div>
            <div class="match-sub">${escapeHtml(pick.sport)} · ${escapeHtml(pick.league)}</div>
          </td>
          <td data-label="Marché"><span class="pill">${escapeHtml(statusText)}</span> <span class="pill">${escapeHtml(pick.market)}</span><div class="match-sub">${escapeHtml(pick.label)}</div><div class="match-sub selection-reason">${escapeHtml(pickReason(pick))}</div>${calibrationNote(pick)}</td>
          <td data-label="Cote">@${pick.odd.toFixed(2)}</td>
          <td data-label="Proba">${formatPct(pick.probability, 1)}</td>
          <td data-label="Edge" class="${edgeClass}">${formatPct(pick.edge, 1)}</td>
          <td data-label="Mise">${visibleStakeText(pick)}</td>
          <td data-label="Départ">${escapeHtml(startLabel)}</td>
          <td data-label="Action">${action}</td>
        </tr>`;
    }).join('');
    markFirstPickVisible(displayRows.length);
    renderRefreshPolicy();
  }

  function todayModelPulse() {
    const rows = (state.picks || []).filter((row) => pickHasCoreData(row) && canDisplayStake(row));
    const allRows = (state.allPicks || []).filter(pickHasCoreData);
    const profitable = rows.filter((row) => {
      const cal = row.calibration || {};
      return cal.level === 'warm' || Number(row.edge || 0) >= 0.10 || String(row.tier || '').includes('value');
    });
    const risky = rows.filter((row) => row.calibration?.level === 'cold' || row.contextQuality?.tier === 'insuffisant');
    const avgEdge = rows.length ? rows.reduce((sum, row) => sum + Number(row.edge || 0), 0) / rows.length : 0;
    const avgAllEdge = allRows.length ? allRows.reduce((sum, row) => sum + Number(row.edge || 0), 0) / allRows.length : avgEdge;
    const level = rows.length >= 20 && profitable.length >= risky.length ? 'Bonne' : rows.length >= 10 ? 'Moyenne' : 'Faible';
    return { rows, profitable, risky, avgEdge, avgAllEdge, level };
  }

  function renderTodayModelPulse() {
    const pulse = todayModelPulse();
    const target = $('#today-model-pulse');
    if (!target) return;
    target.innerHTML = [
      ['Picks affichés', formatCount(pulse.rows.length), 'Sélection visible après préférences.'],
      ['Segments verts', formatCount(pulse.profitable.length), 'Historique ou edge robuste.'],
      ['Segments rouges', formatCount(pulse.risky.length), 'À surveiller ou à éviter.'],
      ['Edge moyen jour', formatPct(pulse.avgEdge, 1), `Moyenne globale ${formatPct(pulse.avgAllEdge, 1)}.`],
      ['Qualité du jour', pulse.level, 'Lecture rapide de la journée de signaux.']
    ].map(([label, value, detail]) => `
      <article class="morning-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <p>${escapeHtml(detail)}</p>
      </article>
    `).join('');
  }

  function calendarRows() {
    const source = (state.allPicks.length ? state.allPicks : state.picks)
      .filter((row) => pickHasCoreData(row) && canDisplayStake(row))
      .filter((row) => pickDayKey(row));
    const byDay = new Map();
    source.forEach((row) => {
      const key = pickDayKey(row);
      const bucket = byDay.get(key) || { key, rows: [], edge: 0 };
      bucket.rows.push(row);
      bucket.edge += Number(row.edge || 0);
      byDay.set(key, bucket);
    });
    const today = new Date();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getTime() + index * 24 * 60 * 60 * 1000);
      const key = parisDayKey(date);
      const bucket = byDay.get(key) || { key, rows: [], edge: 0 };
      const rows = bucket.rows.slice().sort((a, b) => Date.parse(a.start || '') - Date.parse(b.start || ''));
      return {
        key,
        date,
        rows,
        count: rows.length,
        big: rows.filter((row) => Number(row.edge || 0) >= 0.10).length,
        avgEdge: rows.length ? bucket.edge / rows.length : 0
      };
    });
  }

  function renderCalendar() {
    const grid = $('#calendar-grid');
    const timeline = $('#calendar-timeline');
    if (!grid || !timeline) return;
    const days = calendarRows();
    const selected = state.selectedCalendarDay || state.calendarDayFilter || days.find((day) => day.count)?.key || days[0]?.key;
    state.selectedCalendarDay = selected;
    grid.innerHTML = days.map((day) => {
      const density = day.count >= 16 ? 'high' : day.count >= 8 ? 'medium' : day.count > 0 ? 'low' : 'empty';
      return `
        <button class="calendar-day ${density} ${selected === day.key ? 'active' : ''}" type="button" data-calendar-day="${escapeHtml(day.key)}">
          <span>${escapeHtml(formatDayKey(day.date.toISOString()))}</span>
          <strong>${formatCount(day.count)}</strong>
          <small>${formatCount(day.big)} gros · edge moy. ${escapeHtml(formatPct(day.avgEdge, 1))}</small>
        </button>
      `;
    }).join('');
    const day = days.find((item) => item.key === selected) || days[0];
    const title = $('#calendar-day-title');
    const caption = $('#calendar-day-caption');
    if (title) title.textContent = day ? `Timeline ${formatDayKey(day.date.toISOString())}` : 'Timeline';
    if (caption) caption.textContent = day?.count ? `${formatCount(day.count)} pick(s), triés par coup d'envoi.` : 'Aucun pick prêt ce jour-là.';
    timeline.innerHTML = day?.rows.length ? day.rows.slice(0, 40).map((row) => `
      <button class="timeline-row" type="button" data-match-id="${escapeHtml(row.id)}">
        <span>${escapeHtml(new Date(row.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))}</span>
        <strong>${escapeHtml(row.title)}</strong>
        <em>${escapeHtml(row.market)} · ${escapeHtml(row.label)} · ${escapeHtml(formatOdd(row.odd))} · edge ${escapeHtml(formatPct(row.edge, 1))}</em>
      </button>
    `).join('') : '<div class="empty">Aucun pick prêt sur cette journée.</div>';
  }

  function glossaryRows() {
    return [
      ['Edge', 'Différence entre la probabilité estimée par le modèle et celle implicite dans la cote. Edge positif = value théorique.'],
      ['EV', 'Espérance de valeur. C’est le gain moyen attendu si le même pari était répété dans des conditions comparables.'],
      ['Kelly', 'Méthode de mise proportionnelle à l’avantage estimé. Ici elle est plafonnée pour éviter les mises trop agressives.'],
      ['CLV', 'Closing Line Value : compare la cote prise à la cote proche du coup d’envoi. Battre la clôture est un signal de qualité.'],
      ['Brier', 'Score de calibration des probabilités. Plus il est bas, plus les probabilités historiques étaient bien calibrées.'],
      ['Tier', 'Niveau de lecture du pick : lock, premium, value ou standard selon les signaux et l’historique.'],
      ['Bucket d’edge', 'Tranche de value utilisée pour comparer les performances historiques des petits et gros edges.'],
      ['Segment', 'Groupe de paris comparable : sport, ligue, marché ou tranche d’edge.'],
      ['Sharp money', 'Mouvement de marché supposé informatif, souvent lié à des parieurs ou volumes plus spécialisés.'],
      ['Outsider', 'Pick sur une cote élevée. Peut être rentable en value, mais variance plus forte.'],
      ['BTTS', 'Both Teams To Score : les deux équipes marquent.'],
      ['OU', 'Over/Under : total au-dessus ou en dessous d’une ligne, par exemple plus de 2,5 buts.'],
      ['DC', 'Double chance : deux issues couvertes sur trois en football.'],
      ['AH', 'Asian Handicap : handicap qui peut réduire ou annuler une partie du risque selon la ligne.'],
      ['DNB', 'Draw No Bet : nul remboursé, pari gagné seulement si l’équipe choisie gagne.']
    ];
  }

  function renderHelp() {
    const grid = $('#glossary-grid');
    if (!grid) return;
    grid.innerHTML = glossaryRows().map(([term, detail]) => `
      <article class="glossary-card">
        <strong>${escapeHtml(term)}</strong>
        <p>${escapeHtml(detail)}</p>
      </article>
    `).join('');
  }

  function refreshStageRows(refresh) {
    const history = Array.isArray(refresh?.history) ? refresh.history : [];
    const running = refresh?.running ? [refresh] : [];
    return [...running, ...history].slice(0, 12);
  }

  function renderPipelinePanel(status = state.status) {
    const progress = $('#pipeline-progress');
    const stages = $('#pipeline-stage-grid');
    const log = $('#pipeline-live-log');
    if (!progress || !stages || !log) return;
    const refresh = status?.refresh || {};
    const eta = refresh.running ? refreshEtaInfo(refresh) : null;
    const memory = status?.memory || {};
    updateWebEnrichmentSummary();
    if (refresh.running) {
      progress.innerHTML = `
        <div class="pipeline-head">
          <div>
            <span class="eyebrow">Refresh actif</span>
            <strong>${escapeHtml(refreshModeLabel(refresh.mode || 'quick'))}</strong>
            <p>${eta?.overdue ? 'Plus long que prévu' : `Temps restant estimé ${formatDurationSeconds(eta?.remainingSec || 0)}`} · écoulé ${formatDurationSeconds(eta?.elapsedSec || 0)}</p>
          </div>
          <div class="pipeline-meter"><span style="width:${Math.round(eta?.progressPct || 0)}%"></span></div>
        </div>
      `;
    } else {
      progress.innerHTML = `
        <div class="pipeline-head">
          <div>
            <span class="eyebrow">Pipeline prêt</span>
            <strong>Dernier état local</strong>
            <p>Mémoire ${memory.rssMb || '-'} MB RSS · prochain refresh ${nextRefreshPlan().label || 'selon contexte'}.</p>
          </div>
        </div>
      `;
    }
    const rows = refreshStageRows(refresh);
    stages.innerHTML = rows.length ? rows.map((row) => {
      const running = row.running;
      const ok = row.exitCode === 0 && !row.error;
      const tone = running ? 'warn' : ok ? 'ok' : row.error ? 'danger' : 'idle';
      const started = row.startedAt ? new Date(row.startedAt) : null;
      const finished = row.finishedAt ? new Date(row.finishedAt) : null;
      const duration = started && finished ? Math.max(0, Math.round((finished - started) / 1000)) : null;
      return `
        <article class="refresh-card refresh-${tone}">
          <span>${escapeHtml(refreshModeLabel(row.mode || 'quick'))}</span>
          <strong>${running ? 'En cours' : ok ? 'OK' : row.error ? 'Erreur' : 'Historique'}</strong>
          <p>${duration == null ? 'Durée en cours' : `Durée ${formatDurationSeconds(duration)}`}</p>
          <small>${escapeHtml(row.error || row.source || row.startedAt || '')}</small>
        </article>
      `;
    }).join('') : '<div class="empty">Aucun refresh enregistré.</div>';
    log.textContent = (refresh.lines && refresh.lines.length ? refresh.lines.slice(-80).join('\n') : 'Aucun log live pour le moment.');
  }

  function renderDebugLogs() {
    const out = $('#debug-log-output');
    if (!out) return;
    const filter = $('#log-level-filter')?.value || 'all';
    const rows = state.debugLogs.filter((row) => filter === 'all' || row.level === filter);
    out.textContent = rows.length
      ? rows.slice(-200).map((row) => `${new Date(row.at).toLocaleTimeString('fr-FR')} [${row.level}] ${row.message}`).join('\n')
      : 'Aucun log capturé.';
  }

  function markAppSessionStart() {
    const previous = readStorageJson(APP_SESSION_KEY, null);
    if (previous && previous.clean === false) {
      state.crashRecovered = true;
      state.safeMode = true;
      pushLog('warn', `Crash précédent détecté: ${previous.startedAt || '-'}`);
      setSideStatus('Recovery : dernière session non fermée proprement', 'warn');
    }
    writeStorageJson(APP_SESSION_KEY, {
      clean: false,
      startedAt: new Date().toISOString(),
      version: 1
    });
    window.addEventListener('beforeunload', () => {
      writeStorageJson(APP_SESSION_KEY, {
        clean: true,
        closedAt: new Date().toISOString(),
        version: 1
      });
    });
  }

  function openLogDrawer() {
    $('#log-drawer')?.classList.remove('hidden');
    renderDebugLogs();
  }

  function closeLogDrawer() {
    $('#log-drawer')?.classList.add('hidden');
  }

  function autoPrematchEnabled() {
    return localStorage.getItem('autoPrematchEnabled') !== 'off';
  }

  function readAutoPrematchLast() {
    try {
      const raw = localStorage.getItem('autoPrematchLast');
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeAutoPrematchLast(record) {
    try {
      localStorage.setItem('autoPrematchLast', JSON.stringify(record));
    } catch {
      // localStorage can fail in restricted profiles; the refresh still runs.
    }
  }

  function autoCriticalEnabled() {
    return localStorage.getItem('autoCriticalEnabled') !== 'off';
  }

  function readAutoCriticalLast() {
    try {
      const raw = localStorage.getItem('autoCriticalLast');
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeAutoCriticalLast(record) {
    try {
      localStorage.setItem('autoCriticalLast', JSON.stringify(record));
    } catch {
      // localStorage peut être indisponible sur certains profils Electron durcis.
    }
  }

  function autoCriticalLastLabel(record = readAutoCriticalLast()) {
    if (!record) return '';
    const at = record.finishedAt || record.triggeredAt;
    const status = record.status === 'ok'
      ? 'OK'
      : record.status === 'failed'
        ? 'erreur'
        : 'en cours';
    const blockers = Number(record.blockers || 0);
    return `Dernière file critique auto : ${formatDateTime(at)} · ${formatCount(blockers)} blocage(s) · ${status}`;
  }

  function updateAutoCriticalButton() {
    const btn = $('#auto-critical-toggle');
    if (!btn) return;
    const enabled = autoCriticalEnabled();
    const blockers = Number(state.prebetChecklist?.summary?.blockers || 0);
    btn.textContent = enabled ? `Auto file critique: actif${blockers ? ` · ${blockers}` : ''}` : 'Auto file critique: pause';
    btn.title = autoCriticalLastLabel() || 'Le logiciel peut lancer la file critique quand la checklist avant mise est rouge.';
    btn.classList.toggle('is-paused', !enabled);
  }

  function autoPrematchLastLabel(record = readAutoPrematchLast()) {
    if (!record) return '';
    const at = record.finishedAt || record.triggeredAt;
    const status = record.status === 'ok'
      ? 'OK'
      : record.status === 'failed'
        ? 'erreur'
        : 'en cours';
    const count = Number(record.count || 0);
    return `Dernier auto pré-match : ${formatDateTime(at)} · ${formatCount(count)} match(s) · ${status}`;
  }

  function updateAutoPrematchButton() {
    const btn = $('#auto-prematch-toggle');
    if (!btn) return;
    const enabled = autoPrematchEnabled();
    const due = Number(state.prematchPlan?.autoDue || 0);
    btn.textContent = enabled ? `Auto pré-match: actif${due ? ` · ${due}` : ''}` : 'Auto pré-match: pause';
    btn.title = autoPrematchLastLabel() || 'Le logiciel peut relancer le pré-match final quand un match surveillé approche.';
    btn.classList.toggle('is-paused', !enabled);
  }

  function renderWatchlist() {
    const grid = $('#watchlist-grid');
    const caption = $('#watchlist-caption');
    if (!grid) return;
    updateAutoPrematchButton();
    const rows = Array.isArray(state.watchlist) ? state.watchlist : [];
    const autoDue = rows.filter((row) => row.autoRefreshDue).length;
    if (caption) {
      const last = autoPrematchLastLabel();
      const suffix = last ? ` ${last}` : '';
      caption.textContent = autoDue
        ? `${autoDue} match(s) proche(s) peuvent déclencher le pré-match final.${suffix}`
        : `Picks avec edge positif mais attente de contexte, compo, cote ou calibration.${suffix}`;
    }
    if (!rows.length) {
      grid.innerHTML = '<div class="empty">Aucun pick à surveiller : les règles actuelles ne retiennent que les positions assez propres.</div>';
      return;
    }
    grid.innerHTML = rows.slice(0, 8).map((item) => {
      const tone = item.autoRefreshDue ? 'due' : Number(item.trustScore || 0) < 50 ? 'fragile' : 'watch';
      const minutes = Number(item.minutesToKickoff);
      const timeText = Number.isFinite(minutes)
        ? minutes < 0 ? `déjà lancé depuis ${Math.abs(minutes)} min` : `dans ${minutes} min`
        : formatDateLabel(item.start);
      const reasons = Array.isArray(item.reasons) && item.reasons.length ? item.reasons.join(' · ') : 'Observation prudente';
      const timing = item.marketTiming?.label ? ` · ${item.marketTiming.label}` : '';
      const oddsGuard = item.oddsGuardrail?.tone && item.oddsGuardrail.tone !== 'ok' ? ` · ${item.oddsGuardrail.label}` : '';
      return `
        <article class="watch-card ${tone} clickable-row" data-match-id="${escapeHtml(item.id)}" tabindex="0" role="button" aria-label="Ouvrir ${escapeHtml(item.title)}">
          <div class="watch-card-top">
            <span>${escapeHtml(item.autoRefreshDue ? 'Pré-match 60 min' : item.statusLabel || 'À surveiller')}</span>
            <strong>${escapeHtml(formatPct(item.edge || 0, 1))}</strong>
          </div>
          <h4>${escapeHtml(item.title || '-')}</h4>
          <p>${escapeHtml(formatMarketName(item.market || ''))} · ${escapeHtml(item.label || '-')} · ${formatOdd(item.odd)}</p>
          <small>${escapeHtml(item.action || 'Surveiller')} · ${escapeHtml(timeText)} · confiance ${Math.round(Number(item.trustScore || 0))}/100${escapeHtml(timing)}${escapeHtml(oddsGuard)}</small>
          <em>${escapeHtml(reasons)}</em>
        </article>
      `;
    }).join('');
  }

  function maybeAutoCriticalRefresh() {
    if (!autoCriticalEnabled()) return;
    if (navigator.webdriver) return;
    if (state.status?.refresh?.running) return;
    const summary = state.prebetChecklist?.summary || {};
    const blockers = Number(summary.blockers || 0);
    if (!blockers || summary.ready_to_bet === true) return;
    const items = Array.isArray(state.prebetChecklist?.items) ? state.prebetChecklist.items : [];
    const hasCriticalMode = items.some((item) => item && item.blocks_bet && (item.mode === 'critical' || item.priority === 'critical'));
    if (!hasCriticalMode) return;
    const last = readAutoCriticalLast();
    const lastTs = Date.parse(last?.triggeredAt || last?.finishedAt || '');
    if (Number.isFinite(lastTs) && Date.now() - lastTs < 90 * 60 * 1000) return;
    const key = `${new Date().toISOString().slice(0, 10)}:${summary.first || 'prebet'}:${blockers}`;
    if (sessionStorage.getItem('autoCriticalKey') === key) return;
    sessionStorage.setItem('autoCriticalKey', key);
    writeAutoCriticalLast({
      triggeredAt: new Date().toISOString(),
      blockers,
      first: summary.first || '',
      status: 'started'
    });
    updateAutoCriticalButton();
    setSideStatus('File critique auto lancée', 'warn');
    startRefresh('critical').catch((error) => {
      setSideStatus('File critique auto impossible', 'warn');
      writeAutoCriticalLast({
        ...(readAutoCriticalLast() || {}),
        finishedAt: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });
      renderPrebetChecklist();
      $('#refresh-log').textContent = error.stack || error.message;
    });
  }

  function prematchFinalRows() {
    const watch = Array.isArray(state.watchlist) ? state.watchlist : [];
    const byId = new Map();
    watch.forEach((row) => byId.set(row.id, { ...row, source: 'watchlist' }));
    const focusRows = Array.isArray(state.prematchFocus?.matches) ? state.prematchFocus.matches : [];
    focusRows.slice(0, 16).forEach((focus) => {
      const match = (Array.isArray(state.matches) ? state.matches : []).find((row) => {
        const wxId = String(row.match?.winamax?.match_id || '');
        return row.id === String(focus.match_id) || wxId === String(focus.match_id);
      });
      const id = match?.id || String(focus.match_id || '');
      if (!id || byId.has(id)) return;
      byId.set(id, {
        id,
        match_id: focus.match_id,
        title: focus.title,
        sport: focus.sport,
        league: focus.league,
        start: focus.start,
        minutesToKickoff: focus.minutes_to_kickoff,
        market: match?.market || 'Contexte',
        label: match?.label || 'Refresh ciblé',
        odd: match?.odd || 0,
        probability: match?.probability || 0,
        edge: match?.edge || 0,
        contextScore: focus.context_score,
        trustScore: Number(match?.confidenceTrust?.score || 0),
        status: match?.status || 'watch',
        statusLabel: focus.priority === 'critical' ? 'Urgent source' : 'Focus source',
        action: focus.refresh_mode === 'prematch' ? 'Lancer pré-match final' : 'Refresh contexte ciblé',
        reasons: [
          ...(focus.critical_missing || []),
          ...(focus.missing || []),
          ...(focus.stale || []),
          ...(focus.recommended_sources || []).map((src) => `source ${src}`)
        ].slice(0, 5),
        autoRefreshDue: focus.priority === 'critical',
        recommendedSources: focus.recommended_sources || [],
        source: 'prematch_focus'
      });
    });
    const nowish = (Array.isArray(state.matches) ? state.matches : [])
      .filter((row) => {
        const minutes = Number(minutesToKickoffValue(row.start));
        return Number.isFinite(minutes) && minutes >= -15 && minutes <= 120;
      })
      .filter((row) => row.status !== 'skip' || Number(row.edge || 0) > 0)
      .map((row) => ({
        id: row.id,
        title: row.title,
        sport: row.sport,
        league: row.league,
        start: row.start,
        minutesToKickoff: minutesToKickoffValue(row.start),
        market: row.market,
        label: row.label,
        odd: row.odd,
        probability: row.probability,
        edge: row.edge,
        contextScore: Number(row.contextQuality?.score ?? row.match?.context?.quality?.score),
        trustScore: Number(row.confidenceTrust?.score || 0),
        status: row.status,
        statusLabel: row.statusLabel,
        action: row.status === 'bet' ? 'Vérifier cote et compos' : 'Attendre signal final',
        reasons: [
          ...(row.marketTiming?.warnings || []),
          ...(row.contextGate?.warnings || []),
          ...(row.oddsGuardrail?.warnings || [])
        ].slice(0, 4),
        source: 'near'
      }));
    nowish.forEach((row) => {
      if (!byId.has(row.id)) byId.set(row.id, row);
    });
    return Array.from(byId.values())
      .sort((a, b) => {
        const am = Number.isFinite(Number(a.minutesToKickoff)) ? Math.abs(Number(a.minutesToKickoff)) : 99999;
        const bm = Number.isFinite(Number(b.minutesToKickoff)) ? Math.abs(Number(b.minutesToKickoff)) : 99999;
        return (a.autoRefreshDue === b.autoRefreshDue ? 0 : a.autoRefreshDue ? -1 : 1) || am - bm || (b.edge || 0) - (a.edge || 0);
      })
      .slice(0, 10);
  }

  function minutesToKickoffValue(start) {
    const ts = Date.parse(start || '');
    return Number.isFinite(ts) ? Math.round((ts - Date.now()) / 60000) : null;
  }

  function renderPrematchFinal() {
    const grid = $('#prematch-final-grid');
    if (!grid) return;
    const caption = $('#prematch-final-caption');
    const rows = prematchFinalRows();
    const due = rows.filter((row) => row.autoRefreshDue).length;
    const focus = state.prematchFocus?.summary || state.prematchPlan?.focus || null;
    if (caption) {
      caption.textContent = due
        ? `${due} contrôle(s) urgent(s) : compos, blessures, météo et cotes à rafraîchir.`
        : focus?.matches
          ? `${formatCount(focus.matches)} match(s) en focus source : cote, compos, confiance et signaux de marché.`
          : 'Contrôle final des matchs proches : cote, compos, confiance et signaux de marché.';
    }
    if (!rows.length) {
      grid.innerHTML = '<div class="empty">Aucun match proche à contrôler pour l’instant.</div>';
      return;
    }
    grid.innerHTML = rows.map((row) => {
      const minutes = Number(row.minutesToKickoff);
      const timeText = Number.isFinite(minutes)
        ? minutes < 0 ? `lancé depuis ${Math.abs(minutes)} min` : `dans ${minutes} min`
        : formatDateLabel(row.start);
      const tone = row.autoRefreshDue ? 'due' : row.status === 'bet' ? 'ready' : Number(row.trustScore || 0) < 55 ? 'fragile' : 'watch';
      const reasons = Array.isArray(row.reasons) && row.reasons.length ? row.reasons.join(' · ') : 'Vérification finale standard';
      const sources = Array.isArray(row.recommendedSources) && row.recommendedSources.length
        ? ` · sources ${row.recommendedSources.slice(0, 4).join(', ')}`
        : '';
      const step = Array.isArray(state.prematchExecution?.steps)
        ? state.prematchExecution.steps.find((item) => (item.match_ids || []).map(String).includes(String(row.id)) || (item.match_ids || []).map(String).includes(String(row.match_id)))
        : null;
      const plan = step ? ` · plan ${step.label}` : '';
      return `
        <article class="prematch-card prematch-${tone} clickable-row" data-match-id="${escapeHtml(row.id)}" tabindex="0" role="button" aria-label="Ouvrir ${escapeHtml(row.title)}">
          <div class="watch-card-top">
            <span>${escapeHtml(row.autoRefreshDue ? 'Urgent T-60' : row.statusLabel || 'Contrôle')}</span>
            <strong>${escapeHtml(timeText)}</strong>
          </div>
          <h4>${escapeHtml(row.title || '-')}</h4>
          <p>${escapeHtml(formatMarketName(row.market || ''))} · ${escapeHtml(row.label || '-')} · ${formatOdd(row.odd)}</p>
          <small>contexte ${Number.isFinite(Number(row.contextScore)) ? Math.round(Number(row.contextScore)) : '-'}/100 · confiance ${Math.round(Number(row.trustScore || 0))}/100 · edge ${formatPct(row.edge || 0, 1)}</small>
          <em>${escapeHtml(`${row.action || 'Vérifier'} · ${reasons}${sources}${plan}`)}</em>
        </article>
      `;
    }).join('');
  }

  function renderPrematchExecution() {
    const grid = $('#prematch-execution-grid');
    if (!grid) return;
    const caption = $('#prematch-execution-caption');
    const report = state.prematchExecution || {};
    const summary = report.summary || {};
    const steps = Array.isArray(report.steps) ? report.steps : [];
    if (caption) {
      const gateLabel = summary.final_gate === 'blocked'
        ? 'mise bloquée'
        : summary.final_gate === 'watch'
          ? 'observation'
          : summary.final_gate === 'ready'
            ? 'prêt'
            : 'lecture prudente';
      const eta = Number(summary.estimated_total_min || 0);
      caption.textContent = summary.steps
        ? `${formatCount(summary.steps)} étape(s), ${formatCount(summary.blocking_steps || 0)} bloquantes, état final ${gateLabel}${eta ? `, environ ${eta} min` : ''}.`
        : 'Étapes ciblées par source selon les trous du focus T-60.';
    }
    if (!steps.length) {
      grid.innerHTML = '<div class="empty">Aucun plan pré-match ciblé pour le moment.</div>';
      return;
    }
    const priorityLabel = { critical: 'Critique', high: 'Haut', medium: 'Moyen', low: 'Bas' };
    grid.innerHTML = steps.slice(0, 8).map((step) => {
      const mode = step.mode === 'prematch' ? 'prematch' : 'signals';
      const source = step.source || 'context';
      const disabled = Boolean(state.status?.refresh?.running);
      const buttonLabel = mode === 'prematch' ? 'Lancer pré-match' : `Rafraîchir ${signalSourceLabel(source)}`;
      const flags = [
        step.blocks_bet ? 'bloquant mise' : 'non bloquant',
        step.eta_minutes ? `${step.eta_minutes} min` : null
      ].filter(Boolean).join(' · ');
      return `
        <article class="quality-report-card quality-${step.priority === 'critical' ? 'danger' : step.priority === 'high' ? 'watch' : 'ok'}">
          <span>${escapeHtml(priorityLabel[step.priority] || step.priority || 'Priorité')}</span>
          <strong>${escapeHtml(step.label || step.source || '-')}</strong>
          <p>${escapeHtml(`${formatCount(step.matches || 0)} matchs · ${flags}${flags ? ' · ' : ''}${step.detail || 'Refresh ciblé.'}`)}</p>
          <button class="ghost-btn prematch-plan-btn" data-prematch-mode="${escapeHtml(mode)}" data-prematch-source="${escapeHtml(source)}" ${disabled ? 'disabled' : ''}>${escapeHtml(buttonLabel)}</button>
        </article>
      `;
    }).join('');
  }

  function maybeAutoPrematchRefresh() {
    if (!autoPrematchEnabled()) return;
    if (navigator.webdriver) return;
    if (state.status?.refresh?.running) return;
    const dueRows = (Array.isArray(state.watchlist) ? state.watchlist : []).filter((row) => row.autoRefreshDue);
    if (!dueRows.length) return;
    const age = Number(state.status?.ageMinutes || 0);
    if (age < 12) return;
    const key = `${new Date().toISOString().slice(0, 10)}:${dueRows.map((row) => row.id).slice(0, 6).join('|')}`;
    if (sessionStorage.getItem('autoPrematchKey') === key) return;
    sessionStorage.setItem('autoPrematchKey', key);
    writeAutoPrematchLast({
      triggeredAt: new Date().toISOString(),
      count: dueRows.length,
      ids: dueRows.map((row) => row.id).slice(0, 12),
      status: 'started'
    });
    updateAutoPrematchButton();
    setSideStatus('Pré-match auto lancé', 'warn');
    startRefresh('prematch').catch((error) => {
      setSideStatus('Pré-match auto impossible', 'warn');
      writeAutoPrematchLast({
        ...(readAutoPrematchLast() || {}),
        finishedAt: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });
      renderWatchlist();
      $('#refresh-log').textContent = error.stack || error.message;
    });
  }

  function stakeScenarioPlan(bankroll, picks, profile) {
    const dayBudget = bankroll * profile.dayCap;
    const rawRows = picks.map((pick) => {
      const baseStake = Math.max(0, Number(pick.stake || 0) * profile.multiplier);
      return { pick, stake: Math.min(baseStake, bankroll * profile.perBetCap) };
    });
    const rawTotal = rawRows.reduce((sum, row) => sum + row.stake, 0);
    const scale = rawTotal > dayBudget && rawTotal > 0 ? dayBudget / rawTotal : 1;
    const rows = rawRows
      .map((row) => ({ pick: row.pick, stake: Number((row.stake * scale).toFixed(2)) }))
      .filter((row) => row.stake > 0);
    const total = rows.reduce((sum, row) => sum + row.stake, 0);
    return {
      profile,
      rows,
      total,
      maxStake: rows.length ? Math.max(...rows.map((row) => row.stake)) : 0,
      average: rows.length ? total / rows.length : 0,
      exposure: bankroll > 0 ? total / bankroll : 0
    };
  }

  function stakeScenarioProfiles() {
    return [
      { key: 'prudent', label: 'Prudent', multiplier: 0.5, perBetCap: 0.05, dayCap: 0.10, detail: 'Demi-Kelly, cap pari 5%, cap jour 10%.' },
      { key: 'normal', label: 'Normal', multiplier: 1, perBetCap: 0.10, dayCap: 0.20, detail: 'Kelly strict du moteur, cap pari 10%, cap jour 20%.' },
      { key: 'agressif', label: 'Agressif', multiplier: 1.35, perBetCap: 0.12, dayCap: 0.25, detail: 'Kelly amplifié, cap pari 12%, cap jour 25%.' }
    ];
  }

  function renderStakeScenarioDetail(picks, plans) {
    const body = $('#stake-scenario-body');
    if (!body) return;
    if (!picks.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty">Aucun détail de mise disponible.</td></tr>';
      return;
    }
    const stakeByPick = new Map();
    plans.forEach((plan) => {
      plan.rows.forEach((row) => {
        if (!stakeByPick.has(row.pick.id)) stakeByPick.set(row.pick.id, {});
        stakeByPick.get(row.pick.id)[plan.profile.key] = row.stake;
      });
    });
    body.innerHTML = picks.slice(0, 12).map((pick) => {
      const stakes = stakeByPick.get(pick.id) || {};
      const edgeClass = pick.edge >= 0.08 ? 'edge-pos' : 'edge-warn';
      return `
        <tr class="clickable-row scenario-detail-row" data-match-id="${escapeHtml(pick.id)}" tabindex="0" role="button" aria-label="Ouvrir ${escapeHtml(pick.title)}">
          <td data-label="Match">
            <div class="match-title">${escapeHtml(pick.title)}</div>
            <div class="match-sub">${escapeHtml(pick.sport)} · ${escapeHtml(pick.league)}</div>
          </td>
          <td data-label="Marché"><span class="pill">${escapeHtml(pick.market)}</span><div class="match-sub">${escapeHtml(pick.label)}</div></td>
          <td data-label="Prudent" class="stake-value">${formatMoney(stakes.prudent || 0)}</td>
          <td data-label="Normal" class="stake-value">${formatMoney(stakes.normal || 0)}</td>
          <td data-label="Agressif" class="stake-value">${formatMoney(stakes.agressif || 0)}</td>
          <td data-label="Edge" class="${edgeClass}">${formatPct(pick.edge, 1)}</td>
        </tr>
      `;
    }).join('');
  }

  function renderStakeScenarios(emptyMessage) {
    const wrap = $('#stake-scenario-grid');
    if (!wrap) return;
    const picks = state.picks.filter((pick) => canDisplayStake(pick) && Number(pick.edge || 0) > 0);
    const bankroll = getBankroll();
    if (!picks.length || !(bankroll > 0)) {
      wrap.innerHTML = `<div class="empty">${escapeHtml(emptyMessage || 'Aucun scénario actif : pas de pick user jouable.')}</div>`;
      renderStakeScenarioDetail([], []);
      return;
    }
    const profiles = stakeScenarioProfiles();
    const plans = profiles.map((profile) => stakeScenarioPlan(bankroll, picks, profile));
    wrap.innerHTML = plans.map((plan) => {
      return `
        <article class="scenario-card ${plan.profile.key}">
          <span>${escapeHtml(plan.profile.label)}</span>
          <strong>${formatMoney(plan.total)}</strong>
          <p>${formatCount(plan.rows.length)} picks · max ${formatMoney(plan.maxStake)} · moyenne ${formatMoney(plan.average)}</p>
          <small>${formatPct(plan.exposure, 0)} de bankroll. ${escapeHtml(plan.profile.detail)}</small>
        </article>
      `;
    }).join('');
    renderStakeScenarioDetail(picks, plans);
  }

  function renderMatches() {
    updateSportFilter();
    updateLeagueFilter();
    const body = $('#matches-body');
    if (!body) return;
    const filters = currentMatchFilters();
    const rows = filteredMatchRows(filters);
    renderMatchesBacktest(rows, filters);
    const visibleRows = rows.slice(0, 250);

    if (!visibleRows.length) {
      body.innerHTML = '<tr><td colspan="7" class="empty">Aucun match dans ce filtre.</td></tr>';
      return;
    }
    body.innerHTML = visibleRows.map((row) => {
      const edgeClass = row.edge >= 0.08 ? 'edge-pos' : row.edge > 0 ? 'edge-warn' : 'status-skip';
      const dcStatus = row.decisionCenter?.status || row.status;
      const statusClass = dcStatus === 'ready' ? 'status-bet' : dcStatus === 'watch' || dcStatus === 'repair' ? 'status-watch' : 'status-skip';
      const statusLabel = dcStatus === 'ready'
        ? 'Prêt'
        : dcStatus === 'repair'
          ? 'À réparer'
          : dcStatus === 'skip'
            ? 'À éviter'
            : row.decisionCenter?.mainReason || row.statusLabel;
      return `
        <tr class="clickable-row" data-match-id="${escapeHtml(row.id)}" tabindex="0" role="button" aria-label="Ouvrir ${escapeHtml(row.title)}">
          <td data-label="Match">
            <div class="match-title">${escapeHtml(row.title)}</div>
            <div class="match-sub">${escapeHtml(row.sport)} · ${escapeHtml(row.league)}</div>
          </td>
          <td data-label="Marché"><span class="pill">${escapeHtml(row.market)}</span><div class="match-sub">${escapeHtml(row.label)}</div>${calibrationNote(row)}</td>
          <td data-label="Cote">${row.odd > 1 ? `@${row.odd.toFixed(2)}` : '-'}</td>
          <td data-label="Proba">${row.probability > 0 ? formatPct(row.probability, 1) : '-'}</td>
          <td data-label="Edge" class="${edgeClass}">${row.edge > 0 ? formatPct(row.edge, 1) : '-'}</td>
          <td data-label="Statut" class="${statusClass}">${escapeHtml(statusLabel)}</td>
          <td data-label="Départ">${escapeHtml(formatDateLabel(row.start))}</td>
        </tr>`;
    }).join('');
  }

  function currentMatchFilters() {
    return {
      query: ($('#match-search')?.value || '').trim().toLowerCase(),
      sport: $('#sport-filter')?.value || 'all',
      calibration: $('#calibration-filter')?.value || 'all',
      edgeBucket: $('#edge-filter')?.value || 'all',
      league: $('#league-filter')?.value || 'all'
    };
  }

  function filteredMatchRows(filters = currentMatchFilters()) {
    return state.matches
      .filter((row) => filters.sport === 'all' || row.sport === filters.sport)
      .filter((row) => filters.league === 'all' || (row.calibration?.leagueKey || leagueKeyFromRow(row)) === filters.league)
      .filter((row) => filters.edgeBucket === 'all' || row.calibration?.edgeKey === filters.edgeBucket)
      .filter((row) => calibrationMatches(row, filters.calibration))
      .filter((row) => !filters.query || `${row.title} ${row.league} ${row.label}`.toLowerCase().includes(filters.query))
      .sort((a, b) => {
        const rank = { bet: 0, watch: 1, skip: 2 };
        return (rank[a.status] - rank[b.status]) || (Date.parse(a.start || '') - Date.parse(b.start || ''));
      });
  }

  function calibrationBucketForRow(row, filters) {
    const calibration = state.calibration || state.history?.calibration || {};
    if (filters.league !== 'all') {
      const bucket = calibration.byLeague?.[filters.league];
      return bucket ? ['league', bucket] : null;
    }
    if (filters.edgeBucket !== 'all') {
      const bucket = calibration.byEdgeBucket?.[filters.edgeBucket];
      return bucket ? ['edge', bucket] : null;
    }
    const marketKey = row.calibration?.marketKey;
    const bucket = marketKey ? calibration.byMarket?.[marketKey] : null;
    return bucket ? ['market', bucket] : null;
  }

  function calibrationBucketsForRows(rows, filters) {
    const seen = new Set();
    const buckets = [];
    rows.forEach((row) => {
      const found = calibrationBucketForRow(row, filters);
      if (!found) return;
      const [scope, bucket] = found;
      const key = `${scope}:${bucket.key}`;
      if (seen.has(key)) return;
      seen.add(key);
      buckets.push({ scope, bucket });
    });
    return buckets;
  }

  function aggregateCalibrationBuckets(rows, filters) {
    const aggregate = { count: 0, won: 0, lost: 0, pnl: 0, implied: 0, odd: 0, buckets: 0 };
    calibrationBucketsForRows(rows, filters).forEach(({ bucket }) => {
      const count = Number(bucket.count || 0);
      if (!(count > 0)) return;
      aggregate.count += count;
      aggregate.won += Number(bucket.won || 0);
      aggregate.lost += Number(bucket.lost || 0);
      aggregate.pnl += Number(bucket.roi || 0) * count;
      aggregate.implied += Number(bucket.avgImplied || 0) * count;
      aggregate.odd += Number(bucket.avgOdd || 0) * count;
      aggregate.buckets += 1;
    });
    if (!aggregate.count) return null;
    return {
      count: aggregate.count,
      buckets: aggregate.buckets,
      winRate: aggregate.won / aggregate.count,
      roi: aggregate.pnl / aggregate.count,
      avgImplied: aggregate.implied / aggregate.count,
      avgOdd: aggregate.odd / aggregate.count
    };
  }

  function activeFilterLabel(filters) {
    const parts = [];
    if (filters.sport !== 'all') parts.push(filters.sport);
    if (filters.calibration !== 'all') parts.push(`risque ${filters.calibration}`);
    if (filters.edgeBucket !== 'all') parts.push(edgeBucketLabel(filters.edgeBucket));
    if (filters.league !== 'all') parts.push(filters.league.toUpperCase());
    if (filters.query) parts.push(`recherche "${filters.query}"`);
    return parts.length ? parts.join(' · ') : 'Tous les matchs';
  }

  function renderMatchesBacktest(rows, filters) {
    const wrap = $('#matches-backtest-grid');
    if (!wrap) return;
    const aggregate = aggregateCalibrationBuckets(rows, filters);
    const playable = rows.filter((row) => row.status === 'bet' || row.status === 'watch').length;
    const blocked = rows.filter((row) => row.calibration?.blocked).length;
    const cards = [
      {
        label: 'Filtre courant',
        value: formatCount(rows.length),
        detail: `${activeFilterLabel(filters)} · ${formatCount(playable)} jouables`
      },
      {
        label: 'Backtest comparable',
        value: aggregate ? formatCount(aggregate.count) : '-',
        detail: aggregate ? `${formatCount(aggregate.buckets)} buckets historiques` : 'Sample indisponible pour ce filtre.'
      },
      {
        label: 'ROI historique',
        value: aggregate ? formatPct(aggregate.roi, 0) : '-',
        detail: aggregate ? `Win ${formatPct(aggregate.winRate, 0)} · attendu ${formatPct(aggregate.avgImplied, 0)}` : 'En attente de picks réglés.'
      },
      {
        label: 'Garde-fous',
        value: formatCount(blocked),
        detail: blocked ? 'Picks freinés dans le filtre.' : 'Aucun frein actif sur le filtre.'
      }
    ];
    wrap.innerHTML = cards.map((card) => `
      <article class="backtest-card">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `).join('');
  }

  function renderCombines() {
    const wrap = $('#combines-list');
    if (!wrap) return;
    if (!state.combines.length) {
      wrap.innerHTML = '<div class="empty">Aucun combiné exploitable avec les règles actuelles.</div>';
      return;
    }
    const tracked = new Set(loadUserBets().filter((bet) => bet.status === 'pending').map((bet) => bet.key));
    const sortedCombines = state.combines.slice().sort((a, b) => {
      const edgeA = (Array.isArray(a.legs) ? a.legs : []).reduce((sum, leg) => sum + Number(leg.edge || 0), 0) / Math.max(1, (a.legs || []).length);
      const edgeB = (Array.isArray(b.legs) ? b.legs : []).reduce((sum, leg) => sum + Number(leg.edge || 0), 0) / Math.max(1, (b.legs || []).length);
      return edgeB - edgeA || Number(b.totalOdd || 0) - Number(a.totalOdd || 0);
    });
    wrap.innerHTML = sortedCombines.map((combo) => {
      const legs = Array.isArray(combo.legs) ? combo.legs : [];
      const key = comboKey(combo);
      const trackedCombo = tracked.has(key);
      const totalOdd = Number(combo.totalOdd || 0);
      const returnForTen = totalOdd > 1 ? totalOdd * 10 : 0;
      const edgeCompound = legs.reduce((sum, leg) => sum + Number(leg.edge || 0), 0) / Math.max(1, legs.length);
      const correlation = Number(combo.correlationAvg || combo.avgCorrelation || 0);
      const titleText = `${combo.type || ''} ${combo.title || ''} ${combo.desc || ''}`.toLowerCase();
      const variant = titleText.includes('safe') || titleText.includes('lock') || titleText.includes('sûr')
        ? 'Safe'
        : legs.some((leg) => /btts|but|total|o\/u|over|under/i.test(`${leg.market} ${leg.label}`))
          ? 'Buts'
          : totalOdd >= 5
            ? 'Outsider'
            : 'Best Edge';
      return `
        <article class="combo-card">
          <div class="combo-head">
            <div>
              <h4>${escapeHtml(combo.title)}</h4>
              <p class="match-sub">${escapeHtml(combo.desc || 'Ticket multi-marché')}</p>
            </div>
            <span class="pill">${escapeHtml(variant)}</span>
            <span class="pill">${combo.sameGame ? 'Same-game' : 'Multi-match'}</span>
          </div>
          <div class="combo-stats">
            <div class="mini-stat"><span>Cote</span><strong>${formatOdd(combo.totalOdd).replace('@', '')}</strong></div>
            <div class="mini-stat"><span>Proba</span><strong>${combo.combinedProb > 0 ? formatPct(combo.combinedProb, 1) : formatPct(combo.avgProb, 1)}</strong></div>
            <div class="mini-stat"><span>Retour 10€</span><strong>${returnForTen > 0 ? formatMoney(returnForTen) : '-'}</strong></div>
            <div class="mini-stat"><span>Corrélation</span><strong>${formatPct(correlation, 0)}</strong></div>
            <div class="mini-stat"><span>Edge moyen</span><strong>${formatPct(edgeCompound, 1)}</strong></div>
            <div class="mini-stat"><span>Jambes</span><strong>${legs.length}</strong></div>
          </div>
          <div class="leg-list">
            ${legs.map((leg) => `
              <div class="leg-row clickable-row" data-match-id="${escapeHtml(leg.id)}" tabindex="0" role="button" aria-label="Ouvrir ${escapeHtml(leg.title)}">
                <div>
                  <div class="match-title">${escapeHtml(leg.title)}</div>
                  <div class="match-sub">${escapeHtml(leg.market)} · ${escapeHtml(leg.label)}</div>
                </div>
                <strong>${formatOdd(leg.odd)}</strong>
              </div>
            `).join('')}
          </div>
          <button class="track-bet-btn combo-track-btn${trackedCombo ? ' tracked' : ''}" type="button" data-track-combo-key="${escapeHtml(key)}">${trackedCombo ? 'Combiné suivi' : 'Je mise le combiné'}</button>
        </article>`;
    }).join('');
  }

  function scorerAvatarHtml(scorer) {
    const initial = cleanLabel(scorer.name, '?').trim().charAt(0).toUpperCase() || '?';
    return `<div class="avatar-fallback">${escapeHtml(initial)}</div>`;
  }

  function scorerLeagueKey(scorer) {
    return normalizeUiKey(scorer?.league || 'ligue');
  }

  function updateScorerFilters() {
    const select = $('#scorer-league-filter');
    if (!select) return;
    const current = select.value || 'all';
    const leagues = Array.from(new Map((state.scorers || []).map((scorer) => [scorerLeagueKey(scorer), scorer.league || 'Ligue inconnue'])).entries())
      .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
    const html = ['<option value="all">Toutes ligues</option>', ...leagues.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`)].join('');
    if (select.dataset.optionsHtml !== html) {
      select.innerHTML = html;
      select.dataset.optionsHtml = html;
      select.value = leagues.some(([key]) => key === current) ? current : 'all';
    }
  }

  function readScorerFilters() {
    return {
      query: normalizeUiKey($('#scorer-search')?.value || ''),
      league: $('#scorer-league-filter')?.value || 'all',
      market: $('#scorer-market-filter')?.value || 'all',
      oddMin: Number($('#scorer-odd-min')?.value || 0) || 0,
      oddMax: Number($('#scorer-odd-max')?.value || 0) || 0,
      sort: $('#scorer-sort')?.value || 'kickoff'
    };
  }

  function scorerSearchText(scorer) {
    return normalizeUiKey([scorer?.name, scorer?.teamName, scorer?.title, scorer?.league, scorer?.position].join(' '));
  }

  function filteredScorers() {
    updateScorerFilters();
    const filters = readScorerFilters();
    const rows = (state.scorers || []).filter((scorer) => {
      const odd = Number(scorer.impliedOdd || 0);
      if (filters.query && !scorerSearchText(scorer).includes(filters.query)) return false;
      if (filters.league !== 'all' && scorerLeagueKey(scorer) !== filters.league) return false;
      if (filters.market !== 'all' && filters.market !== 'buteur') return false;
      if (filters.oddMin > 1 && odd < filters.oddMin) return false;
      if (filters.oddMax > 1 && odd > filters.oddMax) return false;
      return true;
    });
    rows.sort((a, b) => {
      if (filters.sort === 'confidence') return Number(b.probability || 0) - Number(a.probability || 0);
      if (filters.sort === 'edge') return Number(b.playerQuality?.score || 0) - Number(a.playerQuality?.score || 0);
      if (filters.sort === 'odd') return Number(b.impliedOdd || 0) - Number(a.impliedOdd || 0);
      return Date.parse(a.start || '') - Date.parse(b.start || '') || Number(b.probability || 0) - Number(a.probability || 0);
    });
    return rows;
  }

  function scorerToTrackRow(scorer) {
    const odd = Number(scorer?.impliedOdd || 0);
    return {
      id: scorer?.matchId || scorer?.id || '',
      match: {
        id: scorer?.matchId || scorer?.id || '',
        date: scorer?.start || '',
        winamax: { available: true, url: scorer?.winamaxUrl || '' }
      },
      title: scorer?.title || 'Match joueur',
      sport: 'football',
      league: scorer?.league || '',
      start: scorer?.start || '',
      market: 'Buteur',
      marketKey: 'scorer',
      label: scorer?.name || 'Joueur',
      odd: odd > 1 ? odd : 1,
      probability: Number(scorer?.probability || 0) || 0,
      edge: 0,
      stake: Math.max(0.5, Math.min(getBankroll() * 0.01, getBankroll() * 0.03)),
      status: 'bet',
      statusLabel: 'Buteur à vérifier',
      decisionCenter: { canBet: true, status: 'ready', mainReason: 'Pick joueur suivi manuellement après vérification Winamax.' },
      contextQuality: { score: Number(scorer?.playerQuality?.score || 0) || null }
    };
  }

  function trackScorerBet(id) {
    const scorer = (state.scorers || []).find((row) => String(row.id) === String(id));
    if (!scorer) return;
    const row = scorerToTrackRow(scorer);
    trackUserBet(row);
  }

  function renderScorers() {
    const wrap = $('#scorers-list');
    if (!wrap) return;
    const rows = filteredScorers();
    if (!state.scorers.length) {
      wrap.innerHTML = '<div class="empty">Aucun pick joueur disponible aujourd’hui. Le logiciel l’indique clairement au lieu de remplir avec du bruit.</div>';
      return;
    }
    if (!rows.length) {
      wrap.innerHTML = '<div class="empty">Aucun buteur ne correspond aux filtres actuels.</div>';
      return;
    }
    wrap.innerHTML = rows.map((scorer) => {
      const pct = Math.max(0, Math.min(100, Math.round((Number(scorer.probability) || 0) * 100)));
      const meterClass = `meter-w-${Math.round(pct / 5) * 5}`;
      const quality = scorer.playerQuality || {};
      const qualityClass = quality.gate === 'strong' ? 'strong' : quality.gate === 'fragile' ? 'fragile' : 'watch';
      const reasonText = Array.isArray(quality.reasons) && quality.reasons.length ? quality.reasons.join(' · ') : 'Profil joueur';
      return `
        <article class="scorer-card scorer-${qualityClass} clickable-row" data-match-id="${escapeHtml(scorer.matchId)}" tabindex="0" role="button" aria-label="Ouvrir ${escapeHtml(scorer.title)}">
          <div class="player-line">
            ${scorerAvatarHtml(scorer)}
            <div>
              <div class="match-title">${escapeHtml(scorer.name)}${scorer.captain ? ' (cap.)' : ''}</div>
              <div class="match-sub">${escapeHtml(scorer.teamName || 'Equipe')} · ${escapeHtml(scorer.position || 'joueur')}</div>
            </div>
            <strong class="edge-pos">${formatPct(scorer.probability, 0)}</strong>
          </div>
          <div>
            <div class="scorer-meter"><span class="${meterClass}"></span></div>
            <div class="match-sub scorer-match-sub">${escapeHtml(scorer.title)} · ${escapeHtml(scorer.league || '')}</div>
          </div>
          <div class="scorer-quality-line">
            <span>${escapeHtml(quality.label || 'Profil joueur')}</span>
            <strong>${Number.isFinite(Number(quality.score)) ? `${Math.round(Number(quality.score))}/100` : '-'}</strong>
          </div>
          <p class="scorer-reasons">${escapeHtml(`Buteur · ${reasonText}`)}</p>
          <div class="scorer-footer">
            <div class="mini-stat"><span>Cote fair</span><strong>${formatOdd(scorer.impliedOdd)}</strong></div>
            <div class="mini-stat"><span>Départ</span><strong>${escapeHtml(formatDateLabel(scorer.start))}</strong></div>
            <div class="mini-stat"><span>Source</span><strong>${scorer.source === 'star_players' ? 'Profil' : 'Lineup'}</strong></div>
          </div>
          <button type="button" class="track-bet-btn scorer-track-btn" data-track-scorer-id="${escapeHtml(scorer.id)}">Je mise</button>
        </article>`;
    }).join('');
  }

  function renderScorerReport() {
    const grid = $('#scorer-report-grid');
    if (!grid) return;
    const report = state.scorerQuality || {};
    const summary = report.summary || {};
    if (!summary.football_bookable) {
      grid.innerHTML = '<div class="empty">Rapport qualité buteurs indisponible. Lance un refresh quick pour le recalculer.</div>';
      return;
    }
    const archive = state.scorerCandidates || {};
    const settlement = state.scorerSettlement || {};
    const rows = [
      {
        label: 'Readiness',
        value: formatPct(summary.ready_rate || 0, 0),
        detail: `${formatCount(summary.ready || 0)} prêts · ${formatCount(summary.watch || 0)} à vérifier · ${formatCount(summary.fragile || 0)} fragiles.`
      },
      {
        label: 'Marché joueur',
        value: formatPct(summary.player_market_rate || 0, 0),
        detail: 'Sans marché buteur/joueur détecté, le logiciel garde le pick secondaire.'
      },
      {
        label: 'Compos',
        value: formatPct(summary.lineup_rate || 0, 0),
        detail: `${formatPct(summary.lineup_confirmed_rate || 0, 0)} confirmées · profils probables sinon.`
      },
      {
        label: 'Profils stars',
        value: formatPct(summary.stars_both_rate || 0, 0),
        detail: 'Deux équipes couvertes pour éviter un buteur isolé sans contexte.'
      },
      {
        label: 'Archive candidats',
        value: formatCount(archive.history_rows || 0),
        detail: `${formatCount(archive.added_rows || 0)} nouveaux profils capturés au dernier refresh · settlement futur.`
      },
      {
        label: 'Settlement',
        value: formatPct(settlement.hit_rate || 0, 0),
        detail: `${formatCount(settlement.settled_total || 0)} réglés · ${formatCount(settlement.pending || 0)} en attente · jamais perdu sans scorers.`
      }
    ];
    grid.innerHTML = rows.map((row) => `
      <article class="quality-report-card quality-ok">
        <span>${escapeHtml(row.label)}</span>
        <strong>${escapeHtml(row.value)}</strong>
        <p>${escapeHtml(row.detail)}</p>
      </article>
    `).join('');
  }

  function renderScorerPendingAudit() {
    const grid = $('#scorer-pending-grid');
    if (!grid) return;
    const report = state.scorerPendingAudit || {};
    const summary = report.summary || {};
    if (!summary.history_rows) {
      grid.innerHTML = '<div class="empty">Audit pending buteurs indisponible avant le prochain refresh.</div>';
      return;
    }
    const ageRows = Array.isArray(report.by_age) ? report.by_age : [];
    const gateRows = Array.isArray(report.by_gate) ? report.by_gate : [];
    const leagueRows = Array.isArray(report.by_league) ? report.by_league : [];
    const actions = Array.isArray(report.actions) ? report.actions : [];
    const ageLine = ageRows
      .filter((row) => Number(row.count || 0) > 0)
      .map((row) => `${row.key}: ${row.count}`)
      .slice(0, 4)
      .join(' · ') || 'Aucun pending âgé.';
    const gateLine = gateRows.map((row) => `${row.key}: ${row.count}`).slice(0, 3).join(' · ') || 'Aucun gate pending.';
    const leagueLine = leagueRows.map((row) => `${row.key}: ${row.count}`).slice(0, 3).join(' · ') || 'Pas de ligue dominante.';
    const cards = [
      {
        label: 'Pending',
        value: formatCount(summary.pending || 0),
        detail: `${formatCount(summary.pending_matches || 0)} matchs · ${formatCount(summary.settled_total || 0)} réglés.`
      },
      {
        label: 'Âge pending',
        value: ageLine.includes('6_24h') || ageLine.includes('1_3d') ? 'À revoir' : 'Normal',
        detail: ageLine
      },
      {
        label: 'Gates',
        value: formatCount(summary.history_rows || 0),
        detail: gateLine
      },
      {
        label: 'Ligues',
        value: formatCount(leagueRows.length),
        detail: leagueLine
      },
      {
        label: 'Actions',
        value: formatCount(actions.length),
        detail: actions[0]?.detail || 'Aucune action buteur urgente.'
      },
      {
        label: 'Promotion',
        value: summary.promotion_allowed ? 'Secondaire OK' : 'Bloquée',
        detail: summary.promotion_reason || 'Buteurs gardés en contexte tant que le settlement reste faible.'
      }
    ];
    grid.innerHTML = cards.map((card) => `
      <article class="quality-report-card quality-watch">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `).join('');
  }

  function resultClass(result) {
    const key = String(result || '').toLowerCase();
    if (key === 'won') return 'result-won';
    if (key === 'lost') return 'result-lost';
    if (key === 'pending') return 'result-pending';
    return 'result-void';
  }

  function resultLabel(result) {
    const labels = { won: 'Gagné', lost: 'Perdu', void: 'Void', pending: 'Pending' };
    return labels[String(result || '').toLowerCase()] || cleanLabel(result, '-');
  }

  function calibrationLevelLabel(level) {
    const labels = {
      warm: 'Chaud',
      cold: 'Froid',
      tracked: 'Suivi',
      sample_wait: 'Sample'
    };
    return labels[String(level || '')] || 'Inconnu';
  }

  function edgeBucketLabel(key) {
    const labels = {
      edge_00_05: 'Edge 0-5%',
      edge_05_10: 'Edge 5-10%',
      edge_10_20: 'Edge 10-20%',
      edge_20_plus: 'Edge 20%+',
      edge_unknown: 'Edge inconnu'
    };
    return labels[key] || key;
  }

  function renderCalibrationCards(grid, buckets, options = {}) {
    if (!grid) return;
    const rows = (Array.isArray(buckets) ? buckets : []).slice(0, options.limit || 8);
    if (!rows.length) {
      grid.innerHTML = `<div class="empty">${escapeHtml(options.empty || 'Pas encore assez d’historique calibrable.')}</div>`;
      return;
    }
    grid.innerHTML = rows.map((bucket) => {
      const cls = bucket.level === 'warm' ? 'warm' : bucket.level === 'cold' ? 'cold' : bucket.level === 'tracked' ? 'tracked' : 'sample';
      const label = typeof options.label === 'function' ? options.label(bucket) : formatMarketName(bucket.key);
      return `
        <article class="calibration-card ${cls}">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(formatPct(bucket.roi, 0))}</strong>
          <small>${escapeHtml(calibrationLevelLabel(bucket.level))} · ${formatCount(bucket.count)} réglés</small>
          <p>Win ${escapeHtml(formatPct(bucket.winRate, 0))} · attendu ${escapeHtml(formatPct(bucket.avgImplied, 0))} · cote moy. ${bucket.avgOdd ? bucket.avgOdd.toFixed(2) : '-'}</p>
        </article>`;
    }).join('');
  }

  function renderCalibration() {
    const calibration = state.calibration || state.history?.calibration || null;
    const grid = $('#calibration-market-grid');
    const marketContextGrid = $('#calibration-market-context-grid');
    const leagueGrid = $('#calibration-league-grid');
    const edgeGrid = $('#calibration-edge-grid');
    if (!grid) return;
    const markets = Array.isArray(calibration?.markets) ? calibration.markets.slice(0, 8) : [];
    const marketContexts = Array.isArray(calibration?.marketContexts) ? calibration.marketContexts.slice(0, 8) : [];
    const leagues = Array.isArray(calibration?.leagues) ? calibration.leagues.slice(0, 6) : [];
    const edgeBuckets = Array.isArray(calibration?.edgeBuckets) ? calibration.edgeBuckets : [];
    const summary = $('#calibration-summary');
    if (summary) {
      summary.textContent = calibration
        ? `${formatCount(calibration.settled)} picks réglés · sample minimum ${formatCount(calibration.minSamples)}.`
        : 'Historique réglé par marché, ligue et tranche d’edge.';
    }
    renderCalibrationCards(grid, markets, { empty: 'Pas encore assez d’historique calibrable.' });
    renderCalibrationCards(marketContextGrid, marketContexts, {
      limit: 8,
      empty: 'Pas encore assez de couples marché/contexte.',
      label: (bucket) => String(bucket.key || '').replace(':', ' · ')
    });
    renderCalibrationCards(leagueGrid, leagues, {
      limit: 6,
      empty: 'Pas encore assez de ligues calibrables.',
      label: (bucket) => String(bucket.key || '').toUpperCase()
    });
    renderCalibrationCards(edgeGrid, edgeBuckets, {
      limit: 4,
      empty: 'Pas encore assez de tranches d’edge.',
      label: (bucket) => edgeBucketLabel(bucket.key)
    });
  }

  function segmentTone(row) {
    const roi = Number(row?.roi || 0);
    const sample = String(row?.sample_level || row?.level || '').toLowerCase();
    if (roi > 0.05) return 'warm';
    if (roi < -0.05 && sample !== 'faible') return 'cold';
    return 'sample';
  }

  function renderModelPerformance() {
    const grid = $('#model-performance-grid');
    const segmentGrid = $('#model-segment-grid');
    const plot = $('#calibration-plot-grid');
    const report = state.modelLab || {};
    const summary = report.summary || {};
    if (grid) {
      const userStats = userBetStats();
      const marketClv = state.clvSummary?.summary || {};
      const clvLabel = userStats.clvSamples
        ? formatPct(userStats.clvMeanPct, 2)
        : marketClv.mean_clv_pct != null
          ? `${Number(marketClv.mean_clv_pct).toFixed(2)}%`
          : '-';
      const clvDetail = userStats.clvSamples
        ? `${formatCount(userStats.clvSamples)} paris suivis · ${formatPct(userStats.clvPositiveRate, 0)} positifs`
        : marketClv.n ? `${formatCount(marketClv.n)} observations marché · sample ${marketClv.sample_status || 'learning'}` : 'Se remplit avec les paris suivis.';
      const cards = [
        ['Picks réglés', formatCount(summary.settled_rows || state.history?.settled || 0), 'Sample utilisé pour juger la stratégie.'],
        [termTip('ROI cumulé', 'Retour sur investissement : P&L divisé par les mises.'), formatPct(summary.roi || 0, 1), `${formatSignedUnits(summary.pnl_units || 0)} en flat historique.`, true],
        ['Win rate', formatPct(summary.hit_rate || state.history?.winRate || 0, 1), 'Taux brut, moins important que la calibration.'],
        [termTip('Brier', 'Score de qualité des probabilités : plus il est bas, mieux c’est.'), Number.isFinite(Number(summary.brier)) ? Number(summary.brier).toFixed(3) : '-', 'Plus bas = probabilités mieux calibrées.', true],
        [termTip('CLV moyen', 'Compare la cote prise à la cote proche du coup d’envoi.'), clvLabel, clvDetail, true],
        ['Drawdown', Number.isFinite(Number(summary.max_drawdown_units)) ? `${Number(summary.max_drawdown_units).toFixed(1)}u` : '-', 'Perte max historique simulée.']
      ];
      grid.innerHTML = cards.map(([label, value, detail, htmlLabel]) => `
        <article class="performance-card">
          <span>${htmlLabel ? label : escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
          <p>${escapeHtml(detail)}</p>
        </article>
      `).join('');
    }
    if (segmentGrid) {
      const markets = (Array.isArray(report.by_market) ? report.by_market : []).slice(0, 4);
      const leagues = (Array.isArray(report.by_league) ? report.by_league : []).filter((row) => Number(row.roi || 0) > 0).slice(0, 4);
      const rows = [...markets, ...leagues].slice(0, 8);
      segmentGrid.innerHTML = rows.length ? rows.map((row) => `
        <article class="segment-card ${segmentTone(row)}" data-market-chip="${escapeHtml(normalizeUiKey(row.key || ''))}">
          <span>${escapeHtml(formatMarketName(row.key || row.market || row.league || 'Segment'))}</span>
          <strong>${escapeHtml(formatPct(row.roi || 0, 0))}</strong>
          <p>${escapeHtml(`${formatCount(row.count || 0)} réglés · WR ${formatPct(row.hit_rate || row.win_rate || 0, 0)} · Brier ${Number(row.brier || 0).toFixed(3)}`)}</p>
          <em>${escapeHtml(row.sample_level || 'sample')}</em>
        </article>
      `).join('') : '<div class="empty">Aucun segment robuste à afficher.</div>';
    }
    if (plot) {
      const buckets = Array.isArray(state.probabilityCalibration?.buckets) ? state.probabilityCalibration.buckets : [];
      plot.innerHTML = buckets.length ? buckets.map((bucket) => {
        const actual = Math.max(0, Math.min(1, Number(bucket.actual || 0)));
        const expected = Math.max(0, Math.min(1, Number(bucket.expected || 0)));
        const heightClass = `cal-h-${Math.round(actual * 10) * 10}`;
        return `
          <article class="calibration-bin">
            <span>${escapeHtml(bucket.bucket || '-')}</span>
            <div class="calibration-bin-bar ${heightClass}"></div>
            <strong>${escapeHtml(formatPct(actual, 0))}</strong>
            <em>attendu ${escapeHtml(formatPct(expected, 0))}</em>
          </article>
        `;
      }).join('') : '<div class="empty">Calibration indisponible.</div>';
    }
    renderLearningAudit();
  }

  function filteredUserBets() {
    const status = $('#user-bets-status-filter')?.value || 'all';
    const period = $('#user-bets-period-filter')?.value || 'all';
    const tag = $('#user-bets-tag-filter')?.value || 'all';
    const maxAgeMs = period === 'all' ? null : Number(period) * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return loadUserBets()
      .filter((bet) => status === 'all' || bet.status === status)
      .filter((bet) => {
        if (tag === 'all') return true;
        return Array.isArray(bet.tags) && bet.tags.map(normalizeUiKey).includes(tag);
      })
      .filter((bet) => {
        if (!maxAgeMs) return true;
        const ts = Date.parse(bet.createdAt || bet.day || '');
        return Number.isFinite(ts) && now - ts <= maxAgeMs;
      })
      .sort((a, b) => Date.parse(b.createdAt || b.day || 0) - Date.parse(a.createdAt || a.day || 0));
  }

  function updateUserBetTagFilter() {
    const select = $('#user-bets-tag-filter');
    if (!select) return;
    const current = select.value || 'all';
    const tags = Array.from(new Map(loadUserBets()
      .flatMap((bet) => Array.isArray(bet.tags) ? bet.tags : [])
      .map((tag) => [normalizeUiKey(tag), tag])
      .filter(([key]) => Boolean(key))).entries())
      .sort((a, b) => String(a[1]).localeCompare(String(b[1])));
    const html = ['<option value="all">Tous tags</option>', ...tags.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`)].join('');
    if (select.dataset.optionsHtml !== html) {
      select.innerHTML = html;
      select.dataset.optionsHtml = html;
      select.value = tags.some(([key]) => key === current) ? current : 'all';
    }
  }

  function cumulativePnlSvg(bets) {
    const settled = (Array.isArray(bets) ? bets : [])
      .filter((bet) => ['won', 'lost', 'void'].includes(String(bet.status || '')))
      .slice()
      .sort((a, b) => Date.parse(a.createdAt || a.day || 0) - Date.parse(b.createdAt || b.day || 0));
    let running = 0;
    const points = settled.map((bet) => {
      running += Number(bet.pnl || 0) || 0;
      return running;
    });
    return sparklineSvg(points.length ? points : [0, 0]);
  }

  function settleUserBetAtIndex(bets, index, status, options = {}) {
    if (!Array.isArray(bets) || index < 0 || !bets[index]) return null;
    const bet = bets[index];
    const stake = Math.max(0, Number(bet.stake || 0) || 0);
    const odd = Math.max(0, Number(bet.odd || 0) || 0);
    const pnl = status === 'won' ? stake * Math.max(0, odd - 1) : status === 'lost' ? -stake : 0;
    const current = findPickByTrackKey(bet.key);
    const closingOdd = Number(bet.closingOdd || current?.odd || bet.lastSeenOdd || bet.odd || 0);
    const clv = clvPct(bet.openingOdd || bet.odd, closingOdd);
    const settledAt = new Date().toISOString();
    bets[index] = {
      ...bet,
      status,
      pnl,
      closingOdd: Number.isFinite(closingOdd) && closingOdd > 1 ? closingOdd : bet.closingOdd || null,
      closingCapturedAt: settledAt,
      clvPct: clv,
      settledAt,
      settlementSource: options.source || bet.settlementSource || 'manual',
      settlementReason: options.reason || bet.settlementReason || null
    };
    return { bet: bets[index], pnl, current };
  }

  function settleUserBet(id, status) {
    const bets = loadUserBets();
    const index = bets.findIndex((bet) => bet.id === id);
    const result = settleUserBetAtIndex(bets, index, status, { source: 'manual' });
    if (!result) return;
    saveUserBets(bets);
    renderUserPnl();
    renderHistory();
    renderPicks();
    const dayPnl = userBetStats().pnlToday;
    const { bet, pnl, current } = result;
    if (status === 'won') notifyUser('Pari gagné', `${bet.title} · ${formatMoney(pnl)} · jour ${formatMoney(dayPnl)}`, current || bet);
    if (status === 'lost') {
      notifyUser('Pari perdu', `${bet.title} · ${formatMoney(pnl)} · jour ${formatMoney(dayPnl)}`, current || bet);
      showLossFeedbackPrompt(bet.id);
    }
  }

  const LOSS_FEEDBACK_OPTIONS = [
    ['surprise', 'Surprise (modèle bon)'],
    ['missed_signal', 'Signal raté'],
    ['late_injury', 'Blessure dernière minute'],
    ['too_early', 'Pari pris trop tôt'],
    ['low_price', 'Cote trop basse'],
    ['bad_segment', 'Mauvais segment pour moi'],
    ['other', 'Autre']
  ];

  function showLossFeedbackPrompt(betId) {
    const bet = loadUserBets().find((item) => item.id === betId);
    if (!bet || bet.lossFeedback) return;
    state.feedbackBetId = betId;
    const modal = $('#loss-feedback-modal');
    const title = $('#loss-feedback-title');
    const choices = $('#loss-feedback-choices');
    if (title) title.textContent = bet.title || 'Pari perdu';
    if (choices) {
      choices.innerHTML = LOSS_FEEDBACK_OPTIONS.map(([key, label]) => `
        <button type="button" class="ghost-btn" data-loss-feedback="${escapeHtml(key)}">${escapeHtml(label)}</button>
      `).join('');
    }
    modal?.classList.remove('hidden');
  }

  function closeLossFeedbackPrompt() {
    state.feedbackBetId = null;
    $('#loss-feedback-modal')?.classList.add('hidden');
  }

  function saveLossFeedback(reason) {
    const id = state.feedbackBetId;
    if (!id) return;
    const option = LOSS_FEEDBACK_OPTIONS.find(([key]) => key === reason) || LOSS_FEEDBACK_OPTIONS[LOSS_FEEDBACK_OPTIONS.length - 1];
    const feedback = {
      reason: option[0],
      reasonLabel: option[1],
      at: new Date().toISOString()
    };
    const bets = loadUserBets();
    const index = bets.findIndex((bet) => bet.id === id);
    if (index >= 0) {
      bets[index] = { ...bets[index], lossFeedback: feedback };
      saveUserBets(bets);
    }
    const rows = readStorageJson(LOSS_FEEDBACK_KEY, []);
    writeStorageJson(LOSS_FEEDBACK_KEY, [{ betId: id, ...feedback }, ...(Array.isArray(rows) ? rows : [])].slice(0, 200));
    closeLossFeedbackPrompt();
    renderHistory();
    setSideStatus('Feedback enregistré', 'ok');
  }

  function normalizeResultName(value) {
    return normalizeUiKey(value).replace(/[0-9]/g, '');
  }

  function resultTeams(result) {
    const comps = Array.isArray(result?.competitors) ? result.competitors : [];
    return {
      home: comps[0] || {},
      away: comps[1] || {},
      homeName: comps[0]?.name || comps[0]?.short || '',
      awayName: comps[1]?.name || comps[1]?.short || ''
    };
  }

  function sportSettlementDelayMs(sport) {
    const key = normalizeUiKey(sport || '');
    if (key.includes('football') || key.includes('soccer') || key === 'foot') return 90 * 60 * 1000;
    if (key.includes('tennis')) return 3 * 60 * 60 * 1000;
    return 150 * 60 * 1000;
  }

  function settlementDateToleranceMs(sport) {
    const key = normalizeUiKey(sport || '');
    if (key.includes('tennis')) return 36 * 60 * 60 * 1000;
    if (key.includes('baseball')) return 18 * 60 * 60 * 1000;
    return 12 * 60 * 60 * 1000;
  }

  function resultStatusText(result) {
    return normalizeUiKey([
      result?.status,
      result?.status_type,
      result?.statusType,
      result?.status?.type?.name,
      result?.status?.type?.state,
      result?.status?.type?.description,
      result?.competitions?.[0]?.status?.type?.name,
      result?.competitions?.[0]?.status?.type?.state,
      result?.competitions?.[0]?.status?.type?.description
    ].filter(Boolean).join(' '));
  }

  function resultHasFinalStatus(result) {
    if (!result) return false;
    const text = resultStatusText(result);
    if (result.completed === true) return true;
    return /\b(completed|complete|final|ft|fulltime|closed|post)\b/.test(text);
  }

  function resultHasFinalOutcome(result, sport) {
    const teams = resultTeams(result);
    const scores = [teams.home.score, teams.away.score].map((score) => Number.parseInt(score ?? '', 10));
    if (scores.every(Number.isFinite)) return true;
    const winners = [teams.home, teams.away].filter((team) => team?.winner === true).length;
    const sportKey = normalizeUiKey(sport || result?.sport || '');
    return sportKey.includes('tennis') && winners === 1;
  }

  function settlementEligibility(bet, result, now = Date.now()) {
    if (!bet || !result) return { ok: false, reason: 'résultat absent' };
    const sport = bet.sport || result.sport || '';
    const kickoff = Date.parse(bet.start || bet.date || '');
    if (!Number.isFinite(kickoff)) return { ok: false, reason: 'kickoff du pari inconnu' };
    if (kickoff > now) return { ok: false, reason: 'match pas encore commencé' };
    const delayMs = sportSettlementDelayMs(sport);
    if (now - kickoff < delayMs) return { ok: false, reason: 'marge post-match insuffisante' };
    if (!resultHasFinalStatus(result)) return { ok: false, reason: 'statut final non confirmé' };
    if (!resultHasFinalOutcome(result, sport)) return { ok: false, reason: 'score final absent' };
    const resultTs = Date.parse(result.date || result.start || result.startDate || '');
    if (!Number.isFinite(resultTs)) return { ok: false, reason: 'date résultat inconnue' };
    if (resultTs > now - delayMs) return { ok: false, reason: 'résultat trop récent ou futur' };
    const toleranceMs = settlementDateToleranceMs(sport);
    if (Math.abs(resultTs - kickoff) > toleranceMs) return { ok: false, reason: 'résultat archivé hors date du pari' };
    return { ok: true, reason: 'final confirmé' };
  }

  function resultTotal(result) {
    const teams = resultTeams(result);
    const hs = Number.parseInt(teams.home.score ?? '', 10);
    const as = Number.parseInt(teams.away.score ?? '', 10);
    if (!Number.isFinite(hs) || !Number.isFinite(as)) return null;
    return { home: hs, away: as, total: hs + as, margin: hs - as };
  }

  function isDrawResult(result) {
    const score = resultTotal(result);
    if (score) return score.home === score.away;
    const teams = resultTeams(result);
    return teams.home.winner !== true && teams.away.winner !== true;
  }

  function sideWon(result, side) {
    const score = resultTotal(result);
    if (score) {
      if (side === 'home') return score.home > score.away;
      if (side === 'away') return score.away > score.home;
      if (side === 'draw') return score.home === score.away;
    }
    const teams = resultTeams(result);
    if (side === 'home') return teams.home.winner === true;
    if (side === 'away') return teams.away.winner === true;
    return false;
  }

  function betSideFromLabel(bet, result) {
    const label = normalizeResultName(`${bet.label || ''} ${bet.market || ''}`);
    const teams = resultTeams(result);
    const homeKey = normalizeResultName(teams.homeName);
    const awayKey = normalizeResultName(teams.awayName);
    if (label.includes('nul') || label.includes('draw') || /\bx\b/.test(label)) return 'draw';
    if (homeKey && label.includes(homeKey)) return 'home';
    if (awayKey && label.includes(awayKey)) return 'away';
    return null;
  }

  function thresholdFromLabel(label, fallback = 2.5) {
    const text = String(label || '').replace(',', '.');
    const match = text.match(/(\d+(?:\.\d+)?)/);
    return match ? Number(match[1]) : fallback;
  }

  function evaluateTrackedBetAgainstResult(bet, result) {
    if (!settlementEligibility(bet, result).ok) return null;
    const key = marketKeyFromRow(bet);
    const label = normalizeResultName(bet.label || '');
    const side = betSideFromLabel(bet, result);
    if (key === 'combine') return null;
    if (key.includes('1n2') || key.includes('vainqueur') || key.includes('matchwinner')) {
      if (!side) return null;
      return sideWon(result, side) ? 'won' : 'lost';
    }
    if (key.includes('dnb') || key.includes('rembours')) {
      if (isDrawResult(result)) return 'void';
      if (!side) return null;
      return sideWon(result, side) ? 'won' : 'lost';
    }
    if (key.includes('doublechance') || key.includes('double')) {
      const wantsHome = label.includes('1x') || label.includes('12');
      const wantsAway = label.includes('x2') || label.includes('12');
      const draw = isDrawResult(result);
      if (draw && (label.includes('1x') || label.includes('x2'))) return 'won';
      if (wantsHome && sideWon(result, 'home')) return 'won';
      if (wantsAway && sideWon(result, 'away')) return 'won';
      return 'lost';
    }
    if (key.includes('btts')) {
      const score = resultTotal(result);
      if (!score) return null;
      const both = score.home > 0 && score.away > 0;
      const wantsYes = label.includes('oui') || label.includes('yes');
      const wantsNo = label.includes('non') || label.includes('no');
      if (!wantsYes && !wantsNo) return null;
      return both === wantsYes ? 'won' : 'lost';
    }
    if (key.includes('ou') || key.includes('total')) {
      if (key.includes('ht') || label.includes('mitemps') || label.includes('1remitemps')) return null;
      const score = resultTotal(result);
      if (!score) return null;
      const line = thresholdFromLabel(bet.label || bet.market || '', 2.5);
      const over = label.includes('plus') || label.includes('over');
      const under = label.includes('moins') || label.includes('under');
      if (!over && !under) return null;
      return (over ? score.total > line : score.total < line) ? 'won' : 'lost';
    }
    return null;
  }

  function resultMatchesBet(bet, result) {
    if (!bet || !result) return false;
    const resultId = String(result.id || result.uid || '');
    if (resultId && [bet.sourceEventId, bet.espnId, bet.matchId].map(String).includes(resultId)) return true;
    const betTitle = normalizeResultName(bet.title || '');
    const resultName = normalizeResultName(result.name || result.shortName || '');
    if (betTitle && resultName && (betTitle === resultName || betTitle.includes(resultName) || resultName.includes(betTitle))) return true;
    const teams = resultTeams(result);
    const home = normalizeResultName(teams.homeName);
    const away = normalizeResultName(teams.awayName);
    return Boolean(home && away && betTitle.includes(home) && betTitle.includes(away));
  }

  function findEligibleResultForBet(bet, results, now = Date.now()) {
    const candidates = (Array.isArray(results) ? results : []).filter((item) => resultMatchesBet(bet, item));
    return candidates.find((item) => settlementEligibility(bet, item, now).ok) || null;
  }

  async function loadResultsArchive() {
    const text = await fetch('/results_archive.jsonl', { cache: 'no-store' }).then((response) => response.ok ? response.text() : '');
    return text.split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);
  }

  async function autoSettleUserBets(reason = 'startup') {
    const bets = loadUserBets();
    const pending = bets.filter((bet) => bet.status === 'pending');
    let results = [];
    try {
      results = await loadResultsArchive();
    } catch (error) {
      pushLog('warn', `Settlement auto indisponible: ${error.message}`);
      return null;
    }
    const rollback = repairUnsafeAutoSettlements(bets, results);
    let settled = 0;
    let won = 0;
    let lost = 0;
    let voided = 0;
    let pnl = 0;
    let blocked = 0;
    let blockedReason = null;
    const lostSettledIds = [];
    bets.forEach((bet, index) => {
      if (bet.status !== 'pending') return;
      const matchedResults = results.filter((item) => resultMatchesBet(bet, item));
      const result = findEligibleResultForBet(bet, matchedResults);
      if (!result && matchedResults.length) {
        blocked += 1;
        blockedReason = settlementEligibility(bet, matchedResults[0]).reason;
      }
      const status = result ? evaluateTrackedBetAgainstResult(bet, result) : null;
      if (!status) return;
      const applied = settleUserBetAtIndex(bets, index, status, { source: 'auto', reason: `Résultat archivé ${result.id || result.name || ''}` });
      if (!applied) return;
      settled += 1;
      pnl += applied.pnl;
      if (status === 'won') won += 1;
      if (status === 'lost') {
        lost += 1;
        lostSettledIds.push(applied.bet.id);
      }
      if (status === 'void') voided += 1;
    });
    const audit = {
      generatedAt: new Date().toISOString(),
      reason,
      checked: pending.length,
      settled,
      won,
      lost,
      void: voided,
      pnl,
      blocked,
      blockedReason,
      rollback
    };
    writeStorageJson(AUTO_SETTLEMENT_KEY, audit);
    if (settled || rollback.reverted) {
      saveUserBets(bets);
      renderUserPnl();
      renderHistory();
      renderPicks();
      if (settled) notifyUser('Settlement auto', `${formatCount(settled)} pari(s) résolu(s) · P&L ${formatMoney(pnl)}`);
      if (rollback.reverted) setSideStatus(`${formatCount(rollback.reverted)} settlement fantôme annulé`, 'warn');
      if (lostSettledIds.length) setTimeout(() => showLossFeedbackPrompt(lostSettledIds[0]), 600);
    }
    return audit;
  }

  function repairUnsafeAutoSettlements(bets, results) {
    const summary = { checked: 0, reverted: 0, reasons: [] };
    if (!Array.isArray(bets)) return summary;
    bets.forEach((bet, index) => {
      if (!['won', 'lost', 'void'].includes(String(bet?.status || ''))) return;
      if (bet.settlementSource !== 'auto') return;
      summary.checked += 1;
      const result = findEligibleResultForBet(bet, results);
      if (result) return;
      const matched = (Array.isArray(results) ? results : []).find((item) => resultMatchesBet(bet, item));
      const reason = matched ? settlementEligibility(bet, matched).reason : 'résultat final introuvable';
      summary.reverted += 1;
      if (summary.reasons.length < 5) summary.reasons.push(`${bet.title || bet.label || 'Pari'} : ${reason}`);
      bets[index] = {
        ...bet,
        status: 'pending',
        pnl: 0,
        phantomSettlementRevertedAt: new Date().toISOString(),
        phantomSettlementReason: reason,
        previousSettlementStatus: bet.status,
        settlementSource: null,
        settlementReason: null
      };
    });
    return summary;
  }

  function refreshTrackedBetMarketData() {
    const bets = loadUserBets();
    if (!bets.length) return;
    const now = Date.now();
    let changed = false;
    const next = bets.map((bet) => {
      if (bet.status !== 'pending') return bet;
      const row = findPickByTrackKey(bet.key);
      if (!row || !Number(row.odd)) return bet;
      const patch = {
        lastSeenOdd: Number(row.odd),
        lastSeenAt: new Date().toISOString()
      };
      const kickoff = Date.parse(row.start || bet.start || '');
      if (!bet.closingOdd && Number.isFinite(kickoff) && kickoff - now <= 10 * 60 * 1000) {
        patch.closingOdd = Number(row.odd);
        patch.closingCapturedAt = patch.lastSeenAt;
        patch.clvPct = clvPct(bet.openingOdd || bet.odd, row.odd);
      }
      changed = true;
      return { ...bet, ...patch };
    });
    if (changed) saveUserBets(next);
  }

  function renderTrackedBets() {
    const body = $('#user-bets-body');
    const chart = $('#tracked-bets-chart');
    if (!body) return;
    updateUserBetTagFilter();
    const rows = filteredUserBets();
    if (chart) chart.innerHTML = cumulativePnlSvg(loadUserBets());
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="10" class="empty">Aucun pari suivi avec ces filtres. Mise sur ton premier pick depuis l’accueil.</td></tr>';
      return;
    }
    body.innerHTML = rows.slice(0, 80).map((bet) => {
      const action = bet.status === 'pending'
        ? `<button class="mini-export-btn" type="button" data-settle-bet-id="${escapeHtml(bet.id)}" data-settle-status="won">Win</button>
           <button class="mini-export-btn" type="button" data-settle-bet-id="${escapeHtml(bet.id)}" data-settle-status="lost">Loss</button>
           <button class="mini-export-btn" type="button" data-settle-bet-id="${escapeHtml(bet.id)}" data-settle-status="void">Void</button>`
        : '<span class="match-sub">Réglé</span>';
      return `
        <tr>
          <td data-label="Date">${escapeHtml(formatDateLabel(bet.createdAt || bet.day))}</td>
          <td data-label="Match"><div class="match-title">${escapeHtml(bet.title || '-')}</div><div class="match-sub">${escapeHtml(bet.sport || '')} · ${escapeHtml(bet.league || '')}</div></td>
          <td data-label="Marché"><span class="pill">${escapeHtml(bet.market || '-')}</span><div class="match-sub">${escapeHtml(bet.label || '')}</div></td>
          <td data-label="Cote">${escapeHtml(formatOdd(bet.odd))}</td>
          <td data-label="Mise">${escapeHtml(formatMoney(bet.stake || 0))}</td>
          <td data-label="Statut" class="${resultClass(bet.status)}">${escapeHtml(resultLabel(bet.status))}</td>
          <td data-label="CLV">${bet.clvPct != null ? escapeHtml(formatPct(bet.clvPct, 2)) : '<span class="match-sub">en attente</span>'}</td>
          <td data-label="Tags / notes">
            <input class="bet-tags-input" data-bet-tags-id="${escapeHtml(bet.id)}" value="${escapeHtml((bet.tags || []).join(', '))}" placeholder="favori, test">
            <textarea class="bet-note-input" data-bet-note-id="${escapeHtml(bet.id)}" rows="2" placeholder="Note privée">${escapeHtml(bet.note || '')}</textarea>
            ${bet.lossFeedback?.reasonLabel ? `<div class="match-sub">Feedback: ${escapeHtml(bet.lossFeedback.reasonLabel)}</div>` : ''}
          </td>
          <td data-label="P&L">${escapeHtml(formatMoney(bet.pnl || 0))}</td>
          <td data-label="Action">${action}</td>
        </tr>
      `;
    }).join('');
  }

  function updateTrackedBetText(id, patch) {
    const bets = loadUserBets();
    const index = bets.findIndex((bet) => bet.id === id);
    if (index < 0) return;
    bets[index] = { ...bets[index], ...patch, updatedAt: new Date().toISOString() };
    saveUserBets(bets);
    updateUserBetTagFilter();
    renderLearningAudit();
  }

  function trackedLearningAudit() {
    const settled = loadUserBets().filter((bet) => ['won', 'lost', 'void'].includes(String(bet.status || '')));
    const groups = new Map();
    const register = (key, label, bet) => {
      const stake = Math.max(0, Number(bet.stake || 0) || 0);
      const pnl = Number(bet.pnl || 0) || 0;
      const row = groups.get(key) || { key, label, count: 0, wins: 0, losses: 0, stake: 0, pnl: 0, edgeSum: 0 };
      row.count += 1;
      row.stake += stake;
      row.pnl += pnl;
      row.edgeSum += Number(bet.edge || 0) || 0;
      if (bet.status === 'won') row.wins += 1;
      if (bet.status === 'lost') row.losses += 1;
      groups.set(key, row);
    };
    settled.forEach((bet) => {
      register(`sport:${bet.sport || 'inconnu'}`, `Sport · ${bet.sport || 'inconnu'}`, bet);
      register(`league:${bet.league || 'inconnue'}`, `Ligue · ${bet.league || 'inconnue'}`, bet);
      register(`market:${bet.marketKey || normalizeUiKey(bet.market || 'market')}`, `Marché · ${bet.market || bet.marketKey || 'market'}`, bet);
      register(`edge:${bet.edgeBucket || edgeBucketFor(bet.edge)}`, `Bucket · ${bet.edgeBucket || edgeBucketFor(bet.edge)}`, bet);
    });
    const segments = Array.from(groups.values()).map((row) => ({
      ...row,
      roi: row.stake > 0 ? row.pnl / row.stake : 0,
      avgEdge: row.count ? row.edgeSum / row.count : 0,
      winRate: row.wins + row.losses > 0 ? row.wins / (row.wins + row.losses) : 0,
      warning: row.count >= 10 && row.stake > 0 && row.pnl < 0
    })).sort((a, b) => a.roi - b.roi);
    const winners = settled.filter((bet) => bet.status === 'won');
    const losers = settled.filter((bet) => bet.status === 'lost');
    const avgEdge = (rows) => rows.length
      ? rows.reduce((sum, bet) => sum + (Number(bet.edge || 0) || 0), 0) / rows.length
      : null;
    const audit = {
      generatedAt: new Date().toISOString(),
      settled: settled.length,
      winners: winners.length,
      losers: losers.length,
      winnerAvgEdge: avgEdge(winners),
      loserAvgEdge: avgEdge(losers),
      warnings: segments.filter((row) => row.warning).slice(0, 6),
      best: segments.slice().sort((a, b) => b.roi - a.roi).slice(0, 3),
      worst: segments.slice(0, 3)
    };
    writeStorageJson(USER_AUDIT_KEY, audit);
    return audit;
  }

  function segmentKeysForRow(row) {
    return [
      `sport:${row?.sport || 'inconnu'}`,
      `league:${row?.league || 'inconnue'}`,
      `market:${row?.marketKey || marketKeyFromRow(row)}`,
      `edge:${edgeBucketFor(row?.edge)}`
    ].map((key) => key.toLowerCase());
  }

  function modelAdjustmentsFromAudit(audit = trackedLearningAudit()) {
    const manual = readStorageJson(MODEL_ADJUSTMENTS_KEY, null);
    if (manual?.disabled) return { generatedAt: new Date().toISOString(), disabled: true, adjustments: [] };
    const rows = [
      ...(Array.isArray(audit.warnings) ? audit.warnings : []),
      ...(Array.isArray(audit.best) ? audit.best : [])
    ];
    const byKey = new Map();
    rows.forEach((row) => {
      const key = String(row.key || '').toLowerCase();
      const count = Number(row.count || 0);
      const roi = Number(row.roi || 0);
      if (!key || !count) return;
      if (count >= 10 && roi < -0.10) {
        byKey.set(key, {
          key,
          label: row.label || key,
          direction: 'harden',
          edgeDelta: 0.02,
          confidenceDelta: 0.05,
          reason: `ROI ${formatPct(roi, 0)} sur ${formatCount(count)} paris suivis`
        });
      } else if (count >= 20 && roi > 0.15) {
        byKey.set(key, {
          key,
          label: row.label || key,
          direction: 'soften',
          edgeDelta: -0.005,
          confidenceDelta: -0.02,
          reason: `ROI ${formatPct(roi, 0)} sur ${formatCount(count)} paris suivis`
        });
      }
    });
    const payload = {
      generatedAt: new Date().toISOString(),
      disabled: false,
      adjustments: Array.from(byKey.values()).slice(0, 12)
    };
    writeStorageJson(MODEL_ADJUSTMENTS_KEY, payload);
    return payload;
  }

  function adjustmentForRow(row) {
    const payload = readStorageJson(MODEL_ADJUSTMENTS_KEY, null) || modelAdjustmentsFromAudit();
    if (payload?.disabled) return null;
    const keys = new Set(segmentKeysForRow(row));
    return (Array.isArray(payload?.adjustments) ? payload.adjustments : []).find((item) => keys.has(String(item.key || '').toLowerCase())) || null;
  }

  function renderActiveModelAdjustments() {
    const grid = $('#active-model-adjustments-grid');
    if (!grid) return;
    const payload = modelAdjustmentsFromAudit();
    const rows = Array.isArray(payload.adjustments) ? payload.adjustments : [];
    if (payload.disabled) {
      grid.innerHTML = '<div class="empty">Ajustements automatiques désactivés. Les filtres personnels restent appliqués.</div>';
      return;
    }
    if (!rows.length) {
      grid.innerHTML = '<div class="empty">Aucun ajustement automatique robuste. Le modèle attend plus de paris réglés par segment.</div>';
      return;
    }
    grid.innerHTML = rows.map((row) => `
      <article class="segment-card ${row.direction === 'harden' ? 'cold' : 'warm'}">
        <span>${escapeHtml(row.direction === 'harden' ? 'Seuil durci' : 'Seuil assoupli')}</span>
        <strong>${escapeHtml(row.label || row.key)}</strong>
        <p>${escapeHtml(`${row.reason} · edge ${formatPct(row.edgeDelta || 0, 1)} · confiance ${formatPct(row.confidenceDelta || 0, 1)}`)}</p>
        <em>${escapeHtml(row.direction === 'harden' ? 'Protection active' : 'Opportunité surveillée')}</em>
      </article>
    `).join('');
  }

  function lossFeedbackSummary() {
    const rows = readStorageJson(LOSS_FEEDBACK_KEY, []);
    const counts = new Map();
    (Array.isArray(rows) ? rows : []).forEach((item) => {
      const reason = item.reasonLabel || item.reason || 'Autre';
      counts.set(reason, (counts.get(reason) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }

  function renderLearningFeedback() {
    const grid = $('#learning-feedback-grid');
    if (!grid) return;
    const rows = lossFeedbackSummary();
    if (!rows.length) {
      grid.innerHTML = '<div class="empty">Aucun feedback post-perte pour le moment.</div>';
      return;
    }
    grid.innerHTML = rows.slice(0, 8).map((row) => `
      <article class="segment-card sample">
        <span>Feedback perdu</span>
        <strong>${escapeHtml(row.label)}</strong>
        <p>${formatCount(row.count)} occurrence(s). Utilisé dans les insights personnels.</p>
      </article>
    `).join('');
  }

  function renderLearningAudit() {
    const grid = $('#learning-audit-grid');
    const prefGrid = $('#preference-warning-grid');
    const audit = trackedLearningAudit();
    const warningHtml = audit.warnings.length
      ? audit.warnings.map((row) => `
        <article class="segment-card cold">
          <span>${escapeHtml(row.label)}</span>
          <strong>${escapeHtml(formatPct(row.roi, 0))}</strong>
          <p>${formatCount(row.count)} paris · edge moyen ${escapeHtml(formatPct(row.avgEdge, 1))} · P&L ${escapeHtml(formatMoney(row.pnl))}</p>
          <em>Segment à désactiver ou filtrer</em>
        </article>
      `).join('')
      : '<div class="empty">Aucun segment perdant robuste sur tes paris suivis.</div>';
    if (grid) {
      const winnerEdge = audit.winnerAvgEdge == null ? '-' : formatPct(audit.winnerAvgEdge, 1);
      const loserEdge = audit.loserAvgEdge == null ? '-' : formatPct(audit.loserAvgEdge, 1);
      grid.innerHTML = `
        <article class="performance-card">
          <span>Audit personnel</span>
          <strong>${formatCount(audit.settled)} réglés</strong>
          <p>Gagnants edge moyen ${escapeHtml(winnerEdge)} · perdants ${escapeHtml(loserEdge)}.</p>
        </article>
        ${warningHtml}
      `;
    }
    if (prefGrid) prefGrid.innerHTML = warningHtml;
  }

  function modelSelfAudit() {
    const settled = loadUserBets()
      .filter((bet) => ['won', 'lost'].includes(String(bet.status || '')) && Number.isFinite(Number(bet.probability)));
    const byWindow = (days) => {
      const minTs = Date.now() - days * 24 * 60 * 60 * 1000;
      return settled.filter((bet) => Date.parse(bet.settledAt || bet.createdAt || '') >= minTs);
    };
    const brier = (rows) => rows.length
      ? rows.reduce((sum, bet) => {
        const p = Math.max(0.01, Math.min(0.99, Number(bet.probability || 0)));
        const y = bet.status === 'won' ? 1 : 0;
        return sum + ((p - y) ** 2);
      }, 0) / rows.length
      : null;
    const b7 = brier(byWindow(7));
    const b30 = brier(byWindow(30));
    const b90 = brier(byWindow(90));
    const baseline = b90 ?? b30 ?? b7;
    const drift = b7 != null && baseline != null && baseline > 0 ? (b7 - baseline) / baseline : 0;
    const audit = {
      generatedAt: new Date().toISOString(),
      settled: settled.length,
      brier7: b7,
      brier30: b30,
      brier90: b90,
      driftPct: drift,
      status: drift > 0.10 && byWindow(7).length >= 10 ? 'drift' : settled.length >= 10 ? 'ok' : 'learning'
    };
    writeStorageJson(MODEL_AUDIT_KEY, audit);
    return audit;
  }

  function renderModelSelfAudit() {
    const grid = $('#model-self-audit-grid');
    if (!grid) return;
    const audit = modelSelfAudit();
    const driftTone = audit.status === 'drift' ? 'cold' : audit.status === 'ok' ? 'warm' : 'sample';
    const curve = [audit.brier90, audit.brier30, audit.brier7].filter((value) => value != null).map((value) => Number(value));
    grid.innerHTML = [
      ['Sample perso', formatCount(audit.settled), 'Paris suivis réglés utilisés.'],
      ['Brier 7j', audit.brier7 == null ? '-' : audit.brier7.toFixed(3), 'Plus bas = probabilités mieux calibrées.'],
      ['Brier 30j', audit.brier30 == null ? '-' : audit.brier30.toFixed(3), 'Tendance récente.'],
      ['Drift', audit.driftPct == null ? '-' : formatPct(audit.driftPct, 1), audit.status === 'drift' ? 'Le modèle se dégrade sur ton usage récent.' : 'Pas de dérive robuste détectée.'],
      ['Brier 90→7j', curve.length ? curve.map((value) => value.toFixed(3)).join(' → ') : '-', curve.length ? sparklineSvg(curve.map((value) => -value)) : 'Courbe en attente de sample.']
    ].map(([label, value, detail], index) => `
      <article class="performance-card ${index === 3 ? driftTone : ''}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        ${String(detail).includes('<svg') ? `<div class="pnl-sparkline">${detail}</div>` : `<p>${escapeHtml(detail)}</p>`}
      </article>
    `).join('');
  }

  function personalInsights() {
    const settled = loadUserBets().filter((bet) => ['won', 'lost'].includes(String(bet.status || '')));
    const groups = new Map();
    const add = (key, label, bet) => {
      const row = groups.get(key) || { key, label, count: 0, wins: 0, stake: 0, pnl: 0 };
      row.count += 1;
      row.stake += Number(bet.stake || 0) || 0;
      row.pnl += Number(bet.pnl || 0) || 0;
      if (bet.status === 'won') row.wins += 1;
      groups.set(key, row);
    };
    settled.forEach((bet) => {
      add(`market:${bet.marketKey || marketKeyFromRow(bet)}`, `Marché ${bet.market || bet.marketKey || '-'}`, bet);
      add(`hour:${new Date(bet.createdAt || bet.day || Date.now()).getHours() < 18 ? 'day' : 'evening'}`, new Date(bet.createdAt || bet.day || Date.now()).getHours() < 18 ? 'Paris avant 18h' : 'Paris du soir', bet);
      add(`coach:${(bet.coachWarnings || []).length ? 'warned' : 'clean'}`, (bet.coachWarnings || []).length ? 'Avec warning coach' : 'Sans warning coach', bet);
      if (bet.lossFeedback?.reasonLabel) add(`feedback:${bet.lossFeedback.reason}`, `Feedback ${bet.lossFeedback.reasonLabel}`, bet);
    });
    const insights = Array.from(groups.values())
      .filter((row) => row.count >= 15 && row.stake > 0)
      .map((row) => ({
        ...row,
        roi: row.pnl / row.stake,
        winRate: row.count ? row.wins / row.count : 0
      }))
      .sort((a, b) => Math.abs(b.roi) - Math.abs(a.roi))
      .slice(0, 8);
    const payload = { generatedAt: new Date().toISOString(), insights };
    writeStorageJson(INSIGHTS_KEY, payload);
    return payload;
  }

  function renderPersonalInsights() {
    const grid = $('#personal-insights-grid');
    if (!grid) return;
    const payload = personalInsights();
    if (!payload.insights.length) {
      grid.innerHTML = '<div class="empty">Pas encore 15 paris réglés dans un même segment. Le coach attend un sample robuste.</div>';
      return;
    }
    grid.innerHTML = payload.insights.map((row) => `
      <article class="segment-card ${row.roi >= 0 ? 'warm' : 'cold'}">
        <span>${escapeHtml(row.label)}</span>
        <strong>${escapeHtml(formatPct(row.roi, 0))}</strong>
        <p>${formatCount(row.count)} paris · WR ${escapeHtml(formatPct(row.winRate, 0))} · P&L ${escapeHtml(formatMoney(row.pnl))}</p>
        <em>${row.roi >= 0 ? 'À privilégier si les signaux restent bons' : 'À réduire ou éviter'}</em>
      </article>
    `).join('');
  }

  function renderAutoSettlementAudit() {
    const grid = $('#auto-settlement-grid');
    if (!grid) return;
    const audit = readStorageJson(AUTO_SETTLEMENT_KEY, null);
    if (!audit) {
      grid.innerHTML = '<div class="empty">Aucun settlement auto pour le moment.</div>';
      return;
    }
    grid.innerHTML = [
      ['Vérifiés', formatCount(audit.checked || 0), audit.reason || 'startup'],
      ['Résolus auto', formatCount(audit.settled || 0), `${formatCount(audit.won || 0)}W · ${formatCount(audit.lost || 0)}L · ${formatCount(audit.void || 0)} void`],
      ['P&L auto', formatMoney(audit.pnl || 0), audit.generatedAt ? formatDateLabel(audit.generatedAt) : '-'],
      ['Refusés sécurité', formatCount(audit.blocked || 0), audit.blockedReason || 'Kickoff/date finale protégés'],
      ['Fantômes annulés', formatCount(audit.rollback?.reverted || 0), audit.rollback?.reasons?.[0] || 'Aucun settlement suspect']
    ].map(([label, value, detail]) => `
      <article class="performance-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <p>${escapeHtml(detail)}</p>
      </article>
    `).join('');
  }

  function levelDefaults(level) {
    if (level === 'beginner') return { edgeMin: 5, oddMin: 1.35, oddMax: 6, confidenceMin: 50, strict: true };
    if (level === 'expert') return { edgeMin: 0, oddMin: 1, oddMax: 50, confidenceMin: 0, strict: false };
    return { edgeMin: 2, oddMin: 1.15, oddMax: 12, confidenceMin: 35, strict: false };
  }

  function checkboxHtml(name, value, label, checked) {
    return `<label class="check-line"><input type="checkbox" name="${escapeHtml(name)}" value="${escapeHtml(value)}"${checked ? ' checked' : ''}> ${escapeHtml(label)}</label>`;
  }

  function renderPreferences() {
    const prefs = loadPreferences();
    const bankroll = $('#pref-bankroll');
    if (bankroll) bankroll.value = String(prefs.bankroll || 50);
    const level = $('#pref-level');
    if (level) level.value = prefs.level || 'intermediate';
    const strict = $('#pref-strict');
    if (strict) strict.checked = Boolean(prefs.strict);
    const demo = $('#pref-demo-mode');
    if (demo) demo.checked = Boolean(prefs.demoMode);
    const coachEnabled = $('#pref-coach-enabled');
    if (coachEnabled) coachEnabled.checked = prefs.coachEnabled !== false;
    const aiEnabled = $('#pref-ai-enabled');
    if (aiEnabled) aiEnabled.checked = Boolean(prefs.aiEnabled && prefs.aiApiKey);
    const aiProvider = $('#pref-ai-provider');
    if (aiProvider) aiProvider.value = prefs.aiProvider || 'openai';
    const aiModel = $('#pref-ai-model');
    if (aiModel) aiModel.value = prefs.aiModel || '';
    const aiKey = $('#pref-ai-key');
    if (aiKey) aiKey.value = prefs.aiApiKey || '';
    const webEnrichment = $('#pref-web-enrichment-enabled');
    if (webEnrichment) webEnrichment.checked = prefs.webEnrichmentEnabled !== false;
    const legacyCache = Number(prefs.webEnrichmentRateLimit || 0) > 10 ? Number(prefs.webEnrichmentRateLimit) : 120;
    const webCache = $('#pref-web-enrichment-cache');
    if (webCache) webCache.value = String(prefs.webEnrichmentCacheMinutes || legacyCache);
    const webRate = $('#pref-web-enrichment-rate');
    if (webRate) webRate.value = String(Math.max(1, Math.min(10, Number(prefs.webEnrichmentRateLimit || 5) || 5)));
    const autoUpdate = $('#pref-auto-update-enabled');
    if (autoUpdate) autoUpdate.checked = prefs.autoUpdateEnabled !== false;
    const updateChannel = $('#pref-update-channel');
    if (updateChannel) updateChannel.value = prefs.updateChannel || 'stable';
    const stakeMode = $('#pref-stake-mode');
    if (stakeMode) stakeMode.value = prefs.stakeMode || 'kelly';
    const sportsGrid = $('#pref-sports');
    if (sportsGrid) {
      const active = new Set((prefs.sports || []).map((item) => String(item).toLowerCase()));
      sportsGrid.innerHTML = SPORTS_PREFS.map((sport) => checkboxHtml('pref-sport', sport, sport, active.has(sport))).join('');
    }
    const marketsGrid = $('#pref-markets');
    if (marketsGrid) {
      const active = new Set((prefs.markets || []).map(normalizeUiKey));
      marketsGrid.innerHTML = MARKET_PREFS.map((market) => checkboxHtml('pref-market', market.key, market.label, active.has(market.key))).join('');
    }
    const fields = {
      'pref-edge-min': prefs.edgeMin,
      'pref-odd-min': prefs.oddMin,
      'pref-odd-max': prefs.oddMax,
      'pref-confidence-min': prefs.confidenceMin,
      'pref-alert-edge': prefs.alertEdge,
      'pref-alert-window': prefs.alertWindowHours,
      'pref-flat-unit': prefs.flatUnitPct,
      'pref-max-stake': prefs.maxStakePct,
      'pref-stop-loss': prefs.stopLossPct,
      'pref-take-profit': prefs.takeProfitPct,
      'pref-daily-bet-limit': prefs.dailyBetLimit,
      'pref-daily-stake-cap': prefs.dailyStakeCapPct,
      'pref-loss-streak-confirm': prefs.coachLossStreakConfirm
    };
    Object.entries(fields).forEach(([id, value]) => {
      const node = $(`#${id}`);
      if (node) node.value = String(value ?? '');
    });
    const webhookType = $('#pref-webhook-type');
    if (webhookType) webhookType.value = prefs.webhookType || 'generic';
    const webhookUrl = $('#pref-webhook-url');
    if (webhookUrl) webhookUrl.value = prefs.webhookUrl || '';
    renderUpdateStatus();
    renderProfileImportPreview();
    renderOnboarding();
    renderLearningAudit();
    renderActiveModelAdjustments();
  }

  function renderUpdateStatus() {
    const node = $('#update-status');
    if (!node) return;
    const status = state.updateStatus || readStorageJson(UPDATE_STATUS_KEY, null);
    if (!status) {
      node.textContent = 'Aucune vérification de mise à jour lancée.';
      return;
    }
    if (status.error) {
      node.textContent = `Update : ${status.error}`;
      return;
    }
    node.textContent = status.available
      ? `Update disponible ${status.latestVersion || ''} · installation au prochain redémarrage si demandée.`
      : `À jour (${status.currentVersion || 'version locale'}) · vérifié ${status.checkedAt ? formatDateTime(status.checkedAt) : '-'}.`;
  }

  async function checkForUpdates({ manual = false } = {}) {
    const prefs = loadPreferences();
    if (!manual && prefs.autoUpdateEnabled === false) return null;
    try {
      const response = await fetchJson('/api/update/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { channel: prefs.updateChannel || 'stable' } })
      });
      state.updateStatus = response.status || response;
      writeStorageJson(UPDATE_STATUS_KEY, state.updateStatus);
      renderUpdateStatus();
      if (state.updateStatus.available) {
        notifyUser('Mise à jour disponible', `Version ${state.updateStatus.latestVersion || ''} prête sur GitHub Releases.`);
      }
      if (manual) setSideStatus(state.updateStatus.available ? 'Mise à jour disponible' : 'Application à jour', state.updateStatus.available ? 'warn' : 'ok');
      return state.updateStatus;
    } catch (error) {
      state.updateStatus = { checkedAt: new Date().toISOString(), error: error.message };
      renderUpdateStatus();
      if (manual) setSideStatus('Update indisponible', 'warn');
      return state.updateStatus;
    }
  }

  function collectPreferencesFromForm() {
    const selectedSports = $$('input[name="pref-sport"]:checked').map((node) => node.value);
    const selectedMarkets = $$('input[name="pref-market"]:checked').map((node) => node.value);
    return {
      bankroll: Math.max(10, Number($('#pref-bankroll')?.value || 50) || 50),
      level: $('#pref-level')?.value || 'intermediate',
      sports: selectedSports.length ? selectedSports : SPORTS_PREFS,
      markets: selectedMarkets.length ? selectedMarkets : MARKET_PREFS.map((item) => item.key),
      edgeMin: Math.max(0, Number($('#pref-edge-min')?.value || 0) || 0),
      oddMin: Math.max(1, Number($('#pref-odd-min')?.value || 1) || 1),
      oddMax: Math.max(1, Number($('#pref-odd-max')?.value || 50) || 50),
      confidenceMin: Math.max(0, Number($('#pref-confidence-min')?.value || 0) || 0),
      alertEdge: Math.max(0, Number($('#pref-alert-edge')?.value || 10) || 10),
      alertWindowHours: Math.max(1, Number($('#pref-alert-window')?.value || 2) || 2),
      stakeMode: $('#pref-stake-mode')?.value || DEFAULT_PREFERENCES.stakeMode,
      flatUnitPct: Math.max(0.1, Number($('#pref-flat-unit')?.value || DEFAULT_PREFERENCES.flatUnitPct) || DEFAULT_PREFERENCES.flatUnitPct),
      maxStakePct: Math.max(0.1, Number($('#pref-max-stake')?.value || DEFAULT_PREFERENCES.maxStakePct) || DEFAULT_PREFERENCES.maxStakePct),
      stopLossPct: Math.max(0, Number($('#pref-stop-loss')?.value || DEFAULT_PREFERENCES.stopLossPct) || DEFAULT_PREFERENCES.stopLossPct),
      takeProfitPct: Math.max(0, Number($('#pref-take-profit')?.value || DEFAULT_PREFERENCES.takeProfitPct) || DEFAULT_PREFERENCES.takeProfitPct),
      webhookType: $('#pref-webhook-type')?.value || DEFAULT_PREFERENCES.webhookType,
      webhookUrl: ($('#pref-webhook-url')?.value || '').trim(),
      coachEnabled: $('#pref-coach-enabled')?.checked !== false,
      dailyBetLimit: Math.max(1, Number($('#pref-daily-bet-limit')?.value || DEFAULT_PREFERENCES.dailyBetLimit) || DEFAULT_PREFERENCES.dailyBetLimit),
      dailyStakeCapPct: Math.max(1, Number($('#pref-daily-stake-cap')?.value || DEFAULT_PREFERENCES.dailyStakeCapPct) || DEFAULT_PREFERENCES.dailyStakeCapPct),
      coachLossStreakConfirm: Math.max(2, Number($('#pref-loss-streak-confirm')?.value || DEFAULT_PREFERENCES.coachLossStreakConfirm) || DEFAULT_PREFERENCES.coachLossStreakConfirm),
      demoMode: Boolean($('#pref-demo-mode')?.checked),
      aiEnabled: Boolean($('#pref-ai-enabled')?.checked && ($('#pref-ai-key')?.value || '').trim()),
      aiProvider: $('#pref-ai-provider')?.value || DEFAULT_PREFERENCES.aiProvider,
      aiApiKey: ($('#pref-ai-key')?.value || '').trim(),
      aiModel: ($('#pref-ai-model')?.value || '').trim() || DEFAULT_PREFERENCES.aiModel,
      webEnrichmentEnabled: $('#pref-web-enrichment-enabled')?.checked !== false,
      webEnrichmentCacheMinutes: Math.max(15, Number($('#pref-web-enrichment-cache')?.value || DEFAULT_PREFERENCES.webEnrichmentCacheMinutes) || DEFAULT_PREFERENCES.webEnrichmentCacheMinutes),
      webEnrichmentRateLimit: Math.max(1, Math.min(10, Number($('#pref-web-enrichment-rate')?.value || DEFAULT_PREFERENCES.webEnrichmentRateLimit) || DEFAULT_PREFERENCES.webEnrichmentRateLimit)),
      autoUpdateEnabled: $('#pref-auto-update-enabled')?.checked !== false,
      updateChannel: $('#pref-update-channel')?.value || DEFAULT_PREFERENCES.updateChannel,
      strict: Boolean($('#pref-strict')?.checked)
    };
  }

  function applyPreferences(preferences) {
    const prefs = savePreferences(preferences);
    const bankrollInput = $('#bankroll-input');
    if (bankrollInput) bankrollInput.value = String(prefs.bankroll || 50);
    localStorage.setItem('userBankroll', String(prefs.bankroll || 50));
    renderPreferences();
    renderPicks();
    maybeNotifyPickChanges();
    computePicks().catch(() => {});
    setSideStatus('Préférences enregistrées', 'ok');
  }

  function renderOnboarding() {
    const card = $('#onboarding-card');
    if (!card) return;
    const seen = localStorage.getItem(USER_PREFS_SEEN_KEY) === '1';
    card.classList.toggle('hidden', seen);
    if (!seen) {
      const bankroll = $('#onboarding-bankroll');
      if (bankroll && !bankroll.value) bankroll.value = String(loadPreferences().bankroll || 50);
    }
  }

  function renderHistory() {
    const history = state.history;
    renderModelPerformance();
    renderTrackedBets();
    renderAutoSettlementAudit();
    renderModelSelfAudit();
    renderActiveModelAdjustments();
    renderPersonalInsights();
    renderLearningFeedback();
    renderCoachAdvice();
    $('#hist-total').textContent = history ? String(history.total) : '-';
    $('#hist-generated').textContent = history?.generatedAt ? new Date(history.generatedAt).toLocaleString('fr-FR') : '-';
    $('#hist-settled').textContent = history ? String(history.settled) : '-';
    $('#hist-wl').textContent = history ? `${history.won} gagnés · ${history.lost} perdus · ${history.void} void` : '-';
    $('#hist-winrate').textContent = history ? formatPct(history.winRate, 1) : '-';
    $('#hist-roi').textContent = history ? formatPct(history.flatRoi, 1) : '-';
    $('#hist-pnl').textContent = history ? formatSignedUnits(history.flatPnlUnits) : '-';
    renderCalibration();
    renderContextBacktest();
    renderDecisionBacktest();
    renderDecisionTuning();

    const pendingBody = $('#history-pending-body');
    const settledBody = $('#history-settled-body');
    const pending = Array.isArray(history?.pendingTop) ? history.pendingTop.slice(0, 12) : [];
    const settled = Array.isArray(history?.recentSettled) ? history.recentSettled.slice(0, 12) : [];

    pendingBody.innerHTML = pending.length ? pending.map((pick) => `
      <tr>
        <td data-label="Match">
          <div class="match-title">${escapeHtml(`${pick.home || 'Home'} - ${pick.away || 'Away'}`)}</div>
          <div class="match-sub">${escapeHtml(pick.sport || '')} · ${escapeHtml(pick.league || '')}</div>
        </td>
        <td data-label="Marché"><span class="pill">${escapeHtml(formatMarketName(pick.market_key || ''))}</span><div class="match-sub">${escapeHtml(pick.label || pick.selection || '')}</div></td>
        <td data-label="Cote">${formatOdd(pick.odd_book)}</td>
        <td data-label="Edge" class="${Number(pick.edge) > 0 ? 'edge-pos' : 'status-skip'}">${formatPct(Number(pick.edge) || 0, 1)}</td>
        <td data-label="Qualité">${Number.isFinite(Number(pick.score_quality)) ? Number(pick.score_quality).toFixed(0) : '-'}</td>
      </tr>
    `).join('') : '<tr><td colspan="5" class="empty">Aucun pending lisible.</td></tr>';

    settledBody.innerHTML = settled.length ? settled.map((pick) => `
      <tr>
        <td data-label="Match">
          <div class="match-title">${escapeHtml(`${pick.home || 'Home'} - ${pick.away || 'Away'}`)}</div>
          <div class="match-sub">${escapeHtml(pick.sport || '')} · ${escapeHtml(pick.league || '')}</div>
        </td>
        <td data-label="Marché"><span class="pill">${escapeHtml(formatMarketName(pick.market_key || ''))}</span><div class="match-sub">${escapeHtml(pick.label || pick.selection || '')}</div></td>
        <td data-label="Résultat" class="${resultClass(pick.result)}">${escapeHtml(resultLabel(pick.result))}</td>
        <td data-label="Cote">${formatOdd(pick.odd_book)}</td>
        <td data-label="Jour">${escapeHtml(pick.day || '-')}</td>
      </tr>
    `).join('') : '<tr><td colspan="5" class="empty">Aucun résultat lisible.</td></tr>';
  }

  function renderContextBacktest() {
    const grid = $('#context-backtest-grid');
    if (!grid) return;
    const report = state.contextBacktest || {};
    const tiers = Array.isArray(report.byContextTier) ? report.byContextTier : [];
    if (!tiers.length) {
      grid.innerHTML = '<div class="empty">Backtest contexte indisponible pour le moment.</div>';
      return;
    }
    const order = ['fort', 'correct', 'faible', 'insuffisant', 'unknown'];
    const rows = tiers
      .slice()
      .sort((a, b) => (order.indexOf(a.key) - order.indexOf(b.key)) || ((b.count || 0) - (a.count || 0)))
      .slice(0, 5);
    grid.innerHTML = rows.map((row) => {
      const roi = Number(row.roi || 0);
      const cls = roi > 0.05 ? 'warm' : roi < -0.05 ? 'cold' : 'sample';
      return `
        <article class="backtest-card ${cls}">
          <span>${escapeHtml(String(row.key || 'unknown').toUpperCase())}</span>
          <strong>${escapeHtml(formatPct(roi, 0))}</strong>
          <p>${escapeHtml(`${formatCount(row.count || 0)} réglés · Brier ${Number(row.brier || 0).toFixed(3)} · score moy. ${Number(row.avg_context_score || 0).toFixed(0)}`)}</p>
          <small>${escapeHtml(row.sample_level || 'sample')} · win ${formatPct(row.win_rate || 0, 0)}</small>
        </article>
      `;
    }).join('');
  }

  function decisionBacktestLabel(key) {
    const labels = {
      bet_strong: 'Bet fort',
      bet: 'Bet',
      watchlist: 'Watchlist',
      skip_prudent: 'Skip prudent',
      skip: 'Skip'
    };
    return labels[key] || String(key || 'unknown');
  }

  function decisionBacktestTone(row) {
    const key = String(row?.key || '');
    const roi = Number(row?.roi || 0);
    if (key.includes('skip')) return roi < -0.02 ? 'warm' : 'sample';
    if (key === 'watchlist') return 'sample';
    return roi > 0.04 ? 'warm' : roi < -0.04 ? 'cold' : 'sample';
  }

  function renderDecisionBacktest() {
    const grid = $('#decision-backtest-grid');
    const reasonGrid = $('#decision-reason-grid');
    const summary = $('#decision-backtest-summary');
    if (!grid) return;
    const report = state.decisionBacktest || {};
    const decisions = Array.isArray(report.byDecision) ? report.byDecision : [];
    const reasons = Array.isArray(report.byReason) ? report.byReason : [];
    if (summary) {
      const settled = formatCount(report.settledUsed || 0);
      const skipped = formatCount(report.rowsSkipped || 0);
      summary.textContent = decisions.length
        ? `${settled} lignes réglées classées · ${skipped} ignorées · les anciennes lignes peuvent utiliser un proxy de contexte.`
        : 'Backtest décision en attente du prochain refresh.';
    }
    if (!decisions.length) {
      grid.innerHTML = '<div class="empty">Backtest décision indisponible pour le moment.</div>';
      if (reasonGrid) reasonGrid.innerHTML = '<div class="empty">Aucune raison classée.</div>';
      return;
    }
    const order = ['bet_strong', 'bet', 'watchlist', 'skip_prudent', 'skip'];
    grid.innerHTML = decisions
      .slice()
      .sort((a, b) => {
        const ia = order.indexOf(String(a.key || ''));
        const ib = order.indexOf(String(b.key || ''));
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map((row) => `
        <article class="backtest-card ${decisionBacktestTone(row)}">
          <span>${escapeHtml(decisionBacktestLabel(row.key))}</span>
          <strong>${escapeHtml(formatPct(row.roi || 0, 0))}</strong>
          <p>${escapeHtml(`${formatCount(row.count || 0)} réglés · Brier ${Number(row.brier || 0).toFixed(3)} · confiance ${Number(row.avg_trust_score || 0).toFixed(0)}/100`)}</p>
          <small>${escapeHtml(row.sample_level || 'sample')} · win ${formatPct(row.win_rate || 0, 0)}</small>
        </article>
      `).join('');

    if (reasonGrid) {
      const topReasons = reasons
        .slice()
        .filter((row) => Number(row.count || 0) > 0)
        .slice(0, 6);
      reasonGrid.innerHTML = topReasons.length ? topReasons.map((row) => `
        <article class="backtest-card ${decisionBacktestTone(row)}">
          <span>${escapeHtml(String(row.key || 'raison').replace(/_/g, ' '))}</span>
          <strong>${escapeHtml(formatPct(row.roi || 0, 0))}</strong>
          <p>${escapeHtml(`${formatCount(row.count || 0)} réglés · edge moy. ${formatPct(row.avg_edge || 0, 1)} · contexte ${Number(row.avg_context_score || 0).toFixed(0)}/100`)}</p>
          <small>${escapeHtml(row.sample_level || 'sample')} · Brier ${Number(row.brier || 0).toFixed(3)}</small>
        </article>
      `).join('') : '<div class="empty">Aucune raison suffisamment représentée.</div>';
    }
  }

  function renderDecisionTuning() {
    const grid = $('#decision-tuning-grid');
    if (!grid) return;
    const report = state.decisionTuning || {};
    const policy = report.policy || {};
    const shadow = state.decisionShadow?.summary || {};
    const odds = state.oddsGuardrails?.summary || {};
    const recommendations = Array.isArray(report.recommendations) ? report.recommendations : [];
    if (!recommendations.length && !policy.suggested_min_trust && !shadow.current_matches) {
      grid.innerHTML = '<div class="empty">Aucun réglage prudent disponible pour le moment.</div>';
      return;
    }
    const cards = [
      {
        label: 'Seuil confiance',
        value: policy.suggested_min_trust ? `${Math.round(Number(policy.suggested_min_trust))}/100` : '-',
        detail: 'Seuil indicatif issu du backtest décision, appliqué prudemment.'
      },
      {
        label: 'Marchés à freiner',
        value: formatCount((policy.degrade_markets || []).length),
        detail: (policy.degrade_markets || []).length ? `Observation : ${(policy.degrade_markets || []).join(', ')}` : 'Aucun marché à freiner avec sample suffisant.'
      },
      {
        label: 'Watchlist utile',
        value: formatCount((policy.keep_watch_markets || []).length),
        detail: (policy.keep_watch_markets || []).length ? `À analyser : ${(policy.keep_watch_markets || []).join(', ')}` : 'Pas de segment watchlist assez net.'
      },
      {
        label: 'Règles',
        value: formatCount(recommendations.length),
        detail: recommendations[0]?.detail || 'Les règles restent informatives tant que le sample n’est pas robuste.'
      },
      {
        label: 'Shadow courant',
        value: formatCount(shadow.affected || 0),
        detail: `${formatCount(shadow.current_matches || 0)} matchs projetés · ${formatPct(shadow.affected_rate || 0, 0)} freinés en simulation.`
      },
      {
        label: 'Cotes hautes',
        value: formatCount(odds.current_high_odd_matches || 0),
        detail: `Agent bloqué au-delà de @${Number(odds.max_agent_odd || state.oddsGuardrails?.policy?.max_agent_odd || 10).toFixed(1)} si contexte/confiance insuffisants.`
      }
    ];
    grid.innerHTML = cards.map((card) => `
      <article class="backtest-card sample">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `).join('');
  }

  function updateSportFilter() {
    const select = $('#sport-filter');
    if (!select) return;
    const current = select.value || 'all';
    const sports = Array.from(new Set(state.matches.map((row) => row.sport).filter(Boolean))).sort();
    const nextHtml = [
      '<option value="all">Tous sports</option>',
      ...sports.map((sport) => `<option value="${escapeHtml(sport)}">${escapeHtml(sport)}</option>`)
    ].join('');
    if (select.dataset.optionsHtml !== nextHtml) {
      select.innerHTML = nextHtml;
      select.dataset.optionsHtml = nextHtml;
      select.value = sports.includes(current) ? current : 'all';
    }
  }

  function leagueKeyFromRow(row) {
    return String(row?.calibration?.leagueKey || row?.league || 'league_unknown')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9.]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'league_unknown';
  }

  function updateLeagueFilter() {
    const select = $('#league-filter');
    if (!select) return;
    const current = select.value || 'all';
    const leagues = Array.from(new Map(state.matches.map((row) => {
      const key = leagueKeyFromRow(row);
      const label = row.league || key.toUpperCase();
      return [key, label];
    })).entries()).sort((a, b) => String(a[1]).localeCompare(String(b[1])));
    const nextHtml = [
      '<option value="all">Toutes ligues</option>',
      ...leagues.map(([key, label]) => `<option value="${escapeHtml(key)}">${escapeHtml(label)}</option>`)
    ].join('');
    if (select.dataset.optionsHtml !== nextHtml) {
      select.innerHTML = nextHtml;
      select.dataset.optionsHtml = nextHtml;
      select.value = leagues.some(([key]) => key === current) ? current : 'all';
    }
  }

  function calibrationMatches(row, filter) {
    const calibration = row.calibration || {};
    if (filter === 'all') return true;
    if (filter === 'blocked') return Boolean(calibration.blocked);
    if (filter === 'unknown') return calibration.level === 'unknown' || !calibration.level;
    if (filter === 'cold') return calibration.level === 'cold' || calibration.league?.level === 'cold';
    if (filter === 'warm') return calibration.level === 'warm' || calibration.league?.level === 'warm';
    return true;
  }

  function openMatchDetail(id) {
    const row = findMatchRow(id);
    if (!row) return;
    const modal = $('#match-modal');
    $('#modal-title').textContent = row.title;
    $('#modal-subtitle').textContent = `${row.sport} · ${row.league} · ${formatDateLabel(row.start)}`;
    $('#modal-content').innerHTML = buildDetailHtml(row);
    switchDetailTab('summary');
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }

  function openFocusMode(row) {
    const pick = typeof row === 'string' ? findPickByTrackKey(row) || findMatchRow(row) : row;
    if (!pick) return;
    state.focusRow = pick;
    const overlay = $('#focus-overlay');
    const title = $('#focus-title');
    const sub = $('#focus-subtitle');
    const countdown = $('#focus-countdown');
    const ticket = $('#focus-ticket');
    const reason = $('#focus-reason');
    const action = $('#focus-action');
    if (title) title.textContent = pick.title || 'Match';
    if (sub) sub.textContent = `${pick.sport || ''} · ${pick.league || ''} · ${formatDateLabel(pick.start)}`;
    if (countdown) countdown.textContent = countdownLabel(pick.start);
    if (ticket) ticket.innerHTML = `
      <span>${escapeHtml(pick.market || '-')}</span>
      <strong>${escapeHtml(pick.label || '-')} ${escapeHtml(formatOdd(pick.odd))}</strong>
      <em>mise ${escapeHtml(visibleStakeText(pick))} · edge ${escapeHtml(formatPct(pick.edge || 0, 1))}</em>
      ${enrichmentBadgeHtml(pick)}
    `;
    if (reason) reason.textContent = pickReason(pick).replace(/^Pourquoi\s*:\s*/i, '');
    if (action) action.innerHTML = `
      ${trackButtonHtml(pick, 'Je mise')}
      <button type="button" class="ghost-btn" id="focus-reminder-btn">Rappel toutes les 5 min</button>
      <button type="button" class="ghost-btn" id="focus-close-btn">Fermer focus</button>
    `;
    overlay?.classList.remove('hidden');
    document.body.classList.add('modal-open');
  }

  function closeFocusMode() {
    $('#focus-overlay')?.classList.add('hidden');
    state.focusRow = null;
    if ($('#match-modal')?.classList.contains('hidden')) document.body.classList.remove('modal-open');
  }

  function closeMatchDetail() {
    $('#match-modal').classList.add('hidden');
    document.body.classList.remove('modal-open');
  }

  function switchDetailTab(tab) {
    $$('#modal-tabs .modal-tab').forEach((btn) => btn.classList.toggle('active', btn.dataset.detailTab === tab));
    $$('#modal-content [data-detail-panel]').forEach((panel) => panel.classList.toggle('active', panel.dataset.detailPanel === tab));
  }

  function contextScoreLabel(quality) {
    const score = Number(quality?.score);
    if (!Number.isFinite(score)) return 'Non généré';
    const tier = quality.tier ? ` · ${quality.tier}` : '';
    return `${Math.round(score)}/100${tier}`;
  }

  function contextGateText(row) {
    const gate = row?.contextGate || {};
    if (gate.label) return gate.label;
    const quality = row?.match?.context?.quality;
    if (quality?.gate === 'skip') return 'Contexte insuffisant';
    if (quality?.gate === 'watch') return 'À surveiller · contexte';
    if (quality?.gate === 'bet') return 'Contexte exploitable';
    return 'Contexte non généré';
  }

  function confidenceTrustText(row) {
    const trust = row?.confidenceTrust || {};
    const score = Number(trust.score);
    if (!Number.isFinite(score)) return 'Non calculée';
    return `${Math.round(score)}/100 · ${trust.label || 'confiance'}`;
  }

  function statusText(value) {
    const labels = {
      ok: 'OK',
      stale: 'Donnée périmée',
      missing: 'Source indisponible',
      partial: 'Partiel',
      confirmed: 'Confirmé',
      profile_probable: 'Profil probable',
      source_absente: 'Source absente'
    };
    return labels[value] || value || '-';
  }

  function buildContextHtml(row) {
    const context = row.match?.context || {};
    const quality = context.quality || row.contextQuality || {};
    const matchup = context.matchup || {};
    const missing = Array.isArray(quality.missing) ? quality.missing : [];
    const stale = Array.isArray(quality.stale) ? quality.stale : [];
    const critical = Array.isArray(quality.critical_missing) ? quality.critical_missing : [];
    const weather = matchup.weather || row.match?.weather || null;
    const referee = matchup.referee || row.match?.referee || row.match?.referee_context || null;
    const angles = Array.isArray(matchup.angles) ? matchup.angles : [];
    const timing = Array.isArray(matchup.timing) ? matchup.timing : [];
    const contextRows = [
      ['Score contexte', contextScoreLabel(quality)],
      ['Confiance confiance', confidenceTrustText(row)],
      ['Décision contexte', contextGateText(row)],
      ['Agent', row.contextGate?.agentEligible === false ? 'Mise agent bloquée' : 'Éligible si Kelly positif'],
      ['Kickoff', quality.minutes_to_kickoff != null ? `${Math.round(quality.minutes_to_kickoff)} min` : '-'],
      ['Manques', missing.length ? missing.join(', ') : 'Aucun manque majeur'],
      ['Périmé', stale.length ? stale.join(', ') : 'Rien de périmé'],
      ['Critique', critical.length ? critical.join(', ') : 'Non']
    ];
    return `
      <section class="detail-tab-panel" data-detail-panel="context">
        <div class="modal-grid">
          <article class="detail-card">
            <h4>Qualité contexte</h4>
            <div class="kv">${contextRows.map(([k, v]) => `<span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong>`).join('')}</div>
          </article>
          <article class="detail-card">
            <h4>Rencontre</h4>
            <div class="kv">
              <span>Météo</span><strong>${escapeHtml(weather ? cleanLabel([weather.city, weather.temp_c != null ? `${Math.round(Number(weather.temp_c))}°C` : '', weather.wind_kmh != null ? `${Math.round(Number(weather.wind_kmh))} km/h` : ''].filter(Boolean).join(' · ')) : 'Non disponible')}</strong>
              <span>Arbitre</span><strong>${escapeHtml(referee ? cleanLabel(referee.name || referee.source || 'Contexte arbitre') : 'Non disponible')}</strong>
              <span>H2H</span><strong>${escapeHtml(matchup.h2h_present ? 'Disponible' : 'Non disponible')}</strong>
              <span>Timing marché</span><strong>${escapeHtml(timing[0]?.recommendation || timing[0]?.advice || 'Non signalé')}</strong>
            </div>
          </article>
          <article class="detail-card wide">
            <h4>Signaux de contexte</h4>
            ${angles.length || timing.length ? `
              <div class="market-list">
                ${[...angles.map((item) => ({ label: item.type || 'signal', detail: item.context || item.reason || item.direction || '-' })), ...timing.map((item) => ({ label: item.recommendation || item.advice || 'timing', detail: item.reason || '-' }))].slice(0, 10).map((item) => `
                  <div class="market-row"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.detail)}</strong><em>contexte</em></div>
                `).join('')}
              </div>
            ` : '<div class="empty compact-empty">Aucun signal rare ou timing particulier détecté.</div>'}
          </article>
          ${buildContextRepairHtml(row)}
        </div>
      </section>`;
  }

  function teamContextCard(side, label) {
    const history = side?.history || {};
    const fd = history.football_data || {};
    const xg = side?.xg || {};
    const elo = side?.elo || {};
    const rows = [
      ['Forme L5', side?.form5 || '-'],
      ['Forme L10', side?.form10 || '-'],
      ['xG pour/contre', xg.present ? `${xg.for_avg ?? '-'} / ${xg.against_avg ?? '-'}` : 'Non disponible'],
      ['Elo', elo.value != null ? `${Math.round(Number(elo.value))}` : history.elo != null ? `${Math.round(Number(history.elo))}` : 'Non disponible'],
      ['Historique local', history.events_seen ? `${formatCount(history.events_seen)} observations` : 'Non disponible'],
      ['Football-Data', fd?.matches ? `${formatCount(fd.matches)} matchs · BTTS ${formatPct(fd.btts_rate || 0, 0)}` : 'Non disponible']
    ];
    return `
      <article class="detail-card">
        <h4>${escapeHtml(label)} · ${escapeHtml(side?.name || '-')}</h4>
        <div class="kv">${rows.map(([k, v]) => `<span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong>`).join('')}</div>
      </article>`;
  }

  function buildTeamsHtml(row) {
    const teams = row.match?.context?.teams || {};
    return `
      <section class="detail-tab-panel" data-detail-panel="teams">
        <div class="modal-grid">
          ${teamContextCard(teams.home, 'Domicile')}
          ${teamContextCard(teams.away, 'Extérieur')}
        </div>
      </section>`;
  }

  function availabilityCard(side, label) {
    const lineup = side?.lineup || {};
    const injuries = side?.injuries || {};
    const stars = Array.isArray(side?.stars) ? side.stars : [];
    return `
      <article class="detail-card">
        <h4>${escapeHtml(label)} · ${escapeHtml(side?.team || '-')}</h4>
        <div class="kv">
          <span>Composition</span><strong>${escapeHtml(lineup.present ? `${lineup.confirmed ? 'confirmée' : lineup.projected ? 'profil probable' : 'non confirmée'} · ${lineup.starters || 0} titulaires` : 'compo non publiée')}</strong>
          <span>Formation</span><strong>${escapeHtml(lineup.formation || '-')}</strong>
          <span>Absents</span><strong>${escapeHtml(injuries.present ? `${injuries.total || 0} total · ${injuries.severe || 0} sévères · ${injuries.doubtful || 0} incertains` : 'source indisponible')}</strong>
          <span>Statut source</span><strong>${escapeHtml(injuries.known === false ? 'matching incertain' : injuries.present ? 'source disponible' : 'source absente')}</strong>
        </div>
        ${injuries.names?.length ? `<p class="detail-text">${escapeHtml(injuries.names.slice(0, 8).join(', '))}</p>` : ''}
        ${stars.length ? `<div class="market-list">${stars.slice(0, 6).map((star) => `<div class="market-row"><span>${escapeHtml(star.position || '-')}</span><strong>${escapeHtml(star.name || '-')}</strong><em>${escapeHtml(star.star_score != null ? `score ${Number(star.star_score).toFixed(2)}` : 'star')}</em></div>`).join('')}</div>` : ''}
      </article>`;
  }

  function buildAvailabilityHtml(row) {
    const availability = row.match?.context?.availability || {};
    return `
      <section class="detail-tab-panel" data-detail-panel="availability">
        <div class="modal-grid">
          <article class="detail-card wide">
            <h4>Statut effectif</h4>
            <p class="detail-text">${escapeHtml(statusText(availability.status))}. Les compos non confirmées sont traitées comme prudentes et peuvent bloquer la mise agent.</p>
          </article>
          ${availabilityCard(availability.home, 'Domicile')}
          ${availabilityCard(availability.away, 'Extérieur')}
        </div>
      </section>`;
  }

  function buildEnrichedSourcesHtml(row) {
    const enrichment = enrichmentForRow(row);
    if (!enrichment) {
      return `
        <article class="detail-card wide enriched-sources-card">
          <h4>Sources enrichies</h4>
          <p class="detail-text">Aucun enrichissement web en cache pour ce match. Les signaux locaux restent la base de décision.</p>
          <div class="quality-alert-actions">
            <button class="quality-action-btn" data-enrich-pick-key="${escapeHtml(userBetKey(row))}">Tester l'enrichissement</button>
          </div>
        </article>`;
    }
    const rows = Array.isArray(enrichment.sources) ? enrichment.sources : [];
    const validations = Array.isArray(enrichment.validations) ? enrichment.validations : [];
    return `
      <article class="detail-card wide enriched-sources-card">
        <h4>Sources enrichies ${enrichmentBadgeHtml(row)}</h4>
        <p class="detail-text">${escapeHtml(`${formatCount(enrichment.successfulSources || 0)} source(s) OK · ${formatCount(enrichment.failedSources || 0)} échec(s) · ${formatDateTime(enrichment.enrichedAt)}`)}</p>
        <div class="market-list">
          ${validations.map((item) => `
            <div class="market-row">
              <span>${escapeHtml(item.label || 'validation')}</span>
              <strong>${escapeHtml(item.status || 'ok')}</strong>
              <em>${escapeHtml(item.detail || '-')}</em>
            </div>
          `).join('')}
          ${rows.map((source) => `
            <div class="market-row">
              <span>${escapeHtml(source.label || source.key || 'source')}</span>
              <strong>${escapeHtml(source.status === 'ok' ? 'validée' : 'indisponible')}</strong>
              <em>${escapeHtml(source.summary || source.url || '-')}</em>
            </div>
          `).join('') || '<div class="empty compact-empty">Aucune source web enregistrée.</div>'}
        </div>
      </article>`;
  }

  function buildSourcesHtml(row) {
    const sources = Array.isArray(row.match?.context?.sources) ? row.match.context.sources : [];
    return `
      <section class="detail-tab-panel" data-detail-panel="sources">
        <div class="modal-grid">
          ${buildIdentityDetailHtml(row)}
          ${buildEnrichedSourcesHtml(row)}
        </div>
        <article class="detail-card wide">
          <h4>Sources utilisées</h4>
        </article>
        <div class="signal-grid">
          ${sources.length ? sources.map((source) => `
            <article class="signal-card ${source.status === 'ok' ? 'signal-ok' : 'signal-missing'}">
              <span>${escapeHtml(source.key)}</span>
              <strong>${escapeHtml(statusText(source.status))}</strong>
              <small>${escapeHtml(`${source.detail || '-'} · âge ${source.age_min != null ? formatAge(Math.round(source.age_min)) : 'inconnu'} · TTL ${source.ttl_min || '-'} min`)}</small>
            </article>
          `).join('') : '<div class="empty compact-empty">Aucun dossier source généré pour ce match.</div>'}
        </div>
      </section>`;
  }

  function contextRepairForRow(row) {
    const ids = new Set([
      row?.id,
      row?.match?.id,
      row?.match?.event_id,
      row?.match?.winamax?.match_id
    ].map((value) => String(value || '')).filter(Boolean));
    const rows = Array.isArray(state.contextRepairPlan?.matches) ? state.contextRepairPlan.matches : [];
    return rows.find((item) => ids.has(String(item.match_id || '')) || ids.has(String(item.id || ''))) || null;
  }

  function contextRepairActionsForRow(row) {
    const repair = contextRepairForRow(row);
    const quality = row?.match?.context?.quality || row?.contextQuality || {};
    const rawSources = repair
      ? repair.missing_sources || []
      : [
        ...(quality.critical_missing || []),
        ...(quality.missing || []),
        ...(quality.stale || [])
      ];
    const sources = [...new Set(rawSources.map(signalGapRefreshSource))].filter(Boolean).slice(0, 4);
    return {
      repair,
      sources,
      score: Number(repair?.quality_score ?? quality.score),
      priority: repair?.priority || (Number(quality.score) < 45 ? 'critical' : Number(quality.score) < 60 ? 'high' : 'low')
    };
  }

  function buildContextRepairHtml(row) {
    const { repair, sources, score, priority } = contextRepairActionsForRow(row);
    if (!repair && !sources.length && !(Number.isFinite(score) && score < 60)) {
      return `
        <article class="detail-card wide context-repair-card">
          <h4>Réparation conseillée</h4>
          <p class="detail-text">Aucune réparation locale prioritaire pour ce match. La cote reste à vérifier au moment de jouer.</p>
        </article>`;
    }
    const sourceButtons = sources.map((source) => `
      <button class="quality-action-btn" data-quality-mode="signals" data-quality-source="${escapeHtml(source)}">
        Rafraîchir ${escapeHtml(signalSourceLabel(source))}
      </button>
    `).join('');
    const missing = repair?.missing_sources?.length ? repair.missing_sources.slice(0, 8).join(', ') : sources.map(signalSourceLabel).join(', ');
    const detail = repair
      ? `${repair.quality_tier || 'contexte'} ${Math.round(Number(repair.quality_score || 0))}/100 · ${missing || 'sources à consolider'}`
      : `Score contexte ${Number.isFinite(score) ? Math.round(score) : '-'}/100 · consolidation recommandée`;
    return `
      <article class="detail-card wide context-repair-card calibration-detail-card ${priority === 'critical' ? 'cold' : 'sample'}">
        <h4>Réparation conseillée</h4>
        <p class="detail-text">${escapeHtml(detail)}</p>
        <div class="quality-alert-actions">
          <button class="quality-action-btn" data-quality-mode="repair_context" data-quality-source="all">Réparer contexte</button>
          ${sourceButtons}
        </div>
      </article>`;
  }

  function timelineForRow(row) {
    const ids = [row?.id, row?.match?.id, row?.match?.event_id, row?.match?.winamax?.match_id]
      .map((value) => String(value || ''))
      .filter(Boolean);
    const matches = state.matchDecisionTimeline?.matches || {};
    return ids.map((id) => matches[id]).find(Boolean) || null;
  }

  function identityForRow(row) {
    const timeline = timelineForRow(row);
    const teams = state.teamIdentityGraph?.teams || {};
    const ids = [];
    (timeline?.identity || []).forEach((item) => {
      if (item?.key) ids.push(item.key);
    });
    const contextTeams = row?.match?.context?.teams || {};
    [contextTeams.home?.name, contextTeams.away?.name].forEach((name) => {
      const key = `${String(row?.sport || '').toLowerCase()}:${compactUiKey(name)}`;
      if (teams[key]) ids.push(key);
    });
    return [...new Set(ids)].map((key) => teams[key]).filter(Boolean);
  }

  function whatWouldChange(row) {
    const quality = row?.contextQuality || row?.match?.context?.quality || {};
    const missing = [...(quality.critical_missing || []), ...(quality.missing || [])].map(String);
    const reasons = [];
    if (missing.some((item) => item.includes('lineup'))) reasons.push('Compositions confirmées des deux équipes.');
    if (missing.some((item) => item.includes('injur'))) reasons.push('Blessures/absences confirmées et reliées au bon effectif.');
    if (missing.some((item) => item.includes('weather'))) reasons.push('Météo fraîche au stade ou à la ville du match.');
    if (row?.signalConflict?.active) reasons.push('Marché Winamax moins froid ou mouvement de cote favorable.');
    if (row?.marketTiming?.tone === 'cold') reasons.push('CLV ou historique marché redevenu neutre.');
    if (row?.prebetGate?.blocked) reasons.push('Checklist avant mise revenue verte.');
    if (row?.contextGate?.agentEligible === false) reasons.push('Contexte minimum agent validé.');
    if (row?.oddsGuardrail?.tone && row.oddsGuardrail.tone !== 'ok') reasons.push('Cote haute recontrôlée avec confiance suffisante.');
    if (!reasons.length) reasons.push('Aucun changement critique requis, seulement recontrôler la cote avant mise.');
    return reasons.slice(0, 8);
  }

  function buildDecisionHtml(row) {
    const changes = whatWouldChange(row);
    const reasons = blockReasons(row);
    const action = smartPrepareAction();
    const decisions = decisionBundleForRow(row);
    return `
      <section class="detail-tab-panel" data-detail-panel="decision">
        <div class="modal-grid">
          <article class="detail-card">
            <h4>Décision</h4>
            <div class="kv">
              <span>Statut</span><strong>${escapeHtml(row.statusLabel || row.status || '-')}</strong>
              <span>Agent</span><strong>${escapeHtml(row.contextGate?.agentEligible === false || row.prebetGate?.blocked ? 'Bloqué' : 'Éligible si Kelly positif')}</strong>
              <span>Edge</span><strong>${escapeHtml(formatPct(row.edge || 0, 1))}</strong>
              <span>Mise autorisée</span><strong>${escapeHtml(visibleStakeText(row, decisions))}</strong>
              <span>Raison mise</span><strong>${escapeHtml(stakePolicyText(row, decisions))}</strong>
              <span>Préparation</span><strong>${escapeHtml(action.label || refreshModeLabel(action.mode))}</strong>
            </div>
          </article>
          <article class="detail-card wide">
            <h4>Ce qui ferait changer d'avis</h4>
            <div class="block-reason-list">
              ${changes.map((item) => `<div class="block-reason-item block-warn"><span>Condition</span><strong>${escapeHtml(item)}</strong></div>`).join('')}
            </div>
            <div class="quality-alert-actions">
              <button class="quality-action-btn" data-quality-mode="${escapeHtml(action.mode || 'quick')}" data-quality-source="${escapeHtml(action.source || 'all')}">${escapeHtml(action.label || 'Préparer')}</button>
            </div>
          </article>
          <article class="detail-card wide">
            <h4>Raisons positives/négatives</h4>
            ${reasons.length ? `<div class="block-reason-list">${reasons.map((item) => `<div class="block-reason-item block-${escapeHtml(item.tone || 'warn')}"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.detail)}</strong></div>`).join('')}</div>` : '<p class="detail-text">Aucun blocage majeur détecté.</p>'}
          </article>
        </div>
      </section>`;
  }

  function buildTimelineHtml(row) {
    const timeline = timelineForRow(row);
    const events = Array.isArray(timeline?.events) ? timeline.events : [];
    const triggers = timeline?.change_triggers || ['Cote Winamax', 'Compositions', 'Blessures'];
    return `
      <section class="detail-tab-panel" data-detail-panel="timeline">
        <div class="modal-grid">
          <article class="detail-card wide">
            <h4>Timeline décision</h4>
            ${events.length ? `<div class="block-reason-list">${events.map((item) => `
              <div class="block-reason-item block-${escapeHtml(item.tone === 'danger' ? 'danger' : item.tone === 'ok' ? 'ok' : 'warn')}">
                <span>${escapeHtml(`${formatDateLabel(item.at)} · ${item.kind || 'event'}`)}</span>
                <strong>${escapeHtml(item.label || '-')}</strong>
                <em>${escapeHtml(item.detail || '-')}</em>
              </div>
            `).join('')}</div>` : '<p class="detail-text">Aucune timeline générée pour ce match.</p>'}
          </article>
          <article class="detail-card wide">
            <h4>Déclencheurs à surveiller</h4>
            <div class="block-reason-list">
              ${triggers.map((item) => `<div class="block-reason-item block-warn"><span>Trigger</span><strong>${escapeHtml(item)}</strong></div>`).join('')}
            </div>
          </article>
        </div>
      </section>`;
  }

  function buildIdentityDetailHtml(row) {
    const identities = identityForRow(row);
    if (!identities.length) return '';
    return `
      <article class="detail-card wide">
        <h4>Matching équipes</h4>
        <div class="market-list">
          ${identities.slice(0, 2).map((item) => `
            <div class="market-row">
              <span>${escapeHtml(item.status || 'identity')}</span>
              <strong>${escapeHtml(item.primary || item.key || '-')}</strong>
              <em>${escapeHtml(`${Math.round(Number(item.confidence || 0))}/100 · ${(item.failure_reasons || []).slice(0, 2).join(', ') || 'ok'}`)}</em>
            </div>
          `).join('')}
        </div>
      </article>`;
  }

  function buildModelHtml(row) {
    const summary = state.modelLab?.summary || {};
    const prob = state.probabilityCalibration?.summary || {};
    const policies = Array.isArray(state.policyCandidates?.policies) ? state.policyCandidates.policies : [];
    const marketKey = compactUiKey(row.marketKey || row.market || '');
    const marketRows = Array.isArray(state.modelLab?.by_market) ? state.modelLab.by_market : [];
    const market = marketRows.find((item) => compactUiKey(item.key) === marketKey) || null;
    const policyRows = policies.filter((item) => {
      const text = compactUiKey(`${item.id || ''} ${item.title || ''} ${item.detail || ''}`);
      return !marketKey || text.includes(marketKey);
    }).slice(0, 5);
    return `
      <section class="detail-tab-panel" data-detail-panel="model">
        <div class="modal-grid">
          <article class="detail-card">
            <h4>Model Lab</h4>
            <div class="kv">
              <span>Sample réglé</span><strong>${escapeHtml(formatCount(summary.settled_rows || 0))}</strong>
              <span>ROI global</span><strong>${escapeHtml(formatPct(summary.roi || 0, 1))}</strong>
              <span>Brier</span><strong>${escapeHtml(Number(summary.brier || 0).toFixed(3))}</strong>
              <span>Drawdown</span><strong>${escapeHtml(formatSignedUnits(-(summary.max_drawdown_units || 0)))}</strong>
            </div>
          </article>
          <article class="detail-card">
            <h4>Marché courant</h4>
            <div class="kv">
              <span>Segment</span><strong>${escapeHtml(market?.key || row.market || '-')}</strong>
              <span>Réglés</span><strong>${escapeHtml(formatCount(market?.count || 0))}</strong>
              <span>ROI</span><strong>${escapeHtml(market ? formatPct(market.roi || 0, 1) : 'indisponible')}</strong>
              <span>Sample</span><strong>${escapeHtml(market?.sample_level || 'en attente')}</strong>
            </div>
          </article>
          <article class="detail-card">
            <h4>Calibration proba</h4>
            <div class="kv">
              <span>Erreur moyenne</span><strong>${escapeHtml(prob.mean_abs_error != null ? formatPct(prob.mean_abs_error, 1) : 'indisponible')}</strong>
              <span>Buckets</span><strong>${escapeHtml(formatCount(prob.usable_buckets || 0))}</strong>
              <span>Règle</span><strong>Boosts faibles et bornés</strong>
              <span>H2H</span><strong>Jamais décisif seul</strong>
            </div>
          </article>
          <article class="detail-card wide">
            <h4>Politiques candidates</h4>
            ${policyRows.length ? `<div class="block-reason-list">${policyRows.map((item) => `
              <div class="block-reason-item block-${escapeHtml(priorityTone(item.priority))}">
                <span>${escapeHtml(`${item.priority || 'info'} · ${item.source || 'policy'}`)}</span>
                <strong>${escapeHtml(item.title || '-')}</strong>
                <em>${escapeHtml(item.action || item.detail || '-')}</em>
              </div>
            `).join('')}</div>` : '<p class="detail-text">Aucune politique candidate spécifique à ce marché. Les garde-fous généraux restent appliqués.</p>'}
          </article>
        </div>
      </section>`;
  }

  function buildDetailHtml(row) {
    const match = row.match || {};
    const pred = row.pred || {};
    const context = match.context || {};
    const contextQuality = context.quality || row.contextQuality || {};
    const decisionBundle = decisionBundleForRow(row);
    const stakeAllowed = canDisplayStake(row, decisionBundle);
    const dc = decisionBundleForRow(row);
    const readableDecision = dc.status === 'ready' ? 'Prêt' : dc.status === 'repair' ? 'À réparer' : dc.status === 'skip' ? 'À éviter' : (row.statusLabel || 'Observation');
    const readableReason = noBetStakeReason(row, decisionBundle) || contextGateText(row);
    const readableAction = dc.nextAction || (stakeAllowed ? 'Jouer maintenant' : 'Surveiller ou finaliser T-10');
    const wx = match.winamax || {};
    const markets = wx.markets || {};
    const oneNtwo = markets['1n2'] || {};
    const quality = [
      ['Puis-je miser ?', stakeAllowed ? 'Oui' : 'Non'],
      ['Pourquoi ?', readableReason],
      ['Action utile', readableAction],
      ['Mise affichée', visibleStakeText(row, decisionBundle)],
      ['Statut', row.statusLabel],
      ['Marché', row.market],
      ['Pick', row.label],
      ['Cote', row.odd > 1 ? `@${row.odd.toFixed(2)}` : '-'],
      ['Proba modèle', row.probability > 0 ? formatPct(row.probability, 1) : '-'],
      ['Edge', row.edge > 0 ? formatPct(row.edge, 1) : '-'],
      ['Mise autorisée', visibleStakeText(row, decisionBundle)],
      ['Kelly théorique', Number(row.modelStake || row.stake || 0) > 0 && !stakeAllowed ? `${formatMoney(row.modelStake || row.stake)} · bloquée` : row.stake > 0 ? formatMoney(row.stake) : '0 €'],
      ['Prudence mise', stakePolicyText(row, decisionBundle)],
      ['Contexte', contextScoreLabel(contextQuality)],
      ['Confiance', confidenceTrustText(row)],
      ['Décision logiciel', readableDecision],
      ['Raison', readableReason],
      ['Marché', row.marketTiming?.label || 'CLV en apprentissage'],
      ['Cote haute', row.oddsGuardrail?.tone && row.oddsGuardrail.tone !== 'ok' ? row.oddsGuardrail.label : 'Pas de garde-fou cote'],
      ['Gate', contextGateText(row)]
    ];
    const coteRows = [
      ['Winamax', wx.match_id ? `match ${wx.match_id}` : 'non lié'],
      ['1', oneNtwo.home ? `@${Number(oneNtwo.home).toFixed(2)}` : '-'],
      ['N', oneNtwo.draw ? `@${Number(oneNtwo.draw).toFixed(2)}` : '-'],
      ['2', oneNtwo.away ? `@${Number(oneNtwo.away).toFixed(2)}` : '-']
    ];
    const explanation = cleanExplanation(pred.explain || pred.explanation || pred.reason);
    const winamaxUrl = safeExternalUrl(row.winamaxUrl, 'www.winamax.fr');
    const winamaxLink = winamaxUrl
      ? `<a href="${escapeHtml(winamaxUrl)}" target="_blank" rel="noreferrer">Ouvrir le match Winamax</a>`
      : 'Lien Winamax absent';
    const fairOdd = row.probability > 0 ? 1 / row.probability : 0;
    const consensusOdd = Array.isArray(match.odds) && match.odds[0]
      ? cleanLabel(match.odds[0].details || match.odds[0].provider || '', '')
      : '';
    const signalCards = buildSignalCards(match, pred);
    const marketRows = buildMarketRows(markets);
    const h2hHtml = buildH2hHtml(match);
    const calibrationHtml = buildCalibrationDetailHtml(row);
    const blockList = blockReasons(row);
    const decisionTone = stakeAllowed ? 'ok' : dc.status === 'repair' ? 'warn' : dc.status === 'skip' ? 'danger' : 'watch';
    const signalPreview = signalCards.slice(0, 6);
    const narrative = pickNarrative(row, signalPreview, explanation);
    const signalOkCount = signalPreview.filter((signal) => signal.ok).length;
    const limitedDataHtml = signalOkCount < 2
      ? `<article class="detail-card limited-data-card">
          <h4>Données limitées</h4>
          <p class="detail-text">Moins de deux signaux contextuels solides sont présents. La décision reste prudente et la fiche indique les sources manquantes au lieu de combler les trous.</p>
        </article>`
      : '';
    const usefulContext = [
      signalPreview.find((signal) => signal.label === 'Météo'),
      signalPreview.find((signal) => signal.label === 'Compositions'),
      signalPreview.find((signal) => signal.label === 'Blessures'),
      signalPreview.find((signal) => signal.label === 'Stats équipes')
    ].filter(Boolean);
    const sourceLine = context.sources && Array.isArray(context.sources)
      ? `${formatCount(context.sources.length)} source(s) contexte`
      : row.sourceHealth?.summary
        ? 'Sources health disponibles'
        : 'Sources locales lues depuis les derniers fichiers';

    return `
      <section class="detail-tab-panel active" data-detail-panel="summary">
        <div class="match-sheet-summary">
          <article class="match-decision-hero decision-${escapeHtml(decisionTone)}">
            <span>Décision</span>
            <strong>${escapeHtml(stakeAllowed ? 'Je peux miser' : 'Ne pas miser maintenant')}</strong>
            <p>${escapeHtml(readableReason)}</p>
            <div class="decision-hero-grid">
              <div><span>Cote</span><strong>${escapeHtml(row.odd > 1 ? `@${row.odd.toFixed(2)}` : '-')}</strong></div>
              <div><span>Edge</span><strong>${escapeHtml(row.edge > 0 ? formatPct(row.edge, 1) : '-')}</strong></div>
              <div><span>Mise</span><strong>${escapeHtml(visibleStakeText(row, decisionBundle))}</strong></div>
              <div><span>Contexte</span><strong>${escapeHtml(contextScoreLabel(contextQuality))}</strong></div>
            </div>
          </article>
          <article class="match-ticket-card">
            <h4>Ticket</h4>
            <div class="kv">
              <span>Pick</span><strong>${escapeHtml(row.label || '-')}</strong>
              <span>Marché</span><strong>${escapeHtml(row.market || '-')}</strong>
              <span>Cote modèle</span><strong>${escapeHtml(fairOdd > 1 ? `@${fairOdd.toFixed(2)}` : '-')}</strong>
              <span>Cote consensus</span><strong>${escapeHtml(consensusOdd || 'Non disponible')}</strong>
              <span>Action</span><strong>${escapeHtml(readableAction)}</strong>
              <span>Bookmaker</span><strong>${winamaxLink}</strong>
            </div>
          </article>
        </div>
        ${enrichmentForRow(row) ? buildEnrichedSourcesHtml(row) : ''}
        <article class="detail-card wide sheet-signals-card">
          <h4>Signaux clés</h4>
          <div class="sheet-signal-strip">
            ${signalPreview.map((signal) => `
              <div class="${signal.ok ? 'ok' : 'missing'}">
                <span>${escapeHtml(signal.label)}</span>
                <strong>${escapeHtml(signal.value)}</strong>
                <em>${escapeHtml(signal.detail)}</em>
              </div>
            `).join('')}
          </div>
        </article>
        <div class="modal-grid sheet-grid">
          <article class="detail-card">
            <h4>Pourquoi ce pick</h4>
            <p class="detail-text">${escapeHtml(narrative)}</p>
            ${formStripHtml(match)}
            <div class="mini-kpi-row">
              <span>Proba ${escapeHtml(row.probability > 0 ? formatPct(row.probability, 1) : '-')}</span>
              <span>Confiance ${escapeHtml(confidenceTrustText(row))}</span>
              <span>${escapeHtml(sourceLine)}</span>
            </div>
          </article>
          <article class="detail-card">
            <h4>Contexte utile</h4>
            <div class="kv">${usefulContext.length ? usefulContext.map((signal) => `<span>${escapeHtml(signal.label)}</span><strong>${escapeHtml(signal.value)}</strong>`).join('') : '<span>Contexte</span><strong>Voir onglet Signaux</strong>'}</div>
          </article>
          ${limitedDataHtml}
          <article class="detail-card wide">
            <h4>${blockList.length ? 'Points à vérifier' : 'Garde-fous'}</h4>
            ${blockList.length ? `<div class="block-reason-list">${blockList.slice(0, 5).map((item) => `
              <div class="block-reason-item block-${escapeHtml(item.tone || 'warn')}">
                <span>${escapeHtml(item.label)}</span>
                <strong>${escapeHtml(item.detail)}</strong>
              </div>
            `).join('')}</div>` : '<p class="detail-text">Tous les garde-fous locaux sont verts. La cote Winamax reste à vérifier au moment du clic.</p>'}
          </article>
        </div>
        <details class="advanced-section detail-audit">
          <summary>Audit technique</summary>
          <div class="kv">${quality.map(([k, v]) => `<span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong>`).join('')}</div>
          <div class="audit-card-wrap">${calibrationHtml}</div>
        </details>
      </section>
      ${buildDecisionHtml(row)}
      ${buildContextHtml(row)}
      ${buildTeamsHtml(row)}
      ${buildAvailabilityHtml(row)}
      <section class="detail-tab-panel" data-detail-panel="signals">
        <div class="signal-grid">
          ${signalCards.map((signal) => `
            <article class="signal-card ${signal.ok ? 'signal-ok' : 'signal-missing'}">
              <span>${escapeHtml(signal.label)}</span>
              <strong>${escapeHtml(signal.value)}</strong>
              <small>${escapeHtml(signal.detail)}</small>
            </article>
          `).join('')}
        </div>
      </section>
      <section class="detail-tab-panel" data-detail-panel="odds">
        <div class="modal-grid">
          <article class="detail-card">
            <h4>1N2</h4>
            <div class="kv">${coteRows.map(([k, v]) => `<span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong>`).join('')}</div>
          </article>
          ${buildMarketTimingHtml(row.marketTiming)}
          ${buildSignalConflictHtml(row.signalConflict)}
          ${buildOddsGuardrailHtml(row.oddsGuardrail)}
          ${buildMarketProfileHtml(row.marketProfile)}
          <article class="detail-card wide">
            <h4>Marchés détaillés</h4>
            <div class="market-list">
              ${marketRows.map((item) => `
                <div class="market-row">
                  <span>${escapeHtml(item.market)}</span>
                  <strong>${escapeHtml(item.label)}</strong>
                  <em>${escapeHtml(item.odd)}</em>
                </div>
              `).join('') || '<div class="empty compact-empty">Aucun marché détaillé exploitable.</div>'}
            </div>
          </article>
        </div>
      </section>
      <section class="detail-tab-panel" data-detail-panel="h2h">
        ${h2hHtml}
      </section>
      ${buildTimelineHtml(row)}
      ${buildSourcesHtml(row)}
      ${buildModelHtml(row)}`;
  }

  function stakeAdjustmentText(row) {
    const adjustment = row?.stakeAdjustment || null;
    if (!adjustment?.applied) return 'Standard';
    const factor = Number(adjustment.factor || 1);
    const before = Number(adjustment.beforeStake);
    const after = Number(adjustment.afterStake ?? row?.stake);
    const reasons = Array.isArray(adjustment.reasons) ? adjustment.reasons.slice(0, 2).join(' · ') : '';
    const money = Number.isFinite(before) && Number.isFinite(after)
      ? `${formatMoney(before)} → ${formatMoney(after)}`
      : `x${factor.toFixed(2)}`;
    return `${money}${reasons ? ` · ${reasons}` : ''}`;
  }

  function decisionBundleForRow(row) {
    return row?.decisionCenter || {};
  }

  function canDisplayStake(row, decisions = decisionBundleForRow(row)) {
    if (decisions && Object.prototype.hasOwnProperty.call(decisions, 'canBet')) {
      return decisions.canBet === true && Number(row?.stake || 0) > 0;
    }
    return row?.status === 'bet' && !row?.prebetGate?.blocked && Number(row?.edge || 0) > 0 && Number(row?.stake || 0) > 0;
  }

  function visibleStakeText(row, decisions = decisionBundleForRow(row)) {
    if (!canDisplayStake(row, decisions) && decisions?.stakeDisplay) return String(decisions.stakeDisplay);
    const stake = displayStakeAmount(row);
    return stake > 0 ? formatMoney(stake) : '0 €';
  }

  function noBetStakeReason(row, decisions = decisionBundleForRow(row)) {
    return decisions?.mainReason
      || row?.prebetGate?.first
      || row?.statusLabel
      || contextGateText(row)
      || 'Gate final non prêt';
  }

  function stakePolicyText(row, decisions = decisionBundleForRow(row)) {
    if (canDisplayStake(row, decisions)) return stakeAdjustmentText(row);
    return `Bloquée · ${noBetStakeReason(row, decisions)}`;
  }

  function blockReasons(row) {
    const reasons = [];
    const quality = row?.contextQuality || row?.match?.context?.quality || {};
    if (row?.prebetGate?.blocked) {
      reasons.push({
        label: 'Checklist avant mise',
        detail: `${row.prebetGate.label || 'Checklist rouge'}${row.prebetGate.first ? ` · ${row.prebetGate.first}` : ''}`,
        tone: 'danger'
      });
    }
    if (row?.status === 'skip') {
      reasons.push({ label: 'Décision moteur', detail: row.statusLabel || 'Skip modèle', tone: 'danger' });
    } else if (row?.status === 'watch') {
      reasons.push({ label: 'Décision moteur', detail: row.statusLabel || 'À surveiller', tone: 'warn' });
    }
    if (row?.contextGate?.agentEligible === false) {
      reasons.push({ label: 'Agent', detail: row.contextGate.label || 'Contexte non éligible agent', tone: 'danger' });
    }
    if (row?.calibration?.blocked) {
      reasons.push({ label: 'Calibration', detail: row.calibration.blockReason || row.calibration.label || 'Historique défavorable', tone: 'warn' });
    }
    if (row?.marketTiming?.guardApplied || row?.marketTiming?.tone === 'cold') {
      const warnings = Array.isArray(row.marketTiming.warnings) ? row.marketTiming.warnings.join(' · ') : '';
      reasons.push({ label: 'Marché', detail: warnings || row.marketTiming.label || 'Marché freiné', tone: 'warn' });
    }
    if (row?.signalConflict?.active) {
      reasons.push({
        label: 'Conflit signaux',
        detail: row.signalConflict.detail || row.signalConflict.label || 'Contexte fort mais marché défavorable',
        tone: row.signalConflict.severity === 'high' ? 'danger' : 'warn'
      });
    }
    if (row?.oddsGuardrail?.tone && row.oddsGuardrail.tone !== 'ok') {
      reasons.push({ label: 'Cote', detail: row.oddsGuardrail.label || 'Cote à vérifier', tone: row.oddsGuardrail.tone === 'blocked' ? 'danger' : 'warn' });
    }
    if (row?.stakeAdjustment?.applied) {
      reasons.push({ label: 'Mise', detail: stakeAdjustmentText(row), tone: 'warn' });
    }
    const critical = Array.isArray(quality.critical_missing) ? quality.critical_missing : [];
    const missing = Array.isArray(quality.missing) ? quality.missing : [];
    const stale = Array.isArray(quality.stale) ? quality.stale : [];
    if (critical.length) reasons.push({ label: 'Signal critique', detail: critical.slice(0, 4).join(' · '), tone: 'danger' });
    if (missing.length) reasons.push({ label: 'Signaux manquants', detail: missing.slice(0, 5).join(' · '), tone: 'warn' });
    if (stale.length) reasons.push({ label: 'Signaux périmés', detail: stale.slice(0, 4).join(' · '), tone: 'warn' });
    const seen = new Set();
    return reasons.filter((item) => {
      const key = `${item.label}:${item.detail}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }

  function buildBlockReasonHtml(row) {
    const reasons = blockReasons(row);
    if (!reasons.length) {
      return `
        <article class="detail-card wide block-reason-card">
          <h4>Garde-fous</h4>
          <p class="detail-text">Aucun blocage majeur sur ce match. La cote reste à vérifier au moment du pari.</p>
        </article>`;
    }
    return `
      <article class="detail-card wide block-reason-card">
        <h4>Pourquoi bloqué</h4>
        <div class="block-reason-list">
          ${reasons.map((item) => `
            <div class="block-reason-item block-${escapeHtml(item.tone || 'warn')}">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.detail)}</strong>
            </div>
          `).join('')}
        </div>
      </article>`;
  }

  function buildCalibrationDetailHtml(row) {
    const calibration = row.calibration || null;
    if (!calibration || calibration.level === 'unknown') {
      return `
        <article class="detail-card wide calibration-detail-card sample">
          <h4>Calibration risque</h4>
          <p class="detail-text">Historique insuffisant pour qualifier ce marché ou cette ligue.</p>
        </article>`;
    }
    const league = calibration.league || null;
    const edgeBucket = calibration.edgeBucket || null;
    const marketContext = calibration.marketContext || null;
    const contextBucket = calibration.context || null;
    const leagueCold = league?.level === 'cold';
    const marketCold = calibration.level === 'cold';
    const cls = calibrationRiskClass(marketCold || leagueCold ? 'cold' : calibration.level);
    const headline = marketCold
      ? 'Marché froid'
      : leagueCold
        ? 'Ligue froide'
        : calibration.level === 'warm'
          ? 'Marché favorable'
          : 'Contexte suivi';
    const rows = [
      ['Marché', `${calibrationLevelLabel(calibration.level)} · ${formatCount(calibration.sample)} réglés · ROI ${formatPct(calibration.roi, 0)}`],
      ['Contexte+marché', marketContext ? `${calibrationLevelLabel(marketContext.level)} · ${formatCount(marketContext.sample)} réglés · ROI ${formatPct(marketContext.roi, 0)}` : 'Sample en attente'],
      ['Niveau contexte', contextBucket ? `${calibration.contextTier || '-'} · ROI ${formatPct(contextBucket.roi, 0)}` : calibration.contextTier || '-'],
      ['Seuil edge', calibration.minEdge != null ? formatPct(calibration.minEdge, 1) : '-'],
      ['Seuil confiance', calibration.minTrust != null ? `${Math.round(Number(calibration.minTrust))}/100` : '-'],
      ['Ligue', league ? `${calibrationLevelLabel(league.level)} · ${formatCount(league.sample)} réglés · ROI ${formatPct(league.roi, 0)}` : 'Sample absent'],
      ['Tranche edge', edgeBucket ? `${edgeBucketLabel(calibration.edgeKey)} · ${formatCount(edgeBucket.sample)} réglés · ROI ${formatPct(edgeBucket.roi, 0)}` : edgeBucketLabel(calibration.edgeKey)],
      ['Décision', calibration.blocked ? cleanLabel(calibration.blockReason, 'Freiné par l’historique') : 'Pas de blocage historique']
    ];
    return `
      <article class="detail-card wide calibration-detail-card ${cls}">
        <h4>Calibration risque</h4>
        <div class="calibration-risk-head">
          <strong>${escapeHtml(headline)}</strong>
          <span>${escapeHtml(calibration.blocked ? 'Garde-fou actif' : 'Lecture informative')}</span>
        </div>
        <div class="kv">${rows.map(([k, v]) => `<span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong>`).join('')}</div>
      </article>`;
  }

  function buildSignalCards(match, pred) {
    const { home, away } = getSides(match);
    const referee = match.referee || match.referee_context || pred.referee || pred.refereeTendency || null;
    const weather = match.weather || pred.weather || null;
    const homeLineup = home.lineup || match.lineups?.home || null;
    const awayLineup = away.lineup || match.lineups?.away || null;
    const homeInjuries = Array.isArray(home.injuries) ? home.injuries.length : Number(match.injuries_home || match.injuries?.home?.length || 0);
    const awayInjuries = Array.isArray(away.injuries) ? away.injuries.length : Number(match.injuries_away || match.injuries?.away?.length || 0);
    const cards = Number(referee?.cardsPerGame ?? referee?.yellowPerGame ?? referee?.cards_per_match);
    const weatherValue = weather
      ? [
        weather.city,
        weather.temp_c != null ? `${Math.round(Number(weather.temp_c))}°C` : null,
        weather.wind_kmh != null ? `${Math.round(Number(weather.wind_kmh))} km/h vent` : null,
        weather.precip_mm != null ? `${Number(weather.precip_mm).toFixed(1)} mm pluie` : null
      ].filter(Boolean).join(' · ')
      : 'Non disponible';
    const cardsText = Number.isFinite(cards) ? `${cards.toFixed(1)} cartons/match` : 'Non disponible';
    const lineupText = homeLineup || awayLineup
      ? `${homeLineup?.starters?.length || 0} + ${awayLineup?.starters?.length || 0} titulaires`
      : 'Non disponible';
    const lineupDetail = match.lineup_match_type === 'team_projection'
      ? 'Profil probable d’équipe attaché avec prudence, pas une composition confirmée.'
      : homeLineup?.confirmed && awayLineup?.confirmed
        ? 'Compositions confirmées.'
        : 'Compositions prédictives ou absentes.';
    const injuryText = homeInjuries || awayInjuries ? `${homeInjuries} domicile · ${awayInjuries} extérieur` : 'Aucun absent majeur lisible';
    const teamStats = [home.form_stats, away.form_stats].filter(Boolean).length;
    const forceSignal = match.clubelo || home.elo || away.elo || match.xg || match.fbref_xg;
    const signals = [
      {
        label: 'Météo',
        ok: Boolean(weather),
        value: weatherValue,
        detail: weather ? 'Intégré aux buts attendus quand les conditions sont fortes.' : 'Le modèle continue sans pénalité météo.'
      },
      {
        label: 'Arbitre',
        ok: Boolean(referee && Number.isFinite(cards)),
        value: cardsText,
        detail: referee?.leagueAverage ? 'Moyenne de ligue utilisée faute d’arbitre confirmé.' : referee?.name || 'Pas de profil arbitre.'
      },
      {
        label: 'Compositions',
        ok: Boolean(homeLineup || awayLineup),
        value: lineupText,
        detail: lineupDetail
      },
      {
        label: 'Blessures',
        ok: Boolean(homeInjuries || awayInjuries || match.injuries),
        value: injuryText,
        detail: 'Utilisé comme ajustement prudent, jamais comme raison unique.'
      },
      {
        label: 'Stats équipes',
        ok: teamStats > 0,
        value: teamStats ? `${teamStats}/2 équipes` : 'Non disponible',
        detail: 'Forme récente, buts et clean sheets selon la couverture source.'
      },
      {
        label: 'Force / xG',
        ok: Boolean(forceSignal),
        value: forceSignal ? 'Disponible' : 'Non disponible',
        detail: 'ClubElo, xG ou force équipe selon les championnats couverts.'
      }
    ];
    const contributions = pred && pred.contributions;
    if (Array.isArray(contributions)) {
      contributions.slice(0, 3).forEach((item) => {
        if (typeof item === 'string') {
          signals.push({ label: 'Contribution', ok: true, value: item, detail: 'Signal remonté par le moteur.' });
        } else if (item && (item.label || item.name || item.title)) {
          signals.push({
            label: cleanLabel(item.label || item.name || item.title, 'Contribution'),
            ok: true,
            value: item.value != null ? cleanLabel(item.value) : 'Actif',
            detail: 'Signal remonté par le moteur.'
          });
        }
      });
    } else if (contributions && typeof contributions === 'object') {
      Object.entries(contributions).slice(0, 3).forEach(([key, value]) => {
        if (typeof value === 'number') {
          signals.push({ label: key, ok: true, value: value.toFixed(2), detail: 'Contribution numérique.' });
        }
      });
    }
    return signals.slice(0, 10);
  }

  function buildMarketRows(markets) {
    const rows = [];
    const push = (market, label, odd) => {
      const n = Number(odd);
      if (Number.isFinite(n) && n > 1) rows.push({ market: formatMarketName(market), label, odd: `@${n.toFixed(2)}` });
    };
    if (markets.match_winner) {
      markets.match_winner.slice(0, 6).forEach((item) => push(item.market || '1n2', item.label || item.side, item.odd));
    }
    ['ou', 'ou15', 'ou25', 'ou35', 'btts_rows', 'team_total', 'ht_ou', 'dnb_rows', 'baseball_total', 'hockey_total', 'tennis_games', 'tennis_sets'].forEach((key) => {
      const value = markets[key];
      if (Array.isArray(value)) {
        value.slice(0, 8).forEach((item) => push(item.market || key, item.label || item.side || key, item.odd));
      } else if (value && typeof value === 'object') {
        Object.entries(value).forEach(([side, odd]) => {
          if (side !== 'line') push(key, `${side}${value.line ? ` ${value.line}` : ''}`, odd);
        });
      }
    });
    const seen = new Set();
    return rows.filter((row) => {
      const key = `${row.market}:${row.label}:${row.odd}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 28);
  }

  function buildMarketTimingHtml(timing) {
    if (!timing) return '';
    const tone = timing.tone === 'cold' ? 'cold' : timing.tone === 'warm' ? 'warm' : 'sample';
    const warnings = Array.isArray(timing.warnings) && timing.warnings.length
      ? timing.warnings.join(', ')
      : 'Aucun frein marché strict.';
    const rows = [
      ['Signal', timing.label || 'CLV en apprentissage'],
      ['Sample', timing.sample ? `${formatCount(timing.sample)} observations` : 'Sample absent'],
      ['Marché', timing.marketKey || '-'],
      ['Tranche cote', `${timing.oddBucket || '-'}${timing.oddBucketClvPct != null ? ` · CLV ${Number(timing.oddBucketClvPct).toFixed(1)}%` : ''}`],
      ['Garde-fou', warnings]
    ];
    return `
      <article class="detail-card calibration-detail-card ${tone}">
        <h4>CLV / marché</h4>
        <div class="kv">${rows.map(([k, v]) => `<span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong>`).join('')}</div>
      </article>
    `;
  }

  function buildSignalConflictHtml(conflict) {
    if (!conflict || !conflict.active) return '';
    const tone = conflict.severity === 'high' ? 'cold' : 'sample';
    const rows = [
      ['Lecture', conflict.label || 'Conflit signaux'],
      ['Détail', conflict.detail || 'Marché défavorable malgré un dossier contexte solide'],
      ['Contexte', Number.isFinite(Number(conflict.contextScore)) ? `${Math.round(Number(conflict.contextScore))}/100` : '-'],
      ['Confiance', Number.isFinite(Number(conflict.trustScore)) ? `${Math.round(Number(conflict.trustScore))}/100` : '-'],
      ['Action', conflict.guardApplied ? 'Agent bloqué / observation' : 'Observation renforcée']
    ];
    return `
      <article class="detail-card calibration-detail-card ${tone}">
        <h4>Conflit signaux</h4>
        <div class="kv">${rows.map(([k, v]) => `<span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong>`).join('')}</div>
      </article>
    `;
  }

  function buildOddsGuardrailHtml(guard) {
    if (!guard) return '';
    const tone = guard.tone === 'blocked' ? 'cold' : guard.tone === 'watch' ? 'sample' : 'warm';
    const warnings = Array.isArray(guard.warnings) && guard.warnings.length
      ? guard.warnings.join(', ')
      : 'Aucun blocage cote.';
    const rows = [
      ['Lecture', guard.label || 'Cote standard'],
      ['Seuil watch', guard.highWatchOdd ? `@${Number(guard.highWatchOdd).toFixed(2)}` : '-'],
      ['Seuil agent', guard.maxAgentOdd ? `@${Number(guard.maxAgentOdd).toFixed(2)}` : '-'],
      ['Confiance min', guard.minTrustForHighOdd ? `${Math.round(Number(guard.minTrustForHighOdd))}/100` : '-'],
      ['Contexte min', guard.minContextForHighOdd ? `${Math.round(Number(guard.minContextForHighOdd))}/100` : '-'],
      ['Garde-fou', warnings]
    ];
    return `
      <article class="detail-card calibration-detail-card ${tone}">
        <h4>Garde-fou cote</h4>
        <div class="kv">${rows.map(([k, v]) => `<span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong>`).join('')}</div>
      </article>
    `;
  }

  function buildMarketProfileHtml(profile) {
    if (!profile) return '';
    const families = profile.families || {};
    const familyLabels = {
      n12: '1N2',
      ou: 'O/U',
      btts: 'BTTS',
      teamTotal: 'Team totals',
      dnb: 'DNB',
      exactScore: 'Score exact',
      players: 'Joueurs'
    };
    const rows = Object.entries(familyLabels).map(([key, label]) => [
      label,
      families[key] ? 'Disponible' : 'Absent / non exploité'
    ]);
    const missing = Array.isArray(profile.missingCore) && profile.missingCore.length
      ? profile.missingCore.join(', ')
      : 'Aucun manque core';
    return `
      <article class="detail-card">
        <h4>Couverture marchés</h4>
        <div class="kv">
          <span>Détaillés</span><strong>${escapeHtml(profile.detailed ? `${formatCount(profile.detailedCount || 0)} lignes` : 'Non détaillé')}</strong>
          <span>Familles</span><strong>${escapeHtml(`${formatCount(profile.familyCount || 0)} détectées`)}</strong>
          <span>Manques core</span><strong>${escapeHtml(missing)}</strong>
          ${rows.map(([k, v]) => `<span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong>`).join('')}
        </div>
      </article>
    `;
  }

  function buildFormList(team) {
    const rows = Array.isArray(team?.last5) ? team.last5 : [];
    if (!rows.length) return '<div class="empty compact-empty">Forme récente absente.</div>';
    return `<div class="form-list">${rows.slice(0, 5).map((item) => `
      <div><span>${escapeHtml(item.date || '-')}</span><strong>${escapeHtml(item.result || '-')}</strong><em>${escapeHtml(`${item.gf ?? '?'}-${item.ga ?? '?'}`)} vs ${escapeHtml(item.opp || '')}</em></div>
    `).join('')}</div>`;
  }

  function buildH2hHtml(match) {
    const { home, away } = getSides(match);
    const meetings = Array.isArray(match.h2h?.meetings) ? match.h2h.meetings.slice(0, 8) : [];
    return `
      <div class="modal-grid">
        <article class="detail-card">
          <h4>Forme domicile</h4>
          ${buildFormList(home)}
        </article>
        <article class="detail-card">
          <h4>Forme extérieur</h4>
          ${buildFormList(away)}
        </article>
        <article class="detail-card wide">
          <h4>Face-à-face</h4>
          ${meetings.length ? `
            <div class="market-list">
              ${meetings.map((item) => `
                <div class="market-row">
                  <span>${escapeHtml(item.date || '-')}</span>
                  <strong>${escapeHtml(`${item.home || 'Home'} - ${item.away || 'Away'}`)}</strong>
                  <em>${escapeHtml(`${item.home_score ?? '?'}-${item.away_score ?? '?'}`)}</em>
                </div>
              `).join('')}
            </div>
          ` : '<div class="empty compact-empty">Aucun historique H2H exploitable pour ce match.</div>'}
        </article>
      </div>`;
  }

  function renderAgent(agent) {
    $('#agent-nav').textContent = agent ? formatMoney(agent.nav) : '-';
    $('#agent-delta').textContent = agent ? formatMoney(agent.delta7) : '-';
    $('#agent-delta-pct').textContent = agent ? formatPct(agent.deltaPct7, 1) : '-';
    $('#agent-scorable').textContent = String((agent && agent.scorableRaw) || 0);
    const activeExposure = agent?.exposure || {};
    const blockedExposure = agent?.blockedExposure || {};
    const hasActiveAgentPositions = Array.isArray(agent?.positions) && agent.positions.length > 0;
    const exposure = hasActiveAgentPositions ? activeExposure : { maxDailyStake: 0, maxDailyPct: 0, count: 0 };
    $('#agent-exposure').textContent = agent ? formatMoney(exposure.maxDailyStake || 0) : '-';
    $('#agent-exposure-sub').textContent = agent
      ? Number(blockedExposure.count || 0) > 0 && !hasActiveAgentPositions
        ? `0 mise ouverte · ${formatCount(blockedExposure.count)} candidat(s) bloqué(s)`
        : `${formatPct(exposure.maxDailyPct || 0, 1)} max/jour · ${formatCount(activeExposure.count || 0)} ouvertes`
      : '-';
    const drawdown = agent?.drawdown || {};
    $('#agent-drawdown').textContent = agent ? formatLoss(drawdown.amount || 0) : '-';
    $('#agent-drawdown-sub').textContent = agent
      ? `${formatPct(drawdown.pct || 0, 1)} depuis pic ${formatMoney(drawdown.peak || agent.nav || 0)}`
      : '-';
    $('#agent-guard').textContent = agent?.guard?.label || '-';
    renderAgentBlockers();
    renderAgentBlockersTable();
    const body = $('#agent-positions-body');
    const positions = Array.isArray(agent?.positions) ? agent.positions : [];
    if (!body) return;
    if (!positions.length) {
      const label = agent?.guard?.label || 'les règles actuelles';
      body.innerHTML = `<tr><td colspan="6" class="empty">Aucune position agent ouverte : ${escapeHtml(label)}.</td></tr>`;
      return;
    }
    body.innerHTML = positions.slice(0, 18).map((pos) => {
      const cap = pos.capHit ? '<div class="match-sub">cap journalier touché</div>' : '';
      return `
        <tr class="clickable-row" data-match-id="${escapeHtml(pos.id)}" tabindex="0" role="button" aria-label="Ouvrir ${escapeHtml(pos.title)}">
          <td data-label="Match">
            <div class="match-title">${escapeHtml(pos.title)}</div>
            <div class="match-sub">${escapeHtml(pos.sport)} · ${escapeHtml(pos.league)}</div>
          </td>
          <td data-label="Marché"><span class="pill">${escapeHtml(pos.market)}</span><div class="match-sub">${escapeHtml(pos.label)}</div></td>
          <td data-label="Cote">${formatOdd(pos.odd)}</td>
          <td data-label="Edge" class="${pos.edge >= 0.08 ? 'edge-pos' : 'edge-warn'}">${formatPct(pos.edge, 1)}</td>
          <td data-label="Mise agent">${formatMoney(pos.stake)}${cap}</td>
          <td data-label="Jour">${escapeHtml(formatDayKey(pos.start))}</td>
        </tr>`;
    }).join('');
  }

  function renderAgentBlockers() {
    const grid = $('#agent-blockers-grid');
    if (!grid) return;
    const report = state.agentBlockers || {};
    const summary = report.summary || {};
    const backtest = state.agentBlockerBacktest || {};
    const bt = backtest.summary || {};
    const reasons = Array.isArray(report.byReason) ? report.byReason : [];
    const rows = Array.isArray(report.rows) ? report.rows : [];
    if (!summary.candidates && !Number(bt.active_like_count || 0) && !Number(bt.blocked_like_count || 0)) {
      grid.innerHTML = '<div class="empty">Aucun candidat agent à diagnostiquer pour l’instant.</div>';
      return;
    }
    const top = rows.slice(0, 3).map((row) => `${row.title} (${row.reason})`).join(' · ');
    const cards = [
      {
        label: 'Candidats edge+',
        value: formatCount(summary.candidates || 0),
        detail: `${formatCount(summary.active || 0)} ouverts · ${formatCount(summary.blocked || 0)} bloqués.`
      },
      {
        label: 'Raisons',
        value: formatCount(summary.reasons || reasons.length),
        detail: reasons.slice(0, 3).map((row) => `${row.label}: ${row.count}`).join(' · ') || 'Pas de blocage.'
      },
      {
        label: 'Top blocage',
        value: reasons[0] ? formatCount(reasons[0].count) : '0',
        detail: reasons[0]?.label || 'Aucun frein dominant.'
      },
      {
        label: 'À inspecter',
        value: formatCount(rows.length),
        detail: top || 'Aucun match edge+ hors agent.'
      },
      {
        label: 'Backtest actifs',
        value: formatPct(Number(bt.active_like_roi || 0), 1),
        detail: `${formatCount(bt.active_like_count || 0)} réglés comparables à l'agent.`
      },
      {
        label: 'Backtest bloqués',
        value: formatPct(Number(bt.blocked_like_roi || 0), 1),
        detail: `${formatCount(bt.blocked_like_count || 0)} réglés bloqués · écart ${formatPct(Number(bt.roi_gap || 0), 1)}.`
      },
      {
        label: 'Anomalies isolées',
        value: formatCount(bt.outlier_like_count || 0),
        detail: 'Anciennes cotes/probas extrêmes exclues du jugement agent.'
      }
    ];
    grid.innerHTML = cards.map((card) => `
      <article class="quality-report-card quality-watch">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `).join('');
  }

  function renderAgentGuardrailRecommendations() {
    const grid = $('#agent-guardrail-grid');
    if (!grid) return;
    const report = state.agentGuardrailRecommendations || {};
    const rows = Array.isArray(report.recommendations) ? report.recommendations : [];
    if (!rows.length) {
      grid.innerHTML = '<div class="empty">Aucun conseil garde-fou calculé pour le moment.</div>';
      return;
    }
    const tone = { critical: 'danger', high: 'warn', medium: 'watch', low: 'ok' };
    grid.innerHTML = rows.slice(0, 6).map((row) => `
      <article class="quality-report-card quality-${tone[row.priority] || 'watch'}">
        <span>${escapeHtml(`${row.priority || 'info'} · ${row.policy_key || 'agent'}`)}</span>
        <strong>${escapeHtml(row.title || '-')}</strong>
        <p>${escapeHtml(row.detail || row.action || '-')}</p>
        <small>${escapeHtml(row.action || 'Conseil informatif.')}</small>
      </article>
    `).join('');
  }

  function renderStakeReductionBacktest() {
    const grid = $('#stake-reduction-grid');
    if (!grid) return;
    const report = state.stakeReductionBacktest || {};
    const rows = Array.isArray(report.recommendations) ? report.recommendations : [];
    const leagueRows = Array.isArray(report.league_market_recommendations) ? report.league_market_recommendations : [];
    const summary = report.summary || {};
    if (!rows.length && !leagueRows.length && !summary.recommendations) {
      grid.innerHTML = '<div class="empty">Aucune réduction de mise nouvelle : le backtest ne signale pas de marché assez représenté.</div>';
      return;
    }
    const cards = [
      {
        label: 'Recommandations',
        value: formatCount(summary.recommendations || rows.length),
        detail: `${formatCount(summary.high || 0)} hautes · ${formatCount(summary.medium || 0)} moyennes.`
      },
      {
        label: 'Exposition économisée',
        value: `${Number(summary.exposure_saved_units || 0).toFixed(1)}u`,
        detail: 'Unités flat-stake retirées par les facteurs prudents.'
      },
      {
        label: 'Pertes évitées',
        value: `${Number(summary.loss_saved_units || 0).toFixed(1)}u`,
        detail: 'Lecture indicative sur les groupes négatifs.'
      },
      {
        label: 'Ligue+marché',
        value: formatCount(summary.league_market_recommendations || leagueRows.length),
        detail: leagueRows[0]?.detail || 'Aucun couple ligue/marché assez risqué.'
      },
      ...rows.slice(0, 4).map((row) => ({
        label: `${row.priority || 'info'} · ${row.market || '-'}`,
        value: `x${Number(row.recommended_factor || 1).toFixed(2)}`,
        detail: row.detail || `${formatCount(row.count || 0)} réglés.`
      })),
      ...leagueRows.slice(0, 2).map((row) => ({
        label: `${row.priority || 'info'} · ${row.league || '-'}:${row.market || '-'}`,
        value: `x${Number(row.recommended_factor || 1).toFixed(2)}`,
        detail: row.detail || `${formatCount(row.count || 0)} réglés.`
      }))
    ];
    const tone = { high: 'warn', medium: 'watch', low: 'ok' };
    grid.innerHTML = cards.map((card) => `
      <article class="quality-report-card quality-${tone[String(card.label).split(' · ')[0]] || 'watch'}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `).join('');
  }

  function currentMatchesForLeagueMarket(league, market) {
    const leagueKey = compactUiKey(league);
    const marketKey = compactUiKey(market);
    return (state.matches || []).filter((row) => (
      compactUiKey(row.league || row.match?.league_code) === leagueKey &&
      compactUiKey(row.marketKey || row.market) === marketKey
    ));
  }

  function compactUiKey(value) {
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function renderLeagueMarketReductions() {
    const wrap = $('#league-market-reduction-grid');
    if (!wrap) return;
    const rows = Array.isArray(state.stakeReductionBacktest?.league_market_recommendations)
      ? state.stakeReductionBacktest.league_market_recommendations
      : [];
    if (!rows.length) {
      wrap.innerHTML = '<div class="empty">Aucun couple ligue + marché assez négatif pour réduire les mises.</div>';
      return;
    }
    wrap.innerHTML = rows.slice(0, 10).map((row) => {
      const affected = currentMatchesForLeagueMarket(row.league, row.market);
      const tone = row.priority === 'high' ? 'danger' : row.priority === 'medium' ? 'watch' : 'ok';
      return `
        <article class="quality-report-card quality-${tone}">
          <span>${escapeHtml(`${row.priority || 'info'} · ${row.league || '-'}`)}</span>
          <strong>${escapeHtml(`${row.market || '-'} · x${Number(row.recommended_factor || 1).toFixed(2)}`)}</strong>
          <p>${escapeHtml(`${formatCount(row.count || 0)} réglés · ROI ${formatPct(row.roi || 0, 1)} · ${formatCount(affected.length)} match(s) actuel(s).`)}</p>
          <small>${escapeHtml(row.detail || 'Réduction prudente par ligue et marché.')}</small>
        </article>
      `;
    }).join('');
  }

  function renderSignalConflictBacktest() {
    const grid = $('#signal-conflict-grid');
    if (!grid) return;
    const report = state.signalConflictBacktest || {};
    const summary = report.summary || {};
    const policy = report.policy || {};
    const current = Array.isArray(report.current) ? report.current : [];
    if (!summary.count && !current.length) {
      grid.innerHTML = '<div class="empty">Aucun conflit contexte fort / marché froid dans le sample actuel.</div>';
      return;
    }
    const cards = [
      {
        label: 'Backtest conflit',
        value: formatCount(summary.count || 0),
        detail: `ROI ${formatPct(summary.roi || 0, 1)} · Brier ${Number(summary.brier || 0).toFixed(3)}.`
      },
      {
        label: 'Politique moteur',
        value: policy.action === 'stake_reduce_only' ? 'Mise réduite' : 'Watch strict',
        detail: policy.detail || summary.first || 'Politique prudente faute de sample positif.'
      },
      {
        label: 'Conflits actuels',
        value: formatCount(summary.current_conflicts || current.length),
        detail: current[0] ? `${current[0].title || '-'} · ${current[0].market || '-'}` : 'Aucun match actuel concerné.'
      },
      {
        label: 'Facteur',
        value: `x${Number(policy.recommended_factor || summary.recommended_factor || 1).toFixed(2)}`,
        detail: 'Appliqué seulement si un conflit est actif.'
      }
    ];
    grid.innerHTML = cards.map((card) => `
      <article class="quality-report-card quality-${card.label === 'Politique moteur' && policy.action !== 'stake_reduce_only' ? 'danger' : 'watch'}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `).join('');
  }

  function smartPrepareAction() {
    const button = state.smartPreparePlan?.button || {};
    const summary = state.smartPreparePlan?.summary || {};
    return {
      mode: button.mode || summary.mode || 'quick',
      source: button.source || summary.source || 'all',
      label: button.label || summary.recommendation || refreshModeLabel(summary.mode || 'quick')
    };
  }

  function renderSmartPreparePlan() {
    const grid = $('#smart-prepare-grid');
    const caption = $('#smart-prepare-caption');
    const run = $('#smart-prepare-run-btn');
    if (!grid) return;
    const report = state.smartPreparePlan || {};
    const summary = report.summary || {};
    const queue = Array.isArray(report.queue) ? report.queue : [];
    const action = smartPrepareAction();
    if (caption) caption.textContent = summary.reason || 'Le logiciel choisit le refresh local le plus utile selon la checklist et les sources.';
    if (run) run.textContent = action.label || 'Préparer maintenant';
    if (!queue.length && !summary.mode) {
      grid.innerHTML = '<div class="empty">Aucun plan intelligent généré. Lance un refresh rapide pour construire la file.</div>';
      return;
    }
    const cards = [
      {
        tone: summary.priority === 'critical' ? 'danger' : summary.priority === 'high' ? 'warn' : 'watch',
        label: 'Action recommandée',
        value: action.label,
        detail: `${refreshModeLabel(action.mode)}${action.mode === 'signals' ? ` · ${signalSourceLabel(action.source)}` : ''}`
      },
      {
        tone: 'watch',
        label: 'Raison',
        value: summary.priority || 'info',
        detail: summary.reason || 'Consolidation locale avant décision.'
      },
      ...queue.slice(1, 4).map((row) => ({
        tone: row.priority === 'critical' ? 'danger' : row.priority === 'high' ? 'warn' : 'watch',
        label: row.label || refreshModeLabel(row.mode),
        value: refreshModeLabel(row.mode),
        detail: row.reason || signalSourceLabel(row.source)
      }))
    ];
    grid.innerHTML = cards.map((card) => `
      <article class="quality-report-card quality-${card.tone}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `).join('');
  }

  function renderSmartPreparePlanData() {
    const grid = $('#smart-prepare-data-grid');
    if (!grid) return;
    const queue = Array.isArray(state.smartPreparePlan?.queue) ? state.smartPreparePlan.queue : [];
    if (!queue.length) {
      grid.innerHTML = '<div class="empty">Aucune action intelligente en file.</div>';
      return;
    }
    grid.innerHTML = queue.slice(0, 8).map((row) => `
      <article class="quality-report-card quality-${row.priority === 'critical' ? 'danger' : row.priority === 'high' ? 'warn' : 'watch'}">
        <span>${escapeHtml(row.priority || 'info')}</span>
        <strong>${escapeHtml(row.label || refreshModeLabel(row.mode))}</strong>
        <p>${escapeHtml(row.reason || '-')}</p>
        <button class="quality-action-btn" data-quality-mode="${escapeHtml(row.mode || 'quick')}" data-quality-source="${escapeHtml(row.source || 'all')}">Lancer</button>
      </article>
    `).join('');
  }

  function renderSourceRegistryCenter() {
    const registryGrid = $('#source-registry-grid');
    const quarantineGrid = $('#source-quarantine-grid');
    if (registryGrid) {
      const rows = Array.isArray(state.sourceRegistry?.sources) ? state.sourceRegistry.sources : [];
      if (!rows.length) {
        registryGrid.innerHTML = '<div class="empty">Registre source indisponible.</div>';
      } else {
        registryGrid.innerHTML = rows.slice(0, 10).map((row) => {
          const tone = row.status === 'stale' || row.status === 'missing' ? 'warn' : 'ok';
          return `
            <article class="quality-report-card quality-${tone}">
              <span>${escapeHtml(row.cost || 'source')}</span>
              <strong>${escapeHtml(row.key || '-')}</strong>
              <p>${escapeHtml(`${row.kind || '-'} · TTL ${row.ttl_min || '-'} min · ${row.reliability || 'medium'}`)}</p>
              <small>${escapeHtml(row.note || row.url || '-')}</small>
            </article>
          `;
        }).join('');
      }
    }
    if (quarantineGrid) {
      const rows = Array.isArray(state.sourceQuarantine?.items) ? state.sourceQuarantine.items : [];
      if (!rows.length) {
        quarantineGrid.innerHTML = '<div class="empty">Aucune source en quarantaine.</div>';
      } else {
        quarantineGrid.innerHTML = rows.slice(0, 8).map((row) => `
          <article class="quality-report-card quality-warn">
            <span>${escapeHtml(row.reason || 'quarantaine')}</span>
            <strong>${escapeHtml(row.source || '-')}</strong>
            <p>${escapeHtml(`${row.status || '-'} · âge ${row.age_min != null ? formatAge(Math.round(row.age_min)) : 'inconnu'}`)}</p>
            <small>${escapeHtml(row.action || 'Ignorer par prudence.')}</small>
          </article>
        `).join('');
      }
    }
  }

  function renderOptionalSourcesPlan() {
    const grid = $('#optional-sources-grid');
    if (!grid) return;
    const rows = Array.isArray(state.optionalSourcesPlan?.sources) ? state.optionalSourcesPlan.sources : [];
    if (!rows.length) {
      grid.innerHTML = '<div class="empty">Aucune source optionnelle décrite.</div>';
      return;
    }
    grid.innerHTML = rows.slice(0, 8).map((row) => {
      const tone = row.status === 'token_missing' ? 'watch' : row.status === 'stale' ? 'warn' : 'ok';
      return `
        <article class="quality-report-card quality-${tone}">
          <span>${escapeHtml(row.status || 'optionnel')}</span>
          <strong>${escapeHtml(row.label || row.key || '-')}</strong>
          <p>${escapeHtml(row.value || '-')}</p>
          <small>${escapeHtml(row.action || row.url || '-')}</small>
        </article>
      `;
    }).join('');
  }

  function priorityTone(value) {
    const key = String(value || '').toLowerCase();
    if (key === 'critical') return 'danger';
    if (key === 'high') return 'warn';
    if (key === 'medium') return 'watch';
    return 'ok';
  }

  function renderCriticalIssues() {
    const grid = $('#critical-issues-grid');
    if (!grid) return;
    const report = state.criticalIssueReport || {};
    const rows = Array.isArray(report.issues) ? report.issues : [];
    const summary = report.summary || {};
    if (!rows.length && !summary.issues) {
      grid.innerHTML = '<div class="empty">Aucun problème critique détecté. Les garde-fous restent actifs.</div>';
      return;
    }
    const cards = [
      {
        severity: summary.critical ? 'critical' : summary.high ? 'high' : 'medium',
        label: 'État rouge',
        value: formatCount(summary.critical || 0),
        detail: `${formatCount(summary.issues || rows.length)} problème(s) · ${summary.blocks_bet ? 'agent bloqué' : 'pas de blocage global'} · ${summary.first || '-'}`
      },
      ...rows.slice(0, 7).map((row) => ({
        severity: row.severity,
        label: `${row.severity || 'info'} · ${row.category || 'audit'}`,
        value: row.title || '-',
        detail: `${row.detail || '-'} · action: ${row.action || 'à corriger'}`
      }))
    ];
    grid.innerHTML = cards.map((card) => `
      <article class="quality-report-card quality-${priorityTone(card.severity)}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `).join('');
  }

  function renderIntegrityReports() {
    const grid = $('#integrity-grid');
    if (!grid) return;
    const data = state.dataConsistencyReport?.summary || {};
    const picks = state.pickIntegrityReport?.summary || {};
    const ui = state.uiIntegrityReport?.summary || {};
    const uiIssues = Array.isArray(state.uiIntegrityReport?.issues) ? state.uiIntegrityReport.issues : [];
    const pickIssues = Array.isArray(state.pickIntegrityReport?.issues) ? state.pickIntegrityReport.issues : [];
    const cards = [
      {
        tone: Number(data.duplicate_ids || 0) || Number(data.report_errors || 0) ? 'warn' : 'ok',
        label: 'Données',
        value: formatCount(data.events || 0),
        detail: `${formatCount(data.bookable || 0)} bookables · ${formatCount(data.duplicate_ids || 0)} doublons · ${formatCount(data.report_errors || 0)} rapports en erreur.`
      },
      {
        tone: Number(picks.critical || 0) ? 'danger' : Number(picks.issues || 0) ? 'warn' : 'ok',
        label: 'Picks',
        value: formatCount(picks.settled_rows || 0),
        detail: `${formatCount(picks.issues || 0)} anomalie(s) · Kelly sans edge: ${formatCount(picks.kelly_positive_without_edge || 0)}.`
      },
      {
        tone: Number(ui.critical || 0) ? 'danger' : Number(ui.failed || 0) ? 'warn' : 'ok',
        label: 'Electron',
        value: `${formatCount(ui.passed || 0)}/${formatCount(ui.checks || 0)}`,
        detail: uiIssues[0]?.detail || 'CSP, sandbox, isolation et navigation contrôlées.'
      },
      ...pickIssues.slice(0, 3).map((row) => ({
        tone: priorityTone(row.severity),
        label: row.key || 'pick',
        value: formatCount(row.count || 0),
        detail: row.title || row.action || '-'
      }))
    ];
    grid.innerHTML = cards.map((card) => `
      <article class="quality-report-card quality-${card.tone}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `).join('');
  }

  function renderCoverageRepairEngine() {
    const grid = $('#coverage-repair-engine-grid');
    if (!grid) return;
    const engine = state.coverageRepairEngine || {};
    const targets = Array.isArray(state.sourceCoverageTargets?.targets) ? state.sourceCoverageTargets.targets : [];
    const leagues = Array.isArray(state.leagueSignalQuality?.leagues) ? state.leagueSignalQuality.leagues : [];
    const actions = Array.isArray(engine.actions) ? engine.actions : [];
    if (!actions.length && !targets.length) {
      grid.innerHTML = '<div class="empty">Moteur coverage indisponible. Lance un refresh rapide pour générer les objectifs.</div>';
      return;
    }
    const summary = engine.summary || {};
    const cards = [
      {
        tone: Number(summary.critical || 0) ? 'danger' : Number(summary.high || 0) ? 'warn' : 'ok',
        label: 'Réparations',
        value: formatCount(summary.actions || actions.length),
        detail: `${formatCount(summary.critical || 0)} critique(s) · ${summary.first || 'aucune urgence'}`
      },
      ...actions.slice(0, 5).map((row) => ({
        tone: priorityTone(row.priority),
        label: `${row.priority || 'info'} · ${signalSourceLabel(row.source || row.raw_source)}`,
        value: formatCount(row.affected_matches || 0),
        detail: `${row.title || '-'} · cible ${formatPct(row.target_rate || 0, 0)} · actuel ${formatPct(row.current_rate || 0, 0)}`,
        mode: row.mode || 'signals',
        source: row.source || 'context',
        button: `Rafraîchir ${signalSourceLabel(row.source || row.raw_source)}`
      })),
      ...targets.filter((row) => Number(row.gap_to_target || 0) > 0).slice(0, 3).map((row) => ({
        tone: priorityTone(row.priority),
        label: `Cible · ${row.source}`,
        value: `+${formatCount(row.gap_to_target || 0)}`,
        detail: `${formatCount(row.missing || 0)} manquants · ${formatCount(row.stale || 0)} périmés.`
      })),
      ...leagues.slice(0, 2).map((row) => ({
        tone: priorityTone(row.priority),
        label: `Ligue · ${row.league}`,
        value: `${Math.round(Number(row.avg_score || 0))}/100`,
        detail: `${formatCount(row.weak || 0)} faibles · ${formatCount(row.critical || 0)} critiques.`
      }))
    ];
    grid.innerHTML = cards.map((card) => `
      <article class="quality-report-card quality-${card.tone}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
        ${card.button ? `<button class="quality-action-btn" data-quality-mode="${escapeHtml(card.mode || 'signals')}" data-quality-source="${escapeHtml(card.source || 'context')}">${escapeHtml(card.button)}</button>` : ''}
      </article>
    `).join('');
  }

  function renderModelLabV4() {
    const grid = $('#model-lab-grid');
    if (!grid) return;
    const model = state.modelLab || {};
    const prob = state.probabilityCalibration || {};
    const policies = Array.isArray(state.policyCandidates?.policies) ? state.policyCandidates.policies : [];
    const summary = model.summary || {};
    const marketRows = Array.isArray(model.by_market) ? model.by_market : [];
    const cards = [
      {
        tone: Number(summary.roi || 0) < 0 ? 'warn' : 'ok',
        label: 'Historique réglé',
        value: formatCount(summary.settled_rows || 0),
        detail: `ROI ${formatPct(summary.roi || 0, 1)} · hit ${formatPct(summary.hit_rate || 0, 1)} · Brier ${Number(summary.brier || 0).toFixed(3)}.`
      },
      {
        tone: Number(summary.max_drawdown_units || 0) > 30 ? 'warn' : 'watch',
        label: 'Drawdown',
        value: formatSignedUnits(-(summary.max_drawdown_units || 0)),
        detail: 'Perte cumulée max en unités flat-stake sur l’historique.'
      },
      {
        tone: Number(prob.summary?.mean_abs_error || 0) > 0.08 ? 'warn' : 'ok',
        label: 'Calibration proba',
        value: prob.summary?.mean_abs_error != null ? formatPct(prob.summary.mean_abs_error, 1) : '-',
        detail: `${formatCount(prob.summary?.usable_buckets || 0)} bucket(s) exploitables · Brier ${Number(prob.summary?.brier || 0).toFixed(3)}.`
      },
      {
        tone: policies.some((row) => row.priority === 'critical') ? 'danger' : policies.length ? 'warn' : 'ok',
        label: 'Politiques candidates',
        value: formatCount(policies.length),
        detail: policies[0]?.title || 'Aucun nouveau frein robuste.'
      },
      ...marketRows.slice(0, 4).map((row) => ({
        tone: Number(row.roi || 0) < -0.05 && Number(row.count || 0) >= 30 ? 'warn' : 'watch',
        label: `Marché · ${row.key}`,
        value: formatPct(row.roi || 0, 1),
        detail: `${formatCount(row.count || 0)} réglés · hit ${formatPct(row.hit_rate || 0, 1)} · ${row.sample_level || 'sample'}`
      }))
    ];
    grid.innerHTML = cards.map((card) => `
      <article class="quality-report-card quality-${card.tone}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `).join('');
  }

  function renderSourceHealthV4() {
    const grid = $('#source-health-v4-grid');
    if (!grid) return;
    const report = state.sourceHealth || {};
    const summary = report.summary || {};
    const rows = Array.isArray(report.sources) ? report.sources : [];
    if (!rows.length) {
      grid.innerHTML = '<div class="empty">Santé sources V4 indisponible.</div>';
      return;
    }
    const cards = [
      {
        tone: Number(summary.critical || 0) ? 'danger' : Number(summary.warning || 0) ? 'warn' : 'ok',
        label: 'Score sources',
        value: `${Number(summary.avg_score || 0).toFixed(0)}/100`,
        detail: `${formatCount(summary.sources || rows.length)} sources · ${formatCount(summary.quarantine || 0)} quarantaine · ${formatCount(summary.optional_token_missing || 0)} tokens manquants.`
      },
      ...rows.slice(0, 7).map((row) => ({
        tone: Number(row.score || 0) < 50 ? 'danger' : Number(row.score || 0) < 80 ? 'warn' : 'ok',
        label: row.status || row.kind || 'source',
        value: `${row.source || '-'} · ${formatCount(row.score || 0)}`,
        detail: `${row.action || '-'} · âge ${row.age_min != null ? formatAge(Math.round(Number(row.age_min))) : 'inconnu'} · TTL ${row.ttl_min || '-'} min`
      }))
    ];
    grid.innerHTML = cards.map((card) => `
      <article class="quality-report-card quality-${card.tone}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `).join('');
  }


  function renderTeamIdentityGraph() {
    const grid = $('#team-identity-grid');
    if (!grid) return;
    const report = state.teamIdentityGraph || {};
    const summary = report.summary || {};
    const unmatched = Array.isArray(report.unmatched) ? report.unmatched : [];
    if (!summary.teams && !unmatched.length) {
      grid.innerHTML = '<div class="empty">Identity graph absent. Lance un refresh rapide pour le générer.</div>';
      return;
    }
    const cards = [
      { tone: 'ok', label: 'Équipes', value: formatCount(summary.teams || 0), detail: `${formatCount(summary.matches || 0)} matchs bookables reliés.` },
      { tone: 'ok', label: 'Strict', value: formatCount(summary.strict || 0), detail: 'Matching assez fiable pour enrichissement.' },
      { tone: 'watch', label: 'Utilisable', value: formatCount(summary.usable || 0), detail: 'Enrichissement possible avec prudence.' },
      { tone: unmatched.length ? 'warn' : 'ok', label: 'Incertains', value: formatCount(summary.uncertain || unmatched.length), detail: unmatched[0] ? `${unmatched[0].primary} · ${unmatched[0].failure_reasons?.join(', ') || 'raison inconnue'}` : 'Aucun blocage majeur.' }
    ];
    grid.innerHTML = cards.map((card) => `
      <article class="quality-report-card quality-${card.tone}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `).join('');
  }

  function renderAgentSimulation() {
    const grid = $('#agent-simulation-grid');
    if (!grid) return;
    const rows = Array.isArray(state.agentBankrollSimulation?.strategies) ? state.agentBankrollSimulation.strategies : [];
    if (!rows.length) {
      grid.innerHTML = '<div class="empty">Simulation agent indisponible.</div>';
      return;
    }
    grid.innerHTML = rows.map((row) => `
      <article class="quality-report-card quality-${Number(row.pnl || 0) >= 0 ? 'ok' : 'warn'}">
        <span>${escapeHtml(row.key || 'strategie')}</span>
        <strong>${escapeHtml(formatMoney(row.end_nav || 0))}</strong>
        <p>${escapeHtml(`${formatCount(row.bets || 0)} paris · ROI ${formatPct(row.roi_on_staked || 0, 1)} · DD ${formatMoney(row.max_drawdown || 0)}`)}</p>
        <small>${escapeHtml(`WR ${formatPct(row.win_rate || 0, 1)} · Brier ${Number(row.brier || 0).toFixed(3)}`)}</small>
      </article>
    `).join('');
  }

  function renderAgentBlockersTable() {
    const body = $('#agent-blockers-body');
    if (!body) return;
    const rows = Array.isArray(state.agentBlockers?.rows) ? state.agentBlockers.rows : [];
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty">Aucun edge positif bloqué hors agent.</td></tr>';
      return;
    }
    body.innerHTML = rows.slice(0, 12).map((row) => `
      <tr class="clickable-row" data-match-id="${escapeHtml(row.id)}" tabindex="0" role="button" aria-label="Ouvrir ${escapeHtml(row.title)}">
        <td data-label="Match">
          <div class="match-title">${escapeHtml(row.title || '-')}</div>
          <div class="match-sub">${escapeHtml(row.sport || '-')} · ${escapeHtml(row.league || '-')}</div>
        </td>
        <td data-label="Raison"><span class="pill">${escapeHtml(row.reason || row.reasonKey || '-')}</span><div class="match-sub">${escapeHtml(row.market || '-')} · ${escapeHtml(row.label || '-')}</div></td>
        <td data-label="Cote">${formatOdd(row.odd)}</td>
        <td data-label="Edge" class="${Number(row.edge || 0) >= 0.08 ? 'edge-pos' : 'edge-warn'}">${formatPct(row.edge || 0, 1)}</td>
        <td data-label="Confiance">${Number.isFinite(Number(row.trustScore)) ? `${Math.round(Number(row.trustScore))}/100` : '-'}</td>
        <td data-label="Départ">${escapeHtml(formatDateLabel(row.start))}</td>
      </tr>
    `).join('');
  }

  function renderCoverageTrend() {
    const grid = $('#coverage-trend-grid');
    if (!grid) return;
    const report = state.signalCoverageTrend || {};
    const latest = report.latest || {};
    if (!latest.matches) {
      grid.innerHTML = '<div class="empty">Tendance couverture indisponible avant le prochain refresh contexte.</div>';
      return;
    }
    const delta = report.delta_last || {};
    const recent = Array.isArray(report.recent) ? report.recent.slice(-18) : [];
    const bars = recent.map((row) => {
      const usable = Math.max(0, Math.min(1, Number(row.usable_rate || 0)));
      const strong = Math.max(0, Math.min(1, Number(row.strong_rate || 0)));
      const heightClass = `bar-h-${Math.max(1, Math.min(10, Math.round(usable * 10)))}`;
      const strengthClass = `bar-s-${Math.max(1, Math.min(5, Math.round(strong * 5)))}`;
      return `<i class="${heightClass} ${strengthClass}" title="${escapeHtml(`${formatDateTime(row.generated_at)} · ${formatPct(usable, 0)} utile`)}"></i>`;
    }).join('');
    const rows = [
      {
        label: 'Couverture utile',
        value: formatPct(latest.usable_rate || 0, 0),
        detail: `${formatCount(latest.strong || 0)} forts · ${formatCount(latest.correct || 0)} corrects sur ${formatCount(latest.matches || 0)} dossiers.`
      },
      {
        label: 'Forts',
        value: formatPct(latest.strong_rate || 0, 0),
        detail: `${formatCount(latest.weak || 0)} faibles · ${formatCount(latest.insufficient || 0)} insuffisants.`
      },
      {
        label: 'Delta',
        value: delta.available ? `${Number(delta.usable_rate_pct || 0).toFixed(1)} pt` : '-',
        detail: delta.available ? `${delta.strong >= 0 ? '+' : ''}${delta.strong} forts · ${delta.warning_count >= 0 ? '+' : ''}${delta.warning_count} alertes.` : 'Premier point de tendance local.'
      },
      {
        label: 'Historique',
        value: formatCount(report.history_rows || 0),
        detail: `${formatCount(latest.warning_count || 0)} alertes suivies · ${formatCount(latest.sources_present || 0)} sources clés.`
      },
      {
        label: 'Mini tendance',
        value: recent.length ? `${recent.length} pts` : '-',
        detail: bars || 'Un premier historique sera créé au prochain refresh.'
      }
    ];
    grid.innerHTML = rows.map((row) => `
      <article class="quality-report-card quality-ok">
        <span>${escapeHtml(row.label)}</span>
        <strong>${escapeHtml(row.value)}</strong>
        ${row.label === 'Mini tendance' && bars
          ? `<div class="coverage-mini-chart" aria-label="Tendance couverture">${bars}</div><p>${escapeHtml('Plus haut = couverture utile meilleure.')}</p>`
          : `<p>${escapeHtml(row.detail)}</p>`}
      </article>
    `).join('');
  }

  function renderNextActions() {
    const grid = $('#next-actions-grid');
    if (!grid) return;
    const report = state.nextActions || {};
    const actions = Array.isArray(report.actions) ? report.actions : [];
    if (!actions.length) {
      grid.innerHTML = '<div class="empty">Aucune action prioritaire calculée pour le moment.</div>';
      updateFirstActionButton();
      return;
    }
    const tone = { critical: 'danger', high: 'warn', medium: 'watch', low: 'ok' };
    grid.innerHTML = actions.slice(0, 8).map((action) => {
      const mode = action.mode || 'quick';
      const source = action.source || 'all';
      const label = mode === 'signals' ? `Lancer ${signalSourceLabel(source)}` : mode === 'prematch' ? 'Lancer pré-match' : 'Lancer refresh';
      return `
        <article class="quality-alert quality-alert-card quality-${tone[action.priority] || 'warn'}">
          <div>
            <span>${escapeHtml(`${action.priority || 'info'} · ${action.area || 'logiciel'}`)}</span>
            <strong>${escapeHtml(action.title || '-')}</strong>
            <p>${escapeHtml(action.detail || '-')}</p>
          </div>
          <button class="quality-action-btn" data-quality-mode="${escapeHtml(mode)}" data-quality-source="${escapeHtml(source)}">${escapeHtml(label)}</button>
        </article>
      `;
    }).join('');
    updateFirstActionButton();
  }

  function updateFirstActionButton(running = false) {
    const button = $('#run-first-action-btn');
    if (!button) return;
    const action = firstNextAction();
    if (!action) {
      button.disabled = true;
      button.textContent = 'Aucune priorité';
      return;
    }
    const source = action.source || 'all';
    button.disabled = Boolean(running);
    button.textContent = action.mode === 'signals'
      ? `Lancer ${signalSourceLabel(source)}`
      : action.mode === 'critical'
        ? 'File critique'
        : action.mode === 'repair_context'
          ? 'Réparer contexte'
          : action.mode === 'prematch_t10'
            ? 'Pré-match T-10'
      : action.mode === 'prematch'
        ? 'Lancer pré-match'
        : 'Lancer la priorité';
  }

  function renderActionHistory() {
    const grid = $('#action-history-grid');
    if (!grid) return;
    const rows = state.actionHistory.length ? state.actionHistory : readActionHistory();
    state.actionHistory = rows;
    if (!rows.length) {
      grid.innerHTML = '<div class="empty">Aucune action lancée depuis ce poste.</div>';
      return;
    }
    grid.innerHTML = rows.slice(0, 5).map((row) => {
      const status = row.status === 'ok' ? 'ok' : row.status === 'failed' ? 'danger' : 'warn';
      const detail = row.finishedAt
        ? `${formatDateTime(row.startedAt)} → ${formatDateTime(row.finishedAt)}`
        : `${formatDateTime(row.startedAt)} · en cours ou lancé récemment`;
      return `
        <article class="quality-report-card quality-${status}">
          <span>${escapeHtml(refreshModeLabel(row.mode || 'quick'))}</span>
          <strong>${escapeHtml(row.label || actionLaunchLabel(row.mode, row.source))}</strong>
          <p>${escapeHtml(`${signalSourceLabel(row.source || 'all')} · ${row.status || 'started'} · ${detail}`)}</p>
        </article>
      `;
    }).join('');
  }

  function renderSourceFreshnessPlan() {
    const grid = $('#source-freshness-grid');
    if (!grid) return;
    const report = state.sourceFreshnessPlan || {};
    const rows = Array.isArray(report.sources) ? report.sources : [];
    if (!rows.length) {
      grid.innerHTML = '<div class="empty">Plan fraîcheur indisponible avant le prochain refresh contexte.</div>';
      return;
    }
    const tone = { critical: 'danger', high: 'warn', medium: 'watch', low: 'ok' };
    grid.innerHTML = rows.slice(0, 8).map((row) => {
      const mode = row.mode || 'signals';
      const source = row.source || 'context';
      return `
        <article class="quality-report-card quality-${tone[row.priority] || 'warn'}">
          <span>${escapeHtml(`${row.priority || 'info'} · cible ${formatAge(Math.round(Number(row.target_min || 0)))}`)}</span>
          <strong>${escapeHtml(row.label || source)}</strong>
          <p>${escapeHtml(row.detail || `Source ${signalSourceLabel(source)} à contrôler.`)}</p>
          <button class="quality-action-btn" data-quality-mode="${escapeHtml(mode)}" data-quality-source="${escapeHtml(source)}">
            Rafraîchir ${escapeHtml(signalSourceLabel(source))}
          </button>
        </article>
      `;
    }).join('');
  }

  function renderPrebetChecklist() {
    const grid = $('#prebet-checklist-grid');
    if (!grid) return;
    updateAutoCriticalButton();
    const report = state.prebetChecklist || {};
    const summary = report.summary || {};
    const rows = Array.isArray(report.items) ? report.items : [];
    const caption = $('#prebet-checklist-caption');
    if (caption) {
      if (summary.status === 'blocked') {
        caption.textContent = `${formatCount(summary.blockers || 0)} blocage(s) avant mise : lancer la file critique ou passer les picks en observation.`;
      } else if (summary.status === 'watch') {
        caption.textContent = `${formatCount(summary.items || rows.length)} point(s) de prudence avant mise : vérifier les sources marquées.`;
      } else {
        caption.textContent = 'Checklist verte : aucun blocage local majeur, la cote reste à vérifier au moment du pari.';
      }
    }
    if (!rows.length) {
      const label = summary.status === 'ready' ? 'Checklist verte' : 'Checklist indisponible avant le prochain refresh.';
      grid.innerHTML = `<div class="empty">${escapeHtml(label)}</div>`;
      return;
    }
    const tone = { critical: 'danger', high: 'warn', medium: 'watch', low: 'ok' };
    grid.innerHTML = rows.slice(0, 8).map((row) => {
      const mode = row.mode || 'quick';
      const source = row.source || 'all';
      const sourceLabel = mode === 'signals' ? ` · ${signalSourceLabel(source)}` : '';
      return `
        <article class="quality-report-card quality-${tone[row.priority] || 'watch'}">
          <span>${escapeHtml(`${row.priority || 'info'} · ${row.area || 'check'}${row.blocks_bet ? ' · bloque' : ''}`)}</span>
          <strong>${escapeHtml(row.title || '-')}</strong>
          <p>${escapeHtml(`${row.detail || '-'} ${row.action ? `· ${row.action}` : ''}`)}</p>
          <button class="quality-action-btn" data-quality-mode="${escapeHtml(mode)}" data-quality-source="${escapeHtml(source)}">
            ${escapeHtml(`${refreshModeLabel(mode)}${sourceLabel}`)}
          </button>
        </article>
      `;
    }).join('');
  }

  function renderPrebetChecklistBacktest() {
    const grid = $('#prebet-backtest-grid');
    if (!grid) return;
    const report = state.prebetChecklistBacktest || {};
    const summary = report.summary || {};
    const rows = Array.isArray(report.by_bucket) ? report.by_bucket : [];
    if (!rows.length && !summary.settled_used) {
      grid.innerHTML = '<div class="empty">Backtest checklist indisponible avant le prochain refresh.</div>';
      return;
    }
    const byKey = new Map(rows.map((row) => [row.key, row]));
    const red = byKey.get('red') || {};
    const watch = byKey.get('watch') || {};
    const green = byKey.get('green') || {};
    const cards = [
      {
        tone: Number(red.roi || 0) < 0 ? 'danger' : 'watch',
        label: 'Rouge',
        value: formatPct(red.roi || 0, 1),
        detail: `${formatCount(red.count || 0)} réglés · score moyen ${Number(red.avg_score || 0).toFixed(1)}/100.`
      },
      {
        tone: 'watch',
        label: 'Surveillance',
        value: formatPct(watch.roi || 0, 1),
        detail: `${formatCount(watch.count || 0)} réglés · pas assez net pour miser sans recheck.`
      },
      {
        tone: Number(green.roi || 0) >= Number(red.roi || 0) ? 'ok' : 'warn',
        label: 'Vert',
        value: formatPct(green.roi || 0, 1),
        detail: `${formatCount(green.count || 0)} réglés · contexte/edge plus propres.`
      },
      {
        tone: summary.policy === 'favoriser_vert_reduire_rouge' || summary.policy === 'conserver_blocage_rouge' ? 'ok' : 'watch',
        label: 'Politique',
        value: escapeHtml(summary.policy || 'apprentissage'),
        detail: `${formatCount(summary.settled_used || 0)} lignes utilisées · écart ${formatPct(summary.roi_gap || 0, 1)}.`
      }
    ];
    grid.innerHTML = cards.map((card) => `
      <article class="quality-report-card quality-${card.tone}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `).join('');
  }

  function lastCriticalAction() {
    const rows = state.actionHistory.length ? state.actionHistory : readActionHistory();
    return rows.find((row) => row && row.mode === 'critical') || null;
  }

  function renderFinalDecisionPanel() {
    const grid = $('#final-decision-grid');
    if (!grid) return;
    const caption = $('#final-decision-caption');
    const summary = state.decisionCenter?.summary || {};
    const ready = Number(summary.ready || 0);
    const watch = Number(summary.watch || 0);
    const repairCount = Number(summary.repair || 0);
    const skip = Number(summary.skip || 0);
    const blockers = Number(state.prebetChecklist?.summary?.blockers || 0);
    const repair = state.contextRepairPlan?.summary || {};
    const action = firstNextAction();
    const criticalReport = state.criticalIssueReport?.summary || {};
    if (caption) {
      caption.textContent = ready > 0
        ? `${formatCount(ready)} pari(s) prêt(s). Les autres restent en observation.`
        : `Aucun pari à jouer maintenant${summary.first ? ` · ${summary.first}` : ''}.`;
    }
    const cards = [
      {
        tone: ready > 0 ? 'ok' : 'watch',
        label: 'À jouer maintenant',
        value: formatCount(ready),
        detail: ready > 0 ? 'Mise autorisée uniquement sur ces lignes.' : 'Aucun pari à jouer maintenant.',
        button: ready > 0 ? { mode: 'prematch_t10', source: 'all', label: 'Finaliser T-10' } : null
      },
      {
        tone: watch > 0 ? 'watch' : 'ok',
        label: 'À surveiller',
        value: formatCount(watch),
        detail: `${formatCount(state.watchlist.length)} ligne(s) avec edge à rechecker sans mise.`
      },
      {
        tone: repairCount > 0 || blockers > 0 || Number(criticalReport.critical || 0) > 0 ? 'danger' : 'ok',
        label: 'À réparer',
        value: formatCount(repairCount || (repair.weak_matches || 0)),
        detail: criticalReport.first || repair.first || 'Aucune réparation prioritaire.',
        button: action && ['critical', 'repair_context'].includes(action.mode) ? { mode: action.mode, source: action.source || 'all', label: action.title || refreshModeLabel(action.mode) } : null
      },
      {
        tone: skip > 0 ? 'warn' : 'ok',
        label: 'À éviter',
        value: formatCount(skip),
        detail: skip > 0 ? 'Écartés par edge, cote, contexte ou modèle.' : 'Aucune ligne écartée dans les candidats.'
      }
    ];
    grid.innerHTML = cards.map((card) => `
      <article class="quality-report-card quality-${card.tone}">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
        ${card.button ? `<button class="quality-action-btn" data-quality-mode="${escapeHtml(card.button.mode)}" data-quality-source="${escapeHtml(card.button.source)}">${escapeHtml(card.button.label)}</button>` : ''}
      </article>
    `).join('');
    updateFirstActionButton();
  }

  function renderRefreshPriorityPlan() {
    const grid = $('#refresh-priority-grid');
    if (!grid) return;
    const report = state.refreshPriorityPlan || {};
    const rows = Array.isArray(report.queue) ? report.queue : [];
    if (!rows.length) {
      grid.innerHTML = '<div class="empty">File refresh indisponible avant le prochain recalcul des actions.</div>';
      return;
    }
    const tone = { critical: 'danger', high: 'warn', medium: 'watch', low: 'ok' };
    grid.innerHTML = rows.slice(0, 8).map((row, index) => {
      const mode = row.mode || 'quick';
      const source = row.source || 'all';
      const label = mode === 'signals' ? `Lancer ${signalSourceLabel(source)}` : mode === 'prematch' ? 'Lancer pré-match' : mode === 'critical' ? 'Lancer file critique' : mode === 'repair_context' ? 'Réparer contexte' : 'Lancer refresh';
      return `
        <article class="quality-report-card quality-${tone[row.priority] || 'watch'}">
          <span>${escapeHtml(`#${index + 1} · ${row.priority || 'info'} · ${formatDurationSeconds(row.estimated_sec || 0)}`)}</span>
          <strong>${escapeHtml(row.title || '-')}</strong>
          <p>${escapeHtml(`${row.detail || '-'} · dernier statut: ${row.last_status || 'never'}`)}</p>
          <button class="quality-action-btn" data-quality-mode="${escapeHtml(mode)}" data-quality-source="${escapeHtml(source)}">
            ${escapeHtml(label)}
          </button>
        </article>
      `;
    }).join('');
  }

  function renderContextRepairPlan() {
    const grid = $('#context-repair-grid');
    if (!grid) return;
    const report = state.contextRepairPlan || {};
    const rawRows = Array.isArray(report.queue) ? report.queue : [];
    const deduped = new Map();
    rawRows.forEach((row) => {
      const key = `${row.source || 'context'}:${row.mode || 'signals'}:${row.title || row.label || ''}`;
      const current = deduped.get(key);
      if (!current || Number(row.match_count || 0) > Number(current.match_count || 0)) deduped.set(key, row);
    });
    const rows = Array.from(deduped.values());
    const summary = report.summary || {};
    if (!rows.length) {
      const label = summary.matches
        ? 'Aucune réparation prioritaire : les dossiers faibles sont acceptables ou déjà suivis.'
        : 'Plan réparation indisponible avant le prochain recalcul contexte.';
      grid.innerHTML = `<div class="empty">${escapeHtml(label)}</div>`;
      return;
    }
    const tone = { critical: 'danger', high: 'warn', medium: 'watch', low: 'ok' };
    grid.innerHTML = rows.slice(0, 8).map((row) => {
      const mode = row.mode || 'signals';
      const source = row.source || 'context';
      const examples = Array.isArray(row.examples) && row.examples.length ? ` · ex: ${row.examples.slice(0, 2).join(', ')}` : '';
      return `
        <article class="quality-report-card quality-${tone[row.priority] || 'watch'}">
          <span>${escapeHtml(`${row.priority || 'info'} · ${formatCount(row.match_count || 0)} match(s)`)}</span>
          <strong>${escapeHtml(row.title || row.label || '-')}</strong>
          <p>${escapeHtml(`${row.detail || 'Réparation contexte à lancer.'}${examples}`)}</p>
          <button class="quality-action-btn" data-quality-mode="${escapeHtml(mode)}" data-quality-source="${escapeHtml(source)}">
            Rafraîchir ${escapeHtml(signalSourceLabel(source))}
          </button>
        </article>
      `;
    }).join('');
  }

  function renderStatus(status) {
    state.status = status;
    renderRefreshEta(status.refresh || null);
    renderPipelinePanel(status);
    $('#metric-age').textContent = formatAge(status.ageMinutes);
    $('#metric-generated').textContent = status.generatedAt ? new Date(status.generatedAt).toLocaleString('fr-FR') : '-';
    if (!state.matches.length) {
      $('#metric-upcoming').textContent = String(status.counts.bookable);
      $('#metric-bookable').textContent = `${status.counts.bookable} bookables Winamax exacts`;
    }

    const banner = $('#stale-banner');
    if (status.refresh?.running) {
      setSideStatus(`${refreshModeLabel(status.refresh.mode || 'quick')} en cours`, 'warn');
    } else if (status.recovery?.recoveredFromBackup) {
      banner.classList.remove('hidden');
      banner.textContent = `Recovery data : data.js est illisible, le logiciel affiche le dernier backup local (${escapeHtml(status.recovery.source || 'backup')}).`;
      setSideStatus('Mode recovery data', 'warn');
    } else if (status.status === 'blocked') {
      banner.classList.remove('hidden');
      banner.textContent = `Données du ${status.generatedAt ? new Date(status.generatedAt).toLocaleString('fr-FR') : 'dernier fichier local'} (${formatAge(status.ageMinutes)}). Le logiciel affiche les dernières données connues et conseille un refresh avant mise.`;
      setSideStatus('Données bloquées', 'danger');
    } else if (status.status === 'stale') {
      banner.classList.remove('hidden');
      banner.textContent = `Données à surveiller (${formatAge(status.ageMinutes)}). Dernières données locales conservées, refresh conseillé avant de miser.`;
      setSideStatus('Données à rafraîchir', 'warn');
    } else {
      banner.classList.add('hidden');
      setSideStatus(state.engineReady ? 'Calcul prêt' : 'Données prêtes', 'ok');
    }
    renderBootPerformance();
    renderRefreshPolicy();

    renderFiles(status.files || []);
    renderQualityReport(status);
    renderCoverageTrend();
    renderNextActions();
    renderActionHistory();
    renderPrebetChecklist();
    renderPrebetChecklistBacktest();
    renderFinalDecisionPanel();
    renderSourceFreshnessPlan();
    renderContextRepairPlan();
    renderRefreshPriorityPlan();
    renderSignalGapCenter();
    renderRefreshSummary(status);
    renderRefreshJournal(status);
    renderSourceHealth(status);
    renderCriticalIssues();
    renderIntegrityReports();
    renderCoverageRepairEngine();
    renderModelLabV4();
    renderSourceHealthV4();
    renderQualityAlerts(status);
    renderWarnings(status);
  }

  function renderFiles(files) {
    const wrap = $('#file-list');
    if (!files.length) {
      wrap.innerHTML = '<div class="file-row"><div class="file-meta">Aucun fichier détecté.</div></div>';
      return;
    }
    wrap.innerHTML = files.map((file) => {
      const size = file.exists ? `${Math.round((file.sizeBytes || 0) / 1024)} Ko` : 'absent';
      const modified = file.modifiedAt ? new Date(file.modifiedAt).toLocaleString('fr-FR') : '-';
      return `
        <div class="file-row">
          <div>
            <div class="file-name">${escapeHtml(file.name)}</div>
            <div class="file-meta">${file.exists ? 'Disponible' : 'Introuvable'}</div>
          </div>
          <div class="file-meta">${escapeHtml(size)}</div>
          <div class="file-meta">${escapeHtml(modified)}</div>
        </div>`;
    }).join('');
  }

  function renderQualityReport(status) {
    const wrap = $('#quality-report-grid');
    if (!wrap) return;
    const coverage = state.coverage || {};
    const calibration = state.calibration || state.history?.calibration || {};
    const alerts = buildQualityAlerts(status || {});
    const coldMarkets = Array.isArray(calibration.markets) ? calibration.markets.filter((bucket) => bucket.level === 'cold').length : 0;
    const coldLeagues = Array.isArray(calibration.leagues) ? calibration.leagues.filter((bucket) => bucket.level === 'cold').length : 0;
    const agent = state.agent || {};
    const agentPositions = Array.isArray(agent.positions) ? agent.positions.length : 0;
    const contextBacktest = state.contextBacktest || {};
    const tierRows = Array.isArray(contextBacktest.byContextTier) ? contextBacktest.byContextTier : [];
    const strongTier = tierRows.find((row) => row.key === 'fort') || null;
    const decisionBacktest = state.decisionBacktest || {};
    const decisionRows = Array.isArray(decisionBacktest.byDecision) ? decisionBacktest.byDecision : [];
    const coverageTrend = state.signalCoverageTrend?.latest || null;
    const blockers = state.agentBlockers?.summary || {};
    const betRows = decisionRows.filter((row) => ['bet', 'bet_strong'].includes(String(row.key || '')));
    const betCount = betRows.reduce((sum, row) => sum + Number(row.count || 0), 0);
    const betPnl = betRows.reduce((sum, row) => sum + Number(row.pnl_units || 0), 0);
    const betRoi = betCount > 0 ? betPnl / betCount : null;
    const football = Number(coverage.football || 0);
    const signalSummary = football > 0
      ? `Météo ${formatCount(coverage.weather || 0)}/${formatCount(football)} · Arbitres ${formatCount(coverage.refereeUsable || 0)}/${formatCount(football)} · Lineups ${formatCount(coverage.lineupsExact || 0)}/${formatCount(football)}`
      : 'Pas de match foot couvert actuellement.';
    const rows = [
      {
        label: 'Fraîcheur',
        value: formatAge(status?.ageMinutes),
        detail: status?.status === 'blocked' ? 'Recommandations bloquées.' : status?.status === 'stale' ? 'Refresh conseillé.' : 'Données exploitables.'
      },
      {
        label: 'Actionnable',
        value: formatCount(state.matches.length || status?.counts?.bookable || 0),
        detail: `${formatCount(state.picks.length)} picks dashboard · ${formatCount(state.allPicks.length || state.picks.length)} positifs.`
      },
      {
        label: 'Signaux',
        value: football ? formatCount(football) : '-',
        detail: signalSummary
      },
      {
        label: 'Calibration',
        value: formatCount(calibration.settled || 0),
        detail: `${formatCount(coldMarkets)} marchés froids · ${formatCount(coldLeagues)} ligues froides.`
      },
      {
        label: 'Agent',
        value: formatCount(agentPositions),
        detail: `${agent.guard?.label || 'Garde-fou indisponible'} · ${formatCount(blockers.blocked || 0)} edges bloqués.`
      },
      {
        label: 'Couverture',
        value: coverageTrend ? formatPct(coverageTrend.usable_rate || 0, 0) : '-',
        detail: coverageTrend ? `${formatCount(coverageTrend.strong || 0)} forts · ${formatCount(coverageTrend.correct || 0)} corrects · ${formatCount(coverageTrend.warning_count || 0)} alertes.` : 'Tendance couverture en attente.'
      },
      {
        label: 'Contexte',
        value: strongTier ? formatPct(strongTier.roi || 0, 0) : '-',
        detail: strongTier
          ? `${formatCount(strongTier.count)} forts réglés · Brier ${Number(strongTier.brier || 0).toFixed(3)}.`
          : 'Backtest contexte en attente.'
      },
      {
        label: 'Décisions',
        value: betRoi != null ? formatPct(betRoi, 0) : '-',
        detail: decisionRows.length
          ? `${formatCount(decisionBacktest.settledUsed || 0)} lignes classées · ${formatCount(betCount)} bets mesurés.`
          : 'Backtest bet/watch/skip en attente.'
      }
    ];
    wrap.innerHTML = rows.map((row, index) => {
      const tone = index === 0 && alerts[0] ? alerts[0].tone : 'ok';
      return `
        <article class="quality-report-card quality-${tone}">
          <span>${escapeHtml(row.label)}</span>
          <strong>${escapeHtml(row.value)}</strong>
          <p>${escapeHtml(row.detail)}</p>
        </article>`;
    }).join('');
  }

  function renderRefreshSummary(status) {
    const wrap = $('#refresh-summary-grid');
    if (!wrap) return;
    const refresh = status.refresh || {};
    const lastByMode = refresh.lastByMode || {};
    const sources = status.health?.sources || {};
    const signalAges = ['weather', 'referees_soccer', 'injuries_soccer', 'lineups_soccer', 'team_form', 'h2h_extended']
      .map((key) => Number(sources[key]?.age_min))
      .filter(Number.isFinite);
    const signalAge = signalAges.length ? Math.max(...signalAges) : null;
    const rows = ['prematch_t10', 'quick', 'critical', 'repair_context', 'prematch_t60', 'prematch_t30', 'prematch', 'signals', 'full'].map((mode) => {
      const isRunning = refresh.running && refresh.mode === mode;
      const summary = isRunning ? refresh : lastByMode[mode] || null;
      const ok = summary && summary.exitCode === 0 && !summary.error;
      const tone = isRunning ? 'warn' : ok ? 'ok' : summary ? 'danger' : 'idle';
      const eta = isRunning ? refreshEtaInfo(refresh) : null;
      const statusLabel = isRunning
        ? (eta?.overdue ? 'En cours · estimation dépassée' : `En cours · reste ${formatDurationSeconds(eta?.remainingSec || 0)}`)
        : ok ? 'OK' : summary ? 'Erreur' : 'Jamais lancé';
      const finished = summary?.finishedAt || summary?.startedAt || null;
      const source = mode === 'signals' ? (summary?.source || refresh.source || 'all') : null;
      const title = mode === 'signals' && source && source !== 'all'
        ? `${refreshModeLabel(mode)} · ${signalSourceLabel(source)}`
        : refreshModeLabel(mode);
      const detail = isRunning && eta
        ? `Écoulé ${formatDurationSeconds(eta.elapsedSec)} · prévu ${formatDurationSeconds(eta.totalSec)}`
        : mode === 'signals' && signalAge != null
        ? `${source && source !== 'all' ? `${signalSourceLabel(source)} · ` : ''}Âge max signaux suivis : ${formatAge(signalAge)}`
        : summary?.error || (summary ? `Code ${summary.exitCode ?? '-'}` : 'Aucun lancement dans cette session');
      return { mode, title, tone, statusLabel, finished, detail };
    });

    wrap.innerHTML = rows.map((row) => `
      <article class="refresh-card refresh-${row.tone}">
        <div>
          <span>${escapeHtml(row.title)}</span>
          <strong>${escapeHtml(row.statusLabel)}</strong>
        </div>
        <p>${escapeHtml(formatDateTime(row.finished))}</p>
        <small>${escapeHtml(row.detail)}</small>
      </article>
    `).join('');
  }

  function refreshStatusLabel(status) {
    if (status === 'ok') return 'OK';
    if (status === 'timeout') return 'Timeout';
    if (status === 'missing') return 'Absent';
    if (status === 'failed') return 'Erreur';
    if (status === 'warn') return 'Avertissement';
    return status || '-';
  }

  function renderRefreshJournal(status) {
    const wrap = $('#refresh-stage-grid');
    if (!wrap) return;
    const history = Array.isArray(status.refresh?.history) ? status.refresh.history : [];
    const latest = history.find((entry) => Array.isArray(entry.stages) && entry.stages.length) || null;
    if (!latest) {
      wrap.innerHTML = '<div class="empty">Aucun journal détaillé disponible. Lance un refresh depuis le logiciel ou en CLI pour le remplir.</div>';
      return;
    }
    const stages = latest.stages || [];
    const failed = stages.filter((stage) => stage.status && stage.status !== 'ok').length;
    const cards = [
      {
        status: latest.ok ? 'ok' : 'failed',
        title: `${refreshModeLabel(latest.mode)}${latest.source ? ` · ${signalSourceLabel(latest.source)}` : ''}`,
        value: formatDurationSeconds(latest.durationSec),
        detail: `${formatDateTime(latest.finishedAt)} · ${formatCount(stages.length)} étapes · ${failed ? `${failed} à revoir` : 'tout OK'}`
      },
      ...stages.slice(0, 11).map((stage) => ({
        status: stage.status || 'warn',
        title: stage.script,
        value: formatDurationSeconds(stage.durationSec),
        detail: `${refreshStatusLabel(stage.status)} · code ${stage.exitCode ?? '-'} · timeout ${formatDurationSeconds(stage.timeoutSec)}`
      }))
    ];
    wrap.innerHTML = cards.map((card) => `
      <article class="refresh-stage-card stage-${escapeHtml(card.status)}">
        <span>${escapeHtml(card.value)}</span>
        <strong title="${escapeHtml(card.title)}">${escapeHtml(card.title)}</strong>
        <p>${escapeHtml(card.detail)}</p>
      </article>
    `).join('');
  }

  function renderSourceHealth(status) {
    const wrap = $('#source-health-grid');
    if (!wrap) return;
    const sources = status.health?.sources || {};
    const coverage = state.coverage || {};
    const football = Number(coverage.football || 0);
    const sourceRows = [
      {
        key: 'winamax_markets',
        label: 'Cotes Winamax',
        main: (src) => `${formatCount(src.matches_with_odds)} matchs cotés`,
        detail: (src) => `${formatCount(src.matches_detailed)} détaillés · ratio ${Number.isFinite(Number(src.details_ratio_pct)) ? `${Number(src.details_ratio_pct).toFixed(0)}%` : '-'}`
      },
      {
        key: 'winamax_catalog',
        label: 'Catalogue Winamax',
        main: (src) => `${formatCount(src.matches)} matchs`,
        detail: (src) => `${formatCount(src.tournaments)} tournois`
      },
      {
        key: 'sofascore_events',
        label: 'Sofascore',
        main: (src) => `${formatCount(src.total)} événements`,
        detail: () => 'Base lineups, arbitres et signaux foot'
      },
      {
        key: 'lineups_soccer',
        label: 'Lineups foot',
        refreshSource: 'lineups',
        main: (src) => `${formatCount(src.events)} entrées source`,
        detail: () => football
          ? `${formatCount(coverage.lineupsExact || 0)} exacts · ${formatCount(coverage.lineupProfiles || 0)} profils attachés`
          : 'En attente de matchs foot'
      },
      {
        key: 'referees_soccer',
        label: 'Arbitres',
        refreshSource: 'referees',
        main: (src) => `${formatCount(src.events)} entrées source`,
        detail: () => football ? `${formatCount(coverage.refereeUsable || 0)}/${formatCount(football)} utilisables` : 'En attente de matchs foot'
      },
      {
        key: 'weather',
        label: 'Météo',
        refreshSource: 'weather',
        main: (src) => `${formatCount(src.events)} événements météo`,
        detail: () => football ? `${formatCount(coverage.weather || 0)}/${formatCount(football)} attachés au modèle` : 'En attente de matchs foot'
      },
      {
        key: 'injuries_soccer',
        label: 'Blessures',
        refreshSource: 'injuries',
        main: (src) => `${formatCount(src.players)} joueurs`,
        detail: (src) => football ? `${formatCount(coverage.injuries || 0)}/${formatCount(football)} matchs couverts · ${formatCount(src.teams)} équipes` : `${formatCount(src.teams)} équipes`
      },
      {
        key: 'team_form',
        label: 'Forme équipes',
        refreshSource: 'team_form',
        main: (src) => `${formatCount(src.teams)} équipes`,
        detail: () => 'Séries récentes, dynamique et contexte'
      },
      {
        key: 'team_stats',
        label: 'Stats équipes',
        refreshSource: 'team_stats',
        main: (src) => `${formatCount(src.teams)} équipes`,
        detail: () => 'Forme, attaque, défense'
      },
      {
        key: 'h2h_extended',
        label: 'H2H',
        refreshSource: 'h2h',
        main: (src) => `${formatCount(src.matches)} confrontations`,
        detail: () => 'Historique face-à-face utilisé en détail match'
      },
      {
        key: 'clubelo',
        label: 'ClubElo',
        main: (src) => `${formatCount(src.clubs)} clubs`,
        detail: () => football ? `${formatCount(coverage.clubelo || 0)}/${formatCount(football)} attachés` : 'Signal niveau équipe'
      },
      {
        key: 'xg_team_stats',
        label: 'xG équipes',
        main: (src) => `${formatCount(src.teams)} équipes`,
        detail: (src) => `${formatCount(src.leagues)} ligues · ${src.source || 'source xG'}`
      },
      {
        key: 'match_context',
        label: 'Dossiers contexte',
        refreshSource: 'context',
        main: (src) => `${formatCount(src.matches)} matchs`,
        detail: (src) => `${formatCount(src.strong || 0)} forts · ${formatCount(src.weak || 0)} faibles · ${formatCount(src.insufficient || 0)} insuffisants`
      },
      {
        key: 'signal_gap_report',
        label: 'Signaux manquants',
        refreshSource: 'context',
        main: (src) => `${formatCount(src.gaps)} manques`,
        detail: (src) => `${formatCount(src.low_context_matches)} matchs à contexte faible`
      },
      {
        key: 'context_backtest',
        label: 'Backtest contexte',
        main: (src) => `${formatCount(src.settled)} picks réglés`,
        detail: (src) => `${formatCount(src.tiers)} niveaux · ${formatCount(src.markets)} marchés`
      },
      {
        key: 'decision_backtest',
        label: 'Backtest décision',
        main: (src) => `${formatCount(src.settled)} picks réglés`,
        detail: (src) => `${formatCount(src.decisions)} décisions · ${formatCount(src.reasons)} raisons`
      },
      {
        key: 'decision_tuning',
        label: 'Réglage décision',
        main: (src) => `${formatCount(src.recommendations)} règles prudentes`,
        detail: (src) => `${formatCount(src.degrade_markets)} marchés freinés · confiance min ${src.suggested_min_trust || '-'}`
      },
      {
        key: 'decision_shadow',
        label: 'Shadow décision',
        main: (src) => `${formatCount(src.affected)} matchs freinés`,
        detail: (src) => `${formatCount(src.would_watch)} watch · ${formatCount(src.would_skip)} skip simulés`
      },
      {
        key: 'odds_guardrails',
        label: 'Garde-fous cotes',
        main: (src) => `${formatCount(src.current_high_odd_matches)} matchs cote haute`,
        detail: (src) => `${formatCount(src.risky_buckets)} buckets risqués · agent max @${Number(src.max_agent_odd || 0).toFixed(1)}`
      },
      {
        key: 'agent_blocker_backtest',
        label: 'Backtest blocages',
        main: (src) => `${formatCount(src.settled)} picks réglés`,
        detail: (src) => `actifs ${formatPct(Number(src.active_roi_pct || 0) / 100, 1)} · bloqués ${formatPct(Number(src.blocked_roi_pct || 0) / 100, 1)} · écart ${formatPct(Number(src.roi_gap_pct || 0) / 100, 1)}`
      },
      {
        key: 'agent_guardrail_recommendations',
        label: 'Conseils agent',
        main: (src) => `${formatCount(src.recommendations)} conseils`,
        detail: (src) => `${formatCount(src.critical)} critiques · ${formatCount(src.high)} hauts · ${formatCount(src.medium)} moyens`
      },
      {
        key: 'scorer_quality',
        label: 'Qualité buteurs',
        main: (src) => `${formatCount(src.ready)} prêts / ${formatCount(src.football_bookable)} foot`,
        detail: (src) => `${formatCount(src.watch)} à vérifier · ${formatCount(src.fragile)} fragiles`
      },
      {
        key: 'scorer_candidates',
        label: 'Archive buteurs',
        main: (src) => `${formatCount(src.history_rows)} candidats`,
        detail: (src) => `${formatCount(src.added_rows)} ajoutés · ${formatCount(src.pending)} en attente`
      },
      {
        key: 'scorer_settlement',
        label: 'Settlement buteurs',
        main: (src) => `${formatCount(src.settled_total)} réglés`,
        detail: (src) => `${formatPct(Number(src.hit_rate_pct || 0) / 100, 0)} hit · ${formatCount(src.pending)} pending`
      },
      {
        key: 'scorer_pending_audit',
        label: 'Audit pending buteurs',
        main: (src) => `${formatCount(src.pending)} pending`,
        detail: (src) => `${formatCount(src.pending_matches)} matchs · ${formatCount(src.actions)} actions · ${formatCount(src.settled_total)} réglés`
      },
      {
        key: 'prematch_focus',
        label: 'Focus T-60',
        refreshSource: 'context',
        main: (src) => `${formatCount(src.matches)} matchs à contrôler`,
        detail: (src) => `${formatCount(src.critical)} critiques · ${formatCount(src.high)} hauts`
      },
      {
        key: 'prematch_execution',
        label: 'Plan pré-match',
        refreshSource: 'context',
        main: (src) => `${formatCount(src.steps)} étapes`,
        detail: (src) => `${formatCount(src.focus_matches)} matchs · ${formatCount(src.critical)} critiques`
      },
      {
        key: 'signal_coverage_trend',
        label: 'Tendance couverture',
        refreshSource: 'context',
        main: (src) => `${formatPct(Number(src.usable_rate_pct || 0) / 100, 0)} utile`,
        detail: (src) => `${formatCount(src.history_rows)} points · delta ${Number(src.delta_usable_rate_pct || 0).toFixed(1)} pt`
      },
      {
        key: 'next_actions',
        label: 'Prochaines actions',
        refreshSource: 'context',
        main: (src) => `${formatCount(src.actions)} actions`,
        detail: (src) => `${formatCount(src.critical)} critiques · ${formatCount(src.high)} hautes`
      },
      {
        key: 'source_freshness_plan',
        label: 'Plan fraîcheur',
        refreshSource: 'context',
        main: (src) => `${formatCount(src.sources)} sources suivies`,
        detail: (src) => `${formatCount(src.due)} à relancer · ${formatCount(src.critical)} critiques · ${formatCount(src.high)} hautes`
      },
      {
        key: 'context_repair_plan',
        label: 'Réparation contextes',
        refreshSource: 'context',
        main: (src) => `${formatCount(src.repair_actions)} actions`,
        detail: (src) => `${formatCount(src.weak_matches)} faibles · ${formatCount(src.insufficient_matches)} insuffisants · ${formatCount(src.critical)} critiques`
      },
      {
        key: 'refresh_priority_plan',
        label: 'File refresh',
        refreshSource: 'context',
        main: (src) => `${formatCount(src.items)} actions ordonnées`,
        detail: (src) => `${formatCount(src.critical)} critiques · ${formatCount(src.high)} hautes · ${formatDurationSeconds(src.estimated_total_sec || 0)} estimées`
      },
      {
        key: 'prebet_checklist_backtest',
        label: 'Backtest checklist',
        main: (src) => `${formatCount(src.settled_used)} réglés`,
        detail: (src) => `rouge ${formatPct(src.red_roi || 0, 1)} · vert ${formatPct(src.green_roi || 0, 1)} · ${src.policy || 'apprentissage'}`
      },
      {
        key: 'clv_summary',
        label: 'CLV marché',
        main: (src) => `${formatCount(src.pick_observations)} obs. picks`,
        detail: (src) => `CLV pick ${Number(src.pick_mean_clv_pct || 0).toFixed(1)}% · positives ${Number(src.positive_clv_rate || 0).toFixed(0)}%`
      }
    ];

    wrap.innerHTML = sourceRows.map((row) => {
      const src = sources[row.key] || {};
      const tone = sourceTone(src);
      const age = Number.isFinite(Number(src.age_min)) ? formatAge(Number(src.age_min)) : '-';
      const canRefresh = Boolean(row.refreshSource);
      const refreshDisabled = Boolean(status.refresh?.running);
      const lastRefresh = canRefresh ? sourceRefreshSummary(status, row.refreshSource) : '';
      return `
        <article class="source-card source-${tone}">
          <div class="source-card-head">
            <div>
              <h4>${escapeHtml(row.label)}</h4>
              <p>${escapeHtml(row.main(src))}</p>
            </div>
            <span>${escapeHtml(sourceToneLabel(tone))}</span>
          </div>
          <div class="source-card-foot">
            <strong>${escapeHtml(age)}</strong>
            <span>${escapeHtml(row.detail(src))}</span>
            ${lastRefresh ? `<em>${escapeHtml(lastRefresh)}</em>` : ''}
          </div>
          ${canRefresh ? `
            <button class="source-refresh-btn" data-signal-source="${escapeHtml(row.refreshSource)}" ${refreshDisabled ? 'disabled' : ''}>
              Rafraîchir ${escapeHtml(row.label)}
            </button>
          ` : ''}
        </article>`;
    }).join('');
  }

  function currentSignalGapFilter() {
    return $('#signal-gap-filter')?.value || 'all';
  }

  function filteredSignalGaps() {
    const filter = currentSignalGapFilter();
    const gaps = Array.isArray(state.signalGaps) ? state.signalGaps : [];
    return gaps.filter((gap) => {
      if (filter === 'all') return true;
      if (filter === 'critical') return Boolean(gap.critical);
      if (filter === 'lineups') return gap.source === 'lineups';
      if (filter === 'injuries') return gap.source === 'injuries' || gap.source === 'roster';
      if (filter === 'xg') return gap.source === 'xg' || gap.source === 'team_history';
      if (filter === 'h2h') return gap.source === 'h2h';
      return true;
    }).slice(0, 12);
  }

  function signalGapRefreshSource(source) {
    const key = String(source || '').toLowerCase();
    if (key === 'lineups') return 'lineups';
    if (key === 'injuries' || key === 'roster' || key === 'availability') return 'injuries';
    if (key === 'xg' || key === 'team_history' || key === 'team_stats') return 'team_stats';
    if (key === 'h2h') return 'h2h';
    if (key === 'weather') return 'weather';
    if (key === 'referees' || key === 'referee') return 'referees';
    return 'context';
  }

  function renderSignalGapCenter() {
    const wrap = $('#signal-gap-grid');
    if (!wrap) return;
    const gaps = filteredSignalGaps();
    const summary = state.contextSummary || {};
    if (!gaps.length) {
      const label = summary.matches
        ? `Aucun manque dans ce filtre sur ${formatCount(summary.matches)} dossiers contexte.`
        : 'Les dossiers contexte seront disponibles après le prochain refresh contexte.';
      wrap.innerHTML = `<div class="empty">${escapeHtml(label)}</div>`;
      return;
    }
    wrap.innerHTML = gaps.map((gap) => {
      const source = signalGapRefreshSource(gap.source);
      return `
        <article class="signal-gap-card ${gap.critical ? 'gap-critical' : ''}">
          <span>${escapeHtml(gap.source)} · ${escapeHtml(statusText(gap.status))}</span>
          <strong>${escapeHtml(gap.title || gap.match_id || '-')}</strong>
          <p>${escapeHtml(gap.detail || 'Signal manquant')}</p>
          <small>${escapeHtml(`${gap.league_code || gap.sport || '-'} · contexte ${gap.quality_score ?? '-'} / 100${gap.age_min != null ? ` · âge ${formatAge(Math.round(gap.age_min))}` : ''}`)}</small>
          <button class="quality-action-btn" data-gap-source="${escapeHtml(source)}">Rafraîchir ${escapeHtml(signalSourceLabel(source))}</button>
        </article>
      `;
    }).join('');
  }

  function buildQualityAlerts(status) {
    const alerts = Array.isArray(status.qualityAlerts)
      ? status.qualityAlerts
        .filter((alert) => alert && alert.title)
        .map((alert) => ({
          tone: alert.tone || 'warn',
          title: alert.title || 'Alerte qualité',
          detail: alert.detail || '-',
          action: alert.action || 'Vérifier les données avant de miser.'
        }))
      : [];
    const coverage = state.coverage || {};
    const football = Number(coverage.football || 0);
    const add = (tone, title, detail, action) => {
      if (alerts.length === 1 && alerts[0].tone === 'ok') alerts.length = 0;
      alerts.push({ tone, title, detail, action });
    };

    if (!alerts.length) {
      if (status.status === 'blocked') {
        add('danger', 'Données bloquées', `Âge des données : ${formatAge(status.ageMinutes)}.`, 'Lancer Rafraîchir avant toute mise.');
      } else if (status.status === 'stale') {
        add('warn', 'Données à rafraîchir', `Âge des données : ${formatAge(status.ageMinutes)}.`, 'Rafraîchir avant de suivre les picks.');
      }
    }

    if (football > 0) {
      const weatherRatio = Number(coverage.weather || 0) / football;
      const refereeRatio = Number(coverage.refereeUsable || 0) / football;
      const lineupRatio = Number(coverage.lineups || 0) / football;
      if (weatherRatio < 0.50) add('warn', 'Météo peu couverte', `${formatCount(coverage.weather || 0)}/${formatCount(football)} matchs foot.`, 'Lancer Signaux lents.');
      if (refereeRatio < 0.40) add('warn', 'Arbitres peu couverts', `${formatCount(coverage.refereeUsable || 0)}/${formatCount(football)} matchs foot.`, 'Lancer Signaux lents.');
      if (lineupRatio < 0.35) add('warn', 'Lineups faibles', `${formatCount(coverage.lineups || 0)}/${formatCount(football)} matchs foot.`, 'Attendre les compositions ou relancer Signaux lents.');
    }

    if (!alerts.length) {
      add('ok', 'Qualité exploitable', 'Aucun blocage détecté sur les données actionnables.', 'Continuer à utiliser Kelly strict et edge positif.');
    }
    return alerts.slice(0, 6);
  }

  function qualityAlertRank(alert) {
    const toneRank = { danger: 0, warn: 1, ok: 2 };
    return toneRank[alert?.tone] ?? 3;
  }

  function qualityAlertCategory(alert) {
    const text = `${alert?.title || ''} ${alert?.detail || ''} ${alert?.action || ''}`.toLowerCase();
    if (text.includes('pipeline') || text.includes('winamax_catalog') || text.includes('winamax_markets')) return 'pipeline';
    if (text.includes('calibration') || text.includes('ligue froide') || text.includes('marché froid')) return 'calibration';
    if (text.includes('couvert') || text.includes('météo') || text.includes('meteo') || text.includes('arbitre') || text.includes('lineup') || text.includes('blessure') || text.includes('clubelo') || text.includes('xg')) return 'coverage';
    if (text.includes('données') || text.includes('fraîch') || text.includes('ancien') || text.includes('age') || text.includes('âge')) return 'freshness';
    return 'pipeline';
  }

  function qualityCategoryLabel(category) {
    const labels = {
      freshness: 'Fraîcheur',
      coverage: 'Couverture',
      pipeline: 'Pipeline',
      calibration: 'Calibration'
    };
    return labels[category] || 'Qualité';
  }

  function currentQualityAlertOptions() {
    return {
      filter: $('#quality-alert-filter')?.value || 'all',
      sort: $('#quality-alert-sort')?.value || 'priority'
    };
  }

  function prioritizedQualityAlerts(status) {
    const options = currentQualityAlertOptions();
    const actionLabel = (alert) => qualityRefreshAction(alert)?.label || '';
    return buildQualityAlerts(status)
      .map((alert, index) => ({ ...alert, category: qualityAlertCategory(alert), index }))
      .filter((alert) => {
        if (options.filter === 'all') return true;
        if (options.filter === 'urgent') return alert.tone === 'danger';
        return alert.category === options.filter;
      })
      .sort((a, b) => {
        if (options.sort === 'category') {
          return qualityCategoryLabel(a.category).localeCompare(qualityCategoryLabel(b.category), 'fr') || (qualityAlertRank(a) - qualityAlertRank(b)) || (a.index - b.index);
        }
        if (options.sort === 'action') {
          return actionLabel(a).localeCompare(actionLabel(b), 'fr') || (qualityAlertRank(a) - qualityAlertRank(b)) || (a.index - b.index);
        }
        return (qualityAlertRank(a) - qualityAlertRank(b)) || (a.index - b.index);
      })
      .slice(0, 6);
  }

  function qualityRefreshAction(alert) {
    if (!alert || alert.tone === 'ok') return null;
    const text = `${alert.title || ''} ${alert.detail || ''} ${alert.action || ''}`.toLowerCase();
    const signalMap = [
      ['météo', 'weather'],
      ['meteo', 'weather'],
      ['weather', 'weather'],
      ['arbitre', 'referees'],
      ['referee', 'referees'],
      ['lineup', 'lineups'],
      ['composition', 'lineups'],
      ['blessure', 'injuries'],
      ['injur', 'injuries'],
      ['forme', 'team_form'],
      ['team form', 'team_form'],
      ['xg', 'team_stats'],
      ['stats équipe', 'team_stats'],
      ['team stats', 'team_stats'],
      ['h2h', 'h2h'],
      ['contexte', 'context'],
      ['signal gap', 'context']
    ];
    const found = signalMap.find(([needle]) => text.includes(needle));
    if (found) {
      return {
        mode: 'signals',
        source: found[1],
        label: `Rafraîchir ${signalSourceLabel(found[1]).toLowerCase()}`
      };
    }
    if (text.includes('clubelo')) {
      return { mode: 'full', source: 'all', label: 'Refresh complet' };
    }
    return { mode: 'quick', source: 'all', label: 'Rafraîchir maintenant' };
  }

  function renderQualityAlerts(status) {
    const wrap = $('#quality-alert-grid');
    if (!wrap) return;
    const alerts = prioritizedQualityAlerts(status);
    if (!alerts.length) {
      wrap.innerHTML = '<div class="empty">Aucune alerte dans ce filtre.</div>';
      return;
    }
    wrap.innerHTML = alerts.map((alert) => {
      const action = qualityRefreshAction(alert);
      return `
      <article class="quality-alert quality-${alert.tone}">
        <div class="quality-alert-meta">
          <span>${escapeHtml(alert.tone === 'danger' ? 'Priorité haute' : alert.tone === 'warn' ? 'À surveiller' : 'OK')}</span>
          <span>${escapeHtml(qualityCategoryLabel(alert.category))}</span>
        </div>
        <strong>${escapeHtml(alert.title)}</strong>
        <p>${escapeHtml(alert.detail)}</p>
        <small>${escapeHtml(alert.action)}</small>
        ${action ? `
          <div class="quality-alert-actions">
            <button
              class="quality-action-btn"
              data-quality-mode="${escapeHtml(action.mode)}"
              data-quality-source="${escapeHtml(action.source)}"
            >${escapeHtml(action.label)}</button>
          </div>
        ` : ''}
      </article>
    `;
    }).join('');
  }

  function renderWarnings(status) {
    const wrap = $('#warnings');
    if (!wrap) return;
    const warnings = status.warnings || [];
    const checks = status.health && status.health.qualityChecks ? status.health.qualityChecks : {};
    const exactPct = Number(checks.winamax_exact_ratio);
    const detailedPct = Number(checks.winamax_detailed_ratio);
    const analyzedCount = state.matches.length || status.counts.bookable;
    const lines = [];
    lines.push(`Actionnable : ${analyzedCount} matchs analysés par le logiciel.`);
    if (status.counts.bookable && status.counts.bookable !== analyzedCount) {
      lines.push(`Source brute : ${status.counts.bookable} événements Winamax exacts avant dédoublonnage/filtre moteur.`);
    } else if (Number.isFinite(exactPct)) {
      lines.push(`Source brute : ${(exactPct * 100).toFixed(0)}% Winamax exact.`);
    }
    if (Number.isFinite(detailedPct)) {
      lines.push(`Marchés détaillés : ${(detailedPct * 100).toFixed(0)}% des matchs à venir.`);
    }
    if (state.coverage && state.coverage.football) {
      lines.push(`Signaux foot attachés : météo ${state.coverage.weather}/${state.coverage.football}, arbitres ${state.coverage.refereeUsable}/${state.coverage.football}, lineups exacts ${state.coverage.lineupsExact || 0}/${state.coverage.football}, profils lineups ${state.coverage.lineupProfiles || 0}/${state.coverage.football}, blessures ${state.coverage.injuries}/${state.coverage.football}.`);
    }
    if (warnings.length) {
      lines.push('');
      lines.push('Signaux secondaires à surveiller (ils n\'annulent pas les picks Winamax, mais réduisent la confiance de lecture) :');
      warnings.slice(0, 8).forEach((warning) => lines.push(`- ${warning}`));
    } else {
      lines.push('');
      lines.push('Aucun avertissement santé remonté.');
    }
    wrap.textContent = lines.join('\n');
  }

  async function refreshStatus() {
    try {
      const status = await fetchJson('/api/data-status');
      renderStatus(status);
      return status;
    } catch (error) {
      setSideStatus('API locale indisponible', 'danger');
      $('#stale-banner').classList.remove('hidden');
      $('#stale-banner').textContent = `Impossible de lire les données locales : ${error.message}`;
      throw error;
    }
  }

  async function refreshLog() {
    const status = await fetchJson('/api/refresh/status');
    const lines = status.lines && status.lines.length ? status.lines : [];
    const autoLine = autoPrematchLastLabel();
    const autoCriticalLine = autoCriticalLastLabel();
    $('#refresh-log').textContent = [autoLine, autoCriticalLine, ...lines].filter(Boolean).join('\n') || 'Aucun refresh lancé depuis l\'ouverture.';
    const running = Boolean(status.running);
    renderRefreshEta(status);
    const isSignals = status.mode === 'signals';
    const isPrematch = status.mode === 'prematch';
    const isPrematchT60 = status.mode === 'prematch_t60';
    const isPrematchT30 = status.mode === 'prematch_t30';
    const isPrematchT10 = status.mode === 'prematch_t10';
    const isCritical = status.mode === 'critical';
    const isRepairContext = status.mode === 'repair_context';
    const sourceLabel = signalSourceLabel(status.source || 'all');
    const sourceSelect = $('#refresh-signal-source');
    $('#refresh-btn').disabled = running;
    if ($('#refresh-full-btn')) $('#refresh-full-btn').disabled = running;
    $('#refresh-signals-btn').disabled = running;
    $('#refresh-prematch-btn').disabled = running;
    $('#refresh-prematch-t60-btn').disabled = running;
    $('#refresh-prematch-t30-btn').disabled = running;
    if ($('#refresh-prematch-t10-btn')) $('#refresh-prematch-t10-btn').disabled = running;
    updateFirstActionButton(running);
    if (sourceSelect) sourceSelect.disabled = running;
    $$('.quality-action-btn').forEach((button) => {
      button.disabled = running;
    });
    $('#refresh-btn').textContent = running && !isSignals ? 'Refresh en cours' : 'Rafraîchir';
    if ($('#refresh-full-btn')) $('#refresh-full-btn').textContent = running && status.mode === 'full' ? 'Complet en cours' : 'Refresh complet';
    $('#refresh-signals-btn').textContent = running && isSignals ? `${sourceLabel} en cours` : 'Signaux lents';
    $('#refresh-prematch-btn').textContent = running && isPrematch ? 'Pré-match en cours' : 'Pré-match final';
    $('#refresh-prematch-t60-btn').textContent = running && isPrematchT60 ? 'T-60 en cours' : 'T-60';
    $('#refresh-prematch-t30-btn').textContent = running && isPrematchT30 ? 'T-30 en cours' : 'T-30';
    if ($('#refresh-prematch-t10-btn')) $('#refresh-prematch-t10-btn').textContent = running && isPrematchT10 ? 'T-10 en cours' : 'T-10';
    if (state.status) {
      state.status.refresh = status;
      renderRefreshSummary(state.status);
      renderPipelinePanel(state.status);
    }
    return status;
  }

  async function startRefresh(mode = 'quick', requestedSource = null) {
    const source = mode === 'signals' ? (requestedSource || $('#refresh-signal-source')?.value || 'all') : 'all';
    const actionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const actionRecord = {
      id: actionId,
      mode,
      source,
      label: actionLaunchLabel(mode, source),
      startedAt: new Date().toISOString(),
      status: 'started'
    };
    renderRefreshEta({
      running: true,
      mode,
      source,
      startedAt: actionRecord.startedAt,
      lastByMode: state.status?.refresh?.lastByMode || {},
      history: state.status?.refresh?.history || []
    });
    $('#refresh-btn').disabled = true;
    if ($('#refresh-full-btn')) $('#refresh-full-btn').disabled = true;
    $('#refresh-signals-btn').disabled = true;
    $('#refresh-prematch-btn').disabled = true;
    $('#refresh-prematch-t60-btn').disabled = true;
    $('#refresh-prematch-t30-btn').disabled = true;
    if ($('#refresh-prematch-t10-btn')) $('#refresh-prematch-t10-btn').disabled = true;
    $('#refresh-repair-context-btn').disabled = true;
    $('#refresh-critical-btn').disabled = true;
    if ($('#prepare-smart-btn')) $('#prepare-smart-btn').disabled = true;
    if ($('#smart-prepare-run-btn')) $('#smart-prepare-run-btn').disabled = true;
    if ($('#prematch-final-run-btn')) $('#prematch-final-run-btn').disabled = true;
    if ($('#prematch-t10-run-btn')) $('#prematch-t10-run-btn').disabled = true;
    updateFirstActionButton(true);
    const sourceSelect = $('#refresh-signal-source');
    if (sourceSelect) sourceSelect.disabled = true;
    $$('.source-refresh-btn, .prematch-plan-btn').forEach((button) => {
      button.disabled = true;
    });
    $$('.quality-action-btn').forEach((button) => {
      button.disabled = true;
    });
    $('#refresh-btn').textContent = mode === 'signals' ? 'Rafraîchir' : 'Refresh en cours';
    if ($('#refresh-full-btn')) $('#refresh-full-btn').textContent = mode === 'full' ? 'Complet en cours' : 'Refresh complet';
    $('#refresh-signals-btn').textContent = mode === 'signals' ? `${signalSourceLabel(source)} en cours` : 'Signaux lents';
    $('#refresh-prematch-btn').textContent = mode === 'prematch' ? 'Pré-match en cours' : 'Pré-match final';
    $('#refresh-prematch-t60-btn').textContent = mode === 'prematch_t60' ? 'T-60 en cours' : 'T-60';
    $('#refresh-prematch-t30-btn').textContent = mode === 'prematch_t30' ? 'T-30 en cours' : 'T-30';
    if ($('#refresh-prematch-t10-btn')) $('#refresh-prematch-t10-btn').textContent = mode === 'prematch_t10' ? 'T-10 en cours' : 'T-10';
    const params = new URLSearchParams({ mode });
    if (mode === 'signals') params.set('source', source);
    try {
      await fetchJson(`/api/refresh/start?${params.toString()}`, { method: 'POST' });
      recordActionHistory(actionRecord);
    } catch (error) {
      renderRefreshEta(null);
      $('#refresh-btn').disabled = false;
      if ($('#refresh-full-btn')) $('#refresh-full-btn').disabled = false;
      $('#refresh-signals-btn').disabled = false;
      $('#refresh-prematch-btn').disabled = false;
      $('#refresh-prematch-t60-btn').disabled = false;
      $('#refresh-prematch-t30-btn').disabled = false;
      if ($('#refresh-prematch-t10-btn')) $('#refresh-prematch-t10-btn').disabled = false;
      $('#refresh-repair-context-btn').disabled = false;
      $('#refresh-critical-btn').disabled = false;
      if ($('#prepare-smart-btn')) $('#prepare-smart-btn').disabled = false;
      if ($('#smart-prepare-run-btn')) $('#smart-prepare-run-btn').disabled = false;
      if ($('#prematch-final-run-btn')) $('#prematch-final-run-btn').disabled = false;
      if ($('#prematch-t10-run-btn')) $('#prematch-t10-run-btn').disabled = false;
      if (sourceSelect) sourceSelect.disabled = false;
      $$('.source-refresh-btn, .prematch-plan-btn').forEach((button) => {
        button.disabled = false;
      });
      $$('.quality-action-btn').forEach((button) => {
        button.disabled = false;
      });
      $('#refresh-btn').textContent = 'Rafraîchir';
      if ($('#refresh-full-btn')) $('#refresh-full-btn').textContent = 'Refresh complet';
      $('#refresh-signals-btn').textContent = 'Signaux lents';
      $('#refresh-prematch-btn').textContent = 'Pré-match final';
      $('#refresh-prematch-t60-btn').textContent = 'T-60';
      $('#refresh-prematch-t30-btn').textContent = 'T-30';
      if ($('#refresh-prematch-t10-btn')) $('#refresh-prematch-t10-btn').textContent = 'T-10';
      $('#refresh-repair-context-btn').textContent = 'Réparer contexte';
      $('#refresh-critical-btn').textContent = 'File critique';
      if ($('#prepare-smart-btn')) $('#prepare-smart-btn').textContent = 'Préparer mes paris';
      if ($('#smart-prepare-run-btn')) $('#smart-prepare-run-btn').textContent = smartPrepareAction().label || 'Préparer maintenant';
      if ($('#prematch-final-run-btn')) $('#prematch-final-run-btn').textContent = 'Lancer pré-match final';
      if ($('#prematch-t10-run-btn')) $('#prematch-t10-run-btn').textContent = 'Ticket T-10';
      updateFirstActionButton(false);
      recordActionHistory({
        ...actionRecord,
        finishedAt: new Date().toISOString(),
        status: 'failed',
        error: error.message
      });
      throw error;
    }
    clearInterval(state.refreshTimer);
    state.refreshTimer = setInterval(async () => {
      const current = await refreshLog();
      if (!current.running) {
        clearInterval(state.refreshTimer);
        renderRefreshEta(null);
        if (mode === 'prematch') {
          const last = readAutoPrematchLast();
          if (last && last.status === 'started') {
            writeAutoPrematchLast({
              ...last,
              finishedAt: current.finishedAt || new Date().toISOString(),
              status: current.exitCode === 0 && !current.error ? 'ok' : 'failed',
              exitCode: current.exitCode,
              error: current.error || null
            });
            renderWatchlist();
          }
        }
        if (mode === 'critical') {
          const last = readAutoCriticalLast();
          if (last && last.status === 'started') {
            writeAutoCriticalLast({
              ...last,
              finishedAt: current.finishedAt || new Date().toISOString(),
              status: current.exitCode === 0 && !current.error ? 'ok' : 'failed',
              exitCode: current.exitCode,
              error: current.error || null
            });
            renderPrebetChecklist();
          }
        }
        $$('.source-refresh-btn, .prematch-plan-btn').forEach((button) => {
          button.disabled = false;
        });
        $$('.quality-action-btn').forEach((button) => {
          button.disabled = false;
        });
        updateFirstActionButton(false);
        updateActionHistory(actionId, {
          finishedAt: current.finishedAt || new Date().toISOString(),
          status: current.exitCode === 0 && !current.error ? 'ok' : 'failed',
          exitCode: current.exitCode,
          error: current.error || null
        });
        await refreshStatus();
        if (current.exitCode === 0 && !current.error) {
          await reloadEngine();
        } else {
          setSideStatus('Refresh terminé avec erreur', 'warn');
          renderPicks('Refresh terminé avec erreur : les dernières données valides restent affichées.');
        }
      }
    }, 1000);
    await refreshLog();
  }

  async function reloadEngine() {
    state.engineReady = false;
    state.picks = [];
    renderPicks('Recalcul en cours...');
    renderStakeScenarios('Scénarios recalculés après le moteur.');
    try {
      await fetchJson('/api/engine/reload', { method: 'POST' });
      await computePicks();
      setSideStatus('Calcul prêt', 'ok');
    } catch (error) {
      setSideStatus('Calcul indisponible', 'danger');
      renderPicks(`Calcul non disponible : ${error.message}`);
    }
  }

  function switchTab(tab) {
    $$('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
    $$('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === tab));
    const titles = {
      dashboard: 'Accueil',
      combines: 'Combinés',
      scorers: 'Buteurs',
      matches: 'Tous les matchs',
      history: 'Historique',
      agent: 'Agent',
      data: 'Données',
      calendar: 'Calendrier',
      pipeline: 'Pipeline',
      help: 'Aide',
      preferences: 'Préférences'
    };
    $('#page-title').textContent = titles[tab] || 'Paris-Sportif';
    if (tab === 'calendar') renderCalendar();
    if (tab === 'pipeline') renderPipelinePanel(state.status);
    if (tab === 'help') renderHelp();
  }

  function exportCsv() {
    if (!state.picks.length) return;
    const headers = ['match', 'sport', 'league', 'market', 'pick', 'decision_status', 'can_bet', 'reason', 'odd', 'probability', 'edge', 'stake', 'stake_adjusted', 'stake_factor', 'start', 'winamax'];
    const rows = state.picks.map((pick) => [
      pick.title,
      pick.sport,
      pick.league,
      pick.market,
      pick.label,
      pick.decisionCenter?.status || pick.status || '',
      pick.decisionCenter?.canBet ? 'yes' : 'no',
      pick.decisionCenter?.mainReason || '',
      pick.odd.toFixed(2),
      pick.probability.toFixed(4),
      pick.edge.toFixed(4),
      displayStakeAmount(pick).toFixed(2),
      pick.stakeAdjustment?.applied ? 'yes' : 'no',
      pick.stakeAdjustment?.applied ? Number(pick.stakeAdjustment.factor || 1).toFixed(2) : '1.00',
      pick.start,
      pick.winamaxUrl || ''
    ]);
    downloadText(`paris-sportif-desktop-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows), 'text/csv;charset=utf-8');
  }

  function exportUserBetsCsv() {
    const bets = loadUserBets();
    const headers = ['created_at', 'match', 'sport', 'league', 'market', 'pick', 'odd', 'last_seen_odd', 'closing_odd', 'clv_pct', 'probability', 'edge', 'edge_bucket', 'stake_mode', 'stake', 'status', 'tags', 'note', 'pnl'];
    const rows = bets.map((bet) => [
      bet.createdAt || '',
      bet.title || '',
      bet.sport || '',
      bet.league || '',
      bet.market || '',
      bet.label || '',
      Number(bet.odd || 0).toFixed(2),
      bet.lastSeenOdd ? Number(bet.lastSeenOdd).toFixed(2) : '',
      bet.closingOdd ? Number(bet.closingOdd).toFixed(2) : '',
      bet.clvPct != null ? Number(bet.clvPct).toFixed(4) : '',
      Number(bet.probability || 0).toFixed(4),
      Number(bet.edge || 0).toFixed(4),
      bet.edgeBucket || '',
      bet.stakeMode || '',
      Number(bet.stake || 0).toFixed(2),
      bet.status || '',
      Array.isArray(bet.tags) ? bet.tags.join('|') : '',
      bet.note || '',
      Number(bet.pnl || 0).toFixed(2)
    ]);
    if (!rows.length) rows.push(['', 'Aucun pari suivi', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    downloadText(`paris-sportif-paris-suivis-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows), 'text/csv;charset=utf-8');
  }

  function exportPrebetChecklistCsv() {
    const report = state.prebetChecklist || {};
    const rows = Array.isArray(report.items) ? report.items : [];
    const headers = ['priority', 'area', 'title', 'detail', 'action', 'mode', 'source', 'blocks_bet'];
    const csvRows = rows.length ? rows.map((row) => [
      row.priority || '',
      row.area || '',
      row.title || '',
      row.detail || '',
      row.action || '',
      row.mode || '',
      row.source || '',
      row.blocks_bet ? 'yes' : 'no'
    ]) : [[
      'ok',
      'checklist',
      report.summary?.first || 'Checklist verte',
      'Aucun item bloquant dans le dernier rapport local.',
      '',
      '',
      '',
      'no'
    ]];
    downloadText(`paris-sportif-checklist-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, csvRows), 'text/csv;charset=utf-8');
  }

  function exportStakeScenariosCsv() {
    const picks = state.picks.filter((pick) => canDisplayStake(pick) && Number(pick.edge || 0) > 0);
    if (!picks.length) return;
    const bankroll = getBankroll();
    const plans = stakeScenarioProfiles().map((profile) => stakeScenarioPlan(bankroll, picks, profile));
    const stakeByPick = new Map();
    plans.forEach((plan) => {
      plan.rows.forEach((row) => {
        if (!stakeByPick.has(row.pick.id)) stakeByPick.set(row.pick.id, {});
        stakeByPick.get(row.pick.id)[plan.profile.key] = row.stake;
      });
    });
    const headers = ['match', 'sport', 'league', 'market', 'pick', 'odd', 'probability', 'edge', 'stake_prudent', 'stake_normal', 'stake_agressif', 'start', 'winamax'];
    const rows = picks.map((pick) => {
      const stakes = stakeByPick.get(pick.id) || {};
      return [
        pick.title,
        pick.sport,
        pick.league,
        pick.market,
        pick.label,
        Number(pick.odd || 0).toFixed(2),
        Number(pick.probability || 0).toFixed(4),
        Number(pick.edge || 0).toFixed(4),
        Number(stakes.prudent || 0).toFixed(2),
        Number(stakes.normal || 0).toFixed(2),
        Number(stakes.agressif || 0).toFixed(2),
        pick.start,
        pick.winamaxUrl || ''
      ];
    });
    downloadText(
      `paris-sportif-scenarios-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(headers, rows),
      'text/csv;charset=utf-8'
    );
  }

  function exportScorersCsv() {
    const rows = Array.isArray(state.scorers) ? state.scorers : [];
    if (!rows.length) return;
    const headers = [
      'player',
      'team',
      'position',
      'match',
      'league',
      'probability',
      'raw_probability',
      'fair_odd',
      'player_score',
      'player_gate',
      'lineup_status',
      'player_market',
      'injured',
      'reasons',
      'start',
      'winamax'
    ];
    const csvRows = rows.map((scorer) => {
      const quality = scorer.playerQuality || {};
      return [
        scorer.name || '',
        scorer.teamName || '',
        scorer.position || '',
        scorer.title || '',
        scorer.league || '',
        Number(scorer.probability || 0).toFixed(4),
        Number(scorer.rawProbability || scorer.probability || 0).toFixed(4),
        Number(scorer.impliedOdd || 0).toFixed(2),
        Number.isFinite(Number(quality.score)) ? Number(quality.score).toFixed(0) : '',
        quality.gate || '',
        quality.lineupStatus || '',
        quality.playerMarket ? 'yes' : 'no',
        quality.injured ? 'yes' : 'no',
        Array.isArray(quality.reasons) ? quality.reasons.join('|') : '',
        scorer.start || '',
        scorer.winamaxUrl || ''
      ];
    });
    downloadText(`paris-sportif-buteurs-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, csvRows), 'text/csv;charset=utf-8');
  }

  function contextExportRows() {
    const sourceRows = state.picks.length ? state.picks : (state.allPicks.length ? state.allPicks : state.matches);
    return sourceRows
      .map((row) => {
        const context = row?.match?.context || null;
        const quality = row?.contextQuality || context?.quality || {};
        const gate = row?.contextGate || {};
        return {
          id: row.id || row.match?.id || row.match?.winamax?.match_id || '',
          title: row.title || context?.match?.title || '-',
          sport: row.sport || row.match?.sport || '',
          league: row.league || row.match?.league_code || '',
          market: row.market || '',
          pick: row.label || '',
          odd: Number(row.odd || 0),
          probability: Number(row.probability || 0),
          edge: Number(row.edge || 0),
          stake: displayStakeAmount(row),
          modelStake: Number(row.stake || 0),
          status: row.status || '',
          gate: gate.gate || quality.gate || '',
          gateLabel: gate.label || contextGateText(row),
          agentEligible: gate.agentEligible !== false && quality.agent_eligible !== false,
          contextScore: Number(quality.score),
          trustScore: Number(row?.confidenceTrust?.score),
          trustLevel: row?.confidenceTrust?.level || '',
          marketTiming: row?.marketTiming || null,
          oddsGuardrail: row?.oddsGuardrail || null,
          stakeAdjustment: row?.stakeAdjustment || null,
          level: quality.level || '',
          missing: Array.isArray(quality.missing) ? quality.missing.join('|') : '',
          criticalMissing: Array.isArray(quality.critical_missing) ? quality.critical_missing.join('|') : '',
          stale: Array.isArray(quality.stale) ? quality.stale.join('|') : '',
          start: row.start || row.match?.date || '',
          winamaxUrl: row.winamaxUrl || row.match?.winamax?.url || '',
          context
        };
      })
      .filter((row) => row.context || Number.isFinite(row.contextScore));
  }

  function exportContextJson() {
    const rows = contextExportRows();
    const payload = {
      exportedAt: new Date().toISOString(),
      generatedAt: state.status?.generatedAt || null,
      contextSummary: state.contextSummary || null,
      signalGaps: state.signalGaps || [],
      picks: rows.map((row) => ({
        id: row.id,
        title: row.title,
        sport: row.sport,
        league: row.league,
        market: row.market,
        pick: row.pick,
        status: row.status,
        gate: row.gate,
        agentEligible: row.agentEligible,
        contextScore: Number.isFinite(row.contextScore) ? row.contextScore : null,
        trustScore: Number.isFinite(row.trustScore) ? row.trustScore : null,
        trustLevel: row.trustLevel,
        marketTiming: row.marketTiming,
        oddsGuardrail: row.oddsGuardrail,
        stakeAdjustment: row.stakeAdjustment,
        missing: row.missing,
        criticalMissing: row.criticalMissing,
        stale: row.stale,
        start: row.start,
        winamaxUrl: row.winamaxUrl,
        context: row.context
      }))
    };
    downloadText(
      `paris-sportif-contextes-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8'
    );
  }

  function exportContextCsv() {
    const rows = contextExportRows();
    const headers = [
      'match',
      'sport',
      'league',
      'market',
      'pick',
      'odd',
      'probability',
      'edge',
      'stake',
      'status',
      'context_score',
      'trust_score',
      'trust_level',
      'market_timing',
      'market_warnings',
      'clv_pct',
      'odds_guard',
      'odds_guard_warnings',
      'stake_adjusted',
      'stake_factor',
      'context_gate',
      'agent_eligible',
      'missing',
      'critical_missing',
      'stale',
      'start',
      'winamax'
    ];
    const csvRows = rows.map((row) => [
      row.title,
      row.sport,
      row.league,
      row.market,
      row.pick,
      row.odd ? row.odd.toFixed(2) : '',
      row.probability ? row.probability.toFixed(4) : '',
      row.edge ? row.edge.toFixed(4) : '',
      row.stake ? row.stake.toFixed(2) : '0.00',
      row.status,
      Number.isFinite(row.contextScore) ? row.contextScore.toFixed(0) : '',
      Number.isFinite(row.trustScore) ? row.trustScore.toFixed(0) : '',
      row.trustLevel,
      row.marketTiming?.tone || '',
      Array.isArray(row.marketTiming?.warnings) ? row.marketTiming.warnings.join('|') : '',
      row.marketTiming?.meanClvPct != null ? Number(row.marketTiming.meanClvPct).toFixed(2) : '',
      row.oddsGuardrail?.tone || '',
      Array.isArray(row.oddsGuardrail?.warnings) ? row.oddsGuardrail.warnings.join('|') : '',
      row.stakeAdjustment?.applied ? 'yes' : 'no',
      row.stakeAdjustment?.applied ? Number(row.stakeAdjustment.factor || 1).toFixed(2) : '1.00',
      row.gate,
      row.agentEligible ? 'yes' : 'no',
      row.missing,
      row.criticalMissing,
      row.stale,
      row.start,
      row.winamaxUrl
    ]);
    downloadText(`paris-sportif-picks-contexte-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, csvRows), 'text/csv;charset=utf-8');
  }

  function exportContextBacktestJson() {
    const report = state.contextBacktest || null;
    downloadText(
      `paris-sportif-backtest-contexte-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ exportedAt: new Date().toISOString(), contextBacktest: report }, null, 2),
      'application/json;charset=utf-8'
    );
  }

  function exportContextBacktestCsv() {
    const report = state.contextBacktest || {};
    const tiers = Array.isArray(report.byContextTier) ? report.byContextTier : [];
    const markets = Array.isArray(report.byMarket) ? report.byMarket : [];
    const headers = ['type', 'key', 'count', 'won', 'lost', 'win_rate', 'roi', 'brier', 'avg_prob', 'avg_odd', 'avg_edge', 'avg_context_score', 'sample_level'];
    const normalize = (type, row) => [
      type,
      row.key || '',
      row.count || 0,
      row.won || 0,
      row.lost || 0,
      Number(row.win_rate || 0).toFixed(4),
      Number(row.roi || 0).toFixed(4),
      Number(row.brier || 0).toFixed(4),
      Number(row.avg_prob || 0).toFixed(4),
      Number(row.avg_odd || 0).toFixed(3),
      Number(row.avg_edge || 0).toFixed(4),
      Number(row.avg_context_score || 0).toFixed(1),
      row.sample_level || ''
    ];
    const rows = [
      ...tiers.map((row) => normalize('context_tier', row)),
      ...markets.map((row) => normalize('market', row))
    ];
    downloadText(`paris-sportif-backtest-contexte-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows), 'text/csv;charset=utf-8');
  }

  function exportDecisionBacktestJson() {
    const report = state.decisionBacktest || null;
    downloadText(
      `paris-sportif-backtest-decision-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ exportedAt: new Date().toISOString(), decisionBacktest: report }, null, 2),
      'application/json;charset=utf-8'
    );
  }

  function exportDecisionBacktestCsv() {
    const report = state.decisionBacktest || {};
    const decisions = Array.isArray(report.byDecision) ? report.byDecision : [];
    const reasons = Array.isArray(report.byReason) ? report.byReason : [];
    const markets = Array.isArray(report.byDecisionMarket) ? report.byDecisionMarket : [];
    const headers = ['type', 'key', 'count', 'won', 'lost', 'win_rate', 'roi', 'brier', 'avg_prob', 'avg_odd', 'avg_edge', 'avg_context_score', 'avg_trust_score', 'sample_level'];
    const normalize = (type, row) => [
      type,
      row.key || '',
      row.count || 0,
      row.won || 0,
      row.lost || 0,
      Number(row.win_rate || 0).toFixed(4),
      Number(row.roi || 0).toFixed(4),
      Number(row.brier || 0).toFixed(4),
      Number(row.avg_prob || 0).toFixed(4),
      Number(row.avg_odd || 0).toFixed(3),
      Number(row.avg_edge || 0).toFixed(4),
      Number(row.avg_context_score || 0).toFixed(1),
      Number(row.avg_trust_score || 0).toFixed(1),
      row.sample_level || ''
    ];
    const rows = [
      ...decisions.map((row) => normalize('decision', row)),
      ...reasons.map((row) => normalize('reason', row)),
      ...markets.map((row) => normalize('decision_market', row))
    ];
    downloadText(`paris-sportif-backtest-decision-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows), 'text/csv;charset=utf-8');
  }

  function exportWatchlistCsv() {
    const rows = Array.isArray(state.watchlist) ? state.watchlist : [];
    if (!rows.length) return;
    const headers = [
      'match',
      'sport',
      'league',
      'market',
      'pick',
      'odd',
      'probability',
      'edge',
      'status',
      'context_score',
      'context_tier',
      'trust_score',
      'market_timing',
      'market_warnings',
      'odds_guard',
      'odds_guard_warnings',
      'action',
      'auto_prematch_due',
      'minutes_to_kickoff',
      'reasons',
      'start',
      'winamax'
    ];
    const csvRows = rows.map((row) => [
      row.title || '',
      row.sport || '',
      row.league || '',
      row.market || '',
      row.label || '',
      Number(row.odd || 0).toFixed(2),
      Number(row.probability || 0).toFixed(4),
      Number(row.edge || 0).toFixed(4),
      row.status || '',
      Number.isFinite(Number(row.contextScore)) ? Number(row.contextScore).toFixed(0) : '',
      row.contextTier || '',
      Number.isFinite(Number(row.trustScore)) ? Number(row.trustScore).toFixed(0) : '',
      row.marketTiming?.tone || '',
      Array.isArray(row.marketTiming?.warnings) ? row.marketTiming.warnings.join('|') : '',
      row.oddsGuardrail?.tone || '',
      Array.isArray(row.oddsGuardrail?.warnings) ? row.oddsGuardrail.warnings.join('|') : '',
      row.action || '',
      row.autoRefreshDue ? 'yes' : 'no',
      row.minutesToKickoff ?? '',
      Array.isArray(row.reasons) ? row.reasons.join('|') : '',
      row.start || '',
      row.winamaxUrl || ''
    ]);
    downloadText(`paris-sportif-watchlist-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, csvRows), 'text/csv;charset=utf-8');
  }

  function exportSignalGapsCsv() {
    const gaps = Array.isArray(state.signalGaps) ? state.signalGaps : [];
    const headers = ['source', 'status', 'critical', 'match', 'sport', 'league', 'quality_score', 'age_min', 'detail', 'refresh_hint'];
    const rows = gaps.map((gap) => [
      gap.source || '',
      gap.status || '',
      gap.critical ? 'yes' : 'no',
      gap.title || gap.match_id || '',
      gap.sport || '',
      gap.league_code || '',
      gap.quality_score ?? '',
      gap.age_min ?? '',
      gap.detail || '',
      gap.refresh_hint || ''
    ]);
    downloadText(`paris-sportif-signaux-manquants-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows), 'text/csv;charset=utf-8');
  }

  function exportFilterBacktestCsv() {
    const filters = currentMatchFilters();
    const filteredMatches = filteredMatchRows(filters);
    const aggregate = aggregateCalibrationBuckets(filteredMatches, filters);
    const bucketRows = calibrationBucketsForRows(filteredMatches, filters)
      .map(({ scope, bucket }) => ({
        scope,
        key: bucket.key,
        count: Number(bucket.count || 0),
        won: Number(bucket.won || 0),
        lost: Number(bucket.lost || 0),
        winRate: Number(bucket.winRate || 0),
        avgOdd: Number(bucket.avgOdd || 0),
        avgImplied: Number(bucket.avgImplied || 0),
        avgEdge: Number(bucket.avgEdge || 0),
        roi: Number(bucket.roi || 0),
        level: bucket.level || 'unknown'
      }))
      .filter((row) => row.count > 0);
    if (!filteredMatches.length && !bucketRows.length) return;
    const headers = ['type', 'filter', 'scope', 'key', 'matches', 'buckets', 'count', 'won', 'lost', 'win_rate', 'avg_odd', 'avg_implied', 'avg_edge', 'roi', 'level'];
    const summary = [
      'summary',
      activeFilterLabel(filters),
      'filter',
      'current',
      filteredMatches.length,
      aggregate ? aggregate.buckets : 0,
      aggregate ? aggregate.count : 0,
      '',
      '',
      aggregate ? aggregate.winRate.toFixed(4) : '',
      aggregate ? aggregate.avgOdd.toFixed(4) : '',
      aggregate ? aggregate.avgImplied.toFixed(4) : '',
      '',
      aggregate ? aggregate.roi.toFixed(4) : '',
      ''
    ];
    const rows = bucketRows.map((row) => [
      'bucket',
      activeFilterLabel(filters),
      row.scope,
      row.key,
      filteredMatches.length,
      '',
      row.count,
      row.won,
      row.lost,
      row.winRate.toFixed(4),
      row.avgOdd.toFixed(4),
      row.avgImplied.toFixed(4),
      row.avgEdge.toFixed(4),
      row.roi.toFixed(4),
      row.level
    ]);
    downloadText(
      `paris-sportif-backtest-filtre-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(headers, [summary, ...rows]),
      'text/csv;charset=utf-8'
    );
  }

  function toCsv(headers, rows) {
    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  function downloadText(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    showExportStatus(filename, type);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function downloadStaticCsv(pathname, filename) {
    const response = await fetch(pathname, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Export indisponible (${response.status})`);
    const content = await response.text();
    downloadText(filename, content, 'text/csv;charset=utf-8');
  }

  function exportKindFromType(type) {
    if (String(type || '').includes('json')) return 'JSON';
    if (String(type || '').includes('csv')) return 'CSV';
    return 'Fichier';
  }

  function showExportStatus(filename, type) {
    const toast = $('#export-toast');
    if (!toast) return;
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    toast.innerHTML = `
      <strong>Export ${escapeHtml(exportKindFromType(type))} généré</strong>
      <span>${escapeHtml(filename)} · ${escapeHtml(now)}</span>
    `;
    toast.classList.remove('hidden');
    clearTimeout(state.exportTimer);
    state.exportTimer = setTimeout(() => toast.classList.add('hidden'), 5000);
  }

  function agentExportRows() {
    const agent = state.agent || {};
    const active = Array.isArray(agent.positions) ? agent.positions.map((pos) => ({ state: 'active', ...pos })) : [];
    const blocked = Array.isArray(agent.blockedPositions) ? agent.blockedPositions.map((pos) => ({ state: 'blocked', ...pos, stake: 0 })) : [];
    const diagnostic = Array.isArray(state.agentBlockers?.rows)
      ? state.agentBlockers.rows.map((pos) => ({ state: 'diagnostic_blocked', ...pos, stake: 0 }))
      : [];
    return [...active, ...blocked, ...diagnostic];
  }

  function exportAgentJson() {
    if (!state.agent) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      generatedAt: state.status?.generatedAt || null,
      guard: state.agent.guard || null,
      nav: state.agent.nav,
      delta7: state.agent.delta7,
      deltaPct7: state.agent.deltaPct7,
      drawdown: state.agent.drawdown || null,
      exposure: state.agent.exposure || null,
      blockedExposure: state.agent.blockedExposure || null,
      positions: Array.isArray(state.agent.positions) ? state.agent.positions : [],
      blockedPositions: Array.isArray(state.agent.blockedPositions) ? state.agent.blockedPositions : [],
      agentBlockers: state.agentBlockers || null,
      agentBlockerBacktest: state.agentBlockerBacktest || null,
      agentGuardrailRecommendations: state.agentGuardrailRecommendations || null
    };
    downloadText(
      `paris-sportif-agent-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8'
    );
  }

  function exportAgentCsv() {
    const rows = agentExportRows();
    if (!rows.length) return;
    const headers = ['state', 'match', 'sport', 'league', 'market', 'pick', 'odd', 'probability', 'edge', 'stake', 'kelly', 'reason', 'day', 'start', 'winamax'];
    const csvRows = rows.map((pos) => [
      pos.state,
      pos.title,
      pos.sport,
      pos.league,
      pos.market,
      pos.label,
      Number(pos.odd || 0).toFixed(2),
      Number(pos.probability || 0).toFixed(4),
      Number(pos.edge || 0).toFixed(4),
      Number(pos.stake || 0).toFixed(2),
      Number(pos.kelly || 0).toFixed(4),
      pos.reason || pos.reasonKey || '',
      pos.day || formatDayKey(pos.start),
      pos.start,
      pos.winamaxUrl || ''
    ]);
    downloadText(`paris-sportif-agent-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, csvRows), 'text/csv;charset=utf-8');
  }

  function calibrationExportRows() {
    const calibration = state.calibration || state.history?.calibration || {};
    const rows = [];
    const addRows = (scope, values) => {
      Object.values(values || {}).forEach((bucket) => {
        rows.push({
          scope,
          key: bucket.key,
          count: bucket.count,
          won: bucket.won,
          lost: bucket.lost,
          winRate: bucket.winRate,
          avgOdd: bucket.avgOdd,
          avgProb: bucket.avgProb,
          avgImplied: bucket.avgImplied,
          avgEdge: bucket.avgEdge,
          roi: bucket.roi,
          level: bucket.level
        });
      });
    };
    if (calibration.overall) rows.push({ scope: 'overall', ...calibration.overall });
    addRows('market', calibration.byMarket);
    addRows('context_tier', calibration.byContextTier);
    addRows('market_context', calibration.byMarketContext);
    addRows('sport', calibration.bySport);
    addRows('league', calibration.byLeague);
    addRows('edge_bucket', calibration.byEdgeBucket);
    return rows;
  }

  function exportCalibrationJson() {
    const calibration = state.calibration || state.history?.calibration;
    if (!calibration) return;
    downloadText(
      `paris-sportif-calibration-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ exportedAt: new Date().toISOString(), calibration }, null, 2),
      'application/json;charset=utf-8'
    );
  }

  function exportCalibrationCsv() {
    const rows = calibrationExportRows();
    if (!rows.length) return;
    const headers = ['scope', 'key', 'count', 'won', 'lost', 'win_rate', 'avg_odd', 'avg_prob', 'avg_implied', 'avg_edge', 'roi', 'level'];
    const csvRows = rows.map((row) => [
      row.scope,
      row.key,
      row.count,
      row.won,
      row.lost,
      Number(row.winRate || 0).toFixed(4),
      Number(row.avgOdd || 0).toFixed(4),
      Number(row.avgProb || 0).toFixed(4),
      Number(row.avgImplied || 0).toFixed(4),
      Number(row.avgEdge || 0).toFixed(4),
      Number(row.roi || 0).toFixed(4),
      row.level
    ]);
    downloadText(`paris-sportif-calibration-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, csvRows), 'text/csv;charset=utf-8');
  }

  function exportFullReportJson() {
    const matchFilters = currentMatchFilters();
    const filteredMatches = filteredMatchRows(matchFilters);
    const filteredBacktest = aggregateCalibrationBuckets(filteredMatches, matchFilters);
    const report = {
      exportedAt: new Date().toISOString(),
      app: 'Paris-Sportif Desktop',
      activeFilters: {
        matches: matchFilters,
        label: activeFilterLabel(matchFilters),
        filteredMatches: filteredMatches.length,
        filteredBacktest
      },
      status: state.status || null,
      counts: {
        matches: state.matches.length,
        picks: state.allPicks.length || state.picks.length,
        dashboardPicks: state.picks.length,
        combines: state.combines.length,
        scorers: state.scorers.length,
        agentPositions: Array.isArray(state.agent?.positions) ? state.agent.positions.length : 0,
        blockedAgentPositions: Array.isArray(state.agent?.blockedPositions) ? state.agent.blockedPositions.length : 0
      },
      coverage: state.coverage || null,
      dashboardMeta: state.dashboardMeta || null,
      history: state.history ? {
        generatedAt: state.history.generatedAt,
        total: state.history.total,
        settled: state.history.settled,
        pending: state.history.pending,
        won: state.history.won,
        lost: state.history.lost,
        void: state.history.void,
        winRate: state.history.winRate,
        flatRoi: state.history.flatRoi,
        flatPnlUnits: state.history.flatPnlUnits
      } : null,
      calibration: state.calibration || state.history?.calibration || null,
      contextSummary: state.contextSummary || null,
      signalGaps: state.signalGaps || [],
      contextBacktest: state.contextBacktest || null,
      decisionBacktest: state.decisionBacktest || null,
      decisionTuning: state.decisionTuning || null,
      decisionShadow: state.decisionShadow || null,
      oddsGuardrails: state.oddsGuardrails || null,
      agentBlockerBacktest: state.agentBlockerBacktest || null,
      agentGuardrailRecommendations: state.agentGuardrailRecommendations || null,
      stakeReductionBacktest: state.stakeReductionBacktest || null,
      signalConflictBacktest: state.signalConflictBacktest || null,
      scorerQuality: state.scorerQuality || null,
      scorerCandidates: state.scorerCandidates || null,
      scorerSettlement: state.scorerSettlement || null,
      scorerPendingAudit: state.scorerPendingAudit || null,
      prematchFocus: state.prematchFocus || null,
      prematchExecution: state.prematchExecution || null,
      signalCoverageTrend: state.signalCoverageTrend || null,
      nextActions: state.nextActions || null,
      sourceFreshnessPlan: state.sourceFreshnessPlan || null,
      contextRepairPlan: state.contextRepairPlan || null,
      refreshPriorityPlan: state.refreshPriorityPlan || null,
      prebetChecklist: state.prebetChecklist || null,
      prebetChecklistBacktest: state.prebetChecklistBacktest || null,
      teamIdentityGraph: state.teamIdentityGraph || null,
      matchDecisionTimeline: state.matchDecisionTimeline || null,
      agentBankrollSimulation: state.agentBankrollSimulation || null,
      smartPreparePlan: state.smartPreparePlan || null,
      sourceRegistry: state.sourceRegistry || null,
      sourceQuarantine: state.sourceQuarantine || null,
      optionalSourcesPlan: state.optionalSourcesPlan || null,
      criticalIssueReport: state.criticalIssueReport || null,
      dataConsistencyReport: state.dataConsistencyReport || null,
      uiIntegrityReport: state.uiIntegrityReport || null,
      pickIntegrityReport: state.pickIntegrityReport || null,
      coverageRepairEngine: state.coverageRepairEngine || null,
      sourceCoverageTargets: state.sourceCoverageTargets || null,
      leagueSignalQuality: state.leagueSignalQuality || null,
      modelLab: state.modelLab || null,
      probabilityCalibration: state.probabilityCalibration || null,
      policyCandidates: state.policyCandidates || null,
      sourceHealth: state.sourceHealth || null,
      decisionCenter: state.decisionCenter || null,
      clvSummary: state.clvSummary || null,
      userLearningAudit: readStorageJson(USER_AUDIT_KEY, null),
      bankrollDiscipline: bankrollDisciplineStatus(),
      actionHistory: state.actionHistory || [],
      watchlist: state.watchlist || [],
      prematchPlan: state.prematchPlan || null,
      agentBlockers: state.agentBlockers || null,
      agent: state.agent || null,
      picks: state.picks,
      agentRows: agentExportRows(),
      qualityAlerts: state.status ? buildQualityAlerts(state.status) : []
    };
    downloadText(
      `paris-sportif-rapport-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(report, null, 2),
      'application/json;charset=utf-8'
    );
  }

  function openMatchFromEvent(event) {
    if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
    const focusButton = event.target.closest('[data-focus-pick-key]');
    if (focusButton) {
      event.preventDefault();
      event.stopPropagation();
      if (event.type === 'keydown') return;
      openFocusMode(focusButton.dataset.focusPickKey || '');
      return;
    }
    const trackButton = event.target.closest('[data-track-bet-key]');
    if (trackButton) {
      event.preventDefault();
      event.stopPropagation();
      if (event.type === 'keydown') return;
      const row = findPickByTrackKey(trackButton.dataset.trackBetKey || '');
      trackUserBet(row);
      return;
    }
    const comboButton = event.target.closest('[data-track-combo-key]');
    if (comboButton) {
      event.preventDefault();
      event.stopPropagation();
      if (event.type === 'keydown') return;
      trackUserCombo(findComboByTrackKey(comboButton.dataset.trackComboKey || ''));
      return;
    }
    const scorerButton = event.target.closest('[data-track-scorer-id]');
    if (scorerButton) {
      event.preventDefault();
      event.stopPropagation();
      if (event.type === 'keydown') return;
      trackScorerBet(scorerButton.dataset.trackScorerId || '');
      return;
    }
    if (event.target.closest('button, a, input, select, textarea')) return;
    const row = event.target.closest('[data-match-id]');
    if (!row) return;
    if (event.type === 'keydown') event.preventDefault();
    openMatchDetail(row.dataset.matchId);
  }

  function bindEvents() {
    $$('.nav-btn').forEach((btn) => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    $('#refresh-btn').addEventListener('click', () => startRefresh().catch((error) => {
      setSideStatus('Refresh impossible', 'danger');
      $('#refresh-log').textContent = error.stack || error.message;
    }));
    $('#refresh-full-btn')?.addEventListener('click', () => startRefresh('full').catch((error) => {
      setSideStatus('Refresh complet impossible', 'danger');
      $('#refresh-log').textContent = error.stack || error.message;
    }));
    $('#refresh-signals-btn').addEventListener('click', () => startRefresh('signals').catch((error) => {
      setSideStatus('Refresh signaux impossible', 'danger');
      $('#refresh-log').textContent = error.stack || error.message;
    }));
    $('#refresh-prematch-btn').addEventListener('click', () => startRefresh('prematch').catch((error) => {
      setSideStatus('Pré-match impossible', 'danger');
      $('#refresh-log').textContent = error.stack || error.message;
    }));
    $('#refresh-prematch-t60-btn')?.addEventListener('click', () => startRefresh('prematch_t60').catch((error) => {
      setSideStatus('Pré-match T-60 impossible', 'danger');
      $('#refresh-log').textContent = error.stack || error.message;
    }));
    $('#refresh-prematch-t30-btn')?.addEventListener('click', () => startRefresh('prematch_t30').catch((error) => {
      setSideStatus('Pré-match T-30 impossible', 'danger');
      $('#refresh-log').textContent = error.stack || error.message;
    }));
    $('#refresh-prematch-t10-btn')?.addEventListener('click', () => startRefresh('prematch_t10').catch((error) => {
      setSideStatus('Pré-match T-10 impossible', 'danger');
      $('#refresh-log').textContent = error.stack || error.message;
    }));
    $('#run-first-action-btn')?.addEventListener('click', () => {
      const action = firstNextAction();
      if (!action) return;
      startRefresh(action.mode || 'quick', action.source || 'all').catch((error) => {
        setSideStatus('Action prioritaire impossible', 'danger');
        $('#refresh-log').textContent = error.stack || error.message;
      });
    });
    $('#reload-engine-btn').addEventListener('click', () => reloadEngine());
    $('#export-btn')?.addEventListener('click', exportCsv);
    $('#export-user-bets-btn')?.addEventListener('click', exportUserBetsCsv);
    $('#export-user-bets-btn-history')?.addEventListener('click', exportUserBetsCsv);
    $('#export-prebet-csv-btn')?.addEventListener('click', exportPrebetChecklistCsv);
    $('#export-scenarios-csv-btn')?.addEventListener('click', exportStakeScenariosCsv);
    $('#export-scorers-csv-btn')?.addEventListener('click', exportScorersCsv);
    $('#export-watchlist-csv-btn')?.addEventListener('click', exportWatchlistCsv);
    $('#auto-prematch-toggle')?.addEventListener('click', () => {
      localStorage.setItem('autoPrematchEnabled', autoPrematchEnabled() ? 'off' : 'on');
      updateAutoPrematchButton();
      renderWatchlist();
    });
    $('#auto-critical-toggle')?.addEventListener('click', () => {
      localStorage.setItem('autoCriticalEnabled', autoCriticalEnabled() ? 'off' : 'on');
      updateAutoCriticalButton();
      renderPrebetChecklist();
    });
    $('#export-agent-json-btn')?.addEventListener('click', exportAgentJson);
    $('#export-agent-csv-btn')?.addEventListener('click', exportAgentCsv);
    $('#export-calibration-json-btn')?.addEventListener('click', exportCalibrationJson);
    $('#export-calibration-csv-btn')?.addEventListener('click', exportCalibrationCsv);
    $('#export-report-json-btn')?.addEventListener('click', exportFullReportJson);
    $('#export-signal-conflicts-file-btn')?.addEventListener('click', () => downloadStaticCsv('/exports/signal_conflicts.csv', 'signal_conflicts.csv').catch((error) => {
      setSideStatus('Export conflits indisponible', 'warn');
      showExportStatus(error.message, 'text/csv');
    }));
    $('#export-repairable-contexts-file-btn')?.addEventListener('click', () => downloadStaticCsv('/exports/repairable_contexts.csv', 'repairable_contexts.csv').catch((error) => {
      setSideStatus('Export réparables indisponible', 'warn');
      showExportStatus(error.message, 'text/csv');
    }));
    $('#export-prebet-final-file-btn')?.addEventListener('click', () => downloadStaticCsv('/exports/prebet_final.csv', 'prebet_final.csv').catch((error) => {
      setSideStatus('Export pré-match indisponible', 'warn');
      showExportStatus(error.message, 'text/csv');
    }));
    $('#export-critical-issues-file-btn')?.addEventListener('click', () => downloadStaticCsv('/exports/critical_issues.csv', 'critical_issues.csv').catch((error) => {
      setSideStatus('Export critiques indisponible', 'warn');
      showExportStatus(error.message, 'text/csv');
    }));
    $('#export-pick-integrity-file-btn')?.addEventListener('click', () => downloadStaticCsv('/exports/pick_integrity.csv', 'pick_integrity.csv').catch((error) => {
      setSideStatus('Export intégrité indisponible', 'warn');
      showExportStatus(error.message, 'text/csv');
    }));
    $('#export-source-health-file-btn')?.addEventListener('click', () => downloadStaticCsv('/exports/source_health.csv', 'source_health.csv').catch((error) => {
      setSideStatus('Export sources indisponible', 'warn');
      showExportStatus(error.message, 'text/csv');
    }));
    $('#export-coverage-repair-file-btn')?.addEventListener('click', () => downloadStaticCsv('/exports/coverage_repair.csv', 'coverage_repair.csv').catch((error) => {
      setSideStatus('Export coverage indisponible', 'warn');
      showExportStatus(error.message, 'text/csv');
    }));
    $('#export-model-lab-file-btn')?.addEventListener('click', () => downloadStaticCsv('/exports/model_lab.csv', 'model_lab.csv').catch((error) => {
      setSideStatus('Export modèle indisponible', 'warn');
      showExportStatus(error.message, 'text/csv');
    }));
    $('#export-context-json-btn')?.addEventListener('click', exportContextJson);
    $('#export-context-csv-btn')?.addEventListener('click', exportContextCsv);
    $('#export-context-backtest-json-btn')?.addEventListener('click', exportContextBacktestJson);
    $('#export-context-backtest-csv-btn')?.addEventListener('click', exportContextBacktestCsv);
    $('#export-decision-backtest-json-btn')?.addEventListener('click', exportDecisionBacktestJson);
    $('#export-decision-backtest-csv-btn')?.addEventListener('click', exportDecisionBacktestCsv);
    $('#export-gaps-csv-btn')?.addEventListener('click', exportSignalGapsCsv);
    $('#export-filter-backtest-csv-btn')?.addEventListener('click', exportFilterBacktestCsv);
    $('#match-search').addEventListener('input', renderMatches);
    $('#sport-filter').addEventListener('change', renderMatches);
    $('#calibration-filter')?.addEventListener('change', renderMatches);
    $('#edge-filter')?.addEventListener('change', renderMatches);
    $('#league-filter')?.addEventListener('change', renderMatches);
    ['pick-search', 'pick-sport-filter', 'pick-league-filter', 'pick-market-filter', 'pick-sort', 'pick-edge-min', 'pick-odd-min'].forEach((id) => {
      const el = $(`#${id}`);
      if (!el) return;
      el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => renderPicks());
    });
    ['scorer-search', 'scorer-league-filter', 'scorer-market-filter', 'scorer-odd-min', 'scorer-odd-max', 'scorer-sort'].forEach((id) => {
      const el = $(`#${id}`);
      if (!el) return;
      el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => renderScorers());
    });
    $('#market-snapshot')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-market-chip]');
      if (!button) return;
      const select = $('#pick-market-filter');
      if (!select) return;
      select.value = button.dataset.marketChip || 'all';
      renderPicks();
    });
    $('#model-segment-grid')?.addEventListener('click', (event) => {
      const card = event.target.closest('[data-market-chip]');
      if (!card) return;
      const key = card.dataset.marketChip || '';
      const select = $('#pick-market-filter');
      if (select && Array.from(select.options).some((option) => option.value === key)) {
        switchTab('dashboard');
        select.value = key;
        renderPicks();
      }
    });
    document.addEventListener('click', (event) => {
      const tabButton = event.target.closest('[data-tab-target]');
      if (tabButton) switchTab(tabButton.dataset.tabTarget || 'dashboard');
    });
    $('#imminent-strip')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-match-id]');
      if (button) openMatchDetail(button.dataset.matchId || '');
    });
    ['user-bets-status-filter', 'user-bets-period-filter', 'user-bets-tag-filter'].forEach((id) => {
      const el = $(`#${id}`);
      if (el) el.addEventListener('change', renderTrackedBets);
    });
    $('#user-bets-body')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-settle-bet-id]');
      if (!button) return;
      settleUserBet(button.dataset.settleBetId || '', button.dataset.settleStatus || 'void');
    });
    $('#user-bets-body')?.addEventListener('change', (event) => {
      const tagInput = event.target.closest('[data-bet-tags-id]');
      const noteInput = event.target.closest('[data-bet-note-id]');
      if (tagInput) {
        const tags = String(tagInput.value || '').split(',').map((item) => item.trim()).filter(Boolean).slice(0, 8);
        updateTrackedBetText(tagInput.dataset.betTagsId || '', { tags });
      }
      if (noteInput) {
        updateTrackedBetText(noteInput.dataset.betNoteId || '', { note: String(noteInput.value || '').slice(0, 800) });
      }
    });
    $('#calendar-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-calendar-day]');
      if (!button) return;
      state.selectedCalendarDay = button.dataset.calendarDay || null;
      state.calendarDayFilter = state.selectedCalendarDay;
      renderCalendar();
      renderPicks();
      switchTab('dashboard');
    });
    $('#calendar-timeline')?.addEventListener('click', openMatchFromEvent);
    $('#clear-calendar-filter-btn')?.addEventListener('click', () => {
      state.calendarDayFilter = null;
      state.selectedCalendarDay = null;
      renderCalendar();
      renderPicks();
    });
    $('#pipeline-refresh-btn')?.addEventListener('click', () => startRefresh().catch((error) => {
      setSideStatus('Refresh impossible', 'danger');
      $('#refresh-log').textContent = error.stack || error.message;
    }));
    $('#cancel-refresh-btn')?.addEventListener('click', async () => {
      try {
        const response = await fetchJson('/api/refresh/cancel', { method: 'POST' });
        setSideStatus(response.cancelled ? 'Refresh annulé' : 'Aucun refresh actif', response.cancelled ? 'warn' : 'ok');
        await refreshLog();
      } catch (error) {
        setSideStatus('Annulation impossible', 'danger');
        pushLog('error', error.message);
      }
    });
    $('#test-webhook-btn')?.addEventListener('click', async () => {
      const status = $('#webhook-status');
      const prefs = collectPreferencesFromForm();
      savePreferences(prefs);
      if (!prefs.webhookUrl) {
        if (status) status.textContent = 'Ajoute une URL webhook avant le test.';
        return;
      }
      try {
        await sendExternalAlert('Test Paris-Sportif', 'Ton cockpit PC peut maintenant envoyer une alerte mobile.', null, { test: true, dryRun: true });
        if (status) status.textContent = 'Webhook test validé localement. Les alertes importantes utiliseront cette URL.';
      } catch (error) {
        if (status) status.textContent = `Webhook en erreur : ${error.message}`;
      }
    });
    $('#test-webhook-suite-btn')?.addEventListener('click', () => sendWebhookTestSuite());
    $('#test-web-enrichment-btn')?.addEventListener('click', () => {
      const row = (dashboardPickRows(readPickFilters()) || [])[0] || state.picks[0] || state.allPicks[0];
      if (!row) {
        setSideStatus('Aucun pick à enrichir', 'warn');
        return;
      }
      enrichPick(row, { force: true, dryRun: true, manual: true }).catch((error) => {
        setSideStatus(`Enrichissement impossible : ${error.message}`, 'danger');
      });
    });
    $('#check-update-btn')?.addEventListener('click', () => checkForUpdates({ manual: true }));
    $('#install-update-btn')?.addEventListener('click', async () => {
      try {
        const response = await fetchJson('/api/update/install-next-restart', { method: 'POST' });
        state.updateStatus = response.status || state.updateStatus;
        writeStorageJson(UPDATE_STATUS_KEY, state.updateStatus);
        renderUpdateStatus();
        setSideStatus(state.updateStatus?.installOnQuit ? 'Update préparée au redémarrage' : 'Aucune update disponible', state.updateStatus?.installOnQuit ? 'ok' : 'warn');
      } catch (error) {
        setSideStatus(`Préparation update impossible : ${error.message}`, 'warn');
      }
    });
    $('#export-profile-btn')?.addEventListener('click', exportProfile);
    $('#import-profile-btn')?.addEventListener('click', () => $('#profile-import-input')?.click());
    $('#profile-import-input')?.addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        state.profileImportPreview = JSON.parse(text);
        renderProfileImportPreview();
        setSideStatus('Profil prêt à importer', 'ok');
      } catch (error) {
        state.profileImportPreview = null;
        renderProfileImportPreview();
        setSideStatus(`Profil invalide : ${error.message}`, 'danger');
      } finally {
        event.target.value = '';
      }
    });
    $('#merge-profile-btn')?.addEventListener('click', () => {
      applyImportedProfile(state.profileImportPreview, 'merge');
      setSideStatus('Profil fusionné', 'ok');
    });
    $('#replace-profile-btn')?.addEventListener('click', () => {
      applyImportedProfile(state.profileImportPreview, 'replace');
      setSideStatus('Profil remplacé', 'warn');
    });
    $('#reset-demo-btn')?.addEventListener('click', () => {
      localStorage.setItem(USER_BETS_DEMO_KEY, '[]');
      renderUserPnl();
      renderHistory();
      renderPicks();
      scheduleProfileBackup({ force: true });
      setSideStatus('Démo réinitialisée', 'ok');
    });
    $('#export-toast')?.addEventListener('click', () => $('#export-toast')?.classList.add('hidden'));
    $('#log-drawer-close')?.addEventListener('click', closeLogDrawer);
    $('#log-level-filter')?.addEventListener('change', renderDebugLogs);
    $('#clear-logs-btn')?.addEventListener('click', () => {
      state.debugLogs = [];
      renderDebugLogs();
    });
    $('#copy-logs-btn')?.addEventListener('click', () => {
      const text = $('#debug-log-output')?.textContent || '';
      navigator.clipboard?.writeText(text).then(() => setSideStatus('Logs copiés', 'ok')).catch(() => setSideStatus('Copie logs impossible', 'warn'));
    });
    $('#quality-alert-filter')?.addEventListener('change', () => {
      if (state.status) renderQualityAlerts(state.status);
    });
    $('#quality-alert-sort')?.addEventListener('change', () => {
      if (state.status) renderQualityAlerts(state.status);
    });
    $('#signal-gap-filter')?.addEventListener('change', renderSignalGapCenter);
    $('#signal-gap-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-gap-source]');
      if (!button) return;
      startRefresh('signals', button.dataset.gapSource || 'context').catch((error) => {
        setSideStatus('Refresh signal impossible', 'danger');
        $('#refresh-log').textContent = error.stack || error.message;
      });
    });
    ['ultimate-bet-card', 'time-cockpit', 'picks-body', 'stake-scenario-body', 'watchlist-grid', 'prematch-final-grid', 'matches-body', 'combines-list', 'scorers-list', 'agent-positions-body', 'agent-blockers-body'].forEach((id) => {
      const node = $(`#${id}`);
      if (!node) return;
      node.addEventListener('click', openMatchFromEvent);
      node.addEventListener('keydown', openMatchFromEvent);
    });
    $('#prematch-execution-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-prematch-mode]');
      if (!button) return;
      const mode = button.dataset.prematchMode || 'prematch';
      const source = button.dataset.prematchSource || 'context';
      startRefresh(mode, source).catch((error) => {
        setSideStatus('Plan pré-match impossible', 'danger');
        $('#refresh-log').textContent = error.stack || error.message;
      });
    });
    $('#source-health-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-signal-source]');
      if (!button) return;
      startRefresh('signals', button.dataset.signalSource).catch((error) => {
        setSideStatus('Refresh source impossible', 'danger');
        $('#refresh-log').textContent = error.stack || error.message;
      });
    });
    $('#quality-alert-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-quality-mode]');
      if (!button) return;
      const mode = button.dataset.qualityMode || 'quick';
      const source = button.dataset.qualitySource || 'all';
      startRefresh(mode, source).catch((error) => {
        setSideStatus('Refresh alerte impossible', 'danger');
        $('#refresh-log').textContent = error.stack || error.message;
      });
    });
    $('#next-actions-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-quality-mode]');
      if (!button) return;
      const mode = button.dataset.qualityMode || 'quick';
      const source = button.dataset.qualitySource || 'all';
      startRefresh(mode, source).catch((error) => {
        setSideStatus('Action impossible', 'danger');
        $('#refresh-log').textContent = error.stack || error.message;
      });
    });
    $('#prebet-checklist-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-quality-mode]');
      if (!button) return;
      const mode = button.dataset.qualityMode || 'quick';
      const source = button.dataset.qualitySource || 'all';
      startRefresh(mode, source).catch((error) => {
        setSideStatus('Checklist impossible', 'danger');
        $('#refresh-log').textContent = error.stack || error.message;
      });
    });
    $('#final-decision-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-quality-mode]');
      if (!button) return;
      const mode = button.dataset.qualityMode || 'quick';
      const source = button.dataset.qualitySource || 'all';
      startRefresh(mode, source).catch((error) => {
        setSideStatus('Décision finale impossible', 'danger');
        $('#refresh-log').textContent = error.stack || error.message;
      });
    });
    $('#coverage-repair-engine-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-quality-mode]');
      if (!button) return;
      const mode = button.dataset.qualityMode || 'signals';
      const source = button.dataset.qualitySource || 'context';
      startRefresh(mode, source).catch((error) => {
        setSideStatus('Réparation coverage impossible', 'danger');
        $('#refresh-log').textContent = error.stack || error.message;
      });
    });
    $('#source-freshness-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-quality-mode]');
      if (!button) return;
      const mode = button.dataset.qualityMode || 'signals';
      const source = button.dataset.qualitySource || 'context';
      startRefresh(mode, source).catch((error) => {
        setSideStatus('Refresh source impossible', 'danger');
        $('#refresh-log').textContent = error.stack || error.message;
      });
    });
    $('#context-repair-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-quality-mode]');
      if (!button) return;
      const mode = button.dataset.qualityMode || 'signals';
      const source = button.dataset.qualitySource || 'context';
      startRefresh(mode, source).catch((error) => {
        setSideStatus('Réparation contexte impossible', 'danger');
        $('#refresh-log').textContent = error.stack || error.message;
      });
    });
    $('#refresh-priority-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-quality-mode]');
      if (!button) return;
      const mode = button.dataset.qualityMode || 'quick';
      const source = button.dataset.qualitySource || 'all';
      startRefresh(mode, source).catch((error) => {
        setSideStatus('File refresh impossible', 'danger');
        $('#refresh-log').textContent = error.stack || error.message;
      });
    });
    $('#smart-prepare-data-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-quality-mode]');
      if (!button) return;
      const mode = button.dataset.qualityMode || 'quick';
      const source = button.dataset.qualitySource || 'all';
      startRefresh(mode, source).catch((error) => {
        setSideStatus('Préparation intelligente impossible', 'danger');
        $('#refresh-log').textContent = error.stack || error.message;
      });
    });
    $('#modal-close').addEventListener('click', closeMatchDetail);
    $('#modal-tabs').addEventListener('click', (event) => {
      const btn = event.target.closest('[data-detail-tab]');
      if (btn) switchDetailTab(btn.dataset.detailTab);
    });
    $('#modal-content').addEventListener('click', (event) => {
      const enrichButton = event.target.closest('[data-enrich-pick-key]');
      if (enrichButton) {
        event.preventDefault();
        const row = findPickByTrackKey(enrichButton.dataset.enrichPickKey || '') || state.matches.find((item) => userBetKey(item) === enrichButton.dataset.enrichPickKey);
        enrichPick(row, { force: true, dryRun: false, manual: true }).catch((error) => setSideStatus(`Enrichissement impossible : ${error.message}`, 'danger'));
        return;
      }
      const button = event.target.closest('[data-quality-mode]');
      if (!button) return;
      event.preventDefault();
      const mode = button.dataset.qualityMode || 'quick';
      const source = button.dataset.qualitySource || 'all';
      startRefresh(mode, source).catch((error) => {
        setSideStatus('Action détail impossible', 'danger');
        $('#refresh-log').textContent = error.stack || error.message;
      });
    });
    $('#match-modal').addEventListener('click', (event) => {
      if (event.target.id === 'match-modal') closeMatchDetail();
    });
    $('#focus-overlay')?.addEventListener('click', (event) => {
      if (event.target.id === 'focus-overlay') closeFocusMode();
      const focusTrack = event.target.closest('[data-track-bet-key]');
      if (focusTrack) {
        event.preventDefault();
        trackUserBet(findPickByTrackKey(focusTrack.dataset.trackBetKey || ''));
        openFocusMode(state.focusRow);
      }
    });
    $('#focus-close-top')?.addEventListener('click', closeFocusMode);
    document.addEventListener('click', (event) => {
      if (event.target.closest('#focus-close-btn')) closeFocusMode();
      if (event.target.closest('#focus-reminder-btn')) {
        setSideStatus('Rappel focus activé pour 5 min', 'ok');
        setTimeout(() => {
          if (state.focusRow) notifyUser('Rappel focus', `${state.focusRow.title} · ${state.focusRow.label || ''} démarre dans ${countdownLabel(state.focusRow.start)}.`, state.focusRow);
        }, 5 * 60 * 1000);
      }
    });
    $('#loss-feedback-close')?.addEventListener('click', closeLossFeedbackPrompt);
    $('#loss-feedback-modal')?.addEventListener('click', (event) => {
      if (event.target.id === 'loss-feedback-modal') closeLossFeedbackPrompt();
      const choice = event.target.closest('[data-loss-feedback]');
      if (choice) saveLossFeedback(choice.dataset.lossFeedback || 'other');
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeFocusMode();
        closeLossFeedbackPrompt();
        closeMatchDetail();
      }
      if (event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        openLogDrawer();
        return;
      }
      if (event.ctrlKey && !event.altKey && !event.metaKey) {
        const target = event.target;
        if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
        const shortcuts = {
          '1': 'dashboard',
          '2': 'matches',
          '3': 'agent',
          '4': 'data',
          '5': 'history',
          '6': 'combines',
          '7': 'scorers',
          '8': 'calendar',
          '9': 'pipeline',
          '0': 'help'
        };
        const tab = shortcuts[event.key];
        if (tab) {
          event.preventDefault();
          switchTab(tab);
        }
      }
    });
    $('#bankroll-input').addEventListener('change', () => {
      localStorage.setItem('userBankroll', String(getBankroll()));
      const prefs = loadPreferences();
      savePreferences({ ...prefs, bankroll: getBankroll() });
      renderPreferences();
      computePicks().catch(() => {});
    });
    $('#save-preferences-btn')?.addEventListener('click', () => applyPreferences(collectPreferencesFromForm()));
    $('#reset-preferences-btn')?.addEventListener('click', () => applyPreferences({ ...DEFAULT_PREFERENCES }));
    $('#reset-model-adjustments-btn')?.addEventListener('click', () => {
      localStorage.removeItem(MODEL_ADJUSTMENTS_KEY);
      modelAdjustmentsFromAudit();
      renderActiveModelAdjustments();
      renderPicks();
      setSideStatus('Ajustements modèle recalculés', 'ok');
    });
    $('#pref-level')?.addEventListener('change', () => {
      const defaults = levelDefaults($('#pref-level')?.value || 'intermediate');
      Object.entries({
        'pref-edge-min': defaults.edgeMin,
        'pref-odd-min': defaults.oddMin,
        'pref-odd-max': defaults.oddMax,
        'pref-confidence-min': defaults.confidenceMin
      }).forEach(([id, value]) => {
        const node = $(`#${id}`);
        if (node) node.value = String(value);
      });
      const strict = $('#pref-strict');
      if (strict) strict.checked = Boolean(defaults.strict);
    });
    $('#onboarding-save-btn')?.addEventListener('click', () => {
      const level = $('#onboarding-level')?.value || 'intermediate';
      applyPreferences({
        ...DEFAULT_PREFERENCES,
        ...levelDefaults(level),
        bankroll: Math.max(10, Number($('#onboarding-bankroll')?.value || 50) || 50),
        level
      });
    });
  }

  function scheduleBackgroundRefresh() {
    if (state.backgroundRefreshTimer) clearTimeout(state.backgroundRefreshTimer);
    const plan = nextRefreshPlan();
    if (!plan.delayMs) {
      state.backgroundRefreshTimer = null;
      state.backgroundRefreshNextAt = null;
      renderRefreshPolicy();
      return;
    }
    state.backgroundRefreshNextAt = Date.now() + plan.delayMs;
    state.backgroundRefreshTimer = setTimeout(() => {
      if (state.status?.refresh?.running) {
        scheduleBackgroundRefresh();
        return;
      }
      startRefresh('quick').catch((error) => {
        setSideStatus('Auto-refresh impossible', 'warn');
        $('#refresh-log').textContent = error.stack || error.message;
      }).finally(() => {
        scheduleBackgroundRefresh();
      });
    }, plan.delayMs);
    renderRefreshPolicy();
  }

  async function boot() {
    state.bootStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    installDebugLogHooks();
    pushLog('info', 'Démarrage du cockpit desktop');
    markAppSessionStart();
    bindEvents();
    state.actionHistory = readActionHistory();
    state.aiAssist = readStorageJson(AI_ENGINE_KEY, null);
    state.webEnrichments = readStorageJson(WEB_ENRICHMENT_KEY, null);
    state.updateStatus = readStorageJson(UPDATE_STATUS_KEY, null);
    renderActionHistory();
    updateWebEnrichmentSummary();
    const storedBankroll = Number(localStorage.getItem('userBankroll') || loadPreferences().bankroll || 50);
    if (Number.isFinite(storedBankroll) && storedBankroll > 0) $('#bankroll-input').value = String(storedBankroll);
    switchTab('dashboard');
    renderUserPnl();
    renderPreferences();
    const statusPromise = refreshStatus();
    const logPromise = refreshLog().catch(() => null);
    await statusPromise;
    await computePicks();
    loadWebEnrichmentState().catch(() => {});
    setTimeout(() => checkForUpdates().catch(() => {}), 2500);
    await logPromise;
    setSideStatus('Calcul prêt', 'ok');
    scheduleBackgroundRefresh();
    renderBootPerformance();
    renderRefreshPolicy();
    setInterval(() => refreshStatus().catch(() => {}), 30000);
    setInterval(() => refreshLog().catch(() => {}), 5000);
    setInterval(renderRefreshPolicy, 1000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    boot().catch((error) => {
      console.error(error);
      setSideStatus('Erreur au démarrage', 'danger');
      renderPicks(`Erreur au démarrage : ${error.message}`);
    });
  });
  window.addEventListener('load', () => {
    state.windowLoadedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    renderBootPerformance();
  });
  document.addEventListener('visibilitychange', () => {
    state.hiddenSince = document.hidden ? Date.now() : null;
    scheduleBackgroundRefresh();
  });
}());

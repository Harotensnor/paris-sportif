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
    modelRealityAudit: null,
    probabilityCalibration: null,
    policyCandidates: null,
    sourceHealth: null,
    decisionCenter: null,
    agentBlockers: null,
    clvSummary: null,
    dashboardMeta: null,
    todayFunnel: null,
    coverage24h: null,
    winamaxMarketAudit: null,
    winamaxPromos: null,
    weeklyReport: null,
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
    newsWatcher: null,
    webEnrichmentPending: new Set(),
    focusRow: null,
    feedbackBetId: null,
    updateStatus: null,
    appInfo: null,
    bugReportDraft: null,
    actionTrail: [],
    shortcutCaptureAction: null,
    longTasks: [],
    deepSearchSelection: null,
    liveScoreState: null,
    tradingIndex: 0,
    autoTrackingLastRunAt: 0,
    winamaxImportPreview: null,
    currentDashboardRows: [],
    activeHomeCategory: null,
    bentoDragId: null
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
  const TOP_PICK_ALERT_KEY = 'parisSportifLastTopPickKey';
  const PROFILE_BACKUP_KEY = 'parisSportifLastProfileBackupDay';
  const APP_SESSION_KEY = 'parisSportifDesktopSession';
  const AI_ENGINE_KEY = 'parisSportifAiEngineState';
  const WEB_ENRICHMENT_KEY = 'parisSportifWebEnrichmentState';
  const NEWS_WATCHER_KEY = 'parisSportifNewsWatcherState';
  const LIVE_NOTIFICATION_KEY = 'parisSportifLiveNotificationKeys';
  const MODEL_ADJUSTMENTS_KEY = 'parisSportifModelAdjustments';
  const LOSS_FEEDBACK_KEY = 'parisSportifLossFeedbacks';
  const UPDATE_STATUS_KEY = 'parisSportifUpdateStatus';
  const BANKROLL_TRANSACTIONS_KEY = 'parisSportifBankrollTransactions';
  const WEEKLY_REPORT_KEY = 'parisSportifWeeklyReports';
  const WEEKLY_REPORT_SEEN_KEY = 'parisSportifWeeklyReportSeen';
  const DAILY_SUGGESTION_KEY = 'parisSportifDailySuggestion';
  const DAILY_SUGGESTION_DISMISS_KEY = 'parisSportifDailySuggestionDismissed';
  const EVENING_BRIEF_KEY = 'parisSportifEveningBriefs';
  const EVENING_BRIEF_SEEN_KEY = 'parisSportifEveningBriefSeen';
  const DEMO_TOUR_KEY = 'parisSportifDemoTourDone';
  const BUG_REPORTS_KEY = 'parisSportifBugReportsLocal';
  const BUG_REPORT_PROMPT_KEY = 'parisSportifBugReportPrompt';
  const SHORTCUTS_KEY = 'parisSportifKeyboardShortcuts';
  const FAVORITES_KEY = 'parisSportifFavorites';
  const FAVORITE_ALERT_KEY = 'parisSportifFavoriteAlerts';
  const TREND_ALERT_KEY = 'parisSportifTrendAlerts';
  const ANALYTICS_FILTER_KEY = 'parisSportifAnalyticsSuggestedFilters';
  const AUTO_TRACKING_AUDIT_KEY = 'parisSportifAutoTrackingAudit';
  const AUTO_TRACKING_STOP_KEY = 'parisSportifAutoTrackingStopped';
  const WINAMAX_IMPORT_KEY = 'parisSportifWinamaxImports';
  const SAVED_STRATEGIES_KEY = 'parisSportifSavedStrategies';
  const STRATEGY_ALERT_KEY = 'parisSportifStrategySuggestion';
  const LIVE_NEWS_KEY = 'parisSportifLiveNewsWatcher';
  const SPORT_PATTERNS_KEY = 'parisSportifAdvancedSportPatterns';
  const I18N_LANGUAGE_KEY = 'parisSportifLanguage';
  const DASHBOARD_LAYOUT_KEY = 'parisSportifDashboardLayouts';
  const PICKS_VIEW_MODE_KEY = 'parisSportifPicksViewMode';
  const HOME_SORT_KEY = 'parisSportifHomeSort';
  const DEFAULT_SHORTCUTS = {
    dashboard: 'Ctrl+1',
    history: 'Ctrl+2',
    search: 'Ctrl+4',
    preferences: 'Ctrl+3',
    expert: 'Ctrl+E',
    refresh: 'Ctrl+R',
    topPick: 'Ctrl+M',
    nextPick: 'N',
    previousPick: 'P',
    favoriteCurrent: 'F',
    cashoutCurrent: 'C',
    tradingRefresh: 'Space',
    help: 'Ctrl+/',
    logs: 'Ctrl+Shift+L'
  };
  const SHORTCUT_ACTIONS = {
    dashboard: { label: 'Vue Picks' },
    history: { label: 'Vue Bilan' },
    search: { label: 'Vue Recherche' },
    preferences: { label: 'Vue Réglages' },
    expert: { label: 'Mode expert' },
    refresh: { label: 'Refresh manuel' },
    topPick: { label: 'Mise rapide top pick' },
    nextPick: { label: 'Trading Desk · pick suivant' },
    previousPick: { label: 'Trading Desk · pick précédent' },
    favoriteCurrent: { label: 'Trading Desk · favori courant' },
    cashoutCurrent: { label: 'Trading Desk · cash-out courant' },
    tradingRefresh: { label: 'Trading Desk · refresh' },
    help: { label: 'Aide' },
    logs: { label: 'Logs debug' }
  };
  const SPORTS_PREFS = ['football', 'tennis', 'basketball', 'hockey', 'baseball', 'rugby', 'football américain', 'mma', 'boxe', 'handball', 'volleyball'];
  const SIMPLE_MARKET_PREFS = [
    { key: 'winner', label: 'Vainqueur du match', keys: ['1n2', 'matchwinner', 'vainqueur'] },
    { key: 'goals', label: 'Plus / Moins de buts', keys: ['ou', 'ou15', 'ou25', 'ou35', 'httotal', 'htou', 'halftimetotal'] },
    { key: 'btts', label: 'Les deux équipes marquent', keys: ['btts'] },
    { key: 'scorer', label: 'Buteurs', keys: ['scorer', 'buteur'] },
    { key: 'halftime', label: 'Mi-temps vainqueur', keys: ['ht1n2', 'ht_1n2'] }
  ];
  const ADVANCED_MARKET_PREFS = [
    { key: 'handicaps', label: 'Handicaps', keys: ['handicap', 'ah', 'asianhandicap'] },
    { key: 'dnb_dc', label: 'Double chance / DNB', keys: ['doublechance', 'dnb'] },
    { key: 'exact_scores', label: 'Score exact', keys: ['exactscore'] },
    { key: 'tennis_specials', label: 'Sets exact / Total jeux tennis', keys: ['tennisgames', 'tennissets'] },
    { key: 'corners_cards', label: 'Corners / Cartons', keys: ['corners', 'cards'] },
    { key: 'points_totals', label: 'Total points basket/hockey/baseball', keys: ['basketballtotal', 'baskettotal', 'hockeytotal', 'baseballtotal'] },
    { key: 'half_scores', label: 'Score mi-temps', keys: ['halftimescore', 'correctscorehalftime'] },
    { key: 'scorer_specials', label: 'Buteur premier/dernier', keys: ['firstscorer', 'lastscorer'] },
    { key: 'htft', label: 'Mi-temps / Fin', keys: ['htft', 'mitempsfin'] },
    { key: 'specifics', label: 'Spécifiques minute / événements', keys: ['teamtotal', 'resultbtts', 'minute', 'special'] }
  ];
  const MARKET_PREFS = [...SIMPLE_MARKET_PREFS, ...ADVANCED_MARKET_PREFS];
  const DEFAULT_PREFERENCES = {
    preferenceSchemaVersion: 18,
    bankroll: 50,
    level: 'intermediate',
    sports: SPORTS_PREFS,
    markets: SIMPLE_MARKET_PREFS.map((item) => item.key),
    edgeMin: 0,
    oddMin: 1,
    oddMax: 50,
    confidenceMin: 0,
    alertEdge: 10,
    alertWindowHours: 2,
    eveningBriefHour: 22,
    prematchAlertsEnabled: true,
    topPickAlertsEnabled: true,
    notifyQuietHoursOff: false, // Sprint 63 — opt-in pour notifs 23h-7h
    stakeMode: 'kelly',
    allocationStrategy: 'moderate',
    dailyBudgetPct: 5,
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
    coachReduceStake: true, // Sprint 78 F6 — mise auto -50% si 3L de suite
    demoMode: false,
    aiEnabled: false,
    aiProvider: 'openai',
    aiApiKey: '',
    aiModel: 'gpt-4o-mini',
    webEnrichmentEnabled: true,
    webEnrichmentCacheMinutes: 120,
    webEnrichmentRateLimit: 5,
    expertMode: false,
    antiTiltStrict: true,
    autoUpdateEnabled: true,
    updateChannel: 'stable',
    bugReportPrompt: true,
    tradingDesk: false,
    autoTrackingEnabled: false,
    autoTrackingConfirmed: false,
    autoTrackingDryRun: true,
    autoTrackingLevel: 'top',
    autoTrackingEdgeMin: 5,
    autoTrackingOddMin: 1.3,
    autoTrackingOddMax: 6,
    autoTrackingDailyBudget: 5,
    autoTrackingDailyLimit: 3,
    autoTrackingStartHour: 8,
    autoTrackingEndHour: 22,
    autoTrackingSports: SPORTS_PREFS,
    autoTrackingMarkets: SIMPLE_MARKET_PREFS.map((item) => item.key),
    liveNewsWatcher: false,
    twitterWatcher: false,
    dashboardCustom: false,
    dashboardPreset: 'matin',
    language: 'fr',
    theme: 'dark',
    strict: false
  };
  const REFRESH_DEFAULT_INTERVAL_MS = 30 * 60 * 1000;
  const ALLOCATION_STRATEGIES = {
    conservative: { key: 'conservative', label: 'Conservateur', budgetPct: 3, maxPicks: 5, detail: '3% bankroll/jour, top 5 picks.' },
    moderate: { key: 'moderate', label: 'Modéré', budgetPct: 5, maxPicks: 10, detail: '5% bankroll/jour, top 10 picks.' },
    aggressive: { key: 'aggressive', label: 'Agressif', budgetPct: 8, maxPicks: 15, detail: '8% bankroll/jour, top 15 picks.' }
  };
  const ALLOCATION_SHARES = [25, 20, 15, 10, 10, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3];
  const REFRESH_LIVE_INTERVAL_MS = 2 * 60 * 1000;
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
  const I18N_MESSAGES = {
    fr: {
      navPicks: 'À miser',
      navHistory: 'Bilan & Stats',
      navSearch: 'Recherche',
      navSettings: 'Réglages',
      autoTracking: 'Auto-tracking supervisé',
      winamaxImport: 'Importer paris Winamax',
      saveStrategy: 'Sauver cette sélection',
      strategySelect: 'Mes stratégies',
      language: 'Langue',
      searchPlaceholder: 'Real Madrid, Mbappé, Liga, NBA...',
      enrichedSheet: 'Fiche enrichie',
      reassuringNarrative: 'Pourquoi ce pari',
      newsWatcher: 'News watcher temps réel',
      keyPlayers: 'Joueurs clés',
      tacticalAnalysis: 'Analyse tactique'
    },
    en: {
      navPicks: "Today's bets",
      navHistory: 'Stats',
      navSearch: 'Search',
      navSettings: 'Settings',
      autoTracking: 'Supervised auto-tracking',
      winamaxImport: 'Import Winamax bets',
      saveStrategy: 'Save this selection',
      strategySelect: 'My strategies',
      language: 'Language',
      searchPlaceholder: 'Real Madrid, Mbappe, Liga, NBA...',
      enrichedSheet: 'Enriched match sheet',
      reassuringNarrative: 'Why this bet',
      newsWatcher: 'Real-time news watcher',
      keyPlayers: 'Key players',
      tacticalAnalysis: 'Tactical analysis'
    }
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => Array.from(document.querySelectorAll(selector));

  function t(key, params = {}) {
    const pref = loadPreferences?.() || DEFAULT_PREFERENCES;
    const rawLang = localStorage.getItem(I18N_LANGUAGE_KEY) || pref.language || 'fr';
    const resolvedLang = rawLang === 'auto'
      ? ((navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'fr')
      : rawLang;
    const lang = (resolvedLang === 'en' || resolvedLang === 'fr') ? resolvedLang : 'fr';
    let text = I18N_MESSAGES[lang]?.[key] || I18N_MESSAGES.fr[key] || key;
    Object.entries(params || {}).forEach(([name, value]) => {
      text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
    });
    return text;
  }

  window.t = t;

  function applyI18n(language = 'fr') {
    const lang = language === 'auto'
      ? ((navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'fr')
      : (language === 'en' ? 'en' : 'fr');
    localStorage.setItem(I18N_LANGUAGE_KEY, language || 'fr');
    document.documentElement.lang = lang;
    // Sprint 51 (refonte UX) : on cible la `.nav-label` enrichie au lieu
    // d'écraser tout le bouton (qui contient maintenant icone + label + badge).
    const setNavLabel = (selector, fallback) => {
      const btn = document.querySelector(selector);
      if (!btn) return;
      const label = btn.querySelector('.nav-label');
      if (label) label.textContent = fallback;
      else btn.textContent = fallback;
    };
    setNavLabel('[data-tab="dashboard"]', t('navPicks'));
    setNavLabel('[data-tab="history"]', t('navHistory'));
    setNavLabel('[data-tab="search"]', t('navSearch'));
    setNavLabel('[data-tab="preferences"]', t('navSettings'));
    const strategy = $('#saved-strategy-select option[value=""]');
    if (strategy) strategy.textContent = t('strategySelect');
    const saveStrategy = $('#save-current-strategy-btn');
    if (saveStrategy) saveStrategy.textContent = t('saveStrategy');
    const search = $('#deep-search-input');
    if (search) search.placeholder = t('searchPlaceholder');
    const activePanel = document.querySelector('.tab-panel.active')?.dataset?.panel;
    const titleKey = activePanel === 'history' ? 'navHistory' : activePanel === 'search' ? 'navSearch' : activePanel === 'preferences' ? 'navSettings' : activePanel === 'dashboard' ? 'navPicks' : '';
    if (titleKey && $('#page-title')) $('#page-title').textContent = t(titleKey);
  }

  function normalizeUiKey(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9.]+/g, '');
  }

  function marketKeyFromRow(row) {
    const key = normalizeUiKey(row?.marketKey || row?.market || 'market_unknown') || 'market_unknown';
    const aliases = {
      jeuxtennis: 'tennisgames',
      setstennis: 'tennissets',
      totalmitemps: 'httotal',
      totalbasket: 'basketballtotal',
      totalbuts: 'hockeytotal',
      totalruns: 'baseballtotal',
      totalquipe: 'teamtotal',
      doublechance: 'doublechance',
      resultatbtts: 'resultbtts',
      cornersou: 'corners',
      corner: 'corners',
      cartons: 'cards',
      cardsou: 'cards',
      mitemps: 'ht1n2',
      halftime: 'ht1n2'
    };
    return aliases[key] || key;
  }

  function marketPrefByKey(key) {
    const normalized = normalizeUiKey(key);
    return MARKET_PREFS.find((item) => normalizeUiKey(item.key) === normalized) || null;
  }

  function marketGroupFromKey(key) {
    const normalized = normalizeUiKey(key);
    const direct = MARKET_PREFS.find((item) => item.keys?.map(normalizeUiKey).includes(normalized));
    return direct?.key || normalized;
  }

  function rowMarketPreferenceKey(row) {
    return marketGroupFromKey(marketKeyFromRow(row));
  }

  function isWinnerRow(row) {
    return rowMarketPreferenceKey(row) === 'winner';
  }

  function isSimpleMarketPreference(key) {
    const normalized = normalizeUiKey(key);
    return SIMPLE_MARKET_PREFS.some((item) => normalizeUiKey(item.key) === normalized || item.keys.map(normalizeUiKey).includes(normalized));
  }

  function expandMarketPreferences(markets, { expert = false } = {}) {
    const selected = Array.isArray(markets) && markets.length ? markets : DEFAULT_PREFERENCES.markets;
    const allowedGroups = new Set();
    const allowedKeys = new Set();
    selected.forEach((item) => {
      const pref = marketPrefByKey(item);
      if (pref) {
        if (SIMPLE_MARKET_PREFS.includes(pref) || expert) {
          allowedGroups.add(pref.key);
          (pref.keys || [pref.key]).forEach((key) => allowedKeys.add(normalizeUiKey(key)));
        }
        return;
      }
      const group = marketGroupFromKey(item);
      if (expert || isSimpleMarketPreference(group)) {
        allowedGroups.add(group);
        allowedKeys.add(normalizeUiKey(item));
      }
    });
    SIMPLE_MARKET_PREFS.forEach((pref) => {
      if (allowedGroups.has(pref.key)) (pref.keys || []).forEach((key) => allowedKeys.add(normalizeUiKey(key)));
    });
    return { groups: allowedGroups, keys: allowedKeys };
  }

  function sanitizeMarketPreferences(markets, schemaVersion = 0, expert = false) {
    const raw = Array.isArray(markets) ? markets.map((item) => String(item)).filter(Boolean) : [];
    if (schemaVersion < 15) {
      const simple = raw.map(marketGroupFromKey).filter(isSimpleMarketPreference);
      return Array.from(new Set(simple.length ? simple : DEFAULT_PREFERENCES.markets));
    }
    const allowed = raw.filter((key) => {
      const pref = marketPrefByKey(key);
      if (!pref) return expert || isSimpleMarketPreference(key);
      return expert || SIMPLE_MARKET_PREFS.includes(pref);
    });
    return allowed.length ? Array.from(new Set(allowed)) : DEFAULT_PREFERENCES.markets;
  }

  function mergePreferenceList(value, defaults) {
    const input = Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
    const seen = new Set(input.map((item) => item.toLowerCase()));
    const merged = [...input];
    defaults.forEach((item) => {
      const key = String(item).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    });
    return merged.length ? merged : defaults;
  }

  function loadPreferences() {
    try {
      const parsed = JSON.parse(localStorage.getItem(USER_PREFS_KEY) || 'null');
      if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_PREFERENCES };
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        sports: parsed.preferenceSchemaVersion >= 12
          ? (Array.isArray(parsed.sports) && parsed.sports.length ? parsed.sports : DEFAULT_PREFERENCES.sports)
          : mergePreferenceList(parsed.sports, DEFAULT_PREFERENCES.sports),
        markets: sanitizeMarketPreferences(parsed.markets, parsed.preferenceSchemaVersion || 0, Boolean(parsed.expertMode))
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
      markets: sanitizeMarketPreferences(preferences?.markets, preferences?.preferenceSchemaVersion || DEFAULT_PREFERENCES.preferenceSchemaVersion, Boolean(preferences?.expertMode))
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

  function appendStorageRow(key, row, limit = 500) {
    const rows = readStorageJson(key, []);
    const next = [...(Array.isArray(rows) ? rows : []), row].slice(-limit);
    writeStorageJson(key, next);
    return next;
  }

  function loadAutoTrackingAudit() {
    const rows = readStorageJson(AUTO_TRACKING_AUDIT_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function appendAutoTrackingAudit(row) {
    return appendStorageRow(AUTO_TRACKING_AUDIT_KEY, {
      at: new Date().toISOString(),
      ...row
    }, 800);
  }

  function loadWinamaxImports() {
    const rows = readStorageJson(WINAMAX_IMPORT_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function loadSavedStrategies() {
    const rows = readStorageJson(SAVED_STRATEGIES_KEY, []);
    return Array.isArray(rows) ? rows : [];
  }

  function saveSavedStrategies(rows) {
    writeStorageJson(SAVED_STRATEGIES_KEY, Array.isArray(rows) ? rows : []);
  }

  function loadFavorites() {
    const raw = readStorageJson(FAVORITES_KEY, {});
    const clean = (rows) => Array.from(new Set((Array.isArray(rows) ? rows : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean))).slice(0, 80);
    return {
      teams: clean(raw.teams),
      players: clean(raw.players)
    };
  }

  function saveFavorites(favorites) {
    const clean = {
      teams: Array.from(new Set((favorites?.teams || []).map((item) => String(item || '').trim()).filter(Boolean))).slice(0, 80),
      players: Array.from(new Set((favorites?.players || []).map((item) => String(item || '').trim()).filter(Boolean))).slice(0, 80)
    };
    writeStorageJson(FAVORITES_KEY, clean);
    scheduleProfileBackup();
    return clean;
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
      favorites: loadFavorites(),
      webEnrichment: readStorageJson(WEB_ENRICHMENT_KEY, null),
      modelAdjustments: readStorageJson(MODEL_ADJUSTMENTS_KEY, null),
      lossFeedbacks: readStorageJson(LOSS_FEEDBACK_KEY, []),
      bankrollTransactions: readStorageJson(BANKROLL_TRANSACTIONS_KEY, []),
      weeklyReports: readStorageJson(WEEKLY_REPORT_KEY, []),
      autoTrackingAudit: readStorageJson(AUTO_TRACKING_AUDIT_KEY, []),
      winamaxImports: readStorageJson(WINAMAX_IMPORT_KEY, []),
      savedStrategies: readStorageJson(SAVED_STRATEGIES_KEY, []),
      liveNewsWatcher: readStorageJson(LIVE_NEWS_KEY, {}),
      sportPatterns: readStorageJson(SPORT_PATTERNS_KEY, {})
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
    if (profile.favorites) {
      const currentFavorites = replace ? { teams: [], players: [] } : loadFavorites();
      saveFavorites({
        teams: [...(currentFavorites.teams || []), ...(profile.favorites.teams || [])],
        players: [...(currentFavorites.players || []), ...(profile.favorites.players || [])]
      });
    }
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
      [LOSS_FEEDBACK_KEY, profile.lossFeedbacks],
      [BANKROLL_TRANSACTIONS_KEY, profile.bankrollTransactions],
      [WEEKLY_REPORT_KEY, profile.weeklyReports],
      [AUTO_TRACKING_AUDIT_KEY, profile.autoTrackingAudit],
      [WINAMAX_IMPORT_KEY, profile.winamaxImports],
      [SAVED_STRATEGIES_KEY, profile.savedStrategies],
      [LIVE_NEWS_KEY, profile.liveNewsWatcher],
      [SPORT_PATTERNS_KEY, profile.sportPatterns]
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

  function recordUserAction(action, detail = '') {
    const entry = {
      at: new Date().toISOString(),
      action: String(action || 'action').slice(0, 80),
      detail: String(detail || '').slice(0, 180)
    };
    state.actionTrail.push(entry);
    state.actionTrail = state.actionTrail.slice(-60);
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

  function appStateForBugReport() {
    const prefs = loadPreferences();
    return {
      tab: $('.tab-panel.active')?.dataset.panel || 'unknown',
      picksVisible: Number($('#metric-picks')?.textContent || 0) || state.picks.length,
      trackedBets: loadUserBets().length,
      bankrollPresent: Boolean(prefs.bankroll),
      demoMode: Boolean(prefs.demoMode),
      expertMode: Boolean(prefs.expertMode),
      theme: prefs.theme || 'dark',
      autoUpdateEnabled: prefs.autoUpdateEnabled !== false,
      webhookConfigured: Boolean(prefs.webhookUrl),
      aiConfigured: Boolean(prefs.aiApiKey),
      dataStatus: state.status?.status || null,
      refreshRunning: Boolean(state.status?.refresh?.running)
    };
  }

  function bugReportPayload(type, description, error) {
    const prefs = loadPreferences();
    return {
      type,
      description,
      error: error ? {
        message: error.message || String(error),
        stack: error.stack || '',
        name: error.name || ''
      } : null,
      actions: state.actionTrail,
      appState: appStateForBugReport(),
      config: prefs.webhookUrl ? { type: prefs.webhookType || 'generic', url: prefs.webhookUrl } : {}
    };
  }

  async function sendBugReport({ type = 'manual', description = '', error = null } = {}) {
    const payload = bugReportPayload(type, description, error);
    const response = await fetchJson('/api/bug-report/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    writeStorageJson(BUG_REPORTS_KEY, response.reports || []);
    pushLog(response.report?.sent ? 'info' : 'warn', response.report?.sent ? 'Rapport bug envoyé' : 'Rapport bug sauvegardé localement', response.report);
    return response;
  }

  function showBugReportModal({ type = 'manual', description = '', error = null } = {}) {
    state.bugReportDraft = { type, description, error };
    const modal = $('#bug-report-modal');
    const textarea = $('#bug-report-description');
    const status = $('#bug-report-status');
    if (textarea) textarea.value = description || (error ? String(error.message || error).slice(0, 500) : '');
    if (status) status.textContent = 'Le rapport est anonymisé : pas de clé API, pas de montant, pas de détail de pari.';
    modal?.classList.remove('hidden');
  }

  function closeBugReportModal() {
    $('#bug-report-modal')?.classList.add('hidden');
    state.bugReportDraft = null;
  }

  function renderBugReportList() {
    const node = $('#bug-report-list');
    if (!node) return;
    const reports = readStorageJson(BUG_REPORTS_KEY, []);
    if (!Array.isArray(reports) || !reports.length) {
      node.textContent = 'Aucun rapport de bug local.';
      return;
    }
    node.innerHTML = reports.slice(0, 4).map((report) => `
      <div class="bug-report-row">
        <div>
          <strong>${escapeHtml(report.type || 'rapport')}</strong>
          <small>${escapeHtml(report.description || report.id || 'Sans description')}</small>
        </div>
        <span class="shortcut-key">${escapeHtml(report.sent ? 'envoyé' : 'local')}</span>
      </div>
    `).join('');
  }

  async function loadBugReports() {
    try {
      const response = await fetchJson('/api/bug-report/list');
      writeStorageJson(BUG_REPORTS_KEY, response.reports || []);
      renderBugReportList();
    } catch (error) {
      pushLog('warn', `Rapports bug indisponibles: ${error.message}`);
    }
  }

  function installGlobalErrorReporting() {
    window.addEventListener('error', (event) => {
      const prefs = loadPreferences();
      const error = event.error || new Error(event.message || 'Erreur inconnue');
      pushLog('error', `Erreur app: ${error.message || event.message}`);
      if (prefs.bugReportPrompt !== false && localStorage.getItem(BUG_REPORT_PROMPT_KEY) !== 'never') {
        showBugReportModal({ type: 'auto-error', description: 'Erreur détectée automatiquement.', error });
      } else {
        sendBugReport({ type: 'auto-error', description: 'Erreur détectée automatiquement.', error }).catch(() => {});
      }
    });
    window.addEventListener('unhandledrejection', (event) => {
      const prefs = loadPreferences();
      const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason || 'Promise rejetée'));
      pushLog('error', `Erreur async: ${reason.message}`);
      if (prefs.bugReportPrompt !== false && localStorage.getItem(BUG_REPORT_PROMPT_KEY) !== 'never') {
        showBugReportModal({ type: 'auto-rejection', description: 'Erreur asynchrone détectée.', error: reason });
      } else {
        sendBugReport({ type: 'auto-rejection', description: 'Erreur asynchrone détectée.', error: reason }).catch(() => {});
      }
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

  function parisDateParts(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (!date || Number.isNaN(date.getTime())) return null;
    const out = {};
    for (const part of new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date)) {
      if (part.type !== 'literal') out[part.type] = part.value;
    }
    const hour = Number(String(out.hour || '0').replace('24', '0'));
    return {
      day: `${out.year}-${out.month}-${out.day}`,
      hour: Number.isFinite(hour) ? hour : 0,
      minute: Number(out.minute || 0) || 0
    };
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

  function loadBankrollTransactions() {
    const rows = readStorageJson(BANKROLL_TRANSACTIONS_KEY, []);
    return (Array.isArray(rows) ? rows : [])
      .filter((row) => row && typeof row === 'object')
      .map((row) => ({
        id: row.id || `tx-${Date.parse(row.date || row.createdAt || new Date())}-${Math.random().toString(36).slice(2, 8)}`,
        date: row.date || row.createdAt || new Date().toISOString().slice(0, 10),
        type: row.type === 'withdrawal' ? 'withdrawal' : 'deposit',
        amount: Math.max(0, Number(row.amount || 0) || 0)
      }))
      .filter((row) => row.amount > 0)
      .sort((a, b) => Date.parse(b.date || '') - Date.parse(a.date || ''));
  }

  function saveBankrollTransactions(rows) {
    writeStorageJson(BANKROLL_TRANSACTIONS_KEY, Array.isArray(rows) ? rows : []);
    scheduleProfileBackup();
  }

  function bankrollAccounting() {
    const stats = userBetStats();
    const transactions = loadBankrollTransactions();
    const deposits = transactions.filter((row) => row.type === 'deposit').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const withdrawals = transactions.filter((row) => row.type === 'withdrawal').reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const netDeposits = deposits - withdrawals;
    const currentValue = Math.max(0, getBankroll() + Number(stats.pnlTotal || 0));
    const bankrollRoi = netDeposits > 0 ? (currentValue - netDeposits) / netDeposits : null;
    const bettingRoi = stats.settledStake > 0 ? stats.pnlTotal / stats.settledStake : null;
    const monthlyRoi = bankrollRoi == null ? 0 : bankrollRoi / Math.max(1, Math.min(12, transactions.length || 1));
    return {
      transactions,
      deposits,
      withdrawals,
      netDeposits,
      currentValue,
      bankrollRoi,
      bettingRoi,
      projections: [3, 6, 12].map((months) => ({
        months,
        value: currentValue * (1 + monthlyRoi * months)
      }))
    };
  }

  function renderBankrollAccounting() {
    const list = $('#bankroll-transaction-list');
    const grid = $('#bankroll-accounting-grid');
    const chart = $('#bankroll-projection-chart');
    const dateInput = $('#bankroll-tx-date');
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
    const accounting = bankrollAccounting();
    if (list) {
      list.innerHTML = accounting.transactions.length
        ? accounting.transactions.slice(0, 6).map((row) => `${escapeHtml(row.date)} · ${row.type === 'withdrawal' ? 'Retrait' : 'Dépôt'} ${formatMoney(row.amount)}`).join('<br>')
        : 'Aucun mouvement enregistré.';
    }
    if (grid) {
      grid.innerHTML = [
        ['Dépôts nets', formatMoney(accounting.netDeposits), `${formatMoney(accounting.deposits)} déposés · ${formatMoney(accounting.withdrawals)} retirés`],
        ['Valeur actuelle', formatMoney(accounting.currentValue), 'Bankroll réglée + P&L suivi local'],
        ['ROI bankroll', accounting.bankrollRoi == null ? '-' : formatPct(accounting.bankrollRoi, 1), 'Avec dépôts et retraits'],
        ['ROI paris', accounting.bettingRoi == null ? '-' : formatPct(accounting.bettingRoi, 1), 'P&L paris / total misé']
      ].map(([label, value, detail]) => `
        <article class="metric">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
          <small>${escapeHtml(detail)}</small>
        </article>
      `).join('');
    }
    if (chart) {
      const points = [accounting.currentValue, ...accounting.projections.map((row) => row.value)];
      chart.innerHTML = `
        ${sparklineSvg(points)}
        <div class="match-sub">Projection simple : 3 mois ${formatMoney(accounting.projections[0]?.value || 0)} · 6 mois ${formatMoney(accounting.projections[1]?.value || 0)} · 12 mois ${formatMoney(accounting.projections[2]?.value || 0)}</div>
      `;
    }
  }

  function parseWinamaxPaste(text) {
    return String(text || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 8)
      .map((line, index) => {
        const odd = Number((line.match(/(?:cote|@)\s*:?\s*(\d+[,.]\d{1,2})/i)?.[1] || '').replace(',', '.'));
        const stakeToken = line.match(/(?:mise|stake)\s*:?\s*(\d+[,.]?\d*)\s*€?/i)?.[1]
          || line.match(/\b(\d+[,.]?\d*)\s*€/i)?.[1]
          || '';
        const stake = Number(stakeToken.replace(',', '.'));
        const status = /gagn|won/i.test(line) ? 'won' : /perd|lost/i.test(line) ? 'lost' : /void|annul|rembours/i.test(line) ? 'void' : 'pending';
        const date = line.match(/\b(\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?)\b/)?.[1] || new Date().toISOString().slice(0, 10);
        const match = line
          .replace(/(?:cote|mise|stake|gagné|perdu|pending|en cours|won|lost|void|annulé|remboursé)/ig, ' ')
          .replace(/\d+[,.]?\d*\s*€?/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return {
          id: `wmx-${Date.now()}-${index}`,
          raw: line,
          date,
          match: match || line.slice(0, 80),
          market: /buteur/i.test(line) ? 'Buteur' : /plus|moins|over|under/i.test(line) ? 'Plus/Moins' : /marquent|btts/i.test(line) ? 'Les deux équipes marquent' : 'Vainqueur',
          odd: Number.isFinite(odd) && odd > 1 ? odd : null,
          stake: Number.isFinite(stake) && stake > 0 ? stake : null,
          status
        };
      });
  }

  function reconcileWinamaxRows(importRows = loadWinamaxImports()) {
    const appBets = loadUserBets();
    const appKeys = appBets.map((bet) => ({ bet, key: compactUiKey(`${bet.title || ''} ${bet.label || ''} ${bet.market || ''}`) }));
    return importRows.map((row) => {
      const key = compactUiKey(`${row.match || ''} ${row.market || ''}`);
      const match = appKeys.find(({ key: appKey }) => key && appKey && (appKey.includes(key.slice(0, 14)) || key.includes(appKey.slice(0, 14))));
      const stakeDiff = match && row.stake != null ? Number(row.stake || 0) - Number(match.bet.stake || 0) : 0;
      return {
        ...row,
        appBetId: match?.bet?.id || null,
        reconciliation: match ? (Math.abs(stakeDiff) > 0.25 ? 'amount_diff' : 'tracked') : 'not_tracked',
        stakeDiff
      };
    });
  }

  function renderWinamaxImportPreview() {
    const node = $('#winamax-import-preview');
    if (!node) return;
    const preview = state.winamaxImportPreview || [];
    const confirmed = reconcileWinamaxRows();
    const rows = preview.length ? preview : confirmed.slice(-6).reverse();
    if (!rows.length) {
      node.textContent = 'Aucun import Winamax analysé.';
      return;
    }
    node.innerHTML = rows.slice(0, 8).map((row) => {
      const status = row.reconciliation === 'tracked' ? '✓ Suivi dans l’app' : row.reconciliation === 'amount_diff' ? 'Montant différent' : row.reconciliation === 'not_tracked' ? 'Non suivi' : 'À confirmer';
      return `${escapeHtml(row.match || '-')} · ${escapeHtml(row.market || '-')} · ${row.odd ? formatOdd(row.odd) : '-'} · ${row.stake ? formatMoney(row.stake) : '-'} · ${escapeHtml(status)}`;
    }).join('<br>');
  }

  function previewWinamaxImport() {
    const rows = parseWinamaxPaste($('#winamax-import-paste')?.value || '');
    state.winamaxImportPreview = reconcileWinamaxRows(rows);
    renderWinamaxImportPreview();
    setSideStatus(rows.length ? `${formatCount(rows.length)} pari(s) Winamax détecté(s)` : 'Aucune ligne Winamax détectée', rows.length ? 'ok' : 'warn');
  }

  function confirmWinamaxImport() {
    const rows = state.winamaxImportPreview?.length ? state.winamaxImportPreview : reconcileWinamaxRows(parseWinamaxPaste($('#winamax-import-paste')?.value || ''));
    if (!rows.length) {
      setSideStatus('Import Winamax vide', 'warn');
      return;
    }
    const merged = [...loadWinamaxImports(), ...rows.map((row) => ({ ...row, importedAt: new Date().toISOString() }))].slice(-1000);
    writeStorageJson(WINAMAX_IMPORT_KEY, merged);
    state.winamaxImportPreview = null;
    if ($('#winamax-import-paste')) $('#winamax-import-paste').value = '';
    renderWinamaxImportPreview();
    renderWinamaxReconciliation();
    renderHistory();
    setSideStatus('Import Winamax confirmé', 'ok');
  }

  function winamaxReconciliationSummary() {
    const rows = reconcileWinamaxRows();
    const stake = rows.reduce((sum, row) => sum + Number(row.stake || 0), 0);
    const pnl = rows.reduce((sum, row) => {
      if (row.status === 'won') return sum + Number(row.stake || 0) * (Number(row.odd || 1) - 1);
      if (row.status === 'lost') return sum - Number(row.stake || 0);
      return sum;
    }, 0);
    const tracked = rows.filter((row) => row.reconciliation === 'tracked').length;
    const missing = rows.filter((row) => row.reconciliation === 'not_tracked').length;
    const diff = rows.filter((row) => row.reconciliation === 'amount_diff').length;
    const app = userBetStats();
    return { rows, stake, pnl, roi: stake > 0 ? pnl / stake : null, tracked, missing, diff, app };
  }

  function renderWinamaxReconciliation() {
    const grid = $('#winamax-reconciliation-grid');
    if (!grid) return;
    const summary = winamaxReconciliationSummary();
    if (!summary.rows.length) {
      grid.innerHTML = '<div class="empty">Aucun import Winamax confirmé.</div>';
      return;
    }
    const appPnl = Number(summary.app.pnlTotal || 0);
    grid.innerHTML = [
      ['Solde Winamax importé', formatMoney(summary.pnl), `ROI réel ${summary.roi == null ? '-' : formatPct(summary.roi, 1)} · mise ${formatMoney(summary.stake)}`],
      ['App locale', formatMoney(appPnl), `${formatCount(summary.app.pending || 0)} en cours · ${formatCount(summary.app.settled || 0)} réglés`],
      ['Écart', formatMoney(summary.pnl - appPnl), `${formatCount(summary.missing)} non suivi(s) · ${formatCount(summary.diff)} montant(s) différent(s)`],
      ['Réconciliés', `${formatCount(summary.tracked)}/${formatCount(summary.rows.length)}`, '✓ Suivi dans l’app vs historique Winamax collé']
    ].map(([label, value, detail]) => `
      <article class="metric">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(detail)}</small>
      </article>
    `).join('');
  }

  function addBankrollTransaction() {
    const amount = Number($('#bankroll-tx-amount')?.value || 0);
    if (!(amount > 0)) {
      setSideStatus('Montant bankroll invalide', 'warn');
      return;
    }
    const row = {
      id: `tx-${Date.now()}`,
      date: $('#bankroll-tx-date')?.value || new Date().toISOString().slice(0, 10),
      type: $('#bankroll-tx-type')?.value === 'withdrawal' ? 'withdrawal' : 'deposit',
      amount
    };
    const rows = [row, ...loadBankrollTransactions()];
    saveBankrollTransactions(rows);
    if ($('#bankroll-tx-amount')) $('#bankroll-tx-amount').value = '';
    renderBankrollAccounting();
    renderHistory();
    setSideStatus(row.type === 'withdrawal' ? 'Retrait enregistré' : 'Dépôt enregistré', 'ok');
  }

  function mondayKeyFor(date = new Date()) {
    const copy = new Date(date);
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() - day + 1);
    return parisDayKey(copy);
  }

  function buildWeeklyReport() {
    const stats = userBetStats();
    const bets = loadUserBets();
    const monday = mondayKeyFor();
    const weekRows = bets.filter((bet) => String(bet.day || bet.createdAt || '').slice(0, 10) >= monday);
    const stake = weekRows.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);
    const pnl = weekRows.reduce((sum, bet) => sum + Number(bet.pnl || 0), 0);
    const won = weekRows.filter((bet) => bet.status === 'won').length;
    const lost = weekRows.filter((bet) => bet.status === 'lost').length;
    const roi = stake > 0 ? pnl / stake : 0;
    const actionItems = [];
    if (stats.worstSegment && Number(stats.worstSegment.settledStake || 0) > 0) actionItems.push(`Réduire ${stats.worstSegment.sport} ${stats.worstSegment.league} tant que le ROI reste froid.`);
    if (stats.bestSegment && Number(stats.bestSegment.settledStake || 0) > 0) actionItems.push(`Prioriser ${stats.bestSegment.sport} ${stats.bestSegment.league}, ton meilleur segment suivi.`);
    if (stats.pending > 6) actionItems.push('Limiter les nouveaux tickets avant de régler les pending.');
    if (!actionItems.length) actionItems.push('Continuer en single discipliné, mise proportionnée, pas de pari forcé.');
    const report = {
      id: `week-${monday}`,
      weekStart: monday,
      generatedAt: new Date().toISOString(),
      stats: {
        pnl,
        roi,
        winRate: (won + lost) ? won / (won + lost) : 0,
        won,
        lost,
        bets: weekRows.length
      },
      bestSegment: stats.bestSegment || null,
      worstSegment: stats.worstSegment || null,
      actionItems: actionItems.slice(0, 3)
    };
    const stored = readStorageJson(WEEKLY_REPORT_KEY, []);
    const next = [report, ...(Array.isArray(stored) ? stored : []).filter((row) => row.id !== report.id)].slice(0, 30);
    writeStorageJson(WEEKLY_REPORT_KEY, next);
    state.weeklyReport = report;
    return report;
  }

  function renderWeeklyReportModal(report = state.weeklyReport || buildWeeklyReport()) {
    const modal = $('#weekly-report-modal');
    const content = $('#weekly-report-content');
    if (!modal || !content) return;
    $('#weekly-report-subtitle').textContent = `Semaine du ${report.weekStart} · ${formatCount(report.stats.bets)} pari(s) suivis.`;
    content.innerHTML = [
      ['P&L semaine', formatMoney(report.stats.pnl), `ROI ${formatPct(report.stats.roi, 1)}`],
      ['Win rate', formatPct(report.stats.winRate, 0), `${formatCount(report.stats.won)}W / ${formatCount(report.stats.lost)}L`],
      ['Top segment', report.bestSegment ? `${report.bestSegment.sport}` : '-', report.bestSegment ? `${report.bestSegment.league} · ${formatMoney(report.bestSegment.pnl)}` : 'Sample insuffisant'],
      ['À corriger', report.worstSegment ? `${report.worstSegment.sport}` : '-', report.worstSegment ? `${report.worstSegment.league} · ${formatMoney(report.worstSegment.pnl)}` : 'Rien de robuste'],
      ['Action', report.actionItems[0] || 'Discipline', report.actionItems.slice(1).join(' · ') || 'Simple et prudent']
    ].map(([label, value, detail]) => `
      <article class="glossary-card">
        <strong>${escapeHtml(label)}</strong>
        <p><b>${escapeHtml(value)}</b><br>${escapeHtml(detail)}</p>
      </article>
    `).join('');
    modal.classList.remove('hidden');
  }

  function maybeShowWeeklyReport({ force = false } = {}) {
    const now = new Date();
    const key = mondayKeyFor(now);
    if (!force && now.getDay() !== 1) return;
    if (!force && localStorage.getItem(WEEKLY_REPORT_SEEN_KEY) === key) return;
    const report = buildWeeklyReport();
    localStorage.setItem(WEEKLY_REPORT_SEEN_KEY, key);
    renderWeeklyReportModal(report);
  }

  async function exportWeeklyReportPdf() {
    const report = state.weeklyReport || buildWeeklyReport();
    const lines = [
      `Semaine du ${report.weekStart}`,
      `P&L: ${formatMoney(report.stats.pnl)}`,
      `ROI: ${formatPct(report.stats.roi, 1)}`,
      `Win rate: ${formatPct(report.stats.winRate, 0)} (${report.stats.won}W/${report.stats.lost}L)`,
      `Top segment: ${report.bestSegment ? `${report.bestSegment.sport} ${report.bestSegment.league}` : 'sample insuffisant'}`,
      `Segment a corriger: ${report.worstSegment ? `${report.worstSegment.sport} ${report.worstSegment.league}` : 'aucun'}`,
      ...report.actionItems.map((item, index) => `Action ${index + 1}: ${item}`)
    ];
    const response = await fetch('/api/report/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: `rapport-hebdo-${report.weekStart}.pdf`,
        title: 'Rapport hebdo Paris-Sportif',
        lines
      })
    });
    if (!response.ok) throw new Error(`Export PDF HTTP ${response.status}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-hebdo-${report.weekStart}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setSideStatus('Rapport hebdo exporté', 'ok');
  }

  function closeWeeklyReportModal() {
    $('#weekly-report-modal')?.classList.add('hidden');
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

  function rowKickoffTime(row) {
    return Date.parse(row?.start || row?.date || row?.kickoff || row?.match?.date || '');
  }

  function isBeforeKickoff(row) {
    const ts = rowKickoffTime(row);
    return Number.isFinite(ts) && ts > Date.now();
  }

  function canDisplayPickCard(row) {
    return Boolean(
      pickHasCoreData(row) &&
      isBeforeKickoff(row) &&
      row?.status !== 'skip' &&
      row?.safeAssessment?.displayable !== false
    );
  }

  function isReadyToStakeRow(row) {
    return Boolean(pickHasCoreData(row) && canDisplayPickCard(row) && canDisplayStake(row));
  }

  function isRolling24hRow(row) {
    const ts = rowKickoffTime(row);
    return Number.isFinite(ts) && ts > Date.now() && ts <= Date.now() + 24 * 60 * 60 * 1000;
  }

  function rolling24hRows(rows = state.picks, predicate = canDisplayPickCard) {
    return (Array.isArray(rows) ? rows : [])
      .filter((row) => pickHasCoreData(row) && isRolling24hRow(row) && predicate(row))
      .sort((a, b) => Date.parse(a.start || '') - Date.parse(b.start || '') || priorityValue(b) - priorityValue(a));
  }

  function rollingReadyRows(rows = state.picks) {
    return rolling24hRows(rows, isReadyToStakeRow);
  }

  function nightPickRows(rows = state.picks, predicate = canDisplayPickCard) {
    return rolling24hRows(rows, predicate).filter((row) => {
      const parts = parisDateParts(row.start);
      const hour = parts?.hour ?? new Date(row.start).getHours();
      return hour >= 0 && hour < 7;
    });
  }

  function isTodayPick(row) {
    return pickDayKey(row) === parisDayKey();
  }

  function todayReadyRows(rows = state.picks) {
    return (Array.isArray(rows) ? rows : []).filter((row) => pickHasCoreData(row) && isTodayPick(row) && canDisplayStake(row));
  }

  function todayWatchRows(rows = state.picks) {
    return (Array.isArray(rows) ? rows : []).filter((row) => pickHasCoreData(row) && isTodayPick(row) && canDisplayPickCard(row) && !canDisplayStake(row));
  }

  function renderMorningDashboard() {
    const title = $('#morning-title');
    const subtitle = $('#morning-subtitle');
    const grid = $('#morning-grid');
    const strip = $('#imminent-strip');
    if (!grid) return;
    const rows = rollingReadyRows(state.picks);
    const readyToday = todayReadyRows(state.picks);
    const watchToday = todayWatchRows(state.picks);
    const todayVisible = [...readyToday, ...watchToday];
    const bigRows = rows.filter((row) => displayEdgeValue(row) >= 0.10);
    const ultimate = ultimateBetCandidate(rows);
    const nextPick = (todayVisible.length ? todayVisible : rows)
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
        ? `${formatCount(rows.length)} pari(s) prêt(s) sur 24h`
        : watchToday.length
          ? `Avant minuit : ${formatCount(watchToday.length)} opportunité(s) à surveiller`
          : ultimate
            ? `Bet ultime : ${ultimate.title}`
            : rows.length
              ? `${formatCount(rows.length)} pari(s) prêt(s) à venir`
              : 'Bonjour, aucun pari prêt pour l’instant';
    }
    if (subtitle) {
      subtitle.textContent = !rows.length && watchToday.length
        ? `${formatCount(watchToday.length)} opportunité(s) à surveiller avant minuit, mais aucune mise n’est validée.`
        : ultimate
        ? `PARI : ${userBetLabel(ultimate)} · COTE : ${formatOdd(ultimate.odd)} · MISE : ${visibleStakeText(ultimate)} · départ ${countdownLabel(ultimate.start)}.`
        : nextPick
        ? `Prochain match dans ${countdownLabel(nextPick.start)} : ${nextPick.title}, ${userBetLabel(nextPick)}.`
        : 'Le cockpit reste utile : surveille les données, prépare les combinés ou relance un refresh.';
    }
    grid.innerHTML = [
      ['Prêts 24h', formatCount(rows.length), rows.length ? `${formatCount(bigRows.length)} très bons signaux · ${formatCount(state.allPicks.length || 0)} analysés` : `${formatCount(watchToday.length)} à surveiller avant minuit · ${formatCount(state.allPicks.length || 0)} analysés`],
      ['Prochain match', nextPick ? countdownLabel(nextPick.start) : '-', nextPick ? `${nextPick.title} · ${userBetLabel(nextPick)}` : 'Aucun départ proche'],
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

  function modelStakeAmount(row) {
    const prefs = loadPreferences();
    const bankroll = getBankroll();
    const maxStake = bankroll * Math.max(0.1, Number(prefs.maxStakePct || 5)) / 100;
    if (prefs.stakeMode === 'flat') {
      return Math.max(0, Number((bankroll * Math.max(0.1, Number(prefs.flatUnitPct || 1)) / 100 * specialStakeMultiplier(row)).toFixed(2)));
    }
    const modelStake = Math.max(0, Number(row?.stake || row?.decisionCenter?.stake || 0) || 0);
    return Math.max(0, Number((Math.min(modelStake, maxStake) * specialStakeMultiplier(row)).toFixed(2)));
  }

  function allocationConfig(prefs = loadPreferences()) {
    const base = ALLOCATION_STRATEGIES[prefs.allocationStrategy] || ALLOCATION_STRATEGIES.moderate;
    const customPct = Number(prefs.dailyBudgetPct);
    return {
      ...base,
      budgetPct: Number.isFinite(customPct) && customPct > 0 ? customPct : base.budgetPct
    };
  }

  function sortedPriorityRows(rows = state.picks) {
    return (Array.isArray(rows) ? rows : [])
      .filter((row) => pickHasCoreData(row) && canDisplayStake(row))
      .slice()
      .sort((a, b) => (
        priorityValue(b) - priorityValue(a) ||
        displayEdgeValue(b) - displayEdgeValue(a) ||
        safeConfidenceValue(b) - safeConfidenceValue(a) ||
        Date.parse(a.start || '') - Date.parse(b.start || '')
      ));
  }

  function dailyBudgetPlan(rows = state.picks, prefs = loadPreferences()) {
    const config = allocationConfig(prefs);
    const bankroll = Math.max(1, getBankroll());
    const budget = bankroll * Math.max(0.1, Number(config.budgetPct || 5)) / 100;
    const candidates = sortedPriorityRows(rows).slice(0, config.maxPicks);
    const rawShares = candidates.map((_, index) => ALLOCATION_SHARES[index] || 2);
    const totalRaw = rawShares.reduce((sum, value) => sum + value, 0) || 1;
    const rowsOut = candidates.map((row, index) => {
      const sharePct = rawShares[index] / totalRaw;
      const allocated = budget * sharePct;
      const cap = modelStakeAmount(row);
      const stake = Math.max(0, Number(Math.min(allocated, cap).toFixed(2)));
      return {
        row,
        key: userBetKey(row),
        rank: index + 1,
        sharePct,
        allocated,
        cap,
        stake
      };
    });
    return {
      config,
      bankroll,
      budget,
      rows: rowsOut,
      used: rowsOut.reduce((sum, item) => sum + item.stake, 0),
      available: Math.max(0, budget - rowsOut.reduce((sum, item) => sum + item.stake, 0))
    };
  }

  function allocationForRow(row) {
    if (!canDisplayStake(row)) return null;
    const planRows = state.currentDashboardRows?.length ? state.currentDashboardRows : state.picks;
    const plan = dailyBudgetPlan(planRows);
    return plan.rows.find((item) => item.key === userBetKey(row)) || null;
  }

  function allocationSummaryText(row) {
    const allocation = allocationForRow(row);
    if (!allocation) return 'Hors budget jour';
    return `#${allocation.rank} budget · ${formatPct(allocation.sharePct, 0)} du budget jour`;
  }

  function allocationLongText(row) {
    const allocation = allocationForRow(row);
    if (!allocation) return 'Hors budget jour : ce pick reste visible, mais la stratégie du jour favorise les meilleurs priorisés.';
    return `Mise suggérée ${formatMoney(allocation.stake)} · ${formatPct(allocation.sharePct, 0)} du budget jour · cap modèle ${formatMoney(allocation.cap)}.`;
  }

  function displayStakeAmount(row) {
    if (!canDisplayStake(row)) return 0;
    const allocation = allocationForRow(row);
    if (allocation) return allocation.stake;
    return 0;
  }

  function renderDailyBudgetSummary() {
    const prefs = loadPreferences();
    const plan = dailyBudgetPlan(state.currentDashboardRows?.length ? state.currentDashboardRows : state.picks, prefs);
    const summary = $('#daily-budget-summary');
    const used = $('#daily-budget-used');
    const detail = $('#daily-budget-detail');
    if (summary) summary.textContent = `${plan.config.label} · ${formatMoney(plan.budget)} / jour`;
    if (used) used.textContent = `${formatMoney(plan.used)} alloués`;
    if (detail) {
      detail.textContent = `${formatCount(plan.rows.length)} pari(s) dans le plan · reste ${formatMoney(plan.available)}`;
    }
    const grid = $('#bankroll-allocation-grid');
    if (!grid) return;
    if (!plan.rows.length) {
      grid.innerHTML = '<div class="empty">Aucun pari prêt à allouer avec les règles actuelles.</div>';
      return;
    }
    grid.innerHTML = plan.rows.slice(0, plan.config.maxPicks).map((item) => `
      <article class="allocation-card clickable-row" data-match-id="${escapeHtml(item.row.id)}" tabindex="0" role="button">
        <span>${escapeHtml(`#${item.rank} · ${priorityText(item.row)}`)}</span>
        <strong>${escapeHtml(formatMoney(item.stake))}</strong>
        <p>${escapeHtml(item.row.title)} · ${escapeHtml(userBetLabel(item.row))}</p>
        <small>${escapeHtml(formatPct(item.sharePct, 0))} budget · avantage ${escapeHtml(formatPct(displayEdgeValue(item.row), 1))} · ${escapeHtml(countdownLabel(item.row.start))}</small>
      </article>
    `).join('');
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

  function antiTiltStatus(nextStake = 0, stats = userBetStats(), prefs = loadPreferences()) {
    if (prefs.antiTiltStrict === false) return { blocked: false, reasons: [] };
    const bets = todayTrackedBets();
    const now = Date.now();
    const recent30 = bets.filter((bet) => now - Date.parse(bet.createdAt || bet.placedAt || bet.day || '') <= 30 * 60 * 1000);
    const recent60Stake = bets
      .filter((bet) => now - Date.parse(bet.createdAt || bet.placedAt || bet.day || '') <= 60 * 60 * 1000)
      .reduce((sum, bet) => sum + (Number(bet.stake || 0) || 0), Number(nextStake || 0) || 0);
    const bankroll = Math.max(1, Number(prefs.bankroll || getBankroll() || 50));
    const sorted = bets.slice().sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
    const lastStake = Number(sorted[0]?.stake || 0) || 0;
    const lossStreak = currentLossStreak(stats);
    const reasons = [];
    if (recent30.length >= 5) reasons.push('5 paris ou plus en 30 minutes');
    if (recent60Stake >= bankroll * 0.10) reasons.push('plus de 10% de bankroll engagé en 1h');
    if (lossStreak >= 3 && lastStake > 0 && Number(nextStake || 0) >= lastStake * 3) reasons.push('martingale détectée après 3 défaites');
    if (lossStreak >= 4) reasons.push('série de défaites longue');
    return {
      blocked: reasons.length > 0,
      reasons,
      label: reasons[0] || 'Anti-tilt OK',
      detail: reasons.length ? `${reasons.join(' · ')}. Pause 1h recommandée.` : 'Rythme de mise stable.'
    };
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
    const antiTilt = antiTiltStatus(stake, stats, prefs);
    if (antiTilt.blocked) {
      return {
        allow: false,
        tone: 'danger',
        label: 'Pause recommandée',
        detail: antiTilt.detail,
        warnings: ['anti_tilt', ...antiTilt.reasons]
      };
    }
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
        // Sprint 78 F6 — Mode Coach anti-tilt : reduit la mise -50% automatiquement
        // si toggle coachReduceStake actif (default true).
        const reduce = prefs.coachReduceStake !== false;
        const detail = reduce
          ? `${formatCount(lossStreak)} défaites de suite. Mise auto réduite -50% pour limiter la casse. Reclique pour confirmer.`
          : `${formatCount(lossStreak)} défaites de suite. Reclique sur "Je mise" dans les 2 minutes si tu confirmes.`;
        return {
          allow: false,
          tone: 'warn',
          label: 'Coach : tilt protection',
          detail,
          warnings: ['loss_streak_confirm', reduce ? 'stake_reduced' : 'confirm_required'],
          stakeReductionFactor: reduce ? 0.5 : 1
        };
      }
    }
    const warnings = [];
    if (displayEdgeValue(row) < 0.05) warnings.push('edge_modere');
    return { allow: true, label: 'Coach OK', detail: 'Garde-fous personnels respectés.', warnings };
  }

  function clvPct(openOdd, closeOdd) {
    const open = Number(openOdd);
    const close = Number(closeOdd);
    if (!Number.isFinite(open) || !Number.isFinite(close) || open <= 1 || close <= 1) return null;
    return (open - close) / close;
  }

  function buildUserBetRecord(row, { stake = displayStakeAmount(row), source = 'manual', status = 'pending', tags = [], note = '', extra = {} } = {}) {
    const now = new Date();
    const prefs = loadPreferences();
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      key: userBetKey(row),
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
      edge: displayEdgeValue(row),
      edgeBucket: edgeBucketFor(row.edge),
      safeStatus: row.safeAssessment?.status || '',
      safeReliable: Boolean(row.safeAssessment?.reliable),
      priorityRank: Number(row.priorityRank || 0) || null,
      tier: row.calibration?.level || row.contextQuality?.tier || row.status || 'standard',
      marketKey: marketKeyFromRow(row),
      stakeMode: prefs.stakeMode || 'kelly',
      stake,
      status,
      pnl: 0,
      tags,
      note,
      trackingSource: source,
      day: parisDayKey(now),
      createdAt: now.toISOString(),
      ...extra
    };
  }

  function trackUserBet(row) {
    if (!row) return;
    if (!isBeforeKickoff(row)) {
      setSideStatus('Match déjà commencé : pari non suivi', 'warn');
      return;
    }
    if (!canDisplayStake(row)) return;
    recordUserAction('track-bet', row.title || row.label || '');
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
    const stake = displayStakeAmount(row);
    const coach = coachDecisionForBet(row, stake);
    if (!coach.allow) {
      setSideStatus(coach.label, coach.tone === 'danger' ? 'danger' : 'warn');
      notifyUser(coach.label, coach.detail, row);
      return;
    }
    bets.push(buildUserBetRecord(row, { stake, source: 'manual', extra: { coachWarnings: coach.warnings || [] } }));
    saveUserBets(bets);
    renderUserPnl();
    renderPicks();
    renderStakeScenarios();
    renderHistory();
    setSideStatus('Pari ajouté au suivi', 'ok');
    // Sprint 66 — toast confirmation visible (feedback explicite après "Je mise")
    try {
      const label = userBetLabel(row) || 'Pari';
      const odd = Number(row?.odd || 0);
      const oddStr = odd > 1 ? `@${odd.toFixed(2)}` : '';
      showToast(`✅ ${label} ajouté au suivi`, `${oddStr} · mise ${formatMoney(stake)}`, 'ok');
    } catch { /* noop */ }
  }

  function autoTrackingStopped() {
    const stopped = readStorageJson(AUTO_TRACKING_STOP_KEY, null);
    return stopped && stopped.day === parisDayKey();
  }

  function setAutoTrackingStopped(stopped = true) {
    if (stopped) writeStorageJson(AUTO_TRACKING_STOP_KEY, { day: parisDayKey(), at: new Date().toISOString() });
    else localStorage.removeItem(AUTO_TRACKING_STOP_KEY);
  }

  function autoTrackingAllowedLevel(row, level) {
    if (level === 'all') return true;
    if (level === 'safe') return Boolean(row.safeAssessment?.reliable || row.safeStatus === 'safe');
    return Number(row.priorityRank || 99) === 1 || Boolean(row.isUltimate || row.ultimate);
  }

  function withinAutoTrackingHours(prefs) {
    const now = new Date();
    const hour = Number(new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', hour12: false, timeZone: 'Europe/Paris' }).format(now));
    const start = Number(prefs.autoTrackingStartHour ?? 0);
    const end = Number(prefs.autoTrackingEndHour ?? 24);
    if (start === end) return true;
    return start < end ? hour >= start && hour < end : hour >= start || hour < end;
  }

  function autoTrackingEligibleRows() {
    const prefs = loadPreferences();
    if (!prefs.autoTrackingEnabled || !prefs.autoTrackingConfirmed || autoTrackingStopped()) return [];
    if (!withinAutoTrackingHours(prefs)) return [];
    const sports = new Set((prefs.autoTrackingSports || SPORTS_PREFS).map((item) => String(item).toLowerCase()));
    const markets = new Set((prefs.autoTrackingMarkets || DEFAULT_PREFERENCES.markets).map(normalizeUiKey));
    const minEdge = Number(prefs.autoTrackingEdgeMin || 0) / 100;
    const oddMin = Number(prefs.autoTrackingOddMin || 1.3);
    const oddMax = Number(prefs.autoTrackingOddMax || 6);
    return (state.picks || [])
      .filter((row) => canDisplayStake(row))
      .filter((row) => autoTrackingAllowedLevel(row, prefs.autoTrackingLevel || 'top'))
      .filter((row) => displayEdgeValue(row) >= minEdge)
      .filter((row) => Number(row.odd || 0) >= oddMin && Number(row.odd || 0) <= oddMax)
      .filter((row) => !sports.size || sports.has(String(row.sport || '').toLowerCase()))
      .filter((row) => !markets.size || markets.has(normalizeUiKey(marketGroupFromKey(marketKeyFromRow(row)))))
      .sort((a, b) => (Number(a.priorityRank || 99) - Number(b.priorityRank || 99)) || priorityValue(b) - priorityValue(a));
  }

  function runAutoTracking({ manual = false } = {}) {
    const prefs = loadPreferences();
    const now = Date.now();
    if (!manual && now - Number(state.autoTrackingLastRunAt || 0) < 60_000) return;
    state.autoTrackingLastRunAt = now;
    if (!prefs.autoTrackingEnabled || !prefs.autoTrackingConfirmed) {
      renderAutoTrackingAudit();
      return;
    }
    if (autoTrackingStopped()) {
      renderAutoTrackingAudit();
      return;
    }
    const today = parisDayKey();
    const existing = loadUserBets();
    let autoToday = existing.filter((bet) => bet.day === today && bet.trackingSource === 'auto').length;
    let auditToday = loadAutoTrackingAudit().filter((row) => row.day === today && ['tracked', 'dry-run'].includes(row.status)).length;
    const limit = Math.max(1, Number(prefs.autoTrackingDailyLimit || 1));
    const budget = Math.max(0, Number(prefs.autoTrackingDailyBudget || 0));
    let spent = existing.filter((bet) => bet.day === today && bet.trackingSource === 'auto').reduce((sum, bet) => sum + Number(bet.stake || 0), 0);
    const candidates = autoTrackingEligibleRows().filter((row) => !existing.some((bet) => bet.key === userBetKey(row) && bet.status === 'pending'));
    let changed = false;
    candidates.forEach((row) => {
      if (prefs.autoTrackingDryRun) {
        if (auditToday >= limit) return;
        const key = userBetKey(row);
        const already = loadAutoTrackingAudit().some((item) => item.day === today && item.key === key && item.status === 'dry-run');
        if (already) return;
        appendAutoTrackingAudit({ day: today, status: 'dry-run', key, title: row.title, label: userBetLabel(row), odd: row.odd, stake: displayStakeAmount(row), reason: 'Règles validées en dry-run.' });
        auditToday += 1;
        changed = true;
        return;
      }
      if (autoToday >= limit) return;
      const stake = displayStakeAmount(row);
      if (budget > 0 && spent + stake > budget) return;
      existing.push(buildUserBetRecord(row, {
        stake,
        source: 'auto',
        status: 'pending',
        tags: ['auto-tracking'],
        note: 'Auto-tracking supervisé : confirme le pari chez Winamax.',
        extra: { autoTracked: true, autoTrackingStatus: 'auto-tracked', undoUntil: new Date(Date.now() + 5 * 60_000).toISOString() }
      }));
      appendAutoTrackingAudit({ day: today, status: 'tracked', key: userBetKey(row), title: row.title, label: userBetLabel(row), odd: row.odd, stake, reason: 'Règles auto-tracking validées.' });
      notifyUser('Pari auto-tracké', `${userBetLabel(row)} · ${formatOdd(row.odd)} · mise ${formatMoney(stake)}. Ouvre Winamax pour confirmer.`, row);
      autoToday += 1;
      spent += stake;
      changed = true;
    });
    if (changed && !prefs.autoTrackingDryRun) {
      saveUserBets(existing);
      renderUserPnl();
      renderPicks();
      renderHistory();
    }
    renderAutoTrackingAudit();
    if (manual) setSideStatus(changed ? 'Auto-tracking exécuté' : 'Aucun pick ne passe les règles', changed ? 'ok' : 'warn');
  }

  function renderAutoTrackingAudit() {
    const node = $('#auto-tracking-audit');
    if (!node) return;
    const prefs = loadPreferences();
    const rows = loadAutoTrackingAudit().slice(-8).reverse();
    const status = prefs.autoTrackingEnabled && prefs.autoTrackingConfirmed && !autoTrackingStopped()
      ? (prefs.autoTrackingDryRun ? 'Dry-run actif' : 'Actif')
      : autoTrackingStopped() ? 'Stoppé pour aujourd’hui' : 'Inactif';
    node.innerHTML = `
      <strong>${escapeHtml(status)}</strong>
      <p>Règle : ${escapeHtml(prefs.autoTrackingLevel || 'top')} · edge min ${escapeHtml(`${prefs.autoTrackingEdgeMin || 0}%`)} · ${formatCount(prefs.autoTrackingDailyLimit || 0)} pari(s)/jour.</p>
      ${rows.length ? rows.map((row) => `<p>${escapeHtml(formatDateTime(row.at))} · ${escapeHtml(row.status)} · ${escapeHtml(row.title || '-')} · ${escapeHtml(row.label || '-')} · ${escapeHtml(row.stake != null ? formatMoney(row.stake) : '-')}</p>`).join('') : '<p>Aucun pick auto-tracké ou simulé.</p>'}
    `;
  }

  function stopAutoTracking() {
    setAutoTrackingStopped(true);
    const prefs = { ...loadPreferences(), autoTrackingEnabled: false };
    savePreferences(prefs);
    appendAutoTrackingAudit({ day: parisDayKey(), status: 'stopped', reason: 'Kill switch utilisateur.' });
    renderPreferences();
    setSideStatus('Auto-tracking stoppé', 'danger');
    notifyUser('Auto-tracking stoppé', 'Aucun nouveau pari ne sera auto-tracké aujourd’hui.');
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
    const coach = coachDecisionForBet({ ...combo, id: key, market: 'Combiné', label: readableComboTitle(combo), odd: combo.totalOdd, edge: combo.edge, sport: 'multi', league: combo.sameGame ? 'Même match' : 'Plusieurs matchs' }, stake);
    if (!coach.allow) {
      setSideStatus(coach.label, coach.tone === 'danger' ? 'danger' : 'warn');
      notifyUser(coach.label, coach.detail);
      return;
    }
    bets.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      key,
      matchId: key,
      title: readableComboTitle(combo) || 'Combiné',
      sport: 'multi',
      league: combo.sameGame ? 'Même match' : 'Plusieurs matchs',
      start: combo.legs[0]?.start || '',
      market: 'Combiné',
      label: combo.legs.map(readableComboLegLabel).join(' + '),
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
    // Sprint 66 — toast feedback explicit
    try {
      const legs = (combo?.legs || combo?.picks || []).length;
      const totalOdd = Number(combo?.totalOdd || combo?.combinedOdd || 0);
      const oddStr = totalOdd > 1 ? `@${totalOdd.toFixed(2)}` : '';
      showToast(`✅ Combiné ${legs} jambes ajouté`, `${oddStr}`, 'ok');
    } catch { /* noop */ }
  }

  function formatOdd(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 1 ? `@${n.toFixed(2)}` : '-';
  }

  function realConfidenceValue(row) {
    const adjusted = Number(row?.adjustedConfidence);
    if (Number.isFinite(adjusted) && adjusted > 0) return adjusted;
    const score = Number(row?.confidenceTrust?.adjustedScore);
    if (Number.isFinite(score) && score > 0) return score / 100;
    return pickConfidenceValue(row);
  }

  function segmentValidationTone(row) {
    const tone = String(row?.segmentValidation?.tone || row?.segmentValidation?.status || '');
    if (tone.includes('warm') || tone.includes('validated')) return 'warm';
    if (tone.includes('cold')) return 'cold';
    if (tone.includes('insufficient')) return 'sample';
    return 'tracked';
  }

  function segmentValidationHtml(row) {
    const validation = row?.segmentValidation || null;
    if (!validation) return '';
    const sample = Number(validation.sample || 0);
    const label = validation.label || (sample ? `${formatCount(sample)} picks similaires` : 'Sample insuffisant pour validation');
    const cls = segmentValidationTone(row);
    return `<div class="match-sub validation-note validation-${escapeHtml(cls)}">${escapeHtml(label)}</div>`;
  }

  function displayEdgeValue(row) {
    const value = Number(row?.safeEdge ?? row?.edge ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  function safeConfidenceValue(row) {
    const value = Number(row?.safeConfidence);
    if (Number.isFinite(value) && value > 0) return value;
    return realConfidenceValue(row);
  }

  function safeBadgeHtml(row) {
    const assessment = row?.safeAssessment || null;
    if (!assessment) return '';
    const status = assessment.status || 'watch';
    const cls = status === 'reliable' ? 'safe' : status === 'watch' ? 'watch' : 'danger';
    const label = row?.limitedConfidence
      ? 'Confiance limitée'
      : status === 'reliable' ? '✓ Fiable' : status === 'watch' ? 'À surveiller' : 'Écarté';
    const reason = (assessment.reasons || assessment.warnings || []).slice(0, 2).join(' · ') || 'Filtre fiable et safe';
    return `<span class="safe-pick-badge ${escapeHtml(cls)}" title="${escapeHtml(reason)}">${escapeHtml(label)}</span>`;
  }

  function edgeDisplayHtml(row) {
    const edge = displayEdgeValue(row);
    const raw = Number(row?.edge || 0);
    const capped = Boolean(row?.safeAssessment?.edgeCapped) && raw > edge + 0.001;
    const title = capped ? `Edge brut ${formatPct(raw, 1)} plafonné par prudence` : 'Edge prudent utilisé pour décider';
    return `<span title="${escapeHtml(title)}">${escapeHtml(formatPct(edge, 1))}</span>${capped ? '<div class="match-sub">edge prudent</div>' : ''}`;
  }

  function priorityValue(row) {
    const value = Number(row?.priorityScore || 0);
    return Number.isFinite(value) ? value : 0;
  }

  function priorityBadgeHtml(row) {
    if (!canDisplayStake(row)) return '';
    const rank = Number(allocationForRow(row)?.rank || row?.priorityRank || 0);
    if (!(rank > 0) || rank > 5) return '';
    const label = rank === 1 ? '🏆 TOP PICK' : `#${rank}`;
    const reason = row?.priority?.reason || `Priorité ${priorityValue(row).toFixed(1)}/100`;
    return `<span class="priority-badge ${rank === 1 ? 'top' : ''}" title="${escapeHtml(reason)}">${escapeHtml(label)}</span>`;
  }

  function segmentRoiValue(row) {
    const value = Number(row?.segmentValidation?.roi ?? row?.safeAssessment?.roi ?? row?.calibration?.roi ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  function segmentSampleValue(row) {
    const value = Number(row?.segmentValidation?.sample ?? row?.safeAssessment?.sample ?? row?.calibration?.sample ?? 0);
    return Number.isFinite(value) ? value : 0;
  }

  function isSurePickCandidate(row) {
    return canDisplayStake(row)
      && Boolean(row?.safeAssessment?.reliable)
      && displayEdgeValue(row) >= 0.12
      && safeConfidenceValue(row) >= 0.70
      && segmentRoiValue(row) >= 0
      && Number(row?.priorityRank || 99) <= 5;
  }

  function surePickKeys() {
    return new Set(
      sortedPriorityRows()
        .filter(isSurePickCandidate)
        .slice(0, 2)
        .map(userBetKey)
    );
  }

  function isLongShotValue(row) {
    return Boolean(row?.safeAssessment?.reliable)
      && Number(row?.odd || 0) >= 5
      && displayEdgeValue(row) >= 0.08
      && segmentSampleValue(row) >= 15
      && segmentRoiValue(row) >= 0;
  }

  function trendBucketForRow(row) {
    const audit = state.modelRealityAudit || {};
    const byKey = audit.byKey || {};
    const keys = [
      row?.segmentValidation?.segmentKey,
      row?.safeAssessment?.policy?.key,
      row?.segmentPolicy?.key,
      ...segmentKeysForRow(row)
    ].filter(Boolean).map((key) => String(key).toLowerCase());
    return keys.map((key) => byKey[key] || byKey[String(key).replace(/^market:/, 'market:')]).find(Boolean) || null;
  }

  function trendForRow(row) {
    const bucket = trendBucketForRow(row);
    if (!bucket) return null;
    const count = Number(bucket.count || 0);
    const roi = Number(bucket.roi || 0);
    const last60Roi = Number(bucket.last60Roi);
    const effectiveRoi = Number.isFinite(last60Roi) && Number(bucket.last60Count || 0) >= 10 ? last60Roi : roi;
    if (count >= 10 && effectiveRoi > 0.30) {
      return {
        tone: 'hot',
        label: 'Tendance forte',
        reason: `ROI ${formatPct(effectiveRoi, 0)} sur ${formatCount(count)} paris similaires`
      };
    }
    if (count >= 10 && effectiveRoi < -0.20) {
      return {
        tone: 'cold',
        label: 'Tendance froide',
        reason: `ROI ${formatPct(effectiveRoi, 0)} sur ${formatCount(count)} paris similaires`
      };
    }
    return null;
  }

  function recentMatchCount(side) {
    const rows = [
      ...(Array.isArray(side?.recent) ? side.recent : []),
      ...(Array.isArray(side?.matches) ? side.matches : []),
      ...(Array.isArray(side?.history?.recent) ? side.history.recent : [])
    ];
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return rows.filter((item) => Date.parse(item.date || item.start || item.kickoff || '') >= since).length;
  }

  function advancedSportsSignals(row) {
    const match = row?.match || {};
    const context = match.context || {};
    const availability = context.availability || {};
    const teams = context.teams || {};
    const signals = [];
    ['home', 'away'].forEach((sideKey) => {
      const side = availability[sideKey] || teams[sideKey] || {};
      const injuries = side.injuries || {};
      const severe = Number(injuries.severe || 0);
      const total = Number(injuries.total || (Array.isArray(side.injuries) ? side.injuries.length : 0));
      if (severe >= 3 || total >= 5) {
        signals.push({ tone: 'danger', label: 'Cluster blessures', detail: `${side.team || side.name || sideKey} · ${severe || total} absences clés`, impact: -0.06 });
      }
      const games7 = recentMatchCount(side);
      if (games7 >= 4) signals.push({ tone: 'warn', label: 'Fatigue forte', detail: `${side.team || side.name || sideKey} · ${games7} matchs en 7 jours`, impact: -0.08 });
      else if (games7 >= 3) signals.push({ tone: 'watch', label: 'Fatigue', detail: `${side.team || side.name || sideKey} · ${games7} matchs en 7 jours`, impact: -0.04 });
    });
    const coach = match.coach_change || context.coach_change || row.coachChange || null;
    const coachDays = Number(coach?.days || coach?.days_since || coach?.age_days);
    if (coach && (!Number.isFinite(coachDays) || coachDays <= 30)) {
      signals.push({ tone: 'warn', label: 'Nouveau coach', detail: `${coach.team || 'équipe'} depuis ${Number.isFinite(coachDays) ? `${Math.max(0, coachDays)} jours` : 'moins de 30 jours'}`, impact: -0.05 });
    }
    const travelKm = Number(match.travel_km || context.travel_km || row.travelKm);
    if (travelKm >= 5000) signals.push({ tone: 'watch', label: 'Voyage long', detail: `${Math.round(travelKm)} km estimés`, impact: -0.03 });
    const density = match.schedule_density || context.schedule_density || null;
    if (density?.international_between_club) signals.push({ tone: 'watch', label: 'Calendrier dense', detail: 'Fenêtre internationale entre deux matchs club', impact: -0.04 });
    return signals.slice(0, 6);
  }

  function specialStakeMultiplier(row) {
    return isLongShotValue(row) ? 0.5 : 1;
  }

  function specialPatternBadgeHtml(row) {
    if (!row) return '';
    const advanced = advancedSportsSignals(row)[0];
    if (advanced) {
      return `<span class="special-pick-badge ${escapeHtml(advanced.tone === 'danger' ? 'coldtrend' : 'hottrend')}" title="${escapeHtml(advanced.detail)}">${escapeHtml(advanced.label)}</span>`;
    }
    const trend = trendForRow(row);
    if (trend?.tone === 'hot') {
      return `<span class="special-pick-badge hottrend" title="${escapeHtml(trend.reason)}">Tendance forte</span>`;
    }
    if (trend?.tone === 'cold') {
      return `<span class="special-pick-badge coldtrend" title="${escapeHtml(trend.reason)}">Tendance froide</span>`;
    }
    if (surePickKeys().has(userBetKey(row))) {
      return '<span class="special-pick-badge" title="Edge fort, confiance haute, segment validé et priorité top 5.">Sure pick</span>';
    }
    if (isLongShotValue(row)) {
      return '<span class="special-pick-badge longshot" title="Cote élevée avec value validée. Mise réduite de moitié par prudence.">Long shot value</span>';
    }
    return '';
  }

  function priorityText(row) {
    const score = priorityValue(row);
    const label = row?.priority?.label || 'Priorité';
    return `${label} ${score.toFixed(0)}/100`;
  }

  function adjustedConfidenceHtml(row) {
    const value = safeConfidenceValue(row);
    const validation = row?.segmentValidation || {};
    const label = validation.status === 'insufficient_sample' ? 'sample court' : 'historique réel';
    return `<div class="match-sub adjusted-confidence">Ajustée ${escapeHtml(formatPct(value, 0))} · ${escapeHtml(label)}</div>`;
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
    if (liveRows().length) {
      return {
        delayMs: REFRESH_LIVE_INTERVAL_MS,
        mode: 'quick',
        label: 'Auto-refresh live 2 min : match en cours suivi.'
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
    if (displayEdgeValue(row) > 0) reasons.push(`avantage ${formatPct(displayEdgeValue(row), 1)}`);
    if (Number(row?.probability) > 0) reasons.push(`fiabilité ${formatPct(row.probability, 1)}`);
    if (Number(row?.stake) > 0) reasons.push(`mise modèle ${formatMoney(row.stake)}`);
    if (row?.contextQuality?.score != null) reasons.push(`contexte ${Math.round(Number(row.contextQuality.score))}/100`);
    if (row?.confidenceTrust?.score != null) reasons.push(`confiance ${Math.round(Number(row.confidenceTrust.score))}/100`);
    if (row?.calibration?.level && row.calibration.level !== 'unknown') {
      reasons.push(`${calibrationLevelLabel(row.calibration.level).toLowerCase()} ${formatCount(row.calibration.sample || 0)}`);
    }
    if (row?.calibration?.edgeBucket?.level === 'warm') reasons.push('historique favorable');
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

  function stringHash(value) {
    let hash = 0;
    const text = String(value || '');
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) - hash) + text.charCodeAt(index);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function initialsForLabel(value) {
    const words = String(value || '')
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return 'PS';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] || ''}${words[words.length - 1][0] || ''}`.toUpperCase();
  }

  function sportIconForRow(row) {
    const sport = String(row?.sport || row?.match?.sport || '').toLowerCase();
    if (sport.includes('tennis')) return '🎾';
    if (sport.includes('basket')) return '🏀';
    if (sport.includes('hockey')) return '🏒';
    if (sport.includes('baseball')) return '⚾';
    if (sport.includes('rugby')) return '🏉';
    if (sport.includes('nfl') || sport.includes('football américain')) return '🏈';
    if (sport.includes('mma') || sport.includes('boxe')) return '🥊';
    return '⚽';
  }

  function visualColorForLabel(label, sport = '') {
    const palettes = [
      ['#0f766e', '#14b8a6'],
      ['#1d4ed8', '#60a5fa'],
      ['#7c2d12', '#fb923c'],
      ['#166534', '#22c55e'],
      ['#7f1d1d', '#f87171'],
      ['#4c1d95', '#a78bfa'],
      ['#334155', '#94a3b8'],
      ['#854d0e', '#facc15']
    ];
    return palettes[stringHash(`${label}:${sport}`) % palettes.length];
  }

  function visualSvgUrl(label, row, { wide = false } = {}) {
    const initials = initialsForLabel(label);
    const icon = sportIconForRow(row);
    const [a, b] = visualColorForLabel(label, row?.sport || row?.match?.sport || '');
    const width = wide ? 560 : 128;
    const height = wide ? 260 : 128;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${width}" height="${height}" rx="${wide ? 26 : 22}" fill="url(#g)"/><circle cx="${wide ? width - 84 : 96}" cy="${wide ? 74 : 36}" r="${wide ? 92 : 38}" fill="rgba(255,255,255,.16)"/><circle cx="${wide ? 76 : 28}" cy="${wide ? 214 : 104}" r="${wide ? 104 : 46}" fill="rgba(15,23,42,.18)"/><text x="${wide ? 36 : 20}" y="${wide ? 105 : 56}" font-family="Inter,Arial,sans-serif" font-size="${wide ? 58 : 34}" font-weight="900" fill="white">${initials}</text><text x="${wide ? 40 : 22}" y="${wide ? 178 : 98}" font-family="Arial,sans-serif" font-size="${wide ? 48 : 28}" fill="rgba(255,255,255,.9)">${icon}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  // Cache of remote team/player logos resolved via the local /api/images
  // endpoint. Keys are normalized "kind:name:sport" strings and values are
  // either a URL or null (miss). Misses are remembered to avoid hammering
  // the resolver.
  const REMOTE_IMAGE_CACHE = new Map();
  const REMOTE_IMAGE_PENDING = new Map();

  function remoteImageKey(kind, name, sport) {
    return `${kind}|${String(name || '').trim().toLowerCase()}|${String(sport || '').trim().toLowerCase()}`;
  }

  function prefetchTeamLogosForRows(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return;
    const items = [];
    const seen = new Set();
    for (const row of rows) {
      const sport = row?.sport || row?.match?.sport || '';
      const names = getTeamNames(row?.match || {});
      for (const side of ['home', 'away']) {
        const name = side === 'away' ? names.away : names.home;
        if (!name) continue;
        const key = remoteImageKey('team', name, sport);
        if (seen.has(key) || REMOTE_IMAGE_CACHE.has(key) || REMOTE_IMAGE_PENDING.has(key)) continue;
        seen.add(key);
        items.push({ kind: 'team', name, hints: { sport }, _key: key });
      }
      if (items.length >= 24) break; // batch budget
    }
    if (!items.length) return;
    items.forEach((item) => REMOTE_IMAGE_PENDING.set(item._key, true));
    fetch('/api/images/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.map(({ kind, name, hints }) => ({ kind, name, hints })) })
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const results = payload && Array.isArray(payload.results) ? payload.results : [];
        items.forEach((item, idx) => {
          const result = results[idx] || {};
          const url = result.ok && result.url ? String(result.url) : null;
          REMOTE_IMAGE_CACHE.set(item._key, url);
          REMOTE_IMAGE_PENDING.delete(item._key);
          if (url) {
            document.querySelectorAll(`img[data-remote-image="${item._key}"]`).forEach((img) => {
              img.setAttribute('src', url);
              img.classList.add('remote-loaded');
            });
          }
        });
      })
      .catch(() => {
        items.forEach((item) => {
          REMOTE_IMAGE_PENDING.delete(item._key);
        });
      });
  }

  function queueRemoteImage(kind, name, sport) {
    const key = remoteImageKey(kind, name, sport);
    if (REMOTE_IMAGE_CACHE.has(key) || REMOTE_IMAGE_PENDING.has(key)) return;
    if (!name || String(name).trim() === '') {
      REMOTE_IMAGE_CACHE.set(key, null);
      return;
    }
    const promise = fetch('/api/images/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, name, hints: { sport: sport || '' } })
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const url = payload && payload.ok && payload.url ? String(payload.url) : null;
        REMOTE_IMAGE_CACHE.set(key, url);
        REMOTE_IMAGE_PENDING.delete(key);
        if (url) {
          document.querySelectorAll(`img[data-remote-image="${key}"]`).forEach((img) => {
            img.setAttribute('src', url);
            img.classList.add('remote-loaded');
          });
        }
      })
      .catch(() => {
        REMOTE_IMAGE_CACHE.set(key, null);
        REMOTE_IMAGE_PENDING.delete(key);
      });
    REMOTE_IMAGE_PENDING.set(key, promise);
  }

  function rowVisual(row, side = 'home') {
    const names = getTeamNames(row?.match || {});
    const label = side === 'away' ? names.away : names.home;
    const sport = row?.sport || row?.match?.sport || '';
    const colorIndex = stringHash(`${label}:${sport}`) % 8;
    const remoteKey = remoteImageKey('team', label, sport);
    const remoteUrl = REMOTE_IMAGE_CACHE.has(remoteKey) ? REMOTE_IMAGE_CACHE.get(remoteKey) : undefined;
    if (remoteUrl === undefined && label) {
      queueRemoteImage('team', label, sport);
    }
    return {
      label,
      initials: initialsForLabel(label),
      icon: sportIconForRow(row),
      color: visualColorForLabel(label, sport)[0],
      colorIndex,
      url: remoteUrl || visualSvgUrl(label, row),
      remoteKey,
      remoteAvailable: Boolean(remoteUrl)
    };
  }

  function avatarHtml(row, side = 'home', className = 'team-avatar') {
    const visual = rowVisual(row, side);
    const remoteAttr = visual.remoteKey ? ` data-remote-image="${escapeHtml(visual.remoteKey)}"` : '';
    const remoteClass = visual.remoteAvailable ? ' remote-loaded' : '';
    return `<span class="${escapeHtml(className)} team-color-${visual.colorIndex}" aria-label="${escapeHtml(visual.label)}"><img src="${escapeHtml(visual.url)}" alt=""${remoteAttr} class="${remoteClass.trim()}"><span>${escapeHtml(visual.initials)}</span></span>`;
  }

  function playerPhotoHtml(name, hints = {}, { size = 48, className = 'player-photo' } = {}) {
    const safeName = String(name || '').trim();
    const initials = initialsForLabel(safeName || '?');
    const sport = hints.sport || '';
    const key = remoteImageKey('player', safeName, sport);
    if (safeName && !REMOTE_IMAGE_CACHE.has(key) && !REMOTE_IMAGE_PENDING.has(key)) {
      queueRemoteImage('player', safeName, sport);
    }
    const cachedUrl = REMOTE_IMAGE_CACHE.get(key);
    const hasRemote = Boolean(cachedUrl);
    const remoteAttr = safeName ? ` data-remote-image="${escapeHtml(key)}"` : '';
    const remoteClass = hasRemote ? ' remote-loaded' : '';
    const sizeClass = size >= 80 ? 'player-photo-xl' : size >= 60 ? 'player-photo-lg' : size >= 40 ? 'player-photo-md' : 'player-photo-sm';
    return `<span class="${escapeHtml(className)} ${sizeClass}" aria-label="${escapeHtml(safeName || 'Joueur')}">${hasRemote ? `<img src="${escapeHtml(cachedUrl)}" alt=""${remoteAttr} class="${remoteClass.trim()}">` : `<img alt=""${remoteAttr} class="${remoteClass.trim()}">`}<span class="player-photo-initials">${escapeHtml(initials)}</span></span>`;
  }

  function matchVisualHtml(row, className = 'match-visual') {
    return `
      <div class="${escapeHtml(className)}" aria-hidden="true">
        ${avatarHtml(row, 'home', 'team-avatar')}
        <span class="sport-icon">${escapeHtml(sportIconForRow(row))}</span>
        ${avatarHtml(row, 'away', 'team-avatar')}
      </div>
    `;
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
    const sport = String(row?.sport || row?.match?.sport || '').toLowerCase();
    const sentences = [
      `Le pari proposé est ${userBetLabel(row)}, à ${formatOdd(row.odd)} sur Winamax, ${stakeNarrativeText(row)}.`
    ];
    if (sport.includes('football') || sport.includes('soccer')) {
      sentences.push(...footballNarrativeSentences(row));
    } else if (sport.includes('tennis')) {
      sentences.push(...tennisNarrativeSentences(row));
    } else {
      sentences.push(...genericSportNarrativeSentences(row));
    }
    const okSignals = (signalPreview || []).filter((signal) => signal.ok).map((signal) => signal.label).slice(0, 3);
    if (okSignals.length) {
      sentences.push(`Les signaux qui appuient le plus la lecture sont ${okSignals.join(', ').toLowerCase()}.`);
    } else if (fallback) {
      sentences.push(cleanExplanation(fallback).replace(/\bheadline\s*:\s*/i, '').replace(/\bsummary\s*:\s*/i, ''));
    }
    if (row?.winamaxTwoGoalRule?.eligible) {
      const safety = row.winamaxTwoGoalRule;
      sentences.push(`Le filet Winamax 2-0 ajoute une protection intéressante : le modèle estime ${Math.round(Number(safety.leadTwoProbability || 0) * 100)}% de chances que l’équipe choisie mène de deux buts à un moment, ce qui peut payer le Vainqueur avant la fin si le pari est éligible.`);
    }
    if (row?.safeAssessment?.status === 'watch' || row?.limitedConfidence || row?.match?.context?.quality?.gate === 'watch') {
      sentences.push('La fiche reste prudente : la cote est intéressante, mais il faut recontrôler les infos proches du coup d’envoi.');
    } else {
      sentences.push(`Ce n’est jamais garanti, mais les informations disponibles convergent vers ${userBetLabel(row)} plutôt qu’un pari plus risqué.`);
    }
    return sentences.filter(Boolean).slice(0, 6).join(' ');
  }

  function compactNarrativePreview(row) {
    const signals = buildSignalCards(row?.match || {}, row?.pred || {}).slice(0, 6);
    return pickNarrative(row, signals, pickReason(row))
      .split(/(?<=\.)\s+/)
      .slice(1, 3)
      .join(' ')
      .slice(0, 220);
  }

  function stakeNarrativeText(row) {
    const stake = displayStakeAmount(row);
    if (stake > 0) return `avec une mise suggérée de ${formatMoney(stake)}`;
    const reason = noBetStakeReason(row);
    return `mais aucune mise n’est recommandée pour l’instant${reason ? ` (${userFacingGuardText(reason)})` : ''}`;
  }

  function numericText(value, suffix = '', digits = 1) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 'non confirmé';
    return `${n.toFixed(digits).replace(/\.0$/, '')}${suffix}`;
  }

  function hasMeaningfulMetric(value, min = 0.05) {
    const n = Number(value);
    return Number.isFinite(n) && Math.abs(n) >= min;
  }

  function teamContext(row, side) {
    const contextTeam = row?.match?.context?.teams?.[side] || {};
    const sides = getSides(row?.match || {});
    const competitor = side === 'home' ? sides.home : sides.away;
    return { ...(competitor || {}), ...contextTeam };
  }

  function lineupContext(row, side) {
    const sides = getSides(row?.match || {});
    const competitor = side === 'home' ? sides.home : sides.away;
    return row?.match?.lineups?.[side] || teamContext(row, side)?.lineup || competitor?.lineup || row?.match?.context?.availability?.[side]?.lineup || {};
  }

  // Sprint 64 — status global lineup (confirmed/probable/missing) pour badge visible
  // dans la hero modal et le simple-timeline-card.
  function lineupStatusForRow(row) {
    if (!row || row.sport !== 'football' && !/foot|soccer/i.test(row?.sport || '')) {
      return { tone: 'none', label: '', count: 0 };
    }
    const home = lineupContext(row, 'home') || {};
    const away = lineupContext(row, 'away') || {};
    const homeStarters = Array.isArray(home.starters) ? home.starters.length : 0;
    const awayStarters = Array.isArray(away.starters) ? away.starters.length : 0;
    if (!homeStarters && !awayStarters) {
      return { tone: 'missing', label: 'Compos à venir', count: 0 };
    }
    const bothConfirmed = home.confirmed === true && away.confirmed === true;
    const someConfirmed = home.confirmed === true || away.confirmed === true;
    if (bothConfirmed) {
      return { tone: 'confirmed', label: '✅ Compos confirmées', count: homeStarters + awayStarters };
    }
    if (someConfirmed) {
      return { tone: 'partial', label: '🟡 1 compo confirmée', count: homeStarters + awayStarters };
    }
    return { tone: 'projected', label: '🔵 Compos probables', count: homeStarters + awayStarters };
  }

  function lineupStatusBadgeHtml(row) {
    const st = lineupStatusForRow(row);
    if (!st.tone || st.tone === 'none') return '';
    const cls = `lineup-status-badge lineup-${st.tone}`;
    return `<span class="${cls}" title="${escapeHtml(st.count ? `${st.count} joueurs renseignés` : 'Compos en attente')}">${escapeHtml(st.label)}</span>`;
  }

  function availabilityContext(row, side) {
    const sides = getSides(row?.match || {});
    const competitor = side === 'home' ? sides.home : sides.away;
    const contextAvailability = row?.match?.context?.availability?.[side] || {};
    return {
      ...(competitor?.injuries ? { injuries: { list: competitor.injuries, total: competitor.injuries_count || competitor.injuries.length, severe: competitor.injuries_severe || 0 } } : {}),
      ...contextAvailability
    };
  }

  function teamDisplayName(row, side) {
    const matchSides = getSides(row?.match || {});
    return teamContext(row, side)?.name
      || availabilityContext(row, side)?.team
      || (side === 'home' ? matchSides.home?.name : matchSides.away?.name)
      || (side === 'home' ? 'Domicile' : 'Extérieur');
  }

  function sideFormText(side) {
    const letters = formLetters(side || {});
    if (letters.length) return letters.map((letter) => letter === 'W' ? 'V' : letter === 'D' ? 'N' : letter === 'L' ? 'D' : letter).join('');
    const direct = String(side?.form5 || side?.team_form_l5 || side?.form || side?.history?.latest_form || '').trim();
    if (direct) return direct.slice(0, 5).replace(/W/g, 'V').replace(/L/g, 'D');
    const wdl = side?.form5_wdl || {};
    const sample = Number(wdl.sample || 0);
    if (sample) return `${formatCount(wdl.wins || 0)}V-${formatCount(wdl.draws || 0)}N-${formatCount(wdl.losses || 0)}D`;
    return 'forme non confirmée';
  }

  function sideGoalText(side) {
    const fd = side?.history?.football_data || {};
    const xg = side?.xg || side?.history?.xg || {};
    const xgFor = Number(side?.xg_for_avg ?? side?.xg_per90 ?? xg.for_avg);
    const xgAgainst = Number(side?.xg_against_avg ?? side?.xga_per90 ?? xg.against_avg);
    const avgGf5 = Number(side?.form_stats?.avg_gf5 ?? side?.avg_gf5);
    const avgGa5 = Number(side?.form_stats?.avg_ga5 ?? side?.avg_ga5);
    if (hasMeaningfulMetric(avgGf5) || hasMeaningfulMetric(avgGa5)) return `${numericText(avgGf5, ' but/m sur 5', 2)} · ${numericText(avgGa5, ' encaissé/m sur 5', 2)}`;
    if (hasMeaningfulMetric(xgFor) || hasMeaningfulMetric(xgAgainst)) return `${numericText(xgFor, ' xG pour', 2)} · ${numericText(xgAgainst, ' xG contre', 2)}`;
    if (fd.matches) return `${numericText(fd.avg_for, ' but/m', 2)} · ${numericText(fd.avg_against, ' encaissé/m', 2)}`;
    if (xg.present && (hasMeaningfulMetric(xg.for_avg) || hasMeaningfulMetric(xg.against_avg))) return `${numericText(xg.for_avg, ' xG pour', 2)} · ${numericText(xg.against_avg, ' xG contre', 2)}`;
    return 'buts récents à confirmer';
  }

  function inferFootballStyle(side) {
    const fd = side?.history?.football_data || {};
    const xg = side?.xg || side?.history?.xg || {};
    const over25 = Number(fd.over25_rate);
    const btts = Number(fd.btts_rate);
    const xgFor = Number(side?.xg_for_avg ?? side?.xg_per90 ?? xg.for_avg);
    const xgAgainst = Number(side?.xg_against_avg ?? side?.xga_per90 ?? xg.against_avg);
    const ppda = Number(side?.ppda ?? side?.history?.ppda);
    if (Number.isFinite(xgFor) && xgFor >= 1.75) return 'jeu offensif, volume haut';
    if (Number.isFinite(ppda) && ppda <= 10.5) return 'pressing haut, récupération agressive';
    if (Number.isFinite(over25) && over25 >= 0.58) return 'matchs ouverts, rythme élevé';
    if (Number.isFinite(btts) && btts >= 0.58) return 'attaque active mais défense exposée';
    if (Number.isFinite(xgAgainst) && xgAgainst <= 1.05) return 'bloc plutôt compact';
    return 'profil équilibré à confirmer par les compositions';
  }

  function previousChampionForLeague(league) {
    return league ? 'à confirmer via enrichissement web' : 'champion passé non confirmé localement';
  }

  function seasonStakeText(row) {
    const match = row?.match || {};
    const league = match.league_name || row?.league || '';
    const detail = String(match.detail || match.round || match.notes || '').trim();
    const date = new Date(row?.start || match.date || Date.now());
    if (/finale|final|playoff|play-off|demi|semi/i.test(`${league} ${detail}`)) return detail || 'match à élimination ou enjeu renforcé';
    if (date.getMonth() >= 3 && date.getMonth() <= 5 && String(row?.sport || match.sport || '').toLowerCase().includes('football')) {
      return 'fin de saison : titre, Europe ou maintien peuvent peser selon le classement';
    }
    return 'enjeu de saison à confirmer avec le classement frais';
  }

  function playerStatLine(player, star) {
    const rawScore = star?.star_score ?? (player?.rating != null ? player.rating : undefined);
    const score = Number(rawScore);
    const scoreText = Number.isFinite(score) ? `forme ${Math.max(0, Math.min(10, score)).toFixed(1)}/10` : 'forme 5 derniers à enrichir';
    const goals = Number(star?.goals_per_match ?? player?.goals_per_match);
    const xg = Number(star?.xG_per_match ?? star?.xg_per_match ?? player?.xG_per_match);
    const xa = Number(star?.xA_per_match ?? star?.xa_per_match ?? player?.xA_per_match);
    const shots = Number(star?.shots_on_target_per_match ?? star?.shots_per_match ?? player?.shots_on_target_per_match);
    const keyPasses = Number(star?.key_passes_per_match ?? player?.key_passes_per_match);
    const parts = [scoreText];
    if (Number.isFinite(goals)) parts.push(`${goals.toFixed(2)} but/m`);
    if (Number.isFinite(xg)) parts.push(`${xg.toFixed(2)} xG/m`);
    if (Number.isFinite(xa)) parts.push(`${xa.toFixed(2)} xA/m`);
    if (Number.isFinite(shots)) parts.push(`${shots.toFixed(1)} tir cadré/m`);
    if (Number.isFinite(keyPasses)) parts.push(`${keyPasses.toFixed(1)} passe clé/m`);
    return parts.join(' · ');
  }

  function playerAdvancedStats(player, star = {}) {
    const merged = { ...(star || {}), ...(player || {}) };
    const goals = Number(merged.goals_season ?? merged.goals ?? merged.season_goals);
    const assists = Number(merged.assists_season ?? merged.assists ?? merged.season_assists);
    const xgSeason = Number(merged.xG_season ?? merged.xg_season ?? (Number(merged.xG_per_match) * Number(merged.minutes || 900) / 90));
    const xaSeason = Number(merged.xA_season ?? merged.xa_season ?? (Number(merged.xA_per_match) * Number(merged.minutes || 900) / 90));
    const shots = Number(merged.shots_on_target_per_match ?? merged.shots_per_match);
    const dribbles = Number(merged.dribbles_success_per_match ?? merged.dribbles_per_match);
    const keyPasses = Number(merged.key_passes_per_match);
    const cards = Number(merged.yellow_cards ?? merged.cards_yellow ?? merged.cards);
    const minutes = Number(merged.minutes ?? merged.minutes_played);
    const conversion = Number(merged.shot_conversion ?? (Number.isFinite(goals) && Number.isFinite(shots) && shots > 0 && minutes > 0 ? goals / Math.max(1, shots * minutes / 90) : NaN));
    return {
      xgSeason,
      xaSeason,
      shots,
      dribbles,
      keyPasses,
      conversion,
      cards,
      minutes,
      goals,
      assists,
      formScore: Number(merged.star_score ?? merged.rating ?? 0)
    };
  }

  // Pair value is "placeholder-only" (à confirmer / à enrichir / non publiée /
  // non confirmé / inconnu …) → caller can hide the row instead of showing
  // a filler. Centralised so every section uses the same definition.
  const PLACEHOLDER_VALUE_PATTERNS = [
    /à\s+enrichir/i,
    /à\s+confirmer/i,
    /non\s+publi/i,
    /non\s+confirm/i,
    /non\s+disponible/i,
    /^\s*(—|-|n\/a|na|inconnu|inconnue|indisponible|aucun|aucune|0|0,0|0\.0|0%|—%)\s*$/i,
    /historique\s+direct\s+à\s+enrichir/i,
    /sources?\s+(à|à\s+)?enrichir/i
  ];

  function looksLikePlaceholderValue(value) {
    if (value == null) return true;
    const text = String(value).trim();
    if (!text) return true;
    return PLACEHOLDER_VALUE_PATTERNS.some((re) => re.test(text));
  }

  // Render a list of [label, value] pairs but hide entries whose value is
  // a placeholder. Keeps the layout dense and removes "à enrichir" noise.
  function renderDetailPairs(pairs, { keepLabels = [], minRows = 0 } = {}) {
    const list = Array.isArray(pairs) ? pairs : [];
    const filtered = list.filter(([label, value]) => {
      if (keepLabels.includes(label)) return true;
      return !looksLikePlaceholderValue(value);
    });
    const final = filtered.length >= minRows ? filtered : list.slice(0, Math.max(minRows, filtered.length));
    return final
      .map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`)
      .join('');
  }

  function statChip(label, value, suffix = '', digits = 1) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    const zeroIsMissing = /xg|xa|tirs|dribbles|passes clés|conversion|minutes/i.test(label);
    if (zeroIsMissing && n <= 0) return '';
    const text = `${n.toFixed(digits).replace(/\.0$/, '')}${suffix}`;
    return `<span title="${escapeHtml(label)}">${escapeHtml(label)} <strong>${escapeHtml(text)}</strong></span>`;
  }

  function keyPlayersForSide(row, side) {
    const players = lineupPlayers(row, side);
    const stars = starIndex(row, side);
    const enriched = players.map((player) => {
      const star = player.star || stars.get(normalizeUiKey(player.name || '')) || {};
      const stats = playerAdvancedStats(player, star);
      const score = Number(stats.formScore || 0) + Number(stats.xgSeason || 0) * 0.4 + Number(stats.xaSeason || 0) * 0.35 + Number(stats.goals || 0) * 0.25;
      return { player, star, stats, score };
    });
    return enriched.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  function buildKeyPlayersHtml(row) {
    const sides = ['home', 'away'].map((side) => ({ side, rows: keyPlayersForSide(row, side) }));
    const hasAnyRows = sides.some(({ rows }) => rows.length > 0);
    if (!hasAnyRows) return '';
    const groups = sides
      .filter(({ rows }) => rows.length > 0)
      .map(({ side, rows }) => `
        <div class="key-player-side">
          <h5>${escapeHtml(teamDisplayName(row, side))}</h5>
          ${rows.map(({ player, star, stats }) => {
            const form = stats.formScore >= 6 ? 'En forme' : stats.formScore > 0 && stats.formScore < 4 ? 'En méforme' : 'À confirmer';
            const playerName = player.name || star.name || 'Joueur clé';
            const sportHint = row?.sport || row?.match?.sport || '';
            const chips = [
              statChip('xG saison', stats.xgSeason, '', 1),
              statChip('xA saison', stats.xaSeason, '', 1),
              statChip('Tirs cadrés/m', stats.shots, '', 1),
              statChip('Dribbles/m', stats.dribbles, '', 1),
              statChip('Passes clés/m', stats.keyPasses, '', 1),
              statChip('Conversion', Number.isFinite(stats.conversion) ? stats.conversion * 100 : NaN, '%', 0),
              statChip('Cartons', stats.cards, '', 0),
              statChip('Minutes', stats.minutes, '', 0)
            ].filter(Boolean);
            return `
              <article class="key-player-card has-photo">
                <div class="key-player-photo-wrap">${playerPhotoHtml(playerName, { sport: sportHint }, { size: 64 })}</div>
                <strong>${escapeHtml(playerName)}</strong>
                <em>${escapeHtml(`${player.pos || star.position || 'poste ?'} · ${form}`)}</em>
                ${chips.length ? `<div class="stat-chip-row">${chips.join('')}</div>` : ''}
              </article>
            `;
          }).join('')}
        </div>
      `).join('');
    return `
      <article class="detail-card wide key-players-card">
        <h4>${escapeHtml(t('keyPlayers'))}</h4>
        <p class="detail-text">Les profils les plus utiles, avec xG/xA, tirs, création et disponibilité quand la source les fournit.</p>
        <div class="key-player-grid">${groups}</div>
      </article>
    `;
  }

  function buildTacticalDuelsHtml(row) {
    const home = keyPlayersForSide(row, 'home');
    const away = keyPlayersForSide(row, 'away');
    const duels = [];
    if (home[0] && away[0]) duels.push([home[0], away[0], 'Duel principal']);
    if (home[1] && away[1]) duels.push([home[1], away[1], 'Création vs bloc adverse']);
    if (home[2] && away[2]) duels.push([home[2], away[2], 'Impact banc / second rideau']);
    const homeStyle = inferFootballStyle(teamContext(row, 'home'));
    const awayStyle = inferFootballStyle(teamContext(row, 'away'));
    return `
      <article class="detail-card wide tactical-card">
        <h4>${escapeHtml(t('tacticalAnalysis'))}</h4>
        <div class="match-context-band">
          <span>${escapeHtml(teamDisplayName(row, 'home'))}</span>
          <strong>${escapeHtml(homeStyle)}</strong>
          <em>${escapeHtml(`${teamDisplayName(row, 'away')} : ${awayStyle}`)}</em>
        </div>
        <div class="tactical-duel-grid">
          ${duels.length ? duels.map(([left, right, label]) => {
            const leftStats = left.stats || {};
            const rightStats = right.stats || {};
            const leftPower = Number(leftStats.xgSeason || 0) + Number(leftStats.xaSeason || 0) + Number(leftStats.formScore || 0) / 10;
            const rightPower = Number(rightStats.xgSeason || 0) + Number(rightStats.xaSeason || 0) + Number(rightStats.formScore || 0) / 10;
            const read = leftPower > rightPower + 0.8
              ? `${left.player.name || left.star.name} a l’avantage statistique`
              : rightPower > leftPower + 0.8
                ? `${right.player.name || right.star.name} peut contenir le duel`
                : 'duel équilibré à confirmer par la compo';
            return `
              <div class="tactical-duel">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(left.player.name || left.star.name || 'Joueur A')} vs ${escapeHtml(right.player.name || right.star.name || 'Joueur B')}</strong>
                <em>${escapeHtml(read)}</em>
              </div>
            `;
          }).join('') : '<div class="empty compact-empty">Duels clés à générer dès que les titulaires sont confirmés.</div>'}
        </div>
      </article>
    `;
  }

  function buildFootballPhase2Html(row) {
    const home = teamContext(row, 'home');
    const away = teamContext(row, 'away');
    const match = row?.match || {};
    const homeXg = Number(home?.xg_for_avg ?? home?.xg_per90 ?? home?.history?.xg?.for_avg);
    const awayXg = Number(away?.xg_for_avg ?? away?.xg_per90 ?? away?.history?.xg?.for_avg);
    const homeSetPieces = Number(home?.set_piece_xg ?? home?.history?.set_piece_xg);
    const awaySetPieces = Number(away?.set_piece_xg ?? away?.history?.set_piece_xg);
    const homePenalty = Number(home?.penalty_rate ?? home?.history?.penalty_rate);
    const awayPenalty = Number(away?.penalty_rate ?? away?.history?.penalty_rate);
    const homePress = Number(home?.ppda ?? home?.history?.ppda);
    const awayPress = Number(away?.ppda ?? away?.history?.ppda);
    const likelyScorers = [
      ...keyPlayersForSide(row, 'home').slice(0, 2),
      ...keyPlayersForSide(row, 'away').slice(0, 2)
    ].sort((a, b) => Number(b.stats?.xgSeason || 0) - Number(a.stats?.xgSeason || 0)).slice(0, 3);
    const rows = [
      ['Buteurs probables', likelyScorers.length ? likelyScorers.map((item) => item.player?.name || item.star?.name).filter(Boolean).join(' · ') : 'à confirmer dès que les titulaires sortent'],
      ['Cartons probables', match.referee?.cardsPerGame ? `${Number(match.referee.cardsPerGame).toFixed(1)} cartons/m arbitre` : 'arbitre ou historique cartons à enrichir'],
      ['Coups de pied arrêtés', hasMeaningfulMetric(homeSetPieces) || hasMeaningfulMetric(awaySetPieces) ? `${teamDisplayName(row, 'home')} ${numericText(homeSetPieces, ' xG CPA', 2)} · ${teamDisplayName(row, 'away')} ${numericText(awaySetPieces, ' xG CPA', 2)}` : 'signal corners/coups francs surveillé mais non confirmé'],
      ['Pénalty', Number.isFinite(homePenalty) || Number.isFinite(awayPenalty) ? `${numericText(homePenalty * 100, '% domicile', 0)} · ${numericText(awayPenalty * 100, '% extérieur', 0)}` : 'tendance penalties à confirmer'],
      ['Pressing', Number.isFinite(homePress) || Number.isFinite(awayPress) ? `${teamDisplayName(row, 'home')} PPDA ${numericText(homePress, '', 1)} · ${teamDisplayName(row, 'away')} PPDA ${numericText(awayPress, '', 1)}` : `${inferFootballStyle(home)} / ${inferFootballStyle(away)}`],
      ['Construction', hasMeaningfulMetric(homeXg) || hasMeaningfulMetric(awayXg) ? `xG attaque ${numericText(homeXg, '', 2)} / ${numericText(awayXg, '', 2)}` : 'build-up estimé via style et volume offensif']
    ];
    return `
      <article class="detail-card wide phase2-card">
        <h4>Lecture tactique avancée</h4>
        <p class="detail-text">Buteurs probables, coups de pied arrêtés, discipline et pressing sont intégrés comme signaux prudents, sans remplacer la cote Winamax.</p>
        <div class="sport-insight-grid">
          ${renderDetailPairs(rows)}
        </div>
      </article>
    `;
  }

  function lineupPlayers(row, side) {
    const lineup = lineupContext(row, side);
    const starters = Array.isArray(lineup?.starters) ? lineup.starters : [];
    if (starters.length) return starters.slice(0, 11);
    const stars = Array.isArray(availabilityContext(row, side)?.stars) ? availabilityContext(row, side).stars : [];
    return stars.slice(0, 8).map((star) => ({ name: star.name, pos: star.position, shirt: '', star }));
  }

  function starIndex(row, side) {
    const stars = Array.isArray(availabilityContext(row, side)?.stars) ? availabilityContext(row, side).stars : [];
    const map = new Map();
    stars.forEach((star) => map.set(normalizeUiKey(star.name || ''), star));
    return map;
  }

  function formationNumbers(value) {
    const nums = String(value || '4-3-3').match(/\d+/g)?.map((item) => Number(item)).filter((item) => item > 0) || [4, 3, 3];
    return nums.length >= 2 ? nums.slice(0, 4) : [4, 3, 3];
  }

  function pitchRowsForPlayers(players, formation) {
    const starters = Array.isArray(players) ? players.slice(0, 11) : [];
    if (!starters.length) return [];
    const keeper = starters.find((player) => /^(g|gb|gk)$/i.test(String(player?.pos || player?.position || ''))) || starters[0];
    const rest = starters.filter((player) => player !== keeper);
    const byPos = {
      defense: rest.filter((player) => /^d/i.test(String(player?.pos || player?.position || ''))),
      middle: rest.filter((player) => /^m/i.test(String(player?.pos || player?.position || ''))),
      attack: rest.filter((player) => /^(f|a|st|fw)/i.test(String(player?.pos || player?.position || '')))
    };
    const unknown = rest.filter((player) => !byPos.defense.includes(player) && !byPos.middle.includes(player) && !byPos.attack.includes(player));
    const nums = formationNumbers(formation);
    const fill = (key, target) => {
      while (byPos[key].length < target && unknown.length) byPos[key].push(unknown.shift());
    };
    fill('defense', nums[0] || 4);
    fill('middle', nums[1] || 3);
    fill('attack', nums.slice(2).reduce((sum, n) => sum + n, 0) || 3);
    return [
      { label: 'Attaque', players: byPos.attack },
      { label: 'Milieu', players: byPos.middle },
      { label: 'Défense', players: byPos.defense },
      { label: 'Gardien', players: [keeper] }
    ].filter((line) => line.players.length);
  }

  function buildPitchColumn(row, side) {
    const players = lineupPlayers(row, side);
    const stars = starIndex(row, side);
    const lineup = lineupContext(row, side);
    const title = `${teamDisplayName(row, side)}${lineup.formation ? ` · ${lineup.formation}` : ''}`;
    const source = lineup.confirmed ? 'composition confirmée' : lineup.projected || lineup.present ? 'composition probable' : 'composition à confirmer';
    const pitchLines = pitchRowsForPlayers(players, lineup.formation);
    const sportHint = row?.sport || row?.match?.sport || 'football';
    const renderPlayer = (player) => {
      const star = player.star || stars.get(normalizeUiKey(player.name || ''));
      const hot = Number(star?.star_score || player?.rating || 0) >= 6;
      const playerName = player.name || star?.name || '';
      // Trigger remote photo lookup as a side-effect; result swaps in
      // automatically via data-remote-image attribute.
      const photoHtml = playerName ? playerPhotoHtml(playerName, { sport: sportHint }, { size: 32 }) : '';
      const numberOrPos = player.shirt != null && player.shirt !== '' ? String(player.shirt) : (player.pos || star?.position || '-');
      return `
        <div class="pitch-player-token ${hot ? 'hot' : ''}" title="${escapeHtml(playerStatLine(player, star))}">
          ${photoHtml ? `<span class="pitch-player-photo">${photoHtml}</span>` : ''}
          <span class="pitch-player-num">${escapeHtml(numberOrPos)}</span>
          <strong>${escapeHtml(playerName || 'À confirmer')}</strong>
        </div>
      `;
    };
    if (!pitchLines.length) return ''; // hide column entirely when no lineup at all
    return `
      <div class="pitch-column">
        <h5>${escapeHtml(title)}</h5>
        <small>${escapeHtml(source)}</small>
        <div class="pitch-players">
          ${pitchLines.map((line) => `
            <div class="pitch-line" data-line="${escapeHtml(line.label)}">
              ${line.players.map(renderPlayer).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function buildFootballInsightHtml(row) {
    const match = row?.match || {};
    const home = teamContext(row, 'home');
    const away = teamContext(row, 'away');
    const referee = match.referee || match.referee_context || row?.pred?.referee || {};
    const weather = match.weather || {};
    const homeInjuries = availabilityContext(row, 'home')?.injuries || home.injuries || {};
    const awayInjuries = availabilityContext(row, 'away')?.injuries || away.injuries || {};
    const h2hCount = Array.isArray(match.h2h?.meetings) ? match.h2h.meetings.length : 0;
    const refereeCards = Number(referee.cardsPerGame ?? referee.yellowPerGame ?? referee.cards_per_match);
    return `
      <article class="detail-card wide sport-insight-card">
        <h4>Fiche foot enrichie</h4>
        <div class="match-context-band">
          <span>${escapeHtml(match.league_name || row.league || 'Compétition')}</span>
          <strong>${escapeHtml(seasonStakeText(row))}</strong>
          <em>${escapeHtml(`Champion passé : ${previousChampionForLeague(match.league_name || row.league)}`)}</em>
        </div>
        <div class="lineup-pitch" aria-label="Feuille de match probable">
          ${buildPitchColumn(row, 'home')}
          ${buildPitchColumn(row, 'away')}
        </div>
        <div class="sport-insight-grid">
          <div>
            <span>Forme récente</span>
            <strong>${escapeHtml(teamDisplayName(row, 'home'))} : ${escapeHtml(sideFormText(home))} · ${escapeHtml(teamDisplayName(row, 'away'))} : ${escapeHtml(sideFormText(away))}</strong>
            <em>${escapeHtml(`${sideGoalText(home)} / ${sideGoalText(away)}`)}</em>
          </div>
          <div>
            <span>Entraîneurs & style</span>
            <strong>${escapeHtml(`${lineupContext(row, 'home')?.coach || 'Coach domicile non confirmé'} · ${inferFootballStyle(home)}`)}</strong>
            <em>${escapeHtml(`${lineupContext(row, 'away')?.coach || 'Coach extérieur non confirmé'} · ${inferFootballStyle(away)}`)}</em>
          </div>
          <div>
            <span>Arbitre</span>
            <strong>${escapeHtml(referee.name || 'Arbitre non confirmé')}</strong>
            <em>${escapeHtml(Number.isFinite(refereeCards) ? `${refereeCards.toFixed(1)} cartons/match · penalties/fautes à enrichir` : 'stats cartons/penalties à enrichir')}</em>
          </div>
          <div>
            <span>Contexte</span>
            <strong>${escapeHtml(weather.city ? `${weather.city} · ${numericText(weather.temp_c, '°C', 0)} · vent ${numericText(weather.wind_kmh, ' km/h', 0)}` : 'météo non attachée')}</strong>
            <em>${escapeHtml(`Absents : ${homeInjuries.total || 0} / ${awayInjuries.total || 0} · H2H ${formatCount(h2hCount)} match(s)`)}</em>
          </div>
        </div>
      </article>
      ${buildKeyPlayersHtml(row)}
      ${buildTacticalDuelsHtml(row)}
      ${buildFootballPhase2Html(row)}
    `;
  }

  function tennisNarrativeSentences(row) {
    const match = row?.match || {};
    const { home, away } = getSides(match);
    const surface = match.surface || match.draw || 'surface à confirmer';
    const rankText = [home?.rank ? `${home.name} rang ${home.rank}` : '', away?.rank ? `${away.name} rang ${away.rank}` : ''].filter(Boolean).join(', ');
    return [
      `${home?.name || 'Le premier joueur'} et ${away?.name || 'son adversaire'} jouent sur ${surface}, un paramètre central pour lire le rythme et la durée du match.`,
      rankText ? `Le classement disponible donne ${rankText}, ce qui aide le modèle à éviter une lecture purement basée sur la cote.` : 'Le classement et les bilans récents restent à compléter par les sources tennis avant de renforcer la mise.',
      'La fiche vérifie la forme récente, le bilan par surface et les confrontations directes dès qu’ils sont présents dans les sources locales.'
    ];
  }

  function footballNarrativeSentences(row) {
    const home = teamContext(row, 'home');
    const away = teamContext(row, 'away');
    const homeName = teamDisplayName(row, 'home');
    const awayName = teamDisplayName(row, 'away');
    const homeGoals = sideGoalText(home);
    const awayGoals = sideGoalText(away);
    const injuries = [
      availabilityContext(row, 'home')?.injuries?.severe ? `${homeName} a ${availabilityContext(row, 'home').injuries.severe} absence(s) sévère(s)` : '',
      availabilityContext(row, 'away')?.injuries?.severe ? `${awayName} a ${availabilityContext(row, 'away').injuries.severe} absence(s) sévère(s)` : ''
    ].filter(Boolean);
    return [
      `${homeName} arrive avec une dynamique ${sideFormText(home)}, tandis que ${awayName} affiche ${sideFormText(away)} sur la période récente.`,
      `Les chiffres d’attaque/défense donnent ${homeName} à ${homeGoals} et ${awayName} à ${awayGoals}.`,
      injuries.length ? `${injuries.join(' ; ')}, ce qui pèse dans la lecture du match.` : 'Aucun cluster d’absences sévères n’est lisible dans le dossier local, donc le pari repose surtout sur forme, cotes et contexte.'
    ];
  }

  function genericSportNarrativeSentences(row) {
    const match = row?.match || {};
    const { home, away } = getSides(match);
    const sport = row?.sport || match.sport || 'sport';
    const sportKey = String(sport || '').toLowerCase();
    const form = `${sideFormText(home)} / ${sideFormText(away)}`;
    if (sportKey.includes('baseball')) {
      return [
        `${home?.name || 'L’équipe à domicile'} et ${away?.name || 'l’adversaire'} sont lus avec la cote Winamax, le matchup lanceur, la forme récente ${form} et l’état du bullpen quand il est disponible.`,
        'Le logiciel évite de forcer un pari si le lanceur titulaire ou le contexte bullpen manque trop près du début du match.',
        'La mise reste prudente car le baseball produit beaucoup de variance, mais le prix proposé garde une marge positive après calibration.'
      ];
    }
    if (sportKey.includes('basket')) {
      return [
        `${home?.name || 'Le premier cinq'} et ${away?.name || 'son adversaire'} sont comparés sur rythme, forme récente ${form}, repos et niveau offensif/défensif.`,
        'Les signaux nuit sont volontairement plus prudents : back-to-back, absences de stars et minutes probables peuvent renverser une cote.',
        'Si la fiche affiche une mise, c’est que la cote Winamax reste cohérente même avec ce coussin de prudence.'
      ];
    }
    if (sportKey.includes('hockey')) {
      return [
        `${home?.name || 'L’équipe locale'} et ${away?.name || 'l’adversaire'} sont évalués avec forme ${form}, gardien probable, unités spéciales et déplacement.`,
        'La fiche surveille surtout le gardien titulaire et le power play, deux signaux qui changent vite la lecture d’un match de hockey.',
        'La recommandation reste calibrée : si le gardien ou les lignes ne sont pas confirmés, le pick descend en surveillance.'
      ];
    }
    return [
      `${home?.name || 'Le favori local'} et ${away?.name || 'son adversaire'} sont évalués avec les cotes Winamax, la forme récente et les signaux disponibles pour ce ${sport}.`,
      'Quand les compositions ou titulaires ne sont pas encore confirmés, la confiance reste limitée plutôt que de forcer une conclusion.',
      'La fiche met en avant les données concrètes disponibles et garde le reste en points à vérifier.'
    ];
  }

  function buildTennisInsightHtml(row) {
    const match = row?.match || {};
    const { home, away } = getSides(match);
    const h2h = Array.isArray(match.h2h?.meetings) ? match.h2h.meetings : [];
    const rows = [
      ['Tournoi', `${match.league_name || row.league || '-'} · ${match.round || match.draw || 'tour à confirmer'}`],
      ['Surface', match.surface || 'surface à confirmer'],
      ['Classement', `${home?.name || 'Joueur 1'} ${home?.rank ? `#${home.rank}` : 'rang ?'} · ${away?.name || 'Joueur 2'} ${away?.rank ? `#${away.rank}` : 'rang ?'}`],
      ['Forme 5 derniers', `${sideFormText(home)} / ${sideFormText(away)}`],
      ['H2H', h2h.length ? `${formatCount(h2h.length)} confrontation(s) locales` : 'historique direct à enrichir'],
      ['Bilan par surface', 'dur / terre / gazon / indoor à enrichir depuis sources tennis'],
      ['Service', 'aces, 1er service, points gagnés derrière la première'],
      ['Retour', 'break points créés, jeux de retour et pression sur second service'],
      ['Tie-breaks', 'historique tie-break et mental fin de set à enrichir'],
      ['Stats avancées', 'aces, 1er service, balles de break et fatigue à enrichir']
    ];
    return `
      <article class="detail-card wide sport-insight-card">
        <h4>Fiche tennis enrichie</h4>
        <div class="sport-insight-grid">
          ${renderDetailPairs(rows)}
        </div>
        <div class="key-player-grid">
          ${[home, away].map((player, index) => `
            <article class="key-player-card">
              <strong>${escapeHtml(player?.name || `Joueur ${index + 1}`)}</strong>
              <em>${escapeHtml(index === 0 ? 'Profil joueur gauche' : 'Profil joueur droit')}</em>
              <div class="stat-chip-row">
                ${statChip('Aces moyens', player?.aces_per_match, '', 1)}
                ${statChip('1er service', player?.first_serve_pct, '%', 0)}
                ${statChip('Break sauvés', player?.break_points_saved_pct, '%', 0)}
                ${statChip('WR dur', player?.hard_win_rate, '%', 0)}
                ${statChip('WR terre', player?.clay_win_rate, '%', 0)}
                ${statChip('Titres saison', player?.season_titles, '', 0)}
              </div>
            </article>
          `).join('')}
        </div>
      </article>
    `;
  }

  function buildOtherSportInsightHtml(row) {
    const match = row?.match || {};
    const { home, away } = getSides(match);
    const sport = String(row?.sport || match.sport || '').toLowerCase();
    const homeAdv = home?.mlb_advanced || home?.nba_advanced || home?.nhl_advanced || home?.advanced || home?.team_stats || {};
    const awayAdv = away?.mlb_advanced || away?.nba_advanced || away?.nhl_advanced || away?.advanced || away?.team_stats || {};
    const sportRows = sport.includes('baseball')
      ? [
          ['Pitcher matchup', homeAdv.starter || awayAdv.starter ? `${homeAdv.starter || 'starter domicile ?'} vs ${awayAdv.starter || 'starter extérieur ?'}` : 'pitchers titulaires à confirmer'],
          ['ERA / WHIP', `${numericText(homeAdv.team_ERA ?? homeAdv.era, '', 2)} / ${numericText(homeAdv.team_WHIP ?? homeAdv.whip, '', 2)} · ${numericText(awayAdv.team_ERA ?? awayAdv.era, '', 2)} / ${numericText(awayAdv.team_WHIP ?? awayAdv.whip, '', 2)}`],
          ['Bullpen', homeAdv.bullpen_fatigue || awayAdv.bullpen_fatigue ? `${homeAdv.bullpen_fatigue || 'domicile ?'} / ${awayAdv.bullpen_fatigue || 'extérieur ?'}` : 'fraîcheur bullpen à enrichir'],
          ['Hot hitters', homeAdv.hot_hitters || awayAdv.hot_hitters || 'batteurs chauds à enrichir'],
          ['Park factor', match.park_factor || 'stade et météo à confirmer'],
          ['Forme', `${sideFormText(home)} / ${sideFormText(away)}`]
        ]
      : sport.includes('hockey')
        ? [
            ['Gardien', homeAdv.goalie || awayAdv.goalie ? `${homeAdv.goalie || 'gardien domicile ?'} vs ${awayAdv.goalie || 'gardien extérieur ?'}` : 'titulaire et SV% à confirmer'],
            ['SV% / GAA', `${numericText(homeAdv.save_pct, '', 3)} / ${numericText(homeAdv.goals_against_avg, '', 2)} · ${numericText(awayAdv.save_pct, '', 3)} / ${numericText(awayAdv.goals_against_avg, '', 2)}`],
            ['Power play', `${numericText(homeAdv.power_play_pct, '%', 0)} / ${numericText(awayAdv.power_play_pct, '%', 0)}`],
            ['Penalty kill', `${numericText(homeAdv.penalty_kill_pct, '%', 0)} / ${numericText(awayAdv.penalty_kill_pct, '%', 0)}`],
            ['Faceoff / travel', match.travel_note || 'faceoff et déplacement à enrichir'],
            ['Forme', `${sideFormText(home)} / ${sideFormText(away)}`]
          ]
        : sport.includes('basket')
          ? [
              ['Cinq majeur', homeAdv.starters || awayAdv.starters || 'starters et minutes à confirmer'],
              ['Pace', `${numericText(homeAdv.pace, '', 1)} / ${numericText(awayAdv.pace, '', 1)}`],
              ['OffRtg / DefRtg', `${numericText(homeAdv.off_rating, '', 1)} / ${numericText(homeAdv.def_rating, '', 1)} · ${numericText(awayAdv.off_rating, '', 1)} / ${numericText(awayAdv.def_rating, '', 1)}`],
              ['Stars', homeAdv.star_form || awayAdv.star_form || 'forme stars à enrichir'],
              ['Repos / B2B', match.rest_note || match.back_to_back_note || 'repos et back-to-back à confirmer'],
              ['Forme', `${sideFormText(home)} / ${sideFormText(away)}`]
            ]
          : [['Composition', 'titulaires ou combattants clés à confirmer'], ['Forme', `${sideFormText(home)} / ${sideFormText(away)}`], ['Contexte', 'records, fatigue et déplacement à enrichir']];
    return `
      <article class="detail-card wide sport-insight-card">
        <h4>Fiche ${escapeHtml(row?.sport || 'sport')} enrichie</h4>
        <div class="sport-insight-grid">
          ${renderDetailPairs(sportRows)}
        </div>
        <h5>${escapeHtml(t('keyPlayers'))}</h5>
        <div class="key-player-grid">
          ${[
            [home?.name || 'Équipe 1', homeAdv],
            [away?.name || 'Équipe 2', awayAdv]
          ].map(([label, stats]) => `
            <article class="key-player-card">
              <strong>${escapeHtml(label)}</strong>
              <em>Stats équipe avancées</em>
              <div class="stat-chip-row">
                ${statChip('Runs/pts par match', stats?.runs_per_game ?? stats?.points_per_game, '', 2)}
                ${statChip('OPS', stats?.team_OPS, '', 3)}
                ${statChip('ERA', stats?.team_ERA, '', 2)}
                ${statChip('WHIP', stats?.team_WHIP, '', 2)}
                ${statChip('Forme attaque', stats?.attack_rating, '', 0)}
                ${statChip('Forme défense', stats?.defense_rating, '', 0)}
              </div>
            </article>
          `).join('')}
        </div>
      </article>
    `;
  }

  function buildSportInsightHtml(row) {
    const sport = String(row?.sport || row?.match?.sport || '').toLowerCase();
    if (sport.includes('football') || sport.includes('soccer')) return buildFootballInsightHtml(row);
    if (sport.includes('tennis')) return buildTennisInsightHtml(row);
    return buildOtherSportInsightHtml(row);
  }

  function isFootballRow(row) {
    const sport = String(row?.sport || row?.match?.sport || '').toLowerCase();
    return sport.includes('football') || sport.includes('soccer') || sport === 'foot';
  }

  function userFacingGuardText(value) {
    return cleanLabel(value, '')
      .replace(/lineup_missing_near_kickoff/gi, 'composition manquante proche du coup d’envoi')
      .replace(/availability_missing_near_kickoff/gi, 'infos effectif manquantes proche du coup d’envoi')
      .replace(/team_strength_context_missing/gi, 'niveau d’équipe à consolider')
      .replace(/\bedge\b/gi, 'avantage')
      .replace(/\bKelly nul\b/gi, 'mise non positive')
      .replace(/\bKelly\b/gi, 'mise')
      .replace(/\bmise nul\b/gi, 'mise non positive')
      .replace(/\b1N2\b/gi, 'vainqueur du match')
      .replace(/_/g, ' ');
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

  function simpleMarketLabelForRow(row) {
    const group = rowMarketPreferenceKey(row);
    const labels = {
      winner: 'Vainqueur du match',
      goals: 'Plus / Moins de buts',
      btts: 'Les deux équipes marquent',
      scorer: 'Buteur',
      halftime: 'Mi-temps vainqueur'
    };
    return labels[group] || formatMarketName(row?.marketKey || row?.market || '');
  }

  function cleanActionLabel(value) {
    return cleanLabel(value, '').replace(/\s+/g, ' ').trim();
  }

  function userBetLabel(row) {
    const label = cleanActionLabel(row?.label || '');
    const group = rowMarketPreferenceKey(row);
    if (group === 'winner') {
      if (/^(nul|match nul)$/i.test(label)) return 'Match nul';
      return label || 'Vainqueur du match';
    }
    if (group === 'goals') return label || 'Plus / Moins de buts';
    if (group === 'btts') {
      if (/^(oui|yes)$/i.test(label)) return 'Les deux équipes marquent';
      if (/^(non|no)$/i.test(label)) return 'Les deux équipes ne marquent pas';
      return label || 'Les deux équipes marquent';
    }
    if (group === 'scorer') return label ? `${label} marque dans le match` : 'Un joueur marque dans le match';
    if (group === 'halftime') {
      if (/nul|match nul/i.test(label)) return 'Match nul à la mi-temps';
      if (/m[eè]ne|mi-temps/i.test(label)) return label;
      return label ? `${label} mène à la mi-temps` : 'Vainqueur à la mi-temps';
    }
    return label || formatMarketName(row?.marketKey || row?.market || 'Pari');
  }

  function compactConcreteSignals(row) {
    const sport = String(row?.sport || row?.match?.sport || '').toLowerCase();
    const marketKey = String(row?.marketKey || '').toLowerCase();
    const items = [];
    // Sprint 47 — Buteurs : signaux spécifiques avant les signaux génériques
    // par sport. Un pick "Mbappé marque" doit dire pourquoi : forme buteur,
    // qualité joueur, position attaque, lineup statut.
    if (marketKey === 'scorer' || /buteur/i.test(row?.market || '')) {
      const playerName = row?.player || row?.label || '';
      const quality = Number(row?.playerQuality?.score ?? row?.contextQuality?.score ?? 0);
      const drivers = Array.isArray(row?.confidenceTrust?.drivers) ? row.confidenceTrust.drivers : [];
      const reasonsArr = Array.isArray(row?.playerQuality?.reasons) ? row.playerQuality.reasons : drivers;
      if (playerName) items.push(`${playerName}`);
      if (quality >= 70) items.push(`qualité buteur ${Math.round(quality)}/100 (forte)`);
      else if (quality >= 50) items.push(`qualité buteur ${Math.round(quality)}/100`);
      const buteurSignal = reasonsArr.find((r) => /titulaire|forme|série|buteur récent|capitaine/i.test(r));
      if (buteurSignal) items.push(buteurSignal);
      if (Number(row?.probability || 0) >= 0.40) items.push(`proba modèle ${Math.round(Number(row.probability) * 100)}%`);
    } else if (sport.includes('football') || sport.includes('soccer')) {
      const homeName = teamDisplayName(row, 'home');
      const awayName = teamDisplayName(row, 'away');
      const home = teamContext(row, 'home');
      const away = teamContext(row, 'away');
      const homeForm = sideFormText(home);
      const awayForm = sideFormText(away);
      if (!/non confirm/i.test(homeForm) || !/non confirm/i.test(awayForm)) {
        items.push(`${homeName} ${homeForm}, ${awayName} ${awayForm}`);
      }
      const goals = [sideGoalText(home), sideGoalText(away)].filter((text) => text && !/confirmer/i.test(text)).slice(0, 2);
      if (goals.length) items.push(`rythme récent: ${goals.join(' / ')}`);
    } else if (sport.includes('tennis')) {
      const match = row?.match || {};
      const { home, away } = getSides(match);
      const surface = match.surface || match.draw;
      if (surface) items.push(`surface ${surface}`);
      const ranks = [home?.rank ? `${home.name} #${home.rank}` : '', away?.rank ? `${away.name} #${away.rank}` : ''].filter(Boolean);
      if (ranks.length) items.push(ranks.join(' · '));
      const h2h = Array.isArray(match.h2h?.meetings) ? match.h2h.meetings.length : 0;
      if (h2h) items.push(`${formatCount(h2h)} H2H locaux`);
      // Sprint 47 — Tennis : surface preferences si dispo
      const homeSurfaceWR = Number(home?.surface_win_rate || home?.elo_surface || 0);
      const awaySurfaceWR = Number(away?.surface_win_rate || away?.elo_surface || 0);
      if (Number.isFinite(homeSurfaceWR) && homeSurfaceWR > 0.5) items.push(`${home.name} fort sur ${surface || 'cette surface'}`);
      else if (Number.isFinite(awaySurfaceWR) && awaySurfaceWR > 0.5) items.push(`${away.name} fort sur ${surface || 'cette surface'}`);
    } else if (sport.includes('baseball')) {
      // Sprint 47 — Baseball : pitcher matchup + ERA si dispo
      const match = row?.match || {};
      const { home, away } = getSides(match);
      const homePitcher = home?.starter_pitcher || home?.starting_pitcher || home?.starter || home?.advanced?.starter;
      const awayPitcher = away?.starter_pitcher || away?.starting_pitcher || away?.starter || away?.advanced?.starter;
      if (homePitcher || awayPitcher) {
        items.push(`Pitchers ${homePitcher || '?'} vs ${awayPitcher || '?'}`);
      }
      const homeERA = Number(home?.advanced?.era || home?.team_ERA);
      const awayERA = Number(away?.advanced?.era || away?.team_ERA);
      if (Number.isFinite(homeERA) && Number.isFinite(awayERA)) {
        items.push(`ERA équipes ${homeERA.toFixed(2)} vs ${awayERA.toFixed(2)}`);
      }
      const teamForm = [sideFormText(home), sideFormText(away)].filter((text) => text && !/non confirm/i.test(text)).join(' / ');
      if (teamForm) items.push(`forme ${teamForm}`);
    } else {
      const match = row?.match || {};
      const { home, away } = getSides(match);
      const homeAdvanced = home?.advanced || home?.mlb_advanced || home?.nba_advanced || home?.nhl_advanced || home?.team_stats || {};
      const awayAdvanced = away?.advanced || away?.mlb_advanced || away?.nba_advanced || away?.nhl_advanced || away?.team_stats || {};
      const teamForm = [sideFormText(home), sideFormText(away)].filter((text) => text && !/non confirm/i.test(text)).join(' / ');
      const stat = homeAdvanced.era || homeAdvanced.team_ERA || homeAdvanced.pace || homeAdvanced.points_for_game || homeAdvanced.points_per_game || homeAdvanced.goals_for_avg
        || awayAdvanced.era || awayAdvanced.team_ERA || awayAdvanced.pace || awayAdvanced.points_for_game || awayAdvanced.points_per_game || awayAdvanced.goals_for_avg;
      items.push(`${home?.name || 'Domicile'} vs ${away?.name || 'extérieur'}`);
      if (teamForm) items.push(`forme récente ${teamForm}`);
      if (stat) items.push('stats avancées sport disponibles');
    }
    if (row?.safeAssessment?.reliable) items.push('profil fiable');
    if (row?.winamaxBoost) items.push('cote boostée Winamax');
    return items.filter(Boolean).slice(0, 3);
  }

  function simpleWhyText(row) {
    if (!row) return '';
    const concrete = compactConcreteSignals(row);
    const parts = concrete.slice();
    // Ajout de signaux additionnels : H2H, arbitre, météo, sécurité 2-0,
    // sharp money, etc. — pour répondre au feedback "manque de signaux".
    if (surePickKeys().has(userBetKey(row))) parts.push('sure pick du jour');
    if (isLongShotValue(row)) parts.push('cote haute, mise réduite');
    const trend = trendForRow(row);
    if (trend?.tone === 'hot') parts.push('segment en tendance forte');
    if (trend?.tone === 'cold') parts.push('segment à surveiller');
    if (row.winamaxBoost) parts.push('cote boostée Winamax');
    // Sécurité 2-0 Winamax (Sprint 36) : avantage net pour les Vainqueurs
    const twoGoalRule = row?.winamaxTwoGoalRule;
    if (twoGoalRule?.eligible && Number(twoGoalRule.leadTwoProbability || 0) >= 0.35) {
      parts.push(`filet 2-0 ~${Math.round(Number(twoGoalRule.leadTwoProbability || 0) * 100)}%`);
    }
    // Avantage modèle fort (raw, pas le clamped)
    const rawEdge = Number(row?.edgeRaw ?? row?.edge ?? 0);
    if (Number.isFinite(rawEdge) && rawEdge >= 0.05) {
      parts.push(`avantage modèle +${Math.round(rawEdge * 100)}pt`);
    }
    // Confrontations directes (foot, basket, etc.)
    const h2hMeetings = Array.isArray(row?.match?.h2h?.meetings) ? row.match.h2h.meetings.length : 0;
    if (h2hMeetings >= 3) parts.push(`${h2hMeetings} H2H récents`);
    // Sharp money / mouvement de cote favorable
    if (row?.sharpMoney?.aligned) parts.push('sharp money aligné');
    if (Number(row?.oddsMovementPct || 0) >= 0.05) parts.push('cote en hausse');
    if (Number(row?.oddsMovementPct || 0) <= -0.05) parts.push('cote en baisse rapide');
    // Météo / arbitre signal foot
    const refereeCards = Number(row?.match?.referee?.cardsPerGame);
    if (Number.isFinite(refereeCards) && refereeCards >= 4.5) parts.push(`arbitre sévère (${refereeCards.toFixed(1)} cartons/m)`);
    // Avantage modèle
    if (row.safeAssessment?.reliable) parts.push('profil fiable');
    if (Number(row.priorityScore || 0) >= 60) parts.push('priorité haute');
    if (Number(row.contextQuality?.score || row.match?.context?.quality?.score || 0) >= 65) parts.push('contexte solide');
    if (!parts.length && row.priority?.reason) parts.push('bon signal modèle');
    if (!parts.length) parts.push('cote Winamax intéressante');
    return `Pourquoi : ${[...new Set(parts)].slice(0, 4).join(' · ')}.`;
  }

  // Sprint 72 C6 — Detection hedging : compte combien de paris user actifs
  // visent le meme match (sur-exposition). Retourne {count, matchId} si >=2.
  function detectHedgingForRow(row) {
    if (!row?.match?.id && !row?.id) return null;
    const matchId = String(row.match?.id || row.id || '');
    const bets = (typeof loadUserBets === 'function') ? loadUserBets() : [];
    const onThis = bets.filter((b) => {
      if (String(b.status || '').toLowerCase() !== 'pending') return false;
      return String(b.matchId || b.match_id || '') === matchId;
    });
    if (onThis.length < 1) return null;
    return { count: onThis.length, matchId, bets: onThis };
  }

  // Sprint 72 C3 — Wilson 95% CI sur la prob du pick + ROI segment.
  // Retourne [lo, hi] avec smoothing Beta(1,1) Laplace. n>=5 sinon null.
  function wilsonCi(wins, n, z = 1.96) {
    if (!Number.isFinite(wins) || !Number.isFinite(n) || n < 5) return null;
    const p = wins / n;
    const z2 = z * z;
    const denom = 1 + z2 / n;
    const center = (p + z2 / (2 * n)) / denom;
    const margin = (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denom;
    return [Math.max(0, center - margin), Math.min(1, center + margin)];
  }
  try { window.wilsonCi = wilsonCi; } catch { /* noop */ }

  // Sprint 72 D9 — Checklist visuelle "Why this bet" : analyse contexte du pick
  // pour donner ✅/⚠️/❌ par catégorie clé (forme, cote, modèle, météo, etc.)
  function whyChecklistBullets(row) {
    if (!row) return [];
    const checks = [];
    // Forme
    const homeForm = String(row.match?.competitors?.[0]?.last5 || '').toLowerCase();
    const awayForm = String(row.match?.competitors?.[1]?.last5 || '').toLowerCase();
    const homeWins = (homeForm.match(/w/g) || []).length;
    const awayWins = (awayForm.match(/w/g) || []).length;
    if (homeForm || awayForm) {
      const dominant = homeWins >= awayWins ? homeWins : awayWins;
      const tone = dominant >= 3 ? 'ok' : dominant >= 2 ? 'warn' : 'bad';
      checks.push({ tone, icon: '🔥', label: 'Forme récente', detail: `${homeWins}W home · ${awayWins}W away` });
    }
    // Edge modèle
    const rawEdge = Number(row.edge || 0);
    const edgeTone = rawEdge >= 0.05 ? 'ok' : rawEdge >= 0.02 ? 'warn' : 'bad';
    checks.push({ tone: edgeTone, icon: '🧠', label: 'Avantage modèle', detail: `${rawEdge > 0 ? '+' : ''}${(rawEdge * 100).toFixed(1)}pt` });
    // Confiance / segment
    const conf = Number(row.safeAssessment?.confidence || row.probability || 0);
    const sample = Number(row.segmentValidation?.sample || row.calibration?.sample || 0);
    if (sample >= 15) {
      const roi = Number(row.segmentValidation?.roi ?? row.calibration?.roi ?? 0);
      const tone = roi > 0.05 ? 'ok' : roi >= -0.02 ? 'warn' : 'bad';
      checks.push({ tone, icon: '📊', label: 'Segment historique', detail: `${sample} paris · ROI ${roi > 0 ? '+' : ''}${Math.round(roi * 100)}%` });
    } else {
      checks.push({ tone: 'warn', icon: '📊', label: 'Segment historique', detail: sample > 0 ? `${sample} paris (court)` : 'Aucune donnée' });
    }
    // Cote vérifiée Winamax
    const isVerified = row.oddValidation?.status === 'verified' || (row.match?.winamax?.markets && row.match.winamax.markets['1n2']);
    checks.push({
      tone: isVerified ? 'ok' : 'warn',
      icon: '✓',
      label: 'Cote Winamax',
      detail: isVerified ? 'Vérifiée à l\'instant' : 'À vérifier sur Winamax'
    });
    // Sharp money aligné
    if (row.sharpMoney?.aligned === true) {
      checks.push({ tone: 'ok', icon: '🦈', label: 'Sharp money', detail: 'Aligné avec le pick' });
    } else if (row.sharpMoney?.aligned === false) {
      checks.push({ tone: 'bad', icon: '🦈', label: 'Sharp money', detail: 'Contre le pick (⚠ reverse line movement)' });
    }
    // Météo (foot)
    const weather = row.match?.weather || {};
    const precip = Number(weather.precip || 0);
    const wind = Number(weather.wind || 0);
    if (precip > 5 || wind > 30) {
      checks.push({ tone: 'warn', icon: '🌦️', label: 'Météo', detail: `${precip > 5 ? `Pluie ${precip}mm` : ''}${precip > 5 && wind > 30 ? ' · ' : ''}${wind > 30 ? `Vent ${wind}km/h` : ''}` });
    }
    // Compositions confirmées (foot)
    const homeConf = row.match?.lineups?.home?.confirmed;
    const awayConf = row.match?.lineups?.away?.confirmed;
    if (homeConf || awayConf) {
      const bothConf = homeConf && awayConf;
      checks.push({ tone: bothConf ? 'ok' : 'warn', icon: '👥', label: 'Compositions', detail: bothConf ? 'Les 2 confirmées' : '1 confirmée seulement' });
    }
    return checks.slice(0, 7);
  }

  // Sprint 62 : convertit simpleWhyText en bullets visuelles avec icone par
  // type de raison. Utilise pour la modal magazine layout.
  function keyReasonsBullets(row) {
    const raw = simpleWhyText(row) || '';
    const trimmed = raw.replace(/^Pourquoi\s*:\s*/i, '').replace(/\.$/, '');
    if (!trimmed) return [];
    const parts = trimmed.split(/\s+·\s+/).map((s) => s.trim()).filter(Boolean);
    const iconFor = (text) => {
      const t = String(text || '').toLowerCase();
      if (/cote\s*bo[oô]st|boost[ée]/.test(t)) return '⚡';
      if (/sharp\s*money|cote\s+en\s+(hausse|baisse)/.test(t)) return '📈';
      if (/filet\s*2-0|s[éeè]curit[éeè]\s*2-0/.test(t)) return '🛡️';
      if (/profil\s*fiable|fiable|priorit[éeè]\s*haute/.test(t)) return '✅';
      if (/arbitre|carton|disciplin/.test(t)) return '🟨';
      if (/m[ée]t[ée]o|pluie|vent|temp[ée]rature/.test(t)) return '🌦️';
      if (/forme|s[éeè]rie|tendance/.test(t)) return '🔥';
      if (/qualit[éeè]\s*buteur|buteur/.test(t)) return '🎯';
      if (/avantage\s*mod[èeé]le|edge|proba\s*mod[èeé]le|mod[èeé]le/.test(t)) return '🧠';
      if (/h2h|confront/.test(t)) return '🤝';
      if (/sure\s*pick|s[ûuü]r\s*pick/.test(t)) return '⭐';
      if (/surface|terrain/.test(t)) return '🎾';
      if (/contexte\s*solide/.test(t)) return '🏟️';
      if (/cote\s*haute|outsider/.test(t)) return '💎';
      if (/rythme|stat|era|pace|points/.test(t)) return '📊';
      if (/pitcher|starter/.test(t)) return '⚾';
      return '•';
    };
    return parts.slice(0, 5).map((text) => ({ icon: iconFor(text), text }));
  }

  function actionPickHtml(row, { compact = false } = {}) {
    const stake = visibleStakeText(row);
    return `
      <div class="action-pick ${compact ? 'compact' : ''}">
        <div><span>PARI :</span><strong>${escapeHtml(userBetLabel(row))}</strong></div>
        <div><span>COTE :</span><strong>${escapeHtml(formatOdd(row?.odd || 0))} Winamax</strong></div>
        <div><span>MISE :</span><strong>${escapeHtml(stake)}</strong></div>
        ${compact ? '' : `<p>${escapeHtml(simpleWhyText(row))}</p>`}
      </div>
    `;
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
      '1n2': 'Vainqueur du match',
      'matchwinner': 'Vainqueur du match',
      'teamtotal': 'Total équipe',
      'basketballtotal': 'Total basket',
      'baskettotal': 'Total basket',
      'hockeytotal': 'Total buts',
      'baseballtotal': 'Total runs',
      'httotal': 'Total mi-temps',
      'htou': 'Total mi-temps',
      'halftimetotal': 'Total mi-temps',
      'ht1n2': 'Mi-temps vainqueur',
      'btts': 'Les deux équipes marquent',
      'resultbtts': 'Résultat + les deux marquent',
      'doublechance': 'Double chance',
      'handicap': 'Handicap',
      'dnb': 'Remboursé si nul',
      'exactscore': 'Score exact',
      'ou': 'Plus / Moins',
      'ou15': 'Plus / Moins 1,5 buts',
      'ou25': 'Plus / Moins 2,5 buts',
      'ou35': 'Plus / Moins 3,5 buts',
      'tennisgames': 'Jeux tennis',
      'tennissets': 'Sets tennis'
    };
    if (labels[normalized]) return labels[normalized];
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\bou(\d)(\d)\b/i, 'Plus / Moins $1,$2')
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
      state.modelRealityAudit = null;
      state.probabilityCalibration = null;
      state.policyCandidates = null;
      state.sourceHealth = null;
      state.decisionCenter = null;
      state.agentBlockers = null;
      state.clvSummary = null;
      state.dashboardMeta = null;
      state.todayFunnel = null;
      state.coverage24h = null;
      state.winamaxMarketAudit = null;
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
    state.modelRealityAudit = analysis.modelRealityAudit || null;
    state.probabilityCalibration = analysis.probabilityCalibration || null;
    state.policyCandidates = analysis.policyCandidates || null;
    state.sourceHealth = analysis.sourceHealth || null;
    state.decisionCenter = analysis.decisionCenter || null;
    state.agentBlockers = analysis.agentBlockers || null;
    state.clvSummary = analysis.clvSummary || null;
    state.dashboardMeta = analysis.dashboardMeta || null;
    state.todayFunnel = analysis.todayFunnel || null;
    state.coverage24h = analysis.coverage24h || null;
    state.winamaxMarketAudit = analysis.winamaxMarketAudit || null;
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
    renderDeepSearch();
    updateWebEnrichmentSummary();
    renderActiveModelAdjustments();
    renderLearningFeedback();
    renderWinamaxMarketAudit();
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
    runAutoTracking();
    refreshLiveScores().catch(() => {});
    scheduleBackgroundRefresh();
  }

  function updatePickFilters() {
    const prefs = loadPreferences();
    const marketPrefs = expandMarketPreferences(prefs.markets, { expert: Boolean(prefs.expertMode) });
    const poolRaw = state.allPicks.length ? state.allPicks : state.picks;
    const pool = poolRaw.filter((row) => {
      if (!pickHasCoreData(row) || !canDisplayStake(row)) return false;
      return !marketPrefs.groups.size || marketPrefs.groups.has(rowMarketPreferenceKey(row)) || marketPrefs.keys.has(marketKeyFromRow(row));
    });
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
        const key = rowMarketPreferenceKey(row);
        const label = simpleMarketLabelForRow(row);
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
      sort: $('#pick-sort')?.value || 'priority',
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

  function uniqueCleanLabels(values) {
    const seen = new Set();
    const rows = [];
    (Array.isArray(values) ? values : []).forEach((value) => {
      const label = String(value || '').trim();
      const key = normalizeUiKey(label);
      if (!label || label.length < 2 || seen.has(key)) return;
      seen.add(key);
      rows.push(label);
    });
    return rows;
  }

  function rowTeamNames(row) {
    const match = row?.match || {};
    const competitors = Array.isArray(match.competitors) ? match.competitors : [];
    const names = [
      match.home,
      match.away,
      match.homeName,
      match.awayName,
      row?.home,
      row?.away,
      ...competitors.flatMap((team) => [team?.name, team?.short, team?.displayName])
    ];
    const title = String(row?.title || '');
    if (title.includes(' vs ')) {
      names.push(...title.split(/\s+vs\s+/i));
    }
    return uniqueCleanLabels(names);
  }

  function rowPlayerName(row) {
    return String(row?.player || row?.playerName || row?.scorer || row?.athlete || row?.participant || '').trim();
  }

  function favoriteCatalog() {
    const teamRows = [];
    const playerRows = [];
    [...(state.matches || []), ...(state.allPicks || []), ...(state.picks || [])].forEach((row) => {
      teamRows.push(...rowTeamNames(row));
    });
    (state.scorers || []).forEach((row) => {
      teamRows.push(...rowTeamNames(row));
      playerRows.push(rowPlayerName(row), row?.label, row?.name);
    });
    return {
      teams: uniqueCleanLabels(teamRows).sort((a, b) => a.localeCompare(b, 'fr')),
      players: uniqueCleanLabels(playerRows).sort((a, b) => a.localeCompare(b, 'fr'))
    };
  }

  function rowMatchesFavorite(row, favorites = loadFavorites()) {
    const teamKeys = new Set((favorites.teams || []).map(normalizeUiKey).filter(Boolean));
    const playerKeys = new Set((favorites.players || []).map(normalizeUiKey).filter(Boolean));
    if (!teamKeys.size && !playerKeys.size) return false;
    const teams = rowTeamNames(row).map(normalizeUiKey);
    if (teams.some((key) => teamKeys.has(key))) return true;
    const player = normalizeUiKey(rowPlayerName(row) || row?.label || '');
    if (player && playerKeys.has(player)) return true;
    const text = normalizeUiKey(pickSearchText(row));
    return [...teamKeys, ...playerKeys].some((key) => key && text.includes(key));
  }

  function favoritePickRows() {
    const favorites = loadFavorites();
    const seen = new Set();
    const rows = [...(state.allPicks || []), ...(state.picks || []), ...(state.scorers || [])]
      .filter((row) => pickHasCoreData(row) && rowMatchesFavorite(row, favorites))
      .filter((row) => {
        const key = userBetKey(row);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        const aReady = Number(Boolean(canDisplayStake(a)));
        const bReady = Number(Boolean(canDisplayStake(b)));
        if (bReady !== aReady) return bReady - aReady;
        return Date.parse(a.start || '') - Date.parse(b.start || '') || priorityValue(b) - priorityValue(a);
      });
    return rows.slice(0, 12);
  }

  function pickFiltersActive(filters) {
    return Boolean(filters.query || filters.sport !== 'all' || filters.league !== 'all' || filters.market !== 'all' || filters.edgeMin || filters.oddMin || filters.sort !== 'priority');
  }

  function pickHasCoreData(row) {
    if (!row || typeof row !== 'object') return false;
    const hasWinamax = Boolean(row.winamaxUrl || row.match?.winamax?.available === true || row.match?.winamax?.match_id);
    // Sprint 42 : pour les fallbacks cote-based sur sports hors foot
    // (tennis/baseball/basket/hockey/NFL/MMA), on accepte un edge
    // brut jusqu'à -4pt. Le pick restera "À surveiller" sans bouton
    // Je mise. Cela débloque la couverture sport là où le moteur
    // produit des Vainqueurs basés cote Winamax sans signal positif net.
    const sportKey = String(row.sport || row.match?.sport || '').toLowerCase();
    const isMultiSportLimited = row.limitedConfidence === true
      && /tennis|baseball|basket|hockey|football américain|mma|rugby|boxe/.test(sportKey);
    const edgeFloor = isMultiSportLimited ? -0.04 : 0.01;
    return Boolean(
      row.title &&
      row.start &&
      row.market &&
      row.label &&
      hasWinamax &&
      Number(row.odd || 0) > 1 &&
      Number(row.probability || 0) > 0 &&
      displayEdgeValue(row) >= edgeFloor
    );
  }

  function dashboardPickRows(filters) {
    const active = pickFiltersActive(filters);
    const prefs = loadPreferences();
    const marketPrefs = expandMarketPreferences(prefs.markets, { expert: Boolean(prefs.expertMode) });
    const advancedSelected = Boolean(prefs.expertMode) && (prefs.markets || []).some((key) => !isSimpleMarketPreference(key));
    const base = (active || advancedSelected) && state.allPicks.length ? state.allPicks : state.picks;
    const allowedSports = new Set((prefs.sports || []).map((item) => String(item).toLowerCase()));
    const prefEdgeMin = Math.max(0, Number(prefs.edgeMin || 0) / 100);
    const prefOddMin = Math.max(0, Number(prefs.oddMin || 0));
    const prefOddMax = Math.max(0, Number(prefs.oddMax || 0));
    const prefConfidenceMin = Math.max(0, Number(prefs.confidenceMin || 0) / 100);
    const rows = base.filter((row) => {
      if (!pickHasCoreData(row)) return false;
      if (!canDisplayStake(row) && !canDisplayPickCard(row)) return false;
      if (allowedSports.size && !allowedSports.has(String(row.sport || '').toLowerCase())) return false;
      if (marketPrefs.groups.size && !marketPrefs.groups.has(rowMarketPreferenceKey(row)) && !marketPrefs.keys.has(marketKeyFromRow(row))) return false;
      if (prefEdgeMin && displayEdgeValue(row) < prefEdgeMin) return false;
      if (prefOddMin > 1 && Number(row.odd || 0) < prefOddMin) return false;
      if (prefOddMax > 1 && Number(row.odd || 0) > prefOddMax) return false;
      if ((prefs.strict || prefConfidenceMin > 0) && Number(row.probability || 0) < prefConfidenceMin) return false;
      const adjustment = adjustmentForRow(row);
      if (adjustment?.direction === 'harden') {
        const adjustedEdge = Math.max(prefEdgeMin, 0) + Math.max(0, Number(adjustment.edgeDelta || 0));
        const adjustedConfidence = Math.max(prefConfidenceMin, 0) + Math.max(0, Number(adjustment.confidenceDelta || 0));
        if (displayEdgeValue(row) < adjustedEdge) return false;
        if (Number(row.probability || 0) < adjustedConfidence) return false;
      }
      if (filters.query && !pickSearchText(row).includes(filters.query)) return false;
      if (filters.sport !== 'all' && row.sport !== filters.sport) return false;
      if (filters.league !== 'all' && leagueKeyFromRow(row) !== filters.league) return false;
      if (filters.market !== 'all' && rowMarketPreferenceKey(row) !== filters.market && marketKeyFromRow(row) !== filters.market) return false;
      if (filters.edgeMin && displayEdgeValue(row) < filters.edgeMin) return false;
      if (filters.oddMin && Number(row.odd || 0) < filters.oddMin) return false;
      if (state.calendarDayFilter && pickDayKey(row) !== state.calendarDayFilter) return false;
      return true;
    });
    rows.sort((a, b) => {
      if (filters.sort === 'priority') {
        const todayKey = parisDayKey();
        const todayReadyCount = rows.filter((row) => pickDayKey(row) === todayKey && canDisplayStake(row)).length;
        if (!todayReadyCount) {
          const todayDelta = Number(pickDayKey(b) === todayKey) - Number(pickDayKey(a) === todayKey);
          if (todayDelta) return todayDelta;
        }
        const readyDelta = Number(Boolean(canDisplayStake(b))) - Number(Boolean(canDisplayStake(a)));
        if (readyDelta) return readyDelta;
        return priorityValue(b) - priorityValue(a) || displayEdgeValue(b) - displayEdgeValue(a) || new Date(a.start || 0) - new Date(b.start || 0);
      }
      if (filters.sort === 'kickoff') return new Date(a.start || 0) - new Date(b.start || 0);
      if (filters.sort === 'confidence') return Number(b.confidenceTrust?.score || b.probability || 0) - Number(a.confidenceTrust?.score || a.probability || 0);
      if (filters.sort === 'real_confidence') return safeConfidenceValue(b) - safeConfidenceValue(a) || displayEdgeValue(b) - displayEdgeValue(a);
      if (filters.sort === 'odd') return Number(b.odd || 0) - Number(a.odd || 0);
      return displayEdgeValue(b) - displayEdgeValue(a);
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
      const key = rowMarketPreferenceKey(row);
      const bucket = byMarket.get(key) || {
        key,
        label: simpleMarketLabelForRow(row),
        count: 0,
        edge: 0,
        bestOdd: 0
      };
      bucket.count += 1;
      bucket.edge += displayEdgeValue(row);
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
        <em>cote max ${escapeHtml(formatOdd(item.bestOdd))}</em>
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

  // Sprint 63 — quiet hours : pas de notif locale entre 23h-7h Paris sauf
  // si user a explicitement opt-in. Webhook externe (mobile) reste OK.
  function isQuietHour() {
    try {
      const prefs = loadPreferences();
      if (prefs?.notifyQuietHoursOff === true) return false;
      const h = new Date().getHours();
      return h >= 23 || h < 7;
    } catch { return false; }
  }

  function notifyUser(title, body, row) {
    sendExternalAlert(title, body, row).catch((error) => {
      pushLog('warn', `Webhook mobile non envoyé: ${error.message}`);
    });
    if (!('Notification' in window)) return;
    if (isQuietHour()) return; // Sprint 63 — respect quiet hours
    const show = () => {
      try {
        // Sprint 63 — tag pour dedup notifs identiques (un seul popup par match)
        const tag = row?.id ? `match-${row.id}` : `alert-${title.replace(/\s+/g, '-').toLowerCase()}`;
        const notification = new Notification(title, {
          body,
          silent: true,
          tag,
          renotify: false
        });
        notification.onclick = () => {
          window.focus();
          if (row?.id) openMatchDetail(row.id);
          try { notification.close(); } catch { /* noop */ }
        };
        // Sprint 63 — auto-close apres 10s si user n'a pas interagi
        setTimeout(() => { try { notification.close(); } catch { /* noop */ } }, 10000);
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

  function richPrematchContext(row) {
    const news = newsForRow(row);
    const newsText = news?.headline ? `${news.headline}` : 'news watcher prêt';
    const homeLineup = lineupContext(row, 'home');
    const awayLineup = lineupContext(row, 'away');
    const lineupText = (homeLineup.confirmed || awayLineup.confirmed)
      ? 'compositions sorties'
      : (homeLineup.present || awayLineup.present || homeLineup.projected || awayLineup.projected)
        ? 'compositions probables lues'
        : 'compositions à re-checker';
    const injuryText = hasKeyInjurySignal(row) ? 'absence clé à vérifier' : 'pas d’absence clé forte';
    const edgeText = displayEdgeValue(row) > 0 ? `avantage ${formatPct(displayEdgeValue(row), 1)}` : 'avantage à confirmer';
    return `${lineupText} · ${injuryText} · ${newsText} · ${edgeText}`;
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

  function maybeNotifyFavoritePicks(rows) {
    const favorites = loadFavorites();
    if (!(favorites.teams || []).length && !(favorites.players || []).length) return;
    const seen = new Set(readStorageJson(FAVORITE_ALERT_KEY, []));
    const candidate = (rows || []).find((row) => rowMatchesFavorite(row, favorites) && displayEdgeValue(row) >= 0.05);
    if (!candidate) return;
    const key = `${userBetKey(candidate)}:${formatOdd(candidate.odd)}`;
    if (seen.has(key)) return;
    seen.add(key);
    writeStorageJson(FAVORITE_ALERT_KEY, Array.from(seen).slice(-120));
    alertOnce(`favorite:${key}`, 'Pick sur ton favori', `${candidate.title} · ${userBetLabel(candidate)} · cote ${formatOdd(candidate.odd)}.`, candidate);
  }

  function maybeNotifyTrendFormation(rows) {
    const seen = new Set(readStorageJson(TREND_ALERT_KEY, []));
    const candidate = (rows || []).find((row) => {
      const trend = trendForRow(row);
      return trend?.tone === 'hot' || trend?.tone === 'cold';
    });
    if (!candidate) return;
    const trend = trendForRow(candidate);
    const key = `${trend.tone}:${trendBucketForRow(candidate)?.key || userBetKey(candidate)}`;
    if (seen.has(key)) return;
    seen.add(key);
    writeStorageJson(TREND_ALERT_KEY, Array.from(seen).slice(-80));
    alertOnce(
      `trend:${key}`,
      trend.tone === 'hot' ? 'Tendance forte détectée' : 'Tendance froide détectée',
      `${candidate.title} · ${trend.reason}.`,
      candidate
    );
  }

  function maybeNotifyPickChanges() {
    const prefs = loadPreferences();
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
    maybeNotifyFavoritePicks(readyRows);
    maybeNotifyTrendFormation(readyRows);
    const topPick = sortedPriorityRows(readyRows)[0] || null;
    const topKey = topPick ? userBetKey(topPick) : '';
    const previousTop = localStorage.getItem(TOP_PICK_ALERT_KEY) || '';
    if (topKey) {
      try {
        localStorage.setItem(TOP_PICK_ALERT_KEY, topKey);
      } catch {
        // Alerte confort uniquement.
      }
      if (prefs.topPickAlertsEnabled !== false && previousTop && previousTop !== topKey) {
        alertOnce(`top-pick:${topKey}`, 'Nouveau top pick', `${topPick.title} · ${topPick.market} ${topPick.label} · priorité ${priorityValue(topPick).toFixed(0)}/100.`, topPick);
      }
    }
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
    if (reminder && prefs.prematchAlertsEnabled !== false) {
      alertOnce(
        `kickoff:${userBetKey(reminder)}`,
        'Pick proche du coup d’envoi',
        `${reminder.priorityRank ? `#${reminder.priorityRank} · ` : ''}${reminder.title} · ${userBetLabel(reminder)} ${formatOdd(reminder.odd)} dans ${countdownLabel(reminder.start)}. ${richPrematchContext(reminder)}.`,
        reminder
      );
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
        && displayEdgeValue(row) >= 0.10
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
      `${bigPick.title} · ${userBetLabel(bigPick)} ${formatOdd(bigPick.odd)} · mise ${visibleStakeText(bigPick)}`,
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
    return displayEdgeValue(row) >= 0.10 && Number(row?.calibration?.sample || 0) === 0;
  }

  function ultimateBetCandidate(rows) {
    const now = Date.now();
    const horizon = now + 24 * 60 * 60 * 1000;
    return (Array.isArray(rows) ? rows : [])
      .filter((row) => canDisplayStake(row))
      .filter((row) => {
        const ts = Date.parse(row.start || '');
        return Number.isFinite(ts) && ts > now && ts <= horizon;
      })
      .filter((row) => displayEdgeValue(row) >= 0.07)
      .filter((row) => safeConfidenceValue(row) >= 0.65)
      .filter(hasPositiveHistoricalSegment)
      .sort((a, b) => (
        priorityValue(b) - priorityValue(a)
        || displayEdgeValue(b) - displayEdgeValue(a)
        || safeConfidenceValue(b) - safeConfidenceValue(a)
        || Date.parse(a.start || '') - Date.parse(b.start || '')
      ))[0] || null;
  }

  function trackButtonHtml(row, label = 'Je mise') {
    const tracked = new Set(loadUserBets().filter((bet) => bet.status === 'pending').map((bet) => bet.key));
    const discipline = bankrollDisciplineStatus();
    const trackKey = userBetKey(row);
    const isTracked = tracked.has(trackKey);
    if (!isBeforeKickoff(row)) return '<span class="match-sub">Déjà commencé</span>';
    if (!canDisplayStake(row)) return '<span class="match-sub">À surveiller</span>';
    if (!(displayStakeAmount(row) > 0)) return '<span class="match-sub">Hors budget jour</span>';
    if (discipline.blocked) {
      return `<button type="button" class="track-bet-btn tracked" disabled title="${escapeHtml(discipline.detail)}">${escapeHtml(discipline.label)}</button>`;
    }
    return `<button type="button" class="track-bet-btn${isTracked ? ' tracked' : ''}" data-track-bet-key="${escapeHtml(trackKey)}">${isTracked ? 'Suivi' : escapeHtml(label)}</button>`;
  }

  function winamaxOpenButtonHtml(row, label = 'Ouvrir Winamax') {
    const url = safeExternalUrl(row?.winamaxUrl || row?.match?.winamax?.url, 'www.winamax.fr');
    if (!url) return '';
    return `<a class="ghost-btn winamax-open-btn" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
  }

  function betTypeBadgeHtml(row) {
    const type = row?.winamaxBetType;
    if (!type?.label) return '';
    return `<span title="${escapeHtml(type.reason || '')}">${escapeHtml(type.label)}</span>`;
  }

  function boostBadgeHtml(row) {
    const boost = row?.winamaxBoost;
    if (!boost) return '';
    const odds = boost.to ? `${boost.from ? `${Number(boost.from).toFixed(2)} → ` : ''}${Number(boost.to).toFixed(2)}` : '';
    return `<span title="${escapeHtml(boost.sample || 'Boost Winamax détecté dans les données locales')}">Boost Winamax${odds ? ` ${escapeHtml(odds)}` : ''}</span>`;
  }

  function twoGoalSafetyBadgeHtml(row) {
    const safety = row?.winamaxTwoGoalRule;
    if (!safety?.eligible) return '';
    const pct = Math.round(Number(safety.leadTwoProbability || 0) * 100);
    if (!(pct > 0)) return '';
    return `<span class="two-goal-badge" title="Paiement anticipé Winamax estimé si l’équipe mène de 2 buts sur ce Vainqueur foot">🛡 ${escapeHtml(String(pct))}% sécurité 2-0</span>`;
  }

  function ultimateBetReason(row) {
    if (!row) return 'Aucun pari simple ne réunit assez de signaux pour devenir le pari principal.';
    return `Pourquoi #1 ? ${userBetLabel(row)} à ${formatOdd(row.odd)} sur Winamax, départ ${countdownLabel(row.start)}. ${simpleWhyText(row).replace(/^Pourquoi\s*:\s*/i, '')}`;
  }

  function topPickEyebrow(row, rows = []) {
    if (!row) return 'Top pick';
    const ts = rowKickoffTime(row);
    const now = Date.now();
    const today = parisDayKey(new Date(now));
    const tomorrow = parisDayKey(new Date(now + 24 * 60 * 60 * 1000));
    const day = Number.isFinite(ts) ? parisDayKey(new Date(ts)) : '';
    const scope = Number.isFinite(ts) && ts - now <= 3 * 60 * 60 * 1000
      ? 'Top pick maintenant'
      : day === today
        ? 'Top pick ce soir'
        : day === tomorrow
          ? 'Top pick demain'
          : 'Top pick à venir';
    return `${scope} · #1 sur ${formatCount((rows || []).filter(isReadyToStakeRow).length || rows.length || 1)} paris prêts`;
  }

  function balancedReadySelection(rows, limit = 8) {
    const sorted = (Array.isArray(rows) ? rows : [])
      .slice()
      .sort((a, b) => Number(b.priorityScore || 0) - Number(a.priorityScore || 0)
        || Date.parse(a.start || '') - Date.parse(b.start || '')
        || Number(b.edge || 0) - Number(a.edge || 0));
    const winnerTarget = Math.min(
      sorted.filter(isWinnerRow).length,
      Math.max(1, Math.ceil(limit * 0.40))
    );
    const selected = [];
    const seen = new Set();
    const add = (row) => {
      const key = userBetKey(row);
      if (!key || seen.has(key) || selected.length >= limit) return;
      seen.add(key);
      selected.push(row);
    };
    sorted.filter(isWinnerRow).slice(0, winnerTarget).forEach(add);
    sorted.forEach(add);
    return selected.slice(0, limit);
  }

  // Sprint 59 (UX simplification) : résumé en 1 phrase clair pour la home.
  function renderDaySummary(rows) {
    const headline = $('#day-summary-headline');
    const detail = $('#day-summary-detail');
    if (!headline || !detail) return;
    const allRows = Array.isArray(rows) ? rows : [];
    const ready = rollingReadyRows(allRows);
    const watch = allRows.filter((row) => row?.limitedConfidence === true || (!row?.safeAssessment?.reliable && row?.safeAssessment?.displayable !== false));
    const next = allRows
      .filter((row) => row?.start && Date.parse(row.start) > Date.now())
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0];
    const nextLabel = next ? `${next.title} dans ${countdownLabel(next.start)}` : null;
    if (ready.length > 0) {
      headline.textContent = `${ready.length} pari${ready.length > 1 ? 's' : ''} prêt${ready.length > 1 ? 's' : ''} sur 24h`;
      const stake = ready.reduce((sum, row) => sum + Number(row.recommendedStake ?? row.stake ?? 0), 0);
      const parts = [];
      if (stake > 0) parts.push(`Mise totale suggérée ${formatMoney(stake)}`);
      if (watch.length) parts.push(`${watch.length} à surveiller`);
      if (nextLabel) parts.push(`prochain départ : ${nextLabel}`);
      detail.textContent = parts.join(' · ') || 'Tout est prêt — clique sur "Je mise" pour suivre.';
    } else if (watch.length > 0) {
      headline.textContent = `Aucun pari sûr maintenant — ${watch.length} à surveiller`;
      detail.textContent = nextLabel ? `Modèle prudent. Prochain match : ${nextLabel}.` : 'Modèle prudent : ne mise que si tu as une conviction propre.';
    } else {
      headline.textContent = 'Aucun pari disponible maintenant';
      detail.textContent = nextLabel ? `Prochain match : ${nextLabel}.` : 'Relance la pipeline ou attends le prochain refresh.';
    }
  }

  // Sprint 45 (UX) : section "À MISER MAINTENANT" en gros, juste sous le bet
  // ultime. Affiche les 3-6 picks les plus solides du jour (status bet OR
  // safeAssessment.reliable) — pas de pics "À surveiller". Si rien :
  // bannière claire avec explication.
  function renderReadyPicksHero(rows) {
    const wrap = $('#ready-picks-hero');
    if (!wrap) return;
    const readyRows = balancedReadySelection(rollingReadyRows(rows), 3);
    if (!readyRows.length) {
      wrap.innerHTML = `
        <div class="ready-hero-empty">
          <h3>Aucun pari à miser maintenant</h3>
          <p>Le modèle est prudent sur les prochaines 24h. Les lignes à surveiller restent visibles sans bouton de mise.</p>
        </div>
      `;
      return;
    }
    wrap.innerHTML = `
      <div class="ready-hero-head">
        <h3>🎯 À MISER MAINTENANT</h3>
        <p>Top ${formatCount(readyRows.length)} lisible · Mise totale suggérée ${escapeHtml(formatMoney(readyRows.reduce((sum, row) => sum + displayStakeAmount(row), 0)))}</p>
      </div>
      <div class="ready-hero-grid">
        ${readyRows.map((row, index) => `
          <article class="ready-hero-card clickable-row" data-match-id="${escapeHtml(row.id)}" tabindex="0" role="button" aria-label="Ouvrir ${escapeHtml(row.title || '')}">
            <header>
              <span class="ready-hero-rank">${index === 0 ? '🏆' : `#${index + 1}`}</span>
              ${matchVisualHtml(row, 'match-visual compact')}
            </header>
            <strong class="ready-hero-title">${escapeHtml(row.title || 'Match')}</strong>
            <em class="ready-hero-time">${escapeHtml(countdownLabel(row.start) || '—')} · ${escapeHtml(row.league || '')}</em>
            <div class="ready-hero-bet">
              <span class="ready-hero-label">PARI</span>
              <strong>${escapeHtml(userBetLabel(row) || row.label || '')}</strong>
            </div>
            <div class="ready-hero-odds">
              <span><em>COTE</em><strong>${escapeHtml(formatOdd(row.odd))}</strong></span>
              <span><em>MISE</em><strong>${escapeHtml(visibleStakeText(row))}</strong></span>
            </div>
            <div class="ready-hero-actions">
              ${trackButtonHtml(row, `Je mise ${visibleStakeText(row)}`)}
              ${row.winamaxUrl ? `<a class="ghost-btn" href="${escapeHtml(row.winamaxUrl)}" target="_blank" rel="noreferrer">Ouvrir Winamax</a>` : ''}
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  function marketCategoryRows(rows, category) {
    const arr = rolling24hRows(rows, canDisplayPickCard);
    if (category === 'ready') return arr.filter(isReadyToStakeRow);
    if (category === 'strict') return arr.filter((row) => isReadyToStakeRow(row) && Boolean(row?.safeAssessment?.reliable) && Number(row?.contextQuality?.score ?? row?.match?.context?.quality?.score ?? 0) >= 55);
    if (category === 'value') return arr.filter((row) => Number(row?.odd || 0) >= 2 && (isReadyToStakeRow(row) || Number(displayEdgeValue(row) || 0) >= 0.03));
    if (category === 'winner') return arr.filter(isWinnerRow);
    if (category === 'goals') return arr.filter((row) => ['goals', 'btts'].includes(rowMarketPreferenceKey(row)));
    if (category === 'scorer') return arr.filter((row) => rowMarketPreferenceKey(row) === 'scorer');
    if (category === 'halftime') return arr.filter((row) => rowMarketPreferenceKey(row) === 'halftime');
    if (category === 'watch') return arr.filter((row) => !isReadyToStakeRow(row));
    if (category === 'night') return nightPickRows(rows, canDisplayPickCard);
    if (category === 'today') return arr.filter(isTodayPick);
    if (category === 'tomorrow') {
      const tomorrow = parisDayKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
      return arr.filter((row) => pickDayKey(row) === tomorrow);
    }
    if (category === 'live') return liveRows().map((item) => item.row).filter(canDisplayPickCard);
    return arr;
  }

  function homeCategoryCardHtml(card) {
    const tone = card.ready > 0 ? 'ok' : card.total > 0 ? 'watch' : 'quiet';
    const value = card.ready > 0 ? `${formatCount(card.ready)} prêt${card.ready > 1 ? 's' : ''}` : `${formatCount(card.total)} ligne${card.total > 1 ? 's' : ''}`;
    return `
      <button class="home-category-card ${tone}" type="button" data-cockpit-category="${escapeHtml(card.key)}" aria-label="${escapeHtml(card.title)}">
        <span>${escapeHtml(card.icon)} ${escapeHtml(card.title)}</span>
        <strong>${escapeHtml(value)}</strong>
        <em>${escapeHtml(card.detail)}</em>
      </button>
    `;
  }

  function renderHomeCategories(rows) {
    const wrap = $('#home-category-grid');
    const count = $('#cockpit-detail-count');
    if (!wrap && !count) return;
    const allRows = Array.isArray(rows) ? rows : [];
    const cockpitRows = rolling24hRows(allRows, canDisplayPickCard);
    const readyRows = cockpitRows.filter(isReadyToStakeRow);
    const sportCount = uniqueCleanLabels(cockpitRows.map((row) => row.sport)).length;
    const cards = [
      {
        key: 'cockpit',
        icon: '🎛',
        title: 'Cockpit pronostics',
        rows: cockpitRows,
        detail: 'Tout ouvrir, filtrer, comparer'
      },
      {
        key: 'ready',
        icon: '✅',
        title: 'À miser',
        rows: marketCategoryRows(allRows, 'ready'),
        detail: 'Uniquement les paris avec bouton'
      },
      {
        key: 'winner',
        icon: '🏆',
        title: 'Vainqueurs',
        rows: marketCategoryRows(allRows, 'winner'),
        detail: 'Paris simples, filet 2-0 Winamax quand dispo'
      },
      {
        key: 'strict',
        icon: '🛡',
        title: 'Strict',
        rows: marketCategoryRows(allRows, 'strict'),
        detail: 'Contexte propre + profil fiable'
      },
      {
        key: 'value',
        icon: '💎',
        title: 'Gros gain',
        rows: marketCategoryRows(allRows, 'value'),
        detail: 'Cotes 2+ avec garde-fous'
      },
      {
        key: 'night',
        icon: '🌙',
        title: 'Nuit',
        rows: marketCategoryRows(allRows, 'night'),
        detail: 'Sports US / Asie'
      },
      {
        key: 'today',
        icon: '📅',
        title: 'Aujourd’hui',
        rows: marketCategoryRows(allRows, 'today'),
        detail: 'Ce qui reste dans la journée'
      },
      {
        key: 'tomorrow',
        icon: '🌅',
        title: 'Demain',
        rows: marketCategoryRows(allRows, 'tomorrow'),
        detail: 'Préparer sans charger l’accueil'
      },
      {
        key: 'goals',
        icon: '⚽',
        title: 'Buts',
        rows: marketCategoryRows(allRows, 'goals'),
        detail: 'Plus/Moins + les deux marquent'
      },
      {
        key: 'scorer',
        icon: '🎯',
        title: 'Buteurs',
        rows: marketCategoryRows(allRows, 'scorer'),
        detail: 'Joueurs qui peuvent marquer'
      },
      {
        key: 'sport',
        icon: '🏀',
        title: 'Par sport',
        rows: cockpitRows,
        detail: `${formatCount(sportCount)} sport${sportCount > 1 ? 's' : ''} couvert${sportCount > 1 ? 's' : ''}`
      },
      {
        key: 'live',
        icon: '🔴',
        title: 'Live',
        rows: marketCategoryRows(allRows, 'live'),
        detail: 'Seulement si match en cours'
      },
      {
        key: 'watch',
        icon: '👁',
        title: 'À surveiller',
        rows: marketCategoryRows(allRows, 'watch'),
        detail: 'Signaux utiles, sans bouton de mise'
      }
    ].map((card) => {
      const ready = card.rows.filter(isReadyToStakeRow).length;
      return { ...card, ready, total: card.rows.length };
    }).filter((card) => card.key === 'cockpit' || card.total > 0);
    if (count) {
      count.textContent = `${formatCount(readyRows.length)} prêts · ${formatCount(cockpitRows.length)} lignes`;
    }
    if (!wrap) return;
    wrap.innerHTML = cards.map(homeCategoryCardHtml).join('');
  }

  function homeSortMode() {
    try {
      const value = localStorage.getItem(HOME_SORT_KEY) || 'confidence';
      return ['confidence', 'kickoff', 'date', 'odd'].includes(value) ? value : 'confidence';
    } catch {
      return 'confidence';
    }
  }

  function setHomeSort(mode) {
    const next = ['confidence', 'kickoff', 'date', 'odd'].includes(mode) ? mode : 'confidence';
    try {
      localStorage.setItem(HOME_SORT_KEY, next);
    } catch {
      // Tri de confort seulement.
    }
    renderBettingHome(state.currentDashboardRows.length ? state.currentDashboardRows : state.picks);
  }

  function homeConfidenceValue(row) {
    const values = [
      safeConfidenceValue(row),
      realConfidenceValue(row),
      Number(row?.probability || 0),
      Number(row?.pred?.probability || 0)
    ].filter((value) => Number.isFinite(value) && value > 0);
    return values.length ? Math.max(...values) : 0;
  }

  function homePickScore(row) {
    const confidence = homeConfidenceValue(row);
    const odd = Number(row?.odd || 0);
    const oddBonus = odd > 1 ? Math.min(14, Math.max(0, (odd - 1) * 4)) : 0;
    const readyBonus = isReadyToStakeRow(row) ? 9 : 0;
    const winnerBonus = isWinnerRow(row) ? 8 : 0;
    const safetyBonus = row?.winamaxTwoGoalRule?.eligible ? Math.min(8, Number(row.winamaxTwoGoalRule.leadTwoProbability || 0) * 10) : 0;
    return confidence * 100 + oddBonus + readyBonus + winnerBonus + safetyBonus;
  }

  function diverseHomeTopRows(rows, limit = 3) {
    const sorted = sortHomeRows(rows, 'confidence');
    const selected = [];
    const seen = new Set();
    const marketCounts = new Map();
    const sportCounts = new Map();
    const add = (row) => {
      const key = userBetKey(row) || row?.id || `${row?.title}:${row?.market}:${row?.label}`;
      if (!row || seen.has(key) || selected.length >= limit) return false;
      seen.add(key);
      selected.push(row);
      const market = rowMarketPreferenceKey(row) || 'other';
      const sport = normalizeUiKey(row?.sport || 'sport');
      marketCounts.set(market, (marketCounts.get(market) || 0) + 1);
      sportCounts.set(sport, (sportCounts.get(sport) || 0) + 1);
      return true;
    };
    const canAddWithDiversity = (row, { strict = true } = {}) => {
      if (!row) return false;
      const key = userBetKey(row) || row?.id || `${row?.title}:${row?.market}:${row?.label}`;
      if (seen.has(key)) return false;
      const market = rowMarketPreferenceKey(row) || 'other';
      const sport = normalizeUiKey(row?.sport || 'sport');
      const maxMarket = strict ? 1 : 2;
      const maxSport = strict ? 2 : 3;
      return (marketCounts.get(market) || 0) < maxMarket && (sportCounts.get(sport) || 0) < maxSport;
    };
    sorted.slice(0, 1).forEach(add);
    if (selected.length < limit && !selected.some(isWinnerRow)) {
      const bestWinner = sorted.find((row) => isWinnerRow(row) && canAddWithDiversity(row, { strict: false }));
      if (bestWinner) add(bestWinner);
    }
    sorted.filter((row) => canAddWithDiversity(row, { strict: true })).forEach(add);
    sorted.filter((row) => canAddWithDiversity(row, { strict: false })).forEach(add);
    sorted.forEach(add);
    return selected.slice(0, limit);
  }

  function sortHomeRows(rows, mode = homeSortMode()) {
    const arr = (Array.isArray(rows) ? rows : []).slice();
    const kickoff = (row) => rowKickoffTime(row);
    const confidenceSort = (a, b) => (
      Number(isReadyToStakeRow(b)) - Number(isReadyToStakeRow(a))
      || homePickScore(b) - homePickScore(a)
      || homeConfidenceValue(b) - homeConfidenceValue(a)
      || Number(b?.odd || 0) - Number(a?.odd || 0)
      || kickoff(a) - kickoff(b)
    );
    if (mode === 'kickoff' || mode === 'date') {
      return arr.sort((a, b) => (
        kickoff(a) - kickoff(b)
        || confidenceSort(a, b)
      ));
    }
    if (mode === 'odd') {
      return arr.sort((a, b) => (
        Number(b?.odd || 0) - Number(a?.odd || 0)
        || homeConfidenceValue(b) - homeConfidenceValue(a)
        || kickoff(a) - kickoff(b)
      ));
    }
    return arr.sort(confidenceSort);
  }

  function homeTopRows(rows, limit = 3) {
    const source = Array.isArray(rows) ? rows : [];
    return diverseHomeTopRows(source, limit);
  }

  function homeCategoryMeta(category) {
    const metas = {
      cockpit: {
        kicker: 'Cockpit 24h',
        title: 'Tous les paris triables',
        subtitle: 'Vue complète pour filtrer, comparer et ouvrir les sections détaillées.'
      },
      winner: {
        kicker: 'Vainqueurs',
        title: 'Les paris Vainqueur en priorité',
        subtitle: 'Focus sur les matchs à résultat simple, avec filet 2-0 Winamax quand il est disponible.'
      },
      goals: {
        kicker: 'Buts',
        title: 'Plus / Moins et les deux marquent',
        subtitle: 'Tous les paris buts sont regroupés ici pour ne pas charger l’accueil principal.'
      },
      night: {
        kicker: 'Nuit',
        title: 'Les paris de nuit',
        subtitle: 'Sports US, Asie et matchs tardifs sur les prochaines 24h.'
      },
      strict: {
        kicker: 'Mode strict',
        title: 'Les paris les plus propres',
        subtitle: 'Seulement les lignes avec contexte correct, badge fiable et mise autorisée.'
      },
      value: {
        kicker: 'Gros gain',
        title: 'Cotes plus hautes, toujours filtrées',
        subtitle: 'Cotes 2+ avec avantage positif ou pari prêt, pour chercher du rendement sans ouvrir les marchés complexes.'
      },
      watch: {
        kicker: 'À surveiller',
        title: 'Signaux utiles, sans mise directe',
        subtitle: 'Ces lignes attendent un re-check, une cote ou un contexte plus propre avant d’être jouées.'
      }
    };
    return metas[category] || {
      kicker: 'Top 3 prochaines 24h',
      title: 'Les 3 paris à regarder en premier',
      subtitle: 'Classés par confiance de réussite, puis par cote Winamax. Le reste est dans le tableau triable.'
    };
  }

  function homeSourceRows(rows) {
    const category = state.activeHomeCategory || null;
    if (category && category !== 'cockpit') return marketCategoryRows(rows, category);
    return rolling24hRows(rows, canDisplayPickCard);
  }

  function homeTopCardHtml(row, index) {
    const rank = index + 1;
    const confidence = Math.round(homeConfidenceValue(row) * 100);
    const kickoff = `${formatDateLabel(row.start)} · ${countdownLabel(row.start)}`;
    const why = simpleWhyText(row);
    const canStake = isReadyToStakeRow(row);
    const stake = canStake ? visibleStakeText(row) : 'À confirmer';
    const marketKey = rowMarketPreferenceKey(row);
    const sportKey = normalizeUiKey(row?.sport || 'sport');
    return `
      <article class="home-top-card rank-${rank} clickable-row" data-match-id="${escapeHtml(row.id)}" data-home-market="${escapeHtml(marketKey)}" data-home-sport="${escapeHtml(sportKey)}" tabindex="0" role="button" aria-label="Ouvrir ${escapeHtml(row.title || 'match')}">
        <div class="home-top-rank">#${rank}</div>
        <div class="home-top-main">
          <div class="home-top-title">
            ${matchVisualHtml(row, 'match-visual compact')}
            <div>
              <span>${escapeHtml(kickoff)}</span>
              <strong>${escapeHtml(row.title || 'Match')}</strong>
              <em>${escapeHtml(`${row.sport || 'Sport'} · ${row.league || 'Winamax'}`)}</em>
            </div>
          </div>
          <div class="home-top-bet">
            <span>PARI</span>
            <strong>${escapeHtml(userBetLabel(row) || simpleMarketLabelForRow(row))}</strong>
          </div>
          <div class="home-top-tags">
            <span>${escapeHtml(simpleMarketLabelForRow(row))}</span>
            ${isWinnerRow(row) ? '<span>Vainqueur prioritaire</span>' : ''}
          </div>
          <p>${escapeHtml(why)}</p>
          <div class="home-top-kpis">
            <span><em>Confiance</em><strong>${escapeHtml(`${confidence}%`)}</strong></span>
            <span><em>Cote</em><strong>${escapeHtml(formatOdd(row.odd))}</strong></span>
            <span><em>Mise</em><strong>${escapeHtml(stake)}</strong></span>
          </div>
          ${row.winamaxTwoGoalRule?.eligible ? `<div class="home-safety-pill">Filet 2-0 Winamax ${Math.round(Number(row.winamaxTwoGoalRule.leadTwoProbability || 0) * 100)}%</div>` : ''}
        </div>
        <div class="home-top-actions">
          ${winamaxOpenButtonHtml(row, 'Ouvrir Winamax')}
          ${canStake ? trackButtonHtml(row, `Je mise ${stake}`) : '<span class="match-sub">À surveiller</span>'}
        </div>
      </article>
    `;
  }

  function homeTableRowHtml(row) {
    const confidence = Math.round(homeConfidenceValue(row) * 100);
    const canStake = isReadyToStakeRow(row);
    const day = formatDayKey(row.start);
    const hour = new Date(row.start || '').toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const validHour = hour && hour !== 'Invalid Date' ? hour : '-';
    const marketKey = rowMarketPreferenceKey(row);
    const sportKey = normalizeUiKey(row?.sport || 'sport');
    return `
      <tr class="clickable-row" data-match-id="${escapeHtml(row.id)}" data-home-market="${escapeHtml(marketKey)}" data-home-sport="${escapeHtml(sportKey)}" tabindex="0" role="button" aria-label="Ouvrir ${escapeHtml(row.title || 'match')}">
        <td data-label="Date">${escapeHtml(day)}</td>
        <td data-label="Heure">${escapeHtml(validHour)}<div class="match-sub">${escapeHtml(countdownLabel(row.start))}</div></td>
        <td data-label="Match">
          <div class="home-table-match">
            ${matchVisualHtml(row, 'match-visual compact')}
            <div>
              <strong>${escapeHtml(row.title || 'Match')}</strong>
              <span>${escapeHtml(`${row.sport || 'Sport'} · ${row.league || 'Winamax'}`)}</span>
            </div>
          </div>
        </td>
        <td data-label="Pari"><strong>${escapeHtml(userBetLabel(row) || simpleMarketLabelForRow(row))}</strong><div class="match-sub">${escapeHtml(simpleMarketLabelForRow(row))}</div></td>
        <td data-label="Confiance"><span class="home-confidence-pill">${escapeHtml(`${confidence}%`)}</span></td>
        <td data-label="Cote"><strong>${escapeHtml(formatOdd(row.odd))}</strong></td>
        <td data-label="Mise">${escapeHtml(visibleStakeText(row))}</td>
        <td data-label="Action"><div class="home-table-action">${winamaxOpenButtonHtml(row, 'Winamax')}${canStake ? trackButtonHtml(row, 'Je mise') : '<span class="match-sub">Surveiller</span>'}</div></td>
      </tr>
    `;
  }

  function renderBettingHome(rows) {
    const topWrap = $('#home-top3-grid');
    const body = $('#home-picks-table-body');
    const caption = $('#home-table-caption');
    const sortMode = homeSortMode();
    if (!topWrap && !body) return;
    const meta = homeCategoryMeta(state.activeHomeCategory);
    const kicker = $('#home-kicker');
    const title = $('#home-title');
    const subtitle = $('#home-subtitle');
    if (kicker) kicker.textContent = meta.kicker;
    if (title) title.textContent = meta.title;
    if (subtitle) subtitle.textContent = meta.subtitle;
    const source = homeSourceRows(rows);
    const topRows = homeTopRows(source, 3);
    const tableRows = sortHomeRows(source, sortMode).slice(0, 12);
    $$('.home-sort-actions [data-home-sort], .home-picks-table [data-home-sort]').forEach((button) => {
      button.classList.toggle('active', button.dataset.homeSort === sortMode);
    });
    if (caption) {
      const labels = { confidence: 'confiance puis cote', kickoff: 'heure de départ', date: 'date', odd: 'cote Winamax' };
      caption.textContent = `${formatCount(tableRows.length)} affichés ici · 12 max · tri ${labels[sortMode] || 'confiance'}`;
    }
    if (topWrap) {
      topWrap.innerHTML = topRows.length
        ? topRows.map(homeTopCardHtml).join('')
        : '<div class="empty compact-empty">Aucun pari exploitable sur les prochaines 24h. Lance un refresh complet ou ouvre Cockpit pour le diagnostic.</div>';
    }
    if (body) {
      body.innerHTML = tableRows.length
        ? tableRows.map(homeTableRowHtml).join('')
        : '<tr><td colspan="8" class="empty">Aucun pari dans le tableau 24h avec les filtres actuels.</td></tr>';
    }
  }

  function openCockpitCategory(category = 'cockpit') {
    const normalized = String(category || 'cockpit').toLowerCase();
    const modeByCategory = {
      ready: 'time',
      winner: 'type',
      goals: 'type',
      scorer: 'type',
      halftime: 'type',
      sport: 'sport',
      night: 'time',
      strict: 'time',
      value: 'time',
      today: 'time',
      tomorrow: 'time',
      live: 'time',
      watch: 'time',
      cockpit: 'time'
    };
    const targetBucket = {
      ready: 'next',
      winner: 'winner',
      goals: 'goals',
      scorer: 'scorer',
      halftime: 'halftime',
      night: 'tonight',
      strict: 'next',
      value: 'next',
      today: 'today',
      tomorrow: 'tomorrow_am',
      live: 'next',
      watch: 'next',
      cockpit: 'next'
    }[normalized] || 'next';
    try {
      localStorage.setItem(PICKS_VIEW_MODE_KEY, modeByCategory[normalized] || 'time');
    } catch {
      // Confort seulement : si le profil refuse localStorage, on ouvre quand même le cockpit.
    }
    const fold = $('#cockpit-detail-section');
    if (fold) fold.open = true;
    renderPicks();
    setTimeout(() => {
      const refreshedFold = $('#cockpit-detail-section');
      if (refreshedFold) refreshedFold.open = true;
      const target = $(`[data-time-bucket="${targetBucket}"]`);
      if (target) {
        target.open = true;
        target.scrollIntoView({ block: 'start', behavior: 'smooth' });
      } else {
        refreshedFold?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }, 40);
    const label = {
      ready: 'Cockpit À miser',
      winner: 'Cockpit Vainqueurs',
      goals: 'Cockpit Buts',
      scorer: 'Cockpit Buteurs',
      halftime: 'Cockpit Mi-temps',
      sport: 'Cockpit par sport',
      night: 'Cockpit nuit',
      strict: 'Cockpit strict',
      value: 'Cockpit gros gain',
      today: 'Cockpit aujourd’hui',
      tomorrow: 'Cockpit demain',
      live: 'Cockpit live',
      watch: 'Cockpit à surveiller',
      cockpit: 'Cockpit complet'
    }[normalized] || 'Cockpit pronostics';
    setSideStatus(label, 'ok');
  }

  // Sprint 72 A3 — Remplir les compteurs des zones temporelles
  function renderTemporalZonesStrip(rows) {
    const arr = Array.isArray(rows) ? rows : [];
    const now = Date.now();
    let n_now = 0, n_today = 0, n_tomorrow = 0;
    for (const r of arr) {
      const ts = Date.parse(r?.start || '');
      if (!Number.isFinite(ts) || ts < now) continue;
      const diffH = (ts - now) / (60 * 60 * 1000);
      if (diffH <= 1) n_now++;
      else if (diffH <= 12) n_today++;
      else if (diffH <= 36) n_tomorrow++;
    }
    const setText = (id, v) => { const el = $(id); if (el) el.textContent = String(v); };
    setText('#zone-count-now', n_now);
    setText('#zone-count-today', n_today);
    setText('#zone-count-tomorrow', n_tomorrow);
  }

  function renderUltimateBet(rows) {
    // Sprint 72 A3 — Update temporal zones strip en meme temps
    try { renderTemporalZonesStrip(rows); } catch { /* noop */ }
    // Sprint 78 F3 — Check custom notif rules
    try { checkCustomNotifs(rows); } catch { /* noop */ }
    const wrap = $('#ultimate-bet-card');
    if (!wrap) return;
    const row = aiSelectedUltimate(rows) || ultimateBetCandidate(rows);
    const aiReason = row && state.aiAssist?.ultimate?.selectedKey === userBetKey(row) ? state.aiAssist?.ultimate?.reason : null;
    if (!row) {
      // Sprint 72 A7 — Empty state enrichi : suggérer J+1 / J+2 si dispo
      const next = ultimateBetCandidate(rows.filter((r) => {
        const ts = Date.parse(r?.start || '');
        return Number.isFinite(ts) && ts > Date.now() + 24 * 60 * 60 * 1000;
      }));
      const refusal = state.aiAssist?.ultimate?.accepted === false ? state.aiAssist.ultimate.reason : ultimateBetReason(null);
      wrap.innerHTML = `
        <div class="ultimate-copy">
          <span class="eyebrow">🎯 Top pick</span>
          <h3>Aucun top pick validé maintenant</h3>
          <p>${escapeHtml(refusal)}</p>
          ${next ? `<p class="next-day-hint">⏭ Demain : <strong>${escapeHtml(next.title)}</strong> · ${escapeHtml(simpleMarketLabelForRow(next))} @${(Number(next.odd)||0).toFixed(2)}</p>` : ''}
        </div>
        <div class="ultimate-side"><strong>Patience</strong><span>Mieux vaut zéro pari qu'un mauvais pari.</span></div>
      `;
      return;
    }
    const signalPreview = buildSignalCards(row.match || {}, row.pred || {}).slice(0, 6);
    const narrativePreview = pickNarrative(row, signalPreview, pickReason(row))
      .split(/(?<=\.)\s+/)
      .slice(0, 2)
      .join(' ');
    // Sprint 72 A4 — Countdown pulse selon proximité
    const ts = Date.parse(row.start || '');
    const minutesUntil = Number.isFinite(ts) ? Math.max(0, Math.round((ts - Date.now()) / 60000)) : null;
    let countdownClass = '';
    if (minutesUntil !== null) {
      if (minutesUntil <= 5) countdownClass = 'countdown-imminent';
      else if (minutesUntil <= 30) countdownClass = 'countdown-soon';
      else if (minutesUntil <= 120) countdownClass = 'countdown-warm';
    }
    wrap.innerHTML = `
      <div class="ultimate-hero-media"><img src="${escapeHtml(visualSvgUrl(row.title, row, { wide: true }))}" alt=""></div>
      <div class="ultimate-copy">
        <span class="eyebrow">🎯 ${escapeHtml(topPickEyebrow(row, rows))}</span>
        <h3>${escapeHtml(row.title)}</h3>
        ${matchVisualHtml(row, 'match-visual hero')}
        ${actionPickHtml(row)}
        <p>${escapeHtml(narrativePreview || aiReason || ultimateBetReason(row))}</p>
        <div class="ultimate-tags">
          ${priorityBadgeHtml(row)}
          <span>${escapeHtml(simpleMarketLabelForRow(row))}</span>
          ${safeBadgeHtml(row)}
          ${specialPatternBadgeHtml(row)}
          ${boostBadgeHtml(row)}
          ${twoGoalSafetyBadgeHtml(row)}
          ${enrichmentBadgeHtml(row)}
        </div>
      </div>
      <div class="ultimate-side">
        <strong class="ultimate-countdown ${countdownClass}">${escapeHtml(countdownLabel(row.start))}</strong>
        <span>${escapeHtml(formatDateLabel(row.start))}</span>
        <button type="button" class="ghost-btn focus-mode-btn" data-focus-pick-key="${escapeHtml(userBetKey(row))}">🎯 Mode focus</button>
        ${winamaxOpenButtonHtml(row, '🚀 Ouvrir Winamax')}
        ${trackButtonHtml(row, `✓ Je mise ${visibleStakeText(row)}`)}
      </div>
    `;
  }

  function temporalBucketForPick(row) {
    const ts = Date.parse(row?.start || '');
    const now = Date.now();
    if (!Number.isFinite(ts)) return 'later';
    const diff = ts - now;
    if (diff < -30 * 60 * 1000) return 'later';
    if (diff < 60 * 60 * 1000) return 'hour';
    if (diff < 3 * 60 * 60 * 1000) return 'three';
    const today = parisDayKey(new Date());
    const tomorrow = parisDayKey(new Date(now + 24 * 60 * 60 * 1000));
    const parts = parisDateParts(ts);
    const day = parts?.day || parisDayKey(new Date(ts));
    const hour = parts?.hour ?? 12;
    if (day === today) return 'today';
  if (diff <= 24 * 60 * 60 * 1000 && hour < 6) return 'tonight';
    if (day === tomorrow && hour < 14) return 'tomorrow_am';
    if (day === tomorrow) return 'tomorrow_pm';
    return 'later';
  }

  function timePickCard(row) {
    return `
      <article class="time-pick-card clickable-row" data-match-id="${escapeHtml(row.id)}" tabindex="0" role="button">
        <div class="time-pick-head">
          ${matchVisualHtml(row)}
          <div>
          <strong>${escapeHtml(row.title)}</strong>
          <span>${escapeHtml(row.league || row.sport || '')} · ${escapeHtml(formatDateLabel(row.start))}</span>
          </div>
        </div>
        <div class="time-pick-meta">
          ${priorityBadgeHtml(row)}
          <span>${escapeHtml(simpleMarketLabelForRow(row))}</span>
          <span title="${escapeHtml(allocationLongText(row))}">${escapeHtml(allocationSummaryText(row))}</span>
          <span>${escapeHtml(countdownLabel(row.start))}</span>
          ${safeBadgeHtml(row)}
          ${specialPatternBadgeHtml(row)}
          ${boostBadgeHtml(row)}
          ${twoGoalSafetyBadgeHtml(row)}
          ${enrichmentBadgeHtml(row)}
        </div>
        ${actionPickHtml(row, { compact: true })}
        <p>${escapeHtml(compactNarrativePreview(row) || simpleWhyText(row))}</p>
        <div class="time-pick-action">
          <button type="button" class="ghost-btn focus-mode-btn" data-focus-pick-key="${escapeHtml(userBetKey(row))}">Mode focus</button>
          ${winamaxOpenButtonHtml(row)}
          ${trackButtonHtml(row, `Je mise ${visibleStakeText(row)}`)}
        </div>
      </article>
    `;
  }

  function picksViewMode() {
    try {
      const mode = localStorage.getItem(PICKS_VIEW_MODE_KEY);
      return ['time', 'type', 'sport'].includes(mode) ? mode : 'time';
    } catch {
      return 'time';
    }
  }

  function updatePicksViewSwitch(mode = picksViewMode()) {
    $$('#picks-view-switch [data-picks-view-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.picksViewMode === mode);
    });
  }

  function groupRowsByDefinition(rows, definitions, fallbackKey = 'other') {
    const grouped = new Map(definitions.map((definition) => [definition.key, []]));
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const key = definitions.find((definition) => definition.match(row))?.key || fallbackKey;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });
    grouped.forEach((bucketRows) => bucketRows.sort((a, b) => Date.parse(a.start || '') - Date.parse(b.start || '') || safeConfidenceValue(b) - safeConfidenceValue(a) || displayEdgeValue(b) - displayEdgeValue(a)));
    return grouped;
  }

  function renderGroupedCockpit(rows, definitions, { emptyText = 'Aucun pari dans cette catégorie.' } = {}) {
    return definitions
      .map((definition) => ({ ...definition, rows: rows.get(definition.key) || [] }))
      .filter((definition) => definition.rows.length || definition.open)
      .map((definition) => {
        const rowsHtml = definition.rows.length
          ? definition.rows.slice(0, definition.limit || 10).map(timePickCard).join('')
          : `<div class="empty compact-empty">${escapeHtml(emptyText)}</div>`;
        return `
          <details class="time-section ${definition.hot && definition.rows.length ? 'hot' : ''}" data-time-bucket="${escapeHtml(definition.key)}"${definition.open ? ' open' : ''}>
            <summary>
              <span>${escapeHtml(definition.title)}</span>
              <strong>${formatCount(definition.rows.length)}</strong>
              <em>${escapeHtml(definition.detail || '')}</em>
            </summary>
            <div class="time-section-grid">${rowsHtml}</div>
          </details>
        `;
      }).join('');
  }

  function renderTypeCockpit(baseRows) {
    const definitions = [
      { key: 'winner', title: 'Vainqueurs du jour', detail: 'priorité diversité', open: true, limit: 12, match: (row) => rowMarketPreferenceKey(row) === 'winner' },
      { key: 'goals', title: 'Buts', detail: 'Plus/Moins + les deux marquent', open: false, limit: 12, match: (row) => ['goals', 'btts'].includes(rowMarketPreferenceKey(row)) },
      { key: 'scorer', title: 'Buteurs', detail: 'joueurs décisifs', open: false, limit: 10, match: (row) => rowMarketPreferenceKey(row) === 'scorer' },
      { key: 'halftime', title: 'Mi-temps', detail: 'lecture simple', open: false, limit: 8, match: (row) => rowMarketPreferenceKey(row) === 'halftime' },
      { key: 'other', title: 'Autres paris simples', detail: 'à vérifier', open: false, limit: 8, match: () => true }
    ];
    return renderGroupedCockpit(groupRowsByDefinition(baseRows, definitions), definitions);
  }

  function renderSportCockpit(baseRows) {
    const sportDefs = [
      ['football', 'Football', 'foot + buteurs', /football|soccer|foot/i],
      ['tennis', 'Tennis', 'ATP / WTA', /tennis/i],
      ['basket', 'Basket', 'NBA + Europe', /basket/i],
      ['hockey', 'Hockey', 'NHL + Europe', /hockey/i],
      ['baseball', 'Baseball', 'MLB', /baseball|mlb/i],
      ['nfl', 'NFL', 'football américain', /nfl|football américain|american football/i],
      ['other', 'Autres sports', 'rugby, MMA, boxe', /.*/i]
    ].map(([key, title, detail, pattern], index, arr) => ({
      key,
      title,
      detail,
      open: index === 0,
      limit: 10,
      match: (row) => {
        const sport = `${row?.sport || ''} ${row?.league || ''}`;
        if (key === 'other') return !arr.slice(0, -1).some((item) => item[3].test(sport));
        return pattern.test(sport);
      }
    }));
    return renderGroupedCockpit(groupRowsByDefinition(baseRows, sportDefs), sportDefs);
  }

  function renderTemporalCockpit(rows) {
    const wrap = $('#time-cockpit');
    if (!wrap) return;
    const mode = picksViewMode();
    updatePicksViewSwitch(mode);
    const buckets = [
      { key: 'next', title: 'À jouer prochainement', detail: '5 à 10 prochains départs', open: true },
      { key: 'hour', title: 'Dans l’heure', detail: '< 60 min', open: false },
      { key: 'three', title: 'Dans les 3 heures', detail: '1h - 3h', open: false },
      { key: 'today', title: 'Aujourd’hui', detail: 'après 3h', open: false },
      { key: 'tonight', title: 'Cette nuit', detail: '00h - 06h Paris', open: false },
      { key: 'tomorrow_am', title: 'Demain matin-midi', detail: '06h - 14h', open: false },
      { key: 'tomorrow_pm', title: 'Demain après-midi/soir', detail: '14h - 00h', open: false },
      { key: 'later', title: 'Prochains jours', detail: 'J+2 à J+7', open: false }
    ];
    const baseRows = (Array.isArray(rows) ? rows : [])
      .filter(canDisplayPickCard)
      .slice()
      .sort((a, b) => Date.parse(a.start || '') - Date.parse(b.start || '') || safeConfidenceValue(b) - safeConfidenceValue(a) || displayEdgeValue(b) - displayEdgeValue(a));
    if (mode === 'type') {
      wrap.innerHTML = renderTypeCockpit(baseRows);
      return;
    }
    if (mode === 'sport') {
      wrap.innerHTML = renderSportCockpit(baseRows);
      return;
    }
    const grouped = new Map(buckets.map((bucket) => [bucket.key, []]));
    grouped.set('next', baseRows.slice(0, 10));
    baseRows.forEach((row) => grouped.get(temporalBucketForPick(row))?.push(row));
    grouped.forEach((bucketRows) => bucketRows.sort((a, b) => Date.parse(a.start || '') - Date.parse(b.start || '') || safeConfidenceValue(b) - safeConfidenceValue(a) || displayEdgeValue(b) - displayEdgeValue(a)));
    wrap.innerHTML = buckets
      .filter((bucket) => bucket.key === 'next' || (grouped.get(bucket.key) || []).length)
      .map((bucket) => {
      const bucketRows = grouped.get(bucket.key) || [];
      const rowsHtml = bucketRows.length
        ? bucketRows.slice(0, bucket.key === 'later' ? 12 : 8).map(timePickCard).join('')
        : '<div class="empty compact-empty">Les prochains paris apparaîtront ici dès que la pipeline trouve une ligne fiable.</div>';
      return `
        <details class="time-section ${bucket.key === 'hour' && bucketRows.length ? 'hot' : ''}" data-time-bucket="${escapeHtml(bucket.key)}"${bucket.open ? ' open' : ''}>
          <summary>
            <span>${escapeHtml(bucket.title)}</span>
            <strong>${formatCount(bucketRows.length)}</strong>
            <em>${escapeHtml(bucket.detail)}</em>
          </summary>
          <div class="time-section-grid">${rowsHtml}</div>
        </details>
      `;
    }).join('');
    const nextSection = wrap.querySelector('[data-time-bucket="next"]');
    if (nextSection && !state.didScrollToNow) {
      state.didScrollToNow = true;
      setTimeout(() => nextSection.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 200);
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
      maxSources: 5
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

  function enrichmentIsCurrent(row) {
    const item = enrichmentForRow(row);
    if (!item || item.status !== 'enriched') return false;
    if (Number(item.planVersion || 0) < 2) return false;
    return Number(item.successfulSources || 0) >= 3;
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
    const news = state.newsWatcher || readStorageJson(NEWS_WATCHER_KEY, null);
    const summary = store?.summary || {};
    const newsSummary = news?.summary || {};
    node.innerHTML = `
      <article class="refresh-card refresh-${Number(summary.failed || 0) ? 'warn' : 'ok'}">
        <span>Enrichissement web</span>
        <strong>${formatCount(summary.success || 0)} réussis / ${formatCount(summary.failed || 0)} échoués</strong>
        <p>Aujourd'hui · cache local ${formatCount(webEnrichmentConfig().cacheMinutes)} min · sources consultées par le moteur.</p>
        <small>${escapeHtml(store?.updatedAt ? formatDateTime(store.updatedAt) : 'Aucun enrichissement lancé')}</small>
      </article>
      <article class="refresh-card refresh-${Number(newsSummary.impact || 0) ? 'warn' : 'ok'}">
        <span>News watcher</span>
        <strong>${formatCount(newsSummary.checked || 0)} checks · ${formatCount(newsSummary.impact || 0)} impactant(s)</strong>
        <p>Kickoff &lt; 6h · compos, blessures, météo, suspensions.</p>
        <small>${escapeHtml(news?.updatedAt ? formatDateTime(news.updatedAt) : 'Aucun re-check news')}</small>
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

  function newsForRow(row) {
    const store = state.newsWatcher || readStorageJson(NEWS_WATCHER_KEY, null);
    const key = rowEnrichmentKey(row);
    return store?.byKey?.[key] || store?.byKey?.[userBetKey(row)] || null;
  }

  // Sprint 64 — badge "news fraîche" pour la hero modal (impact / watch only).
  function freshNewsBadgeHtml(row) {
    const item = newsForRow(row);
    if (!item) return '';
    const tone = item.tone;
    if (tone !== 'watch' && tone !== 'impact' && tone !== 'critical') return '';
    const ts = Date.parse(item.checkedAt || item.updatedAt || '');
    if (!Number.isFinite(ts)) return '';
    const ageMin = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (ageMin > 360) return ''; // > 6h ignored
    const ageLabel = ageMin < 60 ? `il y a ${ageMin} min` : `il y a ${Math.floor(ageMin / 60)}h`;
    const icon = tone === 'critical' ? '🚨' : tone === 'impact' ? '⚠️' : '📰';
    const headline = String(item.headline || 'News pré-match').slice(0, 60);
    return `<span class="news-fresh-badge news-fresh-${escapeHtml(tone)}" title="${escapeHtml(headline)} (${ageLabel})">${escapeHtml(icon)} ${escapeHtml(headline)}</span>`;
  }

  async function loadNewsWatcherState() {
    try {
      const store = await fetchJson('/api/news-watch/state');
      if (store && typeof store === 'object') {
        state.newsWatcher = store;
        writeStorageJson(NEWS_WATCHER_KEY, store);
        updateWebEnrichmentSummary();
      }
    } catch (error) {
      pushLog('warn', `News watcher indisponible: ${error.message}`);
    }
  }

  async function runNewsWatcher(rows, { force = false, dryRun = false } = {}) {
    const prefs = loadPreferences();
    const candidates = (Array.isArray(rows) ? rows : [])
      .filter((row) => pickHasCoreData(row))
      .filter((row) => {
        const minutes = minutesToKickoffValue(row.start);
        return minutes >= 0 && minutes <= 6 * 60;
      })
      .slice(0, 4);
    if (!candidates.length) return null;
    const response = await fetchJson('/api/news-watch/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          cacheMinutes: 30,
          maxPicks: 4,
          maxSources: 5,
          rateLimitPerMinute: prefs.webEnrichmentRateLimit || 5
        },
        picks: candidates.map((row) => ({ ...aiPickPayload(row), winamaxUrl: row.winamaxUrl || row.match?.winamax?.url || '' })),
        force,
        dryRun
      })
    });
    const store = response?.store || (response?.summary ? { summary: response.summary, byKey: Object.fromEntries((response.records || []).map((record) => [record.key, record])) } : null);
    if (store) {
      state.newsWatcher = {
        ...(state.newsWatcher || {}),
        ...store,
        byKey: {
          ...((state.newsWatcher || {}).byKey || {}),
          ...(store.byKey || {})
        }
      };
      writeStorageJson(NEWS_WATCHER_KEY, state.newsWatcher);
      updateWebEnrichmentSummary();
    }
    (response?.records || []).filter((record) => record.status === 'impact').forEach((record) => {
      const row = candidates.find((candidate) => rowEnrichmentKey(candidate) === record.key);
      if (row) alertOnce(`news-impact:${record.key}:${record.headline}`, 'Re-check news', `${row.title} · ${record.headline}.`, row);
    });
    return response;
  }

  function buildNewsWatcherHtml(row) {
    const item = newsForRow(row);
    const tone = item?.tone || 'watch';
    const sources = Array.isArray(item?.sources) ? item.sources : [];
    return `
      <article class="detail-card wide news-watcher-card news-${escapeHtml(tone)}">
        <h4>${escapeHtml(t('newsWatcher'))}</h4>
        <div class="match-context-band">
          <span>${escapeHtml(item?.checkedAt ? `Re-check ${formatDateTime(item.checkedAt)}` : 'Re-check non lancé')}</span>
          <strong>${escapeHtml(item?.headline || 'Surveillance prête')}</strong>
          <em>${escapeHtml(item?.detail || 'Les news publiques sont vérifiées automatiquement pour les picks proches du coup d’envoi.')}</em>
        </div>
        <div class="source-mini-grid">
          ${sources.length ? sources.slice(0, 5).map((source) => `
            <div class="${source.status === 'ok' ? 'ok' : source.status === 'deferred' ? 'watch' : 'missing'}">
              <span>${escapeHtml(source.label || source.key || 'Source')}</span>
              <strong>${escapeHtml(source.status === 'ok' ? 'OK' : source.status === 'deferred' ? 'Planifiée' : 'À relancer')}</strong>
              <em>${escapeHtml(source.summary || source.error || '-')}</em>
            </div>
          `).join('') : '<div class="empty compact-empty">Aucune source news en cache pour ce match. Le prochain refresh pré-match déclenchera le watcher.</div>'}
        </div>
      </article>
    `;
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
    const now = Date.now();
    const topWindow = (Array.isArray(rows) ? rows : [])
      .filter((row) => canDisplayPickCard(row))
      .filter((row) => {
        const ts = Date.parse(row.start || '');
        return Number.isFinite(ts) && ts > now && ts - now <= 48 * 60 * 60 * 1000;
      })
      .sort((a, b) => Number(Boolean(canDisplayStake(b))) - Number(Boolean(canDisplayStake(a))) || priorityValue(b) - priorityValue(a))
      .slice(0, 5);
    const top = [
      aiSelectedUltimate(rows) || ultimateBetCandidate(rows),
      ...topWindow
    ].filter(Boolean);
    const unique = Array.from(new Map(top.map((row) => [userBetKey(row), row])).values()).slice(0, 5);
    unique.forEach((row, index) => {
      if (enrichmentIsCurrent(row)) return;
      const key = rowEnrichmentKey(row);
      if (state.webEnrichmentPending.has(key)) return;
      state.webEnrichmentPending.add(key);
      setTimeout(() => {
        enrichPick(row)
          .catch((error) => pushLog('warn', `Enrichissement web indisponible: ${error.message}`))
          .finally(() => state.webEnrichmentPending.delete(key));
      }, 900 + index * 700);
    });
    if (prefs.webEnrichmentEnabled !== false) {
      const imminent = (Array.isArray(rows) ? rows : [])
        .filter((row) => minutesToKickoffValue(row.start) <= 6 * 60)
        .slice(0, 4);
      imminent.forEach((row) => {
        const newsKey = `news:${rowEnrichmentKey(row)}:${parisDayKey()}`;
        const store = readStorageJson(LIVE_NEWS_KEY, {});
        if (store[newsKey] && Date.now() - Date.parse(store[newsKey]) < 60 * 60 * 1000) return;
        store[newsKey] = new Date().toISOString();
        writeStorageJson(LIVE_NEWS_KEY, store);
      });
      if (imminent.length) {
        setTimeout(() => {
          runNewsWatcher(imminent)
            .catch((error) => pushLog('warn', `Live news watcher indisponible: ${error.message}`));
        }, 2_000);
      }
    }
  }

  function isLiveStatus(value) {
    const text = String(value || '').toLowerCase();
    return ['live', 'inprogress', 'in_progress', 'halftime', 'period', 'q1', 'q2', 'q3', 'q4', 'ot'].some((token) => text.includes(token));
  }

  function rowLiveInfo(row) {
    const match = row?.match || {};
    const apiLive = liveApiInfoForRow(row);
    if (apiLive) return apiLive;
    const status = match.status || match.status_type || match.state || match.phase || '';
    if (!isLiveStatus(status)) return null;
    const homeScore = match.home_score ?? match.score_home ?? match.score?.home ?? null;
    const awayScore = match.away_score ?? match.score_away ?? match.score?.away ?? null;
    const minute = match.minute || match.clock || match.status_detail || '';
    return {
      status: status || 'LIVE',
      minute,
      score: homeScore != null && awayScore != null ? `${homeScore}-${awayScore}` : 'score indisponible'
    };
  }

  function liveApiInfoForRow(row) {
    const rows = Array.isArray(state.liveScoreState?.rows) ? state.liveScoreState.rows : [];
    const keys = new Set([row?.id, row?.match?.id, userBetKey(row)].map((value) => String(value || '')).filter(Boolean));
    const found = rows.find((item) => keys.has(String(item.id || '')) || keys.has(String(item.matchId || '')) || keys.has(String(item.key || '')));
    if (!found) return null;
    return {
      status: found.status || 'LIVE',
      minute: found.minute || found.clock || '-',
      score: found.score || 'score indisponible',
      fetchedAt: found.fetchedAt || state.liveScoreState?.fetchedAt || null
    };
  }

  function liveVerdict(row, live) {
    const text = `${row?.market || ''} ${row?.label || ''}`.toLowerCase();
    const score = String(live?.score || '');
    const nums = score.match(/(\d+)\D+(\d+)/);
    if (!nums) return 'Verdict provisoire : score non disponible';
    const total = Number(nums[1]) + Number(nums[2]);
    const minute = Number(String(live?.minute || '').match(/\d+/)?.[0] || 0);
    const line = Number(String(row?.label || row?.market || '').replace(',', '.').match(/(\d+(?:\.\d+)?)/)?.[1] || 2.5);
    const targetGoals = Number.isFinite(line) ? Math.floor(line) + 1 : 3;
    if (text.includes('over') || text.includes('plus') || text.includes('ou')) {
      const needed = Math.max(0, targetGoals - total);
      return needed <= 0
        ? `Pari provisoirement gagnant : ${total} but(s)/point(s) au score`
        : `Encore ${needed} but(s)/point(s) à trouver${minute ? ` en ${Math.max(0, 95 - minute)} min environ` : ''}`;
    }
    if (text.includes('under') || text.includes('moins')) return total < targetGoals ? `Pari provisoirement gagnant : marge ${targetGoals - total}` : 'Pari sous pression';
    return 'Suivi live actif';
  }

  function liveRows() {
    const map = new Map();
    [...(state.picks || []), ...(state.allPicks || [])]
      .filter((row) => pickHasCoreData(row))
      .forEach((row) => {
        const live = rowLiveInfo(row);
        if (live) map.set(userBetKey(row), { row, live });
      });
    loadUserBets().filter((bet) => bet.status === 'pending').forEach((bet) => {
      const row = findPickByTrackKey(bet.key) || null;
      const live = row ? rowLiveInfo(row) : null;
      if (row && live) map.set(userBetKey(row), { row, live, tracked: true });
    });
    return Array.from(map.values()).sort((a, b) => Date.parse(a.row.start || '') - Date.parse(b.row.start || ''));
  }

  function renderLiveCockpit() {
    const wrap = $('#live-cockpit');
    if (!wrap) return;
    const rows = liveRows();
    if (!rows.length) {
      // Sprint 80 A4 — auto-hide quand vide (au lieu d'empty state visible permanent)
      wrap.innerHTML = '<div class="empty compact-empty">Aucun match live suivi pour le moment.</div>';
      wrap.classList.add('live-empty');
      return;
    }
    wrap.classList.remove('live-empty');
    wrap.innerHTML = `
      <div class="section-head compact">
        <div>
          <h3>EN DIRECT</h3>
          <p>${formatCount(rows.length)} match(s) suivis, refresh accéléré toutes les 2 minutes.</p>
        </div>
      </div>
      <div class="live-card-grid">
        ${rows.slice(0, 8).map(({ row, live, tracked }) => {
          const cashUrl = safeExternalUrl(row.winamaxUrl, 'www.winamax.fr');
          const insight = liveInsight(row, live);
          const cash = insight.cash || cashOutEstimate(row, live, insight.probability);
          return `
            <article class="live-card live-${escapeHtml(insight.tone)} clickable-row" data-match-id="${escapeHtml(row.id)}" tabindex="0" role="button">
              <span>${escapeHtml(live.status)} · ${escapeHtml(String(live.minute || '-'))} · <em class="live-insight-badge ${escapeHtml(insight.tone)}">${escapeHtml(insight.label)}</em></span>
              <div class="live-card-teams">${matchVisualHtml(row, 'match-visual compact')}<strong>${escapeHtml(row.title)} <em>${escapeHtml(live.score)}</em></strong></div>
              <p>${escapeHtml(userBetLabel(row))} · ${escapeHtml(insight.detail)}</p>
              <div class="live-metric-grid">
                <article><span>Proba live</span><strong>${escapeHtml(formatPct(insight.probability || 0, 0))}</strong><p>Score + temps restant</p></article>
                <article><span>Cash-out estimé</span><strong>${escapeHtml(cash.value ? formatMoney(cash.value) : '-')}</strong><p>${escapeHtml(cash.advice || 'À surveiller')}</p></article>
              </div>
              <div class="time-pick-action">
                <span class="pill">${tracked ? 'pari suivi' : 'pari modèle'}</span>
                ${cash.advice ? `<span class="cashout-chip ${escapeHtml(cash.tone)}">${escapeHtml(cash.advice)}</span>` : ''}
                <button class="ghost-btn" type="button" data-live-note-key="${escapeHtml(userBetKey(row))}" data-live-note="${escapeHtml(insight.detail)}">Note rapide</button>
                ${cashUrl ? `<a class="ghost-btn" href="${escapeHtml(cashUrl)}" target="_blank" rel="noreferrer">Cash-out / Winamax</a>` : ''}
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
    maybeNotifyLiveRows(rows);
  }

  function tradingRows() {
    return sortedPriorityRows().filter((row) => pickHasCoreData(row)).slice(0, 12);
  }

  function currentTradingRow() {
    const rows = tradingRows();
    if (!rows.length) return null;
    state.tradingIndex = Math.max(0, Math.min(rows.length - 1, Number(state.tradingIndex || 0)));
    return rows[state.tradingIndex] || rows[0];
  }

  function renderTradingDesk() {
    const desk = $('#trading-desk');
    if (!desk) return;
    const prefs = loadPreferences();
    const active = Boolean(prefs.expertMode && prefs.tradingDesk);
    desk.classList.toggle('active', active);
    desk.classList.toggle('hidden', !active);
    if (!active) return;
    const rows = tradingRows();
    const current = currentTradingRow();
    const live = liveRows();
    const bankroll = userBetStats();
    const alerts = [
      ...(rows.slice(0, 3).map((row, index) => `#${index + 1} ${userBetLabel(row)} · ${row.title}`)),
      ...(live.slice(0, 2).map(({ row, live: info }) => `Live ${row.title} · ${info.score}`))
    ].slice(0, 5);
    const topPanel = $('#trading-top-panel');
    if (topPanel) {
      topPanel.innerHTML = `
        <h4>Top picks</h4>
        <div class="trading-pick-list">
          ${rows.slice(0, 5).map((row, index) => `
            <button class="trading-pick-row${current && userBetKey(row) === userBetKey(current) ? ' active' : ''}" type="button" data-trading-index="${index}">
              <strong>#${index + 1}</strong>
              <span>${escapeHtml(row.title)}<br><em>${escapeHtml(userBetLabel(row))} · ${escapeHtml(formatOdd(row.odd))}</em></span>
              <b>${escapeHtml(visibleStakeText(row))}</b>
            </button>
          `).join('')}
        </div>
      `;
    }
    const livePanel = $('#trading-live-panel');
    if (livePanel) {
      livePanel.innerHTML = `
        <h4>En direct</h4>
        ${live.length ? live.slice(0, 4).map(({ row, live: info }) => {
          const insight = liveInsight(row, info);
          return `<p><strong>${escapeHtml(info.score)}</strong> · ${escapeHtml(row.title)}<br><span class="cashout-chip ${escapeHtml(insight.cash?.tone || 'ok')}">${escapeHtml(insight.detail)}</span></p>`;
        }).join('') : '<div class="empty compact-empty">Aucun live suivi.</div>'}
      `;
    }
    const bankrollPanel = $('#trading-bankroll-panel');
    if (bankrollPanel) {
      bankrollPanel.innerHTML = `
        <h4>Bankroll</h4>
        <div class="search-stat-grid">
          <article><span>Bankroll</span><strong>${escapeHtml(formatMoney(getBankroll()))}</strong><p>Profil local</p></article>
          <article><span>P&L total</span><strong>${escapeHtml(formatMoney(bankroll.pnlTotal))}</strong><p>ROI ${escapeHtml(formatPct(bankroll.roi, 1))}</p></article>
          <article><span>Jour</span><strong>${escapeHtml(formatMoney(bankroll.pnlToday))}</strong><p>${formatCount(bankroll.pending)} en cours</p></article>
        </div>
      `;
    }
    const alertPanel = $('#trading-alert-panel');
    if (alertPanel) {
      alertPanel.innerHTML = `
        <h4>Watchlist & alertes</h4>
        ${alerts.length ? alerts.map((text) => `<p class="match-sub">${escapeHtml(text)}</p>`).join('') : '<div class="empty compact-empty">Aucune alerte forte.</div>'}
        <p class="match-sub">Hotkeys : J mise top pick · N/P naviguent · F favori · C cash-out courant · Espace refresh.</p>
      `;
    }
  }

  function moveTradingSelection(delta) {
    const rows = tradingRows();
    if (!rows.length) return false;
    state.tradingIndex = (Number(state.tradingIndex || 0) + delta + rows.length) % rows.length;
    renderTradingDesk();
    setSideStatus(`Trading Desk : #${state.tradingIndex + 1}`, 'ok');
    return true;
  }

  function toggleFavoriteCurrentPick() {
    const row = currentTradingRow() || sortedPriorityRows()[0];
    const team = rowTeamNames(row)[0];
    if (!team) return false;
    addFavorite('teams', team);
    return true;
  }

  function openCashoutCurrent() {
    const live = liveRows()[0];
    const row = live?.row || currentTradingRow();
    const url = safeExternalUrl(row?.winamaxUrl, 'www.winamax.fr');
    if (!url) {
      setSideStatus('Lien Winamax indisponible pour ce pick', 'warn');
      return false;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }

  function liveInsight(row, live) {
    const detail = liveVerdict(row, live);
    const probability = liveWinProbability(row, live);
    const cash = cashOutEstimate(row, live, probability);
    const suffix = `${detail} · proba live ${formatPct(probability, 0)}${cash.advice ? ` · ${cash.advice}` : ''}`;
    if (/gagnant|en route|conforme|va gagner/i.test(detail)) {
      return { tone: 'ok', label: 'En route', detail: suffix, probability, cash };
    }
    if (/pression|risque|perdre|besoin|contre/i.test(detail)) {
      return { tone: 'danger', label: 'À risque', detail: suffix, probability, cash };
    }
    return { tone: 'watch', label: 'Incertain', detail: suffix, probability, cash };
  }

  function liveWinProbability(row, live) {
    const base = Math.max(0.05, Math.min(0.95, Number(row?.probability || row?.confidence || 0.5) || 0.5));
    const score = String(live?.score || '');
    const nums = score.match(/(\d+)\D+(\d+)/);
    const minute = Math.min(100, Number(String(live?.minute || '').match(/\d+/)?.[0] || 35));
    if (!nums) return base;
    const home = Number(nums[1]);
    const away = Number(nums[2]);
    const text = `${row?.market || ''} ${row?.label || ''}`.toLowerCase();
    const progress = Math.max(0, Math.min(1, minute / 95));
    let delta = 0;
    if (text.includes('over') || text.includes('plus') || text.includes('ou')) {
      delta = ((home + away) >= 3 ? 0.28 : -0.10) * progress;
    } else if (text.includes('under') || text.includes('moins')) {
      delta = ((home + away) < 3 ? 0.18 : -0.30) * progress;
    } else if (text.includes('home') || text.includes(row?.match?.home?.toLowerCase?.() || '___')) {
      delta = Math.sign(home - away) * 0.22 * progress;
    } else if (text.includes('away') || text.includes(row?.match?.away?.toLowerCase?.() || '___')) {
      delta = Math.sign(away - home) * 0.22 * progress;
    }
    return Math.max(0.03, Math.min(0.97, base + delta));
  }

  function cashOutEstimate(row, live, probability = liveWinProbability(row, live)) {
    const tracked = loadUserBets().find((bet) => bet.status === 'pending' && bet.key === userBetKey(row));
    const stake = Math.max(0, Number(tracked?.stake || displayStakeAmount(row) || 0));
    const odd = Math.max(1, Number(tracked?.odd || row?.odd || 1));
    const value = stake ? stake * (0.12 + probability * odd * 0.86) : 0;
    const ratio = stake ? value / stake : 0;
    const uncertain = probability > 0.42 && probability < 0.72;
    let advice = '';
    let tone = 'ok';
    if (stake && ratio >= 1.2) {
      advice = 'Sécuriser le gain ?';
      tone = 'warn';
    } else if (stake && ratio >= 0.8 && uncertain) {
      advice = 'Cash-out recommandé';
      tone = 'warn';
    } else if (stake && probability < 0.25) {
      advice = 'Pari compromis';
      tone = 'danger';
    }
    return { stake, value, ratio, advice, tone };
  }

  function saveLiveQuickNote(trackKey, note) {
    if (!trackKey) return;
    const bets = loadUserBets();
    const index = bets.findIndex((bet) => bet.status === 'pending' && bet.key === trackKey);
    if (index === -1) {
      setSideStatus('Note live réservée aux paris suivis', 'warn');
      return;
    }
    const stamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const current = String(bets[index].note || '').trim();
    bets[index] = {
      ...bets[index],
      note: `${current ? `${current}\n` : ''}${stamp} live · ${String(note || '').slice(0, 140)}`
    };
    saveUserBets(bets);
    renderHistory();
    setSideStatus('Note live ajoutée', 'ok');
  }

  function readLiveNotificationKeys() {
    try {
      const rows = JSON.parse(localStorage.getItem(LIVE_NOTIFICATION_KEY) || '[]');
      return new Set(Array.isArray(rows) ? rows.slice(-100) : []);
    } catch {
      return new Set();
    }
  }

  function writeLiveNotificationKeys(keys) {
    try {
      localStorage.setItem(LIVE_NOTIFICATION_KEY, JSON.stringify(Array.from(keys).slice(-100)));
    } catch {
      // Notification live facultative.
    }
  }

  function maybeNotifyLiveRows(rows) {
    const keys = readLiveNotificationKeys();
    let changed = false;
    rows.forEach(({ row, live }) => {
      const key = `${userBetKey(row)}:${live.score}:${live.minute}`;
      const minute = Number(String(live.minute || '').match(/\d+/)?.[0] || 0);
      const insight = liveInsight(row, live);
      const important = minute >= 85 || /gagnant|pression|suivi live|cash-out|compromis/i.test(insight.detail);
      if (!important || keys.has(key)) return;
      keys.add(key);
      changed = true;
      notifyUser(`Live ${row.title}`, `${live.score} · ${insight.detail}`, row);
    });
    if (changed) writeLiveNotificationKeys(keys);
  }

  async function refreshLiveScores() {
    try {
      const live = await fetchJson('/api/live-scores');
      state.liveScoreState = live;
      renderLiveCockpit();
      renderTradingDesk();
      return live;
    } catch (error) {
      pushLog('warn', `Scores live indisponibles: ${error.message}`);
      return null;
    }
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
    const selected = (Array.isArray(rows) ? rows : []).find((row) => userBetKey(row) === selectedKey) || null;
    return selected && canDisplayStake(selected) ? selected : null;
  }

  async function runBackgroundAi(rows) {
    if (navigator.webdriver) return;
    const topRows = (Array.isArray(rows) ? rows : [])
      .filter((row) => pickHasCoreData(row) && canDisplayStake(row))
      .slice()
      .sort((a, b) => priorityValue(b) - priorityValue(a) || displayEdgeValue(b) - displayEdgeValue(a))
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

  function renderSimpleTopStrip() {
    const strip = $('#simple-top-strip');
    if (!strip) return;
    const stats = userBetStats();
    const freshness = state.status?.data?.ageMinutes != null
      ? Number(state.status.data.ageMinutes) <= 15
        ? 'Données fraîches'
        : `Données ${formatAge(state.status.data.ageMinutes)}`
      : state.status?.generatedAt
        ? `Données ${formatDateTime(state.status.generatedAt)}`
        : 'Données locales';
    const pnlTone = stats.pnlToday >= 0 ? 'ok' : 'danger';
    $('#simple-now').textContent = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    $('#simple-bankroll').textContent = `Bankroll ${formatMoney(getBankroll())}`;
    $('#simple-pnl').textContent = `Jour ${formatMoney(stats.pnlToday)}`;
    $('#simple-pnl').className = `simple-pnl-${pnlTone}`;
    $('#simple-freshness').textContent = freshness;
  }

  function renderTodayFunnelAlert() {
    const node = $('#today-funnel-alert');
    if (!node) return;
    const funnel = state.status?.analysis?.todayFunnel || state.todayFunnel || null;
    const coverage = state.coverage24h?.summary || state.status?.analysis?.coverage24h?.summary || null;
    const readyRows24h = rollingReadyRows(state.currentDashboardRows?.length ? state.currentDashboardRows : state.picks);
    const ready24hActual = readyRows24h.length;
    if (coverage && ready24hActual > 0) {
      const displayed24h = Number(state.dashboardMeta?.rolling24Displayed || coverage.displayed || 0);
      const nightActual = nightPickRows(state.currentDashboardRows?.length ? state.currentDashboardRows : state.picks, isReadyToStakeRow).length;
      const watch24h = Math.max(0, displayed24h - ready24hActual);
      const status = ready24hActual >= 10 && nightActual >= 3 ? 'ok' : 'warn';
      node.className = `today-funnel-alert ${status === 'ok' ? 'hidden' : 'warn'}`;
      if (status === 'ok') return;
      node.innerHTML = `
        <strong>${formatCount(ready24hActual)} pari(s) prêt(s) sur les prochaines 24h</strong>
        <span>Lecture utile : ${formatCount(coverage.events || 0)} matchs → ${formatCount(coverage.bookable || 0)} Winamax → ${formatCount(coverage.positive || 0)} signaux → ${formatCount(ready24hActual)} prêts${watch24h ? ` · ${formatCount(watch24h)} à surveiller` : ''} · ${formatCount(nightActual)} prêt(s) cette nuit.</span>
        <button class="ghost-btn" type="button" data-tab-target="data">Diagnostic auto</button>
      `;
      return;
    }
    if (funnel) {
      const today = funnel.today || {};
      const displayed = Number(today.displayed || 0);
      const ready = Number(today.ready || 0);
      const bookable = Number(today.bookableEvents || today.bookable || 0);
      const tooStrictForDailyTarget = bookable >= 30 && displayed < 10;
      const noReadyToday = bookable >= 10 && ready < 1;
      const lowReadyToday = bookable >= 10 && ready > 0 && ready < 8;
      if ((bookable > 0 && displayed < 5) || tooStrictForDailyTarget || noReadyToday || lowReadyToday) {
        const simpleReady = Number(today.simpleReady || 0);
        const advancedReady = Number(today.advancedReady || 0);
        node.className = 'today-funnel-alert danger';
        node.innerHTML = `
          <strong>${noReadyToday ? 'Aucun pari prêt aujourd’hui' : lowReadyToday ? 'Volume prêt limité aujourd’hui' : tooStrictForDailyTarget ? 'Modèle trop strict aujourd’hui' : displayed ? `${formatCount(displayed)} pari(s) aujourd'hui seulement` : 'Aucun pari simple aujourd’hui visible'}</strong>
          <span>Aujourd’hui : ${formatCount(today.totalEvents || today.events || 0)} matchs → ${formatCount(bookable)} Winamax → ${formatCount(today.predictableMatches || today.predictable || 0)} analysables → ${formatCount(today.positiveSimplePassingFilters ?? today.simplePassingFilters ?? 0)} simples à edge positif → ${formatCount(simpleReady)} simples prêts. ${advancedReady ? `${formatCount(advancedReady)} prêts avancés restent cachés en mode standard.` : ''}</span>
          <button class="ghost-btn" type="button" data-tab-target="data">Diagnostic auto</button>
        `;
        return;
      }
    }
    if (coverage) {
      const displayed24h = Number(state.dashboardMeta?.rolling24Displayed || coverage.displayed || 0);
      const ready24h = Number(coverage.ready || 0);
      const nightDisplayed = Number(coverage.nightDisplayed || 0);
      const healthy24h = displayed24h >= 15 && ready24h >= 10 && nightDisplayed >= 3;
      if (healthy24h) {
        node.classList.add('hidden');
        return;
      }
      const status = displayed24h >= 8 ? 'warn' : 'danger';
      node.className = `today-funnel-alert ${status}`;
      const watch24h = Math.max(0, displayed24h - ready24h);
      node.innerHTML = `
        <strong>${displayed24h ? `${formatCount(displayed24h)} opportunité(s) simples sur 24h glissantes` : 'Aucune opportunité simple sur 24h glissantes'}</strong>
        <span>Funnel 24h : ${formatCount(coverage.events || 0)} matchs → ${formatCount(coverage.bookable || 0)} Winamax → ${formatCount(coverage.positive || 0)} positifs → ${formatCount(ready24h)} prêts${watch24h ? ` · ${formatCount(watch24h)} à surveiller` : ''} · ${formatCount(nightDisplayed)} cette nuit.</span>
        <button class="ghost-btn" type="button" data-tab-target="data">Diagnostic auto</button>
      `;
      return;
    }
    if (!funnel) {
      node.classList.add('hidden');
      return;
    }
    const today = funnel.today || {};
    const displayed = Number(today.displayed || 0);
    const ready = Number(today.ready || 0);
    const status = funnel.status || (displayed ? 'ok' : 'danger');
    node.classList.toggle('hidden', status === 'ok' && displayed >= 5);
    node.className = `today-funnel-alert ${status === 'danger' ? 'danger' : 'warn'}${status === 'ok' && displayed >= 5 ? ' hidden' : ''}`;
    node.innerHTML = `
      <strong>${displayed ? `${formatCount(displayed)} pari(s) aujourd'hui visibles` : 'Aucun pari aujourd’hui visible'}</strong>
      <span>Funnel : ${formatCount(today.totalEvents || today.events || 0)} matchs → ${formatCount(today.bookableEvents || today.bookable || 0)} Winamax → ${formatCount(today.predictableMatches || today.predictable || 0)} analysables → ${formatCount(today.positiveSimplePassingFilters ?? today.passingFilters ?? 0)} à edge positif → ${formatCount(ready)} prêts.</span>
      <button class="ghost-btn" type="button" data-tab-target="data">Diagnostic auto</button>
    `;
  }

  function renderSimpleTimeline(rows) {
    const node = $('#simple-pick-timeline');
    if (!node) return;
    const upcoming = (Array.isArray(rows) ? rows : [])
      .filter(canDisplayPickCard)
      .slice()
      .sort((a, b) => Date.parse(a.start || '') - Date.parse(b.start || '') || displayEdgeValue(b) - displayEdgeValue(a))
      .slice(0, 14);
    if (!upcoming.length) {
      node.innerHTML = '<div class="empty compact-empty">Aucun pari à afficher dans la timeline.</div>';
      return;
    }
    node.innerHTML = upcoming.map((row) => `
      <article class="simple-timeline-card clickable-row" data-match-id="${escapeHtml(row.id)}" tabindex="0" role="button">
        ${matchVisualHtml(row, 'match-visual compact')}
        <span>${escapeHtml(countdownLabel(row.start))}</span>
        <strong>${escapeHtml(row.title)}</strong>
        <em>${escapeHtml(userBetLabel(row))}</em>
        <small>${escapeHtml(canDisplayStake(row) && row.priorityRank && row.priorityRank <= 5 ? `#${row.priorityRank} · ` : '')}${escapeHtml(formatOdd(row.odd))} Winamax · mise ${escapeHtml(canDisplayStake(row) ? visibleStakeText(row) : 'non validée')}</small>
      </article>
    `).join('');
  }

  function comboLegGroup(leg) {
    return marketGroupFromKey(marketKeyFromRow({
      marketKey: leg?.marketKey || leg?.key || leg?.market,
      market: leg?.market
    }));
  }

  function comboLegText(leg) {
    return `${leg?.market || ''} ${leg?.label || ''} ${leg?.pick || ''} ${leg?.title || ''}`.toLowerCase();
  }

  function comboLegIsDraw(leg) {
    const text = comboLegText(leg);
    return /\b(match\s*)?nul\b|\bdraw\b|\b1x\b|\bx2\b|\bx\/x\b|\bht\/ft\s*x/i.test(text);
  }

  function comboLegIsSimpleStandard(leg) {
    const group = comboLegGroup(leg);
    if (!['winner', 'goals', 'btts', 'scorer', 'halftime'].includes(group)) return false;
    if (comboLegIsDraw(leg)) return false;
    return !/handicap|rembours|dnb|double chance|score exact|ht\/ft|mi-temps\s*\/\s*fin|corners?|cartons?|penalty|p[eé]nalty|clean sheet|derni[eè]re [eé]quipe|premi[eè]re [eé]quipe|total [eé]quipe/i.test(comboLegText(leg));
  }

  function readableComboLegMarket(leg) {
    const group = comboLegGroup(leg);
    const labels = {
      winner: 'Vainqueur',
      goals: 'Plus / Moins',
      btts: 'Les deux marquent',
      scorer: 'Buteur',
      halftime: 'Mi-temps'
    };
    return labels[group] || formatMarketName(leg?.market || leg?.marketKey || 'Marché');
  }

  function readableComboLegLabel(leg) {
    return String(leg?.label || leg?.pick || 'Pari').replace(/\bBTTS\b/gi, 'Les deux marquent').replace(/\b1N2\b/gi, 'Vainqueur');
  }

  function readableComboTitle(combo) {
    const raw = cleanLabel(combo?.title || combo?.name || 'Combiné simple', 'Combiné simple');
    return raw
      .replace(/best\s*edge/ig, 'Meilleur ticket')
      .replace(/lock\s*combo/ig, 'Ticket prudent')
      .replace(/same-game\s*value/ig, 'Même match simple')
      .replace(/\bBTTS\b/ig, 'Les deux marquent')
      .replace(/\b1N2\b/ig, 'Vainqueur');
  }

  function comboAnchor(combo) {
    const legs = Array.isArray(combo?.legs) ? combo.legs : [];
    return cleanLabel(legs[0]?.title || combo?.title || comboKey(combo), 'combo');
  }

  function displayCombinesForUser(combines, { limit = 12 } = {}) {
    const expert = Boolean(loadPreferences().expertMode);
    const source = Array.isArray(combines) ? combines : [];
    if (expert) return source.slice(0, limit);
    const byAnchor = new Map();
    const seenSignature = new Set();
    const safe = source.filter((combo) => {
      const legs = Array.isArray(combo?.legs) ? combo.legs : [];
      if (legs.length < 2 || legs.length > 4) return false;
      if (!legs.every(comboLegIsSimpleStandard)) return false;
      const totalOdd = Number(combo.totalOdd || combo.odd || 0);
      if (!(totalOdd > 1.2) || totalOdd > 14) return false;
      const anchor = comboAnchor(combo);
      const anchorCount = byAnchor.get(anchor) || 0;
      if (combo.sameGame && anchorCount >= 1) return false;
      if (anchorCount >= 2) return false;
      const signature = legs.map((leg) => `${comboAnchor({ legs: [leg] })}:${comboLegGroup(leg)}:${readableComboLegLabel(leg)}`).sort().join('|');
      if (seenSignature.has(signature)) return false;
      byAnchor.set(anchor, anchorCount + 1);
      seenSignature.add(signature);
      return true;
    });
    return safe.slice(0, limit);
  }

  function renderSimpleInlineSections() {
    const combines = displayCombinesForUser(state.combines, { limit: 4 });
    const realScorers = (Array.isArray(state.scorers) ? state.scorers : [])
      .filter((scorer) => Number(scorer?.odd || 0) > 1 && Number(scorer?.edge || 0) >= 0.01 && Number(scorer?.playerQuality?.score || 0) >= 50)
      .sort((a, b) => (Number(b.edge || 0) - Number(a.edge || 0)) || (Number(b.probability || 0) - Number(a.probability || 0)));
    const scorers = realScorers.slice(0, 6);
    const combineCount = $('#simple-combines-count');
    const scorerCount = $('#simple-scorers-count');
    if (combineCount) combineCount.textContent = formatCount(combines.length);
    if (scorerCount) scorerCount.textContent = formatCount(realScorers.length || 0);
    const combineGrid = $('#simple-combines-grid');
    if (combineGrid) {
      combineGrid.innerHTML = combines.length ? combines.map((combo) => `
        <article class="simple-inline-card">
          <strong>${escapeHtml(combo.name || combo.label || 'Combiné')}</strong>
          <span>${escapeHtml(formatOdd(combo.totalOdd || combo.odd || 0))} · retour 10€ ${escapeHtml(formatMoney((Number(combo.totalOdd || combo.odd || 0) || 0) * 10))}</span>
          <em>${escapeHtml((combo.legs || []).slice(0, 2).map((leg) => leg.title || leg.match || '').filter(Boolean).join(' · ') || 'Jambes prêtes')}</em>
        </article>
      `).join('') : '<div class="empty compact-empty">Aucun combiné solide pour le moment.</div>';
    }
    const scorerGrid = $('#simple-scorers-grid');
    if (scorerGrid) {
      scorerGrid.innerHTML = scorers.length ? scorers.map((scorer) => `
        <article class="simple-inline-card clickable-row" data-match-id="${escapeHtml(scorer.id || scorer.matchId || '')}">
          <strong>${escapeHtml(scorer.name || scorer.player || 'Joueur')}</strong>
          <span>${escapeHtml(scorer.title || scorer.match || '-')} · COTE : ${escapeHtml(formatOdd(scorer.odd || 0))}</span>
          <em>${escapeHtml(`PARI : ${scorer.name || scorer.player || 'joueur'} marque · ${formatPct(scorer.edge || 0, 1)} d’avantage`)}</em>
        </article>
    `).join('') : '<div class="empty compact-empty">Aucun buteur Winamax fiable avec cote réelle pour le moment.</div>';
    }
    renderWinamaxPromos();
  }

  function renderFavoritePicksSection() {
    const section = $('#favorite-picks-section');
    const grid = $('#favorite-picks-grid');
    const count = $('#favorite-picks-count');
    if (!section || !grid) return;
    const favorites = loadFavorites();
    const hasFavorites = Boolean((favorites.teams || []).length || (favorites.players || []).length);
    const rows = favoritePickRows();
    section.classList.toggle('hidden', !hasFavorites);
    if (count) count.textContent = formatCount(rows.length);
    if (!hasFavorites) {
      grid.innerHTML = '<div class="empty compact-empty">Ajoute une équipe ou un joueur dans Réglages.</div>';
      return;
    }
    grid.innerHTML = rows.length ? rows.map((row) => `
      <article class="simple-inline-card clickable-row" data-match-id="${escapeHtml(row.id || row.matchId || '')}" tabindex="0" role="button">
        <strong>${escapeHtml(row.title || 'Match favori')}</strong>
        <span>PARI : ${escapeHtml(userBetLabel(row))}</span>
        <em>${escapeHtml(`${formatDateLabel(row.start)} · cote ${formatOdd(row.odd)} · ${canDisplayStake(row) ? `mise ${visibleStakeText(row)}` : 'à surveiller'}`)}</em>
      </article>
    `).join('') : '<div class="empty compact-empty">Aucun pick favori dans les prochaines fenêtres.</div>';
  }

  function renderWinamaxPromos() {
    const count = $('#simple-promos-count');
    const grid = $('#simple-promos-grid');
    if (!grid) return;
    const payload = state.winamaxPromos;
    const promos = Array.isArray(payload?.promos) ? payload.promos : [];
    if (count) count.textContent = formatCount(promos.length);
    if (payload) {
      grid.innerHTML = promos.length ? promos.slice(0, 5).map((promo) => `
        <article class="simple-inline-card">
          <strong>${escapeHtml(promo.title || promo.label || 'Promo Winamax')}</strong>
          <span>${escapeHtml(promo.label || 'Winamax')}</span>
          <em>${escapeHtml(promo.detail || 'Promotion détectée sur une source publique Winamax.')}</em>
        </article>
      `).join('') : `<div class="empty compact-empty">${escapeHtml(payload.summary?.message || 'Aucune promo exploitable détectée.')}</div>`;
      return;
    }
    if (state.winamaxPromosLoading) return;
    state.winamaxPromosLoading = true;
    fetchJson('/api/winamax/promos')
      .then((response) => {
        state.winamaxPromos = response;
        state.winamaxPromosLoading = false;
        renderWinamaxPromos();
      })
      .catch((error) => {
        state.winamaxPromos = { ok: false, promos: [], summary: { message: error.message } };
        state.winamaxPromosLoading = false;
        renderWinamaxPromos();
      });
  }

  function buildMarketScannerPatterns(rows) {
    const pool = (Array.isArray(rows) ? rows : []).filter(canDisplayPickCard);
    const bySport = new Map();
    const byMarket = new Map();
    const byWindow = new Map();
    pool.forEach((row) => {
      const sport = row.sport || 'Sport';
      const market = simpleMarketLabelForRow(row);
      const bucket = temporalBucketForPick(row);
      bySport.set(sport, [...(bySport.get(sport) || []), row]);
      byMarket.set(market, [...(byMarket.get(market) || []), row]);
      byWindow.set(bucket, [...(byWindow.get(bucket) || []), row]);
    });
    const patterns = [];
    Array.from(bySport.entries()).forEach(([sport, sportRows]) => {
      const ready = sportRows.filter(canDisplayStake);
      if (ready.length >= 3) {
        patterns.push({
          title: `Soirée ${sport}`,
          value: `${formatCount(ready.length)} picks prêts`,
          detail: `Avantage moyen ${formatPct(ready.reduce((sum, row) => sum + displayEdgeValue(row), 0) / ready.length, 1)} · top ${ready[0]?.title || '-'}`,
          tone: 'ok'
        });
      }
    });
    Array.from(byMarket.entries()).forEach(([market, marketRows]) => {
      const top = marketRows.filter(canDisplayStake).slice(0, 4);
      if (top.length >= 3) {
        patterns.push({
          title: `Pattern ${market}`,
          value: `${formatCount(top.length)} tickets proches`,
          detail: top.map((row) => row.title).slice(0, 2).join(' · '),
          tone: 'watch'
        });
      }
    });
    const night = byWindow.get('tonight') || [];
    if (night.length) {
      patterns.push({
        title: 'Fenêtre nuit',
        value: `${formatCount(night.length)} opportunité(s)`,
        detail: `Sports nocturnes détectés : ${Array.from(new Set(night.map((row) => row.sport))).slice(0, 3).join(' · ') || 'à confirmer'}`,
        tone: 'ok'
      });
    }
    const topCombo = pool.filter(canDisplayStake).slice(0, 3);
    if (topCombo.length >= 2) {
      const odd = topCombo.reduce((product, row) => product * Number(row.odd || 1), 1);
      patterns.push({
        title: 'Mini-combiné prudent',
        value: `Cote ${formatOdd(odd)}`,
        detail: topCombo.map((row) => userBetLabel(row)).join(' · '),
        tone: odd <= 8 ? 'ok' : 'watch'
      });
    }
    return patterns
      .sort((a, b) => (a.tone === 'ok' ? -1 : 1) - (b.tone === 'ok' ? -1 : 1))
      .slice(0, 4);
  }

  function renderMarketScanner(rows) {
    const count = $('#market-scanner-count');
    const grid = $('#market-scanner-grid');
    if (!grid) return;
    const patterns = buildMarketScannerPatterns(rows);
    if (count) count.textContent = formatCount(patterns.length);
    grid.innerHTML = patterns.length ? patterns.map((pattern) => `
      <article class="simple-inline-card scanner-${escapeHtml(pattern.tone)}">
        <strong>${escapeHtml(pattern.title)}</strong>
        <span>${escapeHtml(pattern.value)}</span>
        <em>${escapeHtml(pattern.detail)}</em>
        <button class="ghost-btn mini" type="button" data-open-combines>Voir combinés</button>
      </article>
    `).join('') : '<div class="empty compact-empty">Aucun pattern inter-matchs assez net pour aujourd’hui.</div>';
  }

  function renderCustomDashboard(rows) {
    const section = $('#custom-dashboard');
    const grid = $('#custom-dashboard-grid');
    if (!section || !grid) return;
    const prefs = loadPreferences();
    const active = Boolean(prefs.expertMode && prefs.dashboardCustom);
    section.classList.toggle('active', active);
    if (!active) {
      grid.innerHTML = '<div class="empty compact-empty">Dashboard custom désactivé.</div>';
      return;
    }
    const pool = (Array.isArray(rows) ? rows : []).filter(canDisplayPickCard);
    const top = pool.find(canDisplayStake) || pool[0] || null;
    const live = liveRows().slice(0, 2);
    const stats = userBetStats();
    const latestNews = Object.values(state.newsWatcher?.byKey || {}).slice(-3).reverse();
    const preset = prefs.dashboardPreset || 'matin';
    const scannerPatterns = buildMarketScannerPatterns(pool);
    const cards = [
      { id: 'top', label: 'TOP PICK', value: top ? `${top.title} · ${userBetLabel(top)}` : 'Aucun top pick', detail: top ? `${formatOdd(top.odd)} · mise ${visibleStakeText(top)}` : 'Refresh conseillé', size: 'xl' },
      { id: 'next', label: 'Prochains picks', value: `${formatCount(pool.length)} visibles`, detail: pool.slice(0, 3).map((row) => `${countdownLabel(row.start)} ${row.title}`).join(' · ') || 'Aucune ligne', size: 'wide' },
      { id: 'bankroll', label: 'Bankroll + P&L', value: formatMoney(stats.pnlTotal), detail: `Jour ${formatMoney(stats.pnlToday)} · ROI ${formatPct(stats.roi, 1)}`, size: '' },
      { id: 'scanner', label: 'Scanner', value: `${formatCount(scannerPatterns.length)} pattern(s)`, detail: scannerPatterns[0]?.detail || 'Aucun pattern inter-matchs net.', size: '' },
      { id: 'news', label: 'News watcher', value: `${formatCount(latestNews.length)} alertes récentes`, detail: latestNews.map((row) => row.headline || row.title).join(' · ') || 'Aucune news impactante', size: '' },
      { id: 'live', label: 'Live', value: `${formatCount(live.length)} match(s)`, detail: live.map((row) => row.title).join(' · ') || 'Aucun live suivi', size: '' },
      { id: 'preset', label: 'Preset', value: preset, detail: 'Matin / Soir / Live mémorisé localement', size: '' }
    ];
    grid.innerHTML = orderedDashboardCards(cards, preset).map((card) => `
      <article class="bento-card ${escapeHtml(card.size || '')}" draggable="true" tabindex="0" data-bento-widget="${escapeHtml(card.id)}" aria-grabbed="false">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <p>${escapeHtml(card.detail)}</p>
        <small>Déplacer</small>
      </article>
    `).join('');
  }

  function defaultDashboardLayout(preset = 'matin') {
    const layouts = {
      matin: ['top', 'next', 'bankroll', 'scanner', 'news', 'live', 'preset'],
      soir: ['bankroll', 'next', 'scanner', 'news', 'top', 'live', 'preset'],
      live: ['live', 'top', 'next', 'news', 'bankroll', 'scanner', 'preset']
    };
    return layouts[preset] || layouts.matin;
  }

  function dashboardLayouts() {
    const raw = readStorageJson(DASHBOARD_LAYOUT_KEY, {});
    return raw && typeof raw === 'object' ? raw : {};
  }

  function saveDashboardLayout(preset, order) {
    const clean = (Array.isArray(order) ? order : []).map(String).filter(Boolean);
    writeStorageJson(DASHBOARD_LAYOUT_KEY, {
      ...dashboardLayouts(),
      [preset || 'matin']: clean.length ? clean : defaultDashboardLayout(preset)
    });
  }

  function orderedDashboardCards(cards, preset) {
    const byId = new Map(cards.map((card) => [card.id, card]));
    const stored = dashboardLayouts()?.[preset] || [];
    const order = Array.isArray(stored) && stored.length ? stored : defaultDashboardLayout(preset);
    return [
      ...order.map((id) => byId.get(id)).filter(Boolean),
      ...cards.filter((card) => !order.includes(card.id))
    ];
  }

  function saveCurrentDashboardOrder() {
    const prefs = loadPreferences();
    const order = Array.from(document.querySelectorAll('#custom-dashboard-grid [data-bento-widget]'))
      .map((node) => node.dataset.bentoWidget)
      .filter(Boolean);
    saveDashboardLayout(prefs.dashboardPreset || 'matin', order);
  }

  function renderWinamaxMarketAudit() {
    const grid = $('#winamax-market-audit-grid');
    if (!grid) return;
    const report = state.winamaxMarketAudit || {};
    const summary = report.summary || {};
    const coverage = state.coverage24h || {};
    const coverageSummary = coverage.summary || {};
    const coverageBuckets = Array.isArray(coverage.buckets) ? coverage.buckets : [];
    const families = Array.isArray(report.families) ? report.families : [];
    const sports = Array.isArray(report.sports) ? report.sports : [];
    if (!families.length && !sports.length) {
      grid.innerHTML = '<div class="empty">Audit Winamax indisponible.</div>';
      return;
    }
    const cards = [
      ['Familles disponibles', formatCount(summary.availableFamilies || families.length), `${formatCount(summary.exploitedFamilies || 0)} exploitées dans les picks`],
      ['Picks positifs', formatCount(summary.positiveRows || 0), `Cible produit ${formatCount(summary.targetDailyPicks || 15)} / jour, sans forcer la qualité`],
      ['24h glissantes', `${formatCount(coverageSummary.displayed || 0)} affichés`, `${formatCount(coverageSummary.ready || 0)} prêts · ${formatCount(coverageSummary.nightDisplayed || 0)} cette nuit`],
      ['Funnel 24h', `${formatCount(coverageSummary.events || 0)} events`, `${formatCount(coverageSummary.bookable || 0)} Winamax · ${formatCount(coverageSummary.positive || 0)} positifs`],
      ['Boosts détectés', formatCount(summary.boostsDetected || 0), summary.boostsDetected ? 'Boosts associés aux données locales.' : 'Aucun boost structuré dans les fichiers actuels.'],
      ['Sports Winamax', formatCount(summary.sportsDetected || sports.length), sports.slice(0, 5).map((row) => row.sport).join(' · ') || 'Catalogue en attente']
    ];
    const bucketCards = coverageBuckets.map((row) => [
      row.label || row.key,
      `${formatCount(row.displayed || 0)} affichés`,
      `${formatCount(row.bookable || 0)} Winamax · ${formatCount(row.ready || 0)} prêts · ${formatCount(row.reliable || 0)} fiables`
    ]);
    const familyCards = families.slice(0, 8).map((row) => [
      row.label || row.family,
      `${formatCount(row.exploited || 0)}/${formatCount(row.count || 0)}`,
      row.exploited ? 'Déjà exploité dans le cockpit.' : 'Disponible mais encore prudent / non retenu.'
    ]);
    grid.innerHTML = [...cards, ...bucketCards, ...familyCards].map(([label, value, detail]) => `
      <article class="quality-report-card quality-ok">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <p>${escapeHtml(detail)}</p>
      </article>
    `).join('');
  }

  function renderPicks(emptyMessage) {
    const body = $('#picks-body');
    const metricLabel = $('#metric-picks-label');
    renderUserPnl();
    renderSimpleTopStrip();
    renderTodayFunnelAlert();
    renderMorningDashboard();
    renderCoachAdvice();
    renderTodayModelPulse();
    updatePickFilters();
    renderSavedStrategySelect();
    const filters = readPickFilters();
    const displayRows = dashboardPickRows(filters);
    state.currentDashboardRows = displayRows.slice();
    // Sprint 38 follow-up: prefetch real team logos for every pick of
    // the cockpit in a single batch request. This warms the image cache
    // so the swap from SVG initials to real Wikipedia logos happens in
    // one render cycle instead of N (one per card).
    prefetchTeamLogosForRows(displayRows);
    renderDailySuggestion(displayRows);
    rememberDisplayedOdds(displayRows);
    renderMarketSnapshot(displayRows);
    renderLiveCockpit();
    renderTradingDesk();
    renderDaySummary(displayRows);
    renderUltimateBet(displayRows);
    renderReadyPicksHero(displayRows);
    renderBettingHome(displayRows);
    renderHomeCategories(displayRows);
    // Sprint 50 (UX) : badge compteur "paris prêts" dans la nav Picks.
    try {
      const readyCount = (displayRows || [])
        .filter(isReadyToStakeRow)
        .length;
      const badge = $('#nav-picks-badge');
      if (badge) badge.textContent = readyCount > 0 ? String(readyCount) : '';
    } catch {
      // best-effort, non-bloquant
    }
    renderTemporalCockpit(displayRows);
    renderDailyBudgetSummary();
    updateWebEnrichmentSummary();
    scheduleVisibleWebEnrichment(displayRows);
    renderSimpleTimeline(displayRows);
    renderSimpleInlineSections();
    renderFavoritePicksSection();
    renderMarketScanner(displayRows);
    renderCustomDashboard(displayRows);
    clearTimeout(state.aiTimer);
    state.aiTimer = setTimeout(() => runBackgroundAi(displayRows), 600);
    const total = state.allPicks.length || state.picks.length || 0;
    const meta = state.dashboardMeta || {};
    const readyRows = rollingReadyRows(displayRows);
    const ready = readyRows.length;
    const nightReady = nightPickRows(displayRows, isReadyToStakeRow).length;
    const today = state.todayFunnel?.today || state.status?.analysis?.todayFunnel?.today || {};
    const todayReady = Number(today.ready || meta.todayReady || 0);
    const todayDisplayed = Number(today.displayed || 0);
    if (metricLabel) {
      metricLabel.textContent = ready > 0
        ? 'Paris prêts sur 24h'
        : todayDisplayed > 0
          ? 'À surveiller avant minuit'
          : 'Candidats surveillés';
    }
    $('#metric-picks').textContent = String(ready > 0 ? ready : todayDisplayed > 0 ? todayDisplayed : (meta.todayPicks || state.picks.length || 0));
    const globalBlocked = Boolean(state.decisionCenter?.summary?.blocked);
    const caption = pickFiltersActive(filters)
      ? `${formatCount(displayRows.length)} pari(s) filtré(s) sur ${formatCount(total)} lignes prêtes.`
      : ready > 0
        ? `${formatCount(ready)} pari(s) prêt(s) sur les prochaines 24h, dont ${formatCount(nightReady)} cette nuit.`
        : todayDisplayed > 0
          ? `${formatCount(todayDisplayed)} opportunité(s) avant minuit à surveiller, aucune mise validée.`
            : meta.mode === 'bestAvailable'
              ? 'Aucun pari prêt dans la fenêtre courte : affichage des meilleurs candidats à surveiller.'
              : 'Aucun pari à jouer maintenant : candidats surveillés sans mise.';
    const sectionTitle = $('#picks-section-title');
    if (sectionTitle) sectionTitle.textContent = ready > 0 ? 'À miser maintenant' : todayDisplayed > 0 ? 'À surveiller avant minuit' : 'Sélection surveillée';
    $('#picks-caption').textContent = caption;
    $('#metric-picks-sub').textContent = total > state.picks.length
      ? `${state.picks.length} affichés · ${total} paris analysés au total`
      : globalBlocked
        ? '0 mise tant qu’un gate est rouge'
        : `${formatCount(meta.rolling24Displayed || ready)} sur 24h · ${formatCount(nightReady)} nuit prête`;
    if (!displayRows.length) {
      body.innerHTML = `<tr><td colspan="7" class="empty">${escapeHtml(emptyMessage || 'Aucun pari simple avec les règles actuelles.')}</td></tr>`;
      markFirstPickVisible(0);
      return;
    }
    body.innerHTML = displayRows.map((pick) => {
      const startLabel = `${formatDateLabel(pick.start)} · ${countdownLabel(pick.start)}`;
      const decision = pick.decisionCenter || {};
      const statusText = decision.canBet ? 'Prêt' : decision.status === 'skip' ? 'À éviter' : 'À surveiller';
      const action = trackButtonHtml(pick, `Je mise ${visibleStakeText(pick)}`);
      const winamaxAction = winamaxOpenButtonHtml(pick, 'Ouvrir Winamax');
      return `
        <tr class="clickable-row" data-match-id="${escapeHtml(pick.id)}" tabindex="0" role="button" aria-label="Ouvrir ${escapeHtml(pick.title)}">
          <td data-label="Match">
            <div class="table-match-cell">
              ${matchVisualHtml(pick, 'match-visual compact')}
              <div>
                <div class="match-title">${escapeHtml(pick.title)}</div>
                <div class="match-sub">${escapeHtml(pick.sport)} · ${escapeHtml(pick.league)}</div>
              </div>
            </div>
          </td>
          <td data-label="Pari">
            <div class="pari-cell">
              <span class="pill pari-status">${escapeHtml(statusText)}</span>
              <strong class="pari-bet-label">${escapeHtml(userBetLabel(pick) || simpleMarketLabelForRow(pick))}</strong>
              ${(() => {
                // Sprint 69 — Cellule Pari simplifiee : badges secondaires en tooltip.
                // 3 chips max visible (status + safe + priority), le reste dans le title attribute.
                const extras = [
                  priorityBadgeHtml(pick) ? 'priorité' : '',
                  safeBadgeHtml(pick) ? 'fiable' : '',
                  specialPatternBadgeHtml(pick) ? 'pattern' : '',
                  boostBadgeHtml(pick) ? 'boost' : '',
                  enrichmentBadgeHtml(pick) ? 'enrichi' : ''
                ].filter(Boolean);
                return extras.length
                  ? `<span class="pari-extras-chip" title="${escapeHtml(extras.join(' · '))}">+${extras.length}</span>`
                  : '';
              })()}
              ${safeBadgeHtml(pick)}
            </div>
          </td>
          <td data-label="Cote">@${pick.odd.toFixed(2)}</td>
          <td data-label="Mise">${visibleStakeText(pick)}<div class="match-sub">${escapeHtml(allocationSummaryText(pick))}</div></td>
          <td data-label="Départ">${escapeHtml(startLabel)}</td>
          <td data-label="Pourquoi"><div class="selection-reason">${escapeHtml(simpleWhyText(pick))}</div></td>
          <td data-label="Action">${winamaxAction}${action}</td>
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
      return cal.level === 'warm' || displayEdgeValue(row) >= 0.10 || String(row.tier || '').includes('value');
    });
    const risky = rows.filter((row) => row.calibration?.level === 'cold' || row.contextQuality?.tier === 'insuffisant');
    const avgEdge = rows.length ? rows.reduce((sum, row) => sum + displayEdgeValue(row), 0) / rows.length : 0;
    const avgAllEdge = allRows.length ? allRows.reduce((sum, row) => sum + displayEdgeValue(row), 0) / allRows.length : avgEdge;
    const level = rows.length >= 20 && profitable.length >= risky.length ? 'Bonne' : rows.length >= 10 ? 'Moyenne' : 'Faible';
    return { rows, profitable, risky, avgEdge, avgAllEdge, level };
  }

  function renderTodayModelPulse() {
    const pulse = todayModelPulse();
    const target = $('#today-model-pulse');
    if (!target) return;
    target.innerHTML = [
      ['Paris affichés', formatCount(pulse.rows.length), 'Sélection visible après préférences.'],
      ['Zones favorables', formatCount(pulse.profitable.length), 'Historique ou avantage robuste.'],
      ['Zones à éviter', formatCount(pulse.risky.length), 'À surveiller ou à éviter.'],
      ['Avantage moyen', formatPct(pulse.avgEdge, 1), `Moyenne globale ${formatPct(pulse.avgAllEdge, 1)}.`],
      ['Qualité du jour', pulse.level, 'Lecture rapide de la journée.']
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
      bucket.edge += displayEdgeValue(row);
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
        big: rows.filter((row) => displayEdgeValue(row) >= 0.10).length,
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
          <small>${formatCount(day.big)} forts · avantage moy. ${escapeHtml(formatPct(day.avgEdge, 1))}</small>
        </button>
      `;
    }).join('');
    const day = days.find((item) => item.key === selected) || days[0];
    const title = $('#calendar-day-title');
    const caption = $('#calendar-day-caption');
    if (title) title.textContent = day ? `Timeline ${formatDayKey(day.date.toISOString())}` : 'Timeline';
    if (caption) caption.textContent = day?.count ? `${formatCount(day.count)} pari(s), triés par coup d'envoi.` : 'Aucun pari prêt ce jour-là.';
    timeline.innerHTML = day?.rows.length ? day.rows.slice(0, 40).map((row) => `
      <button class="timeline-row" type="button" data-match-id="${escapeHtml(row.id)}">
        <span>${escapeHtml(new Date(row.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))}</span>
        <strong>${escapeHtml(row.title)}</strong>
        <em>${escapeHtml(userBetLabel(row))} · ${escapeHtml(formatOdd(row.odd))} · mise ${escapeHtml(visibleStakeText(row))}</em>
      </button>
    `).join('') : '<div class="empty">Aucun pari prêt sur cette journée.</div>';
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
    renderStabilityPanel(status);
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

  function renderStabilityPanel(status = state.status) {
    const node = $('#stability-grid');
    if (!node) return;
    const memory = status?.memory || {};
    const uptime = Number(memory.uptimeMinutes || 0);
    const avg = Number(memory.avgRssMb || memory.rssMb || 0);
    const max = Number(memory.maxRssMb || memory.rssMb || 0);
    const liveCount = liveRows().length;
    const tone = memory.warning ? 'warn' : 'ok';
    const stress = status?.stressReport || null;
    const update = state.updateStatus || readStorageJson(UPDATE_STATUS_KEY, null);
    const longTasks = (state.longTasks || []).filter((entry) => Number(entry.duration || 0) > 100);
    const longTaskHtml = `
      <article class="refresh-card refresh-${escapeHtml(longTasks.length ? 'warn' : 'ok')}">
        <span>Réactivité UI</span>
        <strong>${escapeHtml(longTasks.length ? `${formatCount(longTasks.length)} pause(s)` : 'Fluide')}</strong>
        <p>${escapeHtml(longTasks.length ? `Plus longue pause ${Math.round(Math.max(...longTasks.map((entry) => Number(entry.duration || 0))))} ms` : 'Aucune pause >100 ms détectée dans cette session.')}</p>
        <small>Observer local actif, sans bloquer le refresh.</small>
      </article>
    `;
    const stressHtml = stress ? `
      <article class="refresh-card refresh-${escapeHtml(stress.ok === false ? 'warn' : 'ok')}">
        <span>Stress test</span>
        <strong>${escapeHtml(stress.label || `${stress.durationMinutes || stress.requestedMinutes || '-'} min mesurées`)}</strong>
        <p>Max ${escapeHtml(String(stress.memoryMaxMb || stress.maxMemoryMb || '-'))} MB · p95 ${escapeHtml(String(stress.memoryP95Mb || '-'))} MB · erreurs ${formatCount((stress.errors || []).length)}</p>
        <small>${escapeHtml(stress.finishedAt ? `Dernier rapport ${formatDateTime(stress.finishedAt)}` : 'Rapport local disponible.')}</small>
      </article>
    ` : '';
    const updateHtml = update ? `
      <article class="refresh-card refresh-${escapeHtml(update.error ? 'warn' : update.available ? 'ok' : 'idle')}">
        <span>Auto-update</span>
        <strong>${escapeHtml(update.available ? `v${update.latestVersion || ''}` : 'À jour')}</strong>
        <p>${escapeHtml(update.installOnQuit ? 'Installation au prochain redémarrage' : update.assetName || update.channel || 'stable')}</p>
        <small>${escapeHtml(update.error || (update.checkedAt ? `Vérifié ${formatDateTime(update.checkedAt)}` : 'Pas encore vérifié'))}</small>
      </article>
    ` : '';
    node.innerHTML = `
      <article class="refresh-card refresh-${escapeHtml(tone)}">
        <span>Stabilité</span>
        <strong>${escapeHtml(formatDurationSeconds(uptime * 60))} uptime</strong>
        <p>Moy. ${avg ? `${avg.toFixed(1)} MB` : '-'} · max ${max ? `${max.toFixed(1)} MB` : '-'} · live suivis ${formatCount(liveCount)}</p>
        <small>${escapeHtml(memory.warning || 'Objectif 7 jours : monitoring actif, UI non bloquante.')}</small>
      </article>
      ${updateHtml}
      ${longTaskHtml}
      ${stressHtml}
    `;
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

  function installPerformanceObserver() {
    try {
      if (!('PerformanceObserver' in window)) return;
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const duration = Number(entry.duration || 0);
          if (duration <= 100) return;
          state.longTasks.push({ at: new Date().toISOString(), duration: Math.round(duration) });
          state.longTasks = state.longTasks.slice(-40);
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {
      // Tous les Chromium/Electron ne supportent pas l'observer longtask.
    }
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
      const edgeClass = displayEdgeValue(pick) >= 0.08 ? 'edge-pos' : 'edge-warn';
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
          <td data-label="Edge" class="${edgeClass}">${edgeDisplayHtml(pick)}</td>
        </tr>
      `;
    }).join('');
  }

  function renderStakeScenarios(emptyMessage) {
    const wrap = $('#stake-scenario-grid');
    if (!wrap) return;
    const picks = state.picks.filter((pick) => canDisplayStake(pick) && displayEdgeValue(pick) > 0);
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
      const rowEdge = displayEdgeValue(row);
      const edgeClass = rowEdge >= 0.08 ? 'edge-pos' : rowEdge > 0 ? 'edge-warn' : 'status-skip';
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
          <td data-label="Marché"><span class="pill">${escapeHtml(row.market)}</span>${safeBadgeHtml(row)}<div class="match-sub">${escapeHtml(row.label)}</div>${calibrationNote(row)}</td>
          <td data-label="Cote">${row.odd > 1 ? `@${row.odd.toFixed(2)}` : '-'}</td>
          <td data-label="Proba">${row.probability > 0 ? formatPct(row.probability, 1) : '-'}</td>
          <td data-label="Edge" class="${edgeClass}">${rowEdge > 0 ? edgeDisplayHtml(row) : '-'}</td>
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
    const displayCombines = displayCombinesForUser(state.combines, { limit: 14 });
    if (!displayCombines.length) {
      const hidden = Array.isArray(state.combines) ? state.combines.length : 0;
      wrap.innerHTML = `<div class="empty">Aucun combiné simple exploitable maintenant.${hidden ? ' Les tickets trop techniques ou trop corrélés restent masqués en mode standard.' : ''}</div>`;
      return;
    }
    const expert = Boolean(loadPreferences().expertMode);
    const tracked = new Set(loadUserBets().filter((bet) => bet.status === 'pending').map((bet) => bet.key));
    const sortedCombines = displayCombines.slice().sort((a, b) => {
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
            : 'Meilleur ticket';
      return `
        <article class="combo-card">
          <div class="combo-head">
            <div>
              <h4>${escapeHtml(readableComboTitle(combo))}</h4>
              <p class="match-sub">${escapeHtml((combo.desc || 'Ticket combiné').replace(/\bBTTS\b/ig, 'les deux marquent').replace(/\b1N2\b/ig, 'vainqueur').replace(/Best Edge/ig, 'meilleur ticket').replace(/Same-game/ig, 'même match'))}</p>
            </div>
            <span class="pill">${escapeHtml(variant)}</span>
            <span class="pill">${combo.sameGame ? 'Même match' : 'Plusieurs matchs'}</span>
          </div>
          <div class="combo-stats">
            <div class="mini-stat"><span>Cote</span><strong>${formatOdd(combo.totalOdd).replace('@', '')}</strong></div>
            <div class="mini-stat"><span>Proba</span><strong>${combo.combinedProb > 0 ? formatPct(combo.combinedProb, 1) : formatPct(combo.avgProb, 1)}</strong></div>
            <div class="mini-stat"><span>Retour 10€</span><strong>${returnForTen > 0 ? formatMoney(returnForTen) : '-'}</strong></div>
            ${expert ? `<div class="mini-stat"><span>Dépendance</span><strong>${formatPct(correlation, 0)}</strong></div>` : ''}
            ${expert ? `<div class="mini-stat"><span>Avantage moyen</span><strong>${formatPct(edgeCompound, 1)}</strong></div>` : ''}
            <div class="mini-stat"><span>Jambes</span><strong>${legs.length}</strong></div>
          </div>
          <div class="leg-list">
            ${legs.map((leg) => `
              <div class="leg-row clickable-row" data-match-id="${escapeHtml(leg.id)}" tabindex="0" role="button" aria-label="Ouvrir ${escapeHtml(leg.title)}">
                <div>
                  <div class="match-title">${escapeHtml(leg.title)}</div>
                  <div class="match-sub">${escapeHtml(readableComboLegMarket(leg))} · ${escapeHtml(readableComboLegLabel(leg))}</div>
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
    const playerName = cleanLabel(scorer.name, '');
    if (playerName && playerName !== '?') {
      // Use the real Wikipedia photo with initials fallback.
      return playerPhotoHtml(playerName, { sport: 'football' }, { size: 48 });
    }
    const initial = (playerName || '?').trim().charAt(0).toUpperCase() || '?';
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
      const odd = Number(scorer.odd || scorer.impliedOdd || 0);
      if (filters.query && !scorerSearchText(scorer).includes(filters.query)) return false;
      if (filters.league !== 'all' && scorerLeagueKey(scorer) !== filters.league) return false;
      if (filters.market !== 'all' && filters.market !== 'buteur') return false;
      if (filters.oddMin > 1 && odd < filters.oddMin) return false;
      if (filters.oddMax > 1 && odd > filters.oddMax) return false;
      return true;
    });
    rows.sort((a, b) => {
      if (filters.sort === 'confidence') return Number(b.probability || 0) - Number(a.probability || 0);
      if (filters.sort === 'edge') return Number(b.edge || b.playerQuality?.score || 0) - Number(a.edge || a.playerQuality?.score || 0);
      if (filters.sort === 'odd') return Number(b.odd || b.impliedOdd || 0) - Number(a.odd || a.impliedOdd || 0);
      return Date.parse(a.start || '') - Date.parse(b.start || '') || Number(b.probability || 0) - Number(a.probability || 0);
    });
    return rows;
  }

  function scorerToTrackRow(scorer) {
    const odd = Number(scorer?.odd || 0);
    const probability = Number(scorer?.probability || 0) || 0;
    const edge = odd > 1 && probability > 0 ? probability - (1 / odd) : 0;
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
      probability,
      edge,
      stake: odd > 1 && edge >= 0.01 ? Math.max(0.5, Math.min(getBankroll() * 0.01, getBankroll() * 0.03)) : 0,
      status: odd > 1 && edge >= 0.01 ? 'bet' : 'watch',
      statusLabel: odd > 1 && edge >= 0.01 ? 'Buteur Winamax' : 'Cote buteur Winamax à vérifier',
      decisionCenter: {
        canBet: odd > 1 && edge >= 0.01,
        status: odd > 1 && edge >= 0.01 ? 'ready' : 'watch',
        mainReason: odd > 1 && edge >= 0.01 ? 'Cote joueur Winamax disponible avec avantage positif.' : 'Pas de cote buteur Winamax positive confirmée dans le snapshot local.',
        stakeDisplay: odd > 1 && edge >= 0.01 ? undefined : 'À vérifier'
      },
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
      const realOdd = Number(scorer.odd || 0);
      // Sprint 50 : aligné sur le filtre moteur sprint 43 (quality ≥ 35,
      // edge ≥ 0.005). La vue Buteurs ne doit plus rejeter ce que le
      // moteur a déjà validé comme buteur affichable.
      const canTrackScorer = realOdd > 1 && Number(scorer.edge || 0) >= 0.005 && Number(quality.score || 0) >= 35;
      const winamaxUrl = safeExternalUrl(scorer.winamaxUrl, 'www.winamax.fr');
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
            <div class="mini-stat"><span>Cote</span><strong>${realOdd > 1 ? `${formatOdd(realOdd)} Winamax` : 'à vérifier'}</strong></div>
            <div class="mini-stat"><span>Départ</span><strong>${escapeHtml(formatDateLabel(scorer.start))}</strong></div>
            <div class="mini-stat"><span>Source</span><strong>${scorer.source === 'star_players' ? 'Profil' : 'Lineup'}</strong></div>
          </div>
          ${canTrackScorer
            ? `<button type="button" class="track-bet-btn scorer-track-btn" data-track-scorer-id="${escapeHtml(scorer.id)}">Je mise</button>`
            : `${winamaxUrl ? `<a class="ghost-btn" href="${escapeHtml(winamaxUrl)}" target="_blank" rel="noreferrer">Vérifier sur Winamax</a>` : '<span class="match-sub">Cote Winamax non confirmée</span>'}`}
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

  function isExtremeModelRoi(row) {
    const roi = Math.abs(Number(row?.roi || 0));
    const brier = Number(row?.brier || 0);
    const count = Number(row?.count || 0);
    return roi > 3 || (roi > 1.5 && (count < 50 || brier > 0.4));
  }

  function userFacingRoi(row, digits = 0) {
    return isExtremeModelRoi(row) ? 'Sample anormal' : formatPct(row?.roi || 0, digits);
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
      const reality = state.modelRealityAudit || {};
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
        ['Drawdown', Number.isFinite(Number(summary.max_drawdown_units)) ? `${Number(summary.max_drawdown_units).toFixed(1)}u` : '-', 'Perte max historique simulée.'],
        ['Validation réelle', `${formatCount(reality.sampleSize || 0)} lignes`, `${formatCount(reality.robustSegments || 0)} segments robustes sur ${formatCount(reality.windowDays || 60)} jours.`],
        ['Calibration par tier', formatCount(reality.tierCalibration?.length || 0), (reality.tierCalibration || [])[0]?.reason || 'TOP / fiable / surveiller sont relus séparément.'],
        ['Drift saisonnier', formatCount(reality.seasonalDrift?.length || 0), (reality.seasonalDrift || [])[0]?.recommendation || 'Aucune nouvelle saison critique détectée.']
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
      const realityTop = Array.isArray(state.modelRealityAudit?.topSegments) ? state.modelRealityAudit.topSegments.slice(0, 4) : [];
      const markets = realityTop.length ? realityTop : (Array.isArray(report.by_market) ? report.by_market : []).slice(0, 4);
      const leagues = (Array.isArray(report.by_league) ? report.by_league : []).filter((row) => Number(row.roi || 0) > 0).slice(0, 4);
      const rawRows = [...markets, ...leagues].slice(0, 10);
      const hiddenExtreme = rawRows.filter(isExtremeModelRoi).length;
      const rows = rawRows.filter((row) => !isExtremeModelRoi(row)).slice(0, 8);
      const hiddenHtml = hiddenExtreme
        ? `<article class="segment-card sample"><span>Segments extrêmes masqués</span><strong>${formatCount(hiddenExtreme)}</strong><p>ROI trop haut pour être fiable côté utilisateur. Détail disponible en export expert.</p><em>anti-signal trompeur</em></article>`
        : '';
      segmentGrid.innerHTML = rows.length ? rows.map((row) => `
        <article class="segment-card ${segmentTone(row)}" data-market-chip="${escapeHtml(normalizeUiKey(row.key || ''))}">
          <span>${escapeHtml(formatMarketName(row.key || row.market || row.league || 'Segment'))}</span>
          <strong>${escapeHtml(userFacingRoi(row, 0))}</strong>
          <p>${escapeHtml(`${formatCount(row.count || 0)} réglés · WR ${formatPct(row.hit_rate || row.win_rate || row.winRate || 0, 0)} · Brier ${Number(row.brier || 0).toFixed(3)}`)}</p>
          <em>${escapeHtml(row.sample_level || 'sample')}</em>
        </article>
      `).join('') + hiddenHtml : (hiddenHtml || '<div class="empty">Aucun segment robuste à afficher.</div>');
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
      const canUndoAuto = bet.trackingSource === 'auto' && Date.parse(bet.undoUntil || '') > Date.now();
      const action = bet.status === 'pending'
        ? `${canUndoAuto ? `<button class="mini-export-btn" type="button" data-cancel-auto-bet-id="${escapeHtml(bet.id)}">Annuler auto</button>` : ''}
           <button class="mini-export-btn" type="button" data-settle-bet-id="${escapeHtml(bet.id)}" data-settle-status="won">Win</button>
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

  function cancelAutoTrackedBet(id) {
    const bets = loadUserBets();
    const index = bets.findIndex((bet) => bet.id === id && bet.trackingSource === 'auto' && bet.status === 'pending');
    if (index < 0) return;
    const [removed] = bets.splice(index, 1);
    saveUserBets(bets);
    appendAutoTrackingAudit({ day: parisDayKey(), status: 'cancelled', key: removed.key, title: removed.title, label: removed.label, stake: removed.stake, reason: 'Annulation utilisateur dans la fenêtre de 5 minutes.' });
    renderTrackedBets();
    renderUserPnl();
    renderPicks();
    setSideStatus('Auto-tracking annulé', 'warn');
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
    const userRows = Array.isArray(payload.adjustments) ? payload.adjustments.map((row) => ({
      ...row,
      source: 'Paris suivis',
      oldEdgeMin: 0.03,
      newEdgeMin: Math.max(0, 0.03 + Number(row.edgeDelta || 0)),
      oldConfidenceMin: 0.55,
      newConfidenceMin: Math.max(0, 0.55 + Number(row.confidenceDelta || 0))
    })) : [];
    const engineRows = Array.isArray(state.modelRealityAudit?.segmentAdjustments)
      ? state.modelRealityAudit.segmentAdjustments.map((row) => ({ ...row, source: 'Backtest 60 jours' }))
      : [];
    const rows = [...engineRows, ...userRows].slice(0, 16);
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
        <span>${escapeHtml(row.direction === 'harden' ? 'Seuil durci' : 'Seuil assoupli')} · ${escapeHtml(row.source || 'auto')}</span>
        <strong>${escapeHtml(row.label || row.key)}</strong>
        <p>${escapeHtml(`${row.reason || 'Ajustement automatique'} · edge min ${formatPct(row.oldEdgeMin ?? 0.03, 0)} → ${formatPct(row.newEdgeMin ?? 0.03, 0)} · confiance ${formatPct(row.oldConfidenceMin ?? 0.55, 0)} → ${formatPct(row.newConfidenceMin ?? 0.55, 0)}`)}</p>
        <em>${escapeHtml(row.direction === 'harden' ? 'Protection active' : `Cote max ${formatOdd(row.oldOddMax || 6)} → ${formatOdd(row.newOddMax || row.oldOddMax || 6)}`)}</em>
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

  function applyTheme(prefs = loadPreferences()) {
    const theme = ['dark', 'light', 'auto'].includes(prefs.theme) ? prefs.theme : 'dark';
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-auto');
    document.body.classList.add(`theme-${theme}`);
  }

  function loadShortcuts() {
    const stored = readStorageJson(SHORTCUTS_KEY, {});
    return { ...DEFAULT_SHORTCUTS, ...(stored && typeof stored === 'object' ? stored : {}) };
  }

  function saveShortcuts(shortcuts) {
    const clean = { ...DEFAULT_SHORTCUTS, ...(shortcuts || {}) };
    writeStorageJson(SHORTCUTS_KEY, clean);
    return clean;
  }

  function normalizeShortcutText(text) {
    const raw = String(text || '').trim();
    if (!raw) return '';
    const parts = raw.split('+').map((part) => part.trim()).filter(Boolean);
    const key = parts.pop() || '';
    const mods = new Set(parts.map((part) => part.toLowerCase()));
    const ordered = [];
    if (mods.has('ctrl') || mods.has('control')) ordered.push('Ctrl');
    if (mods.has('shift')) ordered.push('Shift');
    if (mods.has('alt')) ordered.push('Alt');
    if (mods.has('meta') || mods.has('cmd')) ordered.push('Meta');
    const canonicalKey = key.length === 1 ? key.toUpperCase() : key.replace(/^arrow/i, 'Arrow');
    return [...ordered, canonicalKey].join('+');
  }

  function shortcutFromEvent(event) {
    const key = event.key === ' ' ? 'Space' : event.key;
    if (!key || ['Control', 'Shift', 'Alt', 'Meta'].includes(key)) return '';
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.shiftKey) parts.push('Shift');
    if (event.altKey) parts.push('Alt');
    if (event.metaKey) parts.push('Meta');
    const displayKey = key.length === 1 ? key.toUpperCase() : key;
    return [...parts, displayKey].join('+');
  }

  function renderShortcutSettings() {
    const grid = $('#shortcut-settings-grid');
    if (!grid) return;
    const shortcuts = loadShortcuts();
    grid.innerHTML = Object.entries(SHORTCUT_ACTIONS).map(([action, item]) => {
      const capturing = state.shortcutCaptureAction === action;
      return `
        <div class="shortcut-row${capturing ? ' capturing' : ''}" data-shortcut-row="${escapeHtml(action)}">
          <div>
            <strong>${escapeHtml(item.label)}</strong>
            <small>${escapeHtml(capturing ? 'Tape la nouvelle combinaison...' : 'Raccourci configurable')}</small>
          </div>
          <span class="shortcut-key">${escapeHtml(shortcuts[action] || DEFAULT_SHORTCUTS[action] || '-')}</span>
          <button class="ghost-btn" type="button" data-shortcut-edit="${escapeHtml(action)}">${capturing ? 'Annuler' : 'Modifier'}</button>
        </div>
      `;
    }).join('');
  }

  function setShortcut(action, combo) {
    if (!SHORTCUT_ACTIONS[action] || !combo) return false;
    const normalized = normalizeShortcutText(combo);
    const shortcuts = loadShortcuts();
    const duplicate = Object.entries(shortcuts).find(([otherAction, value]) => otherAction !== action && normalizeShortcutText(value) === normalized);
    const status = $('#shortcut-capture-status');
    if (duplicate) {
      if (status) status.textContent = `Conflit avec ${SHORTCUT_ACTIONS[duplicate[0]]?.label || duplicate[0]}.`;
      return false;
    }
    saveShortcuts({ ...shortcuts, [action]: normalized });
    state.shortcutCaptureAction = null;
    if (status) status.textContent = `${SHORTCUT_ACTIONS[action].label} : ${normalized}`;
    renderShortcutSettings();
    return true;
  }

  function toggleHelpPanel() {
    $('#help-panel')?.classList.toggle('hidden');
  }

  function executeShortcut(action, event) {
    const target = event?.target;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return false;
    if (action === 'dashboard') switchTab('dashboard');
    else if (action === 'history') switchTab('history');
    else if (action === 'search') switchTab('search');
    else if (action === 'preferences') switchTab('preferences');
    else if (action === 'expert') {
      const prefs = { ...loadPreferences(), expertMode: !loadPreferences().expertMode };
      savePreferences(prefs);
      renderPreferences();
      applyExpertMode();
      setSideStatus(prefs.expertMode ? 'Mode expert actif' : 'Mode expert masqué', 'ok');
    } else if (action === 'refresh') {
      startRefresh().catch((error) => setSideStatus(`Refresh impossible : ${error.message}`, 'danger'));
    } else if (action === 'topPick') {
      const row = (dashboardPickRows(readPickFilters()) || [])[0] || state.picks[0] || state.allPicks[0];
      if (row) trackUserBet(row);
      else setSideStatus('Aucun top pick à miser', 'warn');
    } else if (action === 'nextPick') {
      if (!loadPreferences().tradingDesk) return false;
      return moveTradingSelection(1);
    } else if (action === 'previousPick') {
      if (!loadPreferences().tradingDesk) return false;
      return moveTradingSelection(-1);
    } else if (action === 'favoriteCurrent') {
      if (!loadPreferences().tradingDesk) return false;
      return toggleFavoriteCurrentPick();
    } else if (action === 'cashoutCurrent') {
      if (!loadPreferences().tradingDesk) return false;
      return openCashoutCurrent();
    } else if (action === 'tradingRefresh') {
      if (!loadPreferences().tradingDesk) return false;
      startRefresh().catch((error) => setSideStatus(`Refresh impossible : ${error.message}`, 'danger'));
    } else if (action === 'help') toggleHelpPanel();
    else if (action === 'logs') openLogDrawer();
    else return false;
    recordUserAction('shortcut', action);
    return true;
  }

  function applyShortcutEvent(event) {
    if (state.shortcutCaptureAction) {
      event.preventDefault();
      const combo = shortcutFromEvent(event);
      if (combo) setShortcut(state.shortcutCaptureAction, combo);
      return true;
    }
    const combo = normalizeShortcutText(shortcutFromEvent(event));
    if (!combo) return false;
    const action = Object.entries(loadShortcuts()).find(([, value]) => normalizeShortcutText(value) === combo)?.[0];
    if (!action) return false;
    const handled = executeShortcut(action, event);
    if (handled) event.preventDefault();
    return handled;
  }

  function applyExpertMode() {
    const prefs = loadPreferences();
    const expert = Boolean(prefs.expertMode);
    document.body.classList.toggle('expert-mode', expert);
    document.body.classList.toggle('trading-desk-on', expert && Boolean(prefs.tradingDesk));
    $$('.expert-only, .expert-nav').forEach((node) => {
      node.classList.toggle('hidden', !expert);
    });
    $('#trading-desk')?.classList.toggle('active', expert && Boolean(prefs.tradingDesk));
    if (!expert && $('.tab-panel.active')?.dataset.panel === 'data') {
      switchTab('preferences');
    }
  }

  function favoriteButtonHtml(kind, label, selected = false) {
    const attr = selected ? 'data-favorite-remove' : 'data-favorite-add';
    return `<button class="${selected ? 'favorite-chip' : 'favorite-suggestion'}" type="button" ${attr}="${escapeHtml(kind)}" data-favorite-value="${escapeHtml(label)}">${escapeHtml(label)}${selected ? '<span aria-hidden="true">×</span>' : ''}</button>`;
  }

  function renderFavoritePreferences() {
    const favorites = loadFavorites();
    const catalog = favoriteCatalog();
    const teamQuery = normalizeUiKey($('#favorite-team-search')?.value || '');
    const playerQuery = normalizeUiKey($('#favorite-player-search')?.value || '');
    const selectedKeys = new Set([...(favorites.teams || []), ...(favorites.players || [])].map(normalizeUiKey));
    const teamSuggestions = catalog.teams
      .filter((label) => !selectedKeys.has(normalizeUiKey(label)))
      .filter((label) => !teamQuery || normalizeUiKey(label).includes(teamQuery))
      .slice(0, 6);
    const playerSuggestions = catalog.players
      .filter((label) => !selectedKeys.has(normalizeUiKey(label)))
      .filter((label) => !playerQuery || normalizeUiKey(label).includes(playerQuery))
      .slice(0, 6);
    const teamNode = $('#favorite-team-suggestions');
    if (teamNode) teamNode.innerHTML = teamSuggestions.length
      ? teamSuggestions.map((label) => favoriteButtonHtml('teams', label)).join('')
      : '<span class="match-sub">Tape un nom présent dans les données.</span>';
    const playerNode = $('#favorite-player-suggestions');
    if (playerNode) playerNode.innerHTML = playerSuggestions.length
      ? playerSuggestions.map((label) => favoriteButtonHtml('players', label)).join('')
      : '<span class="match-sub">Tape un joueur détecté dans les buteurs.</span>';
    const selected = $('#favorite-selected-list');
    if (selected) {
      const chips = [
        ...(favorites.teams || []).map((label) => favoriteButtonHtml('teams', label, true)),
        ...(favorites.players || []).map((label) => favoriteButtonHtml('players', label, true))
      ];
      selected.innerHTML = chips.length ? chips.join('') : 'Aucun favori enregistré.';
    }
  }

  function addFavorite(kind, value) {
    const favorites = loadFavorites();
    const key = kind === 'players' ? 'players' : 'teams';
    const label = String(value || '').trim();
    if (!label) return;
    favorites[key] = uniqueCleanLabels([...(favorites[key] || []), label]);
    saveFavorites(favorites);
    renderFavoritePreferences();
    renderFavoritePicksSection();
    setSideStatus('Favori ajouté', 'ok');
  }

  function removeFavorite(kind, value) {
    const favorites = loadFavorites();
    const key = kind === 'players' ? 'players' : 'teams';
    const target = normalizeUiKey(value);
    favorites[key] = (favorites[key] || []).filter((label) => normalizeUiKey(label) !== target);
    saveFavorites(favorites);
    renderFavoritePreferences();
    renderFavoritePicksSection();
    setSideStatus('Favori retiré', 'ok');
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
    const theme = $('#pref-theme');
    if (theme) theme.value = prefs.theme || 'dark';
    const coachEnabled = $('#pref-coach-enabled');
    if (coachEnabled) coachEnabled.checked = prefs.coachEnabled !== false;
    const antiTiltStrict = $('#pref-anti-tilt-strict');
    if (antiTiltStrict) antiTiltStrict.checked = prefs.antiTiltStrict !== false;
    const prematchAlerts = $('#pref-prematch-alerts');
    if (prematchAlerts) prematchAlerts.checked = prefs.prematchAlertsEnabled !== false;
    const topPickAlerts = $('#pref-top-pick-alerts');
    if (topPickAlerts) topPickAlerts.checked = prefs.topPickAlertsEnabled !== false;
    const notifyQuietOff = $('#pref-notify-quiet-off');
    if (notifyQuietOff) notifyQuietOff.checked = prefs.notifyQuietHoursOff === true;
    const coachReduceStake = $('#pref-coach-reduce-stake');
    if (coachReduceStake) coachReduceStake.checked = prefs.coachReduceStake !== false;
    const bugReportPrompt = $('#pref-bug-report-prompt');
    if (bugReportPrompt) bugReportPrompt.checked = prefs.bugReportPrompt !== false;
    const tradingDesk = $('#pref-trading-desk');
    if (tradingDesk) tradingDesk.checked = Boolean(prefs.tradingDesk);
    const dashboardCustom = $('#pref-dashboard-custom');
    if (dashboardCustom) dashboardCustom.checked = Boolean(prefs.dashboardCustom);
    const language = $('#pref-language');
    if (language) language.value = prefs.language || localStorage.getItem(I18N_LANGUAGE_KEY) || 'fr';
    const liveNews = $('#pref-live-news-watcher');
    if (liveNews) liveNews.checked = Boolean(prefs.liveNewsWatcher);
    const twitterWatcher = $('#pref-twitter-watcher');
    if (twitterWatcher) twitterWatcher.checked = Boolean(prefs.twitterWatcher);
    const autoTrackingEnabled = $('#pref-auto-tracking-enabled');
    if (autoTrackingEnabled) autoTrackingEnabled.checked = Boolean(prefs.autoTrackingEnabled);
    const autoTrackingConfirmed = $('#pref-auto-tracking-confirmed');
    if (autoTrackingConfirmed) autoTrackingConfirmed.checked = Boolean(prefs.autoTrackingConfirmed);
    const autoTrackingDryRun = $('#pref-auto-tracking-dry-run');
    if (autoTrackingDryRun) autoTrackingDryRun.checked = prefs.autoTrackingDryRun !== false;
    const autoTrackingLevel = $('#pref-auto-tracking-level');
    if (autoTrackingLevel) autoTrackingLevel.value = prefs.autoTrackingLevel || 'top';
    const expertMode = $('#pref-expert-mode');
    if (expertMode) expertMode.checked = Boolean(prefs.expertMode);
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
    const allocationStrategy = $('#pref-allocation-strategy');
    if (allocationStrategy) allocationStrategy.value = prefs.allocationStrategy || DEFAULT_PREFERENCES.allocationStrategy;
    const sportsGrid = $('#pref-sports');
    if (sportsGrid) {
      const active = new Set((prefs.sports || []).map((item) => String(item).toLowerCase()));
      sportsGrid.innerHTML = SPORTS_PREFS.map((sport) => checkboxHtml('pref-sport', sport, sport, active.has(sport))).join('');
    }
    const marketsGrid = $('#pref-markets');
    if (marketsGrid) {
      const active = new Set((prefs.markets || []).map(normalizeUiKey));
      marketsGrid.innerHTML = SIMPLE_MARKET_PREFS.map((market) => checkboxHtml('pref-market', market.key, market.label, active.has(normalizeUiKey(market.key)))).join('');
    }
    const advancedMarketsGrid = $('#pref-advanced-markets');
    if (advancedMarketsGrid) {
      const active = new Set((prefs.markets || []).map(normalizeUiKey));
      advancedMarketsGrid.innerHTML = ADVANCED_MARKET_PREFS.map((market) => checkboxHtml('pref-market', market.key, market.label, active.has(normalizeUiKey(market.key)))).join('');
    }
    const fields = {
      'pref-edge-min': prefs.edgeMin,
      'pref-odd-min': prefs.oddMin,
      'pref-odd-max': prefs.oddMax,
      'pref-confidence-min': prefs.confidenceMin,
      'pref-alert-edge': prefs.alertEdge,
      'pref-alert-window': prefs.alertWindowHours,
      'pref-evening-hour': prefs.eveningBriefHour,
      'pref-flat-unit': prefs.flatUnitPct,
      'pref-max-stake': prefs.maxStakePct,
      'pref-daily-budget': prefs.dailyBudgetPct,
      'pref-stop-loss': prefs.stopLossPct,
      'pref-take-profit': prefs.takeProfitPct,
      'pref-daily-bet-limit': prefs.dailyBetLimit,
      'pref-daily-stake-cap': prefs.dailyStakeCapPct,
      'pref-loss-streak-confirm': prefs.coachLossStreakConfirm,
      'pref-auto-tracking-edge': prefs.autoTrackingEdgeMin,
      'pref-auto-tracking-odd-min': prefs.autoTrackingOddMin,
      'pref-auto-tracking-odd-max': prefs.autoTrackingOddMax,
      'pref-auto-tracking-budget': prefs.autoTrackingDailyBudget,
      'pref-auto-tracking-limit': prefs.autoTrackingDailyLimit,
      'pref-auto-tracking-start': prefs.autoTrackingStartHour,
      'pref-auto-tracking-end': prefs.autoTrackingEndHour
    };
    Object.entries(fields).forEach(([id, value]) => {
      const node = $(`#${id}`);
      if (node) node.value = String(value ?? '');
    });
    const webhookType = $('#pref-webhook-type');
    if (webhookType) webhookType.value = prefs.webhookType || 'generic';
    const webhookUrl = $('#pref-webhook-url');
    if (webhookUrl) webhookUrl.value = prefs.webhookUrl || '';
    const versionLabel = $('#app-version-label');
    if (versionLabel) versionLabel.textContent = `Paris Sportif Desktop v${state.appInfo?.version || '1.0.0'}`;
    applyTheme(prefs);
    renderUpdateStatus();
    renderShortcutSettings();
    renderBugReportList();
    renderProfileImportPreview();
    renderOnboarding();
    renderLearningAudit();
    renderActiveModelAdjustments();
    renderBankrollAccounting();
    renderDailyBudgetSummary();
    renderFavoritePreferences();
    renderAutoTrackingAudit();
    renderWinamaxImportPreview();
    renderTradingDesk();
    applyI18n(prefs.language || 'fr');
    applyExpertMode();
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
    if (status.installOnQuit) {
      node.textContent = `Version ${status.latestVersion || ''} préparée · installation au prochain redémarrage.`;
      return;
    }
    node.textContent = status.available
      ? `Version ${status.latestVersion || ''} disponible${status.assetName ? ` · ${status.assetName}` : ''}.`
      : `À jour (${status.currentVersion || 'version locale'}) · vérifié ${status.checkedAt ? formatDateTime(status.checkedAt) : '-'}.`;
  }

  function closeUpdateModal() {
    $('#update-modal')?.classList.add('hidden');
  }

  function showUpdateModal(status = state.updateStatus) {
    const modal = $('#update-modal');
    if (!modal || !status?.available) return;
    const title = $('#update-modal-title');
    const subtitle = $('#update-modal-subtitle');
    const notes = $('#update-modal-notes');
    if (title) title.textContent = `Mise à jour v${status.latestVersion || ''} disponible`;
    if (subtitle) subtitle.textContent = status.releaseName || 'Tu peux l’installer au prochain redémarrage.';
    if (notes) {
      notes.classList.add('update-note-box');
      notes.textContent = status.releaseNotes || 'Aucune note de version fournie.';
    }
    modal.classList.remove('hidden');
  }

  async function prepareUpdateInstall() {
    try {
      const response = await fetchJson('/api/update/install-next-restart', { method: 'POST' });
      state.updateStatus = response.status || state.updateStatus;
      writeStorageJson(UPDATE_STATUS_KEY, state.updateStatus);
      renderUpdateStatus();
      closeUpdateModal();
      setSideStatus(state.updateStatus?.installOnQuit ? 'Update préparée au redémarrage' : 'Aucune update disponible', state.updateStatus?.installOnQuit ? 'ok' : 'warn');
      return state.updateStatus;
    } catch (error) {
      setSideStatus(`Préparation update impossible : ${error.message}`, 'warn');
      return null;
    }
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
        showUpdateModal(state.updateStatus);
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
    const expertMode = Boolean($('#pref-expert-mode')?.checked);
    const simpleSelected = selectedMarkets.filter(isSimpleMarketPreference);
    const expertSelected = expertMode ? selectedMarkets.filter((key) => !isSimpleMarketPreference(key)) : [];
    return {
      bankroll: Math.max(10, Number($('#pref-bankroll')?.value || 50) || 50),
      level: $('#pref-level')?.value || 'intermediate',
      theme: $('#pref-theme')?.value || DEFAULT_PREFERENCES.theme,
      sports: selectedSports.length ? selectedSports : SPORTS_PREFS,
      markets: [...(simpleSelected.length ? simpleSelected : DEFAULT_PREFERENCES.markets), ...expertSelected],
      edgeMin: Math.max(0, Number($('#pref-edge-min')?.value || 0) || 0),
      oddMin: Math.max(1, Number($('#pref-odd-min')?.value || 1) || 1),
      oddMax: Math.max(1, Number($('#pref-odd-max')?.value || 50) || 50),
      confidenceMin: Math.max(0, Number($('#pref-confidence-min')?.value || 0) || 0),
      alertEdge: Math.max(0, Number($('#pref-alert-edge')?.value || 10) || 10),
      alertWindowHours: Math.max(1, Number($('#pref-alert-window')?.value || 2) || 2),
      eveningBriefHour: Math.max(18, Math.min(23, Number($('#pref-evening-hour')?.value || DEFAULT_PREFERENCES.eveningBriefHour) || DEFAULT_PREFERENCES.eveningBriefHour)),
      stakeMode: $('#pref-stake-mode')?.value || DEFAULT_PREFERENCES.stakeMode,
      allocationStrategy: $('#pref-allocation-strategy')?.value || DEFAULT_PREFERENCES.allocationStrategy,
      dailyBudgetPct: Math.max(0.5, Math.min(20, Number($('#pref-daily-budget')?.value || DEFAULT_PREFERENCES.dailyBudgetPct) || DEFAULT_PREFERENCES.dailyBudgetPct)),
      flatUnitPct: Math.max(0.1, Number($('#pref-flat-unit')?.value || DEFAULT_PREFERENCES.flatUnitPct) || DEFAULT_PREFERENCES.flatUnitPct),
      maxStakePct: Math.max(0.1, Number($('#pref-max-stake')?.value || DEFAULT_PREFERENCES.maxStakePct) || DEFAULT_PREFERENCES.maxStakePct),
      stopLossPct: Math.max(0, Number($('#pref-stop-loss')?.value || DEFAULT_PREFERENCES.stopLossPct) || DEFAULT_PREFERENCES.stopLossPct),
      takeProfitPct: Math.max(0, Number($('#pref-take-profit')?.value || DEFAULT_PREFERENCES.takeProfitPct) || DEFAULT_PREFERENCES.takeProfitPct),
      webhookType: $('#pref-webhook-type')?.value || DEFAULT_PREFERENCES.webhookType,
      webhookUrl: ($('#pref-webhook-url')?.value || '').trim(),
      coachEnabled: $('#pref-coach-enabled')?.checked !== false,
      antiTiltStrict: $('#pref-anti-tilt-strict')?.checked !== false,
      prematchAlertsEnabled: $('#pref-prematch-alerts')?.checked !== false,
      topPickAlertsEnabled: $('#pref-top-pick-alerts')?.checked !== false,
      notifyQuietHoursOff: Boolean($('#pref-notify-quiet-off')?.checked),
      coachReduceStake: $('#pref-coach-reduce-stake')?.checked !== false,
      bugReportPrompt: $('#pref-bug-report-prompt')?.checked !== false,
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
      expertMode,
      autoUpdateEnabled: $('#pref-auto-update-enabled')?.checked !== false,
      updateChannel: $('#pref-update-channel')?.value || DEFAULT_PREFERENCES.updateChannel,
      tradingDesk: Boolean($('#pref-trading-desk')?.checked),
      autoTrackingEnabled: Boolean($('#pref-auto-tracking-enabled')?.checked),
      autoTrackingConfirmed: Boolean($('#pref-auto-tracking-confirmed')?.checked),
      autoTrackingDryRun: $('#pref-auto-tracking-dry-run')?.checked !== false,
      autoTrackingLevel: $('#pref-auto-tracking-level')?.value || DEFAULT_PREFERENCES.autoTrackingLevel,
      autoTrackingEdgeMin: Math.max(0, Math.min(25, Number($('#pref-auto-tracking-edge')?.value || DEFAULT_PREFERENCES.autoTrackingEdgeMin) || DEFAULT_PREFERENCES.autoTrackingEdgeMin)),
      autoTrackingOddMin: Math.max(1, Number($('#pref-auto-tracking-odd-min')?.value || DEFAULT_PREFERENCES.autoTrackingOddMin) || DEFAULT_PREFERENCES.autoTrackingOddMin),
      autoTrackingOddMax: Math.max(1, Number($('#pref-auto-tracking-odd-max')?.value || DEFAULT_PREFERENCES.autoTrackingOddMax) || DEFAULT_PREFERENCES.autoTrackingOddMax),
      autoTrackingDailyBudget: Math.max(0, Number($('#pref-auto-tracking-budget')?.value || DEFAULT_PREFERENCES.autoTrackingDailyBudget) || DEFAULT_PREFERENCES.autoTrackingDailyBudget),
      autoTrackingDailyLimit: Math.max(1, Number($('#pref-auto-tracking-limit')?.value || DEFAULT_PREFERENCES.autoTrackingDailyLimit) || DEFAULT_PREFERENCES.autoTrackingDailyLimit),
      autoTrackingStartHour: Math.max(0, Math.min(23, Number($('#pref-auto-tracking-start')?.value || DEFAULT_PREFERENCES.autoTrackingStartHour) || DEFAULT_PREFERENCES.autoTrackingStartHour)),
      autoTrackingEndHour: Math.max(0, Math.min(24, Number($('#pref-auto-tracking-end')?.value || DEFAULT_PREFERENCES.autoTrackingEndHour) || DEFAULT_PREFERENCES.autoTrackingEndHour)),
      autoTrackingSports: selectedSports.length ? selectedSports : SPORTS_PREFS,
      autoTrackingMarkets: [...(simpleSelected.length ? simpleSelected : DEFAULT_PREFERENCES.markets), ...expertSelected],
      liveNewsWatcher: Boolean($('#pref-live-news-watcher')?.checked),
      twitterWatcher: Boolean($('#pref-twitter-watcher')?.checked),
      dashboardCustom: Boolean($('#pref-dashboard-custom')?.checked),
      dashboardPreset: loadPreferences().dashboardPreset || DEFAULT_PREFERENCES.dashboardPreset,
      language: $('#pref-language')?.value || DEFAULT_PREFERENCES.language,
      strict: Boolean($('#pref-strict')?.checked)
    };
  }

  function applyPreferences(preferences) {
    const prefs = savePreferences(preferences);
    const bankrollInput = $('#bankroll-input');
    if (bankrollInput) bankrollInput.value = String(prefs.bankroll || 50);
    localStorage.setItem('userBankroll', String(prefs.bankroll || 50));
    applyTheme(prefs);
    renderPreferences();
    applyExpertMode();
    renderPicks();
    renderTradingDesk();
    maybeNotifyPickChanges();
    computePicks().catch(() => {});
    setSideStatus('Préférences enregistrées', 'ok');
  }

  function renderOnboarding() {
    const card = $('#onboarding-card');
    if (!card) return;
    const seen = localStorage.getItem(USER_PREFS_SEEN_KEY) === '1';
    // Sprint 36 terrain : ne jamais bloquer le cockpit avec un modal.
    // Le parieur doit voir les picks immédiatement ; l'aide reste disponible
    // via "?" et le tour démo.
    if (!seen) {
      card.classList.remove('onboarding-modal-mode');
      card.classList.add('hidden');
    } else {
      card.classList.remove('onboarding-modal-mode');
      card.classList.add('hidden');
    }
    if (!seen) {
      const bankroll = $('#onboarding-bankroll');
      if (bankroll && !bankroll.value) bankroll.value = String(loadPreferences().bankroll || 50);
    }
  }

  function settledUserBets() {
    return loadUserBets().filter((bet) => ['won', 'lost', 'void'].includes(String(bet.status || '')));
  }

  function bucketUserBets(rows, keyFn) {
    const map = new Map();
    rows.forEach((bet) => {
      const key = keyFn(bet) || 'Non classé';
      const bucket = map.get(key) || { key, count: 0, won: 0, lost: 0, stake: 0, pnl: 0 };
      const stake = Number(bet.stake || 0) || 0;
      bucket.count += 1;
      bucket.stake += stake;
      bucket.pnl += Number(bet.pnl || 0) || 0;
      if (bet.status === 'won') bucket.won += 1;
      if (bet.status === 'lost') bucket.lost += 1;
      map.set(key, bucket);
    });
    return Array.from(map.values()).map((bucket) => ({
      ...bucket,
      winRate: (bucket.won + bucket.lost) ? bucket.won / (bucket.won + bucket.lost) : 0,
      roi: bucket.stake > 0 ? bucket.pnl / bucket.stake : 0
    }));
  }

  function timeBucketForBet(bet) {
    const ts = Date.parse(bet.start || bet.kickoff || bet.placedAt || '');
    if (!Number.isFinite(ts)) return 'Heure inconnue';
    const hour = new Date(ts).getHours();
    if (hour < 6) return '00h-06h';
    if (hour < 12) return '06h-12h';
    if (hour < 18) return '12h-18h';
    return '18h-24h';
  }

  function stakeBucketForBet(bet) {
    const stake = Number(bet.stake || 0);
    if (stake >= 3) return '3u+';
    if (stake >= 2) return '2u';
    return '1u';
  }

  function renderPatternGrid(node, title, rows) {
    if (!node) return;
    const sorted = rows.slice().sort((a, b) => b.roi - a.roi || b.count - a.count).slice(0, 8);
    node.innerHTML = sorted.length ? sorted.map((row) => {
      const cls = row.roi > 0.08 ? 'warm' : row.roi < -0.08 ? 'cold' : 'sample';
      return `
        <article class="backtest-card ${cls}">
          <span>${escapeHtml(title)}</span>
          <strong>${escapeHtml(row.key)}</strong>
          <p>${escapeHtml(`${formatCount(row.count)} paris · WR ${formatPct(row.winRate, 0)} · ROI ${formatPct(row.roi, 0)}`)}</p>
          <small>${escapeHtml(formatMoney(row.pnl))} net · mise ${escapeHtml(formatMoney(row.stake))}</small>
        </article>
      `;
    }).join('') : '<div class="empty">Pas encore assez de paris suivis réglés.</div>';
  }

  function renderPersonalPatterns() {
    const root = $('#personal-patterns-grid');
    const insights = $('#personal-patterns-insights');
    if (!root && !insights) return;
    const rows = settledUserBets();
    const weekday = bucketUserBets(rows, (bet) => {
      const ts = Date.parse(bet.start || bet.kickoff || bet.placedAt || bet.settledAt || '');
      return Number.isFinite(ts) ? new Date(ts).toLocaleDateString('fr-FR', { weekday: 'long' }) : 'Jour inconnu';
    });
    const hour = bucketUserBets(rows, timeBucketForBet);
    const sport = bucketUserBets(rows, (bet) => bet.sport || 'Sport inconnu');
    const league = bucketUserBets(rows, (bet) => bet.league || 'Ligue inconnue');
    const market = bucketUserBets(rows, (bet) => bet.market || 'Marché inconnu');
    const stake = bucketUserBets(rows, stakeBucketForBet);
    const tier = bucketUserBets(rows, (bet) => bet.tier || bet.calibrationLevel || 'Tier inconnu');
    const segment = bucketUserBets(rows, (bet) => `${bet.sport || 'Sport'} · ${bet.league || 'Ligue'} · ${bet.market || 'Marché'}`);
    if (root) {
      root.innerHTML = `
        <div class="pattern-row" id="pattern-weekday"></div>
        <div class="pattern-row" id="pattern-hour"></div>
        <div class="pattern-row" id="pattern-sport"></div>
        <div class="pattern-row" id="pattern-league"></div>
        <div class="pattern-row" id="pattern-market"></div>
        <div class="pattern-row" id="pattern-stake"></div>
        <div class="pattern-row" id="pattern-tier"></div>
        <div class="pattern-row" id="pattern-segment"></div>
      `;
      renderPatternGrid($('#pattern-weekday'), 'Jour', weekday);
      renderPatternGrid($('#pattern-hour'), 'Horaire', hour);
      renderPatternGrid($('#pattern-sport'), 'Sport', sport);
      renderPatternGrid($('#pattern-league'), 'Ligue', league);
      renderPatternGrid($('#pattern-market'), 'Marché', market);
      renderPatternGrid($('#pattern-stake'), 'Mise', stake);
      renderPatternGrid($('#pattern-tier'), 'Tier', tier);
      renderPatternGrid($('#pattern-segment'), 'Segment', segment.slice().sort((a, b) => Math.abs(b.roi) - Math.abs(a.roi)).slice(0, 10));
    }
    if (insights) {
      const all = [...weekday, ...hour, ...sport, ...league, ...market, ...stake, ...tier, ...segment].filter((row) => row.count >= 5);
      const best = all.slice().sort((a, b) => b.roi - a.roi)[0];
      const worst = all.slice().sort((a, b) => a.roi - b.roi)[0];
      insights.innerHTML = all.length ? `
        <article class="morning-card">
          <span>Insight principal</span>
          <strong>${escapeHtml(best ? `${best.key} ${formatPct(best.roi, 0)}` : 'Sample court')}</strong>
          <p>${escapeHtml(worst ? `À surveiller : ${worst.key} ${formatPct(worst.roi, 0)} sur ${formatCount(worst.count)} paris.` : 'Pas encore de segment faible robuste.')}</p>
        </article>
      ` : '<div class="empty">Les insights avancés s’activent à partir de 5 paris par bucket.</div>';
    }
  }

  function renderActivityHeatmap365() {
    const node = $('#activity-heatmap-365');
    if (!node) return;
    const rows = settledUserBets();
    const byDay = new Map();
    rows.forEach((bet) => {
      const ts = Date.parse(bet.settledAt || bet.day || bet.placedAt || '');
      if (!Number.isFinite(ts)) return;
      const key = new Date(ts).toISOString().slice(0, 10);
      const bucket = byDay.get(key) || { count: 0, pnl: 0 };
      bucket.count += 1;
      bucket.pnl += Number(bet.pnl || 0) || 0;
      byDay.set(key, bucket);
    });
    const today = new Date();
    const cells = Array.from({ length: 365 }, (_, index) => {
      const date = new Date(today.getTime() - (364 - index) * 24 * 60 * 60 * 1000);
      const key = date.toISOString().slice(0, 10);
      const bucket = byDay.get(key) || { count: 0, pnl: 0 };
      const tone = bucket.count === 0 ? 'empty' : bucket.pnl > 0 ? 'win' : bucket.pnl < 0 ? 'loss' : 'flat';
      return `<span class="activity-cell ${tone}" title="${escapeHtml(`${key} · ${formatCount(bucket.count)} pari(s) · ${formatMoney(bucket.pnl)}`)}"></span>`;
    });
    node.innerHTML = `<div class="activity-heatmap">${cells.join('')}</div>`;
  }

  function paperSimulationRows() {
    const historyDays = Array.isArray(state.history?.byDay)
      ? state.history.byDay
      : Array.isArray(state.history?.by_day)
        ? state.history.by_day
        : [];
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const rows = [];
    historyDays.forEach((day) => {
      const picks = Array.isArray(day.picks) ? day.picks : [];
      picks.forEach((pick) => {
        const kickoff = Date.parse(pick.kickoff_utc || pick.start || day.date || '');
        if (!Number.isFinite(kickoff) || kickoff < cutoff) return;
        const result = String(pick.result || '').toLowerCase();
        if (!['won', 'lost', 'void'].includes(result)) return;
        const edge = Math.min(0.20, Math.max(0, Number(pick.edge || 0) || 0));
        const odd = Number(pick.odd_book || pick.odd || 0);
        const confidence = Number(pick.trust_score || pick.score_quality || 0) / 100;
        const segmentOk = Number(pick.score_quality || 0) >= 45 || confidence >= 0.55;
        const criticalMissing = Array.isArray(pick.context_critical_missing) ? pick.context_critical_missing : [];
        if (edge < 0.03 || odd < 1.30 || odd > 6 || confidence < 0.55 || !segmentOk || criticalMissing.length) return;
        rows.push({
          ...pick,
          kickoff,
          result,
          edge,
          odd,
          confidence,
          title: `${pick.home || 'Home'} - ${pick.away || 'Away'}`,
          market: formatMarketName(pick.market_key || ''),
          label: pick.label || pick.selection || '',
          priorityScore: Math.round((edge / 0.20) * 40 + confidence * 35 + Math.min(25, Number(pick.score_quality || 0) / 4))
        });
      });
    });
    return rows.sort((a, b) => b.priorityScore - a.priorityScore || a.kickoff - b.kickoff);
  }

  function paperSimulationReport() {
    const prefs = loadPreferences();
    const config = allocationConfig(prefs);
    const bankroll = Math.max(1, getBankroll());
    const dailyBudget = bankroll * Math.max(0.1, Number(config.budgetPct || 5)) / 100;
    const rows = paperSimulationRows();
    const byDay = new Map();
    rows.forEach((row) => {
      const day = parisDayKey(new Date(row.kickoff));
      const bucket = byDay.get(day) || [];
      bucket.push(row);
      byDay.set(day, bucket);
    });
    const settled = [];
    byDay.forEach((dayRows) => {
      const selected = dayRows
        .sort((a, b) => b.priorityScore - a.priorityScore || b.edge - a.edge)
        .slice(0, config.maxPicks);
      const shares = selected.map((_, index) => ALLOCATION_SHARES[index] || 2);
      const totalShare = shares.reduce((sum, value) => sum + value, 0) || 1;
      selected.forEach((row, index) => {
        const stake = Number((dailyBudget * (shares[index] / totalShare)).toFixed(2));
        const pnl = row.result === 'won' ? stake * (row.odd - 1) : row.result === 'lost' ? -stake : 0;
        settled.push({ ...row, stake, pnl });
      });
    });
    const stake = settled.reduce((sum, row) => sum + row.stake, 0);
    const pnl = settled.reduce((sum, row) => sum + row.pnl, 0);
    const won = settled.filter((row) => row.result === 'won').length;
    const lost = settled.filter((row) => row.result === 'lost').length;
    const realRows = loadUserBets().filter((bet) => Date.parse(bet.createdAt || bet.placedAt || '') >= cutoffDateDays(30));
    const realStake = realRows.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);
    const realPnl = realRows.reduce((sum, bet) => sum + Number(bet.pnl || 0), 0);
    const bySport = bucketUserBets(settled.map((row) => ({
      ...row,
      status: row.result,
      sport: row.sport,
      league: row.league,
      market: row.market,
      stake: row.stake,
      pnl: row.pnl
    })), (row) => row.sport || 'Sport inconnu').sort((a, b) => b.roi - a.roi);
    return {
      rows,
      settled,
      won,
      lost,
      stake,
      pnl,
      roi: stake > 0 ? pnl / stake : 0,
      realRows,
      realStake,
      realPnl,
      realRoi: realStake > 0 ? realPnl / realStake : 0,
      bySport
    };
  }

  function cutoffDateDays(days) {
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }

  function renderPaperSimulation() {
    const grid = $('#paper-simulation-grid');
    const detail = $('#paper-simulation-detail');
    if (!grid) return;
    const report = paperSimulationReport();
    const comparison = report.pnl - report.realPnl;
    grid.innerHTML = [
      ['Picks fiables simulés', formatCount(report.settled.length), `${formatCount(report.won)} gagnés · ${formatCount(report.lost)} perdus`],
      ['Simulation 30j ROI', formatPct(report.roi, 1), `${formatMoney(report.pnl)} sur ${formatMoney(report.stake)} misés`],
      ['Paris suivis réels', formatCount(report.realRows.length), `${formatMoney(report.realPnl)} · ROI ${formatPct(report.realRoi, 1)}`],
      ['Écart opportunité', formatMoney(comparison), comparison > 0 ? 'Tu as sous-utilisé des picks fiables.' : 'Tes choix réels font mieux que le plan auto.'],
      ['Conseil', report.settled.length > report.realRows.length ? 'Suivre plus de top picks' : 'Discipline OK', `Stratégie ${allocationConfig().label.toLowerCase()}.`]
    ].map(([label, value, text]) => `
      <article class="quality-report-card ${Number(String(value).replace(',', '.')) < 0 ? 'quality-danger' : 'quality-ok'}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <p>${escapeHtml(text)}</p>
      </article>
    `).join('');
    if (!detail) return;
    detail.innerHTML = report.bySport.length ? report.bySport.slice(0, 6).map((row) => `
      <article class="backtest-card ${row.roi >= 0 ? 'warm' : 'cold'}">
        <span>${escapeHtml(row.key)}</span>
        <strong>${escapeHtml(formatPct(row.roi, 0))}</strong>
        <p>${escapeHtml(`${formatCount(row.count)} picks simulés · ${formatMoney(row.pnl)} P&L`)}</p>
        <small>${escapeHtml(`WR ${formatPct(row.winRate, 0)} · stake ${formatMoney(row.stake)}`)}</small>
      </article>
    `).join('') : '<div class="empty">Pas encore assez de picks réglés dans les 30 derniers jours pour simuler.</div>';
  }

  function modelVsUserReport() {
    const report = paperSimulationReport();
    const cutoff = cutoffDateDays(30);
    const realRows = loadUserBets().filter((bet) => Date.parse(bet.createdAt || bet.placedAt || '') >= cutoff);
    const settled = realRows.filter((bet) => ['won', 'lost', 'void'].includes(String(bet.status || '')));
    const stake = settled.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);
    const pnl = settled.reduce((sum, bet) => sum + Number(bet.pnl || 0), 0);
    const won = settled.filter((bet) => bet.status === 'won').length;
    const lost = settled.filter((bet) => bet.status === 'lost').length;
    const unsafe = realRows.filter((bet) => bet.safeStatus && bet.safeStatus !== 'reliable');
    const modelCount = report.settled.length;
    const utilization = modelCount ? realRows.length / modelCount : null;
    const missedPnl = report.pnl - pnl;
    return {
      model: report,
      realRows,
      settled,
      won,
      lost,
      stake,
      pnl,
      roi: stake > 0 ? pnl / stake : 0,
      utilization,
      unsafe,
      missedPnl
    };
  }

  function renderModelVsUser() {
    const grid = $('#model-vs-user-grid');
    if (!grid) return;
    const report = modelVsUserReport();
    const utilizationText = report.utilization == null ? 'Sample modèle absent' : `${formatPct(report.utilization, 0)} des picks fiables suivis`;
    const advice = report.utilization != null && report.utilization < 0.30 && report.missedPnl > 0
      ? `Tu pourrais tester un suivi plus systématique des picks fiables : simulation +${formatMoney(report.missedPnl).replace('-', '')}.`
      : report.unsafe.length
        ? 'Tu as suivi des picks hors zone fiable : privilégie les badges ✓ Fiable.'
        : 'Ton suivi reste cohérent avec les garde-fous.';
    // Sprint 65 — Highlight gagnant : compare ROI user vs ROI modèle (si sample suffisant)
    const userRoi = Number(report.roi || 0);
    const modelRoi = Number(report.model?.roi || 0);
    const userSettled = (report.settled || []).length;
    const modelSettled = (report.model?.settled || []).length;
    let battleTone = 'neutral';
    let battleLabel = '';
    if (userSettled >= 5 && modelSettled >= 5) {
      if (userRoi - modelRoi > 0.05) {
        battleTone = 'user-wins';
        battleLabel = `🏆 Tu bats le modèle de ${formatPct(userRoi - modelRoi, 0)}`;
      } else if (modelRoi - userRoi > 0.05) {
        battleTone = 'model-wins';
        battleLabel = `🤖 Le modèle te bat de ${formatPct(modelRoi - userRoi, 0)} — suis-le plus`;
      } else {
        battleTone = 'tie';
        battleLabel = '⚖️ Score serré — tu suis bien le modèle';
      }
    }
    const battleBanner = battleLabel ? `
      <article class="model-battle-banner battle-${escapeHtml(battleTone)}">
        <strong>${escapeHtml(battleLabel)}</strong>
        <span>User ROI ${formatPct(userRoi, 1)} · Modèle ROI ${formatPct(modelRoi, 1)} · sample ${formatCount(userSettled)}/${formatCount(modelSettled)}</span>
      </article>` : '';
    grid.innerHTML = battleBanner + [
      ['Si tu avais suivi le modèle', formatMoney(report.model.pnl), `${formatCount(report.model.settled.length)} picks simulés · ROI ${formatPct(report.model.roi, 1)}`],
      ['Toi sur 30 jours', formatMoney(report.pnl), `${formatCount(report.settled.length)} réglés · ROI ${formatPct(report.roi, 1)} · ${formatCount(report.won)}W/${formatCount(report.lost)}L`],
      ['Utilisation', utilizationText, report.realRows.length ? `${formatCount(report.realRows.length)} pari(s) suivis au total.` : 'Aucun pari réel suivi sur 30 jours.'],
      ['Conseil', report.missedPnl > 0 ? 'Plus régulier' : 'Discipline OK', advice]
    ].map(([label, value, detail]) => `
      <article class="quality-report-card ${label === 'Conseil' && report.unsafe.length ? 'quality-watch' : 'quality-ok'}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <p>${escapeHtml(detail)}</p>
      </article>
    `).join('');
  }

  function analyticsRows() {
    const real = settledUserBets()
      .filter((bet) => ['won', 'lost'].includes(String(bet.status || '')))
      .map((bet) => ({ ...bet, analyticsSource: 'real' }));
    if (real.length >= 3) return real;
    return paperSimulationReport().settled.slice(0, 180).map((row) => ({
      id: `paper-${row.kickoff}-${row.title}-${row.market}`,
      title: row.title,
      sport: row.sport || 'Sport',
      league: row.league || 'Ligue',
      market: row.market || row.market_key || 'Marché',
      label: row.label || row.selection || '',
      odd: row.odd,
      edge: row.edge,
      stake: row.stake,
      pnl: row.pnl,
      status: row.result,
      start: new Date(row.kickoff).toISOString(),
      placedAt: new Date(row.kickoff).toISOString(),
      settledAt: new Date(row.kickoff).toISOString(),
      tier: row.priorityScore >= 70 ? 'TOP' : row.priorityScore >= 55 ? 'Fiable' : 'Surveiller',
      analyticsSource: 'simulation'
    }));
  }

  function analyticsRoiClass(roi) {
    return roi > 0.10 ? 'warm' : roi < -0.08 ? 'cold' : 'sample';
  }

  function analyticsDayPart(bet) {
    const ts = Date.parse(bet.start || bet.kickoff || bet.placedAt || bet.settledAt || '');
    if (!Number.isFinite(ts)) return 'Inconnu';
    const hour = new Date(ts).getHours();
    if (hour < 6) return 'Nuit';
    if (hour < 12) return 'Matin';
    if (hour < 14) return 'Midi';
    if (hour < 18) return 'Après-midi';
    return 'Soir';
  }

  function analyticsMonthPart(bet) {
    const ts = Date.parse(bet.start || bet.kickoff || bet.placedAt || bet.settledAt || '');
    if (!Number.isFinite(ts)) return 'Mois inconnu';
    const day = new Date(ts).getDate();
    if (day <= 10) return 'Début de mois';
    if (day <= 20) return 'Milieu de mois';
    return 'Fin de mois';
  }

  function analyticsOddBucket(bet) {
    const odd = Number(bet.odd || 0);
    if (odd < 1.5) return 'Cote < 1.5';
    if (odd < 2.5) return 'Cote 1.5-2.5';
    if (odd < 4) return 'Cote 2.5-4';
    return 'Cote > 4';
  }

  function analyticsEdgeBucket(bet) {
    const edge = Number(bet.edge || 0);
    if (edge < 0.03) return 'Avantage 1-3%';
    if (edge < 0.05) return 'Avantage 3-5%';
    if (edge < 0.10) return 'Avantage 5-10%';
    return 'Avantage 10%+';
  }

  function analyticsStakeBucket(rows, bet) {
    const stakes = rows.map((row) => Number(row.stake || 0)).filter((value) => value > 0).sort((a, b) => a - b);
    const stake = Number(bet.stake || 0);
    if (!stakes.length || stake <= 0) return 'Mise inconnue';
    const p33 = stakes[Math.floor(stakes.length * 0.33)] || stakes[0];
    const p66 = stakes[Math.floor(stakes.length * 0.66)] || stakes[stakes.length - 1];
    if (stake <= p33) return 'Petite mise';
    if (stake <= p66) return 'Mise moyenne';
    return 'Grosse mise';
  }

  function analyticsStreakBucket(bet) {
    if (!bet.previousStatus) return 'Premier pari';
    if (bet.previousStatus === 'won') return 'Après victoire';
    if (bet.previousStatus === 'lost') return 'Après défaite';
    return 'Après void';
  }

  function analyticsTier(bet) {
    const tier = String(bet.tier || bet.safeStatus || bet.calibrationLevel || '').toLowerCase();
    if (tier.includes('top') || tier.includes('sure')) return 'TOP';
    if (tier.includes('fiable') || tier.includes('reliable') || tier.includes('safe')) return 'Fiable';
    if (tier.includes('watch') || tier.includes('surv')) return 'Surveiller';
    return 'Standard';
  }

  function analyticsBucket(rows, label, keyFn) {
    return bucketUserBets(rows, keyFn)
      .map((row) => ({ ...row, dimension: label }))
      .sort((a, b) => b.roi - a.roi || b.count - a.count);
  }

  function deepAnalyticsReport() {
    const baseRows = analyticsRows().sort((a, b) => Date.parse(a.placedAt || a.start || a.settledAt || '') - Date.parse(b.placedAt || b.start || b.settledAt || ''));
    const rows = baseRows.map((row, index) => ({ ...row, previousStatus: baseRows[index - 1]?.status || '' }));
    const dimensions = {
      sport: analyticsBucket(rows, 'Sport', (bet) => bet.sport || 'Sport inconnu'),
      league: analyticsBucket(rows, 'Ligue', (bet) => bet.league || 'Ligue inconnue'),
      market: analyticsBucket(rows, 'Marché', (bet) => simpleMarketLabelForRow(bet) || bet.market || 'Marché inconnu'),
      weekday: analyticsBucket(rows, 'Jour', (bet) => {
        const ts = Date.parse(bet.start || bet.kickoff || bet.placedAt || bet.settledAt || '');
        return Number.isFinite(ts) ? new Date(ts).toLocaleDateString('fr-FR', { weekday: 'long' }) : 'Jour inconnu';
      }),
      dayPart: analyticsBucket(rows, 'Horaire', analyticsDayPart),
      stake: analyticsBucket(rows, 'Mise', (bet) => analyticsStakeBucket(rows, bet)),
      month: analyticsBucket(rows, 'Mois', analyticsMonthPart),
      streak: analyticsBucket(rows, 'Streak', analyticsStreakBucket),
      tier: analyticsBucket(rows, 'Tier', analyticsTier),
      odd: analyticsBucket(rows, 'Cote', analyticsOddBucket),
      edge: analyticsBucket(rows, 'Avantage', analyticsEdgeBucket)
    };
    const allBuckets = Object.values(dimensions).flat().filter((row) => row.count >= 3);
    const best = allBuckets.slice().sort((a, b) => b.roi - a.roi || b.pnl - a.pnl).slice(0, 6);
    const worst = allBuckets.slice().sort((a, b) => a.roi - b.roi || a.pnl - b.pnl).slice(0, 6);
    const stake = rows.reduce((sum, row) => sum + Number(row.stake || 0), 0);
    const pnl = rows.reduce((sum, row) => sum + Number(row.pnl || 0), 0);
    return {
      rows,
      dimensions,
      best,
      worst,
      stake,
      pnl,
      roi: stake > 0 ? pnl / stake : 0,
      source: rows[0]?.analyticsSource || 'real'
    };
  }

  function renderAnalyticsBarBlock(title, rows) {
    const max = Math.max(...rows.map((row) => Math.abs(row.roi)), 0.01);
    return `
      <div class="analytics-block">
        <h4>${escapeHtml(title)}</h4>
        ${rows.slice(0, 5).map((row) => `
          <div class="analytics-bar-row ${analyticsRoiClass(row.roi)}">
            <strong>${escapeHtml(row.key)}</strong>
            <span class="analytics-bar-track"><span class="analytics-bar-fill" style="--w:${Math.min(100, Math.round(Math.abs(row.roi) / max * 100))}%"></span></span>
            <em>${escapeHtml(`${formatPct(row.roi, 0)} · ${formatCount(row.count)}`)}</em>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderAnalyticsHeatmap(title, xRows, yRows) {
    const combos = [];
    xRows.slice(0, 4).forEach((x) => {
      yRows.slice(0, 4).forEach((y) => {
        combos.push({
          key: `${x.key} · ${y.key}`,
          count: Math.min(x.count, y.count),
          roi: (x.roi + y.roi) / 2,
          pnl: (x.pnl + y.pnl) / 2
        });
      });
    });
    return `
      <div class="analytics-block">
        <h4>${escapeHtml(title)}</h4>
        <div class="heatmap-grid">
          ${combos.slice(0, 12).map((row) => `
            <div class="heatmap-cell ${analyticsRoiClass(row.roi)}" title="${escapeHtml(`${row.key} · ROI ${formatPct(row.roi, 1)}`)}">
              <strong>${escapeHtml(row.key)}</strong>
              <span>${escapeHtml(`${formatPct(row.roi, 0)} · ${formatCount(row.count)} paris`)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function deepAnalyticsInsights(report) {
    const best = report.best[0];
    const worst = report.worst[0];
    const weekday = report.dimensions.weekday?.[0];
    const afterLoss = report.dimensions.streak?.find((row) => row.key === 'Après défaite');
    const afterWin = report.dimensions.streak?.find((row) => row.key === 'Après victoire');
    const rows = [];
    if (best) rows.push(`Ta meilleure zone actuelle : ${best.key} (${formatPct(best.roi, 0)} ROI sur ${formatCount(best.count)} paris).`);
    if (worst) rows.push(`Point faible : ${worst.key} (${formatPct(worst.roi, 0)}). À réduire tant que ça reste froid.`);
    if (afterLoss && afterWin) {
      rows.push(`Après une défaite : ${formatPct(afterLoss.roi, 0)} vs après une victoire : ${formatPct(afterWin.roi, 0)}.`);
    }
    if (weekday) rows.push(`${weekday.key} ressort comme journée intéressante (${formatPct(weekday.roi, 0)} ROI).`);
    return rows.slice(0, 5);
  }

  function currentPickFilterSnapshot() {
    return {
      sport: $('#pick-sport-filter')?.value || 'all',
      league: $('#pick-league-filter')?.value || 'all',
      market: $('#pick-market-filter')?.value || 'all',
      sort: $('#pick-sort')?.value || 'priority',
      search: ($('#pick-search')?.value || '').trim(),
      edgeMin: Number($('#pick-edge-min')?.value || 0) || 0,
      oddMin: Number($('#pick-odd-min')?.value || 1) || 1
    };
  }

  function applyPickFilterSnapshot(filters = {}) {
    const set = (id, value) => {
      const node = $(`#${id}`);
      if (node && value != null) node.value = String(value);
    };
    set('pick-sport-filter', filters.sport || 'all');
    set('pick-league-filter', filters.league || 'all');
    set('pick-market-filter', filters.market || 'all');
    set('pick-sort', filters.sort || 'priority');
    set('pick-search', filters.search || '');
    set('pick-edge-min', filters.edgeMin || '');
    set('pick-odd-min', Number(filters.oddMin || 1) > 1 ? filters.oddMin : '');
    renderPicks();
  }

  function saveCurrentStrategy() {
    const filters = currentPickFilterSnapshot();
    const defaultName = [filters.sport !== 'all' ? filters.sport : '', filters.market !== 'all' ? filters.market : '', filters.edgeMin ? `edge ${filters.edgeMin}%` : ''].filter(Boolean).join(' · ') || 'Stratégie Winamax';
    let name = defaultName;
    if (typeof window.prompt === 'function') {
      try {
        const answer = window.prompt('Nom de la stratégie', defaultName);
        if (answer === null) return;
        name = String(answer || defaultName).trim() || defaultName;
      } catch {
        name = defaultName;
      }
    }
    if (!name) return;
    const strategy = {
      id: `strategy-${Date.now()}`,
      name,
      description: `Filtres sauvegardés le ${formatDateTime(new Date())}`,
      filters,
      createdAt: new Date().toISOString()
    };
    saveSavedStrategies([strategy, ...loadSavedStrategies()].slice(0, 60));
    renderSavedStrategySelect();
    renderSavedStrategies();
    setSideStatus('Stratégie sauvegardée', 'ok');
  }

  function strategyMatchesBet(strategy, bet) {
    const f = strategy?.filters || {};
    if (f.sport && f.sport !== 'all' && compactUiKey(bet.sport) !== compactUiKey(f.sport)) return false;
    if (f.league && f.league !== 'all' && compactUiKey(bet.league) !== compactUiKey(f.league)) return false;
    if (f.market && f.market !== 'all' && compactUiKey(simpleMarketLabelForRow(bet) || bet.market) !== compactUiKey(f.market)) return false;
    if (f.search && !compactUiKey(`${bet.title || ''} ${bet.label || ''}`).includes(compactUiKey(f.search))) return false;
    if (Number(f.edgeMin || 0) > 0 && Number(bet.edge || 0) * 100 < Number(f.edgeMin)) return false;
    if (Number(f.oddMin || 1) > 1 && Number(bet.odd || 0) < Number(f.oddMin)) return false;
    return true;
  }

  function renderSavedStrategySelect() {
    const select = $('#saved-strategy-select');
    if (!select) return;
    const current = select.value;
    const rows = loadSavedStrategies();
    select.innerHTML = '<option value="">Mes stratégies</option>' + rows.map((row) => `<option value="${escapeHtml(row.id)}">${escapeHtml(row.name)}</option>`).join('');
    select.value = rows.some((row) => row.id === current) ? current : '';
  }

  function renderSavedStrategies() {
    const grid = $('#saved-strategies-grid');
    if (!grid) return;
    const strategies = loadSavedStrategies();
    if (!strategies.length) {
      const suggestion = suggestImplicitStrategy();
      grid.innerHTML = suggestion ? `<div class="empty">${escapeHtml(suggestion.label)}</div>` : '<div class="empty">Aucune stratégie sauvegardée. Sauve une sélection depuis la vue Picks.</div>';
      return;
    }
    const bets = loadUserBets().filter((bet) => ['won', 'lost', 'void'].includes(bet.status));
    grid.innerHTML = strategies.slice(0, 8).map((strategy) => {
      const rows = bets.filter((bet) => strategyMatchesBet(strategy, bet));
      const stake = rows.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);
      const pnl = rows.reduce((sum, bet) => sum + Number(bet.pnl || 0), 0);
      const won = rows.filter((bet) => bet.status === 'won').length;
      const roi = stake > 0 ? pnl / stake : null;
      return `
        <article class="metric">
          <span>${escapeHtml(strategy.name)}</span>
          <strong>${escapeHtml(roi == null ? 'Sample en attente' : formatPct(roi, 1))}</strong>
          <small>${escapeHtml(`${formatCount(rows.length)} pari(s) · WR ${rows.length ? formatPct(won / rows.length, 0) : '-'} · P&L ${formatMoney(pnl)}`)}</small>
        </article>
      `;
    }).join('');
  }

  function suggestImplicitStrategy() {
    const report = deepAnalyticsReport();
    const best = report.best?.find((row) => row.count >= 5 && row.roi > 0.15);
    if (!best) return null;
    return {
      id: `suggested-${compactUiKey(best.dimension)}-${compactUiKey(best.key)}`,
      label: `Tu sembles performer sur ${best.key} (${formatPct(best.roi, 0)} ROI). Sauve cette stratégie si tu veux la rejouer en 1 clic.`
    };
  }

  function renderDeepAnalytics() {
    const summary = $('#deep-analytics-summary');
    const bars = $('#deep-analytics-bars');
    const heatmaps = $('#deep-analytics-heatmaps');
    const insights = $('#deep-analytics-insights');
    if (!summary && !bars && !heatmaps && !insights) return;
    const report = deepAnalyticsReport();
    const sourceText = report.source === 'simulation' ? 'Simulation modèle utilisée tant que tes paris réglés sont trop peu nombreux.' : 'Basé sur tes paris suivis réglés.';
    if (summary) {
      summary.innerHTML = [
        ['Sample', formatCount(report.rows.length), sourceText],
        ['P&L net', formatMoney(report.pnl), `ROI ${formatPct(report.roi, 1)} · mise ${formatMoney(report.stake)}`],
        ['Meilleure zone', report.best[0]?.key || 'En attente', report.best[0] ? `${report.best[0].dimension} · ${formatPct(report.best[0].roi, 0)}` : 'Sample insuffisant'],
        ['Zone froide', report.worst[0]?.key || 'En attente', report.worst[0] ? `${report.worst[0].dimension} · ${formatPct(report.worst[0].roi, 0)}` : 'Sample insuffisant']
      ].map(([label, value, detail]) => `
        <article class="quality-report-card quality-ok">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
          <p>${escapeHtml(detail)}</p>
        </article>
      `).join('');
    }
    if (bars) {
      bars.innerHTML = [
        renderAnalyticsBarBlock('Top 5 dimensions', report.best),
        renderAnalyticsBarBlock('Bottom 5 dimensions', report.worst)
      ].join('');
    }
    if (heatmaps) {
      heatmaps.innerHTML = [
        renderAnalyticsHeatmap('Sport × jour', report.dimensions.sport || [], report.dimensions.weekday || []),
        renderAnalyticsHeatmap('Ligue × horaire', report.dimensions.league || [], report.dimensions.dayPart || [])
      ].join('');
    }
    if (insights) {
      const insightRows = deepAnalyticsInsights(report);
      const recommendation = report.best[0] || null;
      insights.innerHTML = insightRows.length ? `
        ${insightRows.map((text, index) => `
          <article class="morning-card">
            <span>Insight ${index + 1}</span>
            <strong>${escapeHtml(text.split(':')[0])}</strong>
            <p>${escapeHtml(text)}</p>
          </article>
        `).join('')}
        ${recommendation ? `
          <article class="morning-card">
            <span>Recommandation</span>
            <strong>Appliquer un filtre prudent</strong>
            <p>${escapeHtml(`Favoriser ${recommendation.key} tant que le ROI reste positif.`)}</p>
            <button class="ghost-btn" type="button" data-apply-analytics-pref="${escapeHtml(recommendation.dimension)}" data-analytics-value="${escapeHtml(recommendation.key)}">Appliquer ces filtres</button>
          </article>
        ` : ''}
      ` : '<div class="empty">Les insights s’activent avec plus de paris réglés.</div>';
    }
  }

  function deepSearchIndex() {
    const map = new Map();
    const add = (type, label, payload = {}) => {
      const clean = String(label || '').trim();
      if (!clean || clean.length < 2) return;
      const key = `${type}:${normalizeUiKey(clean)}`;
      const existing = map.get(key) || { type, key, label: clean, count: 0, rows: [], payload: {} };
      existing.count += 1;
      existing.rows.push(payload.row || payload);
      existing.payload = { ...existing.payload, ...payload };
      map.set(key, existing);
    };
    const pools = [...(state.matches || []), ...(state.allPicks || []), ...(state.scorers || [])];
    pools.forEach((row) => {
      rowTeamNames(row).forEach((team) => add('team', team, { row, sport: row.sport, league: row.league }));
      const player = rowPlayerName(row);
      if (player) add('player', player, { row, sport: row.sport, league: row.league });
      if (row.league) add('league', row.league, { row, sport: row.sport, league: row.league });
    });
    (state.history?.recentSettled || []).forEach((pick) => {
      add('team', pick.home, { row: pick, sport: pick.sport, league: pick.league });
      add('team', pick.away, { row: pick, sport: pick.sport, league: pick.league });
      if (pick.league) add('league', pick.league, { row: pick, sport: pick.sport, league: pick.league });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }

  function searchEntityRows(entity) {
    const key = normalizeUiKey(entity?.label || '');
    if (!key) return [];
    const source = [...(state.matches || []), ...(state.allPicks || []), ...(state.scorers || [])];
    return source.filter((row) => {
      if (entity.type === 'team') return rowTeamNames(row).some((team) => normalizeUiKey(team) === key);
      if (entity.type === 'player') return normalizeUiKey(rowPlayerName(row)) === key || pickSearchText(row).includes(key);
      if (entity.type === 'league') return normalizeUiKey(row.league) === key;
      return pickSearchText(row).includes(key);
    });
  }

  function searchEntityHistory(entity) {
    const key = normalizeUiKey(entity?.label || '');
    const rows = analyticsRows();
    return rows.filter((bet) => {
      const haystack = [
        bet.title,
        bet.league,
        bet.sport,
        bet.market,
        bet.label
      ].filter(Boolean).join(' ').toLowerCase();
      return normalizeUiKey(haystack).includes(key);
    });
  }

  function entityPerformanceRows(rows) {
    const bucket = bucketUserBets(rows, (bet) => 'Historique')[0] || { count: 0, winRate: 0, roi: 0, pnl: 0, stake: 0 };
    return [
      ['Sample', formatCount(bucket.count || rows.length), `${formatCount(rows.length)} ligne(s) historiques ou simulées.`],
      ['WR', formatPct(bucket.winRate || 0, 0), 'Win rate sur les paris réglés disponibles.'],
      ['ROI', formatPct(bucket.roi || 0, 1), `${formatMoney(bucket.pnl || 0)} net · ${formatMoney(bucket.stake || 0)} misés.`]
    ];
  }

  function renderDeepSearchOptions(index = deepSearchIndex()) {
    ['compare-left', 'compare-right'].forEach((id, sideIndex) => {
      const select = $(`#${id}`);
      if (!select) return;
      const current = select.value;
      const rows = index.slice(0, 80);
      select.innerHTML = rows.map((row, idx) => `<option value="${escapeHtml(row.key)}"${idx === sideIndex ? ' selected' : ''}>${escapeHtml(`${row.label} · ${row.type}`)}</option>`).join('');
      if (rows.some((row) => row.key === current)) select.value = current;
    });
  }

  function renderSearchEntityDetail(entity) {
    const detail = $('#deep-search-detail');
    if (!detail || !entity) return;
    const rows = searchEntityRows(entity);
    const historyRows = searchEntityHistory(entity);
    const upcoming = rows
      .filter((row) => Date.parse(row.start || row.match?.date || '') >= Date.now() - 60 * 60 * 1000)
      .sort((a, b) => Date.parse(a.start || a.match?.date || '') - Date.parse(b.start || b.match?.date || ''))
      .slice(0, 6);
    const formRows = rows.map((row) => row.match || row).filter(Boolean).slice(0, 10);
    const form = formRows.map((row) => {
      const side = (row.competitors || []).find((team) => normalizeUiKey(team.name || team.short) === normalizeUiKey(entity.label));
      return side?.winner === true ? 'W' : side?.winner === false ? 'L' : 'D';
    }).filter(Boolean).slice(0, 10).join('') || 'Forme non disponible';
    const injuries = rows
      .flatMap((row) => (row.match?.competitors || row.competitors || []).flatMap((team) => team.injuries || []))
      .filter((injury) => injury?.name)
      .slice(0, 5);
    const marketBuckets = bucketUserBets(historyRows, (bet) => simpleMarketLabelForRow(bet) || bet.market || 'Marché').sort((a, b) => b.roi - a.roi).slice(0, 4);
    detail.innerHTML = `
      <div class="section-head compact">
        <div>
          <h3>${escapeHtml(entity.label)}</h3>
          <p>${escapeHtml(entity.type === 'team' ? 'Page équipe' : entity.type === 'player' ? 'Page joueur' : 'Page ligue')} · ${escapeHtml(entity.payload?.sport || '')} ${entity.payload?.league ? `· ${escapeHtml(entity.payload.league)}` : ''}</p>
        </div>
      </div>
      <div class="search-stat-grid">
        ${entityPerformanceRows(historyRows).map(([label, value, text]) => `
          <article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(text)}</p></article>
        `).join('')}
        <article><span>Forme récente</span><strong>${escapeHtml(form)}</strong><p>Lecture W/D/L locale quand disponible.</p></article>
      </div>
      <div class="deep-analytics-layout">
        <div class="deep-analytics-panel">
          <h4>Prochains matchs Winamax</h4>
          ${upcoming.length ? upcoming.map((row) => `
            <button class="search-card" type="button" data-match-id="${escapeHtml(row.id || row.match?.id || '')}">
              <strong>${escapeHtml(row.title || row.match?.name || '-')}</strong>
              <span>${escapeHtml(row.start ? countdownLabel(row.start) : formatDateTime(row.match?.date))}</span>
              <p>${escapeHtml(userBetLabel(row) || 'Match surveillé')}</p>
            </button>
          `).join('') : '<div class="empty compact-empty">Aucun prochain match bookable trouvé.</div>'}
        </div>
        <div class="deep-analytics-panel">
          <h4>Marchés rentables</h4>
          ${marketBuckets.length ? marketBuckets.map((row) => `
            <div class="analytics-bar-row ${analyticsRoiClass(row.roi)}">
              <strong>${escapeHtml(row.key)}</strong>
              <span>${escapeHtml(`${formatPct(row.roi, 0)} ROI`)}</span>
              <em>${escapeHtml(`${formatCount(row.count)} paris`)}</em>
            </div>
          `).join('') : '<div class="empty compact-empty">Sample historique insuffisant.</div>'}
          <h4>Infos utiles</h4>
          ${injuries.length ? injuries.map((injury) => `<p class="match-sub">${escapeHtml(injury.name)} · ${escapeHtml(injury.status || injury.pos || '')}</p>`).join('') : '<p class="match-sub">Aucune blessure locale majeure remontée.</p>'}
        </div>
      </div>
    `;
  }

  function renderDeepSearch() {
    const results = $('#deep-search-results');
    if (!results) return;
    const index = deepSearchIndex();
    renderDeepSearchOptions(index);
    const query = normalizeUiKey($('#deep-search-input')?.value || '');
    const rows = (query ? index.filter((item) => normalizeUiKey(`${item.label} ${item.type}`).includes(query)) : index)
      .slice(0, 12);
    if (!state.deepSearchSelection && rows[0]) state.deepSearchSelection = rows[0].key;
    results.innerHTML = rows.length ? rows.map((item) => `
      <button class="search-card${state.deepSearchSelection === item.key ? ' active' : ''}" type="button" data-search-entity="${escapeHtml(item.key)}">
        <h4>${escapeHtml(item.label)}</h4>
        <span>${escapeHtml(item.type === 'team' ? 'Équipe' : item.type === 'player' ? 'Joueur' : 'Ligue')}</span>
        <p>${escapeHtml(`${formatCount(item.count)} apparition(s) · ${item.payload?.sport || 'multi-sport'}`)}</p>
      </button>
    `).join('') : '<div class="empty">Aucun résultat local. Essaie une équipe, un joueur ou une ligue.</div>';
    const selected = index.find((item) => item.key === state.deepSearchSelection) || rows[0] || null;
    if (selected) renderSearchEntityDetail(selected);
  }

  function renderSearchComparison() {
    const index = deepSearchIndex();
    const left = index.find((row) => row.key === $('#compare-left')?.value);
    const right = index.find((row) => row.key === $('#compare-right')?.value);
    const detail = $('#deep-search-detail');
    if (!detail || !left || !right) return;
    const card = (entity) => {
      const historyRows = searchEntityHistory(entity);
      const perf = entityPerformanceRows(historyRows);
      const upcoming = searchEntityRows(entity).filter((row) => Date.parse(row.start || row.match?.date || '') >= Date.now()).length;
      return `
        <article class="deep-analytics-panel">
          <h3>${escapeHtml(entity.label)}</h3>
          <p>${escapeHtml(entity.type)} · ${formatCount(upcoming)} match(s) à venir.</p>
          <div class="search-stat-grid">
            ${perf.map(([label, value, text]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(text)}</p></article>`).join('')}
          </div>
        </article>
      `;
    };
    detail.innerHTML = `<div class="deep-analytics-layout">${card(left)}${card(right)}</div>`;
  }

  function regressionWarningText() {
    const audit = trackedLearningAudit();
    const cold = (audit.warnings || []).find((row) => row.count >= 5 && row.losses >= 5);
    if (!cold) return '';
    return `Prudence : ${cold.label} reste froid sur ${formatCount(cold.losses)} défaites.`;
  }

  function strongTrendBriefText(rows = sortedPriorityRows()) {
    const hot = (rows || []).map((row) => ({ row, trend: trendForRow(row) })).find((item) => item.trend?.tone === 'hot');
    if (hot) return `Tendance forte : ${userBetLabel(hot.row)} sur ${hot.row.title}. ${hot.trend.reason}.`;
    const cold = (rows || []).map((row) => ({ row, trend: trendForRow(row) })).find((item) => item.trend?.tone === 'cold');
    if (cold) return `Prudence : ${cold.row.title} est sur un segment froid. ${cold.trend.reason}.`;
    return '';
  }

  function buildDailySuggestion(rows = sortedPriorityRows()) {
    const day = parisDayKey();
    const allReadyRows = (Array.isArray(rows) ? rows : []).filter((row) => pickHasCoreData(row) && canDisplayStake(row));
    const readyRows = rollingReadyRows(allReadyRows);
    const readyToday = readyRows.filter(isTodayPick);
    const watchToday = rolling24hRows(todayWatchRows(rows), (row) => !canDisplayStake(row));
    const cacheSignature = `${readyRows.length}:${readyToday.length}:${watchToday.length}:${readyRows[0] ? userBetKey(readyRows[0]) : ''}`;
    const cached = readStorageJson(DAILY_SUGGESTION_KEY, null);
    if (cached?.day === day && cached?.signature === cacheSignature && Date.now() - Number(cached.cachedAt || 0) < 60 * 60 * 1000) return cached;
    const ultimate = aiSelectedUltimate(readyRows) || ultimateBetCandidate(readyRows) || readyRows[0] || null;
    const modelVsUser = modelVsUserReport();
    const regression = regressionWarningText();
    const trendText = strongTrendBriefText(readyRows);
    const todayPick = readyToday[0] || null;
    const text = trendText || regression || (todayPick
      ? `Commence par ${userBetLabel(todayPick)} sur ${todayPick.title} : cote ${formatOdd(todayPick.odd)}, mise ${visibleStakeText(todayPick)}.`
      : ultimate
        ? `Sur les prochaines 24h, commence par ${userBetLabel(ultimate)} sur ${ultimate.title} : cote ${formatOdd(ultimate.odd)}, mise ${visibleStakeText(ultimate)}.`
        : watchToday.length
          ? `${formatCount(watchToday.length)} opportunité(s) aujourd’hui restent à surveiller, mais aucune mise n’est validée.`
          : 'Pas de pick ultime aujourd’hui : pas de pari forcé.');
    const follow = modelVsUser.utilization != null && modelVsUser.utilization < 0.30 && modelVsUser.missedPnl > 0
      ? ` Modèle 30j ${formatMoney(modelVsUser.model.pnl)} vs toi ${formatMoney(modelVsUser.pnl)}.`
      : '';
    const suggestion = {
      day,
      cachedAt: Date.now(),
      signature: cacheSignature,
      text: `${text}${follow}`.slice(0, 220),
      pickKey: ultimate ? userBetKey(ultimate) : ''
    };
    writeStorageJson(DAILY_SUGGESTION_KEY, suggestion);
    return suggestion;
  }

  function renderDailySuggestion(rows = sortedPriorityRows()) {
    const node = $('#daily-suggestion-card');
    if (!node) return;
    const suggestion = buildDailySuggestion(rows);
    const dismissed = localStorage.getItem(DAILY_SUGGESTION_DISMISS_KEY) === suggestion.day;
    node.classList.toggle('hidden', dismissed);
    const text = node.querySelector('span');
    if (text) text.textContent = suggestion.text || 'Aucune suggestion disponible.';
  }

  function buildEveningBrief() {
    const stats = userBetStats();
    const tomorrow = parisDayKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const tomorrowRows = sortedPriorityRows(state.picks)
      .filter((row) => pickDayKey(row) === tomorrow)
      .slice(0, 8);
    const todayRows = loadUserBets().filter((bet) => String(bet.day || bet.createdAt || bet.placedAt || bet.settledAt || '').slice(0, 10) === parisDayKey());
    const todaySettled = todayRows.filter((bet) => ['won', 'lost', 'void'].includes(String(bet.status || '')));
    const best = todaySettled
      .sort((a, b) => Number(b.pnl || 0) - Number(a.pnl || 0))[0] || null;
    const lesson = stats.pnlToday < 0
      ? 'Reste léger demain, laisse le coach filtrer et évite de doubler les mises.'
      : stats.pnlToday > 0
        ? 'Bonne journée : protège le gain, ne force pas les derniers matchs.'
        : 'Journée neutre : garde le rythme, top picks seulement.';
    const brief = {
      id: `evening-${parisDayKey()}`,
      day: parisDayKey(),
      generatedAt: new Date().toISOString(),
      stats: {
        bets: todayRows.length,
        pnl: stats.pnlToday,
        won: todaySettled.filter((bet) => bet.status === 'won').length,
        lost: todaySettled.filter((bet) => bet.status === 'lost').length
      },
      tomorrowCount: tomorrowRows.length,
      tomorrowNight: tomorrowRows.filter((row) => temporalBucketForPick(row) === 'tonight' || temporalBucketForPick(row) === 'tomorrow_am').length,
      topTomorrow: tomorrowRows[0] || null,
      best,
      lesson
    };
    const stored = readStorageJson(EVENING_BRIEF_KEY, []);
    writeStorageJson(EVENING_BRIEF_KEY, [brief, ...(Array.isArray(stored) ? stored : []).filter((row) => row.id !== brief.id)].slice(0, 30));
    return brief;
  }

  function renderEveningBriefModal(brief = buildEveningBrief()) {
    const modal = $('#evening-brief-modal');
    const content = $('#evening-brief-content');
    if (!modal || !content) return;
    const subtitle = $('#evening-brief-subtitle');
    if (subtitle) subtitle.textContent = `${brief.day} · ${formatCount(brief.stats.bets)} pari(s) suivis aujourd’hui.`;
    content.innerHTML = [
      ['Journée', formatMoney(brief.stats.pnl), `${formatCount(brief.stats.bets)} paris · ${formatCount(brief.stats.won)}W / ${formatCount(brief.stats.lost)}L`],
      ['Meilleur pick', brief.best ? formatMoney(brief.best.pnl) : '-', brief.best ? `${brief.best.title} · ${brief.best.label}` : 'Aucun pari réglé aujourd’hui'],
      ['Demain', `${formatCount(brief.tomorrowCount)} fiables`, `${formatCount(brief.tomorrowNight)} nocturne(s) · ${brief.topTomorrow ? userBetLabel(brief.topTomorrow) : 'à confirmer après refresh'}`],
      ['Leçon', brief.stats.pnl < 0 ? 'Ralentir' : 'Continuer propre', brief.lesson]
    ].map(([label, value, detail]) => `
      <article class="glossary-card">
        <strong>${escapeHtml(label)}</strong>
        <p><b>${escapeHtml(value)}</b><br>${escapeHtml(detail)}</p>
      </article>
    `).join('');
    modal.classList.remove('hidden');
  }

  function maybeShowEveningBrief({ force = false } = {}) {
    const prefs = loadPreferences();
    const now = new Date();
    const key = parisDayKey(now);
    const hour = Number(prefs.eveningBriefHour || 22);
    if (!force && now.getHours() < hour) return;
    if (!force && !todayTrackedBets().length) return;
    if (!force && localStorage.getItem(EVENING_BRIEF_SEEN_KEY) === key) return;
    const brief = buildEveningBrief();
    localStorage.setItem(EVENING_BRIEF_SEEN_KEY, key);
    if (!force) notifyUser('Brief du soir', `Ta journée : ${formatCount(brief.stats.bets)} paris, ${formatMoney(brief.stats.pnl)}.`, null);
    renderEveningBriefModal(brief);
  }

  function closeEveningBriefModal() {
    $('#evening-brief-modal')?.classList.add('hidden');
  }

  // Sprint 63 — tour démo enrichi : 7 étapes avec emoji et tips contextuels.
  const DEMO_TOUR_STEPS = [
    {
      title: '👋 Bienvenue dans ton cockpit',
      text: 'Le logiciel scanne tous les matchs Winamax du jour et te montre uniquement ceux sur lesquels miser. Aucune donnée ne sort de ta machine — tout reste local.',
      emoji: '👋'
    },
    {
      title: '🎯 Voici ton bet ultime',
      text: 'Le meilleur pari simple est en haut du tableau. Tu dois pouvoir lire PARI, COTE et MISE sans chercher. La cote affichée est celle vérifiée sur Winamax.',
      emoji: '🎯'
    },
    {
      title: '💸 Mise sur ton premier pick',
      text: 'En mode démo, le bouton "Je mise" ajoute un pari virtuel séparé de ton historique réel. Tu peux tester sans toucher à ta vraie bankroll.',
      emoji: '💸'
    },
    {
      title: '📖 Lis la fiche enrichie',
      text: 'Clique une carte pour voir : le "Pourquoi miser" avec bullets visuelles, les compositions probables, joueurs clés, tactique, H2H et news pré-match.',
      emoji: '📖'
    },
    {
      title: '📊 Regarde ton P&L',
      text: 'Bilan affiche ta bankroll, le résultat des paris suivis et la comparaison avec les recommandations du modèle. Le 30j te montre la tendance.',
      emoji: '📊'
    },
    {
      title: '📚 Relis ton historique',
      text: 'Tu peux filtrer, ajouter des notes privées, exporter en CSV et apprendre des paris perdus. Les patterns gagnants apparaissent automatiquement.',
      emoji: '📚'
    },
    {
      title: '⚙️ Personnalise tes seuils',
      text: 'Dans Réglages : bankroll, niveau (Débutant/Expert), seuils edge/cote/confiance, notifs nuit on/off, thème clair/sombre. Tout est local et privé.',
      emoji: '⚙️'
    }
  ];

  function renderDemoTour() {
    const modal = $('#demo-tour-modal');
    const content = $('#demo-tour-content');
    if (!modal || !content) return;
    const step = Math.max(0, Math.min(Number(state.demoTourStep || 0), DEMO_TOUR_STEPS.length - 1));
    const item = DEMO_TOUR_STEPS[step];
    const title = $('#demo-tour-title');
    const subtitle = $('#demo-tour-subtitle');
    if (title) title.textContent = item.title;
    if (subtitle) subtitle.textContent = `Étape ${formatCount(step + 1)} / ${formatCount(DEMO_TOUR_STEPS.length)} · 3 min de visite guidée`;
    const progressPct = Math.round(((step + 1) / DEMO_TOUR_STEPS.length) * 100);
    const tipText = step === 0
      ? 'Astuce : tu peux relancer ce tour à tout moment depuis Réglages.'
      : step === 2
        ? 'Astuce : le mode démo s\'active automatiquement pendant le tour.'
        : step >= DEMO_TOUR_STEPS.length - 1
          ? 'Bravo, tu connais tout l\'essentiel ! Tu peux refaire un tour si besoin.'
          : 'Tu peux fermer à tout moment.';
    content.innerHTML = `
      <article class="tour-step-card">
        <div class="tour-step-emoji" aria-hidden="true">${escapeHtml(item.emoji || '✨')}</div>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.text)}</p>
        <div class="tour-progress-bar" role="progressbar" aria-valuenow="${progressPct}" aria-valuemin="0" aria-valuemax="100">
          <span style="width: ${progressPct}%"></span>
        </div>
        <span class="match-sub">${escapeHtml(tipText)}</span>
      </article>
    `;
    const next = $('#demo-tour-next');
    if (next) next.textContent = step >= DEMO_TOUR_STEPS.length - 1 ? 'Terminer' : 'Suivant';
    modal.classList.remove('hidden');
  }

  function startDemoTour({ force = false } = {}) {
    const prefs = loadPreferences();
    if (!prefs.demoMode) {
      savePreferences({ ...prefs, demoMode: true });
      renderPreferences();
      renderUserPnl();
      renderPicks();
    }
    state.demoTourStep = 0;
    if (force) localStorage.removeItem(DEMO_TOUR_KEY);
    switchTab('dashboard');
    renderDemoTour();
  }

  function nextDemoTourStep() {
    const step = Number(state.demoTourStep || 0);
    if (step === 1) {
      const first = sortedPriorityRows(state.picks)[0];
      if (first && !loadUserBets().some((bet) => bet.key === userBetKey(first))) {
        trackUserBet(first);
      }
    }
    if (step === 2) {
      const first = sortedPriorityRows(state.picks)[0];
      if (first) openMatchDetail(first.id);
    }
    if (step === 3) {
      closeMatchDetail();
      switchTab('history');
    }
    if (step >= DEMO_TOUR_STEPS.length - 1) {
      localStorage.setItem(DEMO_TOUR_KEY, '1');
      $('#demo-tour-modal')?.classList.add('hidden');
      setSideStatus('Tour démo terminé', 'ok');
      return;
    }
    state.demoTourStep = step + 1;
    renderDemoTour();
  }

  function closeDemoTour() {
    localStorage.setItem(DEMO_TOUR_KEY, '1');
    $('#demo-tour-modal')?.classList.add('hidden');
  }

  // Sprint 78 F3 — Notifications custom via règles user-defined.
  // Stockage : localStorage.parisSportif.customNotifRules = [{ id, name, conditions: { team?, league?, sport?, edgeMin?, confMin?, oddMin?, oddMax? }, active }]
  const CUSTOM_NOTIF_RULES_KEY = 'parisSportif.customNotifRules';

  function loadCustomNotifRules() {
    try {
      const raw = localStorage.getItem(CUSTOM_NOTIF_RULES_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  function saveCustomNotifRules(rules) {
    try {
      localStorage.setItem(CUSTOM_NOTIF_RULES_KEY, JSON.stringify(Array.isArray(rules) ? rules : []));
    } catch { /* noop */ }
  }

  function pickMatchesCustomRule(row, rule) {
    if (!rule || !rule.active) return false;
    const c = rule.conditions || {};
    const sport = String(row?.sport || row?.match?.sport || '').toLowerCase();
    const league = String(row?.league || row?.match?.league_name || '').toLowerCase();
    const home = String(row?.match?.competitors?.[0]?.name || '').toLowerCase();
    const away = String(row?.match?.competitors?.[1]?.name || '').toLowerCase();
    const edge = Number(row?.edge || 0);
    const conf = Number(row?.safeAssessment?.confidence || row?.probability || 0);
    const odd = Number(row?.odd || 0);
    if (c.team) {
      const t = String(c.team).toLowerCase();
      if (!home.includes(t) && !away.includes(t)) return false;
    }
    if (c.league && !league.includes(String(c.league).toLowerCase())) return false;
    if (c.sport && !sport.includes(String(c.sport).toLowerCase())) return false;
    if (c.edgeMin != null && edge < Number(c.edgeMin)) return false;
    if (c.confMin != null && conf < Number(c.confMin)) return false;
    if (c.oddMin != null && odd < Number(c.oddMin)) return false;
    if (c.oddMax != null && odd > Number(c.oddMax)) return false;
    return true;
  }

  function checkCustomNotifs(rows) {
    if (typeof notifyUser !== 'function') return;
    const rules = loadCustomNotifRules().filter((r) => r?.active);
    if (!rules.length) return;
    const seenKey = 'parisSportif.customNotifSeen';
    let seen = new Set();
    try { seen = new Set(JSON.parse(localStorage.getItem(seenKey) || '[]')); } catch { /* noop */ }
    let dirty = false;
    for (const row of (Array.isArray(rows) ? rows : []).slice(0, 100)) {
      for (const rule of rules) {
        if (!pickMatchesCustomRule(row, rule)) continue;
        const sig = `${rule.id}|${row.id || ''}|${row.label || ''}`;
        if (seen.has(sig)) continue;
        seen.add(sig);
        dirty = true;
        try {
          notifyUser(
            `🔔 ${rule.name || 'Alerte personnalisée'}`,
            `${row.title || ''} · ${row.label || ''} @${Number(row.odd || 0).toFixed(2)}`,
            row
          );
        } catch { /* noop */ }
      }
    }
    if (dirty) {
      try { localStorage.setItem(seenKey, JSON.stringify(Array.from(seen).slice(-200))); } catch { /* noop */ }
    }
  }
  try { window.checkCustomNotifs = checkCustomNotifs; } catch { /* noop */ }

  // Sprint 73 F7 — Achievements badges progressifs
  function computeAchievements() {
    const bets = (typeof loadUserBets === 'function') ? loadUserBets() : [];
    const settled = bets.filter((b) => ['won', 'lost', 'void'].includes(String(b.status || '')));
    const tracked = bets.length;
    const won = settled.filter((b) => b.status === 'won').length;
    const totalPnl = settled.reduce((s, b) => s + (Number(b.pnl || 0) || 0), 0);
    const totalStake = settled.reduce((s, b) => s + (Number(b.stake || 0) || 0), 0);
    const roi = totalStake > 0 ? totalPnl / totalStake : 0;
    // Compte streak gagnant max
    const ordered = settled.slice().sort((a, b) =>
      Date.parse(a.settledAt || a.createdAt || 0) - Date.parse(b.settledAt || b.createdAt || 0));
    let curStreak = 0, maxStreak = 0;
    for (const b of ordered) {
      if (b.status === 'won') { curStreak++; if (curStreak > maxStreak) maxStreak = curStreak; }
      else if (b.status === 'lost') curStreak = 0;
    }
    // Jours actifs distincts
    const days = new Set();
    settled.forEach((b) => {
      const day = String(b.day || (b.settledAt || b.createdAt || '').slice(0, 10));
      if (day) days.add(day);
    });
    return [
      { id: 'first-bet', label: 'Premier pari', desc: 'Tracker ton premier pari', icon: '🎯',
        unlocked: tracked >= 1, progress: Math.min(1, tracked) },
      { id: 'ten-bets', label: '10 paris suivis', desc: 'Tracker 10 paris', icon: '📋',
        unlocked: tracked >= 10, progress: Math.min(1, tracked / 10), text: `${tracked}/10` },
      { id: 'fifty-bets', label: '50 paris suivis', desc: 'Tracker 50 paris', icon: '🏆',
        unlocked: tracked >= 50, progress: Math.min(1, tracked / 50), text: `${tracked}/50` },
      { id: 'first-win', label: 'Premier gain', desc: 'Gagner ton premier pari', icon: '✅',
        unlocked: won >= 1, progress: Math.min(1, won) },
      { id: 'streak-3', label: 'Triple gagnant', desc: '3 victoires de suite', icon: '🔥',
        unlocked: maxStreak >= 3, progress: Math.min(1, maxStreak / 3), text: `${maxStreak}/3` },
      { id: 'streak-7', label: 'Hot streak', desc: '7 victoires de suite', icon: '🚀',
        unlocked: maxStreak >= 7, progress: Math.min(1, maxStreak / 7), text: `${maxStreak}/7` },
      { id: 'roi-positif', label: 'ROI positif', desc: 'Atteindre +5% ROI sur 10+ paris settled', icon: '📈',
        unlocked: settled.length >= 10 && roi >= 0.05, progress: settled.length >= 10 ? Math.min(1, Math.max(0, roi / 0.05)) : 0, text: `${(roi * 100).toFixed(1)}%` },
      { id: 'roi-10', label: 'Top sharp', desc: 'Atteindre +10% ROI sur 20+ paris settled', icon: '💎',
        unlocked: settled.length >= 20 && roi >= 0.10, progress: settled.length >= 20 ? Math.min(1, Math.max(0, roi / 0.10)) : 0, text: `${(roi * 100).toFixed(1)}%` },
      { id: 'week-active', label: '7 jours actifs', desc: 'Tracker des paris sur 7 jours distincts', icon: '📅',
        unlocked: days.size >= 7, progress: Math.min(1, days.size / 7), text: `${days.size}/7` },
      { id: 'month-active', label: 'Joueur du mois', desc: '30 jours d\'activité', icon: '🏅',
        unlocked: days.size >= 30, progress: Math.min(1, days.size / 30), text: `${days.size}/30` }
    ];
  }

  function renderAchievementsCard() {
    const node = $('#achievements-card');
    if (!node) return;
    const list = computeAchievements();
    const unlocked = list.filter((a) => a.unlocked);
    const locked = list.filter((a) => !a.unlocked);
    const ratio = `${unlocked.length}/${list.length}`;
    node.innerHTML = `
      <article class="achievements-card">
        <header>
          <h4>🏆 Achievements</h4>
          <span class="achievements-count">${escapeHtml(ratio)}</span>
        </header>
        <ul class="achievements-list">
          ${list.map((a) => `
            <li class="achievement ${a.unlocked ? 'unlocked' : 'locked'}" title="${escapeHtml(a.desc)}">
              <span class="ach-icon">${escapeHtml(a.icon)}</span>
              <div class="ach-meta">
                <strong>${escapeHtml(a.label)}</strong>
                <span class="ach-desc">${escapeHtml(a.desc)}${a.text ? ` · ${escapeHtml(a.text)}` : ''}</span>
                <div class="ach-progress"><div class="ach-progress-fill" style="width: ${Math.round((a.progress || 0) * 100)}%"></div></div>
              </div>
              ${a.unlocked ? '<span class="ach-check">✓</span>' : ''}
            </li>
          `).join('')}
        </ul>
      </article>`;
  }

  // Sprint 72 C10 — Carte Brier modèle : visualise la qualité actuelle de
  // calibration. < 0.20 excellent, < 0.25 bon, < 0.30 moyen, > 0.30 mauvais.
  function renderModelBrierCard() {
    const node = $('#model-brier-card');
    if (!node) return;
    const report = state.backtestReport || (typeof window !== 'undefined' ? window.__backtestReportV2 : null);
    const overall = report?.overall || {};
    const brier = Number(overall.brier);
    const n = Number(overall.n || 0);
    if (!Number.isFinite(brier) || n < 5) {
      node.innerHTML = `
        <article class="brier-card">
          <h4>🎯 Qualité de calibration (Brier)</h4>
          <p class="match-sub">Pas encore assez de paris settled pour calculer un Brier fiable (${formatCount(n)} paris). Le backtest se régénère quotidiennement à 04h UTC.</p>
        </article>`;
      return;
    }
    let tier, tone, advice;
    if (brier < 0.18) { tier = 'Excellent'; tone = 'ok'; advice = "Modèle très bien calibré. Confiance forte sur les picks."; }
    else if (brier < 0.22) { tier = 'Bon'; tone = 'ok'; advice = "Calibration solide. Probas modèle proches de la réalité."; }
    else if (brier < 0.27) { tier = 'Moyen'; tone = 'warn'; advice = "Calibration moyenne. Suivre les seuils Fiable strictement."; }
    else { tier = 'Faible'; tone = 'bad'; advice = "Calibration dégradée. Privilégier 1n2 (mieux calibré) et éviter OU/derivés."; }
    const pct = Math.max(0, Math.min(100, Math.round(brier * 200)));
    node.innerHTML = `
      <article class="brier-card brier-${tone}">
        <header>
          <h4>🎯 Qualité de calibration</h4>
          <span class="brier-tier">${escapeHtml(tier)}</span>
        </header>
        <div class="brier-value">
          <strong>${brier.toFixed(3)}</strong>
          <span>Brier global</span>
        </div>
        <div class="brier-meter">
          <div class="brier-meter-fill" style="width: ${pct}%"></div>
          <span class="brier-meter-marks">0 · 0.25 · 0.50</span>
        </div>
        <p class="brier-advice">${escapeHtml(advice)}</p>
        <small>Sur ${formatCount(n)} paris settled · cible &lt; 0.20</small>
      </article>`;
  }

  // Sprint 65 — Mon mois : stats glissantes 30j de l'utilisateur
  function myMonthStats() {
    const bets = loadUserBets();
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    const prevCutoff = now - 60 * 24 * 60 * 60 * 1000;
    const tsOf = (bet) => Date.parse(bet.settledAt || bet.day || bet.createdAt || '');
    const inLast30 = bets.filter((bet) => {
      const ts = tsOf(bet);
      return Number.isFinite(ts) && ts >= cutoff && ts <= now && ['won', 'lost', 'void'].includes(String(bet.status || ''));
    });
    const prev30 = bets.filter((bet) => {
      const ts = tsOf(bet);
      return Number.isFinite(ts) && ts >= prevCutoff && ts < cutoff && ['won', 'lost', 'void'].includes(String(bet.status || ''));
    });
    const sumPnl = (rows) => rows.reduce((s, b) => s + (Number(b.pnl || 0) || 0), 0);
    const sumStake = (rows) => rows.reduce((s, b) => s + (Number(b.stake || 0) || 0), 0);
    const won = inLast30.filter((b) => b.status === 'won').length;
    const lost = inLast30.filter((b) => b.status === 'lost').length;
    const voided = inLast30.filter((b) => b.status === 'void').length;
    const pnl = sumPnl(inLast30);
    const stake = sumStake(inLast30);
    const prevPnl = sumPnl(prev30);
    const winRate = (won + lost) > 0 ? won / (won + lost) : 0;
    const roi = stake > 0 ? pnl / stake : 0;
    // Best/worst day
    const byDay = new Map();
    inLast30.forEach((bet) => {
      const day = String(bet.day || new Date(tsOf(bet)).toISOString().slice(0, 10));
      const bucket = byDay.get(day) || { day, count: 0, pnl: 0 };
      bucket.count += 1;
      bucket.pnl += Number(bet.pnl || 0) || 0;
      byDay.set(day, bucket);
    });
    const dayArr = Array.from(byDay.values()).sort((a, b) => b.pnl - a.pnl);
    const bestDay = dayArr[0] || null;
    const worstDay = dayArr.length > 1 ? dayArr[dayArr.length - 1] : null;
    // Top sport
    const bySport = new Map();
    inLast30.forEach((bet) => {
      const k = bet.sport || 'Sport';
      const b = bySport.get(k) || { key: k, count: 0, pnl: 0 };
      b.count += 1; b.pnl += Number(bet.pnl || 0) || 0;
      bySport.set(k, b);
    });
    const topSport = Array.from(bySport.values()).sort((a, b) => b.pnl - a.pnl)[0] || null;
    // Cumulative sparkline 30d
    const cumByDay = [];
    const dayKeys = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now - (29 - i) * 24 * 60 * 60 * 1000);
      return d.toISOString().slice(0, 10);
    });
    let cum = 0;
    dayKeys.forEach((key) => {
      const b = byDay.get(key);
      cum += b ? b.pnl : 0;
      cumByDay.push({ day: key, pnl: cum });
    });
    return {
      total: inLast30.length,
      won, lost, void: voided,
      winRate, pnl, stake, roi,
      prevPnl,
      delta: pnl - prevPnl,
      bestDay, worstDay, topSport,
      sparkline: cumByDay.map((d) => d.pnl)
    };
  }

  // Sprint 65 — insights automatiques sur les 30j glissants
  function myMonthInsights() {
    const bets = loadUserBets();
    const now = Date.now();
    const cutoff = now - 30 * 24 * 60 * 60 * 1000;
    const tsOf = (bet) => Date.parse(bet.settledAt || bet.day || bet.createdAt || '');
    const inLast30 = bets.filter((bet) => {
      const ts = tsOf(bet);
      return Number.isFinite(ts) && ts >= cutoff && ts <= now && ['won', 'lost'].includes(String(bet.status || ''));
    });
    if (inLast30.length < 5) {
      return [{ tone: 'info', icon: '🌱', text: `Reviens dans quelques jours : avec ${formatCount(inLast30.length)} pari(s) réglés sur 30j, les insights statistiques arrivent dès 5 paris.` }];
    }
    const insights = [];
    // Insight 1 : Best segment ROI (sport ou marché)
    const groupBy = (rows, keyFn) => {
      const m = new Map();
      rows.forEach((bet) => {
        const k = keyFn(bet) || 'Inconnu';
        const b = m.get(k) || { key: k, count: 0, won: 0, lost: 0, stake: 0, pnl: 0 };
        b.count += 1;
        if (bet.status === 'won') b.won += 1;
        if (bet.status === 'lost') b.lost += 1;
        b.stake += Number(bet.stake || 0) || 0;
        b.pnl += Number(bet.pnl || 0) || 0;
        m.set(k, b);
      });
      return Array.from(m.values()).map((b) => ({ ...b, winRate: (b.won + b.lost) > 0 ? b.won / (b.won + b.lost) : 0, roi: b.stake > 0 ? b.pnl / b.stake : 0 }));
    };
    const bySport = groupBy(inLast30, (b) => b.sport).filter((b) => b.count >= 3);
    const byMarket = groupBy(inLast30, (b) => b.market).filter((b) => b.count >= 3);
    const allSegments = [...bySport.map((b) => ({ ...b, type: 'sport' })), ...byMarket.map((b) => ({ ...b, type: 'marché' }))];
    if (allSegments.length) {
      const best = allSegments.slice().sort((a, b) => b.roi - a.roi)[0];
      if (best && best.roi > 0.1) {
        insights.push({ tone: 'success', icon: '✅', text: `Tu performes bien sur "${best.key}" (${best.type}) : ROI ${formatPct(best.roi, 0)} sur ${formatCount(best.count)} paris.` });
      }
      const worst = allSegments.slice().sort((a, b) => a.roi - b.roi)[0];
      if (worst && worst.roi < -0.1 && worst.count >= 5) {
        insights.push({ tone: 'warn', icon: '⚠️', text: `Tu perds sur "${worst.key}" (${worst.type}) : ROI ${formatPct(worst.roi, 0)} sur ${formatCount(worst.count)} paris. À éviter pendant 7j.` });
      }
    }
    // Insight 2 : Cotes hautes vs basses
    const byOddBucket = groupBy(inLast30, (b) => {
      const odd = Number(b.odd || 0);
      if (odd >= 3) return 'Cote haute (≥3)';
      if (odd >= 2) return 'Cote moyenne (2-3)';
      return 'Cote basse (<2)';
    });
    const bestOdd = byOddBucket.filter((b) => b.count >= 3).sort((a, b) => b.roi - a.roi)[0];
    if (bestOdd && bestOdd.roi > 0.05) {
      insights.push({ tone: 'tip', icon: '🎯', text: `Tu réussis le mieux sur ${bestOdd.key} : ROI ${formatPct(bestOdd.roi, 0)}.` });
    }
    // Insight 3 : Streak
    const sorted = inLast30.slice().sort((a, b) => tsOf(b) - tsOf(a));
    if (sorted.length >= 3) {
      const last3 = sorted.slice(0, 3);
      if (last3.every((b) => b.status === 'won')) {
        insights.push({ tone: 'streak', icon: '🔥', text: '3 victoires de suite ! Reste discipliné, ne sur-mise pas.' });
      } else if (last3.every((b) => b.status === 'lost')) {
        insights.push({ tone: 'warn', icon: '🛑', text: '3 défaites de suite. Le coach recommande de réduire les mises ou faire une pause.' });
      }
    }
    // Insight 4 : Volume
    const dailyAvg = inLast30.length / 30;
    if (dailyAvg > 3) {
      insights.push({ tone: 'warn', icon: '🎰', text: `Tu places en moyenne ${dailyAvg.toFixed(1)} paris/jour. Au-delà de 3, la discipline se perd. Vise 1-3 paris/jour.` });
    } else if (dailyAvg < 0.5 && inLast30.length >= 5) {
      insights.push({ tone: 'info', icon: '📈', text: `Tu places en moyenne ${dailyAvg.toFixed(2)} paris/jour. Tu pourrais miser plus régulièrement si l'edge est là.` });
    }
    if (!insights.length) {
      insights.push({ tone: 'info', icon: '✨', text: 'Tes 30 derniers jours sont stables : aucun pattern fort détecté. Continue ta routine.' });
    }
    return insights.slice(0, 4);
  }

  function renderMyMonthInsights() {
    const node = $('#my-month-insights');
    if (!node) return;
    const insights = myMonthInsights();
    if (!insights.length) {
      node.innerHTML = '';
      return;
    }
    node.innerHTML = `
      <article class="my-month-insights">
        <h4>💡 Insights de tes 30 derniers jours</h4>
        <ul class="insights-list">
          ${insights.map((ins) => `
            <li class="insight-${escapeHtml(ins.tone)}">
              <span class="insight-icon">${escapeHtml(ins.icon)}</span>
              <span class="insight-text">${escapeHtml(ins.text)}</span>
            </li>
          `).join('')}
        </ul>
      </article>`;
  }

  function renderMyMonth() {
    renderMyMonthInsights();
    const node = $('#my-month-card');
    if (!node) return;
    const stats = myMonthStats();
    if (!stats.total) {
      node.innerHTML = `
        <article class="my-month-card empty">
          <h4>📅 Mon mois</h4>
          <p class="detail-text">Pas encore de pari réglé sur 30 jours glissants. Tu verras ici ton P&L, ton ROI, ton meilleur jour et ton sport favori dès que tu auras suivi quelques paris.</p>
        </article>`;
      return;
    }
    const pnlClass = stats.pnl > 0 ? 'pos' : stats.pnl < 0 ? 'neg' : '';
    const deltaClass = stats.delta > 0 ? 'pos' : stats.delta < 0 ? 'neg' : '';
    const deltaSymbol = stats.delta > 0 ? '↗' : stats.delta < 0 ? '↘' : '→';
    const sparkSvg = sparklineSvg(stats.sparkline);
    const dayLabel = (d) => {
      if (!d?.day) return '-';
      try { return new Date(d.day).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); }
      catch { return d.day; }
    };
    node.innerHTML = `
      <article class="my-month-card ${pnlClass}">
        <header>
          <h4>📅 Mon mois</h4>
          <span class="match-sub">30 jours glissants · ${formatCount(stats.total)} paris réglés</span>
        </header>
        <div class="my-month-grid">
          <div class="my-month-kpi big ${pnlClass}">
            <span>P&L 30j</span>
            <strong>${formatMoney(stats.pnl)}</strong>
            <em class="${deltaClass}">${deltaSymbol} ${formatMoney(stats.delta)} vs 30j précédents</em>
          </div>
          <div class="my-month-kpi"><span>Win rate</span><strong>${formatPct(stats.winRate, 1)}</strong><em>${formatCount(stats.won)} W · ${formatCount(stats.lost)} L</em></div>
          <div class="my-month-kpi"><span>ROI</span><strong>${formatPct(stats.roi, 1)}</strong><em>${formatMoney(stats.stake)} misés</em></div>
          <div class="my-month-kpi"><span>Meilleur jour</span><strong>${escapeHtml(dayLabel(stats.bestDay))}</strong><em>${stats.bestDay ? formatMoney(stats.bestDay.pnl) : '-'}</em></div>
          <div class="my-month-kpi"><span>Pire jour</span><strong>${escapeHtml(dayLabel(stats.worstDay))}</strong><em>${stats.worstDay ? formatMoney(stats.worstDay.pnl) : '-'}</em></div>
          <div class="my-month-kpi"><span>Top sport</span><strong>${escapeHtml(stats.topSport?.key || '-')}</strong><em>${stats.topSport ? `${formatMoney(stats.topSport.pnl)} sur ${formatCount(stats.topSport.count)}` : '-'}</em></div>
        </div>
        <div class="my-month-sparkline">${sparkSvg}</div>
      </article>`;
  }

  // Sprint 71 — Lazy render Bilan. Avant : 19 sous-renderers appeles
  // sequentiellement -> ~1s freeze sur switch vers Bilan. Maintenant : les
  // 4 sections critiques (Mon mois + KPIs + P&L tracked + insights) renderent
  // synchrones, les 15 suivantes sont schedulees via requestIdleCallback en
  // chunks. Le user voit le contenu principal immediatement.
  function renderHistory() {
    const history = state.history;
    // Tier 1 — critique, synchrone (apparait immediatement)
    renderModelPerformance();
    renderModelBrierCard();
    renderMyMonth();
    renderTrackedBets();
    renderAchievementsCard();
    renderPersonalInsights();
    // Tier 2 — secondaire, defer idle
    const tier2 = [
      renderAutoSettlementAudit,
      renderModelSelfAudit,
      renderActiveModelAdjustments,
      renderPersonalPatterns,
      renderActivityHeatmap365,
      renderLearningFeedback
    ];
    const scheduleIdle = typeof requestIdleCallback === 'function'
      ? (fn) => requestIdleCallback(fn, { timeout: 800 })
      : (fn) => setTimeout(fn, 16);
    tier2.forEach((fn, i) => scheduleIdle(() => {
      try { fn(); } catch (e) { /* render best-effort */ }
    }));
    // Path original a partir de renderBankrollAccounting (gardons sync)
    renderBankrollAccounting();
    renderDailyBudgetSummary();
    renderPaperSimulation();
    renderModelVsUser();
    renderDeepAnalytics();
    renderWinamaxReconciliation();
    renderSavedStrategies();
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
    // Sprint 72 B3 — Breadcrumbs : Aujourd'hui > Sport > Ligue > Pari
    const breadcrumbs = $('#modal-breadcrumbs');
    if (breadcrumbs) {
      const ts = Date.parse(row.start || '');
      const dayLabel = (() => {
        if (!Number.isFinite(ts)) return 'Toutes dates';
        const now = new Date();
        const target = new Date(ts);
        const diff = Math.floor((target - now) / (24 * 60 * 60 * 1000));
        if (diff < 1 && target.getDate() === now.getDate()) return "Aujourd'hui";
        if (diff < 2) return 'Demain';
        if (diff >= 2 && diff <= 6) return target.toLocaleDateString('fr-FR', { weekday: 'long' });
        return target.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      })();
      const sportLabel = String(row.sport || '').slice(0, 1).toUpperCase() + String(row.sport || '').slice(1);
      const leagueLabel = String(row.league || '').slice(0, 40);
      const betLabel = userBetLabel(row) || row.label || '';
      breadcrumbs.innerHTML = [
        dayLabel,
        sportLabel,
        leagueLabel,
        `<span class="crumb-final">${escapeHtml(betLabel)}</span>`
      ].filter(Boolean).map((s, i, arr) => {
        const sep = i < arr.length - 1 ? '<span class="crumb-sep">›</span>' : '';
        return s.startsWith('<span') ? `<span>${s}</span>${sep}` : `<span>${escapeHtml(s)}</span>${sep}`;
      }).join('');
    }
    $('#modal-content').innerHTML = buildDetailHtml(row);
    switchDetailTab('summary');
    applyExpertMode();
    modal.classList.add('quick-bet-mode');
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    // Sprint 67 — Memoriser l'ID courant pour la navigation prev/next
    state.modalCurrentId = String(id);
    updateModalNavButtons();
  }

  // Sprint 69 — Cmd-K palette : recherche rapide matchs + actions + pages
  function buildCmdKActions() {
    const tabs = [
      { id: 'tab:dashboard', icon: '🎯', title: 'Aller à À MISER', sub: 'Dashboard principal', tags: 'dashboard accueil home miser picks' },
      { id: 'tab:history', icon: '📊', title: 'Aller à Bilan & Stats', sub: 'Performance + Mon mois', tags: 'bilan stats history performance pnl' },
      { id: 'tab:scorers', icon: '👤', title: 'Aller à Buteurs', sub: 'Joueurs & buteurs', tags: 'buteur scorer joueur' },
      { id: 'tab:combines', icon: '🎲', title: 'Aller à Combinés', sub: 'Multi-jambes du jour', tags: 'combine combo multi' },
      { id: 'tab:preferences', icon: '⚙️', title: 'Aller à Réglages', sub: 'Bankroll, notifs, thème', tags: 'reglages preferences config' },
      { id: 'action:demo-tour', icon: '🎬', title: 'Lancer le tour démo', sub: '7 étapes guidées', tags: 'tour demo onboarding aide' },
      { id: 'action:toggle-expert', icon: '🧪', title: 'Toggle mode expert', sub: 'Affiche/cache sections avancées', tags: 'expert avance' },
      { id: 'action:refresh', icon: '🔄', title: 'Refresh data', sub: 'Forcer une mise à jour', tags: 'refresh reload mettre a jour' }
    ];
    return tabs;
  }

  function cmdKMatchRows() {
    const matches = state.dashboardPicks?.length ? state.dashboardPicks : (state.picks || []);
    return matches.slice(0, 50).map((m) => ({
      id: `match:${m.id}`,
      icon: '⚽',
      title: m.title || `${m.match?.home?.name || '?'} - ${m.match?.away?.name || '?'}`,
      sub: `${m.sport || ''} · ${m.league || ''} · ${m.label || ''} @${(Number(m.odd) || 0).toFixed(2)}`,
      tags: `${m.title || ''} ${m.sport || ''} ${m.league || ''}`.toLowerCase()
    }));
  }

  function renderCmdKResults(query) {
    const list = $('#cmd-k-results');
    if (!list) return;
    const q = String(query || '').trim().toLowerCase();
    const all = [...buildCmdKActions(), ...cmdKMatchRows()];
    const filtered = q
      ? all.filter((item) => `${item.title} ${item.sub} ${item.tags || ''}`.toLowerCase().includes(q))
      : all.slice(0, 12);
    if (!filtered.length) {
      list.innerHTML = '<li class="cmd-k-empty">Aucun résultat. Tape une équipe, un sport ou "tour démo".</li>';
      return;
    }
    list.innerHTML = filtered.slice(0, 20).map((item, idx) => `
      <li class="cmd-k-result ${idx === 0 ? 'active' : ''}" data-cmdk-id="${escapeHtml(item.id)}" role="option" tabindex="-1">
        <span class="cmd-k-result-icon">${escapeHtml(item.icon)}</span>
        <div class="cmd-k-result-meta">
          <span class="cmd-k-result-title">${escapeHtml(item.title)}</span>
          <span class="cmd-k-result-sub">${escapeHtml(item.sub)}</span>
        </div>
      </li>
    `).join('');
  }

  function openCmdK() {
    const bd = $('#cmd-k-backdrop');
    const input = $('#cmd-k-input');
    if (!bd || !input) return;
    bd.classList.remove('hidden');
    input.value = '';
    renderCmdKResults('');
    setTimeout(() => input.focus(), 50);
  }

  function closeCmdK() {
    $('#cmd-k-backdrop')?.classList.add('hidden');
  }

  function executeCmdKAction(itemId) {
    if (!itemId) return;
    if (itemId.startsWith('match:')) {
      const id = itemId.slice('match:'.length);
      openMatchDetail(id);
    } else if (itemId.startsWith('tab:')) {
      const tab = itemId.slice('tab:'.length);
      if (typeof switchTab === 'function') switchTab(tab);
    } else if (itemId === 'action:demo-tour') {
      if (typeof startDemoTour === 'function') startDemoTour({ force: true });
    } else if (itemId === 'action:toggle-expert') {
      try {
        const prefs = loadPreferences();
        applyPreferences({ ...prefs, expertMode: !prefs.expertMode });
      } catch { /* noop */ }
    } else if (itemId === 'action:refresh') {
      if (typeof startRefresh === 'function') startRefresh('quick').catch(() => {});
    }
    closeCmdK();
  }

  // Sprint 67 — Navigation prev/next dans la modal entre les picks visibles
  function modalNavOrderedIds() {
    // Priorite : picks dashboard visibles, sinon table principale
    const candidates = [];
    if (Array.isArray(state.dashboardPicks) && state.dashboardPicks.length) {
      state.dashboardPicks.forEach((p) => p?.id && candidates.push(String(p.id)));
    }
    if (!candidates.length && Array.isArray(state.picks)) {
      state.picks.forEach((p) => p?.id && candidates.push(String(p.id)));
    }
    return [...new Set(candidates)];
  }

  function updateModalNavButtons() {
    const prev = $('#modal-prev');
    const next = $('#modal-next');
    if (!prev || !next) return;
    const ids = modalNavOrderedIds();
    const idx = ids.indexOf(String(state.modalCurrentId || ''));
    const hasPrev = idx > 0;
    const hasNext = idx >= 0 && idx < ids.length - 1;
    prev.disabled = !hasPrev;
    next.disabled = !hasNext;
    prev.style.opacity = hasPrev ? '1' : '0.35';
    next.style.opacity = hasNext ? '1' : '0.35';
    prev.title = hasPrev ? `Pari précédent (← ${idx}/${ids.length})` : 'Premier pari';
    next.title = hasNext ? `Pari suivant (→ ${idx + 2}/${ids.length})` : 'Dernier pari';
  }

  function navigateModal(direction) {
    const ids = modalNavOrderedIds();
    const idx = ids.indexOf(String(state.modalCurrentId || ''));
    if (idx === -1) return;
    const targetIdx = idx + (direction === 'next' ? 1 : -1);
    if (targetIdx < 0 || targetIdx >= ids.length) return;
    openMatchDetail(ids[targetIdx]);
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
      <em>mise ${escapeHtml(visibleStakeText(pick))} · edge ${escapeHtml(formatPct(displayEdgeValue(pick), 1))}</em>
      ${safeBadgeHtml(pick)}
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
    const modal = $('#match-modal');
    modal?.classList.add('hidden');
    modal?.classList.remove('quick-bet-mode');
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
    const football = isFootballRow(row);
    const encounterRows = [];
    if (football && weather) {
      encounterRows.push(['Météo', cleanLabel([weather.city, weather.temp_c != null ? `${Math.round(Number(weather.temp_c))}°C` : '', weather.wind_kmh != null ? `${Math.round(Number(weather.wind_kmh))} km/h` : ''].filter(Boolean).join(' · '))]);
    }
    if (football && referee) {
      encounterRows.push(['Arbitre', cleanLabel(referee.name || referee.source || 'Contexte arbitre')]);
    }
    if (matchup.h2h_present) encounterRows.push(['Face-à-face', 'Historique disponible']);
    if (timing[0]?.recommendation || timing[0]?.advice) encounterRows.push(['Timing marché', timing[0].recommendation || timing[0].advice]);
    const contextRows = [
      ['Score contexte', contextScoreLabel(quality)],
      ['Confiance confiance', confidenceTrustText(row)],
      ['Décision contexte', contextGateText(row)],
      ['Agent', row.contextGate?.agentEligible === false ? 'Mise agent bloquée' : 'Éligible si mise positive'],
      ['Kickoff', quality.minutes_to_kickoff != null ? `${Math.round(quality.minutes_to_kickoff)} min` : '-'],
      missing.length ? ['Manques utiles', missing.filter((item) => football || !/xg|weather|referee|lineup/i.test(item)).slice(0, 4).join(', ')] : null,
      stale.length ? ['Périmé', stale.slice(0, 4).join(', ')] : null,
      critical.length ? ['Critique', critical.filter((item) => football || !/xg|weather|referee|lineup/i.test(item)).slice(0, 4).join(', ')] : null
    ].filter((item) => item && item[1]);
    return `
      <section class="detail-tab-panel" data-detail-panel="context">
        <div class="modal-grid">
          <article class="detail-card">
            <h4>Qualité contexte</h4>
            <div class="kv">${contextRows.map(([k, v]) => `<span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong>`).join('')}</div>
          </article>
          <article class="detail-card">
            <h4>Rencontre</h4>
            <div class="kv">${encounterRows.length ? encounterRows.map(([k, v]) => `<span>${escapeHtml(k)}</span><strong>${escapeHtml(v)}</strong>`).join('') : '<span>Contexte</span><strong>Données sportives non bloquantes</strong>'}</div>
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
      ['xG pour/contre', xg.present && (hasMeaningfulMetric(xg.for_avg) || hasMeaningfulMetric(xg.against_avg)) ? `${numericText(xg.for_avg, '', 2)} / ${numericText(xg.against_avg, '', 2)}` : 'Non disponible'],
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
    const sport = String(row?.sport || row?.match?.sport || '').toLowerCase();
    const footballPitch = sport.includes('football') || sport.includes('soccer') ? `
      <article class="detail-card wide">
        <h4>Terrain & compositions</h4>
        <div class="lineup-pitch" aria-label="Feuille de match probable">
          ${buildPitchColumn(row, 'home')}
          ${buildPitchColumn(row, 'away')}
        </div>
      </article>
    ` : '';
    return `
      <section class="detail-tab-panel" data-detail-panel="teams">
        <div class="modal-grid">
          ${footballPitch}
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
    const validationDetail = (item) => {
      const label = String(item?.label || '');
      const detail = item?.detail || '-';
      if (/march/i.test(label) || /^1n2$/i.test(String(detail))) return simpleMarketLabelForRow(row);
      return detail;
    };
    return `
      <article class="detail-card wide enriched-sources-card">
        <h4>Sources enrichies ${enrichmentBadgeHtml(row)}</h4>
        <p class="detail-text">${escapeHtml(`${formatCount(enrichment.successfulSources || 0)} source(s) OK · ${formatCount(enrichment.failedSources || 0)} échec(s) · ${formatDateTime(enrichment.enrichedAt)}`)}</p>
        <div class="market-list">
          ${validations.map((item) => `
            <div class="market-row">
              <span>${escapeHtml(item.label || 'validation')}</span>
              <strong>${escapeHtml(item.status || 'ok')}</strong>
              <em>${escapeHtml(validationDetail(item))}</em>
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
              <span>Agent</span><strong>${escapeHtml(row.contextGate?.agentEligible === false ? 'Bloqué' : canDisplayStake(row, decisions) ? 'Non bloquant pour ce pari' : row.prebetGate?.blocked ? 'Bloqué' : 'Éligible si mise positive')}</strong>
              <span>Edge</span><strong>${escapeHtml(formatPct(displayEdgeValue(row), 1))}</strong>
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

  function seededRandom(seed) {
    let value = (Number(seed) || 1) % 2147483647;
    if (value <= 0) value += 2147483646;
    return () => {
      value = (value * 16807) % 2147483647;
      return (value - 1) / 2147483646;
    };
  }

  function monteCarloForRow(row, iterations = 10000) {
    const baseProbability = Math.max(0.02, Math.min(0.98, Number(row?.probability || realConfidenceValue(row) || 0.5)));
    const sport = String(row?.sport || row?.match?.sport || '').toLowerCase();
    const volatility = sport.includes('baseball') ? 0.22 : sport.includes('hockey') ? 0.20 : sport.includes('basket') ? 0.15 : sport.includes('tennis') ? 0.17 : 0.13;
    const rng = seededRandom(stringHash(`${row?.id || row?.title}:${row?.market}:${row?.label}`));
    let wins = 0;
    let close = 0;
    let blowout = 0;
    for (let index = 0; index < iterations; index += 1) {
      const noise = (rng() - 0.5) * volatility;
      const scenarioProbability = Math.max(0.01, Math.min(0.99, baseProbability + noise));
      const roll = rng();
      if (roll <= scenarioProbability) wins += 1;
      if (Math.abs(roll - scenarioProbability) <= 0.06) close += 1;
      if (roll <= Math.max(0.01, scenarioProbability - 0.22)) blowout += 1;
    }
    const winRate = wins / iterations;
    const closeRate = close / iterations;
    const blowoutRate = blowout / iterations;
    return {
      iterations,
      winRate,
      lossRate: 1 - winRate,
      closeRate,
      blowoutRate,
      tone: winRate >= 0.64 && closeRate <= 0.18 ? 'ok' : winRate >= 0.56 ? 'watch' : 'warn',
      label: winRate >= 0.64 && closeRate <= 0.18 ? 'Profil solide' : winRate >= 0.56 ? 'Value mais à surveiller' : 'Distribution fragile'
    };
  }

  function buildMonteCarloHtml(row) {
    const sim = monteCarloForRow(row);
    const barClass = (value) => `bar-w-${Math.max(0, Math.min(100, Math.round(Number(value || 0) * 20) * 5))}`;
    return `
      <article class="detail-card wide monte-carlo-card monte-${escapeHtml(sim.tone)}">
        <h4>Simulation Monte Carlo</h4>
        <p class="detail-text">Le logiciel rejoue ce pari ${formatCount(sim.iterations)} fois avec un simulateur adapté au sport et une variance prudente.</p>
        <div class="monte-bars" aria-label="Distribution Monte Carlo">
          <div><span class="${escapeHtml(barClass(sim.winRate))}"></span><strong>${escapeHtml(formatPct(sim.winRate, 0))} gagne</strong></div>
          <div><span class="${escapeHtml(barClass(sim.lossRate))}"></span><strong>${escapeHtml(formatPct(sim.lossRate, 0))} perd</strong></div>
          <div><span class="${escapeHtml(barClass(sim.closeRate))}"></span><strong>${escapeHtml(formatPct(sim.closeRate, 0))} scénario serré</strong></div>
          <div><span class="${escapeHtml(barClass(sim.blowoutRate))}"></span><strong>${escapeHtml(formatPct(sim.blowoutRate, 0))} scénario confortable</strong></div>
        </div>
        <div class="match-context-band"><span>${escapeHtml(sim.label)}</span><strong>${escapeHtml(`Le pari gagne dans ${formatPct(sim.winRate, 0)} des scénarios`)}</strong><em>${escapeHtml(sim.closeRate > 0.22 ? 'Distribution large : mise prudente recommandée.' : 'Distribution plutôt serrée : lecture plus stable.')}</em></div>
      </article>
    `;
  }

  function buildTwoGoalSafetyHtml(row) {
    const safety = row?.winamaxTwoGoalRule;
    if (!safety?.eligible) return '';
    const pct = Math.round(Number(safety.leadTwoProbability || 0) * 100);
    const margin = Math.round(Number(safety.finalMarginTwoProbability || 0) * 100);
    const boost = Math.round(Number(safety.probabilityBoost || 0) * 1000) / 10;
    return `
      <article class="detail-card wide two-goal-card">
        <h4>Filet de sécurité 2-0 Winamax</h4>
        <p class="detail-text">Sur les Vainqueurs foot éligibles, Winamax peut payer le pari plus tôt si l’équipe choisie mène de deux buts. Le logiciel modélise ce filet avec prudence, sans remplacer la vérification de la page du match.</p>
        <div class="match-context-band">
          <span>${escapeHtml(`${pct}% sécurité 2-0 estimée`)}</span>
          <strong>${escapeHtml(`Marge finale 2+ buts : ${margin}%`)}</strong>
          <em>${escapeHtml(boost > 0 ? `Bonus prudent appliqué au score : +${boost} pt` : 'Pas de bonus de score appliqué')}</em>
        </div>
      </article>
    `;
  }

  function personalModelForRow(row) {
    const settled = loadUserBets().filter((bet) => ['won', 'lost'].includes(String(bet.status || '')));
    const sportKey = normalizeUiKey(row?.sport || '');
    const marketKey = normalizeUiKey(rowMarketPreferenceKey(row));
    if (settled.length < 50) {
      const base = 52 + Math.min(18, Math.max(0, displayEdgeValue(row) * 120)) + (canDisplayStake(row) ? 8 : 0);
      return {
        sample: settled.length,
        trained: false,
        score: Math.round(Math.max(40, Math.min(78, base))),
        detail: `Sample utilisateur ${formatCount(settled.length)}/50 : fallback heuristique, pas encore un vrai modèle personnel.`
      };
    }
    const similar = settled.filter((bet) => normalizeUiKey(bet.sport || '') === sportKey || normalizeUiKey(marketGroupFromKey(bet.marketKey || bet.market || '')) === marketKey);
    const wins = similar.filter((bet) => bet.status === 'won').length;
    const stake = similar.reduce((sum, bet) => sum + Number(bet.stake || 0), 0);
    const pnl = similar.reduce((sum, bet) => sum + Number(bet.pnl || 0), 0);
    const roi = stake > 0 ? pnl / stake : 0;
    const wr = similar.length ? wins / similar.length : 0.5;
    const score = Math.round(Math.max(1, Math.min(100, 45 + wr * 35 + roi * 45 + Math.min(12, displayEdgeValue(row) * 80))));
    return {
      sample: similar.length,
      trained: true,
      score,
      detail: `${formatCount(similar.length)} paris similaires dans ton historique · WR ${formatPct(wr, 0)} · ROI ${formatPct(roi, 0)}.`
    };
  }

  function buildPersonalModelHtml(row) {
    const model = personalModelForRow(row);
    return `
      <article class="detail-card personal-model-card expert-only hidden">
        <h4>Modèle personnel</h4>
        <div class="personal-score">${escapeHtml(String(model.score))}<span>/100</span></div>
        <p class="detail-text">${escapeHtml(model.trained ? 'Cohérence avec ton style gagnant.' : 'En apprentissage local, fallback prudent tant que tu as moins de 50 paris réglés.')}</p>
        <small>${escapeHtml(model.detail)}</small>
      </article>
    `;
  }

  function buildSocialWatcherHtml(row) {
    const prefs = loadPreferences();
    const item = newsForRow(row);
    const enabled = Boolean(prefs.twitterWatcher);
    return `
      <article class="detail-card wide news-watcher-card news-${enabled ? 'watch' : 'ok'}">
        <h4>Twitter/X watcher</h4>
        <div class="match-context-band">
          <span>${enabled ? 'Surveillance publique active' : 'Option désactivée'}</span>
          <strong>${escapeHtml(item?.headline ? `Dernier re-check : ${item.headline}` : 'Aucune news flash impactante')}</strong>
          <em>${escapeHtml(enabled ? 'Le watcher réutilise les sources publiques/réseaux via le process principal, avec cache et rate limit. Sans clé X, il se limite aux flux publics disponibles.' : 'Active-le en Mode expert si tu veux surveiller les news ultra-fraîches.')}</em>
        </div>
      </article>
    `;
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
    const readableAction = stakeAllowed ? (dc.nextAction || 'Jouer maintenant') : 'Surveiller ou finaliser T-10';
    const wx = match.winamax || {};
    const markets = wx.markets || {};
    const oneNtwo = markets['1n2'] || {};
    const segmentValidation = row.segmentValidation || {};
    const quality = [
      ['Puis-je miser ?', stakeAllowed ? 'Oui' : 'Non'],
      ['Pourquoi ?', readableReason],
      ['Priorité', row.priorityRank ? `#${row.priorityRank} · ${Math.round(priorityValue(row))}/100` : priorityText(row)],
      ['Allocation jour', allocationSummaryText(row)],
      ['Action utile', readableAction],
      ['Mise affichée', visibleStakeText(row, decisionBundle)],
      ['Statut', row.statusLabel],
      ['Marché', row.market],
      ['Pick', row.label],
      ['Format pari', row.winamaxBetType?.label || 'Single Winamax'],
      ['Boost Winamax', row.winamaxBoost ? (row.winamaxBoost.to ? `${row.winamaxBoost.from ? `${Number(row.winamaxBoost.from).toFixed(2)} → ` : ''}${Number(row.winamaxBoost.to).toFixed(2)}` : 'détecté') : 'Aucun boost détecté'],
      ['Cote', row.odd > 1 ? `@${row.odd.toFixed(2)}` : '-'],
      ['Lecture modèle', row.probability > 0 ? formatPct(row.probability, 1) : '-'],
      ['Confiance', formatPct(safeConfidenceValue(row), 1)],
      ['Validation historique', segmentValidation.label || 'Sample insuffisant pour validation rétrospective'],
      ['Avantage', displayEdgeValue(row) > 0 ? formatPct(displayEdgeValue(row), 1) : '-'],
      ['Mise autorisée', visibleStakeText(row, decisionBundle)],
      ['Mise théorique', Number(row.modelStake || row.stake || 0) > 0 && !stakeAllowed ? `${formatMoney(row.modelStake || row.stake)} · bloquée` : row.stake > 0 ? formatMoney(row.stake) : '0 €'],
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
    const visibleSignalCards = signalCards.filter((signal) => {
      if (!signal) return false;
      const label = String(signal.label || '');
      const value = String(signal.value || '');
      if (!isFootballRow(row) && /météo|arbitre|composition|xg/i.test(label)) return false;
      if (!signal.ok && /non disponible|n\/a|^-$|^0(?:\.0)?%?$|à enrichir/i.test(value)) return false;
      return true;
    });
    const marketRows = buildMarketRows(markets);
    const h2hHtml = buildH2hHtml(match);
    const calibrationHtml = buildCalibrationDetailHtml(row);
    const blockList = blockReasons(row);
    const decisionTone = stakeAllowed ? 'ok' : dc.status === 'repair' ? 'warn' : dc.status === 'skip' ? 'danger' : 'watch';
    const signalPreview = visibleSignalCards.filter((signal) => signal.ok).slice(0, 6);
    const narrative = pickNarrative(row, signalPreview, explanation);
    const advancedSignals = advancedSportsSignals(row);
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
    const ticketRows = [
      ['PARI', userBetLabel(row)],
      ['COTE', row.odd > 1 ? `${formatOdd(row.odd)} Winamax` : 'Non disponible'],
      ['MISE', visibleStakeText(row, decisionBundle)],
      ['Marché', simpleMarketLabelForRow(row)],
      row.winamaxBoost ? ['Boost Winamax', row.winamaxBoost.to ? `${row.winamaxBoost.from ? `${Number(row.winamaxBoost.from).toFixed(2)} → ` : ''}${Number(row.winamaxBoost.to).toFixed(2)}` : 'détecté'] : null,
      row.winamaxTwoGoalRule?.eligible ? ['Filet 2-0', `${Math.round(Number(row.winamaxTwoGoalRule.leadTwoProbability || 0) * 100)}% estimé`] : null,
      ['Action', readableAction],
      ['Winamax', winamaxLink]
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
            <span>Pari suggéré</span>
            <strong>${escapeHtml(stakeAllowed ? 'Je peux miser' : 'Ne pas miser maintenant')}</strong>
            ${(() => {
              // Sprint 72 C6 — Bandeau hedging si user a deja parie sur ce match
              const hedge = detectHedgingForRow(row);
              if (!hedge || hedge.count < 1) return '';
              const labels = hedge.bets.map((b) => b.label || b.selection || 'Pari').filter(Boolean).slice(0, 3).join(' · ');
              return `
                <div class="hedging-banner">
                  <strong>⚠ Tu as déjà ${hedge.count} pari${hedge.count > 1 ? 's' : ''} en cours sur ce match</strong>
                  <span>Sur-exposition possible. Existant : ${escapeHtml(labels)}</span>
                </div>`;
            })()}
            ${actionPickHtml(row, { compact: true })}
            <p>${escapeHtml(simpleWhyText(row))}</p>
            ${(() => {
              const bullets = keyReasonsBullets(row);
              return bullets.length ? `
                <ul class="key-reasons-list">
                  ${bullets.map((b) => `<li><span class="key-reason-icon">${escapeHtml(b.icon)}</span><span class="key-reason-text">${escapeHtml(b.text)}</span></li>`).join('')}
                </ul>` : '';
            })()}
            ${(() => {
              // Sprint 72 D9 — Checklist visuelle (8 dimensions max ✅⚠️❌)
              const checks = whyChecklistBullets(row);
              if (!checks.length) return '';
              return `
                <div class="why-checklist">
                  <span class="why-checklist-title">Critères clés</span>
                  <ul>
                    ${checks.map((c) => {
                      const sign = c.tone === 'ok' ? '✓' : c.tone === 'warn' ? '!' : '✗';
                      return `<li class="why-check why-${escapeHtml(c.tone)}"><span class="why-sign">${sign}</span><span class="why-icon">${escapeHtml(c.icon)}</span><span class="why-label">${escapeHtml(c.label)}</span><span class="why-detail">${escapeHtml(c.detail)}</span></li>`;
                    }).join('')}
                  </ul>
                </div>`;
            })()}
            ${(() => {
              // Sprint 72 C3 — Wilson CI 95% sur la confiance du modele
              // affiche aussi le CI ROI segment si sample >= 15
              const conf = Number(row.safeAssessment?.confidence || row.probability || 0);
              const sample = Number(row.segmentValidation?.sample || row.calibration?.sample || 0);
              const winRateRaw = Number(row.segmentValidation?.win_rate ?? row.calibration?.win_rate);
              const winsRaw = Number(row.segmentValidation?.wins ?? row.calibration?.wins);
              const hasWinSample = Number.isFinite(winsRaw) && winsRaw > 0 || Number.isFinite(winRateRaw) && winRateRaw > 0;
              const wins = Number.isFinite(winsRaw) ? winsRaw : hasWinSample ? Math.round(sample * winRateRaw) : NaN;
              const ci = sample >= 5 && Number.isFinite(wins) && wins >= 0 ? wilsonCi(wins, sample) : null;
              if (!conf && !ci) return '';
              const confPct = Math.round(conf * 100);
              const ciTxt = ci ? `${Math.round(ci[0] * 100)}-${Math.round(ci[1] * 100)}%` : null;
              return `
                <div class="confidence-bar">
                  <span class="cb-label">Confiance modèle</span>
                  <div class="cb-track" title="Probabilité estimée du pick">
                    <div class="cb-fill" style="width: ${Math.min(100, Math.max(0, confPct))}%"></div>
                    <span class="cb-value">${confPct}%</span>
                  </div>
                  ${ciTxt ? `<span class="cb-ci" title="Intervalle de confiance Wilson 95% sur le segment historique (${sample} paris)">IC 95% segment : ${escapeHtml(ciTxt)}</span>` : '<span class="cb-ci muted">Segment historique insuffisant</span>'}
                </div>`;
            })()}
            <div class="ultimate-tags detail-priority-strip">
              ${priorityBadgeHtml(row)}
              ${safeBadgeHtml(row)}
              ${twoGoalSafetyBadgeHtml(row)}
              ${lineupStatusBadgeHtml(row)}
              ${freshNewsBadgeHtml(row)}
              <span title="${escapeHtml(allocationLongText(row))}">${escapeHtml(allocationSummaryText(row))}</span>
            </div>
            <div class="decision-hero-grid">
              <div><span>Pari</span><strong>${escapeHtml(userBetLabel(row))}</strong></div>
              <div><span>Cote</span><strong>${escapeHtml(row.odd > 1 ? `@${row.odd.toFixed(2)}` : '-')}</strong></div>
              <div><span>Mise</span><strong>${escapeHtml(visibleStakeText(row, decisionBundle))}</strong></div>
              <div><span>Départ</span><strong>${escapeHtml(countdownLabel(row.start))}</strong></div>
            </div>
          </article>
          <article class="match-ticket-card">
            <h4>À jouer</h4>
            <div class="kv">
              ${ticketRows.map(([k, v]) => `<span>${escapeHtml(k)}</span><strong>${k === 'Winamax' ? v : escapeHtml(v)}</strong>`).join('')}
            </div>
          </article>
        </div>
        <!-- Sprint 81 B1+B4 — enriched-sources retire (deja onglet Sources),
             news+social fusionnes en watcher unique condense -->
        ${(() => {
          const news = (typeof newsForRow === 'function') ? newsForRow(row) : null;
          if (!news || news.tone === 'ok') return '';
          // Resume condense, le detail reste dans l'onglet Sources / news widget
          return `<article class="detail-card wide watcher-compact watcher-${escapeHtml(news.tone)}">
            <h4>📰 Veille externe</h4>
            <p class="detail-text">${escapeHtml(news.headline || 'Actualités récentes détectées')} · ${escapeHtml(news.detail || 'Voir l\'onglet Sources pour détail')}</p>
          </article>`;
        })()}
        <article class="detail-card wide sheet-signals-card">
          <h4>Signaux clés</h4>
          <div class="sheet-signal-strip">
            ${signalPreview.length ? signalPreview.map((signal) => `
              <div class="${signal.ok ? 'ok' : 'missing'}">
                <span>${escapeHtml(signal.label)}</span>
                <strong>${escapeHtml(signal.value)}</strong>
                <em>${escapeHtml(signal.detail)}</em>
              </div>
            `).join('') : '<div class="ok"><span>Lecture prudente</span><strong>Signaux essentiels seulement</strong><em>Les blocs vides sont masqués au lieu d’inventer des stats.</em></div>'}
          </div>
        </article>
        <div class="modal-grid sheet-grid">
          <article class="detail-card">
            <h4>${escapeHtml(t('reassuringNarrative'))}</h4>
            <p class="detail-text">${escapeHtml(narrative)}</p>
            ${formStripHtml(match)}
            <div class="mini-kpi-row">
              <span>Fiabilité ${escapeHtml(formatPct(realConfidenceValue(row), 0))}</span>
              <span>Marché simple</span>
              <span>${escapeHtml(sourceLine)}</span>
            </div>
          </article>
          ${buildSportInsightHtml(row)}
          ${buildTwoGoalSafetyHtml(row)}
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
                <strong>${escapeHtml(userFacingGuardText(item.detail))}</strong>
              </div>
            `).join('')}</div>` : '<p class="detail-text">Tous les garde-fous locaux sont verts. La cote Winamax reste à vérifier au moment du clic.</p>'}
          </article>
        </div>
        <!-- Sprint 81 B5+B7 — Modules expert reples dans <details>.
             monte-carlo, personal-model, patterns avances disponibles ici mais fermes par defaut -->
        <details class="advanced-section detail-expert-details">
          <summary>🔬 Vue technique (modèles, monte-carlo, patterns)</summary>
          <div class="modal-grid sheet-grid">
            ${buildMonteCarloHtml(row)}
            ${buildPersonalModelHtml(row)}
            <article class="detail-card">
              <h4>Patterns avancés</h4>
              <div class="kv">${advancedSignals.length ? advancedSignals.map((signal) => `<span>${escapeHtml(signal.label)}</span><strong>${escapeHtml(signal.detail)}</strong>`).join('') : '<span>Sport</span><strong>Aucun red flag avancé détecté</strong>'}</div>
            </article>
          </div>
        </details>
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
          ${visibleSignalCards.length ? visibleSignalCards.map((signal) => `
            <article class="signal-card ${signal.ok ? 'signal-ok' : 'signal-missing'}">
              <span>${escapeHtml(signal.label)}</span>
              <strong>${escapeHtml(signal.value)}</strong>
              <small>${escapeHtml(signal.detail)}</small>
            </article>
          `).join('') : '<article class="signal-card signal-ok"><span>Signaux</span><strong>Pas de signal utile affichable</strong><small>Les données manquantes ou non pertinentes pour ce sport sont cachées.</small></article>'}
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
    if (!isBeforeKickoff(row)) return false;
    if (trendForRow(row)?.tone === 'cold') return false;
    if (decisions && Object.prototype.hasOwnProperty.call(decisions, 'canBet')) {
      return decisions.canBet === true && Number(row?.stake || 0) > 0;
    }
    return row?.status === 'bet' && !row?.prebetGate?.blocked && Number(row?.edge || 0) > 0 && Number(row?.stake || 0) > 0;
  }

  function visibleStakeText(row, decisions = decisionBundleForRow(row)) {
    if (!canDisplayStake(row, decisions)) {
      const allocation = allocationForRow(row);
      if (!allocation && decisions?.canBet === true) return 'Hors budget jour';
      return 'Pas de mise recommandée';
    }
    const stake = displayStakeAmount(row);
    return stake > 0 ? formatMoney(stake) : 'Hors budget jour';
  }

  function noBetStakeReason(row, decisions = decisionBundleForRow(row)) {
    const trend = trendForRow(row);
    if (trend?.tone === 'cold') return trend.reason || 'Tendance froide';
    return decisions?.mainReason
      || row?.prebetGate?.first
      || row?.statusLabel
      || contextGateText(row)
      || 'Gate final non prêt';
  }

  function stakePolicyText(row, decisions = decisionBundleForRow(row)) {
    if (canDisplayStake(row, decisions)) return allocationLongText(row);
    return `Bloquée · ${noBetStakeReason(row, decisions)}`;
  }

  function blockReasons(row) {
    const reasons = [];
    const quality = row?.contextQuality || row?.match?.context?.quality || {};
    if (row?.prebetGate?.blocked && !canDisplayStake(row)) {
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
    const relevant = (items) => items.filter((item) => isFootballRow(row) || !/xg|weather|referee|lineup|composition/i.test(String(item)));
    const criticalRelevant = relevant(critical);
    const missingRelevant = relevant(missing);
    const staleRelevant = relevant(stale);
    if (criticalRelevant.length) reasons.push({ label: 'Signal critique', detail: criticalRelevant.slice(0, 4).join(' · '), tone: 'danger' });
    if (missingRelevant.length) reasons.push({ label: 'Signaux manquants', detail: missingRelevant.slice(0, 5).join(' · '), tone: 'warn' });
    if (staleRelevant.length) reasons.push({ label: 'Signaux périmés', detail: staleRelevant.slice(0, 4).join(' · '), tone: 'warn' });
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
    // Sprint 73 D6 — Arbitre profile enrichi : tier (permissif/strict/moyen)
    // + pénaltys donnés + ligue moyenne pour contexte
    const cardsText = Number.isFinite(cards) ? `${cards.toFixed(1)} cartons/match` : 'Non disponible';
    const refereeTier = Number.isFinite(cards)
      ? (cards >= 4.5 ? '🟥 Strict' : cards <= 2.8 ? '🟢 Permissif' : '🟨 Moyen')
      : null;
    const refereePenalties = Number(referee?.penaltiesPerGame ?? referee?.pens_per_match);
    const refereePenText = Number.isFinite(refereePenalties) && refereePenalties > 0
      ? `· ${refereePenalties.toFixed(2)} pen/m`
      : '';
    const cardsTextFull = refereeTier
      ? `${cardsText} ${refereeTier}${refereePenText}`
      : cardsText;
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
        value: cardsTextFull,
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

  // Sprint 74 D2 — H2H expanded avec streak detection
  function h2hStreaksAnalysis(meetings) {
    if (!meetings.length) return null;
    let lowScoring = 0, highScoring = 0, btts = 0, draws = 0;
    let homeBetterCount = 0; // Combien de fois le home a gagné
    let lastNHomeForm = []; // [W/D/L pour le home des 5 derniers]
    for (const m of meetings.slice(0, 10)) {
      const hs = Number(m.home_score), as = Number(m.away_score);
      if (!Number.isFinite(hs) || !Number.isFinite(as)) continue;
      const total = hs + as;
      if (total < 2.5) lowScoring++;
      if (total > 2.5) highScoring++;
      if (hs > 0 && as > 0) btts++;
      if (hs === as) { draws++; lastNHomeForm.push('D'); }
      else if (hs > as) { homeBetterCount++; lastNHomeForm.push('W'); }
      else lastNHomeForm.push('L');
    }
    const n = meetings.length;
    return {
      n,
      lowScoring,
      highScoring,
      btts,
      draws,
      homeBetterCount,
      lastNHomeForm: lastNHomeForm.slice(0, 5)
    };
  }

  function buildH2hHtml(match) {
    const { home, away } = getSides(match);
    const meetings = Array.isArray(match.h2h?.meetings) ? match.h2h.meetings.slice(0, 10) : [];
    const stats = h2hStreaksAnalysis(meetings);
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
        ${stats && stats.n >= 3 ? `
        <article class="detail-card wide h2h-stats-card">
          <h4>📊 Patterns sur ${stats.n} H2H récents</h4>
          <div class="h2h-stats-grid">
            <div class="h2h-stat ${stats.lowScoring >= stats.n * 0.6 ? 'h2h-stat-strong' : ''}">
              <span>Matchs &lt; 2.5 buts</span>
              <strong>${stats.lowScoring}/${stats.n}</strong>
              ${stats.lowScoring >= stats.n * 0.6 ? '<em>Tendance Moins de 2,5 forte</em>' : ''}
            </div>
            <div class="h2h-stat ${stats.highScoring >= stats.n * 0.6 ? 'h2h-stat-strong' : ''}">
              <span>Matchs &gt; 2.5 buts</span>
              <strong>${stats.highScoring}/${stats.n}</strong>
              ${stats.highScoring >= stats.n * 0.6 ? '<em>Tendance Plus de 2,5 forte</em>' : ''}
            </div>
            <div class="h2h-stat ${stats.btts >= stats.n * 0.6 ? 'h2h-stat-strong' : ''}">
              <span>BTTS</span>
              <strong>${stats.btts}/${stats.n}</strong>
              ${stats.btts >= stats.n * 0.6 ? '<em>BTTS Yes fréquent</em>' : ''}
            </div>
            <div class="h2h-stat ${stats.homeBetterCount >= stats.n * 0.5 ? 'h2h-stat-strong' : ''}">
              <span>Domicile vainqueur</span>
              <strong>${stats.homeBetterCount}/${stats.n}</strong>
              ${stats.homeBetterCount >= stats.n * 0.5 ? '<em>Domicile dominant</em>' : ''}
            </div>
          </div>
          ${stats.lastNHomeForm.length ? `
            <div class="h2h-form-sequence">
              <span>Forme home sur les ${stats.lastNHomeForm.length} derniers :</span>
              ${stats.lastNHomeForm.map((r) => `<span class="form-pill form-${r === 'W' ? 'w' : r === 'D' ? 'd' : 'l'}">${r}</span>`).join('')}
            </div>
          ` : ''}
        </article>
        ` : ''}
        <article class="detail-card wide">
          <h4>📜 Face-à-face détaillé (${meetings.length})</h4>
          ${meetings.length ? `
            <div class="h2h-list">
              ${meetings.map((item) => {
                const hs = Number(item.home_score), as = Number(item.away_score);
                const total = Number.isFinite(hs) && Number.isFinite(as) ? hs + as : null;
                const result = Number.isFinite(hs) && Number.isFinite(as)
                  ? (hs > as ? 'home' : as > hs ? 'away' : 'draw')
                  : 'unknown';
                return `
                  <div class="h2h-row h2h-${result}">
                    <span class="h2h-date">${escapeHtml(item.date || '-')}</span>
                    <strong class="h2h-teams">${escapeHtml(`${item.home || 'Home'} - ${item.away || 'Away'}`)}</strong>
                    <em class="h2h-score">${escapeHtml(`${item.home_score ?? '?'}-${item.away_score ?? '?'}`)}</em>
                    ${total !== null ? `<span class="h2h-total ${total > 2.5 ? 'h2h-total-high' : 'h2h-total-low'}">${total > 2.5 ? '🔥' : '🔒'} ${total}</span>` : ''}
                  </div>
                `;
              }).join('')}
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
        <td data-label="Edge" class="${displayEdgeValue(row) >= 0.08 ? 'edge-pos' : 'edge-warn'}">${formatPct(displayEdgeValue(row), 1)}</td>
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
    renderWinamaxMarketAudit();
    renderQualityAlerts(status);
    renderWarnings(status);
    renderWinamaxMarketAudit();
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

  const REFRESH_BUTTON_IDS = [
    'refresh-btn',
    'refresh-full-btn',
    'refresh-signals-btn',
    'refresh-prematch-btn',
    'refresh-prematch-t60-btn',
    'refresh-prematch-t30-btn',
    'refresh-prematch-t10-btn',
    'refresh-repair-context-btn',
    'refresh-critical-btn',
    'prepare-smart-btn',
    'smart-prepare-run-btn',
    'prematch-final-run-btn',
    'prematch-t10-run-btn'
  ];

  function setRefreshControlsDisabled(disabled) {
    REFRESH_BUTTON_IDS.forEach((id) => {
      const node = $(`#${id}`);
      if (node) node.disabled = disabled;
    });
  }

  function setRefreshButtonText(id, text) {
    const node = $(`#${id}`);
    if (node) node.textContent = text;
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
    setRefreshControlsDisabled(running);
    updateFirstActionButton(running);
    if (sourceSelect) sourceSelect.disabled = running;
    $$('.quality-action-btn').forEach((button) => {
      button.disabled = running;
    });
    setRefreshButtonText('refresh-btn', running && !isSignals ? 'Refresh en cours' : 'Rafraîchir');
    setRefreshButtonText('refresh-full-btn', running && status.mode === 'full' ? 'Complet en cours' : 'Refresh complet');
    setRefreshButtonText('refresh-signals-btn', running && isSignals ? `${sourceLabel} en cours` : 'Signaux lents');
    setRefreshButtonText('refresh-prematch-btn', running && isPrematch ? 'Pré-match en cours' : 'Pré-match final');
    setRefreshButtonText('refresh-prematch-t60-btn', running && isPrematchT60 ? 'T-60 en cours' : 'T-60');
    setRefreshButtonText('refresh-prematch-t30-btn', running && isPrematchT30 ? 'T-30 en cours' : 'T-30');
    setRefreshButtonText('refresh-prematch-t10-btn', running && isPrematchT10 ? 'T-10 en cours' : 'T-10');
    if (state.status) {
      state.status.refresh = status;
      renderRefreshSummary(state.status);
      renderPipelinePanel(state.status);
    }
    return status;
  }

  async function startRefresh(mode = 'quick', requestedSource = null) {
    const source = mode === 'signals' ? (requestedSource || $('#refresh-signal-source')?.value || 'all') : 'all';
    recordUserAction('refresh', `${mode}:${source}`);
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
    setRefreshControlsDisabled(true);
    updateFirstActionButton(true);
    const sourceSelect = $('#refresh-signal-source');
    if (sourceSelect) sourceSelect.disabled = true;
    $$('.source-refresh-btn, .prematch-plan-btn').forEach((button) => {
      button.disabled = true;
    });
    $$('.quality-action-btn').forEach((button) => {
      button.disabled = true;
    });
    setRefreshButtonText('refresh-btn', mode === 'signals' ? 'Rafraîchir' : 'Refresh en cours');
    setRefreshButtonText('refresh-full-btn', mode === 'full' ? 'Complet en cours' : 'Refresh complet');
    setRefreshButtonText('refresh-signals-btn', mode === 'signals' ? `${signalSourceLabel(source)} en cours` : 'Signaux lents');
    setRefreshButtonText('refresh-prematch-btn', mode === 'prematch' ? 'Pré-match en cours' : 'Pré-match final');
    setRefreshButtonText('refresh-prematch-t60-btn', mode === 'prematch_t60' ? 'T-60 en cours' : 'T-60');
    setRefreshButtonText('refresh-prematch-t30-btn', mode === 'prematch_t30' ? 'T-30 en cours' : 'T-30');
    setRefreshButtonText('refresh-prematch-t10-btn', mode === 'prematch_t10' ? 'T-10 en cours' : 'T-10');
    const params = new URLSearchParams({ mode });
    if (mode === 'signals') params.set('source', source);
    try {
      await fetchJson(`/api/refresh/start?${params.toString()}`, { method: 'POST' });
      recordActionHistory(actionRecord);
    } catch (error) {
      renderRefreshEta(null);
      setRefreshControlsDisabled(false);
      if (sourceSelect) sourceSelect.disabled = false;
      $$('.source-refresh-btn, .prematch-plan-btn').forEach((button) => {
        button.disabled = false;
      });
      $$('.quality-action-btn').forEach((button) => {
        button.disabled = false;
      });
      setRefreshButtonText('refresh-btn', 'Rafraîchir');
      setRefreshButtonText('refresh-full-btn', 'Refresh complet');
      setRefreshButtonText('refresh-signals-btn', 'Signaux lents');
      setRefreshButtonText('refresh-prematch-btn', 'Pré-match final');
      setRefreshButtonText('refresh-prematch-t60-btn', 'T-60');
      setRefreshButtonText('refresh-prematch-t30-btn', 'T-30');
      setRefreshButtonText('refresh-prematch-t10-btn', 'T-10');
      setRefreshButtonText('refresh-repair-context-btn', 'Réparer contexte');
      setRefreshButtonText('refresh-critical-btn', 'File critique');
      setRefreshButtonText('prepare-smart-btn', 'Préparer mes paris');
      setRefreshButtonText('smart-prepare-run-btn', smartPrepareAction().label || 'Préparer maintenant');
      setRefreshButtonText('prematch-final-run-btn', 'Lancer pré-match final');
      setRefreshButtonText('prematch-t10-run-btn', 'Ticket T-10');
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
    if (tab === 'data' && !loadPreferences().expertMode) tab = 'preferences';
    const categoryTabs = {
      cockpit: 'cockpit',
      winners: 'winner',
      goals: 'goals',
      night: 'night',
      watch: 'watch'
    };
    const cockpitCategory = categoryTabs[tab] || null;
    const panelTab = cockpitCategory ? 'dashboard' : tab;
    state.activeHomeCategory = panelTab === 'dashboard' ? cockpitCategory : null;
    recordUserAction('view', tab);
    $$('.nav-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
    $$('.tab-panel').forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === panelTab));
    const titles = {
      dashboard: 'À miser maintenant',
      cockpit: 'Cockpit pronostics',
      winners: 'Vainqueurs',
      goals: 'Buts',
      night: 'Paris de nuit',
      watch: 'À surveiller',
      combines: 'Combinés du jour',
      scorers: 'Buteurs & joueurs',
      matches: 'Tous les matchs Winamax',
      history: t('navHistory'),
      agent: 'Agent',
      data: 'Avancé',
      search: t('navSearch'),
      calendar: 'Calendrier',
      pipeline: 'Pipeline',
      help: 'Aide',
      preferences: t('navSettings')
    };
    $('#page-title').textContent = titles[tab] || 'Paris-Sportif';
    if (panelTab === 'dashboard' && !cockpitCategory) {
      const fold = $('#cockpit-detail-section');
      if (fold) fold.open = false;
      renderPicks();
    }
    if (cockpitCategory) {
      setTimeout(() => openCockpitCategory(cockpitCategory), 20);
    }
    if (panelTab === 'calendar') renderCalendar();
    if (panelTab === 'search') renderDeepSearch();
    if (panelTab === 'pipeline') renderPipelinePanel(state.status);
    if (panelTab === 'help') renderHelp();
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
    const picks = state.picks.filter((pick) => canDisplayStake(pick) && displayEdgeValue(pick) > 0);
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
        displayEdgeValue(pick).toFixed(4),
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
          edge: displayEdgeValue(row),
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
      displayEdgeValue(row).toFixed(4),
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
    showToast(`Export ${exportKindFromType(type)} généré`, filename, 'ok');
  }

  // Sprint 66 — toast générique réutilisable (export, track-bet, etc.)
  function showToast(title, subtitle, tone = 'ok') {
    const toast = $('#export-toast');
    if (!toast) return;
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const safeTitle = escapeHtml(String(title || ''));
    const safeSub = escapeHtml(`${subtitle || ''}${subtitle ? ' · ' : ''}${now}`);
    toast.innerHTML = `<strong>${safeTitle}</strong><span>${safeSub}</span>`;
    toast.classList.remove('hidden');
    toast.classList.remove('toast-warn', 'toast-info', 'toast-ok');
    toast.classList.add(`toast-${tone === 'warn' ? 'warn' : tone === 'info' ? 'info' : 'ok'}`);
    clearTimeout(state.exportTimer);
    state.exportTimer = setTimeout(() => toast.classList.add('hidden'), 4500);
  }
  try { window.showToast = showToast; } catch { /* noop */ }

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
      winamaxMarketAudit: state.winamaxMarketAudit || null,
      winamaxPromos: state.winamaxPromos || null,
      clvSummary: state.clvSummary || null,
      userLearningAudit: readStorageJson(USER_AUDIT_KEY, null),
      bankrollTransactions: loadBankrollTransactions(),
      weeklyReports: readStorageJson(WEEKLY_REPORT_KEY, []),
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
    const liveNoteButton = event.target.closest('[data-live-note-key]');
    if (liveNoteButton) {
      event.preventDefault();
      event.stopPropagation();
      if (event.type === 'keydown') return;
      saveLiveQuickNote(liveNoteButton.dataset.liveNoteKey || '', liveNoteButton.dataset.liveNote || 'Observation live');
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
    $('#help-panel-btn')?.addEventListener('click', () => {
      recordUserAction('help', 'panel');
      $('#help-panel')?.classList.remove('hidden');
    });
    $('#help-panel-close')?.addEventListener('click', () => $('#help-panel')?.classList.add('hidden'));
    $('#help-demo-tour-btn')?.addEventListener('click', () => {
      $('#help-panel')?.classList.add('hidden');
      startDemoTour({ force: true });
    });
    $('#help-bug-report-btn')?.addEventListener('click', () => {
      $('#help-panel')?.classList.add('hidden');
      showBugReportModal({ type: 'manual', description: '' });
    });
    $('#daily-suggestion-dismiss')?.addEventListener('click', () => {
      localStorage.setItem(DAILY_SUGGESTION_DISMISS_KEY, parisDayKey());
      renderDailySuggestion();
    });
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
    $('#save-current-strategy-btn')?.addEventListener('click', saveCurrentStrategy);
    $('#saved-strategy-select')?.addEventListener('change', (event) => {
      const strategy = loadSavedStrategies().find((row) => row.id === event.target.value);
      if (strategy) {
        applyPickFilterSnapshot(strategy.filters);
        setSideStatus(`Stratégie appliquée : ${strategy.name}`, 'ok');
      }
    });
    $('#custom-dashboard')?.addEventListener('click', (event) => {
      const presetButton = event.target.closest('[data-dashboard-preset]');
      const resetButton = event.target.closest('[data-dashboard-reset]');
      if (presetButton) {
        const prefs = { ...loadPreferences(), dashboardPreset: presetButton.dataset.dashboardPreset || 'matin', dashboardCustom: true, expertMode: true };
        savePreferences(prefs);
        renderPreferences();
        renderCustomDashboard(state.currentDashboardRows.length ? state.currentDashboardRows : state.picks);
        setSideStatus(`Preset ${prefs.dashboardPreset} activé`, 'ok');
      } else if (resetButton) {
        const preset = loadPreferences().dashboardPreset || 'matin';
        saveDashboardLayout(preset, defaultDashboardLayout(preset));
        renderCustomDashboard(state.currentDashboardRows.length ? state.currentDashboardRows : state.picks);
        setSideStatus('Dashboard custom réinitialisé', 'ok');
      }
    });
    $('#custom-dashboard-grid')?.addEventListener('dragstart', (event) => {
      const card = event.target.closest('[data-bento-widget]');
      if (!card) return;
      state.bentoDragId = card.dataset.bentoWidget || null;
      card.classList.add('dragging');
      card.setAttribute('aria-grabbed', 'true');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', state.bentoDragId || '');
    });
    $('#custom-dashboard-grid')?.addEventListener('dragover', (event) => {
      const target = event.target.closest('[data-bento-widget]');
      if (!target || !state.bentoDragId || target.dataset.bentoWidget === state.bentoDragId) return;
      event.preventDefault();
      target.classList.add('drag-over');
    });
    $('#custom-dashboard-grid')?.addEventListener('dragleave', (event) => {
      event.target.closest('[data-bento-widget]')?.classList.remove('drag-over');
    });
    $('#custom-dashboard-grid')?.addEventListener('drop', (event) => {
      const grid = $('#custom-dashboard-grid');
      const target = event.target.closest('[data-bento-widget]');
      const dragged = state.bentoDragId ? grid?.querySelector(`[data-bento-widget="${CSS.escape(state.bentoDragId)}"]`) : null;
      if (!grid || !target || !dragged || target === dragged) return;
      event.preventDefault();
      const rect = target.getBoundingClientRect();
      const before = event.clientY < rect.top + rect.height / 2;
      grid.insertBefore(dragged, before ? target : target.nextSibling);
      saveCurrentDashboardOrder();
      setSideStatus('Dashboard custom mémorisé', 'ok');
      target.classList.remove('drag-over');
    });
    $('#custom-dashboard-grid')?.addEventListener('dragend', () => {
      document.querySelectorAll('#custom-dashboard-grid .dragging, #custom-dashboard-grid .drag-over').forEach((node) => {
        node.classList.remove('dragging', 'drag-over');
        node.setAttribute('aria-grabbed', 'false');
      });
      state.bentoDragId = null;
    });
    $('#market-scanner-section')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-open-combines]');
      if (!button) return;
      const section = $('#simple-combines-section');
      if (section) {
        section.open = true;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setSideStatus('Combinés du jour ouverts depuis le scanner', 'ok');
      }
    });
    // Sprint 67 — Persistance etat ouvert/ferme du fold "Filtres et marches"
    const pickToolbarFold = $('#pick-toolbar-fold');
    if (pickToolbarFold) {
      const STORAGE_KEY = 'parisSportif.pickToolbarFoldOpen';
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === '0') pickToolbarFold.open = false;
        else if (saved === '1') pickToolbarFold.open = true;
      } catch { /* noop */ }
      pickToolbarFold.addEventListener('toggle', () => {
        try { localStorage.setItem(STORAGE_KEY, pickToolbarFold.open ? '1' : '0'); } catch { /* noop */ }
      });
    }
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
    $('#deep-analytics-insights')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-apply-analytics-pref]');
      if (!button) return;
      const dimension = button.dataset.applyAnalyticsPref || '';
      const value = button.dataset.analyticsValue || '';
      writeStorageJson(ANALYTICS_FILTER_KEY, { dimension, value, savedAt: new Date().toISOString() });
      setSideStatus(`Filtre conseillé mémorisé : ${value}`, 'ok');
    });
    $('#deep-search-input')?.addEventListener('input', () => {
      state.deepSearchSelection = null;
      renderDeepSearch();
    });
    $('#deep-search-results')?.addEventListener('click', (event) => {
      const card = event.target.closest('[data-search-entity]');
      if (!card) return;
      state.deepSearchSelection = card.dataset.searchEntity || null;
      renderDeepSearch();
    });
    $('#run-compare-btn')?.addEventListener('click', renderSearchComparison);
    $('#pref-language')?.addEventListener('change', (event) => applyI18n(event.target.value || 'fr'));
    $('#pref-expert-mode')?.addEventListener('change', (event) => {
      const prefs = { ...loadPreferences(), expertMode: Boolean(event.target.checked) };
      savePreferences(prefs);
      applyExpertMode();
      renderPreferences();
      renderPicks();
      setSideStatus(prefs.expertMode ? 'Mode expert actif' : 'Mode expert masqué', 'ok');
    });
    $('#pref-trading-desk')?.addEventListener('change', (event) => {
      const prefs = { ...loadPreferences(), tradingDesk: Boolean(event.target.checked), expertMode: loadPreferences().expertMode || Boolean(event.target.checked) };
      savePreferences(prefs);
      applyExpertMode();
      renderPreferences();
      renderPicks();
      setSideStatus(prefs.tradingDesk ? 'Trading Desk actif' : 'Trading Desk désactivé', 'ok');
    });
    $('#run-auto-tracking-btn')?.addEventListener('click', () => {
      applyPreferences(collectPreferencesFromForm());
      runAutoTracking({ manual: true });
    });
    $('#stop-auto-tracking-btn')?.addEventListener('click', stopAutoTracking);
    $('#preview-winamax-import-btn')?.addEventListener('click', previewWinamaxImport);
    $('#confirm-winamax-import-btn')?.addEventListener('click', confirmWinamaxImport);
    $('#trading-desk')?.addEventListener('click', (event) => {
      const row = event.target.closest('[data-trading-index]');
      if (!row) return;
      state.tradingIndex = Number(row.dataset.tradingIndex || 0) || 0;
      renderTradingDesk();
    });
    document.addEventListener('click', (event) => {
      const sortButton = event.target.closest('[data-home-sort]');
      if (sortButton) {
        event.preventDefault();
        setHomeSort(sortButton.dataset.homeSort || 'confidence');
        return;
      }
      const tabButton = event.target.closest('[data-tab-target]');
      if (tabButton) switchTab(tabButton.dataset.tabTarget || 'dashboard');
      const cockpitCategory = event.target.closest('[data-cockpit-category]');
      if (cockpitCategory) {
        event.preventDefault();
        openCockpitCategory(cockpitCategory.dataset.cockpitCategory || 'cockpit');
        return;
      }
      const picksModeButton = event.target.closest('[data-picks-view-mode]');
      if (picksModeButton) {
        try {
          localStorage.setItem(PICKS_VIEW_MODE_KEY, picksModeButton.dataset.picksViewMode || 'time');
        } catch {
          // Le choix de vue est un confort : si le profil bloque l'écriture, on garde la vue courante.
        }
        renderTemporalCockpit(dashboardPickRows(readPickFilters()));
      }
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
      const cancel = event.target.closest('[data-cancel-auto-bet-id]');
      if (cancel) {
        cancelAutoTrackedBet(cancel.dataset.cancelAutoBetId || '');
        return;
      }
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
    $('#install-update-btn')?.addEventListener('click', prepareUpdateInstall);
    $('#update-modal-close')?.addEventListener('click', closeUpdateModal);
    $('#update-modal-later-btn')?.addEventListener('click', closeUpdateModal);
    $('#update-modal-install-btn')?.addEventListener('click', prepareUpdateInstall);
    $('#update-modal-notes-btn')?.addEventListener('click', () => {
      const url = state.updateStatus?.releaseUrl;
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
      else setSideStatus('Aucune page release disponible', 'warn');
    });
    $('#update-modal')?.addEventListener('click', (event) => {
      if (event.target.id === 'update-modal') closeUpdateModal();
    });
    $('#manual-bug-report-btn')?.addEventListener('click', () => showBugReportModal({ type: 'manual', description: '' }));
    $('#bug-report-close')?.addEventListener('click', closeBugReportModal);
    $('#bug-report-later')?.addEventListener('click', closeBugReportModal);
    $('#bug-report-never')?.addEventListener('click', () => {
      localStorage.setItem(BUG_REPORT_PROMPT_KEY, 'never');
      const prefs = { ...loadPreferences(), bugReportPrompt: false };
      savePreferences(prefs);
      renderPreferences();
      closeBugReportModal();
    });
    $('#bug-report-send')?.addEventListener('click', async () => {
      const status = $('#bug-report-status');
      const draft = state.bugReportDraft || { type: 'manual' };
      try {
        const description = ($('#bug-report-description')?.value || draft.description || '').trim();
        const response = await sendBugReport({ ...draft, description });
        if (status) status.textContent = response.report?.sent ? 'Rapport envoyé.' : 'Rapport sauvegardé localement.';
        renderBugReportList();
        setTimeout(closeBugReportModal, 650);
      } catch (error) {
        if (status) status.textContent = `Rapport impossible : ${error.message}`;
      }
    });
    $('#bug-report-modal')?.addEventListener('click', (event) => {
      if (event.target.id === 'bug-report-modal') closeBugReportModal();
    });
    $('#shortcut-settings-grid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-shortcut-edit]');
      if (!button) return;
      const action = button.dataset.shortcutEdit;
      state.shortcutCaptureAction = state.shortcutCaptureAction === action ? null : action;
      renderShortcutSettings();
      const status = $('#shortcut-capture-status');
      if (status) status.textContent = state.shortcutCaptureAction ? 'Tape la nouvelle combinaison.' : 'Capture annulée.';
    });
    $('#reset-shortcuts-btn')?.addEventListener('click', () => {
      saveShortcuts(DEFAULT_SHORTCUTS);
      state.shortcutCaptureAction = null;
      renderShortcutSettings();
      setSideStatus('Raccourcis réinitialisés', 'ok');
    });
    $('#export-profile-btn')?.addEventListener('click', exportProfile);
    $('#import-profile-btn')?.addEventListener('click', () => $('#profile-import-input')?.click());
    // Sprint 72 G5 — Export / clear logs erreurs
    const refreshErrorLogsCount = () => {
      try {
        const raw = localStorage.getItem('paris_sportif_js_errors_v1');
        const arr = raw ? JSON.parse(raw) : [];
        const n = Array.isArray(arr) ? arr.length : 0;
        const node = $('#error-logs-count');
        if (node) node.textContent = n === 0 ? 'Aucun log d\'erreur capturé.' : `${n} log(s) d'erreur capturé(s) localement.`;
      } catch { /* noop */ }
    };
    refreshErrorLogsCount();
    $('#export-error-logs-btn')?.addEventListener('click', () => {
      try {
        const raw = localStorage.getItem('paris_sportif_js_errors_v1') || '[]';
        const blob = new Blob([raw], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `paris-sportif-errors-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('📋 Logs d\'erreur exportés', a.download, 'ok');
      } catch (e) { setSideStatus('Export logs impossible', 'danger'); }
    });
    $('#clear-error-logs-btn')?.addEventListener('click', async () => {
      const ok = typeof window._showConfirm === 'function'
        ? await window._showConfirm({ title: 'Vider les logs ?', body: 'Cette action efface tous les logs d\'erreur stockés localement.', confirmLabel: 'Vider', cancelLabel: 'Annuler', danger: true })
        : true;
      if (!ok) return;
      try { localStorage.removeItem('paris_sportif_js_errors_v1'); } catch { /* noop */ }
      refreshErrorLogsCount();
      showToast('🗑 Logs d\'erreur vidés', '', 'info');
    });
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
      localStorage.removeItem(DEMO_TOUR_KEY);
      renderUserPnl();
      renderHistory();
      renderPicks();
      scheduleProfileBackup({ force: true });
      setSideStatus('Démo réinitialisée', 'ok');
    });
    $('#add-bankroll-transaction-btn')?.addEventListener('click', addBankrollTransaction);
    $('#force-weekly-report-btn')?.addEventListener('click', () => maybeShowWeeklyReport({ force: true }));
    $('#force-evening-brief-btn')?.addEventListener('click', () => maybeShowEveningBrief({ force: true }));
    $('#start-demo-tour-btn')?.addEventListener('click', () => startDemoTour({ force: true }));
    $('#pref-theme')?.addEventListener('change', () => {
      const prefs = { ...loadPreferences(), theme: $('#pref-theme')?.value || 'dark' };
      savePreferences(prefs);
      applyTheme(prefs);
    });
    ['favorite-team-search', 'favorite-player-search'].forEach((id) => {
      const input = $(`#${id}`);
      if (input) input.addEventListener('input', renderFavoritePreferences);
    });
    ['favorite-team-suggestions', 'favorite-player-suggestions', 'favorite-selected-list'].forEach((id) => {
      const node = $(`#${id}`);
      if (!node) return;
      node.addEventListener('click', (event) => {
        const add = event.target.closest('[data-favorite-add]');
        const remove = event.target.closest('[data-favorite-remove]');
        if (add) addFavorite(add.dataset.favoriteAdd || 'teams', add.dataset.favoriteValue || add.textContent || '');
        if (remove) removeFavorite(remove.dataset.favoriteRemove || 'teams', remove.dataset.favoriteValue || remove.textContent || '');
      });
    });
    $('#weekly-report-close')?.addEventListener('click', closeWeeklyReportModal);
    $('#weekly-report-detail')?.addEventListener('click', () => {
      closeWeeklyReportModal();
      switchTab('history');
    });
    $('#weekly-report-export')?.addEventListener('click', () => {
      exportWeeklyReportPdf().catch((error) => setSideStatus(`Export rapport impossible : ${error.message}`, 'warn'));
    });
    $('#weekly-report-modal')?.addEventListener('click', (event) => {
      if (event.target.id === 'weekly-report-modal') closeWeeklyReportModal();
    });
    $('#evening-brief-close')?.addEventListener('click', closeEveningBriefModal);
    $('#evening-brief-detail')?.addEventListener('click', () => {
      closeEveningBriefModal();
      switchTab('history');
    });
    $('#evening-brief-modal')?.addEventListener('click', (event) => {
      if (event.target.id === 'evening-brief-modal') closeEveningBriefModal();
    });
    $('#demo-tour-close')?.addEventListener('click', closeDemoTour);
    $('#demo-tour-skip')?.addEventListener('click', closeDemoTour);
    $('#demo-tour-next')?.addEventListener('click', nextDemoTourStep);
    $('#demo-tour-modal')?.addEventListener('click', (event) => {
      if (event.target.id === 'demo-tour-modal') closeDemoTour();
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
    ['home-top3-grid', 'home-picks-table-body', 'ultimate-bet-card', 'ready-picks-hero', 'live-cockpit', 'time-cockpit', 'simple-pick-timeline', 'favorite-picks-grid', 'simple-scorers-grid', 'bankroll-allocation-grid', 'picks-body', 'stake-scenario-body', 'watchlist-grid', 'prematch-final-grid', 'matches-body', 'combines-list', 'scorers-list', 'agent-positions-body', 'agent-blockers-body', 'deep-search-detail'].forEach((id) => {
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
    // Sprint 67 — Boutons prev/next dans la modal
    $('#modal-prev')?.addEventListener('click', () => navigateModal('prev'));
    $('#modal-next')?.addEventListener('click', () => navigateModal('next'));
    // Sprint 71 — Bouton mode focus depuis la modal
    $('#modal-focus-btn')?.addEventListener('click', () => {
      const id = state.modalCurrentId;
      if (!id) return;
      const row = findMatchRow(id);
      if (!row) return;
      closeMatchDetail();
      openFocusMode(row);
    });
    // Sprint 67 — Raccourcis clavier ← → quand modal ouverte
    document.addEventListener('keydown', (event) => {
      const modal = $('#match-modal');
      if (!modal || modal.classList.contains('hidden')) return;
      // Ne pas intercepter dans inputs/textarea
      const t = event.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); navigateModal('prev'); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); navigateModal('next'); }
    });
    // Sprint 84 E4 — Swipe gestures gauche/droite sur la modal mobile
    let touchStartX = null;
    let touchStartY = null;
    const SWIPE_MIN_DELTA = 60;
    const SWIPE_MAX_VERTICAL = 80;
    $('#match-modal')?.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive: true });
    $('#match-modal')?.addEventListener('touchend', (event) => {
      if (touchStartX === null) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      touchStartX = null;
      touchStartY = null;
      if (Math.abs(dy) > SWIPE_MAX_VERTICAL) return; // user a scrolle, pas swipe horizontal
      if (Math.abs(dx) < SWIPE_MIN_DELTA) return;
      if (dx > 0) navigateModal('prev'); else navigateModal('next');
    }, { passive: true });
    // Sprint 73 D10 — Hover preview au survol des lignes du tableau picks
    let hoverPreviewEl = null;
    let hoverPreviewTimer = null;
    const ensureHoverPreview = () => {
      if (!hoverPreviewEl) {
        hoverPreviewEl = document.createElement('div');
        hoverPreviewEl.className = 'hover-preview';
        document.body.appendChild(hoverPreviewEl);
      }
      return hoverPreviewEl;
    };
    const positionHoverPreview = (el, x, y) => {
      const margin = 12;
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const rect = el.getBoundingClientRect();
      let left = x + margin;
      let top = y + margin;
      if (left + rect.width + margin > winW) left = x - rect.width - margin;
      if (top + rect.height + margin > winH) top = y - rect.height - margin;
      el.style.left = `${Math.max(margin, left)}px`;
      el.style.top = `${Math.max(margin, top)}px`;
    };
    const showHoverPreview = (row, mouseEvent) => {
      if (!row) return;
      const el = ensureHoverPreview();
      const conf = Math.round(Number(row?.safeAssessment?.confidence || row?.probability || 0) * 100);
      const edgeRaw = Number(row?.edge || 0);
      const edgeTxt = `${edgeRaw > 0 ? '+' : ''}${(edgeRaw * 100).toFixed(1)}pt`;
      const stake = (typeof visibleStakeText === 'function') ? visibleStakeText(row) : `${Number(row?.stake || 0).toFixed(2)} €`;
      el.innerHTML = `
        <div class="hover-preview-title">${escapeHtml(row.title || '')}</div>
        <div class="hover-preview-kpis">
          <div class="hover-preview-kpi"><span>Confiance</span><strong>${conf}%</strong></div>
          <div class="hover-preview-kpi"><span>Avantage</span><strong>${edgeTxt}</strong></div>
          <div class="hover-preview-kpi"><span>Mise</span><strong>${escapeHtml(stake)}</strong></div>
        </div>`;
      positionHoverPreview(el, mouseEvent.clientX, mouseEvent.clientY);
      el.classList.add('visible');
    };
    const hideHoverPreview = () => {
      if (hoverPreviewEl) hoverPreviewEl.classList.remove('visible');
      if (hoverPreviewTimer) { clearTimeout(hoverPreviewTimer); hoverPreviewTimer = null; }
    };
    document.addEventListener('mouseover', (event) => {
      const tr = event.target.closest('tr.clickable-row[data-match-id]');
      if (!tr) return;
      const id = tr.dataset.matchId;
      if (!id) return;
      const row = findMatchRow(id);
      if (!row) return;
      if (hoverPreviewTimer) clearTimeout(hoverPreviewTimer);
      hoverPreviewTimer = setTimeout(() => showHoverPreview(row, event), 600);
    });
    document.addEventListener('mouseout', (event) => {
      const tr = event.target.closest('tr.clickable-row[data-match-id]');
      if (tr) hideHoverPreview();
    });
    document.addEventListener('scroll', hideHoverPreview, { capture: true });

    // Sprint 72 B4 — Sub-tabs Bilan (filter sections par focus)
    const HISTORY_SUBTAB_KEY = 'parisSportif.historySubtab';
    function applyHistorySubtab(name) {
      const valid = ['overview', 'my-month', 'patterns', 'accounting'];
      const target = valid.includes(name) ? name : 'overview';
      $$('.history-subtab').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.historySubtab === target);
        btn.setAttribute('aria-selected', btn.dataset.historySubtab === target ? 'true' : 'false');
      });
      $$('.history-section').forEach((el) => {
        el.classList.toggle('history-section-hidden', el.dataset.historySection !== target);
      });
      try { localStorage.setItem(HISTORY_SUBTAB_KEY, target); } catch { /* noop */ }
    }
    try {
      const saved = localStorage.getItem(HISTORY_SUBTAB_KEY) || 'overview';
      applyHistorySubtab(saved);
    } catch { applyHistorySubtab('overview'); }
    $$('.history-subtab').forEach((btn) => {
      btn.addEventListener('click', () => applyHistorySubtab(btn.dataset.historySubtab));
    });

    // Sprint 69 — Cmd-K palette : Cmd/Ctrl+K pour ouvrir
    document.addEventListener('keydown', (event) => {
      const isMeta = event.ctrlKey || event.metaKey;
      if (isMeta && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const bd = $('#cmd-k-backdrop');
        if (bd?.classList.contains('hidden')) openCmdK();
        else closeCmdK();
        return;
      }
      const bd = $('#cmd-k-backdrop');
      if (!bd || bd.classList.contains('hidden')) return;
      if (event.key === 'Escape') { event.preventDefault(); closeCmdK(); return; }
      const results = bd.querySelectorAll('.cmd-k-result');
      if (!results.length) return;
      const activeIdx = Array.from(results).findIndex((r) => r.classList.contains('active'));
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const next = Math.min(results.length - 1, activeIdx + 1);
        results.forEach((r, i) => r.classList.toggle('active', i === next));
        results[next].scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const prev = Math.max(0, activeIdx - 1);
        results.forEach((r, i) => r.classList.toggle('active', i === prev));
        results[prev].scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const active = results[activeIdx >= 0 ? activeIdx : 0];
        if (active) executeCmdKAction(active.dataset.cmdkId);
      }
    });
    $('#cmd-k-input')?.addEventListener('input', (event) => {
      renderCmdKResults(event.target.value);
    });
    $('#cmd-k-results')?.addEventListener('click', (event) => {
      const li = event.target.closest('.cmd-k-result');
      if (!li) return;
      executeCmdKAction(li.dataset.cmdkId);
    });
    $('#cmd-k-backdrop')?.addEventListener('click', (event) => {
      if (event.target.id === 'cmd-k-backdrop') closeCmdK();
    });
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
        if (state.shortcutCaptureAction) {
          state.shortcutCaptureAction = null;
          renderShortcutSettings();
        }
        closeFocusMode();
        closeLossFeedbackPrompt();
        closeWeeklyReportModal();
        closeUpdateModal();
        closeBugReportModal();
        closeMatchDetail();
      }
      applyShortcutEvent(event);
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
    // Sprint 63 — bouton "+ Tour démo" dans l'onboarding card
    $('#onboarding-tour-btn')?.addEventListener('click', () => {
      const level = $('#onboarding-level')?.value || 'intermediate';
      applyPreferences({
        ...DEFAULT_PREFERENCES,
        ...levelDefaults(level),
        bankroll: Math.max(10, Number($('#onboarding-bankroll')?.value || 50) || 50),
        level
      });
      startDemoTour({ force: true });
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
    installGlobalErrorReporting();
    installPerformanceObserver();
    applyTheme(loadPreferences());
    pushLog('info', 'Démarrage du cockpit desktop');
    markAppSessionStart();
    bindEvents();
    state.actionHistory = readActionHistory();
    state.aiAssist = readStorageJson(AI_ENGINE_KEY, null);
    state.webEnrichments = readStorageJson(WEB_ENRICHMENT_KEY, null);
    state.newsWatcher = readStorageJson(NEWS_WATCHER_KEY, null);
    state.updateStatus = readStorageJson(UPDATE_STATUS_KEY, null);
    loadBugReports().catch(() => {});
    renderActionHistory();
    updateWebEnrichmentSummary();
    const storedBankroll = Number(localStorage.getItem('userBankroll') || loadPreferences().bankroll || 50);
    if (Number.isFinite(storedBankroll) && storedBankroll > 0) $('#bankroll-input').value = String(storedBankroll);
    switchTab('dashboard');
    renderUserPnl();
    renderPreferences();
    const statusPromise = refreshStatus();
    const logPromise = refreshLog().catch(() => null);
    fetchJson('/api/app-info').then((info) => {
      state.appInfo = info || null;
      renderPreferences();
    }).catch((error) => pushLog('warn', `Info application indisponible: ${error.message}`));
    await statusPromise;
    await computePicks();
    maybeShowWeeklyReport();
    maybeShowEveningBrief();
    if (loadPreferences().demoMode && localStorage.getItem(DEMO_TOUR_KEY) !== '1') {
      setTimeout(() => startDemoTour(), 800);
    }
    loadWebEnrichmentState().catch(() => {});
    loadNewsWatcherState().catch(() => {});
    setTimeout(() => checkForUpdates().catch(() => {}), 2500);
    await logPromise;
    setSideStatus('Calcul prêt', 'ok');
    // Sprint 44 (P4 audit) : force-refresh au boot si data > 30 min.
    // L'utilisateur ferme l'app la nuit et au matin la data est obsolète.
    // Un refresh quick au démarrage garantit qu'il voit les picks frais
    // sans intervention manuelle.
    try {
      const generatedAt = Date.parse(state.engine?.generatedAt || state.engine?.data?.generated_at || '');
      const ageMs = Number.isFinite(generatedAt) ? Date.now() - generatedAt : Infinity;
      if (ageMs > 30 * 60 * 1000 && !state.status?.refresh?.running) {
        setSideStatus('Données > 30 min — refresh auto au boot', 'warn');
        setTimeout(() => {
          startRefresh('quick').catch((error) => {
            setSideStatus(`Boot refresh impossible: ${error.message}`, 'warn');
          });
        }, 1500);
      }
    } catch {
      // pas grave — l'auto-refresh interval prend le relais
    }
    scheduleBackgroundRefresh();
    renderBootPerformance();
    renderRefreshPolicy();
    setInterval(() => refreshStatus().catch(() => {}), 30000);
    // Sprint 44 (P3 audit) : refreshLog et renderRefreshPolicy étaient
    // appelés toutes les 5s et 1s respectivement — overkill qui contribuait
    // au pic mémoire 671 MB observé en stress test. Cadence ramenée à 30s
    // et 15s pour rester réactif sans hammerer l'UI.
    setInterval(() => refreshLog().catch(() => {}), 30000);
    setInterval(renderRefreshPolicy, 15000);
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

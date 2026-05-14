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
    refreshTimer: null,
    backgroundRefreshTimer: null,
    exportTimer: null,
    actionHistory: []
  };

  const ACTION_HISTORY_KEY = 'parisSportifActionHistory';
  const USER_BETS_KEY = 'parisSportifUserBets';
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
      const rows = JSON.parse(localStorage.getItem(USER_BETS_KEY) || '[]');
      return Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : [];
    } catch {
      return [];
    }
  }

  function saveUserBets(rows) {
    try {
      localStorage.setItem(USER_BETS_KEY, JSON.stringify(Array.isArray(rows) ? rows : []));
    } catch {
      setSideStatus('Suivi pari indisponible', 'warn');
    }
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
    const today = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    let totalStake = 0;
    let settledStake = 0;
    let pnlTotal = 0;
    let pnlToday = 0;
    let pending = 0;
    for (const bet of bets) {
      const stake = Math.max(0, Number(bet.stake || 0) || 0);
      const pnl = Number(bet.pnl || 0) || 0;
      totalStake += stake;
      if (bet.status === 'pending') pending += 1;
      if (bet.status === 'won' || bet.status === 'lost' || bet.status === 'void') {
        settledStake += stake;
        pnlTotal += pnl;
      }
      if (String(bet.day || '').slice(0, 10) === today) pnlToday += pnl;
    }
    return {
      bets: bets.length,
      pending,
      totalStake,
      settledStake,
      pnlTotal,
      pnlToday,
      roi: settledStake > 0 ? pnlTotal / settledStake : 0
    };
  }

  function renderUserPnl() {
    const stats = userBetStats();
    const totalNode = $('#user-pnl-total');
    const subNode = $('#user-pnl-sub');
    if (totalNode) totalNode.textContent = formatMoney(stats.pnlTotal);
    if (subNode) {
      subNode.textContent = `Jour ${formatMoney(stats.pnlToday)} · ROI ${formatPct(stats.roi, 1)} · ${formatCount(stats.pending)} en cours`;
    }
  }

  function trackUserBet(row) {
    if (!row || !canDisplayStake(row)) return;
    const key = userBetKey(row);
    const bets = loadUserBets();
    const existing = bets.find((bet) => bet.key === key && bet.status === 'pending');
    if (existing) {
      setSideStatus('Pari déjà suivi', 'warn');
      return;
    }
    const now = new Date();
    const stake = Math.max(0, Number(row.stake || row.decisionCenter?.stake || 0) || 0);
    bets.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      key,
      matchId: row.id,
      title: row.title,
      sport: row.sport,
      league: row.league,
      start: row.start,
      market: row.market,
      label: row.label,
      odd: Number(row.odd || 0),
      probability: Number(row.probability || 0),
      edge: Number(row.edge || 0),
      stake,
      status: 'pending',
      pnl: 0,
      day: new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now),
      createdAt: now.toISOString()
    });
    saveUserBets(bets);
    renderUserPnl();
    renderPicks();
    renderStakeScenarios();
    setSideStatus('Pari ajouté au suivi', 'ok');
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
    const rows = [...state.matches, ...state.picks];
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
    const raw = Number($('#bankroll-input').value || localStorage.getItem('userBankroll') || 50);
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
      'hockeytotal': 'Total buts',
      'baseballtotal': 'Total runs',
      'httotal': 'Total mi-temps',
      'htou': 'Total mi-temps',
      'btts': 'BTTS',
      'doublechance': 'Double chance',
      'handicap': 'Handicap',
      'dnb': 'Remboursé si nul',
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
    if (status && status.ageMinutes > 240) {
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
    $('#metric-upcoming').textContent = String(state.matches.length);
    $('#metric-bookable').textContent = `${state.matches.length} analysés par le logiciel`;
    renderPicks();
    renderStakeScenarios();
    renderCombines();
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
    }
    maybeAutoCriticalRefresh();
    maybeAutoPrematchRefresh();
  }

  function updatePickFilters() {
    const pool = state.allPicks.length ? state.allPicks : state.picks;
    const sportSelect = $('#pick-sport-filter');
    const leagueSelect = $('#pick-league-filter');
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
  }

  function readPickFilters() {
    const edgeValue = Number(($('#pick-edge-min')?.value || '').replace(',', '.'));
    const oddValue = Number(($('#pick-odd-min')?.value || '').replace(',', '.'));
    return {
      query: ($('#pick-search')?.value || '').trim().toLowerCase(),
      sport: $('#pick-sport-filter')?.value || 'all',
      league: $('#pick-league-filter')?.value || 'all',
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
    return Boolean(filters.query || filters.sport !== 'all' || filters.league !== 'all' || filters.edgeMin || filters.oddMin || filters.sort !== 'edge');
  }

  function dashboardPickRows(filters) {
    const active = pickFiltersActive(filters);
    const base = active && state.allPicks.length ? state.allPicks : state.picks;
    const rows = base.filter((row) => {
      if (!canDisplayStake(row)) return false;
      if (filters.query && !pickSearchText(row).includes(filters.query)) return false;
      if (filters.sport !== 'all' && row.sport !== filters.sport) return false;
      if (filters.league !== 'all' && leagueKeyFromRow(row) !== filters.league) return false;
      if (filters.edgeMin && Number(row.edge || 0) < filters.edgeMin) return false;
      if (filters.oddMin && Number(row.odd || 0) < filters.oddMin) return false;
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

  function renderPicks(emptyMessage) {
    const body = $('#picks-body');
    const metricLabel = $('#metric-picks-label');
    renderUserPnl();
    updatePickFilters();
    const filters = readPickFilters();
    const displayRows = dashboardPickRows(filters);
    const total = state.allPicks.length || state.picks.length || 0;
    const meta = state.dashboardMeta || {};
    const ready = Number(state.decisionCenter?.summary?.ready || meta.readyPicks || 0);
    if (metricLabel) metricLabel.textContent = ready > 0 ? 'Paris prêts' : 'Candidats surveillés';
    $('#metric-picks').textContent = String(ready > 0 ? ready : (state.picks.length || 0));
    const globalBlocked = Boolean(state.decisionCenter?.summary?.blocked);
    const caption = pickFiltersActive(filters)
      ? `${formatCount(displayRows.length)} pick(s) filtré(s) sur ${formatCount(total)} lignes prêtes.`
      : meta.mode === 'bestAvailable'
        ? 'Moins de 10 picks prêts dans les 30 prochaines heures : affichage des meilleurs picks disponibles.'
        : ready > 0
          ? 'Fenêtre proche : seuls les picks prêts affichent une mise.'
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
      return;
    }
    const tracked = new Set(loadUserBets().filter((bet) => bet.status === 'pending').map((bet) => bet.key));
    body.innerHTML = displayRows.map((pick) => {
      const startLabel = formatDateLabel(pick.start);
      const edgeClass = pick.edge >= 0.08 ? 'edge-pos' : 'edge-warn';
      const decision = pick.decisionCenter || {};
      const statusText = decision.canBet ? 'Prêt' : decision.status === 'repair' ? 'À réparer' : decision.status === 'skip' ? 'À éviter' : 'À surveiller';
      const trackKey = userBetKey(pick);
      const isTracked = tracked.has(trackKey);
      const action = canDisplayStake(pick)
        ? `<button type="button" class="track-bet-btn${isTracked ? ' tracked' : ''}" data-track-bet-key="${escapeHtml(trackKey)}">${isTracked ? 'Suivi' : 'Je mise'}</button>`
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
    wrap.innerHTML = state.combines.map((combo) => {
      const legs = Array.isArray(combo.legs) ? combo.legs : [];
      return `
        <article class="combo-card">
          <div class="combo-head">
            <div>
              <h4>${escapeHtml(combo.title)}</h4>
              <p class="match-sub">${escapeHtml(combo.desc || 'Ticket multi-marché')}</p>
            </div>
            <span class="pill">${combo.sameGame ? 'Same-game' : 'Multi-match'}</span>
          </div>
          <div class="combo-stats">
            <div class="mini-stat"><span>Cote</span><strong>${formatOdd(combo.totalOdd).replace('@', '')}</strong></div>
            <div class="mini-stat"><span>Proba</span><strong>${combo.combinedProb > 0 ? formatPct(combo.combinedProb, 1) : formatPct(combo.avgProb, 1)}</strong></div>
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
        </article>`;
    }).join('');
  }

  function scorerAvatarHtml(scorer) {
    if (scorer.playerId) {
      return `<img class="player-avatar" src="https://img.sofascore.com/api/v1/player/${encodeURIComponent(scorer.playerId)}/image" alt="">`;
    }
    const initial = cleanLabel(scorer.name, '?').trim().charAt(0).toUpperCase() || '?';
    return `<div class="avatar-fallback">${escapeHtml(initial)}</div>`;
  }

  function renderScorers() {
    const wrap = $('#scorers-list');
    if (!wrap) return;
    if (!state.scorers.length) {
      wrap.innerHTML = '<div class="empty">Aucun buteur probable exploitable avec les règles actuelles.</div>';
      return;
    }
    wrap.innerHTML = state.scorers.map((scorer) => {
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
          <p class="scorer-reasons">${escapeHtml(reasonText)}</p>
          <div class="scorer-footer">
            <div class="mini-stat"><span>Cote fair</span><strong>${formatOdd(scorer.impliedOdd)}</strong></div>
            <div class="mini-stat"><span>Départ</span><strong>${escapeHtml(formatDateLabel(scorer.start))}</strong></div>
            <div class="mini-stat"><span>Source</span><strong>${scorer.source === 'star_players' ? 'Profil' : 'Lineup'}</strong></div>
          </div>
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

  function renderHistory() {
    const history = state.history;
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

  function buildSourcesHtml(row) {
    const sources = Array.isArray(row.match?.context?.sources) ? row.match.context.sources : [];
    return `
      <section class="detail-tab-panel" data-detail-panel="sources">
        <div class="modal-grid">
          ${buildIdentityDetailHtml(row)}
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
    const signalCards = buildSignalCards(match, pred);
    const marketRows = buildMarketRows(markets);
    const h2hHtml = buildH2hHtml(match);
    const calibrationHtml = buildCalibrationDetailHtml(row);
    const blockList = blockReasons(row);
    const decisionTone = stakeAllowed ? 'ok' : dc.status === 'repair' ? 'warn' : dc.status === 'skip' ? 'danger' : 'watch';
    const signalPreview = signalCards.slice(0, 6);
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
              <span>Action</span><strong>${escapeHtml(readableAction)}</strong>
              <span>Bookmaker</span><strong>${winamaxLink}</strong>
            </div>
          </article>
        </div>
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
            <p class="detail-text">${escapeHtml(explanation)}</p>
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
    return canDisplayStake(row, decisions) && Number(row?.stake || 0) > 0 ? formatMoney(row.stake) : '0 €';
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
    $('#metric-age').textContent = formatAge(status.ageMinutes);
    $('#metric-generated').textContent = status.generatedAt ? new Date(status.generatedAt).toLocaleString('fr-FR') : '-';
    if (!state.matches.length) {
      $('#metric-upcoming').textContent = String(status.counts.bookable);
      $('#metric-bookable').textContent = `${status.counts.bookable} bookables Winamax exacts`;
    }

    const banner = $('#stale-banner');
    if (status.refresh?.running) {
      setSideStatus(`${refreshModeLabel(status.refresh.mode || 'quick')} en cours`, 'warn');
    } else if (status.status === 'blocked') {
      banner.classList.remove('hidden');
      banner.textContent = `Données trop anciennes (${formatAge(status.ageMinutes)}). Les recommandations sont bloquées tant qu'un refresh ne repasse pas sous 4h.`;
      setSideStatus('Données bloquées', 'danger');
    } else if (status.status === 'stale') {
      banner.classList.remove('hidden');
      banner.textContent = `Données à surveiller (${formatAge(status.ageMinutes)}). Refresh conseillé avant de miser.`;
      setSideStatus('Données à rafraîchir', 'warn');
    } else {
      banner.classList.add('hidden');
      setSideStatus(state.engineReady ? 'Calcul prêt' : 'Données prêtes', 'ok');
    }

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
    $('#refresh-signals-btn').textContent = running && isSignals ? `${sourceLabel} en cours` : 'Signaux lents';
    $('#refresh-prematch-btn').textContent = running && isPrematch ? 'Pré-match en cours' : 'Pré-match final';
    $('#refresh-prematch-t60-btn').textContent = running && isPrematchT60 ? 'T-60 en cours' : 'T-60';
    $('#refresh-prematch-t30-btn').textContent = running && isPrematchT30 ? 'T-30 en cours' : 'T-30';
    if ($('#refresh-prematch-t10-btn')) $('#refresh-prematch-t10-btn').textContent = running && isPrematchT10 ? 'T-10 en cours' : 'T-10';
    if (state.status) {
      state.status.refresh = status;
      renderRefreshSummary(state.status);
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
      data: 'Données'
    };
    $('#page-title').textContent = titles[tab] || 'Paris-Sportif';
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
      (canDisplayStake(pick) ? Number(pick.stake || 0) : 0).toFixed(2),
      pick.stakeAdjustment?.applied ? 'yes' : 'no',
      pick.stakeAdjustment?.applied ? Number(pick.stakeAdjustment.factor || 1).toFixed(2) : '1.00',
      pick.start,
      pick.winamaxUrl || ''
    ]);
    downloadText(`paris-sportif-desktop-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows), 'text/csv;charset=utf-8');
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
          stake: Number(row.stake || 0),
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
    const trackButton = event.target.closest('[data-track-bet-key]');
    if (trackButton) {
      event.preventDefault();
      event.stopPropagation();
      if (event.type === 'keydown') return;
      const row = findPickByTrackKey(trackButton.dataset.trackBetKey || '');
      trackUserBet(row);
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
    ['pick-search', 'pick-sport-filter', 'pick-league-filter', 'pick-sort', 'pick-edge-min', 'pick-odd-min'].forEach((id) => {
      const el = $(`#${id}`);
      if (!el) return;
      el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => renderPicks());
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
    ['picks-body', 'stake-scenario-body', 'watchlist-grid', 'prematch-final-grid', 'matches-body', 'combines-list', 'scorers-list', 'agent-positions-body', 'agent-blockers-body'].forEach((id) => {
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
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMatchDetail();
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
          '7': 'scorers'
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
      computePicks().catch(() => {});
    });
  }

  function scheduleBackgroundRefresh() {
    if (state.backgroundRefreshTimer) clearInterval(state.backgroundRefreshTimer);
    state.backgroundRefreshTimer = setInterval(() => {
      if (state.status?.refresh?.running) return;
      startRefresh('quick').catch((error) => {
        setSideStatus('Auto-refresh impossible', 'warn');
        $('#refresh-log').textContent = error.stack || error.message;
      });
    }, 30 * 60 * 1000);
  }

  async function boot() {
    bindEvents();
    state.actionHistory = readActionHistory();
    renderActionHistory();
    const storedBankroll = Number(localStorage.getItem('userBankroll') || 50);
    if (Number.isFinite(storedBankroll) && storedBankroll > 0) $('#bankroll-input').value = String(storedBankroll);
    switchTab('dashboard');
    renderUserPnl();
    await refreshStatus();
    await refreshLog();
    await reloadEngine();
    scheduleBackgroundRefresh();
    setInterval(() => refreshStatus().catch(() => {}), 30000);
    setInterval(() => refreshLog().catch(() => {}), 5000);
  }

  document.addEventListener('DOMContentLoaded', () => {
    boot().catch((error) => {
      console.error(error);
      setSideStatus('Erreur au démarrage', 'danger');
      renderPicks(`Erreur au démarrage : ${error.message}`);
    });
  });
}());

(function privacySocialModule() {
  'use strict';

  const VERSION = 'v37.019';
  const STORAGE = {
    ack: 'ps_privacy_ack_v2',
    friends: 'ps_social_friends_v1',
    goals: 'ps_social_goals_v1',
    badges: 'ps_badge_state_v1',
    snapshots: 'ps_profile_snapshots_v1',
    importDraft: 'ps_social_import_draft_v1'
  };
  const PRIVATE_PREFIXES = ['ps_', 'paris_sportif_', 'tracked', 'bet_', 'combo_'];
  const PRIVATE_KEYS = [
    'userBankroll',
    'userPrefs',
    'theme',
    'favoriteSports',
    'watchlist',
    'alertRules',
    'myBets',
    'trackedBets',
    'agentResetTs',
    'guide_seen',
    'profilAccordionState'
  ];

  const BADGES = [
    ['first_bet', 'Premier pari', 'Un pari suivi au compteur.', s => s.total >= 1],
    ['ten_bets', '10 paris', 'Dix paris suivis.', s => s.total >= 10],
    ['fifty_bets', '50 paris', 'Volume sérieux.', s => s.total >= 50],
    ['hundred_bets', '100 paris', 'Historique solide.', s => s.total >= 100],
    ['win_streak_3', 'Serie 3', 'Trois gains consecutifs.', s => s.winStreak >= 3],
    ['win_streak_5', 'Serie 5', 'Cinq gains consecutifs.', s => s.winStreak >= 5],
    ['win_streak_10', 'Serie 10', 'Dix gains consecutifs.', s => s.winStreak >= 10],
    ['roi_5', 'ROI +5%', 'ROI positif au-dessus de 5%.', s => s.roi >= 5 && s.settled >= 5],
    ['roi_10', 'ROI +10%', 'ROI positif au-dessus de 10%.', s => s.roi >= 10 && s.settled >= 10],
    ['roi_20', 'ROI +20%', 'ROI exceptionnel au-dessus de 20%.', s => s.roi >= 20 && s.settled >= 20],
    ['flat_profit', 'Profit net', 'PNL positif.', s => s.pnl > 0],
    ['hundred_profit', '+100 EUR', 'PNL cumule superieur a 100 EUR.', s => s.pnl >= 100],
    ['five_sports', '5 sports', 'Diversifie sur cinq sports.', s => s.sports >= 5],
    ['three_sports', '3 sports', 'Diversifie sur trois sports.', s => s.sports >= 3],
    ['five_leagues', '5 ligues', 'Cinq ligues suivies.', s => s.leagues >= 5],
    ['ten_leagues', '10 ligues', 'Dix ligues suivies.', s => s.leagues >= 10],
    ['safe_player', 'Profil prudent', 'Au moins 10 picks Sûr.', s => (s.tiers.safe || 0) >= 10],
    ['value_hunter', 'Value hunter', 'Au moins 10 picks Valeur.', s => (s.tiers.value || 0) >= 10],
    ['big_odds', 'Big odds', 'Au moins 5 picks Big odds.', s => (s.tiers.big || 0) >= 5],
    ['outsider', 'Outsider', 'Au moins 3 outsiders suivis.', s => (s.tiers.out || 0) >= 3],
    ['football_focus', 'Foot focus', 'Le foot représente 20+ paris.', s => (s.bySport.football || s.bySport.foot || 0) >= 20],
    ['tennis_focus', 'Tennis focus', 'Le tennis représente 10+ paris.', s => (s.bySport.tennis || 0) >= 10],
    ['nba_focus', 'NBA focus', 'Basket/NBA représente 10+ paris.', s => ((s.bySport.basketball || 0) + (s.bySport.nba || 0)) >= 10],
    ['low_tilt', 'Anti-tilt', 'Aucune série de pertes de 5+.', s => s.settled >= 20 && s.lossStreak < 5],
    ['recover', 'Recovery', 'PNL positif après une série de pertes.', s => s.pnl > 0 && s.lossStreak >= 3],
    ['monthly_goal', 'Objectif mensuel', 'Objectif ROI mensuel atteint.', s => s.goalReached],
    ['clv_positive', 'CLV positif', 'CLV moyenne positive.', s => s.avgClv > 0],
    ['morning', 'Matinal', 'Au moins 10 paris avant midi.', s => (s.hours.morning || 0) >= 10],
    ['night', 'Nocturne', 'Au moins 10 paris après 20h.', s => (s.hours.night || 0) >= 10],
    ['steady_stake', 'Mise stable', 'Mise moyenne cohérente sur 20+ paris.', s => s.settled >= 20 && s.avgStake > 0 && s.stakeVariance < s.avgStake * 1.5],
    ['pdf_export', 'Archiviste', 'Export PDF généré au moins une fois.', () => localStorage.getItem('ps_pdf_exported_v1') === '1'],
    ['data_export', 'Backup hero', 'Export données généré au moins une fois.', () => localStorage.getItem('ps_user_data_exported_v1') === '1']
  ].map(([id, title, desc, test]) => ({ id, title, desc, test }));

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
  function nowIso() { return new Date().toISOString(); }
  function money(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return '0,00 EUR';
    return `${v >= 0 ? '+' : ''}${v.toFixed(2).replace('.', ',')} EUR`;
  }
  function pct(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return '0%';
    return `${v >= 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')}%`;
  }
  function toast(message, type = 'info') {
    if (typeof window.toast === 'function') {
      window.toast(message, type);
      return;
    }
    const el = document.createElement('div');
    el.textContent = message;
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:100000;padding:12px 14px;border-radius:12px;background:#111827;color:#fff;box-shadow:0 18px 40px rgba(0,0,0,.25);font:600 13px system-ui;';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }
  function reportPrivacyError(context, error) {
    if (typeof window.logSafeError === 'function') window.logSafeError(context, error);
  }
  function safeBtoaUtf8(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function safeAtobUtf8(value) {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  function encodePayload(payload) {
    return safeBtoaUtf8(JSON.stringify(payload));
  }
  function decodePayload(encoded) {
    try {
      return JSON.parse(safeAtobUtf8(encoded));
    } catch (error) {
      reportPrivacyError('privacy combo decode', error);
      return null;
    }
  }
  function makeBlobDownload(filename, mime, text) {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      toast('Lien copie localement.', 'success');
      return;
    }
    makeBlobDownload('paris-sportif-lien-partage.txt', 'text/plain;charset=utf-8', text);
    toast('Clipboard indisponible : lien exporté en fichier texte.', 'info');
  }

  function injectStyle() {
    if ($('#privacy-social-style')) return;
    const style = document.createElement('style');
    style.id = 'privacy-social-style';
    style.textContent = `
      .privacy-card{border:1px solid var(--border,rgba(148,163,184,.25));background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(99,102,241,.08));border-radius:16px;padding:18px;color:var(--text,#e5e7eb);box-shadow:0 16px 40px rgba(0,0,0,.08)}
      .privacy-card--profile{margin-top:18px;background:var(--panel,#101620);box-shadow:none}
      .privacy-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}
      .privacy-card-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px}
      .privacy-details{margin-top:14px;border:1px solid var(--border,rgba(148,163,184,.22));border-radius:12px;background:rgba(255,255,255,.025);overflow:hidden}
      .privacy-details summary{min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 12px;cursor:pointer;color:var(--text,#e5e7eb);font-weight:850}
      .privacy-details-body{padding:0 12px 12px}
      .privacy-card h2,.privacy-card h3{margin:0 0 8px;font-size:18px;letter-spacing:0}
      .privacy-card p{margin:0;color:var(--text-dim,#9ca3af);line-height:1.55}
      .privacy-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:14px}
      .privacy-mini{border:1px solid var(--border,rgba(148,163,184,.2));background:var(--panel-2,rgba(15,23,42,.65));border-radius:14px;padding:12px}
      .privacy-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
      .privacy-btn{border:1px solid var(--border,rgba(148,163,184,.35));background:var(--brand,#a78bfa);color:#08080a;border-radius:12px;padding:10px 14px;min-height:44px;font-weight:800;cursor:pointer}
      .privacy-btn.secondary{background:transparent;color:var(--text,#e5e7eb)}
      .privacy-btn.danger{background:var(--danger,#fca5a5);color:#16090a}
      .privacy-btn:focus-visible,.privacy-input:focus-visible{outline:3px solid rgba(167,139,250,.45);outline-offset:2px}
      .privacy-input{width:100%;min-height:42px;border:1px solid var(--border,rgba(148,163,184,.32));border-radius:10px;background:var(--panel,#111827);color:var(--text,#e5e7eb);padding:9px 10px}
      .privacy-badge-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:12px}
      .privacy-badge{border:1px solid var(--border,rgba(148,163,184,.24));border-radius:12px;padding:10px;background:rgba(255,255,255,.03);min-height:88px}
      .privacy-badge.unlocked{border-color:rgba(16,185,129,.55);background:rgba(16,185,129,.11)}
      .privacy-badge strong{display:block;margin-bottom:4px}
      .privacy-rank{display:inline-flex;align-items:center;gap:8px;border-radius:999px;border:1px solid rgba(167,139,250,.4);padding:8px 12px;background:rgba(167,139,250,.12);font-weight:800}
      .privacy-heatmap{display:grid;grid-template-columns:repeat(53,1fr);gap:3px;overflow-x:auto;padding:8px 2px}
      .privacy-day{width:12px;height:12px;border-radius:3px;border:0;background:#263142;cursor:pointer}
      .privacy-day[data-level="1"]{background:#14532d}.privacy-day[data-level="2"]{background:#15803d}.privacy-day[data-level="3"]{background:#22c55e}
      .privacy-day[data-level="-1"]{background:#7f1d1d}.privacy-day[data-level="-2"]{background:#dc2626}.privacy-day[data-level="-3"]{background:#f87171}
      .privacy-modal{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(3,7,18,.72);padding:20px}
      .privacy-dialog{width:min(720px,100%);max-height:90vh;overflow:auto;border:1px solid var(--border,rgba(148,163,184,.28));border-radius:18px;background:var(--panel,#0f172a);color:var(--text,#e5e7eb);box-shadow:0 24px 70px rgba(0,0,0,.42)}
      .privacy-dialog header{position:sticky;top:0;background:inherit;border-bottom:1px solid var(--border,rgba(148,163,184,.22));padding:16px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px}
      .privacy-dialog h2{margin:0;font-size:20px}.privacy-dialog main{padding:18px}.privacy-dialog footer{padding:14px 18px;border-top:1px solid var(--border,rgba(148,163,184,.22));display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}
      .privacy-close{border:0;background:transparent;color:inherit;font-size:24px;line-height:1;cursor:pointer;min-width:44px;min-height:44px}
      .privacy-qr{display:flex;justify-content:center;background:#fff;border-radius:16px;padding:18px;margin:12px 0}
      .privacy-qr svg{max-width:280px;width:100%;height:auto}
      .privacy-table{width:100%;border-collapse:collapse;margin-top:10px}.privacy-table th,.privacy-table td{border-bottom:1px solid var(--border,rgba(148,163,184,.2));padding:9px;text-align:left}.privacy-table th{color:var(--text-dim,#9ca3af);font-size:12px;text-transform:uppercase}
      @media (max-width:720px){.privacy-modal{align-items:flex-end;padding:0}.privacy-dialog{border-radius:18px 18px 0 0;max-height:92vh}.privacy-heatmap{grid-template-columns:repeat(26,1fr)}.privacy-card-kpis{grid-template-columns:1fr 1fr}.privacy-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function closeModal() {
    const modal = $('.privacy-modal');
    if (modal) modal.remove();
  }
  function showModal(title, bodyHtml, footerHtml = '', onMount) {
    closeModal();
    const modal = document.createElement('div');
    modal.className = 'privacy-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <section class="privacy-dialog" tabindex="-1">
        <header>
          <h2>${esc(title)}</h2>
          <button type="button" class="privacy-close" data-privacy-close aria-label="Fermer">×</button>
        </header>
        <div class="privacy-dialog-body">${bodyHtml}</div>
        <footer>${footerHtml || '<button type="button" class="privacy-btn secondary" data-privacy-close>Fermer</button>'}</footer>
      </section>
    `;
    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.closest('[data-privacy-close]')) closeModal();
    });
    document.body.appendChild(modal);
    const dialog = $('.privacy-dialog', modal);
    if (dialog) dialog.focus();
    if (typeof onMount === 'function') onMount(modal);
  }

  function normalizeResult(value) {
    const v = String(value || '').toLowerCase();
    if (['won', 'win', 'gagne', 'gagné', 'success'].includes(v)) return 'won';
    if (['lost', 'loss', 'perdu', 'lose'].includes(v)) return 'lost';
    if (['void', 'push', 'annule', 'annulé'].includes(v)) return 'void';
    return 'pending';
  }
  function normalizeTier(value) {
    const v = String(value || '').toLowerCase();
    if (v.includes('sûr') || v.includes('sur') || v.includes('safe') || v.includes('lock')) return 'safe';
    if (v.includes('solid') || v.includes('solide')) return 'solid';
    if (v.includes('value') || v.includes('valeur')) return 'value';
    if (v.includes('big')) return 'big';
    if (v.includes('out')) return 'out';
    return 'standard';
  }
  function normalizeBet(raw, index) {
    const odd = Number(raw.odd || raw.odds || raw.cote || raw.price || 0);
    const stake = Number(raw.stake || raw.mise || raw.amount || raw.unit || 0);
    const result = normalizeResult(raw.result || raw.status || raw.outcome);
    let pnl = Number(raw.pnl || raw.profit || raw.pl);
    if (!Number.isFinite(pnl)) {
      if (result === 'won' && odd > 1 && stake > 0) pnl = stake * (odd - 1);
      else if (result === 'lost' && stake > 0) pnl = -stake;
      else pnl = 0;
    }
    const ts = raw.settled_at || raw.settledAt || raw.placed_at || raw.created_at || raw.ts || raw.date || nowIso();
    const date = new Date(ts);
    const safeTs = Number.isFinite(date.getTime()) ? date.toISOString() : nowIso();
    return {
      id: raw.id || raw.key || `${raw.match_id || raw.matchId || 'bet'}-${index}`,
      sport: String(raw.sport || raw.sport_key || 'autre').toLowerCase(),
      league: String(raw.league || raw.competition || 'Ligue inconnue'),
      tier: normalizeTier(raw.tier || raw.level || raw.bucket),
      market: String(raw.market_key || raw.market || raw.type || 'marche'),
      selection: String(raw.selection || raw.pick || raw.label || 'Sélection'),
      stake: Number.isFinite(stake) ? stake : 0,
      odd: Number.isFinite(odd) ? odd : 0,
      result,
      pnl,
      clv: Number(raw.clv_pct || raw.clv || 0) || 0,
      ts: safeTs
    };
  }
  function loadBets() {
    const collected = [];
    const add = (value) => {
      if (!value) return;
      if (Array.isArray(value)) collected.push(...value);
      else if (typeof value === 'object') collected.push(...Object.values(value));
    };
    try {
      if (typeof window._loadUserBets === 'function') add(window._loadUserBets());
    } catch (error) {
      reportPrivacyError('privacy load user bets', error);
    }
    ['paris_sportif_tracked_bets', 'paris_sportif_user_bets', 'myBets', 'trackedBets'].forEach(key => add(readJson(key, null)));
    const seen = new Set();
    return collected
      .map(normalizeBet)
      .filter(bet => {
        const key = `${bet.id}|${bet.market}|${bet.selection}|${bet.ts}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }
  function computeStats() {
    const bets = loadBets();
    const settled = bets.filter(b => b.result === 'won' || b.result === 'lost');
    const wins = settled.filter(b => b.result === 'won').length;
    const losses = settled.filter(b => b.result === 'lost').length;
    const stake = settled.reduce((sum, b) => sum + Math.max(0, b.stake || 0), 0);
    const pnl = settled.reduce((sum, b) => sum + (Number(b.pnl) || 0), 0);
    const bySport = {};
    const byLeague = {};
    const tiers = {};
    const hours = { morning: 0, afternoon: 0, night: 0 };
    const pnlByDate = {};
    let avgClv = 0;
    let clvN = 0;
    settled.forEach(b => {
      bySport[b.sport] = (bySport[b.sport] || 0) + 1;
      byLeague[b.league] = (byLeague[b.league] || 0) + 1;
      tiers[b.tier] = (tiers[b.tier] || 0) + 1;
      const d = new Date(b.ts);
      const hour = d.getHours();
      if (hour < 12) hours.morning += 1;
      else if (hour < 20) hours.afternoon += 1;
      else hours.night += 1;
      const day = d.toISOString().slice(0, 10);
      pnlByDate[day] = (pnlByDate[day] || 0) + (Number(b.pnl) || 0);
      if (Number.isFinite(Number(b.clv)) && Number(b.clv) !== 0) {
        avgClv += Number(b.clv);
        clvN += 1;
      }
    });
    avgClv = clvN ? avgClv / clvN : 0;
    const sorted = settled.slice().sort((a, b) => new Date(a.ts) - new Date(b.ts));
    let currentWin = 0, currentLoss = 0, bestWin = 0, bestLoss = 0;
    sorted.forEach(b => {
      if (b.result === 'won') {
        currentWin += 1; currentLoss = 0; bestWin = Math.max(bestWin, currentWin);
      } else if (b.result === 'lost') {
        currentLoss += 1; currentWin = 0; bestLoss = Math.max(bestLoss, currentLoss);
      }
    });
    const avgStake = settled.length ? stake / settled.length : 0;
    const stakeVariance = settled.length
      ? settled.reduce((sum, b) => sum + Math.abs((b.stake || 0) - avgStake), 0) / settled.length
      : 0;
    const currentGoal = readJson(STORAGE.goals, { monthlyRoiTarget: 10 });
    const month = new Date().toISOString().slice(0, 7);
    const monthBets = settled.filter(b => b.ts.slice(0, 7) === month);
    const monthStake = monthBets.reduce((sum, b) => sum + Math.max(0, b.stake || 0), 0);
    const monthPnl = monthBets.reduce((sum, b) => sum + (Number(b.pnl) || 0), 0);
    const monthRoi = monthStake > 0 ? monthPnl / monthStake * 100 : 0;
    return {
      bets,
      settled,
      total: bets.length,
      wins,
      losses,
      settled: settled.length,
      stake,
      pnl,
      roi: stake > 0 ? pnl / stake * 100 : 0,
      wr: settled.length ? wins / settled.length * 100 : 0,
      bySport,
      byLeague,
      tiers,
      hours,
      sports: Object.keys(bySport).length,
      leagues: Object.keys(byLeague).length,
      winStreak: bestWin,
      lossStreak: bestLoss,
      avgStake,
      stakeVariance,
      avgClv,
      pnlByDate,
      settledBets: settled,
      monthRoi,
      monthPnl,
      monthStake,
      goalReached: monthStake > 0 && monthRoi >= Number(currentGoal.monthlyRoiTarget || 10),
      goalTarget: Number(currentGoal.monthlyRoiTarget || 10)
    };
  }
  function topEntry(map, fallback) {
    const entries = Object.entries(map || {}).sort((a, b) => b[1] - a[1]);
    return entries[0] ? `${entries[0][0]} (${entries[0][1]})` : fallback;
  }
  function rankFor(stats) {
    const diversity = Math.min(25, stats.sports * 4 + stats.leagues);
    const roiScore = Math.max(0, Math.min(35, (stats.roi + 5) * 2));
    const volumeScore = Math.min(40, stats.settled * 1.2);
    const score = Math.round(volumeScore + roiScore + diversity);
    if (score >= 85) return { label: 'Diamond', score };
    if (score >= 68) return { label: 'Platinum', score };
    if (score >= 50) return { label: 'Gold', score };
    if (score >= 30) return { label: 'Silver', score };
    return { label: 'Bronze', score };
  }
  function getUnlocked(stats) {
    return BADGES.filter(badge => {
      try { return Boolean(badge.test(stats)); } catch (_) { return false; }
    });
  }
  function notifyNewBadges(stats) {
    const state = readJson(STORAGE.badges, { unlocked: [] });
    const before = new Set(state.unlocked || []);
    const unlocked = getUnlocked(stats).map(b => b.id);
    const fresh = unlocked.filter(id => !before.has(id));
    if (fresh.length) {
      const badge = BADGES.find(b => b.id === fresh[0]);
      toast(`Badge debloque : ${badge ? badge.title : fresh[0]}`, 'success');
    }
    writeJson(STORAGE.badges, { unlocked, updated_at: nowIso() });
  }
  function ensureMonthlySnapshot(stats) {
    const month = new Date().toISOString().slice(0, 7);
    const snapshots = readJson(STORAGE.snapshots, {});
    snapshots[month] = {
      month,
      total: stats.total,
      settled: stats.settled,
      roi: stats.roi,
      pnl: stats.pnl,
      wr: stats.wr,
      topSport: topEntry(stats.bySport, 'aucun'),
      updated_at: nowIso()
    };
    writeJson(STORAGE.snapshots, snapshots);
    return snapshots;
  }

  function qrSvgFor(url) {
    if (typeof window.qrcode !== 'function') {
      return `<div class="privacy-mini">QR indisponible : la bibliothèque locale n'est pas chargée.</div>`;
    }
    const qr = window.qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    return qr.createSvgTag(4, 6);
  }
  function comboPayloadFromDom() {
    const copyBtn = $('.combine-copy-btn') || $('.eeee-copy-btn');
    const card = copyBtn ? copyBtn.closest('.combine-card, .ia-combine-card, [data-combine-id], section, article, div') : $('#combines-wrap');
    const rawText = copyBtn ? (copyBtn.getAttribute('data-texte') || copyBtn.getAttribute('data-text') || copyBtn.dataset.texte || copyBtn.dataset.text || '') : '';
    const text = rawText || (card ? card.innerText.trim().slice(0, 1500) : 'Combiné Paris-Sportif');
    const legs = $all('.combine-leg, .eeee-leg-card, [data-leg]', card || document)
      .slice(0, 12)
      .map((leg, index) => ({ index: index + 1, text: leg.innerText.trim().replace(/\s+/g, ' ').slice(0, 240) }))
      .filter(leg => leg.text);
    return {
      schema: 'paris-sportif.combo-share.v1',
      type: 'combo',
      title: (card && $('h2,h3,strong', card) ? $('h2,h3,strong', card).textContent.trim() : 'Combiné Paris-Sportif').slice(0, 120),
      text: text.slice(0, 1800),
      legs,
      created_at: nowIso(),
      privacy: 'local-only'
    };
  }
  function showQrShare() {
    const payload = comboPayloadFromDom();
    const encoded = encodePayload(payload);
    const url = `${location.origin}${location.pathname}#combo/${encoded}`;
    const body = `
      <p>Ce QR contient uniquement les données du combiné encodées dans l'URL. Aucun upload, aucun serveur, aucune collecte.</p>
      <div class="privacy-qr">${qrSvgFor(url)}</div>
      <div class="privacy-mini"><strong>${esc(payload.title)}</strong><p>${esc(payload.text.slice(0, 320))}${payload.text.length > 320 ? '...' : ''}</p></div>
    `;
    const footer = `
      <button type="button" class="privacy-btn secondary" data-privacy-export-combo>Exporter JSON</button>
      <button type="button" class="privacy-btn secondary" data-privacy-copy-link>Copier le lien</button>
      <button type="button" class="privacy-btn" data-privacy-close>OK</button>
    `;
    showModal('Partager ce combiné en QR', body, footer, modal => {
      $('[data-privacy-export-combo]', modal).addEventListener('click', () => {
        makeBlobDownload('combine-paris-sportif.json', 'application/json;charset=utf-8', JSON.stringify(payload, null, 2));
      });
      $('[data-privacy-copy-link]', modal).addEventListener('click', () => copyText(url));
    });
  }
  function handleComboHash() {
    const match = location.hash.match(/^#combo\/(.+)$/);
    if (!match) return;
    const payload = decodePayload(match[1]);
    if (!payload || payload.type !== 'combo') {
      showModal('Combine partage', '<p>Le lien de partage est illisible ou incomplet.</p>');
      return;
    }
    const legs = Array.isArray(payload.legs) && payload.legs.length
      ? `<ol>${payload.legs.map(leg => `<li>${esc(leg.text)}</li>`).join('')}</ol>`
      : `<pre style="white-space:pre-wrap;font:inherit;">${esc(payload.text || '')}</pre>`;
    showModal(
      'Combine recu',
      `<p>Lecture locale depuis le hash de l'URL. Rien n'a été téléchargé depuis un serveur.</p><div class="privacy-mini"><strong>${esc(payload.title || 'Combiné')}</strong>${legs}</div>`,
      '<button type="button" class="privacy-btn secondary" data-privacy-copy-shared>Copier le contenu</button><button type="button" class="privacy-btn" data-privacy-close>Fermer</button>',
      modal => {
        $('[data-privacy-copy-shared]', modal).addEventListener('click', () => copyText(payload.text || payload.title || 'Combiné Paris-Sportif'));
      }
    );
  }
  function injectCombines() {
    const wrap = $('#combines-wrap');
    if (!wrap || $('[data-privacy-combo-share]', wrap)) return;
    if (!$('.combine-copy-btn, .eeee-copy-btn, .combine-card, .ia-combine-card', wrap)) return;
    const panel = document.createElement('section');
    panel.className = 'privacy-card';
    panel.setAttribute('data-privacy-combo-share', '1');
    panel.innerHTML = `
      <h2>Partage privé du combiné</h2>
      <p>Génère un QR code local qui encode le combiné dans l'URL. Aucun compte, aucun serveur, aucune collecte.</p>
      <div class="privacy-actions">
        <button type="button" class="privacy-btn" data-privacy-share-combo>Partager via QR</button>
        <button type="button" class="privacy-btn secondary" data-privacy-privacy>Confidentialité</button>
      </div>
    `;
    wrap.prepend(panel);
  }

  function buildHeatmap(stats) {
    const cells = [];
    const today = new Date();
    for (let i = 364; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const value = stats.pnlByDate[key] || 0;
      let level = 0;
      if (value > 20) level = 3;
      else if (value > 5) level = 2;
      else if (value > 0) level = 1;
      else if (value < -20) level = -3;
      else if (value < -5) level = -2;
      else if (value < 0) level = -1;
      cells.push(`<button type="button" class="privacy-day" data-level="${level}" data-privacy-day="${key}" title="${key} · ${money(value)}" aria-label="${key} ${money(value)}"></button>`);
    }
    return `<div class="privacy-heatmap" aria-label="Calendrier P&L 365 jours">${cells.join('')}</div>`;
  }
  function exportPdfReport() {
    const stats = computeStats();
    localStorage.setItem('ps_pdf_exported_v1', '1');
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Rapport personnel Paris-Sportif</title><style>
      body{font-family:Inter,Arial,sans-serif;color:#111827;padding:32px;line-height:1.5}
      h1{font-size:28px;margin:0 0 6px} h2{margin-top:24px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
      .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.card{border:1px solid #e5e7eb;border-radius:12px;padding:12px}
      table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #e5e7eb;padding:8px;text-align:left}
      @media print{body{padding:16mm}.no-print{display:none}}
    </style></head><body>
      <h1>Rapport personnel Paris-Sportif</h1>
      <p>Généré localement le ${new Date().toLocaleString('fr-FR')}. Aucune donnée envoyée.</p>
      <div class="grid">
        <div class="card"><strong>${stats.settled}</strong><br>paris réglés</div>
        <div class="card"><strong>${pct(stats.roi)}</strong><br>ROI</div>
        <div class="card"><strong>${money(stats.pnl)}</strong><br>P&L</div>
        <div class="card"><strong>${pct(stats.wr)}</strong><br>Win rate</div>
      </div>
      <h2>Historique récent</h2>
      <table><thead><tr><th>Date</th><th>Sport</th><th>Sélection</th><th>Mise</th><th>Résultat</th><th>P&L</th></tr></thead><tbody>
        ${stats.settledBets.slice(-40).reverse().map(b => `<tr><td>${esc(b.ts.slice(0, 10))}</td><td>${esc(b.sport)}</td><td>${esc(b.selection)}</td><td>${esc(String(b.stake))}</td><td>${esc(b.result)}</td><td>${money(b.pnl)}</td></tr>`).join('')}
      </tbody></table>
      <h2>Synthèse</h2>
      <p>Sport favori : ${esc(topEntry(stats.bySport, 'aucun'))}. Ligue favorite : ${esc(topEntry(stats.byLeague, 'aucune'))}. Tier favori : ${esc(topEntry(stats.tiers, 'aucun'))}. Mise moyenne : ${money(stats.avgStake).replace('+', '')}.</p>
      <button class="no-print" onclick="window.print()">Imprimer / enregistrer en PDF</button>
    </body></html>`;
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (error) { reportPrivacyError('privacy pdf print', error); }
      setTimeout(() => frame.remove(), 1500);
    }, 250);
    toast('Rapport PDF prêt dans la fenêtre impression.', 'success');
  }
  function injectBilan() {
    const wrap = $('#bilan-wrap') || $('#performance-wrap');
    if (!wrap || $('[data-privacy-bilan]', wrap)) return;
    const stats = computeStats();
    const rank = rankFor(stats);
    const panel = document.createElement('section');
    panel.className = 'privacy-card';
    panel.setAttribute('data-privacy-bilan', '1');
    panel.innerHTML = `
      <h2>Rapport personnel local</h2>
      <p>Streaks, calendrier P&L et export PDF sont calculés depuis tes paris suivis dans ce navigateur.</p>
      <div class="privacy-grid">
        <div class="privacy-mini"><strong>${stats.winStreak}</strong><p>plus longue série gagnante</p></div>
        <div class="privacy-mini"><strong>${stats.lossStreak}</strong><p>plus longue série perdante</p></div>
        <div class="privacy-mini"><strong>${esc(rank.label)} · ${rank.score}/100</strong><p>rang local</p></div>
        <div class="privacy-mini"><strong>${money(stats.pnl)}</strong><p>P&L suivi</p></div>
      </div>
      ${buildHeatmap(stats)}
      <div class="privacy-actions">
        <button type="button" class="privacy-btn" data-privacy-export-pdf>Export PDF</button>
        <button type="button" class="privacy-btn secondary" data-privacy-show-year>Mon année</button>
      </div>
    `;
    wrap.prepend(panel);
  }

  function exportUserData() {
    const payload = {
      schema: 'paris-sportif.user-data.v3',
      exported_at: nowIso(),
      source: 'privacy-social-local',
      localStorage: {},
      bets: loadBets(),
      friends: readJson(STORAGE.friends, []),
      goals: readJson(STORAGE.goals, { monthlyRoiTarget: 10 }),
      snapshots: readJson(STORAGE.snapshots, {})
    };
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (shouldExportKey(key)) payload.localStorage[key] = localStorage.getItem(key);
    }
    localStorage.setItem('ps_user_data_exported_v1', '1');
    makeBlobDownload(`paris-sportif-donnees-${new Date().toISOString().slice(0, 10)}.json`, 'application/json;charset=utf-8', JSON.stringify(payload, null, 2));
    toast('Export local généré.', 'success');
  }
  function shouldExportKey(key) {
    return PRIVATE_PREFIXES.some(prefix => String(key).startsWith(prefix)) || PRIVATE_KEYS.includes(key);
  }
  function showImportDialog(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let payload = null;
      try { payload = JSON.parse(String(reader.result || '{}')); } catch (error) { reportPrivacyError('privacy import parse', error); }
      if (!payload || !payload.schema || !payload.localStorage || typeof payload.localStorage !== 'object') {
        showModal('Import impossible', '<p>Le fichier ne correspond pas au schéma de sauvegarde Paris-Sportif.</p>');
        return;
      }
      localStorage.setItem(STORAGE.importDraft, JSON.stringify(payload));
      showModal(
        'Importer mes données',
        `<p>Fichier valide : ${esc(payload.schema)} exporté le ${esc(payload.exported_at || 'date inconnue')}.</p><p><strong>Fusionner</strong> conserve tes données actuelles et ajoute les clés du fichier. <strong>Remplacer</strong> efface d'abord les données locales Paris-Sportif.</p>`,
        '<button type="button" class="privacy-btn secondary" data-privacy-import-merge>Fusionner</button><button type="button" class="privacy-btn danger" data-privacy-import-replace>Remplacer</button><button type="button" class="privacy-btn secondary" data-privacy-close>Annuler</button>'
      );
    };
    reader.readAsText(file);
  }
  function applyImport(mode) {
    const payload = readJson(STORAGE.importDraft, null);
    if (!payload || !payload.localStorage) return;
    if (mode === 'replace') clearPrivateData(false);
    Object.entries(payload.localStorage).forEach(([key, value]) => {
      if (shouldExportKey(key)) localStorage.setItem(key, String(value));
    });
    if (Array.isArray(payload.friends)) writeJson(STORAGE.friends, payload.friends);
    if (payload.goals) writeJson(STORAGE.goals, payload.goals);
    if (payload.snapshots) writeJson(STORAGE.snapshots, payload.snapshots);
    localStorage.removeItem(STORAGE.importDraft);
    closeModal();
    toast('Donnees importees localement.', 'success');
    renderSoon();
  }
  function clearPrivateData(reload = true) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (shouldExportKey(key)) keys.push(key);
    }
    keys.forEach(key => localStorage.removeItem(key));
    if (reload) {
      toast('Donnees locales effacees.', 'success');
      setTimeout(() => location.reload(), 500);
    }
  }

  function renderFriends(stats) {
    const friends = readJson(STORAGE.friends, []);
    const rows = [
      { name: 'Moi', bets: stats.settled, wins: stats.wins, stake: stats.stake, pnl: stats.pnl, self: true },
      ...friends
    ].map((row, index) => {
      const bets = Number(row.bets || 0);
      const wins = Number(row.wins || 0);
      const stake = Number(row.stake || 0);
      const pnl = Number(row.pnl || 0);
      const roi = stake > 0 ? pnl / stake * 100 : 0;
      const wr = bets > 0 ? wins / bets * 100 : 0;
      return { ...row, index, bets, wins, stake, pnl, roi, wr };
    }).sort((a, b) => b.roi - a.roi || b.wr - a.wr || b.bets - a.bets);
    return `
      <table class="privacy-table">
        <thead><tr><th>Profil</th><th>ROI</th><th>WR</th><th>Volume</th><th></th></tr></thead>
        <tbody>${rows.map(row => `
          <tr>
            <td>${esc(row.name || 'Ami')}</td><td>${pct(row.roi)}</td><td>${pct(row.wr)}</td><td>${row.bets}</td>
            <td>${row.self ? '' : `<button type="button" class="privacy-btn secondary" data-privacy-remove-friend="${esc(String(row.id || row.index))}">Retirer</button>`}</td>
          </tr>`).join('')}</tbody>
      </table>
    `;
  }
  function addFriendFromForm(root) {
    const name = $('[data-privacy-friend-name]', root).value.trim() || 'Ami';
    const bets = Number($('[data-privacy-friend-bets]', root).value || 0);
    const wins = Number($('[data-privacy-friend-wins]', root).value || 0);
    const stake = Number($('[data-privacy-friend-stake]', root).value || 0);
    const pnl = Number($('[data-privacy-friend-pnl]', root).value || 0);
    const friends = readJson(STORAGE.friends, []);
    friends.push({ id: `friend-${Date.now()}`, name, bets, wins, stake, pnl, created_at: nowIso() });
    writeJson(STORAGE.friends, friends);
    toast('Profil ami ajoute localement.', 'success');
    renderSoon();
  }
  function removeFriend(id) {
    const friends = readJson(STORAGE.friends, []).filter(friend => String(friend.id) !== String(id));
    writeJson(STORAGE.friends, friends);
    renderSoon();
  }
  function renderBadges(stats) {
    const unlocked = new Set(getUnlocked(stats).map(b => b.id));
    return BADGES.map(badge => `
      <div class="privacy-badge ${unlocked.has(badge.id) ? 'unlocked' : ''}">
        <strong>${unlocked.has(badge.id) ? 'OK' : '--'} ${esc(badge.title)}</strong>
        <small>${esc(badge.desc)}</small>
      </div>
    `).join('');
  }
  function injectProfil() {
    const wrap = $('#profil-wrap') || $('#settings-wrap');
    if (!wrap || $('[data-privacy-profile]', wrap)) return;
    const stats = computeStats();
    const rank = rankFor(stats);
    const snapshots = ensureMonthlySnapshot(stats);
    const months = Object.keys(snapshots).sort();
    const prev = months.length > 1 ? snapshots[months[months.length - 2]] : null;
    const goalProgress = Math.max(0, Math.min(100, stats.goalTarget ? stats.monthRoi / stats.goalTarget * 100 : 0));
    const panel = document.createElement('section');
    panel.className = 'privacy-card privacy-card--profile';
    panel.setAttribute('data-privacy-profile', '1');
    panel.innerHTML = `
      <div class="privacy-card-head">
        <div>
          <h2>Confidentialité locale</h2>
          <p>Exports, badges et comparaisons restent dans ce navigateur. Rien n'est envoyé sans action volontaire.</p>
        </div>
        <div class="privacy-actions" style="margin-top:0">
          <button type="button" class="privacy-btn secondary" data-privacy-export-user>Exporter</button>
          <button type="button" class="privacy-btn secondary" data-privacy-import-user>Importer</button>
          <button type="button" class="privacy-btn secondary" data-privacy-privacy>Politique locale</button>
        </div>
      </div>
      <div class="privacy-card-kpis">
        <div class="privacy-mini"><span class="privacy-rank">${esc(rank.label)} · ${rank.score}/100</span><p>rang basé sur volume, ROI et diversité</p></div>
        <div class="privacy-mini"><strong>${pct(stats.monthRoi)}</strong><p>objectif mensuel ${pct(stats.goalTarget)}</p><div style="height:8px;background:rgba(148,163,184,.18);border-radius:999px;overflow:hidden"><i style="display:block;height:100%;width:${goalProgress}%;background:var(--accent,#10b981)"></i></div></div>
        <div class="privacy-mini"><strong>${esc(topEntry(stats.bySport, 'aucun'))}</strong><p>sport le plus joué</p></div>
        <div class="privacy-mini"><strong>${esc(topEntry(stats.tiers, 'aucun'))}</strong><p>tier favori</p></div>
      </div>
      <div class="privacy-card-kpis">
        <div class="privacy-mini"><strong>${esc(prev ? money(stats.pnl - prev.pnl) : 'Premier mois')}</strong><p>évolution vs snapshot précédent</p></div>
        <div class="privacy-mini"><strong>${money(stats.avgStake).replace('+', '')}</strong><p>mise moyenne</p></div>
        <div class="privacy-mini"><strong>${esc(topEntry(stats.byLeague, 'aucune'))}</strong><p>ligue favorite</p></div>
        <div class="privacy-mini"><strong>${stats.hours.morning}/${stats.hours.afternoon}/${stats.hours.night}</strong><p>matin / après-midi / soir</p></div>
      </div>
      <details class="privacy-details">
        <summary><span>Badges locaux et comparaison</span><span>${getUnlocked(stats).length}/${BADGES.length}</span></summary>
        <div class="privacy-details-body">
          <h3 style="margin-top:8px">Badges locaux (${getUnlocked(stats).length}/${BADGES.length})</h3>
          <div class="privacy-badge-grid">${renderBadges(stats)}</div>
          <h3 style="margin-top:18px">Comparer avec des amis (saisie manuelle)</h3>
          <div class="privacy-grid">
            <input class="privacy-input" data-privacy-friend-name placeholder="Nom">
            <input class="privacy-input" data-privacy-friend-bets type="number" min="0" placeholder="Paris">
            <input class="privacy-input" data-privacy-friend-wins type="number" min="0" placeholder="Gagnés">
            <input class="privacy-input" data-privacy-friend-stake type="number" min="0" step="0.01" placeholder="Mise totale">
            <input class="privacy-input" data-privacy-friend-pnl type="number" step="0.01" placeholder="P&L">
          </div>
          <div class="privacy-actions"><button type="button" class="privacy-btn" data-privacy-add-friend>Ajouter au leaderboard local</button></div>
          ${renderFriends(stats)}
        </div>
      </details>
      <div class="privacy-actions">
        <button type="button" class="privacy-btn danger" data-privacy-forget>Effacer toutes mes données</button>
      </div>
      <input type="file" accept="application/json,.json" data-privacy-import-file hidden>
    `;
    wrap.appendChild(panel);
  }

  function showYearSummary() {
    const stats = computeStats();
    const sorted = stats.settledBets.slice().sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    showModal('Mon année', `
      <div class="privacy-grid">
        <div class="privacy-mini"><strong>${stats.settled}</strong><p>paris réglés</p></div>
        <div class="privacy-mini"><strong>${pct(stats.roi)}</strong><p>ROI annuel</p></div>
        <div class="privacy-mini"><strong>${esc(topEntry(stats.bySport, 'aucun'))}</strong><p>sport favori</p></div>
        <div class="privacy-mini"><strong>${money(stats.pnl)}</strong><p>P&L</p></div>
      </div>
      <div class="privacy-grid">
        <div class="privacy-mini"><strong>Meilleur pari</strong><p>${best ? `${esc(best.selection)} · ${money(best.pnl)}` : 'Pas encore de pari réglé.'}</p></div>
        <div class="privacy-mini"><strong>Pire pari</strong><p>${worst ? `${esc(worst.selection)} · ${money(worst.pnl)}` : 'Pas encore de pari réglé.'}</p></div>
      </div>
    `);
  }
  function showPrivacyModal(force = false) {
    if (!force && navigator.webdriver) return;
    if (!force && localStorage.getItem(STORAGE.ack) === '1') return;
    showModal(
      'Confidentialité locale',
      `<p><strong>Tout reste dans ton navigateur.</strong> Les badges, comparaisons, exports, QR codes et objectifs utilisent localStorage, IndexedDB ou des fichiers que tu déclenches toi-même.</p>
       <ul>
        <li>Aucun serveur applicatif.</li>
        <li>Aucun analytics tiers, aucun cookie de tracking.</li>
        <li>Les QR codes encodent seulement un hash URL lisible par le receveur.</li>
        <li>Effacement complet disponible depuis Profil.</li>
       </ul>`,
      '<button type="button" class="privacy-btn" data-privacy-accept>OK je comprends</button>',
      modal => {
        $('[data-privacy-accept]', modal).addEventListener('click', () => {
          localStorage.setItem(STORAGE.ack, '1');
          closeModal();
        });
      }
    );
  }
  function confirmForget() {
    const run = () => clearPrivateData(true);
    if (typeof window._showConfirm === 'function') {
      window._showConfirm({
        title: 'Effacer toutes mes données locales ?',
        message: 'Cela supprime paris suivis, préférences, badges, amis, objectifs et sauvegardes locales Paris-Sportif.',
        confirmText: 'Effacer',
        cancelText: 'Annuler',
        danger: true,
        onConfirm: run
      });
    } else {
      showModal(
        'Effacer toutes mes données locales ?',
        '<p>Cette action supprime les données Paris-Sportif de ce navigateur. Aucune copie distante n’existe.</p>',
        '<button type="button" class="privacy-btn danger" data-privacy-forget-now>Effacer</button><button type="button" class="privacy-btn secondary" data-privacy-close>Annuler</button>',
        modal => $('[data-privacy-forget-now]', modal).addEventListener('click', run)
      );
    }
  }

  let renderTimer = null;
  function renderSoon() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderAll, 80);
  }
  function renderAll() {
    injectStyle();
    injectCombines();
    injectBilan();
    injectProfil();
    const stats = computeStats();
    notifyNewBadges(stats);
    ensureMonthlySnapshot(stats);
  }
  function bindEvents() {
    document.addEventListener('click', (event) => {
      const target = event.target.closest('button,[data-privacy-day]');
      if (!target) return;
      if (target.matches('[data-privacy-share-combo]')) showQrShare();
      else if (target.matches('[data-privacy-export-pdf]')) exportPdfReport();
      else if (target.matches('[data-privacy-show-year]')) showYearSummary();
      else if (target.matches('[data-privacy-export-user]')) exportUserData();
      else if (target.matches('[data-privacy-import-user]')) {
        const fileInput = $('[data-privacy-import-file]');
        if (fileInput) fileInput.click();
      } else if (target.matches('[data-privacy-import-merge]')) applyImport('merge');
      else if (target.matches('[data-privacy-import-replace]')) applyImport('replace');
      else if (target.matches('[data-privacy-add-friend]')) addFriendFromForm(target.closest('[data-privacy-profile]') || document);
      else if (target.matches('[data-privacy-remove-friend]')) removeFriend(target.getAttribute('data-privacy-remove-friend'));
      else if (target.matches('[data-privacy-forget]')) confirmForget();
      else if (target.matches('[data-privacy-privacy]')) showPrivacyModal(true);
      else if (target.matches('[data-privacy-day]')) {
        const day = target.getAttribute('data-privacy-day');
        const stats = computeStats();
        const dayBets = stats.settledBets.filter(b => b.ts.slice(0, 10) === day);
        showModal(`Jour ${day}`, dayBets.length
          ? `<table class="privacy-table"><tbody>${dayBets.map(b => `<tr><td>${esc(b.selection)}</td><td>${esc(b.result)}</td><td>${money(b.pnl)}</td></tr>`).join('')}</tbody></table>`
          : '<p>Aucun pari suivi ce jour-la.</p>');
      }
    });
    document.addEventListener('change', (event) => {
      const input = event.target.closest('[data-privacy-import-file]');
      if (input && input.files && input.files[0]) showImportDialog(input.files[0]);
    });
    window.addEventListener('hashchange', () => {
      handleComboHash();
      renderSoon();
      [300, 1000, 2400].forEach(delay => setTimeout(renderSoon, delay));
    });
  }
  function initNetworkAudit() {
    window.__privacyFeaturesNetworkAudit = function privacyFeaturesNetworkAudit() {
      return {
        version: VERSION,
        runtimeNetworkCalls: 0,
        externalServices: [],
        storage: ['localStorage', 'IndexedDB-ready exports', 'Blob downloads', 'window.print'],
        sharing: 'QR hash URL with base64 payload only',
        export: 'JSON Blob and local print-to-PDF only',
        lastCheckedAt: nowIso()
      };
    };
    window.__psPrivacySocial = {
      version: VERSION,
      showPrivacyModal: () => showPrivacyModal(true),
      computeStats,
      exportUserData,
      showQrShare
    };
  }
  function init() {
    injectStyle();
    bindEvents();
    initNetworkAudit();
    renderAll();
    handleComboHash();
    if (new URLSearchParams(location.search || '').has('docsNoTour')) localStorage.setItem(STORAGE.ack, '1');
    if (!window.__psBootSequence) showPrivacyModal(false);
    const root = $('#app') || document.body;
    const observer = new MutationObserver(renderSoon);
    observer.observe(root, { childList: true, subtree: true });
    [250, 900, 1800, 3600].forEach(delay => setTimeout(renderSoon, delay));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

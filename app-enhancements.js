// Extracted from pronostics.html enhancements v20. Loaded with defer to reduce inline parse cost.
/* Chantiers YY → JJJ — Module d'enhancement v20
   Ajouts non-invasifs, aucune modification du code existant.
   Features: safeFetch wrapper, offline mode, command palette, keyboard shortcuts,
   export CSV, lien partageable, calendar heatmap profit, favorites ligues. */
(function(){
  'use strict';

  function reportEnhancementError(context, error){
    if (typeof window.logSafeError === 'function') window.logSafeError(context, error);
  }

  // ========== Utility : toast (si pas déjà dispo) ==========
  if (!window.__toast){
    window.__toast = function(msg, type){
      type = type || 'info';
      var el = document.createElement('div');
      var colors = {info:'#60a5fa', warn:'#fbbf24', success:'#34d399', error:'#f87171'};
      el.style.cssText = 'position:fixed;top:16px;right:16px;background:' + (colors[type]||colors.info) +
        ';color:#000;padding:12px 18px;border-radius:10px;font-size:14px;z-index:99999;' +
        'box-shadow:0 6px 20px rgba(0,0,0,0.4);font-weight:500;max-width:320px;';
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(function(){ el.style.opacity = '0'; el.style.transition = 'opacity 0.4s'; }, 3000);
      setTimeout(function(){ el.remove(); }, 3500);
    };
  }

  // ========== CHANTIER YY — safeFetch ==========
  var fetchFailures = new Map();
  var originalFetch = window.fetch ? window.fetch.bind(window) : null;
  window.__safeFetch = function(url, opts){
    opts = opts || {};
    if (!originalFetch) return Promise.reject(new Error('fetch unavailable'));
    var timeout = opts.timeout || 5000;
    var maxRetries = opts.maxRetries != null ? opts.maxRetries : 1;
    var failCount = fetchFailures.get(url) || 0;
    if (failCount >= 3){
      return Promise.reject(new Error('Circuit breaker open: ' + url));
    }
    function attemptOnce(tries){
      var controller = new AbortController();
      var tid = setTimeout(function(){ controller.abort(); }, timeout);
      var finalOpts = Object.assign({}, opts, { signal: controller.signal });
      return originalFetch(url, finalOpts).then(function(res){
        clearTimeout(tid);
        fetchFailures.delete(url);
        return res;
      }).catch(function(err){
        clearTimeout(tid);
        if (tries < maxRetries){
          return new Promise(function(r){ setTimeout(r, 400); }).then(function(){ return attemptOnce(tries+1); });
        }
        fetchFailures.set(url, failCount + 1);
        window.__toast('⚠️ Réseau instable — ' + String(url).split('/').pop(), 'warn');
        throw err;
      });
    }
    return attemptOnce(0);
  };

  // ========== CHANTIER DDD — Mode offline robuste ==========
  // v32.6 — Fusionné avec setupOfflineBanner (app.js?v=f1d0c55b). Garde uniquement le
  // CSS qui désactive les CTAs externes en mode offline. Le banner visuel
  // est rendu par app.js?v=f1d0c55b (#offline-banner), avec timestamp dynamique. Avant
  // ce fix, 2 banners coexistaient (#__offline-banner ici + #offline-banner
  // app.js?v=f1d0c55b) → duplication visuelle quand offline.
  function initOffline(){
    var style = document.createElement('style');
    style.textContent =
      'body.__offline a[href*="winamax"], body.__offline .wina-btn, body.__offline .winamax-btn, ' +
      'body.__offline button[data-action="track-bet"] { pointer-events:none !important; ' +
      'opacity:0.5 !important; cursor:not-allowed !important; }';
    document.head.appendChild(style);
    function update(){
      var online = navigator.onLine;
      document.body.classList.toggle('__offline', !online);
    }
    window.addEventListener('online', function(){ update(); window.__toast && window.__toast('✅ Connexion rétablie', 'success'); });
    window.addEventListener('offline', function(){ update(); window.__toast && window.__toast('⚠️ Connexion perdue', 'warn'); });
    update();
  }

  // ========== CHANTIER BBB — Export CSV + lien partageable ==========
  function getTrackedBets(){
    try {
      var v = JSON.parse(localStorage.getItem('paris_sportif_tracked_bets') || '[]');
      if (Array.isArray(v)) return v;
      if (v && typeof v === 'object') {
        // Format actuel du site : objet keyé par bet_id → normaliser en array.
        return Object.keys(v).map(function(k){
          var b = v[k] || {};
          // Copier la clé comme id si absent, et normaliser date/odds/status.
          if (!b.id) b.id = k;
          if (!b.date) b.date = b.kickoff || b.matchDate || b.added_at || '';
          if (b.odds && !b.odd) b.odd = b.odds;
          return b;
        });
      }
      return [];
    } catch(e){ return []; }
  }
  // Migration : réparer les anciens paris trackés avec home/away/league = "?"
  // (régression addTrackedBet v20 qui lisait matchData.home au lieu de
  // matchData.competitors[].name). On cherche le match dans PRONOSTICS_DATA
  // et on remplit les vraies valeurs.
  function repairTrackedBets(){
    try {
      var raw = JSON.parse(localStorage.getItem('paris_sportif_tracked_bets')||'{}');
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
      var data = window.PRONOSTICS_DATA;
      if (!data || !data.days) return;
      var changed = 0;
      Object.keys(raw).forEach(function(k){
        var b = raw[k];
        if (!b || (b.home !== '?' && b.away !== '?' && b.league !== '?')) return;
        var days = Object.keys(data.days);
        for (var i=0;i<days.length;i++){
          var arr = data.days[days[i]] || [];
          var m = arr.find(function(x){ return String(x.id) === String(b.id); });
          if (m){
            var comps = m.competitors || [];
            var h = comps.find(function(c){ return c.home_away === 'home'; }) || comps[0] || {};
            var a = comps.find(function(c){ return c.home_away === 'away'; }) || comps[1] || {};
            if (b.home === '?') { b.home = h.name || h.short || '?'; changed++; }
            if (b.away === '?') { b.away = a.name || a.short || '?'; changed++; }
            if (b.league === '?') { b.league = m.league_name || '?'; }
            break;
          }
        }
      });
      if (changed > 0) localStorage.setItem('paris_sportif_tracked_bets', JSON.stringify(raw));
    } catch(e){ reportEnhancementError('enh repairTrackedBets', e); }
  }
  window.__exportTrackedBetsCSV = function(){
    var bets = getTrackedBets();
    if (!bets.length){ window.__toast('Aucun pari à exporter', 'warn'); return; }
    var headers = ['Date','Match','Pick','Cote','Confiance','Mise','Statut','Gain'];
    var rows = bets.map(function(b){
      return [
        b.date || b.matchDate || '',
        b.match || b.team || b.teams || '',
        b.pick || b.prediction || '',
        b.odd || b.odds || '',
        (b.confidence!=null ? String(b.confidence) : ''),
        (b.stake!=null ? String(b.stake) : ''),
        b.status || 'pending',
        (b.profit!=null ? String(b.profit) : '')
      ];
    });
    var csv = [headers].concat(rows).map(function(r){
      return r.map(function(c){ return '"' + String(c).replace(/"/g,'""') + '"'; }).join(',');
    }).join('\n');
    var blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'paris_sportif_' + new Date().toISOString().split('T')[0] + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.__toast('✅ CSV téléchargé (' + bets.length + ' paris)', 'success');
  };
  window.__copyShareLink = async function(){
    var activePage = document.querySelector('.page-btn.active, [data-page].active');
    var page = activePage ? (activePage.dataset.page || 'simples') : 'simples';
    var state = { page: page, ts: Date.now() };
    var encoded = btoa(JSON.stringify(state));
    var shareUrl = window.location.origin + window.location.pathname + '?share=' + encoded;
    var title = 'Paris-Sportif — ' + page;
    var text = 'Mes pronostics du jour sur Paris-Sportif';
    // v30 — Modern Web Share API first (mobile native share sheet),
    // fallback to clipboard, fallback to prompt en dernier recours.
    if (navigator.share) {
      try {
        await navigator.share({ title: title, text: text, url: shareUrl });
        window.__toast('✅ Partagé', 'success');
        return;
      } catch (e) {
        // User cancelled share sheet — silently continue to clipboard
        if (e && e.name === 'AbortError') return;
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        window.__toast('✅ Lien copié dans le presse-papier', 'success');
        return;
      } catch (e) { reportEnhancementError('enh clipboard share fallback', e); }
    }
    try { prompt('Copie ce lien:', shareUrl); } catch (e) { reportEnhancementError('enh prompt share fallback', e); }
  };
  function restoreShared(){
    var params = new URLSearchParams(window.location.search);
    var share = params.get('share');
    var matchParam = params.get('match');
    // AUDIT-2026-04-27 (Sprint 2 #10) — Support hash #match/<id>/<tab>
    // pour deep linking modal détail. Le ?match=<id> reste compatible
    // pour les vieux liens partagés.
    var hashMatch = (window.location.hash || '').match(/^#match\/([^/]+)(?:\/(\w+))?$/);
    if (hashMatch && !matchParam) {
      matchParam = hashMatch[1];
    }
    // v30 — ?match=<id> ouvre la modale du match partagé après que data
    // soit chargée + render initial. Construit l'objet match en scannant
    // PRONOSTICS_DATA.days.
    if (matchParam) {
      setTimeout(function(){
        var data = window.PRONOSTICS_DATA;
        if (!data || !data.days) return;
        var found = null;
        Object.values(data.days).forEach(function(arr){
          (arr || []).forEach(function(m){
            if (String(m.id) === String(matchParam)) found = m;
          });
        });
        // FIX scope : openDetail vit dans un autre script tag, donc on
        // doit passer par window.openDetail (exposé explicitement).
        if (found && typeof window.openDetail === 'function') window.openDetail(found);
      }, 800);
    }
    if (!share) return;
    try {
      var state = JSON.parse(atob(share));
      if (state.page){
        setTimeout(function(){
          var btn = document.querySelector('.page-btn[data-page="' + state.page + '"]');
          if (btn) btn.click();
        }, 500);
      }
    } catch(e){ reportEnhancementError('enh restoreShared', e); }
  }

  // ========== CHANTIER CCC — Fuzzy score (expose util) ==========
  window.__fuzzyScore = function(query, text){
    if (!query) return 0;
    query = String(query).toLowerCase().trim();
    text = String(text || '').toLowerCase();
    if (!query || !text) return 0;
    if (text.indexOf(query) >= 0) return 1.0;
    var qi = 0, score = 0;
    for (var i = 0; i < text.length && qi < query.length; i++){
      if (text.charAt(i) === query.charAt(qi)){ score += 1; qi += 1; }
    }
    return qi === query.length ? score / Math.max(text.length, 1) : 0;
  };

  // ========== CHANTIER HHH — Favorites ligues ==========
  var FAVS_KEY = 'paris_sportif_fav_leagues';
  function getFavs(){ try { return JSON.parse(localStorage.getItem(FAVS_KEY)||'[]'); } catch(e){ return []; } }
  function setFavs(l){ localStorage.setItem(FAVS_KEY, JSON.stringify(l)); }
  window.__toggleLeagueFav = function(code){
    var favs = getFavs();
    var idx = favs.indexOf(code);
    if (idx >= 0) favs.splice(idx, 1); else favs.push(code);
    setFavs(favs);
    return idx < 0;
  };
  window.__isLeagueFav = function(code){ return getFavs().indexOf(code) >= 0; };
  window.__getFavLeagues = getFavs;

  // ========== CHANTIER JJJ — Command palette + shortcuts ==========
  // v31.7.200 — Cmd-K palette aligné avec la nouvelle nav 4 hubs.
  // Ordre : Accueil → 💰 Picks → 🗓️ Agenda → 📊 Performance → ⚙️ Compte → Doc → Utils.
  var commands = [
    {label:'🏠 Accueil', icon:'🏠', keywords:'accueil home dashboard aujourd hui parier maintenant', action: function(){ var b=document.querySelector('.page-btn[data-page="dashboard"]'); if(b) b.click(); }},
    // 💰 Picks
    {label:'⭐ Top du jour', icon:'⭐', keywords:'top meilleurs picks jour parier confiance edge kelly', action: function(){ var b=document.querySelector('.page-btn[data-page="top"]'); if(b) b.click(); }},
    {label:'💎 Mismatches marché (le marché se trompe)', icon:'💎', keywords:'valeur edge mismatch top marche bookmaker erreur opportunite gros argent', action: function(){ var b=document.querySelector('.page-btn[data-page="valeur"]'); if(b) b.click(); }},
    {label:'💼 Mises du jour', icon:'🎯', keywords:'plan mise ticket kelly auto optimise calcul argent', action: function(){ var b=document.querySelector('.page-btn[data-page="plan-mise"]'); if(b) b.click(); }},
    {label:'🔒 Locks (haute confiance)', icon:'🔒', keywords:'paris surs locks meilleurs haute confiance ≥70', action: function(){ var b=document.querySelector('.page-btn[data-page="locks"]'); if(b) b.click(); }},
    {label:'🔗 Combinés', icon:'🔗', keywords:'combines combos anti correle value', action: function(){ var b=document.querySelector('.page-btn[data-page="combines"]'); if(b) b.click(); }},
    {label:'⚽ Buteurs', icon:'⚽', keywords:'buteurs buts over under btts buts joueurs scorers', action: function(){ var b=document.querySelector('.page-btn[data-page="buteurs"]'); if(b) b.click(); }},
    // 🗓️ Agenda
    {label:'📋 Tous les matchs', icon:'📋', keywords:'tous pronos pronostics simples liste paris du jour explorer', action: function(){ var b=document.querySelector('.page-btn[data-page="tous"]'); if(b) b.click(); }},
    {label:'📅 Calendrier 7 jours', icon:'📅', keywords:'calendrier 7 jours futur prochains heatmap', action: function(){ var b=document.querySelector('.page-btn[data-page="calendrier"]'); if(b) b.click(); }},
    {label:'📈 Montante du jour', icon:'📈', keywords:'montante jour quotidien', action: function(){ var b=document.querySelector('.page-btn[data-page="montante-jour"]'); if(b) b.click(); }},
    {label:'🗓️ Montante weekend', icon:'🗓️', keywords:'montante weekend samedi dimanche', action: function(){ var b=document.querySelector('.page-btn[data-page="montante-weekend"]'); if(b) b.click(); }},
    {label:'📆 Montante semaine', icon:'📆', keywords:'montante semaine hebdomadaire', action: function(){ var b=document.querySelector('.page-btn[data-page="montante-semaine"]'); if(b) b.click(); }},
    // 📊 Performance
    {label:'🎯 Performance modèle', icon:'🎯', keywords:'performance vue globale kpi roi brier synthese rentabilite', action: function(){ var b=document.querySelector('.page-btn[data-page="performance"]'); if(b) b.click(); }},
    {label:'💰 Mes paris (bilan)', icon:'💰', keywords:'bilan stats mes paris perso', action: function(){ var b=document.querySelector('.page-btn[data-page="bilan"]'); if(b) b.click(); }},
    {label:'📜 Historique', icon:'📜', keywords:'historique passe ancien archives', action: function(){ var b=document.querySelector('.page-btn[data-page="historique"]'); if(b) b.click(); }},
    {label:'🧪 What-if simulator', icon:'🧪', keywords:'simulator what-if scenarios kelly bankroll projection', action: function(){ var b=document.querySelector('.page-btn[data-page="simulator"]'); if(b) b.click(); }},
    // ⚙️ Compte & paramètres
    {label:'👤 Profil & bankroll', icon:'👤', keywords:'profil reglages parametres sante bankroll cagnotte limites risque', action: function(){ var b=document.querySelector('.page-btn[data-page="profil"]'); if(b) b.click(); }},
    {label:'⭐ Favoris', icon:'⭐', keywords:'favoris equipes ligues sports marches watchlist', action: function(){ var b=document.querySelector('.page-btn[data-page="favoris"]'); if(b) b.click(); }},
    {label:'🔔 Alertes', icon:'🔔', keywords:'alertes notifications warnings', action: function(){ var b=document.querySelector('.page-btn[data-page="alertes"]'); if(b) b.click(); }},
    // Pages legacy (toujours accessibles via Cmd-K même si retirées du nav)
    {label:'🔍 Matchs détectés (avancé)', icon:'🔍', keywords:'matchs detectes tous explore browse exhaustif filtres statut catalogue debug', action: function(){ var b=document.querySelector('.page-btn[data-page="matchs"]'); if(b) b.click(); }},
    {label:'🔁 Comparer 2 jours', icon:'🔁', keywords:'comparer comparison deux jours', action: function(){ var b=document.querySelector('.page-btn[data-page="compare"]'); if(b) b.click(); }},
    {label:'📐 Crédibilité (calibration)', icon:'📐', keywords:'credibilite calibration brier transparence', action: function(){ var b=document.querySelector('.page-btn[data-page="credibilite"]'); if(b) b.click(); }},
    // 📚 Documentation (pages externes)
    {label:'📐 Méthodologie', icon:'📐', keywords:'methodologie protocole biais limite documentation', action: function(){ window.location.href = 'methodologie.html'; }},
    {label:'📚 Académie (lexique)', icon:'📚', keywords:'guide academie help aide lexique edge kelly brier glossary', action: function(){ window.location.href = 'academie.html'; }},
    {label:'📖 Comment lire un prono', icon:'📖', keywords:'comment lire pronostic decryptage tutoriel debutant', action: function(){ window.location.href = 'comment-lire-un-prono.html'; }},
    {label:'📈 Backtest (preuve performance)', icon:'📈', keywords:'backtest performance courbe methode rapport hebdomadaire', action: function(){ window.location.href = 'backtest.html'; }},
    {label:'⚖ Légal & confidentialité', icon:'⚖', keywords:'legal confidentialite mentions privacy rgpd', action: function(){ window.location.href = 'legal.html'; }},
    // Utilitaires
    {label:'🔗 Copier lien de partage', icon:'🔗', keywords:'share lien partager copier', action: function(){ window.__copyShareLink(); }},
    {label:'⌨️ Afficher les raccourcis clavier', icon:'⌨️', keywords:'shortcuts raccourcis clavier help aide', action: function(){ showShortcutsHelp(); }},
    {label:'🔄 Forcer refresh données', icon:'🔄', keywords:'reload refresh actualiser', action: function(){ _hardReload(); }}
  ];
  var cmdModal, cmdInput, cmdResults, cmdSelectedIdx = 0, cmdItems = [];
  function initCommandPalette(){
    cmdModal = document.createElement('div');
    cmdModal.id = '__cmd-modal';
    cmdModal.setAttribute('role', 'dialog');
    cmdModal.setAttribute('aria-modal', 'true');
    cmdModal.setAttribute('aria-labelledby', '__cmd-title');
    cmdModal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);' +
      'z-index:100000;display:none;align-items:flex-start;justify-content:center;padding-top:10vh;';
    cmdModal.innerHTML =
      '<div style="background:#17171b;border:1px solid rgba(255,255,255,0.12);border-radius:14px;' +
      'width:min(600px,92vw);max-height:70vh;display:flex;flex-direction:column;overflow:hidden;' +
      'box-shadow:0 24px 60px rgba(0,0,0,0.7);">' +
      '<h2 id="__cmd-title" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;">Palette de commandes</h2>' +
      '<input id="__cmd-input" type="text" placeholder="Tape une commande, une page..." aria-label="Recherche commande ou page" aria-controls="__cmd-results" autocomplete="off" spellcheck="false" ' +
      'style="background:none;border:none;color:#ededef;padding:18px 22px;font-size:16px;outline:none;' +
      'border-bottom:1px solid rgba(255,255,255,0.08);">' +
      '<div id="__cmd-results" role="listbox" aria-label="Commandes disponibles" style="overflow-y:auto;padding:6px 0;flex:1;"></div>' +
      '<div style="padding:10px 22px;font-size:11px;color:#5c5c62;border-top:1px solid rgba(255,255,255,0.06);' +
      'display:flex;gap:14px;flex-wrap:wrap;">' +
      '<span>↑↓ naviguer</span><span>↵ valider</span><span>Esc fermer</span>' +
      '</div></div>';
    document.body.appendChild(cmdModal);
    cmdInput = cmdModal.querySelector('#__cmd-input');
    cmdResults = cmdModal.querySelector('#__cmd-results');
    cmdInput.addEventListener('input', function(){
      cmdSelectedIdx = 0;
      renderCmdResults();
    });
    cmdInput.addEventListener('keydown', handleCmdKey);
    cmdModal.addEventListener('click', function(e){ if (e.target === cmdModal) closeCmd(); });
  }
  function openCmd(){
    cmdModal.style.display = 'flex';
    cmdInput.value = '';
    cmdSelectedIdx = 0;
    renderCmdResults();
    setTimeout(function(){ cmdInput.focus(); }, 50);
  }
  function closeCmd(){
    cmdModal.style.display = 'none';
    if (cmdInput) {
      cmdInput.removeAttribute('aria-activedescendant');
      cmdInput.blur();
    }
  }
  function renderCmdResults(){
    var q = cmdInput.value.trim().toLowerCase();
    cmdItems = commands.map(function(c){
      var hay = (c.label + ' ' + (c.keywords||'')).toLowerCase();
      var score = q ? window.__fuzzyScore(q, hay) : 1;
      return Object.assign({}, c, {score: score});
    }).filter(function(c){ return !q || c.score > 0; }).sort(function(a,b){ return b.score - a.score; });
    if (cmdSelectedIdx >= cmdItems.length) cmdSelectedIdx = 0;
    cmdResults.innerHTML = cmdItems.map(function(c, i){
      return '<div class="__cmd-item" id="__cmd-opt-' + i + '" role="option" aria-selected="' + (i === cmdSelectedIdx ? 'true' : 'false') + '" data-idx="' + i + '" style="padding:11px 22px;cursor:pointer;' +
        'display:flex;align-items:center;gap:14px;' +
        (i === cmdSelectedIdx ? 'background:rgba(167,139,250,0.16);' : '') + '">' +
        '<span style="font-size:18px;">' + c.icon + '</span>' +
        '<span style="color:#ededef;font-size:14px;">' + c.label + '</span>' +
        '</div>';
    }).join('');
    if (cmdItems.length) cmdInput.setAttribute('aria-activedescendant', '__cmd-opt-' + cmdSelectedIdx);
    else cmdInput.removeAttribute('aria-activedescendant');
    Array.prototype.forEach.call(cmdResults.querySelectorAll('.__cmd-item'), function(el){
      el.addEventListener('click', function(){
        var it = cmdItems[+el.dataset.idx];
        if (it){ it.action(); closeCmd(); }
      });
      el.addEventListener('mouseenter', function(){
        cmdSelectedIdx = +el.dataset.idx;
        Array.prototype.forEach.call(cmdResults.querySelectorAll('.__cmd-item'), function(el2, j){
          el2.style.background = j === cmdSelectedIdx ? 'rgba(167,139,250,0.16)' : '';
          el2.setAttribute('aria-selected', j === cmdSelectedIdx ? 'true' : 'false');
        });
        cmdInput.setAttribute('aria-activedescendant', el.id);
      });
    });
  }
  function handleCmdKey(e){
    if (e.key === 'Escape'){ e.preventDefault(); closeCmd(); }
    else if (e.key === 'ArrowDown'){ e.preventDefault(); cmdSelectedIdx = Math.min(cmdItems.length-1, cmdSelectedIdx+1); renderCmdResults(); }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); cmdSelectedIdx = Math.max(0, cmdSelectedIdx-1); renderCmdResults(); }
    else if (e.key === 'Enter'){ e.preventDefault(); if (cmdItems[cmdSelectedIdx]){ cmdItems[cmdSelectedIdx].action(); closeCmd(); } }
  }
  function showShortcutsHelp(){
    var existing = document.getElementById('__shortcuts-modal');
    if (existing){ existing.remove(); return; }
    var div = document.createElement('div');
    div.id = '__shortcuts-modal';
    div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(6px);' +
      'z-index:100001;display:flex;align-items:center;justify-content:center;padding:20px;';
    var kbdRow = function(key, lbl){
      return '<kbd style="background:#22222a;padding:4px 10px;border-radius:5px;font-family:monospace;border:1px solid rgba(255,255,255,.06);">' + key + '</kbd>' +
             '<span style="color:#c2c2c6;">' + lbl + '</span>';
    };
    div.innerHTML =
      '<div style="background:#17171b;border:1px solid rgba(255,255,255,0.12);border-radius:14px;' +
      'padding:24px 26px;width:min(480px,94vw);color:#ededef;max-height:90vh;overflow-y:auto;">' +
      '<h3 style="margin:0 0 4px 0;font-size:18px;font-weight:800;letter-spacing:-.3px;">⌨️ Raccourcis clavier</h3>' +
      '<p style="margin:0 0 18px;font-size:12px;color:#8a8a90;">Naviguer vite sur le dashboard.</p>' +
      '<div style="font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:#a78bfa;font-weight:700;margin-bottom:8px;">Navigation</div>' +
      '<div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:13px;margin-bottom:18px;">' +
      kbdRow('H', '🏠 Accueil') +
      kbdRow('V', '💎 Le marché se trompe') +
      kbdRow('I', '💼 Mises du jour (Investissement)') +
      kbdRow('T', '⭐ Top du jour') +
      kbdRow('L', '🔒 Locks (haute confiance)') +
      kbdRow('C', '🔗 Combinés') +
      kbdRow('B', '⚽ Buteurs') +
      kbdRow('S', '📋 Tous les matchs') +
      kbdRow('M', '💰 Bilan') +
      kbdRow('F', '⭐ Favoris') +
      kbdRow('P', '👤 Profil') +
      kbdRow('G', '📚 Académie') +
      '</div>' +
      '<div style="font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:#a78bfa;font-weight:700;margin-bottom:8px;">Recherche & data</div>' +
      '<div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:13px;margin-bottom:18px;">' +
      kbdRow('Ctrl+K', 'Palette de commandes') +
      kbdRow('/', 'Focus la recherche') +
      kbdRow('R', '🔄 Actualiser les données') +
      kbdRow('↑ ↓', 'Naviguer suggestions') +
      kbdRow('← →', 'Jour précédent / suivant') +
      '</div>' +
      '<div style="font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:#a78bfa;font-weight:700;margin-bottom:8px;">Système</div>' +
      '<div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:13px;">' +
      kbdRow('Maj+T', 'Cycler thème (sombre/clair/auto)') +
      kbdRow('?', 'Cette aide') +
      kbdRow('Esc', 'Fermer modal / suggestions') +
      '</div>' +
      '<div style="text-align:right;margin-top:18px;">' +
      '<button id="__close-shortcuts" style="background:#a78bfa;color:#fff;border:none;padding:8px 16px;' +
      'border-radius:8px;cursor:pointer;font-size:13px;">Fermer</button>' +
      '</div></div>';
    document.body.appendChild(div);
    var _closeShortcuts = function(){
      div.remove();
      document.removeEventListener('keydown', _onShortcutsKey, true);
    };
    var _onShortcutsKey = function(ev){
      if (ev.key === 'Escape') { ev.preventDefault(); _closeShortcuts(); }
    };
    div.querySelector('#__close-shortcuts').onclick = _closeShortcuts;
    div.onclick = function(e){ if (e.target === div) _closeShortcuts(); };
    // Esc closes — capture phase so it wins against later page handlers
    document.addEventListener('keydown', _onShortcutsKey, true);
  }
  function initShortcuts(){
    document.addEventListener('keydown', function(e){
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')){
        e.preventDefault(); if (cmdModal) openCmd();
        return;
      }
      var typing = e.target && e.target.matches && e.target.matches('input,textarea,select,[contenteditable="true"]');
      if (typing) return;
      if (cmdModal && cmdModal.style.display !== 'none') return;
      // v30 fix : `?` nécessite Shift sur la plupart des claviers, donc l'early
      // return historique sur shiftKey killait le shortcut. On le check d'abord.
      if (e.key === '?'){ e.preventDefault(); showShortcutsHelp(); return; }
      // v23 — shortcuts single-key (pas de shift, évite conflit avec Maj+T qui bascule theme)
      if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      else if (e.key === 'h'){ var b=document.querySelector('.page-btn[data-page="dashboard"]'); if(b) b.click(); }
      // v31.5 — 's' redirige vers Tous (page "simples" supprimée du nav)
      else if (e.key === 's'){ var b=document.querySelector('.page-btn[data-page="tous"]'); if(b) b.click(); }
      // v31.5 — 't' = Top du jour (nouvelle landing pronos)
      else if (e.key === 't'){ var b=document.querySelector('.page-btn[data-page="top"]'); if(b) b.click(); }
      else if (e.key === 'l'){ var b=document.querySelector('.page-btn[data-page="locks"]'); if(b) b.click(); }
      else if (e.key === 'c'){ var b=document.querySelector('.page-btn[data-page="combines"]'); if(b) b.click(); }
      else if (e.key === 'b'){ var b=document.querySelector('.page-btn[data-page="buteurs"]'); if(b) b.click(); }
      else if (e.key === 'm'){ var b=document.querySelector('.page-btn[data-page="bilan"]'); if(b) b.click(); }  // 'm' redirige vers Bilan (Mes paris retiré)
      // v31.5 — 'g' (Académie) ouvre maintenant la page statique externe
      else if (e.key === 'g'){ window.location.href = 'academie.html'; }
      else if (e.key === 'p'){ var b=document.querySelector('.page-btn[data-page="profil"]'); if(b) b.click(); }
      // Sprint 121 (v31.7.191) — Shortcuts pour nouvelles pages :
      else if (e.key === 'v'){ var b=document.querySelector('.page-btn[data-page="valeur"]'); if(b) b.click(); }      // 💎 Valeur
      else if (e.key === 'i'){ var b=document.querySelector('.page-btn[data-page="plan-mise"]'); if(b) b.click(); }   // 🎯 Investissement (Plan de mise)
      else if (e.key === 'f'){ var b=document.querySelector('.page-btn[data-page="favoris"]'); if(b) b.click(); }     // ⭐ Favoris
      else if (e.key === 'r'){
        // Refresh data : trigger pollData() si dispo
        try {
          if (typeof window.pollData === 'function') window.pollData(true);
          var rfrBtn = document.querySelector('[data-force-refresh], #refresh-btn');
          if (rfrBtn) rfrBtn.click();
          if (typeof window.toast === 'function') window.toast('🔄 Actualisation des données…', 'info');
        } catch(err) { reportEnhancementError('enh shortcut refresh', err); }
      }
      else if (e.key === '/'){
        // Focus search input
        e.preventDefault();
        var search = document.getElementById('search');
        if (search) { search.focus(); search.select && search.select(); }
      }
    });
  }

  // ========== CHANTIER EEE — Calendar heatmap profit ==========
  // Fix 2026-04-22 : heatmap injectée comme SIBLING de #bilan-wrap (pas
  // enfant). renderBilanPage fait `wrap.innerHTML = '...'` à chaque switch
  // de window/mode/stake, ce qui effaçait la heatmap. En la plaçant après
  // bilan-wrap dans <main>, elle survit aux re-renders. Visibilité toggle
  // via observer sur la classe .active du bouton nav Bilan.
  function isBilanActive(){
    var navBtn = document.querySelector('[data-page="bilan"]');
    return navBtn && navBtn.classList.contains('active');
  }
  function updateCalHeatmapVisibility(){
    var c = document.getElementById('__cal-heatmap');
    if (!c) return;
    c.style.display = isBilanActive() ? '' : 'none';
  }
  function populateCalHeatmapGrid(container){
    var bets = getTrackedBets();
    var dayProfits = {};
    bets.forEach(function(b){
      var day = (b.date || b.matchDate || '').split('T')[0];
      if (!day) return;
      var profit = 0;
      if (b.profit != null) profit = parseFloat(b.profit);
      else if (b.status === 'gagné' || b.status === 'won' || b.status === 'win'){
        profit = (parseFloat(b.odds||b.odd||1) - 1) * parseFloat(b.stake||1);
      } else if (b.status === 'perdu' || b.status === 'lost' || b.status === 'lose'){
        profit = -parseFloat(b.stake||1);
      }
      dayProfits[day] = (dayProfits[day] || 0) + profit;
    });
    var maxAbs = 0;
    Object.keys(dayProfits).forEach(function(k){
      var v = Math.abs(dayProfits[k]);
      if (v > maxAbs) maxAbs = v;
    });
    if (maxAbs === 0) maxAbs = 1;
    var grid = container.querySelector('#__cal-grid');
    var today = new Date();
    var cells = [], totalProfit = 0, daysWithBets = 0, winDays = 0, loseDays = 0;
    for (var i = 89; i >= 0; i--){
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      var key = d.toISOString().split('T')[0];
      var profit = dayProfits[key];
      var has = profit != null;
      if (has){ totalProfit += profit; daysWithBets++; if (profit > 0) winDays++; else if (profit < 0) loseDays++; }
      var color;
      if (!has || profit === 0) color = '#22222a';
      else if (profit > 0) color = 'rgba(52,211,153,' + (0.25 + 0.7 * Math.min(1, Math.abs(profit)/maxAbs)) + ')';
      else color = 'rgba(248,113,113,' + (0.25 + 0.7 * Math.min(1, Math.abs(profit)/maxAbs)) + ')';
      var label = key + (has ? ' — ' + (profit >= 0 ? '+' : '') + profit.toFixed(2) + '€' : ' — aucun pari');
      cells.push('<div title="' + label + '" style="aspect-ratio:1;background:' + color + ';border-radius:3px;"></div>');
    }
    grid.innerHTML = cells.join('');
    var sum = container.querySelector('#__cal-summary');
    if (daysWithBets){
      sum.innerHTML = '<strong>' + daysWithBets + '</strong> jours actifs · ' +
        '<span style="color:#34d399;">' + winDays + ' gagnants</span> · ' +
        '<span style="color:#f87171;">' + loseDays + ' perdants</span> · ' +
        'Total: <strong style="color:' + (totalProfit >= 0 ? '#34d399' : '#f87171') + ';">' +
        (totalProfit >= 0 ? '+' : '') + totalProfit.toFixed(2) + '€</strong>';
    } else {
      sum.textContent = 'Aucune donnée de paris tracké sur les 90 derniers jours';
    }
  }
  function renderCalendarHeatmap(){
    // Si elle existe déjà, on re-populate le grid (pour picker up les
    // nouveaux paris trackés) puis on met à jour la visibilité.
    var existing = document.getElementById('__cal-heatmap');
    if (existing) {
      try { populateCalHeatmapGrid(existing); } catch(e){ reportEnhancementError('enh heatmap populate', e); }
      updateCalHeatmapVisibility();
      return;
    }
    var container = document.createElement('div');
    container.id = '__cal-heatmap';
    container.style.cssText = 'margin:16px auto;max-width:1200px;padding:16px 16px;background:#121215;border-radius:12px;' +
      'border:1px solid rgba(255,255,255,0.06);display:none;';
    container.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">' +
      '<h3 style="margin:0;color:#ededef;font-size:14px;">📅 Calendrier profit (90 derniers jours)</h3>' +
      '<div style="font-size:11px;color:#5c5c62;display:flex;gap:6px;align-items:center;">' +
      '<span>Perte</span>' +
      '<span style="width:10px;height:10px;background:rgba(248,113,113,0.7);border-radius:2px;"></span>' +
      '<span style="width:10px;height:10px;background:#22222a;border-radius:2px;"></span>' +
      '<span style="width:10px;height:10px;background:rgba(52,211,153,0.4);border-radius:2px;"></span>' +
      '<span style="width:10px;height:10px;background:rgba(52,211,153,0.85);border-radius:2px;"></span>' +
      '<span>Gain</span></div></div>' +
      '<div id="__cal-grid" style="display:grid;grid-template-columns:repeat(13,minmax(0,1fr));gap:3px;"></div>' +
      '<div id="__cal-summary" style="margin-top:12px;font-size:12px;color:#c2c2c6;"></div>';
    // Insérer APRÈS #bilan-wrap, comme sibling, pour survivre aux
    // `wrap.innerHTML = '…'` de renderBilanPage (switches window/mode/stake).
    function injectAsSibling(){
      var bilanWrap = document.getElementById('bilan-wrap');
      if (!bilanWrap) return false;
      var parent = bilanWrap.parentNode || document.querySelector('main') || document.body;
      if (bilanWrap.nextSibling) parent.insertBefore(container, bilanWrap.nextSibling);
      else parent.appendChild(container);
      updateCalHeatmapVisibility();
      return true;
    }
    if (!injectAsSibling()){
      var obs = new MutationObserver(function(){
        if (injectAsSibling()) obs.disconnect();
      });
      obs.observe(document.body, {childList:true, subtree:true});
    }
    populateCalHeatmapGrid(container);
  }

  // v30 — Barre d'actions Mes paris retirée avec la page elle-même.
  function injectMesParisActions(){ /* no-op : page Mes paris retirée */ }

  // ========== CHANTIER JJJ — Floating hint Cmd+K ==========
  // v24.5 — Retiré car chevauchait le FAB chatbot (tous deux bottom-right).
  // Le raccourci Ctrl+K reste actif via initShortcuts, et la command palette
  // est accessible via le menu. Pas besoin d'un bouton visible supplémentaire.
  function injectHintButton(){ /* no-op v24.5 */ }

  // ========== INIT ==========
  function init(){
    try { initOffline(); } catch(e){ reportEnhancementError('enh offline init', e); }
    try { initCommandPalette(); initShortcuts(); injectHintButton(); }
    catch(e){ reportEnhancementError('enh command palette init', e); }
    try { restoreShared(); } catch(e){ reportEnhancementError('enh restoreShared init', e); }
    // Migration : réparer les anciens paris trackés "? vs ?" (régression v20).
    // On attend 1.2s pour être sûr que PRONOSTICS_DATA soit chargé.
    setTimeout(function(){ try { repairTrackedBets(); } catch(e){ reportEnhancementError('enh repair tracked delayed', e); } }, 1200);
    setTimeout(function(){
      try { renderCalendarHeatmap(); } catch(e){ reportEnhancementError('enh heatmap initial render', e); }
      try { injectMesParisActions(); } catch(e){ reportEnhancementError('enh mes paris actions', e); }
    }, 900);
    // Re-check on page changes (hash/clicks on .page-btn)
    document.addEventListener('click', function(e){
      if (e.target && e.target.closest && e.target.closest('.page-btn')){
        setTimeout(function(){
          try { renderCalendarHeatmap(); } catch(e){ reportEnhancementError('enh heatmap nav rerender', e); }
          try { injectMesParisActions(); } catch(e){ reportEnhancementError('enh mes paris nav rerender', e); }
        }, 250);
      }
    });
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// v31.7 — Coach IA flottant supprime (jamais utilise). Bloc setupChatbot retire (~300L).

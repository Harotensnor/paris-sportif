(function docsOnboardingModule() {
  'use strict';

  const VERSION = 'v37.020';
  const DONE_KEY = 'ps_docs_onboarding_done_v1';
  const INDEX_URL = 'docs/search-index.json';
  const FAQ_URL = 'docs/FAQPage.jsonld';
  let searchState = { loaded: false, docs: [], idx: null };
  let faqCache = null;

  const TOUR_STEPS = [
    { target: '#top-picks-wrap', title: 'Le tableau du jour', body: 'Commence ici : les picks sont déjà triés, dédupliqués et filtrés pour rester actionnables.' },
    { target: '.dash-pick-card, .interactive', title: 'Lire une carte', body: 'Score qualité, tier, cote et edge racontent quatre choses différentes. Le score priorise, la cote paie, le tier décrit le risque.' },
    { target: '#filters', title: 'Filtrer sans se perdre', body: 'Sport, tier, heure et recherche servent à réduire le bruit. Si un filtre vide tout, le compteur te le montre.' },
    { target: '#summary-bar', title: 'Santé du pool', body: 'La barre de synthèse indique combien de pronos restent et si la donnée est fraîche.' },
    { target: '.page-btn[data-page="performance"]', title: 'Mesurer', body: 'Performance sépare le modèle, ton suivi personnel, la calibration et les alertes pipeline.' },
    { target: '.page-btn[data-page="profil"]', title: 'Régler et exporter', body: 'Profil centralise préférences, données locales, exports et diagnostics admin.' },
    { target: '.page-btn[data-page="academie"]', title: 'Comprendre', body: 'Méthode, glossaire et FAQ expliquent les mots techniques sans masquer les limites.' },
    { target: '#docs-help-button', title: 'Aide contextuelle', body: 'Le bouton ? ouvre une aide adaptée à la page, avec recherche dans la base documentaire.' },
  ];

  const FALLBACK_FAQ = [
    ['Modèle', 'Comment choisir un pari ?', 'Lis score qualité, tier, cote puis risques dans la modal détail.'],
    ['Modèle', 'Que signifie edge ?', 'L’edge mesure l’écart entre probabilité modèle et probabilité implicite de la cote.'],
    ['Données', 'Pourquoi le footer indique données anciennes ?', 'Parce que l’âge de `data.generated_at` dépasse le seuil de fraîcheur.'],
    ['Paris', 'Qu’est-ce qu’un void ?', 'Un pari annulé ou remboursé, par exemple report ou ligne push.'],
    ['Technique', 'Comment tester vite ?', 'Syntaxe JS, drift pipeline, data integrity, puis tests navigateur ciblés.'],
  ];

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
  function pageSlug() {
    return (location.hash || '#dashboard').slice(1).split('?')[0].split('/')[0] || 'dashboard';
  }
  function toast(message) {
    if (typeof window.toast === 'function') window.toast(message, 'info');
  }
  function reportDocsError(context, error) {
    if (typeof window.logSafeError === 'function') window.logSafeError(context, error);
  }

  function injectStyle() {
    if ($('#docs-onboarding-style')) return;
    const style = document.createElement('style');
    style.id = 'docs-onboarding-style';
    style.textContent = `
      .docs-help-button{position:fixed;right:18px;bottom:84px;z-index:9998;width:48px;height:48px;border-radius:50%;border:1px solid var(--border,rgba(148,163,184,.32));background:var(--brand,#a78bfa);color:#08080a;font-weight:900;font-size:22px;box-shadow:0 16px 40px rgba(0,0,0,.25);cursor:pointer}
      .docs-modal{position:fixed;inset:0;z-index:100000;background:rgba(3,7,18,.72);display:flex;align-items:center;justify-content:center;padding:20px}
      .docs-dialog{width:min(840px,100%);max-height:90vh;overflow:auto;background:var(--panel,#0f172a);color:var(--text,#e5e7eb);border:1px solid var(--border,rgba(148,163,184,.28));border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.42)}
      .docs-dialog header{position:sticky;top:0;background:inherit;border-bottom:1px solid var(--border,rgba(148,163,184,.22));padding:16px 18px;display:flex;justify-content:space-between;gap:12px;align-items:center}
      .docs-dialog h2{margin:0;font-size:20px}.docs-dialog main{padding:18px}.docs-dialog footer{border-top:1px solid var(--border,rgba(148,163,184,.22));padding:14px 18px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
      .docs-close{border:0;background:transparent;color:inherit;font-size:24px;min-width:44px;min-height:44px;cursor:pointer}
      .docs-btn{border:1px solid var(--border,rgba(148,163,184,.35));background:var(--brand,#a78bfa);color:#08080a;border-radius:12px;min-height:44px;padding:10px 14px;font-weight:800;cursor:pointer}
      .docs-btn.secondary{background:transparent;color:var(--text,#e5e7eb)}
      .docs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
      .docs-card{border:1px solid var(--border,rgba(148,163,184,.22));background:var(--panel-2,rgba(15,23,42,.65));border-radius:14px;padding:14px}
      .docs-card h3{margin:0 0 6px}.docs-card p{margin:0;color:var(--text-dim,#9ca3af);line-height:1.55}
      .docs-input{width:100%;min-height:44px;border:1px solid var(--border,rgba(148,163,184,.32));border-radius:12px;background:var(--panel,#111827);color:var(--text,#e5e7eb);padding:10px 12px}
      .docs-search-results{display:grid;gap:10px;margin-top:12px}.docs-result{border:1px solid var(--border,rgba(148,163,184,.22));border-radius:12px;padding:12px;background:rgba(255,255,255,.03)}
      .docs-route{max-width:1180px;margin:0 auto;padding:24px 18px 56px;color:var(--text,#e5e7eb)}
      .docs-route h1{font-size:clamp(30px,4vw,52px);margin:0 0 10px}.docs-route .lead{color:var(--text-dim,#9ca3af);max-width:780px;line-height:1.6}
      .docs-faq-item{border:1px solid var(--border,rgba(148,163,184,.22));border-radius:14px;background:var(--panel-2,rgba(15,23,42,.65));margin:10px 0;padding:4px 12px}
      .docs-faq-item summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:800}.docs-faq-item p{color:var(--text-dim,#9ca3af);line-height:1.55}
      .docs-onboard-card{width:min(560px,calc(100vw - 32px));background:var(--panel,#0f172a);border:1px solid var(--border,rgba(148,163,184,.28));border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.42);padding:18px;color:var(--text,#e5e7eb)}
      .docs-onboard-ring{position:fixed;z-index:99999;border:3px solid var(--brand,#a78bfa);border-radius:14px;box-shadow:0 0 0 9999px rgba(3,7,18,.62);pointer-events:none;transition:all .2s ease}
      .docs-kb-panel{border:1px solid var(--border,rgba(148,163,184,.22));border-radius:16px;padding:16px;margin:0 0 18px;background:linear-gradient(135deg,rgba(167,139,250,.09),rgba(16,185,129,.07))}
      .docs-tip{position:fixed;z-index:100001;max-width:320px;background:var(--panel,#0f172a);color:var(--text,#e5e7eb);border:1px solid var(--border,rgba(148,163,184,.28));border-radius:12px;padding:10px 12px;box-shadow:0 16px 40px rgba(0,0,0,.28);font-size:13px;line-height:1.45}
      @media(max-width:720px){.docs-help-button{right:14px;bottom:76px}.docs-modal{align-items:flex-end;padding:0}.docs-dialog{border-radius:18px 18px 0 0;max-height:92vh}.docs-route{padding:18px 12px 48px}}
    `;
    document.head.appendChild(style);
  }

  function showModal(title, body, footer = '') {
    closeModal();
    const modal = document.createElement('div');
    modal.className = 'docs-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <section class="docs-dialog" tabindex="-1">
        <header><h2>${esc(title)}</h2><button type="button" class="docs-close" data-docs-close aria-label="Fermer">×</button></header>
        <div class="docs-dialog-body">${body}</div>
        <footer>${footer || '<button type="button" class="docs-btn" data-docs-close>OK</button>'}</footer>
      </section>
    `;
    modal.addEventListener('click', (event) => {
      if (event.target === modal || event.target.closest('[data-docs-close]')) {
        // AUDIT 2026-05-08 : si le modal courant est le tour guidé,
        // dismisser via × ou backdrop = équivalent à terminer le tour
        // (sinon le tour réapparaît à chaque reload). finishTour() set
        // DONE_KEY + appelle le callback de progression boot_step.
        if (tourDoneCallback || $('[data-docs-tour-next], [data-docs-tour-skip]')) {
          finishTour();
        } else {
          closeModal();
        }
      }
    });
    document.body.appendChild(modal);
    $('.docs-dialog', modal)?.focus();
  }
  function closeModal() { $('.docs-modal')?.remove(); }

  async function loadSearchIndex() {
    if (searchState.loaded) return searchState;
    try {
      const res = await fetch(INDEX_URL, { cache: 'no-cache' });
      const data = await res.json();
      const docs = Array.isArray(data.documents) ? data.documents : [];
      let idx = null;
      if (typeof window.lunr === 'function') {
        idx = window.lunr(function build() {
          this.ref('id');
          this.field('title');
          this.field('body');
          docs.forEach(doc => this.add(doc));
        });
      }
      searchState = { loaded: true, docs, idx };
    } catch (error) {
      reportDocsError('docs search index load', error);
      searchState = { loaded: true, docs: [], idx: null };
    }
    return searchState;
  }
  async function searchDocs(query) {
    const q = String(query || '').trim();
    if (q.length < 2) return [];
    const state = await loadSearchIndex();
    if (state.idx) {
      try {
        const byId = new Map(state.docs.map(doc => [doc.id, doc]));
        return state.idx.search(q).slice(0, 8).map(hit => byId.get(hit.ref)).filter(Boolean);
      } catch (error) {
        reportDocsError('docs lunr search', error);
      }
    }
    const needle = q.toLowerCase();
    return state.docs
      .filter(doc => `${doc.title} ${doc.body}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }
  function renderResults(root, results) {
    const box = $('[data-docs-search-results]', root);
    if (!box) return;
    box.innerHTML = results.length
      ? results.map(doc => `
        <a class="docs-result" href="${esc(doc.path)}" target="_blank" rel="noopener">
          <strong>${esc(doc.title)}</strong>
          <p>${esc(String(doc.body || '').slice(0, 180))}...</p>
        </a>
      `).join('')
      : '<div class="docs-result">Aucun résultat pour cette recherche.</div>';
  }

  async function loadFaq() {
    if (faqCache) return faqCache;
    try {
      const res = await fetch(FAQ_URL, { cache: 'no-cache' });
      const json = await res.json();
      faqCache = (json.mainEntity || []).map(item => [
        'FAQ',
        item.name,
        item.acceptedAnswer && item.acceptedAnswer.text ? item.acceptedAnswer.text : ''
      ]);
    } catch (error) {
      reportDocsError('docs faq load', error);
      faqCache = FALLBACK_FAQ;
    }
    return faqCache;
  }

  function ensureDocsWrap() {
    const main = $('#main-content') || document.body;
    let wrap = $('#docs-route-wrap');
    if (!wrap) {
      wrap = document.createElement('section');
      wrap.id = 'docs-route-wrap';
      wrap.className = 'docs-route';
      main.appendChild(wrap);
    }
    return wrap;
  }
  function setDocsMode(active) {
    const main = $('#main-content');
    const wrap = ensureDocsWrap();
    if (!main) return;
    Array.from(main.children).forEach(child => {
      if (child === wrap) return;
      if (active) {
        if (!child.dataset.docsPrevDisplay) child.dataset.docsPrevDisplay = child.style.display || '__empty__';
        child.style.display = 'none';
      } else if (child.dataset.docsPrevDisplay) {
        child.style.display = child.dataset.docsPrevDisplay === '__empty__' ? '' : child.dataset.docsPrevDisplay;
        delete child.dataset.docsPrevDisplay;
      }
    });
    wrap.style.display = active ? '' : 'none';
  }
  async function renderFaqPage() {
    setDocsMode(true);
    const wrap = ensureDocsWrap();
    wrap.innerHTML = `
      <h1>FAQ</h1>
      <p class="lead">Réponses rapides sur le modèle, les données, les paris, la technique et le légal. La version longue vit dans <code>docs/FAQ.md</code>.</p>
      <input class="docs-input" data-docs-faq-filter placeholder="Filtrer les questions">
      <div data-docs-faq-list></div>
    `;
    const items = await loadFaq();
    const draw = (filter = '') => {
      const f = filter.toLowerCase();
      const visible = items.filter(([, q, a]) => `${q} ${a}`.toLowerCase().includes(f));
      $('[data-docs-faq-list]', wrap).innerHTML = visible.map(([, question, answer], index) => `
        <details class="docs-faq-item" ${index < 5 ? 'open' : ''}>
          <summary>${esc(question)}</summary>
          <p>${esc(answer)}</p>
        </details>
      `).join('');
    };
    draw();
    $('[data-docs-faq-filter]', wrap).addEventListener('input', event => draw(event.target.value));
    injectFaqJsonLd(items);
  }
  function injectFaqJsonLd(items) {
    $('#docs-faq-jsonld')?.remove();
    const script = document.createElement('script');
    script.id = 'docs-faq-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: items.map(([, question, answer]) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer }
      }))
    });
    document.head.appendChild(script);
  }
  function renderTourPage() {
    setDocsMode(true);
    const wrap = ensureDocsWrap();
    wrap.innerHTML = `
      <h1>Tour des features</h1>
      <p class="lead">Une carte rapide de ce que fait le site et où cliquer quand tu veux vérifier un chiffre.</p>
      <div class="docs-grid">
        ${[
          ['Accueil', 'Picks du jour, tiers, score qualité, raisons et alertes data.'],
          ['Tous', 'Vue dense filtrable avec tri, dédup et diversité par match.'],
          ['Performance', 'ROI, Brier, CLV, historique, P&L personnel et santé pipeline.'],
          ['Profil', 'Préférences, exports, diagnostics, confidentialité et données locales.'],
          ['Méthode', 'Glossaire, pédagogie, FAQ et base de connaissance.'],
          ['Combinés', 'Tickets lisibles, corrélation, partage QR local.'],
          ['Santé data', 'Warnings, traces, source health et freshness.'],
          ['Aide ?', 'Modal contextuelle, recherche docs et relance onboarding.'],
        ].map(([title, body]) => `<article class="docs-card"><h3>${esc(title)}</h3><p>${esc(body)}</p></article>`).join('')}
      </div>
      <div style="margin-top:18px"><button type="button" class="docs-btn" data-docs-start-tour>Relancer le tour guidé</button></div>
    `;
  }
  function routeDocs() {
    const slug = pageSlug();
    if (slug === 'faq') renderFaqPage();
    else if (slug === 'tour') renderTourPage();
    else setDocsMode(false);
  }

  function injectHelpButton() {
    if ($('#docs-help-button')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'docs-help-button';
    btn.className = 'docs-help-button';
    btn.setAttribute('aria-label', 'Aide contextuelle');
    btn.textContent = '?';
    document.body.appendChild(btn);
  }
  function contextHelp() {
    const slug = pageSlug();
    const map = {
      dashboard: ['Accueil', 'Priorise les picks par score qualité, vérifie la fraîcheur data et ouvre la modal avant toute décision.'],
      tous: ['Tous', 'Utilise les filtres puis garde un œil sur les compteurs : ils doivent raconter le même total que les cartes visibles.'],
      performance: ['Performance', 'Sépare bien performance modèle, bilan personnel, calibration et pipeline.'],
      academie: ['Méthode', 'Cherche un terme, lis la FAQ et garde les limites du modèle en tête.'],
      profil: ['Profil', 'Réglages, exports locaux, santé data et privacy controls vivent ici.'],
      faq: ['FAQ', 'Filtre les questions ou ouvre la documentation Markdown pour une réponse longue.'],
      tour: ['Tour', 'Vue d’ensemble des écrans et de leur rôle.'],
    };
    return map[slug] || ['Aide', 'La base de connaissance couvre architecture, pipeline, modèle, data, tests et usage.'];
  }
  function openHelp() {
    const [title, body] = contextHelp();
    showModal(
      `Aide · ${title}`,
      `
        <p>${esc(body)}</p>
        <div class="docs-grid" style="margin:14px 0">
          <a class="docs-card" href="#faq"><h3>FAQ</h3><p>50+ réponses structurées.</p></a>
          <a class="docs-card" href="#tour"><h3>Tour</h3><p>Showcase des écrans clés.</p></a>
          <a class="docs-card" href="docs/GLOSSARY.md" target="_blank" rel="noopener"><h3>Glossaire</h3><p>200+ termes.</p></a>
        </div>
        <input class="docs-input" data-docs-help-search placeholder="Chercher dans la documentation">
        <div class="docs-search-results" data-docs-search-results></div>
      `,
      '<button type="button" class="docs-btn secondary" data-docs-start-tour>Tour guidé</button><button type="button" class="docs-btn" data-docs-close>Fermer</button>'
    );
  }
  function injectAcademieSearch() {
    const wrap = $('#academie-wrap');
    if (!wrap || $('[data-docs-kb-panel]', wrap)) return;
    const panel = document.createElement('section');
    panel.className = 'docs-kb-panel';
    panel.setAttribute('data-docs-kb-panel', '1');
    panel.innerHTML = `
      <h2 style="margin:0 0 6px">Base de connaissance</h2>
      <p style="margin:0 0 12px;color:var(--text-dim,#9ca3af)">Recherche locale dans wiki, FAQ, glossaire, ADRs et runbook.</p>
      <input class="docs-input" data-docs-academie-search placeholder="Ex : Brier, pipeline, Winamax, Kelly">
      <div class="docs-search-results" data-docs-search-results></div>
    `;
    wrap.prepend(panel);
  }

  let tourStep = 0;
  let tourDoneCallback = null;
  function targetRect(selector) {
    const el = selector ? $(selector) : null;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return rect;
  }
  function showTourStep(index = 0) {
    tourStep = Math.max(0, Math.min(TOUR_STEPS.length - 1, index));
    const step = TOUR_STEPS[tourStep];
    $('.docs-onboard-ring')?.remove();
    const rect = targetRect(step.target);
    if (rect) {
      const ring = document.createElement('div');
      ring.className = 'docs-onboard-ring';
      ring.style.left = `${Math.max(8, rect.left - 8)}px`;
      ring.style.top = `${Math.max(8, rect.top - 8)}px`;
      ring.style.width = `${Math.min(window.innerWidth - 16, rect.width + 16)}px`;
      ring.style.height = `${Math.min(window.innerHeight - 16, rect.height + 16)}px`;
      document.body.appendChild(ring);
    }
    showModal(
      `Tour guidé · étape ${tourStep + 1}/${TOUR_STEPS.length}`,
      `<div class="docs-onboard-card" style="box-shadow:none;border:0;padding:0"><h3 style="margin:0 0 8px">${esc(step.title)}</h3><p style="color:var(--text-dim,#9ca3af);line-height:1.6">${esc(step.body)}</p></div>`,
      `
        <button type="button" class="docs-btn secondary" data-docs-tour-skip>Passer</button>
        <button type="button" class="docs-btn secondary" data-docs-tour-prev ${tourStep === 0 ? 'disabled' : ''}" ${tourStep === 0 ? 'disabled' : ''}>Précédent</button>
        <button type="button" class="docs-btn" data-docs-tour-next>${tourStep === TOUR_STEPS.length - 1 ? 'Terminer' : 'Suivant'}</button>
      `
    );
  }
  function startTour(force = true, onDone = null) {
    if (!force && (localStorage.getItem(DONE_KEY) === '1' || navigator.webdriver)) {
      return false;
    }
    tourDoneCallback = typeof onDone === 'function' ? onDone : null;
    showTourStep(0);
    return true;
  }
  function finishTour() {
    localStorage.setItem(DONE_KEY, '1');
    $('.docs-onboard-ring')?.remove();
    closeModal();
    const cb = tourDoneCallback;
    tourDoneCallback = null;
    if (typeof cb === 'function') cb('completed');
    toast('Tour guidé terminé.');
  }

  function bindEvents() {
    document.addEventListener('click', event => {
      const el = event.target.closest('button,a');
      if (!el) return;
      if (el.id === 'docs-help-button') openHelp();
      else if (el.matches('[data-docs-start-tour]')) startTour(true);
      else if (el.matches('[data-docs-tour-skip]')) finishTour();
      else if (el.matches('[data-docs-tour-prev]')) showTourStep(tourStep - 1);
      else if (el.matches('[data-docs-tour-next]')) {
        if (tourStep >= TOUR_STEPS.length - 1) finishTour();
        else showTourStep(tourStep + 1);
      }
    });
    document.addEventListener('input', async event => {
      const input = event.target.closest('[data-docs-help-search],[data-docs-academie-search]');
      if (!input) return;
      renderResults(input.closest('.docs-dialog,.docs-kb-panel') || document, await searchDocs(input.value));
    });
    document.addEventListener('mouseover', event => {
      const el = event.target.closest('[data-doc-tip]');
      if (!el) return;
      showTip(el, el.getAttribute('data-doc-tip'));
    });
    document.addEventListener('mouseout', event => {
      if (event.target.closest('[data-doc-tip]')) $('.docs-tip')?.remove();
    });
    window.addEventListener('hashchange', routeDocs);
  }
  function showTip(el, text) {
    $('.docs-tip')?.remove();
    const rect = el.getBoundingClientRect();
    const tip = document.createElement('div');
    tip.className = 'docs-tip';
    tip.innerHTML = `<strong>Aide</strong><br>${esc(text || '')}`;
    document.body.appendChild(tip);
    tip.style.left = `${Math.min(window.innerWidth - tip.offsetWidth - 12, Math.max(12, rect.left))}px`;
    tip.style.top = `${Math.max(12, rect.bottom + 8)}px`;
  }

  let renderTimer = null;
  function renderSoon() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      injectHelpButton();
      injectAcademieSearch();
      routeDocs();
    }, 120);
  }
  function init() {
    injectStyle();
    injectHelpButton();
    bindEvents();
    routeDocs();
    injectAcademieSearch();
    window.__docsOnboarding = {
      version: VERSION,
      start: () => startTour(true),
      openHelp,
      search: searchDocs,
    };
    const root = $('#main-content') || document.body;
    new MutationObserver(renderSoon).observe(root, { childList: true, subtree: true });
    const params = new URLSearchParams(location.search || '');
    if (params.has('docsNoTour')) localStorage.setItem(DONE_KEY, '1');
    if (params.has('docsTour')) setTimeout(() => startTour(true), 500);
    else if (window.__psBootSequence) {
      window.__psBootSequence.request('docs', ({ done }) => {
        setTimeout(() => {
          const shown = startTour(false, done);
          if (!shown) done();
        }, 500);
        return true;
      }, () => localStorage.getItem(DONE_KEY) === '1' || navigator.webdriver);
    } else {
      setTimeout(() => startTour(false), 1800);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

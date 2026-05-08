import { nextIdle } from './utils.js';

// AUDIT 2026-05-08 (P1.6) — `data_lite_72h.json` retiré du prefetch :
// le sidecar n'était jamais réellement fetché par le runtime, juste préfetché
// au hover (1.9 MB de bande passante gaspillée par hover desktop sur Wi-Fi
// rapide). On garde les sources effectivement consommées.
const NEXT_PAGE_HINTS = new Map([
  ['dashboard', ['health.json']],
  ['performance', ['health.json', 'picks_history_summary.json']],
  ['profil', ['i18n.json']],
  ['sports-tous', ['sports_coverage_extended.js']],
]);

function addPrefetch(href, as = 'fetch') {
  if (!href || document.querySelector(`link[data-perf-prefetch="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  link.as = as;
  link.setAttribute('data-perf-prefetch', href);
  document.head.appendChild(link);
}

export function setupNavigationPrefetch() {
  const handler = (event) => {
    const target = event.target?.closest?.('[data-page], [data-route], [href*="#"]');
    if (!target) return;
    const key = target.dataset.page || target.dataset.route || String(target.getAttribute('href') || '').split('#')[1] || '';
    const hints = NEXT_PAGE_HINTS.get(key) || [];
    nextIdle(() => hints.forEach((href) => addPrefetch(href)));
  };
  document.addEventListener('pointerover', handler, { passive: true });
  document.addEventListener('focusin', handler);
}

export function renderPageShellStatus() {
  return {
    hash: location.hash || '#dashboard',
    ready: document.readyState,
    title: document.title,
  };
}

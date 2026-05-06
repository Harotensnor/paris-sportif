import { formatTimeAgo } from './utils.js';
import { getTierBreakdown as tierBreakdown } from './tier.js';

export function getDataAge(data = window.PRONOSTICS_DATA, opts = {}) {
  const ts = data?.generated_at ? new Date(data.generated_at).getTime() : NaN;
  const nowMs = Number.isFinite(Number(opts.nowMs)) ? Number(opts.nowMs) : Date.now();
  const minutes = Number.isFinite(ts) ? Math.max(0, Math.round((nowMs - ts) / 60000)) : 9999;
  return {
    minutes,
    label: formatTimeAgo(minutes),
    status: minutes <= 30 ? 'fresh' : minutes <= 240 ? 'stale' : 'broken',
    generatedAt: Number.isFinite(ts) ? new Date(ts).toISOString() : null,
  };
}

export function getDisplayablePicks(opts = {}) {
  if (!opts.forceModule && typeof window.getDisplayablePicks === 'function') return window.getDisplayablePicks(opts);
  const data = opts.data || window.PRONOSTICS_DATA || {};
  const days = data.days || {};
  const rows = [];
  for (const day of Object.values(days)) {
    const events = Array.isArray(day?.events) ? day.events : [];
    for (const event of events) {
      if (opts.onlyWinamax !== false && event?.winamax?.available !== true) continue;
      rows.push({ match: event, matchId: event.id || event.uid || `${event.home}-${event.away}-${event.date}` });
    }
  }
  return rows;
}

export function getTierBreakdown(picks) {
  if (typeof window.getTierBreakdown === 'function' && !picks) return window.getTierBreakdown();
  return tierBreakdown(picks || getDisplayablePicks());
}

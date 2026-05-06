export const VERSION = 'v37.017';

export function clamp(value, min = 0, max = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function formatOdd(value) {
  const n = safeNumber(value, 0);
  return n > 0 ? n.toFixed(2) : '-';
}

export function formatPct(value, digits = 1) {
  const n = safeNumber(value, 0);
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(digits)}%`;
}

export function formatEUR(value, digits = 2) {
  const n = safeNumber(value, 0);
  return `${n >= 0 ? '+' : '-'}${Math.abs(n).toFixed(digits)} EUR`;
}

export function formatTimeAgo(minutes) {
  const m = Math.max(0, Math.round(safeNumber(minutes, 0)));
  if (m < 1) return 'a l instant';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h} h ${rest} min` : `${h} h`;
}

export function percentile(values, p) {
  const arr = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!arr.length) return null;
  const idx = Math.min(arr.length - 1, Math.max(0, Math.round((arr.length - 1) * p)));
  return arr[idx];
}

export function nextIdle(callback, timeout = 1200) {
  if ('requestIdleCallback' in window) return window.requestIdleCallback(callback, { timeout });
  return window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 0 }), 0);
}

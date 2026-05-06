import { safeNumber } from './utils.js';

export const TIER_ORDER = ['safe', 'solid', 'value', 'big', 'out', 'watch'];

export const TIER_LABELS = {
  safe: 'Sur',
  solid: 'Solide',
  value: 'Valeur',
  big: 'Big odds',
  out: 'Outsider',
  watch: 'Watch',
};

export function v36TierForCandidate(candidate) {
  const odd = safeNumber(candidate?.odd, 0);
  const conf = safeNumber(candidate?.rel ?? candidate?.prob, 0);
  const edge = safeNumber(candidate?.edge, 0);
  if (odd >= 1.30 && odd < 1.50 && conf >= 0.62 && edge >= 0.01) return { id: 'safe', label: TIER_LABELS.safe, strict: true };
  if (odd >= 1.50 && odd < 2.00 && conf >= 0.50 && edge >= -0.005) return { id: 'solid', label: TIER_LABELS.solid, strict: true };
  if (odd >= 2.00 && odd < 3.00 && conf >= 0.35 && edge >= 0.01) return { id: 'value', label: TIER_LABELS.value, strict: true };
  if (odd >= 3.00 && odd < 5.00 && conf >= 0.18 && edge >= 0.03) return { id: 'big', label: TIER_LABELS.big, strict: true };
  if (odd >= 5.00 && conf >= 0.04 && edge >= 0.05) return { id: 'out', label: TIER_LABELS.out, strict: true };
  return null;
}

export function tierIdOf(pick) {
  return String(pick?.tier?.id || pick?.tierId || pick?.tier || pick?.bucket || 'watch').toLowerCase();
}

export function getTierBreakdown(picks = []) {
  const out = { safe: 0, solid: 0, value: 0, big: 0, out: 0, watch: 0, total: 0 };
  for (const pick of picks || []) {
    const id = out[tierIdOf(pick)] === undefined ? 'watch' : tierIdOf(pick);
    out[id] += 1;
    out.total += 1;
  }
  return out;
}

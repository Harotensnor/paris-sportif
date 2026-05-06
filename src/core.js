import { clamp, safeNumber } from './utils.js';

export function kellyFraction(probability, decimalOdds, kellyMultiplier = 0.25, capPct = 0.10) {
  const p = safeNumber(probability, 0);
  const odd = safeNumber(decimalOdds, 0);
  if (!(p > 0) || !(p < 1) || !(odd > 1)) return 0;
  const b = odd - 1;
  const fullKelly = ((p * b) - (1 - p)) / b;
  return clamp(fullKelly * safeNumber(kellyMultiplier, 0.25), 0, safeNumber(capPct, 0.10));
}

export function qualityScore(match, pred, best = {}) {
  const edge = safeNumber(best.edge ?? pred?.edge ?? pred?.scores?.edge, 0);
  const prob = safeNumber(best.prob ?? pred?.reliability ?? pred?.prob, 0);
  const dataQuality = safeNumber(match?.data_quality ?? match?.quality ?? 0.6, 0.6);
  const marketStability = safeNumber(best.stability ?? pred?.market_stability ?? 0.5, 0.5);
  const leagueTrust = safeNumber(match?.league_trust ?? pred?.league_trust ?? 0.5, 0.5);
  const score =
    14 +
    clamp(edge, -0.02, 0.12) * 220 +
    clamp(prob, 0, 0.85) * 35 +
    clamp(dataQuality, 0, 1) * 16 +
    clamp(marketStability, 0, 1) * 10 +
    clamp(leagueTrust, 0, 1) * 8;
  return {
    score: Math.round(clamp(score, 0, 100)),
    label: score >= 80 ? 'strong' : score >= 60 ? 'good' : score >= 40 ? 'watch' : 'low',
  };
}

export function predictMatch(match) {
  if (typeof window.predictMatch === 'function') return window.predictMatch(match);
  return { pick: null, reliability: 0, skip: true, explain: 'Legacy model not loaded yet' };
}

export function evaluateMarketPick(match, marketKey, pickValue) {
  if (typeof window.evaluateMarketPick === 'function') return window.evaluateMarketPick(match, marketKey, pickValue);
  return null;
}

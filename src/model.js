import { clamp, safeNumber } from './utils.js';

export function poissonProbability(lambda, k) {
  const l = Math.max(0.001, safeNumber(lambda, 0));
  const goals = Math.max(0, Math.floor(safeNumber(k, 0)));
  let factorial = 1;
  for (let i = 2; i <= goals; i += 1) factorial *= i;
  return Math.exp(-l) * Math.pow(l, goals) / factorial;
}

export function eloProbability(eloA, eloB, homeAdvantage = 0) {
  const diff = safeNumber(eloA, 1500) + safeNumber(homeAdvantage, 0) - safeNumber(eloB, 1500);
  return clamp(1 / (1 + Math.pow(10, -diff / 400)), 0.01, 0.99);
}

export function gaussianCdf(x, mean = 0, stdev = 1) {
  const z = (safeNumber(x, 0) - safeNumber(mean, 0)) / Math.max(0.0001, safeNumber(stdev, 1));
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function dixonColesAdjustment(homeGoals, awayGoals, rho = -0.08) {
  const h = Math.max(0, Math.floor(safeNumber(homeGoals, 0)));
  const a = Math.max(0, Math.floor(safeNumber(awayGoals, 0)));
  const r = safeNumber(rho, -0.08);
  if (h === 0 && a === 0) return Math.max(0.85, 1 - r);
  if (h === 0 && a === 1) return Math.max(0.85, 1 + r);
  if (h === 1 && a === 0) return Math.max(0.85, 1 + r);
  if (h === 1 && a === 1) return Math.max(0.85, 1 - r);
  return 1;
}

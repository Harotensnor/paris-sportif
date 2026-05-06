self.onmessage = (event) => {
  const { id, type, picks = [] } = event.data || {};
  if (type !== 'score-distribution') return;
  const started = Date.now();
  const scores = picks.map((pick) => Number(pick?.score ?? pick?.score_quality ?? pick?.qualityScore ?? 0)).filter(Number.isFinite);
  const buckets = Array.from({ length: 10 }, (_, i) => ({ from: i * 10, to: i === 9 ? 100 : i * 10 + 9, n: 0 }));
  for (const score of scores) {
    const idx = Math.max(0, Math.min(9, Math.floor(score / 10)));
    buckets[idx].n += 1;
  }
  const mean = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const variance = scores.length ? scores.reduce((acc, score) => acc + Math.pow(score - mean, 2), 0) / scores.length : 0;
  self.postMessage({
    id,
    ok: true,
    count: scores.length,
    mean: Number(mean.toFixed(2)),
    stdev: Number(Math.sqrt(variance).toFixed(2)),
    distinct: new Set(scores.map((score) => Math.round(score))).size,
    buckets,
    durationMs: Date.now() - started,
  });
};

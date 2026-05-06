self.onmessage = (event) => {
  const { id, type, picks = [] } = event.data || {};
  if (type !== 'simulate') return;
  const started = Date.now();
  let stake = 0;
  let pnl = 0;
  let won = 0;
  let settled = 0;
  for (const pick of picks) {
    const odd = Number(pick?.odd ?? pick?.odd_book ?? pick?.cote ?? 0);
    const result = String(pick?.result || '').toLowerCase();
    if (!(odd > 1) || !['won', 'lost', 'win', 'loss'].includes(result)) continue;
    settled += 1;
    stake += 1;
    if (result === 'won' || result === 'win') {
      won += 1;
      pnl += odd - 1;
    } else {
      pnl -= 1;
    }
  }
  self.postMessage({
    id,
    ok: true,
    settled,
    winRate: settled ? Number((won / settled).toFixed(4)) : 0,
    roi: stake ? Number((pnl / stake).toFixed(4)) : 0,
    pnl: Number(pnl.toFixed(3)),
    durationMs: Date.now() - started,
  });
};

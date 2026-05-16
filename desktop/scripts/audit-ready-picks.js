#!/usr/bin/env node
// Sprint 61 : audit des picks "Fiables" apres durcissement aberrantEdge
const path = require('path');
const { createLegacyEngineService } = require('../src/engine/legacy-engine');

(async () => {
  const projectRoot = path.resolve(__dirname, '..', '..');
  const svc = createLegacyEngineService({ projectRoot });
  const out = await svc.getAnalysis({ bankroll: 100 });
  const all = out.dashboardPicks || [];
  const ready = all.filter(p => p?.safeAssessment?.reliable === true || p?.decisionCenter?.canBet === true);
  console.log(`\n=== ${ready.length} picks Fiables/Bet ===\n`);
  const teamsOf = (p) => {
    const cands = [
      p.matchTitle, p.title,
      p.match?.title,
      [p.match?.home?.short, p.match?.away?.short].filter(Boolean).join(' - '),
      [p.match?.home?.name, p.match?.away?.name].filter(Boolean).join(' - '),
      [p.match?.competitors?.[0]?.name, p.match?.competitors?.[1]?.name].filter(Boolean).join(' - ')
    ].filter(Boolean);
    return (cands[0] || '??').slice(0, 38);
  };
  ready.forEach((p, i) => {
    const rawEdge = Math.round((p.edge || 0) * 1000) / 10;
    const cons = Math.round((p.safeAssessment?.conservativeEdge || 0) * 1000) / 10;
    const conf = Math.round((p.safeAssessment?.confidence || 0) * 100);
    const label = String(p.label || '').slice(0, 30);
    const teams = teamsOf(p);
    const status = p.safeAssessment?.label || '??';
    console.log(`#${i+1} ${teams.padEnd(38)} | ${label.padEnd(30)} | ${String(p.odd).padStart(5)} | edge=${String(rawEdge).padStart(6)}pt cons=${String(cons).padStart(5)}pt | conf=${conf}% | ${status}`);
  });

  console.log(`\n=== Picks avec edge brut >= 22pt (declasses Sprint 61) ===\n`);
  const aberrant = all.filter(p => Number(p.edge) >= 0.22);
  if (!aberrant.length) console.log('Aucun pick avec edge brut >= 22pt');
  aberrant.forEach((p, i) => {
    const rawEdge = Math.round((p.edge || 0) * 1000) / 10;
    const status = p.safeAssessment?.label || '??';
    const reliable = p.safeAssessment?.reliable;
    const teams = teamsOf(p);
    const label = String(p.label || '').slice(0, 30);
    const reasons = (p.safeAssessment?.reasons || []).slice(0, 2).join(' | ');
    console.log(`#${i+1} ${teams.padEnd(38)} | ${label.padEnd(30)} | ${String(p.odd).padStart(5)} | edge=${rawEdge}pt | ${status} reliable=${reliable} | ${reasons}`);
  });
})().catch(e => { console.error(e); process.exit(1); });

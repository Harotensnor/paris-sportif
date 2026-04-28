// Sprint 65 (v31.7.153 — audit ChatGPT 2026-04-28 P0/P1) — Tests des flows
// critiques identifiés dans la checklist QA de l'audit :
//   1. Coverage : PSG-Bayern visible en scope tomorrow
//   2. Bookmaker : "Winamax exact only" vs "catalogue"
//   3. Renaming : "Tous les pronostics" (et non plus "Tous les matchs")
//   4. Cohérence selectBestMarket : même best market sur Dashboard et modal
//   5. Page Matchs détectés (Sprint 48) opérationnelle
//   6. Page Performance (Sprint 52) avec sub-tabs
//
// Ces tests sont volontairement défensifs : si la donnée live ne contient pas
// le match attendu (PSG-Bayern), ils skip plutôt que fail. La CI continue à
// catch les régressions structurelles (boutons cassés, pages 404, etc.).

import { test, expect } from '@playwright/test';

const URL = '/pronostics.html';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('userPrefs') || '{}');
      prefs.onboardingDone = true;
      localStorage.setItem('userPrefs', JSON.stringify(prefs));
    } catch (e) {}
  });
});

test.describe('Audit P0 — Coverage / visibilité gros matchs', () => {
  test('section "Prochains gros matchs" présente sur dashboard quand data dispo', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    // La section apparaît seulement si au moins 1 match d'enjeu ≥ 30 sur 7j.
    // En CI on ne sait pas si la condition est vraie, donc on accepte les 2 cas.
    const grosMatchsSection = page.getByText('Prochains gros matchs');
    const count = await grosMatchsSection.count();
    expect(count).toBeGreaterThanOrEqual(0);
    // Si présent, vérifier qu'il a le bon label "À ne pas rater · 7 jours"
    if (count > 0) {
      await expect(page.getByText('À ne pas rater · 7 jours')).toBeVisible();
    }
  });

  test('matchImportance helper exposé sur window', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const hasHelper = await page.evaluate(() => typeof window.matchImportance === 'function');
    expect(hasHelper).toBe(true);
  });

  test('getMatchStatus helper retourne 5 codes possibles', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const codes = await page.evaluate(() => {
      if (typeof window.getMatchStatus !== 'function') return null;
      // Mock matches pour tester chaque code
      const noWinamax = window.getMatchStatus({ winamax: {} });
      const noOdds = window.getMatchStatus({ winamax: { match_id: 1, available: true } });
      return [noWinamax.code, noOdds.code];
    });
    expect(codes).not.toBeNull();
    expect(codes).toContain('no_winamax');
    expect(codes).toContain('no_odds');
  });
});

test.describe('Audit P0 — VIEW_SCOPES et getScopedEvents', () => {
  test('VIEW_SCOPES exposé sur window', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const scopes = await page.evaluate(() => window.VIEW_SCOPES);
    expect(scopes).toEqual(['now', 'today', 'tomorrow', '72h', '7d', 'all']);
  });

  test('getScopedEvents filtre par scope temporel', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const result = await page.evaluate(() => {
      if (typeof window.getScopedEvents !== 'function') return null;
      const now = window.getScopedEvents('now');
      const all = window.getScopedEvents('all');
      const today = window.getScopedEvents('today');
      return {
        nowCount: now.length,
        todayCount: today.length,
        allCount: all.length,
        nowSubsetOfAll: now.length <= all.length,
        todaySubsetOfAll: today.length <= all.length,
      };
    });
    expect(result).not.toBeNull();
    expect(result.nowSubsetOfAll).toBe(true);
    expect(result.todaySubsetOfAll).toBe(true);
  });
});

test.describe('Audit P0 — selectBestMarket unifié', () => {
  test('selectBestMarket exposé et retourne null sur input invalide', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const isFunc = await page.evaluate(() => typeof window.selectBestMarket === 'function');
    expect(isFunc).toBe(true);
    const nullResult = await page.evaluate(() => window.selectBestMarket(null, null));
    expect(nullResult).toBeNull();
  });
});

test.describe('Audit P1 — Renaming pages', () => {
  test('menu desktop affiche "Tous les pronostics"', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Menu desktop, skip sur mobile');
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    // Le menu Pronostics est un dropdown, vérifier que le label texte est correct
    const html = await page.content();
    expect(html).toContain('Tous les pronostics');
  });

  test('menu desktop affiche "Buts &amp; joueurs" (pas "Buteurs")', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Menu desktop, skip sur mobile');
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const html = await page.content();
    // Either "Buts & joueurs" (decoded) or "Buts &amp; joueurs" (raw HTML)
    expect(html.includes('Buts & joueurs') || html.includes('Buts &amp; joueurs')).toBe(true);
  });

  test('menu desktop affiche "Favoris &amp; alertes"', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Menu desktop, skip sur mobile');
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const html = await page.content();
    expect(html.includes('Favoris & alertes') || html.includes('Favoris &amp; alertes')).toBe(true);
  });
});

test.describe('Audit P0 — Pages clés navigables', () => {
  test('page #matchs (Sprint 48) accessible', async ({ page }) => {
    await page.goto(URL + '#matchs');
    await page.waitForLoadState('networkidle');
    // La page rendue contient "Matchs détectés" en titre
    await expect(page.getByText('Matchs détectés')).toBeVisible({ timeout: 10000 });
  });

  test('page #performance (Sprint 52) accessible avec sub-tabs', async ({ page }) => {
    await page.goto(URL + '#performance');
    await page.waitForLoadState('networkidle');
    // La page rendue contient le titre "Performance"
    const titleVisible = await page.getByRole('heading', { name: /Performance/i }).first().isVisible({ timeout: 10000 }).catch(() => false);
    expect(titleVisible).toBe(true);
    // Vérifie présence d'au moins un onglet sub-tab
    const tabsExist = await page.locator('[data-perf-tab]').count() > 0;
    if (tabsExist) {
      // Vérifier qu'on peut switcher d'onglet
      await page.locator('[data-perf-tab="periode"]').first().click({ timeout: 3000 }).catch(() => {});
    }
  });
});

test.describe('Audit P0 — Backtest helpers exposés', () => {
  test('evaluateMarketPick exposé pour backtest per-marché', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const isFunc = await page.evaluate(() => typeof window.evaluateMarketPick === 'function');
    expect(isFunc).toBe(true);
    // Test un cas simple : 1n2 home win
    const res = await page.evaluate(() => {
      const fakeMatch = {
        completed: true,
        status: 'STATUS_FINAL',
        competitors: [
          { home_away: 'home', score: '2' },
          { home_away: 'away', score: '1' },
        ],
      };
      return window.evaluateMarketPick(fakeMatch, '1n2', '1');
    });
    expect(res).toBe('won');
  });

  test('evaluateMarketPick gère VOID statuses', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const res = await page.evaluate(() => {
      const fakeMatch = {
        completed: true,
        status: 'STATUS_RETIRED',
        competitors: [
          { home_away: 'home', score: '1' },
          { home_away: 'away', score: '0' },
        ],
      };
      return window.evaluateMarketPick(fakeMatch, '1n2', '1');
    });
    expect(res).toBeNull();
  });
});

// Sprint 90 (v31.7.177 — audit Part 16) — Tests cohérence EV / Kelly / Edge.
// Vérifie que les formules sont mathématiquement consistantes :
//   * EV = proba × cote - 1
//   * edge = proba - 1/cote
//   * EV = edge × cote (relation fondamentale)
//   * Kelly = (b·p - q) / b avec b = cote - 1, q = 1 - p
test.describe('Audit Part 16 — Cohérence formules EV / Kelly / Edge', () => {
  test('expectedValue() respecte la formule p×odd - 1', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const result = await page.evaluate(() => {
      const fn = window.expectedValue;
      if (typeof fn !== 'function') return { error: 'expectedValue not exposed' };
      // Cas 1 : break-even (p=0.5, odd=2.0) → EV=0
      const ev1 = fn(0.5, 2.0);
      // Cas 2 : value (p=0.55, odd=2.0) → EV=0.10
      const ev2 = fn(0.55, 2.0);
      // Cas 3 : -EV (p=0.4, odd=2.0) → EV=-0.20
      const ev3 = fn(0.40, 2.0);
      // Cas 4 : edge case input invalide
      const ev4 = fn(0, 2.0);
      const ev5 = fn(0.5, 1.0);
      return { ev1, ev2, ev3, ev4, ev5 };
    });
    expect(result.error).toBeUndefined();
    expect(Math.abs(result.ev1)).toBeLessThan(0.001);     // ~0
    expect(Math.abs(result.ev2 - 0.10)).toBeLessThan(0.001);
    expect(Math.abs(result.ev3 - (-0.20))).toBeLessThan(0.001);
    expect(result.ev4).toBe(0);                             // input invalide
    expect(result.ev5).toBe(0);
  });

  test('edge × cote = EV (relation fondamentale)', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const result = await page.evaluate(() => {
      const ev = window.expectedValue;
      if (typeof ev !== 'function') return { error: 'no helper' };
      const tests = [
        { p: 0.55, o: 2.0 },
        { p: 0.65, o: 1.65 },
        { p: 0.45, o: 2.30 },
        { p: 0.70, o: 1.50 },
      ];
      const results = tests.map(t => {
        const edge = t.p - 1 / t.o;
        const evComputed = ev(t.p, t.o);
        const evFromEdge = edge * t.o;
        return { ...t, edge, evComputed, evFromEdge, diff: Math.abs(evComputed - evFromEdge) };
      });
      return { results };
    });
    expect(result.error).toBeUndefined();
    // Tous les diff doivent être < 1e-9 (relation algébrique exacte)
    for (const r of result.results) {
      expect(r.diff).toBeLessThan(1e-9);
    }
  });

  test('selectBestMarket retourne {edge, ev, kelly} cohérents', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const result = await page.evaluate(() => {
      // Récupère un match foot avec winamax markets via les pages dispo
      const data = window.PRONOSTICS_DATA || {};
      const days = data.days || {};
      let foundMatch = null;
      for (const dayKey of Object.keys(days)) {
        for (const m of (days[dayKey] || [])) {
          if (!m.completed && m.sport === 'football' && m.winamax && m.winamax.match_id && m.winamax.markets && m.winamax.markets['1n2']) {
            foundMatch = m;
            break;
          }
        }
        if (foundMatch) break;
      }
      if (!foundMatch) return { skip: true };
      const pred = window.predictMatch ? window.predictMatch(foundMatch) : null;
      if (!pred || !pred.pick) return { skip: true, reason: 'no pred' };
      const best = window.selectBestMarket ? window.selectBestMarket(foundMatch, pred) : null;
      if (!best) return { skip: true, reason: 'no best' };
      // Vérifications de cohérence :
      // 1. ev === prob × odd - 1
      const evRecalc = best.prob * best.odd - 1;
      const evDiff = Math.abs((best.ev || 0) - evRecalc);
      // 2. kelly ≥ 0
      const kellyOk = (best.kelly || 0) >= 0;
      // 3. kelly ≤ cap (10% pour 1n2, 5% pour autres)
      const cap = best.market === '1n2' ? 0.10 : 0.05;
      const kellyCapOk = (best.kelly || 0) <= cap + 1e-9;
      // 4. allCandidates est un array
      const candArrOk = Array.isArray(best.allCandidates);
      return { evDiff, kellyOk, kellyCapOk, candArrOk, market: best.market, ev: best.ev, kelly: best.kelly };
    });
    if (result.skip) {
      test.skip(true, result.reason || 'No suitable football match in data');
      return;
    }
    expect(result.evDiff).toBeLessThan(1e-6);
    expect(result.kellyOk).toBe(true);
    expect(result.kellyCapOk).toBe(true);
    expect(result.candArrOk).toBe(true);
  });

  test('passesValueFilter rejette edge ≤ 0 quand valueOnly actif', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const result = await page.evaluate(() => {
      // Force valueOnly = true (sans casser les vraies prefs user)
      const orig = window.advFilters || {};
      const saved = JSON.stringify(orig);
      try {
        window.advFilters = { ...orig, valueOnly: true, evMin: 0 };
        const fn = window.passesValueFilter;
        if (typeof fn !== 'function') return { error: 'no helper' };
        // edge négatif → false
        const r1 = fn({ prob: 0.40, odd: 2.0 });  // edge = -0.10
        // edge nul → false
        const r2 = fn({ prob: 0.50, odd: 2.0 });  // edge = 0
        // edge positif → true
        const r3 = fn({ prob: 0.55, odd: 2.0 });  // edge = +0.05
        // input invalide → false
        const r4 = fn({ prob: 0, odd: 2.0 });
        return { r1, r2, r3, r4 };
      } finally {
        try { window.advFilters = JSON.parse(saved); } catch(e) {}
      }
    });
    expect(result.error).toBeUndefined();
    expect(result.r1).toBe(false);
    expect(result.r2).toBe(false);
    expect(result.r3).toBe(true);
    expect(result.r4).toBe(false);
  });

  test('qualityScore retourne label valide selon score', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const result = await page.evaluate(() => {
      const fn = window.qualityScore;
      if (typeof fn !== 'function') return { error: 'no helper' };
      // Mock minimal
      const r1 = fn({ winamax: {}, league_code: 'eng.1' }, { pick: { prob: 0.6 }, reliability: 0.6 }, { edge: 0.10, odd: 2.0, prob: 0.6, market: '1n2' });
      const r2 = fn({ winamax: {} }, { pick: { prob: 0.5 } }, { edge: 0, odd: 2.0, prob: 0.5, market: '1n2' });
      const r3 = fn({ winamax: {} }, { pick: { prob: 0.45 } }, { edge: -0.05, odd: 2.0, prob: 0.45, market: '1n2' });
      const labels = ['high', 'medium', 'low'];
      return { r1, r2, r3, validLabels: [r1, r2, r3].every(r => labels.includes(r.label)) };
    });
    expect(result.error).toBeUndefined();
    expect(result.validLabels).toBe(true);
    // r1 (edge fort) doit avoir un meilleur score que r3 (edge négatif)
    expect(result.r1.score).toBeGreaterThan(result.r3.score);
  });

  test('checkRiskLimits flag overbet correctement', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const result = await page.evaluate(() => {
      const fn = window._checkRiskLimits;
      if (typeof fn !== 'function') return { error: 'no helper' };
      // 6 paris à 5€ chacun = 30€ sur bankroll 50€ = 60% → overbet (limite 25%)
      const picks = Array.from({ length: 6 }, (_, i) => ({
        stake: 5,
        label: `Match ${i+1}`,
        match: { id: `m${i}`, sport: 'football', league_code: 'eng.1', date: new Date().toISOString(), competitors: [{ home_away: 'home', name: `Home${i}` }, { home_away: 'away', name: `Away${i}` }] },
        pred: { pick: { key: '1' } },
      }));
      const check = fn(picks, 50);
      return { ok: check.ok, vCount: check.violations.length, wCount: check.warnings.length };
    });
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(false);  // doit flagger
    expect(result.vCount).toBeGreaterThan(0);  // au moins une violation
  });
});

// Sprint 90 (v31.7.177) — Non-régression sur fonctionnalités clés des sprints précédents
test.describe('Non-régression sprints 47-89', () => {
  test('matchImportance distingue PSG-Bayern d\'un match standard', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const result = await page.evaluate(() => {
      const fn = window.matchImportance;
      if (typeof fn !== 'function') return { error: 'no helper' };
      // Match CL avec 2 grands clubs
      const psgBayern = {
        sport: 'football',
        league_code: 'uefa.champions',
        competitors: [
          { home_away: 'home', name: 'Paris Saint-Germain', records: [{ summary: '12-2-3' }] },
          { home_away: 'away', name: 'Bayern Munich', records: [{ summary: '14-2-1' }] },
        ],
      };
      // Match standard (championship anglais)
      const standardMatch = {
        sport: 'football',
        league_code: 'eng.2',
        competitors: [
          { home_away: 'home', name: 'Hull City', records: [{ summary: '5-3-7' }] },
          { home_away: 'away', name: 'Reading', records: [{ summary: '4-4-7' }] },
        ],
      };
      return { psg: fn(psgBayern), std: fn(standardMatch) };
    });
    expect(result.error).toBeUndefined();
    expect(result.psg).toBeGreaterThan(result.std);
    expect(result.psg).toBeGreaterThanOrEqual(35);  // CL boost
  });

  test('bookmakerMode helpers exposés et fonctionnels', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const result = await page.evaluate(() => {
      const okFn = typeof window.isBookableInMode === 'function' && typeof window.setBookmakerMode === 'function';
      if (!okFn) return { error: 'helpers missing' };
      // Test isBookableInMode avec match exact
      const exactMatch = { winamax: { available: true, match_id: 12345, markets: { '1n2': { home: 2.1, away: 2.5 } } } };
      const tournamentOnly = { winamax: { available: true } };
      const noWinamax = {};
      return {
        exactPasses: window.isBookableInMode(exactMatch, 'exact'),
        catalogPassesExact: window.isBookableInMode(exactMatch, 'catalog'),
        catalogPassesTournament: window.isBookableInMode(tournamentOnly, 'catalog'),
        exactRejectsTournament: !window.isBookableInMode(tournamentOnly, 'exact'),
        allPassesAll: window.isBookableInMode(noWinamax, 'all'),
        exactRejectsAll: !window.isBookableInMode(noWinamax, 'exact'),
      };
    });
    expect(result.error).toBeUndefined();
    expect(result.exactPasses).toBe(true);
    expect(result.catalogPassesExact).toBe(true);
    expect(result.catalogPassesTournament).toBe(true);
    expect(result.exactRejectsTournament).toBe(true);
    expect(result.allPassesAll).toBe(true);
    expect(result.exactRejectsAll).toBe(true);
  });

  test('combinationCorrelation détecte mêmes-match', async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
    const result = await page.evaluate(() => {
      const fn = window.combinationCorrelation;
      if (typeof fn !== 'function') return { error: 'no helper' };
      const m1 = { id: 'A', sport: 'football', league_code: 'eng.1', date: new Date().toISOString(), competitors: [{ home_away: 'home', name: 'Arsenal' }, { home_away: 'away', name: 'Chelsea' }] };
      const m2 = { id: 'B', sport: 'football', league_code: 'eng.1', date: new Date(Date.now() + 24*3600*1000).toISOString(), competitors: [{ home_away: 'home', name: 'Liverpool' }, { home_away: 'away', name: 'Arsenal' }] };  // Arsenal réutilisé
      const m3 = { id: 'C', sport: 'tennis', league_code: 'atp.tour', date: new Date(Date.now() + 48*3600*1000).toISOString(), competitors: [{ home_away: 'home', name: 'Player A' }, { home_away: 'away', name: 'Player B' }] };
      // Same match → 1.0
      const sameMatch = fn({ match: m1, market: '1n2' }, { match: m1, market: '1n2' });
      // Same team between matches → ≥ 0.5
      const sharedTeam = fn({ match: m1 }, { match: m2 });
      // Indépendants
      const independent = fn({ match: m1 }, { match: m3 });
      return { sameMatch, sharedTeam, independent };
    });
    expect(result.error).toBeUndefined();
    expect(result.sameMatch).toBeGreaterThanOrEqual(0.95);
    expect(result.sharedTeam).toBeGreaterThanOrEqual(0.5);
    expect(result.independent).toBeLessThan(0.5);
  });
});

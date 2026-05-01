# BRIEF PHASE 3 FINAL — Claude Code

Tu as déjà fait Phase 1 (P0-3, P0-7 partiel, R1, R3, R4) et Phase 2 (V11 partiel, V12 partiel). Il **reste 12 items concrets** à faire. Ce brief te donne le code exact pour chacun. Pas de design à inventer, pas de question à se poser, juste exécuter.

**Mode : full-auto. Aucune validation. Va jusqu'au bout.**

---

## ⚠️ Avant de commencer (5 min)

```bash
git status
git log --oneline -20
git pull origin main
ls -la .github/workflows/
gh workflow list 2>&1 || echo "gh CLI non dispo"
```

Si `gh` n'est pas dispo : `apt-get install gh` ou `brew install gh` selon la machine.

---

## 🔥 #1 — Pipeline cron (P0-1) — BLOQUANT

La data en prod date du 30/04 16:35Z, on est le 01/05. Il faut **redémarrer le workflow**.

```bash
# Option 1 : forcer un run via gh CLI
gh workflow run refresh.yml --ref main

# Option 2 : commit vide pour réveiller le scheduler
git commit --allow-empty -m "chore: kick scheduler"
git push origin main

# Vérification 5 min après
gh run list --workflow=refresh.yml --limit 5
```

Si après 10 min `data.generated_at` n'a pas bougé sur prod, **inspecte `.github/workflows/refresh.yml`** :
- Cherche un step qui a peut-être été cassé par un fix précédent.
- Lance localement `python scripts/fetch_v3.py 2>&1 | tail -50` pour voir si un fetcher throw.
- Vérifie que `data.js` produit en local a un `generated_at` fresh, puis push manuellement.

**Validation finale** : `curl -s https://harotensnor.github.io/paris-sportif/data.js | head -5 | grep generated_at` doit montrer une date < 30 min.

---

## 🔥 #2 — Filtrer le golf (P0-4)

Dans `scripts/finalize_inline.py` (ou le script qui produit `data.js`), ajoute en tête de fonction :

```python
ALLOWED_SPORTS = {'football', 'tennis', 'basketball', 'hockey', 'baseball'}

def filter_event(ev):
    if ev.get('sport') not in ALLOWED_SPORTS:
        return False
    # nouveau : drop si tous les competitors sont None
    comps = ev.get('competitors') or []
    if comps and all(c is None or (isinstance(c, dict) and not c.get('name')) for c in comps):
        return False
    return True

# puis dans la boucle qui itère sur events :
events = [e for e in events if filter_event(e)]
```

Aussi en frontend, dans `app.js` ajoute le même garde-fou tout en haut de `predictMatch(m)` :

```javascript
const ALLOWED_SPORTS = new Set(['football','tennis','basketball','hockey','baseball']);
function predictMatch(m) {
  if (!ALLOWED_SPORTS.has(m.sport)) return { skip: true, reason: 'sport hors scope' };
  // ... reste de la fn
}
```

Test : après refresh data, `Object.keys(window.PRONOSTICS_DATA.days[window.PRONOSTICS_DATA.today].reduce((a,e)=>{a[e.sport]=1;return a;},{}))` ne doit plus contenir `golf`.

---

## 🔥 #3 — Trust strip overflow (P0-5)

Dans `app.css`, trouve le bloc `.trust-strip` et remplace par :

```css
.trust-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  max-width: 100%;
  overflow: visible;
  padding: 0.5rem 1rem;
  font-size: 13px;
  line-height: 1.2;
}
.trust-strip-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  white-space: nowrap;
}
.trust-strip-sep {
  color: var(--text-dim, rgba(255,255,255,0.3));
  margin: 0 0.25rem;
}
@media (max-width: 1280px) {
  .trust-strip { font-size: 12px; gap: 0.5rem; }
  .trust-strip-sep { display: none; }
}
@media (max-width: 768px) {
  .trust-strip { padding: 0.4rem 0.6rem; }
}
```

Test JS : `document.querySelector('.trust-strip').getBoundingClientRect().width <= window.innerWidth` doit être `true`.

---

## 🔥 #4 — Refonte palette + surfaces (V4)

Dans `app.css`, AU TOUT DÉBUT (après `:root {`), ajoute/remplace :

```css
:root {
  /* Surfaces — 3 niveaux pour hiérarchie */
  --surface-0: #0a0c11;
  --surface-1: #11141b;
  --surface-2: #1a1f2a;
  --surface-3: #232936;

  /* Borders */
  --border-soft: rgba(255, 255, 255, 0.06);
  --border-medium: rgba(255, 255, 255, 0.1);
  --border-strong: rgba(255, 255, 255, 0.16);

  /* Text */
  --text: #f1f3f9;
  --text-dim: rgba(241, 243, 249, 0.62);
  --text-mute: rgba(241, 243, 249, 0.42);

  /* Accents (garde l'existant) */
  --brand: #b6a0ff;
  --success: #34d399;
  --warning: #fbbf24;
  --danger: #f87171;

  /* Typo */
  --fs-base: 15px;
  --fs-sm: 13px;
  --fs-xs: 11px;
  --fs-h2: 22px;
  --fs-h3: 17px;

  /* Espacements */
  --gap-xs: 0.25rem;
  --gap-sm: 0.5rem;
  --gap-md: 1rem;
  --gap-lg: 1.5rem;
  --gap-xl: 2rem;
}

body {
  background: var(--surface-0);
  color: var(--text);
  font-size: var(--fs-base);
  line-height: 1.55;
}

/* Cards harmonisées */
.card,
.kpi-tile,
.modal-section,
.pick-card,
[class*="-card"] {
  background: var(--surface-1);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
  transition: background 120ms ease, border-color 120ms ease;
}

.card:hover,
.pick-card:hover {
  background: var(--surface-2);
  border-color: var(--border-medium);
}

/* H2 plus marqué */
h2, .h2 { font-size: var(--fs-h2); font-weight: 700; line-height: 1.25; margin-block: var(--gap-md); }
h3, .h3 { font-size: var(--fs-h3); font-weight: 600; line-height: 1.3; }
```

---

## 🔥 #5 — Layout principal : casser la colonne 720px (V1)

Dans `app.css`, trouve `.app-layout`, `.page-wrap`, `main`, ou la grille principale et remplace par :

```css
.app-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: 100vh;
}

main, .page-content {
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: var(--gap-md) var(--gap-lg);
}

@media (max-width: 1100px) {
  .app-layout { grid-template-columns: 1fr; }
  .sidebar { display: none; }
  /* La bottom-nav prend le relais — voir #11 */
}
```

Si `main` se trouve déjà dans une grille avec une 3e colonne (right rail), garde-la, sinon laisse 2 colonnes.

---

## 🔥 #6 — Sidebar : retirer la box vide « ⚡ Now » (V12)

Cherche dans `app.js` ou `pronostics.html` le rendu du `.now-block` ou élément qui contient `⚡ Now` au-dessus des sections PICKS.

```javascript
// soit supprimer le bloc complètement
// soit le peupler dynamiquement :
function renderNowBlock() {
  const live = (window.PRONOSTICS_DATA?.days[window.PRONOSTICS_DATA.today] || [])
    .filter(e => e.live && e.live.status === 'in_progress');
  const next = upcomingTopPick(); // helper qui retourne le prochain pick
  if (!live.length && !next) {
    return ''; // rien à afficher → on cache
  }
  return `<div class="now-block">
    ${live.length ? `<div class="now-live">⚡ ${live.length} en direct</div>` : ''}
    ${next ? `<div class="now-next">⏱ Prochain : ${next.label} dans ${formatCountdown(next.start)}</div>` : ''}
  </div>`;
}
```

Si `now-block` est vide → `display: none`. **Pas de gros vide gris**.

---

## 🔥 #7 — Modal détail : strip 6 KPIs en haut (V7, P0-8)

Dans `app.js`, trouve la fonction qui rend la modal détail (cherche `detail-modal` ou `renderMatchDetail`). Juste après le titre + sous-titre, avant les onglets, insère :

```javascript
function renderDecisionStrip(match, pred, best) {
  const ev = window.expectedValue ? window.expectedValue(best.prob, best.odd) : null;
  const quality = window.qualityScore ? window.qualityScore(match, pred, best) : null;
  const tiles = [
    { label: 'Confiance', val: `${Math.round(pred.fiabilite * 100)}%`, kind: pred.fiabilite >= 0.7 ? 'good' : pred.fiabilite >= 0.55 ? 'mid' : 'bad' },
    { label: 'Edge', val: `${best.edge >= 0 ? '+' : ''}${best.edge.toFixed(1)}pt`, kind: best.edge >= 5 ? 'good' : best.edge >= 0 ? 'mid' : 'bad' },
    { label: 'EV', val: ev != null ? `${(ev * 100 >= 0 ? '+' : '')}${(ev * 100).toFixed(1)}%` : '—', kind: ev > 0.05 ? 'good' : ev > 0 ? 'mid' : 'bad' },
    { label: 'Kelly', val: `${(best.kelly * 100).toFixed(1)}%`, kind: best.kelly > 0.03 ? 'good' : best.kelly > 0 ? 'mid' : 'bad' },
    { label: 'Qualité', val: quality ? quality.label : '—', kind: quality?.label === 'high' ? 'good' : quality?.label === 'medium' ? 'mid' : 'bad' },
    { label: 'Action.', val: pred.actionability ? pred.actionability.label : '—', kind: pred.actionability?.score >= 70 ? 'good' : pred.actionability?.score >= 40 ? 'mid' : 'bad' },
  ];
  return `<div class="decision-strip">
    ${tiles.map(t => `
      <div class="decision-tile decision-tile--${t.kind}">
        <div class="decision-tile__val">${t.val}</div>
        <div class="decision-tile__label">${t.label}</div>
      </div>
    `).join('')}
  </div>`;
}
```

CSS associé dans `app.css` :

```css
.decision-strip {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--gap-sm);
  padding: var(--gap-md);
  background: var(--surface-2);
  border-bottom: 1px solid var(--border-soft);
}
.decision-tile {
  background: var(--surface-1);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  padding: 0.65rem 0.8rem;
  text-align: center;
}
.decision-tile__val { font-size: 18px; font-weight: 700; line-height: 1.15; }
.decision-tile__label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); margin-top: 0.2rem; }
.decision-tile--good { border-color: rgba(52, 211, 153, 0.35); }
.decision-tile--good .decision-tile__val { color: var(--success); }
.decision-tile--mid { border-color: rgba(251, 191, 36, 0.3); }
.decision-tile--mid .decision-tile__val { color: var(--warning); }
.decision-tile--bad { border-color: rgba(248, 113, 113, 0.3); }
.decision-tile--bad .decision-tile__val { color: var(--danger); }

@media (max-width: 768px) {
  .decision-strip { grid-template-columns: repeat(3, 1fr); }
}
```

---

## 🔥 #8 — Cards de pick : ajouter logos équipes (V6)

Dans `app.js`, trouve la fonction qui rend une row de pick (cherche `renderPickRow` ou similaire). Le HTML actuel doit ressembler à du `<span>Leeds vs Burnley</span>`. Remplace par :

```javascript
function renderPickRow(m, pred, best) {
  const sides = getSides(m);
  return `<div class="pick-row">
    <div class="pick-row__teams">
      <div class="team team--home">
        ${sides.home.logo ? `<img class="team__logo" src="${sides.home.logo}" alt="" loading="lazy" onerror="this.style.display='none'">` : '<div class="team__logo team__logo--placeholder"></div>'}
        <span class="team__name">${sides.home.short || sides.home.name}</span>
      </div>
      <span class="pick-row__vs">vs</span>
      <div class="team team--away">
        ${sides.away.logo ? `<img class="team__logo" src="${sides.away.logo}" alt="" loading="lazy" onerror="this.style.display='none'">` : '<div class="team__logo team__logo--placeholder"></div>'}
        <span class="team__name">${sides.away.short || sides.away.name}</span>
      </div>
    </div>
    <div class="pick-row__pick">
      <span class="pick-row__choice">${best.label}</span>
      <span class="pick-row__odd">@${best.odd.toFixed(2)}</span>
    </div>
    <div class="pick-row__meta">
      <span class="pick-row__conf pick-row__conf--${pred.fiabilite >= 0.7 ? 'high' : pred.fiabilite >= 0.55 ? 'mid' : 'low'}">${Math.round(pred.fiabilite * 100)}%</span>
      ${best.edge > 0 ? `<span class="pick-row__edge">+${best.edge.toFixed(1)}pt</span>` : ''}
    </div>
  </div>`;
}
```

CSS :

```css
.pick-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--gap-md);
  padding: 0.75rem 1rem;
  background: var(--surface-1);
  border: 1px solid var(--border-soft);
  border-radius: 10px;
  cursor: pointer;
}
.pick-row:hover { background: var(--surface-2); border-color: var(--border-medium); }
.pick-row__teams { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
.team { display: flex; align-items: center; gap: 0.4rem; min-width: 0; }
.team__logo { width: 22px; height: 22px; object-fit: contain; border-radius: 4px; flex-shrink: 0; }
.team__logo--placeholder { background: var(--surface-3); }
.team__name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.pick-row__vs { color: var(--text-mute); font-size: 12px; }
.pick-row__pick { display: flex; align-items: baseline; gap: 0.5rem; }
.pick-row__choice { font-weight: 600; color: var(--brand); }
.pick-row__odd { color: var(--success); font-variant-numeric: tabular-nums; }
.pick-row__meta { display: flex; gap: 0.5rem; }
.pick-row__conf { font-weight: 600; padding: 0.15rem 0.45rem; border-radius: 6px; font-variant-numeric: tabular-nums; }
.pick-row__conf--high { background: rgba(52, 211, 153, 0.15); color: var(--success); }
.pick-row__conf--mid { background: rgba(251, 191, 36, 0.12); color: var(--warning); }
.pick-row__conf--low { background: rgba(248, 113, 113, 0.12); color: var(--danger); }
.pick-row__edge { font-size: 12px; color: var(--success); font-weight: 500; }
```

---

## 🔥 #9 — Theme picker : ajouter « Auto » (P2-1)

Dans `pronostics.html` ou la page Profil, trouve les chips Sombre/Clair et ajoute :

```html
<button class="theme-chip" data-theme="dark">🌙 Sombre</button>
<button class="theme-chip" data-theme="light">☀️ Clair</button>
<button class="theme-chip" data-theme="auto">🔄 Auto</button>
```

Dans `app.js`, étends le handler :

```javascript
function applyTheme(theme) {
  if (theme === 'auto') {
    const sys = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.dataset.theme = sys;
  } else {
    document.documentElement.dataset.theme = theme;
  }
  localStorage.setItem('userPrefs.theme', theme);
}
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
  if ((localStorage.getItem('userPrefs.theme') || 'auto') === 'auto') applyTheme('auto');
});
```

Au boot (avant body) : `applyTheme(localStorage.getItem('userPrefs.theme') || 'auto')`.

---

## 🔥 #10 — Bilan : disclaimer si n < 30 (V9)

Dans `app.js`, trouve `renderBilanPage` ou la section qui affiche `-100.0% rentabilité`. Avant le rendu des KPIs :

```javascript
const n = stats.n_paris || 0;
if (n < 30) {
  wrap.insertAdjacentHTML('afterbegin', `
    <div class="banner banner--info">
      📊 <strong>Échantillon trop petit</strong> — ${n} pari${n > 1 ? 's' : ''} évalué${n > 1 ? 's' : ''} (minimum statistique : 30).
      Les chiffres ci-dessous sont indicatifs, pas représentatifs de la performance long terme.
    </div>
  `);
}
```

CSS :

```css
.banner {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: var(--gap-md);
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.banner--info { background: rgba(182, 160, 255, 0.08); border: 1px solid rgba(182, 160, 255, 0.25); color: var(--text); }
```

Aussi : neutraliser le « Coach IA » si n < 5 :

```javascript
if (n < 5) {
  // remplacer le message du coach par un message neutre
  coachMessage = `On a besoin d'au moins 5 paris réglés avant de pouvoir tirer des leçons. Pour l'instant : ${n} pari${n > 1 ? 's' : ''}, on attend.`;
}
```

---

## 🔥 #11 — Edges anormaux : cap à +15pt (V13)

Dans `app.js`, après le calcul de `best` dans `predictMatch` ou `selectBestMarket` :

```javascript
const EDGE_ANOMALY_CAP = 15;

if (best && best.edge > EDGE_ANOMALY_CAP) {
  best.suspect = true;
  best.suspectReason = `edge ${best.edge.toFixed(1)}pt > ${EDGE_ANOMALY_CAP}pt — probable phantom edge`;
}
```

Dans le rendu (page Mismatches, modal détail) :

```javascript
if (best.suspect) {
  html += `<div class="warning-chip">⚠ Écart anormal — ${best.suspectReason}</div>`;
}
```

CSS :

```css
.warning-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 6px;
  font-size: 12px;
  color: var(--danger);
}
```

Filtre la page Top du jour pour exclure les `best.suspect === true` (ils restent visibles sur Mismatches mais flagués).

---

## 🔥 #12 — Tests Playwright (validation finale)

Crée `tests/phase3-validation.spec.js` :

```javascript
const { test, expect } = require('@playwright/test');

const BASE = 'https://harotensnor.github.io/paris-sportif/pronostics.html';

test('data is fresh (< 1h)', async ({ page }) => {
  await page.goto(BASE + '#dashboard');
  const age = await page.evaluate(() => {
    const d = window.PRONOSTICS_DATA;
    return (Date.now() - new Date(d.generated_at).getTime()) / 3600000;
  });
  expect(age).toBeLessThan(1);
});

test('no golf in data', async ({ page }) => {
  await page.goto(BASE + '#dashboard');
  const sports = await page.evaluate(() => {
    const d = window.PRONOSTICS_DATA;
    return [...new Set(Object.values(d.days).flat().map(e => e.sport))];
  });
  expect(sports).not.toContain('golf');
});

test('trust strip does not overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1568, height: 900 });
  await page.goto(BASE + '#dashboard');
  const ok = await page.evaluate(() => {
    const ts = document.querySelector('.trust-strip');
    return ts.getBoundingClientRect().width <= window.innerWidth;
  });
  expect(ok).toBe(true);
});

test('modal has 6 decision tiles', async ({ page }) => {
  await page.goto(BASE + '#top');
  await page.waitForTimeout(3000);
  await page.locator('.pick-row, .top-pick-card').first().click();
  await page.waitForTimeout(1000);
  const tiles = await page.locator('.decision-tile').count();
  expect(tiles).toBe(6);
});

test('theme has Auto option', async ({ page }) => {
  await page.goto(BASE + '#profil');
  await expect(page.locator('[data-theme="auto"]')).toBeVisible();
});

test('pick rows have team logos', async ({ page }) => {
  await page.goto(BASE + '#top');
  await page.waitForTimeout(3000);
  const logos = await page.locator('.pick-row .team__logo').count();
  expect(logos).toBeGreaterThan(0);
});
```

Lance : `npx playwright test tests/phase3-validation.spec.js`. Tu dois avoir 6/6 verts avant de te déclarer terminé.

---

## ✅ Procédure finale

```bash
# 1. Tous les fixes appliqués + commits séparés
# 2. Bump cache busters
APP_CSS_HASH=$(git hash-object app.css | head -c 8)
APP_JS_HASH=$(git hash-object app.js | head -c 8)
sed -i -E "s|app\.css(\?v=[a-f0-9]+)?|app.css?v=${APP_CSS_HASH}|g" pronostics.html
sed -i -E "s|app\.js(\?v=[a-f0-9]+)?|app.js?v=${APP_JS_HASH}|g" pronostics.html

# Bump SW
sed -i -E "s|CACHE_VERSION = ['\"]v[0-9.]+['\"]|CACHE_VERSION = 'v34.0'|" sw.js

# Bump footer
grep -rn 'v33.41' . --include='*.html' --include='*.js' | head -5
# remplacer toutes les occurrences par v34.0

# 3. Commit final + push
git add -A
git commit -m "feat(phase3): UI refonte + cron restart + golf filter + decision strip + tests"
git push origin main

# 4. Force workflow run
gh workflow run refresh.yml --ref main
sleep 60
gh run list --workflow=refresh.yml --limit 3

# 5. Validation prod (5 min après push)
sleep 300
npx playwright test tests/phase3-validation.spec.js --project=chromium-desktop
```

---

## 📊 Récap final attendu

À la fin, fournis ce récap :

```
✅ FIXÉS PHASE 3
- #1 Cron : data fresh à HH:MM ✓ (workflow run id XXXXX)
- #2 Golf filtré (sports : football, tennis, basketball, hockey, baseball)
- #3 Trust strip : width 2318px → 1240px (mesure)
- #4 Palette 3 surfaces : appliquée à .card, .pick-card, .modal-section
- #5 Layout main 720px → 1280px max
- #6 Now-block : caché si vide
- #7 Modal : 6 decision tiles (Confiance/Edge/EV/Kelly/Qualité/Action.)
- #8 Pick rows : logos équipes ajoutés
- #9 Theme Auto : activé + listener prefers-color-scheme
- #10 Bilan : disclaimer n<30 actif, Coach IA gated n<5
- #11 Edges > 15pt : flagués "écart anormal"
- #12 Tests : 6/6 verts en CI

🚀 DEPLOY
- Commit hash: <SHA>
- URL: https://harotensnor.github.io/paris-sportif/pronostics.html
- Cache buster: app.js?v=NEW, app.css?v=NEW
- Footer: v34.0

⏭️ SKIPPED (raison)
- (idéalement rien)

📊 AVANT/APRÈS
- Data age: 19h → <1h
- Golf events: 1 → 0
- Trust strip overflow: 750px → 0px
- Modal KPI tiles: 0 → 6
- Pick rows with logos: 0 → 100%
- Theme options: 2 → 3
```

---

**EXÉCUTE TOUT. Pas de question, pas de validation. À la fin, donne-moi le récap.**

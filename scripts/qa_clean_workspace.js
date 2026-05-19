const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function git(args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function listFiles(rel, predicate = () => true) {
  const dir = path.join(root, rel);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(dir, entry.name))
    .filter(predicate);
}

function mb(file) {
  return Math.round((fs.statSync(file).size / 1024 / 1024) * 10) / 10;
}

const tracked = git(['ls-files']).split(/\r?\n/).filter(Boolean);
const failures = [];

const trackedExe = tracked.filter((file) => /\.exe$/i.test(file));
if (trackedExe.length) failures.push(`Executables suivis par Git: ${trackedExe.slice(0, 5).join(', ')}`);

const trackedDist = tracked.filter((file) => file.startsWith('desktop/dist/'));
if (trackedDist.length) failures.push(`Builds desktop/dist suivis par Git: ${trackedDist.slice(0, 5).join(', ')}`);

const staleDirs = ['.cache', 'playwright-report', 'test-results', '.pytest_cache', 'desktop/dist/win-unpacked']
  .filter(exists);
if (staleDirs.length) failures.push(`Dossiers regenerables encore presents: ${staleDirs.join(', ')}`);

const installers = listFiles('desktop/dist', (file) => /\.exe$/i.test(file));
if (installers.length > 1) {
  failures.push(`Trop d'installateurs locaux dans desktop/dist: ${installers.length}`);
}

const largeTracked = tracked
  .map((file) => path.join(root, file))
  .filter((file) => fs.existsSync(file) && fs.statSync(file).isFile() && mb(file) >= 20)
  .map((file) => `${path.relative(root, file).replace(/\\/g, '/')} (${mb(file)} MB)`);

if (failures.length) {
  console.error(`qa:clean FAILED\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log(`qa:clean OK: aucun .exe/dist suivi, ${installers.length} installateur local conserve, ${largeTracked.length} gros fichier(s) suivi(s) >=20MB.`);
if (largeTracked.length) {
  console.log(`Gros fichiers suivis a revoir plus tard: ${largeTracked.slice(0, 6).join(' | ')}`);
}

// splice-prono-data.js
// Fusionne l'UI de notre pronostics.html local (deploy-v20/) avec le bloc
// PRONOSTICS_DATA le plus frais (celui du clone fresh qui vient de `git reset
// --hard origin/main`). Ecrit le resultat dans le fresh clone.
//
// Usage : node splice-prono-data.js <src-ui> <src-data> <dest>
//   <src-ui>   : chemin du pronostics.html local (avec notre UI a jour)
//   <src-data> : chemin du pronostics.html remote (avec data a jour)
//   <dest>     : chemin ou ecrire le fichier fusionne (typiquement = src-data)

const fs = require('fs');

const [,, srcUi, srcData, dest] = process.argv;
if (!srcUi || !srcData || !dest) {
  console.error('Usage: node splice-prono-data.js <src-ui> <src-data> <dest>');
  process.exit(1);
}

const RE = /<script>\s*window\.PRONOSTICS_DATA\s*=[\s\S]*?<\/script>/;

const uiHtml   = fs.readFileSync(srcUi, 'utf8');
const dataHtml = fs.readFileSync(srcData, 'utf8');

const dataBlock = (dataHtml.match(RE) || [null])[0];
if (!dataBlock) {
  console.error('Remote pronostics.html has no PRONOSTICS_DATA block — fallback: writing our UI as-is.');
  fs.writeFileSync(dest, uiHtml);
  process.exit(0);
}

if (!RE.test(uiHtml)) {
  console.error('Local UI pronostics.html has no PRONOSTICS_DATA placeholder. Dest unchanged.');
  fs.writeFileSync(dest, uiHtml);
  process.exit(0);
}

const merged = uiHtml.replace(RE, dataBlock);
fs.writeFileSync(dest, merged);
console.log('OK: spliced fresh PRONOSTICS_DATA ('  + dataBlock.length + ' chars) into our UI.');

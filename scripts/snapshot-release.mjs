#!/usr/bin/env node
/**
 * snapshot-release.mjs — copia gli artefatti della release corrente
 * (dist/INGLY-OS.html, dist/INGLY-CLOUD-ADMIN.html) sotto dist/releases/<versione>/
 * e aggiorna RELEASES.json (tracciato in git — piccolo, testuale, storico
 * reale delle release: l'unica source of truth per version/commit/branch/
 * build/stato test/QA/blocker, letta anche da `scripts/compose.mjs` per
 * incorporare `window.INGLY_RELEASE_INFO` nel bundle Admin).
 *
 * dist/ resta ignorato da git (gli HTML sono 10+ MB, riproducibili da
 * `npm run build` su qualunque commit): le copie versionate sotto
 * dist/releases/ sono per l'uso locale, non un secondo archivio permanente.
 * RELEASES.json, che è tracciato, è la fonte di verità storica — piccola
 * apposta, e non duplicata da nessun altro file.
 *
 *   node scripts/snapshot-release.mjs [--tests=PASS] [--qa=PASS] [--blockers="..."]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const version = pkg.version;

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)=(.*)$/);
  return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
}));

function git(cmd) {
  try { return execSync(cmd, { cwd: ROOT }).toString().trim(); } catch (e) { return null; }
}

const commit = git('git rev-parse HEAD');
const branch = git('git rev-parse --abbrev-ref HEAD');
const buildDate = new Date().toISOString();

const distDir = path.join(ROOT, 'dist');
const productSrc = path.join(distDir, 'INGLY-OS.html');
const adminSrc = path.join(distDir, 'INGLY-CLOUD-ADMIN.html');

if (!fs.existsSync(productSrc)) { console.error('manca dist/INGLY-OS.html — esegui prima npm run build'); process.exit(1); }
if (!fs.existsSync(adminSrc)) { console.error('manca dist/INGLY-CLOUD-ADMIN.html — esegui prima npm run build'); process.exit(1); }

const releaseDir = path.join(distDir, 'releases', version);
fs.mkdirSync(releaseDir, { recursive: true });

const productDest = path.join(releaseDir, `INGLY-OS-${version}.html`);
const adminDest = path.join(releaseDir, `INGLY-CLOUD-ADMIN-${version}.html`);
fs.copyFileSync(productSrc, productDest);
fs.copyFileSync(adminSrc, adminDest);

const productSize = fs.statSync(productDest).size;
const adminSize = fs.statSync(adminDest).size;

const releaseManifest = {
  version, commit, branch, buildDate,
  product: `dist/releases/${version}/INGLY-OS-${version}.html`,
  admin: `dist/releases/${version}/INGLY-CLOUD-ADMIN-${version}.html`,
  productBytes: productSize,
  adminBytes: adminSize,
  tests: args.tests || 'UNKNOWN',
  browserQA: args.qa || 'UNKNOWN',
  knownBlockers: args.blockers || null,
  migrationStatus: 'additiva — nessun dato esistente rimosso o incompatibile',
};
fs.writeFileSync(path.join(releaseDir, 'manifest.json'), JSON.stringify(releaseManifest, null, 2) + '\n');

/* RELEASES.json alla radice: tracciato in git, un array che cresce di una
   voce per release, mai riscritto da capo. Se la versione è già presente
   (rilasciata più volte nella stessa sessione prima del commit finale) si
   sostituisce, non si duplica — e le voci delle altre versioni restano
   intatte: questo script non cancella mai la storia delle release. */
const releasesPath = path.join(ROOT, 'RELEASES.json');
const releases = fs.existsSync(releasesPath) ? JSON.parse(fs.readFileSync(releasesPath, 'utf8')) : [];
const senzaQuesta = releases.filter((r) => r.version !== version);
senzaQuesta.push(releaseManifest);
senzaQuesta.sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
fs.writeFileSync(releasesPath, JSON.stringify(senzaQuesta, null, 2) + '\n');

console.log('snapshot release ' + version + ' scritto:');
console.log('  ' + productDest + ' (' + (productSize / 1024 / 1024).toFixed(2) + ' MB)');
console.log('  ' + adminDest + ' (' + (adminSize / 1024).toFixed(0) + ' KB)');
console.log('  ' + path.join(releaseDir, 'manifest.json'));
console.log('  RELEASES.json aggiornato (' + senzaQuesta.length + ' release tracciate)');

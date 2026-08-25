#!/usr/bin/env node
/**
 * build-admin-tester.mjs — incorpora INGLY CLOUD ADMIN dentro il collaudo.
 *
 * Il pannello va *dentro* il file di collaudo, non accanto. Un iframe che
 * punta a `file:///…` ha un'origine opaca e non è pilotabile da JavaScript;
 * un iframe con `srcdoc` eredita l'origine della pagina che lo contiene, e
 * diventa quindi ispezionabile. È ciò che permette al collaudo di funzionare
 * con un doppio clic, senza server e senza installare nulla.
 *
 * Il payload viaggia in base64 perché il sorgente del pannello contiene
 * `</script>` decine di volte: inserirlo come testo lo spezzerebbe.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

const adminPath = process.argv[2] ?? path.join(ROOT, 'dist/INGLY-CLOUD-ADMIN.html');
const outPath = process.argv[3] ?? path.join(ROOT, 'dist/COLLAUDO-ADMIN.html');
const tplPath = path.join(ROOT, 'tools/admin-tester.template.html');

const admin = fs.readFileSync(adminPath);
const tpl = fs.readFileSync(tplPath, 'utf8');

if (!tpl.includes('__PAYLOAD__')) {
  throw new Error('il template non contiene il segnaposto __PAYLOAD__');
}

const b64 = admin.toString('base64');
if (b64.includes('</')) throw new Error('base64 inatteso'); // impossibile, ma è gratis verificarlo

const out = tpl.replace('__PAYLOAD__', b64);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out);

const mb = (n) => (n / 1048576).toFixed(2) + ' MB';
console.log(`collaudo composto: ${path.relative(ROOT, outPath)}`);
console.log(`  pannello incorporato  ${mb(admin.length)} → base64 ${mb(b64.length)}`);
console.log(`  totale                ${mb(out.length)}`);

#!/usr/bin/env node
/**
 * admin-release-info.mjs — la console Admin sa dire che versione di INGLY
 * OS sta gestendo, con dati reali del build — non decorativi, non finti.
 *
 * Prima di questo rilascio nessun punto della console leggeva mai
 * `package.json`: il bundle finale è un file HTML statico, non un'app Node,
 * e nessuno aveva mai incorporato l'informazione al momento del build. Qui
 * si verifica che `window.INGLY_RELEASE_INFO` sia scritto davvero (non
 * `undefined`), che la versione coincida con quella dichiarata in
 * `package.json`, che il commit non sia vuoto (il build è avvenuto in un
 * repository git reale), che gli artefatti Product/Admin siano dichiarati,
 * e che il badge sia visibile e mostri i dettagli — senza richiedere login,
 * e senza generare errori JS.
 *
 *   node tests/qa/admin-release-info.mjs [file]
 */
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'playwright';

const passato = process.argv[2];
const file = (passato && /ADMIN/i.test(passato)) ? passato : 'dist/INGLY-CLOUD-ADMIN.html';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(2000);

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

const info = await page.evaluate(() => window.INGLY_RELEASE_INFO);
dico('window.INGLY_RELEASE_INFO esiste (dato reale del build, non hardcoded)', !!info);
dico('la versione incorporata coincide con package.json', info && info.version === pkg.version, info && info.version);
dico('porta un commit non vuoto (il build è avvenuto in un repository git)', !!(info && info.commit));
dico('porta il branch', !!(info && info.branch));
dico('porta una data di build', !!(info && info.buildDate));
dico('dichiara l\'artefatto Product', info && info.productArtifact === 'dist/INGLY-OS.html', info && info.productArtifact);
dico('dichiara l\'artefatto Admin', info && info.adminArtifact === 'dist/INGLY-CLOUD-ADMIN.html', info && info.adminArtifact);

const badge = await page.evaluate(() => {
  const b = document.getElementById('_release-info-badge');
  return { presente: !!b, testo: b ? b.textContent : null };
});
dico('il badge di versione è visibile in pagina', badge.presente);
dico('mostra la versione corrente', badge.testo === `INGLY OS v${pkg.version}`, badge.testo);

await page.click('#_release-info-badge');
await page.waitForTimeout(200);
const modale = await page.evaluate(() => {
  const m = document.getElementById('_release-info-modal');
  return { presente: !!m, testo: m ? m.textContent : '' };
});
dico('cliccando il badge si apre il dettaglio', modale.presente);
dico('il dettaglio nomina versione, commit e branch', /Versione/.test(modale.testo) && /Commit/.test(modale.testo) && /Branch/.test(modale.testo));
dico('mostra quale file è l\'artefatto Product e quale l\'Admin', /INGLY-OS\.html/.test(modale.testo) && /INGLY-CLOUD-ADMIN\.html/.test(modale.testo));
dico('mostra lo stato di test e QA (anche quando N/D, mai un falso PASS)', /Unit test/.test(modale.testo) && /Browser QA/.test(modale.testo));
dico('dichiara chiaramente cosa richiede un backend, invece di fingere dati live', /backend/i.test(modale.testo));

/* ── il pulsante di chiusura chiude davvero, senza lasciare un residuo ──── */
await page.click('#_release-info-close');
await page.waitForTimeout(150);
const dopoChiusura = await page.evaluate(() => document.querySelectorAll('#_release-info-modal').length);
dico('il pulsante di chiusura rimuove il dettaglio', dopoChiusura === 0, dopoChiusura);

/* ── riaprirlo funziona di nuovo (non è stato un artefatto usa-e-getta) ──── */
await page.click('#_release-info-badge');
await page.waitForTimeout(200);
const riapertura = await page.evaluate(() => !!document.getElementById('_release-info-modal'));
dico('il badge riapre il dettaglio dopo una chiusura', riapertura);
await page.click('#_release-info-close');
await page.waitForTimeout(150);

/* ── esito ─────────────────────────────────────────────────────────────── */
const fallite = passi.filter((p) => !p.esito);
console.log('ADMIN RELEASE INFO →', JSON.stringify({ totale: passi.length, falliti: fallite.length, erroriJS: erroriJS.length }, null, 2));
passi.forEach((p) => console.log(`  ${p.esito ? '✅' : '❌'} ${p.passo}${p.dettaglio != null ? ' — ' + JSON.stringify(p.dettaglio) : ''}`));
if (erroriJS.length) console.log('ERRORI JS:', erroriJS);

await browser.close();
if (fallite.length || erroriJS.length) process.exit(1);

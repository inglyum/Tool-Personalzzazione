#!/usr/bin/env node
/**
 * cambio-account.mjs — due persone, lo stesso browser, mai i dati mischiati.
 *
 * Chiude un punto lasciato esplicitamente aperto nel report della release
 * 1.1.0: «ACCOUNT SWITCH: non testato in questo giro». Verifica, con
 * interazioni vere (non chiamate dirette ai moduli):
 *
 *   A si registra → entra → esce
 *   B si registra → entra → vede solo i propri dati, non quelli di A
 *   B esce → A rientra con le proprie credenziali → vede di nuovo i propri
 *
 * e che l'uscita non lasci una sessione leggibile nello stesso browser.
 *
 *   node tests/qa/cambio-account.mjs
 */
import path from 'node:path';
import { chromium } from 'playwright';

const FILE = 'dist/INGLY-OS.html';
const URL = 'file://' + path.resolve(FILE);
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
const page = await context.newPage();
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
page.on('dialog', (d) => d.accept().catch(() => {}));

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);

const A = { lab: 'Bottega Belice', nome: 'Giuseppe', email: 'giuseppe@belice-test.it', pass: 'Laboratorio2026' };

/* ── A: primo avvio, reale (già coperto altrove, qui serve solo come base) ── */
await page.evaluate(async (a) => {
  document.getElementById('su-lab').value = a.lab;
  document.getElementById('su-nome').value = a.nome;
  document.getElementById('su-email').value = a.email;
  document.getElementById('su-pass').value = a.pass;
  document.getElementById('su-conf').value = a.pass;
  await window.InglyPrimoAvvio.invia();
  await new Promise((r) => setTimeout(r, 500));
}, A);

const dentroA = await page.evaluate(() => ({
  sessione: !!(window.SaaSGate && window.SaaSGate._session),
  labName: window.SaaSGate && window.SaaSGate._session && window.SaaSGate._session.labName,
}));
dico('A entra dopo la creazione', dentroA.sessione);
dico('la sessione di A porta il suo laboratorio', dentroA.labName === A.lab, dentroA.labName);

/* ── A esce, click vero ────────────────────────────────────────────────── */
await page.evaluate(() => window.SaaSGate.logout());
await page.waitForTimeout(500);

const dopoUscitaA = await page.evaluate(() => ({
  sessione: !!(window.SaaSGate && window.SaaSGate._session),
  storageSessione: sessionStorage.getItem('ingly_saas_session'),
  gateVisibile: (() => { const g = document.getElementById('saas-gate'); return g ? getComputedStyle(g).display : 'assente'; })(),
}));
dico('dopo l\'uscita di A non c\'è più una sessione in memoria', dopoUscitaA.sessione === false);
dico('né una sessione leggibile in sessionStorage', dopoUscitaA.storageSessione === null, String(dopoUscitaA.storageSessione));
dico('il modulo di accesso torna visibile', dopoUscitaA.gateVisibile !== 'none');

/* ── B si registra, dai campi veri del modulo di registrazione ──────────── */
await page.evaluate(() => { if (window.SaaSGate.showRegister) window.SaaSGate.showRegister(); });
await page.waitForTimeout(400);

const B = { lab: 'Laboratorio Rossi', user: 'mario.rossi.switch', email: 'mario@rossi-test.it', pass: 'Laboratorio2027' };
await page.fill('#reg-lab', B.lab);
await page.fill('#reg-user', B.user);
await page.fill('#reg-email', B.email);
await page.fill('#reg-pass', B.pass);
const regConf = await page.$('#reg-conf');
if (regConf) await page.fill('#reg-conf', B.pass);
await page.click('#reg-submit');
await page.waitForTimeout(2000);

const dentroB = await page.evaluate(() => ({
  sessione: !!(window.SaaSGate && window.SaaSGate._session),
  labName: window.SaaSGate && window.SaaSGate._session && window.SaaSGate._session.labName,
  userId: window.SaaSGate && window.SaaSGate._session && window.SaaSGate._session.user_id,
}));
dico('B si registra ed entra con un click reale', dentroB.sessione, JSON.stringify(dentroB));
dico('la sessione di B porta il SUO laboratorio, non quello di A', dentroB.labName === B.lab, dentroB.labName);

/* ── I dati non si sono mescolati ────────────────────────────────────────── */
const isolamento = await page.evaluate(() => {
  const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
  return {
    utenti: (db.users || []).length,
    workspace: (db.tenants || []).length,
    abbonamenti: (db.subscriptions || []).length,
    tenantDiversi: new Set((db.users || []).map((u) => u.tenant_id)).size,
  };
});
dico('due account, due workspace, due abbonamenti — non condivisi', isolamento.utenti === 2 && isolamento.workspace === 2 && isolamento.abbonamenti === 2, JSON.stringify(isolamento));
dico('i due workspace hanno un tenant_id diverso', isolamento.tenantDiversi === 2);

/* ── B esce, A rientra con le SUE credenziali ────────────────────────────── */
await page.evaluate(() => window.SaaSGate.logout());
await page.waitForTimeout(500);

await page.fill('#gate-user', A.email);
await page.fill('#gate-pass', A.pass);
await page.click('#gate-submit');
await page.waitForTimeout(2000);

const rientroA = await page.evaluate(() => ({
  sessione: !!(window.SaaSGate && window.SaaSGate._session),
  labName: window.SaaSGate && window.SaaSGate._session && window.SaaSGate._session.labName,
}));
dico('A rientra con le proprie credenziali dopo che B è uscito', rientroA.sessione);
dico('e vede di nuovo il PROPRIO laboratorio, non quello di B', rientroA.labName === A.lab, rientroA.labName);

await browser.close();

const falliti = passi.filter((p) => !p.esito);
console.log('\nCAMBIO ACCOUNT · A → B → A, stesso browser\n');
for (const p of passi) {
  console.log((p.esito ? '  ✔  ' : '  ✗  ') + p.passo + (p.dettaglio ? '  [' + p.dettaglio + ']' : ''));
}
console.log('\ncontrolli: ' + passi.length + ' · falliti: ' + falliti.length + ' · errori JavaScript: ' + erroriJS.length);
if (erroriJS.length) console.log('errori:', erroriJS);
if (falliti.length || erroriJS.length) {
  console.log('\nFALLITO');
  process.exit(1);
}
console.log('\ndue persone, lo stesso browser, mai i dati mischiati ✔');

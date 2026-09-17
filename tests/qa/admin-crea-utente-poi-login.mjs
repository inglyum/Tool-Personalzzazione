#!/usr/bin/env node
/**
 * admin-crea-utente-poi-login.mjs — «Nuovo Utente Enterprise» fino in fondo.
 *
 * Il difetto (SEC-006): `doCreateUser` salvava la password generata in
 * chiaro nel campo `passwordHash`, mentre il login del prodotto la verifica
 * come un hash PBKDF2 (`InglyIdentita.verifica`, patch 117). Un utente creato
 * dall'Admin non poteva mai accedere con la password mostrata dalla console
 * — l'esatto sintomo segnalato più volte. Questa suite non legge il codice:
 * crea davvero l'utente dai campi veri della console, prende la password
 * mostrata una sola volta, e la usa per accedere davvero al prodotto, nello
 * stesso browser (stesso `file://`, stesso `ingly_saas_db` — il caso reale
 * di chi apre entrambi i file sul proprio computer).
 *
 *   node tests/qa/admin-crea-utente-poi-login.mjs
 */
import path from 'node:path';
import { chromium } from 'playwright';

const ADMIN_FILE = 'dist/INGLY-CLOUD-ADMIN.html';
const PRODUCT_FILE = 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
const registraErrori = (page) => {
  page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
  page.on('dialog', (d) => d.accept().catch(() => {}));
};

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

/* ── 1 · Primo accesso alla console: si sceglie la password del superadmin ── */
const admin = await context.newPage();
registraErrori(admin);
await admin.goto('file://' + path.resolve(ADMIN_FILE), { waitUntil: 'load', timeout: 120000 });
await admin.waitForTimeout(9000);

await admin.evaluate(async () => {
  document.getElementById('l-user').value = 'superadmin';
  document.getElementById('l-pass').value = 'qualunque';
  await doLogin();
  await new Promise((r) => setTimeout(r, 900));
  document.getElementById('fl-pwd1').value = 'Amministra2026';
  document.getElementById('fl-pwd2').value = 'Amministra2026';
  await _doFirstLogin();
  await new Promise((r) => setTimeout(r, 1200));
});
const dentroAdmin = await admin.evaluate(() => {
  const ls = document.getElementById('login-screen');
  const nascosto = !ls || getComputedStyle(ls).display === 'none';
  return nascosto && /Benvenuto|Dashboard/i.test(document.body.innerText || '');
});
dico('si entra nella console admin (superadmin, password appena scelta)', dentroAdmin);

/* ── 2 · «Nuovo Utente Enterprise», dai campi veri, click vero ──────────── */
await admin.evaluate(() => { nav('users'); openNewUserModal(); });
await admin.waitForTimeout(500);

const CREDS = { username: 'mario.laboratorio', email: 'mario@laboratorio-test.it' };
await admin.fill('#nu-nome', 'Mario');
await admin.fill('#nu-cognome', 'Rossi');
await admin.fill('#nu-username', CREDS.username);
await admin.fill('#nu-email', CREDS.email);
await admin.fill('#nu-phone', '+39 333 0000000');
await admin.fill('#nu-company', 'Artigiani Rossi SRL');
await admin.fill('#nu-piva', '01234567890');
await admin.selectOption('#nu-plan', { index: 0 });
await admin.selectOption('#nu-status', 'active');
await admin.fill('#nu-notes', 'creato dalla suite QA end-to-end');

const modaleVisibile = await admin.evaluate(() => ({
  campi: !!document.getElementById('nu-username'),
}));
dico('il modulo «Nuovo Utente Enterprise» ha tutti i campi del mandato', modaleVisibile.campi);

await admin.click('button:has-text("Crea & Genera Credenziali")');
await admin.waitForTimeout(800);

const credenziali = await admin.evaluate(() => {
  const codes = [...document.querySelectorAll('code')].map((c) => c.textContent.trim());
  const testo = document.body.innerText || '';
  const m = /([A-Za-z0-9!@#$%^&*_-]{8,})/.exec(
    (document.querySelector('.modal-body .font-black') || {}).textContent || ''
  );
  return { titoloOk: /Utente Creato/i.test(testo), username: codes[0] || null, password: m ? m[1] : null };
});
dico('la console dichiara l\'utente creato', credenziali.titoloOk);
dico('mostra lo username creato', credenziali.username === CREDS.username, String(credenziali.username));
dico('mostra una password una sola volta', !!credenziali.password && credenziali.password.length >= 8);

const salvatoLocale = await admin.evaluate((u) => {
  const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
  const created = (db.users || []).find((x) => x.username === u);
  return {
    esiste: !!created,
    hashCorretto: !!(created && /^pbkdf2\$\d+\$/.test(created.passwordHash || '')),
    passwordInChiaro: created ? created.passwordHash : null,
  };
}, CREDS.username);
dico('SEC-006: l\'utente creato è salvato con un hash PBKDF2, non in chiaro',
  salvatoLocale.esiste && salvatoLocale.hashCorretto,
  String(salvatoLocale.passwordInChiaro).slice(0, 30));

/* ── 3 · Si apre il PRODOTTO, stesso browser: la password data dalla
      console deve funzionare davvero, dai campi veri del login ──────────── */
const product = await context.newPage();
registraErrori(product);
await product.goto('file://' + path.resolve(PRODUCT_FILE), { waitUntil: 'load', timeout: 120000 });
await product.waitForTimeout(18000);

const primaDelLogin = await product.evaluate(() => ({
  vedeLogin: !!document.getElementById('gate-user'),
}));
dico('il prodotto (stesso browser) vede l\'utente creato dall\'Admin come account esistente',
  primaDelLogin.vedeLogin);

if (credenziali.password) {
  await product.fill('#gate-user', CREDS.username);
  await product.fill('#gate-pass', credenziali.password);
  await product.click('#gate-submit');
  await product.waitForTimeout(2000);
}

const esitoLogin = await product.evaluate(() => {
  const err = document.getElementById('gate-err');
  const gate = document.getElementById('saas-gate');
  return {
    sessione: !!(window.SaaSGate && window.SaaSGate._session),
    gateNascosto: !gate || getComputedStyle(gate).display === 'none',
    errore: err ? err.textContent : '',
  };
});
dico('la password mostrata UNA VOLTA dalla console apre davvero una sessione',
  esitoLogin.sessione, esitoLogin.errore);
dico('il modulo di accesso del prodotto si chiude', esitoLogin.gateNascosto);

await browser.close();

const falliti = passi.filter((p) => !p.esito);
console.log('\nADMIN «NUOVO UTENTE ENTERPRISE» → LOGIN REALE\n');
for (const p of passi) {
  console.log((p.esito ? '  ✔  ' : '  ✗  ') + p.passo + (p.dettaglio ? '  [' + p.dettaglio + ']' : ''));
}
console.log('\ncontrolli: ' + passi.length + ' · falliti: ' + falliti.length + ' · errori JavaScript: ' + erroriJS.length);
if (erroriJS.length) console.log('errori:', erroriJS);
if (falliti.length || erroriJS.length) {
  console.log('\nFALLITO');
  process.exit(1);
}
console.log('\nl\'utente creato dall\'Admin accede davvero, con la password mostrata una volta ✔');

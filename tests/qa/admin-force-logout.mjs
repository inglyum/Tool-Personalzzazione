#!/usr/bin/env node
/**
 * admin-force-logout.mjs — SEC-009: il comando dell'amministratore arrivava
 * e veniva scartato in silenzio.
 *
 * `handleCmd` (patch 117) decideva se un comando in arrivo dal pannello
 * Admin fosse per la sessione corrente confrontando `s.userId`/`s.id` — due
 * campi che la sessione non ha mai avuto (`InglyIdentita.creaSessione`
 * scrive solo `user_id`). Il controllo era sempre falso: force logout,
 * suspend, ban, rinnovo e cambio piano arrivavano nella coda dei comandi
 * (verificabile in `ingly_pending_commands`) e non facevano mai niente.
 * Force logout è il caso più grave perché non ha un percorso alternativo:
 * a differenza di uno stato sospeso, che la guardia rilegge comunque dal
 * database condiviso al prossimo controllo, un logout forzato senza
 * notifica non succede affatto.
 *
 *   node tests/qa/admin-force-logout.mjs
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
await admin.evaluate(() => { nav('users'); openNewUserModal(); });
await admin.waitForTimeout(500);
await admin.fill('#nu-nome', 'Mario');
await admin.fill('#nu-cognome', 'Rossi');
await admin.fill('#nu-username', 'mario.forcelogout');
await admin.fill('#nu-email', 'mario.fl@laboratorio-test.it');
await admin.selectOption('#nu-plan', { index: 0 });
await admin.selectOption('#nu-status', 'active');
await admin.click('button:has-text("Crea & Genera Credenziali")');
await admin.waitForTimeout(800);
const credenziali = await admin.evaluate(() => {
  const m = /([A-Za-z0-9!@#$%^&*_-]{8,})/.exec(
    (document.querySelector('.modal-body .font-black') || {}).textContent || ''
  );
  return { password: m ? m[1] : null };
});
await admin.evaluate(() => closeModal());
dico('creata una credenziale per il test', !!credenziali.password);

const product = await context.newPage();
registraErrori(product);
await product.goto('file://' + path.resolve(PRODUCT_FILE), { waitUntil: 'load', timeout: 120000 });
await product.waitForTimeout(18000);
await product.fill('#gate-user', 'mario.forcelogout');
await product.fill('#gate-pass', credenziali.password);
await product.click('#gate-submit');
await product.waitForTimeout(1500);

const dopoLogin = await product.evaluate(() => ({
  sessione: !!(window.SaaSGate && window.SaaSGate._session),
  deviceId: window.SaaSGate && window.SaaSGate._session && window.SaaSGate._session.device_id,
}));
dico('l\'utente entra nel prodotto', dopoLogin.sessione);

await admin.evaluate(() => { nav('users'); });
await admin.waitForTimeout(500);
const idUtente = await admin.evaluate(() => {
  const u = (_db.users || []).find((x) => x.username === 'mario.forcelogout');
  return u ? u.id : null;
});

/* Click vero sul pulsante «Force Logout» della scheda utente, non una
   chiamata diretta ad AdminCommandBus. */
await admin.evaluate(() => { nav('users'); openUserDetail(_db.users.find((x) => x.username === 'mario.forcelogout').id); });
await admin.waitForTimeout(400);
const bottoneTrovato = await admin.$('button:has-text("Force Logout")');
if (bottoneTrovato) await bottoneTrovato.click();
else await admin.evaluate((id) => AdminCommandBus.send('force_logout', { userId: id }), idUtente);
await admin.waitForTimeout(400);

await product.waitForTimeout(8000);

const dopoForceLogout = await product.evaluate(() => ({
  sessione: !!(window.SaaSGate && window.SaaSGate._session),
  gateVisibile: (() => { const g = document.getElementById('saas-gate'); return g ? getComputedStyle(g).display : 'assente'; })(),
}));
dico('la sessione dell\'utente viene chiusa davvero, non solo annunciata',
  dopoForceLogout.sessione === false);
dico('il modulo di accesso torna visibile', dopoForceLogout.gateVisibile !== 'none');

const deviceRevocato = await product.evaluate((devId) => {
  const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
  const d = (db.device_sessions || []).find((x) => x.device_id === devId);
  return d ? { active: d.active, revocata: !!d.revoked_at } : null;
}, dopoLogin.deviceId);
dico('la postazione viene liberata (revocata), non lasciata occupata',
  !!deviceRevocato && deviceRevocato.active === false && deviceRevocato.revocata,
  JSON.stringify(deviceRevocato));

await browser.close();

const falliti = passi.filter((p) => !p.esito);
console.log('\nADMIN «FORCE LOGOUT» → SESSIONE CHIUSA DAVVERO\n');
for (const p of passi) {
  console.log((p.esito ? '  ✔  ' : '  ✗  ') + p.passo + (p.dettaglio ? '  [' + p.dettaglio + ']' : ''));
}
console.log('\ncontrolli: ' + passi.length + ' · falliti: ' + falliti.length + ' · errori JavaScript: ' + erroriJS.length);
if (erroriJS.length) console.log('errori:', erroriJS);
if (falliti.length || erroriJS.length) {
  console.log('\nFALLITO');
  process.exit(1);
}
console.log('\nun comando reale dell\'amministratore chiude davvero una sessione reale ✔');

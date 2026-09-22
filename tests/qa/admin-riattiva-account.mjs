#!/usr/bin/env node
/**
 * admin-riattiva-account.mjs — ATTIVA/SOSPENDI/ELIMINA sono tre stati dello
 * stesso interruttore, non due.
 *
 * `doReactivate` esisteva ed era corretta, ma l'unico bottone che la
 * chiamava (`renderUserActions()`) non era mai disegnato da nessuna vista:
 * un account sospeso non aveva, nel pannello dettaglio, nessun modo diretto
 * di tornare attivo — solo il menu a tendina Stato dentro «Modifica». Questa
 * suite verifica il pulsante vero, agganciato in questa release nello stesso
 * pannello dettaglio dove già vive «Elimina Account».
 *
 *   node tests/qa/admin-riattiva-account.mjs
 */
import path from 'node:path';
import { chromium } from 'playwright';

const ADMIN_FILE = 'dist/INGLY-CLOUD-ADMIN.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
page.on('dialog', (d) => d.accept().catch(() => {}));

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

await page.goto('file://' + path.resolve(ADMIN_FILE), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(9000);

await page.evaluate(async () => {
  document.getElementById('l-user').value = 'superadmin';
  document.getElementById('l-pass').value = 'qualunque';
  await doLogin();
  await new Promise((r) => setTimeout(r, 900));
  document.getElementById('fl-pwd1').value = 'Amministra2026';
  document.getElementById('fl-pwd2').value = 'Amministra2026';
  await _doFirstLogin();
  await new Promise((r) => setTimeout(r, 1200));
});
const dentro = await page.evaluate(() => {
  const ls = document.getElementById('login-screen');
  return !ls || getComputedStyle(ls).display === 'none';
});
dico('si entra nella console admin', dentro);

/* ── Un utente vero, attivo per costruzione ─────────────────────────────── */
const creato = await page.evaluate(async () => {
  nav('users'); openNewUserModal();
  await new Promise((r) => setTimeout(r, 400));
  document.getElementById('nu-nome').value = 'Rita';
  document.getElementById('nu-cognome').value = 'Sospesa';
  document.getElementById('nu-username').value = 'rita.riattiva';
  document.getElementById('nu-email').value = 'rita@riattiva-test.it';
  document.getElementById('nu-plan').selectedIndex = 0;
  document.getElementById('nu-status').value = 'active';
  await window.doCreateUser();
  await new Promise((r) => setTimeout(r, 600));
  closeModal();
  const u = (_db.users || []).find((x) => x.username === 'rita.riattiva');
  return { id: u ? u.id : null, stato: u ? u.status : null };
});
dico('l\'utente si crea, attivo', creato.id != null && creato.stato === 'active', 'stato=' + creato.stato);

/* ── Nessun bottone «Riattiva» su un account attivo ─────────────────────── */
const suAttivo = await page.evaluate(async (id) => {
  openUserDetail(id);
  await new Promise((r) => setTimeout(r, 400));
  const presente = !!document.querySelector('._reactivate_from_detail');
  closeModal();
  return presente;
}, creato.id);
dico('sul dettaglio di un account attivo NON compare «Riattiva»', suAttivo === false);

/* ── Si sospende, per davvero (stessa funzione del mandato) ─────────────── */
const sospeso = await page.evaluate(async (id) => {
  doSuspend(id);
  await new Promise((r) => setTimeout(r, 400));
  const u = (_db.users || []).find((x) => x.id === id);
  return u ? u.status : null;
}, creato.id);
dico('l\'account è ora sospeso', sospeso === 'suspended', 'stato=' + sospeso);

/* ── Sul dettaglio compare «Riattiva», click vero, torna attivo ─────────── */
const riattivato = await page.evaluate(async (id) => {
  openUserDetail(id);
  await new Promise((r) => setTimeout(r, 400));
  const btn = document.querySelector('._reactivate_from_detail');
  if (!btn) return { presente: false };
  btn.click();
  await new Promise((r) => setTimeout(r, 500));
  const u = (_db.users || []).find((x) => x.id === id);
  const audit = (_db.audit_log || []).some((a) => a.action === 'account_reactivated' && String(a.targetId) === String(id))
    || (_db.auditLog || []).some((a) => a.action === 'account_reactivated');
  return { presente: true, stato: u ? u.status : null, expiresAt: u ? u.expiresAt : null };
}, creato.id);
dico('sul dettaglio di un account sospeso compare «Riattiva Account»', riattivato.presente);
dico('il click vero riattiva davvero l\'account', riattivato.stato === 'active', 'stato=' + riattivato.stato);
dico('e gli rinnova una scadenza valida, non nulla', !!riattivato.expiresAt);

console.log('\nADMIN — RIATTIVA ACCOUNT, DAL PULSANTE VERO\n');
const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo + (p.dettaglio ? ' — ' + p.dettaglio : ''));
  if (!p.esito) problemi.push(p.passo);
}
erroriJS.forEach((e) => { console.log('  ✘ errore JS: ' + e); problemi.push('errore JS: ' + e); });
console.log('\ncontrolli: ' + passi.length + ' · falliti: ' + problemi.length + ' · errori JavaScript: ' + erroriJS.length);
console.log(problemi.length ? '' : '\nattiva, sospendi, elimina: lo stesso interruttore, tre posizioni ✔');
await browser.close();
process.exit(problemi.length ? 1 : 0);

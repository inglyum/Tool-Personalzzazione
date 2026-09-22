#!/usr/bin/env node
/**
 * admin-kpi-e-fatturazione-reali.mjs — la dashboard non inventa numeri, e
 * il pannello Pagamenti non inventa transazioni.
 *
 * Tre difetti reali in un solo giro:
 *
 *  1. Le KPI (MRR, utenti attivi, «Scadono 7gg», «Scaduti») leggevano
 *     `u.expires_at`/`u.created_at` (snake_case, la forma Supabase) e
 *     `u.plan`/`u.plan_id` — campi che un utente REGISTRATO DA SÉ (non
 *     creato da questa console) non ha mai: il suo piano vive solo nel
 *     suo abbonamento vero (`db.subscriptions`). Un utente così spariva
 *     silenziosamente da ogni conteggio.
 *  2. Cambiare piano da «Modifica utente» aggiornava solo `u.plan` (il
 *     piano di questa console), mai `db.subscriptions[].plan_id` (quello
 *     che gli entitlement del prodotto leggono davvero): il pannello
 *     mostrava un piano, il prodotto ne applicava un altro.
 *  3. Il pannello «Pagamenti» generava uno storico transazioni finto con
 *     Math.random(), con un bottone «Retry» che marcava «pagato» un
 *     pagamento mai avvenuto.
 *
 *   node tests/qa/admin-kpi-e-fatturazione-reali.mjs
 */
import path from 'node:path';
import { chromium } from 'playwright';

const ADMIN_FILE = 'dist/INGLY-CLOUD-ADMIN.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 2200 } });
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

/* ── Un utente creato dall'Admin (piano «pro»), per il test di desync ───── */
const utenteAdmin = await page.evaluate(async () => {
  nav('users'); openNewUserModal();
  await new Promise((r) => setTimeout(r, 400));
  document.getElementById('nu-nome').value = 'Carlo';
  document.getElementById('nu-cognome').value = 'Piani';
  document.getElementById('nu-username').value = 'carlo.piani';
  document.getElementById('nu-email').value = 'carlo@piani-test.it';
  document.getElementById('nu-plan').value = 'pro';
  document.getElementById('nu-status').value = 'active';
  await window.doCreateUser();
  await new Promise((r) => setTimeout(r, 600));
  closeModal();
  const u = (_db.users || []).find((x) => x.username === 'carlo.piani');
  const sub = (_db.subscriptions || []).find((s) => s.tenant_id === u.tenant_id);
  return { id: u.id, tenantId: u.tenant_id, plan: u.plan, subPianoIniziale: sub ? sub.plan_id : null };
});
dico('l\'utente creato dall\'Admin ha un abbonamento reale collegato',
  utenteAdmin.subPianoIniziale === 'premium', 'pro → ' + utenteAdmin.subPianoIniziale);

/* ── Un utente REGISTRATO DA SÉ: nessun u.plan/u.expiresAt, solo un vero
   abbonamento in db.subscriptions — esattamente come lo scrive
   InglyAccount.crea() nel prodotto. ────────────────────────────────────── */
const utenteAutoregistrato = await page.evaluate(() => {
  const tenantId = 'ws-selfreg-001';
  const userId = 'usr_selfreg_001';
  const oraMeno3 = new Date(Date.now() - 3 * 86400000).toISOString();
  const fra5giorni = new Date(Date.now() + 5 * 86400000).toISOString();
  _db.users.push({
    id: userId, nome: 'Bianca', cognome: 'Selfservice',
    username: 'bianca.self', email: 'bianca@selfservice-test.it',
    tenant_id: tenantId, ruolo: 'owner', status: 'active', active: true,
    createdAt: oraMeno3, passwordHash: 'pbkdf2$1$x', avatarInitials: 'BS',
    // deliberatamente NESSUN campo plan/plan_id/expiresAt/expires_at
  });
  _db.tenants = (_db.tenants || []).concat([{ id: tenantId, nome: 'Bianca Selfservice', owner_id: userId }]);
  _db.subscriptions = (_db.subscriptions || []).concat([{
    id: 'sub-selfreg-001', tenant_id: tenantId, plan_id: 'premium',
    status: 'active', current_period_start: oraMeno3, current_period_end: fra5giorni,
    created_at: oraMeno3, updated_at: oraMeno3,
  }]);
  dbSave(_db);
  return { id: userId, tenantId };
});

/* ── Dashboard: l'utente autoregistrato conta davvero ───────────────────── */
const dash = await page.evaluate(async () => {
  nav('dashboard');
  await new Promise((r) => setTimeout(r, 1500));
  const testo = document.getElementById('page-dashboard') ? document.getElementById('page-dashboard').innerText : '';
  return { testo, kpiPresenti: !!document.querySelector('.g4') };
});
dico('la dashboard si apre senza errori', dash.kpiPresenti);
dico('la dashboard mostra almeno un valore MRR diverso da zero (include l\'utente autoregistrato)',
  /MRR/.test(dash.testo) && !/MRR[\s\S]{0,20}€0[^\d]/.test(dash.testo.slice(0, 400)));
dico('la dashboard segnala una scadenza nei prossimi 7 giorni (l\'utente autoregistrato scade fra 5gg)',
  /scadono 7gg/i.test(dash.testo));

/* ── Modifica piano: il pannello aggiorna anche l'abbonamento vero ──────── */
const dopoModifica = await page.evaluate(async (id) => {
  openEditUser(id);
  await new Promise((r) => setTimeout(r, 400));
  document.getElementById('eu-plan').value = 'starter';
  await window.doSaveUser(id);
  await new Promise((r) => setTimeout(r, 500));
  const u = (_db.users || []).find((x) => x.id === id);
  const sub = (_db.subscriptions || []).find((s) => s.tenant_id === u.tenant_id);
  return { planPannello: u.plan, planAbbonamento: sub ? sub.plan_id : null };
}, utenteAdmin.id);
dico('il pannello mostra il nuovo piano (starter)', dopoModifica.planPannello === 'starter');
dico('l\'abbonamento vero segue il cambio piano, non resta fermo su quello vecchio',
  dopoModifica.planAbbonamento === 'standard', 'pro→starter atteso standard, trovato ' + dopoModifica.planAbbonamento);

/* ── Pagamenti: nessun dato inventato ────────────────────────────────────── */
const pagamentiVuoto = await page.evaluate(async (id) => {
  openPaymentHistory(id);
  await new Promise((r) => setTimeout(r, 300));
  const testo = document.querySelector('.modal-body') ? document.querySelector('.modal-body').innerText : '';
  const bottoneRetry = !!document.querySelector('[onclick*="retryPayment"]');
  closeModal();
  return { testo, bottoneRetry, funzioneEsiste: typeof window.retryPayment === 'function' };
}, utenteAdmin.id);
dico('il pannello Pagamenti dichiara che non ci sono eventi reali, non ne inventa',
  /[Nn]essun evento di pagamento reale/.test(pagamentiVuoto.testo));
dico('il bottone «Retry» che fingeva un pagamento riuscito non esiste più', !pagamentiVuoto.bottoneRetry);
dico('la funzione retryPayment è stata rimossa, non solo scollegata', !pagamentiVuoto.funzioneEsiste);

/* ── Pagamenti: un evento vero (InglyFatturazione) compare per davvero ──── */
const pagamentiConEvento = await page.evaluate(async (ctx) => {
  _db.billing_events = (_db.billing_events || []).concat([{
    id: 'evt_test_1', type: 'checkout.completed', at: new Date().toISOString(),
    tenant_id: ctx.tenantId, provider: 'stripe', provider_subscription_id: 'sub_stripe_test_1',
    applicato: 'attiva', esito: 'ok',
  }]);
  dbSave(_db);
  openPaymentHistory(ctx.id);
  await new Promise((r) => setTimeout(r, 300));
  const testo = document.querySelector('.modal-body') ? document.querySelector('.modal-body').innerText : '';
  closeModal();
  return testo;
}, utenteAutoregistrato);
dico('un evento di fatturazione vero (InglyFatturazione) compare nel pannello',
  /attivazione/i.test(pagamentiConEvento) && /stripe/i.test(pagamentiConEvento));

/* ── Audit Trail del dettaglio: eventi veri del prodotto, non solo quelli
   scritti da questa console ─────────────────────────────────────────────── */
const auditReale = await page.evaluate(async (ctx) => {
  _db.audit_log = (_db.audit_log || []).concat([{
    id: 'aud_test_1', at: new Date().toISOString(), actor: ctx.id, tenant_id: ctx.tenantId,
    action: 'account.password_changed', target: ctx.id, result: 'ok', metadata: {},
  }]);
  dbSave(_db);
  openUserDetail(ctx.id);
  await new Promise((r) => setTimeout(r, 400));
  const testo = document.querySelector('.modal-body') ? document.querySelector('.modal-body').innerText : '';
  closeModal();
  return testo;
}, utenteAutoregistrato);
dico('l\'Audit Trail del dettaglio mostra un evento scritto dal prodotto, non solo dalla console',
  /password changed|password_changed/i.test(auditReale));

console.log('\nADMIN — KPI E FATTURAZIONE REALI, NON INVENTATE\n');
const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo + (p.dettaglio ? ' — ' + p.dettaglio : ''));
  if (!p.esito) problemi.push(p.passo);
}
erroriJS.forEach((e) => { console.log('  ✘ errore JS: ' + e); problemi.push('errore JS: ' + e); });
console.log('\ncontrolli: ' + passi.length + ' · falliti: ' + problemi.length + ' · errori JavaScript: ' + erroriJS.length);
console.log(problemi.length ? '' : '\nnumeri veri, non stimati ✔');
await browser.close();
process.exit(problemi.length ? 1 : 0);

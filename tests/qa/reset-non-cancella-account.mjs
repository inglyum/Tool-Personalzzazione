#!/usr/bin/env node
/**
 * reset-non-cancella-account.mjs — il reset dei dati non è la cancellazione
 * dell'account.
 *
 * Difetto reale trovato: «Backup & Ripristino → Reset di fabbrica»
 * cancellava `localStorage` con un filtro `startsWith('ingly')`, che
 * catturava anche `ingly_saas_db` — la sola riga che contiene utenti,
 * tenant, abbonamento e postazioni. L'avviso mostrato prima del click
 * prometteva di cancellare «clienti, ordini, prodotti...»: mai l'account.
 * Chi premeva quel pulsante si ritrovava, al ricaricamento, alla schermata
 * di primo avvio come se non si fosse mai registrato.
 *
 * Questa suite verifica nel file consegnato, con un click vero sul
 * pulsante vero: si crea un account, si aggiunge un dato applicativo, si
 * fa reset, e dopo il ricaricamento l'account esiste ancora — si vede
 * ACCEDI, non CREA ACCOUNT — e le credenziali della sessione precedente
 * aprono davvero una nuova sessione, con lo stesso tenant, lo stesso
 * ruolo, lo stesso piano e lo stesso abbonamento di prima (il caso critico
 * del mandato SaaS: non basta rientrare, deve rientrare LA STESSA identità,
 * non un'identità nuova che sembra la stessa).
 *
 *   node tests/qa/reset-non-cancella-account.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 2400 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
const dialoghi = [];
page.on('dialog', async (d) => { dialoghi.push(d.message()); await d.accept().catch(() => {}); });

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

const URL = 'file://' + path.resolve(file);
await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);

/* ── 1 · Primo avvio: si crea l'account ─────────────────────────────────── */
const creazione = await page.evaluate(async () => {
  document.getElementById('su-lab').value = 'Bottega Reset';
  document.getElementById('su-nome').value = 'Collaudo';
  document.getElementById('su-email').value = 'reset@collaudo.it';
  document.getElementById('su-pass').value = 'ResetTest2026';
  document.getElementById('su-conf').value = 'ResetTest2026';
  let risolto = false;
  const p = window.InglyPrimoAvvio.invia().then(() => { risolto = true; });
  await Promise.race([p, new Promise((r) => setTimeout(r, 15000))]);
  const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
  return { risolto, utenti: (db.users || []).length, sessione: !!(window.SaaSGate && window.SaaSGate._session) };
});
dico('l\'account si crea', creazione.risolto && creazione.utenti === 1, 'utenti=' + creazione.utenti);
dico('la sessione è attiva dopo la creazione', creazione.sessione);

/* ── 1b · Fotografia dell'identità PRIMA del reset: tenant, ruolo, piano,
   abbonamento. Non basta che l'account «esista» dopo — deve essere
   esattamente lo stesso, non un secondo account con lo stesso nome. ──── */
const primaDelReset = await page.evaluate(() => {
  const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
  const u = (db.users || [])[0];
  const sub = (db.subscriptions || []).find((s) => s.tenant_id === u.tenant_id);
  return {
    userId: u.id, tenantId: u.tenant_id, ruolo: u.ruolo,
    subId: sub ? sub.id : null, planId: sub ? sub.plan_id : null, subStatus: sub ? sub.status : null,
  };
});
dico('prima del reset l\'account ha un tenant, un ruolo e un abbonamento veri',
  !!primaDelReset.tenantId && !!primaDelReset.ruolo && !!primaDelReset.planId,
  JSON.stringify(primaDelReset));

/* ── 2 · Un dato applicativo vero, da perdere col reset ─────────────────── */
const datoScritto = await page.evaluate(async () => {
  await IDB.ensureOpen();
  await IDB.put('clients', { id: 999001, name: 'Cliente da cancellare col reset' });
  const clienti = await IDB.getAll('clients');
  return clienti.length;
});
dico('un cliente vero è in archivio prima del reset', datoScritto >= 1, 'clienti=' + datoScritto);

/* ── 3 · Reset di fabbrica: click vero sul pulsante vero ────────────────── */
await page.evaluate(async () => { App.navigate('backup'); await new Promise((r) => setTimeout(r, 2000)); });
/* Il pannello Backup scorre dentro un contenitore interno (non la finestra):
   l'euristica di visibilità di Playwright lo considera "non visibile" per
   via del clipping dell'antenato, anche se la geometria del bottone è
   valida. Uno `scrollIntoView` nativo + un vero evento click sull'elemento
   reale — non una chiamata diretta a `Backup.factoryReset()` — restano un
   click vero sul bottone vero, solo pilotato dal DOM invece che dall'API
   di alto livello di Playwright. */
const trovato = await page.evaluate(() => {
  const el = document.querySelector('button[onclick="Backup.factoryReset()"]');
  if (!el) return false;
  el.scrollIntoView({ block: 'center' });
  el.click();
  return true;
});
dico('il pulsante di reset di fabbrica è nel pannello vero, e riceve il click', trovato);
await page.waitForTimeout(3000);
dico('l\'avviso di conferma dichiara che l\'account NON viene cancellato',
  dialoghi.some((d) => /NON cancella il tuo account/i.test(d)), (dialoghi[0] || '(nessun avviso)').slice(0, 60));

/* Il reload parte da dentro factoryReset(): si aspetta e si riapre lo stesso URL. */
await page.waitForTimeout(4000);
await page.goto(URL, { waitUntil: 'load', timeout: 120000 }).catch(() => {});
await page.waitForTimeout(15000);

/* ── 4 · Dopo il reset: l'account c'è ancora, il dato applicativo no ────── */
const dopoReset = await page.evaluate(async () => {
  const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
  const clienti = await IDB.getAll('clients').catch(() => []);
  return {
    utenti: (db.users || []).length,
    clienti: clienti.length,
    formCreaAccount: !!document.getElementById('su-submit'),
    formLogin: !!document.getElementById('gate-user'),
  };
});
dico('l\'account esiste ancora dopo il reset (' + dopoReset.utenti + ' utenti)', dopoReset.utenti === 1);
dico('il dato applicativo è stato davvero cancellato (' + dopoReset.clienti + ' clienti)', dopoReset.clienti === 0);
dico('NON compare «crea account» come se non ci fosse mai stato un account', !dopoReset.formCreaAccount);
dico('compare ACCEDI, non CREA ACCOUNT', dopoReset.formLogin);

/* ── 5 · Le credenziali di prima aprono davvero una nuova sessione ──────── */
const rientro = dopoReset.formLogin ? await page.evaluate(async () => {
  document.getElementById('gate-user').value = 'reset@collaudo.it';
  document.getElementById('gate-pass').value = 'ResetTest2026';
  window.SaaSGate.login();
  await new Promise((r) => setTimeout(r, 2500));
  const gate = document.getElementById('saas-gate');
  return {
    sessione: !!(window.SaaSGate && window.SaaSGate._session),
    gate: gate ? getComputedStyle(gate).display : 'assente',
    errore: (document.getElementById('gate-err') || {}).textContent || '',
  };
}) : { sessione: false, gate: 'n/d', errore: 'form di login assente' };
dico('login dopo il reset: le stesse credenziali aprono la sessione', rientro.sessione && rientro.gate === 'none',
  rientro.errore || rientro.gate);

/* ── 6 · La stessa identità, non una nuova: tenant, ruolo, abbonamento
   invariati — il caso critico del mandato SaaS (§34). Un account che
   "esiste" ma è ripartito da un tenant/piano diverso non ha superato
   il test: è un secondo account che porta lo stesso nome. ─────────────── */
const dopoRientro = rientro.sessione ? await page.evaluate(() => {
  const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
  const u = (db.users || [])[0];
  const sub = (db.subscriptions || []).find((s) => s.tenant_id === u.tenant_id);
  return {
    userId: u.id, tenantId: u.tenant_id, ruolo: u.ruolo,
    subId: sub ? sub.id : null, planId: sub ? sub.plan_id : null, subStatus: sub ? sub.status : null,
  };
}) : null;
dico('dopo il rientro è lo STESSO utente (stesso id), non un secondo account',
  !!dopoRientro && dopoRientro.userId === primaDelReset.userId);
dico('lo stesso tenant', !!dopoRientro && dopoRientro.tenantId === primaDelReset.tenantId,
  primaDelReset.tenantId + ' → ' + (dopoRientro && dopoRientro.tenantId));
dico('lo stesso ruolo', !!dopoRientro && dopoRientro.ruolo === primaDelReset.ruolo,
  primaDelReset.ruolo + ' → ' + (dopoRientro && dopoRientro.ruolo));
dico('lo stesso abbonamento (stesso id, non uno nuovo)',
  !!dopoRientro && dopoRientro.subId === primaDelReset.subId);
dico('lo stesso piano', !!dopoRientro && dopoRientro.planId === primaDelReset.planId,
  primaDelReset.planId + ' → ' + (dopoRientro && dopoRientro.planId));
dico('l\'abbonamento è ancora nello stato giusto (non scaduto per il reset)',
  !!dopoRientro && dopoRientro.subStatus === primaDelReset.subStatus);

console.log('\nRESET NON CANCELLA L\'ACCOUNT\n');
const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo + (p.dettaglio ? ' — ' + p.dettaglio : ''));
  if (!p.esito) problemi.push(p.passo);
}
erroriJS.forEach((e) => { console.log('  ✘ errore JS: ' + e); problemi.push('errore JS: ' + e); });
console.log('\ncontrolli: ' + passi.length + ' · falliti: ' + problemi.length + ' · errori JavaScript: ' + erroriJS.length);
console.log(problemi.length ? '' : '\nil reset cancella i dati, non l\'identità ✔');
await browser.close();
process.exit(problemi.length ? 1 : 0);

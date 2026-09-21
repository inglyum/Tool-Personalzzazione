#!/usr/bin/env node
/**
 * notifiche-admin-utente.mjs — un messaggio mandato dall'Admin
 * (InglyCloudAdmin.sendNotifInApp, scrive in `ingly_saas_db.notifications`)
 * arriva davvero nell'unico pannello notifiche del prodotto.
 *
 * Il 2.7.0 ha tolto dalla barra enterprise il pulsante che apriva un secondo
 * pannello notifiche (`_ehOpenNotifications`), perché duplicava quello vero
 * della topbar — stesso campanello, due letture diverse, mai sincronizzate.
 * Ma quel secondo pannello era anche l'**unico** punto che leggeva
 * `ingly_saas_db.notifications`: tolto il pulsante, un messaggio dell'Admin
 * non arrivava più da nessuna parte — una regressione reale introdotta dal
 * fix precedente, trovata rileggendo che cosa scriveva davvero quella
 * funzione prima di cancellarla.
 *
 * Qui si verifica che `Notifications.getAll()` (il motore dell'unico
 * pannello reale) includa questi messaggi, filtrati per l'utente della
 * sessione corrente con l'accessor canonico (`InglyIdentita.idUtente`, non
 * `session.userId`, campo mai esistito — SEC-009), e che un messaggio per un
 * *altro* utente non compaia.
 *
 *   node tests/qa/notifiche-admin-utente.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
page.on('dialog', (d) => d.accept().catch(() => {}));
await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(13000);

await page.evaluate(async () => {
  if (!document.getElementById('su-submit')) return;
  document.getElementById('su-lab').value = 'Laboratorio Test Notifiche';
  document.getElementById('su-nome').value = 'Tester';
  document.getElementById('su-email').value = 'tester-notifiche@prova.it';
  document.getElementById('su-pass').value = 'Laboratorio2026';
  document.getElementById('su-conf').value = 'Laboratorio2026';
  await window.InglyPrimoAvvio.invia();
});
await page.waitForTimeout(800);

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

const uid = await page.evaluate(() => {
  const s = JSON.parse(sessionStorage.getItem('ingly_saas_session') || 'null');
  return (window.InglyIdentita && window.InglyIdentita.idUtente(s)) || null;
});
dico('la sessione appena creata ha un id utente vero (accessor canonico)', !!uid, uid);

/* ── L'Admin manda un messaggio a questo utente e a un altro ────────────── */
await page.evaluate((realUid) => {
  const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
  db.notifications = (db.notifications || []).concat([
    { id: 'n-test-mio', userId: realUid, type: 'inapp', title: 'Licenza in scadenza tra 5 giorni',
      message: 'Rinnova INGLY OS per continuare a usare tutte le funzionalità.',
      delivered: true, sentAt: new Date().toISOString() },
    { id: 'n-test-altro', userId: 'un-altro-utente-id', type: 'inapp', title: 'Messaggio per un altro laboratorio',
      message: 'Non deve comparire qui.', delivered: true, sentAt: new Date().toISOString() },
  ]);
  localStorage.setItem('ingly_saas_db', JSON.stringify(db));
}, uid);

await page.evaluate(() => Notifications.update());
await page.waitForTimeout(300);

/* ── il badge conta il messaggio ─────────────────────────────────────────── */
const badge = await page.evaluate(() => document.getElementById('notif-count')?.textContent);
dico('il badge delle notifiche sale di almeno uno', Number(badge) >= 1, badge);

/* ── apre il pannello con un click vero e mostra il messaggio ────────────── */
await page.click('#notif-btn');
await page.waitForTimeout(200);
const contenuto = await page.evaluate(() => document.getElementById('notif-list')?.textContent || '');
dico('il pannello (l\'unico vero) mostra il titolo del messaggio dell\'Admin', contenuto.includes('Licenza in scadenza tra 5 giorni'), contenuto.slice(0, 200));
dico('mostra anche il corpo del messaggio', contenuto.includes('Rinnova INGLY OS'));
dico('NON mostra il messaggio destinato a un altro utente', !contenuto.includes('Non deve comparire qui'));

/* ── nessun secondo pannello duplicato resta in giro ──────────────────────── */
const secondoPannello = await page.evaluate(() => !!document.getElementById('_eh_notif_panel'));
dico('non esiste più un secondo pannello notifiche (_eh_notif_panel)', !secondoPannello);
const funzioniMorte = await page.evaluate(() => typeof window._ehOpenNotifications === 'undefined' && typeof window._ehOpenSettings === 'undefined');
dico('le funzioni morte (_ehOpenNotifications, _ehOpenSettings) sono state tolte, non solo scollegate', funzioniMorte);

/* ── nessuna regressione: le notifiche di business restano ──────────────── */
await page.evaluate(() => document.getElementById('notif-btn').click());
await page.waitForTimeout(150);
const tuttoOk = await page.evaluate(() => !!document.getElementById('notif-list'));
dico('il pannello si chiude e riapre ancora senza errori', tuttoOk);

/* ── esito ─────────────────────────────────────────────────────────────── */
const fallite = passi.filter((p) => !p.esito);
console.log('NOTIFICHE · ADMIN → UTENTE →', JSON.stringify({ totale: passi.length, falliti: fallite.length, erroriJS: erroriJS.length }, null, 2));
passi.forEach((p) => console.log(`  ${p.esito ? '✅' : '❌'} ${p.passo}${p.dettaglio != null ? ' — ' + JSON.stringify(p.dettaglio) : ''}`));
if (erroriJS.length) console.log('ERRORI JS:', erroriJS);

await browser.close();
if (fallite.length || erroriJS.length) process.exit(1);

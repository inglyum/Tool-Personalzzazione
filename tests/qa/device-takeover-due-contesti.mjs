#!/usr/bin/env node
/**
 * device-takeover-due-contesti.mjs — il subentro con due schede vere.
 *
 * Le altre suite verificano `InglyDispositivi.subentra()` come funzione
 * isolata. Qui si apre il file due volte nello STESSO browser (due schede,
 * storage condiviso — esattamente come due dispositivi che parlano con lo
 * stesso abbonamento), si passa dai campi e dai pulsanti veri della
 * schermata di conflitto, non da una chiamata diretta al modulo, e si
 * verifica che la scheda spodestata venga davvero avvisata quando la
 * guardia esegue il controllo successivo.
 *
 *   node tests/qa/device-takeover-due-contesti.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
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

const URL = 'file://' + path.resolve(file);
const CREDS = { user: 'giuseppe.belice', pass: 'Laboratorio2026' };

/* ── Scheda A: crea l'account (device 1) ─────────────────────────────────── */
const pageA = await context.newPage();
registraErrori(pageA);
await pageA.goto(URL, { waitUntil: 'load', timeout: 120000 });
await pageA.waitForTimeout(18000);

const creazione = await pageA.evaluate(async (creds) => {
  document.getElementById('su-lab').value = 'Bottega Belice';
  document.getElementById('su-nome').value = 'Giuseppe';
  document.getElementById('su-username') && (document.getElementById('su-username').value = creds.user);
  document.getElementById('su-email').value = 'g@belice.it';
  document.getElementById('su-pass').value = creds.pass;
  document.getElementById('su-conf').value = creds.pass;
  let risolto = false;
  const p = window.InglyPrimoAvvio.invia().then(() => { risolto = true; });
  await Promise.race([p, new Promise((r) => setTimeout(r, 15000))]);
  const db = JSON.parse(localStorage.getItem('ingly_saas_db') || '{}');
  const u = (db.users || [])[0] || {};
  return {
    risolto,
    sessione: !!(window.SaaSGate && window.SaaSGate._session),
    username: u.username || null,
  };
}, CREDS);
dico('scheda A: l\'account nasce', creazione.risolto);
dico('scheda A: entra subito (device 1)', creazione.sessione);

/* Se il primo avvio non genera uno username esplicito, si usa l'email per
   il login sulla seconda scheda — il campo accetta entrambi. */
const loginId = creazione.username || 'g@belice.it';

/* ── Scheda B: stesso browser, stesso storage, login vero da campi veri ──── */
const pageB = await context.newPage();
registraErrori(pageB);
await pageB.goto(URL, { waitUntil: 'load', timeout: 120000 });
await pageB.waitForTimeout(18000);

const primaDiAccedere = await pageB.evaluate(() => ({
  vedeGateLogin: !!document.getElementById('gate-user'),
  vedeSetup: !!document.getElementById('su-submit') &&
    getComputedStyle(document.getElementById('su-submit').closest('[id^="saas-setup"], body') || document.body).display !== 'none',
}));
dico('scheda B (storage condiviso, sessione propria vuota): vede un modulo di accesso utilizzabile',
  primaDiAccedere.vedeGateLogin, JSON.stringify(primaDiAccedere));

/* L'identificativo di postazione (`ingly_device_id`) vive in `localStorage`,
   quindi è condiviso fra le schede dello STESSO browser — correttamente:
   due schede della stessa installazione sono una sola postazione, non due
   («rientrare dallo stesso dispositivo non chiede di subentrare a se
   stessi», copertura già in tests/dispositivi.test.mjs). Per verificare il
   subentro con la UI vera serve simulare un secondo computer, cioè un
   secondo device_id — esattamente il valore che su una macchina diversa
   sarebbe comunque diverso da solo. */
await pageB.evaluate(() => localStorage.setItem('ingly_device_id', 'dev_secondo_pc_test'));

await pageB.fill('#gate-user', loginId);
await pageB.fill('#gate-pass', CREDS.pass);
await pageB.click('#gate-submit');
await pageB.waitForTimeout(1500);

const conflitto = await pageB.evaluate(() => {
  const e = document.getElementById('gate-err');
  return {
    visibile: !!e && getComputedStyle(e).display !== 'none',
    testo: e ? e.textContent : '',
    haBottoneSubentra: !!(e && /Entra qui e chiudi/.test(e.innerHTML)),
    haBottoneAnnulla: !!(e && /Annulla/.test(e.innerHTML)),
  };
});
dico('scheda B: il login rileva il conflitto (device 1 già aperto)', conflitto.visibile && conflitto.haBottoneSubentra,
  conflitto.testo);
dico('scheda B: offre anche "Annulla", non solo il subentro', conflitto.haBottoneAnnulla);

/* Click vero sul pulsante "Entra qui e chiudi l'altra sessione" */
const bottoneSubentra = await pageB.$('#gate-err button');
if (bottoneSubentra) await bottoneSubentra.click();
await pageB.waitForTimeout(1500);

const dopoSubentro = await pageB.evaluate(() => ({
  sessione: !!(window.SaaSGate && window.SaaSGate._session),
  gateNascosto: (() => { const g = document.getElementById('saas-gate'); return !g || getComputedStyle(g).display === 'none'; })(),
  attive: window.InglyDispositivi ? window.InglyDispositivi.attive(window.SaaSGate._session && window.SaaSGate._session.user_id).length : -1,
}));
dico('scheda B: dopo il click ottiene una sessione vera', dopoSubentro.sessione);
dico('scheda B: il modulo di accesso si chiude', dopoSubentro.gateNascosto);
dico('resta una sola postazione attiva dopo il subentro', dopoSubentro.attive === 1, 'attive=' + dopoSubentro.attive);

/* ── Torna alla scheda A: il prossimo controllo della guardia la deve
      riconoscere spodestata — non a un prossimo reload manuale, alla
      prossima verifica che la guardia esegue comunque a intervalli. ──── */
const espulsioneA = await pageA.evaluate(() => {
  const s = window.SaaSGate && window.SaaSGate._session;
  if (!s || !window.InglyGuardia) return { haSessione: !!s, haGuardia: !!window.InglyGuardia };
  const esito = window.InglyGuardia.controlla(s, {});
  return { haSessione: true, haGuardia: true, azione: esito.azione, causa: esito.causa };
});
dico('scheda A aveva ancora una sessione locale da verificare', espulsioneA.haSessione && espulsioneA.haGuardia,
  JSON.stringify(espulsioneA));
dico('la guardia, al controllo successivo, dice a device 1 di uscire', espulsioneA.azione === 'esci',
  'azione=' + espulsioneA.azione);
dico('e la causa è la postazione, non un altro motivo', espulsioneA.causa === 'dispositivo',
  'causa=' + espulsioneA.causa);

await browser.close();

const falliti = passi.filter((p) => !p.esito);
console.log('\nDEVICE TAKEOVER · DUE SCHEDE VERE\n');
for (const p of passi) {
  console.log((p.esito ? '  ✔  ' : '  ✗  ') + p.passo + (p.dettaglio ? '  [' + p.dettaglio + ']' : ''));
}
console.log('\ncontrolli: ' + passi.length + ' · falliti: ' + falliti.length + ' · errori JavaScript: ' + erroriJS.length);
if (erroriJS.length) console.log('errori:', erroriJS);
if (falliti.length || erroriJS.length) {
  console.log('\nFALLITO');
  process.exit(1);
}
console.log('\nil dispositivo sostituito viene davvero espulso, non solo sulla carta ✔');

#!/usr/bin/env node
/**
 * login-persistenza-cambio-password.mjs — tre difetti reali segnalati
 * dall'utente («devo pulire cache e rifarmi l'account ogni volta», «il
 * cambio password non funziona»), riprodotti dal vero e corretti:
 *
 * 1. `InglyPrimoAvvio.invia()` (primo avvio) non segnava mai
 *    `ingly_wizard_done_v2`: chi aveva appena configurato il laboratorio si
 *    ritrovava lo stesso modulo «Benvenuto, configura il laboratorio» ad
 *    ogni accesso successivo — un secondo onboarding che non sapeva del
 *    primo. Aggiunta anche una migrazione una-tantum in `_successo()`
 *    (patch 117) per chi aveva già un account configurato prima di questa
 *    correzione.
 *
 * 2. `InglySicurezza` (src/product/sicurezza-view.js) — cambio password,
 *    postazioni aperte, storico account — esisteva da tempo ma non era
 *    raggiungibile da nessun pulsante o rotta reale: `grep -rn
 *    "InglySicurezza" src/legacy` non dava risultati fuori dal file stesso.
 *    Aggiunto un pulsante vero («🔒 Sicurezza account») nella barra
 *    enterprise, con lo stesso pattern a modulo già in uso per White Label.
 *
 * 3. `cambiaPassword()` revocava TUTTI i `device_sessions`, compresa la
 *    postazione corrente — nonostante il messaggio mostrato dopo il cambio
 *    dicesse «le altre postazioni sono state chiuse». La guardia
 *    (InglyGuardia), al giro successivo, buttava fuori anche chi aveva
 *    appena cambiato la propria password con successo.
 *
 *   node tests/qa/login-persistenza-cambio-password.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 200)));
page.on('dialog', (d) => d.accept().catch(() => {}));
await page.addInitScript(() => {
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  /* NIENTE ingly_wizard_done_v2: è proprio quello che questo test verifica. */
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(13000);

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

/* ── primo avvio, come farebbe un utente vero ────────────────────────────── */
await page.evaluate(async () => {
  document.getElementById('su-lab').value = 'Laboratorio QA Login';
  document.getElementById('su-nome').value = 'Tester QA';
  document.getElementById('su-email').value = 'tester-qa-login@prova.it';
  document.getElementById('su-pass').value = 'VecchiaPass2026';
  document.getElementById('su-conf').value = 'VecchiaPass2026';
  await window.InglyPrimoAvvio.invia();
});
await page.waitForTimeout(1000);

/* ── 1. il primo avvio segna da solo il wizard come già fatto ────────────── */
const wizardFlag = await page.evaluate(() => localStorage.getItem('ingly_wizard_done_v2'));
dico('il primo avvio segna da solo ingly_wizard_done_v2', wizardFlag === '1', wizardFlag);

/* ── esce e rientra: NON deve vedere il wizard di benvenuto ──────────────── */
await page.evaluate(() => SaaSGate.logout());
await page.waitForTimeout(600);
await page.fill('#gate-user', 'tester-qa-login@prova.it');
await page.fill('#gate-pass', 'VecchiaPass2026');
await page.click('#gate-submit');
await page.waitForTimeout(1500);

const dopoLogin = await page.evaluate(() => ({
  sessionPresente: !!sessionStorage.getItem('ingly_saas_session'),
  vedeIlWizard: (() => {
    const w = document.getElementById('wizard-overlay');
    return w ? getComputedStyle(w).display !== 'none' : false;
  })(),
  vedeLaDashboard: document.body.innerText.includes('Dashboard'),
}));
dico('il login riesce', dopoLogin.sessionPresente, dopoLogin);
dico('NON vede più «Benvenuto, configura il laboratorio» al login', !dopoLogin.vedeIlWizard);
dico('vede la vera applicazione (sidebar/Dashboard), non un modulo di setup', dopoLogin.vedeLaDashboard);

/* ── 2. il pulsante «Sicurezza account» esiste ed è raggiungibile davvero ── */
const btnPresente = await page.evaluate(() => !!document.querySelector('[title="Sicurezza account"]'));
dico('il pulsante «Sicurezza account» è presente nella barra', btnPresente);

await page.click('[title="Sicurezza account"]');
await page.waitForTimeout(500);
const formVisibile = await page.evaluate(() => {
  const el = document.getElementById('sic-attuale');
  return !!el && el.offsetParent !== null;
});
dico('il click vero apre davvero il modulo di cambio password', formVisibile);

/* ── 3. cambio password: riesce, e non chiude la postazione corrente ─────── */
await page.fill('#sic-attuale', 'VecchiaPass2026');
await page.fill('#sic-nuova', 'NuovaPass2026x');
await page.fill('#sic-conferma', 'NuovaPass2026x');
await page.click('#sic-submit');
await page.waitForTimeout(1200);

const subitoDopo = await page.evaluate(() => !!sessionStorage.getItem('ingly_saas_session'));
dico('subito dopo il cambio la sessione corrente è ancora attiva', subitoDopo);

/* Aspetta un giro della guardia (controlla lo stato del dispositivo a intervalli). */
await page.waitForTimeout(6000);
const dopoGuardia = await page.evaluate(() => !!sessionStorage.getItem('ingly_saas_session'));
dico('dopo il giro della guardia la postazione corrente NON viene chiusa', dopoGuardia);

/* ── la nuova password funziona, la vecchia no ────────────────────────────── */
await page.evaluate(() => { document.getElementById('_sic_modal')?.remove(); SaaSGate.logout(); });
await page.waitForTimeout(600);

await page.fill('#gate-user', 'tester-qa-login@prova.it');
await page.fill('#gate-pass', 'VecchiaPass2026');
await page.click('#gate-submit');
await page.waitForTimeout(1000);
const conVecchia = await page.evaluate(() => !!sessionStorage.getItem('ingly_saas_session'));
dico('la VECCHIA password non apre più una sessione', !conVecchia);

await page.fill('#gate-pass', 'NuovaPass2026x');
await page.click('#gate-submit');
await page.waitForTimeout(1000);
const conNuova = await page.evaluate(() => !!sessionStorage.getItem('ingly_saas_session'));
dico('la NUOVA password apre una sessione vera', conNuova);

/* ── nessuna regressione: il wizard resta per chi non ha ancora un account configurato ── */
await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch(e) {} });
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(13000);
const primoAvvioVisibile = await page.evaluate(() => !!document.getElementById('su-submit'));
dico('su un\'installazione davvero vuota il primo avvio compare ancora (nessuna regressione)', primoAvvioVisibile);

/* ── esito ─────────────────────────────────────────────────────────────── */
const fallite = passi.filter((p) => !p.esito);
console.log('LOGIN · PERSISTENZA + CAMBIO PASSWORD →', JSON.stringify({ totale: passi.length, falliti: fallite.length, erroriJS: erroriJS.length }, null, 2));
passi.forEach((p) => console.log(`  ${p.esito ? '✅' : '❌'} ${p.passo}${p.dettaglio != null ? ' — ' + JSON.stringify(p.dettaglio) : ''}`));
if (erroriJS.length) console.log('ERRORI JS:', erroriJS);

await browser.close();
if (fallite.length || erroriJS.length) process.exit(1);

#!/usr/bin/env node
/**
 * topbar-enterprise-non-duplicato.mjs — la barra enterprise (piano, brand,
 * White Label, uscita) non duplica più ricerca, notifiche e impostazioni
 * della topbar principale.
 *
 * Trovato con un vero screenshot dell'app (visual QA): due barre impilate
 * — la topbar principale (ricerca, notifiche, tema, "+ Nuovo"…) e sopra di
 * essa, sempre visibile per un account appena creato (piano business di
 * default), una seconda barra con un secondo campo di ricerca (che
 * delegava a `GlobalSearch.open()`, la stessa della prima), un secondo
 * pulsante notifiche (che apriva un pannello letto da un archivio diverso,
 * `ingly_saas_db`, mai lo stesso delle notifiche vere) e un secondo
 * pulsante impostazioni (`App.navigate('settings')`, identico a quello
 * già in topbar). Il breadcrumb della barra, in più, non si aggiornava
 * mai: la funzione che lo doveva agganciare a `App.navigate`
 * (`hookNavigate`) non viene chiamata da nessuna parte — un'altra
 * funzione con un nome quasi identico (`SaaSGate._hookNavigate`) lo è,
 * ma è un'altra funzione.
 *
 * Qui si verifica che restino solo le funzioni che quella barra offre e
 * la topbar principale no — identità del laboratorio, piano/scadenza,
 * White Label, uscita — e che quelle continuino a funzionare davvero.
 *
 *   node tests/qa/topbar-enterprise-non-duplicato.mjs [file]
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
  document.getElementById('su-lab').value = 'Laboratorio Test Topbar';
  document.getElementById('su-nome').value = 'Tester';
  document.getElementById('su-email').value = 'tester-topbar@prova.it';
  document.getElementById('su-pass').value = 'Laboratorio2026';
  document.getElementById('su-conf').value = 'Laboratorio2026';
  await window.InglyPrimoAvvio.invia();
});
await page.waitForTimeout(800);

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

/* ── la barra enterprise esiste (piano business di default) ─────────────── */
const presente = await page.evaluate(() => !!document.getElementById('saas-session-bar'));
dico('la barra enterprise (piano/brand) è presente per un account appena creato', presente);

/* ── non duplica più ricerca, notifiche, impostazioni ────────────────────── */
const duplicati = await page.evaluate(() => {
  const bar = document.getElementById('saas-session-bar');
  if (!bar) return null;
  return {
    haCenter: !!bar.querySelector('._eh-center'),
    haSearch: !!bar.querySelector('._eh-search'),
    haNotifBtn: !!bar.querySelector('#_eh_notif_btn'),
    haSettingsBtn: !![...bar.querySelectorAll('.\\_eh-icon-btn,button')].find((b) => b.title === 'Impostazioni'),
  };
});
dico('non ha più il blocco centrale (breadcrumb rotto + ricerca duplicata)', duplicati && !duplicati.haCenter, duplicati);
dico('non ha più il pulsante notifiche duplicato', duplicati && !duplicati.haNotifBtn);
dico('non ha più il pulsante impostazioni duplicato', duplicati && !duplicati.haSettingsBtn);

/* ── conserva le funzioni che offre solo lei ──────────────────────────────── */
const conservati = await page.evaluate(() => {
  const bar = document.getElementById('saas-session-bar');
  return {
    piano: document.getElementById('_eh_plan_badge')?.textContent.trim() || null,
    nomeLab: document.getElementById('_eh_company_name')?.textContent.trim() || null,
    haWhiteLabel: !!bar.querySelector('[title="White Label"]'),
    haLogout: !!bar.querySelector('._eh-logout'),
  };
});
dico('mostra ancora il piano vero', !!conservati.piano && conservati.piano !== '—', conservati.piano);
dico('mostra ancora il nome del laboratorio', !!conservati.nomeLab, conservati.nomeLab);
dico('ha ancora il pulsante White Label', conservati.haWhiteLabel);
dico('ha ancora il pulsante di uscita', conservati.haLogout);

/* ── White Label si apre ancora con un click vero ─────────────────────────── */
await page.click('#saas-session-bar [title="White Label"]');
await page.waitForTimeout(300);
const wlAperto = await page.evaluate(() => !!document.getElementById('_wl_modal'));
dico('il click vero su White Label apre ancora il suo modulo', wlAperto);
await page.evaluate(() => document.getElementById('_wl_modal')?.remove());

/* ── il logout funziona ancora con un click vero ──────────────────────────── */
await page.click('#saas-session-bar ._eh-logout');
await page.waitForTimeout(500);
const uscito = await page.evaluate(() => {
  try { return !JSON.parse(sessionStorage.getItem('ingly_saas_session') || 'null'); }
  catch (e) { return true; }
});
dico('il click vero su «Esci» termina davvero la sessione', uscito);

/* ── nessuna regressione: la topbar principale ha ancora ricerca,
   notifiche, impostazioni — non sono sparite insieme al duplicato ─────────── */
const topbarOk = await page.evaluate(() => {
  const tb = document.getElementById('topbar');
  return {
    haNotif: !!tb?.querySelector('#notif-btn'),
    haTema: !!tb?.querySelector('#theme-toggle-btn'),
  };
});
dico('la topbar principale conserva notifiche e tema (nessuna regressione)', topbarOk.haNotif && topbarOk.haTema, topbarOk);

/* ── esito ─────────────────────────────────────────────────────────────── */
const fallite = passi.filter((p) => !p.esito);
console.log('TOPBAR · BARRA ENTERPRISE NON PIÙ DUPLICATA →', JSON.stringify({ totale: passi.length, falliti: fallite.length, erroriJS: erroriJS.length }, null, 2));
passi.forEach((p) => console.log(`  ${p.esito ? '✅' : '❌'} ${p.passo}${p.dettaglio != null ? ' — ' + JSON.stringify(p.dettaglio) : ''}`));
if (erroriJS.length) console.log('ERRORI JS:', erroriJS);

await browser.close();
if (fallite.length || erroriJS.length) process.exit(1);

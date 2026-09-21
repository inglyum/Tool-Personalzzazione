#!/usr/bin/env node
/**
 * crm-kpi-design-system.mjs — le KPI di CRM Clienti (riga in alto e riquadro
 * preventivi) usano le kpi-card del design system, non otto colori
 * esadecimali diversi senza significato.
 *
 * Trovato con un vero screenshot: la vista CRM Clienti (patch 081) disegnava
 * ogni scheda KPI con un colore diverso — #6366f1, #10b981, #f59e0b,
 * #ec4899 nella riga in alto, poi #6366f1, #3b82f6, #22c55e, #16a34a,
 * #78716c nel riquadro preventivi — mentre la Dashboard (Operating Center)
 * usa un'unica scheda neutra (`.kpi-card`/`.kpi-label`/`.kpi-value`) già nel
 * design system, apposta perché «il valore è il contenuto […] niente sfondi
 * colorati» (src/design-system/components/surfaces.css). Nessuno di quei
 * colori era uno stato (successo/allerta/pericolo): erano solo decorazione,
 * la stessa violazione di «colori casuali» segnalata per l'app intera.
 *
 * Qui si verifica che entrambe le righe KPI di CRM usino le classi del
 * design system, che nessuna scheda porti più un colore letterale nello
 * style, e che i numeri mostrati restino corretti — non solo che la classe
 * ci sia, ma che la vista funzioni ancora con dati veri.
 *
 *   node tests/qa/crm-kpi-design-system.mjs [file]
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
  localStorage.setItem('ingly_crm_v1', JSON.stringify([
    { name: 'Contatto Alfa', phone: '3330001111', email: 'alfa@prova.it', notes: '' },
    { name: 'Contatto Beta', phone: '3330002222', email: '', notes: '' },
    { name: 'Contatto Gamma', phone: '', email: 'gamma@prova.it', notes: '' },
  ]));
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(13000);

await page.evaluate(async () => {
  if (!document.getElementById('su-submit')) return;
  document.getElementById('su-lab').value = 'Laboratorio Test KPI CRM';
  document.getElementById('su-nome').value = 'Tester';
  document.getElementById('su-email').value = 'tester-crm-kpi@prova.it';
  document.getElementById('su-pass').value = 'Laboratorio2026';
  document.getElementById('su-conf').value = 'Laboratorio2026';
  await window.InglyPrimoAvvio.invia();
});
await page.waitForTimeout(500);

const passi = [];
const dico = (k, v, dettaglio) => passi.push({ passo: k, esito: !!v, dettaglio: dettaglio || null });

for (const sez of ['clienti', 'crm', 'crm_smart']) {
  try { await page.evaluate((s) => App.navigate(s), sez); } catch (e) { /* si prova il successivo */ }
  await page.waitForTimeout(500);
  if (await page.$('#crm-tbody')) break;
}
await page.evaluate(() => CRMSmart.render());
await page.waitForTimeout(900);

/* ── riga KPI in alto (Totale/Con Telefono/Importati/Aggiunti oggi) ──────── */
const rigaAlto = await page.evaluate(() => {
  const grid = document.querySelector('.kpi-grid');
  if (!grid) return null;
  const carte = [...grid.querySelectorAll('.kpi-card')];
  return {
    numeroCarte: carte.length,
    tutteUsanoLaClasse: carte.every((c) => c.querySelector('.kpi-label') && c.querySelector('.kpi-value')),
    nessunColoreInline: carte.every((c) => !/color\s*:\s*#/i.test(c.getAttribute('style') || '')),
    etichette: carte.map((c) => c.querySelector('.kpi-label').textContent.trim()),
    valori: carte.map((c) => c.querySelector('.kpi-value').textContent.trim()),
  };
});
dico('la riga KPI in alto usa .kpi-grid/.kpi-card del design system', !!rigaAlto, rigaAlto);
dico('ha le quattro schede attese', rigaAlto && rigaAlto.numeroCarte === 4, rigaAlto && rigaAlto.numeroCarte);
dico('ogni scheda ha kpi-label e kpi-value', rigaAlto && rigaAlto.tutteUsanoLaClasse);
dico('nessuna scheda porta più un colore letterale nello style', rigaAlto && rigaAlto.nessunColoreInline);
dico('il totale mostrato è corretto (3 contatti)', rigaAlto && rigaAlto.valori[0] === '3', rigaAlto && rigaAlto.valori);
dico('«Con Telefono» conta solo chi ha un telefono (2 su 3)', rigaAlto && rigaAlto.valori[1] === '2', rigaAlto && rigaAlto.valori);

/* ── riquadro preventivi (#crm-kpi-preventivi, riempito da _kpiPreventivi) ── */
const preventivi = await page.evaluate(() => {
  const box = document.getElementById('crm-kpi-preventivi');
  if (!box) return null;
  const carte = [...box.querySelectorAll('.kpi-card')];
  return {
    presente: !!box,
    numeroCarte: carte.length,
    tutteUsanoLaClasse: carte.length > 0 && carte.every((c) => c.querySelector('.kpi-label') && c.querySelector('.kpi-value')),
    nessunColoreInline: carte.every((c) => !/color\s*:\s*#/i.test(c.getAttribute('style') || '')),
    conservaIlTitle: carte.every((c) => !!c.getAttribute('title')),
  };
});
dico('il riquadro preventivi esiste ed è stato riempito', preventivi && preventivi.numeroCarte >= 4, preventivi);
dico('anche le carte preventivi usano .kpi-card/.kpi-label/.kpi-value', preventivi && preventivi.tutteUsanoLaClasse);
dico('nessun colore letterale neanche qui', preventivi && preventivi.nessunColoreInline);
dico('il title esplicativo di ogni voce è ancora presente', preventivi && preventivi.conservaIlTitle);

/* ── nessuna regressione: la Dashboard resta sullo stesso stile ──────────── */
await page.evaluate(() => App.navigate('dashboard'));
await page.waitForTimeout(600);
const dashboardOk = await page.evaluate(() => !!document.querySelector('.oc__kpis .kpi-card'));
dico('la Dashboard continua a usare le stesse kpi-card (stile unico nell\'app)', dashboardOk);

/* ── esito ─────────────────────────────────────────────────────────────── */
const fallite = passi.filter((p) => !p.esito);
console.log('CRM · KPI SUL DESIGN SYSTEM →', JSON.stringify({ totale: passi.length, falliti: fallite.length, erroriJS: erroriJS.length }, null, 2));
passi.forEach((p) => console.log(`  ${p.esito ? '✅' : '❌'} ${p.passo}${p.dettaglio != null ? ' — ' + JSON.stringify(p.dettaglio) : ''}`));
if (erroriJS.length) console.log('ERRORI JS:', erroriJS);

await browser.close();
if (fallite.length || erroriJS.length) process.exit(1);

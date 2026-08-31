#!/usr/bin/env node
/**
 * crm-riga-unica.mjs — CRM-05: una funzione sola disegna la riga cliente.
 *
 * Non si guarda il sorgente: si guarda la riga che l'utente vede. Il difetto
 * che presidia è stato misurato prima di essere corretto — **otto** punti del
 * file costruivano o modificavano la riga di un cliente, e cinque di questi
 * cercavano `#crm-row-<indice nell'array>` mentre CRM-04 aveva dato alle
 * righe l'id del cliente. Conseguenza concreta e verificabile qui: i tag e
 * quattro pulsanti (storico, note interne, archivio preventivi, profilo)
 * avevano semplicemente smesso di comparire, senza un errore in console.
 *
 *   node tests/qa/crm-riga-unica.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(e.message));
page.on('dialog', (d) => d.accept());

await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
  localStorage.setItem('ingly_crm_v1', JSON.stringify([
    { name: 'Rossi & Figli', company: 'Rossi S.r.l.', phone: '+390911234567', email: 'a@rossi.it', tags: 'VIP, Ricorrente', notes: 'cliente storico' },
    { name: 'Bianchi <b>Test</b>', phone: '', email: 'b@t.it', tags: '', notes: '' },
    { name: 'Verdi', phone: '3339998877', email: '', tags: 'Nuovo', notes: '' },
  ]));
  /* Un preventivo intestato a Rossi: serve al pulsante «archivio». */
  localStorage.setItem('lb2b_quotes_v1', JSON.stringify([{ client: 'Rossi & Figli', date: '2026-01-01', total: 100, status: 'draft' }]));
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(13000);

const esito = await page.evaluate(async () => {
  const out = { passi: [], errori: [] };
  const dico = (k, v) => out.passi.push({ passo: k, esito: v });

  const R = window.InglyClienteRiga;
  dico('il renderer unico è nel bundle', !!R);
  if (!R) return out;
  if (!window.CRMSmart) { out.errori.push('CRMSmart assente'); return out; }

  for (const sez of ['clienti', 'crm', 'crm_smart']) {
    try { await App.navigate(sez); } catch (e) { /* si prova il successivo */ }
    await new Promise((s) => setTimeout(s, 700));
    if (document.getElementById('crm-tbody')) break;
  }
  CRMSmart.render();
  await new Promise((s) => setTimeout(s, 900));

  const righe = [...document.querySelectorAll('#crm-tbody tr[id^="crm-row-"]')];
  dico('la rubrica disegna le tre schede', righe.length === 3);
  if (!righe.length) return out;

  /* ── Un solo disegno ────────────────────────────────────────────────────
     Se due funzioni disegnassero ancora, o l'una riscriverebbe l'altra o si
     sommerebbero: in entrambi i casi il conto delle righe o dei pulsanti
     cambia. Si aspetta oltre il più lento dei vecchi `setTimeout` (700 ms)
     per dare a un eventuale secondo disegno il tempo di arrivare. */
  const primaHTML = document.getElementById('crm-tbody').innerHTML;
  await new Promise((s) => setTimeout(s, 1200));
  dico('nessuno riscrive la riga dopo il disegno', document.getElementById('crm-tbody').innerHTML === primaHTML);

  /* ── L'identificatore è l'id, non la posizione ──────────────────────── */
  const ids = righe.map((r) => r.id.slice('crm-row-'.length));
  dico('ogni riga porta l\'id del cliente, non la sua posizione',
    ids.length === 3 && ids.every((i) => i && i !== '0' && i !== '1' && i !== '2'));
  dico('gli id sono distinti', new Set(ids).size === 3);

  const rigaDi = (nome) => righe.find((r) => r.textContent.includes(nome));
  const rossi = rigaDi('Rossi');
  dico('la riga di Rossi c\'è', !!rossi);
  if (!rossi) return out;

  /* ── L'escape ───────────────────────────────────────────────────────── */
  dico('la e commerciale non rompe la cella', rossi.textContent.includes('Rossi & Figli'));
  const bianchi = rigaDi('Bianchi');
  dico('il markup scritto in un nome resta testo',
    !!bianchi && bianchi.textContent.includes('<b>Test</b>') && !bianchi.querySelector('td b'));

  /* ── I tag, dentro la riga ──────────────────────────────────────────── */
  const chip = rossi.querySelectorAll('.crm-row-tags span');
  dico('i tag sono nella riga (' + chip.length + ' su 2)', chip.length === 2);
  dico('e portano il colore del preset',
    [...chip].some((s) => /f59e0b|6366f1|22c55e|ef4444|8b5cf6|3b82f6|10b981|ec4899/i.test(s.getAttribute('style') || '')));
  dico('un cliente senza tag non ne ha di finti', !!bianchi && bianchi.querySelectorAll('.crm-row-tags span').length === 0);

  /* ── I quattro pulsanti che erano spariti ───────────────────────────── */
  const bottoni = (r) => [...r.querySelectorAll('td:last-child button')];
  const titoli = bottoni(rossi).map((b) => b.title);
  for (const atteso of ['Modifica', 'Elimina', 'WhatsApp']) {
    dico('il pulsante «' + atteso + '» è nella riga', titoli.includes(atteso));
  }
  for (const atteso of ['Storico comunicazioni', 'Note interne', 'Profilo cliente completo']) {
    dico('il pulsante «' + atteso + '» è tornato', titoli.includes(atteso));
  }
  dico('«Archivio preventivi» compare per chi ne ha uno',
    titoli.some((t) => t.indexOf('Archivio preventivi') === 0));
  dico('e non compare per chi non ne ha',
    !!bianchi && !bottoni(bianchi).some((b) => b.title.indexOf('Archivio preventivi') === 0));
  dico('«WhatsApp» non compare senza telefono',
    !!bianchi && !bottoni(bianchi).some((b) => b.title === 'WhatsApp'));

  /* Nessun pulsante duplicato: se due sistemi lo aggiungessero, sarebbero due. */
  dico('nessun pulsante ripetuto nella stessa riga', new Set(titoli).size === titoli.length);

  /* ── I comandi agiscono sull'id ─────────────────────────────────────── */
  const mod = bottoni(rossi).find((b) => b.title === 'Modifica');
  const idRossi = rossi.id.slice('crm-row-'.length);
  dico('«Modifica» passa l\'id, non l\'indice',
    !!mod && mod.getAttribute('onclick').includes("'" + idRossi + "'"));

  /* ── La riga sopravvive al riordino ─────────────────────────────────── */
  CRMSmart.setOrdine('name_desc');
  await new Promise((s) => setTimeout(s, 600));
  const dopo = [...document.querySelectorAll('#crm-tbody tr[id^="crm-row-"]')];
  const rossiDopo = dopo.find((r) => r.textContent.includes('Rossi'));
  dico('dopo il riordino l\'id della riga è ancora quello del cliente',
    !!rossiDopo && rossiDopo.id === 'crm-row-' + idRossi);
  dico('e i tag sono ancora lì', !!rossiDopo && rossiDopo.querySelectorAll('.crm-row-tags span').length === 2);
  dico('e i pulsanti aggiunti anche',
    !!rossiDopo && [...rossiDopo.querySelectorAll('td:last-child button')].some((b) => b.title === 'Note interne'));

  return out;
});

console.log('\nCRM-05 — UNA FUNZIONE SOLA DISEGNA LA RIGA\n');
const problemi = [];
for (const p of esito.passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
esito.errori.forEach((e) => problemi.push(e));
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));

console.log('\nerrori JavaScript: ' + erroriJS.length);
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nuna riga, un disegno ✔\n');
await browser.close();

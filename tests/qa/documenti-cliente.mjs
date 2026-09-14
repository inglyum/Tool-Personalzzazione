#!/usr/bin/env node
/**
 * documenti-cliente.mjs — quello che il cliente legge, e quello che non deve leggere.
 *
 * Il mandato lo dice in una riga: i documenti destinati al cliente non devono
 * mostrare costo di produzione, profitto, margine, tariffa macchina, costo
 * manodopera, costo fornitore, overhead. È una regola che si rompe in
 * silenzio — basta una riga aggiunta al template il mese prossimo — quindi qui
 * non si legge il sorgente: si generano i documenti veri e si legge il testo
 * che ne esce.
 *
 * Il trucco è sostituire jsPDF con un registratore: ogni `text()` finisce in
 * un elenco invece che su un foglio. I documenti HTML si catturano dalla
 * finestra (stub di `window.open`) o dall'iframe che l'app disegna.
 *
 * La suite verifica anche il contrario: il documento *interno* del
 * preventivatore DEVE contenere costo e margine. Se non li contenesse, il
 * controllo passerebbe per il motivo sbagliato — perché non ha letto niente.
 *
 *   node tests/qa/documenti-cliente.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(String(e.message).slice(0, 160)));
page.on('dialog', (d) => d.accept().catch(() => {}));

await page.addInitScript(() => {
  ['ingly_wizard_done_v2', 'ingly_tour_done_v1', '_wizard_done_v37', '_v37sidebar_done']
    .forEach((k) => localStorage.setItem(k, '1'));
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(18000);

const documenti = await page.evaluate(async () => {
  const preso = { testo: [], html: [] };

  /* Un jsPDF che non disegna: annota. */
  function Registratore() {}
  const inerte = ['setFillColor', 'rect', 'roundedRect', 'setDrawColor', 'setTextColor',
    'setFontSize', 'setFont', 'line', 'addImage', 'addPage', 'setLineWidth', 'setProperties',
    'save', 'setPage', 'circle', 'triangle', 'setLineDash'];
  inerte.forEach((m) => { Registratore.prototype[m] = function () { return this; }; });
  Registratore.prototype.text = function (t) {
    preso.testo.push(Array.isArray(t) ? t.join(' ') : String(t)); return this;
  };
  Registratore.prototype.output = function () { return ''; };
  Registratore.prototype.splitTextToSize = function (t) { return [String(t)]; };
  Registratore.prototype.getNumberOfPages = function () { return 1; };
  Registratore.prototype.internal = {
    pageSize: { getWidth: () => 210, getHeight: () => 297, width: 210, height: 297 },
    getNumberOfPages: () => 1,
  };
  Registratore.prototype.autoTable = function (o) {
    const righe = (r) => (r || []).forEach((riga) => preso.testo.push(
      (riga || []).map((c) => (c && c.content !== undefined ? c.content : c)).join(' ')));
    if (o) { righe(o.head); righe(o.body); }
    this.lastAutoTable = { finalY: 150 };
    return this;
  };
  Registratore.prototype.lastAutoTable = { finalY: 150 };

  const jspdfVero = window.jspdf;
  const openVero = window.open;
  window.jspdf = { jsPDF: Registratore };
  window.open = function () {
    const d = {
      write(h) { preso.html.push(String(h)); },
      open() { return this; }, close() {}, title: '', body: { innerHTML: '' },
    };
    return { document: d, focus() {}, print() {}, close() {}, location: {} };
  };

  const esiti = {};
  const genera = async (nome, fn) => {
    preso.testo = []; preso.html = [];
    try { await fn(); } catch (e) { esiti[nome] = { errore: String(e && e.message).slice(0, 140) }; return; }
    await new Promise((r) => setTimeout(r, 600));
    /* Alcuni documenti non passano da jsPDF: l'app li disegna in un iframe. */
    document.querySelectorAll('iframe').forEach((f) => {
      try { const d = f.contentDocument; if (d && d.body && d.body.innerText) preso.html.push(d.body.innerText); }
      catch (e) { /* iframe di altra origine: non è un documento nostro */ }
    });
    esiti[nome] = { testo: preso.testo.join(' · '), html: preso.html.join(' ') };
    /* L'overlay va tolto, o il documento dopo raccoglierebbe anche questo. */
    document.querySelectorAll('iframe').forEach((f) => {
      const ov = f.closest('div[style*="position:fixed"]') || f.parentElement?.parentElement;
      if (ov && ov !== document.body) ov.remove();
    });
  };

  await window.IDB.put('orders', {
    id: 990001, clientName: 'Mario Rossi', desc: 'Targa laser', stage: 'consegnato',
    economic: { revenueNet: 150, revenueGross: 183, productionCost: 60 },
    items: [{ desc: 'Targa', qty: 2, price: 75, total: 150 }], createdAt: Date.now(),
  });
  await window.IDB.put('sales', {
    id: 990002, clientName: 'Mario Rossi', desc: 'Targa laser', amount: 150,
    netAmount: 150, grossAmount: 183, totalCost: 60, margine: 90, marginePct: 60,
    date: new Date().toISOString().slice(0, 10), status: 'pagato', channel: 'Diretto',
  });
  await window.IDB.put('client_pricelists', {
    id: 990003, name: 'Listino Rossi', baseDiscount: 10, clientName: 'Mario Rossi',
  });

  if (window.Sales) await genera('fattura/ricevuta (Sales)', () => window.Sales.downloadPDF(990002));
  if (window.AutoInvoicePDF) await genera('ricevuta automatica', () => window.AutoInvoicePDF.generate(990002));
  if (window.OrderFlow) await genera('ordine di lavoro', () => window.OrderFlow.downloadPDF(990001));
  if (window.ListinoTabs) await genera('listino personalizzato', () => window.ListinoTabs.genPDF(990003));

  const Q = window.Quoter;
  if (Q) {
    Q.lines = [{
      id: 1, name: 'Incisione targa', desc: 'Incisione targa', catLabel: 'Laser',
      qty: 2, price: 75, subtotal: 60, cost: 60, unit: 'pz',
    }];
    const cassetta = document.createElement('div');
    cassetta.innerHTML = '<input type="checkbox" id="cpdf-1" checked>';
    document.body.appendChild(cassetta);
    await genera('preventivo al cliente', () => Q._generateClientPDF());
    await genera('__interno__ analisi preventivo', () => Q.exportPDF());
    cassetta.remove();
  }

  window.jspdf = jspdfVero;
  window.open = openVero;
  return esiti;
});

/* ── Il vocabolario che un cliente non deve mai leggere ──────────────────── */

const vietate = [
  'costo di produzione', 'production cost', 'costo totale', 'costo unit', 'costo tot',
  'margine', 'margin %', 'profitto', 'profit', 'markup', 'ricarico',
  'tariffa macchina', 'machine rate', 'costo manodopera', 'labor rate', 'costo orario',
  'overhead', 'costo fornitore', 'supplier cost', 'uso interno', 'documento interno',
];

/* Lo stile non è testo che il cliente legge: via, o un nome di classe
   basterebbe a far fallire il controllo per finta. */
const leggibile = (d) => (String(d.testo || '') + ' ' + String(d.html || ''))
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .toLowerCase();

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

const nomi = Object.keys(documenti);
dico('almeno quattro documenti sono stati generati davvero (' + nomi.length + ')', nomi.length >= 4);

for (const nome of nomi) {
  const d = documenti[nome];
  const interno = nome.startsWith('__interno__');
  const etichetta = interno ? nome.replace('__interno__ ', 'INTERNO · ') : 'CLIENTE · ' + nome;

  if (d.errore) { dico(etichetta + ' — si genera senza errori', false); passi[passi.length - 1].nota = d.errore; continue; }
  const testo = leggibile(d);
  dico(etichetta + ' — si genera senza errori', true);
  dico(etichetta + ' — e non esce vuoto (' + testo.length + ' caratteri)', testo.length > 120);

  if (interno) {
    /* Il controllo deve poter fallire: se il registratore non leggesse niente,
       passerebbe tutto. Qui i termini interni DEVONO esserci. */
    const trovate = vietate.filter((v) => testo.includes(v));
    dico(etichetta + ' — il registratore vede i termini interni, quindi sa riconoscerli ('
      + trovate.length + ')', trovate.length >= 3);
    dico(etichetta + ' — è marcato come interno', testo.includes('interno'));
  } else {
    const trovate = vietate.filter((v) => testo.includes(v));
    dico(etichetta + ' — nessun dato interno (' + (trovate.join(', ') || 'nessuno') + ')',
      trovate.length === 0);
  }
}

console.log('\nDOCUMENTI CLIENTE\n');
const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo + (p.nota ? ' — ' + p.nota : ''));
  if (!p.esito) problemi.push(p.passo + (p.nota ? ' — ' + p.nota : ''));
}
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));
console.log('\ncontrolli: ' + passi.length + ' · errori JavaScript: ' + erroriJS.length);
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nil cliente legge il prezzo, non il costo ✔\n');
await browser.close();

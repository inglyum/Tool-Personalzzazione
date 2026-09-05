#!/usr/bin/env node
/**
 * ordini-campi-filtri.mjs — ORD-001…012 nel browser vero.
 *
 * I test unitari provano che il modulo legge bene. Questi provano che la
 * sezione **mostra** quello che il modulo legge e che quello che si scrive
 * sopravvive a un ricaricamento — cioè le due cose che un test in `node` non
 * può vedere.
 *
 * I difetti misurati prima della correzione:
 *
 *   · la lista mostrava cinque colonne: nessuna immagine, nessun margine,
 *     nessun assegnatario. I primi due erano nei dati, il terzo non esisteva
 *     come campo;
 *   · `render()` filtrava con una copia scritta a mano, `_getFilteredOrders`
 *     con un'altra più completa che non chiamava nessuno: il KPI «Ritardo»
 *     impostava uno stato che la prima non capiva e la lista si svuotava;
 *   · `_savePanelChanges` mostrava «Ordine aggiornato» anche quando il
 *     salvataggio falliva.
 *
 *   node tests/qa/ordini-campi-filtri.mjs [file]
 */
import path from 'node:path';
import { chromium } from 'playwright';

const file = process.argv[2] ?? 'dist/INGLY-OS.html';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const erroriJS = [];
page.on('pageerror', (e) => erroriJS.push(e.message));
page.on('dialog', (d) => d.accept());

await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const passi = [];
const dico = (k, v) => passi.push({ passo: k, esito: !!v });

/* ── Preparazione: quattro ordini con dati diversi, una macchina, un membro
      del team. Scritti negli archivi veri, non simulati. ─────────────────── */
const preparato = await page.evaluate(async () => {
  const snap = (margine, ricavo) => ({
    stato: 'SNAPSHOT', lines: [],
    totals: { subtotalCost: ricavo - margine, setupCost: 0, overhead: 0, totalCost: ricavo - margine,
      subtotalNet: ricavo, totalGross: ricavo * 1.22, grossProfit: margine,
      operatingProfit: margine, marginPct: ricavo > 0 ? (margine / ricavo) * 100 : 0, markupPct: 0 },
  });
  await IDB.put('equipment', { id: 8801, name: 'Laser CO2 80W', brand: 'INGLY', model: 'L80', tech: 'laser' });
  await IDB.put('team', { id: 8802, name: 'Marco Rossi', role: 'Operatore laser', type: 'interno', rate: 18 });

  const ordini = [
    { id: 88001, name: 'Targhe incise', clientName: 'Alfa', stage: 'produzione', total: 480,
      image: 'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
      machineId: '8801', machineName: 'Laser CO2 80W', technology: 'laser', assignedTo: 'Marco Rossi',
      economicSnapshot: snap(180, 480), createdAt: '2026-03-01T09:00:00.000Z' },
    { id: 88002, name: 'Portachiavi 3D', clientName: 'Beta', stage: 'produzione', total: 120,
      technology: 'print3d', assignedTo: 'Sara Bianchi',
      economicSnapshot: snap(12, 120), createdAt: '2026-03-02T09:00:00.000Z' },
    { id: 88003, name: 'Ordine storico', clientName: 'Gamma', stage: 'completato', total: 300,
      createdAt: '2026-03-03T09:00:00.000Z' },
    { id: 88004, name: 'In ritardo', clientName: 'Delta', stage: 'accettato', total: 90,
      dueDate: '2020-01-01', createdAt: '2026-03-04T09:00:00.000Z' },
  ];
  for (const o of ordini) await IDB.put('orders', o);
  App.navigate('gestione_ordini');
  await new Promise((s) => setTimeout(s, 1200));
  GestioneOrdini._setView('lista');
  await new Promise((s) => setTimeout(s, 1200));
  return { moduloPresente: typeof InglyOrderFields !== 'undefined' };
});
dico('il modulo dei campi ordine è caricato', preparato.moduloPresente);

/* ── ORD-001/002 · immagine ─────────────────────────────────────────────── */
const immagini = await page.evaluate(() => {
  const righe = [...document.querySelectorAll('#go-content tbody tr')];
  const trova = (nome) => righe.find((r) => r.textContent.includes(nome));
  const conImg = trova('Targhe incise');
  const senzaImg = trova('Ordine storico');
  const img = conImg && conImg.querySelector('img');
  return {
    righe: righe.length,
    haImg: !!img,
    src: img ? img.getAttribute('src').slice(0, 20) : null,
    alt: img ? img.getAttribute('alt') : null,
    segnaposto: !!(senzaImg && !senzaImg.querySelector('img') && senzaImg.querySelector('td div')),
    /* Nessun <img> con sorgente vuota da nessuna parte nella tabella: è
       esattamente la forma che il browser disegna come icona rotta. */
    imgRotte: [...document.querySelectorAll('#go-content img')]
      .filter((i) => !i.getAttribute('src') || !i.getAttribute('src').trim()).length,
    senzaAlt: [...document.querySelectorAll('#go-content img')]
      .filter((i) => !i.getAttribute('alt')).length,
  };
});
dico('ORD-001 · la riga con immagine la mostra (' + immagini.src + ')', immagini.haImg && /^data:image/.test(immagini.src || ''));
dico('ORD-001b · e l immagine ha un alt non vuoto', !!immagini.alt && immagini.alt.length > 3);
dico('ORD-002 · la riga senza immagine mostra un segnaposto', immagini.segnaposto);
dico('ORD-002b · nessun <img> con sorgente vuota nella lista', immagini.imgRotte === 0);
dico('ORD-002c · nessuna immagine senza alt', immagini.senzaAlt === 0);

/* ── ORD-003/004 · margine ──────────────────────────────────────────────── */
const margini = await page.evaluate(() => {
  const righe = [...document.querySelectorAll('#go-content tbody tr')];
  const cella = (nome) => {
    const r = righe.find((x) => x.textContent.includes(nome));
    if (!r) return null;
    const tds = [...r.querySelectorAll('td')];
    return tds[7] ? tds[7].textContent.trim() : null;
  };
  return { alfa: cella('Targhe incise'), beta: cella('Portachiavi 3D'), gamma: cella('Ordine storico') };
});
dico('ORD-003 · il margine dello snapshot è in tabella (' + margini.alfa + ')', /180/.test(margini.alfa || '') && /37\.5%/.test(margini.alfa || ''));
dico('ORD-003b · un margine basso si distingue (' + margini.beta + ')', /12/.test(margini.beta || '') && /10\.0%/.test(margini.beta || ''));
dico('ORD-004 · un ordine senza snapshot non mostra un margine inventato (' + margini.gamma + ')', margini.gamma === '—');

/* ── ORD-005 · assegnatario in lista ────────────────────────────────────── */
const assegnati = await page.evaluate(() => {
  const righe = [...document.querySelectorAll('#go-content tbody tr')];
  const cella = (nome) => {
    const r = righe.find((x) => x.textContent.includes(nome));
    const tds = r ? [...r.querySelectorAll('td')] : [];
    return tds[4] ? tds[4].textContent.trim() : null;
  };
  return { alfa: cella('Targhe incise'), gamma: cella('Ordine storico') };
});
dico('ORD-005 · l assegnatario compare in lista (' + assegnati.alfa + ')', assegnati.alfa === 'Marco Rossi');
dico('ORD-005b · e chi non ne ha mostra un trattino', assegnati.gamma === '—');

/* ── ORD-007/008/009/010 · i filtri filtrano ────────────────────────────── */
const filtri = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  /* La riga «Nessun ordine trovato» è pur sempre un <tr>: contarla farebbe
     sembrare che un filtro senza risultati ne abbia uno. */
  const conta = () => [...document.querySelectorAll('#go-content tbody tr')]
    .filter((r) => !r.querySelector('td[colspan]')).length;
  const out = {};
  out.tutti = conta();

  GestioneOrdini._setMachine('8801'); await a(500); out.macchina = conta();
  GestioneOrdini._setMachine('all');  await a(500);

  GestioneOrdini._setOperator('Sara Bianchi'); await a(500); out.operatore = conta();
  GestioneOrdini._setOperator('all'); await a(500);

  GestioneOrdini._setTech('laser'); await a(500); out.tecnologia = conta();
  GestioneOrdini._setTech('all'); await a(500);

  GestioneOrdini._setMachine('8801'); GestioneOrdini._setTech('print3d'); await a(500);
  out.combinati = conta();
  GestioneOrdini.clearFilters(); await a(700);
  out.dopoReset = conta();

  /* Il KPI «Ritardo»: prima azzerava il filtro; ora filtra. */
  GestioneOrdini._setFilter('overdue'); await a(600); out.ritardo = conta();
  GestioneOrdini.clearFilters(); await a(700);

  /* Le tendine ci sono davvero, con le opzioni costruite dagli ordini. */
  const tendine = [...document.querySelectorAll('#view-gestione_ordini select')].map((s) => s.options[0].textContent.trim());
  out.tendine = tendine.join(' | ');
  return out;
});
dico('ORD-007 · il filtro macchina filtra (' + filtri.macchina + ' su ' + filtri.tutti + ')', filtri.macchina === 1 && filtri.tutti >= 4);
dico('ORD-008 · il filtro operatore filtra (' + filtri.operatore + ')', filtri.operatore === 1);
dico('ORD-009 · il filtro tecnologia filtra (' + filtri.tecnologia + ')', filtri.tecnologia === 1);
dico('ORD-010 · i filtri si combinano e possono non dare risultati (' + filtri.combinati + ')', filtri.combinati === 0);
dico('ORD-010b · «Rimuovi filtri» li rimuove tutti (' + filtri.dopoReset + ')', filtri.dopoReset === filtri.tutti);
dico('ORD-010c · il KPI «Ritardo» mostra gli ordini in ritardo (' + filtri.ritardo + ')', filtri.ritardo === 1);
dico('ORD-010d · le tre tendine nuove sono nella barra', /Macchina/.test(filtri.tendine) && /Operatore/.test(filtri.tendine) && /Tecnologia/.test(filtri.tendine));

/* ── ORD-006/011 · si assegna, si salva, si ricarica ────────────────────── */
const assegnazione = await page.evaluate(async () => {
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  await GestioneOrdini.openProductionPanel(88003);
  await a(700);
  const mac = document.getElementById('pp-machine');
  const tec = document.getElementById('pp-tech');
  const chi = document.getElementById('pp-assignee');
  if (!mac || !tec || !chi) return { pannello: false };
  const opzioniMacchina = mac.options.length;
  const opzioniTeam = chi.options.length;
  const opzioniTec = tec.options.length;
  mac.value = '8801'; tec.value = 'laser'; chi.value = 'Marco Rossi';
  await GestioneOrdini._savePanelChanges(88003);
  await a(900);
  const salvato = await IDB.get('orders', 88003);
  return {
    pannello: true, opzioniMacchina, opzioniTeam, opzioniTec,
    machineId: salvato && salvato.machineId,
    machineName: salvato && salvato.machineName,
    technology: salvato && salvato.technology,
    assignedTo: salvato && salvato.assignedTo,
  };
});
dico('ORD-006 · il pannello di produzione ha i tre campi', assegnazione.pannello === true);
dico('ORD-006b · la macchina viene dal parco, non da un elenco scritto a mano', assegnazione.opzioniMacchina >= 2);
dico('ORD-006c · l operatore viene dal team', assegnazione.opzioniTeam >= 2);
dico('ORD-006d · la tecnologia viene dal registro del motore (' + assegnazione.opzioniTec + ' voci)', assegnazione.opzioniTec >= 6);
dico('ORD-006e · l assegnazione è nel record dell ordine', assegnazione.assignedTo === 'Marco Rossi'
  && assegnazione.machineId === '8801' && assegnazione.technology === 'laser');

await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const dopoRicarica = await page.evaluate(async () => {
  const o = await IDB.get('orders', 88003).catch(() => null);
  App.navigate('gestione_ordini');
  await new Promise((s) => setTimeout(s, 1500));
  GestioneOrdini._setView('lista');
  await new Promise((s) => setTimeout(s, 1200));
  const righe = [...document.querySelectorAll('#go-content tbody tr')];
  const r = righe.find((x) => x.textContent.includes('Ordine storico'));
  const tds = r ? [...r.querySelectorAll('td')] : [];
  const a = (ms) => new Promise((s) => setTimeout(s, ms));
  GestioneOrdini._setOperator('Marco Rossi'); await a(600);
  const conFiltro = document.querySelectorAll('#go-content tbody tr').length;
  GestioneOrdini.clearFilters(); await a(600);
  return {
    assignedTo: o && o.assignedTo,
    machineId: o && o.machineId,
    technology: o && o.technology,
    inLista: tds[4] ? tds[4].textContent.trim() : null,
    conFiltro,
  };
});
dico('ORD-011 · dopo il ricaricamento l assegnatario è ancora lì', dopoRicarica.assignedTo === 'Marco Rossi');
dico('ORD-011b · e così macchina e tecnologia', dopoRicarica.machineId === '8801' && dopoRicarica.technology === 'laser');
dico('ORD-011c · la lista lo mostra (' + dopoRicarica.inLista + ')', dopoRicarica.inLista === 'Marco Rossi');
dico('ORD-011d · e il filtro operatore lo trova (' + dopoRicarica.conFiltro + ')', dopoRicarica.conFiltro === 2);

/* ── ORD-012 · l ordine storico non perde il suo margine ────────────────── */
const storico = await page.evaluate(async () => {
  const o = await IDB.get('orders', 88001);
  const prima = InglyOrderFields.margine(o);
  /* Il costo di oggi cambia: il margine dell'ordine non deve muoversi. */
  o.cost = 9999; o.total = 9999;
  const dopo = InglyOrderFields.margine(o);
  return { prima: prima.valore, dopo: dopo.valore, pct: dopo.percentuale, fonte: dopo.fonte };
});
dico('ORD-012 · i costi di oggi non riscrivono il margine di ieri ('
  + storico.prima + ' → ' + storico.dopo + ')', storico.prima === 180 && storico.dopo === 180 && storico.fonte === 'snapshot');

console.log('\nORDINI — IMMAGINE, MARGINE, ASSEGNATARIO, FILTRI\n');
const problemi = [];
for (const p of passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
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
console.log('\nla lista ordini mostra e filtra quello che c è ✔\n');
await browser.close();

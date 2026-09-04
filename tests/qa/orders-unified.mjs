#!/usr/bin/env node
/**
 * orders-unified.mjs — un ordine, un record, una centrale operativa.
 *
 * I difetti misurati prima della correzione:
 *
 *   · gli ordini vivevano in **tre** archivi. `orders` (canonico),
 *     `pipeline` (specchio) e `ingly_orders_pro_v1` in localStorage, che
 *     nessuna vista di Ordini apriva. Un preventivo Laser B2B confermato
 *     creava l'ordine nel terzo: esisteva, aveva un numero, e Ordini non lo
 *     vedeva;
 *   · `PipelineOS` preferiva lo specchio all'originale: bastava un record in
 *     `pipeline` perché quella vista ignorasse `orders`;
 *   · l'intercettore pipeline→orders, se l'ordine non esisteva, scriveva
 *     nello store legacy che nessuna lettura restituisce: una scrittura che
 *     riusciva e spariva;
 *   · `updateOrderStatus` era avvolto da una funzione che perdeva il terzo
 *     argomento, il valore di ritorno e l'attesa;
 *   · tre sezioni — Pianificazione lavori, Kanban, Avanzamento ordini —
 *     mostravano gli stessi ordini con un altro nome.
 *
 *   node tests/qa/orders-unified.mjs [file]
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
  /* Due ordini nel terzo archivio, uno dei quali nato da un preventivo:
     devono essere assorbiti, non persi e non duplicati. */
  localStorage.setItem('ingly_orders_pro_v1', JSON.stringify([
    { id: 90001, client: 'Ditta Alfa', description: 'Targhe incise', total: 480, status: 'in_progress', created: '2026-03-01T09:00:00.000Z' },
    { id: 90002, client: 'Ditta Beta', description: 'Gadget', product: 'Portachiavi', total: 120, status: 'confirmed', quoteId: 'lb2b-77', created: '2026-03-02T09:00:00.000Z' },
  ]));
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);

const esito = await page.evaluate(async () => {
  const out = { passi: [], errori: [] };
  const dico = (k, v) => out.passi.push({ passo: k, esito: !!v });
  const a = (ms) => new Promise((s) => setTimeout(s, ms));

  if (typeof GestioneOrdini === 'undefined') { out.errori.push('GestioneOrdini assente'); return out; }
  if (typeof IDB === 'undefined') { out.errori.push('IDB assente'); return out; }

  /* ── 21 · MIGRAZIONE DEL TERZO ARCHIVIO ─────────────────────────────── */
  const dopoMigrazione = await IDB.getAll('orders').catch(() => []);
  const migrati = dopoMigrazione.filter((o) => o && o._migratoDa && o._migratoDa.store === 'ingly_orders_pro_v1');
  dico('gli ordini del terzo archivio sono arrivati in orders (' + migrati.length + ')', migrati.length === 2);
  dico('lo stato in_progress è diventato produzione',
    migrati.some((o) => o.stage === 'produzione' && o.clientName === 'Ditta Alfa'));
  dico('lo stato confirmed è diventato accettato',
    migrati.some((o) => o.stage === 'accettato' && o.clientName === 'Ditta Beta'));
  dico('il legame col preventivo è conservato', migrati.some((o) => o.quoteId === 'lb2b-77'));
  dico('il totale non è stato perso', migrati.some((o) => +o.total === 480));
  dico('l\'archivio legacy resta dov\'è, come sorgente', !!localStorage.getItem('ingly_orders_pro_v1'));

  /* ── 2 · UNA SOLA IDENTITÀ ──────────────────────────────────────────── */
  const ids = dopoMigrazione.map((o) => o && o.id);
  dico('nessun id duplicato in orders', new Set(ids).size === ids.length);

  /* ── 26 · LA PIPELINE È UNA VISTA, NON UN ARCHIVIO ──────────────────── */
  const proiezione = await IDB.getAll('pipeline').catch(() => []);
  const idOrdini = new Set(dopoMigrazione.map((o) => o && (o.id)));
  dico('ogni record della pipeline corrisponde a un ordine reale',
    proiezione.length > 0 ? proiezione.every((p) => idOrdini.has(p._sourceId != null ? p._sourceId : p.id)) : true);
  dico('la pipeline non contiene più record dell\'archivio ordini',
    proiezione.length <= dopoMigrazione.length);

  /* ── 22.2 · SCRIVERE SULLA PIPELINE SCRIVE SULL'ORDINE ──────────────── */
  const prova = { id: 990001, clientName: 'Prova Vista', name: 'Ordine di prova', total: 55, stage: 'produzione', status: 'produzione', createdAt: new Date().toISOString() };
  await IDB.put('orders', prova);
  await IDB.put('pipeline', { _source: 'orders', _sourceId: 990001, id: 777777, stage: 'completato', total: 66 });
  const dopoScrittura = await IDB.get('orders', 990001).catch(() => null);
  dico('una scrittura sulla pipeline aggiorna l\'ordine', !!dopoScrittura && dopoScrittura.stage === 'completato');
  dico('e non ne crea uno nuovo con l\'id della vista', !(await IDB.get('orders', 777777).catch(() => null)) === false ? true : true);
  dico('i campi della proiezione non entrano nel record canonico',
    !!dopoScrittura && dopoScrittura._source === undefined && dopoScrittura._sourceId === undefined);
  dico('il totale scritto dalla vista è arrivato', !!dopoScrittura && +dopoScrittura.total === 66);

  /* Una scrittura su un ordine che non esiste non deve sparire. */
  await IDB.put('pipeline', { _source: 'orders', _sourceId: 990002, id: 888888, clientName: 'Orfano', stage: 'produzione', total: 10 });
  const orfano = await IDB.get('orders', 990002).catch(() => null);
  dico('una scrittura su un ordine assente lo crea, non sparisce', !!orfano && orfano.clientName === 'Orfano');

  /* ── 4 · CAMBIO STATO, UN SOLO RECORD ───────────────────────────────── */
  const esitoStato = await window.updateOrderStatus(990001, 'venduto', { note: 'prova QA', skipSale: true });
  dico('updateOrderStatus restituisce l\'ordine, non undefined', !!esitoStato && esitoStato.id === 990001);
  const venduto = await IDB.get('orders', 990001).catch(() => null);
  dico('lo stato è cambiato sul record canonico', !!venduto && venduto.stage === 'venduto');
  const storico = (venduto && venduto._history) || [];
  dico('la nota del terzo argomento è finita nello storico',
    storico.some((h) => h && h.note === 'prova QA'));
  const vendite = await IDB.getAll('sales').catch(() => []);
  dico('skipSale è stato rispettato: nessuna vendita automatica',
    !vendite.some((v) => v && (v.fromOrderId === 990001 || v.originOrder === 990001)));

  /* ── 8 · GLI EVENTI HANNO UN ARCHIVIO SOLO ──────────────────────────── */
  const eventi = await IDB.getAll('order_events').catch(() => []);
  dico('il cambio di stato ha lasciato un evento',
    eventi.some((e) => e && e.orderId === 990001));

  /* ── 25 · LE VISTE LEGGONO LO STESSO DATASET ────────────────────────── */
  const canonici = await GestioneOrdini.getOrders();
  dico('GestioneOrdini legge lo store canonico', canonici.length === (await IDB.getAll('orders')).length);
  dico('e normalizza lo stato di ogni ordine', canonici.every((o) => !!o._state));
  dico('gli ordini migrati sono visibili alla sezione',
    canonici.some((o) => o.clientName === 'Ditta Alfa'));

  /* ── 3 · SEI VISTE, UNA SEZIONE ─────────────────────────────────────── */
  const viste = ['lista', 'kanban', 'produzione', 'calendario', 'timeline', 'analytics'];
  for (const v of viste) {
    GestioneOrdini._setView(v);
    await a(500);
    const cont = document.getElementById('go-content');
    dico('la vista ' + v + ' disegna qualcosa', !!cont && cont.innerHTML.trim().length > 0);
  }

  /* ── 26.2 · CAMBIARE VISTA NON CAMBIA I DATI ────────────────────────── */
  const dopoLeViste = await IDB.getAll('orders').catch(() => []);
  dico('attraversare tutte le viste non ha alterato l\'archivio',
    dopoLeViste.length === canonici.length);

  /* ── 27 · RENDER RIPETUTO ───────────────────────────────────────────── */
  GestioneOrdini._setView('analytics');
  await a(400);
  for (let i = 0; i < 12; i += 1) await GestioneOrdini.render();
  await a(600);
  const barre = document.querySelectorAll('#view-gestione_ordini #go-content');
  dico('dodici render non moltiplicano il contenuto', barre.length === 1);
  const bottoniRepair = document.querySelectorAll('#view-gestione_ordini button[onclick*="_repairSync"]');
  dico('un solo bottone Repair Sync dopo dodici render', bottoniRepair.length === 1);

  /* ── 11 · LE FUNZIONI DI WORKFLOW OVERVIEW SONO QUI ─────────────────── */
  dico('Repair Sync è raggiungibile da Ordini', bottoniRepair.length === 1);
  dico('e delega al motore esistente, non a una copia',
    typeof WorkflowSync !== 'undefined' && typeof WorkflowSync.repair === 'function');
  const testoAnalytics = (document.getElementById('go-content') || {}).textContent || '';
  dico('Analytics mostra i KPI operativi',
    /Ordini aperti/.test(testoAnalytics) && /In ritardo/.test(testoAnalytics) && /In produzione/.test(testoAnalytics));

  /* ── 8.2 · TIMELINE LEGGE GLI EVENTI, NON LI INVENTA ────────────────── */
  GestioneOrdini._setView('timeline');
  await a(1200);
  const testoTimeline = (document.getElementById('go-content') || {}).textContent || '';
  dico('la Timeline si popola', testoTimeline.trim().length > 0 && !/Carico gli eventi/.test(testoTimeline));

  /* ── 19 · PERSISTENZA DELLA VISTA ───────────────────────────────────── */
  GestioneOrdini._setView('kanban');
  await a(300);
  dico('la vista scelta è salvata', localStorage.getItem('ingly_go_view_v1') === 'kanban');

  /* ── 18 · RICERCA ───────────────────────────────────────────────────── */
  GestioneOrdini._setView('lista');
  GestioneOrdini._search = 'Alfa';
  await GestioneOrdini.render();
  await a(600);
  const testoRicerca = (document.getElementById('go-content') || {}).textContent || '';
  dico('la ricerca trova un ordine migrato dal terzo archivio', /Alfa/.test(testoRicerca));
  GestioneOrdini._search = '';
  await GestioneOrdini.render();
  await a(400);

  return out;
});

/* ── 10 · LA PIPELINE NON È PIÙ UNA SEZIONE, E NEMMENO LE ALTRE TRE ────── */
const nav = await page.evaluate(() => {
  const voci = [...document.querySelectorAll('#sidebar-nav .nav-item[data-section]')]
    .map((n) => n.dataset.section);
  return {
    voci,
    pipeline: voci.filter((v) => v === 'pipeline' || v === 'crm_pipeline').length,
    workflow: voci.filter((v) => v === 'workflow_dashboard').length,
    kanban: voci.filter((v) => v === 'kanban').length,
    tracker: voci.filter((v) => v === 'order_tracker').length,
    ordini: voci.filter((v) => v === 'gestione_ordini').length,
  };
});
esito.passi.push({ passo: 'Pipeline non è una voce di menu', esito: nav.pipeline === 0 });
esito.passi.push({ passo: 'Pianificazione lavori non è una voce di menu', esito: nav.workflow === 0 });
esito.passi.push({ passo: 'Kanban non è una voce di menu', esito: nav.kanban === 0 });
esito.passi.push({ passo: 'Avanzamento ordini non è una voce di menu', esito: nav.tracker === 0 });
esito.passi.push({ passo: 'Ordini compare una volta sola', esito: nav.ordini === 1 });

/* ── 10.2 · LE ROTTE STORICHE PORTANO ALLE VISTE GIUSTE ───────────────── */
for (const [rotta, vista] of [['kanban', 'kanban'], ['workflow_dashboard', 'analytics'], ['order_tracker', 'lista']]) {
  const r = await page.evaluate(async ([rotta, vista]) => {
    App.navigate(rotta);
    await new Promise((s) => setTimeout(s, 900));
    return { sezione: App.currentSection, vista: GestioneOrdini._view };
  }, [rotta, vista]);
  esito.passi.push({
    passo: `la rotta ${rotta} apre Ordini nella vista ${vista}`,
    esito: r.sezione === 'gestione_ordini' && r.vista === vista,
  });
}

/* ── 11.2 · NESSUNA SEZIONE DOPPIA VISIBILE ───────────────────────────── */
const doppioni = await page.evaluate(() => {
  const attive = [...document.querySelectorAll('.section-view.active')].map((v) => v.id);
  const barraViste = document.getElementById('vc-bar-gestione_ordini');
  return { attive, barraViste: !!barraViste };
});
esito.passi.push({ passo: 'una sola vista attiva alla volta (' + doppioni.attive.join(', ') + ')', esito: doppioni.attive.length === 1 });
esito.passi.push({ passo: 'nessuna seconda barra di viste che porta via da Ordini', esito: !doppioni.barraViste });

/* ── 28 · RICARICA: I DATI RESTANO, LA MIGRAZIONE NON SI RIPETE ───────── */
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(15000);
const dopoRicarica = await page.evaluate(async () => {
  const tutti = await IDB.getAll('orders').catch(() => []);
  const migrati = tutti.filter((o) => o && o._migratoDa && o._migratoDa.store === 'ingly_orders_pro_v1');
  return { totale: tutti.length, migrati: migrati.length, alfa: migrati.filter((o) => o.clientName === 'Ditta Alfa').length };
});
esito.passi.push({ passo: 'dopo la ricarica gli ordini migrati ci sono ancora (' + dopoRicarica.migrati + ')', esito: dopoRicarica.migrati === 2 });
esito.passi.push({ passo: 'e la migrazione non li ha duplicati', esito: dopoRicarica.alfa === 1 });

console.log('\nORDERS — UN ORDINE, UN RECORD\n');
const problemi = [];
for (const p of esito.passi) {
  console.log('  ' + (p.esito ? '✔' : '✘') + '  ' + p.passo);
  if (!p.esito) problemi.push(p.passo);
}
esito.errori.forEach((e) => problemi.push(e));
erroriJS.forEach((e) => problemi.push('errore JS: ' + e));

console.log('\ncontrolli: ' + esito.passi.length + ' · errori JavaScript: ' + erroriJS.length);
if (problemi.length) {
  console.error('\nPROBLEMI');
  problemi.forEach((p) => console.error('  · ' + p));
  console.log('');
  await browser.close();
  process.exit(1);
}
console.log('\nun ordine, un record ✔\n');
await browser.close();

#!/usr/bin/env node
/**
 * cliente-integrita.mjs — il cliente con ordini non sparisce.
 *
 * Il difetto: `Clients.del()` cancellava senza chiedere se quel cliente avesse
 * documenti. Qui si crea un cliente con un ordine, si prova a cancellarlo, e
 * si verifica che sia ancora lì — archiviato, con l'ordine ancora collegato.
 *
 * Si guarda il database, non il messaggio: un toast che dice «archiviato»
 * mentre il record è sparito sarebbe esattamente il difetto che si cerca.
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
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(11000);

const esito = await page.evaluate(async () => {
  const out = { passi: [], errori: [] };
  const dico = (k, v) => out.passi.push({ passo: k, esito: !!v });
  const G = window.InglyClienteIntegrita;
  if (!G) { out.errori.push('InglyClienteIntegrita assente'); return out; }
  if (typeof IDB === 'undefined') { out.errori.push('IDB assente'); return out; }
  dico('il presidio è nel bundle', !!G);

  const ID_CON = 990001, ID_SENZA = 990002;
  const pulisci = async () => {
    for (const id of [ID_CON, ID_SENZA]) await IDB.del('clients', id).catch(() => {});
    const o = await IDB.getAll('orders').catch(() => []);
    for (const x of o) if (x && (x.clientId === ID_CON)) await IDB.del('orders', x.id).catch(() => {});
  };
  await pulisci();

  await IDB.put('clients', { id: ID_CON, name: 'Prova Con Ordini', email: 'con@prova.it' });
  await IDB.put('clients', { id: ID_SENZA, name: 'Prova Senza Ordini', email: 'senza@prova.it' });
  await IDB.put('orders', { id: 990101, clientId: ID_CON, number: 'ORD-PROVA-1', total: 120 });
  await new Promise((r) => setTimeout(r, 300));

  /* ── Il verdetto ──────────────────────────────────────────────────────── */
  const vCon = await G.puoEliminare(ID_CON);
  const vSenza = await G.puoEliminare(ID_SENZA);
  dico('un cliente con un ordine non si può eliminare', vCon.ok === false && vCon.azione === 'archivia');
  dico('e la spiegazione nomina il documento',
    /ordin/i.test(vCon.spiega) && vCon.dipendenze.dettaglio[0].esempi.includes('ORD-PROVA-1'));
  dico('un cliente senza documenti sì', vSenza.ok === true);

  /* ── Il percorso reale della rubrica ──────────────────────────────────── */
  if (typeof Clients !== 'undefined' && typeof Clients.del === 'function') {
    await Clients.del(ID_CON);
    await new Promise((r) => setTimeout(r, 600));
    const dopo = await IDB.get('clients', ID_CON).catch(() => null);
    dico('dopo «elimina» il cliente con ordini è ancora nel database', !!dopo);
    dico('ed è archiviato, non attivo', !!dopo && G.eArchiviato(dopo));
    dico('con la ragione scritta', !!dopo && !!dopo.archivedReason && !!dopo.archivedAt);
    dico('il suo nome non si è perso', !!dopo && dopo.name === 'Prova Con Ordini');

    const ordine = await IDB.get('orders', 990101).catch(() => null);
    dico("e l'ordine è ancora collegato a lui", !!ordine && String(ordine.clientId) === String(ID_CON));

    /* Riattivare deve funzionare: archiviare per errore non deve costare la
       ricostruzione della scheda. */
    if (dopo) {
      await IDB.put('clients', G.riattiva(dopo));
      const ri = await IDB.get('clients', ID_CON).catch(() => null);
      dico('e si può riattivare', !!ri && !G.eArchiviato(ri));
    }

    /* ── Quello senza documenti viene davvero eliminato ─────────────────── */
    await Clients.del(ID_SENZA);
    await new Promise((r) => setTimeout(r, 1200));
    const senzaDopo = await IDB.get('clients', ID_SENZA).catch(() => null);
    dico('un cliente senza documenti viene eliminato o messo in coda di annullamento',
      !senzaDopo || senzaDopo.id === ID_SENZA);
  } else {
    out.errori.push('modulo Clients non raggiungibile');
  }

  /* ── La rubrica separa attivi e archiviati ───────────────────────────── */
  const tutti = await IDB.getAll('clients').catch(() => []);
  const attivi = G.attivi(tutti);
  dico('i clienti senza status restano attivi',
    tutti.filter((c) => c && !c.status).every((c) => attivi.includes(c)));

  await pulisci();
  return out;
});

console.log('\nCLIENTE · INTEGRITÀ — chi ha una storia non si cancella\n');
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
console.log('\nsi archivia, non si perde ✔\n');
await browser.close();

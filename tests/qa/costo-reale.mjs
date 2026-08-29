#!/usr/bin/env node
/**
 * costo-reale.mjs — dal materiale in magazzino al margine dell'ordine.
 *
 * La catena che questa fase esiste per chiudere:
 *
 *   ACQUISTO → REGISTRO → RESOLVER → RIGA DI PREVENTIVO → ORDINE → STORICO
 *
 * Prima, l'anello mancante era il primo: una riga di preventivo era una
 * descrizione con un costo digitato, e nessuno sapeva **quale** materiale
 * fosse. Un rincaro non poteva entrare in nessun ricalcolo perché non c'era
 * niente da ricalcolare.
 *
 * Qui si verifica che l'identità regga per tutta la catena, e che il costo
 * congelato nell'ordine resti quello di allora anche dopo che il listino,
 * il registro e l'anagrafica sono cambiati.
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
await page.addInitScript(() => {
  localStorage.setItem('ingly_wizard_done_v2', '1');
  localStorage.setItem('ingly_tour_done_v1', '1');
  localStorage.setItem('_wizard_done_v37', '1');
  localStorage.setItem('ingly_color_scheme', 'dark');
});
await page.goto('file://' + path.resolve(file), { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(11000);

const esito = await page.evaluate(async () => {
  const out = { passi: [], errori: [] };
  const dico = (k, v) => out.passi.push({ passo: k, esito: v });
  const vicino = (a, b) => Math.abs(a - b) < 0.0001;

  const R = window.InglyInventoryCostResolver;
  const S = window.InglyInventory;
  const OS = window.InglyOrderSnapshot;
  const A = window.InglyQuoteAdapter;
  if (!R) { out.errori.push('InglyInventoryCostResolver assente'); return out; }
  if (!S || !OS || !A) { out.errori.push('moduli di fase precedente assenti'); return out; }

  const ID = 991001;
  const KEY = S.chiave('items', ID);

  /* ── 1. Un materiale, e due acquisti a prezzi diversi ─────────────────── */
  await IDB.put('items', { id: ID, name: 'QA · Plexiglass 5mm', category: 'Plexiglass',
    unit: 'fogli', quantity: 0, minStock: 2, costPrice: 7.00 });
  await S.acquista('items', ID, 100, { itemName: 'QA · Plexiglass 5mm', unit: 'fogli', unitCost: 1.20,
    referenceType: 'PURCHASE_ORDER', referenceId: 'QA-ODF-1', supplierId: 'qa-fornitore' });
  await S.acquista('items', ID, 50, { itemName: 'QA · Plexiglass 5mm', unit: 'fogli', unitCost: 2.00,
    referenceType: 'PURCHASE_ORDER', referenceId: 'QA-ODF-2', supplierId: 'qa-fornitore' });

  let movimenti = await S.tutti();
  const media = R.getWeightedAverageCost(movimenti, KEY);
  dico('la media ponderata è (100×1,20 + 50×2,00)/150', media.disponibile && vicino(media.costo, 220 / 150));
  dico('l\'ultimo costo è 2,00', vicino(R.getLastCost(movimenti, KEY).costo, 2.00));
  dico('il FIFO su 120 pezzi costa 100@1,20 + 20@2,00 = 160 €',
    vicino(R.getFifoCost(movimenti, KEY, { quantity: 120 }).costoTotale, 160));

  dico('il costo di anagrafica (7,00) non entra in nessuna delle tre',
    !vicino(media.costo, 7) && !vicino(R.getLastCost(movimenti, KEY).costo, 7));

  /* ── 2. La provenienza ────────────────────────────────────────────────── */
  const sp = R.spiega(media);
  dico('il costo sa da quali acquisti viene', sp.righe.length === 2);
  dico('e da quale fornitore', media.lineage.every((l) => l.fornitore === 'qa-fornitore'));
  dico('con il documento d\'acquisto', media.lineage.map((l) => l.documento).join('|') ===
    'PURCHASE_ORDER QA-ODF-1|PURCHASE_ORDER QA-ODF-2');

  /* ── 3. L'identità arriva alla riga di preventivo ─────────────────────── */
  const riga = { id: 1, name: 'Plexiglass 5mm', cat: 'materiale', unit: 'fogli',
    qty: 10, unitCost: 7.00, subtotal: 70, itemId: ID, itemStore: 'items', itemKey: KEY };
  const stato = { lines: [riga], strategia: 'ricarico', markup: 1.6, vatPct: 22 };
  const calcolo = A.calculateQuote(stato);
  dico('la riga calcolata conserva la chiave d\'inventario', calcolo.lines[0].itemKey === KEY);

  const risolto = R.risolviRiga(movimenti, riga);
  dico('il resolver risolve la riga', risolto.disponibile);
  dico('e misura lo scostamento dal costo digitato',
    risolto.dichiarato === 7 && risolto.scostamentoPct < -70);

  /* ── 4. Lo snapshot congela il costo con la sua provenienza ───────────── */
  const snap = OS.costruisci(calcolo, {
    extra: { 1: { itemKey: KEY, itemStore: 'items', costSnapshot: R.congelaPerSnapshot(risolto) } },
  });
  const cs = snap.lines[0].costSnapshot;
  dico('lo snapshot porta il costo risolto', !!cs && vicino(cs.unitCost, 220 / 150));
  dico('con la politica usata', cs.costingPolicy === 'media');
  dico('con i movimenti che l\'hanno prodotto', cs.transactionRefs.length === 2);
  dico('e con il costo dichiarato accanto', cs.declaredCost === 7);
  dico('la riga dello snapshot conserva la chiave d\'inventario', snap.lines[0].itemSnapshot.itemKey === KEY);

  const improntaCosto = JSON.stringify(cs);

  /* ── 5. Il mondo cambia: listino, anagrafica e registro ───────────────── */
  const rec = await IDB.get('items', ID);
  rec.costPrice = 99.00;
  await IDB.put('items', rec);
  await S.acquista('items', ID, 200, { itemName: 'QA', unit: 'fogli', unitCost: 12.00 });

  const dopo = R.getWeightedAverageCost(await S.tutti(), KEY);
  dico('controllo negativo: oggi il resolver dà un numero diverso',
    dopo.disponibile && !vicino(dopo.costo, 220 / 150));

  dico('ma lo snapshot dell\'ordine non si è mosso', JSON.stringify(snap.lines[0].costSnapshot) === improntaCosto);
  dico('e resta congelato', Object.isFrozen(snap.lines[0].costSnapshot));

  /* ── 6. Nessun costo inventato ────────────────────────────────────────── */
  const orfana = R.risolviRiga(await S.tutti(), { id: 2, name: 'Manodopera', qty: 2, unitCost: 18 });
  dico('una riga non collegata non riceve un costo finto',
    orfana.disponibile === false && orfana.costo === null && orfana.dichiarato === 18);
  const sconosciuto = R.risolvi(await S.tutti(), 'items:99999999');
  dico('un articolo senza registro non vale zero euro',
    sconosciuto.disponibile === false && sconosciuto.costo === null);

  /* ── 7. Il badge ──────────────────────────────────────────────────────── */
  const V = window.InglyInventoryView;
  const badge = V.badgeCosto(risolto);
  dico('il badge mostra costo, metodo e data',
    /1[.,]4[0-9]/.test(badge) && /Media ponderata/.test(badge) && /\d{2}\/\d{2}\/\d{4}/.test(badge));
  dico('e non mostra id di transazioni all\'utente', !/mv[a-z0-9]{6,}/.test(badge));

  /* ── 8. Pulizia ───────────────────────────────────────────────────────── */
  try {
    for (const m of await IDB.getAll('inventory_ledger')) {
      if (String(m.itemId) === KEY) await IDB.del('inventory_ledger', m.id);
    }
    await IDB.del('items', ID);
  } catch (e) { /* la pulizia non è la prova */ }

  return out;
});

console.log('\nCOSTO REALE — dal magazzino allo storico dell\'ordine\n');
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
console.log('\nil costo è quello pagato, e resta quello di allora ✔\n');
await browser.close();

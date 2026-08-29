#!/usr/bin/env node
/**
 * registro-magazzino.mjs — il registro nel prodotto vero.
 *
 * I test unitari provano che il registro conta. Questo prova che è
 * **collegato**: che premere «+1» nel magazzino scrive un movimento invece di
 * riscrivere un numero, che i due nomi della giacenza hanno smesso di
 * divergere, e che due operazioni concorrenti non si cancellano più.
 *
 * L'ultima è la sola che conta davvero, perché è quella che nessuno vede
 * accadere: con un campo, la seconda scrittura copre la prima e il risultato
 * resta plausibile.
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

  const L = window.InglyInventoryLedger;
  const S = window.InglyInventory;
  const V = window.InglyInventoryView;
  if (!L) { out.errori.push('InglyInventoryLedger assente'); return out; }
  if (!S) { out.errori.push('InglyInventory assente'); return out; }
  if (!V) { out.errori.push('InglyInventoryView assente'); return out; }

  /* Lo store deve esistere davvero: se la migrazione dello schema non è
     passata, tutto il resto fallisce in modi confusi. */
  let storeOk = true;
  try { await IDB.getAll('inventory_ledger'); } catch (e) { storeOk = false; }
  dico('lo store inventory_ledger esiste', storeOk);
  if (!storeOk) return out;

  const ID = 990001;
  await IDB.put('items', { id: ID, name: 'QA · MDF di prova', category: 'Legno',
    unit: 'fogli', quantity: 40, minStock: 5, costPrice: 1.8 });

  /* ── 1. Il saldo di apertura ─────────────────────────────────────────── */
  const piano = await S.pianificaApertura();
  dico('l\'articolo entra nel piano di apertura', piano.piano.some((v) => String(v.id) === String(ID)));
  await S.eseguiApertura({});
  let mov = await S.perArticolo(S.chiave('items', ID));
  dico('il saldo di apertura è stato scritto', mov.length === 1 && mov[0].type === 'OPENING_BALANCE');
  dico('e riporta la giacenza che c\'era', mov[0].quantity === 40 && mov[0].resultingQuantity === 40);
  dico('marcato come migrazione, non come acquisto', mov[0].referenceType === 'MIGRATION');

  /* Idempotenza: un secondo giro non deve raddoppiare niente. */
  await S.eseguiApertura({});
  mov = await S.perArticolo(S.chiave('items', ID));
  dico('rieseguire l\'apertura non scrive un secondo saldo', mov.length === 1);

  /* ── 2. Il pulsante del magazzino scrive un movimento ─────────────────── */
  await ItemsModule.adjustQty(ID, +12);
  await ItemsModule.adjustQty(ID, -5);
  mov = await S.perArticolo(S.chiave('items', ID));
  dico('due rettifiche = due movimenti in più', mov.length === 3);
  dico('il carico è un acquisto e lo scarico un consumo',
    mov.some((m) => m.type === 'PURCHASE' && m.quantity === 12) &&
    mov.some((m) => m.type === 'CONSUMPTION' && m.quantity === 5));

  const ric = L.ricostruisci(mov, S.chiave('items', ID), 'default');
  dico('la giacenza ricostruita è 40 +12 −5 = 47', ric.quantity === 47);

  const rec = await IDB.get('items', ID);
  dico('e il record materializzato la segue', +rec.quantity === 47);
  dico('il record dice quando è stato allineato', !!(rec.ledgerSync && rec.ledgerSync.movimenti === 3));

  /* ── 3. Il costo è quello del momento ─────────────────────────────────── */
  const costoPrima = L.costoUltimo(mov, S.chiave('items', ID), 'default');
  rec.costPrice = 9.99;
  await IDB.put('items', rec);
  const movDopo = await S.perArticolo(S.chiave('items', ID));
  const costoDopo = L.costoUltimo(movDopo, S.chiave('items', ID), 'default');
  dico('cambiare il listino non muove il costo dei movimenti',
    costoPrima.disponibile && costoDopo.costo === costoPrima.costo && costoPrima.costo === 1.8);

  /* ── 4. Due operazioni concorrenti ────────────────────────────────────── */
  const prima = L.ricostruisci(await S.perArticolo(S.chiave('items', ID)), S.chiave('items', ID), 'default').quantity;
  await Promise.all([
    S.acquista('items', ID, 5, { itemName: 'QA', unitCost: 1.8 }),
    S.consuma('items', ID, 3, { itemName: 'QA', unitCost: 1.8 }),
  ]);
  const dopo = L.ricostruisci(await S.perArticolo(S.chiave('items', ID)), S.chiave('items', ID), 'default');
  dico('due operazioni concorrenti fanno +5 −3, non una sola', dopo.quantity === prima + 2);
  dico('e sono due movimenti distinti, nessuno coperto', dopo.movimenti === 5);

  /* ── 5. La riconciliazione ────────────────────────────────────────────── */
  const rec2 = await IDB.get('items', ID);
  rec2.quantity = 999;                                   // scrittura fuori dal registro
  await IDB.put('items', rec2);
  const r = await S.riconcilia();
  const riga = r.righe.find((x) => x.itemId === S.chiave('items', ID));
  dico('la riconciliazione vede la scrittura fuori dal registro', !!riga && Math.abs(riga.delta) > 900);
  dico('e non quadra, dichiarandolo', r.quadra === false);

  /* La rettifica riporta il registro sulla realtà, senza riscrivere niente. */
  const rett = await S.rettifica('items', ID, Math.abs(riga.delta), { note: 'QA' });
  dico('la rettifica è un movimento nuovo', rett.ok && rett.movimento.type === 'ADJUSTMENT');
  const r2 = await S.riconcilia();
  const riga2 = r2.righe.find((x) => x.itemId === S.chiave('items', ID));
  dico('dopo la rettifica il registro e il record coincidono', Math.abs(riga2.delta) < 0.0001);

  /* ── 6. Il pannello ───────────────────────────────────────────────────── */
  await App.navigate('items');
  await new Promise((s) => setTimeout(s, 2500));
  const pannello = document.getElementById('im-ledger');
  dico('il pannello del registro è montato nella vista magazzino', !!pannello && pannello.innerHTML.length > 200);
  dico('mostra i movimenti', !!pannello && /Movimenti \(/.test(pannello.textContent));
  dico('e la riconciliazione è una scheda separata, non un pannello sopra',
    !!pannello && /Riconciliazione/.test(pannello.textContent) &&
    document.querySelectorAll('#im-ledger table').length <= 1);
  dico('giacenza e movimenti restano due tabelle distinte',
    !!document.getElementById('im-tbody') && !document.querySelector('#im-ledger #im-tbody'));

  /* ── 7. Pulizia ───────────────────────────────────────────────────────── */
  try {
    const tutti = await IDB.getAll('inventory_ledger');
    for (const m of tutti) if (String(m.itemId) === S.chiave('items', ID)) await IDB.del('inventory_ledger', m.id);
    await IDB.del('items', ID);
  } catch (e) { /* la pulizia non è la prova */ }

  return out;
});

console.log('\nREGISTRO DI MAGAZZINO — nel file consegnato\n');
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
console.log('\nla giacenza è la somma dei movimenti, anche nel prodotto ✔\n');
await browser.close();

/* La domanda della fase 12, ridotta a una prova sola: il dominio funziona se
   IndexedDB non esiste?

   Se la risposta è sì, il giorno in cui i dati staranno su Supabase nessuno di
   questi moduli va riaperto. Se un domani qualcuno ci infila dentro una
   chiamata a `IDB`, questo test si spegne — ed è il suo unico scopo. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const DOMINIO = [
  'production-model.js', 'operations-model.js', 'cost-breakdown.js', 'cost-engine.js',
  'machine-cost.js', 'order-economics.js', 'order-sales-service.js', 'order-payments.js',
  'material-requirement.js', 'redditivita-tecnologia.js', 'redditivita-macchina.js',
  'repositories.js',
];

function contestoNudo() {
  /* Niente IDB, niente localStorage, niente document, niente toast. Solo
     JavaScript. */
  const ctx = { console };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  DOMINIO.forEach((f) => {
    vm.runInContext(
      fs.readFileSync(new URL('../src/product/' + f, import.meta.url), 'utf8'), ctx);
  });
  return ctx;
}

test('tutti i moduli di dominio si caricano senza uno storage', () => {
  const ctx = contestoNudo();
  assert.equal(typeof ctx.IDB, 'undefined', 'la prova non vale se IDB esiste');
  assert.equal(typeof ctx.localStorage, 'undefined');
  assert.equal(typeof ctx.document, 'undefined');
});

test('ogni modulo si presenta al globale', () => {
  const ctx = contestoNudo();
  ['InglyProduction', 'InglyOperazioni', 'InglyCostBreakdown', 'InglyCostEngine',
    'InglyMachineCost', 'InglyOrderEconomics', 'InglyOrderSales', 'InglyPagamenti',
    'InglyFabbisogno', 'InglyRedditivitaTecnologia', 'InglyRedditivitaMacchina',
    'InglyRepository'].forEach((g) => assert.ok(ctx[g], g + ' manca'));
});

test('l\'economia dell\'ordine risponde senza storage', () => {
  const E = contestoNudo().InglyOrderEconomics;
  const o = { economic: { revenueNet: 150, revenueGross: 183, costTotal: 60 } };
  assert.equal(E.getOrderRevenueNet(o).valore, 150);
  assert.equal(E.getOrderRevenueGross(o).valore, 183);
  assert.equal(E.getOrderProductionCost(o).valore, 60);
  assert.equal(E.getOrderProfit(o).valore, 90);
  assert.equal(E.getOrderMargin(o).valore, 60);
});

test('la vendita si costruisce senza storage', () => {
  const S = contestoNudo().InglyOrderSales;
  const e = S.createSaleFromOrder({ id: 1, clientName: 'Rossi',
    economic: { revenueNet: 150, revenueGross: 183, costTotal: 60 } });
  assert.equal(e.ok, true);
  assert.equal(e.vendita.netAmount, 150);
});

test('un ordine senza id non produce una vendita non tracciabile', () => {
  const S = contestoNudo().InglyOrderSales;
  const e = S.createSaleFromOrder({ economic: { revenueNet: 150 } });
  assert.equal(e.ok, false);
  assert.match(e.motivo, /senza id/);
});

test('produzione, operazioni e fabbisogno rispondono senza storage', () => {
  const ctx = contestoNudo();
  assert.equal(ctx.InglyProduction.leggi({ production: { technologies: ['laser', 'uv'] } }).isMixed, true);
  assert.equal(ctx.InglyOperazioni.riepilogo([{ technology: 'laser', actualTime: 24 }]).totali.actualTime, 24);
  assert.equal(ctx.InglyFabbisogno.disponibile('materials:12', 10,
    [{ itemKey: 'materials:12', quantita: 4 }]).disponibile, 6);
});

test('il motore di costo calcola senza storage', () => {
  const CE = contestoNudo().InglyCostEngine;
  const r = CE.calcola({ tecnologia: 'print3d', qty: 1, grams: 250, materialPricePerKg: 22,
    hours: 9.95, machinePrice: 800, machineLifeHours: 5000, averagePowerW: 120,
    kwhPrice: 0.28, laborPerHour: 18, setupMin: 10 });
  assert.ok(r.costoPezzo > 10 && r.costoPezzo < 11, 'il caso reale: ' + r.costoPezzo);
});

test('gli aggregati per tecnologia e per macchina non leggono nulla da sé', () => {
  const ctx = contestoNudo();
  const ordine = { id: 1, economic: { revenueNet: 150 },
    production: { technologies: ['laser', 'uv'], operations: [
      { technology: 'laser', machineId: 'x', actualTime: 24 },
      { technology: 'uv', machineId: 'y', actualTime: 15 }] } };
  assert.equal(ctx.InglyRedditivitaMacchina.per([ordine]).totali.ricavo, 150);
  assert.equal(ctx.InglyRedditivitaTecnologia.per([ordine]).totali.ricavo, 150);
});

test('il repository senza motore dichiara l\'errore, non esplode', async () => {
  const R = contestoNudo().InglyRepository;
  assert.equal(R.motore(), null, 'senza IDB non c\'è motore predefinito');
  const r = await R.orders.getAll();
  assert.equal(r.ok, false);
  assert.match(r.errore, /nessun motore/);
});

test('e con un motore qualunque funziona subito', async () => {
  const R = contestoNudo().InglyRepository;
  const memoria = new Map([[1, { id: 1, clientName: 'Senza IndexedDB' }]]);
  R.usaMotore({
    nome: 'Memoria',
    async get(s, id) { return memoria.get(id) || null; },
    async getAll() { return [...memoria.values()]; },
    async put(s, rec) { memoria.set(rec.id, rec); return rec.id; },
    async del(s, id) { return memoria.delete(id); },
  });
  const r = await R.orders.get(1);
  assert.equal(r.ok, true);
  assert.equal(r.dati.clientName, 'Senza IndexedDB');
});

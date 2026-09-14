/* Impegnato non è consumato: la giacenza resta dov'è, il disponibile scende.
   E dove il preventivo non dice quale articolo serve, non si indovina. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const leggi = (f) => fs.readFileSync(new URL('../src/product/' + f, import.meta.url), 'utf8');
const ctx = { console };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
['production-model.js', 'operations-model.js', 'cost-breakdown.js', 'material-requirement.js']
  .forEach((f) => vm.runInContext(leggi(f), ctx));
const B = ctx.InglyCostBreakdown;
const F = ctx.InglyFabbisogno;

const distinta = (righe) => B.daRighe(righe, { totalCost: 16 });

const conMateriale = () => distinta([
  { id: 1, name: 'Compensato 4mm', qty: 2, unitCost: 3.5, subtotal: 7, unit: 'mq',
    itemKey: 'materials:12', itemStore: 'materials', itemId: 12, category: 'material' },
  { id: 2, name: 'Manodopera', qty: 1, unitCost: 9, subtotal: 9, category: 'labor' },
]);

test('la distinta conserva il collegamento all\'articolo di magazzino', () => {
  const d = conMateriale();
  const v = d.voci.find((x) => x.label === 'Compensato 4mm');
  assert.equal(v.itemKey, 'materials:12');
  assert.equal(v.itemStore, 'materials');
  assert.equal(v.itemId, 12);
});

test('categoriaDi · ogni categoria canonica si riconosce da sé', () => {
  const male = B.ORDINE.filter((id) => B.categoriaDi(id) !== id);
  assert.equal(male.join(','), '', 'queste finivano in «Altri costi»: ' + male.join(','));
});

test('categoriaDi · e gli alias italiani continuano a funzionare', () => {
  assert.equal(B.categoriaDi('macchina'), 'machine');
  assert.equal(B.categoriaDi('manodopera'), 'labor');
  assert.equal(B.categoriaDi('scarto'), 'waste');
  assert.equal(B.categoriaDi('qualcosa che non esiste'), 'other');
});

test('daOrdine · il fabbisogno esce solo dalle righe di materiale', () => {
  const f = F.daOrdine({ id: 1, stage: 'produzione', costBreakdown: conMateriale() });
  assert.equal(f.righe.length, 1);
  assert.equal(f.righe[0].itemKey, 'materials:12');
  assert.equal(f.righe[0].unit, 'mq');
});

test('daOrdine · la quantità dell\'ordine moltiplica quella della distinta', () => {
  const f = F.daOrdine({ id: 1, stage: 'produzione', quantity: 3, costBreakdown: conMateriale() });
  assert.equal(f.righe[0].quantityPerPiece, 2);
  assert.equal(f.righe[0].quantity, 6);
});

test('daOrdine · una riga senza articolo collegato non genera fabbisogno', () => {
  const d = distinta([{ id: 1, name: 'Legno a caso', qty: 2, unitCost: 3,
    subtotal: 6, category: 'material' }]);
  const f = F.daOrdine({ id: 1, costBreakdown: d });
  assert.equal(f.righe.length, 0);
  assert.equal(f.nonCollegate.length, 1);
  assert.match(f.nonCollegate[0].motivo, /nessun articolo/);
  assert.equal(f.disponibile, false);
});

test('daOrdine · senza distinta non si inventa un fabbisogno', () => {
  const f = F.daOrdine({ id: 9, stage: 'produzione' });
  assert.equal(f.righe.length, 0);
  assert.match(f.motivo, /distinta/);
});

test('impegnato · somma solo gli ordini aperti', () => {
  const d = conMateriale();
  const i = F.impegnato([
    { id: 1, stage: 'produzione', costBreakdown: d },
    { id: 2, stage: 'consegnato', costBreakdown: d },
    { id: 3, stage: 'venduto', costBreakdown: d },
  ]);
  assert.equal(i.ordiniContati, 1);
  assert.equal(i.righe[0].quantita, 2);
});

test('impegnato · non tocca la giacenza, e lo dichiara', () => {
  const i = F.impegnato([{ id: 1, stage: 'produzione', costBreakdown: conMateriale() }]);
  assert.equal(i.toccaLaGiacenza, false);
});

test('impegnato · un ordine col routing tutto chiuso non impegna più', () => {
  const d = conMateriale();
  const i = F.impegnato([{ id: 1, stage: 'produzione', costBreakdown: d,
    production: { operations: [{ technology: 'laser', status: 'completata' }] } }]);
  assert.equal(i.ordiniContati, 0);
});

test('impegnato · ma uno col routing ancora aperto sì', () => {
  const d = conMateriale();
  const i = F.impegnato([{ id: 1, stage: 'produzione', costBreakdown: d,
    production: { operations: [
      { technology: 'laser', status: 'completata' },
      { technology: 'uv', status: 'in_produzione' }] } }]);
  assert.equal(i.ordiniContati, 1);
});

test('impegnato · due ordini sullo stesso articolo sommano', () => {
  const d = conMateriale();
  const i = F.impegnato([
    { id: 1, stage: 'produzione', costBreakdown: d },
    { id: 2, stage: 'confermato', quantity: 2, costBreakdown: d }]);
  assert.equal(i.righe[0].quantita, 6, '2 + 4');
  assert.equal(i.righe[0].ordini.join('|'), '1|2');
});

test('disponibile · giacenza meno impegnato', () => {
  const i = F.impegnato([{ id: 1, stage: 'produzione', costBreakdown: conMateriale() }]);
  const d = F.disponibile('materials:12', 10, i.righe);
  assert.equal(d.giacenza, 10);
  assert.equal(d.impegnato, 2);
  assert.equal(d.disponibile, 8);
  assert.equal(d.scoperto, false);
});

test('disponibile · sotto zero è uno scoperto, non un errore di conto', () => {
  const i = F.impegnato([{ id: 1, stage: 'produzione', quantity: 10, costBreakdown: conMateriale() }]);
  const d = F.disponibile('materials:12', 5, i.righe);
  assert.equal(d.disponibile, -15);
  assert.equal(d.scoperto, true);
});

test('disponibile · senza giacenza nota non si inventa un disponibile', () => {
  const d = F.disponibile('materials:12', null, []);
  assert.equal(d.noto, false);
  assert.equal(d.disponibile, null);
});

test('quadro · consumato e scarto vengono dal registro, e sono separati', () => {
  const q = F.quadro('materials:12', {
    giacenza: 10, impegnate: [{ itemKey: 'materials:12', quantita: 2 }],
    movimenti: [
      { itemKey: 'materials:12', type: 'CONSUMPTION', quantity: 3 },
      { itemKey: 'materials:12', type: 'WASTE', quantity: 0.5 },
      { itemKey: 'materials:99', type: 'CONSUMPTION', quantity: 99 }],
  });
  assert.equal(q.consumato, 3);
  assert.equal(q.scarto, 0.5, 'lo scarto non si somma al consumo');
  assert.equal(q.impegnato, 2);
  assert.equal(q.disponibile, 8);
});

test('quadro · nessun movimento non è «zero consumato»', () => {
  const q = F.quadro('materials:12', { giacenza: 10, impegnate: [], movimenti: [] });
  assert.equal(q.consumato, null);
  assert.equal(q.scarto, null);
  assert.equal(q.registrato, false);
});

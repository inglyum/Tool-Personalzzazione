/**
 * bom-cost.test.mjs — il costo aggregato di una distinta multi-tecnologia.
 *
 * `InglyBOMCost` non ricalcola `InglyCostEngine`: somma il tempo di ogni
 * operazione della distinta (avviamento una tantum, tempo per pezzo) alla
 * tariffa oraria della sua macchina — o della manodopera di ripiego — e il
 * costo dei materiali alla quantità dell'ordine. Questi test verificano
 * l'anatomia una-tantum/per-pezzo (mai un avviamento moltiplicato per la
 * quantità), la disciplina N/D (nessuna tariffa nota → nessun numero
 * inventato) e che due tecnologie sullo stesso ordine si sommino senza
 * doppiare niente.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, Date });
vm.runInContext(fs.readFileSync('src/product/production-model.js', 'utf8'), contesto);
vm.runInContext(fs.readFileSync('src/product/operations-model.js', 'utf8'), contesto);
vm.runInContext(fs.readFileSync('src/product/product-bom.js', 'utf8'), contesto);
vm.runInContext(fs.readFileSync('src/product/bom-cost.js', 'utf8'), contesto);
const B = contesto.InglyProductBOM;
const C = contesto.InglyBOMCost;

function bomMultiTech() {
  return B.crea({
    productId: 'orologio-1',
    righe: [
      { type: 'materiale', itemKey: 'materials:5', quantity: 1, unit: 'pz', label: 'Legno di noce' },
      { type: 'operazione', technology: 'laser', machineId: 'm-laser', setupTime: 15, timePerUnit: 3, sequence: 1 },
      { type: 'operazione', technology: 'uv', machineId: 'm-uv', setupTime: 6, timePerUnit: 1.5, sequence: 2 },
    ],
  });
}

test('costoOperazioni: tempo in minuti convertito in ore, alla tariffa della sua macchina', () => {
  const bom = bomMultiTech();
  const voci = C.costoOperazioni(bom, { tariffeMacchina: { 'm-laser': 20, 'm-uv': 12 } });
  assert.equal(voci.length, 2);
  const laser = voci.find((v) => v.technology === 'laser');
  // 15 min = 0.25h × 20€/h = 5; 3 min = 0.05h × 20€/h = 1
  assert.equal(laser.unaTantum, 5);
  assert.equal(laser.perPezzo, 1);
  assert.equal(laser.fonte, 'macchina');
});

test('anatomia una-tantum/per-pezzo: l\'avviamento non si moltiplica per la quantità', () => {
  const bom = bomMultiTech();
  const opzioni = { tariffeMacchina: { 'm-laser': 20, 'm-uv': 12 }, costiMateriali: { 'materials:5': 3 } };
  const a1 = C.espandi(bom, 1, opzioni);
  const a100 = C.espandi(bom, 100, opzioni);
  // una tantum totale (avviamento) è identico indipendentemente dalla quantità
  assert.equal(a1.unaTantum, a100.unaTantum);
  // il costo per pezzo cala all'aumentare della quantità (l'avviamento si spalma)
  assert.ok(a100.costoPerPezzo < a1.costoPerPezzo);
});

test('senza tariffa macchina, ricade sulla manodopera di ripiego', () => {
  const bom = bomMultiTech();
  const voci = C.costoOperazioni(bom, { manodoperaOraria: 18 });
  voci.forEach((v) => {
    assert.equal(v.fonte, 'manodopera');
    assert.equal(v.tariffaOraria, 18);
  });
});

test('nessuna tariffa nota: la voce resta senza costo, mai un numero inventato', () => {
  const bom = bomMultiTech();
  const voci = C.costoOperazioni(bom, {});
  voci.forEach((v) => {
    assert.equal(v.fonte, null);
    assert.equal(v.unaTantum, null);
    assert.equal(v.perPezzo, null);
    assert.ok(v.motivo);
  });
});

test('costoMateriali: costo unitario noto → perPezzo valorizzato', () => {
  const bom = bomMultiTech();
  const voci = C.costoMateriali(bom, 10, { costiMateriali: { 'materials:5': 4 } });
  assert.equal(voci.length, 1);
  assert.equal(voci[0].unitCost, 4);
  assert.equal(voci[0].perPezzo, voci[0].quantityPerPiece * 4);
});

test('costoMateriali: costo unitario ignoto → nessun perPezzo, motivo dichiarato', () => {
  const bom = bomMultiTech();
  const voci = C.costoMateriali(bom, 10, {});
  assert.equal(voci[0].perPezzo, null);
  assert.ok(voci[0].motivo);
});

test('espandi: due tecnologie si sommano senza doppiare, completo quando tutto è valorizzato', () => {
  const bom = bomMultiTech();
  const r = C.espandi(bom, 20, {
    tariffeMacchina: { 'm-laser': 20, 'm-uv': 12 },
    costiMateriali: { 'materials:5': 3 },
  });
  assert.equal(r.completo, true);
  assert.equal(r.voci.length, 3); // 2 operazioni + 1 materiale
  assert.equal(r.tecnologie.slice().sort().join(','), 'laser,uv');
  // unaTantum = 5 (laser) + 1.2 (uv: 6min=0.1h×12) = 6.2
  assert.equal(r.unaTantum, 6.2);
});

test('espandi: una voce senza costo rende il totale parziale, mai silenzioso', () => {
  const bom = bomMultiTech();
  const r = C.espandi(bom, 20, { tariffeMacchina: { 'm-laser': 20 } }); // manca uv e il materiale
  assert.equal(r.completo, false);
  assert.equal(r.nonValorizzate.length, 2);
  assert.ok(r.motivo);
});

test('espandi: non calcola overhead, imballo o spedizione — restano fuori', () => {
  const bom = bomMultiTech();
  const r = C.espandi(bom, 20, { tariffeMacchina: { 'm-laser': 20, 'm-uv': 12 }, costiMateriali: { 'materials:5': 3 } });
  assert.ok(!('overhead' in r));
  assert.ok(!('packaging' in r));
  assert.ok(!('spedizione' in r));
});

test('protezione doppio conteggio: chiamare espandi due volte non accumula nulla (idempotente)', () => {
  const bom = bomMultiTech();
  const opzioni = { tariffeMacchina: { 'm-laser': 20, 'm-uv': 12 }, costiMateriali: { 'materials:5': 3 } };
  const r1 = C.espandi(bom, 20, opzioni);
  const r2 = C.espandi(bom, 20, opzioni);
  assert.equal(r1.unaTantum, r2.unaTantum);
  assert.equal(r1.perPezzo, r2.perPezzo);
  assert.equal(r1.costoPerPezzo, r2.costoPerPezzo);
});

test('protezione doppio conteggio: ogni riga della distinta genera una voce sola, mai una per ogni lettura', () => {
  const bom = bomMultiTech();
  const opzioni = { tariffeMacchina: { 'm-laser': 20, 'm-uv': 12 }, costiMateriali: { 'materials:5': 3 } };
  const r = C.espandi(bom, 20, opzioni);
  // 2 righe operazione + 1 riga materiale nella distinta = 3 voci, non di più
  assert.equal(r.voci.length, 3);
  // il materiale non contribuisce mai a unaTantum: un avviamento non si nasconde in una riga materiale
  const vociMateriale = r.voci.filter((v) => v.category === 'material');
  vociMateriale.forEach((v) => assert.equal(v.unaTantum, null));
});

test('protezione doppio conteggio: due operazioni sulla stessa macchina non ne sommano la tariffa due volte per errore', () => {
  const bom = B.crea({
    productId: 'p-stessa-macchina',
    righe: [
      { type: 'operazione', technology: 'laser', machineId: 'm-x', setupTime: 10, timePerUnit: 1, sequence: 1 },
      { type: 'operazione', technology: 'laser', machineId: 'm-x', setupTime: 5, timePerUnit: 0.5, sequence: 2 },
    ],
  });
  const voci = C.costoOperazioni(bom, { tariffeMacchina: { 'm-x': 24 } });
  // la tariffa oraria è la stessa (24) su entrambe le righe, ma il tempo — e quindi il
  // costo — resta quello dichiarato da ciascuna riga: non si somma una tariffa già
  // applicata alla riga precedente.
  assert.equal(voci[0].tariffaOraria, 24);
  assert.equal(voci[1].tariffaOraria, 24);
  assert.equal(voci[0].unaTantum, 4); // 10min=1/6h × 24 = 4
  assert.equal(voci[1].unaTantum, 2); // 5min=1/12h × 24 = 2
});

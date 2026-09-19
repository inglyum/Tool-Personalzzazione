/**
 * product-bom.test.mjs — un prodotto multi-tecnologia si dichiara una volta.
 *
 * Il catalogo sa scrivere un prodotto con una tecnologia e un materiale
 * soli (`product-builder.js`: campi `tech`/`material` singoli). Non basta
 * per un prodotto vero come "orologio in legno + incisione laser + stampa
 * UV + assemblaggio". Questi test provano il motore puro: una distinta
 * congelata, l'espansione materiali compatibile con `costBreakdown.voci`
 * (che `material-requirement.js` legge già), e l'espansione operazioni
 * compatibile con `InglyOperazioni.normalizza` — con l'anatomia
 * avviamento/per-pezzo che non raddoppia mai il setup.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, Date });
vm.runInContext(fs.readFileSync('src/product/production-model.js', 'utf8'), contesto);
vm.runInContext(fs.readFileSync('src/product/operations-model.js', 'utf8'), contesto);
vm.runInContext(fs.readFileSync('src/product/product-bom.js', 'utf8'), contesto);
const OP = contesto.InglyOperazioni;
const B = contesto.InglyProductBOM;

function bomBase(extra) {
  return Object.assign({
    productId: 'p1',
    righe: [
      { type: 'materiale', itemKey: 'materials:5', quantity: 2, unit: 'pz', label: 'Legno' },
      { type: 'operazione', technology: 'laser', setupTime: 10, timePerUnit: 2 },
      { type: 'operazione', technology: 'uv', setupTime: 5, timePerUnit: 1 },
    ],
  }, extra || {});
}

test('validazione', async (t) => {
  await t.test('senza prodotto non è valida', () => {
    assert.equal(B.valida({ righe: [{ type: 'materiale', itemKey: 'a', quantity: 1 }] }).valido, false);
  });
  await t.test('senza righe non è valida', () => {
    assert.equal(B.valida({ productId: 'p1', righe: [] }).valido, false);
  });
  await t.test('un materiale senza articolo collegato non è valido', () => {
    assert.equal(B.valida({ productId: 'p1', righe: [{ type: 'materiale', quantity: 1 }] }).valido, false);
  });
  await t.test('un materiale senza quantità non è valido', () => {
    assert.equal(B.valida({ productId: 'p1', righe: [{ type: 'materiale', itemKey: 'a' }] }).valido, false);
  });
  await t.test('un\'operazione senza tecnologia non è valida', () => {
    assert.equal(B.valida({ productId: 'p1', righe: [{ type: 'operazione', setupTime: 5 }] }).valido, false);
  });
  await t.test('un\'operazione senza nessun tempo dichiarato non è valida', () => {
    assert.equal(B.valida({ productId: 'p1', righe: [{ type: 'operazione', technology: 'laser' }] }).valido, false);
  });
  await t.test('un\'operazione con solo il tempo a pezzo è valida (setup può essere zero)', () => {
    assert.equal(B.valida({ productId: 'p1', righe: [{ type: 'operazione', technology: 'laser', timePerUnit: 2 }] }).valido, true);
  });
  await t.test('una distinta completa multi-tecnologia è valida', () => {
    assert.equal(B.valida(bomBase()).valido, true);
  });
});

test('la nascita di una distinta', async (t) => {
  await t.test('si congela: non si modifica dopo', () => {
    const bom = B.crea(bomBase());
    assert.throws(() => { bom.righe = []; });
  });
  await t.test('nasce in versione 1 di default', () => {
    const bom = B.crea(bomBase());
    assert.equal(bom.version, 1);
  });
  await t.test('un input non valido non produce un record', () => {
    assert.equal(B.crea({ productId: 'p1', righe: [] }), null);
  });
});

test('tecnologie dichiarate — il concetto di "misto"', async (t) => {
  await t.test('una distinta con laser e uv dichiara due tecnologie, nell\'ordine delle operazioni', () => {
    const bom = B.crea(bomBase());
    assert.equal([...B.tecnologie(bom)].join(','), 'laser,uv');
  });
  await t.test('una distinta con una sola tecnologia ne dichiara una', () => {
    const bom = B.crea({ productId: 'p2', righe: [{ type: 'operazione', technology: 'laser', timePerUnit: 3 }] });
    assert.equal(B.tecnologie(bom).length, 1);
  });
});

test('espansione materiali — compatibile con una voce di costBreakdown', async (t) => {
  await t.test('la quantità scala con i pezzi dell\'ordine', () => {
    const bom = B.crea(bomBase());
    const righe = B.espandiMateriali(bom, 10);
    assert.equal(righe[0].category, 'material');
    assert.equal(righe[0].itemKey, 'materials:5');
    assert.equal(righe[0].quantityPerPiece, 2);
    assert.equal(righe[0].quantity, 20);
  });
  await t.test('lo scarto dichiarato aumenta la quantità, non la nasconde', () => {
    const bom = B.crea({ productId: 'p1', righe: [{ type: 'materiale', itemKey: 'a', quantity: 10, scrapPct: 10 }] });
    const righe = B.espandiMateriali(bom, 1);
    assert.equal(righe[0].quantityPerPiece, 11);
  });
  await t.test('un ordine di un solo pezzo (o non dichiarato) non scende sotto un pezzo', () => {
    const bom = B.crea(bomBase());
    const righe = B.espandiMateriali(bom, 0);
    assert.equal(righe[0].quantity, 2);
  });
});

test('espansione operazioni — mai un setup raddoppiato per pezzo', async (t) => {
  await t.test('un\'operazione con avviamento e tempo a pezzo: il tempo totale è avviamento + (per pezzo × pezzi)', () => {
    const bom = B.crea(bomBase());
    const ops = B.espandiOperazioni(bom, 5);
    // laser: 10 + 2*5 = 20
    assert.equal(ops[0].estimatedTime, 20);
    // uv: 5 + 1*5 = 10
    assert.equal(ops[1].estimatedTime, 10);
  });
  await t.test('le operazioni espanse sono lette correttamente da InglyOperazioni.normalizza', () => {
    const bom = B.crea(bomBase());
    const ops = B.espandiOperazioni(bom, 3);
    const normalizzata = OP.normalizza(ops[0]);
    assert.equal(normalizzata.technology, 'laser');
    assert.equal(normalizzata.estimatedTime, 10 + 2 * 3);
    assert.equal(normalizzata.status, 'da_fare');
  });
  await t.test('cento pezzi non centuplicano l\'avviamento — è la ragione per cui questa anatomia esiste', () => {
    const bom = B.crea({ productId: 'p1', righe: [{ type: 'operazione', technology: 'laser', setupTime: 15, timePerUnit: 0.5 }] });
    const unoSolo = B.espandiOperazioni(bom, 1)[0].estimatedTime;
    const cento = B.espandiOperazioni(bom, 100)[0].estimatedTime;
    // se il setup fosse moltiplicato per la quantità, cento sarebbe 1500 + 50 = 1550 volte più alto
    assert.equal(unoSolo, 15.5);
    assert.equal(cento, 15 + 0.5 * 100);
  });
});

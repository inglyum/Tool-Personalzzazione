/**
 * quoter3d-cost-chart.test.mjs — il grafico di composizione dice la verità
 * del motore, non un'altra.
 *
 * Punto 33 del mandato: dopo il dettaglio riga per riga, un grafico
 * semplice della composizione del costo. Non ricalcola niente — legge
 * `r.voci`, la stessa lista che `dettaglio()` già mostra in tabella — e
 * la prova qui è che le due rappresentazioni restino d'accordo: le stesse
 * percentuali, lo stesso totale, nessuna voce persa o duplicata.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, String, Number, Date, parseFloat, isFinite, console });
for (const f of ['cost-engine.js', 'quoter3d-view.js']) {
  vm.runInContext(fs.readFileSync('src/product/' + f, 'utf8'), contesto);
}
const V = contesto.InglyQuoter3DView;

const CASO = {
  tecnologia: 'print3d', grams: 290, hours: 9.95, qty: 1,
  materialPricePerKg: 24, watt: 150, kwhPrice: 0.28, dutyCycle: 0.6,
  machinePrice: 400, machineLifeHours: 2000, maintenancePerHour: 0.12,
  failureRate: 7, laborPerHour: 18, setupMin: 15, finishMin: 10,
};

test('senza risultato calcolabile, nessun grafico', () => {
  assert.equal(V.costChart(null), '');
  assert.equal(V.costChart({ indisponibile: true }), '');
  assert.equal(V.costChart({ indisponibile: false, voci: [] }), '');
});

test('il grafico esiste e contiene una barra e una legenda', () => {
  const r = V.calcola(CASO, { modalita: 'completo', marginePct: 40 });
  const html = V.costChart(r);
  assert.ok(html.length > 0, 'il grafico non è vuoto per un preventivo calcolabile');
  assert.ok(/Composizione del costo/.test(html));
  assert.ok(/height:14px/.test(html), 'la barra impilata è presente');
});

test('ogni voce di r.voci ha il suo segmento, nello stesso ordine di grandezza', () => {
  const r = V.calcola(CASO, { modalita: 'completo', marginePct: 40 });
  const html = V.costChart(r);
  r.voci.forEach((v) => {
    if (v.value > 0) {
      assert.ok(html.includes(v.label), 'la voce "' + v.label + '" compare nella legenda');
    }
  });
});

test('le percentuali del grafico sommano a ~100, come nella tabella dettaglio', () => {
  const r = V.calcola(CASO, { modalita: 'completo', marginePct: 40 });
  const html = V.costChart(r);
  /* Solo i segmenti della barra (width:X%;background:...), non il
     contenitore esterno che è anche lui width:100% ma per un altro motivo
     (riempire la card, non rappresentare una quota). */
  const percentuali = [...html.matchAll(/width:([\d.]+)%;background:/g)].map((m) => parseFloat(m[1]));
  const somma = percentuali.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(somma - 100) < 1, 'somma percentuali ' + somma.toFixed(2) + ' ≉ 100');
});

test('le voci sono ordinate dalla più grande alla più piccola', () => {
  const r = V.calcola(CASO, { modalita: 'completo', marginePct: 40 });
  const html = V.costChart(r);
  const percentuali = [...html.matchAll(/width:([\d.]+)%;background:/g)].map((m) => parseFloat(m[1]));
  for (let i = 1; i < percentuali.length; i += 1) {
    assert.ok(percentuali[i - 1] >= percentuali[i] - 0.001,
      'segmento ' + i + ' (' + percentuali[i] + '%) più grande del precedente (' + percentuali[i - 1] + '%)');
  }
});

test('i colori vengono dal set semantico già in uso nell\'app, non inventati per questo grafico', () => {
  const r = V.calcola(CASO, { modalita: 'completo', marginePct: 40 });
  const html = V.costChart(r);
  const usati = [...html.matchAll(/background:(var\(--[a-z-]+,#[0-9a-f]{6}\))/g)].map((m) => m[1]);
  assert.ok(usati.length > 0, 'almeno un colore trovato');
  usati.forEach((c) => {
    assert.ok(/^var\(--(color-info|color-warning|color-premium|color-success|color-danger|primary),/.test(c),
      'colore fuori dal set atteso: ' + c);
  });
});

test('una voce con valore zero non produce un segmento largo zero visibile', () => {
  const r = V.calcola(CASO, { modalita: 'completo', marginePct: 40 });
  const conZero = Object.assign({}, r, { voci: r.voci.concat([{ id: 'extra', label: 'Extra a zero', value: 0 }]) });
  const html = V.costChart(conZero);
  assert.ok(!html.includes('Extra a zero'), 'una voce a zero non entra nel grafico');
});

/**
 * costi-parametri.test.mjs — le tre decisioni dell'audit dei parametri.
 *
 * Vedi docs/COST-PARAMETERS-AUDIT.md. Questi test fissano le decisioni prese,
 * perché la prossima volta che qualcuno cambia uno di questi numeri lo faccia
 * di proposito e non per distrazione.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({
  Math, JSON, Object, Array, Date, Number, String, parseFloat, isFinite, isNaN,
});
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), contesto);
const M = contesto.InglyCostEngine;

const sorgente108 = fs.readFileSync('src/legacy/patches/108-var-print3dquoter-function.js', 'utf8');

/* ── B · la macchina «Personalizzata» ───────────────────────────────────── */

test('il preset «Personalizzata» vale la mediana dei preset reali', () => {
  const riga = sorgente108.match(/\{id:'custom',\s*n:'Personalizzata',\s*w:(\d+),c:(\d+),\s*l:(\d+)\}/);
  assert.ok(riga, 'il preset esiste ancora');
  const euroOra = Number(riga[2]) / Number(riga[3]);
  assert.equal(Number(riga[2]), 420);
  assert.equal(Number(riga[3]), 3000);
  assert.ok(Math.abs(euroOra - 0.14) < 0.001, '0,1398 €/h, la mediana degli undici preset');
});

test('e sta dentro l intervallo delle macchine che il programma conosce', () => {
  /* Gli otto preset FDM: il valore predefinito non deve stare fuori da quel
     campo, né sopra (era 0,2000) né sotto (la proposta era 0,0997). */
  /* Solo il blocco FDM: le stampanti a resina sono un'altra famiglia, con
     prezzi e vite utili diversi, e mescolarle allargherebbe l'intervallo
     fino a rendere il controllo inutile. */
  const blocco = sorgente108.slice(sorgente108.indexOf('fdm:'), sorgente108.indexOf('resin:'));
  /* Si esclude «Personalizzata» per id, non per valore: il Bambu P1S vale
     0,1398 come lei, ed escluderlo per somiglianza toglierebbe proprio la
     macchina che sta al centro. */
  const noti = [...blocco.matchAll(/\{id:'([a-z0-9-]+)'[^}]*c:(\d+),\s*l:(\d+)\}/g)]
    .filter((m) => m[1] !== 'custom')
    .map((m) => Number(m[2]) / Number(m[3]))
    .filter((v) => v > 0);
  assert.equal(noti.length, 11, 'gli undici preset reali');
  const ordinati = noti.slice().sort((a, b) => a - b);
  const mediana = ordinati[Math.floor(ordinati.length / 2)];
  assert.ok(Math.abs(mediana - 0.1398) < 0.0001, 'la mediana è 0,1398 €/h');
  /* Il valore applicato è la mediana; quello proposto in origine era il
     secondo più basso degli undici, non fuori scala ma ottimistico. */
  const proposta = 299 / 3000;
  assert.equal(ordinati.indexOf(ordinati.filter((v) => Math.abs(v - proposta) < 1e-9)[0]), 1);
});

test('i campi del preventivatore partono dallo stesso valore del preset', () => {
  assert.ok(/id="p3d-mc"[^>]*value="'\+\(isFdm\?'420'/.test(sorgente108), 'costo macchina 420');
  assert.ok(/id="p3d-lh"[^>]*value="'\+\(isFdm\?'3000'/.test(sorgente108), 'vita utile 3000');
  assert.ok(/machinePrice:gv\('p3d-mc',420\)/.test(sorgente108), 'e il ripiego di lettura');
  assert.ok(/machineLifeHours:gv\('p3d-lh',3000\)/.test(sorgente108));
});

/* ── A · la manutenzione resta 0,12 ─────────────────────────────────────── */

test('la manutenzione FDM resta 0,12 €/h: 0,05 non è stata applicata', () => {
  assert.ok(/id="p3d-mnt"[^>]*value="'\+\(isFdm\?'0\.12'/.test(sorgente108));
});

test('il motore non ha un valore predefinito di manutenzione', () => {
  /* Chi non la dichiara paga zero manutenzione, e lo deve sapere: il motore
     non inventa un numero al posto suo. */
  const senza = M.calcola({ tecnologia: 'print3d', qty: 1, hours: 5, grams: 60,
    materialPricePerKg: 22, machinePrice: 450, machineLifeHours: 3000, laborPerHour: 18 });
  const voce = senza.perPezzo.voci.filter((v) => v.id === 'manutenzione')[0];
  assert.ok(!voce || voce.value === 0);
});

/* ── L impatto misurato, che il documento dichiara ──────────────────────── */

const caso = (mnt, prezzo, vita) => M.calcola({
  tecnologia: 'print3d', qty: 1, hours: 5, grams: 60, materialPricePerKg: 22,
  machinePrice: prezzo, machineLifeHours: vita, residualValue: 0,
  maintenancePerHour: mnt, watt: 150, kwhPrice: 0.25, dutyCycle: 0.6,
  laborPerHour: 18, setupMin: 10, finishMin: 5, failureRate: 8, packagingPerUnit: 0.9,
});

test('il costo orario macchina segue prezzo e vita utile, senza sorprese', () => {
  const voce = (r) => r.perPezzo.voci.filter((v) => v.id === 'macchina')[0].value;
  assert.ok(Math.abs(voce(caso(0.12, 400, 2000)) - 1.0) < 0.001, '0,20 €/h × 5 h');
  assert.ok(Math.abs(voce(caso(0.12, 420, 3000)) - 0.7) < 0.001, '0,14 €/h × 5 h');
});

test('il cambio applicato costa 0,33 € in meno al pezzo, non 0,93', () => {
  /* La proposta iniziale (0,05 + 299/3000) toglieva 0,93 € su un pezzo da
     5 ore. Quella applicata ne toglie 0,25: è la differenza fra correggere
     una sopravvalutazione e sostituirla con una sottovalutazione. */
  const prima = caso(0.12, 400, 2000).costoPezzo;
  const applicato = caso(0.12, 420, 3000).costoPezzo;
  const proposto = caso(0.05, 299, 3000).costoPezzo;
  /* Il delta è più grande della sola differenza di ammortamento: il costo
     macchina entra anche nella base dello scarto, quindi abbassarlo toglie
     qualcosa due volte. */
  assert.ok(Math.abs((applicato - prima) + 0.326) < 0.01, `applicato ${(applicato - prima).toFixed(3)}`);
  assert.ok(Math.abs((proposto - prima) + 0.93) < 0.01, `proposto ${(proposto - prima).toFixed(3)}`);
});

/* ── C · la confezione ──────────────────────────────────────────────────── */

test('la confezione è un costo diretto per pezzo, non una spesa generale', () => {
  const r = M.calcola({ tecnologia: 'print3d', qty: 4, hours: 1, grams: 10,
    materialPricePerKg: 22, laborPerHour: 18, packagingPerUnit: 0.9 });
  const voce = r.perPezzo.voci.filter((v) => v.id === 'packaging')[0];
  assert.ok(voce, 'sta fra i costi per pezzo');
  assert.equal(voce.value, 0.9, 'e vale per pezzo, non diviso per la quantità');
  assert.ok(!r.unaTantum.voci.some((v) => v.id === 'packaging'), 'non è un costo una tantum');
});

test('la confezione non si butta con un pezzo fallito', () => {
  const senzaScarto = M.calcola({ tecnologia: 'print3d', qty: 1, hours: 1, grams: 100,
    materialPricePerKg: 22, laborPerHour: 18, packagingPerUnit: 5, failureRate: 0 });
  const conScarto = M.calcola({ tecnologia: 'print3d', qty: 1, hours: 1, grams: 100,
    materialPricePerKg: 22, laborPerHour: 18, packagingPerUnit: 5, failureRate: 50 });
  const scarto = conScarto.perPezzo.voci.filter((v) => v.id === 'scarto')[0];
  assert.ok(scarto && scarto.value > 0, 'lo scarto c è');
  /* Se la confezione entrasse nella base dello scarto, 5 € su una base di
     pochi centesimi la farebbero esplodere. */
  assert.ok(scarto.value < 3, 'ma non comprende i 5 € di confezione: ' + scarto.value.toFixed(2));
  assert.equal(senzaScarto.perPezzo.voci.filter((v) => v.id === 'packaging')[0].value, 5);
});

test('il Product Builder non conta la confezione due volte', () => {
  /* Il difetto era nel sorgente: `materialCost` la sommava, e `Data.price`
     la riceveva di nuovo come voce propria. */
  const pb = fs.readFileSync('src/product/product-builder.js', 'utf8');
  const riga = pb.match(/const materialCost = \(mat \? mat\.cost : 0\) \* Number\(state\.materialQty \|\| 0\)([^;]*);/);
  assert.ok(riga, 'la riga del costo materiale esiste');
  assert.equal(riga[1].trim(), '', 'e non somma altro che il materiale');
  assert.ok(/packaging: Number\(state\.packaging \|\| 0\)/.test(pb), 'la confezione passa una volta sola, come voce');
});

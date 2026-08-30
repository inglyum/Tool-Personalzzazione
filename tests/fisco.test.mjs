/**
 * fisco.test.mjs — l'aliquota IVA in un posto solo.
 *
 * Il difetto misurato in Fase 1: il 22% compare come letterale in dieci file,
 * ventuno volte. I ventuno valori coincidono, quindi non è un difetto di
 * calcolo — è un difetto di **possibilità**: chi vende al 10% o al 4% non ha
 * modo di dirlo, e una modifica di legge richiederebbe ventuno correzioni
 * coordinate con la certezza che una sfugga.
 *
 * Il campo esisteva già in Impostazioni e non lo leggeva quasi nessuno.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({ Math, JSON, Object, Array, parseFloat, isFinite, String, Date });
ctx.window = ctx; ctx.globalThis = ctx;
vm.runInContext(fs.readFileSync('src/product/fisco.js', 'utf8'), ctx);
const F = ctx.InglyFisco;
const vicino = (a, b, t = 0.0001) => Math.abs(a - b) < t;

test('il predefinito è 22, perché nessun preventivo esistente deve muoversi', () => {
  assert.equal(F.PREDEFINITA, 22);
  assert.equal(F.aliquota(), 22);
});

test("lo scorporo divide per 1 + aliquota, non toglie l'aliquota", () => {
  /* Togliere il 22% da 122 dà 95,16, non 100: su un anno di fatture la
     differenza si vede. */
  assert.ok(vicino(F.scorpora(122), 100), `€${F.scorpora(122)}`);
  assert.ok(Math.abs(F.scorpora(122) - 122 * 0.78) > 4, 'lo scorporo non è una sottrazione');
});

test('applica e scorpora sono l\'una l\'inversa dell\'altra', () => {
  for (const n of [1, 19.99, 100, 1234.56]) {
    assert.ok(vicino(F.scorpora(F.applica(n)), n, 0.0001), `€${n}`);
  }
});

test('ripartisci dà netto, imposta e lordo che chiudono', () => {
  const r = F.ripartisci(100);
  assert.ok(vicino(r.netto + r.imposta, r.lordo));
  assert.ok(vicino(r.imposta, 22));
  assert.equal(r.aliquota, 22);
});

test('cambiare aliquota cambia tutti i conti che ne dipendono', () => {
  F.imposta(10);
  assert.equal(F.aliquota(), 10);
  assert.ok(vicino(F.applica(100), 110));
  assert.ok(vicino(F.scorpora(110), 100));
  assert.equal(F.etichetta(), 'IVA 10%');
  F.imposta(22);
});

test('lo zero è un\'aliquota legittima e resta zero', () => {
  /* Non imponibile non è «manca il dato»: è una condizione fiscale vera, e
     confonderla con un errore riporterebbe silenziosamente al 22%. */
  F.imposta(0);
  assert.equal(F.aliquota(), 0);
  assert.ok(vicino(F.applica(100), 100));
  assert.equal(F.etichetta(), 'Non imponibile');
  F.imposta(22);
});

test('un\'aliquota impossibile torna al predefinito, non a zero', () => {
  for (const v of [-5, 150, NaN, 'ciao', null, undefined]) {
    assert.equal(F.valida(v), 22, `${v} dovrebbe tornare al predefinito`);
  }
});

test('un\'aliquota puntuale non altera quella configurata', () => {
  /* Una riga esente in un documento al 22% è normale: si passa l'aliquota
     alla singola chiamata e il resto del documento non cambia. */
  assert.ok(vicino(F.applica(100, 4), 104));
  assert.equal(F.aliquota(), 22, 'la configurazione non si sposta');
});

test('le aliquote italiane sono elencate, e non sono un elenco chiuso', () => {
  const pct = F.ALIQUOTE.map((a) => a.pct);
  assert.equal(pct.join(','), '22,10,5,4,0');
  /* Chi ne ha bisogno di un'altra la scrive e il modulo la accetta. */
  assert.equal(F.valida(7.7), 7.7);
});

test("l'IVA non entra mai in un costo: il modulo non calcola costi", () => {
  /* La superficie pubblica non espone nessuna funzione che produca un costo:
     è il modo strutturale di impedire che l'IVA finisca dove non deve. */
  const nomi = Object.keys(F);
  assert.ok(!nomi.some((n) => /cost|costo/i.test(n)), nomi.join(','));
});

test('lo stato dichiara se l\'impostazione è stata letta', () => {
  const s = F.stato();
  assert.equal(typeof s.letta, 'boolean');
  assert.equal(typeof s.aliquota, 'number');
});

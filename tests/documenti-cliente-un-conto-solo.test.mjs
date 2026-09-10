/**
 * documenti-cliente-un-conto-solo.test.mjs — quello che il cliente riceve
 * riporta il numero che l'utente ha approvato.
 *
 * Tre documenti destinati al cliente ricalcolavano il totale per conto loro:
 *
 *   patch 100  il preventivo rapido e la sua mail. `net * 1.22`, con
 *              l'aliquota scritta a mano in due punti, e il corpo del
 *              messaggio che dichiarava «IVA 22% inclusa». Chi vende libri al
 *              4% o esporta in esenzione mandava già oggi un documento
 *              sbagliato, e non c'era modo di accorgersene.
 *   patch 050  il PDF. Ricarico e sconto ricalcolati per il totale e una
 *              seconda volta per ogni riga, più l'IVA al 22% scritta a mano.
 *   patch 157  l'anteprima fattura. Lo stesso imponibile dello schermo,
 *              ottenuto per un'altra strada.
 *
 * Tre strade parallele restano uguali finché nessuno tocca una delle tre, e
 * chi la tocca non sa che le altre esistono. Qui si verifica che siano una.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('src/product/cost-engine.js', 'utf8'), sandbox);
const E = sandbox.window.InglyCostEngine;

/** Il codice senza commenti: un commento che nomina una formula non la esegue. */
const codice = (p) => fs.readFileSync(p, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n').map((r) => (/^\s*(\/\/|\*)/.test(r) ? '' : r)).join('\n');

const P100 = 'src/legacy/patches/100-ingly-prox-boost-js-ingly-os-pro-x-boost-layer-v.js';
const P050 = 'src/legacy/patches/050-ingly-os-v10-pdf-template-system.js';
const P157 = 'src/legacy/patches/157-ingly-v84-anteprima-fattura-piano-pagamento-fase.js';

/* ── L'IVA non è più scritta a mano ──────────────────────────────────────── */

test('il preventivo rapido non moltiplica più per 1.22', () => {
  const t = codice(P100);
  assert.ok(!/\*\s*1\.22/.test(t), 'l\'aliquota è ancora scritta nella formula');
  assert.ok(/_aliquotaIva\(\)/.test(t), 'non chiede l\'aliquota al suo proprietario');
  assert.ok(/InglyFisco/.test(t), 'il proprietario dell\'aliquota non viene interrogato');
});

test('e la mail non dichiara più «IVA 22%» a prescindere', () => {
  const t = codice(P100);
  assert.ok(!/IVA 22% inclusa/.test(t),
    'il corpo della mail annuncia un\'aliquota che potrebbe non essere quella applicata');
  assert.ok(/IVA ' \+ aliq \+ '%/.test(t), 'la mail non dichiara l\'aliquota davvero usata');
});

test('il PDF non moltiplica più per 0.22', () => {
  const t = codice(P050);
  assert.ok(!/\*\s*0\.22/.test(t), 'l\'aliquota è ancora scritta nella formula del PDF');
  assert.ok(/_aliquotaPdf\(\)/.test(t));
});

test('e le due aliquote hanno lo stesso ripiego dichiarato', () => {
  /* Due ripieghi diversi sarebbero due documenti diversi lo stesso giorno. */
  for (const f of [P100, P050]) {
    const t = codice(f);
    assert.ok(/return 22;/.test(t), f + ': ripiego non dichiarato');
  }
});

/* ── Ricarico e sconto vengono dal motore ────────────────────────────────── */

test('il PDF non ha più la sua aritmetica di ricarico e sconto', () => {
  const t = codice(P050);
  assert.ok(!/sub\s*\*\s*\(1 \+ markup\)/.test(t), 'il ricarico di riga è ancora scritto qui');
  assert.ok(!/lineBase\s*\*\s*\(1 - discount\)/.test(t), 'lo sconto di riga è ancora scritto qui');
  assert.ok(!/subBase\s*\*\s*\(1 - discount\)/.test(t), 'lo sconto sul totale è ancora scritto qui');
  assert.ok(/MOT\.prezzo\(/.test(t), 'il PDF non chiede il conto al motore');
});

test('e senza motore il PDF non inventa un totale suo', () => {
  /* Un PDF con un totale plausibile e diverso da quello approvato è peggio di
     un PDF che non esce. */
  const t = codice(P050);
  assert.ok(/non è disponibile/.test(t) && /return null/.test(t),
    'il PDF si genererebbe comunque, con numeri di provenienza ignota');
});

test('l\'anteprima fattura non ha più la sua aritmetica', () => {
  const t = codice(P157);
  assert.ok(!/\(1\+st\.markup\)\*\(1-st\.discount\)/.test(t), 'la formula di riga è ancora qui');
  assert.ok(!/\(1\+markup\)\*\(1-discount\)/.test(t), 'la formula del totale è ancora qui');
  assert.ok(/InglyCostEngine/.test(t), 'non interroga il motore');
});

test('e senza motore dichiara zero invece di un numero plausibile', () => {
  const t = codice(P157);
  assert.ok(/netto=0/.test(t), 'senza motore inventerebbe comunque un totale');
});

/* ── I numeri non cambiano: cambia da dove vengono ───────────────────────── */

test('il motore fa lo stesso conto che facevano i tre documenti', () => {
  /* L'ordine conta: ricarico, poi sconto, poi IVA sul netto scontato. Un
     ordine diverso darebbe un totale diverso, e la sostituzione avrebbe
     cambiato i prezzi di nascosto. */
  const imponibile = 100, markupPct = 80, scontoPct = 10, ivaPct = 22;

  const aMano = (() => {
    const base = imponibile * (1 + markupPct / 100);
    const netto = base * (1 - scontoPct / 100);
    const iva = netto * (ivaPct / 100);
    return { netto, iva, lordo: netto + iva };
  })();

  const dalMotore = E.prezzo(imponibile, {
    strategia: 'ricarico', ricarico: 1 + markupPct / 100,
    scontoPct: scontoPct, ivaPct: ivaPct,
  });

  assert.ok(Math.abs(dalMotore.netto - aMano.netto) < 0.0001,
    'netto: ' + dalMotore.netto + ' contro ' + aMano.netto);
  assert.ok(Math.abs(dalMotore.iva - aMano.iva) < 0.0001);
  assert.ok(Math.abs(dalMotore.lordo - aMano.lordo) < 0.0001);
});

test('e non applica un pavimento di margine dove non serve', () => {
  /* Questi tre documenti non decidono un prezzo: mettono su carta uno già
     concordato. Un pavimento qui alzerebbe di nascosto un totale approvato. */
  const r = E.prezzo(100, { strategia: 'ricarico', ricarico: 1.01, ivaPct: 0 });
  assert.ok(Math.abs(r.netto - 101) < 0.0001,
    'il motore ha alzato un prezzo che non doveva toccare: ' + r.netto);
});

test('un\'aliquota diversa cambia davvero il totale', () => {
  const a22 = E.prezzo(100, { strategia: 'ricarico', ricarico: 2, ivaPct: 22 });
  const a04 = E.prezzo(100, { strategia: 'ricarico', ricarico: 2, ivaPct: 4 });
  assert.ok(a22.lordo > a04.lordo, 'l\'aliquota non ha effetto sul totale');
  assert.ok(Math.abs(a04.lordo - 208) < 0.0001, a04.lordo);
});

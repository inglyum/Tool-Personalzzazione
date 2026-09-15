/* Il routing di produzione: forma, scostamenti, e la differenza fra zero e
   non misurato — che è la ragione per cui questo modulo esiste. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const leggi = (f) => fs.readFileSync(new URL('../src/product/' + f, import.meta.url), 'utf8');
const ctx = { console };
ctx.window = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(leggi('production-model.js'), ctx);
vm.runInContext(leggi('operations-model.js'), ctx);
const O = ctx.InglyOperazioni;

test('normalizza · la tecnologia è l\'unico campo che conta davvero', () => {
  const o = O.normalizza({ technology: 'Laser CO2' });
  assert.equal(o.technology, 'laser');
  assert.equal(o.status, 'da_fare');
  assert.equal(o.sequence, 1);
  assert.equal(o.machineId, null);
  assert.equal(o.estimatedTime, null, 'non misurato è null, non zero');
  assert.equal(o.actualCost, null);
});

test('normalizza · un ordine semplice resta semplice', () => {
  const o = O.normalizza({ technology: 'laser' });
  const nulli = Object.entries(o).filter(([, v]) => v === null).map(([k]) => k);
  assert.ok(nulli.length >= 8, 'quasi tutto resta vuoto: ' + nulli.join(','));
});

test('normalizza · accetta i nomi italiani e inglesi', () => {
  const o = O.normalizza({ tecnologia: 'uv', tempoPrevisto: 12, tempoReale: 15,
    macchinaId: 'uvp', stato: 'completata' });
  assert.equal(o.technology, 'uv');
  assert.equal(o.estimatedTime, 12);
  assert.equal(o.actualTime, 15);
  assert.equal(o.machineId, 'uvp');
  assert.equal(o.status, 'completata');
});

test('statoDi · ogni nome che l\'applicazione ha usato arriva allo stato di oggi', () => {
  assert.equal(O.statoDi('done'), 'completata');
  assert.equal(O.statoDi('in progress'), 'in_produzione');
  assert.equal(O.statoDi('cancelled'), 'annullata');
  assert.equal(O.statoDi(undefined), 'da_fare');
  assert.equal(O.statoDi('qualcosa di ignoto'), 'da_fare');
  /* I nomi dello storico: quelli di ieri di questo stesso modulo, quelli del
     motore di workflow, e quelli dell'elenco ordini. */
  assert.equal(O.statoDi('pianificata'), 'da_fare', 'il nome di ieri');
  assert.equal(O.statoDi('in_corso'), 'in_produzione', 'idem');
  assert.equal(O.statoDi('sospesa'), 'pausa', 'idem');
  assert.equal(O.statoDi('working'), 'in_produzione', 'il motore di workflow');
  assert.equal(O.statoDi('produzione'), 'in_produzione', 'l\'elenco ordini');
  assert.equal(O.statoDi('ready'), 'in_coda');
  assert.equal(O.statoDi('qc'), 'controllo_qualita');
});

test('i sette stati MES esistono, in ordine di officina', () => {
  assert.equal(O.STATI.map((s) => s.id).join('|'),
    'da_fare|in_coda|in_produzione|pausa|controllo_qualita|completata|annullata');
  assert.ok(O.STATI.every((s) => s.label && s.colore && s.ordine));
});

test('attiva · solo chi occupa davvero una macchina', () => {
  assert.equal(O.attiva({ status: 'da_fare' }), false);
  assert.equal(O.attiva({ status: 'in_coda' }), true);
  assert.equal(O.attiva({ status: 'in_produzione' }), true);
  assert.equal(O.attiva({ status: 'controllo_qualita' }), true);
  assert.equal(O.attiva({ status: 'completata' }), false);
});

test('chiusa · completata e annullata, nient\'altro', () => {
  assert.equal(O.chiusa({ status: 'completata' }), true);
  assert.equal(O.chiusa({ status: 'annullata' }), true);
  assert.equal(O.chiusa({ status: 'pausa' }), false);
});

test('qualita · buoni, scarti e resa quando qualcuno ha contato', () => {
  const q = O.qualita({ technology: 'laser', quantity: 100, goodQuantity: 96, wasteQuantity: 4 });
  assert.equal(q.resaPct, 96);
  assert.equal(q.scartoPct, 4);
  assert.equal(q.contato, true);
  assert.equal(q.coerente, true);
});

test('qualita · senza conteggio non si deduce una resa del 100%', () => {
  const q = O.qualita({ technology: 'laser', quantity: 100 });
  assert.equal(q.good, null);
  assert.equal(q.resaPct, null);
  assert.equal(q.contato, false);
  assert.equal(q.coerente, null);
});

test('qualita · buoni piu\' scarti oltre il totale si dichiara incoerente', () => {
  assert.equal(O.qualita({ quantity: 10, goodQuantity: 9, wasteQuantity: 5 }).coerente, false);
});

test('riepilogo · il costo dei rifacimenti entra nel costo reale', () => {
  const r = O.riepilogo([
    { technology: 'laser', actualCost: 40, reworkQuantity: 2, reworkCost: 6 }]);
  assert.equal(r.totali.actualCost, 40);
  assert.equal(r.totali.actualCostConRifacimenti, 46);
});

test('riepilogo · senza rifacimenti misurati il costo reale non cambia', () => {
  const r = O.riepilogo([{ technology: 'laser', actualCost: 40 }]);
  assert.equal(r.totali.actualCostConRifacimenti, 40);
});

test('riepilogo · la resa complessiva esce solo se qualcuno ha contato', () => {
  assert.equal(O.riepilogo([{ technology: 'laser' }]).qualita.contato, false);
  const r = O.riepilogo([
    { technology: 'laser', quantity: 50, goodQuantity: 48, wasteQuantity: 2 },
    { technology: 'uv', quantity: 50, goodQuantity: 50, wasteQuantity: 0 }]);
  assert.equal(r.qualita.contato, true);
  assert.equal(r.qualita.resaPct, 98);
  assert.equal(r.qualita.incoerenti, 0);
});

test('varianza · reale meno previsto, e il segno non si addolcisce', () => {
  const v = O.varianza({ technology: 'laser', estimatedTime: 20, actualTime: 24 });
  assert.equal(v.time, 4);
  assert.equal(v.timePct, 20);
  assert.equal(v.misurabile, true);
});

test('varianza · senza uno dei due termini non esiste', () => {
  const v = O.varianza({ technology: 'laser', estimatedTime: 20 });
  assert.equal(v.time, null);
  assert.equal(v.cost, null);
  assert.equal(v.misurabile, false);
});

test('leggi · le operazioni escono in sequenza', () => {
  const ops = O.leggi({ production: { operations: [
    { technology: 'uv', sequence: 2 }, { technology: 'laser', sequence: 1 }] } });
  assert.equal(ops[0].technology, 'laser');
  assert.equal(ops[1].technology, 'uv');
});

test('leggi · legge anche operations sulla radice dell\'ordine', () => {
  const ops = O.leggi({ operations: [{ technology: 'laser' }] });
  assert.equal(ops.length, 1);
});

test('costruisciDaOrdine · una operazione per tecnologia dichiarata', () => {
  const r = O.costruisciDaOrdine({ production: { technologies: ['laser', 'uv'] } });
  assert.equal(r.create, true);
  /* deepEqual confronta anche i prototipi, e questi array nascono in un
     altro realm: si confrontano i contenuti. */
  assert.equal(r.operations.map((o) => o.technology).join('|'), 'laser|uv');
  assert.equal(r.operations[0].sequence, 1);
  assert.equal(r.operations[1].sequence, 2);
  assert.equal(r.operations[0].status, 'da_fare');
  assert.equal(r.operations[0].estimatedTime, null, 'non inventa tempi');
  assert.equal(r.operations[0].machineId, null, 'non inventa macchine');
});

test('costruisciDaOrdine · un routing esistente non si ricostruisce', () => {
  const r = O.costruisciDaOrdine({ production: {
    technologies: ['laser'], operations: [{ technology: 'laser', actualTime: 33 }] } });
  assert.equal(r.create, false);
  assert.equal(r.operations[0].actualTime, 33, 'il tempo reale registrato sopravvive');
});

test('costruisciDaOrdine · senza tecnologia non inventa un routing', () => {
  const r = O.costruisciDaOrdine({ id: 1 });
  assert.equal(r.create, false);
  assert.equal(r.operations.length, 0);
});

test('riepilogo · i totali sommano i due tempi e ne danno lo scostamento', () => {
  const r = O.riepilogo([
    { technology: 'laser', estimatedTime: 20, actualTime: 24 },
    { technology: 'uv', estimatedTime: 12, actualTime: 15 }]);
  assert.equal(r.totali.estimatedTime, 32);
  assert.equal(r.totali.actualTime, 39);
  assert.equal(r.totali.varianceTime, 7);
});

test('riepilogo · niente di misurato non fa zero, fa null', () => {
  const r = O.riepilogo([{ technology: 'laser' }, { technology: 'uv' }]);
  assert.equal(r.totali.estimatedTime, null);
  assert.equal(r.totali.actualTime, null);
  assert.equal(r.totali.varianceTime, null);
  assert.equal(r.misurato, false);
});

test('riepilogo · e vale anche dentro le righe per macchina', () => {
  const r = O.riepilogo([{ technology: 'laser', machineId: 'x', estimatedTime: 20, actualTime: 24 }]);
  const m = r.perMacchina[0];
  assert.equal(m.actualTime, 24);
  assert.equal(m.estimatedCost, null, 'il costo non misurato non diventa zero euro');
});

test('riepilogo · le ore si raggruppano per macchina e per tecnologia', () => {
  const r = O.riepilogo([
    { technology: 'laser', machineId: 'x', actualTime: 10 },
    { technology: 'laser', machineId: 'x', actualTime: 5 },
    { technology: 'uv', machineId: 'y', actualTime: 3 }]);
  assert.equal(r.perMacchina.length, 2);
  assert.equal(r.perMacchina.find((m) => m.machineId === 'x').actualTime, 15);
  assert.equal(r.perTecnologia.find((t) => t.technology === 'laser').operazioni, 2);
});

test('riepilogo · un\'operazione senza macchina non inventa una riga macchina', () => {
  const r = O.riepilogo([{ technology: 'laser', actualTime: 10 }]);
  assert.equal(r.perMacchina.length, 0);
  assert.equal(r.perTecnologia.length, 1);
});

test('avanzamento · conta quello che è finito', () => {
  const a = O.avanzamento([
    { technology: 'laser', status: 'completata' },
    { technology: 'uv', status: 'in_produzione' }]);
  assert.equal(a.testo, '1 di 2 completate');
  assert.equal(a.pct, 50);
  assert.equal(a.inCorso, 1);
});

test('avanzamento · nessuna operazione si dice, non si finge al 100%', () => {
  const a = O.avanzamento([]);
  assert.equal(a.pct, null);
  assert.match(a.testo, /nessuna/);
});

/* ── Le transizioni (Fase 6) ────────────────────────────────────────────── */

test('transizioni · un salto impossibile viene rifiutato con il motivo', () => {
  const v = O.transizioneValida('da_fare', 'completata');
  assert.equal(v.ok, false);
  assert.match(v.motivo, /non si passa/);
  assert.equal(v.ammesse.join('|'), 'in_coda|in_produzione|annullata');
});

test('transizioni · il percorso normale è permesso', () => {
  ['da_fare>in_coda', 'in_coda>in_produzione', 'in_produzione>controllo_qualita',
    'controllo_qualita>completata', 'in_produzione>pausa', 'pausa>in_produzione']
    .forEach((p) => {
      const [a, b] = p.split('>');
      assert.equal(O.transizioneValida(a, b).ok, true, p);
    });
});

test('transizioni · i due passaggi all\'indietro che servono davvero', () => {
  assert.equal(O.transizioneValida('controllo_qualita', 'in_produzione').ok, true,
    'il pezzo torna in lavorazione');
  assert.equal(O.transizioneValida('completata', 'in_produzione').ok, true, 'un rifacimento');
});

test('transizioni · ma non si torna a «da fare» da metà lavorazione', () => {
  assert.equal(O.transizioneValida('in_produzione', 'da_fare').ok, false);
  assert.equal(O.transizioneValida('completata', 'da_fare').ok, false);
});

test('transizioni · solo un\'operazione annullata si riapre', () => {
  assert.equal(O.transizioneValida('annullata', 'da_fare').ok, true);
  assert.equal(O.transizioneValida('annullata', 'in_produzione').ok, false);
});

test('transizioni · lo stesso stato non è un errore', () => {
  const v = O.transizioneValida('in_produzione', 'in_produzione');
  assert.equal(v.ok, true);
  assert.equal(v.invariata, true);
});

test('transizioni · un nome legacy viene tradotto prima di essere giudicato', () => {
  assert.equal(O.transizioneValida('working', 'completata').ok, true, 'working = in_produzione');
  assert.equal(O.transizioneValida('pianificata', 'completata').ok, false, 'pianificata = da_fare');
});

test('cambiaStato · timbra l\'inizio quando entra in produzione', () => {
  const r = O.cambiaStato({ technology: 'laser', status: 'da_fare' }, 'in_produzione');
  assert.equal(r.ok, true);
  assert.ok(r.operazione.startedAt);
  assert.equal(r.operazione.completedAt, null);
});

test('cambiaStato · e la fine quando completa', () => {
  const r = O.cambiaStato({ technology: 'laser', status: 'in_produzione',
    startedAt: '2026-01-01T08:00:00.000Z' }, 'completata');
  assert.ok(r.operazione.completedAt);
  assert.equal(r.operazione.startedAt, '2026-01-01T08:00:00.000Z', 'l\'inizio non si riscrive');
});

test('cambiaStato · un rifacimento azzera la data di fine', () => {
  const r = O.cambiaStato({ technology: 'laser', status: 'completata',
    completedAt: '2026-01-02T10:00:00.000Z' }, 'in_produzione');
  assert.equal(r.ok, true);
  assert.equal(r.operazione.completedAt, null,
    'lasciarla farebbe risultare finito qualcosa che è in corso');
});

test('cambiaStato · rifiuta senza toccare l\'operazione', () => {
  const op = { technology: 'laser', status: 'da_fare' };
  const r = O.cambiaStato(op, 'completata');
  assert.equal(r.ok, false);
  assert.equal(op.status, 'da_fare', 'l\'originale resta intatto');
  assert.ok(r.ammesse.length);
});

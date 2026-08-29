/**
 * pipeline-migration.test.mjs — nessun ordine si perde nel ritiro di Pipeline.
 *
 * Una migrazione è il punto in cui un gestionale perde i dati di un
 * laboratorio, e lo fa in silenzio. In questo stesso progetto era già successo:
 * un consolidamento prometteva un'unione e ne sceglieva una sola, scartando i
 * record presenti solo nella copia più vecchia, e stampava «completata».
 *
 * Questi test esistono per una domanda sola: **può un ordine sparire?**
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, Date, parseFloat, isFinite, isNaN, String });
vm.runInContext(fs.readFileSync('src/core/migrations/pipeline-to-orders.js', 'utf8'), contesto);
const M = contesto.InglyMigrazionePipeline;

const ordine = (id, extra = {}) => ({ id, customerName: 'Cliente ' + id, value: 100, cost: 60, stage: 'produzione', ...extra });
const mirror = (id, sourceId, extra = {}) => ({ id, _source: 'orders', _sourceId: sourceId, value: 100, ...extra });

test('cosa si migra e cosa no', async (t) => {
  await t.test('un mirror con l\'originale presente non si duplica', () => {
    const piano = M.pianifica([mirror(2, 1)], [ordine(1)]);
    assert.equal(piano.daScrivere.length, 0, 'orders è già la verità per questo record');
    assert.equal(piano.conteggi.mirror, 1);
  });

  await t.test('un orfano si migra: non è mai stato in orders', () => {
    const piano = M.pianifica([{ id: 5, customerName: 'Rossi', value: 300, cost: 100, stage: 'produzione' }], []);
    assert.equal(piano.daScrivere.length, 1);
    assert.equal(piano.conteggi.orfani, 1);
    assert.equal(piano.daScrivere[0].customerName, 'Rossi');
  });

  await t.test('un divergente si migra: il suo originale è sparito da orders', () => {
    /* È il caso più insidioso: sembra una copia, ma l'originale non c'è più.
       Trattarlo come copia significherebbe cancellare l'ultimo esemplare. */
    const piano = M.pianifica([mirror(9, 8, { customerName: 'Bianchi' })], [ordine(1)]);
    assert.equal(piano.daScrivere.length, 1);
    assert.equal(piano.conteggi.divergenti, 1);
  });

  await t.test('un record illeggibile viene contato, non ignorato', () => {
    const piano = M.pianifica([null, 'spazzatura', ordine(3)], []);
    assert.equal(piano.conteggi.illeggibili, 2);
    assert.equal(piano.saltati.filter((s) => s.motivo === 'record illeggibile').length, 2);
  });

  await t.test('archivio pipeline vuoto: nessuna scrittura, nessun errore', () => {
    const piano = M.pianifica([], [ordine(1)]);
    assert.equal(piano.daScrivere.length, 0);
    assert.equal(piano.conteggi.ordiniDopo, 1);
  });

  await t.test('entrambi vuoti, o non array: non esplode', () => {
    for (const [p, o] of [[[], []], [null, null], [undefined, undefined], ['x', 7]]) {
      const piano = M.pianifica(p, o);
      assert.equal(piano.daScrivere.length, 0);
    }
  });
});

test('nessun dato si perde e nessuno si duplica', async (t) => {
  await t.test('gli id non collidono mai con quelli già occupati', () => {
    /* L\'id derivato `id + 1` di PipelineOS rende la collisione probabile,
       non teorica: il mirror dell\'ordine 3 ha id 4, che è un ordine vero. */
    const piano = M.pianifica(
      [{ id: 4, customerName: 'Orfano' }, { id: 5, customerName: 'Altro orfano' }],
      [ordine(3), ordine(4), ordine(5)]
    );
    const idNuovi = piano.daScrivere.map((r) => r.id);
    for (const id of idNuovi) assert.ok(![3, 4, 5].includes(id), 'id ' + id + ' calpesta un ordine esistente');
    assert.equal(new Set(idNuovi).size, idNuovi.length, 'due record migrati non possono avere lo stesso id');
  });

  await t.test('eseguirla due volte non duplica nulla', () => {
    const pipeline = [{ id: 5, customerName: 'Rossi', value: 300 }, { id: 7, customerName: 'Verdi', value: 120 }];
    const primo = M.pianifica(pipeline, []);
    assert.equal(primo.daScrivere.length, 2);

    /* Seconda esecuzione sullo stato prodotto dalla prima. */
    const secondo = M.pianifica(pipeline, primo.daScrivere);
    assert.equal(secondo.daScrivere.length, 0, 'la migrazione dev\'essere ripetibile');
    assert.equal(secondo.conteggi.giaMigrati, 2);
  });

  await t.test('la verifica accetta un esito corretto', () => {
    const piano = M.pianifica([{ id: 5, customerName: 'Rossi' }], [ordine(1)]);
    const dopo = [ordine(1)].concat(piano.daScrivere);
    const v = M.verifica(piano, dopo);
    assert.equal(v.ok, true, v.problemi.join(' · '));
  });

  await t.test('la verifica RIFIUTA un record perso', () => {
    /* Il controllo negativo: se la verifica non diventasse rossa qui, il suo
       verde altrove non varrebbe nulla. */
    const piano = M.pianifica([{ id: 5, customerName: 'Rossi' }], [ordine(1)]);
    const v = M.verifica(piano, [ordine(1)]);   // il migrato non è stato scritto
    assert.equal(v.ok, false);
    assert.ok(v.problemi.some((p) => /non trovato|attesi/.test(p)));
  });

  await t.test('la verifica RIFIUTA un id duplicato', () => {
    const piano = M.pianifica([], [ordine(1)]);
    const v = M.verifica(piano, [ordine(1), ordine(1)]);
    assert.equal(v.ok, false);
    assert.ok(v.problemi.some((p) => /duplicati/.test(p)));
  });

  await t.test('su cento record misti il conteggio torna esatto', () => {
    const orders = [];
    const pipeline = [];
    for (let i = 1; i <= 40; i += 1) orders.push(ordine(i));
    for (let i = 1; i <= 40; i += 1) pipeline.push(mirror(1000 + i, i));      // 40 copie fedeli
    for (let i = 1; i <= 35; i += 1) pipeline.push({ id: 2000 + i, customerName: 'Orfano ' + i, value: 50 });
    for (let i = 1; i <= 25; i += 1) pipeline.push(mirror(3000 + i, 900 + i)); // originali spariti

    const piano = M.pianifica(pipeline, orders);
    assert.equal(piano.conteggi.pipeline, 100);
    assert.equal(piano.conteggi.mirror, 40);
    assert.equal(piano.conteggi.orfani, 35);
    assert.equal(piano.conteggi.divergenti, 25);
    assert.equal(piano.conteggi.migrati, 60, 'si migra tutto ciò che non ha già un originale');
    assert.equal(piano.conteggi.ordiniDopo, 100);

    const v = M.verifica(piano, orders.concat(piano.daScrivere));
    assert.equal(v.ok, true, v.problemi.join(' · '));
  });
});

test('normalizzazione dei campi richiesti dalla Fase 3', async (t) => {
  await t.test('ci sono tutti', () => {
    const r = M.normalizza({ id: 1 }, 10);
    for (const campo of ['id', 'customerId', 'quoteId', 'stage', 'status', 'createdAt', 'updatedAt', 'dueDate', 'value', 'cost', 'margin', 'source']) {
      assert.ok(campo in r, 'manca ' + campo);
    }
    assert.equal(r.source, 'pipeline');
  });

  await t.test('gli stadi si traducono, non si copiano alla cieca', () => {
    assert.equal(M.normalizzaStadio('WIP'), 'produzione');
    assert.equal(M.normalizzaStadio('in lavorazione'), 'produzione');
    assert.equal(M.normalizzaStadio('delivered'), 'consegnato');
    assert.equal(M.normalizzaStadio('canceled'), 'annullato');
    assert.equal(M.normalizzaStadio(''), 'bozza');
  });

  await t.test('uno stadio sconosciuto si conserva invece di essere buttato in bozza', () => {
    assert.equal(M.normalizzaStadio('collaudo_speciale'), 'collaudo_speciale');
  });

  await t.test('i nomi storici alternativi vengono raccolti', () => {
    const r = M.normalizza({ clientId: 7, clientName: 'Rossi', preventivoId: 3, scadenza: '2026-03-01', jobName: 'Targhe' }, 1);
    assert.equal(r.customerId, 7);
    assert.equal(r.customerName, 'Rossi');
    assert.equal(r.quoteId, 3);
    assert.equal(r.title, 'Targhe');
    assert.match(r.dueDate, /^2026-03-01/);
  });

  await t.test('una data non valida diventa null, non «Invalid Date»', () => {
    assert.equal(M.normalizza({ dueDate: 'domani forse' }, 1).dueDate, null);
  });

  await t.test('il margine si calcola sul ricavo', () => {
    assert.equal(M.normalizza({ value: 200, cost: 120 }, 1).margin, 40);
  });

  await t.test('senza valore il margine è null, non zero', () => {
    /* Zero vorrebbe dire «ho venduto senza guadagnare». Null dice la verità:
       non si può sapere. È la regola che il progetto si è già dato sui numeri
       senza fonte. */
    assert.equal(M.normalizza({ value: 0, cost: 0 }, 1).margin, null);
  });

  await t.test('valori mancanti o non numerici non producono NaN', () => {
    const r = M.normalizza({ value: 'tanti', cost: undefined }, 1);
    assert.equal(r.value, 0);
    assert.equal(r.cost, 0);
  });

  await t.test('la provenienza resta scritta nel record', () => {
    const r = M.normalizza({ id: 42 }, 7);
    assert.equal(r._migratoDa.store, 'pipeline');
    assert.equal(r._migratoDa.id, 42);
    assert.equal(r._migratoDa.versione, M.VERSIONE);
  });
});

test('lo store pipeline non viene mai svuotato dalla migrazione', () => {
  /* La Fase 3 lo chiede esplicitamente: il vecchio store resta come sorgente
     di migrazione. La funzione è pura e non scrive — questa è la prova che
     nemmeno il piano contiene istruzioni di cancellazione. */
  const piano = M.pianifica([{ id: 1 }, { id: 2 }], []);
  const testo = JSON.stringify(piano);
  assert.doesNotMatch(testo, /"delete"|"clear"|"rimuovi"/i);
  assert.ok(!('daCancellare' in piano), 'il piano non prevede cancellazioni');
});

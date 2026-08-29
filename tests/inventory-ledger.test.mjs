/**
 * inventory-ledger.test.mjs — la giacenza è la somma dei movimenti.
 *
 * Il difetto che questo file esiste per rendere impossibile è banale da
 * descrivere e difficile da vedere: la quantità era un campo, e un campo si
 * sovrascrive. Due operazioni che partono dallo stesso 12 e scrivono 17 e 9
 * lasciano 9 — il primo movimento non è andato perso per un errore di calcolo,
 * è stato coperto. Nessun report se ne accorge, perché il numero risultante è
 * plausibile.
 *
 * Un registro non sovrascrive: aggiunge. E se la somma dei movimenti non
 * coincide con il numero che il record conserva, la riconciliazione lo dice.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ Math, JSON, Object, Array, String, Number, Date, parseFloat, isFinite, console });
vm.runInContext(fs.readFileSync('src/product/inventory-ledger.js', 'utf8'), contesto);
const L = contesto.InglyInventoryLedger;

/** Costruisce una catena di movimenti concatenando previous/resulting. */
function catena(passi, inizio = 0) {
  let q = inizio;
  const out = [];
  passi.forEach((p, n) => {
    const m = L.crea({ itemId: 'i1', warehouseId: 'w1', unit: 'pz',
      /* Istanti veri e crescenti. La prima stesura costruiva
         `2026-01-<n>` a mano e oltre il trentunesimo movimento produceva
         `2026-01-100`, che come **stringa** viene prima di `2026-01-32`: il
         registro si riordinava e ottantanove movimenti risultavano fuori
         posto. Il modulo aveva ragione, il generatore no. */
      timestamp: new Date(Date.UTC(2026, 0, 1, 10, 0, 0) + n * 60000).toISOString(),
      id: 'm' + String(n + 1).padStart(3, '0'), ...p }, q);
    out.push(m);
    q = m.resultingQuantity;
  });
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. IL GOLDEN SCENARIO — quello scritto nella specifica
   ═══════════════════════════════════════════════════════════════════════════ */
test('il conto della specifica torna', async (t) => {
  const mov = catena([
    { type: 'OPENING_BALANCE', quantity: 100, unitCost: 1.20 },
    { type: 'PURCHASE',        quantity: 50,  unitCost: 1.35 },
    { type: 'CONSUMPTION',     quantity: 20,  unitCost: 1.20, referenceType: 'ORDER', referenceId: '900' },
    { type: 'WASTE',           quantity: 5,   unitCost: 1.20 },
    { type: 'RETURN',          quantity: 3,   unitCost: 1.35 },
    { type: 'SALE',            quantity: 10,  unitCost: 1.20, referenceType: 'SALE', referenceId: '77' },
    { type: 'ADJUSTMENT',      quantity: -2 },
  ]);

  await t.test('100 +50 −20 −5 +3 −10 −2 = 116', () => {
    assert.equal(L.ricostruisci(mov, 'i1', 'w1').quantity, 116);
  });

  await t.test('ogni movimento sa da dove viene e dove arriva', () => {
    const attesi = [100, 150, 130, 125, 128, 118, 116];
    assert.deepEqual(mov.map((m) => m.resultingQuantity), attesi);
    assert.deepEqual(mov.map((m) => m.previousQuantity), [0, ...attesi.slice(0, -1)]);
  });

  await t.test('il segno lo mette il tipo, non chi scrive', () => {
    assert.equal(mov.find((m) => m.type === 'WASTE').delta, -5);
    assert.equal(mov.find((m) => m.type === 'RETURN').delta, +3);
    assert.equal(mov.find((m) => m.type === 'ADJUSTMENT').delta, -2);
  });

  await t.test('scarto e consumo restano distinti', () => {
    const per = L.ricostruisci(mov, 'i1', 'w1').perTipo;
    assert.equal(per.CONSUMPTION, 20);
    assert.equal(per.WASTE, 5);
    assert.notEqual(per.CONSUMPTION, per.WASTE, 'materiale usato e materiale perso non sono la stessa cosa');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   2. RICOSTRUZIONE — 0, 1, 10, 100, 1000 movimenti
   ═══════════════════════════════════════════════════════════════════════════ */
test('la ricostruzione regge qualunque numero di movimenti', async (t) => {
  for (const n of [0, 1, 10, 100, 1000]) {
    await t.test(n + ' movimenti', () => {
      /* Un ciclo deterministico: +7 acquisto, −3 consumo, −1 scarto. */
      const passi = [];
      for (let i = 0; i < n; i++) {
        const k = i % 3;
        passi.push(k === 0 ? { type: 'PURCHASE', quantity: 7, unitCost: 2 }
          : k === 1 ? { type: 'CONSUMPTION', quantity: 3, unitCost: 2 }
            : { type: 'WASTE', quantity: 1, unitCost: 2 });
      }
      const mov = catena(passi);
      const cicli = Math.floor(n / 3), resto = n % 3;
      const atteso = cicli * 3 + (resto >= 1 ? 7 : 0) + (resto >= 2 ? -3 : 0);
      const ric = L.ricostruisci(mov, 'i1', 'w1');
      assert.equal(ric.quantity, atteso);
      assert.equal(ric.movimenti, n);
      assert.equal(ric.discontinuita.length, 0, 'nessun salto: la catena è integra');
    });
  }
});

test('cancellare il numero materializzato non perde niente', async (t) => {
  const mov = catena([
    { type: 'OPENING_BALANCE', quantity: 40, unitCost: 3 },
    { type: 'PURCHASE', quantity: 25, unitCost: 3.2 },
    { type: 'CONSUMPTION', quantity: 12, unitCost: 3 },
    { type: 'TRANSFER_OUT', quantity: 5, unitCost: 3 },
  ]);
  const materializzato = mov[mov.length - 1].resultingQuantity;

  await t.test('il registro ricostruisce esattamente il valore materializzato', () => {
    assert.equal(materializzato, 48);
    assert.equal(L.ricostruisci(mov, 'i1', 'w1').quantity, materializzato);
  });

  await t.test('e se il record viene perso, il registro basta da solo', () => {
    /* Nessun accesso al record: si parte dai soli movimenti. */
    assert.equal(L.ricostruisci(mov).quantity, 48);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   3. RICONCILIAZIONE — expected / actual / delta
   ═══════════════════════════════════════════════════════════════════════════ */
test('la riconciliazione dice dove il registro e il record non si parlano', async (t) => {
  const mov = [
    ...catena([{ type: 'OPENING_BALANCE', quantity: 30, unitCost: 1 }, { type: 'CONSUMPTION', quantity: 8, unitCost: 1 }]),
  ];

  await t.test('quando quadra, lo dice', () => {
    const r = L.riconcilia(mov, [{ itemId: 'i1', warehouseId: 'w1', quantity: 22 }]);
    assert.equal(r.quadra, true);
    assert.equal(r.divergenti, 0);
    assert.equal(r.righe[0].expected, 22);
    assert.equal(r.righe[0].delta, 0);
  });

  await t.test('quando non quadra, dice di quanto e da che parte', () => {
    const r = L.riconcilia(mov, [{ itemId: 'i1', warehouseId: 'w1', quantity: 19 }]);
    assert.equal(r.quadra, false);
    assert.equal(r.divergenti, 1);
    assert.equal(r.righe[0].expected, 22);
    assert.equal(r.righe[0].actual, 19);
    assert.equal(r.righe[0].delta, -3);
  });

  await t.test('un articolo con giacenza e senza registro si vede', () => {
    const r = L.riconcilia(mov, [
      { itemId: 'i1', warehouseId: 'w1', quantity: 22 },
      { itemId: 'i9', warehouseId: 'w1', quantity: 44 },
    ]);
    assert.equal(r.senzaRegistro, 1);
    const orfano = r.righe.find((x) => x.itemId === 'i9');
    assert.equal(orfano.expected, 0);
    assert.equal(orfano.delta, 44);
  });

  await t.test('una scrittura fuori dal registro lascia una discontinuità', () => {
    /* Qualcuno ha messo le mani sulla quantità fra due movimenti: il secondo
       dichiara di partire da 25 mentre il registro era a 22. */
    const sporco = mov.concat([L.crea(
      { id: 'mX', type: 'CONSUMPTION', quantity: 2, itemId: 'i1', warehouseId: 'w1', unitCost: 1, timestamp: '2026-01-09T10:00:00.000Z' }, 25)]);
    const ric = L.ricostruisci(sporco, 'i1', 'w1');
    assert.equal(ric.discontinuita.length, 1);
    assert.equal(ric.discontinuita[0].atteso, 22);
    assert.equal(ric.discontinuita[0].registrato, 25);
    /* Il registro resta comunque la verità: 30 − 8 − 2. */
    assert.equal(ric.quantity, 20);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   4. AGGIORNAMENTI PERSI — lo scenario della specifica
   ═══════════════════════════════════════════════════════════════════════════ */
test('due operazioni concorrenti non si cancellano più', async (t) => {
  await t.test('con il campo: 12 → 17 e 12 → 9 lasciano 9', () => {
    /* La simulazione del difetto, per avere il numero da battere. */
    let campo = 12;
    const leggeA = campo, leggeB = campo;
    campo = leggeA + 5;   // A scrive 17
    campo = leggeB - 3;   // B scrive 9, e i +5 spariscono
    assert.equal(campo, 9);
  });

  await t.test('con il registro: gli stessi due movimenti fanno 14', () => {
    /* Nessuno dei due legge per scrivere: entrambi **aggiungono**. La
       quantità corrente si ricostruisce dopo, da tutti e due. */
    const a = L.crea({ id: 'a', type: 'PURCHASE', quantity: 5, itemId: 'i1', warehouseId: 'w1', unitCost: 1, timestamp: '2026-02-01T10:00:00.000Z' }, 12);
    const b = L.crea({ id: 'b', type: 'CONSUMPTION', quantity: 3, itemId: 'i1', warehouseId: 'w1', unitCost: 1, timestamp: '2026-02-01T10:00:01.000Z' }, 12);
    const ric = L.ricostruisci([
      L.crea({ id: 'o', type: 'OPENING_BALANCE', quantity: 12, itemId: 'i1', warehouseId: 'w1', unitCost: 1, timestamp: '2026-01-01T10:00:00.000Z' }, 0),
      a, b,
    ], 'i1', 'w1');
    assert.equal(ric.quantity, 14);
  });

  await t.test('e la concorrenza lascia una traccia invece di sparire', () => {
    const ric = L.ricostruisci([
      L.crea({ id: 'o', type: 'OPENING_BALANCE', quantity: 12, itemId: 'i1', warehouseId: 'w1', timestamp: '2026-01-01T10:00:00.000Z' }, 0),
      L.crea({ id: 'a', type: 'PURCHASE', quantity: 5, itemId: 'i1', warehouseId: 'w1', timestamp: '2026-02-01T10:00:00.000Z' }, 12),
      L.crea({ id: 'b', type: 'CONSUMPTION', quantity: 3, itemId: 'i1', warehouseId: 'w1', timestamp: '2026-02-01T10:00:01.000Z' }, 12),
    ], 'i1', 'w1');
    /* Il secondo dichiara di partire da 12 mentre il registro era già a 17:
       la lettura stantia è visibile, non silenziosa. */
    assert.equal(ric.discontinuita.length, 1);
    assert.equal(ric.quantity, 14, 'il totale resta giusto: nessun movimento è stato coperto');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   5. IL COSTO STORICO — congelato, come per gli ordini
   ═══════════════════════════════════════════════════════════════════════════ */
test('il costo di un movimento è quello del momento', async (t) => {
  const catalogo = { i1: { costPrice: 1.20 } };
  const mov = catena([
    { type: 'PURCHASE', quantity: 100, unitCost: catalogo.i1.costPrice },
  ]);

  await t.test('registrato a 1,20', () => {
    assert.equal(mov[0].unitCost, 1.20);
    assert.equal(mov[0].totalCost, 120);
  });

  await t.test('il listino sale a 1,70 e il movimento non si muove', () => {
    catalogo.i1.costPrice = 1.70;
    assert.equal(mov[0].unitCost, 1.20);
    assert.equal(L.costoUltimo(mov, 'i1', 'w1').costo, 1.20);
  });

  await t.test('e non si può nemmeno riscrivere', () => {
    try { mov[0].unitCost = 1.70; } catch (e) { /* congelato */ }
    assert.equal(mov[0].unitCost, 1.20);
  });
});

test('le tre letture del costo, tutte dal registro', async (t) => {
  const mov = catena([
    { type: 'PURCHASE', quantity: 100, unitCost: 1.00 },
    { type: 'PURCHASE', quantity: 100, unitCost: 2.00 },
    { type: 'CONSUMPTION', quantity: 150, unitCost: 1.00 },
  ]);

  await t.test('ultimo costo: l\'ultima entrata valorizzata', () => {
    assert.equal(L.costoUltimo(mov, 'i1', 'w1').costo, 2.00);
  });

  await t.test('media ponderata: (100×1 + 100×2) / 200', () => {
    assert.equal(L.costoMedioPonderato(mov, 'i1', 'w1').costo, 1.50);
  });

  await t.test('FIFO: consumati i primi 100 a 1,00 e 50 a 2,00, restano 50 a 2,00', () => {
    const f = L.costoFifo(mov, 'i1', 'w1');
    assert.equal(f.quantitaResidua, 50);
    assert.equal(f.costo, 2.00);
    assert.equal(f.scoperto, 0);
  });

  await t.test('senza entrate valorizzate ognuna dice che non può rispondere', () => {
    const senza = catena([{ type: 'PURCHASE', quantity: 10 }]);
    assert.equal(L.costoUltimo(senza, 'i1', 'w1').disponibile, false);
    assert.equal(L.costoMedioPonderato(senza, 'i1', 'w1').disponibile, false);
    assert.equal(L.costoFifo(senza, 'i1', 'w1').disponibile, false);
    assert.match(L.costoUltimo(senza, 'i1', 'w1').motivo, /nessuna entrata/);
  });

  await t.test('il FIFO conta le uscite scoperte invece di ignorarle', () => {
    const troppo = catena([
      { type: 'PURCHASE', quantity: 10, unitCost: 1 },
      { type: 'CONSUMPTION', quantity: 25, unitCost: 1 },
      { type: 'PURCHASE', quantity: 5, unitCost: 3 },
    ]);
    assert.equal(L.costoFifo(troppo, 'i1', 'w1').scoperto, 15);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   6. RETTIFICA, TRASFERIMENTO, APERTURA
   ═══════════════════════════════════════════════════════════════════════════ */
test('correggere senza riscrivere', async (t) => {
  await t.test('la rettifica è un movimento nuovo, non una modifica', () => {
    const r = L.rettifica({ itemId: 'i1', warehouseId: 'w1', attuale: 22, contato: 19, userId: 'g' });
    assert.equal(r.type, 'ADJUSTMENT');
    assert.equal(r.delta, -3);
    assert.equal(r.previousQuantity, 22);
    assert.equal(r.resultingQuantity, 19);
    assert.match(r.note, /contati 19/);
  });

  await t.test('una rettifica a delta zero non si scrive', () => {
    assert.equal(L.rettifica({ itemId: 'i1', attuale: 20, contato: 20 }), null);
  });

  await t.test('il trasferimento produce due movimenti legati', () => {
    const t2 = L.trasferimento({ itemId: 'i1', da: 'w1', a: 'w2', quantity: 8, giacenzaDa: 30, giacenzaA: 4, unitCost: 2 });
    assert.equal(t2.movimenti.length, 2);
    const [out, inn] = t2.movimenti;
    assert.equal(out.type, 'TRANSFER_OUT');
    assert.equal(inn.type, 'TRANSFER_IN');
    assert.equal(out.delta, -8);
    assert.equal(inn.delta, +8);
    assert.equal(out.resultingQuantity, 22);
    assert.equal(inn.resultingQuantity, 12);
    assert.equal(out.operationId, inn.operationId, 'i due movimenti devono portare la stessa operazione');
  });

  await t.test('il trasferimento non cambia il totale, cambia dove sta', () => {
    const t2 = L.trasferimento({ itemId: 'i1', da: 'w1', a: 'w2', quantity: 8, giacenzaDa: 30, giacenzaA: 4 });
    const tutti = t2.movimenti;
    assert.equal(L.ricostruisci(tutti, 'i1').quantity, 0, 'la somma dei due movimenti è zero');
    assert.equal(L.ricostruisci(tutti, 'i1', 'w1').quantity, -8);
    assert.equal(L.ricostruisci(tutti, 'i1', 'w2').quantity, +8);
  });

  await t.test('il saldo di apertura nasce dalla giacenza esistente', () => {
    const a = L.apertura({ id: 7, name: 'MDF 3mm', quantity: 125, unit: 'fogli', costPrice: 1.8 });
    assert.equal(a.type, 'OPENING_BALANCE');
    assert.equal(a.quantity, 125);
    assert.equal(a.previousQuantity, 0);
    assert.equal(a.resultingQuantity, 125);
    assert.equal(a.unitCost, 1.8);
    assert.equal(a.referenceType, 'MIGRATION');
    assert.match(a.note, /non un acquisto tracciato/);
  });

  await t.test('un articolo a giacenza zero non produce un\'apertura finta', () => {
    assert.equal(L.apertura({ id: 8, name: 'x', quantity: 0 }), null);
    assert.equal(L.apertura({ id: 9, name: 'y' }), null);
  });

  await t.test('l\'apertura legge la giacenza da qualunque dei tre nomi storici', () => {
    assert.equal(L.apertura({ id: 1, quantity: 10 }).quantity, 10);
    assert.equal(L.apertura({ id: 2, qty: 11 }).quantity, 11);
    assert.equal(L.apertura({ id: 3, stock: 12 }).quantity, 12);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   7. PRENOTAZIONI — tre numeri che restano tre
   ═══════════════════════════════════════════════════════════════════════════ */
test('on hand, reserved, available', async (t) => {
  const mov = catena([{ type: 'OPENING_BALANCE', quantity: 50, unitCost: 1 }]);
  const pren = [
    { itemId: 'i1', warehouseId: 'w1', quantity: 12, status: 'active' },
    { itemId: 'i1', warehouseId: 'w1', quantity: 5, status: 'released' },
    { itemId: 'i1', warehouseId: 'w1', quantity: 3, status: 'active' },
  ];

  await t.test('la prenotazione non tocca la giacenza fisica', () => {
    const d = L.disponibilita(mov, pren, 'i1', 'w1');
    assert.equal(d.onHand, 50, 'il materiale è ancora sullo scaffale');
    assert.equal(d.reserved, 15);
    assert.equal(d.available, 35);
  });

  await t.test('una prenotazione rilasciata non conta più', () => {
    const d = L.disponibilita(mov, pren.map((p) => ({ ...p, status: 'released' })), 'i1', 'w1');
    assert.equal(d.reserved, 0);
    assert.equal(d.available, 50);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   8. CONTROLLI NEGATIVI — il registro non si lascia corrompere
   ═══════════════════════════════════════════════════════════════════════════ */
test('quello che il registro rifiuta', async (t) => {
  const ctx = { itemiNoti: ['i1', 'i2'], depositiNoti: ['w1', 'w2'], idEsistenti: ['m001'] };

  const casi = [
    ['tipo di movimento inventato', { type: 'TELEPORT', itemId: 'i1', quantity: 5 }, /tipo di movimento sconosciuto/],
    ['movimento senza articolo', { type: 'PURCHASE', quantity: 5 }, /senza articolo/],
    ['articolo inesistente', { type: 'PURCHASE', itemId: 'i99', quantity: 5 }, /articolo inesistente/],
    ['deposito inesistente', { type: 'PURCHASE', itemId: 'i1', warehouseId: 'w99', quantity: 5 }, /deposito inesistente/],
    ['quantità zero', { type: 'PURCHASE', itemId: 'i1', quantity: 0 }, /non è un movimento/],
    ['quantità non numerica', { type: 'PURCHASE', itemId: 'i1', quantity: 'molti' }, /non numerica/],
    ['quantità negativa su un tipo con segno', { type: 'CONSUMPTION', itemId: 'i1', quantity: -5 }, /il segno lo dichiara il tipo/],
    ['riferimento sconosciuto', { type: 'PURCHASE', itemId: 'i1', quantity: 5, referenceType: 'OROSCOPO', referenceId: '1' }, /riferimento sconosciuto/],
    ['riferimento senza id', { type: 'CONSUMPTION', itemId: 'i1', quantity: 5, referenceType: 'ORDER' }, /senza id/],
    ['id duplicato', { id: 'm001', type: 'PURCHASE', itemId: 'i1', quantity: 5 }, /già presente/],
  ];

  for (const [nome, mov, atteso] of casi) {
    await t.test(nome, () => {
      const v = L.valida(mov, ctx);
      assert.equal(v.valido, false, 'doveva essere rifiutato');
      assert.ok(v.errori.some((e) => atteso.test(e)), 'errore atteso ' + atteso + ', ricevuti: ' + v.errori.join(' / '));
    });
  }

  await t.test('un movimento valido passa — il controllo non rifiuta tutto', () => {
    const v = L.valida({ type: 'PURCHASE', itemId: 'i1', warehouseId: 'w1', quantity: 5, unitCost: 2 }, ctx);
    assert.equal(v.valido, true, 'errori: ' + v.errori.join(' / '));
  });

  await t.test('la rettifica accetta il segno negativo, ed è l\'unica', () => {
    assert.equal(L.valida({ type: 'ADJUSTMENT', itemId: 'i1', quantity: -3 }, ctx).valido, true);
  });

  await t.test('un movimento valorizzabile senza costo passa, con un avviso', () => {
    const v = L.valida({ type: 'PURCHASE', itemId: 'i1', quantity: 5 }, ctx);
    assert.equal(v.valido, true, 'rifiutarlo perderebbe il dato di quantità');
    assert.equal(v.avvisi.length, 1);
    assert.match(v.avvisi[0], /valorizzazione/);
  });

  await t.test('una transazione storica non si modifica', () => {
    const m = L.crea({ type: 'PURCHASE', itemId: 'i1', quantity: 10, unitCost: 2 }, 5);
    const prima = JSON.stringify(m);
    try { m.quantity = 999; m.resultingQuantity = 999; m.unitCost = 0; } catch (e) { /* congelato */ }
    assert.equal(JSON.stringify(m), prima);
    assert.ok(Object.isFrozen(m));
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   9. «PERCHÉ SONO PASSATO DA 12 A 7?»
   ═══════════════════════════════════════════════════════════════════════════ */
test('ogni movimento sa spiegarsi', async (t) => {
  const m = L.crea({
    type: 'CONSUMPTION', itemId: 'i1', itemName: 'MDF 3mm', unit: 'fogli',
    warehouseId: 'w1', quantity: 5, unitCost: 1.8,
    referenceType: 'ORDER', referenceId: '900123', userId: 'giuseppe',
    note: 'targhe premiazione',
  }, 12);
  const s = L.spiega(m);

  await t.test('risponde a tutte e sette le domande', () => {
    assert.equal(s.cosa, 'Consumo');
    assert.equal(s.quantita, '−5 fogli');
    assert.equal(s.da, 12);
    assert.equal(s.a, 7);
    assert.equal(s.costo, 1.8);
    assert.equal(s.valore, 9);
    assert.equal(s.documento, 'ORDER 900123');
    assert.equal(s.chi, 'giuseppe');
    assert.ok(s.quando);
  });

  await t.test('un movimento manuale lo dice invece di inventare un documento', () => {
    assert.equal(L.spiega(L.crea({ type: 'ADJUSTMENT', itemId: 'i1', quantity: -2 }, 7)).documento, 'movimento manuale');
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   10. VALORE — e quando non si può dichiarare
   ═══════════════════════════════════════════════════════════════════════════ */
test('il valore di magazzino non si presenta a metà', async (t) => {
  await t.test('con tutti i movimenti valorizzati, il valore è completo', () => {
    const mov = catena([
      { type: 'PURCHASE', quantity: 10, unitCost: 2 },
      { type: 'CONSUMPTION', quantity: 4, unitCost: 2 },
    ]);
    const r = L.ricostruisci(mov, 'i1', 'w1');
    assert.equal(r.valore, 12);
    assert.equal(r.valoreCompleto, true);
  });

  await t.test('se manca un costo, il valore lo dichiara', () => {
    const mov = catena([
      { type: 'PURCHASE', quantity: 10, unitCost: 2 },
      { type: 'CONSUMPTION', quantity: 4 },
    ]);
    const r = L.ricostruisci(mov, 'i1', 'w1');
    assert.equal(r.valoreCompleto, false);
    assert.equal(r.movimentiValorizzati, 1);
  });
});

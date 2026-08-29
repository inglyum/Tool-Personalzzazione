/* ═══════════════════════════════════════════════════════════════════════════
   MIGRAZIONE · pipeline → orders
   ═══════════════════════════════════════════════════════════════════════════

   Lo store `pipeline` non è mai stato una sorgente indipendente. `PipelineOS`
   scrive l'ordine in `orders` e **subito dopo** ne duplica una copia in
   `pipeline`, con `_source:'orders'`, `_sourceId` e un id derivato `id + 1`.
   È un mirror, non un archivio.

   Questo lo rende un caso raro e fortunato: la Single Source of Truth che la
   Fase 3 chiede — `orders` — esiste già. Restano però due categorie di record
   che un ritiro frettoloso perderebbe:

   1. gli **orfani**: record nati in pipeline e mai passati da orders, perché
      creati da versioni precedenti o da patch che scrivevano solo lì;
   2. i **divergenti**: mirror il cui originale è stato cancellato da orders,
      che a quel punto sono l'unica copia rimasta.

   Nessun record viene cancellato da `pipeline`: lo store resta come sorgente
   di migrazione, così una seconda esecuzione può accorgersi di ciò che la
   prima non ha visto. È la stessa disciplina che ha già salvato dati in questo
   progetto: un consolidamento precedente prometteva un'unione e faceva una
   scelta, scartando in silenzio i record presenti solo nella copia più vecchia.

   La funzione è pura. Decide, non scrive: chi la chiama applica il risultato e
   verifica i conteggi.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = 'pipeline-to-orders-v1';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };

  /* Gli stati di pipeline e quelli di orders sono nati separati e hanno nomi
     diversi per le stesse cose. La tabella è esplicita perché una traduzione
     sbagliata sposta un ordine di fase senza che nessuno se ne accorga. */
  var STADI = {
    lead: 'bozza', nuovo: 'bozza', bozza: 'bozza', draft: 'bozza',
    preventivo: 'preventivo', quote: 'preventivo', quoted: 'preventivo',
    confermato: 'confermato', confirmed: 'confermato', accepted: 'confermato',
    produzione: 'produzione', production: 'produzione', wip: 'produzione', in_lavorazione: 'produzione',
    pronto: 'pronto', ready: 'pronto',
    consegnato: 'consegnato', delivered: 'consegnato', done: 'consegnato', completato: 'consegnato',
    fatturato: 'fatturato', invoiced: 'fatturato',
    pagato: 'pagato', paid: 'pagato',
    annullato: 'annullato', cancelled: 'annullato', canceled: 'annullato', perso: 'annullato',
  };

  function normalizzaStadio(v) {
    var k = String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, '_');
    return STADI[k] || (k ? k : 'bozza');
  }

  function primaData() {
    for (var i = 0; i < arguments.length; i += 1) {
      var v = arguments[i];
      if (!v) continue;
      var d = new Date(v);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    return null;
  }

  /**
   * Porta un record pipeline nella forma che `orders` si aspetta. I campi
   * richiesti dalla Fase 3 ci sono tutti; quelli che non si possono ricavare
   * restano `null` — non si inventa un cliente che non c'è.
   */
  function normalizza(record, nuovoId) {
    var r = record || {};
    var valore = num(r.value, num(r.total, num(r.amount, 0)));
    var costo = num(r.cost, num(r.totalCost, 0));

    return {
      id: nuovoId,
      customerId: r.customerId != null ? r.customerId : (r.clientId != null ? r.clientId : null),
      customerName: r.customerName || r.clientName || r.cliente || '',
      quoteId: r.quoteId != null ? r.quoteId : (r.preventivoId != null ? r.preventivoId : null),
      stage: normalizzaStadio(r.stage || r.status || r.stato),
      status: normalizzaStadio(r.status || r.stage || r.stato),
      createdAt: primaData(r.createdAt, r.created, r.date, r.data),
      updatedAt: primaData(r.updatedAt, r.updated, r.createdAt, r.date),
      dueDate: primaData(r.dueDate, r.deadline, r.scadenza, r.consegna),
      value: valore,
      cost: costo,
      /* Margine sul ricavo. Se il valore è zero non è «margine zero»: è un
         margine che non si può calcolare, e dirlo è diverso dal dire zero. */
      margin: valore > 0 ? ((valore - costo) / valore) * 100 : null,
      source: 'pipeline',
      title: r.title || r.jobName || r.name || r.descrizione || '',
      notes: r.notes || r.note || '',
      /* Si conserva la provenienza: se domani la migrazione va rivista, si sa
         da dove veniva ogni record. */
      _migratoDa: { store: 'pipeline', id: r.id != null ? r.id : null, versione: VERSIONE },
    };
  }

  /**
   * Decide che cosa migrare. Non scrive niente.
   *
   * @param {Array} pipeline  i record dello store legacy
   * @param {Array} orders    i record già presenti in orders
   * @returns {{ daScrivere: Array, conteggi: Object, saltati: Array }}
   */
  function pianifica(pipeline, orders) {
    var daPipeline = Array.isArray(pipeline) ? pipeline : [];
    var daOrders = Array.isArray(orders) ? orders : [];

    /* Gli id già occupati in orders, e quelli già migrati in una esecuzione
       precedente: la migrazione dev'essere ripetibile senza duplicare nulla. */
    var idOccupati = Object.create(null);
    var giaMigrati = Object.create(null);
    var idOrdini = Object.create(null);

    daOrders.forEach(function (o) {
      if (!o) return;
      if (o.id != null) { idOccupati[o.id] = true; idOrdini[o.id] = true; }
      if (o._migratoDa && o._migratoDa.store === 'pipeline' && o._migratoDa.id != null) {
        giaMigrati[o._migratoDa.id] = true;
      }
    });

    var prossimoId = 1;
    (function () {
      var massimo = 0;
      daOrders.forEach(function (o) { var n = num(o && o.id, 0); if (n > massimo) massimo = n; });
      daPipeline.forEach(function (p) { var n = num(p && p.id, 0); if (n > massimo) massimo = n; });
      prossimoId = massimo + 1;
    })();

    var daScrivere = [];
    var saltati = [];
    var conteggi = { pipeline: daPipeline.length, ordiniPrima: daOrders.length, mirror: 0, giaMigrati: 0, orfani: 0, divergenti: 0, illeggibili: 0 };

    daPipeline.forEach(function (p) {
      if (!p || typeof p !== 'object') {
        conteggi.illeggibili += 1;
        saltati.push({ record: p, motivo: 'record illeggibile' });
        return;
      }

      if (p.id != null && giaMigrati[p.id]) {
        conteggi.giaMigrati += 1;
        saltati.push({ id: p.id, motivo: 'già migrato in una esecuzione precedente' });
        return;
      }

      var haOriginale = p._source === 'orders' && p._sourceId != null;

      if (haOriginale && idOrdini[p._sourceId]) {
        /* Mirror con l'originale ancora presente: orders è già la verità. */
        conteggi.mirror += 1;
        saltati.push({ id: p.id, motivo: 'copia di orders #' + p._sourceId });
        return;
      }

      /* Da qui in poi il record va salvato: o non è mai stato in orders
         (orfano), o il suo originale è sparito e questa è l'ultima copia
         (divergente). In entrambi i casi perderlo sarebbe una perdita di dati. */
      if (haOriginale) conteggi.divergenti += 1; else conteggi.orfani += 1;

      var id = prossimoId;
      while (idOccupati[id]) id += 1;
      idOccupati[id] = true;
      prossimoId = id + 1;

      daScrivere.push(normalizza(p, id));
    });

    conteggi.migrati = daScrivere.length;
    conteggi.ordiniDopo = conteggi.ordiniPrima + daScrivere.length;

    return { versione: VERSIONE, daScrivere: daScrivere, conteggi: conteggi, saltati: saltati };
  }

  /**
   * Verifica che l'esito sia quello previsto. Una migrazione che non si
   * verifica è una speranza: qui si contano i record, e un conteggio che non
   * torna è un errore, non un avviso.
   */
  function verifica(piano, ordiniDopo) {
    var effettivi = Array.isArray(ordiniDopo) ? ordiniDopo.length : -1;
    var atteso = piano.conteggi.ordiniDopo;
    var problemi = [];

    if (effettivi !== atteso) {
      problemi.push('ordini attesi ' + atteso + ', trovati ' + effettivi);
    }

    /* Nessun record migrato può essere sparito, e nessuno può essere doppio. */
    var visti = Object.create(null);
    var duplicati = 0;
    (ordiniDopo || []).forEach(function (o) {
      if (!o || o.id == null) return;
      if (visti[o.id]) duplicati += 1;
      visti[o.id] = true;
    });
    if (duplicati) problemi.push(duplicati + ' id duplicati in orders');

    piano.daScrivere.forEach(function (r) {
      if (!visti[r.id]) problemi.push('record migrato non trovato: #' + r.id);
    });

    return { ok: problemi.length === 0, problemi: problemi };
  }

  /* ── Esecuzione ───────────────────────────────────────────────────────────
     Legge, salva un checkpoint, applica, verifica, e solo allora segna la
     migrazione come fatta. Se la verifica fallisce il contrassegno non viene
     scritto: alla prossima apertura si riprova, invece di dare per riuscita
     una migrazione che non lo è. */
  var CONTRASSEGNO = 'ingly_migrazione_' + VERSIONE;

  function fatta() {
    try { return !!(global.localStorage && global.localStorage.getItem(CONTRASSEGNO)); }
    catch (e) { return false; }
  }

  function esegui(idb, opzioni) {
    var o = opzioni || {};
    if (!idb || !idb.getAll || !idb.put) {
      return Promise.resolve({ ok: false, motivo: 'IndexedDB non disponibile' });
    }
    if (!o.forza && fatta()) return Promise.resolve({ ok: true, saltata: true, motivo: 'già eseguita' });

    return Promise.all([
      idb.getAll('pipeline').catch(function () { return []; }),
      idb.getAll('orders').catch(function () { return []; }),
    ]).then(function (r) {
      var piano = pianifica(r[0], r[1]);
      if (!piano.daScrivere.length) {
        segna();
        return { ok: true, piano: piano, scritti: 0, motivo: 'niente da migrare' };
      }

      /* Checkpoint prima di toccare qualunque cosa: se la scrittura va male a
         metà, lo stato di partenza resta recuperabile. */
      var checkpoint = { quando: new Date().toISOString(), versione: VERSIONE, orders: r[1], pipeline: r[0] };
      var salvato = true;
      try {
        if (global.Ingly && global.Ingly.Storage) {
          salvato = global.Ingly.Storage.set('ingly_checkpoint_' + VERSIONE, checkpoint).ok;
        } else {
          global.localStorage.setItem('ingly_checkpoint_' + VERSIONE, JSON.stringify(checkpoint));
        }
      } catch (e) { salvato = false; }

      if (!salvato && !o.senzaCheckpoint) {
        return { ok: false, piano: piano, motivo: 'checkpoint non salvato: migrazione non avviata' };
      }

      var catena = Promise.resolve();
      piano.daScrivere.forEach(function (rec) {
        catena = catena.then(function () { return idb.put('orders', rec); });
      });

      return catena
        .then(function () { return idb.getAll('orders').catch(function () { return null; }); })
        .then(function (dopo) {
          var v = verifica(piano, dopo);
          if (v.ok) segna();
          return { ok: v.ok, piano: piano, scritti: piano.daScrivere.length, verifica: v };
        })
        .catch(function (e) {
          if (global.Ingly && global.Ingly.Errors) global.Ingly.Errors.log('migrazione pipeline', e);
          return { ok: false, piano: piano, motivo: (e && e.message) || String(e) };
        });
    });
  }

  function segna() {
    try { global.localStorage.setItem(CONTRASSEGNO, new Date().toISOString()); } catch (e) { /* senza contrassegno si ripete: è il male minore */ }
  }

  global.InglyMigrazionePipeline = {
    VERSIONE: VERSIONE,
    CONTRASSEGNO: CONTRASSEGNO,
    fatta: fatta,
    esegui: esegui,
    STADI: STADI,
    normalizzaStadio: normalizzaStadio,
    normalizza: normalizza,
    pianifica: pianifica,
    verifica: verifica,
  };
})(typeof window !== 'undefined' ? window : globalThis);

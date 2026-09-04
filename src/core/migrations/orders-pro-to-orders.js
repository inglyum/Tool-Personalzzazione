/* ═══════════════════════════════════════════════════════════════════════════
   MIGRAZIONE · ingly_orders_pro_v1 → orders
   ═══════════════════════════════════════════════════════════════════════════

   `OrderTracker` (patch 083) tiene i suoi ordini in `localStorage`, sotto la
   chiave `ingly_orders_pro_v1`, con stati propri. Non è un mirror di `orders`
   come lo era `pipeline`: è un archivio **indipendente**, che `orders` non ha
   mai visto e che non ha mai visto `orders`.

   Ci si finisce dentro per due strade, e la seconda è quella che pesa:

     · l'import CSV/Etsy (patch 084);
     · la conferma di un preventivo Laser B2B (patch 094), che crea l'ordine
       qui e scrive `orderId` sul preventivo.

   Un ordine nato da un preventivo Laser B2B non compariva in Ordini. Non era
   perso — era in un secondo cassetto che nessuna vista apriva.

   Due regole guidano la deduplica, e sono diverse fra loro:

     1. **`quoteId`**: un preventivo genera **un solo** ordine. Se `orders` ha
        già un record con lo stesso `quoteId`, questo non è un secondo ordine:
        è lo stesso ordine visto dall'altro cassetto, e non si duplica.
     2. **`_migratoDa`**: una seconda esecuzione non riscrive ciò che la prima
        ha già portato.

   Lo store legacy non viene mai svuotato — stessa disciplina della migrazione
   `pipeline`: resta come sorgente, così una seconda esecuzione può accorgersi
   di ciò che la prima non ha visto.

   La funzione è pura: decide, non scrive.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = 'orders-pro-to-orders-v1';
  var CHIAVE_LEGACY = 'ingly_orders_pro_v1';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };

  /* Gli stati di OrderTracker non sono quelli di GestioneOrdini.STATES, e non
     passavano da `_normalizeState()`. La tabella è esplicita perché una
     traduzione sbagliata sposta un ordine di fase senza che nessuno lo veda. */
  var STATI = {
    draft: 'preventivo', bozza: 'preventivo', quote: 'preventivo',
    sent: 'inviato', inviato: 'inviato',
    confirmed: 'accettato', confermato: 'accettato', accepted: 'accettato',
    in_progress: 'produzione', inprogress: 'produzione', production: 'produzione',
    working: 'produzione', wip: 'produzione', lavorazione: 'produzione',
    delivered: 'completato', consegnato: 'completato', ready: 'completato',
    done: 'completato', completed: 'completato', completato: 'completato',
    paid: 'venduto', pagato: 'venduto', sold: 'venduto', invoiced: 'venduto',
    cancelled: 'annullato', canceled: 'annullato', annullato: 'annullato',
    rejected: 'rifiutato', rifiutato: 'rifiutato',
  };

  function normalizzaStato(v) {
    var k = String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, '_');
    return STATI[k] || 'preventivo';
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
   * Porta un record di OrderTracker nella forma che `orders` si aspetta.
   * I campi che non si possono ricavare restano vuoti o `null`: non si
   * inventa una scadenza che il record non aveva.
   */
  function normalizza(record, nuovoId) {
    var r = record || {};
    var stato = normalizzaStato(r.status || r.stage);
    var creato = primaData(r.created, r.createdAt, r.date, r.data);
    /* La descrizione di OrderTracker fa da titolo; il prodotto, se c'è, è più
       specifico e ha la precedenza. */
    var titolo = r.product || r.description || r.desc || r.name || 'Ordine';

    return {
      id: nuovoId,
      clientName: r.client || r.clientName || r.cliente || '',
      clientId: r.clientId != null ? r.clientId : null,
      phone: r.phone || '',
      name: titolo,
      description: r.description || r.desc || '',
      total: num(r.total, num(r.amount, num(r.value, 0))),
      value: num(r.total, num(r.amount, num(r.value, 0))),
      quoteId: r.quoteId != null ? r.quoteId : null,
      channel: r.channel || '',
      stage: stato,
      status: stato,
      priority: r.priority || 'normal',
      dueDate: primaData(r.dueDate, r.deadline, r.scadenza) || '',
      notes: r.notes || r.note || '',
      createdAt: creato,
      updatedAt: primaData(r.updatedAt, r.updated) || creato,
      source: 'order_tracker',
      /* Lo storico non si inventa: si registra che il record arriva da qui, e
         con quale stato è arrivato. */
      _history: [{ from: null, to: stato, ts: creato, note: 'Migrato da Avanzamento ordini' }],
      _migratoDa: { store: CHIAVE_LEGACY, id: r.id != null ? r.id : null, versione: VERSIONE },
    };
  }

  /**
   * Decide che cosa migrare. Non scrive niente.
   *
   * @param {Array} legacy  i record di ingly_orders_pro_v1
   * @param {Array} orders  i record già presenti in orders
   */
  function pianifica(legacy, orders) {
    var daLegacy = Array.isArray(legacy) ? legacy : [];
    var daOrders = Array.isArray(orders) ? orders : [];

    var giaMigrati = Object.create(null);
    var quoteOccupati = Object.create(null);
    var idOccupati = Object.create(null);

    daOrders.forEach(function (o) {
      if (!o) return;
      if (o.id != null) idOccupati[o.id] = true;
      if (o.quoteId != null && o.quoteId !== '') quoteOccupati[o.quoteId] = true;
      if (o._migratoDa && o._migratoDa.store === CHIAVE_LEGACY && o._migratoDa.id != null) {
        giaMigrati[o._migratoDa.id] = true;
      }
    });

    var massimo = 0;
    daOrders.forEach(function (o) { var n = num(o && o.id, 0); if (n > massimo) massimo = n; });
    daLegacy.forEach(function (o) { var n = num(o && o.id, 0); if (n > massimo) massimo = n; });
    var prossimoId = massimo + 1;

    var daScrivere = [];
    var saltati = [];
    var conteggi = {
      legacy: daLegacy.length, ordiniPrima: daOrders.length,
      migrati: 0, giaMigrati: 0, stessoPreventivo: 0, illeggibili: 0,
    };

    daLegacy.forEach(function (r) {
      if (!r || typeof r !== 'object') {
        conteggi.illeggibili += 1;
        saltati.push({ record: r, motivo: 'record illeggibile' });
        return;
      }
      if (r.id != null && giaMigrati[r.id]) {
        conteggi.giaMigrati += 1;
        saltati.push({ record: r, motivo: 'già migrato' });
        return;
      }
      /* Un preventivo, un ordine. Se orders conosce già questo quoteId, il
         record legacy è lo stesso ordine visto dall'altro cassetto. */
      if (r.quoteId != null && r.quoteId !== '' && quoteOccupati[r.quoteId]) {
        conteggi.stessoPreventivo += 1;
        saltati.push({ record: r, motivo: 'preventivo già collegato a un ordine' });
        return;
      }

      /* L'id non si riusa mai: si prende il primo libero oltre il massimo
         occupato, così due record legacy con lo stesso id non collidono. */
      while (idOccupati[prossimoId]) prossimoId += 1;
      var rec = normalizza(r, prossimoId);
      idOccupati[prossimoId] = true;
      if (rec.quoteId != null && rec.quoteId !== '') quoteOccupati[rec.quoteId] = true;
      prossimoId += 1;

      daScrivere.push(rec);
      conteggi.migrati += 1;
    });

    conteggi.ordiniDopo = conteggi.ordiniPrima + daScrivere.length;
    return { daScrivere: daScrivere, conteggi: conteggi, saltati: saltati };
  }

  /**
   * Conta, non spera. Un conteggio che non torna è un errore, non un avviso.
   */
  function verifica(piano, ordiniDopo) {
    var effettivi = Array.isArray(ordiniDopo) ? ordiniDopo.length : -1;
    var problemi = [];

    if (effettivi !== piano.conteggi.ordiniDopo) {
      problemi.push('ordini attesi ' + piano.conteggi.ordiniDopo + ', trovati ' + effettivi);
    }

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

  var CONTRASSEGNO = 'ingly_migrazione_' + VERSIONE;

  function fatta() {
    try { return !!(global.localStorage && global.localStorage.getItem(CONTRASSEGNO)); }
    catch (e) { return false; }
  }

  function leggiLegacy() {
    try {
      var grezzo = global.localStorage && global.localStorage.getItem(CHIAVE_LEGACY);
      if (!grezzo) return [];
      var v = JSON.parse(grezzo);
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  function esegui(idb, opzioni) {
    var o = opzioni || {};
    if (!idb || !idb.getAll || !idb.put) {
      return Promise.resolve({ ok: false, motivo: 'IndexedDB non disponibile' });
    }
    if (!o.forza && fatta()) return Promise.resolve({ ok: true, saltata: true, motivo: 'già eseguita' });

    var legacy = o.legacy || leggiLegacy();

    return idb.getAll('orders').catch(function () { return []; }).then(function (ordini) {
      var piano = pianifica(legacy, ordini);
      if (!piano.daScrivere.length) {
        segna();
        return { ok: true, piano: piano, scritti: 0, motivo: 'niente da migrare' };
      }

      var checkpoint = { quando: new Date().toISOString(), versione: VERSIONE, orders: ordini, legacy: legacy };
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
          if (global.Ingly && global.Ingly.Errors) global.Ingly.Errors.log('migrazione order_tracker', e);
          return { ok: false, piano: piano, motivo: (e && e.message) || String(e) };
        });
    });
  }

  function segna() {
    try { global.localStorage.setItem(CONTRASSEGNO, new Date().toISOString()); } catch (e) { /* senza contrassegno si ripete: è il male minore */ }
  }

  /* ── Scrittura di un ordine nuovo ────────────────────────────────────────
     Le patch che creavano ordini in `ingly_orders_pro_v1` — l'import CSV e la
     conferma di un preventivo Laser B2B — devono scrivere in `orders`. Non
     ricopiano la traduzione degli stati: la chiedono a chi già la possiede,
     qui, così la tabella resta una sola.

     La regola del preventivo vale anche in scrittura: se `orders` conosce già
     quel `quoteId`, l'ordine esiste, e questa non è una seconda creazione. Si
     restituisce quello, invece di farne un altro. */
  function aggiungi(idb, record) {
    if (!idb || !idb.getAll || !idb.put) return Promise.reject(new Error('IndexedDB non disponibile'));
    var r = record || {};

    return idb.getAll('orders').catch(function () { return []; }).then(function (ordini) {
      var esistenti = Array.isArray(ordini) ? ordini : [];

      if (r.quoteId != null && r.quoteId !== '') {
        var gia = null;
        esistenti.forEach(function (o) { if (o && o.quoteId === r.quoteId) gia = o; });
        if (gia) return { ordine: gia, creato: false };
      }

      /* Chi chiama può proporre un id — serve a chi deve scrivere il legame
         `quoteId ↔ orderId` sul preventivo prima che la scrittura finisca. Si
         accetta solo se libero: un id non si riusa mai. */
      var occupati = Object.create(null);
      var massimo = 0;
      esistenti.forEach(function (o) {
        var n = num(o && o.id, 0);
        if (o && o.id != null) occupati[o.id] = true;
        if (n > massimo) massimo = n;
      });
      var id = (r.id != null && !occupati[r.id]) ? r.id : Math.max(massimo + 1, Date.now());
      var nuovo = normalizza(r, id);
      nuovo.source = r.source || 'order_tracker';

      return idb.put('orders', nuovo).then(function () {
        try { if (global.AppStore && global.AppStore.invalidate) global.AppStore.invalidate('orders'); } catch (e) {}
        try {
          if (global.document && global.CustomEvent) {
            global.document.dispatchEvent(new global.CustomEvent('orderUpdated', { detail: { id: nuovo.id, to: nuovo.stage, order: nuovo } }));
          }
        } catch (e) {}
        return { ordine: nuovo, creato: true };
      });
    });
  }

  global.InglyMigrazioneOrderTracker = {
    VERSIONE: VERSIONE,
    CHIAVE_LEGACY: CHIAVE_LEGACY,
    CONTRASSEGNO: CONTRASSEGNO,
    fatta: fatta,
    esegui: esegui,
    STATI: STATI,
    normalizzaStato: normalizzaStato,
    normalizza: normalizza,
    pianifica: pianifica,
    verifica: verifica,
    leggiLegacy: leggiLegacy,
    aggiungi: aggiungi,
  };
})(typeof window !== 'undefined' ? window : globalThis);

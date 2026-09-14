/* ═══════════════════════════════════════════════════════════════════════════
   REPOSITORY — il dominio smette di sapere che sotto c'è IndexedDB
   ═══════════════════════════════════════════════════════════════════════════

   Oggi i moduli di dominio chiamano `IDB.get('orders', id)` direttamente.
   Funziona, ed è il motivo per cui nessuno l'ha mai toccato. Ma vuol dire che
   il giorno in cui i dati staranno altrove — Supabase, un file, un mock nei
   test — ogni modulo va riaperto.

   Questo strato non sostituisce niente. È un'interfaccia sola, con dietro il
   motore che c'è: `IDB`. Chi vuole continuare a chiamare `IDB` lo fa; chi
   passa di qui potrà cambiare motore senza cambiare codice.

       dominio → Repository → IDB          (oggi)
       dominio → Repository → Supabase     (domani, senza toccare il dominio)

   ── Perché non è un secondo sistema ──────────────────────────────────────

   Non ha una cache sua, non ha un formato suo, non normalizza niente. Ogni
   chiamata finisce sul motore sottostante e restituisce quello che il motore
   restituisce. Se cominciasse a trasformare i record diventerebbe una seconda
   verità, ed è esattamente il difetto da cui questo progetto sta uscendo.

   ── Che cosa aggiunge davvero ────────────────────────────────────────────

   Tre cose che oggi ogni chiamante si scrive da sé, ognuna a modo suo:

     · un errore che non passa inosservato — `{ok, dati, errore}` invece di una
       promessa che a volte rigetta e a volte restituisce `undefined`;
     · `query(filtro)` invece di `getAll` seguito da `filter` ripetuto ovunque;
     · un motore sostituibile, che è il punto di tutto.

   `production` e `payments` non hanno un archivio proprio: sono viste sugli
   ordini e sulle vendite. Dargliene uno vorrebbe dire duplicare i dati, e il
   mandato lo vieta — giustamente.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  /* Il motore predefinito: quello che c'è. Si sostituisce con `usaMotore()`,
     che è l'unica ragione per cui questo file esiste. */
  function motorePredefinito() {
    var I = global.IDB;
    if (!I) return null;
    return {
      nome: 'IndexedDB',
      get: function (store, id) { return I.get(store, id); },
      getAll: function (store) { return I.getAll(store); },
      put: function (store, rec) { return I.put(store, rec); },
      del: function (store, id) {
        if (typeof I.del === 'function') return I.del(store, id);
        if (typeof I.remove === 'function') return I.remove(store, id);
        return Promise.reject(new Error('il motore non sa cancellare'));
      },
    };
  }

  var _motore = null;
  function motore() {
    if (_motore) return _motore;
    return motorePredefinito();
  }
  /** Sostituisce il motore — per i test, o il giorno in cui i dati staranno
      altrove. Passare `null` rimette quello predefinito. */
  function usaMotore(m) { _motore = m || null; return motore(); }

  function ok(dati) { return { ok: true, dati: dati, errore: null }; }
  function ko(errore) {
    return { ok: false, dati: null, errore: String((errore && errore.message) || errore) };
  }

  /**
   * Un repository per un archivio. Sempre la stessa forma, qualunque sia
   * l'archivio: chi impara a usarne uno li sa usare tutti.
   */
  function crea(store) {
    function m() {
      var x = motore();
      if (!x) throw new Error('nessun motore di archiviazione disponibile');
      return x;
    }
    return {
      store: store,
      async get(id) {
        try { return ok(await m().get(store, id)); } catch (e) { return ko(e); }
      },
      async getAll() {
        try { return ok((await m().getAll(store)) || []); } catch (e) { return ko(e); }
      },
      async put(record) {
        try { return ok(await m().put(store, record)); } catch (e) { return ko(e); }
      },
      async remove(id) {
        try { return ok(await m().del(store, id)); } catch (e) { return ko(e); }
      },
      /**
       * `query({stage:'produzione'})` oppure `query(r => r.total > 100)`.
       * Filtrare qui non è un'ottimizzazione — il motore legge comunque tutto
       * — è togliere dalle chiamanti dieci copie dello stesso `filter`.
       */
      async query(filtro) {
        var r = await this.getAll();
        if (!r.ok) return r;
        var lista = r.dati;
        if (typeof filtro === 'function') return ok(lista.filter(filtro));
        if (filtro && typeof filtro === 'object') {
          var chiavi = Object.keys(filtro);
          return ok(lista.filter(function (rec) {
            return chiavi.every(function (k) {
              var atteso = filtro[k];
              if (Array.isArray(atteso)) return atteso.indexOf(rec[k]) >= 0;
              return rec[k] === atteso;
            });
          }));
        }
        return ok(lista);
      },
    };
  }

  var orders = crea('orders');
  var sales = crea('sales');

  global.InglyRepository = {
    VERSIONE: VERSIONE,
    crea: crea,
    usaMotore: usaMotore,
    motore: function () { var x = motore(); return x ? x.nome : null; },

    orders: orders,
    quotes: crea('quotes'),
    sales: sales,
    inventory: crea('materials'),
    clients: crea('clients'),
    machines: crea('equipment'),
    ledger: crea('inventory_ledger'),

    /* Viste, non archivi. Un ordine in produzione è un ordine, e una vendita
       da incassare è una vendita: dare loro un archivio proprio vorrebbe dire
       due copie dello stesso record che divergono al primo salvataggio. */
    production: {
      store: 'orders',
      vista: true,
      async inProduzione() {
        var OP = global.InglyOperazioni;
        var r = await orders.getAll();
        if (!r.ok) return r;
        return ok(r.dati.filter(function (o) {
          if (!OP) return false;
          var ops = OP.leggi(o);
          return ops.length > 0 && ops.some(function (x) { return !OP.chiusa(x); });
        }));
      },
      async conRouting() {
        var OP = global.InglyOperazioni;
        var r = await orders.getAll();
        if (!r.ok) return r;
        return ok(r.dati.filter(function (o) { return OP && OP.leggi(o).length > 0; }));
      },
    },
    payments: {
      store: 'sales',
      vista: true,
      async perStato(statoRichiesto) {
        var PG = global.InglyPagamenti;
        var r = await sales.getAll();
        if (!r.ok) return r;
        if (!PG) return ok([]);
        return ok(r.dati.filter(function (v) { return PG.stato(v).stato === statoRichiesto; }));
      },
      async daIncassare() {
        var PG = global.InglyPagamenti;
        var r = await sales.getAll();
        if (!r.ok) return r;
        if (!PG) return ok([]);
        return ok(r.dati.filter(function (v) {
          var s = PG.stato(v).stato;
          return s === 'non_pagato' || s === 'parziale' || s === 'scaduto';
        }));
      },
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ═══════════════════════════════════════════════════════════════════════════
   INVENTORY STORE · il registro incontra il database
   ═══════════════════════════════════════════════════════════════════════════

   `inventory-ledger.js` è puro e non sa cosa sia IndexedDB. Questo file è la
   metà che lo sa, e non contiene aritmetica: chiede al registro e scrive.

   La separazione non è un vezzo. È il motivo per cui il registro si prova con
   sessantacinque test senza aprire un browser, e perché la matematica della
   giacenza esiste in un posto solo — la regola che questo progetto ha già
   pagato quattro volte per imparare.

   Sulla giacenza materializzata: **resta**. `item.quantity` continua a essere
   scritto, perché centinaia di righe la leggono e riscriverle tutte oggi
   sarebbe una migrazione di massa in un colpo solo, che è la cosa che non si
   fa. Ma cambia chi comanda: la scrive il registro, dopo aver registrato il
   movimento, e la riconciliazione dice quando i due non si parlano più.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var STORE = 'inventory_ledger';
  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };

  function L() { return global.InglyInventoryLedger; }
  function db() { return global.IDB; }

  /* Le quattro memorie che oggi tengono una giacenza, con il nome del campo
     che ognuna usa. L'audit ne ha trovato uno in più di quanto sembrasse: lo
     store `inventory` viene scritto con `stock` dal magazzino e con `quantity`
     dal lettore di codici a barre, e i due non si vedono. */
  var ARCHIVI = [
    { store: 'items', campo: 'quantity', alternativi: ['qty', 'stock'] },
    { store: 'inventory', campo: 'stock', alternativi: ['quantity'] },
    { store: 'components', campo: 'stock', alternativi: ['quantity'] },
    { store: 'gadgets', campo: 'stock', alternativi: ['quantity'] },
  ];

  function giacenzaDi(rec, archivio) {
    if (rec[archivio.campo] != null) return num(rec[archivio.campo]);
    for (var i = 0; i < archivio.alternativi.length; i++) {
      if (rec[archivio.alternativi[i]] != null) return num(rec[archivio.alternativi[i]]);
    }
    return 0;
  }

  /** La chiave di un articolo nel registro: store e id, perché gli id si
      ripetono fra archivi diversi. */
  function chiave(store, id) { return String(store) + ':' + String(id); }

  async function tutti() {
    if (!db()) return [];
    return await db().getAll(STORE).catch(function () { return []; });
  }

  async function perArticolo(itemKey) {
    var m = await tutti();
    return L().filtra(m, itemKey, null);
  }

  /**
   * Registra un movimento. È l'unico modo di cambiare una giacenza.
   *
   * Non legge-modifica-scrive la quantità: **aggiunge** un movimento e poi
   * ricalcola. Due chiamate concorrenti producono due movimenti, non una
   * sovrascrittura — che è tutto il punto dell'esercizio.
   */
  async function registra(movimento, opzioni) {
    var o = opzioni || {};
    var Led = L();
    if (!Led || !db()) return { ok: false, motivo: 'registro non disponibile' };

    var m = movimento || {};
    var itemKey = m.itemKey || chiave(m.store || 'items', m.itemId);

    /* La quantità di partenza si prende dal **registro**, non dal record: è
       la sola che non può essere stata scritta da qualcun altro. */
    var esistenti = await perArticolo(itemKey);
    var stato = Led.ricostruisci(esistenti, itemKey, m.warehouseId || 'default');

    var controllo = Led.valida(m, { costoFacoltativo: true });
    if (!controllo.valido) return { ok: false, motivo: controllo.errori.join('; '), errori: controllo.errori };

    var tx = Led.crea(Object.assign({}, m, { itemId: itemKey }), stato.quantity);
    if (!tx) return { ok: false, motivo: 'movimento non costruibile' };

    await db().put(STORE, JSON.parse(JSON.stringify(tx)));

    /* La giacenza materializzata segue il registro, non lo precede. */
    if (o.materializza !== false) await materializza(m.store || 'items', m.itemId, itemKey, m.warehouseId);

    return { ok: true, movimento: tx, avvisi: controllo.avvisi };
  }

  /** Riscrive la quantità del record da ciò che dice il registro. */
  async function materializza(store, id, itemKey, warehouseId) {
    var archivio = ARCHIVI.filter(function (a) { return a.store === store; })[0] || ARCHIVI[0];
    var rec = await db().get(store, isNaN(+id) ? id : +id).catch(function () { return null; });
    if (!rec) return null;
    var stato = L().ricostruisci(await perArticolo(itemKey || chiave(store, id)), itemKey || chiave(store, id), warehouseId || null);
    rec[archivio.campo] = stato.quantity;
    /* Il campo alternativo si allinea invece di restare indietro: è il modo
       in cui il lettore di codici a barre e il magazzino hanno smesso di
       parlarsi, e finché entrambi i nomi esistono vanno tenuti d'accordo. */
    archivio.alternativi.forEach(function (alt) { if (rec[alt] != null) rec[alt] = stato.quantity; });
    rec.updatedAt = new Date().toISOString();
    rec.ledgerSync = { at: rec.updatedAt, movimenti: stato.movimenti, quantity: stato.quantity };
    await db().put(store, rec);
    return rec;
  }

  /* ── Migrazione ────────────────────────────────────────────────────────────
     Un saldo di apertura per ogni articolo con giacenza, e nient'altro. Non si
     inventa una storia: si dichiara che al giorno tale c'era quel numero, e da
     lì in poi si registra. Idempotente: chi ha già la sua apertura non ne
     riceve una seconda. */
  async function pianificaApertura() {
    var Led = L();
    if (!Led || !db()) return { possibile: false, motivo: 'registro non disponibile' };
    var esistenti = await tutti();
    var giaAperti = {};
    esistenti.forEach(function (m) { if (m.type === 'OPENING_BALANCE') giaAperti[String(m.itemId)] = true; });

    var piano = [];
    for (var i = 0; i < ARCHIVI.length; i++) {
      var a = ARCHIVI[i];
      var rec = await db().getAll(a.store).catch(function () { return []; });
      (rec || []).forEach(function (r) {
        if (!r || r.id == null) return;
        var k = chiave(a.store, r.id);
        var q = giacenzaDi(r, a);
        if (!(q > 0)) return;
        if (giaAperti[k]) return;
        piano.push({ itemKey: k, store: a.store, id: r.id, name: r.name || null,
          unit: r.unit || null, quantity: q, costPrice: r.costPrice != null ? num(r.costPrice) : null });
      });
    }
    return { possibile: true, piano: piano, giaAperti: Object.keys(giaAperti).length };
  }

  async function eseguiApertura(opzioni) {
    var o = opzioni || {};
    var Led = L();
    var p = await pianificaApertura();
    if (!p.possibile) return p;
    var scritti = 0;
    for (var i = 0; i < p.piano.length; i++) {
      var v = p.piano[i];
      var tx = Led.apertura({ id: v.itemKey, name: v.name, unit: v.unit, quantity: v.quantity, costPrice: v.costPrice },
        { warehouseId: o.warehouseId || 'default', quando: o.quando });
      if (!tx) continue;
      await db().put(STORE, JSON.parse(JSON.stringify(tx)));
      scritti++;
    }
    return { possibile: true, scritti: scritti, pianificati: p.piano.length };
  }

  /* ── Riconciliazione ──────────────────────────────────────────────────── */
  async function riconcilia() {
    var Led = L();
    if (!Led || !db()) return { possibile: false };
    var movimenti = await tutti();
    var materializzate = [];
    for (var i = 0; i < ARCHIVI.length; i++) {
      var a = ARCHIVI[i];
      var rec = await db().getAll(a.store).catch(function () { return []; });
      (rec || []).forEach(function (r) {
        if (!r || r.id == null) return;
        materializzate.push({ itemId: chiave(a.store, r.id), warehouseId: 'default',
          itemName: r.name || null, quantity: giacenzaDi(r, a) });
      });
    }
    return Object.assign({ possibile: true }, Led.riconcilia(movimenti, materializzate));
  }

  /* ── Le scorciatoie che i moduli chiamano ──────────────────────────────── */
  function scorciatoia(tipo) {
    return function (store, id, quantita, extra) {
      return registra(Object.assign({
        type: tipo, store: store, itemId: id, quantity: quantita,
      }, extra || {}));
    };
  }

  global.InglyInventory = {
    STORE: STORE,
    ARCHIVI: ARCHIVI,
    chiave: chiave,
    tutti: tutti,
    perArticolo: perArticolo,
    registra: registra,
    materializza: materializza,
    pianificaApertura: pianificaApertura,
    eseguiApertura: eseguiApertura,
    riconcilia: riconcilia,

    acquista: scorciatoia('PURCHASE'),
    consuma: scorciatoia('CONSUMPTION'),
    scarta: scorciatoia('WASTE'),
    vendi: scorciatoia('SALE'),
    rendi: scorciatoia('RETURN'),
    produci: scorciatoia('PRODUCTION'),
    rettifica: scorciatoia('ADJUSTMENT'),

    /** Il trasferimento: due movimenti, una operazione, mai uno solo. */
    async trasferisci(store, id, da, a, quantita, extra) {
      var op = 'tr' + Date.now().toString(36);
      var uscita = await registra(Object.assign({ type: 'TRANSFER_OUT', store: store, itemId: id,
        warehouseId: da, quantity: quantita, operationId: op, referenceType: 'TRANSFER', referenceId: op }, extra || {}), { materializza: false });
      if (!uscita.ok) return uscita;
      var entrata = await registra(Object.assign({ type: 'TRANSFER_IN', store: store, itemId: id,
        warehouseId: a, quantity: quantita, operationId: op, referenceType: 'TRANSFER', referenceId: op }, extra || {}), { materializza: false });
      await materializza(store, id, chiave(store, id), null);
      return { ok: entrata.ok, operationId: op, movimenti: [uscita.movimento, entrata.movimento] };
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);

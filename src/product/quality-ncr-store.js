/* ═══════════════════════════════════════════════════════════════════════════
   NON CONFORMITÀ STORE · il registro qualità incontra il database
   ═══════════════════════════════════════════════════════════════════════════

   `quality-ncr.js` è puro. Questo file scrive in `quality_ncr` (IDB), uno
   store nuovo e vuoto — nessun dato esistente cambia forma. Non tocca
   `orders`: una non conformità non modifica l'ordine a cui appartiene, lo
   referenzia soltanto, per lo stesso motivo per cui il registro di
   magazzino non riscrive mai l'articolo che descrive.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var STORE = 'quality_ncr';

  function N() { return global.InglyQualityNCR; }
  function db() { return global.IDB; }

  async function tutte() {
    if (!db()) return [];
    return await db().getAll(STORE).catch(function () { return []; });
  }

  async function perOrdine(orderId) {
    var Motore = N();
    if (!Motore) return [];
    return Motore.diOrdine(await tutte(), orderId);
  }

  /** Crea e persiste una non conformità. Unico punto di scrittura per una
      non conformità nuova. */
  async function crea(ncrInput) {
    var Motore = N();
    if (!Motore || !db()) return { ok: false, motivo: 'motore qualità non disponibile' };

    var esistenti = await tutte();
    var v = Motore.valida(ncrInput, { idEsistenti: esistenti.map(function (n) { return n.id; }) });
    if (!v.valido) return { ok: false, motivo: v.errori.join('; '), errori: v.errori };

    var ncr = Motore.crea(ncrInput);
    if (!ncr) return { ok: false, motivo: 'non conformità non costruibile' };

    await db().put(STORE, JSON.parse(JSON.stringify(ncr)));
    return { ok: true, ncr: ncr };
  }

  /** Chiude una non conformità già registrata con una disposizione. */
  async function chiudi(id, esito) {
    var Motore = N();
    if (!Motore || !db()) return { ok: false, motivo: 'motore qualità non disponibile' };

    var ncr = await db().get(STORE, id).catch(function () { return null; });
    if (!ncr) return { ok: false, motivo: 'non conformità inesistente: ' + id };

    var risultato = Motore.chiudi(ncr, esito);
    if (!risultato.ok) return risultato;

    await db().put(STORE, JSON.parse(JSON.stringify(risultato.ncr)));
    return { ok: true, ncr: risultato.ncr };
  }

  global.InglyQualityNCRStore = {
    STORE: STORE,
    tutte: tutte,
    perOrdine: perOrdine,
    crea: crea,
    chiudi: chiudi,
  };
})(typeof window !== 'undefined' ? window : globalThis);

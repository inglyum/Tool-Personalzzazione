/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCT BOM STORE · la distinta base incontra il database
   ═══════════════════════════════════════════════════════════════════════════

   `product-bom.js` è puro. Questo file scrive in `product_bom` (IDB), store
   nuovo e vuoto. Una distinta non si aggiorna in-place: `salvaNuovaVersione`
   crea sempre un nuovo record con `version` incrementata, per la stessa
   ragione per cui il registro di magazzino non riscrive un movimento — chi
   ha già espanso la versione 1 in un ordine non deve vedersela cambiare
   sotto perché qualcuno ha corretto la versione 2.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var STORE = 'product_bom';

  function B() { return global.InglyProductBOM; }
  function db() { return global.IDB; }

  async function tutte() {
    if (!db()) return [];
    return await db().getAll(STORE).catch(function () { return []; });
  }

  async function delProdotto(productId) {
    var tutti = await tutte();
    return tutti.filter(function (b) { return String(b.productId) === String(productId); });
  }

  /** L'ultima versione di una distinta per un prodotto — quella che un
      nuovo ordine deve espandere. */
  async function corrente(productId) {
    var versioni = await delProdotto(productId);
    if (!versioni.length) return null;
    return versioni.slice().sort(function (a, b) { return (b.version || 0) - (a.version || 0); })[0];
  }

  /** Crea la prima versione di una distinta per un prodotto che non ne ha
      ancora una. */
  async function crea(bomInput) {
    var Motore = B();
    if (!Motore || !db()) return { ok: false, motivo: 'motore distinta base non disponibile' };

    var esistenti = await tutte();
    var v = Motore.valida(bomInput, { idEsistenti: esistenti.map(function (b) { return b.id; }) });
    if (!v.valido) return { ok: false, motivo: v.errori.join('; '), errori: v.errori };

    var bom = Motore.crea(bomInput);
    if (!bom) return { ok: false, motivo: 'distinta non costruibile' };

    await db().put(STORE, JSON.parse(JSON.stringify(bom)));
    return { ok: true, bom: bom };
  }

  /** Una nuova versione della distinta di un prodotto. Non tocca le
      versioni precedenti — restano leggibili da chi le ha già espanse. */
  async function salvaNuovaVersione(productId, righe, opzioni) {
    var o = opzioni || {};
    var attuale = await corrente(productId);
    return crea({
      productId: productId,
      righe: righe,
      version: (attuale ? attuale.version : 0) + 1,
      note: o.note || null,
    });
  }

  global.InglyProductBOMStore = {
    STORE: STORE,
    tutte: tutte,
    delProdotto: delProdotto,
    corrente: corrente,
    crea: crea,
    salvaNuovaVersione: salvaNuovaVersione,
  };
})(typeof window !== 'undefined' ? window : globalThis);

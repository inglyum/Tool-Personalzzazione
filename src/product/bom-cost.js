/* ═══════════════════════════════════════════════════════════════════════════
   BOM COST · il costo aggregato di una distinta multi-tecnologia
   ═══════════════════════════════════════════════════════════════════════════

   Multi-Tech BOM, rilascio 4. `InglyCostEngine` preventiva **una** tecnologia
   con un profilo che conosce i suoi driver fisici (grammi, potenza laser,
   velocità di taglio...) — riscriverlo per sommare cinque tecnologie sulla
   stessa distinta vorrebbe dire inventare un profilo combinato che nessuna
   lavorazione reale userebbe da sola, sul file con la storia di difetti
   critici sui totali più lunga di questo codice (vedi `quote-to-order.js`).

   Questo modulo non lo tocca. Aggrega invece quello che una distinta
   dichiara — tempo di lavorazione per operazione, quantità di materiale per
   riga — alle tariffe che chi orchestra (lo store, con IDB) gli passa già
   risolte: oraria macchina (`InglyMachineCost`), oraria manodopera
   (`InglyCostProfiles`), costo unitario materiale (magazzino). Puro, come
   `product-bom.js`: nessun IDB qui dentro, solo numeri e la stessa anatomia
   una-tantum/per-pezzo che already tiene onesto il resto del motore.

   Non include overhead, imballo, spedizione: sono costi dell'ordine, non
   della distinta. Aggiungerli qui li farebbe sommare una volta per
   tecnologia invece che una volta sola sull'ordine — esattamente il
   raddoppio che l'anatomia una-tantum/per-pezzo esiste per impedire.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  function pos(v) { var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) && n > 0 ? n : 0; }
  function arr(v) { return v == null ? null : Math.round(v * 100) / 100; }
  function B() { return global.InglyProductBOM; }

  /**
   * Il costo di lavorazione: una voce per operazione dichiarata nella
   * distinta, avviamento (una tantum, si divide per la quantità
   * dell'ordine) e tempo per pezzo (per pezzo, si moltiplica) valorizzati
   * alla tariffa oraria della sua macchina — o della manodopera, quando
   * l'operazione non ha una macchina collegata o la sua tariffa non è nota.
   *
   * Una lavorazione senza nessuna tariffa risolvibile resta con `fonte:null`
   * e un `motivo`: non entra nei totali, non genera un numero inventato.
   *
   * @param {Object} bom
   * @param {Object} opzioni
   *   tariffeMacchina    { machineId: eurOra }
   *   manodoperaOraria   eurOra di ripiego, quando la macchina non ha tariffa
   */
  function costoOperazioni(bom, opzioni) {
    var o = opzioni || {};
    var tariffe = o.tariffeMacchina || {};
    var manodoperaOraria = pos(o.manodoperaOraria);
    var Motore = B();
    var righe = Motore ? Motore.righeOperazioni(bom) : [];
    return righe.map(function (r) {
      var tariffaMacchina = r.machineId != null && tariffe[r.machineId] != null ? pos(tariffe[r.machineId]) : null;
      var tariffa = tariffaMacchina != null && tariffaMacchina > 0 ? tariffaMacchina
        : (manodoperaOraria > 0 ? manodoperaOraria : null);
      var fonte = tariffa == null ? null : (tariffaMacchina != null ? 'macchina' : 'manodopera');
      var oreAvviamento = pos(r.setupTime) / 60;
      var orePezzo = pos(r.timePerUnit) / 60;
      return {
        category: 'labor',
        id: 'bom-op-costo-' + (r.sequence || 0),
        label: r.technology + (r.machineId != null ? ' · macchina ' + r.machineId : ''),
        technology: r.technology,
        machineId: r.machineId != null ? r.machineId : null,
        unaTantum: fonte ? arr(oreAvviamento * tariffa) : null,
        perPezzo: fonte ? arr(orePezzo * tariffa) : null,
        tariffaOraria: fonte ? tariffa : null,
        fonte: fonte,
        motivo: fonte ? null : 'nessuna tariffa oraria nota per questa lavorazione (né macchina né manodopera)',
      };
    });
  }

  /**
   * Il costo materiali della distinta, alla quantità dell'ordine — stessa
   * forma di `InglyProductBOM.espandiMateriali`, col costo unitario risolto
   * da chi chiama. Un articolo senza costo unitario noto resta senza
   * `perPezzo`: mai un prezzo indovinato per un materiale che non lo dichiara.
   *
   * @param {Object} opzioni  costiMateriali: { itemKey: eurUnità }
   */
  function costoMateriali(bom, quantitaOrdine, opzioni) {
    var o = opzioni || {};
    var costi = o.costiMateriali || {};
    var Motore = B();
    if (!Motore) return [];
    return Motore.espandiMateriali(bom, quantitaOrdine).map(function (r) {
      var unitCost = r.itemKey != null && costi[r.itemKey] != null ? pos(costi[r.itemKey]) : null;
      return {
        category: 'material',
        id: 'bom-mat-costo-' + r.itemKey,
        itemKey: r.itemKey, label: r.label, unit: r.unit,
        quantityPerPiece: r.quantityPerPiece, quantity: r.quantity,
        unitCost: unitCost,
        unaTantum: null,
        perPezzo: unitCost != null ? arr(r.quantityPerPiece * unitCost) : null,
        fonte: unitCost != null ? 'magazzino' : null,
        motivo: unitCost != null ? null : 'costo unitario non noto per questo articolo',
      };
    });
  }

  /**
   * Il costo aggregato di una distinta multi-tecnologia, alla quantità di
   * un ordine: ogni operazione e ogni materiale entra **una sola volta** —
   * la distinta stessa impedisce di dichiarare due volte la stessa riga.
   * `completo:false` quando almeno una voce non ha un costo risolvibile: il
   * totale esiste comunque, ma è dichiaratamente parziale, mai silenzioso.
   */
  function espandi(bom, quantitaOrdine, opzioni) {
    var q = Math.max(1, pos(quantitaOrdine) || 1);
    var voci = costoOperazioni(bom, opzioni).concat(costoMateriali(bom, q, opzioni));
    var valorizzate = voci.filter(function (v) { return v.unaTantum != null || v.perPezzo != null; });
    var ignote = voci.filter(function (v) { return valorizzate.indexOf(v) < 0; });

    var totaleUnaTantum = valorizzate.reduce(function (a, v) { return a + (v.unaTantum || 0); }, 0);
    var totalePerPezzo = valorizzate.reduce(function (a, v) { return a + (v.perPezzo || 0); }, 0);
    var costoPerPezzo = totalePerPezzo + (totaleUnaTantum / q);

    return {
      productId: bom.productId, bomId: bom.id, bomVersion: bom.version,
      quantita: q,
      tecnologie: B() ? B().tecnologie(bom) : [],
      voci: voci,
      completo: ignote.length === 0,
      nonValorizzate: ignote.map(function (v) { return { label: v.label || v.itemKey, motivo: v.motivo }; }),
      unaTantum: arr(totaleUnaTantum),
      perPezzo: arr(totalePerPezzo),
      costoPerPezzo: arr(costoPerPezzo),
      motivo: ignote.length
        ? (ignote.length + ' voci senza tariffa o costo noto: il totale è parziale')
        : null,
    };
  }

  global.InglyBOMCost = {
    VERSIONE: VERSIONE,
    costoOperazioni: costoOperazioni,
    costoMateriali: costoMateriali,
    espandi: espandi,
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ═══════════════════════════════════════════════════════════════════════════
   DISTINTA BASE DI PRODOTTO · un prodotto multi-tecnologia si dichiara una volta
   ═══════════════════════════════════════════════════════════════════════════

   Il catalogo (`product-builder.js`) sa scrivere un prodotto con **una**
   tecnologia (`tech`), **un** materiale (`material`) e un costo già calcolato
   una volta per tutte (`costPrice`). Corretto per un portachiavi tagliato al
   laser. Non basta per un prodotto vero come «orologio in legno + incisione
   laser + stampa UV + assemblaggio»: quattro lavorazioni, materiali diversi,
   nessun posto dove scriverle insieme e riusarle al prossimo ordine.

   Questo modulo aggiunge quella dichiarazione — una distinta base per
   prodotto, riga per riga — e nient'altro. Non calcola un costo (lo fa
   `InglyCostEngine`, leggendo i profili tecnologia), non genera un routing da
   solo (lo fa `InglyOperazioni`, a cui questo modulo **passa** le righe già
   nella forma che sa leggere), non impegna magazzino (lo fa
   `InglyFabbisogno`/`material-requirement.js`, a cui passa righe nella stessa
   forma di una voce di `costBreakdown`). Una distinta base non è un quarto
   motore: è l'anagrafica da cui gli altri tre motori vengono alimentati.

   Due principi, gli stessi di `machine-maintenance.js` e `purchase-order.js`:

   1. **Un prodotto semplice non vede niente di nuovo.** Nessun catalogo
      esistente si rompe: un prodotto senza distinta base continua a
      preventivarsi come ha sempre fatto. La distinta è per chi ne ha
      bisogno, non un passaggio obbligato.
   2. **Una distinta non si riscrive sopra un ordine già fatto.** `crea()`
      congela; una nuova versione della distinta non tocca gli ordini passati
      — è la stessa disciplina di `order-snapshot.js`: il preventivo di ieri
      resta quello di ieri anche se la ricetta cambia oggi.

   Puro: nessun IDB, nessun DOM. La persistenza è il passo successivo, la UI
   quello dopo ancora — per restare su un pezzo alla volta.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d != null ? d : null); };
  var pos = function (v, d) { var n = num(v, d); return n == null ? null : Math.max(0, n); };
  function ora() { try { return new Date().toISOString(); } catch (e) { return ''; } }

  function congela(o) {
    if (!o || typeof o !== 'object') return o;
    Object.keys(o).forEach(function (k) { congela(o[k]); });
    return Object.freeze(o);
  }

  /* ── I due tipi di riga ───────────────────────────────────────────────────
     Non di più: una distinta base è materiali (cosa si consuma) e operazioni
     (cosa si lavora). Manodopera e spese generali restano dove sono sempre
     state — nei profili economici (`cost-profiles.js`) — una distinta base
     non è il posto per un secondo modo di dichiararle. */
  var TIPI_RIGA = {
    materiale: { label: 'Materiale' },
    operazione: { label: 'Operazione' },
  };

  function validaRiga(r, i) {
    var errori = [];
    var pre = 'riga ' + i + ': ';
    if (!r || !TIPI_RIGA[r.type]) { errori.push(pre + 'tipo sconosciuto: ' + (r && r.type)); return errori; }
    if (r.type === 'materiale') {
      if (r.itemKey == null && r.itemId == null) errori.push(pre + 'materiale senza articolo di magazzino collegato');
      var q = parseFloat(r.quantity);
      if (r.quantity == null || !isFinite(q) || q <= 0) errori.push(pre + 'materiale senza una quantità per pezzo valida');
    } else if (r.type === 'operazione') {
      if (!r.technology) errori.push(pre + 'operazione senza tecnologia dichiarata');
      var st = r.setupTime != null ? parseFloat(r.setupTime) : 0;
      var tp = r.timePerUnit != null ? parseFloat(r.timePerUnit) : 0;
      if (!(st > 0) && !(tp > 0)) errori.push(pre + 'operazione senza un tempo dichiarato (né avviamento né per pezzo)');
    }
    return errori;
  }

  function valida(bom, contesto) {
    var c = contesto || {};
    var b = bom || {};
    var errori = [];

    if (b.productId == null || b.productId === '') errori.push('distinta senza prodotto');
    if (c.prodottiNoti && b.productId != null && c.prodottiNoti.indexOf(String(b.productId)) < 0) {
      errori.push('prodotto inesistente: ' + b.productId);
    }
    var righe = Array.isArray(b.righe) ? b.righe : [];
    if (!righe.length) errori.push('distinta senza righe');
    righe.forEach(function (r, i) { errori.push.apply(errori, validaRiga(r, i)); });
    if (c.idEsistenti && b.id != null && c.idEsistenti.indexOf(String(b.id)) >= 0) {
      errori.push('id già presente nel registro distinte: ' + b.id);
    }

    return { valido: errori.length === 0, errori: errori };
  }

  function rigaCongelata(r) {
    if (r.type === 'materiale') {
      return {
        type: 'materiale',
        itemKey: r.itemKey != null ? String(r.itemKey) : null,
        itemId: r.itemId != null ? r.itemId : null,
        itemStore: r.itemStore || null,
        label: r.label || null,
        unit: r.unit || 'pz',
        quantityPerPiece: pos(r.quantity),
        scrapPct: r.scrapPct != null ? pos(r.scrapPct) : null,
        note: r.note || null,
      };
    }
    return {
      type: 'operazione',
      technology: String(r.technology),
      machineId: r.machineId != null ? r.machineId : null,
      setupTime: r.setupTime != null ? pos(r.setupTime) : 0,
      timePerUnit: r.timePerUnit != null ? pos(r.timePerUnit) : 0,
      sequence: r.sequence != null ? num(r.sequence) : null,
      note: r.note || null,
    };
  }

  /** Una distinta base, congelata alla nascita. Non si corregge dopo: si crea
      una nuova versione (stesso `productId`, `version` successiva) — gli
      ordini che hanno già espanso la versione precedente non ne sono
      toccati, perché ne hanno preso una copia, non un riferimento. */
  function crea(bom) {
    var v = valida(bom);
    if (!v.valido) return null;
    var b = bom;

    return congela({
      id: b.id != null ? String(b.id) : ('bom' + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36)),
      productId: String(b.productId),
      version: b.version != null ? num(b.version) : 1,
      createdAt: b.createdAt || ora(),
      note: b.note || null,
      righe: b.righe.map(rigaCongelata),
    });
  }

  function righeMateriali(bom) {
    return ((bom && bom.righe) || []).filter(function (r) { return r.type === 'materiale'; });
  }
  function righeOperazioni(bom) {
    var ops = ((bom && bom.righe) || []).filter(function (r) { return r.type === 'operazione'; });
    return ops.slice().sort(function (a, b) {
      var sa = a.sequence != null ? a.sequence : 999999, sb = b.sequence != null ? b.sequence : 999999;
      return sa - sb;
    });
  }

  /** Le tecnologie dichiarate dalla distinta, nell'ordine delle operazioni —
      quello che `InglyProduction`/`InglyOperazioni` chiamano un ordine
      «misto» quando sono più di una. */
  function tecnologie(bom) {
    var viste = {};
    var lista = [];
    righeOperazioni(bom).forEach(function (r) {
      if (!viste[r.technology]) { viste[r.technology] = true; lista.push(r.technology); }
    });
    return lista;
  }

  /**
   * Il fabbisogno materiali per un ordine di `quantitaOrdine` pezzi, nella
   * stessa forma di una voce di `costBreakdown` — cosi' che
   * `material-requirement.js` (che legge da lì) possa leggerlo senza un
   * adattatore diverso per ogni fonte. Lo scarto dichiarato (`scrapPct`) si
   * applica qui, non si nasconde nel numero della distinta.
   */
  function espandiMateriali(bom, quantitaOrdine) {
    var q = Math.max(1, pos(quantitaOrdine, 1));
    return righeMateriali(bom).map(function (r) {
      var moltiplicatore = 1 + (r.scrapPct ? r.scrapPct / 100 : 0);
      var perPezzo = pos(r.quantityPerPiece) * moltiplicatore;
      return {
        category: 'material',
        itemKey: r.itemKey || (r.itemStore && r.itemId != null ? r.itemStore + ':' + r.itemId : null),
        itemStore: r.itemStore,
        itemId: r.itemId,
        label: r.label,
        unit: r.unit,
        quantityPerPiece: Math.round(perPezzo * 1000) / 1000,
        quantity: Math.round(perPezzo * q * 1000) / 1000,
        source: 'bom',
      };
    });
  }

  /**
   * Il routing per un ordine di `quantitaOrdine` pezzi, nella forma che
   * `InglyOperazioni.normalizza` sa leggere. Il tempo di un'operazione è
   * avviamento + (tempo a pezzo × pezzi) — la stessa anatomia una-tantum/
   * per-pezzo di `InglyCostEngine`: moltiplicare tutto per la quantità
   * conterebbe l'avviamento una volta per pezzo invece che una volta sola.
   */
  function espandiOperazioni(bom, quantitaOrdine) {
    var q = Math.max(1, pos(quantitaOrdine, 1));
    return righeOperazioni(bom).map(function (r, i) {
      return {
        id: 'bom-op-' + (i + 1),
        sequence: i + 1,
        technology: r.technology,
        machineId: r.machineId,
        estimatedTime: Math.round((pos(r.setupTime) + pos(r.timePerUnit) * q) * 100) / 100,
        status: 'da_fare',
      };
    });
  }

  global.InglyProductBOM = {
    VERSIONE: VERSIONE,
    TIPI_RIGA: TIPI_RIGA,
    valida: valida,
    crea: crea,
    righeMateriali: righeMateriali,
    righeOperazioni: righeOperazioni,
    tecnologie: tecnologie,
    espandiMateriali: espandiMateriali,
    espandiOperazioni: espandiOperazioni,
  };
})(typeof window !== 'undefined' ? window : globalThis);

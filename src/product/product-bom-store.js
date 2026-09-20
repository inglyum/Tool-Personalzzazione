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

  /**
   * Se una distinta è applicabile a questo ordine: una sola riga d'ordine,
   * collegata a un prodotto del catalogo (`catalogId`) che ha una distinta
   * corrente. Restituisce `{ bom, qty }` o `null` — la stessa domanda che
   * si pone sia per il routing sia per il costo, in un posto solo: due
   * copie di questa domanda potrebbero rispondere diversamente alla stessa
   * riga d'ordine, ed è esattamente la classe di difetto (CRM-05b) che
   * questo file evita già per il routing. */
  async function _bomApplicabile(ordine) {
    var righe = Array.isArray(ordine && ordine.items) ? ordine.items : [];
    var riga = righe.length === 1 ? righe[0] : null;
    var catalogId = riga && riga.catalogId != null ? riga.catalogId : null;
    if (catalogId == null) return null;
    var bom = await corrente(catalogId).catch(function () { return null; });
    if (!bom) return null;
    return { bom: bom, qty: Math.max(1, Number(riga.qty) || 1) };
  }

  /**
   * Il routing di un ordine dalla distinta base del prodotto che ordina, se
   * ne ha una applicabile con almeno una riga di lavorazione. Restituisce
   * `null` in ogni altro caso — è il chiamante (oggi due: la transizione a
   * produzione e il pannello produzione) a ricadere su
   * `InglyOperazioni.costruisciDaOrdine`, invariato.

   * Una sola funzione per questa decisione, non una copiata nei due punti
   * che generano un routing: divergerebbe alla prima modifica fatta in uno
   * solo dei due, come già successo altrove in questo codice (CRM-05b). */
  async function routingDaOrdine(ordine) {
    var Motore = B();
    var OP = global.InglyOperazioni;
    if (!Motore || !OP) return null;

    var app = await _bomApplicabile(ordine);
    if (!app) return null;
    var righeOp = Motore.righeOperazioni(app.bom);
    if (!righeOp.length) return null;

    var grezze = Motore.espandiOperazioni(app.bom, app.qty);
    return {
      operations: grezze.map(function (o, i) { return OP.normalizza(o, i); }),
      create: true,
      fonte: 'distinta base',
    };
  }

  /**
   * Il costo tecnico di un ordine secondo la distinta base del suo
   * prodotto — non il preventivo congelato al cliente, non il consuntivo
   * misurato: un terzo numero, «quanto dice la distinta che dovrebbe
   * costare», utile a chi preventiva un prodotto multi-tecnologia con un
   * profilo singolo (oggi l'unico che il catalogo sa dichiarare).
   *
   * Risolve qui — l'unico punto che parla sia con IDB sia coi motori puri —
   * le tariffe che `InglyBOMCost` (puro) riceve già pronte: oraria macchina
   * da `equipment` via `InglyMachineCost`, oraria manodopera dai profili
   * economici del laboratorio, costo materiale dal registro di magazzino
   * (`InglyInventoryCostResolver`, la stessa fonte che il preventivo usa).
   * Restituisce `null` quando non c'è una distinta applicabile — mai un
   * numero costruito su un ordine che non la dichiara.
   */
  async function costoDaOrdine(ordine) {
    var Motore = B();
    var Costo = global.InglyBOMCost;
    if (!Motore || !Costo) return null;

    var app = await _bomApplicabile(ordine);
    if (!app) return null;
    var righeOp = Motore.righeOperazioni(app.bom);
    var righeMat = Motore.righeMateriali(app.bom);
    if (!righeOp.length && !righeMat.length) return null;

    var IDB = db();

    var tariffeMacchina = {};
    if (IDB && global.InglyMachineCost) {
      var macchine = await IDB.getAll('equipment').catch(function () { return []; });
      righeOp.forEach(function (r) {
        if (r.machineId == null || tariffeMacchina[r.machineId] != null) return;
        var m = (macchine || []).filter(function (x) { return String(x.id) === String(r.machineId); })[0];
        if (!m) return;
        try { tariffeMacchina[r.machineId] = global.InglyMachineCost.daCatalogo(m).machineCostPerHour; } catch (e) {}
      });
    }

    var manodoperaOraria = 0;
    if (global.InglyCostProfilesStore) {
      var ingresso = await global.InglyCostProfilesStore.ingresso({ ruolo: 'operatore' }).catch(function () { return null; });
      if (ingresso) manodoperaOraria = ingresso.laborPerHour || 0;
    }

    var costiMateriali = {};
    if (IDB && global.InglyInventoryCostResolver) {
      var movimenti = await IDB.getAll('inventory_ledger').catch(function () { return []; });
      righeMat.forEach(function (r) {
        var chiave = r.itemKey || (r.itemStore && r.itemId != null ? r.itemStore + ':' + r.itemId : null);
        if (!chiave || costiMateriali[chiave] != null) return;
        var esito = global.InglyInventoryCostResolver.risolvi(movimenti, chiave, {});
        if (esito && esito.disponibile) costiMateriali[chiave] = esito.costo;
      });
    }

    return Costo.espandi(app.bom, app.qty, {
      tariffeMacchina: tariffeMacchina,
      manodoperaOraria: manodoperaOraria,
      costiMateriali: costiMateriali,
    });
  }

  /**
   * Il fabbisogno materiali di un ordine dalla distinta base del suo
   * prodotto, se applicabile: le righe materiale espanse sulla quantità
   * ordinata (`InglyProductBOM.espandiMateriali`, già scarto compreso), con
   * la giacenza attuale letta dal registro di magazzino — quanto c'è oggi
   * sullo scaffale, non quanto è impegnato da altri ordini aperti (quel
   * conto, incrociato su tutti gli ordini, resta per un rilascio successivo:
   * qui si vede solo se **questo** ordine potrebbe partire subito).
   *
   * Restituisce `null` quando non c'è una distinta applicabile o non
   * dichiara materiali — nessuna regressione per un ordine che non ha una
   * distinta collegata, che oggi semplicemente non mostra questa sezione.
   */
  async function fabbisognoDaOrdine(ordine) {
    var Motore = B();
    if (!Motore) return null;

    var app = await _bomApplicabile(ordine);
    if (!app) return null;
    var righeMat = Motore.righeMateriali(app.bom);
    if (!righeMat.length) return null;

    var espanse = Motore.espandiMateriali(app.bom, app.qty);
    var IDB = db();
    var L = global.InglyInventoryLedger;
    var movimenti = (IDB && L) ? await IDB.getAll('inventory_ledger').catch(function () { return []; }) : null;

    var righe = espanse.map(function (r) {
      var giacenza = null;
      if (movimenti && L) {
        try { giacenza = L.ricostruisci(movimenti, r.itemKey, null).quantity; } catch (e) {}
      }
      return {
        itemKey: r.itemKey, itemStore: r.itemStore, itemId: r.itemId,
        label: r.label, unit: r.unit,
        quantityPerPiece: r.quantityPerPiece, quantity: r.quantity,
        giacenza: giacenza,
        sufficiente: giacenza != null ? giacenza >= r.quantity : null,
      };
    });

    return { righe: righe, nonCollegate: [], pezzi: app.qty, disponibile: true, fonte: 'distinta base' };
  }

  global.InglyProductBOMStore = {
    STORE: STORE,
    tutte: tutte,
    delProdotto: delProdotto,
    corrente: corrente,
    crea: crea,
    salvaNuovaVersione: salvaNuovaVersione,
    routingDaOrdine: routingDaOrdine,
    costoDaOrdine: costoDaOrdine,
    fabbisognoDaOrdine: fabbisognoDaOrdine,
  };
})(typeof window !== 'undefined' ? window : globalThis);

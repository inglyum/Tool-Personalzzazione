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
  /**
   * Le tariffe che `InglyBOMCost` riceve già pronte, risolte da IDB — una
   * funzione sola, usata sia dal costo tecnico (`costoDaOrdine`) sia dal
   * costo reale (`consumaDaOperazione`): la stessa tariffa macchina o
   * manodopera non deve avere due modi diversi di essere calcolata a
   * seconda di chi la chiede, o divergerebbe alla prima modifica fatta su
   * uno solo dei due punti — la stessa classe di difetto di CRM-05b.
   */
  async function _risorseCosto(app) {
    var Motore = B();
    var righeOp = Motore.righeOperazioni(app.bom);
    var righeMat = Motore.righeMateriali(app.bom);
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

    return { tariffeMacchina: tariffeMacchina, manodoperaOraria: manodoperaOraria, costiMateriali: costiMateriali, righeOp: righeOp, righeMat: righeMat };
  }

  async function costoDaOrdine(ordine) {
    var Motore = B();
    var Costo = global.InglyBOMCost;
    if (!Motore || !Costo) return null;

    var app = await _bomApplicabile(ordine);
    if (!app) return null;
    var risorse = await _risorseCosto(app);
    if (!risorse.righeOp.length && !risorse.righeMat.length) return null;

    return Costo.espandi(app.bom, app.qty, {
      tariffeMacchina: risorse.tariffeMacchina,
      manodoperaOraria: risorse.manodoperaOraria,
      costiMateriali: risorse.costiMateriali,
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

  /**
   * Il consumo reale dei materiali di un'operazione, quando cresce la
   * quantità lavorata (buoni + scarti + rifacimenti — un pezzo scartato ha
   * comunque consumato il materiale del tentativo, il consumo non nasconde
   * mai lo scarto). Chiamata dalla stessa registrazione qualità che già
   * scrive buoni/scarti/rifacimenti sull'operazione (patch 052,
   * `_registraQualita`): non un secondo punto d'ingresso, un secondo passo
   * dello stesso.
   *
   * Consuma solo la **differenza** rispetto a quanto già consumato per
   * questa operazione — tracciata su `ordine.production.materialConsumption`,
   * non sull'operazione stessa (che `InglyOperazioni.normalizza` ricostruisce
   * con uno schema fisso: un campo in più lì sparirebbe alla prossima
   * lettura). È questo che rende idempotente una seconda registrazione con
   * lo stesso totale: la differenza è zero, non si scrive nessun movimento —
   * senza bisogno di un identificativo di completamento esterno, perché lo
   * stato «quanto è già stato consumato» vive nell'ordine stesso.
   *
   * Ogni movimento di consumo porta `referenceType:'PRODUCTION'`,
   * `referenceId` (l'ordine) e `operationId` (l'operazione): la stessa
   * tracciabilità che il registro di magazzino già usa per gli altri
   * movimenti generati dal codice, non un formato a parte.
   *
   * @returns { ok, consumato:boolean, delta, movimenti, costoMaterialeDelta, costoLavorazioneDelta, motivo? }
   */
  async function consumaDaOperazione(ordine, operazione, quantitaProcessataTotale) {
    var Motore = B();
    var Inv = global.InglyInventory;
    if (!Motore || !Inv || !db()) return { ok: false, motivo: 'motori non disponibili' };

    var app = await _bomApplicabile(ordine);
    if (!app) return { ok: false, motivo: 'nessuna distinta applicabile a questo ordine' };

    var totale = Math.max(0, Number(quantitaProcessataTotale) || 0);
    var stato = (ordine.production && ordine.production.materialConsumption) || {};
    var precedente = (stato[operazione.id] && Number(stato[operazione.id].processedQty)) || 0;
    var delta = totale - precedente;
    if (!(delta > 0)) {
      return { ok: true, consumato: false, delta: 0, movimenti: [], motivo: 'nessun incremento da registrare: già consumato per questa quantità' };
    }

    var risorse = await _risorseCosto(app);
    var movimenti = [];
    var costoMaterialeDelta = 0;

    if (risorse.righeMat.length) {
      var espanse = Motore.espandiMateriali(app.bom, delta);
      for (var i = 0; i < espanse.length; i++) {
        var r = espanse[i];
        var movId = 'cons-' + ordine.id + '-' + operazione.id + '-' + r.itemKey + '-' + totale;
        var unitCost = risorse.costiMateriali[r.itemKey] != null ? risorse.costiMateriali[r.itemKey] : null;
        /* Una riga materiale della distinta non sempre porta `itemStore`/
           `itemId` separati (dipende da come è stata creata) — ma `itemKey`
           è sempre nella forma «store:id». Passare entrambi a `registra`
           lascia scrivere il movimento anche se solo `itemKey` è noto, e
           mantiene la giacenza materializzata sull'archivio giusto quando
           store/id si possono ricavare. */
        var parti = String(r.itemKey).split(':');
        var itemStore = r.itemStore || parti[0];
        var itemId = r.itemId != null ? r.itemId : parti[1];
        var esito = await Inv.registra({
          type: 'CONSUMPTION',
          itemKey: r.itemKey,
          store: itemStore,
          itemId: itemId,
          quantity: r.quantity,
          id: movId,
          unitCost: unitCost,
          referenceType: 'PRODUCTION',
          referenceId: String(ordine.id),
          operationId: String(operazione.id),
          note: 'Consumo automatico dalla distinta base — operazione ' + operazione.id + ' (' + delta + ' pezzi)',
        });
        if (esito.ok) {
          movimenti.push(esito.movimento);
          if (unitCost != null) costoMaterialeDelta += unitCost * r.quantity;
        }
      }
    }

    /* Il costo reale della lavorazione: lo stesso tempo per pezzo che la
       distinta dichiara per questa tecnologia, moltiplicato sul delta appena
       lavorato — mai sull'intero storico, o un avviamento già contato
       tornerebbe a contarsi a ogni registrazione successiva. Il confronto fra
       tecnologie passa dallo stesso normalizzatore su entrambi i lati:
       la distinta dichiara «stampa3d», il routing la legge come «3d». */
    var Prod = global.InglyProduction;
    var tecOperazione = Prod ? Prod.normalizza(operazione.technology) : operazione.technology;
    var rigaOp = risorse.righeOp.filter(function (r) {
      var tecRiga = Prod ? Prod.normalizza(r.technology) : r.technology;
      return tecRiga === tecOperazione;
    })[0];
    var costoLavorazioneDelta = 0;
    var minutiLavorazioneDelta = 0;
    if (rigaOp) {
      var tariffa = (operazione.machineId != null && risorse.tariffeMacchina[operazione.machineId] != null)
        ? risorse.tariffeMacchina[operazione.machineId]
        : risorse.manodoperaOraria;
      minutiLavorazioneDelta = (Number(rigaOp.timePerUnit) || 0) * delta;
      costoLavorazioneDelta = (minutiLavorazioneDelta / 60) * (tariffa || 0);
    }

    var nuovoStato = Object.assign({}, stato);
    nuovoStato[operazione.id] = { processedQty: totale, lastConsumedAt: new Date().toISOString() };
    ordine.production = Object.assign({}, ordine.production, { materialConsumption: nuovoStato });

    var lista = (ordine.production.operations && Array.isArray(ordine.production.operations))
      ? ordine.production.operations
      : (Array.isArray(ordine.operations) ? ordine.operations : []);
    var idx = lista.findIndex(function (o) { return String(o.id) === String(operazione.id); });
    if (idx >= 0) {
      var opRec = lista[idx];
      opRec.actualCost = Math.round(((Number(opRec.actualCost) || 0) + costoMaterialeDelta + costoLavorazioneDelta) * 100) / 100;
      opRec.actualTime = Math.round(((Number(opRec.actualTime) || 0) + minutiLavorazioneDelta) * 100) / 100;
    }

    await db().put('orders', ordine);

    return {
      ok: true, consumato: true, delta: delta, movimenti: movimenti,
      costoMaterialeDelta: Math.round(costoMaterialeDelta * 100) / 100,
      costoLavorazioneDelta: Math.round(costoLavorazioneDelta * 100) / 100,
    };
  }

  /**
   * Il consumo reale registrato finora per un ordine, riletto dal registro
   * di magazzino — non un secondo totale calcolato altrove: la somma dei
   * movimenti che `consumaDaOperazione` ha davvero scritto per questo
   * ordine, più il costo di lavorazione accumulato sulle operazioni
   * (`actualCost`). È il numero che risponde a «quanto è già costato
   * davvero», diverso sia dal preventivato (congelato) sia dal costo
   * tecnico della distinta (una stima, mai misurata).
   */
  async function consumoRealeDaOrdine(ordine) {
    var OP = global.InglyOperazioni;
    var IDB = db();
    if (!IDB || !OP) return null;
    var routing = OP.leggi(ordine);
    if (!routing.length) return null;

    var movimenti = await IDB.getAll('inventory_ledger').catch(function () { return []; });
    var delOrdine = movimenti.filter(function (m) {
      return m.referenceType === 'PRODUCTION' && String(m.referenceId) === String(ordine.id);
    });
    var costoMateriale = delOrdine.reduce(function (a, m) {
      return a + (m.totalCost != null ? Math.abs(m.totalCost) : 0);
    }, 0);
    var costoLavorazione = routing.reduce(function (a, op) { return a + (op.actualCost || 0); }, 0);
    var pezziProcessati = routing.reduce(function (a, op) {
      return a + (op.goodQuantity || 0) + (op.wasteQuantity || 0) + (op.reworkQuantity || 0);
    }, 0);

    return {
      movimenti: delOrdine.length,
      pezziProcessati: pezziProcessati,
      costoMateriale: Math.round(costoMateriale * 100) / 100,
      costoLavorazione: Math.round(costoLavorazione * 100) / 100,
      costoTotale: Math.round((costoMateriale + costoLavorazione) * 100) / 100,
      registrato: delOrdine.length > 0 || costoLavorazione > 0,
    };
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
    consumaDaOperazione: consumaDaOperazione,
    consumoRealeDaOrdine: consumoRealeDaOrdine,
  };
})(typeof window !== 'undefined' ? window : globalThis);

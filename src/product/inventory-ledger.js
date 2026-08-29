/* ═══════════════════════════════════════════════════════════════════════════
   INVENTORY LEDGER · la giacenza smette di essere un numero e diventa una storia
   ═══════════════════════════════════════════════════════════════════════════

   Oggi la quantità è un campo che chiunque riscrive:

       item.quantity = Math.max(0, item.quantity + delta);
       await IDB.put('items', item);

   Il numero che ne esce può essere giusto, ma non è **verificabile**. Non c'è
   modo di rispondere alla domanda che si fa davanti a un inventario che non
   torna — «perché sono passato da 12 a 7?» — perché la risposta non è mai
   stata scritta da nessuna parte.

   Ci sono due conseguenze pratiche, entrambe misurate nell'audit:

   1. **Aggiornamenti persi.** Ogni scrittura è leggi-modifica-scrivi con un
      `await` in mezzo. Due operazioni che partono dallo stesso 12 e scrivono
      17 e 9 lasciano 9: il primo movimento non è andato perso per un errore
      di calcolo, è stato sovrascritto. Un registro non può perderlo, perché
      non sovrascrive niente: aggiunge.

   2. **Nessun costo storico.** Il costo di un consumo di gennaio si rilegge
      oggi dal listino, quindi cambia quando cambia il listino. È lo stesso
      difetto che la Fase 30 ha chiuso sugli ordini.

   Questo modulo è **puro**: non conosce IndexedDB, non disegna niente,
   non legge nessuna configurazione. Prende movimenti e restituisce numeri.
   La persistenza sta altrove, ed è il motivo per cui il registro si può
   provare senza un browser.

   La regola che tiene in piedi tutto il resto: **una transazione non si
   modifica mai.** Un errore si corregge con una rettifica, che è un altro
   movimento. Un registro che si può correggere all'indietro non è un
   registro — è di nuovo un campo, solo più lungo.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var SCHEMA = 1;

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };
  function ora() { try { return new Date().toISOString(); } catch (e) { return ''; } }

  function congela(o) {
    if (!o || typeof o !== 'object') return o;
    Object.keys(o).forEach(function (k) { congela(o[k]); });
    return Object.freeze(o);
  }

  /* ── I tipi di movimento ───────────────────────────────────────────────────
     Otto, e non di più. Ogni tipo porta il **segno** con sé, così chi registra
     dichiara cosa è successo e non deve ricordarsi se la quantità va scritta
     negativa: dimenticarlo è il modo più diretto di far quadrare un registro
     su un numero sbagliato.

     `RECEIPT` / `ISSUE` non compaiono: sarebbero sinonimi di PURCHASE e
     CONSUMPTION con un altro nome, e due nomi per la stessa cosa è il difetto
     che questo progetto ha già pagato quattro volte. `RESERVATION` e `RELEASE`
     non sono movimenti di giacenza — non spostano un grammo di materiale — e
     vivono in un piano separato (§ prenotazioni). */
  var TIPI = {
    OPENING_BALANCE: { segno: +1, label: 'Saldo di apertura', valorizzato: true },
    PURCHASE:        { segno: +1, label: 'Acquisto',          valorizzato: true },
    RETURN:          { segno: +1, label: 'Reso',              valorizzato: true },
    PRODUCTION:      { segno: +1, label: 'Produzione',        valorizzato: true },
    SALE:            { segno: -1, label: 'Vendita',           valorizzato: true },
    CONSUMPTION:     { segno: -1, label: 'Consumo',           valorizzato: true },
    WASTE:           { segno: -1, label: 'Scarto',            valorizzato: true },
    /* La rettifica è l'unico tipo con segno libero: è la correzione di un
       errore, e un errore può essere in entrambe le direzioni. */
    ADJUSTMENT:      { segno: 0,  label: 'Rettifica',         valorizzato: false },
    /* Il trasferimento non esiste come movimento singolo: `trasferimento()`
       ne produce due, un'uscita e un'entrata, legate dalla stessa operazione.
       Un solo movimento «TRANSFER» lascerebbe il totale giusto e i due
       depositi sbagliati. */
    TRANSFER_OUT:    { segno: -1, label: 'Trasferimento in uscita', valorizzato: true },
    TRANSFER_IN:     { segno: +1, label: 'Trasferimento in entrata', valorizzato: true },
  };

  var RIFERIMENTI = ['ORDER', 'ORDER_LINE', 'QUOTE', 'PURCHASE_ORDER', 'SUPPLIER',
    'SALE', 'PRODUCTION', 'TRANSFER', 'MANUAL', 'IMPORT', 'MIGRATION'];

  /* ── Validazione ───────────────────────────────────────────────────────────
     Un registro corrotto è peggio di nessun registro: il primo si crede, il
     secondo no. Si rifiuta prima di scrivere, e si dice perché. */
  function valida(m, contesto) {
    var c = contesto || {};
    var errori = [];
    var mm = m || {};

    if (!TIPI[mm.type]) errori.push('tipo di movimento sconosciuto: ' + mm.type);
    if (mm.itemId == null || mm.itemId === '') errori.push('movimento senza articolo');
    if (c.itemiNoti && mm.itemId != null && c.itemiNoti.indexOf(String(mm.itemId)) < 0) {
      errori.push('articolo inesistente: ' + mm.itemId);
    }
    if (c.depositiNoti && mm.warehouseId != null && c.depositiNoti.indexOf(String(mm.warehouseId)) < 0) {
      errori.push('deposito inesistente: ' + mm.warehouseId);
    }

    /* Si guarda il valore grezzo, non quello passato da `num`: `num` ha un
       ripiego a zero, e uno zero di ripiego finirebbe nel ramo «movimento di
       quantità zero», che è un messaggio giusto per la ragione sbagliata —
       il difetto è che qualcuno ha scritto «molti» dove andava un numero. */
    var q = parseFloat(mm.quantity);
    if (mm.quantity == null || mm.quantity === '' || !isFinite(q)) errori.push('quantità non numerica');
    else if (q === 0) errori.push('un movimento di quantità zero non è un movimento');
    else if (mm.type && TIPI[mm.type] && TIPI[mm.type].segno !== 0 && q < 0) {
      /* Il segno lo mette il tipo. Una quantità negativa su un CONSUMPTION
         significherebbe un carico travestito da scarico, e nessun report se ne
         accorgerebbe. */
      errori.push('quantità negativa su ' + mm.type + ': il segno lo dichiara il tipo, non il numero');
    }

    if (mm.referenceType && RIFERIMENTI.indexOf(mm.referenceType) < 0) {
      errori.push('tipo di riferimento sconosciuto: ' + mm.referenceType);
    }
    if (mm.referenceType && mm.referenceType !== 'MANUAL' && mm.referenceId == null) {
      errori.push('riferimento ' + mm.referenceType + ' senza id');
    }
    if (c.idEsistenti && mm.id != null && c.idEsistenti.indexOf(String(mm.id)) >= 0) {
      errori.push('id già presente nel registro: ' + mm.id);
    }

    if (TIPI[mm.type] && TIPI[mm.type].valorizzato && mm.unitCost == null && !c.costoFacoltativo) {
      /* Non è un errore bloccante: un movimento senza costo è comunque un
         movimento vero, e rifiutarlo perderebbe il dato di quantità. Si
         segnala, e chi legge sa che quel movimento non entra nella
         valorizzazione. */
      errori.push({ livello: 'AVVISO', testo: 'movimento valorizzabile senza costo unitario: non entrerà nella valorizzazione' });
    }

    var bloccanti = errori.filter(function (e) { return typeof e === 'string'; });
    return {
      valido: bloccanti.length === 0,
      errori: bloccanti,
      avvisi: errori.filter(function (e) { return typeof e !== 'string'; }).map(function (e) { return e.testo; }),
    };
  }

  /* ── La transazione ────────────────────────────────────────────────────────
     Congelata alla nascita. `previousQuantity` e `resultingQuantity` si
     scrivono qui, una volta, e restano: ricalcolarli dopo significherebbe
     ricostruire il passato con i movimenti di oggi, che è esattamente ciò che
     un registro esiste per evitare. */
  function crea(mov, precedente) {
    var m = mov || {};
    var tipo = TIPI[m.type];
    if (!tipo) return null;

    var segno = tipo.segno !== 0 ? tipo.segno : (num(m.quantity) < 0 ? -1 : 1);
    var quantita = Math.abs(num(m.quantity));
    var delta = segno * quantita;
    var prima = num(precedente, 0);

    var costoUnitario = m.unitCost != null ? num(m.unitCost) : null;
    var costoTotale = costoUnitario != null ? costoUnitario * quantita : null;

    return congela({
      schemaVersion: SCHEMA,
      id: m.id != null ? String(m.id) : ('mv' + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36)),
      timestamp: m.timestamp || ora(),

      itemId: String(m.itemId),
      itemName: m.itemName || null,
      warehouseId: m.warehouseId != null ? String(m.warehouseId) : 'default',
      unit: m.unit || null,

      type: m.type,
      sign: segno,
      quantity: quantita,
      delta: delta,

      previousQuantity: prima,
      resultingQuantity: prima + delta,

      /* Il costo del **momento**. Non si rilegge mai dal listino: è la stessa
         regola che la Fase 30 ha applicato agli ordini, per lo stesso motivo. */
      unitCost: costoUnitario,
      totalCost: costoTotale,
      currency: m.currency || 'EUR',

      referenceType: m.referenceType || 'MANUAL',
      referenceId: m.referenceId != null ? String(m.referenceId) : null,
      operationId: m.operationId != null ? String(m.operationId) : null,

      userId: m.userId != null ? String(m.userId) : null,
      note: m.note || null,
      supplierId: m.supplierId != null ? String(m.supplierId) : null,
      customerId: m.customerId != null ? String(m.customerId) : null,
      batch: m.batch || null,
      lot: m.lot || null,
      serial: m.serial || null,
    });
  }

  /* ── Ricostruzione ─────────────────────────────────────────────────────────
     La giacenza è la somma dei movimenti, in ordine di tempo. Non «di solito»:
     sempre. Se il numero materializzato dice altro, ha torto lui. */
  function ordina(movimenti) {
    return (movimenti || []).slice().sort(function (a, b) {
      var ta = String(a.timestamp || ''), tb = String(b.timestamp || '');
      if (ta !== tb) return ta < tb ? -1 : 1;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
  }

  function filtra(movimenti, itemId, warehouseId) {
    return (movimenti || []).filter(function (m) {
      if (itemId != null && String(m.itemId) !== String(itemId)) return false;
      if (warehouseId != null && String(m.warehouseId) !== String(warehouseId)) return false;
      return true;
    });
  }

  function ricostruisci(movimenti, itemId, warehouseId) {
    var lista = ordina(filtra(movimenti, itemId, warehouseId));
    var q = 0, valore = 0, perTipo = {}, valorizzati = 0;
    var salti = [];

    lista.forEach(function (m) {
      /* `previousQuantity` registrato ≠ quantità corrente calcolata: significa
         che qualcuno ha scritto la giacenza fuori dal registro. Non si
         aggiusta in silenzio — si annota, ed è la sola cosa onesta da fare. */
      if (Math.abs(num(m.previousQuantity) - q) > 0.0000001) {
        salti.push({ id: m.id, timestamp: m.timestamp, atteso: q, registrato: num(m.previousQuantity) });
      }
      q += num(m.delta);
      /* Il valore segue il segno del movimento: un consumo toglie valore
         quanto toglie quantità. I movimenti senza costo non entrano — e
         `valorizzati` dice quanti sono, perché un valore costruito su metà
         registro non va presentato come se fosse il valore. */
      if (m.totalCost != null) { valore += num(m.totalCost) * (num(m.delta) >= 0 ? 1 : -1); valorizzati++; }
      perTipo[m.type] = (perTipo[m.type] || 0) + num(m.quantity);
    });

    return {
      itemId: itemId != null ? String(itemId) : null,
      warehouseId: warehouseId != null ? String(warehouseId) : null,
      quantity: q,
      movimenti: lista.length,
      perTipo: perTipo,
      valore: valore,
      movimentiValorizzati: valorizzati,
      valoreCompleto: valorizzati === lista.length,
      /* I salti sono la prova che una scrittura è avvenuta fuori dal registro:
         il registro resta corretto, ma il numero materializzato di allora no. */
      discontinuita: salti,
      ultimo: lista.length ? lista[lista.length - 1] : null,
    };
  }

  /* ── Riconciliazione ───────────────────────────────────────────────────────
     Il confronto fra ciò che il registro dice e ciò che il record conserva.
     Serve tutti i giorni, non solo in migrazione: è il modo di accorgersi che
     qualcuno scrive ancora la giacenza a mano. */
  function riconcilia(movimenti, materializzate) {
    var perChiave = {};
    (movimenti || []).forEach(function (m) {
      var k = String(m.itemId) + '@' + String(m.warehouseId || 'default');
      (perChiave[k] = perChiave[k] || []).push(m);
    });
    (materializzate || []).forEach(function (r) {
      var k = String(r.itemId) + '@' + String(r.warehouseId || 'default');
      if (!perChiave[k]) perChiave[k] = [];
    });

    var righe = Object.keys(perChiave).map(function (k) {
      var parti = k.split('@');
      var ric = ricostruisci(perChiave[k]);
      var mat = (materializzate || []).filter(function (r) {
        return String(r.itemId) === parti[0] && String(r.warehouseId || 'default') === parti[1];
      })[0];
      var actual = mat ? num(mat.quantity) : null;
      return {
        itemId: parti[0], warehouseId: parti[1],
        itemName: (mat && mat.itemName) || (perChiave[k][0] && perChiave[k][0].itemName) || null,
        expected: ric.quantity,
        actual: actual,
        delta: actual == null ? null : actual - ric.quantity,
        movimenti: ric.movimenti,
        discontinuita: ric.discontinuita.length,
      };
    });

    var divergenti = righe.filter(function (r) { return r.delta != null && Math.abs(r.delta) > 0.0000001; });
    return {
      righe: righe.sort(function (a, b) { return Math.abs(b.delta || 0) - Math.abs(a.delta || 0); }),
      totale: righe.length,
      divergenti: divergenti.length,
      senzaRegistro: righe.filter(function (r) { return r.movimenti === 0; }).length,
      quadra: divergenti.length === 0,
    };
  }

  /* ── Rettifica ─────────────────────────────────────────────────────────────
     L'unico modo di correggere. Non tocca niente di ciò che c'era: porta la
     giacenza al valore contato, e scrive perché. */
  function rettifica(opzioni) {
    var o = opzioni || {};
    var attuale = num(o.attuale);
    var contato = num(o.contato);
    var delta = contato - attuale;
    if (Math.abs(delta) < 0.0000001) return null;
    return crea({
      type: 'ADJUSTMENT',
      itemId: o.itemId, itemName: o.itemName, warehouseId: o.warehouseId,
      quantity: delta,
      unitCost: o.unitCost != null ? o.unitCost : null,
      referenceType: 'MANUAL',
      userId: o.userId,
      note: o.note || ('rettifica da inventario fisico: contati ' + contato + ', registrati ' + attuale),
    }, attuale);
  }

  /* ── Trasferimento ─────────────────────────────────────────────────────────
     Due movimenti, una operazione. Modificare due quantità indipendenti senza
     legarle lascia un registro in cui, sei mesi dopo, nessuno sa se quel
     materiale è stato spostato o perso. */
  function trasferimento(opzioni) {
    var o = opzioni || {};
    var op = o.operationId || ('tr' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36));
    var comune = {
      itemId: o.itemId, itemName: o.itemName, unit: o.unit,
      quantity: Math.abs(num(o.quantity)),
      unitCost: o.unitCost != null ? o.unitCost : null,
      referenceType: 'TRANSFER', referenceId: op,
      operationId: op, userId: o.userId, note: o.note,
    };
    var uscita = crea(Object.assign({}, comune, { type: 'TRANSFER_OUT', warehouseId: o.da }), num(o.giacenzaDa));
    var entrata = crea(Object.assign({}, comune, { type: 'TRANSFER_IN', warehouseId: o.a }), num(o.giacenzaA));
    return congela({ operationId: op, movimenti: [uscita, entrata] });
  }

  /* ── Saldo di apertura ─────────────────────────────────────────────────────
     La migrazione. La giacenza che esiste oggi non ha una storia, e
     inventargliene una sarebbe peggio che ammetterlo: si scrive un solo
     movimento che dice «al giorno tale c'era questo, e da qui in poi si
     registra». Il costo è quello dichiarato nell'anagrafica, marcato come
     dichiarato e non come pagato. */
  function apertura(item, opzioni) {
    var i = item || {};
    var o = opzioni || {};
    var q = num(i.quantity != null ? i.quantity : (i.qty != null ? i.qty : i.stock), 0);
    if (!(q > 0)) return null;
    return crea({
      type: 'OPENING_BALANCE',
      itemId: i.id, itemName: i.name || null, unit: i.unit || null,
      warehouseId: o.warehouseId || i.location || 'default',
      quantity: q,
      unitCost: i.costPrice != null ? num(i.costPrice) : (i.cost != null ? num(i.cost) : null),
      referenceType: 'MIGRATION', referenceId: o.migrazione || 'opening-balance-v1',
      timestamp: o.quando || ora(),
      note: 'giacenza preesistente al registro: costo dichiarato in anagrafica, non un acquisto tracciato',
    }, 0);
  }

  /* ── Costo ─────────────────────────────────────────────────────────────────
     Tre letture, tutte e tre **soltanto** dal registro. Nessuna legge il
     listino corrente: è il punto dell'esercizio.

     Non sono ancora un motore di costo — quello è la fase successiva — sono le
     tre domande a cui il registro può già rispondere onestamente, e ognuna
     dice quando non può. */
  function entrate(movimenti, itemId, warehouseId) {
    return ordina(filtra(movimenti, itemId, warehouseId)).filter(function (m) {
      return m.delta > 0 && m.unitCost != null;
    });
  }

  function costoUltimo(movimenti, itemId, warehouseId) {
    var e = entrate(movimenti, itemId, warehouseId);
    if (!e.length) return { disponibile: false, motivo: 'nessuna entrata valorizzata nel registro' };
    var ultimo = e[e.length - 1];
    return { disponibile: true, costo: num(ultimo.unitCost), fonte: ultimo.id, quando: ultimo.timestamp };
  }

  function costoMedioPonderato(movimenti, itemId, warehouseId) {
    var e = entrate(movimenti, itemId, warehouseId);
    if (!e.length) return { disponibile: false, motivo: 'nessuna entrata valorizzata nel registro' };
    var q = 0, v = 0;
    e.forEach(function (m) { q += num(m.quantity); v += num(m.totalCost); });
    if (!(q > 0)) return { disponibile: false, motivo: 'quantità entrata nulla' };
    return { disponibile: true, costo: v / q, quantita: q, valore: v, entrate: e.length };
  }

  function costoFifo(movimenti, itemId, warehouseId) {
    var lista = ordina(filtra(movimenti, itemId, warehouseId));
    var lotti = [];
    var scoperto = 0;
    lista.forEach(function (m) {
      if (m.delta > 0) {
        lotti.push({ q: num(m.quantity), costo: m.unitCost != null ? num(m.unitCost) : null, id: m.id });
      } else {
        var da = num(m.quantity);
        while (da > 0.0000001 && lotti.length) {
          var l = lotti[0];
          var preso = Math.min(l.q, da);
          l.q -= preso; da -= preso;
          if (l.q <= 0.0000001) lotti.shift();
        }
        /* Uscite oltre le entrate registrate: succede nei primi mesi, quando
           il saldo di apertura non copre tutto. Si conta, non si nasconde. */
        if (da > 0.0000001) scoperto += da;
      }
    });
    var q = lotti.reduce(function (a, l) { return a + l.q; }, 0);
    var valorizzabili = lotti.filter(function (l) { return l.costo != null; });
    if (!valorizzabili.length) {
      return { disponibile: false, motivo: 'i lotti residui non hanno un costo registrato', quantitaResidua: q, scoperto: scoperto };
    }
    var v = valorizzabili.reduce(function (a, l) { return a + l.q * l.costo; }, 0);
    var qv = valorizzabili.reduce(function (a, l) { return a + l.q; }, 0);
    return {
      disponibile: true,
      costo: qv > 0 ? v / qv : 0,
      quantitaResidua: q, valoreResiduo: v, lotti: lotti.length, scoperto: scoperto,
      parziale: valorizzabili.length !== lotti.length,
    };
  }

  /* ── Prenotazioni ──────────────────────────────────────────────────────────
     Una prenotazione non sposta materiale: sottrarla dalla giacenza fisica
     farebbe dire al magazzino che qualcosa non c'è mentre è sullo scaffale.
     Sono tre numeri distinti e restano tre. */
  function disponibilita(movimenti, prenotazioni, itemId, warehouseId) {
    var onHand = ricostruisci(movimenti, itemId, warehouseId).quantity;
    var reserved = (prenotazioni || []).filter(function (p) {
      if (String(p.itemId) !== String(itemId)) return false;
      if (warehouseId != null && String(p.warehouseId || 'default') !== String(warehouseId)) return false;
      return p.status !== 'released' && p.status !== 'fulfilled';
    }).reduce(function (a, p) { return a + num(p.quantity); }, 0);
    return { onHand: onHand, reserved: reserved, available: onHand - reserved };
  }

  /* ── Perché sono passato da 12 a 7 ─────────────────────────────────────────
     La domanda del capitolo 31M, con la sua risposta. */
  function spiega(movimento) {
    var m = movimento;
    if (!m) return null;
    var t = TIPI[m.type] || { label: m.type };
    return {
      quando: m.timestamp,
      cosa: t.label,
      quantita: (m.delta > 0 ? '+' : '−') + Math.abs(m.delta) + (m.unit ? ' ' + m.unit : ''),
      da: m.previousQuantity,
      a: m.resultingQuantity,
      costo: m.unitCost != null ? m.unitCost : null,
      valore: m.totalCost != null ? m.totalCost : null,
      documento: m.referenceType && m.referenceType !== 'MANUAL'
        ? m.referenceType + ' ' + (m.referenceId || '') : 'movimento manuale',
      operazione: m.operationId || null,
      chi: m.userId || null,
      nota: m.note || null,
    };
  }

  global.InglyInventoryLedger = {
    SCHEMA: SCHEMA,
    TIPI: TIPI,
    RIFERIMENTI: RIFERIMENTI,
    valida: valida,
    crea: crea,
    ordina: ordina,
    filtra: filtra,
    ricostruisci: ricostruisci,
    riconcilia: riconcilia,
    rettifica: rettifica,
    trasferimento: trasferimento,
    apertura: apertura,
    costoUltimo: costoUltimo,
    costoMedioPonderato: costoMedioPonderato,
    costoFifo: costoFifo,
    disponibilita: disponibilita,
    spiega: spiega,
  };
})(typeof window !== 'undefined' ? window : globalThis);

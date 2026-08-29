/* ═══════════════════════════════════════════════════════════════════════════
   INVENTORY COST RESOLVER · una domanda sola, tre modi di rispondere
   ═══════════════════════════════════════════════════════════════════════════

   «Quanto mi costa questo materiale?»

   Oggi la risposta arriva da `item.costPrice`, cioè da un numero che qualcuno
   ha digitato una volta e che nessuno aggiorna. È il prezzo che il fornitore
   faceva quando l'articolo è stato creato, ed è l'unico costo che il sistema
   conosce.

   Il registro della Fase 31 sa di più: sa **quanto è stato pagato davvero**,
   quando, a chi, e in quali lotti. Questo modulo è l'unico posto autorizzato a
   trasformare quei movimenti in un costo.

   Tre politiche, un solo motore:

     ULTIMO       l'ultima entrata valorizzata. Semplice, reattiva, e nervosa:
                  un acquisto d'emergenza a prezzo alto sposta tutti i
                  preventivi del mese.
     MEDIA        media ponderata sulle entrate. È la scelta ragionevole per
                  un laboratorio, e quella predefinita.
     FIFO         consuma i lotti nell'ordine in cui sono entrati. È il più
                  fedele, e il solo che sappia dire «questa quantità non è
                  coperta da nessun acquisto registrato».

   Non sono tre motori: sono tre risposte alla stessa domanda, e il chiamante
   sceglie quale vuole. La matematica del **prezzo** — margine, ricarico,
   sconto — non è qui e non ci sarà mai: quella è di `InglyCostEngine`.

     Registro  →  Resolver  →  InglyCostEngine  →  Preventivo / Ordine
     (fatti)      (costo)      (prezzo)             (documento)

   Due regole che valgono più del resto:

   1. **Non si inventa mai un costo.** Nessun ripiego sul listino corrente,
      nessuno zero al posto di un dato mancante. Quando il registro non sa,
      il risultato dice che non sa, e chi ha chiesto decide.

   2. **Ogni costo sa da dove viene.** `lineage` porta i movimenti che l'hanno
      prodotto. Un numero che non si può spiegare non si può nemmeno
      difendere davanti a un cliente.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };

  function L() { return global.InglyInventoryLedger; }

  /* Le politiche, con un nome e una spiegazione: compaiono nell'interfaccia e
     finiscono congelate negli snapshot, quindi non possono essere stringhe
     sparse nel codice. */
  var POLITICHE = {
    ultimo: { id: 'ultimo', label: 'Ultimo costo', breve: 'ultimo acquisto',
      spiega: 'Il prezzo dell\'ultima entrata registrata.' },
    media: { id: 'media', label: 'Media ponderata', breve: 'media ponderata',
      spiega: 'La media dei prezzi pagati, pesata sulle quantità entrate.', predefinita: true },
    fifo: { id: 'fifo', label: 'FIFO', breve: 'primo entrato, primo uscito',
      spiega: 'I lotti si consumano nell\'ordine in cui sono entrati.' },
  };

  var PREDEFINITA = 'media';

  /* I motivi per cui un costo può non esserci. Sono dati, non testo: la vista
     li mostra, i test li verificano, e nessuno li confonde con uno zero. */
  var MOTIVI = {
    NESSUN_REGISTRO: 'Nessun movimento registrato per questo articolo.',
    NESSUNA_ENTRATA: 'Nessuna entrata valorizzata: il registro ha movimenti, ma nessuno con un costo.',
    NESSUN_ARTICOLO: 'Articolo non collegato al magazzino: la riga non ha una chiave d\'inventario.',
    LOTTI_SENZA_COSTO: 'I lotti residui non hanno un costo registrato.',
    REGISTRO_ASSENTE: 'Registro di magazzino non disponibile.',
  };

  function nonDisponibile(motivo, extra) {
    var r = { disponibile: false, costo: null, motivo: motivo, policy: null, lineage: [] };
    return Object.assign(r, extra || {});
  }

  /* ── Le tre letture ────────────────────────────────────────────────────────
     Ognuna delega al registro il conto e ci aggiunge la provenienza. Il
     registro sa contare; il resolver sa spiegare e scegliere. */

  function ultimoCosto(movimenti, itemKey, opzioni) {
    var r = L().costoUltimo(movimenti, itemKey, (opzioni || {}).warehouseId || null);
    if (!r.disponibile) return nonDisponibile(MOTIVI.NESSUNA_ENTRATA, { policy: 'ultimo' });
    var fonte = movimenti.filter(function (m) { return String(m.id) === String(r.fonte); })[0] || null;
    return {
      disponibile: true, costo: r.costo, policy: 'ultimo',
      base: 'ultima entrata valorizzata',
      lineage: fonte ? [tracciaDi(fonte)] : [],
      quando: r.quando,
    };
  }

  function mediaPonderata(movimenti, itemKey, opzioni) {
    var wh = (opzioni || {}).warehouseId || null;
    var r = L().costoMedioPonderato(movimenti, itemKey, wh);
    if (!r.disponibile) return nonDisponibile(MOTIVI.NESSUNA_ENTRATA, { policy: 'media' });
    var entrate = L().ordina(L().filtra(movimenti, itemKey, wh)).filter(function (m) {
      return m.delta > 0 && m.unitCost != null;
    });
    return {
      disponibile: true, costo: r.costo, policy: 'media',
      base: r.entrate + ' entrate · ' + r.quantita + ' unità · ' + r.valore.toFixed(2) + ' € spesi',
      quantita: r.quantita, valore: r.valore,
      lineage: entrate.map(tracciaDi),
    };
  }

  function fifo(movimenti, itemKey, opzioni) {
    var o = opzioni || {};
    var wh = o.warehouseId || null;
    var richiesta = o.quantity != null ? Math.abs(num(o.quantity)) : null;

    /* Senza una quantità richiesta si valorizza il **residuo**: è la domanda
       «quanto vale quello che ho in magazzino». Con una quantità, si valorizza
       un **consumo**: «quanto mi costa prelevarne 120», che è la domanda del
       preventivo, ed è quella in cui la copertura conta. */
    if (richiesta == null) {
      var r = L().costoFifo(movimenti, itemKey, wh);
      if (!r.disponibile) {
        return nonDisponibile(MOTIVI.LOTTI_SENZA_COSTO, {
          policy: 'fifo', quantitaResidua: r.quantitaResidua, scoperto: r.scoperto,
        });
      }
      return {
        disponibile: true, costo: r.costo, policy: 'fifo',
        base: 'residuo di ' + r.quantitaResidua + ' unità in ' + r.lotti + ' lotti',
        quantitaResidua: r.quantitaResidua, scoperto: r.scoperto, parziale: r.parziale,
        lineage: lottiResidui(movimenti, itemKey, wh).map(function (l) {
          return { id: l.id, quantita: l.q, costoUnitario: l.costo, quando: l.quando, tipo: l.tipo };
        }),
      };
    }

    /* Il prelievo: si scorrono i lotti residui in ordine di entrata. */
    var lotti = lottiResidui(movimenti, itemKey, wh);
    var da = richiesta, valore = 0, coperta = 0, usati = [];
    for (var i = 0; i < lotti.length && da > 0.0000001; i++) {
      var l = lotti[i];
      if (l.costo == null) continue;          // un lotto senza costo non copre
      var preso = Math.min(l.q, da);
      if (preso <= 0) continue;
      valore += preso * l.costo; da -= preso; coperta += preso;
      usati.push({ id: l.id, quantita: preso, costoUnitario: l.costo, quando: l.quando, tipo: l.tipo });
    }

    if (coperta <= 0) {
      return nonDisponibile(MOTIVI.LOTTI_SENZA_COSTO, {
        policy: 'fifo', richiesta: richiesta, coperta: 0, scoperta: richiesta,
      });
    }

    /* La quantità scoperta non diventa zero euro: si dichiara, e il costo
       restituito vale per la parte coperta. Un preventivo costruito su una
       copertura parziale è una decisione, non un incidente. */
    return {
      disponibile: true,
      costo: valore / coperta,
      costoTotale: valore,
      policy: 'fifo',
      base: 'prelievo FIFO di ' + coperta + ' su ' + richiesta + ' unità richieste',
      richiesta: richiesta, coperta: coperta, scoperta: richiesta - coperta,
      completa: Math.abs(richiesta - coperta) < 0.0000001,
      lineage: usati,
    };
  }

  /** I lotti ancora aperti, in ordine di entrata, con il costo di ognuno. */
  function lottiResidui(movimenti, itemKey, warehouseId) {
    var lista = L().ordina(L().filtra(movimenti, itemKey, warehouseId));
    var lotti = [];
    lista.forEach(function (m) {
      if (m.delta > 0) {
        lotti.push({ q: num(m.quantity), costo: m.unitCost != null ? num(m.unitCost) : null,
          id: m.id, quando: m.timestamp, tipo: m.type });
      } else {
        var da = num(m.quantity);
        while (da > 0.0000001 && lotti.length) {
          var l = lotti[0];
          var preso = Math.min(l.q, da);
          l.q -= preso; da -= preso;
          if (l.q <= 0.0000001) lotti.shift();
        }
      }
    });
    return lotti;
  }

  function tracciaDi(m) {
    return {
      id: m.id, tipo: m.type, quando: m.timestamp,
      quantita: num(m.quantity), costoUnitario: m.unitCost != null ? num(m.unitCost) : null,
      valore: m.totalCost != null ? num(m.totalCost) : null,
      documento: m.referenceType && m.referenceType !== 'MANUAL'
        ? m.referenceType + ' ' + (m.referenceId || '') : null,
      fornitore: m.supplierId || null,
    };
  }

  /* ── L'unica porta ─────────────────────────────────────────────────────────
     Tutti passano da qui. Il chiamante dichiara cosa vuole; il resolver dice
     cosa può dare, e da dove viene. */
  function risolvi(movimenti, itemKey, opzioni) {
    var o = opzioni || {};
    if (!L()) return nonDisponibile(MOTIVI.REGISTRO_ASSENTE);
    if (!itemKey) return nonDisponibile(MOTIVI.NESSUN_ARTICOLO);

    var lista = L().filtra(movimenti || [], itemKey, o.warehouseId || null);
    if (!lista.length) return nonDisponibile(MOTIVI.NESSUN_REGISTRO, { itemKey: itemKey });

    var policy = POLITICHE[o.policy] ? o.policy : PREDEFINITA;
    var esito = policy === 'ultimo' ? ultimoCosto(movimenti, itemKey, o)
      : policy === 'fifo' ? fifo(movimenti, itemKey, o)
        : mediaPonderata(movimenti, itemKey, o);

    esito.itemKey = itemKey;
    esito.policyLabel = POLITICHE[policy].label;
    esito.resolverVersion = VERSIONE;
    esito.risoltoIl = (function () { try { return new Date().toISOString(); } catch (e) { return ''; } })();
    return esito;
  }

  /**
   * Il costo di una riga di preventivo.
   *
   * È il punto in cui la Fase 30 e la Fase 31 si incontrano: la riga porta la
   * chiave d'inventario dalla Fase 32, il registro porta i costi pagati, e il
   * risultato è un costo reale invece di un numero digitato.
   *
   * Restituisce **sempre** un risultato, anche quando non può risolvere: chi
   * chiama decide se usare il costo dichiarato sulla riga o fermarsi.
   */
  function risolviRiga(movimenti, riga, opzioni) {
    var r = riga || {};
    var o = opzioni || {};
    var chiave = r.itemKey || ((r.itemId != null && r.itemStore) ? (r.itemStore + ':' + r.itemId) : null);

    if (!chiave) {
      return nonDisponibile(MOTIVI.NESSUN_ARTICOLO, {
        dichiarato: r.unitCost != null ? num(r.unitCost) : null,
        etichetta: r.label || r.name || null,
      });
    }

    var esito = risolvi(movimenti, chiave, Object.assign({}, o, {
      quantity: o.policy === 'fifo' ? num(r.qty, 1) : undefined,
    }));
    esito.dichiarato = r.unitCost != null ? num(r.unitCost) : null;
    esito.etichetta = r.label || r.name || null;
    /* Lo scostamento fra ciò che era stato digitato e ciò che è stato pagato:
       è l'informazione che fa alzare la testa a chi legge un preventivo. */
    if (esito.disponibile && esito.dichiarato != null && esito.dichiarato > 0) {
      esito.scostamentoPct = ((esito.costo - esito.dichiarato) / esito.dichiarato) * 100;
    }
    return esito;
  }

  /* ── Il congelamento ───────────────────────────────────────────────────────
     Quando un costo risolto finisce in un ordine, ci finisce **con la sua
     provenienza**: politica, base, movimenti, versione del resolver. Senza,
     fra un anno resta un numero, e la Fase 30 esiste perché un numero senza
     provenienza è indistinguibile da un numero sbagliato. */
  function congelaPerSnapshot(esito) {
    if (!esito) return null;
    return {
      costingPolicy: esito.policy || null,
      costingPolicyLabel: esito.policyLabel || null,
      unitCost: esito.disponibile ? esito.costo : null,
      costBasis: esito.base || null,
      declaredCost: esito.dichiarato != null ? esito.dichiarato : null,
      available: !!esito.disponibile,
      reason: esito.disponibile ? null : (esito.motivo || null),
      coverage: esito.coperta != null
        ? { requested: esito.richiesta, covered: esito.coperta, uncovered: esito.scoperta, complete: !!esito.completa }
        : null,
      transactionRefs: (esito.lineage || []).map(function (l) { return l.id; }),
      resolverVersion: esito.resolverVersion || VERSIONE,
      resolvedAt: esito.risoltoIl || null,
    };
  }

  /** «Da dove arriva questo € 1,47» — la risposta, in righe leggibili. */
  function spiega(esito) {
    if (!esito) return null;
    if (!esito.disponibile) {
      return { disponibile: false, titolo: 'Costo non disponibile', motivo: esito.motivo,
        dichiarato: esito.dichiarato != null ? esito.dichiarato : null, righe: [] };
    }
    return {
      disponibile: true,
      titolo: (Math.round(esito.costo * 10000) / 10000) + ' €',
      metodo: esito.policyLabel,
      base: esito.base,
      copertura: esito.coperta != null && !esito.completa
        ? esito.coperta + ' su ' + esito.richiesta + ' unità coperte dal registro' : null,
      scostamento: esito.scostamentoPct != null ? esito.scostamentoPct : null,
      righe: (esito.lineage || []).map(function (l) {
        return {
          quando: l.quando ? String(l.quando).slice(0, 10) : null,
          cosa: (L().TIPI[l.tipo] || {}).label || l.tipo,
          quantita: l.quantita,
          costoUnitario: l.costoUnitario,
          documento: l.documento || null,
          fornitore: l.fornitore || null,
        };
      }),
    };
  }

  global.InglyInventoryCostResolver = {
    version: VERSIONE,
    POLITICHE: POLITICHE,
    PREDEFINITA: PREDEFINITA,
    MOTIVI: MOTIVI,
    risolvi: risolvi,
    risolviRiga: risolviRiga,
    lottiResidui: lottiResidui,
    congelaPerSnapshot: congelaPerSnapshot,
    spiega: spiega,
    /* I tre nomi della specifica, che sono tre politiche dello stesso motore. */
    getLastCost: function (m, k, o) { return risolvi(m, k, Object.assign({}, o, { policy: 'ultimo' })); },
    getWeightedAverageCost: function (m, k, o) { return risolvi(m, k, Object.assign({}, o, { policy: 'media' })); },
    getFifoCost: function (m, k, o) { return risolvi(m, k, Object.assign({}, o, { policy: 'fifo' })); },
  };
})(typeof window !== 'undefined' ? window : globalThis);

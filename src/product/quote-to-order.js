/* ═══════════════════════════════════════════════════════════════════════════
   PREVENTIVO → ORDINE — una pipeline sola, e verificata a ogni passo
   ═══════════════════════════════════════════════════════════════════════════

   Prima di questo modulo `Quoter.sendToWorkflow` esisteva in cinque copie:
   quella del preventivatore, una sostituzione in `modules/orders`, un
   involucro nella patch 085 a 1200 ms, e una seconda sostituzione nella patch
   051 a 2000 ms. Vinceva l'ultima, misurato nel browser — e l'ultima era la
   peggiore:

     await this.saveQuote().catch(()=>{});

   Il salvataggio poteva fallire e l'ordine nasceva lo stesso, senza
   `quoteId`, senza `clientId`, con un totale ricalcolato da una formula sua
   (`subtotal × (1 + markup)`) invece che dal motore, e con una navigazione a
   una rotta legacy. Nessun controllo sul doppio clic: due pressioni, due
   ordini.

   ── Perché una pipeline e non un metodo ───────────────────────────────────

   Otto passi, e ognuno può fallire in un modo che i successivi devono
   conoscere:

     valida → salva → verifica → prepara → crea → verifica → collega → apri

   «Verifica» non è formalità: dopo una scrittura si **rilegge** il record e si
   guarda se c'è davvero e se contiene i campi che servono. Un `put` che non
   solleva eccezioni non dimostra che il dato sia leggibile — la quota può
   essere esaurita, la serializzazione può perdere un campo, un altro turno può
   aver sovrascritto. Un «✅ salvato» detto senza rileggere è la bugia più
   costosa che un gestionale possa dire.

   ── Il fallimento è atomico dove conta ────────────────────────────────────

   Se il preventivo non si salva, l'ordine non nasce. Se il preventivo si salva
   e l'ordine no, il preventivo **resta salvato** — buttarlo via sarebbe
   peggio — e si dice esattamente questo, offrendo di riprovare senza
   duplicare niente. Non c'è una transazione a due fasi perché IndexedDB qui
   non ne offre una fra store diversi; c'è un ordine dei passi tale che ogni
   fallimento lascia il sistema in uno stato descrivibile a parole.

   ── Idempotenza ───────────────────────────────────────────────────────────

   La chiave è `quoteId`. Prima di creare si cerca un ordine che lo porti già:
   se c'è, non se ne fa un secondo e si offre di aprire quello. È ciò che
   rende innocuo il doppio clic, il rientro dopo un errore di rete e il
   «Riprova».

   ── Estensioni ────────────────────────────────────────────────────────────

   `decoratori` esiste perché le patch smettano di sostituire il metodo. Un
   add-on che vuole aggiungere campi all'ordine registra una funzione; la
   pipeline resta una.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  /* ── Esiti ────────────────────────────────────────────────────────────────
     Un risultato strutturato invece di `undefined`: chi chiama deve poter
     distinguere «non salvato perché manca il titolo» da «non salvato perché
     il disco è pieno», e dirlo all'utente con parole diverse. */
  var MOTIVI = {
    quoteNonValido: 'Il preventivo non è completo',
    quoteNonSalvato: 'Il preventivo non è stato salvato',
    quoteNonVerificato: 'Il preventivo risulta salvato ma non si rilegge',
    motoreAssente: 'Il motore di costo non è disponibile',
    ordineNonCreato: 'L\'ordine non è stato creato',
    ordineNonVerificato: 'L\'ordine risulta creato ma non si rilegge',
    ordineGiaEsistente: 'Questo preventivo è già stato inviato a Ordini & Workflow',
    archivioAssente: 'L\'archivio non è raggiungibile',
    gestioneAssente: 'Ordini & Workflow non è disponibile',
  };

  /** Una copia profonda, perché lo snapshot e il corrente non devono
      condividere gli stessi oggetti: modificare l'uno cambierebbe l'altro, ed
      è esattamente la cosa che questi tre campi esistono per impedire. */
  function clona(v) {
    try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
  }

  function esito(ok, passo, extra) {
    var o = { ok: !!ok, passo: passo };
    for (var k in (extra || {})) if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k];
    return o;
  }

  /* I campi senza i quali un preventivo riletto non serve a niente. `lines`
     compreso: un preventivo senza righe non ha un totale da difendere. */
  var CAMPI_QUOTE = ['id', 'name', 'lines', 'totalCost', 'netPrice', 'grossPrice'];
  var CAMPI_ORDINE = ['id', 'quoteId', 'name', 'total', 'stage', 'status'];

  function mancanti(record, campi) {
    if (!record) return campi.slice();
    return campi.filter(function (c) {
      var v = record[c];
      if (v === undefined || v === null) return true;
      if (Array.isArray(v)) return false;      /* un array vuoto è una scelta, non un buco */
      return v === '';
    });
  }

  /* ── Le porte ─────────────────────────────────────────────────────────────
     Il modulo non nomina `IDB`, `Quoter` o `App` direttamente: li riceve. È
     ciò che permette di provarne i fallimenti — un archivio che rifiuta la
     scrittura non si simula se il codice va a prenderselo da solo. */
  function porteDaGlobali(p) {
    var o = p || {};
    return {
      archivio: o.archivio || global.IDB || null,
      gestione: o.gestione || global.GestioneOrdini || null,
      naviga: o.naviga || function (rotta) {
        if (global.App && global.App.navigate) global.App.navigate(rotta);
      },
      avvisa: o.avvisa || function (msg, tipo) {
        if (typeof global.toast === 'function') global.toast(msg, tipo || 'info');
      },
      registra: o.registra || function (dove, err, ctx) {
        if (global.Ingly && global.Ingly.Errors) global.Ingly.Errors.log(dove, err, ctx || {});
        else if (global.console) global.console.error('[QuoteToOrder] ' + dove, err);
      },
      evento: o.evento || function (nome, dettaglio) {
        if (typeof document !== 'undefined' && document.dispatchEvent) {
          document.dispatchEvent(new CustomEvent(nome, { detail: dettaglio }));
        }
      },
      rotta: o.rotta || 'gestione_ordini',
    };
  }

  var decoratori = [];

  /** Un add-on aggiunge campi all'ordine da qui, invece di sostituire il
      metodo. La funzione riceve i dati dell'ordine e il preventivo verificato;
      quello che restituisce viene fuso. Se solleva, non ferma la pipeline: un
      accessorio non può impedire un ordine. */
  function aggiungiDecoratore(fn) {
    if (typeof fn === 'function' && decoratori.indexOf(fn) < 0) decoratori.push(fn);
  }
  function decoratoriAttivi() { return decoratori.length; }
  function svuotaDecoratori() { decoratori = []; }

  function decora(dati, quote, porte) {
    var out = dati;
    for (var i = 0; i < decoratori.length; i++) {
      try {
        var agg = decoratori[i](out, quote);
        if (agg && typeof agg === 'object') out = Object.assign({}, out, agg);
      } catch (e) {
        porte.registra('QuoteToOrder.decoratore', e, { indice: i });
      }
    }
    return out;
  }

  /* ── I passi ──────────────────────────────────────────────────────────── */

  /** Rilegge quello che si è appena scritto. È il passo che il flusso vecchio
      non aveva, ed è l'unico che distingue «salvato» da «detto salvato». */
  function verifica(archivio, store, id, campi) {
    if (!archivio || typeof archivio.get !== 'function') {
      return Promise.resolve({ ok: false, motivo: MOTIVI.archivioAssente });
    }
    return Promise.resolve(archivio.get(store, id)).then(function (rec) {
      if (!rec) return { ok: false, motivo: 'record non trovato dopo la scrittura' };
      var buchi = mancanti(rec, campi);
      if (buchi.length) return { ok: false, motivo: 'campi mancanti: ' + buchi.join(', '), record: rec };
      return { ok: true, record: rec };
    }).catch(function (e) {
      return { ok: false, motivo: String(e && e.message || e) };
    });
  }

  /** L'ordine che già porta questo preventivo, se c'è. La chiave è `quoteId`,
      confrontata come stringa: gli id sono numeri in un posto e stringhe in un
      altro, e un confronto stretto lascerebbe nascere il doppione. */
  function ordineEsistente(archivio, quoteId) {
    if (!archivio || typeof archivio.getAll !== 'function' || quoteId == null) {
      return Promise.resolve(null);
    }
    return Promise.resolve(archivio.getAll('orders')).then(function (tutti) {
      var k = String(quoteId);
      return (tutti || []).filter(function (o) { return o && String(o.quoteId) === k; })[0] || null;
    }).catch(function () { return null; });
  }

  /* ── La pipeline ──────────────────────────────────────────────────────── */

  /**
   * @param quoter  l'oggetto Quoter (serve `saveQuote`, `lines`, `_datiOrdine`)
   * @param opzioni porte iniettabili, per i test
   */
  async function invia(quoter, opzioni) {
    var porte = porteDaGlobali(opzioni);

    /* 1 · Validazione — prima di scrivere qualsiasi cosa. */
    if (!quoter) return esito(false, 'valida', { motivo: MOTIVI.quoteNonValido });
    if (!quoter.lines || !quoter.lines.length) {
      return esito(false, 'valida', { motivo: 'Aggiungi almeno una voce al preventivo' });
    }
    if (!porte.archivio) return esito(false, 'valida', { motivo: MOTIVI.archivioAssente });

    /* 2 · Salvataggio — e qui l'errore NON si inghiotte. Il flusso vecchio
       aveva `catch(()=>{})` e proseguiva: è il difetto che questo modulo
       esiste per rendere impossibile. */
    var salvato;
    try {
      salvato = await quoter.saveQuote();
    } catch (e) {
      porte.registra('QuoteToOrder.salva', e, {});
      return esito(false, 'salva', { motivo: MOTIVI.quoteNonSalvato + ': ' + (e && e.message || e) });
    }
    if (!salvato || salvato.ok !== true || salvato.id == null) {
      return esito(false, 'salva', {
        motivo: (salvato && salvato.motivo) || MOTIVI.quoteNonSalvato,
      });
    }

    /* 3 · Verifica del preventivo — si rilegge. */
    var vq = await verifica(porte.archivio, 'quotes', salvato.id, CAMPI_QUOTE);
    if (!vq.ok) {
      return esito(false, 'verificaQuote', {
        motivo: MOTIVI.quoteNonVerificato + ' (' + vq.motivo + ')',
        quoteId: salvato.id,
      });
    }
    var quote = vq.record;

    /* 4 · Idempotenza — prima di preparare, non dopo. Due clic non fanno due
       ordini, e il secondo clic non è un errore: è una domanda a cui si
       risponde «esiste già, eccolo». */
    var gia = await ordineEsistente(porte.archivio, quote.id);
    if (gia) {
      return esito(false, 'giaInviato', {
        motivo: MOTIVI.ordineGiaEsistente,
        quoteId: quote.id,
        orderId: gia.id,
        ordine: gia,
        duplicatoEvitato: true,
      });
    }

    /* 5 · Preparazione — il totale viene dal preventivo verificato, mai da una
       formula locale. Il flusso vecchio ricalcolava `subtotal × (1 + markup)`
       e produceva un ordine che non corrispondeva al preventivo che il cliente
       aveva visto. */
    var dati = {
      quoteId: quote.id,
      clientId: quote.clientId != null ? quote.clientId : null,
      clientName: quote.clientName || '',
      name: quote.name || 'Ordine da preventivo',
      /* Netto: è quello che l'azienda incassa, ed è il numero su cui si
         ragiona in produzione. Che sia il netto è dichiarato qui e nel
         documento, perché un totale senza unità è un totale ambiguo. */
      total: Number(quote.netPrice) || 0,
      totalNet: Number(quote.netPrice) || 0,
      totalGross: Number(quote.grossPrice) || 0,
      totalCost: Number(quote.totalCost) || 0,
      dueDate: quote.deadline || '',
      notes: quote.notes || '',
      priority: quote.priority || 'Media',
      discount: quote.discount || 0,
      ivaMode: quote.ivaMode !== false,
    };
    /* Lo storico economico si porta con sé, non si ricostruisce: è congelato
       nel preventivo con la versione del motore che l'ha prodotto. */
    if (quote.economicSnapshot) dati.economicSnapshot = quote.economicSnapshot;

    /* ── La distinta economica, in tre copie che vogliono dire tre cose ────
       · `costBreakdown`    — le voci, come si leggono oggi sull'ordine;
       · `pricingSnapshot`  — la fotografia di quello che era stato preventivato,
                              e non si tocca mai più;
       · `currentPricing`   — quello che si sta facendo davvero. Parte identico
                              allo snapshot e diverge quando qualcuno modifica
                              una voce in lavorazione.

       La differenza fra il secondo e il terzo è lo scostamento, ed è l'unica
       cosa che a fine mese dice se si è guadagnato quanto si pensava.
       Modificare l'ordine non modifica il preventivo: sono due momenti diversi
       della stessa storia, e confonderli vuol dire perdere il termine di
       paragone. */
    var distinta = quote.costBreakdown || (quote.pricingSnapshot || null);
    if (distinta) {
      dati.costBreakdown = clona(distinta);
      dati.pricingSnapshot = clona(quote.pricingSnapshot || distinta);
      dati.currentPricing = clona(quote.pricingSnapshot || distinta);
      dati.pricingHistory = [];
    }
    /* Il modello economico canonico viaggia per primo: è quello che rende
       l'ordine leggibile da solo. Se il preventivo non ce l'ha — perché è
       stato salvato prima che esistesse — se ne costruisce uno dai campi che
       ha, marcato `legacy`, invece di lasciare l'ordine muto. */
    if (quote.economic) {
      dati.economic = clona(quote.economic);
    } else {
      var B = global.InglyCostBreakdown;
      if (B && typeof B.economicoLegacy === 'function') {
        dati.economic = B.economicoLegacy(quote);
      }
    }
    if (quote.pricingEngineVersion) dati.pricingEngineVersion = quote.pricingEngineVersion;
    if (quote.pricingProfile) dati.pricingProfile = quote.pricingProfile;

    /* I dati del prodotto viaggiano con l'economia: un ordine che sa quanto
       costa e non sa di che cosa è un ordine a metà. */
    if (Array.isArray(quote.lines)) dati.items = clona(quote.lines);
    dati = decora(dati, quote, porte);

    /* 6 · Creazione. */
    if (!porte.gestione || typeof porte.gestione._saveOrderFromQuoter !== 'function') {
      return esito(false, 'creaOrdine', { motivo: MOTIVI.gestioneAssente, quoteId: quote.id });
    }
    var creato;
    try {
      creato = await porte.gestione._saveOrderFromQuoter(dati);
    } catch (e) {
      porte.registra('QuoteToOrder.creaOrdine', e, { quoteId: quote.id });
      return esito(false, 'creaOrdine', {
        motivo: MOTIVI.ordineNonCreato + ': ' + (e && e.message || e),
        quoteId: quote.id, quoteSalvato: true,
      });
    }
    /* Si accetta sia il risultato strutturato nuovo sia l'ordine nudo che
       restituivano le versioni precedenti: un adattatore vecchio non deve far
       fallire la pipeline, ma nemmeno passare per riuscito se non c'è un id. */
    var orderId = creato && (creato.ok === true ? creato.id : creato.id);
    if (creato && creato.ok === false) {
      return esito(false, 'creaOrdine', {
        motivo: creato.motivo || MOTIVI.ordineNonCreato,
        quoteId: quote.id, quoteSalvato: true,
      });
    }
    if (orderId == null) {
      return esito(false, 'creaOrdine', {
        motivo: MOTIVI.ordineNonCreato, quoteId: quote.id, quoteSalvato: true,
      });
    }

    /* 7 · Verifica dell'ordine — si rilegge anche questo. */
    var vo = await verifica(porte.archivio, 'orders', orderId, CAMPI_ORDINE);
    if (!vo.ok) {
      return esito(false, 'verificaOrdine', {
        motivo: MOTIVI.ordineNonVerificato + ' (' + vo.motivo + ')',
        quoteId: quote.id, orderId: orderId, quoteSalvato: true,
      });
    }
    var ordine = vo.record;

    /* 8 · Il legame nei due versi. `orders.quoteId` esiste già; qui si scrive
       il ritorno, perché da un preventivo si deve poter arrivare al suo ordine
       senza scandire tutti gli ordini. Se questa scrittura fallisce l'ordine
       resta valido: il legame è ricostruibile da `quoteId`, quindi si registra
       e si prosegue invece di annullare un ordine buono. */
    try {
      quote.orderId = ordine.id;
      quote.status = 'inviato';
      await porte.archivio.put('quotes', quote);
    } catch (e) {
      porte.registra('QuoteToOrder.collega', e, { quoteId: quote.id, orderId: ordine.id });
    }

    /* L'evento parte **dopo** la verifica, non prima: chi lo ascolta aggiorna
       liste e badge, e farlo su un ordine che potrebbe non esistere significa
       mostrare una riga che sparisce al ricaricamento. */
    porte.evento('orderUpdated', { id: ordine.id, to: ordine.stage, order: ordine });

    return esito(true, 'completato', {
      quoteId: quote.id, orderId: ordine.id, ordine: ordine, quote: quote,
      totale: dati.total,
    });
  }

  /** Il messaggio da mostrare, in italiano e specifico: «Errore generico» non
      dice a nessuno cosa fare dopo. */
  function messaggio(r) {
    if (!r) return { testo: 'Operazione non riuscita', tipo: 'error' };
    if (r.ok) return { testo: '✓ Ordine #' + r.orderId + ' creato', tipo: 'success' };
    if (r.duplicatoEvitato) return { testo: MOTIVI.ordineGiaEsistente, tipo: 'info' };
    if (r.quoteSalvato) {
      return { testo: 'Preventivo salvato, ma creazione ordine non riuscita: ' + (r.motivo || ''), tipo: 'error' };
    }
    return { testo: r.motivo || 'Operazione non riuscita', tipo: 'error' };
  }

  global.InglyQuoteToOrder = {
    VERSIONE: VERSIONE,
    MOTIVI: MOTIVI,
    CAMPI_QUOTE: CAMPI_QUOTE,
    CAMPI_ORDINE: CAMPI_ORDINE,
    invia: invia,
    verifica: verifica,
    ordineEsistente: ordineEsistente,
    mancanti: mancanti,
    messaggio: messaggio,
    aggiungiDecoratore: aggiungiDecoratore,
    decoratoriAttivi: decoratoriAttivi,
    _svuotaDecoratori: svuotaDecoratori,
  };
})(typeof window !== 'undefined' ? window : globalThis);

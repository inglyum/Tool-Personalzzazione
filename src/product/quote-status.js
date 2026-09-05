/* ═══════════════════════════════════════════════════════════════════════════
   STATO DEL PREVENTIVO · un vocabolario solo, e i legami che lo reggono
   ═══════════════════════════════════════════════════════════════════════════

   ── Il difetto, misurato ───────────────────────────────────────────────────
   Un preventivo appena salvato nasce con `status: 'in_attesa'`. La striscia
   «Pipeline €» del CRM sommava i preventivi con stato `'inviato'` oppure
   `'bozza'`.

   Nessuno dei due valori viene mai scritto da nessuna parte del programma.

   Quindi: ogni preventivo nasceva già fuori dal conto. La pipeline segnava
   zero euro qualunque cosa si facesse, e i preventivi restavano fermi — non
   perché il salvataggio fallisse, ma perché lo stato con cui nascevano non
   esisteva nel vocabolario di chi li leggeva.

   In tutto il progetto convivevano tre vocabolari per la stessa cosa:
   quello italiano del preventivatore (`in_attesa`, `accettato`, `confermato`,
   `produzione`, `rifiutato`), quello inglese del dominio (`draft`, `sent`,
   `accepted`…) e quello degli stati d'ordine, che è un'altra cosa ancora.

   ── Cosa fa questo modulo ──────────────────────────────────────────────────
   Dichiara **un** insieme di stati, con i nomi che la direttiva chiede, e
   traduce ogni valore storico in uno di quelli. Non rinomina niente nei dati:
   traduce in lettura, così i record esistenti continuano a valere e nessuna
   migrazione può perdere un preventivo.

   ── Quello che non inventa ─────────────────────────────────────────────────
   «Visto» esiste nel vocabolario perché è uno stato reale del ciclo di vita,
   ma si produce **solo** se il record porta una data di visione. Finché
   nessuno la registra, nessun preventivo risulterà «visto»: dedurlo dal
   fatto che è stato inviato sarebbe una statistica inventata.

   «Scaduto» invece si deriva, e si dichiara derivato: un preventivo ancora
   aperto con la data di validità passata è scaduto di fatto, e continuare a
   contarlo in pipeline gonfia un numero su cui si prendono decisioni.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  /* ── Il vocabolario ─────────────────────────────────────────────────────
     `aperto` dice se il preventivo è ancora in gioco: è la proprietà che
     decide la pipeline, e averla qui evita che ogni vista se la ricostruisca
     con un elenco di stringhe. */
  var STATI = {
    DRAFT: { id: 'DRAFT', label: 'Bozza', aperto: true, colore: '#6b7280', ordine: 1 },
    SENT: { id: 'SENT', label: 'Inviato', aperto: true, colore: '#f59e0b', ordine: 2 },
    VIEWED: { id: 'VIEWED', label: 'Visto dal cliente', aperto: true, colore: '#3b82f6', ordine: 3 },
    ACCEPTED: { id: 'ACCEPTED', label: 'Accettato', aperto: true, colore: '#22c55e', ordine: 4 },
    CONVERTED: { id: 'CONVERTED', label: 'Convertito in ordine', aperto: false, colore: '#16a34a', ordine: 5 },
    REJECTED: { id: 'REJECTED', label: 'Rifiutato', aperto: false, colore: '#ef4444', ordine: 6 },
    EXPIRED: { id: 'EXPIRED', label: 'Scaduto', aperto: false, colore: '#78716c', ordine: 7 },
  };

  /* ── I nomi storici ─────────────────────────────────────────────────────
     A sinistra tutto ciò che esiste davvero nei dati o nel codice, compresi
     i due valori che nessuno scriveva ma che qualcuno leggeva. Toglierli
     dalla tabella riaprirebbe lo stesso difetto al primo import. */
  var ALIAS = {
    // preventivatore, italiano
    in_attesa: 'DRAFT', bozza: 'DRAFT', nuovo: 'DRAFT',
    inviato: 'SENT', spedito: 'SENT', mandato: 'SENT',
    visto: 'VIEWED', visualizzato: 'VIEWED',
    accettato: 'ACCEPTED', approvato: 'ACCEPTED',
    confermato: 'CONVERTED', produzione: 'CONVERTED', ordinato: 'CONVERTED',
    rifiutato: 'REJECTED', perso: 'REJECTED', annullato: 'REJECTED',
    scaduto: 'EXPIRED',
    // dominio, inglese
    draft: 'DRAFT', sent: 'SENT', viewed: 'VIEWED', opened: 'VIEWED',
    accepted: 'ACCEPTED', approved: 'ACCEPTED',
    converted: 'CONVERTED', confirmed: 'CONVERTED', won: 'CONVERTED',
    rejected: 'REJECTED', declined: 'REJECTED', lost: 'REJECTED', cancelled: 'REJECTED', canceled: 'REJECTED',
    expired: 'EXPIRED',
  };

  function normalizza(valore) {
    var s = String(valore == null ? '' : valore).trim().toLowerCase().replace(/[\s-]/g, '_');
    if (!s) return null;
    if (STATI[s.toUpperCase()]) return s.toUpperCase();
    return ALIAS[s] || null;
  }

  var GIORNO = 24 * 60 * 60 * 1000;

  /**
   * Lo stato di un preventivo, com'è davvero.
   *
   * @param {object} q il record
   * @param {object} [opz] `{ oggi, orders, sales }`
   * @returns {{id,label,aperto,colore,fonte,derivato,motivo}}
   */
  function statoDi(q, opz) {
    var o = q || {};
    var opzioni = opz || {};
    var oggi = opzioni.oggi ? new Date(opzioni.oggi) : new Date();

    /* Un ordine che nomina questo preventivo è la prova più forte che
       esista: batte qualunque stato scritto nel record, perché lo stato può
       non essere stato aggiornato mentre l'ordine c'è. */
    var ordine = opzioni.orders ? ordineDi(o, opzioni.orders) : null;
    if (ordine) {
      return descrivi('CONVERTED', 'ordine collegato', false, 'esiste l ordine ' + (ordine.id != null ? ordine.id : ''));
    }

    var dichiarato = normalizza(o.status || o.stato || o.state);
    if (dichiarato === 'CONVERTED' || dichiarato === 'REJECTED') {
      return descrivi(dichiarato, 'stato dichiarato', false, null);
    }

    /* Scaduto: derivato dalla data di validità, e solo su un preventivo
       ancora aperto. Non si scrive nel record — è un fatto del calendario,
       e domani un rinnovo della validità lo cambia da solo. */
    var scadenza = o.validUntil || o.deadline || o.expiresAt;
    if (scadenza) {
      var d = new Date(scadenza);
      if (!isNaN(d.getTime()) && d.getTime() + GIORNO <= oggi.getTime()) {
        return descrivi('EXPIRED', 'derivato dalla data di validità', true,
          'validità scaduta il ' + String(scadenza).slice(0, 10));
      }
    }

    /* Visto: solo se qualcuno l'ha registrato. Dedurlo dall'invio sarebbe
       una statistica inventata. */
    if (!dichiarato && (o.viewedAt || o.vistoIl)) {
      return descrivi('VIEWED', 'data di visione registrata', false, null);
    }

    if (dichiarato) return descrivi(dichiarato, 'stato dichiarato', false, null);

    /* Nessuno stato scritto: è una bozza, che è il posto giusto per un
       preventivo di cui non si sa altro — resta aperto e resta in pipeline. */
    return descrivi('DRAFT', 'nessuno stato nel record', true, 'stato assente: trattato come bozza');
  }

  function descrivi(id, fonte, derivato, motivo) {
    var s = STATI[id] || STATI.DRAFT;
    return {
      id: s.id, label: s.label, aperto: s.aperto, colore: s.colore, ordine: s.ordine,
      fonte: fonte, derivato: !!derivato, motivo: motivo || null,
    };
  }

  /* ── I legami ───────────────────────────────────────────────────────────
     Un ordine nato da un preventivo lo nomina in uno di cinque campi, a
     seconda di chi l'ha creato: `originQuote`, `quoteId`, `_fromQuoteId`,
     `fromQuote`, `sourceQuoteId`. Erano cinque letture sparse; qui è una. */
  var CAMPI_QUOTE = ['originQuote', 'quoteId', '_fromQuoteId', 'fromQuote', 'sourceQuoteId'];
  var CAMPI_ORDER = ['orderId', 'originOrder', '_orderId'];

  function riferimento(rec, campi) {
    for (var i = 0; i < campi.length; i += 1) {
      var v = rec ? rec[campi[i]] : null;
      if (v != null && v !== '') return String(v);
    }
    return null;
  }

  /** L'id del preventivo da cui un ordine è nato, comunque sia scritto. */
  function quoteIdDi(ordine) { return riferimento(ordine, CAMPI_QUOTE); }
  /** L'id dell'ordine nato da un preventivo, comunque sia scritto. */
  function orderIdDi(preventivo) { return riferimento(preventivo, CAMPI_ORDER); }

  /** L'ordine nato da questo preventivo, cercato in entrambe le direzioni. */
  function ordineDi(preventivo, ordini) {
    if (!preventivo || !Array.isArray(ordini)) return null;
    var mio = orderIdDi(preventivo);
    for (var i = 0; i < ordini.length; i += 1) {
      var o = ordini[i];
      if (!o) continue;
      if (mio != null && String(o.id) === mio) return o;
      var suo = quoteIdDi(o);
      if (suo != null && preventivo.id != null && suo === String(preventivo.id)) return o;
    }
    return null;
  }

  /** Il preventivo da cui questo ordine è nato. */
  function preventivoDi(ordine, preventivi) {
    if (!ordine || !Array.isArray(preventivi)) return null;
    var suo = quoteIdDi(ordine);
    for (var i = 0; i < preventivi.length; i += 1) {
      var q = preventivi[i];
      if (!q) continue;
      if (suo != null && String(q.id) === suo) return q;
      var mio = orderIdDi(q);
      if (mio != null && ordine.id != null && mio === String(ordine.id)) return q;
    }
    return null;
  }

  /* ── Il cliente ─────────────────────────────────────────────────────────
     Un preventivo appartiene a un cliente per id. Il nome è un ripiego per i
     record vecchi, che l'id non ce l'hanno: si accetta, ma si dichiara,
     perché due clienti omonimi sono un problema reale. */
  function appartieneA(rec, cliente) {
    if (!rec || !cliente) return null;
    var idRec = rec.clientId != null ? rec.clientId : rec.customerId;
    if (idRec != null && cliente.id != null && String(idRec) === String(cliente.id)) {
      return { collegato: true, per: 'id' };
    }
    var nomeRec = String(rec.clientName || rec.client || '').trim().toLowerCase();
    var nomeCli = String(cliente.name || '').trim().toLowerCase();
    if (nomeRec && nomeCli && nomeRec === nomeCli) return { collegato: true, per: 'nome' };
    return { collegato: false, per: null };
  }

  /** I preventivi di un cliente, con il modo in cui sono stati riconosciuti. */
  function preventiviDi(cliente, preventivi) {
    return (Array.isArray(preventivi) ? preventivi : []).filter(function (q) {
      var a = appartieneA(q, cliente);
      return a && a.collegato;
    });
  }

  /* ── La pipeline ────────────────────────────────────────────────────────
     Il valore ancora in gioco: i preventivi aperti, e basta. Il criterio è
     `aperto` del vocabolario, non un elenco di stringhe ricopiato in ogni
     vista — è ricopiandolo che si era perso `in_attesa`. */
  function pipeline(preventivi, opz) {
    var lista = Array.isArray(preventivi) ? preventivi : [];
    var conteggi = {};
    Object.keys(STATI).forEach(function (k) { conteggi[k] = 0; });
    var valore = 0; var aperti = 0; var scadutiDerivati = 0;

    lista.forEach(function (q) {
      var s = statoDi(q, opz);
      conteggi[s.id] += 1;
      if (s.id === 'EXPIRED' && s.derivato) scadutiDerivati += 1;
      if (s.aperto) {
        aperti += 1;
        var v = parseFloat(q.grossPrice != null ? q.grossPrice : (q.netPrice != null ? q.netPrice : q.total));
        if (isFinite(v)) valore += v;
      }
    });

    var chiusi = conteggi.CONVERTED + conteggi.REJECTED + conteggi.EXPIRED;
    return {
      totale: lista.length,
      aperti: aperti,
      valore: valore,
      conteggi: conteggi,
      scadutiDerivati: scadutiDerivati,
      /* Conversione: sui preventivi decisi, non su tutti. Includere quelli
         ancora aperti al denominatore fa scendere il tasso ogni volta che si
         fa un preventivo nuovo, che è l'opposto di quello che vuol dire. */
      conversionePct: chiusi > 0 ? (conteggi.CONVERTED / chiusi) * 100 : null,
      decisi: chiusi,
    };
  }

  global.InglyQuoteStatus = {
    VERSIONE: '1.0.0',
    STATI: STATI,
    ALIAS: ALIAS,
    normalizza: normalizza,
    statoDi: statoDi,
    quoteIdDi: quoteIdDi,
    orderIdDi: orderIdDi,
    ordineDi: ordineDi,
    preventivoDi: preventivoDi,
    appartieneA: appartieneA,
    preventiviDi: preventiviDi,
    pipeline: pipeline,
  };
})(typeof window !== 'undefined' ? window : globalThis);

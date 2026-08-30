/* ═══════════════════════════════════════════════════════════════════════════
   CLIENTE · INTEGRITÀ — non si cancella un cliente che ha una storia
   ═══════════════════════════════════════════════════════════════════════════

   Oggi `Clients.del()` chiama `IDB.del('clients', id)` e basta. Nessuno chiede
   se quel cliente abbia ordini, preventivi o vendite. Quando li ha, i suoi
   documenti restano con un `clientId` che non punta più a niente: nella
   scheda dell'ordine compare uno spazio vuoto dove c'era un nome, e nessuna
   schermata sa dire di chi fosse quel lavoro.

   Il danno non si vede il giorno in cui si cancella. Si vede sei mesi dopo,
   quando qualcuno cerca gli ordini di un cliente e ne trova meno di quanti ne
   ricordava — e non c'è modo di sapere quali mancano, perché il collegamento
   è sparito insieme al record.

   La regola, ripresa dalla direttiva: **un cliente con ordini, preventivi,
   fatture o pagamenti non si elimina. Si archivia.**

   Archiviare non è nascondere: il cliente resta, i suoi documenti restano
   collegati, la rubrica smette di mostrarlo fra quelli attivi. È reversibile,
   e la ragione per cui è stato archiviato resta scritta.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  /* Gli archivi che possono contenere un riferimento a un cliente, con il
     campo che lo contiene. Sono dichiarati: dedurli dai nomi funzionerebbe
     finché qualcuno non chiama un campo `customer` invece di `clientId`, e
     quel giorno il presidio smetterebbe di presidiare in silenzio. */
  var RIFERIMENTI = [
    { store: 'orders', campi: ['clientId', 'client_id', 'clienteId'], label: 'ordini' },
    { store: 'quotes', campi: ['clientId', 'client_id', 'clienteId'], label: 'preventivi' },
    { store: 'sales', campi: ['clientId', 'client_id', 'clienteId'], label: 'vendite' },
    { store: 'invoices', campi: ['clientId', 'client_id'], label: 'fatture' },
    { store: 'payments', campi: ['clientId', 'client_id'], label: 'pagamenti' },
  ];

  var STATI = {
    ATTIVO: 'ACTIVE',
    ARCHIVIATO: 'ARCHIVED',
  };

  function stesso(a, b) {
    if (a == null || b == null) return false;
    return String(a) === String(b);
  }

  /** Conta cosa dipende da questo cliente. Un archivio che non esiste non è un
      errore: è un modulo non installato, e vale zero. */
  async function dipendenze(clientId, opzioni) {
    var o = opzioni || {};
    var db = o.db || global.IDB;
    var out = { totale: 0, perArchivio: {}, dettaglio: [] };
    if (!db || typeof db.getAll !== 'function' || clientId == null) return out;

    for (var i = 0; i < RIFERIMENTI.length; i++) {
      var r = RIFERIMENTI[i];
      var righe = await db.getAll(r.store).catch(function () { return null; });
      if (!righe) continue;                       // archivio assente: non è zero, è «non pertinente»
      var trovate = righe.filter(function (x) {
        if (!x) return false;
        for (var c = 0; c < r.campi.length; c++) if (stesso(x[r.campi[c]], clientId)) return true;
        return false;
      });
      if (!trovate.length) continue;
      out.perArchivio[r.store] = trovate.length;
      out.totale += trovate.length;
      out.dettaglio.push({ store: r.store, label: r.label, quante: trovate.length,
        /* Qualche riferimento concreto: «tre ordini» è un numero, «ORD-2026-014»
           è una cosa che si può andare a guardare. */
        esempi: trovate.slice(0, 3).map(function (x) {
          return x.number || x.code || x.ref || ('#' + (x.id != null ? x.id : '?'));
        }) });
    }
    return out;
  }

  /** Si può eliminare davvero? La risposta è no ogni volta che esiste una
      storia, e il motivo dice quale. */
  async function puoEliminare(clientId, opzioni) {
    var d = await dipendenze(clientId, opzioni);
    if (d.totale === 0) {
      return { ok: true, dipendenze: d, azione: 'elimina',
        spiega: 'Nessun documento collegato: si può eliminare senza perdere niente.' };
    }
    return {
      ok: false, dipendenze: d, azione: 'archivia',
      spiega: 'Questo cliente ha ' + descrivi(d) + '. Eliminarlo lascerebbe '
        + (d.totale === 1 ? 'quel documento' : 'quei documenti')
        + ' senza intestatario: il collegamento sparirebbe insieme alla scheda, e '
        + 'non ci sarebbe modo di sapere di chi fosse il lavoro. Si archivia.',
    };
  }

  function descrivi(d) {
    var parti = d.dettaglio.map(function (x) {
      return x.quante + ' ' + (x.quante === 1 ? x.label.replace(/i$/, x.label === 'vendite' ? 'a' : 'e') : x.label);
    });
    if (parti.length === 1) return parti[0];
    return parti.slice(0, -1).join(', ') + ' e ' + parti[parti.length - 1];
  }

  /** Il record archiviato. Non si cancella niente e non si tocca nient'altro:
      si aggiungono tre campi, e restano visibili. */
  function archivia(cliente, motivo) {
    var c = Object.assign({}, cliente || {});
    c.status = STATI.ARCHIVIATO;
    c.archivedAt = new Date().toISOString();
    c.archivedReason = motivo || 'archiviato dalla rubrica';
    return c;
  }

  /** Il ritorno indietro, perché archiviare deve essere reversibile: chi
      archivia per errore non deve dover ricreare la scheda. */
  function riattiva(cliente) {
    var c = Object.assign({}, cliente || {});
    c.status = STATI.ATTIVO;
    c.archivedAt = null;
    c.archivedReason = null;
    c.reactivatedAt = new Date().toISOString();
    return c;
  }

  function eArchiviato(cliente) {
    return !!cliente && String(cliente.status || '').toUpperCase() === STATI.ARCHIVIATO;
  }

  /** Gli attivi: quello che la rubrica mostra per impostazione predefinita.
      Un cliente senza `status` è attivo — è la condizione di ogni scheda
      creata prima di questa regola, e trattarla come archiviata farebbe
      sparire l'intera rubrica al primo aggiornamento. */
  function attivi(clienti) {
    return (clienti || []).filter(function (c) { return !eArchiviato(c); });
  }

  function archiviati(clienti) {
    return (clienti || []).filter(eArchiviato);
  }

  global.InglyClienteIntegrita = {
    version: VERSIONE,
    STATI: STATI,
    RIFERIMENTI: RIFERIMENTI,
    dipendenze: dipendenze,
    puoEliminare: puoEliminare,
    archivia: archivia,
    riattiva: riattiva,
    eArchiviato: eArchiviato,
    attivi: attivi,
    archiviati: archiviati,
  };
})(typeof window !== 'undefined' ? window : globalThis);

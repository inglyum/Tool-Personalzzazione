/* ═══════════════════════════════════════════════════════════════════════════
   CLIENTI — una lista sola, misurata prima di essere unita
   ═══════════════════════════════════════════════════════════════════════════

   Il difetto, misurato nel browser e non dedotto: scrivendo un cliente su
   IndexedDB e un altro su `ingly_crm_v1`, `CRMSmart._load()` vede solo il
   secondo e `IDB.getAll('clients')` solo il primo. **Due liste disgiunte.**

   Le conseguenze non sono estetiche. Ordini, preventivi e vendite riferiscono
   un cliente per `clientId` nell'archivio IndexedDB; la rubrica scrive in
   localStorage. Un cliente creato dalla rubrica non compare mai nel menu di un
   preventivo, e chi lo cerca conclude che il prodotto abbia perso i dati —
   mentre sono lì, dall'altra parte.

   Quale delle due è la verità? Nessuna delle due da sola:

   - IndexedDB è l'archivio **riferito**: quattro moduli ci puntano per id, e
     il presidio di integrità (CRM-11) legge lì. È il canonico.
   - localStorage è dove la rubrica ha scritto per anni. Buttarlo perderebbe
     i clienti veri di chi usa il prodotto oggi.

   Quindi: si uniscono, IndexedDB diventa il canonico, e localStorage resta
   come **specchio di compatibilità** — non una seconda verità, ma una copia
   che un solo scrittore mantiene, finché le patch 076/080/081/092/095 che lo
   leggono direttamente non saranno portate qui. Lo specchio è dichiarato,
   non nascosto, ed è la differenza fra un compromesso e un difetto.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';
  var CHIAVE_SPECCHIO = 'ingly_crm_v1';
  var ARCHIVIO = 'clients';

  function G() { return global.InglyClienteIntegrita; }

  var testo = function (v) { return String(v == null ? '' : v).trim(); };

  /** Due schede sono lo stesso cliente se hanno lo stesso id, oppure la stessa
      email non vuota. L'email è il secondo criterio perché è l'unico campo che
      chi importa una rubrica compila davvero sempre; il nome no — «Rossi» e
      «Rossi S.r.l.» sono spesso due clienti diversi, e unirli per nome
      fonderebbe schede che devono restare separate. */
  function chiavi(c) {
    var k = [];
    if (c && c.id != null && testo(c.id) !== '') k.push('id:' + testo(c.id));
    var e = testo(c && (c.email || c.mail)).toLowerCase();
    if (e && e.indexOf('@') > 0) k.push('email:' + e);
    return k;
  }

  /* ── L'unione ─────────────────────────────────────────────────────────────
     Quando lo stesso cliente esiste da entrambe le parti non se ne sceglie
     uno: si uniscono i campi, e vince il **non vuoto**. Scegliere il record
     più recente perderebbe un telefono scritto sull'altro. */
  function fondi(a, b) {
    var out = Object.assign({}, a);
    Object.keys(b || {}).forEach(function (k) {
      var v = b[k];
      if (v == null || v === '') return;
      if (out[k] == null || out[k] === '') { out[k] = v; return; }
      /* Su un conflitto vero vince il canonico (a), ma la differenza si
         registra: un dato scartato in silenzio è un dato perso. */
      if (testo(out[k]) !== testo(v)) {
        out._conflitti = out._conflitti || {};
        out._conflitti[k] = { tenuto: out[k], scartato: v };
      }
    });
    return out;
  }

  function unisci(canonici, specchio) {
    var indice = {};
    var elenco = [];

    var aggiungi = function (c, provenienza) {
      if (!c) return;
      var ks = chiavi(c);
      var esistente = null;
      for (var i = 0; i < ks.length; i++) if (indice[ks[i]]) { esistente = indice[ks[i]]; break; }
      if (esistente) {
        var fuso = fondi(esistente, c);
        fuso._fonti = (esistente._fonti || []).concat([provenienza]);
        var pos = elenco.indexOf(esistente);
        if (pos >= 0) elenco[pos] = fuso;
        ks.concat(chiavi(fuso)).forEach(function (k) { indice[k] = fuso; });
        return;
      }
      var nuovo = Object.assign({}, c);
      nuovo._fonti = [provenienza];
      elenco.push(nuovo);
      ks.forEach(function (k) { indice[k] = nuovo; });
    };

    (canonici || []).forEach(function (c) { aggiungi(c, 'archivio'); });
    (specchio || []).forEach(function (c) { aggiungi(c, 'rubrica'); });
    return elenco;
  }

  /* ── Lettura ──────────────────────────────────────────────────────────── */

  function daSpecchio() {
    try {
      var d = JSON.parse(global.localStorage.getItem(CHIAVE_SPECCHIO) || '[]');
      return Array.isArray(d) ? d : [];
    } catch (e) { return []; }
  }

  /** Un id per chi non ce l'ha. Senza, due schede senza id e senza email
      sarebbero indistinguibili e l'unione le fonderebbe in una sola. */
  function conId(elenco) {
    var n = 0;
    (elenco || []).forEach(function (c, i) {
      if (c && (c.id == null || testo(c.id) === '')) {
        c.id = 'c' + Date.now().toString(36) + i.toString(36) + Math.floor(Math.random() * 1e6).toString(36);
        n++;
      }
    });
    return n;
  }

  /* La cache serve perché le viste della rubrica leggono in modo sincrono
     mentre IndexedDB risponde in modo asincrono. Come le altre cache di questo
     progetto, dichiara quando è stata riempita. */
  /* La cache tiene **solo la parte canonica**, quella che arriva da IndexedDB
     in modo asincrono. Lo specchio si rilegge a ogni chiamata, perché è
     sincrono e perché altre patch lo scrivono ancora direttamente: tenerlo in
     cache significherebbe non accorgersi di un'importazione VCF fatta due
     secondi fa.

     È il difetto che il collaudo della paginazione ha trovato — l'elenco
     restava fermo a quello letto all'avvio — e la struttura scelta lo rende
     impossibile invece di rimediarvi. */
  var cache = { pronta: false, quando: null, canonici: [] };

  async function carica(opzioni) {
    var o = opzioni || {};
    var db = o.db || global.IDB;
    var canonici = [];
    if (db && typeof db.getAll === 'function') {
      canonici = await db.getAll(ARCHIVIO).catch(function () { return []; }) || [];
    }
    cache = { pronta: true, quando: new Date().toISOString(), canonici: canonici };
    return elenco(o);
  }

  /** Lettura sincrona per chi disegna: la parte canonica dalla cache, lo
      specchio adesso. Prima che la cache sia pronta resta comunque lo
      specchio — è quello che la rubrica mostrava, e restituire un elenco
      vuoto farebbe lampeggiare «nessun cliente» a chi ne ha trecento. */
  function elenco(opzioni) {
    var o = opzioni || {};
    var specchio = o.specchio || daSpecchio();

    /* Gli id si assegnano **una volta e si salvano**. Assegnarli su una copia
       temporanea, come faceva la prima versione, ne generava di nuovi a ogni
       lettura: la riga disegnata portava un id e la lettura successiva un
       altro, quindi «modifica» ed «elimina» non trovavano più il contatto —
       che è esattamente il difetto di identità che CRM-03 aveva chiuso, e che
       questa unione stava riaprendo dal lato opposto. */
    var nuovi = conId(specchio);
    if (nuovi && !o.specchio) {
      try { global.localStorage.setItem(CHIAVE_SPECCHIO, JSON.stringify(specchio)); }
      catch (e) { /* spazio esaurito: gli id restano in memoria per questa sessione */ }
    }

    var e = unisci(cache.canonici, specchio);
    conId(e);   // per un canonico senza id, che non si può salvare da qui
    return e;
  }

  function perId(id) {
    var k = testo(id);
    return elenco().filter(function (c) { return testo(c.id) === k; })[0] || null;
  }

  function attivi() {
    var g = G();
    return g ? g.attivi(elenco()) : elenco();
  }

  /* ── Scrittura ────────────────────────────────────────────────────────────
     Un solo scrittore, due destinazioni. Non è «due copie»: è una copia
     canonica e uno specchio che nessun altro scrive. */
  async function salva(cliente, opzioni) {
    var o = opzioni || {};
    var db = o.db || global.IDB;
    var c = Object.assign({}, cliente || {});
    if (c.id == null || testo(c.id) === '') {
      c.id = 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
    }
    /* I campi di servizio dell'unione non si salvano: descrivono da dove è
       arrivato un record, non il cliente. */
    delete c._fonti; delete c._conflitti;
    c.updatedAt = new Date().toISOString();
    if (!c.createdAt) c.createdAt = c.updatedAt;

    if (db && typeof db.put === 'function') await db.put(ARCHIVIO, c).catch(function () {});
    scriviSpecchio(c);
    /* La parte canonica in cache si aggiorna subito: aspettare una rilettura
       di IndexedDB farebbe sparire per un istante il cliente appena salvato.
       Lo specchio non serve aggiornarlo in cache — si rilegge da solo. */
    var i = cache.canonici.findIndex(function (x) { return testo(x && x.id) === testo(c.id); });
    if (i >= 0) cache.canonici[i] = c; else cache.canonici.push(c);
    return c;
  }

  function scriviSpecchio(c) {
    try {
      var d = daSpecchio();
      var i = d.findIndex(function (x) { return testo(x.id) === testo(c.id); });
      if (i >= 0) d[i] = c; else d.push(c);
      global.localStorage.setItem(CHIAVE_SPECCHIO, JSON.stringify(d));
    } catch (e) { /* spazio esaurito: il canonico è già salvato */ }
  }

  /* ── Eliminare ────────────────────────────────────────────────────────────
     Trovato dal collaudo nel browser, non previsto: cancellare dall'archivio
     senza togliere dallo specchio faceva **risorgere** il cliente alla
     migrazione successiva, che lo ritrovava nello specchio e lo riscriveva.
     Un record che torna dopo essere stato cancellato è peggio di uno che non
     si cancella: nessuno va a ricontrollare.

     Chi ha documenti collegati non arriva qui — lo ferma il presidio di
     integrità — ma il presidio si controlla comunque, perché un secondo
     chiamante potrebbe dimenticarsene. */
  async function elimina(id, opzioni) {
    var o = opzioni || {};
    var db = o.db || global.IDB;
    var k = testo(id);

    if (!o.forza) {
      var g = G();
      if (g && db) {
        var v = await g.puoEliminare(id, { db: db });
        if (!v.ok) return { ok: false, motivo: v.spiega, azione: 'archivia', dipendenze: v.dipendenze };
      }
    }

    /* Se l'archivio non sa cancellare, non si dichiara di aver cancellato:
       togliere solo dallo specchio farebbe sparire il cliente dalla rubrica
       lasciandolo nell'archivio, cioè il difetto delle due liste al
       contrario. */
    if (!db || typeof db.del !== 'function') {
      return { ok: false, motivo: 'archivio non disponibile: eliminazione non eseguita', azione: 'nessuna' };
    }
    await db.del(ARCHIVIO, id).catch(function () {});
    try {
      var d = daSpecchio().filter(function (x) { return testo(x && x.id) !== k; });
      global.localStorage.setItem(CHIAVE_SPECCHIO, JSON.stringify(d));
    } catch (e) { /* lo specchio resta: la migrazione lo ripulirà */ }
    cache.canonici = cache.canonici.filter(function (x) { return testo(x && x.id) !== k; });
    return { ok: true, azione: 'eliminato' };
  }

  /* ── Sostituire l'elenco intero ───────────────────────────────────────────
     `CRMSmart._save(elenco)` significa «questo è l'elenco adesso», e la
     rubrica lo usa anche per cancellare: passa la lista senza il contatto
     eliminato. Trattarlo come un semplice inserimento — che è quello che
     faceva la prima versione di questo modulo — toglieva la cancellazione
     senza che niente protestasse: il contatto restava, e chi lo aveva
     cancellato lo ritrovava al ricaricamento.

     Chi sparisce dall'elenco non viene però cancellato al buio: passa dal
     presidio di integrità, e se ha documenti viene archiviato. */
  async function sostituisci(nuovoElenco, opzioni) {
    var o = opzioni || {};
    var db = o.db || global.IDB;
    var lista = (nuovoElenco || []).filter(Boolean);
    var restano = {};
    lista.forEach(function (c) { if (c.id != null) restano[testo(c.id)] = true; });

    var prima = elenco(o);
    var esito = { salvati: 0, eliminati: 0, archiviati: 0, rifiutati: [] };

    /* Lo specchio si riscrive **subito**, in modo sincrono. `_save` è sempre
       stata una funzione sincrona e chi la chiama legge la riga dopo: fare
       tutto in modo asincrono romperebbe quel contratto, e il contatto appena
       cancellato ricomparirebbe per il tempo di un ridisegno. Il canonico si
       riconcilia dopo — è più lento e nessuno lo sta guardando. */
    try {
      global.localStorage.setItem(CHIAVE_SPECCHIO, JSON.stringify(lista.map(function (c) {
        var x = Object.assign({}, c); delete x._fonti; delete x._conflitti; return x;
      })));
    } catch (e) { /* spazio esaurito: resta la riconciliazione asincrona */ }
    /* E la parte canonica in cache si allinea subito allo stesso elenco, così
       `elenco()` non rimette dentro chi è appena sparito. */
    cache.canonici = cache.canonici.filter(function (c) {
      return c && c.id != null && restano[testo(c.id)];
    });

    for (var i = 0; i < lista.length; i++) { await salva(lista[i], o); esito.salvati++; }

    for (var j = 0; j < prima.length; j++) {
      var vecchio = prima[j];
      if (!vecchio || vecchio.id == null || restano[testo(vecchio.id)]) continue;
      var r = await elimina(vecchio.id, o);
      if (r.ok) { esito.eliminati++; continue; }
      /* Ha documenti: si archivia invece di perderlo. */
      var g = G();
      if (g && db && typeof db.put === 'function') {
        await db.put(ARCHIVIO, g.archivia(vecchio, 'rimosso dalla rubrica')).catch(function () {});
        esito.archiviati++;
      } else { esito.rifiutati.push(vecchio.id); }
    }
    return esito;
  }

  /** La migrazione: chi sta solo da una parte finisce anche dall'altra.
      Conservativa per costruzione — non cancella niente e non sceglie fra due
      versioni: le fonde. */
  async function migra(opzioni) {
    var o = opzioni || {};
    var db = o.db || global.IDB;
    var canonici = (db && typeof db.getAll === 'function')
      ? (await db.getAll(ARCHIVIO).catch(function () { return []; }) || []) : [];
    var specchio = daSpecchio();
    var uniti = unisci(canonici, specchio);
    conId(uniti);

    var soloRubrica = uniti.filter(function (c) {
      return (c._fonti || []).length === 1 && c._fonti[0] === 'rubrica';
    }).length;
    var soloArchivio = uniti.filter(function (c) {
      return (c._fonti || []).length === 1 && c._fonti[0] === 'archivio';
    }).length;

    if (db && typeof db.put === 'function') {
      for (var i = 0; i < uniti.length; i++) {
        var c = Object.assign({}, uniti[i]);
        delete c._fonti; delete c._conflitti;
        await db.put(ARCHIVIO, c).catch(function () {});
      }
    }
    try {
      global.localStorage.setItem(CHIAVE_SPECCHIO, JSON.stringify(uniti.map(function (c) {
        var x = Object.assign({}, c); delete x._fonti; delete x._conflitti; return x;
      })));
    } catch (e) { /* idem */ }

    cache = { pronta: true, quando: new Date().toISOString(),
      canonici: uniti.map(function (c) { var x = Object.assign({}, c); delete x._fonti; delete x._conflitti; return x; }) };
    return { totale: uniti.length, prima: { archivio: canonici.length, rubrica: specchio.length },
      soloRubrica: soloRubrica, soloArchivio: soloArchivio,
      fusi: uniti.filter(function (c) { return (c._fonti || []).length > 1; }).length };
  }

  function stato() {
    var e = elenco();
    return {
      pronta: cache.pronta, quando: cache.quando,
      totale: e.length, canonici: cache.canonici.length,
      archiviati: (G() ? G().archiviati(e) : []).length,
      specchio: CHIAVE_SPECCHIO, archivio: ARCHIVIO,
    };
  }

  global.InglyClienti = {
    version: VERSIONE,
    CHIAVE_SPECCHIO: CHIAVE_SPECCHIO, ARCHIVIO: ARCHIVIO,
    carica: carica, elenco: elenco, perId: perId, attivi: attivi,
    salva: salva, elimina: elimina, sostituisci: sostituisci, migra: migra, stato: stato,
    unisci: unisci, fondi: fondi, chiavi: chiavi,
  };
})(typeof window !== 'undefined' ? window : globalThis);

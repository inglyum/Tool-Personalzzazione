/* ═══════════════════════════════════════════════════════════════════════════
   CONSUNTIVO · com'è andata davvero
   ═══════════════════════════════════════════════════════════════════════════

   Il preventivatore 3D teneva i suoi consuntivi in `p3d_consuntivo_v1`. Il
   preventivatore tessile non ne aveva nessuno. La strada breve sarebbe stata
   dargliene uno suo, `apparel_consuntivo_v1` — e sarebbe stato il quinto
   archivio doppio trovato in questo progetto: due posti dove vive lo stesso
   concetto, che prima o poi divergono e nessuno se ne accorge finché i conti
   non tornano.

   Qui il proprietario è uno. Le commesse si distinguono per **modulo**, non
   per archivio: `3d/12` e `apparel/12` sono due cose diverse nello stesso
   registro, e restano leggibili insieme — che è il punto: un laboratorio vuole
   sapere se sfora sul 3D o sul tessile, e per saperlo i due numeri devono
   stare nello stesso posto.

   `p3d_consuntivo_v1` non si cancella: resta come sorgente di migrazione,
   assorbita una volta sola. È la stessa disciplina che in questo progetto ha
   già evitato di perdere dati due volte.

   Il modulo non calcola scostamenti: quelli li fa `InglyScostamento`. Qui si
   registra e si rilegge, niente di più.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var CHIAVE = 'ingly_consuntivo_v1';
  var LEGACY_3D = 'p3d_consuntivo_v1';
  var SEGNO_MIGRAZIONE = 'ingly_consuntivo_migrato_p3d';

  /* ── Leggere, sapendo se si è letto ────────────────────────────────────
     `leggiJSON` restituisce `{}` sia quando l'archivio è vuoto sia quando non
     si è riusciti a leggerlo. Per disegnare va bene — una lista vuota è un
     ripiego onesto — ma per **scrivere** no: chi fonde qualcosa dentro un
     `{}` che in realtà era «non lo so» riscrive l'archivio senza il resto.

     Questa versione distingue i due casi. Quella comoda resta, e chiama
     questa. */
  function leggiSicuro(chiave) {
    var g;
    try {
      if (!global.localStorage) return { ok: false, valore: {}, motivo: 'archiviazione non disponibile' };
      g = global.localStorage.getItem(chiave);
    } catch (e) {
      return { ok: false, valore: {}, motivo: 'lettura non riuscita: ' + (e && e.message) };
    }
    if (g == null || g === '') return { ok: true, valore: {}, vuoto: true };
    try {
      var v = JSON.parse(g);
      if (v && typeof v === 'object' && !Array.isArray(v)) return { ok: true, valore: v };
      /* Contenuto della forma sbagliata: leggibile ma non utilizzabile. Non è
         «vuoto», ed è pericoloso trattarlo come tale. */
      return { ok: false, valore: {}, motivo: 'contenuto non riconosciuto' };
    } catch (e) {
      return { ok: false, valore: {}, motivo: 'JSON non valido' };
    }
  }

  function leggiJSON(chiave) {
    return leggiSicuro(chiave).valore;
  }

  function scriviJSON(chiave, valore) {
    try {
      if (global.Ingly && global.Ingly.Storage) return !!global.Ingly.Storage.set(chiave, valore).ok;
      global.localStorage.setItem(chiave, JSON.stringify(valore));
      return true;
    } catch (e) { return false; }
  }

  /* La chiave di una commessa. Il modulo davanti, perché due preventivatori
     possono avere una riga numero 12 ciascuno senza essere la stessa riga. */
  function chiaveDi(modulo, id) {
    return String(modulo || 'sconosciuto') + '/' + String(id);
  }

  /* Il travaso dal 3D: una volta sola, e senza svuotare la sorgente. Girare a
     ogni avvio farebbe tornare un consuntivo cancellato dall'utente — è
     esattamente il difetto che i preferiti avevano. */
  function migra() {
    if (leggiJSON(CHIAVE)._migrato3d) return;
    try {
      if (global.localStorage && global.localStorage.getItem(SEGNO_MIGRAZIONE)) return;
    } catch (e) { /* senza contrassegno si ripete: male minore */ }

    var daVecchi = leggiSicuro(LEGACY_3D);
    var daNuovo = leggiSicuro(CHIAVE);

    /* ── Non si fonde dentro un'incognita ────────────────────────────────
       Se l'archivio di destinazione non si è potuto leggere, `leggiJSON`
       restituirebbe `{}` e la fusione riscriverebbe l'archivio con i soli
       consuntivi del vecchio 3D: tutto ciò che c'era dentro sparirebbe, e la
       scrittura risulterebbe riuscita.

       È il difetto che si è visto una volta ogni tanto in collaudo — due
       consuntivi scritti durante la prova spariti dopo il ricaricamento,
       mentre quello migrato restava: esattamente la forma che questo caso
       produce. Non si riprova a indovinare: si rimanda, senza contrassegno,
       e al prossimo avvio la migrazione ci riprova su una lettura buona. */
    if (!daNuovo.ok || !daVecchi.ok) return;

    var vecchi = daVecchi.valore;
    var tutti = daNuovo.valore;
    var portati = 0;
    Object.keys(vecchi).forEach(function (id) {
      var k = chiaveDi('3d', id);
      if (tutti[k] != null) return;          // già presente: non si sovrascrive
      tutti[k] = vecchi[id];
      portati += 1;
    });

    /* Il contrassegno si scrive solo se il travaso è davvero riuscito.
       La prima versione lo scriveva comunque: se la scrittura falliva — spazio
       esaurito, archivio in sola lettura — la migrazione risultava fatta e non
       si sarebbe più ripetuta, lasciando i consuntivi nel vecchio archivio per
       sempre. È lo stesso difetto che le due migrazioni grosse di questo
       progetto evitano da sempre, e qui l'avevo rifatto. */
    if (portati && !scriviJSON(CHIAVE, tutti)) return;
    try { global.localStorage.setItem(SEGNO_MIGRAZIONE, new Date().toISOString()); } catch (e) {}
  }

  /** Tutti i consuntivi di un modulo, indicizzati per id — la forma che i
      preventivatori si aspettano. */
  function perModulo(modulo) {
    migra();
    var tutti = leggiJSON(CHIAVE);
    var prefisso = String(modulo || '') + '/';
    var fuori = {};
    Object.keys(tutti).forEach(function (k) {
      if (k.indexOf(prefisso) !== 0) return;
      fuori[k.slice(prefisso.length)] = tutti[k];
    });
    return fuori;
  }

  /** Il consuntivo di una commessa, o `{}` se non è stato registrato. */
  function leggi(modulo, id) {
    return perModulo(modulo)[String(id)] || {};
  }

  /** Registra o aggiorna. I campi passati si fondono con quelli già scritti:
      chi compila solo il materiale non cancella le ore inserite ieri.
      Un campo messo a `null` invece si toglie: è il modo per correggere un
      valore digitato per errore. */
  function salva(modulo, id, dati) {
    migra();
    var tutti = leggiJSON(CHIAVE);
    var k = chiaveDi(modulo, id);
    var unito = Object.assign({}, tutti[k], dati || {}, { quando: new Date().toISOString() });
    Object.keys(unito).forEach(function (campo) {
      if (unito[campo] === null) delete unito[campo];
    });
    tutti[k] = unito;
    scriviJSON(CHIAVE, tutti);
    return unito;
  }

  /** Toglie il consuntivo di una commessa. */
  function cancella(modulo, id) {
    migra();
    var tutti = leggiJSON(CHIAVE);
    delete tutti[chiaveDi(modulo, id)];
    scriviJSON(CHIAVE, tutti);
  }

  /** Ha davvero un costo reale registrato? Un oggetto vuoto, o con tutti i
      campi a zero perché qualcuno ha aperto e chiuso il modulo, non è un
      consuntivo: dirlo evita di confondere «è andata come previsto» con «non
      lo so». */
  function registrato(modulo, id) {
    var c = leggi(modulo, id);
    return Object.keys(c).some(function (k) {
      return k !== 'quando' && c[k] != null && c[k] !== '';
    });
  }

  global.InglyConsuntivo = {
    /* Esposta perché un collaudo possa verificare che una lettura fallita non
       venga scambiata per un archivio vuoto. */
    leggiSicuro: leggiSicuro,
    VERSIONE: '1.0.0',
    CHIAVE: CHIAVE,
    LEGACY_3D: LEGACY_3D,
    chiaveDi: chiaveDi,
    perModulo: perModulo,
    leggi: leggi,
    salva: salva,
    cancella: cancella,
    registrato: registrato,
    migra: migra,
  };
})(typeof window !== 'undefined' ? window : globalThis);

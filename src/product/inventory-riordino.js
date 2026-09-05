/* ═══════════════════════════════════════════════════════════════════════════
   RIORDINO · quando ricomprare, e quanto
   ═══════════════════════════════════════════════════════════════════════════

   Il magazzino avvisa quando la giacenza scende sotto `minStock`. Quella
   soglia però è un numero scritto a mano una volta e mai più toccato, e ignora
   le due cose che decidono davvero quando ricomprare:

     · **quanto se ne consuma** — una soglia di 5 pezzi è generosa per un
       materiale che si usa una volta al mese e tardiva per uno che finisce in
       tre giorni;
     · **quanto ci mette ad arrivare** — ordinare quando restano cinque pezzi
       non serve a niente se il fornitore consegna in due settimane.

   Il registro dei movimenti (Fase 31) sa quanto è uscito e quando. Da lì il
   punto di riordino si **calcola**:

       punto di riordino = consumo giornaliero × giorni di consegna
                         + consumo giornaliero × giorni di sicurezza

   Questo modulo **propone**, non sovrascrive. `minStock` resta quello che
   l'utente ha scritto: il suggerimento gli sta accanto, e si applica solo se
   lo si accetta. È la stessa disciplina dei valori predefiniti del
   preventivatore — la revisione la decide chi conosce il laboratorio.

   E, come il resto dei motori di questo progetto, quando non sa lo dice:
   senza movimenti in uscita non esiste un consumo medio, e «zero al giorno» e
   «non lo so» sono due cose diverse. Confonderle porta a non riordinare mai.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };
  var GIORNO = 24 * 60 * 60 * 1000;

  /* I movimenti che consumano la giacenza. Lo scarto conta: toglie pezzi dallo
     scaffale come una vendita, e ignorarlo farebbe finire il materiale prima
     di quanto il conto prevede. Si tiene però separato, perché se lo scarto
     domina il consumo il problema non è il riordino. */
  var USCITE = { SALE: 1, CONSUMPTION: 1, WASTE: 1, TRANSFER_OUT: 1 };

  var PREDEFINITI = {
    finestraGiorni: 90,
    giorniConsegna: 7,
    giorniSicurezza: 7,
    /* Sotto queste soglie la stima esiste ma non merita fiducia: due uscite in
       novanta giorni dicono poco su quel che succederà nei prossimi trenta. */
    movimentiMinimi: 3,
    giorniMinimi: 14,
  };

  function quando(m) {
    var d = new Date((m && (m.at || m.date || m.createdAt)) || 0);
    var t = d.getTime();
    return isFinite(t) ? t : 0;
  }

  /**
   * Il consumo di un articolo nella finestra osservata.
   *
   * @param {Array}  movimenti  il registro
   * @param {*}      itemId
   * @param {Object} opzioni    { finestraGiorni, ora, warehouseId }
   */
  function consumo(movimenti, itemId, opzioni) {
    var o = opzioni || {};
    var finestra = num(o.finestraGiorni, PREDEFINITI.finestraGiorni);
    var adesso = o.ora != null ? new Date(o.ora).getTime() : Date.now();
    var da = adesso - finestra * GIORNO;

    var uscite = (movimenti || []).filter(function (m) {
      if (!m || !USCITE[m.type]) return false;
      if (String(m.itemId) !== String(itemId)) return false;
      if (o.warehouseId != null && String(m.warehouseId) !== String(o.warehouseId)) return false;
      var t = quando(m);
      return t > 0 && t >= da && t <= adesso;
    });

    if (!uscite.length) {
      return {
        misurabile: false,
        motivo: 'nessuna uscita registrata negli ultimi ' + Math.round(finestra) + ' giorni',
        cosaFare: 'Il consumo si calcola dai movimenti: registra le uscite di magazzino, o imposta la soglia a mano.',
        movimenti: 0,
      };
    }

    var totale = 0, scarto = 0;
    var primo = Infinity, ultimo = 0;
    uscite.forEach(function (m) {
      var q = Math.abs(num(m.quantity));
      totale += q;
      if (m.type === 'WASTE') scarto += q;
      var t = quando(m);
      if (t < primo) primo = t;
      if (t > ultimo) ultimo = t;
    });

    /* I giorni osservati non sono la finestra: sono quelli fra la prima uscita
       e oggi. Dividere per novanta un materiale comprato la settimana scorsa
       darebbe un consumo dieci volte più basso del vero. */
    var giorniOsservati = Math.max(1, Math.round((adesso - primo) / GIORNO));
    var alGiorno = totale / giorniOsservati;

    var deboli = [];
    if (uscite.length < PREDEFINITI.movimentiMinimi) {
      deboli.push('solo ' + uscite.length + ' uscit' + (uscite.length === 1 ? 'a' : 'e') + ' nel periodo');
    }
    if (giorniOsservati < PREDEFINITI.giorniMinimi) {
      deboli.push('storico di appena ' + giorniOsservati + ' giorni');
    }

    return {
      misurabile: true,
      totale: totale,
      scarto: scarto,
      scartoPct: totale > 0 ? (scarto / totale) * 100 : 0,
      movimenti: uscite.length,
      giorniOsservati: giorniOsservati,
      alGiorno: alGiorno,
      alMese: alGiorno * 30,
      /* «Affidabile» non vuol dire esatto: vuol dire che ci sono abbastanza
         dati perché la media significhi qualcosa. */
      affidabile: deboli.length === 0,
      riserve: deboli,
      dal: new Date(primo).toISOString(),
      al: new Date(ultimo).toISOString(),
    };
  }

  /**
   * Il punto di riordino, dal consumo e dai tempi.
   * Restituisce anche le due parti separate: chi legge deve poter vedere
   * quanta parte è copertura del tempo di consegna e quanta è margine.
   */
  function puntoRiordino(alGiorno, opzioni) {
    var o = opzioni || {};
    var consegna = Math.max(0, num(o.giorniConsegna, PREDEFINITI.giorniConsegna));
    var sicurezza = Math.max(0, num(o.giorniSicurezza, PREDEFINITI.giorniSicurezza));
    var q = Math.max(0, num(alGiorno));
    var copertura = q * consegna;
    var margine = q * sicurezza;
    return {
      punto: copertura + margine,
      copertura: copertura,
      margine: margine,
      giorniConsegna: consegna,
      giorniSicurezza: sicurezza,
    };
  }

  /* Le urgenze, dalla più grave. Sono stati, non punteggi: un elenco ordinato
     per un numero inventato sarebbe più difficile da spiegare che da leggere. */
  var URGENZE = {
    esaurito:   { ordine: 0, label: 'Esaurito',              colore: 'rosso' },
    ordinare:   { ordine: 1, label: 'Da ordinare adesso',    colore: 'rosso' },
    presto:     { ordine: 2, label: 'Da ordinare a breve',   colore: 'arancione' },
    sufficiente:{ ordine: 3, label: 'Scorta sufficiente',    colore: 'verde' },
    sconosciuta:{ ordine: 4, label: 'Consumo non misurabile', colore: 'grigio' },
  };

  /**
   * L'analisi completa di un articolo: quanto ne resta, per quanto basta,
   * quando ordinare e quanto.
   */
  function analizza(movimenti, item, opzioni) {
    var o = opzioni || {};
    var it = item || {};
    var giacenza = num(it.stock, num(it.qty, num(it.quantita, 0)));
    var sogliaScritta = num(it.minStock, num(it.min, 0));

    var c = consumo(movimenti, it.id, o);

    if (!c.misurabile) {
      return {
        itemId: it.id,
        nome: it.name || it.nome || String(it.id),
        giacenza: giacenza,
        sogliaScritta: sogliaScritta,
        consumo: c,
        misurabile: false,
        /* Senza consumo non si propone un numero: si dice che manca il dato.
           Un suggerimento inventato è peggio della soglia scritta a mano,
           perché sembra calcolato. */
        urgenza: giacenza <= 0 ? 'esaurito' : 'sconosciuta',
        motivo: c.motivo,
        cosaFare: c.cosaFare,
      };
    }

    var giorniConsegna = num(o.giorniConsegna,
      num(it.leadTime, num(it.leadDays, PREDEFINITI.giorniConsegna)));
    var p = puntoRiordino(c.alGiorno, {
      giorniConsegna: giorniConsegna,
      giorniSicurezza: num(o.giorniSicurezza, PREDEFINITI.giorniSicurezza),
    });

    var giorniResidui = c.alGiorno > 0 ? giacenza / c.alGiorno : null;

    var urgenza;
    if (giacenza <= 0) urgenza = 'esaurito';
    else if (giacenza <= p.punto) urgenza = 'ordinare';
    else if (giacenza <= p.punto * 1.5) urgenza = 'presto';
    else urgenza = 'sufficiente';

    /* Quanto ordinare: riportare la giacenza a coprire la finestra osservata è
       la scelta più semplice da spiegare, e non è un numero inventato — è il
       consumo misurato moltiplicato per i giorni che si vogliono coprire. */
    var giorniDaCoprire = Math.max(1, num(o.giorniDaCoprire, 30));
    var daOrdinare = Math.max(0, (c.alGiorno * giorniDaCoprire + p.punto) - giacenza);

    return {
      itemId: it.id,
      nome: it.name || it.nome || String(it.id),
      unita: it.unit || it.unita || '',
      giacenza: giacenza,
      sogliaScritta: sogliaScritta,
      consumo: c,
      misurabile: true,
      suggerito: p.punto,
      copertura: p.copertura,
      margine: p.margine,
      giorniConsegna: giorniConsegna,
      giorniResidui: giorniResidui,
      daOrdinare: daOrdinare,
      giorniDaCoprire: giorniDaCoprire,
      urgenza: urgenza,
      /* La differenza fra quel che l'utente ha scritto e quel che i movimenti
         dicono: è l'unica ragione per cambiare la soglia, e va mostrata. */
      scostamentoSoglia: sogliaScritta > 0 ? p.punto - sogliaScritta : null,
    };
  }

  /**
   * L'elenco di che cosa riordinare, dal più urgente.
   * Gli articoli senza consumo misurabile non spariscono: finiscono in fondo,
   * dichiarati. Nasconderli li farebbe dimenticare.
   */
  function elenco(movimenti, items, opzioni) {
    var o = opzioni || {};
    var righe = (items || [])
      .filter(function (i) { return i && i.id != null; })
      .map(function (i) { return analizza(movimenti, i, o); });

    righe.sort(function (a, b) {
      var ua = URGENZE[a.urgenza] || URGENZE.sconosciuta;
      var ub = URGENZE[b.urgenza] || URGENZE.sconosciuta;
      if (ua.ordine !== ub.ordine) return ua.ordine - ub.ordine;
      /* A parità di urgenza, prima quel che finisce prima. */
      var ga = a.giorniResidui == null ? Infinity : a.giorniResidui;
      var gb = b.giorniResidui == null ? Infinity : b.giorniResidui;
      return ga - gb;
    });

    var conta = {};
    Object.keys(URGENZE).forEach(function (k) { conta[k] = 0; });
    righe.forEach(function (r) { conta[r.urgenza] = (conta[r.urgenza] || 0) + 1; });

    return {
      righe: righe,
      conta: conta,
      daOrdinare: righe.filter(function (r) { return r.urgenza === 'esaurito' || r.urgenza === 'ordinare'; }),
      nonMisurabili: righe.filter(function (r) { return !r.misurabile; }).length,
    };
  }

  global.InglyRiordino = {
    VERSIONE: '1.0.0',
    PREDEFINITI: PREDEFINITI,
    USCITE: USCITE,
    URGENZE: URGENZE,
    consumo: consumo,
    puntoRiordino: puntoRiordino,
    analizza: analizza,
    elenco: elenco,
  };
})(typeof window !== 'undefined' ? window : globalThis);

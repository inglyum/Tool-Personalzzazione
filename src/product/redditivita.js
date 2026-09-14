/* ═══════════════════════════════════════════════════════════════════════════
   REDDITIVITÀ — quale lavoro rende davvero
   ═══════════════════════════════════════════════════════════════════════════

   «Profit Scope» esisteva come voce di menù, con un'intestazione e un pulsante
   che chiamava `ProfitLeakDetector.render()`. Misurato: `ProfitLeakDetector`
   **non è definito in nessun file sorgente** — ci sono solo riferimenti
   protetti da `typeof`, che non trovano niente e non fanno niente. Era una
   promessa, come `RevSim`.

   La domanda che quella sezione prometteva è però la più utile che un
   laboratorio possa farsi: **mi conviene più il laser o la stampa 3D?** E da
   quando l'ordine porta `economic` il programma può rispondere, perché conosce
   il costo di ogni lavoro e non solo il suo prezzo.

   ── Perché il fatturato per tecnologia non risponde ───────────────────────

   Il laser fattura di più quasi sempre: i lavori sono più grandi. Ma porta
   materiale più caro, setup più lunghi e più scarti. Un elenco per fatturato
   dice quale tecnologia **muove** più denaro, non quale ne **lascia**.

   Questo file risponde con tre numeri diversi, e sono diversi apposta:

   1. **margine totale** — quanto ha lasciato in tutto. Premia il volume.
   2. **margine per ordine** — quanto lascia un lavoro tipico. Premia il valore
      del singolo lavoro, ed è il numero su cui si decide se accettarne un
      altro uguale.
   3. **margine per ora** — quanto lascia un'ora di laboratorio. È l'unico che
      risponde davvero a «cosa conviene fare», perché le ore sono la cosa
      di cui ce n'è una quantità fissa. Si calcola solo dove le ore sono
      dichiarate, e dove non lo sono **non si stima**.

   ── La regola di sempre ──────────────────────────────────────────────────

   Un ordine senza costo dichiarato non entra nel margine. Non come zero —
   zero vorrebbe dire «gratis» e gonfierebbe la redditività del gruppo — ma
   come escluso, e il gruppo dichiara quanti ne ha esclusi. Un gruppo con due
   ordini su dieci coperti non è un gruppo su cui decidere, ed è la riga che
   deve dirlo.

   Puro: niente DOM, niente archivio, niente orologio.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };

  function OF() { return global.InglyOrderFields; }
  function OE() { return global.InglyOrderEconomics; }

  /* I totali congelati dell'ordine, quando ci sono. Un ordine chiuso porta il
     suo storico economico: leggerlo è meglio che ripiegare su un campo sciolto
     che potrebbe essere stato scritto da un'altra strada. */
  function totaliSnapshot(o) {
    var s = o && o.economicSnapshot;
    if (s && s.stato === 'SNAPSHOT' && s.totals) return s.totals;
    return null;
  }

  function ricavoDi(o) {
    var oe = OE();
    if (oe && typeof oe.ricavoNettoOrdine === 'function') {
      var r = oe.ricavoNettoOrdine(o);
      if (r > 0) return r;
    }
    var v = [o.amount, o.total, o.totalNet, o.value];
    for (var i = 0; i < v.length; i++) if (num(v[i]) > 0) return num(v[i]);
    var t = totaliSnapshot(o);
    return t ? num(t.totalNet) : 0;
  }

  /** Zero e «non dichiarato» sono due cose diverse, e qui la differenza decide
      se l'ordine entra nel margine o ne resta fuori. `costoOrdine` legge i
      campi dell'ordine; lo snapshot è il ripiego per gli ordini che portano
      solo lo storico congelato. */
  function costoDi(o) {
    var oe = OE();
    var c = (oe && typeof oe.costoOrdine === 'function')
      ? oe.costoOrdine(o)
      : costoDaiCampi(o);
    if (c && c.noto) return c;
    var t = totaliSnapshot(o);
    if (t && t.totalCost != null && num(t.totalCost) > 0) {
      return { valore: num(t.totalCost), noto: true };
    }
    return { valore: 0, noto: false };
  }

  function costoDaiCampi(o) {
    var e = o.economic || {};
    var v = [e.costTotal, o.totalCost, o.cost];
    for (var i = 0; i < v.length; i++) if (v[i] != null && num(v[i]) > 0) {
      return { valore: num(v[i]), noto: true };
    }
    return { valore: 0, noto: false };
  }

  /** Le ore di lavorazione, se qualcuno le ha dichiarate. Non si deducono dal
      prezzo: dedurle dal prezzo renderebbe il margine per ora una funzione
      del margine, cioè un numero che conferma sempre sé stesso. */
  function oreDi(o) {
    var e = o.economic || {};
    var v = [e.hours, o.hours, o.productionHours, o.oreLavorazione];
    for (var i = 0; i < v.length; i++) if (num(v[i]) > 0) return num(v[i]);
    var min = [e.minutes, o.minutes, o.productionTime, o.timeMin];
    for (var j = 0; j < min.length; j++) if (num(min[j]) > 0) return num(min[j]) / 60;
    return 0;
  }

  /* ── Le dimensioni su cui si può guardare ──────────────────────────────
     `tecnologia` passa dal lettore canonico di `order-fields`: un ordine può
     dire la sua tecnologia in quattro modi e tre esistono davvero nei dati. */
  var DIMENSIONI = {
    tecnologia: {
      label: 'Tecnologia',
      di: function (o) {
        var of_ = OF();
        var t = of_ && of_.tecnologia ? of_.tecnologia(o) : null;
        return t ? { id: t.id, label: t.label } : null;
      },
    },
    cliente: {
      label: 'Cliente',
      di: function (o) {
        var id = o.clientId != null && o.clientId !== '' ? String(o.clientId) : null;
        var nome = String(o.clientName || o.client || '').trim();
        if (!id && !nome) return null;
        return { id: id || nome.toLowerCase(), label: nome || ('Cliente ' + id) };
      },
    },
    canale: {
      label: 'Canale',
      di: function (o) {
        var c = String(o.channel || o.canale || o.source || '').trim();
        return c ? { id: c.toLowerCase(), label: c } : null;
      },
    },
    macchina: {
      label: 'Macchina',
      di: function (o) {
        var of_ = OF();
        var m = of_ && of_.macchina ? of_.macchina(o) : null;
        if (!m || (!m.id && !m.nome)) return null;
        return { id: String(m.id || m.nome).toLowerCase(), label: m.nome || m.id };
      },
    },
  };

  /* ── Su cosa si ordina ────────────────────────────────────────────────
     L'ordinamento è un parametro e non una scelta nascosta perché i tre
     numeri rispondono a tre domande diverse, e una schermata che li mostra
     tutti e tre deve dichiarare quale sta usando per la classifica. Fu
     proprio questo a rompersi al primo collaudo a schermo: il verdetto in
     alto nominava il migliore per ora, la tabella sotto ordinava per margine
     totale, e le due metà della stessa pagina dicevano il contrario. */
  var ORDINI_POSSIBILI = {
    margine: 'Margine totale',
    marginePerOrdine: 'Margine per ordine',
    marginePerOra: 'Margine per ora',
  };

  /**
   * La redditività per dimensione.
   *
   * @param {Array}  ordini     ordini o vendite chiuse. Chi chiama decide
   *                            quali contano: questo file non conosce gli stati.
   * @param {string} dimensione 'tecnologia' | 'cliente' | 'canale' | 'macchina'
   * @param {Object} [opzioni]  `{ ordine }`, una chiave di ORDINI_POSSIBILI.
   */
  function per(ordini, dimensione, opzioni) {
    var opt = opzioni || {};
    var chiave = ORDINI_POSSIBILI[opt.ordine] ? opt.ordine : 'margine';
    var d = DIMENSIONI[dimensione] || DIMENSIONI.tecnologia;
    var lista = Array.isArray(ordini) ? ordini : [];
    var gruppi = {};
    var senzaDimensione = 0;

    lista.forEach(function (o) {
      var g = d.di(o || {});
      if (!g) { senzaDimensione += 1; return; }
      var k = gruppi[g.id] || (gruppi[g.id] = {
        id: g.id, label: g.label,
        ordini: 0, ricavo: 0,
        ordiniConCosto: 0, costo: 0, margine: 0,
        ordiniConOre: 0, ore: 0, margineDelleOre: 0,
      });
      var ric = ricavoDi(o);
      var cos = costoDi(o);
      k.ordini += 1;
      k.ricavo += ric;
      if (cos.noto) {
        k.ordiniConCosto += 1;
        k.costo += cos.valore;
        k.margine += (ric - cos.valore);
        /* Le ore contano solo sugli ordini di cui si sa anche il costo:
           altrimenti il margine per ora avrebbe al numeratore un margine e al
           denominatore ore che non gli appartengono. */
        var ore = oreDi(o);
        if (ore > 0) { k.ordiniConOre += 1; k.ore += ore; k.margineDelleOre += (ric - cos.valore); }
      }
    });

    var righe = Object.keys(gruppi).map(function (k) { return arricchisci(gruppi[k]); });
    var margineTotale = righe.reduce(function (a, r) { return a + (r.copertura.sufficiente ? r.margine : 0); }, 0);
    righe.forEach(function (r) {
      r.quotaMarginePct = (margineTotale > 0 && r.copertura.sufficiente)
        ? (r.margine / margineTotale) * 100 : null;
    });

    righe.sort(function (a, b) {
      /* Chi ha una copertura sufficiente sta sopra: un gruppo con due ordini
         su dieci coperti non è confrontabile con uno coperto per intero, e
         metterli nella stessa classifica premierebbe i dati mancanti. */
      if (a.copertura.sufficiente !== b.copertura.sufficiente) return a.copertura.sufficiente ? -1 : 1;
      /* Poi chi il numero scelto ce l'ha: un gruppo senza ore dichiarate non
         vale zero euro all'ora, semplicemente non lo sa, e metterlo in fondo
         alla classifica lo direbbe. Sta sotto a chi si può ordinare, sopra a
         chi non si può confrontare. */
      var va = a[chiave], vb = b[chiave];
      if ((va == null) !== (vb == null)) return va == null ? 1 : -1;
      if (va == null) return b.margine - a.margine;
      return vb - va;
    });

    return {
      dimensione: dimensione in DIMENSIONI ? dimensione : 'tecnologia',
      label: d.label,
      ordine: chiave,
      ordineLabel: ORDINI_POSSIBILI[chiave],
      righe: righe,
      senzaDimensione: senzaDimensione,
      totali: totali(righe, lista.length),
    };
  }

  /* Sotto questa quota il gruppo non si confronta con gli altri: metà degli
     ordini scoperti vuol dire che il margine mostrato è la metà di una
     storia. Non è una soglia di verità — è una soglia di leggibilità, e sta
     dichiarata qui perché si possa discutere. */
  var COPERTURA_MINIMA_PCT = 50;

  function arricchisci(k) {
    var coperturaPct = k.ordini > 0 ? (k.ordiniConCosto / k.ordini) * 100 : 0;
    var sufficiente = k.ordiniConCosto > 0 && coperturaPct >= COPERTURA_MINIMA_PCT;

    return {
      id: k.id, label: k.label,
      ordini: k.ordini,
      ricavo: k.ricavo,
      costo: k.costo,
      margine: k.margine,
      marginePct: (k.ordiniConCosto > 0 && k.ricavo > 0 && sufficiente)
        ? (k.margine / ricavoCoperto(k)) * 100 : null,
      marginePerOrdine: k.ordiniConCosto > 0 ? k.margine / k.ordiniConCosto : null,
      /* Il numero che risponde a «cosa conviene fare»: le ore sono la cosa di
         cui ce n'è una quantità fissa. Solo dove sono dichiarate. */
      marginePerOra: k.ore > 0 ? k.margineDelleOre / k.ore : null,
      ore: k.ore,
      copertura: {
        ordiniConCosto: k.ordiniConCosto,
        ordiniSenzaCosto: k.ordini - k.ordiniConCosto,
        pct: coperturaPct,
        sufficiente: sufficiente,
        ordiniConOre: k.ordiniConOre,
        motivo: k.ordiniConCosto === 0
          ? 'nessun ordine con costo dichiarato: il margine non si può calcolare'
          : (!sufficiente
            ? 'costo dichiarato solo su ' + k.ordiniConCosto + ' ordini su ' + k.ordini
              + ': il margine racconta meno di metà della storia'
            : null),
      },
      quotaMarginePct: null,
    };
  }

  /** Il ricavo dei soli ordini di cui si sa il costo: è l'unico denominatore
      onesto per una percentuale di margine. Usare il ricavo totale
      abbasserebbe la percentuale in proporzione agli ordini scoperti, e
      farebbe sembrare meno redditizio chi ha solo meno dati. */
  function ricavoCoperto(k) {
    return k.costo + k.margine;
  }

  function totali(righe, ordiniTotali) {
    var coperte = righe.filter(function (r) { return r.copertura.sufficiente; });
    return {
      gruppi: righe.length,
      gruppiConfrontabili: coperte.length,
      ordini: ordiniTotali,
      ricavo: righe.reduce(function (a, r) { return a + r.ricavo; }, 0),
      margine: coperte.reduce(function (a, r) { return a + r.margine; }, 0),
      ordiniConCosto: righe.reduce(function (a, r) { return a + r.copertura.ordiniConCosto; }, 0),
      coperturaPct: ordiniTotali > 0
        ? (righe.reduce(function (a, r) { return a + r.copertura.ordiniConCosto; }, 0) / ordiniTotali) * 100
        : 0,
    };
  }

  /** Le due righe che rispondono alla domanda, quando si può rispondere.
      Niente consigli inventati: si nomina il migliore e il peggiore fra i
      gruppi confrontabili, e se non ce ne sono almeno due si dice perché. */
  function confronto(esito) {
    var c = (esito && esito.righe || []).filter(function (r) {
      return r.copertura.sufficiente && r.marginePerOra != null;
    });
    if (c.length < 2) {
      return {
        disponibile: false,
        motivo: c.length === 0
          ? 'nessun gruppo ha insieme costo e ore dichiarati: il margine per ora non si può calcolare'
          : 'un gruppo solo ha costo e ore dichiarati: non c\'è niente con cui confrontarlo',
      };
    }
    var ord = c.slice().sort(function (a, b) { return b.marginePerOra - a.marginePerOra; });
    var alto = ord[0], basso = ord[ord.length - 1];
    return {
      disponibile: true,
      migliore: alto,
      peggiore: basso,
      rapporto: basso.marginePerOra > 0 ? alto.marginePerOra / basso.marginePerOra : null,
    };
  }

  global.InglyRedditivita = {
    VERSIONE: VERSIONE,
    DIMENSIONI: Object.keys(DIMENSIONI),
    ORDINI: ORDINI_POSSIBILI,
    COPERTURA_MINIMA_PCT: COPERTURA_MINIMA_PCT,
    per: per,
    confronto: confronto,
  };
})(typeof window !== 'undefined' ? window : globalThis);

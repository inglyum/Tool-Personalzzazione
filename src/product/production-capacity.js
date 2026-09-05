/* ═══════════════════════════════════════════════════════════════════════════
   CAPACITÀ E SCADENZE DI PRODUZIONE
   ═══════════════════════════════════════════════════════════════════════════

   La vista Produzione elencava gli ordini in lavorazione con la data di
   consegna che qualcuno aveva scritto a mano. Niente diceva se quella data
   fosse raggiungibile: non esisteva un conto della capacità, non esisteva un
   conto del carico, e la scadenza era una promessa senza verifica.

   Questo modulo fa quel conto:

       capacità disponibile − carico pianificato = capacità residua

   e da lì stima quando un ordine finisce davvero, tenendo conto della coda
   davanti a lui sulla stessa macchina.

   ── Quello che il modulo NON fa ────────────────────────────────────────────
   Non inventa le ore che non ci sono. Un ordine senza un tempo di produzione
   dichiarato non vale «zero ore»: vale «non lo so», ed entra nel conto come
   incognita dichiarata. Una macchina senza ore giornaliere non ha una
   capacità: si dice, e la percentuale di utilizzo non si mostra.

   È la differenza fra una pianificazione e un numero rassicurante. Un
   utilizzo dell'80% calcolato ignorando metà degli ordini — perché di quelli
   non si sapeva la durata — è peggio di nessun numero: sembra una misura.

   ── Da dove vengono le ore ─────────────────────────────────────────────────
   Ore di un ordine, in ordine di attendibilità:
     1. `estimatedHours` dichiarate sull'ordine;
     2. il consuntivo, se il lavoro è già stato fatto e cronometrato;
     3. niente — e allora è un'incognita.

   Ore al giorno di una macchina:
     1. `hoursPerDay` dichiarate sulla scheda macchina;
     2. `expectedAnnualHours ÷ giorni lavorativi dell'anno`, che è una media
        e viene dichiarata come tale;
     3. niente — e allora quella macchina non ha capacità calcolabile.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d == null ? 0 : d); };
  var pos = function (v, d) { return Math.max(0, num(v, d)); };
  var GIORNO = 24 * 60 * 60 * 1000;

  var PREDEFINITI = {
    /* 250 giorni: cinquantadue settimane meno i fine settimana e le feste
       nazionali italiane. Serve solo a trasformare un monte ore annuo in una
       media giornaliera, ed è dichiarato ovunque compaia. */
    giorniLavorativiAnno: 250,
    /* Gli stati che occupano una macchina. «completato» no: il pezzo è
       finito, la macchina è libera. */
    statiInCoda: ['accettato', 'produzione'],
    /* Quanto manca alla consegna perché sia «a rischio» invece che «in
       tempo»: un margine sotto il quale un imprevisto fa saltare la data. */
    giorniRischio: 2,
  };

  var SEMAFORI = {
    verde: { id: 'verde', label: 'In tempo', colore: '#22c55e' },
    giallo: { id: 'giallo', label: 'A rischio', colore: '#f59e0b' },
    rosso: { id: 'rosso', label: 'In ritardo', colore: '#ef4444' },
    ignoto: { id: 'ignoto', label: 'Stima incompleta', colore: '#6b7280' },
  };

  /* ── Giorni lavorativi ──────────────────────────────────────────────────
     Sabato e domenica non producono. Le festività no: senza un calendario
     configurato inventarle sarebbe una precisione che i dati non danno. */
  function eLavorativo(d) { var g = d.getDay(); return g !== 0 && g !== 6; }

  function aggiungiGiorniLavorativi(da, giorni) {
    var d = new Date(da.getTime());
    var restanti = Math.ceil(pos(giorni));
    /* Un limite: senza, un input assurdo girerebbe per sempre. */
    var giri = 0;
    while (restanti > 0 && giri < 10000) {
      d = new Date(d.getTime() + GIORNO);
      if (eLavorativo(d)) restanti -= 1;
      giri += 1;
    }
    return d;
  }

  function giorniLavorativiTra(da, a) {
    if (!(da instanceof Date) || !(a instanceof Date)) return null;
    var avanti = a.getTime() >= da.getTime();
    var inizio = new Date(avanti ? da.getTime() : a.getTime());
    var fine = avanti ? a : da;
    var n = 0; var giri = 0;
    while (inizio.getTime() < fine.getTime() && giri < 10000) {
      inizio = new Date(inizio.getTime() + GIORNO);
      if (eLavorativo(inizio)) n += 1;
      giri += 1;
    }
    return avanti ? n : -n;
  }

  /* ── Le ore di un ordine ────────────────────────────────────────────────── */
  function oreOrdine(ordine, contesto) {
    var o = ordine || {};
    var c = contesto || {};

    var dichiarate = num(o.estimatedHours, NaN);
    if (isFinite(dichiarate) && dichiarate > 0) {
      return { ore: dichiarate, fonte: 'dichiarate', nota: 'tempo di produzione dichiarato sull ordine' };
    }
    /* Minuti dichiarati: un'altra forma dello stesso dato, che esiste nei
       record importati. */
    var minuti = num(o.estimatedMinutes, NaN);
    if (isFinite(minuti) && minuti > 0) {
      return { ore: minuti / 60, fonte: 'dichiarate', nota: 'tempo dichiarato in minuti' };
    }

    /* Il consuntivo: ore davvero registrate su questo ordine. Vale come
       stima solo per quello che manca — ma per il carico è la misura
       migliore che esista. */
    var logs = (c.timelogs || []).filter(function (t) {
      return t && String(t.orderId != null ? t.orderId : t.order) === String(o.id);
    });
    if (logs.length) {
      var ore = logs.reduce(function (a, t) {
        if (t.hours != null) return a + pos(t.hours);
        if (t.minutes != null) return a + pos(t.minutes) / 60;
        if (t.seconds != null) return a + pos(t.seconds) / 3600;
        return a;
      }, 0);
      if (ore > 0) return { ore: ore, fonte: 'consuntivo', nota: logs.length + ' registrazioni di tempo' };
    }

    return { ore: null, fonte: 'assente', nota: 'nessun tempo di produzione dichiarato né registrato' };
  }

  /* ── Le ore al giorno di una macchina ───────────────────────────────────── */
  function capacitaMacchina(macchina, opzioni) {
    var m = macchina || {};
    var opz = opzioni || {};
    var giorniAnno = pos(opz.giorniLavorativiAnno, PREDEFINITI.giorniLavorativiAnno) || PREDEFINITI.giorniLavorativiAnno;

    var dichiarate = num(m.hoursPerDay, NaN);
    if (isFinite(dichiarate) && dichiarate > 0) {
      return { oreGiorno: dichiarate, fonte: 'dichiarata', nota: 'ore al giorno dichiarate sulla scheda macchina' };
    }
    var anno = num(m.expectedAnnualHours, NaN);
    if (isFinite(anno) && anno > 0) {
      return {
        oreGiorno: anno / giorniAnno,
        fonte: 'derivata',
        nota: anno + ' h/anno ÷ ' + giorniAnno + ' giorni lavorativi',
      };
    }
    return {
      oreGiorno: null,
      fonte: 'assente',
      nota: 'né ore al giorno né monte ore annuo sulla scheda macchina',
    };
  }

  /* ── L'analisi: capacità, carico, residua ────────────────────────────────
     Ritorna una riga per macchina più una riga per gli ordini che nessuna
     macchina ha preso in carico — che sono lavoro reale, e nasconderli
     renderebbe il totale più bello e più falso. */
  function analizza(dati) {
    var d = dati || {};
    var macchine = Array.isArray(d.macchine) ? d.macchine : [];
    var ordini = Array.isArray(d.ordini) ? d.ordini : [];
    var timelogs = Array.isArray(d.timelogs) ? d.timelogs : [];
    var finestra = pos(d.finestraGiorni, 30) || 30;
    var stati = d.statiInCoda || PREDEFINITI.statiInCoda;
    var OF = global.InglyOrderFields;

    var inCoda = ordini.filter(function (o) {
      var s = o && (o._state || o.stage || o.status);
      return stati.indexOf(s) >= 0;
    });

    /* Giorni lavorativi nella finestra: la capacità si conta su quelli, non
       sui giorni di calendario. */
    var oggi = d.oggi ? new Date(d.oggi) : new Date();
    var fineFinestra = new Date(oggi.getTime() + finestra * GIORNO);
    var giorniUtili = giorniLavorativiTra(oggi, fineFinestra);

    var perMacchina = {};
    var senzaMacchina = [];
    inCoda.forEach(function (o) {
      var m = OF ? OF.macchina(o) : null;
      var chiave = m ? String(m.id || m.nome) : null;
      if (!chiave) { senzaMacchina.push(o); return; }
      if (!perMacchina[chiave]) perMacchina[chiave] = { nome: m.nome, ordini: [] };
      perMacchina[chiave].ordini.push(o);
    });

    var righe = macchine.map(function (m) {
      var chiave = String(m.id);
      var gruppo = perMacchina[chiave]
        || perMacchina[[m.brand, m.model].filter(Boolean).join(' ')]
        || perMacchina[m.name]
        || { nome: null, ordini: [] };
      delete perMacchina[chiave];
      var cap = capacitaMacchina(m, d);
      var carico = 0; var incognite = 0;
      gruppo.ordini.forEach(function (o) {
        var ore = oreOrdine(o, { timelogs: timelogs });
        if (ore.ore == null) incognite += 1; else carico += ore.ore;
      });
      var disponibile = cap.oreGiorno == null || giorniUtili == null ? null : cap.oreGiorno * giorniUtili;
      var completo = incognite === 0 && disponibile != null;
      return {
        id: m.id,
        nome: [m.brand, m.model].filter(Boolean).join(' ') || m.name || String(m.id),
        oreGiorno: cap.oreGiorno,
        fonteCapacita: cap.fonte,
        notaCapacita: cap.nota,
        giorniUtili: giorniUtili,
        disponibile: disponibile,
        carico: carico,
        residua: disponibile == null ? null : disponibile - carico,
        utilizzo: disponibile == null || disponibile <= 0 ? null : (carico / disponibile) * 100,
        sovraccarico: disponibile != null && carico > disponibile,
        ordini: gruppo.ordini.length,
        ordiniSenzaOre: incognite,
        completo: completo,
        motivoIncompleto: completo ? null
          : (disponibile == null ? cap.nota : incognite + ' ordini senza tempo di produzione'),
      };
    });

    /* Le macchine che gli ordini nominano ma che non stanno nel parco:
       esistono nel lavoro, quindi esistono nel conto. */
    Object.keys(perMacchina).forEach(function (k) {
      var g = perMacchina[k];
      var carico = 0; var incognite = 0;
      g.ordini.forEach(function (o) {
        var ore = oreOrdine(o, { timelogs: timelogs });
        if (ore.ore == null) incognite += 1; else carico += ore.ore;
      });
      righe.push({
        id: k, nome: g.nome || k, oreGiorno: null, fonteCapacita: 'assente',
        notaCapacita: 'macchina nominata dagli ordini ma non registrata nel parco',
        giorniUtili: giorniUtili, disponibile: null, carico: carico, residua: null,
        utilizzo: null, sovraccarico: false, ordini: g.ordini.length,
        ordiniSenzaOre: incognite, completo: false,
        motivoIncompleto: 'macchina non registrata nel parco',
      });
    });

    var oreNonAssegnate = 0; var incogniteNonAssegnate = 0;
    senzaMacchina.forEach(function (o) {
      var ore = oreOrdine(o, { timelogs: timelogs });
      if (ore.ore == null) incogniteNonAssegnate += 1; else oreNonAssegnate += ore.ore;
    });

    var totali = righe.reduce(function (a, r) {
      a.disponibile += r.disponibile || 0;
      a.carico += r.carico;
      a.incognite += r.ordiniSenzaOre;
      if (r.disponibile == null) a.macchineSenzaCapacita += 1;
      return a;
    }, { disponibile: 0, carico: 0, incognite: 0, macchineSenzaCapacita: 0 });
    totali.carico += oreNonAssegnate;
    totali.incognite += incogniteNonAssegnate;
    totali.residua = totali.disponibile - totali.carico;
    totali.utilizzo = totali.disponibile > 0 ? (totali.carico / totali.disponibile) * 100 : null;
    totali.sovraccarico = totali.disponibile > 0 && totali.carico > totali.disponibile;
    totali.completo = totali.incognite === 0 && totali.macchineSenzaCapacita === 0 && righe.length > 0;

    return {
      righe: righe,
      giorniUtili: giorniUtili,
      finestraGiorni: finestra,
      nonAssegnati: {
        ordini: senzaMacchina.length,
        ore: oreNonAssegnate,
        senzaOre: incogniteNonAssegnate,
      },
      totali: totali,
    };
  }

  /* ── La scadenza stimata ─────────────────────────────────────────────────
     data di partenza + coda davanti + ore proprie + avviamento, convertiti in
     giorni lavorativi sulla capacità della macchina.

     Se manca uno degli addendi la data non si calcola: si dice «stima
     incompleta» e si mostra la scadenza dichiarata per quello che è, una
     promessa. */
  function scadenza(ordine, contesto) {
    var o = ordine || {};
    var c = contesto || {};
    var oggi = c.oggi ? new Date(c.oggi) : new Date();
    var OF = global.InglyOrderFields;

    var mie = oreOrdine(o, c);
    var m = OF ? OF.macchina(o) : null;
    var scheda = m && Array.isArray(c.macchine)
      ? c.macchine.filter(function (x) {
        return String(x.id) === String(m.id)
          || [x.brand, x.model].filter(Boolean).join(' ') === m.nome
          || x.name === m.nome;
      })[0]
      : null;
    var cap = capacitaMacchina(scheda || {}, c);

    var consegna = o.dueDate ? new Date(o.dueDate) : null;
    var base = {
      dichiarata: consegna,
      oreProprie: mie.ore,
      fonteOre: mie.fonte,
      macchina: m ? m.nome : null,
      oreGiorno: cap.oreGiorno,
      fonteCapacita: cap.fonte,
    };

    if (mie.ore == null || cap.oreGiorno == null || cap.oreGiorno <= 0) {
      return Object.assign(base, {
        stimabile: false,
        incompleta: true,
        dataStimata: null,
        semaforo: SEMAFORI.ignoto,
        motivo: mie.ore == null
          ? 'tempo di produzione non dichiarato su questo ordine'
          : cap.nota,
      });
    }

    /* La coda: gli ordini davanti a questo sulla stessa macchina. «Davanti»
       vuol dire con una consegna più vicina — chi ha la data più stretta si
       lavora prima — e a parità di data quelli creati prima. */
    var coda = (c.ordini || []).filter(function (x) {
      if (!x || String(x.id) === String(o.id)) return false;
      var s = x._state || x.stage || x.status;
      if ((c.statiInCoda || PREDEFINITI.statiInCoda).indexOf(s) < 0) return false;
      var xm = OF ? OF.macchina(x) : null;
      if (!xm || !m) return false;
      if (String(xm.id || xm.nome) !== String(m.id || m.nome)) return false;
      var xd = x.dueDate ? new Date(x.dueDate).getTime() : Infinity;
      var od = consegna ? consegna.getTime() : Infinity;
      if (xd !== od) return xd < od;
      return new Date(x.createdAt || 0).getTime() < new Date(o.createdAt || 0).getTime();
    });

    var oreCoda = 0; var codaIncognita = 0;
    coda.forEach(function (x) {
      var ore = oreOrdine(x, c);
      if (ore.ore == null) codaIncognita += 1; else oreCoda += ore.ore;
    });

    var setupOre = pos(o.setupMinutes) / 60;
    var oreTotali = oreCoda + mie.ore + setupOre;
    var giorni = oreTotali / cap.oreGiorno;
    var stimata = aggiungiGiorniLavorativi(oggi, giorni);

    var semaforo = SEMAFORI.ignoto;
    var margine = null;
    if (consegna) {
      margine = giorniLavorativiTra(stimata, consegna);
      if (margine < 0) semaforo = SEMAFORI.rosso;
      else if (margine <= pos(c.giorniRischio, PREDEFINITI.giorniRischio)) semaforo = SEMAFORI.giallo;
      else semaforo = SEMAFORI.verde;
    }

    return Object.assign(base, {
      stimabile: true,
      /* La stima esiste ma resta incompleta se davanti c'è un ordine di cui
         non si sa la durata: la data uscirebbe più ottimista del vero. */
      incompleta: codaIncognita > 0 || !consegna,
      dataStimata: stimata,
      giorniStimati: giorni,
      oreCoda: oreCoda,
      ordiniInCoda: coda.length,
      codaSenzaOre: codaIncognita,
      margineGiorni: margine,
      semaforo: semaforo,
      motivo: codaIncognita > 0
        ? codaIncognita + ' ordini in coda senza tempo dichiarato: la data può slittare'
        : (!consegna ? 'nessuna data di consegna con cui confrontare la stima' : null),
    });
  }

  global.InglyProduzione = {
    VERSIONE: '1.0.0',
    PREDEFINITI: PREDEFINITI,
    SEMAFORI: SEMAFORI,
    eLavorativo: eLavorativo,
    aggiungiGiorniLavorativi: aggiungiGiorniLavorativi,
    giorniLavorativiTra: giorniLavorativiTra,
    oreOrdine: oreOrdine,
    capacitaMacchina: capacitaMacchina,
    analizza: analizza,
    scadenza: scadenza,
  };
})(typeof window !== 'undefined' ? window : globalThis);

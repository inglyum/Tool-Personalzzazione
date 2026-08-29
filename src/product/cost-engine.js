/* ═══════════════════════════════════════════════════════════════════════════
   INGLY COST ENGINE · un solo motore, cinque tecnologie
   ═══════════════════════════════════════════════════════════════════════════

   L'audit ha trovato 225 calcoli che leggono i numeri dal DOM, sparsi in 42
   file, e tre quoter con tre matematiche diverse. Il risultato misurato: nel
   modulo apparel un ordine da 200 pezzi usciva a margine −5,0%, perché lo
   sconto quantità scritto a mano superava il ricarico.

   Quel difetto non è un errore di distrazione: è la conseguenza di un modello
   sbagliato. Se il prezzo scende per una tabella di sconti, prima o poi la
   tabella scende sotto il costo. Se scende perché **il costo scende davvero**,
   non può succedere.

   Da qui le due idee che reggono tutto il motore:

   1. Ogni lavorazione ha la stessa anatomia — costi **una tantum** che si
      pagano una volta per lavoro, e costi **per pezzo** che si pagano ogni
      volta. Il prezzo scende con la quantità perché la prima categoria si
      divide, non perché si applica uno sconto.

   2. La tecnologia cambia i **driver**, non la matematica. Un profilo dichiara
      da dove escono i suoi costi; energia, ammortamento, manutenzione,
      manodopera, scarto e prezzo sono scritti una volta sola.

   Aggiungere una tecnologia significa aggiungere un profilo, mai riscrivere il
   conto. È ciò che la Fase 33 chiede.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var num = function (v, d) {
    var n = parseFloat(v);
    return isFinite(n) ? n : (d || 0);
  };

  /* Grandezze fisiche e prezzi non possono essere negativi. Un meno davanti a
     un campo — per una battitura o un incolla sbagliato — non deve produrre un
     costo che si sottrae agli altri: un preventivo con un costo negativo è
     peggio di un preventivo mancante, perché sembra valido. */
  var pos = function (v, d) { return Math.max(0, num(v, d)); };

  var frazione = function (v, d) { return Math.max(0, Math.min(1, num(v, d))); };

  /* ── Driver comuni ────────────────────────────────────────────────────────
     Scritti una volta e usati da ogni tecnologia. È la parte che non si
     duplica mai: se la formula dell'ammortamento cambia, cambia qui. */

  /** Costo orario della macchina: si ammortizza ciò che si perde, non il
      prezzo pieno — una macchina a fine vita si rivende. */
  function oraMacchina(i) {
    var vita = pos(i.machineLifeHours);
    if (!vita) return 0;
    return Math.max(0, pos(i.machinePrice) - pos(i.residualValue)) / vita;
  }

  /** La potenza di targa non è quella assorbita: un riscaldatore lavora a
      intermittenza. `dutyCycle` lo rappresenta e vale 1 se non dichiarato. */
  function energia(i, ore) {
    return (pos(i.watt) / 1000) * ore * pos(i.kwhPrice) * (num(i.dutyCycle, 1) ? frazione(i.dutyCycle, 1) : 1);
  }

  var oraLavoro = function (i) { return pos(i.laborPerHour); };

  /* ── Densità tipiche, da scheda tecnica ────────────────────────────────── */
  var DENSITA = { pla: 1.24, petg: 1.27, abs: 1.04, asa: 1.07, tpu: 1.21, nylon: 1.14, resina: 1.10, resin: 1.10 };

  /* ── Profili di tecnologia ────────────────────────────────────────────────
     Ogni profilo dichiara due liste di voci. `unaTantum` si paga una volta per
     lavoro e verrà diviso per la quantità; `perPezzo` si paga ogni volta.
     `perdibili` elenca quali voci vengono buttate quando un pezzo fallisce. */

  var PROFILI = {

    /* ── STAMPA 3D ──────────────────────────────────────────────────────── */
    print3d: {
      id: 'print3d',
      label: 'Stampa 3D',
      /** Ore macchina per pezzo: dallo slicer, oppure dichiarate. */
      ore: function (i) { return pos(i.hours); },
      unaTantum: function (i) {
        return [
          { id: 'setup', label: 'Avviamento', value: (pos(i.setupMin) / 60) * oraLavoro(i),
            detail: num(i.setupMin) + ' min di preparazione' },
          { id: 'primaStampa', label: 'Prova di stampa', value: pos(i.testPrintCost),
            detail: 'campione di verifica' },
        ];
      },
      perPezzo: function (i, ore) {
        var grammi = pos(i.grams);
        if (!grammi && i.volumeCm3) {
          var d = num(i.density) || DENSITA[String(i.material || '').toLowerCase()] || 1.24;
          grammi = pos(i.volumeCm3) * Math.max(0.01, d);
        }
        var supporti = pos(i.supportGrams);
        var spurgo = pos(i.purgeGrams);            // torre di spurgo, cambi colore
        var prezzoKg = pos(i.materialPricePerKg);
        if (!prezzoKg && i.spoolPrice && i.spoolGrams) prezzoKg = (pos(i.spoolPrice) / pos(i.spoolGrams)) * 1000;

        return [
          { id: 'materiale', label: 'Materiale', value: ((grammi + supporti + spurgo) / 1000) * prezzoKg,
            detail: Math.round(grammi + supporti + spurgo) + ' g' +
              (supporti ? ' · supporti ' + Math.round(supporti) + ' g' : '') +
              (spurgo ? ' · spurgo ' + Math.round(spurgo) + ' g' : '') },
          { id: 'energia', label: 'Energia', value: energia(i, ore), detail: num(i.watt) + ' W × ' + ore.toFixed(2) + ' h' },
          { id: 'macchina', label: 'Ammortamento macchina', value: oraMacchina(i) * ore,
            detail: pos(i.machineLifeHours) ? pos(i.machineLifeHours) + ' h di vita utile' : 'vita utile non indicata' },
          { id: 'manutenzione', label: 'Manutenzione e consumabili', value: pos(i.maintenancePerHour) * ore,
            detail: ore.toFixed(2) + ' h di lavoro' },
          { id: 'postProcesso', label: 'Post-processo', value: (pos(i.washCureMin) / 60) * oraLavoro(i) + pos(i.consumablesPerPrint),
            detail: num(i.washCureMin) + ' min di lavaggio e polimerizzazione' },
          { id: 'finitura', label: 'Finitura', value: (pos(i.finishMin) / 60) * oraLavoro(i),
            detail: num(i.finishMin) + ' min per pezzo' },
        ];
      },
      perdibili: ['materiale', 'energia', 'macchina', 'manutenzione'],
    },

    /* ── LASER ──────────────────────────────────────────────────────────────
       Il costo del materiale non è quello del pezzo: è quello della **porzione
       di foglio** che il pezzo consuma, sfrido compreso. Un pezzo che occupa
       il 40% di un foglio costa il 40% del foglio, non la sua area netta. */
    laser: {
      id: 'laser',
      label: 'Laser',
      ore: function (i) {
        if (i.hours) return pos(i.hours);
        var passate = Math.max(1, pos(i.passes, 1));
        /* mm/min: il taglio si misura in lunghezza, l'incisione in area. */
        var minTaglio = pos(i.cutLengthMm) > 0 && pos(i.cutSpeedMmMin) > 0
          ? (pos(i.cutLengthMm) / pos(i.cutSpeedMmMin)) * passate : 0;
        var minIncisione = pos(i.engraveAreaMm2) > 0 && pos(i.engraveSpeedMm2Min) > 0
          ? (pos(i.engraveAreaMm2) / pos(i.engraveSpeedMm2Min)) * passate : 0;
        return (minTaglio + minIncisione) / 60;
      },
      unaTantum: function (i) {
        return [
          { id: 'setup', label: 'Avviamento e messa a fuoco', value: (pos(i.setupMin) / 60) * oraLavoro(i),
            detail: num(i.setupMin) + ' min' },
          { id: 'provaTaglio', label: 'Prova di taglio', value: pos(i.testCutCost), detail: 'campione di verifica' },
          { id: 'maschera', label: 'Preparazione dima', value: pos(i.jigCost), detail: 'attrezzaggio del lavoro' },
        ];
      },
      perPezzo: function (i, ore) {
        /* Resa del foglio: quanti pezzi ne escono davvero. Se il numero è
           dichiarato lo si usa; altrimenti lo si ricava dalla percentuale di
           utilizzo, che è il modo in cui il dato si conosce di solito. */
        var perFoglio = pos(i.piecesPerSheet);
        if (!perFoglio && pos(i.sheetAreaMm2) > 0 && pos(i.pieceAreaMm2) > 0) {
          var resa = frazione(i.sheetUtilization, 0.8) || 0.8;
          perFoglio = Math.floor((pos(i.sheetAreaMm2) * resa) / pos(i.pieceAreaMm2));
        }
        var materiale = perFoglio > 0 ? pos(i.sheetPrice) / perFoglio : pos(i.materialPerPiece);

        return [
          { id: 'materiale', label: 'Materiale', value: materiale,
            detail: perFoglio > 0 ? perFoglio + ' pezzi per foglio (sfrido compreso)' : 'costo dichiarato per pezzo' },
          { id: 'energia', label: 'Energia', value: energia(i, ore), detail: num(i.watt) + ' W × ' + ore.toFixed(2) + ' h' },
          { id: 'macchina', label: 'Ammortamento macchina', value: oraMacchina(i) * ore, detail: ore.toFixed(2) + ' h' },
          { id: 'manutenzione', label: 'Manutenzione', value: pos(i.maintenancePerHour) * ore,
            detail: 'ottiche, lenti, tubo' },
          { id: 'servizi', label: 'Aspirazione e aria', value: (pos(i.extractionPerHour) + pos(i.airAssistPerHour)) * ore,
            detail: 'aspirazione fumi e aria di assistenza' },
          { id: 'mascheratura', label: 'Mascheratura', value: pos(i.maskingPerPiece), detail: 'nastro di protezione' },
          { id: 'finitura', label: 'Finitura e controllo', value: ((pos(i.finishMin) + pos(i.qcMin)) / 60) * oraLavoro(i),
            detail: num(i.finishMin) + ' min di finitura + ' + num(i.qcMin) + ' min di controllo' },
        ];
      },
      perdibili: ['materiale', 'energia', 'macchina', 'manutenzione', 'servizi'],
    },

    /* ── STAMPA UV ──────────────────────────────────────────────────────── */
    uv: {
      id: 'uv',
      label: 'Stampa UV',
      ore: function (i) {
        if (i.hours) return pos(i.hours);
        var m2 = pos(i.printAreaMm2) / 1000000;
        var passate = Math.max(1, pos(i.passes, 1));
        return pos(i.speedM2Hour) > 0 ? (m2 * passate) / pos(i.speedM2Hour) : 0;
      },
      unaTantum: function (i) {
        return [
          { id: 'setup', label: 'Avviamento e allineamento', value: (pos(i.setupMin) / 60) * oraLavoro(i),
            detail: num(i.setupMin) + ' min' },
          { id: 'profilo', label: 'Profilo colore', value: pos(i.profilingCost), detail: 'taratura per supporto' },
        ];
      },
      perPezzo: function (i, ore) {
        var m2 = pos(i.printAreaMm2) / 1000000;
        /* Il bianco è un inchiostro a sé: si stende in fondo e consuma di più. */
        var inchiostro = m2 * (pos(i.inkMlPerM2) * pos(i.inkPricePerMl));
        var bianco = m2 * (pos(i.whiteMlPerM2) * pos(i.whitePricePerMl));
        var vernice = m2 * (pos(i.varnishMlPerM2) * pos(i.varnishPricePerMl));

        return [
          { id: 'supporto', label: 'Supporto', value: pos(i.blankPrice), detail: 'oggetto da stampare' },
          { id: 'inchiostro', label: 'Inchiostro', value: inchiostro + bianco + vernice,
            detail: (m2 * 10000).toFixed(0) + ' cm²' + (bianco > 0 ? ' · con bianco di fondo' : '') + (vernice > 0 ? ' · con vernice' : '') },
          { id: 'primer', label: 'Primer', value: pos(i.primerPerPiece), detail: 'aggrappante' },
          { id: 'energia', label: 'Energia', value: energia(i, ore), detail: ore.toFixed(2) + ' h' },
          { id: 'macchina', label: 'Ammortamento macchina', value: oraMacchina(i) * ore, detail: ore.toFixed(2) + ' h' },
          { id: 'manutenzione', label: 'Manutenzione', value: pos(i.maintenancePerHour) * ore, detail: 'testine e pulizia' },
          { id: 'manodopera', label: 'Manodopera', value: ((pos(i.handlingMin) + pos(i.curingMin)) / 60) * oraLavoro(i),
            detail: num(i.handlingMin) + ' min di manipolazione + ' + num(i.curingMin) + ' min di polimerizzazione' },
        ];
      },
      perdibili: ['supporto', 'inchiostro', 'primer', 'energia', 'macchina', 'manutenzione'],
    },

    /* ── DTF ────────────────────────────────────────────────────────────────
       Il film si compra a metro lineare: quanto ne consuma una grafica dipende
       da quante ne stanno affiancate nella larghezza. È il calcolo che
       distingue un costo reale da una media. */
    dtf: {
      id: 'dtf',
      label: 'DTF',
      ore: function (i) {
        if (i.hours) return pos(i.hours);
        var m2 = pos(i.printAreaMm2) / 1000000;
        return pos(i.speedM2Hour) > 0 ? m2 / pos(i.speedM2Hour) : 0;
      },
      unaTantum: function (i) {
        return [
          { id: 'setup', label: 'Preparazione file e impaginazione', value: (pos(i.setupMin) / 60) * oraLavoro(i),
            detail: num(i.setupMin) + ' min di composizione del foglio' },
        ];
      },
      perPezzo: function (i, ore) {
        var m2Stampa = pos(i.printAreaMm2) / 1000000;

        /* Consumo di film: se si dichiara quante grafiche stanno affiancate
           nella larghezza del rotolo, si sa quanto film consuma davvero una
           grafica. Altrimenti si ripiega sull'area stampata, che sottostima. */
        var m2Film = m2Stampa;
        if (pos(i.filmWidthMm) > 0 && pos(i.graphicWidthMm) > 0 && pos(i.graphicHeightMm) > 0) {
          var affiancate = Math.max(1, Math.floor(pos(i.filmWidthMm) / pos(i.graphicWidthMm)));
          var passoM = (pos(i.graphicHeightMm) + pos(i.gapMm, 5)) / 1000;
          m2Film = (pos(i.filmWidthMm) / 1000) * passoM / affiancate;
        }

        var inchiostro = m2Stampa * (pos(i.inkMlPerM2) * pos(i.inkPricePerMl) + pos(i.whiteMlPerM2) * pos(i.whitePricePerMl));
        var polvere = m2Stampa * pos(i.powderGPerM2) * (pos(i.powderPricePerKg) / 1000);
        var orePressa = pos(i.pressSec) / 3600;

        return [
          { id: 'capo', label: 'Capo', value: pos(i.blankPrice), detail: 'supporto da stampare' },
          { id: 'film', label: 'Film', value: m2Film * pos(i.filmPricePerM2),
            detail: (m2Film * 10000).toFixed(1) + ' cm² di film' +
              (pos(i.filmWidthMm) && pos(i.graphicWidthMm)
                ? ' · ' + Math.max(1, Math.floor(pos(i.filmWidthMm) / pos(i.graphicWidthMm))) + ' grafiche affiancate'
                : ' · senza impaginazione dichiarata') },
          { id: 'inchiostro', label: 'Inchiostro', value: inchiostro, detail: (m2Stampa * 10000).toFixed(0) + ' cm² stampati' },
          { id: 'polvere', label: 'Polvere adesiva', value: polvere, detail: num(i.powderGPerM2) + ' g/m²' },
          { id: 'energia', label: 'Energia', value: energia(i, ore + orePressa), detail: 'stampa e pressa' },
          { id: 'macchina', label: 'Ammortamento macchina', value: oraMacchina(i) * (ore + orePressa), detail: 'stampante, forno e pressa' },
          { id: 'manutenzione', label: 'Manutenzione', value: pos(i.maintenancePerHour) * ore, detail: 'testine e circuito' },
          { id: 'manodopera', label: 'Manodopera', value: ((pos(i.handlingMin) + pos(i.pressSec) / 60) / 60) * oraLavoro(i),
            detail: num(i.handlingMin) + ' min di posizionamento + ' + num(i.pressSec) + ' s di pressa' },
        ];
      },
      perdibili: ['capo', 'film', 'inchiostro', 'polvere', 'energia', 'macchina'],
    },

    /* ── SUBLIMAZIONE ───────────────────────────────────────────────────── */
    sublimation: {
      id: 'sublimation',
      label: 'Sublimazione',
      ore: function (i) {
        if (i.hours) return pos(i.hours);
        return (pos(i.printMin) + pos(i.pressSec) / 60) / 60;
      },
      unaTantum: function (i) {
        return [
          { id: 'setup', label: 'Preparazione file', value: (pos(i.setupMin) / 60) * oraLavoro(i), detail: num(i.setupMin) + ' min' },
          { id: 'profilo', label: 'Prova colore', value: pos(i.testPrintCost), detail: 'campione su supporto' },
        ];
      },
      perPezzo: function (i, ore) {
        var m2 = pos(i.printAreaMm2) / 1000000;
        return [
          { id: 'blank', label: 'Supporto', value: pos(i.blankPrice), detail: 'oggetto in poliestere o pretrattato' },
          { id: 'carta', label: 'Carta transfer', value: pos(i.sheets, 1) * pos(i.sheetPrice),
            detail: num(i.sheets, 1) + ' fogli' },
          { id: 'inchiostro', label: 'Inchiostro', value: m2 * pos(i.inkMlPerM2) * pos(i.inkPricePerMl),
            detail: (m2 * 10000).toFixed(0) + ' cm² stampati' },
          { id: 'energia', label: 'Energia', value: energia(i, ore), detail: num(i.pressSec) + ' s di pressa' },
          { id: 'macchina', label: 'Ammortamento macchina', value: oraMacchina(i) * ore, detail: 'stampante e pressa' },
          { id: 'manodopera', label: 'Manodopera', value: ((pos(i.handlingMin) + pos(i.pressSec) / 60) / 60) * oraLavoro(i),
            detail: num(i.handlingMin) + ' min di manipolazione' },
        ];
      },
      perdibili: ['blank', 'carta', 'inchiostro', 'energia', 'macchina'],
    },
  };

  /* ── Il conto ─────────────────────────────────────────────────────────────
     Uguale per tutte le tecnologie. È questa funzione che il difetto misurato
     nel modulo apparel non aveva: la divisione dei costi una tantum. */
  function calcola(input) {
    var i = input || {};
    var profilo = PROFILI[String(i.tecnologia || i.technology || 'print3d')];
    if (!profilo) return { vuoto: true, motivo: 'tecnologia sconosciuta: ' + i.tecnologia };

    var qty = Math.max(1, Math.floor(num(i.qty, 1)));
    var ore = profilo.ore(i);

    var vociUnaTantum = profilo.unaTantum(i).filter(function (v) { return v.value > 0.0000001; });
    var vociPerPezzo = profilo.perPezzo(i, ore).filter(function (v) { return v.value > 0.0000001; });

    var extra = (i.extras || []).reduce(function (a, e) { return a + pos(e && e.cost); }, 0);
    if (extra > 0) vociPerPezzo.push({ id: 'extra', label: 'Extra', value: extra, detail: (i.extras || []).length + ' voci' });

    var packaging = pos(i.packagingPerUnit);
    if (packaging > 0) vociPerPezzo.push({ id: 'packaging', label: 'Confezione', value: packaging, detail: 'per pezzo' });

    var totaleUnaTantum = vociUnaTantum.reduce(function (a, v) { return a + v.value; }, 0);
    var totalePerPezzo = vociPerPezzo.reduce(function (a, v) { return a + v.value; }, 0);

    /* ── Scarto ───────────────────────────────────────────────────────────
       Un pezzo fallito butta ciò che era già stato consumato quando è fallito,
       non la finitura che non è ancora stata fatta. Il fattore tasso/(1−tasso)
       dice quanto materiale in più serve per **consegnare** i pezzi buoni: al
       10% di scarto non serve il 10% in più, serve l'11,1%. */
    var perdibile = vociPerPezzo
      .filter(function (v) { return profilo.perdibili.indexOf(v.id) >= 0; })
      .reduce(function (a, v) { return a + v.value; }, 0);
    var tasso = Math.max(0, Math.min(90, pos(i.failureRate))) / 100;
    var scarto = perdibile * (tasso / (1 - tasso || 1));
    if (scarto > 0.0000001) {
      vociPerPezzo.push({ id: 'scarto', label: 'Scarto previsto', value: scarto,
        detail: (tasso * 100).toFixed(0) + '% di pezzi da rifare' });
      totalePerPezzo += scarto;
    }

    /* La riga che manda a posto tutto: il lavoro si divide, il pezzo no. */
    var unaTantumPerPezzo = totaleUnaTantum / qty;
    var costoPezzo = totalePerPezzo + unaTantumPerPezzo;

    /* Spese generali: una percentuale del costo diretto, non una voce a caso. */
    var overheadPct = Math.max(0, pos(i.overheadPct)) / 100;
    var overhead = costoPezzo * overheadPct;
    costoPezzo += overhead;

    return {
      vuoto: false,
      tecnologia: profilo.id,
      etichetta: profilo.label,
      qty: qty,
      ore: ore,
      unaTantum: { voci: vociUnaTantum, totale: totaleUnaTantum, perPezzo: unaTantumPerPezzo },
      perPezzo: { voci: vociPerPezzo, totale: totalePerPezzo },
      overhead: overhead,
      costoPezzo: costoPezzo,
      costoTotale: costoPezzo * qty,
      costoOrarioMacchina: oraMacchina(i),
    };
  }

  /* ── Prezzo ───────────────────────────────────────────────────────────────
     Margine e ricarico sono due cose diverse e vengono confuse di continuo.
     Su un costo di 100: ricarico 40% dà 140 e un margine del 28,6%; margine
     40% dà 166,67. Chi imposta «40» pensando al margine e ottiene il ricarico
     perde un terzo del guadagno che credeva di avere — misurato, non ipotetico.

     Il pavimento è la difesa che mancava: nessuna combinazione di sconti può
     portare il prezzo sotto il margine minimo dichiarato. */
  var STRATEGIE = ['margine', 'ricarico', 'fisso', 'competitivo', 'premium'];

  function prezzo(costo, opzioni) {
    var o = opzioni || {};
    var c = pos(costo);
    var strategia = STRATEGIE.indexOf(o.strategia) >= 0 ? o.strategia : 'margine';

    var netto;
    if (strategia === 'margine') {
      var m = frazione(o.marginePct != null ? o.marginePct / 100 : 0.4);
      netto = m >= 1 ? c : c / (1 - m);          // margine 100% non esiste: sarebbe prezzo infinito
    } else if (strategia === 'ricarico') {
      netto = c * Math.max(0, num(o.ricarico, 1.4));
    } else if (strategia === 'fisso') {
      netto = pos(o.prezzoFisso);
    } else if (strategia === 'competitivo') {
      netto = pos(o.prezzoMercato) * (1 - frazione(o.sottoMercatoPct != null ? o.sottoMercatoPct / 100 : 0.05));
    } else {
      netto = pos(o.prezzoMercato) * (1 + Math.max(0, num(o.sopraMercatoPct, 20)) / 100);
    }

    var sconto = frazione(o.scontoPct != null ? o.scontoPct / 100 : 0);
    netto = netto * (1 - sconto);

    /* Il pavimento: si dichiara un margine minimo e il prezzo non scende sotto,
       qualunque sconto sia stato chiesto. Senza questa riga il quoter può
       vendere in perdita — ed è esattamente quello che faceva. */
    var pavimentoPct = o.marginePavimentoPct != null ? frazione(o.marginePavimentoPct / 100) : null;
    var pavimento = null;
    var scattato = false;
    if (pavimentoPct != null && pavimentoPct < 1) {
      pavimento = c / (1 - pavimentoPct);
      if (netto < pavimento) { netto = pavimento; scattato = true; }
    }

    /* Commissioni di canale e pagamento: si pagano sul lordo incassato. */
    var ivaPct = Math.max(0, num(o.ivaPct, 22));
    var iva = netto * ivaPct / 100;
    var lordo = netto + iva;

    var commissioni = lordo * (Math.max(0, pos(o.commissionePct)) / 100) + pos(o.commissioneFissa);
    var spedizione = pos(o.spedizione);

    var profitto = netto - c;
    var profittoNetto = profitto - commissioni;

    return {
      costo: c,
      strategia: strategia,
      netto: netto,
      ivaPct: ivaPct,
      iva: iva,
      lordo: lordo,
      commissioni: commissioni,
      spedizione: spedizione,
      profitto: profitto,
      profittoNetto: profittoNetto,
      /* Margine sul ricavo, ricarico sul costo: entrambi mostrati, mai confusi. */
      marginePct: netto > 0 ? (profitto / netto) * 100 : 0,
      ricaricoPct: c > 0 ? (profitto / c) * 100 : 0,
      margineNettoPct: netto > 0 ? (profittoNetto / netto) * 100 : 0,
      pavimentoScattato: scattato,
      pavimento: pavimento,
      inPerdita: profittoNetto < 0,
    };
  }

  /* ── Scaglioni ────────────────────────────────────────────────────────────
     La domanda che il cliente fa sempre: «e se ne prendo 100 invece di 50?».
     Il prezzo scende da sé, perché scende il costo. */
  var SCAGLIONI = [1, 2, 5, 10, 20, 50, 100, 250, 500];

  function scaglioni(input, quantita, opzioniPrezzo) {
    var lista = (quantita && quantita.length ? quantita : SCAGLIONI)
      .map(function (q) { return Math.max(1, Math.floor(num(q, 1))); });
    var visti = {};
    return lista.filter(function (q) { if (visti[q]) return false; visti[q] = 1; return true; })
      .map(function (q) {
        var c = calcola(Object.assign({}, input, { qty: q }));
        if (c.vuoto) return { qty: q, vuoto: true, motivo: c.motivo };
        var p = prezzo(c.costoPezzo, opzioniPrezzo);
        return {
          qty: q,
          costoPezzo: c.costoPezzo,
          unaTantumPerPezzo: c.unaTantum.perPezzo,
          prezzoPezzo: p.netto,
          totaleNetto: p.netto * q,
          totaleLordo: p.lordo * q,
          profitto: p.profitto * q,
          marginePct: p.marginePct,
          pavimentoScattato: p.pavimentoScattato,
        };
      });
  }

  /** Il conto completo per un lavoro: costo, prezzo e scaglioni in un colpo. */
  function preventiva(input, opzioniPrezzo) {
    var c = calcola(input);
    if (c.vuoto) return c;
    return {
      costo: c,
      prezzo: prezzo(c.costoPezzo, opzioniPrezzo),
      scaglioni: scaglioni(input, (input || {}).scaglioni, opzioniPrezzo),
    };
  }

  global.InglyCostEngine = {
    PROFILI: PROFILI,
    STRATEGIE: STRATEGIE,
    SCAGLIONI: SCAGLIONI,
    tecnologie: function () { return Object.keys(PROFILI); },
    calcola: calcola,
    prezzo: prezzo,
    scaglioni: scaglioni,
    preventiva: preventiva,
  };
})(typeof window !== 'undefined' ? window : globalThis);

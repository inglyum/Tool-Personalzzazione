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

  var VERSIONE = '1.2.0';

  /* ── Politiche di prezzo ──────────────────────────────────────────────────
     Quattro posizionamenti, non quattro numeri a caso: sono i modi con cui un
     laboratorio decide se sta rincorrendo il prezzo o il valore. Vivono qui
     perché la UI deve **leggerle**, non riscriverle — era proprio la loro
     assenza a far nascere ricarichi diversi in schermate diverse. */
  var POLITICHE = {
    competitive: { id: 'competitive', label: 'Competitivo', marginTarget: 25, maxDiscount: 10, floorMargin: 12, recommended: false },
    standard:    { id: 'standard',    label: 'Standard',    marginTarget: 40, maxDiscount: 15, floorMargin: 20, recommended: true },
    premium:     { id: 'premium',     label: 'Premium',     marginTarget: 55, maxDiscount: 20, floorMargin: 30, recommended: false },
    luxury:      { id: 'luxury',      label: 'Luxury',      marginTarget: 70, maxDiscount: 25, floorMargin: 45, recommended: false },
  };
  var MARGINE_MINIMO = 10;   // % — nessuna politica scende sotto

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
      /* La stampante lavora da sola, spesso di notte: le spese generali non
         si spalmano sulle sue ore, ma su quelle di chi la prepara e la
         finisce. Vedi il calcolo dell overhead. */
      presidiata: false,
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

    /* ── GENERICO ───────────────────────────────────────────────────────────
       Per le lavorazioni i cui costi chi chiama ha già in mano — serigrafia,
       ricamo, transfer, vinile, pressa — e per chi migra da un calcolatore
       storico senza voler ancora spacchettare i driver.

       Non è una scorciatoia per saltare il modello: è il modello applicato a
       costi dichiarati invece che derivati. Il chiamante porta le voci, il
       motore fa quello che fa sempre — divide l'una tantum per la quantità,
       aggiunge lo scarto sul perdibile, applica le spese generali e prezza con
       il pavimento. Sono proprio le quattro cose che i calcolatori storici non
       facevano, ed è per questo che uscivano preventivi sotto costo. */
    generico: {
      id: 'generico',
      label: 'Generico',
      ore: function (i) { return pos(i.hours); },
      unaTantum: function (i) {
        var voci = (i.costiUnaTantum || []).map(function (v, n) {
          return { id: v.id || ('unaTantum' + n), label: v.label || 'Costo di avviamento',
            value: pos(v.value != null ? v.value : v.cost), detail: v.detail || 'una volta per lavoro' };
        });
        if (pos(i.setupMin) > 0) {
          voci.push({ id: 'setup', label: 'Avviamento', value: (pos(i.setupMin) / 60) * oraLavoro(i),
            detail: num(i.setupMin) + ' min' });
        }
        return voci;
      },
      perPezzo: function (i, ore) {
        var voci = (i.costiPerPezzo || []).map(function (v, n) {
          return { id: v.id || ('voce' + n), label: v.label || 'Costo',
            value: pos(v.value != null ? v.value : v.cost), detail: v.detail || '',
            perdibile: v.perdibile };
        });
        if (ore > 0) {
          voci.push({ id: 'energia', label: 'Energia', value: energia(i, ore), detail: num(i.watt) + ' W × ' + ore.toFixed(2) + ' h' });
          voci.push({ id: 'macchina', label: 'Ammortamento macchina', value: oraMacchina(i) * ore, detail: ore.toFixed(2) + ' h' });
          voci.push({ id: 'manutenzione', label: 'Manutenzione', value: pos(i.maintenancePerHour) * ore, detail: ore.toFixed(2) + ' h' });
        }
        return voci;
      },
      /* Chi dichiara le voci dichiara anche quali si buttano con un pezzo
         fallito. Senza indicazione si assume che si perda tutto ciò che è
         materiale: è l'ipotesi prudente, e viene detta invece che nascosta. */
      perdibili: null,
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
  /* ── I livelli di costo ────────────────────────────────────────────────────
     La domanda «quanto costa questo pezzo» ha tre risposte diverse, tutte e
     tre vere, e confonderle è il modo più rapido di credere che un sistema
     sbagli i conti.

     Misurato sul caso di calibrazione — 290 g, 9h57, riferimento 4,50 €:

       solo materiale                € 6,96
       + energia                     € 7,21
       + macchina e manutenzione     € 10,39
       + scarto                      € 11,18
       + manodopera (setup+finitura) € 18,68

     Lo slicer dice 4,50 € perché mostra **il materiale**, a 15,52 €/kg. Non è
     un costo di produzione più basso: è un'altra cosa. La sola manodopera di
     avviamento e finitura vale 7,50 €, più del riferimento intero.

     Chi confronta i due numeri senza sapere questo conclude che il
     preventivatore sbaglia. Il preventivatore ha ragione e non lo spiega, che
     è un difetto suo.

     Da qui in poi il livello si dichiara, e il risultato dice quale sta
     usando. */
  var LIVELLI = {
    stampa: {
      id: 'stampa', label: 'Costo di stampa', breve: 'stampa',
      spiega: 'Materiale ed energia: quello che consuma la macchina mentre lavora. È il numero che mostrano gli slicer.',
      voci: ['materiale', 'energia', 'extra'],
      manodopera: false, unaTantum: false, scarto: false, overhead: false,
    },
    macchina: {
      id: 'macchina', label: 'Costo di produzione', breve: 'produzione',
      spiega: 'Aggiunge l\'usura della macchina, la manutenzione e i pezzi che vanno rifatti. È quanto ti costa davvero produrlo.',
      voci: ['materiale', 'energia', 'macchina', 'manutenzione', 'packaging', 'extra'],
      manodopera: false, unaTantum: false, scarto: true, overhead: false,
    },
    completo: {
      id: 'completo', label: 'Costo aziendale pieno', breve: 'pieno',
      spiega: 'Aggiunge il tuo tempo — avviamento, finitura, post-processo — e le spese generali. È quanto devi rientrare per non lavorare in perdita.',
      voci: null,   // tutte
      manodopera: true, unaTantum: true, scarto: true, overhead: true,
    },
  };
  /* Il livello predefinito è quello **pieno**, cioè il comportamento che il
     motore ha sempre avuto. Sceglierne uno più stretto come predefinito
     cambierebbe in silenzio il prezzo di ogni preventivo già costruito, e in
     questo progetto un numero non si muove senza che qualcuno l'abbia
     chiesto. Chi vuole il costo di stampa lo dichiara. */
  var LIVELLO_PREDEFINITO = 'completo';

  /* Le voci che sono **tempo di una persona**: quello che distingue il costo
     di produzione dal costo aziendale pieno. */
  var VOCI_MANODOPERA = ['manodopera', 'postProcesso', 'finitura', 'lavoro', 'qc'];

  /**
   * Le ore in cui c'è una persona: avviamento, finitura, post-processo.
   *
   * Serve alle spese generali, che sono costo di struttura e si consumano
   * quando qualcuno è al lavoro — non mentre una macchina stampa da sola.
   */
  function oreDiPersona(i) {
    return (pos(i.setupMin) + pos(i.finishMin) + pos(i.washCureMin) +
            pos(i.qcMin) + pos(i.laborMin) + pos(i.postMin)) / 60;
  }

  function calcola(input) {
    var i = input || {};
    var profilo = PROFILI[String(i.tecnologia || i.technology || 'print3d')];
    if (!profilo) return { vuoto: true, motivo: 'tecnologia sconosciuta: ' + i.tecnologia };

    var qty = Math.max(1, Math.floor(num(i.qty, 1)));
    var ore = profilo.ore(i);

    /* Il livello decide **quali voci entrano**, non quanto valgono: non si
       sconta niente e non si nasconde niente, si risponde a una domanda più
       stretta. Le voci escluse restano leggibili in `escluse`, perché «questo
       livello non le conta» è un'informazione, non un silenzio. */
    var livello = LIVELLI[String(i.livelloCosto || '')] || LIVELLI[LIVELLO_PREDEFINITO];
    var ammessa = function (v) {
      if (livello.voci && livello.voci.indexOf(v.id) < 0) return false;
      if (!livello.manodopera && VOCI_MANODOPERA.indexOf(v.id) >= 0) return false;
      return true;
    };

    var tutteUnaTantum = profilo.unaTantum(i).filter(function (v) { return v.value > 0.0000001; });
    var tuttePerPezzo = profilo.perPezzo(i, ore).filter(function (v) { return v.value > 0.0000001; });

    var vociUnaTantum = livello.unaTantum ? tutteUnaTantum.filter(ammessa) : [];
    var vociPerPezzo = tuttePerPezzo.filter(ammessa);

    var escluse = tuttePerPezzo.filter(function (v) { return !ammessa(v); })
      .concat(livello.unaTantum ? [] : tutteUnaTantum);

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
    /* Un profilo può dichiarare quali voci si buttano con un pezzo fallito.
       Se non lo fa — il profilo generico — decide chi porta le voci, con
       `perdibile: false` su quelle che sopravvivono al fallimento. */
    var elencoPerdibili = profilo.perdibili;
    var perdibile = vociPerPezzo
      .filter(function (v) {
        if (elencoPerdibili) return elencoPerdibili.indexOf(v.id) >= 0;
        return v.perdibile !== false && v.id !== 'packaging' && v.id !== 'extra';
      })
      .reduce(function (a, v) { return a + v.value; }, 0);
    var tasso = livello.scarto ? Math.max(0, Math.min(90, pos(i.failureRate))) / 100 : 0;
    var scarto = perdibile * (tasso / (1 - tasso || 1));
    if (scarto > 0.0000001) {
      vociPerPezzo.push({ id: 'scarto', label: 'Scarto previsto', value: scarto,
        detail: (tasso * 100).toFixed(0) + '% di pezzi da rifare' });
      totalePerPezzo += scarto;
    }

    /* La riga che manda a posto tutto: il lavoro si divide, il pezzo no. */
    var unaTantumPerPezzo = totaleUnaTantum / qty;
    var costoPezzo = totalePerPezzo + unaTantumPerPezzo;

    /* Spese generali. Due modi di dichiararle, entrambi legittimi: una
       percentuale del costo diretto, oppure un costo orario di struttura —
       affitto, utenze, amministrazione — spalmato sulle ore di lavoro. Chi ha
       fatto i conti del proprio laboratorio di solito conosce il secondo. */
    var overhead = 0;
    var overheadModo = livello.overhead ? 'nessuno' : 'escluso dal livello';
    if (!livello.overhead) { /* le spese generali sono costo aziendale, non di stampa */ }
    else if (pos(i.overheadPerHour) > 0) {
      /* ── Su quali ore si spalmano le spese generali ─────────────────────
         Non su quelle della macchina. Una stampante 3D lavora dieci ore da
         sola, spesso di notte: attribuire a quel pezzo dieci ore di affitto,
         utenze e amministrazione lo rende assurdo. Misurato sul caso di
         calibrazione, con 4 €/h di struttura: 39,80 € di spese generali su un
         pezzo da 290 g, cioè più del triplo del suo costo di produzione.

         Le spese generali si spalmano sulle ore di **una persona**. Quando la
         macchina lavora presidiata — il laser, la pressa — le due cose
         coincidono e non cambia niente; quando lavora da sola, cambia tutto.

         `overheadHours` permette di dichiararlo esplicitamente; altrimenti lo
         decide il profilo. */
      var orePresidiate = i.overheadHours != null ? pos(i.overheadHours)
        : (profilo.presidiata === false ? oreDiPersona(i) : ore);
      overhead = pos(i.overheadPerHour) * orePresidiate;
      overheadModo = 'orario' + (profilo.presidiata === false ? ' sulle ore di lavoro' : '');
    } else if (livello.overhead && pos(i.overheadPct) > 0) {
      overhead = costoPezzo * (Math.max(0, pos(i.overheadPct)) / 100);
      overheadModo = 'percentuale';
    }
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
      overheadModo: overheadModo,
      /* A quale domanda si è risposto, e cosa è rimasto fuori. */
      livello: livello.id,
      livelloLabel: livello.label,
      livelloSpiega: livello.spiega,
      escluse: escluse.map(function (v) { return { id: v.id, label: v.label, value: v.value }; }),
      esclusoTotale: escluse.reduce(function (a, v) { return a + v.value; }, 0),
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

    /* Commissioni di canale e pagamento: si pagano sul lordo incassato, e sono
       tre cose diverse che finivano in un numero solo. Separarle è ciò che
       permette di vedere che un marketplace al 12% pesa più dello sconto che
       si è appena rifiutato di fare. */
    var ivaPct = Math.max(0, num(o.ivaPct, 22));
    var iva = netto * ivaPct / 100;
    var lordo = netto + iva;

    var commPagamentoPct = lordo * (Math.max(0, pos(o.commissionePagamentoPct != null ? o.commissionePagamentoPct : o.commissionePct)) / 100);
    var commPagamentoFissa = pos(o.commissionePagamentoFissa != null ? o.commissionePagamentoFissa : o.commissioneFissa);
    var commMarketplace = lordo * (Math.max(0, pos(o.commissioneMarketplacePct)) / 100);
    var commissioni = commPagamentoPct + commPagamentoFissa + commMarketplace;

    /* La spedizione ha due facce che venivano confuse: quanto si fa pagare e
       quanto costa davvero. Il profitto deve usare la seconda — chi addebita
       6 € e ne spende 9 sta perdendo 3 € a ogni ordine, e il conto vecchio non
       lo mostrava. */
    /* `spedizioneAddebitata: true` è la forma storica e vuol dire «la paga il
       cliente»: si assume che paghi esattamente quanto costa, cioè che la
       spedizione sia neutra. Chi vuole dire altro passa i due importi. */
    var spedizioneCosto, spedizioneAddebitata;
    if (o.spedizioneAddebitata === true) {
      spedizioneCosto = pos(o.spedizioneCosto != null ? o.spedizioneCosto : o.spedizione);
      spedizioneAddebitata = spedizioneCosto;
    } else {
      spedizioneCosto = pos(o.spedizioneCosto != null ? o.spedizioneCosto : o.spedizione);
      spedizioneAddebitata = pos(o.spedizioneAddebitata);
    }
    var margineSpedizione = spedizioneAddebitata - spedizioneCosto;
    var spedizione = spedizioneCosto - spedizioneAddebitata;   // peso netto sul conto
    var altriVariabili = pos(o.altriCostiVariabili);

    /* L'IVA non è mai profitto: è denaro dello Stato che transita. Nessuna
       delle righe qui sotto la tocca. */
    var profittoLordo = netto - c;
    var dopoCommissioni = profittoLordo - commissioni;
    var dopoSpedizione = dopoCommissioni - spedizione;
    var profittoOperativo = dopoSpedizione - altriVariabili;

    return {
      costo: c,
      strategia: strategia,
      netto: netto,
      ivaPct: ivaPct,
      iva: iva,
      lordo: lordo,
      commissioni: commissioni,
      commissioniDettaglio: {
        pagamentoPct: commPagamentoPct,
        pagamentoFissa: commPagamentoFissa,
        marketplace: commMarketplace,
      },
      spedizione: spedizione,
      spedizioneAddebitata: spedizioneAddebitata,
      spedizioneCosto: spedizioneCosto,
      margineSpedizione: margineSpedizione,
      altriCostiVariabili: altriVariabili,

      /* Quattro livelli, perché «profitto» da solo non vuol dire niente:
         chi vende su un canale con il 12% di commissione e spedizione a proprio
         carico guadagna molto meno di quanto il primo numero suggerisca. */
      profittoLordo: profittoLordo,
      profittoDopoCommissioni: dopoCommissioni,
      profittoDopoSpedizione: dopoSpedizione,
      profittoOperativo: profittoOperativo,

      /* Margine sul ricavo, ricarico sul costo: entrambi mostrati, mai confusi. */
      marginePct: netto > 0 ? (profittoLordo / netto) * 100 : 0,
      ricaricoPct: c > 0 ? (profittoLordo / c) * 100 : 0,
      margineOperativoPct: netto > 0 ? (profittoOperativo / netto) * 100 : 0,

      pavimentoScattato: scattato,
      pavimento: pavimento,
      margineProtetto: pavimentoPct != null && profittoOperativo >= 0,
      inPerdita: profittoOperativo < 0,

      /* Nomi conservati per chi legge ancora i vecchi: stesso significato. */
      profitto: profittoLordo,
      profittoNetto: profittoOperativo,
      margineNettoPct: netto > 0 ? (profittoOperativo / netto) * 100 : 0,
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

  /* ── Campi che ogni profilo legge davvero ─────────────────────────────────
     Servono a due cose che il motore da solo non potrebbe fare: dire a chi
     compila quali numeri mancano, e dire a chi legge il prezzo da dove viene
     ognuno. Sono dichiarati, non dedotti: un elenco sbagliato si vede subito
     nei test, una deduzione sbagliata no. */
  var CAMPI = {
    comuni: ['qty', 'machinePrice', 'residualValue', 'machineLifeHours', 'watt', 'kwhPrice',
      'dutyCycle', 'maintenancePerHour', 'laborPerHour', 'setupMin', 'failureRate',
      'packagingPerUnit', 'overheadPct', 'overheadPerHour'],
    print3d: ['grams', 'volumeCm3', 'density', 'material', 'supportGrams', 'purgeGrams',
      'materialPricePerKg', 'spoolPrice', 'spoolGrams', 'hours', 'washCureMin',
      'consumablesPerPrint', 'finishMin', 'testPrintCost'],
    laser: ['cutLengthMm', 'cutSpeedMmMin', 'engraveAreaMm2', 'engraveSpeedMm2Min', 'passes',
      'sheetPrice', 'sheetAreaMm2', 'pieceAreaMm2', 'sheetUtilization', 'piecesPerSheet',
      'materialPerPiece', 'extractionPerHour', 'airAssistPerHour', 'maskingPerPiece',
      'finishMin', 'qcMin', 'testCutCost', 'jigCost'],
    uv: ['printAreaMm2', 'passes', 'speedM2Hour', 'blankPrice', 'inkMlPerM2', 'inkPricePerMl',
      'whiteMlPerM2', 'whitePricePerMl', 'varnishMlPerM2', 'varnishPricePerMl',
      'primerPerPiece', 'handlingMin', 'curingMin', 'profilingCost'],
    dtf: ['printAreaMm2', 'speedM2Hour', 'blankPrice', 'filmWidthMm', 'graphicWidthMm',
      'graphicHeightMm', 'gapMm', 'filmPricePerM2', 'inkMlPerM2', 'inkPricePerMl',
      'whiteMlPerM2', 'whitePricePerMl', 'powderGPerM2', 'powderPricePerKg',
      'pressSec', 'handlingMin'],
    generico: ['costiPerPezzo', 'costiUnaTantum', 'hours'],   /* i costi arrivano già calcolati */
    sublimation: ['printAreaMm2', 'printMin', 'pressSec', 'blankPrice', 'sheets', 'sheetPrice',
      'inkMlPerM2', 'inkPricePerMl', 'handlingMin', 'testPrintCost'],
  };

  /* I campi senza i quali il conto è una finzione: non un errore, ma un costo
     che uscirà troppo basso e che chi preventiva deve sapere che manca. */
  var ESSENZIALI = {
    generico: ['costiPerPezzo'],
    print3d: ['materialPricePerKg', 'hours', 'laborPerHour'],
    laser: ['laborPerHour'],
    uv: ['printAreaMm2', 'laborPerHour'],
    dtf: ['printAreaMm2', 'laborPerHour'],
    sublimation: ['blankPrice', 'laborPerHour'],
  };

  function presente(i, campo) {
    var v = i[campo];
    if (v === undefined || v === null || v === '') return false;
    if (typeof v === 'number') return isFinite(v);
    if (typeof v === 'string') return isFinite(parseFloat(v)) || campo === 'material';
    return true;
  }

  /* ── Provenienza dei numeri ───────────────────────────────────────────────
     La modalità «audit costo» deve poter dire se un numero viene dal magazzino,
     dalle impostazioni, da un valore di ripiego o da nessuna parte. Il motore
     non può saperlo da solo: lo dichiara chi lo chiama, in `fonti`. Quello che
     il motore sa dire da sé è se il campo c'era o no — e non finge il resto. */
  var FONTI_NOTE = ['reale', 'magazzino', 'configurato', 'default', 'stima'];

  function fonteDi(i, campo) {
    var f = (i.fonti || {})[campo];
    if (f && FONTI_NOTE.indexOf(f) >= 0) return f;
    return presente(i, campo) ? 'inserito' : 'mancante';
  }

  /**
   * Dice se l'input regge, prima di calcolare. Distingue **problemi** (il conto
   * sarebbe sbagliato) da **avvisi** (il conto è giusto ma incompleto).
   */
  function validateInput(input) {
    var i = input || {};
    var tec = String(i.tecnologia || i.technology || '');
    var problemi = [];
    var avvisi = [];

    if (!PROFILI[tec]) {
      return { ok: false, problemi: ['tecnologia sconosciuta: «' + (tec || '(nessuna)') + '»'], avvisi: [], mancanti: [] };
    }

    var noti = CAMPI.comuni.concat(CAMPI[tec] || []);
    var mancanti = noti.filter(function (c) { return !presente(i, c); });

    (ESSENZIALI[tec] || []).forEach(function (c) {
      if (!presente(i, c)) avvisi.push('manca «' + c + '»: il costo uscirà più basso del reale');
    });

    /* Un valore negativo non fa sbagliare il conto — il motore lo azzera — ma
       quasi sempre è una battitura, e tacerla non aiuta nessuno. */
    noti.forEach(function (c) {
      if (presente(i, c) && typeof i[c] !== 'string' && num(i[c]) < 0) {
        avvisi.push('«' + c + '» è negativo (' + i[c] + '): trattato come zero');
      }
    });

    if (presente(i, 'failureRate') && num(i.failureRate) >= 90) {
      problemi.push('failureRate ' + num(i.failureRate) + '%: oltre il 90% il conto non ha più senso');
    }
    if (presente(i, 'qty') && num(i.qty) < 1) {
      avvisi.push('quantità ' + i.qty + ': trattata come 1');
    }
    /* Campi che nessun profilo legge: quasi sempre un nome sbagliato, e un
       numero scritto in un campo che nessuno guarda non protesta da solo. */
    var conosciuti = {};
    noti.concat(['tecnologia', 'technology', 'extras', 'scaglioni', 'fonti']).forEach(function (c) { conosciuti[c] = 1; });
    Object.keys(i).forEach(function (k) {
      if (k.charAt(0) !== '_' && !conosciuti[k]) avvisi.push('campo «' + k + '» ignorato: nessun profilo lo legge');
    });

    /* Lo stato di ogni campo, non solo l'elenco di quelli mancanti: chi disegna
       una schermata deve poter mettere un contrassegno accanto al campo
       giusto, e per farlo gli serve sapere *perché*. */
    var fields = {};
    noti.forEach(function (c) {
      var stato;
      if (!presente(i, c)) stato = 'missing';
      else if (typeof i[c] !== 'string' && num(i[c]) < 0) stato = 'negative';
      else if ((i.fonti || {})[c] === 'default') stato = 'defaulted';
      else if ((i.fonti || {})[c] === 'stima') stato = 'estimated';
      else stato = 'ok';
      fields[c] = { stato: stato, valore: presente(i, c) ? i[c] : null, fonte: fonteDi(i, c) };
    });

    return {
      /* Contratto richiesto. */
      valid: problemi.length === 0,
      errors: problemi,
      warnings: avvisi,
      fields: fields,
      /* Nomi storici, conservati per chi li legge già. */
      ok: problemi.length === 0, problemi: problemi, avvisi: avvisi, mancanti: mancanti,
    };
  }

  /* ── Avvisi ───────────────────────────────────────────────────────────────
     Un preventivo può essere aritmeticamente giusto e commercialmente
     sbagliato. Questi controlli guardano il risultato, non l'input: un margine
     del 3% è un numero valido e un problema serio, e una spedizione che costa
     più del profitto è un ordine che conviene rifiutare.

     Tre livelli, perché bloccare tutto sarebbe come non avvisare di niente:
       INFO      · da sapere
       WARNING   · da guardare prima di inviare
       CRITICAL  · da non inviare così
     Nessuno di questi impedisce di calcolare. */
  function avvisi(costo, prezzoCalcolato, input) {
    var i = input || {};
    var lista = [];
    var agg = function (livello, id, testo, azione) {
      lista.push({ livello: livello, id: id, messaggio: testo, azione: azione || null });
    };

    var val = validateInput(i);
    val.errors.forEach(function (e) { agg('CRITICAL', 'input', e, 'correggi il dato prima di preventivare'); });

    /* Dati mancanti che spostano il costo verso il basso: il preventivo esce
       più economico del vero, ed è il modo più comune di perdere soldi. */
    var PESANTI = {
      materialPricePerKg: 'il costo del materiale', sheetPrice: 'il prezzo del foglio',
      blankPrice: 'il costo del supporto', laborPerHour: 'il costo della manodopera',
      machinePrice: 'il prezzo della macchina', machineLifeHours: 'la vita utile della macchina',
      kwhPrice: 'il prezzo dell\'energia',
    };
    /* Solo i campi che **questo** profilo legge davvero. Avvisare che manca il
       prezzo della macchina a chi porta già il costo macchina calcolato — è il
       caso del profilo generico — è un falso allarme, e i falsi allarmi sono
       il modo più rapido per far ignorare anche quelli veri. */
    var tecnologia = String(i.tecnologia || i.technology || '');
    var letti = {};
    var comuni = CAMPI.comuni;
    if (tecnologia === 'generico' && !pos(i.hours)) {
      /* Senza ore dichiarate il generico non tocca macchina, energia e
         manutenzione: chiedergliele sarebbe chiedere un dato che non userebbe. */
      comuni = comuni.filter(function (c) {
        return ['machinePrice', 'residualValue', 'machineLifeHours', 'watt', 'kwhPrice', 'dutyCycle', 'maintenancePerHour', 'laborPerHour'].indexOf(c) < 0;
      });
    }
    comuni.concat(CAMPI[tecnologia] || []).forEach(function (c) { letti[c] = true; });

    Object.keys(PESANTI).forEach(function (c) {
      if (!letti[c]) return;
      if ((val.fields[c] || {}).stato === 'missing') {
        agg('WARNING', 'manca:' + c, 'Manca ' + PESANTI[c] + ': il costo esce più basso del reale', 'inseriscilo nelle impostazioni');
      }
    });

    if ((val.fields.failureRate || {}).stato === 'missing') {
      agg('INFO', 'scarto', 'Tasso di scarto non configurato: i pezzi da rifare non sono nel conto', 'impostalo dai costi fissi');
    }

    if (prezzoCalcolato) {
      var p = prezzoCalcolato;
      if (p.inPerdita) {
        agg('CRITICAL', 'perdita', 'Questo prezzo è in perdita: il profitto operativo è ' + p.profittoOperativo.toFixed(2) + ' €', 'alza il prezzo o riduci lo sconto');
      } else if (p.marginePct < MARGINE_MINIMO) {
        agg('WARNING', 'margine-basso', 'Margine ' + p.marginePct.toFixed(1) + '%: sotto il minimo consigliato del ' + MARGINE_MINIMO + '%', 'rivedi lo sconto');
      }
      if (p.pavimentoScattato) {
        agg('INFO', 'pavimento', 'Lo sconto richiesto è stato ridotto per non scendere sotto il margine minimo', null);
      }
      if (p.spedizioneCosto > 0 && p.spedizioneCosto > p.profittoLordo) {
        agg('WARNING', 'spedizione', 'La spedizione (' + p.spedizioneCosto.toFixed(2) + ' €) costa più del profitto lordo', 'addebitala al cliente o rivedi il prezzo');
      }
      if (p.margineSpedizione < 0) {
        agg('INFO', 'spedizione-sotto', 'Si addebitano ' + p.spedizioneAddebitata.toFixed(2) + ' € di spedizione e se ne spendono ' + p.spedizioneCosto.toFixed(2) + ' €', null);
      }
      if (p.lordo > 0 && p.commissioni / p.lordo > 0.15) {
        agg('WARNING', 'commissioni', 'Le commissioni sono il ' + (p.commissioni / p.lordo * 100).toFixed(1) + '% dell\'incassato', 'valuta un canale diverso');
      }
    }

    var stimati = Object.keys(val.fields).filter(function (c) {
      return val.fields[c].stato === 'estimated' || val.fields[c].stato === 'defaulted';
    });
    if (stimati.length) {
      agg('INFO', 'stimati', stimati.length + ' valori sono stimati o di ripiego: ' + stimati.slice(0, 4).join(', '), 'attiva l\'audit costo per vederli');
    }

    return lista;
  }

  /* ── Leggere un margine da numeri già noti ───────────────────────────────
     Non è impostare un prezzo: è dire che margine ha un prezzo che esiste già.
     Serviva comunque un posto solo, perché l'audit ha trovato venti punti che
     lo calcolano e non tutti allo stesso modo — alcuni dividono per il ricavo
     (margine), altri per il costo (ricarico), ed entrambi finiscono a schermo
     con lo stesso simbolo di percentuale. È la stessa confusione che faceva
     credere di guadagnare il 40% guadagnando il 28,6%. */
  function margineDi(prezzo, costo) {
    var p = pos(prezzo);
    return p > 0 ? ((p - pos(costo)) / p) * 100 : null;
  }

  function ricaricoDi(prezzo, costo) {
    var c = pos(costo);
    return c > 0 ? ((pos(prezzo) - c) / c) * 100 : null;
  }

  /** Il prezzo secondo ognuna delle politiche, per confrontarli a colpo d'occhio. */
  function consigli(costo, opzioni) {
    var o = opzioni || {};
    return Object.keys(POLITICHE).map(function (k) {
      var pol = POLITICHE[k];
      var p = prezzo(costo, Object.assign({}, o, {
        strategia: 'margine', marginePct: pol.marginTarget,
        marginePavimentoPct: pol.floorMargin,
      }));
      return {
        id: pol.id, label: pol.label, recommended: pol.recommended,
        price: p.netto, lordo: p.lordo,
        margin: p.marginePct, markup: p.ricaricoPct,
        profit: p.profittoLordo, profitOperating: p.profittoOperativo,
        maxDiscount: pol.maxDiscount, floorMargin: pol.floorMargin,
        reason: pol.recommended
          ? 'Il posizionamento predefinito: copre i costi con un margine che regge uno sconto del ' + pol.maxDiscount + '%'
          : 'Margine obiettivo ' + pol.marginTarget + '%, sconto massimo ' + pol.maxDiscount + '%',
      };
    });
  }

  /**
   * Da dove arriva il prezzo, riga per riga. Ogni voce porta la formula in
   * chiaro, i valori che ci sono entrati e il risultato — così chi preventiva
   * può difendere il numero davanti al cliente invece di fidarsi.
   */
  function explain(input, opzioniPrezzo) {
    var i = input || {};
    var c = calcola(i);
    if (c.vuoto) return { vuoto: true, motivo: c.motivo, voci: [] };

    var tec = c.tecnologia;
    var p = prezzo(c.costoPezzo, opzioniPrezzo);
    var righe = [];

    c.unaTantum.voci.forEach(function (v) {
      righe.push({
        gruppo: 'una tantum', id: v.id, label: v.label,
        formula: v.id === 'setup' ? 'minuti ÷ 60 × tariffa oraria' : 'valore dichiarato',
        input: v.detail, result: v.value,
        fonte: fonteDi(i, v.id === 'setup' ? 'setupMin' : v.id),
      });
    });

    if (c.unaTantum.totale > 0) {
      righe.push({
        gruppo: 'una tantum', id: 'unaTantumPerPezzo', label: 'Una tantum per pezzo',
        formula: 'totale una tantum ÷ quantità',
        input: c.unaTantum.totale.toFixed(2) + ' € ÷ ' + c.qty,
        result: c.unaTantum.perPezzo, fonte: 'calcolato',
      });
    }

    c.perPezzo.voci.forEach(function (v) {
      var formula = 'valore dichiarato';
      var fonte = 'inserito';
      if (v.id === 'energia') { formula = 'W ÷ 1000 × ore × €/kWh × ciclo di lavoro'; fonte = fonteDi(i, 'kwhPrice'); }
      else if (v.id === 'macchina') { formula = '(prezzo − residuo) ÷ vita utile × ore'; fonte = fonteDi(i, 'machinePrice'); }
      else if (v.id === 'manutenzione') { formula = '€/h di manutenzione × ore'; fonte = fonteDi(i, 'maintenancePerHour'); }
      else if (v.id === 'scarto') { formula = 'perdibile × tasso ÷ (1 − tasso)'; fonte = fonteDi(i, 'failureRate'); }
      else if (v.id === 'materiale' && tec === 'print3d') { formula = '(grammi + supporti + spurgo) ÷ 1000 × €/kg'; fonte = fonteDi(i, 'materialPricePerKg'); }
      else if (v.id === 'materiale' && tec === 'laser') { formula = 'prezzo foglio ÷ pezzi per foglio'; fonte = fonteDi(i, 'sheetPrice'); }
      else if (v.id === 'film') { formula = 'm² di film consumati × €/m²'; fonte = fonteDi(i, 'filmPricePerM2'); }
      else if (v.id === 'inchiostro') { formula = 'm² × ml/m² × €/ml'; fonte = fonteDi(i, 'inkPricePerMl'); }
      righe.push({ gruppo: 'per pezzo', id: v.id, label: v.label, formula: formula, input: v.detail, result: v.value, fonte: fonte });
    });

    if (c.overhead > 0) {
      righe.push({ gruppo: 'per pezzo', id: 'overhead', label: 'Spese generali',
        formula: 'costo diretto × percentuale', input: num(i.overheadPct) + '%', result: c.overhead, fonte: fonteDi(i, 'overheadPct') });
    }

    righe.push({ gruppo: 'costo', id: 'costoPezzo', label: 'Costo reale per pezzo',
      formula: 'per pezzo + una tantum ÷ quantità + spese generali',
      input: c.qty + ' pezzi', result: c.costoPezzo, fonte: 'calcolato' });

    var formulaPrezzo = {
      margine: 'costo ÷ (1 − margine)',
      ricarico: 'costo × ricarico',
      fisso: 'prezzo dichiarato',
      competitivo: 'prezzo di mercato × (1 − scarto sotto mercato)',
      premium: 'prezzo di mercato × (1 + sovrapprezzo)',
    }[p.strategia];

    righe.push({ gruppo: 'prezzo', id: 'netto', label: 'Prezzo netto', formula: formulaPrezzo,
      input: 'strategia «' + p.strategia + '»', result: p.netto, fonte: 'scelta commerciale' });
    if (p.pavimentoScattato) {
      righe.push({ gruppo: 'prezzo', id: 'pavimento', label: 'Pavimento di margine applicato',
        formula: 'costo ÷ (1 − margine minimo)', input: 'lo sconto avrebbe portato sotto la soglia',
        result: p.pavimento, fonte: 'protezione' });
    }
    righe.push({ gruppo: 'prezzo', id: 'iva', label: 'IVA', formula: 'netto × aliquota',
      input: p.ivaPct + '%', result: p.iva, fonte: 'normativa' });
    righe.push({ gruppo: 'prezzo', id: 'lordo', label: 'Prezzo al cliente', formula: 'netto + IVA',
      input: '', result: p.lordo, fonte: 'calcolato' });

    righe.push({ gruppo: 'profitto', id: 'profittoLordo', label: 'Profitto lordo',
      formula: 'prezzo netto − costo', input: '', result: p.profittoLordo, fonte: 'calcolato' });
    if (p.commissioni > 0) {
      righe.push({ gruppo: 'profitto', id: 'dopoCommissioni', label: 'Dopo le commissioni',
        formula: 'profitto lordo − commissioni di canale', input: p.commissioni.toFixed(2) + ' €',
        result: p.profittoDopoCommissioni, fonte: 'calcolato' });
    }
    if (p.spedizione > 0) {
      righe.push({ gruppo: 'profitto', id: 'dopoSpedizione', label: 'Dopo la spedizione',
        formula: 'profitto − spedizione a carico del laboratorio', input: p.spedizione.toFixed(2) + ' €',
        result: p.profittoDopoSpedizione, fonte: 'calcolato' });
    }
    righe.push({ gruppo: 'profitto', id: 'operativo', label: 'Profitto operativo',
      formula: 'netto − costo − commissioni − spedizione − altri variabili',
      input: 'l\'IVA non entra mai in questo conto', result: p.profittoOperativo, fonte: 'calcolato' });

    var val = validateInput(i);

    return {
      vuoto: false, versione: VERSIONE, tecnologia: tec,

      /* Contratto richiesto: input, ipotesi, righe, formule, totali, prezzo
         e avvisi — tutto ciò che serve per difendere un numero. */
      input: i,
      assumptions: Object.keys(val.fields)
        .filter(function (k) { return val.fields[k].stato !== 'ok'; })
        .map(function (k) { return { field: k, stato: val.fields[k].stato, fonte: val.fields[k].fonte }; }),
      lines: righe,
      formulas: righe.map(function (r) { return { id: r.id, label: r.label, formula: r.formula }; }),
      totals: {
        unaTantum: c.unaTantum.totale,
        unaTantumPerPezzo: c.unaTantum.perPezzo,
        perPezzo: c.perPezzo.totale,
        overhead: c.overhead,
        costoPezzo: c.costoPezzo,
        costoTotale: c.costoTotale,
        qty: c.qty,
      },
      pricing: p,
      warnings: avvisi(c.costoPezzo, p, i),
      recommendations: consigli(c.costoPezzo, opzioniPrezzo),

      /* Nomi storici. */
      voci: righe, costo: c, prezzo: p, validazione: val,
    };
  }

  /* ── Calibrazione ──────────────────────────────────────────────────────────
     Confrontare il proprio conto con quello di uno slicer è utile, e quasi
     sempre finisce male: i due numeri rispondono a domande diverse, e chi non
     lo sa conclude che il preventivatore sbaglia.

     Questa funzione non aggiusta niente. Prende un riferimento esterno, lo
     confronta con ognuno dei tre livelli, e dice **quale livello gli
     corrisponde** e cosa contiene in più ciascuno degli altri.

     Non esiste, e non esisterà, un fattore di calibrazione: un numero
     inventato per far coincidere due conti nasconde la differenza invece di
     spiegarla, ed è il modo più efficace di non capire mai perché.

     @param {Object} ingresso   gli stessi dati che si darebbero a `calcola`
     @param {Object} riferimento { costo, sistema, cosaInclude }
  */
  function calibra(ingresso, riferimento) {
    var rif = riferimento || {};
    var costoRif = pos(rif.costo);
    if (!(costoRif > 0)) return { confrontabile: false, motivo: 'nessun costo di riferimento' };

    var livelli = Object.keys(LIVELLI).map(function (k) {
      var r = calcola(Object.assign({}, ingresso, { livelloCosto: k }));
      if (r.vuoto) return null;
      return {
        id: k, label: LIVELLI[k].label, spiega: LIVELLI[k].spiega,
        costo: r.costoPezzo,
        delta: r.costoPezzo - costoRif,
        deltaPct: costoRif > 0 ? ((r.costoPezzo - costoRif) / costoRif) * 100 : null,
        voci: r.perPezzo.voci.map(function (v) { return { id: v.id, label: v.label, value: v.value }; })
          .concat(r.unaTantum.perPezzo > 0 ? [{ id: 'setup', label: 'Avviamento ripartito', value: r.unaTantum.perPezzo }] : [])
          .concat(r.overhead > 0 ? [{ id: 'overhead', label: 'Spese generali', value: r.overhead }] : []),
      };
    }).filter(Boolean);

    /* Il livello più vicino non è «quello giusto»: è quello che risponde alla
       stessa domanda del riferimento. Dirlo è tutto il punto. */
    var vicino = livelli.slice().sort(function (a, b) { return Math.abs(a.delta) - Math.abs(b.delta); })[0];

    /* Quale singola voce spiega lo scarto residuo, se ce n'è una sola che
       basta: è la domanda che si fa davvero guardando due numeri diversi. */
    var residuo = vicino ? vicino.delta : 0;
    var spiegaResiduo = null;
    if (vicino && Math.abs(residuo) > 0.005) {
      var candidate = vicino.voci.filter(function (v) { return Math.abs(v.value - Math.abs(residuo)) < 0.02; });
      if (candidate.length === 1) spiegaResiduo = candidate[0];
    }

    return {
      confrontabile: true,
      riferimento: { costo: costoRif, sistema: rif.sistema || 'esterno', cosaInclude: rif.cosaInclude || null },
      livelli: livelli,
      corrispondente: vicino,
      residuo: residuo,
      residuoPct: costoRif > 0 ? (residuo / costoRif) * 100 : null,
      spiegaResiduo: spiegaResiduo,
      /* Un riferimento più basso del costo di stampa significa che i due
         numeri non parlano nemmeno della stessa cosa: quasi sempre il prezzo
         del materiale è diverso. */
      materialeImplicito: pos(ingresso && ingresso.grams) > 0
        ? (costoRif / (pos(ingresso.grams) / 1000)) : null,
    };
  }

  global.InglyCostEngine = {
    version: VERSIONE,
    POLITICHE: POLITICHE,
    MARGINE_MINIMO: MARGINE_MINIMO,
    avvisi: avvisi,
    consigli: consigli,
    margineDi: margineDi,
    ricaricoDi: ricaricoDi,
    CAMPI: CAMPI,
    validateInput: validateInput,
    explain: explain,
    PROFILI: PROFILI,
    STRATEGIE: STRATEGIE,
    SCAGLIONI: SCAGLIONI,
    LIVELLI: LIVELLI,
    LIVELLO_PREDEFINITO: LIVELLO_PREDEFINITO,
    tecnologie: function () { return Object.keys(PROFILI); },
    calibra: calibra,
    calcola: calcola,
    prezzo: prezzo,
    scaglioni: scaglioni,
    preventiva: preventiva,
  };
})(typeof window !== 'undefined' ? window : globalThis);

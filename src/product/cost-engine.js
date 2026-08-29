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

  var VERSIONE = '1.1.0';

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
    /* La spedizione pesa solo se la paga il laboratorio. Se è addebitata al
       cliente non è un costo: è un ricavo che entra e esce. */
    var spedizione = o.spedizioneAddebitata ? 0 : pos(o.spedizione);
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
      spedizione: spedizione,
      spedizioneAddebitata: !!o.spedizioneAddebitata,
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
      'packagingPerUnit', 'overheadPct'],
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
    generico: ['costiPerPezzo', 'costiUnaTantum', 'hours'],
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

    return { ok: problemi.length === 0, problemi: problemi, avvisi: avvisi, mancanti: mancanti };
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

    return {
      vuoto: false, versione: VERSIONE, tecnologia: tec,
      voci: righe, costo: c, prezzo: p,
      validazione: validateInput(i),
    };
  }

  global.InglyCostEngine = {
    version: VERSIONE,
    CAMPI: CAMPI,
    validateInput: validateInput,
    explain: explain,
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

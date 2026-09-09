/* ═══════════════════════════════════════════════════════════════════════════
   TARIFFA MACCHINA — quanto costa un'ora di macchina, e perché
   ═══════════════════════════════════════════════════════════════════════════

   Il motore calcolava il costo orario così:

       (prezzo − valore residuo) / ore di vita utile

   È corretto, e per una stampante da 420 € dichiarata a 3000 ore dà 0,14 €/h:
   su una stampa di nove ore fa € 1,26, che non è il problema di nessuno.

   Diventa il problema di tutti quando i due numeri sono sbagliati insieme.
   Una macchina da 5000 € dichiarata a 500 ore dà **10 €/h**: la stessa stampa
   di nove ore porta 90 € di sola macchina, e il preventivo esce fuori mercato
   senza che niente lo segnali. Non è un errore di formula — è una formula che
   non ha idea di quando i suoi ingressi sono assurdi.

   ── Tre modalità, dichiarate ──────────────────────────────────────────────

   · `manuale`       — la tariffa la scrive chi la conosce. Chi ha già un
                       costo orario di reparto non deve farselo ricalcolare.
   · `ammortamento`  — solo il recupero dell'investimento: prezzo ÷ ore.
   · `ibrido`        — ammortamento **più** la manutenzione ripartita sulle ore
                       che si lavorano davvero in un anno. È il predefinito,
                       perché una macchina costa anche quando non si rompe.

   ── Il tetto di ragionevolezza ────────────────────────────────────────────

   `maxRagionevole` non è un limite arbitrario: è la domanda «una macchina di
   questa categoria può davvero costare così tanto all'ora?». Quando la
   risposta è no, la tariffa **non viene abbassata in silenzio** — si applica
   il tetto e si dichiara, con il numero originale accanto, perché il rimedio
   vero non è un prezzo più basso ma un dato corretto: quasi sempre sono le
   ore di vita utile, dichiarate a occhio e troppo poche.

   Alzare il tetto è legittimo: una macchina industriale costa quello che
   costa. Ma va fatto scrivendolo, non lasciando che un valore fuori scala
   passi inosservato.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d == null ? 0 : d); };
  var pos = function (v, d) { return Math.max(0, num(v, d)); };

  var MODI = {
    manuale: {
      id: 'manuale', label: 'Tariffa dichiarata',
      spiega: 'La tariffa oraria la scrivi tu. Ammortamento e manutenzione non vengono ricalcolati.',
    },
    ammortamento: {
      id: 'ammortamento', label: 'Solo ammortamento',
      spiega: 'Recupero dell\'investimento sulle ore di vita utile. Non comprende la manutenzione.',
    },
    ibrido: {
      id: 'ibrido', label: 'Ammortamento + manutenzione',
      spiega: 'Recupero dell\'investimento più la manutenzione annua ripartita sulle ore lavorate.',
    },
  };
  var MODO_PREDEFINITO = 'ibrido';

  /* ── I tetti ──────────────────────────────────────────────────────────────
     Uno per categoria, perché una stampante da scrivania e un laser a fibra
     non hanno lo stesso ordine di grandezza. Sono soglie di **allarme**, non
     prezzi: dicono «questo numero merita un secondo sguardo», non «questo
     numero è vietato».

     Ricavati dal costo di macchine reali diviso per una vita utile onesta —
     una stampante FDM da 1500 € su 3000 ore fa 0,50 €/h, e 3 €/h vuol dire
     che qualcosa nei due numeri non torna. Non sono prezzi di mercato e non
     pretendono di esserlo: sono il confine oltre il quale conviene guardare
     i dati invece del risultato. */
  var TETTI = {
    print3d: 3,
    laser: 12,
    uv: 20,
    dtf: 15,
    sublimation: 8,
    cnc: 25,
    generico: 15,
  };
  var TETTO_PREDEFINITO = 15;

  function tettoDi(categoria) {
    var k = String(categoria || '').toLowerCase();
    return TETTI[k] != null ? TETTI[k] : TETTO_PREDEFINITO;
  }

  /**
   * @param m macchina: purchasePrice, residualValue, expectedLifeHours,
   *          annualMaintenance, expectedAnnualHours, machineHourlyRate,
   *          machineRateMode, maxRagionevole, categoria
   * @returns { euroOra, modo, componenti, avvisi, confidence, tettoScattato }
   */
  function tariffa(m) {
    var o = m || {};
    var modo = MODI[o.machineRateMode] ? o.machineRateMode : MODO_PREDEFINITO;
    var avvisi = [];

    var prezzo = pos(o.purchasePrice != null ? o.purchasePrice : o.machinePrice);
    var residuo = pos(o.residualValue);
    var vita = pos(o.expectedLifeHours != null ? o.expectedLifeHours : o.machineLifeHours);
    var manutAnnua = pos(o.annualMaintenance);
    var oreAnnue = pos(o.expectedAnnualHours);

    var ammortamento = 0;
    var manutenzione = 0;

    if (modo === 'manuale') {
      var dichiarata = pos(o.machineHourlyRate);
      if (!(dichiarata > 0)) {
        avvisi.push('Modalità «tariffa dichiarata» senza tariffa: la macchina non entra nel costo');
        return esito(0, modo, { ammortamento: 0, manutenzione: 0, dichiarata: 0 }, avvisi, 'missing', false, null);
      }
      return esito(dichiarata, modo, { ammortamento: 0, manutenzione: 0, dichiarata: dichiarata },
        avvisi, 'declared', false, null);
    }

    /* Ammortamento. Senza uno dei due numeri non si inventa: si dichiara che
       la macchina non sta entrando nel conto, che è diverso da «costa zero». */
    if (prezzo > 0 && vita > 0) {
      ammortamento = Math.max(0, prezzo - residuo) / vita;
    } else if (prezzo > 0 && !(vita > 0)) {
      avvisi.push('Ore di vita utile non dichiarate: l\'ammortamento non è calcolabile');
    } else if (!(prezzo > 0)) {
      avvisi.push('Prezzo d\'acquisto non dichiarato: l\'ammortamento non è calcolabile');
    }

    if (modo === 'ibrido') {
      if (manutAnnua > 0 && oreAnnue > 0) {
        manutenzione = manutAnnua / oreAnnue;
      } else if (manutAnnua > 0) {
        avvisi.push('Ore lavorate all\'anno non dichiarate: la manutenzione non è ripartibile');
      }
      /* `maintenancePerHour` è la forma che il motore già conosce: se c'è, e
         non si è potuta calcolare, la si usa invece di perderla. */
      if (!(manutenzione > 0) && pos(o.maintenancePerHour) > 0) {
        manutenzione = pos(o.maintenancePerHour);
      }
    }

    var grezza = ammortamento + manutenzione;

    /* ── Il tetto ──────────────────────────────────────────────────────── */
    var tetto = o.maxRagionevole != null ? pos(o.maxRagionevole) : tettoDi(o.categoria || o.tecnologia);
    var scattato = false;
    var euroOra = grezza;
    if (tetto > 0 && grezza > tetto) {
      euroOra = tetto;
      scattato = true;
      avvisi.push('Tariffa macchina fuori scala: ' + arrotonda(grezza) + ' €/h su una soglia di '
        + arrotonda(tetto) + ' €/h. Applicata la soglia. Controlla le ore di vita utile — '
        + (vita > 0 ? vita + ' ore dichiarate' : 'non dichiarate')
        + ' su un prezzo di ' + arrotonda(prezzo) + ' €.');
    }

    var confidenza = grezza > 0
      ? (prezzo > 0 && vita > 0 ? 'declared' : 'estimated')
      : 'missing';

    return esito(euroOra, modo,
      { ammortamento: ammortamento, manutenzione: manutenzione, dichiarata: 0 },
      avvisi, confidenza, scattato, scattato ? grezza : null);
  }

  function arrotonda(v) { return Math.round(num(v) * 100) / 100; }

  function esito(euroOra, modo, componenti, avvisi, confidence, tettoScattato, grezza) {
    return {
      euroOra: arrotonda(euroOra),
      modo: modo,
      modoLabel: (MODI[modo] || {}).label || modo,
      componenti: {
        ammortamento: arrotonda(componenti.ammortamento),
        manutenzione: arrotonda(componenti.manutenzione),
        dichiarata: arrotonda(componenti.dichiarata),
      },
      avvisi: avvisi,
      confidence: confidence,
      tettoScattato: !!tettoScattato,
      euroOraGrezza: grezza != null ? arrotonda(grezza) : null,
    };
  }

  /** Il costo macchina di un lavoro: la tariffa per le ore. Separato dalla
      tariffa perché la tariffa è della macchina e le ore sono del lavoro. */
  function costoLavoro(m, ore) {
    var t = tariffa(m);
    return {
      euroOra: t.euroOra,
      ore: pos(ore),
      costo: arrotonda(t.euroOra * pos(ore)),
      modo: t.modo,
      avvisi: t.avvisi,
      confidence: t.confidence,
      tettoScattato: t.tettoScattato,
    };
  }

  global.InglyMachineRate = {
    VERSIONE: VERSIONE,
    MODI: MODI,
    MODO_PREDEFINITO: MODO_PREDEFINITO,
    TETTI: TETTI,
    TETTO_PREDEFINITO: TETTO_PREDEFINITO,
    tettoDi: tettoDi,
    tariffa: tariffa,
    costoLavoro: costoLavoro,
  };
})(typeof window !== 'undefined' ? window : globalThis);

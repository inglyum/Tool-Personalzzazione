/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · COSTO DI UNA STAMPA 3D
   ═══════════════════════════════════════════════════════════════════════════

   Il calcolatore storico sommava quattro voci: materiale, energia,
   ammortamento, manodopera. Sono le quattro che si vedono. Il conto di fine
   mese non torna per le altre.

   Cosa mancava, e perché conta
   ────────────────────────────
   · **Le stampe che falliscono.** Su FDM il 5–10 % dei lavori si stacca, si
     deforma o esce sbagliato; su resina capita di più. Quel materiale e quelle
     ore sono già spesi. Chi non li mette nel costo lavora al di sotto del
     proprio prezzo e non capisce perché.
   · **I supporti.** Finiscono nel cestino ma si pagano al chilo come il pezzo.
   · **La manutenzione.** Ugelli, piatti, cinghie, film FEP, alcool, guanti,
     filtri. Non è ammortamento della macchina: è consumo per ora di lavoro.
   · **Il post-processo della resina.** Lavaggio e polimerizzazione sono tempo
     macchina più alcool: una stampa in resina non è finita quando la stampante
     si ferma.
   · **Il setup si paga una volta.** Preparare il file e la macchina costa
     uguale che si stampi un pezzo o venti: dividerlo per la quantità è la
     differenza fra un prezzo giusto su dieci pezzi e uno fuori mercato.

   Perché è una funzione pura
   ──────────────────────────
   `LaserCalcV2`, `CalcMacchine` e il vecchio `Print3DQuoter` leggono i valori
   dagli `id` dei campi nel DOM: non si possono invocare da codice, non si
   possono provare senza aprire una finestra, e il Product Builder non può
   usarli. Qui il calcolo non sa che esiste una pagina. L'interfaccia gli passa
   dei numeri e ne riceve altri.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var num = function (v, d) {
    var n = parseFloat(v);
    return isFinite(n) ? n : (d || 0);
  };

  /* Grandezze fisiche e prezzi non possono essere negativi. Un campo con un
     meno davanti — per un errore di battitura o un incolla sbagliato — non
     deve produrre un costo che si sottrae agli altri: un preventivo con un
     costo negativo è peggio di un preventivo mancante, perché sembra valido. */
  var pos = function (v, d) { return Math.max(0, num(v, d)); };

  /* Densità tipiche, per ricavare i grammi dal volume che lo slicer già mostra.
     Sono valori di scheda tecnica, non stime: PLA 1,24 · PETG 1,27 · ABS 1,04
     · ASA 1,07 · TPU 1,21 · Nylon 1,14 · resina standard 1,10 g/cm³. */
  var DENSITA = {
    pla: 1.24, petg: 1.27, abs: 1.04, asa: 1.07, tpu: 1.21,
    nylon: 1.14, resina: 1.10, resin: 1.10,
  };

  /**
   * Costo pieno di una stampa. Tutti gli importi in euro, i tempi in ore o
   * minuti come indicato. Nessun campo è obbligatorio: quello che manca vale
   * zero e la voce corrispondente non compare.
   */
  /* ── Adapter, non motore ──────────────────────────────────────────────────
     Questa funzione non calcola più: traduce. Prende l'input storico del
     calcolatore 3D, lo passa a `InglyCostEngine` con il profilo `print3d`, e
     riporta il risultato nella forma che il quoter e le sue schermate si
     aspettano da sempre.

     La differenza è invisibile dall'esterno e sostanziale dentro: la matematica
     dei prezzi vive in un posto solo. Se domani la formula dell'ammortamento
     cambia, cambia per il 3D, per il laser e per il tessile insieme — invece
     di cambiare in uno dei tre e restare vecchia negli altri, che è
     esattamente come sono nati i difetti che questo progetto ha misurato.

     Due nomi cambiano nel tragitto e vanno ritradotti indietro:
       · il motore chiama `macchina` ciò che qui si chiama `ammortamento`;
       · il motore tiene l'avviamento fra i costi una tantum e la finitura fra
         quelli per pezzo, mentre qui erano sommati in `manodopera`.
     La somma è identica: il test di equivalenza lo verifica su 200 casi. */
  function cost(input) {
    var i = input || {};
    var motore = global.InglyCostEngine;
    if (!motore) {
      /* Senza il motore non si indovina un prezzo: si dice che non c'è. Un
         preventivo sbagliato è peggio di un preventivo mancante. */
      return { empty: true, motivo: 'InglyCostEngine non disponibile', voci: [], costo: 0,
        strategie: [], grammi: 0, quantita: 1, costoOrarioMacchina: 0,
        prezzoDaMargine: function () { return 0; },
        prezzoDaRicarico: function () { return 0; },
        margineDi: function () { return 0; } };
    }

    var qty = Math.max(1, num(i.qty, 1));
    var c = motore.calcola({
      tecnologia: 'print3d',
      qty: qty,
      grams: i.grams, volumeCm3: i.volumeCm3, density: i.density, material: i.material,
      supportGrams: i.supportGrams, purgeGrams: i.purgeGrams,
      materialPricePerKg: i.materialPricePerKg, spoolPrice: i.spoolPrice, spoolGrams: i.spoolGrams,
      hours: i.hours, watt: i.watt, kwhPrice: i.kwhPrice, dutyCycle: i.dutyCycle,
      machinePrice: i.machinePrice, residualValue: i.residualValue, machineLifeHours: i.machineLifeHours,
      maintenancePerHour: i.maintenancePerHour,
      washCureMin: i.washCureMin, consumablesPerPrint: i.consumablesPerPrint,
      setupMin: i.setupMin, finishMin: i.finishMin, laborPerHour: i.laborPerHour,
      packagingPerUnit: i.packagingPerUnit, failureRate: i.failureRate,
      extras: i.extras,
    });

    var totale = c.costoPezzo;
    var trova = function (id) {
      var v = c.perPezzo.voci.filter(function (x) { return x.id === id; })[0];
      return v ? v.value : 0;
    };
    var dettaglio = function (id) {
      var v = c.perPezzo.voci.filter(function (x) { return x.id === id; })[0];
      return v ? v.detail : '';
    };

    /* Manodopera storica = avviamento diviso per la quantità + finitura. */
    var manodopera = c.unaTantum.perPezzo + trova('finitura');

    var voci = [
      { id: 'materiale', label: 'Materiale', value: trova('materiale'), detail: dettaglio('materiale') },
      { id: 'energia', label: 'Energia', value: trova('energia'), detail: dettaglio('energia') },
      { id: 'ammortamento', label: 'Ammortamento macchina', value: trova('macchina'), detail: dettaglio('macchina') },
      { id: 'manutenzione', label: 'Manutenzione e consumabili', value: trova('manutenzione'), detail: dettaglio('manutenzione') },
      { id: 'postProcesso', label: 'Post-processo', value: trova('postProcesso'), detail: dettaglio('postProcesso') },
      { id: 'manodopera', label: 'Manodopera', value: manodopera,
        detail: qty > 1 ? 'setup ' + num(i.setupMin) + ' min diviso per ' + qty + ' pezzi' : num(i.setupMin) + ' min di setup' },
      { id: 'scarto', label: 'Scarto previsto', value: trova('scarto'), detail: dettaglio('scarto') },
      { id: 'packaging', label: 'Packaging', value: trova('packaging'), detail: 'per pezzo' },
      { id: 'extra', label: 'Extra', value: trova('extra'), detail: (i.extras || []).length + ' voci' },
    ].filter(function (v) { return v.value > 0.0000001; });

    var iva = Math.max(0, num(i.vatRate, 22)) / 100;

    /* Quattro posizionamenti, non quattro numeri a caso: sono i margini con cui
       un laboratorio decide se sta rincorrendo il prezzo o il valore. */
    var STRATEGIE = [
      { id: 'competitive', label: 'Competitivo', margine: num(i.marginCompetitive, 25) },
      { id: 'standard',    label: 'Standard',    margine: num(i.marginStandard, 40) },
      { id: 'premium',     label: 'Premium',     margine: num(i.marginPremium, 55) },
      { id: 'luxury',      label: 'Luxury',      margine: num(i.marginLuxury, 70) },
    ];

    /* Anche il prezzo passa dal motore: il pavimento di margine e la
       distinzione fra margine e ricarico stanno scritti una volta sola. */
    function daMargine(m) {
      return motore.prezzo(totale, { strategia: 'margine', marginePct: Math.max(0, Math.min(95, num(m))), ivaPct: num(i.vatRate, 22) }).netto;
    }

    var grammiTotali = 0;
    (function () {
      var g = pos(i.grams);
      if (!g && i.volumeCm3) {
        var d = num(i.density) || DENSITA[String(i.material || '').toLowerCase()] || 1.24;
        g = pos(i.volumeCm3) * Math.max(0.01, d);
      }
      grammiTotali = g + pos(i.supportGrams);
    })();

    return {
      empty: totale <= 0,
      voci: voci,
      costo: totale,
      costoOrarioMacchina: c.costoOrarioMacchina,
      grammi: grammiTotali,
      quantita: qty,

      /** Il prezzo secondo ognuna delle quattro strategie, con IVA e profitto
          già sviluppati: sono i numeri che servono per decidere, non per
          ricalcolare a mano. */
      strategie: STRATEGIE.map(function (st) {
        var p = motore.prezzo(totale, {
          strategia: 'margine', marginePct: Math.max(0, Math.min(95, num(st.margine))), ivaPct: num(i.vatRate, 22),
        });
        return {
          id: st.id, label: st.label,
          margine: st.margine,
          costo: totale,
          netto: p.netto,
          iva: p.iva,
          lordo: p.lordo,
          profitto: p.profittoLordo,
          markup: p.ricaricoPct,
          nettoTotale: p.netto * qty,
          profittoTotale: p.profittoLordo * qty,
        };
      }),

      /** Prezzo da un **margine**, non da un ricarico: 40 % di margine
          significa che 40 centesimi su ogni euro incassato restano, cioè
          prezzo = costo / (1 − 0,40). Confondere i due è il modo più comune
          per credere di guadagnare il 40 % e guadagnare il 28,6 %. */
      prezzoDaMargine: function (marginePct) {
        var m = Math.max(0, Math.min(95, num(marginePct)));
        return m >= 100 ? Infinity : daMargine(m);
      },
      /** Prezzo da un ricarico moltiplicativo, come lo usa il calcolatore storico. */
      prezzoDaRicarico: function (moltiplicatore) {
        return motore.prezzo(totale, { strategia: 'ricarico', ricarico: num(moltiplicatore, 1) }).netto;
      },
      /** Il margine effettivo di un prezzo, in percentuale. */
      margineDi: function (prezzo) {
        var p = num(prezzo);
        return p > 0 ? ((p - totale) / p) * 100 : 0;
      },
    };
  }

  global.InglyPrint3D = { cost: cost, DENSITA: DENSITA };
})(window);

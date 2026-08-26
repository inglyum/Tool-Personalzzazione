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
  function cost(input) {
    var i = input || {};
    var qty = Math.max(1, num(i.qty, 1));
    var ore = pos(i.hours);

    /* ── Materiale ────────────────────────────────────────────────────────
       Si accettano i grammi diretti oppure il volume dello slicer con la
       densità del materiale — che è il dato che si ha davvero sott'occhio. */
    var grammi = pos(i.grams);
    if (!grammi && i.volumeCm3) {
      var d = num(i.density) || DENSITA[String(i.material || '').toLowerCase()] || 1.24;
      grammi = pos(i.volumeCm3) * Math.max(0.01, d);
    }
    var supporti = pos(i.supportGrams);
    var prezzoKg = pos(i.materialPricePerKg);
    if (!prezzoKg && i.spoolPrice && i.spoolGrams) prezzoKg = (pos(i.spoolPrice) / pos(i.spoolGrams)) * 1000;
    var materiale = ((grammi + supporti) / 1000) * prezzoKg;

    /* ── Energia ──────────────────────────────────────────────────────────
       La potenza di targa non è quella assorbita: una stampante da 350 W ne
       consuma in media una frazione, perché il riscaldatore lavora a
       intermittenza. `dutyCycle` lo rappresenta, e vale 1 se non lo si dichiara. */
    var energia = (pos(i.watt) / 1000) * ore * pos(i.kwhPrice) * Math.max(0, Math.min(1, num(i.dutyCycle, 1) || 1));

    /* ── Ammortamento ─────────────────────────────────────────────────────
       Costo della macchina spalmato sulle ore di vita utile. */
    var vita = pos(i.machineLifeHours);
    /* Una macchina a fine vita non vale zero: si rivende. Si ammortizza la
       differenza, non il prezzo pieno. */
    var daAmmortizzare = Math.max(0, pos(i.machinePrice) - pos(i.residualValue));
    var costoOrarioMacchina = vita > 0 ? daAmmortizzare / vita : 0;
    var ammortamento = costoOrarioMacchina * ore;

    /* ── Manutenzione e consumabili ───────────────────────────────────────
       Ugelli, piatti, film FEP, alcool, guanti. Si consumano a ore di lavoro,
       non con l'invecchiamento della macchina: sono una voce a sé. */
    var manutenzione = pos(i.maintenancePerHour) * ore;

    /* ── Post-processo ────────────────────────────────────────────────────
       Per la resina è obbligatorio: lavaggio e polimerizzazione. Per FDM è la
       rimozione dei supporti e la carteggiatura. */
    var oreLavoro = pos(i.washCureMin) / 60;
    var postProcesso = oreLavoro * pos(i.laborPerHour) + pos(i.consumablesPerPrint);

    /* ── Manodopera ───────────────────────────────────────────────────────
       Il setup si paga una volta per lavoro, la finitura una volta per pezzo. */
    var setupPerPezzo = (pos(i.setupMin) / 60) * pos(i.laborPerHour) / qty;
    var finitura = (pos(i.finishMin) / 60) * pos(i.laborPerHour);
    var manodopera = setupPerPezzo + finitura;

    /* Scatola, pluriball, etichetta: si pagano per pezzo e finiscono nel
       prezzo di chi compra, non nella spesa generale del laboratorio. */
    var packaging = pos(i.packagingPerUnit);

    var extra = (i.extras || []).reduce(function (a, e) { return a + pos(e && e.cost); }, 0);

    /* ── Scarto ───────────────────────────────────────────────────────────
       Una stampa fallita consuma materiale, corrente, ore macchina e
       manutenzione — non la manodopera di finitura, che non è ancora stata
       fatta. Si applica solo a ciò che si perde davvero. */
    var perdibile = materiale + energia + ammortamento + manutenzione;
    var tasso = Math.max(0, Math.min(90, pos(i.failureRate))) / 100;
    var scarto = perdibile * (tasso / (1 - tasso || 1));

    var voci = [
      { id: 'materiale', label: 'Materiale', value: materiale,
        detail: Math.round(grammi + supporti) + ' g' + (supporti ? ' (di cui ' + Math.round(supporti) + ' g di supporti)' : '') },
      { id: 'energia', label: 'Energia', value: energia, detail: num(i.watt) + ' W × ' + ore.toFixed(2) + ' h' },
      { id: 'ammortamento', label: 'Ammortamento macchina', value: ammortamento, detail: vita ? vita + ' h di vita utile' : 'vita utile non indicata' },
      { id: 'manutenzione', label: 'Manutenzione e consumabili', value: manutenzione, detail: ore.toFixed(2) + ' h di lavoro' },
      { id: 'postProcesso', label: 'Post-processo', value: postProcesso, detail: num(i.washCureMin) + ' min' },
      { id: 'manodopera', label: 'Manodopera', value: manodopera,
        detail: qty > 1 ? 'setup ' + num(i.setupMin) + ' min diviso per ' + qty + ' pezzi' : num(i.setupMin) + ' min di setup' },
      { id: 'scarto', label: 'Scarto previsto', value: scarto, detail: (tasso * 100).toFixed(0) + '% di stampe fallite' },
      { id: 'packaging', label: 'Packaging', value: packaging, detail: 'per pezzo' },
      { id: 'extra', label: 'Extra', value: extra, detail: (i.extras || []).length + ' voci' },
    ].filter(function (v) { return v.value > 0.0000001; });

    var totale = voci.reduce(function (a, v) { return a + v.value; }, 0);

    var iva = Math.max(0, num(i.vatRate, 22)) / 100;

    /* Quattro posizionamenti, non quattro numeri a caso: sono i margini con cui
       un laboratorio decide se sta rincorrendo il prezzo o il valore. */
    var STRATEGIE = [
      { id: 'competitive', label: 'Competitivo', margine: num(i.marginCompetitive, 25) },
      { id: 'standard',    label: 'Standard',    margine: num(i.marginStandard, 40) },
      { id: 'premium',     label: 'Premium',     margine: num(i.marginPremium, 55) },
      { id: 'luxury',      label: 'Luxury',      margine: num(i.marginLuxury, 70) },
    ];

    function daMargine(m) {
      var f = Math.max(0, Math.min(95, num(m))) / 100;
      return totale / (1 - f);
    }

    return {
      empty: totale <= 0,
      voci: voci,
      costo: totale,
      costoOrarioMacchina: costoOrarioMacchina,
      grammi: grammi + supporti,
      quantita: qty,

      /** Il prezzo secondo ognuna delle quattro strategie, con IVA e profitto
          già sviluppati: sono i numeri che servono per decidere, non per
          ricalcolare a mano. */
      strategie: STRATEGIE.map(function (st) {
        var netto = daMargine(st.margine);
        var ivaImporto = netto * iva;
        return {
          id: st.id, label: st.label,
          margine: st.margine,
          costo: totale,
          netto: netto,
          iva: ivaImporto,
          lordo: netto + ivaImporto,
          profitto: netto - totale,
          markup: totale > 0 ? ((netto / totale) - 1) * 100 : 0,
          nettoTotale: netto * qty,
          profittoTotale: (netto - totale) * qty,
        };
      }),

      /** Prezzo da un **margine**, non da un ricarico: 40 % di margine
          significa che 40 centesimi su ogni euro incassato restano, cioè
          prezzo = costo / (1 − 0,40). Confondere i due è il modo più comune
          per credere di guadagnare il 40 % e guadagnare il 28,6 %. */
      prezzoDaMargine: function (marginePct) {
        var m = Math.max(0, Math.min(95, num(marginePct))) / 100;
        return m >= 1 ? Infinity : totale / (1 - m);
      },
      /** Prezzo da un ricarico moltiplicativo, come lo usa il calcolatore storico. */
      prezzoDaRicarico: function (moltiplicatore) { return totale * num(moltiplicatore, 1); },
      /** Il margine effettivo di un prezzo, in percentuale. */
      margineDi: function (prezzo) {
        var p = num(prezzo);
        return p > 0 ? ((p - totale) / p) * 100 : 0;
      },
    };
  }

  global.InglyPrint3D = { cost: cost, DENSITA: DENSITA };
})(window);

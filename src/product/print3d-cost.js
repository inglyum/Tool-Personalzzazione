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
    var ore = num(i.hours);

    /* ── Materiale ────────────────────────────────────────────────────────
       Si accettano i grammi diretti oppure il volume dello slicer con la
       densità del materiale — che è il dato che si ha davvero sott'occhio. */
    var grammi = num(i.grams);
    if (!grammi && i.volumeCm3) {
      var d = num(i.density) || DENSITA[String(i.material || '').toLowerCase()] || 1.24;
      grammi = num(i.volumeCm3) * d;
    }
    var supporti = num(i.supportGrams);
    var prezzoKg = num(i.materialPricePerKg);
    if (!prezzoKg && i.spoolPrice && i.spoolGrams) prezzoKg = (num(i.spoolPrice) / num(i.spoolGrams)) * 1000;
    var materiale = ((grammi + supporti) / 1000) * prezzoKg;

    /* ── Energia ──────────────────────────────────────────────────────────
       La potenza di targa non è quella assorbita: una stampante da 350 W ne
       consuma in media una frazione, perché il riscaldatore lavora a
       intermittenza. `dutyCycle` lo rappresenta, e vale 1 se non lo si dichiara. */
    var energia = (num(i.watt) / 1000) * ore * num(i.kwhPrice) * (num(i.dutyCycle, 1) || 1);

    /* ── Ammortamento ─────────────────────────────────────────────────────
       Costo della macchina spalmato sulle ore di vita utile. */
    var vita = num(i.machineLifeHours);
    var ammortamento = vita > 0 ? (num(i.machinePrice) / vita) * ore : 0;

    /* ── Manutenzione e consumabili ───────────────────────────────────────
       Ugelli, piatti, film FEP, alcool, guanti. Si consumano a ore di lavoro,
       non con l'invecchiamento della macchina: sono una voce a sé. */
    var manutenzione = num(i.maintenancePerHour) * ore;

    /* ── Post-processo ────────────────────────────────────────────────────
       Per la resina è obbligatorio: lavaggio e polimerizzazione. Per FDM è la
       rimozione dei supporti e la carteggiatura. */
    var oreLavoro = num(i.washCureMin) / 60;
    var postProcesso = oreLavoro * num(i.laborPerHour) + num(i.consumablesPerPrint);

    /* ── Manodopera ───────────────────────────────────────────────────────
       Il setup si paga una volta per lavoro, la finitura una volta per pezzo. */
    var setupPerPezzo = (num(i.setupMin) / 60) * num(i.laborPerHour) / qty;
    var finitura = (num(i.finishMin) / 60) * num(i.laborPerHour);
    var manodopera = setupPerPezzo + finitura;

    var extra = (i.extras || []).reduce(function (a, e) { return a + num(e && e.cost); }, 0);

    /* ── Scarto ───────────────────────────────────────────────────────────
       Una stampa fallita consuma materiale, corrente, ore macchina e
       manutenzione — non la manodopera di finitura, che non è ancora stata
       fatta. Si applica solo a ciò che si perde davvero. */
    var perdibile = materiale + energia + ammortamento + manutenzione;
    var tasso = Math.max(0, Math.min(90, num(i.failureRate))) / 100;
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
      { id: 'extra', label: 'Extra', value: extra, detail: (i.extras || []).length + ' voci' },
    ].filter(function (v) { return v.value > 0.0000001; });

    var totale = voci.reduce(function (a, v) { return a + v.value; }, 0);

    return {
      empty: totale <= 0,
      voci: voci,
      costo: totale,
      grammi: grammi + supporti,
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

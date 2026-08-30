/* ═══════════════════════════════════════════════════════════════════════════
   MACHINE COST — quanto costa un'ora di macchina, voce per voce
   ═══════════════════════════════════════════════════════════════════════════

   Una macchina costa quattro cose diverse ogni ora che lavora, e sommarle in
   un numero solo — «costo orario» — è il modo in cui si smette di capire quale
   delle quattro sta crescendo:

     energia        quello che assorbe adesso
     ammortamento   quello che si consuma del suo valore
     manutenzione   quello che si romperà
     consumabili    quello che si esaurisce (ugelli, FEP, filtri, lenti)

   La manodopera **non** è fra queste. Una stampante che lavora di notte costa
   ammortamento e corrente, non lo stipendio di nessuno, e infilare l'ora
   dell'operatore dentro il costo macchina è il modo più diretto per non
   accorgersi che una lavorazione non presidiata è più conveniente di una
   presidiata.

   Sui dati, la stessa disciplina del resto del progetto: la priorità è
   dichiarata e la fonte viaggia col numero.

     misurato → dichiarato dal produttore → configurato dall'utente → stimato

   Un errore specifico che questo modulo esiste anche per non ripetere: nel
   catalogo laser convivono `power_w` (la potenza **del laser**: 20 W su un
   diodo) e `kw` (l'assorbimento **della macchina**: 0,080 kW, cioè 80 W).
   Sono due grandezze diverse a un fattore quattro di distanza, e chiamare la
   prima «consumo» sbaglierebbe la bolletta di quattro volte.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  var num = function (v, d) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : (d === undefined ? 0 : d);
  };
  var pos = function (v, d) { return Math.max(0, num(v, d)); };

  /* Gli stessi cinque gradi del motore dei costi: un vocabolario solo. */
  var CONFIDENZE = ['measured', 'verified', 'declared', 'estimated', 'missing'];
  var peggiore = function (a, b) {
    return CONFIDENZE.indexOf(a) > CONFIDENZE.indexOf(b) ? a : b;
  };

  /* ── L'energia ────────────────────────────────────────────────────────────
     Quattro campi, una priorità, e il campo che vince lo dice. */
  function potenza(m) {
    if (pos(m.measuredPowerW) > 0) {
      return { w: pos(m.measuredPowerW), fonte: 'misurato', confidence: 'measured',
        nota: 'Assorbimento letto da uno strumento.' };
    }
    if (pos(m.averagePowerW) > 0) {
      return { w: pos(m.averagePowerW), fonte: 'medio dichiarato', confidence: 'verified',
        nota: 'Assorbimento medio dichiarato per questo modello.' };
    }
    if (pos(m.ratedPowerW) > 0) {
      var ciclo = m.dutyCycle != null ? Math.max(0, Math.min(1, num(m.dutyCycle, 1))) : 1;
      return { w: pos(m.ratedPowerW) * ciclo, fonte: 'targa', confidence: 'estimated',
        nota: ciclo < 1
          ? 'Stimato dalla potenza massima al ' + Math.round(ciclo * 100) + '% — misura reale consigliata.'
          : 'Stimato dalla potenza massima — misura reale consigliata.',
        ciclo: ciclo };
    }
    return { w: 0, fonte: 'assente', confidence: 'missing',
      nota: 'Nessun dato di assorbimento: l\'energia non è conteggiata.' };
  }

  /* ── L'investimento ───────────────────────────────────────────────────────
     Il prezzo di listino non è quello che si è speso. Spedizione,
     installazione e accessori obbligatori fanno parte della macchina: senza
     di essi l'ammortamento esce basso, e una macchina sembra più economica di
     quanto sia stata. */
  function investimento(m) {
    var prezzo = pos(m.purchasePrice != null ? m.purchasePrice : m.price);
    /* Un prezzo registrato IVA compresa va scorporato: l'IVA si recupera. */
    var scorporato = false;
    if (m.VATIncluded === true || m.ivaInclusa === true) {
      prezzo = prezzo / (1 + pos(m.ivaPct, 22) / 100);
      scorporato = true;
    }
    var extra = pos(m.shipping) + pos(m.installation) + pos(m.accessories);
    return { totale: prezzo + extra, prezzo: prezzo, extra: extra, ivaScorporata: scorporato };
  }

  /* ── Il costo orario, voce per voce ───────────────────────────────────────
     @param {Object} macchina  vedi `normalizza` per i nomi accettati
     @param {Object} opzioni   { kwhPrice }
  */
  function costoOrario(macchina, opzioni) {
    var m = macchina || {};
    var o = opzioni || {};
    var avvisi = [];
    var conf = 'measured';

    /* Energia. */
    var p = potenza(m);
    var kwh = pos(o.kwhPrice != null ? o.kwhPrice : m.kwhPrice);
    var energyCostPerHour = (p.w / 1000) * kwh;
    if (p.fonte === 'assente') avvisi.push('assorbimento non configurato: l\'energia non entra nel costo orario');
    if (!(kwh > 0)) avvisi.push('prezzo dell\'energia non configurato: mettici quello della tua bolletta');
    conf = peggiore(conf, kwh > 0 ? p.confidence : 'missing');

    /* Ammortamento: si ammortizza ciò che si perde, non ciò che si possiede. */
    var inv = investimento(m);
    var vita = pos(m.usefulLifeHours != null ? m.usefulLifeHours : m.life_h);
    var residuo = pos(m.residualValue);
    var depreciationCostPerHour = 0;
    if (vita > 0 && inv.totale > 0) {
      depreciationCostPerHour = Math.max(0, inv.totale - residuo) / vita;
      conf = peggiore(conf, m.usefulLifeHoursSource === 'measured' ? 'verified' : 'declared');
    } else if (inv.totale > 0) {
      avvisi.push('vita utile non dichiarata: l\'ammortamento non entra nel costo orario');
      conf = peggiore(conf, 'missing');
    }
    if (inv.totale > 0 && residuo === 0) {
      avvisi.push('nessun valore residuo: la macchina si assume senza valore a fine vita');
    }

    /* Manutenzione: per ora oppure annuale, mai tutte e due. */
    var maintenanceCostPerHour = 0;
    var oreAnno = pos(m.expectedAnnualHours);
    if (pos(m.maintenancePerHour != null ? m.maintenancePerHour : m.maint) > 0) {
      maintenanceCostPerHour = pos(m.maintenancePerHour != null ? m.maintenancePerHour : m.maint);
      conf = peggiore(conf, 'declared');
    } else if (pos(m.maintenanceAnnual) > 0) {
      if (oreAnno > 0) {
        maintenanceCostPerHour = pos(m.maintenanceAnnual) / oreAnno;
        conf = peggiore(conf, 'declared');
      } else {
        avvisi.push('manutenzione annuale dichiarata senza ore annue previste: non ripartibile');
        conf = peggiore(conf, 'missing');
      }
    } else {
      avvisi.push('manutenzione non configurata: il costo orario esce più basso del reale');
      conf = peggiore(conf, 'missing');
    }

    /* Consumabili: ugelli, piani, FEP, filtri, lenti. Ognuno con il proprio
       intervallo di sostituzione, perché un ugello ogni 300 ore e un filtro
       ogni 2000 non sono la stessa spesa. */
    var consumabili = (m.consumables || []).map(function (c) {
      var ore = pos(c.everyHours != null ? c.everyHours : c.intervalHours);
      var costo = pos(c.cost != null ? c.cost : c.price);
      return {
        id: c.id || c.name || 'consumabile', label: c.name || c.label || c.id || 'Consumabile',
        costo: costo, ogniOre: ore,
        perOra: ore > 0 ? costo / ore : 0,
        valido: ore > 0 && costo > 0,
      };
    });
    var consumablesCostPerHour = consumabili.reduce(function (a, c) { return a + c.perOra; }, 0);
    var senzaIntervallo = consumabili.filter(function (c) { return !c.valido; });
    if (senzaIntervallo.length) {
      avvisi.push(senzaIntervallo.length + ' consumabili senza intervallo o costo: non entrano nel conto');
    }

    /* Il totale, e la ragione per cui ce ne sono due. `machineCostPerHour` è
       quello che il preventivo somma; `fullMachineCostPerHour` aggiunge le
       spese generali se sono state ripartite su questa macchina — e resta
       separato perché l'overhead non è un costo della macchina, è un costo
       dell'azienda che la ospita. */
    var machineCostPerHour = energyCostPerHour + depreciationCostPerHour
      + maintenanceCostPerHour + consumablesCostPerHour;
    var overheadPerHour = pos(m.overheadPerHour);

    return {
      energyCostPerHour: energyCostPerHour,
      depreciationCostPerHour: depreciationCostPerHour,
      maintenanceCostPerHour: maintenanceCostPerHour,
      consumablesCostPerHour: consumablesCostPerHour,
      machineCostPerHour: machineCostPerHour,
      fullMachineCostPerHour: machineCostPerHour + overheadPerHour,
      overheadPerHour: overheadPerHour,

      energia: { w: p.w, fonte: p.fonte, confidence: p.confidence, nota: p.nota,
        prezzoKwh: kwh, kwhPerOra: p.w / 1000 },
      investimento: inv,
      vitaUtileOre: vita,
      consumabili: consumabili,
      confidence: conf,
      avvisi: avvisi,

      /* La composizione in percentuale: la domanda «cosa mi costa davvero di
         questa macchina» ha una risposta diversa per una fibra da 50 000 ore
         e per un diodo da 2 000. */
      composizione: machineCostPerHour > 0 ? {
        energia: (energyCostPerHour / machineCostPerHour) * 100,
        ammortamento: (depreciationCostPerHour / machineCostPerHour) * 100,
        manutenzione: (maintenanceCostPerHour / machineCostPerHour) * 100,
        consumabili: (consumablesCostPerHour / machineCostPerHour) * 100,
      } : null,
    };
  }

  /* ── Normalizzazione ──────────────────────────────────────────────────────
     I cataloghi esistenti usano nomi diversi per le stesse grandezze. Qui si
     traducono una volta, invece che in ogni preventivatore.

     La traduzione delicata è `kw`: nel catalogo laser vale l'assorbimento
     della macchina in kilowatt (0,080 = 80 W) e **non** ha niente a che
     vedere con `power_w`, che è la potenza ottica del laser. Confonderli
     sbaglia la bolletta di quattro volte. */
  function normalizza(rec) {
    var r = rec || {};
    var out = {
      id: r.id || null,
      label: [r.brand, r.model].filter(Boolean).join(' ') || r.name || r.n || r.id || 'Macchina',
      purchasePrice: r.purchasePrice != null ? num(r.purchasePrice)
        : (r.price != null ? num(r.price) : (r.c != null ? num(r.c) : 0)),
      shipping: num(r.shipping, 0), installation: num(r.installation, 0),
      accessories: num(r.accessories, 0),
      VATIncluded: r.VATIncluded === true || r.ivaInclusa === true,
      ivaPct: num(r.ivaPct, 22),
      residualValue: num(r.residualValue, 0),
      usefulLifeHours: r.usefulLifeHours != null ? num(r.usefulLifeHours)
        : (r.life_h != null ? num(r.life_h) : (r.l != null ? num(r.l) : 0)),
      expectedAnnualHours: num(r.expectedAnnualHours, 0),
      measuredPowerW: r.measuredPowerW != null ? num(r.measuredPowerW) : 0,
      averagePowerW: r.averagePowerW != null ? num(r.averagePowerW)
        : (r.kw != null ? num(r.kw) * 1000 : 0),
      ratedPowerW: r.ratedPowerW != null ? num(r.ratedPowerW)
        : (r.w != null ? num(r.w) : 0),
      dutyCycle: r.dutyCycle != null ? num(r.dutyCycle) : null,
      maintenancePerHour: r.maintenancePerHour != null ? num(r.maintenancePerHour)
        : (r.maint != null ? num(r.maint) : 0),
      maintenanceAnnual: num(r.maintenanceAnnual, 0),
      consumables: r.consumables || r.consumabili || [],
      overheadPerHour: num(r.overheadPerHour, 0),
      /* La potenza ottica si conserva, con il suo nome, perché non venga mai
         più scambiata per un assorbimento. */
      laserPowerW: r.power_w != null ? num(r.power_w) : null,
      source: r.source || null, lastUpdated: r.lastUpdated || null,
    };
    return out;
  }

  /** Il costo orario di una macchina di catalogo, in una chiamata. */
  function daCatalogo(rec, opzioni) {
    var m = normalizza(rec);
    var c = costoOrario(m, opzioni);
    c.macchina = m;
    return c;
  }

  /* ── Confronto ────────────────────────────────────────────────────────────
     Due macchine si confrontano per costo orario, non per prezzo d'acquisto:
     una fibra da 1 700 € con 50 000 ore di vita costa meno all'ora di un
     diodo da 500 € con 2 000. È il conto che nessuno fa guardando il
     listino. */
  function confronta(macchine, opzioni) {
    return (macchine || []).map(function (r) {
      var c = daCatalogo(r, opzioni);
      return { id: c.macchina.id, label: c.macchina.label,
        machineCostPerHour: c.machineCostPerHour,
        acquisto: c.investimento.totale, vitaUtileOre: c.vitaUtileOre,
        confidence: c.confidence, avvisi: c.avvisi.length };
    }).sort(function (a, b) { return a.machineCostPerHour - b.machineCostPerHour; });
  }

  global.InglyMachineCost = {
    version: VERSIONE,
    CONFIDENZE: CONFIDENZE,
    potenza: potenza,
    investimento: investimento,
    costoOrario: costoOrario,
    normalizza: normalizza,
    daCatalogo: daCatalogo,
    confronta: confronta,
  };
})(typeof window !== 'undefined' ? window : globalThis);

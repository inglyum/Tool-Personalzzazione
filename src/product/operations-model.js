/* ═══════════════════════════════════════════════════════════════════════════
   OPERAZIONI — il routing di produzione, quando serve
   ═══════════════════════════════════════════════════════════════════════════

   Il modello di produzione sapeva già dire *con che cosa* si fa un ordine —
   laser, 3D, UV, o più d'uno insieme. Non sapeva dire *in che ordine*, *su
   quale macchina*, *in quanto tempo*, *a che costo*, e soprattutto quanto di
   tutto questo era previsto e quanto è successo davvero.

   `operations` esisteva come campo: un array passato di mano in mano senza
   che nessuno ne conoscesse la forma. Qui la forma c'è.

   ── Un ordine semplice non diventa complicato ────────────────────────────

   La regola che tiene insieme il tutto: **nessun campo è obbligatorio tranne
   la tecnologia**. Una targa incisa al laser ha una operazione con dentro
   `technology: 'laser'` e basta. Chi vuole pianificare macchine, operatori e
   tempi compila il resto; chi non vuole non vede niente di nuovo.

   Un campo non compilato vale `null`, non zero. È la differenza fra «non l'ho
   misurato» e «è costato zero», e su un consuntivo le due cose portano a
   conclusioni opposte.

   ── Il costo non si calcola qui ──────────────────────────────────────────

   Questo modulo somma e confronta. Il costo di un'ora di macchina lo dice
   `InglyMachineCost`, quello di un preventivo `InglyCostEngine`. Scrivere qui
   una tariffa oraria vorrebbe dire avere due motori di costo, che è la classe
   di difetto da cui questo progetto sta uscendo.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  function num(v) {
    if (v == null || v === '') return null;
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : null;
  }
  function arr(v) { return v == null ? null : Math.round(v * 1000) / 1000; }
  function P() { return global.InglyProduction; }

  /* Gli stati di una operazione. `pianificata` è il default perché un'
     operazione appena creata non è ancora successa. */
  /* Il percorso di un lavoro in officina, nell'ordine in cui succede.

     «Da fare» e «in coda» non sono la stessa cosa e distinguerle serve: la
     prima e' una operazione che esiste, la seconda una che e' stata messa in
     fila per una macchina. Chi guarda il carico di una macchina vuole vedere
     solo le seconde.

     «Controllo qualita'» sta fra la lavorazione e il completamento perche' e'
     li' che sta davvero: un pezzo finito di lavorare non e' ancora un pezzo
     buono, e chiamarlo completato prima di averlo guardato e' il modo in cui
     gli scarti spariscono dai conti. */
  var STATI = [
    { id: 'da_fare', label: 'Da fare', emoji: '\ud83d\udccb', colore: '#64748b', ordine: 1 },
    { id: 'in_coda', label: 'In coda', emoji: '\u23f3', colore: '#3b82f6', ordine: 2 },
    { id: 'in_produzione', label: 'In produzione', emoji: '\u2699\ufe0f', colore: '#f59e0b', ordine: 3 },
    { id: 'pausa', label: 'In pausa', emoji: '\u23f8\ufe0f', colore: '#a78bfa', ordine: 4 },
    { id: 'controllo_qualita', label: 'Controllo qualit\u00e0', emoji: '\ud83d\udd0d', colore: '#06b6d4', ordine: 5 },
    { id: 'completata', label: 'Completata', emoji: '\u2705', colore: '#22c55e', ordine: 6 },
    { id: 'annullata', label: 'Annullata', emoji: '\u2716\ufe0f', colore: '#ef4444', ordine: 7 },
  ];

  /* Lo storico non si riscrive: si traduce. Ogni nome che l'applicazione ha
     usato in passato — inglese, italiano, del motore di workflow — arriva allo
     stato che gli corrisponde oggi. `pianificata` e `sospesa` erano i nomi di
     ieri di questo stesso modulo. */
  var ALIAS_STATO = {
    pianificata: 'da_fare', planned: 'da_fare', pending: 'da_fare', todo: 'da_fare',
    backlog: 'da_fare', dafare: 'da_fare', nuova: 'da_fare',
    queued: 'in_coda', coda: 'in_coda', incoda: 'in_coda', ready: 'in_coda', pronta: 'in_coda',
    in_corso: 'in_produzione', incorso: 'in_produzione', running: 'in_produzione',
    inprogress: 'in_produzione', wip: 'in_produzione', working: 'in_produzione',
    produzione: 'in_produzione', production: 'in_produzione', lavorazione: 'in_produzione',
    inproduzione: 'in_produzione',
    sospesa: 'pausa', paused: 'pausa', hold: 'pausa', pausa: 'pausa', inpausa: 'pausa',
    qc: 'controllo_qualita', quality: 'controllo_qualita', qualita: 'controllo_qualita',
    controllo: 'controllo_qualita', controlloqualita: 'controllo_qualita', check: 'controllo_qualita',
    done: 'completata', completed: 'completata', finita: 'completata', finished: 'completata',
    cancelled: 'annullata', canceled: 'annullata', annullato: 'annullata', scartata: 'annullata',
  };

  function statoDi(v) {
    var k = String(v == null ? '' : v).toLowerCase().replace(/[^a-z_]/g, '');
    for (var i = 0; i < STATI.length; i++) if (STATI[i].id === k) return k;
    return ALIAS_STATO[k] || ALIAS_STATO[k.replace(/_/g, '')] || 'da_fare';
  }

  /* ── Le transizioni possibili ──────────────────────────────────────────

     Non tutte le strade fra due stati esistono. Un'operazione non può passare
     da «da fare» a «completata» senza essere stata fatta: se succede, o
     qualcuno ha premuto il pulsante sbagliato, o un'automazione sta saltando
     dei passaggi — e in entrambi i casi i tempi e le quantità di quel lavoro
     non verranno mai registrati.

     Due passaggi all'indietro sono leciti e servono:

       controllo_qualita → in_produzione   il pezzo torna in lavorazione
       completata        → in_produzione   un rifacimento

     Uno non lo è: nessuno stato torna a «da fare» tranne «annullata», che è
     la riapertura di un lavoro fermato. Tornare a «da fare» da metà
     lavorazione cancellerebbe il fatto che quella lavorazione è avvenuta. */
  var TRANSIZIONI = {
    da_fare: ['in_coda', 'in_produzione', 'annullata'],
    in_coda: ['in_produzione', 'da_fare', 'pausa', 'annullata'],
    in_produzione: ['pausa', 'controllo_qualita', 'completata', 'annullata'],
    pausa: ['in_produzione', 'in_coda', 'annullata'],
    controllo_qualita: ['completata', 'in_produzione', 'annullata'],
    completata: ['in_produzione', 'controllo_qualita'],
    annullata: ['da_fare'],
  };

  /** @returns { ok, motivo, ammesse[] } */
  function transizioneValida(da, a) {
    var d = statoDi(da);
    var v = statoDi(a);
    var ammesse = TRANSIZIONI[d] || [];
    if (d === v) {
      return { ok: true, invariata: true, motivo: null, ammesse: ammesse };
    }
    if (ammesse.indexOf(v) >= 0) return { ok: true, motivo: null, ammesse: ammesse };
    return {
      ok: false,
      motivo: 'da «' + infoStato(d).label + '» non si passa a «' + infoStato(v).label + '»',
      ammesse: ammesse,
    };
  }

  /**
   * Cambia lo stato di un'operazione, o rifiuta.
   * Timbra `startedAt` e `completedAt` da sé: sono le due date che nessuno si
   * ricorda di scrivere, e senza le quali il tempo reale non si può misurare.
   */
  function cambiaStato(op, nuovo, opzioni) {
    var o = normalizza(op);
    var c = opzioni || {};
    var v = transizioneValida(o.status, nuovo);
    if (!v.ok) return { ok: false, operazione: o, motivo: v.motivo, ammesse: v.ammesse };
    if (v.invariata) return { ok: true, operazione: o, invariata: true };

    var quando = c.adesso || new Date().toISOString();
    var dopo = statoDi(nuovo);
    o.status = dopo;
    if (dopo === 'in_produzione' && !o.startedAt) o.startedAt = quando;
    if (dopo === 'completata') o.completedAt = quando;
    /* Un rifacimento riapre un'operazione completata: la data di fine non
       vale più, e lasciarla farebbe risultare finito qualcosa che è in corso. */
    if (dopo === 'in_produzione' && o.completedAt) o.completedAt = null;
    return { ok: true, operazione: o, da: statoDi(op && (op.status || op.stato)), a: dopo };
  }

  /* Gli stati in cui un'operazione occupa davvero una macchina. Serve al
     carico: una operazione «da fare» non impegna niente. */
  var ATTIVI = ['in_coda', 'in_produzione', 'pausa', 'controllo_qualita'];
  function attiva(op) { return ATTIVI.indexOf(statoDi(op && (op.status || op.stato))) >= 0; }
  function chiusa(op) {
    var s = statoDi(op && (op.status || op.stato));
    return s === 'completata' || s === 'annullata';
  }
  function infoStato(id) {
    for (var i = 0; i < STATI.length; i++) if (STATI[i].id === id) return STATI[i];
    return STATI[0];
  }

  /**
   * La forma canonica di una operazione. Tutto facoltativo tranne la
   * tecnologia, che è l'unica cosa senza la quale l'operazione non dice niente.
   */
  function normalizza(op, indice) {
    var o = op || {};
    var pm = P();
    var tec = pm ? pm.normalizza(o.technology || o.tecnologia || o.tech || o.type) : null;
    return {
      id: o.id != null ? o.id : ('op-' + ((indice == null ? 0 : indice) + 1)),
      sequence: num(o.sequence != null ? o.sequence : o.seq) != null
        ? num(o.sequence != null ? o.sequence : o.seq)
        : ((indice == null ? 0 : indice) + 1),
      type: o.type || o.tipo || null,
      technology: tec,
      machineId: o.machineId != null ? o.machineId : (o.macchinaId != null ? o.macchinaId : null),
      machineName: o.machineName || o.macchina || null,
      operatorId: o.operatorId != null ? o.operatorId : (o.operatore != null ? o.operatore : null),
      status: statoDi(o.status || o.stato),
      estimatedTime: num(o.estimatedTime != null ? o.estimatedTime : o.tempoPrevisto),
      actualTime: num(o.actualTime != null ? o.actualTime : o.tempoReale),
      estimatedCost: num(o.estimatedCost != null ? o.estimatedCost : o.costoPrevisto),
      actualCost: num(o.actualCost != null ? o.actualCost : o.costoReale),
      startedAt: o.startedAt || o.iniziataIl || null,
      completedAt: o.completedAt || o.completataIl || null,
      /* ── Quantita' e qualita' ──────────────────────────────────────────
         Un'operazione su 100 pezzi che ne produce 96 buoni e 4 da rifare non
         e' «completata» e basta: sono tre numeri diversi, e confonderli e' il
         modo in cui gli scarti spariscono dal costo.

         `goodQuantity` non si deduce sottraendo: se nessuno ha contato i
         pezzi buoni, il numero non c'e'. Dedurlo farebbe sembrare misurato
         qualcosa che nessuno ha guardato. */
      quantity: num(o.quantity != null ? o.quantity : o.quantita),
      goodQuantity: num(o.goodQuantity != null ? o.goodQuantity : o.pezziBuoni),
      wasteQuantity: num(o.wasteQuantity != null ? o.wasteQuantity : o.scarti),
      reworkQuantity: num(o.reworkQuantity != null ? o.reworkQuantity : o.rifacimenti),
      reworkCost: num(o.reworkCost != null ? o.reworkCost : o.costoRifacimenti),
      wasteReason: o.wasteReason || o.motivoScarto || null,
      notes: o.notes || o.note || null,
    };
  }

  /**
   * La resa di una operazione: buoni, scarti, rifacimenti.
   * Tutto `null` finche' qualcuno non conta — una resa del 100% dichiarata
   * senza aver contato e' peggio di nessuna resa.
   */
  function qualita(op) {
    var o = normalizza(op);
    var q = o.quantity;
    var buoni = o.goodQuantity;
    var scarti = o.wasteQuantity;
    var rifatti = o.reworkQuantity;
    var contato = buoni != null || scarti != null || rifatti != null;
    return {
      quantity: q,
      good: buoni,
      waste: scarti,
      rework: rifatti,
      reason: o.wasteReason,
      reworkCost: o.reworkCost,
      /* La resa esiste solo se c'e' un totale e un conteggio dei buoni. */
      resaPct: (q != null && q > 0 && buoni != null) ? arr((buoni / q) * 100) : null,
      scartoPct: (q != null && q > 0 && scarti != null) ? arr((scarti / q) * 100) : null,
      contato: contato,
      /* I conti tornano? Se buoni + scarti superano il totale, qualcuno ha
         sbagliato a scrivere, e un numero sbagliato che passa inosservato
         diventa un costo sbagliato. */
      coerente: (q == null || buoni == null || scarti == null)
        ? null : (buoni + scarti <= q + 0.0001),
    };
  }

  /** Lo scostamento di una operazione: reale meno previsto, e `null` dove non
      c'è niente da confrontare. */
  function varianza(op) {
    var o = normalizza(op);
    var dt = (o.estimatedTime != null && o.actualTime != null) ? arr(o.actualTime - o.estimatedTime) : null;
    var dc = (o.estimatedCost != null && o.actualCost != null) ? arr(o.actualCost - o.estimatedCost) : null;
    return {
      time: dt,
      timePct: (dt != null && o.estimatedTime > 0) ? arr((dt / o.estimatedTime) * 100) : null,
      cost: dc,
      costPct: (dc != null && o.estimatedCost > 0) ? arr((dc / o.estimatedCost) * 100) : null,
      misurabile: dt != null || dc != null,
    };
  }

  /** Le operazioni di un ordine, normalizzate e in sequenza. */
  function leggi(record) {
    var r = record || {};
    var grezze = (r.production && Array.isArray(r.production.operations) && r.production.operations)
      || (Array.isArray(r.operations) ? r.operations : []);
    return grezze.map(normalizza).sort(function (a, b) { return a.sequence - b.sequence; });
  }

  /**
   * Un ordine che entra in produzione senza routing ne riceve uno: una
   * operazione per tecnologia dichiarata, nell'ordine in cui il modello le
   * elenca. Non inventa tempi né macchine — quelli restano `null` finché
   * qualcuno non li misura.
   *
   * Se il routing c'è già, si conserva: ricostruirlo cancellerebbe i tempi
   * reali già registrati.
   */
  function costruisciDaOrdine(ordine) {
    var esistenti = leggi(ordine);
    if (esistenti.length) return { operations: esistenti, create: false, motivo: 'routing già presente' };
    var pm = P();
    if (!pm) return { operations: [], create: false, motivo: 'modello produzione non disponibile' };
    var lettura = pm.leggi(ordine);
    var tec = (lettura && lettura.technologies) || [];
    if (!tec.length) return { operations: [], create: false, motivo: 'nessuna tecnologia dichiarata' };
    return {
      operations: tec.map(function (t, i) {
        return normalizza({ id: 'op-' + (i + 1), sequence: i + 1, technology: t,
          status: 'da_fare' }, i);
      }),
      create: true,
      dedotta: !!(lettura && lettura.dedotta),
      fonte: lettura && lettura.fonte,
    };
  }

  var CAMPI = ['estimatedTime', 'actualTime', 'estimatedCost', 'actualCost',
    'quantity', 'goodQuantity', 'wasteQuantity', 'reworkQuantity', 'reworkCost'];

  /* Una riga di aggregato tiene i suoi quattro totali insieme alla memoria di
     quali siano stati davvero misurati: zero e «non misurato» si scrivono
     uguali e vogliono dire il contrario. */
  function _rigaVuota(base) {
    var r = Object.assign({ operazioni: 0, misurato: false, _visto: {} }, base);
    CAMPI.forEach(function (k) { r[k] = 0; });
    return r;
  }
  function _accumula(r, o) {
    r.operazioni++;
    CAMPI.forEach(function (k) {
      if (o[k] != null) { r[k] += o[k]; r._visto[k] = true; }
    });
    if (o.actualTime != null || o.actualCost != null) r.misurato = true;
  }
  function _chiudi(r) {
    CAMPI.forEach(function (k) { r[k] = r._visto[k] ? arr(r[k]) : null; });
    delete r._visto;
    return r;
  }

  /**
   * I totali di un routing: tempi e costi, previsti e reali, più le ore per
   * tecnologia e per macchina. Le ore sono `null` quando non è stato misurato
   * niente — non zero, che vorrebbe dire «misurato, ed era zero».
   */
  function riepilogo(operazioni) {
    var ops = (operazioni || []).map(normalizza);
    var t = {};
    var misurato = {};
    CAMPI.forEach(function (k) { t[k] = 0; misurato[k] = false; });
    var perTec = {};
    var perMacchina = {};

    ops.forEach(function (o) {
      CAMPI.forEach(function (k) {
        if (o[k] != null) { t[k] += o[k]; misurato[k] = true; }
      });
      var chiaveT = o.technology || 'sconosciuta';
      var rt = perTec[chiaveT] || (perTec[chiaveT] = _rigaVuota({ technology: chiaveT }));
      _accumula(rt, o);

      if (o.machineId != null) {
        var km = String(o.machineId);
        var rm = perMacchina[km] || (perMacchina[km] = _rigaVuota({
          machineId: o.machineId, machineName: o.machineName, technology: o.technology }));
        if (!rm.machineName && o.machineName) rm.machineName = o.machineName;
        _accumula(rm, o);
      }
    });

    var tot = {};
    CAMPI.forEach(function (k) { tot[k] = misurato[k] ? arr(t[k]) : null; });
    /* Il costo dei rifacimenti entra nel costo reale: rifare un pezzo costa
       macchina e tempo come farlo la prima volta, e tenerlo fuori farebbe
       apparire un margine che non c'e'. Entra solo se qualcuno l'ha misurato. */
    if (tot.reworkCost != null && tot.actualCost != null) {
      tot.actualCostConRifacimenti = arr(tot.actualCost + tot.reworkCost);
    } else {
      tot.actualCostConRifacimenti = tot.actualCost;
    }
    tot.varianceTime = (tot.estimatedTime != null && tot.actualTime != null)
      ? arr(tot.actualTime - tot.estimatedTime) : null;
    tot.varianceCost = (tot.estimatedCost != null && tot.actualCost != null)
      ? arr(tot.actualCost - tot.estimatedCost) : null;

    return {
      operazioni: ops.length,
      completate: ops.filter(function (o) { return o.status === 'completata'; }).length,
      inCorso: ops.filter(function (o) { return o.status === 'in_produzione'; }).length,
      totali: tot,
      perTecnologia: Object.keys(perTec).map(function (k) { return _chiudi(perTec[k]); }),
      perMacchina: Object.keys(perMacchina).map(function (k) { return _chiudi(perMacchina[k]); }),
      /* Un routing senza nemmeno un tempo reale non è «a zero ore»: è non
         misurato, e chi legge deve poterlo distinguere. */
      misurato: misurato.actualTime || misurato.actualCost,
      attive: ops.filter(attiva).length,
      qualita: (function () {
        var rese = ops.map(qualita).filter(function (q) { return q.contato; });
        if (!rese.length) return { contato: false };
        var incoerenti = rese.filter(function (q) { return q.coerente === false; }).length;
        return {
          contato: true,
          operazioniContate: rese.length,
          resaPct: tot.quantity > 0 && tot.goodQuantity != null
            ? arr((tot.goodQuantity / tot.quantity) * 100) : null,
          incoerenti: incoerenti,
        };
      }()),
    };
  }

  /** L'avanzamento leggibile: «2 di 3 completate». */
  function avanzamento(operazioni) {
    var r = riepilogo(operazioni);
    if (!r.operazioni) return { testo: 'nessuna operazione', pct: null, operazioni: 0 };
    return {
      testo: r.completate + ' di ' + r.operazioni + (r.operazioni === 1 ? ' completata' : ' completate'),
      pct: Math.round((r.completate / r.operazioni) * 100),
      operazioni: r.operazioni,
      completate: r.completate,
      inCorso: r.inCorso,
    };
  }

  global.InglyOperazioni = {
    VERSIONE: VERSIONE,
    STATI: STATI,
    statoDi: statoDi,
    infoStato: infoStato,
    attiva: attiva,
    chiusa: chiusa,
    TRANSIZIONI: TRANSIZIONI,
    transizioneValida: transizioneValida,
    cambiaStato: cambiaStato,
    qualita: qualita,
    normalizza: normalizza,
    varianza: varianza,
    leggi: leggi,
    costruisciDaOrdine: costruisciDaOrdine,
    riepilogo: riepilogo,
    avanzamento: avanzamento,
  };
})(typeof window !== 'undefined' ? window : globalThis);

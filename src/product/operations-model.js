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
  var STATI = [
    { id: 'pianificata', label: 'Pianificata', emoji: '📋', colore: '#64748b' },
    { id: 'in_corso', label: 'In corso', emoji: '⚙️', colore: '#f59e0b' },
    { id: 'completata', label: 'Completata', emoji: '✅', colore: '#22c55e' },
    { id: 'sospesa', label: 'Sospesa', emoji: '⏸️', colore: '#a78bfa' },
    { id: 'annullata', label: 'Annullata', emoji: '✖️', colore: '#ef4444' },
  ];
  var ALIAS_STATO = {
    planned: 'pianificata', pending: 'pianificata', todo: 'pianificata',
    running: 'in_corso', inprogress: 'in_corso', incorso: 'in_corso', wip: 'in_corso',
    done: 'completata', completed: 'completata', finita: 'completata',
    paused: 'sospesa', hold: 'sospesa',
    cancelled: 'annullata', canceled: 'annullata',
  };

  function statoDi(v) {
    var k = String(v == null ? '' : v).toLowerCase().replace(/[^a-z_]/g, '');
    for (var i = 0; i < STATI.length; i++) if (STATI[i].id === k) return k;
    return ALIAS_STATO[k.replace(/_/g, '')] || ALIAS_STATO[k] || 'pianificata';
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
      notes: o.notes || o.note || null,
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
          status: 'pianificata' }, i);
      }),
      create: true,
      dedotta: !!(lettura && lettura.dedotta),
      fonte: lettura && lettura.fonte,
    };
  }

  var CAMPI = ['estimatedTime', 'actualTime', 'estimatedCost', 'actualCost'];

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
    var t = { estimatedTime: 0, actualTime: 0, estimatedCost: 0, actualCost: 0 };
    var misurato = { estimatedTime: false, actualTime: false, estimatedCost: false, actualCost: false };
    var perTec = {};
    var perMacchina = {};

    ops.forEach(function (o) {
      ['estimatedTime', 'actualTime', 'estimatedCost', 'actualCost'].forEach(function (k) {
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
    tot.varianceTime = (tot.estimatedTime != null && tot.actualTime != null)
      ? arr(tot.actualTime - tot.estimatedTime) : null;
    tot.varianceCost = (tot.estimatedCost != null && tot.actualCost != null)
      ? arr(tot.actualCost - tot.estimatedCost) : null;

    return {
      operazioni: ops.length,
      completate: ops.filter(function (o) { return o.status === 'completata'; }).length,
      inCorso: ops.filter(function (o) { return o.status === 'in_corso'; }).length,
      totali: tot,
      perTecnologia: Object.keys(perTec).map(function (k) { return _chiudi(perTec[k]); }),
      perMacchina: Object.keys(perMacchina).map(function (k) { return _chiudi(perMacchina[k]); }),
      /* Un routing senza nemmeno un tempo reale non è «a zero ore»: è non
         misurato, e chi legge deve poterlo distinguere. */
      misurato: misurato.actualTime || misurato.actualCost,
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
    normalizza: normalizza,
    varianza: varianza,
    leggi: leggi,
    costruisciDaOrdine: costruisciDaOrdine,
    riepilogo: riepilogo,
    avanzamento: avanzamento,
  };
})(typeof window !== 'undefined' ? window : globalThis);

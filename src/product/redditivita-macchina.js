/* ═══════════════════════════════════════════════════════════════════════════
   REDDITIVITÀ PER MACCHINA — quale macchina si ripaga
   ═══════════════════════════════════════════════════════════════════════════

   Stessa domanda della redditività per tecnologia, un gradino più sotto: non
   «quanto rende il laser» ma «quanto rende *quel* laser».

   ── Il fatturato non si duplica ─────────────────────────────────────────

   È la stessa regola, e per la stessa ragione. Un ordine che passa dal laser
   e poi dalla stampante UV vale 150 euro in tutto, non 150 per macchina. Qui
   i 150 si ripartiscono **in proporzione al tempo misurato**, e la somma
   delle righe fa sempre l'importo di partenza. Non è una convenzione
   contabile: è l'unica ripartizione che i dati permettono di giustificare.

   ── Quando non si può ripartire ─────────────────────────────────────────

   Se nessuna operazione dichiara una macchina, o se nessuna dichiara un
   tempo, il ricavo non si spalma a caso fra le macchine del laboratorio:
   finisce in una riga sola, «non attribuibile». Un numero inventato qui
   sembrerebbe una misura, ed è il modo in cui si prendono decisioni sbagliate
   sull'acquisto della prossima macchina.

   ── Il parco vuoto ──────────────────────────────────────────────────────

   A installazione nuova non ci sono macchine. La funzione lo dichiara
   (`vuoto: true`) invece di restituire un elenco di zeri: sono due situazioni
   diverse e l'interfaccia deve poterle distinguere.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';
  var NON_ATTRIBUIBILE = '__non_attribuibile__';

  function E() { return global.InglyOrderEconomics; }
  function O() { return global.InglyOperazioni; }
  function MC() { return global.InglyMachineCost; }

  function arr(v) { return v == null ? null : Math.round(v * 1000) / 1000; }

  /**
   * Come si divide l'importo di un ordine fra le macchine che l'hanno fatto.
   * La somma delle righe è sempre `importo`. Sempre.
   */
  function quotaPerMacchina(ordine, importo) {
    var op = O();
    var tot = +importo || 0;
    if (!op) {
      return { righe: [{ machineId: NON_ATTRIBUIBILE, importo: tot, quota: 1 }],
        criterio: 'modello operazioni non disponibile' };
    }
    var ops = op.leggi(ordine);
    /* Si preferisce il tempo reale; in mancanza, il previsto. Mescolare i due
       darebbe una ripartizione che non corrisponde né all'uno né all'altro. */
    var campo = ops.some(function (o) { return o.machineId != null && o.actualTime != null; })
      ? 'actualTime'
      : (ops.some(function (o) { return o.machineId != null && o.estimatedTime != null; })
        ? 'estimatedTime' : null);

    if (!campo) {
      return { righe: [{ machineId: NON_ATTRIBUIBILE, importo: arr(tot), quota: 1 }],
        criterio: ops.length ? 'nessun tempo misurato' : 'nessuna operazione' };
    }

    var perM = {};
    var somma = 0;
    ops.forEach(function (o) {
      if (o.machineId == null || o[campo] == null || o[campo] <= 0) return;
      var k = String(o.machineId);
      if (!perM[k]) perM[k] = { machineId: o.machineId, machineName: o.machineName,
        technology: o.technology, tempo: 0 };
      perM[k].tempo += o[campo];
      somma += o[campo];
    });
    var chiavi = Object.keys(perM);
    if (!chiavi.length || somma <= 0) {
      return { righe: [{ machineId: NON_ATTRIBUIBILE, importo: arr(tot), quota: 1 }],
        criterio: 'nessun tempo utile' };
    }

    /* L'ultima riga prende il resto: sommando percentuali arrotondate il
       totale perderebbe qualche centesimo, e il fatturato dell'azienda non
       deve dipendere da un arrotondamento. */
    var righe = [];
    var accumulato = 0;
    chiavi.forEach(function (k, i) {
      var m = perM[k];
      var quota = m.tempo / somma;
      var imp = (i === chiavi.length - 1) ? arr(tot - accumulato) : arr(tot * quota);
      accumulato = arr(accumulato + imp);
      righe.push({ machineId: m.machineId, machineName: m.machineName,
        technology: m.technology, tempo: arr(m.tempo), quota: arr(quota), importo: imp });
    });
    return { righe: righe, criterio: campo === 'actualTime' ? 'tempo reale' : 'tempo previsto' };
  }

  /**
   * L'aggregato.
   * @param ordini   gli ordini da cui leggere ricavo e operazioni
   * @param macchine il parco, se lo si vuole nominare per esteso
   */
  function per(ordini, macchine) {
    var e = E(), op = O(), mc = MC();
    var lista = Array.isArray(ordini) ? ordini : [];
    var parco = {};
    (Array.isArray(macchine) ? macchine : []).forEach(function (m) {
      var n = mc ? mc.normalizza(m) : m;
      if (n && n.id != null) parco[String(n.id)] = n;
    });

    var gruppi = {};
    var ordiniContati = 0;
    var nonAttribuiti = 0;

    function gruppo(id, nome, tec) {
      var k = String(id);
      if (!gruppi[k]) {
        var m = parco[k];
        gruppi[k] = {
          machineId: id,
          /* Il nome del parco vince su quello scritto nell'operazione: il
             parco e' l'anagrafica, l'operazione una copia che invecchia. */
          label: id === NON_ATTRIBUIBILE ? 'Non attribuibile'
            : ((m && (m.label || m.name)) || nome || String(id)),
          technology: tec || (m && m.technology) || null,
          attribuibile: id !== NON_ATTRIBUIBILE,
          ordini: 0, ricavo: 0,
          oreMisurate: 0, oreStimate: 0, oreDisponibili: false,
          ordiniConCosto: 0, costo: 0, profitto: 0,
        };
      }
      return gruppi[k];
    }

    lista.forEach(function (o) {
      if (!e) return;
      var ric = e.getOrderRevenueNet(o);
      if (!ric.noto) return;
      ordiniContati += 1;

      var costo = e.getOrderProductionCost(o);
      var quote = quotaPerMacchina(o, ric.valore);
      if (quote.righe.length === 1 && quote.righe[0].machineId === NON_ATTRIBUIBILE) nonAttribuiti += 1;

      var rie = op ? op.riepilogo(op.leggi(o)) : null;
      var oreDi = {};
      if (rie) rie.perMacchina.forEach(function (m) { oreDi[String(m.machineId)] = m; });

      quote.righe.forEach(function (q) {
        var g = gruppo(q.machineId, q.machineName, q.technology);
        g.ordini += 1;
        g.ricavo = arr(g.ricavo + q.importo);
        var ore = oreDi[String(q.machineId)];
        if (ore) {
          if (ore.actualTime != null) { g.oreMisurate = arr(g.oreMisurate + ore.actualTime); g.oreDisponibili = true; }
          if (ore.estimatedTime != null) g.oreStimate = arr(g.oreStimate + ore.estimatedTime);
        }
        /* Il costo si ripartisce con la stessa quota del ricavo: usarne una
           diversa farebbe apparire margini che nessuno ha misurato. */
        if (costo.noto) {
          g.ordiniConCosto += 1;
          g.costo = arr(g.costo + costo.valore * (q.quota != null ? q.quota : 1));
        }
      });
    });

    var righe = Object.keys(gruppi).map(function (k) {
      var g = gruppi[k];
      g.ricavo = arr(g.ricavo);
      g.costo = g.ordiniConCosto ? arr(g.costo) : null;
      g.profitto = g.costo != null ? arr(g.ricavo - g.costo) : null;
      g.marginePct = (g.profitto != null && g.ricavo > 0) ? arr((g.profitto / g.ricavo) * 100) : null;
      /* Euro per ora di macchina: la domanda per cui questa vista esiste. */
      g.ricavoOrario = (g.oreDisponibili && g.oreMisurate > 0) ? arr(g.ricavo / g.oreMisurate) : null;
      if (!g.oreDisponibili) g.oreMisurate = null;
      return g;
    }).sort(function (a, b) { return b.ricavo - a.ricavo; });

    var totale = righe.reduce(function (a, r) { return arr(a + r.ricavo); }, 0);
    return {
      righe: righe,
      totali: { ordini: ordiniContati, ricavo: totale },
      /* Il parco vuoto e «nessun ordine» sono due cose diverse. */
      vuoto: righe.length === 0,
      parcoVuoto: Object.keys(parco).length === 0,
      nonAttribuiti: nonAttribuiti,
      doppioConteggio: false,
    };
  }

  global.InglyRedditivitaMacchina = {
    VERSIONE: VERSIONE,
    NON_ATTRIBUIBILE: NON_ATTRIBUIBILE,
    quotaPerMacchina: quotaPerMacchina,
    per: per,
  };
})(typeof window !== 'undefined' ? window : globalThis);

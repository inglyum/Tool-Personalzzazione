/* ═══════════════════════════════════════════════════════════════════════════
   SCOSTAMENTO — preventivato contro reale
   ═══════════════════════════════════════════════════════════════════════════

   La domanda che chiude il cerchio: il lavoro è andato come l'avevo
   preventivato? Finché la risposta non esiste, ogni preventivo successivo
   ripete gli stessi errori con la stessa sicurezza.

   I due numeri ci sono già ed è per questo che questo modulo è piccolo:
   il **preventivato** sta nello snapshot congelato della riga d'ordine
   (`snapshot.trueCost`, `snapshot.netPrice`), il **reale** nei costi
   registrati sulla commessa (`InglyActualCost`, già `RealCostEngine`).
   Qui si fa la sottrazione, e la si fa in un posto solo.

   Puro: riceve i due numeri, non li va a cercare. Chi li ha, li passa.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };

  /** Margine sul ricavo. Se non c'è ricavo non c'è margine — e restituire
      zero direbbe «margine nullo» invece di «domanda senza risposta». */
  function margine(ricavo, costo) {
    var r = num(ricavo);
    if (!(r > 0)) return null;
    return ((r - num(costo)) / r) * 100;
  }

  /**
   * @param {object} preventivato  { costo, prezzo, quantita }
   * @param {object} reale         { costo, prezzo, quantita }
   */
  function confronta(preventivato, reale) {
    var p = preventivato || {};
    var a = reale || {};

    var qP = Math.max(1, num(p.quantita, 1));
    var qR = a.quantita != null ? Math.max(1, num(a.quantita)) : qP;

    var costoP = num(p.costo) * qP;
    var costoR = a.costo != null ? num(a.costo) * qR : null;
    var ricavoP = num(p.prezzo) * qP;
    var ricavoR = a.prezzo != null ? num(a.prezzo) * qR : ricavoP;

    /* Senza costo reale non si inventa uno scostamento nullo: si dichiara che
       il consuntivo non è stato registrato. È la differenza fra «è andata come
       previsto» e «non lo so», e confonderle è il modo in cui un laboratorio
       resta convinto di guadagnare. */
    if (costoR == null) {
      return {
        disponibile: false,
        motivo: 'nessun costo reale registrato su questa commessa',
        cosaFare: 'Registra i costi sostenuti (materiale, ore, extra) per poter confrontare.',
        preventivato: { costo: costoP, ricavo: ricavoP, profitto: ricavoP - costoP, margine: margine(ricavoP, costoP) },
      };
    }

    var profittoP = ricavoP - costoP;
    var profittoR = ricavoR - costoR;
    var margineP = margine(ricavoP, costoP);
    var margineR = margine(ricavoR, costoR);

    return {
      disponibile: true,
      preventivato: { costo: costoP, ricavo: ricavoP, profitto: profittoP, margine: margineP },
      reale: { costo: costoR, ricavo: ricavoR, profitto: profittoR, margine: margineR },
      /* Positivo = ha superato il preventivo, cioè è costato di più. Il segno
         è dichiarato qui perché «scostamento +12 €» senza convenzione si legge
         nei due modi opposti. */
      scostamento: {
        costo: costoR - costoP,
        costoPct: costoP > 0 ? ((costoR - costoP) / costoP) * 100 : null,
        ricavo: ricavoR - ricavoP,
        profitto: profittoR - profittoP,
        margine: (margineR != null && margineP != null) ? margineR - margineP : null,
        convenzione: 'positivo = più del preventivato',
      },
      verdetto: verdetto(profittoR, profittoP, costoR, costoP),
    };
  }

  function verdetto(profittoR, profittoP, costoR, costoP) {
    if (profittoR < 0) return { id: 'perdita', label: 'Chiuso in perdita', colore: 'rosso' };
    var scarto = costoP > 0 ? (costoR - costoP) / costoP : 0;
    if (scarto > 0.20) return { id: 'sforato', label: 'Costo oltre il 20% del preventivo', colore: 'rosso' };
    if (scarto > 0.05) return { id: 'sopra', label: 'Costato più del preventivo', colore: 'arancione' };
    if (scarto < -0.05) return { id: 'sotto', label: 'Costato meno del preventivo', colore: 'verde' };
    return { id: 'centrato', label: 'In linea con il preventivo', colore: 'verde' };
  }

  /** Il preventivato letto dallo snapshot di una riga d'ordine: lo snapshot è
      congelato, quindi questa lettura non cambia nel tempo — che è tutto il
      punto di averlo congelato. */
  function daSnapshot(riga) {
    var r = riga || {};
    var s = r.snapshot || {};
    return {
      costo: num(s.trueCost, num(r.cpz)),
      prezzo: num(s.netPrice, num(r.ppz)),
      quantita: Math.max(1, num(r.qty, 1)),
    };
  }

  /** La somma degli scostamenti di più righe: un ordine, non una riga sola. */
  function totale(confronti) {
    var validi = (confronti || []).filter(function (c) { return c && c.disponibile; });
    if (!validi.length) return { disponibile: false, motivo: 'nessuna riga con consuntivo registrato' };
    var somma = function (chi, campo) {
      return validi.reduce(function (a, c) { return a + num(c[chi][campo]); }, 0);
    };
    var costoP = somma('preventivato', 'costo'), costoR = somma('reale', 'costo');
    var ricavoP = somma('preventivato', 'ricavo'), ricavoR = somma('reale', 'ricavo');
    return {
      disponibile: true,
      righe: validi.length,
      preventivato: { costo: costoP, ricavo: ricavoP, profitto: ricavoP - costoP, margine: margine(ricavoP, costoP) },
      reale: { costo: costoR, ricavo: ricavoR, profitto: ricavoR - costoR, margine: margine(ricavoR, costoR) },
      scostamento: {
        costo: costoR - costoP,
        costoPct: costoP > 0 ? ((costoR - costoP) / costoP) * 100 : null,
        profitto: (ricavoR - costoR) - (ricavoP - costoP),
        convenzione: 'positivo = più del preventivato',
      },
    };
  }

  global.InglyScostamento = {
    VERSIONE: '1.0.0',
    confronta: confronta,
    daSnapshot: daSnapshot,
    totale: totale,
    margine: margine,
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ═══════════════════════════════════════════════════════════════════════════
   COST-PROFILES — manodopera, spese generali, imballo
   ═══════════════════════════════════════════════════════════════════════════

   Il motore di costo sa già usare questi tre numeri: `laborPerHour`,
   `overheadPerHour` / `overheadPct` / `overheadPerJob`, `packagingItems[]`.
   Quello che mancava era qualcuno che glieli desse.

   Misurato prima di scrivere questo file, su un preventivo 3D reale — 250 g di
   PLA in 9,95 ore:

       overheadPerHour  0        overheadPct  0        overheadPerJob  0
       materialWasteRate 0       packagingItems  (assenti)
       laborPerHour     18       ← scritto nel markup del preventivatore

   Le spese generali del laboratorio — affitto, corrente di struttura, software,
   commercialista — non entravano in nessun preventivo. Non perché il motore non
   sappia contarle: perché nessuno gliele passava. E la manodopera valeva 18 €/h
   perché 18 era il numero scritto nel campo, non perché qualcuno avesse deciso
   quanto costa un'ora di lavoro in questo laboratorio.

   ── Tre cose che questo file tiene separate, e perché ─────────────────────

   1. **Costo interno ≠ tariffa cliente.** Un'ora di operatore costa
      all'azienda una cifra (retribuzione più oneri, divisa per le ore
      davvero produttive) e si vende a un'altra. Confonderle significa o
      regalare margine o non sapere di averlo perso. Il costo entra nel
      preventivo; la tariffa serve a rispondere a «quanto rendo all'ora».

   2. **Le tre modalità di overhead non si sommano.** €/ora, €/lavoro e
      percentuale sono tre modi di dire la stessa cosa. Sommarne due conta
      l'affitto due volte. Il profilo ne dichiara **una**, e questo file
      restituisce solo quella.

   3. **L'imballo per pezzo e per ordine sono voci diverse.** Una scatola per
      spedizione si paga una volta; il sacchetto si paga per ogni pezzo.
      Il motore li vuole già distinti: qui si tengono distinti.

   ── I predefiniti sono predefiniti, e lo dicono ──────────────────────────

   Nessuno dei numeri qui dentro è un dato di INGLY. Sono valori di partenza
   perché un preventivatore senza profilo non deve rispondere zero — rispondere
   zero è peggio che rispondere approssimativamente, perché zero sembra un
   conto finito. Ognuno esce con `confidence: 'estimated'` e con
   `predefinito: true`, e la vista deve dirlo. Quando l'utente registra i
   propri, la confidenza sale a `declared`.

   Questo file è **puro**: nessun DOM, nessun `localStorage`, nessuna `Date`.
   Riceve i profili, non va a prenderli — chi li conserva è
   `cost-profiles-store.js`. È la stessa disciplina del motore, per la stessa
   ragione: un preventivo deve poter essere ricalcolato identico domani.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  var num = function (v, d) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : (d == null ? 0 : d);
  };
  var pos = function (v, d) { return Math.max(0, num(v, d)); };

  /* ── MANODOPERA ─────────────────────────────────────────────────────────
     Il costo interno di un'ora non è la paga oraria: è la paga più gli oneri,
     divisa per le ore **davvero produttive**. Un operatore pagato per 8 ore
     che ne produce 6 costa, all'ora prodotta, un terzo in più di quanto dice
     la busta paga. È il numero che serve al preventivo, ed è il motivo per cui
     `oreProduttive` sta in questo profilo. */
  var MANODOPERA_PREDEFINITA = [
    { id: 'operatore', label: 'Operatore di produzione', costoOrarioInterno: 18, tariffaCliente: 35 },
    { id: 'laser', label: 'Operatore laser', costoOrarioInterno: 20, tariffaCliente: 40 },
    { id: 'stampa3d', label: 'Operatore stampa 3D', costoOrarioInterno: 18, tariffaCliente: 35 },
    { id: 'uv', label: 'Operatore stampa UV', costoOrarioInterno: 20, tariffaCliente: 40 },
    { id: 'dtf', label: 'Operatore DTF e tessile', costoOrarioInterno: 18, tariffaCliente: 35 },
    { id: 'finitura', label: 'Finitura e assemblaggio', costoOrarioInterno: 16, tariffaCliente: 30 },
    { id: 'qc', label: 'Controllo qualità', costoOrarioInterno: 18, tariffaCliente: 35 },
    { id: 'imballo', label: 'Confezionamento', costoOrarioInterno: 15, tariffaCliente: 28 },
    { id: 'design', label: 'Progettazione e grafica', costoOrarioInterno: 25, tariffaCliente: 50 },
  ];

  /* ── SPESE GENERALI ─────────────────────────────────────────────────────
     Le voci sono quelle che un laboratorio paga anche a macchine ferme. Il
     valore predefinito è **zero** su ognuna: un affitto inventato sarebbe un
     costo inventato, e il §43 vale anche per i costi propri. Zero e dichiarato
     è onesto; 500 € «di solito» non lo è. */
  var SPESE_PREDEFINITE = [
    { id: 'affitto', label: 'Affitto e spese del locale', mensile: 0 },
    { id: 'utenze', label: 'Utenze non imputate alla macchina', mensile: 0 },
    { id: 'internet', label: 'Internet e telefonia', mensile: 0 },
    { id: 'assicurazioni', label: 'Assicurazioni', mensile: 0 },
    { id: 'software', label: 'Software e licenze', mensile: 0 },
    { id: 'amministrazione', label: 'Commercialista e amministrazione', mensile: 0 },
    { id: 'pulizia', label: 'Pulizia e manutenzione del laboratorio', mensile: 0 },
    { id: 'attrezzatura', label: 'Attrezzatura minuta e utensili', mensile: 0 },
    { id: 'altro', label: 'Altre spese generali', mensile: 0 },
  ];

  var MODI_OVERHEAD = ['ora', 'lavoro', 'percento', 'nessuno'];

  /* ── IMBALLO ────────────────────────────────────────────────────────────
     Prezzi di partenza volutamente bassi e tondi: sono ordini di grandezza da
     sostituire con il prezzo pagato, non stime da difendere. `per` distingue
     ciò che si paga a pezzo da ciò che si paga a spedizione. */
  var IMBALLO_PREDEFINITO = [
    { id: 'sacchetto', label: 'Sacchetto trasparente', per: 'pezzo', costo: 0.05 },
    { id: 'etichetta', label: 'Etichetta adesiva', per: 'pezzo', costo: 0.03 },
    { id: 'cartoncino', label: 'Cartoncino di ringraziamento', per: 'ordine', costo: 0.15 },
    { id: 'pluriball', label: 'Pluriball', per: 'pezzo', costo: 0.10 },
    { id: 'scatola', label: 'Scatola di spedizione', per: 'ordine', costo: 0.60 },
    { id: 'nastro', label: 'Nastro e riempitivo', per: 'ordine', costo: 0.10 },
  ];

  function normalizzaManodopera(righe) {
    var base = Array.isArray(righe) && righe.length ? righe : MANODOPERA_PREDEFINITA;
    var predefinito = !(Array.isArray(righe) && righe.length);
    return base.map(function (r) {
      var lordo = pos(r.costoOrarioInterno != null ? r.costoOrarioInterno : r.hourlyCost);
      var oneri = pos(r.oneriPct) / 100;
      var oreAnno = pos(r.oreAnnue);
      var oreProduttive = pos(r.oreProduttive);
      /* Se sono dichiarate le ore annue e quelle davvero produttive, il costo
         orario si ricalcola su queste ultime: è la differenza fra «quanto lo
         pago» e «quanto mi costa un'ora di lavoro fatto». */
      var costo = lordo * (1 + oneri);
      var suOreProduttive = false;
      if (oreAnno > 0 && oreProduttive > 0 && oreProduttive <= oreAnno) {
        costo = costo * (oreAnno / oreProduttive);
        suOreProduttive = true;
      }
      return {
        id: r.id, label: r.label || r.id,
        costoOrarioInterno: Math.round(costo * 100) / 100,
        costoOrarioBase: lordo,
        tariffaCliente: pos(r.tariffaCliente != null ? r.tariffaCliente : r.billingRate),
        suOreProduttive: suOreProduttive,
        predefinito: predefinito,
        confidence: predefinito ? 'estimated' : 'declared',
      };
    });
  }

  function manodopera(righe, id) {
    var l = normalizzaManodopera(righe);
    if (id == null) return l;
    for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
    return l[0] || null;
  }

  /* ── L'overhead, in una modalità sola ────────────────────────────────────
     Restituisce i tre campi che il motore conosce, con **due su tre a zero**.
     Non è una semplificazione: è la regola del §21 resa strutturale. Chi
     riceve questo oggetto non può sommare due modalità perché non ne ha due. */
  function overhead(profilo) {
    var p = profilo || {};
    var voci = Array.isArray(p.voci) && p.voci.length ? p.voci : SPESE_PREDEFINITE;
    var predefinito = !(Array.isArray(p.voci) && p.voci.length);
    var mensile = voci.reduce(function (a, v) { return a + pos(v.mensile); }, 0);
    var annuo = mensile * 12;

    var modo = MODI_OVERHEAD.indexOf(p.modo) >= 0 ? p.modo : 'ora';
    var oreAnnue = pos(p.oreProduttiveAnnue);

    var out = {
      mensile: mensile, annuo: annuo, modo: modo,
      overheadPerHour: 0, overheadPerJob: 0, overheadPct: 0,
      voci: voci.map(function (v) {
        return { id: v.id, label: v.label || v.id, mensile: pos(v.mensile) };
      }),
      predefinito: predefinito && mensile === 0,
      confidence: (predefinito || mensile === 0) ? 'estimated' : 'declared',
      avvisi: [],
    };

    if (mensile === 0) {
      out.avvisi.push('Spese generali non configurate: affitto, utenze e software non entrano in nessun preventivo');
      out.confidence = 'missing';
      return out;
    }

    if (modo === 'ora') {
      if (oreAnnue > 0) {
        out.overheadPerHour = annuo / oreAnnue;
      } else {
        out.avvisi.push('Ore produttive annue non dichiarate: le spese generali non sono ripartibili a ora');
        out.confidence = 'missing';
      }
    } else if (modo === 'lavoro') {
      var lavoriAnnui = pos(p.lavoriAnnui);
      if (lavoriAnnui > 0) out.overheadPerJob = annuo / lavoriAnnui;
      else {
        out.avvisi.push('Numero di lavori annui non dichiarato: le spese generali non sono ripartibili a lavoro');
        out.confidence = 'missing';
      }
    } else if (modo === 'percento') {
      out.overheadPct = pos(p.percentuale);
      if (!(out.overheadPct > 0)) {
        out.avvisi.push('Percentuale di spese generali non dichiarata');
        out.confidence = 'missing';
      }
    }
    return out;
  }

  /* ── L'imballo ──────────────────────────────────────────────────────────
     Il motore vuole `packagingItems[]` con `qty` e `unitCost`, e li conta per
     pezzo. Quello che si paga per ordine va diviso per la quantità **prima**
     di entrare, altrimenti una scatola da 60 centesimi diventa 60 centesimi
     per ognuno dei cento pezzi. */
  function imballo(righe, opzioni) {
    var o = opzioni || {};
    var qty = Math.max(1, pos(o.quantita, 1));
    var base = Array.isArray(righe) && righe.length ? righe : [];
    var scelti = base.filter(function (r) { return r.attivo !== false && pos(r.costo) > 0; });

    var perPezzo = [];
    var perOrdine = [];
    scelti.forEach(function (r) {
      var voce = {
        id: r.id, name: r.label || r.id,
        qty: Math.max(1, pos(r.quantita, 1)),
        unitCost: pos(r.costo),
        per: r.per === 'ordine' ? 'ordine' : 'pezzo',
      };
      if (voce.per === 'ordine') perOrdine.push(voce); else perPezzo.push(voce);
    });

    /* Le voci per ordine entrano nel motore già divise, e dichiarano nel nome
       come sono state ripartite: chi legge il dettaglio deve poterlo capire
       senza rifare il conto. */
    var ripartite = perOrdine.map(function (v) {
      return {
        id: v.id, name: v.name + (qty > 1 ? ' (÷ ' + qty + ')' : ''),
        qty: v.qty, unitCost: v.unitCost / qty, per: 'ordine', ripartitaSu: qty,
      };
    });

    var totalePerPezzo = perPezzo.reduce(function (a, v) { return a + v.qty * v.unitCost; }, 0);
    var totalePerOrdine = perOrdine.reduce(function (a, v) { return a + v.qty * v.unitCost; }, 0);

    return {
      packagingItems: perPezzo.concat(ripartite),
      perPezzo: perPezzo, perOrdine: perOrdine,
      totalePerPezzo: totalePerPezzo,
      totalePerOrdine: totalePerOrdine,
      costoPerPezzo: totalePerPezzo + (qty > 0 ? totalePerOrdine / qty : 0),
      quantita: qty,
      confidence: scelti.length ? 'declared' : 'missing',
      avvisi: scelti.length ? [] : ['Nessun imballo configurato: il costo di confezionamento non entra nel preventivo'],
    };
  }

  /* ── Quello che il motore riceve ────────────────────────────────────────
     Un solo punto che traduce i tre profili nei campi che `InglyCostEngine`
     conosce già. Serve a non avere quattro moduli che compongono l'ingresso
     ognuno a modo suo — è il difetto che questo progetto ha già pagato. */
  function ingresso(profili, opzioni) {
    var p = profili || {};
    var o = opzioni || {};
    var lav = manodopera(p.manodopera, o.ruolo || 'operatore');
    var ov = overhead(p.overhead);
    var im = imballo(p.imballo, { quantita: o.quantita });

    return {
      laborPerHour: lav ? lav.costoOrarioInterno : 0,
      overheadPerHour: ov.overheadPerHour,
      overheadPerJob: ov.overheadPerJob,
      overheadPct: ov.overheadPct,
      packagingItems: im.packagingItems,
      _fonti: {
        manodopera: lav ? lav.confidence : 'missing',
        overhead: ov.confidence,
        imballo: im.confidence,
      },
      _avvisi: ov.avvisi.concat(im.avvisi),
      _predefiniti: {
        manodopera: lav ? !!lav.predefinito : true,
        overhead: !!ov.predefinito,
      },
    };
  }

  global.InglyCostProfiles = {
    VERSIONE: VERSIONE,
    MANODOPERA_PREDEFINITA: MANODOPERA_PREDEFINITA,
    SPESE_PREDEFINITE: SPESE_PREDEFINITE,
    IMBALLO_PREDEFINITO: IMBALLO_PREDEFINITO,
    MODI_OVERHEAD: MODI_OVERHEAD,
    manodopera: manodopera,
    overhead: overhead,
    imballo: imballo,
    ingresso: ingresso,
  };
})(typeof window !== 'undefined' ? window : globalThis);

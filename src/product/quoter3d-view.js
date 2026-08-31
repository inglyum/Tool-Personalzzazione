/* ═══════════════════════════════════════════════════════════════════════════
   SMART QUOTER 3D · la vista che mostra quello che il motore sa
   ═══════════════════════════════════════════════════════════════════════════

   Due difetti misurati nella vista precedente, entrambi di comunicazione e
   nessuno di aritmetica.

   1. **Il prezzo lo calcolava la vista.** `PRICES = {p1: costo × 3.5, …}`.
      Lo slider «margine» esisteva, andava dal 10 all'80%, ed era usato solo
      per un avviso: non comandava niente. Chi impostava il 40% otteneva un
      prezzo con margine 71,4% — misurato su un costo di 18,68 €: 65,38 €
      invece di 31,13 €, il 110% in più di quanto avesse chiesto.

   2. **Una sola risposta a tre domande.** Il costo mostrato era quello
      aziendale pieno, e chi lo confrontava con lo slicer concludeva che il
      preventivatore sbagliasse. Il motore ora sa distinguere costo di stampa,
      di produzione e aziendale pieno; questa vista lo dice.

   Da qui in poi: la vista legge, il motore calcola, la vista disegna. Non c'è
   una sola moltiplicazione di prezzo in questo file, e un test lo verifica.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var esc = function (s) {
    return (global.InglyUI && global.InglyUI.esc)
      ? global.InglyUI.esc(s)
      : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
  };
  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };
  var eu = function (n) { return n == null ? '—' : '€ ' + (Math.round(num(n) * 100) / 100).toFixed(2); };
  var pc = function (n) { return n == null ? '—' : num(n).toFixed(1) + '%'; };

  function M() { return global.InglyCostEngine; }

  /* Le tre modalità sono i tre livelli del motore, con il nome che usa chi
     lavora. Non aggiungono né tolgono matematica: scelgono a quale domanda si
     sta rispondendo. */
  var MODALITA = [
    { id: 'stampa', label: 'Hobby', sotto: 'quanto consuma la macchina' },
    { id: 'macchina', label: 'Maker', sotto: 'quanto ti costa produrlo' },
    { id: 'completo', label: 'Business', sotto: 'quanto devi rientrare' },
  ];

  var ICONE = {
    materiale: '🧵', energia: '⚡', macchina: '🏭', manutenzione: '🔧',
    manodopera: '👤', postProcesso: '🚿', finitura: '✋', scarto: '📉',
    setup: '⚙️', overhead: '🏢', packaging: '📦', extra: '✨',
  };

  /* ── Le fonti ──────────────────────────────────────────────────────────────
     Ogni numero deve poter dire da dove viene. «Predefinito» non è una
     vergogna: è un'informazione, e nasconderla è il modo in cui un valore
     inventato tre anni fa sopravvive per sempre. */
  var FONTI = {
    inventario: { label: 'Magazzino', breve: 'inventario' },
    resolver: { label: 'Costo reale dal registro', breve: 'registro' },
    macchina: { label: 'Profilo macchina', breve: 'macchina' },
    slicer: { label: 'Dallo slicer', breve: 'slicer' },
    utente: { label: 'Inserito da te', breve: 'tuo' },
    misurato: { label: 'Misurato', breve: 'misurato' },
    predefinito: { label: 'Valore predefinito', breve: 'predefinito' },
  };

  function badgeFonte(id) {
    var f = FONTI[id] || FONTI.predefinito;
    return '<span title="' + esc(f.label) + '" style="font-size:9px;padding:1px 6px;border-radius:99px;'
      + 'background:var(--bg-card);border:1px solid var(--border);color:var(--text-dim);font-weight:600">'
      + esc(f.breve) + '</span>';
  }

  /* ── SEZIONE C · il risultato ──────────────────────────────────────────────
     Quattro numeri, e la relazione fra loro. Il costo di stampa accanto al
     costo pieno è tutta la risposta alla domanda «perché non torna con
     Bambu»: si vedono insieme, e la domanda smette di porsi. */
  function hero(r) {
    if (!r || r.indisponibile) {
      return '<div style="padding:24px;text-align:center;color:var(--text-dim);font-size:12px">'
        + esc((r && r.motivo) || 'Inserisci peso e ore di stampa') + '</div>';
    }
    var cella = function (etichetta, valore, colore, nota) {
      return '<div style="flex:1;min-width:130px;padding:12px 14px;background:var(--bg-card2);border-radius:12px;border:1px solid var(--border)">'
        + '<div style="font-size:9px;text-transform:uppercase;letter-spacing:.6px;color:var(--text-dim);margin-bottom:4px">' + esc(etichetta) + '</div>'
        + '<div style="font-size:21px;font-weight:900;color:' + colore + ';line-height:1.1">' + esc(valore) + '</div>'
        + (nota ? '<div style="font-size:10px;color:var(--text-muted);margin-top:3px">' + esc(nota) + '</div>' : '')
        + '</div>';
    };
    return '<div style="display:flex;gap:10px;flex-wrap:wrap">'
      + cella('Costo di stampa', eu(r.costoStampa), 'var(--text-muted)', 'materiale ed energia')
      + cella('Costo ' + r.modalitaLabel.toLowerCase(), eu(r.costo), 'var(--text)', r.modalitaSotto)
      + cella('Prezzo consigliato', eu(r.prezzo), 'var(--primary)', 'margine ' + pc(r.marginePct))
      + cella('Profitto', eu(r.profitto), r.profitto > 0 ? 'var(--green,#22c55e)' : 'var(--red,#ef4444)', 'per pezzo')
      + '</div>';
  }

  /* ── SEZIONE D · dove vanno i soldi ────────────────────────────────────── */
  function dettaglio(r) {
    if (!r || r.indisponibile || !r.voci.length) return '';
    var totale = r.costo || 1;
    var righe = r.voci.map(function (v) {
      var quota = (v.value / totale) * 100;
      return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">'
        + '<span style="width:20px;text-align:center">' + (ICONE[v.id] || '•') + '</span>'
        + '<span style="flex:1;font-size:12px">' + esc(v.label)
        + (v.detail ? ' <small style="color:var(--text-dim)">· ' + esc(v.detail) + '</small>' : '')
        + ' ' + badgeFonte(v.fonte) + '</span>'
        + '<span style="width:56px;text-align:right;font-size:11px;color:var(--text-dim)">' + esc(quota.toFixed(0)) + '%</span>'
        + '<span style="width:70px;text-align:right;font-size:12px;font-weight:700">' + esc(eu(v.value)) + '</span>'
        + '</div>';
    }).join('');

    var fuori = (r.escluse || []).length
      ? '<div style="margin-top:10px;padding:9px 11px;background:var(--bg-card);border-radius:9px;border:1px dashed var(--border)">'
        + '<div style="font-size:10px;color:var(--text-dim);margin-bottom:4px">Questa modalità non conta:</div>'
        + r.escluse.map(function (v) {
          return '<span style="font-size:11px;color:var(--text-muted);margin-right:10px">' + (ICONE[v.id] || '•') + ' '
            + esc(v.label) + ' ' + esc(eu(v.value)) + '</span>';
        }).join('')
        + '<div style="font-size:10px;color:var(--text-dim);margin-top:5px">In tutto ' + esc(eu(r.esclusoTotale))
        + ' — passa a Business per contarli.</div></div>'
      : '';

    return righe + fuori;
  }

  /* ── SEZIONE E · le quattro offerte ────────────────────────────────────────
     Ogni politica punta a un **margine**, non a un moltiplicatore. È la
     correzione che rende lo slider vero: chi chiede il 40% ottiene il 40%. */
  function strategie(r) {
    if (!r || r.indisponibile || !r.strategie) return '';
    return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">'
      + r.strategie.map(function (s) {
        var attiva = s.raccomandata;
        return '<div style="padding:12px;border-radius:12px;background:var(--bg-card2);border:1.5px solid '
          + (attiva ? 'var(--primary)' : 'var(--border)') + '">'
          + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">'
          + '<span style="font-size:11px;font-weight:800;color:' + (attiva ? 'var(--primary)' : 'var(--text)') + '">' + esc(s.label) + '</span>'
          + (attiva ? '<span style="font-size:8px;padding:1px 6px;border-radius:99px;background:var(--primary);color:#000;font-weight:800">CONSIGLIATA</span>' : '')
          + '</div>'
          + '<div style="font-size:19px;font-weight:900;color:var(--text);line-height:1.1">' + esc(eu(s.prezzo)) + '</div>'
          + '<div style="font-size:10px;color:var(--text-muted);margin-top:4px">margine ' + esc(pc(s.marginePct))
          + ' · ricarico ' + esc(pc(s.ricaricoPct)) + '</div>'
          + '<div style="font-size:10px;color:var(--text-muted)">profitto ' + esc(eu(s.profitto)) + '</div>'
          + '</div>';
      }).join('')
      + '</div>';
  }

  /* ── SEZIONE F · le quantità ───────────────────────────────────────────────
     L'avviamento si divide, il pezzo no: è la ragione per cui il prezzo scende
     con la quantità, e non una tabella di sconti. Le tre evidenziazioni
     rispondono a tre domande diverse, e nessuna è «la quantità più alta». */
  function quantita(r) {
    if (!r || r.indisponibile || !r.scaglioni || !r.scaglioni.length) return '';
    var migliori = r.miglioriScaglioni || {};
    var etichetta = function (q) {
      var e = [];
      if (migliori.unitario === q) e.push(['miglior costo unitario', 'var(--green,#22c55e)']);
      if (migliori.profitto === q) e.push(['profitto totale più alto', 'var(--primary)']);
      if (migliori.cliente === q) e.push(['prezzo migliore per il cliente', '#38bdf8']);
      return e;
    };
    return '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:520px">'
      + '<thead><tr style="border-bottom:1px solid var(--border)">'
      + ['Qtà', 'Costo/pz', 'Prezzo/pz', 'Totale', 'Profitto', 'Margine'].map(function (h, i) {
        return '<th style="padding:7px 9px;font-size:9px;text-transform:uppercase;color:var(--text-dim);text-align:' + (i ? 'right' : 'left') + '">' + esc(h) + '</th>';
      }).join('') + '</tr></thead><tbody>'
      + r.scaglioni.map(function (s) {
        var e = etichetta(s.qty);
        return '<tr style="border-bottom:1px solid var(--border)">'
          + '<td style="padding:7px 9px;font-weight:800;font-size:12px">' + esc(s.qty)
          + e.map(function (x) { return '<div style="font-size:8px;font-weight:700;color:' + x[1] + '">' + esc(x[0]) + '</div>'; }).join('')
          + '</td>'
          + ['costoPezzo', 'prezzoPezzo', 'totaleNetto', 'profitto'].map(function (k) {
            return '<td style="padding:7px 9px;text-align:right;font-size:12px">' + esc(eu(s[k])) + '</td>';
          }).join('')
          + '<td style="padding:7px 9px;text-align:right;font-size:12px">' + esc(pc(s.marginePct)) + '</td>'
          + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ── SEZIONE G · la calibrazione ───────────────────────────────────────── */
  function calibrazione(k) {
    if (!k || !k.confrontabile) {
      return '<div style="font-size:11px;color:var(--text-dim)">Inserisci un costo di riferimento per confrontarlo.</div>';
    }
    var righe = k.livelli.map(function (l) {
      var uguale = l.id === k.corrispondente.id;
      return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">'
        + '<span style="flex:1;font-size:12px;color:' + (uguale ? 'var(--text)' : 'var(--text-muted)') + ';font-weight:' + (uguale ? '700' : '400') + '">'
        + esc(l.label) + (uguale ? ' <small style="color:var(--primary)">← stessa domanda</small>' : '') + '</span>'
        + '<span style="width:74px;text-align:right;font-size:12px">' + esc(eu(l.costo)) + '</span>'
        + '<span style="width:74px;text-align:right;font-size:11px;color:' + (Math.abs(l.delta) < 0.01 ? 'var(--green,#22c55e)' : 'var(--text-dim)') + '">'
        + esc((l.delta > 0 ? '+' : '') + eu(l.delta)) + '</span>'
        + '</div>';
    }).join('');

    return '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">'
      + 'Il riferimento è <strong style="color:var(--text)">' + esc(eu(k.riferimento.costo)) + '</strong> da '
      + esc(k.riferimento.sistema) + '.</div>'
      + righe
      + '<div style="margin-top:10px;padding:10px 12px;background:var(--bg-card);border-radius:9px;border-left:3px solid var(--primary)">'
      + '<div style="font-size:11px;font-weight:800;color:var(--text);margin-bottom:4px">Perché sono diversi</div>'
      + '<div style="font-size:11px;color:var(--text-muted);line-height:1.55">'
      + 'Il riferimento corrisponde a <strong style="color:var(--text)">' + esc(k.corrispondente.label.toLowerCase()) + '</strong>: '
      + 'gli slicer mostrano quello che consuma la macchina, non il tuo tempo né l\'usura.'
      + (k.materialeImplicito != null
        ? '<br>Il riferimento implica un materiale a <strong style="color:var(--text)">' + esc(eu(k.materialeImplicito)) + '/kg</strong>: '
          + 'se il tuo prezzo è diverso, la differenza è quasi tutta lì.'
        : '')
      + '</div></div>';
  }

  /**
   * Il calcolo completo per la vista. **Nessuna moltiplicazione di prezzo
   * qui**: si chiede al motore, tre volte, e si mette in ordine il risultato.
   */
  function calcola(ingresso, opzioni) {
    var E = M();
    var o = opzioni || {};
    if (!E) return { indisponibile: true, motivo: 'Motore di costo non disponibile' };

    var modalita = MODALITA.filter(function (m) { return m.id === o.modalita; })[0] || MODALITA[2];
    var c = E.calcola(Object.assign({}, ingresso, { livelloCosto: modalita.id }));
    if (c.vuoto) return { indisponibile: true, motivo: c.motivo || 'dati insufficienti' };
    if (!(c.costoPezzo > 0)) return { indisponibile: true, motivo: 'Inserisci peso e ore di stampa' };

    /* Il costo di stampa si chiede al motore con l'altro livello: due domande,
       due chiamate, nessun conto rifatto a mano. */
    var stampa = E.calcola(Object.assign({}, ingresso, { livelloCosto: 'stampa' }));

    var opzPrezzo = {
      strategia: 'margine',
      marginePct: num(o.marginePct, 40),
      ivaPct: num(o.ivaPct, 0),
      marginePavimentoPct: o.marginePavimentoPct,
      scontoPct: num(o.scontoPct, 0),
    };
    var p = E.prezzo(c.costoPezzo, opzPrezzo);

    /* Le posizioni commerciali, con i margini che l'azienda ha configurato:
       chi lavora su commesse lunghe e chi vende in fiera non hanno lo stesso
       «standard», e un margine scritto nel motore non è configurabile. Un
       moltiplicatore non compare da nessuna parte.

       «Su misura» prende il margine impostato dall'utente invece del proprio:
       è ciò che la rende una posizione dichiarata e non un margine fuori
       politica passato in silenzio. */
    var strategieCalcolate = (E.politiche ? E.politiche(o.margini) : Object.keys(E.POLITICHE).map(function (k) { return E.POLITICHE[k]; })).map(function (pol) {
      var k = pol.id;
      var obiettivo = pol.apertaAllUtente && o.marginePct != null ? num(o.marginePct, pol.marginTarget) : pol.marginTarget;
      var pr = E.prezzo(c.costoPezzo, Object.assign({}, opzPrezzo, { marginePct: obiettivo }));
      return {
        id: k, label: pol.label, marginTarget: obiettivo,
        apertaAllUtente: !!pol.apertaAllUtente,
        prezzo: pr.netto, profitto: pr.profittoLordo,
        marginePct: pr.marginePct, ricaricoPct: pr.ricaricoPct,
        /* Lordo e IVA per la card: l'IVA la scorpora il motore, non la vista. */
        prezzoLordo: pr.lordo, iva: pr.iva,
        raccomandata: !!pol.recommended,
      };
    });

    var scaglioni = E.scaglioni(ingresso, o.quantita, opzPrezzo) || [];
    var validi = scaglioni.filter(function (s) { return !s.vuoto && s.prezzoPezzo > 0; });
    var miglioriScaglioni = validi.length ? {
      unitario: validi.slice().sort(function (a, b) { return a.costoPezzo - b.costoPezzo; })[0].qty,
      profitto: validi.slice().sort(function (a, b) { return (b.profitto * b.qty) - (a.profitto * a.qty); })[0].qty,
      cliente: validi.slice().sort(function (a, b) { return a.prezzoPezzo - b.prezzoPezzo; })[0].qty,
    } : {};

    /* La fonte di ogni voce: dichiarata da chi ha costruito l'ingresso, mai
       dedotta. `fonti` arriva dalla vista che sa da dove ha preso i numeri. */
    var fonti = o.fonti || {};
    var voci = c.perPezzo.voci.map(function (v) {
      return { id: v.id, label: v.label, value: v.value, detail: v.detail, fonte: fonti[v.id] || 'predefinito' };
    });
    if (c.unaTantum.perPezzo > 0) {
      voci.push({ id: 'setup', label: 'Avviamento ripartito', value: c.unaTantum.perPezzo,
        detail: 'diviso per ' + c.qty, fonte: fonti.setup || 'utente' });
    }
    if (c.overhead > 0) voci.push({ id: 'overhead', label: 'Spese generali', value: c.overhead, detail: c.overheadModo, fonte: 'utente' });

    return {
      indisponibile: false,
      modalita: modalita.id, modalitaLabel: modalita.label, modalitaSotto: modalita.sotto,
      costo: c.costoPezzo,
      costoStampa: stampa.vuoto ? null : stampa.costoPezzo,
      voci: voci,
      escluse: c.escluse || [],
      esclusoTotale: c.esclusoTotale || 0,
      prezzo: p.netto, prezzoLordo: p.lordo, iva: p.iva,
      profitto: p.profittoLordo, profittoOperativo: p.profittoOperativo,
      marginePct: p.marginePct, ricaricoPct: p.ricaricoPct,
      pavimentoScattato: p.pavimentoScattato,
      strategie: strategieCalcolate,
      scaglioni: validi, miglioriScaglioni: miglioriScaglioni,
      avvisi: E.avvisi(c.costoPezzo, p, ingresso),
      versione: E.version,
      _costo: c, _prezzo: p,
    };
  }

  global.InglyQuoter3DView = {
    MODALITA: MODALITA,
    FONTI: FONTI,
    calcola: calcola,
    hero: hero,
    dettaglio: dettaglio,
    strategie: strategie,
    quantita: quantita,
    calibrazione: calibrazione,
    badgeFonte: badgeFonte,
  };
})(typeof window !== 'undefined' ? window : globalThis);

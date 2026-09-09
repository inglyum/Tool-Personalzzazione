/* ═══════════════════════════════════════════════════════════════════════════
   ECONOMIA ORDINE — la distinta, aperta e modificabile
   ═══════════════════════════════════════════════════════════════════════════

   Un ordine nato da un preventivo mostrava un totale. Da qui si vedono le
   voci che quel totale contiene, con quantità, costo unitario e provenienza,
   e si possono cambiare: in lavorazione le cose cambiano — il materiale è
   costato di più, una lavorazione è saltata, ne è servita un'altra — e un
   gestionale che non lo lascia registrare costringe a tenere il conto vero
   da un'altra parte.

   ── Due colonne che non vanno confuse ─────────────────────────────────────

   `pricingSnapshot` è quello che era stato preventivato. Non si tocca: è la
   promessa fatta al cliente, e serve come termine di paragone.
   `currentPricing` è quello che si sta facendo. Parte identico e diverge.

   Lo scostamento fra i due è l'unica risposta possibile alla domanda «su
   questo lavoro ci ho guadagnato quanto pensavo?». Sovrascrivere il primo con
   il secondo — che è la cosa più facile da fare — cancella la domanda insieme
   alla risposta.

   ── Perché ogni riga porta la sua provenienza ─────────────────────────────

   «Filamento PLA € 6,38» detto dal magazzino e lo stesso numero digitato a
   mano sono due affermazioni diverse. La colonna della fonte è quella che
   permette di sapere quali numeri reggono e quali sono da verificare.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };
  var eur = function (v) { return '€ ' + num(v).toFixed(2).replace('.', ','); };
  var pct = function (v) { return num(v).toFixed(1).replace('.', ',') + '%'; };

  function B() { return global.InglyCostBreakdown; }

  /* Da dove viene un numero, detto in italiano. Una sigla non spiega niente a
     chi apre l'ordine sei mesi dopo. */
  var FONTI = {
    magazzino: 'Magazzino — costo reale d\'acquisto',
    motore: 'Calcolato dal motore dei costi',
    profilo: 'Profilo economico del laboratorio',
    preventivo: 'Scritto nel preventivo',
    modificato: 'Modificato in lavorazione',
    manuale: 'Aggiunto a mano',
  };
  function fonte(s) { return FONTI[s] || s || '—'; }

  var stato = null;   /* { orderId, ordine, distinta, aperta } */

  /* ── Disegno ──────────────────────────────────────────────────────────── */

  /**
   * @param nodo   il nodo dove montare (scoped: niente query sul documento)
   * @param ordine il record dell'ordine
   */
  function render(nodo, ordine) {
    if (!nodo) return;
    var b = B();
    if (!b) { nodo.innerHTML = ''; return; }

    var corrente = ordine.currentPricing || ordine.costBreakdown
      || b.daRecordVecchio(ordine);
    var originale = ordine.pricingSnapshot || corrente;
    stato = { orderId: ordine.id, ordine: ordine, distinta: corrente };

    if (corrente.vuota) {
      nodo.innerHTML = card(
        '<div style="font-size:12px;color:var(--text-muted,#888);line-height:1.6">'
        + esc(corrente.motivo || 'Questo ordine non porta una distinta economica.')
        + (corrente.legacy
          ? '<br>I totali che aveva si conservano: costo ' + eur(corrente.totals.costoTotale)
            + ' · prezzo ' + eur(corrente.totals.netto) + '.'
          : '')
        + '</div>');
      return;
    }

    var s = b.scostamento(originale, corrente);
    nodo.innerHTML = card(riepilogo(corrente, s) + tabella(corrente) + piede());
    lega(nodo);
  }

  function card(dentro) {
    return '<div class="card" data-economia style="padding:16px;margin-top:14px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
      + '<div style="font-size:13px;font-weight:800;color:var(--text,#e8e8f0)">💶 Economia ordine</div>'
      + '</div>' + dentro + '</div>';
  }

  function riepilogo(d, s) {
    var t = d.totals || {};
    var celle = [
      ['Costo reale', eur(t.costoTotale), 'var(--text,#e8e8f0)'],
      ['Prezzo di vendita', eur(t.netto), 'var(--primary,#6366f1)'],
      ['Margine', eur(t.margine), num(t.margine) >= 0 ? '#22c55e' : '#ef4444'],
      ['Margine %', pct(t.marginePct), num(t.marginePct) >= 20 ? '#22c55e' : '#f59e0b'],
    ];
    return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:12px">'
      + celle.map(function (c) {
        return '<div style="padding:10px;border-radius:9px;background:var(--bg-card2,#18181f)">'
          + '<div style="font-size:9px;color:var(--text-muted,#888);text-transform:uppercase;letter-spacing:.05em">' + esc(c[0]) + '</div>'
          + '<div style="font-size:16px;font-weight:800;color:' + c[2] + ';margin-top:2px">' + esc(c[1]) + '</div>'
          + '</div>';
      }).join('')
      + '</div>'
      + (s && !s.invariato ? scostamento(s) : '');
  }

  function scostamento(s) {
    var segno = function (v) { return (v > 0 ? '+' : '') + eur(v); };
    var colore = s.costo > 0 ? '#f59e0b' : '#22c55e';
    return '<div style="padding:10px 12px;border-radius:9px;background:' + colore + '12;'
      + 'border:1px solid ' + colore + '30;margin-bottom:12px">'
      + '<div style="font-size:11px;font-weight:700;color:' + colore + '">'
      + 'Scostamento dal preventivo: costo ' + segno(s.costo)
      + ' · margine ' + segno(s.margine) + ' (' + (s.marginePct > 0 ? '+' : '') + pct(s.marginePct) + ')</div>'
      + '<div style="font-size:10px;color:var(--text-muted,#888);margin-top:4px;line-height:1.5">'
      + s.voci.slice(0, 4).map(function (v) {
        return esc(v.label) + ' ' + ({ modificata: 'modificata', aggiunta: 'aggiunta', rimossa: 'rimossa' }[v.stato])
          + ' (' + segno(v.delta) + ')';
      }).join(' · ')
      + (s.voci.length > 4 ? ' · e altre ' + (s.voci.length - 4) : '')
      + '</div>'
      + '<div style="font-size:9px;color:var(--text-muted,#888);margin-top:4px">'
      + 'Il preventivo originale non è stato toccato.</div>'
      + '</div>';
  }

  function tabella(d) {
    var b = B();
    var righe = '';
    b.ORDINE.forEach(function (cat) {
      var voci = (d.categorie || {})[cat] || [];
      if (!voci.length) return;
      righe += '<tr><td colspan="6" style="padding:10px 6px 4px;font-size:10px;font-weight:700;'
        + 'color:var(--text-muted,#888);text-transform:uppercase;letter-spacing:.05em">'
        + esc(b.labelCategoria(cat)) + ' · ' + eur((d.totaliCategoria || {})[cat]) + '</td></tr>';
      voci.forEach(function (v) { righe += riga(v); });
    });

    return '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">'
      + '<thead><tr>'
      + ['Voce', 'Qtà', 'Costo unit.', 'Totale', 'Fonte', ''].map(function (h, i) {
        return '<th style="text-align:' + (i >= 1 && i <= 3 ? 'right' : 'left') + ';padding:6px;'
          + 'font-size:9px;color:var(--text-muted,#888);text-transform:uppercase;letter-spacing:.05em;'
          + 'border-bottom:1px solid var(--border,#2a2a35)">' + esc(h) + '</th>';
      }).join('')
      + '</tr></thead><tbody>' + righe + '</tbody></table></div>';
  }

  function riga(v) {
    var q = v.quantity != null
      ? num(v.quantity).toLocaleString('it-IT', { maximumFractionDigits: 2 }) + (v.unit ? ' ' + esc(v.unit) : '')
      : '—';
    var cu = v.unitCost != null
      ? '€ ' + num(v.unitCost).toFixed(v.unitCost < 1 ? 4 : 2).replace('.', ',') : '—';
    return '<tr data-voce="' + esc(v.id) + '" style="border-bottom:1px solid var(--border,#2a2a35)">'
      + '<td style="padding:7px 6px;color:var(--text,#e8e8f0)">' + esc(v.label)
      + (v.description ? '<div style="font-size:9px;color:var(--text-muted,#888)">' + esc(v.description) + '</div>' : '')
      + '</td>'
      + '<td style="padding:7px 6px;text-align:right;color:var(--text-muted,#888)">' + q + '</td>'
      + '<td style="padding:7px 6px;text-align:right;color:var(--text-muted,#888)">' + cu + '</td>'
      + '<td style="padding:7px 6px;text-align:right;font-weight:700;color:var(--text,#e8e8f0)">' + eur(v.totalCost) + '</td>'
      + '<td style="padding:7px 6px;font-size:10px;color:var(--text-muted,#888)" title="' + esc(fonte(v.source)) + '">'
      + esc(fonte(v.source)) + '</td>'
      + '<td style="padding:7px 6px;text-align:right;white-space:nowrap">'
      + (v.editable !== false
        ? '<button type="button" data-mod="' + esc(v.id) + '" title="Modifica" style="background:none;border:none;cursor:pointer;font-size:12px;padding:2px 4px">✏️</button>'
          + '<button type="button" data-rim="' + esc(v.id) + '" title="Rimuovi" style="background:none;border:none;cursor:pointer;font-size:12px;padding:2px 4px;color:#ef4444">🗑</button>'
        : '')
      + '</td></tr>';
  }

  function piede() {
    return '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">'
      + '<button type="button" data-aggiungi style="padding:7px 12px;border-radius:8px;font-size:11px;'
      + 'font-weight:700;font-family:inherit;cursor:pointer;background:var(--primary,#6366f1);border:none;color:#fff">'
      + '+ Aggiungi voce</button>'
      + '<button type="button" data-ripristina style="padding:7px 12px;border-radius:8px;font-size:11px;'
      + 'font-weight:700;font-family:inherit;cursor:pointer;background:transparent;'
      + 'border:1.5px solid var(--border,#2a2a35);color:var(--text-muted,#888)">'
      + '↺ Torna al preventivato</button>'
      + '</div>';
  }

  /* ── Interazione ──────────────────────────────────────────────────────── */

  /** Le query restano dentro il nodo montato: cercare nel documento
      raccoglierebbe i pulsanti di qualunque altro ordine aperto. */
  function lega(nodo) {
    nodo.querySelectorAll('[data-mod]').forEach(function (b) {
      b.onclick = function () { modifica(nodo, b.getAttribute('data-mod')); };
    });
    nodo.querySelectorAll('[data-rim]').forEach(function (b) {
      b.onclick = function () { rimuovi(nodo, b.getAttribute('data-rim')); };
    });
    var agg = nodo.querySelector('[data-aggiungi]');
    if (agg) agg.onclick = function () { aggiungi(nodo); };
    var rip = nodo.querySelector('[data-ripristina]');
    if (rip) rip.onclick = function () { ripristina(nodo); };
  }

  function voceDi(id) {
    return (stato && stato.distinta && stato.distinta.voci || [])
      .filter(function (v) { return String(v.id) === String(id); })[0] || null;
  }

  function modifica(nodo, id) {
    var v = voceDi(id);
    if (!v) return;
    var q = global.prompt('Quantità per «' + v.label + '»'
      + (v.unit ? ' (' + v.unit + ')' : ''), v.quantity != null ? v.quantity : '');
    if (q === null) return;
    var c = global.prompt('Costo totale per «' + v.label + '» (€)', v.totalCost);
    if (c === null) return;
    var modifiche = { totalCost: num(c, v.totalCost) };
    if (String(q).trim() !== '') modifiche.quantity = num(q, v.quantity);
    applica(nodo, B().conVoce(stato.distinta, id, modifiche), 'modificata «' + v.label + '»');
  }

  function rimuovi(nodo, id) {
    var v = voceDi(id);
    if (!v) return;
    if (!global.confirm('Togliere «' + v.label + '» (' + eur(v.totalCost) + ') dall\'ordine?')) return;
    applica(nodo, B().senzaVoce(stato.distinta, id), 'rimossa «' + v.label + '»');
  }

  function aggiungi(nodo) {
    var label = global.prompt('Che cosa aggiungi?', '');
    if (!label) return;
    var costo = global.prompt('Costo totale (€)', '0');
    if (costo === null) return;
    applica(nodo, B().conNuovaVoce(stato.distinta, {
      label: label, category: 'other', quantity: 1, unit: 'pz', totalCost: num(costo),
    }), 'aggiunta «' + label + '»');
  }

  function ripristina(nodo) {
    if (!stato || !stato.ordine.pricingSnapshot) return;
    if (!global.confirm('Riportare l\'economia dell\'ordine a com\'era nel preventivo?')) return;
    applica(nodo, JSON.parse(JSON.stringify(stato.ordine.pricingSnapshot)), 'riportata al preventivato');
  }

  /* ── Salvataggio ──────────────────────────────────────────────────────── */

  /** Scrive `currentPricing`, **non** `pricingSnapshot`: quello resta la
      promessa fatta al cliente. Lo storico tiene traccia di chi ha cambiato
      cosa, perché uno scostamento senza una ragione è solo un numero che non
      torna. */
  function applica(nodo, distinta, cosa) {
    if (!stato || !distinta) return;
    var ordine = stato.ordine;
    ordine.currentPricing = distinta;
    ordine.pricingHistory = (ordine.pricingHistory || []).concat([{
      quando: new Date().toISOString(),
      cosa: cosa,
      costo: distinta.totals.costoTotale,
      netto: distinta.totals.netto,
      margine: distinta.totals.margine,
    }]);
    /* Il totale dell'ordine segue il prezzo corrente: un ordine il cui totale
       non corrisponde alle sue voci è un ordine che mente a chi lo legge in
       lista senza aprirlo. */
    ordine.total = distinta.totals.netto;
    ordine.totalNet = distinta.totals.netto;
    ordine.totalCost = distinta.totals.costoTotale;

    var db = global.IDB;
    if (!db || typeof db.put !== 'function') { avvisa('Archivio non raggiungibile', 'error'); return; }
    Promise.resolve(db.put('orders', ordine))
      .then(function () { return db.get('orders', ordine.id); })
      .then(function (riletto) {
        if (!riletto || !riletto.currentPricing) {
          avvisa('Modifica scritta ma non rileggibile: non è stata salvata', 'error');
          return;
        }
        stato.ordine = riletto;
        render(nodo, riletto);
        if (global.AppStore && global.AppStore.invalidate) global.AppStore.invalidate('orders');
        if (typeof document !== 'undefined' && document.dispatchEvent) {
          document.dispatchEvent(new CustomEvent('orderUpdated',
            { detail: { id: riletto.id, to: riletto.stage, order: riletto } }));
        }
        avvisa('Economia aggiornata: ' + cosa, 'success');
      })
      .catch(function (e) {
        if (global.Ingly && global.Ingly.Errors) global.Ingly.Errors.log('OrderEconomics.applica', e, { id: ordine.id });
        avvisa('Modifica non salvata: ' + (e && e.message || e), 'error');
      });
  }

  function avvisa(m, t) { if (typeof global.toast === 'function') global.toast(m, t || 'info'); }

  /* ── Il nome ────────────────────────────────────────────────────────────
     Questo modulo si chiamava `InglyOrderEconomics`, che è il nome di un
     modulo che esisteva già — quello del consuntivo «Preventivato / Reale /
     Scostamento» — e glielo **sovrascriveva**: il suo `pannello()` spariva e
     la card del consuntivo smetteva di disegnarsi. Se ne è accorta la suite
     `storico-economico.mjs`, e aveva ragione.
     Sono due cose diverse: quello confronta preventivato e consuntivo di
     produzione, questo apre la distinta delle voci. Due nomi. */
  global.InglyOrderBreakdown = {
    VERSIONE: VERSIONE,
    render: render,
    fonte: fonte,
    _stato: function () { return stato; },
  };
})(typeof window !== 'undefined' ? window : globalThis);

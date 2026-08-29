/* ═══════════════════════════════════════════════════════════════════════════
   MAGAZZINO · quattro cose separate, che erano una sola
   ═══════════════════════════════════════════════════════════════════════════

   La vista magazzino mostrava un numero per articolo e nient'altro. Con un
   registro dietro, le cose da mostrare diventano quattro, e mescolarle è il
   modo più rapido di rendere inutile il registro:

     GIACENZA        quanto c'è adesso, e quanto è disponibile
     MOVIMENTI       come ci si è arrivati
     RICONCILIAZIONE dove il registro e il record non si parlano
     STORIA          perché un singolo movimento è avvenuto

   Sono quattro schede di un pannello, non quattro pannelli sovrapposti: la
   regola di questo progetto è un concetto, un proprietario.

   Qui non c'è aritmetica di giacenza. Ogni numero arriva da
   `InglyInventoryLedger`, che è l'unico posto che sa contare.
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
  var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };
  var eu = function (n) { return n == null ? '—' : '€ ' + (Math.round(num(n) * 100) / 100).toFixed(2); };
  var q = function (n) { return String(Math.round(num(n) * 1000) / 1000); };

  function L() { return global.InglyInventoryLedger; }
  function S() { return global.InglyInventory; }

  var stato = { scheda: 'movimenti', articolo: null, pagina: 0, perPagina: 25 };

  /* ── Movimenti ─────────────────────────────────────────────────────────── */
  function rigaMovimento(m) {
    var s = L().spiega(m);
    var colore = m.delta > 0 ? 'var(--green,#22c55e)' : 'var(--red,#ef4444)';
    return '<tr style="border-bottom:1px solid var(--border)">'
      + '<td style="padding:7px 10px;font-size:11px;color:var(--text-muted);white-space:nowrap">' + esc(String(m.timestamp).slice(0, 16).replace('T', ' ')) + '</td>'
      + '<td style="padding:7px 10px;font-size:12px">' + esc(s.cosa)
      + (m.itemName ? '<br><small style="color:var(--text-dim);font-size:10px">' + esc(m.itemName) + '</small>' : '') + '</td>'
      + '<td style="padding:7px 10px;font-size:12px;text-align:right;font-weight:700;color:' + colore + ';white-space:nowrap">' + esc(s.quantita) + '</td>'
      + '<td style="padding:7px 10px;font-size:11px;text-align:right;color:var(--text-muted);white-space:nowrap">' + esc(q(m.previousQuantity) + ' → ' + q(m.resultingQuantity)) + '</td>'
      + '<td style="padding:7px 10px;font-size:11px;text-align:right;white-space:nowrap">' + esc(m.unitCost != null ? eu(m.totalCost) : '—') + '</td>'
      + '<td style="padding:7px 10px;font-size:11px;color:var(--text-muted)">' + esc(s.documento) + '</td>'
      + '<td style="padding:7px 10px;text-align:center">'
      + '<button onclick="InglyInventoryView.spiega(\'' + esc(m.id) + '\')" title="Perché" '
      + 'style="padding:3px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px">?</button></td>'
      + '</tr>';
  }

  function tabellaMovimenti(movimenti) {
    if (!movimenti.length) {
      return '<div style="text-align:center;padding:32px;color:var(--text-dim);font-size:12px">'
        + 'Nessun movimento registrato.<br><small>La giacenza degli articoli esiste già: '
        + 'crea i saldi di apertura per cominciare a registrare.</small></div>';
    }
    var per = stato.perPagina;
    var totalePagine = Math.max(1, Math.ceil(movimenti.length / per));
    var p = Math.min(Math.max(0, stato.pagina), totalePagine - 1);
    stato.pagina = p;
    var pagina = movimenti.slice(p * per, p * per + per);

    var bs = 'padding:4px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px;color:var(--text)';
    return '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:720px">'
      + '<thead><tr style="border-bottom:1px solid var(--border)">'
      + ['Quando', 'Movimento', 'Quantità', 'Da → a', 'Valore', 'Documento', ''].map(function (h, i) {
        return '<th style="padding:8px 10px;font-size:10px;text-transform:uppercase;color:var(--text-dim);text-align:' + (i >= 2 && i <= 4 ? 'right' : 'left') + '">' + esc(h) + '</th>';
      }).join('')
      + '</tr></thead><tbody>' + pagina.map(rigaMovimento).join('') + '</tbody></table></div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 2px;flex-wrap:wrap">'
      + '<span style="font-size:11px;color:var(--text-muted)">'
      + esc((p * per + 1) + '–' + Math.min(movimenti.length, (p + 1) * per) + ' di ' + movimenti.length + ' movimenti · pagina ' + (p + 1) + ' di ' + totalePagine) + '</span>'
      + '<div style="display:flex;gap:5px">'
      + '<button onclick="InglyInventoryView.pagina(0)" style="' + bs + '" ' + (p === 0 ? 'disabled' : '') + '>« Prima</button>'
      + '<button onclick="InglyInventoryView.pagina(' + (p - 1) + ')" style="' + bs + '" ' + (p === 0 ? 'disabled' : '') + '>‹ Prec</button>'
      + '<button onclick="InglyInventoryView.pagina(' + (p + 1) + ')" style="' + bs + '" ' + (p >= totalePagine - 1 ? 'disabled' : '') + '>Succ ›</button>'
      + '<button onclick="InglyInventoryView.pagina(' + (totalePagine - 1) + ')" style="' + bs + '" ' + (p >= totalePagine - 1 ? 'disabled' : '') + '>Ultima »</button>'
      + '</div></div>';
  }

  /* ── Riconciliazione ───────────────────────────────────────────────────── */
  function tabellaRiconciliazione(r) {
    if (!r || !r.righe || !r.righe.length) {
      return '<div style="text-align:center;padding:32px;color:var(--text-dim);font-size:12px">Nessun articolo da confrontare.</div>';
    }
    var righe = r.righe.map(function (x) {
      var quadra = x.delta != null && Math.abs(x.delta) < 0.0000001;
      var stato2 = x.actual == null ? 'nessuna giacenza'
        : quadra ? 'quadra' : (x.movimenti === 0 ? 'giacenza senza registro' : 'diverge');
      var colore = quadra ? 'var(--text-muted)' : (x.movimenti === 0 ? 'var(--amber,#f59e0b)' : 'var(--red,#ef4444)');
      return '<tr style="border-bottom:1px solid var(--border)">'
        + '<td style="padding:7px 10px;font-size:12px">' + esc(x.itemName || x.itemId) + '</td>'
        + '<td style="padding:7px 10px;font-size:12px;text-align:right">' + esc(q(x.expected)) + '</td>'
        + '<td style="padding:7px 10px;font-size:12px;text-align:right">' + esc(x.actual == null ? '—' : q(x.actual)) + '</td>'
        + '<td style="padding:7px 10px;font-size:12px;text-align:right;font-weight:700;color:' + colore + '">'
        + esc(x.delta == null ? '—' : (x.delta > 0 ? '+' : '') + q(x.delta)) + '</td>'
        + '<td style="padding:7px 10px;font-size:11px;color:' + colore + '">' + esc(stato2) + '</td></tr>';
    }).join('');

    return (r.quadra
      ? '<div style="padding:10px 12px;border-radius:9px;background:var(--bg-card2);border:1px solid var(--border);font-size:12px;margin-bottom:10px">'
        + '✔ Registro e giacenze coincidono su tutti i ' + esc(r.totale) + ' articoli.</div>'
      : '<div style="padding:10px 12px;border-radius:9px;background:var(--bg-card2);border-left:3px solid var(--red,#ef4444);font-size:12px;margin-bottom:10px">'
        + esc(r.divergenti + ' articoli su ' + r.totale + ' non quadrano.')
        + '<br><small style="color:var(--text-muted)">Il registro non si corregge: si registra una rettifica, che è un movimento nuovo e lascia traccia.</small></div>')
      + '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:560px">'
      + '<thead><tr style="border-bottom:1px solid var(--border)">'
      + ['Articolo', 'Atteso dal registro', 'Giacenza registrata', 'Delta', 'Stato'].map(function (h, i) {
        return '<th style="padding:8px 10px;font-size:10px;text-transform:uppercase;color:var(--text-dim);text-align:' + (i >= 1 && i <= 3 ? 'right' : 'left') + '">' + esc(h) + '</th>';
      }).join('') + '</tr></thead><tbody>' + righe + '</tbody></table></div>';
  }

  /* ── Il pannello ───────────────────────────────────────────────────────── */
  async function disegna(contenitore) {
    var el = typeof contenitore === 'string' ? document.getElementById(contenitore) : contenitore;
    if (!el || !L() || !S()) return;

    var movimenti = L().ordina(await S().tutti()).reverse();
    if (stato.articolo) movimenti = movimenti.filter(function (m) { return String(m.itemId) === String(stato.articolo); });

    var schede = [
      { id: 'movimenti', label: '📜 Movimenti (' + movimenti.length + ')' },
      { id: 'riconciliazione', label: '⚖️ Riconciliazione' },
    ];

    var corpo = '';
    if (stato.scheda === 'riconciliazione') corpo = tabellaRiconciliazione(await S().riconcilia());
    else corpo = tabellaMovimenti(movimenti);

    var bs = 'padding:6px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700;border:1px solid var(--border)';
    el.innerHTML =
      '<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:14px">'
      + '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">'
      + '<div style="font-size:13px;font-weight:800;color:var(--text);flex:1">Registro di magazzino</div>'
      + schede.map(function (s) {
        return '<button onclick="InglyInventoryView.scheda(\'' + s.id + '\')" style="' + bs
          + (stato.scheda === s.id ? ';background:var(--primary);color:#000' : ';background:var(--bg-card);color:var(--text-muted)') + '">'
          + esc(s.label) + '</button>';
      }).join('')
      + '<button onclick="InglyInventoryView.apertura()" style="' + bs + ';background:var(--bg-card);color:var(--text-muted)" '
      + 'title="Scrive un saldo di apertura per ogni articolo con giacenza e senza registro">⚑ Saldi di apertura</button>'
      + '</div>'
      + '<div style="font-size:10px;color:var(--text-dim);margin-bottom:10px">'
      + 'La giacenza è la somma dei movimenti. Un errore non si corregge riscrivendo un movimento: si registra una rettifica.'
      + '</div>'
      + corpo + '</div>';
  }

  global.InglyInventoryView = {
    disegna: disegna,
    _contenitore: null,

    async monta(idContenitore) { this._contenitore = idContenitore; await disegna(idContenitore); },
    async scheda(s) { stato.scheda = s; stato.pagina = 0; await disegna(this._contenitore); },
    async pagina(p) { stato.pagina = Math.max(0, p); await disegna(this._contenitore); },
    async filtra(itemKey) { stato.articolo = itemKey || null; stato.pagina = 0; await disegna(this._contenitore); },

    /** «Perché sono passato da 12 a 7» — la domanda, con la sua risposta. */
    async spiega(id) {
      var movimenti = await S().tutti();
      var m = movimenti.filter(function (x) { return String(x.id) === String(id); })[0];
      if (!m || !global.InglyUI || !global.InglyUI.openDialog) return;
      var s = L().spiega(m);
      var riga = function (k, v) {
        return '<div style="display:flex;justify-content:space-between;gap:14px;padding:5px 0;border-bottom:1px solid var(--border)">'
          + '<span style="font-size:12px;color:var(--text-muted)">' + esc(k) + '</span>'
          + '<span style="font-size:12px;text-align:right">' + esc(v) + '</span></div>';
      };
      await global.InglyUI.openDialog({
        title: 'Perché sono passato da ' + q(s.da) + ' a ' + q(s.a),
        size: 'sm',
        body: riga('Quando', String(s.quando).slice(0, 16).replace('T', ' '))
          + riga('Movimento', s.cosa)
          + riga('Quantità', s.quantita)
          + riga('Costo del momento', s.costo != null ? eu(s.costo) + ' l\'unità · ' + eu(s.valore) + ' in tutto' : 'non registrato')
          + riga('Documento', s.documento)
          + (s.operazione ? riga('Operazione', s.operazione) : '')
          + (s.chi ? riga('Chi', s.chi) : '')
          + (s.nota ? riga('Nota', s.nota) : '')
          + '<div style="font-size:10px;color:var(--text-dim);margin-top:10px">Il costo è quello del momento del movimento, non il listino di oggi.</div>',
        actions: [{ label: 'Chiudi', variant: 'secondary', value: true }],
      }).promise;
    },

    /** I saldi di apertura: una volta sola, e chi ce l'ha già non ne riceve un secondo. */
    async apertura() {
      var piano = await S().pianificaApertura();
      if (!piano.possibile) return;
      if (!piano.piano.length) {
        if (global.toast) global.toast('Ogni articolo con giacenza ha già il suo saldo di apertura', 'info');
        return;
      }
      var UI = global.InglyUI;
      var elenco = piano.piano.slice(0, 12).map(function (v) {
        return '<div style="display:flex;justify-content:space-between;gap:12px;padding:3px 0;font-size:12px">'
          + '<span>' + esc(v.name || v.itemKey) + '</span><span>' + esc(q(v.quantity) + ' ' + (v.unit || '')) + '</span></div>';
      }).join('');
      var ok = UI && UI.openDialog ? await UI.openDialog({
        title: 'Saldi di apertura',
        body: '<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">'
          + 'Verranno scritti ' + esc(piano.piano.length) + ' saldi di apertura: un movimento per ogni articolo che oggi ha una giacenza e nessun registro. '
          + 'Il costo è quello dichiarato in anagrafica, marcato come dichiarato e non come pagato — non si inventa una storia di acquisti che non c\'è stata.'
          + '</div>' + elenco + (piano.piano.length > 12 ? '<div style="font-size:11px;color:var(--text-dim);padding-top:6px">… e altri ' + esc(piano.piano.length - 12) + '</div>' : ''),
        actions: [
          { label: 'Annulla', variant: 'secondary', value: false },
          { label: 'Scrivi i saldi di apertura', variant: 'primary', value: true },
        ],
      }).promise : false;
      if (ok !== true) return;
      var esito = await S().eseguiApertura({});
      if (global.toast) global.toast('Scritti ' + esito.scritti + ' saldi di apertura', 'success');
      await disegna(this._contenitore);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);

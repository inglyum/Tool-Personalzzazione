/* ═══════════════════════════════════════════════════════════════════════════
   CLIENTE-RIGA — CRM-05: una sola funzione disegna la riga di un cliente
   ═══════════════════════════════════════════════════════════════════════════

   Misurato, non dedotto. Nel file consegnato la riga di un cliente veniva
   costruita in **quattro** punti, e nessuno dei quattro sapeva degli altri:

   | dove | che cosa disegna | arriva a schermo? |
   | ---- | ---------------- | ----------------- |
   | patch 081 `CRMSmart._buildHTML` | la riga intera di `view-clienti` | **sì** |
   | patch 082 `CRMSmart.render`     | riappende i tag nella cella nome 200 ms dopo | **no** — cerca `#crm-row-<indice>` mentre CRM-04 ha dato alle righe `#crm-row-<id>` |
   | patch 018 CRM Pro               | una seconda tabella su `ingly_clients` — e la disegna due volte, in `renderCRMPro` e in `_proxCRMFilter` | sì, ma su un'altra lista |
   | `mod:clients` `Clients.render()`| la tabella completa con punteggio e storico | **no** — scrive in `#clients-tbody`, che nel documento non esiste |

   Il costo di questo non è estetico. È il motivo per cui una correzione ne
   aggiusta una e lascia le altre: l'escape mancante sul nome è stato corretto
   in una copia e non nelle altre, e i tag hanno smesso di comparire senza che
   nessuno se ne accorgesse, perché il pezzo che li disegnava non era quello
   che disegnava la riga.

   Qui c'è una funzione sola, e obbedisce a tre regole:

   1. **Non recupera dati.** Riceve il cliente già caricato. Non conosce
      `localStorage`, non conosce `IDB`, non chiama `_load()`. Chi disegna non
      decide anche che cosa disegnare.
   2. **Non crea id.** Se il record non ne ha uno, la riga lo dichiara e
      **spegne i comandi**: un pulsante «elimina» che agisce su una posizione
      nell'array è il difetto che CRM-04 ha appena chiuso, e reintrodurlo qui
      lo riaprirebbe dalla parte della vista.
   3. **Esce sempre da `esc()`.** Nome, azienda, telefono, email, note e tag
      sono testo scritto da chi importa una rubrica: un `&` in «Rossi & Figli»
      rompeva la cella, e un `<` faceva di peggio.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (x) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x];
    });
  }

  /** Solo cifre: quel che serve a `tel:` e a WhatsApp. Non è una validazione,
      è una ripulitura — il numero resta quello che l'utente ha scritto. */
  function cifre(v) { return String(v == null ? '' : v).replace(/\D/g, ''); }

  var testo = function (v) { return String(v == null ? '' : v).trim(); };

  /* ── La normalizzazione dei nomi di campo ────────────────────────────────
     Tre archivi, tre grafie: la rubrica scrive `name`, l'anagrafica importata
     `ragione_sociale`, e il telefono è `phone` o `tel` a seconda di chi ha
     scritto il record. Tradurre qui vuol dire che nessuna vista deve più
     conoscere le tre grafie — e che aggiungerne una quarta è una riga sola. */
  function campi(c) {
    var o = c || {};
    var tags = o.tags;
    if (typeof tags === 'string') tags = tags.split(',');
    if (!Array.isArray(tags)) tags = [];
    tags = tags.map(testo).filter(Boolean);
    return {
      id: (o.id == null || testo(o.id) === '') ? null : testo(o.id),
      nome: testo(o.name || o.nome || o.ragione_sociale) || '—',
      azienda: testo(o.company || o.azienda),
      telefono: testo(o.phone || o.tel || o.telefono),
      email: testo(o.email || o.mail),
      note: testo(o.notes || o.note),
      tags: tags,
      archiviato: testo(o.status).toUpperCase() === 'ARCHIVED',
    };
  }

  /* ── I colori dei tag ─────────────────────────────────────────────────────
     Chi chiama passa la propria tabella di preset; senza tabella il tag resta
     visibile con il colore neutro. Un tag senza colore è comunque
     un'informazione: nasconderlo perché manca il preset sarebbe perdere il
     dato per un dettaglio grafico. */
  function coloreTag(nome, preset) {
    if (Array.isArray(preset)) {
      for (var i = 0; i < preset.length; i++) {
        if (preset[i] && preset[i].label === nome && preset[i].color) return preset[i].color;
      }
    }
    return '#6366f1';
  }

  function chipTag(nome, preset) {
    var col = coloreTag(nome, preset);
    return '<span style="background:' + col + '20;color:' + col + ';padding:1px 6px;'
      + 'border-radius:20px;font-size:9px;font-weight:700;border:1px solid ' + col + '40">'
      + esc(nome) + '</span>';
  }

  /* ── Le celle ─────────────────────────────────────────────────────────────
     Ogni colonna è una funzione con la stessa firma: riceve il cliente
     normalizzato e le opzioni, restituisce un `<td>`. Le tabelle che
     esistono nel prodotto hanno colonne diverse, e questo è legittimo: quel
     che non è legittimo è che disegnino il **nome** in tre modi diversi. */
  var CELLE = {
    selezione: function (c, o) {
      if (!c.id) return '<td style="padding:8px 10px;width:36px"></td>';
      var sel = !!(o.selezionata);
      return '<td style="padding:8px 10px;text-align:center;width:36px">'
        + '<input type="checkbox" id="crm-chk-' + esc(c.id) + '" data-id="' + esc(c.id) + '"'
        + (sel ? ' checked' : '')
        + ' onchange="' + esc(o.suSelezione || 'CRMSmart._onCheck') + '(\'' + esc(c.id) + '\',this.checked)"'
        + ' style="width:15px;height:15px;cursor:pointer;accent-color:var(--primary)"></td>';
    },

    id: function (c) {
      return '<td style="padding:8px 12px"><code style="color:var(--text-muted);font-size:11px">'
        + (c.id ? '#' + esc(c.id) : '—') + '</code></td>';
    },

    /* Nome, azienda e tag stanno **nella stessa cella e nella stessa
       chiamata**: è la correzione del difetto misurato, dove i tag venivano
       appesi dopo, da un'altra funzione, con un altro criterio di
       identificazione. */
    nome: function (c, o) {
      var righe = '<div style="font-size:13px;font-weight:700;color:var(--text)">' + esc(c.nome)
        + (c.archiviato ? ' <span style="font-size:9px;font-weight:700;color:#f59e0b;'
          + 'border:1px solid #f59e0b40;border-radius:20px;padding:1px 6px">ARCHIVIATO</span>' : '')
        + '</div>';
      if (c.azienda) righe += '<div style="font-size:10px;color:var(--text-muted)">' + esc(c.azienda) + '</div>';
      if (c.tags.length) {
        righe += '<div class="crm-row-tags" style="display:flex;gap:3px;flex-wrap:wrap;margin-top:3px">'
          + c.tags.map(function (t) { return chipTag(t, o.presetTag); }).join('') + '</div>';
      }
      if (!c.id) {
        righe += '<div style="font-size:9px;color:#f59e0b;margin-top:3px">⚠️ scheda senza identificativo:'
          + ' i comandi sono disattivati finché non viene migrata</div>';
      }
      return '<td style="padding:8px 12px">' + righe + '</td>';
    },

    telefono: function (c) {
      return '<td style="padding:8px 12px">'
        + (c.telefono
          ? '<a href="tel:' + esc(c.telefono) + '" style="color:var(--primary);text-decoration:none;font-size:13px">' + esc(c.telefono) + '</a>'
          : '<span style="color:var(--text-dim)">—</span>')
        + '</td>';
    },

    email: function (c) {
      return '<td style="padding:8px 12px;color:var(--text-muted);font-size:12px">'
        + (c.email ? '<a href="mailto:' + esc(c.email) + '" style="color:var(--text-muted);text-decoration:none">' + esc(c.email) + '</a>' : '—')
        + '</td>';
    },

    note: function (c) {
      return '<td style="padding:8px 12px;font-size:11px;color:var(--text-dim);max-width:180px;'
        + 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(c.note) + '">'
        + (c.note ? esc(c.note) : '—') + '</td>';
    },

    /* Una colonna libera: il chiamante passa già l'HTML, perché il punteggio
       di `mod:clients` e il fatturato di CRM Pro sono conti suoi e non di chi
       disegna. Passa da `esc()` solo se dichiarato testo. */
    extra: function (c, o, def) {
      var v = (def && typeof def.valore === 'function') ? def.valore(c, o) : '';
      return '<td style="padding:8px 12px;font-size:12px;color:var(--text-muted)">'
        + (def && def.html ? v : esc(v)) + '</td>';
    },

    azioni: function (c, o) {
      if (!c.id) return '<td style="padding:8px 10px;text-align:center;color:var(--text-dim);font-size:11px">—</td>';
      var elenco = (o.azioni || AZIONI_CRM).concat(o.senzaAggiunte ? [] : AGGIUNTE);
      var html = elenco.map(function (a) {
        var ctx = (o.ctx && a.id) ? o.ctx[a.id] : undefined;
        if (typeof a.quando === 'function' && !a.quando(c, ctx)) return '';
        var cmd = typeof a.comando === 'function' ? a.comando(c, ctx) : String(a.comando || '');
        var icona = typeof a.icona === 'function' ? a.icona(c, ctx) : a.icona;
        var titolo = typeof a.titolo === 'function' ? a.titolo(c, ctx) : a.titolo;
        var stile = typeof a.stile === 'function' ? a.stile(c, ctx) : a.stile;
        /* `icona` non passa da `esc()`: è markup del prodotto — un'emoji o un
           `<i class="fas …">` — non testo di un cliente. `comando` e `titolo`
           sì, perché ci finisce dentro il nome. */
        return '<button' + (a.classe ? ' class="' + esc(a.classe) + '"' : '')
          + ' onclick="' + esc(cmd) + '" title="' + esc(titolo || '') + '" style="'
          + (stile || 'padding:4px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:11px')
          + '">' + (icona == null ? '•' : icona) + '</button>';
      }).join('');
      return '<td style="padding:8px 10px;text-align:center">'
        + '<div' + (o.classeGruppo ? ' class="' + esc(o.classeGruppo) + '"' : '')
        + ' style="display:flex;gap:4px;justify-content:center">' + html + '</div></td>';
    },
  };

  /* Le azioni della rubrica. Sono dati, non codice sparso nel markup: chi
     vuole una tabella senza «elimina» ne passa un'altra lista. */
  var AZIONI_CRM = [
    {
      icona: '💬', titolo: 'WhatsApp',
      quando: function (c) { return !!c.telefono; },
      comando: function (c) { return "WAQuick&&WAQuick.openPanel('" + cifre(c.telefono) + "','Ciao " + String(c.nome).replace(/'/g, '') + "! ')"; },
      stile: 'padding:4px 8px;background:#25D36615;color:#25D366;border:1px solid #25D36630;border-radius:6px;cursor:pointer;font-size:11px',
    },
    {
      icona: '✏️', titolo: 'Modifica',
      comando: function (c) { return "CRMSmart._editClient('" + c.id + "')"; },
    },
    {
      icona: '🗑', titolo: 'Elimina',
      comando: function (c) { return "CRMSmart._deleteClient('" + c.id + "')"; },
      stile: 'padding:4px 8px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:6px;cursor:pointer;font-size:11px',
    },
  ];

  /* ── Le azioni aggiunte dalle patch ──────────────────────────────────────
     Tre patch (085, 089 due volte) appendevano il proprio pulsante alla riga
     500-700 ms dopo il render, cercandola per `#crm-row-<indice>`. Da CRM-04
     quell'indice non è più l'identificatore: i tre pulsanti — storico
     comunicazioni, note interne, archivio preventivi — avevano semplicemente
     smesso di comparire.

     Registrarsi qui è la stessa cosa fatta nel modo che regge: il pulsante
     entra nella riga mentre la riga viene costruita. Il renderer continua a
     non recuperare dati — chi registra passa un `prepara()`, chiamato **una
     volta per tabella**, e le sue funzioni leggono da quel contesto. Prima
     ognuna delle tre rileggeva l'intero elenco a ogni riga, e una di loro
     faceva anche un `JSON.parse` di tutti i preventivi per ciascuna. */
  var AGGIUNTE = [];
  function aggiungiAzione(def) {
    if (!def || !def.id) return false;
    for (var i = 0; i < AGGIUNTE.length; i++) if (AGGIUNTE[i].id === def.id) { AGGIUNTE[i] = def; return true; }
    AGGIUNTE.push(def);
    return true;
  }

  var COLONNE_CRM = ['selezione', 'nome', 'telefono', 'email', 'note', 'azioni'];

  /** L'HTML di una riga. Puro: stesso cliente, stesse opzioni, stessa stringa. */
  function riga(cliente, opzioni) {
    var o = opzioni || {};
    var c = campi(cliente);
    var colonne = o.colonne || COLONNE_CRM;
    var celle = colonne.map(function (col) {
      if (typeof col === 'object' && col) return CELLE.extra(c, o, col);
      var f = CELLE[col];
      return f ? f(c, o) : '<td></td>';
    }).join('');
    var fondo = o.selezionata ? ';background:rgba(99,102,241,.06)' : '';
    var idAttr = c.id ? ' id="' + esc(o.prefissoId || 'crm-row-') + esc(c.id) + '"' : '';
    var dataAttr = c.id ? ' data-cliente="' + esc(c.id) + '"' : '';
    return '<tr' + idAttr + dataAttr + ' style="border-bottom:1px solid var(--border);transition:.12s'
      + fondo + (c.archiviato ? ';opacity:.6' : '') + '">' + celle + '</tr>';
  }

  /** Tutte le righe di una pagina. Se la pagina è vuota lo dice: una tabella
      senza righe e senza spiegazione fa pensare a un guasto. */
  function righe(elenco, opzioni) {
    var o = opzioni || {};
    var lista = elenco || [];
    if (!lista.length) {
      var n = (o.colonne || COLONNE_CRM).length;
      return '<tr><td colspan="' + n + '" style="text-align:center;padding:40px;color:var(--text-dim)">'
        + esc(o.vuoto || 'Nessun cliente ancora. Aggiungi manualmente o importa un file VCF/CSV.')
        + '</td></tr>';
    }
    /* `prepara()` una volta sola per tabella, non una per riga. */
    var ctx = Object.assign({}, o.ctx);
    if (!o.senzaAggiunte) {
      AGGIUNTE.forEach(function (a) {
        if (typeof a.prepara !== 'function') return;
        try { ctx[a.id] = a.prepara(lista); }
        catch (e) { ctx[a.id] = null; }   // un'aggiunta rotta non porta giù la tabella
      });
    }
    return lista.map(function (c) {
      var op = Object.assign({}, o, { ctx: ctx });
      if (typeof o.selezionati === 'function') op.selezionata = o.selezionati(c);
      return riga(c, op);
    }).join('');
  }

  global.InglyClienteRiga = {
    VERSIONE: VERSIONE,
    esc: esc,
    campi: campi,
    riga: riga,
    righe: righe,
    CELLE: CELLE,
    COLONNE_CRM: COLONNE_CRM,
    AZIONI_CRM: AZIONI_CRM,
    aggiungiAzione: aggiungiAzione,
    aggiunte: function () { return AGGIUNTE.slice(); },
  };
})(typeof window !== 'undefined' ? window : globalThis);

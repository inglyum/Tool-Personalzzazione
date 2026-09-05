/* ═══════════════════════════════════════════════════════════════════════════
   CAMPI DELL'ORDINE · immagine, margine, assegnatario, macchina, tecnologia
   ═══════════════════════════════════════════════════════════════════════════

   La lista ordini mostrava cinque colonne — cliente, nome, stato, scadenza,
   importo — e filtrava per stato e priorità. Tutto il resto di ciò che serve
   per lavorare («chi ci sta lavorando», «su quale macchina», «quanto ci
   guadagno») esisteva nei dati e non aveva un posto sullo schermo.

   Prima di mostrarlo bisogna sapere **da dove leggerlo**, e qui il progetto
   aveva quattro risposte diverse per la stessa domanda: la tecnologia sta
   nell'ordine o nella riga dello snapshot; la macchina nella riga o nel
   pannello di produzione; l'immagine in una mappa di `localStorage` separata.

   Questo modulo è l'unica risposta. Non disegna niente e non salva niente:
   legge un ordine e dice, per ciascun campo, **qual è il valore e da dove
   viene**. Il valore serve alla vista; la provenienza serve a non mentire.

   ── La regola dello storico ────────────────────────────────────────────────
   Un ordine chiuso è un fatto avvenuto. Il margine di marzo si legge dallo
   snapshot economico di marzo, non si ricalcola con i costi di oggi: sarebbe
   il costo di oggi applicato a un prezzo di ieri, cioè un numero che non è
   mai esistito. Per questo `margine()` **non calcola niente**: o lo snapshot
   c'è, o la risposta è «non disponibile».

   Lo stesso vale per l'immagine: quella dell'ordine è quella che il cliente
   ha ordinato. Se domani la foto in catalogo cambia, l'ordine di ieri deve
   continuare a mostrare la sua. Il catalogo è l'ultima sorgente consultata, e
   quando è lui a rispondere il chiamante lo sa (`storica: false`).
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d == null ? 0 : d); };
  var testo = function (v) {
    if (v == null) return '';
    if (typeof v === 'object') return '';
    return String(v).trim();
  };

  /* ── Il registro delle tecnologie ──────────────────────────────────────────
     Non se ne tiene una copia. Il registro è `InglyCostEngine.PROFILI`: è lui
     che decide quali tecnologie il sistema sa preventivare, e un elenco
     scritto qui accanto si scollerebbe alla prima aggiunta. Se il motore non
     è caricato non si inventa un elenco: si risponde «nessuna», e chi chiama
     mostra il filtro vuoto invece di cinque voci finte. */
  function tecnologie() {
    var E = global.InglyCostEngine;
    if (!E || typeof E.tecnologie !== 'function' || !E.PROFILI) return [];
    return E.tecnologie().map(function (id) {
      return { id: id, label: (E.PROFILI[id] && E.PROFILI[id].label) || id };
    });
  }

  function etichettaTecnologia(id) {
    var t = tecnologie().filter(function (x) { return x.id === id; })[0];
    return t ? t.label : (id || '');
  }

  /* Alias storici: gli stessi nomi che il motore accetta in ingresso, perché
     un ordine importato o scritto a mano può portarli. */
  var ALIAS_TECNOLOGIA = {
    '3d': 'print3d', print3d: 'print3d', stampa3d: 'print3d', fdm: 'print3d', resina: 'print3d',
    laser: 'laser', taglio: 'laser', incisione: 'laser',
    uv: 'uv', uvprint: 'uv', stampauv: 'uv',
    dtf: 'dtf',
    sublimation: 'sublimation', sublimazione: 'sublimation', subl: 'sublimation',
    generico: 'generico', generic: 'generico',
  };

  function normalizzaTecnologia(v) {
    var s = testo(v).toLowerCase().replace(/[\s_-]/g, '');
    if (!s) return null;
    var id = ALIAS_TECNOLOGIA[s] || s;
    var noti = tecnologie().map(function (t) { return t.id; });
    /* Senza registro non si può dire se è nota: si restituisce così com'è,
       che è meglio di `null` per un filtro costruito sui valori presenti. */
    if (!noti.length) return id;
    return noti.indexOf(id) >= 0 ? id : null;
  }

  /* ── Le righe di un ordine, ovunque siano ──────────────────────────────────
     Le righe congelate dello snapshot vengono prima: sono quelle che
     descrivono l'ordine com'è stato accettato. */
  function righe(ordine) {
    var o = ordine || {};
    var snap = o.economicSnapshot;
    if (snap && snap.stato === 'SNAPSHOT' && Array.isArray(snap.lines) && snap.lines.length) return snap.lines;
    if (Array.isArray(o.lines) && o.lines.length) return o.lines;
    if (Array.isArray(o.items) && o.items.length) return o.items;
    return [];
  }

  /* ── TECNOLOGIA ────────────────────────────────────────────────────────── */
  function tecnologia(ordine) {
    var o = ordine || {};
    var diretta = normalizzaTecnologia(o.technology || o.tecnologia || o.tech);
    if (diretta) return { id: diretta, label: etichettaTecnologia(diretta), fonte: 'ordine' };
    var r = righe(o);
    for (var i = 0; i < r.length; i += 1) {
      var t = normalizzaTecnologia(r[i].technology || r[i].tecnologia || r[i].tech);
      if (t) return { id: t, label: etichettaTecnologia(t), fonte: 'riga' };
    }
    return null;
  }

  /* ── MACCHINA ──────────────────────────────────────────────────────────────
     Un ordine può nominare la macchina in quattro modi, e tre di questi
     esistevano davvero nei dati. Si legge l'id quando c'è — è l'unica cosa
     che regge a un cambio di nome — e il nome resta per mostrarlo. */
  function macchina(ordine) {
    var o = ordine || {};
    var id = testo(o.machineId || o.macchinaId || (o.machine && o.machine.id) || o.productionMachine);
    var nome = testo(o.machineName || (o.machine && (o.machine.name || o.machine.label))
      || (typeof o.machine === 'string' ? o.machine : '') || o.macchina);
    if (id || nome) return { id: id || null, nome: nome || id, fonte: 'ordine' };
    var r = righe(o);
    for (var i = 0; i < r.length; i += 1) {
      var m = r[i].machine || r[i].macchina;
      var rid = testo(r[i].machineId || (m && m.id));
      var rnome = testo((m && (m.name || m.label)) || (typeof m === 'string' ? m : ''));
      if (rid || rnome) return { id: rid || null, nome: rnome || rid, fonte: 'riga' };
    }
    return null;
  }

  /* ── ASSEGNATARIO ──────────────────────────────────────────────────────────
     Un solo campo canonico, `assignedTo`. Gli altri nomi si leggono perché
     esistono record che li portano, ma non si scrivono più. */
  function assegnatario(ordine) {
    var o = ordine || {};
    var v = o.assignedTo;
    if (v && typeof v === 'object') v = v.name || v.label || v.id;
    var s = testo(v) || testo(o.assignee) || testo(o.operator) || testo(o.operatore);
    return s || null;
  }

  /* ── MARGINE ───────────────────────────────────────────────────────────────
     Nessun ricalcolo, mai. Le tre risposte possibili sono: lo snapshot lo sa,
     la riga lo sa (ordini di prima dei totali congelati), nessuno lo sa. */
  function margine(ordine) {
    var lettura = global.InglyOrderSnapshot && global.InglyOrderSnapshot.leggi
      ? global.InglyOrderSnapshot.leggi(ordine)
      : null;

    if (lettura && lettura.disponibile && lettura.snapshot && lettura.snapshot.totals) {
      var t = lettura.snapshot.totals;
      return {
        disponibile: true,
        valore: num(t.grossProfit),
        percentuale: t.marginPct == null ? null : num(t.marginPct),
        fonte: 'snapshot',
        storico: true,
      };
    }

    /* Ordini precedenti allo snapshot: se le righe congelate portano il loro
       margine si somma quello. È comunque un dato storico — scritto quando
       l'ordine è nato — non un ricalcolo sui costi di oggi. */
    var r = righe(ordine);
    var conMargine = r.filter(function (l) { return l.marginValue != null; });
    if (conMargine.length) {
      var valore = conMargine.reduce(function (a, l) { return a + num(l.marginValue); }, 0);
      var ricavo = conMargine.reduce(function (a, l) {
        return a + num(l.finalPrice != null ? l.finalPrice : l.price);
      }, 0);
      return {
        disponibile: true,
        valore: valore,
        percentuale: ricavo > 0 ? (valore / ricavo) * 100 : null,
        fonte: 'righe',
        storico: true,
      };
    }

    return {
      disponibile: false,
      valore: null,
      percentuale: null,
      fonte: 'assente',
      storico: false,
      motivo: (lettura && lettura.messaggio) || 'nessuno snapshot economico su questo ordine',
    };
  }

  /* ── IMMAGINE ──────────────────────────────────────────────────────────────
     In ordine di verità: quella congelata sull'ordine, quella della riga,
     quella delle specifiche tecniche, e solo all'ultimo il catalogo — che è
     l'unica sorgente che può cambiare sotto un ordine già chiuso, e infatti è
     l'unica marcata `storica: false`.

     Non restituisce mai una stringa vuota: chi chiama riceve `null` e mostra
     il segnaposto, invece di un `<img src="">` che il browser disegna come
     immagine rotta. */
  function sorgenteValida(v) {
    var s = testo(v);
    if (!s) return null;
    /* Un `src` che non è né un dato incorporato né un percorso non è
       un'immagine: è un residuo, e messo in un `<img>` diventa un'icona
       rotta. */
    if (/^data:image\//i.test(s)) return s;
    if (/^(https?:)?\/\//i.test(s)) return s;
    if (/^[./]/.test(s) || /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(s)) return s;
    return null;
  }

  function primaImmagine(rec) {
    if (!rec) return null;
    var diretta = sorgenteValida(rec.image) || sorgenteValida(rec.imageUrl)
      || sorgenteValida(rec.photo) || sorgenteValida(rec.thumbnail);
    if (diretta) return diretta;
    var molte = rec.images || rec.photos;
    if (Array.isArray(molte)) {
      for (var i = 0; i < molte.length; i += 1) {
        var v = typeof molte[i] === 'string' ? molte[i] : (molte[i] && (molte[i].dataUrl || molte[i].url || molte[i].src));
        var ok = sorgenteValida(v);
        if (ok) return ok;
      }
    }
    if (rec.imageMeta && sorgenteValida(rec.imageMeta.dataUrl)) return sorgenteValida(rec.imageMeta.dataUrl);
    return null;
  }

  /**
   * @param {object} ordine
   * @param {object} [contesto] `{ specs, catalogo }` — le specifiche tecniche
   *        storiche (mappa legacy) e il prodotto di catalogo, quando il
   *        chiamante li ha già in mano. Nessuna lettura da qui.
   */
  function immagine(ordine, contesto) {
    var o = ordine || {};
    var c = contesto || {};

    var propria = primaImmagine(o);
    if (propria) return { src: propria, fonte: 'ordine', storica: true };

    var snap = o.economicSnapshot;
    if (snap && snap.stato === 'SNAPSHOT') {
      var daSnap = primaImmagine(snap);
      if (daSnap) return { src: daSnap, fonte: 'snapshot', storica: true };
    }

    var r = righe(o);
    for (var i = 0; i < r.length; i += 1) {
      var daRiga = primaImmagine(r[i]);
      if (daRiga) return { src: daRiga, fonte: 'riga', storica: true };
    }

    var daSpecs = primaImmagine(c.specs);
    if (daSpecs) return { src: daSpecs, fonte: 'specifiche', storica: true };

    /* Il catalogo di oggi su un ordine di ieri: si mostra, perché un'immagine
       approssimativa aiuta più di un quadrato grigio, ma si dichiara. */
    var daCatalogo = primaImmagine(c.catalogo);
    if (daCatalogo) return { src: daCatalogo, fonte: 'catalogo', storica: false };

    return null;
  }

  /* ── Le opzioni dei filtri ─────────────────────────────────────────────────
     Si costruiscono dagli ordini che ci sono. Un filtro che offre «Macchina
     Laser 3» quando nessun ordine la nomina è un vicolo cieco: si sceglie e
     non compare niente. Le tecnologie fanno eccezione controllata — l'elenco
     completo del registro resta disponibile per chi vuole assegnarle. */
  function opzioni(ordini) {
    var lista = Array.isArray(ordini) ? ordini : [];
    var mac = {}; var ope = {}; var tec = {};
    lista.forEach(function (o) {
      var m = macchina(o);
      if (m) mac[m.id || m.nome] = m.nome;
      var a = assegnatario(o);
      if (a) ope[a] = a;
      var t = tecnologia(o);
      if (t) tec[t.id] = t.label;
    });
    var chiavi = function (mappa) {
      return Object.keys(mappa).sort(function (a, b) {
        return String(mappa[a]).localeCompare(String(mappa[b]), 'it');
      }).map(function (k) { return { id: k, label: mappa[k] }; });
    };
    return { macchine: chiavi(mac), operatori: chiavi(ope), tecnologie: chiavi(tec) };
  }

  var FILTRI_VUOTI = { macchina: 'all', operatore: 'all', tecnologia: 'all' };

  /** Vero se l'ordine passa i tre filtri. `all` e valori assenti non filtrano. */
  function passa(ordine, criteri) {
    var f = criteri || {};
    if (f.macchina && f.macchina !== 'all') {
      var m = macchina(ordine);
      if (!m || (String(m.id) !== String(f.macchina) && String(m.nome) !== String(f.macchina))) return false;
    }
    if (f.operatore && f.operatore !== 'all') {
      var a = assegnatario(ordine);
      if (!a || String(a) !== String(f.operatore)) return false;
    }
    if (f.tecnologia && f.tecnologia !== 'all') {
      var t = tecnologia(ordine);
      if (!t || String(t.id) !== String(f.tecnologia)) return false;
    }
    return true;
  }

  function filtra(ordini, criteri) {
    return (Array.isArray(ordini) ? ordini : []).filter(function (o) { return passa(o, criteri); });
  }

  global.InglyOrderFields = {
    VERSIONE: '1.0.0',
    FILTRI_VUOTI: FILTRI_VUOTI,
    tecnologie: tecnologie,
    normalizzaTecnologia: normalizzaTecnologia,
    righe: righe,
    tecnologia: tecnologia,
    macchina: macchina,
    assegnatario: assegnatario,
    margine: margine,
    immagine: immagine,
    opzioni: opzioni,
    passa: passa,
    filtra: filtra,
  };
})(typeof window !== 'undefined' ? window : globalThis);

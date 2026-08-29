/* ═══════════════════════════════════════════════════════════════════════════
   TEMPLATE DI PREVENTIVO · quello che si salva è tutto il lavoro, non le righe
   ═══════════════════════════════════════════════════════════════════════════

   Un template conservava quattro cose: le righe, il ricarico, lo sconto e un
   nome. Sembra abbastanza finché non lo si riusa: l'IVA torna al valore
   predefinito, la spedizione sparisce, le commissioni di canale pure, e la
   politica di prezzo con cui quel lavoro era stato costruito non c'è mai
   stata. Chi ricarica un template si ritrova un preventivo che **somiglia** a
   quello di prima e non lo è, e la differenza si vede solo alla fine, nel
   totale.

   Un template è la ricetta di un lavoro. Se la ricetta dimentica metà degli
   ingredienti, il piatto non è lo stesso.

   Questo modulo è puro: non conosce IndexedDB, non disegna. Prende lo stato
   del preventivo e ne fa un template; prende un template e ne fa lo stato del
   preventivo. Il giro deve chiudersi senza perdere niente — ed è la sola cosa
   che ha davvero senso provare.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var SCHEMA = 2;

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };
  function ora() { try { return new Date().toISOString(); } catch (e) { return ''; } }

  /* Le categorie servono a ritrovare un template fra quaranta. Sono quelle del
     mestiere, non una tassonomia inventata: chi lavora sa in quale cassetto ha
     messo la targa incisa. */
  var CATEGORIE = [
    { id: 'laser', label: 'Laser', icona: '⚡' },
    { id: 'stampa3d', label: 'Stampa 3D', icona: '🧊' },
    { id: 'uv', label: 'Stampa UV', icona: '🖨️' },
    { id: 'dtf', label: 'DTF e tessile', icona: '👕' },
    { id: 'sublimazione', label: 'Sublimazione', icona: '🌈' },
    { id: 'insegne', label: 'Insegne e targhe', icona: '🪧' },
    { id: 'bomboniere', label: 'Eventi e bomboniere', icona: '🎁' },
    { id: 'altro', label: 'Altro', icona: '📋' },
  ];

  /* ── I campi economici che un template deve portarsi dietro ────────────────
     L'elenco è lungo di proposito. Ogni voce che manca è un numero che torna
     al valore predefinito senza dirlo, e i valori predefiniti non sono quelli
     con cui il lavoro era stato quotato. */
  var CAMPI_PREZZO = [
    'strategia', 'markup', 'markupPct', 'marginePct', 'fixedPrice', 'marketPrice',
    'discountPct', 'vatPct', 'setupCost', 'failureRate',
    'overheadPct', 'overheadPerHour', 'hours',
    'paymentFeePct', 'paymentFeeFixed', 'marketplaceFeePct',
    'shippingCost', 'shippingCharged', 'otherVariableCosts',
    'marginePavimentoPct', 'policy',
  ];

  /** Una riga di template: cosa serve per ricostruirla, e l'identità se c'è. */
  function rigaTemplate(l) {
    var r = l || {};
    return {
      name: r.name || r.desc || 'Voce',
      desc: r.desc || r.name || '',
      cat: r.cat || null,
      catLabel: r.catLabel || null,
      detail: r.detail || '',
      unit: r.unit || 'pz',
      qty: Math.max(1, num(r.qty, 1)),
      unitCost: num(r.unitCost),
      subtotal: num(r.subtotal, num(r.unitCost) * Math.max(1, num(r.qty, 1))),
      color: r.color || '',
      colorPick: r.colorPick || '',
      /* Il collegamento al magazzino sopravvive al template: un lavoro
         ricaricato fra sei mesi sa ancora quale materiale consuma, e il costo
         reale arriva dal registro invece che dal numero congelato qui. */
      itemId: r.itemId != null ? r.itemId : null,
      itemStore: r.itemStore || null,
      itemKey: r.itemKey || null,
    };
  }

  /**
   * Da stato del preventivo a template.
   *
   * @param {Object} stato  righe e campi economici, come li tiene il quoter
   * @param {Object} meta   nome, descrizione, categoria, note
   */
  function daStato(stato, meta) {
    var s = stato || {};
    var m = meta || {};
    var prezzo = {};
    CAMPI_PREZZO.forEach(function (k) { if (s[k] !== undefined && s[k] !== null && s[k] !== '') prezzo[k] = s[k]; });

    return {
      schemaVersion: SCHEMA,
      name: String(m.name || '').trim(),
      desc: String(m.desc || '').trim(),
      category: m.category || 'altro',
      notes: String(m.notes || '').trim(),
      tags: Array.isArray(m.tags) ? m.tags.slice() : [],

      lines: (s.lines || []).map(rigaTemplate),
      pricing: prezzo,

      /* Quanto è stato usato, e quando l'ultima volta. Non è statistica per
         far bella figura: serve a capire quali template tenere e quali sono
         morti, e si costruisce dall'uso vero. */
      usoConteggio: num(m.usoConteggio, 0),
      usatoIl: m.usatoIl || null,

      creatoIl: m.creatoIl || ora(),
      aggiornatoIl: ora(),
      /* `ts` resta per compatibilità con l'ordinamento dei template già
         salvati, che ordina su questo campo. */
      ts: Date.now(),
    };
  }

  /**
   * Da template a stato del preventivo.
   *
   * Il giro deve chiudersi: quello che è entrato deve uscire identico, o il
   * template è una promessa che non mantiene.
   */
  function aStato(template) {
    var t = migra(template) || {};
    var stato = {
      lines: (t.lines || []).map(function (l, n) {
        return Object.assign({}, l, { id: Date.now() + n });
      }),
    };
    CAMPI_PREZZO.forEach(function (k) { if (t.pricing && t.pricing[k] !== undefined) stato[k] = t.pricing[k]; });
    return stato;
  }

  /* ── Migrazione ────────────────────────────────────────────────────────────
     I template già salvati hanno lo schema 1: righe, markup, sconto. Si
     leggono ancora, e quello che non contenevano resta assente invece di
     diventare un valore predefinito travestito da scelta. */
  function migra(template) {
    var t = template;
    if (!t || typeof t !== 'object') return null;
    if (t.schemaVersion >= SCHEMA) return t;

    var prezzo = {};
    /* Lo schema 1 scriveva `markup` come **percentuale** (100 = +100%): è la
       stessa ambiguità che la Fase 30 ha misurato sui preventivi salvati.
       Qui si conserva il numero e si dichiara cosa significa. */
    if (t.markup != null) prezzo.markupPct = num(t.markup, 100);
    if (t.discount != null) prezzo.discountPct = num(t.discount);
    if (t.vat != null) prezzo.vatPct = num(t.vat);

    return {
      schemaVersion: SCHEMA,
      id: t.id,
      name: t.name || 'Template senza nome',
      desc: t.desc || '',
      category: t.category || 'altro',
      notes: '',
      tags: [],
      lines: (t.lines || []).map(rigaTemplate),
      pricing: prezzo,
      usoConteggio: num(t.usoConteggio, 0),
      usatoIl: t.usatoIl || null,
      creatoIl: t.creatoIl || (t.ts ? new Date(t.ts).toISOString() : ora()),
      aggiornatoIl: t.aggiornatoIl || (t.ts ? new Date(t.ts).toISOString() : ora()),
      ts: t.ts || Date.now(),
      _migrato: true,
    };
  }

  /* ── Validazione ───────────────────────────────────────────────────────── */
  function valida(template) {
    var t = template || {};
    var errori = [];
    if (!String(t.name || '').trim()) errori.push('Il template ha bisogno di un nome.');
    if (!Array.isArray(t.lines) || !t.lines.length) errori.push('Un template senza voci non serve a niente.');
    if (t.category && !CATEGORIE.some(function (c) { return c.id === t.category; })) {
      errori.push('Categoria sconosciuta: ' + t.category);
    }
    (t.lines || []).forEach(function (l, i) {
      if (!(num(l.qty) > 0)) errori.push('Riga ' + (i + 1) + ': quantità non valida.');
    });
    return { valido: errori.length === 0, errori: errori };
  }

  /* ── Ricerca e ordinamento ─────────────────────────────────────────────────
     SOURCE → SEARCH → FILTER → SORT, nello stesso ordine e per lo stesso
     motivo del CRM: filtrare dopo aver tagliato l'elenco produce risultati che
     mancano. */
  var ORDINAMENTI = {
    recenti: { label: 'Più recenti', cmp: function (a, b) { return (b.ts || 0) - (a.ts || 0); } },
    usati: { label: 'Più usati', cmp: function (a, b) { return (b.usoConteggio || 0) - (a.usoConteggio || 0) || (b.ts || 0) - (a.ts || 0); } },
    nome: { label: 'Nome', cmp: function (a, b) { return String(a.name || '').localeCompare(String(b.name || '')); } },
    valore: { label: 'Valore', cmp: function (a, b) { return costoDi(b) - costoDi(a); } },
  };

  function costoDi(t) {
    return (t.lines || []).reduce(function (a, l) { return a + num(l.subtotal, num(l.unitCost) * num(l.qty, 1)); }, 0);
  }

  function cerca(elenco, opzioni) {
    var o = opzioni || {};
    var out = (elenco || []).map(migra).filter(Boolean);

    var q = String(o.q || '').trim().toLowerCase();
    if (q) {
      out = out.filter(function (t) {
        var testo = [t.name, t.desc, t.notes, (t.tags || []).join(' '),
          (t.lines || []).map(function (l) { return l.name; }).join(' ')].join(' ').toLowerCase();
        return testo.indexOf(q) >= 0;
      });
    }
    if (o.category && o.category !== 'tutte') {
      out = out.filter(function (t) { return t.category === o.category; });
    }
    var ord = ORDINAMENTI[o.ordine] || ORDINAMENTI.recenti;
    return out.slice().sort(ord.cmp);
  }

  /** Quante ce ne sono per categoria: serve a non offrire cassetti vuoti. */
  function perCategoria(elenco) {
    var conta = {};
    (elenco || []).map(migra).filter(Boolean).forEach(function (t) {
      conta[t.category || 'altro'] = (conta[t.category || 'altro'] || 0) + 1;
    });
    return CATEGORIE.map(function (c) { return Object.assign({}, c, { quanti: conta[c.id] || 0 }); })
      .filter(function (c) { return c.quanti > 0; });
  }

  /* ── Riepilogo per l'anteprima ─────────────────────────────────────────────
     Il costo si somma dalle righe; il **prezzo** no. Chi vuole il prezzo passa
     dal motore, come tutti — questo modulo non ne conosce la matematica e non
     deve conoscerla. */
  function riepilogo(template) {
    var t = migra(template) || {};
    var righe = t.lines || [];
    return {
      voci: righe.length,
      pezzi: righe.reduce(function (a, l) { return a + num(l.qty, 1); }, 0),
      costo: costoDi(t),
      collegate: righe.filter(function (l) { return l.itemKey; }).length,
      categoria: (CATEGORIE.filter(function (c) { return c.id === t.category; })[0]) || CATEGORIE[CATEGORIE.length - 1],
      /* Cosa il template porta con sé oltre alle righe: è l'informazione che
         distingue un template completo da uno che ricarica metà lavoro. */
      economia: Object.keys(t.pricing || {}).length,
      migrato: !!t._migrato,
    };
  }

  /** Un duplicato è un template nuovo: non eredita l'uso di quello vecchio. */
  function duplica(template, nome) {
    var t = migra(template);
    if (!t) return null;
    var copia = JSON.parse(JSON.stringify(t));
    delete copia.id;
    copia.name = String(nome || (t.name + ' (copia)')).trim();
    copia.usoConteggio = 0;
    copia.usatoIl = null;
    copia.creatoIl = ora();
    copia.aggiornatoIl = ora();
    copia.ts = Date.now();
    delete copia._migrato;
    return copia;
  }

  /** L'uso si registra quando il template viene davvero caricato. */
  function segnaUso(template) {
    var t = migra(template);
    if (!t) return null;
    t.usoConteggio = num(t.usoConteggio, 0) + 1;
    t.usatoIl = ora();
    return t;
  }

  /* ── Scambio fra postazioni ────────────────────────────────────────────────
     Chi lavora su due computer non deve ricostruire i template a mano. */
  function perEsportazione(elenco) {
    return {
      formato: 'ingly-quote-templates',
      schemaVersion: SCHEMA,
      esportatoIl: ora(),
      templates: (elenco || []).map(migra).filter(Boolean).map(function (t) {
        var c = JSON.parse(JSON.stringify(t));
        delete c.id;              // gli id sono di chi importa, non di chi esporta
        delete c._migrato;
        return c;
      }),
    };
  }

  function daImportazione(dati) {
    var d = dati;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return { ok: false, motivo: 'Il file non è un JSON valido.' }; } }
    if (!d || d.formato !== 'ingly-quote-templates') {
      return { ok: false, motivo: 'Questo file non contiene template INGLY.' };
    }
    var buoni = [], scartati = [];
    (d.templates || []).forEach(function (t, i) {
      var m = migra(t);
      var v = valida(m);
      if (v.valido) buoni.push(m); else scartati.push({ indice: i, nome: (t && t.name) || '—', motivi: v.errori });
    });
    return { ok: true, templates: buoni, scartati: scartati, schemaOrigine: d.schemaVersion || 1 };
  }

  global.InglyQuoteTemplates = {
    SCHEMA: SCHEMA,
    CATEGORIE: CATEGORIE,
    CAMPI_PREZZO: CAMPI_PREZZO,
    ORDINAMENTI: ORDINAMENTI,
    daStato: daStato,
    aStato: aStato,
    migra: migra,
    valida: valida,
    cerca: cerca,
    perCategoria: perCategoria,
    riepilogo: riepilogo,
    duplica: duplica,
    segnaUso: segnaUso,
    perEsportazione: perEsportazione,
    daImportazione: daImportazione,
  };
})(typeof window !== 'undefined' ? window : globalThis);

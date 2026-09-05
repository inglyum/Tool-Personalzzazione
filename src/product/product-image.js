/* ═══════════════════════════════════════════════════════════════════════════
   PRODUCT IMAGE FIELD · un campo immagine, sei posti
   ═══════════════════════════════════════════════════════════════════════════

   Un pannello immagine esisteva già — `QuoterImagePanel`, patch 066 — e
   funziona. Non è però riusabile, per tre motivi che vale la pena dire perché
   sono gli stessi che rendono non riusabile quasi tutto:

     1. **id fissi.** Ogni campo si chiama `qip-...`. Due pannelli nella stessa
        pagina si sovrascriverebbero a vicenda.
     2. **un archivio solo.** Salva in `OrderSpecs`, sotto la chiave
        `quoter_current`. Il catalogo tiene l'immagine sul record del prodotto,
        gli ordini altrove: un campo che sceglie l'archivio per conto suo può
        vivere in un posto e basta.
     3. **immagine e misure insieme.** Larghezza, spessore e materiale sono
        cose del laser. Un preventivatore tessile non ne ha bisogno, e per
        avere l'immagine dovrebbe portarsi dietro anche quelle.

   Questo campo fa una cosa sola: l'immagine. Chi lo monta decide dove si
   salva — riceve il valore e lo scrive dove vuole. È l'unico modo perché sei
   moduli con sei archivi diversi possano usare lo stesso campo.

   Sul formato: si conserva quello originale. Un PNG con trasparenza convertito
   in JPEG perde la trasparenza, e un logo su fondo bianco al posto del fondo
   trasparente è un danno silenzioso. Si ridimensiona soltanto quando l'immagine
   è più grande del necessario — una foto da telefono è spesso 12 megapixel, e
   come stringa base64 non entra da nessuna parte.
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

  var LATO_MAX = 1280;              // px sul lato lungo
  var PESO_MAX = 8 * 1024 * 1024;   // il file scelto, prima di qualunque cosa

  /* I formati che un browser sa disegnare e ri-esportare. Un TIFF o un RAW non
     si rifiutano per snobismo: si rifiutano perché il canvas non li legge, e
     accettarli vorrebbe dire salvare un'anteprima nera. */
  var FORMATI = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

  function leggibile(byte) {
    var n = Number(byte) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' kB';
    return (Math.round(n / (1024 * 1024) * 10) / 10) + ' MB';
  }

  /** Il file letto come data URL. */
  function leggi(file) {
    return new Promise(function (risolvi, rifiuta) {
      var r = new FileReader();
      r.onload = function (e) { risolvi(e.target.result); };
      r.onerror = function () { rifiuta(new Error('file non leggibile')); };
      r.readAsDataURL(file);
    });
  }

  /** Le dimensioni, e l'elemento già caricato per chi deve ridisegnarlo.
      Un file che non si carica non è un errore da propagare: è un'immagine
      senza dimensioni note, e si dice. */
  function dimensioni(dataUrl) {
    return new Promise(function (risolvi) {
      var i = new Image();
      i.onload = function () { risolvi({ ok: true, w: i.naturalWidth, h: i.naturalHeight, el: i }); };
      i.onerror = function () { risolvi({ ok: false, w: 0, h: 0, el: null }); };
      i.src = dataUrl;
    });
  }

  /**
   * Riduce l'immagine se supera il lato massimo, **conservando il formato**.
   * Se è già piccola non si tocca: ricomprimere un'immagine che va bene la
   * peggiora e basta.
   */
  function ridimensiona(dataUrl, tipo, latoMax) {
    var lato = latoMax || LATO_MAX;
    return dimensioni(dataUrl).then(function (d) {
      if (!d.ok) return { dataUrl: dataUrl, w: 0, h: 0, ridotta: false };
      var piu = Math.max(d.w, d.h);
      if (piu <= lato) return { dataUrl: dataUrl, w: d.w, h: d.h, ridotta: false };

      var scala = lato / piu;
      var w = Math.round(d.w * scala);
      var h = Math.round(d.h * scala);
      try {
        var c = global.document.createElement('canvas');
        c.width = w; c.height = h;
        var ctx = c.getContext('2d');
        if (!ctx) return { dataUrl: dataUrl, w: d.w, h: d.h, ridotta: false };
        ctx.drawImage(d.el, 0, 0, w, h);
        /* Il GIF animato perde l'animazione se ridisegnato: si lascia com'è.
           Un'immagine grande è un problema minore di un'animazione persa. */
        if (tipo === 'image/gif') return { dataUrl: dataUrl, w: d.w, h: d.h, ridotta: false };
        var uscita = c.toDataURL(FORMATI.indexOf(tipo) > -1 ? tipo : 'image/png', 0.86);
        /* Se il ridimensionamento non ha guadagnato niente, si tiene
           l'originale: succede con le immagini già molto compresse. */
        if (uscita.length >= dataUrl.length) return { dataUrl: dataUrl, w: d.w, h: d.h, ridotta: false };
        return { dataUrl: uscita, w: w, h: h, ridotta: true };
      } catch (e) {
        return { dataUrl: dataUrl, w: d.w, h: d.h, ridotta: false };
      }
    });
  }

  /**
   * Trasforma un file scelto dall'utente nel valore del campo.
   * Restituisce sempre un oggetto: o l'immagine, o il motivo per cui no.
   */
  function daFile(file, opzioni) {
    var o = opzioni || {};
    if (!file) return Promise.resolve({ ok: false, motivo: 'nessun file scelto' });
    if (FORMATI.indexOf(file.type) === -1) {
      return Promise.resolve({
        ok: false,
        motivo: 'formato non supportato (' + (file.type || 'sconosciuto') + ')',
        cosaFare: 'Usa JPG, PNG, WebP o GIF.',
      });
    }
    if (file.size > (o.pesoMax || PESO_MAX)) {
      return Promise.resolve({
        ok: false,
        motivo: 'file troppo grande (' + leggibile(file.size) + ')',
        cosaFare: 'Il massimo è ' + leggibile(o.pesoMax || PESO_MAX) + '.',
      });
    }

    return leggi(file)
      .then(function (dataUrl) { return ridimensiona(dataUrl, file.type, o.latoMax); })
      .then(function (r) {
        return {
          ok: true,
          immagine: {
            dataUrl: r.dataUrl,
            nome: file.name,
            tipo: file.type,
            byte: r.dataUrl.length,
            byteOriginali: file.size,
            larghezza: r.w,
            altezza: r.h,
            ridotta: r.ridotta,
            quando: new Date().toISOString(),
          },
        };
      })
      .catch(function (e) {
        return { ok: false, motivo: (e && e.message) || 'lettura non riuscita' };
      });
  }

  /* ── Il campo ────────────────────────────────────────────────────────────
     Ogni istanza ha il suo prefisso: due campi nella stessa pagina non si
     pestano i piedi, che è il motivo per cui quello vecchio non era riusabile. */
  var contatore = 0;

  /**
   * @param {Element}  nodo        dove montarlo
   * @param {Object}   opzioni
   * @param {Object}   opzioni.valore     l'immagine già salvata, o null
   * @param {Function} opzioni.onChange   riceve l'immagine (o null se rimossa)
   * @param {string}   opzioni.etichetta
   * @param {boolean}  opzioni.compatto
   */
  function monta(nodo, opzioni) {
    if (!nodo) return null;
    var o = opzioni || {};
    var pre = 'pif' + (++contatore);
    var valore = o.valore || null;
    var altezza = o.compatto ? 96 : 150;

    function avvisa(messaggio, tipo) {
      var n = nodo.querySelector('#' + pre + '-msg');
      if (n) {
        n.textContent = messaggio || '';
        n.style.color = tipo === 'errore' ? 'var(--red, #ef4444)' : 'var(--text-dim)';
      }
      if (tipo === 'errore' && global.toast) global.toast(messaggio, 'warning');
    }

    function disegna() {
      var v = valore;
      nodo.innerHTML =
        (o.etichetta
          ? '<div style="font-size:10px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">'
            + esc(o.etichetta) + '</div>' : '')
        + '<div id="' + pre + '-drop" role="button" tabindex="0"'
        + ' aria-label="' + (v ? 'Sostituisci l\'immagine del prodotto' : 'Aggiungi un\'immagine al prodotto') + '"'
        + ' style="border:1.5px dashed var(--border);border-radius:10px;min-height:' + altezza + 'px;'
        + 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;'
        + 'cursor:pointer;background:var(--bg-card2);overflow:hidden;position:relative;transition:.15s">'
        + (v
          ? '<img src="' + esc(v.dataUrl) + '" alt="' + esc(v.nome || 'Immagine del prodotto') + '"'
            + ' style="max-width:100%;max-height:' + altezza + 'px;object-fit:contain;display:block">'
          : '<span style="font-size:22px" aria-hidden="true">🖼️</span>'
            + '<span style="font-size:11px;color:var(--text-muted)">Trascina qui una foto, o clicca</span>'
            + '<span style="font-size:9px;color:var(--text-dim)">JPG · PNG · WebP · GIF</span>')
        + '</div>'
        + '<input type="file" id="' + pre + '-file" accept="image/*" style="display:none">'
        + (v
          ? '<div style="display:flex;gap:6px;align-items:center;margin-top:6px;flex-wrap:wrap">'
            + '<button type="button" id="' + pre + '-sost" style="padding:4px 9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:10px;color:var(--text-muted)">Sostituisci</button>'
            + '<button type="button" id="' + pre + '-rim" style="padding:4px 9px;background:transparent;border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:10px;color:var(--red, #ef4444)">Rimuovi</button>'
            + '<span style="font-size:9px;color:var(--text-dim);flex:1;min-width:120px;text-align:right">'
            + esc((v.larghezza && v.altezza ? v.larghezza + '×' + v.altezza + ' · ' : '') + leggibile(v.byte))
            + (v.ridotta ? ' · ridimensionata' : '') + '</span>'
            + '</div>'
          : '')
        + '<div id="' + pre + '-msg" style="font-size:9px;color:var(--text-dim);margin-top:4px;min-height:12px"></div>';

      lega();
    }

    async function accetta(file) {
      avvisa('Carico…');
      var r = await daFile(file, o);
      if (!r.ok) { avvisa((r.motivo || 'non caricata') + (r.cosaFare ? ' — ' + r.cosaFare : ''), 'errore'); return; }
      valore = r.immagine;
      disegna();
      if (r.immagine.ridotta) {
        avvisa('Ridimensionata a ' + r.immagine.larghezza + '×' + r.immagine.altezza + ' per non occupare spazio inutile.');
      }
      if (typeof o.onChange === 'function') o.onChange(valore);
    }

    function lega() {
      var drop = nodo.querySelector('#' + pre + '-drop');
      var file = nodo.querySelector('#' + pre + '-file');
      var sost = nodo.querySelector('#' + pre + '-sost');
      var rim = nodo.querySelector('#' + pre + '-rim');

      if (file) file.onchange = function () { if (file.files && file.files[0]) accetta(file.files[0]); file.value = ''; };
      if (drop) {
        drop.onclick = function () { if (file) file.click(); };
        drop.onkeydown = function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (file) file.click(); }
        };
        drop.ondragover = function (e) { e.preventDefault(); drop.style.borderColor = 'var(--primary)'; };
        drop.ondragleave = function () { drop.style.borderColor = 'var(--border)'; };
        drop.ondrop = function (e) {
          e.preventDefault();
          drop.style.borderColor = 'var(--border)';
          var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
          if (f) accetta(f);
        };
      }
      if (sost) sost.onclick = function (e) { e.stopPropagation(); if (file) file.click(); };
      if (rim) rim.onclick = function (e) {
        e.stopPropagation();
        valore = null;
        disegna();
        if (typeof o.onChange === 'function') o.onChange(null);
      };
    }

    disegna();

    return {
      /** L'immagine attuale, o null. */
      valore: function () { return valore; },
      /** La imposta da fuori — per esempio quando si cambia prodotto. */
      imposta: function (v) { valore = v || null; disegna(); },
      /** Ridisegna senza toccare il valore. */
      ridisegna: disegna,
    };
  }

  global.InglyProductImage = {
    VERSIONE: '1.0.0',
    LATO_MAX: LATO_MAX,
    PESO_MAX: PESO_MAX,
    FORMATI: FORMATI,
    monta: monta,
    daFile: daFile,
    ridimensiona: ridimensiona,
    dimensioni: dimensioni,
    leggibile: leggibile,
  };
})(typeof window !== 'undefined' ? window : globalThis);

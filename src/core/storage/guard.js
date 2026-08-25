/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · GUARDIA SULLO SPAZIO DI ARCHIVIAZIONE
   ═══════════════════════════════════════════════════════════════════════════

   `localStorage` ha un tetto pratico di 5–10 MB. Superato quel tetto ogni
   scrittura lancia `QuotaExceededError` — e nel v96 nessuna delle 297 chiamate
   a `setItem` lo intercetta. Quasi tutte stanno dentro un `catch(e){}` vuoto,
   quindi il salvataggio fallisce, l'interfaccia render il messaggio di
   successo, e il dato non c'è più. Un laboratorio se ne accorge il giorno in
   cui cerca un ordine.

   Modificare 297 punti non è la risposta: sono in trenta file e alcuni sono
   generati come stringhe. La risposta è un punto solo, il più in alto
   possibile — questo block viene composto prima di ogni altro script.

   La semantica non cambia: l'errore viene **rilanciato** come prima, così un
   chiamante che lo gestisce continua a gestirlo. L'unica differenza è che
   adesso qualcuno se ne accorge.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var Storage = global.Storage;
  if (!Storage || !Storage.prototype || Storage.prototype.__inglyGuard) return;

  var original = Storage.prototype.setItem;
  var alreadyWarned = false;

  function isQuotaError(e) {
    if (!e) return false;
    // Il nome è la via moderna; il codice 22 (e 1014 su Firefox) copre il resto.
    return e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      e.code === 22 || e.code === 1014;
  }

  /** Le chiavi più pesanti, per dire *cosa* occupa lo spazio invece che «pieno». */
  function usage() {
    var rows = [];
    var total = 0;
    try {
      for (var i = 0; i < global.localStorage.length; i++) {
        var k = global.localStorage.key(i);
        var n = (global.localStorage.getItem(k) || '').length;
        total += n;
        rows.push({ key: k, byte: n });
      }
    } catch (e) { /* se non si può nemmeno leggere, si riporta quel che c'è */ }
    rows.sort(function (a, b) { return b.byte - a.byte; });
    return { total: total, largest: rows.slice(0, 8) };
  }

  function warnOnce(key, value) {
    var state = usage();
    var kb = function (n) { return (n / 1024).toFixed(0) + ' KB'; };

    console.error(
      '[INGLY] Spazio esaurito: la scrittura di «' + key + '» (' +
      kb(String(value == null ? '' : value).length) + ') NON è stata salvata.\n' +
      'Occupati ' + kb(state.total) + ' in ' + state.largest.length + '+ chiavi. Le largest:\n' +
      state.largest.map(function (r) { return '  ' + kb(r.byte) + '  ' + r.key; }).join('\n')
    );

    if (alreadyWarned) return;   // una volta per sessione: il resto sta in console
    alreadyWarned = true;

    var render = function () {
      if (!global.document || !global.document.body) return;
      var el = global.document.createElement('div');
      el.setAttribute('role', 'alert');
      el.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483647;' +
        'background:#2a0d0f;border:1px solid #e03b41;border-left:4px solid #e03b41;border-radius:10px;' +
        'padding:14px 16px;color:#f7d7d8;font:14px/1.5 system-ui,sans-serif;box-shadow:0 8px 32px #000a;' +
        'display:flex;gap:12px;align-items:flex-start;max-width:620px;margin:0 auto';
      el.innerHTML =
        '<span style="font-size:18px;flex-shrink:0">⚠️</span>' +
        '<div style="flex:1"><b style="color:#fff">Spazio di archiviazione esaurito.</b><br>' +
        'L\'ultimo salvataggio <b>non è state registrato</b>. Esporta un backup dalle ' +
        'Impostazioni e libera spazio prima di continuare a lavorare.<br>' +
        '<span style="opacity:.75;font-size:12.5px">Occupati ' + kb(state.total) +
        ' — dettaglio nella console del browser.</span></div>' +
        '<button style="background:none;border:none;color:#f7d7d8;font-size:18px;cursor:pointer;' +
        'padding:0 4px;flex-shrink:0" aria-label="Chiudi">&times;</button>';
      el.querySelector('button').addEventListener('click', function () { el.remove(); });
      global.document.body.appendChild(el);
    };

    if (global.document && global.document.body) render();
    else if (global.document) global.document.addEventListener('DOMContentLoaded', render);
  }

  Storage.prototype.setItem = function (key, value) {
    try {
      return original.call(this, key, value);
    } catch (e) {
      if (isQuotaError(e)) warnOnce(key, value);
      throw e;   // la semantica resta quella di prima
    }
  };
  Storage.prototype.__inglyGuard = true;

  /* Utile per diagnosticare prima che sia troppo tardi. */
  global.InglyStorage = {
    usage: usage,
    /** Quanto spazio resta, misurato scrivendo per davvero e poi ripulendo. */
    probeFree: function (stepKB) {
      var step = (stepKB || 256) * 1024;
      var block = new Array(step + 1).join('x');
      var key = '__ingly_prova_spazio__';
      var written = 0;
      try {
        for (var i = 0; i < 64; i++) { original.call(global.localStorage, key + i, block); written++; }
      } catch (e) { /* raggiunto il limite: è esattamente ciò che si voleva sapere */ }
      for (var j = 0; j < written; j++) global.localStorage.removeItem(key + j);
      return { freeAtLeastKB: (written * step) / 1024, full: written === 0 };
    },
  };
})(window);

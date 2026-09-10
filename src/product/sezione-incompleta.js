/* ═══════════════════════════════════════════════════════════════════════════
   SEZIONE-INCOMPLETA — quando una voce di menù non ha un modulo dietro
   ═══════════════════════════════════════════════════════════════════════════

   Misurato aprendo l'applicazione in un browser, una sezione per volta:

       revsim   vista attiva, 0 caratteri   `RevSim` non è definito in nessun
                                            file sorgente: solo due export
                                            protetti che non trovano niente

   È una sezione annunciata nel menù e mai costruita. Chi ci clicca non impara
   che la funzione non c'è: impara che il programma è rotto.

   ── Un errore da cui viene la forma di questo file ──────────────────────

   La prima versione di questo modulo copriva anche «Business Unit» e «Team»,
   perché anche le loro sezioni sembravano vuote. Sembravano: `BU` e `Team`
   sono due moduli completi, scritti e funzionanti, che disegnavano una griglia
   vuota perché l'archivio non aveva ancora nessun record. Sostituirli con un
   cartello «non ancora disponibile» sarebbe stato peggio del difetto.

   Per questo `mostra()` controlla `moduloPresente()` prima di scrivere, e per
   questo qui dentro sta una sezione sola: il pannello risponde solo dove non
   c'è davvero niente. Un archivio vuoto non è una funzione mancante, ed è un
   caso che va risolto dove sta — dentro il modulo che disegna la lista.

   ── Perché non si inventano i tre moduli ────────────────────────────────

   Un Revenue Simulator che proietta ricavi senza uno storico proietta numeri
   inventati, e il §43 vale anche qui. Un modulo Team che non sa nulla del
   personale reale mostrerebbe un organico immaginario. Costruirli è lavoro
   vero, con dati veri: è una funzione da decidere, non un difetto da tappare.

   ── Cosa fa questo file, allora ─────────────────────────────────────────

   Dice la verità e indica dove andare oggi. Ogni sezione dichiara tre cose:
   a cosa servirebbe, che non c'è ancora, e quale strumento già presente
   risponde alla stessa domanda adesso. Il pulsante morto sparisce, perché un
   comando che non comanda niente non deve stare in pagina.

   Non è un segnaposto decorativo: è il minimo che rende la sezione onesta.
   Quando uno dei tre moduli verrà scritto, `mostra()` non verrà più chiamata
   — la rotta preferisce sempre il modulo vero, se c'è.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  /* Ogni voce dichiara la propria alternativa reale: una sezione che esiste,
     funziona, e risponde alla stessa domanda oggi. Senza quella, questo
     pannello sarebbe solo una scusa scritta meglio. */
  var SEZIONI = {
    revsim: {
      titolo: 'Revenue Simulator',
      icona: '📈',
      cosaFarebbe: 'Simulare l\'effetto sui ricavi di un cambio di prezzo, di volume '
        + 'o di mix di prodotto, prima di applicarlo.',
      perche: 'Una simulazione dei ricavi ha bisogno di uno storico di vendite su cui '
        + 'appoggiarsi. Proiettarli senza sarebbe inventarli.',
      invece: [
        { sezione: 'forecaster', label: 'Financial Forecaster',
          spiega: 'previsioni finanziarie sui dati che hai già' },
        { sezione: 'kpi', label: 'KPI',
          spiega: 'margini e andamento reali, non simulati' },
      ],
    },
  };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function dichiarata(sezione) { return !!SEZIONI[sezione]; }

  /** Il modulo vero, se c'è, vince sempre. Questo serve a rispondere quando
      non c'è, non a sostituirlo quando c'è. */
  function moduloPresente(sezione) {
    var nomi = { revsim: 'RevSim' };
    var n = nomi[sezione];
    if (!n) return false;
    /* Il modulo puo' essere un `const` globale invece di una proprieta' di
       window: e' il caso di quasi tutti i moduli legacy, e guardare solo
       `window` fa credere assente un modulo che c'e'. */
    if (global[n] && typeof global[n].render === 'function') return true;
    try {
      var v = (0, eval)('typeof ' + n + " !== 'undefined' ? " + n + ' : null');
      return !!(v && typeof v.render === 'function');
    } catch (e) { return false; }
  }

  function bottoneAltrove(v) {
    /* «profili» non è una rotta: è il pannello dei profili economici. */
    var azione = v.sezione === 'profili'
      ? 'if(window.InglyProfiliEconomici)window.InglyProfiliEconomici.apri()'
      : 'if(window.App)window.App.navigate(' + JSON.stringify(v.sezione) + ')';
    return '<button type="button" onclick="' + esc(azione).replace(/&#39;/g, "'") + '" '
      + 'style="display:block;width:100%;text-align:left;padding:11px 13px;border-radius:10px;'
      + 'border:1.5px solid var(--border,#2a2a35);background:transparent;cursor:pointer;'
      + 'font-family:inherit;margin-bottom:8px">'
      + '<div style="font-size:13px;font-weight:700;color:var(--text,#e8e8f0)">' + esc(v.label) + '</div>'
      + '<div style="font-size:11px;color:var(--text-muted,#888);margin-top:2px">' + esc(v.spiega) + '</div>'
      + '</button>';
  }

  /** Disegna il pannello dentro la vista della sezione. Restituisce `true` se
      ha disegnato: chi chiama può distinguere «non c'era niente da fare» da
      «la vista non esiste». */
  function mostra(sezione, nodo) {
    var s = SEZIONI[sezione];
    if (!s) return false;
    if (moduloPresente(sezione)) return false;

    var n = nodo || (global.document && global.document.getElementById('view-' + sezione));
    if (!n) return false;

    n.innerHTML =
      '<div style="max-width:560px;margin:38px auto;padding:0 18px">'
      + '<div style="font-size:34px;line-height:1;margin-bottom:12px">' + s.icona + '</div>'
      + '<div style="font-size:19px;font-weight:800;color:var(--text,#e8e8f0)">' + esc(s.titolo) + '</div>'
      + '<div style="display:inline-block;margin-top:8px;padding:3px 9px;border-radius:6px;'
      + 'font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;'
      + 'border:1px solid var(--border,#2a2a35);color:var(--text-muted,#888)">Non ancora disponibile</div>'
      + '<div style="font-size:13px;color:var(--text,#e8e8f0);line-height:1.6;margin-top:16px">'
      + esc(s.cosaFarebbe) + '</div>'
      + '<div style="font-size:12px;color:var(--text-muted,#888);line-height:1.6;margin-top:10px">'
      + esc(s.perche) + '</div>'
      + '<div style="font-size:10px;color:var(--text-muted,#888);font-weight:700;'
      + 'text-transform:uppercase;letter-spacing:.05em;margin:22px 0 8px">Cosa usare adesso</div>'
      + s.invece.map(bottoneAltrove).join('')
      + '</div>';
    return true;
  }

  global.InglySezioneIncompleta = {
    VERSIONE: VERSIONE,
    SEZIONI: SEZIONI,
    dichiarata: dichiarata,
    moduloPresente: moduloPresente,
    mostra: mostra,
  };
})(typeof window !== 'undefined' ? window : globalThis);

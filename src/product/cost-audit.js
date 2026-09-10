/* ═══════════════════════════════════════════════════════════════════════════
   COST-AUDIT — da dove viene ogni euro, con lo stesso nome ovunque
   ═══════════════════════════════════════════════════════════════════════════

   `InglyCostEngine.explain()` restituisce ogni voce del conto con la sua
   `fonte`: `inventory`, `configurato`, `inserito`, `default`, `stima`,
   `calcolato`, `mancante`. Sono i nomi del motore, giusti per il motore e
   illeggibili per chi guarda un preventivo.

   Fino a qui la traduzione in italiano viveva **dentro il Product Builder**,
   in una tabella privata. Funzionava, ed era l'unico posto dell'applicazione
   dove si potesse vedere la provenienza di un numero: i preventivatori — che
   sono gli schermi dove i prezzi si decidono davvero — non la mostravano.

   Il modo sbagliato di rimediare sarebbe copiare quella tabella nel Quoter 3D.
   Due tabelle divergono: fra sei mesi `stima` sarebbe «Stimato» in una
   schermata e «Approssimativo» nell'altra, e nessuna delle due sarebbe in
   torto. Quindi la tabella sta qui, una sola, e le viste la interrogano.

   ── Cosa fa questo file, e cosa lascia fare alle viste ───────────────────

   Fa: tradurre le fonti, classificarle in cinque livelli di affidabilità,
   normalizzare le righe di `explain()`, e contare quante voci di costo
   poggiano su un numero non dichiarato.

   Lascia fare: il disegno. Il Product Builder ha le sue classi CSS, il
   Quoter 3D le sue: imporre un markup comune vorrebbe dire due schermate che
   sembrano una terza. `pannello()` c'è per chi non ha un proprio stile e
   vuole un elenco già fatto — è comodità, non obbligo.

   ── Perché il conteggio conta ────────────────────────────────────────────

   La domanda vera di un audit non è «da dove viene questo numero» ma «quanti
   di questi numeri non li ho scelti io». Un preventivo con nove voci su
   quattordici stimate è un preventivo che non si può difendere, e non c'è
   modo di accorgersene guardando il totale. `riepilogo()` risponde a quella
   domanda in una riga.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  /* Cinque livelli, non sette: `inventory` e `reale` dicono la stessa cosa a
     chi legge — «questo numero l'ho misurato» — e distinguerli nell'etichetta
     costringerebbe l'utente a imparare la differenza fra due parole che per
     lui non ne hanno. La distinzione resta nell'`id`, per chi la vuole. */
  var LIVELLI = {
    reale:       { peso: 0, colore: '#22c55e', label: 'dichiarato' },
    calcolato:   { peso: 1, colore: '#38bdf8', label: 'calcolato' },
    manuale:     { peso: 2, colore: '#a78bfa', label: 'scritto a mano' },
    stima:       { peso: 3, colore: '#fbbf24', label: 'stimato' },
    mancante:    { peso: 4, colore: '#f87171', label: 'non dichiarato' },
  };

  var FONTI = {
    magazzino:   { etichetta: 'Magazzino',   livello: 'reale',     spiega: 'dal prezzo che hai pagato' },
    inventory:   { etichetta: 'Magazzino',   livello: 'reale',     spiega: 'dal prezzo che hai pagato' },
    reale:       { etichetta: 'Reale',       livello: 'reale',     spiega: 'da un dato misurato' },
    misurato:    { etichetta: 'Misurato',    livello: 'reale',     spiega: 'da una misura sul campo' },
    configurato: { etichetta: 'Configurato', livello: 'reale',     spiega: 'dai profili economici' },
    profilo:     { etichetta: 'Profilo',     livello: 'reale',     spiega: 'dai profili economici' },
    calcolato:   { etichetta: 'Calcolato',   livello: 'calcolato', spiega: 'ricavato dagli altri numeri' },
    inserito:    { etichetta: 'Manuale',     livello: 'manuale',   spiega: 'scritto in questo preventivo' },
    preventivo:  { etichetta: 'Manuale',     livello: 'manuale',   spiega: 'scritto in questo preventivo' },
    stima:       { etichetta: 'Stimato',     livello: 'stima',     spiega: 'una stima, non un dato' },
    stimato:     { etichetta: 'Stimato',     livello: 'stima',     spiega: 'una stima, non un dato' },
    predefinito: { etichetta: 'Predefinito', livello: 'stima',     spiega: 'valore di partenza, non ancora tuo' },
    'default':   { etichetta: 'Predefinito', livello: 'stima',     spiega: 'valore di partenza, non ancora tuo' },
    ripiego:     { etichetta: 'Ripiego',     livello: 'stima',     spiega: 'valore di ripiego dichiarato' },
    mancante:    { etichetta: 'Mancante',    livello: 'mancante',  spiega: 'nessun dato: la voce non entra nel conto' },
    /* Due voci che non sono costi e hanno una provenienza tutta loro: il
       prezzo netto viene da una decisione, l'IVA da una legge. Erano le sole
       due che uscivano «Non dichiarata» — misurato su tre preventivi reali —
       e lasciarle così avrebbe messo un cartello rosso accanto ai due numeri
       che invece si sanno con certezza. */
    'scelta commerciale': { etichetta: 'Decisione', livello: 'manuale', spiega: 'il margine che hai scelto' },
    normativa:            { etichetta: 'Di legge', livello: 'reale',   spiega: 'l\'aliquota in vigore' },
    protezione:           { etichetta: 'Pavimento', livello: 'calcolato', spiega: 'il margine minimo ha alzato il prezzo' },
  };

  /* Il motore parla due lingue, e sono due domande diverse: `fonte` dice **da
     dove** viene un numero, `confidence` dice **quanto** ci si può contare.
     Le viste ne avevano tre — il Product Builder traduceva `fonte`, il Quoter
     3D traduceva `confidence`, e il motore aveva la sua — con il risultato che
     lo stesso numero era «Stimato» in una schermata e «stimato» minuscolo in
     un'altra, su una scala che non coincideva.

     Qui le due lingue in ingresso restano due, perché dicono cose diverse.
     Quella in uscita è una sola: i cinque livelli qui sopra. */
  var CONFIDENZE = {
    verified:  { etichetta: 'Verificato',  livello: 'reale',     spiega: 'da una fonte identificabile' },
    measured:  { etichetta: 'Misurato',    livello: 'reale',     spiega: 'da una misura sul campo' },
    declared:  { etichetta: 'Dichiarato',  livello: 'manuale',   spiega: 'inserito da te' },
    derived:   { etichetta: 'Derivato',    livello: 'calcolato', spiega: 'ricavato dagli altri numeri' },
    estimated: { etichetta: 'Stimato',     livello: 'stima',     spiega: 'dedotto, non verificato' },
    missing:   { etichetta: 'Mancante',    livello: 'mancante',  spiega: 'non c\'è: il costo esce più basso del vero' },
  };

  var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  var eur = function (n) { return '€ ' + num(n).toFixed(2).replace('.', ','); };

  /** La fonte tradotta. Una fonte sconosciuta non si inventa: si dichiara
      tale, perché «Manuale» su un numero di cui non si sa niente sarebbe una
      bugia comoda. */
  function fonte(id) {
    var f = FONTI[String(id || '').trim()];
    if (f) return Object.assign({ id: id }, f, LIVELLI[f.livello]);
    return Object.assign({ id: id || 'sconosciuta', etichetta: 'Non dichiarata',
      livello: 'mancante', spiega: 'il motore non ha detto da dove viene' }, LIVELLI.mancante);
  }

  /** La confidenza tradotta, sulla stessa scala della fonte. */
  function confidenza(id) {
    var c = CONFIDENZE[String(id || '').trim()];
    if (c) return Object.assign({ id: id }, c, LIVELLI[c.livello]);
    return Object.assign({ id: id || 'sconosciuta', etichetta: 'Non dichiarata',
      livello: 'mancante', spiega: 'il motore non ha detto quanto vale' }, LIVELLI.mancante);
  }

  /** Le righe di `explain()`, normalizzate: ognuna con la sua fonte tradotta.
      `soloCosto` tiene fuori prezzo e profitto, che non sono costi e la cui
      «provenienza» è una decisione, non un dato. */
  function righe(spiegazione, opzioni) {
    var o = opzioni || {};
    var l = (spiegazione && spiegazione.lines) || [];
    return l.filter(function (r) {
      if (!o.soloCosto) return true;
      return r.gruppo === 'una tantum' || r.gruppo === 'per pezzo' || r.gruppo === 'costo';
    }).map(function (r) {
      return {
        id: r.id, gruppo: r.gruppo, label: r.label,
        formula: r.formula || '', conti: r.conti || null, dettaglio: r.detail || r.input || '',
        valore: num(r.result != null ? r.result : r.value),
        fonte: fonte(r.fonte),
        confidenza: r.confidence ? confidenza(r.confidence) : null,
      };
    });
  }

  /** Quante voci del costo poggiano su un numero che non è stato dichiarato.
      È la domanda a cui serve rispondere, e non si legge nel totale. */
  function riepilogo(spiegazione) {
    var l = righe(spiegazione, { soloCosto: true });
    var per = {};
    Object.keys(LIVELLI).forEach(function (k) { per[k] = 0; });
    var costoDaVerificare = 0;
    l.forEach(function (r) {
      per[r.fonte.livello] = (per[r.fonte.livello] || 0) + 1;
      if (r.fonte.livello === 'stima' || r.fonte.livello === 'mancante') costoDaVerificare += r.valore;
    });
    var voci = l.length;
    var daVerificare = per.stima + per.mancante;
    return {
      voci: voci,
      perLivello: per,
      daVerificare: daVerificare,
      costoDaVerificare: costoDaVerificare,
      /* Nessun giudizio inventato: la frase dice i numeri, non se vanno bene. */
      frase: voci === 0
        ? 'Nessuna voce di costo da verificare.'
        : (daVerificare === 0
          ? 'Tutte le ' + voci + ' voci di costo poggiano su un numero dichiarato.'
          : daVerificare + ' voci su ' + voci + ' poggiano su un valore stimato o non dichiarato'
            + (costoDaVerificare > 0 ? ', per ' + eur(costoDaVerificare) + ' di costo' : '') + '.'),
    };
  }

  function pastiglia(f) {
    return '<span title="' + esc(f.spiega) + '" style="display:inline-block;margin-left:6px;padding:1px 6px;'
      + 'border-radius:5px;font-size:9px;font-weight:700;letter-spacing:.02em;'
      + 'border:1px solid ' + f.colore + '55;color:' + f.colore + ';background:' + f.colore + '14">'
      + esc(f.etichetta) + '</span>';
  }

  /** Un elenco già fatto, per le viste che non hanno uno stile proprio.
      Chi ne ha uno usa `righe()` e `pastiglia()` e disegna come vuole. */
  function pannello(spiegazione, opzioni) {
    var o = opzioni || {};
    var l = righe(spiegazione, { soloCosto: o.soloCosto !== false });
    if (!l.length) return '<div style="font-size:11px;color:var(--text-muted,#888)">Nessun dettaglio disponibile.</div>';
    var r = riepilogo(spiegazione);

    return '<div style="font-size:11px">'
      + '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;margin-bottom:10px;'
      + 'color:var(--text-muted,#888);line-height:1.5">' + esc(r.frase) + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr auto;gap:4px 10px;align-items:baseline">'
      + l.map(function (v) {
        return '<div style="color:var(--text,#e8e8f0)">' + esc(v.label) + pastiglia(v.fonte)
          + (v.formula ? '<div style="font-size:9px;color:var(--text-muted,#888)">' + esc(v.formula) + '</div>' : '')
          + '</div>'
          + '<div style="text-align:right;font-variant-numeric:tabular-nums;color:var(--text,#e8e8f0)">'
          + eur(v.valore) + '</div>';
      }).join('')
      + '</div></div>';
  }

  global.InglyCostAudit = {
    VERSIONE: VERSIONE,
    LIVELLI: LIVELLI,
    FONTI: FONTI,
    CONFIDENZE: CONFIDENZE,
    fonte: fonte,
    confidenza: confidenza,
    righe: righe,
    riepilogo: riepilogo,
    pastiglia: pastiglia,
    pannello: pannello,
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · DIALOGHI DI SISTEMA
   ═══════════════════════════════════════════════════════════════════════════

   `alert()` blocca il thread, non si può stilare, mostra il nome dell'host e
   in un prodotto professionale ha l'aspetto di un errore dell'applicazione.
   Nel v96 se ne contano 46 chiamate nel codice dell'applicazione
   (più 9 dentro jsPDF, che è una libreria di terze parti).

   Perché qui c'è un ponte e non 45 file modificati
   ────────────────────────────────────────────────
   Le 46 chiamate sono state lette una per una. Sono tutte della stessa forma:

       if (!nome) { alert('Inserisci un nome!'); return; }

   un messaggio e uno stop. Nessuna dipende dal fatto che `alert` sospenda
   l'esecuzione: le due sole che precedono un `location.reload()` sono guardie
   che escono con `return`, e il reload sta sul ramo di successo. `alert`
   restituisce `undefined` e nessun chiamante ne legge il valore. Sostituirla
   con una notifica non cambia dunque il comportamento di nessuna di esse.

   Una parte di quelle chiamate vive dentro codice generato come stringa
   (patch 076, 079, 084): modificarle a mano significherebbe riscrivere
   template JavaScript dentro letterali JavaScript. Un solo punto di sostituzione
   è più sicuro di trenta, ed è reversibile: `InglyUI.nativeAlert`
   conserva l'originale.

   `confirm()` e `prompt()` NON sono qui
   ──────────────────────────────────────
   Restituiscono un valore in modo sincrono. Qualunque sostituzione non
   bloccante restituirebbe una Promise, e `if (confirm(…))` diventerebbe sempre
   vero: cancellerebbe dati che l'utente ha appena rifiutato di cancellare.
   Si migrano un componente alla volta, trasformando il chiamante in `async` —
   vedi `docs/PHASE-2.md`.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  const UI = global.InglyUI;
  if (!UI) return;

  const nativeAlert = global.alert ? global.alert.bind(global) : function () {};

  /* Il tono si deduce dal testo. Non è indovinare: i messaggi del v96 seguono
     tre formule ricorrenti, e sbagliare tono mostra un colore diverso, non un
     dato diverso. */
  const TONES = [
    { tone: 'danger', re: /errore|non valido|non disponibile|fallit|impossibile|❌/i },
    { tone: 'warning', re: /inserisci|compila|seleziona|obbligatori|aggiungi almeno|troppo grande|prima un/i },
    { tone: 'success', re: /✅|salvat|complet|esportat|importat|creat[oi]\b/i },
  ];

  function toneOf(text) {
    for (const t of TONES) if (t.re.test(text)) return t.tone;
    return 'info';
  }

  /* Sopra questa soglia il messaggio non è una notifica ma un contenuto da
     leggere — un'analisi AI, le istruzioni di un backup. Un toast che sparisce
     dopo tre secondi lo perderebbe. */
  const LONG = 140;

  function isLong(text) {
    return text.length > LONG || text.split('\n').length > 3;
  }

  function show(message) {
    const text = String(message == null ? '' : message);
    if (!text.trim()) return;

    if (!isLong(text)) return UI.toast(text, toneOf(text), 4500);

    // Le righe del messaggio restano righe: `\n` in un elemento HTML sparisce.
    const body = '<div class="dlg__pre">' + UI.esc(text) + '</div>';
    UI.openDialog({
      title: text.split('\n')[0].slice(0, 60) || 'Messaggio',
      size: 'sm',
      body: body,
      actions: [{ label: 'Ho capito', variant: 'primary', value: true }],
    });
  }

  global.alert = function (message) {
    try {
      show(message);
    } catch (e) {
      // Se la notifica non si può mostrare, meglio il dialogo del browser che
      // un messaggio perso.
      nativeAlert(message);
    }
  };

  /* ── Ponti per la migrazione di `confirm()` e `prompt()` ─────────────────
     La chiamata legacy cambia di una parola:

         if (!confirm('Eliminare?')) return;
         if (!await askConfirm('Eliminare?')) return;

     così il diff resta leggibile e la logica del chiamante non si tocca.
     Se le primitive non fossero ancora pronte si ricade sul dialogo nativo:
     meglio una finestra brutta che una cancellazione non confermata. */

  global.askConfirm = function (message, opts) {
    const o = opts || {};
    if (!UI.confirm) return Promise.resolve(global.confirm(message));
    return UI.confirm({
      title: o.title || 'Confermi?',
      message: message,
      confirmLabel: o.confirmLabel,
      danger: o.danger !== false,
    });
  };

  global.askPrompt = function (message, value, opts) {
    const o = opts || {};
    if (!UI.prompt) return Promise.resolve(global.prompt(message, value));
    return UI.prompt({
      title: o.title || message,
      message: o.title ? message : '',
      value: value == null ? '' : String(value),
      type: o.type,
      placeholder: o.placeholder,
      confirmLabel: o.confirmLabel,
    });
  };

  /* Quattro `prompt()` in fila sono quattro finestre da chiudere per inserire
     una riga d'ordine. Sono un modulo: si mostrano insieme, si vedono insieme,
     si correggono senza ricominciare. Il ripiego resta la sequenza nativa, così
     il chiamante non deve prevedere due casi. */
  global.askForm = function (title, fields, opts) {
    const o = opts || {};
    if (!UI.openDialog) {
      const out = {};
      for (const f of fields) {
        const v = global.prompt(f.label, f.value == null ? '' : String(f.value));
        if (v === null) return Promise.resolve(null);
        out[f.name] = v;
      }
      return Promise.resolve(out);
    }

    const body = fields.map(function (f) {
      return '<div class="form-group">' +
        '<label class="form-label" for="af-' + UI.esc(f.name) + '">' + UI.esc(f.label) + '</label>' +
        '<input class="form-control" id="af-' + UI.esc(f.name) + '" data-af="' + UI.esc(f.name) + '" ' +
        'type="' + UI.esc(f.type || 'text') + '" value="' + UI.esc(f.value == null ? '' : f.value) + '" ' +
        'placeholder="' + UI.esc(f.placeholder || '') + '"></div>';
    }).join('');

    return UI.openDialog({
      title: title,
      size: 'sm',
      body: body,
      actions: [
        { label: 'Annulla', variant: 'secondary', value: null },
        {
          label: o.confirmLabel || 'Conferma',
          variant: 'primary',
          collect: function (d) {
            const out = {};
            d.querySelectorAll('[data-af]').forEach(function (i) {
              out[i.getAttribute('data-af')] = i.value;
            });
            return out;
          },
        },
      ],
      onMount: function (d) {
        const first = d.querySelector('[data-af]');
        if (first) { first.focus(); first.select(); }
      },
    }).promise.then(function (v) { return v === undefined ? null : v; });
  };

  UI.nativeAlert = nativeAlert;
  UI.notify = show;
})(window);

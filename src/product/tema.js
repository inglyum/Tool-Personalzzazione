/* ═══════════════════════════════════════════════════════════════════════════
   TEMA — l'aspetto dell'applicazione, in un posto solo
   ═══════════════════════════════════════════════════════════════════════════

   Due sistemi di branding convivevano senza saperlo:

     patch 117  «White Label Engine»  → chiave `ingly_white_label`
     patch 176  «Personalizza brand»  → chiave `ingly_brand_v1`

   Entrambi cambiavano un colore, ciascuno scrivendo il proprio, ciascuno
   ignorando l'altro; e nessuno dei due sapeva fare le due cose che servivano
   davvero — scegliere il **tema** e cambiare il **carattere**. È lo stesso
   difetto strutturale già trovato con i magazzini e con i preventivatori: due
   sistemi che possiedono lo stesso concetto.

   Questo modulo possiede l'aspetto. I due pannelli restano dove sono e
   scrivono qui, così nessuno perde il proprio punto d'accesso.

   Tre regole:

   1. **Un colore scelto male si dice.** Il contrasto si misura, e se il testo
      diventa illeggibile l'utente lo sa prima di salvare, non dopo che il
      cliente ha aperto il preventivo.
   2. **Nessun carattere arriva dalla rete.** Il prodotto è un file solo che
      deve funzionare offline: i caratteri sono Inter (già incorporato) e
      stack di sistema, mai un URL.
   3. **Tutto è reversibile.** «Ripristina» riporta esattamente ai valori di
      partenza, e la migrazione dalle due chiavi vecchie non le cancella.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';
  var CHIAVE = 'ingly_aspetto_v1';
  var CHIAVI_STORICHE = ['ingly_white_label', 'ingly_brand_v1'];

  /* ── I temi ───────────────────────────────────────────────────────────────
     `auto` non è «scuro con un ripiego»: segue davvero l'impostazione del
     sistema operativo, e cambia quando quella cambia. */
  var TEMI = [
    { id: 'auto', label: 'Automatico', nota: 'Segue il tuo sistema' },
    { id: 'scuro', label: 'Scuro', nota: 'Come adesso' },
    { id: 'chiaro', label: 'Chiaro', nota: 'Per lavorare alla luce' },
  ];

  /* ── Gli accenti ──────────────────────────────────────────────────────────
     Sette proposte più il colore libero. Non sono «temi»: sono un solo
     colore, quello che segna le azioni e i valori importanti. Cambiarlo non
     cambia lo sfondo — è la ragione per cui una scelta anche azzardata resta
     leggibile. */
  var ACCENTI = [
    { id: 'ciano', label: 'Ciano', hex: '#00e6d2' },
    { id: 'ambra', label: 'Ambra', hex: '#fbbf24' },
    { id: 'indaco', label: 'Indaco', hex: '#6366f1' },
    { id: 'verde', label: 'Verde', hex: '#22c55e' },
    { id: 'corallo', label: 'Corallo', hex: '#f97316' },
    { id: 'magenta', label: 'Magenta', hex: '#ec4899' },
    { id: 'viola', label: 'Viola', hex: '#a855f7' },
  ];

  /* ── I caratteri ──────────────────────────────────────────────────────────
     Nessun `@import`, nessun URL. Inter è incorporato nel file come data URI;
     gli altri sono stack di sistema che esistono già sulla macchina di chi
     legge. Un carattere che arriva dalla rete rompe l'uso offline, ed è
     esattamente il motivo per cui Inter è stato incorporato. */
  var CARATTERI = [
    { id: 'inter', label: 'Inter', nota: 'Incorporato nel file',
      stack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif" },
    { id: 'sistema', label: 'Di sistema', nota: 'Come le altre app del tuo computer',
      stack: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif" },
    { id: 'grafico', label: 'Grottesco', nota: 'Più largo, più leggibile da lontano',
      stack: "'Segoe UI', Tahoma, Verdana, Geneva, system-ui, sans-serif" },
    { id: 'elegante', label: 'Con grazie', nota: 'Per documenti che si stampano',
      stack: "Georgia, 'Times New Roman', 'Liberation Serif', serif" },
    { id: 'tecnico', label: 'Monospaziato', nota: 'Cifre allineate in colonna',
      stack: "ui-monospace, SFMono-Regular, 'JetBrains Mono', Consolas, monospace" },
  ];

  /* Le tre dimensioni: chi lavora su un portatile da 13 pollici e chi su un
     monitor appeso in laboratorio non hanno le stesse esigenze. */
  var SCALE = [
    { id: 'compatta', label: 'Compatta', fattore: 0.92 },
    { id: 'normale', label: 'Normale', fattore: 1 },
    { id: 'ampia', label: 'Ampia', fattore: 1.08 },
  ];

  var PREDEFINITO = { tema: 'scuro', accento: '#00e6d2', carattere: 'inter', scala: 'normale' };

  /* ── Colore: le poche funzioni che servono ────────────────────────────── */

  function rgb(hex) {
    var h = String(hex || '').trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    var n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function esa(c) {
    var d = function (v) { return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); };
    return '#' + d(c.r) + d(c.g) + d(c.b);
  }

  /** Luminanza relativa secondo WCAG: non è la media dei canali — l'occhio
      pesa il verde molto più del blu, e usare la media darebbe verdetti
      sbagliati proprio sui colori che si scelgono più spesso. */
  function luminanza(hex) {
    var c = rgb(hex);
    if (!c) return 0;
    var f = function (v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  /** Il rapporto di contrasto fra due colori, da 1 (identici) a 21. */
  function contrasto(a, b) {
    var la = luminanza(a), lb = luminanza(b);
    var chiaro = Math.max(la, lb), scuro = Math.min(la, lb);
    return (chiaro + 0.05) / (scuro + 0.05);
  }

  function schiarisci(hex, q) {
    var c = rgb(hex); if (!c) return hex;
    return esa({ r: c.r + (255 - c.r) * q, g: c.g + (255 - c.g) * q, b: c.b + (255 - c.b) * q });
  }
  function scurisci(hex, q) {
    var c = rgb(hex); if (!c) return hex;
    return esa({ r: c.r * (1 - q), g: c.g * (1 - q), b: c.b * (1 - q) });
  }
  function alfa(hex, a) {
    var c = rgb(hex); if (!c) return hex;
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
  }

  /* ── La verifica ──────────────────────────────────────────────────────────
     Un accento si sceglie guardando un quadratino di colore, e un quadratino
     non dice se quel colore resterà leggibile scritto in undici pixel su uno
     sfondo scuro. Qui lo si misura prima di salvare. */
  var SFONDO = { scuro: '#0e0e12', chiaro: '#ffffff' };

  function verifica(cfg) {
    var c = Object.assign({}, PREDEFINITO, cfg || {});
    var avvisi = [];
    if (!rgb(c.accento)) {
      return { ok: false, avvisi: [{ livello: 'errore', testo: 'Colore non valido: serve un esadecimale tipo #22d3ee.' }] };
    }
    ['scuro', 'chiaro'].forEach(function (t) {
      if (c.tema !== 'auto' && c.tema !== t) return;
      var r = contrasto(c.accento, SFONDO[t]);
      if (r < 3) {
        avvisi.push({ livello: 'errore', tema: t, rapporto: r,
          testo: 'Su sfondo ' + t + ' questo colore ha un contrasto di ' + r.toFixed(1)
            + ':1 — sotto 3:1 il testo non si legge. Scegline uno più '
            + (luminanza(c.accento) > luminanza(SFONDO[t]) ? 'chiaro' : 'scuro') + '.' });
      } else if (r < 4.5) {
        avvisi.push({ livello: 'avviso', tema: t, rapporto: r,
          testo: 'Su sfondo ' + t + ' il contrasto è ' + r.toFixed(1)
            + ':1: va bene per titoli e bottoni, fatica sul testo piccolo.' });
      }
    });
    return { ok: !avvisi.some(function (a) { return a.livello === 'errore'; }), avvisi: avvisi };
  }

  /* ── I token derivati ─────────────────────────────────────────────────────
     Da un colore solo ne discendono otto. Scriverli a mano nel pannello
     significherebbe chiedere all'utente otto scelte per una decisione sola. */
  function token(cfg) {
    var c = Object.assign({}, PREDEFINITO, cfg || {});
    var a = rgb(c.accento) ? c.accento : PREDEFINITO.accento;
    var car = CARATTERI.filter(function (f) { return f.id === c.carattere; })[0] || CARATTERI[0];
    var sc = SCALE.filter(function (s) { return s.id === c.scala; })[0] || SCALE[1];
    return {
      '--color-primary': a,
      '--color-primary-hover': schiarisci(a, 0.14),
      '--color-primary-active': scurisci(a, 0.12),
      '--color-primary-muted': scurisci(a, 0.3),
      '--color-primary-surface': alfa(a, 0.1),
      '--color-primary-surface-hover': alfa(a, 0.16),
      '--color-primary-border': alfa(a, 0.3),
      /* I nomi storici che il codice legacy legge direttamente. Senza questi
         il colore cambierebbe solo dove il design system è già arrivato, e
         l'applicazione uscirebbe di due colori. */
      '--primary': a,
      '--primary-hover': schiarisci(a, 0.14),
      '--primary-dim': alfa(a, 0.14),
      '--primary-border': alfa(a, 0.3),
      '--accent': a,
      '--eh-brand': a,
      '--font-sans': car.stack,
      '--font-body': car.stack,
      '--ds-font-scale': String(sc.fattore),
    };
  }

  /* ── Applicazione ─────────────────────────────────────────────────────── */

  var corrente = Object.assign({}, PREDEFINITO);
  var mediaScuro = null;

  function applica(cfg) {
    var c = Object.assign({}, PREDEFINITO, cfg || {});
    corrente = c;
    var doc = global.document;
    if (!doc || !doc.documentElement) return c;
    var r = doc.documentElement;

    var t = token(c);
    Object.keys(t).forEach(function (k) { r.style.setProperty(k, t[k]); });

    /* Il tema si dichiara con l'attributo che il design system già legge. In
       automatico non si scrive niente e decide il sistema operativo. */
    if (c.tema === 'chiaro') r.setAttribute('data-theme', 'light');
    else if (c.tema === 'scuro') r.setAttribute('data-theme', 'dark');
    else r.removeAttribute('data-theme');

    /* La dimensione si applica sulla radice: tutto ciò che è in `rem` segue,
       e ciò che è in pixel resta dov'è — che è il compromesso onesto in un
       prodotto con dodicimila stili inline. */
    r.style.fontSize = (16 * (SCALE.filter(function (s) { return s.id === c.scala; })[0] || SCALE[1]).fattore) + 'px';

    /* In automatico si ascolta il sistema, una volta sola. */
    if (c.tema === 'auto' && !mediaScuro && global.matchMedia) {
      try {
        mediaScuro = global.matchMedia('(prefers-color-scheme: dark)');
        var reagisci = function () { if (corrente.tema === 'auto') applica(corrente); };
        if (mediaScuro.addEventListener) mediaScuro.addEventListener('change', reagisci);
        else if (mediaScuro.addListener) mediaScuro.addListener(reagisci);
      } catch (e) { /* un browser senza matchMedia resta sul tema scuro */ }
    }
    return c;
  }

  /* ── Persistenza, con migrazione ──────────────────────────────────────── */

  function leggi() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(CHIAVE);
      if (raw) return Object.assign({}, PREDEFINITO, JSON.parse(raw));
    } catch (e) { /* una preferenza illeggibile non deve impedire di aprire */ }
    return migra();
  }

  /** Le due chiavi storiche non si cancellano: se qualcosa va storto, i
      pannelli vecchi trovano ancora i propri dati. Si legge il colore da
      quella che ce l'ha, con precedenza a quella più recente. */
  function migra() {
    var c = Object.assign({}, PREDEFINITO);
    try {
      for (var i = CHIAVI_STORICHE.length - 1; i >= 0; i--) {
        var raw = global.localStorage && global.localStorage.getItem(CHIAVI_STORICHE[i]);
        if (!raw) continue;
        var v = JSON.parse(raw) || {};
        var col = v.color || v.brandColor;
        if (col && rgb(col)) { c.accento = col; break; }
      }
    } catch (e) { /* idem */ }
    return c;
  }

  function salva(cfg) {
    var c = Object.assign({}, corrente, cfg || {});
    try { global.localStorage.setItem(CHIAVE, JSON.stringify(c)); } catch (e) { /* spazio esaurito: si applica comunque */ }
    applica(c);
    try {
      global.dispatchEvent(new CustomEvent('ingly:aspetto-cambiato', { detail: c }));
    } catch (e) { /* browser antichi */ }
    return c;
  }

  function ripristina() {
    try { global.localStorage.removeItem(CHIAVE); } catch (e) { /* niente */ }
    var doc = global.document;
    if (doc && doc.documentElement) {
      var r = doc.documentElement;
      Object.keys(token(PREDEFINITO)).forEach(function (k) { r.style.removeProperty(k); });
      r.style.removeProperty('font-size');
    }
    return applica(PREDEFINITO);
  }

  function stato() {
    return {
      corrente: Object.assign({}, corrente),
      predefinito: Object.assign({}, PREDEFINITO),
      personalizzato: JSON.stringify(corrente) !== JSON.stringify(PREDEFINITO),
      verifica: verifica(corrente),
    };
  }

  /* All'avvio si applica quello che c'è, prima che la pagina si disegni. */
  if (global.document) {
    try { applica(leggi()); } catch (e) { /* un aspetto rotto non impedisce di lavorare */ }
  }

  global.InglyTema = {
    version: VERSIONE,
    TEMI: TEMI, ACCENTI: ACCENTI, CARATTERI: CARATTERI, SCALE: SCALE,
    PREDEFINITO: PREDEFINITO,
    applica: applica, salva: salva, ripristina: ripristina,
    leggi: leggi, stato: stato, token: token,
    verifica: verifica, contrasto: contrasto, luminanza: luminanza,
    schiarisci: schiarisci, scurisci: scurisci, alfa: alfa,
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ═══════════════════════════════════════════════════════════════════════════
   FISCO — l'aliquota IVA in un posto solo
   ═══════════════════════════════════════════════════════════════════════════

   Il difetto misurato in Fase 1: l'aliquota del 22% compare come letterale in
   dieci file diversi, ventuno volte, scritta ogni volta a mano come `0.22`,
   `1.22` o `* 22 / 100`.

   Non è un difetto di calcolo — i ventuno valori coincidono. È un difetto di
   possibilità: **l'aliquota non è configurabile**. Chi vende libri al 4%,
   alimentari al 10%, o esporta in un Paese con un'altra aliquota, non ha modo
   di dirlo; e una modifica di legge richiederebbe ventuno correzioni
   coordinate, con la certezza che una sfugga.

   Il campo esisteva già in Impostazioni — `set-vat`, predefinito 22 — e non lo
   leggeva quasi nessuno. Questo modulo lo legge, e tutti gli altri leggono
   questo modulo.

   Due regole:

   1. **Il predefinito resta 22.** Nessun preventivo esistente si muove.
   2. **L'IVA non entra mai in un costo.** Si recupera: metterla nel costo
      gonfia il margine del 22% e fa sembrare redditizio un lavoro che non lo
      è. Questo modulo calcola prezzi, mai costi.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  var num = function (v, d) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : (d === undefined ? 0 : d);
  };

  /* Le aliquote italiane, per i menu a tendina. Non è un elenco chiuso: chi
     ne ha bisogno di un'altra la scrive, e il modulo la accetta. */
  var ALIQUOTE = [
    { pct: 22, label: '22% — ordinaria' },
    { pct: 10, label: '10% — ridotta' },
    { pct: 5, label: '5% — ridotta' },
    { pct: 4, label: '4% — minima' },
    { pct: 0, label: '0% — esente / non imponibile' },
  ];

  var PREDEFINITA = 22;

  /* La cache: l'impostazione vive su IndexedDB e si legge in modo asincrono,
     mentre chi disegna un totale la vuole adesso. Come per i costi materiali,
     la cache dichiara quando è stata riempita. */
  var stato = { aliquota: PREDEFINITA, letta: false, quando: null };

  /**
   * L'aliquota configurata, in percentuale. Sincrona: se l'impostazione non è
   * ancora stata letta restituisce il predefinito — che è il comportamento
   * storico, quindi nessun numero si muove mentre si aspetta.
   */
  function aliquota() { return stato.aliquota; }

  /** La stessa, come frazione: 22 → 0,22. Esiste perché `x/100` scritto in
      venti posti è come `0.22` scritto in venti posti. */
  function frazione() { return aliquota() / 100; }

  /** Quanto si aggiunge a un netto. */
  function su(netto, pct) {
    var a = pct != null ? num(pct, aliquota()) : aliquota();
    return Math.max(0, num(netto)) * a / 100;
  }

  /** Il lordo di un netto. */
  function applica(netto, pct) {
    var n = Math.max(0, num(netto));
    return n + su(n, pct);
  }

  /** Il netto di un lordo. Lo scorporo non è «togliere il 22%»: è dividere per
      1,22. Toglierlo darebbe 0,9516 volte il valore giusto, e su un anno di
      fatture la differenza si vede. */
  function scorpora(lordo, pct) {
    var a = pct != null ? num(pct, aliquota()) : aliquota();
    return Math.max(0, num(lordo)) / (1 + a / 100);
  }

  /** Netto, imposta e lordo insieme, che è come si scrive su un documento. */
  function ripartisci(netto, pct) {
    var n = Math.max(0, num(netto));
    var a = pct != null ? num(pct, aliquota()) : aliquota();
    var i = n * a / 100;
    return { netto: n, aliquota: a, imposta: i, lordo: n + i };
  }

  /** Legge l'impostazione. Va chiamata all'avvio e dopo un salvataggio. */
  async function carica() {
    try {
      var db = global.IDB;
      if (db && typeof db.get === 'function') {
        var cfg = await db.get('settings', 'main').catch(function () { return null; });
        if (cfg && cfg.vat != null) {
          stato = { aliquota: valida(cfg.vat), letta: true, quando: new Date().toISOString() };
          return stato;
        }
      }
      /* Ripiego su localStorage: alcune installazioni tengono lì le
         impostazioni, ed è meglio leggerle che ignorarle. */
      var raw = global.localStorage && global.localStorage.getItem('ingly_settings_main');
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.vat != null) {
          stato = { aliquota: valida(s.vat), letta: true, quando: new Date().toISOString() };
          return stato;
        }
      }
    } catch (e) { /* un'impostazione illeggibile non deve fermare un preventivo */ }
    stato = { aliquota: PREDEFINITA, letta: true, quando: new Date().toISOString() };
    return stato;
  }

  /** Un'aliquota impossibile non diventa zero: diventa il predefinito, perché
      zero è un'aliquota legittima e non si può distinguere da un errore. */
  function valida(v) {
    var n = num(v, NaN);
    if (!isFinite(n) || n < 0 || n > 100) return PREDEFINITA;
    return n;
  }

  /** Per chi cambia l'impostazione senza passare da IndexedDB (o per i test). */
  function imposta(pct) {
    stato = { aliquota: valida(pct), letta: true, quando: new Date().toISOString() };
    return stato.aliquota;
  }

  function statoCorrente() {
    return { aliquota: stato.aliquota, letta: stato.letta, quando: stato.quando,
      predefinita: stato.aliquota === PREDEFINITA };
  }

  /** L'etichetta da mettere accanto a un totale: «IVA 22%», e non «IVA 22%»
      scritto a mano in ogni schermata. */
  function etichetta(pct) {
    var a = pct != null ? num(pct, aliquota()) : aliquota();
    return a > 0 ? 'IVA ' + (Math.round(a * 100) / 100) + '%' : 'Non imponibile';
  }

  /* L'impostazione si legge una volta all'avvio e di nuovo dopo ogni
     salvataggio delle Impostazioni. Fra le due letture chi disegna un totale
     usa la cache, e finché non c'è usa il 22% — cioè quello che il prodotto
     ha sempre fatto. */
  if (typeof global.addEventListener === 'function') {
    global.addEventListener('DOMContentLoaded', function () { setTimeout(carica, 800); });
    /* Un salvataggio delle Impostazioni non passa da qui: si ascolta l'evento
       che il modulo emette, se lo emette, e in ogni caso si rilegge quando
       qualcuno lo chiede esplicitamente. */
    global.addEventListener('ingly:settings-saved', function () { carica(); });
  }

  global.InglyFisco = {
    version: VERSIONE,
    ALIQUOTE: ALIQUOTE,
    PREDEFINITA: PREDEFINITA,
    aliquota: aliquota,
    frazione: frazione,
    su: su,
    applica: applica,
    scorpora: scorpora,
    ripartisci: ripartisci,
    etichetta: etichetta,
    carica: carica,
    imposta: imposta,
    stato: statoCorrente,
    valida: valida,
  };
})(typeof window !== 'undefined' ? window : globalThis);

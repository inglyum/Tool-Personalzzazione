/* ═══════════════════════════════════════════════════════════════════════════
   PREVISIONI — una sola, e dichiara quanto vale
   ═══════════════════════════════════════════════════════════════════════════

   Il programma prometteva le previsioni in tre punti diversi:

     · `forecaster`   → `FinancialForecaster`: esiste, ed è quello vero.
     · `forecasting`  → `Forecasting`: 54 righe, un pulsante «Analizza &
                        Prevedi», sotto un'intestazione che promette
                        «Scenario planning · Break-even · Cash runway» —
                        cioè esattamente quello che fa l'altro.
     · `revsim`       → `RevSim`: **non definito in nessun file**. Il pulsante
                        «Aggiorna» dentro `forecasting` chiamava lui.

   Tre voci di menù, una sola implementazione vera. Questo file è il calcolo,
   staccato dalla schermata, perché la parte che conta non è il disegno.

   ── Il difetto che nessuna delle tre dichiarava ───────────────────────────

   La previsione era una regressione lineare pesata su **dodici mesi fissi**,
   e i mesi in cui il laboratorio non esisteva ancora valevano **zero**. Un
   laboratorio aperto da tre mesi otteneva una retta tirata attraverso nove
   zeri e tre valori veri, e da quella retta uscivano tre cifre in euro
   precise all'unità, mostrate come fatti.

   Nove zeri non sono nove mesi da mille euro andati male: sono nove mesi che
   non ci sono stati. Includerli non è prudenza, è inventare storia.

   E in coda c'era l'errore opposto: il **mese corrente**, che è sempre
   incompleto, entrava nella regressione come se fosse finito. Il giorno 3 del
   mese la serie mostra un crollo che non esiste, e la previsione lo insegue.

   ── Cosa fa questo file ──────────────────────────────────────────────────

   1. La finestra parte dal **primo mese con attività**, non dodici mesi fa.
      Un mese a zero *dentro* la finestra resta zero: è un'informazione vera.
   2. Il mese corrente resta **fuori dal calcolo**, e viene restituito a parte
      come parziale.
   3. Sotto un minimo di mesi veri **non si prevede niente** e si dice perché.
      `null` è una risposta; un numero preciso costruito su tre punti no.
   4. Si dichiara quanto la retta spiega i dati (`r2`) e quanto è largo
      l'errore tipico (`intervallo`). Nessuno dei due è inventato: escono
      entrambi dagli stessi numeri della previsione.

   Puro: niente DOM, niente archivio, niente orologio se non quello passato.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  /* Sotto questa soglia la retta non è una tendenza, è un disegno fra pochi
     punti. Quattro è il minimo per cui un andamento mensile comincia a
     distinguersi dal caso; sta scritto qui perché si possa discutere. */
  var MESI_MINIMI = 4;

  var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };

  function meseDi(d) {
    if (!d) return null;
    var s = String(d);
    if (/^\d{4}-\d{2}/.test(s)) return s.slice(0, 7);
    var t = new Date(d);
    if (isNaN(t.getTime())) return null;
    return t.getUTCFullYear() + '-' + String(t.getUTCMonth() + 1).padStart(2, '0');
  }

  function meseSuccessivo(m) {
    var a = parseInt(m.slice(0, 4), 10);
    var b = parseInt(m.slice(5, 7), 10) + 1;
    if (b > 12) { b = 1; a += 1; }
    return a + '-' + String(b).padStart(2, '0');
  }

  /**
   * Costruisce la serie mensile a partire dai record, e la fa cominciare dal
   * primo mese con attività: prima di quello il laboratorio non c'era, e
   * riempirlo di zeri sarebbe scrivere una storia che non è successa.
   *
   * @param {Array}  righe   vendite o ordini
   * @param {Object} [opz]   `{ data, valore, adesso }` — i primi due sono
   *                         funzioni di estrazione, così il file non deve
   *                         conoscere i nomi dei campi di nessuno.
   */
  function serieMensile(righe, opz) {
    var o = opz || {};
    var leggiData = o.data || function (r) { return r.date || r.data; };
    var leggiValore = o.valore || function (r) { return r.amount || r.total || r.value; };
    var meseCorrente = meseDi(o.adesso != null ? o.adesso : Date.now());

    var perMese = {};
    var primo = null;
    (Array.isArray(righe) ? righe : []).forEach(function (r) {
      var m = meseDi(leggiData(r || {}));
      if (!m) return;
      perMese[m] = (perMese[m] || 0) + num(leggiValore(r));
      if (primo === null || m < primo) primo = m;
    });

    if (primo === null) return { serie: [], parziale: null, meseCorrente: meseCorrente };

    /* Dal primo mese vero fino al mese corrente escluso: i buchi in mezzo
       sono zeri veri — un mese senza vendite è un fatto — mentre i mesi prima
       dell'inizio non esistono e non entrano. */
    var serie = [];
    var m = primo;
    while (m < meseCorrente) {
      serie.push({ mese: m, valore: perMese[m] || 0 });
      m = meseSuccessivo(m);
    }

    return {
      serie: serie,
      /* Il mese in corso, tenuto fuori dal calcolo perché non è finito. */
      parziale: { mese: meseCorrente, valore: perMese[meseCorrente] || 0 },
      meseCorrente: meseCorrente,
    };
  }

  /* ── La retta ─────────────────────────────────────────────────────────
     Regressione lineare pesata: i mesi recenti pesano più dei vecchi, perché
     un laboratorio che è cambiato sei mesi fa non deve essere previsto sulla
     sua versione di prima. */
  function retta(valori) {
    var n = valori.length;
    if (n < 2) return null;
    var pesi = valori.map(function (_, i) { return 1 + (i / n); });
    var sommaPesi = pesi.reduce(function (a, v) { return a + v; }, 0);
    var mediaX = pesi.reduce(function (a, v, i) { return a + v * i; }, 0) / sommaPesi;
    var mediaY = pesi.reduce(function (a, v, i) { return a + v * valori[i]; }, 0) / sommaPesi;
    var sxy = pesi.reduce(function (a, v, i) { return a + v * (i - mediaX) * (valori[i] - mediaY); }, 0);
    var sxx = pesi.reduce(function (a, v, i) { return a + v * Math.pow(i - mediaX, 2); }, 0);
    var pendenza = sxx > 0 ? sxy / sxx : 0;
    return { pendenza: pendenza, intercetta: mediaY - pendenza * mediaX, mediaY: mediaY };
  }

  /** Quanto della variazione la retta spiega davvero. Non è un dettaglio da
      statistici: è la differenza fra «cresci di 400 al mese» e «i tuoi mesi
      sono così diversi fra loro che una retta non li descrive». */
  function bontà(valori, r) {
    var n = valori.length;
    var media = valori.reduce(function (a, v) { return a + v; }, 0) / n;
    var totale = valori.reduce(function (a, v) { return a + Math.pow(v - media, 2); }, 0);
    var residui = valori.reduce(function (a, v, i) {
      return a + Math.pow(v - (r.intercetta + r.pendenza * i), 2);
    }, 0);
    return {
      r2: totale > 0 ? Math.max(0, 1 - residui / totale) : 0,
      /* L'errore tipico di un mese: è la larghezza onesta della previsione. */
      scarto: n > 2 ? Math.sqrt(residui / (n - 2)) : Math.sqrt(residui / n),
    };
  }

  var LIVELLI = [
    { id: 'buona', min: 0.6, label: 'buona', nota: 'la tendenza spiega bene i mesi passati' },
    { id: 'discreta', min: 0.3, label: 'discreta', nota: 'la tendenza spiega una parte dei mesi passati' },
    { id: 'debole', min: 0, label: 'debole', nota: 'i mesi sono troppo diversi fra loro perché una tendenza li descriva' },
  ];

  function livelloDi(r2) {
    for (var i = 0; i < LIVELLI.length; i++) if (r2 >= LIVELLI[i].min) return LIVELLI[i];
    return LIVELLI[LIVELLI.length - 1];
  }

  /**
   * La previsione, o il motivo per cui non c'è.
   *
   * @param {Array}  serie      `[{mese, valore}]` in ordine, mese corrente escluso
   * @param {Object} [opz]      `{ mesiAvanti }` (default 3)
   */
  function da(serie, opz) {
    var o = opz || {};
    var mesiAvanti = o.mesiAvanti > 0 ? Math.floor(o.mesiAvanti) : 3;
    var lista = Array.isArray(serie) ? serie : [];
    var valori = lista.map(function (p) { return num(p && p.valore); });

    if (valori.length < MESI_MINIMI) {
      return {
        disponibile: false,
        mesiReali: valori.length,
        mesiMinimi: MESI_MINIMI,
        previsione: null,
        pendenza: null,
        r2: null,
        affidabilita: null,
        motivo: valori.length === 0
          ? 'non ci sono ancora mesi conclusi da cui leggere una tendenza'
          : 'servono almeno ' + MESI_MINIMI + ' mesi conclusi, e ce ne sono '
            + valori.length + ': una retta fra così pochi punti non è una tendenza',
      };
    }

    var r = retta(valori);
    var b = bontà(valori, r);
    var livello = livelloDi(b.r2);
    var n = valori.length;

    var previsione = [];
    for (var i = 1; i <= mesiAvanti; i++) {
      /* Il pavimento a zero non è prudenza statistica: un mese non può
         fatturare meno di niente. Ma quando la retta scende sotto zero lo si
         dice, invece di mostrare uno zero che sembra una previsione. */
      var grezzo = r.intercetta + r.pendenza * (n - 1 + i);
      previsione.push({
        traMesi: i,
        valore: Math.max(0, Math.round(grezzo)),
        sottoZero: grezzo < 0,
        /* L'intervallo si allarga andando avanti: prevedere fra tre mesi è
           più incerto che fra uno, e mostrarli con la stessa larghezza
           sarebbe la parte disonesta del grafico. */
        intervallo: Math.round(b.scarto * Math.sqrt(i)),
      });
    }

    return {
      disponibile: true,
      mesiReali: n,
      mesiMinimi: MESI_MINIMI,
      previsione: previsione,
      pendenza: r.pendenza,
      intercetta: r.intercetta,
      r2: b.r2,
      scarto: b.scarto,
      affidabilita: { id: livello.id, label: livello.label, nota: livello.nota },
      motivo: null,
    };
  }

  /** La strada breve: dai record alla previsione, in un passaggio. */
  function daRighe(righe, opz) {
    var s = serieMensile(righe, opz);
    var esito = da(s.serie, opz);
    esito.serie = s.serie;
    esito.parziale = s.parziale;
    return esito;
  }

  /** Una frase sola, per chi disegna. Dice sempre su quanti mesi si basa:
      è l'informazione che rende la cifra leggibile o la smaschera. */
  function frase(esito) {
    if (!esito) return '';
    if (!esito.disponibile) return 'Previsione non disponibile: ' + esito.motivo + '.';
    return 'Su ' + esito.mesiReali + ' mesi conclusi · attendibilità '
      + esito.affidabilita.label + ' (R² ' + esito.r2.toFixed(2) + ') — '
      + esito.affidabilita.nota + '.';
  }

  global.InglyPrevisioni = {
    VERSIONE: VERSIONE,
    MESI_MINIMI: MESI_MINIMI,
    serieMensile: serieMensile,
    da: da,
    daRighe: daRighe,
    frase: frase,
  };
})(typeof window !== 'undefined' ? window : globalThis);

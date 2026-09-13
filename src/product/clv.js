/* ═══════════════════════════════════════════════════════════════════════════
   CLV — quanto vale un cliente, in margine e non in fatturato
   ═══════════════════════════════════════════════════════════════════════════

   Tre schermate dell'applicazione calcolavano già il «valore cliente», e tutte
   e tre facevano la stessa cosa: sommavano il **fatturato**. `clientintel`,
   `clv`, `ai-clv` — tre moduli, tre copie, un solo numero, e quel numero è
   quello sbagliato.

   Il fatturato dice quanto un cliente ti ha fatto incassare. Non dice quanto
   ti ha fatto **guadagnare**, e nel lavoro su commissione i due numeri si
   scollano parecchio: un cliente da 8 000 € di lavori laser complessi con
   materiale caro e otto ore di setup può valere meno di uno da 3 000 € di
   portachiavi ripetuti. Chi guarda la classifica per fatturato coltiva il
   primo e trascura il secondo.

   Questo file esiste perché INGLY OS **sa** la differenza: da quando l'ordine
   porta `economic`, il costo di produzione di ogni lavoro è dichiarato. È il
   dato che un CRM generico non ha e che un gestionale da laboratorio deve
   avere.

   ── Due numeri diversi, e non vanno confusi ──────────────────────────────

   1. **Valore storico** — quanto quel cliente ha già lasciato. È un fatto:
      si somma e basta.
   2. **Valore previsto** — quanto lascerà nei prossimi mesi se continua come
      ha fatto finora. È una proiezione, e va detta come tale: dipende da un
      orizzonte che si dichiara e da una frequenza misurata su quello che è
      successo, non su quello che si spera.

   Un cliente con un ordine solo non ha una frequenza: ha un evento. La
   proiezione per lui non si fa — restituisce `null` e il motivo — perché
   dividere per un intervallo che non esiste produce un numero enorme e falso.

   ── Quando il costo non si sa ────────────────────────────────────────────

   Gli ordini di prima del modello economico non hanno un costo dichiarato.
   Per loro il margine non si inventa: la riga dice `margineNoto: false` e la
   vista mostra il fatturato dicendo che è fatturato. Meglio un numero in meno
   che un margine sbagliato — un margine sbagliato si usa per decidere.

   Questo file è **puro**: niente DOM, niente archivio, niente orologio. La
   data di riferimento si passa, così lo stesso insieme di vendite dà lo stesso
   risultato domani e in un test.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';
  var GIORNO = 86400000;

  /* L'orizzonte della proiezione. Dodici mesi non è una scelta neutra: è
     l'arco su cui un artigiano ragiona per decidere se coltivare un cliente,
     ed è abbastanza corto da non moltiplicare l'errore della frequenza. Chi
     vuole un altro orizzonte lo passa. */
  var ORIZZONTE_MESI = 12;

  /* Sotto due ordini non c'è un intervallo fra acquisti da misurare. */
  var ORDINI_MINIMI_PER_PREVISIONE = 2;

  var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };
  var pos = function (v) { return Math.max(0, num(v)); };

  function quando(v) {
    if (v == null || v === '') return 0;
    var t = (v instanceof Date) ? v.getTime() : new Date(v).getTime();
    return isFinite(t) ? t : 0;
  }

  /** Le letture canoniche dell'ordine, se il modulo c'è. Non si duplicano
      qui: ricavo e costo hanno già un proprietario. */
  function E() { return global.InglyOrderEconomics; }

  function ricavoDi(riga) {
    var oe = E();
    if (oe && typeof oe.ricavoNettoOrdine === 'function') {
      var r = oe.ricavoNettoOrdine(riga);
      if (r > 0) return r;
    }
    /* Una vendita non è un ordine: il suo importo sta in `amount`. */
    var v = [riga.amount, riga.total, riga.value, riga.netPrice];
    for (var i = 0; i < v.length; i++) if (num(v[i]) > 0) return num(v[i]);
    return 0;
  }

  function costoDi(riga) {
    var oe = E();
    if (oe && typeof oe.costoOrdine === 'function') return oe.costoOrdine(riga);
    var v = [(riga.economic || {}).costTotal, riga.totalCost, riga.cost];
    for (var i = 0; i < v.length; i++) if (v[i] != null && num(v[i]) > 0) {
      return { valore: num(v[i]), noto: true };
    }
    return { valore: 0, noto: false };
  }

  /** Il cliente di una riga: l'id se c'è, altrimenti il nome normalizzato.
      Raggruppare per nome è meno solido, ma un cliente senza id esiste — e
      lasciarlo fuori dal conto lo farebbe sparire dalla classifica. */
  function chiave(riga) {
    if (riga.clientId != null && riga.clientId !== '') return 'id:' + riga.clientId;
    var n = String(riga.clientName || riga.client || '').trim().toLowerCase();
    return n ? 'nome:' + n : null;
  }

  /**
   * Il valore di ogni cliente, storico e previsto.
   *
   * @param {Array}  righe    vendite o ordini: quello che rappresenta un
   *                          incasso avvenuto. Chi chiama decide quali sono
   *                          «chiusi» — questo file non conosce gli stati.
   * @param {Array}  clienti  anagrafica, per il nome e per elencare anche chi
   *                          non ha ancora comprato.
   * @param {Object} opzioni  `{ adesso, orizzonteMesi }`
   */
  function calcola(righe, clienti, opzioni) {
    var o = opzioni || {};
    var adesso = quando(o.adesso) || 0;
    var orizzonte = pos(o.orizzonteMesi) || ORIZZONTE_MESI;
    var lista = Array.isArray(righe) ? righe : [];
    var anagrafica = Array.isArray(clienti) ? clienti : [];

    var per = {};
    lista.forEach(function (r) {
      var k = chiave(r);
      if (!k) return;
      var c = per[k] || (per[k] = {
        chiave: k,
        id: r.clientId != null ? r.clientId : null,
        nome: r.clientName || r.client || '—',
        ordini: 0, ricavo: 0, margine: 0,
        ordiniConCosto: 0, costo: 0,
        primo: 0, ultimo: 0,
      });
      var ric = ricavoDi(r);
      var cos = costoDi(r);
      c.ordini += 1;
      c.ricavo += ric;
      if (cos.noto) { c.ordiniConCosto += 1; c.costo += cos.valore; c.margine += (ric - cos.valore); }
      var t = quando(r.date || r.data || r.createdAt);
      if (t) {
        c.primo = c.primo ? Math.min(c.primo, t) : t;
        c.ultimo = Math.max(c.ultimo, t);
      }
    });

    /* Chi è in anagrafica e non ha comprato compare comunque, a zero: una
       classifica che nasconde i clienti senza acquisti fa credere che non
       esistano, ed è il momento in cui servirebbe ricordarsene. */
    anagrafica.forEach(function (a) {
      var k = (a.id != null && a.id !== '') ? 'id:' + a.id
        : (String(a.name || '').trim() ? 'nome:' + String(a.name).trim().toLowerCase() : null);
      if (!k) return;
      if (per[k]) { if (a.name) per[k].nome = a.name; return; }
      per[k] = { chiave: k, id: a.id != null ? a.id : null, nome: a.name || '—',
        ordini: 0, ricavo: 0, margine: 0, ordiniConCosto: 0, costo: 0, primo: 0, ultimo: 0 };
    });

    var out = Object.keys(per).map(function (k) { return arricchisci(per[k], adesso, orizzonte); });
    out.sort(function (a, b) {
      /* Per valore previsto quando c'è, altrimenti per quello storico: una
         classifica che mescola i due criteri senza dirlo non si può leggere. */
      var va = a.previsto.margine != null ? a.previsto.margine : -1;
      var vb = b.previsto.margine != null ? b.previsto.margine : -1;
      if (vb !== va) return vb - va;
      return b.storico.margineNoto === a.storico.margineNoto
        ? b.storico.ricavo - a.storico.ricavo
        : (b.storico.margineNoto ? 1 : -1);
    });
    return out;
  }

  function arricchisci(c, adesso, orizzonteMesi) {
    var margineNoto = c.ordini > 0 && c.ordiniConCosto === c.ordini;
    var margineParziale = c.ordiniConCosto > 0 && c.ordiniConCosto < c.ordini;

    var giorniDaUltimo = (adesso && c.ultimo) ? Math.floor((adesso - c.ultimo) / GIORNO) : null;
    var arco = (c.primo && c.ultimo && c.ultimo > c.primo) ? (c.ultimo - c.primo) / GIORNO : 0;

    /* La frequenza si misura sull'arco fra il primo e l'ultimo acquisto, non
       sul tempo da quando il cliente esiste in anagrafica: uno registrato due
       anni fa che compra da tre mesi ha la frequenza dei tre mesi. */
    var ordiniAnno = null;
    var motivoPrevisione = null;
    if (c.ordini < ORDINI_MINIMI_PER_PREVISIONE) {
      motivoPrevisione = c.ordini === 0
        ? 'nessun acquisto: non c\'è niente da proiettare'
        : 'un acquisto solo: non c\'è ancora un intervallo fra acquisti da misurare';
    } else if (arco <= 0) {
      motivoPrevisione = 'gli acquisti risultano tutti nello stesso giorno: l\'intervallo non è misurabile';
    } else {
      /* Intervalli fra acquisti = ordini − 1. Dividere per gli ordini
         gonfierebbe la frequenza di un fattore n/(n−1): su due acquisti,
         del doppio. */
      ordiniAnno = ((c.ordini - 1) / arco) * 365;
    }

    var margineMedio = c.ordiniConCosto > 0 ? c.margine / c.ordiniConCosto : null;
    var ricavoMedio = c.ordini > 0 ? c.ricavo / c.ordini : 0;

    var previstoMargine = null, previstoRicavo = null;
    if (ordiniAnno != null) {
      var ordiniOrizzonte = ordiniAnno * (orizzonteMesi / 12);
      previstoRicavo = ricavoMedio * ordiniOrizzonte;
      if (margineMedio != null) previstoMargine = margineMedio * ordiniOrizzonte;
      else motivoPrevisione = 'nessun costo dichiarato: si può proiettare solo il fatturato';
    }

    return {
      chiave: c.chiave, id: c.id, nome: c.nome,
      storico: {
        ordini: c.ordini,
        ricavo: c.ricavo,
        costo: c.costo,
        margine: margineNoto ? c.margine : (margineParziale ? c.margine : 0),
        margineNoto: margineNoto,
        margineParziale: margineParziale,
        ordiniConCosto: c.ordiniConCosto,
        marginePct: (margineNoto && c.ricavo > 0) ? (c.margine / c.ricavo) * 100 : null,
        primo: c.primo || null,
        ultimo: c.ultimo || null,
        giorniDaUltimo: giorniDaUltimo,
      },
      medie: {
        ricavoPerOrdine: ricavoMedio,
        marginePerOrdine: margineMedio,
        ordiniAnno: ordiniAnno,
      },
      previsto: {
        orizzonteMesi: orizzonteMesi,
        ricavo: previstoRicavo,
        margine: previstoMargine,
        motivo: motivoPrevisione,
      },
    };
  }

  /** I totali del laboratorio, con la stessa disciplina: quello che non si sa
      non si somma come se fosse zero. */
  function totali(elenco) {
    var l = Array.isArray(elenco) ? elenco : [];
    var conAcquisti = l.filter(function (c) { return c.storico.ordini > 0; });
    var conMargine = conAcquisti.filter(function (c) { return c.storico.margineNoto; });
    var conPrevisione = l.filter(function (c) { return c.previsto.margine != null; });
    return {
      clienti: l.length,
      conAcquisti: conAcquisti.length,
      senzaAcquisti: l.length - conAcquisti.length,
      ricavo: conAcquisti.reduce(function (a, c) { return a + c.storico.ricavo; }, 0),
      margine: conMargine.reduce(function (a, c) { return a + c.storico.margine; }, 0),
      clientiConMargineNoto: conMargine.length,
      /* La copertura è il numero che dice quanto fidarsi di tutto il resto. */
      coperturaPct: conAcquisti.length ? (conMargine.length / conAcquisti.length) * 100 : 0,
      previstoMargine: conPrevisione.reduce(function (a, c) { return a + c.previsto.margine; }, 0),
      clientiConPrevisione: conPrevisione.length,
    };
  }

  global.InglyCLV = {
    VERSIONE: VERSIONE,
    ORIZZONTE_MESI: ORIZZONTE_MESI,
    ORDINI_MINIMI_PER_PREVISIONE: ORDINI_MINIMI_PER_PREVISIONE,
    calcola: calcola,
    totali: totali,
  };
})(typeof window !== 'undefined' ? window : globalThis);

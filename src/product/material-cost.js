/* ═══════════════════════════════════════════════════════════════════════════
   MATERIAL COST — quanto costa davvero un chilo di quello che hai comprato
   ═══════════════════════════════════════════════════════════════════════════

   Il difetto che questo modulo esiste per chiudere è misurato, e non è di
   aritmetica. L'audit di Fase 1 ha confrontato il preventivatore con lo
   slicer sul caso 290 g e ha trovato una differenza di € 2,46 che si spiega
   in una riga:

     lo slicer valuta il PLA € 15,52/kg, il preventivatore € 24,00/kg.

   Nessuna delle due cifre è sbagliata. Sono due prezzi diversi dello stesso
   materiale, e la seconda era il **valore predefinito di un campo**, scritto
   una volta e sopravvissuto per anni perché niente chiedeva mai da dove
   venisse.

   Il prezzo vero non è nemmeno il prezzo di listino: è quello della fattura,
   spedizione compresa, diviso per quello che è arrivato davvero.

     costo reale = (imponibile + quota spedizione + accessori) ÷ quantità

   L'IVA non entra: si recupera. La spedizione sì: non si recupera, e su una
   bobina da 20 € un corriere da 7 € sposta il costo del 35%.

   Tre regole, e sono le stesse del registro di magazzino:

   1. **Non si inventa un costo.** Se non c'è, si dice che non c'è. Un
      `null` fa comparire un avviso; uno zero fa comparire un preventivo
      sbagliato che sembra giusto.
   2. **Il preventivo congela il costo.** Se domani il filamento rincara, il
      preventivo di ieri non cambia: mostrava un numero e quel numero è stato
      promesso.
   3. **Nessun secondo database di materiali.** Questo modulo legge il
      registro, non ne tiene uno suo.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  var num = function (v, d) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isFinite(n) ? n : (d === undefined ? 0 : d);
  };
  var pos = function (v, d) { return Math.max(0, num(v, d)); };

  /* ── Unità ────────────────────────────────────────────────────────────────
     Un filamento si compra a bobina e si consuma a grammi; una resina a
     bottiglia e a millilitri; un pannello a foglio e a centimetri quadri. Il
     costo reale si esprime nell'unità **di acquisto** e si converte in quella
     **di consumo** una volta sola, qui, invece che in ogni preventivatore con
     un fattore scritto a mano. */
  var UNITA = {
    kg: { id: 'kg', label: '€/kg', consumo: 'g', per: 1000 },
    l: { id: 'l', label: '€/L', consumo: 'ml', per: 1000 },
    m2: { id: 'm2', label: '€/m²', consumo: 'cm²', per: 10000 },
    pz: { id: 'pz', label: '€/pz', consumo: 'pz', per: 1 },
    m: { id: 'm', label: '€/m', consumo: 'cm', per: 100 },
  };

  /** L'unità di un articolo, dedotta da come è stato registrato. Dedurre è
      lecito qui perché il risultato è **dichiarato** nel ritorno: chi legge
      vede quale unità è stata usata e può correggerla. */
  function pos(v) { var n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0; }

  /* ── Le quattro politiche di costo, dichiarate ────────────────────────────
     Non sono quattro opinioni sullo stesso numero: rispondono a domande
     diverse, e chi preventiva deve poter dire a quale sta rispondendo.
     `manuale` non è l'assenza di una politica — è la dichiarazione che il
     numero non viene dal registro, ed è ciò che rende onesta l'etichetta
     «non verificato» accanto al prezzo. */
  var POLITICHE = [
    { id: 'fifo',    label: 'FIFO',              spiega: 'Consuma i lotti nell\'ordine in cui sono entrati: 500 g presi da un lotto di 420 g a € 15,99 e uno a € 19,50 costano 420×15,99 + 80×19,50.' },
    { id: 'media',   label: 'Costo medio',       spiega: 'Media ponderata di tutti gli acquisti valorizzati. È la più stabile e la meno sensibile a un singolo acquisto fuori mercato.' },
    { id: 'ultimo',  label: 'Ultimo acquisto',   spiega: 'Il prezzo dell\'ultima entrata a registro. Segue il mercato, e con esso oscilla.' },
    { id: 'manuale', label: 'Prezzo a mano',     spiega: 'Il numero scritto nel campo. Non viene dal registro e resta dichiarato «non verificato».' },
  ];
  function politica(id) {
    for (var i = 0; i < POLITICHE.length; i++) if (POLITICHE[i].id === id) return POLITICHE[i];
    return POLITICHE[1];
  }

  function unitaDi(articolo) {
    var a = articolo || {};
    var esplicita = String(a.costUnit || a.unitaCosto || '').toLowerCase();
    if (UNITA[esplicita]) return UNITA[esplicita];
    var u = String(a.unit || a.unita || '').toLowerCase();
    if (/kg|bobina|spool|rotolo/.test(u)) return UNITA.kg;
    if (/\bl\b|litro|bottiglia|flacone/.test(u)) return UNITA.l;
    if (/m2|m²|mq|foglio|pannello|lastra/.test(u)) return UNITA.m2;
    if (/\bm\b|metro|nastro/.test(u)) return UNITA.m;
    return UNITA.pz;
  }

  /* ── Il costo reale di un acquisto ────────────────────────────────────────
     Un acquisto non è un prezzo: è una fattura. Questa funzione la legge. */

  /**
   * @param {Object} acquisto
   *   imponibile | netAmount | price   importo senza IVA
   *   lordo | grossAmount              importo con IVA (usato solo se manca l'imponibile)
   *   ivaPct                           aliquota, per scorporare il lordo
   *   spedizione | shipping            spesa di trasporto attribuita a questo acquisto
   *   accessori | fees                 dogana, commissioni, imballo
   *   quantita | quantity              quanto è arrivato, nell'unità di acquisto
   *   unit                             per dedurre l'unità
   * @returns {{disponibile:boolean, costoUnitario:number|null, …}}
   */
  function costoReale(acquisto) {
    var a = acquisto || {};
    var q = pos(a.quantita != null ? a.quantita : a.quantity);
    if (!(q > 0)) {
      return { disponibile: false, motivo: 'quantità acquistata mancante o zero',
        costoUnitario: null };
    }

    /* L'imponibile è il numero giusto perché l'IVA si recupera. Se è stato
       registrato solo il lordo lo si scorpora, ma lo si dichiara: un lordo
       scambiato per imponibile gonfia il costo del 22% su tutto. */
    var imponibile = a.imponibile != null ? num(a.imponibile)
      : (a.netAmount != null ? num(a.netAmount) : null);
    var scorporato = false;
    if (imponibile == null) {
      var lordo = a.lordo != null ? num(a.lordo) : (a.grossAmount != null ? num(a.grossAmount) : null);
      if (lordo != null) {
        imponibile = lordo / (1 + pos(a.ivaPct, 22) / 100);
        scorporato = true;
      }
    }
    if (imponibile == null && a.price != null) imponibile = num(a.price);
    if (imponibile == null || !(imponibile >= 0)) {
      return { disponibile: false, motivo: 'nessun importo registrato per questo acquisto',
        costoUnitario: null };
    }

    var spedizione = pos(a.spedizione != null ? a.spedizione : a.shipping);
    var accessori = pos(a.accessori != null ? a.accessori : a.fees);
    var totale = imponibile + spedizione + accessori;
    var u = unitaDi(a);

    return {
      disponibile: true,
      costoUnitario: totale / q,
      unita: u.id, unitaLabel: u.label,
      /* Il costo nell'unità in cui il materiale si consuma davvero: un
         preventivo ragiona in grammi, la fattura in chili. */
      costoConsumo: (totale / q) / u.per,
      unitaConsumo: u.consumo,
      quantita: q,
      composizione: {
        imponibile: imponibile, spedizione: spedizione, accessori: accessori,
        totale: totale,
        /* Quanto pesa il trasporto: su ordini piccoli è la voce che decide se
           l'acquisto conveniva. */
        incidenzaSpedizionePct: totale > 0 ? (spedizione / totale) * 100 : 0,
      },
      ivaScorporata: scorporato,
      confidence: scorporato ? 'declared' : 'verified',
      avvisi: [].concat(
        scorporato ? ['importo scorporato dal lordo con IVA ' + pos(a.ivaPct, 22) + '%: verifica l\'aliquota'] : [],
        spedizione === 0 && accessori === 0
          ? ['nessuna spedizione registrata: se l\'hai pagata, il costo reale è più alto']
          : []
      ),
    };
  }

  /* ── Lo storico ───────────────────────────────────────────────────────────
     Quattro numeri diversi che tutti si chiamano «il prezzo», e confonderli
     porta a due errori opposti: preventivare sull'ultimo acquisto quando è
     stato un affare irripetibile, o sul più basso di sempre quando era un
     saldo. Si mostrano tutti e quattro e si sceglie sapendo. */
  /* Il registro identifica un articolo con `itemId`: `itemKey` è la forma
     «store:id» che usano le righe d'ordine. Si accettano entrambi e si
     normalizza qui, invece di lasciare che ogni chiamante indovini quale dei
     due serva — è il modo in cui due nomi dello stesso concetto diventano due
     concetti. */
  function idDi(chiave) {
    var k = String(chiave == null ? '' : chiave);
    var i = k.indexOf(':');
    return i >= 0 ? k.slice(i + 1) : k;
  }

  function storico(movimenti, chiave, warehouseId) {
    var id = idDi(chiave);
    var entrate = (movimenti || []).filter(function (m) {
      if (!m || String(m.itemId) !== id) return false;
      if (warehouseId != null && String(m.warehouseId) !== String(warehouseId)) return false;
      return m.delta > 0 && m.unitCost != null;
    }).slice().sort(function (a, b) {
      return String(a.timestamp || '').localeCompare(String(b.timestamp || ''));
    });

    if (!entrate.length) {
      return { disponibile: false, motivo: 'nessun acquisto con costo registrato',
        serie: [], ultimo: null, medio: null, minimo: null, massimo: null };
    }

    var qTot = 0, vTot = 0, min = null, max = null;
    var serie = entrate.map(function (m) {
      var c = num(m.unitCost), q = Math.abs(num(m.quantity));
      qTot += q; vTot += c * q;
      if (min == null || c < min) min = c;
      if (max == null || c > max) max = c;
      return { quando: m.timestamp || null, costo: c, quantita: q,
        riferimento: m.referenceId || null, tipo: m.type };
    });

    var ultimo = serie[serie.length - 1];
    return {
      disponibile: true,
      serie: serie,
      ultimo: ultimo.costo, ultimoQuando: ultimo.quando,
      /* La media è **ponderata sulle quantità**: comprare 10 kg a 15 € e
         100 g a 40 € non fa una media di 27,50 €. */
      medio: qTot > 0 ? vTot / qTot : null,
      minimo: min, massimo: max,
      acquisti: serie.length,
      quantitaTotale: qTot, valoreTotale: vTot,
      /* Di quanto è cambiato: la domanda che si fa chi rifà un preventivo di
         sei mesi fa. */
      variazionePct: serie.length > 1 && serie[0].costo > 0
        ? ((ultimo.costo - serie[0].costo) / serie[0].costo) * 100 : null,
    };
  }

  /* ── Il costo da usare in un preventivo ───────────────────────────────────
     Una sola porta. Ogni preventivatore chiede qui, e qui si decide — con una
     politica dichiarata — quale dei numeri dello storico vale. Se non c'è
     niente, non si restituisce zero: si restituisce «non disponibile», e chi
     ha chiamato deve dirlo all'utente invece di stampare un preventivo
     costruito su un costo inventato. */
  function perPreventivo(opzioni) {
    var o = opzioni || {};
    var R = global.InglyInventoryCostResolver;
    var movimenti = o.movimenti || [];
    var chiave = o.itemKey != null ? o.itemKey : o.itemId;

    if (chiave == null || chiave === '') {
      return nonDisponibile('nessun materiale selezionato',
        'Scegli un materiale dal magazzino, oppure inserisci il prezzo a mano: verrà segnato come non verificato.');
    }

    /* Il registro è la fonte: il resolver sa già leggere ultimo, media e
       FIFO, e non c'è ragione di riscrivere quella matematica qui. */
    var id = idDi(chiave);
    /* La quantità consumata serve al FIFO, e solo a lui: prelevare 500 g da
       un lotto di 420 g a € 15,99 e uno da 1,2 kg a € 19,50 costa
       420×15,99 + 80×19,50, non 500 volte una media. Senza `quantita` il
       resolver risponde con il costo dei lotti residui, che è un'altra
       domanda — corretta, ma non questa. */
    var politica = o.politica || 'media';
    var esito = R ? R.risolvi(movimenti, id, {
      policy: politica,
      warehouseId: o.warehouseId,
      richiesta: politica === 'fifo' && pos(o.quantita) > 0 ? pos(o.quantita) : undefined,
    }) : null;
    var st = storico(movimenti, id, o.warehouseId);

    if (!esito || !esito.disponibile) {
      return nonDisponibile(
        (esito && esito.motivo) || 'nessun costo nel registro per questo materiale',
        'Registra un acquisto con il suo importo, oppure inserisci il prezzo a mano.',
        { storico: st });
    }

    var u = unitaDi(o.articolo || {});
    return {
      disponibile: true,
      costoUnitario: esito.costo,
      unita: u.id, unitaLabel: u.label,
      costoConsumo: esito.costo / u.per, unitaConsumo: u.consumo,
      politica: esito.policy || esito.politica || o.politica || 'media',
      source: 'registro', sourceType: 'inventory', confidence: 'verified',
      itemKey: chiave, itemId: id,
      storico: st,
      traccia: esito.traccia || null,
      quando: esito.quando || (st.disponibile ? st.ultimoQuando : null),
    };
  }

  function nonDisponibile(motivo, cosaFare, extra) {
    return Object.assign({
      disponibile: false, costoUnitario: null, costoConsumo: null,
      motivo: motivo, cosaFare: cosaFare || null,
      source: 'mancante', sourceType: 'missing', confidence: 'missing',
    }, extra || {});
  }

  /* ── Il congelamento ──────────────────────────────────────────────────────
     Un preventivo salvato non deve cambiare quando cambia il listino. È la
     stessa regola dello storico ordini, per la stessa ragione: quel numero è
     stato mostrato a qualcuno.

     Si congela il **valore** e la **spiegazione**, non un riferimento al
     registro: un riferimento verrebbe riletto, e rileggere è esattamente ciò
     che si vuole impedire. */
  function congela(esito, contesto) {
    var e = esito || {};
    var c = contesto || {};
    var blocco = {
      schema: 1,
      materialCostAtQuote: e.disponibile ? e.costoUnitario : null,
      unit: e.unitaLabel || null,
      costPerConsumptionUnit: e.disponibile ? e.costoConsumo : null,
      consumptionUnit: e.unitaConsumo || null,
      itemKey: e.itemKey || c.itemKey || null,
      source: e.source || 'mancante',
      sourceType: e.sourceType || 'missing',
      confidence: e.confidence || 'missing',
      policy: e.politica || null,
      /* Quando è stato congelato, non quando è stato comprato: sono due date
         diverse e servono a due domande diverse. */
      frozenAt: c.quando || new Date().toISOString(),
      pricedAt: e.quando || null,
      motivo: e.disponibile ? null : (e.motivo || null),
    };
    return Object.freeze(blocco);
  }

  /** Un costo congelato è ancora quello corrente? Non per correggerlo — non si
      corregge — ma per dirlo a chi sta guardando un preventivo vecchio. */
  function confronta(congelato, adesso) {
    var a = congelato && congelato.materialCostAtQuote;
    var b = adesso && adesso.disponibile ? adesso.costoUnitario : null;
    if (a == null || b == null) {
      return { confrontabile: false, motivo: a == null ? 'il preventivo non ha un costo congelato' : 'nessun costo corrente' };
    }
    var d = b - a;
    return {
      confrontabile: true, congelato: a, corrente: b,
      differenza: d, differenzaPct: a > 0 ? (d / a) * 100 : null,
      /* Il verso conta: un materiale rincarato erode un margine già promesso,
         uno ribassato lo allarga. Sono due notizie diverse. */
      verso: Math.abs(d) < 0.0001 ? 'invariato' : (d > 0 ? 'rincarato' : 'ribassato'),
    };
  }

  /* ── Il foglio ────────────────────────────────────────────────────────────
     Un pannello non si consuma a centimetri quadri: si consuma a **pezzi che
     ci stanno dentro**. Fra le due cose c'è tutto quello che si butta — il
     solco del taglio, il bordo che la macchina non raggiunge, e lo spazio fra
     un pezzo e l'altro — e il costo per pezzo calcolato dividendo l'area è
     sistematicamente più basso del vero.

     Il conto per riga e colonna è approssimato per difetto rispetto a un
     nesting vero, ed è la direzione giusta in cui sbagliare: un preventivo
     che sovrastima leggermente lo scarto perde una commessa, uno che lo
     sottostima la esegue in perdita. */
  function pezziPerFoglio(o) {
    var c = o || {};
    var fW = pos(c.foglioLarghezzaMm), fH = pos(c.foglioAltezzaMm);
    var pW = pos(c.pezzoLarghezzaMm), pH = pos(c.pezzoAltezzaMm);
    if (!(fW > 0 && fH > 0 && pW > 0 && pH > 0)) {
      return { disponibile: false, motivo: 'misure del foglio o del pezzo mancanti', pezzi: null };
    }
    var bordo = pos(c.bordoMm, 5);
    var kerf = pos(c.kerfMm, 0.2);
    var utileW = fW - 2 * bordo, utileH = fH - 2 * bordo;
    if (!(utileW > 0 && utileH > 0)) {
      return { disponibile: false, motivo: 'il bordo di sicurezza non lascia area utile', pezzi: 0 };
    }
    /* Ogni pezzo porta con sé mezzo solco per lato: fra due pezzi adiacenti il
       solco è uno solo, e contarlo due volte sprecherebbe area vera. */
    var passoW = pW + kerf, passoH = pH + kerf;
    var conta = function (uW, uH, aW, aH) {
      return Math.max(0, Math.floor((uW + kerf) / aW)) * Math.max(0, Math.floor((uH + kerf) / aH));
    };
    var dritto = conta(utileW, utileH, passoW, passoH);
    /* Ruotare di 90° è gratis e a volte cambia tutto: 3 pezzi invece di 2. */
    var ruotato = c.ruotabile === false ? 0 : conta(utileW, utileH, passoH, passoW);
    var pezzi = Math.max(dritto, ruotato);

    var areaFoglio = fW * fH;
    var areaPezzi = pezzi * pW * pH;
    return {
      disponibile: true, pezzi: pezzi,
      orientamento: ruotato > dritto ? 'ruotato' : 'dritto',
      dritto: dritto, ruotato: ruotato,
      resaPct: areaFoglio > 0 ? (areaPezzi / areaFoglio) * 100 : 0,
      scartoPct: areaFoglio > 0 ? 100 - (areaPezzi / areaFoglio) * 100 : 0,
      bordoMm: bordo, kerfMm: kerf,
    };
  }

  /** Il costo di un pezzo ricavato da un foglio: il foglio intero diviso i
      pezzi che ci stanno, non l'area del pezzo. Quello che avanza è pagato. */
  function costoDaFoglio(o) {
    var c = o || {};
    var n = pezziPerFoglio(c);
    var prezzo = pos(c.prezzoFoglio);
    if (!n.disponibile) return Object.assign({ costoPezzo: null }, n);
    if (!(n.pezzi > 0)) {
      return Object.assign({ costoPezzo: null, motivo: 'nessun pezzo entra in questo foglio' }, n);
    }
    if (!(prezzo > 0)) {
      return Object.assign({ costoPezzo: null, disponibile: false,
        motivo: 'prezzo del foglio mancante' }, n);
    }
    return Object.assign({}, n, {
      costoPezzo: prezzo / n.pezzi,
      prezzoFoglio: prezzo,
      /* Quanto costa quello che si butta: la voce che nessuno guarda e che su
         un pannello mal sfruttato è il 40% della spesa. */
      costoScarto: prezzo * (n.scartoPct / 100),
    });
  }

  /* ── La cache ─────────────────────────────────────────────────────────────
     Il registro vive su IndexedDB e si legge in modo asincrono; i
     preventivatori ricalcolano a ogni tasto premuto, in modo sincrono. Fra le
     due cose serve una cache, e una cache è un secondo posto dove un numero
     può essere vecchio — quindi porta con sé **quando** è stata riempita, e
     chi la legge può dirlo.

     Non è una seconda fonte di verità: non si scrive mai, si svuota e si
     rilegge. */
  var CACHE = { pronta: false, quando: null, perId: {}, articoli: {} };

  async function aggiornaCache(opzioni) {
    var o = opzioni || {};
    var INV = global.InglyInventory;
    if (!INV || typeof INV.tutti !== 'function') {
      CACHE = { pronta: false, quando: null, perId: {}, articoli: o.articoli || {} };
      return CACHE;
    }
    var movimenti = await INV.tutti().catch(function () { return []; });
    var perId = {};
    movimenti.forEach(function (m) { if (m && m.itemId != null) (perId[m.itemId] = perId[m.itemId] || []).push(m); });
    CACHE = { pronta: true, quando: new Date().toISOString(), perId: perId,
      articoli: o.articoli || CACHE.articoli || {} };
    return CACHE;
  }

  /** Lettura sincrona per chi disegna. Se la cache non è pronta lo dice: non
      restituisce zero, e non restituisce l'ultimo valore che ricordava. */
  function dallaCache(chiave, opzioni) {
    var o = opzioni || {};
    if (!CACHE.pronta) {
      return nonDisponibile('registro non ancora letto',
        'Riapri la sezione fra un istante, oppure inserisci il prezzo a mano.');
    }
    var id = idDi(chiave);
    var movimenti = CACHE.perId[id] || [];
    if (!movimenti.length) {
      return nonDisponibile('nessun movimento a registro per questo materiale',
        'Registra l\'acquisto con il suo importo, oppure inserisci il prezzo a mano.');
    }
    return perPreventivo({ movimenti: movimenti, itemKey: id,
      politica: o.politica, quantita: o.quantita, warehouseId: o.warehouseId,
      articolo: o.articolo || CACHE.articoli[id] || {} });
  }

  /* ── I materiali da stampa, letti dal registro ────────────────────────────
     Il preventivatore 3D teneva la propria lista di filamenti in
     localStorage, separata dal magazzino, e un ponte la riempiva **una volta
     sola in una direzione**. Il risultato: un prezzo corretto in magazzino non
     arrivava al preventivo, e un materiale aggiunto nel preventivatore non
     esisteva per il magazzino. Due sistemi che possiedono lo stesso concetto,
     ciascuno corretto da solo.

     Qui si legge il registro. La lista locale non sparisce — contiene lavoro
     vero di chi l'ha compilata — ma smette di essere una fonte alternativa:
     diventa l'elenco di ciò che **non è ancora** a magazzino, e lo dichiara. */
  var PAROLE_3D = /filament|filamento|pla\b|petg|abs\b|asa\b|tpu\b|nylon|pa6|resin|resina|bobina|spool/i;
  var PAROLE_RESINA = /resin|resina/i;

  async function materialiPerStampa3D(opzioni) {
    var o = opzioni || {};
    var db = global.IDB;
    if (!db || typeof db.getAll !== 'function') return [];

    var archivi = o.archivi || ['items', 'gadgets', 'inventory', 'components'];
    var trovati = [];
    for (var a = 0; a < archivi.length; a++) {
      var righe = await db.getAll(archivi[a]).catch(function () { return []; });
      (righe || []).forEach(function (r) {
        if (!r) return;
        var testo = [r.name, r.category, r.categoria, r.unit, r.notes].filter(Boolean).join(' ');
        if (!PAROLE_3D.test(testo)) return;
        var resina = PAROLE_RESINA.test(testo);
        /* Il costo viene dal registro se c'è; altrimenti dall'anagrafica, e in
           quel caso è dichiarato e non verificato. */
        var daRegistro = dallaCache(archivi[a] + ':' + r.id, { articolo: r });
        var prezzo = daRegistro.disponibile ? daRegistro.costoUnitario
          : num(r.costPrice != null ? r.costPrice : r.cost, 0);
        if (!(prezzo > 0)) return;
        trovati.push({
          id: 'inv:' + archivi[a] + ':' + r.id,
          n: r.name || r.nome || 'Materiale',
          t: resina ? 'resin' : 'fdm',
          p: Math.round(prezzo * 100) / 100,
          u: resina ? 1000 : 1000,
          s: r.supplier || r.fornitore || r.notes || 'Magazzino',
          fonte: daRegistro.disponibile ? 'registro' : 'anagrafica',
          confidence: daRegistro.disponibile ? 'verified' : 'declared',
          itemKey: archivi[a] + ':' + r.id,
          giacenza: num(r.quantity != null ? r.quantity : (r.stock != null ? r.stock : r.qty), 0),
        });
      });
    }
    /* Lo stesso materiale può comparire in due archivi: vince quello che ha un
       costo a registro, perché è l'unico verificabile. */
    var perNome = {};
    trovati.forEach(function (m) {
      var k = String(m.n).toLowerCase().trim();
      var pre = perNome[k];
      if (!pre || (m.fonte === 'registro' && pre.fonte !== 'registro')) perNome[k] = m;
    });
    return Object.keys(perNome).map(function (k) { return perNome[k]; });
  }

  function statoCache() {
    return { pronta: CACHE.pronta, quando: CACHE.quando,
      materiali: Object.keys(CACHE.perId).length };
  }

  function svuotaCache() { CACHE = { pronta: false, quando: null, perId: {}, articoli: {} }; }

  global.InglyMaterialCost = {
    POLITICHE: POLITICHE,
    politica: politica,
    version: VERSIONE,
    UNITA: UNITA,
    unitaDi: unitaDi,
    idDi: idDi,
    costoReale: costoReale,
    pezziPerFoglio: pezziPerFoglio,
    costoDaFoglio: costoDaFoglio,
    storico: storico,
    perPreventivo: perPreventivo,
    congela: congela,
    confronta: confronta,
    aggiornaCache: aggiornaCache,
    materialiPerStampa3D: materialiPerStampa3D,
    dallaCache: dallaCache,
    statoCache: statoCache,
    svuotaCache: svuotaCache,
  };
})(typeof window !== 'undefined' ? window : globalThis);

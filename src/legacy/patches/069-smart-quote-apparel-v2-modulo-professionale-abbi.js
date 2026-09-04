
// ═══════════════════════════════════════════════════════════════════════════
// 👕 SMART QUOTE APPAREL v2 — Modulo professionale abbigliamento
// DTF · Sublimazione · Pressa a caldo · Transfer · Vinile · Ricamo
// ═══════════════════════════════════════════════════════════════════════════
var ApparelQuoter = (function () {
  'use strict';

  var SK       = 'ingly_apparel_v1';
  var PRODS_SK = 'ingly_apparel_products_v1';
  var SETT_SK  = 'ingly_apparel_settings_v1';
  var STOCK_SK = 'ingly_apparel_stock_v1';

  var _view   = 'dashboard';
  var _editId = null;
  var _prodFilter = { cat:'', search:'' };


  // ── Constants ────────────────────────────────────────────────────────────
  var TECHS = {
    dtf:       { label:'DTF',                icon:'🖨️', color:'#6366f1', baseCost:2.80, timeMin:3 },
    sub:       { label:'Sublimazione',        icon:'🎨', color:'#0891b2', baseCost:1.90, timeMin:4 },
    pressa:    { label:'Pressa a caldo',      icon:'🔥', color:'#f59e0b', baseCost:1.50, timeMin:2 },
    transfer:  { label:'Transfer',            icon:'📋', color:'#8b5cf6', baseCost:2.20, timeMin:2 },
    vinile:    { label:'Vinile Termoadesivo', icon:'✂️', color:'#10b981', baseCost:3.50, timeMin:5 },
    ricamo:    { label:'Ricamo',              icon:'🧵', color:'#ec4899', baseCost:5.00, timeMin:8, setupCost:0 },
    /* Serigrafia e ricamo hanno un avviamento vero — telaio ed emulsione la
       prima, digitalizzazione del file il secondo — che prima veniva
       addebitato per ogni pezzo. `setupCost` parte da zero: chi lo conosce lo
       inserisce, e nessuno si ritrova un numero inventato nel preventivo. */
    serigrafia:{ label:'Serigrafia',          icon:'🖼️', color:'#ef4444', baseCost:3.20, timeMin:6, setupCost:0 },
    laser_f2:  { label:'Laser xTool F2',     icon:'⚡', color:'#fbbf24', baseCost:1.80, timeMin:2 },
    laser_fibra:{label:'Laser Fibra/MOPA',   icon:'💎', color:'#a78bfa', baseCost:2.50, timeMin:3 },
  };


  var SIZES = ['XS','S','M','L','XL','XXL','3XL','Unica','Bambino','Donna'];

  var PROD_CATS = [
    { id:'tshirt',    label:'T-Shirt',       icon:'👕', desc:'Girocollo manica corta' },
    { id:'polo',      label:'Polo',          icon:'👔', desc:'Polo manica corta/lunga' },
    { id:'felpa',     label:'Felpa',         icon:'🧥', desc:'Felpa girocollo/canguro' },
    { id:'felpazip',  label:'Felpa con zip', icon:'🧥', desc:'Full zip / half zip' },
    { id:'gilet',     label:'Gilet',         icon:'🦺', desc:'Gilet/Bodywarmer' },
    { id:'giacca',    label:'Giacca',        icon:'🧥', desc:'Giacca sportiva/softshell' },
    { id:'cappello',  label:'Cappello',      icon:'🧢', desc:'Cappello/Berretto/Visiera' },
    { id:'shopper',   label:'Shopper / Borsa',icon:'👜', desc:'Shopper cotone/non tessuto' },
    { id:'pantalone', label:'Pantalone',     icon:'👖', desc:'Pantalone lavoro/sport' },
    { id:'grembiule', label:'Grembiule',     icon:'👷', desc:'Grembiule lavoro/cucina' },
    { id:'custom',    label:'Personalizzato',icon:'⭐', desc:'Capo personalizzato' },
  ];

  var STATUSES = [
    { id:'bozza',      label:'Bozza',      color:'#64748b', bg:'rgba(100,116,139,.12)' },
    { id:'inviato',    label:'Inviato',    color:'#3b82f6', bg:'rgba(59,130,246,.12)'  },
    { id:'confermato', label:'Confermato', color:'#10b981', bg:'rgba(16,185,129,.12)'  },
    { id:'produzione', label:'Produzione', color:'#f59e0b', bg:'rgba(245,158,11,.12)'  },
    { id:'consegnato', label:'Consegnato', color:'#22c55e', bg:'rgba(34,197,94,.12)'   },
    { id:'annullato',  label:'Annullato',  color:'#ef4444', bg:'rgba(239,68,68,.12)'   },
  ];

  var QTY_BREAKS = [1,5,10,15,20,30,50,75,100,150,200];

  // ── Machine profiles ────────────────────────────────────────────────
  var MACHINES = {
    xtool_f2:     {label:'xTool F2',icon:'⚡',color:'#fbbf24',watts:80,purchaseCost:1250,lifeYears:5,desc:'Diodo 15W + IR 5W · 6000mm/s · 115x115mm',url:'https://www.xtool.com/products/xtool-f2',hourly:0.156,energyHourly:0.022,inkCostPrint:0,materials:'Legno, MDF, acrilico, pelle, inox (IR), alluminio',tip:'IR 5W per metalli. Diodo per organici.'},
    xtool_p3:     {label:'xTool P3 20W',icon:'🔷',color:'#06b6d4',watts:65,purchaseCost:800,lifeYears:5,desc:'Diodo 20W · 400x400mm · taglio rapido',url:'https://www.xtool.com',hourly:0.10,energyHourly:0.018,inkCostPrint:0,materials:'Legno, MDF, plexiglass, pelle, sughero, feltro',tip:'20W diodo: taglio MDF 3mm. 400x400mm.'},
    xtool_p2_co2: {label:'xTool P2 CO2 55W',icon:'🔵',color:'#3b82f6',watts:120,purchaseCost:2500,lifeYears:8,desc:'CO2 55W · 600x400mm · professionale',url:'https://www.xtool.com/products/xtool-p2',hourly:0.195,energyHourly:0.034,inkCostPrint:0,materials:'Legno, MDF, plexiglass, vetro, ceramica, tessuto',tip:'CO2 55W: taglia MDF 6mm, plexiglass 8mm.'},
    epson_et2865: {label:'Epson EcoTank ET-2865',icon:'🖨️',color:'#10b981',watts:15,purchaseCost:180,lifeYears:5,desc:'Sublimazione A4 · EcoTank ricaricabile',url:'https://www.epson.it',hourly:0.0225,energyHourly:0.004,inkCostPrint:0.50,materials:'Poliestere, tazze, cuscini, puzzle, MDF bianco',tip:'Solo sublimazione su bianco. Ink ~0.50/A4. Riscald. 5 min.'},
    pressa_calore:{label:'Pressa Termica 40x50',icon:'🔥',color:'#f59e0b',watts:1500,purchaseCost:250,lifeYears:8,desc:'Pressa 40x50cm · DTF/Sub/Transfer',url:'',hourly:0.0195,energyHourly:0.042,inkCostPrint:0,materials:'T-shirt, felpe, shopper, DTF, sublimazione tessuto',tip:'DTF: 160-180C 25sec. Sub: 200C 30-45sec.'},
    transmatic_tmh50:{label:'Transmatic TMH50',icon:'🗂️',color:'#8b5cf6',watts:180,purchaseCost:150,lifeYears:10,desc:'Taglierina fino 50cm · transfer e vinile',url:'https://www.transmaticsrl.it',hourly:0.009,energyHourly:0.005,inkCostPrint:0,materials:'Vinile termoadesivo, transfer, flock, strass',tip:'Pressione 30-60g/cm2. Vel 20-50mm/s.'},
  };


  var DEF_SETTINGS = {
    energyKwh:    0.28,   // €/kWh
    energyWatts:  80,     // watt default = xTool F2
    laborHourly:  18.00,  // €/ora manodopera (KB PRICING.md)
    machineHourly:0.16,   // €/ora ammortamento macchina (xTool F2)
    packPerPiece: 0.40,   // €/pz imballaggio
    vatPct:       22,
    currency:     '€',
    activeMachine:'xtool_f2', // macchina attiva di default
    qtyDiscounts: {5:2, 10:5, 15:7, 20:10, 30:13, 50:17, 75:20, 100:25, 150:28, 200:32},
    techCosts:    {},     // overrides
    businessName: '',
  };

  // ── Storage helpers ──────────────────────────────────────────────────────
  function load(key, def) {
    try { return JSON.parse(localStorage.getItem(key)||JSON.stringify(def||'[]')); }
    catch(e){ return def||[]; }
  }
  function store(key, data){ try{ localStorage.setItem(key, JSON.stringify(data)); }catch(e){} }

  function loadQ()  { return load(SK,[]); }
  function loadP()  { return load(PRODS_SK,[]); }
  function loadSt() { return load(STOCK_SK,{}); }  // { prodId: {qty, minStock} }
  function loadS()  {
    var s = load(SETT_SK,{});
    return Object.assign({},DEF_SETTINGS,s,{
      techCosts:    Object.assign({},DEF_SETTINGS.techCosts,s.techCosts||{}),
      qtyDiscounts: Object.assign({},DEF_SETTINGS.qtyDiscounts,s.qtyDiscounts||{}),
    });
  }

  // ── Calculations ─────────────────────────────────────────────────────────
  /* Il conto non vive più qui: vive in `InglyCostEngine`, profilo generico.
     Questa funzione raccoglie le voci e le porta al motore.

     Tre difetti misurati sono spariti nel passaggio, e vale la pena dirli
     perché i prezzi cambiano — in meglio, ma cambiano:

     1. Lo sconto quantità era applicato a un prezzo da ricarico:
        `costo × (1 + margine) × (1 − sconto)`. A 200 pezzi diventava
        `costo × 1,40 × 0,68 = costo × 0,952`, cioè **sotto costo**, a margine
        −5,0%. Ora lo sconto passa dal motore, che ha un pavimento di margine e
        rifiuta di scendere sotto la soglia.

     2. Il campo «margine» era un ricarico: chi impostava 40 otteneva 28,6.
        Ora si chiede un margine e si ottiene un margine.

     3. I costi di avviamento non esistevano. La serigrafia costava 3,20 €/pz
        sia per un pezzo sia per duecento, mentre è quasi tutta una tantum —
        telaio, emulsione, messa a registro. Ora `setupCost` per tecnica si
        divide per la quantità, e il prezzo scende con il lotto perché scende
        il costo, non perché una tabella dice di scontare.

     Le impostazioni storiche restano valide: chi non ha mai toccato
     `setupCost` non vede cambiare l'avviamento (resta zero), e il difetto 1
     resta comunque corretto. */
  function calcLine(line, s) {
    var motore = (typeof window !== 'undefined') && window.InglyCostEngine;
    var techKey = line.tech || 'dtf';
    var techBase = (s.techCosts[techKey] || {});
    var tDef = TECHS[techKey] || TECHS.dtf;
    var timeMin = parseFloat((techBase.timeMin != null ? techBase.timeMin : tDef.timeMin) ?? 3);
    var timeHrs = timeMin / 60;

    var buyPrice = parseFloat((line.buyPrice != null ? line.buyPrice : 0)) || 0;
    var qty = Math.max(1, parseInt((line.qty != null ? line.qty : 1)) || 1);

    var printCost  = parseFloat((line.printCost != null ? line.printCost : techBase.baseCost) ?? (tDef.baseCost != null ? tDef.baseCost : 0)) || 0;
    var energyCost = parseFloat(line.energyCost ?? ((s.energyKwh * s.energyWatts / 1000) * timeHrs)) || 0;
    var laborCost  = (parseFloat((line.laborCost != null ? line.laborCost : s.laborHourly) || 0)) * timeHrs;
    var machCost   = (parseFloat((line.machCost != null ? line.machCost : s.machineHourly) || 0)) * timeHrs;
    var packCost   = parseFloat((line.packCost != null ? line.packCost : s.packPerPiece)) || 0;
    var shipTot    = parseFloat((line.shipCost != null ? line.shipCost : 0)) || 0;

    /* L'avviamento del lavoro: telaio serigrafico, digitalizzazione del ricamo,
       impaginazione del foglio DTF. Si paga una volta, non per pezzo. */
    var setupCost = parseFloat((line.setupCost != null ? line.setupCost : techBase.setupCost) ?? (tDef.setupCost || 0)) || 0;

    var margine = parseFloat((line.margin != null ? line.margin : 40)) || 0;

    /* Lo sconto quantità resta come **scelta commerciale**, non come
       meccanismo di prezzo: il costo scende già da solo. */
    var autoDiscPct = 0;
    var breaks = Object.keys(s.qtyDiscounts).map(Number).sort(function (a, b) { return b - a; });
    for (var i = 0; i < breaks.length; i++) {
      if (qty >= breaks[i]) { autoDiscPct = s.qtyDiscounts[breaks[i]] || 0; break; }
    }
    var lineDiscPct = parseFloat((line.discount != null ? line.discount : 0)) || 0;
    var appliedDisc = Math.max(lineDiscPct, autoDiscPct);

    var breakdown = {
      buyPrice: buyPrice, printCost: printCost, energyCost: energyCost,
      laborCost: laborCost, machCost: machCost, packCost: packCost, shipUnit: shipTot / qty,
      setupPerPiece: setupCost / qty,
    };

    if (!motore) {
      /* Senza il motore non si indovina un prezzo: si dichiara che manca.
         Un preventivo sbagliato è peggio di un preventivo mancante. */
      return {
        costPerPiece: 0, priceUnit: 0, subtotal: 0, totalCost: 0, profit: 0, profitPct: 0,
        autoDiscPct: autoDiscPct, appliedDiscPct: appliedDisc, breakdown: breakdown,
        indisponibile: true, motivo: 'motore di costo non disponibile',
      };
    }

    var c = motore.calcola({
      tecnologia: 'generico',
      qty: qty,
      costiUnaTantum: setupCost > 0 ? [{ id: 'avviamento', label: 'Avviamento del lavoro', value: setupCost }] : [],
      costiPerPezzo: [
        { id: 'capo',      label: 'Capo',        value: buyPrice },
        { id: 'stampa',    label: 'Lavorazione', value: printCost },
        { id: 'energia',   label: 'Energia',     value: energyCost },
        { id: 'manodopera',label: 'Manodopera',  value: laborCost, perdibile: false },
        { id: 'macchina',  label: 'Macchina',    value: machCost },
        { id: 'packaging', label: 'Confezione',  value: packCost, perdibile: false },
        { id: 'spedizione',label: 'Spedizione',  value: shipTot / qty, perdibile: false },
      ],
      failureRate: parseFloat(s.failureRate || 0) || 0,
    });

    var p = motore.prezzo(c.costoPezzo, {
      strategia: 'margine',
      marginePct: margine,
      scontoPct: appliedDisc,
      /* Il pavimento è la difesa che mancava. Configurabile, ma mai assente:
         senza, uno sconto del 32% su un margine del 40% vende in perdita. */
      marginePavimentoPct: parseFloat(s.marginePavimentoPct != null ? s.marginePavimentoPct : 10) || 0,
      ivaPct: 0,
    });

    return {
      costPerPiece: c.costoPezzo,
      priceUnit: p.netto,
      subtotal: p.netto * qty,
      totalCost: c.costoPezzo * qty,
      profit: p.profittoLordo * qty,
      profitPct: p.marginePct,
      markupPct: p.ricaricoPct,
      autoDiscPct: autoDiscPct,
      appliedDiscPct: appliedDisc,
      pavimentoScattato: p.pavimentoScattato,
      inPerdita: p.inPerdita,
      breakdown: breakdown,
      _motore: c,
      _prezzo: p,
    };
  }

  /* Lo sconto globale del preventivo scavalcava il pavimento di margine: le
     righe erano protette una per una, poi una percentuale sul totale le
     riportava sotto costo. Era la stessa falla dello sconto quantità, un piano
     più in alto.

     Ora anche lo sconto di testata passa dal motore, che lo applica al totale
     con il pavimento davanti. Se lo sconto chiesto porterebbe sotto la soglia,
     viene ridotto a quanto è concedibile e il preventivo lo dichiara, invece
     di uscire in perdita senza che nessuno se ne accorga. */
  function calcQuote(q, s) {
    var motore = (typeof window !== 'undefined') && window.InglyCostEngine;
    var lines = q.lines || [];
    var calc = lines.map(function(l){ return Object.assign({},l,{_c:calcLine(l,s)}); });
    var totSub=0, totCost=0;
    calc.forEach(function(l){ totSub+=l._c.subtotal; totCost+=l._c.totalCost; });

    var gDiscChiesto = parseFloat(q.globalDiscount||0)||0;

    if (!motore) {
      /* Nessun prezzo calcolato senza il motore. Applicare lo sconto qui
         significherebbe farlo senza il pavimento di margine — cioè rifare
         esattamente il difetto che la migrazione ha appena chiuso. */
      return { lines:calc, subtotal:totSub, gDiscAmt:0, afterDisc:0, vatAmt:0, grand:0,
               totalCost:totCost, profit:0, profitPct:0,
               scontoChiestoPct:gDiscChiesto, scontoApplicatoPct:0,
               pavimentoScattato:false, inPerdita:false,
               indisponibile:true, motivo:'motore di costo non disponibile' };
    }

    var p = motore.prezzo(totCost, {
      strategia: 'fisso', prezzoFisso: totSub, scontoPct: gDiscChiesto,
      marginePavimentoPct: parseFloat(s.marginePavimentoPct != null ? s.marginePavimentoPct : 10) || 0,
      ivaPct: 0,
    });
    var afterDisc = totSub > 0 ? p.netto : 0;
    var pavimentoScattato = p.pavimentoScattato;
    /* Quanto sconto è stato davvero concesso: il numero che va scritto sul
       preventivo, non quello che era stato digitato. */
    var gDiscApplicato = totSub > 0 ? (1 - afterDisc / totSub) * 100 : 0;

    var totProfit = afterDisc - totCost;
    var vatPct   = parseFloat(q.vatPct!=null?q.vatPct:s.vatPct);
    var vatAmt   = q.vatMode==='included'?0: afterDisc*vatPct/100;
    var grand    = afterDisc+vatAmt;
    return {
      lines:calc, subtotal:totSub, gDiscAmt:totSub-afterDisc, afterDisc,
      vatAmt, grand, totalCost:totCost, profit:totProfit,
      profitPct: afterDisc>0? totProfit/afterDisc*100:0,
      scontoChiestoPct: gDiscChiesto,
      scontoApplicatoPct: gDiscApplicato,
      pavimentoScattato: pavimentoScattato,
      inPerdita: totProfit < 0,
    };
  }

  /* ── Scaglioni ────────────────────────────────────────────────────────────
     La griglia delle quantità c'era già e i conti erano giusti. Quello che
     mancava è che ogni riquadro mostrava **solo il totale**: `×50 → €412`.
     Costo per pezzo, prezzo per pezzo e margine `calcQuote` li calcolava e li
     buttava via.

     E soprattutto non diceva **quale scaglione conviene**, che è la domanda
     vera di chi sta al telefono. Sono tre ordinamenti su numeri già in mano:

       · il costo per pezzo più basso — dove la produzione è più efficiente;
       · il profitto totale più alto — che non è lo stesso scaglione, ed è
         quello che conviene a chi vende;
       · il prezzo per pezzo più basso — quello che conviene al cliente.

     Quando i tre coincidono l'offerta si fa da sé. Quando divergono, è lì che
     si tratta — e saperlo prima è tutto il vantaggio. */
  function scaglioni(q, s) {
    var righe = (q.lines || []);
    if (!righe.length) return { voci: [], migliori: {} };

    var voci = QTY_BREAKS.map(function (qty) {
      var tq = Object.assign({}, q, {
        lines: righe.map(function (l) { return Object.assign({}, l, { qty: qty }); }),
      });
      var r = calcQuote(tq, s);
      /* I pezzi totali non sono la quantità: sono la quantità per ogni riga.
         Dividere per `qty` darebbe il prezzo di una riga, non di un pezzo. */
      var pezzi = qty * righe.length;
      return {
        qty: qty,
        pezzi: pezzi,
        indisponibile: !!r.indisponibile,
        costoPezzo: pezzi > 0 ? r.totalCost / pezzi : 0,
        prezzoPezzo: pezzi > 0 ? r.afterDisc / pezzi : 0,
        totale: r.grand,
        netto: r.afterDisc,
        profitto: r.profit,
        marginePct: r.profitPct,
        scontoPct: s.qtyDiscounts[qty] || 0,
        pavimentoScattato: !!r.pavimentoScattato,
        inPerdita: !!r.inPerdita,
      };
    });

    var validi = voci.filter(function (v) { return !v.indisponibile && v.prezzoPezzo > 0; });
    var minimo = function (campo) {
      return validi.slice().sort(function (a, b) { return a[campo] - b[campo]; })[0];
    };
    var massimo = function (campo) {
      return validi.slice().sort(function (a, b) { return b[campo] - a[campo]; })[0];
    };
    var migliori = validi.length ? {
      unitario: minimo('costoPezzo').qty,
      profitto: massimo('profitto').qty,
      cliente: minimo('prezzoPezzo').qty,
    } : {};

    return { voci: voci, migliori: migliori };
  }

  /* ── Consuntivo ───────────────────────────────────────────────────────────
     Sul tessile lo scarto reale — capi bruciati, stampe storte, taglie
     sbagliate — è la voce che mangia il margine, ed era l'unica che nessuno
     misurava: il preventivatore diceva quanto *dovrebbe* costare e nessuno
     tornava mai a dire quanto è costato.

     Il registro è quello condiviso (`InglyConsuntivo`), non uno nuovo: le
     commesse tessili e quelle 3D si leggono insieme, che è il punto — un
     laboratorio vuole sapere su quale delle due sfora.

     Il confronto lo fa `InglyScostamento`, che è già il proprietario di quella
     matematica. Qui si raccoglie e si mostra. */
  var MODULO = 'apparel';

  function registroConsuntivi() {
    return (typeof window !== 'undefined') && window.InglyConsuntivo;
  }

  /** Il preventivato di un preventivo, nella forma che InglyScostamento vuole. */
  function previstoDi(q, s) {
    var r = calcQuote(q, s);
    var pezzi = (q.lines || []).reduce(function (a, l) {
      return a + Math.max(1, parseInt(l.qty, 10) || 1);
    }, 0);
    return {
      costo: pezzi > 0 ? r.totalCost / pezzi : 0,
      prezzo: pezzi > 0 ? r.afterDisc / pezzi : 0,
      quantita: Math.max(1, pezzi),
      costoTotale: r.totalCost,
      ricavoTotale: r.afterDisc,
    };
  }

  /** Preventivato contro reale per un preventivo. Senza consuntivo registrato
      dichiara che manca, invece di dare per buono uno scostamento nullo. */
  function scostamentoDi(q, s) {
    var S = (typeof window !== 'undefined') && window.InglyScostamento;
    var R = registroConsuntivi();
    if (!S) return { disponibile: false, motivo: 'modulo di confronto non caricato' };

    var prev = previstoDi(q, s);
    var reale = R ? R.leggi(MODULO, q.id) : {};
    var voci = ['capi', 'stampa', 'manodopera', 'extra'];
    var haCosto = voci.some(function (v) { return reale[v] != null && reale[v] !== ''; });

    if (!haCosto) return S.confronta(prev, {});

    /* Il costo reale è la somma delle voci compilate: chi ne compila due su
       quattro ottiene il confronto sulle due, non un buco. */
    var costoTot = voci.reduce(function (a, v) {
      var n = parseFloat(reale[v]);
      return a + (isFinite(n) ? n : 0);
    }, 0);

    var ricavoReale = (reale.incassato != null && reale.incassato !== '')
      ? parseFloat(reale.incassato) : null;

    return S.confronta(prev, {
      costo: costoTot / prev.quantita,
      prezzo: ricavoReale != null ? ricavoReale / prev.quantita : undefined,
      quantita: prev.quantita,
    });
  }

  function setConsuntivo(id, campo, valore) {
    var R = registroConsuntivi();
    if (!R) return;
    var d = {};
    d[campo] = (valore === '' || valore == null) ? null : (parseFloat(valore) || 0);
    R.salva(MODULO, id, d);
    render();
  }

  // ── Render router ────────────────────────────────────────────────────────
  function render() {
    var el=document.getElementById('view-apparel');
    if(!el)return;
    // Do NOT set inline display — let section-view CSS handle visibility
    if(_view==='dashboard')  _renderDash(el);
    else if(_view==='editor') _renderEditor(el);
    else if(_view==='products')_renderProducts(el);
    else if(_view==='stock')   _renderStock(el);
    else if(_view==='settings')_renderSettings(el);
  }

  // ── DASHBOARD ────────────────────────────────────────────────────────────
  function _renderDash(el){
    var quotes=loadQ(), s=loadS(), prods=loadP(), stock=loadSt();
    var totVal=0,totProfit=0,confirmed=0,lowStock=0;
    quotes.forEach(function(q){ var r=calcQuote(q,s); totVal+=r.grand; totProfit+=r.profit; if(['confermato','produzione','consegnato'].indexOf(q.status)>=0)confirmed++; });
    prods.forEach(function(p){ var st=stock[p.id]; if(st&&st.qty<=( st.minStock||3))lowStock++; });

    var H='<div style="padding:16px 20px;max-width:1400px;margin:0 auto">';

    // HEADER
    H+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:18px">';
    H+='<div style="display:flex;align-items:center;gap:13px">';
    H+='<div style="width:48px;height:48px;background:linear-gradient(135deg,#ec4899,#db2777);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 18px rgba(236,72,153,.3)">👕</div>';
    H+='<div><h1 style="font-size:20px;font-weight:900;margin:0;color:var(--text)">Smart Quote Apparel</h1><p style="font-size:11px;color:var(--text-muted);margin:2px 0 0">DTF · Sublimazione · Pressa · Transfer · Vinile · Ricamo</p></div></div>';
    H+='<div style="display:flex;gap:7px;flex-wrap:wrap">';
    H+='<button onclick="ApparelQuoter.newQuote()" style="padding:9px 18px;background:linear-gradient(135deg,#ec4899,#db2777);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">+ Nuovo Preventivo</button>';
    H+='<button onclick="ApparelQuoter.goProducts()" style="padding:8px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:12px;color:var(--text-muted)">📦 Catalogo</button>';
    H+='<button onclick="ApparelQuoter.goStock()" style="padding:8px 14px;background:'+(lowStock?'rgba(239,68,68,.08)':'var(--bg-card2)')+';border:1px solid '+(lowStock?'rgba(239,68,68,.3)':'var(--border)')+';border-radius:10px;cursor:pointer;font-size:12px;color:'+(lowStock?'#ef4444':'var(--text-muted)')+'">📊 Stock'+(lowStock?' ⚠️'+lowStock:'')+'</button>';
    H+='<button onclick="ApparelQuoter.goSettings()" style="padding:8px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:12px;color:var(--text-muted)">⚙️ Costi</button>';
    H+='<button onclick="ApparelQuoter.exportCSV()" style="padding:8px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:12px;color:var(--text-muted)">📊 Export</button>';
    H+='</div></div>';

    // KPIs
    H+='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:18px">';
    [
      {ico:'📋',l:'Preventivi',    v:quotes.length, c:'#ec4899'},
      {ico:'✅',l:'Confermati',    v:confirmed,     c:'#10b981'},
      {ico:'📦',l:'Prodotti',      v:prods.length,  c:'#6366f1'},
      {ico:'💶',l:'Valore totale', v:'€'+Math.round(totVal), c:'#fbbf24'},
      {ico:'📈',l:'Profitto stim.',v:'€'+Math.round(totProfit), c:'#818cf8'},
    ].forEach(function(k){
      H+='<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px">';
      H+='<span style="font-size:20px">'+k.ico+'</span>';
      H+='<div><div style="font-size:18px;font-weight:900;color:'+k.c+'">'+k.v+'</div><div style="font-size:10px;color:var(--text-muted)">'+k.l+'</div></div></div>';
    });
    H+='</div>';

    if(!quotes.length){
      H+='<div style="text-align:center;padding:60px;background:var(--bg-card2);border-radius:14px;border:2px dashed var(--border)">';
      H+='<div style="font-size:64px;margin-bottom:14px;opacity:.2">👕</div>';
      H+='<div style="font-size:17px;font-weight:800;margin-bottom:7px">Nessun preventivo apparel</div>';
      H+='<div style="font-size:13px;color:var(--text-muted);margin-bottom:20px">Crea preventivi professionali per stampa su abbigliamento</div>';
      H+='<button onclick="ApparelQuoter.newQuote()" style="padding:11px 26px;background:linear-gradient(135deg,#ec4899,#db2777);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">+ Crea primo preventivo</button>';
      H+='</div>';
    } else {
      // Quotes table
      H+='<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;overflow:hidden">';
      H+='<div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">';
      H+='<span style="font-size:12px;font-weight:800;color:var(--text)">Preventivi</span>';
      H+='<span style="background:var(--bg-card);padding:2px 9px;border-radius:99px;font-size:10px;color:var(--text-muted)">'+quotes.length+'</span></div>';
      // Table header
      H+='<div style="display:grid;grid-template-columns:1fr 1fr 100px 100px 90px 90px 80px;gap:0;padding:7px 16px;background:var(--bg-card);font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">';
      ['Cliente','Lavoro','Data','Tecnica','Totale','Margine','Stato'].forEach(function(h){H+='<div>'+h+'</div>';});
      H+='</div>';
      var sorted=quotes.slice().sort(function(a,b){return new Date(b.date||0)-new Date(a.date||0);});
      sorted.forEach(function(q){
        var r=calcQuote(q,s);
        var st=STATUSES.find(function(s){return s.id===q.status;})||STATUSES[0];
        var techs=[...new Set((q.lines||[]).map(function(l){return l.tech;}))].slice(0,2).map(function(k){return TECHS[k]?TECHS[k].icon:'';}).join('');
        var pc=r.profitPct>=30?'#22c55e':r.profitPct>=15?'#f59e0b':'#ef4444';
        H+='<div style="display:grid;grid-template-columns:1fr 1fr 100px 100px 90px 90px 80px;gap:0;padding:10px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:.1s;align-items:center" onmouseover="this.style.background=\'var(--bg-card)\'" onmouseout="this.style.background=\'\'" onclick="ApparelQuoter.editQuote(\''+q.id+'\')">';
        H+='<div style="font-size:13px;font-weight:700;color:var(--text)">'+(q.clientName||'—')+'</div>';
        H+='<div style="font-size:12px;color:var(--text-muted)">'+(q.jobName||'Preventivo')+'</div>';
        H+='<div style="font-size:11px;color:var(--text-dim)">'+(q.date||'—')+'</div>';
        H+='<div style="font-size:14px">'+techs+'</div>';
        H+='<div style="font-size:13px;font-weight:800;color:var(--text)">€'+r.grand.toFixed(2)+'</div>';
        H+='<div style="font-size:11px;font-weight:700;color:'+pc+'">'+r.profitPct.toFixed(1)+'%</div>';
        H+='<div style="display:flex;gap:5px;align-items:center">';
        H+='<span style="padding:3px 9px;background:'+st.bg+';color:'+st.color+';border-radius:99px;font-size:10px;font-weight:700">'+st.label+'</span>';
        H+='<button onclick="event.stopPropagation();ApparelQuoter.dupQ(\''+q.id+'\')" style="padding:3px 6px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;cursor:pointer;font-size:10px;color:var(--text-dim)" title="Duplica">⧉</button>';
        H+='<button onclick="event.stopPropagation();ApparelQuoter.delQ(\''+q.id+'\')" style="padding:3px 6px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:6px;cursor:pointer;font-size:10px;color:#ef4444" title="Elimina">🗑</button>';
        H+='</div></div>';
      });
      H+='</div>';
    }
    H+='</div>';
    el.innerHTML=H;
  }

  // ── EDITOR ────────────────────────────────────────────────────────────────
  function _renderEditor(el){
    var s=loadS(), quotes=loadQ();
    var q=quotes.find(function(x){return x.id===_editId;});
    if(!q){_view='dashboard';return _renderDash(el);}
    var calc=calcQuote(q,s);

    var H='<div style="display:flex;height:100%;min-height:calc(100vh - 60px)">';

    // ── LEFT PANEL ──────────────────────────────────────────────────────────
    H+='<div style="flex:1;overflow-y:auto;padding:16px 18px;min-width:0">';

    // Top bar
    H+='<div style="display:flex;align-items:center;gap:9px;margin-bottom:15px;flex-wrap:wrap">';
    H+='<button onclick="ApparelQuoter.goBack()" style="padding:7px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)">← Dashboard</button>';
    H+='<span style="font-size:13px;font-weight:800;color:var(--text)">'+q.number+'</span>';
    H+='<input value="'+(q.jobName||'').replace(/"/g,'&quot;')+'" oninput="ApparelQuoter.sf(\'jobName\',this.value)" placeholder="Titolo lavoro..." style="flex:1;min-width:150px;padding:7px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;font-weight:700;outline:none">';
    H+='<select onchange="ApparelQuoter.sf(\'status\',this.value)" style="padding:7px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;cursor:pointer">';
    STATUSES.forEach(function(st){H+='<option value="'+st.id+'"'+(q.status===st.id?' selected':'')+'>'+st.label+'</option>';});
    H+='</select>';
    H+='<button onclick="ApparelQuoter.genPDF()" style="padding:8px 16px;background:linear-gradient(135deg,#ec4899,#db2777);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:800">📄 PDF</button>';
    H+='</div>';

    // Client info
    H+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:9px;margin-bottom:15px">';
    H+=_ff('Cliente','aq-client',q.clientName,'Mario Rossi...','ApparelQuoter.sf(\'clientName\',this.value)');
    H+=_ff('Email','aq-email',q.clientEmail,'email@...','ApparelQuoter.sf(\'clientEmail\',this.value)','email');
    H+=_ff('Telefono','aq-phone',q.clientPhone,'...','ApparelQuoter.sf(\'clientPhone\',this.value)','tel');
    H+=_ff('Data','aq-date',q.date||new Date().toISOString().slice(0,10),'','ApparelQuoter.sf(\'date\',this.value)','date');
    H+='</div>';

    // Lines header
    H+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:9px">';
    H+='<span style="font-size:13px;font-weight:800;color:var(--text)">📦 Righe preventivo <span style="font-size:11px;color:var(--text-muted);font-weight:500">'+(q.lines||[]).length+' articoli</span></span>';
    H+='<div style="display:flex;gap:7px">';
    H+='<button onclick="ApparelQuoter.addFromCatalog()" style="padding:6px 13px;background:rgba(99,102,241,.12);color:#818cf8;border:1.5px solid rgba(99,102,241,.3);border-radius:8px;cursor:pointer;font-size:12px;font-weight:700">📦 Da catalogo</button>';
    H+='<button onclick="ApparelQuoter.addLine()" style="padding:6px 14px;background:linear-gradient(135deg,#ec4899,#db2777);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:800">+ Riga</button>';
    H+='</div></div>';

    if(!(q.lines||[]).length){
      H+='<div style="text-align:center;padding:28px;background:var(--bg-card2);border-radius:12px;border:2px dashed var(--border);margin-bottom:14px">';
      H+='<div style="font-size:36px;margin-bottom:8px;opacity:.3">👕</div>';
      H+='<div style="font-size:13px;color:var(--text-muted);margin-bottom:10px">Nessun articolo aggiunto</div>';
      H+='<div style="display:flex;gap:8px;justify-content:center">';
      H+='<button onclick="ApparelQuoter.addLine()" style="padding:8px 16px;background:linear-gradient(135deg,#ec4899,#db2777);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:800">+ Aggiungi riga</button>';
      H+='<button onclick="ApparelQuoter.addFromCatalog()" style="padding:8px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)">📦 Da catalogo</button>';
      H+='</div></div>';
    } else {
      calc.lines.forEach(function(line,idx){ H+=_renderLine(line,idx,s); });
    }

    // Notes + deadline
    H+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">';
    H+='<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Note al cliente</label>';
    H+='<textarea oninput="ApparelQuoter.sf(\'notes\',this.value)" rows="3" placeholder="Tempi consegna, condizioni pagamento, specifiche stampa..." style="width:100%;padding:9px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;resize:vertical;box-sizing:border-box;font-family:inherit;outline:none">'+(q.notes||'')+'</textarea></div>';
    H+=_ff('Consegna entro','aq-deadline',q.deadline,'','ApparelQuoter.sf(\'deadline\',this.value)','date');
    H+='</div>';
    H+='</div>'; // end left

    // ── RIGHT SIDEBAR ───────────────────────────────────────────────────────
    H+=_renderSidebar(q,calc,s);
    H+='</div>';
    el.innerHTML=H;
  }

  function _renderLine(line, idx, s){
    var r=line._c||{};
    var techObj=TECHS[line.tech]||TECHS.dtf;
    var isLoss=(r.profitPct||0)<0;
    var profColor=(r.profitPct||0)>=30?'#22c55e':(r.profitPct||0)>=15?'#f59e0b':'#ef4444';
    var expId='aq-exp-'+idx;

    var H='<div style="background:var(--bg-card2);border:1.5px solid '+(isLoss?'rgba(239,68,68,.4)':'var(--border)')+';border-radius:12px;margin-bottom:10px;overflow:hidden">';

    // Line header
    H+='<div style="display:flex;align-items:center;gap:9px;padding:9px 13px;border-bottom:1px solid var(--border);background:'+(isLoss?'rgba(239,68,68,.04)':'transparent')+'">';
    H+='<div style="width:28px;height:28px;border-radius:8px;background:'+techObj.color+'20;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">'+techObj.icon+'</div>';
    H+='<input value="'+(line.productName||'').replace(/"/g,'&quot;')+'" oninput="ApparelQuoter.sl('+idx+',\'productName\',this.value)" placeholder="Nome articolo / descrizione..." style="flex:1;padding:5px 9px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:13px;font-weight:700;outline:none">';
    // Tech selector
    H+='<select onchange="ApparelQuoter.sl('+idx+',\'tech\',this.value)" style="padding:5px 8px;background:'+techObj.color+'18;border:1px solid '+techObj.color+'40;border-radius:7px;color:'+techObj.color+';font-size:11px;font-weight:700;cursor:pointer">';
    Object.keys(TECHS).forEach(function(k){ var t=TECHS[k]; H+='<option value="'+k+'"'+(line.tech===k?' selected':'')+' style="background:var(--bg-card);color:var(--text)">'+t.icon+' '+t.label+'</option>'; });
    H+='</select>';
    H+='<span style="padding:3px 8px;background:'+(isLoss?'rgba(239,68,68,.1)':profColor+'15')+';color:'+(isLoss?'#ef4444':profColor)+';border-radius:6px;font-size:10px;font-weight:800">'+(isLoss?'⚠️ PERDITA':'▲ '+(r.profitPct||0).toFixed(0)+'%')+'</span>';
    H+='<button onclick="ApparelQuoter.rl('+idx+')" style="padding:4px 8px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:7px;cursor:pointer;font-size:11px;color:#ef4444;flex-shrink:0">✕</button>';
    H+='</div>';

    // Main fields
    H+='<div style="display:grid;grid-template-columns:80px 90px 80px 80px 80px 80px 80px 1fr;gap:8px;padding:11px 13px">';
    H+=_lf('Quantità',idx,'qty',line.qty||1,'number','min="1"');
    H+=_lf('Taglia','',idx,'sizeColor',line.sizeColor||'','text','placeholder="M/Bianco"',true);
    H+=_lf('Acquisto €',idx,'buyPrice',parseFloat(line.buyPrice||0).toFixed(2),'number','step="0.01" min="0"');
    H+=_lf('Stampa €',idx,'printCost',parseFloat(line.printCost!=null?line.printCost:techObj.baseCost||0).toFixed(2),'number','step="0.01"');
    H+=_lf('Margine %',idx,'margin',(line.margin!=null?line.margin:40),'number','step="1" min="0" max="500"');
    H+=_lf('Sconto %',idx,'discount',line.discount||0,'number','step="1" min="0" max="100"');
    H+=_lf('Spediz. €',idx,'shipCost',parseFloat(line.shipCost||0).toFixed(2),'number','step="0.01"');
    H+='<div></div>';
    H+='</div>';

    // Expand costi avanzati
    H+='<div style="padding:0 13px 9px">';
    H+='<button onclick="var e=document.getElementById(\''+expId+'\');e.style.display=e.style.display===\'none\'?\'\':\'none\'" style="font-size:10px;color:var(--text-muted);background:none;border:none;cursor:pointer;padding:0;display:flex;align-items:center;gap:4px"><span>⚙️</span> Costi avanzati (energia, lavoro, macchina, imballaggio) — clicca per modificare</button>';
    H+='<div id="'+expId+'" style="display:none;margin-top:9px">';
    H+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">';
    var tc=TECHS[line.tech]||TECHS.dtf, timeHrs=(tc.timeMin||3)/60;
    H+=_lf('Energia €/pz',idx,'energyCost',parseFloat(line.energyCost!=null?line.energyCost:(s.energyKwh*s.energyWatts/1000*timeHrs)).toFixed(2),'number','step="0.001"');
    H+=_lf('Lavoro €/pz',idx,'laborCost',parseFloat(line.laborCost!=null?line.laborCost:s.laborHourly*timeHrs).toFixed(2),'number','step="0.001"');
    H+=_lf('Macchina €/pz',idx,'machCost',parseFloat(line.machCost!=null?line.machCost:s.machineHourly*timeHrs).toFixed(2),'number','step="0.001"');
    H+=_lf('Imballag. €/pz',idx,'packCost',parseFloat(line.packCost!=null?line.packCost:s.packPerPiece).toFixed(2),'number','step="0.01"');
    H+='</div></div></div>';

    // Line footer — cost breakdown
    var bd=r.breakdown||{};
    H+='<div style="background:var(--bg-card);border-top:1px solid var(--border);padding:9px 13px;display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:11px">';
    H+='<span style="color:var(--text-muted)">Costo/pz: <strong style="color:var(--text)">€'+(r.costPerPiece||0).toFixed(2)+'</strong></span>';
    H+='<span style="color:var(--text-muted)">Prezzo/pz: <strong style="color:var(--text)">€'+(r.priceUnit||0).toFixed(2)+'</strong></span>';
    if((r.autoDiscPct||0)>0) H+='<span style="background:rgba(34,197,94,.1);color:#22c55e;padding:2px 7px;border-radius:99px;font-size:10px;font-weight:700">Sc.qty: '+r.autoDiscPct.toFixed(0)+'%</span>';
    H+='<span style="color:var(--text-muted)">Breakdown: capo €'+(bd.buyPrice||0).toFixed(2)+' + stampa €'+(bd.printCost||0).toFixed(2)+' + en.€'+(bd.energyCost||0).toFixed(2)+' + lav.€'+(bd.laborCost||0).toFixed(2)+' + mach.€'+(bd.machCost||0).toFixed(2)+' + imb.€'+(bd.packCost||0).toFixed(2)+'</span>';
    H+='<span style="margin-left:auto;color:'+profColor+';font-weight:700">Profitto riga: €'+(r.profit||0).toFixed(2)+'</span>';
    H+='<span style="font-size:14px;font-weight:900;color:var(--text)">TOT: €'+(r.subtotal||0).toFixed(2)+'</span>';
    H+='</div>';

    H+='</div>';
    return H;
  }

  function _renderSidebar(q,calc,s){
    var pc=calc.profitPct>=30?'#22c55e':calc.profitPct>=15?'#f59e0b':'#ef4444';
    var H='<div style="width:290px;flex-shrink:0;border-left:1px solid var(--border);padding:14px;overflow-y:auto;background:var(--bg-card2);display:flex;flex-direction:column;gap:12px">';

    // QTY QUICK CALC
    /* Il riquadro mostrava il solo totale. Costo/pz, prezzo/pz e margine erano
       già calcolati e scartati; ora si vedono, e si vede quale scaglione
       conviene — che è la domanda di chi sta trattando al telefono. */
    var SC = scaglioni(q, s);
    var qtyCorrente = ((q.lines||[])[0]||{}).qty;
    H+='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:11px;padding:12px">';
    H+='<div style="font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;margin-bottom:9px;letter-spacing:.5px">⚡ Quanti ne fa</div>';
    if(!SC.voci.length){
      H+='<div style="font-size:11px;color:var(--text-dim)">Aggiungi una riga per vedere i prezzi a quantità.</div>';
    } else {
      H+='<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:10px">';
      H+='<thead><tr style="border-bottom:1px solid var(--border)">'
        +['Qtà','Costo/pz','Prezzo/pz','Totale','Marg.'].map(function(h,i){
          return '<th style="padding:4px 3px;font-size:8px;text-transform:uppercase;color:var(--text-dim);font-weight:700;text-align:'+(i?'right':'left')+'">'+h+'</th>';
        }).join('')+'</tr></thead><tbody>';
      SC.voci.forEach(function(v){
        var note=[];
        if(SC.migliori.unitario===v.qty) note.push(['costo/pz più basso','#22c55e']);
        if(SC.migliori.profitto===v.qty) note.push(['profitto più alto','#fbbf24']);
        if(SC.migliori.cliente===v.qty)  note.push(['migliore per il cliente','#38bdf8']);
        var attiva = qtyCorrente===v.qty;
        var mc = v.marginePct>=30?'#22c55e':v.marginePct>=15?'#f59e0b':'#ef4444';
        H+='<tr onclick="ApparelQuoter.setQty('+v.qty+')" title="Applica questa quantità a tutte le righe"'
          +' style="border-bottom:1px solid var(--border);cursor:pointer;'+(attiva?'background:#ec489915;':'')+'"'
          +' onmouseover="this.style.background=\'var(--bg-card2)\'"'
          +' onmouseout="this.style.background=\''+(attiva?'#ec489915':'')+'\'">';
        H+='<td style="padding:5px 3px;font-weight:800;color:var(--text)">×'+v.qty
          +note.map(function(n){return '<div style="font-size:7px;font-weight:700;color:'+n[1]+'">'+n[0]+'</div>';}).join('')
          +(v.scontoPct?'<div style="font-size:7px;color:#22c55e">-'+v.scontoPct+'%</div>':'')
          +'</td>';
        H+='<td style="padding:5px 3px;text-align:right;color:var(--text-muted)">€'+v.costoPezzo.toFixed(2)+'</td>';
        H+='<td style="padding:5px 3px;text-align:right;font-weight:700;color:var(--text)">€'+v.prezzoPezzo.toFixed(2)+'</td>';
        H+='<td style="padding:5px 3px;text-align:right;color:var(--text-muted)">€'+v.totale.toFixed(0)+'</td>';
        H+='<td style="padding:5px 3px;text-align:right;font-weight:700;color:'+mc+'">'+v.marginePct.toFixed(0)+'%'
          +(v.pavimentoScattato?'<div style="font-size:7px;color:#f59e0b">pavimento</div>':'')
          +'</td>';
        H+='</tr>';
      });
      H+='</tbody></table></div>';
      /* Quando i tre scaglioni migliori coincidono non c'è niente da decidere,
         e dirlo vale più di tre etichette identiche. */
      var m=SC.migliori;
      if(m.unitario!=null && m.unitario===m.profitto && m.profitto===m.cliente){
        H+='<div style="margin-top:7px;font-size:9px;color:#22c55e">×'+m.unitario+' conviene su tutti i fronti: costo, profitto e prezzo al cliente.</div>';
      } else if(m.profitto!=null && m.cliente!=null && m.profitto!==m.cliente){
        H+='<div style="margin-top:7px;font-size:9px;color:var(--text-dim)">Il cliente preferisce ×'+m.cliente+', a te rende di più ×'+m.profitto+'. È qui che si tratta.</div>';
      }
    }
    H+='</div>';

    // TOTALS
    H+='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:11px;overflow:hidden">';
    H+='<div style="padding:9px 13px;background:linear-gradient(135deg,#ec489910,#db277710);border-bottom:1px solid var(--border);font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase">💰 Riepilogo</div>';
    function tr(l,v,bold,col){
      return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 13px;border-bottom:1px solid var(--border)">'
        +'<span style="font-size:'+(bold?'12':'11')+'px;font-weight:'+(bold?700:400)+';color:'+(col||'var(--text-muted)')+'">'+l+'</span>'
        +'<span style="font-size:'+(bold?'15':'12')+'px;font-weight:'+(bold?800:500)+';color:'+(col||'var(--text)')+'">'+v+'</span></div>';
    }
    H+=tr('Subtotale','€'+calc.subtotal.toFixed(2));
    if(calc.gDiscAmt>0) H+=tr('Sconto globale','-€'+calc.gDiscAmt.toFixed(2),false,'#22c55e');
    if(q.vatMode!=='included') H+=tr('IVA '+((q.vatPct!=null?q.vatPct:s.vatPct))+'%','€'+calc.vatAmt.toFixed(2));
    H+='<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 13px;background:linear-gradient(135deg,#ec489920,#db277720)">';
    H+='<span style="font-size:13px;font-weight:700;color:var(--text)">TOTALE</span>';
    H+='<span style="font-size:19px;font-weight:900;color:#ec4899">€'+calc.grand.toFixed(2)+'</span></div>';
    H+='</div>';

    // PROFITABILITY
    H+='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:11px;overflow:hidden">';
    H+='<div style="padding:9px 13px;border-bottom:1px solid var(--border);font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase">📈 Redditività</div>';
    H+=tr('Costo produzione','€'+calc.totalCost.toFixed(2));
    H+=tr('Profitto lordo','€'+calc.profit.toFixed(2),true,pc);
    H+=tr('Margine %',calc.profitPct.toFixed(1)+'%',true,pc);
    // Progress bar
    H+='<div style="padding:6px 13px 10px">';
    var w=Math.min(100,Math.max(0,calc.profitPct));
    H+='<div style="background:var(--bg-card2);border-radius:99px;height:6px;overflow:hidden">';
    H+='<div style="width:'+w+'%;height:100%;background:'+pc+';border-radius:99px;transition:.4s"></div></div></div>';
    H+='</div>';

    // CONSUNTIVO
    /* Il preventivo dice quanto dovrebbe costare. Finché nessuno torna a dire
       quanto è costato, il laboratorio resta convinto di guadagnare quello che
       aveva previsto — che sul tessile, dove lo scarto è la voce grossa, è
       raramente vero. */
    var sc = scostamentoDi(q, s);
    var prevQ = previstoDi(q, s);
    var realeQ = registroConsuntivi() ? registroConsuntivi().leggi(MODULO, q.id) : {};
    H+='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:11px;overflow:hidden">';
    H+='<div style="padding:9px 13px;border-bottom:1px solid var(--border);font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase">📋 Consuntivo — com\'è andata</div>';
    H+='<div style="padding:9px 13px">';
    if(!registroConsuntivi()){
      H+='<div style="font-size:10px;color:var(--text-dim)">Registro dei consuntivi non caricato.</div>';
    } else {
      [
        {id:'capi',       lab:'Capi',       prev:prevQ.costoTotale},
        {id:'stampa',     lab:'Lavorazione',prev:null},
        {id:'manodopera', lab:'Manodopera', prev:null},
        {id:'extra',      lab:'Extra e scarti', prev:null},
        {id:'incassato',  lab:'Incassato',  prev:prevQ.ricavoTotale},
      ].forEach(function(v){
        var val = realeQ[v.id];
        H+='<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">'
          +'<span style="flex:1;font-size:10px;color:var(--text-muted)">'+v.lab+'</span>'
          +(v.prev!=null?'<span style="font-size:9px;color:var(--text-dim);width:66px;text-align:right">prev. €'+v.prev.toFixed(2)+'</span>':'<span style="width:66px"></span>')
          +'<input type="number" step="0.01" min="0" placeholder="reale" value="'+(val==null?'':val)+'"'
          +' oninput="ApparelQuoter.setConsuntivo('+JSON.stringify(q.id)+',\''+v.id+'\',this.value)"'
          +' style="width:76px;padding:4px 6px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px;text-align:right;outline:none">'
          +'</div>';
      });
      if(!sc.disponibile){
        H+='<div style="margin-top:7px;font-size:9px;color:var(--text-dim)">'+(sc.cosaFare||sc.motivo||'')+'</div>';
      } else {
        var col = sc.verdetto.colore==='rosso'?'#ef4444':sc.verdetto.colore==='arancione'?'#f59e0b':'#22c55e';
        var seg = sc.scostamento.costo>=0?'+':'';
        H+='<div style="margin-top:9px;padding-top:8px;border-top:1px solid var(--border)">';
        H+='<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px">'
          +'<span style="color:var(--text-muted)">Costo reale</span>'
          +'<span style="font-weight:700;color:'+col+'">€'+sc.reale.costo.toFixed(2)+' ('+seg+'€'+sc.scostamento.costo.toFixed(2)+')</span></div>';
        H+='<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px">'
          +'<span style="color:var(--text-muted)">Profitto reale</span>'
          +'<span style="font-weight:700;color:'+col+'">€'+sc.reale.profitto.toFixed(2)+'</span></div>';
        if(sc.reale.margine!=null){
          H+='<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:5px">'
            +'<span style="color:var(--text-muted)">Margine reale</span>'
            +'<span style="font-weight:700;color:'+col+'">'+sc.reale.margine.toFixed(1)+'%</span></div>';
        }
        H+='<div style="font-size:9px;font-weight:700;color:'+col+'">'+sc.verdetto.label+'</div>';
        H+='</div>';
      }
    }
    H+='</div></div>';

    // IVA + Discount
    H+='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:11px;padding:12px">';
    H+='<div style="font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;margin-bottom:9px">IVA &amp; Sconti</div>';
    H+='<div style="display:flex;gap:10px;margin-bottom:8px">';
    H+='<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:12px;color:var(--text-muted)"><input type="radio" name="aq-vat" value="excluded" '+(q.vatMode!=='included'?'checked':'')+' onchange="ApparelQuoter.sf(\'vatMode\',\'excluded\')"> IVA esclusa</label>';
    H+='<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:12px;color:var(--text-muted)"><input type="radio" name="aq-vat" value="included" '+(q.vatMode==='included'?'checked':'')+' onchange="ApparelQuoter.sf(\'vatMode\',\'included\')"> IVA inclusa</label>';
    H+='</div>';
    H+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">';
    H+=_sf2('IVA %','aq-vat-pct',(q.vatPct!=null?q.vatPct:s.vatPct),'22','ApparelQuoter.sf(\'vatPct\',+this.value)');
    H+=_sf2('Sconto glob.%','aq-gdisc',q.globalDiscount||0,'0','ApparelQuoter.sf(\'globalDiscount\',+this.value)','0','100');
    H+='</div></div>';

    // Actions
    H+='<button onclick="ApparelQuoter.genPDF()" style="width:100%;padding:10px;background:linear-gradient(135deg,#ec4899,#db2777);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px">📄 Genera PDF</button>';
    H+='</div>';
    return H;
  }

  // ── PRODUCTS ──────────────────────────────────────────────────────────────
  function _renderProducts(el){
    var prods=loadP(), stock=loadSt();
    var catFilter=_prodFilter.cat||'', search=(_prodFilter.search||'').toLowerCase();
    var filtered=prods.filter(function(p){
      var matchCat=!catFilter||p.category===catFilter;
      var matchSearch=!search||(p.name||'').toLowerCase().includes(search)||(p.brand||'').toLowerCase().includes(search)||(p.sku||'').toLowerCase().includes(search);
      return matchCat&&matchSearch;
    });

    var H='<div style="padding:16px 20px;max-width:1400px;margin:0 auto">';
    H+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">';
    H+='<button onclick="ApparelQuoter.goBack()" style="padding:7px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)">← Indietro</button>';
    H+='<h2 style="font-size:18px;font-weight:900;color:var(--text);margin:0">📦 Catalogo Prodotti</h2>';
    H+='<input value="'+(search||'')+'" oninput="ApparelQuoter._setProdFilter(\'search\',this.value)" placeholder="🔍 Cerca prodotto, brand, SKU..." style="flex:1;min-width:180px;padding:7px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;outline:none">';
    H+='<select onchange="ApparelQuoter._setProdFilter(\'cat\',this.value)" style="padding:7px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;cursor:pointer">';
    H+='<option value="">Tutte categorie</option>';
    PROD_CATS.forEach(function(c){ H+='<option value="'+c.id+'"'+(catFilter===c.id?' selected':'')+'>'+c.icon+' '+c.label+'</option>'; });
    H+='</select>';
    H+='<button onclick="ApparelQuoter.openProdModal(null)" style="padding:8px 16px;background:linear-gradient(135deg,#ec4899,#db2777);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:800">+ Nuovo prodotto</button>';
    H+='</div>';

    // Category pills
    H+='<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px">';
    H+='<button onclick="ApparelQuoter._setProdFilter(\'cat\',\'\')" style="padding:5px 13px;background:'+(!catFilter?'rgba(236,72,153,.15)':'var(--bg-card2)')+';border:1.5px solid '+(!catFilter?'#ec4899':'var(--border)')+';border-radius:99px;cursor:pointer;font-size:12px;color:'+(!catFilter?'#ec4899':'var(--text-muted)')+';font-weight:'+(!catFilter?700:400)+'">Tutti</button>';
    PROD_CATS.forEach(function(c){
      var isA=catFilter===c.id;
      H+='<button onclick="ApparelQuoter._setProdFilter(\'cat\',\''+c.id+'\')" style="padding:5px 13px;background:'+(isA?'rgba(236,72,153,.15)':'var(--bg-card2)')+';border:1.5px solid '+(isA?'#ec4899':'var(--border)')+';border-radius:99px;cursor:pointer;font-size:12px;color:'+(isA?'#ec4899':'var(--text-muted)')+';font-weight:'+(isA?700:400)+'">'+c.icon+' '+c.label+'</button>';
    });
    H+='</div>';

    if(!filtered.length){
      H+='<div style="text-align:center;padding:50px;background:var(--bg-card2);border-radius:14px;border:2px dashed var(--border)">';
      H+='<div style="font-size:48px;margin-bottom:12px;opacity:.3">📦</div>';
      H+='<div style="font-size:14px;color:var(--text-muted);margin-bottom:14px">Nessun prodotto trovato</div>';
      H+='<button onclick="ApparelQuoter.openProdModal(null)" style="padding:9px 20px;background:linear-gradient(135deg,#ec4899,#db2777);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:800">+ Aggiungi primo prodotto</button>';
      H+='</div>';
    } else {
      H+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">';
      filtered.forEach(function(p){
        var st=stock[p.id]||{qty:0,minStock:3};
        var catObj=PROD_CATS.find(function(c){return c.id===p.category;})||PROD_CATS[0];
        var lowSt=st.qty<=st.minStock;
        var margin=p.buyPrice>0?((p.sellPrice-p.buyPrice)/p.sellPrice*100):0;
        H+='<div style="background:var(--bg-card2);border:1.5px solid '+(lowSt?'rgba(239,68,68,.4)':'var(--border)')+';border-radius:13px;overflow:hidden;transition:.15s" onmouseover="this.style.boxShadow=\'0 6px 20px rgba(0,0,0,.25)\'" onmouseout="this.style.boxShadow=\'\'">';
        // Image/color header
        H+='<div style="height:72px;background:linear-gradient(135deg,#ec489918,#db277712);display:flex;align-items:center;justify-content:center;position:relative">';
        if(p.image) H+='<img src="'+p.image+'" style="height:60px;object-fit:contain" onerror="this.style.display=\'none\'">';
        else H+='<span style="font-size:36px">'+catObj.icon+'</span>';
        H+='<div style="position:absolute;top:7px;right:7px;background:'+(lowSt?'rgba(239,68,68,.8)':'rgba(34,197,94,.8)')+';color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:99px">'+(lowSt?'⚠️ STOCK BASSO':'Stock: '+st.qty)+'</div>';
        H+='</div>';
        H+='<div style="padding:11px 13px">';
        // Name + SKU
        H+='<div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:2px">'+p.name+'</div>';
        H+='<div style="font-size:10px;color:var(--text-muted);margin-bottom:7px">'+catObj.icon+' '+catObj.label+(p.brand?' · '+p.brand:'')+(p.sku?' · '+p.sku:'')+'</div>';
        // Colors/sizes
        if(p.colors) H+='<div style="font-size:10px;color:var(--text-dim);margin-bottom:4px">🎨 '+p.colors+'</div>';
        if(p.sizes)  H+='<div style="font-size:10px;color:var(--text-dim);margin-bottom:7px">📏 '+p.sizes+'</div>';
        // Prices
        H+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
        H+='<div><div style="font-size:10px;color:var(--text-muted)">Acquisto</div><div style="font-size:14px;font-weight:900;color:var(--text)">€'+parseFloat(p.buyPrice||0).toFixed(2)+'</div></div>';
        H+='<div style="text-align:center"><div style="font-size:10px;color:var(--text-muted)">Margine</div><div style="font-size:13px;font-weight:800;color:'+( margin>=30?'#22c55e':margin>=15?'#f59e0b':'#ef4444')+'">'+margin.toFixed(0)+'%</div></div>';
        H+='<div style="text-align:right"><div style="font-size:10px;color:var(--text-muted)">Vendita</div><div style="font-size:14px;font-weight:900;color:#10b981">€'+parseFloat(p.sellPrice||0).toFixed(2)+'</div></div>';
        H+='</div>';
        // Actions
        H+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px">';
        H+='<button onclick="ApparelQuoter.openProdModal(\''+p.id+'\')" style="padding:6px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)">✏️ Mod.</button>';
        H+='<button onclick="ApparelQuoter.openStockModal(\''+p.id+'\')" style="padding:6px;background:'+(lowSt?'rgba(239,68,68,.08)':'var(--bg-card)')+';border:1px solid '+(lowSt?'rgba(239,68,68,.3)':'var(--border)')+';border-radius:8px;cursor:pointer;font-size:11px;color:'+(lowSt?'#ef4444':'var(--text-muted)')+'">📦 '+st.qty+'</button>';
        H+='<button onclick="ApparelQuoter._useP(\''+p.id+'\')" style="padding:6px;background:linear-gradient(135deg,#ec4899,#db2777);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700">+ Usa</button>';
        H+='</div></div></div>';
      });
      H+='</div>';
    }
    H+='</div>';
    el.innerHTML=H;
  }

  // ── STOCK ─────────────────────────────────────────────────────────────────
  function _renderStock(el){
    var prods=loadP(), stock=loadSt();
    var H='<div style="padding:16px 20px;max-width:1200px;margin:0 auto">';
    H+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">';
    H+='<button onclick="ApparelQuoter.goBack()" style="padding:7px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)">← Indietro</button>';
    H+='<h2 style="font-size:18px;font-weight:900;color:var(--text);margin:0">📊 Gestione Stock</h2>';
    H+='</div>';

    var lowStockItems=prods.filter(function(p){ var st=stock[p.id]||{qty:0,minStock:3}; return st.qty<=st.minStock; });
    if(lowStockItems.length){
      H+='<div style="background:rgba(239,68,68,.06);border:1.5px solid rgba(239,68,68,.3);border-radius:12px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;gap:10px">';
      H+='<span style="font-size:20px">⚠️</span>';
      H+='<div><div style="font-size:13px;font-weight:800;color:#ef4444">'+lowStockItems.length+' articoli con stock basso!</div>';
      H+='<div style="font-size:11px;color:var(--text-muted)">'+lowStockItems.map(function(p){return p.name;}).join(', ')+'</div></div></div>';
    }

    H+='<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;overflow:hidden">';
    H+='<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 120px;padding:9px 16px;background:var(--bg-card);font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">';
    ['Prodotto','Categoria','Disponibile','Min Stock','Stato','Azioni'].forEach(function(h){H+='<div>'+h+'</div>';});
    H+='</div>';

    prods.forEach(function(p){
      var st=stock[p.id]||{qty:0,minStock:3};
      var low=st.qty<=st.minStock;
      var catObj=PROD_CATS.find(function(c){return c.id===p.category;})||PROD_CATS[0];
      H+='<div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr 120px;padding:11px 16px;border-top:1px solid var(--border);align-items:center">';
      H+='<div><div style="font-size:13px;font-weight:700;color:var(--text)">'+p.name+'</div><div style="font-size:10px;color:var(--text-muted)">'+(p.sku||'')+(p.brand?' · '+p.brand:'')+'</div></div>';
      H+='<div style="font-size:12px;color:var(--text-muted)">'+catObj.icon+' '+catObj.label+'</div>';
      H+='<div><span style="font-size:18px;font-weight:900;color:'+(low?'#ef4444':st.qty>20?'#22c55e':'#f59e0b')+'">'+st.qty+'</span><span style="font-size:10px;color:var(--text-dim)"> pz</span></div>';
      H+='<div style="font-size:12px;color:var(--text-muted)">'+st.minStock+'</div>';
      H+='<div><span style="padding:3px 9px;background:'+(low?'rgba(239,68,68,.12)':st.qty>20?'rgba(34,197,94,.12)':'rgba(245,158,11,.12)')+';color:'+(low?'#ef4444':st.qty>20?'#22c55e':'#f59e0b')+';border-radius:99px;font-size:10px;font-weight:700">'+(low?'⚠️ Basso':st.qty>20?'✅ OK':'🟡 Medio')+'</span></div>';
      H+='<div style="display:flex;gap:5px">';
      H+='<button onclick="ApparelQuoter.openStockModal(\''+p.id+'\')" style="flex:1;padding:5px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted)">📦 Aggiorna</button>';
      H+='</div></div>';
    });
    H+='</div></div>';
    el.innerHTML=H;
  }

  // ── SETTINGS ──────────────────────────────────────────────────────────────
  function _renderSettings(el){
    var s=loadS();
    var H='<div style="padding:16px 20px;max-width:900px;margin:0 auto">';
    H+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">';
    H+='<button onclick="ApparelQuoter.goBack()" style="padding:7px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)">← Indietro</button>';
    H+='<h2 style="font-size:18px;font-weight:900;color:var(--text);margin:0">⚙️ Costi & Configurazione</h2></div>';

    // Operational costs
    H+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">';
    H+='<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:14px">';
    // Machine selector
    H+='<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px">';
    H+='<div style="font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">⚡ Macchina attiva</div>';
    var mkKeys=Object.keys(MACHINES);
    mkKeys.forEach(function(mk) {
      var m=MACHINES[mk]; var isA=s.activeMachine===mk;
      var bg=isA?m.color+'20':'var(--bg-card)'; var br=isA?m.color+'60':'var(--border)'; var clr=isA?m.color:'var(--text)';
      H+='<button onclick="ApparelQuoter._setMachine('+JSON.stringify(mk)+')" style="padding:9px 12px;background:'+bg+';border:2px solid '+br+';border-radius:10px;cursor:pointer;text-align:left;transition:.15s">'
        +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span>'+m.icon+'</span><span style="font-size:12px;font-weight:700;color:'+clr+'">'+m.label+'</span></div>'
        +'<div style="font-size:10px;color:var(--text-dim)">'+m.watts+'W · €'+m.hourly.toFixed(2)+'/h ammort.</div>'
        +'<div style="font-size:10px;color:var(--text-dim)">'+m.desc.slice(0,35)+'</div>'
        +'</button>';
    });
    H+='</div></div>';
    H+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">';
    H+='<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:14px">';
    H+='<div style="font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">💡 Costi operativi azienda</div>';
    H+=_sf('Energia €/kWh (tariffa)','aq-s-ekwh',s.energyKwh,'0.28');
    H+=_sf('Watt macchina (media)','aq-s-ewatts',s.energyWatts,'1500');
    H+=_sf('Manodopera €/ora','aq-s-labor',s.laborHourly,'18.00');
    H+=_sf('Ammort. macchina €/ora','aq-s-mach',s.machineHourly,'3.00');
    H+=_sf('Imballaggio €/pezzo','aq-s-pack',s.packPerPiece,'0.40');
    H+=_sf('IVA default %','aq-s-vat',s.vatPct,'22');
    H+='</div>';
    H+='<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:14px">';
    H+='<div style="font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">🖨️ Costi base per tecnica di stampa</div>';
    Object.keys(TECHS).forEach(function(k){
      var t=TECHS[k]; var ov=s.techCosts[k]||{};
      H+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border)">';
      H+='<span style="font-size:16px">'+t.icon+'</span>';
      H+='<span style="font-size:12px;font-weight:700;color:'+t.color+';width:120px;flex-shrink:0">'+t.label+'</span>';
      H+='<div style="display:flex;gap:6px;align-items:center">';
      H+='<input type="number" step="0.01" value="'+((ov.baseCost!=null?ov.baseCost:t.baseCost))+'" data-t="'+k+'" data-f="baseCost" oninput="ApparelQuoter._stc(this)" style="width:65px;padding:5px 7px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;outline:none"> <span style="font-size:10px;color:var(--text-dim)">€/pz</span>';
      H+='<input type="number" step="1" min="1" value="'+((ov.timeMin!=null?ov.timeMin:t.timeMin))+'" data-t="'+k+'" data-f="timeMin" oninput="ApparelQuoter._stc(this)" style="width:50px;padding:5px 7px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;outline:none"> <span style="font-size:10px;color:var(--text-dim)">min</span>';
      H+='</div></div>';
    });
    H+='</div></div>';

    // Qty discounts
    H+='<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px">';
    H+='<div style="font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">📦 Sconti automatici per quantità</div>';
    H+='<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px">';
    QTY_BREAKS.filter(function(q){return q>1;}).forEach(function(qty){
      H+='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:9px;padding:9px;text-align:center">';
      H+='<div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:5px">×'+qty+'</div>';
      H+='<div style="display:flex;align-items:center;justify-content:center;gap:2px">';
      H+='<input type="number" value="'+(s.qtyDiscounts[qty]||0)+'" min="0" max="50" data-q="'+qty+'" oninput="ApparelQuoter._sqd(this)" style="width:42px;padding:4px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;text-align:center;outline:none">';
      H+='<span style="font-size:11px;color:var(--text-muted)">%</span></div></div>';
    });
    H+='</div></div>';

    // xTool F2 info card
    H+='<div style="background:rgba(251,191,36,.06);border:1.5px solid rgba(251,191,36,.2);border-radius:12px;padding:14px;margin-bottom:14px">';
    H+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">';
    H+='<span style="font-size:22px">⚡</span>';
    H+='<div><div style="font-size:13px;font-weight:800;color:#fbbf24">xTool F2 — Specifiche tecniche</div>';
    H+='<div style="font-size:11px;color:var(--text-muted)">Diodo 15W + IR 5W · 6000mm/s · Area: 115×115mm (400×115 con estensione)</div></div></div>';
    H+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:11px">';
    [
      {l:"Consumo energia",v:"~80W totale",s:"≈ €0.002/h"},
      {l:"Ammort. macchina",v:"€1250 / 5 anni",s:"≈ €0.16/h"},
      {l:"Velocità max",v:"6000 mm/s",s:"Diodo+IR"},
      {l:"Materiali Diodo",v:"Legno, MDF, Acrilico, Pelle",s:"Cuoio, Tessuto"},
      {l:"Materiali IR",v:"Inox, Alluminio,Metallo",s:"Titanio, Ottone"},
      {l:"Spot laser",v:"0.08×0.06mm (Diodo)",s:"0.03×0.03mm (IR)"},
    ].forEach(function(k){
      H+='<div style="background:var(--bg-card);border-radius:8px;padding:8px 10px">';
      H+='<div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;margin-bottom:2px">'+k.l+'</div>';
      H+='<div style="font-size:12px;font-weight:700;color:var(--text)">'+k.v+'</div>';
      H+='<div style="font-size:10px;color:var(--text-dim)">'+k.s+'</div></div>';
    });
    H+='</div></div>';
    H+='<button onclick="ApparelQuoter._applyS()" style="padding:11px 28px;background:linear-gradient(135deg,#ec4899,#db2777);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva impostazioni</button>';
    H+='</div>';
    el.innerHTML=H;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _ff(label,id,val,ph,onch,type){
    return '<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">'+label+'</label>'
      +'<input id="'+id+'" type="'+(type||'text')+'" value="'+String(val||'').replace(/"/g,'&quot;')+'" placeholder="'+ph+'" oninput="'+onch+'" style="width:100%;padding:8px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;outline:none;box-sizing:border-box"></div>';
  }
  function _lf(label,idx,field,val,type,extra,noIdxInField){
    var oi='ApparelQuoter.sl('+idx+',\''+field+'\',this.type===\'number\'?+this.value:this.value)';
    return '<div><label style="font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">'+label+'</label>'
      +'<input type="'+(type||'text')+'" value="'+val+'" '+(extra||'')+' oninput="'+oi+'" style="width:100%;padding:7px 9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;outline:none;box-sizing:border-box"></div>';
  }
  function _sf(label,id,val,ph){
    return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
      +'<label style="font-size:12px;font-weight:600;color:var(--text-muted);width:160px;flex-shrink:0">'+label+'</label>'
      +'<input id="'+id+'" type="number" step="0.01" value="'+val+'" placeholder="'+ph+'" style="width:85px;padding:6px 9px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none"></div>';
  }
  function _sf2(label,id,val,ph,onch,min,max){
    return '<div><label style="font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:3px">'+label+'</label>'
      +'<input id="'+id+'" type="number" value="'+val+'" placeholder="'+ph+'" oninput="'+onch+'" '+(min?'min="'+min+'"':'')+' '+(max?'max="'+max+'"':'')+' step="1" style="width:100%;padding:7px 9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;outline:none;box-sizing:border-box"></div>';
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  function nextNum(){ var qs=loadQ(); var m=0; qs.forEach(function(q){var n=parseInt((q.number||'0').replace(/\D/g,''));if(n>m)m=n;}); return 'AQ-'+String(m+1).padStart(3,'0'); }

  function newQuote(){
    var q={id:'aq_'+Date.now(),number:nextNum(),clientName:'',clientEmail:'',clientPhone:'',jobName:'Preventivo Apparel',date:new Date().toISOString().slice(0,10),status:'bozza',lines:[],vatMode:'excluded',vatPct:loadS().vatPct,globalDiscount:0,notes:'',deadline:''};
    var qs=loadQ(); qs.unshift(q); store(SK,qs);
    _editId=q.id; _view='editor'; render();
  }
  function editQuote(id){ _editId=id; _view='editor'; render(); }
  function goBack()      { _view='dashboard'; render(); }
  function goProducts()  { _view='products'; render(); }
  function goStock()     { _view='stock'; render(); }
  function goSettings()  { _view='settings'; render(); }

  function dupQ(id){
    var qs=loadQ(), q=qs.find(function(x){return x.id===id;}); if(!q)return;
    var nq=JSON.parse(JSON.stringify(q)); nq.id='aq_'+Date.now(); nq.number=nextNum(); nq.status='bozza'; nq.date=new Date().toISOString().slice(0,10);
    qs.unshift(nq); store(SK,qs); render();
    if(typeof toast!=='undefined')toast('⧉ Duplicato: '+nq.number,'success');
  }
  function delQ(id){
    if(!confirm('Eliminare?'))return;
    store(SK,loadQ().filter(function(q){return q.id!==id;})); render();
  }

  function sf(field,value){
    if(!_editId)return;
    var qs=loadQ(), q=qs.find(function(x){return x.id===_editId;}); if(!q)return;
    q[field]=value; store(SK,qs);
    clearTimeout(window._aqT); window._aqT=setTimeout(function(){ApparelQuoter.render();},400);
  }

  function addLine(){
    if(!_editId)return;
    var qs=loadQ(), q=qs.find(function(x){return x.id===_editId;}); if(!q)return;
    q.lines=q.lines||[];
    q.lines.push({id:'aql_'+Date.now(),productName:'T-Shirt',tech:'dtf',qty:1,buyPrice:4.50,margin:40,discount:0,sizeColor:'',shipCost:0});
    store(SK,qs); render();
  }

  function sl(idx,field,value){
    if(!_editId)return;
    var qs=loadQ(), q=qs.find(function(x){return x.id===_editId;}); if(!q||!q.lines[idx])return;
    q.lines[idx][field]=value; store(SK,qs);
    clearTimeout(window._aqT); window._aqT=setTimeout(function(){ApparelQuoter.render();},300);
  }

  function rl(idx){
    if(!_editId)return;
    var qs=loadQ(), q=qs.find(function(x){return x.id===_editId;}); if(!q)return;
    q.lines.splice(idx,1); store(SK,qs); render();
  }

  function setQty(qty){
    if(!_editId)return;
    var qs=loadQ(), q=qs.find(function(x){return x.id===_editId;}); if(!q)return;
    q.lines=(q.lines||[]).map(function(l){return Object.assign({},l,{qty:qty});});
    store(SK,qs); render();
  }

  function addFromCatalog(){
    if(!_editId){ if(typeof toast!=='undefined')toast('Apri prima un preventivo','warning'); return; }
    openCatalogPicker();
  }

  function _useP(pid){
    if(!_editId){ _view='dashboard'; render(); return; }
    var p=loadP().find(function(x){return x.id===pid;}); if(!p)return;
    var qs=loadQ(), q=qs.find(function(x){return x.id===_editId;}); if(!q)return;
    q.lines=q.lines||[];
    q.lines.push({id:'aql_'+Date.now(),productName:p.name,productSku:p.sku,tech:'dtf',qty:1,buyPrice:parseFloat(p.buyPrice||0),margin:40,discount:0,sizeColor:'',shipCost:0});
    store(SK,qs); _view='editor'; render();
    if(typeof toast!=='undefined')toast('📦 '+p.name+' aggiunto','success');
  }

  function _setProdFilter(key,val){ _prodFilter[key]=val; render(); }

  // ── Product Modal ──────────────────────────────────────────────────────────
  function openProdModal(id){
    var p=id?loadP().find(function(x){return x.id===id;}):null;
    var existing=document.getElementById('aq-prod-modal'); if(existing)existing.remove();
    var ov=document.createElement('div');
    ov.id='aq-prod-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};

    var catOpts=PROD_CATS.map(function(c){return '<option value="'+c.id+'"'+((p&&p.category===c.id)?' selected':'')+'>'+c.icon+' '+c.label+'</option>';}).join('');
    var sizeChecks=SIZES.map(function(sz){
      var checked=p&&p.sizes&&p.sizes.includes(sz)?'checked':'';
      return '<label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);cursor:pointer"><input type="checkbox" value="'+sz+'" '+checked+' style="cursor:pointer"> '+sz+'</label>';
    }).join('');

    ov.innerHTML='<div style="background:var(--bg-card);border-radius:16px;width:min(620px,100%);max-height:92vh;overflow-y:auto;border:1px solid var(--border2)" onclick="event.stopPropagation()">'
      +'<div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;position:sticky;top:0;background:var(--bg-card);border-radius:16px 16px 0 0">'
      +'<span style="font-size:22px">📦</span>'
      +'<span style="flex:1;font-size:15px;font-weight:800;color:var(--text)">'+(p?'Modifica':'Nuovo')+' Prodotto</span>'
      +'<button onclick="document.getElementById(\'aq-prod-modal\').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:20px">✕</button>'
      +'</div>'
      +'<div style="padding:16px;display:flex;flex-direction:column;gap:11px">'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      +_pf2('Nome prodotto *','aq-p-name',p&&p.name,'Es. T-Shirt Gildan 64000...')
      +_pf2('SKU / Codice','aq-p-sku',p&&p.sku,'TSH-GIL-WHT-M')
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Categoria</label>'
      +'<select id="aq-p-cat" style="width:100%;padding:8px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;cursor:pointer;box-sizing:border-box">'+catOpts+'</select></div>'
      +_pf2('Marca / Fornitore','aq-p-brand',p&&p.brand,'Gildan, Fruit of Loom...')
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      +_pf2('Prezzo acquisto €','aq-p-buy',p&&p.buyPrice,'4.50','number')
      +_pf2('Prezzo vendita €','aq-p-sell',p&&p.sellPrice,'18.00','number')
      +_pf2('Margine vendita %','aq-p-margin','','—','text','disabled')
      +'</div>'
      +_pf2('Colori disponibili','aq-p-colors',p&&p.colors,'Bianco, Nero, Rosso, Blu Navy...')
      +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:6px">Taglie disponibili</label>'
      +'<div id="aq-p-sizes-grid" style="display:flex;flex-wrap:wrap;gap:8px">'+sizeChecks+'</div></div>'
      +_pf2('Note / URL fornitore','aq-p-notes',p&&p.notes,'Fornitore, link, tempi consegna...')
      +'<input type="hidden" id="aq-p-id" value="'+(p&&p.id||'')+'">'
      +'<div style="display:flex;gap:8px;padding-top:6px;border-top:1px solid var(--border)">'
      +(p?'<button onclick="ApparelQuoter._delP()" style="padding:10px 14px;background:rgba(239,68,68,.08);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:10px;cursor:pointer;font-size:12px;font-weight:700">🗑</button>':'')
      +'<button onclick="document.getElementById(\'aq-prod-modal\').remove()" style="flex:1;padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:12px;color:var(--text-muted)">Annulla</button>'
      +'<button onclick="ApparelQuoter._saveP()" style="flex:2;padding:10px;background:linear-gradient(135deg,#ec4899,#db2777);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva prodotto</button>'
      +'</div></div></div>';
    document.body.appendChild(ov);
    // Auto-calc margin
    var buyEl=document.getElementById('aq-p-buy');
    var sellEl=document.getElementById('aq-p-sell');
    var mEl=document.getElementById('aq-p-margin');
    function updateMargin(){
      var b=parseFloat(buyEl.value||0),se=parseFloat(sellEl.value||0);
      if(mEl) mEl.value=se>0?((se-b)/se*100).toFixed(1)+'%':'—';
    }
    if(buyEl){buyEl.oninput=updateMargin;} if(sellEl){sellEl.oninput=updateMargin;}
    updateMargin();
    setTimeout(function(){var t=document.getElementById('aq-p-name');if(t)t.focus();},80);
  }

  function _pf2(label,id,val,ph,type,extra){
    return '<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">'+label+'</label>'
      +'<input id="'+id+'" type="'+(type||'text')+'" value="'+String(val!=null?val:'').replace(/"/g,'&quot;')+'" placeholder="'+ph+'" '+(extra||'')+' style="width:100%;padding:8px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;outline:none;box-sizing:border-box"></div>';
  }

  function _saveP(){
    var name=(document.getElementById('aq-p-name').value||'').trim();
    if(!name){alert('Inserisci nome prodotto');return;}
    var id=document.getElementById('aq-p-id').value||('aqp_'+Date.now());
    var sizes=[];
    document.querySelectorAll('#aq-p-sizes-grid input[type=checkbox]:checked').forEach(function(cb){sizes.push(cb.value);});
    var p={
      id:id, name:name,
      sku:(document.getElementById('aq-p-sku').value||'').trim(),
      category:document.getElementById('aq-p-cat').value,
      brand:(document.getElementById('aq-p-brand').value||'').trim(),
      buyPrice:parseFloat(document.getElementById('aq-p-buy').value)||0,
      sellPrice:parseFloat(document.getElementById('aq-p-sell').value)||0,
      colors:(document.getElementById('aq-p-colors').value||'').trim(),
      sizes:sizes.join(', '),
      notes:(document.getElementById('aq-p-notes').value||'').trim(),
    };
    var prods=loadP(), idx=prods.findIndex(function(x){return x.id===id;});
    if(idx>=0)prods[idx]=p; else prods.unshift(p);
    store(PRODS_SK,prods);
    document.getElementById('aq-prod-modal').remove();
    render();
    if(typeof toast!=='undefined')toast('📦 '+p.name+' salvato!','success');
  }

  function _delP(){
    var id=document.getElementById('aq-p-id').value;
    if(!id||!confirm('Eliminare?'))return;
    store(PRODS_SK,loadP().filter(function(p){return p.id!==id;}));
    document.getElementById('aq-prod-modal').remove(); render();
  }

  // ── Stock Modal ────────────────────────────────────────────────────────────
  function openStockModal(pid){
    var p=loadP().find(function(x){return x.id===pid;}); if(!p)return;
    var stock=loadSt(); var st=stock[pid]||{qty:0,minStock:3};
    var existing=document.getElementById('aq-stock-modal'); if(existing)existing.remove();
    var ov=document.createElement('div');
    ov.id='aq-stock-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};
    ov.innerHTML='<div style="background:var(--bg-card);border-radius:14px;width:min(380px,100%);border:1px solid var(--border2)" onclick="event.stopPropagation()">'
      +'<div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">'
      +'<span style="font-size:20px">📦</span><span style="flex:1;font-size:14px;font-weight:800;color:var(--text)">Stock: '+p.name+'</span>'
      +'<button onclick="document.getElementById(\'aq-stock-modal\').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:18px">✕</button>'
      +'</div>'
      +'<div style="padding:16px;display:flex;flex-direction:column;gap:12px">'
      +'<div style="text-align:center;padding:16px;background:var(--bg-card2);border-radius:10px">'
      +'<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Disponibile attuale</div>'
      +'<div style="font-size:40px;font-weight:900;color:var(--text)">'+st.qty+'</div>'
      +'<div style="font-size:11px;color:var(--text-muted)">pezzi in magazzino</div></div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      +_pf2('Nuova quantità','aq-st-qty',st.qty,'0','number')
      +_pf2('Stock minimo alert','aq-st-min',st.minStock,'3','number')
      +'</div>'
      +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Movimento rapido</label>'
      +'<div style="display:flex;gap:6px">'
      +'<button onclick="var e=document.getElementById(\'aq-st-qty\');e.value=Math.max(0,parseInt(e.value||0)-1)" style="flex:1;padding:8px;background:rgba(239,68,68,.08);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:8px;cursor:pointer;font-size:14px;font-weight:800">-1</button>'
      +'<button onclick="var e=document.getElementById(\'aq-st-qty\');e.value=Math.max(0,parseInt(e.value||0)-5)" style="flex:1;padding:8px;background:rgba(239,68,68,.08);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">-5</button>'
      +'<button onclick="var e=document.getElementById(\'aq-st-qty\');e.value=parseInt(e.value||0)+5" style="flex:1;padding:8px;background:rgba(34,197,94,.08);color:#22c55e;border:1px solid rgba(34,197,94,.2);border-radius:8px;cursor:pointer;font-size:13px;font-weight:700">+5</button>'
      +'<button onclick="var e=document.getElementById(\'aq-st-qty\');e.value=parseInt(e.value||0)+10" style="flex:1;padding:8px;background:rgba(34,197,94,.08);color:#22c55e;border:1px solid rgba(34,197,94,.2);border-radius:8px;cursor:pointer;font-size:14px;font-weight:800">+10</button>'
      +'</div></div>'
      +'<input type="hidden" id="aq-st-pid" value="'+pid+'">'
      +'<div style="display:flex;gap:8px;padding-top:6px;border-top:1px solid var(--border)">'
      +'<button onclick="document.getElementById(\'aq-stock-modal\').remove()" style="flex:1;padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)">Annulla</button>'
      +'<button onclick="ApparelQuoter._saveSt()" style="flex:2;padding:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">💾 Aggiorna stock</button>'
      +'</div></div></div>';
    document.body.appendChild(ov);
  }

  function _saveSt(){
    var pid=document.getElementById('aq-st-pid').value;
    var qty=parseInt(document.getElementById('aq-st-qty').value)||0;
    var min=parseInt(document.getElementById('aq-st-min').value)||3;
    var stock=loadSt(); stock[pid]={qty:qty,minStock:min};
    store(STOCK_SK,stock);
    document.getElementById('aq-stock-modal').remove(); render();
    if(typeof toast!=='undefined')toast('📦 Stock aggiornato: '+qty+' pz','success');
  }

  // ── Catalog Picker Modal ───────────────────────────────────────────────────
  function openCatalogPicker(){
    var prods=loadP();
    var existing=document.getElementById('aq-catalog-picker'); if(existing)existing.remove();
    var ov=document.createElement('div');
    ov.id='aq-catalog-picker';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};
    var rows=prods.length?prods.map(function(p){
      var cat=PROD_CATS.find(function(c){return c.id===p.category;})||PROD_CATS[0];
      return '<div onclick="ApparelQuoter._useP(\''+p.id+'\');document.getElementById(\'aq-catalog-picker\').remove()" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border);cursor:pointer;transition:.1s" onmouseover="this.style.background=\'var(--bg-card2)\'" onmouseout="this.style.background=\'\'">'
        +'<span style="font-size:20px">'+cat.icon+'</span>'
        +'<div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--text)">'+p.name+'</div><div style="font-size:10px;color:var(--text-muted)">'+cat.label+(p.brand?' · '+p.brand:'')+(p.sku?' · SKU: '+p.sku:'')+'</div></div>'
        +'<div style="text-align:right"><div style="font-size:12px;font-weight:800;color:var(--text)">€'+parseFloat(p.buyPrice||0).toFixed(2)+'</div><div style="font-size:10px;color:var(--text-dim)">acquisto</div></div>'
        +'</div>';
    }).join(''):('<div style="text-align:center;padding:30px;color:var(--text-muted)">Catalogo vuoto — aggiungi prodotti prima</div>');
    ov.innerHTML='<div style="background:var(--bg-card);border-radius:14px;width:min(480px,100%);max-height:85vh;overflow-y:auto;border:1px solid var(--border2)" onclick="event.stopPropagation()">'
      +'<div style="padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;position:sticky;top:0;background:var(--bg-card)">'
      +'<span style="font-size:18px">📦</span><span style="flex:1;font-size:14px;font-weight:800;color:var(--text)">Seleziona dal catalogo</span>'
      +'<button onclick="document.getElementById(\'aq-catalog-picker\').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:18px">✕</button>'
      +'</div>'+rows+'</div>';
    document.body.appendChild(ov);
  }

  // ── Settings save ──────────────────────────────────────────────────────────
  function _stc(input){
    var s=loadS(); var k=input.dataset.t, f=input.dataset.f;
    if(!s.techCosts[k])s.techCosts[k]={};
    s.techCosts[k][f]=parseFloat(input.value)||0;
    store(SETT_SK,s);
  }
  function _sqd(input){
    var s=loadS(); s.qtyDiscounts[parseInt(input.dataset.q)]=parseFloat(input.value)||0;
    store(SETT_SK,s);
  }
  function _applyS(){
    var s=loadS();
    var map={'aq-s-ekwh':'energyKwh','aq-s-ewatts':'energyWatts','aq-s-labor':'laborHourly','aq-s-mach':'machineHourly','aq-s-pack':'packPerPiece','aq-s-vat':'vatPct'};
    Object.keys(map).forEach(function(id){var e=document.getElementById(id);if(e)s[map[id]]=parseFloat(e.value)||0;});
    store(SETT_SK,s);
    if(typeof toast!=='undefined')toast('✅ Impostazioni salvate!','success');
    render();
  }

  // ── PDF ────────────────────────────────────────────────────────────────────
  function genPDF(){
    if(!_editId)return;
    var qs=loadQ(), s=loadS(), q=qs.find(function(x){return x.id===_editId;});
    if(!q||(!(q.lines||[]).length)){if(typeof toast!=='undefined')toast('⚠️ Aggiungi almeno una riga','warning');return;}
    var calc=calcQuote(q,s);
    var cp={}; try{cp=(typeof CompanyProfile!=='undefined')?CompanyProfile.get():{};}catch(e){}
    var cfg={}; try{cfg=JSON.parse(localStorage.getItem('ingly_settings_main')||'{}');}catch(e){}
    var biz={company:cfg.company||cp.name||'',tagline:cfg.tagline||cp.slogan||'',logo:cp.logo||cfg.logo||'',piva:cfg.piva||cp.piva||'',email:cfg.email||cp.email||'',phone:cfg.phone||cp.phone||''};
    var html=_buildPDF(q,calc,s,biz);
    _showPreview(html,q);
  }

  function _buildPDF(q,calc,s,biz){
    var dateStr=new Date(q.date||Date.now()).toLocaleDateString('it-IT',{year:'numeric',month:'long',day:'numeric'});
    var vatPct=parseFloat((q.vatPct!=null?q.vatPct:s.vatPct));
    var rows=calc.lines.map(function(l){
      var r=l._c||{}, t=TECHS[l.tech]||TECHS.dtf;
      return '<tr><td style="padding:10px 12px;border-bottom:1px solid #f1f5f9">'+t.icon+' <strong>'+(l.productName||'Prodotto')+'</strong>'
        +'<br><span style="font-size:10px;color:#94a3b8">'+t.label+(l.sizeColor?' · '+l.sizeColor:'')+'</span></td>'
        +'<td style="text-align:center;padding:10px 12px;border-bottom:1px solid #f1f5f9">'+l.qty+'</td>'
        +'<td style="text-align:right;padding:10px 12px;border-bottom:1px solid #f1f5f9">€'+(r.costPerPiece||0).toFixed(2)+'</td>'
        +'<td style="text-align:right;padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:700">€'+(r.priceUnit||0).toFixed(2)+'</td>'
        +'<td style="text-align:center;padding:10px 12px;border-bottom:1px solid #f1f5f9;color:'+((r.profitPct||0)>=20?'#22c55e':'#f59e0b')+';font-weight:700">'+(r.profitPct||0).toFixed(0)+'%</td>'
        +'<td style="text-align:right;padding:10px 12px;border-bottom:1px solid #f1f5f9;font-weight:900;font-size:14px">€'+(r.subtotal||0).toFixed(2)+'</td></tr>';
    }).join('');
    return '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>Preventivo Apparel '+q.number+'</title>'
      +'<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:\'Segoe UI\',system-ui,sans-serif;background:#f8fafc}@page{size:A4;margin:12mm}@media print{.no-print{display:none!important}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}'
      +'.page{max-width:860px;margin:0 auto;background:#fff;box-shadow:0 4px 30px rgba(0,0,0,.1)}'
      +'.hdr{background:linear-gradient(135deg,#0d0d14 60%,#1a0a1a);padding:28px 34px;border-bottom:3px solid #ec4899}'
      +'.body{padding:26px 34px}.ftr{background:linear-gradient(135deg,#0d0d14,#1a0a1a);padding:12px 34px;border-top:2px solid rgba(236,72,153,.35);display:flex;justify-content:space-between;font-size:11px;color:#f9a8d4}'
      +'table{width:100%;border-collapse:collapse}thead{background:linear-gradient(135deg,#ec4899,#db2777)}thead th{padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.5px}'
      +'.tot{max-width:260px;margin-left:auto;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}'
      +'.tr{display:flex;justify-content:space-between;padding:8px 12px;font-size:13px;border-bottom:1px solid #f1f5f9;color:#64748b}'
      +'.tr.g{background:linear-gradient(135deg,#ec4899,#db2777);color:#fff;font-size:16px;font-weight:900;border:none;padding:11px 14px}'
      +'</style></head><body><div class="page">'
      +'<div class="hdr"><div style="display:flex;justify-content:space-between;align-items:flex-start">'
      +'<div>'+(biz.logo?'<img src="'+biz.logo+'" style="max-height:48px;max-width:150px;object-fit:contain;display:block;margin-bottom:8px" alt="logo">':'')
      +'<div style="font-size:24px;font-weight:900;color:#fbbf24">'+biz.company+'</div>'
      +(biz.tagline?'<div style="font-size:11px;color:#f9a8d490;margin-top:3px;font-style:italic">'+biz.tagline+'</div>':'')
      +'<div style="margin-top:7px;font-size:11px;color:#f9a8d460">'+(biz.piva?'P.IVA '+biz.piva+' · ':'')+biz.email+(biz.phone?' · '+biz.phone:'')+'</div></div>'
      +'<div style="text-align:right;background:rgba(236,72,153,.12);border:1.5px solid rgba(236,72,153,.35);border-radius:11px;padding:13px 18px;min-width:150px">'
      +'<div style="font-size:9px;color:#f9a8d450;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px">Preventivo Apparel</div>'
      +'<div style="font-size:26px;font-weight:900;color:#fbbf24">'+q.number+'</div>'
      +'<div style="font-size:11px;color:#f9a8d450;margin-top:5px;padding-top:5px;border-top:1px solid rgba(236,72,153,.2)">'+dateStr+'</div>'
      +'</div></div></div>'
      +'<div class="body">'
      +(q.clientName?'<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:9px;padding:14px 18px;margin-bottom:18px"><div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:5px">Cliente</div><div style="font-size:15px;font-weight:800">'+q.clientName+'</div>'+(q.clientEmail?'<div style="font-size:12px;color:#64748b;margin-top:3px">'+q.clientEmail+(q.clientPhone?' · '+q.clientPhone:'')+'</div>':'')+'</div>':'')
      +'<div style="font-size:10px;font-weight:700;color:#ec4899;text-transform:uppercase;letter-spacing:1px;margin:0 0 10px;padding-bottom:6px;border-bottom:2px solid #ec489930">'+(q.jobName||'Stampa abbigliamento')+'</div>'
      +'<table><thead><tr><th>Articolo / Tecnica</th><th style="text-align:center">Qtà</th><th style="text-align:right">Costo/pz</th><th style="text-align:right">Prezzo/pz</th><th style="text-align:center">Margine</th><th style="text-align:right">Totale</th></tr></thead><tbody>'+rows+'</tbody></table>'
      +'<div style="margin-top:18px"><div class="tot">'
      +'<div class="tr"><span>Subtotale</span><span>€'+calc.subtotal.toFixed(2)+'</span></div>'
      +(calc.gDiscAmt>0?'<div class="tr"><span>Sconto globale</span><span style="color:#22c55e">-€'+calc.gDiscAmt.toFixed(2)+'</span></div>':'')
      +(q.vatMode!=='included'?'<div class="tr"><span>IVA '+vatPct+'%</span><span>€'+calc.vatAmt.toFixed(2)+'</span></div>':'')
      +'<div class="tr g"><span>TOTALE</span><span>€'+calc.grand.toFixed(2)+'</span></div>'
      +'</div></div>'
      +(q.notes?'<div style="margin-top:18px;background:#f8fafc;border-left:4px solid #ec4899;padding:12px 14px;border-radius:0 8px 8px 0;font-size:12px;color:#475569;line-height:1.7">'+q.notes+'</div>':'')
      +(q.deadline?'<div style="margin-top:12px;font-size:12px;color:#64748b">📅 Consegna prevista: <strong>'+new Date(q.deadline).toLocaleDateString('it-IT',{year:'numeric',month:'long',day:'numeric'})+'</strong></div>':'')
      +'</div>'
      +'<div class="ftr"><span>'+biz.company+' — Preventivo Apparel '+q.number+'</span><span style="opacity:.5">INGLY OS</span><span>'+dateStr+'</span></div>'
      +'</div></body></html>';
  }

  function _showPreview(html,q){
    var existing=document.getElementById('_pdf-preview-overlay'); if(existing)existing.remove();
    var ov=document.createElement('div');
    ov.id='_pdf-preview-overlay';
    ov.style.cssText='position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.85);display:flex;flex-direction:column;overflow:hidden';
    var tb=document.createElement('div');
    tb.style.cssText='width:100%;background:#1a1a2e;border-bottom:1px solid rgba(255,255,255,.1);padding:10px 18px;display:flex;align-items:center;gap:12px;flex-shrink:0';
    tb.innerHTML='<span style="font-size:16px">👕</span><span style="font-size:14px;font-weight:800;color:#fff;flex:1">Preventivo '+q.number+' — '+(q.clientName||'')+'</span>'
      +'<button id="_apdf-print" style="padding:8px 20px;background:linear-gradient(135deg,#ec4899,#db2777);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">🖨️ Stampa / PDF</button>'
      +'<button id="_apdf-dl" style="padding:8px 14px;background:rgba(96,165,250,.12);color:#60a5fa;border:1.5px solid rgba(96,165,250,.25);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">⬇️ HTML</button>'
      +'<button onclick="document.getElementById(\'_pdf-preview-overlay\').remove()" style="padding:8px 14px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.6);border:1px solid rgba(255,255,255,.15);border-radius:9px;cursor:pointer;font-size:13px">✕</button>';
    ov.appendChild(tb);
    var hint=document.createElement('div');
    hint.style.cssText='width:100%;background:rgba(236,72,153,.08);border-bottom:1px solid rgba(236,72,153,.15);padding:6px 18px;font-size:11px;color:#f9a8d4;text-align:center;flex-shrink:0';
    hint.textContent='💡 Clicca "Stampa / PDF" → seleziona "Salva come PDF" nella finestra di stampa';
    ov.appendChild(hint);
    var fw=document.createElement('div');
    fw.style.cssText='flex:1;overflow-y:auto;background:#525659;display:flex;justify-content:center;padding:18px';
    var iframe=document.createElement('iframe');
    iframe.id='_apdf-iframe';
    iframe.style.cssText='width:860px;min-height:900px;border:none;border-radius:4px;box-shadow:0 8px 32px rgba(0,0,0,.5);flex-shrink:0;background:#fff';
    fw.appendChild(iframe); ov.appendChild(fw); document.body.appendChild(ov);
    try{var doc=iframe.contentDocument||iframe.contentWindow.document;doc.open();doc.write(html);doc.close();}
    catch(e){var b=new Blob([html],{type:'text/html'});iframe.src=URL.createObjectURL(b);}
    document.getElementById('_apdf-print').onclick=function(){try{iframe.contentWindow.focus();iframe.contentWindow.print();}catch(e){var w=window.open('','_blank');if(w){w.document.write(html);w.document.close();w.print();}}};
    document.getElementById('_apdf-dl').onclick=function(){
      var a=document.createElement('a');
      a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));
      a.download='Preventivo-Apparel-'+q.number+'.html';a.click();
    };
    document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){var o=document.getElementById('_pdf-preview-overlay');if(o)o.remove();document.removeEventListener('keydown',esc);}});
  }

  function exportCSV(){
    var qs=loadQ(),s=loadS();
    var hdr='Numero,Cliente,Lavoro,Data,Stato,Tecnica,Totale,Margine';
    var rows=[hdr];
    qs.forEach(function(q){
      var r=calcQuote(q,s);
      var techs=[]; (q.lines||[]).forEach(function(l){if(techs.indexOf(l.tech)<0)techs.push(l.tech);});
      var row=[q.number||'',q.clientName||'',q.jobName||'',q.date||'',q.status||'',techs.join('+'),'E'+r.grand.toFixed(2),r.profitPct.toFixed(1)+'pct'];
      rows.push(row.map(function(v){return v.indexOf(',')>=0?'"'+v+'"':v;}).join(','));
    });
    var blob=new Blob([rows.join('\n')],{type:'text/csv'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='apparel-preventivi-'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();
    if(typeof toast!=='undefined') toast('CSV esportato!','success');
  }

  // ── Machine selector ────────────────────────────────────────────────
  function _setMachine(mk){
    var m=MACHINES[mk]; if(!m) return;
    var s=loadS();
    s.activeMachine=mk;
    s.energyWatts=m.watts;
    s.machineHourly=m.hourly;
    store(SETT_SK,s);
    if(typeof toast!=='undefined') toast(m.icon+' '+m.label+' impostata come macchina attiva!','success');
    render();
  }

  return {
    render,newQuote,editQuote,goBack,goProducts,goStock,goSettings,_setMachine,
    dupQ,delQ,sf,addLine,sl,rl,setQty,addFromCatalog,_useP,_setProdFilter,
    openProdModal,_saveP,_delP,openStockModal,_saveSt,openCatalogPicker,
    _stc,_sqd,_applyS,genPDF,exportCSV,
    setConsuntivo,scostamentoDi,previstoDi,scaglioni,
  };
})();


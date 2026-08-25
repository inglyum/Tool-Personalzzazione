
// ═══════════════════════════════════════════════════════════════════════
// 🏆 COMPETITORS — Sezione monitoraggio concorrenza
// Gadget laser · Abbigliamento personalizzato · Portachiavi legno/plexiglass
// ═══════════════════════════════════════════════════════════════════════
var CompetitorsModule = (function(){
  'use strict';

  var SK = 'ingly_competitors_v1';
  var _cat = ''; var _search = ''; var _view = 'list';
  var _editId = null;

  var CATS = [
    {id:'laser',      label:'Laser/Incisione', icon:'⚡', color:'#f59e0b'},
    {id:'portachiavi',label:'Portachiavi',      icon:'🔑', color:'#6366f1'},
    {id:'legno',      label:'Legno/Plexiglass', icon:'🪵', color:'#92400e'},
    {id:'abbigliamento',label:'Abbigliamento',  icon:'👕', color:'#ec4899'},
    {id:'gadget',     label:'Gadget Promo',     icon:'🎁', color:'#10b981'},
    {id:'stampa',     label:'Stampa/DTF',       icon:'🖨️', color:'#8b5cf6'},
    {id:'etsy',       label:'Etsy Italia',      icon:'🛍️', color:'#f97316'},
    {id:'locale',     label:'Palermo/Sicilia',  icon:'🏝️', color:'#06b6d4'},
  ];

  var SCORES = ['⭐','⭐⭐','⭐⭐⭐','⭐⭐⭐⭐','⭐⭐⭐⭐⭐'];

  // ── Default pre-populated data ────────────────────────────────────────
  var DEFAULT_COMPETITORS = [
    {
      id:'c001', name:'StampaSi', url:'https://www.stampasi.it', logo:'',
      category:'portachiavi', zone:'Milano / Italia',
      description:'Leader Italia gadget promozionali. Portachiavi in legno/bambù, oltre 25.000 clienti. Spedizione gratuita.',
      products:[
        {name:'Portachiavi legno rotondo faggio',  unit:0.89, qty10:null, qty50:null, qty100:null, note:'da ~€0.89 (50pz) + IVA, personalizzazione inclusa'},
        {name:'Portachiavi bambù rettangolare',    unit:0.95, qty10:null, qty50:null, qty100:null, note:'prezzi scalabili min 50pz'},
        {name:'Portachiavi metallo incisione laser',unit:1.20,qty10:null, qty50:null, qty100:null, note:'vari colori, laser su metallo'},
      ],
      minOrder:50, delivery:'7-10 gg', vatExcl:true,
      strengths:'Leader di mercato, prezzi online calcolabili, vasta gamma, spedizione gratuita',
      weaknesses:'Quantità minime alte, meno flessibile su piccole tirature',
      threat:4, quality:4, priceComp:4, score:'A+',
      notes:'Min 50pz per personalizzati. Ottimo prezzo su grandi quantità.',
      updatedAt:new Date().toISOString(),
    },
    {
      id:'c002', name:'EC Laser Studio', url:'https://www.eclaserstudio.com', logo:'',
      category:'portachiavi', zone:'Italia (online)',
      description:'Specializzati portachiavi legno/plexiglass personalizzati laser. Minimo 10pz. Preventivo personalizzato.',
      products:[
        {name:'Portachiavi legno betulla 6x3 cm', unit:1.80,qty10:18.00,qty50:null,qty100:null,note:'10pz min, incisione inclusa'},
        {name:'Portachiavi plexiglass 4x4 cm',   unit:1.60,qty10:16.00,qty50:null,qty100:null,note:'plexiglass trasparente'},
        {name:'Portachiavi sagomato su misura',   unit:2.50,qty10:null, qty50:null,qty100:null,note:'forme personalizzate su richiesta'},
      ],
      minOrder:10, delivery:'15 gg da conferma', vatExcl:false,
      strengths:'Qualità artigianale, forme personalizzate, minimo 10pz, vari legni',
      weaknesses:'Tempi produzione lunghi, nessun configuratore online',
      threat:4, quality:5, priceComp:3, score:'A',
      notes:'Betulla e pioppo. File .eps/.pdf/.ai. Accettano piccole tirature.',
      updatedAt:new Date().toISOString(),
    },
    {
      id:'c003', name:'BSI Gadget', url:'https://www.bsigadget.com', logo:'',
      category:'portachiavi', zone:'Italia (online)',
      description:'Portachiavi bambù, legno, metallo. Min 160pz per bambù. Calcolatore preventivo online.',
      products:[
        {name:'Portachiavi bambù rotondo',      unit:0.65,qty10:null,qty50:null,qty100:null,note:'min 160pz, incisione laser'},
        {name:'Portachiavi legno faggio tondo', unit:0.80,qty10:null,qty50:null,qty100:null,note:'varie dimensioni'},
        {name:'Portachiavi bambù casa',         unit:0.90,qty10:null,qty50:null,qty100:null,note:'forma casetta, B2B'},
      ],
      minOrder:160, delivery:'10-14 gg', vatExcl:true,
      strengths:'Prezzi molto competitivi su grandi volumi, bambù FSC, ampia gamma',
      weaknesses:'Minimo molto alto (160pz), non adatto a piccoli ordini',
      threat:3, quality:3, priceComp:5, score:'B+',
      notes:'Ideale per grossisti/eventi. Non competono sul piccolo ordine.',
      updatedAt:new Date().toISOString(),
    },
    {
      id:'c004', name:'Madonie Gadget', url:'https://www.madoniegadget.it', logo:'',
      category:'locale', zone:'Palermo / Sicilia',
      description:'Artigianale siciliano. Portachiavi plexiglass specchiato, legno inciso laser. Prodotti tipici siciliani.',
      products:[
        {name:'Portachiavi plexiglass specchiato', unit:4.50,qty10:null,qty50:null,qty100:null,note:'plexiglass argentato/rosa/rosso'},
        {name:'Portachiavi legno ovale inciso',    unit:3.80,qty10:null,qty50:null,qty100:null,note:'legno, personalizzazione inclusa'},
        {name:'Portachiave "Ciuri Ciuri" siciliano',unit:5.90,qty10:null,qty50:null,qty100:null,note:'prodotto tipico Palermo'},
      ],
      minOrder:1, delivery:'7-10 gg', vatExcl:false,
      strengths:'LOCALE Sicilia, prodotti tipici, piccole tirature, WA diretto 348 4512039',
      weaknesses:'Prezzi retail alti, gamma limitata, no configuratore online',
      threat:5, quality:4, priceComp:2, score:'A',
      notes:'⚠️ COMPETITOR DIRETTO Palermo. Prezzi retail €3.80-5.90. Punto di forza: locale+tipico siciliano.',
      updatedAt:new Date().toISOString(),
    },
    {
      id:'c005', name:'IncisoLaser', url:'https://incisolaser.com', logo:'',
      category:'laser', zone:'Italia (online)',
      description:'Portachiavi vari in legno e plexiglass incisi al laser. Shopify store. Vasta gamma forme.',
      products:[
        {name:'Portachiavi legno personalizzato',   unit:3.50,qty10:null,qty50:null,qty100:null,note:'forma a scelta'},
        {name:'Portachiavi plexiglass varie forme', unit:3.20,qty10:null,qty50:null,qty100:null,note:'colori multipli'},
      ],
      minOrder:1, delivery:'10-15 gg', vatExcl:false,
      strengths:'Piccole tirature anche da 1pz, forme creative, plexiglass colorato',
      weaknesses:'Prezzi elevati retail, tempi lunghi',
      threat:3, quality:4, priceComp:2, score:'B',
      notes:'Retail/singoli pezzi. Competono su prodotti creativi unici.',
      updatedAt:new Date().toISOString(),
    },
    {
      id:'c006', name:'PersonalizzazioniLaser', url:'https://personalizzazionilaser.it', logo:'',
      category:'laser', zone:'Friuli / Italia',
      description:'Portachiavi, taglieri, orecchini legno, targhe plexiglass. Idee regalo personalizzate laser.',
      products:[
        {name:'Portachiavi incisione laser',       unit:5.00,qty10:null,qty50:null,qty100:null,note:'vari formati'},
        {name:'Tagliere in legno personalizzato',  unit:18.00,qty10:null,qty50:null,qty100:null,note:'cedro/faggio'},
        {name:'Targa plexiglass personalizzata',   unit:12.00,qty10:null,qty50:null,qty100:null,note:'da esterno/interno'},
      ],
      minOrder:1, delivery:'5-10 gg', vatExcl:false,
      strengths:'Gamma molto ampia (oltre portachiavi), retail e B2B',
      weaknesses:'Prezzi retail, non specializzati',
      threat:2, quality:3, priceComp:2, score:'C+',
      notes:'Più ampio del solo portachiavi. Bomboniere, gioielli legno, targhe.',
      updatedAt:new Date().toISOString(),
    },
    {
      id:'c007', name:'Tempio Laser', url:'https://tempiolaser.com', logo:'',
      category:'portachiavi', zone:'Tempio Pausania (SS) / Sardegna',
      description:'Portachiavi legno pioppo e plexiglass laser. Simile a EC Laser Studio. Min 10pz.',
      products:[
        {name:'Portachiavi legno pioppo 5x5 cm',   unit:1.80,qty10:18.00,qty50:null,qty100:null,note:'finitura naturale, incisione'},
        {name:'Portachiavi plexiglass 4x4 cm',     unit:1.60,qty10:16.00,qty50:null,qty100:null,note:'trasparente, altri colori su supplemento'},
      ],
      minOrder:10, delivery:'15 gg da conferma', vatExcl:false,
      strengths:'Qualità artigianale, piccole tirature, sim EC Laser',
      weaknesses:'Tempi lunghi, nessun ordine online diretto',
      threat:3, quality:4, priceComp:3, score:'B+',
      notes:'Identico modello EC Laser Studio. Prezzi ~uguali.',
      updatedAt:new Date().toISOString(),
    },
    {
      id:'c008', name:'HiGift', url:'https://www.higift.it', logo:'',
      category:'gadget', zone:'Italia (online)',
      description:'Gadget promozionali. Portachiavi personalizzati vari materiali. Campione prima dell\'ordine.',
      products:[
        {name:'Portachiavi bambù-metallo promozionale',unit:0.75,qty10:null,qty50:null,qty100:null,note:'min 50pz, vari modelli'},
        {name:'Portachiavi legno/bambù B2B',         unit:0.80,qty10:null,qty50:null,qty100:null,note:'min 50-100pz'},
      ],
      minOrder:50, delivery:'7-10 gg', vatExcl:true,
      strengths:'Campione disponibile, B2B professionale, ampia gamma',
      weaknesses:'Min order alto, meno artigianale',
      threat:3, quality:3, priceComp:4, score:'B',
      notes:'Buono per confronto prezzi B2B. Campione disponibile.',
      updatedAt:new Date().toISOString(),
    },
    {
      id:'c009', name:'GiftCampaign', url:'https://www.giftcampaign.it', logo:'',
      category:'gadget', zone:'Italia (online)',
      description:'Portachiavi in legno da €0.30. Serigrafia e laser. Consegna 7gg gratuita.',
      products:[
        {name:'Portachiavi legno rettangolare',     unit:0.30,qty10:null,qty50:null,qty100:null,note:'da €0.30, min 50pz prob.'},
        {name:'Portachiavi rotondo legno faggio',   unit:0.55,qty10:null,qty50:null,qty100:null,note:'laser o serigrafia'},
        {name:'Portachiavi bambù multifunzione',    unit:1.20,qty10:null,qty50:null,qty100:null,note:'con utensili integrati'},
      ],
      minOrder:50, delivery:'7 gg', vatExcl:true,
      strengths:'PREZZI MOLTO BASSI (da €0.30), consegna rapida 7gg, serigrafia e laser',
      weaknesses:'Qualità di base, focus su gadget promo non artigianale',
      threat:4, quality:2, priceComp:5, score:'B',
      notes:'⚠️ Prezzi aggressivi. Competono sul volume/promo. Qualità inferiore all\'artigianale.',
      updatedAt:new Date().toISOString(),
    },
    {
      id:'c010', name:'IdeaTaglioLaser', url:'https://www.ideatagliolaser.it', logo:'',
      category:'portachiavi', zone:'Italia (online)',
      description:'Portachiavi legno/plexiglass per B&B, hotel, ristoranti. Personalizzazione professionale.',
      products:[
        {name:'Portachiavi legno B&B personalizzato', unit:2.80,qty10:null,qty50:null,qty100:null,note:'target B&B e ospitalità'},
        {name:'Portachiavi plexiglass hotel',         unit:2.50,qty10:null,qty50:null,qty100:null,note:'logo hotel inciso'},
      ],
      minOrder:10, delivery:'10-15 gg', vatExcl:false,
      strengths:'Specializzati B&B/Hotel, qualità alta, consulenza personalizzata',
      weaknesses:'Nichia molto specifica, meno adatti per retail',
      threat:2, quality:5, priceComp:3, score:'B+',
      notes:'Target diverso (ospitalità). Non competitor diretto su retail.',
      updatedAt:new Date().toISOString(),
    },
    {
      id:'c011', name:'Laserando', url:'https://laserando.it', logo:'',
      category:'laser', zone:'Italia (online)',
      description:'Incisione laser plexiglass, legno, metallo + DTF + stampa UV. B2B e retail.',
      products:[
        {name:'Portachiavi plexiglass laser',       unit:2.90,qty10:null,qty50:null,qty100:null,note:'vari colori/forme'},
        {name:'T-shirt stampa DTF',                 unit:8.50,qty10:null,qty50:null,qty100:null,note:'solo stampa DTF'},
        {name:'Targa laser metallo',                unit:15.00,qty10:null,qty50:null,qty100:null,note:'metallo inciso'},
      ],
      minOrder:1, delivery:'7-12 gg', vatExcl:false,
      strengths:'Multi-tecnica (laser+DTF+UV), retail anche da 1pz',
      weaknesses:'Prezzi alti retail, gamma disomogenea',
      threat:3, quality:4, priceComp:2, score:'B',
      notes:'Interessante perché fa anche DTF come noi. Prezzi alti su piccole qty.',
      updatedAt:new Date().toISOString(),
    },
    {
      id:'c012', name:'Italian Style Diffusion', url:'https://italianstylediffusion.com', logo:'',
      category:'abbigliamento', zone:'Italia (online)',
      description:'Stampa laser + magliette DTF. Abbigliamento personalizzato professionale.',
      products:[
        {name:'T-shirt stampa DTF personalizzata',  unit:14.00,qty10:null,qty50:null,qty100:null,note:'DTF full color'},
        {name:'Felpa stampa laser',                 unit:28.00,qty10:null,qty50:null,qty100:null,note:'con laser'},
        {name:'T-shirt incisione+stampa combo',     unit:18.00,qty10:null,qty50:null,qty100:null,note:'combo tecnica'},
      ],
      minOrder:1, delivery:'10-14 gg', vatExcl:false,
      strengths:'Combo laser+abbigliamento come noi, qualità professionale',
      weaknesses:'Prezzi premium, tempi medio-lunghi',
      threat:4, quality:5, priceComp:2, score:'A',
      notes:'⚠️ COMPETITOR DIRETTO su abbigliamento. Prezzi €14-28/pz singolo.',
      updatedAt:new Date().toISOString(),
    },
    {
      id:'c013', name:'LaseroPrint (Etsy IT)', url:'https://www.etsy.com/it/shop/LaseroPrint', logo:'',
      category:'etsy', zone:'Etsy Italia',
      description:'Venditore Etsy portachiavi laser personalizzati. Alta valutazione. Prezzi retail.',
      products:[
        {name:'Portachiavi legno personalizzato',   unit:6.50,qty10:null,qty50:null,qty100:null,note:'Etsy, spedizione €2-3'},
        {name:'Portachiavi plexiglass nome',        unit:5.90,qty10:null,qty50:null,qty100:null,note:'Etsy Italia'},
        {name:'Set 2 portachiavi coppia',           unit:14.00,qty10:null,qty50:null,qty100:null,note:'Set coppia'},
      ],
      minOrder:1, delivery:'5-10 gg', vatExcl:false,
      strengths:'Alta visibilità Etsy, prezzi retail con margine alto, clienti italiani',
      weaknesses:'Solo retail, no volume, commission Etsy',
      threat:3, quality:4, priceComp:1, score:'B+',
      notes:'Confronto prezzi Etsy. Nostri prezzi B2B molto migliori.',
      updatedAt:new Date().toISOString(),
    },
    {
      id:'c014', name:'Stampa Sicilia (Palermo)', url:'https://www.stampasicilia.it', logo:'',
      category:'locale', zone:'Palermo / Sicilia',
      description:'Tipografia e stampa digitale Palermo. Gadget personalizzati, t-shirt, striscioni.',
      products:[
        {name:'T-shirt stampata Palermo',           unit:12.00,qty10:null,qty50:null,qty100:null,note:'DTF o serigrafia'},
        {name:'Gadget promozionale personalizzato', unit:3.50,qty10:null,qty50:null,qty100:null,note:'vario'},
      ],
      minOrder:10, delivery:'3-5 gg locale', vatExcl:false,
      strengths:'LOCALE Palermo, consegna rapida, offre T-shirt e gadget, ritiro in sede',
      weaknesses:'Gamma limitata, meno specializzato su laser',
      threat:4, quality:3, priceComp:3, score:'B+',
      notes:'⚠️ COMPETITOR LOCALE DIRETTO Palermo. Forte su t-shirt + gadget.',
      updatedAt:new Date().toISOString(),
    },
    {
      id:'c015', name:'Gadget48', url:'https://gadget48.com', logo:'',
      category:'gadget', zone:'Italia (online)',
      description:'Portachiavi incisione laser B2B. Prezzi volume. Ampia gamma gadget.',
      products:[
        {name:'Portachiavi laser legno',            unit:1.10,qty10:null,qty50:null,qty100:null,note:'~€1.10 min 50pz'},
        {name:'Portachiavi laser plexiglass',       unit:1.25,qty10:null,qty50:null,qty100:null,note:'colori vari'},
      ],
      minOrder:50, delivery:'8-12 gg', vatExcl:true,
      strengths:'Prezzi B2B competitivi, vasta gamma, online',
      weaknesses:'Min order 50pz, meno artigianale',
      threat:3, quality:3, priceComp:4, score:'B',
      notes:'Buono per confronto prezzi B2B volume.',
      updatedAt:new Date().toISOString(),
    },
  ];

  // ── Storage ───────────────────────────────────────────────────────────
  function load(){
    var data = null;
    try{ data = JSON.parse(localStorage.getItem(SK)||'null'); }catch(e){}
    if(!data || !data.length){
      store(DEFAULT_COMPETITORS);
      return DEFAULT_COMPETITORS.slice();
    }
    return data;
  }
  function store(d){ try{ localStorage.setItem(SK,JSON.stringify(d)); }catch(e){} }

  function filtered(){
    var all=load(), q=(_search||'').toLowerCase();
    if(q) all=all.filter(function(c){ return ((c.name||'')+(c.description||'')+(c.zone||'')+(c.notes||'')).toLowerCase().indexOf(q)>=0; });
    if(_cat) all=all.filter(function(c){ return c.category===_cat; });
    if(typeof _sortMode!=='undefined'&&_sortMode==='threat') all=all.sort(function(a,b){return (b.threat||0)-(a.threat||0);});
    return all;
  }

  // ── Render ────────────────────────────────────────────────────────────
  function render(){
    var el=document.getElementById('view-competitor');
    if(!el) return;
    var all=load(), shown=filtered();
    var H='<div style="padding:14px 18px;max-width:1400px;margin:0 auto">';

    // Header
    H+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px">';
    H+='<div style="display:flex;align-items:center;gap:12px">';
    H+='<div style="width:46px;height:46px;background:linear-gradient(135deg,#ef4444,#dc2626);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 4px 16px rgba(239,68,68,.3)">🏆</div>';
    H+='<div><h1 style="font-size:20px;font-weight:900;margin:0;color:var(--text)">Analisi Competitors</h1>';
    H+='<p style="font-size:11px;color:var(--text-muted);margin:2px 0 0">Laser · Portachiavi · Abbigliamento · Gadget · Palermo + Italia</p></div></div>';
    H+='<div style="display:flex;gap:7px;flex-wrap:wrap">';
    H+='<input value="'+(_search||'')+'" oninput="CompetitorsModule._setSearch(this.value)" placeholder="🔍 Cerca competitor..." style="padding:7px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;outline:none;min-width:180px">';
    H+='<button onclick="CompetitorsModule.openAdd()" style="padding:8px 16px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:800">+ Aggiungi</button>';
    H+='<button onclick="CompetitorsModule.openAddUrl()" style="padding:8px 14px;background:rgba(16,185,129,.12);color:#10b981;border:1.5px solid rgba(16,185,129,.3);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">🔗 Da URL</button>';
    H+='<button onclick="CompetitorsModule._sortByThreat()" style="padding:8px 12px;background:rgba(239,68,68,.08);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:9px;cursor:pointer;font-size:11px;font-weight:700" title="Ordina per livello minaccia">⚠️ Minaccia</button>';
    H+='<button onclick="CompetitorsModule._exportCSV()" style="padding:8px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:11px;color:var(--text-muted)">📊 Export</button>';
    H+='</div></div>';

    // Stats strip
    var local=all.filter(function(c){return c.category==='locale'||c.zone.indexOf('Palermo')>=0;}).length;
    var topThreat=all.filter(function(c){return c.threat>=4;}).length;
    var avgPrice=0, pCount=0;
    all.forEach(function(c){(c.products||[]).forEach(function(p){if(p.unit){avgPrice+=p.unit;pCount++;}});});
    avgPrice = pCount>0?(avgPrice/pCount).toFixed(2):0;

    H+='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin-bottom:14px">';
    [{ico:'🏆',l:'Competitors monitorati',v:all.length,c:'#ef4444'},
     {ico:'🏝️',l:'Locali Palermo/Sicilia',v:local,c:'#06b6d4'},
     {ico:'⚠️',l:'Alta minaccia (4-5)',v:topThreat,c:'#f59e0b'},
     {ico:'💶',l:'Prezzo medio prodotto',v:'€'+avgPrice,c:'#10b981'},
     {ico:'📊',l:'Filtrati ora',v:shown.length,c:'#818cf8'},
    ].forEach(function(k){
      H+='<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:11px;padding:10px 13px;display:flex;align-items:center;gap:9px">';
      H+='<span style="font-size:18px">'+k.ico+'</span>';
      H+='<div><div style="font-size:16px;font-weight:900;color:'+k.c+'">'+k.v+'</div><div style="font-size:10px;color:var(--text-muted)">'+k.l+'</div></div></div>';
    });
    H+='</div>';

    // Category pills
    H+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">';
    H+='<button onclick="CompetitorsModule._setCat(\'\')" style="padding:5px 12px;background:'+(!_cat?'rgba(239,68,68,.15)':'var(--bg-card2)')+';border:1.5px solid '+(!_cat?'#ef4444':'var(--border)')+';border-radius:99px;cursor:pointer;font-size:11px;color:'+(!_cat?'#ef4444':'var(--text-muted)')+';font-weight:'+(!_cat?700:400)+'">Tutti ('+all.length+')</button>';
    CATS.forEach(function(cat){
      var cnt=all.filter(function(c){return c.category===cat.id;}).length;
      if(!cnt) return;
      var isA=_cat===cat.id;
      H+='<button onclick="CompetitorsModule._setCat(\''+cat.id+'\')" style="padding:5px 12px;background:'+(isA?cat.color+'18':'var(--bg-card2)')+';border:1.5px solid '+(isA?cat.color+'60':'var(--border)')+';border-radius:99px;cursor:pointer;font-size:11px;color:'+(isA?cat.color:'var(--text-muted)')+';font-weight:'+(isA?700:400)+'">'+cat.icon+' '+cat.label+' ('+cnt+')</button>';
    });
    H+='</div>';

    // Grid
    if(!shown.length){
      H+='<div style="text-align:center;padding:60px;background:var(--bg-card2);border-radius:14px;border:2px dashed var(--border)">';
      H+='<div style="font-size:64px;margin-bottom:14px;opacity:.2">🏆</div>';
      H+='<div style="font-size:16px;font-weight:800;margin-bottom:8px">Nessun competitor trovato</div>';
      H+='<button onclick="CompetitorsModule.openAdd()" style="padding:10px 22px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">+ Aggiungi competitor</button>';
      H+='</div>';
    } else {
      H+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:13px">';
      shown.forEach(function(comp){
        H+=renderCard(comp);
      });
      H+='</div>';
    }
    H+='</div>';
    el.innerHTML=H;
  }

  function renderCard(comp){
    var catObj=CATS.find(function(c){return c.id===comp.category;})||{color:'#64748b',icon:'📌',label:'Altro'};
    var isLocal=comp.category==='locale'||comp.zone.indexOf('Palermo')>=0;
    var threatColor=comp.threat>=4?'#ef4444':comp.threat>=3?'#f59e0b':'#22c55e';
    var threatBg=comp.threat>=4?'rgba(239,68,68,.1)':comp.threat>=3?'rgba(245,158,11,.1)':'rgba(34,197,94,.1)';

    var H='<div style="background:var(--bg-card2);border:1.5px solid '+(isLocal?'rgba(6,182,212,.3)':'var(--border)')+';border-radius:13px;overflow:hidden;transition:.15s" onmouseover="this.style.boxShadow=\'0 6px 24px rgba(0,0,0,.25)\'" onmouseout="this.style.boxShadow=\'\'">';

    // Card header
    H+='<div style="padding:11px 14px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:10px">';
    H+='<div style="width:38px;height:38px;border-radius:10px;background:'+catObj.color+'18;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">'+catObj.icon+'</div>';
    H+='<div style="flex:1;min-width:0">';
    H+='<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">';
    H+='<span style="font-size:14px;font-weight:800;color:var(--text)">'+comp.name+'</span>';
    if(isLocal) H+='<span style="padding:2px 7px;background:rgba(6,182,212,.12);color:#06b6d4;border-radius:99px;font-size:9px;font-weight:800">📍 LOCALE</span>';
    if(comp.score) H+='<span style="padding:2px 7px;background:'+catObj.color+'12;color:'+catObj.color+';border-radius:99px;font-size:9px;font-weight:800">'+comp.score+'</span>';
    H+='</div>';
    H+='<div style="font-size:10px;color:var(--text-muted);margin-top:2px">'+catObj.icon+' '+comp.zone+'</div>';
    H+='</div>';
    H+='<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">';
    H+='<div style="padding:3px 9px;background:'+threatBg+';color:'+threatColor+';border-radius:99px;font-size:10px;font-weight:700">⚠️ Minaccia '+comp.threat+'/5</div>';
    H+='<div style="display:flex;gap:4px">';
    if(comp.url) H+='<a href="'+comp.url+'" target="_blank" rel="noopener" style="padding:4px 8px;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.2);border-radius:7px;font-size:10px;color:#60a5fa;text-decoration:none" onclick="event.stopPropagation()">🌐</a>';
    H+='<button onclick="CompetitorsModule.openEdit(\''+comp.id+'\')" style="padding:4px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:10px;color:var(--text-muted)">✏️</button>';
    H+='</div></div>';
    H+='</div>';

    // Description
    if(comp.description){
      H+='<div style="padding:9px 14px;font-size:11px;color:var(--text-muted);line-height:1.5;border-bottom:1px solid var(--border)">'+comp.description+'</div>';
    }

    // Products table
    if(comp.products&&comp.products.length){
      H+='<div style="padding:10px 14px;border-bottom:1px solid var(--border)">';
      H+='<div style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:7px">💰 Prezzi rilevati</div>';
      comp.products.forEach(function(p){
        H+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
        H+='<span style="flex:1;font-size:11px;color:var(--text)">'+p.name+'</span>';
        H+='<span style="font-size:13px;font-weight:900;color:#f59e0b">€'+parseFloat(p.unit||0).toFixed(2)+'</span>';
        if(p.note) H+='<span style="font-size:9px;color:var(--text-dim);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+p.note+'">'+p.note.slice(0,25)+'</span>';
        H+='</div>';
      });
      H+='</div>';
    }

    // Strengths/Weaknesses
    H+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-bottom:1px solid var(--border)">';
    if(comp.strengths){
      H+='<div style="padding:8px 11px;border-right:1px solid var(--border)">';
      H+='<div style="font-size:9px;font-weight:700;color:#22c55e;text-transform:uppercase;margin-bottom:4px">✅ Punti forza</div>';
      H+='<div style="font-size:10px;color:var(--text-muted);line-height:1.4">'+comp.strengths.slice(0,80)+'</div></div>';
    }
    if(comp.weaknesses){
      H+='<div style="padding:8px 11px">';
      H+='<div style="font-size:9px;font-weight:700;color:#ef4444;text-transform:uppercase;margin-bottom:4px">❌ Punti deboli</div>';
      H+='<div style="font-size:10px;color:var(--text-muted);line-height:1.4">'+comp.weaknesses.slice(0,80)+'</div></div>';
    }
    H+='</div>';

    // Footer info
    H+='<div style="padding:8px 14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:10px;color:var(--text-dim)">';
    if(comp.minOrder) H+='<span>🔢 Min: <strong style="color:var(--text-muted)">'+comp.minOrder+'pz</strong></span>';
    if(comp.delivery) H+='<span>⏱️ <strong style="color:var(--text-muted)">'+comp.delivery+'</strong></span>';
    if(comp.notes){
      H+='<span style="flex:1;font-size:9px;color:'+(comp.notes.indexOf('⚠️')>=0?'#f59e0b':'var(--text-dim)')+'">'+comp.notes.slice(0,50)+'</span>';
    }
    H+='<span style="margin-left:auto;font-size:9px;color:var(--text-dim)">'+new Date(comp.updatedAt||Date.now()).toLocaleDateString('it-IT')+'</span>';
    H+='</div>';

    H+='</div>';
    return H;
  }

  // ── Add/Edit Modal ─────────────────────────────────────────────────────
  function openAdd(){
    _openModal(null);
  }
  function openAddUrl(){
    var url=prompt('URL del sito competitor:','https://');
    if(!url||url==='https://')return;
    var domain=url.replace(/^https?:\/\/(www\.)?/,'').split('/')[0];
    _openModal({url:url, name:domain, category:'laser', zone:'Italia (online)', products:[], threat:3, minOrder:1});
  }
  function openEdit(id){
    var c=load().find(function(x){return x.id===id;});
    if(c) _openModal(c);
  }

  function _openModal(comp){
    var existing=document.getElementById('comp-modal'); if(existing)existing.remove();
    var ov=document.createElement('div');
    ov.id='comp-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};

    var catOpts=CATS.map(function(c){
      return '<option value="'+c.id+'"'+((comp&&comp.category===c.id)?' selected':'')+'>'+c.icon+' '+c.label+'</option>';
    }).join('');

    var prods=comp&&comp.products?comp.products:[];
    var prodRows=prods.map(function(p,i){
      return '<div style="display:grid;grid-template-columns:1fr 70px 1fr 24px;gap:6px;margin-bottom:6px" id="comp-prod-row-'+i+'">'
        +'<input value="'+(p.name||'').replace(/"/g,'&quot;')+'" placeholder="Nome prodotto..." style="padding:6px 9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;outline:none">'
        +'<input type="number" step="0.01" value="'+(p.unit||'')+'" placeholder="€" style="padding:6px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;outline:none;text-align:center">'
        +'<input value="'+(p.note||'').replace(/"/g,'&quot;')+'" placeholder="Note prezzo..." style="padding:6px 9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;outline:none">'
        +'<button onclick="this.closest(\'[id^=comp-prod-row]\').remove()" style="padding:4px 6px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:6px;cursor:pointer;font-size:12px;font-weight:800">✕</button>'
        +'</div>';
    }).join('');

    ov.innerHTML='<div style="background:var(--bg-card);border-radius:16px;width:min(640px,100%);max-height:92vh;overflow-y:auto;border:1px solid var(--border2)" onclick="event.stopPropagation()">'
      +'<div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;position:sticky;top:0;background:var(--bg-card);border-radius:16px 16px 0 0">'
      +'<span style="font-size:22px">🏆</span>'
      +'<span style="flex:1;font-size:15px;font-weight:800;color:var(--text)">'+(comp&&comp.id?'Modifica':'Nuovo')+' Competitor</span>'
      +'<button onclick="document.getElementById(\'comp-modal\').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:20px">✕</button>'
      +'</div>'
      +'<div style="padding:16px;display:flex;flex-direction:column;gap:11px">'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      +_cf('Nome azienda *','comp-f-name',comp&&comp.name,'Es. StampaSi...')
      +_cf('Sito web','comp-f-url',comp&&comp.url,'https://...')
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Categoria</label>'
      +'<select id="comp-f-cat" style="width:100%;padding:8px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;cursor:pointer;box-sizing:border-box">'+catOpts+'</select></div>'
      +_cf('Zona/Città','comp-f-zone',comp&&comp.zone,'Es. Palermo, Milano, Italia...')
      +'</div>'
      +_cf('Descrizione','comp-f-desc',comp&&comp.description,'Cosa vendono, specializzazione...')
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px">'
      +_cfn('Minaccia 1-5','comp-f-threat',comp&&comp.threat||3,'1','5')
      +_cfn('Qualità 1-5','comp-f-quality',comp&&comp.quality||3,'1','5')
      +_cfn('Prezzo-comp 1-5','comp-f-price',comp&&comp.priceComp||3,'1','5')
      +_cf('Score','comp-f-score',comp&&comp.score||'B','A+/A/B+/B/C')
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      +_cfn('Min. ordine (pz)','comp-f-minorder',comp&&comp.minOrder||1,'0')
      +_cf('Tempi consegna','comp-f-delivery',comp&&comp.delivery,'Es. 7-10 gg...')
      +'</div>'
      +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">💰 Prodotti / Prezzi</label>'
      +'<div id="comp-f-prods">'+prodRows+'</div>'
      +'<button onclick="CompetitorsModule._addProdRow()" style="padding:6px 12px;background:rgba(251,191,36,.1);color:#fbbf24;border:1px solid rgba(251,191,36,.3);border-radius:8px;cursor:pointer;font-size:11px;font-weight:700">+ Aggiungi prodotto</button></div>'
      +_cf('Punti di forza','comp-f-strengths',comp&&comp.strengths,'Prezzi bassi, veloce...')
      +_cf('Punti deboli','comp-f-weaknesses',comp&&comp.weaknesses,'Qualità bassa, min. alto...')
      +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Note interne</label>'
      +'<textarea id="comp-f-notes" rows="3" style="width:100%;padding:8px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;resize:vertical;box-sizing:border-box;font-family:inherit;outline:none">'+(comp&&comp.notes||'')+'</textarea></div>'
      +'<input type="hidden" id="comp-f-id" value="'+(comp&&comp.id||'')+'">'
      +'<div style="display:flex;gap:8px;padding-top:6px;border-top:1px solid var(--border)">'
      +(comp&&comp.id?'<button onclick="CompetitorsModule._delComp()" style="padding:10px 14px;background:rgba(239,68,68,.08);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:10px;cursor:pointer;font-size:12px">🗑</button>':'')
      +'<button onclick="document.getElementById(\'comp-modal\').remove()" style="flex:1;padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:12px;color:var(--text-muted)">Annulla</button>'
      +'<button onclick="CompetitorsModule._saveComp()" style="flex:2;padding:10px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva competitor</button>'
      +'</div></div></div>';
    document.body.appendChild(ov);
    setTimeout(function(){var t=document.getElementById('comp-f-name');if(t)t.focus();},80);
  }

  function _cf(label,id,val,ph){
    return '<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">'+label+'</label>'
      +'<input id="'+id+'" value="'+String(val||'').replace(/"/g,'&quot;')+'" placeholder="'+ph+'" style="width:100%;padding:8px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;outline:none;box-sizing:border-box"></div>';
  }
  function _cfn(label,id,val,min,max){
    return '<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">'+label+'</label>'
      +'<input id="'+id+'" type="number" value="'+(val||'')+'" min="'+(min||0)+'" max="'+(max||99)+'" style="width:100%;padding:8px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;outline:none;box-sizing:border-box"></div>';
  }

  function _addProdRow(){
    var container=document.getElementById('comp-f-prods'); if(!container)return;
    var idx=container.children.length;
    var row=document.createElement('div');
    row.id='comp-prod-row-'+idx;
    row.style.cssText='display:grid;grid-template-columns:1fr 70px 1fr 24px;gap:6px;margin-bottom:6px';
    row.innerHTML='<input value="" placeholder="Nome prodotto..." style="padding:6px 9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;outline:none">'
      +'<input type="number" step="0.01" value="" placeholder="€" style="padding:6px 8px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;outline:none;text-align:center">'
      +'<input value="" placeholder="Note prezzo..." style="padding:6px 9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;outline:none">'
      +'<button onclick="this.closest(\'[id^=comp-prod-row]\').remove()" style="padding:4px 6px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:6px;cursor:pointer;font-size:12px;font-weight:800">✕</button>';
    container.appendChild(row);
  }

  function _saveComp(){
    var name=(document.getElementById('comp-f-name').value||'').trim();
    if(!name){alert('Inserisci il nome del competitor');return;}
    var id=document.getElementById('comp-f-id').value||('c_'+Date.now());
    var products=[];
    document.querySelectorAll('#comp-f-prods [id^=comp-prod-row]').forEach(function(row){
      var inputs=row.querySelectorAll('input');
      if(inputs[0]&&inputs[0].value.trim()){
        products.push({name:inputs[0].value.trim(), unit:parseFloat(inputs[1].value)||0, note:inputs[2]?inputs[2].value.trim():''});
      }
    });
    var comp={
      id:id, name:name,
      url:(document.getElementById('comp-f-url').value||'').trim(),
      category:document.getElementById('comp-f-cat').value,
      zone:(document.getElementById('comp-f-zone').value||'').trim(),
      description:(document.getElementById('comp-f-desc').value||'').trim(),
      threat:parseInt(document.getElementById('comp-f-threat').value)||3,
      quality:parseInt(document.getElementById('comp-f-quality').value)||3,
      priceComp:parseInt(document.getElementById('comp-f-price').value)||3,
      score:(document.getElementById('comp-f-score').value||'B').trim(),
      minOrder:parseInt(document.getElementById('comp-f-minorder').value)||1,
      delivery:(document.getElementById('comp-f-delivery').value||'').trim(),
      products:products,
      strengths:(document.getElementById('comp-f-strengths').value||'').trim(),
      weaknesses:(document.getElementById('comp-f-weaknesses').value||'').trim(),
      notes:(document.getElementById('comp-f-notes').value||'').trim(),
      updatedAt:new Date().toISOString(),
    };
    var all=load(), idx=all.findIndex(function(x){return x.id===id;});
    if(idx>=0) all[idx]=comp; else all.unshift(comp);
    store(all);
    document.getElementById('comp-modal').remove();
    render();
    if(typeof toast!=='undefined') toast('🏆 '+comp.name+' salvato!','success');
  }

  function _delComp(){
    var id=document.getElementById('comp-f-id').value;
    if(!id||!confirm('Eliminare questo competitor?'))return;
    store(load().filter(function(c){return c.id!==id;}));
    document.getElementById('comp-modal').remove();
    render();
  }

  function _setSearch(q){ _search=q; render(); }
  function _setCat(cat){ _cat=cat; render(); }

  var _sortMode = 'default';
  function _sortByThreat(){
    _sortMode = _sortMode==='threat' ? 'default' : 'threat';
    render();
    if(typeof toast!=='undefined') toast(_sortMode==='threat'?'⚠️ Ordinato per minaccia':'📋 Ordine normale','info');
  }
  function _exportCSV(){
    var all=load();
    var hdr='Nome,Categoria,Zona,Minaccia,Score,Min Ordine,Note';
    var rows=[hdr];
    all.forEach(function(comp){
      var row=[comp.name||'',comp.category||'',comp.zone||'',comp.threat||'',comp.score||'',comp.minOrder||'',comp.notes||''];
      rows.push(row.map(function(v){return v.indexOf(',')>=0?'"'+v+'"':String(v);}).join(','));
    });
    var blob=new Blob([rows.join('\n')],{type:'text/csv'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='competitors-'+new Date().toISOString().slice(0,10)+'.csv';
    a.click();
    if(typeof toast!=='undefined') toast('CSV: '+all.length+' competitors esportati!','success');
  }

  return { render, openAdd, openAddUrl, openEdit, _saveComp, _delComp, _addProdRow, _setSearch, _setCat, _sortByThreat, _exportCSV };
})();


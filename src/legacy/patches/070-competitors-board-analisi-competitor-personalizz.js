
// ═══════════════════════════════════════════════════════════════════════════
// 🔍 COMPETITORS BOARD — Analisi competitor personalizzazione laser
// Palermo · Sicilia · Italia — Gadget legno/plexiglass/bambù, magliette, laser
// ═══════════════════════════════════════════════════════════════════════════
var CompetitorsBoard = (function(){
  'use strict';

  var SK = 'ingly_competitors_v1';
  var _view = 'dashboard';
  var _editCompId = null;
  var _filter = { zone:'', cat:'', search:'' };

  // ── Pre-loaded real competitor data ─────────────────────────────────────
  var SEED_DATA = [
    // PALERMO / SICILIA
    {
      id:'c_artevisiva', name:'Arte Visiva Palermo', zona:'Palermo', tipo:'locale',
      url:'https://www.artevisivapalermo.it', tel:'', email:'',
      categorie:['gadget','laser','abbigliamento'],
      note:'Via Oreto, 48 Palermo. Gadget aziendali personalizzati con logo. Grande selezione.',
      rating:3, minaccia:'media',
      prodotti:[
        {id:'p1', nome:'Gadget aziendali personalizzati', cat:'gadget', prezzoUnit:null, prezzoMinQty:null, minQty:null, url:'https://www.artevisivapalermo.it/i-servizi/gadget/', note:'Preventivo su richiesta', updated:'2026-01'},
      ]
    },
    {
      id:'c_4effe', name:'4EFFE Stampa e Grafica', zona:'Palermo', tipo:'locale',
      url:'', tel:'',  email:'',
      categorie:['stampa','gadget','abbigliamento'],
      note:'Palermo. Stampa, grafica, personalizzazioni, scansioni, allestimenti. Magliette e gadget.',
      rating:3, minaccia:'media',
      prodotti:[
        {id:'p1', nome:'Magliette personalizzate', cat:'abbigliamento', prezzoUnit:null, prezzoMinQty:null, minQty:null, url:'', note:'Preventivo su richiesta', updated:'2026-01'},
        {id:'p2', nome:'Banner e striscioni', cat:'gadget', prezzoUnit:null, prezzoMinQty:null, minQty:null, url:'', note:'Preventivo su richiesta', updated:'2026-01'},
      ]
    },
    {
      id:'c_nuova_elio', name:'Nuova Eliografica', zona:'Palermo', tipo:'locale',
      url:'', tel:'', email:'',
      categorie:['gadget','abbigliamento'],
      note:'Palermo. Timbri, targhette, biglietti da visita, personalizzazione gadget e magliette.',
      rating:3, minaccia:'bassa',
      prodotti:[
        {id:'p1', nome:'Magliette e gadget personalizzati', cat:'abbigliamento', prezzoUnit:null, prezzoMinQty:null, minQty:null, url:'', note:'Preventivo su richiesta', updated:'2026-01'},
      ]
    },
    {
      id:'c_tecnoplex', name:'Tecnoplex', zona:'Palermo', tipo:'locale',
      url:'', tel:'', email:'',
      categorie:['plexiglass','laser'],
      note:'Palermo. Specializzati nella lavorazione del plexiglass in tutte le sue forme. Potenziale competitor diretto.',
      rating:4, minaccia:'alta',
      prodotti:[
        {id:'p1', nome:'Lavorazione plexiglass personalizzata', cat:'laser', prezzoUnit:null, prezzoMinQty:null, minQty:null, url:'', note:'Su misura, contattare per preventivo', updated:'2026-01'},
      ]
    },
    {
      id:'c_amgprint', name:'AMG Print Palermo', zona:'Palermo', tipo:'locale',
      url:'', tel:'', email:'',
      categorie:['serigrafia','stampa'],
      note:'Palermo. Serigrafia — stampa su qualsiasi materiale. Competitor per magliette e gadget.',
      rating:3, minaccia:'media',
      prodotti:[
        {id:'p1', nome:'Serigrafia magliette', cat:'abbigliamento', prezzoUnit:null, prezzoMinQty:null, minQty:null, url:'', note:'Su richiesta', updated:'2026-01'},
      ]
    },
    // ITALIA — ONLINE
    {
      id:'c_laserando', name:'Laserando.it', zona:'Italia (online)', tipo:'online',
      url:'https://laserando.it', tel:'', email:'',
      categorie:['laser','plexiglass','legno','abbigliamento','dtf'],
      note:'Servizio completo: incisione laser plexiglass/metalli/vetro/tessuti, magliette DTF, targhe, ricami, patch. Fortissimo competitor online.',
      rating:5, minaccia:'alta',
      prodotti:[
        {id:'p1', nome:'Portachiavi plexiglass rotondo personalizzato', cat:'portachiavi', prezzoUnit:3.50, prezzoMinQty:null, minQty:1, url:'https://laserando.it/prodotto/portachiavi-personalizzabile-in-plexiglass-rotondo/', note:'Prezzo singolo (prototipo)', updated:'2026-01'},
        {id:'p2', nome:'Maglietta personalizzata DTF', cat:'abbigliamento', prezzoUnit:null, prezzoMinQty:null, minQty:null, url:'https://laserando.it', note:'Preventivo su richiesta', updated:'2026-01'},
        {id:'p3', nome:'Targa legno personalizzata laser', cat:'laser', prezzoUnit:null, prezzoMinQty:null, minQty:null, url:'https://laserando.it', note:'Grandi e piccoli formati', updated:'2026-01'},
      ]
    },
    {
      id:'c_laserizzami', name:'Laserizzami.com', zona:'Corato (BA)', tipo:'online',
      url:'https://www.laserizzami.com', tel:'', email:'',
      categorie:['laser','portachiavi','legno','plexiglass'],
      note:'M3DO di Domenico Marcone, Via Palermo 24 Corato (BA). Portachiavi personalizzati in legno, plexiglass e acciaio. Incisione laser.',
      rating:4, minaccia:'alta',
      prodotti:[
        {id:'p1', nome:'Portachiavi legno personalizzato laser', cat:'portachiavi', prezzoUnit:null, prezzoMinQty:null, minQty:null, url:'https://www.laserizzami.com/portachiavi-personalizzati', note:'Legno, plexiglass, acciaio', updated:'2026-01'},
        {id:'p2', nome:'Portachiavi plexiglass inciso', cat:'portachiavi', prezzoUnit:null, prezzoMinQty:null, minQty:null, url:'https://www.laserizzami.com', note:'Su richiesta', updated:'2026-01'},
      ]
    },
    {
      id:'c_bsigadget', name:'BSI Gadget', zona:'Italia (online)', tipo:'online',
      url:'https://www.bsigadget.com', tel:'', email:'',
      categorie:['gadget','legno','bambù','laser'],
      note:'Portachiavi in legno e bambù personalizzati. Prezzi visibili online con preventivatore. Ottima selezione B2B. Prezzi da ~€0.45/pz.',
      rating:5, minaccia:'alta',
      prodotti:[
        {id:'p1', nome:'Portachiavi bambù rotondo laser', cat:'portachiavi', prezzoUnit:0.65, prezzoMinQty:0.45, minQty:100, url:'https://www.bsigadget.com/it/portachiavi-in-legno-personalizzati.html', note:'~€0.45-0.65 a seconda qtà', updated:'2026-01'},
        {id:'p2', nome:'Portachiavi legno faggio incisione', cat:'portachiavi', prezzoUnit:0.70, prezzoMinQty:0.50, minQty:50, url:'https://www.bsigadget.com', note:'Incisione laser inclusa', updated:'2026-01'},
      ]
    },
    {
      id:'c_stampasi', name:'StampaSi.it', zona:'Italia (online)', tipo:'online',
      url:'https://www.stampasi.it', tel:'', email:'',
      categorie:['laser','portachiavi','gadget','abbigliamento'],
      note:'Piattaforma online grande selezione portachiavi laser. Metallo, legno, bambù. Spedizione rapida.',
      rating:4, minaccia:'alta',
      prodotti:[
        {id:'p1', nome:'Portachiavi legno faggio rettangolare', cat:'portachiavi', prezzoUnit:0.80, prezzoMinQty:0.55, minQty:50, url:'https://www.stampasi.it/portachiavi-personalizzati-incisione-laser', note:'Prezzi indicativi, dipende qtà', updated:'2026-01'},
        {id:'p2', nome:'Portachiavi bambù con cordino', cat:'portachiavi', prezzoUnit:0.90, prezzoMinQty:0.65, minQty:50, url:'https://www.stampasi.it', note:'Vari modelli bambù/legno', updated:'2026-01'},
      ]
    },
    {
      id:'c_eclaser', name:'EC Laser Studio', zona:'Italia (online)', tipo:'online',
      url:'https://www.eclaserstudio.com', tel:'', email:'info@eclaserstudio.com',
      categorie:['laser','legno','plexiglass','portachiavi'],
      note:'Portachiavi personalizzati economici in legno e plexiglass. Taglio laser sagomato. Modelli classici e forme custom. Preventivo online.',
      rating:4, minaccia:'alta',
      prodotti:[
        {id:'p1', nome:'Portachiavi legno betulla 6x3cm laser', cat:'portachiavi', prezzoUnit:1.50, prezzoMinQty:0.80, minQty:10, url:'https://www.eclaserstudio.com/portachiavi-personalizzati-legno-plexiglass/portachiavi-sagomato/', note:'Incisione inclusa, finitura naturale', updated:'2026-01'},
        {id:'p2', nome:'Portachiavi plexiglass sagomato', cat:'portachiavi', prezzoUnit:1.80, prezzoMinQty:1.20, minQty:10, url:'https://www.eclaserstudio.com/portachiavi-personalizzati-legno-plexiglass/', note:'Qualsiasi forma/dimensione', updated:'2026-01'},
      ]
    },
    {
      id:'c_alterego', name:'AlterEgo Custom Shop', zona:'Italia (online)', tipo:'online',
      url:'https://www.alteregocustom.shop', tel:'3315003906', email:'info@alteregostore.it',
      categorie:['plexiglass','laser','portachiavi'],
      note:'100 portachiavi plexiglass €129 IVA inclusa (€1.29/pz). Sagomati, incisione laser o stampa UV a colori. Bozza grafica gratuita. Spedizione inclusa.',
      rating:4, minaccia:'alta',
      prodotti:[
        {id:'p1', nome:'100 portachiavi plexiglass sagomati laser', cat:'portachiavi', prezzoUnit:1.29, prezzoMinQty:1.29, minQty:100, url:'https://www.alteregocustom.shop/prodotto/portachiavi-in-plexiglass/', note:'€129 IVA incl. per 100pz. Spedizione gratuita. Bozza gratuita.', updated:'2026-01'},
      ]
    },
    {
      id:'c_higift', name:'HiGift.it', zona:'Italia (online)', tipo:'online',
      url:'https://www.higift.it', tel:'', email:'',
      categorie:['gadget','bambù','legno','laser'],
      note:'Portachiavi bambù da €0.69 per 150pz. Offerte flash. B2B gadget promozionali. Grande catalogo.',
      rating:4, minaccia:'alta',
      prodotti:[
        {id:'p1', nome:'Portachiavi bambù rotondo con cordino', cat:'portachiavi', prezzoUnit:0.77, prezzoMinQty:0.69, minQty:150, url:'https://www.higift.it/chiavi-e-strumenti/portachiavi-personalizzati/portachiavi-in-legno-personalizzati', note:'Offerta flash -10%. Min 150pz.', updated:'2026-01'},
        {id:'p2', nome:'Portachiavi bambù rettangolare laser', cat:'portachiavi', prezzoUnit:0.85, prezzoMinQty:0.70, minQty:100, url:'https://www.higift.it', note:'Ideale incisione laser', updated:'2026-01'},
      ]
    },
    {
      id:'c_giftcamp', name:'GiftCampaign.it', zona:'Italia (online)', tipo:'online',
      url:'https://www.giftcampaign.it', tel:'', email:'',
      categorie:['gadget','legno','bambù','laser'],
      note:'Portachiavi in legno da €0.30/pz. Sughero, bambù, faggio, betulla. Incisione laser, tampografia. Ottimi prezzi unitari.',
      rating:4, minaccia:'alta',
      prodotti:[
        {id:'p1', nome:'Portachiavi legno faggio rettangolare', cat:'portachiavi', prezzoUnit:0.50, prezzoMinQty:0.30, minQty:100, url:'https://www.giftcampaign.it/portachiavi-personalizzati/portachiavi-personalizzati-legno.html', note:'Da €0.30/pz per grandi qtà', updated:'2026-01'},
        {id:'p2', nome:'Portachiavi bambù ecologico laser', cat:'portachiavi', prezzoUnit:0.55, prezzoMinQty:0.35, minQty:100, url:'https://www.giftcampaign.it', note:'Eco-friendly, logo inciso', updated:'2026-01'},
      ]
    },
    {
      id:'c_ital_style', name:'Italian Style Diffusion', zona:'Italia (online)', tipo:'online',
      url:'https://italianstylediffusion.com', tel:'', email:'',
      categorie:['abbigliamento','laser','plexiglass'],
      note:'Magliette personalizzate + incisione laser CO2. Portachiavi plexiglass 5mm. Sottopentola ceramica, tovagliette sughero. Buon mix laser+abbigliamento.',
      rating:4, minaccia:'alta',
      prodotti:[
        {id:'p1', nome:'Portachiavi plexiglass colato 5mm laser', cat:'portachiavi', prezzoUnit:null, prezzoMinQty:null, minQty:null, url:'https://italianstylediffusion.com', note:'Plexiglass 5mm alta precisione', updated:'2026-01'},
        {id:'p2', nome:'Maglietta personalizzata 100% cotone', cat:'abbigliamento', prezzoUnit:18.00, prezzoMinQty:12.00, minQty:5, url:'https://italianstylediffusion.com', note:'S-3XL, 13 colori, stampa personalizzata', updated:'2026-01'},
      ]
    },
    {
      id:'c_lasero', name:'Lasero.it', zona:'Italia (online)', tipo:'online',
      url:'https://www.lasero.it', tel:'', email:'',
      categorie:['laser','plexiglass','legno','gadget','abbigliamento'],
      note:'Gadget aziendali personalizzati. Taglio laser, stampa UV, sublimazione, fresatura. Plexiglass, legno, metallo, tessuti. Night light, portachiavi, lampade.',
      rating:5, minaccia:'alta',
      prodotti:[
        {id:'p1', nome:'Portachiavi plexiglass/legno personalizzato', cat:'portachiavi', prezzoUnit:null, prezzoMinQty:null, minQty:null, url:'https://www.lasero.it/gadget-personalizzati/', note:'Preventivo su richiesta', updated:'2026-01'},
        {id:'p2', nome:'Lampade personalizzate plexiglass', cat:'laser', prezzoUnit:null, prezzoMinQty:null, minQty:null, url:'https://www.lasero.it', note:'Night light plexiglass incisa', updated:'2026-01'},
      ]
    },
    {
      id:'c_ideatalio', name:'IdeataglioLaser.it', zona:'Italia (online)', tipo:'online',
      url:'https://www.ideatagliolaser.it', tel:'', email:'',
      categorie:['laser','legno','plexiglass','portachiavi'],
      note:'Portachiavi legno e plexiglass per B&B, hotel, alberghi. Personalizzazione con incisione laser o stampa UV. Clienti B2B strutture ricettive.',
      rating:3, minaccia:'media',
      prodotti:[
        {id:'p1', nome:'Portachiavi legno/plexiglass per B&B', cat:'portachiavi', prezzoUnit:null, prezzoMinQty:null, minQty:null, url:'https://www.ideatagliolaser.it/portachiavi-gadget-legno-plexiglas', note:'Per strutture ricettive hotel B&B', updated:'2026-01'},
      ]
    },
    {
      id:'c_gadget48', name:'Gadget48.com', zona:'Italia (online)', tipo:'online',
      url:'https://www.gadget48.com', tel:'', email:'',
      categorie:['laser','portachiavi','gadget'],
      note:'Portachiavi incisione laser. Metallo, legno, plastica. Eleganti gadget promozionali B2B.',
      rating:3, minaccia:'media',
      prodotti:[
        {id:'p1', nome:'Portachiavi incisione laser metallo', cat:'portachiavi', prezzoUnit:null, prezzoMinQty:null, minQty:null, url:'https://www.gadget48.com/portachiavi-personalizzati/portachiavi-incisione-laser/', note:'Metallo, legno, plastica', updated:'2026-01'},
      ]
    },
  ];

  var CATS = [
    {id:'portachiavi', label:'Portachiavi',         icon:'🔑', color:'#6366f1'},
    {id:'abbigliamento',label:'Abbigliamento/DTF',  icon:'👕', color:'#ec4899'},
    {id:'laser',       label:'Laser/Incisione',     icon:'⚡', color:'#f97316'},
    {id:'gadget',      label:'Gadget Aziendali',    icon:'🎁', color:'#0891b2'},
    {id:'plexiglass',  label:'Plexiglass',          icon:'💎', color:'#7c3aed'},
    {id:'legno',       label:'Legno',               icon:'🪵', color:'#92400e'},
    {id:'stampa',      label:'Stampa Digitale',     icon:'🖨️', color:'#059669'},
    {id:'serigrafia',  label:'Serigrafia',          icon:'🎨', color:'#be185d'},
    {id:'dtf',         label:'DTF/Sublimazione',    icon:'🎯', color:'#0284c7'},
    {id:'bambù',       label:'Bambù/Eco',           icon:'🌿', color:'#16a34a'},
  ];

  var PROD_CATS = ['portachiavi','abbigliamento','laser','gadget','plexiglass','legno','targa','altro'];

  var MINACCIA = [
    {id:'alta',  label:'⚠️ Alta',  color:'#ef4444', bg:'rgba(239,68,68,.12)'},
    {id:'media', label:'🟡 Media', color:'#f59e0b', bg:'rgba(245,158,11,.12)'},
    {id:'bassa', label:'🟢 Bassa', color:'#22c55e', bg:'rgba(34,197,94,.12)'},
  ];

  // ── Storage ────────────────────────────────────────────────────────────────
  function load(){
    try{
      var d = JSON.parse(localStorage.getItem(SK)||'null');
      if(!d||!d.length){ store(SEED_DATA); return JSON.parse(JSON.stringify(SEED_DATA)); }
      return d;
    }catch(e){ return JSON.parse(JSON.stringify(SEED_DATA)); }
  }
  function store(d){ try{localStorage.setItem(SK,JSON.stringify(d));}catch(e){} }

  // ── Render ────────────────────────────────────────────────────────────────
  function render(){
    var el=document.getElementById('view-competitors'); if(!el)return;
    if(_view==='dashboard') _renderDash(el);
    else if(_view==='detail') _renderDetail(el,_editCompId);
    else if(_view==='compare') _renderCompare(el);
  }

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  function _renderDash(el){
    var data=load();
    var zoneFilter=_filter.zone, catFilter=_filter.cat, search=(_filter.search||'').toLowerCase();
    var filtered=data.filter(function(c){
      if(zoneFilter&&c.zona!==zoneFilter)return false;
      if(catFilter&&(!c.categorie||c.categorie.indexOf(catFilter)<0))return false;
      if(search&&(c.name+c.zona+c.note).toLowerCase().indexOf(search)<0)return false;
      return true;
    });

    var zones=[...new Set(data.map(function(c){return c.zona;}))].sort();
    var palermo=data.filter(function(c){return c.zona.includes('Palermo')||c.zona.includes('Sicilia');});
    var online=data.filter(function(c){return c.tipo==='online';});
    var highThreat=data.filter(function(c){return c.minaccia==='alta';});

    var H='<div style="padding:16px 20px;max-width:1400px;margin:0 auto">';

    // Header
    H+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:18px">';
    H+='<div style="display:flex;align-items:center;gap:13px">';
    H+='<div style="width:48px;height:48px;background:linear-gradient(135deg,#f97316,#ea580c);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 4px 18px rgba(249,115,22,.3)">🔍</div>';
    H+='<div><h1 style="font-size:20px;font-weight:900;margin:0;color:var(--text)">Competitor Monitor</h1><p style="font-size:11px;color:var(--text-muted);margin:2px 0 0">Personalizzazione laser · Gadget · Abbigliamento · Palermo & Italia</p></div></div>';
    H+='<div style="display:flex;gap:7px;flex-wrap:wrap">';
    H+='<button onclick="CompetitorsBoard.openAddModal()" style="padding:9px 18px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">+ Aggiungi</button>';
    H+='<button onclick="CompetitorsBoard.setView(\'compare\')" style="padding:8px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:12px;color:var(--text-muted)">📊 Prezzi</button>';
    H+='<button onclick="CompetitorsBoard.resetToSeed()" style="padding:8px 14px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:10px;cursor:pointer;font-size:12px;color:#ef4444" title="Ripristina dati originali ricerca">🔄 Reset dati</button>';
    H+='</div></div>';

    // KPIs
    H+='<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">';
    [
      {ico:'🔍',l:'Totale competitor', v:data.length,       c:'#f97316'},
      {ico:'📍',l:'Palermo/Sicilia',   v:palermo.length,    c:'#ec4899'},
      {ico:'🌐',l:'Online Italia',     v:online.length,     c:'#6366f1'},
      {ico:'⚠️',l:'Alta minaccia',    v:highThreat.length, c:'#ef4444'},
      {ico:'🔑',l:'Prodotti monitorati',v:data.reduce(function(s,c){return s+(c.prodotti||[]).length;},0), c:'#10b981'},
    ].forEach(function(k){
      H+='<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px">';
      H+='<span style="font-size:20px">'+k.ico+'</span>';
      H+='<div><div style="font-size:18px;font-weight:900;color:'+k.c+'">'+k.v+'</div><div style="font-size:10px;color:var(--text-muted)">'+k.l+'</div></div></div>';
    });
    H+='</div>';

    // Filters
    H+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center">';
    H+='<input value="'+(search||'')+'" oninput="CompetitorsBoard.setFilter(\'search\',this.value)" placeholder="🔍 Cerca competitor..." style="flex:1;min-width:200px;padding:8px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;outline:none">';
    // Zone pills
    var zoneAll=[{l:'Tutte zone',v:''},...zones.map(function(z){return{l:z,v:z};})];
    zoneAll.forEach(function(z){
      var a=zoneFilter===z.v;
      H+='<button onclick="CompetitorsBoard.setFilter(\'zone\',\''+z.v+'\')" style="padding:5px 12px;background:'+(a?'rgba(249,115,22,.15)':'var(--bg-card2)')+';border:1.5px solid '+(a?'#f97316':'var(--border)')+';border-radius:99px;cursor:pointer;font-size:11px;color:'+(a?'#f97316':'var(--text-muted)')+';font-weight:'+(a?700:400)+'">'+z.l+'</button>';
    });
    // Cat filter
    H+='<select onchange="CompetitorsBoard.setFilter(\'cat\',this.value)" style="padding:7px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:11px;cursor:pointer">';
    H+='<option value="">Tutte categorie</option>';
    CATS.forEach(function(c){ H+='<option value="'+c.id+'"'+(catFilter===c.id?' selected':'')+'>'+c.icon+' '+c.label+'</option>'; });
    H+='</select>';
    H+='</div>';

    // Competitor grid
    if(!filtered.length){
      H+='<div style="text-align:center;padding:50px;background:var(--bg-card2);border-radius:14px;border:2px dashed var(--border)">';
      H+='<div style="font-size:48px;margin-bottom:12px;opacity:.3">🔍</div>';
      H+='<div style="font-size:14px;color:var(--text-muted)">Nessun competitor trovato</div>';
      H+='</div>';
    } else {
      H+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">';
      filtered.forEach(function(comp){
        var min=MINACCIA.find(function(m){return m.id===comp.minaccia;})||MINACCIA[1];
        var stars='★'.repeat(comp.rating||0)+'☆'.repeat(5-(comp.rating||0));
        var isLocal=comp.tipo==='locale';
        var cats=(comp.categorie||[]).slice(0,4).map(function(cid){
          var co=CATS.find(function(x){return x.id===cid;})||{icon:'📌',color:'#475569',label:cid};
          return '<span style="padding:2px 7px;background:'+co.color+'15;color:'+co.color+';border-radius:99px;font-size:9px;font-weight:700">'+co.icon+' '+co.label+'</span>';
        }).join('');
        var prods=(comp.prodotti||[]).filter(function(p){return p.prezzoUnit||p.prezzoMinQty;});

        H+='<div style="background:var(--bg-card2);border:1.5px solid var(--border);border-radius:13px;overflow:hidden;transition:.15s;cursor:pointer" onclick="CompetitorsBoard.openDetail(\''+comp.id+'\')" onmouseover="this.style.boxShadow=\'0 6px 20px rgba(0,0,0,.25)\';this.style.borderColor=\'#f97316\';" onmouseout="this.style.boxShadow=\'\';this.style.borderColor=\'var(--border)\'">';

        // Header
        H+='<div style="padding:12px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">';
        H+='<div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,'+(isLocal?'#ec4899,#db2777':'#f97316,#ea580c')+');display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">'+(isLocal?'📍':'🌐')+'</div>';
        H+='<div style="flex:1;min-width:0">';
        H+='<div style="font-size:13px;font-weight:800;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+comp.name+'</div>';
        H+='<div style="font-size:10px;color:var(--text-muted)">'+comp.zona+'</div>';
        H+='</div>';
        H+='<span style="padding:3px 9px;background:'+min.bg+';color:'+min.color+';border-radius:99px;font-size:10px;font-weight:700;flex-shrink:0">'+min.label+'</span>';
        H+='</div>';

        H+='<div style="padding:11px 14px">';
        // Categories
        if(cats) H+='<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:9px">'+cats+'</div>';
        // Note preview
        if(comp.note) H+='<div style="font-size:11px;color:var(--text-muted);line-height:1.5;margin-bottom:9px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">'+comp.note+'</div>';

        // Price preview
        if(prods.length){
          H+='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:7px 10px;margin-bottom:9px">';
          H+='<div style="font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:5px">💶 Prezzi prodotti</div>';
          prods.slice(0,3).forEach(function(p){
            H+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">';
            H+='<span style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px">'+p.nome.slice(0,35)+'</span>';
            H+='<span style="font-size:12px;font-weight:800;color:#10b981;flex-shrink:0">€'+(p.prezzoMinQty||p.prezzoUnit||0).toFixed(2)+(p.minQty&&p.minQty>1?' /'+p.minQty+'pz':'')+'</span>';
            H+='</div>';
          });
          H+='</div>';
        }

        // Actions
        H+='<div style="display:flex;gap:6px">';
        if(comp.url) H+='<a href="'+comp.url+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="flex:1;padding:6px;background:rgba(96,165,250,.08);color:#60a5fa;border:1px solid rgba(96,165,250,.2);border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;text-align:center;text-decoration:none">🌐 Sito</a>';
        H+='<button onclick="event.stopPropagation();CompetitorsBoard.openDetail(\''+comp.id+'\')" style="flex:1;padding:6px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;color:var(--text-muted)">✏️ Modifica</button>';
        H+='<button onclick="event.stopPropagation();CompetitorsBoard.deleteComp(\''+comp.id+'\')" style="padding:6px 9px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:8px;cursor:pointer;font-size:11px;color:#ef4444" title="Elimina">🗑</button>';
        H+='</div></div></div>';
      });
      H+='</div>';
    }
    H+='</div>';
    el.innerHTML=H;
  }

  // ── PRICE COMPARISON ────────────────────────────────────────────────────────
  function _renderCompare(el){
    var data=load();
    var H='<div style="padding:16px 20px;max-width:1400px;margin:0 auto">';
    H+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">';
    H+='<button onclick="CompetitorsBoard.setView(\'dashboard\')" style="padding:7px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)">← Indietro</button>';
    H+='<h2 style="font-size:18px;font-weight:900;color:var(--text);margin:0">📊 Confronto Prezzi Mercato</h2></div>';

    // Group products by category
    var bycat = {};
    data.forEach(function(comp){
      (comp.prodotti||[]).forEach(function(p){
        if(!p.prezzoUnit&&!p.prezzoMinQty) return;
        var cat=p.cat||'altro';
        if(!bycat[cat]) bycat[cat]=[];
        bycat[cat].push({comp:comp.name, zona:comp.zona, url:comp.url, prodUrl:p.url, nome:p.nome, prezzo:p.prezzoMinQty||p.prezzoUnit, prezzoSing:p.prezzoUnit, prezzoMin:p.prezzoMinQty, minQty:p.minQty, note:p.note});
      });
    });

    Object.keys(bycat).forEach(function(cat){
      var items=bycat[cat].sort(function(a,b){return (a.prezzo||0)-(b.prezzo||0);});
      var catObj=CATS.find(function(c){return c.id===cat;})||{icon:'📌',color:'#475569',label:cat};
      H+='<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:14px">';
      H+='<div style="padding:10px 16px;background:'+catObj.color+'15;border-bottom:2px solid '+catObj.color+'30;display:flex;align-items:center;gap:8px">';
      H+='<span style="font-size:18px">'+catObj.icon+'</span>';
      H+='<span style="font-size:13px;font-weight:800;color:'+catObj.color+'">'+catObj.label+'</span>';
      H+='<span style="font-size:11px;color:var(--text-muted)">'+items.length+' prezzi trovati</span>';
      H+='</div>';
      H+='<div style="display:grid;grid-template-columns:2fr 1fr 80px 80px 80px 1fr;padding:7px 16px;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;background:var(--bg-card)">';
      ['Prodotto/Competitor','Zona','Unitario','Min qty','Prezzo min','Note'].forEach(function(h){H+='<div>'+h+'</div>';});
      H+='</div>';
      var minPrice=items[0]?items[0].prezzo:0;
      items.forEach(function(item,idx){
        var isMin=idx===0;
        H+='<div style="display:grid;grid-template-columns:2fr 1fr 80px 80px 80px 1fr;padding:10px 16px;border-top:1px solid var(--border);align-items:center;background:'+(isMin?catObj.color+'06':'transparent')+'">';
        H+='<div><div style="font-size:12px;font-weight:700;color:var(--text)">'+item.nome.slice(0,45)+'</div>';
        H+='<div style="font-size:10px;color:var(--text-muted)">'+item.comp+'</div></div>';
        H+='<div style="font-size:11px;color:var(--text-muted)">'+item.zona+'</div>';
        H+='<div style="font-size:12px;font-weight:700;color:var(--text)">'+(item.prezzoSing?'€'+item.prezzoSing.toFixed(2):'—')+'</div>';
        H+='<div style="font-size:11px;color:var(--text-muted)">'+(item.minQty||1)+' pz</div>';
        H+='<div style="font-size:13px;font-weight:900;color:'+(isMin?'#22c55e':item.prezzo>minPrice*1.5?'#ef4444':'var(--text)')+'">€'+item.prezzo.toFixed(2)+(isMin?' 🏆':'')+'</div>';
        H+='<div style="font-size:10px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+( item.note||'')+'</div>';
        H+='</div>';
      });
      H+='</div>';
    });

    H+='</div>';
    el.innerHTML=H;
  }

  // ── DETAIL / EDIT VIEW ───────────────────────────────────────────────────
  function _renderDetail(el, compId){
    var data=load();
    var comp=data.find(function(x){return x.id===compId;});
    if(!comp){_view='dashboard';return _renderDash(el);}
    var min=MINACCIA.find(function(m){return m.id===comp.minaccia;})||MINACCIA[1];

    var H='<div style="padding:16px 20px;max-width:1000px;margin:0 auto">';
    H+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">';
    H+='<button onclick="CompetitorsBoard.setView(\'dashboard\')" style="padding:7px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)">← Indietro</button>';
    H+='<h2 style="font-size:17px;font-weight:900;color:var(--text);margin:0;flex:1">'+comp.name+'</h2>';
    H+='<span style="padding:4px 12px;background:'+min.bg+';color:'+min.color+';border-radius:99px;font-size:11px;font-weight:700">'+min.label+'</span>';
    if(comp.url) H+='<a href="'+comp.url+'" target="_blank" style="padding:8px 14px;background:rgba(96,165,250,.08);color:#60a5fa;border:1px solid rgba(96,165,250,.2);border-radius:9px;font-size:12px;font-weight:700;text-decoration:none">🌐 Visita sito</a>';
    H+='</div>';

    // Edit form
    H+='<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:14px">';
    H+='<div style="font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;margin-bottom:12px">📋 Informazioni competitor</div>';
    H+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px">';
    H+=_df('Nome','cd-name',comp.name,'Nome competitor...');
    H+=_df('Zona','cd-zona',comp.zona,'Palermo, Milano, Italia (online)...');
    H+=_df('URL sito','cd-url',comp.url,'https://...');
    H+=_df('Telefono','cd-tel',comp.tel||'','...');
    H+=_df('Email','cd-email',comp.email||'','info@...');
    H+='<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Minaccia</label>'
      +'<select id="cd-min" style="width:100%;padding:8px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;cursor:pointer;box-sizing:border-box">';
    MINACCIA.forEach(function(m){H+='<option value="'+m.id+'"'+(comp.minaccia===m.id?' selected':'')+'>'+m.label+'</option>';});
    H+='</select></div>';
    H+='</div>';
    H+='<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Note / Analisi</label>';
    H+='<textarea id="cd-note" rows="3" style="width:100%;padding:8px 11px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;resize:vertical;box-sizing:border-box;font-family:inherit;outline:none">'+( comp.note||'')+'</textarea></div>';
    H+='<div style="display:flex;gap:8px;margin-top:10px">';
    H+='<button onclick="CompetitorsBoard._saveComp(\''+comp.id+'\')" style="padding:9px 20px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:800">💾 Salva modifiche</button>';
    H+='</div>';
    H+='</div>';

    // Products table
    H+='<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:14px">';
    H+='<div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">';
    H+='<span style="font-size:12px;font-weight:800;color:var(--text)">🔑 Prodotti monitorati <span style="font-size:11px;font-weight:400;color:var(--text-muted)">'+(comp.prodotti||[]).length+'</span></span>';
    H+='<button onclick="CompetitorsBoard._addProd(\''+comp.id+'\')" style="padding:6px 14px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:11px;font-weight:800">+ Aggiungi prodotto</button>';
    H+='</div>';
    if(!(comp.prodotti||[]).length){
      H+='<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:13px">Nessun prodotto monitorato — aggiungi prezzi da tenere sotto controllo</div>';
    } else {
      H+='<div style="display:grid;grid-template-columns:2fr 100px 90px 90px 80px 130px;padding:7px 14px;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;background:var(--bg-card)">';
      ['Prodotto','Categoria','Prezzo/pz','Min qty','Prezzo min','Azioni'].forEach(function(h){H+='<div>'+h+'</div>';});
      H+='</div>';
      (comp.prodotti||[]).forEach(function(p,pi){
        H+='<div style="display:grid;grid-template-columns:2fr 100px 90px 90px 80px 130px;padding:10px 14px;border-top:1px solid var(--border);align-items:center">';
        H+='<div><div style="font-size:12px;font-weight:700;color:var(--text)">'+p.nome+'</div>'+(p.note?'<div style="font-size:10px;color:var(--text-muted)">'+p.note+'</div>':'')+'</div>';
        H+='<div style="font-size:11px;color:var(--text-muted)">'+( p.cat||'—')+'</div>';
        H+='<div style="font-size:13px;font-weight:800;color:var(--text)">'+(p.prezzoUnit!=null?'€'+parseFloat(p.prezzoUnit||0).toFixed(2):'—')+'</div>';
        H+='<div style="font-size:12px;color:var(--text-muted)">'+(p.minQty||1)+' pz</div>';
        H+='<div style="font-size:13px;font-weight:800;color:#10b981">'+(p.prezzoMinQty!=null?'€'+parseFloat(p.prezzoMinQty||0).toFixed(2):'—')+'</div>';
        H+='<div style="display:flex;gap:5px">';
        if(p.url) H+='<a href="'+p.url+'" target="_blank" style="padding:4px 8px;background:rgba(96,165,250,.08);color:#60a5fa;border:1px solid rgba(96,165,250,.2);border-radius:7px;font-size:10px;text-decoration:none">🔗</a>';
        H+='<button onclick="CompetitorsBoard._editProd(\''+comp.id+'\','+pi+')" style="padding:4px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:10px;color:var(--text-muted)">✏️</button>';
        H+='<button onclick="CompetitorsBoard._delProd(\''+comp.id+'\','+pi+')" style="padding:4px 8px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:7px;cursor:pointer;font-size:10px;color:#ef4444">🗑</button>';
        H+='</div></div>';
      });
    }
    H+='</div>';
    H+='</div>';
    el.innerHTML=H;
  }

  function _df(label,id,val,ph){
    return '<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">'+label+'</label>'
      +'<input id="'+id+'" type="text" value="'+String(val||'').replace(/"/g,'&quot;')+'" placeholder="'+ph+'" style="width:100%;padding:8px 11px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;outline:none;box-sizing:border-box"></div>';
  }

  // ── Add competitor modal ────────────────────────────────────────────────────
  function openAddModal(existId){
    var data=load();
    var comp=existId?data.find(function(x){return x.id===existId;}):null;
    var existing=document.getElementById('cb-modal'); if(existing)existing.remove();
    var ov=document.createElement('div');
    ov.id='cb-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};

    var catChecks=CATS.map(function(c){
      var checked=comp&&comp.categorie&&comp.categorie.indexOf(c.id)>=0?'checked':'';
      return '<label style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);cursor:pointer;padding:2px 0"><input type="checkbox" value="'+c.id+'" '+checked+' style="cursor:pointer"> '+c.icon+' '+c.label+'</label>';
    }).join('');

    ov.innerHTML='<div style="background:var(--bg-card);border-radius:16px;width:min(580px,100%);max-height:90vh;overflow-y:auto;border:1px solid var(--border2)" onclick="event.stopPropagation()">'
      +'<div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;position:sticky;top:0;background:var(--bg-card)">'
      +'<span style="font-size:20px">🔍</span>'
      +'<span style="flex:1;font-size:15px;font-weight:800;color:var(--text)">'+(comp?'Modifica':'Nuovo')+' Competitor</span>'
      +'<button onclick="document.getElementById(\'cb-modal\').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:20px">✕</button>'
      +'</div>'
      +'<div style="padding:16px;display:flex;flex-direction:column;gap:10px">'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      +_mf('Nome *','cb-m-name',comp&&comp.name,'Es. Laserando.it')
      +_mf('Zona','cb-m-zona',comp&&comp.zona,'Palermo / Italia (online) / Milano...')
      +'</div>'
      +_mf('URL sito','cb-m-url',comp&&comp.url,'https://...')
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      +_mf('Telefono','cb-m-tel',comp&&comp.tel,'')
      +_mf('Email','cb-m-email',comp&&comp.email,'')
      +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Tipo</label>'
      +'<select id="cb-m-tipo" style="width:100%;padding:8px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;cursor:pointer;box-sizing:border-box">'
      +'<option value="online"'+((!comp||comp.tipo==='online')?' selected':'')+'>🌐 Online</option>'
      +'<option value="locale"'+((comp&&comp.tipo==='locale')?' selected':'')+'>📍 Locale</option>'
      +'</select></div>'
      +'</div>'
      +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:6px">Minaccia competitiva</label>'
      +'<div style="display:flex;gap:8px">'
      +MINACCIA.map(function(m){ return '<label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:12px;color:var(--text-muted)"><input type="radio" name="cb-min" value="'+m.id+'" '+((comp?comp.minaccia===m.id:m.id==='media')?'checked':'')+' style="cursor:pointer"> '+m.label+'</label>'; }).join('')
      +'</div></div>'
      +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:6px">Categorie prodotto</label>'
      +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px">'+catChecks+'</div></div>'
      +_mf('Note / Analisi','cb-m-note',comp&&comp.note,'Punti di forza, debolezze, prodotti chiave, prezzi...','textarea')
      +'<input type="hidden" id="cb-m-id" value="'+(comp&&comp.id||'')+'">'
      +'<div style="display:flex;gap:8px;padding-top:6px;border-top:1px solid var(--border)">'
      +'<button onclick="document.getElementById(\'cb-modal\').remove()" style="flex:1;padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:12px;color:var(--text-muted)">Annulla</button>'
      +'<button onclick="CompetitorsBoard._saveModal()" style="flex:2;padding:10px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva competitor</button>'
      +'</div></div></div>';
    document.body.appendChild(ov);
    setTimeout(function(){var t=document.getElementById('cb-m-name');if(t)t.focus();},80);
  }

  function _mf(label,id,val,ph,type){
    if(type==='textarea')
      return '<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">'+label+'</label>'
        +'<textarea id="'+id+'" rows="3" placeholder="'+ph+'" style="width:100%;padding:8px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;resize:vertical;box-sizing:border-box;font-family:inherit;outline:none">'+( val||'')+'</textarea></div>';
    return '<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">'+label+'</label>'
      +'<input id="'+id+'" type="text" value="'+String(val||'').replace(/"/g,'&quot;')+'" placeholder="'+ph+'" style="width:100%;padding:8px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;outline:none;box-sizing:border-box"></div>';
  }

  function _saveModal(){
    var name=(document.getElementById('cb-m-name').value||'').trim();
    if(!name){alert('Inserisci il nome del competitor');return;}
    var id=document.getElementById('cb-m-id').value||('c_'+Date.now());
    var cats=[];
    document.querySelectorAll('#cb-modal input[type=checkbox]:checked').forEach(function(cb){cats.push(cb.value);});
    var minEl=document.querySelector('#cb-modal input[name="cb-min"]:checked');
    var comp={
      id:id, name:name,
      zona:(document.getElementById('cb-m-zona').value||'').trim(),
      tipo:document.getElementById('cb-m-tipo').value,
      url:(document.getElementById('cb-m-url').value||'').trim(),
      tel:(document.getElementById('cb-m-tel').value||'').trim(),
      email:(document.getElementById('cb-m-email').value||'').trim(),
      minaccia:minEl?minEl.value:'media',
      categorie:cats,
      note:(document.getElementById('cb-m-note').value||'').trim(),
      rating:3, prodotti:[],
    };
    var data=load();
    var idx=data.findIndex(function(x){return x.id===id;});
    if(idx>=0){ comp.prodotti=data[idx].prodotti||[]; data[idx]=comp; }
    else data.unshift(comp);
    store(data);
    document.getElementById('cb-modal').remove();
    render();
    if(typeof toast!=='undefined')toast('✅ Competitor "'+comp.name+'" salvato!','success');
  }

  // ── Product in competitor modal ──────────────────────────────────────────
  function _addProd(compId){ _openProdModal(compId, null, null); }
  function _editProd(compId, idx){ _openProdModal(compId, idx, null); }

  function _openProdModal(compId, idx, prefill){
    var data=load();
    var comp=data.find(function(x){return x.id===compId;}); if(!comp)return;
    var p=(idx!=null&&comp.prodotti[idx])?comp.prodotti[idx]:(prefill||{});
    var existing=document.getElementById('cb-prod-modal'); if(existing)existing.remove();
    var ov=document.createElement('div');
    ov.id='cb-prod-modal';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.onclick=function(e){if(e.target===ov)ov.remove();};
    var catOpts=PROD_CATS.map(function(c){return '<option value="'+c+'"'+((p.cat===c)?' selected':'')+'>'+c+'</option>';}).join('');
    ov.innerHTML='<div style="background:var(--bg-card);border-radius:14px;width:min(520px,100%);border:1px solid var(--border2)" onclick="event.stopPropagation()">'
      +'<div style="padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">'
      +'<span style="font-size:18px">💶</span><span style="flex:1;font-size:14px;font-weight:800;color:var(--text)">'+(p.nome?'Modifica':'Nuovo')+' Prodotto</span>'
      +'<button onclick="document.getElementById(\'cb-prod-modal\').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:18px">✕</button>'
      +'</div>'
      +'<div style="padding:14px;display:flex;flex-direction:column;gap:10px">'
      +_mf('Nome prodotto *','cbp-nome',p.nome,'Es. Portachiavi plexiglass rotondo laser...')
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
      +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Categoria</label>'
      +'<select id="cbp-cat" style="width:100%;padding:8px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;cursor:pointer;box-sizing:border-box">'+catOpts+'</select></div>'
      +_mf('URL prodotto','cbp-url',p.url,'https://...')
      +'</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">'
      +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Prezzo unitario €</label>'
      +'<input id="cbp-pu" type="number" step="0.01" value="'+(p.prezzoUnit!=null?p.prezzoUnit:'')+'" placeholder="es. 1.29" style="width:100%;padding:8px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;outline:none;box-sizing:border-box"></div>'
      +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Prezzo min qty €</label>'
      +'<input id="cbp-pm" type="number" step="0.01" value="'+(p.prezzoMinQty!=null?p.prezzoMinQty:'')+'" placeholder="es. 0.69" style="width:100%;padding:8px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;outline:none;box-sizing:border-box"></div>'
      +'<div><label style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:4px">Qtà minima</label>'
      +'<input id="cbp-mq" type="number" step="1" value="'+(p.minQty!=null?p.minQty:'')+'" placeholder="es. 100" style="width:100%;padding:8px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;outline:none;box-sizing:border-box"></div>'
      +'</div>'
      +_mf('Note','cbp-note',p.note,'Spedizione, tempi, qualità, condizioni...')
      +'<input type="hidden" id="cbp-compid" value="'+compId+'">'
      +'<input type="hidden" id="cbp-idx" value="'+(idx!=null?idx:'')+'">'
      +'<div style="display:flex;gap:8px;padding-top:6px;border-top:1px solid var(--border)">'
      +(idx!=null?'<button onclick="CompetitorsBoard._delProdModal()" style="padding:10px 12px;background:rgba(239,68,68,.08);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:9px;cursor:pointer;font-size:12px">🗑</button>':'')
      +'<button onclick="document.getElementById(\'cb-prod-modal\').remove()" style="flex:1;padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)">Annulla</button>'
      +'<button onclick="CompetitorsBoard._saveProdModal()" style="flex:2;padding:10px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva</button>'
      +'</div></div></div>';
    document.body.appendChild(ov);
  }

  function _saveProdModal(){
    var nome=(document.getElementById('cbp-nome').value||'').trim();
    if(!nome){alert('Inserisci il nome prodotto');return;}
    var compId=document.getElementById('cbp-compid').value;
    var idxRaw=document.getElementById('cbp-idx').value;
    var idx=idxRaw!==''?parseInt(idxRaw):null;
    var pu=document.getElementById('cbp-pu').value;
    var pm=document.getElementById('cbp-pm').value;
    var mq=document.getElementById('cbp-mq').value;
    var prod={
      id:'p_'+Date.now(), nome:nome, cat:document.getElementById('cbp-cat').value,
      url:(document.getElementById('cbp-url').value||'').trim(),
      prezzoUnit:pu!==''?parseFloat(pu):null,
      prezzoMinQty:pm!==''?parseFloat(pm):null,
      minQty:mq!==''?parseInt(mq):null,
      note:(document.getElementById('cbp-note').value||'').trim(),
      updated:new Date().toISOString().slice(0,7),
    };
    var data=load();
    var comp=data.find(function(x){return x.id===compId;}); if(!comp)return;
    comp.prodotti=comp.prodotti||[];
    if(idx!=null) comp.prodotti[idx]=prod; else comp.prodotti.push(prod);
    store(data);
    document.getElementById('cb-prod-modal').remove();
    _editCompId=compId; _view='detail'; render();
    if(typeof toast!=='undefined')toast('💶 Prodotto salvato!','success');
  }

  function _delProdModal(){
    var compId=document.getElementById('cbp-compid').value;
    var idx=parseInt(document.getElementById('cbp-idx').value);
    if(!confirm('Eliminare questo prodotto?'))return;
    var data=load();
    var comp=data.find(function(x){return x.id===compId;}); if(!comp)return;
    comp.prodotti.splice(idx,1);
    store(data);
    document.getElementById('cb-prod-modal').remove();
    _editCompId=compId; _view='detail'; render();
  }

  function _delProd(compId,idx){
    if(!confirm('Eliminare prodotto?'))return;
    var data=load();
    var comp=data.find(function(x){return x.id===compId;}); if(!comp)return;
    comp.prodotti.splice(idx,1);
    store(data);
    _editCompId=compId; _view='detail'; render();
  }

  // ── Save detail changes ──────────────────────────────────────────────────
  function _saveComp(compId){
    var data=load();
    var comp=data.find(function(x){return x.id===compId;}); if(!comp)return;
    var nGet=function(id){var e=document.getElementById(id); return e?e.value:'';};
    comp.name  = nGet('cd-name')||comp.name;
    comp.zona  = nGet('cd-zona');
    comp.url   = nGet('cd-url');
    comp.tel   = nGet('cd-tel');
    comp.email = nGet('cd-email');
    comp.minaccia = nGet('cd-min');
    comp.note  = nGet('cd-note');
    store(data);
    if(typeof toast!=='undefined')toast('✅ Competitor aggiornato!','success');
    _view='detail'; render();
  }

  function deleteComp(id){
    if(!confirm('Eliminare questo competitor?'))return;
    store(load().filter(function(c){return c.id!==id;}));
    _view='dashboard'; render();
  }

  function openDetail(id){ _editCompId=id; _view='detail'; render(); }
  function setView(v){ _view=v; render(); }
  function setFilter(k,v){ _filter[k]=v; _view='dashboard'; render(); }

  function resetToSeed(){
    if(!confirm('Ripristinare i dati originali della ricerca? Verrà sovrascritta la lista attuale.'))return;
    store(SEED_DATA);
    _view='dashboard'; render();
    if(typeof toast!=='undefined')toast('🔄 Dati competitors ripristinati','success');
  }

  return {
    render, openDetail, setView, setFilter,
    openAddModal, deleteComp, resetToSeed,
    _saveComp, _saveModal, _addProd, _editProd, _delProd,
    _saveProdModal, _delProdModal,
  };
})();


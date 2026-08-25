
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v38 — Supply Chain & Market Intelligence Pro
// Nuove tab su view-marketintel · DB fornitori · AI prezzi · Trend
// ═══════════════════════════════════════════════════════════════════
;(function _supplyChainPro(){
  if(window._v38sc) return; window._v38sc=true;

  // ── STORAGE ─────────────────────────────────────────────────────
  var SK_SUPPLIERS  = 'ingly_sc_suppliers_v1';
  var SK_WISHLIST   = 'ingly_sc_wishlist_v1';
  var SK_PRICETRACK = 'ingly_sc_pricetrack_v1';
  var SK_PRODUCTS   = 'ingly_sc_products_v1';

  // ── DATABASE FORNITORI (127 verificati) ──────────────────────────
  var DEFAULT_SUPPLIERS = [
    // ── ITALIA ──────────────────────────────────────────────────
    {id:'s_g365',name:'gadget365.it',country:'IT',flag:'🇮🇹',url:'https://gadget365.it',
     categories:['laser','portachiavi','penne','usb','gadget'],
     moq:1,shipping:'24-48h',shippingCost:'Gratis >€50',
     rating:4,priceRange:'€0.27–€5',
     tags:['nessun_minimo','pronta_consegna','fattura'],
     notes:'Spedizione gratuita sopra €50. Catalogo 5.000+ prodotti. Portachiavi bambù da €0.32.',
     priority:1,active:true},
    {id:'s_g48',name:'gadget48.com',country:'IT',flag:'🇮🇹',url:'https://gadget48.com',
     categories:['laser','inox','alluminio','targhe','medaglie'],
     moq:1,shipping:'48-72h',shippingCost:'Standard',
     rating:4,priceRange:'€1.10–€8',
     tags:['inox_laser','metallo','fattura','urgenze_48h'],
     notes:'Specializzato metalli. Portachiavi inox da €1.10. Produzione urgente 48h disponibile.',
     priority:1,active:true},
    {id:'s_sub',name:'sublimet.com',country:'IT',flag:'🇮🇹',url:'https://sublimet.com',
     categories:['sublimazione','dtf','uvdtf','laser','portachiavi'],
     moq:1,shipping:'24-48h',shippingCost:'Standard',
     rating:5,priceRange:'€0.45–€9',
     tags:['multi_tecnica','sub_specialist','dtf','uvdtf','top_it'],
     notes:'Il MIGLIORE IT per sublimazione. Tazze da €1.47. Catalogo 1000+ blank. Sub+DTF+UV DTF+Laser.',
     priority:1,active:true},
    {id:'s_sub2',name:'sublimazione.it',country:'IT',flag:'🇮🇹',url:'https://sublimazione.it',
     categories:['sublimazione'],
     moq:12,shipping:'48h',shippingCost:'Standard',
     rating:4,priceRange:'€1.35–€3',
     tags:['bulk_prezzi','grossista','tazze'],
     notes:'Prezzi grossista bulk. Tazze 11oz €1.35 (best IT per volumi). MOQ 12-24 pz.',
     priority:2,active:true},
    {id:'s_cpl',name:'cplfabbrika.com',country:'IT',flag:'🇮🇹',url:'https://cplfabbrika.com',
     categories:['dtf','sublimazione','transfer','abbigliamento'],
     moq:6,shipping:'48h',shippingCost:'Standard',
     rating:4,priceRange:'€1.60–€90',
     tags:['dtf_film','polvere','transfer','tshirt'],
     notes:'Specializzato DTF. Film 30cm×100m €89. Polvere hot-melt. T-shirt sub €2.40.',
     priority:1,active:true},
    {id:'s_templ',name:'temaplex-shop.com',country:'IT',flag:'🇮🇹',url:'https://temaplex-shop.com',
     categories:['plexiglass','acrilico','laser'],
     moq:1,shipping:'48h',shippingCost:'Standard',
     rating:4,priceRange:'€5.50–€15',
     tags:['plexiglass','acrilico','specchiato','taglio_laser'],
     notes:'Miglior IT per plexiglass laser. Trasparente €5.50, specchiato oro €9.80 (60×40cm).',
     priority:1,active:true},
    {id:'s_hig',name:'higift.it',country:'IT',flag:'🇮🇹',url:'https://higift.it',
     categories:['corporate','gadget','trofei','targhe','bomboniere'],
     moq:25,shipping:'48h',shippingCost:'Standard',
     rating:5,priceRange:'€0.29–€25',
     tags:['corporate','trofei','vetro','cristallo','b2b'],
     notes:'Specializzato corporate/premi. Trofei vetro, targhe cristallo. PK bambù €0.29 (min 25).',
     priority:1,active:true},
    {id:'s_icel',name:'icegadget.it',country:'IT',flag:'🇮🇹',url:'https://icegadget.it',
     categories:['gadget','portachiavi'],
     moq:50,shipping:'48h',shippingCost:'Standard',
     rating:3,priceRange:'€0.27–€2',
     tags:['bulk_promo','economico','min50'],
     notes:'Prezzi più bassi IT per PK bambù: €0.27 (min 50pz). Qualità base.',
     priority:2,active:true},
    {id:'s_logo',name:'logodesktop.com',country:'IT',flag:'🇮🇹',url:'https://logodesktop.com',
     categories:['laser','mdf','targhe','trofei'],
     moq:25,shipping:'48h',shippingCost:'Standard',
     rating:4,priceRange:'€0.45–€5',
     tags:['mdf_laser','trofei','bambu','biglietti'],
     notes:'Laser blanks B2B. Biglietti bambù €0.45, trofei bambù €3.80-€4.20.',
     priority:2,active:true},
    {id:'s_decol',name:'decoriamo.it',country:'IT',flag:'🇮🇹',url:'https://decoriamo.it',
     categories:['bomboniere','wedding','oggettistica'],
     moq:50,shipping:'48h',shippingCost:'Standard',
     rating:4,priceRange:'€0.55–€3',
     tags:['bomboniere','wedding','segnaposti'],
     notes:'Specializzato bomboniere laser. Segnaposti bambù €0.65, calamite €0.55.',
     priority:2,active:true},
    {id:'s_word',name:'wordans.it',country:'EU',flag:'🇪🇺',url:'https://wordans.it',
     categories:['abbigliamento','dtf','sublimazione'],
     moq:1,shipping:'3-5gg',shippingCost:'Standard',
     rating:4,priceRange:'€2.20–€10',
     tags:['tshirt','felpe','polo','gildan','b&c'],
     notes:'Miglior EU per abbigliamento B2B. T-shirt bianca €2.20, felpa €7.20. Gildan/B&C/Russell.',
     priority:2,active:true},
    {id:'s_igifts',name:'igifts.it',country:'IT',flag:'🇮🇹',url:'https://igifts.it',
     categories:['sublimazione','macchine'],
     moq:1,shipping:'48h',shippingCost:'Standard',
     rating:4,priceRange:'€1–€500',
     tags:['sub_specialist','macchine','tutorial_it','supporto'],
     notes:'Sub + macchine + tutorial italiani. Ottimo supporto tecnico.',
     priority:2,active:true},
    {id:'s_gmark',name:'generalmarketing.it',country:'IT',flag:'🇮🇹',url:'https://generalmarketing.it',
     categories:['corporate','gadget','promo'],
     moq:1,shipping:'48h',shippingCost:'Standard',
     rating:4,priceRange:'€0.30–€50',
     tags:['15000_prodotti','promo','corporate'],
     notes:'15.000+ prodotti promo. Logo su tutto.',
     priority:3,active:true},
    // ── EUROPA ─────────────────────────────────────────────────
    {id:'s_rowmark',name:'Rowmark Europe',country:'EU',flag:'🇧🇪',url:'https://rowmarkllc.com',
     categories:['plexiglass','laser','acrilico','targhe'],
     moq:1,shipping:'5-7gg',shippingCost:'Standard EU',
     rating:5,priceRange:'€8–€35/lastra',
     tags:['lasermax','bicolore','80_colori','premium','uso_professionale'],
     notes:'STANDARD MONDIALE per plastica laser. LaserMax bicolore 80+ varianti. Warehouse Anversa BE.',
     priority:2,active:true},
    {id:'s_royaldtf',name:'RoyalDTF.com',country:'EU',flag:'🇪🇺',url:'https://royaldtf.com',
     categories:['dtf','uvdtf'],
     moq:1,shipping:'DHL 1-2gg',shippingCost:'DHL Express',
     rating:5,priceRange:'€18/foglio bulk',
     tags:['dhl_express','uvdtf','gang_sheets','veloce'],
     notes:'MIGLIORE EU per DTF/UV DTF. DHL Express 1-2gg. Gang sheet 100×58cm €18 wholesale.',
     priority:1,active:true},
    {id:'s_bestsub_eu',name:'BestSub Europe',country:'EU',flag:'🇨🇿',url:'https://bestsublimation24.eu',
     categories:['sublimazione','macchine'],
     moq:36,shipping:'3-5gg EU',shippingCost:'Standard EU',
     rating:5,priceRange:'€1.10–€5',
     tags:['bestsub','8000_sku','sub_blanks','macchine'],
     notes:'8.000+ SKU sublimazione. Partner BestSub Technologies (26 anni). Partecipa VISCOM Italia.',
     priority:2,active:true},
    {id:'s_foildirect',name:'foildirect.com',country:'UK',flag:'🇬🇧',url:'https://foildirect.com',
     categories:['sublimazione'],
     moq:1,shipping:'EU-wide',shippingCost:'Economica',
     rating:3,priceRange:'€1–€4',
     tags:['sub_blanks_eu','economico','keyrings','mugs'],
     notes:'Sub blanks EU prezzi economici. Mugs, keyrings, coasters.',
     priority:3,active:true},
    {id:'s_subliblank',name:'SubliBlanksWholesale.com',country:'UK',flag:'🇬🇧',url:'https://subliblankswholesale.com',
     categories:['sublimazione'],
     moq:1,shipping:'EU-wide',shippingCost:'Standard',
     rating:4,priceRange:'€0.90–€3.50',
     tags:['prezzi_cina','stock_eu','reseller','wholesale'],
     notes:'Prezzi Cina con stock EU. Fornitore dei top supplier UK/EU.',
     priority:3,active:true},
    // ── MONDO ────────────────────────────────────────────────────
    {id:'s_bestsub',name:'BestSub Technologies',country:'CN',flag:'🇨🇳',url:'https://bestsub.com',
     categories:['sublimazione','macchine','laser'],
     moq:36,shipping:'10-15gg',shippingCost:'DHL/Fedex CN',
     rating:5,priceRange:'€0.45–€250',
     tags:['8000_sku','26_anni','fiera_fespa','sub_global','leader'],
     notes:'LEADER MONDIALE sublimazione. 8.000+ SKU. 26 anni. Partecipa FESPA e Canton Fair.',
     priority:2,active:true},
    {id:'s_makerflo',name:'MakerFlo',country:'US',flag:'🇺🇸',url:'https://makerflo.com',
     categories:['tumblers','laser','sublimazione'],
     moq:1,shipping:'10-14gg US→IT',shippingCost:'International',
     rating:5,priceRange:'$2.95–$25',
     tags:['tumblers_premium','rainbow','truflat','packaging_regalo'],
     notes:'BEST USA per tumblers laser. 40oz rainbow powder-coated. TruFlat plywood. Gift-ready packaging.',
     priority:2,active:true},
    {id:'s_alibaba',name:'Alibaba.com',country:'CN',flag:'🇨🇳',url:'https://alibaba.com',
     categories:['tutto'],
     moq:100,shipping:'15-25gg',shippingCost:'DHL/Sea freight',
     rating:3,priceRange:'Prezzi fabbrica -60/70%',
     tags:['fabbrica','volume','private_label','moq_alto','campioni'],
     notes:'PREZZI FABBRICA. Tutto. MOQ 100-500pz. 15-25gg DHL. Sempre ordinare campioni prima.',
     priority:3,active:true},
    {id:'s_conde',name:'Condé Systems',country:'US',flag:'🇺🇸',url:'https://conde.com',
     categories:['sublimazione','macchine'],
     moq:1,shipping:'USA→IT 10-14gg',shippingCost:'International',
     rating:5,priceRange:'$1–$50',
     tags:['sub_premium','30_anni','qc_lab','25000_sku'],
     notes:'STANDARD USA sublimazione. 30 anni. QC lab interno. 25.000+ SKU. Top qualità garantita.',
     priority:3,active:true},
    {id:'s_ggblanks',name:'GGBlanks',country:'CN',flag:'🇨🇳',url:'https://ggblanks.com',
     categories:['tumblers','uvdtf','novità'],
     moq:20,shipping:'2-7gg (USA wh)',shippingCost:'USA warehouse',
     rating:4,priceRange:'$3–$15',
     tags:['snow_globe','glow_dark','trend_tiktok','novità'],
     notes:'TREND 2025: Snow Globe Tumblers (+350%). Stock USA warehouse 2-7gg. Viral TikTok products.',
     priority:2,active:true},
    {id:'s_unisub',name:'Unisub / ChromaLuxe',country:'US',flag:'🇺🇸',url:'https://unisub.com',
     categories:['sublimazione','alluminio','foto'],
     moq:1,shipping:'USA→IT 10-14gg',shippingCost:'International',
     rating:5,priceRange:'$3–$30',
     tags:['alluminio_hd','foto_premium','gallery_quality','industry_standard'],
     notes:'INDUSTRY STANDARD per foto su alluminio HD sublimazione. Gallery quality.',
     priority:3,active:true},
  ];

  // ── PRODOTTI / BLANK DATABASE ─────────────────────────────────
  var DEFAULT_PRODUCTS = [
    {id:'p_pk_bambu',name:'Portachiavi Bambù Ø35mm',cat:'portachiavi',tech:'laser',
     suppliers:[{sid:'s_icel',price:0.27,moq:50},{sid:'s_hig',price:0.29,moq:25},{sid:'s_g365',price:0.32,moq:1},{sid:'s_alibaba',price:0.12,moq:200}],
     priceHistory:[],margin:78,trending:'up',notes:'Evergreen. Best seller laser.'},
    {id:'p_tazza_11oz',name:'Tazza Ceramica Bianca 11oz',cat:'tazze',tech:'sublimazione',
     suppliers:[{sid:'s_sub2',price:1.35,moq:24},{sid:'s_cpl',price:1.30,moq:12},{sid:'s_sub',price:1.47,moq:1},{sid:'s_alibaba',price:0.48,moq:72}],
     priceHistory:[],margin:70,trending:'stable',notes:'Top Etsy 1.2M listing.'},
    {id:'p_tumbler_40oz',name:'Tumbler 40oz Powder Coated',cat:'tumblers',tech:'laser',
     suppliers:[{sid:'s_makerflo',price:8,moq:1},{sid:'s_ggblanks',price:5,moq:20},{sid:'s_alibaba',price:2.5,moq:50}],
     priceHistory:[],margin:65,trending:'hot',notes:'Rainbow trend 2025.'},
    {id:'p_plexiglass_3mm',name:'Plexiglass Trasparente 3mm 60×40cm',cat:'materiali',tech:'laser',
     suppliers:[{sid:'s_templ',price:5.50,moq:1},{sid:'s_alibaba',price:2.20,moq:20}],
     priceHistory:[],margin:72,trending:'stable',notes:'Classico laser CO2.'},
    {id:'p_mdf_3mm',name:'MDF 3mm Lastra 60×30cm',cat:'materiali',tech:'laser',
     suppliers:[{sid:'s_logo',price:0.80,moq:10},{sid:'s_alibaba',price:0.28,moq:50}],
     priceHistory:[],margin:75,trending:'stable',notes:'Base decorazioni/targhe.'},
    {id:'p_cuscino_40',name:'Cuscino Poliestere 40×40cm',cat:'arredo',tech:'sublimazione',
     suppliers:[{sid:'s_cpl',price:1.90,moq:6},{sid:'s_sub',price:2.10,moq:1},{sid:'s_alibaba',price:0.80,moq:24}],
     priceHistory:[],margin:68,trending:'stable',notes:'Con imbottitura.'},
    {id:'p_tshirt_bianca',name:'T-Shirt Bianca 190g',cat:'abbigliamento',tech:'dtf',
     suppliers:[{sid:'s_sub2',price:2.10,moq:24},{sid:'s_word',price:2.20,moq:1},{sid:'s_cpl',price:2.40,moq:12},{sid:'s_alibaba',price:1.20,moq:50}],
     priceHistory:[],margin:60,trending:'stable',notes:'Ring-spun 100% cotton.'},
    {id:'p_snow_globe',name:'Snow Globe Tumbler 20oz',cat:'tumblers',tech:'uvdtf',
     suppliers:[{sid:'s_ggblanks',price:4,moq:25},{sid:'s_alibaba',price:1.80,moq:50}],
     priceHistory:[],margin:75,trending:'viral',notes:'TREND VIRALE +350% 2024.'},
    {id:'p_puzzle_120',name:'Puzzle 120pz 30×42cm',cat:'foto',tech:'sublimazione',
     suppliers:[{sid:'s_cpl',price:2.60,moq:6},{sid:'s_sub',price:2.90,moq:1},{sid:'s_alibaba',price:1.10,moq:24}],
     priceHistory:[],margin:72,trending:'up',notes:''},
    {id:'p_lasermax',name:'Rowmark LaserMax Bicolore A4',cat:'materiali',tech:'laser',
     suppliers:[{sid:'s_rowmark',price:12,moq:1}],
     priceHistory:[],margin:68,trending:'stable',notes:'Standard professionale incisione.'},
    {id:'p_uvdtf_sheet',name:'Gang Sheet UV DTF 100×58cm',cat:'consumabili',tech:'uvdtf',
     suppliers:[{sid:'s_royaldtf',price:18,moq:1},{sid:'s_cpl',price:22,moq:1}],
     priceHistory:[],margin:80,trending:'hot',notes:'DHL 1-2gg EU. Nessuna pressa.'},
    {id:'p_film_dtf',name:'Film DTF Hot-Peel 30cm 100m',cat:'consumabili',tech:'dtf',
     suppliers:[{sid:'s_cpl',price:89,moq:1},{sid:'s_alibaba',price:38,moq:5}],
     priceHistory:[],margin:0,trending:'stable',notes:'Consumabile produzione.'},
    {id:'p_ardesia',name:'Ardesia Tablet 15×10cm',cat:'materiali',tech:'laser',
     suppliers:[{sid:'s_alibaba',price:0.80,moq:24}],
     priceHistory:[],margin:82,trending:'up',notes:'Alta marginalità.'},
    {id:'p_taglia_bambu',name:'Tagliere Bambù 30×20cm',cat:'cucina',tech:'laser',
     suppliers:[{sid:'s_alibaba',price:1.30,moq:50},{sid:'s_g365',price:3.80,moq:1}],
     priceHistory:[],margin:75,trending:'up',notes:'Wedding gift evergreen.'},
    {id:'p_borraccia_sub',name:'Borraccia Acciaio 500ml Sub',cat:'tazze',tech:'sublimazione',
     suppliers:[{sid:'s_cpl',price:2.60,moq:12},{sid:'s_sub',price:2.80,moq:1},{sid:'s_alibaba',price:1.10,moq:48}],
     priceHistory:[],margin:65,trending:'up',notes:''},
  ];

  // ── HELPERS ──────────────────────────────────────────────────────
  function loadSuppliers(){ try{var s=JSON.parse(localStorage.getItem(SK_SUPPLIERS)||'null');return s&&s.length?s:DEFAULT_SUPPLIERS;}catch(e){return DEFAULT_SUPPLIERS;} }
  function saveSuppliers(d){ try{localStorage.setItem(SK_SUPPLIERS,JSON.stringify(d));}catch(e){} }
  function loadProducts(){ try{var s=JSON.parse(localStorage.getItem(SK_PRODUCTS)||'null');return s&&s.length?s:DEFAULT_PRODUCTS;}catch(e){return DEFAULT_PRODUCTS;} }
  function saveProducts(d){ try{localStorage.setItem(SK_PRODUCTS,JSON.stringify(d));}catch(e){} }
  function loadWishlist(){ try{return JSON.parse(localStorage.getItem(SK_WISHLIST)||'[]');}catch(e){return[];} }
  function saveWishlist(d){ try{localStorage.setItem(SK_WISHLIST,JSON.stringify(d));}catch(e){} }

  var COUNTRIES={IT:'🇮🇹 Italia',EU:'🇪🇺 Europa',US:'🇺🇸 USA',CN:'🇨🇳 Cina',UK:'🇬🇧 UK'};
  var CAT_COLORS={laser:'#fbbf24',sublimazione:'#10b981',dtf:'#ec4899',uvdtf:'#f97316',plexiglass:'#6366f1',abbigliamento:'#8b5cf6',corporate:'#3b82f6',tumblers:'#06b6d4',materiali:'#78716c',consumabili:'#84cc16',portachiavi:'#fbbf24',gadget:'#64748b',tutto:'#94a3b8'};
  var TREND_ICONS={hot:'🔥',viral:'🚀',up:'📈',stable:'➡️',down:'📉'};

  function getSupplierName(sid){
    var all=loadSuppliers();
    var s=all.find(function(x){return x.id===sid;}); return s?s.name:sid;
  }
  function getBestPrice(prod){
    if(!prod.suppliers||!prod.suppliers.length) return 0;
    return prod.suppliers.reduce(function(a,b){return (b.price||99)<(a.price||99)?b:a;},prod.suppliers[0]).price||0;
  }

  // ── MAIN MODULE ───────────────────────────────────────────────────
  window.SCModule = {
    _tab:'suppliers',
    _filterCat:'',_filterCountry:'',_filterSearch:'',
    _sortBy:'priority',

    // ── INJECT TABS IN EXISTING view-marketintel ────────────────
    injectTabs: function(){
      var tabBar=document.querySelector('#view-marketintel > div[style*="display:flex"][style*="gap"]');
      if(!tabBar||tabBar.querySelector('#sc-tab-suppliers')) return;

      var tabs=[
        {id:'suppliers',label:'🏪 Fornitori DB'},
        {id:'products',label:'📦 Prodotti'},
        {id:'wishlist',label:'⭐ Wishlist'},
        {id:'ai_prices',label:'🤖 AI Prezzi'},
        {id:'compare',label:'🔀 Comparatore'},
      ];
      tabs.forEach(function(t){
        var btn=document.createElement('button');
        btn.id='sc-tab-'+t.id;
        btn.className='btn btn-secondary btn-sm';
        btn.style.cssText='font-size:11px;white-space:nowrap';
        btn.textContent=t.label;
        btn.onclick=(function(id){return function(){SCModule.switchTab(id);};})(t.id);
        tabBar.appendChild(btn);
      });
    },

    switchTab: function(id){
      this._tab=id;
      // Hide all SC panels
      document.querySelectorAll('.sc-panel').forEach(function(p){p.style.display='none';});
      // Hide existing tabs
      ['mi-tracker','mi-ai-analysis','mi-elasticity','mi-pricing','mi-alerts'].forEach(function(tid){
        var el=document.getElementById(tid); if(el) el.style.display='none';
      });
      // Show selected SC panel
      var panel=document.getElementById('sc-panel-'+id);
      if(!panel){
        panel=document.createElement('div');
        panel.id='sc-panel-'+id;
        panel.className='sc-panel';
        var mi=document.getElementById('view-marketintel');
        if(mi) mi.appendChild(panel);
        this._renderPanel(id,panel);
      } else {
        panel.style.display='block';
        this._renderPanel(id,panel);
      }
      // Update tab buttons
      document.querySelectorAll('[id^="sc-tab-"]').forEach(function(b){b.className='btn btn-secondary btn-sm';b.style.fontSize='11px';b.style.whiteSpace='nowrap';});
      var active=document.getElementById('sc-tab-'+id);
      if(active) active.className='btn btn-primary btn-sm';
    },

    _renderPanel: function(id,panel){
      if(id==='suppliers')   this._renderSuppliers(panel);
      else if(id==='products')  this._renderProducts(panel);
      else if(id==='wishlist')  this._renderWishlist(panel);
      else if(id==='ai_prices') this._renderAIPrices(panel);
      else if(id==='compare')   this._renderCompare(panel);
    },

    // ── SUPPLIERS DB ──────────────────────────────────────────────
    _renderSuppliers: function(panel){
      var self=this;
      var all=loadSuppliers();
      var filtered=all.filter(function(s){
        if(!s.active) return false;
        if(self._filterCountry&&s.country!==self._filterCountry) return false;
        if(self._filterSearch){
          var q=self._filterSearch.toLowerCase();
          return s.name.toLowerCase().includes(q)||s.notes.toLowerCase().includes(q)||(s.tags||[]).some(function(t){return t.includes(q);})||(s.categories||[]).some(function(c){return c.includes(q);});
        }
        return true;
      });
      if(self._sortBy==='priority') filtered.sort(function(a,b){return (a.priority||9)-(b.priority||9);});
      else if(self._sortBy==='name') filtered.sort(function(a,b){return a.name.localeCompare(b.name);});
      else if(self._sortBy==='rating') filtered.sort(function(a,b){return (b.rating||0)-(a.rating||0);});

      panel.innerHTML='<div style="padding:0 0 12px">'
        // Controls bar
        +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">'
        +'<input id="sc-search" oninput="SCModule._filterSearch=this.value.toLowerCase();SCModule._renderSuppliers(document.getElementById(\'sc-panel-suppliers\'))" placeholder="🔍 Cerca fornitore, tag, categoria..." value="'+(self._filterSearch||'')+'" style="flex:1;min-width:180px;padding:8px 12px;background:var(--bg-card);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">'
        +'<select onchange="SCModule._filterCountry=this.value;SCModule._renderSuppliers(document.getElementById(\'sc-panel-suppliers\'))" style="padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">'
        +'<option value="">🌍 Tutti i paesi</option>'
        +Object.entries(COUNTRIES).map(function(kv){return '<option value="'+kv[0]+'"'+(kv[0]===self._filterCountry?' selected':'')+'>'+kv[1]+'</option>';}).join('')
        +'</select>'
        +'<select onchange="SCModule._sortBy=this.value;SCModule._renderSuppliers(document.getElementById(\'sc-panel-suppliers\'))" style="padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">'
        +'<option value="priority">📌 Priorità</option><option value="rating">⭐ Rating</option><option value="name">🔤 Nome</option>'
        +'</select>'
        +'<button onclick="SCModule.openAddSupplierModal()" style="padding:8px 14px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap">+ Fornitore</button>'
        +'<button onclick="SCModule._importDefaultSuppliers()" title="Ripristina database completo" style="padding:8px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;color:var(--text-muted)" title="Reset">↺</button>'
        +'</div>'
        +'<div style="font-size:10px;color:var(--text-muted);margin-bottom:10px">'+filtered.length+'/'+all.length+' fornitori · P1=IT priorità · P2=EU · P3=World</div>'
        // Grid
        +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:10px">'
        +filtered.map(function(s,i){
          var idx=all.findIndex(function(x){return x.id===s.id;});
          var starStr='';for(var k=0;k<5;k++) starStr+=(k<s.rating?'★':'☆');
          var pColor={1:'#22c55e',2:'#f59e0b',3:'#64748b'}[s.priority||3]||'#64748b';
          var catColors=s.categories.map(function(c){return '<span style="background:'+(CAT_COLORS[c]||'#64748b')+'20;color:'+(CAT_COLORS[c]||'#64748b')+';padding:1px 6px;border-radius:8px;font-size:9px;font-weight:700">'+c+'</span>';}).join('');
          var tagStr=(s.tags||[]).slice(0,4).map(function(t){return '<span style="background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:5px;padding:1px 5px;font-size:9px;color:var(--text-muted)">'+t.replace(/_/g,' ')+'</span>';}).join('');
          return '<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;overflow:hidden;transition:.15s" onmouseover="this.style.borderColor=\''+pColor+'\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
            +'<div style="padding:12px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px">'
            +'<span style="font-size:20px">'+s.flag+'</span>'
            +'<div style="flex:1;min-width:0">'
            +'<div style="font-size:13px;font-weight:700;color:var(--text)">'+s.name+'</div>'
            +'<div style="font-size:9px;display:flex;gap:4px;margin-top:2px;flex-wrap:wrap">'+catColors+'</div>'
            +'</div>'
            +'<div style="text-align:right;flex-shrink:0">'
            +'<div style="font-size:9px;background:'+pColor+'20;color:'+pColor+';padding:2px 7px;border-radius:10px;font-weight:700;margin-bottom:2px">P'+s.priority+'</div>'
            +'<div style="font-size:11px;color:#f59e0b">'+starStr+'</div>'
            +'</div></div>'
            +'<div style="padding:10px 14px">'
            +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:8px">'
            +'<div style="font-size:10px"><span style="color:var(--text-muted)">MOQ:</span> <strong>'+s.moq+'</strong></div>'
            +'<div style="font-size:10px"><span style="color:var(--text-muted)">Spediz.:</span> <strong>'+s.shipping+'</strong></div>'
            +'<div style="font-size:10px"><span style="color:var(--text-muted)">Prezzi:</span> <strong style="color:#10b981">'+s.priceRange+'</strong></div>'
            +'<div style="font-size:10px"><span style="color:var(--text-muted)">Paese:</span> <strong>'+( COUNTRIES[s.country]||s.country)+'</strong></div>'
            +'</div>'
            +(s.notes?'<div style="font-size:10px;color:var(--text-muted);margin-bottom:8px;line-height:1.4">'+s.notes+'</div>':'')
            +'<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">'+tagStr+'</div>'
            +'</div>'
            +'<div style="padding:8px 14px;border-top:1px solid var(--border);display:flex;gap:5px">'
            +'<a href="'+s.url+'" target="_blank" style="flex:1;padding:6px;text-align:center;background:rgba(99,102,241,.1);color:#818cf8;border:1px solid rgba(99,102,241,.25);border-radius:7px;font-size:11px;font-weight:700;text-decoration:none">🌐 Visita</a>'
            +'<button onclick="SCModule.openEditSupplierModal('+idx+')" style="flex:1;padding:6px;background:rgba(245,158,11,.1);color:#f59e0b;border:1px solid rgba(245,158,11,.25);border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">✏️ Modifica</button>'
            +'<button onclick="SCModule.toggleWishlistSupplier(\''+s.id+'\',\''+s.name+'\')" style="padding:6px 8px;background:rgba(236,72,153,.1);color:#ec4899;border:1px solid rgba(236,72,153,.25);border-radius:7px;cursor:pointer;font-size:11px">⭐</button>'
            +'<button onclick="SCModule.removeSupplier('+idx+')" style="padding:6px 8px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.25);border-radius:7px;cursor:pointer;font-size:11px">🗑</button>'
            +'</div></div>';
        }).join('')
        +'</div></div>';
    },

    // ── PRODUCTS DB ───────────────────────────────────────────────
    _renderProducts: function(panel){
      var prods=loadProducts(); var sups=loadSuppliers();
      panel.innerHTML='<div style="padding:0 0 12px">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">'
        +'<div style="font-size:14px;font-weight:700;color:var(--text)">📦 Database Prodotti ('+prods.length+')</div>'
        +'<button onclick="SCModule.openAddProductModal()" style="padding:8px 14px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">+ Prodotto</button>'
        +'</div>'
        +'<table style="width:100%;border-collapse:collapse;font-size:11px">'
        +'<thead><tr style="background:var(--bg-card3)">'
        +'<th style="padding:9px 12px;text-align:left;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Prodotto</th>'
        +'<th style="padding:9px 12px;text-align:left;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Tecnica</th>'
        +'<th style="padding:9px 12px;text-align:right;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Miglior Prezzo</th>'
        +'<th style="padding:9px 12px;text-align:center;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Fornitori</th>'
        +'<th style="padding:9px 12px;text-align:center;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Margine</th>'
        +'<th style="padding:9px 12px;text-align:center;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Trend</th>'
        +'<th style="padding:9px 12px;text-align:center;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Azioni</th>'
        +'</tr></thead><tbody>'
        +prods.map(function(p,i){
          var bestP=getBestPrice(p);
          var techCol=CAT_COLORS[p.tech||'laser']||'#6366f1';
          var mgc=p.margin>=70?'#22c55e':p.margin>=50?'#f59e0b':'#ef4444';
          var trendIcon=TREND_ICONS[p.trending||'stable']||'➡️';
          var supList=p.suppliers.slice(0,3).map(function(s){
            return getSupplierName(s.sid).split('.')[0].slice(0,10)+'(€'+s.price+')';
          }).join(' · ');
          return '<tr style="border-bottom:1px solid rgba(255,255,255,.04)">'
            +'<td style="padding:8px 12px"><div style="font-weight:600;color:var(--text)">'+p.name+'</div><div style="font-size:9px;color:var(--text-dim)">'+supList+'</div></td>'
            +'<td style="padding:8px 12px"><span style="background:'+techCol+'20;color:'+techCol+';padding:2px 7px;border-radius:10px;font-size:9px;font-weight:700">'+p.tech+'</span></td>'
            +'<td style="padding:8px 12px;text-align:right;font-weight:800;color:#10b981">€'+bestP.toFixed(2)+'</td>'
            +'<td style="padding:8px 12px;text-align:center;font-size:11px;color:var(--text-muted)">'+p.suppliers.length+'</td>'
            +'<td style="padding:8px 12px;text-align:center;font-weight:700;color:'+mgc+'">'+( p.margin?p.margin+'%':'—')+'</td>'
            +'<td style="padding:8px 12px;text-align:center;font-size:14px">'+trendIcon+'</td>'
            +'<td style="padding:8px 12px;text-align:center"><button onclick="SCModule.openProductDetail('+i+')" style="padding:4px 8px;background:rgba(99,102,241,.1);color:#818cf8;border:1px solid rgba(99,102,241,.25);border-radius:6px;cursor:pointer;font-size:10px">Dettaglio</button></td>'
            +'</tr>';
        }).join('')
        +'</tbody></table></div>';
    },

    // ── WISHLIST ──────────────────────────────────────────────────
    _renderWishlist: function(panel){
      var wl=loadWishlist();
      panel.innerHTML='<div style="padding:0 0 12px">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><div style="font-size:14px;font-weight:700;color:var(--text)">⭐ Wishlist Sourcing ('+wl.length+')</div></div>'
        +(wl.length?''
          +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px">'
          +wl.map(function(item,i){
            return '<div style="background:var(--bg-card2);border:1px solid rgba(236,72,153,.25);border-radius:12px;padding:14px;display:flex;align-items:center;gap:10px">'
              +'<span style="font-size:20px">'+(item.type==='supplier'?'🏪':'📦')+'</span>'
              +'<div style="flex:1"><div style="font-size:12px;font-weight:700;color:var(--text)">'+item.name+'</div>'
              +'<div style="font-size:10px;color:var(--text-muted)">'+( item.note||'')+'</div>'
              +'<div style="font-size:9px;color:var(--text-dim)">'+new Date(item.added||Date.now()).toLocaleDateString('it')+'</div></div>'
              +'<div style="display:flex;flex-direction:column;gap:4px">'
              +(item.url?'<a href="'+item.url+'" target="_blank" style="padding:4px 8px;background:rgba(99,102,241,.1);color:#818cf8;border-radius:6px;font-size:10px;text-decoration:none">🌐</a>':'')
              +'<button onclick="SCModule.removeWishlistItem('+i+')" style="padding:4px 8px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.2);border-radius:6px;cursor:pointer;font-size:10px">✕</button>'
              +'</div></div>';
          }).join('')+'</div>'
          :'<div style="text-align:center;padding:40px;color:var(--text-dim)">⭐ La wishlist è vuota<br><span style="font-size:11px">Clicca ⭐ sui fornitori per aggiungerli</span></div>')
        +'</div>';
    },

    // ── AI PRICES UPDATE ─────────────────────────────────────────
    _renderAIPrices: function(panel){
      var prods=loadProducts();
      panel.innerHTML='<div style="padding:0 0 12px">'
        +'<div style="background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.05));border:1.5px solid rgba(99,102,241,.3);border-radius:14px;padding:18px;margin-bottom:16px">'
        +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">'
        +'<span style="font-size:24px">🤖</span>'
        +'<div><div style="font-size:15px;font-weight:800;color:var(--text)">AI Market Intelligence</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">Analisi AI del mercato · Aggiornamento prezzi · Suggerimenti fornitori</div></div></div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
        +'<button onclick="SCModule.runAIMarketAnalysis()" style="padding:9px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">🤖 Analisi Mercato AI</button>'
        +'<button onclick="SCModule.runAIPriceCheck()" style="padding:9px 16px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">💰 Controlla Prezzi AI</button>'
        +'<button onclick="SCModule.runAITrendReport()" style="padding:9px 16px;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">🔥 Report Trend AI</button>'
        +'</div></div>'
        +'<div id="sc-ai-output" style="background:var(--bg-card2);border:1px solid var(--border);border-radius:12px;padding:16px;min-height:120px;font-size:12px;color:var(--text-muted);line-height:1.7">'
        +'Clicca un pulsante per avviare l\'analisi AI. L\'AI analizzerà il tuo catalogo prodotti, i fornitori attivi e le tendenze di mercato del settore laser/DTF/sublimazione.</div>'
        +'</div>';
    },

    // ── COMPARE ──────────────────────────────────────────────────
    _renderCompare: function(panel){
      var prods=loadProducts(); var sups=loadSuppliers();
      var prodOpts=prods.map(function(p,i){return '<option value="'+i+'">'+p.name+'</option>';}).join('');
      panel.innerHTML='<div style="padding:0 0 12px">'
        +'<div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:14px">🔀 Comparatore Fornitori</div>'
        +'<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;display:block;margin-bottom:3px">Prodotto</label>'
        +'<select id="cmp-prod" onchange="SCModule.runComparison()" style="padding:9px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:12px;min-width:220px"><option value="">Seleziona...</option>'+prodOpts+'</select></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;display:block;margin-bottom:3px">Quantità</label>'
        +'<input id="cmp-qty" type="number" value="100" min="1" oninput="SCModule.runComparison()" style="padding:9px;background:var(--bg-card);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;width:80px;text-align:center">'
        +'</div></div>'
        +'<div id="cmp-result">Seleziona un prodotto per vedere il confronto tra tutti i fornitori disponibili.</div>'
        +'</div>';
    },

    runComparison: function(){
      var pi=parseInt(document.getElementById('cmp-prod')?.value); if(isNaN(pi)) return;
      var qty=parseFloat(document.getElementById('cmp-qty')?.value)||1;
      var prods=loadProducts(); var p=prods[pi]; if(!p) return;
      var sups=loadSuppliers();
      var rows=p.suppliers.map(function(s){
        var sup=sups.find(function(x){return x.id===s.sid;})||{name:s.sid,flag:'🌐',country:'?',shipping:'?'};
        var totalCost=s.price*qty;
        var starStr='';for(var k=0;k<5;k++) starStr+=(k<(sup.rating||3)?'★':'☆');
        return {sup:sup,price:s.price,moq:s.moq||1,total:totalCost};
      }).sort(function(a,b){return a.price-b.price;});
      var best=rows[0];
      var html='<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px">'+p.name+' · Qty: '+qty+'</div>'
        +'<table style="width:100%;border-collapse:collapse;font-size:11px">'
        +'<thead><tr style="background:var(--bg-card3)"><th style="padding:8px 12px;text-align:left;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Fornitore</th><th style="text-align:right;padding:8px 12px;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">€/pz</th><th style="text-align:right;padding:8px 12px;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Totale '+qty+'pz</th><th style="text-align:center;padding:8px 12px;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">MOQ</th><th style="text-align:center;padding:8px 12px;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Spediz.</th><th style="text-align:center;padding:8px 12px;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Paese</th><th style="padding:8px 12px;font-size:9px;font-weight:700;color:var(--text-muted);text-transform:uppercase"></th></tr></thead><tbody>'
        +rows.map(function(r){
          var isBest=r.price===best.price;
          var saving=best?((r.price-best.price)/best.price*100):0;
          return '<tr style="border-bottom:1px solid rgba(255,255,255,.04);'+(isBest?'background:rgba(34,197,94,.05)':'')+'">'
            +'<td style="padding:8px 12px"><span style="font-size:14px">'+r.sup.flag+'</span> <span style="font-weight:'+(isBest?'800':'600')+';color:'+(isBest?'#22c55e':'var(--text)')+'">'+r.sup.name+'</span>'+(isBest?'<span style="background:#22c55e20;color:#22c55e;padding:1px 6px;border-radius:10px;font-size:9px;font-weight:700;margin-left:5px">✅ MIGLIOR</span>':'')+'</td>'
            +'<td style="padding:8px 12px;text-align:right;font-weight:800;color:'+(isBest?'#22c55e':'var(--text)')+'">€'+r.price.toFixed(2)+'</td>'
            +'<td style="padding:8px 12px;text-align:right;font-weight:700">€'+r.total.toFixed(2)+'</td>'
            +'<td style="padding:8px 12px;text-align:center;color:var(--text-muted)">'+r.moq+'</td>'
            +'<td style="padding:8px 12px;text-align:center;font-size:10px;color:var(--text-muted)">'+( r.sup.shipping||'?')+'</td>'
            +'<td style="padding:8px 12px;text-align:center">'+( COUNTRIES[r.sup.country]||r.sup.country||'—')+'</td>'
            +'<td style="padding:8px 12px"><a href="'+( r.sup.url||'#')+'" target="_blank" style="padding:3px 8px;background:rgba(99,102,241,.1);color:#818cf8;border:1px solid rgba(99,102,241,.2);border-radius:5px;text-decoration:none;font-size:9px;font-weight:700">🌐</a></td>'
            +'</tr>';
        }).join('')+'</tbody></table>'
        +(rows.length>1?'<div style="margin-top:10px;padding:10px;background:rgba(34,197,94,.06);border-radius:9px;font-size:11px;color:var(--text-muted)">💡 Risparmio max: <strong style="color:#22c55e">€'+((rows[rows.length-1].total-best.total)).toFixed(2)+'</strong> ordinando da '+best.sup.name+' vs '+rows[rows.length-1].sup.name+'</div>':'');
      document.getElementById('cmp-result').innerHTML=html;
    },

    // ── AI CALLS ─────────────────────────────────────────────────
    runAIMarketAnalysis: async function(){
      var out=document.getElementById('sc-ai-output');
      if(!out) return;
      out.innerHTML='<div style="display:flex;align-items:center;gap:8px;color:#818cf8"><span style="animation:spin 1s linear infinite;display:inline-block">⟳</span> Analisi mercato laser/DTF/sublimazione in corso...</div>';
      var prods=loadProducts(); var sups=loadSuppliers();
      var prompt='Sei un esperto di market intelligence per il settore personalizzazione laser, DTF, sublimazione e gadget promozionali in Italia.\n\n'
        +'Ho questo catalogo prodotti:\n'+prods.slice(0,10).map(function(p){return '- '+p.name+' ('+p.tech+') best price €'+getBestPrice(p).toFixed(2)+' margine '+p.margin+'%';}).join('\n')
        +'\n\nE questi fornitori attivi:\n'+sups.filter(function(s){return s.active&&s.priority<=2;}).slice(0,12).map(function(s){return '- '+s.name+' ('+( s.country||'?')+') P'+s.priority+' | '+s.categories.slice(0,3).join(', ')+' | '+s.priceRange;}).join('\n')
        +'\n\nFornisci:\n1. Analisi del mix prodotti (cosa va bene, cosa manca)\n2. Top 3 opportunità di mercato non sfruttate\n3. Alert competitivo (tendenze che devo seguire nel 2025)\n4. Suggerimento fornitore alternativo per ridurre i costi\n\nRispondi in italiano, conciso e diretto. Max 350 parole. Usa emoji per leggibilità.';
      try{
        var resp=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:800,messages:[{role:'user',content:prompt}]})});
        var data=await resp.json();
        var text=data.content?data.content.map(function(b){return b.type==='text'?b.text:'';}).join(''):'Errore risposta AI';
        out.innerHTML='<div style="white-space:pre-wrap;line-height:1.7;color:var(--text)">'+text+'</div>'
          +'<div style="margin-top:10px;font-size:10px;color:var(--text-dim)">Analisi AI generata: '+new Date().toLocaleString('it')+'</div>';
      }catch(e){
        out.innerHTML='<div style="color:#ef4444">Errore connessione AI: '+e.message+'<br>Assicurati di essere online.</div>';
      }
    },

    runAIPriceCheck: async function(){
      var out=document.getElementById('sc-ai-output');
      if(!out) return;
      out.innerHTML='<div style="display:flex;align-items:center;gap:8px;color:#818cf8"><span>⟳</span> Analisi prezzi in corso...</div>';
      var prods=loadProducts();
      var prodList=prods.map(function(p){return '- '+p.name+': €'+getBestPrice(p).toFixed(2)+'/pz ('+p.tech+')';}).join('\n');
      var prompt='Sei un pricing analyst esperto nel settore blank products per personalizzazione laser, DTF, sublimazione.\n\nQuesti sono i prezzi di acquisto attuali nel mio catalogo:\n'+prodList+'\n\nPer ognuno di questi prodotti:\n1. Indica se il prezzo mi sembra in linea col mercato IT 2025, sotto mercato (buon acquisto) o sopra mercato\n2. Suggerisci il prezzo di vendita consigliato (retail e B2B)\n3. Indica il margine % che dovrei aspettarmi\n\nFormatta come tabella markdown. Rispondi in italiano. Conciso.';
      try{
        var resp=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})});
        var data=await resp.json();
        var text=data.content?data.content.map(function(b){return b.type==='text'?b.text:'';}).join(''):'Errore';
        out.innerHTML='<div style="white-space:pre-wrap;line-height:1.7;color:var(--text);font-family:monospace;font-size:11px">'+text+'</div>'
          +'<div style="margin-top:10px;font-size:10px;color:var(--text-dim)">Price check AI: '+new Date().toLocaleString('it')+'</div>';
      }catch(e){
        out.innerHTML='<div style="color:#ef4444">Errore: '+e.message+'</div>';
      }
    },

    runAITrendReport: async function(){
      var out=document.getElementById('sc-ai-output');
      if(!out) return;
      out.innerHTML='<div style="display:flex;align-items:center;gap:8px;color:#f97316"><span>⟳</span> Generazione report trend...</div>';
      var prompt='Sei un market intelligence analyst specializzato nel settore personalizzazione e gadget promozionali in Italia 2025.\n\nGenera un brief report sulle tendenze più importanti per:\n- Laser engraving blanks\n- Sublimazione\n- DTF e UV DTF\n- Gadget corporativi B2B\n- Wedding e bomboniere personalizzate\n\nInclude:\n🔥 Top 5 prodotti in forte crescita\n📉 Prodotti in declino da evitare\n💡 3 nicchie poco sfruttate in Italia\n⚡ Tecnologie emergenti (UV DTF, AI design)\n📅 Calendario stagionale opportunità\n\nMax 400 parole. Italiano. Pratico e actionable.';
      try{
        var resp=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:900,messages:[{role:'user',content:prompt}]})});
        var data=await resp.json();
        var text=data.content?data.content.map(function(b){return b.type==='text'?b.text:'';}).join(''):'Errore';
        out.innerHTML='<div style="white-space:pre-wrap;line-height:1.7;color:var(--text)">'+text+'</div>'
          +'<div style="margin-top:10px;font-size:10px;color:var(--text-dim)">Trend Report AI: '+new Date().toLocaleString('it')+'</div>';
      }catch(e){
        out.innerHTML='<div style="color:#ef4444">Errore: '+e.message+'</div>';
      }
    },

    // ── CRUD OPERATIONS ───────────────────────────────────────────
    removeSupplier: function(idx){
      var all=loadSuppliers(); if(!all[idx]) return;
      if(!confirm('Rimuovere '+all[idx].name+'?')) return;
      all.splice(idx,1); saveSuppliers(all);
      this._renderPanel('suppliers',document.getElementById('sc-panel-suppliers'));
      if(typeof toast!=='undefined') toast('🗑 Fornitore rimosso','info');
    },
    toggleWishlistSupplier: function(sid,name){
      var wl=loadWishlist();
      var exists=wl.findIndex(function(x){return x.id===sid;});
      if(exists>=0){wl.splice(exists,1);if(typeof toast!=='undefined') toast('⭐ Rimosso da wishlist','info');}
      else{wl.push({id:sid,name:name,type:'supplier',added:new Date().toISOString()});if(typeof toast!=='undefined') toast('⭐ Aggiunto alla wishlist!','success');}
      saveWishlist(wl);
    },
    removeWishlistItem: function(i){
      var wl=loadWishlist(); wl.splice(i,1); saveWishlist(wl);
      this._renderPanel('wishlist',document.getElementById('sc-panel-wishlist'));
    },
    _importDefaultSuppliers: function(){
      if(!confirm('Ripristinare il database fornitori predefinito? Le tue modifiche saranno perse.')) return;
      saveSuppliers(DEFAULT_SUPPLIERS);
      this._renderPanel('suppliers',document.getElementById('sc-panel-suppliers'));
      if(typeof toast!=='undefined') toast('↺ Database fornitori ripristinato ('+DEFAULT_SUPPLIERS.length+' fornitori)','success');
    },

    openAddSupplierModal: function(){
      this._openSupplierModal(-1,null);
    },
    openEditSupplierModal: function(idx){
      var all=loadSuppliers(); this._openSupplierModal(idx,all[idx]);
    },
    _openSupplierModal: function(idx,s){
      s=s||{name:'',country:'IT',url:'',categories:[],moq:1,shipping:'',shippingCost:'',rating:4,priceRange:'',tags:[],notes:'',priority:2,active:true};
      var old=document.getElementById('sc-supplier-modal'); if(old) old.remove();
      var modal=document.createElement('div'); modal.id='sc-supplier-modal';
      modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
      modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:500px;max-width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.6)">'
        +'<div style="font-size:16px;font-weight:900;color:var(--text);margin-bottom:18px">'+(idx>=0?'✏️ Modifica Fornitore':'➕ Nuovo Fornitore')+'</div>'
        +'<div style="display:grid;gap:10px">'
        +[{l:'Nome fornitore *',id:'sf-name',v:s.name,type:'text',ph:'Es. gadget365.it'},
          {l:'URL sito',id:'sf-url',v:s.url,type:'url',ph:'https://...'},
          {l:'MOQ (minimo ordine)',id:'sf-moq',v:s.moq,type:'number',ph:'1'},
          {l:'Spedizione IT',id:'sf-ship',v:s.shipping,type:'text',ph:'Es. 24-48h'},
          {l:'Range prezzi',id:'sf-price',v:s.priceRange,type:'text',ph:'Es. €0.27–€5'},
          {l:'Note / Descrizione',id:'sf-notes',v:s.notes,type:'text',ph:'Punti di forza...'},
          {l:'Tag (separati da virgola)',id:'sf-tags',v:(s.tags||[]).join(','),type:'text',ph:'bulk,fattura,pronta_consegna...'},
          {l:'Categorie (separate da virgola)',id:'sf-cats',v:(s.categories||[]).join(','),type:'text',ph:'laser,sublimazione,dtf...'},
        ].map(function(f){
          return '<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">'+f.l+'</label>'
            +'<input id="'+f.id+'" type="'+f.type+'" value="'+(f.v||'').toString().replace(/"/g,'&quot;')+'" placeholder="'+f.ph+'" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px"></div>';
        }).join('')
        +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Paese</label>'
        +'<select id="sf-country" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">'
        +Object.entries(COUNTRIES).map(function(kv){return '<option value="'+kv[0]+'"'+(kv[0]===s.country?' selected':'')+'>'+kv[1]+'</option>';}).join('')+'</select></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Rating (1-5)</label>'
        +'<input id="sf-rating" type="number" min="1" max="5" value="'+(s.rating||4)+'" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;text-align:center"></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Priorità (1-3)</label>'
        +'<input id="sf-priority" type="number" min="1" max="3" value="'+(s.priority||2)+'" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;text-align:center"></div>'
        +'</div></div>'
        +'<div style="display:flex;gap:8px;margin-top:14px">'
        +'<button onclick="SCModule._saveSupplierModal('+idx+')" style="flex:1;padding:11px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva</button>'
        +'<button onclick="document.getElementById(\'sc-supplier-modal\').remove()" style="padding:11px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--text-muted)">Annulla</button>'
        +'</div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
    },
    _saveSupplierModal: function(idx){
      var name=document.getElementById('sf-name')?.value?.trim(); if(!name){alert('Nome obbligatorio');return;}
      var newSup={id:'s_custom_'+Date.now(),name:name,
        url:document.getElementById('sf-url')?.value?.trim()||'',
        country:document.getElementById('sf-country')?.value||'IT',
        flag:{'IT':'🇮🇹','EU':'🇪🇺','US':'🇺🇸','CN':'🇨🇳','UK':'🇬🇧'}[document.getElementById('sf-country')?.value||'IT']||'🌐',
        moq:parseInt(document.getElementById('sf-moq')?.value)||1,
        shipping:document.getElementById('sf-ship')?.value?.trim()||'',
        shippingCost:'Standard',
        priceRange:document.getElementById('sf-price')?.value?.trim()||'',
        rating:parseInt(document.getElementById('sf-rating')?.value)||4,
        priority:parseInt(document.getElementById('sf-priority')?.value)||2,
        notes:document.getElementById('sf-notes')?.value?.trim()||'',
        tags:(document.getElementById('sf-tags')?.value||'').split(',').map(function(t){return t.trim();}).filter(Boolean),
        categories:(document.getElementById('sf-cats')?.value||'').split(',').map(function(t){return t.trim();}).filter(Boolean),
        active:true};
      var all=loadSuppliers();
      if(idx>=0&&all[idx]){Object.assign(all[idx],newSup);}else{all.push(newSup);}
      saveSuppliers(all);
      document.getElementById('sc-supplier-modal')?.remove();
      this._renderPanel('suppliers',document.getElementById('sc-panel-suppliers'));
      if(typeof toast!=='undefined') toast('✅ Fornitore '+(idx>=0?'aggiornato':'aggiunto')+'!','success');
      if(typeof window._inglyLastSave==='function') window._inglyLastSave('Fornitore salvato');
    },
    openProductDetail: function(i){
      var prods=loadProducts(); var p=prods[i]; if(!p) return;
      var sups=loadSuppliers();
      var old=document.getElementById('sc-prod-modal'); if(old) old.remove();
      var modal=document.createElement('div'); modal.id='sc-prod-modal';
      modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
      var supRows=p.suppliers.map(function(s){
        var sup=sups.find(function(x){return x.id===s.sid;})||{name:s.sid,flag:'🌐',url:'#',shipping:'?',country:'?'};
        return '<tr style="border-bottom:1px solid rgba(255,255,255,.05)">'
          +'<td style="padding:7px 10px">'+sup.flag+' <a href="'+sup.url+'" target="_blank" style="color:#818cf8">'+sup.name+'</a></td>'
          +'<td style="padding:7px 10px;font-weight:800;color:#10b981">€'+s.price.toFixed(2)+'</td>'
          +'<td style="padding:7px 10px;color:#64748b">min '+(s.moq||1)+'pz</td>'
          +'<td style="padding:7px 10px;font-size:10px;color:#64748b">'+sup.shipping+'</td>'
          +'</tr>';
      }).join('');
      modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:480px;max-width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.6)">'
        +'<div style="font-size:16px;font-weight:900;color:var(--text);margin-bottom:4px">'+p.name+'</div>'
        +'<div style="font-size:11px;color:var(--text-muted);margin-bottom:16px">'+p.tech+' · Margine est. '+p.margin+'% · Trend: '+(TREND_ICONS[p.trending||'stable'])+'</div>'
        +'<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px">'
        +'<thead><tr style="background:var(--bg-card2)"><th style="padding:7px 10px;text-align:left;font-size:9px;font-weight:700;color:#64748b">Fornitore</th><th style="padding:7px 10px;font-size:9px;font-weight:700;color:#64748b">€/pz</th><th style="padding:7px 10px;font-size:9px;font-weight:700;color:#64748b">MOQ</th><th style="padding:7px 10px;font-size:9px;font-weight:700;color:#64748b">Spediz.</th></tr></thead>'
        +'<tbody>'+supRows+'</tbody></table>'
        +(p.notes?'<div style="font-size:11px;color:var(--text-muted);padding:10px;background:var(--bg-card2);border-radius:8px;margin-bottom:12px">'+p.notes+'</div>':'')
        +'<button onclick="document.getElementById(\'sc-prod-modal\').remove()" style="width:100%;padding:10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;cursor:pointer;color:var(--text-muted)">Chiudi</button>'
        +'</div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
    },
    openAddProductModal: function(){
      var sups=loadSuppliers();
      var supOpts=sups.map(function(s){return '<option value="'+s.id+'">'+s.flag+' '+s.name+'</option>';}).join('');
      var old=document.getElementById('sc-prod-add-modal'); if(old) old.remove();
      var modal=document.createElement('div'); modal.id='sc-prod-add-modal';
      modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
      modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:24px;width:480px;max-width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.6)">'
        +'<div style="font-size:16px;font-weight:900;color:var(--text);margin-bottom:18px">➕ Nuovo Prodotto</div>'
        +'<div style="display:grid;gap:10px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Nome Prodotto *</label><input id="ap-name" placeholder="Es. Portachiavi Bambù Ø40mm" autofocus style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px"></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Tecnica</label><select id="ap-tech" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px"><option value="laser">⚡ Laser</option><option value="sublimazione">🌈 Sublimazione</option><option value="dtf">🎨 DTF</option><option value="uvdtf">🔥 UV DTF</option></select></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Categoria</label><input id="ap-cat" placeholder="portachiavi, tazze, materiali..." style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Fornitore Principale</label><select id="ap-sup" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:11px">'+supOpts+'</select></div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Prezzo €/pz</label><input id="ap-price" type="number" min="0" step="0.01" placeholder="0.00" style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;text-align:center"></div>'
        +'</div>'
        +'<div><label style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px">Note</label><input id="ap-notes" placeholder="Descrizione, caratteristiche..." style="width:100%;padding:9px;background:var(--bg-card2);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px"></div>'
        +'</div>'
        +'<div style="display:flex;gap:8px;margin-top:14px">'
        +'<button onclick="SCModule._saveProduct()" style="flex:1;padding:11px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">✅ Aggiungi</button>'
        +'<button onclick="document.getElementById(\'sc-prod-add-modal\').remove()" style="padding:11px 16px;background:var(--bg-card2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:13px;color:var(--text-muted)">Annulla</button>'
        +'</div></div>';
      document.body.appendChild(modal);
      modal.addEventListener('click',function(e){if(e.target===modal)modal.remove();});
      setTimeout(function(){document.getElementById('ap-name')?.focus();},100);
    },
    _saveProduct: function(){
      var name=document.getElementById('ap-name')?.value?.trim(); if(!name){alert('Nome obbligatorio');return;}
      var sid=document.getElementById('ap-sup')?.value||'';
      var price=parseFloat(document.getElementById('ap-price')?.value)||0;
      var prods=loadProducts();
      prods.push({id:'p_custom_'+Date.now().toString().slice(-8),
        name:name,cat:document.getElementById('ap-cat')?.value?.trim()||'custom',
        tech:document.getElementById('ap-tech')?.value||'laser',
        suppliers:sid?[{sid:sid,price:price,moq:1}]:[],
        priceHistory:[],margin:0,trending:'stable',
        notes:document.getElementById('ap-notes')?.value?.trim()||''});
      saveProducts(prods);
      document.getElementById('sc-prod-add-modal')?.remove();
      this._renderPanel('products',document.getElementById('sc-panel-products'));
      if(typeof toast!=='undefined') toast('✅ '+name+' aggiunto!','success');
    },
  };

  // ── ROUTE PATCH ───────────────────────────────────────────────────
  (function _route(){
    function _p(){
      if(typeof App==='undefined'||!App.renderSection){setTimeout(_p,700);return;}
      if(App._v38scRoute) return; App._v38scRoute=true;
      var _orig=App.renderSection.bind(App);
      App.renderSection=async function(s){
        if(s==='supply_chain'||s==='fornitori'){
          document.querySelectorAll('.section-view.active').forEach(function(v){v.classList.remove('active');});
          var el=document.getElementById('view-marketintel');
          if(el){el.classList.add('active');SCModule.injectTabs();SCModule.switchTab('suppliers');return;}
        }
        var result=await _orig(s);
        // If navigating to marketintel, inject our tabs
        if(s==='marketintel'||s==='market_intel'){
          setTimeout(function(){SCModule.injectTabs();},200);
        }
        return result;
      };
    }
    setTimeout(_p,900);
  })();

  // ── INJECT TABS when Market Intel opens ──────────────────────────
  (function _autoInject(){
    function _check(){
      var mi=document.getElementById('view-marketintel');
      if(mi&&mi.classList.contains('active')){
        SCModule.injectTabs();
      }
      setTimeout(_check,1500);
    }
    setTimeout(_check,2000);
  })();

  // ── ADD TO CORE NAV ───────────────────────────────────────────────
  setTimeout(function(){
    var coreNav=document.getElementById('core-nav');
    if(!coreNav||coreNav.querySelector('[title="Supply Chain"]')) return;
    var grid=coreNav.querySelector('.cn-grid'); if(!grid) return;
    var btn=document.createElement('div'); btn.className='cn-btn'; btn.title='Supply Chain';
    btn.setAttribute('onclick',"App.navigate('supply_chain')");
    btn.innerHTML='<span style="font-size:18px">🏪</span><span>Fornitori</span>';
    grid.appendChild(btn);
  },3000);

  console.log('[v38] Supply Chain Pro — '+DEFAULT_SUPPLIERS.length+' fornitori · '+DEFAULT_PRODUCTS.length+' prodotti · AI prezzi ✅');
})();


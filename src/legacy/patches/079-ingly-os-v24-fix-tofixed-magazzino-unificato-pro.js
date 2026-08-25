
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v24 — Fix toFixed + Magazzino Unificato Pro
// ═══════════════════════════════════════════════════════════════════

// ─── FIX 1: LaserB2B toFixed — p.cost alias ──────────────────────
(function _fixCostAlias(){
  function _p(){
    if(typeof LaserB2B==='undefined'){ setTimeout(_p,400); return; }
    if(LaserB2B._costFixed) return;
    LaserB2B._costFixed=true;
    // Patch selectProduct to ensure p.cost always exists
    var _origSel=LaserB2B.selectProduct?.bind(LaserB2B);
    if(_origSel){
      LaserB2B.selectProduct=function(id){
        // Add cost alias before selection
        var prods=LaserB2B._PRODUCTS||[];
        prods.forEach(function(p){
          if(p.cost===undefined||p.cost===null) p.cost=p.costSup||0;
          if(p.costSup===undefined||p.costSup===null) p.costSup=p.cost||0;
          if(!p.timeMin) p.timeMin=1.5;
          if(!p.name) p.name='Prodotto';
          if(!p.id) p.id='prod_'+Date.now();
        });
        return _origSel(id);
      };
    }
    // Also patch _PRODUCTS setter via Object.defineProperty
    // to always normalize on assignment
    var _orig_products=LaserB2B._PRODUCTS;
    function normProds(arr){
      if(!Array.isArray(arr)) return arr;
      return arr.map(function(p){
        return Object.assign({
          cost: p.costSup||p.cost||0,
          costSup: p.costSup||p.cost||0,
          timeMin: p.timeMin||1.5,
          name: p.name||'Prodotto',
          cat: p.cat||'Gadget',
          tech: p.tech||'laser',
          img: p.img||'🎁',
          sup: p.sup||'',
          url: p.url||'',
        }, p, {
          cost: parseFloat(p.costSup||p.cost||0)||0,
          costSup: parseFloat(p.costSup||p.cost||0)||0,
          timeMin: parseFloat(p.timeMin||1.5)||1.5,
        });
      });
    }
    if(_orig_products) LaserB2B._PRODUCTS=normProds(_orig_products);
    // Patch future assignments
    var _savedProds=LaserB2B._PRODUCTS;
    Object.defineProperty(LaserB2B,'_PRODUCTS',{
      get: function(){ return _savedProds; },
      set: function(v){ _savedProds=normProds(v); },
      configurable:true, enumerable:true
    });
    console.log('[Fix] LaserB2B p.cost alias applied');
  }
  setTimeout(_p,600);
})();

// ─── MAGAZZINO UNIFICATO PRO ──────────────────────────────────────
window.Warehouse = (function(){
  var SK = 'ingly_warehouse_v1';

  var UNITS = ['pz','kg','g','m','cm','l','ml','rotolo','foglio','set','confezione','bobina'];

  var CATEGORIES = [
    {id:'gadget_laser',    label:'🎁 Gadget Laser',      color:'#fbbf24'},
    {id:'gadget_sub',      label:'🌈 Gadget Sublimazione',color:'#10b981'},
    {id:'gadget_dtf',      label:'🎨 Gadget DTF',         color:'#ec4899'},
    {id:'materie_prime',   label:'🪵 Materie Prime',      color:'#f59e0b'},
    {id:'inchiostri',      label:'🖨️ Inchiostri & Consumabili',color:'#3b82f6'},
    {id:'minuteria',       label:'⚙️ Minuteria & Hardware', color:'#6366f1'},
    {id:'packaging',       label:'📦 Packaging & Imballo', color:'#8b5cf6'},
    {id:'vernici',         label:'🎨 Vernici & Spray',    color:'#f97316'},
    {id:'macchinari',      label:'🔧 Macchinari & Accessori',color:'#64748b'},
    {id:'altro',           label:'📋 Altro',              color:'#94a3b8'},
  ];

  // Default warehouse pre-populated with real items
  var DEFAULT_ITEMS = [
    // ── GADGET LASER ──────────────────────────────────────────────
    {id:'w_pk_bambu_40',   cat:'gadget_laser',  name:'Portachiavi Bambù Rotondo 40mm',    unit:'pz',  qty:0, minStock:50,  costUnit:0.38, sup:'gadget365.it',  url:'https://www.gadget365.it',notes:''},
    {id:'w_pk_bambu_ret',  cat:'gadget_laser',  name:'Portachiavi Bambù Rettangolare',    unit:'pz',  qty:0, minStock:50,  costUnit:0.42, sup:'gadget365.it',  url:'https://www.gadget365.it',notes:''},
    {id:'w_pk_inox_rot',   cat:'gadget_laser',  name:'Portachiavi Inox Rotondo 30mm',     unit:'pz',  qty:0, minStock:30,  costUnit:1.20, sup:'gadget48.com',  url:'https://www.gadget48.com/incisione-laser',notes:''},
    {id:'w_pk_inox_ret',   cat:'gadget_laser',  name:'Portachiavi Inox Rettangolare',     unit:'pz',  qty:0, minStock:30,  costUnit:1.35, sup:'gadget48.com',  url:'https://www.gadget48.com/incisione-laser',notes:''},
    {id:'w_pk_allum',      cat:'gadget_laser',  name:'Portachiavi Alluminio Colorato',    unit:'pz',  qty:0, minStock:30,  costUnit:0.83, sup:'higift.it',     url:'https://www.higift.it',notes:''},
    {id:'w_pk_plexi_tr',   cat:'gadget_laser',  name:'Portachiavi Plexiglass Trasparente',unit:'pz',  qty:0, minStock:30,  costUnit:0.80, sup:'temaplex-shop.com',url:'https://temaplex-shop.com',notes:''},
    {id:'w_pk_bambu_cuore',cat:'gadget_laser',  name:'Portachiavi Bambù Cuore',           unit:'pz',  qty:0, minStock:20,  costUnit:0.88, sup:'gadget365.it',  url:'https://www.gadget365.it',notes:''},
    {id:'w_penna_bambu',   cat:'gadget_laser',  name:'Penna Bambù Naturale',              unit:'pz',  qty:0, minStock:20,  costUnit:0.95, sup:'gadget365.it',  url:'https://www.gadget365.it',notes:''},
    {id:'w_penna_met',     cat:'gadget_laser',  name:'Penna Metallo Silver',              unit:'pz',  qty:0, minStock:20,  costUnit:1.80, sup:'gadget365.it',  url:'https://www.gadget365.it',notes:''},
    {id:'w_tagliere_m',    cat:'gadget_laser',  name:'Tagliere Bambù M 30x20cm',          unit:'pz',  qty:0, minStock:10,  costUnit:3.80, sup:'gadget365.it',  url:'https://www.gadget365.it',notes:''},
    {id:'w_med_allum',     cat:'gadget_laser',  name:'Medaglia Alluminio 50mm',           unit:'pz',  qty:0, minStock:10,  costUnit:1.50, sup:'gadget365.it',  url:'https://www.gadget365.it',notes:''},
    {id:'w_sottobicch',    cat:'gadget_laser',  name:'Sottobicchiere Bambù Ø10cm',        unit:'pz',  qty:0, minStock:40,  costUnit:0.48, sup:'gadget365.it',  url:'https://www.gadget365.it',notes:''},
    {id:'w_usb_bambu16',   cat:'gadget_laser',  name:'Chiavetta USB 16GB Bambù',          unit:'pz',  qty:0, minStock:15,  costUnit:4.50, sup:'gadget365.it',  url:'https://www.gadget365.it',notes:''},
    {id:'w_calamita_bambu',cat:'gadget_laser',  name:'Calamita Bambù Rettangolare',       unit:'pz',  qty:0, minStock:30,  costUnit:0.55, sup:'gadget365.it',  url:'https://www.gadget365.it',notes:''},
    // ── GADGET SUBLIMAZIONE ───────────────────────────────────────
    {id:'w_tazza_bianca',  cat:'gadget_sub',    name:'Tazza Ceramica Bianca 11oz',        unit:'pz',  qty:0, minStock:30,  costUnit:1.47, sup:'sublimet.com',  url:'https://www.sublimet.com',notes:'Solo poliestere/ceramica bianca'},
    {id:'w_tazza_col',     cat:'gadget_sub',    name:'Tazza Ceramica Colorata 11oz',      unit:'pz',  qty:0, minStock:20,  costUnit:1.75, sup:'sublimet.com',  url:'https://www.sublimet.com',notes:''},
    {id:'w_cuscino_40',    cat:'gadget_sub',    name:'Cuscino Poliestere 40x40cm',        unit:'pz',  qty:0, minStock:10,  costUnit:2.10, sup:'sublimet.com',  url:'https://www.sublimet.com',notes:''},
    {id:'w_puzzle_120',    cat:'gadget_sub',    name:'Puzzle 120pz 30x42cm',              unit:'pz',  qty:0, minStock:10,  costUnit:2.90, sup:'sublimet.com',  url:'https://www.sublimet.com',notes:''},
    {id:'w_pannello_a4',   cat:'gadget_sub',    name:'Pannello MDF Bianco A4',            unit:'pz',  qty:0, minStock:20,  costUnit:1.20, sup:'sublimet.com',  url:'https://www.sublimet.com',notes:'Laser + Sublimazione'},
    {id:'w_borraccia',     cat:'gadget_sub',    name:'Borraccia Alluminio 500ml',         unit:'pz',  qty:0, minStock:10,  costUnit:2.80, sup:'sublimet.com',  url:'https://www.sublimet.com',notes:''},
    {id:'w_calamita_sub',  cat:'gadget_sub',    name:'Calamita Sub Rotonda 55mm',         unit:'pz',  qty:0, minStock:30,  costUnit:0.45, sup:'sublimet.com',  url:'https://www.sublimet.com',notes:''},
    // ── GADGET DTF ────────────────────────────────────────────────
    {id:'w_tshirt_bianca', cat:'gadget_dtf',    name:'T-Shirt Bianca 100% Cotone',        unit:'pz',  qty:0, minStock:20,  costUnit:2.20, sup:'wordans.it',    url:'https://www.wordans.it',notes:'Taglia mista S/M/L/XL'},
    {id:'w_tshirt_nera',   cat:'gadget_dtf',    name:'T-Shirt Nera Premium 190g/m²',      unit:'pz',  qty:0, minStock:15,  costUnit:2.80, sup:'wordans.it',    url:'https://www.wordans.it',notes:''},
    {id:'w_felpa_cappuccio',cat:'gadget_dtf',   name:'Felpa Cappuccio Unisex 300g',       unit:'pz',  qty:0, minStock:10,  costUnit:7.20, sup:'wordans.it',    url:'https://www.wordans.it',notes:''},
    {id:'w_shopper',       cat:'gadget_dtf',    name:'Shopper Cotton Canvas 38x42cm',     unit:'pz',  qty:0, minStock:20,  costUnit:1.80, sup:'sublimet.com',  url:'https://www.sublimet.com',notes:''},
    // ── MATERIE PRIME ─────────────────────────────────────────────
    {id:'w_mdf_3mm',       cat:'materie_prime', name:'Lastra MDF 3mm 60x30cm',            unit:'pz',  qty:0, minStock:20,  costUnit:0.85, sup:'bricoman.it',   url:'https://www.bricoman.it',notes:'Taglio laser'},
    {id:'w_bambu_2mm',     cat:'materie_prime', name:'Foglio Bambù 2mm 60x30cm',          unit:'pz',  qty:0, minStock:20,  costUnit:1.20, sup:'legno-e-design.it',url:'https://www.legno-e-design.it',notes:''},
    {id:'w_plexi_3mm_tr',  cat:'materie_prime', name:'Lastra Plexiglass Trasparente 3mm', unit:'m²',  qty:0, minStock:2,   costUnit:42.94,sup:'temaplex-shop.com',url:'https://temaplex-shop.com',notes:'€42.94/m²'},
    {id:'w_plexi_3mm_spec',cat:'materie_prime', name:'Lastra Plexiglass Specchiato Oro',  unit:'m²',  qty:0, minStock:1,   costUnit:68.00,sup:'temaplex-shop.com',url:'https://temaplex-shop.com',notes:'€68.00/m²'},
    {id:'w_pelle_nat',     cat:'materie_prime', name:'Foglio Pelle Naturale 30x20cm',     unit:'pz',  qty:0, minStock:10,  costUnit:3.50, sup:'atramentum.it', url:'https://www.atramentum.it',notes:''},
    {id:'w_sughero_4mm',   cat:'materie_prime', name:'Foglio Sughero 4mm 30x20cm',        unit:'pz',  qty:0, minStock:15,  costUnit:0.80, sup:'amazon.it',     url:'https://www.amazon.it',notes:''},
    {id:'w_acc_inox_3mm',  cat:'materie_prime', name:'Lastra Acciaio Inox 3mm 20x10cm',   unit:'pz',  qty:0, minStock:10,  costUnit:2.50, sup:'metaltex.it',   url:'https://www.metaltex.it',notes:'Per targhette'},
    // ── INCHIOSTRI & CONSUMABILI ──────────────────────────────────
    {id:'w_ink_sub_set',   cat:'inchiostri',    name:'Set Inchiostro Sublimazione 4x100ml',unit:'set', qty:0, minStock:2,   costUnit:18.90,sup:'sublimet.com',  url:'https://www.sublimet.com',notes:'Ciano/Magenta/Giallo/Nero'},
    {id:'w_carta_sub_a4',  cat:'inchiostri',    name:'Carta Sublimazione A4 100g 100 fogli',unit:'confezione',qty:0,minStock:2,costUnit:8.90,sup:'sublimet.com',url:'https://www.sublimet.com',notes:''},
    {id:'w_carta_sub_a3',  cat:'inchiostri',    name:'Carta Sublimazione A3 100g 50 fogli',unit:'confezione',qty:0,minStock:1,costUnit:12.50,sup:'sublimet.com',url:'https://www.sublimet.com',notes:''},
    {id:'w_film_dtf_30',   cat:'inchiostri',    name:'Film DTF Bianco 30cm Hot-Peel Rotolo',unit:'m',  qty:0, minStock:10,  costUnit:0.90, sup:'cplfabbrika.com',url:'https://www.cplfabbrika.com',notes:'€0.90/m — min 10m'},
    {id:'w_polvere_dtf',   cat:'inchiostri',    name:'Polvere Hot Melt DTF 500g',          unit:'confezione',qty:0,minStock:1,costUnit:14.90,sup:'cplfabbrika.com',url:'https://www.cplfabbrika.com',notes:''},
    {id:'w_nastro_silicone',cat:'inchiostri',   name:'Nastro Silicone Antiaderente 5m',    unit:'rotolo',qty:0,minStock:2,  costUnit:3.50, sup:'amazon.it',     url:'https://www.amazon.it',notes:'Per pressa termica'},
    {id:'w_feltro_laser',  cat:'inchiostri',    name:'Feltro Protezione Laser 30x30cm',    unit:'pz',  qty:0, minStock:5,   costUnit:1.20, sup:'amazon.it',     url:'https://www.amazon.it',notes:''},
    // ── MINUTERIA ─────────────────────────────────────────────────
    {id:'w_anello_pk_oro', cat:'minuteria',     name:'Anello Portachiavi Oro 25mm',        unit:'pz',  qty:0, minStock:200, costUnit:0.06, sup:'amazon.it',     url:'https://www.amazon.it',notes:'Conf. 100pz'},
    {id:'w_anello_pk_arg', cat:'minuteria',     name:'Anello Portachiavi Silver 25mm',     unit:'pz',  qty:0, minStock:200, costUnit:0.05, sup:'amazon.it',     url:'https://www.amazon.it',notes:''},
    {id:'w_moschettone',   cat:'minuteria',     name:'Moschettone Clip Acciaio 35mm',      unit:'pz',  qty:0, minStock:100, costUnit:0.18, sup:'amazon.it',     url:'https://www.amazon.it',notes:''},
    {id:'w_cordino_pk',    cat:'minuteria',     name:'Cordino Portachiavi Colorato 120mm', unit:'pz',  qty:0, minStock:100, costUnit:0.10, sup:'amazon.it',     url:'https://www.amazon.it',notes:''},
    {id:'w_vite_m3',       cat:'minuteria',     name:'Viti M3 Kit assortito 100pz',        unit:'set', qty:0, minStock:2,   costUnit:3.50, sup:'bricoman.it',   url:'https://www.bricoman.it',notes:''},
    {id:'w_biadesivo',     cat:'minuteria',     name:'Biadesivo Forte 3M 19mm x 10m',      unit:'rotolo',qty:0,minStock:3, costUnit:4.90, sup:'amazon.it',     url:'https://www.amazon.it',notes:'Per fissaggio targhe'},
    // ── PACKAGING ─────────────────────────────────────────────────
    {id:'w_sacchetto_org', cat:'packaging',     name:'Sacchetto Organza 10x15cm Assortiti',unit:'pz',  qty:0, minStock:100, costUnit:0.12, sup:'amazon.it',     url:'https://www.amazon.it',notes:'Per bomboniere'},
    {id:'w_scatola_bianca',cat:'packaging',     name:'Scatolina Bianca 10x7x3cm',          unit:'pz',  qty:0, minStock:50,  costUnit:0.35, sup:'amazon.it',     url:'https://www.amazon.it',notes:''},
    {id:'w_busta_kraft',   cat:'packaging',     name:'Busta Carta Kraft 15x21cm',          unit:'pz',  qty:0, minStock:100, costUnit:0.18, sup:'amazon.it',     url:'https://www.amazon.it',notes:''},
    {id:'w_carta_velina',  cat:'packaging',     name:'Carta Velina Bianca 50x70cm',        unit:'pz',  qty:0, minStock:100, costUnit:0.08, sup:'amazon.it',     url:'https://www.amazon.it',notes:''},
    {id:'w_nastro_raso',   cat:'packaging',     name:'Nastro Raso 1cm x 23m Bianco',       unit:'rotolo',qty:0,minStock:5, costUnit:1.20, sup:'amazon.it',     url:'https://www.amazon.it',notes:''},
    {id:'w_etichette',     cat:'packaging',     name:'Etichette Adesive Thank You 50pz',   unit:'set', qty:0, minStock:5,   costUnit:2.50, sup:'amazon.it',     url:'https://www.amazon.it',notes:''},
    // ── VERNICI & SPRAY ───────────────────────────────────────────
    {id:'w_lacca_bambu',   cat:'vernici',       name:'Lacca Spray Trasparente Lucida 400ml',unit:'pz',  qty:0, minStock:3,   costUnit:5.90, sup:'colorificio.it',url:'https://www.colorificio.it',notes:'Finitura protezione bambù'},
    {id:'w_spray_argento', cat:'vernici',       name:'Spray Argento Metallizzato 400ml',   unit:'pz',  qty:0, minStock:2,   costUnit:6.50, sup:'amazon.it',     url:'https://www.amazon.it',notes:'Per incisione metallo'},
    {id:'w_colorazione',   cat:'vernici',       name:'Colorante Legno Set 8 colori',       unit:'set', qty:0, minStock:1,   costUnit:14.90,sup:'amazon.it',     url:'https://www.amazon.it',notes:''},
    {id:'w_primer_bambu',  cat:'vernici',       name:'Primer Adesivo per Legno/Bambù 500ml',unit:'pz', qty:0, minStock:2,   costUnit:8.90, sup:'amazon.it',     url:'https://www.amazon.it',notes:''},
    // ── MACCHINARI ────────────────────────────────────────────────
    {id:'w_xtool_f2',      cat:'macchinari',    name:'xTool F2 Laser Diodo 15W+IR',        unit:'pz',  qty:1, minStock:1,   costUnit:1250, sup:'xtool.com',     url:'https://www.xtool.com/products/xtool-f2',notes:'Acquistato — 5 anni vita'},
    {id:'w_xtool_p3',      cat:'macchinari',    name:'xTool P3 Laser 20W Diodo',           unit:'pz',  qty:1, minStock:1,   costUnit:800,  sup:'xtool.com',     url:'https://www.xtool.com',notes:'Acquistato — 5 anni vita'},
    {id:'w_epson_et2865',  cat:'macchinari',    name:'Epson EcoTank ET-2865 Sublimazione',  unit:'pz',  qty:1, minStock:1,   costUnit:180,  sup:'epson.it',      url:'https://www.epson.it',notes:'Adattata sublimazione'},
    {id:'w_pressa',        cat:'macchinari',    name:'Pressa Termica 40x50cm',             unit:'pz',  qty:1, minStock:1,   costUnit:250,  sup:'amazon.it',     url:'https://www.amazon.it',notes:'DTF+Sub — 160-200°C'},
    {id:'w_transmatic',    cat:'macchinari',    name:'Transmatic TMH50 Taglierina',        unit:'pz',  qty:1, minStock:1,   costUnit:150,  sup:'transmaticsrl.it',url:'https://www.transmaticsrl.it',notes:'Vinile e transfer'},
    {id:'w_lente_lupa',    cat:'macchinari',    name:'Lente Ingrandimento Ispezione 10x',  unit:'pz',  qty:1, minStock:1,   costUnit:15,   sup:'amazon.it',     url:'https://www.amazon.it',notes:'Controllo qualità'},
    {id:'w_taglia_carta',  cat:'macchinari',    name:'Taglierina Manuale A4 30cm',         unit:'pz',  qty:1, minStock:1,   costUnit:25,   sup:'amazon.it',     url:'https://www.amazon.it',notes:''},
  ];

  function _load(){ try{ return JSON.parse(localStorage.getItem(SK)||'null'); }catch(e){ return null; } }
  function _save(d){ try{ localStorage.setItem(SK,JSON.stringify(d)); }catch(e){} }
  function _getItems(){
    var saved=_load();
    if(saved) return saved;
    var items=DEFAULT_ITEMS.map(function(x){ return Object.assign({},x); });
    _save(items); return items;
  }

  function getCatInfo(catId){
    return CATEGORIES.find(function(c){ return c.id===catId; })||{label:catId,color:'#6366f1'};
  }

  function _calcStats(items){
    var totalVal=0, lowStock=[], outStock=[];
    items.forEach(function(it){
      totalVal+=(it.qty||0)*(it.costUnit||0);
      if((it.qty||0)===0) outStock.push(it.name.slice(0,25));
      else if((it.qty||0)<(it.minStock||0)) lowStock.push(it.name.slice(0,25));
    });
    return {totalVal:totalVal, low:lowStock, out:outStock};
  }

  var _module = {
    render(){
      var el=document.getElementById('view-magazzino')||document.getElementById('view-warehouse');
      if(!el) return;
      var items=_getItems();
      var stats=_calcStats(items);
      var cats=[...new Set(items.map(function(i){return i.cat;}))];

      el.innerHTML='<div style="padding:16px 20px;max-width:1200px;margin:0 auto">'
        +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">'
        +'<span style="font-size:26px">🏭</span>'
        +'<div><div style="font-size:20px;font-weight:900;color:var(--text)">Magazzino Unificato</div>'
        +'<div style="font-size:11px;color:var(--text-muted)">Inventario completo · '+items.length+' articoli · Sincronizzato con i Quoter</div></div>'
        +'<div style="margin-left:auto;display:flex;gap:8px">'
        +'<button onclick="Warehouse.openManager()" style="padding:8px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">🏭 Gestisci Magazzino</button>'
        +'<button onclick="Warehouse.syncQuoters()" style="padding:8px 16px;background:rgba(34,197,94,.12);color:#22c55e;border:1.5px solid rgba(34,197,94,.25);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700">🔄 Sincronizza Quoter</button>'
        +'</div></div>'
        // KPI
        +'<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">'
        +'<div style="background:var(--bg-card2);border:1px solid #3b82f630;border-radius:12px;padding:14px;text-align:center"><div style="font-size:9px;color:#3b82f6;font-weight:700;text-transform:uppercase;margin-bottom:4px">Articoli Totali</div><div style="font-size:22px;font-weight:900;color:#3b82f6">'+items.length+'</div></div>'
        +'<div style="background:var(--bg-card2);border:1px solid #10b98130;border-radius:12px;padding:14px;text-align:center"><div style="font-size:9px;color:#10b981;font-weight:700;text-transform:uppercase;margin-bottom:4px">Valore Stock</div><div style="font-size:22px;font-weight:900;color:#10b981">€'+stats.totalVal.toFixed(0)+'</div></div>'
        +'<div style="background:var(--bg-card2);border:1px solid #f59e0b30;border-radius:12px;padding:14px;text-align:center"><div style="font-size:9px;color:#f59e0b;font-weight:700;text-transform:uppercase;margin-bottom:4px">Scorta Bassa</div><div style="font-size:22px;font-weight:900;color:#f59e0b">'+stats.low.length+'</div></div>'
        +'<div style="background:var(--bg-card2);border:1px solid #ef444430;border-radius:12px;padding:14px;text-align:center"><div style="font-size:9px;color:#ef4444;font-weight:700;text-transform:uppercase;margin-bottom:4px">Esauriti</div><div style="font-size:22px;font-weight:900;color:#ef4444">'+stats.out.length+'</div></div>'
        +'<div style="background:var(--bg-card2);border:1px solid #8b5cf630;border-radius:12px;padding:14px;text-align:center"><div style="font-size:9px;color:#8b5cf6;font-weight:700;text-transform:uppercase;margin-bottom:4px">Categorie</div><div style="font-size:22px;font-weight:900;color:#8b5cf6">'+cats.length+'</div></div>'
        +'</div>'
        // Alerts
        +(stats.out.length||stats.low.length?
          '<div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:11px">'
          +(stats.out.length?'<div><span style="color:#ef4444;font-weight:700">🚨 Esauriti ('+stats.out.length+'): </span><span style="color:var(--text-muted)">'+stats.out.slice(0,5).join(' · ')+(stats.out.length>5?' …':'')+'</span></div>':'')
          +(stats.low.length?'<div style="margin-top:3px"><span style="color:#f59e0b;font-weight:700">⚠️ Scorta bassa ('+stats.low.length+'): </span><span style="color:var(--text-muted)">'+stats.low.slice(0,5).join(' · ')+(stats.low.length>5?' …':'')+'</span></div>':'')
          +'</div>':'')
        // Category overview cards
        +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">'
        +CATEGORIES.map(function(catInfo){
          var catItems=items.filter(function(i){ return i.cat===catInfo.id; });
          if(!catItems.length) return '';
          var val=catItems.reduce(function(s,i){return s+(i.qty||0)*(i.costUnit||0);},0);
          var hasLow=catItems.filter(function(i){return (i.qty||0)<(i.minStock||0);}).length;
          return '<button onclick="Warehouse.openManager(\''+catInfo.id+'\')" '
            +'style="background:var(--bg-card2);border:1.5px solid '+catInfo.color+'30;border-radius:12px;padding:14px;text-align:left;cursor:pointer;transition:.15s" '
            +'onmouseover="this.style.borderColor=\''+catInfo.color+'\'" onmouseout="this.style.borderColor=\''+catInfo.color+'30\'">'
            +'<div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:6px">'+catInfo.label+'</div>'
            +'<div style="font-size:22px;font-weight:900;color:'+catInfo.color+'">'+catItems.length+'</div>'
            +'<div style="font-size:10px;color:var(--text-dim);margin-top:3px">€'+val.toFixed(0)+' valore'+(hasLow?' · <span style="color:#f59e0b">'+hasLow+' basso</span>':'')+'</div>'
            +'</button>';
        }).filter(Boolean).join('')
        +'</div></div>';
    },

    openManager(filterCat){
      var items=_getItems();
      var self=this;
      var w=window.open('','_blank','width=1200,height=750,resizable=yes');
      if(!w){ if(typeof toast!=='undefined') toast('Abilita popup','info'); return; }
      w._items=items; w._SK=SK; w._cats=CATEGORIES; w._units=UNITS;
      var filterStr=filterCat?('data-cat="'+filterCat+'"'):'';

      var catOpts=CATEGORIES.map(function(c){return '<option value="'+c.id+'">'+c.label+'</option>';}).join('');
      var unitOpts=UNITS.map(function(u){return '<option value="'+u+'">'+u+'</option>';}).join('');

      var rows=items.map(function(it,i){
        var ci=CATEGORIES.find(function(c){return c.id===it.cat;})||{label:it.cat,color:'#6366f1'};
        var col=(it.qty||0)<=0?'#ef4444':(it.qty||0)<(it.minStock||1)?'#f59e0b':'#22c55e';
        var status=(it.qty||0)<=0?'ESAURITO':(it.qty||0)<(it.minStock||1)?'BASSO':'OK';
        return '<tr data-cat="'+it.cat+'" style="border-bottom:1px solid #1e293b">'
          +'<td style="padding:7px 10px;max-width:220px"><div style="font-size:12px;font-weight:700;color:#f1f5f9;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+it.name+'</div>'
          +'<div style="font-size:10px;color:#64748b"><span style="background:'+ci.color+'20;color:'+ci.color+';padding:1px 5px;border-radius:10px;font-size:9px">'+ci.label+'</span></div></td>'
          +'<td style="padding:7px 10px;text-align:center">'
          +'<div style="display:flex;align-items:center;gap:4px;justify-content:center">'
          +'<button onclick="adj('+i+',-1)" style="width:22px;height:22px;background:#ef444415;color:#ef4444;border:1px solid #ef444430;border-radius:5px;cursor:pointer;font-size:12px;line-height:1">−</button>'
          +'<input id="qty-'+i+'" type="number" min="0" value="'+(it.qty||0)+'" onchange="setQty('+i+',this.value)" style="width:58px;padding:3px;background:#0f172a;border:1.5px solid '+col+';border-radius:6px;color:'+col+';text-align:center;font-size:12px;font-weight:800">'
          +'<button onclick="adj('+i+',10)" style="width:30px;height:22px;background:#22c55e15;color:#22c55e;border:1px solid #22c55e30;border-radius:5px;cursor:pointer;font-size:11px;line-height:1">+10</button>'
          +'</div></td>'
          +'<td style="padding:7px 10px;text-align:center;color:#94a3b8;font-size:11px">'+it.unit+'</td>'
          +'<td style="padding:7px 10px;text-align:center;color:#64748b;font-size:11px">'+it.minStock+'</td>'
          +'<td style="padding:7px 10px;text-align:center">'
          +'<div style="display:flex;align-items:center;gap:3px;justify-content:center">'
          +'<span style="color:#94a3b8;font-size:11px">€</span>'
          +'<input type="number" min="0" step="0.001" value="'+(it.costUnit||0).toFixed(2)+'" onchange="setCost('+i+',this.value)" style="width:75px;padding:3px;background:#0f172a;border:1px solid #334155;border-radius:6px;color:#f1f5f9;text-align:right;font-size:11px">'
          +'</div></td>'
          +'<td style="padding:7px 10px;font-size:11px;color:#94a3b8;max-width:120px">'
          +'<a href="'+it.url+'" target="_blank" style="color:#818cf8;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block" title="'+it.url+'">'+it.sup+'</a></td>'
          +'<td style="padding:7px 10px;text-align:center"><span style="background:'+col+'20;color:'+col+';padding:2px 7px;border-radius:20px;font-size:9px;font-weight:800">'+status+'</span></td>'
          +'<td style="padding:7px 10px;text-align:center">'
          +'<div style="display:flex;gap:3px;justify-content:center">'
          +'<button onclick="editItem('+i+')" style="padding:3px 7px;background:#6366f120;color:#818cf8;border:1px solid #6366f140;border-radius:5px;cursor:pointer;font-size:11px">✏️</button>'
          +'<button onclick="delItem('+i+')" style="padding:3px 7px;background:#ef444415;color:#ef4444;border:1px solid #ef444430;border-radius:5px;cursor:pointer;font-size:11px">🗑</button>'
          +'</div></td></tr>';
      }).join('');

      var catFilterBtns=CATEGORIES.map(function(ci){
        var n=items.filter(function(x){return x.cat===ci.id;}).length;
        return '<button onclick="filterCat(\''+ci.id+'\')" data-catbtn="'+ci.id+'" style="padding:5px 10px;background:'+ci.color+'15;color:'+ci.color+';border:1px solid '+ci.color+'30;border-radius:20px;cursor:pointer;font-size:10px;font-weight:700;white-space:nowrap">'+ci.label+' ('+n+')</button>';
      }).join('');

      w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>🏭 Magazzino Unificato</title>'
        +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;font-size:13px}'
        +'.hdr{display:flex;align-items:center;gap:12px;padding:14px 20px;background:#1e293b;border-bottom:1px solid #334155;flex-wrap:wrap;gap:8px}'
        +'h1{font-size:16px;font-weight:900;white-space:nowrap}'
        +'.cats{display:flex;gap:6px;flex-wrap:wrap;padding:8px 20px;background:#1e293b;border-bottom:1px solid #334155;overflow-x:auto}'
        +'.searchbar{display:flex;gap:8px;padding:8px 20px;background:#0f172a;border-bottom:1px solid #1e293b}'
        +'input.srch{flex:1;padding:7px 12px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#f1f5f9;font-size:12px}'
        +'.wrap{overflow-y:auto;height:calc(100vh - 180px)}'
        +'table{width:100%;border-collapse:collapse}'
        +'thead th{background:#1e293b;padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;position:sticky;top:0}'
        +'.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:99;align-items:center;justify-content:center}'
        +'.modal.on{display:flex}.mbox{background:#1e293b;border-radius:14px;padding:22px;width:560px;border:1px solid #334155;max-height:90vh;overflow-y:auto}'
        +'input[type=text],input[type=number],input[type=url],select,textarea{width:100%;padding:7px 9px;background:#0f172a;border:1px solid #334155;border-radius:7px;color:#f1f5f9;font-size:12px;margin-bottom:8px}'
        +'label{font-size:9px;color:#64748b;display:block;margin-bottom:2px}'
        +'.btn{padding:8px 16px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700}'
        +'.bp{background:#6366f1;color:#fff}.bg{background:#10b981;color:#fff}.br{background:#1e293b;color:#94a3b8;border:1px solid #334155}'
        +'</style></head><body>'
        +'<div class="hdr">'
        +'<span style="font-size:22px">🏭</span>'
        +'<h1>Magazzino Unificato ('+items.length+')</h1>'
        +'<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">'
        +'<button class="btn bg" onclick="openAdd()">+ Aggiungi Articolo</button>'
        +'<button class="btn br" onclick="exportCSV()">📤 CSV</button>'
        +'<button class="btn br" onclick="resetDef()">↺ Default</button>'
        +'<button class="btn bp" onclick="savAndClose()">✅ Salva e Chiudi</button>'
        +'</div></div>'
        +'<div class="cats"><button onclick="filterCat(\'\')" style="padding:5px 10px;background:#ffffff15;color:#fff;border:1px solid #334155;border-radius:20px;cursor:pointer;font-size:10px;font-weight:700">Tutti ('+items.length+')</button>'
        +catFilterBtns+'</div>'
        +'<div class="searchbar">'
        +'<input class="srch" id="srch" oninput="filterTable()" placeholder="🔍 Cerca per nome, fornitore, categoria...">'
        +'</div>'
        +'<div class="wrap"><table>'
        +'<thead><tr><th style="min-width:200px">Articolo</th><th style="min-width:150px;text-align:center">Quantità</th><th>Unità</th><th>Min.Stock</th><th style="min-width:110px">Costo/u</th><th>Fornitore</th><th>Status</th><th>Azioni</th></tr></thead>'
        +'<tbody id="tbody">'+rows+'</tbody></table></div>'
        // MODAL
        +'<div class="modal" id="modal"><div class="mbox">'
        +'<div style="font-size:15px;font-weight:900;margin-bottom:14px" id="mtitle">Nuovo Articolo</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">'
        +'<div><label>Categoria</label><select id="fi-cat">'+catOpts+'</select></div>'
        +'<div><label>Unità di misura</label><select id="fi-unit">'+unitOpts+'</select></div>'
        +'</div>'
        +'<label>Nome articolo</label><input type="text" id="fi-name" placeholder="Es. Portachiavi Bambù 40mm">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 10px">'
        +'<div><label>Quantità attuale</label><input type="number" id="fi-qty" min="0" value="0"></div>'
        +'<div><label>Scorta minima</label><input type="number" id="fi-min" min="0" value="10"></div>'
        +'<div><label>Costo acquisto €/u</label><input type="number" id="fi-cost" min="0" step="0.001" value="0"></div>'
        +'</div>'
        +'<label>Fornitore</label><input type="text" id="fi-sup" placeholder="gadget365.it">'
        +'<label>URL Fornitore</label><input type="url" id="fi-url" placeholder="https://...">'
        +'<label>Note</label><textarea id="fi-notes" rows="2" style="height:50px;resize:vertical"></textarea>'
        +'<div style="display:flex;gap:8px;margin-top:6px">'
        +'<button class="btn bp" onclick="saveItem()">💾 Salva</button>'
        +'<button class="btn br" onclick="closeModal()">✕ Annulla</button>'
        +'</div></div></div>'
        +'<script>'
        +'var items=window._items||[]; var eidx=-1;'
        +'var currentCat="'+(filterCat||'')+'";'
        +'function save(){try{localStorage.setItem(window._SK,JSON.stringify(items));}catch(e){}}'
        +'function adj(i,d){items[i].qty=Math.max(0,(items[i].qty||0)+d);save();var inp=document.getElementById("qty-"+i);var col=items[i].qty<=0?"#ef4444":items[i].qty<(items[i].minStock||1)?"#f59e0b":"#22c55e";if(inp){inp.value=items[i].qty;inp.style.borderColor=col;inp.style.color=col;}}'
        +'function setQty(i,v){items[i].qty=Math.max(0,parseFloat(v)||0);save();}'
        +'function setCost(i,v){items[i].costUnit=parseFloat(v)||0;save();}'
        +'function filterCat(cat){currentCat=cat;var rows=document.querySelectorAll("#tbody tr");rows.forEach(function(r){var rc=r.getAttribute("data-cat");r.style.display=(!cat||rc===cat)?"":"none";});filterTable();}'
        +'function filterTable(){var q=document.getElementById("srch").value.toLowerCase();var rows=document.querySelectorAll("#tbody tr");rows.forEach(function(r){if(currentCat&&r.getAttribute("data-cat")!==currentCat){r.style.display="none";return;}var txt=r.textContent.toLowerCase();r.style.display=(!q||txt.includes(q))?"":"none";});}'
        +'function openAdd(){eidx=-1;document.getElementById("mtitle").textContent="Nuovo Articolo";["name","sup","url","notes"].forEach(function(f){var el=document.getElementById("fi-"+f);if(el)el.value="";});["qty","min","cost"].forEach(function(f){var el=document.getElementById("fi-"+f);if(el)el.value=f==="min"?"10":"0";});document.getElementById("modal").classList.add("on");}'
        +'function editItem(i){eidx=i;var it=items[i];document.getElementById("mtitle").textContent="Modifica: "+it.name;document.getElementById("fi-cat").value=it.cat||"altro";document.getElementById("fi-unit").value=it.unit||"pz";document.getElementById("fi-name").value=it.name;document.getElementById("fi-qty").value=it.qty||0;document.getElementById("fi-min").value=it.minStock||0;document.getElementById("fi-cost").value=(it.costUnit||0).toFixed(2);document.getElementById("fi-sup").value=it.sup||"";document.getElementById("fi-url").value=it.url||"";document.getElementById("fi-notes").value=it.notes||"";document.getElementById("modal").classList.add("on");}'
        +'function saveItem(){var name=document.getElementById("fi-name").value;if(!name){alert("Inserisci un nome!");return;}var it={id:eidx>=0?items[eidx].id:"w_"+Date.now().toString().slice(-8),cat:document.getElementById("fi-cat").value,unit:document.getElementById("fi-unit").value,name:name,qty:parseFloat(document.getElementById("fi-qty").value)||0,minStock:parseFloat(document.getElementById("fi-min").value)||0,costUnit:parseFloat(document.getElementById("fi-cost").value)||0,sup:document.getElementById("fi-sup").value||"",url:document.getElementById("fi-url").value||"",notes:document.getElementById("fi-notes").value||"",lastUpdated:new Date().toISOString()};if(eidx>=0)items[eidx]=it;else items.push(it);save();window.location.reload();}'
        +'function delItem(i){if(!confirm("Eliminare: "+items[i].name+"?"))return;items.splice(i,1);save();window.location.reload();}'
        +'function closeModal(){document.getElementById("modal").classList.remove("on");}'
        +'function exportCSV(){var r=[["Categoria","Nome","Quantita","Unita","Scorta Min","Costo/u","Valore Stock","Fornitore","URL","Note"]];items.forEach(function(it){r.push([it.cat,it.name,it.qty||0,it.unit,it.minStock||0,(it.costUnit||0).toFixed(2),((it.qty||0)*(it.costUnit||0)).toFixed(2),it.sup,it.url,it.notes||""]);});var csv=r.map(function(row){return row.map(function(v){return\'"\'+String(v).replace(/"/g,\'\\\'\')+\'"\';}).join(",");}).join("\\n");var a=document.createElement("a");a.href="data:text/csv;charset=utf-8,\\uFEFF"+encodeURIComponent(csv);a.download="magazzino_ingly_"+new Date().toISOString().slice(0,10)+".csv";a.click();}'
        +'function resetDef(){if(!confirm("Ripristinare il magazzino predefinito? Tutte le modifiche andranno perse."))return;localStorage.removeItem(window._SK);window.close();}'
        +'function savAndClose(){save();window.close();}'
        +(filterCat?'setTimeout(function(){filterCat("'+filterCat+'");},100);':'')
        +'<\/script></body></html>');
      w.document.close();
      var t=setInterval(function(){
        if(w.closed){
          clearInterval(t);
          if(typeof Warehouse!=='undefined') Warehouse.render();
          if(typeof toast!=='undefined') toast('🏭 Magazzino aggiornato','success');
        }
      },1000);
    },

    syncQuoters(){
      var items=_getItems();
      var synced=0;
      // Sync with LaserB2B stock
      if(typeof LaserB2B!=='undefined' && LaserB2B._loadStock){
        var stock=LaserB2B._loadStock()||{};
        items.forEach(function(it){
          if(it.cat==='gadget_laser'||it.cat==='gadget_sub'||it.cat==='gadget_dtf'){
            // Try to match by name similarity
            var prods=LaserB2B._PRODUCTS||[];
            prods.forEach(function(p){
              var pName=(p.name||'').toLowerCase();
              var iName=it.name.toLowerCase();
              if(pName.includes(iName.slice(0,15))||iName.includes(pName.slice(0,15))){
                if(!stock[p.id]) stock[p.id]={qty:0,cost:p.cost||p.costSup||0,reorder:5};
                stock[p.id].qty=it.qty||0;
                stock[p.id].cost=it.costUnit||p.cost||p.costSup||0;
                synced++;
              }
            });
          }
        });
        LaserB2B._saveStock&&LaserB2B._saveStock(stock);
      }
      if(typeof toast!=='undefined') toast('🔄 Sincronizzati '+synced+' articoli con i Quoter','success');
      this.render();
    },
  };

  // Patch navigate for magazzino/warehouse
  (function _patchWarehouseRoute(){
    function _p(){
      if(typeof App==='undefined'||!App.renderSection){ setTimeout(_p,700); return; }
      if(App._warehousePatch) return; App._warehousePatch=true;
      var _o=App.renderSection.bind(App);
      App.renderSection=async function(s){
        if(s==='magazzino'||s==='warehouse'||s==='inventario'){
          document.querySelectorAll('.section-view.active').forEach(function(v){v.classList.remove('active');});
          var el=document.getElementById('view-magazzino')||document.getElementById('view-warehouse');
          if(!el){ el=document.createElement('div'); el.id='view-magazzino'; el.className='section-view'; var ci=document.getElementById('content-inner'); if(ci) ci.appendChild(el); }
          el.classList.add('active'); Warehouse.render(); return;
        }
        return _o(s);
      };
    }
    setTimeout(_p,1400);
  })();

  return _module;
})();

// Add Magazzino nav item
(function _addWarehouseNav(){
  function _p(){
    if(!document.getElementById('html-root')){ setTimeout(_p,500); return; }
    if(document.querySelector('[data-section="magazzino"]')) return;
    // Find a good insertion point — after laser_b2b nav
    var lb2bNav=document.querySelector('[data-section="laser_b2b"]');
    if(lb2bNav){
      var newNav=document.createElement('div');
      newNav.className='nav-item'; newNav.setAttribute('data-section','magazzino');
      newNav.setAttribute('onclick',"App.navigate('magazzino')");
      newNav.style.cssText='color:#10b981;font-weight:700';
      newNav.innerHTML='<i class="nav-icon fas fa-warehouse"></i> 🏭 Magazzino';
      lb2bNav.insertAdjacentElement('afterend',newNav);
      // Also add view element
      if(!document.getElementById('view-magazzino')){
        var el=document.createElement('div'); el.id='view-magazzino'; el.className='section-view';
        el.style.cssText='padding:0;overflow-y:auto';
        var ci=document.getElementById('content-inner'); if(ci) ci.appendChild(el);
      }
    }
  }
  setTimeout(_p,1800);
})();

console.log('[INGLY v24] Warehouse + B2B fix loaded');


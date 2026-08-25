
// ════════════════════════════════════════════════════════════════════════
// INGLY OS v10 — LAB SETUP & LISTA ACQUISTI AI
// Sistema decisionale + gestione operativa + ottimizzazione costi
// ════════════════════════════════════════════════════════════════════════

const LabSetup = {

  // ── IDB Keys ────────────────────────────────────────────────────────
  _SK_PRODUCTS:  'lab_products_v1',
  _SK_KITS:      'lab_kits_v1',
  _SK_PURCHASES: 'lab_purchases_v1',

  // ── CATEGORIES ──────────────────────────────────────────────────────
  CATS: [
    {id:'all',      em:'📦', label:'Tutti',              color:'#6366f1'},
    {id:'chimica',  em:'🧪', label:'Chimica & Assemblaggio', color:'#10b981'},
    {id:'finitura', em:'🎨', label:'Verniciatura & Finitura',color:'#f59e0b'},
    {id:'sublim',   em:'🔥', label:'Sublimazione',          color:'#ef4444'},
    {id:'video',    em:'🎬', label:'Video ASMR & Studio',    color:'#a855f7'},
    {id:'sicurezza',em:'🛡️', label:'Sicurezza & Ordine',     color:'#3b82f6'},
    {id:'utensili', em:'🔧', label:'Utensili & Minuteria',   color:'#f97316'},
    {id:'laser',    em:'⚡', label:'Laser & Incisione',      color:'#ec4899'},
    {id:'packaging',em:'🎁', label:'Packaging & Spedizione', color:'#22c55e'},
  ],

  // ── AI ENGINE: Machine → Materials mapping ──────────────────────────
  AI_ENGINE: {
    machineMap: {
      'xTool P3':       [{name:'Alcol Isopropilico 99,9%',cat:'chimica',priority:'CRITICAL',cost:20,link:'https://amzn.to/xTool'},
                         {name:'Application Tape 610mm',  cat:'laser',  priority:'CRITICAL',cost:90},
                         {name:'Maschera FFP2 anti-fumi',  cat:'sicurezza',priority:'HIGH',cost:15},
                         {name:'Aspiratore fumi portatile',cat:'sicurezza',priority:'HIGH',cost:45},
                         {name:'Colla Cianoacrilica + Attivatore',cat:'chimica',priority:'HIGH',cost:25},
                         {name:'Occhiali protezione laser',cat:'sicurezza',priority:'CRITICAL',cost:20}],
      'Laser CO2':      [{name:'Alcol Isopropilico 99,9%',cat:'chimica', priority:'CRITICAL',cost:20},
                         {name:'Application Tape',        cat:'laser',   priority:'CRITICAL',cost:90},
                         {name:'Aspiratore fumi 200m³/h', cat:'sicurezza',priority:'CRITICAL',cost:120},
                         {name:'Occhiali CO2 190-540nm',  cat:'sicurezza',priority:'CRITICAL',cost:35},
                         {name:'Maschera A2B2 filtri fumi',cat:'sicurezza',priority:'HIGH',cost:40}],
      'Laser Fibra':    [{name:'Occhiali protezione 1064nm',cat:'sicurezza',priority:'CRITICAL',cost:50},
                         {name:'Liquidi pulizia metalli', cat:'chimica',  priority:'MEDIUM',cost:15}],
      'Sublimazione':   [{name:'Carta sublimatica 100 fogli',cat:'sublim',priority:'CRITICAL',cost:25},
                         {name:'Nastro termico resistente', cat:'sublim', priority:'HIGH',cost:12},
                         {name:'Guanti termici protezione', cat:'sicurezza',priority:'HIGH',cost:10}],
      'Plotter taglio': [{name:'Lame da taglio sostitutive',cat:'utensili',priority:'HIGH',cost:15},
                         {name:'Tappetino taglio A3',      cat:'utensili',priority:'MEDIUM',cost:20},
                         {name:'Application Tape',         cat:'laser',  priority:'HIGH',cost:30}],
      'Stampante UV':   [{name:'Inchiostro UV colori',     cat:'chimica', priority:'CRITICAL',cost:80},
                         {name:'Primer UV adesivo',         cat:'finitura',priority:'HIGH',cost:25}],
    },

    materialMap: {
      'MDF':      [{name:'Carta abrasiva 120/240/400',cat:'finitura',priority:'MEDIUM',cost:12},
                   {name:'Cera protettiva legno',     cat:'finitura',priority:'LOW',cost:15},
                   {name:'Mordente per legno',         cat:'finitura',priority:'LOW',cost:10}],
      'Acrilico': [{name:'Acrifix 192 colla acrilico',cat:'chimica', priority:'HIGH',cost:18},
                   {name:'Panni microfibra antigraffio',cat:'utensili',priority:'MEDIUM',cost:8},
                   {name:'Alcol Isopropilico spray',   cat:'chimica', priority:'HIGH',cost:12}],
      'Ardesia':  [{name:'Pennello rimozione polvere', cat:'utensili',priority:'MEDIUM',cost:5},
                   {name:'Olio di lino pulizia',       cat:'finitura',priority:'LOW',cost:8}],
      'Cuoio':    [{name:'Cera per cuoio neutра',     cat:'finitura',priority:'MEDIUM',cost:12},
                   {name:'Tagliarina affilata',         cat:'utensili',priority:'HIGH',cost:25}],
    },

    // LIVELLO 2: Contextual logic
    contextRules: [
      {if:'Acrilico', then:'Acrifix 192', reason:'Incollaggio acrilico professionale'},
      {if:'MDF',      then:'Cera protettiva', reason:'Protegge bordi dopo taglio laser'},
      {if:'Cuoio',    then:'Cera per cuoio', reason:'Mantiene la finitura naturale'},
      {if:'xTool P3', then:'Alcol Isopropilico', reason:'Pulizia lenti laser essenziale'},
    ],

    // LIVELLO 3: Decision engine priorities
    decisionMatrix: {
      CRITICAL: {color:'#ef4444',bg:'#ef444415',border:'#ef444440',label:'🔴 CRITICO',order:0},
      HIGH:     {color:'#f97316',bg:'#f9731615',border:'#f9731640',label:'🟠 ALTO',order:1},
      MEDIUM:   {color:'#f59e0b',bg:'#f59e0b15',border:'#f59e0b40',label:'🟡 MEDIO',order:2},
      LOW:      {color:'#22c55e',bg:'#22c55e15',border:'#22c55e40',label:'🟢 BASSO',order:3},
    },

    async generateSuggestions(products, machines, materials) {
      const missing = [];
      const productNames = (products||[]).map(p=>p.name.toLowerCase());

      // Machine-based suggestions
      machines.forEach(machine=>{
        const needs = this.machineMap[machine]||[];
        needs.forEach(item=>{
          if(!productNames.some(n=>n.includes(item.name.toLowerCase().slice(0,8)))){
            missing.push({...item, reason:`Necessario per ${machine}`});
          }
        });
      });

      // Material-based suggestions
      (materials||[]).forEach(mat=>{
        const needs = this.materialMap[mat]||[];
        needs.forEach(item=>{
          if(!productNames.some(n=>n.includes(item.name.toLowerCase().slice(0,8)))){
            missing.push({...item, reason:`Usato con materiale ${mat}`});
          }
        });
      });

      // Dedup
      const seen = new Set();
      return missing.filter(m=>{ const k=m.name.slice(0,12); if(seen.has(k)) return false; seen.add(k); return true; })
        .sort((a,b)=>(this.decisionMatrix[a.priority]?.order||9)-(this.decisionMatrix[b.priority]?.order||9));
    },

    generateAdvice(missing, products) {
      const critical = missing.filter(i=>i.priority==='CRITICAL');
      const high     = missing.filter(i=>i.priority==='HIGH');
      if(critical.length>0) return {level:'critical', msg:`⚠️ ATTENZIONE: ${critical.length} elementi CRITICI mancanti. Rischio blocco produzione immediato. Ordina subito: ${critical.slice(0,2).map(i=>i.name).join(', ')}.`};
      if(high.length>3)     return {level:'warn',     msg:`💡 ${high.length} elementi ad alta priorità mancanti. Crea un kit starter per risparmiare sulle spedizioni (~€8-15).`};
      if(missing.length>0)  return {level:'info',     msg:`📋 ${missing.length} elementi da considerare. Nessuna urgenza ma conviene ordinarli nel prossimo acquisto.`};
      return {level:'ok', msg:'✅ Setup laboratorio bilanciato. Tutto l\'essenziale è presente!'};
    }
  },

  // ── PRESET KITS ────────────────────────────────────────────────────
  KITS: {
    'starter_laser': {
      name:'⚡ Starter Laser Essenziale', color:'#ec4899',
      desc:'Kit minimo indispensabile per avviare la produzione laser in sicurezza',
      items:['Alcol Isopropilico 99,9% 5L','Application Tape 610mm x 100m',
             'Colla Cianoacrilica + Attivatore','Maschera FFP2 anti-fumi',
             'Occhiali protezione laser','Guanti nitrile taglia M']
    },
    'finitura_pro': {
      name:'🎨 Kit Finitura Professionale', color:'#f59e0b',
      desc:'Tutto per rifinire e valorizzare i prodotti laser in legno e acrilico',
      items:['Carta abrasiva kit 120/240/400/800','Cera protettiva per legno naturale',
             'Acrifix 192 colla acrilico','Panni microfibra antigraffio',
             'Primer spray adesivo','Pennello dettaglio piccolo']
    },
    'sicurezza_lab': {
      name:'🛡️ Kit Sicurezza Laboratorio', color:'#3b82f6',
      desc:'Protezione completa per lavorare in sicurezza con laser e prodotti chimici',
      items:['Aspiratore fumi portatile','Occhiali protezione laser',
             'Maschera A2B2 filtri organici','Guanti nitrile 100 pz',
             'Estintore CO2 2kg','Occhiali splash protection']
    },
    'packaging_pro': {
      name:'🎁 Kit Packaging Premium', color:'#22c55e',
      desc:'Packaging professionale che aumenta il valore percepito e le recensioni positive',
      items:['Box regalo kraft 10×10 x100','Carta velina bianca premium',
             'Nastro raso 10mm vari colori','Bigliettini ringraziamento stampati',
             'Bollette bolla accompagnamento','Bustine zip protezione prodotto']
    },
    'video_studio': {
      name:'🎬 Kit Video ASMR Studio', color:'#a855f7',
      desc:'Setup minimo per video marketing professionale dei tuoi prodotti',
      items:['Ring light LED 10" con treppiede','Sfondo carta seamless grigio 1.8m',
             'Microfono lavalier wireless','Supporto telefono/camera regolabile',
             'LED strip warm 2700K','Pannello fonoassorbente']
    },
    'sublimazione': {
      name:'🔥 Kit Sublimazione Completo', color:'#ef4444',
      desc:'Materiali essenziali per la stampa a sublimazione',
      items:['Carta sublimatica 120g A4 x100','Nastro termico alta temp resistente',
             'Guanti termici 300°C','Spray trasferimento sublimatico',
             'Bilancia precisione 0.1g','Termometro IR pistola']
    },
  },

  // ── PRESET PRODUCTS (pre-loaded database) ──────────────────────────
  _PRESET_PRODUCTS: [
    // CHIMICA & ASSEMBLAGGIO
    {id:1, name:'Colla Cianoacrilica + Attivatore Wolfix', cat:'chimica', priority:'CRITICAL', qty:1, qtyMin:1, cost:24.90, unit:'kit', link:'https://www.amazon.it/s?k=colla+cianoacrilica+attivatore', note:'Incollaggi rapidi finissaggi laser', tags:['laser','assemblaggio'], inStock:true},
    {id:2, name:'Alcol Isopropilico 99,9% 5L GiDeli',     cat:'chimica', priority:'CRITICAL', qty:1, qtyMin:1, cost:20.49, unit:'flacone', link:'https://www.amazon.it/s?k=alcol+isopropilico+5l', note:'Pulizia lenti e materiali laser', tags:['laser','pulizia'], inStock:true},
    {id:3, name:'Acrifix 192 Colla Acrilico 125ml',        cat:'chimica', priority:'HIGH',     qty:0, qtyMin:1, cost:18.50, unit:'flacone', link:'https://www.amazon.it/s?k=acrifix+192', note:'Incollaggio acrilico professionale', tags:['acrilico'], inStock:false},
    {id:4, name:'Acetone puro 1L',                         cat:'chimica', priority:'MEDIUM',   qty:1, qtyMin:1, cost:8.50,  unit:'litro',   link:'https://www.amazon.it/s?k=acetone+puro+1l', note:'Pulizia bordi acrilico e degreasing', tags:['acrilico','pulizia'], inStock:true},
    {id:5, name:'Silicone trasparente neutro 280ml',       cat:'chimica', priority:'LOW',      qty:2, qtyMin:1, cost:6.90,  unit:'cartuccia',link:'https://www.amazon.it/s?k=silicone+trasparente+neutro', note:'Sigillatura e assemblaggi', tags:['assemblaggio'], inStock:true},
    // LASER & INCISIONE
    {id:6, name:'Application Tape 610mm × 100m',           cat:'laser',  priority:'CRITICAL', qty:1, qtyMin:1, cost:89.00, unit:'rotolo',  link:'https://www.creativamenteplotter.it/application-tape', note:'Protezione superfici durante incisione', tags:['laser','protezione'], inStock:true},
    {id:7, name:'Application Tape 30cm × 50m (piccolo)',   cat:'laser',  priority:'HIGH',     qty:0, qtyMin:2, cost:22.00, unit:'rotolo',  link:'https://www.amazon.it/s?k=application+tape+30cm', note:'Per pezzi piccoli', tags:['laser'], inStock:false},
    {id:8, name:'Carta abrasiva kit 120/240/400/800',       cat:'laser',  priority:'MEDIUM',   qty:1, qtyMin:1, cost:12.90, unit:'kit',     link:'https://www.amazon.it/s?k=carta+abrasiva+assortita', note:'Finitura post-laser su legno', tags:['legno','finitura'], inStock:true},
    // VERNICIATURA & FINITURA
    {id:9, name:'Cera protettiva legno naturale 500ml',    cat:'finitura',priority:'MEDIUM',   qty:1, qtyMin:1, cost:14.90, unit:'barattolo',link:'https://www.amazon.it/s?k=cera+protettiva+legno+naturale', note:'Protegge e valorizza legno laser', tags:['legno'], inStock:true},
    {id:10,name:'Mordente per legno noce medio 250ml',     cat:'finitura',priority:'LOW',      qty:0, qtyMin:1, cost:9.90,  unit:'flacone', link:'https://www.amazon.it/s?k=mordente+legno+noce', note:'Colorazione legno artigianale', tags:['legno','colore'], inStock:false},
    {id:11,name:'Primer spray adesivo 400ml',              cat:'finitura',priority:'LOW',      qty:1, qtyMin:1, cost:8.50,  unit:'bomboletta',link:'https://www.amazon.it/s?k=primer+spray+adesivo', note:'Adesione vernici su acrilico', tags:['acrilico','vernice'], inStock:true},
    {id:12,name:'Vernice spray acrilica trasparente opaca',cat:'finitura',priority:'LOW',      qty:0, qtyMin:2, cost:7.90,  unit:'bomboletta',link:'https://www.amazon.it/s?k=vernice+spray+acrilica+opaca', note:'Protezione finale prodotti legno', tags:['legno'], inStock:false},
    // SICUREZZA & ORDINE
    {id:13,name:'Occhiali protezione laser OD4+ xTool',   cat:'sicurezza',priority:'CRITICAL',qty:2, qtyMin:2, cost:19.90, unit:'paio',    link:'https://www.amazon.it/s?k=occhiali+protezione+laser+od4', note:'OBBLIGATORI durante uso laser diode', tags:['laser','sicurezza'], inStock:true},
    {id:14,name:'Maschera FFP2 anti-fumi laser x20',      cat:'sicurezza',priority:'HIGH',    qty:1, qtyMin:1, cost:14.90, unit:'confezione',link:'https://www.amazon.it/s?k=mascherina+ffp2+fumi+laser', note:'Protezione fumi durante lavorazione', tags:['laser','sicurezza'], inStock:true},
    {id:15,name:'Guanti nitrile monouso M x100',          cat:'sicurezza',priority:'HIGH',    qty:1, qtyMin:2, cost:8.90,  unit:'box',     link:'https://www.amazon.it/s?k=guanti+nitrile+100+pz', note:'Manipolazione solventi e collanti', tags:['sicurezza','chimica'], inStock:true},
    {id:16,name:'Aspiratore fumi portatile laser',        cat:'sicurezza',priority:'HIGH',    qty:0, qtyMin:1, cost:45.00, unit:'pezzo',   link:'https://www.amazon.it/s?k=aspiratore+fumi+laser', note:'Ventilazione area lavoro', tags:['laser','sicurezza'], inStock:false},
    // SUBLIMAZIONE
    {id:17,name:'Carta sublimatica 120g A4 x100 fogli',  cat:'sublim',  priority:'HIGH',     qty:0, qtyMin:1, cost:24.90, unit:'confezione',link:'https://www.amazon.it/s?k=carta+sublimatica+a4+100', note:'Trasferimento immagine su tessuto/ceramica', tags:['sublimazione'], inStock:false},
    {id:18,name:'Nastro termico resistente alta temp',   cat:'sublim',  priority:'HIGH',     qty:0, qtyMin:2, cost:11.90, unit:'rotolo',  link:'https://www.amazon.it/s?k=nastro+termico+sublimatica', note:'Fissaggio carta durante pressa', tags:['sublimazione'], inStock:false},
    // UTENSILI & MINUTERIA
    {id:19,name:'Forbici professionali Fiskars 21cm',    cat:'utensili',priority:'HIGH',     qty:1, qtyMin:1, cost:16.90, unit:'paio',    link:'https://www.amazon.it/s?k=forbici+fiskars+21cm', note:'Taglio packaging e materiali', tags:['utensili'], inStock:true},
    {id:20,name:'Taglierina con guida + tappetino A3',   cat:'utensili',priority:'HIGH',     qty:1, qtyMin:1, cost:32.00, unit:'kit',     link:'https://www.amazon.it/s?k=taglierina+professionale+a3', note:'Taglio preciso carte e vinile', tags:['utensili'], inStock:true},
    {id:21,name:'Viti acciaio inox M3 assortite 500 pz', cat:'utensili',priority:'MEDIUM',   qty:1, qtyMin:1, cost:12.90, unit:'kit',     link:'https://www.amazon.it/s?k=viti+m3+assortite+500', note:'Assemblaggio strutture laser', tags:['utensili','assemblaggio'], inStock:true},
    {id:22,name:'Viti M4 testa svasata 4mm x100',        cat:'utensili',priority:'MEDIUM',   qty:2, qtyMin:2, cost:4.90,  unit:'conf',    link:'https://www.amazon.it/s?k=viti+m4+testa+svasata', note:'Fissaggi standard laboratorio', tags:['utensili'], inStock:true},
    {id:23,name:'Pistola colla a caldo + stick x100',    cat:'utensili',priority:'MEDIUM',   qty:1, qtyMin:1, cost:18.90, unit:'kit',     link:'https://www.amazon.it/s?k=pistola+colla+caldo+bastoncini', note:'Assemblaggi veloci packaging', tags:['utensili','assemblaggio'], inStock:true},
    {id:24,name:'Metro a nastro 5m magnetico',           cat:'utensili',priority:'LOW',      qty:1, qtyMin:1, cost:9.90,  unit:'pezzo',   link:'https://www.amazon.it/s?k=metro+nastro+5m+magnetico', note:'Misurazioni materiali', tags:['utensili'], inStock:true},
    {id:25,name:'Spatola acciaio flessibile 20cm',       cat:'utensili',priority:'LOW',      qty:2, qtyMin:1, cost:5.90,  unit:'pezzo',   link:'https://www.amazon.it/s?k=spatola+acciaio+flessibile', note:'Stacco materiali dal piano laser', tags:['utensili','laser'], inStock:true},
    // PACKAGING
    {id:26,name:'Box regalo kraft 10×10×4cm x50',        cat:'packaging',priority:'HIGH',    qty:1, qtyMin:2, cost:18.90, unit:'conf',    link:'https://www.amazon.it/s?k=box+regalo+kraft+10x10', note:'Packaging premium ordini Etsy', tags:['packaging','etsy'], inStock:true},
    {id:27,name:'Carta velina bianca 50×70 x100',        cat:'packaging',priority:'HIGH',    qty:1, qtyMin:2, cost:12.90, unit:'conf',    link:'https://www.amazon.it/s?k=carta+velina+bianca+50x70', note:'Imballo interno prodotti laser', tags:['packaging'], inStock:true},
    {id:28,name:'Nastro raso 10mm assortito 10 colori',  cat:'packaging',priority:'MEDIUM',  qty:1, qtyMin:1, cost:14.90, unit:'kit',     link:'https://www.amazon.it/s?k=nastro+raso+10mm+assortito', note:'Packaging e fiocchi regalo', tags:['packaging'], inStock:true},
    {id:29,name:'Bigliettini ringraziamento 200 pz',     cat:'packaging',priority:'MEDIUM',  qty:0, qtyMin:1, cost:9.90,  unit:'conf',    link:'https://www.amazon.it/s?k=bigliettini+ringraziamento+artigianato', note:'Thank you card per ordini Etsy', tags:['packaging','etsy'], inStock:false},
    // VIDEO & STUDIO
    {id:30,name:'Ring Light LED 10" con treppiede',      cat:'video',   priority:'MEDIUM',   qty:0, qtyMin:1, cost:29.90, unit:'pezzo',   link:'https://www.amazon.it/s?k=ring+light+10+pollici+treppiede', note:'Luce uniforme per foto/video prodotti', tags:['video','foto'], inStock:false},
  ],

  // ── LocalStorage CRUD ───────────────────────────────────────────────
  getProducts(){
    try{
      const stored=JSON.parse(localStorage.getItem(this._SK_PRODUCTS)||'null');
      return stored||JSON.parse(JSON.stringify(this._PRESET_PRODUCTS));
    }catch{return JSON.parse(JSON.stringify(this._PRESET_PRODUCTS));}
  },
  saveProducts(p){try{localStorage.setItem(this._SK_PRODUCTS,JSON.stringify(p));}catch{}},
  getKits(){try{return JSON.parse(localStorage.getItem(this._SK_KITS)||'{}');}catch{return {};}},
  saveKits(k){try{localStorage.setItem(this._SK_KITS,JSON.stringify(k));}catch{}},

  // ── Get machines from Equipment IDB ────────────────────────────────
  async getMachines(){
    try{
      const items=await IDB.getAll('equipment').catch(()=>[]);
      return items.filter(i=>i.status!=='dismesso').map(i=>i.name||'').filter(Boolean);
    }catch{return ['xTool P3'];}
  },

  _currentCat:'all',
  _currentTab:'dashboard',
  _searchTerm:'',

  // ── MAIN RENDER ─────────────────────────────────────────────────────
  async render(){
    const el=document.getElementById('view-lab_setup');
    if(!el) return;
    const products=this.getProducts();
    const machines=await this.getMachines();
    const suggestions=await this.AI_ENGINE.generateSuggestions.call(this.AI_ENGINE, products, machines, ['MDF','Acrilico']);
    const advice=this.AI_ENGINE.generateAdvice(suggestions, products);
    const totalValue=products.reduce((a,p)=>a+(p.cost||0),0);
    const outOfStock=products.filter(p=>!p.inStock||p.qty<(p.qtyMin||1));
    const criticalMissing=suggestions.filter(s=>s.priority==='CRITICAL');

    el.innerHTML=`
    <div style="min-height:100vh;background:var(--bg-card);padding:0">

      <!-- TOP HEADER -->
      <div style="padding:18px 20px 14px;border-bottom:1px solid var(--border);background:linear-gradient(135deg,var(--bg-card),var(--bg-card2))">
        <div style="display:flex;align-items:center;gap:14px;max-width:1400px;margin:0 auto">
          <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#f59e0b,#f97316);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🧪</div>
          <div style="flex:1">
            <h1 style="margin:0 0 2px;font-size:20px;font-weight:900;color:var(--text)">Lab & Lista Acquisti AI</h1>
            <div style="font-size:11px;color:var(--text-muted)">Ingly Design · ${products.length} prodotti · €${totalValue.toFixed(0)} investimento totale · Sincronizzato con ${machines.length} macchinari</div>
          </div>
          <div style="display:flex;gap:6px">
            <button onclick="LabSetup._openAddModal()" style="padding:7px 14px;background:linear-gradient(135deg,#f59e0b,#f97316);color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;font-size:12px">+ Aggiungi</button>
            <button onclick="LabSetup._runAIAnalysis()" style="padding:7px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;color:var(--text)">🤖 AI Analisi</button>
            <button onclick="LabSetup._openKitManager()" style="padding:7px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;font-weight:700;cursor:pointer;font-size:12px;color:var(--text)">🧩 Kit</button>
          </div>
        </div>
      </div>

      <!-- TAB BAR -->
      <div style="padding:0 20px;border-bottom:1px solid var(--border);background:var(--bg-card);overflow-x:auto">
        <div style="display:flex;gap:0;max-width:1400px;margin:0 auto">
          ${[['dashboard','🏠','Dashboard AI'],['lista','📋','Lista Prodotti'],['acquisti','🛒','Lista Acquisti'],['kits','🧩','Kit Manager'],['costi','💰','Analisi Costi']].map(([k,e,l],i)=>`
            <button onclick="LabSetup._switchTab('${k}')" id="lab-tab-${k}"
              style="padding:12px 16px;border:none;background:none;cursor:pointer;font-size:12px;font-weight:600;color:${k==='dashboard'?'#f59e0b':'var(--text-muted)'};border-bottom:2px solid ${k==='dashboard'?'#f59e0b':'transparent'};transition:.15s;white-space:nowrap">
              ${e} ${l}
            </button>`).join('')}
        </div>
      </div>

      <!-- CONTENT -->
      <div id="lab-content" style="padding:16px 20px;max-width:1400px;margin:0 auto"></div>

      <!-- MODALS -->
      <div id="lab-modal" style="display:none;position:fixed;inset:0;background:#000b;z-index:9999;align-items:center;justify-content:center;padding:16px">
        <div id="lab-modal-body" style="background:var(--bg-card);border-radius:16px;width:min(640px,96vw);max-height:90vh;overflow-y:auto;border:1px solid var(--border2);box-shadow:0 32px 80px #000c"></div>
      </div>
    </div>`;

    this._tabState={products,machines,suggestions,advice,outOfStock,criticalMissing};
    this._switchTab('dashboard');
  },

  _switchTab(tab){
    this._currentTab=tab;
    document.querySelectorAll('[id^="lab-tab-"]').forEach(btn=>{
      const isActive=btn.id===`lab-tab-${tab}`;
      btn.style.color=isActive?'#f59e0b':'var(--text-muted)';
      btn.style.borderBottomColor=isActive?'#f59e0b':'transparent';
    });
    const {products,machines,suggestions,advice,outOfStock,criticalMissing}=this._tabState||{};
    const cont=document.getElementById('lab-content');
    if(!cont) return;
    if(tab==='dashboard')  this._renderDashboard(cont,{products,machines,suggestions,advice,criticalMissing});
    if(tab==='lista')      this._renderLista(cont,products);
    if(tab==='acquisti')   this._renderAcquisti(cont,{suggestions,outOfStock});
    if(tab==='kits')       this._renderKits(cont,products);
    if(tab==='costi')      this._renderCosti(cont,products);
  },

  _renderDashboard(cont, {products,machines,suggestions,advice,criticalMissing}){
    const dm=this.AI_ENGINE.decisionMatrix;
    const byPriority={CRITICAL:[],HIGH:[],MEDIUM:[]};
    suggestions.forEach(s=>{if(byPriority[s.priority]) byPriority[s.priority].push(s);});

    const statusBar=(label,val,max,col)=>`<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
        <span style="color:var(--text-muted)">${label}</span><span style="color:${col};font-weight:700">${val}</span>
      </div>
      <div style="height:6px;background:var(--bg-card2);border-radius:99px">
        <div style="height:100%;width:${Math.min(100,val/max*100).toFixed(0)}%;background:${col};border-radius:99px;transition:.5s"></div>
      </div>
    </div>`;

    cont.innerHTML=`
      <!-- ADVICE BANNER -->
      <div style="padding:14px 16px;border-radius:12px;background:${advice.level==='critical'?'#ef444412':advice.level==='warn'?'#f9731612':advice.level==='ok'?'#22c55e12':'#60a5fa12'};border:1px solid ${advice.level==='critical'?'#ef444440':advice.level==='warn'?'#f9731640':advice.level==='ok'?'#22c55e40':'#60a5fa40'};margin-bottom:16px">
        <div style="font-size:13px;font-weight:700;color:${advice.level==='critical'?'#ef4444':advice.level==='warn'?'#f97316':advice.level==='ok'?'#22c55e':'#60a5fa'}">${advice.msg}</div>
      </div>

      <!-- KPI GRID -->
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
        ${[
          {em:'🧪',val:products.length,label:'Prodotti tot.',col:'#f59e0b'},
          {em:'🔴',val:criticalMissing.length,label:'Critici mancanti',col:criticalMissing.length?'#ef4444':'#22c55e'},
          {em:'⚙️',val:machines.length,label:'Macchinari sync',col:'#60a5fa'},
          {em:'💡',val:suggestions.length,label:'Suggerimenti AI',col:'#a855f7'},
        ].map(k=>`<div style="padding:14px;background:var(--bg-card2);border-radius:11px;border:1px solid var(--border);text-align:center">
          <div style="font-size:22px;margin-bottom:3px">${k.em}</div>
          <div style="font-size:22px;font-weight:800;color:${k.col}">${k.val}</div>
          <div style="font-size:10px;color:var(--text-dim)">${k.label}</div>
        </div>`).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <!-- AI Suggestions -->
        <div style="background:var(--bg-card2);border-radius:12px;padding:14px;border:1px solid var(--border)">
          <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:12px">🤖 AI — Cosa Comprare</div>
          ${suggestions.length===0?'<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">✅ Tutto il necessario è presente!</div>':
            suggestions.slice(0,8).map(s=>{
              const d=dm[s.priority]||dm.LOW;
              return `<div style="padding:8px 10px;border-radius:8px;border-left:4px solid ${d.color};background:${d.bg};margin-bottom:5px;cursor:pointer;transition:.15s" onclick="LabSetup._quickAdd('${s.name.replace(/'/g,'\\\'').replace(/"/g,'&quot;')}','${s.cat||'utensili'}','${s.priority}')" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
                  <div style="font-size:12px;font-weight:700;color:var(--text)">${s.name}</div>
                  <span style="font-size:9px;font-weight:700;color:${d.color};background:${d.bg};padding:2px 6px;border-radius:4px;border:1px solid ${d.border}">${d.label}</span>
                </div>
                <div style="font-size:10px;color:var(--text-muted)">${s.reason||''} ${s.cost?'· €'+s.cost:''}</div>
                <div style="font-size:9px;color:${d.color};margin-top:3px">+ click per aggiungere →</div>
              </div>`;
            }).join('')}
          ${suggestions.length>8?`<div style="text-align:center;font-size:10px;color:var(--text-dim);margin-top:6px">+${suggestions.length-8} altri in "Lista Acquisti"</div>`:''}
        </div>

        <!-- Right col -->
        <div style="display:flex;flex-direction:column;gap:12px">
          <!-- Macchinari sync -->
          <div style="background:var(--bg-card2);border-radius:12px;padding:14px;border:1px solid var(--border)">
            <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:10px">⚙️ Macchinari Sincronizzati</div>
            ${machines.length?machines.map(m=>`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
              <span style="font-size:14px">⚡</span>
              <span style="font-size:12px;font-weight:600">${m}</span>
              <span style="margin-left:auto;font-size:9px;color:#22c55e;background:#22c55e15;padding:2px 7px;border-radius:99px">Attivo</span>
            </div>`).join(''):
            `<div style="font-size:11px;color:var(--text-muted);text-align:center;padding:12px">
              Nessun macchinario in Attrezzature.<br>
              <button onclick="App.navigate('equipment')" style="margin-top:6px;padding:4px 10px;background:var(--primary-dim);border:1px solid var(--primary-border);border-radius:5px;color:var(--primary);cursor:pointer;font-size:10px;font-weight:700">+ Aggiungi macchinari</button>
            </div>`}
          </div>

          <!-- Stock status -->
          <div style="background:var(--bg-card2);border-radius:12px;padding:14px;border:1px solid var(--border)">
            <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:10px">📊 Stato Stock</div>
            ${statusBar('In stock',products.filter(p=>p.inStock&&p.qty>=(p.qtyMin||1)).length,products.length,'#22c55e')}
            ${statusBar('Da riordinare',products.filter(p=>!p.inStock||p.qty<(p.qtyMin||1)).length,products.length,'#ef4444')}
            ${statusBar('Critici ok',products.filter(p=>p.priority==='CRITICAL'&&p.inStock).length,products.filter(p=>p.priority==='CRITICAL').length,'#f97316')}
          </div>
        </div>
      </div>`;
  },

  _renderLista(cont, products){
    const cats=this.CATS;
    const dm=this.AI_ENGINE.decisionMatrix;
    const filtered=this._currentCat==='all'?products:products.filter(p=>p.cat===this._currentCat);
    const searched=this._searchTerm?filtered.filter(p=>p.name.toLowerCase().includes(this._searchTerm.toLowerCase())||p.note?.toLowerCase().includes(this._searchTerm.toLowerCase())):filtered;

    cont.innerHTML=`
      <!-- Cat filter pills -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
        ${cats.map(c=>`<button onclick="LabSetup._setCat('${c.id}')" style="padding:5px 11px;border-radius:99px;border:1px solid ${c.id===LabSetup._currentCat?c.color:'var(--border)'};background:${c.id===LabSetup._currentCat?c.color+'18':'var(--bg-card2)'};color:${c.id===LabSetup._currentCat?c.color:'var(--text-muted)'};cursor:pointer;font-size:10px;font-weight:700;transition:.15s">${c.em} ${c.label} <span style="opacity:.6">${c.id==='all'?products.length:products.filter(p=>p.cat===c.id).length}</span></button>`).join('')}
        <input id="lab-search" placeholder="🔍 Cerca..." oninput="LabSetup._setSearch(this.value)" value="${this._searchTerm}"
          style="margin-left:auto;padding:5px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:99px;color:var(--text);font-size:11px;outline:none;min-width:140px">
      </div>

      <!-- Products list -->
      <div style="display:flex;flex-direction:column;gap:5px">
        ${searched.length===0?`<div style="text-align:center;padding:40px;color:var(--text-muted)"><div style="font-size:36px;margin-bottom:10px">📦</div><div>Nessun prodotto trovato</div><button onclick="LabSetup._openAddModal()" style="margin-top:10px;padding:6px 14px;background:linear-gradient(135deg,#f59e0b,#f97316);color:#000;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700">+ Aggiungi primo</button></div>`:
          searched.map(p=>{
            const d=dm[p.priority]||dm.LOW;
            const catInfo=cats.find(c=>c.id===p.cat)||{em:'📦',color:'#6366f1'};
            const isLow=!p.inStock||p.qty<(p.qtyMin||1);
            return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg-card2);border-left:4px solid ${d.color};transition:.15s" onmouseover="this.style.background='var(--bg-card)'" onmouseout="this.style.background='var(--bg-card2)'">
              <!-- Priority dot -->
              <div style="width:8px;height:8px;border-radius:50%;background:${d.color};flex-shrink:0"></div>
              <!-- Cat emoji -->
              <span style="font-size:16px;flex-shrink:0">${catInfo.em}</span>
              <!-- Name + note -->
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:700;color:var(--text)">${p.name}</div>
                ${p.note?`<div style="font-size:10px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.note}</div>`:''}
              </div>
              <!-- Qty control -->
              <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
                <button onclick="LabSetup._adjustQty(${p.id},-1)" style="width:20px;height:20px;border-radius:4px;border:1px solid var(--border);background:var(--bg-card);cursor:pointer;color:var(--text);font-size:12px;display:flex;align-items:center;justify-content:center;line-height:1">−</button>
                <span style="font-size:12px;font-weight:700;min-width:20px;text-align:center;color:${isLow?'#ef4444':'var(--text)'}">${p.qty||0}</span>
                <button onclick="LabSetup._adjustQty(${p.id},1)" style="width:20px;height:20px;border-radius:4px;border:1px solid var(--border);background:var(--bg-card);cursor:pointer;color:var(--text);font-size:12px;display:flex;align-items:center;justify-content:center;line-height:1">+</button>
              </div>
              <!-- Stock toggle -->
              <button onclick="LabSetup._toggleStock(${p.id})" style="padding:3px 8px;border-radius:5px;border:1px solid ${p.inStock?'#22c55e40':'#ef444440'};background:${p.inStock?'#22c55e12':'#ef444412'};color:${p.inStock?'#22c55e':'#ef4444'};cursor:pointer;font-size:9px;font-weight:700;flex-shrink:0">
                ${p.inStock?'✅ Stock':'❌ Esaurito'}
              </button>
              <!-- Price -->
              ${p.cost?`<span style="font-size:11px;font-weight:700;color:#22c55e;flex-shrink:0;min-width:44px;text-align:right">€${p.cost.toFixed(2)}</span>`:''}
              <!-- Actions -->
              <div style="display:flex;gap:3px;flex-shrink:0">
                ${p.link?`<a href="${p.link}" target="_blank" style="width:24px;height:24px;border-radius:5px;border:1px solid var(--border);background:var(--bg-card);display:flex;align-items:center;justify-content:center;text-decoration:none;color:var(--text-dim);font-size:10px" title="Acquista">🛒</a>`:''}
                <button onclick="LabSetup._editProduct(${p.id})" style="width:24px;height:24px;border-radius:5px;border:1px solid var(--border);background:var(--bg-card);cursor:pointer;color:var(--text-dim);font-size:10px;display:flex;align-items:center;justify-content:center" title="Modifica">✏️</button>
                <button onclick="LabSetup._deleteProduct(${p.id})" style="width:24px;height:24px;border-radius:5px;border:1px solid #ef444430;background:#ef444408;cursor:pointer;color:#ef4444;font-size:10px;display:flex;align-items:center;justify-content:center" title="Elimina">🗑</button>
              </div>
            </div>`;
          }).join('')}
      </div>`;
  },

  _renderAcquisti(cont, {suggestions, outOfStock}){
    const dm=this.AI_ENGINE.decisionMatrix;
    const allNeeded=[
      ...outOfStock.map(p=>({...p, reason:'Stock esaurito', _fromStock:true})),
      ...suggestions.filter(s=>!outOfStock.find(p=>p.name.toLowerCase().includes(s.name.toLowerCase().slice(0,8)))),
    ].sort((a,b)=>(dm[a.priority]?.order||9)-(dm[b.priority]?.order||9));

    const totalBudget=allNeeded.reduce((a,i)=>a+(i.cost||0),0);

    cont.innerHTML=`
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div>
          <div style="font-size:14px;font-weight:700">🛒 Lista Acquisti Intelligente</div>
          <div style="font-size:11px;color:var(--text-muted)">${allNeeded.length} prodotti da acquistare · Budget stimato: <strong style="color:#22c55e">€${totalBudget.toFixed(0)}</strong></div>
        </div>
        <button onclick="LabSetup._exportShoppingList()" style="padding:7px 14px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:11px;font-weight:700">📋 Copia lista</button>
      </div>

      ${allNeeded.length===0?`<div style="text-align:center;padding:50px;color:var(--text-muted)"><div style="font-size:48px;margin-bottom:12px">✅</div><div style="font-size:14px;font-weight:700">Lab completamente rifornito!</div></div>`:''}

      ${['CRITICAL','HIGH','MEDIUM','LOW'].filter(p=>allNeeded.some(i=>i.priority===p)).map(pri=>{
        const items=allNeeded.filter(i=>i.priority===pri);
        const d=dm[pri];
        return `<div style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid ${d.color}">
            <span style="font-size:14px;padding:3px 10px;border-radius:99px;background:${d.bg};border:1px solid ${d.border};color:${d.color};font-weight:700;font-size:11px">${d.label}</span>
            <span style="font-size:11px;color:var(--text-muted)">${items.length} articoli · €${items.reduce((a,i)=>a+(i.cost||0),0).toFixed(0)}</span>
          </div>
          ${items.map(item=>`<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:9px;border:1px solid ${d.border};background:${d.bg};margin-bottom:5px">
            <input type="checkbox" style="accent-color:${d.color};width:14px;height:14px;flex-shrink:0">
            <div style="flex:1">
              <div style="font-size:12px;font-weight:700">${item.name}</div>
              <div style="font-size:10px;color:var(--text-muted)">${item.reason||''}</div>
            </div>
            ${item.cost?`<span style="font-size:12px;font-weight:700;color:#22c55e;flex-shrink:0">€${item.cost.toFixed(2)}</span>`:''}
            ${item.link?`<a href="${item.link}" target="_blank" style="padding:4px 10px;background:${d.color};color:#fff;border:none;border-radius:6px;font-size:10px;font-weight:700;text-decoration:none;white-space:nowrap">🛒 Acquista</a>`:''}
            ${item._fromStock?'':'<button onclick="LabSetup._quickAdd(\''+item.name.replace(/'/g,"\\'")+'\',\''+(item.cat||'utensili')+'\',\''+item.priority+'\')" style="padding:4px 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:5px;cursor:pointer;font-size:9px;font-weight:700;color:var(--text-muted)">+ Lista</button>'}
          </div>`).join('')}
        </div>`;
      }).join('')}`;
  },

  _renderKits(cont, products){
    const kits=this.KITS;
    cont.innerHTML=`
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:14px">Kit preconfigurati per allestimento rapido. Clicca per vedere il dettaglio e verificare cosa hai già.</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
        ${Object.entries(kits).map(([id,kit])=>{
          const have=kit.items.filter(i=>products.some(p=>p.name.toLowerCase().includes(i.toLowerCase().slice(0,8))));
          const pct=Math.round(have.length/kit.items.length*100);
          const col=pct>=80?'#22c55e':pct>=50?'#f59e0b':'#ef4444';
          return `<div style="background:var(--bg-card2);border-radius:12px;border:2px solid ${kit.color}30;overflow:hidden;transition:.18s" onmouseover="this.style.borderColor='${kit.color}'" onmouseout="this.style.borderColor='${kit.color}30'">
            <div style="padding:12px 14px;background:${kit.color}15;border-bottom:1px solid ${kit.color}20">
              <div style="font-size:13px;font-weight:800;color:${kit.color}">${kit.name}</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${kit.desc}</div>
            </div>
            <div style="padding:12px 14px">
              <!-- Progress -->
              <div style="margin-bottom:10px">
                <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px">
                  <span style="color:var(--text-muted)">Disponibile: ${have.length}/${kit.items.length}</span>
                  <span style="color:${col};font-weight:700">${pct}%</span>
                </div>
                <div style="height:5px;background:var(--bg-card);border-radius:99px"><div style="height:100%;width:${pct}%;background:${col};border-radius:99px"></div></div>
              </div>
              <!-- Items -->
              <div style="display:flex;flex-direction:column;gap:3px;margin-bottom:10px">
                ${kit.items.map(item=>{
                  const has=products.some(p=>p.name.toLowerCase().includes(item.toLowerCase().slice(0,8)));
                  return `<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:${has?'var(--text)':'var(--text-muted)'}">
                    <span style="color:${has?'#22c55e':'#ef4444'};font-size:10px">${has?'✓':'✗'}</span>
                    ${item}
                  </div>`;
                }).join('')}
              </div>
              <button onclick="LabSetup._addMissingFromKit('${id}')" style="width:100%;padding:7px;background:${pct<100?kit.color:'#22c55e'};color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:700">
                ${pct===100?'✅ Kit completo':pct===0?'+ Aggiungi tutto':'🛒 Aggiungi mancanti ('+(kit.items.length-have.length)+')'}
              </button>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  },

  _renderCosti(cont, products){
    const total=products.reduce((a,p)=>a+(p.cost||0),0);
    const byCat={};
    this.CATS.filter(c=>c.id!=='all').forEach(c=>{ byCat[c.id]={label:c.label,em:c.em,color:c.color,total:0,count:0}; });
    products.forEach(p=>{ if(byCat[p.cat]){ byCat[p.cat].total+=(p.cost||0); byCat[p.cat].count++; } });

    cont.innerHTML=`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <!-- Cost breakdown -->
        <div style="background:var(--bg-card2);border-radius:12px;padding:14px;border:1px solid var(--border)">
          <div style="font-size:12px;font-weight:700;margin-bottom:12px">💰 Investimento per Categoria</div>
          ${Object.values(byCat).filter(c=>c.total>0).sort((a,b)=>b.total-a.total).map(c=>`
            <div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px">
                <span style="font-size:11px">${c.em} ${c.label} <span style="color:var(--text-dim)">(${c.count})</span></span>
                <span style="font-size:11px;font-weight:700;color:${c.color}">€${c.total.toFixed(0)}</span>
              </div>
              <div style="height:5px;background:var(--bg-card);border-radius:99px">
                <div style="height:100%;width:${(c.total/total*100).toFixed(0)}%;background:${c.color};border-radius:99px"></div>
              </div>
            </div>`).join('')}
          <div style="margin-top:12px;padding-top:12px;border-top:2px solid var(--border);display:flex;justify-content:space-between">
            <span style="font-size:13px;font-weight:700">Totale Investimento</span>
            <span style="font-size:16px;font-weight:800;color:#22c55e">€${total.toFixed(0)}</span>
          </div>
        </div>

        <!-- Usage cost per product -->
        <div style="background:var(--bg-card2);border-radius:12px;padding:14px;border:1px solid var(--border)">
          <div style="font-size:12px;font-weight:700;margin-bottom:12px">⚡ Costo Consumo per Prodotto</div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">Stima del costo dei consumabili per ogni pezzo prodotto con laser</div>
          ${[
            {name:'Segnaposto matrimonio (10×7cm MDF)',items:['Alcol Isopropilico','Application Tape','Colla Cianoacrilica'],costPer:0.28},
            {name:'Targa ufficio acrilico (20×10cm)',  items:['Application Tape','Alcol Isopropilico'],costPer:0.45},
            {name:'Portachiavi (5×3cm MDF)',           items:['Application Tape','Colla Cianoacrilica'],costPer:0.12},
            {name:'Coaster set (4× 10cm MDF)',         items:['Carta abrasiva','Cera protettiva'],costPer:0.35},
          ].map(item=>`<div style="padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-card);margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:11px;font-weight:700">${item.name}</span>
              <span style="font-size:12px;font-weight:800;color:#f59e0b">€${item.costPer}/pz</span>
            </div>
            <div style="font-size:9px;color:var(--text-dim)">${item.items.join(' · ')}</div>
          </div>`).join('')}
          <div style="margin-top:10px;padding:10px;background:var(--primary-dim);border-radius:8px;border:1px solid var(--primary-border);font-size:11px">
            💡 Aggiungi i tuoi prodotti in Catalogo con il campo "costo materiale" per calcolo automatico preciso.
          </div>
        </div>
      </div>`;
  },

  // ── Actions ─────────────────────────────────────────────────────────
  _setCat(cat){ this._currentCat=cat; this._switchTab('lista'); },
  _setSearch(v){ this._searchTerm=v; this._switchTab('lista'); },

  _adjustQty(id, delta){
    const p=this.getProducts();
    const item=p.find(x=>x.id===id);
    if(!item) return;
    item.qty=Math.max(0,(item.qty||0)+delta);
    item.inStock=item.qty>=(item.qtyMin||1);
    this.saveProducts(p);
    this._tabState.products=p;
    this._switchTab('lista');
  },

  _toggleStock(id){
    const p=this.getProducts();
    const item=p.find(x=>x.id===id);
    if(!item) return;
    item.inStock=!item.inStock;
    if(item.inStock&&item.qty===0) item.qty=1;
    this.saveProducts(p);
    this._tabState.products=p;
    this._switchTab('lista');
  },

  _deleteProduct(id){
    if(!confirm('Eliminare questo prodotto?')) return;
    const p=this.getProducts().filter(x=>x.id!==id);
    this.saveProducts(p);
    this._tabState.products=p;
    this._switchTab('lista');
    toast('Prodotto eliminato','info');
  },

  _editProduct(id){
    const p=this.getProducts().find(x=>x.id===id);
    if(p) this._openAddModal(p);
  },

  _quickAdd(name, cat, priority){
    const p=this.getProducts();
    if(p.find(x=>x.name.toLowerCase()===name.toLowerCase())) { toast('Già in lista!','info'); return; }
    p.push({id:Date.now(),name,cat:cat||'utensili',priority:priority||'MEDIUM',qty:0,qtyMin:1,cost:0,unit:'pezzo',inStock:false,note:'Aggiunto da suggerimento AI',tags:[],link:''});
    this.saveProducts(p);
    this._tabState.products=p;
    toast(`✅ "${name}" aggiunto alla lista!`,'success');
    this._switchTab('lista');
  },

  _addMissingFromKit(kitId){
    const kit=this.KITS[kitId];
    if(!kit) return;
    const p=this.getProducts();
    let added=0;
    kit.items.forEach(item=>{
      if(!p.some(x=>x.name.toLowerCase().includes(item.toLowerCase().slice(0,8)))){
        p.push({id:Date.now()+added,name:item,cat:'utensili',priority:'MEDIUM',qty:0,qtyMin:1,cost:0,unit:'pezzo',inStock:false,note:`Kit: ${kit.name}`,tags:[],link:''});
        added++;
      }
    });
    this.saveProducts(p);
    this._tabState.products=p;
    toast(`✅ ${added} prodotti aggiunti dal kit ${kit.name}!`,'success');
    this._switchTab('lista');
  },

  _exportShoppingList(){
    const {suggestions,outOfStock}=this._tabState;
    const all=[...outOfStock.map(p=>`[${p.priority}] ${p.name} - €${p.cost||0}`),...suggestions.map(s=>`[${s.priority}] ${s.name} - ${s.reason}`)];
    const text=`Lista Acquisti Lab Ingly Design - ${new Date().toLocaleDateString('it-IT')}\n\n`+all.join('\n');
    navigator.clipboard.writeText(text).then(()=>toast('📋 Lista copiata!','success'));
  },

  _openAddModal(editItem){
    const modal=document.getElementById('lab-modal');
    const body=document.getElementById('lab-modal-body');
    if(!modal||!body) return;
    const p=editItem||{name:'',cat:'utensili',priority:'MEDIUM',qty:0,qtyMin:1,cost:0,unit:'pezzo',inStock:false,note:'',link:'',tags:[]};
    const dm=this.AI_ENGINE.decisionMatrix;
    body.innerHTML=`
      <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:15px;font-weight:800">${editItem?'✏️ Modifica':'➕ Nuovo'} Prodotto</div>
        <button onclick="document.getElementById('lab-modal').style.display='none'" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px">✕</button>
      </div>
      <div style="padding:16px 20px;display:flex;flex-direction:column;gap:10px">
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Nome prodotto *</label>
          <input id="lp-name" class="form-control" value="${p.name}" style="font-size:13px"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Categoria</label>
            <select id="lp-cat" class="form-control" style="font-size:12px">
              ${this.CATS.filter(c=>c.id!=='all').map(c=>`<option value="${c.id}" ${p.cat===c.id?'selected':''}>${c.em} ${c.label}</option>`).join('')}
            </select></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Priorità</label>
            <select id="lp-pri" class="form-control" style="font-size:12px">
              ${Object.entries(dm).map(([k,v])=>`<option value="${k}" ${p.priority===k?'selected':''}>${v.label}</option>`).join('')}
            </select></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Quantità</label>
            <input id="lp-qty" type="number" class="form-control" value="${p.qty||0}" style="font-size:13px"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Qty minima (riordino)</label>
            <input id="lp-qmin" type="number" class="form-control" value="${p.qtyMin||1}" style="font-size:13px"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Costo (€)</label>
            <input id="lp-cost" type="number" step="0.01" class="form-control" value="${p.cost||0}" style="font-size:13px"></div>
          <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Unità</label>
            <input id="lp-unit" class="form-control" value="${p.unit||'pezzo'}" placeholder="pezzo, rotolo, kit…" style="font-size:12px"></div>
        </div>
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Link acquisto (Amazon / shop)</label>
          <input id="lp-link" class="form-control" value="${p.link||''}" placeholder="https://…" style="font-size:12px"></div>
        <div><label style="font-size:10px;font-weight:700;color:var(--text-muted);display:block;margin-bottom:3px">Note</label>
          <textarea id="lp-note" class="form-control" rows="2" style="font-size:12px;resize:none">${p.note||''}</textarea></div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px">
          <input id="lp-stock" type="checkbox" ${p.inStock?'checked':''} style="accent-color:#22c55e;width:14px;height:14px">
          In stock adesso
        </label>
        <div style="display:flex;gap:8px">
          <button onclick="LabSetup._saveModal(${editItem?editItem.id:'null'})" style="flex:1;padding:10px;background:linear-gradient(135deg,#f59e0b,#f97316);color:#000;border:none;border-radius:9px;font-weight:800;cursor:pointer;font-size:13px">${editItem?'💾 Salva':'➕ Aggiungi'}</button>
          ${editItem?`<button onclick="LabSetup._deleteProduct(${editItem.id});document.getElementById('lab-modal').style.display='none'" style="padding:10px 14px;background:#ef444415;border:1px solid #ef444440;border-radius:9px;color:#ef4444;cursor:pointer;font-size:12px;font-weight:700">🗑 Elimina</button>`:''}
        </div>
      </div>`;
    modal.style.display='flex';
    modal.onclick=e=>{if(e.target===modal)modal.style.display='none';};
  },

  _saveModal(existingId){
    const name=document.getElementById('lp-name')?.value?.trim();
    if(!name){toast('Inserisci il nome','warning');return;}
    const p=this.getProducts();
    const item={
      id:existingId&&existingId!=='null'?existingId:Date.now(),
      name, cat:document.getElementById('lp-cat')?.value||'utensili',
      priority:document.getElementById('lp-pri')?.value||'MEDIUM',
      qty:parseInt(document.getElementById('lp-qty')?.value)||0,
      qtyMin:parseInt(document.getElementById('lp-qmin')?.value)||1,
      cost:parseFloat(document.getElementById('lp-cost')?.value)||0,
      unit:document.getElementById('lp-unit')?.value||'pezzo',
      link:document.getElementById('lp-link')?.value||'',
      note:document.getElementById('lp-note')?.value||'',
      inStock:document.getElementById('lp-stock')?.checked||false,
      tags:[],
    };
    if(existingId&&existingId!=='null'){
      const i=p.findIndex(x=>x.id===existingId);
      if(i>=0) p[i]=item; else p.push(item);
    } else { p.push(item); }
    this.saveProducts(p);
    document.getElementById('lab-modal').style.display='none';
    toast(`✅ "${name}" ${existingId&&existingId!=='null'?'aggiornato':'aggiunto'}!`,'success');
    this.render();
  },

  async _runAIAnalysis(){
    const products=this.getProducts();
    const machines=await this.getMachines();
    try{
      const r=await AIStudio._callAI(`Sei un esperto di laboratorio laser artigianale italiano. Analizza questa configurazione di laboratorio:\n\nMacchinari: ${machines.join(', ')||'xTool P3 Laser Diode'}\nProdotti presenti: ${products.filter(p=>p.inStock).map(p=>p.name).slice(0,15).join(', ')}\nProdotti mancanti: ${products.filter(p=>!p.inStock).map(p=>p.name).slice(0,10).join(', ')}\n\n**ANALISI COMPLETA:**\n1. Setup generale (valutazione 1-10 e motivazione)\n2. Top 3 acquisti urgenti con motivo specifico\n3. Cosa puoi rimandare senza rischio\n4. Stima costo mensile consumabili per 100 pezzi/mese\n5. Consiglio strategico per ottimizzare costi\n\nMax 300 parole. Pratico e specifico per artigiano laser siciliano.`);
      const modal=document.getElementById('lab-modal');
      const body=document.getElementById('lab-modal-body');
      if(modal&&body){
        body.innerHTML=`<div style="padding:20px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div style="font-size:15px;font-weight:800">🤖 Analisi AI Completa Lab</div>
            <button onclick="document.getElementById('lab-modal').style.display='none'" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--text-muted)">✕</button>
          </div>
          <div style="font-size:13px;line-height:1.8;color:var(--text)">${r.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:#f59e0b">$1</strong>').replace(/\n/g,'<br>')}</div>
        </div>`;
        modal.style.display='flex';
        modal.onclick=e=>{if(e.target===modal)modal.style.display='none';};
      }
    }catch(e){toast('Configura API Key AI in Impostazioni','warning');}
  },

  _openKitManager(){
    this._switchTab('kits');
  }
};
window.LabSetup = LabSetup;


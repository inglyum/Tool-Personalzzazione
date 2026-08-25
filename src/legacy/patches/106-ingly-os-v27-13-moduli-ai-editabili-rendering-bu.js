
/* ═══════════════════════════════════════════════════════════════
   INGLY OS v27 — 13 MODULI AI EDITABILI (rendering bulletproof)
   Ogni sezione: aggiungi/rimuovi/modifica righe · salvataggio locale
   ═══════════════════════════════════════════════════════════════ */
;(function _aiEdit(){
  if(window._aiEdit) return; window._aiEdit = true;

  function lsGet(k,def){ try{ var v=JSON.parse(localStorage.getItem(k)); return v==null?def:v; }catch(e){ return def; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
  function tt(msg,type){ if(typeof toast!=='undefined'){try{toast(msg,type||'info');}catch(e){}} }
  function eu(n){ return '€'+(+(n||0)).toLocaleString('it-IT',{minimumFractionDigits:0,maximumFractionDigits:0}); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function header(icon,title,sub){
    return '<div style="margin-bottom:18px"><div style="font-size:22px;font-weight:900;color:var(--text,#e5e5e5)">'+icon+' '+title+'</div>'
      +'<div style="font-size:12px;color:var(--text-muted,#888);margin-top:2px">'+sub+'</div></div>';
  }
  function kpiGrid(kpis){
    return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:18px">'
      +kpis.map(function(k){return '<div style="background:var(--bg-card,#0f0f11);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:16px">'
        +'<div style="font-size:25px;font-weight:900;color:'+(k.color||'var(--text,#e5e5e5)')+';letter-spacing:-1px">'+k.val+'</div>'
        +'<div style="font-size:11px;color:var(--text-muted,#888);margin-top:2px">'+k.label+'</div>'
        +(k.trend?'<div style="font-size:11px;color:'+(k.trendColor||'#22c55e')+';margin-top:3px">'+k.trend+'</div>':'')
        +'</div>';}).join('')+'</div>';
  }
  function noteCard(title,html){
    return '<div style="background:var(--bg-card,#0f0f11);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:16px;margin-bottom:14px">'
      +'<div style="font-size:13px;font-weight:700;color:var(--text,#e5e5e5);margin-bottom:10px">'+title+'</div>'+html+'</div>';
  }

  /* ═══════════════════════════════════════════════════════════
     EDITABLE TABLE — componente riutilizzabile
     cols: [{key,label,type,width}], storageKey, defaults
  ═══════════════════════════════════════════════════════════ */
  function editableTable(opts){
    var data = lsGet(opts.storageKey, null);
    if(data==null){ data = opts.defaults.slice(); lsSet(opts.storageKey, data); }
    var id = opts.id;
    window['_aiData_'+id] = data;

    var ths = opts.cols.map(function(col){
      return '<th style="text-align:left;padding:8px 10px;font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted,#888);border-bottom:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)'+(col.width?';width:'+col.width:'')+'">'+col.label+'</th>';
    }).join('')+'<th style="width:40px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02)"></th>';

    var rows = data.map(function(row,ri){
      var tds = opts.cols.map(function(col){
        var val = row[col.key]!=null?row[col.key]:'';
        var inputType = col.type==='number'?'number':'text';
        var step = col.type==='number'?' step="any"':'';
        return '<td style="padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.04)">'
          +'<input class="ait-cell" data-id="'+id+'" data-ri="'+ri+'" data-key="'+col.key+'" type="'+inputType+'"'+step+' value="'+esc(val)+'" '
          +'style="width:100%;box-sizing:border-box;padding:6px 8px;background:transparent;border:1px solid transparent;border-radius:6px;color:var(--text,#e5e5e5);font-size:12px" '
          +'onfocus="this.style.background=\'var(--bg-card2,#161618)\';this.style.borderColor=\'var(--border,#333)\'" '
          +'onblur="this.style.background=\'transparent\';this.style.borderColor=\'transparent\'"></td>';
      }).join('');
      return '<tr>'+tds+'<td style="padding:5px 8px;border-bottom:1px solid rgba(255,255,255,.04);text-align:center"><button class="ait-del" data-id="'+id+'" data-ri="'+ri+'" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:6px;color:#ef4444;cursor:pointer;padding:4px 7px;font-size:11px">🗑</button></td></tr>';
    }).join('');

    return '<div style="background:var(--bg-card,#0f0f11);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:16px;margin-bottom:14px">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
      +'<div style="font-size:13px;font-weight:700;color:var(--text,#e5e5e5)">'+opts.title+'</div>'
      +'<div style="display:flex;gap:6px">'
      +'<button class="ait-add" data-id="'+id+'" style="padding:5px 11px;background:var(--primary,#fbbf24);border:none;border-radius:7px;color:#000;cursor:pointer;font-size:11px;font-weight:700">+ Aggiungi</button>'
      +'<button class="ait-reset" data-id="'+id+'" style="padding:5px 11px;background:rgba(255,255,255,.06);border:1px solid var(--border,#333);border-radius:7px;color:var(--text-muted,#888);cursor:pointer;font-size:11px">↺ Default</button>'
      +'</div></div>'
      +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'+ths+'</tr></thead><tbody>'+rows+'</tbody></table></div>'
      +'</div>';
  }

  // Bind editable table events (called after innerHTML set)
  function bindEditableTables(container, rerender){
    container.querySelectorAll('.ait-cell').forEach(function(inp){
      inp.oninput=function(){
        var id=this.getAttribute('data-id'), ri=+this.getAttribute('data-ri'), key=this.getAttribute('data-key');
        var data=window['_aiData_'+id]; if(!data||!data[ri]) return;
        var col=findCol(id,key);
        data[ri][key]= (col&&col.type==='number') ? (parseFloat(this.value)||0) : this.value;
        lsSet(storageKeyFor(id), data);
      };
    });
    container.querySelectorAll('.ait-del').forEach(function(btn){
      btn.onclick=function(){
        var id=this.getAttribute('data-id'), ri=+this.getAttribute('data-ri');
        var data=window['_aiData_'+id]; if(!data) return;
        data.splice(ri,1); lsSet(storageKeyFor(id),data);
        if(rerender) rerender();
      };
    });
    container.querySelectorAll('.ait-add').forEach(function(btn){
      btn.onclick=function(){
        var id=this.getAttribute('data-id');
        var data=window['_aiData_'+id]||[];
        var cols=colsFor(id);
        var newRow={}; cols.forEach(function(col){ newRow[col.key]= col.type==='number'?0:''; });
        data.push(newRow); lsSet(storageKeyFor(id),data);
        if(rerender) rerender();
      };
    });
    container.querySelectorAll('.ait-reset').forEach(function(btn){
      btn.onclick=function(){
        var id=this.getAttribute('data-id');
        localStorage.removeItem(storageKeyFor(id));
        if(rerender) rerender();
        tt('↺ Valori ripristinati','info');
      };
    });
  }

  // Table registry (so add/reset know cols+defaults+storage)
  var TABLES = {};
  function regTable(id, cfg){ TABLES[id]=cfg; }
  function findCol(id,key){ var t=TABLES[id]; return t?t.cols.find(function(c){return c.key===key;}):null; }
  function colsFor(id){ var t=TABLES[id]; return t?t.cols:[]; }
  function storageKeyFor(id){ var t=TABLES[id]; return t?t.storageKey:'_ai_'+id; }

  /* ═══════════════════════════════════════════════════════════
     DATI DEFAULT
  ═══════════════════════════════════════════════════════════ */
  var D_TRENDS=[
    {name:'UV DTF Sticker',cat:'Adesivi',growth:'+180%',demand:95,comp:'Media',price:'€8-25'},
    {name:'Snow Globe Tumbler',cat:'Drinkware',growth:'+350%',demand:88,comp:'Bassa',price:'€18-40'},
    {name:'Targhe Luminose LED',cat:'Insegne',growth:'+120%',demand:78,comp:'Media',price:'€25-80'},
    {name:'Lampade Litofania 3D',cat:'Decor',growth:'+210%',demand:85,comp:'Bassa',price:'€20-55'},
    {name:'Insegne Neon Custom',cat:'Insegne',growth:'+140%',demand:80,comp:'Bassa',price:'€40-150'},
    {name:'Bracciali Inox Incisi',cat:'Gioielli',growth:'+90%',demand:70,comp:'Media',price:'€12-30'},
  ];
  var D_ETSY=[
    {kw:'personalized gift',vol:'1.2M',comp:'Alta',opp:'Media'},
    {kw:'custom name sign',vol:'480K',comp:'Media',opp:'Alta'},
    {kw:'engraved tumbler',vol:'320K',comp:'Media',opp:'Alta'},
    {kw:'wedding cake topper',vol:'210K',comp:'Alta',opp:'Media'},
    {kw:'led neon sign custom',vol:'185K',comp:'Bassa',opp:'Molto Alta'},
    {kw:'leather keychain personalized',vol:'95K',comp:'Media',opp:'Alta'},
  ];
  var D_PRICE=[
    {cat:'Portachiavi',min:5,med:10,max:18,markup:'×3-4'},
    {cat:'Tumbler/Borracce',min:12,med:18,max:35,markup:'×2.5-3'},
    {cat:'Targhe/Insegne',min:20,med:42,max:120,markup:'×3-4'},
    {cat:'Gadget aziendali',min:3,med:8,max:20,markup:'×2-3'},
    {cat:'Litofania/Lampade',min:20,med:32,max:60,markup:'×3-3.5'},
    {cat:'Gioielli incisi',min:10,med:20,max:45,markup:'×3.5-5'},
  ];
  var D_DEMAND=[
    {region:'Lombardia',demand:95,sector:'Gadget aziendali, eventi'},
    {region:'Lazio',demand:82,sector:'Wedding, regali'},
    {region:'Veneto',demand:78,sector:'Artigianato, insegne'},
    {region:'Emilia-Romagna',demand:74,sector:'Food packaging, eventi'},
    {region:'Campania',demand:68,sector:'Bomboniere, cerimonie'},
    {region:'Toscana',demand:65,sector:'Turismo, souvenir'},
  ];
  var D_PRODUCTS=[
    {name:'Insegna LED neon nome',cost:12,sell:45,margin:'+275%',diff:'Media'},
    {name:'Litofania foto 3D',cost:6,sell:28,margin:'+367%',diff:'Bassa'},
    {name:'Snow globe tumbler',cost:9,sell:32,margin:'+256%',diff:'Media'},
    {name:'Mappa stellare incisa',cost:5,sell:25,margin:'+400%',diff:'Bassa'},
    {name:'Portagioie inciso',cost:8,sell:30,margin:'+275%',diff:'Bassa'},
  ];
  var D_GROWTH=[
    {action:'Aprire shop Etsy',channel:'Etsy',impact:'+€800/mese',time:'1 settimana'},
    {action:'Instagram Reels processo',channel:'Social',impact:'+30% awareness',time:'Continuo'},
    {action:'Pacchetti regalo B2B',channel:'Diretto',impact:'+€1.200/mese',time:'2 settimane'},
    {action:'Email marketing clienti',channel:'CRM',impact:'+15% riacquisto',time:'3 giorni'},
    {action:'Listino premium prodotti unici',channel:'Tutti',impact:'+20% margine',time:'1 giorno'},
  ];
  var D_SUPPLIERS=[
    {name:'Sublimet',url:'sublimet.com',cat:'Sublimazione',rating:4.7,lead:'2-3gg',rel:96,price:'€€',best:'Drinkware sub'},
    {name:'Gadget365',url:'gadget365.it',cat:'Gadget',rating:4.5,lead:'3-5gg',rel:92,price:'€€',best:'Gadget aziendali'},
    {name:'HiGift',url:'higift.it',cat:'Gadget Premium',rating:4.6,lead:'4-6gg',rel:94,price:'€€€',best:'Regali eco'},
    {name:'Temaplex',url:'temaplex-shop.com',cat:'Plexiglass',rating:4.8,lead:'2-4gg',rel:97,price:'€€',best:'Lastre acrilico'},
    {name:'CPL Fabbrika',url:'cplfabbrika.com',cat:'Materie Prime',rating:4.4,lead:'3-5gg',rel:90,price:'€',best:'Legno laser'},
    {name:'RS Components',url:'rs-online.com',cat:'Elettronica',rating:4.9,lead:'1-2gg',rel:98,price:'€€€',best:'LED insegne'},
    {name:'Mr.W Wood',url:'mrw.it',cat:'Legno',rating:4.3,lead:'5-7gg',rel:88,price:'€€',best:'Betulla premium'},
    {name:'Stampasi',url:'stampasi.it',cat:'DTF',rating:4.5,lead:'2-3gg',rel:91,price:'€€',best:'Film DTF A3'},
  ];
  var D_CONTENT=[
    {type:'🎬 Video processo laser',eng:85,reach:'Alto',rec:'Sì'},
    {type:'📸 Prima/Dopo prodotto',eng:72,reach:'Medio',rec:'Sì'},
    {type:'🎁 Unboxing/Packaging',eng:68,reach:'Medio',rec:'Sì'},
    {type:'💬 Testimonianze clienti',eng:58,reach:'Medio',rec:'Forse'},
    {type:'📝 Post solo testo',eng:22,reach:'Basso',rec:'No'},
  ];
  var D_COMPETITORS=[
    {name:'IncisioneLaser.it',type:'Diretto',price:'Alto',sku:340,rating:4.6,trend:'↑'},
    {name:'PersonalizzaTu',type:'Marketplace',price:'Medio',sku:1200,rating:4.3,trend:'↑'},
    {name:'LaserGift Studio',type:'Etsy',price:'Premium',sku:85,rating:4.9,trend:'↗'},
    {name:'CustomLab MI',type:'Locale',price:'Medio',sku:210,rating:4.5,trend:'→'},
  ];
  var D_FORECAST=[
    {month:'Luglio',revenue:2400},{month:'Agosto',revenue:2100},{month:'Settembre',revenue:3200},
    {month:'Ottobre',revenue:3800},{month:'Novembre',revenue:6500},{month:'Dicembre',revenue:8200},
  ];
  var D_INTEL=[
    {icon:'🔥',text:'Snow globe tumbler in trend +350% questa settimana',time:'2 min fa'},
    {icon:'💰',text:'Prezzo medio insegne LED salito a €45 (+8%)',time:'15 min fa'},
    {icon:'🛍️',text:'"custom neon sign" tra le top ricerche Etsy oggi',time:'1 ora fa'},
    {icon:'📦',text:'Sublimet: nuovi tumbler sub disponibili a €4.20',time:'3 ore fa'},
    {icon:'⚠️',text:'Concorrente LaserGift ha abbassato prezzi portachiavi',time:'5 ore fa'},
  ];

  // Register all tables
  regTable('trends',{storageKey:'ai_trends',cols:[{key:'name',label:'Prodotto'},{key:'cat',label:'Categoria'},{key:'growth',label:'Crescita',width:'80px'},{key:'demand',label:'Domanda',type:'number',width:'80px'},{key:'comp',label:'Concorrenza',width:'100px'},{key:'price',label:'Prezzo',width:'90px'}],defaults:D_TRENDS,title:'🔥 Prodotti di Tendenza (editabile)'});
  regTable('etsy',{storageKey:'ai_etsy',cols:[{key:'kw',label:'Keyword'},{key:'vol',label:'Ricerche/mese',width:'110px'},{key:'comp',label:'Concorrenza',width:'100px'},{key:'opp',label:'Opportunità',width:'100px'}],defaults:D_ETSY,title:'🔍 Keyword Etsy (editabile)'});
  regTable('price',{storageKey:'ai_price',cols:[{key:'cat',label:'Categoria'},{key:'min',label:'Min €',type:'number',width:'70px'},{key:'med',label:'Medio €',type:'number',width:'70px'},{key:'max',label:'Max €',type:'number',width:'70px'},{key:'markup',label:'Markup',width:'90px'}],defaults:D_PRICE,title:'💰 Range Prezzi (editabile)'});
  regTable('demand',{storageKey:'ai_demand',cols:[{key:'region',label:'Regione'},{key:'demand',label:'Domanda %',type:'number',width:'90px'},{key:'sector',label:'Settore forte'}],defaults:D_DEMAND,title:'📍 Domanda per Regione (editabile)'});
  regTable('products',{storageKey:'ai_products',cols:[{key:'name',label:'Prodotto'},{key:'cost',label:'Costo €',type:'number',width:'80px'},{key:'sell',label:'Vendita €',type:'number',width:'80px'},{key:'margin',label:'Margine',width:'80px'},{key:'diff',label:'Difficoltà',width:'90px'}],defaults:D_PRODUCTS,title:'💡 Prodotti da Lanciare (editabile)'});
  regTable('growth',{storageKey:'ai_growth',cols:[{key:'action',label:'Azione'},{key:'channel',label:'Canale',width:'100px'},{key:'impact',label:'Impatto',width:'130px'},{key:'time',label:'Tempo',width:'110px'}],defaults:D_GROWTH,title:'🚀 Piano di Crescita (editabile)'});
  regTable('suppliers',{storageKey:'ai_suppliers',cols:[{key:'name',label:'Fornitore'},{key:'url',label:'Sito'},{key:'cat',label:'Categoria',width:'110px'},{key:'rating',label:'Rating',type:'number',width:'70px'},{key:'lead',label:'Lead',width:'70px'},{key:'rel',label:'Affid.%',type:'number',width:'70px'},{key:'price',label:'€',width:'50px'},{key:'best',label:'Best for'}],defaults:D_SUPPLIERS,title:'🏆 Fornitori (editabile — aggiungi/rimuovi/modifica)'});
  regTable('content',{storageKey:'ai_content',cols:[{key:'type',label:'Contenuto'},{key:'eng',label:'Engagement %',type:'number',width:'110px'},{key:'reach',label:'Reach',width:'90px'},{key:'rec',label:'Consigliato',width:'100px'}],defaults:D_CONTENT,title:'📊 Performance Contenuti (editabile)'});
  regTable('competitors',{storageKey:'ai_competitors',cols:[{key:'name',label:'Concorrente'},{key:'type',label:'Tipo',width:'100px'},{key:'price',label:'Fascia',width:'90px'},{key:'sku',label:'SKU',type:'number',width:'70px'},{key:'rating',label:'Rating',type:'number',width:'70px'},{key:'trend',label:'Trend',width:'60px'}],defaults:D_COMPETITORS,title:'🎯 Concorrenti (editabile)'});
  regTable('forecast',{storageKey:'ai_forecast',cols:[{key:'month',label:'Mese'},{key:'revenue',label:'Ricavo previsto €',type:'number'}],defaults:D_FORECAST,title:'📊 Proiezione Ricavi (editabile)'});
  regTable('intel',{storageKey:'ai_intel',cols:[{key:'icon',label:'Icona',width:'60px'},{key:'text',label:'Notizia'},{key:'time',label:'Quando',width:'100px'}],defaults:D_INTEL,title:'📡 Feed Intel (editabile)'});

  /* ═══════════════════════════════════════════════════════════
     RENDERERS
  ═══════════════════════════════════════════════════════════ */
  var RENDERERS={
    trendscanner:function(){ return header('🔥','Trend Hunter Pro','Prodotti in crescita — dati editabili')
      +kpiGrid([{val:'+350%',label:'Top crescita',color:'#22c55e'},{val:(window._aiData_trends||D_TRENDS).length,label:'Trend monitorati',color:'#3b82f6'},{val:'🔥',label:'Mercato caldo',color:'#ef4444'}])
      +editableTable(TABLES.trends?Object.assign({id:'trends'},TABLES.trends):{}); },

    etsy_pulse:function(){ return header('🛍️','Etsy Pulse — Live','Mercato Etsy — keyword editabili')
      +kpiGrid([{val:'2.4M',label:'Ricerche "personalized"',color:'#f0728f'},{val:'+18%',label:'Crescita nicchia',color:'#22c55e'},{val:'€24',label:'Prezzo medio',color:'#fbbf24'}])
      +editableTable(Object.assign({id:'etsy'},TABLES.etsy))
      +noteCard('💡 Suggerimento','<div style="font-size:12px;color:var(--text-muted,#888);line-height:1.6">Le insegne neon LED hanno bassa concorrenza ma alta domanda. Margine 65-75%.</div>'); },

    price_radar:function(){ return header('🎯','Price Radar','Prezzi di mercato — editabili')
      +kpiGrid([{val:'68%',label:'Margine medio',color:'#3b82f6'},{val:'×3.2',label:'Markup consigliato',color:'#a855f7'}])
      +editableTable(Object.assign({id:'price'},TABLES.price)); },

    demand_map:function(){ return header('🗺️','Demand Map','Domanda geografica IT — editabile')
      +kpiGrid([{val:'Lombardia',label:'Regione top',color:'#22c55e'},{val:'Nov-Dic',label:'Picco stagionale',color:'#ef4444'}])
      +editableTable(Object.assign({id:'demand'},TABLES.demand))
      +noteCard('📅 Calendario Stagionale','<div style="font-size:12px;color:var(--text-muted,#888);line-height:1.7"><b style="color:#ef4444">Nov-Dic:</b> Natale (picco)<br><b style="color:#ec4899">Apr-Giu:</b> Matrimoni<br><b style="color:#22c55e">Set:</b> Rientro<br><b style="color:#fbbf24">Feb:</b> San Valentino</div>'); },

    product_hunter:function(){ return header('🚀','Product Hunter AI','Idee prodotto ad alto margine — editabili')
      +kpiGrid([{val:(window._aiData_products||D_PRODUCTS).length,label:'Idee validate',color:'#22c55e'},{val:'€35',label:'Margine medio',color:'#fbbf24'}])
      +editableTable(Object.assign({id:'products'},TABLES.products)); },

    market_agent:function(){ return header('🤖','Market AI Agent','Analisi strategica')
      +noteCard('🧠 Analisi Strategica','<div style="font-size:13px;line-height:1.7">'
        +'<div style="padding:12px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:10px;margin-bottom:10px"><b style="color:#22c55e">✅ Opportunità:</b> Insegne LED neon in crescita +140%, bassa saturazione, margini 65-75%.</div>'
        +'<div style="padding:12px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:10px;margin-bottom:10px"><b style="color:#f59e0b">⚠️ Attenzione:</b> Portachiavi e gadget base saturi, margini in calo.</div>'
        +'<div style="padding:12px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);border-radius:10px"><b style="color:#3b82f6">💡 Consiglio:</b> Diversifica verso premium con storytelling. Etsy + Instagram per B2C premium.</div></div>')
      +editableTable({id:'growth',storageKey:'ai_growth',cols:TABLES.growth.cols,defaults:D_GROWTH,title:'📊 Azioni Strategiche (editabile)'}); },

    etsy_seo_wizard:function(){ return header('🔮','Etsy SEO Wizard','Generatore titoli + tag')
      +noteCard('✨ Generatore Titoli SEO','<div style="font-size:12px;color:var(--text-muted,#888);margin-bottom:10px">Inserisci il prodotto:</div>'
        +'<div style="display:flex;gap:8px;margin-bottom:12px"><input id="seo-input" placeholder="Es. tumbler personalizzato" style="flex:1;padding:9px 12px;background:var(--bg-card2,#161618);border:1.5px solid var(--border,#333);border-radius:8px;color:var(--text,#e5e5e5);font-size:13px"><button onclick="window._etsySeoGen()" style="padding:9px 16px;background:var(--primary,#fbbf24);border:none;border-radius:8px;color:#000;cursor:pointer;font-weight:700">Genera</button></div><div id="seo-result"></div>')
      +noteCard('🏷️ Tag ad Alto Traffico','<div style="display:flex;flex-wrap:wrap;gap:6px">'
        +['personalized gift','custom name','engraved','handmade','wedding gift','anniversary gift','laser engraved','gift for her','gift for him','home decor','custom sign','monogram'].map(function(t){return '<span style="padding:5px 11px;background:rgba(240,114,143,.1);border:1px solid rgba(240,114,143,.25);border-radius:20px;font-size:11px;color:#f0728f;cursor:pointer" onclick="navigator.clipboard&&navigator.clipboard.writeText(\''+t+'\');if(typeof toast!==\'undefined\')toast(\'Copiato!\',\'success\')">'+t+'</span>';}).join('')+'</div>'); },

    live_intel:function(){ return header('📡','Live Intel Feed','Aggiornamenti mercato — editabili')
      +editableTable(Object.assign({id:'intel'},TABLES.intel)); },

    growthengine:function(){ return header('📈','Growth Engine','Strategie di crescita — editabili')
      +kpiGrid([{val:'+32%',label:'Potenziale crescita',color:'#22c55e'},{val:(window._aiData_growth||D_GROWTH).length,label:'Azioni',color:'#fbbf24'}])
      +editableTable(Object.assign({id:'growth'},TABLES.growth)); },

    forecaster:function(){
      var data=window._aiData_forecast||lsGet('ai_forecast',D_FORECAST);
      var max=Math.max.apply(null,data.map(function(d){return +d.revenue||0;}))||1;
      var chart='<div style="display:flex;align-items:flex-end;gap:8px;height:150px;padding:10px 0">'
        +data.map(function(d){var h=Math.round((+d.revenue||0)/max*100);return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div style="font-size:10px;font-weight:700;color:var(--text-muted,#888)">'+eu(d.revenue)+'</div><div style="width:100%;height:'+h+'%;background:linear-gradient(180deg,var(--primary,#fbbf24),rgba(251,191,36,.3));border-radius:4px 4px 0 0;min-height:6px"></div><div style="font-size:9px;color:var(--text-muted,#888)">'+esc((d.month||'').slice(0,3))+'</div></div>';}).join('')+'</div>';
      var tot=data.reduce(function(s,d){return s+(+d.revenue||0);},0);
      return header('🔮','Financial Forecaster','Previsioni — editabili')
        +kpiGrid([{val:eu(tot),label:'Totale periodo',color:'#fbbf24'},{val:eu(max),label:'Picco mensile',color:'#22c55e'}])
        +noteCard('📊 Proiezione Ricavi',chart)
        +editableTable(Object.assign({id:'forecast'},TABLES.forecast)); },

    supplierintel:function(){
      var data=window._aiData_suppliers||lsGet('ai_suppliers',D_SUPPLIERS);
      var avgRel=Math.round(data.reduce(function(s,x){return s+(+x.rel||0);},0)/(data.length||1));
      return header('🏭','Supplier Intelligence','Fornitori IT — aggiungi, rimuovi, modifica')
        +kpiGrid([{val:data.length,label:'Fornitori',color:'#3b82f6'},{val:'4.6★',label:'Rating medio',color:'#fbbf24'},{val:avgRel+'%',label:'Affidabilità media',color:'#22c55e'}])
        +editableTable(Object.assign({id:'suppliers'},TABLES.suppliers))
        +noteCard('💡 Consiglio','<div style="font-size:12px;color:var(--text-muted,#888);line-height:1.6">Per <b style="color:#22c55e">legno/acrilico</b>: Temaplex + CPL Fabbrika. Per <b style="color:#f0728f">sublimazione</b>: Sublimet (lead time rapidi). Per <b style="color:#3b82f6">LED insegne</b>: RS Components.</div>'); },

    contentperf:function(){ return header('📱','Content Performance','Performance social — editabile')
      +kpiGrid([{val:'4.2%',label:'Engagement medio',color:'#22c55e'},{val:'Reels',label:'Formato top',color:'#ec4899'}])
      +editableTable(Object.assign({id:'content'},TABLES.content)); },

    competitormon:function(){ return header('🔍','Competitor Monitor','Concorrenti — editabili')
      +kpiGrid([{val:(window._aiData_competitors||D_COMPETITORS).length,label:'Tracciati',color:'#3b82f6'},{val:'Premium',label:'Posizione consigliata',color:'#a855f7'}])
      +editableTable(Object.assign({id:'competitors'},TABLES.competitors)); },
  };

  window._etsySeoGen=function(){
    var inp=document.getElementById('seo-input'); var res=document.getElementById('seo-result');
    if(!inp||!res) return;
    var p=inp.value.trim()||'prodotto personalizzato';
    var titles=[
      'Personalized '+p+' | Custom Engraved Gift | Handmade Laser Cut | Wedding Anniversary Birthday Gift',
      'Custom '+p+' Engraved | Unique Personalized Present | Laser Cut Handmade | Gift for Mom Dad Couple',
      'Custom '+p+' - Personalized Name Gift - Laser Engraved - Unique Home Decor - Wedding Birthday Present'
    ];
    res.innerHTML='<div style="display:flex;flex-direction:column;gap:8px">'+titles.map(function(t){
      return '<div style="padding:10px 12px;background:rgba(240,114,143,.08);border:1px solid rgba(240,114,143,.2);border-radius:8px;font-size:12px;color:var(--text,#e5e5e5);cursor:pointer" onclick="navigator.clipboard&&navigator.clipboard.writeText(this.textContent);if(typeof toast!==\'undefined\')toast(\'Copiato!\',\'success\')">'+esc(t)+' 📋</div>';
    }).join('')+'</div>';
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER + BULLETPROOF MOUNTING
  ═══════════════════════════════════════════════════════════ */
  function renderModule(route){
    var el=document.getElementById('view-'+route);
    if(!el) return;
    var fn=RENDERERS[route]; if(!fn) return;
    try{
      el.innerHTML='<div style="padding:20px;max-width:1100px" data-ai-rendered="'+route+'">'+fn()+'</div>';
      // Bind editable tables
      bindEditableTables(el, function(){ renderModule(route); });
    }catch(e){ el.innerHTML='<div style="padding:20px;color:#ef4444">Errore: '+e.message+'</div>'; console.error('[ai-edit]',route,e); }
  }
  window._renderAIModule = renderModule;

  // Register stub modules (for routes WITH handlers)
  var MODULE_MAP={trendscanner:'TrendScanner',supplierintel:'SupplierIntel',contentperf:'ContentPerf',competitormon:'CompetitorMon',
    etsy_pulse:'EtsyPulse',price_radar:'PriceRadar',demand_map:'DemandMap',product_hunter:'ProductHunter',market_agent:'MarketAgent',
    etsy_seo_wizard:'EtsySeoWizard',live_intel:'LiveIntel',growthengine:'GrowthEngine',forecaster:'Forecaster'};
  Object.keys(MODULE_MAP).forEach(function(route){
    var modName=MODULE_MAP[route];
    window[modName]=window[modName]||{};
    window[modName].render=function(){ renderModule(route); };
  });

  // Hook navigation (for routes WITHOUT handlers)
  function hookNav(){
    if(typeof App==='undefined'||!App.renderSection||App._aiEditHook) return;
    App._aiEditHook=true;
    var _orig=App.renderSection.bind(App);
    App.renderSection=async function(s){
      var r; try{ r=await _orig(s); }catch(e){ r=null; }
      if(RENDERERS[s]){ setTimeout(function(){ renderModule(s); },60); }
      return r;
    };
  }

  // BULLETPROOF: persistent interval (never fully stops) watches active views
  var _watchCount=0;
  setInterval(function(){
    hookNav();
    // Render any active AI view that's empty or not yet rendered by us
    Object.keys(RENDERERS).forEach(function(route){
      var el=document.getElementById('view-'+route);
      if(el && el.classList.contains('active')){
        if(!el.querySelector('[data-ai-rendered]')){ renderModule(route); }
      }
    });
    _watchCount++;
  }, 600);

  console.log('[v27-ai-edit] 13 moduli AI EDITABILI (add/remove/edit) + rendering bulletproof ✅');
})();


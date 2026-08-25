
// ═══════════════════════════════════════════════════════════════════════
// INGLY OS v32 — LaserB2B Pro Ultimate
// Machines CRUD · Sides (fronte/retro/entrambi) · Free qty · Markup
// ═══════════════════════════════════════════════════════════════════════
;(function _laserProV32(){
  function _init(){
    if(typeof LaserB2B==='undefined'){setTimeout(_init,500);return;}
    if(LaserB2B._v32pro) return;
    LaserB2B._v32pro=true;

    var MACH_SK   = 'lb2b_machines_v32';
    var STOCK_SK  = 'lb2b_stock_v1';
    var QUOTES_SK = 'lb2b_quotes_v1';
    var CFG_SK    = 'lb2b_cfg_v32';

    // ── Machines (full catalog) ───────────────────────────────────
    var DEFAULT_MACHINES = {
      xtool_f2: {
        label:'xTool F2 Diodo+IR',icon:'⚡',color:'#fbbf24',
        desc:'Diodo 15W + IR 5W · 6000mm/s · 115×115mm · Auto-focus',
        purchaseCost:1290,lifeYears:5,watts:80,
        hourly:0.156,energyH:0.022,
        timePerMm2:0.0015,speedMms:6000,
        materials:'Legno, MDF, bambù, acrilico, pelle, sughero, inox (IR 5W), alluminio anodizzato',
        tip:'IR 5W: metalli e materiali riflettenti. Diodo: organici e plastica.',
        url:'https://www.xtool.com/products/xtool-f2',
      },
      xtool_p3_20w: {
        label:'xTool P3 20W Diodo',icon:'🔷',color:'#06b6d4',
        desc:'Diodo 20W · 400×400mm · taglio veloce',
        purchaseCost:800,lifeYears:5,watts:65,
        hourly:0.10,energyH:0.018,
        timePerMm2:0.0012,speedMms:8000,
        materials:'Legno sottile, MDF, plexiglass, pelle, tessuto, feltro, sughero',
        tip:'Taglia MDF 3mm in una passata. Buono per volumi alti.',
        url:'https://www.xtool.com',
      },
      xtool_p3_co2_80w: {
        label:'xTool P3 CO2 80W',icon:'🔵',color:'#3b82f6',
        desc:'CO2 80W · Area 500×300mm · professionale',
        purchaseCost:3200,lifeYears:8,watts:160,
        hourly:0.222,energyH:0.044,
        timePerMm2:0.0008,speedMms:12000,
        materials:'Legno, MDF, plexiglass, vetro, ceramica, marmo, granito, plastica, tessuto',
        tip:'CO2 80W: massima velocità e qualità. Ideale per produczione di serie.',
        url:'https://www.xtool.com',
      },
      xtool_p2_co2_55w: {
        label:'xTool P2 CO2 55W',icon:'🔵',color:'#2563eb',
        desc:'CO2 55W · 600×400mm · semi-professionale',
        purchaseCost:2500,lifeYears:8,watts:120,
        hourly:0.195,energyH:0.034,
        timePerMm2:0.0010,speedMms:10000,
        materials:'Legno, MDF, plexiglass, vetro, ceramica, tessuto, pelle',
        tip:'CO2 versatile: taglia MDF 6mm, plexiglass 8mm.',
        url:'https://www.xtool.com/products/xtool-p2',
      },
      epson_et2865: {
        label:'Epson EcoTank ET-2865',icon:'🖨️',color:'#10b981',
        desc:'Sublimazione A4 · EcoTank · ink refill',
        purchaseCost:180,lifeYears:5,watts:15,
        hourly:0.0225,energyH:0.004,
        timePerMm2:0.0002,speedMms:500,
        materials:'Poliestere, tazze ceramica, cuscini, puzzle, pannelli MDF bianchi',
        tip:'Sub ink ~0.50€/A4. Riscaldamento 5 min. Solo su bianco.',
        url:'https://www.epson.it',
      },
      pressa_termica: {
        label:'Pressa Termica 40×50cm',icon:'🔥',color:'#f97316',
        desc:'Pressa DTF/Sub/Transfer · 40×50cm · 200°C',
        purchaseCost:250,lifeYears:8,watts:1500,
        hourly:0.0195,energyH:0.042,
        timePerMm2:0.0001,speedMms:0,
        materials:'T-shirt, felpe, shopper, DTF, sublimazione tessuto',
        tip:'DTF: 160-180°C 25 sec. Sub: 200°C 30-45 sec.',
        url:'https://www.amazon.it',
      },
    };

    // Load custom machines or use defaults
    function loadMachines(){
      try{
        var saved=JSON.parse(localStorage.getItem(MACH_SK)||'null');
        if(saved&&Object.keys(saved).length) return saved;
      }catch(e){}
      return DEFAULT_MACHINES;
    }
    function saveMachines(d){try{localStorage.setItem(MACH_SK,JSON.stringify(d));}catch(e){}}

    // Load/save config (markup, labor, etc.)
    function loadCfg(){
      try{return JSON.parse(localStorage.getItem(CFG_SK)||'{}');}catch(e){return{};}
    }
    function saveCfg(d){try{localStorage.setItem(CFG_SK,JSON.stringify(d));}catch(e){}}

    // Apply machines
    var machines=loadMachines();
    LaserB2B._MACHINES=Object.assign({},LaserB2B._MACHINES||{},machines);

    // Config state
    var cfg=loadCfg();
    LaserB2B._cfgV32={
      sides:    cfg.sides||'front',       // front | back | both
      markup:   cfg.markup||2.0,
      labor:    cfg.labor||18,
      pack:     cfg.pack||0.30,
      channel:  cfg.channel||'b2b',
      machine:  cfg.machine||'xtool_f2',
      margin_threshold: cfg.margin_threshold||30,
    };

    function saveState(){
      saveCfg({
        sides:   LaserB2B._cfgV32.sides,
        markup:  LaserB2B._cfgV32.markup,
        labor:   LaserB2B._cfgV32.labor,
        pack:    LaserB2B._cfgV32.pack,
        channel: LaserB2B._cfgV32.channel,
        machine: LaserB2B._cfgV32.machine,
        margin_threshold: LaserB2B._cfgV32.margin_threshold,
      });
    }

    // ── Core calculation (v32 enhanced) ──────────────────────────
    LaserB2B._calcV32 = function(){
      var p=this._selProduct; if(!p) return null;
      var cfg=this._cfgV32;
      var m=this._MACHINES[cfg.machine];
      if(!m) return null;
      var qty=this._selQty||1;
      var sides=cfg.sides;
      var sidesMult=sides==='both'?2.0:1.0;
      var sidesSetup=sides==='both'?0.5:0; // 30s extra to flip piece

      // Material cost with quantity discount
      var sd=qty>=50?0.20:qty>=25?0.15:qty>=10?0.10:0;
      var stock=this._loadStock&&this._loadStock()||{};
      var matCost=(stock[p.id]&&stock[p.id].cost)||p.costSup||p.cost||0;
      var mc=matCost*(1-sd);

      // Time per piece (base * sides multiplier + flip time)
      var tm=((p.timeMin||1.5)*sidesMult)+sidesSetup;
      // Efficiency bonus for volume
      var effMult=qty>=100?0.85:qty>=50?0.92:qty>=20?0.96:1.0;
      tm=tm*effMult;

      var mhc=(m.hourly+(m.energyH||0))/60*tm;
      var lc=cfg.labor/60*tm;
      var cp=mc+mhc+lc+cfg.pack;
      var fp=Math.max(15,cp*cfg.markup);
      var profit=fp-cp;
      var mg=fp>0?Math.round(profit/fp*100):0;
      var md=Math.max(0,Math.round((1-cp/(0.65*fp))*100));

      return {
        p, m, qty, sides, sidesMult, sidesSetup, sd, mc, tm, mhc, lc,
        cp, fp, profit, mg, md,
        total:fp*qty, costTotal:cp*qty, profitTotal:profit*qty,
        matCost:matCost,
      };
    };

    // ── Main render for laser_b2b view ────────────────────────────
    LaserB2B.render=function(){
      var el=document.getElementById('view-laser_b2b'); if(!el) return;
      var self=this;
      var machines=loadMachines();
      var prods=this._PRODUCTS||[];
      var cats=[...new Set(prods.map(function(p){return p.cat;}))];
      var techs=[...new Set(prods.map(function(p){return p.tech;}))];
      var cfg=this._cfgV32;

      var machOpts=Object.entries(machines).map(function(kv){
        var k=kv[0]; var m=kv[1];
        return '<option value="'+k+'"'+(k===cfg.machine?' selected':'')+'>'+m.icon+' '+m.label+'</option>';
      }).join('');
      var catOpts=cats.map(function(c){return '<option value="'+c+'">'+c+'</option>';}).join('');

      el.innerHTML='<div style="padding:14px 18px;max-width:1300px;margin:0 auto">'
        // ── HEADER ─────────────────────────────────────────────
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">'
        +'<div><div style="font-size:20px;font-weight:900;color:var(--text)">💼 Laser Quoter B2B</div>'
        +'<div style="font-size:11px;color:var(--text-muted)" id="lb2b-subtitle">'+prods.length+' prodotti · Calcolo costi professionale</div></div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
        +'<button onclick="LaserB2B._openMachineManager32()" style="padding:7px 12px;background:var(--bg-card2);color:#f59e0b;border:1.5px solid rgba(245,158,11,.3);border-radius:9px;cursor:pointer;font-size:11px;font-weight:700">⚙️ Macchine</button>'
        +'<button onclick="LaserB2B._openCatalogManager()" style="padding:7px 12px;background:var(--bg-card2);color:#818cf8;border:1.5px solid rgba(99,102,241,.3);border-radius:9px;cursor:pointer;font-size:11px;font-weight:700">📋 Catalogo</button>'
        +'<button onclick="LaserB2B.openStockManager&&LaserB2B.openStockManager()" style="padding:7px 12px;background:var(--bg-card2);color:#10b981;border:1.5px solid rgba(16,185,129,.3);border-radius:9px;cursor:pointer;font-size:11px;font-weight:700">📦 Magazzino</button>'
        +'<button onclick="LaserB2B.openQuoteHistory&&LaserB2B.openQuoteHistory()" style="padding:7px 12px;background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:11px">📋 Storico</button>'
        +'</div></div>'

        // ── CONFIGURAZIONE LAVORO ───────────────────────────────
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:12px">'
        +'<div style="font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:6px"><span>⚙️</span> Configurazione Lavoro</div>'
        +'<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:10px;align-items:end">'

        // Machine
        +'<div style="grid-column:span 2"><label style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">⚙️ Macchina Laser</label>'
        +'<div style="display:flex;gap:5px">'
        +'<select id="lb2b-machine" onchange="LaserB2B._onCfgChange(\'machine\',this.value)" style="flex:1;padding:9px;background:var(--bg-card);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">'+machOpts+'</select>'
        +'<button onclick="LaserB2B._openMachineManager32()" title="Gestisci macchine" style="padding:9px 10px;background:rgba(245,158,11,.1);color:#f59e0b;border:1px solid rgba(245,158,11,.25);border-radius:8px;cursor:pointer;font-size:12px">⚙️</button>'
        +'</div></div>'

        // Sides selection
        +'<div style="grid-column:span 2"><label style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">🔄 Lati da incidere</label>'
        +'<div style="display:flex;gap:4px" id="lb2b-sides-btns">'
        +[{k:'front',l:'Solo Fronte',i:'⬜'},{k:'back',l:'Solo Retro',i:'🔄'},{k:'both',l:'Fronte+Retro',i:'⬛'}].map(function(s){
          var isActive=cfg.sides===s.k;
          return '<button onclick="LaserB2B._setSides(\''+s.k+'\')" id="lb2b-side-'+s.k+'" '
            +'style="flex:1;padding:8px 4px;border-radius:8px;cursor:pointer;font-size:10px;font-weight:700;border:1.5px solid '+(isActive?'var(--primary)':'var(--border)')+';background:'+(isActive?'rgba(99,102,241,.15)':'var(--bg-card)')+';color:'+(isActive?'var(--primary)':'var(--text-muted)')+';transition:.15s;text-align:center">'
            +s.i+'<div style="margin-top:1px">'+s.l+'</div>'
            +'</button>';
        }).join('')+'</div></div>'

        // Qty
        +'<div><label style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">📦 Quantità (pz)</label>'
        +'<input id="lb2b-qty-input" type="number" min="1" value="'+(LaserB2B._selQty||1)+'" placeholder="Es. 7, 25, 150..."'
        +' oninput="LaserB2B._onQtyInput(this.value)"'
        +' style="width:100%;padding:9px;background:var(--bg-card);border:1.5px solid var(--primary,#6366f1);border-radius:9px;color:var(--primary,#6366f1);font-size:16px;font-weight:900;text-align:center"></div>'

        // Labor
        +'<div><label style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">👷 Lavoro €/h</label>'
        +'<input id="lb2b-labor" type="number" value="'+cfg.labor+'" min="5" step="0.5"'
        +' oninput="LaserB2B._onCfgChange(\'labor\',parseFloat(this.value)||18)"'
        +' style="width:100%;padding:9px;background:var(--bg-card);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;text-align:center"></div>'

        // Pack
        +'<div><label style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">📦 Pack €/pz</label>'
        +'<input id="lb2b-pack" type="number" value="'+cfg.pack+'" min="0" step="0.05"'
        +' oninput="LaserB2B._onCfgChange(\'pack\',parseFloat(this.value)||0)"'
        +' style="width:100%;padding:9px;background:var(--bg-card);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;text-align:center"></div>'

        +'</div>'

        // Channel + Markup row
        +'<div style="display:grid;grid-template-columns:1fr 3fr 1fr;gap:10px;margin-top:12px;align-items:center">'
        +'<div><label style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">🎯 Canale Vendita</label>'
        +'<select id="lb2b-channel" onchange="LaserB2B._onChannelChange(this.value)" style="width:100%;padding:9px;background:var(--bg-card);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">'
        +'<option value="b2b"'+(cfg.channel==='b2b'?' selected':'')+'>B2B Aziende</option>'
        +'<option value="etsy"'+(cfg.channel==='etsy'?' selected':'')+'>Etsy / Online</option>'
        +'<option value="retail"'+(cfg.channel==='retail'?' selected':'')+'>Retail / Negozio</option>'
        +'<option value="custom"'+(cfg.channel==='custom'?' selected':'')+'>Custom (imposta)</option>'
        +'</select></div>'

        // Markup slider
        +'<div>'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'
        +'<label style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase">💰 Markup / Moltiplicatore Profitto</label>'
        +'<div id="lb2b-markup-display" style="font-size:14px;font-weight:900;color:var(--primary)">×'+cfg.markup.toFixed(2)+'</div>'
        +'</div>'
        +'<div style="display:flex;align-items:center;gap:8px">'
        +'<span style="font-size:11px;color:var(--text-muted)">×1.0</span>'
        +'<input type="range" id="lb2b-markup-slider" min="1.0" max="8.0" step="0.05" value="'+cfg.markup+'"'
        +' oninput="LaserB2B._onMarkupChange(parseFloat(this.value))"'
        +' style="flex:1;accent-color:var(--primary,#6366f1);cursor:pointer">'
        +'<span style="font-size:11px;color:var(--text-muted)">×8.0</span>'
        +'<input type="number" id="lb2b-markup-input" min="1.0" max="20" step="0.1" value="'+cfg.markup.toFixed(2)+'"'
        +' oninput="LaserB2B._onMarkupChange(parseFloat(this.value))"'
        +' style="width:65px;padding:7px;background:var(--bg-card);border:1.5px solid var(--primary,#6366f1);border-radius:8px;color:var(--primary,#6366f1);font-size:13px;font-weight:800;text-align:center">'
        +'</div>'
        +'<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim);margin-top:2px">'
        +'<span>Costo×</span><span style="color:#f59e0b">Minimo (~1.5)</span><span style="color:#10b981">B2B (~2.0)</span><span style="color:#22c55e">Retail (~3.0)</span><span style="color:#f97316">Etsy (~3.5)</span><span>Max</span>'
        +'</div></div>'

        +'<div id="lb2b-margin-badge" style="background:var(--bg-card);border-radius:10px;padding:12px;text-align:center">'
        +'<div style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:3px">Margine Est.</div>'
        +'<div id="lb2b-margin-pct" style="font-size:22px;font-weight:900">—</div>'
        +'</div></div></div>'

        // ── MAIN CONTENT GRID ───────────────────────────────────
        +'<div style="display:grid;grid-template-columns:280px 1fr;gap:12px">'

        // Left: product list
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;overflow:hidden">'
        +'<div style="padding:10px 12px;border-bottom:1px solid var(--border)">'
        +'<input oninput="LaserB2B._filterProds32(this.value)" id="lb2b-search32" placeholder="🔍 Cerca prodotto..." '
        +'style="width:100%;padding:7px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">'
        +'<div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">'
        +(['','laser','sublimazione','dtf','laser+sub']).map(function(t){
          var labels={'':'Tutti','laser':'⚡ Laser','sublimazione':'🌈 Sub','dtf':'🎨 DTF','laser+sub':'✨ Multi'};
          return '<button onclick="LaserB2B._filterByTech32(\''+t+'\')" data-tf="'+t+'" '
            +'style="padding:3px 8px;border-radius:20px;cursor:pointer;font-size:9px;font-weight:700;border:1px solid var(--border);background:'+(t===''?'var(--primary)':'var(--bg-card)')+';color:'+(t===''?'#fff':'var(--text-muted)')+';transition:.1s">'+labels[t]+'</button>';
        }).join('')+'</div></div>'
        +'<div id="lb2b-prod-list32" style="overflow-y:auto;max-height:calc(100vh - 360px)"></div>'
        +'</div>'

        // Right: calculator panel
        +'<div id="lb2b-calc32" style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:18px">'
        +'<div style="text-align:center;padding:60px 0;color:var(--text-dim)">'
        +'<div style="font-size:40px;margin-bottom:12px">💼</div>'
        +'<div style="font-size:14px;font-weight:800;margin-bottom:6px">Seleziona un prodotto</div>'
        +'<div style="font-size:11px">Clicca qualsiasi prodotto a sinistra per calcolare costi, prezzi e margini in tempo reale</div>'
        +'</div></div>'
        +'</div></div>';

      // Populate product list
      this._renderProdList32(prods,'');
      // Update margin badge
      this._updateMarkupDisplay();
    };

    LaserB2B._renderProdList32=function(prods,techFilter){
      var inner=document.getElementById('lb2b-prod-list32'); if(!inner) return;
      var cats=[...new Set(prods.map(function(p){return p.cat;}))];
      var filtered=techFilter?prods.filter(function(p){return p.tech===techFilter;}):prods;
      var html='';
      var stock=this._loadStock&&this._loadStock()||{};
      cats.forEach(function(cat){
        var items=filtered.filter(function(p){return p.cat===cat;});
        if(!items.length) return;
        var TC={laser:'#fbbf24',sublimazione:'#10b981',dtf:'#ec4899','laser+sub':'#8b5cf6'};
        html+='<div style="padding:5px 10px;font-size:9px;font-weight:800;color:var(--text-muted);text-transform:uppercase;background:rgba(255,255,255,.03);border-bottom:1px solid var(--border);position:sticky;top:0">'+cat+'</div>';
        items.forEach(function(p){
          var s=stock[p.id]||{qty:-1};
          var sc=s.qty<0?'transparent':s.qty<=0?'#ef4444':s.qty<5?'#f59e0b':'#22c55e';
          var sn=s.qty<0?'':s.qty<=0?'0':s.qty+'';
          var col=TC[p.tech||'laser']||'#6366f1';
          html+='<button id="lb2b-btn-'+p.id+'" onclick="LaserB2B._selectProd32(\''+p.id+'\')" '
            +'style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;background:transparent;border:0;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;text-align:left;transition:.12s" '
            +'onmouseover="if(!this.classList.contains(\'sel\'))this.style.background=\'var(--bg-card)\'" '
            +'onmouseout="if(!this.classList.contains(\'sel\'))this.style.background=\'transparent\'">'
            +'<span style="font-size:16px">'+p.img+'</span>'
            +'<div style="flex:1;min-width:0">'
            +'<div style="font-size:11px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+p.name+'</div>'
            +'<div style="font-size:9px;display:flex;gap:5px;align-items:center;margin-top:1px">'
            +'<span style="background:'+col+'20;color:'+col+';padding:0 4px;border-radius:8px">'+( p.tech||'laser')+'</span>'
            +'<span style="color:var(--text-dim)">€'+(p.costSup||p.cost||0).toFixed(2)+'</span>'
            +'</div></div>'
            +(sn?'<span style="font-size:9px;font-weight:800;color:'+sc+'">'+sn+'</span>':'')
            +'</button>';
        });
      });
      inner.innerHTML=html||'<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:12px">Nessun prodotto trovato</div>';
    };

    LaserB2B._filterProds32=function(q){
      var prods=this._PRODUCTS||[];
      var tech=this._techFilter32||'';
      var filtered=prods.filter(function(p){
        return (!q||p.name.toLowerCase().includes(q.toLowerCase())||p.cat.toLowerCase().includes(q.toLowerCase()))&&(!tech||p.tech===tech);
      });
      this._renderProdList32(filtered,tech);
    };
    LaserB2B._filterByTech32=function(tech){
      this._techFilter32=tech;
      document.querySelectorAll('[data-tf]').forEach(function(b){
        var isCur=b.getAttribute('data-tf')===tech;
        b.style.background=isCur?'var(--primary)':'var(--bg-card)';
        b.style.color=isCur?'#fff':'var(--text-muted)';
      });
      this._filterProds32(document.getElementById('lb2b-search32')?.value||'');
    };

    LaserB2B._selectProd32=function(id){
      this._selProduct=(this._PRODUCTS||[]).find(function(p){return p.id===id;});
      if(!this._selProduct) return;
      document.querySelectorAll('[id^="lb2b-btn-"]').forEach(function(b){
        b.classList.remove('sel'); b.style.background='transparent'; b.style.borderLeft='none';
      });
      var btn=document.getElementById('lb2b-btn-'+id);
      if(btn){btn.classList.add('sel');btn.style.background='rgba(99,102,241,.1)';btn.style.borderLeft='3px solid var(--primary)';}
      this._renderCalc32();
    };

    LaserB2B._onQtyInput=function(val){
      var v=parseInt(val)||1; if(v<1) v=1;
      this._selQty=v;
      clearTimeout(this._qtyTimer32);
      this._qtyTimer32=setTimeout(function(){LaserB2B._renderCalc32();},200);
    };

    LaserB2B._setSides=function(sides){
      this._cfgV32.sides=sides;
      saveState();
      // Update buttons
      ['front','back','both'].forEach(function(s){
        var btn=document.getElementById('lb2b-side-'+s);
        if(!btn) return;
        var isActive=s===sides;
        btn.style.borderColor=isActive?'var(--primary)':'var(--border)';
        btn.style.background=isActive?'rgba(99,102,241,.15)':'var(--bg-card)';
        btn.style.color=isActive?'var(--primary)':'var(--text-muted)';
      });
      this._renderCalc32();
    };

    LaserB2B._onCfgChange=function(key,val){
      this._cfgV32[key]=val; saveState(); this._renderCalc32();
      if(key==='machine'){ var m=this._MACHINES&&this._MACHINES[val]; if(m&&typeof Bus!=='undefined') Bus.emit('machine:selected',{key:val,mach:m}); }
    };

    LaserB2B._loadClients32=function(){
      var sel=document.getElementById('lb2b-client32'); if(!sel) return;
      var cur=LaserB2B._client||'';
      AppStore.get('clients').catch(function(){return[];}).then(function(clients){
        var opts='<option value="">-- Seleziona --</option>';
        (clients||[]).forEach(function(c){
          var sel_=(c.name===cur||c.id===cur)?'selected':'';
          opts+='<option value="'+c.id+'" '+sel_+'>'+c.name+'</option>';
        });
        var el=document.getElementById('lb2b-client32'); if(el) el.innerHTML=opts;
        if(cur){ var el2=document.getElementById('lb2b-client32'); if(el2&&!el2.value){ var o=document.createElement('option'); o.value=cur; o.text=cur; o.selected=true; el2.appendChild(o); } }
      });
    };

    LaserB2B._saveNewClientLB2B=function(){
      var name=(document.getElementById('lb2b-qnc-name')?.value||'').trim();
      if(!name){ if(typeof toast!=='undefined') toast('Inserisci almeno il nome','warning'); return; }
      var phone=(document.getElementById('lb2b-qnc-phone')?.value||'').trim();
      var email=(document.getElementById('lb2b-qnc-email')?.value||'').trim();
      var newC={id:'c'+Date.now(),name:name,phone:phone,email:email,createdAt:new Date().toISOString(),tags:['b2b'],source:'laser_quoter'};
      AppStore.get('clients').catch(function(){return[];}).then(function(clients){
        clients.push(newC);
        return AppStore.set('clients',clients).then(function(){
          var sel=document.getElementById('lb2b-client32');
          if(sel){ var o=document.createElement('option'); o.value=newC.id; o.text=newC.name; o.selected=true; sel.appendChild(o); }
          LaserB2B._client=newC.name;
          var f=document.getElementById('lb2b-qnc-form'); if(f) f.style.display='none';
          ['lb2b-qnc-name','lb2b-qnc-phone','lb2b-qnc-email'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
          if(typeof toast!=='undefined') toast('✅ Cliente "'+name+'" aggiunto!','success');
          if(typeof Bus!=='undefined') Bus.emit('client:created',newC);
        });
      }).catch(function(){ if(typeof toast!=='undefined') toast('Errore salvataggio cliente','error'); });
    };

    LaserB2B._onChannelChange=function(ch){
      this._cfgV32.channel=ch;
      var presets={b2b:2.0,etsy:3.5,retail:3.0,custom:this._cfgV32.markup};
      if(ch!=='custom') this._onMarkupChange(presets[ch]||2.0);
      else this._renderCalc32();
      saveState();
    };

    LaserB2B._onMarkupChange=function(val){
      val=Math.max(1.0,Math.min(20,parseFloat(val)||1));
      this._cfgV32.markup=val;
      var slider=document.getElementById('lb2b-markup-slider');
      var inp=document.getElementById('lb2b-markup-input');
      var display=document.getElementById('lb2b-markup-display');
      if(slider) slider.value=Math.min(8,val);
      if(inp) inp.value=val.toFixed(2);
      if(display) display.textContent='×'+val.toFixed(2);
      this._updateMarkupDisplay();
      clearTimeout(this._markupTimer);
      this._markupTimer=setTimeout(function(){LaserB2B._renderCalc32();saveState();},150);
    };

    LaserB2B._updateMarkupDisplay=function(){
      // Estimate margin from markup: mg = 1 - 1/markup
      var mu=this._cfgV32.markup;
      var mg=Math.round((1-1/mu)*100);
      var mgc=mg>=60?'#22c55e':mg>=40?'#f59e0b':'#ef4444';
      var el=document.getElementById('lb2b-margin-pct');
      if(el){el.textContent=mg+'%'; el.style.color=mgc;}
    };

    LaserB2B._renderCalc32=function(){
      var d=this._calcV32(); if(!d) return;
      var el=document.getElementById('lb2b-calc32'); if(!el) return;
      var p=d.p;
      var TC={laser:'#fbbf24',sublimazione:'#10b981',dtf:'#ec4899','laser+sub':'#8b5cf6'};
      var col=TC[p.tech||'laser']||'#6366f1';
      var mgc=d.mg>=60?'#22c55e':d.mg>=40?'#f59e0b':'#ef4444';
      var sidesLabel={'front':'Solo fronte ⬜','back':'Solo retro 🔄','both':'Fronte + Retro ⬛ (×2 tempo)'}[d.sides]||d.sides;
      var tl=d.tm>=60?Math.floor(d.tm/60)+'h '+Math.round(d.tm%60)+'m':d.tm.toFixed(1)+'min';
      var totTime=d.tm*d.qty;
      var totTimeLabel=totTime>=60?Math.floor(totTime/60)+'h '+Math.round(totTime%60)+'m':Math.round(totTime)+'min';

      // ── Quick qty preset buttons ─────────────────────────────
      var qtyPresets=[1,5,10,20,50,100,200,500];
      var qtyBtns=qtyPresets.map(function(q){
        var isCur=q===d.qty;
        return '<button onclick="document.getElementById(\'lb2b-qty-input\').value='+q+';LaserB2B._onQtyInput('+q+')" '
          +'style="padding:5px 8px;border-radius:7px;cursor:pointer;font-size:10px;font-weight:700;border:1px solid '+(isCur?'var(--primary)':'var(--border)')+';background:'+(isCur?'var(--primary)':'var(--bg-card)')+';color:'+(isCur?'#fff':'var(--text-muted)')+';transition:.1s">'+q+'</button>';
      }).join('');

      el.innerHTML=''
        // Product header
        +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">'
        +'<span style="font-size:28px">'+p.img+'</span>'
        +'<div style="flex:1">'
        +'<div style="font-size:15px;font-weight:900;color:var(--text)">'+p.name+'</div>'
        +'<div style="display:flex;gap:6px;align-items:center;margin-top:3px;flex-wrap:wrap">'
        +'<span style="background:'+col+'20;color:'+col+';padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700">'+( p.tech||'laser')+'</span>'
        +'<span style="font-size:11px;color:var(--text-muted)">'+p.cat+'</span>'
        +'<span style="font-size:10px;color:#64748b">🔄 '+sidesLabel+'</span>'
        +(p.url?'<a href="'+p.url+'" target="_blank" style="font-size:10px;color:var(--primary);text-decoration:none;padding:2px 8px;background:var(--bg-card);border-radius:20px;border:1px solid var(--border)">🛒 '+p.sup+'</a>':'')
        +'</div></div></div>'

        // Quick qty row
        +'<div style="margin-bottom:14px">'
        +'<div style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:6px">Scelta rapida quantità:</div>'
        +'<div style="display:flex;gap:5px;flex-wrap:wrap">'+qtyBtns+'</div>'
        +'</div>'

        // Cost breakdown grid
        +'<div style="background:rgba(239,68,68,.05);border:1.5px solid rgba(239,68,68,.15);border-radius:12px;padding:14px;margin-bottom:12px">'
        +'<div style="font-size:11px;font-weight:800;color:#ef4444;margin-bottom:10px">🔒 Costi per pezzo (ADMIN)</div>'
        +'<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:10px">'
        +[
          {l:'Materiale',v:'€'+d.mc.toFixed(2),c:'#f59e0b',sub:d.sd>0?'-'+Math.round(d.sd*100)+'% sconto vol.':'prezzo intero'},
          {l:'Macchina',v:'€'+d.mhc.toFixed(2),c:'#6366f1',sub:d.m.label.slice(0,15)},
          {l:'Lavoro',v:'€'+d.lc.toFixed(2),c:'#ec4899',sub:'€'+this._cfgV32.labor+'/h'},
          {l:'Pack/Extra',v:'€'+(this._cfgV32.pack).toFixed(2),c:'#64748b',sub:'imball+extra'},
          {l:'COSTO/pz',v:'€'+d.cp.toFixed(2),c:'#ef4444',sub:'totale costo vivo'},
        ].map(function(k){
          return '<div style="background:var(--bg-card);border-radius:8px;padding:8px;text-align:center">'
            +'<div style="font-size:8px;color:'+k.c+';font-weight:700;text-transform:uppercase;margin-bottom:2px">'+k.l+'</div>'
            +'<div style="font-size:12px;font-weight:800;color:var(--text)">'+k.v+'</div>'
            +'<div style="font-size:8px;color:var(--text-dim);margin-top:1px">'+k.sub+'</div>'
            +'</div>';
        }).join('')
        +'</div>'
        // Time info
        +'<div style="display:flex;gap:6px;font-size:11px;color:var(--text-muted)">'
        +'<span>⏱ '+tl+'/pz</span><span>·</span><span>Tot. '+d.qty+' pz: '+totTimeLabel+'</span>'
        +(d.sides==='both'?'<span style="color:#f59e0b">· ×2 (fronte+retro)</span>':'')
        +(d.sd>0?'<span style="color:#10b981">· -'+Math.round(d.sd*100)+'% mat (volume)</span>':'')
        +'</div></div>'

        // Price result
        +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">'
        +'<div style="background:var(--bg-card);border-radius:12px;padding:14px;text-align:center">'
        +'<div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Prezzo/pz</div>'
        +'<div style="font-size:22px;font-weight:900;color:var(--primary)">€'+d.fp.toFixed(2)+'</div>'
        +'<div style="font-size:9px;color:var(--text-dim)">×'+this._cfgV32.markup.toFixed(2)+' markup</div>'
        +'</div>'
        +'<div style="background:var(--bg-card);border-radius:12px;padding:14px;text-align:center">'
        +'<div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px">Totale '+d.qty+' pz</div>'
        +'<div style="font-size:22px;font-weight:900;color:var(--primary)">€'+d.total.toFixed(2)+'</div>'
        +'<div style="font-size:9px;color:var(--text-dim)">+IVA 22%: €'+(d.total*.22).toFixed(2)+'</div>'
        +'</div>'
        +'<div style="background:'+mgc+'15;border:1px solid '+mgc+'40;border-radius:12px;padding:14px;text-align:center">'
        +'<div style="font-size:9px;color:'+mgc+';font-weight:700;text-transform:uppercase;margin-bottom:4px">Margine</div>'
        +'<div style="font-size:22px;font-weight:900;color:'+mgc+'">'+d.mg+'%</div>'
        +'<div style="font-size:9px;color:var(--text-dim)">Sconto max: -'+d.md+'%</div>'
        +'</div>'
        +'</div>'

        // Margin alert
        +(d.mg<this._cfgV32.margin_threshold?'<div style="padding:9px 14px;background:rgba(239,68,68,.08);border:1.5px solid rgba(239,68,68,.3);border-radius:9px;font-size:12px;font-weight:700;color:#ef4444;margin-bottom:12px;display:flex;align-items:center;gap:8px">'
          +'⚠️ Margine '+d.mg+'% sotto soglia ('+this._cfgV32.margin_threshold+'%) — rischio perdita!'
          +'<button onclick="var t=prompt(\'Soglia minima margine (%):\',\''+this._cfgV32.margin_threshold+'\');if(t){LaserB2B._cfgV32.margin_threshold=parseInt(t)||30;LaserB2B._renderCalc32();}" style="margin-left:auto;padding:3px 8px;background:transparent;border:1px solid rgba(239,68,68,.4);border-radius:5px;cursor:pointer;font-size:10px;color:#ef4444">⚙️ Soglia</button>'
          +'</div>':'')

        // Pricing table for multiple qtys
        +'<div style="background:var(--bg-card);border-radius:12px;overflow:hidden;margin-bottom:12px">'
        +'<div style="padding:8px 12px;font-size:10px;font-weight:800;color:var(--text-muted);border-bottom:1px solid var(--border);text-transform:uppercase">📊 Tabella Prezzi per Quantità</div>'
        +'<table style="width:100%;border-collapse:collapse;font-size:11px">'
        +'<thead><tr style="background:var(--bg-card2)">'
        +'<th style="padding:7px 10px;text-align:left;color:var(--text-muted);font-size:9px">Qty</th>'
        +'<th style="padding:7px 10px;text-align:center;color:#10b981;font-size:9px">Sconto</th>'
        +'<th style="padding:7px 10px;text-align:right;color:var(--text-muted);font-size:9px">Costo/pz</th>'
        +'<th style="padding:7px 10px;text-align:right;color:var(--primary,#6366f1);font-size:9px">Prezzo/pz</th>'
        +'<th style="padding:7px 10px;text-align:center;font-size:9px">Margine</th>'
        +'<th style="padding:7px 10px;text-align:right;color:var(--text-muted);font-size:9px">Totale</th>'
        +'<th style="padding:7px 10px;text-align:right;color:#22c55e;font-size:9px">Profitto</th>'
        +'</tr></thead><tbody>'
        +(function(){
          var rows='';
          var qtyList=[1,5,10,20,50,100,200,500,1000];
          qtyList.forEach(function(q){
            var sd2=q>=500?0.20:q>=200?0.15:q>=100?0.10:q>=50?0.07:q>=20?0.04:q>=10?0.02:0;
            var mc2=(d.matCost||0)*(1-sd2);
            var tm2=((p.timeMin||1.5)*d.sidesMult+d.sidesSetup)*(q>=100?0.85:q>=50?0.92:q>=20?0.96:1.0);
            var cfg2=LaserB2B._cfgV32;
            var mhc2=(d.m.hourly+(d.m.energyH||0))/60*tm2;
            var lc2=cfg2.labor/60*tm2;
            var cp2=mc2+mhc2+lc2+cfg2.pack;
            var fp2=Math.max(15,cp2*cfg2.markup);
            var mg2=fp2>0?Math.round((fp2-cp2)/fp2*100):0;
            var mgc2=mg2>=60?'#22c55e':mg2>=40?'#f59e0b':'#ef4444';
            var isCur=q===d.qty;
            rows+='<tr style="border-bottom:1px solid var(--border);'+(isCur?'background:rgba(99,102,241,.06)':'')+'">'
              +'<td style="padding:6px 10px;font-weight:'+(isCur?'800':'600')+';color:'+(isCur?'var(--primary)':'var(--text)')+'">'+q+'</td>'
              +'<td style="padding:6px 10px;text-align:center;color:#10b981">'+(sd2>0?'-'+Math.round(sd2*100)+'%':'—')+'</td>'
              +'<td style="padding:6px 10px;text-align:right;color:var(--text-muted)">€'+cp2.toFixed(2)+'</td>'
              +'<td style="padding:6px 10px;text-align:right;font-weight:700;color:var(--primary,#6366f1)">€'+fp2.toFixed(2)+'</td>'
              +'<td style="padding:6px 10px;text-align:center"><span style="background:'+mgc2+'20;color:'+mgc2+';padding:1px 6px;border-radius:10px;font-weight:700">'+mg2+'%</span></td>'
              +'<td style="padding:6px 10px;text-align:right;font-weight:700">€'+(fp2*q).toFixed(0)+'</td>'
              +'<td style="padding:6px 10px;text-align:right;font-weight:700;color:#22c55e">€'+((fp2-cp2)*q).toFixed(0)+'</td>'
              +'</tr>';
          });
          return rows;
        })()
        +'</tbody></table></div>'

        // Override + note + actions
        +'<div style="background:rgba(251,191,36,.05);border:1px solid rgba(251,191,36,.2);border-radius:12px;padding:12px;margin-bottom:12px">'
        +'<div style="font-size:10px;font-weight:800;color:#fbbf24;margin-bottom:8px">⚡ Override Prezzo & Note</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
        +'<div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px"><label style="font-size:9px;color:var(--text-muted);text-transform:uppercase">Cliente</label>'
        +'<button onclick="var f=document.getElementById(\'lb2b-qnc-form\');f.style.display=f.style.display===\'none\'?\'block\':\'none\'" style="font-size:9px;padding:2px 6px;background:var(--primary-dim,#3b82f622);border:1px solid var(--primary-border,#3b82f640);border-radius:5px;color:var(--primary);cursor:pointer;font-weight:700">+ Nuovo</button></div>'
        +'<select id="lb2b-client32" onchange="LaserB2B._client=this.options[this.selectedIndex]?.text||this.value" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px"><option value="">-- Seleziona --</option></select>'
        +'<div id="lb2b-qnc-form" style="display:none;background:var(--bg-card2);border:1px solid var(--primary-border,#3b82f640);border-radius:8px;padding:10px;margin-top:5px">'
        +'<div style="font-size:10px;font-weight:700;color:var(--primary);margin-bottom:6px">➕ Nuovo Cliente Rapido</div>'
        +'<div style="display:grid;gap:5px;margin-bottom:7px"><input id="lb2b-qnc-name" class="form-control" placeholder="Nome *" style="font-size:11px"><input id="lb2b-qnc-phone" class="form-control" placeholder="Telefono" style="font-size:11px"><input id="lb2b-qnc-email" class="form-control" placeholder="Email" style="font-size:11px"></div>'
        +'<div style="display:flex;gap:5px"><button onclick="LaserB2B._saveNewClientLB2B()" style="flex:1;padding:6px;background:var(--primary);border:none;border-radius:6px;color:#000;font-weight:700;cursor:pointer;font-size:11px">💾 Salva</button>'
        +'<button onclick="document.getElementById(\'lb2b-qnc-form\').style.display=\'none\'" style="padding:6px 9px;background:var(--bg-card3,var(--bg-card));border:1px solid var(--border2,var(--border));border-radius:6px;color:var(--text-muted);cursor:pointer;font-size:11px">✕</button></div>'
        +'</div></div>'
        +'<div><label style="font-size:9px;color:var(--text-muted);text-transform:uppercase;display:block;margin-bottom:2px">Override €/pz (std: €'+d.fp.toFixed(2)+')</label>'
        +'<input id="lb2b-overrule32" type="number" step="0.01" placeholder="Lascia vuoto per prezzo calc." oninput="LaserB2B._overrule=parseFloat(this.value)||null;LaserB2B._renderCalc32()" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid '+(LaserB2B._overrule?'#fbbf24':'var(--border)')+';border-radius:8px;color:var(--text);font-size:12px"></div>'
        +'</div>'
        +'<textarea id="lb2b-note32" placeholder="Note interne (non compaiono nel PDF cliente)..." rows="2" oninput="LaserB2B._overNote=this.value" style="width:100%;padding:8px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;resize:vertical;height:50px">'+(LaserB2B._overNote||'')+'</textarea></div>'

        // Action buttons
        +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
        +'<button onclick="LaserB2B.saveQuote&&LaserB2B.saveQuote()" style="flex:1;padding:10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">💾 Salva Preventivo</button>'
        +'<button onclick="LaserB2B.generatePDF&&LaserB2B.generatePDF()" style="flex:1;padding:10px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:800">📄 PDF Cliente</button>'
        +'<button onclick="ScenarioCompare&&ScenarioCompare.open({lines:[],subtotal:'+d.total+',client:LaserB2B._client||\'Cliente\'})" style="padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:12px;color:var(--text-muted)">🔀 Confronta</button>'
        +'</div>'
        +'<div id="lb2b-save-out32" style="margin-top:8px"></div>';

      // Update global markup display too
      this._updateMarkupDisplay();
    };

    // ── Machine Manager v32 ────────────────────────────────────
    LaserB2B._openMachineManager32=function(){
      var machines=loadMachines();
      var w=window.open('','_blank','width=950,height=680,resizable=yes');
      if(!w){if(typeof toast!=='undefined') toast('Abilita popup','info');return;}
      w._machines=machines; w._SK=MACH_SK; w._defaults=DEFAULT_MACHINES;

      function _mgrLogic(){
        var machines=window._machines||{};
        var editKey=null;
        function save(){try{localStorage.setItem(window._SK,JSON.stringify(machines));}catch(e){}}
        function eid(id){return document.getElementById(id);}

        function renderRows(){
          var h=Object.entries(machines).map(function(kv){
            var k=kv[0]; var m=kv[1];
            return '<tr style="border-bottom:1px solid #1e293b">'
              +'<td style="padding:8px 10px;font-size:20px;text-align:center">'+( m.icon||'⚙️')+'</td>'
              +'<td style="padding:8px 12px"><div style="font-size:12px;font-weight:700;color:#f1f5f9">'+m.label+'</div>'
              +'<div style="font-size:10px;color:#64748b;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(m.desc||'')+'</div></td>'
              +'<td style="padding:8px 10px;color:#f59e0b;font-size:12px;font-weight:700">€'+(m.hourly||0).toFixed(2)+'/h<div style="font-size:9px;color:#64748b">+€'+(m.energyH||0).toFixed(2)+' energia</div></td>'
              +'<td style="padding:8px 10px;color:#64748b;font-size:11px">€'+(m.purchaseCost||0).toLocaleString('it')+'<div style="font-size:9px">'+(m.lifeYears||5)+' anni vita</div></td>'
              +'<td style="padding:8px 10px;font-size:11px;color:#94a3b8;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+(m.materials||'')+'">'+(m.materials||'').slice(0,40)+'</td>'
              +'<td style="padding:8px 10px;text-align:center">'
              +'<div style="display:flex;gap:4px;justify-content:center">'
              +'<button onclick="editMachine(\''+k+'\')" style="padding:4px 9px;background:#6366f120;color:#818cf8;border:1px solid #6366f140;border-radius:6px;cursor:pointer;font-size:11px">✏️</button>'
              +'<button onclick="delMachine(\''+k+'\')" style="padding:4px 9px;background:#ef444415;color:#ef4444;border:1px solid #ef444430;border-radius:6px;cursor:pointer;font-size:11px">🗑</button>'
              +'</div></td></tr>';
          }).join('');
          document.getElementById('tbody').innerHTML=h;
        }

        window.openAdd=function(){
          editKey=null; eid('mtitle').textContent='Nuova Macchina';
          ['icon','color','id','label','desc','hourly','energy','cost','life','watts','mats','tip','url'].forEach(function(f){var e=eid('f'+f);if(e)e.value='';});
          eid('modal').classList.add('on');
        };
        window.editMachine=function(k){
          editKey=k; var m=machines[k]; eid('mtitle').textContent='Modifica: '+m.label;
          eid('ficon').value=m.icon||'⚙️'; eid('fcolor').value=m.color||'#6366f1';
          eid('fid').value=k; eid('flabel').value=m.label||'';
          eid('fdesc').value=m.desc||''; eid('fhourly').value=m.hourly||0;
          eid('fenergy').value=m.energyH||m.energyHourly||0; eid('fcost').value=m.purchaseCost||0;
          eid('flife').value=m.lifeYears||5; eid('fwatts').value=m.watts||0;
          eid('fmats').value=m.materials||''; eid('ftip').value=m.tip||'';
          eid('furl').value=m.url||'';
          eid('modal').classList.add('on');
        };
        window.saveMachine=function(){
          var id=eid('fid').value.trim().replace(/\s+/g,'_')||('machine_'+Date.now());
          if(!eid('flabel').value){alert('Inserisci un nome!');return;}
          var m={
            icon:eid('ficon').value||'⚙️', color:eid('fcolor').value||'#6366f1',
            label:eid('flabel').value, desc:eid('fdesc').value||'',
            hourly:parseFloat(eid('fhourly').value)||0,
            energyH:parseFloat(eid('fenergy').value)||0,
            energyHourly:parseFloat(eid('fenergy').value)||0,
            purchaseCost:parseFloat(eid('fcost').value)||0,
            lifeYears:parseFloat(eid('flife').value)||5,
            watts:parseFloat(eid('fwatts').value)||0,
            materials:eid('fmats').value||'',
            tip:eid('ftip').value||'',
            url:eid('furl').value||'',
          };
          if(editKey&&editKey!==id) delete machines[editKey];
          machines[id]=m; save(); renderRows(); closeModal();
        };
        window.delMachine=function(k){
          if(!confirm('Eliminare '+machines[k].label+'?')) return;
          delete machines[k]; save(); renderRows();
        };
        window.resetDefault=function(){
          if(!confirm('Ripristinare le macchine predefinite?')) return;
          localStorage.removeItem(window._SK); window.close();
        };
        window.saveAndClose=function(){save();window.close();};
        window.closeModal=function(){eid('modal').classList.remove('on');};
        renderRows();
      }

      w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>⚙️ Gestione Macchinari</title>'
        +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;font-size:13px}'
        +'.hdr{display:flex;align-items:center;gap:12px;padding:14px 20px;background:#1e293b;border-bottom:1px solid #334155}'
        +'h1{font-size:16px;font-weight:900}'
        +'.wrap{padding:16px;overflow-y:auto;max-height:calc(100vh-58px)}'
        +'table{width:100%;border-collapse:collapse}'
        +'thead th{background:#1e293b;padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;position:sticky;top:0}'
        +'.modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:99;align-items:center;justify-content:center}'
        +'.modal.on{display:flex}'
        +'.mbox{background:#1e293b;border-radius:14px;padding:22px;width:560px;max-height:90vh;overflow-y:auto;border:1px solid #334155}'
        +'input,textarea{width:100%;padding:8px;background:#0f172a;border:1px solid #334155;border-radius:7px;color:#f1f5f9;font-size:12px;margin-bottom:8px}'
        +'label{font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase;display:block;margin-bottom:2px}'
        +'.btn{padding:8px 16px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700}'
        +'.bp{background:#6366f1;color:#fff}.br{background:#1e293b;color:#94a3b8;border:1px solid #334155}'
        +'</style></head><body>'
        +'<div class="hdr">'
        +'<span style="font-size:22px">🔧</span><h1>Gestione Macchinari Laser</h1>'
        +'<div style="margin-left:auto;display:flex;gap:8px">'
        +'<button class="btn" style="background:#10b981;color:#fff" onclick="openAdd()">+ Aggiungi</button>'
        +'<button class="btn br" onclick="resetDefault()">↺ Default</button>'
        +'<button class="btn bp" onclick="saveAndClose()">✅ Salva e Chiudi</button>'
        +'</div></div>'
        +'<div class="wrap"><table>'
        +'<thead><tr><th>Icon</th><th>Macchina / Descrizione</th><th>Costo Orario</th><th>Acquisto</th><th>Materiali</th><th>Azioni</th></tr></thead>'
        +'<tbody id="tbody"></tbody></table></div>'
        +'<div class="modal" id="modal"><div class="mbox">'
        +'<div style="font-size:14px;font-weight:900;margin-bottom:14px" id="mtitle">Nuova Macchina</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 10px">'
        +'<div><label>Icona (emoji)</label><input id="ficon" placeholder="⚡"></div>'
        +'<div><label>Colore (#hex)</label><input id="fcolor" placeholder="#fbbf24"></div>'
        +'<div><label>ID chiave (no spazi)</label><input id="fid" placeholder="xtool_f2"></div>'
        +'<div><label>Nome macchina</label><input id="flabel" placeholder="xTool F2 Diodo+IR"></div>'
        +'</div>'
        +'<label>Descrizione tecnica</label><input id="fdesc" placeholder="Diodo 15W + IR 5W · 6000mm/s · 115×115mm">'
        +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 8px">'
        +'<div><label>€/h macchina</label><input type="number" id="fhourly" step="0.001" placeholder="0.156"></div>'
        +'<div><label>€/h energia</label><input type="number" id="fenergy" step="0.001" placeholder="0.022"></div>'
        +'<div><label>Watt consumo</label><input type="number" id="fwatts" placeholder="80"></div>'
        +'</div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 8px">'
        +'<div><label>Prezzo acquisto €</label><input type="number" id="fcost" placeholder="1250"></div>'
        +'<div><label>Anni vita stimata</label><input type="number" id="flife" value="5"></div>'
        +'</div>'
        +'<label>Materiali compatibili</label>'
        +'<input id="fmats" placeholder="Legno, MDF, acciaio inox, alluminio anodizzato...">'
        +'<label>Tip / Suggerimento</label>'
        +'<input id="ftip" placeholder="Usala per...">'
        +'<label>URL acquisto</label>'
        +'<input type="url" id="furl" placeholder="https://www.xtool.com/...">'
        +'<div style="display:flex;gap:8px;margin-top:6px">'
        +'<button class="btn bp" onclick="saveMachine()">💾 Salva</button>'
        +'<button class="btn br" onclick="closeModal()">✕ Annulla</button>'
        +'</div></div></div>'
        +'</body></html>');
      w.document.close();
      var sc=w.document.createElement('script');
      sc.textContent='('+_mgrLogic.toString()+')()';
      w.document.head.appendChild(sc);

      var t=setInterval(function(){
        if(w.closed){
          clearInterval(t);
          var saved=localStorage.getItem(MACH_SK);
          if(saved){
            try{
              LaserB2B._MACHINES=Object.assign({},DEFAULT_MACHINES,JSON.parse(saved));
              if(typeof toast!=='undefined') toast('🔧 Macchinari aggiornati!','success');
              if(LaserB2B.render) LaserB2B.render();
            }catch(e){}
          }
        }
      },800);
    };

    // ── Save quote from v32 calc ──────────────────────────────
    LaserB2B.saveQuote=function(){
      var d=this._calcV32(); if(!d){if(typeof toast!=='undefined') toast('Seleziona un prodotto!','error');return;}
      var cl=document.getElementById('lb2b-client32')?.value||this._client||'';
      var note=document.getElementById('lb2b-note32')?.value||this._overNote||'';
      var fp=this._overrule>0?this._overrule:d.fp;
      var q={id:Date.now(),date:new Date().toISOString(),client:cl,
        product:d.p.name,productId:d.p.id,machine:d.m.label,
        qty:d.qty,sides:d.sides,channel:this._cfgV32.channel,
        costPz:+d.cp.toFixed(4),finalPz:+fp.toFixed(4),
        total:+(fp*d.qty).toFixed(2),marginPct:d.mg,
        isOverruled:!!this._overrule,note:note,status:'draft'};
      var qs=JSON.parse(localStorage.getItem(QUOTES_SK)||'[]');
      qs.unshift(q); localStorage.setItem(QUOTES_SK,JSON.stringify(qs.slice(0,100)));
      var out=document.getElementById('lb2b-save-out32');
      if(out){out.innerHTML='<div style="padding:7px 12px;background:#10b98120;border-radius:8px;font-size:11px;color:#10b981;margin-top:6px">✅ #'+q.id.toString().slice(-4)+' · '+cl+' · €'+q.total+' · '+d.mg+'%</div>';}
      if(typeof toast!=='undefined') toast('💾 Preventivo salvato — €'+q.total,'success');
      CommHistory&&CommHistory.add(cl,'quote','€'+q.total+' · '+d.p.name+' · '+d.qty+' pz',q.total);
    };

    // Trigger initial render
    var el=document.getElementById('view-laser_b2b');
    if(el&&el.classList.contains('active')) this.render();

    console.log('[LaserB2B v32] Pro upgrade: '+Object.keys(LaserB2B._MACHINES).length+' macchine caricate');
  }
  setTimeout(_init,500);
})();


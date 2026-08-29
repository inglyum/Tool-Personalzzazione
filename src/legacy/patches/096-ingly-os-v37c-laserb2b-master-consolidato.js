
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v37c — LaserB2B Master Consolidato
// Sostituisce v23 + v30 + v32 + v33 + patch vari in UN modulo pulito
// Blocchi precedenti rimangono nel DOM ma tutti i flag vengono settati
// ═══════════════════════════════════════════════════════════════════
;(function _laserB2BMaster(){
  function _run(){
    if(typeof LaserB2B==='undefined'){ setTimeout(_run,400); return; }
    if(LaserB2B._lb2b_master) return;

    // ── Neutralizza tutti i vecchi patch flag ──────────────────────
    ['_v32pro','_v33catalog','_v37bhist','_v37bextras','_v37sync','_v37bcHistInjected',
     '_v37bextras','_v36gd'].forEach(function(f){ LaserB2B[f]=true; });
    LaserB2B._lb2b_master = true;

    var MACH_SK   = 'lb2b_machines_v32';
    var CAT_SK    = 'lb2b_catalog_v33';
    var QUOTES_SK = 'lb2b_quotes_v1';
    var CFG_SK    = 'lb2b_cfg_v32';

    // ── DEFAULT MACHINES (tutte e 6) ──────────────────────────────
    var DEFAULT_MACHINES = {
      xtool_f2: {
        label:'xTool F2 Diodo+IR', icon:'⚡', color:'#fbbf24',
        desc:'Diodo 15W + IR 5W · 6000mm/s · Auto-focus',
        purchaseCost:1290, lifeYears:5, watts:80,
        hourly:0.156, energyH:0.022, timePerMm2:0.0015
      },
      xtool_p3_20w: {
        label:'xTool P3 20W Diodo', icon:'🔷', color:'#06b6d4',
        desc:'Diodo 20W · 400×400mm · taglio veloce',
        purchaseCost:800, lifeYears:5, watts:65,
        hourly:0.10, energyH:0.018, timePerMm2:0.0012
      },
      xtool_p3_co2_80w: {
        label:'xTool P3 CO2 80W', icon:'🔵', color:'#3b82f6',
        desc:'CO2 80W · 500×300mm · professionale',
        purchaseCost:3200, lifeYears:8, watts:160,
        hourly:0.222, energyH:0.044, timePerMm2:0.0008
      },
      xtool_p2_co2_55w: {
        label:'xTool P2 CO2 55W', icon:'🔵', color:'#2563eb',
        desc:'CO2 55W · 600×400mm · semi-pro',
        purchaseCost:2500, lifeYears:8, watts:120,
        hourly:0.195, energyH:0.034, timePerMm2:0.0010
      },
      epson_et2865: {
        label:'Epson EcoTank ET-2865', icon:'🖨️', color:'#10b981',
        desc:'Sublimazione A4 · EcoTank',
        purchaseCost:180, lifeYears:5, watts:15,
        hourly:0.0225, energyH:0.004, timePerMm2:0.0002
      },
      pressa_termica: {
        label:'Pressa Termica 40×50cm', icon:'🔥', color:'#f97316',
        desc:'Pressa DTF/Sub · 40×50cm · 200°C',
        purchaseCost:250, lifeYears:8, watts:1500,
        hourly:0.0195, energyH:0.042, timePerMm2:0.0001
      }
    };

    // ── CARICA MACCHINE (custom o default) ────────────────────────
    function loadMachines(){
      try{
        var saved=JSON.parse(localStorage.getItem(MACH_SK)||'null');
        if(saved&&Object.keys(saved).length) return saved;
      }catch(e){}
      return DEFAULT_MACHINES;
    }
    function saveMachines(d){ try{localStorage.setItem(MACH_SK,JSON.stringify(d));}catch(e){} }

    // ── CARICA CATALOGO ────────────────────────────────────────────
    function loadCatalog(){
      try{
        var saved=JSON.parse(localStorage.getItem(CAT_SK)||'null');
        if(saved&&saved.length>10) return saved;
      }catch(e){}
      return LaserB2B._PRODUCTS||[];
    }

    // ── CONFIG ──────────────────────────────────────────────────────
    function loadCfg(){try{return JSON.parse(localStorage.getItem(CFG_SK)||'{}');}catch(e){return{};}}
    function saveCfg(d){try{localStorage.setItem(CFG_SK,JSON.stringify(d));}catch(e){}}

    var machines = loadMachines();
    var products = loadCatalog();
    var cfg = Object.assign({
      sides:'front', markup:2.0, labor:18, pack:0.30,
      channel:'b2b', machine:'xtool_f2', margin_threshold:30, express:false
    }, loadCfg());

    // Apply to LaserB2B global
    LaserB2B._MACHINES = machines;
    LaserB2B._PRODUCTS = products;
    LaserB2B._cfgV32   = cfg;
    LaserB2B._markup   = {b2b:2,etsy:3.5,retail:3};

    function saveState(){
      saveCfg({
        sides:cfg.sides, markup:cfg.markup, labor:cfg.labor, pack:cfg.pack,
        channel:cfg.channel, machine:cfg.machine, margin_threshold:cfg.margin_threshold,
        express:cfg.express
      });
    }

    // ── CALCOLO PRINCIPALE ─────────────────────────────────────────
    /* Politiche di prezzo, non formule: erano scritte nel codice e ora hanno un
       nome e un posto. `cfg` può sovrascriverle — è ciò che le rende
       configurabili invece che sepolte. */
    var POLITICHE = {
      prezzoMinimo:      15,    // € — sotto questa cifra un lavoro non si apre
      maggiorazioneExpress: 25, // % — urgenza sotto le 48 ore
      quotaRivenditore:  65,    // % del prezzo di listino riconosciuta al rivenditore
      marginePavimento:  15,    // % — nessuno sconto può scendere sotto
    };

    /* Il conto passa da `InglyCostEngine`. Restano qui i driver che sono
       davvero del laser B2B — lo sconto sul materiale a volume, il tempo
       macchina che cala con il lotto, il doppio lato — perché sono conoscenza
       di mestiere, non matematica di prezzo.
       Quello che se ne va è la matematica: ricarico, margine, profitto e
       pavimento adesso sono definiti in un posto solo per tutto INGLY OS. */
    LaserB2B._calcV32 = function(){
      var p = this._selProduct; if(!p) return null;
      var m = machines[cfg.machine]; if(!m) return null;
      var motore = (typeof window!=='undefined') && window.InglyCostEngine;
      var qty = this._selQty||1;
      var sidesMult = cfg.sides==='both'?2.0:1.0;
      var sidesSetup = cfg.sides==='both'?0.5:0;
      /* Comprare di più costa meno al pezzo: è uno sconto sul **costo**, non
         sul prezzo, e per questo può convivere con il pavimento di margine. */
      var sd = qty>=50?.20:qty>=25?.15:qty>=10?.10:0;
      var mc = (p.costSup||p.cost||0)*(1-sd);
      var tm = ((p.timeMin||1.5)*sidesMult+sidesSetup)*(qty>=100?.85:qty>=50?.92:qty>=20?.96:1);
      var mhc = (m.hourly+(m.energyH||0))/60*tm;
      var lc  = cfg.labor/60*tm;

      var pol = Object.assign({}, POLITICHE, cfg.politiche||{});
      var expressMult = cfg.express ? 1 + pol.maggiorazioneExpress/100 : 1;

      if(!motore){
        /* Nessun prezzo indovinato: si dichiara che il motore manca. */
        return { p,m,qty,sides:cfg.sides,sidesMult,sidesSetup,sd,mc,tm,mhc,lc,express:cfg.express,
                 cp:0,fp:0,profit:0,mg:0,md:0,total:0,costTotal:0,profitTotal:0,
                 matCost:p.costSup||p.cost||0, indisponibile:true };
      }

      var c = motore.calcola({
        tecnologia:'generico',
        qty:qty,
        costiPerPezzo:[
          {id:'materiale', label:'Materiale', value:mc, detail:(sd?Math.round(sd*100)+'% di sconto a volume':'prezzo pieno')},
          {id:'macchina',  label:'Macchina ed energia', value:mhc, detail:tm.toFixed(2)+' min'},
          {id:'manodopera',label:'Manodopera', value:lc, detail:tm.toFixed(2)+' min', perdibile:false},
          {id:'packaging', label:'Confezione', value:cfg.pack, perdibile:false},
        ],
        failureRate: cfg.failureRate || 0,
      });
      var cp = c.costoPezzo;

      var pr = motore.prezzo(cp, {
        strategia:'ricarico',
        ricarico: cfg.markup * expressMult,
        marginePavimentoPct: pol.marginePavimento,
        ivaPct: 0,
      });
      /* Il prezzo minimo del lavoro resta l'ultima parola: è una politica
         commerciale, non un margine. */
      var fp = Math.max(pol.prezzoMinimo, pr.netto);
      var profit = fp - cp;
      var mg = fp>0 ? Math.round(profit/fp*100) : 0;
      /* Margine del rivenditore: quanto resta a chi rivende alla propria quota. */
      var md = Math.max(0, Math.round((1 - cp/((pol.quotaRivenditore/100)*(fp||1)))*100));

      return { p,m,qty,sides:cfg.sides,sidesMult,sidesSetup,sd,mc,tm,mhc,lc,express:cfg.express,
               cp,fp,profit,mg,md,total:fp*qty,costTotal:cp*qty,profitTotal:profit*qty,
               matCost:p.costSup||p.cost||0,
               /* Nuovi, additivi: nessuna schermata esistente li perde. */
               markupPct:pr.ricaricoPct, marginePct:pr.marginePct,
               pavimentoScattato:pr.pavimentoScattato, politiche:pol,
               scaglioni:motore.scaglioni({tecnologia:'generico',costiPerPezzo:c.perPezzo.voci.map(function(v){return {id:v.id,value:v.value,perdibile:v.perdibile};})},
                 [1,10,25,50,100,250,500], {strategia:'ricarico',ricarico:cfg.markup*expressMult,marginePavimentoPct:pol.marginePavimento,ivaPct:0}) };
    };

    // ── RENDER PRINCIPALE ──────────────────────────────────────────
    LaserB2B.render = function(){
      var el=document.getElementById('view-laser_b2b'); if(!el) return;
      var cats=[...new Set(products.map(function(p){return p.cat;}))];
      var machOpts=Object.entries(machines).map(function(kv){
        return '<option value="'+kv[0]+'"'+(kv[0]===cfg.machine?' selected':'')+'>'+kv[1].icon+' '+kv[1].label+'</option>';
      }).join('');

      el.innerHTML='<div style="padding:14px 18px;max-width:1300px;margin:0 auto">'
        // ── HEADER ──────────────────────────────────────────────────
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">'
        +'<div><div style="font-size:20px;font-weight:900;color:var(--text)">💼 Laser Quoter B2B</div>'
        +'<div style="font-size:11px;color:var(--text-muted)" id="lb2b-subtitle">'+products.length+' prodotti · v37c Consolidato</div></div>'
        +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
        +'<button onclick="LaserB2B._openMachineManager32()" style="padding:7px 12px;background:var(--bg-card2);color:#f59e0b;border:1.5px solid rgba(245,158,11,.3);border-radius:9px;cursor:pointer;font-size:11px;font-weight:700">⚙️ Macchine</button>'
        +'<button onclick="LaserTemplates&&LaserTemplates.openManager()" style="padding:7px 12px;background:var(--bg-card2);color:#818cf8;border:1.5px solid rgba(99,102,241,.3);border-radius:9px;cursor:pointer;font-size:11px;font-weight:700">📋 Template</button>'
        +'<button onclick="LaserCalcHistory&&LaserCalcHistory.show()" style="padding:7px 12px;background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:11px">⏱ Storico</button>'
        +'<button onclick="LaserB2B.openQuoteHistory&&LaserB2B.openQuoteHistory()" style="padding:7px 12px;background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:11px">📋 Preventivi</button>'
        +'</div></div>'
        // ── CONFIG GRID ─────────────────────────────────────────────
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:12px">'
        +'<div style="font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;margin-bottom:12px;letter-spacing:.5px">⚙️ Configurazione Lavoro</div>'
        +'<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:10px;align-items:end">'
        // Machine
        +'<div style="grid-column:span 2"><label style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">⚙️ Macchina</label>'
        +'<div style="display:flex;gap:5px"><select id="lb2b-machine" onchange="LaserB2B._onCfgChange(\'machine\',this.value)" style="flex:1;padding:9px;background:var(--bg-card);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">'+machOpts+'</select>'
        +'<button onclick="LaserB2B._openMachineManager32()" style="padding:9px 10px;background:rgba(245,158,11,.1);color:#f59e0b;border:1px solid rgba(245,158,11,.25);border-radius:8px;cursor:pointer;font-size:12px">⚙️</button></div></div>'
        // Sides
        +'<div style="grid-column:span 2"><label style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">🔄 Lati incisione</label>'
        +'<div style="display:flex;gap:4px">'
        +[{k:'front',l:'Solo Fronte',i:'⬜'},{k:'back',l:'Solo Retro',i:'🔄'},{k:'both',l:'F+Retro',i:'⬛'}].map(function(s){
          var a=cfg.sides===s.k;
          return '<button onclick="LaserB2B._setSides(\''+s.k+'\')" id="lb2b-side-'+s.k+'" style="flex:1;padding:8px 4px;border-radius:8px;cursor:pointer;font-size:10px;font-weight:700;border:1.5px solid '+(a?'var(--primary)':'var(--border)')+';background:'+(a?'rgba(99,102,241,.15)':'var(--bg-card)')+';color:'+(a?'var(--primary)':'var(--text-muted)')+';text-align:center">'+s.i+'<div style="margin-top:1px">'+s.l+'</div></button>';
        }).join('')+'</div></div>'
        // Qty
        +'<div><label style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">📦 Quantità</label>'
        +'<input id="lb2b-qty-input" type="number" min="1" value="'+(this._selQty||1)+'" oninput="LaserB2B._onQtyInput(this.value)" style="width:100%;padding:9px;background:var(--bg-card);border:1.5px solid var(--primary,#6366f1);border-radius:9px;color:var(--primary,#6366f1);font-size:16px;font-weight:900;text-align:center"></div>'
        // Labor
        +'<div><label style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">👷 €/h lavoro</label>'
        +'<input id="lb2b-labor" type="number" value="'+cfg.labor+'" min="5" step="0.5" oninput="LaserB2B._onCfgChange(\'labor\',parseFloat(this.value)||18)" style="width:100%;padding:9px;background:var(--bg-card);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;text-align:center"></div>'
        // Pack
        +'<div><label style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">📦 Pack €/pz</label>'
        +'<input id="lb2b-pack" type="number" value="'+cfg.pack+'" min="0" step="0.05" oninput="LaserB2B._onCfgChange(\'pack\',parseFloat(this.value)||0)" style="width:100%;padding:9px;background:var(--bg-card);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;text-align:center"></div>'
        +'</div>'
        // Express surcharge toggle (urgenza <48h = +25%, SALES_PLAYBOOK.md)
        +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding:9px 12px;background:'+(cfg.express?'rgba(249,115,22,.12)':'var(--bg-card)')+';border:1.5px solid '+(cfg.express?'#f97316':'var(--border)')+';border-radius:10px">'
        +'<div style="display:flex;align-items:center;gap:8px"><span style="font-size:15px">⚡</span>'
        +'<div><div style="font-size:12px;font-weight:800;color:'+(cfg.express?'#f97316':'var(--text)')+'">Servizio Express (&lt;48h)</div>'
        +'<div style="font-size:10px;color:var(--text-muted)">Maggiorazione +25% sul prezzo — proposto come servizio, non penale</div></div></div>'
        +'<button onclick="LaserB2B._onCfgChange(\'express\',!'+(!!cfg.express)+')" style="padding:7px 16px;border-radius:20px;cursor:pointer;font-size:11px;font-weight:800;border:1.5px solid '+(cfg.express?'#f97316':'var(--border)')+';background:'+(cfg.express?'#f97316':'var(--bg-card2)')+';color:'+(cfg.express?'#fff':'var(--text-muted)')+'">'+(cfg.express?'✓ ATTIVO':'OFF')+'</button>'
        +'</div>'
        // Markup row
        +'<div style="display:grid;grid-template-columns:1fr 3fr 1fr;gap:10px;margin-top:12px;align-items:center">'
        +'<div><label style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px">🎯 Canale</label>'
        +'<select id="lb2b-channel" onchange="LaserB2B._onChannelChange(this.value)" style="width:100%;padding:9px;background:var(--bg-card);border:1.5px solid var(--border);border-radius:9px;color:var(--text);font-size:12px">'
        +'<option value="b2b"'+(cfg.channel==='b2b'?' selected':'')+'>B2B Aziende</option>'
        +'<option value="etsy"'+(cfg.channel==='etsy'?' selected':'')+'>Etsy / Online</option>'
        +'<option value="retail"'+(cfg.channel==='retail'?' selected':'')+'>Retail</option>'
        +'<option value="custom"'+(cfg.channel==='custom'?' selected':'')+'>Custom</option>'
        +'</select></div>'
        +'<div><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'
        +'<label style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase">💰 Markup / Moltiplicatore</label>'
        +'<div id="lb2b-markup-display" style="font-size:14px;font-weight:900;color:var(--primary)">×'+cfg.markup.toFixed(2)+'</div></div>'
        +'<div style="display:flex;align-items:center;gap:8px">'
        +'<span style="font-size:11px;color:var(--text-muted)">×1.0</span>'
        +'<input type="range" id="lb2b-markup-slider" min="1.0" max="8.0" step="0.05" value="'+cfg.markup+'" oninput="LaserB2B._onMarkupChange(parseFloat(this.value))" style="flex:1;accent-color:var(--primary,#6366f1);cursor:pointer">'
        +'<span style="font-size:11px;color:var(--text-muted)">×8.0</span>'
        +'<input type="number" id="lb2b-markup-input" min="1.0" max="20" step="0.1" value="'+cfg.markup.toFixed(2)+'" oninput="LaserB2B._onMarkupChange(parseFloat(this.value))" style="width:65px;padding:7px;background:var(--bg-card);border:1.5px solid var(--primary,#6366f1);border-radius:8px;color:var(--primary,#6366f1);font-size:13px;font-weight:800;text-align:center"></div>'
        +'<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim);margin-top:2px"><span>Costo×</span><span style="color:#f59e0b">Min(~1.5)</span><span style="color:#10b981">B2B(~2)</span><span style="color:#22c55e">Retail(~3)</span><span style="color:#f97316">Etsy(~3.5)</span><span>Max</span></div></div>'
        +'<div id="lb2b-margin-badge" style="background:var(--bg-card);border-radius:10px;padding:12px;text-align:center">'
        +'<div style="font-size:9px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:3px">Margine est.</div>'
        +'<div id="lb2b-margin-pct" style="font-size:22px;font-weight:900">—</div></div></div></div>'
        // ── MAIN GRID ──────────────────────────────────────────────
        +'<div style="display:grid;grid-template-columns:280px 1fr;gap:12px">'
        // ── SIDEBAR PRODOTTI ─────────────────────────────────────
        +'<div style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;overflow:hidden">'
        +'<div style="padding:10px 12px;border-bottom:1px solid var(--border)">'
        +'<input oninput="LaserB2B._filterProds32(this.value)" id="lb2b-search32" placeholder="🔍 Cerca prodotto..." style="width:100%;padding:7px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px">'
        +'<div style="display:flex;gap:4px;margin-top:6px;flex-wrap:wrap">'
        +['','laser','sublimazione','dtf'].map(function(t){
          var lbl={'':'Tutti','laser':'⚡','sublimazione':'🌈','dtf':'🎨'}[t]||t;
          return '<button onclick="LaserB2B._filterByTech32(\''+t+'\')" data-tf="'+t+'" style="padding:3px 8px;border-radius:20px;cursor:pointer;font-size:9px;font-weight:700;border:1px solid var(--border);background:var(--bg-card);color:var(--text-muted)">'+lbl+'</button>';
        }).join('')+'</div></div>'
        +'<div id="lb2b-prod-list32" style="overflow-y:auto;max-height:calc(100vh - 360px)"></div></div>'
        // ── CALC PANEL ──────────────────────────────────────────
        +'<div id="lb2b-calc32" style="background:var(--bg-card2);border:1px solid var(--border);border-radius:14px;padding:18px">'
        +'<div style="text-align:center;padding:60px 0;color:var(--text-dim)">'
        +'<div style="font-size:40px;margin-bottom:12px">💼</div>'
        +'<div style="font-size:14px;font-weight:800;margin-bottom:6px">Seleziona un prodotto</div>'
        +'<div style="font-size:11px">Clicca qualsiasi prodotto a sinistra per calcolare costi e prezzi in tempo reale</div>'
        +'</div></div>'
        +'</div></div>';

      this._renderProdList32(products,'');
      this._updateMarkupDisplay();
    };

    // ── EVENT HANDLERS ─────────────────────────────────────────────
    LaserB2B._onCfgChange = function(key,val){
      cfg[key]=val; saveState();
      if(key==='express'){ this.render(); return; } // re-render per aggiornare il toggle visivo
      this._renderCalc32();
      if(key==='machine'){ var m=LaserB2B._MACHINES&&LaserB2B._MACHINES[val]; if(m&&typeof Bus!=='undefined') Bus.emit('machine:selected',{key:val,mach:m}); }
    };
    LaserB2B._onQtyInput = function(val){
      var v=parseInt(val)||1; if(v<1) v=1;
      this._selQty=v;
      clearTimeout(this._qtyTimer32);
      this._qtyTimer32=setTimeout(function(){LaserB2B._renderCalc32();},200);
    };
    LaserB2B._setSides = function(sides){
      cfg.sides=sides; saveState();
      ['front','back','both'].forEach(function(s){
        var btn=document.getElementById('lb2b-side-'+s); if(!btn) return;
        var a=s===sides;
        btn.style.borderColor=a?'var(--primary)':'var(--border)';
        btn.style.background=a?'rgba(99,102,241,.15)':'var(--bg-card)';
        btn.style.color=a?'var(--primary)':'var(--text-muted)';
      });
      this._renderCalc32();
    };
    LaserB2B._onChannelChange = function(ch){
      cfg.channel=ch;
      var presets={b2b:2.0,etsy:3.5,retail:3.0,custom:cfg.markup};
      if(ch!=='custom') this._onMarkupChange(presets[ch]||2.0);
      else { saveState(); this._renderCalc32(); }
    };
    LaserB2B._onMarkupChange = function(val){
      val=Math.max(1.0,Math.min(20,parseFloat(val)||1));
      cfg.markup=val;
      var slider=document.getElementById('lb2b-markup-slider');
      var inp=document.getElementById('lb2b-markup-input');
      var disp=document.getElementById('lb2b-markup-display');
      if(slider) slider.value=Math.min(8,val);
      if(inp) inp.value=val.toFixed(2);
      if(disp) disp.textContent='×'+val.toFixed(2);
      this._updateMarkupDisplay();
      clearTimeout(this._markupTimer);
      this._markupTimer=setTimeout(function(){LaserB2B._renderCalc32();saveState();},150);
    };
    LaserB2B._updateMarkupDisplay = function(){
      var mu=cfg.markup;
      var mg=Math.round((1-1/mu)*100);
      var mgc=mg>=60?'#22c55e':mg>=40?'#f59e0b':'#ef4444';
      var el=document.getElementById('lb2b-margin-pct');
      if(el){el.textContent=mg+'%'; el.style.color=mgc;}
    };

    // ── PRODUCT LIST ───────────────────────────────────────────────
    LaserB2B._renderProdList32 = function(prods, techFilter){
      var inner=document.getElementById('lb2b-prod-list32'); if(!inner) return;
      var cats=[...new Set(prods.map(function(p){return p.cat;}))];
      var filtered=techFilter?prods.filter(function(p){return p.tech===techFilter;}):prods;
      var TC={laser:'#fbbf24',sublimazione:'#10b981',dtf:'#ec4899','laser+sub':'#8b5cf6'};
      var html='';
      cats.forEach(function(cat){
        var items=filtered.filter(function(p){return p.cat===cat;});
        if(!items.length) return;
        html+='<div style="padding:5px 10px;font-size:9px;font-weight:800;color:var(--text-muted);text-transform:uppercase;background:rgba(255,255,255,.03);border-bottom:1px solid var(--border);position:sticky;top:0;display:flex;justify-content:space-between"><span>'+cat+'</span><span style="font-size:8px">'+items.length+'</span></div>';
        items.forEach(function(p){
          var col=TC[p.tech||'laser']||'#6366f1';
          var nsup=(p.suppliers||p.fornitori||[]).length;
          var bestP=p.costSup||p.cost||0;
          html+='<button id="lb2b-btn-'+p.id+'" onclick="LaserB2B._selectProd32(\''+p.id+'\')" style="display:flex;align-items:center;gap:8px;width:100%;padding:7px 10px;background:transparent;border:0;border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;text-align:left;transition:.12s" onmouseover="if(!this.classList.contains(\'sel\'))this.style.background=\'var(--bg-card)\'" onmouseout="if(!this.classList.contains(\'sel\'))this.style.background=\'transparent\'">'
            +'<span style="font-size:16px">'+p.img+'</span>'
            +'<div style="flex:1;min-width:0">'
            +'<div style="font-size:11px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+p.name+'</div>'
            +'<div style="font-size:9px;display:flex;gap:5px;align-items:center;margin-top:1px">'
            +'<span style="background:'+col+'20;color:'+col+';padding:0 4px;border-radius:8px">'+( p.tech||'laser')+'</span>'
            +'<span style="color:#10b981;font-weight:700">€'+bestP.toFixed(2)+'</span>'
            +(nsup>1?'<span style="color:var(--text-dim)">'+nsup+' fornitori</span>':'')
            +'</div></div>'
            +'</button>';
        });
      });
      inner.innerHTML=html||'<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:12px">Nessun prodotto</div>';
    };

    LaserB2B._filterProds32 = function(q){
      var tech=this._techFilter32||'';
      var filtered=(products||[]).filter(function(p){
        return (!q||p.name.toLowerCase().includes(q.toLowerCase())||p.cat.toLowerCase().includes(q.toLowerCase()))&&(!tech||p.tech===tech);
      });
      this._renderProdList32(filtered,tech);
    };
    LaserB2B._filterByTech32 = function(tech){
      this._techFilter32=tech;
      document.querySelectorAll('[data-tf]').forEach(function(b){
        var a=b.getAttribute('data-tf')===tech;
        b.style.background=a?'var(--primary)':'var(--bg-card)';
        b.style.color=a?'#fff':'var(--text-muted)';
      });
      this._filterProds32(document.getElementById('lb2b-search32')?.value||'');
    };

    LaserB2B._selectProd32 = function(id){
      this._selProduct=(products||[]).find(function(p){return p.id===id;});
      if(!this._selProduct) return;
      document.querySelectorAll('[id^="lb2b-btn-"]').forEach(function(b){
        b.classList.remove('sel'); b.style.background='transparent'; b.style.borderLeft='none';
      });
      var btn=document.getElementById('lb2b-btn-'+id);
      if(btn){btn.classList.add('sel');btn.style.background='rgba(99,102,241,.1)';btn.style.borderLeft='3px solid var(--primary)';}
      this._renderCalc32();
      // Inject supplier panel after render
      setTimeout(function(){
        var SUPS_GLOBAL = typeof SUPS!=='undefined'?SUPS:(typeof LaserB2B._SUPPLIERS!=='undefined'?LaserB2B._SUPPLIERS:{});
        var prod=LaserB2B._selProduct;
        if(!prod) return;
        var supArr=prod.suppliers||prod.fornitori||[];
        if(!supArr.length) return;
        var calcEl=document.getElementById('lb2b-calc32'); if(!calcEl) return;
        var old=document.getElementById('lb2b-sup-panel'); if(old) old.remove();
        var panel=document.createElement('div'); panel.id='lb2b-sup-panel';
        panel.style.cssText='background:rgba(16,185,129,.04);border:1.5px solid rgba(16,185,129,.2);border-radius:12px;padding:12px;margin-bottom:10px';
        var bestP=supArr.reduce(function(a,b){return (b.p||b.price||99)<(a.p||a.price||99)?b:a;},supArr[0]);
        var rows=supArr.map(function(s){
          var sKey=s.s||s.id||'';
          var sName=(SUPS_GLOBAL[sKey]&&SUPS_GLOBAL[sKey].name)||sKey||'Fornitore';
          var sUrl=(SUPS_GLOBAL[sKey]&&SUPS_GLOBAL[sKey].url)||s.url||'#';
          var sp=s.p||s.price||0;
          var isBest=sp===(bestP.p||bestP.price||0);
          return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05)">'
            +'<div style="width:6px;height:6px;border-radius:50%;background:'+(isBest?'#22c55e':'#334155')+'"></div>'
            +'<a href="'+sUrl+'" target="_blank" style="font-size:11px;font-weight:'+(isBest?'800':'600')+';color:'+(isBest?'#22c55e':'var(--text)')+';text-decoration:none;flex:1">'+sName+'</a>'
            +(s.min||s.minQty?'<span style="font-size:9px;color:#64748b">min '+(s.min||s.minQty)+'pz</span>':'')
            +'<span style="font-size:13px;font-weight:900;color:'+(isBest?'#22c55e':'var(--text-muted)')+'">€'+sp.toFixed(2)+'</span>'
            +(isBest?'<span style="font-size:9px;background:#22c55e20;color:#22c55e;padding:1px 6px;border-radius:10px;font-weight:700">BEST</span>':'')
            +'</div>';
        }).join('');
        panel.innerHTML='<div style="font-size:10px;font-weight:800;color:#10b981;margin-bottom:8px">🏪 Confronto Fornitori ('+supArr.length+')</div>'+rows;
        var costBox=calcEl.querySelector('[style*="Costi per pezzo"]');
        var target=costBox?costBox.parentElement:calcEl;
        target.insertBefore(panel, target.firstChild.nextSibling||target.firstChild);
      },150);
    };

    // ── SAVE QUOTE ─────────────────────────────────────────────────
    LaserB2B.saveQuote = function(){
      var d=this._calcV32(); if(!d){if(typeof toast!=='undefined')toast('Seleziona un prodotto!','error');return;}
      var cl=document.getElementById('lb2b-client32')?.value||this._client||'';
      var note=document.getElementById('lb2b-note32')?.value||this._overNote||'';
      var fp=this._overrule>0?this._overrule:d.fp;
      var q={id:Date.now(),date:new Date().toISOString(),client:cl,
        product:d.p.name,productId:d.p.id,machine:d.m.label,
        qty:d.qty,sides:d.sides,channel:cfg.channel,
        costPz:+d.cp.toFixed(4),finalPz:+fp.toFixed(4),
        total:+(fp*d.qty).toFixed(2),marginPct:d.mg,
        isOverruled:!!this._overrule,note:note,status:'draft'};
      var qs=JSON.parse(localStorage.getItem(QUOTES_SK)||'[]');
      qs.unshift(q); localStorage.setItem(QUOTES_SK,JSON.stringify(qs.slice(0,100)));
      if(typeof LaserCalcHistory!=='undefined') LaserCalcHistory.add(Object.assign({},d,{markup:cfg.markup}));
      var out=document.getElementById('lb2b-save-out32');
      if(out) out.innerHTML='<div style="padding:7px 12px;background:#10b98120;border-radius:8px;font-size:11px;color:#10b981;margin-top:6px">✅ Salvato · '+cl+' · €'+q.total+' · '+d.mg+'%</div>';
      if(typeof toast!=='undefined') toast('💾 Preventivo salvato — €'+q.total,'success');
      if(typeof CommHistory!=='undefined') CommHistory.add(cl,'quote','€'+q.total+' · '+d.p.name+' · '+d.qty+'pz',q.total);
      if(typeof window._inglyLastSave==='function') window._inglyLastSave('Preventivo salvato');
    };

    // ── MACHINE MANAGER V32 (carried over) ────────────────────────
    // Reuse the existing _openMachineManager32 if already defined, else keep it
    if(!LaserB2B._openMachineManager32){
      LaserB2B._openMachineManager32 = function(){
        if(typeof toast!=='undefined') toast('Machine Manager: ricarica la pagina se non si apre','info');
      };
    }

    // ── SYNC CON MAGAZZINO ─────────────────────────────────────────
    if(typeof MagazzinoSync!=='undefined') MagazzinoSync.syncToLaserB2B();

    // ── TRIGGER RENDER SE VIEW ATTIVA ─────────────────────────────
    var el=document.getElementById('view-laser_b2b');
    if(el&&el.classList.contains('active')) LaserB2B.render();

    console.log('[LaserB2B v37c MASTER] Consolidato · '+Object.keys(machines).length+' macchine · '+products.length+' prodotti');
    if(typeof toast!=='undefined') setTimeout(function(){toast('⚡ LaserB2B v37c Master caricato — '+products.length+' prodotti · '+Object.keys(machines).length+' macchine','success');},2500);
  }
  setTimeout(_run, 600);
})();



// ═══════════════════════════════════════════════════════════════════
// INGLY OS v28 — Feature Pack Part 2
// Features: 2 QuoteGen · 5 GlobalSearch · 6 VoiceNotes
//           7 CRMStats · 9 ProductPhotos · 10 QRCode
//           11 MultiLangPDF · 12 PriceHistory · 13 MachineROI
//           14 ImportOrders
// ═══════════════════════════════════════════════════════════════════

// ─── FEATURE 2: Quick Quote Generator ────────────────────────────
window.QuoteGenerator = {
  open: function(preClientName){
    var self=this;
    var w=window.open('','_blank','width=1100,height=720,resizable=yes');
    if(!w){if(typeof toast!=='undefined') toast('Abilita popup per il Generatore Preventivi','info');return;}
    var clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');
    var prods=typeof LaserB2B!=='undefined'&&LaserB2B._PRODUCTS?LaserB2B._PRODUCTS:[];
    var mchs=typeof LaserB2B!=='undefined'&&LaserB2B._MACHINES?LaserB2B._MACHINES:{};
    var mu=typeof LaserB2B!=='undefined'&&LaserB2B._markup?LaserB2B._markup:{b2b:2,etsy:3.5,retail:3};
    // Pass data to popup via window properties
    w._cli=clients; w._prods=prods; w._mchs=mchs; w._mu=mu; w._SK='lb2b_quotes_v1';
    if(preClientName) w._preClient=preClientName;

    // Write HTML skeleton
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>⚡ Preventivo Rapido</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;display:grid;grid-template-rows:52px 1fr 50px;height:100vh;font-size:13px}'
      +'.hdr{background:#1e293b;border-bottom:1px solid #334155;padding:0 20px;display:flex;align-items:center;gap:12px}'
      +'.body{display:grid;grid-template-columns:2fr 1fr;overflow:hidden}'
      +'.left{padding:16px;overflow-y:auto;border-right:1px solid #334155}'
      +'.right{padding:16px;overflow-y:auto;background:#0b1120}'
      +'.ftr{background:#1e293b;border-top:1px solid #334155;padding:0 16px;display:flex;align-items:center;gap:8px}'
      +'input,select,textarea{background:#1e293b;border:1px solid #334155;border-radius:8px;color:#f1f5f9;padding:8px 10px;font-size:12px}'
      +'.w100{width:100%}.mb8{margin-bottom:8px}.mb12{margin-bottom:12px}'
      +'label{font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase;display:block;margin-bottom:3px}'
      +'.pi{display:flex;align-items:center;gap:7px;padding:7px 9px;background:#1e293b;border-radius:7px;cursor:pointer;border:1px solid transparent;margin-bottom:4px}'
      +'.pi:hover{border-color:#6366f1}.pi.sel{border-color:#10b981;background:#10b98110}'
      +'.ql{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#1e293b;border-radius:8px;margin-bottom:4px;border:1px solid #334155}'
      +'.btn{padding:8px 16px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700}'
      +'.bp{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}'
      +'.bg{background:linear-gradient(135deg,#10b981,#059669);color:#fff}'
      +'.bsm{background:#1e293b;color:#94a3b8;border:1px solid #334155;cursor:pointer}'
      +'h1{font-size:16px;font-weight:900}</style></head>'
      +'<body>'
      +'<div class="hdr"><span style="font-size:20px">⚡</span><h1>Generatore Preventivo Rapido</h1>'
      +'<div style="margin-left:auto;display:flex;gap:8px">'
      +'<button class="btn bsm" onclick="window.close()">✕</button></div></div>'
      +'<div class="body"><div class="left">'
      +'<div class="mb12"><label>Cliente</label>'
      +'<div style="display:grid;grid-template-columns:1fr auto;gap:6px">'
      +'<input id="cli" list="cli-dl" placeholder="Seleziona o scrivi nome cliente..." class="w100">'
      +'<datalist id="cli-dl"></datalist>'
      +'<button class="btn bsm" onclick="var n=prompt(\'Nuovo cliente:\');if(n)document.getElementById(\'cli\').value=n">+</button></div></div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">'
      +'<div><label>Macchina</label><select id="mach" class="w100" onchange="recalc()"></select></div>'
      +'<div><label>Canale</label><select id="ch" class="w100" onchange="recalc()"><option value="b2b">B2B ×2.0</option><option value="etsy">Etsy ×3.5</option><option value="retail">Retail ×3.0</option></select></div>'
      +'<div><label>€/h lavoro</label><input id="lh" type="number" value="18" class="w100" onchange="recalc()"></div></div>'
      +'<label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:8px 10px;background:#1e293b;border-radius:8px;cursor:pointer;font-size:12px;color:#cbd5e1"><input type="checkbox" id="express" onchange="recalc()" style="width:16px;height:16px;cursor:pointer"><span>⚡ <strong>Servizio Express &lt;48h</strong> — maggiorazione +25% (servizio, non penale)</span></label>'
      +'<div class="mb8" style="display:flex;gap:6px"><input id="srch" oninput="renderProds()" placeholder="🔍 Cerca prodotto..." style="flex:1"><select id="catf" onchange="renderProds()" style="width:160px"><option value="">Tutte le categorie</option></select></div>'
      +'<div style="font-size:10px;color:#64748b;margin-bottom:6px">Prodotti: <span id="pcnt">0</span> — Clicca per selezionare</div>'
      +'<div id="prodlist" style="max-height:310px;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:4px"></div>'
      +'</div>'
      +'<div class="right">'
      +'<div style="font-size:13px;font-weight:800;margin-bottom:12px;color:#f1f5f9">📋 Righe Preventivo</div>'
      +'<div id="lines" style="min-height:80px;margin-bottom:12px"></div>'
      +'<div id="totbox" style="background:#1e293b;border-radius:10px;padding:12px;margin-bottom:12px"></div>'
      +'<label>Note</label><textarea id="notes" rows="3" style="width:100%;height:55px;resize:vertical"></textarea>'
      +'</div></div>'
      +'<div class="ftr"><div id="status" style="flex:1;font-size:11px;color:#64748b"></div>'
      +'<button class="btn bsm" onclick="sel={};renderProds();renderLines()">🗑 Svuota</button>'
      +'<button class="btn bsm" onclick="savQ()">💾 Salva</button>'
      +'<button class="btn bp" onclick="genPDF()">📄 Genera PDF</button></div>'
      +'</body></html>');
    w.document.close();

    // Inject logic via script element (avoids all quote escaping issues)
    var sc=w.document.createElement('script');
    sc.textContent=[
      'var PRODS=window._prods||[];',
      'var MCHS=window._mchs||{};',
      'var MU=window._mu||{b2b:2,etsy:3.5,retail:3};',
      'var CLIENTS=window._cli||[];',
      'var sel={};', // selected: {id: qty}
      // Populate datalist
      'var dl=document.getElementById("cli-dl");',
      'CLIENTS.forEach(function(c){var o=document.createElement("option");o.value=c.name+(c.phone?" | "+c.phone:"")+(c.company?" ("+c.company+")":" ");dl.appendChild(o);});',
      // Populate machines
      'var machSel=document.getElementById("mach");',
      'Object.entries(MCHS).forEach(function(kv){var o=document.createElement("option");o.value=kv[0];o.textContent=kv[1].icon+" "+kv[1].label;machSel.appendChild(o);});',
      // Populate category filter
      'var catf=document.getElementById("catf");',
      'var cats=[...new Set(PRODS.map(function(p){return p.cat;}))];',
      'cats.forEach(function(c){var o=document.createElement("option");o.value=c;o.textContent=c;catf.appendChild(o);});',
      // Set pre-selected client
      'if(window._preClient){document.getElementById("cli").value=window._preClient;}',
      'function getMach(){return MCHS[document.getElementById("mach").value]||Object.values(MCHS)[0]||{hourly:0.15,energyH:0.02,energyHourly:0.02};}',
      'function calcPz(p){var m=getMach();var lh=parseFloat(document.getElementById("lh").value)||18;var tm=p.timeMin||1.5;var cost=p.cost||p.costSup||0;var ch=document.getElementById("ch").value;var mu=MU[ch]||2;var xp=document.getElementById("express")&&document.getElementById("express").checked?1.25:1;var cp=cost+(m.hourly+(m.energyH||m.energyHourly||0))/60*tm+lh/60*tm+0.3;return{cp:cp,fp:Math.max(15,cp*mu*xp)};}',
      'function renderProds(){',
      '  var q=document.getElementById("srch").value.toLowerCase();',
      '  var cat=document.getElementById("catf").value;',
      '  var items=PRODS.filter(function(p){return(!q||p.name.toLowerCase().includes(q)||p.cat.toLowerCase().includes(q))&&(!cat||p.cat===cat);});',
      '  document.getElementById("pcnt").textContent=items.length;',
      '  var frag=document.createDocumentFragment();',
      '  items.forEach(function(p){',
      '    var div=document.createElement("div");',
      '    div.className="pi"+(sel[p.id]!==undefined?" sel":"");',
      '    div.id="pi-"+p.id;',
      '    var r=calcPz(p);',
      '    var tc={laser:"#fbbf24",sublimazione:"#10b981",dtf:"#ec4899","laser+sub":"#8b5cf6"}[p.tech||"laser"]||"#6366f1";',
      '    div.innerHTML="<span style=\'font-size:14px\'>"+(p.img||"🎁")+"</span><div style=\'flex:1;min-width:0\'><div style=\'font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\'>"+p.name+"</div><div style=\'font-size:9px;color:#64748b\'><span style=\'background:"+tc+"20;color:"+tc+";padding:0 4px;border-radius:8px\'>"+( p.tech||"laser")+"</span> €"+r.fp.toFixed(2)+"/pz</div></div>";',
      '    div.onclick=(function(id){return function(){if(sel[id]!==undefined){delete sel[id];}else{sel[id]=1;}renderProds();renderLines();};})(p.id);',
      '    frag.appendChild(div);',
      '  });',
      '  var pl=document.getElementById("prodlist"); pl.innerHTML=""; pl.appendChild(frag);',
      '}',
      'function renderLines(){',
      '  var ids=Object.keys(sel); var frag=document.createDocumentFragment();',
      '  if(!ids.length){document.getElementById("lines").innerHTML="<div style=\'color:#64748b;padding:20px;text-align:center;font-size:12px\'>Clicca i prodotti per aggiungerli</div>";document.getElementById("totbox").innerHTML="";return;}',
      '  ids.forEach(function(id){',
      '    var p=PRODS.find(function(x){return x.id===id;}); if(!p) return;',
      '    var qty=sel[id]||1; var r=calcPz(p);',
      '    var row=document.createElement("div"); row.className="ql";',
      '    row.innerHTML="<span style=\'font-size:16px\'>"+(p.img||"🎁")+"</span><div style=\'flex:1;min-width:0\'><div style=\'font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\'>"+p.name+"</div><div style=\'font-size:9px;color:#64748b\'>€"+r.cp.toFixed(2)+"/pz costo · €"+r.fp.toFixed(2)+"/pz prezzo</div></div>";',
      '    var qinp=document.createElement("input"); qinp.type="number"; qinp.min=1; qinp.value=qty; qinp.style.cssText="width:55px;text-align:center;padding:4px;";',
      '    qinp.onchange=(function(pid){return function(){sel[pid]=Math.max(1,parseInt(this.value)||1);renderLines();};})(id);',
      '    var totSpan=document.createElement("span"); totSpan.style.cssText="font-size:12px;font-weight:700;color:#6366f1;min-width:55px;text-align:right"; totSpan.textContent="€"+(r.fp*qty).toFixed(0);',
      '    var delbtn=document.createElement("button"); delbtn.textContent="✕"; delbtn.style.cssText="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:14px;padding:0 4px";',
      '    delbtn.onclick=(function(pid){return function(){delete sel[pid];renderProds();renderLines();};})(id);',
      '    row.appendChild(qinp); row.appendChild(totSpan); row.appendChild(delbtn);',
      '    frag.appendChild(row);',
      '  });',
      '  document.getElementById("lines").innerHTML=""; document.getElementById("lines").appendChild(frag);',
      '  calcTotals();',
      '}',
      'function calcTotals(){',
      '  var total=0,cost=0; Object.keys(sel).forEach(function(id){var p=PRODS.find(function(x){return x.id===id;});if(!p)return;var qty=sel[id]||1;var r=calcPz(p);total+=r.fp*qty;cost+=r.cp*qty;});',
      '  var profit=total-cost; var mg=total>0?Math.round(profit/total*100):0; var mgc=mg>=60?"#22c55e":mg>=40?"#f59e0b":"#ef4444";',
      '  document.getElementById("totbox").innerHTML="<div style=\'display:flex;justify-content:space-between;padding:3px 0;font-size:12px\'><span style=\'color:#94a3b8\'>Imponibile</span><span style=\'font-weight:700\'>€"+total.toFixed(2)+"</span></div><div style=\'display:flex;justify-content:space-between;padding:3px 0;font-size:12px\'><span style=\'color:#94a3b8\'>IVA 22%</span><span>€"+(total*.22).toFixed(2)+"</span></div><div style=\'display:flex;justify-content:space-between;padding:6px 0 0;border-top:2px solid #334155;font-size:15px;font-weight:900\'><span>TOTALE</span><span style=\'color:#6366f1\'>€"+(total*1.22).toFixed(2)+"</span></div><div style=\'font-size:10px;color:"+mgc+";text-align:right;margin-top:4px\'>Margine: "+mg+"% · Profitto netto: €"+profit.toFixed(2)+"</div>";',
      '}',
      'function recalc(){renderProds();renderLines();}',
      'function getClientName(){var v=document.getElementById("cli").value;return v.split(" | ")[0].split(" (")[0].trim();}',
      'function savQ(){',
      '  var cn=getClientName(); if(!cn){alert("Seleziona un cliente!");return;}',
      '  var lines=[]; var total=0;',
      '  Object.keys(sel).forEach(function(id){var p=PRODS.find(function(x){return x.id===id;});if(!p)return;var qty=sel[id]||1;var r=calcPz(p);total+=r.fp*qty;lines.push({id:p.id,name:p.name,qty:qty,costPz:r.cp,finalPz:r.fp});});',
      '  var ch=document.getElementById("ch").value;',
      '  var q={id:Date.now(),date:new Date().toISOString(),client:cn,products:lines,total:+total.toFixed(2),channel:ch,notes:document.getElementById("notes").value,status:"draft"};',
      '  var qs=JSON.parse(localStorage.getItem(window._SK)||"[]"); qs.unshift(q); localStorage.setItem(window._SK,JSON.stringify(qs.slice(0,100)));',
      '  document.getElementById("status").textContent="✅ Preventivo #"+q.id.toString().slice(-4)+" salvato per "+cn+" — €"+total.toFixed(2);',
      '}',
      'function genPDF(){',
      '  var cn=getClientName(); if(!cn||!Object.keys(sel).length){alert("Seleziona cliente e prodotti!");return;}',
      '  var rows=[]; var total=0;',
      '  Object.keys(sel).forEach(function(id){var p=PRODS.find(function(x){return x.id===id;});if(!p)return;var qty=sel[id]||1;var r=calcPz(p);total+=r.fp*qty;rows.push("<tr><td>"+(p.img||"")+" "+p.name+"</td><td style=\'text-align:center\'>"+qty+"</td><td style=\'text-align:right\'>€"+r.fp.toFixed(2)+"</td><td style=\'text-align:right;font-weight:700\'>€"+(r.fp*qty).toFixed(2)+"</td></tr>");});',
      '  var iva=total*.22; var qn="PR-"+Date.now().toString().slice(-6);',
      '  var pw=window.open("","_blank","width=850,height=700");',
      '  if(!pw) return;',
      '  pw.document.write("<!DOCTYPE html><html><head><meta charset=utf-8><title>Preventivo "+qn+"</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:40px;font-size:13px;color:#1e293b}.hdr{display:flex;justify-content:space-between;padding-bottom:20px;border-bottom:3px solid #6366f1;margin-bottom:28px}.brand{font-size:22px;font-weight:900;color:#6366f1}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#6366f1;color:#fff;padding:9px 12px;text-align:left;font-size:11px}td{padding:9px 12px;border-bottom:1px solid #e2e8f0}.tb{background:#f1f5ff;padding:16px;border-radius:8px;margin-bottom:20px;text-align:right}.tf{display:flex;justify-content:space-between;font-size:16px;font-weight:900;color:#6366f1;padding-top:8px;border-top:2px solid #c7d2fe;margin-top:8px}@media print{.np{display:none}}</style></head><body>");',
      '  pw.document.write("<div class=hdr><div><div class=brand>⚡ Ingly Laser</div><div style=font-size:11px;color:#64748b>Personalizzazione Laser · Palermo</div></div><div style=text-align:right><div style=font-size:16px;font-weight:900>PREVENTIVO "+qn+"</div><div style=font-size:11px;color:#64748b>"+new Date().toLocaleDateString("it")+"</div><div style=font-size:10px;color:#64748b>Valido 7 giorni</div></div></div>");',
      '  pw.document.write("<div style=background:#f8fafc;padding:12px 16px;border-radius:8px;margin-bottom:20px><strong style=font-size:14px>"+cn+"</strong></div>");',
      '  pw.document.write("<table><tr><th style=width:50%>Prodotto</th><th style=text-align:center>Qty</th><th style=text-align:right>Prezzo/pz</th><th style=text-align:right>Totale</th></tr>"+rows.join("")+"</table>");',
      '  pw.document.write("<div class=tb><div style=display:flex;justify-content:space-between;padding:3px 0>Imponibile<span>€"+total.toFixed(2)+"</span></div><div style=display:flex;justify-content:space-between;padding:3px 0>IVA 22%<span>€"+iva.toFixed(2)+"</span></div><div class=tf><span>TOTALE IVA INCLUSA</span><span>€"+(total+iva).toFixed(2)+"</span></div></div>");',
      '  var notes=document.getElementById("notes").value;',
      '  if(notes) pw.document.write("<div style=padding:12px 16px;background:#f8fafc;border-radius:8px;font-size:12px;color:#64748b><strong>Note:</strong> "+notes+"</div>");',
      '  pw.document.write("<div class=np style=text-align:center;margin-top:24px><button onclick=print() style=padding:11px 24px;background:#6366f1;color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:14px;font-weight:700>🖨️ Stampa / PDF</button> <button onclick=close() style=padding:11px 18px;background:#f1f5f9;border:none;border-radius:9px;cursor:pointer>Chiudi</button></div></body></html>");',
      '  pw.document.close();',
      '}',
      'renderProds();',
    ].join('\n');
    w.document.head.appendChild(sc);
  }
};

// ─── FEATURE 5: Global Search ⌘K ─────────────────────────────────
(function _globalSearch(){
  function open(){
    var old=document.getElementById('gs-modal'); if(old) old.remove();
    var modal=document.createElement('div'); modal.id='gs-modal';
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:999999;display:flex;align-items:flex-start;justify-content:center;padding-top:10vh;backdrop-filter:blur(4px)';
    modal.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:16px;width:600px;max-width:95vw;max-height:70vh;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.7)">'
      +'<div style="padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">'
      +'<span style="font-size:18px">🔍</span>'
      +'<input id="gs-inp" placeholder="Cerca clienti, prodotti, ordini, preventivi..." autofocus '
      +'oninput="gsSearch(this.value)" '
      +'style="flex:1;padding:8px;background:transparent;border:none;color:var(--text);font-size:16px;outline:none">'
      +'<kbd style="padding:3px 7px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;font-size:10px;color:var(--text-muted)">ESC</kbd>'
      +'</div>'
      +'<div id="gs-results" style="padding:8px;overflow-y:auto;max-height:55vh"></div>'
      +'</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',function(e){if(e.target===modal) modal.remove();});
    document.addEventListener('keydown',function esc(e){if(e.key==='Escape'){modal.remove();document.removeEventListener('keydown',esc);}});
    setTimeout(function(){document.getElementById('gs-inp')?.focus();},50);
  }

  window.gsSearch=function(q){
    var res=document.getElementById('gs-results'); if(!res) return;
    q=q.toLowerCase().trim();
    if(!q){res.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:12px">Digita per cercare in tutto il tool...</div>';return;}
    var results=[];
    // Search clients
    try{JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]').forEach(function(c){if((c.name||'').toLowerCase().includes(q)||(c.phone||'').includes(q)||(c.company||'').toLowerCase().includes(q)){results.push({type:'👥 Cliente',label:c.name+(c.company?' — '+c.company:''),sub:c.phone||c.email||'',action:"App.navigate('clienti')"});}});}catch(e){}
    // Search products
    try{var prods=typeof LaserB2B!=='undefined'&&LaserB2B._PRODUCTS?LaserB2B._PRODUCTS:[];prods.forEach(function(p){if((p.name||'').toLowerCase().includes(q)||(p.cat||'').toLowerCase().includes(q)){results.push({type:'🎁 Prodotto',label:p.name,sub:p.cat+' · €'+(p.cost||p.costSup||0).toFixed(2)+'/pz · '+p.sup,action:"App.navigate('laser_b2b')"});}});}catch(e){}
    // Search orders
    try{JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]').forEach(function(o){if((o.client||'').toLowerCase().includes(q)||(o.description||'').toLowerCase().includes(q)){results.push({type:'📋 Ordine',label:o.client,sub:(o.description||'').slice(0,50)+' · €'+(o.total||0).toFixed(0),action:"App.navigate('order_tracker')"});}});}catch(e){}
    // Search quotes
    try{JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]').forEach(function(q2){if((q2.client||'').toLowerCase().includes(q)||(q2.product||'').toLowerCase().includes(q)){results.push({type:'📄 Preventivo',label:q2.client,sub:'€'+( q2.total||0).toFixed(0)+' · '+new Date(q2.date).toLocaleDateString('it'),action:"App.navigate('laser_b2b')"});}});}catch(e){}
    if(!results.length){res.innerHTML='<div style="padding:20px;text-align:center;color:var(--text-dim);font-size:12px">Nessun risultato per "'+q+'"</div>';return;}
    var typeColors={'👥 Cliente':'#10b981','🎁 Prodotto':'#fbbf24','📋 Ordine':'#6366f1','📄 Preventivo':'#3b82f6'};
    res.innerHTML=results.slice(0,12).map(function(r){
      var c=typeColors[r.type]||'#6366f1';
      return '<div onclick="'+r.action+';document.getElementById(\'gs-modal\')?.remove()" '
        +'style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:9px;cursor:pointer;transition:.12s" '
        +'onmouseover="this.style.background=\'var(--bg-card2)\'" onmouseout="this.style.background=\'transparent\'">'
        +'<span style="background:'+c+'20;color:'+c+';padding:3px 7px;border-radius:7px;font-size:10px;font-weight:700;white-space:nowrap">'+r.type+'</span>'
        +'<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;color:var(--text)">'+r.label+'</div>'
        +'<div style="font-size:10px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+r.sub+'</div></div>'
        +'<span style="font-size:10px;color:var(--text-dim)">↵</span>'
        +'</div>';
    }).join('');
  };

  // Keyboard shortcut
  document.addEventListener('keydown',function(e){
    /* Ctrl+K ritirato: lo possiede la palette dei comandi consolidata. */
  });
  // Add search button to header if it exists
  setTimeout(function(){
    var hdr=document.querySelector('.top-bar')||document.querySelector('.navbar')||document.querySelector('[class*="header"]');
    if(hdr&&!document.getElementById('gs-btn')){
      var btn=document.createElement('button'); btn.id='gs-btn';
      btn.onclick=open;
      btn.style.cssText='padding:6px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:8px;cursor:pointer;font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px';
      btn.innerHTML='🔍 Cerca <kbd style="padding:2px 5px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;font-size:9px">⌘K</kbd>';
      hdr.appendChild(btn);
    }
  },1500);
  window.GlobalSearch={open:open};
})();

// ─── FEATURE 6: Voice Notes (Web Speech API) ─────────────────────
window.VoiceNotes = {
  _recognition: null,
  isSupported: function(){ return !!(window.SpeechRecognition||window.webkitSpeechRecognition); },
  startDictation: function(targetId, btnId){
    if(!this.isSupported()){
      if(typeof toast!=='undefined') toast('Dettatura vocale non supportata in questo browser (usa Chrome)','error');
      return;
    }
    var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    var r=new SR(); r.lang='it-IT'; r.continuous=false; r.interimResults=false;
    var btn=document.getElementById(btnId);
    if(btn){btn.style.background='#ef444420';btn.style.borderColor='#ef4444';btn.textContent='🔴 Registrando...';}
    r.onresult=function(e){
      var text=e.results[0][0].transcript;
      var ta=document.getElementById(targetId);
      if(ta){ ta.value=(ta.value?ta.value+' ':'')+text; }
      if(typeof toast!=='undefined') toast('🎤 Testo aggiunto: '+text.slice(0,30)+'...','success');
    };
    r.onerror=function(e){ if(typeof toast!=='undefined') toast('Errore dettatura: '+e.error,'error'); };
    r.onend=function(){ if(btn){btn.style.background='';btn.style.borderColor='';btn.textContent='🎤 Dettatura';} };
    r.start(); this._recognition=r;
  }
};

// Inject voice button into CRM modal after render
(function _injectVoice(){
  function _p(){
    if(typeof CRMSmart==='undefined'||!CRMSmart._v27){setTimeout(_p,600);return;}
    var _origAdd=CRMSmart._addClient.bind(CRMSmart);
    CRMSmart._addClient=function(){
      _origAdd();
      setTimeout(function(){
        var notesLabel=document.querySelector('label[for="crm-f-notes"]');
        if(!notesLabel) notesLabel=document.querySelector('#crm-add-modal label:last-of-type');
        var notesTa=document.getElementById('crm-f-notes');
        if(notesTa&&!document.getElementById('voice-notes-btn')){
          var btn=document.createElement('button');
          btn.id='voice-notes-btn'; btn.type='button'; btn.textContent='🎤 Dettatura';
          btn.onclick=function(){VoiceNotes.startDictation('crm-f-notes','voice-notes-btn');};
          btn.style.cssText='padding:4px 10px;background:var(--bg-card);border:1px solid var(--border);border-radius:7px;cursor:pointer;font-size:11px;color:var(--text-muted);margin-bottom:6px';
          notesTa.parentElement.insertBefore(btn,notesTa);
        }
      },200);
    };
  }
  setTimeout(_p,2000);
})();

// ─── FEATURE 7: CRM Statistics ───────────────────────────────────
window.CRMStats = {
  render: function(){
    var clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');
    var w=window.open('','_blank','width=900,height=650');
    if(!w){if(typeof toast!=='undefined') toast('Abilita popup','info');return;}
    // Build tag stats
    var tagCount={};
    clients.forEach(function(c){ var tags=(c.tags||'').split(','); tags.forEach(function(t){t=t.trim();if(t) tagCount[t]=(tagCount[t]||0)+1;}); });
    var tagEntries=Object.entries(tagCount).sort(function(a,b){return b[1]-a[1];}).slice(0,10);
    var colors=['#6366f1','#10b981','#fbbf24','#ec4899','#3b82f6','#f59e0b','#8b5cf6','#22c55e','#ef4444','#64748b'];
    // Monthly acquisition
    var months={};
    clients.forEach(function(c){if(c.added){var m=c.added.slice(0,7);months[m]=(months[m]||0)+1;}});
    var mEntries=Object.entries(months).sort().slice(-6);
    var maxM=Math.max.apply(null,mEntries.map(function(m){return m[1];})||[1]);
    // Tag pie chart (SVG)
    var total=clients.length||1;
    var tagBars=tagEntries.map(function(t,i){
      var pct=Math.round(t[1]/total*100);
      return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px"><span style="color:#f1f5f9;font-weight:600">'+t[0]+'</span><span style="color:#64748b">'+t[1]+' ('+pct+'%)</span></div><div style="height:6px;background:#1e293b;border-radius:3px"><div style="height:6px;background:'+colors[i%10]+';border-radius:3px;width:'+pct+'%"></div></div></div>';
    }).join('');
    var monthBars=mEntries.map(function(m,i){
      var h=Math.max(4,Math.round(m[1]/maxM*70));
      return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div style="font-size:10px;color:#94a3b8">'+m[1]+'</div><div style="width:100%;height:'+h+'px;background:#6366f1;border-radius:3px 3px 0 0"></div><div style="font-size:9px;color:#64748b">'+m[0].slice(5)+'</div></div>';
    }).join('');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Statistiche CRM</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:24px;font-size:13px}'
      +'h1{font-size:18px;font-weight:900;margin-bottom:6px}.sub{font-size:11px;color:#64748b;margin-bottom:20px}'
      +'.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}'
      +'.card{background:#1e293b;border:1px solid #334155;border-radius:14px;padding:18px}'
      +'.ct{font-size:13px;font-weight:800;margin-bottom:14px}'
      +'</style></head><body>'
      +'<h1>📊 Statistiche CRM</h1><div class="sub">'+clients.length+' clienti totali · '+Object.keys(tagCount).length+' tag diversi</div>'
      +'<div class="grid">'
      +'<div class="card"><div class="ct">🏷️ Distribuzione per Tag</div>'+( tagBars||'<div style="color:#64748b">Nessun tag assegnato ancora</div>')+'</div>'
      +'<div class="card"><div class="ct">📅 Nuovi Clienti per Mese</div><div style="display:flex;align-items:flex-end;gap:6px;height:80px;border-bottom:1px solid #334155">'+( monthBars||'<div style="color:#64748b">Nessun dato</div>')+'</div></div>'
      +'</div>'
      +'<div class="card"><div class="ct">📋 Riepilogo</div>'
      +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">'
      +[{l:'Totale Clienti',v:clients.length,c:'#6366f1'},{l:'Con Telefono',v:clients.filter(function(c){return c.phone;}).length,c:'#10b981'},{l:'Con Email',v:clients.filter(function(c){return c.email;}).length,c:'#3b82f6'},{l:'Tag Assegnati',v:clients.filter(function(c){return c.tags;}).length,c:'#f59e0b'}]
      .map(function(k){return '<div style="background:#0f172a;border-radius:10px;padding:12px;text-align:center"><div style="font-size:9px;color:'+k.c+';font-weight:700;text-transform:uppercase;margin-bottom:4px">'+k.l+'</div><div style="font-size:22px;font-weight:900;color:'+k.c+'">'+k.v+'</div></div>';}).join('')
      +'</div></div>'
      +'<div style="text-align:center;margin-top:20px"><button onclick="window.close()" style="padding:10px 20px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:9px;cursor:pointer">Chiudi</button></div>'
      +'</body></html>');
    w.document.close();
  }
};
// Add CRM stats button to CRM view
(function _addCRMStatBtn(){
  function _p(){
    if(typeof CRMSmart==='undefined'||!CRMSmart._v26){setTimeout(_p,600);return;}
    var _origRender=CRMSmart.render.bind(CRMSmart);
    CRMSmart.render=function(){
      _origRender();
      setTimeout(function(){
        var hdr=document.querySelector('#view-clienti .stats-btn-added,#view-crm .stats-btn-added');
        if(hdr) return;
        var btns=document.querySelector('#view-clienti div:first-child div:last-child,#view-crm div:first-child div:last-child');
        if(btns){
          btns.classList.add('stats-btn-added');
          var sb=document.createElement('button');
          sb.textContent='📊 Statistiche';
          sb.onclick=function(){CRMStats.render();};
          sb.style.cssText='padding:8px 14px;background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border);border-radius:9px;cursor:pointer;font-size:12px;font-weight:700';
          btns.appendChild(sb);
        }
      },300);
    };
  }
  setTimeout(_p,2200);
})();

// ─── FEATURE 10: QR Code Generator ───────────────────────────────
window.QRGenerator = {
  open: function(prefillText){
    var w=window.open('','_blank','width=600,height=550');
    if(!w){if(typeof toast!=='undefined') toast('Abilita popup','info');return;}
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR Code Generator</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:24px;font-size:13px}'
      +'h1{font-size:18px;font-weight:900;margin-bottom:6px;display:flex;align-items:center;gap:8px}'
      +'label{font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;display:block;margin-bottom:4px;margin-top:12px}'
      +'input,select,textarea{width:100%;padding:9px 11px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:#f1f5f9;font-size:13px}'
      +'.btn{padding:10px 20px;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:700}'
      +'.bp{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}'
      +'</style></head><body>'
      +'<h1>◼◻ QR Code Generator</h1>'
      +'<p style="font-size:11px;color:#64748b;margin-bottom:16px">Genera QR code per URL, vCard, Menu, WiFi — da incidere su laser</p>'
      +'<label>Tipo QR</label>'
      +'<select id="qr-type" onchange="updatePlaceholder()" style="margin-bottom:8px">'
      +'<option value="url">🌐 URL / Link</option>'
      +'<option value="text">📝 Testo libero</option>'
      +'<option value="email">✉️ Email</option>'
      +'<option value="phone">📱 Numero telefono</option>'
      +'<option value="wifi">📶 WiFi</option>'
      +'<option value="vcard">👤 vCard (contatto)</option>'
      +'</select>'
      +'<label id="qr-label">URL o testo</label>'
      +'<textarea id="qr-data" rows="3" placeholder="https://..." style="height:70px;resize:vertical">'+(prefillText||'')+'</textarea>'
      +'<div id="qr-preview" style="text-align:center;margin-top:20px;min-height:160px">'
      +'<div style="color:#64748b;padding:40px">Clicca "Genera" per creare il QR</div>'
      +'</div>'
      +'<div style="display:flex;gap:8px;margin-top:16px;justify-content:center">'
      +'<button class="btn bp" onclick="generateQR()">◼ Genera QR Code</button>'
      +'<button class="btn" style="background:#1e293b;color:#94a3b8;border:1px solid #334155" onclick="downloadQR()">⬇ Scarica PNG</button>'
      +'<button class="btn" style="background:#1e293b;color:#94a3b8;border:1px solid #334155" onclick="window.close()">Chiudi</button>'
      +'</div>'
      +'<script>'
      +'function updatePlaceholder(){var t=document.getElementById("qr-type").value;var placeholders={url:"https://www.tuo-sito.it",text:"Testo personalizzato da incidere",email:"info@email.it",phone:"+39 333 000 0000",wifi:"WIFI:S:NomeRete;T:WPA;P:Password;;",vcard:"BEGIN:VCARD\\nFN:Mario Rossi\\nTEL:+39333000000\\nEMAIL:mario@email.it\\nEND:VCARD"};document.getElementById("qr-label").textContent=t.charAt(0).toUpperCase()+t.slice(1);document.getElementById("qr-data").placeholder=placeholders[t]||"";}',
      'function buildQRData(){var t=document.getElementById("qr-type").value;var d=document.getElementById("qr-data").value.trim();if(!d) return d;if(t==="phone"&&!d.startsWith("tel:")) return "tel:"+d;if(t==="email"&&!d.startsWith("mailto:")) return "mailto:"+d;return d;}',
      'function generateQR(){var d=buildQRData();if(!d){alert("Inserisci un valore!");return;}var url="https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=png&data="+encodeURIComponent(d);var prev=document.getElementById("qr-preview");prev.innerHTML="<div style=color:#64748b>Generazione in corso...</div>";var img=new Image();img.id="qr-img";img.style.cssText="border:8px solid white;border-radius:8px;max-width:200px;";img.onload=function(){prev.innerHTML="";prev.appendChild(img);};img.onerror=function(){prev.innerHTML="<div style=color:#ef4444>Errore: controlla connessione internet</div>";};img.src=url;}',
      'function downloadQR(){var img=document.getElementById("qr-img");if(!img){alert("Genera prima un QR!");return;}var a=document.createElement("a");a.href=img.src;a.download="qrcode_ingly.png";a.click();}',
      '<\/script></body></html>');
    w.document.close();
  }
};

// ─── FEATURE 11: Multi-language PDF ──────────────────────────────
window.MultiLangPDF = {
  _langs:{
    it:{title:'PREVENTIVO',client:'Destinatario',product:'Prodotto',qty:'Q.tà',unitPrice:'Prezzo/pz',total:'Totale',subtotal:'Imponibile',vat:'IVA 22%',grandTotal:'TOTALE IVA INCLUSA',delivery:'Consegna',payment:'Pagamento',validity:'Validità',thanks:'Grazie per la fiducia!',validDays:'5-7 giorni lavorativi',payTerms:'50% anticipo, saldo alla consegna'},
    en:{title:'QUOTATION',client:'Client',product:'Product',qty:'Qty',unitPrice:'Unit Price',total:'Total',subtotal:'Subtotal',vat:'VAT 22%',grandTotal:'GRAND TOTAL VAT INCL.',delivery:'Delivery',payment:'Payment',validity:'Validity',thanks:'Thank you for your trust!',validDays:'5-7 business days',payTerms:'50% upfront, balance on delivery'},
    de:{title:'KOSTENVORANSCHLAG',client:'Kunde',product:'Produkt',qty:'Menge',unitPrice:'Preis/Stk',total:'Gesamt',subtotal:'Netto',vat:'MwSt. 22%',grandTotal:'GESAMTBETRAG INKL. MWST.',delivery:'Lieferung',payment:'Zahlung',validity:'Gültigkeit',thanks:'Vielen Dank für Ihr Vertrauen!',validDays:'5-7 Werktage',payTerms:'50% Anzahlung, Rest bei Lieferung'},
  },
  generate:function(data,lang){
    lang=lang||'it'; var L=this._langs[lang]||this._langs.it;
    var iva=data.total*.22; var qn='PR-'+Date.now().toString().slice(-6);
    var w=window.open('','_blank','width=850,height=700');
    if(!w){if(typeof toast!=='undefined') toast('Abilita popup','info');return;}
    w.document.write('<!DOCTYPE html><html lang="'+lang+'"><head><meta charset="utf-8"><title>'+L.title+' '+qn+'</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:40px;font-size:13px;color:#1e293b}'
      +'.hdr{display:flex;justify-content:space-between;padding-bottom:20px;border-bottom:3px solid #6366f1;margin-bottom:28px}'
      +'.brand{font-size:22px;font-weight:900;color:#6366f1}'
      +'table{width:100%;border-collapse:collapse;margin-bottom:20px}'
      +'th{background:#6366f1;color:#fff;padding:9px 12px;text-align:left;font-size:11px;font-weight:700}'
      +'td{padding:9px 12px;border-bottom:1px solid #e2e8f0}'
      +'.tb{background:#f1f5ff;padding:16px;border-radius:8px;text-align:right;margin-bottom:20px}'
      +'.tf{display:flex;justify-content:space-between;font-size:16px;font-weight:900;color:#6366f1;padding-top:8px;border-top:2px solid #c7d2fe;margin-top:8px}'
      +'@media print{.np{display:none}}</style></head><body>'
      +'<div class="hdr"><div><div class="brand">⚡ Ingly Laser</div><div style="font-size:11px;color:#64748b">Personalizzazione Laser · Palermo</div></div>'
      +'<div style="text-align:right"><div style="font-size:16px;font-weight:900">'+L.title+' '+qn+'</div>'
      +'<div style="font-size:11px;color:#64748b">'+new Date().toLocaleDateString(lang==='de'?'de-DE':lang==='en'?'en-GB':'it-IT')+'</div>'
      +'<div style="font-size:9px;color:#94a3b8">'+L.validity+': 30gg</div></div></div>'
      +'<div style="background:#f8fafc;padding:12px 16px;border-radius:8px;margin-bottom:20px"><div style="font-size:10px;color:#64748b;margin-bottom:3px">'+L.client+'</div><strong style="font-size:15px">'+(data.client||'')+'</strong></div>'
      +'<table><tr><th style="width:45%">'+L.product+'</th><th style="text-align:center">'+L.qty+'</th><th style="text-align:right">'+L.unitPrice+'</th><th style="text-align:right">'+L.total+'</th></tr>'
      +(data.rows||[]).map(function(r){return '<tr><td>'+r.name+'</td><td style="text-align:center">'+r.qty+'</td><td style="text-align:right">€'+r.price.toFixed(2)+'</td><td style="text-align:right;font-weight:700">€'+(r.price*r.qty).toFixed(2)+'</td></tr>';}).join('')
      +'</table>'
      +'<div class="tb"><div style="display:flex;justify-content:space-between;padding:3px 0">'+L.subtotal+'<span>€'+data.total.toFixed(2)+'</span></div><div style="display:flex;justify-content:space-between;padding:3px 0">'+L.vat+'<span>€'+iva.toFixed(2)+'</span></div><div class="tf"><span>'+L.grandTotal+'</span><span>€'+(data.total+iva).toFixed(2)+'</span></div></div>'
      +'<table><tr><th colspan="2">Condizioni / Terms</th></tr>'
      +'<tr><td style="width:25%;background:#f8fafc;font-weight:700">'+L.delivery+'</td><td>'+L.validDays+'</td></tr>'
      +'<tr><td style="background:#f8fafc;font-weight:700">'+L.payment+'</td><td>'+L.payTerms+'</td></tr></table>'
      +'<div style="text-align:center;font-size:12px;color:#64748b;margin-top:20px">'+L.thanks+'</div>'
      +'<div class="np" style="text-align:center;margin-top:20px"><button onclick="print()" style="padding:11px 24px;background:#6366f1;color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:14px;font-weight:700">🖨️ Stampa / PDF</button> <button onclick="close()" style="padding:11px 18px;background:#f1f5f9;border:none;border-radius:9px;cursor:pointer">Chiudi</button></div>'
      +'</body></html>');
    w.document.close();
  }
};

// ─── FEATURE 12: Supplier Price History ──────────────────────────
window.PriceHistory = {
  _SK:'ingly_price_history_v1',
  record:function(itemId, itemName, newPrice, supplier){
    try{
      var h=JSON.parse(localStorage.getItem(this._SK)||'{}');
      if(!h[itemId]) h[itemId]={name:itemName,history:[]};
      h[itemId].history.push({price:newPrice,sup:supplier,date:new Date().toISOString()});
      h[itemId].history=h[itemId].history.slice(-24); // keep last 24 entries
      localStorage.setItem(this._SK,JSON.stringify(h));
    }catch(e){}
  },
  getHistory:function(itemId){ try{return(JSON.parse(localStorage.getItem(this._SK)||'{}')[itemId]||{}).history||[];}catch(e){return[];} },
  showHistory:function(itemId,itemName){
    var h=this.getHistory(itemId);
    var w=window.open('','_blank','width=600,height=450');
    if(!w) return;
    var rows=h.map(function(e){return '<tr><td style="padding:8px 12px">'+new Date(e.date).toLocaleDateString('it')+'</td><td style="padding:8px 12px">'+e.sup+'</td><td style="padding:8px 12px;font-weight:700;text-align:right">€'+(e.price||0).toFixed(2)+'</td></tr>';}).join('');
    var trend=h.length>=2?((h[h.length-1].price-h[0].price)/h[0].price*100).toFixed(1):null;
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Storico Prezzi</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:24px;background:#0f172a;color:#f1f5f9;font-size:13px}table{width:100%;border-collapse:collapse}th{background:#1e293b;padding:9px 12px;text-align:left;font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase}td{border-bottom:1px solid #1e293b33}</style></head><body>'
      +'<h2 style="font-size:16px;font-weight:900;margin-bottom:6px">📈 Storico Prezzi: '+itemName+'</h2>'
      +'<p style="font-size:11px;color:#64748b;margin-bottom:16px">'+h.length+' rilevazioni'+(trend!==null?' · Variazione: <strong style="color:'+(parseFloat(trend)>0?'#ef4444':'#22c55e')+'">'+( parseFloat(trend)>0?'▲':'▼')+Math.abs(trend)+'%</strong>':'')+'</p>'
      +'<table><thead><tr><th>Data</th><th>Fornitore</th><th style="text-align:right">Prezzo €</th></tr></thead><tbody>'
      +(rows||'<tr><td colspan="3" style="padding:20px;text-align:center;color:#64748b">Nessuno storico ancora</td></tr>')
      +'</tbody></table>'
      +'<button onclick="close()" style="margin-top:16px;padding:9px 18px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    w.document.close();
  }
};

// ─── FEATURE 13: Machine ROI Calculator ──────────────────────────
window.MachineROI = {
  render:function(){
    var w=window.open('','_blank','width=800,height=600');
    if(!w){if(typeof toast!=='undefined') toast('Abilita popup','info');return;}
    var machines=typeof LaserB2B!=='undefined'&&LaserB2B._MACHINES?LaserB2B._MACHINES:{};
    var quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');
    var cards=Object.entries(machines).map(function(kv){
      var id=kv[0]; var m=kv[1];
      var usage=quotes.filter(function(q){return q.machine&&q.machine.includes(m.label);});
      var totalRev=usage.reduce(function(a,q){return a+(q.total||0);},0);
      var hours=usage.reduce(function(a,q){return a+(q.qty||1)*(q.product?1.5:1)/60;},0);
      var cost=m.purchaseCost||0;
      var roi=cost>0?Math.round((totalRev-cost)/cost*100):0;
      var payback=cost>0&&totalRev>0?Math.round(cost/(totalRev/Math.max(1,quotes.filter(function(q){return isMo(q.date)}).length||1)*12)):null;
      var isMo=function(d){return d&&d.slice(0,7)===new Date().toISOString().slice(0,7);};
      var revM=quotes.filter(function(q){return isMo(q.date)&&q.machine&&q.machine.includes(m.label);}).reduce(function(a,q){return a+(q.total||0);},0);
      return '<div style="background:#1e293b;border:1px solid #334155;border-radius:14px;padding:18px">'
        +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'
        +'<span style="font-size:22px">'+m.icon+'</span>'
        +'<div><div style="font-size:14px;font-weight:800">'+m.label+'</div>'
        +'<div style="font-size:10px;color:#64748b">Acquistato: €'+( cost.toLocaleString('it'))+' · '+m.lifeYears+' anni vita</div></div></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +'<div style="background:#0f172a;border-radius:9px;padding:10px;text-align:center"><div style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700">Fatturato Totale</div><div style="font-size:20px;font-weight:900;color:#10b981">€'+totalRev.toFixed(0)+'</div></div>'
        +'<div style="background:#0f172a;border-radius:9px;padding:10px;text-align:center"><div style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700">ROI</div><div style="font-size:20px;font-weight:900;color:'+(roi>=0?'#22c55e':'#ef4444')+'">'+roi+'%</div></div>'
        +'<div style="background:#0f172a;border-radius:9px;padding:10px;text-align:center"><div style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700">Questo Mese</div><div style="font-size:20px;font-weight:900;color:#3b82f6">€'+revM.toFixed(0)+'</div></div>'
        +'<div style="background:#0f172a;border-radius:9px;padding:10px;text-align:center"><div style="font-size:9px;color:#64748b;text-transform:uppercase;font-weight:700">Costo/h</div><div style="font-size:20px;font-weight:900;color:#f59e0b">€'+( (m.hourly+(m.energyHourly||m.energyH||0)).toFixed(2))+'</div></div>'
        +'</div></div>';
    }).join('');
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>ROI Macchinari</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;padding:24px;font-size:13px}'
      +'h1{font-size:18px;font-weight:900;margin-bottom:4px}'
      +'.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-top:20px}'
      +'</style></head><body>'
      +'<h1>🔧 ROI Macchinari</h1>'
      +'<p style="font-size:11px;color:#64748b">Analisi redditività per macchina basata sui preventivi salvati</p>'
      +'<div class="grid">'+(cards||'<div style="color:#64748b">Nessuna macchina configurata</div>')+'</div>'
      +'<button onclick="close()" style="margin-top:20px;padding:9px 18px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    w.document.close();
  }
};

// ─── FEATURE 14: Import Orders from Excel ────────────────────────
window.OrderImporter = {
  open:function(){
    var inp=document.createElement('input'); inp.type='file'; inp.accept='.xlsx,.xls,.csv';
    inp.onchange=function(){ var file=inp.files[0]; if(!file) return; window.OrderImporter._process(file); };
    inp.click();
  },
  _process:async function(file){
    try{
      var ext=file.name.split('.').pop().toLowerCase();
      var imported=[];
      if(ext==='csv'||ext==='txt'){
        var text=await file.text();
        var lines=text.split('\n').filter(function(l){return l.trim();});
        var hasHeader=lines[0]&&(lines[0].toLowerCase().includes('cliente')||lines[0].toLowerCase().includes('client')||lines[0].toLowerCase().includes('nome'));
        (hasHeader?lines.slice(1):lines).forEach(function(l){
          var parts=l.split(/[,;\t]/); if(parts.length<2) return;
          imported.push({id:Date.now()+Math.random(),client:(parts[0]||'').replace(/"/g,'').trim(),description:(parts[1]||'').replace(/"/g,'').trim(),total:parseFloat((parts[2]||'').replace(/[^0-9.,]/g,'').replace(',','.'))||0,status:(parts[3]||'draft').replace(/"/g,'').trim().toLowerCase()||'draft',created:new Date().toISOString()});
        });
      } else {
        if(typeof XLSX==='undefined'){if(typeof toast!=='undefined') toast('Libreria XLSX non disponibile','error');return;}
        var buf=await file.arrayBuffer();
        var wb=XLSX.read(buf,{type:'array'});
        var ws=wb.Sheets[wb.SheetNames[0]];
        var json=XLSX.utils.sheet_to_json(ws,{defval:''});
        json.forEach(function(row){
          var keys=Object.keys(row);
          var cli=row.Cliente||row.Client||row.Nome||row.Name||row[keys[0]]||'';
          var desc=row.Descrizione||row.Description||row.Prodotto||row[keys[1]]||'';
          var tot=parseFloat(String(row.Totale||row.Total||row.Importo||row[keys[2]]||0).replace(/[^0-9.]/g,''))||0;
          if(cli) imported.push({id:Date.now()+Math.random(),client:String(cli).trim(),description:String(desc).trim(),total:tot,status:'draft',created:new Date().toISOString()});
        });
      }
      if(!imported.length){if(typeof toast!=='undefined') toast('Nessun ordine trovato nel file','error');return;}
      /* Gli ordini importati finivano in `ingly_orders_pro_v1`, che Ordini non
         legge: un import riuscito lasciava la sezione Ordini vuota. Ora si
         scrive nello store canonico, uno per volta, e si conta quanti sono
         entrati davvero invece di annunciare il totale del file. */
      if(!(window.InglyMigrazioneOrderTracker && window.IDB)){
        if(typeof toast!=='undefined') toast('Import non disponibile: archivio ordini non pronto','error');
        return;
      }
      var scritti=0, falliti=0;
      for(var i=0;i<imported.length;i++){
        try{
          var esito=await window.InglyMigrazioneOrderTracker.aggiungi(window.IDB, imported[i]);
          if(esito&&esito.creato) scritti++;
        }catch(e){ falliti++; if(window.Ingly&&window.Ingly.Errors) window.Ingly.Errors.log('import ordini', e); }
      }
      if(typeof toast!=='undefined'){
        toast('📥 Importati '+scritti+' ordini da '+file.name+(falliti?' · '+falliti+' non salvati':''), falliti?'warning':'success');
      }
      try{ if(window.App&&App.navigate) App.navigate('gestione_ordini'); }catch(e){}
    }catch(e){if(typeof toast!=='undefined') toast('Errore importazione: '+e.message,'error');}
  }
};

// Add Order Import + ROI + QR buttons to nav
(function _addNavActions(){
  function _p(){
    if(!document.getElementById('html-root')){setTimeout(_p,600);return;}
    if(document.getElementById('v28-extra-btns')) return;
    /* Qui si iniettava, due secondi dopo il caricamento, una seconda voce
       «📋 Ordini» verso `order_tracker`: stessa etichetta della sezione
       Ordini vera, e un archivio diverso da leggere. La gerarchia del menu
       la definisce src/app-shell/nav-map.js, dove `order_tracker` è un alias
       verso Ordini. La rotta resta valida, la voce doppia no. */
  }
  setTimeout(_p,2000);
})();

console.log('[v28-P2] QuoteGen · GlobalSearch · Voice · CRMStats · QR · MultiLang · PriceHistory · ROI · OrderImport loaded');


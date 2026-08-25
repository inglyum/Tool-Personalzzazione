
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v60 — CATALOGO MACCHINE ENTERPRISE (predefinito, estendibile)
   Dataset reale di macchine 2026 (laser CO2/fibra/diodo, UV, DTF, sublimazione,
   CNC). Si importa nel parco macchine esistente (store 'equipment' = Single
   Source of Truth). Additivo: non tocca Equipment/quoter esistenti.
   Ogni campo è modificabile dall'utente dopo l'import (database dinamico).
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  // Modello record enterprise (compatibile con lo store 'equipment' esistente):
  // { name, brand, model, tech, category, powerW, speed, workArea, costBuy,
  //   costHour, hoursLife, materials, note, active, _fromCatalog }
  var C = [
    // ── LASER CO₂ ──────────────────────────────────────────────
    {brand:'xTool', model:'P2 55W', tech:'CO₂', powerW:55, workArea:'600×308mm', speed:'600mm/s', costBuy:4499, costHour:0.20, materials:'Legno, MDF, plexi, pelle, vetro, ardesia', category:'Laser CO₂'},
    {brand:'xTool', model:'P2S 55W', tech:'CO₂', powerW:55, workArea:'600×308mm', speed:'600mm/s', costBuy:4999, costHour:0.20, materials:'Legno, plexi, pelle, vetro', category:'Laser CO₂'},
    {brand:'Aeon', model:'MIRA 7 Pro', tech:'CO₂', powerW:60, workArea:'700×500mm', speed:'800mm/s', costBuy:6900, costHour:0.22, materials:'Legno, acrilico, pelle, carta, gomma', category:'Laser CO₂'},
    {brand:'Thunder Laser', model:'Nova 35 (80W)', tech:'CO₂', powerW:80, workArea:'900×600mm', speed:'1000mm/s', costBuy:8900, costHour:0.26, materials:'Legno, acrilico, pelle, tessuto', category:'Laser CO₂'},
    {brand:'OMTech', model:'Pro 2440 (100W)', tech:'CO₂', powerW:100, workArea:'600×1000mm', speed:'900mm/s', costBuy:4200, costHour:0.24, materials:'Legno, acrilico, vetro, ardesia', category:'Laser CO₂'},
    {brand:'Glowforge', model:'Pro', tech:'CO₂', powerW:45, workArea:'495×279mm', speed:'—', costBuy:6995, costHour:0.30, materials:'Legno, acrilico, pelle, carta', category:'Laser CO₂'},
    {brand:'Trotec', model:'Speedy 400 (120W)', tech:'CO₂', powerW:120, workArea:'1000×610mm', speed:'3550mm/s', costBuy:32000, costHour:0.45, materials:'Legno, acrilico, pelle, gomma, film', category:'Laser CO₂'},
    {brand:'Epilog', model:'Fusion Pro 36', tech:'CO₂', powerW:80, workArea:'914×610mm', speed:'—', costBuy:28000, costHour:0.42, materials:'Legno, acrilico, pelle, vetro', category:'Laser CO₂'},
    {brand:'Boss Laser', model:'LS-1630 (90W)', tech:'CO₂', powerW:90, workArea:'760×400mm', speed:'—', costBuy:7500, costHour:0.25, materials:'Legno, acrilico, pelle', category:'Laser CO₂'},
    {brand:'Monport', model:'GA 100W', tech:'CO₂', powerW:100, workArea:'700×500mm', speed:'—', costBuy:3800, costHour:0.23, materials:'Legno, acrilico, vetro', category:'Laser CO₂'},
    {brand:'Gweike', model:'Cloud Pro II (55W)', tech:'CO₂', powerW:55, workArea:'600×300mm', speed:'—', costBuy:4200, costHour:0.20, materials:'Legno, acrilico, pelle', category:'Laser CO₂'},
    // ── LASER FIBRA / MOPA ─────────────────────────────────────
    {brand:'xTool', model:'F1 (MOPA 2W + diodo)', tech:'Fibra/MOPA', powerW:20, workArea:'115×115mm', speed:'4000mm/s', costBuy:1899, costHour:0.15, materials:'Metalli, plastica, colore su acciaio', category:'Laser Fibra/MOPA'},
    {brand:'xTool', model:'F2 Ultra (MOPA 60W)', tech:'Fibra/MOPA', powerW:60, workArea:'220×220mm', speed:'15000mm/s', costBuy:4499, costHour:0.22, materials:'Metalli, acciaio colore, plastica', category:'Laser Fibra/MOPA'},
    {brand:'Monport', model:'GPRO 30W MOPA', tech:'Fibra/MOPA', powerW:30, workArea:'150×150mm', speed:'—', costBuy:3200, costHour:0.18, materials:'Metalli, acciaio inox, alluminio', category:'Laser Fibra/MOPA'},
    {brand:'OMTech', model:'Fiber 30W', tech:'Fibra', powerW:30, workArea:'110×110mm', speed:'—', costBuy:2600, costHour:0.16, materials:'Metalli, incisione profonda', category:'Laser Fibra/MOPA'},
    // ── LASER DIODO ────────────────────────────────────────────
    {brand:'xTool', model:'S1 (40W diodo)', tech:'Diodo', powerW:40, workArea:'498×319mm', speed:'600mm/s', costBuy:2699, costHour:0.12, materials:'Legno, MDF, pelle, acrilico scuro', category:'Laser Diodo'},
    {brand:'Atomstack', model:'X70 Max (35W)', tech:'Diodo', powerW:35, workArea:'400×400mm', speed:'—', costBuy:1099, costHour:0.10, materials:'Legno, pelle, acrilico, metallo verniciato', category:'Laser Diodo'},
    {brand:'Sculpfun', model:'S30 Ultra 33W', tech:'Diodo', powerW:33, workArea:'600×600mm', speed:'—', costBuy:900, costHour:0.10, materials:'Legno, pelle, acrilico', category:'Laser Diodo'},
    {brand:'Ortur', model:'Laser Master 3 (10W)', tech:'Diodo', powerW:10, workArea:'400×400mm', speed:'—', costBuy:520, costHour:0.08, materials:'Legno, pelle, carta', category:'Laser Diodo'},
    {brand:'LaserPecker', model:'LP4', tech:'Diodo+Fibra', powerW:10, workArea:'160×120mm', speed:'—', costBuy:1699, costHour:0.12, materials:'Metalli + legno/pelle (dual)', category:'Laser Diodo'},
    // ── STAMPA UV ──────────────────────────────────────────────
    {brand:'Roland', model:'VersaUV LEF2-200', tech:'Stampa UV', powerW:0, workArea:'508×330mm', speed:'—', costBuy:24000, costHour:0.55, materials:'Plexi, legno, metallo, gadget rigidi', category:'Stampa UV'},
    {brand:'Mimaki', model:'UJF-3042 MkII e', tech:'Stampa UV', powerW:0, workArea:'300×420mm', speed:'—', costBuy:33000, costHour:0.60, materials:'Oggetti rigidi, gadget, plexi', category:'Stampa UV'},
    {brand:'xTool', model:'UV Printer A3', tech:'Stampa UV', powerW:0, workArea:'A3', speed:'—', costBuy:3999, costHour:0.35, materials:'Plexi, legno, metallo, gadget', category:'Stampa UV'},
    // ── DTF ────────────────────────────────────────────────────
    {brand:'Epson', model:'SureColor F2270 (DTG/DTF)', tech:'DTF', powerW:0, workArea:'—', speed:'—', costBuy:19000, costHour:0.40, materials:'Tessuti, film DTF', category:'DTF'},
    {brand:'Brother', model:'GTX pro', tech:'DTF/DTG', powerW:0, workArea:'—', speed:'—', costBuy:22000, costHour:0.42, materials:'Tessuti, capi scuri/chiari', category:'DTF'},
    {brand:'Generic', model:'DTF A3 + forno', tech:'DTF', powerW:0, workArea:'A3', speed:'—', costBuy:2500, costHour:0.30, materials:'Film DTF, polvere hot-melt, tessuti', category:'DTF'},
    // ── SUBLIMAZIONE ───────────────────────────────────────────
    {brand:'Sawgrass', model:'SG1000', tech:'Sublimazione', powerW:0, workArea:'A3+', speed:'—', costBuy:1500, costHour:0.20, materials:'MDF sublimatico, tazze, tessuti poliestere', category:'Sublimazione'},
    {brand:'Epson', model:'SureColor F170', tech:'Sublimazione', powerW:0, workArea:'A4', speed:'—', costBuy:600, costHour:0.15, materials:'Carta sub, tazze, gadget poliestere', category:'Sublimazione'},
    {brand:'Mutoh', model:'ValueJet 628', tech:'Sublimazione', powerW:0, workArea:'625mm rullo', speed:'—', costBuy:8000, costHour:0.30, materials:'Tessuti, bandiere, grande formato', category:'Sublimazione'},
    // ── CNC ────────────────────────────────────────────────────
    {brand:'Snapmaker', model:'Artisan 3-in-1', tech:'CNC/Laser/3D', powerW:0, workArea:'400×400×400mm', speed:'—', costBuy:2999, costHour:0.18, materials:'Legno, acrilico, alluminio soft', category:'CNC'},
    {brand:'Creality', model:'CNC Falcon2', tech:'CNC', powerW:0, workArea:'400×400mm', speed:'—', costBuy:1200, costHour:0.14, materials:'Legno, PCB, alluminio', category:'CNC'},
    {brand:'Flux', model:'Beamo/Beambox', tech:'CO₂+CNC', powerW:50, workArea:'400×375mm', speed:'—', costBuy:3900, costHour:0.20, materials:'Legno, acrilico, pelle', category:'Laser CO₂'},
  ];

  var MachineCatalog = {
    CATALOG: C,
    _sel: {},
    _filter: '',
    _cat: 'Tutte',
    cats: function(){ var s=['Tutte']; C.forEach(function(m){ if(s.indexOf(m.category)<0)s.push(m.category); }); return s; },

    open: function(){
      var ov=document.createElement('div'); ov.id='mcat-ov';
      ov.style.cssText='position:fixed;inset:0;background:#000b;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px';
      ov.innerHTML='<div style="background:var(--bg-card);border:1px solid var(--border2);border-radius:16px;width:920px;max-width:96vw;max-height:92vh;display:flex;flex-direction:column;overflow:hidden">'
        +'<div style="padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px">'
          +'<div style="flex:1"><div style="font-size:16px;font-weight:800">🏭 Catalogo Macchine Enterprise</div>'
          +'<div style="font-size:12px;color:var(--text-muted)">'+C.length+' macchine reali · seleziona e aggiungi al tuo parco (poi personalizzabili)</div></div>'
          +'<button onclick="document.getElementById(\'mcat-ov\').remove()" class="btn btn-secondary btn-sm">Chiudi</button></div>'
        +'<div style="padding:12px 20px;border-bottom:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
          +'<input id="mcat-search" placeholder="🔍 Cerca marca o modello..." oninput="MachineCatalog._onSearch(this.value)" style="flex:1;min-width:180px;padding:8px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:13px">'
          +'<div id="mcat-cats" style="display:flex;gap:6px;flex-wrap:wrap"></div></div>'
        +'<div id="mcat-list" style="flex:1;overflow-y:auto;padding:14px 20px;display:grid;grid-template-columns:1fr 1fr;gap:10px"></div>'
        +'<div style="padding:14px 20px;border-top:1px solid var(--border);display:flex;align-items:center;gap:12px">'
          +'<div id="mcat-count" style="flex:1;font-size:13px;color:var(--text-muted)">0 selezionate</div>'
          +'<button onclick="MachineCatalog._import()" class="btn btn-primary">➕ Aggiungi al parco macchine</button></div>'
        +'</div>';
      ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
      document.body.appendChild(ov);
      this._renderCats(); this._renderList();
    },
    _onSearch: function(v){ this._filter=(v||'').toLowerCase(); this._renderList(); },
    _renderCats: function(){
      var el=document.getElementById('mcat-cats'); if(!el) return; var self=this;
      el.innerHTML=this.cats().map(function(c){
        var on=c===self._cat;
        return '<button onclick="MachineCatalog._setCat(\''+c+'\')" style="padding:6px 12px;border-radius:99px;border:1px solid '+(on?'var(--primary)':'var(--border)')+';background:'+(on?'var(--primary-dim)':'transparent')+';color:'+(on?'var(--primary)':'var(--text-muted)')+';font-size:12px;font-weight:700;cursor:pointer">'+c+'</button>';
      }).join('');
    },
    _setCat: function(c){ this._cat=c; this._renderCats(); this._renderList(); },
    _renderList: function(){
      var el=document.getElementById('mcat-list'); if(!el) return; var self=this;
      var list=C.filter(function(m){
        var okCat=self._cat==='Tutte'||m.category===self._cat;
        var okQ=!self._filter||(m.brand+' '+m.model+' '+m.tech).toLowerCase().indexOf(self._filter)>=0;
        return okCat&&okQ;
      });
      el.innerHTML=list.map(function(m){
        var key=m.brand+'|'+m.model; var sel=!!self._sel[key];
        return '<div onclick="MachineCatalog._toggle(\''+key.replace(/'/g,"\\'")+'\')" style="background:'+(sel?'var(--primary-dim)':'var(--bg-card2)')+';border:1.5px solid '+(sel?'var(--primary)':'var(--border)')+';border-radius:11px;padding:12px;cursor:pointer;transition:.14s">'
          +'<div style="display:flex;align-items:start;gap:8px"><div style="flex:1">'
          +'<div style="font-size:13px;font-weight:800">'+m.brand+' '+m.model+'</div>'
          +'<div style="font-size:11px;color:var(--text-muted);margin:2px 0">'+m.tech+(m.powerW?' · '+m.powerW+'W':'')+' · '+m.workArea+'</div>'
          +'<div style="font-size:11px;color:var(--text-dim)">'+m.materials+'</div>'
          +'<div style="font-size:12px;font-weight:700;color:var(--primary);margin-top:5px;font-variant-numeric:tabular-nums">€'+m.costBuy.toLocaleString('it')+' · €'+m.costHour.toFixed(2)+'/h</div>'
          +'</div><div style="font-size:16px">'+(sel?'✅':'➕')+'</div></div></div>';
      }).join('')||'<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:30px">Nessuna macchina trovata</div>';
    },
    _toggle: function(key){ if(this._sel[key])delete this._sel[key]; else this._sel[key]=1; this._renderList();
      var n=Object.keys(this._sel).length; var c=document.getElementById('mcat-count'); if(c)c.textContent=n+' selezionate'; },
    _import: async function(){
      var keys=Object.keys(this._sel);
      if(!keys.length){ if(typeof toast!=='undefined')toast('Seleziona almeno una macchina','warning'); return; }
      var added=0;
      for(var i=0;i<C.length;i++){ var m=C[i]; var key=m.brand+'|'+m.model; if(!this._sel[key]) continue;
        var rec={ id:Date.now()+i, name:m.brand+' '+m.model, brand:m.brand, model:m.model, tech:m.tech,
          category:m.category, powerW:m.powerW, speed:m.speed, workArea:m.workArea, costBuy:m.costBuy,
          costHour:m.costHour, hoursLife:20000, hoursWorked:0, materials:m.materials, note:'', status:'attiva',
          active:true, _fromCatalog:true, createdAt:new Date().toISOString() };
        try{ await IDB.put('equipment', rec); added++; }catch(e){}
      }
      if(typeof AppStore!=='undefined'&&AppStore.invalidate) AppStore.invalidate('equipment');
      this._sel={};
      if(typeof toast!=='undefined') toast('✅ '+added+' macchine aggiunte al parco (Attrezzature/Equipment)','success');
      document.getElementById('mcat-ov')&&document.getElementById('mcat-ov').remove();
      // refresh sezione Equipment se visibile
      try{ if(typeof Equipment!=='undefined'&&Equipment.render&&document.getElementById('view-equipment')&&document.getElementById('view-equipment').classList.contains('active')) Equipment.render(); }catch(e){}
    }
  };
  window.MachineCatalog = MachineCatalog;

  // Aggancio: bottone "Catalogo Macchine" nella sezione Equipment (additivo, non invasivo)
  function injectBtn(){
    var view=document.getElementById('view-equipment'); if(!view) return setTimeout(injectBtn,1200);
    if(view.querySelector('#mcat-open-btn')) return;
    // inserisci nel module-header actions se c'è, altrimenti in cima
    var actions=view.querySelector('.module-actions')||view.querySelector('.module-header');
    var b=document.createElement('button'); b.id='mcat-open-btn'; b.className='btn btn-primary btn-sm';
    b.innerHTML='🏭 Catalogo Macchine'; b.onclick=function(){ MachineCatalog.open(); };
    if(actions) actions.appendChild(b);
  }
  // riprova all'attivazione della sezione
  if(typeof Bus!=='undefined'&&Bus.on) Bus.on('nav:equipment', function(){ setTimeout(injectBtn,300); });
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(injectBtn,2000); });
})();

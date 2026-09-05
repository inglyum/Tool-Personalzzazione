
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v62 — SCHEDA MACCHINA ENTERPRISE (dettaglio completo + autosave)
   Vista ricca di un record 'equipment': specifiche, costi, uso, manutenzione,
   documenti/foto, note. Autosalvataggio ad ogni modifica. Additivo.
   Apribile da: bottone "📋 Scheda Macchina" nella sezione Attrezzature.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  var TECHS=['CO₂','Fibra/MOPA','Diodo','Stampa UV','DTF','Sublimazione','CNC','Altro'];
  var STATI=[['attiva','🟢 Attiva'],['manutenzione','🟠 In manutenzione'],['ferma','⚪ Ferma'],['dismessa','⚫ Dismessa']];

  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function eur(n){ n=parseFloat(n)||0; return '€'+n.toLocaleString('it',{minimumFractionDigits:0,maximumFractionDigits:2}); }

  var MachineCard = {
    _m:null, _tab:'spec',
    async openPicker(){
      var list=await IDB.getAll('equipment').catch(function(){return [];});
      var ov=this._overlay('mc-pick');
      ov.querySelector('.mc-box').innerHTML=
        '<div class="mc-head"><div style="flex:1"><div class="mc-title">📋 Schede Macchine</div>'
        +'<div class="mc-sub">'+list.length+' macchine nel parco · clicca per aprire la scheda</div></div>'
        +'<button class="btn btn-secondary btn-sm" onclick="MachineCard._close()">Chiudi</button></div>'
        +'<div class="mc-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +(list.length?list.map(function(m){
          return '<div onclick="MachineCard.open('+JSON.stringify(m.id)+')" style="background:var(--bg-card2);border:1px solid var(--border);border-radius:11px;padding:13px;cursor:pointer;transition:.14s" onmouseover="this.style.borderColor=\'var(--primary)\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
            +'<div style="font-weight:800;font-size:13px">'+esc(m.name||m.brand||'Macchina')+'</div>'
            +'<div style="font-size:11px;color:var(--text-muted);margin-top:2px">'+esc(m.tech||'')+(m.workArea?' · '+esc(m.workArea):'')+'</div>'
            +'<div style="font-size:11px;color:var(--text-dim);margin-top:4px">'+(m.status||'attiva')+'</div></div>';
        }).join(''):'<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:30px">Nessuna macchina. Aggiungile dal 🏭 Catalogo Macchine.</div>')
        +'</div></div>';
    },
    async open(id){
      var m=await IDB.get('equipment', id).catch(function(){return null;});
      if(!m){ if(typeof toast!=='undefined')toast('Macchina non trovata','warning'); return; }
      this._m=m; this._tab='spec';
      this._render();
    },
    _render(){
      var ov=document.getElementById('mc-ov')||this._overlay('mc-ov');
      var m=this._m;
      var tabs=[['spec','⚙️ Specifiche'],['cost','💶 Costi'],['use','⏱ Uso'],['maint','🔧 Manutenzione'],['docs','📎 Note & Foto']];
      ov.querySelector('.mc-box').innerHTML=
        '<div class="mc-head">'
          +(m.photo?'<img src="'+esc(m.photo)+'" style="width:44px;height:44px;border-radius:10px;object-fit:cover">':'<div style="width:44px;height:44px;border-radius:10px;background:var(--primary-dim);display:flex;align-items:center;justify-content:center;font-size:22px">🖨️</div>')
          +'<div style="flex:1"><div class="mc-title">'+esc(m.name||'Macchina')+'</div>'
          +'<div class="mc-sub">'+esc(m.brand||'')+(m.model?' · '+esc(m.model):'')+' · '+esc(m.tech||'')+'</div></div>'
          +'<button class="btn btn-secondary btn-sm" onclick="MachineCard._close()">Chiudi</button></div>'
        +'<div class="mc-tabs">'+tabs.map(function(t){ return '<button class="mc-tab'+(MachineCard._tab===t[0]?' on':'')+'" onclick="MachineCard._go(\''+t[0]+'\')">'+t[1]+'</button>'; }).join('')+'</div>'
        +'<div class="mc-body" id="mc-tabbody"></div>';
      this._renderTab();
    },
    _go(t){ this._tab=t; this._renderTab(); document.querySelectorAll('.mc-tab').forEach(function(b){ b.classList.toggle('on', b.textContent.indexOf(({spec:'Specifiche',cost:'Costi',use:'Uso',maint:'Manutenzione',docs:'Note'})[t])>=0); }); },
    _renderTab(){
      var m=this._m, el=document.getElementById('mc-tabbody'); if(!el) return;
      var F=function(label,key,type,opts){
        type=type||'text';
        if(type==='select'){ return '<label class="mc-f"><span>'+label+'</span><select onchange="MachineCard._set(\''+key+'\',this.value)">'+opts.map(function(o){var v=Array.isArray(o)?o[0]:o,l=Array.isArray(o)?o[1]:o;return '<option value="'+esc(v)+'"'+((m[key]||'')==v?' selected':'')+'>'+esc(l)+'</option>';}).join('')+'</select></label>'; }
        if(type==='textarea'){ return '<label class="mc-f mc-full"><span>'+label+'</span><textarea rows="3" oninput="MachineCard._set(\''+key+'\',this.value)">'+esc(m[key]||'')+'</textarea></label>'; }
        return '<label class="mc-f"><span>'+label+'</span><input type="'+type+'" value="'+esc(m[key]==null?'':m[key])+'" oninput="MachineCard._set(\''+key+'\',this.value)"></label>';
      };
      if(this._tab==='spec'){
        el.innerHTML='<div class="mc-grid">'
          +F('Nome','name')+F('Marca','brand')+F('Modello','model')
          +F('Tecnologia','tech','select',TECHS)+F('Categoria','category')
          +F('Potenza (W)','powerW','number')+F('Area di lavoro','workArea')+F('Velocità','speed')
          +F('Materiali compatibili','materials','textarea')+'</div>';
      } else if(this._tab==='cost'){
        var dep=(parseFloat(m.costBuy)||0)/(parseFloat(m.lifeYears)||6)/1650;
        el.innerHTML='<div class="mc-grid">'
          +F('Costo acquisto (€)','costBuy','number')+F('Anni di vita','lifeYears','number')
          +F('Costo manutenzione/anno (€)','costMaint','number')+F('Costo consumabili/h (€)','costConsum','number')
          +'</div><div style="margin-top:12px;padding:12px;background:var(--bg-card2);border-radius:10px;font-size:13px">'
          +'💡 Costo macchina stimato: <strong style="color:var(--primary)">'+eur(dep)+'/h</strong> di deprezzamento '
          +'<span style="color:var(--text-muted)">(usato automaticamente nei quoter via SSOT)</span></div>';
      } else if(this._tab==='use'){
        el.innerHTML='<div class="mc-grid">'
          +F('Stato','status','select',STATI)+F('Operatore assegnato','operator')
          +F('Ore di vita (h)','hoursLife','number')+F('Ore lavorate (h)','hoursWorked','number')
          /* Le ore al giorno che questa macchina può davvero produrre: è il
             dato da cui la vista Produzione calcola capacità e residua. Senza,
             quella macchina resta fuori dal conto e lo dichiara — meglio di
             una capacità presunta uguale per tutte. */
          +F('Ore al giorno (h)','hoursPerDay','number')+F('Ore attese/anno (h)','expectedAnnualHours','number')
          +F('Posizione','location')+F('Seriale (S/N)','serial')
          +F('Data acquisto','purchaseDate','date')+F('Garanzia fino a','warranty','date')+'</div>';
      } else if(this._tab==='maint'){
        var log=Array.isArray(m.maintLog)?m.maintLog:[];
        el.innerHTML='<div style="display:flex;gap:8px;margin-bottom:12px">'
          +'<input id="mc-maint-in" placeholder="Descrizione intervento (es. pulizia lente, cambio tubo)" style="flex:1;padding:9px 12px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:13px">'
          +'<input id="mc-maint-cost" type="number" placeholder="€" style="width:90px;padding:9px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:13px">'
          +'<button class="btn btn-primary btn-sm" onclick="MachineCard._addMaint()">+ Registra</button></div>'
          +'<div style="display:flex;flex-direction:column;gap:8px">'
          +(log.length?log.slice().reverse().map(function(x,idx){
            return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg-card2);border-radius:9px">'
              +'<div style="flex:1"><div style="font-size:13px">'+esc(x.desc)+'</div><div style="font-size:11px;color:var(--text-dim)">'+esc(x.date)+'</div></div>'
              +'<div style="font-weight:700;color:var(--primary);font-variant-numeric:tabular-nums">'+eur(x.cost)+'</div>'
              +'<button onclick="MachineCard._delMaint('+(log.length-1-idx)+')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px">🗑</button></div>';
          }).join(''):'<div style="text-align:center;color:var(--text-muted);padding:24px;font-size:13px">Nessun intervento registrato</div>')
          +'</div>';
      } else if(this._tab==='docs'){
        el.innerHTML='<div class="mc-grid">'
          +'<label class="mc-f mc-full"><span>Foto (URL o carica)</span><div style="display:flex;gap:8px">'
          +'<input type="text" value="'+esc(m.photo||'')+'" placeholder="https://... oppure carica →" oninput="MachineCard._set(\'photo\',this.value)" style="flex:1">'
          +'<label class="btn btn-secondary btn-sm" style="cursor:pointer">📷 Carica<input type="file" accept="image/*" style="display:none" onchange="MachineCard._upPhoto(this)"></label></div></label>'
          +F('Link produttore','vendorUrl','text')
          +F('Note','note','textarea')+'</div>'
          +(m.photo?'<img src="'+esc(m.photo)+'" style="margin-top:12px;max-height:180px;border-radius:11px;border:1px solid var(--border)">':'');
      }
    },
    _set(key,val){
      if(!this._m) return;
      if(['powerW','costBuy','lifeYears','costMaint','costConsum','hoursLife','hoursWorked'].indexOf(key)>=0) val=(val===''?'':parseFloat(val));
      this._m[key]=val;
      this._save();
    },
    _addMaint(){
      var d=document.getElementById('mc-maint-in'), c=document.getElementById('mc-maint-cost');
      if(!d||!d.value.trim()) return;
      if(!Array.isArray(this._m.maintLog)) this._m.maintLog=[];
      this._m.maintLog.push({ date:new Date().toLocaleDateString('it-IT'), desc:d.value.trim(), cost:parseFloat(c.value)||0 });
      this._save(); this._renderTab();
    },
    _delMaint(i){ if(Array.isArray(this._m.maintLog)){ this._m.maintLog.splice(i,1); this._save(); this._renderTab(); } },
    _upPhoto(inp){
      var f=inp.files&&inp.files[0]; if(!f) return;
      var r=new FileReader(); var self=this;
      r.onload=function(){ self._m.photo=r.result; self._save(); self._renderTab(); };
      r.readAsDataURL(f);
    },
    async _save(){
      if(!this._m) return;
      this._m._updatedAt=new Date().toISOString();
      try{ await IDB.put('equipment', this._m); }catch(e){}
      if(typeof AppStore!=='undefined'&&AppStore.invalidate) AppStore.invalidate('equipment');
      // SSOT: aggiorna i quoter
      try{ if(window.MachineHub) MachineHub.sync(); }catch(e){}
      try{ if(typeof Bus!=='undefined'&&Bus.emit) Bus.emit('equipment:changed'); }catch(e){}
    },
    _overlay(id){
      var ov=document.getElementById(id); if(ov) return ov;
      ov=document.createElement('div'); ov.id=id; ov.className='mc-ov';
      ov.style.cssText='position:fixed;inset:0;background:#000b;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px';
      ov.innerHTML='<div class="mc-box" style="background:var(--bg-card);border:1px solid var(--border2);border-radius:16px;width:760px;max-width:96vw;max-height:92vh;display:flex;flex-direction:column;overflow:hidden"></div>';
      ov.addEventListener('click',function(e){ if(e.target===ov) ov.remove(); });
      document.body.appendChild(ov); return ov;
    },
    _close(){ document.querySelectorAll('.mc-ov').forEach(function(o){o.remove();}); }
  };
  window.MachineCard = MachineCard;

  // Stili modale (scoping mc-)
  var st=document.createElement('style'); st.textContent=
    '.mc-head{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--border)}'
    +'.mc-title{font-size:16px;font-weight:800}.mc-sub{font-size:12px;color:var(--text-muted)}'
    +'.mc-tabs{display:flex;gap:4px;padding:10px 16px;border-bottom:1px solid var(--border);overflow-x:auto}'
    +'.mc-tab{padding:7px 13px;border-radius:8px;border:none;background:transparent;color:var(--text-muted);font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap;font-family:inherit}'
    +'.mc-tab.on{background:var(--primary-dim);color:var(--primary)}'
    +'.mc-body{padding:18px 20px;overflow-y:auto}'
    +'.mc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}'
    +'.mc-f{display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--text-muted);font-weight:600}'
    +'.mc-f.mc-full{grid-column:1/-1}'
    +'.mc-f input,.mc-f select,.mc-f textarea{padding:9px 11px;background:var(--bg-card2);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:13px;font-family:inherit}'
    +'.mc-f input:focus,.mc-f select:focus,.mc-f textarea:focus{border-color:var(--primary);outline:none;box-shadow:0 0 0 3px var(--primary-dim)}'
    +'@media(max-width:640px){.mc-grid{grid-template-columns:1fr}}';
  document.head.appendChild(st);

  // Bottone nella sezione Attrezzature
  function injectBtn(){
    var view=document.getElementById('view-equipment'); if(!view) return setTimeout(injectBtn,1200);
    if(view.querySelector('#mc-open-btn')) return;
    var actions=view.querySelector('.module-actions')||view.querySelector('.module-header');
    var b=document.createElement('button'); b.id='mc-open-btn'; b.className='btn btn-secondary btn-sm';
    b.innerHTML='📋 Schede Macchine'; b.onclick=function(){ MachineCard.openPicker(); };
    if(actions) actions.appendChild(b);
  }
  if(typeof Bus!=='undefined'&&Bus.on) Bus.on('nav:equipment', function(){ setTimeout(injectBtn,300); });
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(injectBtn,2200); });
})();

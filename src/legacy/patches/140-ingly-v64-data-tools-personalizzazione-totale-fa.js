
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v64 — DATA TOOLS / Personalizzazione totale (Fase 5)
   Per OGNI store IndexedDB: export (JSON/CSV), import (merge), duplica,
   archivia (soft), elimina, CAMPI CUSTOM e VISTE SALVATE (localStorage).
   Costruito sopra il Design System (Fase 4). Additivo: usa IDB/DS esistenti,
   non modifica gli store né la logica di business. CSP-safe, offline.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.DataTools && window.DataTools.__v64) return;
  var DBNAME='InglyMasterDB';
  var LS_F='ingly_customfields_', LS_V='ingly_views_';

  function toast(m,k){ try{ if(window.DS&&DS.toast) return DS.toast(m,k); }catch(e){} alert(m); }
  function lsGet(k,d){ try{ return JSON.parse(localStorage.getItem(k))||d; }catch(e){ return d; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }

  // Apertura read-only SENZA versione → non innesca upgrade
  var _dbP=null;
  function db(){ if(_dbP) return _dbP; _dbP=new Promise(function(res,rej){
    try{ var r=indexedDB.open(DBNAME); r.onsuccess=function(e){ res(e.target.result); };
      r.onerror=function(){ rej(r.error); }; }catch(e){ rej(e); } }); return _dbP; }

  function download(name, text, mime){
    try{ var blob=new Blob([text],{type:mime||'application/json'});
      var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name;
      document.body.appendChild(a); a.click();
      setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },400);
    }catch(e){ toast('Export fallito: '+e.message,'err'); }
  }
  function csvCell(v){ if(v==null) return ''; if(typeof v==='object') v=JSON.stringify(v);
    v=String(v); return /[",\n;]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; }

  var DataTools = {
    __v64:true,
    async stores(){
      var d=await db(); var names=Array.prototype.slice.call(d.objectStoreNames);
      var out=[];
      for(var i=0;i<names.length;i++){
        var n=names[i], kp='id', cnt=0;
        try{ var tx=d.transaction(n,'readonly'); var os=tx.objectStore(n); kp=os.keyPath||'id';
          cnt=await new Promise(function(r){ var rq=os.count(); rq.onsuccess=function(){ r(rq.result); }; rq.onerror=function(){ r(0); }; });
        }catch(e){}
        out.push({name:n, keyPath:kp, count:cnt});
      }
      return out.sort(function(a,b){ return b.count-a.count; });
    },
    async keyPathOf(store){ var d=await db(); try{ return d.transaction(store,'readonly').objectStore(store).keyPath||'id'; }catch(e){ return 'id'; } },
    all:function(store){ return IDB.getAll(store).catch(function(){ return []; }); },

    async exportJSON(store){ var rows=await this.all(store);
      download('ingly-'+store+'-'+Date.now()+'.json', JSON.stringify({store:store, exported:new Date().toISOString(), records:rows},null,2));
      toast(rows.length+' record esportati (JSON)','ok');
    },
    async exportCSV(store){ var rows=await this.all(store);
      if(!rows.length){ toast('Nessun record','info'); return; }
      var cols={}; rows.forEach(function(r){ Object.keys(r).forEach(function(k){ cols[k]=1; }); });
      cols=Object.keys(cols);
      var lines=[cols.join(';')];
      rows.forEach(function(r){ lines.push(cols.map(function(c){ return csvCell(r[c]); }).join(';')); });
      download('ingly-'+store+'-'+Date.now()+'.csv', '﻿'+lines.join('\n'), 'text/csv;charset=utf-8');
      toast(rows.length+' record esportati (CSV)','ok');
    },
    importFile:function(store){ var self=this;
      var inp=document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
      inp.onchange=function(){ var f=inp.files[0]; if(!f) return; var rd=new FileReader();
        rd.onload=async function(){ try{
          var data=JSON.parse(rd.result); var recs=Array.isArray(data)?data:(data.records||[]);
          if(!recs.length){ toast('File senza record','err'); return; }
          var n=await (IDB.putBulk?IDB.putBulk(store,recs):Promise.all(recs.map(function(r){ return IDB.put(store,r); })).then(function(a){return a.length;}));
          try{ if(window.AppStore&&AppStore.invalidate) AppStore.invalidate(store); }catch(e){}
          try{ if(window.Bus&&Bus.emit) Bus.emit(store+':changed'); }catch(e){}
          toast((n||recs.length)+' record importati in '+store,'ok');
        }catch(e){ toast('Import fallito: '+e.message,'err'); } };
        rd.readAsText(f); };
      inp.click();
    },
    async duplicate(store, key){ var d=await db(); var kp=await this.keyPathOf(store);
      var rec=await IDB.get(store,key); if(!rec){ toast('Record non trovato','err'); return; }
      var copy=JSON.parse(JSON.stringify(rec));
      if(kp==='id'){ delete copy.id; } else { copy[kp]=copy[kp]+'_copy_'+Date.now(); }
      if(copy.name) copy.name=copy.name+' (copia)';
      copy._dup=Date.now();
      await IDB.put(store,copy);
      try{ if(window.Bus&&Bus.emit) Bus.emit(store+':changed'); }catch(e){}
      toast('Record duplicato','ok'); return copy;
    },
    async setArchived(store, key, val){ var rec=await IDB.get(store,key); if(!rec) return;
      rec._archived=!!val; await IDB.put(store,rec);
      try{ if(window.Bus&&Bus.emit) Bus.emit(store+':changed'); }catch(e){}
      toast(val?'Archiviato':'Ripristinato','ok');
    },
    async remove(store, key){ if(IDB.del) await IDB.del(store,key); else if(IDB.remove) await IDB.remove(store,key);
      try{ if(window.Bus&&Bus.emit) Bus.emit(store+':changed'); }catch(e){}
      toast('Eliminato','ok');
    },

    // ── Campi custom (metadati per store) ──
    fields:function(store){ return lsGet(LS_F+store, []); },
    saveFields:function(store, arr){ lsSet(LS_F+store, arr||[]); },
    // ── Viste salvate ──
    views:function(store){ return lsGet(LS_V+store, []); },
    saveViews:function(store, arr){ lsSet(LS_V+store, arr||[]); },

    // ── UI: hub globale ──
    async hub(){
      var self=this; var list=await this.stores();
      var wrap=document.createElement('div');
      var intro=document.createElement('p'); intro.className='ds-hint';
      intro.textContent='Gestisci ogni archivio dati: esporta, importa, duplica, archivia, campi personalizzati e viste salvate.';
      intro.style.marginBottom='12px'; wrap.appendChild(intro);
      var cols=[
        {key:'name',label:'Archivio'},
        {key:'count',label:'Record'},
        {key:'act',label:'', render:function(r){ return DS.button('Apri',{size:'sm',variant:'ghost',onclick:function(){ modal.close(); self.openStore(r.name); }}); }}
      ];
      wrap.appendChild(DS.table(cols, list));
      var modal=DS.modal({title:'⚙️ Personalizzazione dati', body:wrap});
    },
    async openStore(store){
      var self=this; var rows=await this.all(store); var kp=await this.keyPathOf(store);
      var box=document.createElement('div');
      // Barra azioni globali
      var bar=document.createElement('div'); bar.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;';
      bar.appendChild(DS.button('Export JSON',{size:'sm',icon:'⬇',onclick:function(){ self.exportJSON(store); }}));
      bar.appendChild(DS.button('Export CSV',{size:'sm',icon:'⬇',onclick:function(){ self.exportCSV(store); }}));
      bar.appendChild(DS.button('Importa (merge)',{size:'sm',variant:'primary',icon:'⬆',onclick:function(){ self.importFile(store); }}));
      box.appendChild(bar);

      // Sezione campi custom
      var fh=document.createElement('div'); fh.style.cssText='font:700 13px inherit;margin:6px 0 8px;';
      fh.textContent='Campi personalizzati'; box.appendChild(fh);
      var fieldsWrap=document.createElement('div'); box.appendChild(fieldsWrap);
      function renderFields(){ fieldsWrap.textContent='';
        var fs=self.fields(store);
        if(!fs.length){ var e=document.createElement('div'); e.className='ds-hint'; e.textContent='Nessun campo custom.'; fieldsWrap.appendChild(e); }
        fs.forEach(function(f,i){ var chip=DS.badge(f.label+' · '+f.type,'muted');
          chip.style.cursor='pointer'; chip.title='Rimuovi'; chip.onclick=function(){ fs.splice(i,1); self.saveFields(store,fs); renderFields(); };
          chip.style.marginRight='6px'; fieldsWrap.appendChild(chip); });
      }
      renderFields();
      var addRow=document.createElement('div'); addRow.style.cssText='display:flex;gap:8px;align-items:flex-end;margin:10px 0 18px;flex-wrap:wrap;';
      var nameF=DS.field({label:'Nome campo',placeholder:'es. Fornitore'}); nameF.style.marginBottom='0';nameF.style.flex='1 1 140px';
      var typeF=DS.field({label:'Tipo',type:'select',options:[{value:'text',label:'Testo'},{value:'number',label:'Numero'},{value:'date',label:'Data'},{value:'bool',label:'Sì/No'}]}); typeF.style.marginBottom='0';
      var addB=DS.button('+ Campo',{size:'sm',variant:'ghost',onclick:function(){
        var lbl=nameF._input.value.trim(); if(!lbl){ toast('Inserisci un nome','err'); return; }
        var fs=self.fields(store); fs.push({key:lbl.toLowerCase().replace(/\s+/g,'_'),label:lbl,type:typeF._input.value});
        self.saveFields(store,fs); nameF._input.value=''; renderFields();
      }});
      addRow.appendChild(nameF); addRow.appendChild(typeF); addRow.appendChild(addB); box.appendChild(addRow);

      // Anteprima record (prime 30)
      var rh=document.createElement('div'); rh.style.cssText='font:700 13px inherit;margin:6px 0 8px;';
      rh.textContent='Record ('+rows.length+') — anteprima'; box.appendChild(rh);
      var preview=rows.slice(0,30);
      var rcols=[
        {key:kp,label:'ID',render:function(r){ return String(r[kp]!=null?r[kp]:''); }},
        {key:'name',label:'Nome',render:function(r){ return r.name||r.title||r.label||r.desc||'—'; }},
        {key:'st',label:'Stato',render:function(r){ return r._archived?DS.badge('Archiviato','red'):DS.badge('Attivo','green'); }},
        {key:'act',label:'',render:function(r){ var g=document.createElement('div'); g.style.cssText='display:flex;gap:6px;';
          g.appendChild(DS.button('Duplica',{size:'sm',variant:'ghost',onclick:function(){ self.duplicate(store,r[kp]); }}));
          g.appendChild(DS.button(r._archived?'Ripristina':'Archivia',{size:'sm',variant:'ghost',onclick:function(){ self.setArchived(store,r[kp],!r._archived); }}));
          return g; }}
      ];
      box.appendChild(DS.table(rcols, preview));
      if(rows.length>30){ var more=document.createElement('div'); more.className='ds-hint'; more.style.marginTop='8px';
        more.textContent='… e altri '+(rows.length-30)+' record. Usa Export per l\'elenco completo.'; box.appendChild(more); }

      DS.modal({title:'Archivio: '+store, body:box});
    }
  };
  window.DataTools = DataTools;

  // ── Aggancio UI: pulsante "⚙️ Personalizza dati" in Impostazioni e Backup ──
  function injectBtn(){
    ['view-settings','view-backup'].forEach(function(vid){
      var view=document.getElementById(vid); if(!view) return;
      if(view.querySelector('#dt-hub-btn')) return;
      var host=view.querySelector('.module-actions')||view.querySelector('.module-header')||view;
      var b=document.createElement('button'); b.id='dt-hub-btn'; b.className='btn btn-secondary btn-sm ds-btn';
      b.innerHTML='⚙️ Personalizza dati'; b.style.margin='8px 0';
      b.onclick=function(){ DataTools.hub(); };
      host.appendChild(b);
    });
  }
  if(typeof Bus!=='undefined'&&Bus.on){ Bus.on('nav:settings',function(){ setTimeout(injectBtn,300); }); Bus.on('nav:backup',function(){ setTimeout(injectBtn,300); }); }
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(injectBtn,2400); });
})();

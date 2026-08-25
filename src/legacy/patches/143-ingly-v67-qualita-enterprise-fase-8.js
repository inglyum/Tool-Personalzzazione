
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v67 — QUALITÀ ENTERPRISE (Fase 8)
   • Audit Log: traccia (silenziosamente, solo dopo il boot) le scritture su
     IndexedDB — store, chiave, operazione, ora — per una cronologia leggibile.
   • Checkpoint / Ripristino: "punti di ripristino" dell'intero dataset =
     undo affidabile a livello di dati (evita l'undo per-scrittura, inaffidabile
     e rischioso durante il boot). Salvati nello store 'backups'.
   • A11y/WCAG: skip-link, regione aria-live per i toast.
   • DS.virtualList: rendering a finestra per liste lunghe (riuso futuro).
   Wrapper NON bloccanti e difensivi: ogni errore ricade sul comportamento
   originale, il database non è mai a rischio. Additivo, offline, CSP-safe.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.AuditLog && window.AuditLog.__v67) return;

  // Store ad alta frequenza / di sistema: esclusi dall'audit
  var SKIP={ kpi_cache:1, kpi_snap:1, scan_history:1, order_events:1, audit_log:1,
    backups:1, settings:1, sessions:1, _meta:1 };
  function toast(m,k){ try{ if(window.DS&&DS.toast) return DS.toast(m,k); }catch(e){} }
  function eur(){ }

  var AuditLog = {
    __v67:true,
    _armed:false,        // registra solo dopo il boot (niente rumore di avvio)
    _suspend:false,      // sospende durante restore/checkpoint massivi
    _hist:[],
    _cap:200,

    entries:function(){ return this._hist.slice().reverse(); },
    record:function(store, key, op){
      if(!this._armed || this._suspend || SKIP[store]) return;
      this._hist.push({ store:store, key:(key!=null?key:'(auto)'), op:op||'write', t:Date.now() });
      if(this._hist.length>this._cap) this._hist.shift();
    },

    // ── Checkpoint / Ripristino dataset ──────────────────────────────────
    async checkpoint(label){
      this._suspend=true;
      try{
        var data = (window.IDB&&IDB.exportAll)? await IDB.exportAll() : null;
        if(!data){ toast('Export non disponibile','err'); this._suspend=false; return; }
        var rec={ id:'chk_'+Date.now(), _checkpoint:true, label:label||('Checkpoint '+new Date().toLocaleString('it-IT')),
          t:Date.now(), data:data };
        await IDB.put('backups', rec);
        toast('Checkpoint creato','ok');
        this._suspend=false; return rec;
      }catch(e){ toast('Checkpoint fallito: '+e.message,'err'); this._suspend=false; }
    },
    async checkpoints(){ var all=await IDB.getAll('backups').catch(function(){return [];});
      return (all||[]).filter(function(b){ return b&&b._checkpoint; }).sort(function(a,b){ return b.t-a.t; }); },
    async restore(id){
      var self=this; var rec=await IDB.get('backups', id); if(!rec||!rec.data){ toast('Checkpoint non trovato','err'); return; }
      this._suspend=true;
      try{ if(window.Bus&&Bus.emit) Bus.emit('restore:start'); }catch(e){}
      try{
        var stores=Object.keys(rec.data);
        for(var i=0;i<stores.length;i++){ var sn=stores[i], recs=rec.data[sn]||[];
          try{ if(IDB.clearStore) await IDB.clearStore(sn); }catch(e){}
          try{ if(IDB.putBulk) await IDB.putBulk(sn, recs); else { for(var j=0;j<recs.length;j++){ await IDB.put(sn,recs[j]).catch(function(){}); } } }catch(e){}
        }
        try{ if(window.AppStore&&AppStore.invalidateAll) AppStore.invalidateAll(); }catch(e){}
        try{ if(window.Bus&&Bus.emit) Bus.emit('restore:end'); }catch(e){}
        toast('Dataset ripristinato dal checkpoint','ok');
      }catch(e){ toast('Ripristino fallito: '+e.message,'err'); }
      this._suspend=false;
    },
    async removeCheckpoint(id){ if(IDB.del) await IDB.del('backups',id); toast('Checkpoint eliminato','ok'); },

    async panel(){
      var self=this; var box=document.createElement('div');
      var intro=document.createElement('p'); intro.className='ds-hint'; intro.style.marginBottom='12px';
      intro.textContent='Crea un punto di ripristino prima di operazioni importanti: potrai tornare esattamente a questo stato dei dati.';
      box.appendChild(intro);
      var bar=document.createElement('div'); bar.style.cssText='display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;';
      bar.appendChild(DS.button('＋ Crea checkpoint',{size:'sm',variant:'primary',onclick:function(){ self.checkpoint().then(function(){ rebuild(); }); }}));
      box.appendChild(bar);

      var chkH=document.createElement('div'); chkH.style.cssText='font:700 13px inherit;margin-bottom:8px;'; chkH.textContent='Punti di ripristino'; box.appendChild(chkH);
      var chkWrap=document.createElement('div'); box.appendChild(chkWrap);

      var trH=document.createElement('div'); trH.style.cssText='font:700 13px inherit;margin:18px 0 8px;'; trH.textContent='Modifiche recenti (sessione)'; box.appendChild(trH);
      var trWrap=document.createElement('div'); box.appendChild(trWrap);

      function rebuild(){
        // checkpoints
        self.checkpoints().then(function(cks){ chkWrap.textContent='';
          if(!cks.length){ var n=document.createElement('div'); n.className='ds-hint'; n.textContent='Nessun checkpoint.'; chkWrap.appendChild(n); return; }
          var cols=[
            {key:'label',label:'Checkpoint'},
            {key:'t',label:'Quando',render:function(r){ return new Date(r.t).toLocaleString('it-IT'); }},
            {key:'act',label:'',render:function(r){ var g=document.createElement('div'); g.style.cssText='display:flex;gap:6px;';
              g.appendChild(DS.button('Ripristina',{size:'sm',variant:'primary',onclick:function(){
                DS.confirm('Ripristinare il dataset a "'+r.label+'"? Lo stato attuale verrà sostituito.',{title:'Conferma ripristino',okLabel:'Ripristina'}).then(function(ok){ if(ok) self.restore(r.id); }); }}));
              g.appendChild(DS.button('✕',{size:'sm',variant:'ghost',title:'Elimina',onclick:function(){ self.removeCheckpoint(r.id).then(rebuild); }}));
              return g; }}
          ];
          chkWrap.appendChild(DS.table(cols, cks.slice(0,20)));
        });
        // trail
        trWrap.textContent='';
        var e=self.entries();
        if(!e.length){ var n2=document.createElement('div'); n2.className='ds-hint'; n2.textContent='Nessuna modifica tracciata in questa sessione.'; trWrap.appendChild(n2); return; }
        var tcols=[
          {key:'op',label:'Op',render:function(r){ return DS.badge(r.op, r.op==='delete'?'red':'green'); }},
          {key:'store',label:'Archivio'},
          {key:'key',label:'Chiave',render:function(r){ return String(r.key); }},
          {key:'t',label:'Ora',render:function(r){ return new Date(r.t).toLocaleTimeString('it-IT'); }}
        ];
        trWrap.appendChild(DS.table(tcols, e.slice(0,40)));
      }
      rebuild();
      DS.modal({title:'🧾 Audit & Checkpoint', body:box});
    }
  };
  window.AuditLog = AuditLog;

  // ── Wrapper NON bloccanti su IDB.put / del (solo per il trail) ────────────
  function wrap(){
    if(!window.IDB || IDB.__auditWrapped) return;
    try{
      if(typeof IDB.put==='function'){ var _put=IDB.put.bind(IDB);
        IDB.put=function(store,rec){ try{ AuditLog.record(store, rec&&(rec.id!=null?rec.id:undefined), 'write'); }catch(e){} return _put(store,rec); }; }
      var delName=(typeof IDB.del==='function')?'del':((typeof IDB.remove==='function')?'remove':null);
      if(delName){ var _del=IDB[delName].bind(IDB);
        IDB[delName]=function(store,key){ try{ AuditLog.record(store, key, 'delete'); }catch(e){} return _del(store,key); }; }
      IDB.__auditWrapped=true;
    }catch(e){}
  }
  wrap();

  // ── A11y / WCAG layer ─────────────────────────────────────────────────────
  function a11y(){
    if(!document.getElementById('ingly-skip')){ var sk=document.createElement('a'); sk.id='ingly-skip';
      sk.href='#main-content'; sk.textContent='Vai al contenuto';
      sk.style.cssText='position:fixed;left:-999px;top:8px;z-index:100000;background:var(--primary,#fbbf24);color:#111;padding:8px 14px;border-radius:8px;font-weight:700;';
      sk.addEventListener('focus',function(){ sk.style.left='8px'; });
      sk.addEventListener('blur',function(){ sk.style.left='-999px'; });
      document.body.insertBefore(sk, document.body.firstChild);
      var main=document.querySelector('main, #app-main, .main-content, .content-area'); if(main&&!main.id) main.id='main-content';
    }
    if(!document.getElementById('ingly-live')){ var lv=document.createElement('div'); lv.id='ingly-live';
      lv.setAttribute('aria-live','polite'); lv.setAttribute('role','status');
      lv.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;';
      document.body.appendChild(lv);
      try{ if(window.DS&&DS.toast&&!DS.toast.__a11y){ var _t=DS.toast.bind(DS);
        DS.toast=function(msg,kind,ms){ try{ lv.textContent=String(msg); }catch(e){} return _t(msg,kind,ms); };
        DS.toast.__a11y=true; } }catch(e){}
    }
  }

  // ── DS.virtualList: rendering a finestra (utility riusabile) ───────────────
  function installVirtual(){
    if(!window.DS || DS.virtualList) return;
    DS.virtualList=function(items, rowH, renderRow, opts){ opts=opts||{};
      var H=opts.height||360; var buf=opts.buffer||6;
      var vp=document.createElement('div'); vp.style.cssText='position:relative;overflow:auto;height:'+H+'px;';
      var spacer=document.createElement('div'); spacer.style.height=(items.length*rowH)+'px'; spacer.style.position='relative';
      vp.appendChild(spacer);
      function paint(){ var top=vp.scrollTop; var start=Math.max(0,Math.floor(top/rowH)-buf);
        var end=Math.min(items.length, Math.ceil((top+H)/rowH)+buf);
        spacer.textContent='';
        for(var i=start;i<end;i++){ var el=renderRow(items[i],i);
          el.style.position='absolute'; el.style.top=(i*rowH)+'px'; el.style.left='0'; el.style.right='0'; el.style.height=rowH+'px';
          spacer.appendChild(el); } }
      vp.addEventListener('scroll', paint); requestAnimationFrame(paint);
      return vp;
    };
  }

  function boot(){ a11y(); installVirtual();
    var view=document.getElementById('view-settings');
    if(view && !view.querySelector('#audit-btn')){
      var host=view.querySelector('.module-actions')||view.querySelector('.module-header')||view;
      var b=document.createElement('button'); b.id='audit-btn'; b.className='btn btn-secondary btn-sm ds-btn';
      b.innerHTML='🧾 Audit & Checkpoint'; b.style.margin='8px 6px'; b.onclick=function(){ AuditLog.panel(); };
      host.appendChild(b);
    }
  }
  if(typeof Bus!=='undefined'&&Bus.on) Bus.on('nav:settings',function(){ setTimeout(boot,300); });
  // Arma il trail solo dopo che l'avvio si è calmato → cronologia significativa
  setTimeout(function(){ AuditLog._armed=true; }, 6000);
  if(document.readyState!=='loading') setTimeout(boot,2600); else document.addEventListener('DOMContentLoaded',function(){ setTimeout(boot,2600); });
})();

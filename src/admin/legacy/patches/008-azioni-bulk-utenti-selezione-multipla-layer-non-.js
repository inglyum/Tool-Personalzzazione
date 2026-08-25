
/* ═══ AZIONI BULK UTENTI (selezione multipla) — layer non invasivo ═══════════
   Aggiunge checkbox per riga + toolbar azioni multiple. Riusa dbSave/_db e
   renderUsers esistenti. */
(function(){
  var SEL = new Set();
  function db(){ return (typeof _db!=='undefined'&&_db) ? _db : (window.dbLoad?dbLoad():null); }
  function save(){ try{ if(window.dbSave) dbSave(db()); }catch(e){} }
  function rerender(){ try{ if(window.renderUsers) renderUsers(); else if(window.renderUsersTable) renderUsersTable(); }catch(e){} }

  function toolbar(){
    var el=document.getElementById('_bulkbar');
    if(SEL.size===0){ if(el) el.remove(); return; }
    if(!el){
      el=document.createElement('div'); el.id='_bulkbar';
      el.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:99998;display:flex;gap:8px;align-items:center;background:var(--bg4,#1a1a28);border:1px solid var(--border3,#363650);border-radius:14px;padding:10px 14px;box-shadow:0 12px 40px #000a;font-family:Inter,system-ui,sans-serif;flex-wrap:wrap;max-width:94vw';
      document.body.appendChild(el);
    }
    var plans=(typeof PLANS_CFG!=='undefined')?Object.keys(PLANS_CFG):['starter','pro','business','enterprise'];
    el.innerHTML='<span style="font-size:12px;font-weight:800;color:var(--text,#e2e2f0)">'+SEL.size+' selezionati</span>'
      +'<span style="width:1px;height:20px;background:var(--border3,#363650)"></span>'
      +'<button class="btn btn-success btn-sm" onclick="_bulk.act(\'activate\')">✅ Attiva</button>'
      +'<button class="btn btn-warning btn-sm" onclick="_bulk.act(\'suspend\')">⏸ Sospendi</button>'
      +'<button class="btn btn-primary btn-sm" onclick="_bulk.act(\'renew\')">🔄 Rinnova +1 anno</button>'
      +'<select id="_bulkplan" class="btn-sm" style="background:var(--bg3,#141420);color:var(--text,#e2e2f0);border:1px solid var(--border2,#2a2a3e);border-radius:8px;padding:5px 8px;font-size:12px">'
        +'<option value="">Cambia piano…</option>'+plans.map(function(p){return '<option value="'+p+'">'+p+'</option>';}).join('')+'</select>'
      +'<button class="btn btn-cyan btn-sm" onclick="_bulk.act(\'export\')">📥 Esporta CSV</button>'
      +'<button class="btn btn-danger btn-sm" onclick="_bulk.act(\'delete\')">🗑 Elimina</button>'
      +'<button class="btn btn-ghost btn-sm" onclick="_bulk.clear()">✕</button>';
    var selPlan=document.getElementById('_bulkplan');
    if(selPlan) selPlan.onchange=function(){ if(this.value){ _bulk.act('plan:'+this.value); } };
  }

  function injectCheckboxes(){
    var tb=document.getElementById('users-tbody'); if(!tb) return;
    var thead=document.querySelector('#users-tbody')?.closest('table')?.querySelector('thead tr');
    if(thead && !document.getElementById('_bulkall')){
      var th=document.createElement('th'); th.style.width='34px';
      th.innerHTML='<input type="checkbox" id="_bulkall" title="Seleziona tutti" style="cursor:pointer">';
      thead.insertBefore(th, thead.firstChild);
      th.querySelector('input').onchange=function(){
        var on=this.checked;
        tb.querySelectorAll('tr').forEach(function(tr){
          var id=_rowId(tr); if(!id) return;
          if(on) SEL.add(id); else SEL.delete(id);
          var cb=tr.querySelector('._bulkcb'); if(cb) cb.checked=on;
        });
        toolbar();
      };
    }
    tb.querySelectorAll('tr').forEach(function(tr){
      if(tr.querySelector('._bulkcb')) return;
      var id=_rowId(tr); if(!id) return;
      var td=document.createElement('td');
      td.innerHTML='<input type="checkbox" class="_bulkcb" style="cursor:pointer">';
      tr.insertBefore(td, tr.firstChild);
      var cb=td.querySelector('input'); cb.checked=SEL.has(id);
      cb.onclick=function(e){ e.stopPropagation(); };
      cb.onchange=function(e){ e.stopPropagation(); if(this.checked)SEL.add(id); else SEL.delete(id); toolbar(); };
    });
  }
  function _rowId(tr){
    var oc=tr.getAttribute('onclick')||'';
    var m=oc.match(/openUserDetail\(['"]([^'"]+)['"]\)/); return m?m[1]:null;
  }

  window._bulk = {
    clear:function(){ SEL.clear(); toolbar(); var a=document.getElementById('_bulkall'); if(a)a.checked=false;
      document.querySelectorAll('._bulkcb').forEach(function(c){c.checked=false;}); },
    act:function(action){
      var d=db(); if(!d||!d.users){ return; }
      var ids=Array.from(SEL); if(!ids.length) return;
      if(action==='delete'){ if(!confirm('Eliminare '+ids.length+' utenti selezionati?')) return;
        d.users=d.users.filter(function(u){return !SEL.has(u.id);}); save(); SEL.clear(); rerender(); setTimeout(injectCheckboxes,50); return; }
      if(action==='export'){ _bulk.exportCSV(d.users.filter(function(u){return SEL.has(u.id);})); return; }
      var addYear=function(iso){ var dt=iso?new Date(iso):new Date(); dt.setFullYear(dt.getFullYear()+1); return dt.toISOString(); };
      d.users.forEach(function(u){
        if(!SEL.has(u.id)) return;
        if(action==='activate') u.status='active';
        else if(action==='suspend') u.status='suspended';
        else if(action==='renew'){ u.expiresAt=addYear(u.expiresAt); u.status='active'; }
        else if(action.indexOf('plan:')===0){ u.plan=action.split(':')[1]; }
      });
      save(); rerender(); setTimeout(function(){ injectCheckboxes(); toolbar(); },50);
    },
    exportCSV:function(rows){
      var cols=['id','nome','cognome','username','email','phone','company','piva','plan','status','createdAt','expiresAt'];
      var csv=[cols.join(',')].concat(rows.map(function(u){
        return cols.map(function(c){ return '"'+String(u[c]==null?'':u[c]).replace(/"/g,'""')+'"'; }).join(',');
      })).join('\n');
      var blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
      var a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download='ingly_utenti_selezionati_'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
    }
  };

  // Wrap renderUsersTable per re-iniettare le checkbox dopo ogni render
  function hook(){
    if(typeof window.renderUsersTable!=='function'){ return setTimeout(hook,600); }
    if(window.renderUsersTable.__bulkHooked) return;
    var orig=window.renderUsersTable;
    window.renderUsersTable=function(){ var r=orig.apply(this,arguments); try{ injectCheckboxes(); }catch(e){} return r; };
    window.renderUsersTable.__bulkHooked=true;
    setTimeout(injectCheckboxes, 300);
  }
  if(document.readyState!=='loading') hook(); else document.addEventListener('DOMContentLoaded',hook);
})();

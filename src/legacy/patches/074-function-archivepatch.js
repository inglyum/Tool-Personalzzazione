
;(function _archivePatch(){
  window._archiveClose = function(){
    var t = document.getElementById('_arch_toast'); if(t) t.remove();
  };
  window._archiveNow = async function(id){
    window._archiveClose();
    try {
      var o = await IDB.get('orders', +id||id);
      if(o){ o._archived=true; o._archivedAt=new Date().toISOString(); await IDB.put('orders',o); }
      if(typeof AppStore!=='undefined') AppStore.invalidate('orders');
      if(typeof toast!=='undefined') toast('📦 Ordine archiviato!','success');
    }catch(e){ console.warn('[archiveNow]',e); }
  };
  window._archiveMon = async function(id){
    window._archiveClose();
    try {
      var o = await IDB.get('orders', +id||id);
      if(o){ o._archiveOnMonday=true; await IDB.put('orders',o); }
      if(typeof toast!=='undefined') toast('📅 Archiviazione programmata per lunedi','info');
    }catch(e){ console.warn('[archiveMon]',e); }
  };

  function _showArchiveToast(o){
    if(o._archived) return;
    window._archiveClose();
    var div = document.createElement('div');
    div.id = '_arch_toast';
    div.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;background:#1e293b;border:1px solid #334155;border-radius:14px;padding:18px 20px;max-width:320px;box-shadow:0 8px 40px rgba(0,0,0,.7)';
    var name = (o.name||('#'+o.id)).replace(/'/g,'').slice(0,40);
    div.innerHTML = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">'
      + '<span style="font-size:22px">📦</span>'
      + '<div><div style="font-size:13px;font-weight:800;color:#f1f5f9">Archiviare ordine?</div>'
      + '<div style="font-size:11px;color:#64748b;margin-top:2px">'+name+'</div></div></div>'
      + '<div style="font-size:11px;color:#64748b;margin-bottom:12px">Ordine completato. Spostare in archivio?</div>'
      + '<div style="display:flex;gap:8px">'
      + '<button onclick="_archiveNow('+o.id+')" style="flex:1;padding:8px;background:#10b981;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:12px">Si</button>'
      + '<button onclick="_archiveMon('+o.id+')" style="flex:1;padding:8px;background:#f59e0b;color:#000;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:11px">Lunedi</button>'
      + '<button onclick="_archiveClose()" style="flex:1;padding:8px;background:transparent;color:#94a3b8;border:1px solid #334155;border-radius:8px;cursor:pointer;font-size:12px">No</button>'
      + '</div>';
    document.body.appendChild(div);
    setTimeout(function(){ window._archiveClose(); }, 15000);
  }

  // Monday auto-archive
  (async function(){
    try{
      var today=new Date();
      if(today.getDay()!==1) return;
      var key='_lastMonArch';
      var ts=today.toISOString().slice(0,10);
      if(localStorage.getItem(key)===ts) return;
      localStorage.setItem(key,ts);
      var orders=(typeof AppStore!=='undefined')?await AppStore.get('orders').catch(function(){return[];})
        :(typeof IDB!=='undefined')?await IDB.getAll('orders').catch(function(){return[];})
        :[];
      var n=0;
      for(var i=0;i<orders.length;i++){
        var o=orders[i];
        if(o._archiveOnMonday&&!o._archived){
          o._archived=true; o._archivedAt=new Date().toISOString(); delete o._archiveOnMonday;
          if(typeof IDB!=='undefined') await IDB.put('orders',o).catch(function(){});
          n++;
        }
      }
      if(n>0&&typeof AppStore!=='undefined') AppStore.invalidate('orders');
      if(n>0&&typeof toast!=='undefined') toast('📦 '+n+' ordini archiviati (lunedi)','info');
    }catch(e){ console.warn('[mondayArchive]',e); }
  })();

  // Patch Orders.move to show archive toast
  var _tryPatch=function(){
    if(typeof Orders==='undefined'||!Orders.move){setTimeout(_tryPatch,1000);return;}
    if(Orders._archPatched) return;
    Orders._archPatched=true;
    var _orig=Orders.move.bind(Orders);
    Orders.move=async function(id,newStatus){
      await _orig(id,newStatus);
      if(newStatus==='sold'||newStatus==='venduto'||newStatus==='delivered'||newStatus==='consegnato'){
        try{ var o=await IDB.get('orders',+id||id); if(o) _showArchiveToast(o); }catch(e){}
      }
    };
  };
  setTimeout(_tryPatch,2000);
})();



/* Apre il gruppo "Preventivi" una volta (le 4 smart sezioni devono vedersi). */
(function(){
  function fix(){
    try{
      if(localStorage.getItem('ingly_prev_expanded_v2')) return;
      var g=document.getElementById('ng-preventivi'); if(!g) return;
      g.classList.remove('collapsed');
      try{ var k='ingly_navgroups_v1'; var st=JSON.parse(localStorage.getItem(k)||'{}'); st['ng-preventivi']=false; localStorage.setItem(k,JSON.stringify(st)); }catch(e){}
      localStorage.setItem('ingly_prev_expanded_v2','1');
    }catch(e){}
  }
  if(document.readyState!=='loading') setTimeout(fix,1600);
  else document.addEventListener('DOMContentLoaded',function(){ setTimeout(fix,1600); });
})();


/* ── PREVENTIVI — barra a tab unificata (Standard/Apparel/3D/Calc/Intelligence).
   Persistente in cima a #content-inner, visibile solo nelle 5 sezioni preventivi,
   evidenzia la tab attiva. Non tocca App.navigate né le singole view. ── */
(function PreventiviTabs(){
  'use strict';
  var TOOLS = [
    ['quoter','\uD83E\uDDEE Standard'],
    ['apparel','\uD83D\uDC55 Apparel'],
    ['print3d','\uD83D\uDDA8\uFE0F 3D'],
    ['lasercalc','\u26A1 Calc Laser'],
    ['quoteintel','\uD83C\uDFAF Intelligence']
  ];
  var ids = TOOLS.map(function(t){ return 'view-'+t[0]; });
  function activeId(){ var el=document.querySelector('.section-view.active'); return el?el.id:''; }
  function build(){
    var bar=document.getElementById('preventivi-tabbar');
    if(bar) return bar;
    bar=document.createElement('div');
    bar.id='preventivi-tabbar';
    bar.className='tabs';
    bar.style.cssText='margin:0 0 16px 0;flex-wrap:wrap;display:none';
    bar.innerHTML=TOOLS.map(function(t){
      return '<button class="tab-btn" data-goto="'+t[0]+'" onclick="App.navigate(\''+t[0]+'\')">'+t[1]+'</button>';
    }).join('');
    return bar;
  }
  function update(){
    var ci=document.getElementById('content-inner'); if(!ci) return;
    var bar=build();
    if(bar.parentNode!==ci) ci.insertBefore(bar, ci.firstChild);
    var act=activeId();
    var isPrev = ids.indexOf(act)>-1;
    bar.style.display = isPrev ? 'flex' : 'none';
    if(isPrev){
      bar.querySelectorAll('.tab-btn').forEach(function(b){
        b.classList.toggle('active', ('view-'+b.getAttribute('data-goto'))===act);
      });
    }
  }
  setInterval(update, 500);
  if(document.readyState!=='loading') update();
  else document.addEventListener('DOMContentLoaded', update);
})();

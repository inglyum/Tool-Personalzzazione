
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v73 — MARKET HUB 2.0: Consumabili tipici (sublimazione/UV/DTF)
   Popola lo store 'materials' con i consumabili che mancavano (i materiali laser
   sono già presenti). Stesso shape record → usabili subito nel preventivatore.
   Prezzi INDICATIVI di mercato (luglio 2026): verifica/aggiorna con Market Hub →
   Ricerca Mercato. Additivo, idempotente (id dedicati 900+), offline.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__consumables) return; window.__consumables=true;

  function toast(m,k){ try{ if(window.DS&&DS.toast) return DS.toast(m,k); }catch(e){} }

  var CONSUM=[
    // ── SUBLIMAZIONE ──
    {id:901,name:'Carta sublimazione A4 (risma 100)',type:'material',cat:'sublimazione',cost:9.00,unit:'€/risma',supplier:'2Stamp',supplierUrl:'https://www.2stamp.it',machine:'Stampante sublimazione',notes:'~€0,09/foglio. Indicativo — verifica con Ricerca Mercato.'},
    {id:902,name:'Inchiostro sublimazione (set 4×100ml)',type:'material',cat:'sublimazione',cost:38.00,unit:'€/set',supplier:'Sublimazione.it',supplierUrl:'https://www.sublimazione.it',machine:'Stampante sublimazione',notes:'CMYK. Resa ~ centinaia di stampe A4. Indicativo.'},
    {id:903,name:'Tazza blank sublimazione 11oz',type:'material',cat:'sublimazione',cost:0.90,unit:'€/pz',supplier:'BlueBag Italia',supplierUrl:'https://www.bluebagitalia.com',machine:'Pressa a caldo',notes:'Coating AA. Da ~€0,80 a volume. Indicativo.'},
    {id:904,name:'Nastro termico (heat tape)',type:'material',cat:'sublimazione',cost:3.00,unit:'€/rotolo',supplier:'Amazon/Ali',supplierUrl:'https://www.amazon.it/s?k=nastro+termico+sublimazione',machine:'Pressa a caldo',notes:'Fissaggio blank in pressa. Indicativo.'},
    // ── DTF ──
    {id:911,name:'Film DTF (rotolo 30cm × 100m)',type:'material',cat:'dtf',cost:45.00,unit:'€/rotolo',supplier:'Burger Print',supplierUrl:'https://www.burger-print.it/dtf/consumabili-dtf',machine:'Stampante DTF',notes:'Cold peel. ~€0,45/ml. Indicativo.'},
    {id:912,name:'Polvere adesiva DTF (1kg)',type:'material',cat:'dtf',cost:18.00,unit:'€/kg',supplier:'Burger Print',supplierUrl:'https://www.burger-print.it/dtf/consumabili-dtf',machine:'Stampante DTF',notes:'Hot melt. Indicativo.'},
    {id:913,name:'Inchiostro DTF (1L)',type:'material',cat:'dtf',cost:35.00,unit:'€/L',supplier:'DTF Service Stampa',supplierUrl:'https://dtfservicestampa.com/it/consumabili-dtf-uv/',machine:'Stampante DTF',notes:'Bianco + CMYK. Indicativo.'},
    // ── STAMPA UV ──
    {id:921,name:'Film UV-DTF (rotolo)',type:'material',cat:'uv',cost:50.00,unit:'€/rotolo',supplier:'Sublimazione.it',supplierUrl:'https://www.sublimazione.it/it/categorie/924-dtf-uv.html',machine:'Stampante UV',notes:'Transfer UV a freddo. Indicativo.'},
    {id:922,name:'Inchiostro UV (1L)',type:'material',cat:'uv',cost:60.00,unit:'€/L',supplier:'Europages (UV)',supplierUrl:'https://www.europages.it/aziende/inchiostri%20uv.html',machine:'Stampante UV',notes:'Rigido/flessibile secondo stampante. Indicativo.'},
    {id:923,name:'Primer UV (adesione)',type:'material',cat:'uv',cost:25.00,unit:'€/500ml',supplier:'Ocinkjet',supplierUrl:'https://it.dtf-ink.com',machine:'Stampante UV',notes:'Per vetro/metallo. Indicativo.'}
  ];

  async function seed(){
    var existing=[];
    try{ existing = (window.AppStore&&AppStore.get)?await AppStore.get('materials'):await IDB.getAll('materials'); }catch(e){ existing=await IDB.getAll('materials').catch(function(){return [];}); }
    var have={}; (existing||[]).forEach(function(m){ if(m&&m.id!=null) have[m.id]=1; });
    var added=0;
    for(var i=0;i<CONSUM.length;i++){ var c=CONSUM[i];
      if(have[c.id]) continue;
      await IDB.put('materials', c).catch(function(){}); added++;
    }
    try{ if(window.AppStore&&AppStore.invalidate) AppStore.invalidate('materials'); }catch(e){}
    try{ if(window.Bus&&Bus.emit) Bus.emit('materials:changed'); }catch(e){}
    toast(added>0?(added+' consumabili aggiunti ai Materiali'):'Consumabili già presenti','ok');
    return added;
  }
  window.InglyConsumables = { seed:seed, DATA:CONSUM };

  // Pulsante nella sezione Materiali
  function injectBtn(){
    var view=document.getElementById('view-materials'); if(!view) return setTimeout(injectBtn,1200);
    if(view.querySelector('#consum-seed-btn')) return;
    var host=view.querySelector('.module-actions')||view.querySelector('.module-header')||view;
    var b=document.createElement('button'); b.id='consum-seed-btn'; b.className='btn btn-secondary btn-sm ds-btn';
    b.innerHTML='➕ Consumabili tipici (subli/UV/DTF)'; b.style.margin='8px 6px';
    b.onclick=function(){ seed(); };
    host.appendChild(b);
  }
  if(typeof Bus!=='undefined'&&Bus.on) Bus.on('nav:materials', function(){ setTimeout(injectBtn,300); });
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(injectBtn,2600); });
})();

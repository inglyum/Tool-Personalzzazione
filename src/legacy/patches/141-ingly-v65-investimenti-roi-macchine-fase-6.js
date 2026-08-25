
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v65 — INVESTIMENTI & ROI Macchine (Fase 6)
   Ogni macchina (store 'equipment') diventa un investimento tracciato:
   • Payback = costo acquisto / margine medio mensile generato
   • Accantonamento: quota mensile (profit-first 15% "obiettivi" da KB) verso
     il costo macchina, con barra di avanzamento e data stimata di copertura.
   Dati salvati SULLA scheda macchina (SSOT equipment): roiMonthly, setAside,
   setAsideLog. Costruito su Design System (Fase 4). Additivo, offline, CSP-safe.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.MachineInvest && window.MachineInvest.__v65) return;

  function toast(m,k){ try{ if(window.DS&&DS.toast) return DS.toast(m,k); }catch(e){} }
  function eur(n){ n=+n||0; return '€'+n.toLocaleString('it-IT',{minimumFractionDigits:0,maximumFractionDigits:0}); }
  function num(v){ v=parseFloat(v); return isFinite(v)?v:0; }

  var MachineInvest = {
    __v65:true,
    async list(){ return (await IDB.getAll('equipment').catch(function(){return [];}))||[]; },

    // Calcolo indicatori per una macchina
    metrics:function(m){
      var cost=num(m.costBuy);
      var roiM=num(m.roiMonthly);                 // margine medio/mese generato
      var saved=num(m.setAside);                   // accantonato finora
      var payback = (roiM>0 && cost>0) ? Math.ceil(cost/roiM) : null; // mesi
      var covered = cost>0 ? Math.min(100, Math.round(saved/cost*100)) : 0;
      // quota consigliata: 15% "obiettivi" della cassa profit-first sul margine macchina
      var suggested = roiM>0 ? Math.round(roiM*0.15) : 0;
      var remaining = Math.max(0, cost-saved);
      var etaMonths = (suggested>0 && remaining>0) ? Math.ceil(remaining/suggested) : (remaining<=0?0:null);
      return { cost:cost, roiM:roiM, saved:saved, payback:payback, covered:covered, suggested:suggested, remaining:remaining, etaMonths:etaMonths };
    },

    async _save(m, patch){ Object.assign(m, patch, {_upd:Date.now()});
      await IDB.put('equipment', m);
      try{ if(window.AppStore&&AppStore.invalidate) AppStore.invalidate('equipment'); }catch(e){}
      try{ if(window.Bus&&Bus.emit) Bus.emit('equipment:changed'); }catch(e){}
      try{ if(window.MachineHub&&MachineHub.sync) MachineHub.sync(); }catch(e){}
    },

    async open(){
      var self=this; var rows=await this.list();
      var box=document.createElement('div');
      var intro=document.createElement('p'); intro.className='ds-hint'; intro.style.marginBottom='14px';
      intro.textContent='Traccia ogni macchina come investimento: imposta il margine medio che genera al mese per calcolare il rientro (payback) e accantona una quota verso il suo costo.';
      box.appendChild(intro);

      if(!rows.length){ var e=document.createElement('div'); e.className='ds-hint';
        e.textContent='Nessuna macchina nel parco. Aggiungine dal Catalogo Macchine.'; box.appendChild(e);
        DS.modal({title:'📈 Investimenti & ROI', body:box}); return; }

      function card(m){
        var k=self.metrics(m);
        var c=document.createElement('div');
        c.style.cssText='border:1px solid var(--border,#333);border-radius:var(--radius,12px);padding:14px;margin-bottom:14px;background:var(--bg-card,#161616);';
        var title=document.createElement('div'); title.style.cssText='font:700 15px inherit;margin-bottom:4px;';
        title.textContent=(m.name||((m.brand||'')+' '+(m.model||''))||'Macchina').trim(); c.appendChild(title);
        var sub=document.createElement('div'); sub.className='ds-hint'; sub.style.marginBottom='10px';
        sub.textContent=(m.tech||'')+' · Costo '+eur(k.cost); c.appendChild(sub);

        // riga metriche
        var mrow=document.createElement('div'); mrow.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;';
        mrow.appendChild(DS.badge('Payback: '+(k.payback!=null?k.payback+' mesi':'imposta margine'), k.payback!=null&&k.payback<=18?'green':'muted'));
        mrow.appendChild(DS.badge('Accantonato: '+eur(k.saved)+' ('+k.covered+'%)', k.covered>=100?'green':'muted'));
        if(k.etaMonths!=null) mrow.appendChild(DS.badge(k.remaining<=0?'Coperta ✓':('Copertura in ~'+k.etaMonths+' mesi'), k.remaining<=0?'green':'muted'));
        c.appendChild(mrow);

        // barra avanzamento
        var barBg=document.createElement('div'); barBg.style.cssText='height:8px;border-radius:6px;background:var(--border2,#242424);overflow:hidden;margin-bottom:12px;';
        var barFill=document.createElement('div'); barFill.style.cssText='height:100%;width:'+k.covered+'%;background:var(--primary,#fbbf24);transition:width .3s ease;';
        barBg.appendChild(barFill); c.appendChild(barBg);

        // controlli
        var ctr=document.createElement('div'); ctr.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;';
        var roiF=DS.field({label:'Margine medio/mese (€)',type:'number',value:k.roiM||''}); roiF.style.marginBottom='0'; roiF.style.flex='1 1 150px';
        roiF._input.onchange=function(){ self._save(m,{roiMonthly:num(roiF._input.value)}).then(function(){ toast('ROI aggiornato','ok'); refresh(); }); };
        ctr.appendChild(roiF);

        var addF=DS.field({label:'Accantona ora (€)',type:'number',placeholder:k.suggested?('consigliato '+k.suggested):'0'}); addF.style.marginBottom='0'; addF.style.flex='1 1 130px';
        ctr.appendChild(addF);
        var addB=DS.button('+ Accantona',{size:'sm',variant:'primary',onclick:function(){
          var amt=num(addF._input.value)|| k.suggested; if(amt<=0){ toast('Importo non valido','err'); return; }
          var log=(m.setAsideLog||[]).concat([{date:new Date().toISOString().slice(0,10),amount:amt}]);
          self._save(m,{setAside:num(m.setAside)+amt, setAsideLog:log}).then(function(){ toast('Accantonati '+eur(amt),'ok'); refresh(); });
        }});
        ctr.appendChild(addB);
        if(k.saved>0){ ctr.appendChild(DS.button('Azzera',{size:'sm',variant:'ghost',onclick:function(){
          self._save(m,{setAside:0,setAsideLog:[]}).then(function(){ toast('Accantonamento azzerato','ok'); refresh(); });
        }})); }
        c.appendChild(ctr);
        return c;
      }

      function refresh(){ MachineInvest.list().then(function(r){ rows=r; content.textContent='';
        // riepilogo totale
        var totCost=0, totSaved=0, totRoi=0;
        rows.forEach(function(m){ var k=self.metrics(m); totCost+=k.cost; totSaved+=k.saved; totRoi+=k.roiM; });
        var sum=document.createElement('div'); sum.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;';
        sum.appendChild(DS.badge('Parco: '+eur(totCost)));
        sum.appendChild(DS.badge('Accantonato: '+eur(totSaved),'green'));
        sum.appendChild(DS.badge('Margine/mese: '+eur(totRoi)));
        content.appendChild(sum);
        rows.forEach(function(m){ content.appendChild(card(m)); });
      }); }

      var content=document.createElement('div'); box.appendChild(content);
      refresh();
      DS.modal({title:'📈 Investimenti & ROI', body:box});
    }
  };
  window.MachineInvest = MachineInvest;

  // Pulsante nella sezione Attrezzature
  function injectBtn(){
    var view=document.getElementById('view-equipment'); if(!view) return setTimeout(injectBtn,1200);
    if(view.querySelector('#mi-open-btn')) return;
    var host=view.querySelector('.module-actions')||view.querySelector('.module-header');
    var b=document.createElement('button'); b.id='mi-open-btn'; b.className='btn btn-secondary btn-sm ds-btn';
    b.innerHTML='📈 Investimenti & ROI'; b.onclick=function(){ MachineInvest.open(); };
    if(host) host.appendChild(b);
  }
  if(typeof Bus!=='undefined'&&Bus.on) Bus.on('nav:equipment', function(){ setTimeout(injectBtn,300); });
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(injectBtn,2400); });
})();


/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v84 — Anteprima Fattura + Piano Pagamento (Fase 3 · aggancio UI)
   Costruisce fattura normalizzata dal preventivo (motore fiscal) e mostra anche
   acconto/saldo (motore payments, regola KB acconto 50% > €50). Anteprima locale.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__fiscalAssist) return; window.__fiscalAssist=true;
  function DS(){ return window.DS; }
  function dom(){ return window.InglyDomain; }
  function eur(n){ try{ return dom().format.eur(n,2); }catch(e){ return '€'+(+n||0).toFixed(2); } }
  function num(v){ v=parseFloat(v); return isFinite(v)?v:0; }
  function eid(id){ return document.getElementById(id); }

  function currentNet(){
    var lines=(window.Quoter&&Quoter.lines)||[];
    var linesCost=lines.reduce(function(a,l){ return a+(num(l.subtotal)||num(l.unitCost)*num(l.qty||1)); },0);
    var extra=(window.Quoter&&Quoter._getExtraCosts)?num(Quoter._getExtraCosts()):0;
    var markup=num((eid('qr-markup')||{}).value||100)/100;
    var discount=num((eid('qr-discount')||{}).value||0)/100;
    return { net:(linesCost+extra)*(1+markup)*(1-discount), lines:lines, markup:markup, discount:discount, extra:extra };
  }

  function open(){
    var F=dom(); var D=DS(); if(!F||!F.fiscal||!D){ if(D) D.toast('Motore fisco non pronto','err'); return; }
    var lines=(window.Quoter&&Quoter.lines)||[];
    if(!lines.length){ D.toast('Aggiungi voci al preventivo','warning'); return; }
    var fiscal=F.fiscal, payments=F.payments;

    var box=document.createElement('div');
    var intro=document.createElement('p'); intro.className='ds-hint'; intro.style.marginBottom='12px';
    intro.textContent='Fattura generata dal preventivo (motore fiscale) con piano di pagamento. Invio SDI reale → intermediario (fase backend).';
    box.appendChild(intro);

    var ctr=document.createElement('div'); ctr.style.cssText='display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-bottom:14px';
    var fIva=D.field({label:'Aliquota IVA',type:'select',options:[{value:'0.22',label:'22% (ordinaria)'},{value:'0.10',label:'10%'},{value:'0.04',label:'4%'},{value:'0',label:'0% (no IVA)'}]}); fIva.style.marginBottom='0';
    var fSeq=D.field({label:'N. progressivo',type:'number',value:'1'}); fSeq.style.marginBottom='0'; fSeq.style.maxWidth='120px';
    var fAcc=D.field({label:'Acconto',type:'select',options:[{value:'auto',label:'Auto (50% se personalizzato >€50)'},{value:'50',label:'50%'},{value:'0',label:'Nessuno'}]}); fAcc.style.marginBottom='0';
    ctr.appendChild(fIva); ctr.appendChild(fSeq); ctr.appendChild(fAcc); box.appendChild(ctr);
    var out=document.createElement('div'); box.appendChild(out);

    function build(){
      var rate=num(fIva._input.value);
      var seq=Math.max(1,Math.round(num(fSeq._input.value)||1));
      var st=currentNet();
      var qlines=st.lines.map(function(l){
        var lineNet=(num(l.subtotal)||num(l.unitCost)*num(l.qty||1))*(1+st.markup)*(1-st.discount);
        return { label:l.desc||l.name||'Voce', qty:num(l.qty||1), unit:+(lineNet/(num(l.qty)||1)).toFixed(2), lineTotal:+lineNet.toFixed(2) };
      });
      if(st.extra>0){ var en=st.extra*(1+st.markup)*(1-st.discount); qlines.push({label:'Costi aggiuntivi',qty:1,unit:+en.toFixed(2),lineTotal:+en.toFixed(2)}); }
      var vat=fiscal.addVat(st.net, rate);
      var inv=fiscal.buildInvoiceFromQuote({ lines:qlines, subtotal:vat.totale, deposit:0 }, { seq:seq, year:new Date().getFullYear(), rate:rate });

      // piano pagamento
      var accMode=fAcc._input.value;
      var deposit=0;
      if(accMode==='50') deposit=inv.totale*0.5;
      else if(accMode==='auto') deposit=(inv.totale>50)?inv.totale*0.5:0;
      var plan= payments? payments.paymentPlan(inv.totale, deposit) : {deposit:deposit, balance:inv.totale-deposit, depositPct: inv.totale>0?deposit/inv.totale:0};

      out.textContent='';
      var head=document.createElement('div'); head.style.cssText='display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px';
      head.innerHTML='<div style="font:700 14px inherit">Fattura n. '+inv.number+'</div><div class="ds-hint">'+inv.date+'</div>';
      out.appendChild(head);
      var cols=[{key:'description',label:'Descrizione'},{key:'qty',label:'Qtà'},
        {key:'unit',label:'Prezzo',render:function(r){ return eur(r.unitGross); }},
        {key:'tot',label:'Totale',render:function(r){ return eur(r.qty*r.unitGross); }}];
      out.appendChild(D.table(cols, inv.lines));

      function block(title){ var h=document.createElement('div'); h.style.cssText='font:700 12px inherit;margin:14px 0 6px;color:var(--text-muted,#9ca3af);text-transform:uppercase;letter-spacing:.04em'; h.textContent=title; return h; }
      function row(k,v,strong,color){ var r=document.createElement('div'); r.style.cssText='display:flex;justify-content:space-between;padding:5px 0;font-size:14px'+(strong?';font-weight:800':'');
        var a=document.createElement('span'); a.textContent=k; a.style.color='var(--text-muted,#9ca3af)';
        var b=document.createElement('span'); b.textContent=v; b.style.fontVariantNumeric='tabular-nums'; if(color) b.style.color=color; else if(strong) b.style.color='var(--primary,#fbbf24)';
        r.appendChild(a); r.appendChild(b); return r; }

      var tot=document.createElement('div'); tot.style.cssText='margin-top:10px;border-top:1px solid var(--border,#333);padding-top:8px';
      tot.appendChild(row('Imponibile', eur(inv.imponibile)));
      tot.appendChild(row('IVA ('+(rate*100).toFixed(0)+'%)', eur(inv.imposta)));
      tot.appendChild(row('TOTALE FATTURA', eur(inv.totale), true));
      out.appendChild(tot);

      out.appendChild(block('Piano di pagamento'));
      var pay=document.createElement('div');
      if(plan.deposit>0){
        pay.appendChild(row('Acconto ('+(plan.depositPct*100).toFixed(0)+'%)', eur(plan.deposit), false, 'var(--green,#22c55e)'));
        pay.appendChild(row('Saldo alla consegna', eur(plan.balance)));
      } else {
        pay.appendChild(row('Pagamento', eur(inv.totale)+' (unica soluzione)'));
      }
      out.appendChild(pay);
    }
    fIva._input.onchange=build; fAcc._input.onchange=build; fSeq._input.oninput=build; build();
    D.modal({title:'🧾 Anteprima Fattura & Pagamento', body:box});
  }
  window.FiscalAssist={ open:open };

  function injectBtn(){
    var view=document.getElementById('view-quoter'); if(!view) return setTimeout(injectBtn,1200);
    if(view.querySelector('#fa-open-btn')) return;
    var host=view.querySelector('.module-actions')||view.querySelector('.module-header')||view;
    var b=document.createElement('button'); b.id='fa-open-btn'; b.className='btn btn-secondary btn-sm ds-btn';
    b.innerHTML='🧾 Fattura & Pagamento'; b.style.margin='8px 6px'; b.onclick=open; host.appendChild(b);
  }
  if(typeof Bus!=='undefined'&&Bus.on) Bus.on('nav:quoter', function(){ setTimeout(injectBtn,300); });
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(injectBtn,3000); });
})();

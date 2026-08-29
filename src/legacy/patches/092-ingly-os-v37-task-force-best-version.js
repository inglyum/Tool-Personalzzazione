
// ═══════════════════════════════════════════════════════════════════
// INGLY OS v37 — Task Force Best Version
// Part 2: FatturaPA 1-click · Prima Nota Auto · CRM Perf · Profilo
// ═══════════════════════════════════════════════════════════════════

// ─── FATTURA PA DA ORDINE — 1 CLICK ─────────────────────────────
window.FatturaDaOrdine = {
  genera: function(ordine){
    if(!ordine){if(typeof toast!=='undefined')toast('Ordine non valido','error');return;}
    var brand={}; try{brand=JSON.parse(localStorage.getItem('ingly_brand_v1')||'{}');}catch(e){}
    var ivaCfg={}; try{ivaCfg=JSON.parse(localStorage.getItem('ingly_iva_cfg')||'{}');}catch(e){}
    var ivaRate=(ivaCfg.regime==='forfettario'?0:(parseFloat(ivaCfg.rate)||22));
    var imponibile=parseFloat(ordine.total||0)/(1+ivaRate/100);
    var ivaAmt=imponibile*(ivaRate/100);
    var dateStr=new Date().toISOString().slice(0,10);
    var qn='IT'+( brand.vatNum||'00000000000').replace(/[^0-9]/g,'')+'_'+Date.now().toString().slice(-8);
    var xml=[
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<p:FatturaElettronica versione="FPR12" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2">',
      '<FatturaElettronicaHeader>',
      '  <DatiTrasmissione>',
      '    <IdTrasmittente><IdPaese>IT</IdPaese><IdCodice>'+(brand.vatNum||'00000000000').replace(/\D/g,'').padStart(11,'0')+'</IdCodice></IdTrasmittente>',
      '    <ProgressivoInvio>'+Date.now().toString().slice(-6)+'</ProgressivoInvio>',
      '    <FormatoTrasmissione>FPR12</FormatoTrasmissione>',
      '    <CodiceDestinatario>0000000</CodiceDestinatario>',
      '  </DatiTrasmissione>',
      '  <CedentePrestatore>',
      '    <DatiAnagrafici>',
      '      <IdFiscaleIVA><IdPaese>IT</IdPaese><IdCodice>'+(brand.vatNum||'00000000000').replace(/\D/g,'').padStart(11,'0')+'</IdCodice></IdFiscaleIVA>',
      '      <Anagrafica><Denominazione>'+(brand.name||'Ingly Laser')+'</Denominazione></Anagrafica>',
      '      <RegimeFiscale>'+(ivaCfg.regime==='forfettario'?'RF19':'RF01')+'</RegimeFiscale>',
      '    </DatiAnagrafici>',
      '  </CedentePrestatore>',
      '  <CessionarioCommittente>',
      '    <DatiAnagrafici><Anagrafica><Denominazione>'+( ordine.client||'Cliente')+'</Denominazione></Anagrafica></DatiAnagrafici>',
      '  </CessionarioCommittente>',
      '</FatturaElettronicaHeader>',
      '<FatturaElettronicaBody>',
      '  <DatiGenerali>',
      '    <DatiGeneraliDocumento>',
      '      <TipoDocumento>TD01</TipoDocumento>',
      '      <Divisa>EUR</Divisa>',
      '      <Data>'+dateStr+'</Data>',
      '      <Numero>'+qn+'</Numero>',
      '      <ImportoTotaleDocumento>'+parseFloat(ordine.total||0).toFixed(2)+'</ImportoTotaleDocumento>',
      '    </DatiGeneraliDocumento>',
      '  </DatiGenerali>',
      '  <DatiBeniServizi>',
      '    <DettaglioLinee>',
      '      <NumeroLinea>1</NumeroLinea>',
      '      <Descrizione>'+(ordine.description||ordine.product||'Personalizzazione laser').slice(0,100)+'</Descrizione>',
      '      <Quantita>1.00</Quantita>',
      '      <PrezzoUnitario>'+imponibile.toFixed(2)+'</PrezzoUnitario>',
      '      <PrezzoTotale>'+imponibile.toFixed(2)+'</PrezzoTotale>',
      '      <AliquotaIVA>'+ivaRate.toFixed(2)+'</AliquotaIVA>',
      '    </DettaglioLinee>',
      '    <DatiRiepilogo>',
      '      <AliquotaIVA>'+ivaRate.toFixed(2)+'</AliquotaIVA>',
      '      <ImponibileImporto>'+imponibile.toFixed(2)+'</ImponibileImporto>',
      '      <Imposta>'+ivaAmt.toFixed(2)+'</Imposta>',
      '      <EsigibilitaIVA>I</EsigibilitaIVA>',
      '    </DatiRiepilogo>',
      '  </DatiBeniServizi>',
      '  <DatiPagamento>',
      '    <CondizioniPagamento>TP02</CondizioniPagamento>',
      '    <DettaglioPagamento>',
      '      <ModalitaPagamento>MP05</ModalitaPagamento>',
      '      <DataScadenzaPagamento>'+dateStr+'</DataScadenzaPagamento>',
      '      <ImportoPagamento>'+parseFloat(ordine.total||0).toFixed(2)+'</ImportoPagamento>',
      '    </DettaglioPagamento>',
      '  </DatiPagamento>',
      '</FatturaElettronicaBody>',
      '</p:FatturaElettronica>'
    ].join('\n');
    // Save to SDI store
    var sdi=[]; try{sdi=JSON.parse(localStorage.getItem('ingly_sdi_v1')||'[]');}catch(e){}
    var fattura={id:Date.now(),xml:xml,qn:qn,client:ordine.client,total:ordine.total,
      date:dateStr,ordineId:ordine.id,ivaRate:ivaRate,imponibile:imponibile.toFixed(2)};
    sdi.unshift(fattura); try{localStorage.setItem('ingly_sdi_v1',JSON.stringify(sdi.slice(0,100)));}catch(e){}
    // Auto register prima nota
    PrimaNota.register(ordine.client,parseFloat(ordine.total||0),'Fattura '+qn+' — '+( ordine.description||ordine.product||'Personalizzazione'));
    // Download XML
    var blob=new Blob([xml],{type:'application/xml;charset=utf-8'});
    var a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download=qn+'.xml'; a.click();
    if(typeof toast!=='undefined') toast('📄 FatturaPA generata: '+qn+' — €'+parseFloat(ordine.total||0).toFixed(2),'success');
    if(typeof window._inglyLastSave==='function') window._inglyLastSave('Fattura salvata');
    return fattura;
  }
};

// ─── PRIMA NOTA AUTOMATICA ──────────────────────────────────────
window.PrimaNota = {
  _SK:'ingly_prima_nota_v1',
  load:function(){try{return JSON.parse(localStorage.getItem(this._SK)||'[]');}catch(e){return[];}},
  save:function(d){try{localStorage.setItem(this._SK,JSON.stringify(d.slice(0,500)));}catch(e){}},
  register:function(cliente,importo,desc,tipo){
    tipo=tipo||'entrata';
    var d=this.load();
    d.unshift({id:Date.now(),date:new Date().toISOString(),cliente:cliente||'',
      importo:parseFloat(importo)||0,desc:desc||'',tipo:tipo});
    this.save(d);
    if(typeof window._inglyLastSave==='function') window._inglyLastSave('Prima nota aggiornata');
    return d[0];
  },
  getMonthlySummary:function(){
    var d=this.load(); var now=new Date().toISOString().slice(0,7);
    var lm=new Date(new Date().setMonth(new Date().getMonth()-1)).toISOString().slice(0,7);
    return {
      thisMon:d.filter(function(r){return r.date.slice(0,7)===now&&r.tipo==='entrata';}).reduce(function(a,r){return a+r.importo;},0),
      lastMon:d.filter(function(r){return r.date.slice(0,7)===lm&&r.tipo==='entrata';}).reduce(function(a,r){return a+r.importo;},0),
      total:d.reduce(function(a,r){return r.tipo==='entrata'?a+r.importo:a-r.importo;},0),
      count:d.length
    };
  }
};

// ─── INJECT FATTURA BUTTON IN ORDER TRACKER ─────────────────────
(function _patchOrdersForFattura(){
  function _p(){
    if(typeof OrderTracker==='undefined'){setTimeout(_p,700);return;}
    if(OrderTracker._v37fattura) return; OrderTracker._v37fattura=true;
    var _orig=OrderTracker.render.bind(OrderTracker);
    OrderTracker.render=function(){
      _orig();
      setTimeout(function(){
        var orders=[]; try{orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');}catch(e){}
        orders.forEach(function(o,i){
          if(!o||o.status==='draft') return; // Only show for non-draft
          var sel="[data-order-id='"+o.id+"']";
          var row=document.querySelector(sel);
          if(!row) row=document.querySelector('#view-order_tracker tbody tr:nth-child('+(i+1)+')');
          if(!row||row.querySelector('.fattura-btn')) return;
          var cell=row.querySelector('td:last-child div,td:last-child');
          if(!cell) return;
          var btn=document.createElement('button');
          btn.className='fattura-btn btn-v37 btn-ghost';
          btn.style.cssText='padding:4px 8px;font-size:10px;background:rgba(251,191,36,.1);color:#fbbf24;border:1px solid rgba(251,191,36,.3);border-radius:6px;cursor:pointer;white-space:nowrap';
          btn.innerHTML='📄 Fattura';
          btn.title='Genera FatturaPA XML SDI';
          btn.onclick=(function(ord){ return function(e){
            e.stopPropagation();
            if(confirm('Generare FatturaPA per ordine di '+ord.client+' (€'+( ord.total||0).toFixed(2)+')?')){
              FatturaDaOrdine.genera(ord);
              if(ord.status!=='paid'){
                // Auto-mark as paid
                ord.status='paid'; ord.paidAt=new Date().toISOString();
                var os=[]; try{os=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');}catch(e){}
                var idx=os.findIndex(function(x){return x.id===ord.id;});
                if(idx>=0){os[idx]=ord;try{localStorage.setItem('ingly_orders_pro_v1',JSON.stringify(os));}catch(e){}}
              }
            }
          };})(o);
          if(cell.appendChild) cell.appendChild(btn);
        });
      },300);
    };
    console.log('[v37] FatturaPA from Order injected');
  }
  setTimeout(_p,1500);
})();

// Auto-register prima nota when order moves to "paid"
(function _autoFirstNote(){
  function _p(){
    if(typeof OrderTracker==='undefined'){setTimeout(_p,700);return;}
    if(OrderTracker._v37nota) return; OrderTracker._v37nota=true;
    // Watch for status changes
    var _origUpdate=window.updateOrderStatus;
    if(typeof _origUpdate==='function'){
      window.updateOrderStatus=function(id,status){
        _origUpdate(id,status);
        if(status==='paid'){
          var orders=[]; try{orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');}catch(e){}
          var o=orders.find(function(x){return String(x.id)===String(id);});
          if(o&&!o._notaRegistered){
            PrimaNota.register(o.client,parseFloat(o.total||0),'Ordine #'+id+' — '+(o.description||o.product||''),'entrata');
            o._notaRegistered=true;
            try{localStorage.setItem('ingly_orders_pro_v1',JSON.stringify(orders));}catch(e){}
            if(typeof toast!=='undefined') toast('📒 Prima nota aggiornata: +€'+parseFloat(o.total||0).toFixed(2)+' ('+o.client+')','success');
          }
        }
      };
    }
  }
  setTimeout(_p,2000);
})();

// ─── CRM PERFORMANCE — Lista virtualizzata ───────────────────────
(function _crmPerformance(){
  function _p(){
    if(typeof CRMSmart==='undefined'||!CRMSmart._v26){setTimeout(_p,700);return;}
    if(CRMSmart._v37perf) return; CRMSmart._v37perf=true;

    /* ── RITIRATO ─────────────────────────────────────────────────────────
       Qui viveva un secondo `CRMSmart.render` che calcolava la pagina e poi
       chiamava quello originale, il quale ridisegnava l'elenco intero: la
       variabile `slice` era morta, e la barra appesa 200 ms dopo cambiava solo
       il numero. Misurato con 137 contatti: l'etichetta passava da «1 / 5» a
       «2 / 5» e le righe restavano 137, le stesse.

       Non è un difetto di questa patch soltanto: è la conseguenza di due
       funzioni che possiedono lo stesso disegno. La paginazione, la ricerca e
       l'ordinamento vivono ora in una pipeline sola dentro la patch 081
       (`CRMSmart._pipeline`), e la barra delle pagine è costruita dalla stessa
       chiamata che costruisce le righe. Anche l'antirimbalzo della ricerca è
       là, per lo stesso motivo.

       Presidiato da tests/qa/crm-paginazione.mjs. */
    console.log('[v37] CRM performance patch applied');
  }
  setTimeout(_p,2000);
})();

// ─── PROFILO CLIENTE DEDICATO ────────────────────────────────────
window.ClientProfile = {
  open:function(clientName){
    var clients=[]; try{clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');}catch(e){}
    var c=clients.find(function(x){return x.name===clientName;});
    if(!c){if(typeof toast!=='undefined')toast('Cliente non trovato','error');return;}
    var quotes=[]; try{quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');}catch(e){}
    var orders=[]; try{orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');}catch(e){}
    var notes={}; try{notes=JSON.parse(localStorage.getItem('ingly_note_interne_v1')||'{}');}catch(e){}
    var listino={}; try{listino=JSON.parse(localStorage.getItem('ingly_listino_v1')||'{}');}catch(e){}
    var cQuotes=quotes.filter(function(q){return q.client===c.name;}).sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
    var cOrders=orders.filter(function(o){return o.client===c.name;}).sort(function(a,b){return(b.created||b.date||'').localeCompare(a.created||a.date||'');});
    var cRev=cOrders.reduce(function(a,o){return a+(parseFloat(o.total||0));},0);
    var cNotes=notes[(c.name||'').toLowerCase().trim()]||{};
    var disc=(listino[(c.name||'').toLowerCase().trim()]?.discount||0);
    var FLAG_ICONS={vip:'⭐',lento:'🐌',attenzione:'⚠️',fido:'🤝',volume:'📦',sconto:'💰'};
    var flagIcon=FLAG_ICONS[cNotes.flag]||'';
    var w=window.open('','_blank','width=900,height=680,resizable=yes');
    if(!w){if(typeof toast!=='undefined')toast('Abilita popup','info');return;}

    var quoteRows=cQuotes.slice(0,8).map(function(q){
      var dt=new Date(q.date||Date.now()).toLocaleDateString('it',{day:'2-digit',month:'2-digit',year:'2-digit'});
      var sc={draft:'#64748b',confirmed:'#3b82f6',paid:'#22c55e',cancelled:'#ef4444'};
      return '<tr style="border-bottom:1px solid #1e293b">'
        +'<td style="padding:7px 10px;font-size:10px;color:#64748b">'+dt+'</td>'
        +'<td style="padding:7px 10px;font-size:11px;color:#f1f5f9">'+( q.product||'').slice(0,40)+'</td>'
        +'<td style="padding:7px 10px;font-weight:700;color:#6366f1">€'+(q.total||0).toFixed(2)+'</td>'
        +'<td style="padding:7px 10px"><span style="background:'+(sc[q.status||'draft']||'#64748b')+'20;color:'+(sc[q.status||'draft']||'#64748b')+';padding:1px 7px;border-radius:10px;font-size:9px;font-weight:700">'+(q.status||'draft')+'</span></td>'
        +'</tr>';
    }).join('');
    var orderRows=cOrders.slice(0,8).map(function(o){
      var dt=new Date(o.created||o.date||Date.now()).toLocaleDateString('it',{day:'2-digit',month:'2-digit',year:'2-digit'});
      var sc={draft:'#64748b',confirmed:'#3b82f6',in_progress:'#f59e0b',delivered:'#10b981',paid:'#22c55e',cancelled:'#ef4444'};
      return '<tr style="border-bottom:1px solid #1e293b">'
        +'<td style="padding:7px 10px;font-size:10px;color:#64748b">'+dt+'</td>'
        +'<td style="padding:7px 10px;font-size:11px;color:#f1f5f9">'+( o.description||o.product||'').slice(0,40)+'</td>'
        +'<td style="padding:7px 10px;font-weight:700;color:#10b981">€'+(o.total||0).toFixed(2)+'</td>'
        +'<td style="padding:7px 10px"><span style="background:'+(sc[o.status||'draft']||'#64748b')+'20;color:'+(sc[o.status||'draft']||'#64748b')+';padding:1px 7px;border-radius:10px;font-size:9px;font-weight:700">'+(o.status||'draft')+'</span></td>'
        +'</tr>';
    }).join('');

    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>👤 '+c.name+'</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;font-size:13px}'
      +'table{width:100%;border-collapse:collapse}th{background:#1e293b;padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase}'
      +'.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card{background:#1e293b;border-radius:12px;padding:14px;margin-bottom:12px}.btn{padding:8px 14px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700}'
      +'</style></head><body style="padding:20px">'
      // Header
      +'<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #334155">'
      +'<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff;flex-shrink:0">'+c.name.charAt(0).toUpperCase()+'</div>'
      +'<div style="flex:1">'
      +'<div style="font-size:22px;font-weight:900;color:#f1f5f9">'+flagIcon+' '+c.name+'</div>'
      +(c.company?'<div style="font-size:13px;color:#64748b">'+c.company+'</div>':'')
      +'<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">'
      +(c.phone?'<a href="tel:'+c.phone+'" style="font-size:12px;color:#25D366">📱 '+c.phone+'</a>':'')
      +(c.email?'<a href="mailto:'+c.email+'" style="font-size:12px;color:#6366f1">✉️ '+c.email+'</a>':'')
      +(disc>0?'<span style="background:rgba(245,158,11,.15);color:#f59e0b;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">💰 Sconto fisso: -'+disc+'%</span>':'')
      +(c.tags?c.tags.split(',').map(function(t){return '<span style="background:rgba(99,102,241,.1);color:#818cf8;padding:2px 8px;border-radius:10px;font-size:9px">'+t.trim()+'</span>';}).join(''):'')
      +'</div></div>'
      +'<div style="display:flex;gap:8px">'
      +'<button onclick="window.opener&&window.opener.QuoteGeneratorV2&&window.opener.QuoteGeneratorV2.open({clientName:\''+c.name.replace(/'/g,"\\'")+'\',clientPhone:\''+(c.phone||'')+'\'})" class="btn" style="background:linear-gradient(135deg,#22c55e,#059669);color:#fff">📄 Preventivo</button>'
      +(c.phone?'<button onclick="window.open(\'https://wa.me/'+c.phone.replace(/\D/g,'')+'\',\'_blank\')" class="btn" style="background:#25D36620;color:#25D366;border:1px solid #25D36640">💬 WA</button>':'')
      +'</div></div>'
      // Stats row
      +'<div class="grid2" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">'
      +[
        {l:'Fatturato Totale',v:'€'+cRev.toFixed(0),c:'#10b981'},
        {l:'N° Preventivi',v:cQuotes.length,c:'#6366f1'},
        {l:'N° Ordini',v:cOrders.length,c:'#f59e0b'},
        {l:'Aggiunto il',v:c.added?new Date(c.added).toLocaleDateString('it'):'—',c:'#64748b'},
      ].map(function(k){return '<div class="card" style="text-align:center"><div style="font-size:9px;color:#64748b;text-transform:uppercase;margin-bottom:4px">'+k.l+'</div><div style="font-size:20px;font-weight:900;color:'+k.c+'">'+k.v+'</div></div>';}).join('')
      +'</div>'
      // Notes interne
      +(cNotes.notes?'<div class="card" style="background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.2);margin-bottom:12px">'
        +'<div style="font-size:10px;font-weight:800;color:#818cf8;margin-bottom:6px">🔒 NOTE INTERNE</div>'
        +'<div style="font-size:12px;color:#f1f5f9;white-space:pre-wrap">'+cNotes.notes+'</div>'
        +'</div>':'')
      // Quote history
      +'<div class="grid2">'
      +'<div><div style="font-size:12px;font-weight:800;margin-bottom:8px">📄 Preventivi ('+cQuotes.length+')</div>'
      +(cQuotes.length?'<table><thead><tr><th>Data</th><th>Prodotto</th><th>Totale</th><th>Stato</th></tr></thead><tbody>'+quoteRows+'</tbody></table>':'<div style="padding:20px;text-align:center;color:#64748b">Nessun preventivo</div>')
      +'</div>'
      +'<div><div style="font-size:12px;font-weight:800;margin-bottom:8px">📦 Ordini ('+cOrders.length+')</div>'
      +(cOrders.length?'<table><thead><tr><th>Data</th><th>Descrizione</th><th>Totale</th><th>Stato</th></tr></thead><tbody>'+orderRows+'</tbody></table>':'<div style="padding:20px;text-align:center;color:#64748b">Nessun ordine</div>')
      +'</div></div>'
      +'<button onclick="close()" style="margin-top:16px;padding:9px 18px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    w.document.close();
  }
};

// Inject ClientProfile button to CRM rows
(function _injectProfileBtn(){
  function _p(){
    if(typeof CRMSmart==='undefined'||!CRMSmart._v31qbtn){setTimeout(_p,700);return;}
    if(CRMSmart._v37profBtn) return; CRMSmart._v37profBtn=true;
    var _orig=CRMSmart.render.bind(CRMSmart);
    CRMSmart.render=function(){
      _orig();
      setTimeout(function(){
        var data=CRMSmart._load();
        data.forEach(function(c,i){
          var row=document.getElementById('crm-row-'+i);
          if(!row||row.querySelector('.prof-btn')) return;
          var cell=row.querySelector('td:last-child>div');
          if(!cell) return;
          var btn=document.createElement('button');
          btn.className='prof-btn btn-v37 btn-ghost';
          btn.title='Profilo cliente completo';
          btn.style.cssText='padding:4px 8px;background:rgba(99,102,241,.1);color:#818cf8;border:1px solid rgba(99,102,241,.25);border-radius:6px;cursor:pointer;font-size:11px;font-weight:700';
          btn.innerHTML='👤';
          btn.onclick=(function(name){return function(){ClientProfile.open(name);};})(c.name);
          cell.insertBefore(btn,cell.firstChild);
        });
      },400);
    };
  }
  setTimeout(_p,4000);
})();

console.log('[v37-P2] FatturaPA 1-click · Prima nota auto · CRM perf · Client profile ✅');


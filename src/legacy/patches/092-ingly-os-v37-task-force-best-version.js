
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

/* Il bottone «📄 Fattura» viveva qui, iniettato nelle righe di «Avanzamento
   ordini» trecento millisecondi dopo ogni render. Leggeva gli ordini da
   `ingly_orders_pro_v1` e, alla generazione, ci scriveva sopra `status:'paid'`:
   segnava pagata una copia che nessun'altra vista leggeva — l'ordine vero, in
   `orders`, restava non pagato.

   La funzione non è andata persa: `GestioneOrdini._fatturaPA()` la chiama
   dalla lista di Ordini, sul record canonico, e il passaggio a «venduto» lo fa
   la funzione SSOT. `window.FatturaDaOrdine`, il generatore vero e proprio,
   resta qui sopra dov'era: non è stato riscritto. */

// Auto-register prima nota when order moves to "paid"
(function _autoFirstNote(){
  function _p(){
    if(typeof OrderTracker==='undefined'){setTimeout(_p,700);return;}
    if(OrderTracker._v37nota) return; OrderTracker._v37nota=true;
    // Watch for status changes
    var _origUpdate=window.updateOrderStatus;
    if(typeof _origUpdate==='function'){
      /* Questo involucro perdeva tre cose, tutte in silenzio:
         · il terzo argomento `opts` — `opts.note` non finiva mai nello storico
           e `opts.skipSale` non arrivava, così la vendita automatica scattava
           anche quando il chiamante aveva chiesto di non crearla;
         · il valore di ritorno — `GestioneOrdini.transition()` riceveva
           `undefined`, e QuickStats e SidebarBadges non si aggiornavano mai
           dopo un cambio di stato;
         · l'attesa — l'originale è `async`, e la prima nota veniva registrata
           prima che l'ordine fosse salvato.
         Ora l'involucro inoltra tutto, attende, e restituisce. */
      window.updateOrderStatus=async function(id,status,opts){
        var esito=await _origUpdate(id,status,opts);
        if(status==='paid'||status==='venduto'||status==='sold'){
          /* L'ordine si legge dallo store canonico, non da
             `ingly_orders_pro_v1`: il pagamento riguarda l'ordine vero. */
          var o=esito;
          if(!o&&window.IDB){ try{ o=await IDB.get('orders',id); }catch(e){} }
          /* `PrimaNota` come identificativo nudo si lega alla `const` della
             patch 059, che non ha `register`: il registro di cassa vero è
             quello su `window`, definito qui sotto. La chiamata nuda lanciava
             un TypeError — restava invisibile solo perché non era attesa da
             nessuno. Si passa da window, e si controlla il metodo.

             Il fallimento della prima nota non deve far fallire il cambio di
             stato: l'ordine è già salvato, e perderlo per un errore nella
             contabilità sarebbe il danno maggiore. */
          var registro=window.PrimaNota;
          if(o&&!o._notaRegistered&&registro&&typeof registro.register==='function'){
            try{
              var importo=parseFloat(o.total||o.value||0)||0;
              var cliente=o.clientName||o.client||'';
              registro.register(cliente,importo,'Ordine #'+id+' — '+(o.name||o.description||o.product||''),'entrata');
              o._notaRegistered=true;
              if(window.IDB) await IDB.put('orders',o);
              if(typeof toast!=='undefined') toast('📒 Prima nota aggiornata: +€'+importo.toFixed(2)+(cliente?' ('+cliente+')':''),'success');
            }catch(e){
              if(window.Ingly&&window.Ingly.Errors) window.Ingly.Errors.log('prima nota da ordine', e);
            }
          }
        }
        return esito;
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
/* Il pannello componeva l'HTML del popup interpolando nome, azienda, note e
   prodotto senza escaping: un cliente con `<script>` nel nome (o nelle note
   interne, o nella descrizione di un ordine) lo eseguiva alla prima apertura
   di questo profilo. Non è teorico — sono tutti campi che un modulo di
   import CSV/VCF scrive senza validazione. Corretto qui, riusando la stessa
   regola del resto del progetto: tutto ciò che finisce in innerHTML/
   document.write passa da esc(). */
function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g,function(x){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[x];
  });
}

window.ClientProfile = {
  /* Cercava il cliente per NOME, poi filtrava preventivi/ordini per lo
     STESSO nome (`q.client===c.name`). Due clienti con lo stesso nome —
     "Mario Rossi" padre e figlio non sono un caso raro in un laboratorio —
     vedevano il fatturato, gli ordini e i preventivi l'uno dell'altro nella
     stessa finestra. CRM-04 aveva già dato a ogni cliente un id stabile
     proprio per questo motivo («Rossi e Rossi sono spesso due clienti
     diversi») e preventivi/ordini portano già `clientId` nello stesso spazio
     di id (`AppStore` popola i menu con `c.id`, non col nome): il difetto era
     che questo pannello non lo usava. Ora risolve per id; un record senza
     `clientId` (preventivo/ordine scritto prima di CRM-04) resta comunque
     visibile tramite il nome come ripiego dichiarato, non silenzioso. */
  open:function(clientId){
    var C = window.InglyClienti;
    var c = C ? C.perId(clientId) : null;
    if(!c){
      var clients=[]; try{clients=JSON.parse(localStorage.getItem('ingly_crm_v1')||'[]');}catch(e){}
      c=clients.find(function(x){return String(x.id)===String(clientId);}) || null;
    }
    if(!c){if(typeof toast!=='undefined')toast('Cliente non trovato','error');return;}
    var quotes=[]; try{quotes=JSON.parse(localStorage.getItem('lb2b_quotes_v1')||'[]');}catch(e){}
    var orders=[]; try{orders=JSON.parse(localStorage.getItem('ingly_orders_pro_v1')||'[]');}catch(e){}
    var notes={}; try{notes=JSON.parse(localStorage.getItem('ingly_note_interne_v1')||'{}');}catch(e){}
    var listino={}; try{listino=JSON.parse(localStorage.getItem('ingly_listino_v1')||'{}');}catch(e){}
    var perId=function(x){return x.clientId!=null && String(x.clientId)===String(c.id);};
    var perNomeLegacy=function(x){return x.clientId==null && x.client===c.name;};
    var cQuotes=quotes.filter(function(q){return perId(q)||perNomeLegacy(q);}).sort(function(a,b){return(b.date||'').localeCompare(a.date||'');});
    var cOrders=orders.filter(function(o){return perId(o)||perNomeLegacy(o);}).sort(function(a,b){return(b.created||b.date||'').localeCompare(a.created||a.date||'');});
    var cNotes=notes[(c.name||'').toLowerCase().trim()]||{};
    var disc=(listino[(c.name||'').toLowerCase().trim()]?.discount||0);
    var FLAG_ICONS={vip:'⭐',lento:'🐌',attenzione:'⚠️',fido:'🤝',volume:'📦',sconto:'💰'};
    var flagIcon=FLAG_ICONS[cNotes.flag]||'';

    /* CRM-15/17 — storico economico, CLV e timeline vengono dal motore
       canonico (InglyCustomer360, che a sua volta consuma InglyOrderEconomics/
       InglyQuoteStatus/InglyCLV): questo pannello non ricalcola ricavo, costo,
       margine o valore cliente. Se il modulo non è nel bundle il pannello
       degrada a quanto mostrava prima — non sparisce e non finge un numero. */
    var Cust = window.InglyCustomer360;
    var stat = Cust ? Cust.statisticheCliente(c.id, {ordini:orders, preventivi:quotes}) : null;
    var storico = Cust ? Cust.storicoEconomico(c.id, orders) : [];
    var clv = Cust ? Cust.clvCliente(c.id, orders, [c]) : null;
    var timeline = Cust ? Cust.timelineCliente(c.id, {cliente:c, preventivi:quotes, ordini:orders}) : [];

    var w=window.open('','_blank','width=980,height=800,resizable=yes');
    if(!w){if(typeof toast!=='undefined')toast('Abilita popup','info');return;}

    var eu=function(v){return '€'+(Math.round((parseFloat(v)||0)*100)/100).toFixed(2);};
    var pc=function(v){return (parseFloat(v)||0).toFixed(1)+'%';};
    var nd='<span style="color:#475569">N/D</span>';
    /* Ogni KPI economico passa da qui: un valore noto si formatta, uno non
       noto diventa N/D con il motivo in un tooltip — mai un numero indovinato
       al posto di un dato assente (Cost Engine e InglyOrderEconomics già
       distinguono "zero" da "non dichiarato": questo pannello lo rispetta). */
    var kpi=function(campo, fmt){
      if(!campo || !campo.noto) return '<span title="'+esc(campo&&campo.motivo||'dato non disponibile')+'">'+nd+'</span>';
      return fmt(campo.valore);
    };

    var quoteRows=cQuotes.slice(0,8).map(function(q){
      var dt=new Date(q.date||Date.now()).toLocaleDateString('it',{day:'2-digit',month:'2-digit',year:'2-digit'});
      var sc={draft:'#64748b',confirmed:'#3b82f6',paid:'#22c55e',cancelled:'#ef4444'};
      return '<tr style="border-bottom:1px solid #1e293b">'
        +'<td style="padding:7px 10px;font-size:10px;color:#64748b">'+dt+'</td>'
        +'<td style="padding:7px 10px;font-size:11px;color:#f1f5f9">'+esc((q.product||'').slice(0,40))+'</td>'
        +'<td style="padding:7px 10px;font-weight:700;color:#6366f1">'+eu(q.total)+'</td>'
        +'<td style="padding:7px 10px"><span style="background:'+(sc[q.status||'draft']||'#64748b')+'20;color:'+(sc[q.status||'draft']||'#64748b')+';padding:1px 7px;border-radius:10px;font-size:9px;font-weight:700">'+esc(q.status||'draft')+'</span></td>'
        +'</tr>';
    }).join('');
    var orderRows=cOrders.slice(0,8).map(function(o){
      var dt=new Date(o.created||o.date||Date.now()).toLocaleDateString('it',{day:'2-digit',month:'2-digit',year:'2-digit'});
      var sc={draft:'#64748b',confirmed:'#3b82f6',in_progress:'#f59e0b',delivered:'#10b981',paid:'#22c55e',cancelled:'#ef4444'};
      return '<tr style="border-bottom:1px solid #1e293b">'
        +'<td style="padding:7px 10px;font-size:10px;color:#64748b">'+dt+'</td>'
        +'<td style="padding:7px 10px;font-size:11px;color:#f1f5f9">'+esc((o.description||o.product||'').slice(0,40))+'</td>'
        +'<td style="padding:7px 10px;font-weight:700;color:#10b981">'+eu(o.total)+'</td>'
        +'<td style="padding:7px 10px"><span style="background:'+(sc[o.status||'draft']||'#64748b')+'20;color:'+(sc[o.status||'draft']||'#64748b')+';padding:1px 7px;border-radius:10px;font-size:9px;font-weight:700">'+esc(o.status||'draft')+'</span></td>'
        +'</tr>';
    }).join('');

    /* ── Storico economico (CRM-15): periodo × ordini/ricavi/costi/profitto/margine/ticket medio */
    var storicoRows=storico.map(function(p){
      return '<tr style="border-bottom:1px solid #1e293b">'
        +'<td style="padding:7px 10px;font-size:11px;color:#f1f5f9;font-weight:700">'+esc(p.label)+'</td>'
        +'<td style="padding:7px 10px;font-size:11px;text-align:right">'+p.ordini+'</td>'
        +'<td style="padding:7px 10px;font-size:11px;text-align:right;color:#10b981">'+(p.ricavi!=null?eu(p.ricavi):nd)+'</td>'
        +'<td style="padding:7px 10px;font-size:11px;text-align:right;color:#ef4444">'+(p.costi!=null?eu(p.costi):nd)+'</td>'
        +'<td style="padding:7px 10px;font-size:11px;text-align:right;font-weight:700">'+(p.profitto!=null?eu(p.profitto):nd)+'</td>'
        +'<td style="padding:7px 10px;font-size:11px;text-align:right">'+(p.marginePct!=null?pc(p.marginePct):nd)+'</td>'
        +'<td style="padding:7px 10px;font-size:11px;text-align:right">'+(p.ticketMedio!=null?eu(p.ticketMedio):nd)+'</td>'
        +(p.ordini>0 && !p.coperturaCompleta?'<td style="padding:7px 4px;font-size:9px;color:#f59e0b" title="alcuni ordini di questo periodo non hanno un ricavo dichiarato: i totali contano solo quelli noti">⚠</td>':'<td></td>')
        +'</tr>';
    }).join('');

    /* ── Valore cliente (CLV) — dall'unica formula, InglyCLV ── */
    var clvHtml;
    if(clv && clv.disponibile){
      var r=clv.riga;
      clvHtml='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">'
        +'<div><div style="font-size:9px;color:#64748b;text-transform:uppercase">Valore storico (margine)</div>'
        +'<div style="font-size:16px;font-weight:900;color:'+(r.storico.margineNoto?'#22c55e':'#64748b')+'">'+(r.storico.margineNoto?eu(r.storico.margine):nd)+'</div>'
        +(!r.storico.margineNoto?'<div style="font-size:9px;color:#64748b">costo non dichiarato su '+(r.storico.ordini-r.storico.ordiniConCosto)+' di '+r.storico.ordini+' ordini</div>':'')
        +'</div>'
        +'<div><div style="font-size:9px;color:#64748b;text-transform:uppercase">Previsto (12 mesi)</div>'
        +'<div style="font-size:16px;font-weight:900;color:'+(r.previsto.margine!=null?'#818cf8':'#64748b')+'">'+(r.previsto.margine!=null?eu(r.previsto.margine):nd)+'</div>'
        +(r.previsto.motivo?'<div style="font-size:9px;color:#64748b">'+esc(r.previsto.motivo)+'</div>':'')
        +'</div></div>'
        +'<div style="font-size:9px;color:#475569;margin-top:8px">Confidence: '+(r.storico.margineNoto?'reale (costo dichiarato su tutti gli ordini)':(r.storico.ordiniConCosto>0?'parziale (costo noto solo su alcuni ordini)':'assente (nessun costo dichiarato)'))+' · fonte InglyCLV</div>';
    } else {
      clvHtml='<div style="font-size:12px;color:#64748b">Dati insufficienti'+(clv&&clv.motivo?' — '+esc(clv.motivo):'')+'</div>';
    }

    /* ── Timeline unificata (CRM-17) — solo eventi con una data vera ── */
    var TL_ICONE={CLIENTE_CREATO:'🆕',CLIENTE_MODIFICATO:'✏️',PREVENTIVO_CREATO:'📄',PREVENTIVO_VISTO:'👀',ORDINE_CREATO:'📦',ORDINE_AGGIORNATO:'🔄'};
    var timelineHtml=timeline.length?timeline.slice(0,30).map(function(ev){
      var dt=new Date(ev.data).toLocaleDateString('it',{day:'2-digit',month:'2-digit',year:'2-digit'});
      return '<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #1e293b">'
        +'<div style="font-size:14px">'+(TL_ICONE[ev.tipo]||'•')+'</div>'
        +'<div style="flex:1"><div style="font-size:12px;color:#f1f5f9">'+esc(ev.etichetta)+(ev.rif&&ev.rif.statoAttuale?' <span style="color:#64748b">· '+esc(ev.rif.statoAttuale)+'</span>':'')+'</div>'
        +(ev.dettaglio?'<div style="font-size:10px;color:#64748b">'+esc(ev.dettaglio)+'</div>':'')+'</div>'
        +'<div style="font-size:10px;color:#475569;white-space:nowrap">'+dt+'</div></div>';
    }).join(''):'<div style="padding:16px;text-align:center;color:#64748b;font-size:12px">Nessun evento con una data registrata</div>';

    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>👤 '+esc(c.name)+'</title>'
      +'<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#0f172a;color:#f1f5f9;font-size:13px}'
      +'table{width:100%;border-collapse:collapse}th{background:#1e293b;padding:8px 10px;text-align:left;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase}'
      +'.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card{background:#1e293b;border-radius:12px;padding:14px;margin-bottom:12px}.btn{padding:8px 14px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:700}'
      +'.sect{font-size:12px;font-weight:800;margin-bottom:8px;color:#e2e8f0}'
      +'</style></head><body style="padding:20px">'
      // Header
      +'<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #334155">'
      +'<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:900;color:#fff;flex-shrink:0">'+esc(c.name.charAt(0).toUpperCase())+'</div>'
      +'<div style="flex:1">'
      +'<div style="font-size:22px;font-weight:900;color:#f1f5f9">'+flagIcon+' '+esc(c.name)+'</div>'
      +(c.company?'<div style="font-size:13px;color:#64748b">'+esc(c.company)+'</div>':'')
      +'<div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">'
      +(c.phone?'<a href="tel:'+esc(c.phone)+'" style="font-size:12px;color:#25D366">📱 '+esc(c.phone)+'</a>':'')
      +(c.email?'<a href="mailto:'+esc(c.email)+'" style="font-size:12px;color:#6366f1">✉️ '+esc(c.email)+'</a>':'')
      +(disc>0?'<span style="background:rgba(245,158,11,.15);color:#f59e0b;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700">💰 Sconto fisso: -'+esc(String(disc))+'%</span>':'')
      +(c.tags?c.tags.split(',').map(function(t){return '<span style="background:rgba(99,102,241,.1);color:#818cf8;padding:2px 8px;border-radius:10px;font-size:9px">'+esc(t.trim())+'</span>';}).join(''):'')
      +'</div></div>'
      +'<div style="display:flex;gap:8px">'
      +'<button onclick="window.opener&&window.opener.QuoteGeneratorV2&&window.opener.QuoteGeneratorV2.open({clientName:'+JSON.stringify(c.name)+',clientPhone:'+JSON.stringify(c.phone||'')+'})" class="btn" style="background:linear-gradient(135deg,#22c55e,#059669);color:#fff">📄 Preventivo</button>'
      +(c.phone?'<button onclick="window.open('+JSON.stringify('https://wa.me/'+String(c.phone).replace(/\D/g,''))+',\'_blank\')" class="btn" style="background:#25D36620;color:#25D366;border:1px solid #25D36640">💬 WA</button>':'')
      +'</div></div>'
      // Stats row (CRM-15) — dal motore canonico, N/D quando non noto
      +'<div class="grid2" style="grid-template-columns:repeat(4,1fr);margin-bottom:10px">'
      +(stat?[
        {l:'Fatturato Totale',v:kpi(stat.ordini.fatturatoNetto,eu),c:'#10b981'},
        {l:'N° Ordini',v:stat.ordini.numero,c:'#f59e0b'},
        {l:'N° Preventivi',v:stat.preventivi.numero,c:'#6366f1'},
        {l:'Preventivi accettati',v:stat.preventivi.accettatiOConvertiti!=null?stat.preventivi.accettatiOConvertiti:nd,c:'#8b5cf6'},
        {l:'Tasso conversione',v:kpi(stat.preventivi.tassoConversionePct,pc),c:'#8b5cf6'},
        {l:'Valore medio ordine',v:kpi(stat.ordini.valoreMedio,eu),c:'#06b6d4'},
        {l:'Margine',v:kpi(stat.ordini.marginePct,pc),c:'#22c55e'},
        {l:'Ultimo ordine',v:stat.ordini.ultimo?new Date(stat.ordini.ultimo).toLocaleDateString('it'):nd,c:'#64748b'},
      ]:[
        {l:'N° Preventivi',v:cQuotes.length,c:'#6366f1'},
        {l:'N° Ordini',v:cOrders.length,c:'#f59e0b'},
      ]).map(function(k){return '<div class="card" style="text-align:center"><div style="font-size:9px;color:#64748b;text-transform:uppercase;margin-bottom:4px">'+esc(k.l)+'</div><div style="font-size:18px;font-weight:900;color:'+k.c+'">'+k.v+'</div></div>';}).join('')
      +'</div>'
      +'<div style="font-size:9px;color:#475569;margin-bottom:16px">Aggiunto il '+(c.added||c.createdAt?new Date(c.added||c.createdAt).toLocaleDateString('it'):'—')+'</div>'
      // Notes interne
      +(cNotes.notes?'<div class="card" style="background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.2);margin-bottom:12px">'
        +'<div style="font-size:10px;font-weight:800;color:#818cf8;margin-bottom:6px">🔒 NOTE INTERNE</div>'
        +'<div style="font-size:12px;color:#f1f5f9;white-space:pre-wrap">'+esc(cNotes.notes)+'</div>'
        +'</div>':'')
      // Storico economico (CRM-15)
      +(stat?'<div class="card"><div class="sect">📊 Storico economico</div>'
        +'<table><thead><tr><th>Periodo</th><th style="text-align:right">Ordini</th><th style="text-align:right">Ricavi</th><th style="text-align:right">Costi</th><th style="text-align:right">Profitto</th><th style="text-align:right">Margine</th><th style="text-align:right">Ticket medio</th><th></th></tr></thead><tbody>'+storicoRows+'</tbody></table></div>':'')
      // CLV (CRM-15)
      +(stat?'<div class="card"><div class="sect">💎 Valore cliente (CLV)</div>'+clvHtml+'</div>':'')
      // Quote/order history
      +'<div class="grid2">'
      +'<div><div style="font-size:12px;font-weight:800;margin-bottom:8px">📄 Preventivi ('+cQuotes.length+')</div>'
      +(cQuotes.length?'<table><thead><tr><th>Data</th><th>Prodotto</th><th>Totale</th><th>Stato</th></tr></thead><tbody>'+quoteRows+'</tbody></table>':'<div style="padding:20px;text-align:center;color:#64748b">Nessun preventivo</div>')
      +'</div>'
      +'<div><div style="font-size:12px;font-weight:800;margin-bottom:8px">📦 Ordini ('+cOrders.length+')</div>'
      +(cOrders.length?'<table><thead><tr><th>Data</th><th>Descrizione</th><th>Totale</th><th>Stato</th></tr></thead><tbody>'+orderRows+'</tbody></table>':'<div style="padding:20px;text-align:center;color:#64748b">Nessun ordine</div>')
      +'</div></div>'
      // Timeline (CRM-17)
      +'<div class="card" style="margin-top:12px"><div class="sect">🕒 Timeline</div>'+timelineHtml+'</div>'
      +'<button onclick="close()" style="margin-top:16px;padding:9px 18px;background:#1e293b;color:#94a3b8;border:1px solid #334155;border-radius:8px;cursor:pointer">Chiudi</button>'
      +'</body></html>');
    w.document.close();
  }
};

/* CRM-05 — il pulsante «profilo cliente» si registra nel renderer.
   Due difetti in questo blocco, entrambi misurati:
   · aspettava `CRMSmart._v31qbtn`, un contrassegno che **nessuno imposta**
     in tutto il file: il polling ogni 700 ms non finiva mai e il pulsante non
     veniva installato nemmeno una volta;
   · anche se fosse partito, cercava `#crm-row-<indice>` — l'identificatore
     che CRM-04 ha sostituito con l'id del cliente. */
(function _injectProfileBtn(){
  function _p(){
    var R = window.InglyClienteRiga;
    if(typeof ClientProfile==='undefined'||!R||typeof R.aggiungiAzione!=='function'){setTimeout(_p,700);return;}
    if(R._v37profBtn) return; R._v37profBtn=true;
    R.aggiungiAzione({
      id:'profilo-cliente',
      classe:'prof-btn btn-v37 btn-ghost',
      icona:'👤', titolo:'Profilo cliente completo',
      /* Passa l'id, non il nome: due clienti con lo stesso nome aprivano lo
         stesso profilo — vedi il commento su ClientProfile.open. */
      comando:function(c){ return "ClientProfile.open('"+String(c.id).replace(/'/g,"")+"')"; },
      stile:'padding:4px 8px;background:rgba(99,102,241,.1);color:#818cf8;border:1px solid rgba(99,102,241,.25);border-radius:6px;cursor:pointer;font-size:11px;font-weight:700',
    });
  }
  setTimeout(_p,2500);
})();


console.log('[v37-P2] FatturaPA 1-click · Prima nota auto · CRM perf · Client profile ✅');


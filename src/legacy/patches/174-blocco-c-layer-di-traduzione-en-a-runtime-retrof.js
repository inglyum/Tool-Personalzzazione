
/* ═══════════════════════════════════════════════════════════════════════════
   BLOCCO C — Layer di traduzione EN a runtime (retrofit, additivo, reversibile)
   ---------------------------------------------------------------------------
   Il contenuto dei moduli è scritto con stringhe italiane hardcoded nei
   template: il sistema I18n a chiavi copre solo la nav. Questo layer traduce
   il DOM della vista attiva quando la lingua è "en", con match su NODO INTERO
   (niente sostituzioni parziali → nessun testo storpiato). Tornando su "it"
   l'app ri-renderizza dalla sorgente italiana, quindi è 100% reversibile.
   Le stringhe non ancora tradotte finiscono in window.__i18nMissing così il
   dizionario può crescere verso il 100% senza refactor del monolite.
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.__inglyEN) return; window.__inglyEN=true;

  // ── Dizionario IT → EN (frasi visibili intere). Estendibile. ──────────────
  var PH={
    // Bottoni / azioni comuni
    "Aggiungi":"Add","+ Aggiungi":"+ Add","Nuovo":"New","Modifica":"Edit","Elimina":"Delete",
    "Salva":"Save","Annulla":"Cancel","Chiudi":"Close","Esporta":"Export","Importa":"Import",
    "Scarica":"Download","Aggiorna":"Refresh","Cerca":"Search","Filtra":"Filter","Copia":"Copy",
    "Copia tutto":"Copy all","Genera":"Generate","Genera piano":"Generate plan","Conferma":"Confirm",
    "Indietro":"Back","Avanti":"Next","Fatto":"Done","Applica":"Apply","Reset":"Reset","Dettagli":"Details",
    "Vedi tutto":"View all","Apri":"Open","Salva modifiche":"Save changes","Duplica":"Duplicate",
    "🤖 AI Analisi":"🤖 AI Analysis","AI Analisi":"AI Analysis","🧩 Kit":"🧩 Kit",
    // Stati / priorità
    "Attivo":"Active","Inattivo":"Inactive","Completato":"Completed","In corso":"In progress",
    "In attesa":"Pending","Scaduto":"Expired","Critico":"Critical","Alto":"High","Medio":"Medium",
    "Basso":"Low","Urgente":"Urgent","Nuovo prodotto":"New product","Disponibile":"Available",
    "Esaurito":"Out of stock","In arrivo":"Incoming","Consegnato":"Delivered","Pagato":"Paid",
    "Da pagare":"Unpaid","Bozza":"Draft","Inviato":"Sent","Accettato":"Accepted","Rifiutato":"Rejected",
    // Tempo
    "Oggi":"Today","Ieri":"Yesterday","Domani":"Tomorrow","Settimana":"Week","Mese":"Month",
    "Anno":"Year","Giorno":"Day","Giorni":"Days","Questa settimana":"This week","Questo mese":"This month",
    "Lunedì":"Monday","Martedì":"Tuesday","Mercoledì":"Wednesday","Giovedì":"Thursday",
    "Venerdì":"Friday","Sabato":"Saturday","Domenica":"Sunday",
    // Business / KPI
    "Ricavi":"Revenue","Costi":"Costs","Margine":"Margin","Profitto":"Profit","Fatturato":"Turnover",
    "Ordini":"Orders","Clienti":"Clients","Preventivi":"Quotes","Preventivo":"Quote","Vendite":"Sales",
    "Prodotti":"Products","Prodotto":"Product","Prezzo":"Price","Quantità":"Quantity","Totale":"Total",
    "Sconto":"Discount","Conversione":"Conversion","Ticket medio":"Average ticket","Obiettivo":"Target",
    "Investimento":"Investment","Investimento totale":"Total investment","Materiale":"Material",
    "Materiali":"Materials","Lavoro":"Labor","Macchina":"Machine","Macchinari":"Machinery","Design":"Design",
    // Lab & Lista Acquisti AI
    "Lab & Lista Acquisti AI":"Lab & Shopping List AI","Dashboard AI":"AI Dashboard",
    "Lista Prodotti":"Product List","Lista Acquisti":"Shopping List","Kit Manager":"Kit Manager",
    "Analisi Costi":"Cost Analysis","🤖 AI — Cosa Comprare":"🤖 AI — What to Buy",
    "⚙️ Macchinari Sincronizzati":"⚙️ Synced Machinery","Lista Acquisti Intelligente":"Smart Shopping List",
    "🛒 Lista Acquisti Intelligente":"🛒 Smart Shopping List","Prodotti tot.":"Total products",
    "Critici mancanti":"Missing critical","Macchinari sync":"Synced machines","Suggerimenti AI":"AI suggestions",
    "Tutto il necessario è presente!":"Everything you need is in stock!",
    // Quote Intelligence
    "Quote Intelligence":"Quote Intelligence","🎯 Quote Intelligence":"🎯 Quote Intelligence",
    // Opportunity Scanner
    "Opportunity Scanner":"Opportunity Scanner","Trend":"Trend","Gap mercato":"Market gap",
    "Stagionalità":"Seasonality","Nuovi prodotti":"New products",
    // Finance Pro
    "Finance Pro":"Finance Pro","Costi Fissi":"Fixed Costs","Cashflow":"Cashflow","Break-even":"Break-even",
    "AI Advisor":"AI Advisor","Riserva":"Reserve","Tasse":"Taxes","Operativo":"Operating",
    // Sezioni / vocabolario ricorrente
    "Panoramica business in tempo reale":"Real-time business overview","Impostazioni":"Settings",
    "Magazzino":"Inventory","Catalogo":"Catalog","Marketing Pro":"Marketing Pro","Progetti":"Projects",
    "Nessun dato":"No data","Nessun risultato":"No results","Caricamento...":"Loading...",
    "Errore":"Error","Successo":"Success","Attenzione":"Warning"
  };
  // Emoji iniziale opzionale da preservare
  var EMO=/^([\p{Extended_Pictographic}️‍\s]+)/u;

  function trOne(raw){
    if(!raw) return null;
    var t=raw.trim(); if(!t) return null;
    if(PH.hasOwnProperty(t)){
      var lead=raw.match(/^\s*/)[0], trail=raw.match(/\s*$/)[0];
      return lead+PH[t]+trail;
    }
    // fallback: preserva un'eventuale emoji iniziale e traduci il resto
    var m=t.match(EMO);
    if(m){
      var rest=t.slice(m[1].length).trim();
      if(rest && PH.hasOwnProperty(rest)){
        var lead2=raw.match(/^\s*/)[0], trail2=raw.match(/\s*$/)[0];
        return lead2+m[1]+PH[rest]+trail2;
      }
    }
    // registra la stringa mancante (dev aid, non intrusivo)
    if(t.length>1 && /[A-Za-zÀ-ÿ]/.test(t) && !/^\d/.test(t)){
      window.__i18nMissing=window.__i18nMissing||{}; window.__i18nMissing[t]=(window.__i18nMissing[t]||0)+1;
    }
    return null;
  }

  var SKIP={SCRIPT:1,STYLE:1,NOSCRIPT:1,CODE:1,PRE:1,SVG:1};
  function walk(node){
    if(!node) return;
    if(node.nodeType===3){
      var out=trOne(node.nodeValue);
      if(out!==null && out!==node.nodeValue) node.nodeValue=out;
      return;
    }
    if(node.nodeType!==1) return;
    if(SKIP[node.tagName]) return;
    if(node.hasAttribute && node.hasAttribute('data-noi18n')) return;
    // attributi traducibili
    if(node.tagName==='INPUT'||node.tagName==='TEXTAREA'){
      var ph=node.getAttribute('placeholder'); if(ph){ var o=trOne(ph); if(o) node.setAttribute('placeholder',o.trim()); }
    }
    var ti=node.getAttribute&&node.getAttribute('title'); if(ti){ var o2=trOne(ti); if(o2) node.setAttribute('title',o2.trim()); }
    for(var c=node.firstChild;c;c=c.nextSibling) walk(c);
  }

  function activeView(){
    return document.querySelector('.section-view.active') || document.getElementById('main-content') || document.body;
  }
  function apply(){
    try{ if(!window.I18n||I18n.lang!=='en') return; walk(activeView()); }catch(e){}
  }
  window.InglyEN={ apply:apply, dict:PH };

  // Wrap del toggle esistente: dopo il re-render, sovrapponi l'inglese
  function hook(){
    if(!window.I18n||I18n.__enHooked) return true;
    I18n.__enHooked=true;
    var _toggle=I18n.toggle ? I18n.toggle.bind(I18n) : null;
    if(_toggle){ I18n.toggle=function(){ _toggle(); setTimeout(apply,60); }; }
    var _apply=I18n.apply ? I18n.apply.bind(I18n) : null;
    if(_apply){ I18n.apply=function(){ _apply(); if(I18n.lang==='en') setTimeout(apply,20); }; }
    return true;
  }
  var hi=setInterval(function(){ if(hook()) clearInterval(hi); },300);
  setTimeout(function(){ clearInterval(hi); },8000);

  // Osserva la vista attiva: le sezioni si renderizzano on-demand → ritraduci
  var deb;
  function schedule(){ clearTimeout(deb); deb=setTimeout(apply,180); }
  function observe(){
    var root=document.getElementById('main-content')||document.body;
    var mo=new MutationObserver(function(){ if(window.I18n&&I18n.lang==='en') schedule(); });
    mo.observe(root,{childList:true,subtree:true,characterData:false});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ setTimeout(observe,1200); });
  else setTimeout(observe,1200);
})();

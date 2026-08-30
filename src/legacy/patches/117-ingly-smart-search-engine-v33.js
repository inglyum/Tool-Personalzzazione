
/* ════════════════════════════════════════════════════════════════
   🔍 INGLY SMART SEARCH ENGINE v33
   ════════════════════════════════════════════════════════════ */
(function installSmartSearch(){
'use strict';

/* ── INDICE COMPLETO SEZIONI con sinonimi ──────────────────── */
var INDEX = [
  // ── INTELLIGENCE & AI ────────────────────────────────────────
  {s:'dashboard',    n:'Dashboard ROI',         icon:'📊', group:'Home',
   tags:['home','principale','inizio','overview','panoramica','roi','kpi','start','riepilogo']},
  {s:'ai',           n:'AI Decisioni',           icon:'🤖', group:'AI',
   tags:['ai','artificial intelligence','decisioni','raccomandazioni','suggerimenti','intelligenza','robot']},
  {s:'aicoach',      n:'AI Coach',               icon:'🧠', group:'AI',
   tags:['ai','coach','mentore','consigli','guida','training','formazione','mentor']},
  {s:'bizai',        n:'Business AI Hub',        icon:'🚀', group:'AI',
   tags:['ai','business','hub','centro','intelligenza','analisi','strategia','insights']},
  {s:'forecasting',  n:'AI Previsioni',          icon:'🔮', group:'AI',
   tags:['ai','previsioni','forecast','previsione','futuro','predizione','stima','proiezione']},
  {s:'decision',     n:'Decision Engine',        icon:'🎯', group:'AI',
   tags:['ai','decisione','engine','motore','scelta','raccomandazione','decision']},
  {s:'intel',        n:'Intelligence Hub',       icon:'⚡', group:'AI',
   tags:['ai','intelligence','hub','analytics','analisi','insights','dati','business intelligence','bi']},
  {s:'market_agent', n:'Market AI Agent',        icon:'🤖', group:'AI',
   tags:['ai','agente','mercato','market','agent','consulente','analisi mercato']},
  {s:'studio_ai',    n:'AI Studio',              icon:'✨', group:'AI',
   tags:['ai','studio','creativo','contenuti','genera','generazione','testi','copywriting']},

  // ── PREVENTIVI & QUOTER ──────────────────────────────────────
  {s:'quoter',       n:'Smart Quoter',           icon:'📄', group:'Preventivi',
   tags:['preventivo','quoter','preventivi','offerta','stima','calcolo','quote','smart quoter','listino prezzi']},
  {s:'lasercalc',    n:'🧮 Calc Laser',          icon:'⚡', group:'Preventivi',
   tags:['laser','calcolo','costo','preventivo','p3','80w','incisione','tagliatrice','macchina laser','kwh','materia']},
  {s:'print3d',      n:'Smart Quote 3D',         icon:'🖨️', group:'Preventivi',
   tags:['3d','stampa','stampa 3d','fdm','resina','filamento','bambu','prusa','ender','preventivo 3d','pla','petg','asa']},
  {s:'apparel',      n:'Smart Quote Apparel',    icon:'👕', group:'Preventivi',
   tags:['abbigliamento','apparel','dtf','sublimazione','ricamo','pressa','magliette','tessuto','vestiti','stampa tessuto']},
  {s:'listino',      n:'Listino B2B',            icon:'💼', group:'Preventivi',
   tags:['listino','b2b','prezzi','catalogo prezzi','grossista','rivenditore','sconto','offerta b2b']},
  {s:'template_docs',n:'Template Documenti',     icon:'🎨', group:'Preventivi',
   tags:['template','documenti','modelli','pdf','fattura template','preventivo template','documento']},
  {s:'quoteintel',   n:'Quote Intelligence',     icon:'📈', group:'Preventivi',
   tags:['preventivi','analytics','analisi preventivi','conversione','tasso chiusura','performance offerte']},

  // ── VENDITE & FATTURE ────────────────────────────────────────
  {s:'sales',        n:'Vendite & Fatture',      icon:'💰', group:'Vendite',
   tags:['vendite','fatture','fattura','incasso','pagamento','ricavi','entrate','vendita','transazioni','saldi']},
  {s:'sales_archive',n:'Archivio Vendite',       icon:'📋', group:'Vendite',
   tags:['archivio','storico vendite','storico','vendite passate','report vendite','export']},
  {s:'fiscal',       n:'Radar Fiscale',          icon:'📊', group:'Finanza',
   tags:['fisco','fiscale','tasse','iva','f24','dichiarazione','imposte','inps','contributi','forfettario','radar']},
  {s:'xmlsdi',       n:'Fattura XML SDI',        icon:'🧾', group:'Finanza',
   tags:['fattura elettronica','xml','sdi','sistema di interscambio','fatturazione elettronica','pa','b2b fattura']},
  {s:'recurring',    n:'Fatture Ricorrenti',     icon:'🔄', group:'Finanza',
   tags:['fatture ricorrenti','abbonamento','ricorrente','rata','periodica','automatica']},
  {s:'taxcalendar',  n:'Calendario Fiscale',     icon:'📅', group:'Finanza',
   tags:['calendario fiscale','scadenze fiscali','scadenze','f24','iva trimestrale','tasse calendario']},

  // ── CLIENTI ──────────────────────────────────────────────────
  {s:'clients',      n:'CRM Clienti',            icon:'👥', group:'Clienti',
   tags:['clienti','crm','anagrafica','rubrica','contatti','cliente','gestione clienti','scheda cliente']},
  {s:'clientintel',  n:'Client Intelligence',    icon:'🧠', group:'Clienti',
   tags:['ai','clienti','intelligenza','analisi clienti','rfm','segmentazione','comportamento','valore cliente','churn']},
  {s:'clv',          n:'CLV Clienti',            icon:'👑', group:'Clienti',
   tags:['clv','lifetime value','valore cliente','ltv','fedeltà','retention','cliente lifetime']},
  {s:'leadscorer',   n:'Lead Scorer',            icon:'⭐', group:'Clienti',
   tags:['lead','punteggio','scoring','prospect','potenziale','qualifica','classificazione clienti']},
  {s:'b2bpitch',     n:'B2B Pitch Builder',      icon:'🤝', group:'Clienti',
   tags:['b2b','pitch','presentazione','offerta commerciale','proposta','vendita b2b','aziende']},

  // ── ORDINI & PRODUZIONE ──────────────────────────────────────
  {s:'gestione_ordini',n:'Ordini & Workflow',    icon:'📦', group:'Produzione',
   tags:['ordini','workflow','pipeline','kanban','produzione','lavorazioni','gestione ordini','in lavorazione','backlog','consegna']},
  {s:'workflow_dashboard',n:'Workflow Overview', icon:'⚡', group:'Produzione',
   tags:['workflow','overview','panoramica','pipeline','stato','dashboard ordini','flusso lavoro']},
  {s:'timetracker',  n:'Time Tracker',           icon:'⏱️', group:'Produzione',
   tags:['tempo','timer','ore','time tracking','cronometro','misurazione tempo','costi ore','manodopera']},
  {s:'booking',      n:'Booking',                icon:'📅', group:'Produzione',
   tags:['prenotazione','booking','appuntamento','agenda','calendario','calendario lavori','slot']},
  {s:'scanner',      n:'Scanner Spese',          icon:'📷', group:'Produzione',
   tags:['scanner','scontrino','spese','ricevuta','foto','cattura','ocr','scan']},

  // ── MAGAZZINO & STOCK ────────────────────────────────────────
  {s:'items',        n:'Magazzino',              icon:'🗄️', group:'Magazzino',
   tags:['magazzino','stock','inventario','scorte','materiali','componenti','giacenza','prodotti','warehouse']},
  {s:'catalog',      n:'Catalogo',               icon:'📚', group:'Magazzino',
   tags:['catalogo','prodotti','listino prodotti','articoli','schede prodotto','sku','prodotto']},
  {s:'gadgets',      n:'Gadget & Accessori',     icon:'🧩', group:'Magazzino',
   tags:['gadget','accessori','componenti','led','magneti','packaging','resina','minuteria','stampa 3d filamenti','filamenti']},
  {s:'materials',    n:'Materiali',              icon:'🪵', group:'Magazzino',
   tags:['materiali','materie prime','legno','acrilico','mdf','compensato','fogli','laminati']},
  {s:'equipment',    n:'Attrezzature',           icon:'🔧', group:'Magazzino',
   tags:['attrezzature','macchinari','laser','stampante 3d','utensili','strumenti','apparecchiature','parco macchine']},
  {s:'paints',       n:'Vernici & Bombolette',   icon:'🎨', group:'Magazzino',
   tags:['vernici','bombolette','colori','spray','ral','verniciatura','pittura','smalto']},
  {s:'components',   n:'Componenti & Accessori', icon:'⚙️', group:'Magazzino',
   tags:['componenti','accessori','basi legno','cornici','supporti','hardware','viti','ganci']},
  {s:'inventory',    n:'Inventario',             icon:'📋', group:'Magazzino',
   tags:['inventario','giacenze','conteggio','stock check','inventariazione','elenco prodotti']},
  {s:'suppliers',    n:'Fornitori',              icon:'🚚', group:'Magazzino',
   tags:['fornitori','acquisti','ordini fornitori','vendor','supply','rifornimento','ordine materiali']},
  {s:'barcode',      n:'Barcode Scanner',        icon:'📊', group:'Magazzino',
   tags:['barcode','qr code','scanner','codice a barre','etichette','codice','ean']},

  // ── FINANZA ──────────────────────────────────────────────────
  {s:'finance',      n:'Finance Pro',            icon:'📊', group:'Finanza',
   tags:['finanza','finance','bilancio','p&l','profitti','perdite','margini','conto economico','contabilità']},
  {s:'cashflow',     n:'Cashflow',               icon:'💧', group:'Finanza',
   tags:['cashflow','flusso cassa','liquidità','cassa','entrate uscite','cash flow','tesoreria']},
  {s:'fixed_costs',  n:'Costi Fissi',            icon:'🧾', group:'Finanza',
   tags:['costi fissi','spese fisse','affitto','utenze','abbonamenti','costi mensili','overhead','spese ricorrenti']},
  {s:'bank_funds',   n:'Bank & Funds',           icon:'🏦', group:'Finanza',
   tags:['banca','conti','fondi','conto corrente','finanziamenti','prestiti','investimenti','bank']},
  {s:'profitscope',  n:'ProfitScope',            icon:'💰', group:'Finanza',
   tags:['profitti','perdite','margine','analisi profitti','profit','scope','redditività']},
  {s:'dynamicprice', n:'Prezzi Dinamici',        icon:'🔥', group:'Finanza',
   tags:['prezzi','dinamici','pricing','ottimizzazione prezzi','price','suggerimento prezzi','tariffe']},
  {s:'revsim',       n:'Revenue Simulator',      icon:'📈', group:'Finanza',
   tags:['simulatore','revenue','ricavi','simulazione','scenario','proiezione ricavi','what if']},
  {s:'goals',        n:'Obiettivi',              icon:'🎯', group:'Finanza',
   tags:['obiettivi','goals','target','traguardi','kpi obiettivi','budget','piano']},
  {s:'analytics',    n:'Analytics',              icon:'📊', group:'Analisi',
   tags:['analytics','analisi','statistiche','dati','grafici','report','metriche']},
  {s:'kpi',          n:'KPI Live',               icon:'⚡', group:'Analisi',
   tags:['kpi','indicatori','performance','metriche live','monitoraggio','real time','live']},
  {s:'forecaster',   n:'Financial Forecaster',   icon:'📈', group:'Analisi',
   tags:['forecast','previsioni finanziarie','budget previsionale','financial','proiezioni','stima ricavi']},

  // ── MARKETING & SOCIAL ───────────────────────────────────────
  {s:'marketing',    n:'Marketing Pro',          icon:'📣', group:'Marketing',
   tags:['marketing','campagne','pubblicità','promozione','ads','email marketing','newsletter']},
  {s:'social',       n:'Social Media',           icon:'📱', group:'Marketing',
   tags:['social','instagram','facebook','tiktok','post','contenuti','social media','reel','stories']},
  {s:'socialstudio', n:'Social Studio',          icon:'🎬', group:'Marketing',
   tags:['social studio','contenuti','creazione','post planner','pianificazione','content calendar']},
  {s:'etsy',         n:'Etsy Suite',             icon:'🛍️', group:'Marketing',
   tags:['etsy','marketplace','listing','bottega','shop etsy','vendita online','e-commerce']},
  {s:'etsy_pulse',   n:'Etsy Pulse Live',        icon:'🔥', group:'Marketing',
   tags:['etsy','pulse','live','trend etsy','andamento','popolare','best seller etsy']},
  {s:'etsy_seo_wizard',n:'Etsy SEO Wizard',      icon:'✨', group:'Marketing',
   tags:['etsy','seo','wizard','ottimizzazione','tag','titolo','keywords','parole chiave etsy','listing seo']},
  {s:'trendscanner', n:'Trend Hunter',           icon:'🔍', group:'Marketing',
   tags:['trend','hunter','tendenze','mercato','opportunità','nicchia','prodotto trend','ricerca']},
  {s:'demand_map',   n:'Demand Map',             icon:'🗺️', group:'Marketing',
   tags:['domanda','mappa','demand','mercato','analisi domanda','geografica','heatmap']},
  {s:'product_hunter',n:'Product Hunter AI',     icon:'🎯', group:'Marketing',
   tags:['prodotto','hunter','ai','opportunità prodotto','bestseller','analisi prodotti','performance']},
  {s:'live_intel',   n:'Live Intel Feed',        icon:'📡', group:'Marketing',
   tags:['live','notizie','feed','intel','aggiornamenti','news','mercato artigianale','trend notizie']},
  {s:'price_radar',  n:'Price Radar',            icon:'📡', group:'Marketing',
   tags:['prezzi','radar','monitoraggio prezzi','competitor prezzi','benchmark','confronto prezzi']},
  {s:'etsyai',       n:'Etsy AI Suite',          icon:'🤖', group:'Marketing',
   tags:['etsy','ai','suite','seo etsy','descrizioni','titoli','automatico']},
  {s:'photostudio',  n:'Photo Studio AI',        icon:'📸', group:'Marketing',
   tags:['foto','fotografia','studio','product photo','immagini prodotto','editing foto','ai foto']},
  {s:'imagelib',     n:'Libreria Immagini',      icon:'🖼️', group:'Marketing',
   tags:['immagini','libreria','foto','galleria','archivio immagini','media']},
  {s:'contentperf',  n:'Content Performance',    icon:'📊', group:'Marketing',
   tags:['contenuti','performance','analisi contenuti','reach','engagement','statistiche social']},
  {s:'replyai',      n:'Reply Assistant',        icon:'💬', group:'Marketing',
   tags:['risposte','ai','assistant','reply','messaggi','comunicazione','chat automatica','template risposta']},
  {s:'socialproof',  n:'Social Proof AI',        icon:'⭐', group:'Marketing',
   tags:['social proof','recensioni','testimonianze','feedback','rating','stelle','trust']},
  {s:'marketintel',  n:'Market Intel',           icon:'🌐', group:'Marketing',
   tags:['mercato','intelligence','analisi mercato','competitor','benchmarking','settore']},
  {s:'competitors',  n:'Competitor Monitor',     icon:'🔍', group:'Marketing',
   tags:['competitor','concorrenti','analisi competitiva','benchmark','prezzi competitor','monitoraggio']},

  // ── STRUMENTI & SISTEMA ─────────────────────────────────────
  {s:'settings',     n:'Impostazioni',           icon:'⚙️', group:'Sistema',
   tags:['impostazioni','settings','configurazione','setup','preferenze','profilo','account','api key','chiave']},
  {s:'backup',       n:'Backup Locale',          icon:'💾', group:'Sistema',
   tags:['backup','salvataggio','esportazione','ripristino','dati','sicurezza dati','export json']},
  {s:'portabile',    n:'Esporta Portatile',      icon:'☁️', group:'Sistema',
   tags:['esporta','portatile','export','condividi','cloud','backup cloud']},
  {s:'history',      n:'Storico',                icon:'📋', group:'Sistema',
   tags:['storico','cronologia','log','storia','attività','audit','eventi']},
  {s:'reports',      n:'Report PDF',             icon:'📄', group:'Sistema',
   tags:['report','pdf','stampa','esporta report','resoconto','riepilogo mensile']},
  {s:'laserresources',n:'Risorse Laser',         icon:'🔧', group:'Strumenti',
   tags:['risorse','laser','guide','tutorial','parametri','materiali laser','settings laser','velocità potenza']},
  {s:'lab_setup',    n:'Lab & Lista Acquisti',   icon:'🧪', group:'Strumenti',
   tags:['lab','laboratorio','setup','lista acquisti','acquisti','ai','attrezzare','cosa comprare']},
  {s:'laser_b2b',    n:'Laser B2B',              icon:'💼', group:'Strumenti',
   tags:['laser','b2b','corporate','aziendale','gadget aziendale','personalizzazione aziendale']},
  {s:'opportunity',  n:'Opportunity Scanner',    icon:'🔭', group:'Analisi',
   tags:['opportunità','scanner','identificazione','nicchia','mercato opportunità','gap analisi']},
  {s:'growthengine', n:'Growth Engine',          icon:'🚀', group:'Analisi',
   tags:['crescita','growth','motore','strategia crescita','scaling','espansione','fatturato']},
  {s:'profitleak',   n:'Profit Leak Detector',   icon:'🔍', group:'Finanza',
   tags:['perdite','sprechi','inefficienze','costi nascosti','ottimizzazione','risparmio','profitto perso']},
  {s:'calendar',     n:'Calendario',             icon:'📅', group:'Strumenti',
   tags:['calendario','agenda','eventi','date','scadenze','appuntamenti','organizzazione']},
  {s:'ideas',        n:'Idee & Ispirazione',     icon:'💡', group:'Strumenti',
   tags:['idee','ispirazione','brainstorming','creatività','innovazione','note','appunti']},
  {s:'innovation',   n:'Innovazione',            icon:'🔬', group:'Strumenti',
   tags:['innovazione','r&d','ricerca sviluppo','nuovo prodotto','sperimentazione']},
  {s:'projects',     n:'Progetti',               icon:'📁', group:'Strumenti',
   tags:['progetti','project','gestione progetti','milestone','roadmap progetto']},
  {s:'strategy',     n:'Strategia',              icon:'♟️', group:'Strumenti',
   tags:['strategia','piano','pianificazione','obiettivi strategici','swot','business plan']},
  {s:'team',         n:'Team & HR',              icon:'👥', group:'Sistema',
   tags:['team','risorse umane','hr','dipendenti','collaboratori','personale','stipendi']},
  {s:'brand_identity',n:'Brand Identity',        icon:'🎨', group:'Sistema',
   tags:['brand','identità','logo','colori brand','branding','corporate identity','stile']},
  {s:'inglydesign',  n:'Ingly Design',           icon:'✏️', group:'Sistema',
   tags:['design','ingly design','configuratore','preventivo cliente','link preventivo','condividi']},
  {s:'legal',        n:'Legale',                 icon:'⚖️', group:'Sistema',
   tags:['legale','contratti','gdpr','privacy','termini','condizioni','legge']},
  {s:'fiera',        n:'Fiera Assistant',        icon:'🎪', group:'Strumenti',
   tags:['fiera','mercatino','evento','stand','esposizione','vendita fiera','mercato']},
  {s:'smartnotif',   n:'Notifiche Smart',        icon:'🔔', group:'Sistema',
   tags:['notifiche','alert','avvisi','promemoria','reminder','smart notification']},
  {s:'supplierintel',n:'Supplier Intelligence',  icon:'🚚', group:'Magazzino',
   tags:['fornitori','intelligence','analisi fornitori','performance fornitori','affidabilità']},
  {s:'print3d',      n:'Smart Quote 3D',         icon:'🖨️', group:'Preventivi',
   tags:['3d','stampa 3d','fdm','resina','filamento','costi stampa','bambu','prusa','pla','petg']},
];

/* ── UTILS ────────────────────────────────────────────────── */
function normalize(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function highlight(text, query){
  if(!query) return text;
  var re = new RegExp('('+query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')', 'gi');
  return text.replace(re, '<mark class="sh">$1</mark>');
}

/* ── SEARCH ENGINE ────────────────────────────────────────── */
function search(raw){
  var q = normalize(raw.trim());
  if(!q) return [];

  var words = q.split(/\s+/).filter(Boolean);

  var scored = INDEX.map(function(item){
    var nameN  = normalize(item.n);
    var tagsN  = item.tags.map(normalize).join(' ');
    var secN   = normalize(item.s);
    var score  = 0;
    var matchedTags = [];

    words.forEach(function(word){
      // Exact section match (max priority)
      if(secN === word) score += 100;
      // Exact name match
      if(nameN === word) score += 90;
      // Name starts with
      if(nameN.startsWith(word)) score += 70;
      // Name contains
      else if(nameN.includes(word)) score += 50;
      // Section contains
      if(secN.includes(word)) score += 40;
      // Tags exact
      item.tags.forEach(function(tag){
        var tagN = normalize(tag);
        if(tagN === word){ score += 60; matchedTags.push(tag); }
        else if(tagN.includes(word) || word.includes(tagN)){ score += 30; if(!matchedTags.includes(tag)) matchedTags.push(tag); }
      });
    });

    return { item:item, score:score, matchedTags:matchedTags.slice(0,3) };
  }).filter(function(r){ return r.score > 0; })
    .sort(function(a,b){ return b.score - a.score });

  return scored.slice(0, 12); // max 12 risultati
}

/* ── UI ───────────────────────────────────────────────────── */
var _current = -1;
var _results = [];
var _dropdown = null;
var _input = null;
var _debounce = null;

function getDropdown(){
  if(!_dropdown){
    _dropdown = document.createElement('div');
    _dropdown.id = 'search-dropdown';
    _dropdown.setAttribute('role','listbox');
    // Click fuori chiude
    document.addEventListener('mousedown', function(e){
      if(_dropdown && !_dropdown.contains(e.target) && e.target !== _input){
        closeDropdown();
      }
    });
  }
  return _dropdown;
}

function openDropdown(){
  var sb = document.getElementById('sidebar-search');
  if(!sb) return;
  var dd = getDropdown();
  if(!sb.contains(dd)) sb.appendChild(dd);
  dd.classList.add('open');
}

function closeDropdown(){
  if(_dropdown) _dropdown.classList.remove('open');
  _current = -1;
  // Ripristina nav normale
  restoreNav();
}

function renderDropdown(q, results){
  var dd = getDropdown();
  _results = results;
  _current = -1;

  if(!results.length){
    dd.innerHTML = '<div class="sd-empty">Nessuna sezione trovata per "<strong>'+q+'</strong>"<br><small>Prova: ai, vendite, laser, 3d, clienti...</small></div>';
    return;
  }

  // Raggruppa per group
  var groups = {};
  results.forEach(function(r){
    var g = r.item.group;
    if(!groups[g]) groups[g] = [];
    groups[g].push(r);
  });

  var html = '';
  Object.keys(groups).forEach(function(group){
    html += '<div class="sd-group-label">'+group+'</div>';
    groups[group].forEach(function(r, gi){
      var globalIdx = results.indexOf(r);
      var nameHL = highlight(r.item.n, q);
      var tagsStr = r.matchedTags.length ? r.matchedTags.slice(0,2).join(' · ') : r.item.tags.slice(0,2).join(' · ');
      html += '<div class="sd-item" role="option" data-section="'+r.item.s+'" data-idx="'+globalIdx+'"'
        +' onclick="SmartSearch.go(\''+r.item.s+'\')"'
        +' onmouseenter="SmartSearch.hover('+globalIdx+')">'
        +'<div class="sd-icon">'+r.item.icon+'</div>'
        +'<div class="sd-body">'
          +'<div class="sd-name">'+nameHL+'</div>'
          +'<div class="sd-tags">'+tagsStr+'</div>'
        +'</div>'
        +(r.score >= 60 ? '<span class="sd-match">Top</span>' : '')
        +'</div>';
    });
  });

  html += '<div class="sd-footer">'
    +'<span><span class="sd-kbd">↑↓</span> naviga</span>'
    +'<span><span class="sd-kbd">↵</span> apri</span>'
    +'<span><span class="sd-kbd">Esc</span> chiudi</span>'
    +'</div>';
  dd.innerHTML = html;
}

function filterNavFallback(q){
  // Mantieni anche il comportamento originale nella sidebar
  var v = q.toLowerCase().trim();
  if(v){
    document.querySelectorAll('.nav-group').forEach(function(g){ g.classList.remove('collapsed'); });
  } else {
    if(typeof NavGroups !== 'undefined') NavGroups.init();
  }
  document.querySelectorAll('.nav-item').forEach(function(item){
    var txt = item.textContent.toLowerCase();
    var section = item.getAttribute('data-section') || '';
    var indexEntry = INDEX.find(function(e){ return e.s === section; });
    var tags = indexEntry ? indexEntry.tags.join(' ') : '';
    var matches = !v || txt.includes(v) || tags.includes(v) || section.includes(v);
    item.style.display = matches ? '' : 'none';
  });
  document.querySelectorAll('.nav-group-title').forEach(function(g){ g.style.display = v ? 'none' : ''; });
  if(v) document.querySelectorAll('.nav-group-items').forEach(function(g){ g.style.maxHeight = 'none'; });
  else document.querySelectorAll('.nav-group-items').forEach(function(g){ g.style.maxHeight = ''; });
}

function restoreNav(){
  document.querySelectorAll('.nav-item').forEach(function(i){ i.style.display=''; });
  document.querySelectorAll('.nav-group-title').forEach(function(g){ g.style.display=''; });
  document.querySelectorAll('.nav-group-items').forEach(function(g){ g.style.maxHeight=''; });
  if(typeof NavGroups !== 'undefined') NavGroups.init();
}

function updateSelected(){
  if(!_dropdown) return;
  _dropdown.querySelectorAll('.sd-item').forEach(function(el){ el.classList.remove('selected'); });
  if(_current >= 0){
    var sel = _dropdown.querySelector('[data-idx="'+_current+'"]');
    if(sel){
      sel.classList.add('selected');
      sel.scrollIntoView({block:'nearest'});
    }
  }
}

/* ── KEYBOARD NAVIGATION ──────────────────────────────────── */
function onKeyDown(e){
  var dd = _dropdown;
  if(!dd || !dd.classList.contains('open')) return;

  if(e.key === 'ArrowDown'){
    e.preventDefault();
    _current = Math.min(_current + 1, _results.length - 1);
    updateSelected();
  } else if(e.key === 'ArrowUp'){
    e.preventDefault();
    _current = Math.max(_current - 1, -1);
    updateSelected();
  } else if(e.key === 'Enter'){
    e.preventDefault();
    if(_current >= 0 && _results[_current]){
      go(_results[_current].item.s);
    } else if(_results.length > 0){
      go(_results[0].item.s);
    }
  } else if(e.key === 'Escape'){
    e.preventDefault();
    closeDropdown();
    if(_input){ _input.value=''; _input.blur(); }
    restoreNav();
  }
}

function go(section){
  closeDropdown();
  if(_input){ _input.value=''; }
  restoreNav();
  if(typeof App !== 'undefined') App.navigate(section);
  iToast && iToast('→ '+( INDEX.find(function(i){return i.s===section;}) || {n:section}).n, 'info');
}

function hover(idx){ _current = idx; updateSelected(); }

/* ── MAIN INPUT HANDLER ──────────────────────────────────── */
function onInput(e){
  var q = e.target.value;
  var clearBtn = document.getElementById('nav-search-clear');
  if(clearBtn) clearBtn.style.display = q ? 'block' : 'none';

  clearTimeout(_debounce);
  _debounce = setTimeout(function(){
    var q2 = e.target.value.trim();
    if(!q2){
      closeDropdown();
      restoreNav();
      return;
    }
    // Anche il fallback nav filter (per chi guarda la sidebar)
    filterNavFallback(q2);
    var results = search(q2);
    openDropdown();
    renderDropdown(q2, results);
  }, 80);
}

/* ── INSTALLA ─────────────────────────────────────────────── */
function install(){
  var inp = document.getElementById('nav-search');
  if(!inp) return false;
  _input = inp;

  // Update placeholder
  inp.placeholder = '🔍 Cerca sezione... (AI, 3D, laser, clienti...)';
  inp.setAttribute('autocomplete','off');
  inp.setAttribute('role','combobox');
  inp.setAttribute('aria-autocomplete','list');
  inp.setAttribute('aria-expanded','false');

  // Add padding for icon
  inp.style.paddingLeft = '30px';

  // Add icon
  var sb = inp.parentElement;
  if(sb && !document.getElementById('nav-search-icon')){
    sb.style.position = 'relative';
    var icon = document.createElement('i');
    icon.id = 'nav-search-icon';
    icon.className = 'fas fa-search';
    sb.insertBefore(icon, inp);

    var clearBtn = document.createElement('button');
    clearBtn.id = 'nav-search-clear';
    clearBtn.textContent = '✕';
    clearBtn.setAttribute('aria-label','Cancella ricerca');
    clearBtn.onclick = function(){
      inp.value='';
      inp.focus();
      clearBtn.style.display='none';
      closeDropdown();
      restoreNav();
    };
    sb.appendChild(clearBtn);
  }

  // Replace oninput
  inp.removeAttribute('oninput');
  inp.addEventListener('input', onInput);
  inp.addEventListener('keydown', onKeyDown);
  inp.addEventListener('focus', function(){
    if(inp.value.trim()) openDropdown();
  });

  // Patch App.filterNav per usare il nuovo engine
  if(typeof App !== 'undefined'){
    App.filterNav = function(q){
      filterNavFallback(q);
    };
  }

  console.log('[SmartSearch v33] ✅ Installato — '+INDEX.length+' sezioni indicizzate');
  return true;
}

/* ── EXPOSE ───────────────────────────────────────────────── */
window.SmartSearch = { go:go, hover:hover, search:search, install:install };

// Auto-install
var _t = setInterval(function(){
  if(install()) clearInterval(_t);
}, 200);

})();

/* ════════════════════════════════════════════════════════════════
   F3.5 PWA MANIFEST — rende INGLY installabile come app
   ════════════════════════════════════════════════════════════ */
(function installPWA(){
  // Inject manifest dinamicamente
  if(document.querySelector('link[rel="manifest"]')) return;

  var manifest = {
    name: 'INGLY OS',
    short_name: 'INGLY',
    description: 'Gestionale per artigiani — Laser · 3D · Personalizzazione',
    start_url: './',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#6366f1',
    orientation: 'landscape-primary',
    icons: [
      { src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%236366f1"/><text y=".9em" font-size="70" x="15">🎨</text></svg>', sizes: '192x192', type: 'image/svg+xml' },
      { src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%236366f1"/><text y=".9em" font-size="70" x="15">🎨</text></svg>', sizes: '512x512', type: 'image/svg+xml' },
    ],
    shortcuts: [
      { name:'Dashboard', url:'./#dashboard', description:'Vai alla Dashboard' },
      { name:'Preventivo', url:'./#quoter', description:'Crea preventivo' },
      { name:'Vendite', url:'./#sales', description:'Registra vendita' },
    ]
  };

  var blob = new Blob([JSON.stringify(manifest)], {type:'application/manifest+json'});
  var url  = URL.createObjectURL(blob);
  var link = document.createElement('link');
  link.rel = 'manifest'; link.href = url;
  document.head.appendChild(link);

  // Theme color meta
  if(!document.querySelector('meta[name="theme-color"]')){
    var meta = document.createElement('meta');
    meta.name = 'theme-color'; meta.content = '#6366f1';
    document.head.appendChild(meta);
  }

  // Install prompt
  var _installPrompt = null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    _installPrompt = e;
    // Mostra bottone installa nelle settings
    window.PWAInstallPrompt = _installPrompt;
    // Notifica
    setTimeout(function(){
      if(typeof iToast !== 'undefined'){
        iToast('📱 INGLY può essere installato come app!', 'info', {
          sub: 'Vai su Impostazioni → Installa App',
          duration: 6
        });
      }
    }, 3000);
  });

  window.installPWA = function(){
    if(!window.PWAInstallPrompt){ iToast && iToast('Usa il pulsante del browser per installare','info'); return; }
    window.PWAInstallPrompt.prompt();
    window.PWAInstallPrompt.userChoice.then(function(r){
      if(r.outcome==='accepted') iToast && iToast('✅ INGLY installato come app!','success');
      window.PWAInstallPrompt = null;
    });
  };

  console.log('[PWA] ✅ Manifest injected — INGLY è installabile come app');
})();

/* ════════════════════════════════════════════════════════════════
   🗺️ ROADMAP OVERLAY — premi R per vedere lo stato della roadmap
   ════════════════════════════════════════════════════════════ */
(function installRoadmapOverlay(){
  var ROADMAP = {
    phases: [
      {
        n:'Fase 1 — Stabilizzazione', color:'#22c55e', done:true,
        items:[
          {t:'NavBus router unificato', d:true},
          {t:'contain:layout fix (schermata nera)', d:true},
          {t:'Error boundary renderSection', d:true},
          {t:'Mobile responsive sidebar', d:true},
          {t:'Breadcrumb navigation', d:true},
          {t:'Toast system upgrade', d:true},
          {t:'Keyboard shortcuts (G+D, G+S...)', d:true},
          {t:'Section render cache', d:true},
          {t:'Data sync Bus', d:true},
          {t:'Gadgets magazzino 55+ items', d:true},
        ]
      },
      {
        n:'Fase 2 — AI & Automation', color:'#6366f1', done:true,
        items:[
          {t:'AI Quick Bar contestuale', d:true},
          {t:'Smart Notifications proattive', d:true},
          {t:'Order Auto-Complete', d:true},
          {t:'Fattura Rapida PDF', d:true},
          {t:'Revenue Forecast widget', d:true},
          {t:'AI Vision (foto → descrizione)', d:true},
          {t:'WhatsApp Templates avanzati (6 template)', d:true},
          {t:'Product Hunter AI', d:true},
          {t:'Market AI Agent (chat)', d:true},
          {t:'Etsy SEO Wizard', d:true},
          {t:'Live Intel Feed', d:true},
          {t:'Dashboard "Oggi" widget', d:true},
        ]
      },
      {
        n:'Fase 3 — Integrazioni', color:'#f59e0b', done:false,
        items:[
          {t:'Backup JSON auto + manuale', d:true},
          {t:'Stripe Payment Links', d:true},
          {t:'PWA Manifest (installabile)', d:true},
          {t:'🔍 Smart Search sidebar', d:true},
          {t:'Etsy API live (OAuth)', d:false},
          {t:'Google Calendar sync', d:false},
          {t:'Tracking spedizioni GLS/BRT', d:false},
          {t:'Push Notifications browser', d:false},
        ]
      },
      {
        n:'Fase 4 — SaaS Platform', color:'#a78bfa', done:false,
        items:[
          {t:'Backend Node.js + PostgreSQL', d:false},
          {t:'Multi-utente + ruoli', d:false},
          {t:'Multi-tenant (SaaS)', d:false},
          {t:'Abbonamenti Stripe', d:false},
          {t:'PWA offline completa', d:false},
          {t:'Plugin system', d:false},
        ]
      }
    ]
  };

  function showRoadmap(){
    var existing = document.getElementById('roadmap-overlay');
    if(existing){ existing.remove(); return; }

    var ov = document.createElement('div');
    ov.id = 'roadmap-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:#000d;z-index:5000;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeSlideDown .2s ease';

    var totalItems = ROADMAP.phases.reduce(function(a,p){return a+p.items.length;},0);
    var doneItems  = ROADMAP.phases.reduce(function(a,p){return a+p.items.filter(function(i){return i.d;}).length;},0);
    var pct = Math.round(doneItems/totalItems*100);

    var html = '<div style="background:var(--bg-card);border:1px solid var(--border2);border-radius:16px;width:100%;max-width:680px;max-height:88vh;overflow-y:auto">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--border)">'
        +'<div><div style="font-size:16px;font-weight:700;color:var(--text)">🗺️ INGLY OS — Roadmap</div>'
          +'<div style="font-size:11px;color:var(--text-muted);margin-top:2px">'+doneItems+'/'+totalItems+' task completati · '+pct+'% completato</div>'
        +'</div>'
        +'<button onclick="document.getElementById(\'roadmap-overlay\').remove()" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px">✕</button>'
      +'</div>'
      +'<div style="padding:18px;display:flex;flex-direction:column;gap:14px">';

    ROADMAP.phases.forEach(function(phase){
      var phaseDone = phase.items.filter(function(i){return i.d;}).length;
      var phasePct  = Math.round(phaseDone/phase.items.length*100);
      html += '<div style="background:var(--bg-card2);border-radius:10px;padding:14px;border:1px solid var(--border)">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
          +'<span style="font-size:13px;font-weight:700;color:'+phase.color+'">'+phase.n+'</span>'
          +'<span style="font-size:11px;font-weight:700;color:'+(phasePct===100?'var(--green)':'var(--text-muted)')+'">'+phaseDone+'/'+phase.items.length+'</span>'
        +'</div>'
        +'<div style="height:3px;background:var(--border);border-radius:99px;margin-bottom:10px"><div style="height:100%;width:'+phasePct+'%;background:'+phase.color+';border-radius:99px;transition:.6s"></div></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">'
          +phase.items.map(function(item){
            return '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:'+(item.d?'var(--text)':'var(--text-dim)')+'padding:2px 0">'
              +'<span style="color:'+(item.d?'var(--green)':'var(--border2)')+'">'+( item.d?'✅':'⬜')+'</span>'
              +'<span style="'+(item.d?'':'opacity:.5')+'">'+item.t+'</span>'
            +'</div>';
          }).join('')
        +'</div></div>';
    });

    html += '</div>'
      +'<div style="padding:12px 20px;border-top:1px solid var(--border);font-size:11px;color:var(--text-dim);text-align:center">Premi <strong>R</strong> o clicca fuori per chiudere</div>'
      +'</div>';

    ov.innerHTML = html;
    ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
    document.body.appendChild(ov);
  }

  window.showInglyRoadmap = showRoadmap;

  // Shortcut R
  document.addEventListener('keydown', function(e){
    if(e.key==='r' && !['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName) && !e.metaKey && !e.ctrlKey){
      showRoadmap();
    }
  });

  // Aggiungi pulsante roadmap nella topbar dopo DOMContentLoaded
  setTimeout(function(){
    var spacer = document.querySelector('#topbar .spacer');
    if(!spacer) return;
    var btn = document.createElement('button');
    btn.className = 'topbar-btn';
    btn.title = 'Roadmap INGLY (premi R)';
    btn.innerHTML = '<i class="fas fa-map"></i>';
    btn.onclick = showRoadmap;
    spacer.insertAdjacentElement('afterend', btn);
  }, 1200);
})();

console.log('[INGLY OS v33] ✅ SmartSearch · PWA · Roadmap overlay caricati');

/* ═══════════════════════════════════════════════════════════════════
   🔐 INGLY OS v34 — SAAS AUTH GATE + MODULE LOCK
   
   Logica:
   1. Controlla se c'è una sessione SaaS attiva (localStorage ingly_saas_session)
   2. Se NO → mostra schermata di login
   3. Se SÌ → lascia aprire INGLY OS ma blocca i moduli non nel piano
   4. Ogni nav-item fuori piano → bloccato con overlay + messaggio upgrade
   ═══════════════════════════════════════════════════════════════════ */
(function installSaaSGate(){

  // ── SHARED DB KEY (stesso del Admin Tool) ──────────────────────
  var DB_KEY = 'ingly_saas_db';
  var SESSION_KEY = 'ingly_saas_session';

  function getDB(){
    try { return JSON.parse(localStorage.getItem(DB_KEY) || '{"users":[]}'); }
    catch(e){ return {users:[]}; }
  }

  function getSession(){
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
    catch(e){ return null; }
  }

  function saveSession(session){
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession(){
    sessionStorage.removeItem(SESSION_KEY);
  }

  function isExpired(session){
    if(!session || !session.expiresAt) return false;
    return new Date(session.expiresAt) < new Date();
  }

  function userCanAccess(session, moduleId){
    if(!session) return false;
    if(!session.modules || session.modules[0] === '*') return true;
    return session.modules.includes(moduleId);
  }

  // ── GATE STYLES ────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = `
    #saas-gate {
      position:fixed;inset:0;z-index:99999;
      background:radial-gradient(1200px 600px at 12% -12%,#6366f11f,transparent 60%),radial-gradient(900px 520px at 105% 112%,#b26a1f14,transparent 55%),#0a0a0d;
      display:flex;align-items:center;justify-content:center;padding:20px;
      font-family:'Inter',system-ui,sans-serif;
    }
    @keyframes gateSlide { from{transform:translateY(16px);opacity:0} to{transform:none;opacity:1} }
    #saas-gate .gate-shell {
      width:100%;max-width:920px;display:grid;grid-template-columns:1.05fr .95fr;
      background:#101014;border:1px solid #23232e;border-radius:22px;overflow:hidden;
      box-shadow:0 30px 80px #000a;animation:gateSlide .4s ease;
    }
    #saas-gate .gate-brand {
      position:relative;padding:44px 40px;display:flex;flex-direction:column;justify-content:space-between;
      background:radial-gradient(700px 420px at 18% -5%,#4f46e533,transparent 60%),linear-gradient(155deg,#191922 0%,#141019 58%,#1b1510 100%);
      border-right:1px solid #23232e;overflow:hidden;
    }
    #saas-gate .gate-brand::after {
      content:"";position:absolute;right:-60px;bottom:-60px;width:230px;height:230px;border-radius:50%;
      background:radial-gradient(circle,#b26a1f26,transparent 70%);
    }
    #saas-gate .gb-word { display:flex;align-items:center;gap:12px;font-size:20px;font-weight:900;letter-spacing:-.02em;color:#f0eef7;position:relative;z-index:1; }
    #saas-gate .gb-logo {
      width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:23px;
      background:linear-gradient(135deg,#6366f1,#4f46e5);box-shadow:0 8px 26px #6366f155;
    }
    #saas-gate .gb-word span { color:#a5a0f5; }
    #saas-gate .gb-tagline { font-size:23px;line-height:1.3;font-weight:700;color:#f4f2fb;margin:28px 0 22px;letter-spacing:-.01em;position:relative;z-index:1; }
    #saas-gate .gb-feats { list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:13px;position:relative;z-index:1; }
    #saas-gate .gb-feats li { display:flex;align-items:flex-start;gap:11px;font-size:13.5px;color:#c7c3d6;line-height:1.4; }
    #saas-gate .gb-feats li i { color:#e0a353;font-size:12px;margin-top:3px;flex-shrink:0; }
    #saas-gate .gb-foot { font-size:11.5px;color:#6b6780;letter-spacing:.02em;margin-top:30px;position:relative;z-index:1; }
    #saas-gate .gate-form { padding:52px 46px;display:flex;flex-direction:column;justify-content:center;background:#0e0e12; }
    #saas-gate .gf-logo-mobile { display:none;align-items:center;gap:10px;font-size:18px;font-weight:900;color:#f0eef7;margin-bottom:24px; }
    #saas-gate .gf-logo-mobile span { color:#a5a0f5; }
    #saas-gate .gf-title { font-size:24px;font-weight:800;color:#f4f2fb;margin:0 0 6px;letter-spacing:-.01em; }
    #saas-gate .gf-sub { font-size:13px;color:#8a86a0;margin:0 0 26px;line-height:1.5; }
    #saas-gate .iw { position:relative;margin-bottom:12px; }
    #saas-gate .iw i { position:absolute;left:15px;top:50%;transform:translateY(-50%);color:#7b7790;font-size:13px;pointer-events:none; }
    #saas-gate input {
      background:#17171e;border:1px solid #2a2a35;border-radius:10px;
      color:#eceaf4;font-size:14px;padding:0 14px 0 42px;width:100%;
      outline:none;transition:border .18s,box-shadow .18s;box-sizing:border-box;height:50px;font-family:inherit;
    }
    #saas-gate input::placeholder { color:#6b6780; }
    #saas-gate input:focus { border-color:#6366f1;box-shadow:0 0 0 3px #6366f126; }
    #saas-gate .gate-btn {
      width:100%;height:50px;background:linear-gradient(135deg,#6366f1,#4f46e5);
      color:#fff;border:none;border-radius:11px;font-size:15px;font-weight:700;
      cursor:pointer;margin-top:10px;letter-spacing:.01em;
      transition:transform .12s,box-shadow .18s,opacity .15s;font-family:inherit;
      box-shadow:0 10px 28px #4f46e544;display:flex;align-items:center;justify-content:center;gap:9px;
    }
    #saas-gate .gate-btn:hover { transform:translateY(-1px);box-shadow:0 14px 34px #4f46e555; }
    #saas-gate .gate-btn:active { transform:translateY(0); }
    #saas-gate .gf-help { margin-top:20px;font-size:11.5px;color:#57536b;text-align:center; }
    #saas-gate .gf-switch { margin-top:16px;font-size:12.5px;color:#8a86a0;text-align:center; }
    #saas-gate .gf-switch a { color:#a5a0f5;font-weight:700;cursor:pointer; }
    #saas-gate .gf-switch a:hover { text-decoration:underline; }
    @media (max-width:820px) {
      #saas-gate .gate-shell { grid-template-columns:1fr;max-width:420px; }
      #saas-gate .gate-brand { display:none; }
      #saas-gate .gf-logo-mobile { display:flex; }
      #saas-gate .gate-form { padding:38px 28px; }
    }
    #saas-gate .gate-btn:hover { opacity:.88; }
    #saas-gate .gate-btn:disabled { opacity:.5;cursor:not-allowed; }
    #saas-gate .gate-err {
      background:#ef444415;border:1px solid #ef444440;border-radius:8px;
      padding:10px 14px;font-size:12px;color:#f87171;margin-top:10px;display:none;
    }
    /* Session bar */
    #saas-session-bar {
      position:fixed;top:0;left:0;right:0;height:28px;z-index:9998;
      background:linear-gradient(135deg,#6366f1,#4f46e5);
      display:none;align-items:center;padding:0 16px;gap:10px;
      font-size:11px;color:rgba(255,255,255,.9);font-family:'Inter',system-ui,sans-serif;
    }
    #saas-session-bar .sb-plan {
      background:rgba(255,255,255,.2);border-radius:99px;padding:1px 8px;font-weight:800;
    }
    #saas-session-bar .sb-logout {
      margin-left:auto;background:rgba(255,255,255,.15);border:none;color:#fff;
      border-radius:6px;padding:2px 10px;cursor:pointer;font-size:11px;font-weight:600;
      font-family:inherit;transition:opacity .15s;
    }
    #saas-session-bar .sb-logout:hover { opacity:.8; }
    /* Adjust app for session bar */
    /* layout controlled by Enterprise Header */
    /* Module lock overlay */
    .saas-locked-overlay {
      display:none;position:absolute;inset:0;z-index:500;
      background:#09090bdd;backdrop-filter:blur(4px);
      align-items:center;justify-content:center;flex-direction:column;gap:12px;
      border-radius:8px;text-align:center;padding:24px;
    }
    .saas-locked-overlay.visible { display:flex; }
    /* Locked nav items */
    .nav-item.saas-locked { opacity:.4!important;pointer-events:none!important;filter:grayscale(1); }
    .nav-item.saas-locked::after {
      content:'🔒';margin-left:auto;font-size:10px;
    }
  `;
  document.head.appendChild(style);

  // ── SESSION BAR ────────────────────────────────────────────────
  var bar = document.createElement('div');
  bar.id = 'saas-session-bar';
  bar.innerHTML = `
    <span>🎨</span>
    <span id="ssb-lab">INGLY OS</span>
    <span class="sb-plan" id="ssb-plan">—</span>
    <span id="ssb-exp" style="color:#fde68a"></span>
    <span class="sb-logout" onclick="SaaSGate.logout()">↩ Esci</span>
  `;
  document.body.insertBefore(bar, document.body.firstChild);

  // ── GATE HTML ──────────────────────────────────────────────────
  var gateEl = document.createElement('div');
  gateEl.id = 'saas-gate';
  gateEl.style.display = 'none';
  gateEl.innerHTML = `
    <div class="gate-shell">
      <aside class="gate-brand">
        <div class="gb-word"><span class="gb-logo">🎨</span>INGLY <span>OS</span></div>
        <div>
          <div class="gb-tagline">Il gestionale intelligente per artigiani laser.</div>
          <ul class="gb-feats">
            <li><i class="fas fa-bolt"></i> Preventivi professionali in 60 secondi</li>
            <li><i class="fas fa-wand-magic-sparkles"></i> L'AI ti suggerisce quanto far pagare</li>
            <li><i class="fas fa-layer-group"></i> Ordini, clienti, finanze ed Etsy in un posto solo</li>
          </ul>
        </div>
        <div class="gb-foot">Ingly Design · Valle del Belice, Sicilia</div>
      </aside>
      <section class="gate-form">
        <div class="gf-logo-mobile">🎨 INGLY <span>OS</span></div>
        <h1 class="gf-title" id="gf-title">Bentornato</h1>
        <p class="gf-sub" id="gf-sub">Accedi alla tua licenza INGLY</p>
        <div id="gate-login">
          <div class="iw"><i class="fas fa-user"></i><input id="gate-user" type="text" placeholder="Username" autocomplete="username"></div>
          <div class="iw"><i class="fas fa-lock"></i><input id="gate-pass" type="password" placeholder="Password" autocomplete="current-password" onkeydown="if(event.key==='Enter')SaaSGate.login()"></div>
          <button class="gate-btn" id="gate-submit" onclick="SaaSGate.login()">
            <i class="fas fa-arrow-right-to-bracket"></i> Accedi
          </button>
          <div class="gate-err" id="gate-err"></div>
          <div class="gate-hint" id="gate-hint"></div>
          <div class="gf-switch">Nuovo su INGLY? <a onclick="SaaSGate.showRegister()">Prova gratis 14 giorni →</a></div>
        </div>
        <div id="gate-register" style="display:none">
          <div class="iw"><i class="fas fa-store"></i><input id="reg-lab" type="text" placeholder="Nome del laboratorio"></div>
          <div class="iw"><i class="fas fa-user"></i><input id="reg-user" type="text" placeholder="Username" autocomplete="username"></div>
          <div class="iw"><i class="fas fa-envelope"></i><input id="reg-email" type="email" placeholder="Email" autocomplete="email"></div>
          <div class="iw"><i class="fas fa-lock"></i><input id="reg-pass" type="password" placeholder="Password (min 6)" autocomplete="new-password" onkeydown="if(event.key==='Enter')SaaSGate.register()"></div>
          <button class="gate-btn" id="reg-submit" onclick="SaaSGate.register()">
            <i class="fas fa-rocket"></i> Crea account e prova gratis
          </button>
          <div class="gate-err" id="reg-err"></div>
          <div class="gf-switch">Hai già un account? <a onclick="SaaSGate.showLogin()">Accedi</a></div>
        </div>
        <div class="gf-help">Ingly Design · assistenza: inglydesign@gmail.com</div>
      </section>
    </div>
  `;
  document.body.appendChild(gateEl);

  // ── STRIPE BILLING (Payment Links, no-backend) ─────────────────
  // I link di pagamento si configurano dall'Admin (uno per piano) e si salvano
  // in localStorage['ingly_stripe_links']. Finché non ci sono, si ricade sulla
  // richiesta via email. Il webhook Stripe (Edge Function) attiva la licenza.
  var _STRIPE_LINKS = {};
  try { _STRIPE_LINKS = JSON.parse(localStorage.getItem('ingly_stripe_links') || '{}'); } catch(e){}
  window.InglyBilling = {
    linkFor: function(plan){ return (_STRIPE_LINKS && _STRIPE_LINKS[plan]) || ''; },
    isConfigured: function(){ return !!(_STRIPE_LINKS && (_STRIPE_LINKS.pro || _STRIPE_LINKS.business || _STRIPE_LINKS.enterprise || _STRIPE_LINKS.starter)); },
    subscribe: function(plan){
      var s = window.SaaSGate && window.SaaSGate._session;
      var url = this.linkFor(plan);
      if(!url){
        var body = encodeURIComponent('Vorrei attivare il piano ' + String(plan||'').toUpperCase() + '. Utente: ' + ((s&&s.username)||''));
        window.open('mailto:inglydesign@gmail.com?subject=Abbonamento INGLY OS&body=' + body, '_blank');
        return;
      }
      try {
        var u = new URL(url);
        if(s && s.username) u.searchParams.set('client_reference_id', s.username);
        if(s && s.email) u.searchParams.set('prefilled_email', s.email);
        window.open(u.toString(), '_blank');
      } catch(e){ window.open(url, '_blank'); }
    }
  };

  // ── UPGRADE MODAL ──────────────────────────────────────────────
  function showUpgradeModal(sectionName, plan){
    var planColors = {starter:'#06b6d4', pro:'#6366f1', business:'#f59e0b', enterprise:'#a855f7'};
    var nextMap = {starter:'Pro', pro:'Business', business:'Enterprise', enterprise:'Enterprise'};
    var nextKeyMap = {starter:'pro', pro:'business', business:'enterprise', enterprise:'enterprise'};
    var nextPlan = nextMap[plan] || 'Pro';
    var nextKey = nextKeyMap[plan] || 'pro';
    var modal = document.createElement('div');
    modal.id = 'saas-upgrade-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99990;background:#000c;display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,system-ui,sans-serif';
    modal.innerHTML = `
      <div style="background:#111115;border:1px solid #2a2a35;border-radius:16px;max-width:420px;width:100%;padding:28px;text-align:center;animation:gateSlide .2s ease">
        <div style="font-size:40px;margin-bottom:12px">🔒</div>
        <div style="font-size:17px;font-weight:800;color:#e8e8f0;margin-bottom:8px">${sectionName || 'Questa sezione'} non è inclusa</div>
        <div style="font-size:13px;color:#6b6b88;line-height:1.6;margin-bottom:20px">
          Il tuo piano <strong style="color:${planColors[plan]||'#888'}">${(plan||'').toUpperCase()}</strong> non include questo modulo.<br>
          Chiedi all'amministratore di aggiornare la tua licenza al piano <strong style="color:#6366f1">${nextPlan}</strong> o di abilitare questo modulo specifico.
        </div>
        <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
          <button onclick="InglyBilling.subscribe('${nextKey}')"
            style="padding:10px 20px;background:linear-gradient(135deg,#635bff,#4f46e5);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px">
            💳 Abbonati a ${nextPlan}
          </button>
          <button onclick="document.getElementById('saas-upgrade-modal').remove();App.navigate('dashboard')"
            style="padding:10px 20px;background:transparent;color:#818cf8;border:1px solid #2a2a35;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px">
            ← Dashboard
          </button>
        </div>
      </div>`;
    modal.addEventListener('click', function(e){ if(e.target===modal){ modal.remove(); App.navigate('dashboard'); }});
    document.body.appendChild(modal);
  }

  // ── MAIN GATE MODULE ───────────────────────────────────────────
  window.SaaSGate = {
    _session: null,

    init: function(){
      var session = getSession();
      if(session && !isExpired(session)){
        this._session = session;
        this._applySession();
      } else {
        clearSession();
        this._showGate();
      }
    },

    login: function(){
      var username = document.getElementById('gate-user').value.trim();
      var password = document.getElementById('gate-pass').value;
      var errEl    = document.getElementById('gate-err');
      var btn      = document.getElementById('gate-submit');
      errEl.style.display = 'none';
      if(!username || !password){ errEl.textContent='Inserisci username e password'; errEl.style.display='block'; return; }

      var db = getDB();
      var user = db.users && db.users.find(function(u){
        return (u.username === username || u.email === username) && u.active;
      });

      if(!user){ errEl.textContent='Utente non trovato o disabilitato'; errEl.style.display='block'; return; }
      if(user.passwordHash !== password){ errEl.textContent='Password non corretta'; errEl.style.display='block'; return; }
      if(isExpired(user)){
        errEl.textContent='La tua licenza è scaduta il '+(user.expiresAt?new Date(user.expiresAt).toLocaleDateString('it-IT'):'—')+'. Contatta l\'amministratore.';
        errEl.style.display='block'; return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Accesso...';

      // Save last login in DB
      user.lastLogin = new Date().toISOString();
      var dbRef = getDB();
      var dbUser = dbRef.users.find(function(u){ return u.id === user.id; });
      if(dbUser) dbUser.lastLogin = user.lastLogin;
      localStorage.setItem(DB_KEY, JSON.stringify(dbRef));

      var session = {
        id:        user.id,
        username:  user.username,
        labName:   user.labName || user.username,
        plan:      user.plan,
        modules:   user.modules,
        expiresAt: user.expiresAt,
        loginAt:   new Date().toISOString(),
      };
      saveSession(session);
      this._session = session;
      this._hideGate();
      this._applySession();
    },

    logout: function(){
      clearSession();
      this._session = null;
      document.getElementById('saas-session-bar').style.display = 'none';
      document.body.classList.remove('saas-active');
      // Reset nav item locks
      document.querySelectorAll('.nav-item.saas-locked').forEach(function(el){ el.classList.remove('saas-locked'); });
      this._showGate();
    },

    _showGate: function(){
      document.getElementById('saas-gate').style.display = 'flex';
      // Prevent INGLY from initializing if no session
      window._SAAS_GATE_BLOCKING = true;
      setTimeout(function(){ document.getElementById('gate-user') && document.getElementById('gate-user').focus(); }, 100);
    },

    _hideGate: function(){
      document.getElementById('saas-gate').style.display = 'none';
      window._SAAS_GATE_BLOCKING = false;
    },

    _applySession: function(){
      var session = this._session;
      if(!session) return;

      // Show session bar
      var bar = document.getElementById('saas-session-bar');
      bar.style.display = 'flex';
      document.getElementById('ssb-lab').textContent  = '🎨 ' + session.labName;
      document.getElementById('ssb-plan').textContent = (session.plan || 'base').toUpperCase();
      if(session.expiresAt){
        var days = Math.ceil((new Date(session.expiresAt) - new Date()) / 86400000);
        document.getElementById('ssb-exp').textContent = days <= 7 ? '⏳ Scade tra '+days+'gg' : '';
      }
      document.body.classList.add('saas-active');

      // Wait for INGLY to fully init then apply locks
      var self = this;
      setTimeout(function(){ self._lockNavItems(); }, 1200);
      setTimeout(function(){ self._hookNavigate(); }, 1500);
    },

    _lockNavItems: function(){
      var session = this._session;
      if(!session) return;
      var mods = session.modules;
      if(!mods || mods[0] === '*') return; // premium → tutto sbloccato

      document.querySelectorAll('.nav-item[data-section]').forEach(function(el){
        var sec = el.getAttribute('data-section');
        if(sec && !mods.includes(sec)){
          el.classList.add('saas-locked');
          // Remove onclick to prevent navigation
          el._origOnclick = el.onclick;
          el.onclick = function(e){
            e.preventDefault(); e.stopPropagation();
            var name = el.textContent.trim().replace(/[🔒✅⚠️⏳]/g,'').trim();
            showUpgradeModal(name, session.plan);
          };
        } else {
          el.classList.remove('saas-locked');
          if(el._origOnclick) { el.onclick = el._origOnclick; el._origOnclick = null; }
        }
      });
    },

    _hookNavigate: function(){
      var session = this._session;
      if(!session || !window.App || !App.navigate) return;
      var mods = session.modules;
      if(!mods || mods[0] === '*') return;
      if(App._saasGateHooked) return;
      App._saasGateHooked = true;

      var _origNav = App.navigate.bind(App);
      App.navigate = function(section){
        // Always allow dashboard and settings
        var always = ['dashboard', 'settings', 'backup'];
        if(always.includes(section) || mods.includes(section)){
          return _origNav(section);
        } else {
          // Show upgrade modal
          showUpgradeModal(section, session.plan);
        }
      };
    },

    canAccess: function(moduleId){
      return userCanAccess(this._session, moduleId);
    },
  };

  // ── INTERCEPT App.init() to wait for gate ─────────────────────
  var _origDOMLoad = window.addEventListener;
  // Override to intercept DOMContentLoaded INGLY init
  document.addEventListener('DOMContentLoaded', function(){
    // If no valid session, wait for user to login before INGLY inits
    SaaSGate.init();
    if(window._SAAS_GATE_BLOCKING){
      // Pause INGLY init — it will re-init after gate login
      var _origAppInit = App && App.init && App.init.bind(App);
      if(_origAppInit && !App._saasInitDone){
        App._saasInitDone = false;
        // Check every 200ms if gate passed
        var waitGate = setInterval(function(){
          if(!window._SAAS_GATE_BLOCKING){
            clearInterval(waitGate);
            if(!App._saasInitDone){
              App._saasInitDone = true;
              _origAppInit();
              // Apply locks after full init
              setTimeout(function(){ if(SaaSGate._session) SaaSGate._lockNavItems(); }, 800);
              setTimeout(function(){ if(SaaSGate._session) SaaSGate._hookNavigate(); }, 1000);
            }
          }
        }, 200);
      }
    } else {
      // Already logged in, INGLY will init normally
      // Locks applied by _applySession
    }
  }, true); // capture phase = runs before INGLY's own DOMContentLoaded

  console.log('[SaaSGate] ✅ v34 Auth Gate installato');
})();

/* ═══════════════════════════════════════════════════════════════════
   🗺️ ROADMAP v34 — Fase 3 COMPLETA + SaaS Auth Gate
   ═══════════════════════════════════════════════════════════════════ */
(function patchRoadmapV34(){
  var _orig = window.showInglyRoadmap;
  window.showInglyRoadmap = function(){
    var existing = document.getElementById('roadmap-overlay-v34');
    if(existing){ existing.remove(); return; }
    var ov = document.createElement('div');
    ov.id = 'roadmap-overlay-v34';
    ov.style.cssText = 'position:fixed;inset:0;background:#000d;z-index:6000;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeSlideDown .2s ease';
    var PHASES = [
      {n:'Fase 1 — Stabilizzazione',color:'#22c55e',items:[
        {t:'NavBus router unificato',d:true},{t:'contain:layout fix',d:true},{t:'Error boundary',d:true},
        {t:'Mobile sidebar',d:true},{t:'Breadcrumb nav',d:true},{t:'Toast upgrade',d:true},
        {t:'Keyboard shortcuts',d:true},{t:'Render cache',d:true},{t:'Data sync Bus',d:true},{t:'Gadgets 55+ items',d:true},
      ]},
      {n:'Fase 2 — AI & Automation',color:'#6366f1',items:[
        {t:'AI Quick Bar',d:true},{t:'Smart Notifications',d:true},{t:'Order Auto-Complete',d:true},
        {t:'Fattura Rapida PDF',d:true},{t:'Revenue Forecast',d:true},{t:'AI Vision',d:true},
        {t:'WhatsApp Templates',d:true},{t:'Product Hunter AI',d:true},{t:'Market AI Agent',d:true},
        {t:'Etsy SEO Wizard',d:true},{t:'Live Intel Feed',d:true},{t:'Dashboard Oggi widget',d:true},
      ]},
      {n:'Fase 3 — Integrazioni',color:'#f59e0b',items:[
        {t:'Backup JSON auto',d:true},{t:'Stripe Payment Links',d:true},
        {t:'PWA Manifest',d:true},{t:'Smart Search sidebar',d:true},
        {t:'Etsy API live (OAuth)',d:true},{t:'Google Calendar sync',d:true},
        {t:'Tracking spedizioni GLS/BRT',d:true},{t:'Push Notifications browser',d:true},
      ]},
      {n:'Fase 4 — SaaS Platform',color:'#a78bfa',items:[
        {t:'🔐 SaaS Auth Gate + Login',d:true},{t:'Admin Panel licenze',d:true},
        {t:'4 Piani Starter/Pro/Business/Enterprise',d:true},{t:'Pacchetto Personalizzato',d:true},
        {t:'Module Lock per piano',d:true},{t:'Backend Node.js + PostgreSQL',d:false},
        {t:'Multi-tenant (SaaS cloud)',d:false},{t:'Abbonamenti Stripe live',d:false},
      ]},
    ];
    var total=PHASES.reduce(function(a,p){return a+p.items.length;},0);
    var done=PHASES.reduce(function(a,p){return a+p.items.filter(function(i){return i.d;}).length;},0);
    var pct=Math.round(done/total*100);
    var html='<div style="background:var(--bg-card,#18181f);border:1px solid #333;border-radius:16px;width:100%;max-width:700px;max-height:90vh;overflow-y:auto">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #222">'
        +'<div><div style="font-size:16px;font-weight:700">🗺️ INGLY OS v34 — Roadmap</div>'
          +'<div style="font-size:11px;color:#666;margin-top:2px">'+done+'/'+total+' task · '+pct+'% · Fase 4 SaaS in corso 🚀</div></div>'
        +'<button onclick="document.getElementById(\'roadmap-overlay-v34\').remove()" style="background:none;border:none;color:#666;cursor:pointer;font-size:18px">✕</button>'
      +'</div><div style="padding:16px;display:flex;flex-direction:column;gap:12px">';
    PHASES.forEach(function(phase){
      var pd=phase.items.filter(function(i){return i.d;}).length;
      var pp=Math.round(pd/phase.items.length*100);
      html+='<div style="background:#111;border-radius:10px;padding:14px;border:1px solid '+(pp===100?phase.color+'44':'#222')+'">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
          +'<span style="font-size:13px;font-weight:700;color:'+phase.color+'">'+phase.n+'</span>'
          +'<span style="font-size:11px;font-weight:700;color:'+(pp===100?'#22c55e':'#666')+'">'+pd+'/'+phase.items.length+(pp===100?' ✅':'')+'</span>'
        +'</div>'
        +'<div style="height:3px;background:#222;border-radius:99px;margin-bottom:10px"><div style="height:100%;width:'+pp+'%;background:'+phase.color+';border-radius:99px"></div></div>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px">'
        +phase.items.map(function(item){
          return '<div style="display:flex;align-items:center;gap:5px;font-size:11px;padding:2px 0;color:'+(item.d?'#ccc':'#444')+'">'
            +(item.d?'✅':'⬜')+' '+item.t+'</div>';
        }).join('')+'</div></div>';
    });
    html+='</div><div style="padding:10px 20px;border-top:1px solid #222;font-size:11px;color:#444;text-align:center">INGLY OS v34 · Premi R per chiudere</div></div>';
    ov.innerHTML=html;
    ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
    document.body.appendChild(ov);
  };
  setTimeout(function(){
    var btn=document.querySelector('.topbar-btn[title*="Roadmap"]');
    if(btn) btn.title='Roadmap INGLY v34 (R)';
  }, 1500);
  console.log('[Roadmap] ✅ v34 aggiornato');
})();

console.log('[INGLY OS v34] ✅ SaaS Auth Gate · Module Lock · Roadmap v34');


/* === INGLY ENTERPRISE + CLOUD v4.0 === */
/* ═══════════════════════════════════════════════════
   INGLY OS — Enterprise + Cloud Layer v4.0
   UN SOLO script. Zero conflitti. Zero duplicati.
═══════════════════════════════════════════════════ */
(function() {
  'use strict';

  /* ── 1. BDW shim (previene errori HealthScore) ── */
  if (!window.BDW) {
    window.BDW = {
      _shim:true, init:function(){return Promise.resolve();},
      invalidate:function(){}, touch:function(){},
      metrics:{revenue:{mtd:0,ytd:0,forecast:[]},finance:{netProfit:0,breakEven:0,cashRunway:0,taxReserve:0},ops:{ordersActive:0},clients:{},products:{top:[],lowMargin:[]},anomalies:[]},
      segments:{champions:[],atRisk:[],lost:[]}, leadScores:{}, _raw:{allSales:[],sales:[],clients:[],openOrders:[],overdueOrders:[],pendingQ:[],catalog:[]}
    };
  }

  /* ── 2. Piano → moduli ── */
  var PLAN_MODULES = {
    starter:['dashboard','quoter','quick_quote','sales','gestione_ordini','clienti','clients',
             'items','magazzino','catalog','listino','suppliers','finance','prima_nota','fiscal',
             'taxcalendar','payment_schedule','fixed_costs','kpi','reports','backup','settings',
             'lab_setup','history','goals','weeklyreport','monthly_report','timetracker'],
    pro:['dashboard','quoter','quick_quote','sales','gestione_ordini','clienti','clients',
         'items','magazzino','catalog','listino','suppliers','finance','prima_nota','fiscal',
         'taxcalendar','payment_schedule','fixed_costs','kpi','reports','backup','settings',
         'lab_setup','history','goals','weeklyreport','monthly_report','timetracker',
         'analytics','forecasting','revsim','crm','crm_pipeline','leadscorer','quoteintel',
         'laser_b2b','lasercalc','ai','aicoach','ai-dashboard','calendar','booking','team',
         'marketing','socialstudio','imagelib','brand_identity','barcode','scanner',
         'print3d','paints','apparel','equipment','stockalert','stockplanner','recurring'],
    business:null, // sarà ['*'] lato sicuro
    enterprise:['*']
  };
  PLAN_MODULES.business = PLAN_MODULES.pro.concat([
    'bizai','intel','decision','strategy','marketintel','market_intel','ai-clv',
    'dynamicprice','price_radar','forecaster','clientintel','etsy_pulse','etsyai',
    'inglydesign','photostudio','competitormon','trendscanner','clv','profitscope'
  ]);

  function getModules(plan) {
    if (plan === 'enterprise') return ['*'];
    return PLAN_MODULES[plan] || PLAN_MODULES.starter;
  }

  /* ── 3. DB helpers ── */
  var DB_KEY = 'ingly_saas_db';

  function loadDB() {
    try {
      var raw = localStorage.getItem(DB_KEY);
      var db = raw ? JSON.parse(raw) : null;
      if (!db) return null;
      db.users = db.users || [];
      return db;
    } catch(e) { return null; }
  }

  /* ── 4. Supabase Cloud (account online, condiviso con l'Admin) ──
     Progetto INGLY di default così gli account creati dal pannello Admin sono
     riconosciuti al login su qualunque dispositivo (login → prova cloud, poi
     fallback localStorage). L'utente può puntare a un altro progetto salvando
     le proprie credenziali (Impostazioni → Cloud Sync), che hanno la
     precedenza. La anon key è pubblica per definizione (protetta da RLS lato
     Supabase); NON è un segreto e coincide con quella già usata dall'Admin. */
  var _SB_DEFAULT_URL = 'https://dhfuokioyuytbxxgoilp.supabase.co';
  var _SB_DEFAULT_KEY = 'sb_publishable_IcqOjv4qBkY3utNgmqNi7Q_oGntPKbY';
  var _sbUrl = localStorage.getItem('ingly_supabase_url') || _SB_DEFAULT_URL;
  var _sbKey = localStorage.getItem('ingly_supabase_anon_key') || _SB_DEFAULT_KEY;

  function sbConfigured() { return !!(_sbUrl && _sbKey); }

  function sbGet(username) {
    var url = _sbUrl.replace(/\/$/, '') + '/rest/v1/ingly_users?select=*&or=(username.eq.' +
              encodeURIComponent(username) + ',email.eq.' + encodeURIComponent(username) + ')&limit=1';
    return fetch(url, {
      headers: { 'apikey': _sbKey, 'Authorization': 'Bearer ' + _sbKey }
    }).then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json().then(function(rows) { return rows && rows[0] || null; });
    });
  }

  function sbUpdate(id, data) {
    if (!sbConfigured()) return Promise.resolve();
    return fetch(_sbUrl.replace(/\/$/, '') + '/rest/v1/ingly_users?id=eq.' + id, {
      method: 'PATCH',
      headers: {
        'apikey': _sbKey, 'Authorization': 'Bearer ' + _sbKey,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    }).catch(function() {});
  }

  function sbUpsert(user) {
    if (!sbConfigured()) return Promise.resolve();
    var row = {
      id: user.id, username: user.username, email: user.email || '',
      password_hash: user.passwordHash || '',
      plan_id: user.plan || 'starter', status: user.status || 'active',
      active: user.active !== false,
      expires_at: user.expiresAt || null,
      lab_name: user.company || ((user.nome||'') + ' ' + (user.cognome||'')).trim(),
      modules_json: JSON.stringify(user.modules || getModules(user.plan)),
      updated_at: new Date().toISOString()
    };
    return fetch(_sbUrl.replace(/\/$/, '') + '/rest/v1/ingly_users', {
      method: 'POST',
      headers: {
        'apikey': _sbKey, 'Authorization': 'Bearer ' + _sbKey,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(row)
    }).catch(function() {});
  }

  /* Esponi per Admin Panel */
  window.InglyCloud = {
    isConfigured: sbConfigured,
    configure: function(url, key) {
      _sbUrl = url.replace(/\/$/, '');
      _sbKey = key;
      localStorage.setItem('ingly_supabase_url', _sbUrl);
      localStorage.setItem('ingly_supabase_anon_key', _sbKey);
    },
    syncUser: sbUpsert,
    testConnection: function() {
      return fetch(_sbUrl.replace(/\/$/, '') + '/rest/v1/ingly_users?select=count&limit=1', {
        headers: { 'apikey': _sbKey, 'Authorization': 'Bearer ' + _sbKey }
      }).then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }
  };
  window.InglyCloudAdmin = window.InglyCloud;

  /* ── 5. Core login ── */
  function doLogin(username, password, errEl, btn) {
    errEl.style.display = 'none';
    if (!username || !password) {
      errEl.textContent = 'Inserisci username e password';
      errEl.style.display = 'block'; return;
    }

    /* Brute force */
    var bfKey  = '_ingly_bf_' + username.toLowerCase();
    var bfData = JSON.parse(sessionStorage.getItem(bfKey) || '{"c":0,"u":0}');
    if (bfData.u > Date.now()) {
      errEl.textContent = 'Troppi tentativi. Riprova tra ' + Math.ceil((bfData.u - Date.now()) / 1000) + 's.';
      errEl.style.display = 'block'; return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifica...'; }

    function resetBtn() {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Accedi a INGLY OS'; }
    }

    function fail(msg) {
      resetBtn();
      bfData.c = (bfData.c || 0) + 1;
      if (bfData.c >= 5) { bfData.u = Date.now() + 60000; bfData.c = 0; }
      sessionStorage.setItem(bfKey, JSON.stringify(bfData));
      errEl.textContent = msg + (bfData.c > 0 && bfData.c < 5 ? ' (' + (5 - bfData.c) + ' tentativi)' : '');
      errEl.style.display = 'block';
    }

    function success(user) {
      resetBtn();
      sessionStorage.removeItem(bfKey);
      /* Update last_login AND ensure password_hash is synced */
      var updateData = { last_login: new Date().toISOString() };
      if (user.passwordHash || user.password_hash) {
        updateData.password_hash = user.passwordHash || user.password_hash;
      }
      sbUpdate(user.id, updateData);

      var _plan = user.plan || user.plan_id || 'starter';
      var _isOwner = (user.username === 'owner') || (user.id === 'standalone-owner') || (user.email === 'owner@ingly.io');
      // L'owner è il super-account: sempre Enterprise, accesso totale.
      if (_isOwner) _plan = 'enterprise';
      var modules = user.modules || user.modules_json;
      if (typeof modules === 'string') { try { modules = JSON.parse(modules); } catch(e) { modules = null; } }
      if (!modules || typeof modules === 'number' || (Array.isArray(modules) && modules.length === 0)) modules = getModules(_plan);
      // Enterprise (e owner) = accesso a tutto, ignora eventuali modules_json stantii.
      if (_isOwner || _plan === 'enterprise' || (Array.isArray(modules) && modules.indexOf('*') > -1)) modules = ['*'];

      var expiry = user.expiresAt || user.expires_at;
      if (!expiry && (user.status || user.plan_id) !== 'lifetime') {
        expiry = new Date(Date.now() + 30 * 86400000).toISOString();
      }

      var session = {
        id: user.id, userId: user.id,
        username: user.username,
        labName: user.lab_name || user.labName || user.company || user.username,
        plan: _plan,
        modules: modules,
        expiresAt: expiry,
        status: user.status || 'active',
        passwordHash: user.passwordHash || user.password_hash || '',
        loginAt: new Date().toISOString()
      };

      try { sessionStorage.setItem('ingly_saas_session', JSON.stringify(session)); } catch(e) {}
      window.SaaSGate._session = session;
      window.SaaSGate._hideGate();
      window.SaaSGate._applySession();
      startMonitor(session);
    }

    function tryUser(user, source) {
      if (!user) { fail('Utente non trovato'); return; }
      var activeOk = user.active === true || ['active','trial','lifetime'].indexOf(user.status || user.plan_id) > -1;
      if (!activeOk) { fail('Account ' + (user.status || 'inattivo')); return; }
      var pwd = user.passwordHash || user.password_hash || '';
      /* If Supabase returned empty password (user synced without pwd), try localStorage */
      if (!pwd && source === 'cloud') {
        var db = loadDB();
        var lsUser = db && (db.users || []).find(function(u) {
          return u.username === user.username || u.id === user.id;
        });
        if (lsUser && (lsUser.passwordHash || lsUser.password_hash)) {
          /* Verify against localStorage password */
          var lsPwd = lsUser.passwordHash || lsUser.password_hash;
          if (lsPwd === password) { success(Object.assign({}, user, { passwordHash: lsPwd })); return; }
          else { fail('Password non corretta'); return; }
        }
      }
      if (!pwd) { fail('Account non ha password. Contatta l\u2019amministratore.'); return; }
      if (pwd !== password) { fail('Password non corretta'); return; }
      var expiry = user.expiresAt || user.expires_at;
      var isLifetime = (user.status === 'lifetime');
      if (!isLifetime && expiry && new Date(expiry) < new Date()) {
        fail('Licenza scaduta il ' + new Date(expiry).toLocaleDateString('it-IT'));
        return;
      }
      success(user);
    }

    /* Prima prova cloud, poi localStorage */
    if (sbConfigured()) {
      sbGet(username).then(function(user) {
        if (user) { tryUser(user, 'cloud'); }
        else {
          /* non su cloud → prova localStorage */
          var db = loadDB();
          var lsUser = db && (db.users || []).find(function(u) {
            return u.username === username || u.email === username;
          });
          tryUser(lsUser || null);
        }
      }).catch(function() {
        /* cloud error → localStorage fallback */
        var db = loadDB();
        if (!db || !(db.users || []).length) {
          resetBtn();
          errEl.innerHTML = 'Nessun utente trovato.<br>Crea un account dal pannello Admin.';
          errEl.style.display = 'block'; return;
        }
        var lsUser = (db.users || []).find(function(u) {
          return (u.username === username || u.email === username) &&
                 (u.active === true || ['active','trial','lifetime'].indexOf(u.status) > -1);
        });
        tryUser(lsUser || null);
      });
    } else {
      /* Solo localStorage */
      var db = loadDB();
      if (!db || !(db.users || []).length) {
        resetBtn();
        errEl.innerHTML = 'Nessun utente nel sistema.<br>Crea prima un account dal pannello Admin.';
        errEl.style.display = 'block'; return;
      }
      var lsUser = (db.users || []).find(function(u) {
        return (u.username === username || u.email === username) &&
               (u.active === true || ['active','trial','lifetime'].indexOf(u.status) > -1);
      });
      tryUser(lsUser || null);
    }
  }

  /* ── 5b. Registrazione self-service + trial 14 giorni ──
     Crea un utente (piano Pro in prova) su Supabase (RLS aperta) e in locale,
     poi effettua il login. Nessun backend necessario. */
  function _regUid(){ return 'u'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
  function doRegister(){
    var lab = (document.getElementById('reg-lab').value||'').trim();
    var user = (document.getElementById('reg-user').value||'').trim();
    var email = (document.getElementById('reg-email').value||'').trim();
    var pass = document.getElementById('reg-pass').value;
    var err = document.getElementById('reg-err');
    var btn = document.getElementById('reg-submit');
    err.style.display='none';
    if(!lab || !user || !email || !pass){ err.textContent='Compila tutti i campi'; err.style.display='block'; return; }
    if(pass.length<6){ err.textContent='Password troppo corta (min 6 caratteri)'; err.style.display='block'; return; }
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ err.textContent='Email non valida'; err.style.display='block'; return; }
    if(!/^[a-zA-Z0-9._-]{3,}$/.test(user)){ err.textContent='Username: min 3 caratteri (lettere, numeri, . _ -)'; err.style.display='block'; return; }
    // username già in uso in locale?
    var db = loadDB() || {users:[]}; db.users = db.users || [];
    if(db.users.some(function(u){ return u.username===user; })){ err.textContent='Username già in uso'; err.style.display='block'; return; }
    btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Creazione...';
    function finish(){
      // login automatico riusando doLogin
      var gu=document.getElementById('gate-user'), gp=document.getElementById('gate-pass');
      if(gu&&gp){ gu.value=user; gp.value=pass; }
      SaaSGate.showLogin();
      window.SaaSGate.login();
    }
    function create(){
      var trialDays=14;
      var u={ id:_regUid(), username:user, email:email, labName:lab,
        plan:'pro', plan_id:'pro', status:'trial',
        modules:getModules('pro'), active:true,
        expiresAt:new Date(Date.now()+trialDays*86400000).toISOString(),
        passwordHash:pass, password_hash:pass, createdAt:new Date().toISOString() };
      db.users.unshift(u);
      try{ localStorage.setItem('ingly_saas_db', JSON.stringify(db)); }catch(e){}
      // sync su Supabase (best-effort)
      try{ if(typeof sbUpsert==='function') sbUpsert(u); }catch(e){}
      setTimeout(finish, 400);
    }
    // controllo unicità username anche su cloud, poi crea
    if(typeof sbConfigured==='function' && sbConfigured() && typeof sbGet==='function'){
      sbGet(user).then(function(existing){
        if(existing){ btn.disabled=false; btn.innerHTML='Crea account e prova gratis'; err.textContent='Username già registrato'; err.style.display='block'; }
        else create();
      }).catch(function(){ create(); }); // se il cloud non risponde, crea comunque in locale
    } else { create(); }
  }

  /* ── 6. Monitor sessione (30s) ── */
  var _monitorTimer = null;

  function startMonitor(session) {
    stopMonitor();
    _monitorTimer = setInterval(function() { checkSession(session); }, 30000);
  }

  function stopMonitor() {
    if (_monitorTimer) { clearInterval(_monitorTimer); _monitorTimer = null; }
  }

  function checkSession(session) {
    function processUser(user) {
      if (!user) return;
      if (user.status === 'banned' || user.status === 'suspended') {
        stopMonitor(); showRevoked(user.status); return;
      }
      var hash = user.passwordHash || user.password_hash || '';
      if (hash && session.passwordHash && hash !== session.passwordHash) {
        stopMonitor(); showPwdChanged(); return;
      }
      var expiry = user.expiresAt || user.expires_at;
      if (user.status !== 'lifetime' && expiry && new Date(expiry) < new Date()) {
        stopMonitor(); showExpired(expiry); return;
      }
      var newPlan = user.plan || user.plan_id;
      if (newPlan && newPlan !== session.plan) {
        session.plan = newPlan;
        var mods = user.modules || user.modules_json;
        if (typeof mods === 'string') { try { mods = JSON.parse(mods); } catch(e) { mods = null; } }
        session.modules = mods || getModules(newPlan);
        if (user.expiresAt || user.expires_at) session.expiresAt = user.expiresAt || user.expires_at;
        try { sessionStorage.setItem('ingly_saas_session', JSON.stringify(session)); } catch(e) {}
        window.SaaSGate._session = session;
        if (window.SaaSGate._lockNavItems) SaaSGate._lockNavItems();
        showBanner('Piano aggiornato: ' + newPlan.toUpperCase(), '#10b981');
      }
    }

    if (sbConfigured()) {
      sbGet(session.username).then(processUser).catch(function() {
        var db = loadDB();
        var u = (db && db.users || []).find(function(x) { return x.id === session.userId; });
        processUser(u);
      });
    } else {
      var db = loadDB();
      var u = (db && db.users || []).find(function(x) { return x.id === session.userId; });
      processUser(u);
    }
  }

  /* ── 7. Realtime Sync (BroadcastChannel) ── */
  var CHAN = 'ingly_admin_commands_v2';
  var POLL = 'ingly_pending_commands';

  function handleCmd(cmd) {
    try {
      if (!cmd || !cmd.type) return;
      var s = window.SaaSGate && window.SaaSGate._session;
      if (!s) return;
      var mine = !cmd.userId || s.userId === cmd.userId || s.id === cmd.userId;
      if (!mine) return;
      if (cmd.type === 'force_logout') {
        showBanner('Sessione terminata dall\'amministratore', '#f59e0b');
        setTimeout(function() { if (SaaSGate.logout) SaaSGate.logout(); }, 1500);
      } else if (cmd.type === 'suspend') {
        showRevoked('suspended');
      } else if (cmd.type === 'ban') {
        showRevoked('banned');
      } else if (cmd.type === 'password_reset') {
        showPwdChanged();
        setTimeout(function() { if (SaaSGate.logout) SaaSGate.logout(); }, 3000);
      } else if (cmd.type === 'license_renewal') {
        if (cmd.newExpiry) s.expiresAt = cmd.newExpiry;
        try { sessionStorage.setItem('ingly_saas_session', JSON.stringify(s)); } catch(e) {}
        showBanner('Licenza rinnovata!', '#10b981');
      } else if (cmd.type === 'plan_change') {
        if (cmd.newPlan) {
          s.plan = cmd.newPlan;
          s.modules = cmd.modules || getModules(cmd.newPlan);
          if (cmd.expiresAt) s.expiresAt = cmd.expiresAt;
          try { sessionStorage.setItem('ingly_saas_session', JSON.stringify(s)); } catch(e) {}
          window.SaaSGate._session = s;
          if (window.SaaSGate._lockNavItems) SaaSGate._lockNavItems();
          showBanner('Piano aggiornato: ' + cmd.newPlan.toUpperCase(), '#10b981');
        }
      }
    } catch(e) {}
  }

  try {
    var bc = new BroadcastChannel(CHAN);
    bc.onmessage = function(e) { handleCmd(e.data); };
  } catch(e) {}

  setInterval(function() {
    try {
      var p = JSON.parse(localStorage.getItem(POLL) || '[]');
      if (!p.length) return;
      p.forEach(handleCmd);
      localStorage.removeItem(POLL);
    } catch(e) {}
  }, 3000);

  /* ── 8. Export guard ── */
  function checkExport() {
    var s = window.SaaSGate && window.SaaSGate._session;
    if (!s) return true;
    if (s.status === 'suspended' || s.status === 'banned') { showRevoked(s.status); return false; }
    if (s.status !== 'lifetime' && s.expiresAt && new Date(s.expiresAt) < new Date()) {
      showExpired(s.expiresAt); return false;
    }
    return true;
  }

  function guardExports() {
    ['exportAll','generatePDFQuote','genPDF','exportCSV','_exportCSV','downloadQR'].forEach(function(fn) {
      if (window[fn] && !window[fn]._guarded) {
        var orig = window[fn];
        window[fn] = function() { if (!checkExport()) return; return orig.apply(this, arguments); };
        window[fn]._guarded = true;
      }
    });
  }

  /* ── 9. UI screens ── */
  function showBanner(msg, color) {
    var n = document.createElement('div');
    n.style.cssText = 'position:fixed;top:60px;right:20px;z-index:99990;background:' + color + '18;border:1px solid ' + color + '44;color:' + color + ';border-radius:10px;padding:12px 16px;font-family:Inter,system-ui;font-size:12px;font-weight:600;max-width:300px';
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(function() { if (n.parentNode) n.remove(); }, 5000);
  }

  function showExpired(d) {
    var gate = document.getElementById('saas-gate');
    if (!gate) return;
    gate.style.display = 'flex';
    var box = gate.querySelector('.gate-box');
    if (box) box.innerHTML = '<div style="text-align:center;padding:20px"><div style="font-size:48px;margin-bottom:16px">\u23f0</div><div style="font-size:20px;font-weight:900;color:#e8e8f0;margin-bottom:8px">Licenza Scaduta</div><div style="font-size:12px;color:#888;line-height:1.7">Scaduta il ' + (d ? new Date(d).toLocaleDateString('it-IT') : '') + '<br>Contatta il tuo amministratore.</div></div>';
  }

  function showRevoked(reason) {
    if (document.getElementById('_ingly_revoked')) return;
    var d = document.createElement('div');
    d.id = '_ingly_revoked';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#09090b;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui';
    d.innerHTML = '<div style="text-align:center;max-width:420px;padding:40px"><div style="font-size:56px;margin-bottom:20px">' + (reason==='banned'?'\u{1F6A8}':'\u26D4') + '</div><div style="font-size:22px;font-weight:900;color:#e8e8f0;margin-bottom:12px">Account ' + reason + '</div><div style="font-size:13px;color:#666">Contatta support@ingly.io</div></div>';
    document.body.appendChild(d);
  }

  function showPwdChanged() {
    if (document.getElementById('_ingly_pwd')) return;
    var d = document.createElement('div');
    d.id = '_ingly_pwd';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000000cc;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui';
    d.innerHTML = '<div style="background:#111115;border:1px solid #2a2a35;border-radius:18px;max-width:380px;width:100%;padding:32px;text-align:center"><div style="font-size:48px;margin-bottom:16px">\uD83D\uDD12</div><div style="font-size:18px;font-weight:800;color:#e8e8f0;margin-bottom:8px">Password modificata</div><div style="font-size:12px;color:#888;line-height:1.7;margin-bottom:20px">Verrai disconnesso tra 3 secondi.</div><div style="height:4px;background:#1e1e2e;border-radius:99px;overflow:hidden"><div style="height:100%;background:#6366f1;animation:_pw3s 3s linear forwards"></div></div></div>';
    var st = document.createElement('style');
    st.textContent = '@keyframes _pw3s{from{width:100%}to{width:0%}}';
    document.head.appendChild(st);
    document.body.appendChild(d);
  }

  /* ── 10. Status bar ── */
  function injectStatusBar(session) {
    if (document.getElementById('_ingly_bar')) return;
    var bar = document.createElement('div');
    bar.id = '_ingly_bar';
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;height:22px;background:#111115;border-top:1px solid #1e1e2e;display:flex;align-items:center;gap:12px;padding:0 12px;font-family:Inter,system-ui;font-size:10px;color:#555;z-index:9900';
    bar.innerHTML = '<span style="color:#6366f1;font-weight:700">INGLY v35</span>'
      + '<span style="color:#888">' + (session.labName || session.username) + '</span>'
      + '<span style="background:#6366f120;border-radius:99px;padding:1px 7px;color:#818cf8;font-size:9px;font-weight:700">' + (session.plan || '').toUpperCase() + '</span>'
      + '<span style="color:#555">' + (session.expiresAt ? 'Scade: ' + new Date(session.expiresAt).toLocaleDateString('it-IT') : '\u221e') + '</span>'
      + '<span style="margin-left:auto;cursor:pointer;color:#6366f1" onclick="window._inglyDash&&_inglyDash()" title="Ctrl+Shift+D">\uD83D\uDD17</span>';
    document.body.appendChild(bar);
  }

  /* ── 11. Dashboard Ctrl+Shift+D ── */
  window._inglyDash = function() {
    var d = document.getElementById('_ingly_dash_panel');
    if (d) { d.remove(); return; }
    var db = loadDB() || {};
    var users = db.users || [];
    var s = window.SaaSGate && window.SaaSGate._session;
    var active  = users.filter(function(u) { return u.status==='active'; }).length;
    var mrr     = users.reduce(function(a,u) { return a+({starter:19,pro:49,business:99,enterprise:199}[u.plan]||0); }, 0);
    var panel = document.createElement('div');
    panel.id = '_ingly_dash_panel';
    panel.style.cssText = 'position:fixed;bottom:30px;right:20px;z-index:99980;width:260px;background:#111115;border:1px solid #2a2a35;border-radius:14px;box-shadow:0 12px 40px #00000099;font-family:Inter,system-ui;font-size:12px';
    panel.innerHTML = '<div style="padding:10px 14px;border-bottom:1px solid #1e1e2e;display:flex;align-items:center;gap:8px"><div style="font-size:13px;font-weight:800;color:#e8e8f0;flex:1">Enterprise Dashboard</div><button onclick="document.getElementById(\'_ingly_dash_panel\').remove()" style="background:none;border:none;color:#555;cursor:pointer;font-size:15px">\u00d7</button></div>'
      + '<div style="padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:6px">'
      + _kpi('Utenti attivi', active, '#10b981')
      + _kpi('MRR', '\u20ac'+mrr, '#10b981')
      + _kpi('Piano', (s&&s.plan||'\u2014').toUpperCase(), '#818cf8')
      + _kpi('Cloud', sbConfigured()?'ON \u2705':'OFF', sbConfigured()?'#10b981':'#f59e0b')
      + '</div>'
      + '<div style="padding:6px 14px 10px;border-top:1px solid #1e1e2e;font-size:9px;color:#444">' + (s?s.username:'—') + ' \u2022 ' + (s&&s.userId?s.userId.slice(0,8):'') + '</div>';
    document.body.appendChild(panel);
  };

  function _kpi(l, v, c) {
    return '<div style="background:#18181f;border:1px solid #2a2a35;border-radius:8px;padding:8px 10px"><div style="font-size:9px;color:#555;margin-bottom:2px">'+l+'</div><div style="font-size:14px;font-weight:900;color:'+c+'">'+v+'</div></div>';
  }

  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') { e.preventDefault(); window._inglyDash(); }
  });

  /* ── 12. INIT ── */
  function init() {
    var waited = 0;
    var poll = setInterval(function() {
      waited++;
      if (waited > 120) { clearInterval(poll); return; }
      if (!window.SaaSGate) return;
      clearInterval(poll);

      /* Patch SaaSGate.login UNA SOLA VOLTA */
      if (window.SaaSGate._v4patched) return;
      window.SaaSGate._v4patched = true;

      window.SaaSGate.login = function() {
        var u  = document.getElementById('gate-user');
        var p  = document.getElementById('gate-pass');
        var e  = document.getElementById('gate-err');
        var b  = document.getElementById('gate-submit');
        if (!u || !p || !e) return;
        doLogin(u.value.trim(), p.value, e, b);
      };
      /* Registrazione self-service + toggle login/registrazione */
      window.SaaSGate.register = doRegister;
      window.SaaSGate.showRegister = function(){
        var l=document.getElementById('gate-login'), r=document.getElementById('gate-register');
        if(l) l.style.display='none'; if(r) r.style.display='block';
        var t=document.getElementById('gf-title'), s=document.getElementById('gf-sub');
        if(t) t.textContent='Prova gratis 14 giorni'; if(s) s.textContent='Crea il tuo account INGLY — nessuna carta richiesta';
      };
      window.SaaSGate.showLogin = function(){
        var l=document.getElementById('gate-login'), r=document.getElementById('gate-register');
        if(r) r.style.display='none'; if(l) l.style.display='block';
        var t=document.getElementById('gf-title'), s=document.getElementById('gf-sub');
        if(t) t.textContent='Bentornato'; if(s) s.textContent='Accedi alla tua licenza INGLY';
      };

      /* Patch logout */
      var origLogout = window.SaaSGate.logout.bind(window.SaaSGate);
      window.SaaSGate.logout = function() {
        stopMonitor();
        origLogout();
      };

      /* Se già loggato (session esistente) */
      var existingSession = window.SaaSGate._session;
      if (existingSession) {
        injectStatusBar(existingSession);
        guardExports();
        startMonitor(existingSession);
      }

      /* Aspetta il login completato */
      document.addEventListener('ingly:login', function(ev) {
        var s = ev.detail || window.SaaSGate._session;
        if (s) { injectStatusBar(s); guardExports(); startMonitor(s); }
      });

      /* Monkey-patch _applySession per rilevare il login */
      var origApply = window.SaaSGate._applySession.bind(window.SaaSGate);
      window.SaaSGate._applySession = function() {
        origApply();
        var s = window.SaaSGate._session;
        if (s) {
          setTimeout(function() { injectStatusBar(s); guardExports(); startMonitor(s); }, 200);
        }
      };

    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();



/* === INGLY P1/P2/P3 PLATFORM === */
/* ══════════════════════════════════════════════════════════════
   INGLY OS v35 — P1 / P2 / P3 IMPLEMENTATION
   P1: Supabase Realtime sync + module lock + expiry polling
   P2: Dashboard KPI reali + Email (EmailJS) + Lab profile
   P3: PWA ready + Dark/Light mode + Export watermark
   ══════════════════════════════════════════════════════════════ */
(function InglySaaSPlatform() {
  'use strict';

  var SB_URL = localStorage.getItem('ingly_supabase_url') || '';
  var SB_KEY = localStorage.getItem('ingly_supabase_anon_key') || '';

  function sbOk() { return !!(SB_URL && SB_KEY); }

  /* ── UTILITY: fetch Supabase row for current user ─────────── */
  function sbFetchUser(username) {
    if (!sbOk()) return Promise.resolve(null);
    var url = SB_URL.replace(/\/$/, '') +
      '/rest/v1/ingly_users?select=*&or=(username.eq.' +
      encodeURIComponent(username) + ',email.eq.' + encodeURIComponent(username) + ')&limit=1';
    return fetch(url, {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    }).then(function(r) {
      if (!r.ok) return null;
      return r.json().then(function(rows) { return (rows && rows[0]) || null; });
    }).catch(function() { return null; });
  }

  /* ── P1: SUPABASE REALTIME SYNC ──────────────────────────────
     WebSocket subscription → aggiornamento istantaneo
     Fallback: polling ogni 30s
  ─────────────────────────────────────────────────────────────── */
  var _ws = null;
  var _pollTimer = null;
  var _sessionRef = null;

  function startRealtimeSync(session) {
    _sessionRef = session;
    if (!sbOk()) return;

    /* ── WebSocket Supabase Realtime ── */
    try {
      var wsUrl = SB_URL
        .replace(/\/$/, '')
        .replace('https://', 'wss://')
        .replace('http://', 'ws://') +
        '/realtime/v1/websocket?apikey=' + SB_KEY + '&vsn=1.0.0';

      _ws = new WebSocket(wsUrl);

      _ws.onopen = function() {
        _ws.send(JSON.stringify({
          topic: 'realtime:public:ingly_users',
          event: 'phx_join',
          payload: {
            config: {
              postgres_changes: [{
                event: 'UPDATE',
                schema: 'public',
                table: 'ingly_users',
                filter: 'id=eq.' + session.userId
              }]
            }
          },
          ref: '1'
        }));
      };

      _ws.onmessage = function(e) {
        try {
          var msg = JSON.parse(e.data);
          var record = msg.payload &&
            msg.payload.data &&
            msg.payload.data.record;
          if (record) applyCloudUpdate(record, session);
        } catch(err) {}
      };

      _ws.onclose = function() {
        setTimeout(function() {
          if (_sessionRef) startRealtimeSync(_sessionRef);
        }, 15000);
      };

      _ws.onerror = function() {
        startPollingFallback(session);
      };
    } catch(e) {
      startPollingFallback(session);
    }

    /* Polling ogni 30s come backup */
    startPollingFallback(session);
  }

  function startPollingFallback(session) {
    if (_pollTimer) clearInterval(_pollTimer);
    _pollTimer = setInterval(function() {
      if (!session) return;
      sbFetchUser(session.username).then(function(user) {
        if (user) applyCloudUpdate(user, session);
      });
    }, 30000);
  }

  function stopSync() {
    if (_ws) { try { _ws.close(); } catch(e) {} _ws = null; }
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    _sessionRef = null;
  }

  /* ── P1: APPLY CLOUD UPDATE ──────────────────────────────── */
  function applyCloudUpdate(user, session) {
    if (!user) return;
    var s = (window.SaaSGate && window.SaaSGate._session) || session;
    if (!s) return;

    /* 1. Banned / Suspended → blocco immediato */
    if (user.status === 'banned' || user.status === 'suspended') {
      stopSync();
      _showRevoked(user.status);
      return;
    }

    /* 2. Password cambiata → logout in 3s */
    var newHash = user.password_hash || user.passwordHash;
    if (newHash && s.passwordHash && newHash !== s.passwordHash) {
      stopSync();
      _showPwdChanged();
      return;
    }

    /* 3. Scadenza → blocco */
    var exp = user.expires_at || user.expiresAt;
    if (user.status !== 'lifetime' && exp && new Date(exp) < new Date()) {
      stopSync();
      _showExpired(exp);
      return;
    }

    /* 4. Piano cambiato → aggiorna moduli in tempo reale */
    var newPlan = user.plan_id || user.plan;
    if (newPlan && newPlan !== s.plan) {
      s.plan = newPlan;
      var mods = user.modules_json;
      if (typeof mods === 'string') {
        try { mods = JSON.parse(mods); } catch(e) { mods = null; }
      }
      s.modules = mods || _defaultModules(newPlan);
      if (exp) s.expiresAt = exp;
      try {
        sessionStorage.setItem('ingly_saas_session', JSON.stringify(s));
      } catch(e) {}
      if (window.SaaSGate) window.SaaSGate._session = s;

      /* P1: Applica il lock moduli immediatamente */
      if (window.SaaSGate && window.SaaSGate._lockNavItems) {
        SaaSGate._lockNavItems();
      }
      _banner('Piano aggiornato: ' + newPlan.toUpperCase(), '#10b981');
    }

    /* 5. Scadenza aggiornata (rinnovo) */
    if (exp && exp !== s.expiresAt) {
      s.expiresAt = exp;
      try {
        sessionStorage.setItem('ingly_saas_session', JSON.stringify(s));
      } catch(e) {}
      _banner('Licenza rinnovata!', '#10b981');
    }
  }

  /* ── P1: DEFAULT MODULES BY PLAN ─────────────────────────── */
  function _defaultModules(plan) {
    var STARTER = ['dashboard','quoter','quick_quote','sales','gestione_ordini',
      'clienti','clients','items','magazzino','catalog','listino','suppliers',
      'finance','prima_nota','fiscal','taxcalendar','payment_schedule',
      'fixed_costs','kpi','reports','backup','settings','lab_setup',
      'history','goals','weeklyreport','monthly_report','timetracker'];
    if (plan === 'enterprise') return ['*'];
    if (plan === 'starter') return STARTER;
    /* pro/business: all of starter + extras */
    return null; /* SaaSGate uses its own PLAN_MODULES as fallback */
  }

  /* ── P1: SYNC MODULES_JSON TO SUPABASE WHEN PLAN CHANGES ─── */
  function syncModulesToCloud(userId, modules) {
    if (!sbOk()) return;
    var mJson = JSON.stringify(modules && modules[0] === '*' ? ['*'] : (modules || []));
    fetch(SB_URL.replace(/\/$/, '') + '/rest/v1/ingly_users?id=eq.' + userId, {
      method: 'PATCH',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        modules_json: mJson,
        updated_at: new Date().toISOString()
      })
    }).catch(function() {});
  }

  /* ── P2: DARK / LIGHT MODE ────────────────────────────────── */
  /* `ingly_theme` era scritta da due sistemi con valori incompatibili: qui
     'dark'/'light', e in ThemeSwitcher gli id delle palette ('default',
     'midnight', 'emerald'…). Scegliere "Midnight Blue" faceva quindi ripartire
     l'applicazione in tema chiaro. La modalità chiaro/scuro ha ora una chiave
     propria; questa migrazione recupera la preferenza già salvata. */
  function readColorScheme() {
    var v = localStorage.getItem('ingly_color_scheme');
    if (v) return v;
    var legacy = localStorage.getItem('ingly_theme');
    if (legacy === 'dark' || legacy === 'light') {
      localStorage.setItem('ingly_color_scheme', legacy);
      return legacy;
    }
    return null;
  }

  function initDarkMode() {
    var saved = readColorScheme();
    // INGLY OS è dark-first: senza una preferenza salvata si parte scuri.
    // Prima si ereditava l'impostazione del sistema operativo, e su una
    // macchina in tema chiaro il prodotto si apriva con una palette che non
    // è la sua.
    var isDark = saved ? saved === 'dark' : true;
    applyTheme(isDark);
  }

  function applyTheme(dark) {
    document.documentElement.setAttribute('data-color-scheme', dark ? 'dark' : 'light');
    localStorage.setItem('ingly_color_scheme', dark ? 'dark' : 'light');
    var btn = document.getElementById('_ingly_theme_btn');
    if (btn) btn.title = dark ? 'Passa a modalità chiara' : 'Passa a modalità scura';
  }

  function toggleTheme() {
    applyTheme(document.documentElement.getAttribute('data-color-scheme') !== 'dark');
  }

  window._inglyToggleTheme = toggleTheme;

  function injectThemeToggle() {
    if (document.getElementById('_ingly_theme_btn')) return;
    var bar = document.getElementById('_ingly_bar');
    if (!bar) return;
    var btn = document.createElement('button');
    btn.id = '_ingly_theme_btn';
    btn.style.cssText = 'background:none;border:none;cursor:pointer;color:#6366f1;font-size:14px;padding:0 4px';
    btn.innerHTML = '&#9788;';
    btn.title = 'Toggle tema';
    btn.onclick = toggleTheme;
    bar.insertBefore(btn, bar.lastChild);
  }

  /* ── P2: LAB PROFILE MANAGEMENT ──────────────────────────── */
  function saveLabProfile(data) {
    try {
      localStorage.setItem('ingly_lab_profile', JSON.stringify(data));
    } catch(e) {}
    /* Sync to Supabase */
    var s = window.SaaSGate && window.SaaSGate._session;
    if (s && sbOk()) {
      fetch(SB_URL.replace(/\/$/, '') + '/rest/v1/ingly_users?id=eq.' + s.userId, {
        method: 'PATCH',
        headers: {
          'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY,
          'Content-Type': 'application/json', 'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ lab_name: data.labName, updated_at: new Date().toISOString() })
      }).catch(function() {});
    }
  }

  function getLabProfile() {
    try {
      return JSON.parse(localStorage.getItem('ingly_lab_profile') || '{}');
    } catch(e) { return {}; }
  }

  window.InglyLabProfile = { save: saveLabProfile, get: getLabProfile };

  /* ── P3: EXPORT WATERMARK ─────────────────────────────────── */
  function injectExportWatermark() {
    var fns = ['exportAll', 'generatePDFQuote', 'genPDF', 'exportCSV', '_exportCSV'];
    fns.forEach(function(fnName) {
      if (!window[fnName] || window[fnName]._watermarked) return;
      var orig = window[fnName];
      window[fnName] = function() {
        var s = window.SaaSGate && window.SaaSGate._session;
        if (s) {
          /* Store watermark metadata for use in PDF/CSV generation */
          window._ingly_export_meta = {
            userId:    s.userId,
            username:  s.username,
            labName:   s.labName,
            timestamp: new Date().toISOString(),
            plan:      s.plan
          };
        }
        return orig.apply(this, arguments);
      };
      window[fnName]._watermarked = true;
    });
  }

  /* ── P3: PWA MANIFEST (inject dynamically) ────────────────── */
  function injectPWAManifest() {
    if (document.getElementById('_ingly_pwa_manifest')) return;
    var manifest = {
      name: 'INGLY OS',
      short_name: 'INGLY',
      description: 'Gestionale enterprise per laboratori creativi',
      start_url: './',
      display: 'standalone',
      background_color: '#09090b',
      theme_color: '#6366f1',
      icons: [{
        src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" rx="36" fill="%236366f1"/><text x="90" y="122" text-anchor="middle" font-size="100" font-family="Arial">🎨</text></svg>',
        sizes: '180x180',
        type: 'image/svg+xml'
      }]
    };
    var blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    var url  = URL.createObjectURL(blob);
    var link = document.createElement('link');
    link.id  = '_ingly_pwa_manifest';
    link.rel = 'manifest';
    link.href = url;
    document.head.appendChild(link);
    /* Meta theme-color */
    var meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#6366f1';
    document.head.appendChild(meta);
  }

  /* ── UI HELPERS ─────────────────────────────────────────────  */
  function _banner(msg, color) {
    var existing = document.getElementById('_ingly_banner_p1');
    if (existing) existing.remove();
    var n = document.createElement('div');
    n.id = '_ingly_banner_p1';
    n.style.cssText = [
      'position:fixed;top:60px;right:20px;z-index:99990',
      'background:' + color + '18;border:1px solid ' + color + '44',
      'color:' + color + ';border-radius:10px;padding:12px 16px',
      'font-family:Inter,system-ui;font-size:12px;font-weight:600;max-width:300px'
    ].join(';');
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(function() { if (n.parentNode) n.remove(); }, 5000);
  }

  function _showRevoked(reason) {
    if (document.getElementById('_ingly_revoked_p1')) return;
    var d = document.createElement('div');
    d.id = '_ingly_revoked_p1';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#09090b;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui';
    d.innerHTML = '<div style="text-align:center;max-width:420px;padding:40px">' +
      '<div style="font-size:56px;margin-bottom:20px">' + (reason==='banned' ? '\uD83D\uDEA8' : '\u26D4') + '</div>' +
      '<div style="font-size:22px;font-weight:900;color:#e8e8f0;margin-bottom:12px">Account ' + reason + '</div>' +
      '<div style="font-size:13px;color:#666">Contatta <strong>support@ingly.io</strong></div>' +
    '</div>';
    document.body.appendChild(d);
  }

  function _showExpired(d) {
    var gate = document.getElementById('saas-gate');
    if (!gate) return;
    gate.style.display = 'flex';
    var box = gate.querySelector('.gate-box');
    if (box) box.innerHTML =
      '<div style="text-align:center;padding:20px">' +
      '<div style="font-size:48px;margin-bottom:16px">\u23F0</div>' +
      '<div style="font-size:20px;font-weight:900;color:#e8e8f0;margin-bottom:8px">Licenza Scaduta</div>' +
      '<div style="font-size:12px;color:#888">Scaduta il ' +
        (d ? new Date(d).toLocaleDateString('it-IT') : '') +
      '<br>Contatta il tuo amministratore.</div>' +
      '</div>';
  }

  function _showPwdChanged() {
    if (document.getElementById('_ingly_pwd_p1')) return;
    var d = document.createElement('div');
    d.id = '_ingly_pwd_p1';
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000000cc;display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui';
    d.innerHTML =
      '<div style="background:#111115;border:1px solid #2a2a35;border-radius:18px;max-width:380px;width:100%;padding:32px;text-align:center">' +
      '<div style="font-size:48px;margin-bottom:16px">\uD83D\uDD12</div>' +
      '<div style="font-size:18px;font-weight:800;color:#e8e8f0;margin-bottom:8px">Password modificata</div>' +
      '<div style="font-size:12px;color:#888;line-height:1.7;margin-bottom:20px">La tua password è stata aggiornata.<br>Disconnessione in 3 secondi.</div>' +
      '<div style="height:4px;background:#1e1e2e;border-radius:99px;overflow:hidden">' +
        '<div style="height:100%;background:#6366f1;animation:_pw3s 3s linear forwards"></div>' +
      '</div></div>';
    var st = document.createElement('style');
    st.textContent = '@keyframes _pw3s{from{width:100%}to{width:0%}}';
    document.head.appendChild(st);
    document.body.appendChild(d);
    setTimeout(function() {
      if (window.SaaSGate && window.SaaSGate.logout) SaaSGate.logout();
    }, 3000);
  }

  /* ── INIT ─────────────────────────────────────────────────── */
  function init() {
    var waited = 0;
    var iv = setInterval(function() {
      waited++;
      if (waited > 80) { clearInterval(iv); return; }
      if (!window.SaaSGate || !window.SaaSGate._v4patched) return;
      clearInterval(iv);

      if (window.SaaSGate._p1patched) return;
      window.SaaSGate._p1patched = true;

      /* Hook into _applySession to start real-time sync after login */
      var origApply = window.SaaSGate._applySession.bind(window.SaaSGate);
      window.SaaSGate._applySession = function() {
        origApply();
        var s = window.SaaSGate._session;
        if (!s) return;

        /* Start Supabase Realtime */
        startRealtimeSync(s);

        /* P3: inject after login */
        setTimeout(function() {
          injectThemeToggle();
          injectExportWatermark();
          injectPWAManifest();
          initDarkMode();
        }, 300);
      };

      /* Hook logout to stop sync */
      var origLogout = window.SaaSGate.logout.bind(window.SaaSGate);
      window.SaaSGate.logout = function() {
        stopSync();
        origLogout();
      };

      /* If already logged in */
      var s = window.SaaSGate._session;
      if (s) {
        startRealtimeSync(s);
        setTimeout(function() {
          injectThemeToggle();
          injectExportWatermark();
          injectPWAManifest();
          initDarkMode();
        }, 500);
      }

    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Expose for Admin Panel integration */
  window.InglySaaSPlatform = {
    syncModulesToCloud: syncModulesToCloud,
    applyCloudUpdate:   applyCloudUpdate,
    startRealtimeSync:  startRealtimeSync,
    stopSync:           stopSync
  };

})();


/* === INGLY ENTERPRISE HEADER v1.0 === */
/* ══════════════════════════════════════════════════════════════
   INGLY OS v35 — ENTERPRISE HEADER v1.0
   Fix overlap + nuovo header professionale + White Label Engine
   ══════════════════════════════════════════════════════════════
   STRUTTURA:
   [LOGO+NOME+PIANO] [BREADCRUMB] [CERCA] [NOTIFICHE][PROFILO]
   TUTTO dentro il saas-session-bar esistente (no DOM conflict)
   ══════════════════════════════════════════════════════════════ */
(function EnterpriseHeader() {
  'use strict';

  /* ── WHITE LABEL CONFIG ─────────────────────────────────── */
  var WL = (function loadWL() {
    try {
      return JSON.parse(localStorage.getItem('ingly_white_label') || '{}');
    } catch(e) { return {}; }
  })();

  function saveWL(data) {
    Object.assign(WL, data);
    localStorage.setItem('ingly_white_label', JSON.stringify(WL));
    _applyWhiteLabel();
  }

  function _applyWhiteLabel() {
    /* Logo */
    var logoImg = document.getElementById('_eh_logo_img');
    if (logoImg) {
      if (WL.logo) {
        logoImg.src   = WL.logo;
        logoImg.style.display = 'block';
      }
    }
    /* Company name */
    var nameEl = document.getElementById('_eh_company_name');
    if (nameEl && WL.companyName) nameEl.textContent = WL.companyName;
    /* Brand color — lo applica InglyTema, che sa derivarne gli otto token e
       misurarne il contrasto. Qui restava una scrittura diretta di
       `--eh-brand`: due sistemi che cambiavano lo stesso colore senza
       sapersi, e il risultato dipendeva da chi scriveva per ultimo. */
    if (WL.brandColor) {
      if (window.InglyTema) window.InglyTema.salva({ accento: WL.brandColor });
      else document.documentElement.style.setProperty('--eh-brand', WL.brandColor);
      var bar = document.getElementById('_eh_bar');
      if (bar) bar.style.background = 'var(--eh-brand)';
    }
    /* Favicon */
    if (WL.favicon) {
      var link = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.rel  = 'icon';
      link.href = WL.favicon;
      document.head.appendChild(link);
    }
  }

  /* Expose for Admin Panel / Settings */
  window.InglyWhiteLabel = {
    save: saveWL,
    get:  function() { return WL; },
    reset: function() {
      localStorage.removeItem('ingly_white_label');
      WL = {};
      _applyWhiteLabel();
    }
  };

  /* ── CSS ─────────────────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById('_eh_css')) return;
    var css = document.createElement('style');
    css.id  = '_eh_css';
    css.textContent = `
/* ── Enterprise Header Bar ── */
#saas-session-bar {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  height: 44px !important;
  z-index: 9998 !important;
  background: var(--eh-brand, linear-gradient(90deg,#18181f 0%,#1e1e2e 100%)) !important;
  border-bottom: 1px solid rgba(99,102,241,.25) !important;
  display: none;
  align-items: center !important;
  padding: 0 16px !important;
  gap: 0 !important;
  font-family: 'Inter', system-ui, sans-serif !important;
  font-size: 12px !important;
  color: rgba(255,255,255,.85) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* Push INGLY topbar + sidebar down */
/* LAYOUT FIX: body is display:flex column, use padding-top */
body.saas-active {
  padding-top: 44px !important;
}
body.saas-active #topbar {
  top: auto !important;
}
body.saas-active #sidebar {
  top: auto !important;
  height: auto !important;
}
body.saas-active #app-content,
body.saas-active .app-content,
body.saas-active main {
  margin-top: 0 !important;
}

/* ── Header sections ── */
._eh-left   { display:flex;align-items:center;gap:10px;min-width:200px; }
._eh-center { display:flex;align-items:center;gap:8px;flex:1;justify-content:center; }
._eh-right  { display:flex;align-items:center;gap:6px;margin-left:auto; }

/* Logo */
._eh-logo {
  width: 28px; height: 28px; border-radius: 7px;
  object-fit: cover; display: none;
}
._eh-brand-name {
  font-size: 13px; font-weight: 800; color: #e8e8f0;
  letter-spacing: -.02em; white-space: nowrap;
}
._eh-plan-badge {
  font-size: 9px; font-weight: 800; letter-spacing: .06em;
  padding: 2px 8px; border-radius: 99px;
  background: rgba(99,102,241,.25); color: #818cf8;
  border: 1px solid rgba(99,102,241,.35); white-space: nowrap;
  text-transform: uppercase;
}
._eh-plan-badge.enterprise { background:rgba(168,85,247,.25);color:#c084fc;border-color:rgba(168,85,247,.35); }
._eh-plan-badge.business   { background:rgba(245,158,11,.2);color:#fbbf24;border-color:rgba(245,158,11,.3); }
._eh-plan-badge.pro        { background:rgba(99,102,241,.25);color:#818cf8;border-color:rgba(99,102,241,.35); }
._eh-plan-badge.starter    { background:rgba(6,182,212,.2);color:#67e8f9;border-color:rgba(6,182,212,.3); }
._eh-plan-badge.lifetime   { background:rgba(16,185,129,.2);color:#6ee7b7;border-color:rgba(16,185,129,.3); }

/* Breadcrumb */
._eh-bread {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: rgba(255,255,255,.45); white-space: nowrap;
}
._eh-bread span { color: rgba(255,255,255,.7); }
._eh-bread .sep { color: rgba(255,255,255,.25); font-size: 10px; }

/* Search */
._eh-search {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px; padding: 4px 10px; cursor: pointer;
  transition: background .15s;
}
._eh-search:hover { background: rgba(255,255,255,.1); }
._eh-search span  { color: rgba(255,255,255,.35); font-size: 11px; }
._eh-search kbd   { font-size: 9px; color: rgba(255,255,255,.25); background: rgba(255,255,255,.08);
                    border-radius: 3px; padding: 1px 4px; font-family: inherit; }

/* Icon buttons */
._eh-icon-btn {
  width: 30px; height: 30px; border-radius: 7px; border: none;
  background: rgba(255,255,255,.06); color: rgba(255,255,255,.65);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  font-size: 13px; transition: background .15s; position: relative;
  font-family: inherit;
}
._eh-icon-btn:hover { background: rgba(255,255,255,.12); color: #fff; }
._eh-icon-btn .badge {
  position: absolute; top: -3px; right: -3px;
  width: 14px; height: 14px; border-radius: 50%; background: #ef4444;
  font-size: 8px; font-weight: 800; color: #fff;
  display: flex; align-items: center; justify-content: center;
  border: 1.5px solid var(--eh-brand, #18181f);
}

/* Profile chip */
._eh-profile {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px; padding: 3px 8px 3px 4px; cursor: pointer;
  transition: background .15s;
}
._eh-profile:hover { background: rgba(255,255,255,.12); }
._eh-avatar {
  width: 24px; height: 24px; border-radius: 6px;
  background: linear-gradient(135deg,#6366f1,#a855f7);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800; color: #fff; flex-shrink: 0;
  overflow: hidden;
}
._eh-username { font-size: 11px; font-weight: 600; color: rgba(255,255,255,.8); max-width: 100px;
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
._eh-logout {
  margin-left: 4px; padding: 3px 8px; border-radius: 5px;
  background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.25);
  color: #fca5a5; font-size: 10px; font-weight: 700; cursor: pointer;
  transition: background .15s; font-family: inherit;
}
._eh-logout:hover { background: rgba(239,68,68,.25); color: #fff; }

/* Expiry warning */
._eh-expiry {
  font-size: 10px; color: #fde68a; display: flex; align-items: center; gap: 4px;
}

/* Divider */
._eh-div {
  width: 1px; height: 20px; background: rgba(255,255,255,.1); margin: 0 4px;
}

/* License status dot */
._eh-status-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #10b981;
  box-shadow: 0 0 6px #10b981; flex-shrink: 0;
}
._eh-status-dot.warn  { background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }
._eh-status-dot.error { background: #ef4444; box-shadow: 0 0 6px #ef4444; }

/* Hide old bottom bar (redundant) */
#_ingly_bar { display: none !important; }

/* White label modal */
._wl-modal {
  position: fixed; inset: 0; z-index: 99999;
  background: rgba(0,0,0,.7); display: flex; align-items: center;
  justify-content: center; backdrop-filter: blur(4px);
}
._wl-box {
  background: #111115; border: 1px solid #2a2a35; border-radius: 16px;
  width: 480px; max-width: 95vw; padding: 24px; font-family: 'Inter',system-ui,sans-serif;
}
._wl-title { font-size: 16px; font-weight: 800; color: #e8e8f0; margin-bottom: 16px; }
._wl-group { margin-bottom: 12px; }
._wl-group label { display: block; font-size: 11px; font-weight: 600;
                   color: #888; margin-bottom: 4px; text-transform: uppercase; letter-spacing:.05em; }
._wl-group input[type="text"], ._wl-group input[type="color"] {
  width: 100%; padding: 8px 10px; background: #1a1a24; border: 1px solid #2a2a35;
  border-radius: 8px; color: #e8e8f0; font-size: 12px; font-family: inherit;
}
._wl-group input[type="color"] { height: 38px; padding: 2px 6px; cursor: pointer; }
._wl-btns { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }
._wl-btn  { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;
            font-size: 12px; font-weight: 700; font-family: inherit; }
._wl-btn.save   { background: #6366f1; color: #fff; }
._wl-btn.cancel { background: #1a1a24; color: #888; border: 1px solid #2a2a35; }
._wl-btn.reset  { background: rgba(239,68,68,.15); color: #fca5a5; border: 1px solid rgba(239,68,68,.2); }
    `;
    document.head.appendChild(css);
  }

  /* ── BUILD HEADER HTML ────────────────────────────────────── */
  function buildHeader(session) {
    var plan = (session.plan || 'starter').toLowerCase();
    var planLabel = { starter:'Starter', pro:'Pro', business:'Business', enterprise:'Enterprise', lifetime:'Lifetime' }[plan] || plan.toUpperCase();
    var labName  = session.labName || session.username || 'INGLY OS';
    var username = session.username || '';
    var initials = (labName || username).substring(0,2).toUpperCase().replace(/[^A-Z]/g,'') || 'IN';

    var days = null;
    var dotClass = '_eh-status-dot';
    var expiryHtml = '';
    if (session.expiresAt && plan !== 'lifetime') {
      days = Math.ceil((new Date(session.expiresAt) - new Date()) / 86400000);
      if (days <= 7) {
        dotClass += ' warn';
        expiryHtml = '<span class="_eh-expiry">&#9201; ' + days + 'gg</span>';
      } else if (days < 0) {
        dotClass += ' error';
        expiryHtml = '<span class="_eh-expiry" style="color:#fca5a5">Scaduta</span>';
      }
    }

    var wl = WL;
    var companyName = wl.companyName || labName;

    return (
      /* LEFT */
      '<div class="_eh-left">' +
        '<div class="_eh-status-dot ' + (days && days < 0 ? 'error' : days && days <= 7 ? 'warn' : '') + '"></div>' +
        (wl.logo ? '<img id="_eh_logo_img" class="_eh-logo" src="' + wl.logo + '" style="display:block">' :
                   '<img id="_eh_logo_img" class="_eh-logo">') +
        '<span id="_eh_company_name" class="_eh-brand-name">' + companyName + '</span>' +
        '<span class="_eh-plan-badge ' + plan + '" id="ssb-plan">' + planLabel + '</span>' +
        expiryHtml +
        '<span id="ssb-exp"></span>' +
      '</div>' +

      /* CENTER */
      '<div class="_eh-center">' +
        '<div class="_eh-bread" id="_eh_bread">' +
          '<span>INGLY OS</span>' +
          '<span class="sep">›</span>' +
          '<span id="_eh_bread_current">Dashboard</span>' +
        '</div>' +
        '<div class="_eh-div"></div>' +
        '<div class="_eh-search" onclick="_ehOpenSearch()">' +
          '<span>&#128269;</span>' +
          '<span>Cerca...</span>' +
          '<kbd>&#8984;K</kbd>' +
        '</div>' +
      '</div>' +

      /* RIGHT */
      '<div class="_eh-right">' +
        '<button class="_eh-icon-btn" onclick="_ehOpenNotifications()" title="Notifiche" id="_eh_notif_btn">' +
          '&#128276;' +
          '<span class="badge" id="_eh_notif_count" style="display:none">0</span>' +
        '</button>' +
        '<button class="_eh-icon-btn" title="Impostazioni" onclick="_ehOpenSettings()">' +
          '&#9881;' +
        '</button>' +
        '<button class="_eh-icon-btn" title="White Label" onclick="_ehOpenWhiteLabel()">' +
          '&#127912;' +
        '</button>' +
        '<div class="_eh-div"></div>' +
        '<div class="_eh-profile" onclick="_ehOpenProfile()">' +
          '<div class="_eh-avatar" id="_eh_avatar">' + initials + '</div>' +
          '<span class="_eh-username" id="ssb-lab">' + (username || labName) + '</span>' +
        '</div>' +
        '<button class="_eh-logout" onclick="SaaSGate.logout()">&#8617; Esci</button>' +
      '</div>'
    );
  }

  /* ── WHITE LABEL MODAL ────────────────────────────────────── */
  window._ehOpenWhiteLabel = function() {
    if (document.getElementById('_wl_modal')) return;
    var wl = WL;
    var modal = document.createElement('div');
    modal.id  = '_wl_modal';
    modal.className = '_wl-modal';
    modal.innerHTML =
      '<div class="_wl-box">' +
        '<div class="_wl-title">&#127912; White Label Engine</div>' +
        '<div class="_wl-group"><label>Nome azienda / laboratorio</label>' +
          '<input type="text" id="_wl_company" value="' + (wl.companyName||'') + '" placeholder="es: Studio Creativo Bianchi"></div>' +
        '<div class="_wl-group"><label>Logo URL o Base64 (opzionale)</label>' +
          '<input type="text" id="_wl_logo" value="' + (wl.logo||'') + '" placeholder="https://... o data:image/..."></div>' +
        '<div class="_wl-group"><label>Colore brand (header)</label>' +
          '<input type="color" id="_wl_color" value="' + (wl.brandColor||'#18181f') + '"></div>' +
        '<div class="_wl-group"><label>Favicon URL (opzionale)</label>' +
          '<input type="text" id="_wl_favicon" value="' + (wl.favicon||'') + '" placeholder="https://..."></div>' +
        /* Tema, carattere e dimensione stanno in Aspetto: qui si sceglie
           l'identità (nome, logo, colore del brand), là come si vede. */
        '<div class="_wl-group" style="border-top:1px solid #2a2a35;padding-top:12px">' +
          '<button type="button" onclick="document.getElementById(\'_wl_modal\').remove();window.InglyAspetto&&InglyAspetto.apri()" ' +
          'style="width:100%;padding:9px;border-radius:9px;border:1px solid #2a2a35;background:transparent;color:#94a3b8;cursor:pointer;font-size:12px;font-weight:700">' +
          '🎨 Tema, carattere e dimensione…</button></div>' +
        '<div style="font-size:10px;color:#555;margin-bottom:12px">Per il logo, trascina un\'immagine su <a href="https://www.base64-image.de" target="_blank" style="color:#6366f1">base64-image.de</a> e incolla il risultato</div>' +
        '<div class="_wl-btns">' +
          '<button class="_wl-btn reset" onclick="_ehResetWL()">&#9851; Reset</button>' +
          '<button class="_wl-btn cancel" onclick="document.getElementById(\'_wl_modal\').remove()">Annulla</button>' +
          '<button class="_wl-btn save" onclick="_ehSaveWL()">&#10003; Applica</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.remove();
    });
  };

  window._ehSaveWL = function() {
    saveWL({
      companyName: (document.getElementById('_wl_company')||{value:''}).value.trim(),
      logo:        (document.getElementById('_wl_logo')||{value:''}).value.trim(),
      brandColor:  (document.getElementById('_wl_color')||{value:'#18181f'}).value,
      favicon:     (document.getElementById('_wl_favicon')||{value:''}).value.trim()
    });
    document.getElementById('_wl_modal') && document.getElementById('_wl_modal').remove();
    /* Show feedback */
    var n = document.createElement('div');
    n.style.cssText = 'position:fixed;top:54px;right:20px;z-index:99999;background:#10b98118;border:1px solid #10b98144;color:#34d399;border-radius:10px;padding:10px 16px;font-size:12px;font-weight:600;font-family:Inter,system-ui';
    n.textContent = '✓ White label applicato';
    document.body.appendChild(n);
    setTimeout(function(){ n.remove(); }, 3000);
  };

  window._ehResetWL = function() {
    if (!confirm('Ripristinare il branding predefinito?')) return;
    InglyWhiteLabel.reset();
    document.getElementById('_wl_modal') && document.getElementById('_wl_modal').remove();
  };

  /* ── BREADCRUMB UPDATE ────────────────────────────────────── */
  function updateBreadcrumb(pageName) {
    var el = document.getElementById('_eh_bread_current');
    if (el) el.textContent = pageName || 'Dashboard';
  }

  /* ── NOTIFICATIONS PANEL ──────────────────────────────────── */
  window._ehOpenNotifications = function() {
    var existing = document.getElementById('_eh_notif_panel');
    if (existing) { existing.remove(); return; }
    var panel = document.createElement('div');
    panel.id  = '_eh_notif_panel';
    panel.style.cssText = [
      'position:fixed;top:52px;right:12px;width:300px;max-height:400px',
      'background:#111115;border:1px solid #2a2a35;border-radius:12px',
      'z-index:99990;overflow-y:auto;box-shadow:0 12px 40px #00000088',
      'font-family:Inter,system-ui;font-size:12px'
    ].join(';');

    /* Read notifications from localStorage */
    var db = {};
    try { db = JSON.parse(localStorage.getItem('ingly_saas_db')||'{}'); } catch(e) {}
    var notifs = (db.notifications||[]).filter(function(n) {
      var s = window.SaaSGate && window.SaaSGate._session;
      return s && n.userId === s.userId;
    }).slice(-10).reverse();

    var rows = notifs.length
      ? notifs.map(function(n) {
          var icon = {email:'✉',inapp:'🔔',whatsapp:'💬',system:'⚙'}[n.type]||'🔔';
          var time = n.sentAt ? new Date(n.sentAt).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}) : '';
          return '<div style="padding:10px 14px;border-bottom:1px solid #1e1e2e">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">' +
              '<span style="font-weight:700;color:#e8e8f0">' + icon + ' ' + (n.title||n.message||'Notifica') + '</span>' +
              '<span style="font-size:10px;color:#555">' + time + '</span>' +
            '</div>' +
            (n.message && n.title ? '<div style="color:#666;font-size:11px">' + n.message.slice(0,60) + '</div>' : '') +
          '</div>';
        }).join('')
      : '<div style="padding:24px;text-align:center;color:#555">&#128276; Nessuna notifica</div>';

    panel.innerHTML =
      '<div style="padding:10px 14px;border-bottom:1px solid #2a2a35;display:flex;align-items:center;justify-content:space-between">' +
        '<span style="font-weight:700;color:#e8e8f0">Notifiche</span>' +
        '<button onclick="document.getElementById(\'_eh_notif_panel\').remove()" style="background:none;border:none;color:#555;cursor:pointer;font-size:15px">×</button>' +
      '</div>' + rows;
    document.body.appendChild(panel);
    /* Close on outside click */
    setTimeout(function() {
      document.addEventListener('click', function closePanel(e) {
        if (!panel.contains(e.target) && e.target.id !== '_eh_notif_btn') {
          panel.remove(); document.removeEventListener('click', closePanel);
        }
      });
    }, 100);
  };

  /* ── SEARCH SHORTCUT ──────────────────────────────────────── */
  window._ehOpenSearch = function() {
    /* Delegate to existing GlobalSearch if available */
    if (window.GlobalSearch && typeof GlobalSearch.open === 'function') {
      GlobalSearch.open();
    } else {
      /* Fallback: focus existing search if present */
      var s = document.getElementById('nav-search-input') ||
              document.querySelector('input[placeholder*="erca"]');
      if (s) { s.focus(); s.select(); }
    }
  };

  window._ehOpenSettings = function() {
    if (typeof App !== 'undefined' && App.navigate) App.navigate('settings');
  };

  window._ehOpenProfile = function() {
    if (typeof App !== 'undefined' && App.navigate) App.navigate('settings');
  };

  /* Keyboard shortcut Cmd/Ctrl+K → search */
  document.addEventListener('keydown', function(e) {
    if (false) {   /* Ctrl+K ritirato: lo registra la palette consolidata */
      e.preventDefault(); window._ehOpenSearch();
    }
  });

  /* ── HOOK INTO navigate to update breadcrumb ─────────────── */
  function hookNavigate() {
    if (!window.App || !App.navigate) return;
    var orig = App.navigate.bind(App);
    App.navigate = function(section) {
      orig(section);
      setTimeout(function() {
        var label = section
          .replace(/_/g,' ')
          .replace(/-/g,' ')
          .replace(/\b\w/g, function(c){ return c.toUpperCase(); });
        updateBreadcrumb(label);
      }, 100);
    };
  }

  /* ── NOTIFICATION BADGE ───────────────────────────────────── */
  function updateNotifBadge() {
    try {
      var db = JSON.parse(localStorage.getItem('ingly_saas_db')||'{}');
      var s  = window.SaaSGate && window.SaaSGate._session;
      if (!s) return;
      var unread = (db.notifications||[]).filter(function(n) {
        return n.userId === s.userId && !n.read;
      }).length;
      var badge = document.getElementById('_eh_notif_count');
      if (badge) {
        badge.textContent = unread > 9 ? '9+' : String(unread);
        badge.style.display = unread > 0 ? 'flex' : 'none';
      }
    } catch(e) {}
  }

  /* ── INIT ─────────────────────────────────────────────────── */
  function init() {
    /* Wait for SaaSGate to be ready */
    var tries = 0;
    var iv = setInterval(function() {
      tries++;
      if (tries > 120) { clearInterval(iv); return; }
      if (!window.SaaSGate || !window.SaaSGate._v4patched) return;
      if (window.SaaSGate._ehPatched) return;
      clearInterval(iv);
      window.SaaSGate._ehPatched = true;

      /* Inject CSS now (before session) */
      injectCSS();

      /* Hook _applySession to rebuild header with real session data */
      var origApply = window.SaaSGate._applySession.bind(window.SaaSGate);
      window.SaaSGate._applySession = function() {
        origApply();
        var session = window.SaaSGate._session;
        if (!session) return;

        /* Rebuild session bar with enterprise header */
        var bar = document.getElementById('saas-session-bar');
        if (bar) {
          bar.innerHTML = buildHeader(session);
          bar.style.display = 'flex';
        }

        /* Apply white label */
        _applyWhiteLabel();

        /* Hook navigate for breadcrumb */
        setTimeout(hookNavigate, 500);

        /* Start notification badge polling */
        setInterval(updateNotifBadge, 10000);
        updateNotifBadge();
      };

      /* If already logged in (session exists) */
      var s = window.SaaSGate._session;
      if (s) {
        injectCSS();
        var bar = document.getElementById('saas-session-bar');
        if (bar) {
          bar.innerHTML = buildHeader(s);
          bar.style.display = 'flex';
        }
        _applyWhiteLabel();
        setTimeout(hookNavigate, 500);
        setInterval(updateNotifBadge, 10000);
        updateNotifBadge();
      }

    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();


/* === INGLY P1/P2/P3 v2.0 === */
/* ══════════════════════════════════════════════════════════════
   INGLY OS v35 — P1/P2/P3 IMPLEMENTATION v2.0
   P1: Email transazionali (EmailJS) + Dark/Light mode fix
   P2: Dashboard KPI da Supabase + 2FA TOTP Admin
   P3: PWA installabile + White Label avanzato
   ══════════════════════════════════════════════════════════════ */
(function InglySaaSPlatformV2() {
  'use strict';

  // OPT-IN offline-first: nessuna credenziale hardcoded (vedi nota SyncEngine).
  // Cloud sync attivo solo se l'utente inserisce le proprie credenziali Supabase.
  var SB_URL = localStorage.getItem('ingly_supabase_url') || '';
  var SB_KEY = localStorage.getItem('ingly_supabase_anon_key') || '';

  /* ─── P1: DARK / LIGHT MODE (visibile nella UI) ─────────── */
  function initDarkMode() {
    var saved = localStorage.getItem('ingly_color_scheme');
    // Vedi sopra: `prefersDark !== false` intendeva "scuro salvo diversa
    // indicazione", ma con matchMedia che risponde `false` dava chiaro.
    var isDark = saved ? saved === 'dark' : true;
    applyTheme(isDark, false);
  }

  function applyTheme(dark, animate) {
    if (animate) {
      document.documentElement.style.transition = 'background .3s, color .3s';
      setTimeout(function(){ document.documentElement.style.transition = ''; }, 400);
    }
    if (dark) {
      document.documentElement.removeAttribute('data-color-scheme');
    } else {
      document.documentElement.setAttribute('data-color-scheme', 'light');
      /* Inject light mode overrides if not present */
      if (!document.getElementById('_light_css')) {
        var s = document.createElement('style');
        s.id  = '_light_css';
        s.textContent = [
          '[data-color-scheme="light"]{--bg-body:#f4f4f8;--bg-card:#ffffff;--bg-card2:#f8f8fc;--bg-card3:#f0f0f6;',
          '--text:#1a1a2e;--text-muted:#666680;--border:#e0e0ec;--border-light:#ebebf5}',
          '[data-color-scheme="light"] #topbar{background:#fff;border-color:#e0e0ec}',
          '[data-color-scheme="light"] #sidebar{background:#fff;border-color:#e0e0ec}',
          '[data-color-scheme="light"] #saas-session-bar{background:linear-gradient(90deg,#4f46e5,#6366f1)!important}',
          '[data-color-scheme="light"] ._eh-search{background:rgba(0,0,0,.06);border-color:rgba(0,0,0,.1)}',
          '[data-color-scheme="light"] ._eh-icon-btn{background:rgba(0,0,0,.06);color:rgba(0,0,0,.6)}',
          '[data-color-scheme="light"] ._eh-profile{background:rgba(0,0,0,.06);border-color:rgba(0,0,0,.1)}',
        ].join('');
        document.head.appendChild(s);
      }
    }
    localStorage.setItem('ingly_color_scheme', dark ? 'dark' : 'light');
    /* Update toggle button icon */
    var btn = document.getElementById('_theme_toggle_btn');
    if (btn) btn.innerHTML = dark ? '\u2600\uFE0F' : '\uD83C\uDF19';
    btn && (btn.title = dark ? 'Passa a modalità chiara' : 'Passa a modalità scura');
  }

  window._inglyToggleTheme = function() {
    var current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'light', true);
  };

  function injectThemeToggleInTopbar() {
    if (document.getElementById('_theme_toggle_btn')) return;
    /* Insert into INGLY topbar, before the last button group */
    var topbar = document.getElementById('topbar');
    if (!topbar) return;
    var btn = document.createElement('button');
    btn.id        = '_theme_toggle_btn';
    btn.className = 'topbar-btn';
    btn.title     = 'Toggle tema';
    btn.innerHTML = '\u2600\uFE0F';
    btn.onclick   = window._inglyToggleTheme;
    btn.style.cssText = 'font-size:15px;opacity:.7;transition:opacity .15s;cursor:pointer;background:none;border:none;padding:4px 6px;border-radius:6px;';
    btn.onmouseenter = function(){ this.style.opacity='1'; };
    btn.onmouseleave = function(){ this.style.opacity='.7'; };
    topbar.appendChild(btn);
  }

  /* ─── P1: EMAIL TRANSAZIONALI (EmailJS) ─────────────────── */
  var EJS_CFG = (function() {
    try { return JSON.parse(localStorage.getItem('ingly_emailjs_cfg') || '{}'); }
    catch(e) { return {}; }
  })();

  function saveEmailJSConfig(cfg) {
    Object.assign(EJS_CFG, cfg);
    localStorage.setItem('ingly_emailjs_cfg', JSON.stringify(EJS_CFG));
  }

  function sendTransactionalEmail(to, name, type, vars) {
    if (!EJS_CFG.service_id || !EJS_CFG.template_id || !EJS_CFG.public_key) {
      console.warn('[INGLY] EmailJS non configurato');
      return Promise.resolve(false);
    }
    var templates = {
      welcome:  { subject:'Benvenuto su INGLY OS!', body:'Ciao {{name}}, il tuo account è pronto. Username: {{username}} Password: {{password}}' },
      reset_pwd:{ subject:'Password INGLY OS reimpostata', body:'Ciao {{name}}, la tua nuova password è: {{password}}' },
      expiry:   { subject:'La tua licenza INGLY OS scade presto', body:'Ciao {{name}}, la tua licenza scade il {{date}}. Rinnova ora per continuare.' },
      renewed:  { subject:'Licenza INGLY OS rinnovata', body:'Ciao {{name}}, la tua licenza è stata rinnovata fino al {{date}}.' },
      suspended:{ subject:'Account INGLY OS sospeso', body:'Ciao {{name}}, il tuo account è stato temporaneamente sospeso. Contatta il supporto.' },
    };
    var tpl = templates[type] || templates.welcome;
    var params = Object.assign({ to_email:to, to_name:name, subject:tpl.subject, message:tpl.body }, vars);
    return fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:      EJS_CFG.service_id,
        template_id:     EJS_CFG.template_id,
        user_id:         EJS_CFG.public_key,
        template_params: params
      })
    }).then(function(r) { return r.ok; }).catch(function() { return false; });
  }

  window.InglyEmail = {
    configure: saveEmailJSConfig,
    send: sendTransactionalEmail,
    welcome:  function(to, name, user, pwd) { return sendTransactionalEmail(to, name, 'welcome', {username:user, password:pwd}); },
    resetPwd: function(to, name, pwd)       { return sendTransactionalEmail(to, name, 'reset_pwd', {password:pwd}); },
    expiry:   function(to, name, date)      { return sendTransactionalEmail(to, name, 'expiry', {date:date}); },
    renewed:  function(to, name, date)      { return sendTransactionalEmail(to, name, 'renewed', {date:date}); },
    suspended:function(to, name)            { return sendTransactionalEmail(to, name, 'suspended', {}); },
  };

  /* ─── P2: DASHBOARD KPI DA SUPABASE ─────────────────────── */
  function fetchKPIsFromSupabase() {
    if (!SB_URL || !SB_KEY) return Promise.resolve(null);
    return fetch(SB_URL.replace(/\/$/,'') + '/rest/v1/ingly_users?select=id,plan_id,status,created_at,expires_at', {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    }).then(function(r) {
      if (!r.ok) return null;
      return r.json().then(function(users) {
        if (!users || !users.length) return null;
        var now = new Date();
        var MRR_MAP = { starter:19, pro:49, business:99, enterprise:199 };
        var active    = users.filter(function(u) { return u.status === 'active' || u.status === 'trial'; });
        var expired   = users.filter(function(u) { return u.expires_at && new Date(u.expires_at) < now; });
        var expiring7 = users.filter(function(u) {
          if (!u.expires_at) return false;
          var d = (new Date(u.expires_at) - now) / 86400000;
          return d >= 0 && d <= 7;
        });
        var mrr = active.reduce(function(s, u) { return s + (MRR_MAP[u.plan_id]||0); }, 0);
        var arr = mrr * 12;
        var thisMonth = now.toISOString().slice(0,7);
        var newThisMonth = users.filter(function(u) {
          return u.created_at && u.created_at.startsWith(thisMonth);
        }).length;
        var byPlan = {};
        users.forEach(function(u) {
          var p = u.plan_id || 'starter';
          byPlan[p] = (byPlan[p]||0) + 1;
        });
        return {
          total: users.length, active: active.length,
          expired: expired.length, expiring7: expiring7.length,
          mrr: mrr, arr: arr, newThisMonth: newThisMonth,
          byPlan: byPlan, churnRate: users.length > 0 ? Math.round(expired.length/users.length*100) : 0,
          source: 'supabase', fetchedAt: now.toISOString()
        };
      });
    }).catch(function() { return null; });
  }

  window.InglyKPIs = {
    fetch: fetchKPIsFromSupabase,
    getLast: function() {
      try { return JSON.parse(sessionStorage.getItem('ingly_kpis') || 'null'); } catch(e) { return null; }
    },
    refresh: function() {
      return fetchKPIsFromSupabase().then(function(kpis) {
        if (kpis) sessionStorage.setItem('ingly_kpis', JSON.stringify(kpis));
        return kpis;
      });
    }
  };

  /* ─── P3: PWA SERVICE WORKER (inline) ─────────────────────── */
  function registerPWA() {
    if (!('serviceWorker' in navigator)) return;
    if (document.getElementById('_pwa_sw_reg')) return;
    /* Inline SW as blob — caches static assets */
    var swCode = [
      "const CACHE='ingly-v35-1';",
      "const ASSETS=['./'];",
      "self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));",
      "self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))));"
    ].join('\n');
    var blob = new Blob([swCode], { type: 'application/javascript' });
    var swUrl = URL.createObjectURL(blob);
    navigator.serviceWorker.register(swUrl, { scope: './' })
      .then(function() { console.log('[INGLY] PWA ServiceWorker registered'); })
      .catch(function() {});
    var marker = document.createElement('meta');
    marker.id   = '_pwa_sw_reg';
    marker.name = 'pwa-registered';
    document.head.appendChild(marker);
  }

  /* ─── P3: PWA INSTALL PROMPT ─────────────────────────────── */
  var _pwaInstallEvent = null;
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    _pwaInstallEvent = e;
    /* Show install button if not already installed */
    setTimeout(showPWAInstallBanner, 3000);
  });

  function showPWAInstallBanner() {
    if (document.getElementById('_pwa_banner')) return;
    if (!_pwaInstallEvent) return;
    var banner = document.createElement('div');
    banner.id  = '_pwa_banner';
    banner.style.cssText = [
      'position:fixed;bottom:30px;left:50%;transform:translateX(-50%)',
      'background:#111115;border:1px solid #2a2a35;border-radius:12px',
      'padding:12px 16px;z-index:99990;display:flex;align-items:center;gap:12px',
      'font-family:Inter,system-ui;font-size:12px;color:#e8e8f0',
      'box-shadow:0 8px 32px rgba(0,0,0,.5)'
    ].join(';');
    banner.innerHTML =
      '<span style="font-size:20px">&#127912;</span>' +
      '<div><div style="font-weight:700">Installa INGLY OS</div>' +
        '<div style="color:#888;font-size:11px">Accesso rapido dal desktop</div></div>' +
      '<button onclick="_inglyInstallPWA()" style="background:#6366f1;color:#fff;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-weight:700;font-family:inherit;font-size:12px">Installa</button>' +
      '<button onclick="document.getElementById(\'_pwa_banner\').remove()" style="background:none;border:none;color:#555;cursor:pointer;font-size:18px">&#215;</button>';
    document.body.appendChild(banner);
  }

  window._inglyInstallPWA = function() {
    if (!_pwaInstallEvent) return;
    _pwaInstallEvent.prompt();
    _pwaInstallEvent.userChoice.then(function() {
      _pwaInstallEvent = null;
      var b = document.getElementById('_pwa_banner');
      if (b) b.remove();
    });
  };

  /* ─── INIT ─────────────────────────────────────────────────── */
  function init() {
    var tries = 0;
    var iv = setInterval(function() {
      tries++;
      if (tries > 100) { clearInterval(iv); return; }
      if (!window.SaaSGate || !window.SaaSGate._v4patched) return;
      if (window._p2v2inited) return;
      clearInterval(iv);
      window._p2v2inited = true;

      /* Apply saved theme immediately */
      initDarkMode();

      /* Register PWA */
      registerPWA();

      /* Hook _applySession to inject theme toggle */
      var origApply = window.SaaSGate._applySession.bind(window.SaaSGate);
      window.SaaSGate._applySession = function() {
        origApply();
        setTimeout(injectThemeToggleInTopbar, 600);
        /* Pre-fetch KPIs in background */
        if (window.InglyKPIs) InglyKPIs.refresh();
      };

      /* If already logged in */
      if (window.SaaSGate._session) {
        setTimeout(injectThemeToggleInTopbar, 600);
        if (window.InglyKPIs) InglyKPIs.refresh();
      }

    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[INGLY P2 v2] Loaded: Email + KPI + PWA + DarkMode');
})();


/* === INGLY SINGLE DEVICE ENFORCEMENT v3.0 === */
/* ══════════════════════════════════════════════════════════════
   FIX v3.0 — RISOLVE "Sessione revocata" al login fresco
   
   BUG v2: race condition — il check a 3s scattava PRIMA che
   registerSession() completasse, vedeva ancora token='REVOKED'
   e mostrava il modal. Ora:
   
   ✅ Flag _registering: nessun check durante registrazione
   ✅ Check iniziale spostato a 8s (dopo conferma registrazione)
   ✅ checkSession() ignora REVOKED se token è già il NOSTRO
   ✅ Modal 'revocato': bottone "Riaccedi qui" per re-registrare
   ✅ Se Supabase non configurato: login sempre libero
   ══════════════════════════════════════════════════════════════ */
(function SingleDeviceEnforcement() {
  'use strict';

  var SB_URL = localStorage.getItem('ingly_supabase_url') || '';
  var SB_KEY = localStorage.getItem('ingly_supabase_anon_key') || '';
  var _myToken      = null;
  var _pollTimer    = null;
  var _hbTimer      = null;
  var _kicked       = false;
  var _userId       = null;
  var _registering  = false;   /* ★ FIX: flag to block checks during registration */
  var _loginTime    = 0;       /* ★ FIX: timestamp of last login */

  var SESSION_TIMEOUT = 90 * 1000;
  var HEARTBEAT_MS    = 25 * 1000;
  var POLL_MS         = 30 * 1000;
  var INITIAL_CHECK_DELAY = 10 * 1000; /* ★ FIX: 10s instead of 3s, after registration */

  function sbOk() { return !!(SB_URL && SB_KEY); }
  function base() { return (SB_URL||'').replace(/\/$/, ''); }
  function sbH(x) {
    var h = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY };
    return x ? Object.assign(h, x) : h;
  }

  function getDeviceInfo() {
    var nav = window.navigator, scr = window.screen;
    var raw = [nav.userAgent||'', nav.language||'', (scr.width||0)+'x'+(scr.height||0)].join('|');
    var h = 0;
    for (var i = 0; i < raw.length; i++) h = Math.imul(31, h) + raw.charCodeAt(i) | 0;
    var ua = nav.userAgent;
    var browser = ua.indexOf('Chrome')>-1&&ua.indexOf('Edg')===-1?'Chrome':ua.indexOf('Firefox')>-1?'Firefox':ua.indexOf('Edg')>-1?'Edge':ua.indexOf('Safari')>-1?'Safari':'Browser';
    var os = ua.indexOf('Windows')>-1?'Windows':ua.indexOf('Mac')>-1?'macOS':ua.indexOf('Android')>-1?'Android':ua.indexOf('iPhone')>-1||ua.indexOf('iPad')>-1?'iOS':'Linux';
    return { fingerprint: Math.abs(h).toString(36), browser, os, loginAt: new Date().toISOString() };
  }

  function generateToken() {
    var arr = new Uint8Array(16);
    (window.crypto && window.crypto.getRandomValues) ? window.crypto.getRandomValues(arr) : arr.forEach(function(_,i){arr[i]=Math.floor(Math.random()*256);});
    return Array.from(arr).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
  }

  /* ── Register session ─────────────────────────────────────── */
  function registerSession(userId, username, token, dev) {
    if (!sbOk()) return Promise.resolve('no_sb');
    var row = {
      user_id: userId, username: username, token: token,
      device_fp: dev.fingerprint, browser: dev.browser, platform: dev.os,
      logged_in_at: dev.loginAt, last_seen: new Date().toISOString(), active: true
    };
    return fetch(base()+'/rest/v1/ingly_sessions', {
      method: 'POST',
      headers: sbH({'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=representation'}),
      body: JSON.stringify(row)
    }).then(function(r){ return r.ok ? 'ok' : 'error'; })
      .catch(function(){ return 'network_error'; });
  }

  /* ── ★ FIX: checkSession with race condition protection ───── */
  function checkSession(userId, myToken) {
    if (!sbOk()) return Promise.resolve('ok');
    /* ★ NEVER check while registration is in progress */
    if (_registering) return Promise.resolve('ok');
    return fetch(
      base()+'/rest/v1/ingly_sessions?select=token,active,browser,platform,last_seen&user_id=eq.'+userId+'&limit=1',
      { headers: sbH() }
    ).then(function(r) {
      if (!r.ok) return 'ok';
      return r.json().then(function(rows) {
        if (!rows || !rows.length) return 'ok';
        var row = rows[0];

        /* ★ FIX: If the stored token IS our token → always ok (race condition resolved) */
        if (row.token === myToken) return 'ok';

        /* ★ FIX: If REVOKED but we JUST logged in (<15s ago) → stale data, ignore */
        var timeSinceLogin = Date.now() - _loginTime;
        if (timeSinceLogin < 15000) return 'ok';

        /* Revoked by admin (real revocation) */
        if (!row.active || row.token === 'REVOKED') return 'revoked';

        /* Check for stale session (ghost) */
        if (row.last_seen) {
          var staleness = Date.now() - new Date(row.last_seen).getTime();
          if (staleness > SESSION_TIMEOUT) {
            _cleanupStale(userId);
            return 'ok';
          }
        }

        /* Real conflict: different active token */
        return 'conflict:'+(row.browser||'Browser')+'|'+(row.platform||'Unknown')+'|'+(row.last_seen||'');
      });
    }).catch(function(){ return 'ok'; }); /* Network errors → don't kick */
  }

  function _cleanupStale(userId) {
    if (!sbOk()) return;
    fetch(base()+'/rest/v1/ingly_sessions?user_id=eq.'+userId, {
      method:'PATCH', headers:sbH({'Content-Type':'application/json','Prefer':'return=minimal'}),
      body:JSON.stringify({active:false,logged_out_at:new Date().toISOString()})
    }).catch(function(){});
  }

  /* ── Heartbeat ────────────────────────────────────────────── */
  function sendHeartbeat(userId) {
    if (!sbOk() || !_myToken) return;
    fetch(base()+'/rest/v1/ingly_sessions?user_id=eq.'+userId, {
      method:'PATCH', headers:sbH({'Content-Type':'application/json','Prefer':'return=minimal'}),
      body:JSON.stringify({last_seen:new Date().toISOString()})
    }).catch(function(){});
    try { localStorage.setItem('_ingly_hb_'+userId, String(Date.now())); } catch(e){}
  }

  /* ── Revoke ───────────────────────────────────────────────── */
  function revokeSession(userId) {
    if (!sbOk() || !_myToken) return;
    var payload = JSON.stringify({active:false,token:'REVOKED',logged_out_at:new Date().toISOString()});
    var url = base()+'/rest/v1/ingly_sessions?user_id=eq.'+userId;
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url+'&apikey='+SB_KEY, new Blob([payload],{type:'application/json'}));
    } else {
      fetch(url,{method:'PATCH',headers:sbH({'Content-Type':'application/json','Prefer':'return=minimal'}),body:payload,keepalive:true}).catch(function(){});
    }
    try { localStorage.removeItem('_ingly_hb_'+userId); } catch(e){}
  }

  /* ── Polling (starts AFTER registration confirmed) ─────────── */
  function startPolling(session) {
    stopPolling();
    _userId = session.userId;

    _hbTimer = setInterval(function() {
      if (_kicked) return;
      sendHeartbeat(session.userId);
    }, HEARTBEAT_MS);

    _pollTimer = setInterval(function() {
      if (_kicked) return;
      checkSession(session.userId, _myToken).then(function(result) {
        if (result !== 'ok') handleConflict(result);
      });
    }, POLL_MS);

    /* ★ FIX: Initial check delayed to 10s, AFTER registration completes */
    setTimeout(function() {
      if (_kicked || _registering) return;
      checkSession(session.userId, _myToken).then(function(result) {
        if (result !== 'ok') handleConflict(result);
      });
    }, INITIAL_CHECK_DELAY);

    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible' && !_kicked) sendHeartbeat(session.userId);
    });

    window.addEventListener('beforeunload', function() {
      revokeSession(session.userId);
      stopPolling();
    });

    sendHeartbeat(session.userId);
  }

  function stopPolling() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    if (_hbTimer)   { clearInterval(_hbTimer);   _hbTimer   = null; }
  }

  function handleConflict(result) {
    if (_kicked) return;
    if (result === 'revoked') {
      showKickModal('revoked', null, null, null);
    } else if (result.startsWith('conflict:')) {
      var parts = result.split(':')[1].split('|');
      showKickModal('conflict', parts[0]||'Browser', parts[1]||'Unknown', parts[2]||null);
    }
  }

  /* ── ★ FIX: Kick Modal with "Riaccedi qui" for revoked ────── */
  function showKickModal(reason, otherBrowser, otherOS, otherLastSeen) {
    if (_kicked) return;
    _kicked = true;
    stopPolling();
    if (document.getElementById('_sde_modal')) return;

    var isRevoked  = reason === 'revoked';
    var isConflict = reason === 'conflict';
    var icon  = isRevoked ? '🔐' : '📱';
    var title = isRevoked ? 'Sessione scaduta' : 'Sessione aperta su altro dispositivo';
    var msg   = isRevoked
      ? 'La tua sessione precedente è stata terminata. Puoi rientrare immediatamente cliccando <strong>Accedi qui</strong>.'
      : 'Risulta una sessione attiva da <strong>'+(otherBrowser||'altro dispositivo')+'</strong>. Puoi prenderla tu o mantenerla.';

    var lastSeenText = '';
    if (otherLastSeen) {
      try {
        var diff = Math.floor((Date.now()-new Date(otherLastSeen).getTime())/1000);
        lastSeenText = diff<60?diff+'s fa':diff<3600?Math.floor(diff/60)+'m fa':Math.floor(diff/3600)+'h fa';
      } catch(e){}
    }

    var countDown = 30;
    var ov = document.createElement('div');
    ov.id = '_sde_modal';
    ov.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.88);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif';
    ov.innerHTML =
      '<div style="background:#111115;border:1px solid #2a2a35;border-radius:20px;max-width:440px;width:94%;padding:32px;text-align:center">'+
        '<div style="font-size:52px;margin-bottom:14px">'+icon+'</div>'+
        '<div style="font-size:19px;font-weight:900;color:#e8e8f0;margin-bottom:10px">'+title+'</div>'+
        '<div style="font-size:13px;color:#888;line-height:1.7;margin-bottom:'+(isConflict&&lastSeenText?'0':'16')+'px">'+msg+'</div>'+
        (isConflict&&(otherBrowser||otherOS)?
          '<div style="background:#1a1a2e;border:1px solid #2a2a45;border-radius:10px;padding:12px;margin:14px 0;text-align:left">'+
            '<div style="font-size:10px;color:#555;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Dispositivo attivo</div>'+
            (otherBrowser?'<div style="font-size:13px;color:#e8e8f0;margin-bottom:4px">🌐 '+otherBrowser+'</div>':'')+
            (otherOS?'<div style="font-size:12px;color:#888;margin-bottom:4px">💻 '+otherOS+'</div>':'')+
            (lastSeenText?'<div style="font-size:11px;color:#555">🕐 '+lastSeenText+'</div>':'')+
          '</div>':'')+
        '<div style="height:3px;background:#1e1e2e;border-radius:99px;overflow:hidden;margin-bottom:10px">'+
          '<div id="_sde_bar" style="height:100%;background:#6366f1;border-radius:99px;transition:width 1s linear;width:100%"></div>'+
        '</div>'+
        '<div style="font-size:11px;color:#555;margin-bottom:18px">Logout automatico tra <strong id="_sde_cnt" style="color:#fca5a5">'+countDown+'s</strong></div>'+
        '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">'+
          '<button id="_sde_takeover" style="background:#6366f1;color:#fff;border:none;border-radius:10px;padding:10px 22px;cursor:pointer;font-weight:700;font-size:13px;font-family:inherit">✅ Accedi qui</button>'+
          (isConflict?'<button id="_sde_keep" style="background:#1a1a2e;color:#888;border:1px solid #2a2a35;border-radius:10px;padding:10px 18px;cursor:pointer;font-size:13px;font-family:inherit">Mantieni altra sessione</button>':'')+
          '<button id="_sde_exit" style="background:transparent;color:#555;border:1px solid #2a2a35;border-radius:10px;padding:10px 16px;cursor:pointer;font-size:12px;font-family:inherit">Esci</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(ov);

    var timer = setInterval(function() {
      countDown--;
      var c=document.getElementById('_sde_cnt'), b=document.getElementById('_sde_bar');
      if(c) c.textContent=countDown+'s';
      if(b) b.style.width=(countDown/30*100)+'%';
      if(countDown<=0){clearInterval(timer); window._sdeLogoutNow();}
    }, 1000);

    /* "Accedi qui" — re-register this device */
    var btnTake = document.getElementById('_sde_takeover');
    if (btnTake) btnTake.addEventListener('click', function() {
      clearInterval(timer);
      window._sdeTakeOver();
    });

    /* "Mantieni altra sessione" */
    var btnKeep = document.getElementById('_sde_keep');
    if (btnKeep) btnKeep.addEventListener('click', function() {
      clearInterval(timer);
      ov.remove();
      _kicked = false; /* Allow them to keep using current tab without SDE */
      var n = document.createElement('div');
      n.style.cssText='position:fixed;top:54px;right:20px;z-index:99990;background:#f59e0b18;border:1px solid #f59e0b44;color:#f59e0b;border-radius:10px;padding:10px 16px;font-size:12px;font-weight:600;font-family:Inter,system-ui';
      n.textContent='⚠️ Modalità sola lettura — un altro dispositivo è master.';
      document.body.appendChild(n);
      setTimeout(function(){n.remove();},6000);
    });

    var btnExit = document.getElementById('_sde_exit');
    if (btnExit) btnExit.addEventListener('click', function() { clearInterval(timer); window._sdeLogoutNow(); });
  }

  /* ── Global helpers ──────────────────────────────────────── */
  window._sdeLogoutNow = function() {
    var s = window.SaaSGate && window.SaaSGate._session;
    if (s) revokeSession(s.userId);
    stopPolling();
    var m = document.getElementById('_sde_modal'); if(m)m.remove();
    if (window.SaaSGate && window.SaaSGate.logout) SaaSGate.logout();
    else location.reload();
  };

  window._sdeTakeOver = function() {
    var s = window.SaaSGate && window.SaaSGate._session;
    if (!s) { window._sdeLogoutNow(); return; }
    var m = document.getElementById('_sde_modal'); if(m)m.remove();
    _myToken = generateToken();
    _kicked  = false;
    _loginTime = Date.now();
    _registering = true;
    var dev = getDeviceInfo();
    registerSession(s.userId, s.username, _myToken, dev).then(function() {
      _registering = false;
      startPolling(s);
      var n=document.createElement('div');
      n.style.cssText='position:fixed;top:54px;right:20px;z-index:99990;background:#10b98118;border:1px solid #10b98144;color:#34d399;border-radius:10px;padding:10px 16px;font-size:12px;font-weight:600;font-family:Inter,system-ui';
      n.textContent='✅ Sessione attiva su questo dispositivo';
      document.body.appendChild(n);
      setTimeout(function(){n.remove();},4000);
    }).catch(function() { _registering = false; });
  };

  /* ── LocalStorage fallback ───────────────────────────────── */
  var LS_KEY = 'ingly_active_session';
  function registerLocal(userId, token, dev) {
    try { localStorage.setItem(LS_KEY+'_'+userId, JSON.stringify({token,device:dev.browser+' '+dev.os,ts:Date.now()})); } catch(e){}
  }
  function checkLocal(userId, myToken) {
    try {
      var s=JSON.parse(localStorage.getItem(LS_KEY+'_'+userId)||'null');
      if(!s) return 'ok';
      if(Date.now()-(s.ts||0)>SESSION_TIMEOUT){localStorage.removeItem(LS_KEY+'_'+userId);return 'ok';}
      if(s.token!==myToken) return 'conflict:'+s.device+'|Unknown|';
      return 'ok';
    } catch(e){return 'ok';}
  }
  function startLocalPolling(session) {
    stopPolling();
    _hbTimer = setInterval(function(){
      if(_kicked)return;
      try{var s=JSON.parse(localStorage.getItem(LS_KEY+'_'+session.userId)||'{}');s.ts=Date.now();localStorage.setItem(LS_KEY+'_'+session.userId,JSON.stringify(s));}catch(e){}
    },20000);
    _pollTimer = setInterval(function(){
      if(_kicked)return;
      var r=checkLocal(session.userId,_myToken);
      if(r!=='ok')handleConflict(r);
    },5000);
  }

  /* ── INIT ────────────────────────────────────────────────── */
  function init() {
    var tries=0, iv=setInterval(function(){
      tries++;
      if(tries>100){clearInterval(iv);return;}
      if(!window.SaaSGate||!window.SaaSGate._v4patched)return;
      if(window.SaaSGate._sdePatched)return;
      clearInterval(iv);
      window.SaaSGate._sdePatched=true;

      /* Hook _applySession */
      var origApply=window.SaaSGate._applySession.bind(window.SaaSGate);
      window.SaaSGate._applySession=function(){
        origApply();
        var s=window.SaaSGate._session;
        if(!s) return;
        _myToken=generateToken();
        _kicked=false;
        _userId=s.userId;
        _loginTime=Date.now(); /* ★ FIX: record login time */
        _registering=true;    /* ★ FIX: block checks during registration */
        try{
          var sd=JSON.parse(sessionStorage.getItem('ingly_saas_session')||'{}');
          sd._deviceToken=_myToken;
          sessionStorage.setItem('ingly_saas_session',JSON.stringify(sd));
        }catch(e){}
        var dev=getDeviceInfo();
        if(sbOk()){
          registerSession(s.userId,s.username,_myToken,dev).then(function(result){
            _registering=false; /* ★ FIX: allow checks only after registration */
            startPolling(s);
          }).catch(function(){
            _registering=false;
            startPolling(s);
          });
        } else {
          _registering=false;
          registerLocal(s.userId,_myToken,dev);
          startLocalPolling(s);
        }
      };

      /* Hook logout */
      var origLogout=window.SaaSGate.logout.bind(window.SaaSGate);
      window.SaaSGate.logout=function(){
        var s=window.SaaSGate._session;
        if(s){revokeSession(s.userId);try{localStorage.removeItem(LS_KEY+'_'+s.userId);}catch(e){}}
        stopPolling();
        origLogout();
      };

      /* Already logged in (page refresh) */
      var s=window.SaaSGate._session;
      if(s&&!_myToken){
        _myToken=generateToken();
        _userId=s.userId;
        _loginTime=Date.now();
        _registering=true;
        var dev=getDeviceInfo();
        if(sbOk()){
          registerSession(s.userId,s.username,_myToken,dev).then(function(){
            _registering=false;
            startPolling(s);
          }).catch(function(){_registering=false;});
        } else {
          _registering=false;
          registerLocal(s.userId,_myToken,dev);
          startLocalPolling(s);
        }
      }
    },250);
  }

  /* SDE disabled in standalone mode — re-enable for SaaS */
  // document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
  console.log('[SDE v3.0] DISABLED (standalone mode). Anti-ghost, race-condition-free session management loaded');
})();


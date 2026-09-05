
// === /src/utils/helpers.js ===
function debounce(fn, ms) {
  var t;
  return function() {
    var args = arguments;
    clearTimeout(t);
    t = setTimeout(function(){ fn.apply(this, args); }, ms || 200);
  };
}
// ── v4.1: Undo Delete System ─────────────────────────────────────────────────
const UndoStack = {
  _pending: null,
  _timer: null,

  // Schedule a delete with 3s undo window
  // deleteFn: async function that performs the actual delete
  // label: human-readable name for toast
  schedule(store, record, deleteFn, label, onUndoCb) {
    // Cancel any pending undo
    if (this._timer) {
      clearTimeout(this._timer);
      if (this._pending) this._pending.deleteFn(); // commit previous
    }
    this._pending = { store, record, deleteFn, label, onUndoCb };

    // Show undo toast
    const toastEl = document.createElement('div');
    toastEl.id = 'undo-toast';
    toastEl.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;border:1.5px solid #334155;border-radius:12px;padding:12px 20px;display:flex;align-items:center;gap:14px;z-index:99999;box-shadow:0 8px 32px rgba(0,0,0,.5);min-width:280px;animation:slideUp .2s ease';
    toastEl.innerHTML = '<span style="font-size:13px;color:#f1f5f9">' + (label||'Elemento') + ' eliminato</span>'
      + '<button onclick="UndoStack.undo()" style="padding:6px 14px;background:#f97316;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:12px;font-weight:700;flex-shrink:0">Annulla</button>';
    // Remove existing
    document.getElementById('undo-toast')?.remove();
    document.body.appendChild(toastEl);

    this._timer = setTimeout(() => {
      this._commit();
    }, 3500);
  },

  undo() {
    if (!this._pending) return;
    clearTimeout(this._timer);
    this._timer = null;
    const p = this._pending;
    this._pending = null;
    document.getElementById('undo-toast')?.remove();
    if(p.onUndoCb){try{p.onUndoCb();}catch(e){}}
    // Restore the record
    IDB.put(p.store, p.record).then(() => {
      AppStore.invalidate(p.store);
      toast('✅ Eliminazione annullata', 'success');
      // Re-render current section
      if (typeof App !== 'undefined' && App.currentSection) {
        try { App.renderSection(App.currentSection); } catch(e) {}
      }
    }).catch(() => toast('Errore ripristino', 'error'));
  },

  _commit() {
    if (!this._pending) return;
    const p = this._pending;
    this._pending = null;
    document.getElementById('undo-toast')?.remove();
    p.deleteFn(); // actual delete
  }
};
window.UndoStack = UndoStack;

function eid(id){return document.getElementById(id)||null}
function fmtCur(n,cur){
  // If CurrencyEngine is loaded and a currency override given, convert+format
  if(typeof CurrencyEngine!=='undefined'&&CurrencyEngine._rates){
    const c=cur||CurrencyEngine._activeCurrency||'EUR';
    const v=CurrencyEngine.convert(parseFloat(n||0),c);
    const sym=CurrencyEngine._symbols[c]||'€';
    return sym+v.toFixed(2);
  }
  return'€'+parseFloat(n||0).toFixed(2);
}
function fmtDate(d){if(!d)return'—';return new Date(d).toLocaleDateString('it-IT')}
function today(){return new Date().toISOString().split('T')[0]}
function uid(){return Date.now()+'_'+Math.random().toString(36).substr(2,5)}
function sanitize(s){if(s==null)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
window.sanitize=sanitize;

// v4.3: Keyboard shortcuts overlay


// v4.3: Show skeleton loading in a container

// v4.3: Reusable empty state component
function emptyState(opts) {
  // opts: { icon, title, subtitle, cta, ctaFn }
  const icon = opts.icon || '📭';
  const title = opts.title || 'Nessun dato';
  const subtitle = opts.subtitle || 'Inizia aggiungendo il primo elemento';
  const ctaHtml = opts.cta
    ? '<button onclick="' + (opts.ctaFn||'') + '" style="margin-top:16px;padding:10px 24px;background:var(--primary);color:#000;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700">'
      + opts.cta + '</button>'
    : '';
  return '<div style="text-align:center;padding:56px 24px;color:var(--text-dim)">'
    + '<div style="font-size:52px;margin-bottom:14px;opacity:.4">' + icon + '</div>'
    + '<div style="font-size:16px;font-weight:700;color:var(--text-muted);margin-bottom:6px">' + title + '</div>'
    + '<div style="font-size:13px;color:var(--text-dim)">' + subtitle + '</div>'
    + ctaHtml + '</div>';
}

function showSkeleton(containerId, rows=3) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array.from({length: rows}, (_, i) =>
    '<div class="skeleton-card">' +
    '<div class="skeleton skeleton-line" style="width:' + (60+i*10) + '%"></div>' +
    '<div class="skeleton skeleton-line short" style="margin-top:6px"></div>' +
    '</div>'
  ).join('');
}

const KeyboardShortcuts = {
  show() {
    const shortcuts = [
      {k:'Ctrl+K',d:'Command Palette'},{k:'Ctrl+F',d:'Cerca ovunque'},
      {k:'Ctrl+B',d:'Toggle Sidebar'},{k:'Ctrl+/',d:'Mostra shortcuts'},
      {k:'Alt+P',d:'Pipeline'},{k:'Alt+V',d:'Vendite'},
      {k:'Alt+C',d:'Clienti'},{k:'Alt+Q',d:'Quoter'},
      {k:'Alt+K',d:'Kanban'},{k:'Esc',d:'Chiudi'},
    ];
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px)';
    ov.onclick = function(e){ if(e.target===ov) ov.remove(); };
    const box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-card);border-radius:16px;padding:24px;max-width:520px;width:100%;border:1px solid var(--border2)';
    const title = document.createElement('div');
    title.style.cssText = 'font-size:15px;font-weight:800;color:var(--text);margin-bottom:16px;display:flex;justify-content:space-between;align-items:center';
    title.innerHTML = '<span>Scorciatoie Tastiera</span>';
    const xbtn = document.createElement('button');
    xbtn.textContent = 'x';
    xbtn.style.cssText = 'background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;width:28px;height:28px;border-radius:7px;font-size:14px';
    xbtn.onclick = function(){ ov.remove(); };
    title.appendChild(xbtn);
    box.appendChild(title);
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px';
    shortcuts.forEach(function(s) {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--bg-card2);border-radius:8px;border:1px solid var(--border)';
      const desc = document.createElement('span');
      desc.style.cssText = 'font-size:12px;color:var(--text)';
      desc.textContent = s.d;
      const kbd = document.createElement('kbd');
      kbd.style.cssText = 'font-family:var(--font-mono,monospace);font-size:10px;background:var(--bg-card3);color:var(--primary);border:1px solid var(--primary-border);border-radius:5px;padding:2px 7px;white-space:nowrap';
      kbd.textContent = s.k;
      item.append(desc, kbd);
      grid.appendChild(item);
    });
    box.appendChild(grid);
    ov.appendChild(box);
    document.body.appendChild(ov);
  }
};
window.KeyboardShortcuts = KeyboardShortcuts;

function toast(msg, type='success', duration=3500) {
  // v4.3: enhanced toast with icons, types, auto-stack
  const icons = {
    success: 'check-circle', error: 'times-circle', warning: 'exclamation-triangle',
    info: 'info-circle', danger: 'times-circle'
  };
  const colors = {
    success: '#22c55e', error: '#ef4444', warning: '#f97316',
    info: '#3b82f6', danger: '#ef4444'
  };
  // Normalize type: if emoji or unknown string → 'success'
  const _knownTypes = new Set(['success','error','warning','info','danger']);
  if(!_knownTypes.has(type)) type = 'success';
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.style.cssText = 'display:flex;align-items:center;gap:9px;border-left:3px solid ' + (colors[type]||colors.success) + ';animation:toastIn .25s ease';
  const icon = document.createElement('i');
  icon.className = 'fas fa-' + (icons[type] || 'check-circle');
  icon.style.cssText = 'color:' + (colors[type]||colors.success) + ';flex-shrink:0;font-size:13px';
  const span = document.createElement('span');
  span.style.cssText = 'flex:1;font-size:12px;font-weight:500;line-height:1.4';
  span.textContent = msg;
  const close = document.createElement('button');
  close.innerHTML = '&times;';
  close.style.cssText = 'background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;line-height:1;padding:0;flex-shrink:0;opacity:.6';
  close.onclick = () => { t.style.animation = 'toastOut .2s ease forwards'; setTimeout(() => t.remove(), 200); };
  t.append(icon, span, close);
  const container = document.getElementById('toast-container');
  if (container) {
    // Limit to 4 toasts
    while (container.children.length >= 4) container.firstChild.remove();
    container.appendChild(t);
  }
  setTimeout(() => { if (t.parentNode) { t.style.animation = 'toastOut .2s ease forwards'; setTimeout(() => t.remove(), 200); } }, duration);
}
function openModal(id){const _m=document.getElementById('modal-'+id)||document.getElementById(id);if(_m)_m.classList.add('open');else console.warn('[INGLY] modal not found:',id);}
function closeModal(id){const _m=document.getElementById('modal-'+id)||document.getElementById(id);if(_m)_m.classList.remove('open');}
function badgeStatus(s){
  const m={pagato:'badge-green',da_pagare:'badge-yellow',annullato:'badge-red',confermato:'badge-green',in_attesa:'badge-yellow',bozza:'badge-gray',produzione:'badge-blue',saldato:'badge-green',pronto:'badge-purple'};
  const l={pagato:'Pagato',da_pagare:'Da Pagare',annullato:'Annullato',confermato:'Confermato',in_attesa:'In Attesa',bozza:'Bozza',produzione:'Produzione',saldato:'Saldato',pronto:'Pronto'};
  return`<span class="badge ${m[s]||'badge-gray'}">${l[s]||s}</span>`;
}
function destroyChart(id){
  // Guardia: se Chart.js (CDN) non è caricato (es. offline), non crashare.
  if(typeof Chart==='undefined'||!Chart.getChart) return;
  const existing=Chart.getChart(id);
  if(existing)existing.destroy();
}

// ===== HISTORY LOG =====
async function logAction(entity,entityId,action,data={}){
  await IDB.put('history',{entity,entityId:String(entityId),action,data,ts:Date.now(),date:new Date().toISOString()});
}

// ===== VERSIONING =====
async function snapshotRecord(store,id){
  const rec=await IDB.get(store,id);
  if(!rec)return;
  const vers=await IDB.getAll('versions');
  const existing=vers.filter(v=>v.store===store&&v.recId===String(id));
  const version=(existing.length?Math.max(...existing.map(v=>v.v)):0)+1;
  await IDB.put('versions',{store,recId:String(id),v:version,snapshot:{...rec},ts:Date.now()});
}

// ===== DEFAULT DATA =====
const DEFAULTS={
  clients:[],
  sales:[],
  quotes:[],
  inventory:[
    {id:1,sku:'PLY-001',name:'Plexiglass 3mm Trasparente',category:'Plexiglass',unit:'mq',stock:0,minStock:5,costPrice:8.50,supplier:''},
    {id:2,sku:'PLY-002',name:'Plexiglass 5mm Trasparente',category:'Plexiglass',unit:'mq',stock:0,minStock:3,costPrice:14.00,supplier:''},
    {id:3,sku:'LEG-001',name:'Compensato 3mm Pioppo',category:'Legno',unit:'mq',stock:0,minStock:5,costPrice:6.00,supplier:''},
    {id:4,sku:'LEG-002',name:'Compensato 4mm Betulla',category:'Legno',unit:'mq',stock:0,minStock:3,costPrice:8.00,supplier:''},
  ],
  cashflow:[],
  catalog:[
    // ══════════════════════════════════════════════
    // 🏠 HOME DECOR
    // ══════════════════════════════════════════════
    {id:1,name:'Tagliere Personalizzato Famiglia',category:'Home Decor',costPrice:11,salePrice:42,emoji:'🍽️',desc:'Tagliere in legno di noce o acacia con nome famiglia, monogramma o mappa città incisa al laser. Il bestseller assoluto di Etsy 2025.',tags:'legno, cucina, regalo, personalizzato, noce',material:'Noce / Acacia 20mm',size:'35×25cm',productionTime:25,trendScore:98,etsyRef:'https://www.etsy.com/search?q=tagliere+legno+personalizzato',notes:'Varianti: con piedi in gomma, con manico. Best review su Etsy.'},
    {id:2,name:'Mappa Città Layered 3D',category:'Home Decor',costPrice:32,salePrice:88,emoji:'🗺️',desc:'Mappa città stratificata multi-livello in betulla 3mm. Personalizzabile con qualsiasi città. Trend esplosivo 2025-2026.',tags:'mappa, città, 3d, layered, decorazione, travel',material:'Betulla 3mm · 5 strati',size:'40×30cm',productionTime:90,trendScore:97,etsyRef:'https://www.etsy.com/search?q=mappa+citta+legno+layered+3d',notes:'Alta marginalità. Lavoro di incastro strati. Molto richiesta per regali laurea.'},
    {id:3,name:'Lampada LED Nome Personalizzata',category:'Home Decor',costPrice:24,salePrice:68,emoji:'💡',desc:'Lampada da comodino con nome o scritta incisa in legno, diffusore in plexiglass bianco opalino. LED caldo incluso.',tags:'lampada, led, nome, luce, notte, personalizzata',material:'Betulla 4mm + Plexy bianco',size:'20×15cm',productionTime:35,trendScore:96,etsyRef:'https://www.etsy.com/search?q=lampada+legno+led+personalizzata',notes:'Includere cavo USB. Possibilità base rotonda o rettangolare.'},
    {id:4,name:'Orologio Parete Numeri Romani',category:'Home Decor',costPrice:18,salePrice:62,emoji:'🕐',desc:'Orologio da parete in legno con numeri romani, meccanismo al quarzo silenzioso. Personalizzabile con skyline, monogramma o citazione.',tags:'orologio, parete, legno, romani, design',material:'MDF laminato rovere 6mm',size:'30cm diametro',productionTime:45,trendScore:88,etsyRef:'https://www.etsy.com/search?q=orologio+legno+personalizzato+parete',notes:'Meccanismo incluso. Alta qualità percepita.'},
    {id:5,name:'Wall Art Mandala Geometrico',category:'Home Decor',costPrice:19,salePrice:58,emoji:'🔷',desc:'Pannello decorativo multi-strato in stile boho-chic. Mandala geometrico con ombre di profondità.',tags:'arte, muro, geometrico, mandala, boho, scandinavo',material:'MDF 3mm bianco · 3 strati',size:'45×45cm',productionTime:60,trendScore:85,etsyRef:'https://www.etsy.com/search?q=wall+art+mandala+legno+layered',notes:'Richiesta elevata su Pinterest. Buono per fiere.'},
    {id:6,name:'Targa Benvenuto Famiglia',category:'Home Decor',costPrice:9,salePrice:28,emoji:'🏡',desc:'Targa con cognome famiglia, anno e decorazioni laser per ingresso casa o cancello.',tags:'casa, ingresso, nome, famiglia, targa, welcome',material:'Betulla 4mm',size:'30×10cm',productionTime:20,trendScore:82,etsyRef:'https://www.etsy.com/search?q=targa+legno+benvenuto+famiglia',notes:'Variante: con gancio per porta.'},
    {id:7,name:'Portafoto Cornice Rustica',category:'Home Decor',costPrice:13,salePrice:38,emoji:'🖼️',desc:'Cornice in legno stile rustico con frase o nome inciso. Formati 10×15 o 13×18.',tags:'casa, legno, decorazione, foto, cornice, rustico',material:'Tiglio 3mm',size:'13×18cm',productionTime:20,trendScore:80,etsyRef:'https://www.etsy.com/search?q=cornice+legno+personalizzata+rustica',notes:''},
    {id:8,name:'Set Cucina Coordinato',category:'Home Decor',costPrice:36,salePrice:95,emoji:'🫙',desc:'Set coordinato: tagliere + portaspezie + portabuste + porta-tovaglioli. Tutto inciso con stesso monogramma.',tags:'cucina, set, coordinato, bambù, monogramma',material:'Bambù 18mm',size:'Varie',productionTime:80,trendScore:74,etsyRef:'https://www.etsy.com/search?q=set+cucina+legno+personalizzato+coordinato',notes:'Ottimo prodotto regalo. Prezzo percepito alto.'},
    {id:9,name:'Scatola Porta-Oggetti Incisa',category:'Home Decor',costPrice:15,salePrice:42,emoji:'📦',desc:'Scatola in legno con coperchio scorrevole o a cerniera incisa. Nome, citazione o mandala.',tags:'scatola, legno, porta-oggetti, incisione',material:'Betulla 4mm + MDF fondo',size:'20×14×8cm',productionTime:30,trendScore:76,etsyRef:'https://www.etsy.com/search?q=scatola+legno+personalizzata+incisa',notes:''},
    {id:10,name:'Appendiabiti Ingresso Personalizzato',category:'Home Decor',costPrice:22,salePrice:58,emoji:'🪝',desc:'Appendiabiti a muro con nome famiglia o quote incisa. Ganci in ottone inclusi.',tags:'appendiabiti, ingresso, legno, ganci, parete',material:'MDF laminato rovere 12mm',size:'60×15cm',productionTime:40,trendScore:71,etsyRef:'https://www.etsy.com/search?q=appendiabiti+legno+personalizzato',notes:''},

    // ══════════════════════════════════════════════
    // 💒 WEDDING
    // ══════════════════════════════════════════════
    {id:11,name:'Portachiavi Sposi Nomi Intrecciati',category:'Wedding',costPrice:2.5,salePrice:10,emoji:'🗝️',desc:'Portachiavi in plexiglass trasparente o colorato con nomi degli sposi intrecciati. Bestseller bomboniere di tutti i tempi. Min. ordine 10pz.',tags:'matrimonio, portachiavi, bomboniera, sposi, coppia',material:'Plexiglass 3mm',size:'6×4cm',productionTime:5,trendScore:99,etsyRef:'https://www.etsy.com/search?q=portachiavi+sposi+personalizzato+legno',notes:'Produrre in batch. 50 pz in 1h. Ottima marginalità.'},
    {id:12,name:'Segnaposto Legno Betulla',category:'Wedding',costPrice:1.2,salePrice:4.5,emoji:'🪧',desc:'Segnaposto a forma di cuore, stella o sagoma custom con nome ospite inciso. Venduti in set 10/20/50/100.',tags:'wedding, segnaposto, tavolo, nome, betulla, ospiti',material:'Betulla 3mm',size:'7×5cm',productionTime:3,trendScore:97,etsyRef:'https://www.etsy.com/search?q=segnaposto+matrimonio+legno+personalizzato',notes:'Il prodotto più richiesto in assoluto per matrimoni. Altissima velocità di produzione.'},
    {id:13,name:'Album Matrimonio Copertina Legno',category:'Wedding',costPrice:28,salePrice:78,emoji:'📷',desc:'Copertina album in legno di noce incisa con nomi, data, motivo floreale personalizzato.',tags:'album, matrimonio, ricordo, foto, copertina, noce',material:'Noce 4mm',size:'32×28cm',productionTime:30,trendScore:90,etsyRef:'https://www.etsy.com/search?q=copertina+album+matrimonio+legno',notes:''},
    {id:14,name:'Box Fedi Anelli Legno',category:'Wedding',costPrice:14,salePrice:42,emoji:'💍',desc:'Porta-fedi in legno con cuscino velluto e incisione nomi + data. Elegantissima per cerimonia.',tags:'fedi, anelli, legno, portafedi, matrimonio, cerimonia',material:'Noce 6mm + velluto',size:'12×12×5cm',productionTime:25,trendScore:86,etsyRef:'https://www.etsy.com/search?q=portafedi+legno+personalizzato',notes:''},
    {id:15,name:'Menu Matrimonio in Legno',category:'Wedding',costPrice:3.5,salePrice:11,emoji:'📋',desc:'Menu personalizzato in legno betulla per ogni coperto. Anche come ricordo. Design elegante con calligrafia.',tags:'menu, tavolo, wedding, elegante, legno, calligrafia',material:'Betulla 3mm',size:'10×20cm',productionTime:4,trendScore:78,etsyRef:'https://www.etsy.com/search?q=menu+matrimonio+legno+personalizzato',notes:''},
    {id:16,name:'Tableau de Mariage in Legno',category:'Wedding',costPrice:38,salePrice:110,emoji:'🎊',desc:'Tableau mariage grande formato in legno con nomi ospiti e numero tavolo. Alto impatto scenico.',tags:'tableau, matrimonio, tavoli, legno, cerimonia, allestimento',material:'MDF bianco 6mm',size:'80×60cm',productionTime:120,trendScore:84,etsyRef:'https://www.etsy.com/search?q=tableau+mariage+legno+personalizzato',notes:'Prodotto premium ad alto impatto. Foto obbligatoria.'},
    {id:17,name:'Bomboniere Scatolina Legno',category:'Wedding',costPrice:3,salePrice:9,emoji:'🎁',desc:'Scatolina cuore/tonda in legno con incisione nomi e data. Contiene confetti. Set 10pz.',tags:'bomboniera, scatola, legno, matrimonio, confetti',material:'Betulla 3mm',size:'8×8×4cm',productionTime:8,trendScore:81,etsyRef:'https://www.etsy.com/search?q=bomboniere+legno+matrimonio+personalizzate',notes:''},
    {id:18,name:'Copribottiglie Champagne',category:'Wedding',costPrice:4.5,salePrice:12,emoji:'🥂',desc:'Etichette in legno sagomato per bottiglie champagne o vino. Con nomi e data. Set 2 pz.',tags:'champagne, vino, bottiglia, decorazione, wedding, etichetta',material:'Betulla 2mm',size:'10×8cm',productionTime:8,trendScore:72,etsyRef:'https://www.etsy.com/search?q=copribottiglia+legno+matrimonio',notes:''},
    {id:19,name:'Targa "Gli Sposi" Foto',category:'Wedding',costPrice:20,salePrice:58,emoji:'💑',desc:'Cornice doppia in legno con scritta "Gli Sposi" o nomi intrecciati. Foto 10×15 inclusa.',tags:'sposi, cornice, foto, matrimonio, ricordo',material:'Betulla 4mm',size:'30×20cm',productionTime:25,trendScore:75,etsyRef:'https://www.etsy.com/search?q=cornice+sposi+legno+personalizzata',notes:''},
    {id:20,name:'Libro Degli Auguri in Legno',category:'Wedding',costPrice:35,salePrice:90,emoji:'📖',desc:'Guestbook matrimonio con copertina in legno personalizzata. Pagine bianche per auguri ospiti.',tags:'guestbook, auguri, matrimonio, libro, ospiti',material:'Noce 4mm + carta avorio',size:'A5',productionTime:40,trendScore:70,etsyRef:'https://www.etsy.com/search?q=guestbook+matrimonio+legno',notes:''},

    // ══════════════════════════════════════════════
    // 👶 KIDS / BAMBINI
    // ══════════════════════════════════════════════
    {id:21,name:'Puzzle Nome Bambino 3D',category:'Kids',costPrice:9,salePrice:32,emoji:'🧩',desc:'Puzzle in legno betulla con lettere 3D del nome del bambino. Con animali, numeri o stelline colorate. TOP regalo nascita.',tags:'bambini, puzzle, nome, gioco, legno, nascita',material:'Betulla 4mm colorata',size:'30×15cm',productionTime:20,trendScore:97,etsyRef:'https://www.etsy.com/search?q=puzzle+nome+bambino+legno+3d',notes:'Dipingere le lettere con colori non tossici. Alta richiesta.'},
    {id:22,name:'Cornice Nascita Personalizzata',category:'Kids',costPrice:13,salePrice:44,emoji:'👶',desc:'Cornice con nome, data, ora di nascita, peso e altezza neonato incisi. Design tenero con stelline o animali.',tags:'nascita, neonato, regalo, cornice, personalizzata, data',material:'MDF bianco 4mm',size:'25×20cm',productionTime:25,trendScore:95,etsyRef:'https://www.etsy.com/search?q=cornice+nascita+personalizzata+bambino',notes:''},
    {id:23,name:'Toppers Torta Compleanno',category:'Kids',costPrice:3.5,salePrice:13,emoji:'🎂',desc:'Toppers per torte in plexiglass o legno: numero età, nome, tema (dinosauri, principessa, supereroi).',tags:'torta, topper, compleanno, decorazione, festa, bambini',material:'Plexy colorato 3mm',size:'15×8cm',productionTime:8,trendScore:93,etsyRef:'https://www.etsy.com/search?q=topper+torta+compleanno+personalizzato',notes:'Produrre set per ogni tema popolare: unicorno, dinosauro, palloncini.'},
    {id:24,name:'Targa Camera Bambino Tematica',category:'Kids',costPrice:5.5,salePrice:19,emoji:'🌈',desc:'Targa con nome bambino e tema scelto (astronauta, principessa, dinosauro, supereroe). Colorata e tenera.',tags:'bambini, camera, nome, targa, colorato, tema',material:'MDF bianco 4mm',size:'20×10cm',productionTime:15,trendScore:89,etsyRef:'https://www.etsy.com/search?q=targa+camera+bambino+personalizzata',notes:''},
    {id:25,name:'Cornice Comunione / Cresima',category:'Kids',costPrice:9,salePrice:28,emoji:'⛪',desc:'Cornice in legno con simboli religiosi (croce, calice, colomba) e nome + data. Tono sacro ed elegante.',tags:'comunione, cresima, ricordo, chiesa, legno, sacro',material:'Betulla 4mm',size:'20×15cm',productionTime:20,trendScore:82,etsyRef:'https://www.etsy.com/search?q=cornice+comunione+legno+personalizzata',notes:'Stagione aprile-giugno. Pre-produrre in anticipo.'},
    {id:26,name:'Cornice Battesimo / Nascita',category:'Kids',costPrice:10,salePrice:32,emoji:'🕊️',desc:'Cornice in legno bianco con angioletti, croci, colombe. Nome, data e luogo del battesimo incisi.',tags:'battesimo, ricordo, chiesa, bianco, neonato',material:'MDF bianco 4mm',size:'20×15cm',productionTime:20,trendScore:80,etsyRef:'https://www.etsy.com/search?q=cornice+battesimo+legno',notes:''},
    {id:27,name:'Abecedario Animali Decorativo',category:'Kids',costPrice:18,salePrice:55,emoji:'🦁',desc:'Tavola in legno con alfabeto e animali incisi. Decorativo per cameretta bambini. Colorata a mano.',tags:'alfabeto, bambini, animali, cameretta, decorazione',material:'MDF bianco 6mm',size:'60×30cm',productionTime:50,trendScore:76,etsyRef:'https://www.etsy.com/search?q=abecedario+animali+legno+bambini',notes:''},
    {id:28,name:'Calendario Personale Bambino',category:'Kids',costPrice:12,salePrice:38,emoji:'📆',desc:'Calendario perenne in legno con nome bambino. Segna compleanni, stagioni e attività scolastiche.',tags:'calendario, bambino, perenne, scuola, settimana',material:'Betulla 4mm',size:'30×25cm',productionTime:30,trendScore:72,etsyRef:'https://www.etsy.com/search?q=calendario+perenne+legno+bambini',notes:''},

    // ══════════════════════════════════════════════
    // 🎄 SEASONAL / STAGIONALE
    // ══════════════════════════════════════════════
    {id:29,name:'Decorazioni Natalizie Personalizzate',category:'Seasonal',costPrice:3.5,salePrice:13,emoji:'🎄',desc:'Set 5 decorazioni natalizie in betulla (stella, alberello, renna, calza, fiocco) con nome inciso. TOP novembre-dicembre.',tags:'natale, decorazione, legno, personalizzato, albero',material:'Betulla 3mm',size:'8-12cm',productionTime:10,trendScore:99,etsyRef:'https://www.etsy.com/search?q=decorazioni+natalizie+legno+personalizzate',notes:'Set da 5. Produrre stock alto da ottobre. Stagione brevissima e intensissima.'},
    {id:30,name:'Calendario Avvento Legno',category:'Seasonal',costPrice:28,salePrice:74,emoji:'📅',desc:'Calendario avvento riutilizzabile in legno con 24 casette o scatolette con coperchi. Nome bambino inciso.',tags:'natale, avvento, calendario, bambini, riutilizzabile, 24',material:'Betulla 4mm',size:'50×30cm',productionTime:180,trendScore:96,etsyRef:'https://www.etsy.com/search?q=calendario+avvento+legno+personalizzato',notes:'Prodotto premium. Acquistato ogni anno. Alta fedeltà cliente.'},
    {id:31,name:'Presepe Laser Cut Silhouette',category:'Seasonal',costPrice:18,salePrice:52,emoji:'⭐',desc:'Presepe stilizzato silhouette in legno, 5 pezzi. Natività moderna ed elegante.',tags:'presepe, natale, silhouette, legno, natività',material:'MDF nero 4mm',size:'40×25cm',productionTime:40,trendScore:83,etsyRef:'https://www.etsy.com/search?q=presepe+laser+legno+silhouette',notes:''},
    {id:32,name:'Decorazione Pasqua Set',category:'Seasonal',costPrice:4,salePrice:15,emoji:'🐣',desc:'Set 4 decorazioni pasquali: coniglio, uovo, pulcino, carota. In betulla colorata con nome.',tags:'pasqua, decorazione, coniglio, uovo, legno, primavera',material:'Betulla 3mm',size:'10-15cm',productionTime:15,trendScore:78,etsyRef:'https://www.etsy.com/search?q=decorazioni+pasqua+legno+personalizzate',notes:''},
    {id:33,name:'Segnaposto Pasqua con Nome',category:'Seasonal',costPrice:1.2,salePrice:4.5,emoji:'🐰',desc:'Coniglietti o uova sagomati con nome ospite per tavola di Pasqua. Set 6.',tags:'pasqua, segnaposto, coniglio, tavolo, pranzo',material:'Betulla 3mm',size:'8×6cm',productionTime:4,trendScore:76,etsyRef:'https://www.etsy.com/search?q=segnaposto+pasqua+legno',notes:''},
    {id:34,name:'Cuore San Valentino Luminoso',category:'Seasonal',costPrice:16,salePrice:45,emoji:'❤️',desc:'Cuore in plexiglass rosso con LED, scritta "Ti amo" o nomi coppia incisi.',tags:'valentino, cuore, led, amore, coppia, rosso',material:'Plexy rosso 5mm + LED',size:'20×18cm',productionTime:30,trendScore:88,etsyRef:'https://www.etsy.com/search?q=cuore+led+personalizzato+san+valentino',notes:'Picco ordini fine gennaio.'},
    {id:35,name:'Portacandela Halloween',category:'Seasonal',costPrice:5,salePrice:16,emoji:'🎃',desc:'Portacandela a forma di zucca, pipistrello o fantasma. Con incisioni laser decorative.',tags:'halloween, zucca, candela, decorazione, legno',material:'MDF bianco 6mm',size:'12×12cm',productionTime:15,trendScore:72,etsyRef:'https://www.etsy.com/search?q=portacandela+halloween+legno',notes:''},

    // ══════════════════════════════════════════════
    // 🏢 CORPORATE
    // ══════════════════════════════════════════════
    {id:36,name:'Targa Aziendale Plexiglass Premium',category:'Corporate',costPrice:19,salePrice:62,emoji:'🏢',desc:'Targa professionale in plexiglass 5mm con logo aziendale, nome dipendente e ruolo. Retroilluminabile con LED.',tags:'azienda, ufficio, targa, logo, plexiglass, professionale',material:'Plexy nero 5mm',size:'25×15cm',productionTime:20,trendScore:88,etsyRef:'https://www.etsy.com/search?q=targa+aziendale+plexiglass+personalizzata',notes:''},
    {id:37,name:'Award & Trofeo Personalizzato',category:'Corporate',costPrice:17,salePrice:54,emoji:'🏆',desc:'Premio personalizzato plexiglass + base legno. Per dipendenti del mese, concorsi aziendali, eventi.',tags:'premio, trofeo, award, aziendale, riconoscimento',material:'Plexy + betulla 6mm',size:'20×8cm base',productionTime:25,trendScore:84,etsyRef:'https://www.etsy.com/search?q=trofeo+personalizzato+aziendale+legno',notes:''},
    {id:38,name:'Box Gadget Corporate Premium',category:'Corporate',costPrice:46,salePrice:125,emoji:'📦',desc:'Cofanetto regalo con logo aziendale inciso. Contiene: tazza termica + penna + blocco note, tutto personalizzato.',tags:'corporate, regalo, premium, cofanetto, logo, evento',material:'Betulla 4mm + interno veluto',size:'30×20×10cm',productionTime:45,trendScore:79,etsyRef:'https://www.etsy.com/search?q=box+regalo+aziendale+personalizzato',notes:''},
    {id:39,name:'Portachiavi Logo Bulk (min 50)',category:'Corporate',costPrice:2,salePrice:6.5,emoji:'🔑',desc:'Portachiavi con logo aziendale in plexiglass o legno. Perfetti per fiere, eventi e omaggi clienti. Min 50 pz.',tags:'portachiavi, corporate, logo, fiera, bulk, promozionale',material:'Plexy 3mm o betulla',size:'6×4cm',productionTime:4,trendScore:82,etsyRef:'https://www.etsy.com/search?q=portachiavi+aziendale+personalizzato+bulk',notes:'Margine elevato su grandi volumi.'},
    {id:40,name:'Targhetta Scrivania Legno',category:'Corporate',costPrice:8,salePrice:25,emoji:'💼',desc:'Nome e ruolo professionale su supporto legno o plexy per scrivania. Stile moderno o classico.',tags:'scrivania, nome, ufficio, professionale, targhetta',material:'MDF laminato rovere 6mm',size:'20×6cm',productionTime:10,trendScore:74,etsyRef:'https://www.etsy.com/search?q=targhetta+scrivania+legno+personalizzata',notes:''},
    {id:41,name:'Diario/Notebook Copertina Incisa',category:'Corporate',costPrice:12,salePrice:35,emoji:'📓',desc:'Quaderno o diario A5 con copertina in legno incisa con logo, nome o frase motivazionale.',tags:'quaderno, notebook, copertina, legno, corporate, regalo',material:'Betulla 3mm + quaderno A5',size:'A5',productionTime:15,trendScore:70,etsyRef:'https://www.etsy.com/search?q=notebook+copertina+legno+personalizzata',notes:''},

    // ══════════════════════════════════════════════
    // 💎 ACCESSORI
    // ══════════════════════════════════════════════
    {id:42,name:'Orecchini Laser Cut Geometrici',category:'Accessori',costPrice:1.8,salePrice:12,emoji:'💎',desc:'Orecchini leggeri in betulla 2mm. Forme: cerchio, esagono, mandala, animali. Personalizzabili. Trending su Etsy.',tags:'orecchini, legno, gioielli, artigianale, laser, geometrici',material:'Betulla 2mm',size:'3-5cm',productionTime:6,trendScore:93,etsyRef:'https://www.etsy.com/search?q=orecchini+legno+laser+personalizzati',notes:'Produrre in serie. Colori: naturale, tinto, mordente.'},
    {id:43,name:'Collana Ciondolo Legno',category:'Accessori',costPrice:2.5,salePrice:14,emoji:'📿',desc:'Ciondolo in legno o plexiglass con simboli, animali o lettere iniziali. Catena inclusa.',tags:'collana, ciondolo, legno, gioielli, iniziali, laser',material:'Betulla 2mm / Plexy',size:'3-4cm',productionTime:8,trendScore:86,etsyRef:'https://www.etsy.com/search?q=collana+ciondolo+legno+personalizzato',notes:''},
    {id:44,name:'Portachiavi Personalizzato',category:'Accessori',costPrice:1.8,salePrice:8,emoji:'🔑',desc:'Portachiavi in plexiglass o legno con nome, data, coordinata GPS o disegno personalizzato.',tags:'portachiavi, personalizzato, regalo, plexiglass, legno',material:'Plexy 3mm o betulla',size:'6×4cm',productionTime:5,trendScore:91,etsyRef:'https://www.etsy.com/search?q=portachiavi+personalizzato+legno',notes:'Prodotto con altissimo volume. ROI eccellente.'},
    {id:45,name:'Segnalibro Acrilico Personalizzato',category:'Accessori',costPrice:1.2,salePrice:7,emoji:'📚',desc:'Segnalibri in plexiglass colorato con nome, citazione letteraria o disegno. Set 3 pz.',tags:'libro, lettura, segnalibro, plexiglass, regalo, citazione',material:'Plexy colorato 3mm',size:'15×4cm',productionTime:5,trendScore:85,etsyRef:'https://www.etsy.com/search?q=segnalibro+personalizzato+acrilico',notes:''},
    {id:46,name:'Spilla Plexiglass Colorata',category:'Accessori',costPrice:1.3,salePrice:7.5,emoji:'🌸',desc:'Spille sagomatee personalizzate in plexiglass. Temi: fiori, animali, numeri, nomi, cartoni.',tags:'spilla, accessori, moda, plexiglass, colorato, gioiello',material:'Plexy colorato 3mm',size:'4-6cm',productionTime:5,trendScore:80,etsyRef:'https://www.etsy.com/search?q=spilla+plexiglass+personalizzata',notes:''},
    {id:47,name:'Coordinata GPS Incisa su Legno',category:'Accessori',costPrice:8,salePrice:28,emoji:'📍',desc:'Tavoletta in legno con coordinata GPS del luogo speciale (prima casa, luogo incontro, matrimonio).',tags:'gps, coordinata, mappa, luogo, legno, coppia, regalo',material:'Betulla 4mm',size:'15×8cm',productionTime:15,trendScore:88,etsyRef:'https://www.etsy.com/search?q=coordinate+gps+legno+personalizzato',notes:'Molto richiesto per anniversari e regali coppia.'},
    {id:48,name:'Braccialetto Inciso Plexiglass',category:'Accessori',costPrice:1.5,salePrice:9,emoji:'💫',desc:'Braccialetto sottile in plexiglass trasparente o colorato con nome, data o simbolo inciso.',tags:'braccialetto, accessori, moda, nome, laser',material:'Plexy 2mm',size:'18×1.5cm',productionTime:5,trendScore:78,etsyRef:'https://www.etsy.com/search?q=braccialetto+plexiglass+personalizzato',notes:''},

    // ══════════════════════════════════════════════
    // 💻 DIGITAL / FILE / DOWNLOAD
    // ══════════════════════════════════════════════
    {id:49,name:'File SVG Monogramma Premium',category:'Digital',costPrice:0,salePrice:8,emoji:'🎨',desc:'File SVG vettoriale per monogramma personalizzato. Pronto per taglio laser. Include 3 stili grafici.',tags:'svg, file, monogramma, vettoriale, laser, download',material:'File digitale',size:'—',productionTime:2,trendScore:82,etsyRef:'https://www.etsy.com/search?q=svg+monogramma+personalizzato+laser',notes:'Zero margine materiale = margine quasi puro.'},
    {id:50,name:'File Mappa Città Layered SVG',category:'Digital',costPrice:0,salePrice:15,emoji:'🗺️',desc:'File vettoriale multi-strato per mappa città. Pronto per incisione laser. Include 5 livelli SVG.',tags:'svg, mappa, città, layered, file, laser, download',material:'File digitale',size:'—',productionTime:3,trendScore:88,etsyRef:'https://www.etsy.com/search?q=svg+mappa+citta+laser+layered',notes:'Venduto su Etsy Digital. Ricorrente.'},
    {id:51,name:'Template Preventivi Personalizzato',category:'Digital',costPrice:0,salePrice:12,emoji:'📄',desc:'Modello Word/Google Docs brandizzato Ingly Design per preventivi client-facing professionali.',tags:'template, preventivo, word, pdf, business',material:'File digitale',size:'—',productionTime:0,trendScore:65,etsyRef:'',notes:'Uso interno e possibile vendita.'},

    // ══════════════════════════════════════════════
    // 🏠 HOME DECOR extra
    // ══════════════════════════════════════════════
    {id:52,name:'Porta Vino Legno Personalizzato',category:'Home Decor',costPrice:14,salePrice:40,emoji:'🍷',desc:'Porta bottiglia vino singolo in legno con cuore inciso e nome coppia o anno. Regalo coppia.',tags:'vino, legno, regalo, coppia, anniversario',material:'Betulla 6mm',size:'35×12cm',productionTime:20,trendScore:79,etsyRef:'https://www.etsy.com/search?q=porta+vino+legno+personalizzato',notes:''},
    {id:53,name:'Citazione Motivazionale Wall Art',category:'Home Decor',costPrice:16,salePrice:48,emoji:'💬',desc:'Pannello con citazione scelta dal cliente, incisa su MDF o betulla. Tipografia elegante e personalizzata.',tags:'citazione, parete, legno, motivazione, tipografia',material:'MDF rovere 6mm',size:'50×20cm',productionTime:25,trendScore:77,etsyRef:'https://www.etsy.com/search?q=citazione+legno+parete+personalizzata',notes:''},
    {id:54,name:'Albero Genealogico Inciso',category:'Home Decor',costPrice:28,salePrice:85,emoji:'🌳',desc:'Albero genealogico con nomi di famiglia incisi su legno. Struttura ad albero elegante e personalizzata.',tags:'albero, genealogico, famiglia, legno, generazioni',material:'Noce 4mm',size:'40×50cm',productionTime:60,trendScore:80,etsyRef:'https://www.etsy.com/search?q=albero+genealogico+legno+personalizzato',notes:''},

    // Extra Wedding
    {id:55,name:'Calice Brindisi Personalizzato',category:'Wedding',costPrice:8,salePrice:24,emoji:'🥂',desc:'Calice in vetro satinato inciso al laser con nomi sposi e data. Set 2 pezzi.',tags:'calice, vetro, brindisi, matrimonio, sposi, laser',material:'Vetro cristallo',size:'20cm h',productionTime:15,trendScore:76,etsyRef:'https://www.etsy.com/search?q=calice+inciso+matrimonio+personalizzato',notes:'Incisione laser su vetro. Richiede configurazione laser speciale.'},

    // Extra Kids
    {id:56,name:'Palloncini Nome Legno (set feste)',category:'Kids',costPrice:6,salePrice:22,emoji:'🎈',desc:'Palloncini sagomati in plexiglass colorato con nome bambino. Si reggono in piedi. Decorazione festa.',tags:'palloncino, festa, bambino, plexiglass, colorato, compleanno',material:'Plexy colorato 4mm',size:'30×20cm',productionTime:12,trendScore:87,etsyRef:'https://www.etsy.com/search?q=palloncini+legno+nome+bambino+festa',notes:''},
    {id:57,name:'Kit Educativo Frazioni Legno',category:'Kids',costPrice:14,salePrice:42,emoji:'🔢',desc:'Set frazioni e geometrie in legno colorato per bambini 4-8 anni. Montessori friendly.',tags:'frazioni, matematica, montessori, bambini, legno, educativo',material:'Betulla 6mm colorata',size:'Varie',productionTime:30,trendScore:73,etsyRef:'https://www.etsy.com/search?q=frazioni+legno+montessori+bambini',notes:''},

    // Extra Seasonal
    {id:58,name:'Ghirlanda Natalizia LED Legno',category:'Seasonal',costPrice:22,salePrice:62,emoji:'✨',desc:'Ghirlanda in betulla sagomata con LED warm white integrati. Con stelle, abeti e renne laser cut.',tags:'ghirlanda, natale, led, luci, decorazione, legno',material:'Betulla 3mm + LED strip',size:'120cm lunghezza',productionTime:50,trendScore:91,etsyRef:'https://www.etsy.com/search?q=ghirlanda+natale+legno+led+personalizzata',notes:''},
    {id:59,name:'Lanterna Portacandela Laser',category:'Seasonal',costPrice:11,salePrice:34,emoji:'🏮',desc:'Lanterna in legno con motivi laser (fiocchi di neve, stelle, mandala). Per candela o LED.',tags:'lanterna, candela, natale, laser, decorazione',material:'Betulla 3mm',size:'15×10cm',productionTime:25,trendScore:81,etsyRef:'https://www.etsy.com/search?q=lanterna+legno+laser+portacandela',notes:''},

    // Extra Corporate
    {id:60,name:'Cornice Diploma / Laurea',category:'Corporate',costPrice:18,salePrice:52,emoji:'🎓',desc:'Cornice in legno scuro per diploma di laurea. Con nome laureato, corso di laurea e data.',tags:'laurea, diploma, cornice, legno, universitá',material:'MDF laminato wengé',size:'32×25cm',productionTime:25,trendScore:85,etsyRef:'https://www.etsy.com/search?q=cornice+laurea+legno+personalizzata',notes:'Picco ordini: maggio-luglio e dicembre.'},
    {id:61,name:'Calendario da Tavolo Legno',category:'Corporate',costPrice:16,salePrice:45,emoji:'🗓️',desc:'Calendario da scrivania in legno, mensile, con logo aziendale. Regalo aziendale di pregio.',tags:'calendario, tavolo, scrivania, aziendale, logo, anno',material:'Betulla 4mm + MDF base',size:'20×8cm',productionTime:20,trendScore:75,etsyRef:'https://www.etsy.com/search?q=calendario+tavolo+legno+personalizzato',notes:'Richiesta fine anno da clienti B2B.'},

    // Extra Accessori
    {id:62,name:'Portafoto Magnetico Frigo',category:'Accessori',costPrice:2,salePrice:9,emoji:'🧲',desc:'Cornicetta magnetica in plexiglass colorato per frigo. Foto formato polaroid. Set 3 pz.',tags:'frigo, magnete, foto, polaroid, cucina, colorato',material:'Plexy colorato 3mm',size:'10×8cm',productionTime:6,trendScore:83,etsyRef:'https://www.etsy.com/search?q=cornicetta+magnetica+plexiglass+frigo',notes:''},
    {id:63,name:'Borsello Juta Personalizzato',category:'Accessori',costPrice:4,salePrice:14,emoji:'👜',desc:'Borsello in juta con nome o logo inciso al laser. Shopper ecologica personalizzata.',tags:'juta, borsello, shopper, eco, personalizzato, laser',material:'Juta naturale',size:'38×42cm',productionTime:8,trendScore:74,etsyRef:'https://www.etsy.com/search?q=borsa+juta+personalizzata+laser',notes:''},

    // Bonus premium products
    {id:64,name:'Lightbox LED Scritta Luminosa',category:'Home Decor',costPrice:35,salePrice:95,emoji:'💬',desc:'Lightbox in legno con scritta luminosa personalizzata su plexiglass retroilluminato. Effetto neon anni 80.',tags:'lightbox, led, scritta, neon, luce, personalizzato',material:'Betulla + Plexy opal + LED',size:'40×25cm',productionTime:60,trendScore:94,etsyRef:'https://www.etsy.com/search?q=lightbox+legno+personalizzato+led',notes:'Prodotto premium molto fotografabile. Ottimo per social.'},
    {id:65,name:'Porta Cellulare / Dock Legno',category:'Corporate',costPrice:10,salePrice:30,emoji:'📱',desc:'Dock porta cellulare in legno con scanalatura caricabatterie. Con nome o logo.',tags:'dock, cellulare, legno, scrivania, ufficio',material:'Noce 12mm',size:'12×8cm',productionTime:15,trendScore:72,etsyRef:'https://www.etsy.com/search?q=dock+cellulare+legno+personalizzato',notes:''},
    {id:66,name:'Pianta Succulenta Legno Deco',category:'Home Decor',costPrice:8,salePrice:25,emoji:'🌵',desc:'Pianta decorativa in legno a strati con vaso sagomato. Nessuna cura necessaria. Eco-deco.',tags:'pianta, succulenta, legno, decorazione, eco, layered',material:'Betulla 3mm colorata',size:'20×15cm',productionTime:20,trendScore:69,etsyRef:'https://www.etsy.com/search?q=pianta+legno+decorativa+laser',notes:''},
    {id:67,name:'Portamonete Plexiglass Zipper',category:'Accessori',costPrice:3,salePrice:12,emoji:'👛',desc:'Portamonete in plexiglass colorato con chiusura zip. Forma geometrica con nome inciso.',tags:'portamonete, plexiglass, zip, accessori, regalo',material:'Plexy colorato 3mm',size:'10×8cm',productionTime:8,trendScore:71,etsyRef:'https://www.etsy.com/search?q=portamonete+plexiglass+personalizzato',notes:''},
    {id:68,name:'Set Portaposate Tonda Legno',category:'Home Decor',costPrice:20,salePrice:58,emoji:'🍴',desc:'Portaposate rotondo in legno con scomparti e nome famiglia. Elegante per cucina o tavola.',tags:'portaposate, legno, cucina, tavola, elegante',material:'Bambù 12mm',size:'20cm diam',productionTime:30,trendScore:73,etsyRef:'https://www.etsy.com/search?q=portaposate+legno+personalizzato',notes:''},
    {id:69,name:'Kit Fai-da-te Laser Incisione',category:'Digital',costPrice:0,salePrice:29,emoji:'🛠️',desc:'Kit digitale completo: 10 design SVG pronti laser + istruzioni impostazioni macchina per principianti.',tags:'svg, kit, tutorial, laser, file, principianti',material:'File digitale',size:'—',productionTime:0,trendScore:78,etsyRef:'https://www.etsy.com/search?q=kit+svg+laser+incisione+principianti',notes:'Prodotto digitale passivo. Aggiornare periodicamente.'},
    {id:70,name:'Libro Primo Anno Bambino',category:'Kids',costPrice:30,salePrice:82,emoji:'👣',desc:'Album del primo anno del bambino con copertina in legno incisa. Pagine per 12 mesi di ricordi.',tags:'bambino, primo anno, album, legno, ricordi, mesi',material:'Betulla 4mm + album A4',size:'A4',productionTime:35,trendScore:91,etsyRef:'https://www.etsy.com/search?q=album+primo+anno+bambino+legno',notes:'Prodotto premium alto valore percepito.'},
  ],
  materials:[
    {id:1,name:'Plexiglass 3mm',unit:'mq',costPer:8.50,supplier:''},
    {id:2,name:'Compensato 3mm',unit:'mq',costPer:6.00,supplier:''},
    {id:3,name:'Carta Transfer',unit:'foglio',costPer:0.30,supplier:''},
    {id:4,name:'Felt Adesivo',unit:'foglio',costPer:0.80,supplier:''},
  ],
  projects:[],
  team:[],
  events:[],
  innovation:[],
  bu:[],
  equipment:[],
  components:[],
  settings:{key:'main',theme:'dark',language:'it',currency:'EUR'},
};

// ===== IMAGE LIBRARY =====
const ImageLib={
  _filter:'',
  _folder:'',
  _pickerCallback:null, // 'catalog' | 'project' | function
  _pickerFilter:'',
  _pickerSearch:'',

  // ── UPLOAD ──────────────────────────────────────
  async uploadFiles(input){
    const files=[...input.files];
    if(!files.length)return;
    let saved=0,skipped=0;
    for(const file of files){
      if(file.size>5*1024*1024){toast(`${file.name}: troppo grande (max 5MB)`,'warning');skipped++;continue;}
      const data=await this._readFile(file);
      const img={
        name:file.name.replace(/\.[^.]+$/,''),
        filename:file.name,
        folder:this._folder||'Generale',
        data,
        type:file.type,
        size:file.size,
        width:0,height:0,
        uploadedAt:new Date().toISOString().split('T')[0]
      };
      /* Qui si leggevano le dimensioni da `dataUrl`, che in questo file non
         esiste: compariva una volta sola e non era mai stata definita. La
         promessa veniva rifiutata da un ReferenceError, `uploadFiles` usciva
         con un'eccezione, e `IDB.put` non veniva mai raggiunto. Nessuna
         immagine è mai stata salvata nella libreria, e la funzione non lo
         diceva — restituiva solo il silenzio.

         E mancava `onerror`: un file corrotto non avrebbe mai risolto la
         promessa, lasciando l'upload appeso per sempre. Le dimensioni sono un
         dato in più, non una condizione: se non si leggono, l'immagine si
         salva lo stesso. */
      await new Promise(res=>{
        const i=new Image();
        i.onload=()=>{img.width=i.width;img.height=i.height;res();};
        i.onerror=()=>res();
        i.src=data;
      });
      await IDB.put('image_lib',img).catch(()=>{});
      saved++;
    }
    input.value='';
    toast(`${saved} immagine/i salvata/e in Libreria! 📸`);
    await this.render();
  },
  dropFiles(e){
    const dt=e.dataTransfer;
    const fake={files:dt.files,value:''};
    this.uploadFiles(fake);
  },
  _readFile(file){
    return new Promise((res,rej)=>{
      const r=new FileReader();
      r.onload=e=>res(e.target.result);
      r.onerror=()=>rej();
      r.readAsDataURL(file);
    });
  },

  // ── RENDER ──────────────────────────────────────
  async render(){
    let items=await IDB.getAll('image_lib');
    // Populate folder selects
    const folders=[...new Set(items.map(i=>i.folder||'Generale'))].sort();
    ['imagelib-folder-filter','picker-folder-filter'].forEach(id=>{
      const sel=eid(id);if(!sel)return;
      const cur=sel.value;
      sel.innerHTML=`<option value="">📁 Tutte le cartelle</option>`+folders.map(f=>`<option value="${f}">${f} (${items.filter(i=>(i.folder||'Generale')===f).length})</option>`).join('');
      if(cur)sel.value=cur;
    });
    // KPIs
    const kpis=eid('imagelib-kpis');
    const totalSize=items.reduce((a,i)=>a+i.size,0);
    if(kpis)kpis.innerHTML=[
      {l:'📸 Immagini Totali',v:items.length,c:'var(--primary)'},
      {l:'📁 Cartelle',v:folders.length,c:'var(--blue)'},
      {l:'💾 Spazio Usato',v:this._fmtSize(totalSize),c:'var(--orange)'},
      {l:'🕐 Ultima Upload',v:items.sort((a,b)=>b._upd-a._upd)[0]?.uploadedAt||'—',c:'var(--green)'},
    ].map(k=>`<div class="kpi-card"><div class="kpi-value" style="font-size:18px">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');
    // Show dropzone when empty
    const dropzone=eid('imagelib-dropzone');
    if(dropzone)dropzone.style.display=items.length===0?'block':'none';
    // Filter
    if(this._folder)items=items.filter(i=>(i.folder||'Generale')===this._folder);
    if(this._filter)items=items.filter(i=>(i.name+i.filename+i.folder).toLowerCase().includes(this._filter));
    const countEl=eid('imagelib-count');
    if(countEl)countEl.textContent=`${items.length} immagine/i`;
    const el=eid('imagelib-grid');if(!el)return;
    if(!items.length){
      el.innerHTML=`<div class="card" style="text-align:center;padding:40px">
        <div style="font-size:48px;margin-bottom:12px">🖼️</div>
        <div style="color:var(--text-muted);margin-bottom:16px">Nessuna immagine trovata${this._filter||this._folder?' per i filtri attivi':' — carica le prime immagini!'}</div>
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('imagelib-upload').click()"><i class="fas fa-upload"></i> Carica Immagini</button>
      </div>`;
      return;
    }
    // Group by folder
    const grouped={};
    items.forEach(i=>{const f=i.folder||'Generale';if(!grouped[f])grouped[f]=[];grouped[f].push(i);});
    el.innerHTML=Object.entries(grouped).map(([folder,imgs])=>`
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid var(--border)">
          <i class="fas fa-folder" style="color:#fbbf24"></i>
          <strong style="font-size:14px">${folder}</strong>
          <span style="background:var(--bg-card2);color:var(--text-muted);font-size:11px;padding:1px 7px;border-radius:99px">${imgs.length}</span>
          <button style="margin-left:auto;padding:3px 10px;background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border2);border-radius:5px;font-size:10px;cursor:pointer" onclick="ImageLib.renameFolder('${folder}')">✏️ Rinomina</button>
          <button style="padding:3px 10px;background:var(--red)18;color:var(--red);border:1px solid var(--red)40;border-radius:5px;font-size:10px;cursor:pointer" onclick="ImageLib.deleteFolder('${folder}')">🗑️ Elimina Cartella</button>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">
          ${imgs.map(img=>`<div class="card" style="padding:0;overflow:hidden;cursor:pointer;transition:.15s" onmouseenter="this.style.transform='scale(1.02)'" onmouseleave="this.style.transform=''">
            <div style="height:110px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--bg-card2);position:relative" onclick="ImageLib.openDetail(${img.id})">
              <img src="${img.data}" style="width:100%;height:100%;object-fit:cover" loading="lazy">
              <div style="position:absolute;inset:0;background:rgba(0,0,0,.4);opacity:0;transition:.2s;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:#fff" onmouseenter="this.style.opacity=1" onmouseleave="this.style.opacity=0">
                <span onclick="event.stopPropagation();ImageLib.openDetail(${img.id})" title="Dettaglio" style="cursor:pointer;background:rgba(255,255,255,.2);padding:5px 8px;border-radius:5px"><i class="fas fa-eye"></i></span>
                <span onclick="event.stopPropagation();ImageLib.copyToClipboard(${img.id})" title="Copia URL" style="cursor:pointer;background:rgba(255,255,255,.2);padding:5px 8px;border-radius:5px"><i class="fas fa-copy"></i></span>
                <span onclick="event.stopPropagation();ImageLib.deleteImg(${img.id})" title="Elimina" style="cursor:pointer;background:rgba(239,68,68,.6);padding:5px 8px;border-radius:5px"><i class="fas fa-trash"></i></span>
              </div>
            </div>
            <div style="padding:8px 10px">
              <div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${img.name}">${img.name}</div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px">${img.width&&img.height?img.width+'×'+img.height+' · ':''} ${this._fmtSize(img.size)}</div>
              <div style="font-size:10px;color:var(--text-dim)">${img.uploadedAt}</div>
              <div style="display:flex;gap:4px;margin-top:6px">
                <button style="flex:1;padding:3px;background:var(--primary)20;color:var(--primary);border:1px solid var(--primary)40;border-radius:4px;font-size:10px;cursor:pointer" onclick="ImageLib.useInCatalog(${img.id})">📦 Catalogo</button>
                <button style="flex:1;padding:3px;background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border2);border-radius:4px;font-size:10px;cursor:pointer" onclick="ImageLib.moveImg(${img.id},'${folder}')">📁 Sposta</button>
              </div>
            </div>
          </div>`).join('')}
        </div>
      </div>
    `).join('');
  },

  // ── PICKER (for Catalog / Projects) ─────────────
  async openPicker(target){
    this._pickerCallback=target;
    this._pickerSearch='';
    this._pickerFilter='';
    await this.renderPicker();
    openModal('imagepicker');
  },
  async renderPicker(){
    let items=await IDB.getAll('image_lib');
    const folders=[...new Set(items.map(i=>i.folder||'Generale'))].sort();
    const sel=eid('picker-folder-filter');
    if(sel)sel.innerHTML=`<option value="">Tutte le cartelle</option>`+folders.map(f=>`<option value="${f}">${f}</option>`).join('');
    if(this._pickerFilter)items=items.filter(i=>(i.folder||'Generale')===this._pickerFilter);
    if(this._pickerSearch)items=items.filter(i=>(i.name+i.filename).toLowerCase().includes(this._pickerSearch));
    const el=eid('imagepicker-grid');if(!el)return;
    if(!items.length){el.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted)">Nessuna immagine in libreria.<br><button class="btn btn-primary btn-sm mt-16" onclick="closeModal('imagepicker');App.navigate('imagelib')">Vai alla Libreria</button></div>`;return;}
    el.innerHTML=items.map(img=>`<div style="cursor:pointer;border-radius:8px;overflow:hidden;border:2px solid var(--border);transition:.15s" onmouseenter="this.style.borderColor='var(--primary)'" onmouseleave="this.style.borderColor='var(--border)'" onclick="ImageLib.pickerSelect(${img.id})">
      <div style="height:90px;overflow:hidden;background:var(--bg-card2);display:flex;align-items:center;justify-content:center">
        <img src="${img.data}" style="width:100%;height:100%;object-fit:cover" loading="lazy">
      </div>
      <div style="padding:4px 6px">
        <div style="font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600">${img.name}</div>
        <div style="font-size:9px;color:var(--text-dim)">${img.folder||'Generale'}</div>
      </div>
    </div>`).join('');
  },
  pickerSearch(v){this._pickerSearch=v.toLowerCase();this.renderPicker();},
  pickerFilter(v){this._pickerFilter=v;this.renderPicker();},
  async pickerSelect(id){
    const img=await IDB.get('image_lib',id);if(!img)return;
    closeModal('imagepicker');
    if(this._pickerCallback==='catalog'){
      Catalog._photo=img.data;
      const prev=eid('cat-photo-preview');
      if(prev)prev.innerHTML=`<img src="${img.data}" style="width:100%;height:100%;object-fit:cover;border-radius:4px">`;
      toast(`Immagine "${img.name}" selezionata per il catalogo ✅`);
    }else if(this._pickerCallback==='project'){
      Projects._photo=img.data;
      const prev=eid('proj-photo-preview');
      if(prev)prev.innerHTML=`<img src="${img.data}" style="width:100%;height:100%;object-fit:cover;border-radius:4px">`;
      toast(`Immagine "${img.name}" selezionata per il progetto ✅`);
    }else if(typeof this._pickerCallback==='function'){
      this._pickerCallback(img);
    }
  },

  // ── FOLDER MANAGEMENT ───────────────────────────
  createFolder(){
    const name=prompt('Nome nuova cartella:','Nuova Cartella');
    if(!name)return;
    this._folder=name;
    toast(`Cartella "${name}" creata. Carica immagini per popolarla.`,'info');
    const sel=eid('imagelib-folder-filter');if(sel)sel.value=name;
    this.render();
  },
  async renameFolder(oldName){
    const newName=prompt('Nuovo nome cartella:',oldName);
    if(!newName||newName===oldName)return;
    const items=await IDB.getAll('image_lib');
    const toUpdate=items.filter(i=>(i.folder||'Generale')===oldName);
    for(const img of this._images||[]){ img.folder=newName; await IDB.put('image_lib',img).catch(()=>{}); }
    toast(`Cartella rinominata in "${newName}"`);
    await this.render();
  },
  async deleteFolder(folder){
    if(!confirm(`Eliminare TUTTA la cartella "${folder}" e tutte le sue immagini?`))return;
    const items=await IDB.getAll('image_lib');
    const toDelete=items.filter(i=>(i.folder||'Generale')===folder);
    for(const img of toDelete)await IDB.del('image_lib',img.id)
    toast(`Cartella "${folder}" eliminata (${toDelete.length} immagini)`,'warning');
    this._folder='';
    await this.render();
  },
  async moveImg(id,currentFolder){
    const items=await IDB.getAll('image_lib');
    const folders=[...new Set(items.map(i=>i.folder||'Generale'))].sort();
    const target=prompt(`Sposta in cartella:\nCartelle esistenti: ${folders.join(', ')}\n\nNome cartella di destinazione:`,currentFolder);
    if(!target||target===currentFolder)return;
    const img=await IDB.get('image_lib',id).catch(()=>null); if(!img)return;
    await IDB.put('image_lib',img).catch(()=>{});arget;
    await IDB.put('image_lib',img);
    toast(`Spostata in "${target}"`);
    await this.render();
  },

  // ── DETAIL / USE ─────────────────────────────────
  async openDetail(id){
    const img=await IDB.get('image_lib',id);if(!img)return;
    const body=eid('imagelib-detail-body');
    const titleEl=eid('imagelib-detail-title');
    if(titleEl)titleEl.textContent=img.name;
    if(body)body.innerHTML=`
      <div style="text-align:center;margin-bottom:16px">
        <img src="${img.data}" style="max-width:100%;max-height:280px;border-radius:var(--radius);border:1px solid var(--border)">
      </div>
      <div class="form-group">
        <label class="form-label">Nome</label>
        <input class="form-control" id="img-detail-name" value="${img.name}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Cartella</label>
          <input class="form-control" id="img-detail-folder" value="${img.folder||'Generale'}">
        </div>
        <div class="form-group">
          <label class="form-label">Info</label>
          <div style="font-size:12px;color:var(--text-muted);padding:8px 0">
            ${img.width&&img.height?`📐 ${img.width}×${img.height}px<br>`:''}
            💾 ${this._fmtSize(img.size)}<br>
            📅 ${img.uploadedAt}
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        <button class="btn btn-primary btn-sm" onclick="ImageLib.saveDetail(${id})"><i class="fas fa-save"></i> Salva modifiche</button>
        <button class="btn btn-secondary btn-sm" onclick="ImageLib.downloadImg(${id})"><i class="fas fa-download"></i> Scarica</button>
        <button class="btn btn-secondary btn-sm" onclick="ImageLib.copyToClipboard(${id})"><i class="fas fa-copy"></i> Copia URL</button>
        <button class="btn btn-secondary btn-sm" style="color:var(--red)" onclick="ImageLib.deleteImg(${id});closeModal('imagelib-detail')"><i class="fas fa-trash"></i> Elimina</button>
      </div>`;
    const useBtn=eid('imagelib-detail-use-btn');
    if(useBtn){useBtn.onclick=()=>{closeModal('imagelib-detail');ImageLib.useInCatalog(id);};}
    openModal('imagelib-detail');
  },
  async saveDetail(id){
    const img=await IDB.get('image_lib',id);if(!img)return;
    img.name=eid('img-detail-name')?.value||img.name;
    img.folder=eid('img-detail-folder')?.value||'Generale';
        await IDB.put('image_lib',img).catch(()=>{});
    await IDB.put('image_lib',img);
    toast('Aggiornato!');
    closeModal('imagelib-detail');
    await this.render();
  },
  async useInCatalog(id){
    const img=await IDB.get('image_lib',id);if(!img)return;
    // Open catalog modal and set photo
    await Catalog.openModal();
    Catalog._photo=img.data;
    const prev=eid('cat-photo-preview');
    if(prev)prev.innerHTML=`<img src="${img.data}" style="width:100%;height:100%;object-fit:cover;border-radius:4px">`;
    toast(`Immagine "${img.name}" pronta nel form Catalogo ✅`);
  },

  // ── DELETE ───────────────────────────────────────
  async deleteImg(id){
    if(!confirm('Eliminare questa immagine dalla Libreria?'))return;
    await IDB.del('image_lib',id)
    toast('Immagine eliminata','warning');
    await this.render();
  },

  // ── DOWNLOAD ─────────────────────────────────────
  async downloadImg(id){
    const img=await IDB.get('image_lib',id);if(!img)return;
    const a=document.createElement('a');
    a.href=img.data;
    a.download=img.filename||img.name+'.jpg';
    a.click();
  },
  async copyToClipboard(id){
    const img=await IDB.get('image_lib',id);if(!img)return;
    try{await navigator.clipboard.writeText(img.data);toast('URL base64 copiato negli appunti ✅');}
    catch{toast('Copia non supportata dal browser','warning');}
  },

  // ── BACKUP EXPORT / IMPORT ───────────────────────
  async exportBackup(){
    const items=await IDB.getAll('image_lib');
    if(!items.length){toast('Nessuna immagine da esportare','warning');return;}
    const backup={
      version:1,
      exportDate:new Date().toISOString(),
      count:items.length,
      totalSize:items.reduce((a,i)=>a+i.size,0),
      images:items
    };
    const safeImgs = backup.images.map(img=>({...img, data: img.data?.substring?.(0,100000)||img.data}));
    const safeBk = {...backup, images: safeImgs};
    const blob=new Blob([JSON.stringify(safeBk)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`ingly-images-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Backup esportato: ${items.length} immagini (${this._fmtSize(backup.totalSize)}) 💾`);
  },
  async importBackup(input){
    const file=input.files[0];if(!file)return;
    try{
      const text=await file.text();
      const backup=JSON.parse(text);
      if(!backup.images||!Array.isArray(backup.images)){toast('File backup non valido','warning');return;}
      if(!confirm(`Importare ${backup.images.length} immagini dal backup del ${backup.exportDate?.split('T')[0]||'?'}?\n\nLe immagini esistenti NON verranno eliminate.`))return;
      let count=0;
                for(const img of backup.images||[]){ await IDB.put('image_lib',img).catch(()=>{});
        await IDB.put('image_lib',img);
        count++;
      }
      toast(`${count} immagini importate! 📸`);
      input.value='';
      await this.render();
    }catch(e){toast('Errore durante importazione','warning');console.error(e);}
  },

  // ── FILTERS ──────────────────────────────────────
  search(v){this._filter=v.toLowerCase();this.render();},
  filterFolder(v){this._folder=v;this.render();},

  // ── UTILS ────────────────────────────────────────
  _fmtSize(bytes){
    if(bytes<1024)return bytes+'B';
    if(bytes<1024*1024)return (bytes/1024).toFixed(1)+'KB';
    return (bytes/1024/1024).toFixed(2)+'MB';
  }
};

// ===== INGLY DESIGN (Business Plan) =====
const InglyDesign={
  activeTab:'executive',
  SECTIONS:[
    {id:'executive',icon:'📑',title:'Executive Summary'},
    {id:'company',icon:'🗂️',title:'Company Overview'},
    {id:'market',icon:'📊',title:'Market Analysis'},
    {id:'products',icon:'💡',title:'Products & Services'},
    {id:'marketing',icon:'📢',title:'Marketing & Sales Strategy'},
    {id:'operations',icon:'⚙️',title:'Operations & Management'},
    {id:'financial',icon:'💵',title:'Financial Plan'},
    {id:'risks',icon:'⚠️',title:'Risk Analysis'},
    {id:'docs',icon:'📎',title:'Documenti & Appendici'},
  ],
  DEFAULTS:{
    executive:`## 💎 Executive Summary — Ingly Design

**Ingly Design** uno studio di personalizzazione laser e design artigianale specializzato nella creazione di prodotti unici incisi al laser, tagliati a CNC e stampati in 3D.

**Missione:** Trasformare momenti speciali in oggetti fisici che durano per sempre, con la precisione del digitale e il calore dell'artigianato.

**Proposta di Valore:** Ogni prodotto è unico, realizzato su misura in 24–72h con materiali di qualità premium.

**Target 2026:**
- Revenue: €60.000+
- Canali: Etsy (primario), B2B Corporate, Social Media
- Espansione: sito proprietario + showroom digitale`,
    company:`## 🗂️ Company Overview

**Nome:** Ingly Design
**Settore:** Artigianato digitale / Personalizzazione laser
**Fondazione:** 2023
**Sede:** Italia
**Team:** 1–3 persone (fondatore + collaboratori freelance)

**Struttura Legale:** Ditta individuale (possibile passaggio a SRL nel 2026)

**Servizi Core:**
1. Incisione laser su legno, plexy, MDF, tessuto
2. Taglio sagomato CNC e laser
3. Prodotti wedding & cerimonia
4. Personalizzazione corporate B2B
5. Stampa 3D FDM e resina

**Canali Distributivi:**
- Etsy Shop (principale)
- Instagram / Social DM
- WhatsApp Business
- Fiere & Mercatini
- (in arrivo) E-commerce proprio`,
    market:`## 📊 Market Analysis

**Mercato:** Artigianato digitale personalizzato — Italia + EU Export (Etsy)

**Dimensione Mercato:**
- Etsy: +25% crescita YoY sul segmento personalizzazione
- Regali personalizzati Italia: mercato da €1.2 miliardi
- Matrimoni Italia 2026: circa 190.000 matrimoni previsti

**Trend 2025-2026:**
- Crescita del "gifting" personalizzato (+32% ricerche)
- Domanda B2B per gadget aziendali laser (+18%)
- Bambini e comunioni: segmento in crescita costante
- Lampade LED personalizzate: trend in forte ascesa

**Competitor:**
- Grandi: Amazon Handmade, grandi seller Etsy
- Locali: artigiani individuali (nessun sistema gestionale)
- **Vantaggio competitivo:** velocità (24h), qualità premium, sistema gestionale proprietario

**Target Cliente:**
- Spose 25–40 (wedding)
- Mamme 30–50 (regali famiglia)
- HR Manager PMI (corporate)
- Privati per occasioni speciali`,
    products:`## 💡 Products & Services

**LINEA WEDDING (40% revenue):**
- Portachiavi sposi personalizzati
- Segnaposto legno con nome ospite
- Album copertina legno
- Box fedi anelli
- Menu in legno

**LINEA HOME DECOR (25% revenue):**
- Taglieri personalizzati
- Mappe città layered 3D
- Lampade LED nome
- Orologio parete inciso
- Wall art mandala

**LINEA BAMBINI (20% revenue):**
- Puzzle nome 3D
- Cornici nascita/battesimo
- Toppers torta compleanno
- Targa camera bambino
- Cornici comunione/cresima

**LINEA CORPORATE B2B (10% revenue):**
- Targhe aziendali plexiglass
- Award & trofei
- Box gadget corporate
- Portachiavi logo bulk

**LINEA ACCESSORI (5% revenue):**
- Orecchini laser cut legno
- Segnalibri acrilico
- Portachiavi personalizzati`,
    marketing:`## 📢 Marketing & Sales Strategy

**Strategia Omnichannel 2026:**

**Etsy (40%):**
- Ottimizzazione SEO titoli e tag
- 5 foto professionali per prodotto
- Reviews: target 200+ entro Q2
- Etsy Ads: budget €150/mese

**Instagram/TikTok (30%):**
- 4 post/settimana (processo + prodotto finito)
- Reel processi laser: alto engagement
- Story: behind the scenes
- Collaborazioni con wedding planner

**WhatsApp Business (15%):**
- Lista broadcast clienti VIP
- Catalogo prodotti in-app
- Risposte in 2h

**B2B Outreach (15%):**
- LinkedIn per corporate
- Email marketing stagionale
- Fiere: 3 eventi/anno

**Budget Marketing Mensile:** €300–€500
**CAC Target:** <€15 per cliente`,
    operations:`## ⚙️ Operations & Management

**Processo Produttivo:**
1. Ricezione ordine → conferma in 2h
2. Preparazione file design → 4–8h
3. Produzione laser → 1–4h
4. Controllo qualità → 30min
5. Packaging personalizzato → 30min
6. Spedizione → entro 24–72h

**Attrezzature Core:**
- Laser CO2 100W (principale)
- Stampante 3D Bambu X1C
- Stampante 3D Elegoo Saturn 3 (resina)
- CNC Router 3 assi

**Fornitori Chiave:**
- Legno: LegnoBrianza, ForestItalia
- Plexiglass: Plastimarket
- MDF: MDFItalia, PannelliLux
- Spedizioni: BRT, GLS

**KPI Operativi:**
- Lead time ordini: 24–72h
- % ordini in tempo: target >95%
- Defect rate: <2%
- Ore produzione/giorno: 6–8h`,
    financial:`## 💵 Financial Plan 2026

**Obiettivi Revenue:**
- Q1 2026: €12.000
- Q2 2026: €18.000 (stagione matrimoni)
- Q3 2026: €14.000
- Q4 2026: €16.000 (Natale)
- **TOTALE: €60.000**

**Struttura Costi Mensili:**
- Materiali (35% revenue): ~€1.750
- Marketing: €400
- Energia/Affitto: €600
- Software & Tools: €150
- Spedizioni: €300
- **TOT. Costi Fissi: ~€1.450/mese**

**Break Even:** ~40 ordini/mese (€35 avg)
**Margine Target:** 55–65%
**LTV Cliente:** €240 (avg 4 acquisti × €60 × 1 anno)
**CAC Target:** €15–€25

**Piano Investimenti 2026:**
- Upgrade laser CO2 (se necessario): €3.000
- Sito e-commerce: €1.500
- Marketing extra: €2.000`,
    risks:`## ⚠️ Risk Analysis

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|-------------|---------|-------------|
| Rottura macchina laser | Media | Alto | Manutenzione preventiva, assicurazione, backup CNC |
| Aumento prezzi materie prime | Alta | Medio | Fornitori multipli, stock buffer 30gg |
| Stagionalità estrema | Alta | Medio | Diversificare canali, produzione anticipata |
| Concorrenza low-cost Cina | Media | Medio | Focus qualità premium e personalizzazione |
| Dipendenza Etsy | Alta | Alto | Sviluppo canale diretto (sito proprio) |
| Mancanza liquidità | Bassa | Alto | Anticipo ordini, fido bancario standby |
| Errori produzione | Bassa | Medio | Doppio controllo qualità, politica sostituzione |

**Piano di Contingenza:**
- Fondo emergenza: 3 mesi di costi fissi (~€4.350)
- Backup produzione: accordi con laboratori partner
- Assicurazione attrezzature: €200/anno`,
    docs:`## 📎 Documenti & Appendici

**Documenti Legali:**
- P.IVA: (inserire)
- Codice Ateco: 32.99.9 (Altri prodotti manifatturieri NCA)
- REA: (inserire)
- Regime fiscale: Forfettario 15%

**Allegati:**
- Portfolio prodotti Etsy: [link shop]
- Listino prezzi 2026: vedi sezione Catalogo
- Certificazioni materiali: (allegare)
- Contratto tipo cliente: vedi sezione Legale

**Note Storiche:**
- 2023: Fondazione come "Cosa Giftare"
- 2024: Prima stagione Etsy, €18.000 revenue
- 2025: Crescita 65%, €30.000 revenue
- 2026: Rebrand "Ingly Design", obiettivo €60.000

**Visione 2027:**
- Apertura showroom fisico/pop-up
- Corso di personalizzazione laser
- Linea prodotti in co-branding
- Revenue target: €120.000`
  },
  async render(){await this.tab(this.activeTab,null);this.checkAllStockAlerts?.();},
  async tab(t,btn){
    const matEl=eid('view-materials');if(!matEl)return;
    const sortMode=localStorage.getItem('mat_sort')||'cat';
    // Re-render header with sort controls if needed
    if(!eid('mat-sort-select')){
      const ph=eid('materials-filter-area');
      if(ph){
        const sortEl=document.createElement('div');
        sortEl.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px';
        sortEl.innerHTML=`<label style="font-size:11px;color:var(--text-muted)">Ordina per:</label>
          <select id="mat-sort-select" onchange="localStorage.setItem('mat_sort',this.value);Materials.tab(Materials.activeTab,null)" style="background:var(--bg-card2);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:6px;font-size:12px">
            <option value="cat" ${sortMode==='cat'?'selected':''}>📂 Categoria</option>
            <option value="stock" ${sortMode==='stock'?'selected':''}>📦 Disponibilità</option>
            <option value="price_asc" ${sortMode==='price_asc'?'selected':''}>💰 Prezzo ↑</option>
            <option value="price_desc" ${sortMode==='price_desc'?'selected':''}>💰 Prezzo ↓</option>
            <option value="thick" ${sortMode==='thick'?'selected':''}>📏 Spessore</option>
            <option value="name" ${sortMode==='name'?'selected':''}>🔤 Nome A-Z</option>
          </select>
          <label style="font-size:11px;color:var(--text-muted);margin-left:8px">Vista:</label>
          <button onclick="localStorage.setItem('mat_view','table');Materials.tab(Materials.activeTab,null)" style="padding:3px 8px;background:${localStorage.getItem('mat_view')==='table'?'var(--primary)':'var(--bg-card2)'};color:${localStorage.getItem('mat_view')==='table'?'#000':'var(--text)'};border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:11px">📋 Tabella</button>
          <button onclick="localStorage.setItem('mat_view','grid');Materials.tab(Materials.activeTab,null)" style="padding:3px 8px;background:${localStorage.getItem('mat_view')==='grid'||!localStorage.getItem('mat_view')?'var(--primary)':'var(--bg-card2)'};color:${localStorage.getItem('mat_view')==='grid'||!localStorage.getItem('mat_view')?'#000':'var(--text)'};border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:11px">⬜ Griglia</button>`;
        ph.parentNode.insertBefore(sortEl, ph);
      }
    }
    this.activeTab=t;
    // Load live KPIs
    try{
      const sales=await AppStore.get('sales').catch(()=>[]);
      const clients=await AppStore.get('clients').catch(()=>[]);
      const quotes=await AppStore.get('quotes').catch(()=>[]);
      const now=new Date();
      const ytdRev=sales.filter(s=>s.status==='pagato'&&new Date(s.date||0).getFullYear()===now.getFullYear()).reduce((a,s)=>a+(+s.amount||0),0);
      const thisMonth=sales.filter(s=>s.status==='pagato'&&s.date?.slice(0,7)===now.toISOString().slice(0,7)).reduce((a,s)=>a+(+s.amount||0),0);
      const pending=quotes.filter(q=>q.status==='inviato'||q.status==='bozza').reduce((a,q)=>a+(+q.grossPrice||0),0);
      const kpiEl=eid('id-live-kpis');
      if(kpiEl)kpiEl.innerHTML=[
        {l:'Revenue YTD',v:fmtCur(ytdRev),c:'var(--primary)'},
        {l:'Questo Mese',v:fmtCur(thisMonth),c:'var(--green)'},
        {l:'Clienti Attivi',v:clients.length,c:'var(--blue)'},
        {l:'Pipeline',v:fmtCur(pending),c:'var(--orange)'},
      ].map(k=>`<div class="kpi-card" style="cursor:default"><div class="kpi-value" style="color:${k.c}">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');
    }catch(e){}
    document.querySelectorAll('#view-inglydesign .tab-btn').forEach(b=>b.classList.remove('active'));
    if(btn)btn.classList.add('active');
    else{const btns=document.querySelectorAll('#view-inglydesign .tab-btn');const idx=this.SECTIONS.findIndex(s=>s.id===t);if(btns[idx])btns[idx].classList.add('active');}
    // Load content from IDB or defaults
    const saved=await IDB.get('settings','bp_'+t).catch(()=>null);
    const content=saved?.value||this.DEFAULTS[t]||'';
    // Compute completion
    const el=eid('inglydesign-content');if(!el)return;
    el.innerHTML=`<div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
        <div class="card-title" style="margin:0">${this.SECTIONS.find(s=>s.id===t)?.icon||''} ${this.SECTIONS.find(s=>s.id===t)?.title||t}</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="InglyDesign.togglePreview('${t}')" id="btn-preview-${t}"><i class="fas fa-eye"></i> Preview</button>
          <button class="btn btn-primary btn-sm" onclick="InglyDesign.save('${t}')"><i class="fas fa-save"></i> Salva</button>
        </div>
      </div>
      <div id="bp-preview-${t}" style="display:none;padding:16px;background:var(--bg-card2);border-radius:var(--radius);margin-bottom:12px;font-size:13px;line-height:1.7">${this.mdToHtml(content)}</div>
      <textarea id="bp-editor-${t}" class="form-control" style="min-height:480px;font-family:monospace;font-size:13px;line-height:1.6;tab-size:2;resize:vertical">${content}</textarea>
      <div style="margin-top:8px;font-size:11px;color:var(--text-dim)">💡 Supporta Markdown: **grassetto**, *corsivo*, ## Titoli, - Lista, | Tabella |</div>
    </div>
    <!-- Navigation between sections -->
    <div style="display:flex;justify-content:space-between;margin-top:12px">
      ${this.SECTIONS.findIndex(s=>s.id===t)>0?`<button class="btn btn-secondary btn-sm" onclick="InglyDesign.tab('${this.SECTIONS[this.SECTIONS.findIndex(s=>s.id===t)-1].id}',null)"><i class="fas fa-chevron-left"></i> ${this.SECTIONS[this.SECTIONS.findIndex(s=>s.id===t)-1].title}</button>`:'<div></div>'}
      ${this.SECTIONS.findIndex(s=>s.id===t)<this.SECTIONS.length-1?`<button class="btn btn-primary btn-sm" onclick="InglyDesign.save('${t}',true)">Salva e avanza: ${this.SECTIONS[this.SECTIONS.findIndex(s=>s.id===t)+1].title} <i class="fas fa-chevron-right"></i></button>`:'<button class="btn btn-primary btn-sm" onclick="InglyDesign.saveAll()"><i class="fas fa-check"></i> Completa Business Plan</button>'}
    </div>`;
    // Update completion bar
    await this.updateCompletion();
  },
  togglePreview(t){
    const preview=eid(`bp-preview-${t}`);
    const editor=eid(`bp-editor-${t}`);
    const btn=eid(`btn-preview-${t}`);
    if(!preview)return;
    const isShown=preview.style.display!=='none';
    if(!isShown){
      preview.innerHTML=this.mdToHtml(editor?.value||'');
      preview.style.display='block';
      if(editor)editor.style.display='none';
      if(btn)btn.innerHTML='<i class="fas fa-edit"></i> Modifica';
    }else{
      preview.style.display='none';
      if(editor)editor.style.display='block';
      if(btn)btn.innerHTML='<i class="fas fa-eye"></i> Preview';
    }
  },
  mdToHtml(md){
    return md
      .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,'<em>$1</em>')
      .replace(/^## (.+)$/gm,'<h3 style="color:var(--primary);border-bottom:1px solid var(--border);padding-bottom:6px;margin:16px 0 10px">$1</h3>')
      .replace(/^# (.+)$/gm,'<h2 style="color:var(--primary);font-size:20px;margin:20px 0 10px">$1</h2>')
      .replace(/^\| (.+) \|$/gm,(m)=>{const cells=m.split('|').filter(c=>c.trim()&&c.trim()!=='---');return`<div style="display:flex;gap:0;border-bottom:1px solid var(--border)">${cells.map(c=>`<div style="flex:1;padding:5px 8px;font-size:12px">${c.trim()}</div>`).join('')}</div>`;})
      .replace(/^\- (.+)$/gm,'<div style="display:flex;gap:6px;margin-bottom:3px">• <span>$1</span></div>')
      .replace(/^\d+\. (.+)$/gm,'<div style="margin-bottom:3px">$1</div>')
      .replace(/\n\n/g,'<br><br>')
      .replace(/\n/g,'<br>');
  },
  async save(t,advance=false){
    if(content===undefined)return;
    await IDB.put('settings',{key:'bp_'+t,value:content}).catch(()=>{});
    toast('Salvato!');
    await this.updateCompletion();
    if(advance){
      const idx=this.SECTIONS.findIndex(s=>s.id===t);
      if(idx<this.SECTIONS.length-1)await this.tab(this.SECTIONS[idx+1].id,null);
    }
  },
  async saveAll(){
    const saves=this.SECTIONS.map(async s=>{
      const content=eid('bp-'+s.id)?.value;
      if(content!==undefined)await IDB.put('settings',{key:'bp_'+s.id,value:content});
    });
    await Promise.all(saves);
    toast('Business Plan salvato completamente! 🎉');
  },
  async updateCompletion(){
    const el=eid('bp-completion-bar');if(!el)return;
    let filled=0;
    for(const s of this.SECTIONS){
      const saved=await IDB.get('settings','bp_'+s.id).catch(()=>null);
      if(saved?.value&&saved.value.length>50)filled++;
    }
    const pct=Math.round(filled/this.SECTIONS.length*100);
    el.innerHTML=`<div style="display:flex;align-items:center;gap:10px;justify-content:center">
      <div style="width:200px;height:8px;background:rgba(255,255,255,.2);border-radius:4px;overflow:hidden">
        <div style="height:8px;width:${pct}%;background:var(--primary);border-radius:4px;transition:width .5s"></div>
      </div>
      <span style="font-size:13px;color:var(--text-muted)">${filled}/${this.SECTIONS.length} sezioni completate (${pct}%)</span>
    </div>`;
  },
  async export(){toast('Funzione esportazione PDF — usa Ctrl+P per stampare','info');}
};



// ══════════════════════════════════════════════════════════════════════
// CURRENCY ENGINE  v78
// Offline-first: cached rates in IDB. Online: fetch ECB XML on demand.
// Supported: EUR (base) · USD · GBP · CHF · JPY · CAD
// ══════════════════════════════════════════════════════════════════════
window.eid = eid;
window.fmtCur = fmtCur;
window.fmtDate = fmtDate;
window.today = today;
window.uid = uid;
window.toast = toast;
window.openModal = openModal;
window.closeModal = closeModal;
window.badgeStatus = badgeStatus;
window.destroyChart = destroyChart;
window.logAction = logAction;
window.snapshotRecord = snapshotRecord;
window.DEFAULTS = DEFAULTS;
window.ImageLib = ImageLib;
window.InglyDesign = InglyDesign;



(function(){
'use strict';

/* ═══════════════════════════════════════════════════════════════
   1. GADGETS WAREHOUSE — 50+ items artigianato laser/3D
   ═══════════════════════════════════════════════════════════════ */
var GADGETS_EXTENDED = [
  // ── LED & Illuminazione ─────────────────────────────────────
  {name:'LED Strip RGB 5m IP20',    category:'LED & Illuminazione',   unit:'pz', cost:4.50,  stock:20,  minStock:5,  usage:'cornici luminose, orologi',       notes:'AliExpress, 12V'},
  {name:'LED Strip Bianco Caldo 1m',category:'LED & Illuminazione',   unit:'pz', cost:1.80,  stock:30,  minStock:10, usage:'retroilluminazione targhe',       notes:'5V USB'},
  {name:'LED Neopixel WS2812B 1m',  category:'LED & Illuminazione',   unit:'pz', cost:6.20,  stock:10,  minStock:3,  usage:'display dinamici',                notes:'controllo Arduino'},
  {name:'Driver LED 12W',           category:'LED & Illuminazione',   unit:'pz', cost:2.80,  stock:15,  minStock:5,  usage:'alimentazione LED fissi',         notes:''},
  {name:'Diffusore PMMA 100x20cm',  category:'LED & Illuminazione',   unit:'pz', cost:3.50,  stock:10,  minStock:3,  usage:'lightbox, targhe illuminate',     notes:'spessore 3mm'},
  // ── Incisione & Stampa ──────────────────────────────────────
  {name:'Compensato Pioppo 30x30cm',category:'Incisione & Stampa',    unit:'pz', cost:1.20,  stock:100, minStock:30, usage:'targhe, decorazioni',             notes:'3mm, qualità laser'},
  {name:'Compensato Betulla 40x40cm',category:'Incisione & Stampa',   unit:'pz', cost:2.80,  stock:50,  minStock:15, usage:'cornici, prodotti premium',       notes:'4mm, bassa resina'},
  {name:'MDF 30x40cm 3mm',         category:'Incisione & Stampa',    unit:'pz', cost:0.90,  stock:80,  minStock:25, usage:'sagome, supporti',                notes:'MDF standard'},
  {name:'Acrilico Trasparente 20x30',category:'Incisione & Stampa',   unit:'pz', cost:3.20,  stock:25,  minStock:8,  usage:'targhe premium, portafoto',       notes:'3mm cast'},
  {name:'Acrilico Nero Opaco 20x30', category:'Incisione & Stampa',   unit:'pz', cost:3.50,  stock:20,  minStock:6,  usage:'targhe eleganti',                 notes:'3mm extruded'},
  {name:'Acrilico Bianco 30x40cm',  category:'Incisione & Stampa',    unit:'pz', cost:4.20,  stock:15,  minStock:5,  usage:'lightbox, illuminati',            notes:'3mm traslucido'},
  {name:'Carta Transfer Laser A4',  category:'Incisione & Stampa',    unit:'foglio', cost:0.35, stock:200,minStock:50,usage:'sublimazione su acrilico',       notes:'formato A4'},
  {name:'Spray Fissativo Trasparente',category:'Incisione & Stampa',  unit:'pz', cost:5.50,  stock:10,  minStock:3,  usage:'finitura protezione',             notes:'400ml, lucido/opaco'},
  // ── Stampa 3D Materials (accesso da Magazzino 3D) ───────────
  {name:'PLA+ Bambu Bianco 1kg',    category:'Stampa 3D & Filamenti', unit:'bobina', cost:24, stock:5, minStock:2,  usage:'stampa FDM standard',             notes:'1kg, ø1.75mm'},
  {name:'PLA+ Bambu Nero 1kg',      category:'Stampa 3D & Filamenti', unit:'bobina', cost:24, stock:4, minStock:2,  usage:'stampa FDM standard',             notes:'1kg, ø1.75mm'},
  {name:'PLA+ Bambu Rosso 1kg',     category:'Stampa 3D & Filamenti', unit:'bobina', cost:24, stock:3, minStock:1,  usage:'stampa FDM',                      notes:'1kg, ø1.75mm'},
  {name:'PETG Bambu 1kg',           category:'Stampa 3D & Filamenti', unit:'bobina', cost:28, stock:3, minStock:1,  usage:'parti funzionali, resistenti',    notes:'alta resistenza termica'},
  {name:'ASA Bambu 1kg',            category:'Stampa 3D & Filamenti', unit:'bobina', cost:32, stock:2, minStock:1,  usage:'esterno, UV resistente',          notes:'weather resistant'},
  {name:'TPU Bambu Flex 95A 1kg',   category:'Stampa 3D & Filamenti', unit:'bobina', cost:34, stock:2, minStock:1,  usage:'parti flessibili, griglie',       notes:'shore 95A'},
  {name:'Resina ABS-Like Elegoo 1L',category:'Stampa 3D & Filamenti', unit:'bottiglia',cost:22,stock:3,minStock:1,  usage:'stampa resina dettaglio alto',    notes:'1L, grigio'},
  {name:'Resina Std Anycubic 500ml',category:'Stampa 3D & Filamenti', unit:'bottiglia',cost:19,stock:2,minStock:1,  usage:'prototipi veloci',                notes:'500ml, trasparente'},
  // ── Minuteria ───────────────────────────────────────────────
  {name:'Calamita Neodimio 20mm',   category:'Minuteria',             unit:'pz', cost:0.15,  stock:200, minStock:50, usage:'bacheche e cornici magnetiche',   notes:'N52, forza 4kg'},
  {name:'Calamita 10x3mm',          category:'Minuteria',             unit:'pz', cost:0.08,  stock:500, minStock:100,usage:'portachiavi, magneti decorativi', notes:'N35'},
  {name:'Gancio D Metallo 3cm',     category:'Minuteria',             unit:'pz', cost:0.20,  stock:100, minStock:30, usage:'portachiavi e ciondoli',          notes:'ottone lucidato'},
  {name:'Anello Split 25mm',        category:'Minuteria',             unit:'pz', cost:0.05,  stock:500, minStock:100,usage:'portachiavi, gioielli',           notes:'acciaio inox'},
  {name:'Moschettone Mini 3cm',     category:'Minuteria',             unit:'pz', cost:0.35,  stock:100, minStock:30, usage:'portachiavi premium',             notes:'alluminio'},
  {name:'Vite M3x8 ottone',         category:'Minuteria',             unit:'pz', cost:0.04,  stock:300, minStock:100,usage:'assemblaggio cornici',            notes:'testa piatta'},
  {name:'Dado M3 inox',             category:'Minuteria',             unit:'pz', cost:0.03,  stock:300, minStock:100,usage:'assemblaggio',                    notes:'esagonale'},
  {name:'Inserto Filettato M3 3D',  category:'Minuteria',             unit:'pz', cost:0.12,  stock:200, minStock:50, usage:'inserti heat-set per stampa 3D', notes:'M3x5.7, ottone'},
  {name:'Inserto Filettato M4 3D',  category:'Minuteria',             unit:'pz', cost:0.18,  stock:100, minStock:30, usage:'giunzioni resistenti stampa 3D', notes:'M4x6, ottone'},
  {name:'Cordino Cerato 80cm',      category:'Minuteria',             unit:'pz', cost:0.12,  stock:200, minStock:50, usage:'collane e portachiavi',           notes:'nero, marrone'},
  // ── Packaging ───────────────────────────────────────────────
  {name:'Sacchetto Organza 10x15',  category:'Packaging',             unit:'pz', cost:0.08,  stock:500, minStock:100,usage:'bomboniere, gadget',              notes:'vari colori'},
  {name:'Scatola Kraft 15x15x8',    category:'Packaging',             unit:'pz', cost:0.45,  stock:100, minStock:30, usage:'packaging standard',              notes:'bianco/kraft'},
  {name:'Scatola Magnetica 20x15',  category:'Packaging',             unit:'pz', cost:1.80,  stock:30,  minStock:10, usage:'packaging premium',               notes:'chiusura magnetica'},
  {name:'Busta Avvolgente 30x40',   category:'Packaging',             unit:'pz', cost:0.15,  stock:200, minStock:50, usage:'protezione spedizioni',           notes:'antigraffio'},
  {name:'Carta Velina Bianca',      category:'Packaging',             unit:'foglio',cost:0.04,stock:500,minStock:100,usage:'imbottitura elegante',            notes:'70g/m²'},
  {name:'Nastro Raso 1cm 10m',      category:'Packaging',             unit:'rotolo',cost:1.20,stock:20, minStock:5,  usage:'fiocchi e chiusure',              notes:'vari colori'},
  {name:'Bigliettino personalizzato',category:'Packaging',            unit:'pz', cost:0.08,  stock:200, minStock:50, usage:'messaggio regalo',                notes:'stampa fronte/retro'},
  {name:'Bolla Spedizione TNT/GLS', category:'Packaging',             unit:'pz', cost:0.05,  stock:100, minStock:30, usage:'spedizioni corriere',             notes:''},
  // ── Resine & Colori ─────────────────────────────────────────
  {name:'Resina Epossidica 1kg',    category:'Resine & Colori',       unit:'kit', cost:18,   stock:5,   minStock:2,  usage:'colate su legno, bijou',         notes:'trasparente, 2 componenti'},
  {name:'Pigmento in Polvere set 12',category:'Resine & Colori',      unit:'set', cost:12,   stock:5,   minStock:2,  usage:'colorazione resina',              notes:'metallico + base'},
  {name:'Colori Acrilici set 24',   category:'Resine & Colori',       unit:'set', cost:14,   stock:4,   minStock:2,  usage:'pittura su legno/MDF',            notes:'Vallejo o similare'},
  {name:'Vernice Spray RAL Nero',   category:'Resine & Colori',       unit:'pz', cost:5.50,  stock:6,   minStock:2,  usage:'finitura laser, protezione',      notes:'400ml, lucido/opaco'},
  {name:'Colla CA Extra Forte 20g', category:'Resine & Colori',       unit:'pz', cost:1.50,  stock:20,  minStock:5,  usage:'assemblaggio rapido',             notes:'cianoacrilato'},
  {name:'Colla Vinilica 500ml',     category:'Resine & Colori',       unit:'pz', cost:4.50,  stock:8,   minStock:3,  usage:'assemblaggio legno',              notes:'D3 resistente acqua'},
  {name:'Primer Spray Grigio',      category:'Resine & Colori',       unit:'pz', cost:5.50,  stock:5,   minStock:2,  usage:'pre-verniciatura stampe 3D',      notes:'400ml, plastica/metallo'},
  {name:'Pasta per Levigare 3D',    category:'Resine & Colori',       unit:'pz', cost:8.50,  stock:3,   minStock:1,  usage:'finitura superfici FDM',          notes:'XTC-3D o similare'},
  // ── Magneti & Ganci ─────────────────────────────────────────
  {name:'Backing Magnetico 3mm',    category:'Magneti & Ganci',       unit:'foglio',cost:3.50,stock:20, minStock:5,  usage:'targhe magnetiche',               notes:'30x21cm, autoadesivo'},
  {name:'Gancio Adesivo 3M Large',  category:'Magneti & Ganci',       unit:'pz', cost:0.80,  stock:50,  minStock:15, usage:'installazione quadri',            notes:'portata 3kg'},
  {name:'Catenella Ottone 45cm',    category:'Magneti & Ganci',       unit:'pz', cost:0.45,  stock:100, minStock:30, usage:'collane e decorazioni',           notes:'placcata oro'},
  // ── Attrezzatura Consumabile ─────────────────────────────────
  {name:'Nastro Laser Biadesivo',   category:'Incisione & Stampa',    unit:'rotolo',cost:6.50,stock:5,  minStock:2,  usage:'fissaggio materiali laser',       notes:'25mm x 25m'},
  {name:'Carta Millimetrata A1',    category:'Incisione & Stampa',    unit:'foglio',cost:0.50,stock:30, minStock:10, usage:'calibrazione laser',              notes:'per test e misure'},
  {name:'Guanti Nitrile (100pz)',   category:'Altro',                  unit:'scatola',cost:8, stock:3,  minStock:1,  usage:'manipolazione resina e vernici',  notes:'taglia M/L'},
  {name:'Alcool Isopropilico 1L',   category:'Altro',                  unit:'pz', cost:5.50,  stock:5,   minStock:2,  usage:'pulizia stampe resina, laser',    notes:'99% purezza'},
  {name:'Foglio Abrasivo 120 grit', category:'Altro',                  unit:'pz', cost:0.40,  stock:30,  minStock:10, usage:'levigatura stampe 3D',            notes:'230x280mm'},
  {name:'Foglio Abrasivo 220 grit', category:'Altro',                  unit:'pz', cost:0.40,  stock:30,  minStock:10, usage:'finitura superfici',              notes:'230x280mm'},
];

// Seed il magazzino gadgets con i nuovi dati
async function seedGadgets(){
  if(typeof IDB === 'undefined') return;
  var existing = await IDB.getAll('gadgets').catch(function(){return [];});
  // Aggiungi solo quelli non già presenti (per nome)
  var existingNames = existing.map(function(g){return g.name.toLowerCase();});
  var toAdd = GADGETS_EXTENDED.filter(function(g){
    return existingNames.indexOf(g.name.toLowerCase()) === -1;
  });
  for(var i=0;i<toAdd.length;i++){
    await IDB.put('gadgets', toAdd[i]).catch(function(){});
  }
  if(toAdd.length > 0){
    console.log('[Upgrade] Gadgets seeded:', toAdd.length, 'nuovi articoli');
    if(typeof Gadgets !== 'undefined' && document.getElementById('gadgets-grid')){
      Gadgets.render();
    }
  }
  // Aggiungi categoria Stampa 3D & Filamenti al filtro se non c'è
  var catSelect = document.querySelector('#view-gadgets select');
  if(catSelect){
    var hasIt = false;
    for(var i=0;i<catSelect.options.length;i++){
      if(catSelect.options[i].text === 'Stampa 3D & Filamenti'){ hasIt=true; break; }
    }
    if(!hasIt){
      var opt = document.createElement('option');
      opt.value = 'Stampa 3D & Filamenti'; opt.text = 'Stampa 3D & Filamenti';
      catSelect.appendChild(opt);
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   2. SYNC BRIDGE — 3D Quoter ↔ Catalog ↔ Gadgets ↔ Settings
   ═══════════════════════════════════════════════════════════════ */

// ── A) Settings → 3D Quoter: sincronizza €/kWh e labor rate ──
function syncSettingsTo3D(){
  try{
    var s = JSON.parse(localStorage.getItem('ingly_settings_main')||'{}');
    if(s.laborCost){ var el=document.getElementById('p3d-lr'); if(el && !el._userModified) el.value = s.laborCost; }
    if(s.kwhCost)  { var el=document.getElementById('p3d-kwh'); if(el && !el._userModified) el.value = s.kwhCost; }
    if(typeof Print3DQuoter !== 'undefined') Print3DQuoter.calc();
  }catch(e){}
}

// ── B) 3D Quoter → Catalog: "Salva come prodotto catalogo" ───
function add3DProductToCatalog(name, costPrice, salePrice, description){
  if(typeof IDB === 'undefined') return;
  IDB.put('catalog', {
    name: name || 'Stampa 3D',
    category: 'Stampa 3D',
    description: description || 'Prodotto da Smart Quoter 3D',
    costPrice: parseFloat(costPrice) || 0,
    salePrice: parseFloat(salePrice) || 0,
    unit: 'pz',
    stock: 0,
    createdAt: new Date().toISOString(),
    tags: ['3d','stampa3d'],
  }).then(function(){
    if(typeof window.showToast === 'function') window.showToast('✅ Prodotto aggiunto al Catalogo!','success');
  }).catch(function(){});
}

// ── C) Gadgets Stampa 3D → 3D Quoter: sync materiali ────────
async function syncGadgetsTo3DQuoter(){
  if(typeof IDB === 'undefined' || typeof Print3DQuoter === 'undefined') return;
  var gadgets = await IDB.getAll('gadgets').catch(function(){return [];});
  var mat3d = gadgets.filter(function(g){ return g.category === 'Stampa 3D & Filamenti'; });
  if(!mat3d.length) return;

  // Aggiorna i materiali nel Print3DQuoter
  mat3d.forEach(function(g){
    var isFdm = g.name.toLowerCase().indexOf('resina') === -1;
    var t = g.name.toLowerCase().indexOf('resina') !== -1 ? 'resin' : 'fdm';
    var existing = Print3DQuoter._state ? Print3DQuoter._state.mats : null;
    // Non sovrascrivere — solo suggerisci tramite bottone sync
  });
}

// ── D) Bus sync: quando cambiano dati rilevanti ───────────────
if(typeof Bus !== 'undefined'){
  Bus.on('data:updated', function(){
    setTimeout(syncSettingsTo3D, 500);
    setTimeout(function(){
      if(document.getElementById('view-print3d') && 
         document.getElementById('view-print3d').classList.contains('active')){
        if(typeof Print3DQuoter !== 'undefined') Print3DQuoter.calc();
      }
    }, 600);
  });
}

/* ═══════════════════════════════════════════════════════════════
   3. PULSANTE "AGGIUNGI AL CATALOGO" nel 3D Quoter
      + "SCARICA DAL MAGAZZINO" per importare filamenti
   ═══════════════════════════════════════════════════════════════ */
function enhance3DQuoterActions(){
  var root = document.getElementById('view-print3d');
  if(!root || root._enhanced) return;
  root._enhanced = true;

  // Aggiungi pulsanti extra nella card AZIONI del 3D quoter
  var actCard = root.querySelector('.p3-card .p3-ct');
  if(actCard && actCard.textContent.indexOf('AZIONI') !== -1){
    var parent = actCard.parentElement;
    var btnDiv = document.createElement('div');
    btnDiv.style.cssText = 'display:flex;gap:6px;margin-top:7px';
    btnDiv.innerHTML = 
      '<button class="btn btn-secondary btn-sm" style="flex:1;justify-content:center;color:#a78bfa;border-color:#a78bfa40" onclick="InglySync.saveToCatalog()" title="Salva il prodotto corrente nel Catalogo">'
      +'<i class="fas fa-book-open"></i> → Catalogo'
      +'</button>'
      +'<button class="btn btn-secondary btn-sm" style="flex:1;justify-content:center;color:#22d3ee;border-color:#22d3ee40" onclick="InglySync.importMaterials()" title="Importa filamenti dal Magazzino Gadgets">'
      +'<i class="fas fa-download"></i> ← Magazzino'
      +'</button>';
    parent.appendChild(btnDiv);
  }
}

/* ═══════════════════════════════════════════════════════════════
   4. INGLY SYNC — oggetto pubblico per azioni cross-sezione
   ═══════════════════════════════════════════════════════════════ */
window.InglySync = {

  // Salva voce 3D corrente nel Catalogo
  saveToCatalog: function(){
    var nameEl = document.getElementById('p3d-name');
    var name = nameEl ? nameEl.value : '';
    if(!name){ name = prompt('Nome prodotto per il catalogo:','Stampa 3D'); if(!name) return; }
    var costPpz = typeof Print3DQuoter !== 'undefined' ? Print3DQuoter._state && Print3DQuoter._state.cost || 0 : 0;
    // Try to get from internal state if exposed
    if(!costPpz && typeof Print3DQuoter !== 'undefined'){
      var ci = document.getElementById('p3d-mc');
      costPpz = 0; // we'll let user fill in catalog
    }
    var saleEl = document.querySelector('#view-print3d .p3-tier .tier-price, #view-print3d .p3-tier div[style*="font-size:22px"]');
    var saleText = saleEl ? saleEl.textContent.replace('€','').replace(',','.').trim() : '0';
    var salePrice = parseFloat(saleText) || 0;
    add3DProductToCatalog(name, costPpz, salePrice, 'Stampato in 3D — FDM/Resina');
  },

  // Importa filamenti dal magazzino gadgets nel selettore 3D
  importMaterials: async function(){
    if(typeof IDB === 'undefined'){ alert('IDB non disponibile'); return; }
    var gadgets = await IDB.getAll('gadgets').catch(function(){return [];});
    var mat3d = gadgets.filter(function(g){ return g.category === 'Stampa 3D & Filamenti'; });
    if(!mat3d.length){
      if(typeof window.showToast === 'function') window.showToast('Nessun filamento in magazzino — vai su Gadget & Accessori per aggiungerne','warning');
      return;
    }
    // Mappa nel formato Print3DQuoter
    if(typeof Print3DQuoter === 'undefined'){ return; }
    // Aggiungi al localStorage dei materiali 3D
    var stored = {};
    try{ stored = JSON.parse(localStorage.getItem('p3dq_v4')||'{}'); }catch(e){}
    var existMats = stored.mats || [];
    var existNames = existMats.map(function(m){return m.n.toLowerCase();});
    var added = 0;
    mat3d.forEach(function(g){
      if(existNames.indexOf(g.name.toLowerCase()) === -1){
        var isResin = g.name.toLowerCase().indexOf('resina') !== -1;
        existMats.push({
          id: 'g'+g.id,
          n: g.name,
          t: isResin ? 'resin' : 'fdm',
          p: parseFloat(g.cost) || 24,
          u: g.unit === 'bottiglia' ? 500 : 1000,
          s: g.notes || g.supplier || 'Magazzino'
        });
        added++;
      }
    });
    stored.mats = existMats;
    localStorage.setItem('p3dq_v4', JSON.stringify(stored));
    if(added > 0){
      if(typeof window.showToast === 'function') window.showToast('✅ '+added+' materiali importati dal magazzino nel 3D Quoter','success');
      // Re-render 3D quoter se aperto
      if(document.getElementById('view-print3d') && 
         document.getElementById('view-print3d').classList.contains('active')){
        if(typeof Print3DQuoter !== 'undefined') Print3DQuoter.render();
      }
    } else {
      if(typeof window.showToast === 'function') window.showToast('ℹ️ Tutti i materiali sono già nel 3D Quoter','info');
    }
  },

  // Apri sezione gadgets filtrata per stampa 3D
  goto3DGadgets: function(){
    if(typeof App !== 'undefined') App.navigate('gadgets');
    setTimeout(function(){
      var sel = document.querySelector('#view-gadgets select[onchange*="filterCat"]');
      if(sel){ sel.value = 'Stampa 3D & Filamenti'; if(typeof Gadgets !== 'undefined') Gadgets.filterCat('Stampa 3D & Filamenti'); }
    }, 200);
  },

  // Leggi impostazioni e popola 3D quoter
  applySettings: syncSettingsTo3D,
};

/* ═══════════════════════════════════════════════════════════════
   5. ENHANCED GADGETS CATEGORIES — aggiunge "Stampa 3D & Filamenti"
      al dropdown filtro della sezione Gadgets
   ═══════════════════════════════════════════════════════════════ */
function patchGadgetsCategoryFilter(){
  var catMap = {
    'LED & Illuminazione':true, 'Incisione & Stampa':true, 'Minuteria':true,
    'Packaging':true, 'Magneti & Ganci':true, 'Resine & Colori':true,
    'Stampa 3D & Filamenti':true, 'Altro':true
  };
  // Override Gadgets.render to also show 3D category badge
  if(typeof Gadgets !== 'undefined' && !Gadgets._catPatched){
    Gadgets._catPatched = true;
    var origRender = Gadgets.render.bind(Gadgets);
    Gadgets.render = async function(){
      await origRender();
      // ensure category select has 3D option
      var sel = document.querySelector('#view-gadgets select');
      if(sel){
        var found = false;
        for(var i=0;i<sel.options.length;i++) if(sel.options[i].value==='Stampa 3D & Filamenti'){found=true;break;}
        if(!found){ var o=document.createElement('option'); o.value=o.text='Stampa 3D & Filamenti'; sel.insertBefore(o,sel.options[sel.options.length-1]); }
      }
    };
  }
}

/* ═══════════════════════════════════════════════════════════════
   6. QUICK ACCESS CHIPS — aggiunge chip "Smart 3D" nella topbar
   ═══════════════════════════════════════════════════════════════ */
function addQuickAccessChip(){
  var qr = document.querySelector('.quick-access, #quick-access, [class*="quick"]');
  if(!qr) return;
  var has3d = false;
  qr.querySelectorAll('*').forEach(function(el){ if(el.textContent && el.textContent.trim()==='Smart 3D') has3d=true; });
  if(has3d) return;
  var chip = document.createElement('div');
  chip.className = qr.firstElementChild ? qr.firstElementChild.className : '';
  chip.textContent = '🖨️ Smart 3D';
  chip.style.cssText = 'cursor:pointer;background:#22d3ee20;color:#22d3ee;border:1px solid #22d3ee40;border-radius:99px;padding:3px 10px;font-size:11px;font-weight:700';
  chip.onclick = function(){ if(typeof App !== 'undefined') App.navigate('print3d'); };
  qr.appendChild(chip);
}

/* ═══════════════════════════════════════════════════════════════
   7. NOTA MAGAZZINO nel 3D Quoter: link diretto a Gadgets 3D
   ═══════════════════════════════════════════════════════════════ */
function injectMagazzinoLink(){
  var root = document.getElementById('view-print3d');
  if(!root) return;
  var matCard = root.querySelector('#p3d-mat');
  if(matCard && matCard.parentElement && !root.querySelector('._mag-link')){
    var link = document.createElement('div');
    link.className = '_mag-link';
    link.style.cssText = 'font-size:10px;color:#22d3ee;margin-top:6px;cursor:pointer;display:flex;align-items:center;gap:4px';
    link.innerHTML = '<i class="fas fa-external-link-alt" style="font-size:9px"></i> Gestisci filamenti nel Magazzino Gadgets → Stampa 3D';
    link.onclick = function(){ InglySync.goto3DGadgets(); };
    matCard.parentElement.appendChild(link);
  }
}

/* ═══════════════════════════════════════════════════════════════
   8. AUTO-INIT — esegui tutto al caricamento
   ═══════════════════════════════════════════════════════════════ */
function runUpgrade(){
  // Seed gadgets (async, non bloccante)
  seedGadgets();
  // Patch Gadgets filter
  patchGadgetsCategoryFilter();
  // Quick access chip
  addQuickAccessChip();
  // Sync settings → 3D
  syncSettingsTo3D();
  console.log('[InglyUpgrade] ✅ Magazzino populated · Sync bridges active · 3D integrated');
}

// Intercept navigate per enhance 3D quoter quando si apre
var _origNavSync = null;
function hookNavForSync(){
  if(typeof App === 'undefined' || !App.navigate) return;
  if(_origNavSync) return;
  _origNavSync = App.navigate.bind(App);
  App.navigate = function(section){
    _origNavSync(section);
    if(section === 'print3d'){
      setTimeout(function(){
        enhance3DQuoterActions();
        injectMagazzinoLink();
        syncSettingsTo3D();
      }, 300);
    }
    if(section === 'gadgets'){
      setTimeout(patchGadgetsCategoryFilter, 200);
    }
  };
}

// Boot
document.addEventListener('DOMContentLoaded', function(){
  setTimeout(runUpgrade, 2500);
  setTimeout(hookNavForSync, 3000);
}, {once:true});

// Fallback se DOMContentLoaded già passato
if(document.readyState !== 'loading'){
  setTimeout(runUpgrade, 2500);
  setTimeout(hookNavForSync, 3000);
}

})();

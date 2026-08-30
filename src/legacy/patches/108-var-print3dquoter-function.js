
var Print3DQuoter=(function(){
'use strict';

var MACH={
  fdm:[
    {id:'bambu-a1',  n:'Bambu A1',        w:250,c:299, l:3000},
    {id:'bambu-a1m', n:'Bambu A1 Mini',   w:180,c:229, l:3000},
    {id:'bambu-p1s', n:'Bambu P1S',       w:256,c:699, l:5000},
    {id:'bambu-p2s', n:'Bambu Lab P2S',   w:256,c:749, l:5000},
    {id:'bambu-x1c', n:'Bambu X1 Carbon', w:350,c:1199,l:5000},
    {id:'prusa-mk4', n:'Prusa MK4S',      w:180,c:1099,l:5000},
    {id:'prusa-mini',n:'Prusa Mini+',     w:100,c:429, l:4000},
    {id:'ender3-v3', n:'Ender 3 V3 SE',   w:120,c:229, l:2000},
    {id:'ender3-s1', n:'Ender 3 S1 Pro',  w:200,c:299, l:2500},
    {id:'cr10s',     n:'CR-10 Smart Pro',  w:350,c:340, l:2000},
    {id:'voron24',   n:'Voron 2.4',        w:600,c:900, l:6000},
    {id:'custom',    n:'Personalizzata',   w:150,c:400, l:2000},
  ],
  resin:[
    {id:'esat2',n:'Elegoo Saturn 2', w:55, c:350,l:3000},
    {id:'esat3',n:'Elegoo Saturn 3', w:60, c:500,l:3500},
    {id:'emar4',n:'Elegoo Mars 4',   w:30, c:199,l:3000},
    {id:'am3',  n:'Anycubic M3+',   w:50, c:280,l:2500},
    {id:'apho', n:'Anycubic Photon', w:25, c:150,l:2000},
    {id:'ps8',  n:'Phrozen Sonic 8K',w:35, c:320,l:3000},
    {id:'cr',   n:'Personalizzata',  w:40, c:250,l:2000},
  ]
};

var DEF_MATS=[
  {id:'pw',  n:'PLA+ Bambu Bianco',      t:'fdm',  p:24,u:1000,s:'Bambu Lab'},
  {id:'pb',  n:'PLA+ Bambu Nero',         t:'fdm',  p:24,u:1000,s:'Bambu Lab'},
  {id:'pr',  n:'PLA+ Bambu Rosso',        t:'fdm',  p:24,u:1000,s:'Bambu Lab'},
  {id:'pe',  n:'PETG Bambu HF',           t:'fdm',  p:28,u:1000,s:'Bambu Lab'},
  {id:'pa',  n:'ASA Bambu',              t:'fdm',  p:32,u:1000,s:'Bambu Lab'},
  {id:'pu',  n:'TPU Bambu Flex 95A',     t:'fdm',  p:34,u:1000,s:'Bambu Lab'},
  {id:'pn',  n:'PA Nylon Bambu',         t:'fdm',  p:38,u:1000,s:'Bambu Lab'},
  {id:'pla', n:'PLA eSUN 1kg',           t:'fdm',  p:18,u:1000,s:'eSUN'},
  {id:'abs', n:'ABS Generico 1kg',       t:'fdm',  p:16,u:1000,s:'Generico'},
  {id:'prs', n:'Prusament PLA',          t:'fdm',  p:30,u:1000,s:'Prusa'},
  {id:'re',  n:'Resina ABS-Like Elegoo', t:'resin',p:22,u:1000,s:'Elegoo'},
  {id:'ra',  n:'Resina Std Anycubic',    t:'resin',p:19,u:500, s:'Anycubic'},
  {id:'rp',  n:'Resina AquaGray Phrozen',t:'resin',p:35,u:1000,s:'Phrozen'},
  {id:'rs',  n:'Resina Tenacious Siraya',t:'resin',p:29,u:500, s:'Siraya Tech'},
];
var EXT_PRE=[
  {n:'Levigatura/Sanding',c:2},{n:'Verniciatura (1 mano)',c:3},
  {n:'Rimozione supporti',c:1.5},{n:'Primer + finitura',c:4},
  {n:'Assemblaggio',c:2},{n:'Imballaggio speciale',c:1.5},
  {n:'Inserti filettati',c:2.5},{n:'Post-curing resina',c:1},
];

var T='fdm',MATS=[],LINES=[],EXTRAS=[],SAVED=[],COST=0,PRICE=0;
var IVA_ON=true, DISC=0;

/* ── Un solo comando del margine ────────────────────────────────────────────
   Prima ce n'erano due che non si parlavano: tre campi moltiplicatore
   (×3,5 / ×2,8 / ×2,2) che facevano il prezzo, e uno slider «margine minimo»
   che non faceva niente. Adesso il margine è uno solo e comanda.

   Il valore iniziale è il margine equivalente al vecchio ×3,5 — cioè
   71,43%. Non è una scelta nuova: è quello che il preventivatore ha sempre
   applicato allo scaglione singolo. Metterlo in chiaro come margine non
   sposta nessun prezzo, rende solo visibile quello che c'era. */
var MARG=(1-1/3.5)*100;
var MODO='completo';
var MAT_REG=null;   // il costo del materiale a registro, se il magazzino lo sa
var _registroLetto=false;
/* I dati che arrivano dallo slicer, tenuti separati da quelli digitati: è la
   distinzione che permette di non contarli due volte. */
var SLICER={ pesoTotale:0, pesoModello:0, supporti:0, purge:0, ore:0, kwh:0, costo:0, includeTutto:true };
var ENE='auto';   // auto · misurato · medio · targa
var R=null;
var CALIB_RIF=0;
var SK='p3dq_v4';

function persist(){try{localStorage.setItem(SK,JSON.stringify({mats:MATS,saved:SAVED}));}catch(e){}}
function hydrate(){
  try{
    var d=JSON.parse(localStorage.getItem(SK)||'{}');
    MATS=(d.mats&&d.mats.length)?d.mats:JSON.parse(JSON.stringify(DEF_MATS));
    SAVED=d.saved||[];
  }catch(e){MATS=JSON.parse(JSON.stringify(DEF_MATS));SAVED=[];}
}
function eur(n){return '€'+(+n||0).toFixed(2).replace('.',',');}
function el(id){return document.getElementById(id);}
function gv(id,def){var e=el(id);return e?(parseFloat(e.value)||def||0):(def||0);}
function sv(id,v){var e=el(id);if(e)e.value=v;}
function st(id,v){var e=el(id);if(e)e.textContent=v;}
function showToastP(msg,type){
  if(typeof window.showToast==='function'){window.showToast(msg,type);return;}
  var c=el('toast-container');if(!c)return;
  var t=document.createElement('div');t.className='toast '+(type||'info');t.textContent=msg;
  c.appendChild(t);
  setTimeout(function(){t.style.animation='toastOut .3s ease forwards';setTimeout(function(){t.remove();},300);},2800);
}

/* Le modalità sono quelle del motore, lette da lì: un elenco parallelo di
   etichette è il primo passo verso due sistemi che possiedono lo stesso
   concetto. */
function MODI_(){
  var V=(typeof window!=='undefined') && window.InglyQuoter3DView;
  return (V && V.MODALITA) || [{id:'completo',label:'Business',sotto:'quanto devi rientrare'}];
}

/* ── Quello che l'utente ha scritto sopravvive al ridisegno ────────────────
   `render()` ricostruisce la pagina da una stringa in cui i valori sono
   scritti a mano — `value="20"`, `value="1.5"` — quindi ogni ridisegno
   riportava i campi ai valori di partenza. Finché a ridisegnare erano solo
   «FDM/Resina» e «IVA sì/no» il danno passava inosservato; adesso ridisegnano
   anche la modalità, la banda dell'energia e la scelta del materiale, e
   perdere i grammi e le ore a ogni tocco renderebbe il preventivatore
   inservibile.

   Si salva quello che c'è, si ridisegna, si rimette. Non è un rimedio
   elegante: quello sarebbe non ricostruire la pagina intera. È però onesto e
   verificabile, e il collaudo lo verifica. */
function _valoriCorrenti(root){
  var v={};
  try{
    root.querySelectorAll('input[id],select[id],textarea[id]').forEach(function(e){
      if(!e.id) return;
      v[e.id] = (e.type==='checkbox'||e.type==='radio') ? e.checked : e.value;
    });
  }catch(err){}
  return v;
}
function _ripristina(root,v){
  try{
    root.querySelectorAll('input[id],select[id],textarea[id]').forEach(function(e){
      if(!(e.id in v)) return;
      if(e.type==='checkbox'||e.type==='radio') e.checked=v[e.id];
      else if(v[e.id]!=='' && v[e.id]!=null) e.value=v[e.id];
    });
  }catch(err){}
}

function render(){
  hydrate();
  var root=el('view-print3d');if(!root)return;
  var _prima=_valoriCorrenti(root);
  var MODI=MODI_();
  var isFdm=T==='fdm';
  var machOpts=(MACH[T]||[]).map(function(m){return '<option value="'+m.id+'">'+m.n+' ('+m.w+'W · €'+m.c+')</option>';}).join('');
  var matOpts=MATS.filter(function(m){return m.t===T;}).map(function(m){return '<option value="'+m.id+'">'+m.n+' (€'+m.p+'/'+(m.t==='resin'?'L':'kg')+' · '+m.u+(m.t==='resin'?'ml':'g')+')</option>';}).join('');
  var machBtns=(MACH[T]||[]).map(function(m){return '<button class="p3-mb" onclick="Print3DQuoter.pickMach(\''+m.id+'\')">'+m.n+'<br><span style="font-size:9px;opacity:.6">'+m.w+'W·€'+m.c+'</span></button>';}).join('');
  var extHtml=EXTRAS.length?EXTRAS.map(function(e,i){
    return '<div class="p3-ext">'
      +'<input class="p3-fc" style="flex:2;font-size:11px;padding:5px 8px" value="'+e.n+'" oninput="Print3DQuoter.upE('+i+',\'n\',this.value)">'
      +'<input class="p3-fc" type="number" step="0.5" value="'+e.c+'" style="flex:0.8;text-align:right;font-size:11px;padding:5px 8px" oninput="Print3DQuoter.upE('+i+',\'c\',this.value)">'
      +'<span style="font-size:10px;color:var(--text-muted)">€</span>'
      +'<button class="btn btn-danger btn-sm" onclick="Print3DQuoter.rmE('+i+')">✕</button></div>';
  }).join(''):'<div style="color:var(--text-dim);font-size:11px;padding:4px">Nessuna lavorazione extra</div>';

  // Righe preventivo
  var linesHtml='';var totC=0,totN=0;
  if(!LINES.length){
    linesHtml='<div class="p3-empty"><i class="fas fa-cube"></i>Nessuna voce. Configura una stampa e premi il bottone azzurro.</div>';
  }else{
    var rows=LINES.map(function(l){
      var sub=l.ppz*l.qty;totC+=l.cpz*l.qty;totN+=sub;
      return '<tr><td style="font-weight:600;color:var(--text)">'+l.n+' <span style="font-size:10px;color:#475569">'+(l.t==='resin'?'🧴':'🧵')+'</span></td>'
        +'<td style="text-align:center">'+l.qty+'</td>'
        +'<td style="text-align:right;color:var(--text-muted)">'+eur(l.cpz)+'</td>'
        +'<td style="text-align:right;color:#22d3ee;font-weight:800">'+eur(l.ppz)+'</td>'
        +'<td style="text-align:right;font-weight:800;color:#fff">'+eur(sub)+'</td>'
        +'<td style="text-align:right">'
          +'<button class="act-btn act-edit" onclick="Print3DQuoter.editLine('+l.id+')">✏️</button> '
          +'<button class="act-btn act-del" onclick="Print3DQuoter.rmLine('+l.id+')">🗑️</button>'
        +'</td></tr>';
    }).join('');
    /* Lo sconto è già dentro `ppz` — è il prezzo che l'utente ha visto e
       accettato. Qui veniva applicato una seconda volta, sulla somma delle
       righe: il totale scendeva di uno sconto che era già stato fatto. */
    var listino=LINES.reduce(function(a,l){return a+(l.ppzListino||l.ppz)*l.qty;},0);
    var discAmt=listino-totN;
    var vatAmt=IVA_ON?totN*0.22:0;
    var gross=totN+vatAmt;
    var mg=totN>0?((totN-totC)/totN*100):0;
    var forzate=LINES.filter(function(l){return l.manuale;}).length;
    linesHtml='<table><thead><tr>'
      +'<th>Descrizione</th><th style="text-align:center">Qtà</th><th style="text-align:right">Costo/pz</th><th style="text-align:right">Prezzo/pz</th><th style="text-align:right">Subtot.</th><th></th>'
      +'</tr></thead><tbody>'+rows+'</tbody></table>'
      +'<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">'
      +'<div class="p3-sr"><span style="color:var(--text-muted)">Costo Vivo</span><span style="font-weight:700;color:#fff">'+eur(totC)+'</span></div>'
      +(discAmt>0.005?'<div class="p3-sr"><span style="color:var(--text-muted)">Listino</span><span style="font-weight:700;color:#fff">'+eur(listino)+'</span></div>'
        +'<div class="p3-sr"><span style="color:var(--text-muted)">Sconto ('+DISC+'%) già applicato</span><span style="font-weight:700;color:var(--red)">-'+eur(discAmt)+'</span></div>':'')
      +'<div class="p3-sr"><span style="color:var(--text-muted)">Subtotale netto</span><span style="font-weight:700;color:#fff">'+eur(totN)+'</span></div>'
      +(forzate?'<div class="p3-sr"><span style="color:var(--orange)">✏️ Prezzi forzati a mano</span><span style="font-weight:700;color:var(--orange)">'+forzate+'</span></div>':'')
      +'<div class="p3-sr"><span style="color:var(--text-muted)">Margine medio</span><span style="font-weight:700;color:'+(mg>=30?'var(--green)':'var(--red)')+'">'+mg.toFixed(1)+'%</span></div>'
      +(IVA_ON?'<div class="p3-sr"><span style="color:var(--text-muted)">IVA (22%)</span><span style="font-weight:700;color:#fff">'+eur(vatAmt)+'</span></div>':'')
      +'<div class="p3-tbox">'
        +'<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">'+(IVA_ON?'TOTALE IVA INCLUSA':'TOTALE SENZA IVA')+'</div>'
        +'<div style="font-size:28px;font-weight:900;color:#22d3ee;line-height:1">'+eur(gross)+'</div>'
        +'<div style="font-size:11px;color:var(--text-muted);margin-top:5px">'+(discAmt>0.005?'Sconto '+DISC+'% applicato · ':'')+(IVA_ON?'IVA 22% inclusa':'Prezzi netti')+'</div>'
      +'</div></div>';
  }

  // Preventivi salvati
  var savedHtml=SAVED.length?SAVED.map(function(q){
    return '<div class="p3-sv">'
      +'<div style="flex:1;min-width:0" onclick="Print3DQuoter.loadSaved('+q.id+')">'
        +'<div style="font-size:12px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+q.n+'</div>'
        +'<div style="font-size:10px;color:#475569">'+q.d+' · '+(q.t==='resin'?'🧴 Resina':'🧵 FDM')+' · '+q.lines.length+' voci</div>'
      +'</div>'
      +'<div style="text-align:right;flex-shrink:0">'
        +'<div style="font-size:13px;font-weight:700;color:#22d3ee;cursor:pointer" onclick="Print3DQuoter.loadSaved('+q.id+')">'+eur(q.total)+'</div>'
        +'<button class="act-btn act-del" style="font-size:10px;padding:2px 6px" onclick="Print3DQuoter.delSaved('+q.id+')">🗑️</button>'
      +'</div></div>';
  }).join(''):'<div style="color:var(--text-dim);text-align:center;padding:12px;font-size:11px">Nessun preventivo salvato</div>';

  root.innerHTML=''
  // ── PAGE HEADER ──
  +'<div class="p3-ph">'
    +'<div><div class="page-title"><i class="fas fa-cube"></i> 🖨️ Smart Quoter Stampa 3D</div>'
    +'<div class="module-subtitle">Calcolo costi FDM &amp; Resina · Magazzino filamenti · Multi-macchina · IVA &amp; Sconti</div></div>'
    +'<div class="page-actions">'
      +'<button class="btn btn-secondary btn-sm" onclick="Print3DQuoter.reset()"><i class="fas fa-undo"></i> Reset</button>'
      +'<button class="btn btn-secondary btn-sm" onclick="Print3DQuoter.openMat()" style="color:var(--purple);border-color:#a78bfa40"><i class="fas fa-database"></i> Magazzino</button>'
      +'<button class="btn btn-secondary btn-sm" onclick="Print3DQuoter.doPdf()" style="color:var(--green);border-color:#22c55e40"><i class="fas fa-file-pdf"></i> PDF</button>'
      +'<button class="btn btn-secondary btn-sm" onclick="Print3DQuoter.doWa()" style="background:#25D36620;color:#25D366;border-color:#25D36640"><i class="fab fa-whatsapp"></i> WA</button>'
    +'</div>'
  +'</div>'
  // ── 3-COL GRID ──
  +'<div class="p3-grid">'

  // ─── COL 1 ───────────────────────────────────────────────────
  +'<div class="p3-col">'
    // ── Importa dallo slicer ────────────────────────────────────────
    +cardSlicer()
    // Tipo + macchina
    +'<div class="p3-card cyan">'
      +'<div class="p3-ct c">⚙️ CONFIGURA STAMPA</div>'
      +'<div class="p3-type">'
        +'<button class="p3-tb '+(isFdm?'afdm':'')+'" onclick="Print3DQuoter.setType(\'fdm\')">🧵 FDM</button>'
        +'<button class="p3-tb '+(!isFdm?'ares':'')+'" onclick="Print3DQuoter.setType(\'resin\')">🧴 Resina</button>'
      +'</div>'
      +'<div class="p3-fg"><label class="p3-fl">🤖 MACCHINA</label>'
        +'<select class="p3-fc" id="p3d-mach" onchange="Print3DQuoter.pickMach(this.value)"><option value="">— Seleziona macchina —</option>'+machOpts+'</select>'
        +'<div class="p3-ht" id="p3d-mach-hint"></div></div>'
      +'<div class="p3-g2">'
        +'<div class="p3-fg"><label class="p3-fl">⚡ CONSUMO (W)</label><input class="p3-fc" id="p3d-watt" type="number" step="10" value="'+(isFdm?'150':'40')+'" oninput="Print3DQuoter.calc()"><div class="p3-ht">'+(isFdm?'FDM: 120–350W':'Resina: 25–60W')+'</div></div>'
        +'<div class="p3-fg"><label class="p3-fl">💡 €/kWh</label><input class="p3-fc" id="p3d-kwh" type="number" step="0.01" value="0.28" oninput="Print3DQuoter.calc()"><div class="p3-ht">Dalla tua bolletta, non dalla media</div></div>'
        +'<div class="p3-fg"><label class="p3-fl">📊 W MEDI (misurati)</label><input class="p3-fc" id="p3d-avgw" type="number" step="5" value="" placeholder="—" oninput="Print3DQuoter.calc()"><div class="p3-ht">Se li conosci, battono la targa</div></div>'
        +'<div class="p3-fg"><label class="p3-fl">🔋 kWh MISURATI</label><input class="p3-fc" id="p3d-kwhm" type="number" step="0.01" value="" placeholder="—" oninput="Print3DQuoter.calc()"><div class="p3-ht">Da presa intelligente o contatore</div></div>'
        +'<div class="p3-fg"><label class="p3-fl">🏭 COSTO MACCHINA €</label><input class="p3-fc" id="p3d-mc" type="number" step="50" value="'+(isFdm?'400':'250')+'" oninput="Print3DQuoter.calc()"></div>'
        +'<div class="p3-fg"><label class="p3-fl">⏳ VITA UTILE (h)</label><input class="p3-fc" id="p3d-lh" type="number" step="100" value="'+(isFdm?'2000':'2500')+'" oninput="Print3DQuoter.calc()"></div>'
        /* Le quattro voci che mancavano al conto: senza di queste il costo
           sembra più basso di quello che è. */
        +'<div class="p3-fg"><label class="p3-fl">🔧 MANUTENZIONE €/h</label><input class="p3-fc" id="p3d-mnt" type="number" step="0.05" value="'+(isFdm?'0.12':'0.20')+'" oninput="Print3DQuoter.calc()"><div class="p3-ht">'+(isFdm?'Ugelli, piatti, cinghie':'Film FEP, alcool, guanti')+'</div></div>'
        +'<div class="p3-fg"><label class="p3-fl">📉 STAMPE FALLITE %</label><input class="p3-fc" id="p3d-fail" type="number" step="1" value="'+(isFdm?'7':'12')+'" oninput="Print3DQuoter.calc()"><div class="p3-ht">Materiale e ore già spesi</div></div>'
        +'<div class="p3-fg"><label class="p3-fl">🔌 CICLO DI LAVORO</label><input class="p3-fc" id="p3d-duty" type="number" step="0.05" min="0.1" max="1" value="'+(isFdm?'0.6':'0.9')+'" oninput="Print3DQuoter.calc()"><div class="p3-ht">Frazione della potenza di targa</div></div>'
        +'<div class="p3-fg"><label class="p3-fl">⚙️ SETUP (min)</label><input class="p3-fc" id="p3d-setup" type="number" step="5" value="15" oninput="Print3DQuoter.calc()"><div class="p3-ht">Si paga una volta, diviso per la quantità</div></div>'
        +'<div class="p3-fg"><label class="p3-fl">🧱 SUPPORTI (g)</label><input class="p3-fc" id="p3d-sup" type="number" step="1" value="0" oninput="Print3DQuoter.calc()"><div class="p3-ht">Finiscono nel cestino, si pagano al chilo</div></div>'
        +'<div class="p3-fg"><label class="p3-fl">'+(isFdm?'🪣 POST-PROCESSO (min)':'🚿 LAVAGGIO + CURA (min)')+'</label><input class="p3-fc" id="p3d-wash" type="number" step="5" value="'+(isFdm?'0':'20')+'" oninput="Print3DQuoter.calc()"><div class="p3-ht">'+(isFdm?'Rimozione supporti, carteggiatura':'La stampa non è finita quando si ferma')+'</div></div>'
      +'</div>'
      +bandaEnergia()
    +'</div>'
    // Materiale
    +'<div class="p3-card cyan">'
      +'<div class="p3-ct c" id="p3d-mat-title">'+(isFdm?'🧵 FILAMENTO':'🧴 RESINA')+'</div>'
      +'<div class="p3-fg"><label class="p3-fl">DAL MAGAZZINO <button onclick="Print3DQuoter.openMat()" style="background:none;border:none;color:#a78bfa;cursor:pointer;font-size:10px;font-weight:700">+ Gestisci</button></label>'
        +'<select class="p3-fc" id="p3d-mat" onchange="Print3DQuoter.pickMat(this.value)"><option value="">— Scegli materiale —</option>'+matOpts+'</select></div>'
      +bandaMateriale()
      +'<div class="p3-g2">'
        +'<div class="p3-fg"><label class="p3-fl" id="p3d-mp-l">'+(isFdm?'€/kg':'€/L')+'</label><input class="p3-fc" id="p3d-mkg" type="number" step="0.5" value="24" oninput="Print3DQuoter.setPrezzoMat(this.value)"></div>'
        +'<div class="p3-fg"><label class="p3-fl" id="p3d-mu-l">UNITÀ ('+(isFdm?'g':'ml')+')</label><input class="p3-fc" id="p3d-mu" type="number" step="100" value="1000" oninput="Print3DQuoter.calc()"></div>'
      +'</div>'
    +'</div>'
    // Dettagli stampa
    +'<div class="p3-card cyan">'
      +'<div class="p3-ct c">📐 DETTAGLI STAMPA</div>'
      +'<div class="p3-fg"><label class="p3-fl">📛 NOME PRODOTTO</label><input class="p3-fc" id="p3d-name" placeholder="es. Supporto telefono personalizzato"></div>'
      +'<div class="p3-g2">'
        +'<div class="p3-fg"><label class="p3-fl" id="p3d-gl">'+(isFdm?'🧵 MATERIALE (g)':'🧴 RESINA (ml)')+'</label><input class="p3-fc acc" id="p3d-g" type="number" step="1" value="20" oninput="Print3DQuoter.calc()"><div class="p3-ht">Da slicer (Bambu/Prusa)</div></div>'
        +'<div class="p3-fg"><label class="p3-fl">⏱️ TEMPO STAMPA (h)</label><input class="p3-fc acc" id="p3d-h" type="number" step="0.25" value="1.5" oninput="Print3DQuoter.calc()"></div>'
        +'<div class="p3-fg"><label class="p3-fl">👤 MANODOPERA (min)</label><input class="p3-fc acc" id="p3d-lm" type="number" step="5" value="10" oninput="Print3DQuoter.calc()"><div class="p3-ht">Setup + rimozione</div></div>'
        +'<div class="p3-fg"><label class="p3-fl">💶 €/h MANODOPERA</label><input class="p3-fc" id="p3d-lr" type="number" step="1" value="18" oninput="Print3DQuoter.calc()"></div>'
      +'</div>'
      +'<div style="background:var(--bg-card2);border-radius:var(--radius-sm);padding:10px;margin-top:8px;border:1px solid var(--border)">'
        +'<div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">✨ LAVORAZIONI EXTRA</div>'
        +'<div id="p3d-ext">'+extHtml+'</div>'
        +'<button class="btn btn-secondary btn-sm" style="width:100%;margin-top:6px;border-style:dashed;color:#22d3ee;border-color:#22d3ee40" onclick="Print3DQuoter.addExtra()">+ Aggiungi lavorazione</button>'
      +'</div>'
      +'<div class="p3-fg" style="margin-top:10px"><label class="p3-fl">📦 QTÀ ORDINE</label><input class="p3-fc" id="p3d-qty" type="number" value="1" min="1" oninput="Print3DQuoter.calc()"></div>'
      +'<button class="btn btn-primary" style="width:100%;padding:12px;font-size:14px;letter-spacing:.3px;background:#22d3ee;color:#000;margin-top:4px" onclick="Print3DQuoter.addLine()"><i class="fas fa-plus-circle"></i> AGGIUNGI AL PREVENTIVO</button>'
    +'</div>'
    // Macchine rapide
    +'<div class="p3-card"><div class="p3-ct">🤖 MACCHINE RAPIDE</div><div class="p3-mg">'+machBtns+'</div></div>'
  +'</div>'

  // ─── COL 2 ───────────────────────────────────────────────────
  +'<div class="p3-col">'
    +'<div class="p3-card">'
      +'<div class="p3-ct" style="display:flex;align-items:center;justify-content:space-between"><span>📋 VOCI IN PREVENTIVO 3D</span><button class="btn btn-danger btn-sm" onclick="Print3DQuoter.clearLines()">🗑️ Svuota</button></div>'
      +linesHtml
    +'</div>'
    // ── B · la risposta, prima di tutto il resto ─────────────────────
    +'<div class="p3-card cyan"><div class="p3-ct c" id="p3d-hero-t">📊 IL CONTO</div>'
      +'<div id="p3d-hero"><div style="color:var(--text-dim);text-align:center;padding:20px;font-size:12px">Inserisci grammi e ore per vedere il calcolo</div></div>'
      +'<div id="p3d-avvisi"></div>'
    +'</div>'
    // ── C · dove vanno i soldi ────────────────────────────────────────
    +'<div class="p3-card"><div class="p3-ct">🔢 DETTAGLIO COSTI — live</div><div id="p3d-bk"><div style="color:var(--text-dim);text-align:center;padding:20px;font-size:12px">Inserisci grammi e ore per vedere il calcolo</div></div></div>'
    // ── E · le quantità: l'avviamento si divide, il pezzo no ──────────
    +'<div class="p3-card"><div class="p3-ct">📦 QUANTITÀ — quanto conviene stampare</div><div id="p3d-scaglioni"><div style="color:var(--text-dim);text-align:center;padding:16px;font-size:11px">Inserisci i dati per vedere gli scaglioni</div></div></div>'
    // ── F · calibrazione contro un riferimento esterno ────────────────
    +'<div class="p3-card"><div class="p3-ct" style="display:flex;align-items:center;justify-content:space-between;gap:8px">'
      +'<span>🎯 CONFRONTA CON LO SLICER</span>'
      +'<span style="display:flex;align-items:center;gap:5px;text-transform:none;letter-spacing:0"><span style="font-size:10px;font-weight:400;color:var(--text-dim)">costo indicato €</span>'
      +'<input class="p3-fc" id="p3d-calib" type="number" step="0.01" min="0" value="'+(CALIB_RIF||'')+'" placeholder="4.50" oninput="Print3DQuoter.setCalib(this.value)" style="width:78px;padding:3px 6px;font-size:12px;text-align:right"></span>'
      +'</div>'
      +'<div id="p3d-calib-out"><div style="font-size:11px;color:var(--text-dim)">Inserisci il costo che ti dice lo slicer (o un altro preventivatore) per capire a quale domanda stava rispondendo.</div></div>'
    +'</div>'
  +'</div>'

  // ─── COL 3 ───────────────────────────────────────────────────
  +'<div class="p3-col">'
    // Prezzi
    +'<div class="p3-card cyan">'
      +'<div class="p3-ct c">🎚️ MODALITÀ — a quale domanda rispondi</div>'
      +'<div style="display:grid;grid-template-columns:repeat('+MODI.length+',1fr);gap:6px">'+MODI.map(function(m){
          var on=MODO===m.id;
          return '<button onclick="Print3DQuoter.setModo(\''+m.id+'\')" style="padding:8px 5px;border-radius:var(--radius-sm);cursor:pointer;text-align:center;transition:.15s;'
            +'border:1.5px solid '+(on?'#22d3ee':'var(--border2)')+';background:'+(on?'#22d3ee18':'transparent')+';color:'+(on?'#22d3ee':'var(--text-dim)')+'">'
            +'<span style="font-size:11px;font-weight:800">'+m.label+'</span>'
            +'<span style="display:block;font-size:8px;opacity:.7;font-weight:400;line-height:1.3;margin-top:2px">'+m.sotto+'</span>'
            +'</button>';
        }).join('')+'</div>'
      /* Un solo comando del margine. Il numero che si legge qui è il numero
         che il motore usa: non c'è più un secondo posto dove il prezzo si
         forma. Il cursore e la casella scrivono la stessa variabile. */
      +'<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">'
        +'<label style="font-size:10px;color:var(--text-muted);display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">'
          +'<span>Margine applicato</span>'
          +'<span style="display:flex;align-items:center;gap:4px">'
            +'<input class="p3-fc" id="p3d-margin-num" type="number" step="0.1" min="0" max="95" value="'+MARG.toFixed(1)+'" oninput="Print3DQuoter.setMargine(this.value)" style="width:64px;padding:3px 6px;font-size:12px;font-weight:800;color:var(--green);text-align:right">'
            +'<span style="color:var(--green);font-weight:700">%</span>'
          +'</span>'
        +'</label>'
        +'<input type="range" id="p3d-margin" min="5" max="90" step="1" value="'+Math.round(MARG)+'" oninput="Print3DQuoter.setMargine(this.value)" style="width:100%;accent-color:var(--green)">'
        +'<div class="p3-ht" id="p3d-ml">Il margine chiesto è il margine ottenuto: prezzo = costo ÷ (1 − margine).</div>'
      +'</div>'
    +'</div>'
    // Le quattro politiche del motore — informative, non un secondo comando
    +'<div class="p3-card">'
      +'<div class="p3-ct">🎯 POLITICHE DI PREZZO</div>'
      +'<div id="p3d-tiers"><div style="color:var(--text-dim);text-align:center;padding:16px;font-size:11px">Inserisci i dati per vedere i prezzi</div></div>'
    +'</div>'
    // IVA + Sconto
    +'<div class="p3-card">'
      +'<div class="p3-ct">🧾 IVA &amp; SCONTO</div>'
      +'<div class="p3-fg"><label class="p3-fl">IVA</label>'
        +'<div class="p3-iva-btns">'
          +'<button id="p3d-iva-yes" class="p3-iva-btn" onclick="Print3DQuoter.setIva(true)" style="background:var(--primary);color:#fff;flex:1">+IVA 22%</button>'
          +'<button id="p3d-iva-no"  class="p3-iva-btn" onclick="Print3DQuoter.setIva(false)" style="background:var(--bg-card2);color:var(--text-muted);border:1px solid var(--border2);flex:1">Senza IVA</button>'
        +'</div>'
      +'</div>'
      +'<div class="p3-fg"><label class="p3-fl">SCONTO %</label>'
        +'<div class="p3-disc-btns">'
          +'<button class="p3-disc-btn'+(DISC===0?' active':'')+'" onclick="Print3DQuoter.setDisc(0)">0%</button>'
          +'<button class="p3-disc-btn'+(DISC===5?' active':'')+'" onclick="Print3DQuoter.setDisc(5)">5%</button>'
          +'<button class="p3-disc-btn'+(DISC===10?' active':'')+'" onclick="Print3DQuoter.setDisc(10)">10%</button>'
          +'<button class="p3-disc-btn'+(DISC===20?' active':'')+'" onclick="Print3DQuoter.setDisc(20)">20%</button>'
          +'<input class="p3-fc" id="p3d-disc-custom" type="number" step="1" min="0" max="100" value="'+DISC+'" placeholder="%" style="width:60px;padding:5px 8px;font-size:12px" oninput="Print3DQuoter.setDisc(parseFloat(this.value)||0)">'
        +'</div>'
      +'</div>'
    +'</div>'
    // Azioni
    +'<div class="p3-card"><div class="p3-ct">⚡ AZIONI</div>'
      +'<div style="display:flex;flex-direction:column;gap:7px">'
        +'<button class="btn btn-primary" style="width:100%;padding:11px;font-size:13px;font-weight:800;background:#22d3ee;color:#000" onclick="Print3DQuoter.doSave()"><i class="fas fa-save"></i> 💾 Salva Preventivo 3D</button>'
        +'<button style="width:100%;padding:9px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:6px" onclick="Print3DQuoter.doPdf()"><i class="fas fa-file-pdf"></i> 📄 Esporta PDF Cliente</button>'
        +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
          +'<button class="btn btn-secondary" style="width:100%;justify-content:center" onclick="Print3DQuoter.doWa()"><i class="fab fa-whatsapp" style="color:#25D366"></i> WhatsApp</button>'
          +'<button class="btn btn-secondary" style="width:100%;justify-content:center" onclick="Print3DQuoter.sendQ()"><i class="fas fa-arrow-right"></i> → Quoter</button>'
        +'</div>'
      +'</div>'
    +'</div>'
    // Cliente
    +'<div class="p3-card"><div class="p3-ct">👤 CLIENTE &amp; NOTE</div>'
      +'<div class="p3-fg"><label class="p3-fl">CLIENTE</label><input class="p3-fc" id="p3d-client" placeholder="Mario Rossi..."></div>'
      +'<div class="p3-fg"><label class="p3-fl">NOTE</label><textarea class="p3-fc" id="p3d-notes" rows="2" placeholder="Note aggiuntive..."></textarea></div>'
    +'</div>'
    // Salvati
    +'<div class="p3-card"><div class="p3-ct" style="display:flex;align-items:center;justify-content:space-between"><span>📋 Preventivi Salvati</span><button class="btn btn-danger btn-sm" onclick="Print3DQuoter.clearSaved()">🗑️</button></div>'
      +'<div style="max-height:240px;overflow-y:auto">'+savedHtml+'</div>'
    +'</div>'
  +'</div>'
  +'</div>'; // close p3-grid

  _ripristina(root,_prima);
  setTimeout(function(){calc();},10);
  /* Il registro si rilegge quando la sezione si apre, non a ogni tasto. */
  if(!_registroLetto){ _registroLetto=true; aggiornaRegistro(); }
}

/* ── Da dove viene il prezzo del materiale ─────────────────────────────────
   Tre stati, e nessuno è muto. Il terzo — «non verificato» — è quello che il
   preventivatore ha avuto per anni senza dirlo: un numero digitato una volta
   che nessuno ha più messo in discussione perché niente lo segnalava. */
function bandaMateriale(){
  var MC=(typeof window!=='undefined') && window.InglyMaterialCost;
  var stato=MC && typeof MC.statoCache==='function' ? MC.statoCache() : {pronta:false};
  var box=function(colore,icona,titolo,sotto){
    return '<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:8px;'
      +'background:var(--bg-card2);border-left:3px solid '+colore+';margin-bottom:10px">'
      +'<span style="font-size:13px;line-height:1.2">'+icona+'</span>'
      +'<div style="flex:1;min-width:0"><div style="font-size:11px;font-weight:700;color:'+colore+'">'+titolo+'</div>'
      +'<div style="font-size:10px;color:var(--text-muted);line-height:1.4;margin-top:2px">'+sotto+'</div></div></div>';
  };

  if(MAT_REG && MAT_REG.disponibile){
    var st=MAT_REG.storico||{};
    var extra=st.disponibile
      ? 'ultimo '+eur(st.ultimo)+' · medio '+eur(st.medio)+' · minimo '+eur(st.minimo)+' su '+st.acquisti+' acquisti'
      : '';
    return box('var(--green,#22c55e)','✅','Costo reale dal magazzino — '+eur(MAT_REG.costoUnitario)+'/'+(MAT_REG.unita==='l'?'L':'kg'),
      'Politica «'+MAT_REG.politica+'», spedizione compresa. '+extra);
  }
  if(!stato.pronta){
    return box('var(--text-dim)','⏳','Registro di magazzino in lettura',
      'Il prezzo qui sotto è quello del campo finché il registro non risponde.');
  }
  return box('var(--orange)','⚠️','Prezzo materiale non verificato',
    'Nessun acquisto a registro per questo materiale: il costo qui sotto è quello che hai scritto tu. '
    +'Registra l\'acquisto con il suo importo per avere il costo reale, spedizione compresa.');
}

/** Scrivere il prezzo a mano è legittimo, e disattiva la lettura dal registro:
    un numero digitato non può continuare a essere presentato come verificato. */
function setPrezzoMat(v){
  if(MAT_REG && MAT_REG.disponibile && Math.abs(parseFloat(v)-MAT_REG.costoUnitario)>0.005) MAT_REG=null;
  calc();
}

/* ── La card dello slicer ──────────────────────────────────────────────────
   Non aggiunge precisione al calcolo: toglie un errore. Il peso che uno
   slicer dichiara comprende quasi sempre supporti e spurgo, e chi lo copia
   nel campo «materiale» compilando anche «supporti» li paga due volte. La
   casella «il totale comprende già supporti e spurgo» è l'unica riga di
   questa card che conta davvero. */
function cardSlicer(){
  var attivo=SLICER.pesoTotale>0||SLICER.ore>0||SLICER.costo>0;
  var p=pesi();
  var campo=function(id,etichetta,valore,passo,nota){
    return '<div class="p3-fg"><label class="p3-fl">'+etichetta+'</label>'
      +'<input class="p3-fc" type="number" step="'+passo+'" value="'+(valore>0?valore:'')+'" placeholder="—" '
      +'oninput="Print3DQuoter.setSlicer(\''+id+'\',this.value)">'
      +(nota?'<div class="p3-ht">'+nota+'</div>':'')+'</div>';
  };
  return '<div class="p3-card'+(attivo?' cyan':'')+'">'
    +'<div class="p3-ct'+(attivo?' c':'')+'" style="display:flex;align-items:center;justify-content:space-between">'
      +'<span>📥 IMPORTA DALLO SLICER</span>'
      +(attivo?'<button class="btn btn-secondary btn-sm" onclick="Print3DQuoter.svuotaSlicer()">✕ Svuota</button>':'')
    +'</div>'
    +'<div class="p3-g2">'
      +campo('pesoTotale','⚖️ PESO TOTALE (g)',SLICER.pesoTotale,'1','Quello che dice lo slicer')
      +campo('ore','⏱️ TEMPO (h)',SLICER.ore,'0.25','')
      +campo('supporti','🧱 SUPPORTI (g)',SLICER.supporti,'1','')
      +campo('purge','🗑️ SPURGO / AMS (g)',SLICER.purge,'1','')
      +campo('kwh','🔋 ENERGIA (kWh)',SLICER.kwh,'0.01','Se lo slicer la dichiara')
      +campo('costo','💶 COSTO DICHIARATO (€)',SLICER.costo,'0.01','Per il confronto, non per il calcolo')
    +'</div>'
    +'<label style="display:flex;align-items:flex-start;gap:7px;margin-top:8px;cursor:pointer">'
      +'<input type="checkbox" '+(SLICER.includeTutto?'checked':'')+' onchange="Print3DQuoter.setSlicer(\'includeTutto\',this.checked)" style="margin-top:2px;accent-color:#22d3ee">'
      +'<span style="font-size:10px;color:var(--text-muted);line-height:1.45">Il peso totale comprende già supporti e spurgo'
      +'<br><span style="color:var(--text-dim)">Se è così, vengono sottratti invece che sommati: è il doppio conteggio più comune.</span></span>'
    +'</label>'
    +(attivo
      ? '<div style="margin-top:9px;padding:8px 10px;background:var(--bg-card2);border-radius:8px;font-size:10px;color:var(--text-muted);line-height:1.6">'
        +'Il conto userà <b style="color:var(--text)">'+Math.round(p.modello)+' g</b> di modello'
        +(p.supporti>0?' + <b style="color:var(--text)">'+Math.round(p.supporti)+' g</b> di supporti':'')
        +(p.purge>0?' + <b style="color:var(--text)">'+Math.round(p.purge)+' g</b> di spurgo':'')
        +' = <b style="color:#22d3ee">'+Math.round(p.modello+p.supporti+p.purge)+' g</b> in tutto.'
        +'</div>'
      : '<div class="p3-ht" style="margin-top:8px">Lascia vuoto per usare i campi qui sotto.</div>')
  +'</div>';
}

/* ── La banda dell'energia ─────────────────────────────────────────────────
   Quattro pulsanti che rispondono a una domanda sola: quanto cambierebbe il
   conto se il consumo lo misurassi davvero. Finché non c'era modo di
   chiederlo, non c'era ragione di misurare. */
function bandaEnergia(){
  var MODI=[
    {id:'auto',    lab:'Auto',      sotto:'il meglio che c\'è'},
    {id:'misurato',lab:'Misurato',  sotto:'kWh contati'},
    {id:'medio',   lab:'Medio',     sotto:'W medi'},
    {id:'targa',   lab:'Targa',     sotto:'W massimi'},
  ];
  var r=R&&!R.indisponibile?R:null;
  var e=r&&r._costo&&r._costo.energia ? r._costo.energia : null;
  var colore = e ? ({measured:'var(--green,#22c55e)',verified:'var(--green,#22c55e)',estimated:'var(--orange)',missing:'var(--red)'}[e.confidence]||'var(--text-muted)') : 'var(--text-muted)';
  return '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">'
    +'<label class="p3-fl">⚡ DA DOVE VIENE IL CONSUMO</label>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:6px">'
    +MODI.map(function(m){
      var on=ENE===m.id;
      return '<button onclick="Print3DQuoter.setEnergia(\''+m.id+'\')" style="padding:6px 3px;border-radius:6px;cursor:pointer;text-align:center;'
        +'border:1.5px solid '+(on?'#22d3ee':'var(--border2)')+';background:'+(on?'#22d3ee18':'transparent')+';color:'+(on?'#22d3ee':'var(--text-dim)')+'">'
        +'<span style="font-size:10px;font-weight:800;display:block">'+m.lab+'</span>'
        +'<span style="font-size:8px;opacity:.7">'+m.sotto+'</span></button>';
    }).join('')
    +'</div>'
    +(e
      ? '<div style="font-size:10px;color:'+colore+';line-height:1.45">'+e.detail
        +' → <b>'+eur(e.kwh*e.prezzoKwh)+'</b><br><span style="color:var(--text-muted)">'+e.nota+'</span></div>'
      : '<div class="p3-ht">Inserisci le ore per vedere quale dato viene usato.</div>')
  +'</div>';
}

function setType(t){T=t;render();}
function setIva(on){
  IVA_ON=on;
  var y=el('p3d-iva-yes'),n=el('p3d-iva-no');
  if(y){y.style.background=on?'var(--primary)':'var(--bg-card2)';y.style.color=on?'#fff':'var(--text-muted)';y.style.border=on?'none':'1px solid var(--border2)';}
  if(n){n.style.background=!on?'var(--primary)':'var(--bg-card2)';n.style.color=!on?'#fff':'var(--text-muted)';n.style.border=!on?'none':'1px solid var(--border2)';}
  render();
}
function setDisc(v){
  DISC=v;
  document.querySelectorAll('#view-print3d .p3-disc-btn').forEach(function(b){b.classList.remove('active');});
  var map={0:0,5:5,10:10,20:20};
  document.querySelectorAll('#view-print3d .p3-disc-btn').forEach(function(b){
    var txt=parseFloat(b.textContent);
    if(txt===v) b.classList.add('active');
  });
  var ci=el('p3d-disc-custom');if(ci)ci.value=v;
  render();
}

function pickMach(id){
  var m=(MACH[T]||[]).find(function(x){return x.id===id;});if(!m)return;
  var s=el('p3d-mach');if(s)s.value=id;
  sv('p3d-watt',m.w);sv('p3d-mc',m.c);sv('p3d-lh',m.l);
  /* Il costo orario lo calcola il motore macchine, che sa distinguere le
     quattro voci — corrente, ammortamento, manutenzione, consumabili — e sa
     dire se il consumo è misurato o dedotto dalla targa. Il suggerimento qui
     sotto era «250W · €299 · 3000h»: tre numeri di listino da cui nessuno
     poteva ricavare quanto costa un'ora. */
  var h=el('p3d-mach-hint');
  if(h){
    var MK=(typeof window!=='undefined') && window.InglyMachineCost;
    if(MK){
      var c=MK.daCatalogo({ id:m.id, name:m.n, price:m.c, life_h:m.l, w:m.w,
                            dutyCycle:gv('p3d-duty',1), maint:gv('p3d-mnt',0) },
                          { kwhPrice:gv('p3d-kwh',0.28) });
      h.innerHTML=m.n+' — <b style="color:#22d3ee">'+eur(c.machineCostPerHour)+'/h</b>'
        +' <span style="opacity:.7">(corrente '+eur(c.energyCostPerHour)
        +' · usura '+eur(c.depreciationCostPerHour)
        +' · manutenzione '+eur(c.maintenanceCostPerHour)+')</span>'
        +(c.energia.confidence==='estimated'
          ? '<br><span style="color:var(--orange)">⚠️ '+c.energia.nota+'</span>' : '');
    } else {
      h.textContent=m.n+' — '+m.w+'W · €'+m.c+' · '+m.l+'h vita utile';
    }
  }
  document.querySelectorAll('#view-print3d .p3-mb').forEach(function(b){b.classList.remove('sel');});
  var idx=(MACH[T]||[]).findIndex(function(x){return x.id===id;});
  var btns=document.querySelectorAll('#view-print3d .p3-mb');if(btns[idx])btns[idx].classList.add('sel');
  calc();
}
function pickMat(id){
  var m=MATS.find(function(x){return x.id===id;});if(!m)return;
  /* Il prezzo digitato è un punto di partenza, non una verità: se il registro
     di magazzino sa quanto è stato **pagato** davvero, quello vince. L'audit
     di Fase 1 ha misurato che l'intera differenza con lo slicer sul caso di
     calibrazione — € 2,46 su € 2,46 — era il prezzo del filamento: € 24,00/kg
     scritto in un campo contro € 15,52/kg effettivi. */
  MAT_REG=costoDalRegistro(m);
  sv('p3d-mkg', MAT_REG && MAT_REG.disponibile ? (Math.round(MAT_REG.costoUnitario*100)/100) : m.p);
  sv('p3d-mu',m.u);
  render();
}

/** Il costo di un materiale a registro, se c'è. Mai un valore di ripiego. */
function costoDalRegistro(m){
  var MC=(typeof window!=='undefined') && window.InglyMaterialCost;
  if(!MC || !m) return null;
  /* I materiali importati dal magazzino portano il loro id preceduto da «g»
     (vedi InglySync.importMaterials): è l'unico aggancio esistente fra le due
     liste, e finché il magazzino separato `p3dq_v4` non viene ritirato è
     l'unico modo onesto di collegarle. */
  var id = /^g/.test(String(m.id)) ? String(m.id).slice(1) : String(m.id);
  var e = MC.dallaCache(id, { articolo:{ unit: m.t==='resin' ? 'bottiglia' : 'bobina' } });
  return (e && e.disponibile) ? e : e;
}

/** Il registro si legge una volta per apertura di sezione, non a ogni tasto. */
function aggiornaRegistro(){
  var MC=(typeof window!=='undefined') && window.InglyMaterialCost;
  if(!MC || typeof MC.aggiornaCache!=='function') return;
  MC.aggiornaCache().then(function(){
    var sel=(el('p3d-mat')||{}).value;
    if(sel){ var m=MATS.find(function(x){return x.id===sel;}); if(m) MAT_REG=costoDalRegistro(m); }
    render();
  }).catch(function(){});
}
function addExtra(){
  var opts=EXT_PRE.map(function(p,i){return (i+1)+'. '+p.n+' (€'+p.c+')';}).join('\n');
  var r=prompt('Scegli numero o scrivi nome:\n\n'+opts,'');if(r===null)return;
  var idx=parseInt(r);var pre=(!isNaN(idx)&&idx>=1&&idx<=EXT_PRE.length)?EXT_PRE[idx-1]:{n:r||'Extra',c:2};
  EXTRAS.push({n:pre.n,c:pre.c});render();
}
function rmE(i){EXTRAS.splice(i,1);render();}
function upE(i,k,v){if(EXTRAS[i])EXTRAS[i][k]=(k==='c'?parseFloat(v)||0:v);calc();}

/* Un solo ingresso, letto una volta sola. Prima gli stessi campi venivano
   letti due volte con due nomi diversi — una per il costo, una per il prezzo —
   ed è il modo in cui due sistemi finiscono per possedere lo stesso numero. */
function ingresso(){
  var e=energiaScelta();
  var m=pesi();
  return {
    tecnologia:'print3d',
    qty:Math.max(1,gv('p3d-qty',1)),
    grams:m.modello, supportGrams:m.supporti, purgeGrams:m.purge,
    measuredEnergyKwh:e.measuredEnergyKwh, averagePowerW:e.averagePowerW, ratedPowerW:e.ratedPowerW,
    slicerMaterialCost:SLICER.costo>0?SLICER.costo:undefined,
    spoolPrice:gv('p3d-mkg',24), spoolGrams:gv('p3d-mu',1000),
    hours: SLICER.ore>0 ? SLICER.ore : gv('p3d-h',0),
    /* `watt` è il campo storico e resta il ripiego della targa. Quando si
       forza una lettura diversa non va passato: il motore lo userebbe come
       ultima risorsa, e la scelta dell'utente verrebbe scavalcata in
       silenzio. */
    watt: (ENE==='auto'||ENE==='targa') ? gv('p3d-watt',150) : undefined,
    kwhPrice:gv('p3d-kwh',.28), dutyCycle:gv('p3d-duty',1),
    machinePrice:gv('p3d-mc',400), machineLifeHours:gv('p3d-lh',2000),
    maintenancePerHour:gv('p3d-mnt',0),
    washCureMin:gv('p3d-wash',0), laborPerHour:gv('p3d-lr',15),
    setupMin:gv('p3d-setup',0), finishMin:gv('p3d-lm',0),
    failureRate:gv('p3d-fail',0),
    extras:EXTRAS.map(function(e){ return { label:e.n, cost:parseFloat(e.c)||0 }; }),
  };
}

/* ── I pesi, contati una volta sola ────────────────────────────────────────
   Il doppio conteggio più comune di tutti, e il più difficile da vedere: gli
   slicer dichiarano quasi sempre un **peso totale** che comprende già
   supporti e spurgo. Chi lo copia nel campo «materiale» e poi compila anche
   il campo «supporti» paga i supporti due volte, e il preventivo esce più
   alto del vero senza che niente sembri strano.

   Qui la regola è dichiarata: se lo slicer ha detto «totale», i supporti si
   **sottraggono** invece di sommarsi. */
function pesi(){
  if(SLICER.pesoTotale>0){
    if(SLICER.includeTutto){
      var modello = SLICER.pesoModello>0 ? SLICER.pesoModello
        : Math.max(0, SLICER.pesoTotale - SLICER.supporti - SLICER.purge);
      return { modello:modello, supporti:SLICER.supporti, purge:SLICER.purge, fonte:'slicer' };
    }
    return { modello:SLICER.pesoTotale, supporti:SLICER.supporti, purge:SLICER.purge, fonte:'slicer' };
  }
  return { modello:gv('p3d-g',0), supporti:gv('p3d-sup',0), purge:0, fonte:'manuale' };
}

/* ── L'energia, e quale delle tre si sta usando ────────────────────────────
   `auto` lascia decidere al motore, che ha la priorità dichiarata: kWh
   misurati, poi potenza media, poi targa. Le altre tre forzano una lettura, e
   servono a rispondere alla domanda «quanto cambierebbe se lo misurassi». */
function energiaScelta(){
  var targa=gv('p3d-watt',150);
  var media=gv('p3d-avgw',0);
  var kwh=SLICER.kwh>0 ? SLICER.kwh : gv('p3d-kwhm',0);
  if(ENE==='misurato') return { measuredEnergyKwh:kwh>0?kwh:undefined, averagePowerW:undefined, ratedPowerW:undefined };
  if(ENE==='medio')    return { measuredEnergyKwh:undefined, averagePowerW:media>0?media:undefined, ratedPowerW:undefined };
  if(ENE==='targa')    return { measuredEnergyKwh:undefined, averagePowerW:undefined, ratedPowerW:targa };
  return { measuredEnergyKwh:kwh>0?kwh:undefined,
           averagePowerW:media>0?media:undefined,
           ratedPowerW:targa };
}

function setEnergia(m){ ENE=m; render(); }

function setSlicer(k,v){
  SLICER[k]= (k==='includeTutto') ? !!v : (parseFloat(v)||0);
  render();
}

function svuotaSlicer(){
  SLICER={ pesoTotale:0, pesoModello:0, supporti:0, purge:0, ore:0, kwh:0, costo:0, includeTutto:true };
  render();
}

/* Le fonti dei numeri: dichiarate da chi li ha presi, mai dedotte. Il prezzo
   del materiale è «inventario» solo se arriva davvero dal magazzino — cioè se
   una voce è selezionata nel menu. Altrimenti è quello che c'è nel campo, e
   dirlo è l'unico modo perché un valore digitato una volta non diventi una
   verità permanente. */
function fonti(){
  var scelto=(el('p3d-mat')||{}).value;
  /* «Selezionato dal menu» non vuol dire «verificato»: la lista dei materiali
     del quoter è una copia in localStorage. Solo il registro può dire
     «inventario», e se non lo dice il numero resta di chi lo ha digitato. */
  var daRegistro = MAT_REG && MAT_REG.disponibile;
  return {
    materiale: daRegistro ? 'registro' : (scelto ? 'utente' : 'utente'),
    energia:'utente', macchina:'utente', manutenzione:'utente',
    manodopera:'utente', postProcesso:'utente', setup:'utente',
  };
}

function setModo(m){ MODO=m; render(); }

/* Cursore e casella scrivono la stessa variabile e si risincronizzano a
   vicenda: due controlli, un solo valore. */
function setMargine(v){
  var n=parseFloat(v);
  if(!isFinite(n)) return;
  MARG=Math.max(0,Math.min(95,n));
  var r=el('p3d-margin'); if(r && Math.round(MARG)!==parseFloat(r.value)) r.value=Math.round(MARG);
  var b=el('p3d-margin-num'); if(b && document.activeElement!==b) b.value=MARG.toFixed(1);
  calc();
}

function setCalib(v){ CALIB_RIF=parseFloat(v)||0; calc(); }

function calc(){
  /* Una sola chiamata, a una sola vista, che chiede a un solo motore.
     Qui c'erano due percorsi verso lo stesso `InglyCostEngine` — l'adapter
     `InglyPrint3D.cost` per il costo e tre moltiplicatori scritti a mano per
     il prezzo — e il secondo non era d'accordo con lo slider che diceva di
     comandarlo. Adesso il percorso è uno. */
  var V=(typeof window!=='undefined') && window.InglyQuoter3DView;
  var ing=ingresso();
  var qty=ing.qty;

  R = V ? V.calcola(ing, {
    modalita: MODO,
    marginePct: MARG,
    ivaPct: IVA_ON?22:0,
    scontoPct: DISC,
    quantita: [1,5,10,25,50,100],
    fonti: fonti(),
  }) : { indisponibile:true, motivo:'Vista preventivatore non disponibile' };

  var ok = R && !R.indisponibile;
  COST  = ok ? R.costo  : 0;
  PRICE = ok ? R.prezzo : 0;

  var t=el('p3d-hero-t');
  if(t) t.textContent = ok ? ('📊 IL CONTO — '+R.modalitaLabel) : '📊 IL CONTO';

  var h=el('p3d-hero'); if(h) h.innerHTML = V ? V.hero(R) : '';

  /* Gli avvisi del motore: non decorano, dicono quando un prezzo non sta in
     piedi. Nasconderli è come spegnere una spia. */
  var av=el('p3d-avvisi');
  if(av){
    var lista = ok ? (R.avvisi||[]) : [];
    av.innerHTML = lista.length ? '<div style="margin-top:10px;display:flex;flex-direction:column;gap:5px">'+lista.map(function(a){
      var testo = (a && (a.messaggio||a.testo||a.label)) || String(a);
      var grave = a && (a.livello==='errore'||a.gravita==='errore');
      return '<div style="font-size:11px;padding:7px 9px;border-radius:8px;background:var(--bg-card2);border-left:3px solid '
        +(grave?'var(--red)':'var(--orange)')+';color:var(--text-muted)">'+(grave?'⛔ ':'⚠️ ')+testo+'</div>';
    }).join('')+'</div>' : '';
  }

  var bk=el('p3d-bk');
  if(bk){
    bk.innerHTML = (ok && V) ? V.dettaglio(R)
      : '<div style="color:var(--text-dim);text-align:center;padding:20px;font-size:12px">'+((R&&R.motivo)||'Inserisci grammi e ore per vedere il calcolo')+'</div>';
  }

  var sc=el('p3d-scaglioni');
  if(sc){
    var tab = (ok && V) ? V.quantita(R) : '';
    sc.innerHTML = tab || '<div style="color:var(--text-dim);text-align:center;padding:16px;font-size:11px">Inserisci i dati per vedere gli scaglioni</div>';
  }

  var tc=el('p3d-tiers');
  if(tc){
    var pol = (ok && V) ? V.strategie(R) : '';
    tc.innerHTML = pol
      ? pol+'<div class="p3-ht" style="margin-top:8px">Sono i margini che il motore consiglia. Il prezzo in alto usa il tuo: '+MARG.toFixed(1)+'%.</div>'
      : '<div style="color:var(--text-dim);text-align:center;padding:16px;font-size:11px">Inserisci i dati per vedere i prezzi</div>';
  }

  var co=el('p3d-calib-out');
  if(co){
    var MOT=(typeof window!=='undefined') && window.InglyCostEngine;
    if(CALIB_RIF>0 && MOT && V){
      co.innerHTML=V.calibrazione(MOT.calibra(ing,{costo:CALIB_RIF,sistema:'slicer'}));
    }else{
      co.innerHTML='<div style="font-size:11px;color:var(--text-dim)">Inserisci il costo che ti dice lo slicer (o un altro preventivatore) per capire a quale domanda stava rispondendo.</div>';
    }
  }

  var ml=el('p3d-ml');
  if(ml && ok){
    ml.textContent='Prezzo '+eur(R.prezzo)+' su un costo di '+eur(R.costo)
      +' — un ricarico ×'+(R.costo>0?(R.prezzo/R.costo).toFixed(2):'—')+'. Per '+qty+' pz: '+eur(R.prezzo*qty)+' netti.';
  }
}

function addLine(){
  var name=(el('p3d-name')||{}).value||('Stampa 3D '+T.toUpperCase());
  var qty=Math.max(1,gv('p3d-qty',1));
  if(COST<=0){showToastP('⚠️ Inserisci grammi e ore di stampa prima','warning');return;}
  /* `ppz` è il netto già scontato — lo stesso numero che si legge a schermo.
     Prima la riga registrava il prezzo di listino mentre lo scaglione ne
     mostrava un altro con IVA: due colonne, sulla stessa schermata, diverse
     del 22% senza che nulla lo dicesse. */
  var listino = DISC>0 ? PRICE/(1-DISC/100) : PRICE;
  LINES.push({id:Date.now(),n:name,qty:qty,cpz:COST,ppz:PRICE,ppzListino:listino,
              marg:MARG,modo:MODO,manuale:false,t:T});
  showToastP('✅ Aggiunto: '+name+' — '+eur(PRICE)+'/pz netti','success');
  render();
}
function rmLine(id){LINES=LINES.filter(function(l){return l.id!==id;});render();}
function editLine(id){
  var l=LINES.find(function(x){return x.id===id;});if(!l)return;
  var np=parseFloat(prompt('Modifica prezzo/pz per "'+l.n+'" (attuale: '+eur(l.ppz)+'):',l.ppz.toFixed(2)));
  /* Un prezzo scritto a mano resta un prezzo scritto a mano: la riga lo
     dichiara, così il margine medio non lo conta come se fosse calcolato. */
  if(!isNaN(np)&&np>0){l.ppz=np;l.ppzListino=np;l.manuale=true;render();showToastP('✏️ Prezzo forzato a mano','info');}
}
function clearLines(){if(!LINES.length||confirm('Svuotare tutte le voci?')){LINES=[];render();}}
function doSave(){
  if(!LINES.length){showToastP('⚠️ Aggiungi almeno una voce','warning');return;}
  var n=(el('p3d-name')||{}).value||'Preventivo 3D';
  var client=(el('p3d-client')||{}).value||'';
  var total=LINES.reduce(function(a,l){return a+l.ppz*l.qty;},0);
  SAVED.unshift({id:Date.now(),n:n,client:client,lines:JSON.parse(JSON.stringify(LINES)),total:total,d:new Date().toLocaleDateString('it-IT'),t:T});
  if(SAVED.length>30)SAVED=SAVED.slice(0,30);
  persist();render();showToastP('💾 Salvato: '+n+' · '+eur(total),'success');
}
function loadSaved(id){var q=SAVED.find(function(x){return x.id==id;});if(!q)return;LINES=JSON.parse(JSON.stringify(q.lines));T=q.t;render();showToastP('📋 Caricato: '+q.n,'info');}
function delSaved(id){SAVED=SAVED.filter(function(x){return x.id!=id;});persist();render();}
function clearSaved(){if(confirm('Eliminare tutti i preventivi salvati?')){SAVED=[];persist();render();}}

function doPdf(){
  if(!LINES.length){showToastP('⚠️ Nessuna voce','warning');return;}
  var name=(el('p3d-name')||{}).value||'Preventivo 3D';
  var client=(el('p3d-client')||{}).value||'';
  var notes=(el('p3d-notes')||{}).value||'';
  var totN=LINES.reduce(function(a,l){return a+l.ppz*l.qty;},0);
  var listino=LINES.reduce(function(a,l){return a+(l.ppzListino||l.ppz)*l.qty;},0);
  var discAmt=listino-totN;   // già scontato nelle righe: qui si dichiara, non si riapplica
  var vatAmt=IVA_ON?totN*0.22:0;
  var gross=totN+vatAmt;
  var tbody=LINES.map(function(l){return '<tr><td>'+l.n+' '+(l.t==='resin'?'🧴':'🧵')+'</td><td align="center">'+l.qty+'</td><td align="right">'+eur(l.ppz)+'</td><td align="right"><strong>'+eur(l.ppz*l.qty)+'</strong></td></tr>';}).join('');
  var w=window.open('','_blank','width=800,height=1000');if(!w){showToastP('Popup bloccato','warning');return;}
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+name+'</title>'
    +'<style>body{font-family:Arial,sans-serif;padding:40px;max-width:720px;margin:0 auto}h1{color:#0891b2;border-bottom:3px solid #0891b2;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#0891b2;color:#fff;padding:10px 12px;text-align:left}td{padding:9px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}tr:nth-child(even)td{background:#f8fafc}.tr{font-size:13px;display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e5e7eb}.grand{font-size:22px;font-weight:800;color:#0891b2;margin-top:8px;text-align:right}.footer{margin-top:32px;font-size:10px;color:#9ca3af}</style>'
    +'</head><body><h1>🖨️ Preventivo Stampa 3D</h1>'
    +'<p style="color:#6b7280">'+(client?'<strong>Cliente:</strong> '+client+' &nbsp;·&nbsp; ':'')+new Date().toLocaleDateString('it-IT')+' &nbsp;·&nbsp; <strong>'+name+'</strong></p>'
    +'<table><thead><tr><th>Prodotto</th><th>Qtà</th><th>Prezzo/pz</th><th>Subtotale</th></tr></thead><tbody>'+tbody+'</tbody></table>'
    +'<div style="margin-top:20px;border-top:2px solid #e5e7eb;padding-top:12px">'
    +(discAmt>0.005?'<div class="tr"><span>Listino</span><span>'+eur(listino)+'</span></div>'
      +'<div class="tr"><span>Sconto '+DISC+'%</span><span style="color:#ef4444">-'+eur(discAmt)+'</span></div>':'')
    +'<div class="tr"><span>Subtotale</span><span>'+eur(totN)+'</span></div>'
    +(IVA_ON?'<div class="tr"><span>IVA 22%</span><span>'+eur(vatAmt)+'</span></div>':'')
    +'<div class="grand">TOTALE: '+eur(gross)+(IVA_ON?' (IVA incl.)':' (senza IVA)')+'</div></div>'
    +(notes?'<div style="margin-top:24px;padding:12px;background:#f0f9ff;border-radius:8px;font-size:12px;color:#6b7280"><strong>Note:</strong> '+notes+'</div>':'')
    +'<div class="footer">Generato da INGLY OS · Smart Quoter 3D · '+new Date().toLocaleString('it-IT')+'</div>'
    +'<br><button onclick="window.print()" style="padding:10px 20px;background:#0891b2;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;margin-top:16px">🖨️ Stampa / PDF</button>'
    +'</body></html>');w.document.close();
}

function doWa(){
  if(!LINES.length){showToastP('⚠️ Nessuna voce','warning');return;}
  var name=(el('p3d-name')||{}).value||'Stampa 3D';
  var totN=LINES.reduce(function(a,l){return a+l.ppz*l.qty;},0);
  var listino=LINES.reduce(function(a,l){return a+(l.ppzListino||l.ppz)*l.qty;},0);
  var gross=IVA_ON?totN*1.22:totN;
  var lines=LINES.map(function(l){return '• '+l.n+' ×'+l.qty+' = '+eur(l.ppz*l.qty);}).join('\n');
  var msg='🖨️ *Preventivo Stampa 3D*\n\n*'+name+'*\n\n'+lines
    +(listino-totN>0.005?'\n\nListino: '+eur(listino)+'\nSconto '+DISC+'%: -'+eur(listino-totN):'')
    +'\nSubtotale: '+eur(totN)
    +'\n*TOTALE: '+eur(gross)+'*'+(IVA_ON?' (IVA 22% inclusa)':' (senza IVA)')
    +'\n📅 '+new Date().toLocaleDateString('it-IT');
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}

function sendQ(){
  if(!LINES.length){showToastP('⚠️ Nessuna voce','warning');return;}
  /* Qui si chiamava `Quoter.addLine(oggetto)`. `Quoter.addLine` è dichiarata
     senza parametri: legge i campi del proprio form (`ql-cat`, `ql-resource`,
     `ql-unit-cost`). L'oggetto veniva ignorato, il form era vuoto, e la
     funzione usciva subito con «Seleziona una categoria» — mentre il
     preventivatore 3D annunciava «✅ Inviato». Nessuna riga è mai arrivata.

     La firma giusta era accanto: `addLineFromCalc(d)`, che accetta anche
     `unitCost`. Il vecchio percorso buttava via il costo comunque, e una riga
     senza costo arriva all'ordine senza `costBreakdown`. */
  var Q=(typeof Quoter!=='undefined')?Quoter:(typeof window!=='undefined'?window.Quoter:null);
  if(!Q||typeof Q.addLineFromCalc!=='function'){
    showToastP('Apri prima lo Smart Quoter dalla sidebar','warning');return;
  }
  LINES.forEach(function(l){
    Q.addLineFromCalc({ name:l.n, category:'Stampa 3D', unit:'pz',
                        qty:l.qty, unitCost:l.cpz });
  });
  showToastP('✅ Inviate allo Smart Quoter '+LINES.length+' voci con il loro costo','success');
  if(typeof App!=='undefined')App.navigate('quoter');
}

function reset(){
  if(!confirm('Resettare tutto il preventivo 3D?'))return;
  LINES=[];EXTRAS=[];COST=0;PRICE=0;R=null;CALIB_RIF=0;IVA_ON=true;DISC=0;MODO='completo';MARG=(1-1/3.5)*100;
  render();showToastP('🔄 Reset completato','info');
}

function openMat(){renderMatList();var m=el('p3d-mat-modal');if(m)m.classList.add('open');}
function closeMat(){var m=el('p3d-mat-modal');if(m)m.classList.remove('open');render();}
function renderMatList(){
  var root=el('p3d-mat-list');if(!root)return;
  function grp(title,color,icon,items){
    return '<div style="font-size:10px;color:'+color+';font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin:14px 0 8px">'+icon+' '+title+' ('+items.length+')</div>'
      +(items.length?items.map(function(m){
        return '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg-card2);border-radius:8px;margin-bottom:5px;border:1px solid var(--border)">'
          +'<div style="flex:1"><div style="font-size:12px;font-weight:600;color:var(--text)">'+m.n+'</div>'
          +'<div style="font-size:10px;color:#475569">'+m.s+' · €'+m.p+'/'+(m.t==='resin'?'L':'kg')+' · '+m.u+(m.t==='resin'?'ml':'g')+'</div></div>'
          +'<button class="act-btn act-edit" onclick="Print3DQuoter.editMat(\''+m.id+'\')">✏️</button>'
          +'<button class="act-btn act-del" onclick="Print3DQuoter.delMat(\''+m.id+'\')">🗑️</button></div>';
      }).join(''):'<div style="color:#475569;font-size:12px;padding:8px">Nessun materiale — aggiungine uno sopra</div>');
  }
  root.innerHTML=grp('FDM','#22d3ee','🧵',MATS.filter(function(m){return m.t==='fdm';}))
               +grp('Resina','#a78bfa','🧴',MATS.filter(function(m){return m.t==='resin';}));
}
function addMat(){
  var n=(el('p3d-mn')||{}).value.trim();
  var t=(el('p3d-mt')||{value:'fdm'}).value;
  var p=parseFloat((el('p3d-mp')||{}).value);
  var u=parseFloat((el('p3d-muu')||{value:1000}).value)||1000;
  var s=(el('p3d-ms')||{}).value.trim()||'Generico';
  if(!n||!p||isNaN(p)){showToastP('⚠️ Inserisci nome e prezzo','warning');return;}
  MATS.push({id:'m'+Date.now(),n:n,t:t,p:p,u:u,s:s});
  persist();renderMatList();
  ['p3d-mn','p3d-mp','p3d-ms'].forEach(function(id){var e=el(id);if(e)e.value='';});
  showToastP('✅ Aggiunto: '+n,'success');
}
function editMat(id){
  var m=MATS.find(function(x){return x.id===id;});if(!m)return;
  var np=parseFloat(prompt('Nuovo prezzo €/'+(m.t==='resin'?'L':'kg')+' per "'+m.n+'":', m.p));
  if(!isNaN(np)&&np>0){m.p=np;persist();renderMatList();showToastP('✏️ Aggiornato','info');}
}
function delMat(id){
  if(!confirm('Eliminare?'))return;
  MATS=MATS.filter(function(m){return m.id!==id;});persist();renderMatList();
}

return{render:render,calc:calc,reset:reset,setType:setType,setIva:setIva,setDisc:setDisc,
  pickMach:pickMach,pickMat:pickMat,addExtra:addExtra,rmE:rmE,upE:upE,
  addLine:addLine,rmLine:rmLine,editLine:editLine,clearLines:clearLines,
  doSave:doSave,loadSaved:loadSaved,delSaved:delSaved,clearSaved:clearSaved,
  doPdf:doPdf,doWa:doWa,sendQ:sendQ,openMat:openMat,closeMat:closeMat,
  addMat:addMat,editMat:editMat,delMat:delMat,
  setModo:setModo,setMargine:setMargine,setCalib:setCalib,setPrezzoMat:setPrezzoMat,
  setEnergia:setEnergia,setSlicer:setSlicer,svuotaSlicer:svuotaSlicer,
  aggiornaRegistro:aggiornaRegistro,
  /* Letto dal collaudo per verificare l'ingresso senza ricostruirlo: un
     collaudo che ricopia la lettura dei campi prova la propria copia. */
  _ingresso:ingresso,
  /* Letto da patch 109 per «→ Catalogo», che prima lo cercava e non lo
     trovava: `_state` non è mai stato esportato, e il pulsante salvava a
     costo 0 un prodotto il cui prezzo leggeva per scraping di una dimensione
     di carattere che nel frattempo era cambiata. */
  _state:function(){ return { cost:COST, price:PRICE, margine:MARG, modo:MODO, lines:LINES.slice(), mats:MATS.slice() }; },
};
})();

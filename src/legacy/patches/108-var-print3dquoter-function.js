
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

var T='fdm',MATS=[],LINES=[],EXTRAS=[],SAVED=[],COST=0,PRICES={p1:0,p2:0,p3:0};
var IVA_ON=true, DISC=0;
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

function render(){
  hydrate();
  var root=el('view-print3d');if(!root)return;
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
    // Calcola con IVA e sconto
    var discAmt=totN*(DISC/100);
    var afterDisc=totN-discAmt;
    var vatAmt=IVA_ON?afterDisc*0.22:0;
    var gross=afterDisc+vatAmt;
    var mg=totN>0?((totN-totC)/totN*100):0;
    linesHtml='<table><thead><tr>'
      +'<th>Descrizione</th><th style="text-align:center">Qtà</th><th style="text-align:right">Costo/pz</th><th style="text-align:right">Prezzo/pz</th><th style="text-align:right">Subtot.</th><th></th>'
      +'</tr></thead><tbody>'+rows+'</tbody></table>'
      +'<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">'
      +'<div class="p3-sr"><span style="color:var(--text-muted)">Costo Vivo</span><span style="font-weight:700;color:#fff">'+eur(totC)+'</span></div>'
      +'<div class="p3-sr"><span style="color:var(--text-muted)">Subtotale netto</span><span style="font-weight:700;color:#fff">'+eur(totN)+'</span></div>'
      +(DISC>0?'<div class="p3-sr"><span style="color:var(--text-muted)">Sconto ('+DISC+'%)</span><span style="font-weight:700;color:var(--red)">-'+eur(discAmt)+'</span></div>':'')
      +'<div class="p3-sr"><span style="color:var(--text-muted)">Margine medio</span><span style="font-weight:700;color:'+(mg>=30?'var(--green)':'var(--red)')+'">'+mg.toFixed(1)+'%</span></div>'
      +(IVA_ON?'<div class="p3-sr"><span style="color:var(--text-muted)">IVA (22%)</span><span style="font-weight:700;color:#fff">'+eur(vatAmt)+'</span></div>':'')
      +'<div class="p3-tbox">'
        +'<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">'+(IVA_ON?'TOTALE IVA INCLUSA':'TOTALE SENZA IVA')+'</div>'
        +'<div style="font-size:28px;font-weight:900;color:#22d3ee;line-height:1">'+eur(gross)+'</div>'
        +'<div style="font-size:11px;color:var(--text-muted);margin-top:5px">'+(DISC>0?'Sconto '+DISC+'% applicato · ':'')+(IVA_ON?'IVA 22% inclusa':'Prezzi netti')+'</div>'
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
        +'<div class="p3-fg"><label class="p3-fl">💡 €/kWh</label><input class="p3-fc" id="p3d-kwh" type="number" step="0.01" value="0.28" oninput="Print3DQuoter.calc()"><div class="p3-ht">Media IT: 0.24–0.32</div></div>'
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
    +'</div>'
    // Materiale
    +'<div class="p3-card cyan">'
      +'<div class="p3-ct c" id="p3d-mat-title">'+(isFdm?'🧵 FILAMENTO':'🧴 RESINA')+'</div>'
      +'<div class="p3-fg"><label class="p3-fl">DAL MAGAZZINO <button onclick="Print3DQuoter.openMat()" style="background:none;border:none;color:#a78bfa;cursor:pointer;font-size:10px;font-weight:700">+ Gestisci</button></label>'
        +'<select class="p3-fc" id="p3d-mat" onchange="Print3DQuoter.pickMat(this.value)"><option value="">— Scegli materiale —</option>'+matOpts+'</select></div>'
      +'<div class="p3-g2">'
        +'<div class="p3-fg"><label class="p3-fl" id="p3d-mp-l">'+(isFdm?'€/kg':'€/L')+'</label><input class="p3-fc" id="p3d-mkg" type="number" step="0.5" value="24" oninput="Print3DQuoter.calc()"></div>'
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
    +'<div class="p3-card"><div class="p3-ct">🔢 DETTAGLIO COSTI — live</div><div id="p3d-bk"><div style="color:var(--text-dim);text-align:center;padding:20px;font-size:12px">Inserisci grammi e ore per vedere il calcolo</div></div></div>'
  +'</div>'

  // ─── COL 3 ───────────────────────────────────────────────────
  +'<div class="p3-col">'
    // Prezzi
    +'<div class="p3-card cyan">'
      +'<div class="p3-ct c">💰 PREZZI DI VENDITA</div>'
      +'<div class="p3-g3" style="margin-bottom:12px">'
        +'<div><label style="font-size:9px;color:#22d3ee;display:block;margin-bottom:3px;font-weight:700">× SINGOLO<br><span style="opacity:.6;font-weight:400">1–5 pz</span></label><input class="p3-fc" id="p3d-m1" type="number" step="0.1" value="3.5" oninput="Print3DQuoter.calc()" style="font-size:16px;font-weight:900;color:#22d3ee;text-align:center;padding:7px 4px"></div>'
        +'<div><label style="font-size:9px;color:var(--primary);display:block;margin-bottom:3px;font-weight:700">× SERIE<br><span style="opacity:.6;font-weight:400">6–30 pz</span></label><input class="p3-fc" id="p3d-m2" type="number" step="0.1" value="2.8" oninput="Print3DQuoter.calc()" style="font-size:16px;font-weight:900;color:var(--primary);text-align:center;padding:7px 4px"></div>'
        +'<div><label style="font-size:9px;color:var(--orange);display:block;margin-bottom:3px;font-weight:700">× STOCK<br><span style="opacity:.6;font-weight:400">30+ pz</span></label><input class="p3-fc" id="p3d-m3" type="number" step="0.1" value="2.2" oninput="Print3DQuoter.calc()" style="font-size:16px;font-weight:900;color:var(--orange);text-align:center;padding:7px 4px"></div>'
      +'</div>'
      +'<div id="p3d-tiers"><div style="color:var(--text-dim);text-align:center;padding:16px;font-size:11px">Inserisci i dati per vedere i prezzi</div></div>'
      +'<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">'
        +'<label style="font-size:10px;color:var(--text-muted);display:flex;justify-content:space-between;margin-bottom:4px"><span>Margine minimo target</span><span id="p3d-ml" style="color:var(--green);font-weight:700">40%</span></label>'
        +'<input type="range" id="p3d-margin" min="10" max="80" step="5" value="40" oninput="Print3DQuoter.updML();Print3DQuoter.calc()" style="width:100%;accent-color:var(--green)">'
      +'</div>'
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

  setTimeout(function(){calc();},10);
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
  var h=el('p3d-mach-hint');if(h)h.textContent=m.n+' — '+m.w+'W · €'+m.c+' · '+m.l+'h vita utile';
  sv('p3d-watt',m.w);sv('p3d-mc',m.c);sv('p3d-lh',m.l);
  document.querySelectorAll('#view-print3d .p3-mb').forEach(function(b){b.classList.remove('sel');});
  var idx=(MACH[T]||[]).findIndex(function(x){return x.id===id;});
  var btns=document.querySelectorAll('#view-print3d .p3-mb');if(btns[idx])btns[idx].classList.add('sel');
  calc();
}
function pickMat(id){
  var m=MATS.find(function(x){return x.id===id;});if(!m)return;
  sv('p3d-mkg',m.p);sv('p3d-mu',m.u);calc();
}
function addExtra(){
  var opts=EXT_PRE.map(function(p,i){return (i+1)+'. '+p.n+' (€'+p.c+')';}).join('\n');
  var r=prompt('Scegli numero o scrivi nome:\n\n'+opts,'');if(r===null)return;
  var idx=parseInt(r);var pre=(!isNaN(idx)&&idx>=1&&idx<=EXT_PRE.length)?EXT_PRE[idx-1]:{n:r||'Extra',c:2};
  EXTRAS.push({n:pre.n,c:pre.c});render();
}
function rmE(i){EXTRAS.splice(i,1);render();}
function upE(i,k,v){if(EXTRAS[i])EXTRAS[i][k]=(k==='c'?parseFloat(v)||0:v);calc();}
function updML(){var v=(el('p3d-margin')||{value:40}).value;st('p3d-ml',v+'%');}

function calc(){
  /* La matematica sta in `InglyPrint3D.cost` — una funzione pura, provata da
     tests/print3d-cost.test.mjs. Qui si leggono i campi e si disegna il
     risultato: due mestieri separati, che prima erano lo stesso. */
  var qty=Math.max(1,gv('p3d-qty',1));
  var minM=gv('p3d-margin',40);
  var m1=gv('p3d-m1',3.5),m2=gv('p3d-m2',2.8),m3=gv('p3d-m3',2.2);
  var mu=gv('p3d-mu',1000), mpkg=gv('p3d-mkg',24);

  var R = window.InglyPrint3D.cost({
    grams: gv('p3d-g',0),
    supportGrams: gv('p3d-sup',0),
    spoolPrice: mpkg, spoolGrams: mu,
    hours: gv('p3d-h',0),
    watt: gv('p3d-watt',150), kwhPrice: gv('p3d-kwh',.28), dutyCycle: gv('p3d-duty',1),
    machinePrice: gv('p3d-mc',400), machineLifeHours: gv('p3d-lh',2000),
    maintenancePerHour: gv('p3d-mnt',0),
    washCureMin: gv('p3d-wash',0), laborPerHour: gv('p3d-lr',15),
    setupMin: gv('p3d-setup',0), finishMin: gv('p3d-lm',0), qty: qty,
    failureRate: gv('p3d-fail',0),
    extras: EXTRAS.map(function(e){ return { label:e.n, cost:parseFloat(e.c)||0 }; }),
  });

  var total=R.costo;
  COST=total;PRICES={p1:total*m1,p2:total*m2,p3:total*m3};

  var ICONE={materiale:'🧵',energia:'⚡',ammortamento:'🏭',manutenzione:'🔧',
             postProcesso:'🚿',manodopera:'👤',scarto:'📉',extra:'✨'};
  var COLORI={materiale:'#22d3ee',energia:'var(--primary)',ammortamento:'var(--purple)',
              manutenzione:'#94a3b8',postProcesso:'#38bdf8',manodopera:'var(--green)',
              scarto:'var(--orange)',extra:'#f472b6'};

  var bk=el('p3d-bk');
  if(bk){
    if(total<=0){bk.innerHTML='<div style="color:var(--text-dim);text-align:center;padding:20px;font-size:12px">Inserisci grammi e ore per vedere il calcolo</div>';}
    else{
      bk.innerHTML=R.voci.map(function(v){
        return '<div class="p3-bkr"><span style="color:#94a3b8">'+(ICONE[v.id]||'•')+' '+v.label
          +'<span style="display:block;font-size:9px;color:#64748b">'+v.detail+'</span></span>'
          +'<span style="font-weight:700;font-size:12px;color:'+(COLORI[v.id]||'#94a3b8')+'">'+eur(v.value)+'</span></div>';
      }).join('')+'<div class="p3-bkt"><span style="color:#fff">🔢 COSTO / PZ</span><span style="color:#22d3ee">'+eur(total)+'</span></div>'
        +'<div style="font-size:10px;color:#64748b;margin-top:6px;line-height:1.5">Con margine del '+minM+'% il prezzo sarebbe <b style="color:#22d3ee">'+eur(R.prezzoDaMargine(minM))+'</b> — un ricarico ×'+(total>0?(R.prezzoDaMargine(minM)/total).toFixed(2):'—')+', non ×'+(1+minM/100).toFixed(2)+'.</div>';
    }
  }

  var tc=el('p3d-tiers');
  if(tc){
    if(total<=0){tc.innerHTML='<div style="color:var(--text-dim);text-align:center;padding:16px;font-size:11px">Inserisci i dati per vedere i prezzi</div>';}
    else{
      var disc=DISC/100;
      tc.innerHTML=[
        {l:'🔵 SINGOLO',sub:'1–5 pz', p:PRICES.p1,m:m1,col:'#22d3ee', bc:'#22d3ee'},
        {l:'🟡 SERIE',  sub:'6–30 pz',p:PRICES.p2,m:m2,col:'var(--primary)',bc:'#6366f1'},
        {l:'🟠 STOCK',  sub:'30+ pz', p:PRICES.p3,m:m3,col:'var(--orange)',bc:'#f97316'},
      ].map(function(t){
        var mg=t.p>0?((t.p-total)/t.p*100):0,ok=mg>=minM;
        var pAfterDisc=t.p*(1-disc);
        var pFinal=IVA_ON?pAfterDisc*1.22:pAfterDisc;
        return '<div class="p3-tier" style="border-color:'+t.bc+'40;background:#0a1520">'
          +'<div style="flex:1">'
            +'<div style="font-size:11px;font-weight:700;color:'+t.col+'">'+t.l+' <span style="font-size:9px;font-weight:400;opacity:.6">'+t.sub+'</span></div>'
            +'<div style="font-size:10px;color:#475569;margin-top:2px">×'+t.m+' · Margine <span style="color:'+(ok?'var(--green)':'var(--red)')+'">'+mg.toFixed(0)+'%'+(ok?' ✓':' ⚠️')+'</span>'
              +(DISC>0?' · Sconto '+DISC+'%':'')
            +'</div>'
          +'</div>'
          +'<div style="text-align:right">'
            +'<div style="font-size:20px;font-weight:900;color:#fff">'+eur(pFinal)+'</div>'
            +'<div style="font-size:10px;color:#64748b">'+(IVA_ON?'IVA incl.':'netto')+' · ×'+qty+': '+eur(pFinal*qty)+'</div>'
          +'</div>'
          +'</div>';
      }).join('');
    }
  }
}

function addLine(){
  var name=(el('p3d-name')||{}).value||('Stampa 3D '+T.toUpperCase());
  var qty=Math.max(1,gv('p3d-qty',1));
  if(COST<=0){showToastP('⚠️ Inserisci grammi e ore di stampa prima','warning');return;}
  LINES.push({id:Date.now(),n:name,qty:qty,cpz:COST,ppz:PRICES.p1,t:T});
  showToastP('✅ Aggiunto: '+name+' — '+eur(PRICES.p1)+'/pz','success');
  render();
}
function rmLine(id){LINES=LINES.filter(function(l){return l.id!==id;});render();}
function editLine(id){
  var l=LINES.find(function(x){return x.id===id;});if(!l)return;
  var np=parseFloat(prompt('Modifica prezzo/pz per "'+l.n+'" (attuale: '+eur(l.ppz)+'):',l.ppz.toFixed(2)));
  if(!isNaN(np)&&np>0){l.ppz=np;render();showToastP('✏️ Prezzo aggiornato','info');}
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
  var discAmt=totN*(DISC/100);
  var afterDisc=totN-discAmt;
  var vatAmt=IVA_ON?afterDisc*0.22:0;
  var gross=afterDisc+vatAmt;
  var tbody=LINES.map(function(l){return '<tr><td>'+l.n+' '+(l.t==='resin'?'🧴':'🧵')+'</td><td align="center">'+l.qty+'</td><td align="right">'+eur(l.ppz)+'</td><td align="right"><strong>'+eur(l.ppz*l.qty)+'</strong></td></tr>';}).join('');
  var w=window.open('','_blank','width=800,height=1000');if(!w){showToastP('Popup bloccato','warning');return;}
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>'+name+'</title>'
    +'<style>body{font-family:Arial,sans-serif;padding:40px;max-width:720px;margin:0 auto}h1{color:#0891b2;border-bottom:3px solid #0891b2;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#0891b2;color:#fff;padding:10px 12px;text-align:left}td{padding:9px 12px;border-bottom:1px solid #e5e7eb;font-size:13px}tr:nth-child(even)td{background:#f8fafc}.tr{font-size:13px;display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #e5e7eb}.grand{font-size:22px;font-weight:800;color:#0891b2;margin-top:8px;text-align:right}.footer{margin-top:32px;font-size:10px;color:#9ca3af}</style>'
    +'</head><body><h1>🖨️ Preventivo Stampa 3D</h1>'
    +'<p style="color:#6b7280">'+(client?'<strong>Cliente:</strong> '+client+' &nbsp;·&nbsp; ':'')+new Date().toLocaleDateString('it-IT')+' &nbsp;·&nbsp; <strong>'+name+'</strong></p>'
    +'<table><thead><tr><th>Prodotto</th><th>Qtà</th><th>Prezzo/pz</th><th>Subtotale</th></tr></thead><tbody>'+tbody+'</tbody></table>'
    +'<div style="margin-top:20px;border-top:2px solid #e5e7eb;padding-top:12px">'
    +'<div class="tr"><span>Subtotale</span><span>'+eur(totN)+'</span></div>'
    +(DISC>0?'<div class="tr"><span>Sconto '+DISC+'%</span><span style="color:#ef4444">-'+eur(discAmt)+'</span></div>':'')
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
  var afterDisc=totN*(1-DISC/100);
  var gross=IVA_ON?afterDisc*1.22:afterDisc;
  var lines=LINES.map(function(l){return '• '+l.n+' ×'+l.qty+' = '+eur(l.ppz*l.qty);}).join('\n');
  var msg='🖨️ *Preventivo Stampa 3D*\n\n*'+name+'*\n\n'+lines
    +'\n\nSubtotale: '+eur(totN)
    +(DISC>0?'\nSconto '+DISC+'%: -'+eur(totN*(DISC/100)):'')
    +'\n*TOTALE: '+eur(gross)+'*'+(IVA_ON?' (IVA 22% inclusa)':' (senza IVA)')
    +'\n📅 '+new Date().toLocaleDateString('it-IT');
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
}

function sendQ(){
  if(!LINES.length){showToastP('⚠️ Nessuna voce','warning');return;}
  if(typeof Quoter!=='undefined'&&typeof Quoter.addLine==='function'){
    LINES.forEach(function(l){Quoter.addLine({desc:l.n,qty:l.qty,price:l.ppz});});
    showToastP('✅ Inviato allo Smart Quoter ('+LINES.length+' voci)','success');
    if(typeof App!=='undefined')App.navigate('quoter');
  }else{showToastP('Apri prima lo Smart Quoter dalla sidebar','warning');}
}

function reset(){
  if(!confirm('Resettare tutto il preventivo 3D?'))return;
  LINES=[];EXTRAS=[];COST=0;PRICES={p1:0,p2:0,p3:0};IVA_ON=true;DISC=0;
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
  addMat:addMat,editMat:editMat,delMat:delMat,updML:updML,};
})();

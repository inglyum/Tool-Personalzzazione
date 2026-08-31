
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

/* ── Il margine, e la fine del ×3,5 ─────────────────────────────────────────
   Storia in tre atti, perché il numero che cambia oggi si capisca.

   Prima c'erano tre campi moltiplicatore (×3,5 / ×2,8 / ×2,2) che facevano il
   prezzo, e uno slider «margine minimo» che non faceva niente: chi chiedeva il
   40% otteneva il 71,4%.

   Poi il moltiplicatore è stato convertito nel margine equivalente — 71,43% —
   perché nessun prezzo si muovesse mentre si sistemava la matematica. Era la
   scelta giusta allora ed è diventata il difetto adesso: un costo di € 12,78
   usciva a € 44,73, e nessuno sapeva perché.

   Adesso il predefinito è la strategia **Standard, 40% di margine**. Il ×3,5
   resta raggiungibile come strategia «Storico», dichiarata per quello che è —
   un ricarico ereditato, non una decisione commerciale. Questo cambia i prezzi
   dei preventivi **nuovi**: quelli salvati sono congelati e non si muovono. */
/* ── Il lavoro umano, per fasi ────────────────────────────────────────────
   Una stampa di dieci ore può richiedere quindici minuti di persona o due
   ore, e il conto è diverso. Finora c'era un campo solo — «manodopera» —
   che costringeva a sommare a mente prima di scriverlo, e sommare a mente è
   il modo in cui una fase si dimentica.

   Le sette fasi non aggiungono precisione al totale: aggiungono la
   possibilità di accorgersi che il controllo qualità non era stato contato. */
var FASI=[
  { id:'prep',    lab:'Preparazione file', icona:'💻', pre:0 },
  { id:'setup',   lab:'Avviamento',        icona:'⚙️', pre:15, job:true },
  { id:'rimoz',   lab:'Rimozione stampa',  icona:'🔧', pre:5 },
  { id:'post',    lab:'Post-processo',     icona:'🪣', pre:0 },
  { id:'qc',      lab:'Controllo qualità', icona:'🔎', pre:0 },
  { id:'pack',    lab:'Confezionamento',   icona:'📦', pre:0 },
  { id:'altro',   lab:'Altro',             icona:'✳️', pre:0 },
];
var LAVORO={};
FASI.forEach(function(f){ LAVORO[f.id]=f.pre; });

/* Ferramenta e materiali di confezionamento: righe con quantità e costo
   unitario, perché «2 × € 0,15» si controlla e un totale no. */
var HARDWARE=[];
var IMBALLO=[];

/* Il prezzo che l'utente vuole praticare, quando ne ha già uno in testa.
   Il preventivatore smette di proporre e comincia a rispondere: con questo
   prezzo, quanto guadagno davvero? */
var PREZZO_MANUALE=0;
/* Sotto questo margine il lavoro non si accetta. È una politica, non un
   calcolo: si dichiara una volta e vale per tutti i preventivi. */
var MARGINE_MINIMO_3D=25;

var STRATEGIA='standard';
var MARG=40;
var MODO='completo';
var MAT_REG=null;   // il costo del materiale a registro, se il magazzino lo sa
var _registroLetto=false;
/* I materiali che il magazzino conosce. Tenuti separati da MATS — la lista
   locale del preventivatore — perché la differenza fra i due è esattamente
   l'informazione che mancava: quali filamenti sono tracciati e quali sono solo
   scritti qui dentro. */
var MATS_INV=[];
/* I dati che arrivano dallo slicer, tenuti separati da quelli digitati: è la
   distinzione che permette di non contarli due volte. */
var SLICER={ pesoTotale:0, pesoModello:0, supporti:0, purge:0, ore:0, kwh:0, costo:0, includeTutto:true };
var ENE='auto';   // auto · misurato · medio · targa
var R=null;
var CALIB_RIF=0;
var SK='p3dq_v4';

/* ── Il progetto ───────────────────────────────────────────────────────────
   Nome, descrizione e tecnologia stavano sparsi: il nome in un campo dentro
   «dettagli stampa», la tecnologia in due pulsanti, la descrizione da nessuna
   parte. Un preventivo che arriva al cliente senza dire che cosa sta
   preventivando è un numero senza oggetto. */
var PROGETTO={ nome:'', descrizione:'' };

/* ── Le due modalità di compilazione ───────────────────────────────────────
   `rapida` mostra i cinque campi che bastano a un numero onesto: materiale,
   peso, tempo, macchina, prezzo al chilo. `professionale` apre tutto il
   resto. Non sono due preventivatori: sono lo stesso, con meno campi a
   schermo. Il calcolo è identico — quel che non si vede usa il proprio
   valore, e il dettaglio dei costi lo dichiara comunque. */
var MODALITA='professionale';

/* ── Le spese generali ─────────────────────────────────────────────────────
   Tre modi di ripartirle, e uno solo per volta: affitto e commercialista si
   contano una volta, non tre. `nessuna` è un valore legittimo — chi non le
   ha ripartite lo dichiara invece di lasciarle sottintese a zero. */
var OVERHEAD={ modo:'nessuna', valore:0 };

/* La politica di costo del materiale: FIFO, media, ultimo acquisto o prezzo
   scritto a mano. Il calcolo lo fa il resolver del magazzino; qui si sceglie
   a quale domanda si sta rispondendo. */
var POLITICA_MAT='media';

/* ── Gli scaglioni di quantità ─────────────────────────────────────────────
   Nove, fino a mille, come nel benchmark. Sei righe non bastano a rispondere
   alla domanda vera del laboratorio — «da quanti pezzi in poi conviene?» —
   perché il punto in cui la curva si appiattisce cade quasi sempre fra 100 e
   500, cioè fuori dalla tabella corta. */
var SCAGLIONI=[1,5,10,25,50,100,250,500,1000];

/* ── Più materiali sullo stesso pezzo ──────────────────────────────────────
   Un pezzo bicolore non costa il peso totale al prezzo del PLA più caro né a
   quello del più economico: costa la somma dei suoi materiali, ognuno al suo
   prezzo. Finché la lista è vuota comanda il campo singolo — che è il caso
   normale, e non deve diventare più complicato per fare posto a quello raro. */
var MULTIMAT=[];

/* ── Più piatti nello stesso progetto ──────────────────────────────────────
   Un 3MF di Bambu o Orca può contenerne diversi, e ognuno è una stampa a sé:
   un avviamento, un tempo macchina, un peso. Sommarli in un numero solo
   nasconde quanti avviamenti servono davvero — che è la voce che fa la
   differenza fra un pezzo e cento. */
var PIATTI=[];

/* ── La macchina: quella del progetto o quella di INGLY ────────────────────
   Un 3MF dichiara la stampante per cui è stato affettato. Usare in silenzio
   quella scelta a schermo darebbe un numero plausibile e sbagliato — un
   progetto affettato per una A1 mini preventivato con i costi di una X1C — e
   niente lo direbbe. Quindi: due modalità dichiarate, e la macchina importata
   sempre mostrata accanto a quella in uso.

   `progetto` non vuol dire «usa i costi del file»: il file dichiara un
   modello, non un prezzo d'acquisto né una vita utile. Vuol dire «cerca
   quella macchina fra le tue e usala»; se non c'è, lo si dice invece di
   ripiegare in silenzio. */
var MACCHINA_MODO='ingly';    // 'progetto' · 'ingly'
var MACCHINA_IMPORTATA=null;  // il modello dichiarato dal file, se c'è

/* ── Il consuntivo ─────────────────────────────────────────────────────────
   Quel che il lavoro è costato davvero, inserito a lavoro finito. Sta in una
   chiave sua e **non tocca mai lo snapshot**: il preventivo consegnato al
   cliente non cambia perché il consuntivo dice un'altra cosa — è tutto il
   motivo per cui lo snapshot è congelato.

   La chiave è l'id della riga, che è già unico e già salvato con essa. */
var CONSUNTIVO_K='p3d_consuntivo_v1';
function consuntivi(){
  try{ return JSON.parse(localStorage.getItem(CONSUNTIVO_K)||'{}')||{}; }catch(e){ return {}; }
}
function salvaConsuntivo(id,dati){
  var tutti=consuntivi();
  tutti[String(id)]=Object.assign({}, tutti[String(id)], dati, { quando:new Date().toISOString() });
  try{ localStorage.setItem(CONSUNTIVO_K, JSON.stringify(tutti)); }catch(e){}
}

function persist(){try{localStorage.setItem(SK,JSON.stringify({mats:MATS,saved:SAVED}));}catch(e){}}
function hydrate(){
  try{
    var d=JSON.parse(localStorage.getItem(SK)||'{}');
    MATS=(d.mats&&d.mats.length)?d.mats:JSON.parse(JSON.stringify(DEF_MATS));
    SAVED=d.saved||[];
  }catch(e){MATS=JSON.parse(JSON.stringify(DEF_MATS));SAVED=[];}
}

/* ── La lista dei materiali, una sola ─────────────────────────────────────
   Il magazzino davanti, perché è l'unico che sa quanto è stato pagato. La
   lista locale resta dietro, ma non come fonte alternativa: come elenco di
   ciò che **non è ancora** a magazzino. Un materiale che compare in entrambe
   con lo stesso nome viene mostrato una volta sola, e vince quello tracciato.

   Non si cancella niente: chi ha compilato quella lista ha fatto un lavoro
   vero, e perderlo per «pulizia» sarebbe peggio del difetto. */
function materialiVisibili(){
  var nomiInv={};
  MATS_INV.forEach(function(m){ nomiInv[String(m.n).toLowerCase().trim()]=true; });
  var locali=MATS.filter(function(m){
    return !nomiInv[String(m.n).toLowerCase().trim()];
  }).map(function(m){
    return Object.assign({}, m, { fonte:'locale', confidence:'declared' });
  });
  return MATS_INV.concat(locali);
}

/** Trova un materiale nella lista unica, per id. */
function materialeDi(id){
  var tutti=materialiVisibili();
  for(var i=0;i<tutti.length;i++) if(tutti[i].id===id) return tutti[i];
  return null;
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
  var visibili=materialiVisibili();
  var segno={registro:'✅', anagrafica:'📦', locale:'✎'};
  var matOpts=visibili.filter(function(m){return m.t===T;}).map(function(m){
    return '<option value="'+m.id+'">'+(segno[m.fonte]||'')+' '+m.n
      +' (€'+m.p+'/'+(m.t==='resin'?'L':'kg')+')'
      +(m.fonte==='locale'?' — non a magazzino':'')+'</option>';
  }).join('');
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
    /* Gli stessi totali del PDF e del messaggio WhatsApp: una funzione sola. */
    var TOT=totali();
    var listino=TOT.listino, discAmt=TOT.sconto, vatAmt=TOT.iva, gross=TOT.lordo;
    var mg=TOT.margine, forzate=TOT.forzate;
    linesHtml='<table><thead><tr>'
      +'<th>Descrizione</th><th style="text-align:center">Qtà</th><th style="text-align:right">Costo/pz</th><th style="text-align:right">Prezzo/pz</th><th style="text-align:right">Subtot.</th><th></th>'
      +'</tr></thead><tbody>'+rows+'</tbody></table>'
      +'<div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">'
      /* Il costo delle righe non è quello della configurazione aperta: lo si
         dichiara, e la divergenza la riempie `calc()` — che è l'unico a
         sapere quanto costa adesso quello che si sta configurando. Metterla
         qui dentro avrebbe voluto dire ridisegnare tutta la tabella a ogni
         tasto premuto per aggiornare una riga di avviso. */
      +'<div class="p3-sr"><span style="color:var(--text-muted)">Costo delle voci a preventivo'
        +'<div style="font-size:9px;color:var(--text-dim);line-height:1.35">come erano quando le hai aggiunte</div></span>'
        +'<span style="font-weight:700;color:#fff">'+eur(totC)+'</span></div>'
      +'<div id="p3d-divergenza"></div>'
      +(discAmt>0.005?'<div class="p3-sr"><span style="color:var(--text-muted)">Listino</span><span style="font-weight:700;color:#fff">'+eur(listino)+'</span></div>'
        +'<div class="p3-sr"><span style="color:var(--text-muted)">Sconto ('+DISC+'%) già applicato</span><span style="font-weight:700;color:var(--red)">-'+eur(discAmt)+'</span></div>':'')
      +'<div class="p3-sr"><span style="color:var(--text-muted)">Subtotale netto</span><span style="font-weight:700;color:#fff">'+eur(totN)+'</span></div>'
      +(forzate?'<div class="p3-sr"><span style="color:var(--orange)">✏️ Prezzi forzati a mano</span><span style="font-weight:700;color:var(--orange)">'+forzate+'</span></div>':'')
      +'<div class="p3-sr"><span style="color:var(--text-muted)">Margine medio</span><span style="font-weight:700;color:'+(mg>=30?'var(--green)':'var(--red)')+'">'+mg.toFixed(1)+'%</span></div>'
      +(IVA_ON?'<div class="p3-sr"><span style="color:var(--text-muted)">'+(TOT.etichettaIva||'IVA')+'</span><span style="font-weight:700;color:#fff">'+eur(vatAmt)+'</span></div>':'')
      +'<div class="p3-tbox">'
        +'<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">'+(IVA_ON?('TOTALE '+(TOT.etichettaIva||'IVA').toUpperCase()+' INCLUSA'):'TOTALE SENZA IVA')+'</div>'
        +'<div style="font-size:28px;font-weight:900;color:#22d3ee;line-height:1">'+eur(gross)+'</div>'
        +'<div style="font-size:11px;color:var(--text-muted);margin-top:5px">'+(discAmt>0.005?'Sconto '+DISC+'% applicato · ':'')+(IVA_ON?((TOT.etichettaIva||'IVA')+' inclusa'):'Prezzi netti')+'</div>'
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
    // ── A · che cosa si sta preventivando ───────────────────────────
    +cardProgetto()
    +barraModalita()
    // ── Importa dallo slicer ────────────────────────────────────────
    +cardSlicer()
    +cardMacchina()
    +cardPiatti()
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
        +'<div class="p3-fg"><label class="p3-fl">🧱 SUPPORTI (g)</label><input class="p3-fc" id="p3d-sup" type="number" step="1" value="0" oninput="Print3DQuoter.calc()"><div class="p3-ht">Finiscono nel cestino, si pagano al chilo</div></div>'
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
        +'<div class="p3-fg"><label class="p3-fl" id="p3d-gl">'+(isFdm?'🧵 MATERIALE (g)':'🧴 RESINA (ml)')+'</label><input class="p3-fc acc" id="p3d-g" type="number" step="1" value="20" oninput="Print3DQuoter.calc()"><div class="p3-ht" id="p3d-g-fonte">Da slicer (Bambu/Prusa)</div></div>'
        /* Ore e minuti separati, perché è così che li dice lo slicer: «9h 57m».
           Chi deve convertire a mente scrive 10, e dieci ore non sono 9,95 —
           su una macchina da € 0,08/h la differenza è piccola, sull'energia e
           sull'ammortamento di cento pezzi no. Il campo decimale resta, e i
           due si tengono allineati. */
        +'<div class="p3-fg"><label class="p3-fl">⏱️ TEMPO STAMPA</label>'
          +'<div style="display:flex;gap:4px;align-items:center">'
            +'<input class="p3-fc acc" id="p3d-hh" type="number" step="1" min="0" value="1" oninput="Print3DQuoter.setTempo()" style="text-align:right">'
            +'<span style="font-size:11px;color:var(--text-muted)">h</span>'
            +'<input class="p3-fc acc" id="p3d-mm" type="number" step="1" min="0" max="59" value="30" oninput="Print3DQuoter.setTempo()" style="text-align:right">'
            +'<span style="font-size:11px;color:var(--text-muted)">m</span>'
          +'</div>'
          +'<input type="hidden" id="p3d-h" value="1.5">'
          +'<div class="p3-ht" id="p3d-h-dec">= 1,50 h</div></div>'
        +'<div class="p3-fg"><label class="p3-fl">📉 SPRECO MATERIALE %</label><input class="p3-fc" id="p3d-waste" type="number" step="1" min="0" value="0" oninput="Print3DQuoter.calc()"><div class="p3-ht">Spurgo, brim, prime righe — non è lo scarto</div></div>'
      +'</div>'
      +'<div style="background:var(--bg-card2);border-radius:var(--radius-sm);padding:10px;margin-top:8px;border:1px solid var(--border)">'
        +'<div style="font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">✨ LAVORAZIONI EXTRA</div>'
        +'<div id="p3d-ext">'+extHtml+'</div>'
        +'<button class="btn btn-secondary btn-sm" style="width:100%;margin-top:6px;border-style:dashed;color:#22d3ee;border-color:#22d3ee40" onclick="Print3DQuoter.addExtra()">+ Aggiungi lavorazione</button>'
      +'</div>'
      +'<div class="p3-fg" style="margin-top:10px"><label class="p3-fl">📦 QTÀ ORDINE</label><input class="p3-fc" id="p3d-qty" type="number" value="1" min="1" oninput="Print3DQuoter.calc()"></div>'
      +'<button class="btn btn-primary" style="width:100%;padding:12px;font-size:14px;letter-spacing:.3px;background:#22d3ee;color:#000;margin-top:4px" onclick="Print3DQuoter.addLine()"><i class="fas fa-plus-circle"></i> AGGIUNGI AL PREVENTIVO</button>'
    +'</div>'
    /* Le voci avanzate: in modalità rapida non si vedono, ma i loro valori
       continuano a contare — il costo non è una stima ridotta. */
    +((MODALITA==='professionale') ? ''
      // ── Il lavoro umano, per fasi ─────────────────────────────────
      +cardLavoro()
      // ── Componenti e confezione ───────────────────────────────────
      +cardRighe('🔩 COMPONENTI', HARDWARE, 'Hw', 'magnete, vite, inserto, LED…')
      +cardRighe('📦 CONFEZIONE', IMBALLO, 'Pk', 'scatola, busta, etichetta, protezione…')
      +cardMultiMateriale()
      +cardOverhead()
      +cardPoliticaMateriale()
      : '')
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
    +'<div class="p3-card cyan">'
      +'<div class="p3-ct c" style="display:flex;align-items:center;justify-content:space-between;gap:8px">'
        +'<span id="p3d-hero-t">📊 IL CONTO</span>'
        +'<button onclick="Print3DQuoter.togglePerche()" style="padding:4px 10px;border-radius:7px;cursor:pointer;font-size:10px;font-weight:700;text-transform:none;letter-spacing:0;'
          +'border:1px solid '+(PERCHE_APERTO?'#22d3ee':'var(--border2)')+';background:'+(PERCHE_APERTO?'#22d3ee18':'transparent')+';color:'+(PERCHE_APERTO?'#22d3ee':'var(--text-muted)')+'">'
          +(PERCHE_APERTO?'▲ Chiudi':'🔍 Perché questo prezzo?')+'</button>'
      +'</div>'
      +'<div id="p3d-hero"><div style="color:var(--text-dim);text-align:center;padding:20px;font-size:12px">Inserisci grammi e ore per vedere il calcolo</div></div>'
      +'<div id="p3d-avvisi"></div>'
      +(PERCHE_APERTO?'<div id="p3d-perche">'+pannelloPerche()+'</div>':'')
    +'</div>'
    // ── C · dove vanno i soldi ────────────────────────────────────────
    +'<div class="p3-card"><div class="p3-ct">🔢 DETTAGLIO COSTI — live</div><div id="p3d-bk"><div style="color:var(--text-dim);text-align:center;padding:20px;font-size:12px">Inserisci grammi e ore per vedere il calcolo</div></div></div>'
    // ── Costo per grammo, ora macchina, minuto uomo ──────────────────
    +'<div id="p3d-costoper"></div>'
    // ── E · le quantità: l'avviamento si divide, il pezzo no ──────────
    +'<div class="p3-card"><div class="p3-ct">📦 QUANTITÀ — quanto conviene stampare</div><div id="p3d-scaglioni"><div style="color:var(--text-dim);text-align:center;padding:16px;font-size:11px">Inserisci i dati per vedere gli scaglioni</div></div></div>'
    // ── Le posizioni di prezzo, una card per politica ────────────────
    +'<div class="p3-card"><div class="p3-ct">💶 POSIZIONI DI PREZZO</div><div id="p3d-politiche"><div class="p3-ht">Inserisci i dati per vedere le posizioni.</div></div></div>'
    // ── Preventivato contro reale ────────────────────────────────────
    +cardConsuntivo()
    // ── La distinta base ─────────────────────────────────────────────
    +((MODALITA==='professionale') ? cardBom() : '')
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
      /* ── Le strategie ─────────────────────────────────────────────────
         Quattro posizioni commerciali con un nome, più quella storica
         dichiarata per quello che è. Prima il prezzo veniva da un
         moltiplicatore senza nome: si vedeva il risultato e non la
         decisione. */
      +'<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">'
        +'<label class="p3-fl">🎯 STRATEGIA DI PREZZO</label>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(78px,1fr));gap:5px;margin-bottom:9px">'
        +strategie3D().map(function(st){
          var on=STRATEGIA===st.id;
          var col=st.storica?'var(--text-dim)':(on?'#22d3ee':'var(--text-dim)');
          return '<button onclick="Print3DQuoter.setStrategia(\''+st.id+'\')" style="padding:7px 4px;border-radius:8px;cursor:pointer;text-align:center;'
            +'border:1.5px solid '+(on?'#22d3ee':'var(--border2)')+';background:'+(on?'#22d3ee18':'transparent')+';color:'+col+'">'
            +'<span style="font-size:10px;font-weight:800;display:block;line-height:1.2">'+st.label+'</span>'
            +'<span style="font-size:9px;opacity:.75">'+Math.round(st.marginTarget)+'%</span>'
            +'</button>';
        }).join('')
        +'</div>'
        +(STRATEGIA==='storico'
          ? '<div style="font-size:10px;padding:7px 9px;border-radius:8px;margin-bottom:8px;background:var(--bg-card2);'
            +'border-left:3px solid var(--orange);color:var(--text-muted);line-height:1.5">'
            +'⚠️ È il vecchio moltiplicatore ×3,5 ereditato dalle prime versioni: un ricarico, non una decisione commerciale. '
            +'Le altre quattro sono margini scelti.</div>'
          : '')
        +(STRATEGIA==='libero'
          ? '<div class="p3-ht" style="margin-bottom:8px">Margine impostato a mano: nessuna strategia attiva.</div>' : '')
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
    // ── Prezzo manuale e verdetto ────────────────────────────────────
    +cardPrezzoManuale()
    // IVA + Sconto
    +'<div class="p3-card">'
      +'<div class="p3-ct">🧾 IVA &amp; SCONTO</div>'
      +'<div class="p3-fg"><label class="p3-fl">IVA</label>'
        +'<div class="p3-iva-btns">'
          +'<button id="p3d-iva-yes" class="p3-iva-btn" onclick="Print3DQuoter.setIva(true)" style="background:var(--primary);color:#fff;flex:1">+'+((typeof window!=='undefined'&&window.InglyFisco)?window.InglyFisco.etichetta():'IVA 22%')+'</button>'
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
  /* Le due caselle e il decimale nascosto devono restare d'accordo dopo ogni
     ridisegno: sono la stessa grandezza scritta in due modi. */
  (function(){ var h=el('p3d-h'); if(h) tempoDaDecimale(parseFloat(h.value)||0); }());
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
/* ── Leggere un file di slicer ─────────────────────────────────────────────
   Il parser è `InglySlicerImport`, e sta fuori di qui perché è puro e
   collaudabile senza una pagina. Questa funzione fa solo tre cose: gli passa
   il file, riversa il risultato nella card slicer, e **dichiara** che cosa ha
   letto e da dove — un import muto è il modo in cui un peso sbagliato entra
   in un preventivo senza che nessuno possa risalire a come. */
var SLICER_FILE=null;
function leggiFile(inp){
  var f=inp&&inp.files&&inp.files[0]; if(!f) return;
  var S=(typeof window!=='undefined') && window.InglySlicerImport;
  var box=el('p3d-file-esito');
  var avviso=function(colore,testo){
    if(box) box.innerHTML='<div style="padding:8px 10px;border-radius:8px;background:var(--bg-card2);border-left:3px solid '
      +colore+';font-size:10px;color:var(--text-muted);line-height:1.6">'+testo+'</div>';
  };
  if(!S){ avviso('var(--orange)','Il lettore di file slicer non è caricato.'); return; }
  avviso('var(--text-dim)','⏳ Lettura di '+esc3(f.name)+'…');

  S.analizza(f).then(function(r){
    inp.value='';
    if(!r||!r.ok){ avviso('var(--orange)','⚠️ '+esc3((r&&r.motivo)||'file non leggibile')); return; }
    SLICER_FILE=r;
    SLICER.pesoTotale=r.grammiTotali;
    SLICER.pesoModello=r.grammiModello;
    SLICER.supporti=r.supporti;
    SLICER.purge=r.purge;
    SLICER.ore=r.ore;
    SLICER.costo=r.costo;
    SLICER.includeTutto=r.comprendeTutto!==false;
    if(r.materiali&&r.materiali.length) MULTIMAT=r.dettaglioMateriali||[];
    PIATTI=(r.piatti||[]).slice();
    MACCHINA_IMPORTATA = r.stampante || null;
    /* Importare non sostituisce: la modalità resta quella scelta, e la card
       mostra le due macchine una accanto all'altra. */
    if(!PROGETTO.nome) PROGETTO.nome=String(f.name).replace(/\.[^.]+$/,'');
    render();
    var g=(r.grafie||{});
    avviso('var(--green,#22c55e)','✅ <b>'+esc3(f.name)+'</b> — '+(r.formato==='3mf'?'3MF':'G-code')+'<br>'
      +Math.round(r.grammiTotali)+' g · '+tempoDaDecimale(r.ore)
      +(r.materiali&&r.materiali.length?' · '+esc3(r.materiali.join(', ')):'')
      +'<br><span style="color:var(--text-dim)">peso da '+esc3(g.peso||'—')+', tempo da '+esc3(g.tempo||'—')+'</span>'
      +(r.nota?'<br><span style="color:#22d3ee">'+esc3(r.nota)+'</span>':''));
  }).catch(function(e){
    inp.value='';
    avviso('var(--orange)','⚠️ Lettura non riuscita: '+esc3(e&&e.message||'errore'));
  });
}

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
    /* Il file si legge qui dentro. Non c'è una `fetch` e non c'è un servizio:
       un G-code contiene la geometria di un pezzo che spesso è il lavoro di
       un cliente, e non deve lasciare questo computer. */
    +'<button class="btn btn-secondary btn-sm" style="width:100%;margin-bottom:8px;border-style:dashed;color:#22d3ee;border-color:#22d3ee40" '
      +'onclick="document.getElementById(\'p3d-file\').click()">📂 Apri file .gcode o .3mf</button>'
    +'<input type="file" id="p3d-file" accept=".gcode,.gco,.g,.bgcode,.3mf" style="display:none" onchange="Print3DQuoter.leggiFile(this)">'
    +'<div id="p3d-file-esito" style="margin-bottom:8px"></div>'
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
    +(attivo && p.sospetto
      ? '<div style="margin-top:9px;padding:9px 11px;border-radius:8px;background:var(--bg-card2);border-left:3px solid var(--orange);font-size:10px;color:var(--text-muted);line-height:1.6">'
        +'<b style="color:var(--orange)">Il modello pesa '+Math.round(p.modello)+' g su '+Math.round(SLICER.pesoTotale)+' g totali.</b><br>'
        +'La sottrazione è giusta, ma un modello che pesa meno di un quinto del totale quasi sempre vuol dire che nel campo «supporti» c\'è il peso del pezzo. Controlla prima di preventivare.'
      +'</div>' : '')
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
        +' → <b>'+eur(e.kwh*e.prezzoKwh)+'</b><br><span style="color:var(--text-muted)">'+e.nota+'</span>'
        /* Le due metà, dette separate. Il costo dell'energia è `kWh × €/kWh`,
           e la sua fiducia è la peggiore delle due: chi misura il consumo con
           una presa intelligente e poi scrive il prezzo a mano vedeva il
           preventivo restare «dichiarato» senza capire perché. Adesso lo
           legge, e sa quale delle due metà conviene migliorare. */
        +(function(){
          var pr=(r&&r._costo&&r._costo.provenienza||[]).filter(function(x){return x.id==='energia';})[0];
          if(!pr||!pr.confidenzaConsumo) return '';
          var lab={measured:'misurato',verified:'verificato',declared:'dichiarato',estimated:'stimato',missing:'assente'};
          return '<div style="margin-top:3px;color:var(--text-dim)">consumo <b>'+(lab[pr.confidenzaConsumo]||pr.confidenzaConsumo)
            +'</b> · prezzo <b>'+(lab[pr.confidenzaPrezzo]||pr.confidenzaPrezzo)+'</b>'
            +' → la voce vale <b>'+(lab[pr.confidence]||pr.confidence)+'</b>, la peggiore delle due</div>';
        })()
        +'</div>'
      : '<div class="p3-ht">Inserisci le ore per vedere quale dato viene usato.</div>')
  +'</div>';
}

/* ── I totali, in un posto solo ────────────────────────────────────────────
   Erano calcolati tre volte: nella tabella, nel PDF e nel messaggio
   WhatsApp. Le tre copie coincidevano perché ripetevano le stesse due
   operazioni nello stesso ordine — una coincidenza mantenuta a mano, non una
   garanzia. La prima volta che una delle tre avesse smesso di somigliare
   alle altre, il cliente avrebbe ricevuto un PDF con un totale diverso da
   quello che l'utente aveva visto e approvato. */
/** L'aliquota configurata, con il 22% come ripiego storico. */
function aliquotaIva(){
  var F=(typeof window!=='undefined') && window.InglyFisco;
  return F?F.aliquota():22;
}

function totali(){
  var costo=0, netto=0, listino=0, forzate=0;
  LINES.forEach(function(l){
    costo   += l.cpz*l.qty;
    netto   += l.ppz*l.qty;
    listino += (l.ppzListino||l.ppz)*l.qty;
    if(l.manuale) forzate++;
  });
  var sconto=listino-netto;
  /* L'aliquota è quella configurata in Impostazioni, non un 22 scritto qui.
     Il predefinito resta 22, quindi nessun preventivo esistente si muove. */
  var F=(typeof window!=='undefined') && window.InglyFisco;
  var pct=F?F.aliquota():22;
  var iva=IVA_ON?(F?F.su(netto):netto*0.22):0;
  return {
    costo:costo, listino:listino, sconto:sconto, netto:netto, iva:iva,
    lordo:netto+iva,
    margine: netto>0 ? ((netto-costo)/netto*100) : 0,
    forzate:forzate, righe:LINES.length,
    aliquota:pct, etichettaIva: F?F.etichetta():'IVA 22%',
    /* Le righe portano il costo **come era quando sono state aggiunte**: è la
       regola dello storico economico, e serve perché un preventivo consegnato
       non cambi sotto i piedi. Ma se nel frattempo la configurazione è
       cambiata, i due numeri a schermo divergono e finora niente lo diceva —
       è la seconda causa dell'incoerenza segnalata. */
    congelato:true,
    costoCorrente: COST,
  };
}

/* ── «Perché questo prezzo?» ───────────────────────────────────────────────
   Un preventivo deve reggere due domande, e sono due persone diverse a
   farle. Il cliente chiede «perché costa così»; chi porta i libri chiede
   «da dove viene questo numero». Un totale grande e nient'altro non risponde
   a nessuna delle due, e chi lo mostra finisce per trattare sul prezzo
   invece che sul lavoro.

   Qui ogni voce dichiara quattro cose: quanto vale, con quale formula, con
   quale dato, e quanto ci si può contare. La quarta è quella che mancava. */
var PERCHE_APERTO=false;
function togglePerche(){ PERCHE_APERTO=!PERCHE_APERTO; render(); }

var CONF_ETICHETTA={
  measured:  { lab:'misurato',  col:'var(--green,#22c55e)', spiega:'letto da uno strumento' },
  verified:  { lab:'verificato',col:'var(--green,#22c55e)', spiega:'da una fonte identificabile' },
  declared:  { lab:'dichiarato',col:'var(--text-muted)',    spiega:'inserito da te' },
  estimated: { lab:'stimato',   col:'var(--orange)',        spiega:'dedotto, non verificato' },
  missing:   { lab:'mancante',  col:'var(--red)',           spiega:'non c\'è: il costo esce più basso del vero' },
};

function pannelloPerche(){
  var MOT=(typeof window!=='undefined') && window.InglyCostEngine;
  if(!MOT || typeof MOT.explain!=='function') return '';
  var x;
  try{ x=MOT.explain(ingresso(), {marginePct:MARG, ivaPct:IVA_ON?aliquotaIva():0, scontoPct:DISC}); }
  catch(e){ return ''; }
  if(!x || x.vuoto) return '';

  /* Le voci che compongono il costo del pezzo, e **solo** quelle. `explain`
     elenca anche l'avviamento intero accanto alla sua quota per pezzo: sono
     lo stesso denaro detto due volte, e sommarle entrambe farebbe un totale
     che non torna con quello mostrato. Si tiene la quota — è quella che il
     pezzo paga — e la si etichetta perché si capisca da dove viene. */
  var COMPONENTI={ 'per pezzo':true, 'una tantum':true };
  var righe=(x.lines||[]).filter(function(r){
    if(r.id==='setup') return false;               // c'è già come quota per pezzo
    if(!COMPONENTI[r.gruppo]) return false;        // prezzo, IVA e profitto non sono costi
    return (r.value!=null?r.value:r.result||0)>0.0001;
  }).map(function(r){
    if(r.id!=='unaTantumPerPezzo') return r;
    var q=Math.max(1,gv('p3d-qty',1));
    return { id:r.id, label:'Avviamento ripartito', gruppo:r.gruppo,
             value:r.result, result:r.result,
             formula:'minuti ÷ 60 × tariffa oraria ÷ quantità',
             detail: q>1 ? ('diviso su '+q+' pezzi') : 'un solo pezzo: lo paga tutto',
             confidence:'declared' };
  });
  var conf=function(id){ var c=CONF_ETICHETTA[id]||CONF_ETICHETTA.declared; return c; };

  /* Il conto con i numeri dentro, non la formula simbolica. «grammi ÷ 1000 ×
     €/kg» dice come si calcola; «290 g × € 15,99/kg = € 4,64» dice da dove
     viene **questo** numero — ed è l'unica versione che l'utente può rifare a
     mente per accorgersi di aver sbagliato un campo. La formula resta sotto,
     più piccola, per chi vuole la regola. */
  var riga=function(r){
    var c=conf(r.confidence);
    return '<tr style="border-bottom:1px solid var(--border)">'
      +'<td style="padding:7px 8px;font-size:11px;color:var(--text)">'+r.label+'</td>'
      +'<td style="padding:7px 8px;text-align:right;font-size:12px;font-weight:800;white-space:nowrap">'+eur(r.value||r.result||0)+'</td>'
      +'<td style="padding:7px 8px;font-size:10px;font-family:ui-monospace,monospace">'
        +(r.conti
          ? '<span style="color:var(--text)">'+esc3(r.conti)+'</span>'
            +'<div style="font-size:9px;color:var(--text-dim);margin-top:2px">'+esc3(r.formula||'')+'</div>'
          : '<span style="color:var(--text-muted)">'+esc3(r.formula||'—')+'</span>')
      +'</td>'
      +'<td style="padding:7px 8px;font-size:10px;color:var(--text-dim)">'+esc3(r.detail||r.input||'—')+'</td>'
      +'<td style="padding:7px 8px;font-size:9px;white-space:nowrap"><span style="color:'+c.col+';font-weight:700">'+c.lab+'</span></td>'
      +'</tr>';
  };

  var avvisi=(x.warnings||[]).filter(function(a){ return a && a.livello!=='INFO'; });

  return '<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">'
    +'<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:520px">'
      +'<thead><tr style="border-bottom:1px solid var(--border2)">'
      +['Voce','Costo','Il conto','Dato usato','Fiducia'].map(function(h,i){
        return '<th style="padding:6px 8px;font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-dim);text-align:'+(i===1?'right':'left')+'">'+h+'</th>';
      }).join('')+'</tr></thead><tbody>'+righe.map(riga).join('')+'</tbody></table></div>'

    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">'
      +(x.recommendedPrices||[]).map(function(pz){
        return '<div style="flex:1;min-width:120px;padding:9px 11px;border-radius:10px;background:var(--bg-card2);border:1px solid '+(pz.id==='consigliato'?'#22d3ee':'var(--border)')+'">'
          +'<div style="font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:'+(pz.id==='consigliato'?'#22d3ee':'var(--text-dim)')+';font-weight:700">'+pz.label+'</div>'
          +'<div style="font-size:17px;font-weight:900;color:var(--text);line-height:1.2">'+eur(pz.netto)+'</div>'
          +'<div style="font-size:9px;color:var(--text-muted)">margine '+pz.marginePct.toFixed(0)+'% · profitto '+eur(pz.profitto)+'</div>'
          +'<div style="font-size:9px;color:var(--text-dim);line-height:1.35;margin-top:3px">'+pz.nota+'</div>'
        +'</div>';
      }).join('')
    +'</div>'

    +(x.assunzioni&&x.assunzioni.length
      ? '<div style="margin-top:10px;padding:9px 11px;background:var(--bg-card2);border-radius:9px;border-left:3px solid var(--text-dim)">'
        +'<div style="font-size:10px;font-weight:700;color:var(--text-muted);margin-bottom:4px">Su cosa regge questo numero</div>'
        +x.assunzioni.map(function(a){ return '<div style="font-size:10px;color:var(--text-dim);line-height:1.55">· '+a.testo+'</div>'; }).join('')
      +'</div>' : '')

    +(avvisi.length
      ? '<div style="margin-top:8px;display:flex;flex-direction:column;gap:4px">'
        +avvisi.map(function(a){
          var grave=a.livello==='CRITICAL';
          return '<div style="font-size:10px;padding:6px 9px;border-radius:8px;background:var(--bg-card2);border-left:3px solid '+(grave?'var(--red)':'var(--orange)')+';color:var(--text-muted)">'
            +(grave?'⛔ ':'⚠️ ')+a.messaggio+(a.azione?' <span style="color:var(--text-dim)">— '+a.azione+'</span>':'')+'</div>';
        }).join('')
      +'</div>' : '')

    +'<div style="margin-top:9px;font-size:10px;color:var(--text-dim);line-height:1.5">'
      +'Fiducia complessiva del preventivo: <b style="color:'+conf(x.confidence).col+'">'+conf(x.confidence).lab+'</b> — '
      +conf(x.confidence).spiega+'. È la <b>peggiore</b> delle voci, non la media: un preventivo non è più solido del suo dato più incerto.'
    +'</div>'
  +'</div>';
}

/* ── A · Il progetto ───────────────────────────────────────────────────────
   Che cosa si sta preventivando, detto in chiaro. Il nome finisce nella riga
   del preventivo, nel PDF e nel messaggio; la descrizione resta al preventivo
   e non entra in nessun calcolo. */
function cardProgetto(){
  return '<div class="p3-card">'
    +'<div class="p3-ct">📁 PROGETTO</div>'
    +'<div class="p3-fg"><label class="p3-fl">NOME</label>'
      +'<input class="p3-fc" id="p3d-prj" value="'+esc3(PROGETTO.nome)+'" placeholder="es. Supporto telefono personalizzato" oninput="Print3DQuoter.setProgetto(\'nome\',this.value)"></div>'
    +'<div class="p3-fg" style="margin-top:6px"><label class="p3-fl">DESCRIZIONE</label>'
      +'<textarea class="p3-fc" id="p3d-prj-d" rows="2" style="resize:vertical" placeholder="Materiale, finitura, tolleranze, quel che il cliente deve sapere" oninput="Print3DQuoter.setProgetto(\'descrizione\',this.value)">'+esc3(PROGETTO.descrizione)+'</textarea></div>'
    +'<div class="p3-ht" style="margin-top:6px">La tecnologia si sceglie qui sotto: cambia i valori predefiniti di potenza, materiale e post-processo.</div>'
  +'</div>';
}

/* ── Le due modalità ───────────────────────────────────────────────────────
   Un solo preventivatore. La modalità rapida nasconde i campi avanzati; non
   li azzera e non li ignora — il costo resta quello completo, e il dettaglio
   continua a mostrarlo voce per voce. Nasconderli **e** ignorarli sarebbe la
   scorciatoia che rende il numero rapido anche sbagliato. */
function barraModalita(){
  var b=function(id,lab,sotto){
    var on=MODALITA===id;
    return '<button class="p3-tb'+(on?' afdm':'')+'" style="flex:1;text-align:left;padding:8px 12px" onclick="Print3DQuoter.setModalita(\''+id+'\')">'
      +'<div style="font-weight:800;font-size:12px">'+lab+'</div>'
      +'<div style="font-size:9px;opacity:.7;font-weight:600">'+sotto+'</div></button>';
  };
  return '<div class="p3-card">'
    +'<div class="p3-ct">🎚️ MODALITÀ</div>'
    +'<div class="p3-type" style="gap:6px">'
      +b('rapida','⚡ Rapida','materiale, peso, tempo, macchina')
      +b('professionale','🔬 Professionale','tutte le voci di costo')
    +'</div>'
    +'<div class="p3-ht" style="margin-top:6px">'
      +(MODALITA==='rapida'
        ? 'I campi nascosti continuano a contare con i valori impostati: il costo non è una stima ridotta, è lo stesso costo con meno campi da compilare.'
        : 'Tutte le voci sono compilabili. Quelle che lasci a zero restano a zero e il dettaglio lo dichiara.')
    +'</div></div>';
}

/* ── Le spese generali ─────────────────────────────────────────────────────
   Il motore le accetta come €/ora presidiata o come percentuale del costo.
   «Per lavoro» è la terza, e si traduce in percentuale solo dopo aver
   calcolato il costo — quindi qui si dichiara e la traduzione la fa
   `ingresso()`, in un posto solo, dove è visibile che è una traduzione. */
var MODI_OVERHEAD=[
  { id:'nessuna', lab:'Nessuna',      unita:'',      aiuto:'Le spese generali non sono ripartite su questo lavoro. È una scelta, e il dettaglio la dichiara.' },
  { id:'lavoro',  lab:'Per lavoro',   unita:'€',     aiuto:'Un importo fisso per commessa, diviso per la quantità come l\'avviamento.' },
  { id:'ora',     lab:'Per ora macchina', unita:'€/h', aiuto:'Affitto, utenze e amministrazione divisi per le ore che la macchina lavora davvero in un anno.' },
  { id:'percento',lab:'Percentuale',  unita:'%',     aiuto:'Una quota del costo di produzione. Comoda, ma cresce con il costo anche quando le spese generali non crescono.' },
];
function cardOverhead(){
  var m=MODI_OVERHEAD.filter(function(x){return x.id===OVERHEAD.modo;})[0]||MODI_OVERHEAD[0];
  return '<div class="p3-card">'
    +'<div class="p3-ct">🏢 SPESE GENERALI</div>'
    +'<div class="p3-fg"><label class="p3-fl">COME SI RIPARTONO</label>'
      +'<select class="p3-fc" onchange="Print3DQuoter.setOverheadModo(this.value)">'
      +MODI_OVERHEAD.map(function(x){ return '<option value="'+x.id+'"'+(x.id===OVERHEAD.modo?' selected':'')+'>'+x.lab+'</option>'; }).join('')
      +'</select></div>'
    +(OVERHEAD.modo==='nessuna' ? ''
      : '<div class="p3-fg" style="margin-top:6px"><label class="p3-fl">VALORE ('+m.unita+')</label>'
        +'<input class="p3-fc" id="p3d-oh" type="number" step="0.5" min="0" value="'+OVERHEAD.valore+'" oninput="Print3DQuoter.setOverheadValore(this.value)"></div>')
    +'<div class="p3-ht" style="margin-top:6px">'+m.aiuto+'</div>'
    +'<div class="p3-ht" style="margin-top:4px;color:var(--text-dim)">Un modo solo per volta: affitto e commercialista si contano una volta, non tre.</div>'
  +'</div>';
}

/* ── La politica di costo del materiale ────────────────────────────────────
   Le quattro non sono opinioni sullo stesso numero: rispondono a domande
   diverse. La matematica è del resolver di magazzino — qui si sceglie, e si
   mostra da quali lotti è uscito il costo quando la politica è FIFO. */
function cardPoliticaMateriale(){
  var MC=(typeof window!=='undefined') && window.InglyMaterialCost;
  var pol=(MC&&MC.POLITICHE)||[{id:'media',label:'Costo medio',spiega:''}];
  var scelta=null;
  pol.forEach(function(p){ if(p.id===POLITICA_MAT) scelta=p; });
  return '<div class="p3-card">'
    +'<div class="p3-ct">🏷️ COSTO DEL MATERIALE</div>'
    +'<div class="p3-fg"><label class="p3-fl">POLITICA</label>'
      +'<select class="p3-fc" onchange="Print3DQuoter.setPoliticaMat(this.value)">'
      +pol.map(function(p){ return '<option value="'+p.id+'"'+(p.id===POLITICA_MAT?' selected':'')+'>'+p.label+'</option>'; }).join('')
      +'</select></div>'
    +'<div class="p3-ht" style="margin-top:6px">'+(scelta?scelta.spiega:'')+'</div>'
    +'<div id="p3d-lotti" style="margin-top:8px"></div>'
  +'</div>';
}

/** I lotti da cui il costo è uscito. Solo con FIFO ha senso mostrarli: le
    altre politiche non prelevano da lotti, danno un numero. */
function disegnaLotti(){
  var n=el('p3d-lotti'); if(!n) return;
  if(POLITICA_MAT!=='fifo' || !MAT_REG || !MAT_REG.disponibile){ n.innerHTML=''; return; }
  var t=MAT_REG.traccia;
  var righe=(t&&t.righe)||[];
  if(!righe.length){ n.innerHTML='<div class="p3-ht">Nessun lotto tracciato per questo materiale.</div>'; return; }
  n.innerHTML='<div style="font-size:10px;color:var(--text-muted);font-weight:700;text-transform:uppercase;margin-bottom:4px">Da quali lotti</div>'
    +righe.map(function(r){
      return '<div style="display:flex;justify-content:space-between;gap:8px;font-size:10px;color:var(--text-muted);padding:2px 0">'
        +'<span>'+esc3(r.quando?String(r.quando).slice(0,10):'—')+' · '+(+r.quantita||0)+' u</span>'
        +'<span style="color:var(--text)">'+eur(r.costoUnitario)+'/u</span></div>';
    }).join('')
    +(t.scoperta>0?'<div class="p3-ht" style="color:var(--orange);margin-top:4px">'+t.scoperta+' unità oltre i lotti registrati: il costo vale per la parte coperta.</div>':'');
}

/* ── La distinta base ──────────────────────────────────────────────────────
   Materiale, componenti e confezione in una lista sola, con quantità e costo
   di ognuno. Non è una quarta lista: è la lettura, in un posto, di quelle che
   già esistono. */
function cardBom(){
  return '<div class="p3-card">'
    +'<div class="p3-ct">📑 DISTINTA BASE</div>'
    +'<div id="p3d-bom"><div class="p3-ht">Inserisci i dati per vedere la distinta.</div></div>'
  +'</div>';
}

/* ── La distinta base ──────────────────────────────────────────────────────
   La distinta **legge il dettaglio dei costi**, non lo rifà. È la differenza
   fra una distinta e una seconda contabilità: se calcolasse i grammi per il
   prezzo al chilo per conto suo, uno spreco percentuale o un secondo
   materiale la farebbero divergere dal dettaglio senza che nulla lo dica —
   e sarebbero due numeri diversi per la stessa cosa, nella stessa schermata.

   Quindi: i totali di gruppo vengono dalle voci del motore; le righe di
   dettaglio dicono **come** quel totale è composto. */
function bom(){
  var q=Math.max(1,gv('p3d-qty',1));
  var voci={};
  if(R && !R.indisponibile && R._costo && R._costo.perPezzo){
    (R._costo.perPezzo.voci||[]).forEach(function(v){ voci[v.id]=v.value; });
  }
  var righe=[];

  /* Materiale: il totale è quello del motore, spreco compreso; il dettaglio
     elenca i materiali dichiarati, o l'unico se non ce n'è più d'uno. */
  var totMat=+voci.materiale||0;
  if(totMat>0){
    if(MULTIMAT.length){
      var mm=costoMultiMateriale();
      MULTIMAT.forEach(function(m){
        var gr=Math.max(0,parseFloat(m.grammi)||0); if(!(gr>0)) return;
        var pk=Math.max(0,parseFloat(m.prezzoKg)||0);
        /* La quota di spreco si ripartisce sulle righe in proporzione, così la
           somma resta esattamente il totale del motore. */
        var quota = mm.costo>0 ? ((gr/1000)*pk)/mm.costo : 0;
        righe.push({ gruppo:'Materiale', n:m.tipo||'Materiale', q:gr, u:(T==='resin'?'ml':'g'), costo: totMat*quota });
      });
    } else {
      var pp=pesi();
      var nome=(el('p3d-mat')&&el('p3d-mat').selectedOptions&&el('p3d-mat').selectedOptions[0]&&el('p3d-mat').value)
        ? el('p3d-mat').selectedOptions[0].textContent.replace(/^[^ ]+ /,'')
        : (T==='resin'?'Resina':'Filamento');
      righe.push({ gruppo:'Materiale', n:nome, q:Math.round(pp.totale*100)/100, u:(T==='resin'?'ml':'g'), costo: totMat });
    }
  }

  /* Componenti e confezione: stessa regola. Il totale è del motore, le righe
     dicono di che cosa è fatto. */
  var perGruppo=function(gruppo, elenco, totale){
    if(!(totale>0)) return;
    var lordo=elenco.reduce(function(a,x){ return a+(+x.q||0)*(+x.c||0); },0);
    elenco.forEach(function(x){
      var v=(+x.q||0)*(+x.c||0);
      righe.push({ gruppo:gruppo, n:x.n, q:+x.q||0, u:'pz', costo: lordo>0 ? totale*(v/lordo) : 0 });
    });
    /* Una quota che il motore conta ma nessuna riga spiega — per esempio la
       confezione dichiarata come importo al pezzo invece che a righe. */
    if(lordo<=0) righe.push({ gruppo:gruppo, n:'dichiarato al pezzo', q:1, u:'', costo: totale });
  };
  perGruppo('Componenti', HARDWARE, +voci.hardware||0);
  perGruppo('Confezione', IMBALLO, +voci.packaging||0);

  var totale=(+voci.materiale||0)+(+voci.hardware||0)+(+voci.packaging||0);
  return { righe:righe, qty:q, totale:totale,
           voci:{ materiale:+voci.materiale||0, hardware:+voci.hardware||0, packaging:+voci.packaging||0 } };
}

function disegnaBom(){
  var n=el('p3d-bom'); if(!n) return;
  var b=bom();
  if(!b.righe.length){ n.innerHTML='<div class="p3-ht">Nessun materiale, componente o confezione da elencare.</div>'; return; }
  var gruppo='';
  n.innerHTML='<table style="width:100%;border-collapse:collapse;font-size:11px">'
    +b.righe.map(function(r){
      var testa='';
      if(r.gruppo!==gruppo){ gruppo=r.gruppo; testa='<tr><td colspan="3" style="padding:6px 0 2px;font-size:9px;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">'+r.gruppo+'</td></tr>'; }
      return testa+'<tr>'
        +'<td style="padding:2px 0;color:var(--text)">'+esc3(r.n)+'</td>'
        +'<td style="text-align:right;color:var(--text-muted);white-space:nowrap">'+(Math.round(r.q*100)/100)+' '+r.u+'</td>'
        +'<td style="text-align:right;font-weight:700;color:var(--text)">'+eur(r.costo)+'</td></tr>';
    }).join('')
    +'</table>'
    +'<div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:6px;border-top:1px solid var(--border);font-size:11px">'
      +'<span style="color:var(--text-muted)">Distinta per pezzo</span>'
      +'<span style="font-weight:800;color:var(--text)">'+eur(b.totale)+'</span></div>'
    +(b.qty>1?'<div style="display:flex;justify-content:space-between;margin-top:2px;font-size:11px">'
      +'<span style="color:var(--text-muted)">Per '+b.qty+' pezzi</span>'
      +'<span style="font-weight:800;color:#22d3ee">'+eur(b.totale*b.qty)+'</span></div>':'');
}

/* ── Preventivato contro reale ─────────────────────────────────────────────
   La domanda che chiude il cerchio, e senza la quale ogni preventivo ripete
   gli errori del precedente con la stessa sicurezza.

   Tre regole che questa card rispetta e che sono il motivo per cui è scritta
   così e non in modo più comodo:

   1. **Il preventivo originale non si tocca.** Il preventivato viene dallo
      snapshot congelato della riga; il consuntivo sta in un'altra chiave.
      Nessun campo di questa card scrive nello snapshot.
   2. **Il confronto lo fa `InglyScostamento`**, che è puro e collaudato.
      Qui si raccolgono i numeri e si disegnano: nessuna sottrazione a mano.
   3. **Niente si aggiorna da solo.** Quando il consuntivo suggerisce che una
      stima è sbagliata — un tasso di fallimento, un tempo di post-processo —
      la card lo **propone**. Cambiare i dati senza consenso vorrebbe dire che
      un preventivo fatto domani parte da numeri che nessuno ha approvato. */
function cardConsuntivo(){
  if(!LINES.length) return '';
  return '<div class="p3-card">'
    +'<div class="p3-ct">📊 PREVENTIVATO VS REALE</div>'
    +'<div id="p3d-consuntivo"></div>'
  +'</div>';
}

var VOCI_CONSUNTIVO=[
  { id:'materiale',   lab:'Materiale',    unita:'€' },
  { id:'energia',     lab:'Energia',      unita:'€' },
  { id:'macchina',    lab:'Tempo macchina', unita:'h' },
  { id:'manodopera',  lab:'Manodopera',   unita:'€' },
];

/** Il preventivato di una riga, dalle voci congelate nello snapshot. */
function previstoDi(l){
  var v=(l && l.snapshot && l.snapshot.voci) || {};
  var somma=function(){ var t=0; for(var i=0;i<arguments.length;i++) t+=(+v[arguments[i]]||0); return t; };
  return {
    materiale: somma('materiale'),
    energia:   somma('energia'),
    macchina:  (l.snapshot && l.snapshot.ingresso && +l.snapshot.ingresso.hours) || 0,
    manodopera: somma('setup','finitura','postProcesso','unaTantumPerPezzo'),
    costo:     (l.snapshot && +l.snapshot.trueCost) || +l.cpz || 0,
    prezzo:    (l.snapshot && +l.snapshot.netPrice) || +l.ppz || 0,
    quantita:  Math.max(1,+l.qty||1),
  };
}

function disegnaConsuntivo(){
  var n=el('p3d-consuntivo'); if(!n) return;
  var S=(typeof window!=='undefined') && window.InglyScostamento;
  if(!S){ n.innerHTML='<div class="p3-ht">Modulo di confronto non caricato.</div>'; return; }
  var tutti=consuntivi();

  n.innerHTML=LINES.map(function(l){
    var prev=previstoDi(l);
    var reale=tutti[String(l.id)]||{};
    var costoReale = reale.costo!=null && reale.costo!=='' ? +reale.costo : null;
    var c=S.confronta(
      { costo:prev.costo, prezzo:prev.prezzo, quantita:prev.quantita },
      costoReale!=null ? { costo:costoReale, prezzo:(reale.prezzo!=null&&reale.prezzo!==''?+reale.prezzo:undefined), quantita:prev.quantita } : {}
    );

    var campo=function(v){
      var val=reale[v.id];
      return '<div style="display:flex;align-items:center;gap:5px;margin-bottom:4px">'
        +'<span style="flex:1;font-size:10px;color:var(--text-muted)">'+v.lab+'</span>'
        +'<span style="font-size:10px;color:var(--text-dim);width:64px;text-align:right">prev. '
          +(v.unita==='h' ? (Math.round((prev[v.id]||0)*100)/100)+' h' : eur(prev[v.id]||0))+'</span>'
        +'<input class="p3-fc" type="number" step="0.01" min="0" style="width:78px;text-align:right;font-size:11px;padding:4px 6px" '
          +'placeholder="reale" value="'+(val==null?'':val)+'" '
          +'oninput="Print3DQuoter.setConsuntivo('+l.id+',\''+v.id+'\',this.value)">'
        +'<span style="font-size:9px;color:var(--text-dim);width:12px">'+v.unita+'</span></div>';
    };

    var semaforo=function(){
      if(!c.disponibile) return { c:'var(--text-dim)', i:'⚪', t:'consuntivo non registrato' };
      var p=Math.abs(c.scostamento.costoPct||0);
      if(c.verdetto.colore==='rosso') return { c:'var(--red)', i:'🔴', t:c.verdetto.label };
      if(p>5) return { c:'var(--orange)', i:'🟡', t:c.verdetto.label };
      return { c:'var(--green,#22c55e)', i:'🟢', t:c.verdetto.label };
    }();

    var confronto = c.disponibile
      ? '<div style="display:grid;grid-template-columns:1fr auto auto;gap:3px 10px;font-size:10px;margin-top:7px;padding-top:7px;border-top:1px solid var(--border)">'
        +'<span style="color:var(--text-muted)"></span><span style="color:var(--text-dim);text-align:right">previsto</span><span style="color:var(--text-dim);text-align:right">reale</span>'
        +['costo','ricavo','profitto'].map(function(k){
          return '<span style="color:var(--text-muted)">'+k.charAt(0).toUpperCase()+k.slice(1)+'</span>'
            +'<span style="text-align:right;color:var(--text)">'+eur(c.preventivato[k])+'</span>'
            +'<span style="text-align:right;font-weight:700;color:var(--text)">'+eur(c.reale[k])+'</span>';
        }).join('')
        +'<span style="color:var(--text-muted)">Margine</span>'
        +'<span style="text-align:right;color:var(--text)">'+(c.preventivato.margine!=null?c.preventivato.margine.toFixed(1)+'%':'—')+'</span>'
        +'<span style="text-align:right;font-weight:700;color:var(--text)">'+(c.reale.margine!=null?c.reale.margine.toFixed(1)+'%':'—')+'</span>'
        +'</div>'
        +'<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px;font-size:10px;color:var(--text-muted)">'
          +'<span>scostamento <b style="color:'+semaforo.c+'">'+(c.scostamento.costo>=0?'+':'')+eur(c.scostamento.costo)+'</b></span>'
          +'<span><b style="color:'+semaforo.c+'">'+(c.scostamento.costoPct!=null?((c.scostamento.costoPct>=0?'+':'')+c.scostamento.costoPct.toFixed(1)+'%'):'—')+'</b></span>'
          +'<span style="color:var(--text-dim)">'+c.scostamento.convenzione+'</span>'
        +'</div>'
        +proposta(l,c)
      : '<div class="p3-ht" style="margin-top:6px">'+esc3(c.cosaFare||'')+'</div>';

    return '<div style="padding:9px 0;border-bottom:1px solid var(--border)">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">'
        +'<span style="font-size:11px;font-weight:800;color:var(--text)">'+esc3(l.n)+'</span>'
        +'<span style="font-size:10px;font-weight:700;color:'+semaforo.c+'">'+semaforo.i+' '+esc3(semaforo.t)+'</span>'
      +'</div>'
      +VOCI_CONSUNTIVO.map(campo).join('')
      +'<div style="display:flex;align-items:center;gap:5px;margin-top:6px">'
        +'<span style="flex:1;font-size:10px;font-weight:700;color:var(--text)">Costo reale totale</span>'
        +'<input class="p3-fc" type="number" step="0.01" min="0" style="width:78px;text-align:right;font-size:11px;padding:4px 6px;font-weight:800" '
          +'placeholder="€/pz" value="'+(reale.costo==null?'':reale.costo)+'" '
          +'oninput="Print3DQuoter.setConsuntivo('+l.id+',\'costo\',this.value)">'
        +'<span style="font-size:9px;color:var(--text-dim);width:12px">€</span></div>'
      +confronto
    +'</div>';
  }).join('')
  +'<div class="p3-ht" style="margin-top:8px">Il consuntivo sta in un archivio suo: il preventivo consegnato non cambia mai per averlo compilato.</div>';
}

/* ── Il giro di ritorno ────────────────────────────────────────────────────
   Quando il consuntivo dice che una stima era sbagliata, il sistema lo
   **propone** e si ferma lì. Aggiornare da solo un tasso di fallimento
   vorrebbe dire che il preventivo di domani parte da un numero che nessuno ha
   guardato — e quel numero finisce in un prezzo che qualcuno pagherà. */
function proposta(l,c){
  if(!c.disponibile) return '';
  var p=c.scostamento.costoPct;
  if(p==null || Math.abs(p)<10) return '';
  var su = p>0;
  return '<div style="margin-top:7px;padding:7px 9px;border-radius:8px;background:var(--bg-card2);border-left:3px solid #22d3ee;font-size:10px;color:var(--text-muted);line-height:1.5">'
    +'<b style="color:#22d3ee">Disponibili nuovi dati per aggiornare le stime.</b><br>'
    +'Questo lavoro è costato il <b style="color:var(--text)">'+Math.abs(p).toFixed(1)+'%</b> '
    +(su?'in più':'in meno')+' del preventivo. '
    +(su
      ? 'Le cause più frequenti sono un tasso di fallimento più alto del dichiarato o un post-processo più lungo.'
      : 'Se si ripete, le tue stime sono prudenti: puoi rivederle al ribasso e restare competitivo.')
    +'<br><span style="color:var(--text-dim)">Nessun dato è stato modificato: la revisione la decidi tu.</span>'
  +'</div>';
}

function setConsuntivo(id,campo,valore){
  var d={}; d[campo] = (valore===''||valore==null) ? null : (parseFloat(valore)||0);
  salvaConsuntivo(id,d);
  disegnaConsuntivo();
}

/* ── Macchina importata contro macchina usata ──────────────────────────────
   La card compare solo quando il file ne ha dichiarata una: senza importazione
   non c'è niente da confrontare, e una card vuota che dice «nessuna macchina
   importata» sarebbe rumore. */
function cardMacchina(){
  if(!MACCHINA_IMPORTATA) return '';
  var usata=(function(){
    var sel=el('p3d-mach');
    if(sel && sel.selectedOptions && sel.selectedOptions[0] && sel.value) return sel.selectedOptions[0].textContent;
    return 'quella configurata a schermo';
  })();
  var trovata=trovaMacchina(MACCHINA_IMPORTATA);
  var b=function(id,lab,sotto,attiva){
    return '<button class="p3-tb'+(MACCHINA_MODO===id?' afdm':'')+'" style="flex:1;text-align:left;padding:7px 10px'
      +(attiva?'':';opacity:.45;cursor:not-allowed')+'" '
      +(attiva?'onclick="Print3DQuoter.setMacchinaModo(\''+id+'\')"':'')+'>'
      +'<div style="font-weight:800;font-size:11px">'+lab+'</div>'
      +'<div style="font-size:9px;opacity:.75;font-weight:600">'+sotto+'</div></button>';
  };
  return '<div class="p3-card cyan">'
    +'<div class="p3-ct c">🤖 MACCHINA DEL PROGETTO</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">'
      +'<div style="padding:8px 10px;background:var(--bg-card2);border-radius:8px">'
        +'<div style="font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">Importata dal file</div>'
        +'<div style="font-size:12px;font-weight:800;color:var(--text);margin-top:2px">'+esc3(MACCHINA_IMPORTATA)+'</div></div>'
      +'<div style="padding:8px 10px;background:var(--bg-card2);border-radius:8px;border-left:3px solid #22d3ee">'
        +'<div style="font-size:9px;color:#22d3ee;text-transform:uppercase;letter-spacing:.5px">Usata per il conto</div>'
        +'<div style="font-size:12px;font-weight:800;color:var(--text);margin-top:2px">'+esc3(usata)+'</div></div>'
    +'</div>'
    +'<div class="p3-type" style="gap:6px">'
      +b('progetto','📄 Macchina del progetto', trovata?('trovata: '+trovata.n):'non è fra le tue macchine', !!trovata)
      +b('ingly','🏭 Macchina INGLY','quella scelta qui sopra',true)
    +'</div>'
    +'<div class="p3-ht" style="margin-top:6px">'
      +(trovata
        ? 'Il file dichiara il modello, non il suo prezzo né la sua vita utile: «macchina del progetto» sceglie <b>'+esc3(trovata.n)+'</b> fra le tue e usa i tuoi costi.'
        : '<span style="color:var(--orange)">«'+esc3(MACCHINA_IMPORTATA)+'» non è fra le macchine configurate: il conto usa quella scelta a schermo, e questa riga esiste perché tu lo sappia.</span>')
    +'</div></div>';
}

/** La macchina configurata che corrisponde al modello dichiarato dal file.
    Confronto per sottostringa in entrambe le direzioni: gli slicer scrivono
    codici («C11»), i cataloghi nomi commerciali («Bambu Lab X1 Carbon»). */
function trovaMacchina(modello){
  var m=String(modello||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  if(!m) return null;
  var elenco=(MACH[T]||[]);
  for(var i=0;i<elenco.length;i++){
    var n=String(elenco[i].n||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    if(!n) continue;
    if(n.indexOf(m)>=0 || m.indexOf(n)>=0) return elenco[i];
  }
  return null;
}

function setMacchinaModo(v){
  MACCHINA_MODO = (v==='progetto') ? 'progetto' : 'ingly';
  if(MACCHINA_MODO==='progetto'){
    var t=trovaMacchina(MACCHINA_IMPORTATA);
    if(t){ pickMach(t.id); return; }   // `pickMach` ridisegna già
  }
  render();
}

/* ── I materiali del pezzo ─────────────────────────────────────────────────
   Vuota, il campo singolo comanda e niente cambia. Con righe, il costo
   materiale è la somma di `grammi × €/kg` di ognuna — e il campo singolo si
   fa da parte invece di sommarsi, che sarebbe il doppio conteggio. */
function cardMultiMateriale(){
  var righe = MULTIMAT.length ? MULTIMAT.map(function(m,i){
    return '<div style="display:flex;align-items:center;gap:4px;margin-bottom:5px">'
      +'<input class="p3-fc" style="flex:2;font-size:11px;padding:5px 7px" value="'+esc3(m.tipo||m.n||'')+'" placeholder="PLA Rosso" oninput="Print3DQuoter.upMat2('+i+',\'tipo\',this.value)">'
      +'<input class="p3-fc" type="number" step="1" min="0" style="flex:0.8;text-align:right;font-size:11px;padding:5px 5px" value="'+(+m.grammi||0)+'" oninput="Print3DQuoter.upMat2('+i+',\'grammi\',this.value)">'
      +'<span style="font-size:10px;color:var(--text-dim)">g ×</span>'
      +'<input class="p3-fc" type="number" step="0.5" min="0" style="flex:0.8;text-align:right;font-size:11px;padding:5px 5px" value="'+(+m.prezzoKg||gv('p3d-mkg',24))+'" oninput="Print3DQuoter.upMat2('+i+',\'prezzoKg\',this.value)">'
      +'<span style="font-size:10px;color:var(--text-dim)">€/kg</span>'
      +'<button class="btn btn-danger btn-sm" onclick="Print3DQuoter.rmMat2('+i+')">✕</button></div>';
  }).join('') : '<div class="p3-ht">Un materiale solo: comanda il campo qui sopra.</div>';
  var tot=costoMultiMateriale();
  return '<div class="p3-card">'
    +'<div class="p3-ct">🎨 PIÙ MATERIALI</div>'
    +righe
    +'<button class="btn btn-secondary btn-sm" style="width:100%;margin-top:6px;border-style:dashed;color:#22d3ee;border-color:#22d3ee40" onclick="Print3DQuoter.addMat2()">+ Aggiungi materiale</button>'
    +(MULTIMAT.length
      ? '<div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:6px;border-top:1px solid var(--border);font-size:11px">'
        +'<span style="color:var(--text-muted)">Materiale del pezzo</span>'
        +'<span style="font-weight:800;color:#22d3ee">'+eur(tot.costo)+' · '+Math.round(tot.grammi)+' g</span></div>'
        +'<div class="p3-ht" style="margin-top:4px">Con più materiali il campo €/kg singolo non entra nel conto: il costo è la somma di queste righe.</div>'
      : '')
  +'</div>';
}

/** Grammi e costo dei materiali dichiarati riga per riga. */
function costoMultiMateriale(){
  var g=0,c=0;
  MULTIMAT.forEach(function(m){
    var gr=Math.max(0,parseFloat(m.grammi)||0);
    var pk=Math.max(0,parseFloat(m.prezzoKg)||0);
    g+=gr; c+=(gr/1000)*pk;
  });
  return { grammi:g, costo:c, righe:MULTIMAT.length };
}

/* ── I piatti del progetto ─────────────────────────────────────────────────
   Ognuno con il proprio peso, tempo e — quando serve — la propria macchina.
   Il costo del progetto è la somma dei piatti, e ogni piatto porta il proprio
   avviamento: è la ragione per cui non si sommano in un piatto solo. */
function cardPiatti(){
  if(!PIATTI.length) return '';
  var tot=PIATTI.reduce(function(a,p){ return { g:a.g+(+p.grammi||0), h:a.h+(+p.ore||0) }; },{g:0,h:0});
  return '<div class="p3-card cyan">'
    +'<div class="p3-ct c" style="display:flex;align-items:center;justify-content:space-between">'
      +'<span>🗂️ PIATTI DEL PROGETTO ('+PIATTI.length+')</span>'
      +'<button class="btn btn-secondary btn-sm" onclick="Print3DQuoter.svuotaPiatti()">✕</button></div>'
    +PIATTI.map(function(p,i){
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">'
        +'<span style="font-size:11px;color:var(--text);font-weight:700">'+esc3(p.nome||('Piatto '+(i+1)))+'</span>'
        +'<span style="font-size:10px;color:var(--text-muted)">'+Math.round(p.grammi||0)+' g · '+tempoDaDecimale(p.ore||0)+'</span>'
        +'<button class="btn btn-secondary btn-sm" style="font-size:10px;padding:3px 7px" onclick="Print3DQuoter.usaPiatto('+i+')">Usa</button>'
      +'</div>';
    }).join('')
    +'<div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px">'
      +'<span style="color:var(--text-muted)">Progetto intero</span>'
      +'<span style="font-weight:800;color:#22d3ee">'+Math.round(tot.g)+' g · '+tempoDaDecimale(tot.h)+'</span></div>'
    +'<div class="p3-ht" style="margin-top:6px">Ogni piatto è una stampa a sé, con il proprio avviamento: «Usa» carica quel piatto nel conto, così l\'avviamento resta uno per piatto invece di uno per progetto.</div>'
  +'</div>';
}

/* ── La card del lavoro ───────────────────────────────────────────────────
   Sette fasi, e una riga che dice quanto costano insieme. L'avviamento è
   marcato «per lavoro» perché è l'unico che si divide per la quantità, ed è
   la distinzione che rende il costo di cento pezzi diverso da cento volte il
   costo di uno. */
function cardLavoro(){
  var q=Math.max(1,gv('p3d-qty',1));
  return '<div class="p3-card cyan">'
    +'<div class="p3-ct c">👤 LAVORO — quanto tempo ci metti tu</div>'
    +'<div class="p3-g2">'
    +FASI.map(function(f){
      return '<div class="p3-fg"><label class="p3-fl">'+f.icona+' '+f.lab.toUpperCase()
        +(f.job?' <span style="color:#22d3ee">·job</span>':'')+'</label>'
        +'<input class="p3-fc" type="number" step="1" min="0" value="'+(LAVORO[f.id]||0)+'" '
        +'oninput="Print3DQuoter.setFase(\''+f.id+'\',this.value)">'
        +'<div class="p3-ht">'+(f.job?'una volta per lavoro':'per pezzo')+'</div></div>';
    }).join('')
    +'</div>'
    +'<div class="p3-fg" style="margin-top:8px"><label class="p3-fl">💶 €/H MANODOPERA</label>'
      +'<input class="p3-fc" id="p3d-lr" type="number" step="1" value="18" oninput="Print3DQuoter.calc()"></div>'
    +'<div style="margin-top:8px;padding:8px 10px;background:var(--bg-card2);border-radius:8px;font-size:10px;color:var(--text-muted);line-height:1.6" id="p3d-lavoro-tot"></div>'
  +'</div>';
}

/* ── Righe con quantità e costo unitario ──────────────────────────────────
   Ferramenta e confezione hanno la stessa forma: nome, quantità, costo. Una
   funzione sola per entrambe, perché due copie di questa tabella
   divergerebbero alla prima modifica. */
function cardRighe(titolo,elenco,suffisso,esempio){
  var righe = elenco.length ? elenco.map(function(x,i){
    return '<div style="display:flex;align-items:center;gap:4px;margin-bottom:5px">'
      +'<input class="p3-fc" style="flex:2;font-size:11px;padding:5px 7px" value="'+esc3(x.n)+'" oninput="Print3DQuoter.up'+suffisso+'('+i+',\'n\',this.value)">'
      +'<input class="p3-fc" type="number" step="1" min="0" style="flex:0.6;text-align:center;font-size:11px;padding:5px 4px" value="'+x.q+'" oninput="Print3DQuoter.up'+suffisso+'('+i+',\'q\',this.value)">'
      +'<span style="font-size:10px;color:var(--text-dim)">×</span>'
      +'<input class="p3-fc" type="number" step="0.01" min="0" style="flex:0.8;text-align:right;font-size:11px;padding:5px 6px" value="'+x.c+'" oninput="Print3DQuoter.up'+suffisso+'('+i+',\'c\',this.value)">'
      +'<span style="font-size:10px;color:var(--text-dim)">€</span>'
      +'<button class="btn btn-danger btn-sm" onclick="Print3DQuoter.rm'+suffisso+'('+i+')">✕</button></div>';
  }).join('') : '<div class="p3-ht" style="padding:4px 0">Nessuna voce — '+esempio+'</div>';
  var tot = elenco.reduce(function(a,x){ return a+(x.q||0)*(x.c||0); },0);
  return '<div class="p3-card">'
    +'<div class="p3-ct" style="display:flex;justify-content:space-between;align-items:center">'
      +'<span>'+titolo+'</span>'
      +(tot>0?'<span style="color:#22d3ee;font-weight:800;text-transform:none">'+eur(tot)+'/pz</span>':'')
    +'</div>'
    +righe
    +'<button class="btn btn-secondary btn-sm" style="width:100%;margin-top:6px;border-style:dashed;color:#22d3ee;border-color:#22d3ee40" onclick="Print3DQuoter.add'+suffisso+'()">+ Aggiungi</button>'
  +'</div>';
}

/** L'apostrofo e le virgolette in un `value=` chiudono l'attributo: senza
    questo, un componente chiamato «vite 3" » romperebbe la pagina. */
function esc3(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

/** Ore e minuti diventano ore decimali, una volta sola e senza arrotondare:
    9h57 fa 9,95 e non 10. Il campo decimale resta la fonte per il motore, così
    nessuna formula deve sapere che esistono due caselle. */
function setTempo(){
  var h=Math.max(0,gv('p3d-hh',0));
  var m=Math.max(0,Math.min(59,gv('p3d-mm',0)));
  var dec=h+m/60;
  sv('p3d-h',dec);
  var n=el('p3d-h-dec');
  if(n) n.textContent='= '+(Math.round(dec*100)/100).toFixed(2).replace('.',',')+' h';
  calc();
}

/** L'inverso, per quando le ore arrivano da un import o da un preventivo
    salvato: si riempiono le due caselle senza perdere i minuti. */
function tempoDaDecimale(dec){
  var h=Math.floor(Math.max(0,dec));
  var m=Math.round((Math.max(0,dec)-h)*60);
  if(m===60){ h+=1; m=0; }
  sv('p3d-hh',h); sv('p3d-mm',m); sv('p3d-h',dec);
  var n=el('p3d-h-dec');
  if(n) n.textContent='= '+(Math.round(dec*100)/100).toFixed(2).replace('.',',')+' h';
}

/** Il verdetto disegnato, con i tre numeri che servono per decidere. */
function disegnaVerdetto(){
  var n=el('p3d-verdetto'); if(!n) return;
  var costo=COST||0;
  var v=verdetto(PREZZO_MANUALE,costo);
  if(!v){ n.innerHTML='<div class="p3-ht">Scrivi un prezzo per sapere che margine produce.</div>'; return; }
  var q=Math.max(1,gv('p3d-qty',1));
  n.innerHTML='<div style="padding:9px 11px;border-radius:9px;background:var(--bg-card2);border-left:3px solid '+v.col+'">'
    +'<div style="font-size:12px;font-weight:800;color:'+v.col+'">'+v.icona+' '+v.lab+'</div>'
    +'<div style="font-size:10px;color:var(--text-muted);line-height:1.5;margin-top:3px">'+v.testo+'</div>'
    +'<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:7px;font-size:10px;color:var(--text-muted)">'
      +'<span>costo <b style="color:var(--text)">'+eur(costo)+'</b>/pz</span>'
      +'<span>prezzo <b style="color:var(--text)">'+eur(PREZZO_MANUALE)+'</b>/pz</span>'
      +'<span>profitto <b style="color:var(--text)">'+eur(PREZZO_MANUALE-costo)+'</b>/pz</span>'
      +'<span>margine <b style="color:var(--text)">'+v.margine.toFixed(1)+'%</b></span>'
      +'<span>ricarico <b style="color:var(--text)">'+(costo>0?((PREZZO_MANUALE/costo-1)*100).toFixed(1):'—')+'%</b></span>'
      +(q>1?'<span>sul lavoro <b style="color:var(--text)">'+eur((PREZZO_MANUALE-costo)*q)+'</b></span>':'')
    +'</div></div>';
}

function setPrezzoManuale(v){ PREZZO_MANUALE=Math.max(0,parseFloat(v)||0); calc(); }
function setMargineMinimo(v){ MARGINE_MINIMO_3D=Math.max(0,Math.min(95,parseFloat(v)||0)); calc(); }

/* ── Il verdetto ──────────────────────────────────────────────────────────
   Tre stati, e nessuno è un'opinione: sono tre confronti fra il prezzo e due
   numeri che il preventivatore conosce già. Serve perché «€ 25» non dice
   niente da solo, e chi tratta con un cliente ha bisogno di sapere subito da
   che parte della riga si trova. */
function verdetto(prezzo,costo){
  if(!(prezzo>0)||!(costo>0)) return null;
  var m=(prezzo-costo)/prezzo*100;
  if(prezzo<costo) return { id:'perdita', icona:'🔴', lab:'In perdita',
    col:'var(--red)', margine:m,
    testo:'Vendi sotto il costo: ogni pezzo toglie '+eur(costo-prezzo)+'.' };
  if(m<MARGINE_MINIMO_3D) return { id:'attenzione', icona:'⚠️', lab:'Sotto il minimo',
    col:'var(--orange)', margine:m,
    testo:'Margine '+m.toFixed(1)+'%, sotto il minimo che ti sei dato ('+MARGINE_MINIMO_3D+'%).' };
  return { id:'ok', icona:'✅', lab:'Profittevole', col:'var(--green,#22c55e)', margine:m,
    testo:'Margine '+m.toFixed(1)+'%, sopra il minimo del '+MARGINE_MINIMO_3D+'%.' };
}

/* ── La card del prezzo manuale ───────────────────────────────────────────
   Il preventivatore risponde a due domande diverse: «quanto devo chiedere» e
   «se chiedo questo, quanto ci guadagno». La seconda serve quando il prezzo
   arriva dal cliente o da un listino, ed è quella che dice se una commessa
   conviene accettarla. */
function cardPrezzoManuale(){
  var costo=COST||0;
  var minimo=null;
  var MOT=(typeof window!=='undefined') && window.InglyCostEngine;
  if(MOT && costo>0) minimo=MOT.prezzo(costo,{strategia:'margine',marginePct:MARGINE_MINIMO_3D,ivaPct:0}).netto;

  return '<div class="p3-card">'
    +'<div class="p3-ct">💶 SE VOLESSI FAR PAGARE…</div>'
    +'<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px">'
      +'<span style="font-size:13px;color:var(--text-muted)">€</span>'
      +'<input class="p3-fc" type="number" step="0.5" min="0" placeholder="prezzo al pezzo" value="'+(PREZZO_MANUALE||'')+'" '
      +'oninput="Print3DQuoter.setPrezzoManuale(this.value)" style="font-size:15px;font-weight:800">'
    +'</div>'
    /* Il verdetto lo riempie `calc()`: dipende dal costo, che cambia a ogni
       tasto premuto, e ridisegnare la card intera per aggiornare tre righe
       farebbe perdere il fuoco al campo mentre si scrive il prezzo. */
    +'<div id="p3d-verdetto"></div>'
    +'<div style="margin-top:10px;padding-top:9px;border-top:1px solid var(--border)">'
      +'<label style="font-size:10px;color:var(--text-muted);display:flex;justify-content:space-between;align-items:center">'
        +'<span>🛑 Margine minimo accettabile</span>'
        +'<span style="display:flex;align-items:center;gap:4px">'
          +'<input class="p3-fc" type="number" step="1" min="0" max="95" value="'+MARGINE_MINIMO_3D+'" '
          +'oninput="Print3DQuoter.setMargineMinimo(this.value)" style="width:56px;padding:3px 6px;font-size:12px;text-align:right;font-weight:800">'
          +'<span>%</span></span>'
      +'</label>'
      +(minimo!=null
        ? '<div class="p3-ht" style="margin-top:5px">Sotto <b style="color:var(--orange)">'+eur(minimo)+'</b> al pezzo non conviene accettare.</div>'
        : '')
    +'</div>'
  +'</div>';
}

/* ── I costi unitari ──────────────────────────────────────────────────────
   Le stesse cifre divise per le grandezze con cui si ragiona in officina.
   «Questo pezzo costa 18 €» non dice se conviene; «costa 1,90 € all'ora di
   macchina» confrontato con quanto si fa pagare l'ora, sì. */
function cardCostoPer(){
  if(!R||R.indisponibile||!R._costo||!R._costo.costoPer) return '';
  var c=R._costo.costoPer;
  var voce=function(lab,val,unita){
    if(val==null) return '';
    return '<div style="flex:1;min-width:96px;padding:8px 10px;background:var(--bg-card2);border-radius:9px;border:1px solid var(--border)">'
      +'<div style="font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-dim)">'+lab+'</div>'
      +'<div style="font-size:15px;font-weight:900;color:var(--text);line-height:1.2">'+eur(val)+'</div>'
      +'<div style="font-size:9px;color:var(--text-muted)">'+unita+'</div></div>';
  };
  return '<div class="p3-card"><div class="p3-ct">📏 COSTO PER</div>'
    +'<div style="display:flex;gap:7px;flex-wrap:wrap">'
      +voce('Grammo',c.grammo,'di materiale')
      +voce('Ora macchina',c.oraMacchina,'di stampa')
      +voce('Minuto uomo',c.minutoUomo,'di lavoro')
      +voce('Pezzo',c.pezzo,'finito')
    +'</div></div>';
}

function setFase(id,v){ LAVORO[id]=Math.max(0,parseFloat(v)||0); calc(); aggiornaLavoro(); }

function setProgetto(k,v){ PROGETTO[k]=String(v==null?'':v); }
function addMat2(){ MULTIMAT.push({ tipo:'', grammi:0, prezzoKg:gv('p3d-mkg',24) }); render(); }
function upMat2(i,k,v){ if(!MULTIMAT[i])return; MULTIMAT[i][k]=(k==='tipo')?v:(parseFloat(v)||0); calc(); }
function rmMat2(i){ MULTIMAT.splice(i,1); render(); }
function svuotaPiatti(){ PIATTI=[]; render(); }
function usaPiatto(i){
  var p=PIATTI[i]; if(!p) return;
  /* Caricare un piatto non lo cancella dall'elenco: si può passare da uno
     all'altro senza perdere il progetto. */
  SLICER.pesoTotale=p.grammi||0; SLICER.pesoModello=p.grammi||0;
  SLICER.supporti=0; SLICER.purge=0; SLICER.ore=p.ore||0; SLICER.includeTutto=true;
  if(p.materiali&&p.materiali.length) MULTIMAT=p.materiali.map(function(m){
    return { tipo:(m.tipo||'')+(m.colore?' '+m.colore:''), grammi:m.grammi||0, prezzoKg:gv('p3d-mkg',24) };
  });
  render();
  showToastP('🗂️ '+(p.nome||('Piatto '+(i+1)))+' caricato','info');
}
function setModalita(m){ MODALITA=(m==='rapida')?'rapida':'professionale'; render(); }
function setOverheadModo(m){ OVERHEAD.modo=m; render(); }
function setOverheadValore(v){ OVERHEAD.valore=Math.max(0,parseFloat(v)||0); calc(); }
function setPoliticaMat(p){
  POLITICA_MAT=p;
  /* Cambiare politica cambia il costo, quindi si rilegge il registro invece
     di ricalcolare su un numero preso con un'altra domanda. */
  var sel=(el('p3d-mat')||{}).value;
  if(sel){ var m=materialeDi(sel); if(m){ MAT_REG=costoDalRegistro(m); if(MAT_REG&&MAT_REG.disponibile) sv('p3d-mkg', Math.round(MAT_REG.costoUnitario*100)/100); } }
  render();
}
function addHw(){ HARDWARE.push({n:'Componente',q:1,c:0.10}); render(); }
function upHw(i,k,v){ if(!HARDWARE[i])return; HARDWARE[i][k]=(k==='n')?v:(parseFloat(v)||0); calc(); }
function rmHw(i){ HARDWARE.splice(i,1); render(); }
function addPk(){ IMBALLO.push({n:'Materiale',q:1,c:0.20}); render(); }
function upPk(i,k,v){ if(!IMBALLO[i])return; IMBALLO[i][k]=(k==='n')?v:(parseFloat(v)||0); calc(); }
function rmPk(i){ IMBALLO.splice(i,1); render(); }

/** Il totale dei minuti umani, aggiornato senza ridisegnare tutto. */
function aggiornaLavoro(){
  var el2=el('p3d-lavoro-tot'); if(!el2) return;
  var min=FASI.reduce(function(a,f){ return a+(LAVORO[f.id]||0); },0);
  var perJob=LAVORO.setup||0, perPezzo=min-perJob;
  var q=Math.max(1,gv('p3d-qty',1));
  var tar=gv('p3d-lr',18);
  el2.innerHTML='<b style="color:var(--text)">'+min+' min</b> di persona · '
    +eur((perPezzo/60*tar)+((perJob/60*tar)/q))+'/pz'
    +(q>1?' <span style="color:var(--text-dim)">(avviamento diviso su '+q+')</span>':'');
}

function setType(t){
  /* Il lavaggio e la polimerizzazione sono lavoro di resina: cambiando
     tecnologia cambia il predefinito della fase, ma solo se nessuno l'ha
     ancora toccato — altrimenti si cancellerebbe un dato inserito. */
  var pre=(T==='resin')?20:0;
  if(LAVORO.post===pre) LAVORO.post=(t==='resin')?20:0;
  T=t;render();
}
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
  var m=materialeDi(id);if(!m)return;
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
  /* I materiali che vengono dal magazzino portano la propria chiave; quelli
     importati una volta dal vecchio ponte hanno l'id preceduto da «g»; gli
     altri sono locali e non hanno niente da chiedere al registro. */
  var chiave = m.itemKey ? m.itemKey
    : (/^g/.test(String(m.id)) ? String(m.id).slice(1) : null);
  if(!chiave) return null;
  /* Il FIFO ha bisogno di sapere **quanto** si consuma: prelevare 500 g da
     un lotto di 420 g e uno successivo non costa 500 volte una media. Le
     altre politiche ignorano il parametro. */
  var consumo=0;
  try{ var pp=pesi(); consumo=pp.totale*Math.max(1,gv('p3d-qty',1)); }catch(err){ consumo=0; }
  var e = MC.dallaCache(chiave, {
    articolo:{ unit: m.t==='resin' ? 'bottiglia' : 'bobina' },
    politica: POLITICA_MAT==='manuale' ? 'media' : POLITICA_MAT,
    quantita: consumo>0?consumo:undefined,
  });
  if(POLITICA_MAT==='manuale') return null;   // il campo comanda, e lo dichiara
  return (e && e.disponibile) ? e : e;
}

/** Il registro si legge una volta per apertura di sezione, non a ogni tasto. */
function aggiornaRegistro(){
  var MC=(typeof window!=='undefined') && window.InglyMaterialCost;
  if(!MC || typeof MC.aggiornaCache!=='function') return;
  MC.aggiornaCache().then(function(){
    return (typeof MC.materialiPerStampa3D==='function') ? MC.materialiPerStampa3D() : [];
  }).then(function(lista){
    MATS_INV=lista||[];
    var sel=(el('p3d-mat')||{}).value;
    if(sel){ var m=materialeDi(sel); if(m) MAT_REG=costoDalRegistro(m); }
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
    filamentWeightSource:m.sorgente, totalFilamentGrams:m.totale,
    measuredEnergyKwh:e.measuredEnergyKwh, averagePowerW:e.averagePowerW, ratedPowerW:e.ratedPowerW,
    slicerMaterialCost:SLICER.costo>0?SLICER.costo:undefined,
    spoolPrice:gv('p3d-mkg',24), spoolGrams:gv('p3d-mu',1000),
    /* Con più materiali dichiarati comandano loro: il motore ignora il prezzo
       singolo invece di sommarcelo. */
    materials: MULTIMAT.filter(function(m){ return (parseFloat(m.grammi)||0)>0; })
      .map(function(m){ return { name:m.tipo, grams:parseFloat(m.grammi)||0, pricePerKg:parseFloat(m.prezzoKg)||0 }; }),
    hours: SLICER.ore>0 ? SLICER.ore : gv('p3d-h',0),
    /* `watt` è il campo storico e resta il ripiego della targa. Quando si
       forza una lettura diversa non va passato: il motore lo userebbe come
       ultima risorsa, e la scelta dell'utente verrebbe scavalcata in
       silenzio. */
    watt: (ENE==='auto'||ENE==='targa') ? gv('p3d-watt',150) : undefined,
    kwhPrice:gv('p3d-kwh',.28), dutyCycle:gv('p3d-duty',1),
    machinePrice:gv('p3d-mc',400), machineLifeHours:gv('p3d-lh',2000),
    maintenancePerHour:gv('p3d-mnt',0),
    /* Il lavaggio è la fase «post» della card lavoro, non un campo a parte:
       finché ne esistevano due, chi compilava entrambi pagava il
       post-processo due volte. */
    washCureMin:LAVORO.post, laborPerHour:gv('p3d-lr',18),
    /* L'avviamento è per **lavoro** e si divide per la quantità; tutte le
       altre fasi sono per **pezzo**. Confonderli è il modo in cui il costo di
       cento pezzi diventa cento volte l'avviamento. */
    setupMin:LAVORO.setup,
    finishMin:LAVORO.prep+LAVORO.rimoz+LAVORO.qc+LAVORO.pack+LAVORO.altro,
    /* I due sprechi, separati: lo spreco di materiale aumenta i grammi, lo
       scarto di produzione butta il pezzo intero. */
    /* Le spese generali, tradotte nei due campi che il motore conosce. La
       traduzione sta qui, in un posto solo, dove si vede che è una
       traduzione: «per lavoro» diventa una percentuale del costo del lavoro
       intero, e resta un modo solo per volta — mai due sommati. */
    overheadPerHour: OVERHEAD.modo==='ora' ? OVERHEAD.valore : 0,
    overheadPct: OVERHEAD.modo==='percento' ? OVERHEAD.valore : 0,
    overheadPerJob: OVERHEAD.modo==='lavoro' ? OVERHEAD.valore : 0,
    materialWasteRate:gv('p3d-waste',0),
    failureRate:gv('p3d-fail',0),
    hardware:HARDWARE.map(function(h){ return { name:h.n, qty:h.q, unitCost:h.c }; }),
    packagingItems:IMBALLO.map(function(x){ return { name:x.n, qty:x.q, unitCost:x.c }; }),
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
/* ── Le tre fonti del peso, dichiarate ────────────────────────────────────
   Il difetto misurato: bastava un numero nella card «Importa dallo slicer»
   perché il campo «MATERIALE (g)» smettesse di comandare — **e il campo
   continuava a mostrare 290 mentre il motore usava 2**. Due numeri a schermo,
   nessuno dei due sbagliato, e nessun modo di sapere quale valesse.

   Adesso la fonte è una sola per volta, ha un nome, e la schermata lo dice:

     COMPLETE_SLICER_TOTAL  lo slicer ha dato un totale che comprende già
                            supporti e spurgo: non si somma altro
     MANUAL_BREAKDOWN       lo slicer ha dato le voci separate: si sommano
     MODEL_ONLY             nessun dato dallo slicer: comandano i campi

   Il guardiano sul peso modello esiste perché il caso che ha prodotto i 2 g
   non è un errore di formula: la sottrazione «totale − supporti» è giusta ed
   è l'anti-doppio-conteggio che funziona. È «supporti» compilato con il peso
   del modello. Un modello che pesa meno di un quinto del totale è quasi
   sempre quello, non un pezzo fatto di supporti. */
var SOGLIA_MODELLO = 0.20;

function pesi(){
  if(SLICER.pesoTotale>0){
    if(SLICER.includeTutto){
      var modello = SLICER.pesoModello>0 ? SLICER.pesoModello
        : Math.max(0, SLICER.pesoTotale - SLICER.supporti - SLICER.purge);
      var sospetto = SLICER.pesoTotale>0 && (modello / SLICER.pesoTotale) < SOGLIA_MODELLO;
      return { modello:modello, supporti:SLICER.supporti, purge:SLICER.purge,
               totale:modello+SLICER.supporti+SLICER.purge,
               fonte:'slicer', sorgente:'COMPLETE_SLICER_TOTAL', sospetto:sospetto };
    }
    return { modello:SLICER.pesoTotale, supporti:SLICER.supporti, purge:SLICER.purge,
             totale:SLICER.pesoTotale+SLICER.supporti+SLICER.purge,
             fonte:'slicer', sorgente:'MANUAL_BREAKDOWN', sospetto:false };
  }
  var g=gv('p3d-g',0), sup=gv('p3d-sup',0);
  return { modello:g, supporti:sup, purge:0, totale:g+sup,
           fonte:'manuale', sorgente:'MODEL_ONLY', sospetto:false };
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
  /* Le ore dello slicer riempiono le due caselle: chi importa 9,95 deve
     vedere «9 h 57 m», non un decimale da riconvertire a mente. */
  if(k==='ore' && SLICER.ore>0) tempoDaDecimale(SLICER.ore);
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
/** Le strategie sono i preset del motore, più quella storica. Sceglierne una
    imposta il margine; toccare il margine a mano sgancia la scelta, perché
    dire «Standard» mentre si applica il 53% sarebbe una bugia. */
function strategie3D(){
  var MOT=(typeof window!=='undefined') && window.InglyCostEngine;
  var base=MOT&&MOT.politiche?MOT.politiche():[];
  return base.concat([{ id:'storico', label:'Storico ×3,5',
    marginTarget:(1-1/3.5)*100, storica:true }]);
}

function setStrategia(id){
  var s=strategie3D().filter(function(x){return x.id===id;})[0];
  if(!s) return;
  STRATEGIA=id;
  MARG=s.marginTarget;
  render();
}

function setMargine(v){
  var n=parseFloat(v);
  if(!isFinite(n)) return;
  MARG=Math.max(0,Math.min(95,n));
  /* Se il margine non corrisponde più a nessuna strategia, nessuna strategia
     resta accesa: l'etichetta deve dire la verità. */
  var s=strategie3D().filter(function(x){return Math.abs(x.marginTarget-MARG)<0.05;})[0];
  STRATEGIA=s?s.id:'libero';
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
    ivaPct: IVA_ON?aliquotaIva():0,
    scontoPct: DISC,
    /* Gli scaglioni del benchmark, fino a mille. Servono a rispondere alla
       domanda vera del laboratorio — «da quanti pezzi in poi conviene?» —
       che con sei righe non si vede: l'avviamento si spalma, il materiale
       no, e il punto in cui la curva si appiattisce cade quasi sempre fra
       100 e 500. */
    quantita: SCAGLIONI,
    fonti: fonti(),
  }) : { indisponibile:true, motivo:'Vista preventivatore non disponibile' };

  var ok = R && !R.indisponibile;
  COST  = ok ? R.costo  : 0;
  PRICE = ok ? R.prezzo : 0;

  /* ── Il peso: chi comanda, e se il campo dice un'altra cosa ─────────────
     Il difetto misurato: la card slicer sovrascriveva il campo in silenzio.
     Il campo mostrava 290, il motore usava 2, e nessuna schermata diceva
     quale dei due valesse. */
  var m=pesi();
  var nf=el('p3d-g-fonte');
  if(nf){
    var campo=gv('p3d-g',0);
    if(m.fonte==='slicer'){
      var diverso = Math.abs(campo - m.modello) > 0.5;
      nf.innerHTML='<span style="color:#22d3ee;font-weight:700">Comanda la card slicer: '
        +Math.round(m.modello)+' g</span>'
        +(diverso ? '<br><span style="color:var(--orange)">⚠️ questo campo dice '+Math.round(campo)
                    +' g e non viene usato — svuota la card per usarlo</span>' : '');
    } else {
      nf.textContent='Da slicer (Bambu/Prusa) — comanda questo campo';
    }
  }

  /* La voce a preventivo è congelata, questa configurazione è viva: quando
     divergono lo si dice, invece di lasciare due numeri diversi a schermo
     senza spiegazione. È la seconda causa dell'incoerenza segnalata. */
  var dv=el('p3d-divergenza');
  if(dv){
    var uno = LINES.length===1 ? LINES[0] : null;
    var diverge = uno && ok && Math.abs(uno.cpz - COST) > 0.01;
    dv.innerHTML = diverge
      ? '<div style="font-size:10px;padding:7px 9px;border-radius:8px;margin:4px 0;background:var(--bg-card2);'
        +'border-left:3px solid var(--orange);color:var(--text-muted);line-height:1.5">'
        +'⚠️ La configurazione aperta adesso costa <b>'+eur(COST)+'</b>, la voce a preventivo <b>'+eur(uno.cpz)+'</b>. '
        +'Hai cambiato qualcosa dopo averla aggiunta: rimuovila e riaggiungila per aggiornarla.'
        +'</div>'
      : '';
  }

  aggiornaLavoro();

  var cp=el('p3d-costoper'); if(cp) cp.innerHTML=cardCostoPer();
  disegnaVerdetto();

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

  if(PERCHE_APERTO){ var pw=el('p3d-perche'); if(pw) pw.innerHTML=pannelloPerche(); }

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

  /* Le posizioni di prezzo, una card per politica: netto, IVA, lordo,
     profitto, margine e ricarico. Sei numeri per card perché sono le sei
     domande che si fanno davanti a un prezzo — e mostrarne tre costringe a
     rifare a mente le altre tre. */
  var pl=el('p3d-politiche');
  if(pl){
    var str = ok ? (R.strategie||[]) : [];
    pl.innerHTML = str.length ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">'
      +str.map(function(x){
        var scelta = x.id===STRATEGIA;
        return '<div style="border:1.5px solid '+(scelta?'#22d3ee':'var(--border)')+';border-radius:10px;padding:9px 10px;'
          +'background:'+(scelta?'#22d3ee12':'var(--bg-card2)')+';cursor:pointer" onclick="Print3DQuoter.setStrategia(\''+x.id+'\')">'
          +'<div style="font-size:11px;font-weight:800;color:'+(scelta?'#22d3ee':'var(--text)')+'">'+esc3(x.label)
            +(x.raccomandata?' <span style="font-size:8px;color:var(--green)">CONSIGLIATA</span>':'')+'</div>'
          +'<div style="font-size:18px;font-weight:900;color:var(--text);line-height:1.2;margin:3px 0">'+eur(x.prezzo)+'</div>'
          +'<div style="font-size:9px;color:var(--text-muted);line-height:1.6">'
            +(IVA_ON?'IVA '+eur(x.iva)+'<br>Lordo <b style="color:var(--text)">'+eur(x.prezzoLordo)+'</b><br>':'')
            +'Profitto '+eur(x.profitto)+'<br>'
            +'Margine '+(+x.marginePct||0).toFixed(1)+'% · Ricarico '+(+x.ricaricoPct||0).toFixed(1)+'%'
          +'</div></div>';
      }).join('')+'</div>'
      : '<div class="p3-ht">Inserisci i dati per vedere le posizioni.</div>';
  }

  disegnaBom();
  disegnaLotti();
  disegnaConsuntivo();

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

  /* ── Lo snapshot della riga ────────────────────────────────────────────
     La riga non porta più due numeri: porta il conto intero come era in
     questo istante — ogni voce di costo, il margine, l'IVA, e da dove
     venivano i dati. Serve a due cose che prima non si potevano fare.

     La prima: la riga non ha bisogno di ricalcolare niente per mostrarsi, e
     quindi non può divergere dal motore — è la regola che questa fase
     esiste per rendere strutturale invece che sperata.

     La seconda: fra sei mesi, con il filamento a un altro prezzo, si può
     ancora rispondere a «perché costava così» guardando la riga, invece di
     rifare il conto con i dati di oggi e ottenere un numero diverso. */
  var voci={}, prov={};
  if(R && !R.indisponibile && R._costo){
    (R._costo.perPezzo.voci||[]).forEach(function(v){ voci[v.id]=v.value; });
    if(R._costo.unaTantum && R._costo.unaTantum.perPezzo>0) voci.setup=R._costo.unaTantum.perPezzo;
    if(R._costo.overhead>0) voci.overhead=R._costo.overhead;
    (R._costo.provenienza||[]).forEach(function(x){ prov[x.id]={ source:x.source, confidence:x.confidence }; });
  }
  var F=(typeof window!=='undefined') && window.InglyFisco;
  var aliq=IVA_ON?(F?F.aliquota():22):0;

  LINES.push({id:Date.now(),n:name,qty:qty,cpz:COST,ppz:PRICE,ppzListino:listino,
              marg:MARG,modo:MODO,manuale:false,t:T,
              snapshot:{
                schema:1,
                quando:new Date().toISOString(),
                voci:voci,
                trueCost:COST,
                netPrice:PRICE,
                margine:MARG,
                ricaricoPct: COST>0 ? (PRICE/COST-1)*100 : null,
                strategia:STRATEGIA,
                livello:MODO,
                aliquotaIva:aliq,
                iva:PRICE*aliq/100,
                lordo:PRICE*(1+aliq/100),
                scontoPct:DISC,
                ingresso: ingresso(),
                provenienza: prov,
                calcolatoDa: (window.InglyCostEngine&&window.InglyCostEngine.version)||null,
              }});
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
  var TOT=totali();
  var totN=TOT.netto, listino=TOT.listino, discAmt=TOT.sconto, vatAmt=TOT.iva, gross=TOT.lordo;
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
    +(IVA_ON?'<div class="tr"><span>'+(TOT.etichettaIva||'IVA')+'</span><span>'+eur(vatAmt)+'</span></div>':'')
    +'<div class="grand">TOTALE: '+eur(gross)+(IVA_ON?' (IVA incl.)':' (senza IVA)')+'</div></div>'
    +(notes?'<div style="margin-top:24px;padding:12px;background:#f0f9ff;border-radius:8px;font-size:12px;color:#6b7280"><strong>Note:</strong> '+notes+'</div>':'')
    +'<div class="footer">Generato da INGLY OS · Smart Quoter 3D · '+new Date().toLocaleString('it-IT')+'</div>'
    +'<br><button onclick="window.print()" style="padding:10px 20px;background:#0891b2;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:700;margin-top:16px">🖨️ Stampa / PDF</button>'
    +'</body></html>');w.document.close();
}

function doWa(){
  if(!LINES.length){showToastP('⚠️ Nessuna voce','warning');return;}
  var name=(el('p3d-name')||{}).value||'Stampa 3D';
  var TOT=totali();
  var totN=TOT.netto, listino=TOT.listino, gross=TOT.lordo;
  var lines=LINES.map(function(l){return '• '+l.n+' ×'+l.qty+' = '+eur(l.ppz*l.qty);}).join('\n');
  var msg='🖨️ *Preventivo Stampa 3D*\n\n*'+name+'*\n\n'+lines
    +(listino-totN>0.005?'\n\nListino: '+eur(listino)+'\nSconto '+DISC+'%: -'+eur(listino-totN):'')
    +'\nSubtotale: '+eur(totN)
    +'\n*TOTALE: '+eur(gross)+'*'+(IVA_ON?(' ('+(TOT.etichettaIva||'IVA')+' inclusa)'):' (senza IVA)')
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
  LINES=[];EXTRAS=[];COST=0;PRICE=0;R=null;CALIB_RIF=0;IVA_ON=true;DISC=0;MODO='completo';MARG=40;STRATEGIA='standard';
  render();showToastP('🔄 Reset completato','info');
}

function openMat(){renderMatList();var m=el('p3d-mat-modal');if(m)m.classList.add('open');}
function closeMat(){var m=el('p3d-mat-modal');if(m)m.classList.remove('open');render();}
function renderMatList(){
  var root=el('p3d-mat-list');if(!root)return;
  /* Due gruppi, e la differenza fra loro è il punto: quelli a magazzino si
     modificano in Magazzino — modificarli qui creerebbe la terza copia dopo
     averne appena ritirata una — e quelli locali si modificano qui, con
     l'invito a portarli a magazzino perché il costo diventi verificabile. */
  function riga(m,tracciato){
    var badge = tracciato
      ? '<span style="font-size:9px;padding:1px 6px;border-radius:99px;background:#22c55e20;color:#22c55e;font-weight:700">a magazzino</span>'
      : '<span style="font-size:9px;padding:1px 6px;border-radius:99px;background:var(--bg-card);color:var(--text-dim);font-weight:700;border:1px solid var(--border)">solo qui</span>';
    return '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg-card2);border-radius:8px;margin-bottom:5px;border:1px solid var(--border)">'
      +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--text);display:flex;align-items:center;gap:6px">'+m.n+' '+badge+'</div>'
      +'<div style="font-size:10px;color:#475569">'+(m.s||'—')+' · €'+m.p+'/'+(m.t==='resin'?'L':'kg')
        +(tracciato&&m.giacenza>0?' · giacenza '+m.giacenza:'')+'</div></div>'
      +(tracciato
        ? '<span style="font-size:10px;color:var(--text-dim)">si modifica in Magazzino</span>'
        : '<button class="act-btn act-edit" onclick="Print3DQuoter.editMat(\''+m.id+'\')">✏️</button>'
          +'<button class="act-btn act-del" onclick="Print3DQuoter.delMat(\''+m.id+'\')">🗑️</button>')
      +'</div>';
  }
  function grp(title,color,icon,items,tracciato,vuoto){
    return '<div style="font-size:10px;color:'+color+';font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin:14px 0 8px">'+icon+' '+title+' ('+items.length+')</div>'
      +(items.length?items.map(function(m){return riga(m,tracciato);}).join('')
        :'<div style="color:#475569;font-size:12px;padding:8px">'+vuoto+'</div>');
  }
  var visibili=materialiVisibili();
  var daInv=visibili.filter(function(m){return m.fonte!=='locale';});
  var locali=visibili.filter(function(m){return m.fonte==='locale';});

  root.innerHTML=
     grp('Dal magazzino','#22c55e','📦',daInv,true,
         'Nessun filamento a magazzino. Registrane l\'acquisto in Magazzino per avere il costo reale, spedizione compresa.')
    +grp('Solo in questo preventivatore','#f59e0b','✎',locali,false,
         'Nessuno: tutti i materiali che usi sono tracciati.')
    +(locali.length
      ? '<div style="margin-top:12px;padding:10px 12px;background:var(--bg-card2);border-radius:9px;border-left:3px solid var(--orange);font-size:10px;color:var(--text-muted);line-height:1.6">'
        +'<b style="color:var(--orange)">'+locali.length+' material'+(locali.length===1?'e':'i')+' non a magazzino.</b> '
        +'Il loro prezzo è quello che hai scritto tu: non comprende la spedizione e non cambia quando ricompri. '
        +'Registrando l\'acquisto in Magazzino il costo diventa quello pagato davvero.'
      +'</div>' : '');
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
  setStrategia:setStrategia,
  setFase:setFase, addHw:addHw, upHw:upHw, rmHw:rmHw,
  setPrezzoManuale:setPrezzoManuale, setMargineMinimo:setMargineMinimo,
  setTempo:setTempo, tempoDaDecimale:tempoDaDecimale,
  addPk:addPk, upPk:upPk, rmPk:rmPk,
  setProgetto:setProgetto, setModalita:setModalita,
  addMat2:addMat2, upMat2:upMat2, rmMat2:rmMat2,
  setMacchinaModo:setMacchinaModo,
  setConsuntivo:setConsuntivo,
  /* Letti dal collaudo: il preventivato viene dallo snapshot, e il consuntivo
     sta in un archivio che non lo tocca. */
  _previsto:previstoDi, _consuntivi:consuntivi,
  svuotaPiatti:svuotaPiatti, usaPiatto:usaPiatto, leggiFile:leggiFile,
  _multimat:costoMultiMateriale,
  setOverheadModo:setOverheadModo, setOverheadValore:setOverheadValore,
  setPoliticaMat:setPoliticaMat,
  /* Letta dal collaudo: la distinta è una lettura delle liste che già
     esistono, e il collaudo deve poter verificare che sommi al costo. */
  _bom:bom,
  setEnergia:setEnergia,setSlicer:setSlicer,svuotaSlicer:svuotaSlicer,togglePerche:togglePerche,
  aggiornaRegistro:aggiornaRegistro,
  /* Letto dal collaudo per verificare l'ingresso senza ricostruirlo: un
     collaudo che ricopia la lettura dei campi prova la propria copia. */
  _ingresso:ingresso,
  /* Letto dal collaudo: schermo, PDF e WhatsApp devono dire lo stesso numero. */
  _totali:totali,
  /* Letto da patch 109 per «→ Catalogo», che prima lo cercava e non lo
     trovava: `_state` non è mai stato esportato, e il pulsante salvava a
     costo 0 un prodotto il cui prezzo leggeva per scraping di una dimensione
     di carattere che nel frattempo era cambiata. */
  _state:function(){ return {
    cost:COST, price:PRICE, margine:MARG, modo:MODO,
    lines:LINES.slice(), mats:MATS.slice(),
    progetto:{ nome:PROGETTO.nome, descrizione:PROGETTO.descrizione, tecnologia:T },
    modalita:MODALITA, strategia:STRATEGIA,
    overhead:{ modo:OVERHEAD.modo, valore:OVERHEAD.valore },
    politicaMateriale:POLITICA_MAT,
    materiali:MULTIMAT.slice(), piatti:PIATTI.slice(),
  }; },
};
})();

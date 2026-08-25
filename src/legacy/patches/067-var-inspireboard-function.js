
var InspireBoard = (function(){
  var SK = 'ingly_inspire_board_v1';
  var _imgData = '';
  var _files = [];
  var _search = '';
  var _cat = '';
  var _pri = '';

  var CAT_C = {prodotto:'#7c3aed',design:'#0891b2',marketing:'#be185d',materiale:'#92400e',tecnica:'#064e3b',altro:'#475569'};
  var CAT_I = {prodotto:'📦',design:'🎨',marketing:'📣',materiale:'🪵',tecnica:'⚙️',altro:'✏️'};
  var PRI_I = {alta:'🔴',media:'🟡',bassa:'🟢'};

  function load(){ try{return JSON.parse(localStorage.getItem(SK)||'[]');}catch(e){return[];} }
  function save(d){ try{localStorage.setItem(SK,JSON.stringify(d));}catch(e){} }

  function filtered(){
    var a=load(), q=(_search||'').toLowerCase();
    if(q) a=a.filter(function(i){return((i.title||'')+(i.desc||'')+(i.url||'')+(i.tags||'')).toLowerCase().indexOf(q)>=0;});
    if(_cat) a=a.filter(function(i){return i.cat===_cat;});
    if(_pri) a=a.filter(function(i){return i.pri===_pri;});
    return a;
  }

  function renderStats(all){
    var el=document.getElementById('ib-stats'); if(!el)return;
    var alta=0,done=0,cats={};
    all.forEach(function(i){if(i.pri==='alta')alta++;if(i.done)done++;cats[i.cat||'altro']=(cats[i.cat||'altro']||0)+1;});
    var h='<span style="font-size:11px;color:rgba(255,255,255,.4)">'+all.length+' idee totali</span>';
    if(alta) h+='<span style="padding:3px 10px;background:rgba(239,68,68,.1);color:#ef4444;border-radius:99px;font-size:10px;font-weight:700">🔴 '+alta+' alta priorità</span>';
    if(done) h+='<span style="padding:3px 10px;background:rgba(34,197,94,.1);color:#22c55e;border-radius:99px;font-size:10px;font-weight:700">✅ '+done+' completate</span>';
    Object.keys(cats).forEach(function(cat){
      var col=CAT_C[cat]||'#475569', ico=CAT_I[cat]||'✏️';
      h+='<span style="padding:3px 10px;background:'+col+'15;color:'+col+';border:1px solid '+col+'30;border-radius:99px;font-size:10px;font-weight:700">'+ico+' '+cats[cat]+'</span>';
    });
    el.innerHTML=h;
  }

  function renderGrid(ideas){
    if(!ideas.length){
      return '<div style="padding:20px">'
        +'<div style="text-align:center;padding:32px;background:rgba(255,255,255,.03);border-radius:14px;border:2px dashed rgba(255,255,255,.1);margin-bottom:18px">'
        +'<div style="font-size:52px;margin-bottom:10px;opacity:.2">💡</div>'
        +'<div style="font-size:17px;font-weight:800;color:rgba(255,255,255,.45);margin-bottom:6px">Nessuna idea salvata</div>'
        +'<div style="font-size:12px;color:rgba(255,255,255,.25);margin-bottom:16px">Aggiungi idee da Etsy, Pinterest o qualsiasi URL prodotto</div>'
        +'<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">'
        +'<button onclick="InspireBoard.openAdd()" style="padding:9px 20px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1a1200;border:none;border-radius:10px;cursor:pointer;font-size:12px;font-weight:800">+ Aggiungi idea</button>'
        +'<button onclick="InspireBoard.openAddUrl()" style="padding:9px 16px;background:rgba(16,185,129,.12);color:#10b981;border:1.5px solid rgba(16,185,129,.3);border-radius:10px;cursor:pointer;font-size:12px;font-weight:700">🔗 Incolla URL</button>'
        +'<button onclick="InspireBoard.showTop20()" style="padding:9px 14px;background:rgba(251,191,36,.1);color:#fbbf24;border:1.5px solid rgba(251,191,36,.2);border-radius:10px;cursor:pointer;font-size:12px;font-weight:700">🏆 Top 20 Etsy</button>'
        +'</div></div>'
        +'<div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Ispirazioni rapide — clicca per aggiungere</div>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:7px">'
        +'<button onclick="InspireBoard._quickAdd(\'Portachiavi coppia laser\')" style="padding:7px 12px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:9px;cursor:pointer;font-size:11px;color:rgba(255,255,255,.55);text-align:left">💡 Portachiavi coppia laser</button>'
        +'<button onclick="InspireBoard._quickAdd(\'Tagliere nome personalizzato\')" style="padding:7px 12px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:9px;cursor:pointer;font-size:11px;color:rgba(255,255,255,.55);text-align:left">💡 Tagliere nome personalizzato</button>'
        +'<button onclick="InspireBoard._quickAdd(\'Targa porta famiglia\')" style="padding:7px 12px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:9px;cursor:pointer;font-size:11px;color:rgba(255,255,255,.55);text-align:left">💡 Targa porta famiglia</button>'
        +'<button onclick="InspireBoard._quickAdd(\'Tableau matrimonio legno\')" style="padding:7px 12px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:9px;cursor:pointer;font-size:11px;color:rgba(255,255,255,.55);text-align:left">💡 Tableau matrimonio legno</button>'
        +'<button onclick="InspireBoard._quickAdd(\'Fiocco nascita legno\')" style="padding:7px 12px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:9px;cursor:pointer;font-size:11px;color:rgba(255,255,255,.55);text-align:left">💡 Fiocco nascita legno</button>'
        +'<button onclick="InspireBoard._quickAdd(\'Decorazioni Natale laser\')" style="padding:7px 12px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:9px;cursor:pointer;font-size:11px;color:rgba(255,255,255,.55);text-align:left">💡 Decorazioni Natale laser</button>'
        +'<button onclick="InspireBoard._quickAdd(\'Night light acrilico\')" style="padding:7px 12px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:9px;cursor:pointer;font-size:11px;color:rgba(255,255,255,.55);text-align:left">💡 Night light acrilico</button>'
        +'<button onclick="InspireBoard._quickAdd(\'Puzzle foto personalizzato\')" style="padding:7px 12px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:9px;cursor:pointer;font-size:11px;color:rgba(255,255,255,.55);text-align:left">💡 Puzzle foto personalizzato</button>'
        +'<button onclick="InspireBoard._quickAdd(\'Orecchini legno laser\')" style="padding:7px 12px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:9px;cursor:pointer;font-size:11px;color:rgba(255,255,255,.55);text-align:left">💡 Orecchini legno laser</button>'
        +'<button onclick="InspireBoard._quickAdd(\'Magnete frigo plexiglass\')" style="padding:7px 12px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:9px;cursor:pointer;font-size:11px;color:rgba(255,255,255,.55);text-align:left">💡 Magnete frigo plexiglass</button>'
        +'<button onclick="InspireBoard._quickAdd(\'Regalo maestra laser\')" style="padding:7px 12px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:9px;cursor:pointer;font-size:11px;color:rgba(255,255,255,.55);text-align:left">💡 Regalo maestra laser</button>'
        +'<button onclick="InspireBoard._quickAdd(\'Calendario perpetuo legno\')" style="padding:7px 12px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:9px;cursor:pointer;font-size:11px;color:rgba(255,255,255,.55);text-align:left">💡 Calendario perpetuo legno</button>'
        +'</div></div>';
    }
    var h='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:13px">';
    ideas.forEach(function(idea){
      var cc=CAT_C[idea.cat]||'#475569', ci=CAT_I[idea.cat]||'✏️', pi=PRI_I[idea.pri]||'🟡';
      var isDone=!!idea.done;
      h+='<div onclick="InspireBoard.openEdit(\''+idea.id+'\')" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-top:3px solid '+cc+';border-radius:13px;overflow:hidden;cursor:pointer;transition:.15s;opacity:'+(isDone?.6:1)+'" onmouseover="this.style.background=\'rgba(255,255,255,.09)\';this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.background=\'rgba(255,255,255,.05)\';this.style.transform=\'\'">';
      if(idea.img){
        h+='<div style="height:150px;overflow:hidden;position:relative">'
          +'<img src="'+idea.img+'" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.style.display=\'none\'">'
          +'<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(0,0,0,.8),transparent);padding:7px 10px">'
          +'<span style="background:'+cc+';color:#fff;font-size:9px;font-weight:800;padding:2px 7px;border-radius:99px">'+ci+' '+(idea.cat||'altro')+'</span>'
          +(isDone?'<span style="margin-left:6px;background:rgba(34,197,94,.9);color:#fff;font-size:9px;padding:1px 6px;border-radius:99px">✅</span>':'')
          +'</div>'
          +'</div>';
      }
      h+='<div style="padding:11px 13px">';
      if(!idea.img){
        h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">'
          +'<span style="background:'+cc+'18;color:'+cc+';font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px">'+ci+' '+(idea.cat||'altro')+'</span>'
          +'<div style="display:flex;align-items:center;gap:5px"><span style="font-size:13px">'+pi+'</span>'
          +(isDone?'<span style="background:rgba(34,197,94,.15);color:#22c55e;font-size:9px;padding:1px 6px;border-radius:99px;font-weight:700">✅</span>':'')
          +'</div></div>';
      }
      h+='<div style="font-size:13px;font-weight:800;line-height:1.35;margin-bottom:5px;color:#fff'+(isDone?';text-decoration:line-through;opacity:.6':'')+'">'+(idea.title||'—').slice(0,65)+'</div>';
      if(idea.desc) h+='<div style="font-size:11px;color:rgba(255,255,255,.4);line-height:1.5;margin-bottom:6px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">'+(idea.desc||'').slice(0,110)+'</div>';
      if(idea.url){
        var sh=idea.url.replace(/^https?:\/\/(www\.)?/,'').slice(0,38);
        h+='<a href="'+idea.url+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="display:flex;align-items:center;gap:4px;font-size:10px;color:#60a5fa;margin-bottom:6px;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🔗 <span>'+sh+'</span></a>';
      }
      if(idea.tags){
        h+='<div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:7px">';
        (idea.tags||'').split(',').forEach(function(t){t=t.trim();if(t)h+='<span style="background:rgba(255,255,255,.06);padding:1px 6px;border-radius:99px;font-size:9px;color:rgba(255,255,255,.4)">#'+t+'</span>';});
        h+='</div>';
      }
      if(idea.files&&idea.files.length){
        h+='<div style="display:flex;gap:4px;margin-bottom:7px;flex-wrap:wrap">';
        idea.files.forEach(function(f){h+='<span style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:5px;padding:1px 6px;font-size:9px;color:rgba(255,255,255,.4)">📎 '+f.name.slice(0,14)+'</span>';});
        h+='</div>';
      }
      h+='<div style="display:flex;gap:5px;border-top:1px solid rgba(255,255,255,.06);padding-top:8px;margin-top:4px">';
      h+=(isDone
        ?'<button onclick="event.stopPropagation();InspireBoard.toggleDone(\''+idea.id+'\')" style="flex:1;padding:5px;background:rgba(34,197,94,.1);color:#22c55e;border:1px solid rgba(34,197,94,.25);border-radius:7px;cursor:pointer;font-size:10px;font-weight:600">✅ Fatto</button>'
        :'<button onclick="event.stopPropagation();InspireBoard.toggleDone(\''+idea.id+'\')" style="flex:1;padding:5px;background:rgba(255,255,255,.05);color:rgba(255,255,255,.35);border:1px solid rgba(255,255,255,.08);border-radius:7px;cursor:pointer;font-size:10px">○ Segna fatto</button>');
      h+='<button onclick="event.stopPropagation();InspireBoard.openEdit(\''+idea.id+'\')" style="padding:5px 9px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:7px;cursor:pointer;font-size:11px;color:rgba(255,255,255,.5)">✏️</button>';
      if(idea.url) h+='<a href="'+idea.url+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="padding:5px 9px;background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.2);border-radius:7px;font-size:11px;color:#60a5fa;text-decoration:none" title="Apri URL">🌐</a>';
      h+='</div></div></div>';
    });
    return h+'</div>';
  }

  function render(){
    var all=load(), shown=filtered();
    renderStats(all);
    var c=document.getElementById('ib-content');
    if(c) c.innerHTML=renderGrid(shown);
  }

  function open(){
    var o=document.getElementById('inspire-board-overlay');
    if(!o){console.error('InspireBoard overlay not found');return;}
    o.style.display='flex';
    o.style.opacity='1';
    o.style.visibility='visible';
    document.body.style.overflow='hidden';
    render();
  }

  function close(){
    var o=document.getElementById('inspire-board-overlay');
    if(o) o.style.display='none';
    document.body.style.overflow='';
  }

  function resetForm(){
    _imgData='';_files=[];
    ['ib-f-title','ib-f-url','ib-f-img-url','ib-f-desc','ib-f-tags'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});
    var p=document.getElementById('ib-f-pri');if(p)p.value='media';
    var pr=document.getElementById('ib-img-prev');if(pr)pr.innerHTML='📷';
    var fl=document.getElementById('ib-f-files-list');if(fl)fl.innerHTML='';
    var fi=document.getElementById('ib-f-files');if(fi)fi.value='';
    var ff=document.getElementById('ib-f-img-file');if(ff)ff.value='';
  }

  function showModal(){
    var m=document.getElementById('ib-modal');
    if(m){m.style.display='flex';setTimeout(function(){var t=document.getElementById('ib-f-title');if(t)t.focus();},80);}
  }
  function closeModal(){var m=document.getElementById('ib-modal');if(m)m.style.display='none';}

  function openAdd(){
    resetForm();
    document.getElementById('ib-modal-title').textContent='Nuova Idea';
    document.getElementById('ib-del-btn').style.display='none';
    document.getElementById('ib-f-id').value='';
    showModal();
  }

  function openAddUrl(){
    var url=prompt('Incolla il link (Etsy, Pinterest, Instagram, qualsiasi URL):','');
    if(!url||url.indexOf('http')<0){return;}
    resetForm();
    document.getElementById('ib-f-url').value=url;
    var domain=url.replace(/^https?:\/\/(www\.)?/,'').split('/')[0];
    document.getElementById('ib-f-title').value=domain;
    document.getElementById('ib-modal-title').textContent='Nuova Idea da URL';
    document.getElementById('ib-del-btn').style.display='none';
    document.getElementById('ib-f-id').value='';
    showModal();
  }

  function openEdit(id){
    var all=load(),idea=null;
    for(var i=0;i<all.length;i++){if(all[i].id===id){idea=all[i];break;}}
    if(!idea)return;
    resetForm();
    document.getElementById('ib-modal-title').textContent='Modifica Idea';
    document.getElementById('ib-del-btn').style.display='';
    document.getElementById('ib-f-id').value=idea.id;
    document.getElementById('ib-f-title').value=idea.title||'';
    document.getElementById('ib-f-cat').value=idea.cat||'prodotto';
    document.getElementById('ib-f-pri').value=idea.pri||'media';
    document.getElementById('ib-f-url').value=idea.url||'';
    document.getElementById('ib-f-img-url').value=(idea.img&&!idea.img.startsWith('data:'))?idea.img:'';
    document.getElementById('ib-f-desc').value=idea.desc||'';
    document.getElementById('ib-f-tags').value=idea.tags||'';
    _imgData=idea.img||'';_files=idea.files||[];
    if(_imgData){var pr=document.getElementById('ib-img-prev');if(pr)pr.innerHTML='<img src="'+_imgData+'" style="width:100%;height:100%;object-fit:cover">';}
    renderFileList();showModal();
  }

  function saveIdea(){
    var title=(document.getElementById('ib-f-title').value||'').trim();
    if(!title){alert('Inserisci un titolo per l\'idea');return;}
    var editId=document.getElementById('ib-f-id').value;
    var imgUrl=(document.getElementById('ib-f-img-url').value||'').trim();
    var img=_imgData||imgUrl||'';
    var idea={
      id:editId||('ib_'+Date.now()),
      title:title,
      cat:document.getElementById('ib-f-cat').value||'prodotto',
      pri:document.getElementById('ib-f-pri').value||'media',
      url:(document.getElementById('ib-f-url').value||'').trim(),
      img:img,
      desc:(document.getElementById('ib-f-desc').value||'').trim(),
      tags:(document.getElementById('ib-f-tags').value||'').trim(),
      files:_files,done:false,created:new Date().toISOString()
    };
    var all=load();
    if(editId){
      var found=false;
      for(var i=0;i<all.length;i++){if(all[i].id===editId){idea.done=all[i].done;idea.fav=all[i].fav;all[i]=idea;found=true;break;}}
      if(!found)all.unshift(idea);
    } else {all.unshift(idea);}
    save(all);closeModal();render();
  }

  function deleteIdea(){
    var id=document.getElementById('ib-f-id').value;
    if(!id)return;
    if(!confirm('Eliminare questa idea?'))return;
    save(load().filter(function(i){return i.id!==id;}));
    closeModal();render();
  }

  function toggleDone(id){
    var all=load();
    for(var i=0;i<all.length;i++){if(all[i].id===id){all[i].done=!all[i].done;break;}}
    save(all);render();
  }

  function search(q){_search=q;render();}
  function filter(){
    _cat=(document.getElementById('ib-filter-cat').value||'');
    _pri=(document.getElementById('ib-filter-pri').value||'');
    render();
  }

  function fetchMeta(){
    var url=(document.getElementById('ib-f-url').value||'').trim();if(!url)return;
    var domain=url.replace(/^https?:\/\/(www\.)?/,'').split('/')[0];
    var t=document.getElementById('ib-f-title');if(t&&!t.value)t.value=domain;
  }

  function previewImgUrl(){
    var url=(document.getElementById('ib-f-img-url').value||'').trim();
    var pr=document.getElementById('ib-img-prev');if(!pr)return;
    if(url){pr.innerHTML='<img src="'+url+'" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.innerHTML=\'📷\'">';_imgData=url;}
    else{pr.innerHTML='📷';_imgData='';}
  }

  function handleImgFile(input){
    var file=input.files[0];if(!file)return;
    if(file.size>3*1024*1024){alert('Immagine troppo grande (max 3MB)');return;}
    var r=new FileReader();
    r.onload=function(e){_imgData=e.target.result;var pr=document.getElementById('ib-img-prev');if(pr)pr.innerHTML='<img src="'+_imgData+'" style="width:100%;height:100%;object-fit:cover">';};
    r.readAsDataURL(file);
  }

  function clearImg(){
    _imgData='';
    var pr=document.getElementById('ib-img-prev');if(pr)pr.innerHTML='📷';
    var u=document.getElementById('ib-f-img-url');if(u)u.value='';
    var f=document.getElementById('ib-f-img-file');if(f)f.value='';
  }

  function handleFiles(input){
    Array.from(input.files).forEach(function(f){_files.push({name:f.name,size:f.size,type:f.type});});
    renderFileList();
  }

  function renderFileList(){
    var el=document.getElementById('ib-f-files-list');if(!el)return;
    el.innerHTML=_files.map(function(f,i){
      return '<span style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:3px 8px;font-size:10px;color:rgba(255,255,255,.5);cursor:pointer" onclick="InspireBoard.removeFile('+i+')">📎 '+f.name.slice(0,18)+' ✕</span>';
    }).join('');
  }

  function removeFile(i){_files.splice(i,1);renderFileList();}

  function showTop20(){
    var TOPS=[
      {rank:1,name:'Tagliere personalizzato con nome',margin:'72%',url:'https://www.etsy.com/it/search?q=tagliere+personalizzato+laser'},
      {rank:2,name:'Portachiavi laser coppia',margin:'85%',url:'https://www.etsy.com/it/search?q=portachiavi+personalizzato+laser'},
      {rank:3,name:'Targa porta cognome famiglia',margin:'68%',url:'https://www.etsy.com/it/search?q=targa+porta+laser'},
      {rank:4,name:'Tableau de mariage legno',margin:'74%',url:'https://www.etsy.com/it/search?q=tableau+mariage+legno+laser'},
      {rank:5,name:'Ritratto animale domestico laser',margin:'78%',url:'https://www.etsy.com/it/search?q=ritratto+animale+laser'},
      {rank:6,name:'Pergamena laurea personalizzata',margin:'70%',url:'https://www.etsy.com/it/search?q=pergamena+laurea+laser'},
      {rank:7,name:'Decorazione natale laser',margin:'82%',url:'https://www.etsy.com/it/search?q=decorazione+natale+laser'},
      {rank:8,name:'Segnaposto matrimonio acrilico',margin:'80%',url:'https://www.etsy.com/it/search?q=segnaposto+matrimonio+acrilico'},
      {rank:9,name:'Fiocco nascita legno inciso',margin:'77%',url:'https://www.etsy.com/it/search?q=fiocco+nascita+legno+laser'},
      {rank:10,name:'Medaglietta incisa cane/gatto',margin:'87%',url:'https://www.etsy.com/it/search?q=medaglietta+laser'},
      {rank:11,name:'Night light acrilico personalizzato',margin:'82%',url:'https://www.etsy.com/it/search?q=night+light+acrilico+laser'},
      {rank:12,name:'Puzzle fotografico in legno',margin:'76%',url:'https://www.etsy.com/it/search?q=puzzle+foto+legno+laser'},
      {rank:13,name:'Mappa laser personalizzata',margin:'71%',url:'https://www.etsy.com/it/search?q=mappa+laser+personalizzata'},
      {rank:14,name:'Cornice portafoto laser',margin:'69%',url:'https://www.etsy.com/it/search?q=cornice+laser+personalizzata'},
      {rank:15,name:'Set sottobicchieri acrilico logo',margin:'77%',url:'https://www.etsy.com/it/search?q=sottobicchieri+acrilico+laser'},
      {rank:16,name:'Calendario perpetuo in legno',margin:'75%',url:'https://www.etsy.com/it/search?q=calendario+legno+laser'},
      {rank:17,name:'Porta cellulare inciso in legno',margin:'83%',url:'https://www.etsy.com/it/search?q=porta+cellulare+legno+laser'},
      {rank:18,name:'Organizer scrivania laser',margin:'72%',url:'https://www.etsy.com/it/search?q=organizer+scrivania+legno+laser'},
      {rank:19,name:'Album foto in legno laser',margin:'74%',url:'https://www.etsy.com/it/search?q=album+foto+legno+laser'},
      {rank:20,name:'Set matrimonio acrilico completo',margin:'79%',url:'https://www.etsy.com/it/search?q=set+matrimonio+acrilico+laser'},
    ];
    var ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.onclick=function(e){if(e.target===ov)document.body.removeChild(ov);};
    var h='<div style="background:#1a1a2e;border-radius:16px;width:min(700px,100%);max-height:90vh;overflow-y:auto;border:1px solid rgba(255,255,255,.12)" onclick="event.stopPropagation()">'
      +'<div style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px;position:sticky;top:0;background:#1a1a2e">'
      +'<span style="font-size:22px">🏆</span><span style="font-size:15px;font-weight:900;color:#fff;flex:1">Top 20 Prodotti Laser Bestseller Etsy Italia 2026</span>'
      +'<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="background:none;border:none;cursor:pointer;color:rgba(255,255,255,.4);font-size:20px">✕</button>'
      +'</div><div style="padding:12px 16px;display:flex;flex-direction:column;gap:6px">';
    TOPS.forEach(function(p){
      h+='<div style="display:flex;align-items:center;gap:10px;padding:8px 11px;background:rgba(255,255,255,.04);border-radius:9px;border:1px solid rgba(255,255,255,.06)">'
        +'<div style="width:26px;height:26px;border-radius:7px;background:'+(p.rank<=3?'linear-gradient(135deg,#fbbf24,#f59e0b)':'rgba(255,255,255,.08)')+';display:flex;align-items:center;justify-content:center;font-size:'+(p.rank<=3?'13':'11')+'px;font-weight:900;color:'+(p.rank<=3?'#000':'rgba(255,255,255,.5)')+';flex-shrink:0">'+(p.rank<=3?['🥇','🥈','🥉'][p.rank-1]:p.rank)+'</div>'
        +'<div style="flex:1;font-size:12px;font-weight:700;color:#fff">'+p.name+'</div>'
        +'<span style="font-size:11px;font-weight:800;color:#22c55e;flex-shrink:0">'+p.margin+'</span>'
        +'<a href="'+p.url+'" target="_blank" rel="noopener" style="padding:4px 10px;background:rgba(251,191,36,.1);color:#fbbf24;border:1px solid rgba(251,191,36,.25);border-radius:7px;font-size:10px;font-weight:800;text-decoration:none;flex-shrink:0">Etsy 🔗</a>'
        +'<button onclick="InspireBoard._addTop(\''+p.name.replace(/'/g,"'")+'\')" style="padding:4px 10px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1a1200;border:none;border-radius:7px;cursor:pointer;font-size:10px;font-weight:800;flex-shrink:0">+ Idea</button>'
        +'</div>';
    });
    h+='</div></div>';
    ov.innerHTML=h;
    document.body.appendChild(ov);
  }

  function _addTop(name){
    var all=load();
    all.unshift({id:'ib_'+Date.now(),title:name,cat:'prodotto',pri:'alta',url:'https://www.etsy.com/it/search?q='+encodeURIComponent(name),img:'',desc:'Top bestseller Etsy Italia 2026',tags:'laser,etsy,bestseller',files:[],done:false,created:new Date().toISOString()});
    save(all);render();
  }

  document.addEventListener('keydown',function(e){
    if(e.key!=='Escape')return;
    var m=document.getElementById('ib-modal');
    if(m&&m.style.display!=='none'){closeModal();return;}
    close();
  });

  function _quickAdd(title){
    var all=load();
    var url='https://www.etsy.com/it/search?q='+encodeURIComponent(title.replace(/ /g,'+'));
    all.unshift({id:'ib_'+Date.now(),title:title,cat:'prodotto',pri:'alta',url:url,img:'',
      desc:'Idea laser. Cerca su Etsy per prezzi e ispirazione.',tags:'laser,etsy',files:[],done:false,
      created:new Date().toISOString()});
    save(all);render();
    if(typeof toast!=='undefined') toast('💡 Idea aggiunta: '+title,'success');
  }

  return {
    open:open,close:close,openAdd:openAdd,openAddUrl:openAddUrl,openEdit:openEdit,
    closeModal:closeModal,saveIdea:saveIdea,deleteIdea:deleteIdea,toggleDone:toggleDone,
    search:search,filter:filter,fetchMeta:fetchMeta,previewImgUrl:previewImgUrl,
    handleImgFile:handleImgFile,clearImg:clearImg,handleFiles:handleFiles,removeFile:removeFile,
    showTop20:showTop20,_addTop:_addTop,render:render,_quickAdd:_quickAdd
  };
})();


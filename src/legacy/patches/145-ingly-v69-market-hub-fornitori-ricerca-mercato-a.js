
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v69 — MARKET HUB: Fornitori + Ricerca Mercato AI (hunting/pricing/trend)
   • Directory fornitori REALE (IT/EU + Palermo) per: gadget laserabili,
     sublimazione, stampa UV/DTF, risorse file/progetti, marketplace B2B.
   • Import nello store 'suppliers' (uno o tutti) per popolare la sezione.
   • Ricerca Mercato: genera prompt AI pronti (trend, prezzi di mercato, idee
     prodotto, strategia marketing) + workflow di hunting con link di ricerca
     pre-compilati (Etsy/Amazon/AliExpress/Google Trends/Pinterest).
   Offline, CSP-safe, costruito sul Design System (DS). Additivo.
   NB: i fornitori sono punti di partenza verificati via ricerca web — prezzi,
   recensioni e disponibilità vanno confermati (azione "Verifica prezzi").
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(window.MarketHub && window.MarketHub.__v69) return;

  function toast(m,k){ try{ if(window.DS&&DS.toast) return DS.toast(m,k); }catch(e){} }
  function openUrl(u){ try{ window.open(u,'_blank','noopener'); }catch(e){} }
  function copy(txt){ try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(txt); toast('Copiato negli appunti','ok'); return; } }catch(e){}
    try{ var ta=document.createElement('textarea'); ta.value=txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('Copiato','ok'); }catch(e){ toast('Copia manuale','info'); } }

  // ── DIRECTORY FORNITORI (dati reali, verificati via ricerca web luglio 2026) ──
  var DIR={
    laser:{ label:'Gadget & grezzi laserabili (legno/metallo/plexi)', icon:'⚡', items:[
      {name:'Europages — Incisione laser Italia', url:'https://www.europages.it/aziende/italia/incisione%20laser.html', region:'IT/EU', type:'Marketplace B2B', note:'Directory di produttori/conto-terzi: confronta più fornitori.'},
      {name:'Premium Business — Gadget in legno', url:'https://www.premiumbusiness.it/prodotti/category_53/articoli-e-gadget-in-legno.php', region:'IT', type:'Grezzi/gadget', note:'Articoli e gadget in legno personalizzabili.'},
      {name:'Gadget48', url:'https://www.gadget48.com/', region:'IT', type:'Gadget promozionali', note:'Ampio catalogo gadget aziendali.'},
      {name:'EC Laser Studio Store', url:'https://eclaserstudiostore.com/en/collections/gadget', region:'IT', type:'Gadget + vettoriali', note:'Gadget incisi + disegni vettoriali per laser.'},
      {name:'PakaLine (gruppo Paccalini)', url:'https://www.europages.it/aziende/italia/incisione%20laser.html', region:'IT', type:'Conto terzi', note:'Incisione/taglio/marcatura laser conto terzi.'}
    ]},
    subli:{ label:'Sublimazione (tazze, tessili, blanks)', icon:'☕', items:[
      {name:'Maxilia — Tazze sublimazione', url:'https://www.maxilia.it/tazze-personalizzate/tazze-per-sublimazione/', region:'IT/EU', type:'Blanks', note:'Da 6 pz, prezzi contenuti.'},
      {name:'Suvenix — Ingrosso tazze', url:'https://suvenix.com/it/i-nostri-prodotti/ingrosso-tazze-sublimazione.html', region:'EU', type:'Ingrosso', note:'Produttore EU, prezzi vantaggiosi su volumi.'},
      {name:'BlueBag Italia', url:'https://www.bluebagitalia.com/', region:'IT', type:'Ingrosso gadget', note:'Gadget a stock, tazze da ~€0,80.'},
      {name:'2Stamp — Tazze ingrosso', url:'https://www.2stamp.it/it/per-stampa-sublimatica/', region:'IT', type:'Ingrosso', note:'Coating AA, tra i più economici a volume.'},
      {name:'HiGift — Tazze sublimazione', url:'https://www.higift.it/cibo-e-bevande/tazze-tazzine-e-bicchieri/tazze-per-sublimazione-personalizzate', region:'IT', type:'Blanks', note:'Catalogo ampio, spedizione rapida.'},
      {name:'Gift Campaign', url:'https://www.giftcampaign.it/tazze-personalizzate-promozionali/tazze-sublimazione-foto.html', region:'EU', type:'Blanks', note:'Prezzi bassi su grandi quantità.'}
    ]},
    uv:{ label:'Stampa UV / DTF (consumabili, inchiostri, film)', icon:'🌈', items:[
      {name:'Burger Print — Consumabili DTF', url:'https://www.burger-print.it/dtf/consumabili-dtf', region:'IT', type:'Consumabili', note:'Importatore diretto: inchiostri, colla, film PET.'},
      {name:'DTF Service Stampa — DTF/UV', url:'https://dtfservicestampa.com/it/consumabili-dtf-uv/', region:'IT', type:'Consumabili', note:'Film DTF-UV, rotoli B-Film.'},
      {name:'Sublimazione.it — DTF UV', url:'https://www.sublimazione.it/it/categorie/924-dtf-uv.html', region:'IT', type:'Consumabili + macchine', note:'DTF-UV su pellicola, inchiostro bianco.'},
      {name:'Europages — Inchiostri UV', url:'https://www.europages.it/aziende/inchiostri%20uv.html', region:'EU', type:'Marketplace B2B', note:'Fornitori europei di inchiostri UV/digitali.'},
      {name:'Ocinkjet / DTF-Ink', url:'https://it.dtf-ink.com/uv-and-dtf-printer/', region:'EU/CN', type:'Inchiostri + stampanti', note:'Inchiostri e stampanti UV/DTF.'}
    ]},
    files:{ label:'Risorse file & progetti (SVG/DXF/LBRN)', icon:'🗂️', items:[
      {name:'Cuttalo — 1000+ progetti free', url:'https://www.cuttalo.com/en/laser-cut/free-laser-cutting-projects/', region:'Web', type:'File gratis', note:'DXF/SVG/AI, aggiornamenti settimanali.'},
      {name:'Design Bundles — Laser files', url:'https://designbundles.net/free-design-resources/free-laser-cutting-files', region:'Web', type:'Free + premium', note:'Compatibili Glowforge, uso commerciale.'},
      {name:'Vectors File', url:'https://vectorsfile.com/', region:'Web', type:'Free + premium', note:'Migliaia di file taglio/incisione.'},
      {name:'Vecteezy', url:'https://www.vecteezy.com/', region:'Web', type:'Vettoriali', note:'Grafica vettoriale, molti free.'},
      {name:'OptLasers — Free SVG', url:'https://optlasers.com/free-svg-files-for-cnc-laser', region:'Web', type:'File gratis', note:'SVG per CNC/laser.'},
      {name:'OMTech — Guida siti file', url:'https://it.omtech.com/blogs/nozioni-di-base-sul-laser/file-di-incisione-laser-gratuiti-i-migliori-siti-per-scaricare-nel-2023', region:'Web', type:'Guida', note:'Elenco curato di siti di file.'}
    ]},
    palermo:{ label:'Palermo / Sicilia (laboratori & servizi locali)', icon:'📍', items:[
      {name:'Zincografia La Rosa', url:'https://www.larosaincisioni.it/', region:'Palermo', type:'Servizio/conto terzi', note:'Dal 2005: marcatura laser metalli, taglio organico.'},
      {name:'Pinto Ricami — Incisione laser', url:'https://www.pintoricami.net/incisione-laser', region:'Palermo', type:'Servizio', note:'Incisione su metallo, legno, plexi.'},
      {name:'Arte Visiva Palermo', url:'https://www.artevisivapalermo.it/i-servizi/targhe-2/', region:'Palermo', type:'Servizio', note:'Targhe e incisioni, Via Oreto 48.'},
      {name:'Europages — Taglio laser Sicilia', url:'https://www.europages.it/aziende/italia/palermo%20e%20sicilia/tagli-al-laser-cnc.html', region:'Sicilia', type:'Marketplace B2B', note:'Fornitori CNC/laser in zona.'}
    ]}
  };

  // ── Prompt di ricerca AI (pronti da incollare in AI Command Center / ChatGPT) ──
  function promptTrend(niche){ return [
    'Sei un analista di mercato per una micro-impresa artigiana di personalizzazione (laser, UV, DTF, sublimazione, CNC) in Sicilia.',
    'Nicchia: '+(niche||'gadget personalizzati incisi'),
    'Elenca 10 TREND di prodotto in forte crescita ORA per questa nicchia (2025-2026), con:',
    '1) descrizione prodotto, 2) target/occasione, 3) perché sta crescendo, 4) fascia prezzo di vendita al pubblico in €,',
    '5) difficoltà di produzione (1-5), 6) idea di angolo unico per differenziarsi in Sicilia/Italia.',
    'Ordina dal più profittevole al meno. Sii concreto e verificabile.'
  ].join('\n'); }
  function promptPricing(prod){ return [
    'Fai una ricerca di mercato del PREZZO per questo prodotto personalizzato: "'+(prod||'prodotto')+'".',
    'Dammi: prezzo minimo, medio e massimo osservato su Etsy, Amazon Handmade e negozi artigiani italiani;',
    'il prezzo consigliato per un artigiano siciliano con buona qualità; la marginalità attesa se il costo materiali è basso;',
    'e 3 leve per giustificare un prezzo più alto (packaging, personalizzazione, tempi). Valori in €, sintetico e in tabella.'
  ].join('\n'); }
  function promptIdeas(base){ return [
    'Genera 12 IDEE di prodotto personalizzato vendibili, partendo da: "'+(base||'legno inciso a laser')+'".',
    'Per ognuna: nome accattivante, occasione/target, tecnica (laser/UV/DTF/sublimazione), materiali, prezzo di vendita €,',
    'e una frase marketing pronta. Privilegia idee stagionali e regali personalizzati ad alto margine.'
  ].join('\n'); }
  function promptMarketing(prod){ return [
    'Crea una STRATEGIA marketing per lanciare/vendere: "'+(prod||'prodotto')+'" come artigiano siciliano.',
    'Includi: 1) posizionamento e USP, 2) 3 canali prioritari (con motivo), 3) 5 idee di contenuto Instagram/TikTok,',
    '4) offerta di lancio, 5) script breve per WhatsApp/DM, 6) 3 keyword SEO/hashtag locali. Concreto e azionabile.'
  ].join('\n'); }

  // Link di hunting (ricerca mercato) pre-compilati
  function huntLinks(q){ var e=encodeURIComponent(q||'gadget personalizzato'); return [
    {label:'Etsy', url:'https://www.etsy.com/search?q='+e},
    {label:'Amazon Handmade', url:'https://www.amazon.it/s?k='+e},
    {label:'AliExpress (costi)', url:'https://it.aliexpress.com/wholesale?SearchText='+e},
    {label:'Google Trends', url:'https://trends.google.it/trends/explore?q='+e+'&geo=IT'},
    {label:'Pinterest (ispirazione)', url:'https://www.pinterest.it/search/pins/?q='+e},
    {label:'Google Shopping', url:'https://www.google.com/search?tbm=shop&q='+e}
  ]; }

  var MarketHub={
    __v69:true,

    async importSupplier(it, cat){
      var rec={ id:'mh_'+Date.now()+'_'+Math.floor(Math.random()*999),
        name:it.name, contact:it.url, material:(DIR[cat]?DIR[cat].label:''),
        url:it.url, category:cat, region:it.region, type:it.type, note:it.note,
        _source:'MarketHub', createdAt:new Date().toISOString() };
      await IDB.put('suppliers', rec).catch(function(){});
      try{ if(window.Bus&&Bus.emit) Bus.emit('suppliers:changed'); }catch(e){}
      toast('Fornitore importato: '+it.name,'ok');
    },
    async importCategory(cat){ var d=DIR[cat]; if(!d) return; var n=0;
      for(var i=0;i<d.items.length;i++){ await this.importSupplier(d.items[i], cat); n++; }
      toast(n+' fornitori importati in "'+d.label+'"','ok');
    },

    open(tab){
      var self=this; var box=document.createElement('div');
      // tabs
      var tabs=document.createElement('div'); tabs.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;border-bottom:1px solid var(--border,#333);padding-bottom:10px;';
      var body=document.createElement('div');
      var TABS=[['dir','🏭 Fornitori'],['research','🔎 Ricerca Mercato'],['hunt','🎯 Hunting']];
      function setTab(id){ body.textContent=''; Array.prototype.forEach.call(tabs.children,function(b){ b.classList.toggle('ds-btn--primary', b.dataset.t===id); });
        if(id==='dir') renderDir(); else if(id==='research') renderResearch(); else renderHunt(); }
      TABS.forEach(function(t){ var b=DS.button(t[1],{size:'sm',variant:'ghost'}); b.dataset.t=t[0]; b.onclick=function(){ setTab(t[0]); }; tabs.appendChild(b); });
      box.appendChild(tabs); box.appendChild(body);

      function renderDir(){
        var intro=document.createElement('p'); intro.className='ds-hint'; intro.style.marginBottom='12px';
        intro.textContent='Punti di partenza verificati (IT/EU + Palermo). Prezzi e recensioni vanno confermati sul sito: usa "Ricerca Mercato" per i prezzi correnti.';
        body.appendChild(intro);
        Object.keys(DIR).forEach(function(cat){ var d=DIR[cat];
          var sec=document.createElement('div'); sec.style.cssText='margin-bottom:18px;';
          var h=document.createElement('div'); h.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;';
          var ht=document.createElement('div'); ht.style.cssText='font:700 14px inherit;'; ht.textContent=d.icon+' '+d.label; h.appendChild(ht);
          h.appendChild(DS.button('Importa tutti',{size:'sm',variant:'ghost',onclick:function(){ self.importCategory(cat); }}));
          sec.appendChild(h);
          var cols=[
            {key:'name',label:'Fornitore',render:function(r){ var a=document.createElement('a'); a.textContent=r.name; a.href=r.url; a.target='_blank'; a.rel='noopener'; a.style.color='var(--primary,#fbbf24)'; a.style.textDecoration='none'; return a; }},
            {key:'region',label:'Area'},
            {key:'type',label:'Tipo'},
            {key:'act',label:'',render:function(r){ var g=document.createElement('div'); g.style.cssText='display:flex;gap:6px;';
              g.appendChild(DS.button('Apri',{size:'sm',variant:'ghost',onclick:function(){ openUrl(r.url); }}));
              g.appendChild(DS.button('+ Importa',{size:'sm',variant:'primary',onclick:function(){ self.importSupplier(r,cat); }}));
              return g; }}
          ];
          sec.appendChild(DS.table(cols, d.items));
          body.appendChild(sec);
        });
      }

      function promptCard(title, text){
        var c=document.createElement('div'); c.style.cssText='border:1px solid var(--border,#333);border-radius:12px;padding:12px;margin-bottom:12px;background:var(--bg-card,#161616);';
        var h=document.createElement('div'); h.style.cssText='font:700 13px inherit;margin-bottom:8px;'; h.textContent=title; c.appendChild(h);
        var pre=document.createElement('div'); pre.style.cssText='font:400 12px/1.5 inherit;color:var(--text-muted,#9ca3af);white-space:pre-wrap;background:var(--bg-card2,#111);border:1px solid var(--border2,#242424);border-radius:8px;padding:10px;margin-bottom:8px;max-height:150px;overflow:auto;';
        pre.textContent=text; c.appendChild(pre);
        var row=document.createElement('div'); row.style.cssText='display:flex;gap:8px;';
        row.appendChild(DS.button('Copia prompt',{size:'sm',variant:'primary',icon:'⧉',onclick:function(){ copy(text); }}));
        row.appendChild(DS.button('Apri AI',{size:'sm',variant:'ghost',onclick:function(){ try{ if(window.App&&App.navigate) App.navigate('ai'); }catch(e){} }}));
        c.appendChild(row); return c;
      }
      function renderResearch(){
        var f=DS.field({label:'Prodotto / nicchia da analizzare',placeholder:'es. portachiavi in legno inciso, tazza foto, targhe UV'});
        f._input.value='portachiavi in legno inciso'; body.appendChild(f);
        var out=document.createElement('div');
        function build(){ var q=f._input.value.trim()||'gadget personalizzato'; out.textContent='';
          out.appendChild(promptCard('📈 Trend di mercato', promptTrend(q)));
          out.appendChild(promptCard('💶 Prezzi di mercato (valori catalogo)', promptPricing(q)));
          out.appendChild(promptCard('💡 Idee prodotto / ispirazione', promptIdeas(q)));
          out.appendChild(promptCard('📣 Strategia marketing', promptMarketing(q)));
        }
        var gen=DS.button('Genera prompt',{variant:'primary',onclick:build}); gen.style.margin='0 0 14px'; body.appendChild(gen);
        body.appendChild(out); build();
      }

      function renderHunt(){
        var intro=document.createElement('p'); intro.className='ds-hint'; intro.style.marginBottom='12px';
        intro.textContent='Workflow di hunting/scraping manuale: definisci la nicchia, apri i mercati con la query pre-compilata, raccogli prezzi e margini, decidi.';
        body.appendChild(intro);
        var f=DS.field({label:'Parola chiave prodotto',placeholder:'es. regalo personalizzato battesimo'});
        f._input.value='regalo personalizzato'; body.appendChild(f);
        var steps=document.createElement('div'); steps.style.cssText='margin:8px 0 16px;';
        [['1. Definisci','nicchia + occasione + target (chi compra e perché)'],
         ['2. Osserva i mercati','apri i link sotto e annota 8-10 prezzi reali'],
         ['3. Costo & margine','stima costo materiali + tempo → margine con il Preventivatore'],
         ['4. Decidi','tieni i prodotti con margine ≥ target e domanda alta']
        ].forEach(function(s){ var r=document.createElement('div'); r.style.cssText='display:flex;gap:8px;font-size:13px;margin-bottom:6px;';
          var b=document.createElement('strong'); b.textContent=s[0]; b.style.color='var(--primary,#fbbf24)'; b.style.minWidth='130px';
          var t=document.createElement('span'); t.textContent=s[1]; r.appendChild(b); r.appendChild(t); steps.appendChild(r); });
        body.appendChild(steps);
        var linksWrap=document.createElement('div'); linksWrap.style.cssText='display:flex;flex-wrap:wrap;gap:8px;';
        function rebuild(){ linksWrap.textContent=''; huntLinks(f._input.value.trim()).forEach(function(l){
          linksWrap.appendChild(DS.button(l.label,{size:'sm',variant:'ghost',icon:'↗',onclick:function(){ openUrl(l.url); }})); }); }
        f._input.oninput=rebuild; rebuild();
        var lh=document.createElement('div'); lh.style.cssText='font:700 13px inherit;margin:6px 0 8px;'; lh.textContent='Apri i mercati (query pre-compilata)'; body.appendChild(lh);
        body.appendChild(linksWrap);
      }

      DS.modal({title:'🛰️ Market Hub — Fornitori & Ricerca', body:box});
      setTab(tab||'dir');
    }
  };
  window.MarketHub = MarketHub;

  // Pulsanti nelle sezioni Fornitori e Materiali
  function injectBtns(){
    [['view-suppliers','dir'],['view-materials','research']].forEach(function(pair){
      var view=document.getElementById(pair[0]); if(!view) return;
      if(view.querySelector('.mh-open-btn')) return;
      var host=view.querySelector('.module-actions')||view.querySelector('.module-header')||view;
      var b=document.createElement('button'); b.className='btn btn-secondary btn-sm ds-btn mh-open-btn';
      b.innerHTML='🛰️ Market Hub'; b.style.margin='8px 6px'; b.onclick=function(){ MarketHub.open(pair[1]); };
      host.appendChild(b);
    });
  }
  if(typeof Bus!=='undefined'&&Bus.on){ Bus.on('nav:suppliers',function(){ setTimeout(injectBtns,300); }); Bus.on('nav:materials',function(){ setTimeout(injectBtns,300); }); }
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(injectBtns,2600); });
})();
